# Claims — machine-verified citations

Each `*.json` file holds single-sided claims (id, claim, source{file,line,verbatim})
byte-verified against the vendored Williams tree by `tools/audit/check-citations.mjs`.
The checker verifies SOURCE and VERBATIM only — it never reads claim prose (see the
checker header; jt1-10 is the canonical instance of a green citation with wrong prose).

## Why some source lines carry TWO claims

About 20 anchors hold one claim from a transcription story (jt1-2/3/4/5 — the CONSTANT
the line proves) and a second from jt1-8 (the QUALIFICATION of a formerly bare `:N`
dossier citation). This is by design, not duplication: the AC-2 sweep requires a claim
per citation PART, and the two claims assert different things about the same line.
(jt1-8 review, LOW finding — recorded here so the explanation lives beside the
duplicates rather than only in an archived session.)
