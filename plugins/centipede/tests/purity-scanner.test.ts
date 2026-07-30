// tests/purity-scanner.test.ts
//
// Story td1-2 — RED phase (Han Solo / TEA). Fold joust's AST core/shell purity
// scanner back into centipede. joust proved (jt1-7 + jt1-11) that a regex
// comment/string stripper cannot tell CODE from TEXT-THAT-LOOKS-LIKE-CODE, and
// six reproduced false negatives came from exactly that confusion. centipede
// still runs the regex stripper (tests/purity.test.ts: stripComments ->
// stripStrings -> BANNED), so it still has the holes.
//
// ─── THESE ARE TRUE REDS, NOT "the file doesn't exist yet" REDS ───────────────
// Every MUST FLIP case below was reproduced against centipede's CURRENT inline
// regex scanner before being written here, with a live `Math.random()` control
// proving the harness works. The current scanner returns NO violation for each
// (measured — see the story handoff for the probe table):
//
//   FN-1 string-embedded /*      centipede(old) -> []   (a `/*` in a string opens
//                                a phantom block comment that swallows the live
//                                Date.now() up to the next real `*/`)
//   FN-2 string-embedded //      centipede(old) -> []   (a `//` in a string
//                                truncates the line, eating performance.now())
//   FN-3 template interpolation  centipede(old) -> []   (stripStrings blanks the
//                                whole template, deleting the live `${...}`)
//   FN-4 Math destructure        centipede(old) -> []   (no Math-alias ban; the
//                                call `random()` is lexically unremarkable)
//   FN-5 fn-reference alias      centipede(old) -> []   (the call-anchored
//                                `Math.random(` regex needs the `(`; a bare
//                                `const rnd = Math.random` reference has none)
//   FN-6 string carrying BOTH    centipede(old) -> []   (no stripping order
//                                survives // and /* in one string)
//
// So the port CLOSES a real hole in each case; the red is the scanner being
// wrong, not a missing module. A GREEN that merely re-exported the old regex
// scanner into helpers/ would still FAIL every MUST FLIP test — which is the
// point.
//
// ─── REPO-SPECIFIC BAN SET (the port MUST preserve it) ───────────────────────
// centipede's core bans: Date.now, new Date, performance.now, Math.random,
// setTimeout, setInterval, requestAnimationFrame, window.*, document.*,
// navigator.*, localStorage, sessionStorage, fetch, addEventListener,
// HTMLCanvasElement, CanvasRenderingContext2D, AudioContext(+variants),
// globalThis, dynamic import(), eval, new Function, Date aliasing, shell import.
// It does NOT ban crypto/process/queueMicrotask/OffscreenCanvas/ImageData/bare
// Function() (those are joust-only). Build the AST tables from THIS set. The
// alias closure the six require (Math + Date in the aliasable set, element-access
// through the member table) only closes evasions of bans centipede ALREADY has —
// it adds no new surface.
//
// FN-5 note: joust's canonical FN-5 is `const readClock = Date.now`, but
// centipede's over-broad `= Date` alias regex accidentally CATCHES that (and
// double-reports on `Date.now()` — pinned below). So FN-5 is re-aimed at the same
// evasion shape one member over: `const rnd = Math.random; rnd()`, which the
// call-anchored `Math.random(` regex genuinely misses. Proven red.
//
// Pure fs/text, node env (vite.config.ts sets environment:'node'), repo-local —
// no vendored tree, so every test runs on CI with no skipIf.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const coreDir = join(repoRoot, 'src', 'core')
const scannerPath = join(repoRoot, 'tests', 'helpers', 'purity-scanner.ts')

type Violations = (source: string, filename?: string) => string[]

/**
 * Load the ported AST scanner. GREEN (Dev) creates
 * tests/helpers/purity-scanner.ts on the TypeScript compiler API
 * (ts.createSourceFile — NOT acorn, which is JS-only and not in the Vite 8 tree)
 * exporting `violations(source, filename?): string[]`, and migrates
 * tests/purity.test.ts onto it. Until then this throws, and every case is RED.
 */
async function loadScanner(): Promise<Violations> {
  const specifier = ['.', 'helpers', 'purity-scanner.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as { violations?: Violations }
    if (typeof mod.violations !== 'function') throw new Error('module has no `violations` export')
    return mod.violations
  } catch (e) {
    throw new Error(
      'ported AST purity scanner not built yet — GREEN (Dev) creates ' +
        'centipede/tests/helpers/purity-scanner.ts exporting `violations(source, filename?): string[]`, ' +
        'tokenizing via ts.createSourceFile rather than regex-stripping, preserving ' +
        `centipede's ban set, and migrates tests/purity.test.ts onto it. (${(e as Error).message})`,
    )
  }
}

/** Rule names only, with the `(file:line)` suffix jt1-11 added stripped off. */
const rules = async (src: string, file?: string): Promise<string[]> =>
  (await loadScanner())(src, file).map((r) => r.replace(/\s\([^()]*\)$/, ''))

/** Naming-agnostic: matches whether the port names a member 'Date.now' or 'Date.now()'. */
const flags = (hits: string[], re: RegExp): boolean => hits.some((h) => re.test(h))

// ─────────────────────────────────────────────────────────────────────────────
// MUST FLIP — the six false negatives, each proven red against the current
// regex scanner (see header) and green against joust's AST scanner.
// ─────────────────────────────────────────────────────────────────────────────
describe('td1-2 MUST FLIP — false negatives the current regex scanner misses', () => {
  it('FN-1: a /* inside an ordinary string must not disable the guard', async () => {
    const src = [
      'export const a = "contains /* marker"',
      'export const b = Date.now()',
      '/** an ordinary doc comment, which closes the phantom block */',
      'export const z = 1',
    ].join('\n')
    const hits = await rules(src)
    expect(flags(hits, /\bDate\.now/), `Date.now() sits inside the swallowed span, got: [${hits}]`).toBe(true)
  })

  it('FN-2: a // inside a string must not truncate the line', async () => {
    const hits = await rules('export const c = "a//b" + performance.now()')
    expect(flags(hits, /\bperformance\.now/), `got: [${hits}]`).toBe(true)
  })

  it('FN-3: template interpolation is live code, not comment-adjacent text', async () => {
    const hits = await rules('export const e = `t${Math.random()}`')
    expect(flags(hits, /\bMath\.random/), `the ${'${...}'} holds a live call, got: [${hits}]`).toBe(true)
  })

  it('FN-4: destructuring an alias must not evade a member-anchored ban', async () => {
    const hits = await rules(['const { random } = Math', 'export const f = random()'].join('\n'))
    expect(hits.length, `aliasing Math.random by destructuring must be reported, got: [${hits}]`).toBeGreaterThan(0)
  })

  it('FN-5: a function-reference alias must not evade a call-anchored ban', async () => {
    // Re-aimed off Date onto Math (see header): centipede's `= Date` regex would
    // catch the Date form, but the call-anchored `Math.random(` regex genuinely
    // misses a bare reference `const rnd = Math.random`.
    const hits = await rules(['const rnd = Math.random', 'export const g = rnd()'].join('\n'))
    expect(hits.length, `aliasing Math.random by reference must be reported, got: [${hits}]`).toBeGreaterThan(0)
  })

  it('FN-6: a string carrying BOTH // and /* (no stripping order survives it)', async () => {
    const src = [
      'export const s = "// and /* together"',
      'export const x = Date.now()',
      '/** closer */',
    ].join('\n')
    const hits = await rules(src)
    expect(flags(hits, /\bDate\.now/), `got: [${hits}]`).toBe(true)
  })

  it('BONUS (jt1-7 review): a miscased ../SHELL/ import must still flag', async () => {
    // Not one of the canonical six, but a 7th genuine false negative proven this
    // session: centipede's SHELL_IMPORT regex has no `i` flag, so '../SHELL/render'
    // (which macOS resolves and RUNS on its case-insensitive fs) sails past. old ->
    // []. joust's SHELL_SPECIFIER is case-insensitive; porting it closes this.
    const hits = await rules("import { r } from '../SHELL/render'\nexport const ok = 1")
    expect(flags(hits, /shell/i), `got: [${hits}]`).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MUST HOLD — currently caught by the regex scanner, and each boxes in a
// different plausible regex patch. The port must keep catching every one.
// ─────────────────────────────────────────────────────────────────────────────
describe('td1-2 MUST HOLD — cases that box in the fix', () => {
  const holds: ReadonlyArray<readonly [string, string, string, RegExp]> = [
    ['nested template literals', 'a template regex taught about ${} but not nesting',
      'export const n = `a${`b${Date.now()}c`}d`', /\bDate\.now/],
    ['a regex literal containing a quote', 'a char scanner with no regex-literal awareness',
      "export const re = /[']/\nexport const v = Math.random()", /\bMath\.random/],
    ['a regex literal containing /*', 'the same, the other direction',
      'export const re2 = /\\/\\*/\nexport const w = performance.now()', /\bperformance\.now/],
    ['an escaped quote inside a string', 'naive quote pairing that ignores backslash escapes',
      'export const q = "he said \\"hi\\" //"\nexport const y = Math.random()', /\bMath\.random/],
    ['division that resembles a regex literal', 'regex detection that cannot tell / from ÷',
      'export const d1 = 10 / 2, d2 = 4 / 2\nexport const z2 = Date.now()', /\bDate\.now/],
    ['an apostrophe inside a line comment', 'THE most likely FN-1 patch — strings before comments',
      "// don't read the clock here\nexport const t = Date.now()", /\bDate\.now/],
    ['a backtick inside a plain string', 'template handling that treats any backtick as an opener',
      'export const s = "a ` backtick"\nexport const v2 = Math.random()', /\bMath\.random/],
    ['a comment marker inside a template literal', 'comment stripping that runs before template handling',
      'export const tpl = `/* not a comment */`\nexport const w2 = Date.now()', /\bDate\.now/],
    ['a lowercase ../shell/ import', 'coverage the swap must not lose (the uppercase form is the BONUS flip above)',
      "import { r } from '../shell/render'\nexport const ok = 1", /shell/i],
  ]

  it.each(holds)('%s — blocks: %s', async (_name, _why, src, expected) => {
    const hits = await rules(src)
    expect(flags(hits, expected), `got: [${hits}]`).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// NO FALSE POSITIVES — the whole point of AST over regex is fewer false
// positives. Prose, string data and legitimate TypeScript stay clean, and the
// port must not redden a single real core module.
// ─────────────────────────────────────────────────────────────────────────────
describe('td1-2 no false positives — prose, data and legit code stay clean', () => {
  it('banned names in comments still do not flag', async () => {
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
    expect(await rules('function at<T = Date>(): T { return undefined as T }')).toEqual([])
  })

  it('parses TypeScript syntax, not just JavaScript', async () => {
    const ts = [
      'export interface Grid { rows: number; segments: string[] }',
      'export const TABLE = [1, 2, 3] as const',
      'export function pick<T extends object>(x: T): keyof T { return Object.keys(x)[0] as keyof T }',
      'import type { Frame } from "./frame.js"',
      'export const enum Dir { Left = -1, Right = 1 }',
    ].join('\n')
    expect(await rules(ts), 'legitimate TypeScript must scan clean').toEqual([])
  })

  it('sweeps every real src/core module clean (AC-2 — no false positives on real code)', async () => {
    const files = readdirSync(coreDir, { recursive: true, encoding: 'utf8' }).filter((f) =>
      String(f).endsWith('.ts'),
    )
    expect(files.length, 'src/core must hold modules for this to mean anything').toBeGreaterThan(0)
    const dirty: string[] = []
    for (const f of files) {
      const hits = await rules(readFileSync(join(coreDir, String(f)), 'utf8'), String(f))
      if (hits.length) dirty.push(`${f}: ${hits.join(', ')}`)
    }
    expect(dirty, 'the AST scanner must not flag legitimate core code').toEqual([])
  })

  it('handles the pictures.ts data module without choking or hanging', async () => {
    const big = join(coreDir, 'pictures.ts')
    if (!existsSync(big)) return
    const started = performance.now()
    expect(await rules(readFileSync(big, 'utf8'), 'pictures.ts')).toEqual([])
    expect(performance.now() - started, 'scanning one module must not take seconds').toBeLessThan(5000)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE `= Date` DOUBLE-REPORT — pinned gone. centipede's regex reports a clock
// CALL twice: once as `Date.now()` and again as `Date aliasing (= Date)`, because
// `= Date` is a textual prefix of `= Date.now()`. joust's copy names one defect
// once. Measured: `const t = Date.now()` -> ['Date.now()', 'Date aliasing (= Date)'].
// ─────────────────────────────────────────────────────────────────────────────
describe('td1-2 — a clock CALL is reported under one rule only, not also as an alias', () => {
  it('const t = Date.now() reports exactly once', async () => {
    const hits = await rules('const t = Date.now()')
    expect(flags(hits, /\bDate\.now/), `the clock call must still flag, got: [${hits}]`).toBe(true)
    expect(hits.length, `one defect, one report — got: [${hits}]`).toBe(1)
  })

  it('const d = new Date() reports exactly once', async () => {
    const hits = await rules('const d = new Date()')
    expect(hits.length, `got: [${hits}]`).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// LOCATED REPORTS — jt1-11 appended `(file:line)` so a sweep over a big data
// module names the line, not just "this file is dirty".
// ─────────────────────────────────────────────────────────────────────────────
describe('td1-2 — a violation report names its file and line', () => {
  it('reports the line the violation sits on', async () => {
    const violations = await loadScanner()
    const src = ['// one', '// two', '// three', 'export const f = Math.random()'].join('\n')
    const report = violations(src, 'probe.ts').join(' | ')
    expect(report, 'the rule name must survive').toMatch(/Math\.random/)
    expect(report, 'the violation is on line 4').toMatch(/\b4\b/)
  })

  it('names the file it was given', async () => {
    const violations = await loadScanner()
    expect(violations('export const f = Date.now()', 'src/core/sim.ts').join(' | ')).toContain('sim.ts')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTED LIMITS — the scanner is syntactic. It must STATE the dataflow
// routes it does not follow, rather than half-implementing them (a silent gap
// reads as completeness). MUTATION-CHECKED: this list fails against a header that
// names none of them.
// ─────────────────────────────────────────────────────────────────────────────
describe('td1-2 — the scanner documents its own limits', () => {
  it('the header names each undetected dataflow route explicitly', () => {
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
    expect(missing, 'each must be named as a KNOWN LIMITATION').toEqual([])
  })

  it('and frames them as limitations rather than as features', () => {
    const header = readFileSync(scannerPath, 'utf8').split('\nexport ')[0]
    expect(header).toMatch(/not detected|does not detect|limitation|out of scope|cannot detect/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURAL — the two properties that keep the rest honest.
// ─────────────────────────────────────────────────────────────────────────────
describe('td1-2 — the scanner cannot quietly degrade', () => {
  it('does NOT silently pass source it cannot parse (the anti-fallback rule)', async () => {
    // "Tokenize, and on a parse error fall back to the old regex" would satisfy
    // every case above while reintroducing every hole. NO banned token in the
    // fixture: with one, a no-opped unparseability check still returns a hit from
    // the wreckage and the assertion cannot tell the difference.
    //
    // The scanner is loaded OUTSIDE the try on purpose: if it were inside, a
    // missing module would land in the catch and pass this test vacuously (any
    // always-throwing scanner would satisfy it). This way the module must exist,
    // and only then is its behaviour on unparseable source under test.
    const scan = await loadScanner()
    const broken = 'export const a = ((((\nexport const b = 1'
    let threw = false
    let hits: string[] = []
    try {
      hits = scan(broken, 'broken.ts')
    } catch {
      threw = true
    }
    expect(
      threw || hits.length > 0,
      'unparseable source must not certify clean — throw, or report a violation',
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

  it('exactly one scanner sweeps src/core — the old inline regex stripper is gone', () => {
    // Without this, GREEN can add the AST scanner alongside the original and leave
    // the ORIGINAL (holey) one doing the sweep: every new test passes, and
    // src/core is still guarded by the regex stripper.
    const purity = readFileSync(join(repoRoot, 'tests', 'purity.test.ts'), 'utf8')
    expect(purity, 'purity.test.ts must consume the shared scanner').toMatch(
      /from\s+['"]\.\/helpers\/purity-scanner\.js['"]/,
    )
    expect(purity, 'the regex comment-stripper must be deleted, not left beside its replacement').not.toMatch(
      /function\s+stripComments/,
    )
    expect(purity, 'and its string-blanking partner too').not.toMatch(/function\s+stripStrings/)
  })
})
