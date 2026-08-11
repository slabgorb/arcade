// tests/main-host-adoption.test.ts
//
// Story SH3-2 — RED phase (Han Solo / TEA). joust adopts the SAFE half of the
// @shared/host-helpers shell lifecycle and DELIBERATELY defers the risky half.
//
// ─── THE SCOPE RULING (2026-08-11) ──────────────────────────────────────────
// The sprint TITLE asks joust to route BOTH its canvas mount AND its audio-unlock
// through @shared/host-helpers. That over-asserts. docs/ops/shell-adoption-matrix.md
// (landed by sc1-1) already records `joust | rom-cadence | rom-cadence | behaviour-absent`
// and argues — with the epic's own iron rule, "a helper that changes when a frame
// starts or how input is sampled is a regression even if every test stays green" —
// that joust's audio-unlock is FUSED into the input-sampling keydown handler
// (main.ts: `audio.resume()` beside the highscore initials edge), so adopting
// installAudioUnlock necessarily edits the input path. mountCanvas, by contrast, is
// a boot-time one-shot with zero cadence/input risk and byte-identical duplication
// (`querySelector('#game')` + throw), already retired for pac-man in the DONE SH3-4.
//
// The user ruled on 2026-08-11: adopt mountCanvas ONLY; KEEP the audio unlock
// hand-rolled as `rom-cadence`; document why @shared/loop's accumulator is not
// adoptable given joust's ROM timebase. See .session/SH3-2-session.md Design Deviations.
//
// So this file has THREE jobs:
//   AC-1  RED   — mountCanvas is adopted (import + call + destructure of the checked
//                 pair) and the hand-rolled #game mount boilerplate is retired.
//   AC-2  GREEN — the audio-unlock stays hand-rolled and installAudioUnlock is NOT
//                 adopted; the SH4-2 input-sampling seam is untouched. These are the
//                 ruling's teeth: a later refactor cannot quietly make the trade the
//                 matrix forbids.
//   AC-3  mixed — the matrix flips joust's mountCanvas cell to `adopted` (RED) while
//                 installAudioUnlock stays `rom-cadence` (GREEN), the ROM pump
//                 survives (GREEN), and the @shared/loop verdict is documented (RED).
//
// ─── NODE ENV, SOURCE AS TEXT ───────────────────────────────────────────────
// main.ts is a side-effectful boot module: it runs document.querySelector at import,
// throws without a real <canvas id="game">, and starts a rAF loop — none of which
// exists in the node vitest env. Its wiring is therefore pinned by a disk read
// (joust's demo-source.test.ts idiom; tempest tp1-39 / centipede cp1-6, reviewer-
// blessed). Comments are STRIPPED for every adoption/retirement scan so a token
// surviving only in a doc comment (or a commented-out call) can never fake a pass —
// the whole point of the AC-2 ruling lock. The @shared/loop DOC scan reads RAW source
// on purpose: a comment is exactly what satisfies a documentation deliverable.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const joustRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const arcadeRoot = join(joustRoot, '..', '..')

const mainPath = join(joustRoot, 'src', 'main.ts')
const timebasePath = join(joustRoot, 'src', 'shell', 'timebase.ts')
const matrixPath = join(arcadeRoot, 'docs', 'ops', 'shell-adoption-matrix.md')

/** Strip block + line comments so prose ABOUT code can never satisfy a scan. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

const rawMain = readFileSync(mainPath, 'utf8')
const code = stripComments(rawMain)

const HELPERS = ['mountCanvas', 'installAudioUnlock', 'installPauseToggle'] as const

/**
 * joust's row from the machine-read adoption-matrix block: { helper: cell }. Reads
 * the delimited block only (the same start/end markers tests/shell-convergence.test.mjs
 * uses) so a second game-keyed table elsewhere in the doc can never be mistaken for it.
 */
function joustMatrixRow(): Record<string, string> {
  const text = readFileSync(matrixPath, 'utf8')
  const block = /<!--\s*adoption-matrix:start\s*-->([\s\S]*?)<!--\s*adoption-matrix:end\s*-->/.exec(text)
  if (!block) throw new Error('shell-adoption-matrix.md is missing its adoption-matrix:start/end markers')
  for (const line of block[1].split('\n')) {
    const m = /^\|\s*([a-z-]+)\s*\|(.+)\|\s*$/.exec(line.trim())
    if (!m || m[1] !== 'joust') continue
    const cells = m[2].split('|').map((c) => c.trim())
    return Object.fromEntries(HELPERS.map((h, i) => [h, cells[i]]))
  }
  throw new Error('no `joust` row found in the adoption-matrix block')
}

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — adopt mountCanvas for the #game canvas (RED until GREEN wires it)
// ═════════════════════════════════════════════════════════════════════════════

describe('SH3-2 AC-1 — mount the #game canvas via @shared/host-helpers.mountCanvas', () => {
  it('imports mountCanvas from @shared/host-helpers (import-anchored, not a bare token)', () => {
    expect(code, 'main.ts must import mountCanvas from @shared/host-helpers').toMatch(
      /import\s*\{[^}]*\bmountCanvas\b[^}]*\}\s*from\s*['"]@shared\/host-helpers['"]/,
    )
  })

  it('CALLS mountCanvas(), not merely imports it', () => {
    expect(code, 'main.ts must call mountCanvas(), not import it dead').toMatch(/\bmountCanvas\s*\(/)
  })

  it('destructures the checked { canvas, ctx } that mountCanvas returns (SH3-6 hardening)', () => {
    // The helper returns { canvas, ctx }, both already null-checked. Adoption means
    // TAKING that pair, not calling mountCanvas and re-deriving getContext by hand.
    // Order-independent, and `ctx` may be aliased (`ctx: context`) since joust names
    // its variable `context`.
    const destr = /const\s*\{([^}]*)\}\s*=\s*mountCanvas\s*\(/.exec(code)
    expect(destr, 'main.ts must destructure the result of mountCanvas()').not.toBeNull()
    expect(destr?.[1], 'the destructure must take the checked canvas').toMatch(/\bcanvas\b/)
    expect(destr?.[1], 'the destructure must take the checked ctx (not re-derive getContext)').toMatch(/\bctx\b/)
  })

  it("retires the hand-rolled querySelector('#game') mount", () => {
    // mountCanvas owns the #game lookup + guards now. joust's only querySelector is
    // this one (the backbuffer/atlas canvases are createElement), so a surviving
    // querySelector('#game') means the old code sits dead beside the new import.
    expect(code, "the raw querySelector('#game') must be gone — mountCanvas replaces it").not.toMatch(
      /querySelector[^\n]*#game/,
    )
  })

  it("retires the hand-rolled null-canvas throw (its message moves into mountCanvas)", () => {
    expect(code, "the bespoke 'index.html must host a <canvas ...>' throw must be gone").not.toMatch(
      /index\.html must host a <canvas/,
    )
  })

  it('retires the hand-rolled main-canvas 2d-context throw (backbuffer/atlas ones stay)', () => {
    // Scoped to the MAIN canvas line only. The backbuffer/atlas throws read
    // "2d context unavailable for the {backbuffer,atlas}" (no "canvas") and MUST
    // survive — mountCanvas replaces only the #game context acquisition.
    expect(code, "the main-canvas '2d canvas context unavailable' throw must be gone").not.toMatch(
      /2d canvas context unavailable/,
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — KEEP the audio-unlock hand-rolled (the upheld sc1-1 deferral). GREEN now,
//        GREEN after — a later refactor must not adopt installAudioUnlock quietly.
// ═════════════════════════════════════════════════════════════════════════════

describe('SH3-2 AC-2 — audio-unlock stays rom-cadence; installAudioUnlock is NOT adopted', () => {
  it('keeps joust\'s own audio.resume() unlock', () => {
    expect(code, "joust's hand-rolled audio unlock must survive — the mount refactor does not touch it").toMatch(
      /audio\.resume\s*\(\s*\)/,
    )
  })

  it('does NOT import or call installAudioUnlock (the ruling lock)', () => {
    // installAudioUnlock is fused-into-input-path risk (main.ts keydown also feeds
    // the highscore initials edge) and widens the gesture to pointerdown. The user
    // upheld sc1-1's rom-cadence deferral; this is its teeth against a silent trade.
    expect(code, 'main.ts must NOT adopt installAudioUnlock — joust keeps its rom-cadence unlock').not.toMatch(
      /\binstallAudioUnlock\b/,
    )
  })

  it('leaves the SH4-2 input-sampling seam intact (installHeldKeys + Space preventDefault)', () => {
    expect(code, 'the shared held-keys sampler must remain — the mount refactor is boot-only').toMatch(
      /installHeldKeys\s*\(\s*window\s*,/,
    )
    expect(code, 'Space preventDefault must survive or the page scrolls mid-game').toMatch(
      /preventDefaultFor\s*:\s*new Set\(\s*\[\s*'Space'\s*\]\s*\)/,
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — the matrix + the timebase verdict record the decision
// ═════════════════════════════════════════════════════════════════════════════

describe('SH3-2 AC-3 — adoption matrix + @shared/loop timebase verdict', () => {
  it("flips joust's mountCanvas cell rom-cadence → adopted", () => {
    // A `rom-cadence` cell carries no enforcement, so adopting in code while leaving
    // the matrix unchanged makes the matrix silently LIE. This forces the flip.
    expect(joustMatrixRow().mountCanvas, "the matrix must record joust mountCanvas as adopted").toBe('adopted')
  })

  it("keeps joust's installAudioUnlock cell at rom-cadence (the upheld deferral)", () => {
    expect(
      joustMatrixRow().installAudioUnlock,
      'joust must stay rom-cadence for installAudioUnlock — the audio unlock is not adopted',
    ).toBe('rom-cadence')
  })

  it("leaves joust's installPauseToggle cell behaviour-absent (untouched)", () => {
    expect(joustMatrixRow().installPauseToggle).toBe('behaviour-absent')
  })

  it('keeps joust\'s own ROM timebase pump (pumpFrames) — @shared/loop is not swapped in', () => {
    expect(code, 'the ROM-cadence pump must survive — only the canvas MOUNT is adopted').toMatch(
      /\bpumpFrames\s*\(/,
    )
  })

  it('documents the @shared/loop adoptability verdict, naming the shared accumulator', () => {
    // AC-4: a reasoned verdict on @shared/loop lives in main.ts or shell/timebase.ts.
    // RAW source on purpose — a comment is what satisfies a documentation deliverable.
    // Two anchors, not a bare token: the verdict must name BOTH @shared/loop AND the
    // actual accumulator it judges (advanceFixedSteps) — a genuine adoptability call
    // cannot be made without naming the function, so a stray `// TODO @shared/loop`
    // cannot satisfy this. (The verdict itself: adoptable at joust's own dt — centipede
    // and pac-man already wrap advanceFixedSteps at their FRAME_DT — deferred as
    // out-of-SH3-2-scope, not impossible.)
    const docs = rawMain + '\n' + readFileSync(timebasePath, 'utf8')
    expect(docs, 'main.ts or shell/timebase.ts must reference @shared/loop').toMatch(/@shared\/loop/)
    expect(
      docs,
      'the verdict must name the shared accumulator it judges (advanceFixedSteps), not a bare @shared/loop mention',
    ).toMatch(/\badvanceFixedSteps\b/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GUARD INTEGRITY — the source scans read code, not comments about code
// ═════════════════════════════════════════════════════════════════════════════

describe('SH3-2 guard integrity — stripComments cannot be faked or over-strip', () => {
  it('strips a commented-out installAudioUnlock adoption (the ruling lock cannot be commented past)', () => {
    expect(stripComments('// installAudioUnlock(resume, window)')).not.toMatch(/\binstallAudioUnlock\b/)
  })

  it("strips a commented-out querySelector('#game') line (a dead copy cannot fake retirement)", () => {
    expect(stripComments("// const c = document.querySelector('#game')")).not.toMatch(/querySelector[^\n]*#game/)
  })

  it('keeps live code (does not over-strip a trailing-comment line)', () => {
    expect(stripComments('const { canvas, ctx } = mountCanvas(document) // mount')).toMatch(/\bmountCanvas\s*\(/)
  })
})
