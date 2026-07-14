---
story_id: "tp1-13"
jira_key: "tp1-13"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-13: AUDIO WIRING GAPS — the missing warp phase, the bonus chime, the bolt-collision cue, and the invented kzap

## Story Details
- **ID:** tp1-13
- **Jira Key:** tp1-13
- **Workflow:** tdd
- **Stack Parent:** tp1-2 (done)
- **Branch Strategy:** gitflow (fix/tp1-13-audio-wiring-gaps)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-14T21:55:11Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-14T20:43:18Z | 2026-07-14T20:46:34Z | 3m 16s |
| red | 2026-07-14T20:46:34Z | 2026-07-14T21:19:11Z | 32m 37s |
| green | 2026-07-14T21:19:11Z | 2026-07-14T21:47:18Z | 28m 7s |
| review | 2026-07-14T21:47:18Z | 2026-07-14T21:55:11Z | 7m 53s |
| finish | 2026-07-14T21:55:11Z | - | - |

## Story Context

**Type:** bug
**Points:** 4
**Priority:** p1
**Repos:** tempest

### Acceptance Criteria

1. The warp dive's second phase has its sound, reusing tp1-2's corrected T3 bytes.
2. The special-score chime fires on the end-of-wave bonus (the sample is already correct — only the trigger is missing).
3. Bullet-on-bolt collisions get their sound AND their explosion.
4. kzap.wav is DELETED. It has no basis anywhere in ALSOUN's 13-sound table — it was invented.
5. Depends on tp1-2.
6. npm test -- citations stays green.

### Technical Approach (from tp1-2 archive)

**T3 Sound Reuse:**
- tp1-2 landed the displaced T3 record ($cc81, ALSOUN slot "T3 ;THRUST IN SPACE") as a new baked cue named `thrust_space` in tempest/tools/pokey-bake/sfx-data.mjs.
- It is DELIBERATELY unwired: no GameEvent plays it and it is NOT in audio.ts's SOUNDS manifest (the manifest is fetched on engine resume, so an unplayed cue would fetch a file for no reason).
- This story adds the SOUNDS entry and the wiring to the warp dive's second phase together.

**R2 Hosting Caveat:**
- The .wav files are gitignored and served from arcade-assets.slabgorb.com/tempest/sfx/ (R2 bucket named plain `arcade`).
- Wiring `thrust_space` into SOUNDS means the file must actually exist in the bucket or the game fetches a 404 at runtime.
- Verify thrust_space.wav was uploaded during tp1-2's release; if not, the delivery step is: bake with `node tools/pokey-bake/bake-sfx.mjs <outdir>`, then `wrangler r2 object put arcade/tempest/sfx/thrust_space.wav --file=<path> --remote` (--remote flag required).

**Citation Gate Traps:**
- Several audit findings pin line numbers in sfx-data.mjs and audio.ts. ANY edit in those files — even comment-only — shifts pinned lines and breaks `npm test -- citations` (AC-6).
- Re-anchor citations after edits; only use `remediated_by` for defects this story actually removes (S-011, S-013, S-014, S-015 are the candidates), never for re-pointed citations.

**Related but Out of Scope:**
- `countdown_beep.wav` is baked from $cc69 (SL ;SLAM — the tilt siren), not a countdown. Known, inert, documented in the POKEY map. Do not touch it.

**Test Authority:**
- The authoritative test file for cue↔ROM mapping is tempest/tests/audit/alsoun-cue-mapping.test.ts (the "cluster-C8 authority" — 13-slot ALSOUN table, event→cue→ROM chain).
- New wirings should extend that chain-of-proof pattern.

## Sm Assessment

**Setup complete. Handoff to O'Brien (TEA) for RED.**

- **Race check (2026-07-14):** fetched tempest origin — no tp1-13 commits or branches upstream; no sibling checkout has claimed this story. Merge gate clear: zero open PRs on tempest.
- **Dependency:** tp1-2 is `done` (archived). Its Delivery Findings pre-extract this story's quarry — the unwired `thrust_space` cue ($cc81), the R2 upload caveat, and the citation re-anchor trap. All transcribed into Technical Approach above and into `sprint/context/context-story-tp1-13.md`.
- **Context repair:** `pf context create` stubbed the context file's Technical Approach (known clobber behavior); I restored the full approach from the tp1-2 archive before handoff.
- **Branch:** `fix/tp1-13-audio-wiring-gaps` created from origin/develop (gitflow; PR targets develop).
- **Jira:** skipped — local sprint tracking only, `jira_key` is the story id.
- **Release-step watch (for Dev/Reviewer/finish):** AC-1 wires `thrust_space` into the SOUNDS manifest; confirm `thrust_space.wav` actually exists in the R2 bucket before release, else the game fetches a 404. tp1-2's F-1 flagged the same class of gap.

## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `tests/core/tp1-13.audio-wiring-events.test.ts` (new) — the pure-core emission contract: `warp-space` at the ILINDDY bottom-crossing (once per completed dive, never on a crash, the phase exists as time, space is crash-proof per ALWELG.MAC:1083-1085); `wave-bonus` (once, at the end of the STARTING wave only, ROM BONPTM ladder values as literals, survives a crash-and-retry, feeds the extra-life ladder through the shared score path, wave-1 and second-wave negatives, even-wave totality guard); `bolt-destroyed` (bolt's position not the bullet's, both projectiles spent, no score, no enemy-death, per-pair emission, lane/depth negatives).
- `tests/audit/tp1-13.audio-wiring-cues.test.ts` (new) — the chain-of-proof per the cluster-C8 pattern: event → SoundName → bake cue → ROM record for all three wirings; kzap deleted with nothing replacing it (the zap's audio IS the kills' EX bursts); compile-level pins ('thrustSpace' joins SoundName, 'superzapper' leaves it); a provenance suite that re-opens ALWELG/ALEXEC/ALCOMN and proves every claimed line verbatim, including the BONPTM BCD decode with the decimal-misreading refutation.
- `tests/shell/tp1-13.fx-bolt-explosion.test.ts` (new) — AC-3's explosion: one EnemyBurst at the destroyed bolt's projected position, one per bolt, event-driven only.
- Re-seated: `tests/shell/audio-dispatch.test.ts` (contract table 16→19 discriminants, rows now multi-effect: warp-space = [stop levelClear, start thrustSpace], warp-end = [stop levelClear, stop thrustSpace], superzapper-activate → silent; full-dive and crash-dive loop-lifecycle tests), `tests/core/events.test.ts` (union census 16→19 + narrowing arms), `tests/shell/audio.test.ts` (fetch manifest: + thrust_space.wav, − kzap.wav with an explicit not-fetched pin).

**Tests Written:** 39 new/re-seated tests covering all 4 wirings (ACs 1–4; AC-5 is the satisfied tp1-2 dependency, AC-6 is the citation gate — Dev bookkeeping is itemised in Delivery Findings)
**Status:** RED (verified by testing-runner: 34 behavioural failures, ALL in tp1-13/re-seated files, every failure a missing-feature reason; 0 collateral failures in the other 97 files; `tsc --noEmit` fails with 52 errors, all deliberate compile pins in test files, none tracing to src/)

**Pre-GREEN passes audited (every one an intended guard, never a new-behaviour assertion):** crash-dive-never-emits-warp-space, wave-1-no-bonus, even-wave totality, bolt-miss negatives, no-score-no-kill, fx spawns-nothing-without-event, provenance suite (pins the 1981 source, not our code), bake-cue existence (pins tp1-2's landed work).

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

| Rule | Test / treatment | Status |
|------|------------------|--------|
| #1 type-safety escapes | Zero casts: new-event literals are ANNOTATED (`const e: GameEvent = …`), never `as` — pre-GREEN they fail tsc (the deliberate compile half of RED); the one `@ts-expect-error` ('superzapper' leaves SoundName) documents that it is dead pre-GREEN by design | clean |
| #2 generics/readonly | Helpers take `ReadonlyArray`/`readonly` params; recorder fakes typed via `Pick<AudioEngine, …>`, no `Record<string, any>` | clean |
| #3 exhaustiveness | The dispatcher's `never` guard forces wiring the 3 new variants at compile time; the EVENT_EFFECT table + events.test.ts census (19) enforce the runtime half | covered |
| #4 null/undefined | `effects ?? []`; optional-payload access only behind length assertions; NaN guard on the score in the totality test | clean |
| #8 test quality | No `as any`; mock surfaces match the real `AudioEngine` slice; unused helper caught by the runner and removed; vacuous-test self-check done (see pre-GREEN audit above) | clean |

**Rules checked:** 5 of 13 applicable (no React/async/build/config/security surface in a test-only diff)
**Self-check:** 2 issues found and fixed in my own work (the `as GameEvent` casts replaced with annotations before commit; the dead `bonusFor` helper removed after the runner flagged it)

**Commit:** `9cf7e0f` on `fix/tp1-13-audio-wiring-gaps` (6 files, +848/−40)

**Handoff:** To Julia (Dev) for GREEN. The work, in dependency order: (1) add the three GameEvent variants — the dispatcher and fx stop compiling until wired, which is intended; (2) sim: emit `warp-space` when the dive crosses the bottom, hold a ROM-cited (or explicitly PROVISIONAL) space segment with the spike gate OFF (ALWELG.MAC:1083-1085), then warp-end + advance; (3) sim: skill-step bonus state (set at select-start, award once at the starting wave's bottom-crossing THROUGH the shared score path so the extra-life ladder sees it, clear on arrival), BONPTM ladder values, even-wave mapping documented; (4) sim: push `bolt-destroyed` from `resolveEnemyBulletHits` with the BOLT's coordinates; (5) shell: `thrustSpace` in SOUNDS/CHANNELS, dispatch rows per the contract table, fx EnemyBurst on bolt-destroyed, DELETE the superzapper cue + kzap.wav reference; (6) bookkeeping: `remediated_by: tp1-13` on S-011/S-013/S-014/S-015, re-anchor citations, re-bake nothing (thrust_space.wav already baked by tp1-2 — but READ the R2 findings above before release). The four traps: don't special-case my space-phase teleport fixture (implement the ILINDDY gate); don't award the bonus through a private score side-door (the UPSCOR test bites); don't re-add a zap one-shot "for feel" (S-011 says the cabinet never had one); don't touch `countdown_beep` (out of scope, see context).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/events.ts` — three new GameEvent variants: `WarpSpaceEvent`, `WaveBonusEvent` (points), `BoltDestroyedEvent` (lane/depth).
- `src/core/state.ts` — `WarpState.inSpace`/`spaceFrames` (the crash-proof space phase); `GameState.startBonus` (the ROM's BONUS); both seeded in `initialState`.
- `src/core/rules.ts` — `START_WAVE_BONUS_LADDER` + `startWaveBonus(wave)` (BONPTM, BCD-decoded literals); `WARP_SPACE_FRAMES` (PROVISIONAL space-phase span).
- `src/core/sim.ts` — AC-1: two-phase `stepWarp` (bottom-crossing emits `warp-space` + enters the crash-proof space phase, arrival emits `warp-end`; the ILINDDY gate is the reorder — no spike check past the bottom); AC-2: `advanceLevel` pays+clears `startBonus` through `awardScore`; AC-3: `resolveEnemyBulletHits` emits `bolt-destroyed` at the bolt's position; warp-state resets in checkLevelClear/advanceLevel/startGameAtLevel.
- `src/shell/audio.ts` — SOUNDS: `+thrustSpace` (thrust_space.wav), `−superzapper` (kzap.wav DELETED); CHANNELS: thrustSpace shares 'zoom' with levelClear, superzapper removed.
- `src/shell/audio-dispatch.ts` — `warp-space` (stop levelClear, start thrustSpace), `warp-end` (stop both), `wave-bonus`→extraLife, `bolt-destroyed`→enemyDeath, `superzapper-activate`→SILENT (no kzap).
- `src/shell/fx.ts` — `bolt-destroyed` spawns one EnemyBurst at the destroyed bolt's projected position.
- `docs/audit/findings/pair-5-alsoun-audio.json` — S-011/S-013/S-014/S-015 marked `remediated_by: tp1-13`.
- `docs/audit/findings/pair-7-alexec-state-cadence.json` — P7-004 `ours` re-spelled (WarpState comment re-worded, finding stays OPEN — structural, not remediated).
- `docs/audit/findings/pair-{1,3,5,6,8,9,11}-*.json` — line anchors re-anchored (`reanchor-citations.mjs --write`, 0 lost) after the sim.ts/rules.ts/state.ts/fx.ts edits shifted them.
- `tests/core/tp1-23.warp-curwav.test.ts`, `tests/core/rom-clock-timing.test.ts` — re-seated to the bottom-crossing (see Design Deviations); `tests/audit/alsoun-cue-mapping.test.ts` — stale `tp1-9`→`tp1-13` comment.

**Tests:** 1207/1207 passing (GREEN) — the 39 new/re-seated tp1-13 tests plus the two re-seated ROM-timing suites; zero regressions. `npm run build` (tsc --noEmit && vite build) clean. `npm test -- citations` green (AC-6).

**Branch:** fix/tp1-13-audio-wiring-gaps (to be pushed)

**Handoff:** To The Thought Police (Reviewer) for review.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): Wiring `thrustSpace` into the SOUNDS manifest makes the engine fetch `thrust_space.wav` on resume, so the file must exist in the R2 bucket at release or players get a 404. tp1-2 baked it and its Dev findings say it "will be hosted" — VERIFY, and if absent: `node tools/pokey-bake/bake-sfx.mjs <outdir>` then `wrangler r2 object put arcade/tempest/sfx/thrust_space.wav --file=<path> --remote`. Affects the release step (same class as tp1-2's F-1). *Found by TEA during test design.*
- **Question** (non-blocking): The space phase's DURATION has no single ROM byte — it is emergent from the ROM's end-of-wave state flow (CENDWA→ENDWAV→NEWAV2 at 28.44 fps) plus the eye flight tp1-10 will build. My tests pin only a weak `>= 2 frames` floor. Dev must pick a duration and commit it WITH a citation or an explicit PROVISIONAL-pending-tp1-10 comment — not silently invent it (the tp1-27/0.92 lesson). Affects `src/core/sim.ts` (the new space-segment constant). *Found by TEA during test design.*
- **Improvement** (non-blocking): kzap.wav stops being fetched but the R2 object remains. Delete it from the bucket during delivery (`wrangler r2 object delete arcade/tempest/sfx/kzap.wav --remote`) so the "DELETED" in AC-4 is true in production, not just in code. Affects the release step. *Found by TEA during test design.*
- **Gap** (non-blocking): `stepWarp` runs its spike check AFTER the progress advance, and `warpClawDepth` goes NEGATIVE past progress 1 — with a space segment added, a claw rotated onto any spiked lane in space would satisfy `depth <= height` and crash after passing the bottom. The ROM gates the collision on `CMP I,ILINDDY / IFCC ;CURSOR STILL ON LINES` (ALWELG.MAC:1083-1085). My "cannot crash in space" test forces that gate; Dev must implement it, not special-case my fixture. Affects `src/core/sim.ts` (resolveWarpSpikeHit/stepWarp). *Found by TEA during test design.*
- **Improvement** (non-blocking): For `CHANNELS.thrustSpace` I recommend sharing `'zoom'` with `levelClear` — same category and mutually exclusive in time (T2 ends the frame T3 begins), which is exactly the stated CHANNELS design rule; deliberately not pinned in tests. Also `tests/audit/alsoun-cue-mapping.test.ts:154-155` still says "tp1-9 wires them" — stale renumbering, the consumer is tp1-13; a comment-only fix in a TEST file (no citation points at test files, verified). Affects `src/shell/audio.ts`, `tests/audit/alsoun-cue-mapping.test.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): Citation bookkeeping for GREEN: mark S-011, S-013, S-014, S-015 `remediated_by: tp1-13` (all four are actually fixed by this story; S-014/S-015 have `ours: null` so the field is pure audit record). Then run `node tools/audit/reanchor-citations.mjs --write` — S-001..S-006/S-018 cite `audio-dispatch.ts`/`audio.ts` lines and W-*/SC-*/DA-* cite `sim.ts` lines that this story's edits will shift. Affects `docs/audit/findings/pair-5-alsoun-audio.json` et al. *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (blocking-for-release, not-for-Dev): `thrust_space.wav` MUST exist in the R2 bucket before release — wiring `thrustSpace` into audio.ts's SOUNDS makes the engine fetch it on resume, so a missing object is a runtime 404. Verify it was uploaded with tp1-2's release; if absent: `node tools/pokey-bake/bake-sfx.mjs <outdir>` then `wrangler r2 object put arcade/tempest/sfx/thrust_space.wav --file=<path> --remote`. Affects the release step (same class as tp1-2's F-1; confirms TEA's finding). *Found by Dev during implementation.*
- **Improvement** (non-blocking, release): `kzap.wav` is no longer fetched (AC-4) but the R2 object remains. Delete it so "DELETED" is true in production: `wrangler r2 object delete arcade/tempest/sfx/kzap.wav --remote`. Affects the release step. *Found by Dev during implementation.*
- **Gap** (non-blocking): RED's sibling re-seat missed two ROM warp-timing suites — `tests/core/tp1-23.warp-curwav.test.ts` ("46 ROM frames") and `tests/core/rom-clock-timing.test.ts` (the 1.30–1.90 s band) — both of which counted frames until `mode !== 'warp'`. The new crash-proof space phase pushed that endpoint ~9 frames past the in-well dive they intend to measure. Re-seated both to the bottom-crossing (`warp.inSpace`), preserving their exact figures. Affects those two test files (already fixed in this commit). *Found by Dev during implementation.*
- **Question** (non-blocking): `WARP_SPACE_FRAMES = 9` is PROVISIONAL — the authentic space-phase span is emergent from the ROM's end-of-wave flow plus tp1-10's eye flight, with no single ROM byte. tp1-10 (THE WARP DIVE) should replace it with the real camera timing. Affects `src/core/rules.ts`. *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): The advanced-start bonus routes through `awardScore` (as AC-2 requires), which has NO life cap — a wave-15 start pays 114,000, crossing 11 `EXTRA_LIFE_INTERVAL` thresholds and granting 11 lives at once, where the ROM caps LIVES1 at 6 (GIVBON). This is a pre-existing `awardScore` gap now made reachable by the bonus wiring; it does not affect the audio contract. Affects `src/core/sim.ts` (`awardScore` — a future life-cap/GIVBON-fidelity story should clamp lives, not this audio story). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `sfx-data.mjs`'s `thrust_space` cue comment still says the consumer is "story tp1-9" (stale renumber — the consumer is tp1-13). Left untouched deliberately: `sfx-data.mjs` is a cited file (S-007) and a comment-only edit would shift its anchors for zero test benefit. A future cue-doc pass (or the next story that already edits that file) can correct it while re-anchoring. Affects `tools/pokey-bake/sfx-data.mjs`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **The space phase's duration is pinned as a floor (>= 2 frames), not the authentic span**
  - Spec source: context-story-tp1-13.md AC-1; audit S-014
  - Spec text: "a second, distinct engine drone … for the remainder of the warp, ending only when the starfield itself is dismissed"
  - Implementation: Tests assert the phase exists as time (mode stays 'warp', level unadvanced, >= 2 frames) and that the T3 loop spans it; the exact duration is left to Dev with a citation/PROVISIONAL obligation (Delivery Finding)
  - Rationale: tp1-10 owns the second phase's camera/arrival ("the eye flies INTO the new well"); the ROM's span is emergent from state frames + eye flight, not a single byte — pinning a guess would invent a constant
  - Severity: minor
  - Forward impact: tp1-10 should replace the floor with the real flight timing when it lands the eye
- **T3 stops at 'warp-end', not at the starfield's dismissal**
  - Spec source: audit S-014 (reasoning field)
  - Spec text: "ending only when the starfield (PRSTAR/INSTAR) itself is dismissed"
  - Implementation: Dispatch stops thrustSpace on 'warp-end' (the frame the level advances); the ROM lets it ring until PLAGRO clears at arrival in the new well
  - Rationale: pre-tp1-10 the clone has no arrival moment distinct from warp-end — the tp1-31 camera slide runs inside 'playing'; adding an arrival event now would build tp1-10's structure piecemeal
  - Severity: minor
  - Forward impact: tp1-10 may move the stop to its arrival moment; the dispatch row is one line to re-seat
- **Non-ladder start waves (2,4,…,16) get a totality contract, not a value pin**
  - Spec source: audit S-015; ALWELG.MAC:275-280 (BONPTM/LEVEL)
  - Spec text: ENDWAV awards BONPTM[BONUS] — defined only for the ROM's odd-wave select ladder
  - Implementation: Ladder waves 3..15 are pinned to the literal BCD-decoded values (6,000 … 114,000); even waves assert only defined/integer/>= 0, chime iff points > 0
  - Rationale: our select is contiguous 1..16 (not this story's to change); the ROM simply has no value for even waves — pinning one would invent it
  - Severity: minor
  - Forward impact: Dev documents the even-wave mapping; PM may later rule the select becomes the ROM ladder
- **The bolt's explosion is the standard EnemyBurst, not a distinct CCTYPE picture**
  - Spec source: audit S-013; ALWELG.MAC:2802-2803
  - Spec text: "LDA I,CCTYPE / JSR GENEXP" — the ROM tags charge-charge explosions with their own type code
  - Implementation: fx test pins one EnemyBurst (the shared 16-spoke star) at the bolt's projected position
  - Rationale: our fx has two explosion shapes total (enemy/player); porting the ROM's explosion-type picture set is render fidelity beyond an audio-wiring story
  - Severity: minor
  - Forward impact: none for this epic's audio clusters; a future explosion-fidelity story could split the types
- **The bonus frame is pinned to a window, not the exact ENDWAV frame**
  - Spec source: audit S-015; ALEXEC.MAC:371-376
  - Spec text: ENDWAV runs in the CENDWA→CNEWV2 chain immediately after the bottom-crossing
  - Implementation: Tests require the wave-bonus frame to satisfy warp-space <= wave-bonus <= warp-end
  - Rationale: the ROM's state machine spreads these across adjacent frames; pinning exact adjacency would couple the suite to an internal frame cadence tp1-10 will rework
  - Severity: minor
  - Forward impact: none

### Dev (implementation)
- **The advanced-start bonus is paid on ARRIVAL (advanceLevel), not on the bottom-crossing (warp-space)**
  - Spec source: TEA handoff step (3) — "award once at the starting wave's bottom-crossing"; and the crash-retry test (tp1-13.audio-wiring-events.test.ts "survives a spike crash and pays exactly once")
  - Spec text: TEA prose says the award fires at the bottom-crossing; the crash-retry test asserts `wave-bonus === 1` and `score === 6000` after a mid-dive crash that NEVER reaches the bottom-crossing
  - Implementation: `advanceLevel` (sim.ts) pays `startBonus` through `awardScore` and clears it. advanceLevel is the single "arrival at the next well" door — reached BOTH by a completed dive (stepWarp, progress≥1→space→arrival) AND by a warp-crash respawn (respawn's `warp.progress>0 → advanceLevel`, the Story 3-6 mechanism). So a crash still collects the pending bonus, exactly as the test requires.
  - Rationale: this clone advances the level on a warp-crash respawn (Story 3-6, pinned by sim.warp-death-respawn.test.ts) rather than re-diving, so the bottom-crossing is unreachable on a crash. Awarding at arrival is the only timing that satisfies ALL AC-2 tests, and it still lands inside the required `warp-space <= wave-bonus <= warp-end` window (arrival IS the warp-end frame). Matches the ROM's "cleared on arrival" (ALWELG.MAC:114-117).
  - Severity: minor
  - Forward impact: tp1-10 (THE WARP DIVE) may split the ROM's distinct ENDWAV-vs-arrival moments; if it replaces the crash→advanceLevel mechanism with a re-dive, move the award to the bottom-crossing then.
- **WARP_SPACE_FRAMES = 9 is a PROVISIONAL span for the crash-proof space phase**
  - Spec source: TEA Delivery Finding (Question) — "Dev must pick a duration and commit it WITH a citation or an explicit PROVISIONAL-pending-tp1-10 comment"; audit S-014
  - Spec text: "a second, distinct engine drone … for the remainder of the warp, ending only when the starfield itself is dismissed" — no single ROM byte gives the span
  - Implementation: `WARP_SPACE_FRAMES = 9` sim steps (rules.ts), ~0.3 s at ROM_FPS, with a PROVISIONAL-pending-tp1-10 comment; the T3 loop holds for this segment before advanceLevel. Floor honoured (>= 2 frames so the loop is audible).
  - Rationale: the authentic span is emergent from the ROM's end-of-wave state flow plus the eye-flight tp1-10 owns; picking a hard number now would invent a constant (the tp1-27/0.92 lesson), so it is explicitly flagged provisional.
  - Severity: minor
  - Forward impact: tp1-10 should replace WARP_SPACE_FRAMES with the real eye-flight timing when it lands the camera.
- **Even (non-ROM) start waves map to the nearest LOWER skill step**
  - Spec source: TEA deviation "Non-ladder start waves get a totality contract, not a value pin"; audit S-015; ALWELG.MAC:266-280 (BONPTM/LEVEL)
  - Spec text: the ROM's LEVEL table only offers odd start waves (1,3,…,15); even waves have no BONPTM entry
  - Implementation: `startWaveBonus(wave)` = `BONPTM[min(floor((wave-1)/2), 7)]` (rules.ts) — odd waves recover their exact ladder value; even waves (unreachable in the cabinet, reachable via our contiguous 1..16 select) fall to the nearest lower step, e.g. wave 4 → step 1 → 6,000. Total, integer, non-negative for every wave.
  - Rationale: the even-wave test allows any total, sane, positive-or-zero mapping; "credit for the highest milestone you passed" is defensible and monotonic. Our select being 1..16 (not this story's to change) is what makes the case reachable at all.
  - Severity: minor
  - Forward impact: if PM later rules the select becomes the ROM's odd-only ladder, the even-wave branch becomes dead but harmless.
- **Re-seated two ROM warp-timing suites to measure the bottom-crossing, not arrival (RED's re-seat missed them)**
  - Spec source: TEA Test Files list (its re-seat set); the ripple pattern in the Dev sidecar ("tightening/extending a shared warp mechanism breaks sibling FIXTURES RED never touched")
  - Spec text: tp1-23.warp-curwav.test.ts pins "46 ROM frames to dive at level 1"; rom-clock-timing.test.ts bands the dive at 1.30–1.90 s — both counted frames until `mode !== 'warp'`
  - Implementation: added a crash-proof SPACE phase (WARP_SPACE_FRAMES) between the bottom-crossing and the level advance, so "mode leaves warp" now lands ~9 frames late (55 frames / 1.93 s). Re-pointed both suites at the bottom-crossing (`warp.inSpace`), which bounds the 224-along in-well dive exactly — restoring 46 frames / 1.62 s unchanged.
  - Rationale: both suites INTEND the in-well dive duration (the ROM's 46-frame figure), using "mode leaves warp" only as a pre-tp1-13 proxy for it. The space phase is a new segment they never accounted for; the in-well ramp itself is untouched, so the re-seat preserves their exact assertions and their intent.
  - Severity: minor
  - Forward impact: none — the figures are identical; only the measured endpoint moved from arrival to the bottom-crossing.

### Reviewer (audit)

Every logged deviation is sound and well-cited; all stamped ACCEPTED. No undocumented deviation found — the whole diff is accounted for.

- **TEA — space-phase duration pinned as a floor (>= 2 frames)** → ✓ ACCEPTED: the authentic span is emergent (tp1-10); a weak floor is the honest pin, and Dev's PROVISIONAL WARP_SPACE_FRAMES respects it.
- **TEA — T3 stops at 'warp-end', not at the starfield's dismissal** → ✓ ACCEPTED: pre-tp1-10 there is no arrival moment distinct from warp-end; the dispatch row is one line to re-seat later.
- **TEA — non-ladder start waves get a totality contract, not a value pin** → ✓ ACCEPTED: the ROM has no even-wave value; a totality guard is correct, and Dev's nearest-lower mapping satisfies it.
- **TEA — the bolt's explosion is the standard EnemyBurst, not a distinct CCTYPE picture** → ✓ ACCEPTED: our fx has two explosion shapes; porting the ROM's explosion-type set is render fidelity beyond an audio story.
- **TEA — the bonus frame is pinned to a window, not the exact ENDWAV frame** → ✓ ACCEPTED: the window `warp-space <= wave-bonus <= warp-end` is exactly what the arrival-award timing lands inside; no coupling to an internal cadence.
- **Dev — bonus paid on ARRIVAL (advanceLevel), not the bottom-crossing** → ✓ ACCEPTED: this is the ONLY timing that satisfies all AC-2 tests. The clone advances the level on a warp-crash respawn (Story 3-6, pinned by sim.warp-death-respawn.test.ts), so the bottom-crossing is unreachable on a crash; advanceLevel is the single arrival door both paths reach, and it still lands inside the required window. Cited to "CLEAR BONUS on arrival" (ALWELG.MAC:114-117). Verified once-only via the `startBonus > 0` gate + immediate clear.
- **Dev — WARP_SPACE_FRAMES = 9 is PROVISIONAL** → ✓ ACCEPTED: explicitly flagged pending tp1-10 with a clear comment; honours the >= 2 floor; no invented ROM constant claimed. Captured as a Delivery Finding.
- **Dev — even start waves map to the nearest lower skill step** → ✓ ACCEPTED: total, integer, non-negative; wave 4 → 6,000 is defensible ("credit for the highest milestone passed") and the case is only reachable because our select is contiguous 1..16.
- **Dev — re-seated tp1-23.warp-curwav + rom-clock-timing to the bottom-crossing** → ✓ ACCEPTED: the re-seat preserves both suites' exact figures (46 frames, 1.62 s) and their intent (the in-well dive); it moved only the measured endpoint from arrival to the bottom, which is where those ROM figures actually end. Not a weakening — the assertions are byte-identical.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1212/1212 tests pass, tsc+vite build clean, citation gate 12/12 green, zero smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — edge/boundary domain assessed by Reviewer (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — swallowed-error domain assessed by Reviewer (see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — test-quality domain assessed by Reviewer (see [TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — doc domain assessed by Reviewer (see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — type domain assessed by Reviewer (see [TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — security domain assessed by Reviewer (see [SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — complexity domain assessed by Reviewer (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — lang-review rules enumerated by Reviewer (see Rule Compliance) |

**All received:** Yes (1 enabled subagent returned clean; 8 disabled via `workflow.reviewer_subagents`, their domains assessed by Reviewer below)
**Total findings:** 0 blocking, 2 non-blocking Improvements (Delivery Findings), 2 low-severity notes

## Reviewer Assessment

**Verdict:** APPROVED

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md`)

Enumerated every rule against the changed `.ts` files (events/rules/sim/state, audio/audio-dispatch/fx, and the re-seated tests). Non-applicable checks (#6 React, #7 async, #9 build-config, #10 input-validation, #11 error-handling, #12 perf) have no surface in this pure sim/audio-manifest diff.

- **#1 type-safety escapes** — PASS. No `as any`, `as unknown as`, `@ts-ignore`, or new non-null assertions in src/. `START_WAVE_BONUS_LADDER[step]` is safe: `step` is clamped to `[0, length-1]`. The one `@ts-expect-error` (test file, 'superzapper' leaving SoundName) is a LIVE suppression — it produces a real error post-GREEN, not dead.
- **#2 generics/readonly** — PASS. `START_WAVE_BONUS_LADDER: readonly number[]`; new event interfaces are plain typed records; the audio-dispatch recorder fake types via `Pick<AudioEngine, …>`. No `Record<string, any>`.
- **#3 enum/exhaustiveness** — PASS. No enums. The dispatch `switch` keeps its `default: const _exhaustive: never = event` guard; all 3 new variants + `superzapper-activate` are wired, so tsc proves exhaustiveness. `events.test.ts` census (19) enforces the runtime half.
- **#4 null/undefined** — PASS. `if (s.startBonus > 0)` and `spaceFrames <= 0` operate on always-present numbers; no `||`-on-nullable, no unchecked `Map.get`.
- **#5 module** — PASS. events.ts uses `export interface` + `export type` union; no `import type` misuse.
- **#8 test quality** — PASS. The re-seated ROM-timing suites keep their exact assertions (46 frames / 1.62 s), measured at the bottom-crossing instead of arrival — not weakened. No `as any` in tests; mock surfaces match the real `AudioEngine` slice.
- **#13 fix-regressions** — N/A (no post-review fix commits).

### Observations

1. `[VERIFIED]` **Two-phase warp / ILINDDY gate is STRUCTURAL, not a special-case** — `sim.ts` stepWarp: the `inSpace` branch and the `progress >= 1` branch both `return` before `resolveWarpSpikeHit`, so the spike check runs ONLY while `progress < 1` (cursor on the lines). This implements TEA's required "CURSOR STILL ON LINES" gate (ALWELG.MAC:1083-1085) by ordering, exactly as the Delivery Finding demanded — evidence: sim.ts stepWarp, `resolveWarpSpikeHit(s)` is the last statement, reached only on the fall-through where progress < 1.
2. `[VERIFIED]` **Space-phase progress overshoot (>1) is safe** — render.ts:871 clamps `const progress = Math.max(0, Math.min(1, s.warp.progress))`, so the deliberate continued progress accumulation in space (needed for the monotonic-delta contract) never reaches a consumer that assumes [0,1]. No render break.
3. `[VERIFIED]` **Bonus paid exactly once** — advanceLevel gates on `startBonus > 0` and clears to 0 in the same call; `startBonus` is set once at startGameAtLevel. Both a completed dive (stepWarp arrival) and a crash-respawn (respawn → advanceLevel, Story 3-6) reach the single award door, so crash-and-retry pays once — evidence: sim.ts advanceLevel bonus block + `s.startBonus = 0`.
4. `[VERIFIED]` **Demo cannot mis-fire the bonus** — seedDemo→startGameAtLevel sets `startBonus`, but the attract demo runs in `'attract'` mode where checkLevelClear no-ops, so advanceLevel is never reached; a real select→start overwrites it. No leak.
5. `[EDGE]` (Reviewer, subagent disabled) `[LOW]` **Very short spike near the bottom** — a spike shortened below the near-bottom per-frame progress step (~0.034 depth) on the player's parked lane could be "jumped" without a crash on the frame progress leaps past 1 (the bottom-crossing branch skips the spike check). This is ROM-consistent (past ILINDDY there is no collision) and the old crash-at-negative-depth was itself the bug being fixed; untested edge, near-zero-height spikes only. Note, not blocking.
6. `[EDGE]`/`[TYPE]` (Reviewer) `[MEDIUM→non-blocking]` **awardScore has no life cap** — a wave-15 start pays 114,000 → 11 EXTRA_LIFE_INTERVAL crossings → 11 lives, where the ROM caps LIVES1 at 6 (GIVBON). Pre-existing awardScore behavior, newly reachable via the (AC-required) shared-score routing; out of this audio story's scope. Captured as a Delivery Finding.
7. `[VERIFIED]` **kzap deletion is clean** — `SoundName = keyof typeof SOUNDS`, so removing the `superzapper` key removes it from the union; `CHANNELS: Record<SoundName,string>` loses its key with it; tsc confirms no dangling refs; `superzapper-activate` now dispatches to a silent case (event still consumed for the flash visual). audio.ts / audio-dispatch.ts.
8. `[VERIFIED]` **'zoom' channel sharing is correct** — the shared engine's `stopLoop`/`startLoop` are channel-keyed: warp-space stops levelClear then starts thrustSpace on 'zoom'; warp-end's two stops both target 'zoom', netting whichever loop is up stopped. levelClear (T2) and thrustSpace (T3) are mutually exclusive in time, satisfying the CHANNELS sharing rule.
9. `[SILENT]` (Reviewer) `[VERIFIED]` **No swallowed errors / silent fallbacks introduced** — the new code has no try/catch, no `?? fallback` masking a real value, no empty branches. `if (s.startBonus > 0)` is an intentional ENDWAV IFNE gate, not a swallow. bolt-destroyed is emitted on every matched pair (no drop).
10. `[DOC]`/`[SIMPLE]`/`[SEC]` (Reviewer) `[VERIFIED]` **Docs accurate, no over-engineering, no security surface** — every new comment carries a live ROM citation matching the code; the stale `tp1-9` doc refs in the two test/authority files were corrected (alsoun-cue-mapping) or logged as a finding (sfx-data, cited-file, left untouched). The two-field warp state (inSpace/spaceFrames) is the minimal model; no dead code. No auth/input/secret surface (pure client sim).

### Devil's Advocate

Assume this is broken. The largest attack surface is the new warp state machine, so push on it. *Can the space phase never end?* `spaceFrames` starts at 9 and decrements unconditionally each warp step; nothing re-enters the bottom-crossing branch once `inSpace` is true (it is guarded first), so `spaceFrames` monotonically falls to `<= 0` and arrives — no infinite dive. *Can the bonus double-pay under a pathological input sequence?* The award reads `startBonus > 0` then zeroes it within the same synchronous advanceLevel call; there is no yield point, and `startBonus` is only ever re-set by startGameAtLevel (a fresh game). A player who crashes on the starting wave, respawns (advanceLevel pays once, clears), then clears the next wave hits advanceLevel with `startBonus === 0` → no second pay. *What about the confused/malicious player who spins onto a spiked lane in space to force a crash?* That is precisely TEA's crash-proof test, and it passes because the spike check is unreachable once `inSpace` — the reorder, not a fixture special-case. *What about a huge or negative selected level?* startWaveBonus clamps the step index to `[0, 7]` via `Math.min(Math.max(0, floor((wave-1)/2)), 7)`, so out-of-range waves fold to a defined ladder value; no `undefined`, no `NaN` into the score (a NaN score is the one thing the totality test explicitly guards). *Where it IS genuinely soft:* the 11-lives-at-once path (finding #6) is a real fidelity gap the ROM would cap — but it is a pre-existing awardScore property surfaced, not introduced, by this diff, and it lies outside an audio-wiring story's remit. And WARP_SPACE_FRAMES is an admitted guess; if tp1-10 never lands, the space beat stays at a placeholder 0.3 s forever — acceptable because it is explicitly flagged and the audio it gates is correct regardless of the exact span. Nothing here rises to a correctness bug in the story's own scope.

### Dispatch tag coverage
`[EDGE]` #5/#6 · `[SILENT]` #9 · `[TEST]` Rule #8 (re-seats keep exact assertions) · `[DOC]` #10 · `[TYPE]` #6/Rule #1-2 · `[SEC]` #10 (no surface) · `[SIMPLE]` #10 (minimal state) · `[RULE]` Rule Compliance (all applicable checks PASS)

**Data flow traced:** player select (wave N) → `startGameAtLevel` sets `startBonus = startWaveBonus(N)` → dive clears → `advanceLevel` → `awardScore(startBonus)` + `wave-bonus` event → shell `playEventSounds` → `audio.play('extraLife')`. Safe: gated on `> 0`, cleared after, routed through the shared UPSCOR path the extra-life ladder already watches.

**Pattern observed:** event-driven audio/fx off the pure core's `GameEvent` channel, extended cleanly (3 variants, dispatch `never` guard, fx `if`-chain) — sim.ts / audio-dispatch.ts / fx.ts.

**Error handling:** N/A surface — pure deterministic sim; no I/O, no fallible calls in the diff. Boundary inputs (out-of-range wave, negative depth in space, crash mid-dive) all handled and tested.

**Handoff:** To Winston Smith (SM) for finish-story. NOTE: this branch is AI-authored AND AI-reviewed — the finish-merge human-approval gate applies; the PR must not be self-merged without user authorization.