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
import { BASES } from '../src/core/field.js'

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

// ═════════════════════════════════════════════════════════════════════════════
// mc12-4 — the SHARED missile tip stays ONE flash pixel at DISPLAY resolution.
//
// The mc12-2 AC1 guards above only prove the tip uses the FLASH register (a colour
// change) — they run at the 256-wide unit canvas (W), where the shipped tipR =
// round(width/200) = round(1.28) = 1: a legit 1px tip. They are structurally BLIND
// to the lollipop, which only appears when the canvas scales up. On the ~955px
// browser canvas the owner actually played, round(955/200) = 5 → a 10px SOLID DISC
// on every incoming warhead (owner playtest, 2026-08-17): mc12-2 recoloured the disc
// but never shrank it. This is the mc9->mc10 lesson exactly — green vitest, wrong
// pixels — because tipR was tied to nothing physical, so the ONLY canvas the test
// ever rendered (256px) is precisely where the bug is invisible.
//
// The fix pins the tip to the cabinet-pixel unit (uH = width/LOGICAL_WIDTH): the arc
// radius is round(uH/2), so the tip is ~ONE cabinet pixel ACROSS at every scale.
// This guard therefore does what the story is about — it renders at MULTIPLE display
// widths (including the owner's ~955) and asserts the tip DIAMETER is at most one
// cabinet pixel (+1px of Math.round slack). The old round(width/200) disc FAILS that
// at every width (diameter 6→20), while the cabinet-pixel tip passes.
//
// tipR is SHARED by the incoming-ICBM head (render.ts:191) and the ABM head
// (render.ts:234), so both heads are asserted — a future edit that re-sizes only one
// call site is then caught. The mock records arc(x, y, radius) with the radius in the
// `w` field, so the size is directly checkable; each head asserts the tip EXISTS
// first, so an empty arc set can never pass the size bound vacuously (Math.max(...[]).
// ═════════════════════════════════════════════════════════════════════════════
describe('mc12-4 — the shared missile tip is one flash pixel at display resolution, not a lollipop disc', () => {
  // One incoming ICBM and one ABM, heads parked in open mid-field (clear of the
  // bottom structures, the centred HUD figures, and the AWAY crosshair) so the only
  // arc near each head is its own flash tip.
  const bare = withCursor({ ...createGame(1), phase: 'play' })
  const icbm = { origin: { h: 100, v: 222 }, target: { h: 100, v: 16 }, pos: { h: 100, v: 120 }, arrived: false }
  const abm = { origin: { h: 180, v: 16 }, target: { h: 180, v: 120 }, pos: { h: 180, v: 70 }, arrived: false }
  const state: GameState = { ...bare, icbms: [icbm], abms: [abm] }

  const paintAt = (s: GameState, w: number, h: number): Mark[] => {
    const { ctx, marks } = recordingCtx()
    drawFrame(ctx, s, w, h)
    return marks
  }
  const project = (p: { h: number; v: number }, w: number, h: number) => ({
    x: (p.h / 0x100) * w,
    y: h - (p.v / 222) * h,
  })

  // Arcs whose centre sits on a projected head (tight window: ≤ one cabinet px away).
  const arcsAt = (marks: Mark[], head: { x: number; y: number }, cabPx: number): Mark[] =>
    marks.filter((m) => m.op === 'arc' && Math.hypot(m.x - head.x, m.y - head.y) <= cabPx)

  // Widths spanning the reported case (955) and larger displays. NOT 256: there the
  // old and new formulas coincide (both give tipR=1), so it cannot discriminate — the
  // very blind spot this describe exists to cover.
  const WIDTHS = [512, 955, 1024, 2048]

  it.each(WIDTHS)('at display width %i both the ICBM and ABM heads draw a flash tip (no bare-line regression)', (w) => {
    const h = Math.round((w * 222) / 0x100)
    const cabPx = w / 0x100
    const heads = { ICBM: project(icbm.pos, w, h), ABM: project(abm.pos, w, h) }
    for (const [name, head] of Object.entries(heads)) {
      expect(arcsAt(paintAt(bare, w, h), head, cabPx).length, `empty field draws no ${name} tip`).toBe(0)
      expect(
        arcsAt(paintAt(state, w, h), head, cabPx).length,
        `the ${name} head must carry a flash tip at W=${w} (W3DSUP.MAC:931)`,
      ).toBeGreaterThanOrEqual(1)
    }
  })

  it.each(WIDTHS)('at display width %i the shared tip DIAMETER is ≤ one cabinet pixel, not the round(width/200) lollipop', (w) => {
    const h = Math.round((w * 222) / 0x100)
    const cabPx = w / 0x100
    const marks = paintAt(state, w, h)
    const heads = { ICBM: project(icbm.pos, w, h), ABM: project(abm.pos, w, h) }
    for (const [name, head] of Object.entries(heads)) {
      const arcs = arcsAt(marks, head, cabPx)
      // Non-vacuity: prove the tip exists before measuring it, so an empty set
      // (Math.max(...[]) === -Infinity) can never satisfy the bound trivially.
      expect(arcs.length, `${name} tip must be present to be measured at W=${w}`).toBeGreaterThanOrEqual(1)
      const maxDiameter = 2 * Math.max(...arcs.map((m) => m.w ?? 0))
      // "One cabinet pixel across", + 1px of Math.round() slack. Tight enough to
      // reject the shipped round(width/200) disc at EVERY width (diameter 6→20) yet
      // rounding-safe for the fix at non-power-of-two widths like 955.
      expect(
        maxDiameter,
        `the ${name} tip must be ~one flash pixel across at W=${w} (≤ ${(cabPx + 1).toFixed(1)}px); ` +
          `the shipped round(width/200) disc is ${2 * Math.round(w / 200)}px — the lollipop the owner saw (mc12-4)`,
      ).toBeLessThanOrEqual(cabPx + 1)
    }
  })
})

// mc12-5 — the ready-missile STACK marker is cabinet-pixel scaled at DISPLAY resolution,
// not the width/200 square. This is the LAST magic /200 divisor in render.ts, the sibling
// of the mc12-4 tip: filed by the mc12-4 review (rule-checker #24/#33) as out of that
// story's four-finding scope.
//
// A live base draws its 1-2-3-4 ready-missile stack (DRAW MISSILE, W3DSUP.MAC:1221; stack
// offsets MISTBV/MISTBH, W3DSUP.MAC:1329-1331) as one small SQUARE per ready missile
// (render.ts `dot`; drawn as fillRect(cx - dot, cy - dot, dot*2, dot*2)). The shipped
// size was `dot = round(width/200)` — the SAME non-physical divisor mc12-4 removed from the
// shared tip. round(256/200)=1 → a legit 2px square at the unit-test canvas, so every
// vitest passed; but round(955/200)=5 → a 10px square on the owner's ~955px browser canvas
// (20px at 2048). Like the mc12-4 lollipop, a 256-only test is structurally BLIND to it —
// 256 is the one width where round(w/200) and a cabinet-pixel size coincide.
//
// The fix ties the marker to the cabinet-pixel unit uH = width/LOGICAL_WIDTH (as mc12-4
// tied the tip), so it stays a small cabinet-pixel-scaled square at every display scale.
// This guard renders at MULTIPLE display widths (incl. the owner's ~955) and asserts each
// marker is at most ~2 cabinet pixels wide: it REJECTS the round(width/200) square (which
// is >= 2.5x the cabinet pixel at every tested width) yet is rounding-safe for a uH-tied
// marker (~1-2 cabinet pixels). Mirrors the mc12-4 display-resolution guard for the sibling
// const. NOT 256: there the old and new formulas coincide (both ~1px), the blind spot this
// describe exists to cover.
describe('mc12-5 — the ready-missile stack marker is cabinet-pixel scaled at display resolution, not a width/200 square', () => {
  // The field at createGame defaults (all structures alive, full ammo) so the middle
  // base draws its full ready-missile stack; cursor parked AWAY in the top band.
  const oneBase = withCursor({ ...createGame(1), phase: 'play' })
  // The same field with the RIGHT base dead — it then draws only its rubble line (width
  // bw), no small marker squares. The non-vacuity control for the "markers present" test.
  const deadBase: GameState = {
    ...oneBase,
    bases: oneBase.bases.map((b, i) => (i === 2 ? { ...b, alive: false } : b)),
  }

  // The RIGHT base column (h=0xf0=240): clear of the CENTRED HUD figures (screen centre
  // ~h128, which pollutes the middle base) and of the top-left AWAY crosshair (h5, near
  // the LEFT base) — the nearest city is 32 cabinet units away.
  const BASE = BASES[2] // { h: 0xf0, v: 0x16 }

  const paintAt = (s: GameState, w: number, h: number): Mark[] => {
    const { ctx, marks } = recordingCtx()
    drawFrame(ctx, s, w, h)
    return marks
  }

  // The small marker squares near the right base's column: fillRects whose CENTRE
  // (m.x + m.w/2, since each marker is fillRect(cx - dot, .., dot*2, dot*2) so centre = cx)
  // sits within a few cabinet units of the base column, and whose width is well under the
  // launch platform's bw = round(width/32). The `w < bw` cut excludes the platform, the
  // dead-structure rubble lines and the ground fill (all width >= bw); the column window
  // excludes the other bases' stacks and every city (nearest is 32 cabinet units away).
  const stackMarkersAt = (marks: Mark[], w: number): Mark[] => {
    const baseX = (BASE.h / 0x100) * w
    const bw = Math.max(5, Math.round(w / 32))
    const window = (10 / 0x100) * w // widest MISTBH offset is +/-9 cabinet units
    return marks.filter(
      (m) =>
        m.op === 'fillRect' &&
        m.w !== undefined &&
        m.w < bw &&
        Math.abs(m.x + m.w / 2 - baseX) <= window,
    )
  }

  // Widths spanning the reported case (955) and larger displays; NOT 256 (see header).
  const WIDTHS = [512, 955, 1024, 2048]

  it.each(WIDTHS)(
    'at display width %i the live base draws its ready-missile markers (no missing-stack regression)',
    (w) => {
      const h = Math.round((w * 222) / 0x100)
      expect(
        stackMarkersAt(paintAt(deadBase, w, h), w).length,
        `a DEAD base draws no ready-missile markers at W=${w} (only its rubble line)`,
      ).toBe(0)
      expect(
        stackMarkersAt(paintAt(oneBase, w, h), w).length,
        `a live base must draw its ready-missile stack at W=${w} (DRAW MISSILE, W3DSUP.MAC:1221)`,
      ).toBeGreaterThanOrEqual(1)
    },
  )

  it.each(WIDTHS)(
    'at display width %i every ready-missile marker is <= ~2 cabinet pixels wide, not the round(width/200) square',
    (w) => {
      const h = Math.round((w * 222) / 0x100)
      const cabPx = w / 0x100
      const markers = stackMarkersAt(paintAt(oneBase, w, h), w)
      // Non-vacuity: the stack must be present before its size can bound anything, so an
      // empty set (Math.max(...[]) === -Infinity) can never satisfy the bound trivially.
      expect(
        markers.length,
        `the ready-missile stack must be present to be measured at W=${w}`,
      ).toBeGreaterThanOrEqual(1)
      const maxWidth = Math.max(...markers.map((m) => m.w ?? 0))
      // "Cabinet-pixel scaled": at most ~2 cabinet pixels across (+1px of round() slack).
      // Rejects the shipped round(width/200) square (2*round(w/200) is >= 2.5x cabPx at
      // every tested width) yet passes a uH-tied marker (~1-2 cabPx).
      expect(
        maxWidth,
        `the ready-missile marker must be cabinet-pixel scaled at W=${w} (<= ${(2 * cabPx + 1).toFixed(1)}px); ` +
          `the shipped round(width/200) square is ${2 * Math.round(w / 200)}px — the last magic /200 divisor (mc12-5)`,
      ).toBeLessThanOrEqual(2 * cabPx + 1)
    },
  )
})
