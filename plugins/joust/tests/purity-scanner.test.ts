// tests/purity-scanner.test.ts
//
// Story jt1-7 — RED phase (O'Brien / TEA). Hardening the core boundary guard.
//
// jt1-1's scanner strips comments and strings with regexes over flat text. The
// jt1-1 Reviewer reproduced five false negatives in it by execution; all five
// are re-reproduced below against the CURRENT scanner (evidence in the session
// notes) and each becomes a must-flip test here. A sixth was found this session.
//
// ─── WHY THERE IS NO SINGLE "REGEX-IMPOSSIBLE" POISON ────────────────────────
// The obvious plan was to find one input that no regex can handle and let it
// carry the story. Experiment says that plan is wrong: nested template
// literals, regex literals containing quotes or comment markers, escaped
// quotes, division-vs-regex ambiguity — the current scanner CATCHES all of
// them. Not because it understands them, but because its particular stripping
// order happens to leave the violation standing.
//
// So the load-bearing property is not one poison; it is the INTERSECTION. This
// file holds two kinds of case:
//
//   MUST FLIP (6)  — currently missed, must be caught.
//   MUST HOLD (9)  — currently caught, must STAY caught.
//
// The MUST HOLD set exists because each plausible regex patch breaks a
// different member of it. Reorder to strings-before-comments (the natural fix
// for the worst bug) and an apostrophe in a comment starts swallowing code
// again. Teach the template regex about `${...}` (the fix for case 3) and
// nested templates or a stray backtick in a plain string become the new hole.
// Add regex-literal awareness and division breaks. No single pass over flat
// text satisfies all fifteen at once; a tokenizer satisfies them without
// trying. That is the Reviewer's warning from jt1-1 — "a rushed regex patch in
// a rejection loop is how new holes get added" — encoded so the tests refuse
// to accept one.
//
// ─── VERDICTS, NOT MECHANISM ─────────────────────────────────────────────────
// Nothing here asserts an AST walk, a visitor, or a particular library. Two
// structural requirements do appear, and both are about OUTCOMES rather than
// style:
//   • A file the scanner cannot parse must NOT silently pass. This is what
//     forbids "tokenizer wrapped in try/catch, falling back to the old regex" —
//     which would reintroduce every hole while showing green.
//   • Exactly ONE scanner sweeps src/core/. Otherwise the new scanner can be
//     added alongside the old one, and the old holey one keeps doing the sweep.
//
// No vendored tree is involved — this is entirely repo-local, so every test
// here runs on CI with no skipIf.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const coreDir = join(repoRoot, 'src', 'core')

type Violations = (source: string, filename?: string) => string[]

/**
 * Load the hardened scanner. GREEN extracts it from purity.test.ts's inline
 * regex helpers into a real module so both suites share one implementation.
 */
async function loadScanner(): Promise<Violations> {
  const specifier = ['.', 'helpers', 'purity-scanner.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as { violations?: Violations }
    if (typeof mod.violations !== 'function') throw new Error('module has no `violations` export')
    return mod.violations
  } catch (e) {
    throw new Error(
      'hardened purity scanner not built yet — GREEN (Julia) creates ' +
        'joust/tests/helpers/purity-scanner.ts exporting `await rules(source, filename?): string[]`, ' +
        'tokenizing the source rather than regex-stripping it, and migrates ' +
        `tests/purity.test.ts onto it. (${(e as Error).message})`,
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MUST FLIP — the five archived false negatives, plus one found this session.
// Every one was re-reproduced against the current scanner before being written
// here, with a live `Math.random()` control proving the harness was not simply
// broken. See the session notes for the probe table.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Rule NAMES only — jt1-11 appended a `(file:line)` suffix to every report, and
 * the jt1-7 rails below assert rule IDENTITY. The jt1-11 location rails at the
 * bottom of this file use `violations` directly, since the suffix is what they
 * exist to check.
 */
const rules = async (src: string, file?: string): Promise<string[]> =>
  (await loadScanner())(src, file).map((r) => r.replace(/\s\([^()]*\)$/, ''))

describe('MUST FLIP — false negatives the current scanner misses', () => {
  it('FN-1: a /* inside an ordinary string must not disable the guard', async () => {
    // The worst of the five, and the reason this story exists. The block-comment
    // regex scans flat text, so a `/*`-looking substring inside a string
    // consumes everything up to the next REAL `*/` anywhere later in the file —
    // silently switching the guard off across an arbitrary span. Accidental, not
    // adversarial: an innocent string does it.
        const src = [
      'export const a = "contains /* marker"',
      'export const b = Date.now()',
      '/** an ordinary doc comment, which closes the phantom block */',
      'export const z = 1',
    ].join('\n')
    expect(await rules(src), 'the live Date.now() sits inside the swallowed span').toContain(
      'Date.now()',
    )
  })

  it('FN-2: a // inside a string must not truncate the line', async () => {
        expect(await rules('export const c = "a//b" + performance.now()')).toContain('performance.now()')
  })

  it('FN-3: template interpolation is live code, not comment-adjacent text', async () => {
    // `${...}` holds executable expressions; blanking the whole literal deletes
    // them.
        expect(await rules('export const e = `t${Math.random()}`')).toContain('Math.random()')
  })

  it('FN-4: destructuring an alias must not evade a call-anchored ban', async () => {
        const hits = await rules(['const { random } = Math', 'export const f = random()'].join('\n'))
    expect(hits.length, `aliasing Math.random must be reported, got: [${hits}]`).toBeGreaterThan(0)
  })

  it('FN-5: a function-reference alias must not evade a call-anchored ban', async () => {
        const hits = await rules(['const readClock = Date.now', 'export const g = readClock()'].join('\n'))
    expect(hits.length, `aliasing Date.now must be reported, got: [${hits}]`).toBeGreaterThan(0)
  })

  it('FN-6: a string carrying BOTH // and /* (found this session)', async () => {
    // Neither stripping order survives this one: comments-first lets the `//`
    // eat the line, strings-first lets the `/*` open a phantom block.
        const src = [
      'export const s = "// and /* together"',
      'export const x = Date.now()',
      '/** closer */',
    ].join('\n')
    expect(await rules(src)).toContain('Date.now()')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MUST HOLD — currently caught, and each one blocks a different regex patch.
// ─────────────────────────────────────────────────────────────────────────────
describe('MUST HOLD — cases that box in the fix (each blocks a different patch)', () => {
  const holds: ReadonlyArray<readonly [string, string, string, string]> = [
    [
      'nested template literals',
      'blocks: a template regex taught about ${} but not about nesting',
      'export const n = `a${`b${Date.now()}c`}d`',
      'Date.now()',
    ],
    [
      'a regex literal containing a quote',
      'blocks: any char scanner without regex-literal awareness (the quote opens a phantom string)',
      "export const re = /[']/\nexport const v = Math.random()",
      'Math.random()',
    ],
    [
      'a regex literal containing /*',
      'blocks: the same, in the other direction — the marker opens a phantom block comment',
      'export const re2 = /\\/\\*/\nexport const w = performance.now()',
      'performance.now()',
    ],
    [
      'an escaped quote inside a string',
      'blocks: naive quote pairing that ignores backslash escapes',
      'export const q = "he said \\"hi\\" //"\nexport const y = Math.random()',
      'Math.random()',
    ],
    [
      'division that resembles a regex literal',
      'blocks: regex-literal detection that cannot tell / from ÷',
      'export const d1 = 10 / 2, d2 = 4 / 2\nexport const z2 = Date.now()',
      'Date.now()',
    ],
    [
      'an apostrophe inside a line comment',
      'blocks: THE most likely fix for FN-1 — reordering to strings-before-comments',
      "// don't read the clock here\nexport const t = Date.now()",
      'Date.now()',
    ],
    [
      'a backtick inside a plain string',
      'blocks: template handling that treats any backtick as a literal opener',
      'export const s = "a ` backtick"\nexport const v2 = Math.random()',
      'Math.random()',
    ],
    [
      'a double quote inside a line comment',
      'blocks: strings-before-comments again, via the other quote character',
      '// he said "hello\nexport const u = performance.now()',
      'performance.now()',
    ],
    [
      'a comment marker inside a template literal',
      'blocks: comment stripping that runs before template handling',
      'export const tpl = `/* not a comment */`\nexport const w2 = Date.now()',
      'Date.now()',
    ],
    // The two jt1-7 review catches, pinned so the fixes cannot regress:
    [
      'bare Function("...")() call',
      'blocks: banning only the `new Function()` constructor form — the call form is the same escape hatch',
      'export const f = Function("return 1")()',
      'Function()',
    ],
    [
      'an uppercase ../SHELL/ import',
      'blocks: a case-sensitive shell-import ban — macOS resolves the miscased path and runs it',
      "import { t } from '../SHELL/timebase'\nexport const ok = 1",
      'import from shell/',
    ],
  ]

  it.each(holds)('%s — %s', async (_name, _why, src, expected) => {
        expect(await rules(src)).toContain(expected)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// NO FALSE POSITIVES — the guard must stay usable.
// ─────────────────────────────────────────────────────────────────────────────
describe('no false positives — prose, data and legitimate code stay clean', () => {
  it('banned names in comments still do not flag (the tempest trap stays fixed)', async () => {
        expect(await rules('// the shell reads Date.now() and window.devicePixelRatio')).toEqual([])
    expect(await rules('/* seeded rng replaces Math.random() here */ const x = 1')).toEqual([])
    expect(await rules('/**\n * shell owns document.body and localStorage\n */')).toEqual([])
  })

  it('banned names inside string DATA still do not flag', async () => {
        expect(await rules('const err = "window.open failed"')).toEqual([])
    expect(await rules("const tip = 'seed replaces Math.random() calls'")).toEqual([])
    expect(await rules('const msg = `shell owns document.body`')).toEqual([])
  })

  it('lookalike identifiers still do not flag', async () => {
        expect(await rules('const windowSize = view.windowSize')).toEqual([])
    expect(await rules('const next = processInput(pad)')).toEqual([])
    expect(await rules('const evaluated = evaluate(expr)')).toEqual([])
    expect(await rules('let stamp: Date')).toEqual([])
    expect(await rules('type Timestamp = Date')).toEqual([])
  })

  it('parses TypeScript syntax, not just JavaScript', async () => {
    // src/core is TypeScript: interfaces, generics, `as const`, type-only
    // imports. A JS-only parser throws on all of it. (acorn, which the story
    // suggested, is JS-only — see the session finding.)
        const ts = [
      'export interface Platform { bit: number; cliffs: string[] }',
      'export const TABLE = [1, 2, 3] as const',
      'export function pick<T extends object>(x: T): keyof T { return Object.keys(x)[0] as keyof T }',
      'import type { Frame } from "./frame.js"',
      'export const enum Dir { Left = -1, Right = 1 }',
    ].join('\n')
    expect(await rules(ts), 'legitimate TypeScript must scan clean').toEqual([])
  })

  it('sweeps every real src/core module clean', async () => {
    // The guard is only useful if it is believable on the actual codebase.
        const files = readdirSync(coreDir, { recursive: true, encoding: 'utf8' }).filter((f) =>
      f.endsWith('.ts'),
    )
    expect(files.length, 'src/core must hold modules for this to mean anything').toBeGreaterThan(0)
    const dirty: string[] = []
    for (const f of files) {
      const hits = await rules(readFileSync(join(coreDir, f), 'utf8'), f)
      if (hits.length) dirty.push(`${f}: ${hits.join(', ')}`)
    }
    expect(dirty, 'the hardened scanner must not flag legitimate core code').toEqual([])
  })

  it('handles the 90KB data module without choking or hanging', async () => {
    // pictures.ts is ~92KB with ~970 quotes, 20 backticks and 117 slashes of
    // transcribed data. Catastrophic backtracking on input like this is a
    // classic regex failure mode, and it would present as a hung suite rather
    // than a red one.
        const big = join(coreDir, 'pictures.ts')
    if (!existsSync(big)) return
    const src = readFileSync(big, 'utf8')
    const started = performance.now()
    expect(await rules(src, 'pictures.ts')).toEqual([])
    expect(performance.now() - started, 'scanning one module must not take seconds').toBeLessThan(
      5000,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURAL — the two properties that keep the rest honest.
// ─────────────────────────────────────────────────────────────────────────────
describe('the scanner cannot quietly degrade', () => {
  it('does NOT silently pass source it cannot parse', async () => {
    // This is the anti-fallback test. "Tokenize, and on a parse error fall back
    // to the old regex" would satisfy every case above while reintroducing
    // every hole — and it is the obvious shortcut. So unparseable input must
    // fail loudly: throw, or report a violation. What it must never do is
    // return [] and let the file through.
        // NO banned token in this fixture: with one, a no-opped unparseability
    // detection still returns a hit from the wreckage and the assertion cannot
    // tell the difference (jt1-7 review proved it by simulating a TS upgrade).
    const broken = 'export const a = ((((\nexport const b = 1'
    let threw = false
    let hits: string[] = []
    try {
      hits = await rules(broken, 'broken.ts')
    } catch {
      threw = true
    }
    expect(
      threw || hits.length > 0,
      'unparseable source returned no violations — a scanner that cannot read a file ' +
        'must not certify it as clean',
    ).toBe(true)
  })

  it('is deterministic and does not mutate its input', async () => {
        const src = 'export const e = `t${Math.random()}`'
    const a = await rules(src)
    const b = await rules(src)
    expect(a).toEqual(b)
    expect(src, 'the scanner must not rewrite the source it was handed').toBe(
      'export const e = `t${Math.random()}`',
    )
  })

  it('exactly one scanner sweeps src/core — the old inline one is gone', () => {
    // Without this, GREEN can add the hardened scanner alongside the original
    // and leave the ORIGINAL doing the sweep: every new test passes, and
    // src/core is still guarded by the holey implementation.
    const purity = readFileSync(join(repoRoot, 'tests', 'purity.test.ts'), 'utf8')
    expect(
      purity,
      'purity.test.ts must consume the shared scanner rather than define its own',
    ).toMatch(/from\s+['"]\.\/helpers\/purity-scanner\.js['"]/)
    expect(
      purity,
      'the regex comment-stripper must be deleted, not left beside its replacement',
    ).not.toMatch(/function\s+stripComments/)
    expect(purity, 'and its string-blanking partner too').not.toMatch(/function\s+stripStrings/)
  })
})


// ─────────────────────────────────────────────────────────────────────────────
// jt1-11 — THE EVASION TAIL.
//
// jt1-7 replaced the regex stripper with a tokenizer and closed six holes. The
// Reviewer's remaining list is below. Each was reproduced against the CURRENT
// scanner before being written, with a live control (plain `Math.random()` →
// caught), so these are the same MUST FLIP cases as jt1-7 — not hypotheses.
//
//   const M = (Math); M.random()      MISSED — parenthesis not unwrapped
//   (Math satisfies object).random()  MISSED — type-operator wrapper
//   (Math as any)!.random()           MISSED — non-null assertion wrapper
//   Math['random']()                  MISSED — string-literal element access
//   Date['now']()                     MISSED — same, other banned member
//
// All four wrappers are the same defect seen four ways: the scanner reads the
// SYNTAX it expects (a bare identifier, a dotted member) and anything that
// wraps or re-spells the expression walks past. The fix is to unwrap before
// matching, and to treat a string-literal element access as the member it names.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt1-11 MUST FLIP — wrapped and re-spelled banned expressions', () => {
  const flips: ReadonlyArray<readonly [string, string]> = [
    ['a parenthesised alias — const M = (Math)', 'const M = (Math)\nexport const a = M.random()'],
    ['a satisfies-wrapped object', 'export const b = (Math satisfies object).random()'],
    ['a non-null-asserted alias', 'const m = Math as unknown as { random(): number }\nexport const c = m!.random()'],
    ["element access Math['random']()", "export const d = Math['random']()"],
    ["element access Date['now']()", "export const e = Date['now']()"],
    ['element access through a template literal', 'export const f = Math[`random`]()'],
  ]

  it.each(flips)('%s', async (_name, src) => {
    const violations = await loadScanner()
    const hits = violations(src, 'probe.ts')
    expect(hits.length, `nothing reported for: ${src.replace(/\n/g, ' ⏎ ')}`).toBeGreaterThan(0)
  })

  it('the control still fires, so the table above is not vacuous', async () => {
    const violations = await loadScanner()
    expect(violations('export const c = Math.random()', 'probe.ts').length).toBeGreaterThan(0)
  })

  it('and none of the wrappers create a FALSE positive on innocent code', async () => {
    // The other direction: unwrapping must not start flagging ordinary
    // parenthesised or asserted expressions that name nothing banned.
    const violations = await loadScanner()
    for (const clean of [
      'const n = (frameCount)\nexport const a = n.toFixed(2)',
      'export const b = (state satisfies object).posX',
      'const s = maybeState as State\nexport const c = s!.posY',
      "export const d = table['random']",
      'export const e = lookup[key]()',
    ]) {
      expect(violations(clean, 'clean.ts'), clean).toEqual([])
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// jt1-11 — AN HONEST BOUNDARY.
//
// The Reviewer's ruling: the scanner must STATE what it does not detect, rather
// than half-implementing dataflow analysis. A guard that silently stops at an
// arbitrary depth is worse than one whose limits are written down, because the
// reader assumes the former is complete.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt1-11 — the scanner documents its own limits', () => {
  const scannerPath = join(repoRoot, 'tests', 'helpers', 'purity-scanner.ts')

  it('the header names each undetected dataflow route explicitly', () => {
    // MUTATION-CHECKED: verified this assertion FAILS against the current
    // header (which names none of them) before being committed — see the
    // session notes. It is a text match, and text matches have passed
    // vacuously on me three times now, so it is checked rather than trusted.
    const header = readFileSync(scannerPath, 'utf8').split('\nexport ')[0]
    const required: ReadonlyArray<readonly [string, RegExp]> = [
      ['spread', /\bspread\b/i],
      ['Object.assign', /Object\.assign/],
      ['Reflect.get', /Reflect\.get/],
      ['reassignment aliasing', /reassign/i],
      ['class extends', /\bextends\b/],
      ['shadowing strictness', /shadow/i],
    ]
    const missing = required.filter(([, re]) => !re.test(header)).map(([n]) => n)
    expect(
      missing,
      'the header must name these as KNOWN LIMITATIONS — an undocumented gap ' +
        'reads as completeness to the next author',
    ).toEqual([])
  })

  it('and frames them as limitations rather than as features', () => {
    const header = readFileSync(scannerPath, 'utf8').split('\nexport ')[0]
    expect(
      header,
      'say plainly that these are NOT detected',
    ).toMatch(/not detected|does not detect|limitation|out of scope|cannot detect/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// jt1-11 — FAILURES MUST BE LOCATABLE.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt1-11 — a violation report names its file and line', () => {
  it('reports the line the violation sits on', async () => {
    // Today a report is just the rule name ("Math.random()"), so a sweep over a
    // 1800-line data module tells you a file is dirty and nothing more.
    // `node.getStart()` makes the line free.
    const violations = await loadScanner()
    const src = ['// one', '// two', '// three', 'export const f = Math.random()'].join('\n')
    const report = violations(src, 'probe.ts').join(' | ')
    expect(report, 'the rule name must survive').toContain('Math.random()')
    expect(report, 'and the line number must be there — the violation is on line 4').toMatch(/\b4\b/)
  })

  it('names the file it was given', async () => {
    const violations = await loadScanner()
    expect(violations('export const f = Date.now()', 'src/core/arena.ts').join(' | ')).toContain(
      'arena.ts',
    )
  })

  it('reports distinct lines for distinct violations', async () => {
    // A single line number for a file with several violations is barely better
    // than none.
    const violations = await loadScanner()
    const src = ['export const a = Math.random()', '', 'export const b = Date.now()'].join('\n')
    const report = violations(src, 'probe.ts').join(' | ')
    expect(report).toMatch(/\b1\b/)
    expect(report).toMatch(/\b3\b/)
  })
})
