// tests/purity.test.ts
//
// Story cp1-1 — RED phase (O'Brien / TEA). The core/shell boundary guard: the
// single most important rule in every game repo, encoded as a sweep the suite
// runs forever. src/core/ is the pure deterministic simulation; src/shell/ owns
// render/audio/input/storage/time. Nothing in core/ may touch a browser global,
// read a wall clock, mint ambient randomness, schedule work, or import shell code.
//
// Story td1-2 (GREEN) replaced the inline regex comment/string stripper this
// file used to carry with the shared TypeScript-compiler-API scanner in
// tests/helpers/purity-scanner.ts (ported from joust's jt1-7/jt1-11). The regex
// scanner had six proven false negatives (see tests/purity-scanner.test.ts);
// flat text cannot tell CODE from TEXT-THAT-LOOKS-LIKE-CODE, and a parser can.
// There is deliberately ONE implementation, shared with purity-scanner.test.ts —
// keeping a second one here is how the hardened scanner ends up tested while a
// holey one keeps doing the actual guarding.
//
// RED today via the teeth test (src/core/ does not exist yet — GREEN creates the
// skeleton). The per-file sweeps are it.each over the core listing, so they take
// effect the moment core modules land, and AC-2's "demonstrably fails when a
// forbidden global is introduced" is proven both by fixture (forever) and by the
// temporary red run recorded in the story notes (once, against the real tree).

import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { violations as scan } from './helpers/purity-scanner.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const coreDir = join(root, 'src', 'core')

/**
 * Rule NAMES only, with the `(file:line)` suffix the shared scanner adds
 * stripped off. The fixture self-tests below assert on rule identity; the
 * src/core sweep at the bottom keeps the full located form, because that is
 * the one a human reads when the guard fires on a large generated module.
 */
const violations = (src: string): string[] => scan(src).map((r) => r.replace(/\s\([^()]*\)$/, ''))

describe('purity scanner — fixture self-tests (the guard must have teeth of its own)', () => {
  it('flags a live wall-clock call', () => {
    expect(violations('const t = Date.now()')).toContain('Date.now()')
    expect(violations('const r = Math.random()')).toContain('Math.random()')
  })

  it('flags a live browser-global access', () => {
    expect(violations('window.addEventListener("keydown", fn)')).toContain('window.*')
    expect(violations('const el = document.querySelector("canvas")')).toContain('document.*')
    expect(violations('localStorage.setItem("hs", "1")')).toContain('localStorage')
  })

  it('flags an import reaching from core into shell', () => {
    expect(violations("import { render } from '../shell/render'")).toContain('import from shell/')
    expect(violations('import { audio } from "./shell/audio"')).toContain('import from shell/')
  })

  it('does NOT flag the same tokens inside comments (the tempest trap, fixed)', () => {
    expect(violations('// the shell reads Date.now() and window.devicePixelRatio')).toEqual([])
    expect(violations('/* seeded rng replaces Math.random() here */ const x = 1')).toEqual([])
    expect(violations('/**\n * shell owns document.body and localStorage\n */')).toEqual([])
  })

  it('does NOT flag lookalike identifiers or URLs', () => {
    expect(violations('const windowSize = view.windowSize')).toEqual([])
    expect(violations('const doc = "https://example.com/window.html"')).toEqual([])
    expect(violations('refetch(state)')).toEqual([])
    expect(violations('const dateLike = { now: 1 }; dateLike.now')).toEqual([])
  })

  it('does NOT flag banned names inside string literals (data, not code)', () => {
    expect(violations('const err = "window.open failed"')).toEqual([])
    expect(violations("const tip = 'seed replaces Math.random() calls'")).toEqual([])
    expect(violations('const msg = `shell owns document.body`')).toEqual([])
    // …but the shell-import rule still sees import strings:
    expect(violations("import { r } from '../shell/render'")).toContain('import from shell/')
  })
})

// ─── cp1-2: the four cp1-1 Reviewer hardening bans, each with the full sidecar
// matrix — live code flags, comment/string/lookalike do NOT. A scanner without
// self-tests silently rots; these keep every new ban honest forever.
describe('purity scanner — cp1-2 hardening bans (globalThis / import() / eval / new Function / Date-alias)', () => {
  it('flags live globalThis, but not comments, strings, or lookalikes', () => {
    expect(violations('globalThis.document.title = "x"')).toContain('globalThis')
    expect(violations('const d = globalThis.Date')).toContain('globalThis')
    expect(violations('// globalThis is forbidden in core')).toEqual([])
    expect(violations('const name = "globalThis"')).toEqual([])
    expect(violations('const globalThisManager = makeManager()')).toEqual([]) // no trailing boundary
  })

  it('flags live dynamic import(), but not static imports, import.meta, comments, or strings', () => {
    expect(violations("const m = await import('./danger')")).toContain('dynamic import()')
    expect(violations('import ("./x")')).toContain('dynamic import()')
    // The critical non-matches: static import and import.meta must sail through.
    expect(violations("import { stepGame } from './sim'")).toEqual([])
    expect(violations('import type { GameState } from "./state"')).toEqual([])
    expect(violations('const u = import.meta.url')).toEqual([])
    expect(violations('// lazy import() is banned in core')).toEqual([])
    expect(violations('const s = "import(\'x\')"')).toEqual([])
  })

  it('flags live eval(), but not evaluate()/method-name lookalikes, comments, or strings', () => {
    expect(violations('eval("1 + 1")')).toContain('eval()')
    expect(violations('const evaluated = evaluate(expr)')).toEqual([]) // "evaluate(" ≠ "eval("
    expect(violations('const r = retrieval(x)')).toEqual([]) // no boundary before "eval"
    expect(violations('// never eval() untrusted input')).toEqual([])
    expect(violations('const note = "eval() is dangerous"')).toEqual([])
  })

  it('flags live new Function(), but not FunctionRegistry(), a Function type, or plain functions', () => {
    expect(violations('const f = new Function("return 1")')).toContain('new Function()')
    expect(violations('const reg = new FunctionRegistry()')).toEqual([]) // "Function(" not immediate
    expect(violations('let cb: Function')).toEqual([]) // type annotation, no new / no call
    expect(violations('function step(state) { return state }')).toEqual([]) // lowercase decl
    expect(violations('// new Function() generates code')).toEqual([])
    expect(violations('const t = "new Function()"')).toEqual([])
  })

  it('flags Date ALIASING (assignment), but not Date type annotations/aliases/generic defaults', () => {
    expect(violations('const D = Date')).toContain('Date aliasing (= Date)')
    expect(violations('let clock = Date')).toContain('Date aliasing (= Date)')
    // The SM-flagged false positives a bare `=\s*Date\b` would cause — all must pass:
    expect(violations('let stamp: Date')).toEqual([])
    expect(violations('type Timestamp = Date')).toEqual([])
    expect(violations('function at<T = Date>(): T { return undefined as T }')).toEqual([])
    expect(violations('const times = [] as Date[]')).toEqual([])
    // …and the mentions in prose/data still do not flag:
    expect(violations('// do not alias const D = Date to dodge the clock ban')).toEqual([])
    expect(violations('const hint = "const D = Date is an evasion"')).toEqual([])
  })
})

// Guard the listing itself so a missing dir fails the teeth test below instead of
// exploding at import time.
const coreFiles = existsSync(coreDir)
  ? readdirSync(coreDir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts'))
  : []

describe('src/core/ purity sweep (cp1-1 AC-2 — the boundary guard)', () => {
  it('scans a non-empty src/core/ (the sweep must have teeth)', () => {
    // RED until GREEN lands the core skeleton: an empty or missing core/ would
    // make every sweep below pass vacuously, so emptiness itself is a failure.
    expect(
      coreFiles.length,
      'src/core/ must exist and hold at least one .ts module for the sweep to bite',
    ).toBeGreaterThan(0)
  })

  it.each(coreFiles)('src/core/%s stays inside the boundary', (file) => {
    const src = readFileSync(join(coreDir, file), 'utf8')
    // Located form here (not the stripped `violations` wrapper above): a hit on
    // a large generated module should name its line, not just the file.
    const hits = scan(src, file)
    expect(
      hits,
      `core/${file} crosses the core/shell boundary via: ${hits.join(', ')} — ` +
        'the deterministic sim owns no browser surface, clock, entropy, or shell import',
    ).toEqual([])
  })
})
