#!/usr/bin/env python3
"""Merge verified RDADA research into data/ledger.json. Only verified candidates become citable sources."""
import json, pathlib, sys, datetime
ROOT = pathlib.Path(__file__).resolve().parent.parent
RUN = ROOT / "research" / "2026-11-22-ledger"
NOTES = RUN / "notes"
STRONG = {"primary", "official"}

def load(p, default):
    try:
        return json.loads(p.read_text())
    except (OSError, ValueError):
        return default

def key(c):
    return (c.get("url", ""), (c.get("quote") or "")[:60])

def main():
    base = json.loads((ROOT / "data" / "casinos.json").read_text())
    ids = {c["id"] for c in base["casinos"]}
    sources, sid = [], {}
    venues, report = {}, {"downgraded": [], "dropped_cites": 0, "unverified_briefs": []}
    for lp in sorted(NOTES.glob("*.lineage.json")):
        brief = lp.name[:-len(".lineage.json")]
        cands = load(NOTES / f"{brief}.candidates.json", [])
        ver = load(NOTES / f"{brief}.verified.json", None)
        if ver is None:
            report["unverified_briefs"].append(brief)
            continue
        vkeys = {key(c) for c in ver}
        lin = load(lp, {"venues": []})
        chk = load(NOTES / f"{brief}.lineage.check.json", [])
        bad = {(x["venue"], x["field"]) for x in chk if isinstance(x, dict) and x.get("ok") is False}
        def ref(i):
            if not isinstance(i, int) or i < 0 or i >= len(cands):
                return None
            c = cands[i]
            if key(c) not in vkeys:
                report["dropped_cites"] += 1
                return None
            k = (brief, i)
            if k not in sid:
                n = f"s{len(sources) + 1:04d}"
                sid[k] = n
                sources.append({"id": n, "brief": brief, "title": c.get("title", ""), "authors": c.get("authors", ""), "year": c.get("year"),
                                "venue": c.get("venue", ""), "url": c.get("url", ""), "accessed": c.get("accessed", ""), "kind": c.get("kind", ""),
                                "stance": c.get("stance", ""), "quote": c.get("quote", ""), "summary": c.get("summary", ""), "limits": c.get("limits", ""),
                                "claim": (c.get("ask_addressed") or "").split(":")[0].split(" ")[0], "records": c.get("records", []),
                                "verified": "re-fetched by a second agent, quote found", "review": "unreviewed", "reliability": "unassessed"})
            return sid[k]
        def refs(lst):
            return [r for r in (ref(i) for i in (lst or [])) if r]
        for v in lin.get("venues", []):
            vid = v.get("id")
            if vid not in ids:
                continue
            names = []
            for j, n in enumerate(v.get("names") or []):
                if (vid, f"names[{j}]") in bad:
                    continue
                s = refs(n.get("sources"))
                if s:
                    names.append({"name": n.get("name"), "from": n.get("from"), "to": n.get("to"), "operator": n.get("operator", ""), "note": n.get("note", ""), "sources": s})
            lab = v.get("label") or {}
            ls = refs(lab.get("sources"))
            lvl = lab.get("level", "unsupported")
            strong = any(sources[int(x[1:]) - 1]["kind"] in STRONG for x in ls)
            if (vid, "label") in bad and lvl == "documented":
                lvl = "alleged"; report["downgraded"].append((vid, "check failed"))
            if lvl == "documented" and not strong:
                lvl = "alleged"; report["downgraded"].append((vid, "no primary/official verified source"))
            if lvl in ("documented", "alleged", "none") and not ls:
                report["downgraded"].append((vid, f"{lvl} -> unsupported (no verified source)")); lvl = "unsupported"
            out = {"names": names, "label": {"level": lvl, "basis": lab.get("basis", ""), "sources": ls}, "corrections": v.get("corrections", "")}
            o_ok = ref(v.get("opened_source")) if (vid, "opened") not in bad else None
            c_ok = ref(v.get("closed_source")) if (vid, "closed") not in bad else None
            if o_ok and v.get("opened") is not None:
                out["opened"] = v["opened"]; out["opened_source"] = o_ok
            if c_ok:
                out["closed"] = v.get("closed"); out["closed_source"] = c_ok
            venues[vid] = out
    ledger = {"run": "2026-11-22 ledger", "generated": datetime.date.today().isoformat(), "sources": sources, "venues": venues}
    (ROOT / "data" / "ledger.json").write_text(json.dumps(ledger, indent=1))
    print("sources", len(sources), "venues", len(venues), "downgraded", len(report["downgraded"]), "dropped cites", report["dropped_cites"], "unverified briefs", report["unverified_briefs"])
    for d in report["downgraded"]:
        print(" ", d)

main()
