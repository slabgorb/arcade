// tests/helpers/wave-contract.ts
//
// Story jt2-5 — the CONTRACT for the wave machine core (the CIA process),
// TEA-authored (O'Brien). Same double-entry split the epic has used since
// jt1-2: TEA states the module shape and the laws that pin it; Dev (Julia)
// writes the module + its committed data + the JT25-* claims. The behaviour
// lives in tests/wave.test.ts; the ROM-law provenance and the 90-row byte gate
// in tests/wave-source.test.ts; every newly-cited range carries a committed
// claim in docs/rom-study/claims/wave.json (byte-verified by the citations
// suite).
//
// ─── WHAT jt2-5 MODELS (all cited; see wave-source.test.ts) ──────────────────
// The wave machine as the CIA process (JOUSTRV4.SRC:1875):
//
//   • THE FULL WAVTBL DECODE — 4-byte nibble-packed rows (JOUSTRV4.SRC:175-181):
//     byte0 = bounders:hunters, byte1 = lords:pursuers, byte2 = pterodactyls,
//     byte3 = status. Waves 1-90 are committed as WAVE_TABLE; after the table is
//     exhausted the pointer LOOPS back to wave 81 (WTBRST/WTBEND,
//     JOUSTRV4.SRC:2018-2021,2535-2546), so the late-wave plateau — all Shadow
//     Lords at max pursuit, $00,$AF — repeats forever.
//   • The wave NUMBER is an independent BCD 0-99 counter (WAVBCD, ADDA #$01/DAA,
//     JOUSTRV4.SRC:2001-2004) — distinct from the table index: after wave 99 the
//     BCD wraps to 00 while the table pointer keeps looping 81-90.
//   • The STATUS low nibble dispatches six wave types through the WJSRTB skeleton
//     (`ANDB #WBJSR0+WBJSR1+WBJSR2` = `& $0E`, JOUSTRV4.SRC:2041-2044,2586-2591):
//     nop / intro / coop / gladiator / egg / ptero. survival & co-op are LIVE
//     with the DEGRADE-by-player-count laws — a co-op wave becomes survival when
//     a player is out (WCOOP → WAVSUR, JOUSTRV4.SRC:2628-2631); a gladiator wave
//     no-ops solo (WGLAD → WAVRT2 RTS, JOUSTRV4.SRC:2697-2700). Gladiator/egg/
//     ptero BEHAVIOURS are jt4/jt3 (ruled seam) — the dispatch skeleton routes
//     all six.
//   • NEGATIVE claims: the WBJSR phantom types 12/14 are never implemented (the
//     table has six entries; the comment lists 2,4,6,8,10,12,14 —
//     JOUSTRV4.SRC:187) and appear in NO wave; wave 0's table entry is never
//     played from a fresh game (PWAVE seeded at WAVTBL-WLEN then advanced BEFORE
//     the first wave, JOUSTRV4.SRC:1878,2437).
//   • The high nibble records CLIFF DESTRUCTION as DATA only (WBCL1L/1R/2/4,
//     JOUSTRV4.SRC:185-192); the bridge burn is jt3's — no behaviour here.
//   • MESSAGE BEATS: each dispatched type emits an ordered run of WAVMSG beats
//     (the text seam). Delays are APPROXIMATELY 1 s (`#180/6`, `#90/6` through a
//     variable-length message loop divided by 6, JOUSTRV4.SRC:2045,2601) — the
//     shell owns timing, so a Beat carries NO duration: a beat-count / event-
//     shape pin only.
//
// ─── SEEDING FLOWS TO jt2-2's INPUTS (the carried seam) ──────────────────────
// The pursuit NIBBLE (WPERSUE low four bits) seeds the intelligence budget:
// seedWaveBudget(row) = seedBudget(row.pursuers) (ANDA #$0F / STA WSMART,
// JOUSTRV4.SRC:2076-2077). The CIA 112×8-frame growth timer (896 frames,
// JOUSTRV4.SRC:2094-2096) drives enemy.growWanted while enemies live. EMYTIM is
// the divider: 2 on waves 1-2, else 1 (JOUSTRV4.SRC:2202-2205). And the budget
// is THREADED ONTO GameState so in-scheduler promotion goes LIVE this story —
// jt2-2's scheduler-driven enemies were dumb-only; now a dumb enemy waking with
// budget room promotes to ITS decision brain inside stepFrame.
//
// ─── IFN DEBUG ORACLES ───────────────────────────────────────────────────────
// The author's own invariants become bookkeeping oracles (JOUSTRV4.SRC:2953-2959,
// 2966-2970): only an enemy (EMYID) triggers the death path, NENEMY never goes
// negative, and NSMART balances to zero at a wave boundary.

import type {
  GameState as SchedulerGameState,
  ProcessSpec,
  Process,
  PlayerInput,
} from './scheduler-contract.js'
import type { IntelBudget, EnemyState, PlayerView, Decision, SmartBrain } from './enemy-contract.js'

export type {
  IntelBudget,
  EnemyState,
  PlayerView,
  Decision,
  SmartBrain,
  ProcessSpec,
  Process,
  PlayerInput,
}

/**
 * A decoded WAVTBL row (JOUSTRV4.SRC:175-181). On the wire it is four bytes,
 * nibble-packed; the module unpacks them into named counts + the raw status.
 */
export interface WaveRow {
  /** byte0 HIGH nibble — WBOUND (number of bounders). */
  bounders: number
  /** byte0 LOW nibble — WHUNT (number of hunters). */
  hunters: number
  /** byte1 HIGH nibble — WLORD (number of shadow lords). */
  lords: number
  /** byte1 LOW nibble — WPERSUE (the pursuit nibble → seedBudget). */
  pursuers: number
  /** byte2 — WPTEN (number of pterodactyls). */
  pterodactyls: number
  /** byte3 — WSTATUS (the whole status byte: cliff bits | type bits | persue bit). */
  status: number
}

/** The six real wave types the WJSRTB skeleton routes (indices 0-5). */
export type RawWaveType = 'nop' | 'intro' | 'coop' | 'gladiator' | 'egg' | 'ptero'

/**
 * A wave type AFTER the degrade-by-player-count laws: a co-op wave degrades to
 * 'survival' when a player is out; a gladiator wave degrades to 'nop' solo.
 */
export type ResolvedWaveType = RawWaveType | 'survival'

/** Which players are still in the game (SPLY1+6 / SPLY2+6). */
export interface PlayersAlive {
  p1: boolean
  p2: boolean
}

/**
 * One wave-message beat (the WAVMSG / WAVEN text seam). Carries WHICH message,
 * in order — and NOTHING else: no `seconds`, no `ms`, no `duration`. The delays
 * are ~1 s and the SHELL owns them (the ruled text seam).
 */
export interface Beat {
  message: string
}

/**
 * GameState after jt2-5 threads the intelligence budget onto it — the carried
 * seam that takes jt2-2's scheduler-driven enemies from dumb-only to promotable
 * in-scheduler. Structurally the jt2-1 GameState plus `budget`.
 */
export interface GameState extends SchedulerGameState {
  readonly budget: IntelBudget
}

export interface WaveModule {
  // ─── The decoded table + its geometry ─────────────────────────────────────
  /** The full committed decode — waves 1-90 (JOUSTRV4.SRC:2439-2545). */
  WAVE_TABLE: readonly WaveRow[]
  /** 90 — the number of committed rows (waves 1-90). */
  WAVE_TABLE_LEN: number
  /** 81 — the 1-based wave the pointer loops back to (WTBRST, JOUSTRV4.SRC:2535). */
  WAVE_LOOP_START: number

  /**
   * The row for a 1-based wave number, resolving the loop-at-81. Waves 1-90 read
   * the table directly; wave 91 loops to wave 81's row, and so on forever
   * (JOUSTRV4.SRC:2018-2021). Throws for a wave < 1 — wave 0 is never played.
   */
  waveRowAt(waveNumber: number): WaveRow

  /**
   * One BCD increment of the wave counter (LDA WAVBCD / ADDA #$01 / DAA,
   * JOUSTRV4.SRC:2001-2004): the byte is BCD (0x00..0x99), so 0x09→0x10 and
   * 0x99→0x00 (rollover). INDEPENDENT of the table index.
   */
  nextWaveBcd(bcd: number): number

  /**
   * uf1-2 round 2 — the INVERSE of `nextWaveBcd`'s packing: the 1-based DECIMAL
   * wave ordinal for a WAVBCD counter byte. `demo.wave` holds the packed byte, and
   * every API that takes "a 1-based wave" wants the ordinal; the two agree for
   * waves 1-9 and diverge forever after (the counter reads 0x10 at the tenth wave,
   * which as a decimal number is 16).
   *
   * THROWS for a byte that is not valid BCD (either nibble > 9) — the guard aimed
   * at the failure mode that actually occurs, a decimal wave arriving where the
   * packed counter belongs. Returns 100 for the rolled-over 0x00: `nextWaveBcd`
   * wraps 0x99 → 0x00, so the hundredth wave displays "00", and a 0 would otherwise
   * reach `waveValue` — which rejects it and CRASHES the running game.
   *
   * NOT for use inside `nextWaveBcd`: the BCD arithmetic there must keep seeing
   * 0x00 as zero, or 0x99 stops rolling to 0x00.
   */
  decimalWaveFromBcd(counter: number): number

  // ─── The six-type WJSRTB dispatch skeleton ────────────────────────────────
  /** The six real types, in WJSRTB order (JOUSTRV4.SRC:2586-2591). */
  WAVE_TYPES: readonly RawWaveType[]
  /**
   * The phantom WBJSR offsets 12 and 14 as TYPE INDICES 6 and 7 — the JSR-table
   * offsets the comment lists (2,4,6,8,10,12,14, JOUSTRV4.SRC:187) that the
   * six-entry table never implements. They appear in NO wave.
   */
  PHANTOM_TYPE_INDICES: readonly number[]

  /** The WJSRTB type index for a status byte: `(status & $0E) >> 1`. 0-7. */
  waveTypeIndex(status: number): number

  /** The raw type name for a status byte; THROWS for a phantom index (6/7). */
  rawWaveType(status: number): RawWaveType

  /**
   * The RESOLVED wave type after the degrade laws (JOUSTRV4.SRC:2628-2631,
   * 2697-2700): 'coop' becomes 'survival' unless BOTH players are alive;
   * 'gladiator' becomes 'nop' unless both are alive; every other type is
   * unchanged. Throws for a phantom status.
   */
  dispatchWaveType(status: number, players: PlayersAlive): ResolvedWaveType

  /** The high-nibble cliff-destruction bits as DATA (`status & $F0`); no behaviour. */
  cliffBits(status: number): number

  /**
   * The ordered message beats a resolved type emits (the WAVMSG calls in its
   * WJSRTB routine). No durations. 'nop' emits none.
   */
  waveBeats(type: ResolvedWaveType): readonly Beat[]

  // ─── Seeding into jt2-2's budget inputs ───────────────────────────────────
  /** `EMYTIM` on waves 1-2 = 2 (the divider). */
  EMYTIM_SLOW: number
  /** `EMYTIM` default = 1 (NO ENEMY SLOW DOWN). */
  EMYTIM_NORMAL: number
  /** EMYTIM for a 1-based wave number: 2 on waves 1-2, else 1 (JOUSTRV4.SRC:2202-2205). */
  emytimForWave(waveNumber: number): number

  /**
   * Seed the intelligence budget from a wave's pursuit nibble — the jt2-2 input.
   * Equals enemy.seedBudget(row.pursuers): `{ nsmart: 0, wsmart: row.pursuers }`
   * (ANDA #$0F / STA WSMART, JOUSTRV4.SRC:2076-2077).
   */
  seedWaveBudget(row: WaveRow): IntelBudget

  /** 896 — the CIA growth cadence (112 naps × 8 frames, JOUSTRV4.SRC:2094-2096). */
  CIA_GROWTH_FRAMES: number

  /**
   * Whether the 15-second growth timer fires after `elapsedFrames` — true at each
   * whole multiple of CIA_GROWTH_FRAMES (896), false otherwise and at 0. When it
   * fires the wave machine applies enemy.growWanted (the LAW jt2-2 already pins).
   */
  growthDue(elapsedFrames: number): boolean

  // ─── The carried seam: budget on GameState ────────────────────────────────
  /** Put a budget on a GameState (pure) — the wave machine's seed onto the sim. */
  withBudget(state: GameState, budget: IntelBudget): GameState

  // ─── IFN DEBUG bookkeeping oracles ────────────────────────────────────────
  /**
   * The wave-boundary invariants (JOUSTRV4.SRC:1983,2966-2970): NSMART must be 0
   * (the ledger balanced) and the active-enemy count must be >= 0. Returns
   * silently when clean; THROWS a self-describing error otherwise — the author's
   * own SWI, as a test oracle.
   */
  assertWaveEndClean(budget: IntelBudget, activeEnemies: number): void
}

/**
 * The frame.ts scheduler AFTER jt2-5 threads the budget onto GameState and turns
 * on in-scheduler promotion. Same module (src/core/frame.ts) as loadScheduler,
 * but typed with the budget-bearing GameState — and the loader refuses to return
 * until `createState` actually seeds a budget, so the frame.ts seam reds cleanly.
 */
export interface WaveScheduler {
  createState(seed: number): GameState
  spawn(state: GameState, spec: ProcessSpec): GameState
  kill(state: GameState, target: number, mask: number): GameState
  stepFrame(state: GameState, inputs?: Record<number, PlayerInput>): GameState
}

/**
 * Load the not-yet-built wave machine with a self-describing failure — the
 * loadEnemy/loadScheduler pattern. The specifier is assembled at runtime so the
 * bundler cannot resolve it statically and fail the whole FILE at collection.
 *
 * RED today: `src/core/wave.ts` does not exist, so this throws "wave machine not
 * built yet" per test — a clean "feature absent" red, never a module-resolution
 * trace or a type error.
 */
export async function loadWave(): Promise<WaveModule> {
  const specifier = ['..', '..', 'src', 'core', 'wave.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<WaveModule>
    for (const fn of [
      'waveRowAt',
      'nextWaveBcd',
      'waveTypeIndex',
      'rawWaveType',
      'dispatchWaveType',
      'cliffBits',
      'waveBeats',
      'emytimForWave',
      'seedWaveBudget',
      'growthDue',
      'withBudget',
      'assertWaveEndClean',
    ] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    for (const c of ['WAVE_TABLE', 'WAVE_TABLE_LEN', 'WAVE_LOOP_START', 'WAVE_TYPES'] as const) {
      if (mod[c] === undefined) throw new Error(`module has no \`${c}\` export`)
    }
    return mod as WaveModule
  } catch (e) {
    throw new Error(
      'wave machine not built yet — GREEN (Julia) creates joust/src/core/wave.ts to ' +
        'satisfy tests/helpers/wave-contract.ts: the full 90-row WAVE_TABLE decode ' +
        '(committed data, byte-gated against JOUSTRV4.SRC:2439-2545), waveRowAt (loop ' +
        'at 81), nextWaveBcd (BCD 0-99), the six-type WJSRTB dispatch with the ' +
        'coop→survival / gladiator→nop degrade laws, the message beats, the budget/' +
        'EMYTIM seeding into jt2-2, withBudget + the IFN DEBUG oracles — and threads ' +
        'the budget onto GameState in src/core/frame.ts so stepFrame promotes dumb ' +
        'enemies in-scheduler. Also commit docs/rom-study/claims/wave.json (JT25-*). ' +
        `(${(e as Error).message})`,
    )
  }
}

/**
 * Load ONLY the uf1-2 round-2 BCD→decimal decode seam. Kept separate from
 * `loadWave` — exactly as `loadDemoRender` is kept separate from `loadDemo` — so
 * the 60-odd tests that already exercise the wave machine stay green while this
 * one new export is still absent. Widening `loadWave`'s required list would redden
 * the whole wave suite for one missing function, which buys nothing and hides
 * which test is actually about the new seam.
 */
export async function loadWaveBcd(): Promise<Pick<WaveModule, 'nextWaveBcd' | 'decimalWaveFromBcd'>> {
  const specifier = ['..', '..', 'src', 'core', 'wave.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<WaveModule>
    for (const fn of ['nextWaveBcd', 'decimalWaveFromBcd'] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    return mod as WaveModule
  } catch (e) {
    throw new Error(
      'the BCD→decimal wave decode is not built yet — GREEN (Julia) adds ' +
        '`decimalWaveFromBcd(counter)` to joust/src/core/wave.ts: the inverse of ' +
        "nextWaveBcd's packing (0x10 → 10), throwing on a non-BCD byte and mapping the " +
        'rolled-over 0x00 to the hundredth wave. It is the unit-carrying seam ' +
        "`stepDemo` must put between the WAVBCD counter and the difficulty engine. " +
        `(${(e as Error).message})`,
    )
  }
}

/**
 * Load the frame.ts scheduler with the jt2-5 budget seam. Returns the same
 * spawn/kill/stepFrame the scheduler already exports, but typed with the
 * budget-bearing GameState — and refuses (a clean red) until `createState`
 * actually seeds a `budget`, which is exactly what the carried seam requires.
 *
 * RED today: frame.ts's createState returns no `budget`, so this throws "the
 * frame.ts budget seam is not wired yet" per test.
 */
export async function loadWaveScheduler(): Promise<WaveScheduler> {
  const specifier = ['..', '..', 'src', 'core', 'frame.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<WaveScheduler>
    for (const fn of ['createState', 'spawn', 'kill', 'stepFrame'] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    const s0 = mod.createState!(0)
    if (!s0 || (s0 as GameState).budget === undefined) {
      throw new Error('createState does not seed a `budget` on GameState')
    }
    return mod as WaveScheduler
  } catch (e) {
    throw new Error(
      'the frame.ts budget seam is not wired yet — GREEN (Julia) threads the ' +
        'IntelBudget onto GameState in src/core/frame.ts (createState seeds ' +
        '`budget: { nsmart: 0, wsmart: 0 }`) and turns on in-scheduler promotion in ' +
        'stepFrame (a dumb `kind:"enemy"` process waking with `shouldPromote(budget)` ' +
        'promotes to its decision brain and debits the state budget). ' +
        `(${(e as Error).message})`,
    )
  }
}
