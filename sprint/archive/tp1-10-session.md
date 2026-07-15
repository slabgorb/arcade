---
story_id: "tp1-10"
jira_key: "tp1-10"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-10: THE WARP DIVE — move the camera with the Claw, fly the eye into the new well, and replay the wave on a spike crash

## Story Details
- **ID:** tp1-10
- **Jira Key:** tp1-10
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-14T23:50:01Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-14T20:42:43Z | 2026-07-14T20:46:04Z | 3m 21s |
| red | 2026-07-14T20:46:04Z | 2026-07-14T21:22:29Z | 36m 25s |
| green | 2026-07-14T21:22:29Z | 2026-07-14T21:58:47Z | 36m 18s |
| review | 2026-07-14T21:58:47Z | 2026-07-14T22:21:00Z | 22m 13s |
| green | 2026-07-14T22:21:00Z | 2026-07-14T22:30:12Z | 9m 12s |
| review | 2026-07-14T22:30:12Z | 2026-07-14T22:39:26Z | 9m 14s |
| finish | 2026-07-14T22:39:26Z | 2026-07-14T22:48:07Z | 8m 41s |
| green | 2026-07-14T22:48:07Z | 2026-07-14T23:34:28Z | 46m 21s |
| review | 2026-07-14T23:34:28Z | 2026-07-14T23:50:01Z | 15m 33s |
| finish | 2026-07-14T23:50:01Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): the shipped tp1-9 baked the per-well eye into `farRatio` + the far ring — there is NO live eye field. The SM's `tube.eye.{distance,z}` pointer is the SUPERSEDED a-1 branch, not what shipped. Affects `src/core/geometry.ts:247-248` and `src/core/state.ts` (WD-012/WD-018 must ADD the moving warp eye/camera; it is not already a parameter). *Found by TEA during test design.*
- **Improvement** (non-blocking): AC-2's exact fly-in frame count is not pinned — only that a multi-frame fly-in EXISTS. The ROM walks EYL at +0x18/frame from its start to EYLDES (ALWELG.MAC:85-109); deriving the precise duration is a ROM read TEA has not done. Affects `src/core/sim.ts` (the new post-descent fly-in). *Found by TEA during test design.*
- **Question** (non-blocking): AC-1's "well expands past the fixed Claw" is a render-visual property vitest's `node` env cannot drive (render() needs a canvas). The Claw-constant half is pinned via `?raw`; the well-expansion half is delegated to Reviewer's visual check. Affects `src/shell/render.ts` (drawTube/drawWarp during warp must be driven by the moving eye). *Found by TEA during test design.*
- **Improvement** (non-blocking): the ROM also starts a NEW "space sound" (SOUTS3) at the bottom of the dive (ALWELG.MAC:1037) that we only `stopLoop` on warp-end — out of scope for AC-6 (which covers only the rumble START timing), noted for a future audio story over the fly-in. Affects `src/shell/audio-dispatch.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): the bullet SPAWN DEPTH during the dive is left open. `stepFiring` hardcodes `depth: 1` (rim), but the ROM fires from CURSY (the Claw's live descending depth). AC-4's tests assert only that a charge spawns + moves, not its origin depth — Dev/Reviewer should settle the spawn depth against WD-014/WD-012. Affects `src/core/sim.ts` (stepFiring under warp). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): AC-1's well-expansion (the moving-eye zoom so the well rushes past the fixed Claw) is NOT implemented — only the test-pinned fixed rim Claw shipped. Attempting it (a progress-driven tube zoom about the vanishing point) broke `render.warp-dispatch.test.ts`'s "drawSpikes before the warp/else split" structural guard, and the visual is undrivable in node. Affects `src/shell/render.ts` (`drawTube`/`drawWarp` during warp need an eye-driven expansion; tp1-9 baked the eye into the geometry, so this likely wants a live eye field). Reviewer should eyeball the dive. *Found by Dev during implementation.*
- **Gap** (non-blocking): TEA's `warp-descent-start` re-seat grew audio-dispatch's exhaustiveness table but MISSED the `events.test.ts` union census (16→17 + discriminant arm) and 4 descent-measuring siblings that the fly-in rippled into (`sim.audio-events`, `tp1-23.warp-curwav`, `rom-clock-timing`, `sim.warp-ramp`) plus `sim.events`. Dev re-seated all of them for GREEN (see Design Deviations). Affects `tests/core/*`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the eye fly-in is SILENT — the ROM starts a new space sound (SOUTS3) at the descent bottom (ALWELG.MAC:1037), but `warp-end` stops the rumble there and no fly-in sound is wired (out of scope; TEA finding #4 anticipated this). Affects `src/shell/audio-dispatch.ts` (a future audio story should loop the space sound over the fly-in). *Found by Dev during implementation.*
- **Question** (non-blocking): `WARP_FLYIN_FRAMES = 10` is derived from the eye tracking the cursor 1:1 over `WARP_ALONG_SPAN` (224) during the descent, then flying back at +0x18/frame (`ceil(224/24)`). The truly precise ROM count also depends on `EYLDES` (per-well, ALDISP.MAC:2475), which was not read here — 10 is a faithful approximation, not an exact per-well figure. Affects `src/core/rules.ts`. *Found by Dev during implementation.*
- **Improvement** (non-blocking, round-trip 2 integration): tp1-10's deferred "space sound over the fly-in" finding (above) is now CLOSED — tp1-13 (#120) shipped the T3 space drone (`thrustSpace`) and the unification wires it to `warp-space` at the descent bottom, so the fly-in is no longer silent. The `WARP_FLYIN_FRAMES` (=10) count now also governs the audible T3 drone span, not just the visual fly-in. Affects `src/core/sim.ts`/`src/shell/audio-dispatch.ts`. *Found by Dev during round-trip 2 integration.*
- **Conflict** (non-blocking, round-trip 2 integration): tp1-13's provisional `WARP_SPACE_FRAMES` (=9) was explicitly labelled "tp1-10 owns the authentic camera timing and should replace this constant." It is now REMOVED; `WARP_FLYIN_FRAMES` (=10, ROM-derived) is the single unified second-phase counter. The two stories' post-descent phases (tp1-13 space/drone + tp1-10 eye fly-in) were the SAME phase built twice. Affects `src/core/rules.ts`. *Found by Dev during round-trip 2 integration.*

### Reviewer (code review)
- **Gap** (blocking): the AC-3 starfield-gate test is MUTATION-PROVEN tautological — its `?raw` window matches "progress" in the render comment, not the guard, so reverting the gate to unconditional still passes. Affects `tests/shell/tp1-10.starfield-gate.test.ts` (make mutation-sensitive) and the `src/shell/render.ts` warp-branch comment wording. *Found by Reviewer during code review.*
- **Gap** (non-blocking): two new behaviours are untested (mutation-proven): the fly-in firing-suppression (`flyIn` clause of the warp firing gate) and the `replayWave` player-spawn event. Affects `tests/core/tp1-10.warp-fire.test.ts` and `tests/core/tp1-10.warp-replay.test.ts` (add the missing negative/edge assertions). *Found by Reviewer during code review.*
- **Question** (non-blocking): AC-1's "the camera moves with the Claw" is half-implemented (Claw constant done; well-expansion/moving-eye absent). Needs PM/epic-owner adjudication — ship the partial (follow-up story, à la tp1-9→tp1-31) or require the moving-eye well expansion (likely a live core eye field). Affects `src/shell/render.ts` and the epic AC. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): merge risk — `origin/develop` carries `tp1-32` (#119, "clip tube off-screen framing regression") which also touched `src/shell/render.ts`; SM should watch for a render.ts conflict at finish/merge. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, re-review): AC-1's eye-driven WELL-EXPANSION (the moving-eye zoom so the well rushes past the fixed Claw) is accepted-descoped from tp1-10 — it needs a live core eye field that tp1-9 baked into the geometry. Recommend a FOLLOW-UP story (the tp1-9→tp1-31 pattern). Affects `src/shell/render.ts` + `src/core/geometry.ts`/`state.ts` (re-introduce an eye field). PM/SM to file/confirm at finish. *Found by Reviewer during re-review.*
- **Improvement** (non-blocking, re-review round-trip 2): the "survives a spike crash and pays exactly once" test's docstring oversells its LOCAL coverage — its `wave-bonus count === 1` assertion only spans up to the wave-4 arrival, so the double-pay regression (leftover `startBonus` paying again on the NEXT wave-clear) is caught by a SIBLING test ("fires only for the STARTING wave"), not by this one. Mutation-proven: deleting `s.startBonus = 0` in `beginFlyIn` turns the sibling RED (suite-level guard holds), but this test stays green. No functional risk (behaviour correct, regression guarded); recommend extending it to clear the wave-4 board and dive once more, asserting no second `wave-bonus`. Affects `tests/core/tp1-13.audio-wiring-events.test.ts`. *Found by Reviewer during re-review (test-analyzer, confirmed independently).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC-1 (Claw constant + camera moves) pinned STRUCTURALLY, not behaviourally**
  - Spec source: context-story-tp1-10.md AC-1 (WD-012)
  - Spec text: "The camera moves with the Claw — the Claw's size and screen position stop changing during the dive."
  - Implementation: `render()` calls `document.createElement('canvas')` and is undrivable in vitest's `node` env (vite.config.ts:36), so the on-screen Claw size/position is pinned by `?raw` source guards on `drawWarp` (the repo's own convention — render.warp-dispatch/render.claw are all `?raw`), asserting the depth-shrunk claw (`6 + clawDepth * 14`, `project(...,1 - progress)`) is gone and the fixed rim `clawTransform` is adopted. The pure fixed-claw math is already covered by geometry.claw-transform.test.ts.
  - Rationale: node env cannot execute canvas; matching the established render-test seam beats a brittle jsdom bolt-on. Visual "well expands" is delegated to Reviewer's eyeball + the `?raw` progress-driven-well guard.
  - Severity: minor
  - Forward impact: Dev must route the dive Claw through `clawTransform`; Reviewer should visually confirm the well expands past the fixed Claw.
- **AC-6 defines a NEW core event `warp-descent-start`**
  - Spec source: context-story-tp1-10.md AC-6 (WD-017)
  - Spec text: "The rumble starts on the first descending frame, not at level-clear."
  - Implementation: RED pins a new `GameEvent` `{ type: 'warp-descent-start' }` emitted by the sim on the first descending frame; audio-dispatch starts the sustained loop on it and NO LONGER on `level-clear`. TEA defines the event shape (per the tp1-6 nymph-queue precedent); Dev adds it to the union + the audio-dispatch exhaustiveness switch.
  - Rationale: the ROM starts SOUTS2 only on the first descending frame (silent through the AVOID-SPIKES hold); a dedicated edge event is the faithful, testable seam.
  - Severity: minor
  - Forward impact: `events.ts` union grows by one; audio-dispatch.ts gains a case.
- **AC-3 gate pinned as a ROM constant + `?raw` render guard**
  - Spec source: context-story-tp1-10.md AC-3 (WD-013)
  - Spec text: "The starfield is gated at 29% of the dive."
  - Implementation: pin `WARP_STARFIELD_GATE = (0x50 - 0x10) / WARP_ALONG_SPAN` (= 64/224 ≈ 0.2857) as a pure constant and assert render only draws the starfield during warp when `s.warp.progress >= WARP_STARFIELD_GATE`. Behavioural stroke-count is render-bound (node env), so it is a `?raw` guard.
  - Rationale: the ROM's `CMP I,50` is a byte constant on CURSY; pinning the constant + the render gate is the faithful, checkable seam.
  - Severity: minor
  - Forward impact: `rules.ts` gains one constant; render's warp branch gains a progress guard.
- **AC-2 (eye-fly-in) pinned via mode/level observable, exact frame count deferred**
  - Spec source: context-story-tp1-10.md AC-2 (WD-018)
  - Spec text: "The second phase exists: the eye flies INTO the new well."
  - Implementation: RED asserts the descent completing does NOT resume play on the same frame the new geometry loads — there is ≥1 sim frame where `s.level` is the NEXT wave but `s.mode !== 'playing'` (the fly-in). The exact ROM frame count (EYL +0x18/frame from start to EYLDES, ALWELG.MAC:85-109) is NOT pinned — flagged as a Delivery Finding for Dev to derive.
  - Rationale: ENDWAV increments the wave BEFORE NEWAV2 flies the eye in, so "new level, not-yet-playing" is a ROM-faithful, implementation-agnostic observable; the precise duration needs a ROM read TEA has not yet done.
  - Severity: minor
  - Forward impact: warp gains a post-descent fly-in phase; a follow-up may pin the exact frame count.
- **Sibling re-seats for the two inverted contracts (WD-014, WD-015)**
  - Spec source: context-story-tp1-10.md AC-4 (WD-014) and AC-5 (WD-015)
  - Spec text: "The player can fire during the dive." / "A spike crash REPLAYS THE WAVE."
  - Implementation: `sim.warp.test.ts`'s `'does NOT fire bullets during the warp'` (its intent is now WRONG, not merely mis-positioned) is rewritten to assert firing DOES spawn during the descent. `sim.warp-death-respawn.test.ts` (Story 3-6) asserted a crash ADVANCES to level 2; under WD-015 a crash REPLAYS the same wave (level stays 1, board re-inits so the spike no longer re-crashes), so its crash-path assertions + `runUntilResolved` (which exits on "level leaves 1", impossible under replay) are re-seated to the replay contract. The clean-warp, dodge, normal-death-regression, last-life-gameover, and purity intents are preserved.
  - Rationale: both are genuine contract INVERSIONS the audit ratified against the ROM; TEA owns test maintenance and Dev cannot move goalposts.
  - Severity: major
  - Forward impact: none beyond this story; the re-seated suites encode the new contracts.

### Dev (implementation)
- **AC-2 eye fly-in modelled as a per-frame counter (WARP_FLYIN_FRAMES = 10), not dt-scaled**
  - Spec source: context-story-tp1-10.md AC-2 (WD-018); TEA Delivery Finding "exact fly-in frame count not pinned — Dev to derive"
  - Spec text: "the eye flies INTO the new well" over many frames (NEWAV2, EYL +0x18/frame to EYLDES, ALWELG.MAC:85-109)
  - Implementation: added optional `WarpState.flyIn`; the descent bottom (progress ≥ 1) runs `beginFlyIn` (ENDWAV: `INC CURWAV` + INIENE → loadNextWave) and sets `flyIn = WARP_FLYIN_FRAMES`, mode STAYS 'warp'; each warp step decrements it; at 0 → progress/velocity reset, mode 'playing'. Count derived: the eye tracks the cursor 1:1 over the whole `WARP_ALONG_SPAN` (224) during the descent (EYL += CURSVL, ALWELG.MAC:1049-1057), then flies back at +0x18 (24)/frame → `ceil(224/24) = 10`. Per-frame (the qframe convention, like tp1-31's camera slide), NOT dt-scaled.
  - Rationale: TEA explicitly deferred the exact count to Dev; derived it from the ROM. A frame counter matches the ROM's fixed +0x18/frame walk and the repo's established per-frame animation convention.
  - Severity: minor
  - Forward impact: the precise ROM count depends on EYLDES (per-well), not read here; 10 is a faithful approximation. A follow-up could refine per well.
- **AC-1 well-expansion (moving-eye zoom) DEFERRED; only the test-pinned fixed Claw shipped**
  - Spec source: context-story-tp1-10.md AC-1 (WD-012); TEA Delivery Finding "drawTube/drawWarp during warp must be driven by the moving eye"
  - Spec text: "The camera moves with the Claw — the Claw's size and screen position stop changing during the dive" (and the well expands past it)
  - Implementation: `drawWarp` now draws the dive Claw through `clawTransform` (rim-anchored, constant — the test-pinned half) and dropped the depth-shrunk claw; the starfield is progress-gated. I did NOT ship the moving-eye well-expansion zoom. A first attempt (a progress-driven tube zoom about the vanishing point) required restructuring render()'s main flow and broke `render.warp-dispatch.test.ts`'s deliberate "drawSpikes runs before the warp/else split" structural guard; the visual is also undrivable in node.
  - Rationale: the well-expansion is NOT test-pinned (delegated to Reviewer's eyeball, non-blocking per TEA); forcing it regressed a structural guard and cannot be verified in this env. Shipped the fixed Claw (AC-1 test GREEN) and logged the well-expansion as a Delivery Finding.
  - Severity: minor
  - Forward impact: Reviewer must eyeball the dive; a follow-up may add the eye-driven well zoom (likely a core eye field, which tp1-9 baked into the geometry).
- **AC-4 descent firing also runs resolveSpikeHits (spike-shortening), beyond the strict test surface**
  - Spec source: context-story-tp1-10.md AC-4 (WD-014)
  - Spec text: "The player can fire during the dive" — ROM: FIREPC/MOVCHA every descending frame, "it is how you shorten a spike you are about to land on"
  - Implementation: the warp descent runs `stepFiring` + `stepBullets` + `resolveSpikeHits`. The RED tests assert only that a charge spawns and moves; `resolveSpikeHits` (charges shorten the spikes they reach) is added so firing during the dive is actually functional per WD-014's stated purpose.
  - Rationale: WD-014's whole point is shortening the spike mid-dive; without `resolveSpikeHits` the charges would fly uselessly. No test regresses (warp fixtures carry no spikes on the fired lane).
  - Severity: minor
  - Forward impact: a mid-dive charge can now shorten (and avert a crash on) a spike — the ROM behaviour; unblocks the intent behind tp1-11's restored spike depth.
- **Re-seated sibling tests TEA's warp-descent-start / fly-in change rippled into (re-seat gap)**
  - Spec source: context-story-tp1-10.md AC-2/AC-6 (WD-017, WD-018)
  - Spec text: a new `GameEvent` `warp-descent-start` + a post-descent fly-in that adds ~10 warp-mode frames
  - Implementation: (a) `tests/core/events.test.ts` — added warp-descent-start to `ALL_EVENTS`, the `discriminant()` arm, and bumped the union census 16→17 (adding the union member breaks its `never`-guarded switch at tsc; the sidecar's known GameEvent-exhaustiveness trap — TEA grew audio-dispatch's 17-row table but not this census). (b) `sim.audio-events.test.ts` — re-keyed the single "one warp-end at the dive's end" capture off the leaving-'warp' frame (now the descent-bottom frame stays in 'warp' for the fly-in) onto the warp-end emission frame; intent preserved. (c) `tp1-23.warp-curwav`, `rom-clock-timing`, `sim.warp-ramp` — stop the DESCENT measurement when `warp.flyIn > 0` (the fly-in is not part of the 46-frame/1.62s dive or the speed curve). (d) `sim.events` — kept a board out of the warp path (far-future nymph, the file's own fixture) so its "events clear" frame is a genuine no-op.
  - Rationale: the fly-in is a new ROM-mandated phase; siblings conflated "warp mode" with "the descent." All re-seats are mechanical and assertion-INTENT-preserving; the one semantic re-key (sim.audio-events) keeps "exactly one warp-end, at the descent's end, no bleed."
  - Severity: minor
  - Forward impact: none; the re-seated suites encode the fly-in phase.
- **Round-trip 2: UNIFIED tp1-10's fly-in with tp1-13's warp-space second phase into ONE counter (flyIn), wave++ at the START (ROM ENDWAV-before-NEWAV2)**
  - Spec source: SM Integration Handoff (round-trip 2) + tp1-13 (#120) S-014/S-015; ROM ALWELG.MAC:56-121, 1032-1037
  - Spec text: tp1-13 labelled `WARP_SPACE_FRAMES` "PROVISIONAL... tp1-10 owns the authentic camera timing and should replace this constant"; ROM: ENDWAV increments the wave BEFORE the NEWAV2 fly-in.
  - Implementation: tp1-10 (flyIn, optional, wave++ at START via `beginFlyIn`) and tp1-13 (`inSpace`/`spaceFrames`, REQUIRED, wave++ at END via `advanceLevel`) independently built the SAME post-descent phase with OPPOSITE orderings. Unified to ONE second-phase counter: kept tp1-10's `flyIn` (authoritative ROM ordering), DROPPED `inSpace`/`spaceFrames` and `WARP_SPACE_FRAMES`, removed the now-dead `advanceLevel`, and folded tp1-13's ENDWAV skill-step bonus payment (`wave-bonus` + `awardScore` + clear `startBonus`) into `beginFlyIn` (paid together with INC CURWAV at the bottom-crossing). The descent bottom now emits `warp-space` (T2→T3 drone handover), NOT `warp-end`; `warp-end` moved to the fly-in's END (mode→'playing'). audio-dispatch combined: level-clear silent, warp-descent-start→startLoop levelClear, warp-space→stop levelClear+start thrustSpace, warp-end→stop both, wave-bonus→extraLife, bolt-destroyed→enemyDeath, superzapper-activate silent.
  - Rationale: the SM directed unification (not a plain merge); tp1-13 explicitly deferred the camera timing to this story. The ROM pays ENDWAV (wave++ + bonus) before NEWAV2, so wave++-at-start is the faithful ordering and matches tp1-10's AC-2 ("level is the NEW wave while mode !== 'playing'").
  - Severity: major
  - Forward impact: none open — both stories' contracts are encoded in the unified model; the 6 unified guards (descent-start, fly-in fire-suppression, replay player-spawn, starfield gate, warp-space handover, fly-in-end warp-end) are all mutation-verified RED-on-revert.
- **Round-trip 2: RE-SEATED tp1-13's warp second-phase suites onto the unified flyIn model + wave++-at-start ordering**
  - Spec source: SM Integration Handoff (round-trip 2) — "RE-SEAT tp1-13's 649-line suite onto the unified flyIn model"
  - Spec text: tp1-13's tests asserted the provisional ordering (level does NOT advance at the bottom-crossing; crash ADVANCES the wave)
  - Implementation: (a) `tp1-13.audio-wiring-events.test.ts` "warp-space frame" — re-seated `level === 1` → `level === 2` (ENDWAV advances before the fly-in) while KEEPING tp1-13's "still the warp" intent (mode==='warp'); adjacent warp-end-frame title corrected. (b) same file "survives a spike crash" — re-seated onto tp1-10's crash-REPLAYS model (WD-015): clear the re-armed board on the post-respawn 'playing' frame so a second successful dive off the SAME wave arrives and pays the still-owed bonus once (was tp1-13's crash-ADVANCES assumption). (c) `sim.audio-events.test.ts` "one warp-end" — re-keyed `modeWhenEmitted` from 'warp' (descent bottom) → 'playing' (fly-in end), since warp-end now fires at arrival. (d) `tp1-10.rumble-dispatch.test.ts` warp-end — now stops BOTH loops (idempotent T3 stop added). (e) `events.test.ts` census 16→20; `audio-dispatch.test.ts` merged to the `effects: Effect[]` table (level-clear→null, warp-descent-start added, all tp1-13 rows) + kept BOTH behavioural tests (level-clear-silent AND crashed-dive-no-thrustSpace).
  - Rationale: both stories' test INTENTS are reconciled, neither weakened — tp1-13's "second phase is still the warp / bonus paid once on arrival" and tp1-10's "level is the new wave during the phase / crash replays" coexist in the unified model.
  - Severity: major
  - Forward impact: none; the re-seated suites encode the unified contract.

### Reviewer (audit)

**TEA deviations:**
- **AC-1 pinned STRUCTURALLY not behaviourally** → ✓ ACCEPTED: node env genuinely cannot drive `render()`; the `?raw` claw seam matches the repo convention. (The visual "well expands" half it delegates is separately FLAGGED under Dev's AC-1 deviation.)
- **AC-6 new event `warp-descent-start`** → ✓ ACCEPTED: correctly defined and wired into every exhaustive consumer (audio-dispatch `never` guard + events.test.ts discriminant/census); the edge-once emission is mutation-tested by the rumble suites.
- **AC-3 gate as ROM constant + `?raw` render guard** → ✗ FLAGGED: the CONSTANT is correct (64/224) and ACCEPTED, but the `?raw` guard is MUTATION-PROVEN vacuous — its search window matches "progress" in an adjacent render comment, not the code, so it does not catch the regression it claims to. The deviation's own stated intent ("mutation-checked, fail on current source") is unmet. See [HIGH] [TEST] finding.
- **AC-2 eye-fly-in via mode/level observable, exact frame deferred** → ✓ ACCEPTED (with a LOW caveat): the observable is ROM-faithful; deferring the exact frame count was reasonable at RED, but now that Dev committed to 10 the value should be pinned (LOW finding).
- **Sibling re-seats for the two inverted contracts (WD-014/WD-015)** → ✓ ACCEPTED: mutation-verified SOUND by the test-analyzer — `sim.warp-death-respawn` is strictly STRONGER (adds a spikes-cleared check), not loosened.

**Dev deviations:**
- **AC-2 fly-in as a per-frame counter (WARP_FLYIN_FRAMES = 10)** → ✓ ACCEPTED: ROM-derived (eye tracks the cursor 1:1 over WARP_ALONG_SPAN, flies back at +0x18/frame) and consistent with the repo's qframe/camera-slide convention. Pin the value (LOW finding).
- **AC-1 well-expansion (moving-eye zoom) DEFERRED; only the fixed Claw shipped** → ✗ FLAGGED: this leaves AC-1's "the camera moves with the Claw" half unimplemented and unverifiable (nothing to eyeball). The deferral rationale (broke a structural guard, needs a core eye field) is reasonable, but shipping a half-met AC is a PM/epic-owner call, not a Dev/Reviewer one. Routed to PM. See [FLAG] [SCOPE] finding.
- **AC-4 descent firing also runs `resolveSpikeHits`** → ✓ ACCEPTED: ROM-faithful (MOVCHA + the "shorten the spike you're about to land on" purpose of WD-014); no regression (warp fixtures carry no spike on the fired lane). Correct call to make the feature functional rather than a no-op.
- **Re-seated sibling tests TEA's change rippled into (re-seat gap)** → ✓ ACCEPTED: mutation-verified sound; the events.test.ts census growth, the `sim.audio-events` re-key, and the descent-measuring re-keys all preserve (or strengthen) intent. (The tautological AC-3 starfield test is a DIFFERENT TEA test defeated by a Dev render comment — see the [HIGH] finding, not this deviation.)

**Re-review (round-trip 1) reconciliation:**
- The round-1 [HIGH] tautological-guard flag is RESOLVED — the rework made the AC-3 starfield test mutation-sensitive + comment-proof (re-review test-analyzer verified the reversion → RED, and it is not comment-gameable).
- **AC-1 well-expansion DEFERRED** (Dev deviation) → previously ✗ FLAGGED; on re-review now ✓ ACCEPTED as a follow-up descope (NOT a blocker): the explicit AC observable is implemented + mutation-tested, motion reads via the streak effect, and the geometric well-expansion needs a live core eye field (a separate story, tp1-9→tp1-31 precedent). Escalated to PM/SM as a follow-up (see Delivery Findings). All other deviations' round-1 stamps stand.

**Re-review (round-trip 2 — integration) audit of the two Dev integration deviations:**
- **UNIFIED tp1-10's fly-in with tp1-13's warp-space into ONE counter (flyIn), wave++ at the START (ROM ENDWAV-before-NEWAV2)** → ✓ ACCEPTED by Reviewer: this is the correct disposition of a same-phase-built-twice collision. tp1-13 itself labelled `WARP_SPACE_FRAMES` provisional-pending-tp1-10, so dropping it for `flyIn` honours the sibling's own intent, not a unilateral overrule. The ROM ordering (INC CURWAV + BONPTM payment at ENDWAV, before NEWAV2's fly-in) is authoritative and matches tp1-10's AC-2. Mutation-verified sound: the warp-space handover, the fly-in-end warp-end, and the folded bonus payment each go RED on revert (test-analyzer + my own independent reversions). Core purity + determinism intact ([SEC] confirms `awardScore` in `beginFlyIn` draws no RNG); `advanceLevel` correctly removed (dead). No double wave++ path.
- **RE-SEATED tp1-13's warp second-phase suites onto the unified flyIn model + wave++-at-start ordering** → ✓ ACCEPTED by Reviewer: mutation-verified NOT weakened. The "warp-space frame" re-seat (`level === 1` → `level === 2`) is STRENGTHENED — it still pins BOTH `mode === 'warp'` AND the advanced level, and commenting out `s.level += 1` in loadNextWave turns it RED (test-analyzer). The crash-survival re-seat correctly adapts to tp1-10's crash-REPLAYS model (WD-015, the tp1-11 gate) and still proves the bonus is paid once on arrival. Both stories' test INTENTS coexist; neither is gutted. One LOW test-locality nit noted (double-pay coverage is suite-level, not test-local) — see [TEST] finding + Delivery Findings; non-blocking.

## Sm Assessment

**Diagnosis:** tp1-10 (Cluster C6; subsumes WD-010/012/013/014/015/017/018) is an 8-pt p1 dive-camera rework. Both hard dependencies are satisfied — **tp1-1** (warp velocities) `done`, **tp1-9** (movable eye) `done` — so this story is clear to run.

**Why it matters downstream:** AC "a spike crash REPLAYS THE WAVE" is the **hard gate that unblocks tp1-11** (restore SPIKE_MAX_DEPTH to the ROM's 0.929). If the replay does not demonstrably work, tp1-11 stops and returns to the PM. Do not weaken this AC.

**Merge-gate note:** Before setup, closed stale PR **#116** (`feat/tp1-31-framing-zadjl-screen-z`) — a superseded parallel-checkout duplicate of tp1-31, which already merged via #115 and shipped in v1.0.13. No open blocking PRs remain.

**Quarry pointers for TEA (where the primary source + prior-art seams live — not implementation direction):**
- The travelling eye is **pre-extracted** in `sprint/archive/tp1-9-session-superseded-a1.md` (the "tp1-10 quarry" Improvement): `ALWELG.MAC:85-91` — `LDA EYL / CLC / ADC I,18` = +0x18 world units/frame toward `EYLDES`; starfield cut via `PLAGRO` once the eye passes `0xFC` (≈ the "29% of the dive" gate); `CHKDEP` at `ALDISP.MAC:2766-2788`; `DSPENL` aborts spike draw once `EYL >= 0xF0` (`ALDISP.MAC:3000-3006`). Subtlety: `INIWLS` freezes `YDEUNI` at `16+H` — the ROM does NOT recompute scale as the eye moves.
- The camera state seam is `s.camera`, extended by tp1-31 (see `sprint/archive/tp1-31-session.md` — "tp1-10's dive camera will extend the same `s.camera` seam"; mid-slide respawn snap was left unpinned and carried to this story).
- Primary source is citable at `~/Projects/tempest-source-text` (the CRLF sibling `~/Projects/tempest-source` is NOT citable). `npm test -- citations` must stay green.

**Routing:** Setup complete and verified on disk (session, branch `fix/tp1-10-warp-dive` in tempest off origin/develop, story `in_progress`, epic context not clobbered). Handing off to **Imperator Furiosa (TEA)** for the RED phase.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 8-pt p1 fidelity bug with six ROM-ratified contract changes (WD-012/013/014/015/017/018) + a citation-stamp AC. Not a chore bypass.

**Test Files (new):**
- `tests/core/tp1-10.warp-fire.test.ts` — AC-4 (WD-014): firing + charge motion during the descent; no-fire during the AVOID-SPIKES hold; no bullet-wipe on entry.
- `tests/core/tp1-10.warp-replay.test.ts` — AC-5 (WD-015): a spike crash REPLAYS the same wave (the hard gate for tp1-11), board re-init, no drain, last-life gameover, determinism.
- `tests/core/tp1-10.warp-flyin.test.ts` — AC-2 (WD-018): a multi-frame eye fly-in exists (new well loaded, play deferred); converges to play.
- `tests/core/tp1-10.warp-rumble.test.ts` — AC-6 (WD-017): `warp-descent-start` emitted once on the first descending frame, silent through the hold, not at entry.
- `tests/shell/tp1-10.rumble-dispatch.test.ts` — AC-6 shell: loop starts on `warp-descent-start`, not `level-clear`.
- `tests/shell/tp1-10.starfield-gate.test.ts` — AC-3 (WD-013): `WARP_STARFIELD_GATE = 64/224`; render gates the starfield on dive progress.
- `tests/shell/tp1-10.warp-camera.test.ts` — AC-1 (WD-012): dive Claw rim-anchored & fixed (`?raw` on drawWarp — render is undrivable in node).
- `tests/audit/tp1-10.citations.test.ts` — AC-7: WD-012/013/014/015/017/018 stamped `remediated_by: tp1-10` (WD-010 excluded — already tp1-23).

**Test Files (re-seated — two INVERTED sibling contracts):**
- `tests/core/sim.warp.test.ts` — "does NOT fire during warp" → "DOES fire during the descent" (WD-014).
- `tests/core/sim.warp-death-respawn.test.ts` — Story 3-6 "crash ADVANCES to level 2" → "crash REPLAYS level 1" (WD-015); rewrote `runUntilResolved` (which exited on "level leaves 1", impossible under replay) → `runUntilSettled`. Preserved: no-drain, clean-warp-advances, dodge, normal-death-same-level, last-life-gameover, purity.
- `tests/shell/audio-dispatch.test.ts` — rumble moved off `level-clear` onto `warp-descent-start`; exhaustiveness table 16 → 17.

**Tests Written:** 36 new tests across 8 files + 3 re-seated suites, covering all 7 ACs.
**Status:** RED (verified) — full suite **35 failing / 1165 passing (1200)**; every failure confined to the 11 touched files, each confirmed to fail for the right reason (unstamped findings → `undefined`; shrinking claw present; `level 2` where replay wants `1`; descent-start count `0`; gate constant `undefined`; no firing). The 10 green-today assertions are intended keep-behaviour guards (no-fire-during-hold, one-life-cost, gameover, determinism, converges, no-descent-at-entry), not accidental passes.

### Rule Coverage

| Lang-review check (typescript.md) | Applicability / Coverage | Status |
|---|---|---|
| #3 enum/switch exhaustiveness | New event `warp-descent-start` forces the audio-dispatch `never` guard + the 17-row exhaustiveness table (audio-dispatch.test.ts) | pinned |
| #8 test quality (no vacuous asserts) | Self-checked every new test — no `let _ =`, no `assert(true)`, no always-null; `?raw` guards are mutation-checked (fail on current source) | pass |
| #4 null/undefined handling | Fixtures use fully-defined states; no `\|\|`-vs-`??` in tests | pass |
| #1,#2,#5,#6,#7,#9,#10,#11,#12,#13 | N/A to a pure-sim RED test surface, or GREEN-phase Dev-implementation concerns (tsc/lint enforced) | n/a |

**Rules checked:** the lang-review checks applicable to a pure-sim test surface (#3, #4, #8) are covered; the rest are Dev/GREEN concerns.
**Self-check:** 0 vacuous tests. Two `as unknown as GameEvent` casts (rumble-dispatch, audio-dispatch) construct the not-yet-existing `warp-descent-start` event — intentional RED scaffolding, removable once Dev adds it to the union (they are NOT assertion-fudging casts).

**Testability note:** AC-1 (Claw pixels constant / well expands) and AC-3 (starfield stroke gating) are render properties vitest's `node` env cannot execute (render() needs a canvas), so they are pinned via the repo's established `?raw` source-guard convention + pure constants; the visual "well expands" is delegated to Reviewer's eyeball (see Design Deviations + Delivery Findings).

**Handoff:** To **The Word Burgers (Dev)** for GREEN — make the 35 failing tests pass with minimal, ROM-faithful implementation, then stamp the six findings `remediated_by: tp1-10` and reanchor the pair-9 citations before committing (tempest/CLAUDE.md citation-gate rules).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed (source):**
- `src/core/rules.ts` — added `WARP_STARFIELD_GATE` (64/224, WD-013) and `WARP_FLYIN_FRAMES` (10, WD-018).
- `src/core/state.ts` — added optional `WarpState.flyIn` (post-descent eye fly-in frames; optional so the suite's 3-field warp literals still type-check).
- `src/core/events.ts` — added `WarpDescentStartEvent` (`warp-descent-start`) + union member (WD-017).
- `src/core/sim.ts` — descent now fires + moves charges + shortens spikes (WD-014); `checkLevelClear` no longer wipes bullets on entry; `stepWarp` emits `warp-descent-start` on the first descending frame, adds the fly-in phase (`beginFlyIn`/`loadNextWave`), and a spike crash `replayWave`s the SAME level instead of advancing (WD-015).
- `src/shell/audio-dispatch.ts` — sustained warp loop moved off `level-clear` onto `warp-descent-start` (WD-017).
- `src/shell/render.ts` — dive Claw drawn rim-anchored & fixed via `clawTransform` (dropped the depth-shrink); starfield gated on `WARP_STARFIELD_GATE` (WD-012/WD-013).

**Files Changed (audit / citations):**
- `docs/audit/findings/pair-9-warp-drop-mode.json` — stamped WD-012/013/014/015/017/018 `remediated_by: tp1-10` (WD-010 stays tp1-23, WD-016 stays OPEN).
- `docs/audit/findings/pair-7-alexec-state-cadence.json` — re-anchored P7-004 (accepted STRUCTURAL finding) onto the re-spelled `progress` comment; finding stays open.
- All `pair-*.json` — `reanchor-citations.mjs --write` corrected line numbers for citations in the touched files (0 LOST).

**Files Changed (test re-seats — TEA re-seat gap, see Design Deviations):**
- `tests/core/events.test.ts`, `tests/core/sim.audio-events.test.ts`, `tests/core/tp1-23.warp-curwav.test.ts`, `tests/core/rom-clock-timing.test.ts`, `tests/core/sim.warp-ramp.test.ts`, `tests/core/sim.events.test.ts`.

**Tests:** 1200/1200 passing (GREEN) — the 35 RED tests now pass; full suite green. `tsc --noEmit` clean; `npm run build` clean; `npm test -- citations` green (AC-7).
**Branch:** fix/tp1-10-warp-dive (pushed)

**Handoff:** To **Imperator Furiosa (TEA)** for the verify phase. Note the well-expansion visual (AC-1) is delegated to Reviewer's eyeball (Delivery Finding) and the fly-in is silent pending a future space-sound story.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1200/1200 tests, tsc clean, build clean, citations 19/19, tree clean, no debug residue |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — domain self-covered (see Devil's Advocate + edge notes) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — domain self-covered (no swallowed errors; `?? 0` is a default, not a swallow) |
| 4 | reviewer-test-analyzer | Yes | findings | 6 | confirmed 6 (1 High, 2 Medium, 2 Low, 1 Flag), dismissed 0 — re-seats mutation-verified SOUND |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — domain self-covered (1 LOW stale-comment noted) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — domain self-covered (optional `flyIn` field reviewed, sound) |
| 7 | reviewer-security | Yes | clean | none | N/A — client-only game; core purity intact, no OOB/unhandled-throw, boundary unbreached |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — domain self-covered (no over-engineering; minor `?? 0` repetition, not flagged) |
| 9 | reviewer-rule-checker | Yes | findings | 5 | confirmed 5 (all LOW dead `as unknown as` casts; corroborates test-analyzer #6). All other rules compliant |

**All received:** Yes (4 ran, 5 disabled-and-self-covered; 3 returned findings)
**Total findings:** 7 confirmed (1 High, 2 Medium, 3 Low, 1 Flag), 0 dismissed, 0 deferred (rule-checker's 5 casts and test-analyzer's #6 are the SAME finding)

## Reviewer Assessment

**Verdict:** REJECTED

The implementation is high-quality and ROM-faithful — all six WD findings are functionally delivered, the core/shell purity is intact, the citation gate is green, and (critically) the nine sibling test re-seats were MUTATION-VERIFIED sound by the test-analyzer (not goalpost-moving; `sim.warp-death-respawn` is strictly stronger). The tp1-11 gate (spike-crash REPLAYS the wave) genuinely works. **But independent mutation testing proved a vacuous guard on an AC and two untested new behaviours**, and AC-1 is functionally half-implemented. In an epic whose whole discipline is verifiable guards ("a guard must be mutation-tested — or it's scenery"), I will not certify proven-inadequate verification.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [TEST] | AC-3 starfield-gate test is MUTATION-PROVEN TAUTOLOGICAL. Its `?raw` 240-char window before `drawStarfield(pctx` matches the word "progress" in the adjacent render COMMENT, not the code guard — reverting the real gate (`if (s.warp.progress >= WARP_STARFIELD_GATE)`) to the pre-tp1-10 unconditional `drawStarfield(...)` STILL passes all 4 tests. AC-3 has no working regression protection. | `tests/shell/tp1-10.starfield-gate.test.ts:41` (defeated by `src/shell/render.ts` comment ~lines 993-995) | Make it mutation-sensitive: strip comments from the searched window, OR extract a `shouldDrawStarfield(s)` boolean and unit-test it, OR reword the render comment so "progress" appears ONLY in the guard code within the window. Verify by reverting the gate → test must go RED. |
| [MEDIUM] [TEST] | Fly-in firing-suppression is UNTESTED. The warp firing gate `s.warp.warning === 0 && (s.warp.flyIn ?? 0) === 0` suppresses firing during the fly-in (WD-014's own comment says so), but mutation-proven: dropping the `flyIn` clause keeps all 1200 green. Only the AVOID-SPIKES-hold half is covered. | `src/core/sim.ts` warp case firing gate; add to `tests/core/tp1-10.warp-fire.test.ts` | Add a test: drive `warp.flyIn > 0`, fire, assert no bullet spawns (mirror the existing hold test). |
| [MEDIUM] [TEST] | `replayWave` player-spawn event is UNTESTED. Mutation-proven: deleting the emit at sim.ts leaves all behavioral tests green (only the citation line-anchor shifts). None of the 5 warp-replay cases assert it. | `src/core/sim.ts:798`; `tests/core/tp1-10.warp-replay.test.ts` | Assert a `player-spawn` event fires on the crash-replay respawn. |
| [LOW] [TEST] | `WARP_FLYIN_FRAMES` (=10) value is unpinned. `tests/core/tp1-10.warp-flyin.test.ts`'s strongest assert is `heldFrames >= 1`, so any nonzero value passes — AC-2's numeric fidelity has zero coverage (self-disclosed as a TEA finding). | `src/core/rules.ts` + `tests/core/tp1-10.warp-flyin.test.ts` | Pin `expect(WARP_FLYIN_FRAMES).toBe(10)` or assert the exact held-frame count. |
| [LOW] [RULE] [TYPE] | 5 dead `as unknown as` double-casts — RED scaffolding never cleaned after `warp-descent-start` entered the union. Recompile-proven removable (rule-checker + test-analyzer, high confidence). Matches lang-review #1 ("`as unknown as T` almost always wrong") — cannot be dismissed, only downgraded. | `tests/shell/audio-dispatch.test.ts:93,152`; `tests/shell/tp1-10.rumble-dispatch.test.ts:27,33,46` | Delete the casts; let tsc verify the literal shapes directly. |
| [FLAG] [SIMPLE] [SCOPE] | AC-1 "the camera moves with the Claw" is HALF implemented: the Claw-constant half is done + mutation-tested; the well-expansion / moving-eye half is NOT implemented (`drawTube` is called identically regardless of `s.warp.progress`). Documented as a Dev deviation + delegated to "Reviewer's eyeball" — but there is nothing to eyeball. Needs a PM/epic-owner call: accept the partial (follow-up story, à la tp1-9→tp1-31) or require implementation (likely needs a live core eye field, which tp1-9 baked into geometry). | `src/shell/render.ts` (drawTube/drawWarp during warp) | PM/epic-owner adjudication. See Design Deviations audit. |

### Subagent finding disposition (tagged)

- [PREFLIGHT] clean — 1200/1200, tsc, build, citations 19/19, tree clean, no debug residue. CONFIRMED clean.
- [SEC] clean — client-only game; verified NO core-purity/determinism breach (no Date/Math.random/DOM/shell-import in src/core changes), no XSS surface, no new OOB or unhandled-throw (`s.spikes[lane]` always wrapped via currentLane; `s.warp.flyIn` always read `?? 0`). CONFIRMED clean.
- [RULE] 5 findings — all the dead `as unknown as` casts (LOW). Exhaustiveness (audio-dispatch + events.test.ts discriminant), null-handling (`flyIn ?? 0` everywhere), module rules, and the citation gate (6 WD stamps correct, WD-010=tp1-23, WD-016 open, `ours` names tracked files) all CONFIRMED compliant.
- [TEST] 6 findings — 1 High (tautological AC-3 guard), 2 Medium (fly-in no-fire, replay player-spawn — both mutation-proven), 1 Low (WARP_FLYIN_FRAMES unpinned), 1 Low (casts, dup of RULE), 1 Flag (AC-1 half). The 9 re-seats mutation-verified SOUND. CONFIRMED.
- [EDGE] self-covered (subagent disabled): array bounds on `s.spikes[b.lane]`/`s.spikes[lane]` are currentLane-wrapped; `flyIn` boundary (10→0→mode playing) has no negative/NaN path (decrement guarded by `> 0` first); a hypothetical 1-frame descent could emit warp-descent-start+warp-end same frame (net-silent, harmless — level-1 descent is 46 frames so unreachable in practice). No blocking edge finding.
- [SILENT] self-covered (subagent disabled): no try/catch added, no swallowed errors; `?? 0` is a legitimate default not an error-swallow; the firing gate skipping during hold/fly-in is intentional, signposted behaviour. No finding.
- [DOC] self-covered (subagent disabled): LOW — the `stepWarp` header comment (sim.ts ~843-848) still says "on arrival (progress ≥ 1) the level advances" without mentioning the new fly-in phase. Minor staleness; note for the rework.
- [SIMPLE] self-covered (subagent disabled): no over-engineering; `beginFlyIn`/`loadNextWave`/`replayWave` split is justified (different level/mode/lane semantics). Minor `(s.warp.flyIn ?? 0)` repetition (4×) could be a local const — not worth flagging. The AC-1 well-expansion FLAG is the only [SIMPLE]-adjacent scope item.

### Rule Compliance (lang-review typescript.md + tempest CLAUDE.md)

- **#1 type-safety escapes:** VIOLATION — 5 dead `as unknown as` casts (test files only, LOW; see table). Non-test diff: no casts, no @ts-ignore, no unsafe non-null. 
- **#3 exhaustiveness:** COMPLIANT — `warp-descent-start` wired into every exhaustive switch over GameEvent: `audio-dispatch.ts` (case + `never` guard intact) and `events.test.ts` discriminant (case + census 16→17 + exact-set). `main.ts` has no event switch (delegates); `fx.ts` uses `if` chains (not exhaustive). Verified `_exhaustive: never` at audio-dispatch.ts:90. 
- **#4 null/undefined:** COMPLIANT — new optional `WarpState.flyIn` read `?? 0` at every site (sim.ts warp case + stepWarp + the 3 re-seated timing tests); no `||`-on-0 bug; `cloneState` spreads `warp` so `flyIn` is cloned (purity preserved). 
- **#5 module/declaration:** COMPLIANT — `WARP_FLYIN_FRAMES`/`WARP_STARFIELD_GATE` imported as runtime values (not `import type`); `WarpDescentStartEvent` is `export interface`, consumed via `import type`. 
- **#8 test quality:** VIOLATION — the tautological AC-3 guard (HIGH) + coverage gaps (MEDIUM) + dead casts (LOW). This is the crux of the rejection. 
- **CLAUDE.md core purity (the hard boundary):** COMPLIANT — src/core/{sim,state,events,rules}.ts introduce no Date/new Date/performance.now/Math.random/rAF/DOM/window/document and no shell import; new RNG-free logic; `stepGame` stays pure (the warp-death-respawn purity test passes). Independently confirmed by [SEC] and [RULE]. 
- **CLAUDE.md tube-space positions:** COMPLIANT — no screen-space leaked into core. 
- **CLAUDE.md citation gate:** COMPLIANT — WD-012/013/014/015/017/018 stamped `remediated_by: tp1-10`; WD-010 stays tp1-23; WD-016 stays open; P7-004 re-anchored (stays open); `ours` names tracked repo files; `npm test -- citations` 19/19 green.

### Data flow traced

`input.fire` during the warp descent → `stepGame` 'warp' case (gate: `warning === 0 && (flyIn ?? 0) === 0`) → `stepFiring` pushes `{lane: currentLane(...), depth: 1}` + a `fire` event → `stepBullets` advances depth → `resolveSpikeHits` shortens any spike the charge reaches (WD-014 purpose) → `stepWarp` may `resolveWarpSpikeHit` (crash) or `beginFlyIn` (arrival). Safe: `lane` is currentLane-wrapped, so `s.spikes[lane]` never OOBs; on `beginFlyIn`/`replayWave`, `startLevel` clears `s.bullets` so no stale lane index survives a tube resize. VERIFIED — evidence: sim.ts warp case + stepFiring:100-102 + resolveSpikeHits:488-491.

### Wiring

`warp-descent-start` (core, sim.ts:872) → `audio-dispatch.ts:50` `startLoop('levelClear')`; `warp-end` (sim.ts:836/884) → `stopLoop('levelClear')`. `WARP_STARFIELD_GATE` (rules.ts) → render.ts warp branch. `main.ts` pumps events into `playEventSounds` + `fx.detect` unchanged. VERIFIED — the new event reaches the shell; the rumble spans descent-start→warp-end (silent through the hold, per the audio-dispatch test).

### Error handling / hard questions

Null/empty/huge inputs into the warp path: `flyIn` undefined ≡ 0 (safe); a 1-frame descent is harmless; a crash on the last life → gameover (tested); parking on a spiked lane costs exactly one life then replays (tested — the drain loop is dead). No timeouts/races (single-threaded deterministic sim). Tenant isolation: N/A (client-only game, no tenant data). VERIFIED via warp-replay + warp-fire suites (behaviour) — but see [TEST] gaps for what the suite does NOT cover.

### Challenge of VERIFIEDs

I marked core-purity, exhaustiveness, and the citation gate VERIFIED. [SEC] and [RULE] independently corroborate purity + exhaustiveness (no contradiction). The one place a subagent contradicts a naive "it's tested" VERIFIED is [TEST]: the AC-3 gate and the fly-in/replay behaviours are correct in CODE but mutation-proven UNVERIFIED by tests — so I did NOT mark those VERIFIED; they are the findings. No VERIFIED stands against a subagent finding.

### Devil's Advocate

Argue this code is broken. First, the AC-3 starfield gate: the code is right today, but its ONLY guard is a text search that a maintainer's innocent comment edit already defeated — so the next person who "optimises" the warp branch and drops the `if (progress >= GATE)` ships a starfield that flashes on at the rim through the AVOID-SPIKES hold, and every test stays green. That is not hypothetical; the test-analyzer performed exactly that reversion and the suite passed. A guard that cannot fail is worse than no guard, because it manufactures false confidence — precisely the "scenery" this epic's sidecar warns is a repeat offender. Second, the fly-in firing suppression: a future refactor that "simplifies" the gate to `warning === 0` re-enables firing during the eye fly-in — charges spawning while the player is supposed to be a passenger flying into the new well — and nothing catches it. Third, the replay path emits a player-spawn the audio layer will sound; if someone removes it (thinking it redundant), the crash-replay respawn goes silent and no test notices. Fourth, AC-1: a player reading the acceptance criterion "the camera moves with the Claw" boots the dive and sees a Claw pinned to a STATIC well — the well does not rush outward, so the headline sensation of the ROM warp is absent; a confused reviewer told "eyeball the well expanding" finds nothing to eyeball. Fifth, a stressed maintainer merging tp1-32 (which also touched render.ts framing) onto this branch could silently conflict with the warp branch's drawTube call site. None of these are runtime crashes today — the implementation is genuinely correct — but the STORY'S OWN NEW BEHAVIOUR is under-guarded, and that is the exact failure mode the reviewer exists to stop before it reaches a green-forever main.

### Observations (>=5)

1. [HIGH] [TEST] tautological AC-3 guard — mutation-proven (see table).
2. [MEDIUM] [TEST] fly-in no-fire uncovered — mutation-proven.
3. [MEDIUM] [TEST] replay player-spawn uncovered — mutation-proven.
4. [VERIFIED] the 9 sibling re-seats are sound (not goalpost-moving) — evidence: test-analyzer mutation-verified `sim.warp-death-respawn` adds a strictly-stronger `spikes.every(h=>h===0)` check and `sim.events` narrows the fixture rather than loosening a bound.
5. [VERIFIED] core purity intact — evidence: no forbidden tokens/shell imports in src/core changes ([SEC]+[RULE] confirm); `stepGame` purity test green.
6. [VERIFIED] citation gate correct — evidence: 6 WD stamps + WD-010/WD-016 handling + 19/19 citations green.
7. [LOW] [DOC] stale `stepWarp` header comment (omits the fly-in phase).
8. [FLAG] [SCOPE] AC-1 well-expansion half unimplemented — PM adjudication.

**Handoff:** Back to the pipeline for rework — routing to **Imperator Furiosa (TEA)** (findings are test-authoring: harden the AC-3 guard, add fly-in/replay coverage, pin WARP_FLYIN_FRAMES, drop the dead casts). The AC-1 well-expansion FLAG needs **Aunty Entity (PM)** adjudication (ship partial vs. follow-up story). The implementation code itself is sound — this is a verification-integrity + AC-completeness rejection, not a logic-bug rejection.

## Dev Assessment (rework — round-trip 1)

**Rework Complete:** Yes — all test-authoring findings addressed; implementation code UNCHANGED (it was correct). Each fix was MUTATION-VERIFIED (revert the guarded code → the test goes RED → restore).

**Findings addressed:**
- **[HIGH] AC-3 tautological guard** → `tests/shell/tp1-10.starfield-gate.test.ts` now strips line-comments from the `?raw` window and matches the actual guard expression `s.warp.progress >= WARP_STARFIELD_GATE` (comment-proof). Mutation-verified: reverting the render gate to an unconditional `drawStarfield(...)` turns it RED (2/4 fail); before, all 4 stayed green. The companion constant-reference test was also strengthened to require the constant in a `>=` comparison (not just an import).
- **[MEDIUM] fly-in no-fire untested** → added to `tests/core/tp1-10.warp-fire.test.ts`. Mutation-verified: dropping the `(s.warp.flyIn ?? 0) === 0` clause of the warp firing gate turns it RED.
- **[MEDIUM] replayWave player-spawn untested** → added to `tests/core/tp1-10.warp-replay.test.ts`. Mutation-verified: deleting the `player-spawn` emit in replayWave turns it RED.
- **[LOW] WARP_FLYIN_FRAMES unpinned** → `tests/core/tp1-10.warp-flyin.test.ts` now pins `WARP_FLYIN_FRAMES === 10` AND `heldFrames === WARP_FLYIN_FRAMES`.
- **[LOW] 5 dead `as unknown as` casts** → removed from `audio-dispatch.test.ts` (×2) and `tp1-10.rumble-dispatch.test.ts` (×3); dropped the now-unused `GameEvent` import from rumble-dispatch. tsc clean.

**NOT addressed (needs a decision, not a Dev fix):**
- **[FLAG] AC-1 well-expansion / "camera moves"** — still only the Claw-constant half is implemented. This is a scope question the Reviewer routed to PM (ship the partial as a follow-up story à la tp1-9→tp1-31, or require the moving-eye well expansion which needs a live core eye field tp1-9 baked into the geometry). Dev cannot unilaterally make this call — **flagged for Aunty Entity (PM) / SM adjudication.** If the answer is "implement now," it is likely a fresh story's worth of eye-field work.

**Deviations (rework):** No NEW spec deviations — the rework is test-hardening only; the prior `### Dev (implementation)` deviations still stand (AC-1 deferral is now the open PM item above).

**Tests:** 1203/1203 passing (was 1200 + 3 new coverage tests). `tsc --noEmit` clean; citations green. Working tree clean.
**Branch:** fix/tp1-10-warp-dive (pushed — commit 0a8623f).

**Handoff:** To **Immortan Joe (Reviewer)** for re-review. The two blocking-class test-integrity findings are fixed and mutation-proven; only the AC-1 well-expansion scope question remains open (PM/SM call).

## Subagent Results (re-review — round-trip 1)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1203/1203, tsc clean, build clean, citations 19/19, tree clean, delta test-only |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — self-covered (test-only delta, no new paths) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — self-covered (no src change) |
| 4 | reviewer-test-analyzer | Yes | findings | 0 open | MUTATION-VERIFIED all 5 round-1 findings genuinely FIXED (each reversion → RED); no new issues |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — self-covered |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — self-covered (cast removals reviewed, sound) |
| 7 | reviewer-security | Yes | clean | none | N/A — delta test-only, zero src touched, no new surface |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — self-covered (cast removal is a simplification) |
| 9 | reviewer-rule-checker | Yes | clean | 0 | All 5 casts confirmed gone (pure removals); tsc clean; no unused imports; new tests comply with #1/#4/#8 |

**All received:** Yes (4 ran, 5 disabled-and-self-covered; test-only rework delta)
**Total findings:** 0 open — all 5 round-1 findings mutation-verified closed; 0 new

## Reviewer Assessment (re-review — round-trip 1)

**Verdict:** APPROVED

The round-1 rejection was for verification integrity (a mutation-proven tautological AC-3 guard + two untested new behaviours + dead casts), not a logic bug. The rework (commit 0a8623f, test-files-only, implementation UNCHANGED) closed every one, and all four re-review specialists — running independent MUTATION tests — confirm the fixes are genuine, not merely green:

- [TEST] all 5 round-1 findings MUTATION-VERIFIED fixed: reverting the render starfield gate → the (now comment-stripped, expression-matching) starfield-gate test goes RED; dropping the `flyIn` clause → the new fly-in no-fire test goes RED; deleting the replayWave `player-spawn` emit → the new replay test goes RED; setting `WARP_FLYIN_FRAMES` to a wrong value → the flyin test goes RED. The test-analyzer even probed whether the starfield fix is gameable by reintroducing the guard expression as a COMMENT — it is not (the fix strips comments before matching). CONFIRMED.
- [RULE] 0 violations — all 5 dead `as unknown as` casts are pure removals (none re-added elsewhere); `tsc --noEmit` exit 0 (no cast masked a real type error); no unused imports (`noUnusedLocals` clean; `GameEvent` correctly dropped from rumble-dispatch, retained where still used in audio-dispatch). CONFIRMED compliant.
- [SEC] clean — delta touches zero src files; no core/shell purity concern, no new surface. CONFIRMED.
- [PREFLIGHT] 1203/1203 tests, tsc, build, citations 19/19, tree clean, no debug residue. CONFIRMED.
- [EDGE] self-covered (disabled): no new code paths (test-only). [SILENT] self-covered: no error handling changed. [DOC] self-covered: the new test comments are accurate mutation-guard notes. [TYPE] self-covered: the cast removals TIGHTEN typing (structural checking now applies to the literals). [SIMPLE] self-covered: the rework is net-simplifying (dead casts + unused import removed).

| Severity | Issue | Location | Status |
|----------|-------|----------|--------|
| [HIGH] [TEST] | tautological AC-3 starfield guard | tests/shell/tp1-10.starfield-gate.test.ts | ✅ FIXED (mutation-verified RED on gate reversion; not comment-gameable) |
| [MEDIUM] [TEST] | fly-in no-fire untested | tests/core/tp1-10.warp-fire.test.ts | ✅ FIXED (mutation-verified) |
| [MEDIUM] [TEST] | replay player-spawn untested | tests/core/tp1-10.warp-replay.test.ts | ✅ FIXED (mutation-verified) |
| [LOW] [TEST] | WARP_FLYIN_FRAMES unpinned | tests/core/tp1-10.warp-flyin.test.ts | ✅ FIXED (pins value + tracking) |
| [LOW] [RULE] [TYPE] | 5 dead `as unknown as` casts | audio-dispatch/rumble-dispatch tests | ✅ FIXED (removed; tsc clean) |
| [FLAG] [SIMPLE] [SCOPE] | AC-1 well-expansion half unimplemented | src/shell/render.ts | ➡️ ACCEPTED as a follow-up descope — see below + Delivery Findings; NOT a blocker |

### AC-1 well-expansion disposition (the one open FLAG)

On reflection this round I am ACCEPTING the AC-1 partial rather than looping the pipeline: (1) the AC's explicit observable — "the Claw's size and screen position stop changing during the dive" — IS implemented and mutation-tested (drawWarp via clawTransform); (2) motion INTO the well is conveyed by the existing progress-scaled speed-streak effect (render.ts:878-896), so the dive reads on screen; (3) the geometric well-EXPANSION (a moving-eye zoom) requires a live core eye field that tp1-9 deliberately baked into the geometry — re-introducing one is a substantial, separate piece of work, exactly the render-visual-follow-up pattern the epic already used (tp1-9 → tp1-31); (4) it is a fidelity ENHANCEMENT, not a Critical/High defect, and every gameplay/mechanical AC (fire-during-dive, the tp1-11 replay hard-gate, descent rumble, fly-in, starfield gate) is correct and mutation-tested. Rejecting again over a scope question that neither Dev nor Reviewer can resolve (it needs PM) would be a pointless loop. I therefore APPROVE the implemented scope and recommend a follow-up story for the eye-driven well expansion — flagged to Aunty Entity (PM) / the SM at finish (Delivery Findings).

### Data flow / wiring / error handling / security / hard questions

Unchanged from the round-1 assessment above (implementation code did not change this round) — all VERIFIED there and re-confirmed clean by [SEC]/[RULE]/[PREFLIGHT]. Tenant isolation: N/A (client-only game).

### Devil's Advocate (re-review)

Could the rework be theatre — green but still not actually guarding? That was the whole round-1 failure mode, so I did not trust "it's green." The test-analyzer performed the exact reversions the findings named and confirmed RED for all five, and additionally attacked my own starfield fix (reintroduce the expression as a comment) to check it isn't gameable — it held. Could the cast removals have hidden a type error behind `noUnusedLocals` or a masked mismatch? tsc exit 0 across repeated runs (a transient TS6133 was correctly traced to a concurrent mutation process, not the committed tree — md5 of render.ts matches HEAD). Could AC-1 shipping half-done bite a player? The dive still reads (fixed Claw + rushing streaks); the missing piece is a fidelity zoom, not a broken mechanic, and it is explicitly escalated, not buried. Could the develop `tp1-32` render.ts change conflict at merge? Possible — flagged to SM (Delivery Findings). Nothing here rises to Critical/High; the story's verification is now honest.

### Observations (>=5)

1. [VERIFIED] AC-3 guard is now mutation-sensitive AND comment-proof — evidence: gate reversion → RED; comment-reintroduction attack → still RED.
2. [VERIFIED] fly-in no-fire + replay player-spawn now guarded — evidence: both reversions → RED.
3. [VERIFIED] WARP_FLYIN_FRAMES pinned to 10 + behavior tracks it — evidence: constant change → RED.
4. [VERIFIED] 5 dead casts removed, typing tightened, tsc clean — evidence: [RULE] grep + tsc exit 0.
5. [VERIFIED] implementation code unchanged this round — evidence: `git diff 691b35d..HEAD` is test-files-only.
6. [FLAG] AC-1 well-expansion accepted as a follow-up descope (escalated to PM/SM).

**Handoff:** To **The Organic Mechanic (SM)** for finish-story. APPROVED. Two carry-forward notes for finish: (a) file/confirm the AC-1 well-expansion follow-up (PM scope call — needs a live core eye field); (b) watch for a `src/shell/render.ts` merge conflict against develop's `tp1-32` (#119). DO NOT let me merge — SM owns PR creation + merge.

## SM Integration Handoff (finish → green rework, round-trip 2)

**Status:** tp1-10 is Reviewer-APPROVED but the branch CANNOT finish as-is — it collides with two stories merged to develop DURING this story's pipeline. User directed: route to Dev to rebase + integrate. SM does not resolve code conflicts.

**The collision (branch `fix/tp1-10-warp-dive` vs `origin/develop`):**
- **tp1-13 (#120, `66eb26d`)** — "audio wiring gaps: warp space drone, wave-bonus chime, bolt-destroyed cue, delete invented kzap." Added 3 events (`warp-space`, `wave-bonus`, `bolt-destroyed`), grew the events census, rewired `audio-dispatch.ts` (incl. the SAME warp-end case tp1-10 touched) and `sim.ts`/`state.ts`/`rules.ts`. **This is the "space sound (SOUTS3) over the fly-in" that tp1-10's own Dev finding deferred** — tp1-13 shipped it in parallel, so the two must be reconciled, not just union-merged.
- **tp1-32 (#119, `66f38f6`)** — tube framing (render).

**Conflicting files (18):** 9 `docs/audit/findings/pair-*.json` (mechanical citation re-anchors) + `src/core/{events,rules,sim,state}.ts` + `src/shell/audio-dispatch.ts` + `tests/core/events.test.ts` (census) + `tests/shell/audio-dispatch.test.ts` (EVENT_EFFECT table) + `tests/core/rom-clock-timing.test.ts` + `tests/core/tp1-23.warp-curwav.test.ts`.

**Dev integration task (green rework):**
1. `git -C tempest merge origin/develop` (or rebase) on the branch; resolve conflicts.
2. **events.ts** — UNION all events: keep tp1-13's `warp-space`/`wave-bonus`/`bolt-destroyed` AND tp1-10's `warp-descent-start` (4 new total).
3. **audio-dispatch.ts** — COMBINE the switch, don't pick: keep tp1-10's `warp-descent-start`→`startLoop('levelClear')` + `level-clear`→no-op; keep tp1-13's `warp-space`/`wave-bonus`/`bolt-destroyed` cases + the superzapper→SILENT (kzap deletion); RECONCILE the `warp-end` case so it stops BOTH loops tp1-13 added (`stopLoop('levelClear')` + `stopLoop('thrustSpace')`).
4. **SEMANTIC decision (the real work):** read tp1-13's `sim.ts` to see WHEN it emits `warp-space`, then reconcile with tp1-10's fly-in: tp1-10's fly-in is currently SILENT and emits `warp-end` at the descent bottom. tp1-13's `warp-space` is the drone that should cover the fly-in. Decide whether tp1-10's `beginFlyIn` should emit `warp-space` (so the drone plays through the fly-in) and how it composes with `warp-end`. This closes tp1-10's own deferred finding — coordinate the timing so descent-rumble → (descent bottom) → space-drone over the fly-in → play.
5. **events.test.ts / audio-dispatch.test.ts** — combine both censuses/tables to the full event set (expect ~20 discriminants); keep both stories' rows + `never` guards.
6. **sim.ts / state.ts / rules.ts** — combine additively.
7. **9 audit JSON** — take develop's line anchors then `node tools/audit/reanchor-citations.mjs --write`; combine any citation conflicts by RECOMPUTE, not `--ours`/`--theirs` (both stories stamped/re-anchored). Keep tp1-10's `remediated_by: tp1-10` stamps.
8. **Re-verify:** `npx tsc --noEmit` + `npx vitest run` (full — now includes tp1-13's suites) + `npm run build` + `npm test -- citations`.
9. Commit the integration on the branch, push.

**Then:** re-review (the audio-switch semantic merge + the warp-space/fly-in composition are non-trivial — Reviewer should mutation-check the combined switch + the new warp-space/fly-in interaction), then back to SM for finish + a PR the USER merges (do not auto-merge).

**Also for finish (unchanged):** file the AC-1 well-expansion follow-up (PM); the tp1-32 render.ts change is on develop (may or may not conflict — resolve if it does).

*Routed by The Organic Mechanic (SM); integration directed by the user.*

## Dev Assessment (integration — round-trip 2)

**Integration Complete:** Yes — `origin/develop` (tp1-13 #120 + tp1-32 #119) merged into `fix/tp1-10-warp-dive` and the two independently-built warp second phases UNIFIED into one.

**The unification (tp1-10 fly-in ⨝ tp1-13 warp-space were the SAME phase built twice):**
- **ONE second-phase counter:** kept tp1-10's `WarpState.flyIn` (ROM ordering: wave++ at the START via `beginFlyIn`); DROPPED tp1-13's provisional `inSpace`/`spaceFrames` + `WARP_SPACE_FRAMES` (=9) — tp1-13 itself deferred the camera timing to this story. `WARP_FLYIN_FRAMES` (=10) is the single unified counter.
- **ENDWAV folded:** tp1-13's skill-step bonus (`wave-bonus` + `awardScore` + clear `startBonus`) folded into `beginFlyIn`, paid together with INC CURWAV at the bottom-crossing (ROM ENDWAV-before-NEWAV2). Removed the now-dead `advanceLevel`.
- **Event handover:** descent bottom emits `warp-space` (T2→T3 drone handover), NOT `warp-end`; `warp-end` moved to the fly-in's END (mode→'playing'). Crash path unchanged (warp-spike-crash + player-death + warp-end → replayWave, SAME wave — the tp1-11 hard gate, preserved).
- **Events union → 20** (warp-descent-start + warp-space/wave-bonus/bolt-destroyed). **audio-dispatch combined:** level-clear silent, warp-descent-start→startLoop levelClear, warp-space→stop levelClear+start thrustSpace, warp-end→stop both, wave-bonus→extraLife, bolt-destroyed→enemyDeath, superzapper-activate silent.

**Files changed (source):** `src/core/{events,rules,state,sim}.ts`, `src/shell/audio-dispatch.ts` (+ tp1-32's `render.ts`/`geometry.ts` auto-merged, build clean).

**Files changed (tests, re-seated onto the unified model):** `tests/core/events.test.ts` (census→20), `tests/shell/audio-dispatch.test.ts` (effects[] table merge, both behavioural tests kept), `tests/core/{rom-clock-timing,tp1-23.warp-curwav,sim.audio-events}.test.ts`, `tests/shell/tp1-10.rumble-dispatch.test.ts`, and tp1-13's `tests/core/tp1-13.audio-wiring-events.test.ts` (warp-space level→2, crash-survival onto crash-REPLAYS).

**Files changed (audit):** 9 `pair-*.json` — conflicts resolved by taking develop's anchors then `reanchor-citations.mjs --write` (0 LOST); tp1-10's `remediated_by: tp1-10` stamps preserved; WD-010=tp1-23, WD-016 open; pair-7 P7-004 verbatim re-seated onto the unified `progress` comment.

**Verification (all green):** `tsc --noEmit` exit 0 · `vitest run` **1253/1253** (now includes tp1-13's 649-line suites) · `npm run build` exit 0 · `npm test -- citations` **19/19**.

**Mutation-checked (each reversion → target test RED, then restored):** (1) descent-start emit → warp-rumble RED; (2) fly-in fire-suppression clause → warp-fire RED; (3) replayWave player-spawn → warp-replay RED; (4) warp-space handover → tp1-13 wiring RED; (5) fly-in-end warp-end → sim.audio-events RED; (6) starfield gate → starfield-gate RED.

**NOT addressed (carry-forward for finish, unchanged):** the AC-1 well-expansion / moving-eye zoom follow-up (PM scope call — needs a live core eye field, tp1-9→tp1-31 pattern). Not a Dev fix.

**Branch:** fix/tp1-10-warp-dive (committed + pushed).

**Handoff:** To **Immortan Joe (Reviewer)** for re-review — the audio-switch semantic merge + the warp-space/fly-in composition should be mutation-checked (all 6 unified guards are RED-on-revert; census/table exhaustiveness green).

## Subagent Results (re-review — round-trip 2)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1253/1253 tests, tsc 0, build 0, citations 19/19, tree clean, no conflict markers, no debug residue (console.log/.only/.skip/debugger/TODO all 0) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings (`edge_hunter: false`) — self-covered: warp/fly-in boundaries checked below (flyIn 10→0, tube-resize OOB, 1-frame descent) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings (`silent_failure_hunter: false`) — self-covered: no try/catch or swallowed error added; `?? 0` is a default, not a swallow |
| 4 | reviewer-test-analyzer | Yes | findings | 1 (LOW) | confirmed 1 LOW (double-pay coverage is suite-level, not test-local); all 6 unified guards MUTATION-PASS (RED on revert); re-seats mutation-verified sound / strengthened; tables non-vacuous (runtime count + compile-time `never`) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings (`comment_analyzer: false`) — self-covered: merge comments reviewed inline; the one stale title ("on the frame the level advances") was already corrected by Dev in the re-seat |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings (`type_design: false`) — self-covered: `WarpState.flyIn?` optional numeric (rule-checker confirmed), `startBonus: number`, no stringly-typed API |
| 7 | reviewer-security | Yes | clean | none | N/A — client-only game; core purity + determinism intact (no Date/Math.random/DOM/shell-import in core; `awardScore` in beginFlyIn RNG-free), OOB structurally prevented (startLevel clears bullets before the resized spike array is read), no external surface |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings (`simplifier: false`) — self-covered: the unification NET-SIMPLIFIES (drops inSpace/spaceFrames + WARP_SPACE_FRAMES + dead advanceLevel; one counter, not two) |
| 9 | reviewer-rule-checker | Yes | clean | 0 | 0 violations across 9 rules / 47 instances: no re-introduced `as unknown as`/`as any`/`@ts-ignore`/`!`; 20-event union exhaustive with `never` guards in audio-dispatch.ts:116 + events.test.ts:80; `flyIn ?? 0` everywhere; citation gate 19/19 (WD stamps correct, WD-016 open) |

**All received:** Yes (4 ran, 5 disabled-and-self-covered; 1 LOW finding total)
**Total findings:** 1 confirmed (LOW), 0 dismissed, 0 deferred

## Reviewer Assessment (re-review — round-trip 2)

**Verdict:** APPROVED

This round re-reviews the round-trip 2 INTEGRATION — the merge of `origin/develop` (tp1-13 #120 + tp1-32 #119) into the tp1-10 branch, unifying two independently-built warp "second phase" implementations that had OPPOSITE wave-increment orderings. This is a same-session dev+review (I wrote the integration as Dev), so per the sidecar lesson I treated the adversarial subagents' MUTATION-PROVEN findings as ground truth over my own recollection, AND independently re-ran the highest-risk reversions myself. The verdict rests on evidence, not on "I wrote it, it's fine."

The unification is correct, ROM-faithful, and — critically for an epic whose discipline is "a guard must be mutation-tested or it's scenery" — its verification is HONEST. All six unified guards are mutation-proven load-bearing (revert → target test RED), confirmed twice (test-analyzer + my own serial reversions). The one finding is LOW and is a test-locality nit, not a lying guard: the double-pay regression it concerns IS caught (by a sibling test, mutation-proven). No Critical/High → APPROVE.

| Severity | Issue | Location | Status |
|----------|-------|----------|--------|
| [LOW] [TEST] | "survives a spike crash" test's docstring ("pays exactly once") oversells its LOCAL coverage — the double-pay regression is caught by a SIBLING test, not this one. Mutation-proven: delete `startBonus = 0` in beginFlyIn → sibling RED, this test green. No functional risk (behaviour correct, regression guarded at suite level). | `tests/core/tp1-13.audio-wiring-events.test.ts` | ➡️ ACCEPTED as a non-blocking follow-up (extend the test to dive off wave 4 and assert no second wave-bonus). See Delivery Findings. |

### Subagent finding disposition (tagged)

- [PREFLIGHT] clean — 1253/1253, tsc 0, build 0, citations 19/19, tree clean, no markers/debug. CONFIRMED.
- [TEST] 1 finding (LOW) — the double-pay test-locality nit above. All 6 unified guards MUTATION-PASS; the "warp-space frame → level 2" re-seat is STRENGTHENED (not a number-flip); the census + EVENT_EFFECT tables are non-vacuous (backed by both runtime counts AND compile-time `never` guards); the descent-timing re-keys onto `flyIn` genuinely measure the descent only. CONFIRMED.
- [SEC] clean — core purity + determinism intact (no Date/Math.random/DOM/shell-import in core; `awardScore(s, s.startBonus)` draws no RNG; `startBonus` is a pure `startWaveBonus(level)` table lookup); OOB structurally prevented (tube-resize can't strand a stale lane index because `startLevel` clears `s.bullets`/`s.enemyBullets` before the resized `s.spikes` is read); no fetch/eval/innerHTML/localStorage. CONFIRMED.
- [RULE] 0 violations (47 instances) — no re-introduced `as unknown as`/`as any`/`@ts-ignore`/non-null `!` (round-1's 5 dead casts stay removed); the 20-member GameEvent union is exhaustively handled with `const _exhaustive: never` guards in BOTH `src/shell/audio-dispatch.ts:116` and `tests/core/events.test.ts:80`; every `s.warp.flyIn` read uses `?? 0` (never `||`); runtime vs `import type` correct; citation gate 19/19 with WD-012/013/014/015/017/018 stamped `remediated_by: tp1-10`, WD-010=tp1-23, WD-016 open, all `ours` naming tracked repo files. CONFIRMED compliant.
- [EDGE] self-covered (disabled): the fly-in boundary (flyIn 10→0→mode 'playing') decrements under a `> 0` guard, no negative/NaN path; a crash is impossible during the fly-in or the AVOID-SPIKES hold (both branches return before `resolveWarpSpikeHit`); tube-resize OOB is neutralised by `startLevel`'s bullet clear ([SEC]). No blocking edge.
- [SILENT] self-covered (disabled): no try/catch, no swallowed error; the firing gate skipping during hold/fly-in is intentional, signposted behaviour; `?? 0` is a default not a swallow. No finding.
- [DOC] self-covered (disabled): the merge's comments are accurate (ROM-cited handover notes); the one stale test title ("on the frame the level advances", now inaccurate because the level advances at warp-space) was already corrected to "on the frame play resumes (fly-in end)" in the re-seat. No finding.
- [TYPE] self-covered (disabled): `WarpState.flyIn?: number` optional (so pre-tp1-10 3-field warp literals still type-check) and `GameState.startBonus: number` — both plain numerics, no stringly-typed API, no unsafe cast (rule-checker corroborates). No finding.
- [SIMPLE] self-covered (disabled): the unification is NET-SIMPLIFYING — it removes an entire redundant counter (`inSpace`/`spaceFrames`), a constant (`WARP_SPACE_FRAMES`), and a dead function (`advanceLevel`), collapsing two divergent second-phase implementations into one. No over-engineering. No finding.

### Rule Compliance (lang-review typescript.md + tempest CLAUDE.md)

- **#1 type-safety escapes:** COMPLIANT — grep of the whole diff: 0 `as any`, 0 `as unknown as`, 0 `@ts-ignore`, 0 added non-null `!`. The round-1 cast cleanup is preserved. tsc exit 0 (no escape hatch masks a type error).
- **#3 exhaustiveness:** COMPLIANT — GameEvent grew to 20 (warp-descent-start + warp-space/wave-bonus/bolt-destroyed). Every exhaustive switch has all 20 arms + a `never` guard: `audio-dispatch.ts:116`, `events.test.ts:80` discriminant. `main.ts` delegates (no switch); `fx.ts` uses `if`-chains — neither needs an arm. Verified `grep -rn "_exhaustive: never" src tests` = exactly those two.
- **#4 null/undefined:** COMPLIANT — `s.warp.flyIn ?? 0` at every read (sim.ts:879-881, 1078); `s.startBonus > 0` explicit numeric gate (no truthiness bug on a 0 bonus); `cloneState` spreads `warp` so `flyIn` is cloned (purity preserved).
- **#5 module/declaration:** COMPLIANT — `WARP_FLYIN_FRAMES`/`startWaveBonus` runtime imports in sim.ts; the four new event interfaces consumed only via the `GameEvent` union under `import type`.
- **#8 test quality:** COMPLIANT (with the 1 LOW locality nit above) — no vacuous asserts, no `as any` in assertions; the re-seated tests track new observable behaviour with specific values, none downgraded to truthy/defined; both merged tables carry compile-time `never` backstops so a magic-number staleness can't silently drop an event.
- **CLAUDE.md core purity (the hard boundary):** COMPLIANT — src/core/{sim,state,events,rules}.ts introduce no Date/new Date/performance.now/Math.random/rAF/DOM/window/document and no shell import; the folded `awardScore` is RNG-free; determinism preserved. Independently confirmed by [SEC] and [RULE].
- **CLAUDE.md tube-space positions:** COMPLIANT — no screen-space leaked into core.
- **CLAUDE.md citation gate:** COMPLIANT — 9 pair-*.json reconciled by recompute + reanchor (0 LOST); tp1-10 stamps preserved; `npm test -- citations` 19/19.

### Data flow traced

`input.fire` during the descent → `stepGame` 'warp' case (gate `warning === 0 && (flyIn ?? 0) === 0`) → suppressed during the AVOID-SPIKES hold AND the fly-in; otherwise fires. At the descent bottom (`progress >= 1`, no spike) → `s.events.push('warp-space')` (audio: stopLoop levelClear + startLoop thrustSpace) → `beginFlyIn`: `loadNextWave` (INC CURWAV → level 2, resize tube+spikes, `startLevel` clears bullets), pay `wave-bonus` + `awardScore(startBonus)` + clear `startBonus`, set `flyIn = 10`, mode stays 'warp'. Next 10 frames: `flyIn` decrements; at 0 → `s.events.push('warp-end')` (audio: stopLoop both) + mode 'playing'. Crash branch (spike, progress<1) → `resolveWarpSpikeHit`: warp-spike-crash + player-death + warp-end → killPlayer → dying → respawn sees `progress > 0` → `replayWave` (SAME level, board re-armed, player-spawn) — the tp1-11 hard gate, unchanged. VERIFIED — evidence: sim.ts stepWarp + beginFlyIn + resolveWarpSpikeHit + respawn; [SEC] confirms no OOB across the tube resize.

### Wiring

The 4 new events reach the shell dispatcher: warp-space → stopLoop('levelClear')+startLoop('thrustSpace'); wave-bonus → play('extraLife'); bolt-destroyed → play('enemyDeath'); warp-descent-start → startLoop('levelClear'); warp-end → stopLoop both; level-clear → silent; superzapper-activate → silent. All 20 arms present + `never` guard. VERIFIED — evidence: audio-dispatch.ts:26-118; mutation-checks d/e/f RED on revert.

### Error handling / hard questions

Null/empty/huge into the warp path: `flyIn` undefined ≡ 0 (safe); a crash on the last life → gameover; a spike-crash costs one life then REPLAYS (tp1-11 gate); the pending advanced-start bonus survives a crash (owed until the eventual arrival) — mutation-proven paid exactly once at the suite level. No timeouts/races (single-threaded deterministic sim). Tenant isolation: N/A (client-only game, no tenant data). VERIFIED via warp-replay + tp1-13 wiring suites; [SEC] confirms no unhandled throw on the path.

### Challenge of VERIFIEDs

I marked core-purity, exhaustiveness, determinism, and the citation gate VERIFIED. [SEC] and [RULE] independently corroborate all four (no contradiction). The one subagent finding ([TEST], the double-pay locality nit) does NOT contradict a VERIFIED — the double-pay behaviour IS verified (mutation-proven caught); the finding is only that the guard lives in a sibling test, which I confirmed by my own reversion (delete `startBonus = 0` → sibling RED). No VERIFIED stands against a subagent finding.

### Devil's Advocate (re-review)

Argue this merge shipped something broken. First and most dangerous: a UNION merge of two same-phase implementations could have left BOTH wave++ orderings live — the sim advancing the wave once at `beginFlyIn` AND again at a surviving `advanceLevel`, double-counting levels and paying the bonus twice. I checked: `advanceLevel` is GONE (grep confirms no function, no caller), the crash path routes through `replayWave` not `advanceLevel`, and the bonus is paid in exactly one place (`beginFlyIn`) gated on `startBonus > 0` then cleared — mutation-proven single-pay. Second: the audio switch could silently drop an event if the merge combined two tables and lost an arm — but the dispatcher's `never` guard makes a missing arm a COMPILE error, and the 20-arm exhaustiveness is verified in both the dispatcher and the census; a maintainer cannot drop a cue without breaking the build. Third: the descent-timing tests re-keyed from `mode` to `flyIn` could have become vacuous (always-true regardless of the fly-in) — but reverting `s.warp.flyIn = WARP_FLYIN_FRAMES` blows both timing tests RED (200-frame runaway vs 46 expected), so they still bind. Fourth, the one real soft spot: the "survives a spike crash" test claims "pays exactly once" but only proves it through arrival — a future maintainer who deletes the sibling "STARTING wave" test would leave the second-wave double-pay unguarded. That is why it is a recorded finding, not silence — but it is LOW because the behaviour is correct today and the regression IS currently caught. Fifth: could develop advancing to v1.0.14 mid-review (76474db) hide a conflict? No — it is a package.json/lock release bump only, no code, no warp, no tp1-10; the diff scope (merge-base 66eb26d) is unaffected. Nothing here rises to Critical/High; the integration is correct and its verification is honest — the exact opposite of round-1's scenery guard.

### Observations (>=5)

1. [VERIFIED] all 6 unified guards are mutation-proven load-bearing — evidence: test-analyzer + my own reversions (warp-space→warp-end RED; delete fly-in-end warp-end RED; delete bonus RED; delete stopLoop thrustSpace RED; re-add level-clear loop RED; re-add superzapper sound RED).
2. [VERIFIED] the wave++ ordering is single-path — evidence: `advanceLevel` removed (no function/caller), bonus paid once in `beginFlyIn` then cleared, mutation-proven single-pay.
3. [VERIFIED] the "warp-space frame → level 2" re-seat is STRENGTHENED not weakened — evidence: pins mode==='warp' AND level===2; commenting `s.level += 1` → RED (test-analyzer).
4. [VERIFIED] core purity + determinism intact across the fold — evidence: [SEC]+[RULE] confirm no forbidden tokens/shell imports; `awardScore` RNG-free; startBonus a pure table lookup.
5. [VERIFIED] 20-event exhaustiveness + citation gate — evidence: `never` guards in audio-dispatch.ts:116 + events.test.ts:80; citations 19/19 with correct WD stamps.
6. [LOW] [TEST] double-pay coverage is suite-level (sibling test), not local to "survives a spike crash" — recorded as a non-blocking follow-up.

**Handoff:** To **The Organic Mechanic (SM)** for finish-story. APPROVED. Carry-forward for finish: (a) the AC-1 well-expansion follow-up (PM scope call — needs a live core eye field, tp1-9→tp1-31 pattern); (b) the LOW test-locality follow-up (extend "survives a spike crash" to assert no second wave-bonus) — could fold into finish or a follow-up; (c) `origin/develop` is now v1.0.14 (76474db, release bump only — no code conflict, but rebase/re-merge before the PR merges if it drifts further). DO NOT let me merge — SM owns PR creation + merge; the USER merges the PR.
---
## Impact Summary

**Upstream Effects:** 8 findings (0 Gap, 0 Conflict, 5 Question, 3 Improvement) — none blocking.

- **Improvement (PM escalation):** The live eye field was pre-extracted in tp1-9 but not introduced as a moving-eye parameter — only the test-pinned Claw half of AC-1 is delivered; the well-expansion visual (eye-driven zoom) is deferred. Affects `src/core/geometry.ts`/`src/core/state.ts`. Needs a PM/SM follow-up story decision (tp1-9→tp1-31 pattern).
- **Question:** AC-1's well-expansion visual was delegated to Reviewer's eyeball (render pixels undrivable in vitest's node env); the moving-eye zoom half is NOT implemented. Affects `src/shell/render.ts` drawTube/drawWarp.
- **Improvement (CLOSED):** The eye fly-in was silent; tp1-13 (#120) shipped the T3 space drone and the unification makes the drone cover the fly-in. Fly-in audio closed via `src/shell/audio-dispatch.ts`.
- **Question:** WARP_FLYIN_FRAMES = 10 derives from eye tracking +0x18/frame; truly precise ROM count depends on per-well EYLDES. ROM-faithful approximation, not exact per-well. Affects `src/core/rules.ts`.
- **Question:** Bullet spawn depth during the dive is open — stepFiring hardcodes depth: 1 (rim); ROM fires from CURSY (live descending depth). Affects `src/core/sim.ts` stepFiring.
- **Improvement (round-trip 2, CLOSED):** tp1-10's deferred "space sound" finding closed by tp1-13's drone + unification.
- **Improvement (round-trip 2, CLOSED):** tp1-13's provisional WARP_SPACE_FRAMES (=9) removed; WARP_FLYIN_FRAMES (=10) is the single unified post-descent timer; dead `advanceLevel` removed.
- **[LOW] [TEST]:** "survives a spike crash" test covers double-pay only via a sibling test (suite-level, mutation-proven). Non-blocking follow-up: extend it to dive off wave 4 and assert no second wave-bonus.

**Downstream Effects:** Cross-module impact in src/core (eye field, bullet spawn depth, unified fly-in) and src/shell (well-expansion visual, audio dispatch). **Hard gate unblocked:** tp1-11 (restore SPIKE_MAX_DEPTH to 0.929) depends on tp1-10's spike-crash-replays-the-wave AC — mutation-verified and ready.

## Sm Assessment

Finish ceremony for tp1-10. Reviewer APPROVED after round-trip 2; PR tempest#121 merged to develop by the user at 2026-07-15T07:11:10Z (merge commit cc9beff). Preflight (sm-finish War Boy): all checks pass — tempest on develop and synced, tree clean, 1253/1253 tests, tsc/build clean, citations 19/19 with WD-012/013/014/015/017/018 stamped `remediated_by: tp1-10`. Carry-forwards recorded in Impact Summary: (a) AC-1 well-expansion follow-up needs a PM scope call; (b) LOW test-locality follow-up on the spike-crash test; (c) develop was v1.0.14 at merge time — no code conflict. Archiving.
