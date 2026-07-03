# Story A-18 Context

## Title
Sound — accelerating heartbeat, thrust, fire, explosions, saucer siren

## Metadata
- **Story ID:** A-18
- **Type:** story
- **Points:** 5
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** Asteroids — faithful 1979 vector clone

## Problem
The epic's fidelity bar already flags the trap here: "Sound: NOT in the
disassembly notes." Both this story's own research pass and A-3's earlier
research agree — the 6502disassembly.com hub and the computerarcheology.com
hub were checked again for this story and neither mentions sound hardware,
audio chips, or circuit logic anywhere. That is not an oversight in the
documentation; it is a fact about the cabinet: **original Asteroids audio is
discrete analog/TTL circuitry on the PCB, not a programmable sound chip.**
There is no POKEY, no digital sound ROM, nothing to disassemble.

This makes A-18 a different *kind* of story than it might look like at first,
because both sibling games' audio engines assume the opposite. Read
literally, `star-wars/src/shell/audio.ts` and `tempest/src/shell/audio.ts` are
**not** synthesis engines at all — they are sample-playback engines: a
`SOUNDS` name→filename manifest, `fetch` + `decodeAudioData` per sample,
played back via `AudioBufferSourceNode`. Their authenticity comes from
`tools/pokey-bake/` — a tool that renders bit-exact samples **from the real
POKEY chip's ROM data**, with community rips filling gaps. None of that is
available for Asteroids: there is no chip and no digital audio ROM to bake
from. So the star-wars/tempest precedent cannot be copied verbatim — there is
nothing authentic to fetch. **A-18 must actually synthesize the sounds live
in WebAudio** (oscillators, noise nodes, filters) approximating the
documented/well-known discrete-circuit behavior, calibrated against
recordings — the "published analyses" and "footage" tiers of the epic's
fidelity authority chain, not the ROM-quarry tier A-17 uses.

One more precedent check worth recording: **neither sibling has a mute
toggle** (confirmed by grepping both `star-wars/src/` and `tempest/src/` for
`mute`/`Mute` — no hits in either). "If star-wars has one, check" — it
doesn't, so this story isn't obligated to add one either, though the
architecture makes it nearly free (see below).

## Technical Approach

**What to copy from the siblings, precisely.** Not the "fetch a .wav"
mechanic — the *shape* of the shell/core split around it:
- The pure core emits event data on a per-tick channel. **Reconciled
  (Architect ruling — supersedes this story's original observation that no
  event channel existed):** A-8's context, enriched in parallel, already
  defines that channel — the `CollisionEvent` union in `core/collisions.ts`
  (`rockDestroyed{size}`, `shipDestroyed`, `saucerDestroyed{size}`),
  surfaced per tick on `state.pendingEvents` and consumed by A-9 (scoring)
  and A-15 (death flow). A-18 therefore does **not** introduce a rival
  channel: it may hoist the union into a new `core/events.ts` as
  `GameEvent` (preserving the three collision variants verbatim and the
  `state.pendingEvents` field name) and extend it with the non-collision
  cues this story needs (e.g. `{ type: 'fire' }`, emitted from A-4's
  bullet-spawn path). One union, one channel, across
  A-8/A-9/A-13/A-15/A-18.
- `main.ts` drains `state.events` once per rendered frame and maps each to an
  engine call — a thin, exhaustive `switch` (a missing-arm compile error is
  the guardrail star-wars relies on).
- The engine's `AudioContext` is built **lazily inside `resume()`**, wired to
  the first click/keydown (browsers forbid audio before a user gesture);
  every method is a safe no-op until then, and every failure mode (no
  WebAudio, blocked autoplay, a bad node) degrades silently rather than
  throwing.
- A `master` `GainNode` sits between every voice and `ctx.destination` —
  this is also the free mute seam: `master.gain.value = 0` mutes everything
  in one line, no per-voice bookkeeping. Worth adding given how cheap it is,
  even without sibling precedent forcing it — treat as a nice-to-have, not a
  blocking AC.

**What to change, because Asteroids' sound has no chip to imitate.** Swap
"fetch a pre-baked authentic buffer" for **live synthesis nodes** built at
`resume()` time and driven by state each frame, because several of this
game's cues are *continuously parametrized* by live gameplay in a way a
static sample can't cover cheaply — a problem the siblings' one-shot-only
sound sets never had to solve:

| Cue | Trigger | Synthesis sketch |
|---|---|---|
| **Fire** | `{ type: 'fire' }` (new variant, one-shot) | short descending pulse — a brief oscillator blip, ~0.1s |
| **Thrust** | a continuous `thrusting` flag, not an event — see below | filtered white-noise rumble; noise source starts when the flag flips true, stops when it flips false |
| **Rock explosions (×3 sizes)** | existing `rockDestroyed{size}` (A-8) | noise burst, filtered/durationed per size — long+low for large, short+bright for small |
| **Ship explosion** | existing `shipDestroyed` (A-8) | harsher/longer noise burst than any rock size |
| **Saucer siren (×2)** | a continuous "which saucer is alive" state, not an event — see below | LFO-modulated oscillator: slow deep warble while a large saucer is alive, fast high warble while a small saucer is alive |
| **Heartbeat** | polled each frame from a pure core function — see below | two alternating low tones ("lub-dub"), tempo computed from game state |

**Continuous cues need a state read, not just an event list.** `thrusting`
and "saucer alive + which kind" are held conditions, not instants — a
`GameEvent` array (built for discrete moments) is the wrong shape for "start
this loop and keep it running until the condition ends." Extend `GameState`
with the plain data needed (e.g. `ship.thrusting: boolean`, already
derivable from `input.thrust` each tick; `saucer: Saucer | null` with a
`size` field almost certainly already exists by A-13) and have the shell poll
it once per animation frame alongside draining `events` — still core-driven
and deterministic (a fixed input/RNG/dt stream reproduces the exact same flag
transitions), just a different channel than the one-shot list. This is a
genuine, small architecture extension beyond what either sibling's
discrete-only sound set needed — call it out as such in the PR, don't present
it as "the same pattern as star-wars."

**Heartbeat tempo — what drives it.** Neither disassembly hub documents
sound, so this is sourced from the epic's "published analyses / footage"
tier, not the ROM quarry: the widely-documented cabinet behavior is that the
two-tone thump **accelerates as the rock count on screen drops**, reaching
its fastest just before the last rock of a wave dies, then resets to the slow
tempo when the next (larger) wave spawns. Implement this as a small **pure
core function**, e.g. `heartbeatIntervalMs(state): number`, driven by
rocks-remaining vs. rocks-at-wave-start — unit-testable with fixed state
fixtures, independent of the shell's actual audio scheduling. Treat the exact
curve (linear vs. stepped) as tunable-by-feel and confirm it against
reference footage during A-19-style calibration, not as a hard ROM constant.

**`reference/README.md` documents sources for this story specifically**,
separately from A-17's ROM-quarry citations, since there's no chip data to
quarry: published technical write-ups on the discrete heartbeat/thrust/noise
circuit behavior, plus any recordings/MAME captures used to tune filter
cutoffs, envelope times, and the siren warble rates.

## Scope
- **In scope:** `core/events.ts` (the union **hoisted** from A-8's
  `core/collisions.ts` as `GameEvent` — collision variants preserved
  verbatim, `state.pendingEvents` field name unchanged — extended with
  `fire`); the `ship.thrusting` / saucer-presence state fields needed for
  continuous cues; `shell/audio.ts` (gesture-gated `AudioContext`, master
  gain, per-cue synthesis nodes per the table above); `main.ts`'s
  event-drain + state-poll pump; the pure `heartbeatIntervalMs` core
  function; `reference/README.md` sourcing for this story's sound design;
  Vitest coverage (core: event emission + heartbeat tempo function against
  fixed state fixtures, mirroring tempest's `sim.audio-events.test.ts`
  pattern; shell: dispatch-to-node-creation mapping against a
  mocked/stubbed `AudioContext`, mirroring `shell/audio.test.ts` in both
  siblings — not actual audio output, which isn't meaningfully testable in
  Vitest).
- **Out of scope:** shape/brightness data (A-17); glow/visual calibration
  (A-19); porting any sibling `.wav` sample files (there is nothing
  ROM-authentic to bake for this cabinet); speech/TMS5220-style voice (no
  such subsystem existed on the real Asteroids board); a persisted
  mute-setting UI (the gain-node seam is in scope; a settings screen is not,
  absent sibling precedent forcing it).

## Acceptance Criteria
- Each of the six cues (fire, thrust, 3 explosion sizes, 2 saucer sirens,
  heartbeat) is triggerable end-to-end from a core state change through to an
  audio-engine call, verified by dispatch tests against a mocked
  `AudioContext` (no real-audio assertions).
- Heartbeat tempo is driven by a pure, unit-tested `heartbeatIntervalMs`-style
  core function whose output visibly tracks rocks-remaining across a fixed
  fixture sequence (fewer rocks ⇒ shorter interval).
- Thrust rumble and saucer sirens start/stop strictly following their
  underlying state condition (held, not pulsed) across ticks in a test
  fixture.
- `core/events.ts` and any new `GameState` fields are covered by the existing
  banned-globals guard test (no wall-clock, no `Math.random` — RNG/dt only).
- A master-gain mute seam exists (`master.gain.value = 0` or equivalent);
  wiring it to a UI control is optional.
- `reference/README.md` documents the non-ROM sources used for this story's
  sound design (published analyses + recordings), distinct from A-17's
  ROM-quarry citations.
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test`
  (Vitest) is green.

---
_Generated by `pf context create story A-18` from the sprint YAML._
_Enriched by Architect (Goldstein): corrected the sound-hardware premise
(discrete analog/TTL, no chip — confirmed via both research hubs), identified
that star-wars/tempest's `audio.ts` is sample playback of chip-authentic
bakes rather than a synthesis blueprint, designed the live-synthesis +
continuous-state-cue extension this story needs instead, sourced the
heartbeat-tempo driver from published/footage analysis, and confirmed no
sibling has a mute toggle._
_Reconciled by Architect: builds on A-8's `CollisionEvent`/`state.pendingEvents`
channel (hoisting it to `core/events.ts` as `GameEvent` + a `fire` variant)
instead of introducing a new one._
