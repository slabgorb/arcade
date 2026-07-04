---
story_id: "A-18"
jira_key: ""
epic: "A"
workflow: "tdd"
---
# Story A-18: Sound — accelerating heartbeat, thrust, fire, explosions, saucer siren

## Story Details
- **ID:** A-18
- **Jira Key:** (not configured for this project)
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** asteroids
- **Branch:** feat/A-18-sound-heartbeat-thrust-siren

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-04T12:02:53Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-04T09:15:54Z | 2026-07-04T09:19:02Z | 3m 8s |
| red | 2026-07-04T09:19:02Z | 2026-07-04T09:31:55Z | 12m 53s |
| green | 2026-07-04T09:31:55Z | 2026-07-04T10:40:13Z | 1h 8m |
| review | 2026-07-04T10:40:13Z | 2026-07-04T11:14:55Z | 34m 42s |
| green | 2026-07-04T11:14:55Z | 2026-07-04T11:19:22Z | 4m 27s |
| review | 2026-07-04T11:19:22Z | 2026-07-04T11:25:55Z | 6m 33s |
| finish | 2026-07-04T11:25:55Z | 2026-07-04T11:40:47Z | 14m 52s |
| green | 2026-07-04T11:40:47Z | 2026-07-04T11:52:27Z | 11m 40s |
| review | 2026-07-04T11:52:27Z | 2026-07-04T12:02:53Z | 10m 26s |
| finish | 2026-07-04T12:02:53Z | - | - |

## Sm Assessment

**Setup verdict: READY for red phase (TEA).**

- **Jira:** Explicitly skipped — this project has no Jira; tracking is local sprint YAML (`sprint/epic-A.yaml`). `jira_key` mirrors the story id (`A-18`) for archive naming.
- **Story context:** `sprint/context/context-story-A-18.md` is a thin auto-generated stub — no description or acceptance criteria exist in the sprint YAML for this story. TEA must define the ACs during the RED phase from the title alone: accelerating heartbeat (tension/tempo ramp as rocks thin out — the classic Asteroids beat), thrust, fire, explosions (ship + rock, likely size-dependent), and saucer siren (small vs. large saucer likely need distinct cues).
- **Prior art:** Asteroids has **no existing audio module** (`src/shell` has no audio file yet) — this is greenfield. `tempest/src/shell/audio.ts` and `audio-dispatch.ts` are a sibling game's Web Audio implementation and are a reasonable pattern reference for TEA/Dev, though CLAUDE.md notes no shared code exists yet between games (duplicate, don't extract a shared lib for this story).
- **Branch:** `feat/A-18-sound-heartbeat-thrust-siren` created in `asteroids/` from `origin/develop` (gitflow; PR will target `develop`).
- **Merge gate:** No open PRs in asteroids (or orchestrator); gate clear.
- **Sequencing judgment:** Taken next off backlog per user's explicit `/pf-work A-18` request — no blocking dependencies on A-17/A-19.
- **Routing:** Workflow `tdd` is phased → next agent **tea** (red phase).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Conflict** (non-blocking): `sprint/epic-A.yaml` already scopes story A-13 ("Saucer scoring (200/1000) + collisions + siren cadence", 2 pts, backlog) to own saucer-vs-bullet collision AND siren cadence — overlapping A-18's "saucer siren" title. Affects `asteroids/src/core/sim.ts` (no saucer-vs-bullet collision exists yet — the collision loop only checks player bullets against rocks) and whoever next picks up A-13. A-18's tests deliberately stop the siren contract at the saucer lifecycle sim.ts ALREADY implements (spawn via A-11's director, far-edge despawn) — no bullet-kill stop, no per-size cadence. A-13 must add the collision-kill siren-stop path (and any cadence differentiation) without re-litigating the loop/start contract A-18 lands. *Found by TEA during test design.*
- **Question** (non-blocking): no real or synthesized audio assets exist yet for asteroids (unlike tempest, which hosts POKEY bakes + community-rip `.wav` samples on Cloudflare R2 at `arcade-assets.slabgorb.com/tempest/sfx/`). Affects `asteroids/src/shell/audio.ts` (Dev's `AudioEngine` implementation, not covered by these tests — see TEA Assessment). Worth Dev's judgment call: the real 1979 cabinet generated sound from discrete analog oscillator circuits, not digitized samples (unlike Tempest's POKEY chip) — a Web Audio `OscillatorNode`-synthesized engine could be MORE authentic here than a sample-playback port of the tempest pattern, and sidesteps sourcing/hosting new `.wav` assets entirely. *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (blocking for deploy, non-blocking for merge): the 10 sample `.wav`s are gitignored (R2-served, per the `sfx/` convention) and are **not yet on R2** — the game fetches `https://arcade-assets.slabgorb.com/asteroids/sfx/*.wav`, which 404s until the user uploads them (source staged in `asteroids/public/sfx/`). Affects sound in dev + prod (degrades silently to no audio until upload). Not a code defect and does not block merge (audio is best-effort); must be resolved before any deploy is expected to have sound. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the two looped samples (`thrust.wav` ~0.28s, `saucerBig.wav` ~0.17s) are short and loop continuously, so on some browsers they may click at the loop seam. Affects `asteroids/src/shell/audio.ts` (`playSample` loop path — a future polish story could set `loopStart`/`loopEnd` on a trimmed segment or crossfade the seam). User confirmed the sound by ear this phase; flagged only as future polish, not a defect. *Found by Dev during implementation.*
- **Improvement** (non-blocking): `extraShip.wav` (bonus-life cue) and `saucerSmall.wav` (small-saucer siren) are bundled in `public/sfx/` but intentionally unwired. Affects `asteroids/src/shell/audio.ts` (`SAMPLE_FILES`) — a future bonus-life story and A-13's per-size siren cadence can wire them without re-sourcing assets. *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (non-blocking): sustained loops have no stop-on-run-end path. The saucer object is not cleared when the run ends or the ship dies (pre-existing A-11/A-16 lifecycle behavior — `stepGameOver`/`stepAttract` preserve `state.saucer`), and A-18's `saucer-siren-stop` fires only on far-edge despawn — so a saucer alive at game-over would leak its siren loop into the game-over/attract screens, the same class of defect as the thrust bug H-1. Affects `asteroids/src/core/sim.ts` (saucer lifecycle) and A-13 (siren cadence + saucer collision should ensure a run-end/kill stop). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the 3 silent `catch {}` blocks in `src/shell/audio.ts` (fetch/decode, channel-steal, playback) are intentional best-effort-audio degradation and match tempest's shipped engine, but carry no diagnostics at all — a future debugging aid could route them through a dev-only `console.debug` behind an import.meta.env.DEV guard. Affects `asteroids/src/shell/audio.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, Round 3): the core "siren-start carries size" test (`events.test.ts`) only exercises a LARGE saucer spawn end-to-end (the fixture's score is 0, so `pickSize` never returns `small`); the small-siren path is covered only at the shell dispatch level. Affects `asteroids/tests/events.test.ts` — a future test could spawn a small saucer through `stepGame` (score ≥ the A-12 small-saucer threshold) to close the end-to-end gap on the one-line `size: next.size` passthrough. Low risk. *Found by Reviewer during re-review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Saucer-siren contract narrowed to spawn + far-edge despawn only (no bullet-kill stop)**
  - Spec source: session Story Details title / `sprint/epic-A.yaml`, A-18
  - Spec text: "Sound — accelerating heartbeat, thrust, fire, explosions, saucer siren"
  - Implementation: `tests/events.test.ts`'s `saucer siren events` suite only pins `saucer-siren-start` on spawn and `saucer-siren-stop` on the far-edge despawn `stepSaucer` already implements (A-11) — no test requires the siren to stop when a bullet destroys the saucer, because no saucer-vs-bullet collision exists in `sim.ts` yet
  - Rationale: `sprint/epic-A.yaml`'s A-13 ("Saucer scoring (200/1000) + collisions + siren cadence") explicitly owns saucer collision and siren cadence as a separate, not-yet-started story; implementing bullet-kill detection here would preempt/duplicate A-13's scope (see Delivery Findings Conflict)
  - Severity: major
  - Forward impact: minor — A-13 must add the collision-kill `saucer-siren-stop` path (and any per-size cadence) on top of this story's spawn/despawn contract; A-13's Dev should extend, not replace, the events this story introduces

- **Fire event scoped to the player's own shot only, not the saucer's**
  - Spec source: session Story Details title, A-18
  - Spec text: "Sound — accelerating heartbeat, thrust, fire, explosions, saucer siren"
  - Implementation: `FireEvent` in `tests/events.test.ts` / `tests/audio-dispatch.test.ts` is only emitted/tested for the player's rising-edge shot (`stepBullets`' player path); the saucer's own cadence-gated shots (already firing every ~10 frames once one is alive, per A-11) get no dedicated fire cue in this story
  - Rationale: the title lists "fire" as one item among several, most naturally read as the player's own gunfire; "saucer siren" already covers the saucer's audio identity, and doubling the fire-cue surface (player + saucer) was not requested
  - Severity: minor
  - Forward impact: none — a future story can add a `saucer-fire` event additively without touching this contract

- **Heartbeat cadence tested as a RELATIONSHIP (fewer rocks ⇒ more beats in a fixed window), never a magnitude**
  - Spec source: `sprint/context/context-epic-A.md`, "provisional constants... verify vs quarry (A-17)" convention (no ROM heartbeat data exists in this checkout)
  - Spec text: "accelerating heartbeat" (session title) — no numeric tempo/interval given anywhere in the sprint YAML or epic context
  - Implementation: `tests/events.test.ts`'s `heartbeat events` suite asserts only that beats occur during play, that fewer live rocks yield strictly more beats in a fixed time window, determinism, and mode-gating (attract/gameover silent) — no specific interval or curve shape is pinned
  - Rationale: matches the epic's own established pattern for every other provisional constant (`SPLIT_SPREAD_ANGLE`, `SAUCER_SPEED`, etc.) — pin the relationship now, let A-17's ROM quarry supply the authentic magnitude later without a test rewrite
  - Severity: minor
  - Forward impact: none — an authentic ROM-ported tempo curve necessarily still satisfies "fewer rocks ⇒ faster," so A-17 should not need to touch this suite

### Dev (implementation)

- **Synthesized oscillator engine replaced with the authentic recorded sample set**
  - Spec source: TEA Assessment "Out of scope for RED" + Delivery Findings Question (sample sourcing vs. oscillator synthesis)
  - Spec text: "a Web Audio `OscillatorNode`-synthesized engine could be MORE authentic here than a sample-playback port of the tempest pattern, and sidesteps sourcing/hosting new `.wav` assets entirely"
  - Implementation: `src/shell/audio.ts` now fetches + `decodeAudioData`s the canonical community-recorded Asteroids sample set (8-bit/11 kHz mono) from the shared arcade-assets R2 host — gitignored, not committed, per the `.gitignore` `sfx/` convention and matching tempest — instead of synthesizing tones/noise from oscillators
  - Rationale: the user supplied the authentic field-recorded sample set mid-green; recordings of the discrete-analog cabinet are more faithful than a synthesis guess, and 1979 Asteroids has no digital ROM audio to bake (unlike tempest's POKEY chip), so there is no more-authentic digital source. `SoundName` and the `AudioEngine` interface are unchanged, so the dispatch layer, its 44 tests, and `main.ts` were untouched
  - Severity: minor
  - Forward impact: none — the event→sound contract is identical; A-13 inherits the loop channels and the bundled `saucerSmall.wav` for its per-size cadence

- **Ship-death explosion reuses the large-rock bang sample (no distinct ship-death sound)**
  - Spec source: `tests/audio-dispatch.test.ts` EVENT_EFFECT table, AC-8
  - Spec text: `{ type: 'explosion', source: 'ship' }` → `{ kind: 'play', sound: 'explosionShip' }`
  - Implementation: the `'explosionShip'` SoundName plays `bangLarge.wav` — the same sample as `'explosionLarge'` — because the authentic set has no distinct ship-explosion recording
  - Rationale: the real cabinet drives ship and asteroid explosions from one explosion circuit; mapping ship death to the biggest bang is the faithful choice. The distinct `'explosionShip'` SoundName is preserved (contract intact), so a dedicated ship-death sample can be dropped in later with a one-line mapping change and no test churn
  - Severity: minor
  - Forward impact: none — SoundName distinction retained; only the file mapping would change if a ship-death sample surfaces

- **(Rework, round 2) Death-edge thrust-stop guarded on `input.thrust`, not the reviewer's suggested `state.thrustPrev`**
  - Spec source: Reviewer Assessment H-1 fix guidance
  - Spec text: "emit `{type:'thrust-stop'}` on the ship-death edge when `state.thrustPrev` is true"
  - Implementation: guarded on `input.thrust` (thrust engaged THIS frame) instead of `state.thrustPrev` (thrust held LAST frame) — `sim.ts` ship-death edge
  - Rationale: `input.thrust` is the exact "loop is on this frame" condition. `state.thrustPrev` would (a) DOUBLE-emit when thrust is released the same frame the ship dies (the still-alive falling edge already stops it) and (b) MISS a thrust pressed on the very death frame (loop started, never stopped). Both are handled correctly by `input.thrust`; new regression tests lock both cases.
  - Severity: minor
  - Forward impact: none — same intent (a dead ship's engine is silent), stricter correctness

- **(Rework, round 3) Full A-13 integration: per-size siren + siren-stop on every saucer death**
  - Spec source: SM Rework Directive Round 3 (user chose FULL INTEGRATION); A-18's original siren contract
  - Spec text: A-18's original tested contract — a single `saucer-siren-start`/`-stop` on spawn + far-edge despawn only ("bullet-kill stop is A-13's territory")
  - Implementation: after A-13 (#15) merged to develop, `SaucerSirenStartEvent` now carries `size: SaucerSize`; `withSirenEdge` compares the INCOMING saucer (pre-collision) to the FINAL one, so the stop fires on EVERY saucer death (bullet-kill, ram, rock-collision, far-edge despawn), not just despawn; the dispatch + audio engine wire the already-bundled `saucerSmall.wav` as a new `saucerSirenSmall` SoundName sharing the one siren channel
  - Rationale: user-directed full integration. A-13 landing provided both the bullet-kill event the reviewer flagged as missing AND the small/large size split, so A-18's siren now reflects both instead of deferring them
  - Severity: minor — all additive; existing consumers/behaviour preserved (large siren still `saucerSiren`)
  - Forward impact: none blocking — the `saucerSiren`/`saucerSirenSmall` split is the integration point for any further A-13 siren-cadence work
  - **Merge-method note:** MERGED `develop` into the branch (not rebased, as the directive suggested) to resolve the semantic `sim.ts` conflict exactly once rather than replaying it across commits; squash-merge collapses it, so **no force-push is needed** (a normal push appends).

### Reviewer (audit)

Every logged deviation reviewed:

- **TEA — Saucer-siren narrowed to spawn + far-edge despawn only** → ✓ ACCEPTED by Reviewer: correct scope boundary; A-13 explicitly owns saucer collision + siren cadence in epic-A.yaml. Sound reasoning.
- **TEA — Fire event scoped to the player's own shot only** → ✓ ACCEPTED by Reviewer: the title's "fire" most naturally reads as the player's gun; the saucer's audio identity is its siren. A `saucer-fire` event can be added additively later without touching this contract.
- **TEA — Heartbeat cadence tested as a RELATIONSHIP, not a magnitude** → ✓ ACCEPTED by Reviewer: matches the epic's established "pin relationships, verify magnitudes vs quarry (A-17)" convention; the implemented linear interp satisfies the pinned relationship.
- **Dev — Synthesized engine replaced with the authentic recorded sample set** → ✓ ACCEPTED by Reviewer: contract (`SoundName`/`AudioEngine`) unchanged, so dispatch + 44 tests untouched; user-directed and more faithful. R2-hosting-not-yet-uploaded is tracked as a non-blocking-for-merge Delivery Finding.
- **Dev — Ship-death explosion reuses the large-rock bang sample** → ✓ ACCEPTED by Reviewer: one explosion circuit is authentic; the distinct `explosionShip` SoundName is preserved, so a dedicated sample is a one-line swap later.

**Undocumented divergence spotted (captured as review finding H-1, not a deliberate deviation):** `sim.ts:242-244` documents the intent "a dead ship's engine makes no sound," but the implementation only suppresses NEW thrust events while dead — it never STOPS an already-running thrust loop when the ship dies mid-thrust. Code contradicts its own stated intent. See Reviewer Assessment H-1. **→ RESOLVED in Round 2:** the ship-death edge now emits `thrust-stop` when `input.thrust` is engaged; the comment/behavior now agree.

- **Dev (Round 2) — Death-edge thrust-stop guarded on `input.thrust`, not `state.thrustPrev`** → ✓ ACCEPTED by Reviewer: `input.thrust` is the exact "loop is on this frame" condition — strictly more correct than my originally-suggested `thrustPrev` (avoids a double-stop on same-frame release; catches a press-on-the-death-frame). Traced and confirmed by rule-checker + 3 regression tests. Good refinement.

- **Dev (Round 3) — Full A-13 integration (per-size siren + siren-stop on every death) + merged, not rebased** → ✓ ACCEPTED by Reviewer: merge resolution is SOUND (rule-checker verdict + reviewer trace) — A-13's saucer-kill and A-18's rock-explosion event coexist in the bullet loop, the explosion is restored exactly once, no leftover/duplicated code, no conflict-marker residue. `withSirenEdge`'s incoming-comparison fires exactly one stop on EVERY death path (bullet/ram/rock/far-edge — reviewer-verified empirically) and one sized start on spawn; double-emission is architecturally impossible (spawn-director freeze + arm-then-count). Per-size wiring clean, no `!`, exhaustiveness holds. Merging develop instead of rebasing was the right call — one conflict resolution, squash-merge collapses it, no force-push.

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `asteroids/tests/events.test.ts` — the pure-core `GameState.events`/`GameEvent` channel, observed through `stepGame` (27 tests)
- `asteroids/tests/audio-dispatch.test.ts` — the shell's pure event→sound dispatch, `playEventSounds(audio, events)` (17 tests)

**Tests Written:** 44 tests covering 8 ACs
**Status:** RED (failing/non-compiling — ready for Dev). Verified via `testing-runner`: 477 pre-existing tests pass (no regressions), 43 of the 44 new tests fail as expected (the 44th is a static self-check of the test fixture table itself, not production code).

### Acceptance Criteria (defined this phase — none existed in the sprint YAML)

| AC | Description | Test file |
|----|-------------|-----------|
| AC-1 | `stepGame` emits a `fire` event on the player's rising-edge shot only (not saucer shots, not while dead/capped/attract) | events.test.ts |
| AC-2 | `stepGame` emits an `explosion` event tagged with the destroyed rock's own tier (`large`\|`medium`\|`small`) on bullet-vs-rock kill | events.test.ts |
| AC-3 | `stepGame` emits an `explosion` event tagged `ship` on the ship-destruction edge (fatal or not; never while invulnerable) | events.test.ts |
| AC-4 | `stepGame` emits `thrust-start`/`thrust-stop` on the thrust button's rising/falling edge (never while the ship is dead) — a loop, not a per-frame retrigger | events.test.ts |
| AC-5 | `stepGame` emits `saucer-siren-start` on spawn and `saucer-siren-stop` on far-edge despawn (scope note: NOT on a bullet kill — see Design Deviations) | events.test.ts |
| AC-6 | `stepGame` emits `heartbeat` events during play whose frequency in a fixed window increases as live rocks thin out (relationship, not magnitude); silent in attract/gameover; deterministic | events.test.ts |
| AC-7 | `state.events` is empty at the start of every frame — never accumulates across steps | events.test.ts |
| AC-8 | `playEventSounds(audio, events)` maps every `GameEvent` variant to exactly the right `play`/`startLoop`/`stopLoop` call, in frame order, with no DOM/AudioContext dependency | audio-dispatch.test.ts |

### Rule Coverage

| Rule (lang-review/typescript.md) | Test(s) | Status |
|------|---------|--------|
| #2 Missing `readonly` on array params that should not be mutated | `audio-dispatch.test.ts` — `playEventSounds(audio, events: readonly GameEvent[])` signature contract | failing (module missing) |
| #3 Missing exhaustiveness check in switch/case on enum | `audio-dispatch.test.ts` → `wires every GameEvent type discriminant and every explosion source` (behavioral half); pairs with Dev's compile-time `const _exhaustive: never = event` guard (tempest's established pattern — see Sm Assessment prior art) | failing (module missing) |
| #5 Re-exporting types without `export type` | Both new files use `import type` for `GameEvent`/`SoundName` throughout | n/a — convention followed, not independently testable |
| #8 `as any` in test assertions | Self-checked: no `as any` anywhere in either file; the one narrowing cast in the coverage test is a proper type-predicate (`r is {...}`), not `as any` | pass (self-check) |

**Rules checked:** 4 of 13 TS lang-review checks are applicable to this story's scope (event-channel/dispatch modules only — no React, no async, no new API boundary). The rest (enums-as-numeric, null-coalescing, module/declaration issues beyond #5, security/input-validation, performance/bundle) do not apply to a pure data-event channel and a synchronous dispatch function.
**Self-check:** 0 vacuous tests found — every test asserts on `s.events`/`audio.calls` content, never a bare existence check.

### Scope note (see Design Deviations + Delivery Findings for full detail)

Saucer-siren coverage stops at the lifecycle `sim.ts` already implements (spawn, far-edge despawn). Bullet-kill siren-stop and per-size cadence belong to **A-13** (`sprint/epic-A.yaml`: "Saucer scoring (200/1000) + collisions + siren cadence", backlog) — a real scope overlap the epic didn't anticipate when A-18 was scheduled ahead of it. Dev should NOT add saucer-vs-bullet collision in this story.

### Out of scope for RED (flagged for Dev, not blocking)

The actual `AudioEngine` (`src/shell/audio.ts` — WebAudio playback of real sound) has no unit-test coverage here, matching this epic's established pattern for anything requiring a browser (A-5's AC-5: "visual criterion — eyeball it" via the dev server). The audible equivalent applies: Dev implements `audio.ts`, wires `main.ts`/`loop.ts` to call `resume()` on first user gesture and drain `state.events` through `playEventSounds` each frame, then **listens** to it running at `http://localhost:5275/asteroids/` before calling this story done. See Delivery Findings for the open question on sample sourcing vs. oscillator synthesis.

**Handoff:** To Dev for implementation (GREEN phase).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/events.ts` (new) — `GameEvent` union (fire, explosion{ship|large|medium|small}, thrust-start/stop, saucer-siren-start/stop, heartbeat)
- `src/core/state.ts` — `events: GameEvent[]`, `thrustPrev`, `heartbeatTimer`
- `src/core/bullet.ts` — `FireStep.fired` rising-edge flag
- `src/core/sim.ts` — emits every event; heartbeat tempo scales with live-rock count; siren start/stop on saucer spawn / far-edge despawn only (bullet-kill is A-13)
- `src/shell/audio-dispatch.ts` (new) — pure `GameEvent`→`SoundName` dispatch with compile-time exhaustiveness guard
- `src/shell/audio.ts` (new) — WebAudio engine playing the **authentic** community-recorded Asteroids sample set fetched from the arcade-assets R2 host (fetch → `decodeAudioData` → channel-stealing loops); silent degradation on every failure path
- `src/main.ts` — `resume()` on first gesture; drains `state.events` through `playEventSounds` each frame
- Sample assets (10 × 8-bit/11 kHz `.wav`) — **not committed** (gitignored per the `sfx/` convention); served from R2 like tempest. Staged locally in `public/sfx/` for upload.

**Authenticity decision (resolved this phase):** The open finding "synthesized sounds are guessed, not authentic" is closed. 1979 Asteroids made sound from discrete analog circuits — there is no digital ROM audio to extract, so the community field-recordings the user supplied ARE the authentic reference. `audio.ts` was swapped from oscillator synthesis to these samples with no change to the `SoundName`/`AudioEngine` contract. No ROM disassembly mining was needed. User confirmed the result by ear.

**Tests:** 520/520 passing (GREEN) — the 44 A-18 tests unchanged; no regressions.
**Build:** `npm run build` clean (tsc --noEmit + vite build); samples copy into `dist/sfx/`.
**Browser:** Verified live at `http://localhost:5299/asteroids/`; user confirmed the authentic samples fire on the right events (ear-check against local copies). Playback now sources R2 — see the blocking Delivery Finding: the 10 `.wav`s must be uploaded to R2 (`asteroids/sfx/`) before sound plays in dev or prod.
**Branch:** feat/A-18-sound-heartbeat-thrust-siren (pushed)

**Handoff:** To next phase (verify / review).

### Dev Rework — Round 2 (Reviewer H-1)

**Fix:** ship-death edge in `src/core/sim.ts` now emits `thrust-stop` when `input.thrust` is engaged, so a ship dying mid-thrust silences its engine loop instead of leaking it through gameover/attract. Guard is `input.thrust` (not `state.thrustPrev`) — see Design Deviations for why (avoids double-stop on same-frame release; catches press-on-death).

**Tests added** (`tests/events.test.ts`, thrust suite): die-while-thrust-held ⇒ 1 stop; release-on-death ⇒ exactly 1 stop (no double); fatal death held into attract ⇒ exactly 1 stop over 300 frames. All three failed against the old code (RED verified), pass now.

**Tests:** 523/523 passing (was 520 + 3 new). **Build:** clean. **Files:** `src/core/sim.ts`, `tests/events.test.ts`.
**Upstream Gap (Reviewer):** the sibling siren-on-run-end leak is NOT fixed here — it depends on saucer-lifecycle clearing that belongs to A-13; left as the filed non-blocking Delivery Finding.

**Handoff:** back to review (Reviewer re-review).

### Dev Rework — Round 3 (A-13 integration)

**Trigger:** SM found finish blocked — A-13 (#15) + A-12 (#13) merged to `develop` mid-flight; `sim.ts` conflict. User chose FULL INTEGRATION.

**Done (2 commits):**
1. **Merge** `develop` → branch. Resolved `sim.ts` as a union (kept A-13's saucer collision loop AND A-18's event channel; restored the rock-explosion event A-13's restructure had dropped from the player-rock branch; added `size` to two A-18 siren test fixtures for the new `Saucer.size`).
2. **Full integration:** `SaucerSirenStartEvent` carries `size`; `withSirenEdge` compares the INCOMING saucer so the siren-stop fires on EVERY saucer death (bullet-kill / ram / rock / far-edge), closing the reviewer's filed finding; new `saucerSirenSmall` SoundName wires `saucerSmall.wav` (already on the R2 list) on the shared siren channel; dispatch picks big/small by size. New tests: siren-stop-on-bullet-kill, size-on-start (core), small-siren dispatch (shell).

**Tests:** 567/567 passing (563 post-merge + 4 new). **Build:** clean. **Files:** `events.ts`, `sim.ts`, `audio.ts`, `audio-dispatch.ts`, `events.test.ts`, `audio-dispatch.test.ts`. Branch now 0 behind `develop`; normal push (merged, not rebased — no force needed).

**Audible check:** event/dispatch layer is fully unit-tested; `saucerSmall` playback mirrors the existing `saucerBig` path. A by-ear check still needs the R2 upload (unchanged filed finding) — no local sound while `SFX_BASE` points at the not-yet-populated R2.

**Handoff:** back to review (Reviewer re-review of the merged `sim.ts` + siren-size integration).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (**Round 3**: 567/567 pass, build+lint clean, no conflict markers, 0 smells, tree clean, PR #14 MERGEABLE) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — reviewer's own edge analysis found H-1 (Round 1) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — reviewer assessed silent-catch domain (see L-1) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — reviewer assessed test coverage (found the AC-4 gap behind H-1; 3 regression tests added Round 2) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — rule-checker covered type rules |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — rule-checker covered security rules (none apply) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (**Round 3**: 0 violations on the integration diff; verdicts — merge-resolution SOUND, siren double-emission SAFE) | N/A |

**All received:** Yes (Round 3 re-review — 2 enabled re-ran clean on the A-13-integration diff; 7 disabled via `workflow.reviewer_subagents`)
**Total findings:** 0 blocking. H-1 (Round 1) resolved; Round-3 integration verified (every saucer-death path → exactly one siren-stop; sized start on spawn; merge union sound); one non-blocking small-saucer end-to-end test-coverage observation filed; L-1 silent catches unchanged/accepted.

## Rule Compliance

Enumerated against the TypeScript lang-review checklist (13 checks) + project rules (core/shell boundary, determinism, no-cross-game-import). Cross-checked with reviewer-rule-checker (62 instances, 16 rules).

- **#1 Type-safety escapes** — COMPLIANT. No `as any`/`as unknown as T`/`@ts-ignore` in any changed file. Two type-predicates (`events.test.ts:63`, `audio-dispatch.test.ts:168`) both back the `is` with a runtime discriminant check.
- **#2 Generic/interface** — COMPLIANT. `Record<SampleId,string>` (closed union key, not `Record<string,any>`); `playEventSounds(audio, events: readonly GameEvent[])` — `readonly` present on the array param (rule #2, the exact check TEA cited). `withHeartbeat`/`withSirenEdge` take a non-`readonly` `GameState` but never mutate it in place (always `{...state}` spread) — matches every other sim.ts helper; established convention, not a regression.
- **#3 Enum/exhaustiveness** — COMPLIANT. `GameEvent` is a discriminated union (not an enum). All three switches carry a `const _exhaustive: never` guard: `audio-dispatch.ts:33` (explosion source), `audio-dispatch.ts:55` (event type), `audio.ts` `play()` (SoundName). Verified each enumerates every variant.
- **#4 Null/undefined** — COMPLIANT. Every `Map.get()` (`audio.ts` loops/buffers) is guarded by `if (!x) return` before use. `g.AudioContext ?? g.webkitAudioContext` correctly uses `??` not `||`.
- **#5 Module/declaration** — COMPLIANT. All type-only imports use `import type`; the one value re-export (`GAME_OVER_DISPLAY_S`) is not `export type`. No `.js` extensions needed (`moduleResolution: bundler`).
- **#6 React/JSX** — N/A (no `.tsx`).
- **#7 Async/Promise** — COMPLIANT. `load()`'s fetch→decode chain is deliberately fire-and-forget with a terminal `.catch()`; `void ctx.resume()` marks the intentional non-await.
- **#8 Test quality** — MOSTLY COMPLIANT, one gap. No `as any`; mock `SoundSurface` matches `Pick<AudioEngine,...>` exactly; imports from `../src`, not `dist`. **Gap:** AC-4 (thrust) has no test for the ship dying mid-thrust — the coverage hole behind finding H-1. `[TEST]`
- **#9 Build/config** — N/A (tsconfig unchanged; `strict:true` retained).
- **#10 Security/input-validation** — COMPLIANT/N/A. `SFX_BASE` is a hardcoded literal; no user input, no `JSON.parse as T`, no URL/path cast in the diff.
- **#11 Error handling** — 3 silent `catch {}` in `audio.ts` (L-1). Bindingless `catch {}`, not `catch(e:any)`. Documented intentional degradation; `resume()`'s catch additionally takes recovery action. No project rule mandates audio-layer logging → severity Low, accepted-as-designed.
- **#12 Performance/bundle** — COMPLIANT. No barrel imports, no `JSON.stringify` in per-frame paths, no sync fs.
- **#13 Fix regressions** — N/A.
- **Core/shell boundary** — COMPLIANT. `events.ts` imports only `./state` (type-only); no core file imports shell or touches DOM/AudioContext/fetch. `tests/core-boundary.test.ts` passes.
- **Determinism** — COMPLIANT. `heartbeatInterval`/`withHeartbeat` use only state-carried counts + `dt`; grep found zero `Date.now`/`Math.random`/`performance.now` in core.
- **No cross-game imports** — COMPLIANT. Every "tempest" mention is a comment; zero real imports from a sibling game.

## Round 1 Review (REJECTED — superseded by the re-review below)

**Verdict:** REJECTED

The event channel, dispatch, sample-engine swap, type discipline, core/shell boundary, and determinism are all clean and well-tested — this is careful work. But adversarial analysis found one confirmed, reproducible functional defect in the story's *primary deliverable* (sustained thrust SFX), so it goes back for a small fix rather than shipping a known stuck-sound bug.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | **Thrust loop never stops when the ship dies mid-thrust.** `thrust-stop` is gated on `shipAlive` (the pre-step latch), so a ship that dies while thrust is held emits no stop. The engine-hum loop then bleeds through death → game-over → **attract** and never stops (a very common death: thrusting to dodge into a rock). Confirmed by repro: holding thrust across a fatal death for 300 frames yields `totalThrustStops=0`, ending in `mode=attract`. The code also contradicts its own comment (`sim.ts:242-244`: "a dead ship's engine makes no sound"). | `src/core/sim.ts:247-250` | Emit `{type:'thrust-stop'}` on the ship-death edge when `state.thrustPrev` is true (the block at `sim.ts:319-321` is the natural site — it already fires the ship explosion on that edge). Apply the same run-end stop to the siren when a saucer is alive at death (see Delivery Finding). TEA: add a failing test — die while thrusting ⇒ exactly one `thrust-stop`. |
| [LOW] | Three silent `catch {}` blocks (fetch/decode, channel-steal, playback). Intentional best-effort-audio degradation, documented, matches tempest's shipped engine; `resume()`'s catch even takes recovery action. Accepted-as-designed, not blocking. `[RULE]` `[SILENT]` | `src/shell/audio.ts:123,159,184` | None required. Optional dev-only diagnostics (Delivery Finding). |

### Observations (dispatch-tagged)

1. `[HIGH]` `[EDGE]` `[TEST]` H-1 thrust-death loop leak — `sim.ts:247-250`; TEA's AC-4 suite (`events.test.ts:182-205`) tests rising/falling/held/dead-start but NOT die-while-thrusting — the coverage hole that let this through. Reviewer's own edge-hunter analysis + empirical repro.
2. `[VERIFIED]` Determinism — `heartbeatInterval`/`withHeartbeat` read only `state.rocks.length` + `dt`; grep across core found zero `Date.now`/`Math.random`/`performance.now`. evidence: `sim.ts:38-57`. Complies with the core determinism rule.
3. `[VERIFIED]` `[TYPE]` Core/shell boundary — `events.ts:12` imports only `./state` (type-only); no core file imports shell or touches DOM/AudioContext/fetch; `tests/core-boundary.test.ts` passes. Complies with CLAUDE.md's hard boundary.
4. `[VERIFIED]` Exhaustiveness — all three switches carry `const _exhaustive: never` (`audio-dispatch.ts:33` source, `:55` type, `audio.ts` `play()` SoundName); a new variant without wiring becomes a compile error.
5. `[VERIFIED]` `[SEC]` Fire rising-edge — `fired = risingEdge && playerShots < MAX_PLAYER_SHOTS`, player-owned only; a dead ship forces `firePrev` high so no spurious fire. evidence: `bullet.ts:109-111`, `sim.ts:237-246`. AC-1 satisfied; no injection/input surface in the diff.
6. `[DOC]` `sim.ts:242-244` comment asserts "a dead ship's engine makes no sound" — the code does not achieve this (root of H-1). Comment overstates actual behavior. Every other comment in the diff is accurate and unusually thorough.
7. `[SIMPLE]` No over-engineering — the sample engine mirrors tempest's proven fetch→decode→channel-steal pattern; preflight found 0 dead-code/smells; the `SoundName`-stable swap avoided all test churn.
8. `[VERIFIED]` Per-frame reset (AC-7) — play path starts `events: []`; attract/gameover force `events: []`; confirmed no cross-frame accumulation. evidence: `sim.ts:151,169,245`.

**Data flow traced:** thrust key → `input.thrust` → `stepGame` rising-edge → `state.events:[thrust-start]` → `main.ts` `playEventSounds` → `audio.startLoop('thrust')` → looping `BufferSource`. Release → `thrust-stop` → `stopLoop`. **The chain has no stop path when death interrupts the held interval — that is H-1.**

**Pattern observed:** shift-register edge detection (`firePrev`/`startPrev`/`thrustPrev`) is used consistently and correctly for edge events (`state.ts:162-168`, `sim.ts:247-250`); the flaw is not the pattern but the missing death-edge stop.

**Error handling:** audio layer degrades silently by design (accepted, L-1); core is total (no throws on null/empty — early-return guards throughout).

### Devil's Advocate

Assume this code is broken and hunt. The confirmed break is H-1: a player thrusting into their final rock leaves the engine humming on the GAME OVER card and the attract screen — an obviously-wrong state a casual player hits routinely, and the single worst impression a *sound* story can ship. It self-heals only on the next in-play thrust-release, so an idle attract screen can hum indefinitely. What else? A backgrounded tab resumes with a huge `dt`: `withHeartbeat` computes `remaining = timer - dt` deeply negative but still fires exactly one beat and re-arms (no burst) — safe; `heartbeatInterval` clamps via `Math.min` — safe. Partial R2 failure (some samples 404, some decode) yields a game with *some* sounds missing and no error — acceptable degradation, but a confused user gets no signal why (L-1). A saucer alive when the run ends has the SAME loop-leak as thrust — its siren bleeds into attract (upstream Gap, filed). Could a malicious input stack loops? No — `startLoop` steals its channel, so retriggers cut in rather than pile up; overlapping one-shots (rapid fire) are intentional and bounded by the 4-shot cap. Could events accumulate and leak memory? No — every frame rebuilds `events` from `[]` (AC-7 verified). Is the ship-death explosion double-counted with the run-end transition? No — it fires on the sticky-latch EDGE, once. The heartbeat with zero rocks beats at max tempo between waves — intended, not a bug. Net: one real, fixable High plus its sibling upstream Gap; the rest survives scrutiny.

**Handoff:** REJECTED → back to TEA (red) for the failing die-while-thrusting test, then Dev (green) for the death-edge `thrust-stop`. This is a testable logic bug, so the route is review → red.

## Round 2 Review (APPROVED — superseded by round 3)

**Verdict:** APPROVED (re-review, Round 2)

The single Round-1 blocker (H-1: thrust loop leaking through death → gameover → attract) is fixed correctly and minimally, and re-verified from three independent angles. Everything Round 1 cleared is untouched. Ship it.

**H-1 resolution — verified:**
- `[EDGE]` `[TEST]` The ship-death edge (`sim.ts:319-329`) now emits `thrust-stop` when `input.thrust` is engaged. Three regression tests (die-while-held, release-on-death, 300-frame fatal-death-into-attract) all failed against the old code (RED verified) and pass now.
- `[RULE]` rule-checker re-ran on the fix diff: **0 violations**; independently traced the guard — held-through-death ⇒ exactly 1 stop, released-same-frame ⇒ exactly 1 stop (the still-alive falling edge fires it; `input.thrust` guard suppresses the second), no leak across the mode transition (`stepAttract`/`stepGameOver` reset `events:[]`; `handleShipDeath` preserves the death-frame events).
- `[VERIFIED]` Reviewer's own independent repro (separate from the Dev's tests): fatal death holding thrust → `totalStops=1` at the death frame, reaches `attract`; press-thrust-on-death → `start=1, stop=1` (net stopped, no leak). evidence: temp repro run, removed after.
- `[DOC]` The `sim.ts` comment intent ("a dead ship's engine makes no sound") and the behavior now agree; the new block is documented with its no-double-stop invariant.
- `[TYPE]` `thrust-stop` is an existing `GameEvent` variant — no new exhaustiveness surface, no cast. `[SEC]` no input/injection surface. `[SIMPLE]` 8-line fix, no over-engineering; guard is the minimal correct condition.
- `[SILENT]` L-1 (3 documented silent `catch{}` in `audio.ts`) unchanged — accepted-as-designed, Low, non-blocking.

**Guard refinement accepted:** Dev implemented the stop with `if (input.thrust)` rather than my originally-suggested `state.thrustPrev` — the more correct condition (see Design Deviations → Reviewer audit). Good call; I'd have written it the same way in hindsight.

**Data flow (re-traced):** thrust key → `input.thrust` → rising-edge `thrust-start` → loop; release → falling-edge `thrust-stop`; **death while engaged → death-edge `thrust-stop`** (the previously-missing arc, now closed). Every path that turns the loop on now has a matching off.

**Regression check:** all pre-existing thrust tests (rising/falling/held/dead-start) still pass; full suite 523/523. The fix is additive (one new emission site for an existing event) — no behavior changed outside the death edge.

**Not fixed here (by design):** the sibling siren-on-run-end leak — it depends on saucer-lifecycle clearing owned by A-13; remains the filed non-blocking Delivery Finding. Not a blocker for A-18.

**Handoff:** APPROVED → to SM (Grand Admiral Thrawn) for finish-story. Reminder for finish/deploy: the R2 sample upload (Dev Delivery Finding, blocking-for-deploy) is still pending — merge is fine (audio degrades silently), but sound stays silent until the 10 `.wav`s land on R2.

## SM Rework Directive — Round 3 (Integration with A-13)

**Status:** Finish was BLOCKED. During A-18's cycle, `develop` advanced with `#13` (A-12 small saucer) and **`#15` (A-13: saucer scoring + collisions + siren cadence)** — merged from another checkout. A-13 is the story A-18 deferred its saucer-siren scope to. Both rewrote `src/core/sim.ts` → merge conflict (`state.ts` auto-merges; only `sim.ts` conflicts). PR #14 is `CONFLICTING`.

**User decision:** FULL INTEGRATION (not minimal union). Route back to Dev (green).

**Dev task (Round 3):**
1. **Rebase** `feat/A-18-sound-heartbeat-thrust-siren` onto `origin/develop` (fetch first). Resolve the `sim.ts` conflict as a UNION: keep BOTH A-13's saucer collision (bullet↔saucer kill, `SAUCER_HITBOX[saucer.size]`, saucer-bullet↔ship) AND A-18's event channel (fire/thrust/explosion events, `withSirenEdge`, `withHeartbeat`). `state.ts`: A-13 added `SaucerSize` + `Saucer.size`; A-18 added `thrustPrev`/`heartbeatTimer`/`events` — combine both.
2. **Wire siren-stop on A-13's bullet-kill:** when a player bullet destroys the saucer (A-13's new path), emit `saucer-siren-stop`. Closes the reviewer's filed Delivery Finding.
3. **Per-size siren:** now that `Saucer.size` exists, the siren picks big vs small. Add a `size: SaucerSize` field to `SaucerSirenStartEvent`; dispatch maps it → `saucerBig`/`saucerSmall` SoundName; wire `saucerSmall.wav` in `audio.ts` (already bundled/on-R2 list). Add the `saucerSmall` SoundName.
4. **Tests:** per-size siren-start (large⇒saucerBig, small⇒saucerSmall); siren-stop on bullet-kill; keep all existing green.
5. Verify (build + full suite), then **force-push** the rebased+amended branch (updates PR #14 in place).

**Then:** Reviewer re-review (the merged sim.ts + new siren-size code is unreviewed) → SM re-finish (conflict now gone).

**Note:** the 3 A-18 commits will be rebased; the TDD trail may collapse — that's fine, PR #14 preserves history.

## Reviewer Assessment

**Verdict:** APPROVED (re-review, Round 3 — A-13 integration)

The finish-blocking merge conflict is resolved soundly, and the user-directed full integration (per-size siren + siren-stop on every saucer death) is correct, well-tested, and clean. No new findings, no regressions. Ship it.

**Merge resolution — SOUND** `[RULE]`: A-13's saucer-kill path and A-18's rock-explosion event coexist in the bullet loop (`sim.ts`); the rock-explosion event is restored exactly once in the player-rock branch; the saucer-shot `else` branch carries no leftover/duplicated A-18 code; zero conflict-marker residue; 6 `events.push` sites total, no dupes (rule-checker + reviewer trace).

**Siren integration — verified:**
- `[EDGE]` `[VERIFIED]` Reviewer's own repro across ALL saucer-death paths: bullet-kill → 1 stop, ram → 1 stop, far-edge → 1 stop (each nulls the saucer); alive-throughout → 0 events; spawn → 1 start whose `size` matches the saucer. `withSirenEdge` compares the INCOMING saucer to the final one, so every death path stops the siren — not just the far-edge despawn (closes the round-1 filed finding).
- `[RULE]` Double-emission SAFE (rule-checker verdict): `had === (next !== null)` fires on exactly the null↔non-null transitions; a same-tick kill+respawn is architecturally impossible (spawn-director single-saucer freeze + arm-then-count).
- `[TYPE]` No `!` non-null assertion — narrowing via `const next = after.saucer; next !== null`. `SaucerSirenStartEvent.size: SaucerSize`; per-size dispatch → `saucerSirenSmall`/`saucerSiren`, both sharing one loop channel (only one rings); exhaustiveness `never` guards hold in `audio.ts play()` and `audio-dispatch.ts` (tsc clean).
- `[VERIFIED]` Determinism + core/shell boundary intact (`sim.ts`/`events.ts` import nothing from shell; no `Date.now`/`Math.random`; `core-boundary.test.ts` passes).
- `[TEST]` New tests non-vacuous (siren-stop-on-bullet-kill fails without A-13's restored kill code; size-on-start; small-siren dispatch). One non-blocking gap: the core size-on-start test exercises only the LARGE path end-to-end (small covered at the dispatch level) — filed as a non-blocking Delivery Finding.
- `[SEC]` no input/injection surface. `[SIMPLE]` union-not-rewrite merge; the siren redesign is a net simplification (one comparison now covers all death paths). `[DOC]` `withSirenEdge`/`SaucerSirenStartEvent` comments updated to the all-death-path contract; stale "bullet-kill is A-13's territory" note removed. `[SILENT]` L-1 (3 documented silent `catch{}`) unchanged — accepted-as-designed.

**Preflight:** 567/567 pass, build + lint clean, no conflict markers, tree clean, 0 behind develop, no tracked binaries, **PR #14 now MERGEABLE**.

**Not fixed (by design):** the small-saucer end-to-end test gap (non-blocking finding); the R2 sample upload (blocking-for-deploy, not merge).

**Handoff:** APPROVED → to SM (Grand Admiral Thrawn) for finish-story. PR #14 is MERGEABLE — the conflict that blocked the prior finish is gone.