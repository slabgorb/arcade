// tests/view-integer-scale.test.ts
//
// Story SH4-3 (epic SH4) — RED phase (Tyr One-Handed / TEA). Lift the RASTER
// integer-scale letterbox `fitIntegerScale` — the largest whole-number scale that
// fits a logical resolution inside a container, centred with integer offsets — into
// @shared/view. It is duplicated BYTE-FOR-BYTE today between
// plugins/centipede/src/shell/layout.ts:49 and plugins/pac-man/src/shell/layout.ts:28
// (pac-man's header: "ported from centipede"). This file is the shared pin AC-2 requires.
//
// This is DISTINCT from view.ts's existing `letterbox(canvasW, canvasH, aspect)` — that
// one is a PURE FRACTIONAL aspect-fit; this one floors to a whole scale for crisp raster
// pixels. Both live in @shared/view; neither replaces the other (SH4-3 Fact 3).
//
// ── PROPOSED CONTRACT Dev implements to turn this GREEN ─────────────────────────
//
//   interface Fit { scale: number; dx: number; dy: number; width: number; height: number }
//
//   // Largest whole-number scale of a logicalW×logicalH frame that fits inside a
//   // containerW×containerH box, clamped to >= 1x, centred with FLOORED integer
//   // offsets (dx/dy MAY be negative when the container is smaller than one logical
//   // frame — see the negative-offset group; this is where joust's clamp diverges).
//   function fitIntegerScale(containerW, containerH, logicalW, logicalH): Fit
//
// The `Fit` SHAPE ({scale,dx,dy,width,height}) is load-bearing: centipede's existing
// cp1-6 layout.test.ts asserts it with `.toEqual({...})`, so the extraction must keep it.
//
// PARAMETERIZATION (SH4-3 Fact 2, the story's chief design decision): the two games'
// logical dims DIFFER (centipede 240×256 hardcoded; pac-man 224×288 derived from MAZE),
// so the shared fn CANNOT read a module-scoped LOGICAL_W/H — it must take them as args.
// The `reads its logical args` test below is the RED pin for that: a Dev who hardcodes
// either game's dims fails it.
//
// The positional 4-arg signature is the PROPOSED contract (consistent with the existing
// `letterbox(canvasW, canvasH, aspect)`); if Dev/Reviewer prefer an options object, that
// is a contract ratification to record in the session, not a silent divergence.
//
// RED until src/shared/view.ts exports `fitIntegerScale`, and until the byte-identical
// bodies leave the two games (the de-duplication group).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const load = () => import('../view')

interface Fit {
  scale: number
  dx: number
  dy: number
  width: number
  height: number
}

// ── Independent oracle ───────────────────────────────────────────────────────────
// The spec IS this arithmetic, so the oracle's value is running MANY cases; the
// hand-computed goldens in each group below are the independent second check that a
// shared bug in oracle+impl cannot both pass. `dx`/`dy` are FLOORED and may be negative.
function intScaleOracle(cw: number, ch: number, lw: number, lh: number): Fit {
  const scale = Math.max(1, Math.floor(Math.min(cw / lw, ch / lh)))
  const width = lw * scale
  const height = lh * scale
  return { scale, dx: Math.floor((cw - width) / 2), dy: Math.floor((ch - height) / 2), width, height }
}

// Strip line + block comments so a source-text de-dup guard cannot be satisfied (or
// fooled) by the lifted formula surviving only in a comment (centipede cp2-1 R3 idiom).
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

// ── AC-1: parameterized integer-scale geometry ────────────────────────────────────

describe('SH4-3 fitIntegerScale — parameterized integer-scale letterbox (AC-1)', () => {
  it('an exact-fit container scales 1× with no bars', async () => {
    const { fitIntegerScale } = await load()
    expect(fitIntegerScale(240, 256, 240, 256)).toEqual({ scale: 1, dx: 0, dy: 0, width: 240, height: 256 })
  })

  it('a 2× container scales 2× with no bars', async () => {
    const { fitIntegerScale } = await load()
    expect(fitIntegerScale(480, 512, 240, 256)).toEqual({ scale: 2, dx: 0, dy: 0, width: 480, height: 512 })
  })

  it('floors to an INTEGER scale — never fractional (crisp pixels, no blur)', async () => {
    const { fitIntegerScale } = await load()
    // 300×256 into 240×256 is 1.25× on width but floors to 1×, pillarboxed.
    expect(fitIntegerScale(300, 256, 240, 256)).toEqual({ scale: 1, dx: 30, dy: 0, width: 240, height: 256 })
  })

  it('is height-constrained and pillarboxed on a very wide container', async () => {
    const { fitIntegerScale } = await load()
    expect(fitIntegerScale(960, 256, 240, 256)).toEqual({ scale: 1, dx: 360, dy: 0, width: 240, height: 256 })
  })

  it('never scales below 1× even when the container is smaller than one logical frame', async () => {
    const { fitIntegerScale } = await load()
    expect(fitIntegerScale(100, 100, 240, 256).scale).toBe(1)
  })

  it('reads its logical-dimension ARGS, not a hardcoded constant (SH4-3 Fact 2)', async () => {
    const { fitIntegerScale } = await load()
    // Same 480×512 container, two different logical sizes → different results. A Dev who
    // reads a module-scoped LOGICAL_W/H (either game's) instead of the args fails this.
    const centipede = fitIntegerScale(480, 512, 240, 256) // 480/240=2, 512/256=2 → 2×
    const pacman = fitIntegerScale(480, 512, 224, 288) // 480/224=2.14, 512/288=1.77 → 1×
    expect(centipede.scale, 'centipede dims → 2×').toBe(2)
    expect(pacman.scale, 'pac-man dims → 1×').toBe(1)
    expect(centipede.width).toBe(480)
    expect(pacman.width).toBe(224) // fitted to the pac-man logical width, not the container
  })

  it('matches the independent oracle across a sweep of containers and logical sizes', async () => {
    const { fitIntegerScale } = await load()
    const cases: Array<[number, number, number, number]> = [
      [1920, 1080, 240, 256],
      [640, 480, 224, 288],
      [1000, 1000, 292, 240],
      [255, 255, 240, 256],
      [3840, 2160, 224, 288],
      [777, 333, 240, 256],
      [512, 2000, 224, 288],
    ]
    for (const [cw, ch, lw, lh] of cases) {
      const got = fitIntegerScale(cw, ch, lw, lh)
      expect(got, `fit @ ${cw}×${ch} logical ${lw}×${lh}`).toEqual(intScaleOracle(cw, ch, lw, lh))
    }
  })

  it('is pure — deterministic and returns a fresh object each call', async () => {
    const { fitIntegerScale } = await load()
    const a = fitIntegerScale(500, 520, 240, 256)
    const b = fitIntegerScale(500, 520, 240, 256)
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
  })
})

// ── AC-3 (behaviour): the shared fn reproduces EACH adopting game's current numbers ──
// This is the automated guarantee that lifting the body changes NO game's render. The
// goldens are hand-computed from each game's own logical dims, independent of the impl.

describe('SH4-3 fitIntegerScale — reproduces centipede layout.test.ts goldens (240×256)', () => {
  const LW = 240
  const LH = 256
  it('reproduces the cp1-6 exact-fit / 2× / floor / pillarbox / letterbox goldens', async () => {
    const { fitIntegerScale } = await load()
    expect(fitIntegerScale(240, 256, LW, LH)).toEqual({ scale: 1, dx: 0, dy: 0, width: 240, height: 256 })
    expect(fitIntegerScale(480, 512, LW, LH)).toEqual({ scale: 2, dx: 0, dy: 0, width: 480, height: 512 })
    // 500×520 → 2×, letterboxed: dx=(500-480)/2=10, dy=(520-512)/2=4 (cp1-6 golden).
    expect(fitIntegerScale(500, 520, LW, LH)).toEqual({ scale: 2, dx: 10, dy: 4, width: 480, height: 512 })
    expect(fitIntegerScale(960, 256, LW, LH)).toEqual({ scale: 1, dx: 360, dy: 0, width: 240, height: 256 })
  })
})

describe('SH4-3 fitIntegerScale — reproduces pac-man letterbox geometry (224×288)', () => {
  const LW = 224
  const LH = 288
  it('reproduces exact-fit, 2×, wide-pillarbox and mixed-letterbox goldens', async () => {
    const { fitIntegerScale } = await load()
    expect(fitIntegerScale(224, 288, LW, LH)).toEqual({ scale: 1, dx: 0, dy: 0, width: 224, height: 288 })
    expect(fitIntegerScale(448, 576, LW, LH)).toEqual({ scale: 2, dx: 0, dy: 0, width: 448, height: 576 })
    // 1000×288 → height-constrained 1×, wide pillarbox: dx=(1000-224)/2=388.
    expect(fitIntegerScale(1000, 288, LW, LH)).toEqual({ scale: 1, dx: 388, dy: 0, width: 224, height: 288 })
    // 500×700 → 2× (500/224=2.23, 700/288=2.43): dx=(500-448)/2=26, dy=(700-576)/2=62.
    expect(fitIntegerScale(500, 700, LW, LH)).toEqual({ scale: 2, dx: 26, dy: 62, width: 448, height: 576 })
  })
})

// ── TS lang-review #21: a DEGENERATE-but-not-nullish viewport must not leak NaN ──────
// A minimized window yields a 0-width container — present and unusable, not nullish.
// The extraction must preserve the games' current no-NaN behaviour (mirrors view.ts's
// resizeToDisplay zero-container guard).

describe('SH4-3 fitIntegerScale — degenerate viewport does not leak NaN (TS lang-review #21)', () => {
  it('a zero-width container yields scale 1 and finite fields (no NaN)', async () => {
    const { fitIntegerScale } = await load()
    const f = fitIntegerScale(0, 800, 240, 256)
    expect(f.scale).toBe(1)
    for (const [k, v] of Object.entries(f)) {
      expect(Number.isNaN(v), `${k} must not be NaN`).toBe(false)
      expect(Number.isFinite(v), `${k} must be finite`).toBe(true)
    }
    expect(f.width).toBe(240) // clamped to 1× logical, never collapses to 0
  })
})

// ── The centipede/pac-man offset contract: dx/dy MAY be negative (this is where joust
// diverges — joust clamps to >= 0). Pinning it here fixes the shared behaviour so the
// GREEN refactor cannot silently adopt joust's clamp and regress the two raster games.

describe('SH4-3 fitIntegerScale — allows NEGATIVE centring offsets on a sub-logical container', () => {
  it('a container smaller than one logical frame gives floored negative dx/dy', async () => {
    const { fitIntegerScale } = await load()
    // 100×100 into 240×256 at 1×: dx=floor((100-240)/2)=-70, dy=floor((100-256)/2)=-78.
    const f = fitIntegerScale(100, 100, 240, 256)
    expect(f).toEqual({ scale: 1, dx: -70, dy: -78, width: 240, height: 256 })
    expect(f.dx, 'centipede/pac-man do NOT clamp offsets to >= 0').toBeLessThan(0)
    expect(f.dy).toBeLessThan(0)
  })
})

// ── AC-3 (adoption): the byte-identical body LEAVES the two games ─────────────────
// The lifted scale computation `Math.max(1, Math.floor(Math.min(...)))` must live ONLY
// in @shared/view after extraction — neither game's layout.ts may still carry its own
// copy (whether the game keeps a thin per-game binding or updates its call sites is
// Dev's choice; either way the nested max/floor/min is gone). Negative source guards
// over a whole file are sound (absence is absence — TS lang-review #25).

describe('SH4-3 de-duplication — the lifted integer-scale body leaves the games (AC-3)', () => {
  const NESTED_SCALE = /Math\.max\(\s*1\s*,\s*Math\.floor\(\s*Math\.min\(/
  const gameLayout = (game: string) =>
    stripComments(readFileSync(fileURLToPath(new URL(`../../../plugins/${game}/src/shell/layout.ts`, import.meta.url)), 'utf8'))

  it('centipede/src/shell/layout.ts no longer re-implements the integer-scale math', () => {
    expect(NESTED_SCALE.test(gameLayout('centipede')), 'centipede must delegate to @shared/view').toBe(false)
  })

  it('pac-man/src/shell/layout.ts no longer re-implements the integer-scale math', () => {
    expect(NESTED_SCALE.test(gameLayout('pac-man')), 'pac-man must delegate to @shared/view').toBe(false)
  })

  it('the lifted math now lives in @shared/view (the single home)', () => {
    const view = stripComments(readFileSync(fileURLToPath(new URL('../view.ts', import.meta.url)), 'utf8'))
    expect(/export\s+function\s+fitIntegerScale\b/.test(view), 'view.ts must export fitIntegerScale').toBe(true)
    expect(NESTED_SCALE.test(view), 'the integer-scale math must live in view.ts').toBe(true)
  })
})

// ── AC-4 (advisory): joust fold feasibility + the divergence that makes it non-trivial ─
// NOT a mandate to fold joust — AC-4 permits an explicit descope. These two tests make
// SH4-3 Fact 6 executable so Dev/Architect decide from measured numbers: the SCALE
// reconciles (joust's Math.min(floor,floor) === floor(min) for positive reals), but
// joust CLAMPS its offsets to >= 0 (render.ts:78-79, jt1-6 addendum) where the shared
// fn allows negative. Folding joust therefore needs the clamp preserved at joust's call
// site (or a clamp option), or it is a render regression per the epic bar.

describe('SH4-3 joust fold feasibility (AC-4 — advisory, design decision)', () => {
  const JW = 292
  const JH = 240
  // joust's own offset rule, re-derived from render.ts (NOT imported — render.ts is a
  // DOM shell module): offset = max(0, floor((container - logical*scale) / 2)).
  const joustOffset = (container: number, logical: number, scale: number) =>
    Math.max(0, Math.floor((container - logical * scale) / 2))

  it('reproduces joust scale + offsets on a super-logical viewport (clamp is a no-op there)', async () => {
    const { fitIntegerScale } = await load()
    const f = fitIntegerScale(1000, 800, JW, JH) // 1000/292=3.42, 800/240=3.33 → 3×
    expect(f.scale).toBe(3)
    expect(f.dx).toBe(62) // (1000 - 292*3)/2 = 62, already >= 0
    expect(f.dy).toBe(40) // (800 - 240*3)/2 = 40
    expect(f.dx).toBe(joustOffset(1000, JW, f.scale))
    expect(f.dy).toBe(joustOffset(800, JH, f.scale))
  })

  it('DIVERGES from joust on a sub-logical viewport — the shared fn allows negative, joust clamps to 0', async () => {
    const { fitIntegerScale } = await load()
    const f = fitIntegerScale(200, 200, JW, JH) // below one logical frame → 1×
    expect(f.scale).toBe(1)
    expect(f.dx).toBe(-46) // shared: floor((200-292)/2) = -46
    expect(f.dx).toBeLessThan(0)
    expect(joustOffset(200, JW, f.scale), 'joust would clamp the same offset to 0').toBe(0)
    // → a naive fold changes joust's sub-logical offset from 0 to -46: preserve the clamp.
  })
})
