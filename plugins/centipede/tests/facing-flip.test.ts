// tests/facing-flip.test.ts
//
// Story cp7-1, AC-8 — the direction-derived FACING FLIP. cp7-1's first half fixed
// the flip bits baked into a picture CONSTANT (the PTS sprites). This is the other
// producer of the same hardware bit: the display routine EORs the sign of a motion
// object's horizontal direction into bit 7 of its picture, so an object mirrors to
// face the way it is travelling.
//
// ─── THE ROM RULE, READ OFF THE DISPLAY ROUTINE ──────────────────────────────
// CENIR4.MAC:330-340 and :368, the per-slot display loop (LDX I,15. at :325):
//
//     LDA X,MOBJH
//     LDY I,0          ;LEAVE PICTURE ALONE IF SPIDER OR "100",ETC
//     CPX I,13.
//     BEQ 35$          ; slot 13 -> Y stays 0 -> never mirrored
//     LDY X,MOBJDH
//     BPL 35$          ;IF FACING LEFT      -> dh >= 0 -> not mirrored
//     CLC
//     ADC I,01         ;FACE PICTURE BY CORRECTING HORIZONTAL
//  35$: STA X,HPOS
//     TYA
//     AND I,80         ; the sign bit of MOBJDH...
//     STA TPIRQ2
//     ...
//  33$: EOR TPIRQ2     ; ...EOR'd into the picture at :368
//
// So: mirrored IFF MOBJDH is negative (bit 7 set), for every slot EXCEPT 13, and
// a mirrored object also has its horizontal position incremented by one.
//
// ─── WHICH SLOTS THAT ACTUALLY MOVES, MEASURED ───────────────────────────────
// The setup filing said "segments, flea, scorpion and shot all mirror". Two of
// those four are wrong, and the difference is not stylistic — a test asserting a
// flea flips would pin a behaviour the cabinet does not have. Every write to a
// MOBJDH cell in revision.v4 was enumerated (grep MOBJDH/ANTDH/BUGDH/SHOTDH/
// PLAYDH across *.MAC):
//
//   slots 0-11  segments   CENTI4.MAC:488/507/541/1322/1421/1457/1685 -> +/-CENTIS
//                          MIRRORS. The main observable case.
//   slot 12     flea       CENTI4.MAC:153-154 "LDA I,0 / STA ANTDH ;HDIR"
//                          NEVER mirrors — dh is a hard 0. src/core/flea.ts:139
//                          already models it as exactly that.
//   slot 12     scorpion   CENTI4.MAC:2038-2045 -> -2, +1 or -1 (random)
//                          MIRRORS. The second observable case.
//   slot 13     spider     exempt by the CPX I,13. branch above. This is the same
//                          exemption cp7-1's first half depends on, which is why
//                          the PTS sprites keep the flip bit baked into 0xB6-0xB8.
//   slot 14     shot       SHOTDH is READ NOWHERE and WRITTEN NOWHERE in the whole
//                          revision — it stays 0, so the shot never mirrors.
//   slot 15     player     PLAYDH is written only on the attract path
//                          (CENTI4.MAC:196 and :1172 ";DIRECTION FOR ATTRACT").
//                          The GUN stamp is also symmetric under this axis
//                          (CENPIC.MAC:21 rows 18,30,F2,FF,F2,30,18 — a
//                          palindrome), so a flip there is unobservable either
//                          way. Not wired.
//
// The rule is implemented as the ROM states it — one predicate over dh, applied
// to every slot but the spider — NOT as a list of "segments and scorpions". The
// flea and the shot then decline to mirror because their dh is 0, which is the
// mechanism doing the work rather than a special case (the same principle the
// first half of cp7-1 established for the picture bits).
//
// AUTHORSHIP: these tests were written by Dev, not by TEA in a RED phase — AC-8
// was pulled into this story after the TEA handoff on the user's ruling. They
// were run RED before the implementation existed and the mutation battery below
// the implementation records what they catch.

import { describe, it, expect } from 'vitest'
import { render, mirroredForDh } from '../src/shell/render'
import renderSrc from '../src/shell/render.ts?raw'
import { createSim, type SimState } from '../src/core/sim'
import { gunScreenX } from '../src/shell/layout'
import type { Segment } from '../src/core/centipede'

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

// ── a recording ctx that models the 2D transform, so the assertions do not
//    depend on the order translate/scale happen to be called in ────────────────
interface Draw {
  stamp: string
  /** Left edge of the drawn box in DEVICE space, after the transform. */
  left: number
  top: number
  /** True when the box was painted mirrored about its own vertical axis. */
  mirrored: boolean
}

function makeHarness() {
  const draws: Draw[] = []
  let pending = ''
  let m = { a: 1, d: 1, e: 0, f: 0 }
  const stack: Array<typeof m> = []

  const ctx = {
    imageSmoothingEnabled: true,
    fillStyle: '',
    fillRect() {},
    clearRect() {},
    save() {
      stack.push({ ...m })
    },
    restore() {
      const p = stack.pop()
      if (p) m = p
    },
    translate(x: number, y: number) {
      m = { ...m, e: m.e + m.a * x, f: m.f + m.d * y }
    },
    scale(sx: number, sy: number) {
      m = { ...m, a: m.a * sx, d: m.d * sy }
    },
    drawImage(_img: unknown, ...a: number[]) {
      const [, , , , dx, dy, dw] = a
      const x0 = m.a * dx + m.e
      const x1 = m.a * (dx + dw) + m.e
      draws.push({ stamp: pending, left: Math.min(x0, x1), top: m.d * dy + m.f, mirrored: m.a < 0 })
    },
  }

  const atlas = {
    image: {} as CanvasImageSource,
    rect(name: string) {
      pending = name
      return { sx: 0, sy: 0, sw: 16, sh: 8 }
    },
  }

  return { ctx: ctx as unknown as CanvasRenderingContext2D, atlas, draws }
}

const drawOf = (draws: Draw[], stamp: string): Draw | undefined => draws.find((d) => d.stamp === stamp)

describe('cp7-1 AC-8 — mirroredForDh is the ROM predicate, not a list of entity types', () => {
  const TABLE: ReadonlyArray<readonly [number, boolean, string]> = [
    [-1, true, 'CENTIS negated — the common leftward segment step'],
    [-2, true, 'the scorpion\'s fast leftward step (CENTI4.MAC:2038)'],
    [-128, true, '0x80 — the sign bit itself, the value BPL actually tests'],
    [0, false, 'the flea\'s hard 0 (CENTI4.MAC:153-154) and the never-written SHOTDH'],
    [1, false, 'a rightward step'],
    [2, false, 'the scorpion travelling the other way'],
    [127, false, '0x7F — the largest value with the sign bit still clear'],
  ]

  for (const [dh, want, why] of TABLE) {
    it(`dh=${dh} -> mirrored=${want}  [${why}]`, () => {
      expect(mirroredForDh(dh)).toBe(want)
    })
  }

  it('the boundary is the SIGN BIT, so 0 does not mirror (BPL branches on dh=0)', () => {
    // BPL is "branch if plus", and 0 is plus. A `<= 0` predicate would mirror
    // every flea and every shot in the game; a `< 0` predicate is the ROM's.
    expect(mirroredForDh(0), 'dh=0 must NOT mirror — BPL takes the no-flip branch').toBe(false)
    expect(mirroredForDh(-1)).toBe(true)
  })
})

describe('cp7-1 AC-8 — the renderer mirrors an object to face its travel direction', () => {
  const segAt = (dh: number): Segment => ({ h: 0x40, v: 0x40, dh, dv: 0, pic: 0x03 })
  const withSegs = (segs: Segment[]): SimState =>
    ({ ...(createSim(7) as SimState & { segs: Segment[] }), segs }) as SimState

  it('a segment travelling with dh < 0 is drawn MIRRORED', () => {
    const { ctx, atlas, draws } = makeHarness()
    render(ctx, atlas, withSegs([segAt(-1)]))
    expect(drawOf(draws, 'HEAD3')?.mirrored, 'a leftward segment must face left').toBe(true)
  })

  it('the SAME segment travelling with dh > 0 is drawn UNMIRRORED', () => {
    const { ctx, atlas, draws } = makeHarness()
    render(ctx, atlas, withSegs([segAt(1)]))
    expect(drawOf(draws, 'HEAD3')?.mirrored, 'a rightward segment must not be flipped').toBe(false)
  })

  it('the mirrored segment also takes the ROM’s +1 horizontal correction (:337-338)', () => {
    // "CLC / ADC I,01 ;FACE PICTURE BY CORRECTING HORIZONTAL" — the increment is
    // applied to MOBJH, in the ROM's own horizontal space, so it goes through the
    // same gunScreenX mapping every other position does. gunScreenX is MIRRORED
    // (screen x falls as h rises, layout.ts:92-97), so +1 in ROM h is one pixel
    // LEFT on our screen. Asserting against gunScreenX(h+1) rather than a literal
    // keeps that mapping in one place.
    const flipped = makeHarness()
    render(flipped.ctx, flipped.atlas, withSegs([segAt(-1)]))
    const plain = makeHarness()
    render(plain.ctx, plain.atlas, withSegs([segAt(1)]))

    expect(drawOf(flipped.draws, 'HEAD3')?.left).toBe(gunScreenX(0x40 + 1))
    expect(drawOf(plain.draws, 'HEAD3')?.left).toBe(gunScreenX(0x40))
    expect(
      drawOf(flipped.draws, 'HEAD3')?.left,
      'the correction must actually move the sprite — otherwise it is not implemented',
    ).not.toBe(drawOf(plain.draws, 'HEAD3')?.left)
  })

  it('the SPIDER is exempt whatever else is on screen (CPX I,13. / BEQ 35$)', () => {
    // The exemption cp7-1's first half rests on: if the spider ever picked up a
    // direction-derived flip, the PTS readout this story just corrected would
    // start mirroring again from the other direction.
    const { ctx, atlas, draws } = makeHarness()
    const base = createSim(7) as SimState & { segs: Segment[]; spider: { pic: number; h: number; v: number } }
    const state = { ...base, segs: [segAt(-1)], spider: { ...base.spider, pic: 0x14, h: 0x50, v: 0x30 } } as SimState
    render(ctx, atlas, state)
    expect(drawOf(draws, 'BUG0'), 'the spider must be on screen for this to mean anything').toBeDefined()
    expect(drawOf(draws, 'BUG0')?.mirrored, 'slot 13 is never mirrored').toBe(false)
    expect(drawOf(draws, 'HEAD3')?.mirrored, 'the control: a segment IS mirrored in the same frame').toBe(true)
  })

  it('the GUN and the SHOT never mirror (PLAYDH is attract-only, SHOTDH is never written)', () => {
    const { ctx, atlas, draws } = makeHarness()
    const base = createSim(7) as SimState & { shot: { live: boolean; h: number; v: number } }
    render(ctx, atlas, { ...base, shot: { ...base.shot, live: true, h: 0x30, v: 0x30 } } as SimState)
    expect(drawOf(draws, 'GUN')?.mirrored).toBe(false)
    expect(drawOf(draws, 'SHOT')?.mirrored).toBe(false)
  })

  it('the FLEA does not mirror, because its dh is a hard 0 — not because it is a flea', () => {
    // The distinction the whole mechanism rests on. The flea is fed through the
    // SAME predicate as the segments; it declines to flip on its own data.
    const { ctx, atlas, draws } = makeHarness()
    const base = createSim(7) as SimState & { flea: { pic: number; h: number; v: number; dh: number } }
    render(ctx, atlas, { ...base, flea: { ...base.flea, pic: 0x1c, h: 0x40, v: 0x40, dh: 0 } } as SimState)
    expect(drawOf(draws, 'ANT0'), 'the flea must be drawn for this to mean anything').toBeDefined()
    expect(drawOf(draws, 'ANT0')?.mirrored).toBe(false)
  })

  it('a SCORPION in that same slot DOES mirror when its dh is negative', () => {
    // Same slot, same code path, same predicate — only the data differs. This is
    // the pair that proves the flea's exemption is data-driven.
    const left = makeHarness()
    const base = createSim(7) as SimState & { flea: { pic: number; h: number; v: number; dh: number } }
    render(left.ctx, left.atlas, { ...base, flea: { ...base.flea, pic: 0x30, h: 0x40, v: 0x40, dh: -1 } } as SimState)
    const right = makeHarness()
    render(right.ctx, right.atlas, { ...base, flea: { ...base.flea, pic: 0x30, h: 0x40, v: 0x40, dh: 1 } } as SimState)

    expect(drawOf(left.draws, 'SCORP0')?.mirrored, 'a leftward scorpion faces left').toBe(true)
    expect(drawOf(right.draws, 'SCORP0')?.mirrored, 'a rightward scorpion does not').toBe(false)
  })
})

describe('cp7-1 AC-5 — the transform ban, revisited deliberately', () => {
  // cp2-1 banned canvas transforms in render.ts so the ROT270 could not be
  // applied twice (bake AND render). AC-5 required that ban be revisited on
  // purpose if the fix introduced a transform, rather than left passing because
  // `ctx.scale` happened to be unlisted. AC-8 does introduce one, so:
  //
  //   KEPT   — no rotate, no setTransform, no .transform(. The cp2-1 hazard is
  //            double ROTATION, and none of those three has any business here.
  //   ALLOWED— a horizontal mirror, and ONLY a horizontal mirror.
  //
  // The allowance is narrowed to the exact shape it needs: every scale() in
  // render.ts must be scale(-1, 1). scale(1, -1) would be a vertical flip and
  // scale(-1, -1) is the 180-degree turn CKC0 does — neither is this story's,
  // and both would sail through a bare "scale is allowed now".
  it('render.ts still performs no rotation and sets no transform matrix', () => {
    const code = stripComments(renderSrc)
    expect(code, 'render must not call orientForScreen').not.toMatch(/orientForScreen/)
    expect(code, 'render must not rotate the canvas').not.toMatch(/\.rotate\s*\(/)
    expect(code, 'render must not set a transform matrix').not.toMatch(/setTransform|\.transform\s*\(/)
  })

  it('every scale() in render.ts is a HORIZONTAL mirror — scale(-1, 1) and nothing else', () => {
    const code = stripComments(renderSrc)
    const calls = [...code.matchAll(/\.scale\s*\(([^)]*)\)/g)].map((m) => m[1].replace(/\s+/g, ''))
    expect(calls.length, 'the mirror must actually be implemented with scale()').toBeGreaterThan(0)
    for (const args of calls) {
      expect(args, `render.ts calls scale(${args}) — only a horizontal mirror is sanctioned here`).toBe('-1,1')
    }
  })

  it('the mirror is paired with save/restore so it cannot leak into the next draw', () => {
    // A scale() left in effect would silently mirror every subsequent blit in the
    // frame — the HUD digits included.
    const { ctx, atlas, draws } = makeHarness()
    const segs: Segment[] = [
      { h: 0x40, v: 0x40, dh: -1, dv: 0, pic: 0x03 },
      { h: 0x50, v: 0x40, dh: 1, dv: 0, pic: 0x05 },
    ]
    render(ctx, atlas, { ...(createSim(7) as SimState & { segs: Segment[] }), segs } as SimState)
    expect(drawOf(draws, 'HEAD3')?.mirrored, 'the leftward segment mirrors').toBe(true)
    expect(drawOf(draws, 'HEAD5')?.mirrored, 'the rightward one that follows it must NOT').toBe(false)
    expect(draws.filter((d) => d.mirrored).length, 'exactly one draw in the frame is mirrored').toBe(1)
  })
})
