// tests/difficulty.test.ts
//
// Story jt3-1 — RED phase (Leeloo / TEA). The BEHAVIOUR suite for the centralized
// difficulty engine (user ruling A): the DYTBL 28-row decode, the GA1 starting-
// column tiers, the IWAVE walk-once-per-wave-then-plateau law, and the RETROFIT
// that re-points jt2's three per-wave stubs (EMYTIM / lava-level / budget seed) to
// read from this engine WITHOUT changing any wave's realized value. The ROM-law
// provenance + the 28-row byte gate live in tests/difficulty-source.test.ts (which
// re-derives the DYWORD rows INDEPENDENTLY of this module's decoder).
//
// RED today: src/core/difficulty.ts does not exist, so loadDifficulty() throws a
// self-describing "difficulty engine not built yet" per test — a clean feature-
// absent red, never a module-resolution trace.
//
// ─── THE WALK, RE-SIMULATED INDEPENDENTLY (the double entry for AC-3) ─────────
// AC-3 is proven the double-entry way: `refWalk` below is a second, wholly
// independent simulation of the IWAVE walk (JOUSTRV4.SRC:1890-1926) over the
// byte-gated DyRow, and the module's difficultyValue must reproduce it. refWalk
// implements the traced contract: the RAM copy seeds to starts[tier] with a
// countdown timer of 2 (:945), once per wave-advance it adds the sign-extended
// DYWINC and CLAMPS at DYWEND on the per-difficulty nibble cadence (:1899-1922).

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadDifficulty, type DyRow } from './helpers/difficulty-contract.js'
import { loadWave } from './helpers/wave-contract.js'
import { loadArena } from './helpers/arena-contract.js'
import { violations } from './helpers/purity-scanner.js'

const coreDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'core')

// ─────────────────────────────────────────────────────────────────────────────
// The independent reference walk (never touches the module under test).
// ─────────────────────────────────────────────────────────────────────────────
const s16 = (v: number): number => {
  v &= 0xffff
  return v & 0x8000 ? v - 0x10000 : v
}
const s8 = (v: number): number => {
  v &= 0xff
  return v & 0x80 ? v - 0x100 : v
}
const tier = (ga1: number): number => (ga1 <= 3 ? 0 : ga1 <= 6 ? 1 : 2)
const refNibble = (row: DyRow, ga1: number): number => {
  const byte = row.timeBytes[Math.floor(ga1 / 2)] & 0xff
  return ga1 % 2 === 0 ? (byte >> 4) & 0xf : byte & 0xf
}
function refWalk(row: DyRow, ga1: number, wave: number): number {
  const inc = s8(row.inc)
  const end = s16(row.end)
  const nib = refNibble(row, ga1)
  const stepOnce = (value: number): number => {
    const next = s16(value + inc)
    return inc >= 0 ? (next < end ? next : end) : next > end ? next : end
  }
  let value = s16(row.starts[tier(ga1)])
  let timer = 2 // JOUSTRV4.SRC:945-946 — LDA #2 / STA 2,Y
  for (let p = 1; p <= wave - 1; p++) {
    if (timer === 0) {
      value = stepOnce(value)
      timer = nib
    } else {
      timer -= 1
      if (timer === 0) {
        value = stepOnce(value)
        timer = nib
      }
    }
  }
  return value
}

const byName = (table: readonly DyRow[], n: string): DyRow => {
  const r = table.find((row) => row.name === n)
  if (!r) throw new Error(`no committed DYWORD row named ${n}`)
  return r
}

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — THE 28-ROW DYTBL DECODE.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-1 — the DYTBL decode (28 DYWORD rows)', () => {
  it('decodes exactly 28 rows, each the 14-byte DYWORD struct', async () => {
    const d = await loadDifficulty()
    expect(d.DYTBL_ROW_COUNT).toBe(28)
    expect(d.DIFFICULTY_TABLE.length).toBe(28)
    expect(d.DYWORD_LEN, 'DYWLEN = 14 (JOUSTRV4.SRC:208)').toBe(14)
    for (const r of d.DIFFICULTY_TABLE) {
      expect(r.starts.length, 'DYWST0/1/2 — three start columns').toBe(3)
      expect(r.timeBytes.length, 'DYWTIM — five nibble-time bytes').toBe(5)
      expect(Number.isInteger(r.end)).toBe(true)
      expect(Number.isInteger(r.inc)).toBe(true)
    }
  })

  it('the struct is NOT a bare start→end pair — three starts, an end, a 5-byte cadence, a signed inc', async () => {
    const d = await loadDifficulty()
    // LAVTIM (row 1): $000B,$0006,$0004 (three tier starts), inc -01, end $0001, TIM $FA86,$4433,$21.
    const lavtim = byName(d.DIFFICULTY_TABLE, 'LAVTIM')
    expect(lavtim.starts).toEqual([0x0b, 0x06, 0x04])
    expect(lavtim.end).toBe(0x01)
    expect(lavtim.inc, 'DYWINC raw byte for -01').toBe(0xff)
    expect(lavtim.timeBytes).toEqual([0xfa, 0x86, 0x44, 0x33, 0x21])
  })

  it('decodes a positive-increment, big-value row (the macro INCRE/ENDV order trap)', async () => {
    const d = await loadDifficulty()
    // BODNVY: $0080,$0100,$0200,$20,$0300,$4211,$F813,$21. INCRE ($20) is the 4th
    // operand but the LAST byte; ENDV ($0300) sits before the time words.
    const bodnvy = byName(d.DIFFICULTY_TABLE, 'BODNVY')
    expect(bodnvy.starts).toEqual([0x80, 0x100, 0x200])
    expect(bodnvy.end, 'ENDV = $0300, not the increment').toBe(0x300)
    expect(bodnvy.inc, 'DYWINC = $20 (+32), the LAST emitted byte').toBe(0x20)
    expect(bodnvy.timeBytes).toEqual([0x42, 0x11, 0xf8, 0x13, 0x21])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — THE GA1 STARTING-COLUMN TIERS (proven at two tiers: low 0-3, high 7+).
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-1 — GA1 buckets into three start-column tiers (0-3 / 4-6 / 7+)', () => {
  it('maps every GA1 value to its start column, both boundaries', async () => {
    const d = await loadDifficulty()
    expect(d.GA1_DEFAULT, 'the operator factory default').toBe(5)
    // Tier 0 (columns DYWST0): GA1 0..3.
    for (const ga1 of [0, 1, 2, 3]) expect(d.ga1StartColumn(ga1), `GA1 ${ga1} → column 0`).toBe(0)
    // Tier 1 (DYWST1): GA1 4..6.
    for (const ga1 of [4, 5, 6]) expect(d.ga1StartColumn(ga1), `GA1 ${ga1} → column 1`).toBe(1)
    // Tier 2 (DYWST2): GA1 7..9.
    for (const ga1 of [7, 8, 9]) expect(d.ga1StartColumn(ga1), `GA1 ${ga1} → column 2`).toBe(2)
  })

  it('a low tier (0-3) and a high tier (7+) seed DIFFERENT start values on wave 1', async () => {
    const d = await loadDifficulty()
    const lavtim = byName(d.DIFFICULTY_TABLE, 'LAVTIM') // starts [11, 6, 4]
    // Low tier reads DYWST0; high tier reads DYWST2 — the wave-1 value is the start.
    expect(d.difficultyValue(lavtim, 2, 1), 'GA1 2 (low tier) starts at DYWST0 = 11').toBe(0x0b)
    expect(d.difficultyValue(lavtim, 7, 1), 'GA1 7 (high tier) starts at DYWST2 = 4').toBe(0x04)
    expect(d.difficultyValue(lavtim, 5, 1), 'GA1 5 (default, mid tier) starts at DYWST1 = 6').toBe(0x06)
    expect(d.difficultyValue(lavtim, 2, 1)).not.toBe(d.difficultyValue(lavtim, 7, 1))
  })

  it('decodes the per-difficulty cadence nibble (high half on even GA1, low on odd)', async () => {
    const d = await loadDifficulty()
    const lavtim = byName(d.DIFFICULTY_TABLE, 'LAVTIM') // TIM $FA,$86,$44,$33,$21
    // byte[0]=$FA → GA1 0 (even) = $F = 15, GA1 1 (odd) = $A = 10; byte[4]=$21 → GA1 9 (odd) = 1.
    expect(d.stepNibble(lavtim, 0)).toBe(15)
    expect(d.stepNibble(lavtim, 1)).toBe(10)
    expect(d.stepNibble(lavtim, 9)).toBe(1)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — THE IWAVE WALK: start → end by the per-difficulty step, once per wave,
// then PLATEAU. Proven against the independent reference simulation + robust laws.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-3 — a difficulty value walks start→end then plateaus at the end value', () => {
  it('reproduces the independent reference walk (LAVTIM at GA1 9, every-wave cadence)', async () => {
    const d = await loadDifficulty()
    const lavtim = byName(d.DIFFICULTY_TABLE, 'LAVTIM')
    // refWalk: 4,4,3,2,1,1,1,… — start 4 (DYWST2), steps by -1 to end 1, then flat.
    const module = [...Array(14)].map((_, i) => d.difficultyValue(lavtim, 9, i + 1))
    const ref = [...Array(14)].map((_, i) => refWalk(lavtim, 9, i + 1))
    expect(module).toEqual(ref)
    expect(module.slice(0, 6), 'walks 4→…→1 by the -1 step').toEqual([4, 4, 3, 2, 1, 1])
  })

  it('reproduces the reference walk under a SLOW cadence (BOUPWD at GA1 0, nibble 15)', async () => {
    const d = await loadDifficulty()
    const boupwd = byName(d.DIFFICULTY_TABLE, 'BOUPWD') // starts [3,2,1], inc -1, end 1
    const module = [...Array(40)].map((_, i) => d.difficultyValue(boupwd, 0, i + 1))
    const ref = [...Array(40)].map((_, i) => refWalk(boupwd, 0, i + 1))
    expect(module).toEqual(ref)
    // The cadence gates the steps: it does NOT collapse to the end in two waves.
    expect(module[0], 'wave 1 is the start').toBe(3)
    expect(module[39], 'far past the walk length it is the end').toBe(1)
  })

  it('plateaus at the end value forever once reached (a wave past the walk length = end)', async () => {
    const d = await loadDifficulty()
    const lavtim = byName(d.DIFFICULTY_TABLE, 'LAVTIM')
    const end = s16(lavtim.end)
    expect(d.difficultyValue(lavtim, 9, 50), 'deep wave').toBe(end)
    expect(d.difficultyValue(lavtim, 9, 10_000), 'much deeper wave').toBe(end)
    // Once at the end it never moves again.
    for (let w = 50; w < 60; w++) expect(d.difficultyValue(lavtim, 9, w)).toBe(end)
  })

  it('is monotonic toward the end and never overshoots it (the signed BLT/BGT clamp)', async () => {
    const d = await loadDifficulty()
    for (const name of ['LAVTIM', 'BODNVY', 'BOUPWD']) {
      const row = byName(d.DIFFICULTY_TABLE, name)
      const end = s16(row.end)
      let prevGap = Infinity
      for (let w = 1; w <= 80; w++) {
        const v = d.difficultyValue(row, 5, w)
        const gap = Math.abs(v - end)
        expect(gap, `${name} wave ${w}: gap to end must not grow`).toBeLessThanOrEqual(prevGap)
        prevGap = gap
      }
      // Plateau is the LAW; the wave it lands on is per-row (BODNVY at GA1 5 has
      // cadence 8 and climbs 256→768 by +32, so it plateaus ~wave 130, not 80).
      // Assert reaches-end deep enough for EVERY row regardless of cadence.
      expect(d.difficultyValue(row, 5, 10_000), `${name} eventually reaches its end`).toBe(end)
    }
  })

  it('each realized step equals the signed increment (walks BY the step, never jumps)', async () => {
    const d = await loadDifficulty()
    const lavtim = byName(d.DIFFICULTY_TABLE, 'LAVTIM')
    const inc = s8(lavtim.inc)
    let prev = d.difficultyValue(lavtim, 9, 1)
    for (let w = 2; w <= 8; w++) {
      const v = d.difficultyValue(lavtim, 9, w)
      const delta = v - prev
      expect(delta === 0 || delta === inc, `wave ${w}: step must be 0 or exactly ${inc}, got ${delta}`).toBe(
        true,
      )
      prev = v
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — THE RETROFIT: jt2's three per-wave stubs re-point to this engine, and
// every realized value is UNCHANGED (the jt2-1 migration bar). The golden vectors
// are independent literal ROM values, so a drifted retrofit reds; the identity
// checks prove the engine and the stubs are ONE law.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-2 — EMYTIM re-points to the engine, value unchanged', () => {
  it('the engine emits the ROM EMYTIM golden (2 on waves 1-2, else 1)', async () => {
    const d = await loadDifficulty()
    for (let w = 1; w <= 90; w++) {
      expect(d.emytimForWave(w), `wave ${w}`).toBe(w <= 2 ? 2 : 1)
    }
    // Exact boundary, both directions.
    expect(d.emytimForWave(2)).toBe(2)
    expect(d.emytimForWave(3)).toBe(1)
  })

  it('the wave.ts stub now agrees with the engine (one source)', async () => {
    const d = await loadDifficulty()
    const w = await loadWave()
    for (let n = 1; n <= 90; n++) {
      expect(w.emytimForWave(n), `EMYTIM wave ${n} unchanged by the retrofit`).toBe(d.emytimForWave(n))
    }
  })
})

describe('AC-2 — the lava-level step re-points to the engine, value unchanged', () => {
  it('the engine emits the ROM lava golden ($EA → $E5 → $E0, then flat)', async () => {
    const d = await loadDifficulty()
    const golden = (w: number): number => (w <= 1 ? 0xea : w <= 2 ? 0xe5 : 0xe0)
    for (let w = 1; w <= 30; w++) expect(d.lavaLevelForWave(w), `wave ${w}`).toBe(golden(w))
    expect(d.lavaLevelForWave(1)).toBe(0xea)
    expect(d.lavaLevelForWave(2)).toBe(0xe5)
    expect(d.lavaLevelForWave(3)).toBe(0xe0)
  })

  it('the arena.ts stub now agrees with the engine (one source)', async () => {
    const d = await loadDifficulty()
    const a = await loadArena()
    for (let w = 1; w <= 30; w++) {
      expect(a.lavaLevelForWave(w), `lava wave ${w} unchanged by the retrofit`).toBe(d.lavaLevelForWave(w))
    }
  })
})

describe('AC-2 — the pursuit-nibble budget seed re-points to the engine, value unchanged', () => {
  it('the engine seeds {nsmart:0, wsmart: pursuers} from a wave row', async () => {
    const d = await loadDifficulty()
    const w = await loadWave()
    const wave5 = w.waveRowAt(5) // pursuers 1
    const plateau = w.waveRowAt(81) // pursuers 15
    expect(d.seedBudgetForRow(wave5)).toEqual({ nsmart: 0, wsmart: wave5.pursuers })
    expect(d.seedBudgetForRow(plateau)).toEqual({ nsmart: 0, wsmart: 15 })
  })

  it('the wave.ts seedWaveBudget stub now agrees with the engine (one source)', async () => {
    const d = await loadDifficulty()
    const w = await loadWave()
    for (const n of [1, 5, 16, 40, 81, 90]) {
      const row = w.waveRowAt(n)
      expect(w.seedWaveBudget(row), `budget seed wave ${n} unchanged`).toEqual(d.seedBudgetForRow(row))
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — PURITY. The global src/core sweep (tests/purity.test.ts) already globs
// the new module; this is the teeth-test that it is pure DATA + a pure decoder —
// no wall clock, no ambient entropy, no shell import, no filesystem read.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-4 — src/core/difficulty.ts is pure (no clock, no entropy, no fs, no shell)', () => {
  it('the module exists and crosses no core/shell boundary', () => {
    const p = join(coreDir, 'difficulty.ts')
    if (!existsSync(p)) {
      throw new Error('GREEN creates src/core/difficulty.ts — the centralized difficulty engine')
    }
    const text = readFileSync(p, 'utf8')
    expect(violations(text, 'difficulty.ts'), 'difficulty.ts must stay inside the core boundary').toEqual(
      [],
    )
  })

  it('the difficulty engine is committed DATA + a decoder, not a re-reader of the vendored source', () => {
    const p = join(coreDir, 'difficulty.ts')
    if (!existsSync(p)) {
      throw new Error('GREEN creates src/core/difficulty.ts — the committed DYTBL decode')
    }
    const text = readFileSync(p, 'utf8')
    expect(text, 'core reads no files — the table is committed data (byte-gated by the test side)').not.toMatch(
      /node:fs|readFileSync/,
    )
  })
})
