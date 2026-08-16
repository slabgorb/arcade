---
story_id: "pm5-4"
jira_key: "pm5-4"
epic: "pm5"
workflow: "tdd"
---
# Story pm5-4: Fix the bottom HUD band in shell/render.ts drawHud

## Story Details
- **ID:** pm5-4
- **Jira Key:** pm5-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** none
- **PR:** #463 (merged into develop)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T15:24:59Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T14:57:57Z | - | - |
| red | 2026-08-16T14:57:57Z | 2026-08-16T15:03:59Z | 6m 2s |
| green | 2026-08-16T15:03:59Z | 2026-08-16T15:07:59Z | 4m |
| review | 2026-08-16T15:07:59Z | 2026-08-16T15:24:59Z | 17m |
| finish | 2026-08-16T15:24:59Z | - | - |

## Tea Assessment

RED phase complete — failing tests written and confirmed RED against the current tree before handoff.

**Seam:** `plugins/pac-man/src/shell/render.ts` → `drawHud` (shell-render only; no core/sim, no ROM data). Tests added to the existing `plugins/pac-man/tests/shell/hud-icons.test.ts` (reuses its `fakeCtx` blit-recorder + `sameData` pixel-identity helper; no new file → no count-guard risk).

**Tests written (2, both RED):**
1. *reserve-life icon is the open-mouth Pac, not a closed disc* — identifies each life blit by pixel data and asserts it equals `drawPacman(...,'left',2)` (wide-open, sprite 44) and does NOT equal `drawPacman(...,'left',0)` (`PAC_CLOSED`, sprite 48 = the solid disc). RED because `drawHud:579` passes frame `0`.
2. *icons stay within rows 34-35, clear of the row-33 border wall* — asserts every `drawHud` blit has `y >= 272` and `y+h <= 288`. RED because the 16px icons inherit `drawPacman`/`drawFruit`'s −4px tile-centring offset → they land at **y=268**, 4px into row 33 (the bottom border wall). Evidence: the failure lists all 12 icons (5 lives + 7 fruit) at `y:268, bottom:284`.

**RED evidence:** `npx vitest run --project pac-man` → 2 failed | 401 passed. Both fail for the diagnosed reasons; no existing test regressed. The pm4-11 `inBottomBand` filter (hud-icons.test.ts:35-39) was deliberately loosened by a full sprite height to *tolerate* this exact overlap, which is why the bug shipped green — the new tests pin the strict band.

**AC coverage:** AC-1 (open frame) → test 1. AC-2 (no border-wall overlap, lives AND fruit) → test 2 (checks all HUD blits). AC-3 (no regression) → the 401 still-green existing tests (counts, caps, sequence, top band) stand as the regression guard.

**Handoff to Dev (Yoda):** the fix is contained to `drawHud`. (1) Change the life-icon frame arg from `0` to the wide-open left frame (`2` / `PAC_FRAMES.left[2]`, sprite 44). (2) Compensate the −4px actor offset for the HUD anchor so 16px icons fill rows 34-35 — apply to BOTH the life loop and the fruit row (`drawFruit(..., MAZE.rows-2, ...)`). Do NOT alter `drawPacman`/`drawFruit` themselves (the actor path is correct). Green = these 2 tests pass with the 401 still green.

**Deviations:** none new (the cap-to-5 lives is pm4-11's existing, already-logged deviation).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/pac-man/src/shell/render.ts` — `drawHud` only: (1) reserve-life icon now uses `LIFE_ICON_FRAME = 2` (wide-open left frame, sprite 44) instead of frame `0`/`PAC_CLOSED`; (2) both the life loop and the fruit row anchor drop by `ICON_DROP_PX = (SPRITE_PX - TILE_PX)/2` (+4px, expressed in tile units `/TILE_PX` for `drawFruit`) to cancel the actor tile-centring offset. `drawPacman`/`drawFruit` are unchanged (the in-maze actor and bonus-fruit paths depend on their existing centring).
- `plugins/pac-man/tests/shell/hud-icons.test.ts` — TEA's two RED tests (now GREEN).

**Tests:** 403/403 passing (pac-man project, GREEN). `tsc --noEmit` clean.
Pushed to `fix/pm5-4-hud-reserve-life-display`, merged via PR #463.

**AC accountability:**
| AC | Status | Evidence |
|----|--------|----------|
| AC-1 reserve-life is open-mouth Pac (sprite 44), not a closed disc | DONE | test "reserve-life icon is the open-mouth Pac" — life blit == `drawPacman(...,'left',2)`, != `PAC_CLOSED`. |
| AC-2 lives AND fruit sit in rows 34-35, no row-33 wall overlap | DONE | test "icons stay within rows 34-35" — all 12 blits (5 lives + 7 fruit) now at y∈[272,288]; was y=268. |
| AC-3 no regression (chomp anim, top band, fruit window/cap, LIFE_ICON_CAP) | DONE | the 401 pre-existing tests remain green; only `drawHud` touched. |

**Deviations:** none. Minimal change; no scope creep (the non-blocking loose-filter tightening is left as TEA's follow-up finding, not done here).

**Handoff:** To review (Obi-Wan / Reviewer).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
- **Improvement (non-blocking):** `hud-icons.test.ts`'s pm4-11 `inBottomBand` filter (`BOTTOM_BAND_MIN_Y = LOGICAL_H - 24`, further relaxed by `SPRITE_PX`) was slackened specifically to tolerate the −4px overlap that pm5-4 fixes. Once GREEN, that rationale is void — the loose filter could be tightened toward the strict band the pm5-4 tests now pin. Left for a follow-up to avoid churn in this fix.

### Dev (implementation)
- No upstream findings. The TEA diagnosis matched the code exactly; the fix was the minimal call-site change TEA described.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->
- No spec deviations (Reviewer): implementation matches the pm5-4 context ACs exactly.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 403/403 green, `tsc --noEmit` clean, no smells |
| 2 | reviewer-edge-hunter | Yes | findings | 1 (low) | confirmed 0, dismissed 0, deferred 1 (fruit tile↔pixel round-trip even-ness precondition — non-blocking) |
| 3 | reviewer-silent-failure-hunter | Yes | clean | none | N/A — pure canvas arithmetic, no error paths |
| 4 | reviewer-test-analyzer | Yes | findings | 2 notes | confirmed 0, dismissed 1 (lives=3-only, low), deferred 1 (open-frame reference derived through PAC_FRAMES); mutation-verified both tests are load-bearing |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — all comment claims verified against constants |
| 6 | reviewer-type-design | Yes | findings | 2 | confirmed 0, dismissed 1 (LIFE_ICON_FRAME bare number = house convention), deferred 1 (fractional tileY contract — same theme as #2) |
| 7 | reviewer-security | Yes | clean | none | N/A — no I/O, no user input, no sinks |
| 8 | reviewer-simplifier | Yes | clean | none | N/A — constants match file convention, fractional tile is minimal given drawFruit's contract |
| 9 | reviewer-rule-checker | Yes | findings | 1 (flake) | confirmed 0, dismissed 1 (review-time concurrency artifact — see Reviewer Assessment), deferred 0. 0 rule violations (34 rules / 46 instances). |

**All received:** Yes (9 returned, 4 with findings)
**Total findings:** 0 confirmed blocking, 3 dismissed (with rationale), 3 deferred (non-blocking follow-ups)

## Reviewer Assessment

**Verdict:** APPROVED

The pm5-4 fix is correct, minimal, and correctly scoped to `drawHud` (`plugins/pac-man/src/shell/render.ts`). It resolves both reported defects — the reserve-life icon now blits the wide-open left frame (sprite 44) instead of the closed-mouth disc, and the +4px `ICON_DROP_PX` anchor drop lands both the life and fruit icons squarely in HUD rows 34-35, clear of the row-33 border wall. `drawPacman`/`drawFruit` are untouched, so the in-maze actor and bonus-fruit paths are unaffected. Suite 403/403; `tsc --noEmit` clean; both new tests are **mutation-verified** load-bearing (each isolates its own defect, neither vacuous). I independently re-ran the pixel math (life & fruit both resolve to y=272 exactly) and confirmed it.

**[SEC] Security:** clean. reviewer-security and reviewer-silent-failure both confirmed no security surface — the diff is self-contained canvas arithmetic with no I/O, user input, or sensitive sink.

**[DOC] Documentation/comments:** clean. reviewer-comment-analyzer verified every new comment claim (sprite 44 identity, the −4px/+4px cancellation math, "row 33 = bottom border wall" consistent with the pm4-12 `isHudRow` comment) against the actual constants (TILE_PX=8, SPRITE_PX=16, MAZE.rows=36, LOGICAL_H=288). No stale comments; comments cite symbols, not rot-prone file:line refs.

**[RULE] Rule compliance:** 0 violations across the 30-check TypeScript checklist and arcade-specific rules (reviewer-rule-checker, 34 rules / 46 instances). Core/shell boundary respected (shell-only, no core edit, no clock read); "colours never invented" respected (geometry-only, no colour literal added); no pac-man comment-line-refs guard exists (joust-only). `LIFE_ICON_FRAME=2` is uncited-by-prose unlike the ROM-byte-cited CAP constants beside it, but this matches the file header's documented convention that PAC_FRAMES sprite-index picks are AUTHORED/uncited by design — a stylistic gap, not a rule violation.

**Dismissed — the reported ~2% test flake is a review-apparatus concurrency artifact, not a code defect.** reviewer-rule-checker observed 1 failure in ~51 full-project runs, symptom: the life-icon blit read back as the *closed* frame (i.e. code behaving as if `LIFE_ICON_FRAME===0`). During this parallel review, reviewer-test-analyzer was concurrently mutation-testing by reverting `render.ts` to frame `0` / offset `0` in the shared main tree — the exact transient state that produces this symptom. I verified: with the tree confirmed intact (`git diff HEAD` clean, `LIFE_ICON_FRAME = 2` present), **0 failures across 70 runs** (40 filtered + 30 full-project). The rule-checker also could not reproduce it in 40 isolated-file or 40 pre-diff baseline runs. Root cause = a sibling subagent's shared-tree mutation during review, consistent with the known hazard; the module-scoped `imageDataCache` is keyed by sprite/colour/flip and the recorded blit data is `.slice()`-copied, so it cannot produce this cross-file. Not attributable to the committed code.

**Deferred — 3 non-blocking maintainability follow-ups (do NOT block this 3pt fix):**
- **[TYPE][EDGE]** The fruit-row Y (`MAZE.rows - 2 + ICON_DROP_PX / TILE_PX` = tile 34.5) smuggles a pixel offset through `drawFruit`'s integer-tile-coordinate parameter. It computes exactly (y=272) at the current constants and every other `drawFruit` caller passes integer tiles, so there is no live bug — but it relies on an unguarded `(SPRITE_PX − TILE_PX)` even-ness precondition (`putImageData` truncates). A cleaner boundary (a pixel-offset param on `drawFruit`, or a one-line comment on the precondition) is disproportionate to this fix and would touch the shared bonus-fruit path TEA scoped as untouchable — hence deferred, not required.
- **[TEST]** The `OPEN_LIFE_DATA` reference is derived via `drawPacman(...,'left',2)`, i.e. through the same `PAC_FRAMES.left[2]` table `drawHud` reads, so it pins "drawHud uses frame index 2" but not "index 2 IS the wide-open sprite 44"; a future PAC_FRAMES reorder would pass silently. This matches the file's existing `fruitData()` convention; a harder pin (build from `SPRITES[44]`+flipX) would strengthen it. Non-blocking.

These three are worth a small groom-time follow-up (they cluster with the existing pm4-11 loose-filter finding), but none warrants a rework round on a correct, well-tested 3-point visual fix.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
### Reviewer
- **Improvement (non-blocking):** fold the three deferred items above (fruit tile↔pixel round-trip clarity/guard, open-frame test reference hardening, and the pre-existing pm4-11 loose-band filter) into one small HUD-render-hygiene follow-up if the team wants it. None blocks pm5-4.