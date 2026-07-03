# Story bz1-11 Context

## Title
Audio — engine hum, cannon, explosion, enemy motion, saucer

## Metadata
- **Story ID:** bz1-11
- **Type:** story
- **Points:** 2
- **Priority:** p2
- **Workflow:** superpowers
- **Repo:** battlezone
- **Epic:** Battlezone (1980) — full faithful vector clone

## Problem
Approximate the cabinet's audio — POKEY (4 voices) mixed with **discrete**
analog circuits for engine rumble, cannon, and explosion — entirely in
`shell/audio.ts`; `core/` stays silent and deterministic. Core emits gameplay
events (shot fired, shell impact, enemy destroyed, player hit, hostile spawn,
saucer present) on a `GameEvent` data channel — reuse star-wars's
`core/events.ts` pattern (`state.events: GameEvent[]`, a discriminated union
narrowed by `type`, appended fresh each `stepGame` step) rather than inventing
a new one — and the shell maps those events (plus a couple of continuously
-read state values) to sound. This story is gated on bz1-2 for the sound
inventory and on the event-emitting gameplay stories (bz1-5 shots/impacts,
bz1-7 enemy spawn/death/player-hit, bz1-8/9 missile/super-tank/saucer
presence) for the actual event kinds to consume — extend the union
incrementally to match what those stories land, don't invent payload shapes
ahead of them. Unlike tempest/star-wars, Battlezone's discrete-circuit sounds
have no ROM POKEY register data to bake into authentic samples, so runtime
WebAudio **synthesis** (oscillators/noise/filters) is the default approach;
only if recorded reference audio later replaces synthesis should it be hosted
on R2 per tempest's convention, never committed as a binary asset.

## Technical Approach
- Add `core/events.ts` mirroring star-wars's shape: a `GameEvent` discriminated
  union on `state.events`, pure data (no callbacks), exhaustively `switch`-
  narrowed by consumers. Anticipated kinds: `shot-fired` (bz1-5),
  `shell-impact` (bz1-5), `enemy-destroyed` (bz1-7/8), `player-hit` (bz1-7),
  `hostile-spawn` (bz1-7/8/9), `saucer-present`/`saucer-gone` (bz1-9). Only
  wire the kinds that already exist in landed stories; stub the rest as the
  dependent stories ship.
- `shell/audio.ts`: WebAudio engine, IO-only, never imported by `core/`. Follow
  the sibling pattern of lazily constructing a single `AudioContext` inside a
  `resume()`-style call — never at module load or bootstrap (autoplay policy).
- Gesture unlock (in `main.ts` or `shell/loop.ts`): idempotent
  `unlockAudio()`-style handler on `pointerdown`/`keydown` that calls
  `audio.resume()`, matching star-wars/tempest's convention so repeat gestures
  are harmless no-ops.
- Extract the event→sound mapping into its own pure function (tempest's
  `playEventSounds(audio, events)` in `shell/audio-dispatch.ts`) rather than
  inlining a switch in `main.ts` (star-wars's older, less-testable approach) —
  this is what lets the map be unit-tested against a mocked `AudioContext`
  without booting a canvas.
- Sound inventory: **discrete-circuit** sounds (engine rumble, cannon report,
  explosion) have no digital register data — synthesize via oscillator/noise
  nodes tuned against reference recordings/analyses, never asserted as ROM
  fact. **POKEY-voice** sounds (enemy movement/track, saucer warble) are
  tone-based like tempest/star-wars's baked voices, synthesized here for now
  since no sample data has surfaced; note in `reference/README.md` that they
  are candidates for future R2 baking if authentic samples are found.
- Engine rumble and enemy track sound are **continuous, not one-shot**: model
  each as a persistent oscillator/noise node whose frequency/gain the shell
  updates every render frame from current state (tread throttle for the
  engine; hostile-presence for the track sound) — distinct from the discrete
  one-shot cues fired by `shot-fired`/`enemy-destroyed`/etc.
- Cannon report fires one-shot on `shot-fired`; explosion fires one-shot on
  `enemy-destroyed`/`player-hit`; saucer warble runs continuously between
  `saucer-present` and `saucer-gone`.
- Document each sound's synthesis parameters and the recording/analysis they
  approximate in `reference/README.md` (append to whatever bz1-2 already
  created) — sources are approximations, never cited as disassembled ROM data.
- Keep `core/` audio-free: no `AudioContext`, oscillator/timing, or Web Audio
  API references anywhere under `core/` — grep-checkable.

## Scope
- In scope: `core/events.ts` gameplay event channel, `shell/audio.ts` WebAudio
  synthesis engine, the event→sound dispatch function, gesture-gated
  `AudioContext` init, continuous engine/enemy-track parameter updates,
  `reference/README.md` sourcing notes for every synthesized sound.
- Out of scope: attract-mode music or a title jingle (not in the sound
  inventory called out by the epic/design brief); baked/sampled audio hosted
  on R2 (only if real recordings surface later — not assumed for this story);
  any change to bz1-5/7/8/9's simulation logic (audio only consumes their
  events); HUD/bichromatic framing fidelity (bz1-12); mute/volume UI.

## Acceptance Criteria
- Every listed sound (engine rumble, cannon report, explosion, enemy
  movement/track, saucer warble) is triggered from a core-emitted `GameEvent`
  or a continuously-read state value; the event→sound dispatch is unit-tested
  in the shell against a mocked/stub `AudioContext` (no real audio hardware
  needed in CI).
- `core/` contains zero audio code or timing — a grep for `AudioContext`,
  `OscillatorNode`, `new Audio`, and similar Web Audio references under
  `core/` returns nothing.
- Engine sound parameters respond to throttle: a test drives varying
  tread/throttle input and asserts the shell's engine oscillator
  frequency/gain change accordingly.
- Every synthesized sound's reference recording/analysis is documented in
  `reference/README.md`, with no synthesis parameter asserted as a ROM fact.
- Audio never starts before a user gesture: `AudioContext` construction/resume
  happens only inside the gesture handler, not at module load or bootstrap —
  verified by test or code inspection.
- Determinism is unaffected: `core/`'s event stream remains identical for a
  fixed seed/dt regardless of audio wiring (audio is shell-only, one-way).
- `npm run build` clean and `npm test` green in `battlezone/`.

---
_Generated by `pf context create story bz1-11` from the sprint YAML._
_Enriched by Architect (Maude) via story-context subagent._
