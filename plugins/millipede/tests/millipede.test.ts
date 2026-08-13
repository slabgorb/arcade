// tests/millipede.test.ts
//
// Story ml3-1 — RED phase (O'Brien / TEA). The millipede train, as a pure
// src/core reducer: CENTPC init (MILLI.MAC:498), MOTION per-frame stepping
// (MILLI.MAC:1444), and NEWHD the fresh-head factory (MLSUB.MAC:775). Every
// transcribed constant below is cited in
// docs/rom-study/claims/09-millipede-train.json (MT-1..MT-32), byte-verified by
// tools/audit/check-citations.mjs against the vendored 1982 source.
//
// ─── THE MODEL — the ONE thing millipede does differently from centipede ─────────
// A segment is one motion-object slot (NCENT=12., MLDEF.MAC:188). Positions are
// ROM pixel coords: V=0xF8 is the TOP of the screen, V near 8 the bottom player
// row (V DECREASES downward, so a positive dv DESCENDS — MT-23, upright SBC MOBJDV).
//
// Unlike Centipede — which packs head/body/poison/vacant into BITS of the picture
// byte — Millipede's discriminator is the COLOUR byte MOBJC (MT-2), and MOBJP is
// purely the leg-animation frame (0-7, MT-3/17/18):
//   MOBJC == 0x00  → VACANT slot   (MOTION skips it, BEQ 5$ — MT-2)
//   MOBJC == 0x39  → HEAD          (CMP I,39 — MT-5)
//   MOBJC == 0x3D  → BODY          (CMP I,3D — MT-6)
//   MOBJC == 0x1B  → POISONED head (CMP I,1B — MT-7; poison arrives from the
//                                   mushroom field, ml3-3, so it is NOT exercised here)
// Reading this model wrong — testing a MOBJP bit like centipede — pins the wrong
// field and would let a colour-blind step ship green (the renderer-migration trap:
// pin the observable output, not the routing).
//
// ─── SCOPE (ml3-1 = the train in FREE SPACE) ─────────────────────────────────────
// MOTION in the ROM also calls OBSTA0/OBSTAC (the mushroom field — ml3-3), DDTEXP
// (DDT clouds — ml4), PLAY (player collision — ml3-2) and OVRLAP (the split — ml3-2).
// None of those subsystems exist yet, so ml3-1 pins the FREE-SPACE motion only:
// the horizontal coast-march (MT-24), the leg animation (MT-17/18), the last-head
// speed-up, the descent + reversal at cell-phase 4 (MT-23/25), the body-follow
// (MT-20) and the screen-edge turn (MT-21/22). Poison, mushroom-turn, DDT, player
// collision and the split are explicitly deferred (see the story Delivery Findings).
// Cocktail is out of scope (CKF8/CKFE/CKFF = 0 upright), so the port drops the flips.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// src/core/millipede.ts does not exist. loadMillipede() dynamic-imports it and
// throws a self-describing "not built yet" so every test reddens for the FEATURE's
// absence, never a module-resolution stack trace. The purity sweep in
// tests/purity.test.ts is armed-but-dormant and auto-activates the moment this
// module lands, so it need not be re-pinned here.

import { describe, it, expect } from 'vitest'
import { createRng, type Rng } from '@shared/rng'

// ─── the ROM constants this story transcribes (claims 09 — hand-mirrored so the
//     expectations are self-checking, not echoes of the module) ─────────────────
const NCENT = 12 // MT-1 (MLDEF.MAC:188 "NCENT =12." decimal)
const SEGMENT_PIC_MAX = 0x08 // MT-3 (MILLI.MAC:1457 "CMP I,08" — MOBJP < 8 ⇒ a segment)
const HEAD_PIC = 0x03 // MT-4 (MILLI.MAC:520 "LDA I,03" ;HEAD PICTURE)
const HEAD_COLOR = 0x39 // MT-5 (MILLI.MAC:542 "LDA I,39")
const BODY_COLOR = 0x3d // MT-6 (MILLI.MAC:600 "LDA I,3D")
const POISON_COLOR = 0x1b // MT-7 (MILLI.MAC:1508 "CMP I,1B")
const VACANT_COLOR = 0x00 // MT-2 (MILLI.MAC:1455 "BEQ 5$ ;IF EMPTY ENTRY")
const ENTER_V = 0xf8 // MT-8 (MILLI.MAC:537 "LDA I,0F8")
const ENTER_H = 0x80 // MT-9 (MILLI.MAC:540 "LDA I,80")
const SEG_SPACING = 8 // MT-10 (MILLI.MAC:593/596 the ±8 body offset)
const LEG_ANIM_MASK = 0x07 // MT-18 (MILLI.MAC:1469 "AND I,7")
const LEFT_EDGE = 0xf0 // MT-21 (MILLI.MAC:1511 "CMP I,0F0")
const RIGHT_EDGE = 0x10 // MT-22 (MILLI.MAC:1519 "CMP I,10")
const REVERSAL_PHASE = 0x04 // MT-25 (MILLI.MAC:1619 "CMP I,04")
const BODY_FOLLOW_GAP = 0x08 // MT-20 (MILLI.MAC:1504 "CMP I,08")

// wave cadence (MILLI.MAC:504-519)
const CENTIS_DEC_GATE = 0x03 // MT-14 (MILLI.MAC:506 "BCC 5$ ;IF CENTIS < 3")
const CENTIN_RELOAD = 0x0c // MT-15 (MILLI.MAC:511 "LDA I,0C")
const CENTIS_FAST_SCORE2 = 0x02 // MT-16 (MILLI.MAC:517 "AFTER 20000" — SCORE2 >= 2; centipede is 4)
const CENTIS_FAST = 0x02 // MT-16 (MILLI.MAC:518 "LDA I,2")
const CENTIS_SLOW = 0x01 // MT-16 (MILLI.MAC:514 "LDA I,1")

// NEWHD (MLSUB.MAC:775)
const NEWHD_HEAD_PIC = 0x00 // MT-27 (MLSUB.MAC:796 "LDA I,0" ;MAKE HEAD PICTURE) — plain, NOT CENTPC's 0x03
const NEWHD_SPAWN_V = 0x40 // MT-28 (MLSUB.MAC:800 "LDA I,40")
const NEWHD_SPAWN_DV = 0x02 // MT-29 (MLSUB.MAC:806 "ORA I,2")
const NEWHD_SIDE_A_H = 0xfc // MT-29 (MLSUB.MAC:803 "LDA I,0FC") — RND0 bit1 SET side
const NEWHD_SIDE_A_DH = 0x02 // MT-29
const NEWHD_SIDE_B_H = 0x04 // MT-30 (MLSUB.MAC:817 "LDA I,4") — RND0 bit1 CLEAR side
const NEWHD_SIDE_B_DH = -2 // MT-30 (MLSUB.MAC:819 "LDA I,-2")
const COUNT3_FLOOR = 0x60 // MT-32 (MLSUB.MAC:809 "CMP I,60")
const COUNT3_STEP = 0x08 // MT-31 (MLSUB.MAC:811 "SBC I,8")

// ─── the contract GREEN (Julia) implements (src/core/millipede.ts) ───────────────

/** One millipede segment = one motion-object slot. */
interface Segment {
  h: number // MOBJH pixel
  v: number // MOBJV pixel (0xF8 top -> ~8 bottom; V DECREASES downward)
  dh: number // MOBJDH signed horizontal step (H += dh each frame)
  dv: number // MOBJDV signed vertical step (>0 DESCENDS, V -= dv on a drop)
  pic: number // MOBJP leg-animation frame 0-7 (< 8 marks a segment)
  color: number // MOBJC — the head/body/vacant discriminator (0 / 0x39 / 0x3D / 0x1B)
}

interface CreateOpts {
  /** initial MOBJDH sign (ROM: RND0&2 in play; special attract forces right). */
  headingSign?: 1 | -1
  /** connected length (default NCENT — the full boot train). */
  centin?: number
  /** per-frame step magnitude CENTIS (default CENTIS_FAST). */
  centis?: number
  /** required ONLY when centin < NCENT (the loose-head fill draws seeded RND0 bytes — a
   *  direction byte plus a rejection-sampled HPOS, so one-or-more bytes per loose head). */
  rng?: Rng
}

interface MillipedeModule {
  NCENT: number
  SEGMENT_PIC_MAX: number
  HEAD_PIC: number
  HEAD_COLOR: number
  BODY_COLOR: number
  POISON_COLOR: number
  VACANT_COLOR: number
  ENTER_V: number
  ENTER_H: number
  SEG_SPACING: number
  LEG_ANIM_MASK: number
  LEFT_EDGE: number
  RIGHT_EDGE: number
  REVERSAL_PHASE: number
  BODY_FOLLOW_GAP: number
  CENTIS_DEC_GATE: number
  CENTIN_RELOAD: number
  CENTIS_FAST_SCORE2: number
  CENTIS_FAST: number
  CENTIS_SLOW: number
  NEWHD_HEAD_PIC: number
  NEWHD_SPAWN_V: number
  NEWHD_SPAWN_DV: number
  NEWHD_SIDE_A_H: number
  NEWHD_SIDE_A_DH: number
  NEWHD_SIDE_B_H: number
  NEWHD_SIDE_B_DH: number
  COUNT3_FLOOR: number
  COUNT3_STEP: number
  /** CENTPC (MILLI.MAC:498): re-lay the train — one head at (0x80,0xF8) colour
   *  0x39 pic 0x03, `centin-1` bodies spaced 8px behind at colour 0x3D, all one
   *  heading. Slots centin..NCENT-1 are LOOSE independent heads (colour 0x39,
   *  pic 0, dv 2), each placed by two seeded RND0 reads — so `rng` is required
   *  only when centin < NCENT; the full boot train draws no entropy. */
  createMillipede: (opts?: CreateOpts) => Segment[]
  /** CENTPC's per-wave length/speed walk (MILLI.MAC:504-519): CENTIS<3 changes
   *  nothing; otherwise CENTIN decrements (reloading to 0x0C at zero) and CENTIS
   *  resets to 2 once SCORE2>=2 (after 20000), else 1. */
  stepWaveCadence: (centin: number, centis: number, score2: number) => { centin: number; centis: number }
  /** MOTION (MILLI.MAC:1444): step every live segment one FREE-SPACE frame —
   *  leg animation, last-head speed-up, coast-march, descent + reversal at
   *  cell-phase 4, body-follow, screen-edge turn. Reads no mushroom field yet
   *  (ml3-3 extends it). `frame` drives the leg animation (FRAME&1). */
  stepMillipede: (segs: Segment[], frame: number) => Segment[]
  /** NEWHD (MLSUB.MAC:775): mint one fresh head into the player zone. `sideBitSet`
   *  is RND0 bit 1 — set ⇒ side A (H=0xFC, DH=+2), clear ⇒ side B (H=0x04, DH=-2).
   *  The spawn timer COUNT3 ramps down by 8 to a 0x60 floor; count1 = the new count3. */
  newMillipedeHead: (
    sideBitSet: boolean,
    count3: number,
  ) => { seg: Segment; count1: number; count3: number }
}

// A NON-LITERAL specifier + @vite-ignore so tsc does not resolve it: the absent
// module must surface as a clean per-test RED (loadMillipede throws), never a
// repo-wide TS2307 that reddens `npm run lint` for every unrelated file.
const MILLIPEDE_SPECIFIER = '../src/core/millipede'

async function loadMillipede(): Promise<MillipedeModule> {
  try {
    const mod = (await import(/* @vite-ignore */ MILLIPEDE_SPECIFIER)) as Partial<MillipedeModule>
    if (
      typeof mod.createMillipede !== 'function' ||
      typeof mod.stepMillipede !== 'function' ||
      typeof mod.newMillipedeHead !== 'function' ||
      typeof mod.stepWaveCadence !== 'function'
    ) {
      throw new Error('module is missing createMillipede / stepMillipede / newMillipedeHead / stepWaveCadence')
    }
    return mod as MillipedeModule
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e)
    throw new Error(
      'millipede train core not built yet — GREEN (Julia) creates src/core/millipede.ts ' +
        'exporting the constants above + createMillipede (CENTPC init), stepWaveCadence ' +
        '(the per-wave length/speed walk), stepMillipede (MOTION one FREE-SPACE frame) and ' +
        'newMillipedeHead (NEWHD). The head/body/vacant discriminator is the COLOUR byte ' +
        'MOBJC (0 / 0x39 / 0x3D), NOT a bit of MOBJP — MOBJP is the leg-animation frame 0-7. ' +
        'Every constant is cited in docs/rom-study/claims/09-millipede-train.json (MT-*). ' +
        `(${detail})`,
    )
  }
}

// ─── helpers keyed on the COLOUR discriminator (the millipede model, MT-2) ───────
const isHead = (s: Segment) => s.color === HEAD_COLOR
const isVacant = (s: Segment) => s.color === VACANT_COLOR

/** Run stepMillipede `n` times, tracking the min V (deepest descent) per slot. */
function run(
  mod: MillipedeModule,
  segs: Segment[],
  n: number,
  frame0 = 0,
): { segs: Segment[]; minV: number[] } {
  const minV = segs.map((s) => s.v)
  let cur = segs
  for (let f = 0; f < n; f++) {
    cur = mod.stepMillipede(cur, frame0 + f)
    cur.forEach((s, i) => {
      if (s.v < minV[i]) minV[i] = s.v
    })
  }
  return { segs: cur, minV }
}

// ═══════════════════════════════════════════════════════════════════════════════
describe('ml3-1 constants — exported exactly as transcribed (MT-1..MT-32)', () => {
  it('the whole cited constant set matches the byte-verified claims', async () => {
    const m = await loadMillipede()
    expect(m.NCENT).toBe(NCENT)
    expect(m.SEGMENT_PIC_MAX).toBe(SEGMENT_PIC_MAX)
    expect(m.HEAD_PIC).toBe(HEAD_PIC)
    expect(m.HEAD_COLOR).toBe(HEAD_COLOR)
    expect(m.BODY_COLOR).toBe(BODY_COLOR)
    expect(m.POISON_COLOR).toBe(POISON_COLOR)
    expect(m.VACANT_COLOR).toBe(VACANT_COLOR)
    expect(m.ENTER_V).toBe(ENTER_V)
    expect(m.ENTER_H).toBe(ENTER_H)
    expect(m.SEG_SPACING).toBe(SEG_SPACING)
    expect(m.LEG_ANIM_MASK).toBe(LEG_ANIM_MASK)
    expect(m.LEFT_EDGE).toBe(LEFT_EDGE)
    expect(m.RIGHT_EDGE).toBe(RIGHT_EDGE)
    expect(m.REVERSAL_PHASE).toBe(REVERSAL_PHASE)
    expect(m.BODY_FOLLOW_GAP).toBe(BODY_FOLLOW_GAP)
    expect(m.CENTIS_DEC_GATE).toBe(CENTIS_DEC_GATE)
    expect(m.CENTIN_RELOAD).toBe(CENTIN_RELOAD)
    expect(m.CENTIS_FAST_SCORE2).toBe(CENTIS_FAST_SCORE2)
    expect(m.CENTIS_FAST).toBe(CENTIS_FAST)
    expect(m.CENTIS_SLOW).toBe(CENTIS_SLOW)
    expect(m.NEWHD_HEAD_PIC).toBe(NEWHD_HEAD_PIC)
    expect(m.NEWHD_SPAWN_V).toBe(NEWHD_SPAWN_V)
    expect(m.NEWHD_SPAWN_DV).toBe(NEWHD_SPAWN_DV)
    expect(m.NEWHD_SIDE_A_H).toBe(NEWHD_SIDE_A_H)
    expect(m.NEWHD_SIDE_A_DH).toBe(NEWHD_SIDE_A_DH)
    expect(m.NEWHD_SIDE_B_H).toBe(NEWHD_SIDE_B_H)
    expect(m.NEWHD_SIDE_B_DH).toBe(NEWHD_SIDE_B_DH)
    expect(m.COUNT3_FLOOR).toBe(COUNT3_FLOOR)
    expect(m.COUNT3_STEP).toBe(COUNT3_STEP)
  })

  it('the head/body/poison colours are all DISTINCT (the discriminator must actually discriminate)', async () => {
    const m = await loadMillipede()
    const colours = [m.HEAD_COLOR, m.BODY_COLOR, m.POISON_COLOR, m.VACANT_COLOR]
    expect(new Set(colours).size, 'head/body/poison/vacant colours collide').toBe(4)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('ml3-1 CENTPC — the boot train enters (MT-1/4/5/6/8/9/10)', () => {
  it('lays exactly NCENT (12) segments across the top row (V=0xF8), all alive', async () => {
    const m = await loadMillipede()
    const segs = m.createMillipede({ headingSign: -1 })
    expect(segs).toHaveLength(NCENT)
    for (const s of segs) {
      expect(s.v, 'the whole train enters along the top row (MT-8)').toBe(ENTER_V)
      expect(isVacant(s), 'every segment is alive at wave start (MOBJC != 0)').toBe(false)
    }
  })

  it('slot 0 is the sole HEAD at (0x80,0xF8) — colour 0x39, picture 0x03 (MT-4/5/9)', async () => {
    const m = await loadMillipede()
    const segs = m.createMillipede({ headingSign: -1 })
    expect(segs[0].h, 'head enters at HPOS 0x80 (MT-9)').toBe(ENTER_H)
    expect(segs[0].v, 'head enters at VPOS 0xF8 (MT-8)').toBe(ENTER_V)
    expect(segs[0].color, 'the head colour is 0x39 (MT-5)').toBe(HEAD_COLOR)
    expect(segs[0].pic, 'CENTPC seeds the head picture at 0x03 (MT-4)').toBe(HEAD_PIC)
    expect(segs.filter(isHead), 'the boot train has exactly one head; the rest are body').toHaveLength(1)
  })

  it('the 11 bodies are colour 0x3D, spaced 8px, leg-anim pictures cycling 2,1,0,7…(MT-6/10/11/12)', async () => {
    const m = await loadMillipede()
    const segs = m.createMillipede({ headingSign: -1 })
    const bodies = segs.slice(1)
    for (const b of bodies) {
      expect(b.color, 'bodies are colour 0x3D (MT-6)').toBe(BODY_COLOR)
      expect(b.pic, 'a body picture is a valid leg-anim frame < 8 (MT-3)').toBeGreaterThanOrEqual(0)
      expect(b.pic, 'a body picture is a valid leg-anim frame < 8 (MT-3)').toBeLessThan(SEGMENT_PIC_MAX)
    }
    // MT-11/12: CENTPC seeds the first body picture at 2 (:580 "LDY I,2") then
    // DECREMENTS it per body, reloading to 7 on underflow (:602-604 "DEY / BPL /
    // LDY I,7") — the exact ROM cycle for 11 bodies is 2,1,0,7,6,5,4,3,2,1,0.
    // (The earlier "2..7" range was a misread of this cited claim: the ROM does
    // emit 0 and 1. Corrected in ml3-1 GREEN; see the session Delivery Findings.)
    expect(bodies.map((b) => b.pic), 'the ROM leg-anim seed cycle 2,1,0,7,… (MT-11/12)').toEqual([
      2, 1, 0, 7, 6, 5, 4, 3, 2, 1, 0,
    ])
    for (let i = 1; i < segs.length; i++) {
      expect(Math.abs(segs[i].h - segs[i - 1].h), `slot ${i} sits 8px from slot ${i - 1} (MT-10)`).toBe(SEG_SPACING)
    }
    // one consistent trailing direction, all heading the same way (bodies copy the head)
    const sign = Math.sign(segs[1].h - segs[0].h)
    for (let i = 1; i < segs.length; i++) {
      expect(Math.sign(segs[i].h - segs[i - 1].h), 'the train trails in one direction').toBe(sign)
    }
    for (const s of segs) expect(Math.sign(s.dh), 'every segment carries the head heading').toBe(Math.sign(segs[0].dh))
  })

  it('the step magnitude is CENTIS on both axes; heading follows headingSign (MT-13)', async () => {
    const m = await loadMillipede()
    const right = m.createMillipede({ headingSign: 1, centis: CENTIS_FAST })
    const left = m.createMillipede({ headingSign: -1, centis: CENTIS_FAST })
    expect(right[0].dv, 'dv magnitude is CENTIS').toBe(CENTIS_FAST)
    expect(Math.abs(right[0].dh), 'dh magnitude is CENTIS').toBe(CENTIS_FAST)
    expect(Math.sign(right[0].dh), 'headingSign +1 heads one way').toBe(1)
    expect(Math.sign(left[0].dh), 'headingSign -1 heads the other').toBe(-1)
  })

  it('the wave-1 boot train (centin=NCENT) is PURE and seed-free — two calls are identical', async () => {
    const m = await loadMillipede()
    expect(m.createMillipede({ headingSign: -1 })).toEqual(m.createMillipede({ headingSign: -1 }))
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('ml3-1 CENTPC — the loose-head fill for a short train (MT-2, seeded)', () => {
  it('a short train (centin < NCENT) still fills to NCENT slots, the extras being loose HEADS', async () => {
    const m = await loadMillipede()
    const segs = m.createMillipede({ headingSign: -1, centin: 8, rng: createRng(1) })
    expect(segs).toHaveLength(NCENT)
    const connectedHeads = 1
    const looseHeads = NCENT - 8
    expect(segs.filter(isHead), 'connected head + one loose head per vacated slot').toHaveLength(connectedHeads + looseHeads)
  })

  it('each loose head is colour 0x39, picture 0, dv 2, entering within (0x10, 0xF8)', async () => {
    const m = await loadMillipede()
    const segs = m.createMillipede({ headingSign: -1, centin: 8, rng: createRng(7) })
    for (const s of segs.slice(8)) {
      expect(s.color, 'a loose head is colour 0x39').toBe(HEAD_COLOR)
      expect(s.pic, 'a loose head picture is 0 (MT-27 idiom)').toBe(0)
      expect(s.dv, 'a loose head descends at dv 2').toBe(2)
      expect(s.h, 'a loose head HPOS is not off the left edge (rejects >= 0xF8)').toBeLessThan(0xf8)
      expect(s.h, 'a loose head HPOS is not off the right edge (rejects < 0x10)').toBeGreaterThanOrEqual(RIGHT_EDGE)
    }
  })

  it('the fill is SEEDED and replayable: same seed → identical, and a fill without an rng throws', async () => {
    const m = await loadMillipede()
    const a = m.createMillipede({ headingSign: -1, centin: 8, rng: createRng(42) })
    const b = m.createMillipede({ headingSign: -1, centin: 8, rng: createRng(42) })
    expect(a).toEqual(b)
    expect(() => m.createMillipede({ headingSign: -1, centin: 8 }), 'a fragmented train needs a seeded rng').toThrow()
  })

  it('clamps an out-of-range centin so the train is ALWAYS exactly NCENT slots (ROM domain 1..NCENT)', async () => {
    const m = await loadMillipede()
    // The ROM's CENTIN only ever holds 1..NCENT (it decrements to 1 then reloads
    // to 0x0C, MT-14/15). A degenerate centin (0, negative, or > NCENT) must not
    // break the "always NCENT segments" contract every consumer relies on.
    for (const centin of [-1, 0, 1, NCENT, NCENT + 3]) {
      const segs = m.createMillipede({ headingSign: -1, centin, rng: createRng(3) })
      expect(segs, `centin=${centin} still lays exactly NCENT slots`).toHaveLength(NCENT)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('ml3-1 MOTION — the horizontal coast-march (MT-24)', () => {
  it('marches every segment by dh each frame with V unchanged on a clear top row', async () => {
    const m = await loadMillipede()
    const segs = m.createMillipede({ headingSign: -1 }) // 12 live segs ⇒ no last-head speed-up
    const dh = segs[0].dh
    const start = segs.map((s) => ({ h: s.h, v: s.v }))
    const N = 10 // small enough that no segment reaches a screen edge
    const { segs: after } = run(m, segs, N)
    after.forEach((s, i) => {
      expect(s.v, `slot ${i} does not descend on a clear top-row march`).toBe(start[i].v)
      expect(s.h, `slot ${i} advanced by dh*N horizontally (coast-march)`).toBe((start[i].h + dh * N) & 0xff)
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('ml3-1 MOTION — the leg animation (MT-17/18)', () => {
  it('advances MOBJP by one on EVEN frames and wraps it mod 8, holding on ODD frames', async () => {
    const m = await loadMillipede()
    const head = (): Segment => ({ h: ENTER_H, v: ENTER_V, dh: 1, dv: 1, pic: HEAD_PIC, color: HEAD_COLOR })

    // FRAME bit 0 clear (even) → legs move: 0x03 -> 0x04
    const even = m.stepMillipede([head()], 0)
    expect(even[0].pic, 'even frame advances the leg picture (MT-17)').toBe(HEAD_PIC + 1)

    // FRAME bit 0 set (odd) → "SLOW DOWN LEGS", picture unchanged
    const odd = m.stepMillipede([head()], 1)
    expect(odd[0].pic, 'odd frame holds the leg picture (BNE 7$, MT-17)').toBe(HEAD_PIC)

    // wrap mod 8: pic 7 -> 0
    const hi: Segment = { ...head(), pic: 7 }
    const wrapped = m.stepMillipede([hi], 0)
    expect(wrapped[0].pic, 'the leg picture wraps mod 8 (AND I,7, MT-18)').toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('ml3-1 MOTION — the screen-edge turn (MT-21/22/23/25)', () => {
  it('a head marching into the LEFT edge (H>=0xF0) drops a row and reverses', async () => {
    const m = await loadMillipede()
    const head: Segment = { h: 0xea, v: ENTER_V, dh: 1, dv: 1, pic: HEAD_PIC, color: HEAD_COLOR }
    const { segs: after, minV } = run(m, [head], 40)
    expect(Math.sign(after[0].dh), 'reversed horizontal direction at the edge (MT-25)').toBe(-Math.sign(head.dh))
    expect(minV[0], 'dropped at least one row (descended, MT-23)').toBeLessThan(ENTER_V)
    expect(after[0].h, 'never marched past the 0xF0 edge').toBeLessThanOrEqual(LEFT_EDGE + SEG_SPACING)
  })

  it('a head marching into the RIGHT edge (H<0x10) drops a row and reverses', async () => {
    const m = await loadMillipede()
    const head: Segment = { h: 0x16, v: ENTER_V, dh: -1, dv: 1, pic: HEAD_PIC, color: HEAD_COLOR }
    const { segs: after, minV } = run(m, [head], 40)
    expect(Math.sign(after[0].dh), 'reversed horizontal direction at the edge (MT-25)').toBe(-Math.sign(head.dh))
    expect(minV[0], 'dropped at least one row (descended, MT-23)').toBeLessThan(ENTER_V)
    expect(after[0].h, 'never marched past the 0x10 edge').toBeGreaterThanOrEqual(RIGHT_EDGE - SEG_SPACING)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('ml3-1 MOTION — the last-head speed-up', () => {
  it('when only ONE live segment remains, its dh/dv magnitude is forced to 2 (sign preserved)', async () => {
    const m = await loadMillipede()
    const lone: Segment = { h: ENTER_H, v: ENTER_V, dh: 1, dv: 1, pic: HEAD_PIC, color: HEAD_COLOR }
    const after = m.stepMillipede([lone], 0)
    expect(Math.abs(after[0].dh), 'last head speeds up horizontally to 2').toBe(2)
    expect(Math.abs(after[0].dv), 'last head speeds up vertically to 2').toBe(2)
    expect(Math.sign(after[0].dh), 'the heading sign is preserved').toBe(1)
  })

  it('does NOT speed up while more than one segment is live', async () => {
    const m = await loadMillipede()
    const segs: Segment[] = [
      { h: ENTER_H, v: ENTER_V, dh: 1, dv: 1, pic: HEAD_PIC, color: HEAD_COLOR },
      { h: ENTER_H + SEG_SPACING, v: ENTER_V, dh: 1, dv: 1, pic: 2, color: BODY_COLOR },
    ]
    const after = m.stepMillipede(segs, 1) // odd frame so leg-anim doesn't confound
    expect(Math.abs(after[0].dh), 'two live segments ⇒ no speed-up').toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('ml3-1 MOTION — the body follows the head (MT-20)', () => {
  it('a body a full cell BEHIND its leader in V descends to follow', async () => {
    const m = await loadMillipede()
    const segs: Segment[] = [
      { h: ENTER_H, v: 0xf0, dh: 1, dv: 1, pic: HEAD_PIC, color: HEAD_COLOR }, // leader one row down
      { h: ENTER_H - SEG_SPACING, v: ENTER_V, dh: 1, dv: 1, pic: 2, color: BODY_COLOR }, // |dV| = 8
    ]
    const { minV } = run(m, segs, 12)
    expect(minV[1], 'the trailing body descends to follow the leader (|dV|>=8, MT-20)').toBeLessThan(ENTER_V)
  })

  it('a body LEVEL with its leader (|dV|=0) marches flat — no descent', async () => {
    const m = await loadMillipede()
    const segs: Segment[] = [
      { h: ENTER_H, v: ENTER_V, dh: 1, dv: 1, pic: HEAD_PIC, color: HEAD_COLOR },
      { h: ENTER_H - SEG_SPACING, v: ENTER_V, dh: 1, dv: 1, pic: 2, color: BODY_COLOR },
    ]
    const { segs: after } = run(m, segs, 6)
    expect(after[1].v, 'a body level with its leader marches horizontally').toBe(ENTER_V)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('ml3-1 MOTION — vacant slots & determinism (MT-2)', () => {
  it('a vacant slot (colour 0) is skipped, not stepped', async () => {
    const m = await loadMillipede()
    const dead: Segment = { h: ENTER_H, v: ENTER_V, dh: 1, dv: 1, pic: 0, color: VACANT_COLOR }
    const live: Segment = { h: ENTER_H, v: ENTER_V, dh: 1, dv: 1, pic: HEAD_PIC, color: HEAD_COLOR }
    const after = m.stepMillipede([dead, live], 1)
    expect(after[0].h, 'a vacant slot is not moved').toBe(dead.h)
    expect(after[0].v, 'a vacant slot is not moved').toBe(dead.v)
    expect(after[1].h, 'the live head still marches').not.toBe(live.h)
  })

  it('is deterministic: same init + same frames → identical segments', async () => {
    const m = await loadMillipede()
    const a = run(m, m.createMillipede({ headingSign: -1 }), 120).segs
    const b = run(m, m.createMillipede({ headingSign: -1 }), 120).segs
    expect(a).toEqual(b)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('ml3-1 stepWaveCadence — CENTPC per-wave length/speed walk (MT-14/15/16)', () => {
  it('CENTIS < 3 changes nothing (including CENTIS itself — the reset lives INSIDE the taken branch)', async () => {
    const m = await loadMillipede()
    expect(m.stepWaveCadence(12, 2, 9)).toEqual({ centin: 12, centis: 2 })
  })

  it('CENTIS >= 3 decrements CENTIN and resets CENTIS by the 20000 threshold (SCORE2>=2)', async () => {
    const m = await loadMillipede()
    // below 20000 (SCORE2 < 2) → CENTIS becomes the slow 1
    expect(m.stepWaveCadence(12, 3, 0)).toEqual({ centin: 11, centis: CENTIS_SLOW })
    // at/after 20000 (SCORE2 >= 2) → CENTIS becomes the fast 2
    expect(m.stepWaveCadence(12, 3, 5)).toEqual({ centin: 11, centis: CENTIS_FAST })
  })

  it('a CENTIN that decrements to zero reloads to 0x0C ("LONG CENTI AGAIN", MT-15)', async () => {
    const m = await loadMillipede()
    expect(m.stepWaveCadence(1, 3, 5).centin).toBe(CENTIN_RELOAD)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('ml3-1 NEWHD — the fresh-head factory (MT-27..MT-32)', () => {
  it('side A (RND0 bit1 SET): head enters at (0xFC, 0x40) marching +2, picture 0, colour 0x39', async () => {
    const m = await loadMillipede()
    const { seg } = m.newMillipedeHead(true, 0xc0)
    expect(seg.h).toBe(NEWHD_SIDE_A_H)
    expect(seg.dh).toBe(NEWHD_SIDE_A_DH)
    expect(seg.v).toBe(NEWHD_SPAWN_V)
    expect(seg.dv).toBe(NEWHD_SPAWN_DV)
    expect(seg.pic, 'a fresh head is plain picture 0, NOT CENTPC 0x03 (MT-27)').toBe(NEWHD_HEAD_PIC)
    expect(seg.color).toBe(HEAD_COLOR)
  })

  it('side B (RND0 bit1 CLEAR): the mirror entry — H=0x04 marching -2 (MT-30)', async () => {
    const m = await loadMillipede()
    const { seg } = m.newMillipedeHead(false, 0xc0)
    expect(seg.h).toBe(NEWHD_SIDE_B_H)
    expect(seg.dh).toBe(NEWHD_SIDE_B_DH)
    expect(seg.v, 'the entry row is the same on both sides').toBe(NEWHD_SPAWN_V)
  })

  it('the spawn timer COUNT3 ramps down by 8 while above the 0x60 floor, and count1 = the new count3 (MT-31/32)', async () => {
    const m = await loadMillipede()
    const ramped = m.newMillipedeHead(true, 0xc0)
    expect(ramped.count3, 'above the floor: 0xC0 - 8').toBe(0xc0 - COUNT3_STEP)
    expect(ramped.count1, 'count1 is reloaded from the new count3').toBe(ramped.count3)

    const floored = m.newMillipedeHead(true, 0x5c) // below 0x60 ⇒ held
    expect(floored.count3, 'below the floor: COUNT3 is held, not decremented past 0x60').toBe(0x5c)
    expect(floored.count1).toBe(0x5c)
  })
})
