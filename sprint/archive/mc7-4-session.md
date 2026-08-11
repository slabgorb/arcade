---
story_id: "mc7-4"
jira_key: "mc7-4"
epic: "mc7"
workflow: "tdd"
---
# Story mc7-4: ROM-faithful ladder display + seeded default table

## Story Details
- **ID:** mc7-4
- **Jira Key:** mc7-4
- **Epic:** mc7
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-10T23:54:14Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T23:15:27Z | 2026-08-10T23:17:15Z | 1m 48s |
| red | 2026-08-10T23:17:15Z | 2026-08-10T23:31:31Z | 14m 16s |
| green | 2026-08-10T23:31:31Z | 2026-08-10T23:44:38Z | 13m 7s |
| review | 2026-08-10T23:44:38Z | 2026-08-10T23:54:14Z | 9m 36s |
| finish | 2026-08-10T23:54:14Z | - | - |

## Sm Assessment

Setup complete for mc7-4 (3pt, tdd). This is now **render-only** work: the
infrastructure landed in three prior done stories —
- **mc7-1**: core high-score table with `DEFAULT_HIGH_SCORES` (DFT/DLS/SRC/RDA/MJP), `MC_HIGH_SCORE_DEPTH=5`.
- **mc7-3**: persistence `loadHighScores()` seeds from defaults on first boot.
- **mc6-5**: attract presentation with the `highScoreSlot()` layout — the "mc6-5 slot" this story renders into.

Scope for mc7-4: seed the initial ladder from the cited W3DSUP INIT HI SCORE
defaults (REV-01 W3DSUP.MAC:3724) and render the ladder on the attract
high-score screen. **Pin default names/scores at RED.**

Dependency check: mc6-5 confirmed `done`, no stale remote branch, no blocking
PRs — merge gate clear. Branch `feat/mc7-4-ladder-display` cut fresh from
current `origin/develop` (local develop was 3 behind).

Routing to TEA (RED) to pin the default ladder names/scores and define the
render requirements against the mc6-5 slot layout.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Render-only story with observable render behaviour (glyphs painted into a slot, best-first order, both columns, read-from-state) — structurally testable via a recording canvas.

**Test Files:**
- `plugins/missile-command/tests/mc7-4-ladder-display.test.ts` — new; the ladder-display RED suite (12 tests: 6 driver, 6 lock).
- `plugins/missile-command/tests/mc6-5-attract-presentation.test.ts` — edited; retired the AC3 container-only assertion that mc7-4 overturns (see Design Deviations).

**Tests Written:** 12 tests covering 6 ACs.
**Status:** RED (6 driver tests failing, ready for Dev; 6 green-on-arrival locks).

Independently verified by testing-runner: 6 fails (all pure assertion failures, no compile/import/crash), confined to the mc7-4 file; full mc project 1291 pass incl. the edited mc6-5 (green); `tsc --noEmit` clean.

**AC → test map:**
- AC1 — ladder rendered into the slot (overturns mc6-5 container-only): `paints stamp-font glyphs INSIDE the highScoreSlot region`, `swapping the LOWER rungs changes the slot render`.
- AC2 — one row per rung, best-first (CDLADR 5 HI LADDER): `every one of the five rungs is painted … best→worst top→bottom` (strictly-increasing mean-Y proves 5 distinct rows in order, pitch-agnostic).
- AC3 — score + initials columns (SCLDR/INTLV): `changing only a rung score, and only its initials, each changes the slot render`.
- AC4 — reads state.highScores verbatim: `renders whatever table is in state`, `identically twice (no entropy)`, `iterates the actual table length`, `attract.ts clock-free`.
- AC5 — seeded default table UNTOUCHED (lock): `DEFAULT_HIGH_SCORES still decodes to the five REV-01 rungs`.
- AC6 — ground truth: `MC_HIGH_SCORE_DEPTH matches "DISPLAY 5 HI LADDER"`, `CDLADR (W3COMN.MAC:97)`, `score column + initials column (W3COMN.MAC:163/165/169)`.

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

| Rule | Test(s) | Status |
|------|---------|--------|
| #4 null/undefined & index-out-of-bounds | `iterates the actual table length — a shorter ladder paints fewer rungs and never throws` | failing |
| #8 test quality (no vacuous assertions) | whole suite — every test asserts a concrete diff/order/count | self-checked |
| #5 `.js` ESM import extensions | (Dev to verify on the render edit) — test imports use `.js`; noted, not test-driven | n/a |

**Rules checked:** #4 has a driver test; #8 self-checked; other TS rules (#1–#3, #5–#7, #9) target implementation Dev will write and are covered by the standing `tsc --noEmit` + `purity` gates.
**Self-check:** 0 vacuous tests found. One false-positive was caught and fixed during RED — the self-playing attract demo (mc6-4) paints a state-independent vector shape inside the slot band, so the bare "marks in slot" presence check was tightened to count `fillRect` glyphs only; every other assertion diffs on `state.highScores` and cancels the demo shape.

**Guidance for Dev (Yoda):** render the 5 rungs INSIDE `highScoreSlot(w,h)` in `drawAttract` (render.ts), reading `state.highScores` VERBATIM in array order (best on top) — do NOT re-sort, re-seed, or re-derive; each rung shows score + initials via the existing stamp-font `drawGlyphText`. Iterate the table (`for … of state.highScores`), do not hard-index `[0..4]`. Layout px are a display choice (free-play/aspect deviation — same latitude mc6-5 used), not a cited ROM constant; no new `src/core` constant means no new claim.

**Handoff:** To Dev for implementation.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/missile-command/src/shell/render.ts` — `drawAttract` now fills the reserved slot: for each `state.highScores` entry (array order = best-first), draw the score (left column) and initials (right column) with the existing stamp-font `drawGlyphText`, laid out at the HUD line pitch inside `highScoreSlot()`. ~6 lines; no new helper, no new import.
- `plugins/missile-command/tests/render-hud-layout.test.ts` — pinned `field()` to `phase: 'play'` (context fix, no assertion changed).
- `plugins/missile-command/tests/render-battle.test.ts` — pinned the ICBM-scenario `bare` to `phase: 'play'` (same reason).

**Tests:** 12/12 mc7-4 GREEN; full missile-command 1297/1297; repo-wide vitest 14398 pass; orchestrator 457 pass; `tsc --noEmit` clean. Independently re-verified by testing-runner.

**Visual check (render story):** served the working tree on :5291 and screenshotted `/missile-command/` in attract — the ladder renders legibly: HIGH SCORES header + five best-first rungs `7500 DFT / 7495 DLS / 7330 SRC / 7005 RDA / 6950 MJP`, score column left + initials column right, white glyphs readable over the self-play demo. Matches the ROM's two-column attract ladder. (Server stopped, screenshot discarded — not committed.)

**Self-review:** wired into the live `drawAttract` render path (confirmed on-screen, not just tests); reads `state.highScores` VERBATIM in array order (no re-sort/re-seed/re-derive — the seeded defaults stay core's, mc7-1); iterates the array (not indexed `[0..4]`), so a short table degrades gracefully; no new `src/core` constant → no new claim; no debug code; tree clean.

**Branch:** feat/mc7-4-ladder-display
**PR:** https://github.com/slabgorb/arcade/pull/222
**Handoff:** To Reviewer.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (1297 mc + 457 orch + lint green; no smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings (test quality covered by rule-checker #8) |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A (diff-scoped; missed the out-of-diff stale comment I caught directly) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | findings | 1 (low) | confirmed 1, dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 1 (dup of stale comment), 1 downgraded (convention) |

**All received:** Yes (4 enabled returned; 5 disabled via settings)
**Total findings:** 2 confirmed non-blocking (1 MEDIUM stale comment, 1 LOW unbounded loop), 1 downgraded (LOW, established convention), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The production change is a ~6-line `forEach` in `drawAttract` (`render.ts:376-381`) that paints the seeded ladder into the reserved slot. It reads `state.highScores` verbatim in array order, iterates (not indexes), and reuses the existing stamp-font helpers. Two independent verifications (my direct file read + the rule-checker) plus a live screenshot confirm it is correct and authentic. No Critical/High issues; the two confirmed findings are Medium/Low (non-blocking) and filed as follow-ups.

**Data flow traced:** `state.highScores` (core, seeded by mc7-1 / loaded by mc7-3) → `drawAttract` `forEach` → `drawGlyphText` → `ctx.fillRect` (pure Canvas 2D, no DOM/HTML sink). Safe: no injection surface, and `glyphRows` (`glyphs.ts:94-98`) maps any non-`[0-9A-Z]` char to a BLANK row (no out-of-bounds table read possible).

**Pattern observed:** best-first, score-column-left / initials-column-right, laid out at the HUD line pitch inside `highScoreSlot()` — consistent with mc6-5's established free-play/aspect deviation. `render.ts:376-381`.

**Error handling:** iteration is bounds-safe (`forEach`, non-optional fields); empty name → `glyphTextWidth('')===0` lands the row in-slot (no NaN); short table paints fewer rungs (asserted by AC4). `render.ts:378-381`.

**Findings (all non-blocking):**

- `[DOC][RULE] [MEDIUM]` Stale/contradictory comment at `render.ts:315` — the mc6-5 section header still reads "the high-score SLOT is drawn as a header + reserved box ONLY … nothing here reads state.highScores beyond the HUD BEST," directly contradicting the new `forEach` 60 lines below. Confirmed independently by the rule-checker (rules #17/#24). The diff correctly retired the *adjacent* narrower copy (`render.ts:366`) but missed this one. The diff-scoped comment-analyzer structurally could not see it (unchanged context). Fix: update line 314-315 to describe the post-mc7-4 behaviour. Non-blocking (Medium), filed as a follow-up.
- `[SEC] [LOW]` Unbounded render loop at `render.ts:378` — `state.highScores.forEach(...)` has no cap at `MC_HIGH_SCORE_DEPTH` (== `slot.rows`). The load path (`loadHighScores` → `@shared/highscore` `load()`) validates row *shape* but not table *length*; only the play-time `insertHighScore` truncates to 5. A tampered/corrupted `missile-command-high-scores` localStorage entry with many shape-valid rows would draw proportionally many rows per attract frame (and rows beyond 5 would overflow the authentic slot). No crash/injection/cross-user impact under the no-server/no-account threat model — the only writer of that key is the same-origin player. Fix: `state.highScores.slice(0, slot.rows).forEach(...)` — also enforces the ROM's "DISPLAY 5 HI LADDER" (exactly 5) at the render. Non-blocking (Low), filed as a follow-up.
- `[RULE] [LOW→noted]` `api as unknown as CanvasRenderingContext2D` at `tests/mc7-4-ladder-display.test.ts:104` (rule #1 double-cast) — byte-identical to the established mock idiom in 10+ sibling render test files; not introduced-risk. Downgraded to a repo-wide convention note; no action for this story.

**Dispatch tag coverage:** `[DOC]` comment-analyzer — clean (see finding caveat: diff-scoped miss covered by my direct read). `[SEC]` security — 1 low (above). `[RULE]` rule-checker — 1 confirmed (dup of stale comment) + 1 downgraded. `[EDGE]`, `[SILENT]`, `[TEST]`, `[TYPE]`, `[SIMPLE]` — subagents disabled via `workflow.reviewer_subagents`; I assessed those domains directly: edges (bounds-safe iteration, empty-name/short-table handled), silent failures (none — no swallowed errors, pure render), test quality (rule-checker #8 exhaustively clean — no vacuous assertions), type design (non-optional fields, no new escapes), simplification (minimal ~6 lines, reuses existing helpers, no dead code).

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md` + CLAUDE.md)

Exhaustive enumeration (corroborated by rule-checker, 29 rules / 47 instances):

- **#1 type escapes** — 1 instance (`test:104` double-cast) → established convention, downgraded (noted above). No escapes in production `render.ts`.
- **#4 null/undefined & index** — COMPLIANT. `state.highScores` non-optional (`game.ts:112`); `entry.score`/`entry.name` non-optional (`shared/highscore.ts:51-55`); iterated, not indexed `[0..4]`.
- **#5 `.js` import extensions** — COMPLIANT (all new test imports carry `.js`; render.ts adds no import).
- **#8 test quality** — COMPLIANT, all 9 assertions concrete (no vacuous/always-true); AC4's `not.toThrow()` is paired with `toBeLessThan`.
- **#21 degenerate numeric input** — COMPLIANT (`glyphTextWidth('')===0`, no NaN).
- **CLAUDE.md core-boundary / citation gate (#30/#32)** — COMPLIANT: `git diff --name-only … src/core` is empty (shell-only), so no new core constant and no claim required; no `Date`/`Math.random`/`performance.now`/`requestAnimationFrame` added (only the pre-existing `state.frame` clock).
- **CLAUDE.md HUD-figure rule (#31)** — COMPLIANT: `forEach` reads `state.highScores` verbatim, no `.sort()`/`.slice()`/re-seed/fallback; AC4 proves a custom table renders differently (not hard-coded).

### Devil's Advocate

Argue the code is broken. First, the strongest angle — the persisted-table length gap (my LOW finding): `loadHighScores` shape-validates but does not cap length, and the render is the *first* consumer that iterates the full array, so a hand-edited localStorage entry with 500 rows would tank the attract frame rate and spill glyphs far past the slot and off-canvas. It is self-inflicted and non-exploitable given no server, but it is a genuine "trusts persisted data more than it should" defect, and the slot literally advertises `rows: 5` — the render ignores that contract. Second, a confused *maintainer* angle: the comment at `render.ts:315` states the exact opposite of the code below it; a future reader trusting that comment could "fix" the ladder out, believing it was never supposed to be there. Lying comments cause real regressions. Third, a layout angle: `String(entry.score)` for a pathological 8-digit score, combined with a 3-char name right-aligned to `slot.x+slot.w`, could collide the two columns on a narrow canvas — but arcade is desktop-only, MC scores are ≤6 digits (DISPLAY 6 DIGITS), and `drawGlyphText` clips X to `[0,width)`, so worst case is visual overlap, never a crash. Fourth, an ordering angle: if `@shared/highscore` ever stopped returning descending order, the "best on top" claim breaks — but the ladder is a passive mirror of state (correct by the HUD-figure rule; re-sorting here would be the *violation*), and AC2 pins strictly-increasing rung Y against the seeded order. Fifth, a phase-pin angle: did pinning two sibling tests to `phase:'play'` silently weaken them? No — those probe phase-independent HUD/ICBM rendering; `play` removes attract-overlay noise, and the full 1297-test suite plus orchestrator stayed green. Nothing here rises to Critical/High; the loop cap and the comment are cheap, correct follow-ups.

**Handoff:** To SM for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): mc7-4 supersedes the mc6-5 AC3 "slot is a CONTAINER only" assertion, which is the inverse of this story's behaviour. Affects `plugins/missile-command/tests/mc6-5-attract-presentation.test.ts` (the assertion was retired in this RED — mc6-5's own comment anticipated it: "mc7-4 fills the slot"). No action needed by Dev; recorded so Reviewer expects the mc6-5 diff. *Found by TEA during test design.*
- **Improvement** (non-blocking): the attract slot band is not empty pre-ladder — the self-playing demo (mc6-4) paints a state-independent vector shape there. Affects `plugins/missile-command/src/shell/render.ts` (Dev should draw the ladder glyphs so they read against that background; the tests already isolate glyphs via `fillRect`). *Found by TEA during test design.*

### Dev (implementation)
- **Conflict** (non-blocking): two sibling render tests used a bare `createGame(1)` (which boots into `attract`, INITIAL_PHASE) as a PLAY-field proxy, so the new mid-field attract ladder collided with their "empty mid-field / high-score only in top band" assumptions. Affects `plugins/missile-command/tests/render-hud-layout.test.ts` and `tests/render-battle.test.ts` (pinned both to `phase: 'play'` — a context fix, no assertion weakened; the HUD and ICBMs draw every phase, only the attract overlay is suppressed). Reviewer: the correct phase for a HUD/ICBM render test is `play`, not the attract default. *Found by Dev during implementation.*
- **Question** (non-blocking): during attract the ladder is drawn ON TOP of the self-playing demo (ICBM trails, explosions), matching mc6-5's established overlay model — visually verified legible, but if the owner prefers the ROM's ALTERNATING attract sub-screens (demo screen ↔ high-score screen) that is a separate mc6/attract-composition story, not mc7-4. Affects `plugins/missile-command/src/shell/render.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking) — ✓ RESOLVED in this session (folded into the green commit, user-directed): stale/contradictory comment at `render.ts:314-315` updated to describe the post-mc7-4 behaviour. Confirmed by rule-checker #17/#24. *Found by Reviewer during code review.*
- **Improvement** (non-blocking) — ✓ RESOLVED in this session (folded into the green commit, user-directed): the ladder render is now `state.highScores.slice(0, slot.rows).forEach(...)` — caps the loop at the authentic five rungs, closing the unbounded-loop/DoS on tampered localStorage. Re-verified green (1297 mc pass, lint clean). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Retired the mc6-5 AC3 container-only lock**
  - Spec source: mc6-5-attract-presentation.test.ts, AC3 ("the slot is a CONTAINER only — drawFrame in attract does NOT paint the lower ladder rungs")
  - Spec text: "mc7-4 fills the slot; this story must not render the ladder entries"
  - Implementation: removed that single assertion; mc7-4's own suite now owns the slot region, and its AC1 swapped-lower-rungs test is the direct inverse
  - Rationale: mc7-4 renders the ladder into the slot — the two expectations are contradictory, so leaving both would make the suite ungreenable; mc6-5 explicitly deferred this to mc7-4
  - Severity: minor
  - Forward impact: none (mc6-5's other AC3 assertions — slot geometry, HIGH SCORES header — are unchanged and still green)
- **Ladder pixel coordinates are a display choice, not the ROM's absolute px**
  - Spec source: context-epic-mc7.md; W3COMN.MAC:163/165/169 (SCLDRV/SCLDRH/INTLV)
  - Spec text: absolute ladder screen coordinates SCLDRH=080, SCLDRV=0B0, INTLV=0C0
  - Implementation: tests pin the ladder region as `highScoreSlot(w,h)` and assert structure (inside-slot, best-first, both columns), not the ROM's absolute pixel coordinates
  - Rationale: the browser cabinet has no coin mechanism and a different aspect than the raster tube; mc6-5 already reserved the region under this same free-play/aspect deviation, and a node canvas cannot read drawn glyphs
  - Severity: minor
  - Forward impact: none (render-only, shell layout; no cited core constant, so no claim)

### Dev (implementation)
- **Pinned two sibling render tests to `phase: 'play'` to accommodate the attract ladder**
  - Spec source: TEA's mc7-4 tests (ladder drawn in `phase: 'attract'`); render-hud-layout.test.ts + render-battle.test.ts (used attract-default `createGame(1)`)
  - Spec text: mc7-4 renders the ladder "on the attract high-score screen"; the sibling tests assumed a bare mid-field with high-score glyphs only in the top band
  - Implementation: added `phase: 'play'` to `render-hud-layout` `field()` and to `render-battle`'s ICBM-scenario `bare`; no assertion changed
  - Rationale: `createGame` boots into `attract`, where mc7-4 now paints the mid-field ladder; those tests probe PLAY-context render (HUD readout, ICBM heads), so `play` is their correct phase and isolates them from the attract overlay without weakening any check
  - Severity: minor
  - Forward impact: none (HUD and ICBMs render identically in play; only the attract title/ladder/scroll overlay is suppressed, which those tests never intended to assert)
- **Ladder laid out at the HUD line pitch inside the slot, not the ROM's absolute px**
  - Spec source: W3COMN.MAC:163/165/169 (SCLDRV/SCLDRH/INTLV absolute coordinates)
  - Spec text: score ladder at SCLDRH=080/SCLDRV=0B0, initials ladder vertical INTLV=0C0
  - Implementation: rungs stacked from `slot.y` at the HUD `lineH` pitch; score left-aligned at `slot.x`, initials right-aligned to `slot.x + slot.w`
  - Rationale: mc6-5 already reserved the region as `highScoreSlot(w,h)` under the free-play/aspect deviation (browser cabinet ≠ raster tube geometry); TEA pinned structure, not absolute px
  - Severity: minor
  - Forward impact: none (visually verified legible and best-first; a future fidelity pass could tune exact placement against a cabinet screenshot)

### Reviewer (audit)
- **TEA: Retired the mc6-5 AC3 container-only lock** → ✓ ACCEPTED by Reviewer: mc6-5's own comment deferred the slot's contents to mc7-4; the retirement is replaced by AC1's inverse assertion and comment-analyzer/rule-checker confirmed the mc6-5 file's other AC3 assertions and its `DEFAULT_HIGH_SCORES` import remain live and green.
- **TEA: Ladder pixel coordinates are a display choice** → ✓ ACCEPTED by Reviewer: consistent with mc6-5's free-play/aspect deviation; structure is pinned, absolute px is not, and the live screenshot confirms an authentic two-column ladder.
- **Dev: Pinned two sibling render tests to `phase: 'play'`** → ✓ ACCEPTED by Reviewer: `play` is the correct phase for phase-independent HUD/ICBM probes; no assertion was weakened (rule-checker #13 re-scan clean), and the full suite + orchestrator stayed green.
- **Dev: Ladder laid out at the HUD line pitch inside the slot** → ✓ ACCEPTED by Reviewer: the same display latitude mc6-5 established; note the related non-blocking follow-up to cap the loop at `slot.rows` so >5 rows can never spill the region.