// tests/segment-render.test.ts
//
// Story cp2-5 — RED phase (O'Brien / TEA). The shell render mapping the sim
// assembly needs: draw the centipede TRAIN, and draw the EXPLODING segments by
// REUSING cp1-3 motion-object stamps — no new pixels (CT-44). render.ts (cp1-6/
// cp2-1/cp2-6) draws mushrooms + gun + shot but has never drawn a segment; this
// story wires the train into render().
//
// The picture byte (MOBJP) indexes the shared 16-entry HEAD0..HEADF sprite pool
// (pictures.ts header: "Head/body share ONE sprite pool — HEAD0..HEADF"), so a
// segment's stamp is HEAD<low-nibble>: heads 0x00-0x07 -> HEAD0-7, bodies 0x42/
// 0x47 -> HEAD2/HEAD7, poisoned 0x23 -> HEAD3, and the explosion frames 0xFA-0xFF
// -> HEADA-F (reused motion-object stamps, CT-44 "no new pixels").
//
// RED because render.ts exports no `segmentStamp` and its render() ignores
// state.segs. Assertions redden for that gap, using the recording-ctx + injected
// atlas idiom (the real atlas canvas lives in atlas.ts, source-read there).

import { describe, it, expect } from 'vitest'
import { render } from '../src/shell/render'
import { createSim, type SimState } from '../src/core/sim'
import { STAMPS } from '../src/core/pictures'
import { isMushroom } from '../src/core/playfield'
import type { Segment } from '../src/core/centipede'

const KNOWN = new Set(STAMPS.map((s) => s.name))

// ── recording fakes (mirrors tests/render.test.ts) ───────────────────────────────
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
    // cp7-1 AC-8: the facing flip blits mirrored sprites through a horizontal
    // mirror (render.ts blit), so the ctx surface grew these two.
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

async function loadSegmentStamp(): Promise<(pic: number) => string> {
  const mod = (await import('../src/shell/render')) as Record<string, unknown>
  if (typeof mod.segmentStamp !== 'function') {
    throw new Error(
      'render.ts has no `segmentStamp(pic)` — GREEN (Julia) adds it (HEAD<pic&0x0F>, the shared ' +
        'motion-object pool) and draws state.segs in render(); explosion pics 0xFA-0xFF reuse ' +
        'HEADA-F (CT-44, no new pixels).',
    )
  }
  return mod.segmentStamp as (pic: number) => string
}

const seg = (h: number, v: number, pic: number): Segment => ({ h, v, dh: 2, dv: 2, pic })

describe('cp2-5 render — segmentStamp maps MOBJP to the HEAD0-F pool (CT-44)', () => {
  const cases: ReadonlyArray<[number, string]> = [
    [0x03, 'HEAD3'], // head
    [0x00, 'HEAD0'], // head
    [0x42, 'HEAD2'], // body (0x42 & 0x0F = 2)
    [0x47, 'HEAD7'], // alternate body
    [0x23, 'HEAD3'], // poisoned head (poison bit + head dir 3)
    [0xff, 'HEADF'], // explosion start (reused stamp — no new pixels)
    [0xfa, 'HEADA'], // explosion end frame
  ]
  it.each(cases)('pic 0x%s -> %s (a real cp1-3 stamp)', async (pic, name) => {
    const segmentStamp = await loadSegmentStamp()
    expect(segmentStamp(pic)).toBe(name)
    expect(KNOWN.has(segmentStamp(pic)), 'the stamp exists in cp1-3 STAMPS — no new pixels').toBe(true)
  })
})

describe('cp2-5 render — the train is drawn (one blit per live segment)', () => {
  it('blits every live segment from the atlas, on top of the mushrooms + gun', () => {
    const c = makeCtx()
    const a = makeAtlas()
    const state = withSegs(0x0abc, [
      seg(0x80, 0xf8, 0x03), // head
      seg(0x78, 0xf8, 0x42), // body
      seg(0x70, 0xe0, 0x47), // body, a row down
    ])
    const s2 = state as SimExt
    const mushrooms = Array.from(s2.playfield.cells).filter(isMushroom).length
    render(c.ctx, a.atlas, state)
    // mushrooms + gun (1) + the 3 live segments, at minimum.
    expect(c.drawImageCount(), 'one drawImage per mushroom + gun + each segment').toBeGreaterThanOrEqual(
      mushrooms + 1 + 3,
    )
    expect(a.requested, 'the head stamp is requested').toContain('HEAD3')
    expect(a.requested, 'a body stamp is requested').toContain('HEAD2')
  })

  // cp7-1 AC-6 CORRECTION: this asserted the exploding segment reuses 'HEADF'
  // "(CT-44)". It does not. CENPIC carries dedicated EXPLD0-5 explosion sprites
  // and CENIR4.MAC:352-353 (`CMP I,30 / BCS 33$`) branches away from the
  // `AND I,0F` for an explosion, so picture 0xFF draws EXPLD5. CT-44's "no new
  // pixels" is true of HEAD/BODY sharing one pool — it was over-extended to the
  // explosion here, and that is what put the wrong sprite on the screen.
  it('draws an EXPLODING segment with the dedicated explosion stamp — a rested/vacant slot is NOT drawn', () => {
    const c = makeCtx()
    const a = makeAtlas()
    // One exploding segment (0xFF) and one rested/finished slot (0xF9, vacant).
    const state = withSegs(0x0abc, [seg(0x80, 0x80, 0xff), seg(0x60, 0x80, 0xf9)])
    // Clear mushrooms so only the segments drive the segment-region requests.
    ;(state as SimExt).playfield.cells.fill(0)
    render(c.ctx, a.atlas, state)
    expect(a.requested, 'the exploding segment draws EXPLD5, the dedicated sprite').toContain('EXPLD5')
    expect(a.requested, 'and NOT the head stamp it used to borrow').not.toContain('HEADF')
    expect(a.requested.every((n) => KNOWN.has(n)), 'every requested stamp is a real cp1-3 STAMP').toBe(true)
    // A finished/rested slot (0xF9) is vacant and must NOT be blitted.
    expect(a.requested, 'a rested 0xF9 slot is not drawn (HEAD9 not requested for it)').not.toContain('HEAD9')
  })
})
