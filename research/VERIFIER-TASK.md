# Verifier task (casinos ledger)

You are an RDADA verifier, a different agent from the researcher. First read /home/user/solutionsasservice/rdada/skills/rdada/references/verifier.md and follow it (schema: /home/user/solutionsasservice/rdada/schemas/candidate.schema.json).

Your brief id is given in your prompt. Input: /home/user/casinos/research/2026-11-22-ledger/notes/<brief>.candidates.json. For EVERY candidate: re-fetch its URL yourself (WebFetch; for Wikipedia use https://en.wikipedia.org/w/index.php?title=TITLE&action=raw with curl if WebFetch fails; archive.org full text via curl), confirm the page really exists and says what the quote says (the quote must appear verbatim, allowing only whitespace and punctuation normalisation) and that the stance and summary are fair to the page. Do not repair candidates: a failure is dropped and listed with the reason. If a page cannot be re-fetched after two honest tries (refusal, rate limit), mark it `unverifiable` (keep in neither list; record the reason).

Write in /home/user/casinos/research/2026-11-22-ledger/notes/:
- `<brief>.verified.json`: array of the candidates that passed, each unchanged except `"verified": {"by": "rdada-verifier", "date": "2026-11-22", "method": "re-fetched, quote found"}`.
- `<brief>.rejected.json`: array of {candidate, reason} for failures.
- `<brief>.unverifiable.json`: array of {candidate, reason}.
- `<brief>.lineage.check.json`: for the sibling `<brief>.lineage.json`: for each venue, say whether each `names[]` entry, `opened`, `closed` and the `label` are supported by the passing candidates the entry cites (indices refer to the candidates array as in the candidates file): [{"venue":"id","field":"names[0]|opened|closed|label","ok":true|false,"note":""}]. Also flag any label that claims 'documented' without a passing primary or official source: it must be 'alleged' at most.

Never accuse a living person. Do not edit the researcher's files or any git state. Hand back a short summary: passed / rejected / unverifiable counts and any labels you downgraded.
