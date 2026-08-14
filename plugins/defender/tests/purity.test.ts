// tests/purity.test.ts
//
// Story df1-1 — RED phase (O'Brien / TEA). The core/shell boundary guard for the
// eleventh game, ported from the proven millipede/centipede/joust scanner.
// src/core/ is the pure deterministic simulation; src/shell/ owns
// render/audio/input/storage/time. Nothing in core/ may touch a browser global,
// read a wall clock, mint ambient randomness, schedule work, reach the network, or
// import shell code. The story names four bans explicitly — fetch / canvas / Date /
// Math.random — and they are each pinned by a fixture below; the ported scanner
// bans the wider surface too.
//
// ─── RED/GREEN SPLIT (see .session/df1-1-session.md) ─────────────────────────────
// TEA (this file) authors the failing suite + the fixtures that give it teeth.
// GREEN (Dev) ports plugins/millipede/tests/helpers/purity-scanner.ts to
// plugins/defender/tests/helpers/purity-scanner.ts — the TypeScript-compiler-API
// scanner (flat text cannot tell CODE from TEXT-THAT-LOOKS-LIKE-CODE; a parser
// can). There is deliberately ONE implementation; a second inline one here is how
// the hardened scanner ends up tested while a holey one does the guarding.
//
// ─── WHY THIS IS RED, AND WHY IT STAYS GREEN-ARMED AFTERWARDS ─────────────────────
// RED today: tests/helpers/purity-scanner.js does not exist, so loadScanner()
// throws a self-describing "scanner not built yet" per test — not a cryptic
// module-resolution collect error.
// After GREEN: the FIXTURE self-tests are the teeth and run forever — they
// mutation-test the scanner itself (lang-review #18: a helper that reimplements a
// platform algorithm is untested code; exercise it directly). src/core/ does NOT
// exist yet — df2 lands the first core module (the framebuffer core; df3 the
// scheduler/ship) — so the per-file real-tree sweep at the bottom is ARMED BUT
// DORMANT: it.each over an empty listing registers nothing now and auto-activates
// the moment df2 lands the first core module. This is the deliberate "gate before
// constants" shape: the guard is committed before the sim it guards.

import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// tests/purity.test.ts → the plugin root is one level up.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const coreDir = join(root, 'src', 'core')

/** The scanner's runtime shape: located violations `rule (file:line)`. */
type Scan = (src: string, file?: string) => string[]

/**
 * Load the not-yet-ported scanner with a self-describing failure, so every RED
 * test reads "scanner not built yet", never a module-resolution stack trace (the
 * harness-error trap: a RED failure must prove the FEATURE is absent, not that the
 * test is broken).
 */
async function loadScanner(): Promise<Scan> {
  try {
    const mod = (await import('./helpers/purity-scanner.js')) as { violations?: Scan }
    if (typeof mod.violations !== 'function') throw new Error('module has no `violations` export')
    return mod.violations
  } catch (e) {
    throw new Error(
      'src/core purity scanner not built yet — GREEN (Dev) ports ' +
        'plugins/millipede/tests/helpers/purity-scanner.ts to ' +
        'plugins/defender/tests/helpers/purity-scanner.ts. It is the TypeScript-compiler-API ' +
        'scanner that bans, in CODE only (never in comments/strings/lookalikes): ' +
        'Date.now / new Date / performance.now / Math.random / setTimeout / setInterval / ' +
        'requestAnimationFrame / fetch / window.* / document.* / navigator.* / localStorage / ' +
        'sessionStorage / HTMLCanvasElement / globalThis / dynamic import() / eval / new Function / ' +
        'Date-aliasing / import from ../shell/. Export `violations(src, file?): string[]`. ' +
        `(${(e as Error).message})`,
    )
  }
}

/** Rule NAMES only — the shared scanner's `(file:line)` suffix stripped off. */
async function loadViolations(): Promise<(src: string) => string[]> {
  const scan = await loadScanner()
  return (src: string) => scan(src).map((r) => r.replace(/\s\([^()]*\)$/, ''))
}

describe('purity scanner — fixture self-tests (the guard must have teeth of its own)', () => {
  it('flags a live wall-clock call (Date.now / new Date / Math.random)', async () => {
    const violations = await loadViolations()
    expect(violations('const t = Date.now()')).toContain('Date.now()')
    expect(violations('const d = new Date()')).toContain('new Date()')
    expect(violations('const r = Math.random()')).toContain('Math.random()')
  })

  it('flags a live browser-global access (window / document / localStorage)', async () => {
    const violations = await loadViolations()
    expect(violations('window.addEventListener("keydown", fn)')).toContain('window.*')
    expect(violations('const el = document.querySelector("canvas")')).toContain('document.*')
    expect(violations('localStorage.setItem("hs", "1")')).toContain('localStorage')
  })

  it('flags a live network reach (fetch) — story-named ban', async () => {
    const violations = await loadViolations()
    // The deterministic sim owns no I/O — `fetch` is one of the four bans the
    // df1-1 story names by hand. A method-name lookalike must NOT flag.
    expect(violations('const res = await fetch("/scores")')).toContain('fetch()')
    expect(violations('refetch(state)'), 'refetch is not fetch — no boundary before it').toEqual([])
  })

  it('flags a live canvas surface (HTMLCanvasElement) — story-named ban', async () => {
    const violations = await loadViolations()
    // `canvas` reaches core only through the shell; the pure sim never names the
    // canvas type. document.querySelector('canvas') is already covered by document.*.
    expect(violations('function paint(c: HTMLCanvasElement) { return c }')).toContain('HTMLCanvasElement')
  })

  it('flags an import reaching from core into shell', async () => {
    const violations = await loadViolations()
    expect(violations("import { render } from '../shell/render'")).toContain('import from shell/')
    expect(violations('import { audio } from "./shell/audio"')).toContain('import from shell/')
  })

  it('does NOT flag the same tokens inside comments (the tempest trap, fixed)', async () => {
    const violations = await loadViolations()
    expect(violations('// the shell reads Date.now() and window.devicePixelRatio')).toEqual([])
    expect(violations('/* seeded rng replaces Math.random() here */ const x = 1')).toEqual([])
    expect(violations('/**\n * shell owns document.body and localStorage\n */')).toEqual([])
  })

  it('does NOT flag lookalike identifiers, URLs, or banned names inside string literals', async () => {
    const violations = await loadViolations()
    expect(violations('const windowSize = view.windowSize')).toEqual([])
    expect(violations('const doc = "https://example.com/window.html"')).toEqual([])
    expect(violations('const dateLike = { now: 1 }; dateLike.now')).toEqual([])
    expect(violations('const err = "window.open failed"')).toEqual([])
    expect(violations("const tip = 'seed replaces Math.random() calls'")).toEqual([])
    // …but the shell-import rule still sees import strings:
    expect(violations("import { r } from '../shell/render'")).toContain('import from shell/')
  })
})

// ─── The wider hardening bans, each with the full sidecar matrix: live CODE flags,
// comment/string/lookalike do NOT. Ported from millipede's suite (itself from
// centipede's "cp1-2 hardening bans" block). The scanner already implements these
// bans (it is a verbatim port), so these tests PASS — that is the point: without
// them the bans ship LIVE and UNTESTED (lang-review #18), so a future refactor of
// the ported scanner could silently drop the `globalThis`/`eval`/`new Function`/
// dynamic-import/`Date`-alias case and every defender core module could import the
// ambient global with the suite still green. The scanner's barrel must not be
// half-empty behind a gate every df* story trusts.
describe('purity scanner — hardening bans (globalThis / import() / eval / new Function / Date-alias)', () => {
  it('flags live globalThis, but not comments, strings, or lookalikes', async () => {
    const violations = await loadViolations()
    expect(violations('globalThis.document.title = "x"')).toContain('globalThis')
    expect(violations('const d = globalThis.Date')).toContain('globalThis')
    expect(violations('// globalThis is forbidden in core')).toEqual([])
    expect(violations('const name = "globalThis"')).toEqual([])
    expect(violations('const globalThisManager = makeManager()')).toEqual([]) // no trailing boundary
  })

  it('flags live dynamic import(), but not static imports, import.meta, comments, or strings', async () => {
    const violations = await loadViolations()
    expect(violations("const m = await import('./danger')")).toContain('dynamic import()')
    expect(violations('import ("./x")')).toContain('dynamic import()')
    // The critical non-matches: static import and import.meta must sail through.
    expect(violations("import { stepGame } from './sim'")).toEqual([])
    expect(violations('import type { GameState } from "./state"')).toEqual([])
    expect(violations('const u = import.meta.url')).toEqual([])
    expect(violations('// lazy import() is banned in core')).toEqual([])
    expect(violations('const s = "import(\'x\')"')).toEqual([])
  })

  it('flags live eval(), but not evaluate()/method-name lookalikes, comments, or strings', async () => {
    const violations = await loadViolations()
    expect(violations('eval("1 + 1")')).toContain('eval()')
    expect(violations('const evaluated = evaluate(expr)')).toEqual([]) // "evaluate(" ≠ "eval("
    expect(violations('const r = retrieval(x)')).toEqual([]) // no boundary before "eval"
    expect(violations('// never eval() untrusted input')).toEqual([])
    expect(violations('const note = "eval() is dangerous"')).toEqual([])
  })

  it('flags live new Function(), but not FunctionRegistry(), a Function type, or plain functions', async () => {
    const violations = await loadViolations()
    expect(violations('const f = new Function("return 1")')).toContain('new Function()')
    expect(violations('const reg = new FunctionRegistry()')).toEqual([]) // "Function(" not immediate
    expect(violations('let cb: Function')).toEqual([]) // type annotation, no new / no call
    expect(violations('function step(state) { return state }')).toEqual([]) // lowercase decl
    expect(violations('// new Function() generates code')).toEqual([])
    expect(violations('const t = "new Function()"')).toEqual([])
  })

  it('flags Date ALIASING (assignment), but not Date type annotations/aliases/generic defaults', async () => {
    const violations = await loadViolations()
    expect(violations('const D = Date')).toContain('Date aliasing (= Date)')
    expect(violations('let clock = Date')).toContain('Date aliasing (= Date)')
    // The false positives a bare `=\s*Date\b` regex would cause — all must pass clean:
    expect(violations('let stamp: Date')).toEqual([])
    expect(violations('type Timestamp = Date')).toEqual([])
    expect(violations('function at<T = Date>(): T { return undefined as T }')).toEqual([])
    expect(violations('const times = [] as Date[]')).toEqual([])
    // …and the mentions in prose/data still do not flag:
    expect(violations('// do not alias const D = Date to dodge the clock ban')).toEqual([])
    expect(violations('const hint = "const D = Date is an evasion"')).toEqual([])
  })
})

// The listing is guarded so a missing dir yields an empty (dormant) sweep, never
// an import-time throw. src/core/ does not exist until df2.
const coreFiles = existsSync(coreDir)
  ? readdirSync(coreDir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts'))
  : []

describe('src/core/ purity sweep (df1-1 — armed, dormant until df2 lands the sim)', () => {
  // Deliberately NO `expect(coreFiles.length).toBeGreaterThan(0)` — src/core is
  // df2's deliverable, so a non-empty assertion would keep df1-1 RED forever. And
  // no `Array.isArray(coreFiles)` tautology either (the ml1-1 R5 lesson: coreFiles
  // is array-typed on both ternary branches, so no production change could ever
  // fail it — lang-review #26 — while deleting it outright leaves this describe
  // with only the dormant `it.each([])`, an EMPTY suite vitest reports as a
  // failure). The meaningful anchor below pins the LOCATED form of the scanner —
  // the exact `scan(src, file)` path the `it.each(coreFiles)` sweep uses, which the
  // loadViolations() wrapper strips and the fixture self-tests above therefore
  // never exercise. This keeps the arming honest without coupling df1-1 to whether
  // core exists yet.
  it('the sweep emits LOCATED violations (rule + file:line) — the form the real-tree it.each relies on', async () => {
    const scan = await loadScanner()
    // When df2 lands a core module with a violation, the sweep must name WHERE, not
    // just WHAT — a hit on a large generated data module with no line leaves the
    // author grepping. loadViolations() strips the `(file:line)` suffix, so this is
    // the one place the located form is pinned.
    const hits = scan('export const tick = () => Date.now()', 'entity.ts')
    expect(
      hits.some((h) => /Date\.now\(\)\s+\(entity\.ts:1\)/.test(h)),
      `the sweep must locate the hit at entity.ts:1 — got: ${hits.join(', ')}`,
    ).toBe(true)
  })

  it.each(coreFiles)('src/core/%s stays inside the boundary', async (file) => {
    const scan = await loadScanner()
    const src = readFileSync(join(coreDir, file), 'utf8')
    // Located form (not the stripped wrapper): a hit on a large generated module
    // should name its line, not just the file.
    const hits = scan(src, file)
    expect(
      hits,
      `core/${file} crosses the core/shell boundary via: ${hits.join(', ')} — ` +
        'the deterministic sim owns no browser surface, clock, entropy, network, or shell import',
    ).toEqual([])
  })
})
