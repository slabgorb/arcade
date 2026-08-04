// tests/helpers/bake-atlas.ts
//
// Story cp7-1 — run the REAL `buildAtlas()` under vitest's `node` environment and
// read back the pixels it actually painted.
//
// ─── WHY THIS EXISTS ─────────────────────────────────────────────────────────
// Every existing atlas pin (tests/atlas.test.ts, tests/atlas-orientation.test.ts)
// is a `?raw` SOURCE SCAN, on the stated grounds that "buildAtlas() touches a
// canvas (absent in the node vitest env)". cp5-2 already falsified the same claim
// for main.ts (tests/helpers/boot-shell.ts) and the same answer applies here: the
// bake's whole DOM surface is SIX members, measured rather than assumed —
//     grep -ohE "\b(ctx|canvas)\.[a-zA-Z]+" src/shell/atlas.ts | sort -u
//   -> canvas.getContext, canvas.height, canvas.width, ctx.fillRect, ctx.fillStyle
// plus `document.createElement`.
//
// cp7-1 AC-1 says the sprites must be "verified by decoding the shipped atlas
// pixels in a test rather than by eye". A source scan cannot tell a call from a
// mention, so only running the bake closes that.
//
// The stub is those six members and NOTHING else — deliberately not a Proxy. A
// Proxy answers every question, so it could not tell us the bake had grown a new
// dependency; this one throws instead.

import { buildAtlas, atlasRectFor, orientForScreen } from '../../src/shell/atlas'
import { decodeStamp, STAMPS, type Stamp } from '../../src/core/pictures'

export interface PaintedAtlas {
  /** The colour painted at (x, y), or undefined for an untouched pixel. */
  at(x: number, y: number): string | undefined
  /** Total painted pixels — the liveness figure. */
  count(): number
}

/**
 * Run the real `buildAtlas(wave)` against a stub canvas and return everything it
 * painted. Restores any pre-existing `globalThis.document` on the way out, even
 * if the bake throws.
 */
export function bakeAtlas(wave?: number): PaintedAtlas {
  const pixels = new Map<string, string>()
  const ctx = {
    fillStyle: '',
    fillRect(x: number, y: number, w: number, h: number): void {
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) pixels.set(`${x + dx},${y + dy}`, ctx.fillStyle)
      }
    },
  }
  const canvas = {
    width: 0,
    height: 0,
    getContext(kind: string): unknown {
      if (kind !== '2d') throw new Error(`bake-atlas stub: unexpected context kind "${kind}"`)
      return ctx
    },
  }
  const doc = {
    createElement(tag: string): unknown {
      if (tag !== 'canvas') throw new Error(`bake-atlas stub: unexpected createElement("${tag}")`)
      return canvas
    },
  }

  const g = globalThis as { document?: unknown }
  const had = Object.prototype.hasOwnProperty.call(g, 'document')
  const prev = g.document
  g.document = doc
  try {
    if (wave === undefined) buildAtlas()
    else buildAtlas(wave)
  } finally {
    if (had) g.document = prev
    else delete g.document
  }

  return { at: (x, y) => pixels.get(`${x},${y}`), count: () => pixels.size }
}

export function stampNamed(name: string): Stamp {
  const s = STAMPS.find((x) => x.name === name)
  if (!s) throw new Error(`no stamp named ${name}`)
  return s
}

/** A named stamp's BAKED pixels, as ASCII rows ('#' painted, '.' untouched). */
export function bakedRows(painted: PaintedAtlas, name: string): string[] {
  const rect = atlasRectFor(name)
  const rows: string[] = []
  for (let r = 0; r < rect.sh; r++) {
    let row = ''
    for (let c = 0; c < rect.sw; c++) row += painted.at(rect.sx + c, rect.sy + r) ? '#' : '.'
    rows.push(row)
  }
  return rows
}

/** The same stamp with NO flip — the plain ROT270 of its decode. The control. */
export function unflippedRows(name: string): string[] {
  return orientForScreen(decodeStamp(stampNamed(name))).map((row) => row.map((v) => (v ? '#' : '.')).join(''))
}

/** Every stamp whose baked pixels differ from the unflipped ROT270 bake. */
export function stampsThatMoved(painted: PaintedAtlas): string[] {
  return STAMPS.filter((s) => bakedRows(painted, s.name).join('\n') !== unflippedRows(s.name).join('\n'))
    .map((s) => s.name)
    .sort()
}
