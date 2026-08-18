// tests/df5-2-waves.test.ts
//
// Story df5-2 — RED phase (Leeloo / TEA). The wave director: a PURE port of Defender's
// WVTAB wave-data table and the GTWV00 "new guys every Nth wave" escalation. The wave
// director is a df3 scheduler PROCESS — it invents no tick of its own; it advances when
// the enemy POPULATION empties and spawns the next wave's attackers through the df3
// scheduler (sim.ts:114 — "a fresh sim carries no enemies … the df5 wave logic drives
// it"; df4-3 — "a df5 wave spawner calls these").
//
// ─── THE ROM, BYTE BY BYTE (all lines from tool output) ──────────────────────────────
// WVTAB (reference/original-source/defender/BLK71.SRC:676-689, banner *WAVE DATA :673,
// column headers *MAX,MIN,INTRADELT,INTERDELT :674 / *W1,W2,W3,W4 :675; pointer FDB
// WVTAB :89, end FDB WVTEND :90 / WVTEND EQU * :722). The table is a run of 8-byte
// blocks; each block is a PAIR of FCB rows — row 1 = [MAX,MIN,INTRADELT,INTERDELT],
// row 2 = [W1,W2,W3,W4] (the per-wave value, waves 1-4). The story scopes the seven
// blocks at :676-689:
//     LANDERS   :676  FCB 20,0,0,0 / 15,20,20,20
//     TIES      :678  FCB  3,0,0,0 /  0, 3, 4, 5
//     PROBES    :680  FCB  6,0,0,0 /  0, 1, 3, 4
//     SCHITZOS  :682  FCB 10,0,0,0 /  0, 0, 0, 0
//     SWARMERS  :684  FCB 10,0,0,0 /  0, 0, 0, 0
//     WAVE TIME :686  FCB 30,0,0,0 / 30,25,20,16
//     WAVE SIZE :688  FCB  5,0,0,0 /  5, 5, 5, 5
// The per-wave lookup GETWV1/GETWV2 (DEFA7.SRC:1867-1877): `CMPA #4 / BLS / LDA #4`
// CLAMPS the wave to 4, then `ADDA #3` selects byte (min(wave,4)+3) — wave 1 → W1,
// wave 4 → W4, wave ≥4 → the W4 column repeats forever.
//
// GTWV00 escalation "GET NEW WAVE PARAMS" (DEFA7.SRC:1847-1863):
//     GETWV  INC PWAV,X               ; bump the wave number
//            LDX #GA1+6 / JSR RCMOSA  ; XTEMP = GA4 "RESTORE WAVE #" — the cadence N
//            STA XTEMP / TSTA / BEQ   ; N==0 ⇒ escalation OFF (trap out)
//            LDA PWAV,X               ; A = current wave
//     GTWV00 SUBA XTEMP  ;NEW GUYS EVERY NTH WAVE
//            BLO GTWV01  ; remainder < 0 ⇒ not an Nth wave ⇒ skip
//            BNE GTWV00  ; not zero yet ⇒ subtract N again
//            LDA #10 / STA PTARG,X    ; wave is a MULTIPLE of N ⇒ +10 new guys
// GA4's factory default is FCB $05 (reference/original-source/defender/ROMC8.SRC:814,
// "GA4  RESTORE WAVE #"), so out of the box the escalation fires on waves 5,10,15,…,
// each adding 10. N=5 and +10 are the two ROM values AC2 forbids inventing a ramp for.
//
// ─── RED/GREEN SPLIT ─────────────────────────────────────────────────────────────────
// TEA (this file) authors the failing suite; src/core/waves.ts is an EMPTY seam stub
// (`export {}`) so the namespace import resolves and every case fails on an ASSERTION.
// GREEN (Korben / Dev) ports WVTAB + GTWV00 into waves.ts and writes the
// docs/rom-study/claims/*.json entries the AC1/AC4 citation gate (tests/audit/
// citations.test.ts) verifies byte-for-byte against BLK71.SRC / DEFA7.SRC / ROMC8.SRC.

import { describe, it, expect } from 'vitest'
import { createScheduler } from '../src/core/scheduler.js'
import * as wavesNS from '../src/core/waves.js'

// ─── The contract this RED pins. Dev implements it in waves.ts (GREEN); the empty seam
// stub makes `wavesNS` a valid-but-empty namespace, so the cast compiles and the runtime
// reads below fail cleanly (undefined constant / undefined is not a function). ─────────
interface EnemyWaveCounts {
  /** LANDERS — WVTAB block :676. */
  readonly landers: number
  /** TIES (baiters) — WVTAB block :678. */
  readonly ties: number
  /** PROBES — WVTAB block :680. */
  readonly probes: number
  /** SCHITZOS (schizoid mutants) — WVTAB block :682. */
  readonly schitzos: number
  /** SWARMERS — WVTAB block :684. */
  readonly swarmers: number
}
interface WaveParams {
  /** The per-wave starting attacker counts (the W column for this wave). */
  readonly counts: EnemyWaveCounts
  /** WAVE TIME for this wave — WVTAB block :686-687. */
  readonly waveTime: number
  /** WAVE SIZE for this wave — WVTAB block :688-689. */
  readonly waveSize: number
}
/** The wave director — a df3 scheduler process. `wave` is the current wave number. */
interface WaveDirector {
  readonly wave: number
}
interface WavesModule {
  /** WVTAB lookup: the params for a 1-based wave, clamping the column to 4 (GETWV1). */
  waveParams(wave: number): WaveParams
  /** The MAX (simultaneous ceiling) row of each WVTAB block. */
  readonly ENEMY_MAX: EnemyWaveCounts
  /** GA4 "RESTORE WAVE #" cadence — the N in "new guys every Nth wave" (default 5). */
  readonly NEW_GUYS_EVERY_NTH_WAVE: number
  /** The count added on an Nth wave — LDA #10 (DEFA7.SRC:1862). */
  readonly NEW_GUYS_COUNT: number
  /** GTWV00: NEW_GUYS_COUNT when `wave` is a multiple of the cadence, else 0. */
  newGuys(wave: number): number
  /**
   * The wave director. A scheduler process (no rAF/tick of its own): each dispatch, if
   * `getPopulation()` is 0 it advances to the next wave and spawns it via `spawnWave`.
   * It does NOT spawn eagerly at creation — the first wave starts on the first tick.
   */
  createWaveDirector(
    sched: ReturnType<typeof createScheduler>,
    getPopulation: () => number,
    spawnWave: (wave: number, params: WaveParams) => void,
  ): WaveDirector
}
const waves = wavesNS as unknown as WavesModule

// ─── ROM ground truth, hand-transcribed from BLK71.SRC:676-689 (independent of any
// exported value — a test that mirrors the implementation's own constant proves nothing).
const W1 = 1, W2 = 2, W3 = 3, W4 = 4
const ROM_COUNTS: Record<number, EnemyWaveCounts> = {
  [W1]: { landers: 15, ties: 0, probes: 0, schitzos: 0, swarmers: 0 },
  [W2]: { landers: 20, ties: 3, probes: 1, schitzos: 0, swarmers: 0 },
  [W3]: { landers: 20, ties: 4, probes: 3, schitzos: 0, swarmers: 0 },
  [W4]: { landers: 20, ties: 5, probes: 4, schitzos: 0, swarmers: 0 },
}
const ROM_WAVE_TIME: Record<number, number> = { [W1]: 30, [W2]: 25, [W3]: 20, [W4]: 16 }
const ROM_WAVE_SIZE = 5 // 5,5,5,5 — constant across the four waves
const ROM_MAX: EnemyWaveCounts = { landers: 20, ties: 3, probes: 6, schitzos: 10, swarmers: 10 }
const CADENCE = 5 // GA4 default, ROMC8.SRC:814
const NEW_GUYS = 10 // DEFA7.SRC:1862

describe('df5-2 waves — AC1: waves.ts models the WVTAB wave table (attackers, WAVE TIME, WAVE SIZE)', () => {
  it('returns the exact per-wave attacker counts for each of the five enemy types (waves 1-4)', () => {
    for (const wave of [W1, W2, W3, W4]) {
      expect(waves.waveParams(wave).counts, `WVTAB W${wave} column`).toEqual(ROM_COUNTS[wave])
    }
  })

  it('LANDERS ramp is the ROM 15,20,20,20 — not a smooth invented curve', () => {
    expect([1, 2, 3, 4].map((w) => waves.waveParams(w).counts.landers)).toEqual([15, 20, 20, 20])
  })

  it('TIES and PROBES arrive on the ROM schedule (ties 0,3,4,5 / probes 0,1,3,4)', () => {
    expect([1, 2, 3, 4].map((w) => waves.waveParams(w).counts.ties)).toEqual([0, 3, 4, 5])
    expect([1, 2, 3, 4].map((w) => waves.waveParams(w).counts.probes)).toEqual([0, 1, 3, 4])
  })

  it('SCHITZOS and SWARMERS have ZERO WVTAB spawns in waves 1-4 (they arrive by other means)', () => {
    for (const wave of [W1, W2, W3, W4]) {
      expect(waves.waveParams(wave).counts.schitzos, `schitzos W${wave} = 0`).toBe(0)
      expect(waves.waveParams(wave).counts.swarmers, `swarmers W${wave} = 0`).toBe(0)
    }
  })

  it('WAVE TIME counts DOWN 30,25,20,16 across the four waves', () => {
    for (const wave of [W1, W2, W3, W4]) {
      expect(waves.waveParams(wave).waveTime, `WAVE TIME W${wave}`).toBe(ROM_WAVE_TIME[wave])
    }
  })

  it('WAVE SIZE is 5 in every one of the four waves', () => {
    for (const wave of [W1, W2, W3, W4]) {
      expect(waves.waveParams(wave).waveSize, `WAVE SIZE W${wave}`).toBe(ROM_WAVE_SIZE)
    }
  })

  it('exposes the ROM MAX (simultaneous ceiling) row: landers 20, ties 3, probes 6, schitzos 10, swarmers 10', () => {
    expect(waves.ENEMY_MAX).toEqual(ROM_MAX)
  })

  it('CLAMPS the wave column to 4 (GETWV1 CMPA #4) — wave ≥4 repeats the W4 column forever', () => {
    for (const wave of [4, 5, 12, 99]) {
      expect(waves.waveParams(wave).counts, `wave ${wave} clamps to W4`).toEqual(ROM_COUNTS[W4])
      expect(waves.waveParams(wave).waveTime, `wave ${wave} time clamps to W4=16`).toBe(16)
    }
  })
})

describe('df5-2 waves — AC2: the GTWV00 "new guys every Nth wave" escalation (ROM values, not an invented ramp)', () => {
  it('the cadence is the GA4 default N=5 and the increment is the ROM #10 — the two exact values', () => {
    expect(waves.NEW_GUYS_EVERY_NTH_WAVE, 'GA4 RESTORE WAVE # default (ROMC8.SRC:814)').toBe(CADENCE)
    expect(waves.NEW_GUYS_COUNT, 'LDA #10 (DEFA7.SRC:1862)').toBe(NEW_GUYS)
  })

  it('adds 10 ONLY on multiples of 5, and nothing on the intervening waves', () => {
    expect([1, 2, 3, 4].map((w) => waves.newGuys(w)), 'no new guys before the 5th wave').toEqual([0, 0, 0, 0])
    expect(waves.newGuys(5), 'wave 5 is the first Nth wave').toBe(10)
    expect([6, 7, 8, 9].map((w) => waves.newGuys(w)), 'quiet again until the 10th').toEqual([0, 0, 0, 0])
    expect(waves.newGuys(10), 'wave 10').toBe(10)
    expect(waves.newGuys(15), 'wave 15').toBe(10)
    expect(waves.newGuys(20), 'wave 20').toBe(10)
  })

  it('is the ROM step function, NOT a linear per-wave ramp (which would make newGuys grow every wave)', () => {
    // A naive "escalate every wave" ramp gives strictly increasing, all-nonzero values.
    // The ROM is a step: 0 for four waves, then a single +10 spike. Prove it is NOT
    // monotone-nonzero across 1..9.
    const series = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((w) => waves.newGuys(w))
    expect(series, 'GTWV00 is periodic (mostly 0), not a rising ramp').toEqual([0, 0, 0, 0, 10, 0, 0, 0, 0])
  })
})

describe('df5-2 waves — AC3: wave-clear → advance is POPULATION-driven; attackers spawn via the scheduler', () => {
  it('is a scheduler process and does NOT spawn eagerly — the first wave waits for the first tick', () => {
    const sched = createScheduler()
    const spawned: number[] = []
    expect(sched.processes.length, 'a fresh scheduler is empty').toBe(0)
    const dir = waves.createWaveDirector(sched, () => 0, (wave) => spawned.push(wave))
    // The director registered itself on the scheduler (NEWP,STYPE — no rAF/tick of its own)…
    expect(sched.processes.length, 'the wave director lives on the df3 scheduler').toBeGreaterThanOrEqual(1)
    // …and nothing has spawned yet, because it is dispatched by the scheduler, not eagerly.
    expect(dir.wave, 'no wave has started before the scheduler ticks').toBe(0)
    expect(spawned, 'no attackers spawned at construction time').toEqual([])
  })

  it('starts wave 1 on the first tick when the population is empty, spawning it with the WVTAB W1 counts', () => {
    const sched = createScheduler()
    let population = 0
    const spawned: Array<{ wave: number; params: WaveParams }> = []
    const dir = waves.createWaveDirector(sched, () => population, (wave, params) => {
      spawned.push({ wave, params })
      population = params.counts.landers // the spawned attackers are now alive
    })
    sched.stepTick()
    expect(dir.wave, 'empty population on tick 1 → wave 1 begins').toBe(1)
    expect(spawned).toHaveLength(1)
    expect(spawned[0].wave).toBe(1)
    expect(spawned[0].params.counts, 'wave 1 spawns the WVTAB W1 counts').toEqual(ROM_COUNTS[W1])
  })

  it('does NOT advance while enemies remain — advance is population-driven, not a wall-clock timer', () => {
    const sched = createScheduler()
    let population = 0
    const spawned: number[] = []
    waves.createWaveDirector(sched, () => population, (wave) => {
      spawned.push(wave)
      population = 12 // wave 1's enemies are alive
    })
    sched.stepTick() // wave 1 spawns; population → 12
    // Burn many ticks with enemies still on the field. A timer-driven director would tick
    // the wave over; a population-driven one holds until the field is clear.
    for (let i = 0; i < 30; i++) sched.stepTick()
    expect(spawned, 'no wave advance while the population is non-empty (30 ticks passed)').toEqual([1])
  })

  it('advances to the next wave the moment the population empties, and re-spawns via the scheduler', () => {
    const sched = createScheduler()
    let population = 0
    const spawned: Array<{ wave: number; params: WaveParams }> = []
    const dir = waves.createWaveDirector(sched, () => population, (wave, params) => {
      spawned.push({ wave, params })
      population = params.counts.landers
    })
    sched.stepTick() // wave 1
    expect(dir.wave).toBe(1)
    population = 0 // player clears the wave
    sched.stepTick() // wave 2 must begin
    expect(dir.wave, 'a cleared field advances the wave').toBe(2)
    expect(spawned.map((s) => s.wave)).toEqual([1, 2])
    expect(spawned[1].params.counts, 'wave 2 spawns the WVTAB W2 counts').toEqual(ROM_COUNTS[W2])
    expect(spawned[1].params.waveTime, 'wave 2 WAVE TIME = 25').toBe(25)
  })

  it('makes NO progress without the scheduler — it owns no tick of its own', () => {
    const sched = createScheduler()
    const spawned: number[] = []
    const dir = waves.createWaveDirector(sched, () => 0, (wave) => spawned.push(wave))
    // Never call stepTick. A director with its own clock would advance anyway.
    expect(dir.wave, 'without a scheduler tick nothing happens').toBe(0)
    expect(spawned, 'the director cannot spawn without the scheduler dispatching it').toEqual([])
  })
})

describe('df5-2 waves — AC4: value assertions redden on a WVTAB / cadence mutation (the vacuous-guard trap)', () => {
  it('a mutation to any WVTAB size/time byte reddens a VALUE assertion, not merely a presence check', () => {
    // Each of these is an exact ROM byte. Flipping any one in waves.ts (e.g. LANDERS W1
    // 15→14, or WAVE TIME W4 16→15) fails a specific equality here — the coverage is not
    // vacuous (no `toBeDefined`/`.length` stand-ins).
    expect(waves.waveParams(W1).counts.landers).toBe(15)
    expect(waves.waveParams(W2).counts.ties).toBe(3)
    expect(waves.waveParams(W3).counts.probes).toBe(3)
    expect(waves.waveParams(W4).counts.ties).toBe(5)
    expect(waves.waveParams(W4).waveTime).toBe(16)
    expect(waves.waveParams(W2).waveSize).toBe(5)
    expect(waves.ENEMY_MAX.swarmers).toBe(10)
    expect(waves.ENEMY_MAX.probes).toBe(6)
  })

  it('a mutation to the escalation cadence or increment reddens a VALUE assertion', () => {
    // cadence 5→4 would make newGuys(4) === 10 (currently 0); increment 10→8 would make
    // newGuys(5) === 8. Both are caught by exact equalities.
    expect(waves.newGuys(4), 'cadence guard: wave 4 pays nothing').toBe(0)
    expect(waves.newGuys(5), 'cadence + increment guard: wave 5 pays exactly 10').toBe(10)
    expect(waves.NEW_GUYS_EVERY_NTH_WAVE).toBe(5)
    expect(waves.NEW_GUYS_COUNT).toBe(10)
  })
})
