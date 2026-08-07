# Story jt10-8 Context

## Title
Extend the font source double-entry gate to ALL ~102 glyphs (font35+font57), not just the 10 jt10-1 pinned

## Metadata
- **Story ID:** jt10-8
- **Type:** chore
- **Points:** 2
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Depends on:** jt10-1 (done)
- **Epic:** Joust cabinet lifecycle — attract/title, 1P·2P select, game over, high-score, and Joust's two fonts

## Problem
The sprint YAML carries no `description`/`acceptance_criteria` for this story — the ACs
below were DERIVED from the title plus ground truth measured against the current tree at
setup. This story closes a Medium finding raised by Heimdall (Reviewer) when jt10-1 shipped:
**"source double-entry + citation gates guard only 10/102 glyphs — filed as jt10-8."**
The font ports (jt10-1) transcribed ~102 glyphs by hand from MESSAGE.SRC, but the
byte-for-byte re-derivation gate only re-checks ~11 of them, so a silent drift in any of the
other ~90 glyphs would ship GREEN.

## Background — Measured Ground Truth (verified current tree)
The gate this story extends lives in TWO test files:
- `plugins/joust/tests/font35.test.ts` — `describe.skipIf(!vendoredAvailable)('FONT35 — re-derives byte-for-byte from MESSAGE.SRC (THE GATE, AC-1)')`, a `for (const {ch, srcLine, bitmap} of PINS)` loop.
- `plugins/joust/tests/font57.test.ts` — the parallel `describe.skipIf(!vendoredAvailable)('FONT57 — ... (THE GATE, AC-2)')`, same PINS-loop shape.

Each iteration does the double-entry: `decodeGlyphFromSource(srcLine)` re-reads MESSAGE.SRC,
asserts it equals the hand-literal `bitmap`, then asserts the module glyph
(`loadFont35/57().glyphFor(ch)`) equals the source reading.

- **Current pin count:** FONT35 PINS = **6** glyphs (`0 1 4 5` space `A`); FONT57 PINS = **5** glyphs. ≈11 of ~102 gated today — the "10 jt10-1 pinned" in the title.
- **Full inventory (the target):** FONT35 `ORDER` = **52** code slots; FONT57 `ORDER` = **54** code slots. ≈102 distinct glyphs after FDB aliasing.
- **Vendored source present:** `reference/williams-source/joust/MESSAGE.SRC` exists in this checkout, so the `skipIf(!vendoredAvailable)` gate actually RUNS here — it is not skipped. The extended gate must decode every glyph from that file.
- **FONT35 FDB reuse quirk (must be handled):** pointer `O` re-points to S0 (glyph "0 & O"), `S` re-points to S5 (glyph "5 & S"), but `T` is its own distinct ST glyph. Multiple `ch` values can share one `srcLine`/glyph — the extended loop must NOT assume `ch`↔glyph is 1:1.

## Technical Approach
Drive the gate from each font module's `ORDER` (the authoritative full glyph set) rather than
a hand-maintained `PINS` subset — so adding a glyph to the module automatically pulls it under
the gate. Keep the existing hand-literal pins as the honesty anchor for those glyphs; the new
coverage compares module-vs-source for every remaining glyph. TEA/Dev to settle the exact
mechanism (extend `PINS` to full coverage vs. iterate `ORDER` directly), preserving the
aliasing handling above. Final approach is TEA/Dev's call.

## Acceptance Criteria
_(Derived at setup — TEA finalizes during RED, especially AC-4 scope.)_

- **AC-1:** The FONT35 double-entry gate re-derives EVERY glyph in FONT35's `ORDER` (all 52 code slots) from MESSAGE.SRC and asserts module == source — not just the 6 currently pinned — with the `O`→S0 / `S`→S5 aliasing handled (aliased chars share a `srcLine`/glyph; `T` is distinct).
- **AC-2:** The FONT57 double-entry gate re-derives EVERY glyph in FONT57's `ORDER` (all 54 code slots) from MESSAGE.SRC.
- **AC-3:** The extended gate is NON-VACUOUS: mutating any single glyph's module data (or any hand-literal) makes the gate RED. This is the whole point — byte coverage of every glyph, so a drift in a previously-unguarded glyph must now fail.
- **AC-4 (OPEN — TEA to rule, not yet committed):** Does "the gate" also mean extending the citation-claims coverage in `docs/rom-study/claims/font.json` + `tools/audit/check-citations.mjs` to all glyphs? jt10-1's finding names BOTH gates (double-entry AND citation). The title says only "double-entry gate." TEA to confirm in-scope or out-scope against the finding; if out-scope, file the residue rather than dropping it.

## Scope
- **In scope:** extending the byte-for-byte double-entry re-derivation gate(s) to all glyphs in both fonts (test-only change).
- **Out of scope:** changing font module DATA (`src/core/font35.ts` / `font57.ts`) — this is a gate/coverage story, not a re-transcription. If the extended gate turns any glyph RED, that is a genuine drift to escalate, not a data edit to make GREEN silently.

---
_Enriched by SM (Baldur) from the jt10-8 session Background — the `pf context create` autogen was a null-YAML stub. Source of truth mirrors `.session/jt10-8-session.md`._
