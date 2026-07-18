---
story_id: "tp1-39"
jira_key: "tp1-39"
epic: "tp1"
workflow: "trivial"
---
# Story tp1-39: Warp-dive polish — drawWarp speed streaks ride the diving (expanded) spokes

## Story Details
- **ID:** tp1-39
- **Jira Key:** tp1-39
- **Epic:** tp1
- **Workflow:** trivial
- **Repos:** tempest
- **Type:** chore
- **Points:** 1
- **Branch:** chore/tp1-39-warp-streaks-diving-spokes

## Workflow Tracking
**Workflow:** trivial
**Phase:** approved
**Phase Started:** 2026-07-18T14:39:16Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T14:39:16Z | - | - |
| implement | 2026-07-18T14:39:16Z | - | - |

## Acceptance Criteria

1. `drawWarp`'s speed streaks are drawn along the DIVING tube's spokes — `warpDescentTube(s.tube, progress)` during descent, and `warpDiveTube(s.tube, warpProgress)` during the eye fly-in (`s.warp.flyIn > 0`), matching how render.ts:1063-1072 already selects the moving-eye well to draw the tube — NOT the static `s.tube`. As the dive progresses and the rim flies off, the streaks ride the EXPANDING spokes.

2. The Claw stays rim-anchored on the STATIC tube (tp1-38 invariant: `clawTransform(staticTube, ...)`). It must NOT begin to shrink or slide toward the vanishing point during the dive. Do not regress tp1-38 (geometry.claw-transform.test.ts must still pass).

3. Verification: if the streak endpoint geometry can be extracted as a pure helper, add/extend a unit test that it derives from the diving tube (differs from the static tube mid-dive). Otherwise the SM will confirm via an in-game screenshot of the dive. Do NOT gold-plate.

4. npm test -- citations stays green and `node tools/audit/reanchor-citations.mjs` reports 0 lost (render.ts is cited by audit findings — re-anchor after edits).

## Background

`drawWarp` (src/shell/render.ts, ~line 941) currently draws warp-dive speed streaks along `staticTube = s.tube` — the STATIC base well. But during the dive the well expands and the rim flies off; the render loop already computes that moving-eye view at render.ts ~1063-1072, where it selects `warpDiveTube(s.tube, warpProgress)` (during the post-descent eye FLY-IN, `s.warp.flyIn > 0`) or `warpDescentTube(s.tube, warpProgress)` (during descent) — both from `../core/geometry` (already imported into render.ts).

The streaks should ride THAT diving tube's spokes, not the static one. The CLAW, however, must STAY rim-anchored on the static tube — that is tp1-38's deliberate "camera-with-the-Claw" invariant; do NOT regress it.

**Key files:**
- src/shell/render.ts (drawWarp ~941; the diving-tube selection ~1063-1072; the drawWarp call ~1099)
- src/core/geometry.ts (warpDescentTube, warpDiveTube:317 — both pure)

**Related stories:** tp1-10, tp1-33, tp1-37, tp1-38 (WD-012/WD-018 territory)

## Delivery Findings

### Dev (implementation)

- **Change** (non-blocking, informational): `drawWarp` (src/shell/render.ts) gained a 4th
  parameter, `divingTube: Tube`. BEFORE: the streak loop iterated
  `staticTube.far`/`staticTube.near` (`staticTube = s.tube`, the static base well). AFTER:
  it iterates `divingTube.far`/`divingTube.near`, where `divingTube` is the exact `diveTube`
  variable render() already computes at ~1063-1073 (`warpDescentTube(s.tube, progress)`
  during descent, `warpDiveTube(s.tube, warpProgress)` during the eye fly-in) and uses to
  draw the tube/spikes themselves — so the streaks and the drawn well can never diverge
  frame-to-frame; there is no second, divergent progress/flyingIn computation inside
  `drawWarp`. The call site (render.ts ~1108) changed from `drawWarp(pctx, s, color)` to
  `drawWarp(pctx, s, color, diveTube)`.
- **Claw non-regression confirmed:** `staticTube = s.tube` is untouched, and
  `clawTransform(staticTube, s.player.lane)` still anchors the Claw to the STATIC well
  (tp1-38 invariant) — only the streak loop's tube source changed. `geometry.claw-transform.test.ts`
  (25/25) and both tp1-38 suites (`tests/core/tp1-38.warp-rim-flyoff.test.ts`,
  `tests/shell/tp1-38.warp-rim-flyoff-render.test.ts`, 27/27 combined) stay green.
- **Verification approach (AC-3):** did NOT extract a pure streak-segment helper — the
  streak math (`lerpP` over `far`/`near`, module-level `renderTime`) is shell-local and
  canvas-adjacent, and this repo's convention for pinning shell/render.ts wiring facts
  (tp1-10, tp1-38, render.claw, render.warp-dispatch) is a source-text regex test against
  `render.ts?raw`, not a runtime unit test of an extracted function — extracting a pure
  helper here would be new plumbing not asked for by any test and out of proportion to a
  1-pt polish. Instead added `tests/shell/tp1-39.warp-streaks-diving.test.ts` (5 tests, same
  `fnBody` idiom as the existing suites) pinning: (1) `drawWarp` takes a `divingTube: Tube`
  param, (2) the streak loop reads `divingTube.far`/`.near` and NOT `staticTube.far`/`.near`,
  (3) the Claw stays on `clawTransform(staticTube, …)` and NOT `divingTube`, (4) render()
  hands `drawWarp` the identical `diveTube` variable used for `drawTube(pctx, scene, …)`.
  This is real regression coverage (source-text, matching the repo's established idiom for
  shell code vitest cannot render to a live canvas), not the bare "no test, SM screenshots
  it" path — a cheap, convention-following middle ground.
- **Gate numbers:** full suite 146 files / 1692 tests passing (was 145/1687 before the new
  test file); `npm run build` clean (`tsc --noEmit && vite build`); `npm test -- citations`
  25/25 green; `node tools/audit/reanchor-citations.mjs` → 103 present in 4232ed4, 0 lost, 0
  skipped; `npm test -- tp1-38` 27/27; `npm test -- geometry.claw-transform` 25/25; `npm test
  -- tp1-39` 5/5 (new).

### SM / conductor (AC-3 in-game verification — attempted, not captured)

- **AC-3 visual confirmation ATTEMPTED but NOT captured — verification rests on the source-wiring test.** I served this checkout's tree on port 5273 (verified `lsof` cwd = `a-1/tempest`, on the tp1-39 branch) and drove the game via Playwright to try to reach a warp dive and screenshot the streaks on the expanding spokes. **A warp dive requires a WAVE CLEAR, and there is no debug/cheat key to trigger it** (grep of src/shell + main.ts found none). Three bounded attempts to clear level 1 via automated play (autofire+lane-sweep; immediate double-superzapper) all ended in GAME OVER — the flippers grab the Claw before the board clears, and automated blind play cannot reliably kill every lane's enemy in time. Per browser-automation discipline (stop after 2-3 attempts, don't rabbit-hole), I stopped. Evidence of the attempts (gameplay/gameover/initials screens — which incidentally re-confirmed tp1-20's HUD strings "ENTER YOUR INITIALS" / "TYPE A-Z — BACKSPACE FIXES — FIRE TO CONFIRM") is in scratchpad `tp1-39-evidence/`. No high-score entry was written (initials never confirmed). **AC-3 is therefore satisfied by Dev's source-wiring test** (`tests/shell/tp1-39.warp-streaks-diving.test.ts`, the repo's established `render.ts?raw` idiom — vitest has no live canvas): it pins that the streak loop now iterates `divingTube` (not `staticTube`), that the call site passes the same `diveTube` render() computes for the tube-draw, and that the Claw still anchors to the static tube. Combined with the independently-tested expansion of `warpDescentTube`/`warpDiveTube`, the streaks provably ride the expanding spokes. Reviewer: please rule on whether the wiring test satisfies AC-3's verification intent given the live screenshot proved infeasible without a dev shortcut or manual human play.

### Reviewer (code review)

- **Verdict: APPROVED.** AC-1/2/4 provably met; AC-3 wiring test ruled SUFFICIENT.
- **AC-1 (streaks ride the diving tube):** VERIFIED at the code level. `drawWarp`'s streak
  loop iterates `divingTube.far`/`.near` (render.ts:964-966); `divingTube` is the exact
  `diveTube` variable passed at the call site (render.ts:1110), which is the SAME object
  `scene.tube` is built from (render.ts:1096) and `drawTube` renders (render.ts:1101). No
  second/divergent progress or flyIn computation exists inside `drawWarp` — streaks and the
  drawn well reference one object, so they cannot diverge frame-to-frame.
- **AC-2 (Claw stays static):** VERIFIED. `staticTube = s.tube` (render.ts:955) and
  `clawTransform(staticTube, s.player.lane)` (render.ts:987) are untouched. tp1-38 27/27 and
  geometry.claw-transform 25/25 pass — no shrink/slide regression.
- **AC-3 ruling — the source-wiring test SATISFIES the verification intent.** Proven
  non-vacuous: replaying the test's own regexes against `origin/develop`'s `render.ts`, 4 of
  5 assertions FAIL on the old code (`divingTube.far` absent, `staticTube.far` present,
  `divingTube: Tube` param absent, `drawWarp(...,diveTube)` call absent) — it genuinely pins
  the change and reddens on revert, not a comment match. The swapped-to geometry is
  independently and thoroughly unit-tested: tp1-33 AC2 pins the far-ring expansion law and
  tp1-38 AC2 pins the near-ring expansion law. Composition (streaks iterate divingTube ⊕
  divingTube provably expands) proves the streaks ride the expanding spokes. Canvas cannot
  render in vitest's node env, the live screenshot was genuinely infeasible (no dev key to
  reach a warp dive; automated play died before wave clear — SM's 3 bounded attempts), and
  the `render.ts?raw` idiom is the repo's established seam (tp1-10, tp1-38, render.claw). The
  wiring test is the right tool and it is sufficient.
- **LOW (non-blocking):** the call-site assertion pins `drawTube(pctx, scene, …)` and
  `drawWarp(…, diveTube)` separately but not `scene.tube === diveTube` (render.ts:1096); a
  future refactor could point `scene.tube` at a different tube while leaving the drawWarp arg
  and silently diverge without reddening this test. Current code is correct. *Found by
  Reviewer during code review.*
- **Gates observed:** full suite 146 files / 1692 tests PASS; `npm run build` clean (exit 0);
  tp1-39 5/5; tp1-38 27/27; geometry.claw-transform 25/25; citations 25/25;
  reanchor-citations 103 present in 4232ed4, 0 lost, 0 skipped.

## Design Deviations

No design deviations — implemented exactly as specified (thread the render-loop's diving
tube into `drawWarp` rather than recomputing progress/flyingIn inside it). AC-3's fork
(extract-and-test vs. inline-and-screenshot) was resolved with a third, repo-idiomatic
option (source-text wiring test, no extracted helper) — documented above, not a deviation
from the AC's intent since the AC explicitly invites judgment on that point.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/shell/render.ts` - `drawWarp` gained a `divingTube: Tube` param; the streak loop now
  iterates `divingTube.far`/`.near` instead of `staticTube.far`/`.near`; the call site passes
  the render loop's existing `diveTube` variable. The Claw's `clawTransform(staticTube, …)`
  is unchanged (tp1-38 invariant preserved).
- `tests/shell/tp1-39.warp-streaks-diving.test.ts` - new source-text wiring test (5 cases,
  `fnBody`/`?raw` idiom matching tp1-10/tp1-38/render.claw suites) pinning the streak loop's
  tube source, the Claw's static anchor, and the render() call-site wiring.

**Tests:** 1692/1692 passing (146 test files; GREEN). Citations 25/25 green;
`reanchor-citations.mjs` 103 present at 4232ed4, 0 lost. `npm run build` clean.
**Branch:** chore/tp1-39-warp-streaks-diving-spokes (not pushed, per instructions)

**Handoff:** To next phase
