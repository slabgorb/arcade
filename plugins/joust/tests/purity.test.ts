// tests/purity.test.ts
//
// Story jt1-1 — RED phase (O'Brien / TEA). The core/shell boundary guard: the
// single most important rule in every game repo, encoded as a sweep the suite
// runs forever. src/core/ is the pure deterministic simulation; src/shell/ owns
// render/audio/input/storage/time. Nothing in core/ may touch a browser global,
// read a wall clock, mint ambient randomness, schedule work, or import shell code.
//
// Joust needs this guard harder than its siblings do. The design spec pins the
// sim to integer frame counting (FRAME_HZ = 8e6/(512*260), one step per video
// frame — the ROM's nap unit IS one frame) and the epic's later stories assert
// bit-for-bit replay determinism through wrap, ceiling bounce, landing and
// takeoff (jt1-5 AC-3). A single wall-clock read or ambient Math.random in core
// silently voids every one of those claims, and voids them in a way that only
// shows up as flake. The spec says it outright: "core never reads a clock",
// "no Date.now/Math.random anywhere in core".
//
// ─── THE COMMENT-SCANNER TRAP, FIXED STRUCTURALLY ────────────────────────────
// Tempest's equivalent guard matched forbidden names ANYWHERE in the source
// text, comments included — and a doc sentence that merely MENTIONED a banned
// global tripped it (a trap that recurred, and that the jt1-1 story text calls
// out by name). This scanner STRIPS comments and string literals before
// matching, so core/ prose can document the boundary freely while live code
// still cannot cross it. The fixture self-tests below pin that behaviour
// permanently: a token in a comment must NOT flag; the same token as live code
// MUST flag. That matrix is why the paragraph you are reading — which names
// Date.now and Math.random in plain prose — does not fail this very file's
// sibling rule when core/ modules quote it.
//
// RED today via the teeth test (src/core/ does not exist yet — GREEN creates
// the skeleton). The per-file sweeps are it.each over the core listing, so they
// bite the moment core modules land, and AC-2's "demonstrably fails when a
// forbidden global is introduced" is proven twice over: by fixture (forever)
// and by the temporary red run recorded in the story notes (once, against the
// real tree).

import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { violations } from './helpers/purity-scanner.js'

/**
 * Rule NAMES only, with the `(file:line)` suffix jt1-11 added stripped off.
 * The fixture self-tests below assert on rule identity; the src/core sweep at
 * the bottom keeps the full located form, because that is the one a human reads
 * when the guard fires on a 1800-line generated module.
 */
const rules = (src: string): string[] => violations(src).map((r) => r.replace(/\s\([^()]*\)$/, ''))

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const coreDir = join(root, 'src', 'core')

// The scanner itself now lives in tests/helpers/purity-scanner.ts, shared with
// tests/purity-scanner.test.ts. jt1-7 replaced the regex comment/string
// strippers this file used to carry with a TypeScript-compiler-API walk: flat
// text cannot tell CODE from TEXT-THAT-LOOKS-LIKE-CODE, and six reproduced
// false negatives came from exactly that confusion (a `/*` inside a string
// silently disabling the guard across an arbitrary span being the worst).
//
// There is deliberately ONE implementation. Keeping a second one here — even a
// "simpler" one for this file's own sweep — is how the hardened scanner ends up
// tested while the holey scanner does the guarding.

describe('purity scanner — fixture self-tests (the guard must have teeth of its own)', () => {
  it('flags a live wall-clock call or ambient entropy', () => {
    expect(rules('const t = Date.now()')).toContain('Date.now()')
    expect(rules('const t = performance.now()')).toContain('performance.now()')
    expect(rules('const r = Math.random()')).toContain('Math.random()')
    expect(rules('crypto.getRandomValues(buf)')).toContain('crypto.*')
  })

  it('flags a live browser-global access', () => {
    expect(rules('window.addEventListener("keydown", fn)')).toContain('window.*')
    expect(rules('const el = document.querySelector("canvas")')).toContain('document.*')
    expect(rules('localStorage.setItem("hs", "1")')).toContain('localStorage')
    expect(rules('const hz = process.env.FRAME_HZ')).toContain('process.*')
  })

  it('flags a live scheduling call (core advances only when stepped)', () => {
    expect(rules('setTimeout(step, 16)')).toContain('setTimeout()')
    expect(rules('requestAnimationFrame(loop)')).toContain('requestAnimationFrame()')
    expect(rules('queueMicrotask(flush)')).toContain('queueMicrotask()')
  })

  it('flags render/audio surface types crossing into core', () => {
    expect(rules('function draw(ctx: CanvasRenderingContext2D) {}')).toContain(
      'CanvasRenderingContext2D',
    )
    expect(rules('const buf = new OffscreenCanvas(292, 240)')).toContain('OffscreenCanvas')
    expect(rules('const px: ImageData = atlas.get()')).toContain('ImageData')
  })

  it('flags an import reaching from core into shell', () => {
    expect(rules("import { render } from '../shell/render'")).toContain('import from shell/')
    expect(rules('import { audio } from "./shell/audio"')).toContain('import from shell/')
  })

  it('does NOT flag the same tokens inside comments (the tempest trap, fixed)', () => {
    expect(rules('// the shell reads Date.now() and window.devicePixelRatio')).toEqual([])
    expect(rules('/* seeded rng replaces Math.random() here */ const x = 1')).toEqual([])
    expect(rules('/**\n * shell owns document.body and localStorage\n */')).toEqual([])
  })

  it('does NOT let an apostrophe in a comment swallow the code after it', () => {
    // The ordering trap: if strings were blanked BEFORE comments, the lone
    // apostrophe in "don't" would open a phantom string literal that ran to the
    // next quote — hiding the live violation on the following line. Strip
    // comments first and the live call is still caught.
    const src = "// don't read the clock in core\nconst t = Date.now()"
    expect(rules(src)).toContain('Date.now()')
  })

  it('still flags a live violation that carries a trailing comment', () => {
    // Stripping the trailing comment must not take the live code with it.
    expect(rules('const t = Date.now() // the shell should own this')).toContain('Date.now()')
  })

  it('does NOT flag lookalike identifiers or URLs', () => {
    expect(rules('const windowSize = view.windowSize')).toEqual([])
    expect(rules('const doc = "https://example.com/window.html"')).toEqual([])
    expect(rules('refetch(state)')).toEqual([])
    expect(rules('const dateLike = { now: 1 }; dateLike.now')).toEqual([])
    expect(rules('const next = processInput(pad)')).toEqual([])
    expect(rules('const done = processed.length')).toEqual([])
  })

  it('does NOT flag banned names inside string literals (data, not code)', () => {
    expect(rules('const err = "window.open failed"')).toEqual([])
    expect(rules("const tip = 'seed replaces Math.random() calls'")).toEqual([])
    expect(rules('const msg = `shell owns document.body`')).toEqual([])
    // …but the shell-import rule still sees import strings:
    expect(rules("import { r } from '../shell/render'")).toContain('import from shell/')
  })
})

describe('purity scanner — evasion bans (globalThis / import() / eval / new Function / Date-alias)', () => {
  it('flags live globalThis, but not comments, strings, or lookalikes', () => {
    expect(rules('globalThis.document.title = "x"')).toContain('globalThis')
    expect(rules('const d = globalThis.Date')).toContain('globalThis')
    expect(rules('// globalThis is forbidden in core')).toEqual([])
    expect(rules('const name = "globalThis"')).toEqual([])
    expect(rules('const globalThisManager = makeManager()')).toEqual([])
  })

  it('flags live dynamic import(), but not static imports, import.meta, comments, or strings', () => {
    expect(rules("const m = await import('./danger')")).toContain('dynamic import()')
    expect(rules('import ("./x")')).toContain('dynamic import()')
    // The critical non-matches: static import and import.meta must sail through.
    expect(rules("import { stepFrame } from './sim'")).toEqual([])
    expect(rules('import type { GameState } from "./state"')).toEqual([])
    expect(rules('const u = import.meta.url')).toEqual([])
    expect(rules('// lazy import() is banned in core')).toEqual([])
  })

  it('flags live eval(), but not evaluate()/method-name lookalikes, comments, or strings', () => {
    expect(rules('eval("1 + 1")')).toContain('eval()')
    expect(rules('const evaluated = evaluate(expr)')).toEqual([]) // "evaluate(" ≠ "eval("
    expect(rules('const r = retrieval(x)')).toEqual([]) // no boundary before "eval"
    expect(rules('// never eval() untrusted input')).toEqual([])
    expect(rules('const note = "eval() is dangerous"')).toEqual([])
  })

  it('flags live new Function(), but not FunctionRegistry(), a Function type, or plain functions', () => {
    expect(rules('const f = new Function("return 1")')).toContain('new Function()')
    expect(rules('const reg = new FunctionRegistry()')).toEqual([])
    expect(rules('let cb: Function')).toEqual([])
    expect(rules('function stepFrame(state) { return state }')).toEqual([])
    expect(rules('// new Function() generates code')).toEqual([])
  })

  it('flags Date ALIASING (assignment), but not Date type annotations/aliases/generic defaults', () => {
    expect(rules('const D = Date')).toContain('Date aliasing (= Date)')
    expect(rules('let clock = Date')).toContain('Date aliasing (= Date)')
    // The false positives a bare `=\s*Date\b` would cause — all must pass:
    expect(rules('let stamp: Date')).toEqual([])
    expect(rules('type Timestamp = Date')).toEqual([])
    expect(rules('function at<T = Date>(): T { return undefined as T }')).toEqual([])
    expect(rules('const times = [] as Date[]')).toEqual([])
    expect(rules('// do not alias const D = Date to dodge the clock ban')).toEqual([])
  })

  it('reports a clock CALL under one rule only, not also as an alias', () => {
    // Regression guard for the jt1-1 tightening. `= Date` is a textual prefix
    // of `= Date.now()`, so the un-tightened alias rule fired on both — a
    // failure message naming two bans for one defect sends the author looking
    // for a second, non-existent problem.
    expect(rules('const t = Date.now()')).toEqual(['Date.now()'])
    expect(rules('let parsed = Date.parse(s)')).toEqual([])
    expect(rules('const d = new Date()')).toEqual(['new Date()'])
  })
})

// Guard the listing itself so a missing dir fails the teeth test below instead
// of exploding at import time. NOTE (tempest tp1-8 trap): this const is read at
// module scope, so it must never throw — existsSync guards the readdirSync.
const coreFiles = existsSync(coreDir)
  ? readdirSync(coreDir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts'))
  : []

describe('src/core/ purity sweep (jt1-1 AC-2 — the boundary guard)', () => {
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
    const hits = violations(src)
    expect(
      hits,
      `core/${file} crosses the core/shell boundary via: ${hits.join(', ')} — ` +
        'the deterministic sim owns no browser surface, clock, entropy, or shell import',
    ).toEqual([])
  })
})
