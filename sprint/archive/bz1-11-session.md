---
story_id: "bz1-11"
jira_key: ""
epic: "bz1"
workflow: "tdd"
---
# Story bz1-11: Audio — engine hum, cannon, explosion, enemy motion, saucer

## Story Details
- **ID:** bz1-11
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-04T04:46:28Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-04T04:00:44Z | 2026-07-04T04:02:29Z | 1m 45s |
| red | 2026-07-04T04:02:29Z | 2026-07-04T04:15:35Z | 13m 6s |
| green | 2026-07-04T04:15:35Z | 2026-07-04T04:24:12Z | 8m 37s |
| review | 2026-07-04T04:24:12Z | 2026-07-04T04:35:31Z | 11m 19s |
| red | 2026-07-04T04:35:31Z | 2026-07-04T04:41:30Z | 5m 59s |
| green | 2026-07-04T04:41:30Z | 2026-07-04T04:44:35Z | 3m 5s |
| review | 2026-07-04T04:44:35Z | 2026-07-04T04:46:28Z | 1m 53s |
| finish | 2026-07-04T04:46:28Z | - | - |

## Sm Assessment

**Setup complete.** Story bz1-11 (Audio — engine hum, cannon, explosion, enemy motion, saucer; 2 pts, epic bz1, repo battlezone) is ready for the RED phase.

- **Branch:** `feat/bz1-11-audio-sfx` cut from `origin/develop` at 323ac8f (the bz1-10 merge commit) — develop synced and clean.
- **Merge gate:** clear — no open PRs in battlezone; bz1-10 (PR #9) merged and finished (archived, pushed to orchestrator main as 9ee0c85).
- **Context:** story context (`context-story-bz1-11.md`) and epic context (`context-epic-bz1.md`) validated by sm-setup; curated epic Background preserved.
- **Jira:** skipped (not configured for this project).
- **Technical framing for TEA:** sound *triggers* must derive from deterministic core state/events (src/core stays I/O-free); Web Audio synthesis belongs in src/shell. Tempest's shell audio is the sibling precedent for structure, but Battlezone's hardware is discrete analog + POKEY — do not reuse tempest's R2-hosted POKEY assets. ROM reference for authentic behavior: ~/Downloads/va-battlezone SourceGen project.
- **Routing:** phased tdd → next phase `red`, owner `tea`.

## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `battlezone/tests/core/events.test.ts` — the pure-core `GameEvent` channel (star-wars pattern): boot-empty, data-only, fresh-per-step, no-mutation; `shot-fired` (slot-transition exact, no re-fire in flight), `enemy-destroyed` (kind payload, once-only), `player-hit` (incl. final-death/gameover step), `hostile-spawn` (exactly once, at the exploding→alive flip, kind self-consistent), `saucer-present`/`saucer-gone` (arrival step, kill step incl. `enemy-destroyed(saucer)`, below-gate silence); game-over hold silent; 600-step scripted determinism (stream non-empty and byte-identical across runs); 600-step invariant that `shot-fired` coincides exactly with the shell slot filling.
- `battlezone/tests/core/core-audio-free.test.ts` — swept guard for the story's grep AC: every current and future `src/core/*.ts` file free of Web Audio references AND of shell imports. Green pre-GREEN by design (house precedent: bz1-10 coin-op audit).
- `battlezone/tests/shell/audio.test.ts` — WebAudio engine against a recording fake `AudioContext`: NO context at module import or `createAudioEngine()` (gesture gate), pre-resume calls are silent no-ops, `resume()` builds exactly one context and repeats are harmless; `engineParams(throttle)` pure curve (pitch strictly rises with throttle, audible idle gain in (0,1], out-of-range clamped); `setEngine` wiring applies the pure params to live oscillator/gain nodes; one-shots synthesize nodes only post-gate; loops defensive (double-start/orphan-stop). Plus a lang-review #1 static scan of both new shell files.
- `battlezone/tests/shell/audio-dispatch.test.ts` — pure event→sound map with a recording fake (tempest `playEventSounds` extraction, NOT star-wars's inline switch): `shot-fired`→cannon, `enemy-destroyed`(all four kinds)/`player-hit`→explosion, `saucer-present/gone`→warble loop start/stop, `hostile-spawn` silent, empty frame silent, multi-event frames dispatch in core order, full-union no-throw; `updateContinuousSounds(audio, state, input)`: hum endpoints (full treads→1, idle→0, single tread strictly between, reverse counts via |·|), gameover silences the engine, track loop follows hostile liveness (alive→start, exploding→stop).

**Tests Written:** 46 tests across 3 contract files + the swept guard file, covering all 7 ACs (AC-7 build/test-green is the pipeline itself)
**Status:** RED (verified by testing-runner, run bz1-11-tea-red: 26 failures + audio-dispatch module-load failure blocking its 16 tests; failures are module-not-found for the two shell modules and `GameState.events`-missing assertions; **559 pre-existing tests green, zero regressions**)

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes | `shell audio modules keep the type system honest` static scan; core-purity-sweep auto-covers the new `core/events.ts` | failing (files absent — RED) |
| #2 readonly/interface hygiene | dispatch receives `readonly GameEvent[]` frames; fakes typed with exact signatures, no `Function` | failing (RED) |
| #3 exhaustiveness | `handles every event kind in the union without throwing`; compile-time `never` guard expected in dispatch (tempest pattern, enforced by `tsc` at build) | failing (RED) |
| #4 null/undefined boundaries | pre-resume no-ops, orphan `stopLoop`, double `startLoop`, `engineParams` clamping | failing (RED) |
| #8 test quality | self-check below; recording fakes assert exact call sequences, never `toBeTruthy` smoke | done |
| #10 input validation | `engineParams` out-of-range throttle clamped to [0,1] | failing (RED) |

**Rules checked:** 6 of 13 lang-review rules have test coverage; the rest are N/A for this slice (#6 React, #9 build config untouched, #12 bundle) or land at Dev/build time (#5 module declarations, #7 async — the engine's `resume()` promise is fire-and-forget by design, #11 error handling — covered behaviorally by the silent-degrade no-throw tests, #13 fix-regression meta-check).
**Self-check:** 0 vacuous tests. Every test asserts a value or an exact call sequence. 4 negative-guard tests in events.test.ts pass pre-GREEN by design; each is paired with a RED positive twin, so none can go vacuously green.

**Handoff:** To Dev (The Word Burgers) for GREEN. Implementation surface pinned by the tests: `core/events.ts` (six-kind `GameEvent` union), `state.events` (fresh each step, `[]` at boot), emission wired in `sim.ts`'s step paths, `shell/audio.ts` (`createAudioEngine` + pure `engineParams`), `shell/audio-dispatch.ts` (`playEventSounds` + `updateContinuousSounds`), main.ts gesture unlock + per-frame pump (inspection layer). Remember the story's sourcing rule: document every synthesis approximation in `reference/README.md`, never as ROM fact.

### Rework RED (review round 1)

Immortan Joe's rejection converted to failing tests (commit a0e81e6; verified by testing-runner run bz1-11-tea-red-2: **exactly 9 RED, 614 green, zero regressions**):

- **Finding 1 (warble leak):** two fix-agnostic lifecycle scenarios in audio-dispatch.test.ts pump the REAL stepGame frame sequence through the full dispatch — run-ends-with-live-visitor must reach attract with the warble stopped; run-starts-over-a-demo-visitor must not inherit it. Either closing events at the resets or a state-driven stop satisfies them.
- **Finding 2 (audible "silence"):** new engine affordance pinned — `stopEngine()` (exists, pre-gate/pre-hum no-op, drives the hum gain to a REAL 0, idempotent, later `setEngine` revives at correct params). The gameover continuous test is REVISED from `setEngine(0)` to `stopEngine` + zero `setEngine` calls, and an attract twin is added (also closes the analyzer's attract-coverage note). `engineParams(0)` stays audibly non-zero — the in-run idle pin is untouched.
- **MEDIUM gaps as green guards:** saucer natural departure (`saucer-gone` without `enemy-destroyed`), mutual-kill same tick (both events, respawn AND final-death variants), repeat-`resume()` nudge spy, loop double-start node-count flatness, hum-singleton node count, webkit-only ctor branch, no-WebAudio permanent-silence branch.
- **[RULE] fix:** the fake's `createPeriodicWave(): object` → `Record<string, never>` (lang-review #2).

**Status:** RED (9 failing). **Handoff:** The Word Burgers — implement `stopEngine`, the dispatch silence calls, and the warble mode-reset stop; every guard must stay green.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `battlezone/src/core/events.ts` (new) — the six-kind `GameEvent` discriminated union (star-wars pattern): `shot-fired`, `enemy-destroyed` (kind: roster | 'saucer'), `player-hit`, `hostile-spawn` (kind), `saucer-present`, `saucer-gone`. Pure data, `import type` only, no shell references — passes the audio-free sweep and the epic purity sweep untouched
- `battlezone/src/core/state.ts` — `readonly events: readonly GameEvent[]` on `GameState`; `initGame` boots `[]`
- `battlezone/src/core/sim.ts` — emission in `stepBattle` from the step's own transitions: cannon cue judged POST-consumption (cue↔slot exact), kills off the once-only `scoreAward` edges, saucer lifecycle off alive-window transitions, replacement off the exploding→alive flip, `player-hit` in both death branches; respawn branch filters the cannon cue (slot wiped — see deviation); game-over hold returns `events: []`
- `battlezone/src/shell/audio.ts` (new) — gesture-gated WebAudio synthesis engine: context built ONLY inside `resume()` (idempotent), every method a silent no-op pre-gate; pure `engineParams` curve (sawtooth 40→120 Hz, gain 0.12→0.30); cannon/explosion as filtered noise bursts; saucer warble (620 Hz triangle ± 6 Hz LFO) and track rattle (55 Hz square, 9 Hz chop) as defensive start/stop loops. All params approximations, never ROM facts
- `battlezone/src/shell/audio-dispatch.ts` (new) — pure `playEventSounds` (tempest extraction pattern, compile-time `never` exhaustiveness guard) + `updateContinuousSounds` (|tread| effort → hum, hostile liveness → track; both silent outside `playing`)
- `battlezone/src/main.ts` — engine at bootstrap (no context — construction is not a gesture), `pointerdown`/`keydown` unlock, per-frame pump after `stepGame`
- `battlezone/reference/README.md` (gitignored, this checkout) — "Sound synthesis sources (bz1-11)" section: per-sound hardware attribution and synthesis approximation table, R2 escape hatch documented

**Tests:** 608/608 passing across 36 files (GREEN verified by testing-runner run bz1-11-dev-green-2; `tsc --noEmit` + `vite build` clean). One mid-GREEN fix: the 600-step invariant caught a fire-and-die-same-step edge at step 375 — respawn now drops the orphaned cannon cue.
**Branch:** feat/bz1-11-audio-sfx (pushed, commits 825c629 test + aa1bfbc feat)

**Handoff:** To Imperator Furiosa (TEA) for verify (simplify + quality-pass), then Immortan Joe for review. Reviewer inspection items from the TEA deviations: main.ts gesture wiring (AC-5 inspection layer) and the reference/README.md sourcing section (AC-4, gitignored — read it in this checkout).

### Rework GREEN (review round 1)

Both HIGH findings fixed (commit a2e234d; testing-runner run bz1-11-dev-green-3: **623/623 GREEN, build clean, zero regressions**):

- **Finding 2 → `stopEngine()`** (`battlezone/src/shell/audio.ts`): zeroes the hum gain outright; the oscillator keeps running so the next `setEngine` revives it at fresh params. Pre-gate/pre-hum calls are guarded no-ops. `setEngine(0)` remains the audible in-run idle — the two contracts no longer collide.
- **Finding 1 → state-driven warble stop** (`battlezone/src/shell/audio-dispatch.ts`): `updateContinuousSounds` now stops the saucer loop whenever no LIVE visitor exists, and calls `stopEngine` (never `setEngine`) outside `playing`. Fix choice: the Reviewer allowed closing-events-at-resets OR a state-driven stop — chose the state-driven stop because it leaves core's determinism surface untouched and mirrors how the track loop already works; the event channel stays the belt, state the suspenders. The misleading "silent" comment block was rewritten to describe actual behavior.
- All 11 rework guards (depart, mutual-kill ×2, resume spy, node counts, ctor branches) stayed green; `main.ts` needed no change.

**Branch:** feat/bz1-11-audio-sfx (pushed through a2e234d). **Handoff:** Back to Immortan Joe for re-review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 608/608 GREEN, build clean, zero smells, tree clean |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — edge pass performed by Reviewer directly (found findings 1–2) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — silent-degrade paths reviewed directly (engine no-ops verified deliberate) |
| 4 | reviewer-test-analyzer | Yes | findings | 9 | confirmed 6, noted 2 (low), dismissed 1 (see below) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — doc pass performed directly (found the false "silences" claim, finding 2) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — type pass covered by rule-checker #1–#5 (clean) |
| 7 | reviewer-security | Yes | clean | none | N/A — core purity, gesture gate, no network, no type escapes all verified |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — no over-engineering observed in direct read |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (rule #2, cannot dismiss a rule match) |

**All received:** Yes (4 enabled returned: 2 clean, 2 with findings; 5 disabled via settings)
**Total findings:** 9 confirmed (2 HIGH from Reviewer's own pass, 4 MEDIUM, 3 LOW), 1 dismissed (with rationale), 2 noted as low-confidence observations

Dismissal: test-analyzer's "staged fixtures vs organic play" (low confidence) — dismissed because the staging pattern is the established house fixture (lives.test.ts/enemies.test.ts precedent) and the analyzer itself concedes events.ts is a thin translation layer over signals those suites already unit-test organically.

## Reviewer Assessment

**Verdict:** APPROVED (round 2 — round 1 verdict was REJECTED; every finding resolved, see `### Round 2` below; the round-1 record follows unchanged)

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | **Saucer warble leaks across mode resets.** `saucer-gone` is emitted only inside `stepBattle`; `startRun` (sim.ts:70) and `returnToAttract` (sim.ts:82) rebuild state via `initGame` with NO lifecycle-closing event, and nothing state-driven stops the loop. A saucer alive at final death (or at run start from a demo saucer) leaves the warble playing on the title screen indefinitely. | `battlezone/src/core/sim.ts:70-86`, `battlezone/src/shell/audio-dispatch.ts:84-88` | TEA: failing test first — warble must stop when a run ends/starts while the visitor lives. Fix by emitting closing events at mode resets or state-driving the warble stop (as the track loop already is). |
| [HIGH] | **"Silence outside playing" is audibly false.** Dispatch's non-playing branch calls `setEngine(0)`, but `engineParams(0)` is a DELIBERATE audible idle (gain 0.12, freq 40 — the "tank never falls silent" pin). Post-unlock, attract and game-over screens drone at idle volume forever. The dispatch comment ("the attract demo and a dead tank are silent") and the test name ("game over silences the engine") both claim behavior the engine cannot deliver through `setEngine(0)`. | `battlezone/src/shell/audio-dispatch.ts:82`, `battlezone/src/shell/audio.ts:50-53` | TEA: pin ACTUAL silence (hum gain → 0 / voice stopped) outside `playing`; engine needs an explicit off affordance (e.g. `stopEngine()` or an enabled flag) since `engineParams(0)` must stay audible for in-run idle. |
| [MEDIUM] | [TEST] Saucer natural-departure path (alive→null at VISIT_DURATION) has no `saucer-gone` test — only the kill path is exercised; a depart-branch regression ships silently. | `battlezone/tests/core/events.test.ts:221` | Add depart test: `saucer-gone` WITHOUT `enemy-destroyed` on the departure step. |
| [MEDIUM] | [TEST] Mutual-kill same tick (hostile dies AND player hit in one step) untested — both cues thread the same events array through the respawn/gameover branches and the shot-fired filter; a dropped event would not be caught. | `battlezone/tests/core/events.test.ts` | Stage hostile-kill-pending + inbound enemy shell; assert both events, in both respawn and final-death variants. |
| [MEDIUM] | [TEST] Audio fakes cannot detect three real regressions: an inert repeat `resume()` (never re-nudging a suspended context), loop double-start node doubling (audible volume doubling), or a hum-singleton break (new oscillator per `setEngine` = 60 nodes/sec leak). | `battlezone/tests/shell/audio.test.ts:154, 312, 328` | Spy `ctx.resume()`; assert oscillator counts across double-start and repeated `setEngine`. |
| [LOW] | [RULE] `createPeriodicWave(): object` in the fake matches lang-review #2's banned broad `object` type (unused by production, but a literal rule match — cannot dismiss). | `battlezone/tests/shell/audio.test.ts:202` | Type it specifically (e.g. `Record<string, never>` or a minimal `PeriodicWave`-shaped interface). |
| [LOW] | [TEST] `resolveContextCtor` branches untested (webkit-only fallback; no-WebAudio permanent-silence path), and 4 negative-guard tests empirically passed at the RED commit (process note — TEA disclosed the class, analyzer proved the instances). | `battlezone/tests/shell/audio.test.ts:221`, `tests/core/events.test.ts:104,132,153,246` | Add the two ctor-branch tests; RED-verify negatives against a stub going forward. |

### Observations (adversarial pass)

- [EDGE] (subagent disabled — Reviewer's own edge pass) The two HIGH findings above are mode-boundary edges: run→attract and attract→run resets cross the event channel's blind spot. The in-battle edges (fire-and-die step 375, point-blank consumption, blast-window re-kill) are all handled and tested.
- [SILENT] (subagent disabled — direct pass) The engine's silent-degrade paths are DELIBERATE and correct: no-WebAudio → permanent no-op (audio.ts:180), pre-gate calls → no-ops, orphan `stopLoop` → guarded return (audio.ts:207-209). No swallowed errors — nothing throws in the first place. Verified deliberate, not accidental.
- [TEST] Six analyzer findings confirmed (table above); the suite is strong on frame-exact invariants but thin on mode-transition lifecycles — which is exactly where the two HIGH bugs live.
- [DOC] (subagent disabled — direct pass) One real documentation defect, folded into finding 2: audio-dispatch.ts:71-75's comment claims silence the code doesn't produce. Otherwise comment quality is high and sourcing discipline (E5) is exemplary.
- [TYPE] (subagent disabled) Covered by rule-checker checks #1–#5: unions over enums, `readonly` throughout, `import type` hygiene, compile-time `never` exhaustiveness guard at audio-dispatch.ts:57. Clean.
- [SEC] Security subagent clean: core purity boundary verified file-by-file and grep-swept forever; gesture gate airtight (zero contexts before `resume()`); no network surface; `Math.random` confined to shell noise synthesis. The `globalThis` feature-detection cast is compliant (not untrusted data).
- [SIMPLE] (subagent disabled — direct pass) No over-engineering: the engine is ~230 lines for five sounds; `LoopVoice`/`Map` is the minimal loop registry; no speculative abstraction. The one arguable extra — `FakeAudioContext`'s unused factory methods — is deliberate fake completeness.
- [RULE] Rule-checker: 18 rules × 71 instances, 1 violation (the `object` fake return, LOW above). E1–E5 house rules all compliant, independently test-enforced.
- [VERIFIED] Determinism (E2) — evidence: sim.ts builds `events` as a fresh local array on every path (lines 110, 226 gameover-hold `events: []`), never mutates input state; 600-step identical-replay test passes twice over. Complies with the epic determinism rule; no wall-clock/randomness in any changed core file (rule-checker E1 scan + swept test).
- [VERIFIED] Gesture gate (AC-5) — evidence: audio.ts constructs the context only inside `resume()` (line 176-184); main.ts:66-69 wires `pointerdown`+`keydown` to an idempotent `unlockAudio`. Test-pinned at the engine seam (zero instances at import/create, exactly one after resume). Complies with the autoplay rule and the sibling convention.
- [VERIFIED] AC-4 sourcing — evidence: reference/README.md "Sound synthesis sources (bz1-11)" table present in this checkout; audio.ts header (lines 3-11) and `engineParams` doc carry explicit approximation disclaimers. Complies with E5 (no ROM-fact assertion).

### Rule Compliance

Rule-checker enumerated all 13 TypeScript checks plus 5 epic house rules across every type/field/function in the diff (71 instances): **17 of 18 clean**. The one violation is lang-review #2 (`object` type) at tests/shell/audio.test.ts:202 — confirmed [LOW], fix required, not dismissible. Checks #6 (React), #9 (build config), #11 (error types), #13 (fix-regression) not applicable to this diff. E1/E4 (core purity/audio-free) are doubly enforced by the new swept test; E3 (no coin-op) verified — all "coin-op" mentions are descope negations; E5 (no ROM-fact assertions) verified at file and function level.

### Data flow traced

Keyboard/pointer (untrusted input) → `KeyboardTreads.read()` → numeric clamped `Input` → pure `stepGame` → `GameState.events` (data only, JSON-round-trip tested) → `playEventSounds` switch → `engine.play/startLoop/stopLoop` → Web Audio nodes → destination. Safe because: no user strings ever enter the pipeline (numbers/booleans only), no DOM sinks, no network, and the audio surface is a no-op until a user gesture. The one-way core→shell direction is grep-enforced.

### Devil's Advocate

Assume this code is broken and I'm the player who proves it. I boot the game, press an arrow key to see what it does — that keydown unlocks audio while I'm still on the title screen. The demo tank is fighting behind the text, and now `setEngine(0)` builds the hum oscillator at gain 0.12: my "silent" title screen drones like an idling engine, forever, because nothing ever drives that gain to zero. That is finding 2, and it is not hypothetical — it is the FIRST interaction most players will have. Now I play a run, do well, reach 2000, the saucer drifts in warbling — and a missile gets me on my last tank while the visitor is still alive. Game over holds three seconds, cycles to attract... and the warble never stops, because `saucer-gone` only exists inside `stepBattle` and the reset paths rebuild the world without ever telling the shell the saucer is gone. Finding 1. Both bugs share a root: the event channel narrates transitions WITHIN a battle step, but mode resets bypass narration entirely, and the continuous layer only half-compensates (track yes, warble no, hum wrong). What else hides in that blind spot? A run started from attract while the DEMO's saucer warbles — same leak on entry. A suspended context after tab-switch — `resume()` re-nudges it, good, but no test would catch that regressing (analyzer's resume-spy gap). The mutual-kill tick threads two cues through the respawn filter — correct today by my read, but untested. The pattern is consistent and the fix belongs in RED first: pin the mode-transition audio lifecycle, then make it pass.

**Handoff:** Back through the gate — findings are testable logic bugs → red rework, owner Imperator Furiosa (TEA) writes the failing tests; The Word Burgers (Dev) then make them pass. The two HIGH findings block; the MEDIUM/LOW test gaps should ride the same rework cycle.

### Round 2 (re-review of the rework delta)

**Scope:** commits a0e81e6 (rework RED, 281 test lines) + a2e234d (fix, 41 src lines in shell/audio.ts + shell/audio-dispatch.ts). Round-1 subagents were not re-spawned for this delta — it touches only the two files I rejected, and the round-1 table (all received) still covers the base; the delta got: a line-by-line direct read, the lang-review #13 fix-regression meta-check, and mechanical verification via testing-runner run bz1-11-dev-green-3 (**623/623 GREEN, tsc + vite build clean, zero regressions**).

**Finding-by-finding resolution:**

| Round-1 finding | Status | Evidence |
|---|---|---|
| [HIGH] warble leak across mode resets | ✅ RESOLVED | state-driven stop at audio-dispatch.ts:100-102 (`saucer?.phase !== 'alive'` → `stopLoop('saucer')`); both fix-agnostic lifecycle scenarios green; the chosen fix leaves core untouched (determinism surface unchanged — verified by the unchanged 600-step replay tests) |
| [HIGH] audible "silence" outside playing | ✅ RESOLVED | `stopEngine()` at audio.ts:235-240 drives hum gain to a real 0; dispatch calls it (never `setEngine`) outside playing (audio-dispatch.ts:86-91); revive-on-`setEngine` test green; `engineParams(0)` in-run idle pin intact |
| [MEDIUM] saucer depart coverage | ✅ RESOLVED | depart test green (gone without enemy-destroyed) |
| [MEDIUM] mutual-kill same tick | ✅ RESOLVED | both variants (respawn + final-death) green |
| [MEDIUM] fake fidelity (resume spy / double-start / hum singleton) | ✅ RESOLVED | spy + node-count guards green |
| [LOW] [RULE] `object` in fake | ✅ RESOLVED | `Record<string, never>` at the same site |
| [LOW] ctor branches untested | ✅ RESOLVED | webkit-only + no-WebAudio tests green |

**Fix-regression meta-check (#13):** the fix diff re-scanned against checks #1–#12 — no `as any`, no `||`-for-`??`, strict-null guards (`ctx === null || humGain === null`), optional chaining used in comparison only, `SoundSurface` Pick widened rather than loosened. Clean.

- [VERIFIED] Hum revives after silence — evidence: audio.ts `setEngine` unconditionally reapplies `engineParams` to the live nodes (lines 228-233), so re-entering `playing` restores audible idle; pinned by the "later setEngine brings the hum back" test. Complies with the rework contract and the in-run idle pin.
- [VERIFIED] Warble kill/arrival frames unaffected by the state check — evidence: arrival frame has `phase === 'alive'` (no stop), kill frame gets event-stop AND state-stop (idempotent). No pinned call-list test broke (623/623).

**Verdict:** APPROVED. **Handoff:** The Organic Mechanic (SM) for finish — PR creation and merge ceremony.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): context-story-bz1-11.md's metadata block says `Workflow: superpowers` while the sprint YAML and session both say `tdd` — the context generator carried a stale field. Affects `sprint/context/context-story-bz1-11.md` (metadata correction; check the generator for other stories). *Found by TEA during test design.*
- **Gap** (non-blocking): AC-4 targets `reference/README.md`, which is gitignored and exists only in the quarry checkout, so sound-source provenance cannot be test- or CI-enforced and does not survive checkouts. Affects `battlezone/reference/README.md` (consider mirroring sound-sourcing notes into a committed doc, e.g. the findings doc, in a future story). *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the attract demo accrues score (bz1-10 design), so a long-running demo can cross the 2000-pt saucer gate and start the warble on the title screen post-unlock — period-plausible but worth a deliberate call. Affects `battlezone/src/shell/audio-dispatch.ts` or `battlezone/src/main.ts` (one-line attract mute if bz1-12's playtest dislikes it). *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (blocking): the event channel narrates transitions only within `stepBattle`; mode resets (`startRun`/`returnToAttract`) bypass narration, so loop-closing cues (`saucer-gone`) are never emitted at run boundaries and the shell's continuous layer only compensates for the track loop, not the warble or the hum's off-state. Affects `battlezone/src/core/sim.ts` and `battlezone/src/shell/audio-dispatch.ts` (define the mode-transition audio lifecycle explicitly, test-first). *Found by Reviewer during code review.*
- **Conflict** (blocking): two TEA-pinned contracts collide — `engineParams(0)` must be audibly non-zero ("tank idles AUDIBLY") while dispatch's non-playing "silence" is pinned only as `setEngine(0)`; the engine therefore cannot deliver actual silence outside a run. Affects `battlezone/src/shell/audio.ts` (needs an explicit off affordance) and `battlezone/tests/shell/audio.test.ts` / `audio-dispatch.test.ts` (re-pin out-of-run silence as an audible fact, not an argument value). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the RED-phase discipline gap the analyzer proved (4 negative guards green at commit 825c629) suggests a house practice: verify each negative-guard test fails against a stubbed implementation before committing it as RED. Affects `pennyfarthing-dist/guides` (TDD policy note) more than this repo. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 2 findings (1 Gap, 0 Conflict, 0 Question, 1 Improvement)
**Blocking:** None

- **Improvement:** context-story-bz1-11.md's metadata block says `Workflow: superpowers` while the sprint YAML and session both say `tdd` — the context generator carried a stale field. Affects `sprint/context/context-story-bz1-11.md`.
- **Gap:** AC-4 targets `reference/README.md`, which is gitignored and exists only in the quarry checkout, so sound-source provenance cannot be test- or CI-enforced and does not survive checkouts. Affects `battlezone/reference/README.md`.

### Downstream Effects

Cross-module impact: 2 findings across 2 modules

- **`battlezone/reference`** — 1 finding
- **`sprint/context`** — 1 finding

### Deviation Justifications

7 deviations

- **AC-4 sound-source documentation is inspection-verified, not test-enforced**
  - Rationale: `reference/` is gitignored and lives only in the quarry checkout (epic ruling) — a test reading it would fail in every other checkout and CI
  - Severity: minor
  - Forward impact: Reviewer checklist item; see the paired Delivery Finding about mirroring provenance into a committed doc
- **AC-5 gesture gate pinned at the engine seam; main.ts wiring left to inspection**
  - Rationale: main.ts cannot be imported in the node test env (house limitation; tempest 6-12 precedent) and the AC explicitly allows inspection for that layer
  - Severity: minor
  - Forward impact: Reviewer confirms main.ts wires gesture → `resume()` per the sibling convention
- **`shell-impact` event kind not pinned in the union under test**
  - Rationale: no sound in the story's inventory consumes an impact cue, and the same context forbids inventing event payloads ahead of their consumers
  - Severity: minor
  - Forward impact: the story that adds an impact cue (likely bz1-12 polish) adds the kind + dispatch case + tests
- **Attract-mode sound policy left unpinned**
  - Rationale: the original cabinet's attract sound was DIP-selectable and the story is silent — pinning either way would invent spec
  - Severity: minor
  - Forward impact: bz1-12's live playtest can pin it if it matters; none structurally
- **Guard sweeps green at RED**
  - Rationale: revising one's own defective pin is the point of the rework loop — the two original pins were mutually unsatisfiable
  - Severity: minor
  - Forward impact: Dev must add `stopEngine` to the `AudioEngine` surface and the dispatch's `SoundSurface` Pick
- **Fatal-step cannon cue dropped on respawn**
  - Rationale: the returned state shows no shell, so the cue would contradict the observable transition; the player's own explosion owns that frame acoustically
  - Severity: minor
  - Forward impact: none — the gameover branch preserves the slot and keeps the cue, so only the respawn frame is affected
- **Attract demo: one-shot cues audible post-unlock, continuous sounds silent**
  - Rationale: continuous sounds are now truly silent outside a run per the rework pins; remaining attract audibility is confined to event-driven cues, the deliberate open question for bz1-12's playtest
  - Severity: minor
  - Forward impact: bz1-12 playtest pins or mutes attract one-shots; a one-line mode guard in main.ts suffices

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No design deviations.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **AC-4 sound-source documentation is inspection-verified, not test-enforced**
  - Spec source: context-story-bz1-11.md, AC-4
  - Spec text: "Every synthesized sound's reference recording/analysis is documented in `reference/README.md`"
  - Implementation: No automated test reads `reference/README.md`; verification is Dev delivery + Reviewer inspection
  - Rationale: `reference/` is gitignored and lives only in the quarry checkout (epic ruling) — a test reading it would fail in every other checkout and CI
  - Severity: minor
  - Forward impact: Reviewer checklist item; see the paired Delivery Finding about mirroring provenance into a committed doc

  - ✓ ACCEPTED by Reviewer: reference/README.md sourcing table verified present in this checkout; gitignored dir cannot be CI-tested — correct call.
- **AC-5 gesture gate pinned at the engine seam; main.ts wiring left to inspection**
  - Spec source: context-story-bz1-11.md, AC-5
  - Spec text: "AudioContext construction/resume happens only inside the gesture handler, not at module load or bootstrap — verified by test or code inspection"
  - Implementation: Tests pin lazy construction (zero contexts at import and at `createAudioEngine()`, exactly one after `resume()`, idempotent repeats, pre-resume no-ops); the pointerdown/keydown listener wiring in main.ts is code inspection
  - Rationale: main.ts cannot be imported in the node test env (house limitation; tempest 6-12 precedent) and the AC explicitly allows inspection for that layer
  - Severity: minor
  - Forward impact: Reviewer confirms main.ts wires gesture → `resume()` per the sibling convention

  - ✓ ACCEPTED by Reviewer: main.ts:66-69 inspected — pointerdown+keydown → idempotent resume(), sibling convention honored; engine-seam tests cover the rest.
- **`shell-impact` event kind not pinned in the union under test**
  - Spec source: context-story-bz1-11.md, Technical Approach
  - Spec text: "Anticipated kinds: `shot-fired` (bz1-5), `shell-impact` (bz1-5), …"
  - Implementation: Tests pin six kinds (shot-fired, enemy-destroyed, player-hit, hostile-spawn, saucer-present, saucer-gone); shell-impact has no test and no dispatch case (tests don't forbid Dev adding it)
  - Rationale: no sound in the story's inventory consumes an impact cue, and the same context forbids inventing event payloads ahead of their consumers
  - Severity: minor
  - Forward impact: the story that adds an impact cue (likely bz1-12 polish) adds the kind + dispatch case + tests

  - ✓ ACCEPTED by Reviewer: no consumer exists; context explicitly forbids inventing kinds ahead of consumers.
- **Attract-mode sound policy left unpinned**
  - Spec source: context-story-bz1-11.md, Scope + AC-1
  - Spec text: sound inventory lists gameplay cues; nothing states whether the self-playing attract demo is audible
  - Implementation: dispatch/continuous tests constrain `playing` and `gameover` modes only; attract audibility is Dev's call
  - Rationale: the original cabinet's attract sound was DIP-selectable and the story is silent — pinning either way would invent spec
  - Severity: minor
  - Forward impact: bz1-12's live playtest can pin it if it matters; none structurally

  - ✓ ACCEPTED by Reviewer: pinning either way would invent spec — but NOTE: this unpinned seam is exactly where both HIGH findings live; the rework must pin the mode-transition audio lifecycle.
- **Guard sweeps green at RED**
  - Spec source: TDD policy (RED phase produces failing tests)
  - Spec text: "write the failing test first"
  - Implementation: `core-audio-free.test.ts` and 4 negative-guard tests in events.test.ts pass pre-GREEN; the other 26 tests (plus the module-load-blocked dispatch file) carry the RED signal
  - Rationale: regression guards are green until violated by definition (house precedent: bz1-10's swept coin-op audit); every passing negative here has a RED positive twin
  - Severity: minor
  - Forward impact: none

  - ✓ ACCEPTED by Reviewer: test-analyzer empirically confirmed the 4 negatives at 825c629; paired-positive-twin mitigation holds post-GREEN; process improvement filed as a delivery finding.

- **Rework: out-of-run silence contract revised from `setEngine(0)` to `stopEngine()`** *(review round 1)*
  - Spec source: Reviewer Assessment finding 2 + tests/shell/audio-dispatch.test.ts (original gameover pin)
  - Spec text: original test pinned "game over silences the engine" as `setEngine(0)`; the rejection proved `engineParams(0)` is deliberately audible, so that pin could never deliver silence
  - Implementation: gameover test revised to require `stopEngine` and forbid `setEngine` calls; attract twin added; engine-side `stopEngine()` contract pinned (real 0 gain, idempotent, revivable); the audible-idle pin on `engineParams(0)` is intentionally preserved
  - Rationale: revising one's own defective pin is the point of the rework loop — the two original pins were mutually unsatisfiable
  - Severity: minor
  - Forward impact: Dev must add `stopEngine` to the `AudioEngine` surface and the dispatch's `SoundSurface` Pick
  - ✓ ACCEPTED by Reviewer: revising the defective pin was the correct move — the original two pins were mutually unsatisfiable; the new contract is verified green.
### Dev (implementation)

- **Fatal-step cannon cue dropped on respawn**
  - Spec source: tests/core/events.test.ts (TEA's 600-step cue↔slot invariant) + context-story-bz1-11.md AC-1
  - Spec text: "shot-fired coincides EXACTLY with the shell slot filling — never drifts"
  - Implementation: the cue is judged post-consumption, and the respawn branch additionally filters `shot-fired` out because the respawn wipes the shell slot on that same step (a shot fired on the frame the player dies is silenced; caught live at step 375 of the invariant run, seed 99)
  - Rationale: the returned state shows no shell, so the cue would contradict the observable transition; the player's own explosion owns that frame acoustically
  - Severity: minor
  - Forward impact: none — the gameover branch preserves the slot and keeps the cue, so only the respawn frame is affected

  - ✓ ACCEPTED by Reviewer: cue↔observable-slot exactness is the right invariant; the blast masks the report on that frame.
- **Attract demo: one-shot cues audible post-unlock, continuous sounds silent**
  - Spec source: context-story-bz1-11.md Scope + TEA deviation "Attract-mode sound policy left unpinned"
  - Spec text: sound inventory lists gameplay cues; nothing states whether the self-playing attract demo is audible
  - Implementation: the demo battle emits events uniformly (shared `stepBattle`), and main.ts pumps `playEventSounds` unconditionally — so after a gesture unlock the attract demo's pot-shots/kills are audible; `updateContinuousSounds` silences the engine hum and track rattle outside `playing` mode (the demo drives no physical treads)
  - Rationale: uniform emission keeps the core branch-free; the original cabinet's attract sound was DIP-selectable, so an audible-ish attract is period-plausible; hum-off avoids a droning idle on the title screen
  - Severity: minor
  - Forward impact: bz1-12's live playtest can mute attract one-shots with a one-line mode guard in main.ts if it grates
  - ✗ FLAGGED by Reviewer: the premise is FALSE — setEngine(0) is not silence (engineParams(0).gain = 0.12 audible idle), and the saucer warble leaks across mode resets. This deviation is findings 1-2 of the rejection; re-log once the lifecycle is fixed.

- **Rework re-log: attract policy after the round-1 fix** *(replaces the flagged entry above)*
  - Spec source: Reviewer Assessment findings 1-2 + rework tests (audio-dispatch.test.ts silence/lifecycle pins)
  - Spec text: "once the reset lands, the warble is not running"; non-playing modes call `stopEngine`, never `setEngine`
  - Implementation: attract/game-over now have NO hum (`stopEngine`), no track, and no leaked warble (state-driven stop); attract ONE-SHOT cues (demo pot-shots) remain audible post-unlock, and a live demo saucer legitimately warbles between its own present/gone events — both period-plausible, unpinned by tests
  - Rationale: continuous sounds are now truly silent outside a run per the rework pins; remaining attract audibility is confined to event-driven cues, the deliberate open question for bz1-12's playtest
  - Severity: minor
  - Forward impact: bz1-12 playtest pins or mutes attract one-shots; a one-line mode guard in main.ts suffices
  - ✓ ACCEPTED by Reviewer: continuous sounds are now genuinely silent outside a run (verified); remaining attract audibility is event-cue-only and correctly deferred to bz1-12's playtest.