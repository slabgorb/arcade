// plugins/defender/tests/still-frame.test.ts
//
// Story df2-6 — RED phase (Han Solo / TEA). The VISUAL playtest for orientation traps,
// mechanised. df2-1..df2-5 transcribed and gated each piece IN ISOLATION (palette,
// MESS0 charset, DEFB6 objects, BLK71 terrain). This story proves they COMPOSE into
// one upright still: a planet surface at the bottom, a line of charset text, and a
// sample object — the "static planet + text early" the epic calls for — BEFORE any
// physics (playbook §4). render.test.ts already anticipates this suite: "The full
// pixel result is proven by the df2-6 VISUAL check + tests/canonical-serve.test.mjs."
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// There is no composition seam yet. src/main.ts only does `clear(fb, 0)` — a blank
// screen. The transcribed data lands inert; nothing blits terrain + text + an object
// into a single frame. loadScene() throws a self-describing "not built yet" until the
// core seam exists, so RED proves the integrated still is absent.
//
// ─── CONTRACT (what GREEN/Dev must build) ────────────────────────────────────────
//   • NEW pure core module  src/core/scene.ts:
//         export function composeStaticFrame(width: number, height: number): Framebuffer
//     It allocates the index surface, clears it to the background index, then blits the
//     STATIC still — the planet surface across the BOTTOM (terrain), a line of charset
//     TEXT near the top, and at least one sample DEFB6 OBJECT below the text. PURE
//     src/core: it composes with framebuffer/terrain/charset/objects only, hands the
//     shell nothing but indices, and reads no clock and no entropy — tests/purity.test.ts
//     sweeps it. It takes width/height as ARGUMENTS: the visible-raster board constant
//     (292×240) lives in the shell (render.ts LOGICAL_WIDTH/HEIGHT), so importing it
//     here would cross the boundary the wrong way (import from shell/ → purity RED).
//   • src/main.ts wires it: paint `composeStaticFrame(LOGICAL_WIDTH, LOGICAL_HEIGHT)`
//     instead of a bare `createFramebuffer + clear`, so the mounted canvas shows the
//     still, not a blank surface.
//
// ─── THE ORIENTATION TRAP THIS SUITE SETTLES ─────────────────────────────────────
// Defender is drawn upright: the ground is at the BOTTOM of the 240-row screen and text
// runs across the TOP. BGALT starts the surface near row $E0 (224) and the first 292
// altitudes measured off TDATA stay in rows 186..232 (a wide horizontal band along the
// bottom quarter). So the render is upright iff the WIDE surface sits low and the text
// sits high. An X/Y axis swap, a vertical flip, or a 90° rotation each moves the wide
// band out of the bottom — which these assertions catch WITHOUT pinning exact pixels
// (per-pixel fidelity is each df2-N gate's job; this is the integration + orientation
// gate). The row/column thresholds are coarse on purpose: coupling to Dev's exact
// string, colours and object positions would make an orientation test brittle.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createFramebuffer, clear } from '../src/core/framebuffer.js'
import { writeText } from '../src/core/charset.js'

// tests/still-frame.test.ts -> the plugin root is one level up.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sceneSourcePath = join(root, 'src', 'core', 'scene.ts')
const mainSourcePath = join(root, 'src', 'main.ts')

/** Strip `//` line comments and block comments so a source-text guard scans CODE, not
 *  prose — the rule's own explanation ("colours are never invented") must neither red
 *  the scan nor let a real literal hide inside a comment. (Same helper render.test.ts
 *  uses for its denylist scan.) */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

interface Framebuffer {
  readonly width: number
  readonly height: number
  readonly data: Uint8Array
}
interface SceneModule {
  composeStaticFrame: (width: number, height: number) => Framebuffer
}

async function loadScene(): Promise<SceneModule> {
  try {
    const mod = (await import('../src/core/scene.js')) as Partial<SceneModule>
    if (typeof mod.composeStaticFrame !== 'function') throw new Error('no `composeStaticFrame` export')
    return mod as SceneModule
  } catch (e) {
    throw new Error(
      'src/core/scene.ts not built yet — GREEN (Dev) creates the static-still composition: ' +
        '`composeStaticFrame(width, height): Framebuffer` that clears the surface and blits the ' +
        'planet (terrain) across the bottom, a line of charset text near the top, and a sample ' +
        'DEFB6 object below the text. PURE src/core (composes framebuffer/terrain/charset/objects ' +
        'only — no shell import; takes width/height as ARGUMENTS so the board constant stays in ' +
        `render.ts). Then main.ts must paint composeStaticFrame(...) instead of a bare clear. (${(e as Error).message})`,
    )
  }
}

const LOGICAL_WIDTH = 292
const LOGICAL_HEIGHT = 240
const BACKGROUND = 0

/** Count the distinct COLUMNS holding at least one non-background pixel within the row
 *  band [rowLo, rowHi). A wide count means a horizontal surface at that height. */
function columnsWithPixel(fb: Framebuffer, rowLo: number, rowHi: number): number {
  const cols = new Set<number>()
  for (let y = Math.max(0, rowLo); y < Math.min(fb.height, rowHi); y++) {
    for (let x = 0; x < fb.width; x++) {
      if (fb.data[y * fb.width + x] !== BACKGROUND) cols.add(x)
    }
  }
  return cols.size
}

/** Whether any pixel in the row band [rowLo, rowHi) is non-background. */
function hasPixel(fb: Framebuffer, rowLo: number, rowHi: number): boolean {
  return columnsWithPixel(fb, rowLo, rowHi) > 0
}

describe('df2-6 still frame — the seam exists and returns the visible raster', () => {
  it('composeStaticFrame(292, 240) returns a 292×240 index surface', async () => {
    const { composeStaticFrame } = await loadScene()
    const fb = composeStaticFrame(LOGICAL_WIDTH, LOGICAL_HEIGHT)
    expect(fb.width).toBe(LOGICAL_WIDTH)
    expect(fb.height).toBe(LOGICAL_HEIGHT)
    expect(fb.data.length).toBe(LOGICAL_WIDTH * LOGICAL_HEIGHT)
  })

  it('is not a blank screen — it differs from a cleared framebuffer (the vitest analogue of the canonical-serve DIFFER)', async () => {
    // AC3, mechanised locally: /defender/ must render something other than an empty
    // surface. tests/canonical-serve.test.mjs already proves the served path DIFFERs
    // from a nonsense control; here we prove the composed frame DIFFERs from a clear.
    const { composeStaticFrame } = await loadScene()
    const fb = composeStaticFrame(LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const painted = fb.data.some((i) => i !== BACKGROUND)
    expect(painted, 'composeStaticFrame produced an all-background (blank) frame').toBe(true)
  })
})

describe('df2-6 still frame — upright orientation (the trap this story settles)', () => {
  it('lays the planet as a WIDE surface along the BOTTOM, not the top (catches an X/Y swap or a vertical flip)', async () => {
    const { composeStaticFrame } = await loadScene()
    const fb = composeStaticFrame(LOGICAL_WIDTH, LOGICAL_HEIGHT)

    // BGALT puts the surface in rows ~186..232 across all 292 columns — a wide band in
    // the bottom quarter. Upright: that wide band is LOW.
    const bottomCols = columnsWithPixel(fb, 160, LOGICAL_HEIGHT)
    expect(
      bottomCols,
      `expected a wide planet surface across the screen bottom (rows 160..240); saw ${bottomCols} columns`,
    ).toBeGreaterThanOrEqual(200)

    // …and the wide surface must NOT be at the top. A short text line spans well under
    // 200 columns, so a ≥200-column band up here means the ground was flipped/rotated up.
    const topCols = columnsWithPixel(fb, 0, 60)
    expect(
      topCols,
      `a wide horizontal surface appears at the TOP (${topCols} columns in rows 0..60) — the frame looks flipped/rotated`,
    ).toBeLessThan(200)
  })

  it('draws the text and the sample object ABOVE the planet (an integrated, upright scene)', async () => {
    // The still is text (top) + object (below it) + planet (bottom). Prove the upper
    // region carries content so nothing is drawn off-screen or hidden under the ground.
    const { composeStaticFrame } = await loadScene()
    const fb = composeStaticFrame(LOGICAL_WIDTH, LOGICAL_HEIGHT)
    expect(hasPixel(fb, 0, 60), 'no charset text near the top of the screen (rows 0..60)').toBe(true)
    expect(hasPixel(fb, 60, 160), 'no sample object between the text and the planet (rows 60..160)').toBe(true)
  })

  it('shows THREE distinct visible elements — planet, text and a sample object', async () => {
    // A position-free presence check: the planet is one caller colour and the text line
    // is one caller colour; a THIRD distinct non-background palette index proves a third
    // element — the DEFB6 object — is on screen (a raster object carries its own
    // indices). Two elements could only yield two non-background colours.
    const { composeStaticFrame } = await loadScene()
    const fb = composeStaticFrame(LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const nonBg = new Set<number>()
    for (const i of fb.data) if (i !== BACKGROUND) nonBg.add(i)
    expect(
      nonBg.size,
      `expected ≥3 distinct on-screen colours (planet + text + object); saw indices {${[...nonBg].sort((a, b) => a - b).join(', ')}}`,
    ).toBeGreaterThanOrEqual(3)
  })
})

describe('df2-6 still frame — the charset renders UPRIGHT (the orientation df2-6 settled)', () => {
  // The visual playtest caught the trap the charset/objects source comments deferred to
  // df2-6: the Williams cell is stored COLUMN-major (bytes[col*height + row]), not
  // row-major. Read row-first, "DEFENDER" is noise; read column-first it is legible
  // (LETTRD's 24 bytes, defender/MESS0.SRC:558, only spell a 'D' column-first). This
  // locks that orientation so a regen or a "tidy" refactor can't silently re-transpose
  // the font back to garbage.
  it("'D' has a solid left vertical stroke and a top bar — the column-major signature, impossible row-major", () => {
    const TEXT_COLOUR = 9
    const fb = createFramebuffer(6, 8) // one 'D' cell: width 3 → 6px wide, height 8
    clear(fb, 0)
    writeText(fb, 'D', 0, 0, TEXT_COLOUR, 0)
    const at = (x: number, y: number): number => fb.data[y * fb.width + x]

    // Column-major 'D' is  .####. / .#..## / … / .####. — the left stroke (x=1) is a
    // solid vertical bar down rows 0..6. Row-major 'D' dots that column instead, so
    // this fails the moment the decode transposes back.
    for (let row = 0; row <= 6; row++) {
      expect(at(1, row), `'D' left stroke broken at row ${row} — charset is not upright (column-major)`).toBe(
        TEXT_COLOUR,
      )
    }
    // …and the top bar is a contiguous run (x=1..4 at row 0). Row-major leaves gaps here
    // (its row 0 is .#.#.#), so the two checks together pin the orientation both ways.
    for (let x = 1; x <= 4; x++) {
      expect(at(x, 0), `'D' top bar broken at x=${x} — charset is not upright (column-major)`).toBe(TEXT_COLOUR)
    }
  })
})

describe('df2-6 still frame — colours are never invented', () => {
  it('every framebuffer cell is a valid 4-bit palette index (0..15) — no colour invented by byte overflow', async () => {
    // blitTerrain validates its colour 0..15, but blitGlyph/blitObject write the caller's
    // index straight into the Uint8Array. A text/object colour > 15 would be stored (e.g.
    // 200) and then rendered as `CRAM[200 & 0x0f]` = an INVENTED colour the palette never
    // named. Every composed cell must therefore be a real 4-bit entry.
    const { composeStaticFrame } = await loadScene()
    const fb = composeStaticFrame(LOGICAL_WIDTH, LOGICAL_HEIGHT)
    let max = 0
    for (const i of fb.data) if (i > max) max = i
    expect(max, `composeStaticFrame wrote index ${max}, outside the 16-entry palette (0..15)`).toBeLessThanOrEqual(15)
  })

  it('src/core/scene.ts carries no hex-colour literal — colours are reached BY INDEX (joust colours[0] precedent)', () => {
    // The composition chooses palette INDICES, never RGB. A `#rrggbb` here would be a
    // colour invented outside the transcribed palette. Comment-stripped so the rule's
    // own prose neither reds the scan nor hides a real literal. RED until scene.ts exists
    // (readFileSync throws), GREEN when it exists and is hex-free.
    const code = stripComments(readFileSync(sceneSourcePath, 'utf8'))
    const hex = code.match(/#[0-9a-fA-F]{3,8}\b/g)
    expect(
      hex,
      `scene.ts carries hex colour literal(s): ${hex?.join(', ') ?? ''} — choose a palette index, never an RGB literal`,
    ).toBeNull()
  })
})

// ─── RETIRED BY df3-6 (2026-08-16) ───────────────────────────────────────────────
// This file's final block used to assert `src/main.ts` paints composeStaticFrame(...) —
// the df2 mount contract (a static title still blitted every rAF). df3-6 replaces that:
// main.ts now DRIVES the sim (createLoop + stepSim + the DYNAMIC composeFrame), so it no
// longer mounts the static still in the loop. The (inverted) main.ts mount contract now
// lives in df3-6-shell-wiring.test.ts. composeStaticFrame itself is unchanged and its
// correctness/orientation/colour tests above stay live — the function survives (it is the
// transcribed still, an attract candidate for df7); only the "main.ts paints it" guard
// moved. Retiring it here (rather than letting it go falsely RED when main.ts is rewired)
// is the deliberate fate of a guard the story supersedes.
//
// `mainSourcePath` is now referenced only by df3-6-shell-wiring.test.ts; it is left in
// place above as documentation of where the mount lives.
void mainSourcePath
