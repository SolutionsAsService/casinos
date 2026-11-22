# Researcher task (casinos ledger)

You are an RDADA researcher for a public-history project about American casinos. First read /home/user/solutionsasservice/rdada/skills/rdada/references/researcher.md and candidate-format.md and follow them (schema: /home/user/solutionsasservice/rdada/schemas/candidate.schema.json).

Your brief id is given in your prompt: load it from /home/user/casinos/research/briefs.json (the records are the venues). You do not touch git or the repo's data. You write only these files in /home/user/casinos/research/2026-11-22-ledger/notes/, overwriting any earlier ones (an earlier attempt ran while the network was blocked and wrote empty results; ignore them): `<brief>.md`, `<brief>.candidates.json`, `<brief>.lineage.json`.

Network: the proxy now allows en.wikipedia.org, archive.org, onlinenevada.org, special.library.unlv.edu, nj.gov, njccc.gov, vault.fbi.gov, courtlistener.com, law.justia.com, govinfo.gov, chroniclingamerica.loc.gov, loc.gov, encyclopediaofarkansas.net, tshaonline.org, themobmuseum.org, kunr.org, lasvegassun.com, reviewjournal.com, pbs.org. Use WebSearch to find pages, WebFetch to read them (Wikipedia: https://en.wikipedia.org/w/index.php?title=TITLE&action=raw works with curl or WebFetch). Other hosts may be refused: then try another source; do not give up on a venue after one refusal.

Rules:
- No candidate without a public page you actually opened. A search snippet is not a source. Recalled citations are not candidates.
- Each candidate has a verbatim quote of at most 25 words from the page, the URL, accessed date 2026-11-22, stance relative to the ask, reliability 'unassessed', review.status 'unreviewed'.
- Both directions: supporting AND sceptical or contradicting sources for the organised-crime label. If sources show a record is wrong, say so under `corrections`.
- Prefer primary and official sources (court opinions, gaming control boards and commissions, congressional hearings, FBI Vault, state archives, university special collections), then quality histories, then Wikipedia only as stance 'context'.
- Never accuse a living person, or any tribe or tribal government.
- Put the venue id(s) in the candidate's `records` array. `ask_addressed` starts with one of 'dates', 'lineage', 'mob-tie'.

lineage.json format: {"brief":"<id>","venues":[{"id":"<venue id>","opened":<year|null>,"closed":<year|null>,"opened_source":<index into candidates|null>,"closed_source":<index|null>,"names":[{"name":"","from":<year>,"to":<year|null>,"operator":"company or person (historical only)","note":"short fact: rename, sale, merger, hurricane, demolition","sources":[<indices>]}],"label":{"level":"documented|alleged|none|unsupported","basis":"one sentence citing what the sources say","sources":[<indices>]},"corrections":"what in the current record is wrong, else empty"}],"gaps":[""]}. Label rules: 'documented' only if a page you opened shows a court record, conviction, gaming board or commission finding, congressional finding or official record; 'alleged' if only credible reporting or histories say so; 'none' if you searched in both directions and found nothing credible; 'unsupported' if you could not open sources for it. Every number in `sources` must index your candidates file. The `names` list is the ownership and renaming thread of the property: every name it has had with dates and operators.

Budget: about 2 to 4 good sources per venue and about 45 tool calls in total; cover ALL venues in your brief, and list unfinished venues in gaps. Hand back a short summary: candidates written, venues covered, corrections found, gaps.
