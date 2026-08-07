// plugins/missile-command/tests/render-battle.test.ts
//
// Story mc3-5 — RED phase (Han Solo / TEA). AC1: the shell (`src/shell/render.ts`,
// `drawFrame`) now paints the grown combat state — incoming ICBM heads + trails,
// dead cities/bases drawn as rubble (only LIVE structures draw intact), and a HUD
// showing the core's `state.score` and each base's ammo. Functional colours only;
// the per-wave palette and authentic stamps are mc9 (out of scope).
//
// ─── PIXELS ARE THE REVIEWER'S JOB; WHAT-IS-DRAWN IS OURS ─────────────────────
// The real acceptance artefact for AC1 is a screenshot at /missile-command/ (hue,
// glyph, sub-pixel placement) — an owner/reviewer check no node test can make. What
// a node test CAN pin, against the SAME recording-canvas harness render-field.test.ts
// uses, is (a) that an in-flight ICBM adds marks the empty field did not (a head +
// a trail), (b) that a DEAD structure is drawn differently from a LIVE one at its
// own column ("not drawn as a live one"), and (c) that the HUD emits text carrying
// String(state.score) and each base's ammo — the score VALUE, never a re-derived
// copy (the HUD-figure rule). Colours/shapes are deliberately NOT asserted.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// Today `drawFrame` draws the field from the CITIES/BASES constants (ignoring
// state.cities/.bases alive), never touches state.icbms, and draws no HUD text. So:
// the ICBM marks are absent, a dead structure renders identically to a live one,
// and no fillText/strokeText carries the score/ammo. All three go green when Dev
// extends drawFrame to consume state.icbms, the .alive flags, state.score and ammo.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { drawFrame } from '../src/shell/render.js'
import { createGame, type GameState } from '../src/core/game.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// A canvas comfortably larger than the 8-bit cabinet space (matches the sibling
// render-field.test.ts harness so the projection lands identically).
const W = 256
const H = 231

// ─── A recording 2D context that ALSO captures drawn text ────────────────────
// render-field.test.ts's mock discards the string arg of fillText/strokeText; the
// HUD assertions need it, so this mock records it. Coordinate primitives record
// (op, x, y[, w]); text primitives record (op, text, x, y). Style setters no-op.
interface Mark {
  op: string
  x: number
  y: number
  w?: number
  text?: string
}

function recordingCtx(): { ctx: CanvasRenderingContext2D; marks: Mark[] } {
  const marks: Mark[] = []
  const xy =
    (op: string) =>
    (x: number, y: number, w?: number): void => {
      marks.push({ op, x, y, w })
    }
  const text =
    (op: string) =>
    (t: string, x: number, y: number): void => {
      marks.push({ op, x, y, text: String(t) })
    }
  const noop = (): void => {}
  const api: Record<string, unknown> = {
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    fillRect: xy('fillRect'),
    strokeRect: xy('strokeRect'),
    rect: xy('rect'),
    moveTo: xy('moveTo'),
    lineTo: xy('lineTo'),
    arc: xy('arc'),
    ellipse: xy('ellipse'),
    fillText: text('fillText'),
    strokeText: text('strokeText'),
    beginPath: noop,
    closePath: noop,
    fill: noop,
    stroke: noop,
    save: noop,
    restore: noop,
    translate: noop,
    scale: noop,
    setTransform: noop,
    clip: noop,
  }
  return { ctx: api as unknown as CanvasRenderingContext2D, marks }
}

/** Draw a state to a fresh recording ctx and return the marks. */
function paint(state: GameState): Mark[] {
  const { ctx, marks } = recordingCtx()
  drawFrame(ctx, state, W, H)
  return marks
}

/** The full-canvas background clear (fillRect at 0,0 spanning the width). */
const isBackground = (m: Mark): boolean => m.op === 'fillRect' && m.x === 0 && m.y === 0 && m.w === W

/** Same projection render.ts uses (H 0..256 across width; V bottom-origin, flipped). */
const projectX = (h: number): number => (h / 0x100) * W
const projectY = (v: number): number => H - (v / 222) * H

/** All drawn text strings, in draw order. */
const texts = (marks: Mark[]): string[] =>
  marks.filter((m) => m.text !== undefined).map((m) => m.text as string)

/** A stable, order-independent signature of the coordinate marks in a column band
 *  around `cx` (excludes the background and any text). Two renders that draw the
 *  same shapes at the same place here produce equal signatures. */
function columnSignature(marks: Mark[], cx: number, tol = 10): string {
  return marks
    .filter((m) => !isBackground(m) && m.text === undefined && Math.abs(m.x - cx) <= tol)
    .map((m) => `${m.op}:${Math.round(m.x)}:${Math.round(m.y)}`)
    .sort()
    .join('|')
}

// A crosshair position parked well away from every structure column (cities/bases
// sit at H 20,44,71,95,123,148,180,208,240) and up in the top band, so it can't
// pollute the bottom-band structure columns these tests inspect.
const AWAY = { h: 5, v: 210 }
const withCursor = (s: GameState): GameState => ({ ...s, cursor: AWAY })

describe('AC1 — drawFrame paints incoming ICBM heads and trails', () => {
  const bare = withCursor(createGame(1))
  // One ICBM mid-descent: launched top-edge, heading for a ground target, head
  // currently mid-canvas. Its head projects to (100, ~106) — a region the empty
  // field (structures bottom, crosshair top-left) never draws in.
  const icbm = {
    origin: { h: 100, v: 222 },
    target: { h: 100, v: 16 },
    pos: { h: 100, v: 120 },
    arrived: false,
  }
  const oneIcbm: GameState = { ...bare, icbms: [icbm] }

  it('an in-flight ICBM adds draw marks the empty field did not', () => {
    expect(
      paint(oneIcbm).length,
      'drawFrame must draw state.icbms — an ICBM on screen adds a head + trail',
    ).toBeGreaterThan(paint(bare).length)
  })

  it('draws at least one mark at the ICBM head position', () => {
    const hx = projectX(icbm.pos.h)
    const hy = projectY(icbm.pos.v)
    const near = paint(oneIcbm).filter(
      (m) => !isBackground(m) && m.text === undefined && Math.hypot(m.x - hx, m.y - hy) <= 8,
    )
    const nearBare = paint(bare).filter(
      (m) => !isBackground(m) && m.text === undefined && Math.hypot(m.x - hx, m.y - hy) <= 8,
    )
    expect(nearBare.length, 'the empty field draws nothing at the head position').toBe(0)
    expect(near.length, 'the ICBM head must be drawn where the ICBM is').toBeGreaterThanOrEqual(1)
  })

  it('more ICBMs on screen means more marks (the field scales with the swarm)', () => {
    const many: GameState = {
      ...bare,
      icbms: [
        icbm,
        { origin: { h: 40, v: 222 }, target: { h: 40, v: 17 }, pos: { h: 40, v: 150 }, arrived: false },
        { origin: { h: 200, v: 222 }, target: { h: 200, v: 18 }, pos: { h: 200, v: 90 }, arrived: false },
      ],
    }
    expect(paint(many).length).toBeGreaterThan(paint(oneIcbm).length)
  })
})

describe('AC1 — a dead city / base is not drawn as a live one', () => {
  const alive = withCursor(createGame(1))

  it('the dead CITY column is drawn differently from the live one', () => {
    const cx = projectX(alive.cities[0].pos.h)
    const liveSig = columnSignature(paint(alive), cx)
    expect(liveSig.length, 'a LIVE city must actually be drawn (intact) in its column').toBeGreaterThan(0)

    const deadCity: GameState = {
      ...alive,
      cities: alive.cities.map((c, i) => (i === 0 ? { ...c, alive: false } : c)),
    }
    const deadSig = columnSignature(paint(deadCity), cx)
    expect(
      deadSig,
      'a dead city must NOT render identically to a live city — rubble, not an intact block',
    ).not.toBe(liveSig)
  })

  it('the dead BASE column is drawn differently from the live one', () => {
    const bx = projectX(alive.bases[0].pos.h)
    const liveSig = columnSignature(paint(alive), bx)
    expect(liveSig.length, 'a LIVE base must actually be drawn (intact) in its column').toBeGreaterThan(0)

    const deadBase: GameState = {
      ...alive,
      bases: alive.bases.map((b, i) => (i === 0 ? { ...b, alive: false } : b)),
    }
    const deadSig = columnSignature(paint(deadBase), bx)
    expect(
      deadSig,
      'a dead base must NOT render identically to a live base',
    ).not.toBe(liveSig)
  })
})

describe('AC1 — the HUD draws the core score and each base ammo', () => {
  it('draws String(state.score) verbatim — the core value, not a re-derived copy', () => {
    // 90210 is unreachable by re-derivation from this state (0 kills → any
    // recomputed score would be 0). Drawing "90210" proves the HUD reads
    // state.score directly. Its digits (9,0,2,1,0) share nothing with the ammo
    // values below, so the ammo assertions can't be satisfied by the score text.
    const state: GameState = { ...withCursor(createGame(1)), score: 90210 }
    const joined = texts(paint(state)).join(' ')
    expect(joined, 'the HUD must draw String(state.score) = "90210"').toContain('90210')
  })

  it('draws each live base ammo count', () => {
    const g = withCursor(createGame(1))
    // Distinct ammo values that are not substrings of each other or of the score.
    const ammos = [8, 6, 3]
    const state: GameState = {
      ...g,
      score: 90210,
      bases: g.bases.map((b, i) => ({ ...b, ammo: ammos[i] })),
    }
    const joined = texts(paint(state)).join(' ')
    for (const a of ammos) {
      expect(joined, `the HUD must show base ammo ${a}`).toContain(String(a))
    }
  })

  it('the drawn score TRACKS state.score (it is not a hardcoded literal)', () => {
    const base = withCursor(createGame(1))
    const a = texts(paint({ ...base, score: 111 })).join(' ')
    const b = texts(paint({ ...base, score: 222 })).join(' ')
    expect(a).toContain('111')
    expect(b).toContain('222')
    expect(a, 'a different score must produce different HUD text').not.toBe(b)
  })
})

describe('AC1 — render.ts consumes the grown state, it does not ignore it', () => {
  const renderSrc = readFileSync(join(root, 'src', 'shell', 'render.ts'), 'utf8')

  it('references state.icbms on the paint path', () => {
    expect(renderSrc, 'render.ts must draw state.icbms').toMatch(/\bicbms\b/)
  })

  it('reads the structures alive flag (so dead ones can render as rubble)', () => {
    expect(renderSrc, 'render.ts must branch on .alive to draw rubble vs intact').toMatch(/\balive\b/)
  })

  it('reads state.score and base ammo for the HUD', () => {
    expect(renderSrc, 'the HUD score must come from state.score').toMatch(/\bscore\b/)
    expect(renderSrc, 'the HUD must show base ammo').toMatch(/\bammo\b/)
  })
})
