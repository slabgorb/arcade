---
story_id: "df8-2"
jira_key: "df8-2"
epic: "df8"
workflow: "tdd"
---
# Story df8-2: Remove invented effect chrome (screen wash + spark ring)

## Story Details
- **ID:** df8-2 (covers the df8-3 spark-ring removal too)
- **Jira Key:** df8-2
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** fix/df8-2-remove-effect-chrome
- **PR:** (none yet - recorded when the PR is created)
- **Stack Parent:** none

## Background

Playtest 2026-08-20: a dense red/green dot field covers the playfield during play.
Root cause: `plugins/defender/src/core/scene.ts` `drawScreenWash` — the pt1-25
"ADR-0005 anti-strobe" substitute — paints a stride-3 lattice up to index 3 over the
whole field for every SCREEN effect (CRAM: 2=RED, 3=GREEN). The owner is NOT
photosensitive (corrected 2026-08-21), so the anti-strobe rationale is void; the wash
and the df4-6 `drawRing` spark diamond are both non-ROM invention and are removed.
(The ROM's real white-strobe is NOT being added back — the substitute simply goes.)

## TEA Assessment

**Tests Required:** Yes
**Reason:** Behavior change in the pure render path — the removals must be pinned or
they silently return.

**Test Files:**
- `plugins/defender/tests/df8-2-no-effect-chrome.test.ts` — 5 diff-against-control
  tests pinning: a SCREEN effect (player-death / smart-bomb / hyperspace) paints
  NOTHING (frame byte-identical to a screen-effect-stripped control); a LOCALIZED
  appear/explode effect paints ONLY inside its sprite cell (zero pixels outside —
  the drawRing diamond currently lands 12 outside).

**Tests Written:** 5 tests covering both removals (wash ×3 events, ring ×2 kinds)
**Status:** RED (failing — ready for Dev). Verified against current scene.ts:
wash tests fail with ~7,717–7,721 painted cells at palette index 3; ring tests fail
with 12 pixels outside the sprite cell. Rest of the defender project: 1196 pass.
Commit: `123c934e` (test-only). `npm run lint` clean.

**Handoff:** To Dev for implementation — see `.session/df8-2-handoff-red.md` for the
full inventory of existing assertions to invert/delete and the scene.ts deletion list.

## Design Deviations

### TEA (test design)

- **Green-guard tests-fail gate — N/A pattern avoided:** this is a genuine removal
  story, so a real RED exists (the chrome is still drawn); no mutation-as-RED needed.
- **Appear-effect non-vacuity reads composed content, not the diff:** spec-level
  contract is "localized effect draws ONLY its sprite", but a materialize effect
  overdraws its own live lander pixel-for-pixel, so post-fix its diff is legally
  empty. The non-vacuity guard therefore asserts sprite pixels exist IN the composed
  cell rather than demanding a non-empty diff. Reason: a diff-based guard would force
  Dev to keep some invented paint.

## Delivery Findings

### TEA (test design)

- **Gap** (non-blocking): `df4-6-visual-playtest.test.ts` "composeFrame RENDERS the
  appear effect" (~line 205) passes today ONLY because of the ring — the appear blit
  overdraws the live lander exactly. Affects `plugins/defender/tests/df4-6-visual-playtest.test.ts`
  (Dev must delete/invert it — the df8-2 appear test replaces its coverage). *Found by
  TEA during test design.*
- **Improvement** (non-blocking): once `drawRing`/`drawScreenWash` go, `spriteColour`
  in scene.ts keeps its `drawScanner` caller — keep it. `effectPhase`, `APPEAR_HI/LO`,
  `EXPLODE_LO/HI` become dead once both consumers go — delete them with the chrome.
  Affects `plugins/defender/src/core/scene.ts`. *Found by TEA during test design.*

### Dev (implementation)

- **Stale wash comments remain in sim.ts/effects.ts** (non-blocking): `sim.ts:628`
  ("the ADR-0005 smart-bomb wash") and `effects.ts:138,306` ("renders as the
  full-frame ADR-0005 safe wash") still describe the removed paint. Affects
  `plugins/defender/src/core/sim.ts` and `plugins/defender/src/core/effects.ts`
  (comment-only rewrites: the screen effect renders nothing since df8-2). Left
  untouched because the story explicitly forbids touching those files — the wiring
  they sit on is unchanged and correct; only their "what it renders as" clauses are
  stale. Outside the review diff. *Found by Dev during implementation.*

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/defender/src/core/scene.ts` - deleted drawScreenWash + drawRing + effectPhase
  + SCREEN_WASH_PEAK/STEP + EFFECT_RING_MIN/GROW + APPEAR_HI/LO + EXPLODE_LO/HI; drawEffect
  is now bare-return for non-raster (screen) effects and blit-only for localized ones;
  rewrote the pt1-25/df4-6 comment blocks and drawEffect's doc comment for the df8-2
  contract (owner-not-photosensitive correction). spriteColour kept (drawScanner).
- `plugins/defender/tests/pt1-25-death-power-effects.test.ts` - deleted the
  'smart-bomb screen effect is drawn and is bounded' it, orphaned WASH_MAX_INDEX, and
  the now-unused composeFrame/LOGICAL_* imports; sim-level pt1-25 tests untouched.
- `plugins/defender/tests/df4-6-visual-playtest.test.ts` - deleted the
  'composeFrame RENDERS the appear effect' digest test (passed only via the ring);
  explode render tests untouched.

**Tests:** 1199/1199 passing (GREEN) — the 5 df8-2 tests pass; 1201 pre-story tests
minus the 2 deleted chrome-demanding tests. df6-1 cue fingerprint green (sim.ts
untouched). `npm run lint` clean.
**Branch:** fix/df8-2-remove-effect-chrome (pushed, commit 8289f69d)

**Handoff:** To review

## Reviewer Assessment

**Verdict:** APPROVED
**Data flow traced:** smartBomb input → stepSim → `_effectBank.spawnScreen('smart-bomb')` (sim.ts:628-630) → effect bank carries a pictureless kind:'explode' record that rides the EXPLODE size decay and self-retires via `step()` (effects.ts:139-141) → composeFrame → drawEffect classifies non-raster → bare `return` (scene.ts:170-172); safe because the lifecycle (spawn/age/retire) never depended on the composer, which was always pure/stateless — an effect that paints nothing still ages out.
**Pattern observed:** diff-against-control through pure composeFrame with double non-vacuity guards (live effect in bank + `classify()` branch assertion) at df8-2-no-effect-chrome.test.ts:101-125 — the established pt1-24/25/27 isolation idiom, correctly inverted.
**Error handling:** localized branch keeps its picture guard and off-window cull (scene.ts:173-175); `spriteColour`'s all-transparent fallback kept for its surviving drawScanner caller (scene.ts:323).

**Observations (verified good):**
1. Removal complete — tree-wide grep: zero code references survive to drawScreenWash, drawRing, effectPhase, SCREEN_WASH_PEAK/STEP, EFFECT_RING_MIN/GROW, APPEAR_HI/LO, EXPLODE_LO/HI (only historical narrative in the new test header, matching repo convention). drawEffect: non-raster → bare return; localized → guard → projectWorldX → blitObject only.
2. Diff confined to scene.ts + 2 modified test files + 1 new test file; sim.ts/effects.ts untouched; df6-1 frozen cue fingerprint (df6-1-audio-events.test.ts:166) green — sim behaviorally identical. `noUnusedLocals` on + tsc clean proves no orphaned helpers/imports after the test deletions.
3. Mutation probe (reviewer-run): restoring origin/develop's scene.ts reddens ALL 5 df8-2 tests (3 wash, 2 ring — appear at 12 out-of-cell diamond pixels); tree restored clean. RED commit 123c934e adds only the test file.
4. pt1-25 deletion justified: only the wash-demanding render test went (its core assertion was changed>0 — impossible now); sim-level spawn/tag tests kept; the inverted contract (changed==0) is strictly stronger in the df8-2 suite.
5. df4-6 deletion justified, verified from source: the appear effect blits the SAME `LNDP1` picture (sim.ts:75, spawnAppear at sim.ts:489) at the live lander's exact x/y through the same projectWorldX+blitObject as the enemy draw (scene.ts:605-610) — pixel-perfect overdraw, so the deleted digest test had ring-only signal. The surviving explosion digest test still pins that a localized effect's sprite reaches the frame.
6. Verification: defender vitest 94 files / 1199 tests green; `npm run lint` (tsc --noEmit) clean.

**Findings (non-blocking):**
| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] | Stale "spark" in kept fallback comment ("still gets a visible spark") — in-scope file; caller is now drawScanner's blip | plugins/defender/src/core/scene.ts:150 | comment-only: "spark" → "blip" |
| [MEDIUM] | Stale wash clauses describe removed paint as current ("ADR-0005 smart-bomb wash / seizure-safe substitute"; "a bounded fade/freeze wash"; "a full-frame ADR-0005 safe wash") | plugins/defender/src/core/sim.ts:628-629; effects.ts:137-138, 305-306 | comment-only rewrites; safe (no defender comment guard scans these — verified; behavior untouched) |
| [LOW] | ADR-0005 still "Status: Accepted" with "The owner has photosensitive epilepsy" while scene.ts now asserts the 2026-08-21 correction — repo contradicts itself | docs/adr/0005-photosensitivity-accessibility-exception.md | amend the ADR before any story relies on the correction to ADD flash/strobe (df8-4's description still quotes the strobe rule) |

**Deviation audit:** TEA's two deviations (real-RED exists, so no mutation-as-RED needed; appear non-vacuity via composed-cell content rather than diff) — both ACCEPTED: the composed-content guard is the only non-vacuous option once perfect overdraw makes the diff legally empty, and forcing a diff would force kept invented paint. No undocumented deviations found.

**Handoff:** To SM for finish-story (df8-3 folded in per task — SM to mark at finish)

## Delivery Findings (continued)

### Reviewer (code review)
- **Conflict** (non-blocking): scene.ts's rewritten comment asserts "the owner is NOT photosensitive (corrected 2026-08-21)" but `docs/adr/0005-photosensitivity-accessibility-exception.md` is unamended (Status: Accepted, "The owner has photosensitive epilepsy"). Affects `docs/adr/0005-...md` (amend to record the correction and re-scope or retire the exception). Safe for THIS story either way — it only removes flashing paint — but must be resolved before any story ADDS strobe content on the strength of the correction. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the sim.ts:628-629 / effects.ts:137-138,305-306 stale wash clauses plus scene.ts:150 "spark" should be fixed together in one comment-only touch; defender has no comment-scanning guard over these files (verified), so the edit is zero-risk. *Found by Reviewer during code review.*
