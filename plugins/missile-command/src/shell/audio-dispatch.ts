// src/shell/audio-dispatch.ts
//
// Story mc8-2 (GREEN, Julia) — the shell's event->POKEY wiring as PURE, importable
// functions (battlezone's audio-dispatch.ts extraction, not star-wars's inline
// switch), so the map is unit-testable against a recording fake without a canvas
// or a real AudioContext. No module state, no DOM: the only effect is calling the
// injected audio surface, once per event, in core order.
//
// Two channels, mirroring the cabinet's split:
//  - ONE-SHOT cues ride the `SoundEvent` stream (`playEventSounds`) — launch,
//    explosion, the can't-fire klaxon, the bonus tick.
//  - SUSTAINED voices are re-read from live state every frame
//    (`updateSustainedSounds`) — the cruise/Sputnik drone. Continuous, not
//    one-shot: it has no trigger moment to ride, and must be SILENCED at the
//    pause/game-over edge, not left to ring (the mc8-2 edge-driven-voices AC).

import type { SoundEvent } from '../core/sound-events.js'
import type { GameState } from '../core/game.js'
import { droneRequest } from '../core/drone-trigger.js'
import type { AudioEngine } from './audio.js'

// Just the slice of the engine the dispatch needs — decoupled from resume(), so
// tests pass a recording fake (tempest's SoundPlayer narrowing).
type SoundSurface = Pick<AudioEngine, 'play' | 'startLoop' | 'stopLoop'>

// The sustained drone update needs the loop lifecycle AND the parametric sweep feed
// (mc8-5) — a distinct, narrower slice so the one-shot/edge dispatchers stay decoupled
// from `feedDrone`.
type DroneSurface = Pick<AudioEngine, 'startLoop' | 'stopLoop' | 'feedDrone'>

// Play one cue per gameplay event the core emitted this step, in order. `play()`
// is a no-op until the gesture gate opens, so pre-interaction events are silently
// skipped. Mapping = the mc8-1 spike event map (W3MAIN call sites).
export function playEventSounds(audio: SoundSurface, events: readonly SoundEvent[]): void {
  for (const event of events) {
    switch (event.type) {
      case 'launched':
        // mc8-4: a launch from a base at its LOW count sounds the LOW variant (LO,
        // SLOABM) instead of the normal launch (LA, SABLAU) — W3MAIN:1385 CMP I,4/IFEQ.
        audio.play(event.baseLow ? 'low' : 'launch')
        break
      case 'detonated':
        audio.play('explosion') // EX — EXSNON "BANG ON"
        break
      case 'structureDestroyed':
        audio.play('explosion') // EX — SOHNO is an alias of SEXPLO
        break
      case 'ammoEmpty':
        audio.play('no-fire') // NS — SNSHOT "NO FIRE NOISE"
        break
      case 'bonusTick':
        audio.play('bonus-tick') // TK — SUNABM
        break
      case 'icbmKilled':
        // SILENT by design: the ABM detonation that opened the fireball already
        // banged (the `detonated` event); the ROM plays no per-catch cue. Voicing
        // a second explosion here would double every kill (a fidelity regression).
        break
      default: {
        // Exhaustiveness guard (tempest/battlezone pattern): a new SoundEvent kind
        // without a wired case becomes a COMPILE error here.
        const _exhaustive: never = event
        void _exhaustive
        break
      }
    }
  }
}

// Drive the sustained voices from live state, once per render frame.
//
// mc8-5 — the cruise/Sputnik drone LIVE TRIGGER (CMSNON/STSNON, gated by CRMONS). The
// pure `droneRequest(state)` selector projects on-screen cruise/Sputnik presence to a
// drone kind (or null); this seam consumes it live: while the game is in PLAY and a
// threat is up, start the drone and drive its parametric pitch sweep (mc8-4's
// `droneSweep`, fed via `feedDrone`); the moment the threat clears, stop it.
//
// The edge-driven-voices gotcha (mc8-2): the drone is a continuous voice with no
// closing event when the game ENDS with the threat still on screen — `stepGame` freezes
// the roster at `'over'` (game.ts:178 short-circuits, copying icbms/sputniks unchanged),
// so `droneRequest` still returns non-null there. A trigger keyed on presence alone would
// therefore RE-START the drone across the terminal edge and leak it. So the phase gate
// wins over presence: the drone runs ONLY during `'play'`, and every other phase silences
// it outright (battlezone forces stopEngine at 'gameover' the same way). That allowlist
// also pre-empts `'pause'` — not yet wired into the state machine (nothing sets that phase
// today), but the same presence-leak would apply once mc6 adds it, so it is covered now.
// `startLoop`/`stopLoop` are idempotent, so a held threat re-`startLoop`s harmlessly and
// an empty frame is a cheap no-op.
export function updateSustainedSounds(audio: DroneSurface, state: GameState): void {
  const kind = state.phase === 'play' ? droneRequest(state) : null
  if (kind === null) {
    audio.stopLoop('drone')
    return
  }
  audio.startLoop('drone')
  // The sim frame counter is the sweep's clock — a pure, monotonic input so the pitch
  // descends deterministically each frame (droneSweep wraps TOP→BOTTOM per kind).
  audio.feedDrone(state.frame, kind)
}

// mc8-4: the EDGE cues — one-shots that fire on a state TRANSITION, not on a per-frame
// SoundEvent. whoop (new wave), end-game (game over) and bonus-city (a bonus city earned)
// all resolve in stepGame's 'between'/'over' branches, both of which hardcode
// soundEvents:[] — so they cannot ride the event stream. Instead the shell compares the
// PREVIOUS render frame's state with the current one and voices the crossing exactly once.
// Pure and side-effect-only-through-`audio`; main.ts keeps `prev` and calls this per frame.
export function playEdgeCues(audio: SoundSurface, prev: GameState, curr: GameState): void {
  // WHOOP — WP, SNEWAV (W3MAIN:3911): the wave counter advanced.
  if (curr.wave > prev.wave) audio.play('whoop')

  // END-GAME — XX "THE END", SENDGA (W3MAIN:4647): the play field just went terminal.
  if (prev.phase !== 'over' && curr.phase === 'over') audio.play('end-game')

  // BONUS CITY — BN, SBONUS (W3MAIN:4845): the ROM sounds this when the city is GRANTED
  // at the wave-end REGEN step, not when the running score crosses a bonus threshold
  // mid-play. mc8-4 keyed it to the score crossing (`bonusCitiesEarned++`), which sounds
  // the cue the instant a kill banks the points — up to a whole wave early. mc8-7 moves
  // it to the grant: REGEN tops the board up from the reserve (START_CITIES − citiesLost
  // + bonusCitiesEarned) only in the between→play beat, which ALWAYS advances the wave
  // (`resumePlay`, game.ts). So the faithful signal is a wave-advance frame whose alive-
  // city count also rose. The wave gate (matching WHOOP above) is what makes this correct
  // off ANY (prev, curr) pair, not just the ones main.ts happens to feed: a new-game
  // restart (`startGame`, 'over'/'attract' → fresh 'play') also raises the alive count but
  // RESETS the wave to 1, so `curr.wave > prev.wave` excludes it — no spurious cue on a
  // fresh game. Read off the pure state pair, so this stays in the shell and core carries
  // no audio concern.
  const alive = (s: GameState): number => s.cities.reduce((n, c) => (c.alive ? n + 1 : n), 0)
  if (curr.wave > prev.wave && alive(curr) > alive(prev)) audio.play('bonus-city')
}
