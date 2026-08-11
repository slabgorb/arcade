// tests/rng-shared-adoption.test.ts
//
// Story SH3-1 — RED phase (O'Brien / TEA). Retire joust's two INLINED mulberry32
// copies (src/core/frame.ts + src/core/transporter.ts, each a byte-for-byte lift
// of the generator behind a stale "joust does not yet pin @arcade/shared" comment)
// and source the generator from @shared/rng instead. The SH3 epic's iron rule for
// every determinism primitive: the OBSERVABLE sequence may not move a single bit,
// or demos / replays / high-score seeds silently drift.
//
// This file pins that on two independent axes:
//
//   1. DETERMINISM LOCK (green now, green after). The float stream joust draws is
//      identical to @shared/rng's nextFloat stream for any seed — proven three
//      ways: against a frozen golden array of absolute values (locks @shared's OWN
//      numbers so it cannot be "fixed" out from under joust), against joust's
//      public `draw` probe, and against `enterViaPads`' pad selection. A swap that
//      changes one float reds here.
//
//   2. RETIREMENT GUARD (RED until GREEN). The mulberry32 body must actually LEAVE
//      src/core/: its increment constant 0x6d2b79f5 may not survive as a live
//      numeric literal anywhere under src/core/, and at least one core module must
//      import @shared/rng. Today both copies carry the constant and nothing in core
//      imports the shared module, so this is the red that drives the story.
//
// ─── WHY THE GUARD PARSES, IT DOES NOT GREP ──────────────────────────────────
// A flat-text search for "0x6d2b79f5" is defeated the instant someone comments the
// old copy out (`// const next = word + 0x6d2b79f5`) — the phrase is still in the
// file, so a naive grep stays red on dead code, or (worse) a phrase-in-a-comment
// fakes green elsewhere. This guard walks the TypeScript AST and counts only
// NumericLiteral nodes — LIVE code — so a mention in a comment or string never
// registers and a commented-out copy never fakes a pass. The teeth-test below pins
// that behaviour permanently.

import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import ts from 'typescript'
import { createRng, nextFloat, type Rng } from '@shared/rng'
import { createState, draw } from '../src/core/frame.js'
import { enterViaPads, PADS } from '../src/core/transporter.js'
import { violations } from './helpers/purity-scanner.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const coreDir = join(root, 'src', 'core')

/** The mulberry32 increment — the fingerprint of an inlined copy of the generator. */
const MULBERRY32_INCREMENT = 0x6d2b79f5

// ─────────────────────────────────────────────────────────────────────────────
// AST helpers — LIVE code only. Comments and string literals are not
// NumericLiteral / ImportDeclaration nodes, so they can never satisfy or defeat
// these checks.
// ─────────────────────────────────────────────────────────────────────────────

/** Line numbers (1-based) at which `value` appears as a live numeric literal. */
function numericLiteralLines(source: string, value: number, filename = 'module.ts'): number[] {
  const sf = ts.createSourceFile(filename, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS)
  const lines: number[] = []
  const walk = (node: ts.Node): void => {
    if (ts.isNumericLiteral(node) && Number(node.getText(sf)) === value) {
      lines.push(sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1)
    }
    node.forEachChild(walk)
  }
  walk(sf)
  return lines
}

/** The set of module specifiers this source statically imports from. */
function importSpecifiers(source: string, filename = 'module.ts'): string[] {
  const sf = ts.createSourceFile(filename, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS)
  const specs: string[] = []
  const walk = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      specs.push(node.moduleSpecifier.text)
    }
    node.forEachChild(walk)
  }
  walk(sf)
  return specs
}

const coreFiles = existsSync(coreDir)
  ? readdirSync(coreDir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts'))
  : []

// ═════════════════════════════════════════════════════════════════════════════
// PART 1 — THE DETERMINISM LOCK (so demos / replays do not drift)
// ═════════════════════════════════════════════════════════════════════════════

// The first six floats of the mulberry32 stream at seed 0, captured from the
// generator this story is consolidating onto. These are ABSOLUTE — pinning them
// means neither joust NOR @shared/rng can quietly change the algorithm without
// this array going red.
const GOLDEN_SEED0: readonly number[] = [
  0.26642920868471265, 0.0003297457005828619, 0.2232720274478197, 0.1462021479383111,
  0.46732782293111086, 0.5450490827206522,
]

const SEEDS = [0, 1, 42, 0xc0ffee, 0xdeadbeef, 0x7fffffff, 0xffffffff]

/** The reference stream: @shared/rng's nextFloat, `n` draws from `seed`. */
function sharedStream(seed: number, n: number): number[] {
  const rng: Rng = createRng(seed)
  return Array.from({ length: n }, () => nextFloat(rng))
}

describe('SH3-1 determinism lock — @shared/rng is the joust stream, bit for bit', () => {
  it('@shared/rng reproduces the frozen golden float sequence for seed 0', () => {
    expect(sharedStream(0, GOLDEN_SEED0.length)).toEqual(GOLDEN_SEED0)
  })

  it.each(SEEDS)('frame `draw` stream === @shared/rng nextFloat stream (seed %#x)', (seed) => {
    const expected = sharedStream(seed, 8)
    let state = createState(seed)
    const got: number[] = []
    for (let i = 0; i < 8; i++) {
      const d = draw(state)
      got.push(d.value)
      state = d.state
    }
    expect(got, 'joust must draw exactly the shared generator, or replays drift').toEqual(expected)
  })

  it.each(SEEDS)('enterViaPads selects pads off the @shared/rng stream (seed %#x)', (seed) => {
    const count = 6
    const rng: Rng = createRng(seed)
    const expected = Array.from(
      { length: count },
      (_, index) => PADS[Math.floor(nextFloat(rng) * PADS.length)].id,
    )
    expect(enterViaPads(count, seed).map((e) => e.pad)).toEqual(expected)
  })

  it('the golden array is non-trivial (guard against a vacuous lock)', () => {
    // A determinism lock over an all-equal or all-zero array would pass vacuously.
    expect(new Set(GOLDEN_SEED0).size).toBe(GOLDEN_SEED0.length)
    expect(GOLDEN_SEED0.every((v) => v >= 0 && v < 1)).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// PART 2 — THE RETIREMENT GUARD (RED until the inlined copies are gone)
// ═════════════════════════════════════════════════════════════════════════════

describe('SH3-1 retirement guard — the inlined mulberry32 leaves src/core/', () => {
  it('src/core/ is non-empty (the sweep must have teeth)', () => {
    expect(coreFiles.length, 'src/core/ must hold at least one .ts module').toBeGreaterThan(0)
  })

  it.each(coreFiles)('src/core/%s carries no inlined mulberry32 body', (file) => {
    const src = readFileSync(join(coreDir, file), 'utf8')
    const hits = numericLiteralLines(src, MULBERRY32_INCREMENT, `core/${file}`)
    expect(
      hits,
      `core/${file} still hard-codes the mulberry32 increment 0x6d2b79f5 as live code ` +
        `(line(s) ${hits.join(', ')}) — retire the copy and take the generator from @shared/rng`,
    ).toEqual([])
  })

  it('at least one src/core/ module imports @shared/rng', () => {
    const importers = coreFiles.filter((file) =>
      importSpecifiers(readFileSync(join(coreDir, file), 'utf8'), `core/${file}`).includes(
        '@shared/rng',
      ),
    )
    expect(
      importers,
      'no core module imports @shared/rng — the shared generator was never adopted',
    ).not.toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// PART 3 — THE GUARD'S OWN TEETH + BOUNDARY LEGALITY
// ═════════════════════════════════════════════════════════════════════════════

describe('SH3-1 guard integrity — the AST teeth cannot be faked or over-fire', () => {
  it('flags the increment as a live literal, in hex or decimal', () => {
    expect(numericLiteralLines('const next = word + 0x6d2b79f5', MULBERRY32_INCREMENT)).toEqual([1])
    expect(numericLiteralLines('const next = word + 1831565813', MULBERRY32_INCREMENT)).toEqual([1])
  })

  it('does NOT flag the constant when it is only mentioned in a comment or string', () => {
    // A commented-out copy must not keep the guard red, and prose that names the
    // constant must not fake a violation. This is the whole reason it parses.
    expect(numericLiteralLines('// const next = word + 0x6d2b79f5 (retired)', MULBERRY32_INCREMENT))
      .toEqual([])
    expect(numericLiteralLines('const doc = "mulberry32 uses 0x6d2b79f5"', MULBERRY32_INCREMENT))
      .toEqual([])
  })

  it('does NOT flag a different numeric literal (no accidental over-fire)', () => {
    expect(numericLiteralLines('const other = 0x6d2b79f4', MULBERRY32_INCREMENT)).toEqual([])
    expect(numericLiteralLines('const frameHz = 61', MULBERRY32_INCREMENT)).toEqual([])
  })

  it('detects a real static import specifier, not one in a comment or string', () => {
    expect(importSpecifiers("import { nextFloat } from '@shared/rng'")).toContain('@shared/rng')
    expect(importSpecifiers('// import { nextFloat } from "@shared/rng"')).not.toContain(
      '@shared/rng',
    )
    expect(importSpecifiers('const s = "@shared/rng"')).not.toContain('@shared/rng')
  })

  it('importing @shared/rng into core is boundary-legal (unlike a shell import)', () => {
    // The core-purity guard bans imports from shell/ but not from the shared
    // library; adopting @shared/rng must not trip it. (Contrast: the shell import
    // still flags, proving the check is live.)
    // violations() tags each hit with a `(file:line)` suffix; strip it to name the rule.
    const rules = (src: string): string[] => violations(src).map((r) => r.replace(/\s\([^()]*\)$/, ''))
    expect(rules("import { nextFloat } from '@shared/rng'")).toEqual([])
    expect(rules("import { render } from '../shell/render'")).toContain('import from shell/')
  })
})
