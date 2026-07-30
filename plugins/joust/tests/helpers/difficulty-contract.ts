// tests/helpers/difficulty-contract.ts
//
// Story jt3-1 — TEA-authored (Leeloo) CONTRACT for the centralized difficulty
// engine core (the IWAVE inter-wave difficulty pass, JOUSTRV4.SRC:1890-1933).
// Same double-entry split the epic has used since jt1-2: TEA states the module
// shape and the laws that pin it; Dev (Julia) writes the module + its committed
// DYTBL decode + the JT31-* claims. The behaviour lives in tests/difficulty.test.ts;
// the ROM-law provenance and the 28-row byte gate in tests/difficulty-source.test.ts
// (which re-derives the table INDEPENDENTLY of this decoder); every newly-cited
// range carries a committed claim in docs/rom-study/claims/difficulty.json
// (byte-verified by the citations suite).
//
// ─── WHAT jt3-1 CENTRALIZES (user ruling A — all cited; see difficulty-source) ─
// The ROM's per-wave difficulty engine, made THE source (user ruling A):
//
//   • THE DYTBL DECODE — 28 DYWORD rows (DYTBL, JOUSTRV4.SRC:7304-7331). The
//     DYWORD macro (JOUSTRV4.SRC:210-213) is NOT a bare start→end pair: it emits
//     a 14-byte row —
//         FDB START1,START2,START3,ENDV,TIM1,TIM2   (6 words = 12 bytes)
//         FCB TIM3,INCRE                            (2 bytes)
//     so the struct is THREE start columns (one per GA1 tier, DYWST0/1/2,
//     JOUSTRV4.SRC:202-204), a signed word END value (DYWEND, :205), a FIVE-byte
//     (ten-nibble) per-difficulty step-cadence table (DYWTIM, :206), and a signed
//     BYTE increment (DYWINC, :207). Note the macro moves INCRE (its 4th arg) to
//     the LAST emitted byte — the row's operand order is NOT its byte order.
//     DYWLEN = 14 (:208).
//   • THE GA1 STARTING COLUMN — the operator difficulty GA1 buckets into three
//     tiers that pick which start column seeds the RAM working copy: 0-3 → column
//     0, 4-6 → column 1, 7+ → column 2 (JOUSTRV4.SRC:930-939). GA1 default is 5.
//   • THE IWAVE WALK + PLATEAU — once per wave each entry's value walks toward its
//     END by its signed increment, gated by the per-difficulty nibble cadence, and
//     CLAMPS at END (a signed BLT/BGT clamp, JOUSTRV4.SRC:1910-1922). Once it
//     reaches END it holds FLAT forever. The RAM copy is seeded to the start value
//     with a countdown timer of 2 (JOUSTRV4.SRC:939-950).
//
// ─── THE RETROFIT (user ruling A, the jt2-1 migration bar) ────────────────────
// jt2 landed three per-wave difficulty knobs as story-local stubs; this story
// re-points them to read from THIS engine as THE source, WITHOUT changing any
// wave's realized value (the retrofit changes the SOURCE, not the value):
//   • EMYTIM divider — 2 on waves 1-2, else 1 (JOUSTRV4.SRC:2202-2205). Today in
//     src/core/wave.ts::emytimForWave.
//   • Lava-level step — $EA → $E5 → $E0, five-per-wave with a floor
//     (JOUSTRV4.SRC:1929-1933). Today in src/core/arena.ts::lavaLevelForWave.
//   • The pursuit-nibble budget SEED — {nsmart:0, wsmart: row.pursuers}
//     (WPERSUE, ANDA #$0F / STA WSMART, JOUSTRV4.SRC:2075-2077). Today in
//     src/core/wave.ts::seedWaveBudget.
// The engine exposes the canonical form of all three; the jt2 stubs delegate to
// it, so jt2's seeded determinism replays reproduce bit-for-bit.

import type { IntelBudget, WaveRow } from './wave-contract.js'

export type { IntelBudget, WaveRow }

/**
 * One decoded DYWORD row (JOUSTRV4.SRC:210-213). On the wire it is 14 bytes; the
 * module unpacks them into the named fields. `name` is the trailing assembler
 * LABEL comment (LAVTIM, BOUPWD, …) — documentation only, NEVER an assembled
 * byte, so it takes no part in the byte gate.
 */
export interface DyRow {
  /** DYWST0/1/2 (JOUSTRV4.SRC:202-204) — the three start columns, one per GA1 tier. Signed words 0..65535. */
  starts: readonly [number, number, number]
  /** DYWEND (JOUSTRV4.SRC:205) — the plateau/clamp target. A signed word, stored raw 0..65535. */
  end: number
  /** DYWTIM (JOUSTRV4.SRC:206) — the 5-byte (10-nibble) per-difficulty step-cadence table. */
  timeBytes: readonly number[]
  /** DYWINC (JOUSTRV4.SRC:207) — the signed per-step increment, stored as its raw byte 0..255 (two's-complement). */
  inc: number
  /** The trailing label comment (LAVTIM …). Documentation; not part of the 14 assembled bytes. */
  name: string
}

/**
 * The 28 DYWORD row LABELS in table order (JOUSTRV4.SRC:7304-7331). These are the
 * ROM's own RAM symbols — each row's label IS the name its consumer loads
 * (`LDA BOUPWD`, `SUBD BODNVY`, …), so naming a row is how a consumer asks the
 * engine for a value. uf1-2 exists because no consumer module referenced one.
 */
export type DyRowName =
  | 'LAVTIM'
  | 'LAVGRA'
  | 'LAVLAV'
  | 'EGGWT'
  | 'EGGWT2'
  | 'BODNRG'
  | 'BODNDI'
  | 'BODNVY'
  | 'BOUPRG'
  | 'BOUPDI'
  | 'BOUPWD'
  | 'BOUPWU'
  | 'BOLETM'
  | 'HUDNRG'
  | 'HUDNDI'
  | 'HUDNVY'
  | 'HUUPRG'
  | 'HUUPDI'
  | 'HUUPWD'
  | 'HUUPWU'
  | 'HUUPVY'
  | 'HULETM'
  | 'SHDNRG'
  | 'SHUPRG'
  | 'SHUPVY'
  | 'SHUPTM'
  | 'SHLETM'
  | 'SHCLTM'

/**
 * uf1-2 — every row's explicit disposition, so no row is left in the third state
 * the story exists to end (data sitting tested and unread). Either the row is
 * WIRED to a live production consumer this story, or it carries the reason it is
 * not — and a reason is a fact about the tree or the ROM, never a shrug.
 */
export type RowDisposition =
  /** Wired to a live production consumer by uf1-2. */
  | { kind: 'wired'; consumer: string }
  /**
   * The ROM itself never reads this row — its label appears exactly once in
   * JOUSTRV4.SRC, on its own DYWORD line. Vestigial 1982 data; there is no
   * behaviour to port.
   */
  | { kind: 'dead-in-rom' }
  /**
   * The ROM reads it, but the clone has no mechanic to receive it yet. `rom` is
   * the ROM's consuming line; `missing` names the absent mechanic; `owner` is the
   * story that will wire it.
   */
  | { kind: 'no-consumer-yet'; rom: string; missing: string; owner: string }

export interface DifficultyModule {
  // ─── The decoded DYTBL table + its geometry ───────────────────────────────
  /** The full committed decode — the 28 DYWORD rows (JOUSTRV4.SRC:7304-7331). */
  DIFFICULTY_TABLE: readonly DyRow[]
  /** 28 — the number of committed DYWORD rows. */
  DYTBL_ROW_COUNT: number
  /** 14 — DYWLEN, the assembled byte length of one DYWORD row (JOUSTRV4.SRC:208). */
  DYWORD_LEN: number
  /** 5 — the operator GA1 factory default (the middle tier). */
  GA1_DEFAULT: number

  /**
   * The DYWST start-column index a GA1 value selects: 0-3 → 0, 4-6 → 1, 7+ → 2
   * (CMPA #3 / CMPA #6, JOUSTRV4.SRC:933-938). Independent of any row.
   */
  ga1StartColumn(ga1: number): number

  /**
   * The per-difficulty step-cadence nibble for a row (JOUSTRV4.SRC:1899-1908):
   * byte = timeBytes[floor(ga1/2)], HIGH nibble when ga1 is even, LOW when odd.
   * A nibble N means the value steps once every N waves (0 → every wave).
   */
  stepNibble(row: DyRow, ga1: number): number

  /**
   * The row's difficulty value in effect DURING a 1-based `wave` (the IWAVE walk,
   * JOUSTRV4.SRC:1890-1926): seeded to starts[ga1StartColumn(ga1)] with a
   * countdown timer of 2, then once per wave-advance it adds the signed increment
   * (sign-extended DYWINC) and CLAMPS at `end` (the signed BLT/BGT clamp) on the
   * cadence gate. Wave 1 reads the start; any wave past the walk length reads `end`.
   */
  difficultyValue(row: DyRow, ga1: number, wave: number): number

  // ─── uf1-2: the NAMED per-wave seam consumers actually call ────────────────
  /**
   * uf1-2 — the 28 row labels in DYTBL order. Lets a consumer (and this suite)
   * address a row the way the ROM does, by its assembler label.
   */
  DYTBL_ROW_NAMES: readonly DyRowName[]

  /**
   * uf1-2 — look a row up by its ROM label. Throws on an unknown name rather than
   * returning undefined: a typo'd row name is a programming error, and a silent
   * `undefined` here would walk straight into `difficultyValue` and produce NaN.
   */
  dyRow(name: DyRowName): DyRow

  /**
   * uf1-2 — THE SEAM. The row's live value during a 1-based `wave` at operator
   * difficulty `ga1` (default GA1_DEFAULT = 5, the shipped setting). This is
   * `difficultyValue(dyRow(name), ga1, wave)`, and it is what production consumers
   * call — the single function whose absence made all 28 rows dead.
   */
  waveValue(name: DyRowName, wave: number, ga1?: number): number

  /**
   * uf1-2 — every row's disposition (see RowDisposition). Total over all 28 rows:
   * the inventory is DATA in the module, not prose in an archive note, so the next
   * sweep reads it instead of rediscovering the gap.
   */
  ROW_DISPOSITION: Readonly<Record<DyRowName, RowDisposition>>

  // ─── The retrofitted jt2 knobs, now sourced HERE (user ruling A) ───────────
  /** EMYTIM: 2 on waves 1-2, else 1 (JOUSTRV4.SRC:2202-2205). The value jt2's stub must keep. */
  emytimForWave(wave: number): number

  /** The lava surface Y for a 1-based wave: $EA → $E5 → $E0, then flat (JOUSTRV4.SRC:1929-1933). */
  lavaLevelForWave(wave: number): number

  /**
   * The pursuit-nibble budget seed for a wave row — {nsmart:0, wsmart: row.pursuers}
   * (WPERSUE, ANDA #$0F / STA WSMART, JOUSTRV4.SRC:2075-2077). Equals jt2's
   * enemy.seedBudget(row.pursuers) / wave.seedWaveBudget(row).
   */
  seedBudgetForRow(row: WaveRow): IntelBudget
}

/**
 * Load the not-yet-built difficulty engine with a self-describing failure — the
 * loadWave/loadEnemy pattern. The specifier is assembled at runtime so the
 * bundler cannot resolve it statically and fail the whole FILE at collection.
 *
 * RED today: `src/core/difficulty.ts` does not exist, so this throws "difficulty
 * engine not built yet" per test — a clean "feature absent" red, never a
 * module-resolution trace or a type error.
 */
export async function loadDifficulty(): Promise<DifficultyModule> {
  const specifier = ['..', '..', 'src', 'core', 'difficulty.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<DifficultyModule>
    for (const fn of [
      'ga1StartColumn',
      'stepNibble',
      'difficultyValue',
      'emytimForWave',
      'lavaLevelForWave',
      'seedBudgetForRow',
      // uf1-2 — the named per-wave seam.
      'dyRow',
      'waveValue',
    ] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    for (const c of [
      'DIFFICULTY_TABLE',
      'DYTBL_ROW_COUNT',
      'DYWORD_LEN',
      'GA1_DEFAULT',
      // uf1-2 — the row labels + the total disposition inventory.
      'DYTBL_ROW_NAMES',
      'ROW_DISPOSITION',
    ] as const) {
      if (mod[c] === undefined) throw new Error(`module has no \`${c}\` export`)
    }
    return mod as DifficultyModule
  } catch (e) {
    throw new Error(
      'difficulty engine not built yet — GREEN (Julia) creates joust/src/core/difficulty.ts to ' +
        'satisfy tests/helpers/difficulty-contract.ts: the 28-row DIFFICULTY_TABLE decode ' +
        '(committed data, byte-gated against JOUSTRV4.SRC:7304-7331 via the DYWORD macro), ' +
        'ga1StartColumn (the 0-3/4-6/7+ tiers), stepNibble + difficultyValue (the IWAVE ' +
        'walk-once-per-wave-then-plateau), and the RETROFITTED jt2 knobs sourced here — ' +
        'emytimForWave, lavaLevelForWave, seedBudgetForRow — which src/core/wave.ts and ' +
        'src/core/arena.ts then delegate to (bit-for-bit unchanged, the jt2-1 migration bar). ' +
        'uf1-2 adds the NAMED per-wave seam production calls — DYTBL_ROW_NAMES / dyRow / ' +
        'waveValue — plus ROW_DISPOSITION, the total 28-row inventory. ' +
        'Also commit docs/rom-study/claims/difficulty.json (JT31-*). ' +
        `(${(e as Error).message})`,
    )
  }
}
