// plugins/missile-command/tests/mc8-4-fidelity.test.ts
//
// Story mc8-4 — RED phase (Tyr One-Handed / TEA). The ACs that ride surfaces that
// ALREADY EXIST, so this file LOADS today and its RED is visible at the assertion
// level (unlike mc8-4-event-wiring.test.ts, which module-load-fails on the not-yet-
// built playEdgeCues/droneSweep). Covers:
//   AC4  the LOW-on-ABMs launch cue (LO, SLOABM) — baseLow datum on the launch
//   AC6  descending ICBMs are SILENT (no incoming cue) — a GREEN regression guard
//   AC7  the stale "mc8-3" → mc8-4 comment fix in audio.ts
//
// §5 map + W3MAIN call sites:
//   docs/superpowers/specs/2026-08-07-missile-command-mc8-audio-driver-spike.md

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { playEventSounds } from '../src/shell/audio-dispatch.js'
import { fireFromKey } from '../src/shell/input.js'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
import type { SoundEvent } from '../src/core/sound-events.js'
import { MAXMIS } from '../src/core/field.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function recorder() {
  const calls: string[] = []
  return {
    calls,
    audio: {
      play: (name: string): void => void calls.push(`play:${name}`),
      startLoop: (name: string): void => void calls.push(`startLoop:${name}`),
      stopLoop: (name: string): void => void calls.push(`stopLoop:${name}`),
    },
  }
}

const play = (): GameState => createGame(1)

// ═══════════════════════════════════════════════════════════════════════════════
// AC4 — the LOW-on-ABMs launch cue (LO, SLOABM). W3MAIN:1385-1393:
//   LDA NMMISB / CMP I,4 / IFEQ → SLOABM ("LOW") ELSE SABLAU ; the DEC is AFTER.
// So the LOW warning fires on the launch taken while the base holds EXACTLY 4 rounds
// — a threshold-crossing warning (== 4), NOT a "<= 4" sustained state. baseLow is pure
// data on the launch; playEventSounds voices launched+baseLow as LO, else LA.
// ═══════════════════════════════════════════════════════════════════════════════
describe('mc8-4 AC4 — the LOW-on-ABMs launch cue (LO), NMMISB==4 (W3MAIN:1385)', () => {
  const withBaseAmmo = (idx: number, ammo: number): GameState => {
    const g = play()
    return { ...g, bases: g.bases.map((b, i) => (i === idx ? { ...b, ammo } : b)) }
  }
  const fireKey = ['z', 'x', 'c'] // base 0/1/2

  it('firing a base holding exactly 4 marks the launch baseLow (the SLOABM crossing)', () => {
    const after = fireFromKey(fireKey[0], withBaseAmmo(0, 4))
    const launched = after.soundEvents.find((e) => e.type === 'launched')
    expect(launched, 'a fire from an ammo>0 base must emit a launched event').toBeDefined()
    expect((launched as { baseLow?: boolean }).baseLow, 'NMMISB==4 → SLOABM (LOW)').toBe(true)
  })

  it('a full base (MAXMIS=10) launches NORMAL — baseLow is not set', () => {
    const after = fireFromKey(fireKey[0], withBaseAmmo(0, MAXMIS))
    const launched = after.soundEvents.find((e) => e.type === 'launched')
    expect((launched as { baseLow?: boolean }).baseLow ?? false).toBe(false)
  })

  it('the warning is the == 4 CROSSING, not a <= 4 state: 5 and 3 are NOT low (mutation guard)', () => {
    const at5 = fireFromKey(fireKey[1], withBaseAmmo(1, 5)).soundEvents.find((e) => e.type === 'launched')
    const at3 = fireFromKey(fireKey[1], withBaseAmmo(1, 3)).soundEvents.find((e) => e.type === 'launched')
    expect((at5 as { baseLow?: boolean }).baseLow ?? false, 'ammo 5 is above the crossing').toBe(false)
    expect((at3 as { baseLow?: boolean }).baseLow ?? false, 'ammo 3 is below the crossing').toBe(false)
  })

  it('playEventSounds voices launched+baseLow as the LOW cue, plain launched as LAUNCH', () => {
    const rLow = recorder()
    playEventSounds(rLow.audio, [{ type: 'launched', baseLow: true } as SoundEvent])
    expect(rLow.calls, 'LO — the low-launch cue, not the normal launch').toEqual(['play:low'])

    const rNorm = recorder()
    playEventSounds(rNorm.audio, [{ type: 'launched' }])
    expect(rNorm.calls, 'no baseLow → the normal LAUNCH cue').toEqual(['play:launch'])
  })

  it('an empty base still refuses to fire (NS klaxon) — LO does not replace the empty case', () => {
    const after = fireFromKey(fireKey[2], withBaseAmmo(2, 0))
    expect(after.soundEvents.map((e) => e.type)).toEqual(['ammoEmpty'])
    expect(after.abms.length, 'an empty base launches nothing').toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// AC6 — the no-incoming-ICBM regression guard (spike §5: the ROM has NO incoming/
// whistle cue; regular ICBM trails are SILENT). A GREEN guard — must pass now and stay
// green. Inventing an incoming cue would be a fidelity regression.
// ═══════════════════════════════════════════════════════════════════════════════
describe('mc8-4 AC6 — descending ICBMs are SILENT (no incoming cue, spike §5)', () => {
  it('a fresh game stepped without firing emits NO sound while ICBMs are airborne', () => {
    let g = play()
    const heard: string[] = []
    for (let i = 0; i < 15; i++) {
      g = stepGame(g) // ICBMs spawn and descend; no ABMs fired, no impacts this early
      for (const e of g.soundEvents) heard.push(e.type)
    }
    expect(heard, 'descending threats make no sound').toEqual([])
  })

  it('no wired SoundEvent voices an incoming/whistle/threat cue', () => {
    const oneOfEach: readonly SoundEvent[] = [
      { type: 'launched' },
      { type: 'detonated' },
      { type: 'icbmKilled' },
      { type: 'structureDestroyed' },
      { type: 'ammoEmpty' },
      { type: 'bonusTick' },
    ]
    const r = recorder()
    playEventSounds(r.audio, oneOfEach)
    for (const c of r.calls) expect(/incoming|whistle|threat/i.test(c)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// AC7 — the stale "mc8-3" forward-reference corrected. mc8-2 wrote that the parametric
// sweep "lands in mc8-3"; the renumber made that work THIS story (mc8-4).
// ═══════════════════════════════════════════════════════════════════════════════
describe('mc8-4 AC7 — the sweep is attributed to mc8-4, not the stale mc8-3', () => {
  const audioSrc = readFileSync(join(root, 'src', 'shell', 'audio.ts'), 'utf8')

  it('audio.ts no longer says the parametric sweep "lands in mc8-3"', () => {
    expect(/parametric[\s\S]{0,60}mc8-3/i.test(audioSrc), 'stale sweep→mc8-3 attribution').toBe(false)
    expect(/mc8-3[\s\S]{0,60}sweep/i.test(audioSrc), 'stale mc8-3→sweep attribution').toBe(false)
  })

  it('the drone comment now credits mc8-4 for the sweep', () => {
    expect(/sweep[\s\S]{0,60}mc8-4/i.test(audioSrc) || /mc8-4[\s\S]{0,60}sweep/i.test(audioSrc)).toBe(true)
  })
})
