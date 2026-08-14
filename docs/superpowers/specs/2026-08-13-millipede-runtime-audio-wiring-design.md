# Millipede runtime + audio wiring — design

**Date:** 2026-08-13
**Story:** ml6-2 (grown by owner ruling)
**Status:** approved (design), pre-implementation

## Summary

Millipede has sixteen pure, ROM-cited core subsystems (`plugins/millipede/src/core/`)
and a pure two-POKEY sound driver (`src/shell/sound-rom.ts`, ml6-1), but **no harness
that runs them**: there is no `GameState`, no `stepGame` orchestrator, no event stream,
no phase machine, no input, and `main.ts` is a 37-line static stamp blit. This story
builds that harness — it wires the existing pieces into a **complete, playable
millipede** with real audio.

The per-subsystem ROM logic is done; this is the wiring. Centipede is the proven
end-to-end template (`core/events.ts` → `stepSim` → `shell/audio-dispatch.ts` →
`main.ts` gesture gate) and we mirror its shapes.

## Owner decisions (binding)

1. **Scope: the complete playable millipede, in ONE story.** Not a vertical slice, not
   a milestone program. All enemies wired, scoring, waves, HUD, lobby showcase. This
   grows ml6-2 and **absorbs ml7-1 (phase machine) and ml7-2 (runtime wiring)** and
   reaches into ml7-3 (HUD/showcase) and ml7-4 (accessibility). The sprint record must
   be re-scoped and ml7-1/ml7-2 marked absorbed. a-3 must stand down its ml7-1 claim
   (only a claim commit exists).
2. **Input: mouse-driven trackball.** Resolves dossier open question OQ-4 in favor of
   the authentic **trackball**; the shell reads the mouse and translates movement into
   trackball deltas. Trackball scaling semantics live in core; the mouse→delta
   translation is a shell concern.
3. **Accessibility gate (standing override of ROM-always-wins): NO full-screen
   strobe/flash** anywhere — wave transitions, death, DDT explosion, attract. Freeze or
   fade instead. The owner has photosensitive epilepsy. Baked into the phase machine
   from the start, pinned by a test; never a retrofit.

## Boundary law (unchanged)

Everything in `src/core/` stays pure — no clock, entropy, DOM, canvas, `fetch`,
`window/document/navigator`, and **no import from `../shell/`** — enforced by
`plugins/millipede/tests/purity.test.ts`. The shell (`src/shell/`, `main.ts`) owns the
mouse, render, audio, and the gesture gate. `sound-rom.ts` is held to core purity even
though it lives under `src/shell` (it is pure ROM data); the AudioContext/synth code
goes in a NEW shell file, never inside `sound-rom.ts`.

## Core — new pure modules

### `core/game-state.ts`
The single owning `GameState`:
- `phase: Phase` — `'attract' | 'play' | 'death' | 'game-over' | 'name-entry'`
- `frame: number` — the interrupt/frame counter; drives subsystem cadences AND the
  audio slot masks (`sound-rom.ts` `shouldTick(index, intct)`).
- `rng` — the millipede RNG state (deterministic).
- `player: { x, y, alive }` — driven by the trackball input.
- `shots` — player shot(s).
- mushroom field: `Uint8Array` (PLYFLD, `conway.ts` `PLYFLD_SIZE`) + `ConwayState`.
- `millipede: Segment[]` — heads + bodies.
- enemy slots reusing each subsystem's own types: `BeetleSlot[]`, bee slot, spider,
  dragonfly, mosquito, earwig, inchworm, and `ddt: DdtTable`.
- `score`, `score2` (the hi byte the difficulty gates read), `lives`, `wave`, DIP/hard
  flags.
- `events: GameEvent[]` — **rebuilt every frame, never appended across frames** (a
  stale event re-fires forever; centipede's law).

### `core/sim.ts` — `stepGame(state, input): GameState`
The orchestrator. One pure function, fixed per-frame order (mirrors centipede
`stepSim`):
1. **Phase dispatch** — attract (self-play demo, events cleared/silent) vs play vs
   death vs game-over vs name-entry.
2. **Input → player** — apply trackball delta (move) + fire.
3. **Shots** — resolve player shot against: mushrooms (`ddtShoot`, conway), millipede
   segments (`stepMillipede` hit + `stepSegmentExplosion`), and each enemy
   (`beetleKill`, bee hit, `spiderKill`, dragonfly, mosquito, earwig, inchworm). Each
   structured result → score + one event.
4. **Millipede** — `stepWaveCadence`, `stepMillipede` (march + split on mushrooms).
5. **Enemies** — spawn ticks + moves (`beetleSpawnTick`/`startBeetle`/`moveBeetle`,
   bee, spider, dragonfly, mosquito, earwig, inchworm); resolve collisions with player
   and mushrooms → events.
6. **DDT** — `bombs`, `ddtExplosionStep`, `ddtScrollDown/Up`.
7. **Mushroom regen** — `conway.masterStep` at its ROM cadence.
8. **Player death / progression** — `stepPlayerDeath`, lives, wave clear/advance
   (`stepWaveDelay`, `beetlesPerWave`), bonus-life at score thresholds (CHAN11).
9. **Collect events.** Attract clears the stream before returning.

### `core/events.ts`
- `EVENT_KINDS` as a runtime `readonly [...] as const` tuple (so tests sweep the real
  list), `GameEventKind = (typeof EVENT_KINDS)[number]`, `event(kind)` constructor.
- One-shots: `shot-fired`, `mushroom-hit`, `segment-killed`, `spider-killed`,
  `bee-killed`, `beetle-killed`, `dragonfly-killed`, `mosquito-killed`, `earwig-killed`,
  `inchworm-killed`, `ddt-exploded`, `player-died`, `wave-cleared`, `bonus-life`. Any
  sustained cues modeled as `-start`/`-stop` pairs (centipede's convention).
- `EVENT_SOUND: Record<GameEventKind, EffectName>` — exhaustive map from event kind to
  a `sound-rom.ts` CHAN slot (0..11, incl. CHAN11 bonus-life). The `Record` is the
  compile-time exhaustiveness anchor.

### `core/phase.ts`
- `forcePhase(state, phase)` helper — avoids the bare phase-literal assignment that reds
  tsc (TS2367; a known project trap).
- Transitions: `attract → play` (coin/click), `play → death` (player hit),
  `death → play` (lives>0) or `death → game-over` (lives==0), `game-over → name-entry`
  (qualifying score, routes to ml5 highscore) → `attract`.
- **Accessibility invariant:** no transition raises a full-screen-flash flag; death,
  wave, DDT-explosion, and attract transitions are freeze-or-fade. Expressed in core as
  a flag/mode the shell render honors, and **pinned by a test that scans every
  transition for a flash flag** (must find none).

### `core/input.ts`
Pure trackball model: `(dx, dy, fire) → player motion`, applying the ROM trackball
scaling (`TBLMT`, `MLSUB.MAC:1797`). No DOM — the shell supplies `dx,dy`.

## Shell — new modules

### `shell/audio.ts`
`createAudio(): AudioEngine` over `@shared/synth`. Each CHAN voice is built from
`sound-rom.ts` `freqSweep(index)` / `contSweep(index)` — stepping the sweep frame to
frame IS the effect (a static render is flat beeps: the silent-feature trap). `resume()`
is the gesture-gated context unlock (no-throw contract; degrades if WebAudio absent).

### `shell/audio-dispatch.ts`
`playEventSounds(audio, events)` — the SH4-5 pure-dispatch convention: node-importable,
no module state/DOM, narrows the engine to a same-file `Pick<AudioEngine, …>` slice, and
gets compile-time exhaustiveness via an explicit `never`-typed binding. Runtime degrades,
never throws (frame path). The switch body is millipede's own cue map, cited to MLIRQ/
MLDEF.

### `main.ts` (rewritten from the static blit)
- Construct the audio engine + game at module scope (constructing touches no WebAudio).
- **Gesture gate:** `keydown` / `click` / `pointerdown` → `audio.resume()` (idempotent,
  listeners stay attached). Mirrors centipede/tempest.
- **Mouse → trackball:** a `mousemove`/pointer listener accumulates `dx,dy` for the next
  `stepGame` input; click also fires / starts play.
- Fixed-timestep loop: accumulate real time → `stepGame(state, input)` → render →
  `playEventSounds(audio, state.events)`. Only the final catch-up step's events dispatch.
- Extend `shell/render.ts` to draw entities + HUD from `GameState` (the existing static
  stamp field draw is reused for the mushroom layer).

## Testing / verification

**vitest (per-integration, node env — millipede's project config):**
- `stepGame` collision routing: a shot at a segment/mushroom/enemy produces the right
  score delta AND the right event.
- Per-family event emission: each sound family fires under its real core condition
  (drives AC1).
- Phase transitions via `forcePhase`; the **accessibility no-flash scan** over every
  transition.
- Input mapping: trackball delta → expected player motion; fire.
- Audio-dispatch exhaustiveness (`EVENT_SOUND` covers every `EVENT_KINDS` entry) +
  **gesture-gate paired positive/negative** — assert BOTH "no AudioContext before a
  gesture" AND "a context IS built/resumed after one" (centipede's documented vacuity
  trap: the negative alone is true today for the wrong reason). Gate test in a SEPARATE
  file from wiring (per-file `vi.mock`).
- Audio engine produces a *moving* sweep (not a constant), reusing the ml6-1 driver data.
- `purity.test.ts` stays green — core imports no shell, holds no engine, names no
  AudioContext.

**Real-browser Playwright-MCP playtest (AC3 — the silent-feature trap; a green vitest is
NOT acceptance):**
- Game boots to attract; click → play.
- AudioContext is `running` and output is non-silent while sounds fire.
- Entities and HUD render at correct coordinates (routing≠geometry: pin output
  coordinates, don't just assert a draw ran); mushrooms look like mushrooms (ROT trap).
- **No full-screen strobe** across wave/death/DDT/attract transitions.
- claude-in-chrome is NOT connected here — playtest via the Playwright MCP (headless) on
  its own port.

**AC4 — silent-degrade trap:** if any sound ships as an asset the code points at (not
synthesized), acceptance is a live 200 fetch, not a green build. (Current plan is fully
synthesized via `@shared/synth`, so no assets expected.)

## Out of scope

Nothing material within "playable millipede" — this deliberately spans ml6 audio +
ml7-1/2/3/4. The ml8 hardening batteries remain a later epic.

## Risks

- **Largest single story in the project.** No orchestrator exists; the collision/step
  order is new design. Mitigated by mirroring centipede's proven `stepSim` structure and
  by the per-subsystem ROM logic already being done and tested.
- **Cross-checkout collision** with a-3's ml7-1 claim — resolved by a-3 standing down
  (coordination message sent; a-3 has only a claim commit).
- **ROM-faithful interaction details** (spawn cadences, collision boxes, scoring) live
  inside the subsystems; the orchestrator must call them with the right arguments in the
  right order. The implementation plan sequences this subsystem-by-subsystem behind the
  spine.
