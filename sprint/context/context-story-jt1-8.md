# Story jt1-8: Qualify the dossier's 128 bare-:N citations

## Acceptance Criteria

1. **Every bare :N citation in brief.md, subsystems.md, and pictures.md is rewritten as FILE:LINE, each verified against the vendored tree (spot-ambiguous cases documented in the story notes).**

2. **The bare-citation canary count reaches 0 and the test is flipped to assert exactly 0 going forward.**

3. **The AC-2 coverage sweep is widened from qualified-only to ALL citations, and stays green.**

4. **A negative canary counts citation-shaped strings the sweep parser cannot enumerate; it reaches and asserts 0 (the +/slash range forms are parsed or rewritten).**

5. **Canary scope note: the negative canary counts unparsed citation-shaped strings in the THREE SWEPT FILES only (brief.md, subsystems.md, pictures.md) — open-questions.md is outside AC-2 scope per the jt1-2 R2 ruling.**

## Context: jt1-2 TEA Finding (blocking to AC-2, non-blocking to RED)

From the archived session at `sprint/archive/jt1-2-session.md` (Delivery Findings, TEA section):

**Gap:** "AC-2 as written is not satisfiable by any automated sweep." Only 114 of ~242 dossier citations are fully qualified (`FILE:LINE`). Another 128 are written as a bare `:N` that inherits its file from surrounding prose. That inheritance is genuinely ambiguous, not merely unparsed:

- subsystems.md's header says bare lines mean `JOUSTRV4.SRC` "unless another file is named", yet `:175` sits inside both `RAMDEF.SRC` (430 lines) and `JOUSTRV4.SRC` (8139 lines).
- `:5934` cannot be the nearest-named `SYSTEM.SRC` (1037 lines) and must be `JOUSTRV4.SRC`.

Neither "nearest named file" nor "always JOUSTRV4.SRC" is correct. **More than half the dossier's citations are therefore outside the machine gate.** The suite covers the 114 qualified ones and pins the bare-`:N` count at ≤128 as a one-sided canary (shrinking is fine, growing fails).

**jt1-2 closed with AC-2 scoped to qualified citations; this story qualifies the 128 by hand.**

## Context: jt1-2 R2 Ruling (from SM Ruling section)

"jt1-8 filed (3pt, p2) to qualify the 128 by hand against the vendored tree, drive the canary to 0, and widen the sweep to all citations. **jt1-8 does NOT gate jt1-3/4/5** — new transcription claims are new fully-qualified claims/*.json entries, fully validated by the checker regardless of legacy prose citations."

**Negative canary scope (per AC-5):** count unparsed citation-shaped strings in the THREE SWEPT FILES ONLY (brief.md, subsystems.md, pictures.md). open-questions.md is outside AC-2 scope per this ruling. Reviewer's Findings section (row Gaps, index 6) notes three real unparsed forms:
- `` `JOUSTRV4.SRC:2407+` `` (open-ended `N+` form)
- `` `TB12REV3.SRC:1160+` `` (open-ended `N+` form)
- `` `JOUSTI.SRC:54/55` `` (slash pair form)

The first is in-scope (pictures.md:158); the latter two are in open-questions.md and outside scope.

## Context: jt1-2 Dev Finding (method recommendation)

From the archived session (Dev Findings, second item):

"**Improvement** (non-blocking): the story says MAME citations get 'schema-only claims', but does not say how the checker RECOGNISES one. I pinned it to the **file extension** (`.cpp` ⇒ external, never resolved, never byte-opened) rather than an explicit per-claim flag... **jt1-8 must qualify 128 bare `:N` citations and will face the same conversion, and a later dossier edit will need a re-run.** Affects jt1-8 — it should decide whether to commit a maintained extractor (with its own tests) rather than re-improvise one. **Method recorded in the Dev Assessment below so it is reproducible either way.**"

**The reproducible method** (from Dev Assessment section, "How the claims were generated"):

1. Extract every backtick citation `` `FILE:LINESPEC` `` from the three dossier files with TEA's own regex, expanding comma lists and `N-M` ranges; anchor each part at its **start** line; dedupe by `FILE:LINE`.
2. `claim` = the dossier **sentence** (or table cell) containing the citation, prefixed by its section heading, markdown stripped, truncated at a clause boundary.
3. `verbatim` = the vendored line **read from disk** — never hand-typed.
4. Emit one JSON file per dossier file; ids follow the pattern + zero-padded ordinal.

**This story must decide:** commit a maintained extractor (with tests) for this conversion, or re-improvise it? The jt1-2 Dev finding is neutral; the extractor will be needed for any future dossier edits.

## Context: Machine Gate

Each qualification is a **human judgment** against the vendored tree (reference/williams-source/joust, pin 9bcfdb1), NOT a mechanical rewrite. An extractor that guessed would bind claims to the **wrong file** and look green — worse than a visible gap (the jt1-2 TEA finding proves the ambiguity is real by counterexample).

## Context: Citation Canaries

**One-sided bare-`:N` canary** (AC-2): The test `citations.test.ts` currently asserts the bare-citation count is `≤128` (shrinking passes, growing fails). This story drives it to exactly 0 and flips the test to assert 0 going forward.

**Negative canary for unparsed forms** (AC-4): The extractor regex in `citations.test.ts:588` is ``/`([\w./]+\.(?:SRC|DOC|PIC|FRM|cpp)):([\d,\-]+)`/g`` — the linespec charset `[\d,\-]+` must be followed immediately by a backtick, so `N+` and `N/M` forms fail to match and are silently dropped. The Reviewer's finding shows three in-scope citations are invisible to the sweep:
- `` `JOUSTRV4.SRC:2407+` `` (pictures.md:158)
- `` `JOUSTI.SRC:54/55` `` (pictures.md:?) — JOUSTI.SRC:54 is covered incidentally, :55 is not

The negative canary counts citation-shaped strings the extractor cannot parse and asserts 0. Unlike the ruled bare-`:N` gap (which TEA made **visible** with a one-sided canary), this class is undetectable otherwise: the sweep reports full closure over citations it never enumerated, and a future dossier edit introducing another linespec form would shrink the gate silently.

## Files in Scope

- `joust/docs/rom-study/brief.md`
- `joust/docs/rom-study/subsystems.md`
- `joust/docs/rom-study/pictures.md`

## Vendored Source

Reference tree: `arcade/reference/williams-source/joust` (pin 9bcfdb1) — gitignored locally, so checker degrades to schema-only when absent.
