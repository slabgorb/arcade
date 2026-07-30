// tests/shell/audio-dispatch.test.ts
//
// Story bz1-11 — RED phase (Furiosa / TEA). The shell's event→sound wiring as
// a PURE, importable function — tempest's audio-dispatch.ts extraction
// (story 6-12 there), not star-wars's inline-in-main.ts switch, precisely so
// this file can exist: a recording fake asserts the exact calls, in order,
// without booting a canvas (context-story-bz1-11.md Technical Approach).
//
// The sound map pinned here (the story's full inventory — nothing more):
//   shot-fired               → play('cannon')       one-shot, discrete circuit
//   enemy-destroyed (any)    → play('explosion')    one-shot, discrete circuit
//   player-hit               → play('explosion')    same blast hardware
//   saucer-present           → startLoop('saucer')  POKEY-style warble
//   saucer-gone              → stopLoop('saucer')
//   hostile-spawn            → (silent — the track loop is continuous state,
//                               not a spawn sting; no such sound in the
//                               inventory)
//
// Continuous sounds are NOT event-driven (story: "continuous, not one-shot"):
//   updateContinuousSounds(audio, state, input) runs every render frame —
//   engine hum from |tread| throttle, track loop from hostile liveness.
//
// src/shell/audio-dispatch.ts is absent pre-GREEN — module-load failure is
// the RED signal.
import { describe, it, expect } from 'vitest'
import { playEventSounds, updateContinuousSounds } from '../../src/shell/audio-dispatch'
import type { GameEvent } from '../../src/core/events'
import { initGame, type GameState } from '../../src/core/state'
import { stepGame } from '../../src/core/sim'
import { NO_INPUT, type Input } from '../../src/core/input'

const DT = 1 / 60
const START: Input = { ...NO_INPUT, start: true }

/** A recording fake of the audio surface — captures every call, in order. */
function recorder() {
  const calls: string[] = []
  return {
    calls,
    audio: {
      play(name: 'cannon' | 'explosion'): void {
        calls.push(`play:${name}`)
      },
      startLoop(name: 'saucer' | 'track'): void {
        calls.push(`startLoop:${name}`)
      },
      stopLoop(name: 'saucer' | 'track'): void {
        calls.push(`stopLoop:${name}`)
      },
      setEngine(throttle: number): void {
        calls.push(`setEngine:${throttle}`)
      },
      stopEngine(): void {
        calls.push('stopEngine')
      },
    },
  }
}

/** Replay a call ledger and answer: is the warble running at the end? */
function warbleRunning(calls: readonly string[]): boolean {
  let on = false
  for (const c of calls) {
    if (c === 'startLoop:saucer') on = true
    if (c === 'stopLoop:saucer') on = false
  }
  return on
}

/** A live run for the continuous-sound tests. */
const playing = (): GameState => stepGame(initGame(7), START, DT)

const treads = (left: number, right: number): Input => ({
  leftTread: left,
  rightTread: right,
  fire: false,
  start: false,
})

describe('playEventSounds — one cue per gameplay event, in order', () => {
  it('shot-fired plays the cannon report', () => {
    const r = recorder()
    playEventSounds(r.audio, [{ type: 'shot-fired' }])
    expect(r.calls).toEqual(['play:cannon'])
  })

  it.each(['tank', 'super-tank', 'missile'] as const)(
    'enemy-destroyed(%s) plays the explosion ALONE — no DISINT (that layer is saucer-only, bz3-10 / U-014)',
    (kind) => {
      const r = recorder()
      playEventSounds(r.audio, [{ type: 'enemy-destroyed', kind }])
      expect(r.calls).toEqual(['play:explosion'])
    },
  )

  it('enemy-destroyed(saucer) plays the explosion AND the DISINT zap layer (bz3-10 / U-014)', () => {
    // BZONE.MAC:2483-2492 — a saucer kill fires DISINT via SNDON, THEN sets
    // EXPCNT for the big explosion: two layered sounds, saucer-only.
    const r = recorder()
    playEventSounds(r.audio, [{ type: 'enemy-destroyed', kind: 'saucer' }])
    expect(r.calls).toEqual(['play:explosion', 'play:disint'])
  })

  it('player-hit plays the explosion — same discrete blast circuit', () => {
    const r = recorder()
    playEventSounds(r.audio, [{ type: 'player-hit' }])
    expect(r.calls).toEqual(['play:explosion'])
  })

  it('saucer-present starts the warble loop; saucer-gone stops it', () => {
    const r = recorder()
    playEventSounds(r.audio, [{ type: 'saucer-present' }])
    expect(r.calls).toEqual(['startLoop:saucer'])

    const r2 = recorder()
    playEventSounds(r2.audio, [{ type: 'saucer-gone' }])
    expect(r2.calls).toEqual(['stopLoop:saucer'])
  })

  it('hostile-spawn is SILENT — the track sound is continuous, not a sting', () => {
    const r = recorder()
    playEventSounds(r.audio, [{ type: 'hostile-spawn', kind: 'tank' }])
    expect(r.calls).toEqual([])
  })

  it('an empty frame makes no sound at all', () => {
    const r = recorder()
    playEventSounds(r.audio, [])
    expect(r.calls).toEqual([])
  })

  it('multiple events in one frame all dispatch, preserving core order', () => {
    // A kill step really does bundle events (enemy-destroyed + saucer-gone on
    // a saucer kill) — nothing may be dropped or reordered. The saucer kill
    // also layers DISINT (bz3-10 / U-014), right after its explosion.
    const frame: readonly GameEvent[] = [
      { type: 'shot-fired' },
      { type: 'enemy-destroyed', kind: 'saucer' },
      { type: 'saucer-gone' },
    ]
    const r = recorder()
    playEventSounds(r.audio, frame)
    expect(r.calls).toEqual(['play:cannon', 'play:explosion', 'play:disint', 'stopLoop:saucer'])
  })

  it('handles every event kind in the union without throwing (exhaustiveness)', () => {
    const oneOfEach: readonly GameEvent[] = [
      { type: 'shot-fired' },
      { type: 'enemy-destroyed', kind: 'tank' },
      { type: 'enemy-destroyed', kind: 'super-tank' },
      { type: 'enemy-destroyed', kind: 'missile' },
      { type: 'enemy-destroyed', kind: 'saucer' },
      { type: 'player-hit' },
      { type: 'hostile-spawn', kind: 'super-tank' },
      { type: 'saucer-present' },
      { type: 'saucer-gone' },
    ]
    const r = recorder()
    expect(() => playEventSounds(r.audio, oneOfEach)).not.toThrow()
    // Sanity on the full map: 1 cannon + 5 explosions + warble start/stop.
    expect(r.calls.filter((c) => c === 'play:cannon')).toHaveLength(1)
    expect(r.calls.filter((c) => c === 'play:explosion')).toHaveLength(5)
    expect(r.calls.filter((c) => c === 'startLoop:saucer')).toHaveLength(1)
    expect(r.calls.filter((c) => c === 'stopLoop:saucer')).toHaveLength(1)
  })
})

describe('updateContinuousSounds — engine hum follows the treads (story AC)', () => {
  const engineArg = (calls: readonly string[]): number => {
    const engineCalls = calls.filter((c) => c.startsWith('setEngine:'))
    expect(engineCalls, 'the hum must be updated every frame').toHaveLength(1)
    return Number(engineCalls[0].split(':')[1])
  }

  it('full treads drive the hum to full throttle (1), idle treads to 0', () => {
    const r1 = recorder()
    updateContinuousSounds(r1.audio, playing(), treads(1, 1))
    expect(engineArg(r1.calls)).toBe(1)

    const r2 = recorder()
    updateContinuousSounds(r2.audio, playing(), treads(0, 0))
    expect(engineArg(r2.calls)).toBe(0)
  })

  it('one tread alone lands strictly between idle and full', () => {
    const r = recorder()
    updateContinuousSounds(r.audio, playing(), treads(1, 0))
    const t = engineArg(r.calls)
    expect(t).toBeGreaterThan(0)
    expect(t).toBeLessThan(1)
  })

  it('reverse counts as work: |−1, −1| hums like full ahead (dual-tread |throttle|)', () => {
    const r = recorder()
    updateContinuousSounds(r.audio, playing(), treads(-1, -1))
    expect(engineArg(r.calls)).toBe(1)
  })

  it('game over ACTUALLY silences the engine — stopEngine, not an idle-volume zero (review rework)', () => {
    // Rejection finding 2: setEngine(0) maps to the deliberately AUDIBLE idle
    // (engineParams(0).gain > 0), so "silence" must be its own call.
    const over: GameState = { ...playing(), mode: 'gameover' }
    const r = recorder()
    updateContinuousSounds(r.audio, over, treads(1, 1))
    expect(r.calls).toContain('stopEngine')
    expect(
      r.calls.filter((c) => c.startsWith('setEngine:')),
      'no idle-volume hum on a dead tank',
    ).toEqual([])
  })

  it('attract is silent too — no hum, no track, even with the phantom hostile alive (review rework)', () => {
    const attract = initGame(7)
    expect(attract.enemies.hostile.phase, 'staging: the demo boots a live hostile').toBe('alive')
    const r = recorder()
    updateContinuousSounds(r.audio, attract, treads(1, 1))
    expect(r.calls).toContain('stopEngine')
    expect(r.calls.filter((c) => c.startsWith('setEngine:'))).toEqual([])
    expect(r.calls).not.toContain('startLoop:track')
  })
})

describe('warble lifecycle across mode resets (review rework — rejection finding 1)', () => {
  // The event channel narrates transitions WITHIN a battle step; mode resets
  // (returnToAttract, startRun) rebuild the world via initGame with no
  // closing narration. These scenarios pump the REAL frame sequence a game
  // produces through the full dispatch (events + continuous) and pin the
  // observable: once the reset lands, the warble is not running. They are
  // deliberately fix-agnostic — closing events at the reset or a
  // state-driven stop both satisfy them.
  const pump = (r: ReturnType<typeof recorder>, s: GameState, input: Input): void => {
    playEventSounds(r.audio, s.events)
    updateContinuousSounds(r.audio, s, input)
  }

  it('run ends while the visitor lives → the title screen must NOT warble', () => {
    // Arrive organically so the warble start flows through the pump itself.
    const boot = playing()
    let s: GameState = {
      ...boot,
      score: 2500,
      saucer: { ...boot.saucer, saucer: null, spawnWait: DT / 2 },
    }
    const r = recorder()
    let arrived = false
    for (let i = 0; i < 10 && !arrived; i++) {
      s = stepGame(s, NO_INPUT, DT)
      pump(r, s, NO_INPUT)
      arrived = s.saucer.saucer !== null
    }
    expect(arrived, 'staging: the visitor must arrive').toBe(true)
    expect(warbleRunning(r.calls), 'staging: the warble must be running mid-run').toBe(true)

    // Last tank, fatal shell one swept step out — the run ends this frame.
    s = {
      ...s,
      lives: 1,
      enemies: {
        ...s.enemies,
        shell: { x: s.player.x, z: s.player.z - 200, heading: 0, range: 0 },
      },
    }
    s = stepGame(s, NO_INPUT, DT)
    pump(r, s, NO_INPUT)
    expect(s.mode, 'staging: final death must land').toBe('gameover')
    expect(s.saucer.saucer?.phase, 'staging: the visitor outlives the player').toBe('alive')

    // Hold through the auto-cycle back to attract, pumping every frame. The
    // qualifying score now parks on the initials-entry screen between the
    // game-over card and attract (SH2-13), so ride the full no-input outer
    // bound (bz1-10: back to attract within 30 simulated seconds).
    for (let i = 0; i < Math.ceil(30 / DT) && s.mode !== 'attract'; i++) {
      s = stepGame(s, NO_INPUT, DT)
      pump(r, s, NO_INPUT)
    }
    expect(s.mode, 'staging: the cabinet must cycle home').toBe('attract')
    expect(s.saucer.saucer, 'staging: attract reboots with an empty field').toBeNull()
    expect(warbleRunning(r.calls), 'the title screen must not warble').toBe(false)
  })

  it('run STARTS while a demo visitor lives → the fresh run must not inherit the warble', () => {
    const r = recorder()
    r.audio.startLoop('saucer') // a demo-attract arrival already started the warble
    const boot = initGame(7)
    let s: GameState = {
      ...boot,
      saucer: {
        ...boot.saucer,
        saucer: { x: 200_000, z: 200_000, heading: 0, phase: 'alive' as const, phaseAge: 0 },
      },
    }
    s = stepGame(s, START, DT) // start wipes the battlefield via initGame
    pump(r, s, NO_INPUT)
    expect(s.mode, 'staging: the run must begin').toBe('playing')
    expect(s.saucer.saucer, 'staging: the fresh run boots with no visitor').toBeNull()
    expect(warbleRunning(r.calls), 'the new run must not inherit a phantom warble').toBe(false)
  })
})

describe('updateContinuousSounds — the track loop follows hostile liveness', () => {
  it('a live hostile keeps the track sound running', () => {
    const s = playing()
    expect(s.enemies.hostile.phase, 'staging: fresh runs boot a live hostile').toBe('alive')
    const r = recorder()
    updateContinuousSounds(r.audio, s, treads(0, 0))
    expect(r.calls).toContain('startLoop:track')
    expect(r.calls).not.toContain('stopLoop:track')
  })

  it('an exploding hostile stops the track — wreckage has no treads', () => {
    const s = playing()
    const wrecked: GameState = {
      ...s,
      enemies: {
        ...s.enemies,
        hostile: { ...s.enemies.hostile, phase: 'exploding' },
      },
    }
    const r = recorder()
    updateContinuousSounds(r.audio, wrecked, treads(0, 0))
    expect(r.calls).toContain('stopLoop:track')
    expect(r.calls).not.toContain('startLoop:track')
  })
})
