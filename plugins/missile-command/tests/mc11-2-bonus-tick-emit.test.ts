// plugins/missile-command/tests/mc11-2-bonus-tick-emit.test.ts
//
// Story mc11-2 — RED phase (Tyr One-Handed / TEA). Wire the END-OF-WAVE bonus
// count-up cue (TK, SUNABM) into the pure sim. Today the 'between' resolve in
// game.ts pays the whole bonus as one lump `waveEndBonus(...)` and returns
// `soundEvents: []` — SILENT. The event kind (`bonusTick`) and the shell map
// (audio-dispatch → play('bonus-tick')) already exist end-to-end; only the CORE
// EMITTER is missing (sound-events.ts calls it "a filed follow-up"). This suite
// drives the REAL sim to the 'between' resolve frame and asserts the emitter
// produces one `bonusTick` per bonus UNIT tallied.
//
// ─── THE LOAD-BEARING ROM DERIVATION (W3MAIN.MAC, ENDWV2 :4277 + ENDWV4 :4463) ──
// The ROM's bonus count-up is TWO loops, each firing SUNABM once per PHYSICAL unit
// drawn on the bonus line — NOT once per point, and NOT scaled by the multiplier:
//   • ENDWV2 (:4277): loops once per UNUSED ABM — `SBC I,1` / `ERAABM` / `ABMADD`
//     (adds the per-missile points) / draw one ABM / `LDA I,SUNABM` `JSR SNDON`.
//     ⇒ one tick per unused missile.
//   • ENDWV4 (:4463): MISIND = # surviving cities; each pass erases a city,
//     `LDX I,3 / JSR ICMUL2` (4 ICBM pts/city), draws it, `LDA I,SUNABM` `JSR SNDON`,
//     `DEC MISIND`. ⇒ one tick per surviving city.
// So the TICK COUNT is:
//        N == survivingCities + unusedMissiles
// The wave multiplier (SMULTI) scales the POINTS added per tick (via ABMADD /
// ICMUL2), never the NUMBER of ticks. `waveEndBonus()` returns a POINT total — so
// an emitter that derives the count from the point total (e.g. one tick per point,
// or points/5) is WRONG. The count is a UNIT census, decoupled from the score.
//
// In-sim invariant: the 'between' beat is only entered via `nextWavePhase(cities)`,
// which returns 'over' (game-over) when every city is dead — so a real 'between'
// state ALWAYS has ≥1 surviving city. Every fixture below honours that.
//
// RED today: game.ts's 'between' branch returns `soundEvents: []`, so every count
// assertion below sees 0 `bonusTick` events and fails until GREEN wires the emitter.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createPlayGame, stepGame, type GameState } from '../src/core/game.js'
import type { SoundEvent } from '../src/core/sound-events.js'
import { NMISBA, MAXMIS, NCITY } from '../src/core/field.js'
import { scoreMultiplier } from '../src/core/score.js'

const bonusTicks = (events: readonly SoundEvent[]): SoundEvent[] => events.filter((e) => e.type === 'bonusTick')

/**
 * Build a 'between' resolve state: exactly `aliveCities` cities standing and every
 * (live) base carrying `ammoPerBase` ABMs, at wave `wave`. The screen is clear
 * (isWaveOver's post-condition), matching how stepGame enters the beat. Stepping
 * this once runs the game.ts 'between' branch — the frame the count-up fires.
 */
const betweenState = (
  aliveCities: number,
  ammoPerBase: number,
  wave = 1,
  seed = 1,
): GameState => {
  const base = createPlayGame(seed)
  return {
    ...base,
    phase: 'between',
    wave,
    cities: base.cities.map((c, i) => ({ ...c, alive: i < aliveCities })),
    bases: base.bases.map((b) => ({ ...b, alive: true, ammo: ammoPerBase })),
    icbms: [],
    abms: [],
    explosions: [],
    sputniks: [],
  }
}

// The count-up TICK count for a given fixture, straight from the ROM derivation.
const expectedTicks = (aliveCities: number, ammoPerBase: number): number =>
  aliveCities + NMISBA * ammoPerBase

// ─── AC1: the 'between' resolve is no longer SILENT — it emits bonusTick ──────
describe('mc11-2 AC1 — the between resolve emits the bonus count-up cue (was soundEvents:[])', () => {
  it('a resolved bonus frame carries at least one bonusTick (the lump [] is gone)', () => {
    const resolved = stepGame(betweenState(2, 0))
    expect(resolved.phase, "staging: the between beat resolved to 'play'").toBe('play')
    expect(bonusTicks(resolved.soundEvents).length).toBeGreaterThan(0)
  })

  it('every emitted bonus event is exactly {type:"bonusTick"} — no other kind is invented', () => {
    const resolved = stepGame(betweenState(6, 10))
    const ticks = bonusTicks(resolved.soundEvents)
    expect(ticks.length, 'staging: the count-up must actually emit events to check their shape').toBeGreaterThan(0)
    for (const e of ticks) {
      expect(e).toEqual({ type: 'bonusTick' })
    }
  })
})

// ─── AC2: ONE tick per bonus UNIT — count === survivingCities + unusedMissiles ─
describe('mc11-2 AC2 — the bonusTick count equals the units paid (cities + unused missiles)', () => {
  // Each row: [aliveCities, ammoPerBase]. Expected N derived from the ROM, not baked.
  const cases: ReadonlyArray<readonly [number, number]> = [
    [1, 0], // 1 city,  0 ABMs  → 1
    [6, 0], // 6 cities, 0 ABMs  → 6
    [1, 10], // 1 city, full mags → 1 + 30 = 31
    [2, 1], // 2 cities, 3 ABMs  → 2 + 3 = 5
    [6, 10], // everything saved  → 6 + 30 = 36
  ]
  for (const [cities, ammo] of cases) {
    const N = expectedTicks(cities, ammo)
    it(`${cities} cities + ${NMISBA}×${ammo} unused ABMs ⇒ exactly ${N} bonusTick events`, () => {
      const resolved = stepGame(betweenState(cities, ammo))
      expect(bonusTicks(resolved.soundEvents).length).toBe(N)
    })
  }

  it('the count is a UNIT census, not the point total — 1 saved city is 1 tick, NEVER 100', () => {
    // 1 city, no unused ABMs: the ROM draws ONE city on the bonus line ⇒ ONE SUNABM,
    // while the SCORE rises by 100 (=4×25). A per-point emitter would fire 100 ticks.
    const resolved = stepGame(betweenState(1, 0))
    expect(resolved.score, 'staging: the lump bonus is still credited (4×25)').toBe(100)
    expect(bonusTicks(resolved.soundEvents).length).toBe(1)
  })
})

// ─── AC: BOTH count-up loops contribute (ENDWV4 cities AND ENDWV2 missiles) ────
describe('mc11-2 — both halves of the count-up are wired, one tick per drawn unit', () => {
  it('cities-only (all magazines empty): ticks === surviving-city count', () => {
    const resolved = stepGame(betweenState(4, 0))
    expect(bonusTicks(resolved.soundEvents).length).toBe(4)
  })

  it('adding ABMs adds exactly one tick each — 30 more ABMs ⇒ 30 more ticks', () => {
    // Hold the city count fixed and vary only ammo: the delta isolates the ENDWV2
    // (unused-missile) half. 3 bases × (10−0) = 30 extra units ⇒ 30 extra ticks.
    const empty = bonusTicks(stepGame(betweenState(1, 0)).soundEvents).length
    const full = bonusTicks(stepGame(betweenState(1, 10)).soundEvents).length
    expect(full - empty).toBe(NMISBA * MAXMIS)
    expect(full - empty).toBe(30)
  })

  it('one extra unused ABM is worth 5 points but exactly ONE tick (unit, not points)', () => {
    // One base goes from 0→1 ABM: +5 score, +1 tick. A points/5 emitter would agree
    // here by luck, but a per-point emitter would fire 5. Pinned against both.
    const zero = stepGame(betweenState(1, 0))
    const one = stepGame({
      ...betweenState(1, 0),
      bases: createPlayGame(1).bases.map((b, i) => ({ ...b, alive: true, ammo: i === 0 ? 1 : 0 })),
    })
    expect(one.score - zero.score, 'staging: one unused ABM is +5 points').toBe(5)
    expect(bonusTicks(one.soundEvents).length - bonusTicks(zero.soundEvents).length).toBe(1)
  })
})

// ─── Rework r1 (Heimdall): dead-base exclusion + the N=0 census floor ─────────
// Two mutation-proven gaps from review round 1. Both PASS on the correct code and
// KILL a real mutant: dropping the `b.alive` ammo guard, and flooring the emitted
// length at 1 (`Math.max(N,1)`). Each is on the story's central claim — the count.
describe('mc11-2 (rework r1) — a destroyed base contributes no ticks, and N can be 0', () => {
  it('a DESTROYED base with loaded ABMs is excluded — only LIVE bases count (game.ts b.alive guard)', () => {
    // 2 cities; two live bases at 10 ABMs + one DEAD base still holding 7. The ROM's
    // ENDWV2 tallies only ABMs at a LIVE base — a destroyed base's magazine is gone.
    // ticks = 2 cities + (10+10) live ABMs = 22, NOT 2 + (10+10+7) = 29.
    const base = createPlayGame(1)
    const g: GameState = {
      ...base,
      phase: 'between',
      cities: base.cities.map((c, i) => ({ ...c, alive: i < 2 })),
      bases: base.bases.map((b, i) =>
        i === 2 ? { ...b, alive: false, ammo: 7 } : { ...b, alive: true, ammo: 10 },
      ),
      icbms: [],
      abms: [],
      explosions: [],
      sputniks: [],
    }
    const ticks = bonusTicks(stepGame(g).soundEvents).length
    expect(ticks, 'only the two LIVE bases (10+10) plus 2 cities count').toBe(22)
    expect(ticks, "the dead base's 7 ABMs must NOT be tallied").not.toBe(29)
  })

  it('a zero-bonus resolve emits exactly ZERO ticks — the census floor is 0, not 1', () => {
    // No survivors, no ammo ⇒ N=0. Array.from({length:0}) is []. Pins the lower
    // boundary against an "always emit at least one tick" (Math.max(N,1)) bug.
    // Constructed directly: real play cannot reach 0 cities in 'between'
    // (nextWavePhase returns 'over'), but the emitter must still floor at 0.
    const resolved = stepGame(betweenState(0, 0))
    expect(bonusTicks(resolved.soundEvents).length).toBe(0)
  })
})

// ─── AC (ROM fidelity): the tick COUNT is independent of the wave multiplier ──
describe('mc11-2 — the count-up length does not scale with the wave multiplier', () => {
  it('same 3 cities + 6 ABMs ⇒ 9 ticks at wave 1 AND at wave 10 (SMULTI scales points, not ticks)', () => {
    // Observe that the two waves genuinely DIFFER in multiplier, so equal tick counts
    // is a real non-dependence — not merely "wave never mattered anywhere".
    expect(scoreMultiplier(10)).toBeGreaterThan(scoreMultiplier(1))
    const early = bonusTicks(stepGame(betweenState(3, 2, 1)).soundEvents).length
    const late = bonusTicks(stepGame(betweenState(3, 2, 10)).soundEvents).length
    const N = expectedTicks(3, 2) // 3 + 3×2 = 9
    expect(early).toBe(N)
    expect(late).toBe(N)
    expect(early).toBe(late)
  })
})

// ─── AC: the count-up is a ONE-SHOT on the resolve frame, not sticky ──────────
describe('mc11-2 — bonusTick fires only on the resolve frame', () => {
  it('the frame AFTER the resolve (now play) emits no bonusTick — the channel is rebuilt', () => {
    const resolved = stepGame(betweenState(6, 10))
    expect(bonusTicks(resolved.soundEvents).length).toBeGreaterThan(0)
    expect(resolved.phase).toBe('play')
    const after = stepGame(resolved)
    expect(after.soundEvents.map((e) => e.type)).not.toContain('bonusTick')
  })

  it('the bonus census is seed-INDEPENDENT — same cities/ammo, different seeds, identical stream', () => {
    // The census reads cities.alive and bases.ammo, never state.rng — so two DIFFERENT
    // seeds must yield the identical bonusTick stream. (A stray Math.random() would
    // break this; the same-seed-twice form could not.)
    const s1 = stepGame(betweenState(4, 7, 3, 1)).soundEvents.map((e) => e.type)
    const s2 = stepGame(betweenState(4, 7, 3, 999)).soundEvents.map((e) => e.type)
    expect(s2).toEqual(s1)
    expect(s1.length).toBe(expectedTicks(4, 7)) // 4 + 3×7 = 25, all bonusTick
    expect(s1.every((t) => t === 'bonusTick')).toBe(true)
  })
})

// ─── AC3: the "filed follow-up" note is struck from sound-events.ts ───────────
describe('mc11-2 AC3 — sound-events.ts no longer calls the emitter a filed follow-up', () => {
  const SRC = readFileSync(
    fileURLToPath(new URL('../src/core/sound-events.ts', import.meta.url)),
    'utf8',
  )

  it('the "Emitter is a filed follow-up" note is removed (the emitter now exists)', () => {
    // The comment claimed the emitter was unwired; wiring it makes the note false.
    expect(SRC).not.toMatch(/filed follow-?up/i)
  })

  it('the BonusTickEvent kind itself is preserved (the note went, the type stayed)', () => {
    // Guard the removal from over-reaching: dispatch + this suite both need the type.
    expect(SRC).toMatch(/interface\s+BonusTickEvent/)
    expect(SRC).toMatch(/type:\s*'bonusTick'/)
  })
})

// Sanity on the fixtures themselves (not the feature): the ROM census helper and
// the board shape agree, so a wrong fixture can't quietly pass a wrong emitter.
describe('mc11-2 — fixture sanity', () => {
  it('the board is 6 cities and 3 bases of 10 (fixtures span the real range)', () => {
    expect(NCITY).toBe(6)
    expect(NMISBA).toBe(3)
    expect(MAXMIS).toBe(10)
  })
})
