// src/core/wave.ts
//
// Story jt2-5 (GREEN, Julia) — the wave machine core: the CIA process
// (JOUSTRV4.SRC:1875). The full 90-row WAVTBL decode with its loop-at-81 and the
// $00,$AF late-wave plateau, the independent BCD 0-99 wave counter, the six-type
// WJSRTB dispatch skeleton with the survival/co-op-live degrade laws, the
// negative claims (phantom types 12/14, wave 0 never played), the ~1 s message
// beats with NO pinned durations, the budget/EMYTIM seeding into jt2-2's inputs,
// and the IFN DEBUG wave oracles.
//
// CORE: pure functions over plain data — no clock, no ambient entropy, no
// browser surface, no shell import (the jt1-7 purity scanner sweeps this file).
// The intelligence-budget laws themselves live in enemy.ts (jt2-2); this module
// SEEDS and CADENCES that budget from the wave table, and reuses enemy.seedBudget
// verbatim so the two stay one law.
//
// The behaviour is pinned by tests/wave.test.ts; the ROM-law provenance + the
// 90-row byte gate by tests/wave-source.test.ts (which re-derives the table
// INDEPENDENTLY of this decoder); every newly-cited range carries a JT25-* claim
// in docs/rom-study/claims/wave.json (byte-verified against the vendored 1982
// Williams source, JOUSTRV4.SRC).

import { INTEL_GROWTH_FRAMES, type IntelBudget } from './enemy.js'
import { emytimForWave as difficultyEmytim, seedBudgetForRow } from './difficulty.js'
import type { GameState } from './frame.js'

export type { IntelBudget, GameState }

// ─── Types ────────────────────────────────────────────────────────────────

/**
 * A decoded WAVTBL row (JOUSTRV4.SRC:175-181). On the wire it is four bytes,
 * nibble-packed; the decoder unpacks them into named counts + the raw status.
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

/** A wave type AFTER the degrade-by-player-count laws. */
export type ResolvedWaveType = RawWaveType | 'survival'

/** Which players are still in the game (SPLY1+6 / SPLY2+6). */
export interface PlayersAlive {
  p1: boolean
  p2: boolean
}

/** One wave-message beat (the WAVMSG text seam). Carries the message and NOTHING else. */
export interface Beat {
  message: string
}

// ─── The decoded table (byte-gated against JOUSTRV4.SRC:2439-2545) ──────────
//
// Waves 1-90, decoded from the nibble-packed FCB rows. Each row's four wire
// bytes are `bounders:hunters / lords:pursuers / pterodactyls / status`. The
// committed decode below re-derives byte-for-byte from the vendored source (the
// jt1-3 byte gate, tests/wave-source.test.ts) — this is DATA, not a computation.

export const WAVE_TABLE: readonly WaveRow[] = Object.freeze([
  { bounders: 3, hunters: 0, lords: 0, pursuers: 1, pterodactyls: 0, status: 0x02 }, // wave 1
  { bounders: 4, hunters: 0, lords: 0, pursuers: 1, pterodactyls: 0, status: 0x04 }, // wave 2
  { bounders: 6, hunters: 0, lords: 0, pursuers: 2, pterodactyls: 0, status: 0x00 }, // wave 3
  { bounders: 3, hunters: 3, lords: 0, pursuers: 1, pterodactyls: 0, status: 0x06 }, // wave 4
  { bounders: 6, hunters: 0, lords: 0, pursuers: 1, pterodactyls: 0, status: 0x08 }, // wave 5
  { bounders: 3, hunters: 3, lords: 0, pursuers: 3, pterodactyls: 0, status: 0x41 }, // wave 6
  { bounders: 2, hunters: 4, lords: 0, pursuers: 2, pterodactyls: 0, status: 0x75 }, // wave 7
  { bounders: 0, hunters: 6, lords: 0, pursuers: 1, pterodactyls: 1, status: 0x7b }, // wave 8
  { bounders: 0, hunters: 6, lords: 0, pursuers: 2, pterodactyls: 0, status: 0xf7 }, // wave 9
  { bounders: 8, hunters: 0, lords: 0, pursuers: 3, pterodactyls: 0, status: 0x08 }, // wave 10
  { bounders: 3, hunters: 5, lords: 0, pursuers: 3, pterodactyls: 0, status: 0x01 }, // wave 11
  { bounders: 2, hunters: 6, lords: 0, pursuers: 2, pterodactyls: 0, status: 0x85 }, // wave 12
  { bounders: 0, hunters: 7, lords: 0, pursuers: 3, pterodactyls: 1, status: 0xfb }, // wave 13
  { bounders: 0, hunters: 8, lords: 0, pursuers: 4, pterodactyls: 0, status: 0xf7 }, // wave 14
  { bounders: 0, hunters: 6, lords: 0, pursuers: 2, pterodactyls: 0, status: 0x08 }, // wave 15
  { bounders: 0, hunters: 5, lords: 1, pursuers: 15, pterodactyls: 0, status: 0x00 }, // wave 16
  { bounders: 0, hunters: 5, lords: 1, pursuers: 15, pterodactyls: 0, status: 0x04 }, // wave 17
  { bounders: 0, hunters: 5, lords: 1, pursuers: 15, pterodactyls: 2, status: 0x0a }, // wave 18
  { bounders: 0, hunters: 4, lords: 2, pursuers: 15, pterodactyls: 0, status: 0x06 }, // wave 19
  { bounders: 0, hunters: 6, lords: 0, pursuers: 3, pterodactyls: 0, status: 0x08 }, // wave 20
  { bounders: 0, hunters: 3, lords: 3, pursuers: 15, pterodactyls: 0, status: 0x31 }, // wave 21
  { bounders: 0, hunters: 2, lords: 4, pursuers: 15, pterodactyls: 0, status: 0x35 }, // wave 22
  { bounders: 0, hunters: 2, lords: 4, pursuers: 15, pterodactyls: 2, status: 0xbb }, // wave 23
  { bounders: 0, hunters: 2, lords: 4, pursuers: 15, pterodactyls: 0, status: 0xb7 }, // wave 24
  { bounders: 0, hunters: 6, lords: 0, pursuers: 4, pterodactyls: 0, status: 0x08 }, // wave 25
  { bounders: 0, hunters: 3, lords: 5, pursuers: 15, pterodactyls: 0, status: 0xf1 }, // wave 26
  { bounders: 0, hunters: 3, lords: 5, pursuers: 15, pterodactyls: 0, status: 0xf5 }, // wave 27
  { bounders: 0, hunters: 2, lords: 4, pursuers: 15, pterodactyls: 2, status: 0xfb }, // wave 28
  { bounders: 0, hunters: 3, lords: 5, pursuers: 15, pterodactyls: 0, status: 0xf7 }, // wave 29
  { bounders: 0, hunters: 6, lords: 0, pursuers: 3, pterodactyls: 0, status: 0x08 }, // wave 30
  { bounders: 0, hunters: 4, lords: 4, pursuers: 15, pterodactyls: 0, status: 0x01 }, // wave 31
  { bounders: 0, hunters: 2, lords: 6, pursuers: 15, pterodactyls: 0, status: 0x05 }, // wave 32
  { bounders: 0, hunters: 2, lords: 4, pursuers: 15, pterodactyls: 2, status: 0x4b }, // wave 33
  { bounders: 0, hunters: 2, lords: 6, pursuers: 15, pterodactyls: 0, status: 0x47 }, // wave 34
  { bounders: 0, hunters: 8, lords: 0, pursuers: 5, pterodactyls: 0, status: 0x08 }, // wave 35
  { bounders: 0, hunters: 2, lords: 6, pursuers: 15, pterodactyls: 0, status: 0x81 }, // wave 36
  { bounders: 0, hunters: 0, lords: 8, pursuers: 15, pterodactyls: 0, status: 0x85 }, // wave 37
  { bounders: 0, hunters: 0, lords: 6, pursuers: 15, pterodactyls: 2, status: 0xcb }, // wave 38
  { bounders: 0, hunters: 0, lords: 8, pursuers: 15, pterodactyls: 0, status: 0xc7 }, // wave 39
  { bounders: 0, hunters: 8, lords: 0, pursuers: 5, pterodactyls: 0, status: 0x08 }, // wave 40
  { bounders: 0, hunters: 3, lords: 7, pursuers: 15, pterodactyls: 0, status: 0x31 }, // wave 41
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0xb5 }, // wave 42
  { bounders: 0, hunters: 0, lords: 7, pursuers: 15, pterodactyls: 3, status: 0xbb }, // wave 43
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0xf7 }, // wave 44
  { bounders: 0, hunters: 8, lords: 0, pursuers: 6, pterodactyls: 0, status: 0x08 }, // wave 45
  { bounders: 0, hunters: 3, lords: 7, pursuers: 15, pterodactyls: 0, status: 0x01 }, // wave 46
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0x05 }, // wave 47
  { bounders: 0, hunters: 0, lords: 7, pursuers: 15, pterodactyls: 3, status: 0x0b }, // wave 48
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0x87 }, // wave 49
  { bounders: 0, hunters: 8, lords: 0, pursuers: 6, pterodactyls: 0, status: 0x08 }, // wave 50
  { bounders: 0, hunters: 3, lords: 7, pursuers: 15, pterodactyls: 0, status: 0x31 }, // wave 51
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0xb5 }, // wave 52
  { bounders: 0, hunters: 0, lords: 7, pursuers: 15, pterodactyls: 3, status: 0xbb }, // wave 53
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0xf7 }, // wave 54
  { bounders: 0, hunters: 8, lords: 0, pursuers: 15, pterodactyls: 0, status: 0x08 }, // wave 55
  { bounders: 0, hunters: 3, lords: 7, pursuers: 15, pterodactyls: 0, status: 0x01 }, // wave 56
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0x05 }, // wave 57
  { bounders: 0, hunters: 0, lords: 7, pursuers: 15, pterodactyls: 3, status: 0x0b }, // wave 58
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0x87 }, // wave 59
  { bounders: 0, hunters: 0, lords: 6, pursuers: 3, pterodactyls: 0, status: 0x08 }, // wave 60
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0x31 }, // wave 61
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0xb5 }, // wave 62
  { bounders: 0, hunters: 0, lords: 7, pursuers: 15, pterodactyls: 3, status: 0xbb }, // wave 63
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0xf7 }, // wave 64
  { bounders: 0, hunters: 0, lords: 6, pursuers: 4, pterodactyls: 0, status: 0x08 }, // wave 65
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0x01 }, // wave 66
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0x05 }, // wave 67
  { bounders: 0, hunters: 0, lords: 7, pursuers: 15, pterodactyls: 3, status: 0x0b }, // wave 68
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0x87 }, // wave 69
  { bounders: 0, hunters: 0, lords: 6, pursuers: 5, pterodactyls: 0, status: 0x08 }, // wave 70
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0x31 }, // wave 71
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0xb5 }, // wave 72
  { bounders: 0, hunters: 0, lords: 7, pursuers: 15, pterodactyls: 3, status: 0xbb }, // wave 73
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0xf7 }, // wave 74
  { bounders: 0, hunters: 0, lords: 6, pursuers: 15, pterodactyls: 0, status: 0x08 }, // wave 75
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0x01 }, // wave 76
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0x05 }, // wave 77
  { bounders: 0, hunters: 0, lords: 7, pursuers: 15, pterodactyls: 3, status: 0x0b }, // wave 78
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0x87 }, // wave 79
  { bounders: 0, hunters: 0, lords: 8, pursuers: 6, pterodactyls: 0, status: 0x08 }, // wave 80
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0x31 }, // wave 81 (WTBRST)
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0xb5 }, // wave 82
  { bounders: 0, hunters: 0, lords: 7, pursuers: 15, pterodactyls: 3, status: 0xbb }, // wave 83
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0xf7 }, // wave 84
  { bounders: 0, hunters: 0, lords: 8, pursuers: 15, pterodactyls: 0, status: 0x08 }, // wave 85
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0x01 }, // wave 86
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0x05 }, // wave 87
  { bounders: 0, hunters: 0, lords: 7, pursuers: 15, pterodactyls: 3, status: 0x0b }, // wave 88
  { bounders: 0, hunters: 0, lords: 10, pursuers: 15, pterodactyls: 0, status: 0x87 }, // wave 89
  { bounders: 0, hunters: 0, lords: 8, pursuers: 15, pterodactyls: 0, status: 0x08 }, // wave 90
].map((r) => Object.freeze(r)))

/** 90 — the number of committed rows (waves 1-90). */
export const WAVE_TABLE_LEN = 90

/** 81 — the 1-based wave the pointer loops back to (WTBRST, JOUSTRV4.SRC:2535). */
export const WAVE_LOOP_START = 81

/** The number of rows in the loop region (waves 81-90). */
const WAVE_LOOP_LEN = WAVE_TABLE_LEN - WAVE_LOOP_START + 1 // 10

/**
 * The row for a 1-based wave number, resolving the loop-at-81
 * (JOUSTRV4.SRC:2015-2021). Waves 1-90 read the table directly; wave 91 loops to
 * wave 81's row and so on forever. Throws for a wave < 1 — wave 0 is never played
 * (PWAVE advances before the first wave, JOUSTRV4.SRC:1878).
 */
export function waveRowAt(waveNumber: number): WaveRow {
  if (!Number.isInteger(waveNumber) || waveNumber < 1) {
    throw new Error(`there is no wave ${waveNumber} — waves are 1-based and wave 0 is never played`)
  }
  if (waveNumber <= WAVE_TABLE_LEN) return WAVE_TABLE[waveNumber - 1]
  // Loop region: array index (WAVE_LOOP_START-1) + offset within the 10-row loop.
  const offset = (waveNumber - WAVE_LOOP_START) % WAVE_LOOP_LEN
  return WAVE_TABLE[WAVE_LOOP_START - 1 + offset]
}

/**
 * WENEMY — how many enemies this wave may hold at once, and therefore how many
 * settled eggs may hatch before the rest are held back (EGGLND's
 * `LDA NENEMY / CMPA WENEMY / BHS EGGLN2`, JOUSTRV4.SRC:3239-3241).
 *
 * A NORMAL wave has NO quota. WNRM loads the immediate 255 and stores it —
 * "MAXIMIM ENEMIES FOR A NORMAL WAVE" (JOUSTRV4.SRC:1991-1992) — and every
 * wave-advance path converges on WNRM (the four branches at JOUSTRV4.SRC:1937,
 * :1952, :1955, :1957). So outside an egg wave the comparison can never be taken
 * and every settled egg matures the instant its timer runs out. That is faithful:
 * it is where jt9-9's kill-eggs live.
 *
 * Only the EGG-wave setup overwrites it, with the row's own ground nibble —
 * `STA WENEMY  NUMBER OF ENEMIES TO HATCH AT A TIME` (JOUSTRV4.SRC:2759), fed by
 * the three-way select at JOUSTRV4.SRC:2744-2759:
 *
 *     LDA WBOUND,X   /  BNE 1$        byte0 non-zero?
 *   1$ BITA #$0F     /  BNE 3$          → low nibble non-zero: the HUNTER count
 *     (fall through) /  2$ LSRA x4      → else the HIGH nibble: the BOUNDER count
 *     (byte0 zero)      LDA WLORD,X     → else WLORD's HIGH nibble: the LORDS
 *   3$ ANDA #$0F
 *
 * Every one of the eighteen shipped egg rows carries exactly one non-zero ground
 * nibble, so on real data the select is indistinguishable from summing the three.
 * It is written as the select anyway, because that is what the machine does — and
 * `demo-jt9-38.test.ts` pins the difference on a fabricated row, since no real one
 * can.
 */
export function wenemyFor(row: WaveRow): number {
  if (rawWaveType(row.status) !== 'egg') return 255
  const byte0 = (row.bounders << 4) | row.hunters
  if (byte0 !== 0) return (byte0 & 0x0f) !== 0 ? byte0 & 0x0f : (byte0 >> 4) & 0x0f
  return (((row.lords << 4) | row.pursuers) >> 4) & 0x0f
}

/**
 * One BCD increment of the wave counter (LDA WAVBCD / ADDA #$01 / DAA,
 * JOUSTRV4.SRC:2001-2004): the byte is BCD (0x00..0x99), so 0x09→0x10 and
 * 0x99→0x00 (rollover). INDEPENDENT of the table index.
 */
export function nextWaveBcd(bcd: number): number {
  const decimal = (bcd >> 4) * 10 + (bcd & 0x0f)
  const next = (decimal + 1) % 100
  return (Math.floor(next / 10) << 4) | next % 10
}

/**
 * The 1-based DECIMAL wave ordinal for a WAVBCD counter byte — the inverse of the
 * packing `nextWaveBcd` applies. `demo.wave` holds the packed byte; every API here
 * that documents "a 1-based wave" wants the ordinal, and the two agree only for
 * waves 1-9 (the tenth wave's counter is `0x10`, which as a plain number is 16).
 *
 * THROWS for a byte that is not valid BCD. That is the guard that matters: a
 * DECIMAL wave arriving where the packed counter belongs is the confusion this
 * function exists to end, and `$0A`-`$0F` in either nibble is unreachable from
 * `nextWaveBcd`, so its arrival means a caller has mixed the units. Answering
 * quietly (`0x0A → 10`) would hide that forever.
 *
 * The rolled-over `0x00` reads as **100**. `nextWaveBcd` wraps `0x99 → 0x00`, so
 * the hundredth wave's counter is zero — and zero is not a wave, so it would reach
 * `waveValue` (difficulty.ts) and throw in the middle of a frame.
 *
 * KNOWN DIVERGENCE ABOVE WAVE 100 — and it is a reset, not a drift. Wave 101's
 * counter is `0x01`, indistinguishable from wave 1's, so this returns 1 and the
 * whole hundred-wave difficulty climb COLLAPSES to its opening value, then re-climbs
 * on the same curve, once per hundred waves. Two BCD digits cannot say which hundred
 * they are on, so nothing here can do better. The 1982 cabinet has no such problem:
 * WAVBCD is display-only — its sole read in the entire source is
 * `LDA WAVBCD / … / JMP OUTBCD` at :2399-2403 — while the wave table walks on the
 * separate `PWAVE` pointer (:2011-2019) and the DYTBL difficulty on a per-row RAM
 * countdown fired from IWAVE at each wave end (:945, :2099), both monotone and
 * neither resetting. The fix is a monotone wave count in DemoState — **td1-12**,
 * whose option (B) this makes the faithful choice rather than merely the simpler
 * one. Pinned by `tests/difficulty-wiring.test.ts` R2-3 so it stays visible.
 *
 * Kept separate from `nextWaveBcd` even though the two share arithmetic: the
 * increment has no business rejecting a byte, and this has no business wrapping
 * one. (Substituting this inside the increment happens to be behaviour-preserving
 * — `% 100` absorbs the 0 → 100 mapping — so the separation is a concerns
 * argument, not a correctness one. Do not read it as an off-by-one hazard.)
 */
export function decimalWaveFromBcd(counter: number): number {
  // Both clauses here are load-bearing, and there is deliberately NO `> 0x99`
  // upper bound: every value above it has a nibble over 9 and is rejected below,
  // so the bound could never be the clause that fires. A negative multiple of 16
  // (`-16` → tens -1, ones 0) and a non-integer (`1.5`, `NaN`) are the two shapes
  // the nibble check cannot see, and both would otherwise answer silently.
  if (!Number.isInteger(counter) || counter < 0x00) {
    throw new RangeError(`not a WAVBCD counter byte: ${counter}`)
  }
  const tens = counter >> 4
  const ones = counter & 0x0f
  if (tens > 9 || ones > 9) {
    throw new RangeError(
      `0x${counter.toString(16)} is not BCD — a decimal wave reached the counter seam`,
    )
  }
  const decimal = tens * 10 + ones
  return decimal === 0 ? 100 : decimal
}

// ─── The six-type WJSRTB dispatch skeleton ──────────────────────────────────

/** The six real types, in WJSRTB order (JOUSTRV4.SRC:2586-2591). */
export const WAVE_TYPES: readonly RawWaveType[] = Object.freeze([
  'nop',
  'intro',
  'coop',
  'gladiator',
  'egg',
  'ptero',
])

/**
 * The phantom WBJSR offsets 12 and 14 as TYPE INDICES 6 and 7 — the JSR-table
 * offsets the comment lists (JOUSTRV4.SRC:187) that the six-entry table never
 * implements. They appear in NO wave.
 */
export const PHANTOM_TYPE_INDICES: readonly number[] = Object.freeze([6, 7])

/** The WJSRTB type index for a status byte: `(status & $0E) >> 1`. 0-7. */
export function waveTypeIndex(status: number): number {
  return (status & 0x0e) >> 1
}

/** The raw type name for a status byte; THROWS for a phantom index (6/7). */
export function rawWaveType(status: number): RawWaveType {
  const idx = waveTypeIndex(status)
  const type = WAVE_TYPES[idx]
  if (type === undefined) {
    throw new Error(
      `wave type index ${idx} is a phantom WBJSR offset (12/14, JOUSTRV4.SRC:187) — ` +
        'the six-entry WJSRTB table never implements it',
    )
  }
  return type
}

/**
 * The RESOLVED wave type after the degrade laws (JOUSTRV4.SRC:2628-2631,
 * 2697-2700): 'coop' becomes 'survival' unless BOTH players are alive; 'gladiator'
 * becomes 'nop' unless both are alive; every other type is unchanged. Throws for
 * a phantom status.
 */
export function dispatchWaveType(status: number, players: PlayersAlive): ResolvedWaveType {
  const raw = rawWaveType(status)
  const bothAlive = players.p1 && players.p2
  if (raw === 'coop') return bothAlive ? 'coop' : 'survival'
  if (raw === 'gladiator') return bothAlive ? 'gladiator' : 'nop'
  return raw
}

/** The high-nibble cliff-destruction bits as DATA (`status & $F0`); no behaviour. */
export function cliffBits(status: number): number {
  return status & 0xf0
}

// ─── Message beats (the WAVMSG text seam — NO durations) ────────────────────
//
// The ordered WAVMSG calls each WJSRTB routine emits, as message labels only.
// Delays are ~1 s (`#180/6`, `#90/6`, JOUSTRV4.SRC:2045,2601) and the SHELL owns
// them, so a Beat carries WHICH message and nothing else.

const BEATS: Readonly<Record<ResolvedWaveType, readonly Beat[]>> = Object.freeze({
  nop: Object.freeze([]),
  intro: Object.freeze([{ message: 'INTRO1' }, { message: 'INTRO2' }]),
  coop: Object.freeze([{ message: 'COOP1' }, { message: 'COOP2' }]),
  survival: Object.freeze([{ message: 'SURV1' }]),
  gladiator: Object.freeze([{ message: 'GLAD1' }, { message: 'GLAD2' }, { message: 'GLAD3' }]),
  egg: Object.freeze([{ message: 'EGG1' }]),
  ptero: Object.freeze([{ message: 'PTER1' }]),
})

/** The ordered message beats a resolved type emits. No durations. 'nop' emits none. */
export function waveBeats(type: ResolvedWaveType): readonly Beat[] {
  return BEATS[type]
}

// ─── Seeding into jt2-2's budget inputs ─────────────────────────────────────

/** `EMYTIM` on waves 1-2 = 2 (the divider). */
export const EMYTIM_SLOW = 2

/** `EMYTIM` default = 1 (NO ENEMY SLOW DOWN). */
export const EMYTIM_NORMAL = 1

/**
 * EMYTIM for a 1-based wave number: 2 on waves 1-2, else 1 (JOUSTRV4.SRC:2202-2205).
 * jt3-1 retrofit (user ruling A): the value is now SOURCED from the centralized
 * difficulty engine — the same IWAVE inter-wave pass — not computed here. The
 * realized value is bit-for-bit unchanged (the jt2-1 migration bar).
 */
export function emytimForWave(waveNumber: number): number {
  return difficultyEmytim(waveNumber)
}

/**
 * Seed the intelligence budget from a wave's pursuit nibble — the jt2-2 input.
 * jt3-1 retrofit (user ruling A): sourced from the centralized difficulty engine's
 * seedBudgetForRow (which reuses enemy.seedBudget), so the wave machine, the
 * difficulty engine, and the budget stay ONE law (ANDA #$0F / STA WSMART,
 * JOUSTRV4.SRC:2076-2077). The realized value is bit-for-bit unchanged.
 */
export function seedWaveBudget(row: WaveRow): IntelBudget {
  return seedBudgetForRow(row)
}

/** 896 — the CIA growth cadence (112 naps × 8 frames, JOUSTRV4.SRC:2094-2096). */
export const CIA_GROWTH_FRAMES = INTEL_GROWTH_FRAMES

/**
 * Whether the 15-second growth timer fires after `elapsedFrames` — true at each
 * whole multiple of CIA_GROWTH_FRAMES (896), false otherwise and at 0.
 */
export function growthDue(elapsedFrames: number): boolean {
  return elapsedFrames > 0 && elapsedFrames % CIA_GROWTH_FRAMES === 0
}

// ─── The carried seam: budget on GameState ──────────────────────────────────

/** Put a budget on a GameState (pure) — the wave machine's seed onto the sim. */
export function withBudget(state: GameState, budget: IntelBudget): GameState {
  return { ...state, budget }
}

// ─── IFN DEBUG bookkeeping oracles ──────────────────────────────────────────

/**
 * The wave-boundary invariants (JOUSTRV4.SRC:1983,2966-2970): NSMART must be 0
 * (the ledger balanced) and the active-enemy count must be >= 0. Returns silently
 * when clean; THROWS a self-describing error otherwise — the author's own SWI.
 */
export function assertWaveEndClean(budget: IntelBudget, activeEnemies: number): void {
  if (budget.nsmart !== 0) {
    throw new Error(
      `NSMART had better be zero at a wave boundary (JOUSTRV4.SRC:1983) — got ${budget.nsmart}`,
    )
  }
  if (activeEnemies < 0) {
    throw new Error(
      `NENEMY must not go negative (the BPL/SWI oracle, JOUSTRV4.SRC:2966-2970) — got ${activeEnemies}`,
    )
  }
}
