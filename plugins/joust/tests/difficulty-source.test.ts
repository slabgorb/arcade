// tests/difficulty-source.test.ts
//
// Story jt3-1 — RED phase (Leeloo / TEA). The PROVENANCE + BYTE-GATE companion
// to tests/difficulty.test.ts. The behaviour suite encodes the difficulty-engine
// laws; this one proves those laws are REAL in the vendored 1982 source,
// RE-DERIVES the 28-row DYTBL byte-for-byte from JOUSTRV4.SRC through the DYWORD
// macro and pins it against the committed DIFFICULTY_TABLE, and requires each
// newly-cited range to carry a committed JT31-* claim — AC-1's "…committed with a
// re-derivation gate against the vendored source (the jt2-5 byte-gate pattern);
// … claims entries for the table format and the decode".
//
// ─── THE DOUBLE-ENTRY, RESTATED (the jt1-3 tautology trap) ────────────────────
// The failure mode this suite refuses: Dev writes a decoder, the test re-runs it,
// the two agree, everything is green, and the gate has proven only that the
// decoder is deterministic. So the verification path is INDEPENDENT of the
// generation path: this file re-reads the SAME DYWORD rows straight out of
// JOUSTRV4.SRC with a reader that Dev's module never touches (the pictures-gate
// independence rule holds — nothing under src/ imports the test reader), and the
// gate is that the two derivations agree byte-for-byte.
//
// THE DYWORD MACRO is the trap this reader is built to survive. The row's operand
// order is START1,START2,START3,INCRE,ENDV,TIM1,TIM2,TIM3, but the macro EMITS
// FDB START1,START2,START3,ENDV,TIM1,TIM2 / FCB TIM3,INCRE (JOUSTRV4.SRC:210-212)
// — INCRE, the 4th operand, becomes the LAST byte. A reader (or a decoder) that
// assembled operands in source order would mistranscribe every row.
//
// ─── DEGRADATION (the jt1-3 CI path) ─────────────────────────────────────────
// CI clones only the joust subrepo and has no vendored tree, so every source
// re-derivation SKIPS there (describe.skipIf(!vendoredAvailable)). The
// claim-coverage checks read the committed claims/ and run EVERYWHERE. Every
// vendored read lives inside an it() body (the tp1-8 collection trap).

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'
import { loadDifficulty, type DyRow } from './helpers/difficulty-contract.js'
// jt9-2 swept this suite's local pre-hardening claims plumbing onto the shared
// loader jt8-3 extracted. Behaviour-preserving.
import { loadClaims, claimCovers } from './helpers/claims.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const coreDir = join(repoRoot, 'src', 'core')

const line = (file: string, n: number): string => sourceLines(file)[n - 1] ?? ''

// ─────────────────────────────────────────────────────────────────────────────
// THE INDEPENDENT DYWORD READER. Expands the macro exactly as the assembler does
// and flattens each row to its 14 bytes. Dev's module never touches any of this.
//
// A fully local operand evaluator: Motorola radix (bare DECIMAL, `$` hex),
// `+`-sums ($5A+4), a leading `+` (+02) and leading `-` (-01) sign. Deliberately
// self-contained — it does not lean on the shared evalOperand, which rejects a
// leading `+`, so a reader bug can only cause a false RED a human sees, never a
// false green that agrees with a wrong module.
// ─────────────────────────────────────────────────────────────────────────────
function evalDy(tok: string): number {
  let t = tok.trim()
  if (t.startsWith('+')) t = t.slice(1)
  if (t.includes('+')) return t.split('+').reduce((a, p) => a + evalDy(p), 0) & 0xffff
  let neg = false
  if (t.startsWith('-')) {
    neg = true
    t = t.slice(1)
  }
  let v: number
  if (t.startsWith('$')) v = parseInt(t.slice(1), 16)
  else if (t.startsWith('@')) v = parseInt(t.slice(1), 8)
  else if (t.startsWith('%')) v = parseInt(t.slice(1), 2)
  else if (/^\d+$/.test(t)) v = parseInt(t, 10)
  else throw new Error(`unresolvable DYWORD operand ${JSON.stringify(tok)}`)
  return (neg ? -v : v) & 0xffff
}

interface SourceRow {
  line: number
  name: string
  bytes: number[]
}

/** Flatten JOUSTRV4.SRC:7304-7331 (the 28 DYWORD rows) to bytes, macro-expanded, independently. */
function dywordRowsFromSource(): SourceRow[] {
  const rows: SourceRow[] = []
  for (let n = 7304; n <= 7331; n++) {
    const m = line('JOUSTRV4.SRC', n).match(/^\s*DYWORD\s+(\S+)(?:\s+(\S+))?/)
    if (!m) continue
    const ops = m[1].split(',')
    if (ops.length !== 8) {
      throw new Error(`JOUSTRV4.SRC:${n} — a DYWORD row must carry 8 operands, got ${ops.length}`)
    }
    const [s1, s2, s3, incre, endv, tim1, tim2, tim3] = ops.map(evalDy)
    const w = (v: number): number[] => [(v >> 8) & 0xff, v & 0xff]
    // The MACRO's emission order (JOUSTRV4.SRC:211-212), NOT the operand order:
    // FDB START1,START2,START3,ENDV,TIM1,TIM2 / FCB TIM3,INCRE.
    const bytes = [...w(s1), ...w(s2), ...w(s3), ...w(endv), ...w(tim1), ...w(tim2), tim3 & 0xff, incre & 0xff]
    rows.push({ line: n, name: m[2] ?? '', bytes })
  }
  return rows
}

/** Flatten a decoded DyRow back to its 14 wire bytes (the module side of the gate). */
function rowBytes(r: DyRow): number[] {
  const w = (v: number): number[] => [(v >> 8) & 0xff, v & 0xff]
  return [
    ...w(r.starts[0]),
    ...w(r.starts[1]),
    ...w(r.starts[2]),
    ...w(r.end),
    ...r.timeBytes.map((b) => b & 0xff),
    r.inc & 0xff,
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// THE LAWS RE-DERIVE FROM THE VENDORED SOURCE (AC-1, byte-gated).
// Each mapped to the vendored line that carries it and the substrings that MUST
// be there. If the ROM changes under us, this reds before any behaviour test can
// pass on a lie. (These assert FACTS about the vendored source, so they pass on
// the source-bearing tree — the RED drivers are the behaviour suite + the byte
// gate + the retrofit wiring below.)
// ─────────────────────────────────────────────────────────────────────────────
const LAWS: ReadonlyArray<{ name: string; file: string; n: number; must: readonly string[] }> = [
  // ── the DYWORD struct field offsets (NOT a bare start→end pair) ─────────────
  { name: 'DYWST0 = start column for GA1 tiers 0-3', file: 'JOUSTRV4.SRC', n: 202, must: ['DYWST0', 'RMB', '2', 'WORD START 0,1,2,3'] },
  { name: 'DYWST1 = start column for tiers 4-6', file: 'JOUSTRV4.SRC', n: 203, must: ['DYWST1', 'RMB', '2', 'WORD START 4,5,6'] },
  { name: 'DYWST2 = start column for tiers 7-9', file: 'JOUSTRV4.SRC', n: 204, must: ['DYWST2', 'RMB', '2', 'WORD START 7,8,9'] },
  { name: 'DYWEND = the word end/plateau value', file: 'JOUSTRV4.SRC', n: 205, must: ['DYWEND', 'RMB', '2', 'WORD END VALUE'] },
  { name: 'DYWTIM = 5 nibble-time bytes (the step cadence)', file: 'JOUSTRV4.SRC', n: 206, must: ['DYWTIM', 'RMB', '5', 'NIBBLE TIMES'] },
  { name: 'DYWINC = the signed byte increment', file: 'JOUSTRV4.SRC', n: 207, must: ['DYWINC', 'RMB', '1', 'INCREMENT'] },
  { name: 'DYWLEN closes the row (14 bytes)', file: 'JOUSTRV4.SRC', n: 208, must: ['DYWLEN', 'RMB', '0'] },
  // ── the macro emission order (INCRE moves to the last byte) ─────────────────
  { name: 'the DYWORD macro operand order', file: 'JOUSTRV4.SRC', n: 210, must: ['DYWORD', 'MACRO', 'START1,START2,START3,INCRE,ENDV,TIM1,TIM2,TIM3'] },
  { name: 'the macro emits START/END/TIM as words', file: 'JOUSTRV4.SRC', n: 211, must: ['FDB', 'START1,START2,START3,ENDV,TIM1,TIM2'] },
  { name: 'the macro emits TIM3 then INCRE as bytes', file: 'JOUSTRV4.SRC', n: 212, must: ['FCB', 'TIM3,INCRE'] },
  // ── the DYTBL data + its label/terminator ──────────────────────────────────
  { name: 'the DYTBL label', file: 'JOUSTRV4.SRC', n: 7303, must: ['DYTBL'] },
  { name: 'DYTBL row 1 = LAVTIM', file: 'JOUSTRV4.SRC', n: 7304, must: ['DYWORD', '$000B,$0006,$0004,-01,$0001,$FA86,$4433,$21', 'LAVTIM'] },
  { name: 'DYEND closes the 28-row table', file: 'JOUSTRV4.SRC', n: 7332, must: ['DYEND', 'EQU', '*'] },
  // ── the GA1 starting-column tiers (0-3 / 4-6 / 7+) ──────────────────────────
  { name: 'GA1 read at game-adjust setup', file: 'JOUSTRV4.SRC', n: 930, must: ['LDX', '#GA1', 'GAME ADJUST'] },
  { name: 'tier boundary 0-3 (CMPA #3)', file: 'JOUSTRV4.SRC', n: 933, must: ['CMPA', '#3', 'GAME ADJUST 0,1,2,3'] },
  { name: 'tier boundary 4-6 (CMPA #6)', file: 'JOUSTRV4.SRC', n: 936, must: ['CMPA', '#6', 'GAME ADJUST 4,5,6'] },
  { name: 'the third tier increments the start offset', file: 'JOUSTRV4.SRC', n: 938, must: ['INC', ',S'] },
  { name: 'the DYTBL init pointer', file: 'JOUSTRV4.SRC', n: 939, must: ['LDX', '#DYTBL'] },
  { name: 'the RAM working copy is DYNADJ', file: 'JOUSTRV4.SRC', n: 940, must: ['LDY', '#DYNADJ'] },
  { name: 'the countdown timer seeds to 2', file: 'JOUSTRV4.SRC', n: 945, must: ['LDA', '#2'] },
  // ── the IWAVE walk (once per wave, cadence-gated, clamp at end) ─────────────
  { name: 'IWAVE reads GA1', file: 'JOUSTRV4.SRC', n: 1890, must: ['LDX', '#GA1', 'GAME ADJUST'] },
  { name: 'the countdown gate (time to change the value?)', file: 'JOUSTRV4.SRC', n: 1895, must: ['LDB', '2,Y', 'TIME TO CHANGE'] },
  { name: 'the difficulty level indexes the time table', file: 'JOUSTRV4.SRC', n: 1899, must: ['LDB', ',S', 'DIFFICULTY LEVEL'] },
  { name: 'the nibble byte offset = DYWTIM*2 then ASRB', file: 'JOUSTRV4.SRC', n: 1900, must: ['ADDB', '#DYWTIM*2', 'TIME TABLE'] },
  { name: 'ASRB — carry picks the nibble half', file: 'JOUSTRV4.SRC', n: 1901, must: ['ASRB', 'BYTE OFFSET'] },
  { name: 'mask the nibble', file: 'JOUSTRV4.SRC', n: 1908, must: ['ANDB', '#$0F'] },
  { name: 'the signed increment is DYWINC', file: 'JOUSTRV4.SRC', n: 1910, must: ['LDB', 'DYWINC,X'] },
  { name: 'the clamp compares against DYWEND', file: 'JOUSTRV4.SRC', n: 1914, must: ['CMPD', 'DYWEND,X'] },
  { name: 'the plateau: load DYWEND when clamped', file: 'JOUSTRV4.SRC', n: 1921, must: ['LDD', 'DYWEND,X'] },
  { name: 'advance one row by DYWLEN', file: 'JOUSTRV4.SRC', n: 1923, must: ['LEAX', 'DYWLEN,X'] },
  // ── the three RETROFITTED jt2 knobs (their ROM sources) ─────────────────────
  { name: 'EMYTIM = 2 on the 1st/2nd wave', file: 'JOUSTRV4.SRC', n: 2205, must: ['STA', 'EMYTIM', 'SLOW DOWN THE ENEMY'] },
  { name: 'the lava raise (SUBA #$5, floor $E0)', file: 'JOUSTRV4.SRC', n: 1929, must: ['LDA', 'SAFRAM', 'LAVA'] },
  { name: 'the lava floor test', file: 'JOUSTRV4.SRC', n: 1930, must: ['CMPA', '#$E0'] },
  { name: 'the budget seed masks the pursuit nibble', file: 'JOUSTRV4.SRC', n: 2076, must: ['ANDA', '#$0F'] },
  { name: 'the budget seed stores to WSMART', file: 'JOUSTRV4.SRC', n: 2077, must: ['STA', 'WSMART'] },
]

describe.skipIf(!vendoredAvailable)('the difficulty-engine laws are really in the 1982 source (AC-1)', () => {
  it.each(LAWS)('$file:$n carries "$name"', ({ file, n, must }) => {
    const text = line(file, n)
    for (const token of must) {
      expect(
        text,
        `${file}:${n} must carry ${JSON.stringify(token)} — got: ${JSON.stringify(text)}`,
      ).toContain(token)
    }
  })

  it('DYTBL is exactly 28 DYWORD rows, DYWLEN = 14 bytes each (392 bytes)', () => {
    const rows = dywordRowsFromSource()
    expect(rows.length, 'JOUSTRV4.SRC:7304-7331 — 28 DYWORD rows').toBe(28)
    for (const r of rows) {
      expect(r.bytes.length, `row @${r.line} (${r.name}) must be DYWLEN=14 bytes`).toBe(14)
    }
    expect(rows.reduce((a, r) => a + r.bytes.length, 0)).toBe(392)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE DYWORD STRUCT GEOMETRY re-derives against the LOADED module (AC-1). Runs
// EVERYWHERE (the committed module is on CI too) — a real module surface, not a
// `2+2+…===14` tautology that pins nothing.
// ─────────────────────────────────────────────────────────────────────────────
describe('the committed DYWORD struct is 14 bytes wide (module surface)', () => {
  it('the field widths (3 starts + end + 5 cadence bytes + inc) sum to DYWORD_LEN = 14', async () => {
    const diff = await loadDifficulty()
    expect(diff.DYWORD_LEN, 'DYWLEN, JOUSTRV4.SRC:208').toBe(14)
    for (const row of diff.DIFFICULTY_TABLE) {
      expect(row.starts.length, 'DYWST0/1/2 — three tier-start columns').toBe(3)
      expect(row.timeBytes.length, 'DYWTIM — five nibble-time bytes').toBe(5)
      // 3 words (starts) + 1 word (end) + 5 bytes (cadence) + 1 byte (inc) = 14.
      const width = row.starts.length * 2 + 2 + row.timeBytes.length + 1
      expect(width, 'the field widths account for exactly DYWORD_LEN').toBe(diff.DYWORD_LEN)
      expect(rowBytes(row).length, 'and the flattened wire row is DYWORD_LEN bytes').toBe(diff.DYWORD_LEN)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE BYTE GATE — the committed DIFFICULTY_TABLE re-derives from JOUSTRV4.SRC
// (AC-1). This is the jt2-5 gate for the 28-row DYWORD decode. RED today: the
// module does not exist, so loadDifficulty() throws "difficulty engine not built".
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the committed DIFFICULTY_TABLE re-derives byte-for-byte from the vendored source', () => {
  it('every one of the 28 DYWORD rows matches its source bytes (THE GATE)', async () => {
    const diff = await loadDifficulty()
    const source = dywordRowsFromSource()
    expect(diff.DIFFICULTY_TABLE.length, 'DIFFICULTY_TABLE must be the 28 committed rows').toBe(28)
    const module = diff.DIFFICULTY_TABLE.flatMap(rowBytes)
    const derived = source.flatMap((r) => r.bytes)
    expect(module.length).toBe(derived.length)
    // Report the FIRST divergence with its row + byte column, so a wrong nibble
    // split, a dropped word, or the INCRE/ENDV macro-order trap is actionable.
    const i = module.findIndex((v, k) => v !== derived[k])
    if (i >= 0) {
      const rowNo = Math.floor(i / 14)
      const col = i % 14
      expect.fail(
        `DYWORD row ${rowNo} (${source[rowNo]?.name}) byte ${col}: ` +
          `module $${module[i].toString(16)} vs source $${derived[i].toString(16)}`,
      )
    }
    expect(module).toEqual(derived)
  })

  it('the committed row NAMES match the source trailing labels (LAVTIM … SHCLTM)', async () => {
    const diff = await loadDifficulty()
    const source = dywordRowsFromSource()
    expect(diff.DIFFICULTY_TABLE.map((r) => r.name)).toEqual(source.map((r) => r.name))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE RETROFIT RE-POINTS THE SOURCE (AC-2). The migration bar is "change the
// SOURCE, not the value": the jt2 stubs in wave.ts / arena.ts must read from the
// difficulty engine, not carry their own independent copy. A behaviour test that
// only checked the VALUES would pass on a Dev who left the stubs untouched — so
// this pins the SOURCE re-point directly (the demo-source.test.ts wiring idiom).
// RED today: neither file references the difficulty module yet.
// ─────────────────────────────────────────────────────────────────────────────
function moduleSource(file: string): string {
  const p = join(coreDir, file)
  if (!existsSync(p)) throw new Error(`src/core/${file} is missing`)
  return readFileSync(p, 'utf8')
}

/**
 * Strip `/* *\/` block and `//` line comments so a MENTION of difficulty.js in
 * prose can never satisfy the delegation gate. A bare `toMatch(/difficulty/)`
 * passes on the comment "read from ./difficulty.js" even if the real import were
 * deleted — the test-analyzer mutation-proved that a values-preserving un-source
 * ships green against it. The gate must see the actual import STATEMENT in code.
 */
function codeOnly(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

/** A real `import … from './difficulty(.js)?'` statement — not a substring, not a comment. */
const IMPORTS_DIFFICULTY = /import\b[\s\S]*?\bfrom\s*['"]\.\/difficulty(?:\.js)?['"]/

describe('the retrofit re-points jt2 stubs at the difficulty engine (AC-2 — SOURCE, not value)', () => {
  it('src/core/wave.ts IMPORTS EMYTIM + the budget seed from ./difficulty', () => {
    // wave.ts — `import { emytimForWave as difficultyEmytim, seedBudgetForRow }
    // from './difficulty.js'`. Require the STATEMENT (comments stripped first) so a
    // values-preserving un-source that left only a prose mention would red.
    const src = codeOnly(moduleSource('wave.ts'))
    expect(
      src,
      "wave.ts must IMPORT from './difficulty.js' (re-point EMYTIM + budget seed to it), not just mention it",
    ).toMatch(IMPORTS_DIFFICULTY)
  })

  it('src/core/arena.ts IMPORTS the lava-level step from ./difficulty', () => {
    // arena.ts — `import { lavaLevelForWave as difficultyLava } from './difficulty.js'`.
    const src = codeOnly(moduleSource('arena.ts'))
    expect(
      src,
      "arena.ts must IMPORT from './difficulty.js' (re-point the lava step to it), not just mention it",
    ).toMatch(IMPORTS_DIFFICULTY)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EVERY LAW IS PINNED BY A COMMITTED CLAIM (AC-1/AC-4, runs everywhere).
// jt3-1 adds JT31-* claims in docs/rom-study/claims/difficulty.json.
// ─────────────────────────────────────────────────────────────────────────────
const CITED_RANGES: ReadonlyArray<{ law: string; file: string; start: number; end: number }> = [
  { law: 'the DYWORD struct field offsets', file: 'JOUSTRV4.SRC', start: 202, end: 208 },
  { law: 'the DYWORD macro emission order', file: 'JOUSTRV4.SRC', start: 210, end: 213 },
  { law: 'the DYTBL data table', file: 'JOUSTRV4.SRC', start: 7303, end: 7332 },
  { law: 'the GA1 starting-column tiers', file: 'JOUSTRV4.SRC', start: 930, end: 939 },
  { law: 'the DYNADJ init + countdown seed', file: 'JOUSTRV4.SRC', start: 940, end: 950 },
  { law: 'the IWAVE walk (cadence + clamp)', file: 'JOUSTRV4.SRC', start: 1890, end: 1926 },
  { law: 'the lava-level step (retrofit)', file: 'JOUSTRV4.SRC', start: 1929, end: 1933 },
  { law: 'the budget seed (retrofit)', file: 'JOUSTRV4.SRC', start: 2075, end: 2077 },
  { law: 'the EMYTIM divider (retrofit)', file: 'JOUSTRV4.SRC', start: 2202, end: 2205 },
]

describe('each difficulty-engine law is pinned by a claims/*.json entry (AC-1)', () => {
  it('loads a non-empty claims set (the guard must have teeth)', () => {
    expect(loadClaims().length, 'docs/rom-study/claims/*.json must exist').toBeGreaterThan(0)
  })

  it.each(CITED_RANGES)('$law ($file:$start-$end) is covered by a claim', ({ file, start, end }) => {
    const claims = loadClaims()
    expect(
      claimCovers(claims, file, start, end),
      `no committed claim pins ${file}:${start}-${end} — AC-1 requires each difficulty law to be cited ` +
        '(add a JT31-* claim to docs/rom-study/claims/difficulty.json)',
    ).toBe(true)
  })

  it('jt3-1 added its own difficulty claims (JT31-*)', () => {
    const jt31 = loadClaims().filter((c) => /^JT31-\d+$/.test(c.id ?? ''))
    expect(
      jt31.length,
      'the new transcription claims are committed to docs/rom-study/claims/difficulty.json',
    ).toBeGreaterThan(0)
  })

  it('every JT31 claim names its own FILE:LINESPEC in its text (the jt1-8 standard, never bare :N)', () => {
    const jt31 = loadClaims().filter((c) => /^JT31-\d+$/.test(c.id ?? ''))
    const bare = jt31
      .filter((c) => !/[\w./]+\.(?:SRC|DOC|PIC|FRM|cpp):\d/.test(c.claim ?? ''))
      .map((c) => c.id)
    expect(bare, 'these JT31 claims do not name their own source line in their text').toEqual([])
  })

  it('every claim id is still unique (JT31 does not collide with JT25/JT8/…)', () => {
    const ids = loadClaims().map((c) => c.id)
    const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
    expect(dupes, 'duplicate claim ids').toEqual([])
  })
})
