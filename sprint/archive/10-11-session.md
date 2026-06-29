---
story_id: "10-11"
jira_key: ""
epic: "10"
workflow: "tdd"
---
# Story 10-11: Sustained/looping sounds + wire unwired bakes + warp-audio duration

## Story Details
- **ID:** 10-11
- **Jira Key:** N/A (no Jira integration)
- **Workflow:** tdd
- **Branch:** feat/10-11-audio-sustain-loop (tempest subrepo, gitflow)
- **Points:** 3
- **Priority:** p2

## Technical Approach

This story adds sustain/loop support to the audio engine and wires three baked-but-unwired sound effects, plus corrects warp-sound timing.

**Three audio wiring tasks:**

1. **pulsar_hum sustain/loop**: Emit a new GameEvent (e.g., `PulsarPresent` / `PulsarAbsent`) from core when pulsars enter/leave; audio-dispatch translates this to looped playback (loop: true) while one or more pulsars are alive, stopping playback when all pulsars exit.

2. **spike_shot on spike hit**: Wire `spike_shot` (baked asset, ROM cue cc51 per source study) to spike collision events. Core emits the event on impact; dispatch triggers playback.

3. **extra_life on bonus award**: Wire `extra_life` (baked asset) to the bonus-life event. Core emits when a bonus life is awarded; dispatch triggers playback.

**Warp-sound duration correction:**
- Today `levelClear: 'warp.wav'` (a single one-shot) plays on warp entry and is clipped if the dive finishes before the file ends.
- Match the warp-sound duration to the actual dive length by measuring the time from warp-entry to next-level-load in core, then either (a) dynamically adjust the warp-sound duration in the shell via a parameter, or (b) cross-fade to silence at the correct moment. Source the dive duration from the warp mechanic in sim.ts.

**Core/shell boundary preservation:**
- Core (`events.ts`) emits pure DATA events; no audio imports.
- Shell (`audio-dispatch.ts`) translates events to playback calls; sustain/loop metadata lives here.
- Audio asset mappings live in `audio.ts`.

## Acceptance Criteria
- `pulsar_hum` loops continuously while at least one pulsar is alive and STOPS when the pulsar dies/leaves.
- `spike_shot` (ROM cc51) plays on spike hits.
- `extra_life` plays when a bonus life is awarded.
- The warp/zoom sound's duration matches the actual dive length (no early silence, no bleed into the next level).
- New audio events are emitted from core as pure DATA (`events.ts`) and dispatched in the shell (`audio-dispatch.ts`) — the core/shell boundary is preserved (core never imports the audio layer).

## Sm Assessment

**Routing decision:** TDD (phased) → handoff to TEA for the RED phase.

**Reasoning:**
- 3-point feature with cross-layer coordination (core event emission → shell dispatch). TDD ensures the new events and dispatch logic are test-driven.
- Scope spans `src/core/events.ts` (GameEvent types), `src/core/sim.ts` (emit points), `src/shell/audio.ts` (asset mapping), and `src/shell/audio-dispatch.ts` (dispatch wiring).
- Core changes are minimal (new event variants + emit calls); shell changes add sustain/loop support and the three wirings.
- TEA should pin the three SFX behaviors plus warp-duration correctness with failing tests. Source authentic ROM cues from `docs/tempest-1981-source-findings.md` (spike_shot = cc51).
- Single repo (tempest), gitflow branch `feat/10-11-audio-sustain-loop` cut off `develop`. No cross-repo coordination.

**Watch-outs for downstream agents:**
- Authentic ROM cues come from the source-findings doc; don't invent mappings.
- Warp-sound duration is a time-domain property — measure the actual dive duration and verify the audio spans it.
- Pulsar-alive detection must account for ALL pulsars on the board, not just one.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** 3-pt feature spanning the pure core (new event emission), the WebAudio engine (new sustained-playback surface), and the shell dispatch (rewired event→sound contract). Four distinct behaviours each get a falsifiable contract. The shell layer is canvas/WebAudio (normally "verified by running the game"), but the repo's established recording-fake seam (10-10 voice-stealing, 6-12 dispatch) lets every wiring be pinned behaviourally in node — so I did.

**Test Files:**
- `tempest/tests/core/sim.audio-events.test.ts` — NEW. 12 tests pinning the 5 new core events through the public `stepGame` API: spike-shot (lane-keyed, one per spike, none without a spike), extra-life (one per threshold crossing, `count`, none below threshold), pulsar-hum-start/stop edges (0↔>0 population transitions, no spurious edge on persist/never-present), warp-end (one per dive on the warp→playing frame; on a mid-dive spike crash), level-clear regression, and an event-stream determinism guard.
- `tempest/tests/shell/audio.sustain.test.ts` — NEW. 8 tests pinning the engine's new `startLoop`/`stopLoop` (single looping source, voice-steal to one live loop, stop, safe no-op when idle, unloaded no-op, silent degrade on throw) + the 3 unwired bakes loaded from R2 (`spike_shot`/`extra_life`/`pulsar_hum`.wav, default + custom base).
- `tempest/tests/shell/audio-dispatch.test.ts` — REWRITTEN (AC4 "dispatch tests updated"). 24 tests over a 16-discriminant effect table: 11 one-shot `play` cues (incl. new spike-shot/extra-life), 2 `startLoop` (level-clear, pulsar-hum-start), 2 `stopLoop` (warp-end, pulsar-hum-stop), 1 visual-only no-op (superzapper-flash). The warp/zoom cue moves from one-shot `play('levelClear')` (clipped on entry) to `startLoop`…`stopLoop` so it spans the dive.

**Tests Written:** ~44 tests covering all 4 ACs + AC4 determinism/boundary.
**Status:** RED — verified via `testing-runner` (RUN_ID 10-11-tea-red): **24 failing across exactly the 3 story files** (7 core + 8 sustain + 9 dispatch), **0 import/collection errors**, **0 regressions** in the other 61 files. Every failure is feature-absence: empty event arrays (`expected [] to have length 1`), missing manifest entries, `engine.startLoop is not a function`, and `{kind:'play'}` where `{kind:'startLoop'}` is required.

**Intentionally-green guards (must STAY green):**
- `audio-dispatch.test.ts` → "wires every GameEvent discriminant exactly once" (table is self-consistent; the 16-count guard trips if Dev adds an event type without a row).
- `sim.audio-events.test.ts` → "produces an identical event stream for identical inputs" (determinism property; holds in RED and GREEN — proves the new events stay pure data).
- The 10 pre-10-11 one-shot dispatch rows (fire, enemy-fire, …) — regression guards that the rewrite preserved the unchanged wiring.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #3 enum/exhaustiveness (switch covers every discriminant) | `audio-dispatch` per-row effect table + "wires every discriminant exactly once" | failing (5 new discriminants unwired; dispatcher `never` guard enforces compile-time half) |
| #4 null/undefined (Map.get on the live-source map) | `audio.sustain` "stopLoop is a safe no-op when nothing is looping" + "startLoop on an unloaded sound is a silent no-op" | failing (exercises the absent/undefined-source paths) |
| #1 type-safety escapes | typed fakes (`SoundSurface`, `RecSource`) — no `as any`/`@ts-ignore` in any new test; Dev must keep `events.ts`/`audio.ts`/`audio-dispatch.ts` escape-free | review-enforced |
| #8 test quality (no vacuous asserts) | every test asserts an exact count, payload, effect object, or loop flag | passing/failing as designed |

**Rules checked:** TS lang-review #1, #3, #4, #8 are the applicable checks for this pure-data + WebAudio change (no JSX/async-Promise/enum-numeric/user-input surface introduced; #2/#5–#7/#9–#13 N/A).
**Self-check:** 0 vacuous tests — no `let _ =`, no `assert(true)`, no `is.some()`-style soft checks. Every assertion is falsifiable (deleting the emit/wiring flips it red). 2 tests are intentionally-green guards (noted above), not vacuous.

**Test contract per AC (what GREEN requires of Dev):**
- **AC1 pulsar hum** → core emits `pulsar-hum-start` on the population 0→>0 edge and `pulsar-hum-stop` on >0→0 (no spurious edge while present); dispatch maps them to `startLoop('pulsarHum')`/`stopLoop('pulsarHum')`; engine loops one source and steals to one live voice.
- **AC2 spike_shot + extra_life** → core emits `spike-shot {lane}` in `resolveSpikeHits` and `extra-life {count}` in `awardScore` on a threshold crossing; dispatch plays `spikeShot`/`extraLife`; manifest loads both bakes from R2.
- **AC3 warp spans the dive** → `level-clear` → `startLoop('levelClear')` (not one-shot `play`); core emits `warp-end` exactly once when the dive concludes (completion frame AND on a mid-dive crash); dispatch → `stopLoop('levelClear')`. Emit `warp-end` at the dive-end SITES (stepWarp completion + resolveWarpSpikeHit), NOT inside `advanceLevel` (which also runs on crash-respawn → would double-fire).
- **AC4 pure/deterministic** → new events are plain data in `events.ts`; the `GameEvent` union stays exhaustive (dispatcher `never` guard); identical inputs ⇒ identical event stream.

**Handoff:** To Dev (Julia) for GREEN — add the 5 event interfaces to `src/core/events.ts`, emit them at the 4 sites in `src/core/sim.ts`, add `startLoop`/`stopLoop` + the 3 manifest entries (`spike_shot`/`extra_life`/`pulsar_hum`.wav) + channels to `src/shell/audio.ts`, and wire the dispatch cases in `src/shell/audio-dispatch.ts`. Authentic cues are in `docs/ux/2026-06-28-pokey-sfx-rom-map.md` (on develop): spike_shot=cc51 idx9, pulsar_hum=cc99 idx3, extra_life=cc11 idx4.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `tempest/src/core/events.ts` — 5 new pure-data `GameEvent` interfaces (`SpikeShotEvent{lane}`, `ExtraLifeEvent{count}`, `PulsarHumStartEvent`, `PulsarHumStopEvent`, `WarpEndEvent`) added to the union. No imports; data only (boundary preserved).
- `tempest/src/core/sim.ts` — emits at the 4 sites per the TEA contract:
  - `resolveSpikeHits` → `spike-shot {lane}` when a bullet shortens a spike.
  - `awardScore` → `extra-life {count}` once per threshold crossing (`count` = lives added).
  - `emitPulsarHumEdge(state, s)` (new helper, called at the end of the `playing` branch) → `pulsar-hum-start`/`pulsar-hum-stop` on the pulsar-population 0↔>0 edge, comparing the pre-step input state to the post-step state.
  - `warp-end` at **both** dive-end sites — `stepWarp` on completion (`progress ≥ 1`, before `advanceLevel`) and `resolveWarpSpikeHit` on a crash. NOT in `advanceLevel` (which also runs on crash-respawn → would double-fire), per the TEA contract.
- `tempest/src/shell/audio.ts` — manifest gains `spikeShot`/`extraLife`/`pulsarHum` (the 3 R2 bakes); `AudioEngine` gains `startLoop`/`stopLoop`. Extracted shared `startSource(name, loop)` + `stopChannel(channel)` helpers so one-shot `play` and looping `startLoop` share the voice-stealing logic (existing 10-10 behaviour unchanged). The zoom loop moved to its OWN `'zoom'` channel (off `'warp'`) so a mid-dive crash impact rings on `'warp'` WHILE the loop is up, and `warp-end`'s `stopLoop` stops only the loop — not the crash.
- `tempest/src/shell/audio-dispatch.ts` — `SoundPlayer` widened to `Pick<AudioEngine,'play'|'startLoop'|'stopLoop'>`; new cases: spike-shot/extra-life → `play`; pulsar-hum-start/stop → `startLoop`/`stopLoop('pulsarHum')`; `level-clear` → `startLoop('levelClear')` (was one-shot `play`); `warp-end` → `stopLoop('levelClear')`. Exhaustiveness `never` guard intact (all 16 discriminants handled).
- `tempest/tests/core/events.test.ts` — extended the Story 5-1 static-contract suite (exhaustiveness `discriminant()` switch + `ALL_EVENTS` fixtures + the distinct-type count/order assertion) from 11 to the 16-variant union. Required to keep `tsc --noEmit` green; the `never` guard is the compile-time half of AC4's exhaustiveness contract.

**Tests:** 668/668 passing (GREEN); `npm run build` clean (tsc --noEmit + vite build). Verified via `testing-runner` (RUN_ID 10-11-dev-green, 10-11-dev-green-2). No regressions in the other 63 files.

**AC coverage:**
- AC1 pulsar hum loop → ✅ start/stop edges in core; dispatch → start/stopLoop('pulsarHum'); engine loops one stealing voice.
- AC2 spike_shot + extra_life → ✅ emitted in core, played in dispatch, bakes loaded from R2.
- AC3 warp spans the dive → ✅ level-clear starts the loop, warp-end (completion + crash) stops it; own 'zoom' voice.
- AC4 pure/deterministic → ✅ plain-data events, exhaustive union, determinism guard green.

**Self-review:** wired into the live path (`main.ts` already passes the full engine to `playEventSounds`); reuses the established channel/voice-stealing pattern; no `as any`/`@ts-ignore`/non-null introduced; core never imports the shell (boundary intact). Audible looping (no seam in `pulsar_hum`/`warp` loops), the actual dive-length match, and the R2 deployment of the three bakes are best confirmed by running the game — flagged for verify/review and in Delivery Findings.

**Handoff:** To next phase (verify / review).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (668/668 green, tsc+vite clean, 0 smells, scope clean) | N/A — confirms green + no out-of-scope edits |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 3 (1 high-confidence, 2 low) | confirmed 1 (→Medium, non-blocking), dismissed 2, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (0 violations / 61 instances across 18 rules) | N/A — confirms type-safety, exhaustiveness, null-handling, core boundary, determinism |

**All received:** Yes (3 enabled returned, 6 disabled via `workflow.reviewer_subagents`)
**Total findings:** 1 confirmed from subagents (Medium, non-blocking) + 1 Reviewer-originated (Medium, non-blocking); 2 dismissed (with rationale); 0 deferred. **No Critical/High.**

### Dismissed (with rationale)
- **[TEST] `audio.sustain.test.ts` throwing-start "zero-assertion" (low conf)** — DISMISSED. Premise is incorrect: in `startSource`, `source.start()` (audio.ts:197) runs **before** `live.set(channel, source)` (audio.ts:198), so a throwing `start()` is caught and `live.set` is never reached — no "zombie source" is registered, and `stopChannel(channel)` already ran (audio.ts:185) leaving the channel empty. The `.not.toThrow()` assertion fully covers the silent-degrade contract; the channel recovers naturally.
- **[TEST] `sim.audio-events.test.ts:135` tanker-split "implementation-coupling" (low conf)** — DISMISSED. The suggested alternative (put `aPulsar` in the initial enemy list) is self-defeating: it would make `prev` (the pre-step state) ALREADY contain a pulsar, so the 0→>0 `pulsar-hum-start` edge could never fire. A tanker split is the only deterministic way to make a pulsar *appear within a single step*. The test's precondition `expect(out.enemies.some(pulsar)).toBe(true)` guards setup validity; the analyzer itself rated the coupling low-risk.

## Reviewer Assessment

**Verdict:** APPROVED

The implementation is clean, correct, and faithful to the TEA contract. Preflight (668/668 green, tsc+vite clean, 0 smells, scope clean) and rule-checker (0 violations / 61 instances across all 13 TS lang-review checks + 5 architectural rules) are both clean. The one confirmed test-quality finding and one Reviewer-originated edge are both **Medium / non-blocking**. No Critical or High issues.

| Severity | Issue | Location | Disposition |
|----------|-------|----------|-------------|
| [MEDIUM] `[EDGE]` | The `pulsar-hum` loop has no stop path on game-over: `killPlayer` sets `mode='gameover'` without clearing `enemies` (sim.ts:372-380), and `emitPulsarHumEdge` runs only in the `playing` branch (sim.ts:658), so a pulsar alive at the final death leaves the hum looping on the game-over/attract screens until a new game's first pulsar steals the `'pulsar'` channel. | `tempest/src/core/sim.ts` | Accept — documented presence-only consequence (per AC1 "while a pulsar is present"); audio-only artifact, no functional/data impact. Non-blocking follow-up captured in Delivery Findings. |
| [MEDIUM] `[TEST]` | The crash-path `warp-end` test breaks on the first crash frame and asserts only that frame's count; it does not accumulate `totalEnds` across the pre-crash warp frames, so a spurious pre-crash `warp-end` would go undetected (the clean-dive test at the same suite DOES accumulate). | `tempest/tests/core/sim.audio-events.test.ts` (crash test) | Accept — the code is provably correct (only 2 gated `warp-end` emit sites; rule-checker confirmed determinism) and the sibling clean-dive test proves `totalEnds===1`; the strengthening is a cheap negative guard, non-blocking. Captured in Delivery Findings. |

**Subagent dispatch tags:**
- `[RULE]` — reviewer-rule-checker clean (0/61): no `as any`/`@ts-ignore`/non-null; exhaustive `never` guards on both switches; `Map.get` guarded; core boundary + determinism intact.
- `[TEST]` — reviewer-test-analyzer: 1 confirmed (Medium crash-path missing-negative), 2 dismissed (see above). The dispatch effect-table (`play` vs `startLoop` vs `stopLoop`) would catch a regression of `level-clear` back to one-shot `play`; the clean-dive `warp-end` test (`totalEnds===1` + `endsOnTransition===1`) is the suite's strongest.
- `[EDGE]` — edge_hunter disabled; assessed directly: `warp-end` cannot double-fire (two gated sites, `advanceLevel` emits none); the game-over hum bleed is the one real edge (Medium, above).
- `[SILENT]` — silent_failure_hunter disabled; assessed directly: the two new bare `catch {}` blocks in `audio.ts` are the documented WebAudio silent-degrade contract (not `catch(e:any)`, no recoverable info swallowed) — intentional and correct.
- `[DOC]` — comment_analyzer disabled; assessed directly: comments are accurate and updated with the code (the `'zoom'`-voice rationale, the `warp-end` dive-end notes, the `startSource` loop comment); all 5 new events documented in `events.ts`.
- `[TYPE]` — type_design disabled; assessed directly: the union extends cleanly with discriminated string literals (no enums, no stringly-typed APIs); `SoundPlayer = Pick<AudioEngine,...>` narrowing is sound; `count`/`lane` fields are concrete.
- `[SEC]` — security disabled; assessed directly: no auth/user-input/secrets/tenant surface; `baseUrl` is an internal config string used to build R2 asset URLs, not user input.
- `[SIMPLE]` — simplifier disabled; assessed directly: the `startSource`/`stopChannel` extraction REDUCES duplication (play and startLoop share one path); no dead code or over-engineering.

**Independent observations (≥5):**
- `[VERIFIED]` Core boundary intact — `src/core/events.ts` imports only `type { EnemyKind } from './state'`; `src/core/sim.ts` has zero shell imports; `emitPulsarHumEdge` reads `enemies.some()` only. All 5 new events are plain-data interfaces. Complies with CLAUDE.md hard boundary; the existing `events.test.ts` `?raw` token-scan re-passes against the new source.
- `[VERIFIED]` `warp-end` no double-fire — emitted at exactly two sites: `resolveWarpSpikeHit` (sim.ts:577, crash, then `return true`) and `stepWarp` completion (sim.ts:601, only reached when no crash); `advanceLevel` pushes no events, so the crash→respawn→advanceLevel path can't re-fire.
- `[VERIFIED]` Null handling — `stopChannel` guards `live.get()` with `if (!prev) return` (audio.ts:165-166); `startSource` guards ctx/master/buffer (audio.ts:181-183); `source.onended` uses `live.get()` only in an `===` comparison. No non-null assertions introduced.
- `[VERIFIED]` Channel deconfliction — `levelClear` moved to its own `'zoom'` voice while `warpSpikeCrash` keeps `'warp'`; traced the crash-frame event order `[warp-spike-crash, player-death, warp-end]` → `play('warpSpikeCrash')`@`warp`, then `stopLoop('levelClear')`@`zoom` — the crash impact is NOT cut short by the loop-stop. Good catch by Dev (logged deviation).
- `[VERIFIED]` extra-life is single + deterministic — `awardScore` emits one `extra-life {count}` only when `crossed > 0`; a single award crossing 2× the 10000 interval is numerically impossible with current `scoreFor` values, so `count` is effectively always 1.
- `[MEDIUM]` `[EDGE]` pulsar-hum loop bleeds into game-over (see severity table).
- `[MEDIUM]` `[TEST]` crash-path `warp-end` test missing the `totalEnds` negative guard (see severity table).

**Data flow traced:** player bullet (input) → `stepBullets` advances depth → `resolveSpikeHits` detects `depth ≤ spike height` → `s.events.push({type:'spike-shot', lane})` (pure data on `GameState.events`) → drained by `main.ts`'s per-frame pump → `playEventSounds(audio, frameEvents)` → `audio.play('spikeShot')` → WebAudio one-shot. No shell→core write-back; core never imports audio (boundary safe). **Pattern observed:** sustained cues reuse the existing POKEY-style per-channel voice-stealing (`startSource`/`stopChannel`, audio.ts:164-202), consistent with the 10-10 model. **Error handling:** WebAudio node failures swallowed by design (silent-degrade), bare `catch {}` (not `catch(e:any)`).

### Devil's Advocate

Assume this is broken. Where? The loudest crack is lifecycle: a looping sound is a resource with a lifetime, and the core only emits the `pulsar-hum-stop` edge inside the `playing` branch. Game-over with a pulsar alive (killed by a bolt while a pulsar climbs another lane) leaves the hum droning over the GAME OVER / HIGH SCORE / attract screens — a genuine, reachable artifact, mitigated only because the next game's first pulsar steals the `'pulsar'` channel. The same class of leak does NOT bite the warp/zoom loop, which is bounded by `warp-end` at both dive-end sites — but only because I verified `advanceLevel` emits nothing; had Dev "helpfully" added a `warp-end` there too, the crash path would double-stop (harmless) and a future reader would be misled. The throwing-`start()` path looked dangerous (a half-constructed source) until I checked the ordering: `start()` precedes `live.set`, so a throw registers nothing and `stopChannel` already cleared the lane — the channel self-heals. The presence-only pulsar model has a second hole the tests don't probe: if a pulsar persists across a death→respawn, the hum keeps ringing (correct per AC, but it means the loop's lifetime is coupled to enemy-population accounting, not to an explicit "audio off" signal — fragile if a future refactor culls enemies on death). The tanker-split `pulsar-hum-start` test leans on `0.95 ≥ TANKER_SPLIT_DEPTH` and the `stepEnemies`-before-`resolveTankerArrivals` ordering; a reorder would silently change which frame the edge lands on, though the precondition assertion fails loudly rather than false-passing. The crash-path `warp-end` test is the one real coverage gap — it proves the crash frame but not the absence of spurious pre-crash emits. And nothing here proves the AUDIO actually works: the three bakes live only in `tools/pokey-bake/out/` and must be deployed to R2; the loops could have audible seams; the warp wav's loop may not perfectly match the dive's variable length. All of that is verify-by-running, correctly flagged. None of it rises to Critical/High: this is a pure presentational/audio layer with no input, I/O, auth, or core-state reach, the core stays deterministic and pure, and 668 tests + a clean build back the contract.

**Handoff:** To SM (Winston Smith) for finish-story. Recommend at finish: (1) deploy the three bakes (`spike_shot`/`extra_life`/`pulsar_hum`.wav) to R2; (2) a quick verify-by-running of the pulsar hum loop, the warp/zoom dive sound spanning the dive, and the spike/extra-life one-shots; (3) the two Medium follow-ups (game-over hum stop + crash-path test accumulator) can be a fast-follow story.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T21:05:05Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T20:20:37Z | 2026-06-29T20:22:40Z | 2m 3s |
| red | 2026-06-29T20:22:40Z | 2026-06-29T20:42:07Z | 19m 27s |
| green | 2026-06-29T20:42:07Z | 2026-06-29T20:51:17Z | 9m 10s |
| review | 2026-06-29T20:51:17Z | 2026-06-29T21:05:05Z | 13m 48s |
| finish | 2026-06-29T21:05:05Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): The three new bakes exist as build outputs (`tempest/tools/pokey-bake/out/spike_shot.wav`, `extra_life.wav`, `pulsar_hum.wav`) but must be UPLOADED to the R2 host (`arcade-assets.slabgorb.com/tempest/sfx/`) for the game to actually make sound. The manifest/dispatch tests fake `fetch`, so they pass without the asset being hosted — the wiring is correct but the game stays silent until the wavs are deployed. Affects deployment of `tempest/tools/pokey-bake/out/*.wav` to R2 (a verify-by-running / ops step at finish). *Found by TEA during test design.*
- **Improvement** (non-blocking): The ROM map (`docs/ux/2026-06-28-pokey-sfx-rom-map.md`) lists `pulsar_active` (idx12, $cca9 — the per-beat pulse toggle) as a SEPARATE sound from `pulsar_hum` (idx3, $cc99 — the continuous hum). This story wires only the hum. A follow-up could add the pulse-beat cue keyed to `Pulsar.pulsing`. Affects `tempest/src/core/sim.ts` + audio layer (future audio story). *Found by TEA during test design.*
- **Question** (non-blocking): The ROM gates the pulsar hum on `n_pulsars>0 AND player alive`; the story AC gates only on presence ("while a pulsar is present"). I pinned presence-only per spec authority (see Design Deviations). If the faithful behaviour is wanted, the hum should also stop during `dying`/respawn while pulsars persist. Affects `tempest/src/core/sim.ts` pulsar-edge logic. *Found by TEA during test design.*
- **Improvement** (non-blocking): The authentic cue table is `docs/ux/2026-06-28-pokey-sfx-rom-map.md` (on develop) — Dev should source mappings there (spike_shot=cc51 idx9, pulsar_hum=cc99 idx3, extra_life=cc11 idx4), not the unmerged `chore/tempest-1981-source-findings` branch. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): Confirmed TEA's R2 finding from the implementation side — the three bakes (`spike_shot.wav`, `extra_life.wav`, `pulsar_hum.wav`) exist only under `tempest/tools/pokey-bake/out/` and must be uploaded to `arcade-assets.slabgorb.com/tempest/sfx/`. The wiring is complete and tested, but the game will be silent for these three cues until the assets are deployed. Affects deployment (ops step at finish / verify-by-running). *Found by Dev during implementation.*
- **Question** (non-blocking): On a mid-dive spike crash, the core now emits `[warp-spike-crash, player-death, warp-end]` in that order. The dispatcher therefore plays the crash impact on the `'warp'` voice, then `stopLoop('levelClear')` on the separate `'zoom'` voice — so the crash is NOT cut short. This relies on the loop and the crash being on different channels (`'zoom'` vs `'warp'`); a future channel re-map must keep them distinct. Affects `tempest/src/shell/audio.ts` CHANNELS. *Found by Dev during implementation.*
- **Improvement** (non-blocking): I extended the Story 5-1 static-contract suite (`tempest/tests/core/events.test.ts`) to the 16-variant union — the `discriminant()` exhaustiveness switch broke `tsc` once the union grew. This is mechanical test maintenance forced by the union change, not new feature testing; flagging it so the Reviewer knows a TEA-authored 5-1 file was touched. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): The `pulsar-hum` loop has no stop path on game-over — `killPlayer` sets `mode='gameover'` without clearing `enemies` and `emitPulsarHumEdge` runs only in the `playing` branch, so a pulsar alive at the final death leaves the hum looping on the game-over/attract screens. Affects `tempest/src/core/sim.ts` (emit `pulsar-hum-stop` when leaving `playing` with a pulsar present, OR stop all loops shell-side on a mode→gameover/attract transition). Audio-only artifact, presence-only consequence — fast-follow. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The crash-path `warp-end` test (`tempest/tests/core/sim.audio-events.test.ts`) checks only the crash frame's count; it should accumulate `totalEnds` across all warp frames (like the clean-dive test) to prove no spurious pre-crash `warp-end`. Code is correct today; this hardens the test. *Found by Reviewer during code review.*
- **Verify-by-running** (non-blocking): The three bakes must be deployed to R2 (`arcade-assets.slabgorb.com/tempest/sfx/`); audible loop quality (no seam on `pulsar_hum`/`warp`) and the warp sound spanning the variable dive length are outside the test seam. Affects deployment + a play-the-game pass at finish. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Pulsar hum gated on PRESENCE only, not the ROM's "player alive" condition**
  - Spec source: context-story-10-11.md, AC-1
  - Spec text: "A looping sound plays while a pulsar is present and stops when none remain"
  - Implementation: the `pulsar-hum-start`/`pulsar-hum-stop` edges are pinned to the pulsar-population transition (0↔>0) only. The ROM map (`pokey-sfx-rom-map.md` idx3) triggers the hum on `n_pulsars>0 AND player alive`, so the hum keeps ringing through `dying`/respawn if a pulsar survives the player's death.
  - Rationale: the story AC (higher authority than the epic/ROM map) gates on presence alone; adding the player-alive gate would need a stop-on-death + restart-on-respawn dance that is out of this story's stated scope.
  - Severity: minor
  - Forward impact: a follow-up can AND the player-alive condition into the edge logic; captured as a non-blocking Delivery Finding.
- **Warp/zoom cue reuses the `levelClear` sound as a looped source (one-shot → startLoop/stopLoop), looping the finite bake rather than a true continuous stream**
  - Spec source: context-story-10-11.md, AC-3
  - Spec text: "The warp sound spans the dive (no early silence, no bleed into the next level)"
  - Implementation: `level-clear` now dispatches `startLoop('levelClear')` and a new `warp-end` event dispatches `stopLoop('levelClear')`, so the existing `warp.wav` bake is looped for exactly the dive's duration. This replaces the prior one-shot `play('levelClear')` (6-12 contract) — hence the dispatch-test rewrite. The wav is replayed (`source.loop=true`), not re-synthesised continuously like the arcade's ALSOUN engine.
  - Rationale: looping the captured bake matches the duration faithfully with the assets we already have; a true streaming sustain would need the bake tool's stream interpreter wired into live playback (out of scope). Reusing `levelClear` avoids a duplicate asset (zoom == warp == `$cc75`).
  - Severity: minor
  - Forward impact: if the looped wav has an audible seam, a future story can author a seamless loop or a dedicated tail; the dispatch contract (start on entry, stop on `warp-end`) is unaffected.
- **Sustain/loop behaviour verified through a recording-source fake, not real WebAudio**
  - Spec source: context-story-10-11.md, AC-1/AC-3 + tempest CLAUDE.md ("the shell … is verified by running the game")
  - Spec text: "A looping sound plays …"; "The warp sound spans the dive …"
  - Implementation: `audio.sustain.test.ts` asserts the engine sets `source.loop=true`, starts/steals/stops the right source, and degrades silently — via the same `FakeAudioContext`/recording-source seam the 10-10 voice-stealing suite uses. It does NOT prove audible looping or that the dive-length truly matches the wav end-to-end; those are verify-by-running.
  - Rationale: node has no WebAudio; the recording fake is the only stable seam, and it pins the observable contract (loop flag, one live voice, stop-on-cue). Real audio is a play-the-game check.
  - Severity: minor
  - Forward impact: the pixel/ear-level "does the hum loop cleanly and the warp sound match the dive" is flagged for verify-by-running at finish.
- **`extra-life` carries a `count` field but is realistically exercised only at count=1**
  - Spec source: context-story-10-11.md, AC-2
  - Spec text: "extra_life … wired to … bonus-life awards"
  - Implementation: `ExtraLifeEvent` includes `count` (lives added this frame) to mirror the ROM's `sound_lives_added`; the tests assert `count===1` on a single threshold crossing. A 2+ multi-cross needs a single award ≥ 2×10000 (unrealistic in one frame), so it is not driven.
  - Rationale: the cue is one sound regardless of how many lives crossed; `count` documents intent and supports a future multi-cross without re-shaping the event.
  - Severity: minor
  - Forward impact: none — the audio plays once per award frame either way.

### Dev (implementation)
- **The zoom/warp loop got its OWN `'zoom'` voice, split off the shared `'warp'` channel**
  - Spec source: TEA Assessment AC-3 contract + `src/shell/audio.ts` CHANNELS (10-10 comment "clear vs. crash are alternatives, never both")
  - Spec text: "`level-clear` → `startLoop('levelClear')` … dispatch → `stopLoop('levelClear')`"
  - Implementation: `levelClear` moved from channel `'warp'` to a new `'zoom'` channel; `warpSpikeCrash` keeps `'warp'`. Previously both shared `'warp'` on the assumption they were mutually exclusive in time. As a sustained loop, `levelClear` now rings DURING the dive, so a mid-dive crash impact (`warpSpikeCrash`) and the loop are live simultaneously — sharing one voice would make the crash steal the loop and then `warp-end`'s `stopLoop` cut the crash short.
  - Rationale: correctness — the loop and the crash must occupy distinct POKEY-style voices so `warp-end` stops only the loop. The 10-10 "alternatives" assumption no longer holds once the cue sustains.
  - Severity: minor
  - Forward impact: a future channel re-map must keep `'zoom'` (loop) and `'warp'` (crash) distinct; captured as a Delivery Finding.
- **Pulsar-hum edge evaluated only in the `playing` branch, against the pre-step input state**
  - Spec source: context-story-10-11.md, AC-1 + TEA `sim.audio-events.test.ts` contract
  - Spec text: "A looping sound plays while a pulsar is present and stops when none remain"
  - Implementation: `emitPulsarHumEdge(state, s)` is called at the end of the `playing` case only, comparing `state.enemies` (pre-step) to `s.enemies` (post-step) pulsar presence. Other modes (`warp`/`dying`/etc.) don't evaluate the edge — pulsars only exist during play, and the board is empty by the time `warp`/`advanceLevel` run.
  - Rationale: pulsars are a `playing`-only entity; evaluating the edge elsewhere would be dead computation and could misfire across a level reset (advanceLevel empties `enemies`). Pinning it to `playing` matches the tested behaviour exactly.
  - Severity: minor
  - Forward impact: if a future mode can hold pulsars (none today), the edge call would need to move up to a mode-agnostic site.

### Reviewer (audit)
- **TEA — Pulsar hum gated on PRESENCE only, not the ROM's "player alive"** → ✓ ACCEPTED by Reviewer: story AC ("while a pulsar is present") outranks the epic/ROM map per spec authority. Note the consequence I surfaced — the hum has no stop on game-over (Medium, non-blocking finding); the presence-only model is sound for in-play behaviour, the game-over leak is a fast-follow.
- **TEA — Warp/zoom cue reuses `levelClear` as a looped source (one-shot → startLoop/stopLoop)** → ✓ ACCEPTED by Reviewer: this IS the AC-3 deliverable, not a simplification; looping the captured `$cc75` bake matches the dive duration with existing assets, and reusing `levelClear` correctly avoids a duplicate of the same ROM record (zoom == warp). Audible-seam risk is verify-by-running.
- **TEA — Sustain/loop verified through a recording-source fake, not real WebAudio** → ✓ ACCEPTED by Reviewer: the only stable seam in node; it pins the observable contract (`loop` flag, one live voice, stop-on-cue) and matches the established 10-10 convention. Real audio is correctly deferred to play-the-game.
- **TEA — `extra-life` carries a `count` field but is exercised only at count=1** → ✓ ACCEPTED by Reviewer: confirmed numerically — a single award crossing 2× `EXTRA_LIFE_INTERVAL` (10000) is impossible with current `scoreFor` values, so count=1 is the only reachable case; the field documents intent without cost.
- **Dev — The zoom/warp loop got its OWN `'zoom'` voice, split off the shared `'warp'` channel** → ✓ ACCEPTED by Reviewer: a correctness fix, not scope creep. The 10-10 "clear vs crash are alternatives, never both" assumption breaks once `levelClear` sustains — I traced the crash-frame dispatch and confirmed the loop-stop (`'zoom'`) no longer clobbers the crash impact (`'warp'`). Well-reasoned.
- **Dev — Pulsar-hum edge evaluated only in the `playing` branch, against the pre-step input state** → ✓ ACCEPTED by Reviewer (with caveat): correct and deterministic for in-play behaviour (verified `state` is the immutable pre-clone). The caveat is exactly the game-over leak I flagged — the `playing`-only evaluation is why no stop fires at game-over; acceptable for this story's AC, follow-up captured.

No UNDOCUMENTED deviations found — TEA and Dev logged every spec divergence I could identify.