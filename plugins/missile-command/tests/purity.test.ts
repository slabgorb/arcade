// plugins/missile-command/tests/purity.test.ts
//
// Story mc1-1 — RED phase (Han Solo / TEA). The core/shell boundary guard: the
// single most important rule in every game repo, encoded as a sweep the suite
// runs forever. src/core/ is the pure deterministic simulation; src/shell/ owns
// render/audio/input/storage/time. Nothing in core/ may touch a browser global,
// read a wall clock, mint ambient randomness, schedule work, or import shell code.
//
// Missile Command is a raster game whose later epics (field, cursor, ABM flight,
// blast geometry, waves) will assert deterministic, seeded, replayable behaviour.
// A single wall-clock read or ambient Math.random in core silently voids every
// such claim, and voids it as flake — which is why this guard lands with the
// skeleton, before any gameplay.
//
// The scanner (tests/helpers/purity-scanner.ts) is ported verbatim from the
// sibling games' — one hardened TypeScript-AST implementation, its logic copied
// and never re-authored (only a provenance note added to its header).
// The fixture self-tests below pin its teeth permanently; the src/core sweep at
// the bottom bites the moment core modules land. This paragraph names Date.now
// and Math.random in plain prose and does not trip the scanner, because it strips
// comments and strings before matching — the property the fixtures prove.
//
// RED today via the teeth: this file runs only once GREEN adds the
// `missile-command` vitest project, and the src/core sweep then fails until the
// core skeleton exists.

import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { violations } from './helpers/purity-scanner.js'

// Rule NAMES only, with the `(file:line)` suffix stripped, for the fixture
// self-tests. The src/core sweep keeps the full located form.
const rules = (src: string): string[] => violations(src).map((r) => r.replace(/\s\([^()]*\)$/, ''))

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const coreDir = join(root, 'src', 'core')

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
    expect(rules('function draw(ctx: CanvasRenderingContext2D) {}')).toContain('CanvasRenderingContext2D')
    expect(rules('const buf = new OffscreenCanvas(256, 231)')).toContain('OffscreenCanvas')
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

  it('does NOT flag banned names inside string literals (data, not code)', () => {
    expect(rules('const err = "window.open failed"')).toEqual([])
    expect(rules("const tip = 'seed replaces Math.random() calls'")).toEqual([])
    expect(rules('const msg = `shell owns document.body`')).toEqual([])
    expect(rules("import { r } from '../shell/render'")).toContain('import from shell/')
  })

  it('does NOT flag lookalike identifiers or URLs', () => {
    expect(rules('const windowSize = view.windowSize')).toEqual([])
    expect(rules('const doc = "https://example.com/window.html"')).toEqual([])
    expect(rules('const next = processInput(pad)')).toEqual([])
  })

  it('flags evasion forms (globalThis / dynamic import / eval / new Function / Date-alias)', () => {
    expect(rules('globalThis.document.title = "x"')).toContain('globalThis')
    expect(rules("const m = await import('./danger')")).toContain('dynamic import()')
    expect(rules('eval("1 + 1")')).toContain('eval()')
    expect(rules('const f = new Function("return 1")')).toContain('new Function()')
    expect(rules('const D = Date')).toContain('Date aliasing (= Date)')
    // …and the corresponding non-matches must sail through:
    expect(rules("import { step } from './sim'")).toEqual([])
    expect(rules('let stamp: Date')).toEqual([])
  })
})

// Guard the listing itself so a missing dir fails the teeth test below instead
// of throwing at module scope (the tempest tp1-8 trap): existsSync guards readdirSync.
const coreFiles = existsSync(coreDir)
  ? readdirSync(coreDir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts'))
  : []

describe('src/core/ purity sweep (mc1-1 — the boundary guard)', () => {
  it('scans a non-empty src/core/ (the sweep must have teeth)', () => {
    // RED until GREEN lands the core skeleton: an empty or missing core/ makes
    // every sweep below pass vacuously, so emptiness itself is a failure.
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
