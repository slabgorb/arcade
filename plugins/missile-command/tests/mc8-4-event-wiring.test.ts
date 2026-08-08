// plugins/missile-command/tests/mc8-4-event-wiring.test.ts
//
// Story mc8-4 — RED phase (Tyr One-Handed / TEA). "Parametric drones + full event
// wiring." This file holds the ACs that need surfaces NOT YET BUILT — so its RED
// signal is a module-load failure (`playEdgeCues`, `core/drone`) plus the assertions
// below, the battlezone bz1-11 idiom mc8-2 used. The ACs that ride EXISTING surfaces
// (AC4 baseLow, AC6 no-ICBM guard, AC7 comment-fix) live in mc8-4-fidelity.test.ts,
// which LOADS today so its assertion-level RED is visible.
//
// Authoritative scope = spike doc §8 + §5 map (not the story title):
//   docs/superpowers/specs/2026-08-07-missile-command-mc8-audio-driver-spike.md
//   WP whoop (edge wave++) · XX end-game (edge phase→over) · BN bonus-city (edge
//   bonusCitiesEarned++) · drone AUDF1+6 sweep (VOICE here; LIVE TRIGGER → mc8-5/mc5).
//
// The 'between' and 'over' branches of stepGame BOTH hardcode soundEvents:[], so
// whoop/end-game/bonus-city cannot ride a per-frame SoundEvent — they are read off the
// pure-state EDGE by a new `playEdgeCues(audio, prev, curr)` (the user ruling's
// "edge-detect on pure state", Option A 2026-08-08).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { playEdgeCues } from '../src/shell/audio-dispatch.js'
import { createGame, type GameState } from '../src/core/game.js'
import { bonusInterval } from '../src/core/wave.js'
import { droneSweep, type DroneKind } from '../src/core/drone.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** A recording fake of the audio surface — captures every call, in order. (mc8-2 idiom.) */
function recorder() {
  const calls: string[] = []
  return {
    calls,
    audio: {
      play(name: string): void {
        calls.push(`play:${name}`)
      },
      startLoop(name: string): void {
        calls.push(`startLoop:${name}`)
      },
      stopLoop(name: string): void {
        calls.push(`stopLoop:${name}`)
      },
    },
  }
}

const play = (): GameState => createGame(1) // phase 'play', wave 1, score 0

// ═══════════════════════════════════════════════════════════════════════════════
// AC1 — WHOOP on wave advance (WP, SNEWAV, W3MAIN:3911; edge: wave++)
// ═══════════════════════════════════════════════════════════════════════════════
describe('mc8-4 AC1 — WHOOP on wave advance', () => {
  it('a wave increment plays the whoop cue exactly once', () => {
    const r = recorder()
    const prev = play()
    playEdgeCues(r.audio, prev, { ...prev, wave: prev.wave + 1 })
    expect(r.calls.filter((c) => c === 'play:whoop')).toHaveLength(1)
  })

  it('a same-wave frame plays NO whoop (edge, not level — mutation guard)', () => {
    const r = recorder()
    const s = play()
    playEdgeCues(r.audio, s, { ...s, frame: s.frame + 1 })
    expect(r.calls).not.toContain('play:whoop')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// AC2 — END-GAME on the game-over edge (XX, SENDGA, W3MAIN:4647; edge: phase→over)
// ═══════════════════════════════════════════════════════════════════════════════
describe('mc8-4 AC2 — END-GAME on the game-over edge', () => {
  const over = (base: GameState): GameState => ({
    ...base,
    phase: 'over',
    cities: base.cities.map((c) => ({ ...c, alive: false })),
  })

  it('the play→over transition plays the end-game cue', () => {
    const r = recorder()
    const prev = play()
    playEdgeCues(r.audio, prev, over(prev))
    expect(r.calls.filter((c) => c === 'play:end-game')).toHaveLength(1)
  })

  it('a subsequent over→over frame does NOT replay it (fires once, not every frame)', () => {
    const r = recorder()
    const dead = over(play())
    playEdgeCues(r.audio, dead, { ...dead, frame: dead.frame + 1 })
    expect(r.calls).not.toContain('play:end-game')
  })

  it('the between-wave beat is NOT game over — no end-game cue', () => {
    const r = recorder()
    const s = play()
    playEdgeCues(r.audio, s, { ...s, phase: 'between' })
    expect(r.calls).not.toContain('play:end-game')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// AC3 — BONUS-CITY on award (BN, SBONUS, W3MAIN:4845; edge: bonusCitiesEarned++)
// ═══════════════════════════════════════════════════════════════════════════════
describe('mc8-4 AC3 — BONUS-CITY on award', () => {
  const interval = bonusInterval(0) // shipped default DIP: 10,000 pts / city (mc4-5)

  it('crossing a bonus threshold plays the bonus-city cue once', () => {
    const r = recorder()
    const prev = { ...play(), score: interval - 1 }
    playEdgeCues(r.audio, prev, { ...prev, score: interval + 1 })
    expect(r.calls.filter((c) => c === 'play:bonus-city')).toHaveLength(1)
  })

  it('a score gain WITHIN the same bucket plays NO bonus-city cue (mutation guard)', () => {
    const r = recorder()
    const prev = { ...play(), score: interval + 1 }
    playEdgeCues(r.audio, prev, { ...prev, score: interval + 500 })
    expect(r.calls).not.toContain('play:bonus-city')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// AC5 — the PARAMETRIC drone VOICE. W3SOUN PMRBIL (§2.4): sweep AUDF1+6 between per-
// type TOP/BOTTOM, −2 per frame, WRAPPING. 1=Sputnik, 2=Cruise, 3=both. Pure/
// deterministic so node needs no AudioContext; the constant VALUES are checked by the
// citation gate (citations.test.ts scans src/core), here we pin the MECHANISM
// radix-independently. The LIVE TRIGGER (CRMONS gate) is mc8-5, not this test.
// ═══════════════════════════════════════════════════════════════════════════════
describe('mc8-4 AC5 — the parametric drone pitch sweep (PMRBIL, W3SOUN:329-355)', () => {
  const cycle = (kind: DroneKind, n = 400): number[] =>
    Array.from({ length: n }, (_, f) => droneSweep(f, kind))

  it('is a pure deterministic function of (frame, kind)', () => {
    expect(droneSweep(37, 'sputnik')).toBe(droneSweep(37, 'sputnik'))
  })

  for (const kind of ['sputnik', 'cruise', 'both'] as const) {
    it(`${kind}: starts at TOP; every step is −2 or a wrap to TOP; stays in [BOTTOM,TOP]`, () => {
      const seq = cycle(kind)
      const top = Math.max(...seq)
      const bottom = Math.min(...seq)
      expect(seq[0], 'the sweep starts at TOP').toBe(top)
      expect(top - bottom, 'a real sweep spans a positive range').toBeGreaterThan(0)
      expect((top - bottom) % 2, 'TOP and BOTTOM are an even number of −2 steps apart').toBe(0)
      for (let i = 1; i < seq.length; i++) {
        const descended = seq[i] === seq[i - 1] - 2
        const wrapped = seq[i - 1] <= bottom && seq[i] === top
        expect(descended || wrapped, `frame ${i}: −2 descent or wrap-to-top`).toBe(true)
        expect(seq[i] >= bottom && seq[i] <= top, `frame ${i}: within [BOTTOM, TOP]`).toBe(true)
      }
    })
  }

  it('the sweep is per-type — Sputnik and Cruise do not share bounds (W3SOUN:354)', () => {
    const s = cycle('sputnik')
    const c = cycle('cruise')
    const differs = Math.max(...s) !== Math.max(...c) || Math.min(...s) !== Math.min(...c)
    expect(differs, 'BOTTOM/TOP are indexed 1=Sputnik/2=Cruise').toBe(true)
  })

  it('actually MOVES — not a constant (guards a stub returning one value)', () => {
    expect(new Set(cycle('sputnik')).size).toBeGreaterThan(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Reachability (source-text, the mc8-2 audio-engine idiom): node cannot observe the
// live feed, so prove the new seams are WIRED in source.
// ═══════════════════════════════════════════════════════════════════════════════
describe('mc8-4 — the new seams are wired into the frame loop', () => {
  const mainSrc = readFileSync(join(root, 'src', 'main.ts'), 'utf8')
  const audioSrc = readFileSync(join(root, 'src', 'shell', 'audio.ts'), 'utf8')

  it('main.ts drives the edge cues (whoop/end-game/bonus-city) each frame', () => {
    expect(mainSrc, 'main.ts must call playEdgeCues(prev, curr)').toMatch(/playEdgeCues\s*\(/)
  })

  it('the shell engine consumes the parametric drone sweep', () => {
    expect(audioSrc, 'audio.ts must drive the drone from droneSweep').toMatch(/droneSweep/)
  })
})
