#!/usr/bin/env python3
"""Builds the casinos site with OpenRouter models only. The API key is injected by the network proxy."""
import json, re, sys, time, subprocess, urllib.request, urllib.error, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
GEN = "nvidia/nemotron-3-ultra-550b-a55b:free"
VER = "google/gemma-4-31b-it:free"
API = "https://openrouter.ai/api/v1/chat/completions"

def call(model, system, user, max_tokens=12000, tries=7):
    body = json.dumps({"model": model, "max_tokens": max_tokens, "temperature": 0.3,
                       "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}).encode()
    for i in range(tries):
        try:
            req = urllib.request.Request(API, data=body, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=300) as r:
                d = json.load(r)
            c = d["choices"][0]["message"].get("content") or ""
            if c.strip():
                return c
        except (OSError, KeyError, ValueError, TypeError) as e:
            print("retry", model, i, str(e)[:100], file=sys.stderr)
        time.sleep(15 * (i + 1))
    return ""

def free_models():
    try:
        with urllib.request.urlopen("https://openrouter.ai/api/v1/models", timeout=60) as r:
            ms = json.load(r)["data"]
        return [m["id"] for m in ms if m["id"].endswith(":free")]
    except Exception as e:
        print("models list failed", e, file=sys.stderr)
        return []

def extract_json(text):
    m = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if m:
        text = m.group(1)
    a = min([i for i in (text.find("["), text.find("{")) if i >= 0], default=-1)
    if a < 0:
        return None
    for end in range(len(text), a, -1):
        if text[end - 1] in "]}":
            try:
                return json.loads(text[a:end])
            except ValueError:
                continue
    return None

REGIONS = [
 "Las Vegas, Nevada (Strip, Fremont Street, Paradise): resorts from 1941 to today",
 "Reno, Lake Tahoe, Elko, Henderson, Laughlin and other Nevada gambling",
 "Atlantic City, New Jersey, and earlier New Jersey gambling (Bergen County clubs)",
 "Chicago and Illinois (Outfit era gambling dens, riverboats, Cicero, Joliet, Aurora)",
 "New Orleans, Louisiana and the Gulf Coast: Jefferson Parish, Biloxi and Mississippi casinos",
 "Hot Springs, Arkansas; Newport and Covington, Kentucky; Steubenville Ohio; Saratoga Springs, New York",
 "Florida (Miami Beach, Broward, Tampa) and Texas (Galveston) historic gambling",
 "Detroit and Michigan; Minnesota and the upper Midwest; Native American tribal casinos (Foxwoods, Mohegan Sun, others)",
]

SYS_DATA = ("You are a careful historian of American gambling. Output ONLY a JSON array, no prose. Include only places you are sure existed. "
 "Never invent. Prefer well-documented history: court cases, Kefauver Committee 1950-51, Nevada Gaming Control Board, FBI. "
 "Never accuse living people. Mob ties must be labelled 'documented' (court record, convictions or congressional findings), 'alleged' (credible reporting only), or 'none'.")

def data_prompt(region):
    return (f"List 8 to 12 notable casinos or gambling venues for: {region}.\n"
 'Each item: {"id":"slug","name":"","city":"","state":"two-letter","lat":0.0,"lon":0.0,"opened":1946,"closed":null,"kind":"casino|resort|illegal club|riverboat|tribal casino",'
 '"hotspot":"short region name","mob":{"level":"documented|alleged|none","groups":["e.g. Chicago Outfit"],"summary":"one sentence of fact","years":"e.g. 1946-1947"},'
 '"events":[{"year":1946,"text":"one short factual sentence"}],"blurb":"one sentence"}\n'
 "closed is null if still open (use the year it closed or was demolished otherwise). lat and lon must be accurate to the town. JSON array only.")

SYS_VER = "You are a strict fact checker of American casino history. Output ONLY a JSON array."
def ver_prompt(items):
    brief = [{"id": i["id"], "name": i["name"], "city": i["city"], "state": i["state"], "opened": i["opened"], "closed": i["closed"],
              "mob": i["mob"]} for i in items]
    return ("For each item say whether the facts are right. verdict: 'ok' (name, place, opening year within 2 years, and mob claim all correct), "
            "'weak_mob' (venue is real but the mob claim is wrong or unsupported), or 'wrong' (venue or dates invented). Return "
            '[{"id":"","verdict":"ok|weak_mob|wrong","note":""}].\n' + json.dumps(brief))

def valid(i):
    try:
        return (isinstance(i["id"], str) and 24 <= float(i["lat"]) <= 50 and -125 <= float(i["lon"]) <= -66 and 1850 <= int(i["opened"]) <= 2026
                and (i["closed"] is None or int(i["opened"]) <= int(i["closed"]) <= 2030)
                and i["mob"]["level"] in ("documented", "alleged", "none") and isinstance(i.get("events", []), list))
    except (KeyError, TypeError, ValueError):
        return False

def build_data(verifier):
    out, seen = [], set()
    for r in REGIONS:
        items = None
        for _ in range(3):
            items = extract_json(call(GEN, SYS_DATA, data_prompt(r)))
            if isinstance(items, list) and items:
                break
        print("region", r[:40], "->", len(items or []), file=sys.stderr)
        items = [i for i in (items or []) if isinstance(i, dict) and valid(i)]
        if verifier and items:
            res = extract_json(call(verifier, SYS_VER, ver_prompt(items))) or []
            vd = {x.get("id"): x for x in res if isinstance(x, dict)}
            keep = []
            for i in items:
                v = vd.get(i["id"], {}).get("verdict", "unchecked")
                if v == "wrong":
                    continue
                i["verified"] = v if v in ("ok", "weak_mob") else "unchecked"
                if v == "weak_mob":
                    i["mob"] = {"level": "none", "groups": [], "summary": "No mob link established in the sources checked.", "years": ""}
                keep.append(i)
            items = keep
        for i in items:
            key = re.sub(r"\W", "", i["name"].lower()) + i["state"]
            if key not in seen:
                seen.add(key)
                out.append(i)
    return out

SYS_SITE = ("You are an expert front-end designer. Output ONLY one complete HTML file in a single ```html block. No explanations.")
def site_prompt(sample, feedback, prev=""):
    spec = ("Build a single-page site 'American Casinos: map and timeline' for the brand 'Solutions as Service'. It loads data from 'data/casinos.json' "
 "(an object {casinos:[...], timeline:[{year,text}]}) with fetch. Item fields: id,name,city,state,lat,lon,opened,closed(null=open),kind,hotspot,"
 "mob{level,groups,summary,years},events[{year,text}],blurb,verified(ok|weak_mob|unchecked).\n"
 "NO external map libraries or tile servers (they are blocked). Use ONLY these local files, loaded with plain script tags in this order: "
 "vendor/d3-array.min.js, vendor/d3-geo.min.js, vendor/topojson-client.min.js (globals d3 and topojson), and fetch('vendor/states-10m.json') which is us-atlas TopoJSON "
 "(objects.states and objects.nation, projected-free lon/lat). Draw an SVG map: projection = d3.geoAlbersUsa().fitSize([W,H], topojson.feature(us,us.objects.nation)); "
 "path = d3.geoPath(projection); states as paths with thin cream borders on a near-black fill; place each venue with projection([lon,lat]) (it returns null for points outside the projection: skip those). "
 "Resize the SVG with a viewBox so it is responsive. "
 "Requirements: a big year slider (input type=range, 1900 to 2025, default 1960) with play/pause; circles shown only for venues open in the selected year (opened<=year and (closed null or closed>year)); "
 "circle colour by mob level (documented=red, alleged=amber, none=teal), radius by recency; clicking or tapping a circle opens a side panel (below the map on phones) with name, city, years, blurb, mob summary, events and the 'verified' status as a small label (say 'not independently checked' for unchecked). "
 "Hotspot rings: group venues by the hotspot field, draw a translucent large circle at the group's mean position sized by how many are open that year, with a text label. A filter bar toggling documented/alleged/none and kind. "
 "A timeline strip under the map listing timeline events with the current year highlighted, clicking jumps the slider. A counter 'N venues open in YEAR'. "
 "A visible disclaimer: AI-drafted from public history, check sources, mob links are labelled documented or alleged and are not claims about living people. "
 "Design: noir poster look in the style of Saul Bass, near-black background, cream text, one vermilion accent, bold condensed headline font (Oswald from Google Fonts link is allowed), responsive to phone width (390px), no horizontal page scroll, all CSS and JS inline in the one file. "
 "Must work with zero console errors and also when no venue is open in a year. Sample data item: " + json.dumps(sample))
    if feedback and prev:
        return spec + "\n\nHere is your previous attempt:\n```html\n" + prev + "\n```\nKeep everything that works. Fix ONLY these problems and return the complete corrected file:\n" + feedback + "\nHint: with geoAlbersUsa, geoPath can return null for territories: skip a state whose path is null or filter to features whose path(d) is not null; never set attribute d to null."
    return spec + ("\nFix these problems from the last attempt:\n" + feedback if feedback else "")

def check_site(path):
    js = ROOT / "tools" / "check_site.js"
    r = subprocess.run(["node", str(js), str(path)], capture_output=True, text=True, timeout=240)
    return r.returncode == 0, (r.stdout + r.stderr)[-1500:]

def build_site(data):
    sample = data["casinos"][0] if data["casinos"] else {}
    feedback, prev = "", ""
    for attempt in range(8):
        html = call(GEN, SYS_SITE, site_prompt(sample, feedback, prev), max_tokens=16000)
        m = re.search(r"```html\s*(.*?)```", html, re.S)
        html = (m.group(1) if m else html).strip()
        if "<html" not in html.lower():
            feedback = "Output was not a complete HTML file."
            continue
        (ROOT / "index.html").write_text(html)
        prev = html
        ok, msg = check_site(ROOT / "index.html")
        print("site attempt", attempt, "ok" if ok else "FAIL", msg[:300].replace("\n", " "), file=sys.stderr)
        if ok:
            return True
        feedback = msg
    return False

def timeline(verifier):
    prompt = ("List 18 key dated events in the history of American casinos and organized-crime involvement, 1931 to 2020 (Nevada legalises gambling 1931, "
              "Kefauver hearings, Nevada Gaming Control Board, Indian Gaming Regulatory Act 1988, Atlantic City 1978 and so on). Only well-documented facts. "
              'JSON array of {"year":1931,"text":"one factual sentence"}, sorted by year.')
    ev = extract_json(call(GEN, SYS_DATA, prompt)) or []
    ev = [e for e in ev if isinstance(e, dict) and isinstance(e.get("year"), int) and isinstance(e.get("text"), str)]
    if verifier and ev:
        res = extract_json(call(verifier, SYS_VER.replace("casino", "casino and crime"), "For each event, is it factually correct? Return "
              '[{"index":0,"verdict":"ok|wrong"}].\n' + json.dumps([{"index": k, "year": e["year"], "text": e["text"]} for k, e in enumerate(ev)]))) or []
        bad = {x.get("index") for x in res if isinstance(x, dict) and x.get("verdict") == "wrong"}
        ev = [e for k, e in enumerate(ev) if k not in bad]
    return sorted(ev, key=lambda e: e["year"])

def verify_existing(dpath):
    d = json.loads(dpath.read_text())
    cands = [m for m in ("google/gemma-4-31b-it:free", "inclusionai/ling-3.2-flash:free", "nvidia/nemotron-3.5-super-vl:free", "google/gemma-4-26b-a4b-it:free") if m in free_models()]
    items = d["casinos"]; out = []
    for b in range(0, len(items), 8):
        batch = items[b:b + 8]; res = None
        for m in cands:
            res = extract_json(call(m, SYS_VER, ver_prompt(batch), max_tokens=6000, tries=3))
            if isinstance(res, list) and res:
                print("verified batch", b, "with", m, file=sys.stderr); break
        vd = {x.get("id"): x for x in (res or []) if isinstance(x, dict)}
        for i in batch:
            v = vd.get(i["id"], {}).get("verdict", "unchecked")
            if v == "wrong":
                continue
            i["verified"] = v if v in ("ok", "weak_mob") else "unchecked"
            if v == "weak_mob":
                i["mob"] = {"level": "none", "groups": [], "summary": "No mob link established in the sources checked.", "years": ""}
            out.append(i)
    d["casinos"] = out
    dpath.write_text(json.dumps(d, indent=1))
    print("verified", sum(1 for i in out if i["verified"] == "ok"), "of", len(out), file=sys.stderr)

if __name__ == "__main__":
    step = sys.argv[1] if len(sys.argv) > 1 else "all"
    models = free_models()
    pref = [m for m in models if m != GEN and any(t in m for t in ("llama", "deepseek", "qwen", "gemma", "mistral", "gpt-oss"))]
    verifier = VER if VER in models else (pref[0] if pref else None)
    print("generator", GEN, "verifier", verifier, file=sys.stderr)
    dpath = ROOT / "data" / "casinos.json"
    if step in ("data", "all"):
        casinos = build_data(verifier)
        dpath.write_text(json.dumps({"generated_by": [GEN, verifier], "casinos": casinos, "timeline": timeline(verifier)}, indent=1))
        print("casinos", len(casinos), file=sys.stderr)
    if step == "verify":
        verify_existing(dpath)
    if step in ("site", "all"):
        data = json.loads(dpath.read_text())
        print("site ok" if build_site(data) else "site FAILED", file=sys.stderr)
