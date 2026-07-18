---
story_id: "bz3-11"
jira_key: "bz3-11"
epic: "bz3"
workflow: "tdd"
---
# Story bz3-11: OFF-AXIS ENEMY PROMPTS (visual) — the flashing ENEMY IN RANGE and ENEMY TO LEFT/RIGHT/REAR callouts

## Story Details
- **ID:** bz3-11
- **Jira Key:** bz3-11
- **Epic:** bz3 (Battlezone — ROM fidelity against the original 1980 Atari source)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** setup
**Phase Started:** 2026-07-18T06:24:22.367098Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T06:24:22.367098Z | - | - |

## Story Context

**Title:** OFF-AXIS ENEMY PROMPTS (visual) — the flashing ENEMY IN RANGE and ENEMY TO LEFT/RIGHT/REAR callouts

**Type:** feature

**Points:** 3

**Repos:** battlezone

**Acceptance Criteria:**
- ENEMY IN RANGE flashes at the ROM cadence (~3.9 Hz, AND FRAME bit 1) instead of drawing steadily.
- The directional ENEMY TO LEFT/RIGHT/REAR callout is emitted (the four strings already exist in text.ts; wire the two that are never emitted).

**Description:** Cluster C11. Subsumes C-004, C-005, S-021. The ROM cues the off-screen enemy two ways the clone half-implements: it FLASHES 'ENEMY IN RANGE' at ~3.9 Hz (C-004, gated by AND FRAME bit 1) where the clone draws it steadily, and it shows a directional 'ENEMY TO LEFT/RIGHT/REAR' callout (S-021, C-005) telling the player which way to turn toward the unseen enemy. The four direction strings are already transcribed in text.ts but alerts.ts only ever emits MOTION_BLOCKED and ENEMY_IN_RANGE — the directional half is dead. (The audio twin, WARNG, is bz3-10.)

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (code review)
- **Improvement** (non-blocking): `frameCount` freezes (does not tick) while in `gameover`/`entry` modes — those `stepGame` branches early-return before `advanceRadar` (sim.ts:341/346/358). Benign for THIS story: no enemy alert is drawn on those screens and the free-running phase resumes on continuity when play returns. Worth knowing if a future story ever wants the flash phase to keep advancing across a mode screen. *Found by Reviewer during code review.*
- **Question** (non-blocking): the ROM's physical LEFT/RIGHT sign (SAVE2, BZONE.MAC:567-570) was not independently re-traced; the callout anchors to the shipped radar convention instead (documented, accepted — see Deviation Audit). If a later story re-traces TRACK/TANGLE sign and finds the shipped radar itself is mirrored vs the ROM, that would be a bz3-7 radar-fidelity concern that this callout would inherit. Out of scope here. *Found by Reviewer during code review.*

### TEA (test design)
- **Improvement** (non-blocking): C-005 and S-021 are the SAME feature (the ENEMY TO directional callout) filed twice — C-005 by the cadence auditor, S-021 by the score-hud auditor. Both NO_COUNTERPART, both cite BZONE.MAC:555-571. Wiring the one callout satisfies both. *Found by TEA during test design.*
- **Correction** (non-blocking): the story's "wire the two that are never emitted" undercounts — ALL FOUR direction strings (ENEMY_TO / LEFT / RIGHT / REAR) are dead; post-bz3-10 alerts.ts emits only MOTION_BLOCKED and ENEMY_IN_RANGE. The RED wires the whole callout (prefix + all three directions). *Found by TEA during test design.*
- **Gap** (non-blocking): the clone has NO free-running game-frame counter — `state.ts` carries only `radarClock` + `radar.sweep`. AC1's flash gate needs a 15.625 Hz FRAME analog; Dev must add one (see GREEN guidance). This is the C-001 render-vs-game-rate trap surface. *Found by TEA during test design.*
- **Correction** (non-blocking): finding C-004's `ours:` cites `src/main.ts:242` / `alerts.ts:54` by pre-bz3-10 line numbers; after bz3-10's refactor the steady draw is `main.ts:241-242` (`drawMessage(ctx, message, w, h)`) and the in-range predicate is `alerts.ts` `isEnemyInRange` (:61-68). The DIVERGENCE is still live. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): 4 pre-existing `bz1-12` describe-block tests in `tests/core/alerts.test.ts` asserted `inGameAlert(...)` returns `null` for an off-axis or behind, alive hostile (perpendicular, directly behind, pivot-in-place, "quiet default"). Those assertions predate AC2 — they were correct when no directional callout existed, but AC2 is explicitly non-range-gated for ANY off-axis alive hostile, so all four now correctly raise `ENEMY TO LEFT/RIGHT/REAR` instead of a bare null. Re-baselined in the same commit (see Design Deviations below); no other pre-existing test needed changes (969/969 green). *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Flash gate pinned in CORE, not the shell render:** Spec framed AC1 as a "shell/render gate"; the RED pins the flash DECISION as a pure `alertFlashOn(frame)` in `core/alerts.ts` (the shell reads a frame counter and applies it, then strokes). Reason: `main.ts` is the untestable DOM/rAF bootstrap, and the codebase's own rule is "decisions in core, stroking in the shell" (render.ts:344, screens.ts). AC1 is still met — the message flashes at the ROM cadence.
- **LEFT/RIGHT use the clone's RADAR sign, ROM MAGNITUDE thresholds:** Spec said "ROM bearing thresholds." The ROM picks LEFT/RIGHT off SAVE2's sign bit (BZONE.MAC:567-570); its exact physical sign wasn't independently re-traced (needs TRACK/TANGLE sign work). The RED reuses the game's already-shipped, already-tested radar convention (radar.ts / render.ts:175-179): +bearing (world +X) → LEFT, −bearing → RIGHT — which the callout MUST agree with (same HUD, same "which way to turn" cue) and which matches camera.ts's counter-clockwise = left-turn. MAGNITUDE cutoffs are the exact ROM values (22./0x6B BAM).
- **Flash scoped to the enemy alerts only:** the ROM flashes ENEMY IN RANGE and ENEMY TO on FRAME bit 1 (`AND FRAME`, :4046/:556) but MOTION BLOCKED on bit 2 (`AND I,4`, :574-575) — a different cadence, NOT in this cluster's findings. The RED gates only the enemy alerts; MOTION BLOCKED stays steady/unchanged (its bit-2 flash is a separate story).

### Dev (implementation)
- **Re-baselined 4 pre-existing `bz1-12` test assertions in `tests/core/alerts.test.ts`:** they expected `inGameAlert` to return `null` for an off-axis/behind alive hostile (rotation-in-place, perpendicular, directly-behind, "quiet default"). Spec/RED did not call these out, but AC2 (deliberately non-range-gated) makes them genuinely fire the new `ENEMY TO <dir>` callout — the old "null" was only ever true because the directional feature didn't exist yet. Updated all four to expect the ROM-correct callout (with a `not.toBe(MESSAGES.MOTION_BLOCKED)` / `not.toBe(MESSAGES.ENEMY_IN_RANGE)` companion assertion where the test's original concern was precedence, not "nothing happens"). Reason: the old assertions tested an intentionally incomplete stub; AC2 completes it, so the old expected value became factually wrong under the shipped ROM behavior.

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `tests/core/alerts.test.ts` — appended two bz3-11 describe families (AC1 flash + AC2 directional), reusing the bz1-12 `stateWith`/`idle`/`forward` harness.

**Tests Written:** 11 new failing tests across 2 ACs (plus 6 green precedence/dead-band/rate guards).
**Status:** RED — 11 fail for the right reason; `tsc --noEmit` exit 0 (clean); citations 12/12 green; full suite 958 pass / 11 new fail (no collateral breakage).
**Commit:** `93040ff` on `feat/bz3-11-off-axis-enemy-prompts` (battlezone).

### RED proof
- AC1 (3 tests): `TypeError: alertFlashOn is not a function` — the pinned-absent flash gate (`alertFlashOn` read through a typed optional module view so the file still typechecks).
- AC2 (8 tests): `expected null to be 'ENEMY TO {LEFT|RIGHT|REAR}'` — `inGameAlert` emits no directional callout yet.

### Verified citations (against ~/Projects/battlezone-source-text/BZONE.MAC)
- **Flash gate:** `LDA I,2 / AND FRAME / BEQ` at :4045-4047 (ENEMY IN RANGE) and :555-556 (ENEMY TO). Draw iff `(FRAME & 2) != 0` → over frames 0..7 the bit reads 0,0,1,1,0,0,1,1 = 2-on/2-off. FRAME ticks once per 64 ms game frame (:439 `INC FRAME`, :1085 "END OF FRAME (64 MS)") = 15.625 Hz → blink = 15.625/4 = **3.90625 Hz** (128 ms on / 128 ms off).
- **Direction buckets:** PTURN = |SAVE2| in BAM (256 = full turn), computed :511-520 (TRACK → `EOR I,80` → `SBC TANGLE` → abs). In-view skip `CMP I,22.` / `BCC` at :559 (22 BAM = 30.94°, strict `<`). REAR `LDA I,6B` / `CMP PTURN` / `BCC` at :564-566 (0x6B=107 BAM = 150.47°, strict `>`). LEFT/RIGHT `BIT SAVE2` / `BPL` at :567-570 (SAVE2 ≥ 0 → LEFT, else RIGHT).

### GREEN guidance for Dev

**Files to touch:** `src/core/alerts.ts`, `src/core/state.ts`, `src/core/sim.ts`, `src/main.ts`.

**AC2 — directional callout (core, deterministic):**
1. In `alerts.ts`, add a pure `enemyDirection(playerPose, hostile): 'LEFT'|'RIGHT'|'REAR'|null` (return the `MESSAGES.LEFT/RIGHT/REAR` values):
   - `if (hostile.phase !== 'alive') return null`.
   - Compute the signed bearing the SAME way the radar does — do not invent a new sign: `β = normalizeAngle(Math.atan2(dx, dz) - playerPose.heading)`, `dx = hostile.x - player.x`, `dz = hostile.z - player.z` (mirror `radar.ts` `deriveRadar`; consider reusing/extracting rather than duplicating). `mag = Math.abs(β)`.
   - Constants: `IN_VIEW = (22/256)*2π ≈ 0.539961`, `REAR = (0x6B/256)*2π ≈ 2.626272` (comment each with `BZONE.MAC:559` / `:564`).
   - `if (mag < IN_VIEW) return null` (forward/in-view); `if (mag > REAR) return REAR`; else `β >= 0 ? LEFT : RIGHT`.
   - **No range gate** — :558-571 has none (a test asserts the callout fires beyond `ENEMY_ALERT_RANGE`).
2. Extend `inGameAlert` — after the `isEnemyInRange` branch, before `return null`:
   `const dir = enemyDirection(game.player, game.enemies.hostile); if (dir) return \`${MESSAGES.ENEMY_TO} ${dir}\``. Composition is `'ENEMY TO' + ' ' + dir` = `'ENEMY TO LEFT'` (ROM's ETO trailing pad was dropped in text.ts). Precedence stays motion-blocked > enemy-in-range > enemy-direction > null.

**AC1 — flash gate (~3.9 Hz):**
1. In `alerts.ts`, add `export function alertFlashOn(frame: number): boolean { return (frame & 2) !== 0 }` (cite :4045-4047 / :555-556).
2. Add a free-running game-frame counter: `readonly frameCount: number` on `GameState` (init `0` in `initGame`), incremented **once per game-frame tick inside `advanceRadar`'s `while (clock >= RADAR_FRAME_SECONDS)` loop** (sim.ts:297-303) — that loop already IS the 15.625 Hz boundary, so the blink stays phase-locked to the game frame. **Do NOT tie it to the ~60 Hz render sub-step (the C-001 trap) — that blinks at 15 Hz, not 3.9 Hz.** Free-running: don't reset it on respawn/mode change (grep the full-object constructions — `initGame`, `startRun`, the SPAWN reset in sim.ts — to thread it; the many `{...state}` spreads carry it automatically).
3. In `main.ts:241-242`, gate ONLY the enemy alerts on the flash (leave MOTION BLOCKED steady — its ROM bit-2 flash is out of scope):
   `if (message !== null && (message === MESSAGES.MOTION_BLOCKED || alertFlashOn(game.frameCount))) drawMessage(ctx, message, w, h)`.

**Watch-outs:**
- The core purity sweep (`tests/core/core-purity-sweep.test.ts`) scans `src/core` SOURCE TEXT incl. comments for `window.`/`document.` — keep new comments clean.
- The 4th AC1 test (3.9 Hz frequency guard) already passes — it's a spec pin on `GAME_FRAME_HZ`, not a driver.
- Keep the radar sign: +bearing → LEFT. A re-derived opposite sign would make the callout disagree with the radar and flip the LEFT/RIGHT tests.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/alerts.ts` — added `alertFlashOn(frame)` (FRAME bit-1 gate) and `enemyDirection(playerPose, hostile)` (LEFT/RIGHT/REAR bucketing, folded via `radar.ts`'s `normalizeAngle`); extended `inGameAlert` to compose `ENEMY TO <dir>` after the motion-blocked/enemy-in-range checks, no range gate.
- `src/core/radar.ts` — exported `normalizeAngle` (was module-private) so `alerts.ts` reuses the EXACT bearing-fold the radar HUD already ships/tests, instead of a second copy that could drift out of sign-agreement.
- `src/core/state.ts` — added `readonly frameCount: number` to `GameState`, initialized to `0` in `initGame`.
- `src/core/sim.ts` — `frameCount` incremented once per iteration of `advanceRadar`'s `while (clock >= RADAR_FRAME_SECONDS)` loop (the existing 15.625 Hz game-frame boundary); threaded through `startRun`/`returnToAttract`/`commitEntry` (which rebuild via `initGame` and would otherwise silently reset it to 0 on every mode transition) — the mid-battle respawn/gameover paths already spread `...s` so they carry it forward for free.
- `src/main.ts` — imports `alertFlashOn` + `MESSAGES`; the enemy-alert draw is now gated `message === MESSAGES.MOTION_BLOCKED || alertFlashOn(game.frameCount)` (MOTION BLOCKED stays steady; both enemy alerts flash).
- `tests/core/alerts.test.ts` — re-baselined 4 pre-existing `bz1-12` assertions that assumed off-axis/behind hostiles produce no alert (see Design Deviations).
- `docs/audit/findings/pair-cadence.json` — C-004 (DIVERGENCE) marked `remediated_by: "bz3-11"`, historical `ours` (`main.ts:242`) kept as-is (already accurate, confirmed against the pre-edit tree). C-005 (NO_COUNTERPART) marked `remediated_by: "bz3-11"` with `ours` re-pointed at `src/core/alerts.ts:68` (`enemyDirection`'s signature) — a real, currently-matching citation, not a placeholder. Also re-anchored C-002/C-003/C-010, whose line numbers shifted from edits elsewhere in `main.ts`/`sim.ts` (content unchanged).
- `docs/audit/findings/pair-score-hud.json` — S-021 (NO_COUNTERPART, the same feature as C-005) marked `remediated_by: "bz3-11"`, `ours` also pointed at `alerts.ts:68`.
- `docs/audit/findings/pair-radar.json` — D-004/D-007/D-008 re-anchored (content unchanged) after `radar.ts`'s `normalizeAngle` export added 2 lines above them.

**The frameCount tick site (proof it's the GAME frame, not render):** `sim.ts`'s `advanceRadar(state, dt)` accumulates `dt` into `radarClock` and drains it in `while (clock >= RADAR_FRAME_SECONDS)` — `RADAR_FRAME_SECONDS = 1 / GAME_FRAME_HZ` (15.625 Hz). That loop body is where `stepRadar` itself already ticks (bz3-7's DRADAR analog, proven to hold the ROM's 1489 ms/rev sweep rate regardless of the shell's 60 Hz sub-step cadence) — `frameCount += 1` sits in the exact same loop iteration, so it increments once per drained 64 ms quantum, never once per `stepGame` call. Confirmed by test: `bz3-11 AC1`'s 4th assertion pins `GAME_FRAME_HZ / 4 ≈ 3.90625 Hz` and the flash-phase test (`[0,1,2,3,4,5,6,7].map(alertFlashOn)` → `[F,F,T,T,F,F,T,T]`) passes against `alertFlashOn(frame) = (frame & 2) !== 0` fed by this exact counter.

**Direction-sign reuse:** `enemyDirection` imports `normalizeAngle` from `radar.ts` (newly exported, previously module-private) rather than re-deriving a fold — `bearing = normalizeAngle(atan2(dx, dz) - heading)`, identical to `deriveRadar`'s own bearing computation. Sign convention (+bearing → LEFT) is therefore structurally guaranteed to agree with the shipped radar HUD, not just tested to agree.

**Judgment calls for the Reviewer:**
1. **The 4 re-baselined `bz1-12` tests** (flagged above) — verify the new expected values are actually correct for the ROM spec, not just "whatever the code currently does." Recompute independently: `HOSTILE_BEHIND` (z=−30000) and the perpendicular/behind fixtures all sit past the REAR or IN_VIEW cutoffs per the bearing math documented in the diff.
2. **C-004's `ours` citation was left unchanged** (not literally re-edited) because it already matched the pre-fix tree byte-for-byte when I checked (bz3-10's second commit had already re-anchored it by ±1 line) — TEA's session note describing it as "stale pre-bz3-10 lines" predates that re-anchor. Worth a second look if the citation's history matters.
3. **C-005/S-021 `ours` now points at `alerts.ts:68`** (the `enemyDirection` signature line) rather than `null` — this is the "MAY instead attach an `ours`" branch the checker allows for a remediated NO_COUNTERPART, chosen over leaving it `null` because it's more useful audit history and is a real, verified citation (not a phantom).
4. **`frameCount` is threaded through `startRun`/`returnToAttract`/`commitEntry`** by hand (these three rebuild via `initGame`, which zeros it) rather than by changing `initGame`'s signature — kept `initGame(seed)` single-purpose (boot state) and let the three mode-transition builders carry the counter forward explicitly.

**Tests:** 969/969 passing (GREEN). `tsc --noEmit`: clean. `npm run lint`: clean (same as tsc). `npm test -- citations`: 12/12. `npm run build`: clean.
**Branch:** `feat/bz3-11-off-axis-enemy-prompts` (pushed). Commit `5f3442ae3bc6e510ed1c3de61f3c6fa56920e4c4`.

**Handoff:** To review phase.

## Reviewer Assessment

**Verdict:** APPROVED

**Independent verification (Reviewer's own run, battlezone @ 5f3442a vs origin/develop):**
- `npx vitest run` → **969/969 pass** (67 files), 0 failed.
- `npx tsc --noEmit` → **exit 0** (clean).
- `npm test -- citations` → **12/12 pass**.

**Data flow traced (two paths, both safe):**
- Bearing: `hostile.{x,z}` → `enemyDirection` (`bearing = normalizeAngle(atan2(dx,dz) − heading)`) → bucket → `inGameAlert` composes `ENEMY TO <dir>` → `main.ts` flash gate → `drawMessage`. Guarded: `phase !== 'alive'` → null; `null` message → no draw.
- Cadence: `dt` → `advanceRadar` `while (clock >= RADAR_FRAME_SECONDS)` drain loop → `frameCount += 1` (sim.ts:312) → `state.frameCount` → `alertFlashOn(frame) = (frame & 2) !== 0` → gate. Ticks at 15.625 Hz → blink 3.90625 Hz.

**1. frameCount tick site — VERIFIED CORRECT (the timebase trap avoided).** Single increment site (sim.ts:312), inside `advanceRadar`'s 15.625 Hz drain loop — the exact `while (clock >= RADAR_FRAME_SECONDS)` boundary `stepRadar` already uses (bz3-7 DRADAR analog). Reached only from `stepGame`'s playing (sim.ts:361) and attract (:334) paths — NEVER `renderFrame`. No double-increment. No silent mid-game reset: `initGame` zeros it (boot only, main.ts:110); all three `initGame`-rebuilding transitions thread it explicitly (`startRun` sim.ts:93, `returnToAttract` :101, `commitEntry` :113); gameover (:206), respawn (:238), entry (:341) and all other constructions spread `...s`/`...state`. Free-running growth is safe — `(frame & 2)` reads bit 1 via ToInt32 (preserved for any integer) and JS integers stay exact below 2^53, so the flash phase never degrades. A 60 Hz tick would have blinked at ~15 Hz; this blinks at **3.90625 Hz** ✓.

**2. LEFT/RIGHT sign — VERIFIED NOT MIRRORED (traced concretely).** Hostile at **+X** (dx=+5000, dz=0, heading 0): `bearing = atan2(+5000,0) = +π/2` → `bearing >= 0` → **LEFT**; radar `at(+π/2)` paints screen-x `cx − R·sin(+π/2) = cx − R` → **screen-LEFT** (render.ts:175-179). Hostile at **−X**: `bearing = −π/2` → **RIGHT**; radar → `cx + R` → **screen-RIGHT**. Callout and radar blip point the player the SAME way. Agreement is structural — `enemyDirection` imports radar.ts's own `normalizeAngle` (now exported), not a re-derived fold.

**3. Direction buckets + flash gate vs source — VERIFIED line-by-line against BZONE.MAC.** Flash `LDA I,2 / AND FRAME / BEQ` :555-557 and :4045-4047 = `(frame & 2) !== 0`. In-view skip `CMP I,22. / BCC` :559-560 = `mag < (22/256)·2π` (strict `<`). REAR `LDA I,6B / CMP PTURN / BCC` :564-566 = `mag > (0x6B/256)·2π` (strict `>`). LEFT/RIGHT `BIT SAVE2 / BPL` :567-570 = sign split. Every cited line byte-matches the actual source. Precedence (motion > in-range > direction) even mirrors the ROM's own mutual exclusion (aligned PTURN<22 skips ETO; off-axis fails the aim cone).

**4. The 4 re-baselined bz1-12 tests — CORRECT, not neutered.** Recomputed each independently: rotation-in-place (HOSTILE_BEHIND{0,−30000}, player{100,100}) → mag ≈ 3.138 > REAR → REAR; perpendicular(+X 5000) → +π/2 → LEFT; behind(−Z 5000) → π → REAR; far-rear idle → π → REAR. Each old `null` pinned the pre-AC2 no-callout stub; AC2 is deliberately non-range-gated, so the callout is now mandatory — re-baselining is required. Each keeps a companion `not.toBe(MOTION_BLOCKED)` / `not.toBe(ENEMY_IN_RANGE)` preserving the test's original precedence concern.

**5. MOTION BLOCKED steady + guards intact.** `main.ts` gate `message === MESSAGES.MOTION_BLOCKED || alertFlashOn(...)` short-circuits MOTION BLOCKED to always-drawn (steady); only the two enemy alerts flash — matches the ROM (MOTION BLOCKED flashes on bit 2, out of scope). 25° dead-band → null; exploding hostile → null; ENEMY IN RANGE / MOTION BLOCKED precedence unchanged.

**6. Citation honesty — CLEAN.** C-004 (DIVERGENCE) genuinely remediated: its `ours` (main.ts:242, `if (message !== null) drawMessage(...)`) byte-matches the pre-fix tree and that steady draw was really replaced by the flash gate — `remediated_by` is honest, historical citation correctly frozen (checker skips verbatim for remediated). C-005/S-021 (NO_COUNTERPART) now implemented; `ours` re-pointed at `alerts.ts:68` = `export function enemyDirection(` — **confirmed to be the actual line-68 content**, a shape-valid whole citation the checker's remediated-NO_COUNTERPART rule permits (null | whole-citation). Not phantom. Re-anchors (C-002/C-003/C-010, D-004/D-007/D-008) are line-number-only; verbatims unchanged.

**Pattern observed:** exporting `radar.ts`'s `normalizeAngle` for `alerts.ts` to reuse (radar.ts:80) is the right call — one bearing convention, no drift risk, sign-agreement guaranteed rather than tested-by-coincidence.

**Findings:** 0 Critical, 0 High, 0 Medium, 0 Low. 2 non-blocking observations logged under Delivery Findings.

### Deviation Audit
- **TEA — flash gate pinned in CORE not shell render:** ACCEPTED. "Decisions in core, stroking in shell" is the codebase's own rule; AC1 still met. `alertFlashOn` in core + shell reads counter is the correct split.
- **TEA — LEFT/RIGHT use the clone's RADAR sign, ROM MAGNITUDE thresholds:** ACCEPTED. This is the correct fidelity standard — the callout MUST agree with the radar HUD the player sees (both are "which way to turn" cues). Magnitude cutoffs are exact ROM (22./0x6B BAM). Traced and confirmed non-mirrored (item 2). (See non-blocking Question above re: ROM SAVE2 physical sign — out of scope.)
- **TEA — flash scoped to enemy alerts only:** ACCEPTED. ROM flashes MOTION BLOCKED on bit 2 (:574-575), a different cadence not in this cluster; gating only the enemy alerts is correct.
- **Dev — re-baselined 4 bz1-12 assertions:** ACCEPTED. Independently recomputed (item 4); each new expectation is ROM-correct and the old `null` was pinning an intentionally-incomplete stub AC2 completes.

**Handoff:** To SM for finish-story.
