// tests/atlas.test.ts
//
// Story cp1-6 — RED phase (O'Brien / TEA). The offscreen sprite ATLAS: decodeStamp
// output (cp1-3) baked once into a texture the renderer blits from. src/shell/
// atlas.ts does not exist yet — RED.
//
// atlasRectFor is PURE packing math (source-rect of a named stamp inside the
// atlas) and is unit-tested directly. buildAtlas() touches a canvas (absent in the
// node vitest env), so its wiring is pinned by the `?raw` source read (the
// reviewer-blessed tp1-39 idiom): it must decode from cp1-3's STAMPS and colour
// from the CLRCH palette, never hand-author pixels.

import { describe, it, expect } from 'vitest'
import { atlasRectFor, type AtlasRect } from '../src/shell/atlas'
import { STAMPS, SPRITE_W, SPRITE_H, TILE_W, TILE_H } from '../src/core/pictures'
import atlasSrc from '../src/shell/atlas.ts?raw'

const overlaps = (a: AtlasRect, b: AtlasRect): boolean =>
  a.sx < b.sx + b.sw && b.sx < a.sx + a.sw && a.sy < b.sy + b.sh && b.sy < a.sy + a.sh

// cp2-1 R3 hardening: strip line + block comments so a token that survives only
// in a doc comment (a gutted buildAtlas) can no longer satisfy a positive scan.
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

describe('cp1-6 atlas — atlasRectFor packing math (pure)', () => {
  // cp2-1: stamps are baked in SCREEN orientation (orientForScreen, ROT270),
  // so a sprite's baked footprint is the axis-swapped SPRITE_H x SPRITE_W
  // (16x8) — a tile stays TILE_W x TILE_H (8x8, square: rotation is a no-op
  // on the footprint even though the pixels themselves turn).
  it('a sprite rect is 16×8 (rotated for screen), a tile rect is 8×8 (geometry from cp1-3 constants)', () => {
    const gun = atlasRectFor('GUN')
    expect([gun.sw, gun.sh]).toEqual([SPRITE_H, SPRITE_W])
    const digit = atlasRectFor('DIGIT_7')
    expect([digit.sw, digit.sh]).toEqual([TILE_W, TILE_H])
  })

  it('every stamp resolves to a rect with non-negative coordinates', () => {
    for (const s of STAMPS) {
      const r = atlasRectFor(s.name)
      expect(r.sx, `${s.name}.sx`).toBeGreaterThanOrEqual(0)
      expect(r.sy, `${s.name}.sy`).toBeGreaterThanOrEqual(0)
    }
  })

  it('distinct stamps never share atlas pixels (no packing overlap)', () => {
    const rects = STAMPS.map((s) => atlasRectFor(s.name))
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        expect(overlaps(rects[i], rects[j]), `${STAMPS[i].name} overlaps ${STAMPS[j].name}`).toBe(false)
      }
    }
  })

  it('is stable — the same name always maps to the same rect', () => {
    expect(atlasRectFor('MUSHROOM_FULL')).toEqual(atlasRectFor('MUSHROOM_FULL'))
  })

  it('rejects an unknown stamp name (typo guard)', () => {
    expect(() => atlasRectFor('NOT_A_STAMP')).toThrow()
  })
})

describe('cp1-6 atlas — buildAtlas wiring (source-read; canvas is absent in node)', () => {
  // cp2-1 R3: positive scans run on comment-stripped source (a gutted buildAtlas
  // whose only surviving reference is a doc comment must now go red).
  const code = stripComments(atlasSrc)

  it('builds FROM decodeStamp / STAMPS — no hand-authored pixels', () => {
    expect(code).toMatch(/decodeStamp/)
    expect(code).toMatch(/\bSTAMPS\b/)
  })

  it('colours pixels from the CLRCH palette (PLAYFIELD_PENS / SPRITE_PENS or the cp2-13 per-wave pens)', () => {
    // cp2-13 widens the colour source from the two static scheme-0 constants to the
    // wave-parameterized *PensForWave lookups; either satisfies "colours flow from
    // the palette module". Green now (scheme-0 constants) and after Dev's refactor.
    expect(code).toMatch(/PLAYFIELD_PENS|SPRITE_PENS|[Pp]ensForWave/)
  })

  it('renders the atlas onto a canvas surface', () => {
    expect(code).toMatch(/getContext\(\s*['"]2d['"]/)
  })
})

describe('cp2-1 atlas — no invented colours (R3 hardening)', () => {
  // The atlas is where decoded pixels become coloured (ctx.fillStyle). Every
  // colour must flow from the CLRCH palette module — never a literal, a CSS
  // colour keyword, or a hand-built {r,g,b}. Scanned on comment-stripped source.
  const code = stripComments(atlasSrc)

  it('contains no hex / rgb() / hsl() colour literal', () => {
    expect(code, 'no hex colour literal').not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(code, 'no rgb()/rgba()/hsl() literal').not.toMatch(/\b(?:rgba?|hsla?)\s*\(/)
  })

  it('contains no CSS colour keyword and no hand-built r/g/b literal', () => {
    expect(code, 'no CSS colour keyword').not.toMatch(
      /['"](?:red|green|blue|gold|lime|cyan|magenta|yellow|white|black|orange|purple|pink|gray|grey|silver|maroon|navy|teal|olive|aqua|fuchsia)['"]/i,
    )
    expect(code, 'no inline {r,g,b} colour literal').not.toMatch(/\{\s*r\s*:\s*\d+\s*,\s*g\s*:\s*\d+\s*,\s*b\s*:\s*\d+/)
  })

  it('sources colour from the palette module', () => {
    expect(atlasSrc).toMatch(/palette/)
  })
})

// ─── cp2-13 — RED phase (O'Brien / TEA). Per-round colour cycling. The atlas bakes
// each stamp's RGB in ONCE from the CLRCH pens (buildAtlas today hardcodes scheme
// 0 via the module PLAYFIELD_PENS/SPRITE_PENS constants). To make the colours cycle
// per wave, buildAtlas must take the wave (or scheme) and source the wave-selected
// pens (playfieldPensForWave / spritePensForWave, tests/palette-cycle.test.ts). The
// per-wave rebake itself is driven from main.ts (tests/main-loop.test.ts). Canvas is
// absent in node, so this is the `?raw` source-wiring idiom. RED until Dev
// parameterizes buildAtlas. ────────────────────────────────────────────────────────
describe('cp2-13 atlas — buildAtlas is wave-parameterized (source-read)', () => {
  const code = stripComments(atlasSrc)

  it('buildAtlas takes a wave/scheme parameter (no longer a bare buildAtlas())', () => {
    // `buildAtlas(): Atlas` today → the param scan fails; `buildAtlas(wave = 1)` passes.
    expect(code, 'buildAtlas must accept a wave/scheme argument to colour per round').toMatch(
      /buildAtlas\s*\(\s*[A-Za-z_$][\w$]*/,
    )
  })

  it('sources the WAVE-selected pens, not only the static scheme-0 constants', () => {
    // The static PLAYFIELD_PENS/SPRITE_PENS are scheme 0 only; per-wave colour must
    // come from the palette module's wave lookups.
    expect(code, 'atlas must consume playfieldPensForWave / spritePensForWave').toMatch(/[Pp]ensForWave/)
  })
})
