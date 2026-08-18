// src/core/waves.ts — df5-2 (Korben / Dev). The wave director: Defender's WVTAB wave
// table and the GTWV00 "new guys every Nth wave" escalation, ported PURE. The director
// is a df3 scheduler PROCESS — it invents no tick; it advances when the enemy population
// empties and spawns each wave through the scheduler.
//
// ROM ground truth (byte-gated by docs/rom-study/claims/16-waves.json):
//   WVTAB  BLK71.SRC:676-689 — a run of 8-byte blocks, each a pair of FCB rows:
//          [MAX,MIN,INTRADELT,INTERDELT] then [W1,W2,W3,W4]. The df5-2 body is the seven
//          blocks LANDERS/TIES/PROBES/SCHITZOS/SWARMERS/WAVE TIME/WAVE SIZE. The MIN and
//          the INTRA/INTER wall deltas are df4 enemy-MOTION params, out of this scope.
//   GETWV1 DEFA7.SRC:1867-1871 — the wave is clamped to 4 (CMPA #4 / LDA #4) then the
//          per-wave column is byte min(wave,4)+3; wave >= 4 repeats the W4 column forever.
//   GTWV00 DEFA7.SRC:1859-1863 — cadence N = GA4 "RESTORE WAVE #" (factory default $05,
//          ROMC8.SRC:814); on a wave that is a multiple of N, PTARG := 10 (LDA #10, :1862).
import type { Scheduler, Continuation } from './scheduler.js'

/** Per-enemy-type counts (one WVTAB column, or the MAX ceiling row). */
export interface EnemyWaveCounts {
  readonly landers: number
  readonly ties: number
  readonly probes: number
  readonly schitzos: number
  readonly swarmers: number
}

/** The WVTAB parameters for a single wave. */
export interface WaveParams {
  /** The per-wave starting attacker counts (this wave's W column). */
  readonly counts: EnemyWaveCounts
  /** WAVE TIME for this wave (BLK71.SRC:687). */
  readonly waveTime: number
  /** WAVE SIZE for this wave (BLK71.SRC:689). */
  readonly waveSize: number
}

/** The wave director — a df3 scheduler process. `wave` is the current wave number. */
export interface WaveDirector {
  readonly wave: number
}

// The WVTAB per-wave columns (W1..W4), hand-transcribed from BLK71.SRC:676-689.
const WVTAB = {
  landers: { max: 20, waves: [15, 20, 20, 20] }, // :676-677
  ties: { max: 3, waves: [0, 3, 4, 5] }, //          :678-679
  probes: { max: 6, waves: [0, 1, 3, 4] }, //        :680-681
  schitzos: { max: 10, waves: [0, 0, 0, 0] }, //     :682-683
  swarmers: { max: 10, waves: [0, 0, 0, 0] }, //     :684-685
} as const
const WAVE_TIME = [30, 25, 20, 16] as const // :686-687
const WAVE_SIZE = [5, 5, 5, 5] as const //     :688-689

/** The MAX (simultaneous ceiling) row of each WVTAB block. */
export const ENEMY_MAX: EnemyWaveCounts = {
  landers: WVTAB.landers.max,
  ties: WVTAB.ties.max,
  probes: WVTAB.probes.max,
  schitzos: WVTAB.schitzos.max,
  swarmers: WVTAB.swarmers.max,
}

// GETWV1 (DEFA7.SRC:1867-1871): clamp the wave to [1,4] to pick the W column.
function columnIndex(wave: number): number {
  const clamped = wave < 1 ? 1 : wave > 4 ? 4 : wave
  return clamped - 1
}

/** The WVTAB parameters for a 1-based `wave`, clamping the column to 4 (GETWV1). */
export function waveParams(wave: number): WaveParams {
  const i = columnIndex(wave)
  return {
    counts: {
      landers: WVTAB.landers.waves[i],
      ties: WVTAB.ties.waves[i],
      probes: WVTAB.probes.waves[i],
      schitzos: WVTAB.schitzos.waves[i],
      swarmers: WVTAB.swarmers.waves[i],
    },
    waveTime: WAVE_TIME[i],
    waveSize: WAVE_SIZE[i],
  }
}

/** GA4 "RESTORE WAVE #" cadence — the N in "new guys every Nth wave" (default 5). */
export const NEW_GUYS_EVERY_NTH_WAVE = 5
/** The count added on an Nth wave — LDA #10 (DEFA7.SRC:1862). */
export const NEW_GUYS_COUNT = 10

/** GTWV00: NEW_GUYS_COUNT on a wave that is a positive multiple of the cadence, else 0. */
export function newGuys(wave: number): number {
  return wave > 0 && wave % NEW_GUYS_EVERY_NTH_WAVE === 0 ? NEW_GUYS_COUNT : 0
}

// The wave director's PTYPE handed to MKPROC. The scheduler treats it as an opaque tag.
const WAVE_DIRECTOR_PTYPE = 0

/**
 * The wave director. A df3 scheduler process (NEWP,STYPE — no rAF/tick of its own): each
 * dispatch, if `getPopulation()` is 0 it advances to the next wave and spawns it via
 * `spawnWave`, then re-sleeps to check again next tick. It does NOT spawn eagerly — the
 * first wave begins on the first scheduler tick (BC2 JSR GETWV runs only on a cleared
 * field, DEFA7.SRC:1842-1843).
 */
export function createWaveDirector(
  sched: Scheduler,
  getPopulation: () => number,
  spawnWave: (wave: number, params: WaveParams) => void,
): WaveDirector {
  let wave = 0
  const run: Continuation = (_self, s) => {
    if (getPopulation() === 0) {
      wave += 1
      spawnWave(wave, waveParams(wave))
    }
    s.sleep(1, run) // stay on the run-list; re-check the population next tick
  }
  sched.makeProcess(run, WAVE_DIRECTOR_PTYPE)
  return {
    get wave(): number {
      return wave
    },
  }
}
