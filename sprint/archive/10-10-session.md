---
story_id: "10-10"
jira_key: ""
epic: "10"
workflow: "tdd"
---
# Story 10-10: Voice-stealing audio playback (per-channel cut-in)

## Story Details
- **ID:** 10-10
- **Type:** feature
- **Jira Key:** (none — no Jira integration)
- **Workflow:** tdd (phased)
- **Stack Parent:** none
- **Points:** 3
- **Priority:** p2
- **Epic:** ROM-accurate fidelity gaps (Epic 10)
- **Repos:** tempest

## Story Summary

Make canned-sample playback cut in like POKEY's four hardware channels. Assign each sound to a logical channel and stop the previous source on that channel before starting a new one, eliminating the overlapping-sample pile-up on rapid fire and Superzapper mass-death. 

Today `play()` spawns a new BufferSource every call with no stop/stealing (audio.ts:111-123). The fix is to maintain a map of logical channels (fire, enemy-death, player-death, superzapper, etc.), stop any prior source on that channel, and start the new one. This will prevent the audio layering that currently happens when the player holds fire or the Superzapper bursts.

**Key tasks:**
1. Define logical channels for each sound type (fire, enemy-death, player-death, superzapper, warp, level-clear, pulsar-hum, etc.)
2. Track the current BufferSource for each channel
3. On `play(name)`, identify the channel for that sound, stop the prior source on that channel, and start the new one
4. Handle edge cases: simultaneous different-channel sounds should coexist; channel-stealing should not break graceful degradation on WebAudio failure

**Acceptance Criteria:**
- Sounds are grouped into logical channels; a new trigger stops the prior source on its channel
- Rapid retriggers (held fire, superzap burst) no longer stack into a layered pile-up
- One-shot SFX otherwise unchanged; engine still degrades silently on failure
- Covered by tests in tests/shell/audio.test.ts

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T17:01:13Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T16:35:31Z | 2026-06-29T16:38:21Z | 2m 50s |
| red | 2026-06-29T16:38:21Z | 2026-06-29T16:46:25Z | 8m 4s |
| green | 2026-06-29T16:46:25Z | 2026-06-29T16:52:20Z | 5m 55s |
| review | 2026-06-29T16:52:20Z | 2026-06-29T17:01:13Z | 8m 53s |
| finish | 2026-06-29T17:01:13Z | - | - |

## SM Assessment

**Setup complete — cleared for Tea (RED phase).**

- **Scope:** Shell-only audio subsystem enhancement. Modify `src/shell/audio.ts` to implement channel-based voice stealing. No core changes — the pure simulation is unaffected.
- **Why TDD/phased:** 3-pt feature with clear test boundaries. Write failing tests first to define each channel's behavior, then implement the channel map and stopping logic.
- **Key technical approach:**
  1. Add a `channels` map to the AudioEngine: `Map<string, BufferSource | null>` keyed by channel name.
  2. Define channel assignment for each sound (e.g., `fire` → "fire", `enemyDeath` → "enemy", `superzapperActivate` → "superzapper-burst").
  3. In `play(name, vol)`, look up the sound's channel, stop any existing source on that channel, and start the new one.
  4. Keep the try/catch silent-degradation intact; if stopping or starting fails, the channel state is left as-is and playback degrades gracefully.
- **Risk flags:**
  - **Stopping sources:** Ensure the stopped BufferSource is properly disconnected and dereferenced so it doesn't ghost-play or hold audio context resources.
  - **Simultaneous multi-channel:** Confirm that stopping channel A does not affect channel B; they should be independent.
  - **Rapid re-trigger:** If the same sound is fired twice in rapid succession (held fire button), the second `play()` must stop the first source before starting the second, not layer them.
- **Test strategy:** Write tests in `tests/shell/audio.test.ts` to verify each channel independently, then multi-channel coexistence, then rapid re-trigger scenarios. Mock BufferSource stop/start to observe behavior.
- **Branch:** `feat/10-10-voice-stealing-audio` off `develop` (gitflow, Tempest uses feat→develop). SM will push; Tea will write tests; Dev will implement.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** 3-pt feature with a clear, observable behavioural contract (channel cut-in). The change lives entirely in `play()` (`src/shell/audio.ts`).

**Test Files:**
- `tempest/tests/shell/audio.test.ts` — added the `voice-stealing playback (story 10-10: per-channel cut-in)` describe block, plus recording-source scaffolding: `createBufferSource()` on the fake context, a module-level `sources` array (reset per test like `fetched`), a `recSource()` factory that records `start()`/`stop()` (and accepts throwing overrides), and a `readyEngine()` helper that waits for samples to decode before `play()`.

**Tests Written:** 7 tests covering 3 ACs.
**Status:** RED — 2 feature tests fail as designed, 612 prior tests still green, no other test file touched, no TS/collection errors.

| # | Test | AC | RED result |
|---|------|----|-----------|
| 1 | stops the prior source when the same sound retriggers | AC#1 | **failing** (drives feature) |
| 2 | leaves exactly one live source after a rapid burst of one sound | AC#2 | **failing** (drives feature) |
| 3 | does not stop a sound on a different channel | AC#1 | passing guard (blocks a global stop-everything impl) |
| 4 | plays a single one-shot unchanged: one started, un-stopped source | AC#3 | passing guard |
| 5 | creates no source for a sound that has not loaded yet | AC#3 | passing guard |
| 6 | swallows a throwing stop() and still starts the replacement | AC#3 | passing guard (becomes load-bearing once steal is added) |
| 7 | swallows a throwing start() without crashing the frame | AC#3 | passing guard |

The two RED tests fail with exactly the diagnostic intended: `sources[0].stopped` is `false` (no steal), and a 6-trigger burst leaves 6 live sources instead of 1.

### Rule Coverage

Most of the TypeScript lang-review checklist (React/JSX #6, build-config #9, perf/bundle #12) is N/A to a shell audio change. The applicable checks and their test pressure:

| Rule (typescript.md) | Test(s) | Status |
|------|---------|--------|
| #4 null/undefined — `Map.get()` result used without undefined check (the channel→source lookup must tolerate "no prior source") | #4 single one-shot (absent-prior path), #1 (present-prior path) | covered |
| #8 test quality — no `as any`, mock shape matches the real `BufferSource` surface `play()` touches, meaningful assertions | whole suite (recording fake implements buffer/connect/start/stop/disconnect) | covered |
| #11 error handling — silent degradation, no swallowed-and-re-thrown | #6 throwing stop(), #7 throwing start() | covered |
| #1 type-safety escapes — no `as any`/`@ts-ignore` introduced | test file compiles clean, zero `as any` | covered |

**Rules checked:** 4 of 4 applicable lang-review rules have test coverage.
**Self-check:** 0 vacuous tests — every test has a message-bearing, value-checking assertion; none use `let _ =`, `assert(true)`, or `is_none()`-on-always-none. The `disconnect()` method on the fake exists so a real impl that disconnects the stolen voice won't crash the fake; no test over-asserts on it.

**Handoff:** To Dev (Julia) for implementation — assign each manifest sound to a logical channel, track the live source per channel, and on `play()` stop+replace the prior source on that sound's channel. Keep the `stop()` in its own guard so a flaky stop can't abort the cut-in.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `tempest/src/shell/audio.ts` — added a `CHANNELS: Record<SoundName, string>` map assigning each manifest sound to a logical channel, a per-engine `live: Map<string, AudioBufferSourceNode>` tracking the source currently sounding on each channel, and rewrote `play()` to steal the channel (stop+disconnect the prior source) before starting the replacement. The steal's `stop()` sits in its own try/catch separate from the start path; an `onended` handler clears a finished source from its channel so a later trigger never stops an already-ended node.

**Tests:** 614/614 passing (GREEN) — all 7 voice-stealing tests pass; `npx tsc --noEmit` clean (exit 0); no other test file regressed.
**Branch:** `feat/10-10-voice-stealing-audio` (pushed to origin)

**AC coverage:**
- AC#1 (grouped channels, steal prior on its channel) — `CHANNELS` map + steal logic; verified by tests #1, #3.
- AC#2 (rapid retriggers don't pile up) — same-channel steal; verified by test #2 (6× burst → 1 live).
- AC#3 (one-shot unchanged, silent degradation) — no-prior path untouched, two separate guards; verified by tests #4–#7.

**Self-review:** Code wired into the existing `play()` already called by `audio-dispatch.ts` (no new call sites needed — the dispatcher's `play(name)` calls now steal automatically). Follows the module's silent-degradation pattern. No debug code. Working tree clean after commit.

**Handoff:** To verify/review phase.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 614/614 green, tsc exit 0, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (manually audited paths myself) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings (manually audited the 2 catch blocks myself) |
| 4 | reviewer-test-analyzer | Yes | findings | 5 | confirmed 5 (all LOW/MEDIUM, non-blocking), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings (comments read during my diff pass — accurate) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (types audited via rule-checker #1/#2/#4) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings (no untrusted input — see [SEC] below) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings (manually judged complexity — see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (LOW, duplicate of test-analyzer onended gap), dismissed 0 |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled per `workflow.reviewer_subagents`)
**Total findings:** 6 confirmed (1 is a cross-unit duplicate → 5 distinct, all LOW/MEDIUM non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** A gameplay event (e.g. `enemy-death`) → `playEventSounds(audio, events)` (audio-dispatch.ts) → `audio.play('enemyDeath')` → `CHANNELS['enemyDeath'] = 'enemy'` → steal prior source on `'enemy'` (stop+disconnect) → start new `BufferSource` → register in `live['enemy']`. Safe because the channel lookup is total over `SoundName` (exhaustive `Record`), the prior-source path is guarded by `if (prev)`, and both the steal and the start sit in independent try/catch blocks so no audio failure reaches the game loop.

**Pattern observed:** Closure-based engine state extended cleanly — `live` joins `ctx`/`master`/`buffers` as per-engine closure state (audio.ts:101); the channel map is a module constant keyed by `SoundName` so an unmapped new sound is a compile error (audio.ts:56). Consistent with the existing module idiom.

**Error handling:** Two separated guards — steal `stop()`/`disconnect()` (audio.ts:154-159) and create/start (audio.ts:161-174). A throwing `stop()` on an already-ended node is swallowed and the replacement still starts (verified by test #6). A throwing `start()` correctly skips `live.set`, leaving the channel unregistered (audio.ts:172). Matches the CLAUDE.md silent-degradation mandate.

### Confirmed Findings (none blocking — no Critical/High)

- `[TEST]` `[RULE]` **LOW — `onended` cleanup path untested + `RecSource` lacks `onended`** (tests/shell/audio.test.ts:49; audio.ts:167). Flagged by both test-analyzer (rated high) and rule-checker (rated low). **Downgraded to LOW with rationale:** omitting `onended` is not even a correctness bug — calling `stop()` on a naturally-ended node is already swallowed by the steal guard (audio.ts:154-159), so `onended` is a tidy-up optimization, not load-bearing. The gap is "a regression here wouldn't be caught," on code that is currently correct. Non-blocking; captured as a delivery improvement.
- `[TEST]` **LOW — stolen-source `disconnect()` untested** (tests/shell/audio.test.ts:235). The mock tracks `disconnected` but no test asserts it; removing `prev.disconnect()` would keep all tests green. Graph hygiene, not behavior. Non-blocking.
- `[TEST]` **MEDIUM — cross-sound same-channel stealing untested** (the `enemy`, `player-life`, `warp` sharing pairs). Only same-sound retrigger and the `fire`/`playerDeath` independence pair are exercised. **Covered by TEA's accepted deviation** (tests deliberately don't pin the grouping; Reviewer eyeballs it — I did, see Rule Compliance). Non-blocking; test addition suggested.
- `[TEST]` **MEDIUM — `segmentTick` "survives held fire" isolation untested**. The audio.ts:66 comment states this as an explicit design goal; no test pins it. I manually verified `CHANNELS.segmentTick = 'segment' ≠ CHANNELS.fire = 'fire'`. Non-blocking; cheap test suggested.
- `[TEST]` **LOW — throwing-`start()` test asserts only `not.toThrow()`** (tests/shell/audio.test.ts:302). Post-failure playable state is unverified; the state is in fact correct (`live` not set). Non-blocking.

### My own observations (5+, not from subagents)

- `[VERIFIED]` **Architectural boundary intact** — audio.ts is in `src/shell/`, imports nothing from `src/core/`, uses `AudioContext`/`GainNode`/`AudioBufferSourceNode`. Complies with the CLAUDE.md hard boundary (core stays pure). Evidence: diff touches only `src/shell/audio.ts`; no `../core` import added.
- `[VERIFIED]` **Silent degradation preserved** — both new/modified catch blocks (audio.ts:154-159, 161-174) swallow, matching the pre-existing pattern at audio.ts:85-87/120-122. Confirmed by rule-checker #11.
- `[VERIFIED]` **`onended` stale-reference handled** — the closure's `if (live.get(channel) === source)` identity check (audio.ts:168) means a prior source's late `onended` (fired when stolen) cannot evict the *newer* live source. Confirmed by rule-checker.
- `[VERIFIED]` **No `undefined` deref** — `CHANNELS[name]` is total over `SoundName` (typed `string`, not `string|undefined`); `live.get(channel)` used only under `if (prev)`. Confirmed by rule-checker #4.
- `[LOW]` **Same-frame collapse (fidelity nuance)** — `playEventSounds` loops synchronously over a frame's events, so a Superzapper mass-death's many `enemy-death` events each start+steal in the *same* audio tick → only the **last** is audible (earlier sources play ~0 samples). This satisfies AC#2 (no pile-up) but is more aggressive than POKEY's rapid retrigger envelope. Non-blocking; logged as a delivery finding for a future fidelity-polish story.
- `[LOW]` **Naturally-ended sources removed from `live` but not `disconnect()`-ed** (audio.ts:168 deletes only) — relies on WebAudio auto-GC of finished nodes, inconsistent with the stolen-source path which disconnects. Not a real leak; noted.

### Skipped-subagent domains (covered manually)

- `[EDGE]` Edge-hunter disabled — I enumerated boundary paths myself: no-prior-source, prior-source-present, throwing-stop, throwing-start, unloaded-buffer, ctx-not-ready. All handled.
- `[SILENT]` Silent-failure-hunter disabled — the two empty `catch {}` blocks are *intentional, documented* silent degradation required by CLAUDE.md, not swallowed bugs. No new silent failure introduced.
- `[DOC]` Comment-analyzer disabled — the added comments (audio.ts:43-65, 96-100, 148-153, 165-167) accurately describe the code; no stale/misleading docs.
- `[TYPE]` Type-design disabled — covered by rule-checker #1/#2/#4: `Record<SoundName,string>` and `Map<string,AudioBufferSourceNode>` are appropriately specific; no stringly-typed escape.
- `[SEC]` Security disabled — N/A: no untrusted input, no network sink, no `eval`/injection surface; `SoundName` is a compile-time union, not user data.
- `[SIMPLE]` Simplifier disabled — implementation is minimal: one const map + one Map + ~20 lines in `play()`. No dead code or over-engineering. The `onended` cleanup is the only "extra," and it is justified (avoids redundant `stop()` on ended nodes).

### Rule Compliance

Checked against `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) + tempest/CLAUDE.md (hard boundary, silent degradation). No `.claude/rules/*.md` or `SOUL.md` exist in this repo.

| # | Rule | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Type-safety escapes | PASS | No `as any`/`@ts-ignore`/`!` in diff (audio.ts:56,101,146,151,167; test file) |
| 2 | Generic/interface pitfalls | PASS | `Record<SoundName,string>`, `Map<string,AudioBufferSourceNode>`, `Partial<Pick<…>>` — all specific |
| 3 | Enum anti-patterns | N/A | No enums; `SoundName` is a union, `CHANNELS` a plain object |
| 4 | Null/undefined | PASS | `CHANNELS[name]` total over SoundName; `live.get()` guarded by `if(prev)` |
| 5 | Module/declaration | PASS | No new imports/re-exports; bundler resolution needs no `.js` |
| 6 | React/JSX | N/A | Canvas 2D game, no React/JSX |
| 7 | Async/Promise | PASS | `readyEngine()` async, all callers await; no missing await |
| 8 | Test quality | PASS* | No `as any`, messages on all asserts; *one LOW gap: `RecSource` lacks `onended` (confirmed finding) |
| 9 | Build/config | N/A | tsconfig untouched by diff |
| 10 | Type-level input validation | N/A | No untrusted input |
| 11 | Error handling | PASS | Bare `catch {}` (better than `catch(e:any)`), intentional+documented degradation |
| 12 | Performance/bundle | PASS | O(1) map/Map ops in hot path; no stringify, no barrel imports |
| 13 | Fix-introduced regressions | PASS | Original feature; no regression class introduced |
| CLAUDE.md | Hard core/shell boundary | PASS | audio.ts in shell, no core import, uses AudioContext |
| CLAUDE.md | Silent audio degradation | PASS | Both guards swallow; failures never reach the game loop |

### Devil's Advocate

Let me argue this code is broken. **Claim 1: the superzapper makes audio *worse*, not better.** A mass-death fires many `enemy-death` events in one synchronous frame; each `play('enemyDeath')` instantly steals the prior, so all but the last produce zero samples. The player who used to hear a satisfying wall of explosions now hears a single pop. Counter: that single-pop is exactly "no pile-up" (AC#2), and the events are same-channel by design; it is the intended trade, though I flag the fidelity nuance as a follow-up. **Claim 2: a stolen source ghost-plays.** If `prev.stop()` throws (already ended) we skip `prev.disconnect()`, leaving it on the graph. Counter: a node that *threw on stop()* has already ended, so it produces no sound and is GC-eligible; no ghost audio. **Claim 3: `live` leaks unboundedly.** Counter: at most one entry per channel (≤6 total); `onended` and steal both prune; bounded. **Claim 4: a late `onended` from a stolen source nukes the live voice.** When we steal, `stop()` schedules the old source's `onended`; if it fired and blindly deleted, the new voice would be orphaned. Counter: the `=== source` identity guard prevents exactly this — the old closure sees the *new* source in `live` and no-ops. **Claim 5: re-entrancy.** `onended` is async (microtask/event), never fires during the synchronous `play()`, so no mid-mutation reentry. **Claim 6: a confused future dev adds a sound to `SOUNDS` but not `CHANNELS`.** Counter: `Record<SoundName,string>` makes that a compile error — the type system enforces the wiring. **Claim 7: throwing `start()` corrupts state.** Counter: `live.set` is after `start()`, so a throw leaves the channel cleanly unregistered; next play creates fresh. The strongest surviving point is Claim 1, which is a deliberate AC-satisfying trade-off, not a defect. Nothing rises to Critical/High.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): The story summary and SM notes list "pulsar-hum" and "sustained warp" as channels, but those sounds are story 10-11's scope (sustained/looping) and are not in the current `SOUNDS` manifest. Affects `tempest/src/shell/audio.ts` (assign channels only to the 10 sounds already in `SOUNDS`; no loop/sustain support here — that's 10-11). *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings during implementation. (Honored TEA's note: channels are assigned only to the 10 sounds already in the `SOUNDS` manifest; no loop/sustain — that stays 10-11.)

### Reviewer (code review)
- **Improvement** (non-blocking): Test coverage gaps on correct code — the `onended` natural-completion eviction path, the stolen-source `disconnect()` call, cross-sound same-channel stealing (`enemy`/`player-life`/`warp` pairs), the `segmentTick`-survives-held-fire isolation, and the throwing-`start()` post-failure state are all unexercised. Affects `tempest/tests/shell/audio.test.ts` (add `onended` to `RecSource` + a helper to fire it; add `disconnected`/cross-channel/`segmentTick` assertions). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): A Superzapper mass-death emits many same-frame `enemy-death` events that each start+steal in one audio tick, so only the last is audible — fewer "wall of explosions," more single-pop. Satisfies AC#2 but differs from POKEY's rapid retrigger envelope. Affects `tempest/src/shell/audio.ts` (a future fidelity story could retrigger the envelope or stagger same-frame same-channel events). *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 3 findings (0 Gap, 0 Conflict, 0 Question, 3 Improvement)
**Blocking:** None

- **Improvement:** The story summary and SM notes list "pulsar-hum" and "sustained warp" as channels, but those sounds are story 10-11's scope (sustained/looping) and are not in the current `SOUNDS` manifest. Affects `tempest/src/shell/audio.ts`.
- **Improvement:** Test coverage gaps on correct code — the `onended` natural-completion eviction path, the stolen-source `disconnect()` call, cross-sound same-channel stealing (`enemy`/`player-life`/`warp` pairs), the `segmentTick`-survives-held-fire isolation, and the throwing-`start()` post-failure state are all unexercised. Affects `tempest/tests/shell/audio.test.ts`.
- **Improvement:** A Superzapper mass-death emits many same-frame `enemy-death` events that each start+steal in one audio tick, so only the last is audible — fewer "wall of explosions," more single-pop. Satisfies AC#2 but differs from POKEY's rapid retrigger envelope. Affects `tempest/src/shell/audio.ts`.

### Downstream Effects

Cross-module impact: 3 findings across 2 modules

- **`tempest/src/shell`** — 2 findings
- **`tempest/tests/shell`** — 1 finding

### Deviation Justifications

3 deviations

- **Test the per-channel cut-in contract, not the exact POKEY 4-channel grouping**
  - Rationale: The exact grouping (how many channels, which sound on which) is an internal detail not observable from `BufferSource` start/stop, and the ACs target pile-up elimination, not ROM channel-register fidelity. Pinning a fixed map would over-couple the tests to one implementation.
  - Severity: minor
  - Forward impact: Dev may choose any sensible channel map (per-sound or grouped); Reviewer should eyeball the grouping since the tests do not pin it.
- **AC#3 "degrades silently" read as: a throwing stop() must still start the replacement**
  - Rationale: A failed channel-steal must not abort the cut-in — playing the new sound is the whole point. This forces Dev to isolate the steal's `stop()` in its own guard so a flaky stop cannot suppress the replacement.
  - Severity: minor
  - Forward impact: Dev must wrap the prior-source `stop()` in a try/catch separate from the new-source start path.
- **Used six logical channels, not literally POKEY's four**
  - Rationale: "Four hardware channels" is the hardware that motivates the cut-in; AC#1 only requires "grouped into logical channels." I grouped sounds only where they are same-category AND mutually exclusive in time (death/respawn, clear/crash, enemy fire/death), and kept the rapid Claw cues (`fire`, `segment`) on their own channels — forcing four would make a held fire silence the lane-cross ticks, a new UX regression the story does not ask for. The observable AC behaviour (no same-channel pile-up; distinct channels independent) is unchanged.
  - Severity: minor
  - Forward impact: none for siblings. Reviewer should sanity-check the grouping (TEA's tests intentionally do not pin it).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Test the per-channel cut-in contract, not the exact POKEY 4-channel grouping**
  - Spec source: context-story-10-10.md, AC-1
  - Spec text: "Sounds are grouped into logical channels; a new trigger stops the prior source on its channel"
  - Implementation: Tests assert observable behaviour — a same-sound retrigger steals its own channel, and two clearly-distinct sounds (`fire` vs `playerDeath`) stay independent — instead of asserting a specific channel map or a fixed count of four channels.
  - Rationale: The exact grouping (how many channels, which sound on which) is an internal detail not observable from `BufferSource` start/stop, and the ACs target pile-up elimination, not ROM channel-register fidelity. Pinning a fixed map would over-couple the tests to one implementation.
  - Severity: minor
  - Forward impact: Dev may choose any sensible channel map (per-sound or grouped); Reviewer should eyeball the grouping since the tests do not pin it.
- **AC#3 "degrades silently" read as: a throwing stop() must still start the replacement**
  - Spec source: context-story-10-10.md, AC-3
  - Spec text: "One-shot SFX otherwise unchanged; engine still degrades silently on failure"
  - Implementation: The throwing-`stop()` test (#6) asserts `play()` both swallows the error AND still starts the new voice, not merely "does not throw".
  - Rationale: A failed channel-steal must not abort the cut-in — playing the new sound is the whole point. This forces Dev to isolate the steal's `stop()` in its own guard so a flaky stop cannot suppress the replacement.
  - Severity: minor
  - Forward impact: Dev must wrap the prior-source `stop()` in a try/catch separate from the new-source start path.

### Dev (implementation)
- **Used six logical channels, not literally POKEY's four**
  - Spec source: context-story-10-10.md, Problem statement (story description)
  - Spec text: "Make canned-sample playback cut in like POKEYs four hardware channels"
  - Implementation: `CHANNELS` maps the 10 sounds onto six logical channels — `fire`, `enemy` (enemyFire+enemyDeath), `grab`, `player-life` (playerDeath+playerSpawn), `warp` (levelClear+warpSpikeCrash), `zap`, `segment` — rather than collapsing everything into exactly four.
  - Rationale: "Four hardware channels" is the hardware that motivates the cut-in; AC#1 only requires "grouped into logical channels." I grouped sounds only where they are same-category AND mutually exclusive in time (death/respawn, clear/crash, enemy fire/death), and kept the rapid Claw cues (`fire`, `segment`) on their own channels — forcing four would make a held fire silence the lane-cross ticks, a new UX regression the story does not ask for. The observable AC behaviour (no same-channel pile-up; distinct channels independent) is unchanged.
  - Severity: minor
  - Forward impact: none for siblings. Reviewer should sanity-check the grouping (TEA's tests intentionally do not pin it).

### Reviewer (audit)
- **TEA: "Test the per-channel cut-in contract, not the exact 4-channel grouping"** → ✓ ACCEPTED by Reviewer: sound — the observable contract (same-channel steal + channel independence) is the right thing to pin; the internal grouping isn't observable from `BufferSource` start/stop. I discharged the "Reviewer should eyeball it" obligation manually (see Rule Compliance).
- **TEA: "AC#3 degrades silently read as a throwing stop() must still start the replacement"** → ✓ ACCEPTED by Reviewer: correct reading — the cut-in is the whole point, so a flaky stop must not abort it. Enforced by the separated guards (audio.ts:154-159 vs 161-174) and test #6.
- **Dev: "Used six logical channels, not literally POKEY's four"** → ✓ ACCEPTED by Reviewer: the grouping is sensible — sounds share a channel only when same-category AND time-exclusive (death/respawn, clear/crash, enemy fire/death), and the rapid Claw cues (`fire`, `segment`) stay separate so a held fire never silences lane-cross ticks. Forcing exactly four would introduce a UX regression the story never asked for. AC#1 requires "logical channels," not "four." Verified `CHANNELS` covers all 10 `SoundName` keys with `fire ≠ playerDeath` (test #3 holds) and `segmentTick ≠ fire`.