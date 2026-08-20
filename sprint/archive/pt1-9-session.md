---
story_id: "pt1-9"
jira_key: "pt1-9"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-9: tempest: difficulty select should preview the board layout per level, and starting higher should pay a bonus

## Story Details
- **ID:** pt1-9
- **Jira Key:** pt1-9
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-9-difficulty-select-board-preview-bonus
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-20T13:25:22Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T12:26:38Z | 2026-08-20T12:29:15Z | 2m 37s |
| red | 2026-08-20T12:29:15Z | 2026-08-20T12:41:26Z | 12m 11s |
| green | 2026-08-20T12:41:26Z | 2026-08-20T12:51:48Z | 10m 22s |
| review | 2026-08-20T12:51:48Z | 2026-08-20T13:05:58Z | 14m 10s |
| green | 2026-08-20T13:05:58Z | 2026-08-20T13:11:19Z | 5m 21s |
| review | 2026-08-20T13:11:19Z | 2026-08-20T13:19:09Z | 7m 50s |
| green | 2026-08-20T13:19:09Z | 2026-08-20T13:20:37Z | 1m 28s |
| review | 2026-08-20T13:20:37Z | 2026-08-20T13:25:22Z | 4m 45s |
| finish | 2026-08-20T13:25:22Z | - | - |

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings; edges assessed first-hand (bbox/degenerate/NaN) + corroborated by reviewer-security |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings; no error-handling/catch code added — domain N/A |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings; test quality assessed by reviewer-rule-checker (#15/#18/#20/#25/#26) + first-hand |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings; no new types — existing types used correctly (rule-checker #1/#2 PASS) |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings; assessed first-hand — bbox loop clear, no over-engineering |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 2 confirmed (comment-analyzer's finding is the same defect as rule-checker's #17), 0 dismissed, 0 deferred

**Working-tree audit:** `pf reviewer audit-tree` first printed DIRTY over `sprint/epic-pt1.yaml` (the pf-written `in_progress`→`in_review` status stamp, exit 0 — the known false-DIRTY). Read the diff: tracking-only, no source mutation left by any subagent. `git checkout -- sprint/epic-pt1.yaml`; re-audit → **CLEAN**. All source files (render.ts, tests, findings json) clean.

## Reviewer Assessment

### Round 1

**Verdict:** REJECTED — 2 blocking findings (1 HIGH test-vacuity, 1 MEDIUM citation-precision)

Two **confirmed** defects, both mutation-proven / source-verified. Both are project-rule
violations (test-vacuity #15/#18 and citation-precision #17) that I may not dismiss. The feature
is behaviorally correct (verified in-browser by Dev: L1 circle / L2 square / L3 cross, BONUS
0/0/6000) — the defects are in the TEST and a COMMENT, not the runtime behavior. But a shipped test
that cannot fail and a confabulated ROM citation are exactly what this project's discipline exists
to stop (jt8-6 pattern: review rounds land on prose).

**Finding 1 — [TEST][RULE #15/#18] Vacuous AC1 polyline guard (HIGH).**
`plugins/tempest/tests/shell/pt1-9.select-preview-bonus.test.ts:127-132`. The assertion
`expect(select).toMatch(/glowPolyline\s*\(/)` scans the raw `drawSelect` source **including
comments**, and the comment I added at `render.ts:831` (`// ... glowPolyline (not via drawTube ...`)
already matches the regex. rule-checker PROVED it: deleting the real
`glowPolyline(ctx, previewRing, ...)` call left all 9 tests green. The guard cannot detect loss of the
preview draw — it manufactures false assurance.
→ **Fix:** make the scan comment-blind (strip `//...` line comments from `select` before matching) OR
anchor the assertion to the actual call, e.g. `/glowPolyline\s*\(\s*ctx\s*,\s*previewRing/` — the
comment has no `previewRing`. Re-mutate to prove it reddens (delete the real call → RED).
Secondary (non-blocking, already backstopped): the `computes the shown bonus from startWaveBonus(...)`
line (test:138) is similarly comment-vulnerable, but two sibling AC2 assertions still redden under
mutation, so the AC2 set is not vacuous. Strengthen it in the same pass for hygiene.

**Finding 2 — [DOC][RULE #17] Confabulated BODSPL colour citation (MEDIUM).**
`plugins/tempest/src/shell/render.ts:854`: *"Red, per the ROM's BODSPL bonus colour
(ALSCOR.MAC:1250-1254)."* Verified against `reference/original-source/tempest/ALSCOR.MAC`:1250-1254 —
BODSPL is `TXA / JSR BONSCO / LDA I,TEMP0 / LDY I,3 / JMP DIGTYS`: it computes the bonus score and
jumps to the colour-agnostic digit routine `DIGTYS`. It sets **no** colour; a second BODSPL call
site (`:149`) runs with no preceding RED. The claim is anchored to a routine that doesn't establish
the colour.
→ **Fix (ROM-always-wins — red is correct, re-anchor the citation, do NOT drop it):** the select
bonus IS red in the ROM. In the RQRDSP chooser loop the colour is set by the CALLER immediately
before the bonus display: `LDY I,RED` / `JSR NWCOLO` (**ALSCOR.MAC:1154-1155**) then `JSR BODSPL`
(`:1163`, "DISPLAY BONUS"). Re-cite the comment to `ALSCOR.MAC:1154` (the `LDY I,RED` before the
chooser's `JSR BODSPL`); keep the red fill.

### Verified good (no change needed)
- **[SEC] Bounds/degenerate:** `preview.near` is always exactly 16 immutable points; `selectedLevel`
  is clamped `[1,16]` (`sim.ts:1174`) and `tubeForLevel` double-wraps mod 16; `startWaveBonus`
  self-clamps its ladder index; `previewScale`'s `|| 1` guards a zero-span bbox. No OOB / NaN /
  unbounded-loop / injection path (drawGlowText is a vector font, no DOM).
- **[RULE] Single source of truth (AC2):** `startWaveBonus(s.select.selectedLevel)` is the SAME
  function/level the sim pays (`sim.ts:707`); mutation-proven (hardcoding `16000` reddens 3 AC2
  assertions). No ladder magic numbers in `drawSelect`.
- **[RULE] Accessibility (AC4):** only the pre-existing PRESS-FIRE blink (`Math.sin(renderTime*4)`,
  ~0.64 Hz) remains; preview/bonus are static-colour. Mutation-proven (a 4.8 Hz flash reddens the
  guard). Photosensitivity rule honored.
- **[RULE] Core/shell boundary:** `git diff --name-only` confirms no `core/` file changed; render.ts
  (shell) importing `tubeForLevel`/`startWaveBonus` from core/ is the allowed direction.
- **[DOC] DSPHOL & sim.ts citations accurate:** the "DSPHOL rim, no spokes (ALDISP.MAC:2863)" claim
  matches the code (one polyline over `near`, no spokes) and source; `sim.ts:707` startBonus cite is exact.
- **[RULE] Citation gate integrity:** SC-011 `remediated_by: "pt1-9"`, `ours` frozen (not nulled),
  no `*2` twins cited; `citations` gate 28/28 green.
- **Preflight:** 1824/1824 tests green, `npm run lint` clean, zero code smells.

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md`, checks 1–30)
rule-checker enumerated all 30 against the 4 changed `.ts` files. Result: **28 PASS, 2 VIOLATION**
(#15 token-in-comment, #17 confabulated citation — both above); the rest N/A or PASS. Project
ADDITIONAL rules: core/shell boundary PASS, citation-gate mechanics PASS, no-ladder-magic-number
PASS (mutation-proven), no-strobe PASS (mutation-proven). #25 (scope) PASS — `fnBody` correctly
bounds the scan to `drawSelect`; the #15 defect is a comment INSIDE the correctly-scoped region.

### Devil's Advocate
Argue the code is broken. **The preview icon lies about the board.** The mini-well is `preview.near`
bbox-centred and scaled to a fixed `H*0.14` box — but a player reads it as "the shape I'll fight in."
For an OPEN well (`closed:false`) the near ring carries `laneCount+1` points and renders as an open
arc; is a novice going to understand that squiggle is an open sheet, not a broken circle? The scale
also normalises every well to the same on-screen size, discarding the ROM's real relative
foreshortening — so the preview is a topology hint, not a faithful board. Defensible as "a hint,"
but a hostile reviewer would ask whether an inaccurate-by-design preview is worse than none. **The
BONUS 0 case:** levels 1–2 render "BONUS 0" — a confused user reads that as "starting costs me my
bonus" or "the bonus is broken." The ROM's RATE YOURSELF shows the value per column, so 0 is
faithful, but is it clear? **Malicious/edge input:** `selectedLevel` is clamped in the sim, but
`drawSelect` trusts it blindly — if a future refactor let a NaN/`Infinity` selectedLevel through,
`tubeForLevel` mod-wraps it to `NaN` index → `GEOMETRIES[NaN]` is `undefined` → `.near` throws. The
render has no defensive guard; it relies entirely on the sim's clamp holding forever (today it does —
`sim.ts:1174`). **Stressed render:** `previewScale` uses `|| 1`, but if the ring were ever a
single-point degenerate the "well" collapses to a dot with no error — silent, not loud. **The
tests:** the whole AC1 preview guarantee rests on source-text scans, and I already proved one is
vacuous — how many of the "green" assertions are really load-bearing? The mutation sweep says the
rest redden, but the pattern (regex over source incl. comments) is inherently fragile and one more
stray comment token re-vacuates a guard. None of these rise to a *new* blocking finding beyond the
two already filed (the sim clamp holds, the preview-as-hint is an accepted interaction per SC-011,
BONUS 0 is faithful), but they sharpen why finding 1's test fragility matters: the source-scan
approach is one comment away from lying, so the strengthened assertion must be comment-blind, not
merely re-anchored to another token.

### To Dev (rework)
Two small edits, both in files already on the branch:
1. `tests/shell/pt1-9.select-preview-bonus.test.ts` — strengthen the polyline assertion so a comment
   cannot satisfy it (comment-blind scan or anchor to `previewRing`); prove by mutation.
2. `src/shell/render.ts:854` — re-anchor the bonus-colour citation to `ALSCOR.MAC:1154` (`LDY I,RED`
   before the chooser's `JSR BODSPL`); keep the red fill (ROM-authentic).
No runtime/behavior change required; the feature itself is approved.

## Subagent Results

**Cycle: 1**

Method: re-ran ALL enabled subagents against the reworked diff (`git diff develop...HEAD`, rework
commit `94ba2a71`) — not a targeted-only pass. rule-checker re-verified finding #15 by MUTATION
(restored) and #17 against source.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings; stripComments termination assessed first-hand + by reviewer-security |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings; no error-handling code — domain N/A |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings; test quality re-verified by reviewer-rule-checker (mutation-proven #15 fix) |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (new LOW off-by-one), dismissed 0, deferred 0 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings; no new types (stripComments uses primitives) |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings; assessed first-hand — stripComments is a standard single-pass tokenizer, not over-built |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (same off-by-one; both round-1 findings FIXED), dismissed 0, deferred 0 |

**All received:** Yes (4 enabled re-ran for Cycle 1, 5 disabled pre-filled)
**Total findings:** 1 confirmed NEW (the off-by-one, found independently by both comment-analyzer and rule-checker). Round-1 findings #15 and #17 both **FIXED and re-verified** (mutation-proven).

**Working-tree audit:** `pf reviewer audit-tree` again printed DIRTY over `sprint/epic-pt1.yaml`
(the pf `in_progress`→`in_review` stamp, exit 0 — known false-DIRTY). rule-checker's render.ts
mutation was restored (`git diff HEAD -- render.ts` empty). `git checkout -- sprint/epic-pt1.yaml`;
re-audit → **CLEAN**.

## Reviewer Assessment

### Round 2

**Verdict:** REJECTED — 1 blocking finding (LOW citation off-by-one). Both round-1 findings verified FIXED.

The round-1 rework is substantively correct and both prior findings are closed with independent
evidence:
- **Finding 1 (#15, was HIGH) — FIXED, mutation-proven.** The new comment-blind `stripComments()` +
  `selectCode` view and the `glowPolyline(ctx, previewRing` anchor mean the polyline guard now
  reddens when the real draw call is removed (rule-checker: "1 failed" on mutation, restored). Two
  new sanity tests pin `stripComments` behavior and the exact round-1 comment token — meaningful,
  not tautological.
- **Finding 2 (#17, was MEDIUM) — FIXED.** The confabulated "BODSPL sets the colour" claim is gone;
  the comment now correctly attributes red to the caller (`LDY I,RED / JSR NWCOLO` before
  `JSR BODSPL` in RQRDSP), verified true against source.

**New finding — [DOC][RULE #17/#24] Citation range off-by-one (LOW).**
`plugins/tempest/src/shell/render.ts:855`: the comment names `JSR BODSPL` but cites the range
`ALSCOR.MAC:1154-1163`, and `JSR BODSPL` is on line **1164** (`:1163` is `LDX INDEX4`) — verified
first-hand (`awk 'NR>=1154&&NR<=1165'`). The range excludes the very instruction it quotes. Found
independently by BOTH reviewer-comment-analyzer (high confidence) and reviewer-rule-checker. Unlike
round-1's confabulation this is NOT misleading — the range still contains the load-bearing
`LDY I,RED` at :1154 — but a citation that names an instruction should span it.
→ **Fix (one character):** change the range to `ALSCOR.MAC:1154-1164`.

Why REJECT rather than defer: the fix is one character in a comment already in the diff. Deferring a
known-wrong citation into a follow-up is fractal work, and this project's citation discipline (and
my own round-1 bar) does not ship a range that excludes the instruction it cites. The specialists
graded it "not a re-open" on severity — correct, it is LOW — but the correct outcome is still that
the citation is right before merge, and the cheapest route to that is a one-line rework.

### Verified good (re-confirmed this cycle)
- Preflight: full suite 1798/1798, pt1-9 22/22, citations 28/28, lint clean, zero smells.
- Security: no runtime code changed (render.ts diff is comment-only); `stripComments()` is a bounded,
  terminating, non-throwing single-pass parser (proven on unterminated input too).
- rule-checker: no NEW violations across checks 1–30 from the rework; core-test ladder literals and
  SC-011 citation-freeze still compliant.

### Devil's Advocate (round 2)
Could the rework hide a regression? The one real risk is `stripComments()` itself: if it mis-parsed
the real `drawSelect` body it could silently re-vacuate every structural guard (a stripper that
over-strips could delete the real `glowPolyline` call from `selectCode`, making the anchor
un-matchable and the test falsely RED — or under-strip and re-admit comment tokens). But the mutation
proof cuts both ways: the guards are GREEN on the real code (so the stripper preserves the real call)
and RED when the call is deleted (so the stripper isn't admitting the comment) — the two together pin
`selectCode` as a faithful code-only view, and the dedicated `stripComments` sanity test pins the
helper on a synthetic sample with both comment styles and an in-string `//`. The off-by-one is the
only thing left, and it is cosmetic. Nothing else in the rework touches runtime.

### Rule Compliance (round 2)
All round-1 violations (#15, #17) now PASS. One new LOW #17/#24 boundary slip (above). Everything
else PASS/N-A per the round-1 table (unchanged runtime).

### To Dev (rework round 2)
One character: `src/shell/render.ts:855` — change `ALSCOR.MAC:1154-1163` to `ALSCOR.MAC:1154-1164`
so the cited range spans the `JSR BODSPL` (`:1164`) it names. Nothing else.

## Subagent Results

**Cycle: 2**

Method: re-ran ALL enabled subagents against the round-2→3 diff (the one-character citation fix,
commit `add13b28`). Reviewer also verified the fix first-hand (`awk` on ALSCOR.MAC:1164 = `JSR BODSPL`).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings; comment-only change — no edges |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings; no error-handling code — domain N/A |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings; no test change this cycle |
| 5 | reviewer-comment-analyzer | Yes | clean | none | Round-2 finding CONFIRMED-FIXED; no remaining issue |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings; no types touched |
| 7 | reviewer-security | Yes | clean | none | N/A (comment-only, no attack surface) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings; nothing to simplify in a 1-char comment |
| 9 | reviewer-rule-checker | Yes | clean | none | Round-2 #17/#24 finding FIXED; no new violation; tree grepped for stale citation copies — none |

**All received:** Yes (4 enabled re-ran for Cycle 2, 5 disabled pre-filled)
**Total findings:** 0 — the round-2 off-by-one is FIXED and independently re-verified; nothing new.

**Working-tree audit:** `pf reviewer audit-tree` → CLEAN (no subagent mutated anything this cycle;
rule-checker was instructed not to mutate a comment-only change).

## Reviewer Assessment

### Round 3

**Verdict:** APPROVED

The round-2 LOW finding (citation range off-by-one) is fixed: `render.ts:855` now cites
`ALSCOR.MAC:1154-1164`, and I verified first-hand that `:1164` is `JSR BODSPL` (with `:1154 LDY I,RED`,
`:1155 JSR NWCOLO`, all inside `RQRDSP` from `:1074`) — the range now spans every instruction the
sentence names. Independently CONFIRMED-FIXED by both reviewer-comment-analyzer and
reviewer-rule-checker; the latter also grepped the tree for stale copies of the old range (none).

The full picture across three rounds:
- **Feature** (well-outline preview + start-bonus display on the level select, remediating SC-011):
  correct from round 1, verified in-browser (L1 circle / L2 square / L3 cross; BONUS 0/0/6000), and
  unchanged since. Behavior was approved in round 1.
- **Round-1 findings** (#15 vacuous polyline guard; #17 confabulated BODSPL colour citation): both
  FIXED in round 1's rework and mutation-/source-verified in round 2.
- **Round-2 finding** (#17/#24 citation off-by-one): FIXED in round 2's rework, verified this round.

All gates green: full tempest suite **1798/1798**, `npm run lint` clean, `citations` 28/28, zero code
smells, SC-011 stamped `remediated_by: pt1-9` with its `ours` quote frozen, no `*2` twin citations,
core/shell boundary intact, no photosensitive strobe. No blocking or non-blocking findings remain.

Specialist coverage this cycle: **[DOC]** reviewer-comment-analyzer — round-2 citation fix
CONFIRMED-FIXED (range now spans `JSR BODSPL` at :1164). **[RULE]** reviewer-rule-checker — #17/#24
finding FIXED, no new violation across checks 1–30, tree grepped for stale citation copies (none).
**[SEC]** reviewer-security — comment-only change, no attack surface. reviewer-preflight — all gates
green.

Ship it.

### Devil's Advocate (round 3)
Is there any way this still ships wrong? The only change since the approved-behavior baseline is
comment text, so no runtime regression is possible; the test suite is unchanged and green; and the
one comment now matches the source bytes exactly (checked three ways — comment-analyzer, rule-checker,
and my own `awk`). The remaining theoretical worry — that some OTHER comment or test still carries the
old `1154-1163` — was closed by the rule-checker's tree-wide grep. Nothing left to catch.

## Dev Assessment (rework — round 2 finding addressed)

**Round-2 LOW finding fixed — ready for re-review.** Commit `add13b28`, pushed. One-character,
comment-only change: `render.ts:855` citation range `ALSCOR.MAC:1154-1163` → `1154-1164` so it spans
the `JSR BODSPL` (`:1164`) the sentence names. No runtime/test change; lint clean, pt1-9 22/22 green.
Correlation: maps to existing check #17/#24 (citation range) — PROCESS miss, no new checklist check.

## Dev Assessment (rework — round 1 findings addressed)

**Both round-1 findings fixed — ready for re-review.** Commit `94ba2a71`, pushed. Full tempest suite
**1798/1798** green (+2 new sanity tests), lint clean.

- **Finding 1 (#15, HIGH — vacuous polyline guard):** added a quote-aware `stripComments()` +
  comment-blind `selectCode` view in `pt1-9.select-preview-bonus.test.ts`; every structural scan
  (tubeForLevel / glowPolyline / startWaveBonus / ladder / sine) now runs on `selectCode`, and the
  polyline assertion is anchored to the real call `glowPolyline(ctx, previewRing, ...)`. **Mutation-proven:**
  commenting out the real `glowPolyline` call now reddens the test (verified, then restored). Added two
  sanity tests pinning `stripComments` behavior and the exact round-1 comment token (raw source still
  carries it; `selectCode` does not).
- **Finding 2 (#17, MEDIUM — confabulated BODSPL colour citation):** re-anchored the `render.ts` bonus
  comment to `ALSCOR.MAC:1154-1163` (`LDY I,RED / JSR NWCOLO` then `JSR BODSPL` in the RQRDSP chooser
  loop — the caller sets red before the bonus draw). Red kept (ROM-authentic). Runtime unchanged.
- **Correlation:** both findings map to EXISTING lang-review checks (#15, #17) — PROCESS misses, not
  knowledge gaps, so no new checklist check is warranted (the checks already exist and now fired).

## Dev Assessment

**GREEN complete — ready for Reviewer.** Full tempest suite **1796/1796** green, `npm run lint`
clean, pt1-9 20/20. Commits on `feat/pt1-9-difficulty-select-board-preview-bonus`: RED tests
(`aa...`), feature `b4cf7a37`. Pushed.

### What landed (all in `plugins/tempest/src/shell/render.ts` `drawSelect` + one audit stamp)
- **AC1 preview:** `drawSelect` now draws the selected level's well outline — `tubeForLevel(s.select.selectedLevel)`,
  its `near` ring bbox-centred and scaled into a small icon, stroked via `glowPolyline` (closed iff
  `tube.closed`). Drawn directly (not `drawTube`). New imports: `tubeForLevel` (core/geometry),
  `startWaveBonus` (core/rules).
- **AC2 bonus, single source of truth:** `drawGlowText(... `BONUS  ${startWaveBonus(s.select.selectedLevel)}` ...)`
  in red (ROM `BODSPL`). Same function + selected level the sim pays → shown == paid. No ladder literals.
- **AC3 citation:** stamped `docs/audit/findings/pair-6-alscor-scoring.json` SC-011
  `remediated_by: "pt1-9"`; `ours` quote kept frozen (the gate stops re-opening it — its stale
  `H * 0.5` line is now history, which is correct).
- **AC4 no strobe:** preview uses the static level `color`; no new `Math.sin`/flash. The only
  animation remains the pre-existing PRESS FIRE blink (`renderTime * 4`, ~0.64 Hz).
- **Layout:** re-spaced the prompt lines (BONUS at `H*0.7`, SPIN KNOB/PRESS FIRE moved to `H*0.8`)
  so nothing overlaps. Existing strings/colours unchanged (tp1-20 green).

### Verified in-browser (tempest CLAUDE.md: look, don't rest on source-wiring tests)
Served this tree on `127.0.0.1:5301` (5270 was held by a sibling checkout — did not disturb it) and
drove Playwright through attract → select. Confirmed the preview keys to the level and the bonus is
correct and authentic:
- **Level 1** → circle well, `BONUS 0`
- **Level 2** → square well, `BONUS 0`
- **Level 3** → cross/plus well, `BONUS 6000` (the cited `BONPTM` step-1 value)
Layout clean at every level; BONUS red, LEVEL# yellow, preview blue, all pinned strings/colours intact.

### For Reviewer
- The shape decision (b, not the 5-wide scroll) is source-settled — SC-011 `recommendation: accept`;
  see the TEA Assessment + Delivery Finding. Not a deviation.
- The `ours` verbatim in SC-011 still quotes the old `H * 0.5` position; that is the FROZEN audit
  record (commit `4232ed4`), intentionally not repointed — remediation freezes it as history.

## Tea Assessment

**RED complete — ready for Dev (GREEN).** 7 genuine behavioral failures, 0 compile/import
errors, 0 regressions in the existing tempest suite. Commit: RED tests landed on
`feat/pt1-9-difficulty-select-board-preview-bonus`.

### The shape decision (settled by source, not asked)
The Architect context posed an open (a) full RATE YOURSELF 5-wide scroll / sparse ROM ladder /
HIWAVE vs (b) minimal preview+bonus. **The primary source decides it:** finding SC-011 carries
`recommendation: accept` and states a discrete-step chooser is fine *provided it conveys "current
level, its bonus, its hole."* Today `drawSelect` shows only the level number — below that bar. So
the fix is (b): add the selected level's well-outline preview + bonus value to the existing
contiguous 1..16 chooser. No scroll, no sparse ladder, no HIWAVE. This keeps `sim.framing` and
`geometry.cycle` green and needs no ladder extension (level 16 → step 7 → the existing 8-entry
`START_WAVE_BONUS_LADDER`). Recorded as a Delivery Finding.

### ACs pinned (from the context's suggested set, refined against source)
- **AC1 — preview:** `drawSelect` previews the SELECTED level's well outline from
  `tubeForLevel(selectedLevel)` (canonical geometry table / ROM_REMAP), stroked as a polyline via
  `glowPolyline` — the ROM `DSPHOL` rim outline, no spokes (`ALDISP.MAC:2863`). RED: drawSelect
  references neither today.
- **AC2 — bonus, single source of truth:** the select screen shows `startWaveBonus(selectedLevel)`
  — the SAME function and level the sim pays (`sim.ts:707` → `beginFlyIn`). Shown == cited == paid
  by construction; no hand-copied ladder literals allowed in `drawSelect`. Pinned on BOTH sides:
  render source-scan (shown side) + a live-sim core test driving the real framing flow for levels
  1/3/5/16 against the cited `BONPTM` ladder (paid side).
- **AC3 — SC-011 remediated + citation gate green:** `pt1-9.citations.test.ts` asserts
  `SC-011.remediated_by === 'pt1-9'` with its `ours` quote frozen (not nulled). RED today (null).
  Dev must stamp it AND land the feature.
- **AC4 — no strobe (safety):** guard that `drawSelect` adds no `Math.sin(renderTime * K)` flash with
  K > 8 rad/s (~1.3 Hz), well under the 3 Hz photosensitivity ceiling. Accessibility outranks
  fidelity — the ROM's per-cycle well colour must NOT become a per-frame strobe. Green on arrival
  (safety net); non-vacuous by the coefficient bound.

### For Dev (GREEN)
- `render.ts` must import `tubeForLevel` (from `core/geometry`) and `startWaveBonus` (from
  `core/rules`) — neither is imported yet. Draw the mini-ring DIRECTLY over `tube.near` (scaled
  `glowPolyline`, closed iff `tube.closed`); do NOT reuse `drawTube` (it is GameState-shaped).
- Keep the existing `drawSelect` strings/colours (tp1-20 pins them: `RATE YOURSELF` green,
  `RANKING FROM 1 TO ${MAX_SELECT_LEVEL}`, `SPIN KNOB TO CHANGE` cyan, `PRESS FIRE TO SELECT`
  yellow). Additive change only.
- Stamp `docs/audit/findings/pair-6-alscor-scoring.json` SC-011 `remediated_by: "pt1-9"`; keep its
  `ours` quote (freeze, don't null). Cite `ALSCOR.MAC`/`ALDISP.MAC`/`ALWELG.MAC`, never the `*2`
  twins (`linked-modules.mjs` rejects ALSCO2/ALDIS2).
- Do NOT perturb the geometry tables (`geometry.authentic.test.ts` guards them) or the offered set
  (stays contiguous 1..16 — `sim.framing.test.ts`).

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)
- **#8 Test quality:** every test asserts a meaningful value; no `let _ =`, no `assert(true)`, no
  always-None checks. Self-checked.
- **#15 (token-not-claim):** the source-scans anchor to the CLAIM — `startWaveBonus(...selectedLevel...)`
  and `tubeForLevel(...selectedLevel...)`, not a bare `startWaveBonus`/`tubeForLevel` token — so a
  fixed-level or wrong-level draw still reddens.
- **#25 (whole-file search scope):** every source-scan runs on `fnBody(renderSrc, 'drawSelect')`, not
  on all of `render.ts` — a bonus/preview elsewhere in the file cannot satisfy them.
- **#20 / #26 (all-local / same-diff artifact):** the bonus magnitudes are cited ROM `BONPTM`
  literals and the paid side is read from the live sim — the assertion's terms are not all local to
  the test, and are not measured from code the same change edits.
- **Photosensitivity safety** (AC4) — repo/global accessibility rule, outranks ROM fidelity.

## Sm Assessment

**Setup complete — ready for RED.** Story pt1-9 (tempest, 5pt, p1, tdd).

- **Sibling probes clean:** no `origin` branch matched `pt1-9`; the only live session across `a-*`
  checkouts was a-2's `pt1-3`. No contention. Claim pushed on
  `feat/pt1-9-difficulty-select-board-preview-bonus` (`db06ef65`), story stamped `in_progress`.
- **Scope is unambiguous, no user ruling needed:** two deliverables — (1) a per-level board (web)
  layout PREVIEW on the difficulty/level select, and (2) a SCORE BONUS for starting at a higher
  level. Both are asserted authentic Tempest (SuperZapper-era level select).
- **Open items are ROM/design, owned by TEA/Architect:** the exact bonus values and the precise
  preview behavior must be derived from and CITED against ROM/MAME (repo rule: ROM always wins).
  The hand-authored context file `sprint/context/context-story-pt1-9.md` (Architect, 2026-08-19) is
  TEA's primary input; ACs copied verbatim from the epic YAML.
- **Next:** TEA (Atia of the Julii) for RED — frame failing tests around the cited bonus values and
  the per-level preview.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[SM/setup, non-blocking]** Sibling probes clean at setup: no `origin` branch matched `pt1-9`,
  and the only live session across `a-*` checkouts was a-2's `pt1-3` (different story). No
  contention. Claim pushed on `feat/pt1-9-difficulty-select-board-preview-bonus` (commit `db06ef65`,
  epic stamped `in_progress`).
- **[SM/setup, Question, non-blocking → TEA/Architect]** The story asserts two *authentic Tempest*
  behaviors — a per-level board (web) layout PREVIEW on the difficulty/level select, and a SCORE
  BONUS for starting higher. Both are ROM claims, not settled facts. The story explicitly requires
  checking references/ROM/MAME and **citing the bonus values**. Treat the bonus numbers and the
  preview behavior as things to derive-and-cite against source, per the repo's ROM-always-wins rule;
  the hand-authored context file (`sprint/context/context-story-pt1-9.md`, Architect, 2026-08-19) is
  the primary input. No user ruling needed at setup — the scope is unambiguous (two deliverables),
  only the ROM values are open, and those are RED/design work.
- **[TEA/red, Improvement, non-blocking]** The Architect context framed an (a) full RATE YOURSELF
  5-wide scrolling window / sparse ROM `LEVEL` ladder / HIWAVE persistence vs (b) minimal
  preview+bonus on the existing 1..16 chooser as an open "Decision for TEA/Dev." **The primary
  source settles it, so no user ruling was needed:** the audit finding SC-011 itself carries
  `recommendation: accept` and reasons that a discrete-step chooser "doesn't need a preview
  window... collapsing to a single value is a reasonable interaction simplification," the accepted
  condition being that it still conveys **"current level, its bonus, its hole."** Our `drawSelect`
  today shows only the level *number* — below even that accepted bar. So the remediation is shape
  (b): add the selected level's well-outline preview (`tubeForLevel`) + its bonus value
  (`startWaveBonus`) to the existing contiguous 1..16 chooser. The 5-wide scroll / sparse ladder /
  HIWAVE are explicitly NOT adopted (source recommends accepting the single-value collapse), which
  also keeps `sim.framing.test.ts` and `geometry.cycle.test.ts` green and needs no ladder extension
  (level 16 → skill step `floor(15/2)=7` → the existing 8-entry `START_WAVE_BONUS_LADDER`).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
No deviations from spec. Shape (b) — preview + bonus on the existing contiguous 1..16 chooser — is
the ACs as TEA pinned them from the primary source (SC-011 `recommendation: accept`), not a
descope; the 5-wide scroll / sparse ladder / HIWAVE were never in scope. Bonus rendered as a plain
integer (`BONUS 6000`) satisfying "show the bonus value"; layout Y positions were re-spaced to avoid
overlap (the ACs pin strings/colours, not coordinates). All ACs met, full suite + lint green.