// tests/core/enemies-mame-crosscheck.test.ts
//
// Story bz5-4 — RED phase (O'Brien / TEA). ENEMY AI CROSS-CHECK against MAME as
// an INDEPENDENT SECOND primary source. bz1–bz4 audited and fixed the enemy AI
// against the BZONE.MAC / va-battlezone dis65 DISASSEMBLY. This story re-validates
// that work against the MAME driver — the emulator that EXECUTES the same ROM —
// and records agreements/divergences with MAME citations (AC1, AC2). Behaviour
// changes only where BOTH sources agree the clone diverged (AC3).
//
// THE STRUCTURAL FACT that scopes this cross-check (findings doc §11.2, and the
// §11/bz5-1 precedent): MAME's DRIVER SOURCE contains NO enemy-AI logic. The
// state machine (turn rate, standoff, flank/charge, fire-on-sweep) and
// GetTankType's super-tank selection live in the `maincpu` ROM region MAME loads
// and executes (bzone.cpp:711-717) — byte-identical to what BZONE.MAC disassembles.
// `bzone.cpp`/`bzone_a.cpp` only wrap the HARDWARE. So MAME cannot independently
// TRANSCRIBE the AI logic to diff; a true "executed-behaviour" diff would require
// RUNNING MAME and observing telemetry, which a headless source-diff / unit suite
// cannot. What MAME DOES second-source, and what this file pins:
//
//   1. The DIP-documented SPAWN thresholds (AC2) — MAME's driver documents the
//      factory-default ('$'-marked) values the clone had pinned from a SECONDARY
//      source (arcade-museum.com), so MAME AGREES and UPGRADES them from one
//      secondary source to two agreeing sources.
//   2. The SOUND-GATING observable hook (AC2) — bzone_a.cpp:1-20's sound-enable
//      bits map audible enemy actions (fire, die) to the clone's core→cue wiring.
//
// Every assertion below therefore ENCODES a CONFIRMED cross-check (clone already
// matches the second source). They are regression pins, not RED — the audit found
// NO divergence, and fabricating a failing test would violate the story's
// verification-first mandate (AC3). MAME source lives at the EXTERNAL, non-vendored
// tree ~/Projects/mame/src/mame/atari/ — its line numbers are cited in prose only
// (the vendored citation gate cannot blob-verify an out-of-repo tree).
import { describe, it, expect } from 'vitest'
import { MISSILE_INTRO_THRESHOLD } from '../../src/core/scoring'
import { BONUS_TANK_SCORES } from '../../src/core/difficulty'
import { playEventSounds } from '../../src/shell/audio-dispatch'
import type { GameEvent } from '../../src/core/events'

describe('bz5-4 · enemy-AI spawn/cadence cross-check vs MAME DIP documentation', () => {
  // MAME bzone.cpp:74-77 documents the missile-intro DIP band and marks the
  // factory default with '$':
  //   XXXX11XX   Missile appears after 5,000 points
  //   XXXX10XX   Missile appears after 10,000 points  $   <- factory default
  //   XXXX01XX   Missile appears after 20,000 points
  //   XXXX00XX   Missile appears after 30,000 points
  // The clone pinned MISSILE_INTRO_THRESHOLD=10000 from arcade-museum.com's DIP
  // sheet because "the ROM cannot name a factory default" (scoring.ts:63-66).
  // MAME's driver documents the SAME '$'-default → CONFIRMED, second source.
  // scoring.test.ts already asserts membership in the {5000,10000,20000,30000}
  // band; this TIGHTENS the band to the single MAME-documented default.
  it('missile-intro threshold matches MAME DIP factory default (10,000 pts)', () => {
    expect(MISSILE_INTRO_THRESHOLD).toBe(10000)
  })

  // MAME bzone.cpp:78-81 documents the bonus-tank DIP band, '$'-default:
  //   XX11XXXX   No bonus tank
  //   XX10XXXX   Bonus tanks at 15,000 and 100,000 points  $   <- factory default
  //   XX01XXXX   Bonus tanks at 25,000 and 100,000 points
  //   XX00XXXX   Bonus tanks at 50,000 and 100,000 points
  // Clone BONUS_TANK_SCORES=[15000,100000] (difficulty.ts:44), also pinned from
  // the arcade-museum.com sheet. MAME AGREES → CONFIRMED, second source.
  it('bonus-tank thresholds match MAME DIP factory default (15,000 & 100,000 pts)', () => {
    expect([...BONUS_TANK_SCORES]).toEqual([15000, 100000])
  })
})

describe('bz5-4 · enemy-action sound-gating cross-check vs MAME (bzone_a.cpp:1-20)', () => {
  // The observable hook (AC2): bzone_a.cpp:1-20 documents the cabinet's
  // sound-enable bits — ONE shared generator per effect, gated on:
  //   D2  shell enable        (a shell leaves a barrel)      -> play('cannon')
  //   D0  explosion enable    (something is destroyed;       -> play('explosion')
  //                            "gates a noise generator")
  // The clone's core→cue map (audio-dispatch.ts) ties enemy actions to exactly
  // these single generators. A recording fake asserts the mapping — the same
  // pattern as audio-dispatch.test.ts, re-cited here to the MAME second source.
  function record() {
    const calls: string[] = []
    const surface = {
      play(name: 'cannon' | 'explosion' | string): void {
        calls.push(`play:${name}`)
      },
      startLoop(): void {},
      stopLoop(): void {},
      setEngine(): void {},
      stopEngine(): void {},
    }
    return { calls, surface }
  }

  it('an enemy death drives the single explosion generator (MAME D0, one noise gen)', () => {
    const { calls, surface } = record()
    const events: readonly GameEvent[] = [{ type: 'enemy-destroyed', kind: 'tank' }]
    playEventSounds(surface as never, events)
    expect(calls).toEqual(['play:explosion'])
  })

  it('the player death uses the SAME explosion generator, not a per-side pair (MAME D0)', () => {
    const { calls, surface } = record()
    const events: readonly GameEvent[] = [{ type: 'player-hit' }]
    playEventSounds(surface as never, events)
    expect(calls).toEqual(['play:explosion'])
  })

  it('a cannon shot drives the shell channel (MAME D2 shell enable)', () => {
    const { calls, surface } = record()
    const events: readonly GameEvent[] = [{ type: 'shot-fired' }]
    playEventSounds(surface as never, events)
    expect(calls).toEqual(['play:cannon'])
  })
})
