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

// (The mc3-5 HUD text-content helper `texts` lived here. mc9-4 retired the monospace
//  fillText HUD, so a node test can no longer read the drawn digits — the HUD-content
//  assertions moved to render-hud.test.ts as font-agnostic mark-based checks.)

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
  // PLAY phase: createGame boots into 'attract' (INITIAL_PHASE), and since mc7-4 the
  // attract screen paints the high-score ladder into the mid-field slot — glyphs that
  // land in this bare-field's probed region. These are play-field render tests (ICBM
  // heads/trails on an empty field), so 'play' gives the clean field they assume; the
  // ICBMs and HUD draw every phase, only the attract overlay is suppressed.
  const bare = withCursor({ ...createGame(1), phase: 'play' })
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

// ─── mc3-5's HUD text-content block moved to render-hud.test.ts (mc9-4) ───────────
// This block asserted the monospace HUD via the drawn fillText STRING —
// `texts(paint(state)).toContain('90210')`, the base-ammo digits, and score-tracks.
// mc9-4 replaces the browser-font fillText with the cabinet's own glyphs, so no drawn
// text string survives for a node test to read. The same guarantees — score drawn from
// state.score VERBATIM, ammo present, score tracks state — are now enforced
// font-agnostically (mark-count deltas) in render-hud.test.ts. The structural guard
// below (render.ts references score/ammo) stays green across the migration.

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

// ═════════════════════════════════════════════════════════════════════════════
// mc9-3 AC2 — the in-flight ABM trail terminates in an authentic TIP marker.
// The cabinet's MISSILE TIPS & TRAIL (W3DSUP.MAC:925) draws the trail's leading edge
// as a FLASH-coloured tip ("TIP OF MISSILE TRAIL IS FLASH", :931). The ICBM trail
// already draws a head dot; the ABM trail is a BARE line today — this is the RED.
// (DRAW MISSILE, W3DSUP.MAC:1221 is the BASE ready-ammo stack, already rendered in
// mc9-1 — a different routine; that citation stays for the ammo display.)
// ═════════════════════════════════════════════════════════════════════════════
describe('mc9-3 AC2 — an in-flight ABM trail draws a tip marker at its head', () => {
  const bare = withCursor(createGame(1))
  // One ABM mid-flight: launched from a base (low v), head risen to mid-canvas,
  // flying toward a crosshair up high. Its head projects to (100, ~106) — a region
  // the empty field never draws in (structures bottom, crosshair parked top-left).
  const abm = {
    origin: { h: 100, v: 16 },
    target: { h: 100, v: 200 },
    pos: { h: 100, v: 120 },
    arrived: false,
  }
  const oneAbm: GameState = { ...bare, abms: [abm] }

  const tipArcsAtHead = (marks: Mark[]): Mark[] => {
    const hx = projectX(abm.pos.h)
    const hy = projectY(abm.pos.v)
    return marks.filter((m) => m.op === 'arc' && Math.hypot(m.x - hx, m.y - hy) <= 8)
  }

  it('draws a filled TIP marker (an arc) at the ABM head — not a bare line', () => {
    expect(tipArcsAtHead(paint(bare)).length, 'the empty field draws no tip at the head position').toBe(0)
    expect(
      tipArcsAtHead(paint(oneAbm)).length,
      'the ABM in-flight trail must terminate in a tip marker (MISSILE TIPS & TRAIL, W3DSUP.MAC:925); ' +
        'today the ABM loop strokes a bare line with no head dot',
    ).toBeGreaterThanOrEqual(1)
  })

  it('an ABM on screen adds draw marks the empty field did not (the trail is painted)', () => {
    expect(paint(oneAbm).length).toBeGreaterThan(paint(bare).length)
  })
})

describe('mc9-3 AC2 — render.ts cites the authentic trail-tip routine', () => {
  const renderSrc = readFileSync(join(root, 'src', 'shell', 'render.ts'), 'utf8')
  it('names MISSILE TIPS & TRAIL (W3DSUP.MAC:925) for the in-flight trail styling', () => {
    expect(
      renderSrc,
      'the in-flight trail tip must cite MISSILE TIPS & TRAIL — not only DRAW MISSILE (the base ammo stack)',
    ).toMatch(/MISSILE TIPS & TRAIL|W3DSUP\.MAC:925/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// mc12-2 — render fidelity round 3. TWO fixes on the same render.ts surface:
//   (a) AC1 — drop the incoming-ICBM "lollipop" head disc; render the head as the
//       ABM's flashing tip treatment (a FLASH register, not the solid enemy hue),
//       citing the flash tip (W3DSUP.MAC:931) + DRAW MISSILE (W3DSUP.MAC:1221).
//   (b) AC2/AC3 — replace the single-fillRect bomber/satellite PLACEHOLDER
//       (render.ts sputnik loop) with the authentic distinct silhouettes, in the
//       enemy hue, positioned by project(). Geometry ports from OUTLST's DOT-LIST
//       tables (W3MAIN.MAC:5925/5947 + :6073-6175), NOT WRITE A STAMP (W3DSUP:587
//       is the CITY/arrow 8x8 blitter — the story's AC2 citation is wrong; SM flagged).
//
// ─── WHY THIS IS RED (the placeholder, measured on develop) ──────────────────
// Today the sputnik loop draws exactly ONE `fillRect(c.x-planeW/2, c.y-wingH/2,
// planeW, wingH)` per plane — bomber and satellite differ only in `wingH`, which
// the mock DROPS (fillRect records x,y,w only). So both variants record the SAME
// single mark: the ≥N-marks silhouette assertions and the bomber≠satellite
// distinctness assertion all fail. The ICBM loop draws a solid enemy-hue `arc`
// head with no flash register and no W3DSUP:931/1221 cite.
//
// ─── NON-VACUITY (the mc10-7 lesson) ─────────────────────────────────────────
// The silhouette guards count REAL draw marks near the plane — a decoy that only
// *references* a plane-stamp symbol without drawing it stays at ~1 mark and still
// reddens. The AC1 flash-tip guard requires the CODE symbol (FLASH_SLOTS/abmTip)
// inside the ICBM section, so a comment-only citation decoy (cite added, disc kept)
// stays red. The colour of a silhouette is the reviewer's screenshot (mc12-4); the
// mock is colour-blind, so AC1's "drop the enemy disc" is enforced structurally.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc12-2 AC2/AC3 — bomber and satellite draw authentic, distinct silhouettes', () => {
  // A plane parked high and mid-field (v=150, well above the bottom structures and
  // clear of the top-left crosshair and the centred HUD figures) so the ONLY marks
  // in its window are the plane itself.
  const SPUTNIK_POS = { h: 100, v: 150 }
  const bare = withCursor({ ...createGame(1), phase: 'play' })
  const mk = (variant: 'bomber' | 'satellite'): GameState => ({
    ...bare,
    sputniks: [{ pos: SPUTNIK_POS, dir: 1, variant, fireTimer: 100 }],
  })

  const cx = projectX(SPUTNIK_POS.h)
  const cy = projectY(SPUTNIK_POS.v)
  // A box comfortably larger than the ~16x11 (bomber) / ~13x13 (satellite) cabinet
  // silhouettes projected (H is 1:1 at W=256), but tight enough to exclude every
  // other element (verified: structures y~200+, crosshair (5,13), HUD x~124).
  const nearMarks = (marks: Mark[], r = 22): Mark[] =>
    marks.filter((m) => !isBackground(m) && m.text === undefined && Math.abs(m.x - cx) <= r && Math.abs(m.y - cy) <= r)
  const nearSig = (marks: Mark[], r = 22): string =>
    nearMarks(marks, r)
      .map((m) => `${m.op}:${Math.round(m.x)}:${Math.round(m.y)}:${m.w ?? ''}`)
      .sort()
      .join('|')

  it('the empty field draws nothing where the plane will be (window is clean)', () => {
    expect(nearMarks(paint(bare)).length, 'the bare field must not draw in the plane window').toBe(0)
  })

  it('a bomber draws a multi-pixel silhouette, not a single fillRect placeholder', () => {
    const n = nearMarks(paint(mk('bomber'))).length
    expect(
      n,
      'the bomber must render its authentic OUTLST silhouette (many marks), not one fillRect wing (today: 1 mark)',
    ).toBeGreaterThanOrEqual(12)
  })

  it('a satellite draws a multi-pixel silhouette, not a single fillRect placeholder', () => {
    const n = nearMarks(paint(mk('satellite'))).length
    expect(
      n,
      'the satellite must render its authentic OUTLST silhouette (many marks), not one fillRect box (today: 1 mark)',
    ).toBeGreaterThanOrEqual(8)
  })

  it('the bomber and satellite render DISTINCTLY (different shapes, not one placeholder)', () => {
    const bomberSig = nearSig(paint(mk('bomber')))
    const satelliteSig = nearSig(paint(mk('satellite')))
    expect(bomberSig.length, 'the bomber must actually draw marks in its column').toBeGreaterThan(0)
    expect(
      bomberSig,
      'bomber and satellite must draw DISTINCT silhouettes — today both collapse to the same single fillRect',
    ).not.toBe(satelliteSig)
  })

  // mc12-2 review (Heimdall F2): the ROM's OUTLST EOR-PLAVEL flip (W3MAIN.MAC:5997) mirrors
  // BOTH objects when they travel left. Neither dot-list is H-symmetric — the satellite has
  // 6 unmirrored fuselage dots — so a left-flying plane that ISN'T mirrored faces backward.
  // This pins the mirror for EACH variant (the first GREEN mirrored only the bomber, on a
  // false "satellite is symmetric" premise, so the satellite arm of this reddened that code).
  const facing = (variant: 'bomber' | 'satellite', dir: 1 | -1): GameState => ({
    ...bare,
    sputniks: [{ pos: SPUTNIK_POS, dir, variant, fireTimer: 100 }],
  })

  it.each(['bomber', 'satellite'] as const)(
    'a left-facing %s mirrors horizontally (not rendered identical to facing right)',
    (variant) => {
      const right = nearSig(paint(facing(variant, 1)))
      const left = nearSig(paint(facing(variant, -1)))
      expect(right.length, `the ${variant} must draw marks to compare`).toBeGreaterThan(0)
      expect(
        left,
        `a left-flying ${variant} must MIRROR its H-asymmetric silhouette (ROM EOR-PLAVEL), ` +
          `not render identically to facing right — else it faces backward`,
      ).not.toBe(right)
    },
  )
})

describe('mc12-2 AC2 — the plane silhouettes cite the authentic OUTLST dot-list geometry', () => {
  const renderSrc = readFileSync(join(root, 'src', 'shell', 'render.ts'), 'utf8')
  const stampsSrc = readFileSync(join(root, 'src', 'shell', 'stamps.ts'), 'utf8')
  const shellSrc = renderSrc + '\n' + stampsSrc

  it('names OUTLST as the plane/satellite renderer (not WRITE A STAMP, the city blitter)', () => {
    expect(
      shellSrc,
      'the bomber/satellite geometry is drawn by OUTLST (W3MAIN), not WRITE A STAMP (W3DSUP:587, the city stamp) — ' +
        'the story AC2 citation is wrong (SM flagged)',
    ).toMatch(/OUTLST/)
  })

  it('cites the W3MAIN DOT-LIST OUTPUT TABLES for the plane geometry', () => {
    expect(
      shellSrc,
      'the plane silhouette bytes must cite their W3MAIN source (OUTLST :5925/:5947 or the DOT LIST tables :6073-6175)',
    ).toMatch(/W3MAIN\.MAC:(59[0-9]{2}|6[01][0-9]{2})/)
  })
})

describe('mc12-2 AC1 — the incoming ICBM head is the ABM flash tip, not a solid enemy disc', () => {
  const renderSrc = readFileSync(join(root, 'src', 'shell', 'render.ts'), 'utf8')
  // Scope to the ICBM render section: from its header comment to the sputnik loop
  // (anchored on `state.sputniks`, which survives a loop-var rename). Both anchors
  // are asserted present so a moved anchor fails loudly rather than slicing empty.
  const icbmStart = renderSrc.indexOf('Incoming ICBM')
  const sputnikStart = renderSrc.indexOf('state.sputniks')
  const icbmSection = renderSrc.slice(icbmStart, sputnikStart)

  it('the ICBM section anchors resolve (guard against a silent empty slice)', () => {
    expect(icbmStart, 'the "Incoming ICBM" section header must still exist').toBeGreaterThanOrEqual(0)
    expect(sputnikStart, 'the state.sputniks loop must still follow the ICBM section').toBeGreaterThan(icbmStart)
  })

  it('cites the flash tip (W3DSUP.MAC:931) and DRAW MISSILE (W3DSUP.MAC:1221) on the ICBM path', () => {
    expect(
      icbmSection,
      'the incoming ICBM tip must cite the flash tip — MISSILE TIPS & TRAIL / "TIP OF MISSILE TRAIL IS FLASH" (W3DSUP.MAC:931)',
    ).toMatch(/W3DSUP\.MAC:931|TIP OF MISSILE TRAIL IS FLASH|MISSILE TIPS & TRAIL/)
    expect(
      icbmSection,
      'the incoming ICBM must cite DRAW MISSILE (W3DSUP.MAC:1221)',
    ).toMatch(/W3DSUP\.MAC:1221|DRAW MISSILE/)
  })

  it('colours the ICBM head with the FLASH register (dropping the solid enemy-hue disc)', () => {
    // The colour-blind mock cannot see the hue, so this pins the flash-tip treatment
    // structurally: the ICBM section must reference the flash mechanism (FLASH_SLOTS /
    // the shared abmTip), exactly as the ABM tip does — NOT just carry a citation comment
    // over a disc still filled in the enemy hue.
    expect(
      icbmSection,
      'the ICBM head must use the ABM flash-tip treatment (FLASH_SLOTS / abmTip), not the solid COL010 enemy disc',
    ).toMatch(/FLASH_SLOTS|abmTip/)
  })
})
