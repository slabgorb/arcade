---
story_id: "jt10-8"
jira_key: "jt10-8"
epic: "jt10"
workflow: "tdd"
---
# Story jt10-8: Extend the font source double-entry gate to ALL ~102 glyphs (font35+font57), not just the 10 jt10-1 pinned

## Story Details
- **ID:** jt10-8
- **Title:** Extend the font source double-entry gate to ALL ~102 glyphs (font35+font57), not just the 10 jt10-1 pinned
- **Jira Key:** jt10-8
- **Points:** 2
- **Type:** chore
- **Workflow:** tdd
- **Stack Parent:** jt10-1 (depends_on)
- **Repos:** arcade
- **Branch:** feat/jt10-8-extend-font-source-gate-all-glyphs
- **PR:** 81

## Acceptance Criteria

**AC-1:** The FONT35 double-entry gate re-derives EVERY glyph in FONT35's ORDER (all **49** code slots, **47** distinct glyphs after aliasing — measured, corrects setup's "52") from MESSAGE.SRC and asserts module == source, not just the 6 currently pinned — with the O→S0 / S→S5 aliasing handled correctly (aliased chars share a srcLine/glyph, T is distinct).

**AC-2:** The FONT57 double-entry gate re-derives EVERY glyph in FONT57's ORDER (all **53** code slots, 53 distinct — measured, corrects setup's "54") from MESSAGE.SRC.

**AC-3:** The extended gate is NON-VACUOUS: mutating any single glyph's module data (or any hand-literal) makes the gate RED.

**AC-4 (RULED IN-SCOPE by user, 2026-08-07 — now committed):** "The gate" means BOTH gates. The citation-claims coverage in `docs/rom-study/claims/font.json` is extended to every distinct glyph header line so `check-citations.mjs` re-opens MESSAGE.SRC at each. This is the story's genuine RED (the double-entry bitmap gate is already green on arrival — faithful port). GREEN adds one committed verbatim claim per uncited line: FONT35 41/47 + FONT57 49/53 = **90 new claims**.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-07T21:53:39Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-07T20:28:50Z | 2026-08-07T20:32:35Z | 3m 45s |
| red | 2026-08-07T20:32:35Z | 2026-08-07T21:42:54Z | 1h 10m |
| green | 2026-08-07T21:42:54Z | 2026-08-07T21:46:25Z | 3m 31s |
| review | 2026-08-07T21:46:25Z | 2026-08-07T21:53:39Z | 7m 14s |
| finish | 2026-08-07T21:53:39Z | - | - |

## Delivery Findings

### Background — Measured Ground Truth (verified current tree)
The gate this story extends lives in TWO test files:
- `plugins/joust/tests/font35.test.ts` — `describe.skipIf(!vendoredAvailable)('FONT35 — re-derives byte-for-byte from MESSAGE.SRC (THE GATE, AC-1)')`, a `for (const {ch, srcLine, bitmap} of PINS)` loop.
- `plugins/joust/tests/font57.test.ts` — the parallel `describe.skipIf(!vendoredAvailable)('FONT57 — ... (THE GATE, AC-2)')`, same PINS-loop shape.

Each gate iteration does the double-entry: `decodeGlyphFromSource(srcLine)` re-reads MESSAGE.SRC, asserts it equals the hand-literal `bitmap`, then asserts the module glyph (`loadFont35/57().glyphFor(ch)`) equals the source reading.

**Current PIN COUNT:** FONT35 PINS = 6 glyphs (0,1,4,5,space,A); FONT57 PINS = 5 glyphs. So ~11 of ~102 glyphs are gated today — this is the "10 jt10-1 pinned" the title refers to.

**Full INVENTORY (the target):** FONT35 `ORDER` = 52 code slots; FONT57 `ORDER` = 54 code slots. After FDB aliasing = ~102 distinct glyphs.

**Vendored source:** `reference/williams-source/joust/MESSAGE.SRC` IS present in this checkout, so the `skipIf(!vendoredAvailable)` gate actually RUNS here (it is not skipped). The extended gate must decode every glyph from that file.

**FONT35 FDB Reuse Quirk:** Pointer 'O' re-points to S0 (glyph "0 & O"), 'S' re-points to S5 (glyph "5 & S"), but 'T' is its own distinct ST glyph. So multiple `ch` values can share one `srcLine`/glyph — the extended gate must NOT assume ch↔glyph is 1:1.

**Origin:** jt10-1's OWN review finding (Heimdall) filed THIS story: "source double-entry + citation gates guard only 10/102 glyphs — filed as jt10-8". Note it names TWO gates — the double-entry re-derivation gate above, AND the citation gate (`tools/audit/check-citations.mjs` re-opening MESSAGE.SRC against committed claims in `docs/rom-study/claims/font.json`). The story title says "double-entry gate"; whether the citation gate is also in-scope is a judgment for TEA to confirm against the finding — AC-4 flags this as an open scope note.

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (2026-08-07) — AC-4 ruled in-scope; the RED lives in the CITATION gate, not the bitmap gate
The setup ACs assumed the double-entry (bitmap) gate extension would be the deliverable. Measurement
refuted that as the *failing* part: the jt10-1 port is faithful (Heimdall re-decoded all ~102, 0
drift) and every module glyph carries a correct `srcLine`, so an all-glyph module-vs-source loop is
**green on arrival** — I ran it. The genuine, still-open gap is the CITATION gate: exactly the 10
pinned glyph header lines carry a committed claim; the other 90 do not (`claimCovers` is a point
match on `source.line`). Per jt10-1's finding naming both gates, the user **ruled both in-scope**.
So the committed RED is the citation-coverage test; the all-glyph double-entry loop ships as a
standing green guard whose teeth are proven by an explicit single-glyph mutation. Forward impact:
GREEN (Julia) adds 90 `verbatim` claims to `docs/rom-study/claims/font.json`, one per uncited line —
this is the substantive work, and each must byte-match MESSAGE.SRC or `check-citations.mjs` reddens.

## SM Assessment

**Story premise: SOUND and corroborated.** jt10-8 was filed by Heimdall's own review of
jt10-1 ("source double-entry + citation gates guard only 10/102 glyphs — filed as jt10-8"),
so it is not a stale backlog guess — it closes a named Medium finding. I measured the premise
against the current tree before setup:
- Gate lives in `plugins/joust/tests/font35.test.ts` + `font57.test.ts` (the `PINS`-loop under
  `describe.skipIf(!vendoredAvailable)('… THE GATE …')`).
- Currently pinned: FONT35 = 6 glyphs, FONT57 = 5 → ≈11 (the title's "10").
- Full inventory: FONT35 `ORDER` = 52, FONT57 `ORDER` = 54 (≈102 distinct after aliasing).
- Vendored `reference/williams-source/joust/MESSAGE.SRC` IS present, so the gate RUNS here (not skipped).

**ACs derived, not copied** — the epic YAML has `description: null` and `acceptance_criteria: null`,
so there was no verbatim text to preserve. The three committed ACs + one open scope note were
derived from the title and the measured facts above and cross-checked into both the session and the
enriched context.

**Context repair:** `pf context create` wrote a null-YAML STUB (the documented pf-context-clobber
trap). I enriched `sprint/context/context-story-jt10-8.md` by hand to mirror the session Background,
so TEA's primary input carries the real ground truth.

**Two things TEA must settle in RED:**
1. AC-4 scope — jt10-1's finding names TWO gates (double-entry AND the citation gate:
   `docs/rom-study/claims/font.json` + `tools/audit/check-citations.mjs`). The title says only
   "double-entry gate." Rule in-scope or out-scope; if out-scope, file the residue.
2. The FONT35 FDB aliasing (`O`→S0, `S`→S5, `T` distinct) — an all-`ORDER` loop must not assume
   `ch`↔glyph is 1:1.

**No sibling contention:** no `jt10-8` branch existed at setup; only live sibling session is `mc9-1`
(a-3). Claim pushed as `feat/jt10-8-extend-font-source-gate-all-glyphs` (commit `bafe7603`).

Handing off to Tyr One-Handed (TEA) for RED.
## TEA Assessment (RED — Tyr One-Handed)

**RED state:** 2 failing tests, both intended — the citation-gate tests in the new
`plugins/joust/tests/font-source-all-glyphs.test.ts`. Full joust suite: 3156 passed, 2 failed
(160 files). Lint (`tsc --noEmit`) clean. Commit `645bba1c`.

**What each AC's test does, and its arrival colour:**
- **AC-1 / AC-2 (double-entry, all glyphs) — GREEN on arrival.** For every char in each font's
  `order`, the module bitmap is compared to an INDEPENDENT re-reading of MESSAGE.SRC
  (`decodeGlyphFromSource`). Faithful port ⇒ no mismatch. A completeness floor
  (`order.length >= 49/53`) plus a distinct-glyph count (`47`/`53`) stops the coverage being gutted
  or the loop passing vacuously.
- **AC-3 (non-vacuity) — GREEN, and load-bearing.** Two mutation blocks clone each font, corrupt
  one PREVIOUSLY-UNPINNED glyph (`'Z'`, pixel-inverted so it must differ), and assert the same gate
  flags exactly `['Z']`. Plus `claimCovers(…, 999999, 999999) === false` proves the citation check
  discriminates. Without these, the green double-entry sweep would prove nothing.
- **AC-4 (citation, all glyphs) — RED (the driver).** Every distinct glyph header line must carry a
  committed claim. FONT35 41/47 and FONT57 49/53 uncited (90 total). GREEN closes it.

**Rule Coverage (project rules beyond ACs):**
- *Core/shell purity* — N/A; this is a test-only + claims-data story, touches no `src/core`.
- *Vendored-read-inside-it() (tp1-8 trap)* — every `decodeGlyphFromSource` call is inside an `it()`
  body; source blocks are `skipIf(!vendoredAvailable)`. The citation blocks read only committed JSON
  so they run without the vendored tree (that's why the RED is CI-visible, not skip-hidden).
- *One shared claims loader (jt9-2)* — imports `loadClaims`/`claimCovers` from `tests/helpers/claims.js`;
  no copied loader.
- *Derived README counts (jt5-7 / audio-seam-scope)* — adding a test file reddened the derived
  file-count census; bumped README 159→160 in the same RED commit (the census is now green).
- *No vacuous assertions* — every test asserts a concrete value; the two green gates are proven
  non-vacuous by the mutation blocks above rather than trusted.

**For Dev (Julia), GREEN:**
1. Add 90 claims to `plugins/joust/docs/rom-study/claims/font.json` — one per uncited distinct glyph
   header line (the RED failure lists them with char + `MESSAGE.SRC:line`). Each needs a `verbatim`
   that byte-matches the `FCB XSIZE,YSIZE` header at that line (tabs included), or
   `check-citations.mjs` reddens. Model them on the 8 existing `JT101-00x` font claims.
2. Aliases fold: `'O'`/`'S'` (font35) reuse S0/S5's already-cited lines — do NOT add duplicate
   claims for 839/874; the test dedups by line.
3. Do NOT touch `src/core/font35.ts` / `font57.ts` glyph DATA — if the double-entry gate ever reds,
   that is a real drift to escalate, not data to "fix" green.

Handing to Julia (Dev) for GREEN.
## Dev Assessment (GREEN — Julia Silvertongue)

**Minimal change, RED closed.** The only failing tests were the two citation-gate tests. I made
them green by adding the missing citations — nothing more.

**What changed:**
- `plugins/joust/docs/rom-study/claims/font.json`: 8 → 98 claims. Added 90 (`JT101-009`..`JT101-098`),
  one per previously-uncited distinct glyph header line — FONT35 41, FONT57 49. Each `verbatim` was
  transcribed programmatically straight from `reference/williams-source/joust/MESSAGE.SRC` (exact line
  text, `trimEnd`) so it byte-matches under `check-citations.mjs` (which compares `actual.trimEnd()
  !== verbatim.trimEnd()`, full line). Generator: scratchpad only, not committed.
- `plugins/joust/README.md`: two derived `check-citations` counts 988 → 1078 (the audio-seam-scope
  dossier-count guard). (The test-file count 159 → 160 was already bumped in TEA's RED commit.)

**Deliberately NOT changed:**
- No font DATA (`src/core/font35.ts` / `font57.ts`) — the double-entry bitmap gate was green on
  arrival; there was no drift to fix. Touching data would have been scope creep / a fidelity risk.
- Aliases `O`→S0 (839) and `S`→S5 (874) reuse already-cited lines — no duplicate claims added; the
  gate dedups by line.
- The README's `skipIf(!vendoredAvailable)` occurrence counts (block at lines ~116-123) are
  explicitly INDICATIVE and unguarded ("nothing guards them", "re-measure before quoting"); my new
  test file adds one occurrence but I left them, per the README's own stated stance. Flagged here so
  the Reviewer sees it was a choice, not an oversight.

**Verification (evidence):**
- `npx vitest run --project joust` → 160 files, 3158 passed, 0 failed.
- `npm run lint` (`tsc --noEmit`) → clean.
- `node plugins/joust/tools/audit/check-citations.mjs` → "checked 1078 claim(s) / all claims verified", exit 0.

Commits: RED `645bba1c` (TEA), GREEN `6e982fda`. Handing to Heimdall (Reviewer).
## Reviewer Assessment (Heimdall) — Round 1: APPROVED

**Verdict: APPROVED. No Critical / High / Medium / Low / Nit findings.** A clean, well-scoped
test + citations-data chore. Specialists are disabled on this project (8/9 `false`), so I drove a
mutation battery rather than trusting a self-re-read.

## Subagent Results
| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Disabled | n/a | none | covered by Reviewer mutation battery |
| 3 | reviewer-silent-failure-hunter | Disabled | n/a | none | covered by Reviewer mutation battery |
| 4 | reviewer-test-analyzer | Disabled | n/a | none | covered by Reviewer mutation battery |
| 5 | reviewer-comment-analyzer | Disabled | n/a | none | Reviewer hand-checked prose (jt8-6 rule) |
| 6 | reviewer-type-design | Disabled | n/a | none | data/test only, no type surface |
| 7 | reviewer-security | Disabled | n/a | none | no security surface |
| 8 | reviewer-simplifier | Disabled | n/a | none | covered by Reviewer mutation battery |
| 9 | reviewer-rule-checker | Disabled | n/a | none | covered by Reviewer mutation battery |

**All received: Yes**

### What I verified (adversarial)
- **Claims cite real headers, not data rows.** All 90 new claims (`JT101-009..098`) sit on genuine
  `FCB XSIZE,YSIZE` glyph-header lines; none landed on a data row that merely byte-matches. Aliases
  handled: 839/874 (`O`→S0, `S`→S5) were NOT re-duplicated (already cited); odd glyphs S000/SARRW
  correct. IDs unique across all 1078 claims. Prose font/label/line-ref consistent on all 90.
- **Both guard axes exist and run in CI.** Coverage (a claim EXISTS per glyph line) — jt10-8's new
  test. Verbatim byte-correctness — `citations.test.ts:821` runs `checkClaims(loadClaims(),
  {vendoredRoot})` over every real claim; the vendored tree is committed to the monorepo, so this
  bites in CI, not just locally.
- **Mutation battery (each reverted; sites confirmed by `git diff`):**
  - Delete a claim → coverage test reddens (`'2'@365` uncited). Bites.
  - Corrupt real S2 module data (only S2 changed) → all-glyph double-entry gate reddens (`'2'@853`)
    AND the mutation test flags it. The green-on-arrival gate has real teeth on a real edit.
  - Corrupt a verbatim → coverage stays GREEN, byte-check reddens (`JT101-009 … does not match
    verbatim`). The two axes are independent and both guarded.
- **Scope is right.** No font DATA changed (`src/core/font35.ts`/`font57.ts` untouched) — correct,
  the port was already faithful. Derived README counts bumped (160 files, 1078 claims); orchestrator
  suite green confirms no cabinet-census regression. AC-4 (both gates) ruling properly recorded.

**Reviewer note (unguarded prose, per jt8-6):** `comment_analyzer` is disabled, so I hand-checked the
prose surfaces myself — the test-file header counts and all 90 claim `claim` strings — and found them
accurate. Nothing to file.