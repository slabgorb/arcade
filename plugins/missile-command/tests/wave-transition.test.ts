// plugins/missile-command/tests/wave-transition.test.ts
//
// Story mc4-2 — RED phase (Tyr One-Handed / TEA). The end-of-wave transition as
// PURE core reducers: wave-end detection, the city bonus + unused-missile bonus
// tally, city regeneration up to the cap, ammo refill, and the wave-advance /
// between-wave phase beat. mc4-1 shipped the difficulty SCHEDULE (waveSchedule);
// this story adds the RESOLUTION that runs when a wave's budget is spent and the
// screen is clear.
//
// ─── SCOPE BOUNDARY (from the mc4 epic YAML; mirrors mc4-1's stepIcbm precedent) ─
//   • mc4-2 (HERE): the PURE reducers in wave.ts / state.ts, at the BASE score
//     multiplier. It does NOT touch game.ts / GameState.
//   • mc4-3: the per-wave score MULTIPLIER (scoreKills × wave, capped MAXMUL) and
//     the bonus-city AWARD at a score threshold. So the bonus values pinned here
//     are the wave-1 / 1× base values; the ramp is mc4-3's.
//   • mc4-4: WIRES these reducers into stepGame and adds GameState.wave/multiplier
//     + the HUD readout + the seeded multi-wave playthrough. (mc4-1 deferred the
//     spawner wiring the same way — this file pins the units mc4-4 will compose.)
//
// ─── GROUND TRUTH (REV-01; W3MAIN inherits `.RADIX 16`, trailing '.' = DECIMAL) ─
//   END OF WAVE runs as five phases dispatched off a jump table (W3MAIN.MAC:591-599
//   `.WORD ENDWV1..ENDWV5-1`):
//     ENDWV1 (:4149)  clean up ICBMs, clear the BONUS accumulator (CLRTRI).
//     ENDWV2 (:4209)  "TALLY UP BONUS PTS FOR UNUSED ABMS" — for each ABM still in
//                     a magazine, `JSR ABMADD`. ABMADD (:5443) adds `LDA I,5`
//                     (:5451) once per SMULTI, so an unused ABM is worth 5 × SMULTI;
//                     at the base multiplier that is 5 points / unused missile.
//     ENDWV3/4 (:4325/:4387) CITY BONUS — for each surviving city, `LDX I,3` (:4423,
//                     comment "4 ICBM POINTS/CITY") then `JSR ICMUL2`. ICMUL2 (:5411)
//                     loops on `MIEND` (BPL, X≥0), so LDX I,3 runs FOUR times, adding
//                     the per-ICBM value ICBPT (= ICBM_KILL_POINTS at base) four
//                     times: a saved city is worth 4 × 25 = 100 points at 1×.
//     ENDWV5 (:4505)  UPSCOR the bonus into the score, `JSR REGEN` (regenerate
//                     cities), then — only if a life/city remains — `INC WAVENO`
//                     (next wave). If no city/life remains the game ends (C5HI).
//   REGEN (:4777) sets X = min(PLIVES, NCITY) (`CPX I,NCITY / IFCS / LDX I,NCITY`),
//     subtracts the living cities, and regenerates that many DEAD cities. i.e. it
//     brings the board UP TO an entitlement, capped at NCITY. The entitlement
//     (PLIVES / bonus cities) is fed by mc4-3's CHEKBO award; mc4-2 owns the PATH
//     and the NCITY cap and takes the entitlement as `reserve`. Bases are never in
//     REGEN — a destroyed base stays destroyed (only its ammo refills, ENDWV / SETUP).
//
//   Existing claims cover the reused constants: MC-NCITY (=6, the cap, field.json),
//   MC-MAXMIS (=10, full ammo, field.json), MC-ICBPTS (=25, score.json). The two
//   NEW byte-exact constants Dev must claim in GREEN:
//     • 4  — CITY bonus units, W3MAIN.MAC:4423  `\tLDX I,3\t\t\t;4 ICBM POINTS/CITY`
//     • 5  — unused-ABM points, W3MAIN.MAC:5451 `\tLDA I,5`  (inside ABMADD)
//   Cite each at its PHYSICAL line (the byte-checker keys on the physical line, per
//   the citations-source / spawn-claims convention mc4-1 established).
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
//   wave.ts / state.ts exist but export none of these reducers yet; each loader
//   below throws a self-describing spec message until GREEN adds the export. The
//   variable specifier + `/* @vite-ignore */` + Partial<> keeps `tsc --noEmit`
//   green while the exports are still absent (the field/icbm/damage.test.ts idiom).
//   Purity is auto-guarded by the src/core sweep the moment the code lands; the
//   citation gate auto-scans the new `4`/`5` literals — so those AC4 clauses need
//   no assertion here (mc4-1's wave-claims precedent). This file pins the BEHAVIOUR
//   and the EXACT bonus/cap/ammo VALUES — the mc4-1 review's hard lesson was that
//   relative-only assertions let two wrong formulae ship green.

import { describe, it, expect } from 'vitest'
import { createCities, createBases, MAXMIS, NCITY, type City, type Base } from '../src/core/field.js'
import { waveSchedule } from '../src/core/wave.js'
import { ICBM_KILL_POINTS } from '../src/core/score.js'

// ═════════════════════════════════════════════════════════════════════════════
// The contract GREEN (Loki / Dev) implements. Two modules; loaded dynamically so
// tsc stays green while the exports are still absent.
// ═════════════════════════════════════════════════════════════════════════════

interface WaveModule {
  /** Combined end-of-wave bonus at the BASE multiplier: surviving cities × 100
   *  (= 4 × ICBM_KILL_POINTS) + unused missiles × 5. */
  waveEndBonus: (survivingCities: number, unusedMissiles: number) => number
  /** True iff the wave's ICBM budget is spent AND no enemy is left on screen. */
  isWaveOver: (remaining: number, icbms: readonly unknown[]) => boolean
  /** Every LIVE base refilled to MAXMIS ammo; dead bases untouched (stay dead). */
  refillAmmo: (bases: readonly Base[]) => readonly Base[]
  /** Revive dead cities until the living count reaches min(reserve, cap=NCITY).
   *  Never exceeds the cap, never removes a living city, and is deterministic. */
  regenerateCities: (cities: readonly City[], reserve: number, cap?: number) => readonly City[]
  /** The next wave's ICBM budget, re-seeded from the mc4-1 schedule. */
  nextWaveBudget: (wave: number) => number
}

type Phase = 'play' | 'between' | 'over'
interface StateModule {
  /** At a confirmed wave-end: 'over' if every city is dead, else the between beat. */
  nextWavePhase: (cities: readonly City[]) => Phase
  /** Leave the between beat for the next wave; 'over' is terminal, 'play' unchanged. */
  resumePlay: (phase: Phase) => Phase
}

const WAVE_SPECIFIER = '../src/core/wave.js'
const STATE_SPECIFIER = '../src/core/state.js'

const WAVE_FNS = ['waveEndBonus', 'isWaveOver', 'refillAmmo', 'regenerateCities', 'nextWaveBudget'] as const
const STATE_FNS = ['nextWavePhase', 'resumePlay'] as const

async function loadWave(): Promise<WaveModule> {
  try {
    const mod = (await import(/* @vite-ignore */ WAVE_SPECIFIER)) as Partial<WaveModule>
    const missing = WAVE_FNS.filter((f) => typeof mod[f] !== 'function')
    if (missing.length > 0) throw new Error(`wave.ts missing export(s): ${missing.join(', ')}`)
    return mod as WaveModule
  } catch (e) {
    throw new Error(
      'wave-transition core not built yet — GREEN (Loki) adds to src/core/wave.ts these PURE reducers: ' +
        'waveEndBonus(survivingCities, unusedMissiles) = survivingCities × (4 × ICBM_KILL_POINTS) + ' +
        'unusedMissiles × 5 (cite 4 at W3MAIN.MAC:4423 "4 ICBM POINTS/CITY", 5 at W3MAIN.MAC:5451 in ' +
        'ABMADD; reuse MC-ICBPTS); isWaveOver(remaining, icbms) = remaining===0 && icbms.length===0; ' +
        'refillAmmo(bases) sets every LIVE base to MAXMIS ammo and leaves dead bases untouched; ' +
        'regenerateCities(cities, reserve, cap=NCITY) revives dead cities until the living count reaches ' +
        'min(reserve, cap), never over the cap, never removing a live city, deterministically (the mc4-3 ' +
        'bonus-city award feeds `reserve`); nextWaveBudget(wave) = waveSchedule(wave + 1).count. ' +
        `No clock, no entropy, no shell import. (${(e as Error).message})`,
    )
  }
}

async function loadState(): Promise<StateModule> {
  try {
    const mod = (await import(/* @vite-ignore */ STATE_SPECIFIER)) as Partial<StateModule>
    const missing = STATE_FNS.filter((f) => typeof mod[f] !== 'function')
    if (missing.length > 0) throw new Error(`state.ts missing export(s): ${missing.join(', ')}`)
    return mod as StateModule
  } catch (e) {
    throw new Error(
      'between-wave phase beat not built yet — GREEN (Loki) extends src/core/state.ts: ' +
        "Phase gains a 'between' member; nextWavePhase(cities) returns 'over' when allCitiesDead(cities) " +
        "(game-over still wins at wave-end), else 'between'; resumePlay(phase) maps 'between'→'play', " +
        "leaves 'over' terminal and 'play' unchanged. Pure logic, no new numeric constant. " +
        `(${(e as Error).message})`,
    )
  }
}

// ─── fixtures from the REAL field model (mc3-1's field.ts), not look-alikes ────
const cities = (): readonly City[] => createCities()
const bases = (): readonly Base[] => createBases()
const killCities = (cs: readonly City[], ...idx: number[]): readonly City[] =>
  cs.map((c, i) => (idx.includes(i) ? { ...c, alive: false } : c))
const allCitiesDead = (): readonly City[] => cities().map((c) => ({ ...c, alive: false }))
const aliveCount = (cs: readonly City[]): number => cs.filter((c) => c.alive).length

// A full magazine across the three bases = NMISBA(3) × MAXMIS(10) = 30 unused ABMs.
// Derived from field.ts constants, never a fresh literal.
const NMISSILES_FULL = 3 * MAXMIS

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — a wave ends ONLY when the budget is spent AND no enemy remains on screen.
// (isWaveOver is the pure predicate mc4-4 will gate the resolution on.)
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-2 AC1 — wave-end detection: budget spent AND screen clear', () => {
  it('budget spent (remaining 0) and no ICBMs on screen ⇒ wave over', async () => {
    const { isWaveOver } = await loadWave()
    expect(isWaveOver(0, [])).toBe(true)
  })

  it('budget still owing (remaining > 0) is NOT wave-over even with an empty screen', async () => {
    const { isWaveOver } = await loadWave()
    expect(isWaveOver(3, [])).toBe(false)
  })

  it('an enemy still on screen is NOT wave-over even with the budget spent', async () => {
    const { isWaveOver } = await loadWave()
    expect(isWaveOver(0, [{ id: 'icbm' }])).toBe(false)
  })

  it('both conditions unmet (owing AND enemies present) is not wave-over', async () => {
    const { isWaveOver } = await loadWave()
    expect(isWaveOver(5, [{ id: 'a' }, { id: 'b' }])).toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — the between-wave beat, and game-over still wins at wave-end.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-2 AC1 — between-wave phase beat', () => {
  it("a wave-end with survivors enters the 'between' beat", async () => {
    const { nextWavePhase } = await loadState()
    expect(nextWavePhase(cities())).toBe('between')
  })

  it("a wave-end with a lone survivor still enters 'between' (not over)", async () => {
    const { nextWavePhase } = await loadState()
    expect(nextWavePhase(killCities(cities(), 0, 1, 2, 3, 4))).toBe('between')
  })

  it("game-over WINS at wave-end: every city dead ⇒ 'over', never 'between'", async () => {
    const { nextWavePhase } = await loadState()
    expect(nextWavePhase(allCitiesDead())).toBe('over')
  })

  it("resumePlay leaves the between beat for the next wave: 'between' → 'play'", async () => {
    const { resumePlay } = await loadState()
    expect(resumePlay('between')).toBe('play')
  })

  it("resumePlay keeps 'over' terminal — a resumed wave never revives a lost game", async () => {
    const { resumePlay } = await loadState()
    expect(resumePlay('over')).toBe('over')
  })

  it("resumePlay leaves an ordinary 'play' phase unchanged", async () => {
    const { resumePlay } = await loadState()
    expect(resumePlay('play')).toBe('play')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — the end-of-wave bonus: per-city 100 (=4×25) and per-missile 5, additive,
//        zero on an empty tally. EXACT values (the mc4-1 relative-only lesson).
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-2 AC2 — city + unused-missile bonus', () => {
  it('one surviving city is worth exactly 100 points (4 × ICBM_KILL_POINTS at base)', async () => {
    const { waveEndBonus } = await loadWave()
    expect(waveEndBonus(1, 0)).toBe(100)
    expect(waveEndBonus(1, 0)).toBe(4 * ICBM_KILL_POINTS) // documents the ROM derivation (ICMUL2 ×4)
  })

  it('one unused missile is worth exactly 5 points', async () => {
    const { waveEndBonus } = await loadWave()
    expect(waveEndBonus(0, 1)).toBe(5)
  })

  it('no survivors and no unused missiles adds exactly zero', async () => {
    const { waveEndBonus } = await loadWave()
    expect(waveEndBonus(0, 0)).toBe(0)
  })

  it('all six cities saved is 600; a full three-base magazine (30 ABMs) is 150', async () => {
    const { waveEndBonus } = await loadWave()
    expect(waveEndBonus(NCITY, 0)).toBe(600)
    expect(waveEndBonus(0, NMISSILES_FULL)).toBe(150) // 3 bases × MAXMIS = 30 unused → 30 × 5
  })

  it('the two bonuses are additive: 2 cities + 3 missiles = 200 + 15 = 215', async () => {
    const { waveEndBonus } = await loadWave()
    expect(waveEndBonus(2, 3)).toBe(215)
  })

  it('scales linearly per unit — 4 cities is exactly four single-city bonuses', async () => {
    const { waveEndBonus } = await loadWave()
    expect(waveEndBonus(4, 0)).toBe(4 * waveEndBonus(1, 0))
    expect(waveEndBonus(0, 7)).toBe(7 * waveEndBonus(0, 1))
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — regenerate cities up to the cap; refill live bases; dead bases stay dead.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-2 AC3 — city regeneration up to the cap', () => {
  it('with reserve to spare, three destroyed cities all come back (board returns to 6)', async () => {
    const { regenerateCities } = await loadWave()
    const out = regenerateCities(killCities(cities(), 0, 1, 2), NCITY)
    expect(aliveCount(out)).toBe(6)
  })

  it('never exceeds the NCITY cap even with a huge reserve — a full board stays at six', async () => {
    const { regenerateCities } = await loadWave()
    const out = regenerateCities(allCitiesDead(), 100)
    expect(aliveCount(out)).toBe(NCITY)
    expect(aliveCount(out)).toBe(6)
  })

  it('regeneration is bounded by the reserve: reserve 4 over a dead board revives exactly four', async () => {
    const { regenerateCities } = await loadWave()
    const out = regenerateCities(allCitiesDead(), 4)
    expect(aliveCount(out)).toBe(4)
  })

  it('a zero reserve regenerates nothing — survivors are untouched, no free city', async () => {
    const { regenerateCities } = await loadWave()
    const before = killCities(cities(), 0, 1, 2) // 3 alive
    const out = regenerateCities(before, 0)
    expect(aliveCount(out)).toBe(3)
  })

  it('never removes a living city (regeneration only resurrects — the anti-cull guard)', async () => {
    const { regenerateCities } = await loadWave()
    const before = cities() // all six alive
    const out = regenerateCities(before, 6)
    expect(aliveCount(out)).toBe(6)
    // every originally-live city is still live
    before.forEach((c, i) => {
      if (c.alive) expect(out[i].alive).toBe(true)
    })
  })

  it('is deterministic — identical inputs regenerate identically (AC4 determinism)', async () => {
    const { regenerateCities } = await loadWave()
    const dead = allCitiesDead()
    expect(regenerateCities(dead, 4)).toEqual(regenerateCities(dead, 4))
  })

  it('preserves each city POSITION — regeneration flips alive, it does not relocate', async () => {
    const { regenerateCities } = await loadWave()
    const src = cities()
    const out = regenerateCities(killCities(src, 1, 3), NCITY)
    out.forEach((c, i) => expect(c.pos).toEqual(src[i].pos))
  })
})

describe('mc4-2 AC3 — ammo refill, and dead bases stay dead', () => {
  it('every live base refills to a full MAXMIS magazine', async () => {
    const { refillAmmo } = await loadWave()
    const spent = bases().map((b) => ({ ...b, ammo: 3 }))
    const out = refillAmmo(spent)
    out.forEach((b) => expect(b.ammo).toBe(MAXMIS))
  })

  it('an already-full base stays full (idempotent, never over MAXMIS)', async () => {
    const { refillAmmo } = await loadWave()
    const out = refillAmmo(bases()) // fresh bases already at MAXMIS
    out.forEach((b) => expect(b.ammo).toBe(MAXMIS))
  })

  it('a base destroyed in play STAYS dead and is not resurrected by the refill', async () => {
    const { refillAmmo } = await loadWave()
    const withDead = bases().map((b, i) => (i === 1 ? { ...b, alive: false, ammo: 0 } : b))
    const out = refillAmmo(withDead)
    expect(out[1].alive).toBe(false)
    // and the surviving bases still refill
    expect(out[0].alive).toBe(true)
    expect(out[0].ammo).toBe(MAXMIS)
    expect(out[2].ammo).toBe(MAXMIS)
  })

  it('does not refill a dead base back to a full magazine (dead ≠ rearmed)', async () => {
    const { refillAmmo } = await loadWave()
    const withDead = bases().map((b, i) => (i === 0 ? { ...b, alive: false, ammo: 0 } : b))
    const out = refillAmmo(withDead)
    expect(out[0].ammo).toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1/AC4 — advance the wave: the next wave's budget re-seeds from the schedule.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-2 — wave advance re-seeds the ICBM budget from the mc4-1 schedule', () => {
  it('after wave 1 the next budget is wave 2 of the schedule (exactly 15)', async () => {
    const { nextWaveBudget } = await loadWave()
    expect(nextWaveBudget(1)).toBe(waveSchedule(2).count)
    expect(nextWaveBudget(1)).toBe(15) // ICBWAV[1], exact-value teeth
  })

  it('after wave 3 the next budget is wave 4 of the schedule (exactly 12)', async () => {
    const { nextWaveBudget } = await loadWave()
    expect(nextWaveBudget(3)).toBe(waveSchedule(4).count)
    expect(nextWaveBudget(3)).toBe(12) // ICBWAV[3]
  })

  it('always advances by exactly one wave (nextWaveBudget(w) === waveSchedule(w+1).count)', async () => {
    const { nextWaveBudget } = await loadWave()
    for (const w of [1, 2, 5, 10, 14, 20]) {
      expect(nextWaveBudget(w)).toBe(waveSchedule(w + 1).count)
    }
  })
})
