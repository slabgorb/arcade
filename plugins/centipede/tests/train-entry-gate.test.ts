// tests/train-entry-gate.test.ts
//
// Story cp7-2 — RED phase (O'Brien / TEA). "The train enters on the score line."
//
// THE DEFECT IS IN THE RENDER, NOT THE SIM. The sim value CENT_ENTER_V = 0xF8
// (src/core/centipede.ts:64) is byte-cited to CENTI4.MAC:489 and CORRECT — the
// ROM lays the whole wave-1 train along the top row v=0xF8 and holds it there.
// Three ROM comments say V >= 0xF8 is OFF the visible field (SHOOT :2177-2182
// "IF OFF TOP OF SCREEN", ANTMV :59-62 "IF ON SCREEN, KEEP MOVING", ANTPC
// :135-137 "REMOVE ANT FROM SCREEN"). render() draws the gun, shot, spider and
// flea already declining to paint in that band — the flea is gated four lines
// from the train by `if (flea.v < FLEA_PARK_V)` (render.ts) — but the TRAIN is
// the one motion object that blits there ungated, painting the 12-segment wave
// straight over the P1 score, lives and high-score row at wave start.
//
// ── THE RULING (AC-3): DRAW GATE, NOT VERTICAL OFFSET ────────────────────────
// The band is hidden by a DRAW GATE on the segment loop — the flea's own idiom,
// `seg.v < FLEA_PARK_V` — NOT by a vertical offset (y = 248 - v) applied to
// motion objects. The reason is behavioural and these tests encode it:
//
//   • A GATE removes the in-band segment entirely — nothing is blitted.
//   • An OFFSET still blits it, one pixel lower, at y = 0..7 — STILL on the
//     HUD row. An offset does not clear the score line; it slides the
//     obstruction down by a pixel. So the "no HEAD stamp at wave start" and
//     "band segment not requested" assertions below REJECT an offset fix: an
//     offset leaves the HEAD stamp in the requested list.
//
// Blast radius seals it: gunScreenY reduces to y = 247 - v (layout.ts:111-116),
// is shared with the gun, and is pinned by tests/gun-vertical.test.ts over
// PLAYV_MIN..PLAYV_MAX. The gate leaves that mapping untouched; an offset either
// perturbs the shared mapping or forks a second, motion-object-only idiom that
// AC-1 forbids ("not a new idiom").
//
// AC-6 (the off-by-one, y=0xF8 -> y=-1) is RESOLVED by the gate, not left
// hanging: a gated segment is never painted, so it never lands at y=-1; below
// the band (v <= 0xF7) the existing y = 247 - v is unchanged. Recorded, not
// mentioned-and-dropped.
//
// RED because render()'s segment loop blits every live segment regardless of v,
// so a segment at v >= 0xF8 IS requested from the atlas today.

import { describe, it, expect } from 'vitest'
import { render } from '../src/shell/render'
import renderSrc from '../src/shell/render.ts?raw'
import { createSim, type SimState } from '../src/core/sim'
import { STAMPS } from '../src/core/pictures'
import { FLEA_PARK_V } from '../src/core/flea'
import type { Segment } from '../src/core/centipede'

const KNOWN = new Set(STAMPS.map((s) => s.name))
const HEAD = /^HEAD[0-9A-F]$/i // the shared head/body motion-object pool

// ── recording fakes (mirrors tests/segment-render.test.ts) ───────────────────
function makeCtx() {
  let drawImageCount = 0
  const ctx = {
    imageSmoothingEnabled: true,
    fillStyle: '' as string,
    fillRect() {},
    drawImage() {
      drawImageCount++
    },
    clearRect() {},
    save() {},
    restore() {},
    translate() {},
    scale() {},
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, drawImageCount: () => drawImageCount }
}
function makeAtlas() {
  const requested: string[] = []
  return {
    atlas: {
      image: {} as CanvasImageSource,
      rect(name: string) {
        requested.push(name)
        return { sx: 0, sy: 0, sw: 8, sh: 8 }
      },
    },
    requested,
  }
}

type SimExt = SimState & { segs: Segment[] }
const withSegs = (seed: number, segs: Segment[]): SimState => ({ ...(createSim(seed) as SimExt), segs }) as SimState
const seg = (h: number, v: number, pic: number): Segment => ({ h, v, dh: 2, dv: 2, pic })

// Strip comments so a hex string in prose can't fool a source scan.
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

describe('cp7-2 — the render gates the train off the V >= 0xF8 entry band (the ROM says it is off-screen)', () => {
  it('does NOT blit a segment at v = 0xF8, but DOES blit one that has descended onto the field', () => {
    const c = makeCtx()
    const a = makeAtlas()
    // Two distinct heads: one still in the entry band (0xF8), one descended to a
    // visible row (0xE0). Distinct low nibbles => distinct, unambiguous stamps,
    // so each is identified by name with no reliance on draw counts.
    const state = withSegs(0x0abc, [
      seg(0x80, 0xf8, 0x05), // in the band -> HEAD5, must be GATED
      seg(0x70, 0xe0, 0x03), // descended -> HEAD3, must DRAW
    ])
    ;(state as SimExt).playfield.cells.fill(0) // isolate the two segments
    render(c.ctx, a.atlas, state)

    expect(a.requested, 'the descended segment (v=0xE0) is drawn').toContain('HEAD3')
    expect(a.requested, 'the entry-band segment (v=0xF8) is NOT drawn — the ROM holds it off-screen').not.toContain(
      'HEAD5',
    )
  })

  it('gates at exactly v = 0xF8 (== FLEA_PARK_V): v = 0xF7 still draws, v = 0xF8 does not', () => {
    expect(FLEA_PARK_V, 'the train copies the flea’s threshold, not a new one').toBe(0xf8)
    const c = makeCtx()
    const a = makeAtlas()
    const state = withSegs(0x1234, [
      seg(0x80, 0xf7, 0x01), // the topmost on-screen row -> HEAD1, DRAWS
      seg(0x60, 0xf8, 0x02), // one pixel into the band -> HEAD2, GATED
    ])
    ;(state as SimExt).playfield.cells.fill(0)
    render(c.ctx, a.atlas, state)

    expect(a.requested, 'v=0xF7 is on-screen and draws').toContain('HEAD1')
    expect(a.requested, 'v=0xF8 is the first off-screen row and does not').not.toContain('HEAD2')
  })

  it('at WAVE START the whole train sits at v=0xF8, so no head/body sprite lands on the HUD row', () => {
    // createSim boots the wave-1 train at CENT_ENTER_V (all 12 segments at
    // 0xF8). This IS the playtest report: "the centipede starts on the same row
    // as the player score." Post-gate, not one segment stamp is requested; the
    // HUD (score digits, gun icons) still draws, proving the row is intact, not
    // merely blank. An OFFSET fix would still request these HEAD stamps and fail
    // here — which is the ruling, enforced.
    const c = makeCtx()
    const a = makeAtlas()
    render(c.ctx, a.atlas, createSim(0x2b2b))

    const heads = a.requested.filter((n) => HEAD.test(n))
    expect(heads, 'no train sprite is painted while the whole train is in the entry band').toEqual([])
    expect(a.requested, 'the HUD score row still draws (row is unobstructed, not erased)').toContain('DIGIT_0')
    expect(a.requested, 'the gun still draws').toContain('GUN')
  })

  it('every requested stamp is a real cp1-3 STAMP (no invented pixels slipped in with the gate)', () => {
    const c = makeCtx()
    const a = makeAtlas()
    const state = withSegs(0x0777, [seg(0x80, 0xf8, 0x05), seg(0x70, 0xc0, 0x03)])
    ;(state as SimExt).playfield.cells.fill(0)
    render(c.ctx, a.atlas, state)
    expect(a.requested.every((n) => KNOWN.has(n)), 'no stamp requested that cp1-3 never baked').toBe(true)
  })

  it('AC-1: the gate is a named-constant compare, not a bare 0xF8 / 248 magic literal (the flea’s idiom, not a new one)', () => {
    // render.ts already imports FLEA_PARK_V and carries no 0xF8/248 numeric
    // literal in code today. The gate must reuse a named 0xF8 constant
    // (FLEA_PARK_V / CENT_ENTER_V / SHOT_TOP_SKIP are all 0xF8 and already
    // exist), never re-inline the magic number — that is what "expressed the
    // way the flea's is rather than as a new idiom" means.
    const code = stripComments(renderSrc)
    expect(code, 'no bare 0xF8 hex literal in render.ts code').not.toMatch(/0xf8/i)
    expect(code, 'no bare 248 decimal literal in render.ts code').not.toMatch(/\b248\b/)
  })
})
