// tests/spider.test.ts
//
// Story cp3-1 — RED phase (O'Brien / TEA). THE SPIDER (the author's "BUG",
// motion-object slot 13): BUGOFF (CENTI4.MAC:254) initializes it, BUGMV
// (CENTI4.MAC:289) moves it, PLAY (CENTI4.MAC:1775) kills the player on
// contact through the SAME routine cp2-5 built, and SHOOT (CENTI4.MAC:2209)
// scores it by PROXIMITY. Transcribed from rev-4 and pinned by SP-* claims in
// docs/rom-study/claims/10-spider.json.
//
// ─── RADIX ───────────────────────────────────────────────────────────────────
// CENTI4.MAC inherits .RADIX 16 from CENDE4 — every bare literal below is HEX
// unless a trailing period marks it DECIMAL. This story turns on that
// distinction three times, so it is spelled out at every use:
//   :1781 "CMP I,10."  → DECIMAL 10 (the spider's PLAY h-window)
//   :1822 "CMP I,14."  → DECIMAL 14 (the spider's PLAY diamond bound)
//   :2232 "CPY I,10."  → DECIMAL 10 (the spider's SHOOT h-window)
// while the segment's own windows on the same paths are HEX (:1785 "CMP I,07",
// :1798 "CMP I,0C"). Reading either as the other silently mis-sizes the hitbox.
//
// ─── ORIENTATION / SIGN CONVENTIONS ──────────────────────────────────────────
// Upright cabinet: CLEAR (:737-751) zeroes CKF8/CKC0/CK40, so every "EOR CKxx"
// is identity and every "LDY CKC0 / BEQ" takes the non-cocktail branch (cp2-12's
// cited orientation scope). V=0xF8 is the TOP of the screen, V=8 the bottom
// player row — V DECREASES downward, as in cp2-3.
//
// TRAP — the spider's dh sign is INVERTED relative to a centipede segment.
// MOTION marches a segment with "ADC MOBJH" (h += dh, cp2-3's CT-77), but BUGMV
// steps the spider with "SEC / SBC BUGDH" (:343-345, h -= dh) and "SEC / SBC
// BUGDV" (:354-355, v -= dv). A POSITIVE spider dh therefore moves it LEFT.
// Tests below assert the delta, never a screen direction, so the convention is
// pinned rather than assumed.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// src/core/spider.ts does not exist; centipede.ts's checkPlayerContact takes no
// spider; SimState carries no spider. loadCp31() dynamic-imports the new surface
// and throws a self-describing "not built yet", so every assertion reddens for
// the FEATURE's absence rather than a module-resolution stack trace.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRng, nextInt, type Rng } from '@shared/rng'
// src/core/spider.ts exists by the time these run, so the kill timer is imported
// STATICALLY and is genuinely typechecked against the real module — unlike the
// RED-phase loadCp31() scaffolding below, which must stay dynamic so its
// feature-absence message survives.
import { stepSpiderKillTimer } from '../src/core/spider'
import { createPlayfield, PLYFLD_STRIDE, MUSHROOM_FULL, type Playfield } from '../src/core/playfield'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─── ROM constants this story transcribes (hand-mirrored from the source so the
//     expectations are self-checking, not echoes of the module under test) ─────

// BUGOFF (:254-283) — the init/off-screen reset.
const SPIDER_DV_FAST = 2 // :255 "LDY I,2" (hex 2)
const SPIDER_DV_SLOW = 1 // :263 "LDY I,1" (hex 1)
const SPIDER_ENTER_V = 0x60 // :272-274 "LDA I,60 / EOR CKF8 / STA BUGV"
const SPIDER_OFF_H = 0xff // :275-276 "LDA I,0FF / STA BUGH"
const SPIDER_OFF_PIC = 0xf8 // :277-278 "LDA I,0F8 / STA BUGP"
const SPIDER_HIDE_COUNT = 0x60 // :279-280 "LDA I,60 / STA COUNT2"

// BUGMV (:289-434) — the per-frame move.
const SPIDER_PIC_MIN = 0x14 // :311 "LDA I,14" — BUG0, the first of 8 faces
const SPIDER_PIC_LIMIT = 0x1c // :309 "CMP I,1C" — one past BUG7 (0x1B)
const SPIDER_FACE_MASK = 0x03 // :304 "AND I,03" — a face change every 4 frames
const SPIDER_TURN_COUNT = 0x30 // :340-341 "LDA I,30 / STA COUNT2"
const SPIDER_EDGE_LEFT = 0xfb // :322 "CPY I,0FB" — at/above: never clear dh
const SPIDER_EDGE_RIGHT = 0x05 // :324 "CPY I,05" — below: never clear dh
const SPIDER_BOTTOM_V = 9 // :374 "CMP I,9" — v < 9 is the bottom row
const SPIDER_TOP_BASE = 0x60 // :396 "LDA I,60" — the top limit before the score cut
const SPIDER_TOP_STEP = 8 // :392-394 three ASLs — the limit moves in 8s
const SPIDER_TOP_MAX_STEPS = 5 // :391 "LDA I,5" — the clamp past 160K
const SPIDER_SCORE_BIAS = 6 // :384 "SBC I,6" (BCD) — the 60,000-point datum

// PLAY (:1775-1823) — the spider's OWN collision windows.
const SPIDER_PLAY_H_WINDOW = 10 // :1781 "CMP I,10." DECIMAL — hit needs |dH| < 10
const SPIDER_PLAY_V_WINDOW = 7 // :1792 "CMP I,7" (hex) — shared with segments
const SPIDER_PLAY_SUM_WINDOW = 14 // :1822 "CMP I,14." DECIMAL — the diamond bound
const SEG_PLAY_H_WINDOW = 7 // :1785 "CMP I,07" (hex) — the UNCHANGED segment window
const SEG_PLAY_SUM_WINDOW = 0x0c // :1798 "CMP I,0C" (hex) — the UNCHANGED segment bound

// SHOOT vs the spider (:2202, :2232-2263).
const SPIDER_HIT_V_WINDOW = 5 // :2202 "CPY I,5" (hex) — shared with segments
const SPIDER_HIT_H_WINDOW = 10 // :2232 "CPY I,10." DECIMAL
const SPIDER_NEAR_BAND = 0x16 // :2247 "CMP I,16" (hex 22) — below this scores 900
const SPIDER_FAR_BAND = 0x40 // :2243 "CMP I,40" (hex 64) — at/above this scores 300
const SPIDER_KILL_COUNT = 0x80 // :2251-2253 "LDA I,80 / STA COUNT / STA COUNT2"
const SPIDER_PTS_CLAMP_HI = 0xf0 // :2256 "LDA I,0F0" — keep the points display on screen
const SPIDER_PTS_CLAMP_LO = 0x10 // :2259 "LDA I,10"

// The points-display picture codes (:2236 "LDY I,0B6", then two INC PTS at
// :2245/:2249). The mapping is NOT monotonic in score — it is the CENPIC sprite
// ORDER: THREE(0x36), NINE(0x37), SIX(0x38), so 0xB6/0xB7/0xB8 = 300/900/600.
// A Dev who "sorts" these to 300/600/900 draws the wrong number on the screen.
const PTS_300 = 0xb6
const PTS_900 = 0xb7
const PTS_600 = 0xb8

const SPIDER_EXPLODE_PIC = 0xff // :2302 "STA X,MOBJP ;EXPLOSION PICTURE" (shared, CT-41)
const SPIDER_EXPLODE_DONE = 0xf9 // :965-968 EXPLOD's rest picture (shared, CT-44)

// ─── the contract GREEN (Julia) builds ──────────────────────────────────────

interface Segment {
  h: number
  v: number
  dh: number
  dv: number
  pic: number
}

interface Spider {
  h: number
  v: number
  dh: number
  dv: number
  pic: number
  /** COUNT2 (:280/:341/:429) — the direction-change / off-screen down-counter. */
  count2: number
  /** COUNT (:2252) — the post-kill delay before BUGOFF re-arms the spider. */
  count: number
  /** OLDDH (:326/:330) — the h-direction parked while the spider drops straight. */
  oldDh: number
  /** PTS (CENDE4.MAC:221, SP-19) — the points picture this kill will display.
   *  This field was MISSING from the shadow contract until a static import of
   *  the real module surfaced the drift; the previous `as unknown as` casts had
   *  been hiding it. */
  pts: number
}

interface Shot {
  h: number
  v: number
  live: boolean
}

interface StepCtx {
  frame: number
  score: number
  rng: Rng
  /** OPTNS bit 6 — widens the per-turn V-reversal mask (:332-334). */
  easy?: boolean
}

interface Cp31Module {
  /** BUGOFF (:254-283): the spider parked off-screen. `score` picks the V speed
   *  (:256-263) and the rng picks the entry side (:265-270). */
  createSpider: (rng: Rng, score: number, opts?: { easy?: boolean }) => Spider
  /** BUGMV (:289-434): one frame. Returns the stepped spider, whether a mushroom
   *  was eaten this frame, and whether the gun was hit (PLAY, :417). */
  stepSpider: (
    spider: Spider,
    field: Playfield,
    segs: Segment[],
    ctx: StepCtx,
  ) => { spider: Spider; ate: boolean; scored: number }
  /** :380-399 — the score-driven top bound the spider may not rise above. */
  spiderTopLimit: (score: number) => number
  /** PLAY (:1775-1823) — cp2-5's routine, now with the spider's own windows.
   *  The 2-arg segment form MUST keep working (cp2-5's suite calls it). */
  checkPlayerContact: (segs: Segment[], player: { h: number; v: number }, spider?: Spider | null) => boolean
  /** SHOOT's spider branch (:2209-2263): windows, the proximity bands, the PTS
   *  picture, and the on-screen clamp. Returns scored=0 on a miss. */
  resolveSpiderShotHit: (
    shot: Shot,
    spider: Spider,
    player: { h: number; v: number },
  ) => { spider: Spider; shot: Shot; scored: number; hit: boolean }
  /** EXPLOD's spider branch (:972-979): once the explosion reaches its rest
   *  picture the slot flips to the PTS points sprite (player alive only). */
  stepSpiderExplosion: (spider: Spider, playerAlive: boolean) => Spider
}

async function loadCp31(): Promise<Cp31Module> {
  try {
    // The specifier is COMPUTED, not literal: src/core/spider.ts does not exist
    // yet, and a literal import would fail `tsc --noEmit` (a broken build, not a
    // RED test). At runtime this resolves normally once Julia creates the module.
    const spiderModule = ['..', 'src', 'core', 'spider'].join('/')
    const spider = (await import(/* @vite-ignore */ spiderModule)) as Record<string, unknown>
    const cent = (await import('../src/core/centipede')) as Record<string, unknown>
    for (const name of [
      'createSpider',
      'stepSpider',
      'spiderTopLimit',
      'resolveSpiderShotHit',
      'stepSpiderExplosion',
    ]) {
      if (typeof spider[name] !== 'function') throw new Error(`spider.ts has no ${name}`)
    }
    if (typeof cent.checkPlayerContact !== 'function') throw new Error('centipede.ts has no checkPlayerContact')
    // Probe BEHAVIOURALLY, not by Function.length: an optional parameter written
    // with a default (`spider = null`) reports length 2, so an arity check would
    // reject a perfectly correct implementation. A spider sitting exactly on the
    // gun must register as contact once the 3rd parameter is honoured.
    const probe = cent.checkPlayerContact as Cp31Module['checkPlayerContact']
    if (probe([], { h: 0x80, v: 0x10 }, stage({ h: 0x80, v: 0x10 })) !== true) {
      throw new Error('checkPlayerContact does not yet honour the spider (3rd parameter)')
    }
    return {
      createSpider: spider.createSpider as Cp31Module['createSpider'],
      stepSpider: spider.stepSpider as Cp31Module['stepSpider'],
      spiderTopLimit: spider.spiderTopLimit as Cp31Module['spiderTopLimit'],
      checkPlayerContact: cent.checkPlayerContact as Cp31Module['checkPlayerContact'],
      resolveSpiderShotHit: spider.resolveSpiderShotHit as Cp31Module['resolveSpiderShotHit'],
      stepSpiderExplosion: spider.stepSpiderExplosion as Cp31Module['stepSpiderExplosion'],
    }
  } catch (e) {
    throw new Error(
      'cp3-1 spider surface not built yet — GREEN (Julia) adds src/core/spider.ts ' +
        '(createSpider/stepSpider/spiderTopLimit/resolveSpiderShotHit/stepSpiderExplosion), ' +
        'widens centipede.ts checkPlayerContact to take the spider as an OPTIONAL 3rd ' +
        'parameter (so cp2-5\'s 2-arg suite stays green), and wires a `spider` field into ' +
        `SimState. (${e instanceof Error ? e.message : String(e)})`,
    )
  }
}

// ─── test helpers ───────────────────────────────────────────────────────────

const seg = (h: number, v: number, pic = 0x03): Segment => ({ h, v, dh: 2, dv: 2, pic })

/** A spider staged directly, bypassing BUGOFF, so a test can pin ONE behaviour. */
const stage = (over: Partial<Spider> = {}): Spider => ({
  h: 0x80,
  v: 0x40,
  dh: SPIDER_DV_FAST,
  dv: SPIDER_DV_FAST,
  pic: SPIDER_PIC_MIN,
  count2: SPIDER_TURN_COUNT,
  count: 0,
  oldDh: SPIDER_DV_FAST,
  pts: PTS_300,
  ...over,
})

/** A step context whose COUNT2 never expires unless the test wants it to. */
const ctx = (over: Partial<StepCtx> = {}): StepCtx => ({ frame: 1, score: 0, rng: createRng(1), ...over })

function fieldWith(cells: ReadonlyArray<{ h: number; v: number; code: number }>): Playfield {
  const field = createPlayfield()
  for (const c of cells) field.cells[c.h * PLYFLD_STRIDE + c.v] = c.code
  return field
}

/** The expected top limit, recomputed from the ROM's arithmetic (:380-399)
 *  independently of the module: SCORE2 is the BCD byte holding the 10,000s and
 *  100,000s digits; subtract 6 in BCD; a negative result uses 0; halve (a BINARY
 *  LSR of the BCD byte); clamp to 5; multiply by 8; subtract from 0x60. */
function expectedTopLimit(score: number): number {
  const tenThousands = Math.floor(score / 10000) % 100
  const score2 = Math.floor(tenThousands / 10) * 0x10 + (tenThousands % 10) // pack to BCD
  const bcdSub = (a: number, b: number): number => {
    const lo = (a & 0x0f) - (b & 0x0f)
    const hi = (a >> 4) - (b >> 4) - (lo < 0 ? 1 : 0)
    return ((hi & 0xf) << 4) | (lo < 0 ? lo + 10 : lo)
  }
  const diff = bcdSub(score2, SPIDER_SCORE_BIAS)
  const base = diff & 0x80 ? 0 : diff // :386-387 BPL / "USE MIN"
  const steps = Math.min(SPIDER_TOP_MAX_STEPS, base >> 1) // :388-391
  return SPIDER_TOP_BASE - steps * SPIDER_TOP_STEP // :392-399
}

// ════════════════════════════════════════════════════════════════════════════
// AC-1 — BUGOFF: spawn, entry side, and speed
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-1 AC-1 BUGOFF — the spider is parked off-screen with a score-picked speed', () => {
  it('parks the spider off-screen at the ROM coords (:272-280)', async () => {
    const { createSpider } = await loadCp31()
    const s = createSpider(createRng(7), 0)
    expect(s.v, 'BUGV = 0x60 (:272-274 LDA I,60 / EOR CKF8, upright => identity)').toBe(SPIDER_ENTER_V)
    expect(s.h, 'BUGH = 0xFF — off screen (:275-276)').toBe(SPIDER_OFF_H)
    expect(s.pic, 'BUGP = 0xF8 — the no-spider picture (:277-278)').toBe(SPIDER_OFF_PIC)
    expect(s.count2, 'COUNT2 = 0x60 (:279-280)').toBe(SPIDER_HIDE_COUNT)
  })

  it('uses the SLOW V speed below the score gate and the FAST one above it (:256-263)', async () => {
    const { createSpider } = await loadCp31()
    // HARD (OPTNS bit 6 clear): the threshold byte is 0x10, compared against
    // SCORE1 (the hundreds/thousands BCD byte). "BCC 10$" keeps dv=2 only when
    // threshold < SCORE1 — so 1000 points exactly is still SLOW, 1100 is FAST.
    expect(Math.abs(createSpider(createRng(1), 0).dv), 'score 0 => slow').toBe(SPIDER_DV_SLOW)
    expect(Math.abs(createSpider(createRng(1), 1000).dv), 'score 1000: threshold == SCORE1, NOT less => slow').toBe(
      SPIDER_DV_SLOW,
    )
    expect(Math.abs(createSpider(createRng(1), 1100).dv), 'score 1100: SCORE1 0x11 > 0x10 => fast').toBe(
      SPIDER_DV_FAST,
    )
  })

  it('EASY moves the same gate to 5000 points (:258-260 "ORA I,10" over the DIP bit)', async () => {
    const { createSpider } = await loadCp31()
    expect(Math.abs(createSpider(createRng(1), 1100, { easy: true }).dv), 'easy at 1100 is still slow').toBe(
      SPIDER_DV_SLOW,
    )
    expect(Math.abs(createSpider(createRng(1), 5100, { easy: true }).dv), 'easy at 5100 is fast').toBe(SPIDER_DV_FAST)
  })

  it('is ALWAYS fast once SCORE2 is non-zero, i.e. from 10,000 points (:256-257)', async () => {
    const { createSpider } = await loadCp31()
    // "LDA X,SCORE2-1 / BNE 10$ ;IF SCORE > 9999" short-circuits the DIP compare
    // entirely — even on EASY, where the 5000 gate would otherwise still say slow.
    expect(Math.abs(createSpider(createRng(1), 10000, { easy: true }).dv), 'SCORE2 != 0 skips the DIP gate').toBe(
      SPIDER_DV_FAST,
    )
  })

  it('varies the entry side off the rng, and |dh| always equals |dv| (:265-271)', async () => {
    const { createSpider } = await loadCp31()
    // "LDA RNGEN / AND I,04 / BEQ 20$ / TYA / JSR COMP / TAY" — the h direction is
    // the V speed, negated on one side. Sweep seeds: BOTH signs must occur (a
    // constant side is a coin that never flips), and the magnitudes must match.
    const signs = new Set<number>()
    for (let seed = 1; seed <= 64; seed++) {
      const s = createSpider(createRng(seed), 0)
      expect(Math.abs(s.dh), `seed ${seed}: |BUGDH| == |BUGDV| (dh is dv, possibly negated)`).toBe(Math.abs(s.dv))
      signs.add(Math.sign(s.dh))
    }
    expect(signs, 'both entry sides must be reachable across seeds').toEqual(new Set([-1, 1]))
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-1 — BUGMV: faces, the diagonal walk, direction changes, bounds
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-1 AC-1 BUGMV — the face cycle (:303-313)', () => {
  it('advances one face every 4 frames and cycles BUG0..BUG7 (0x14..0x1B)', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    // "LDA FRAME / AND I,03 / BNE 20$" — only frames where frame&SPIDER_FACE_MASK
    // == 0 advance. Sweep a whole cadence period so the mask, not one lucky
    // frame number, is what is pinned.
    for (let frame = 1; frame <= 8; frame++) {
      const out = stepSpider(stage({ pic: SPIDER_PIC_MIN }), field, [], ctx({ frame })).spider
      const shouldAdvance = (frame & SPIDER_FACE_MASK) === 0
      expect(out.pic, `frame ${frame}: face ${shouldAdvance ? 'advances' : 'holds'}`).toBe(
        shouldAdvance ? SPIDER_PIC_MIN + 1 : SPIDER_PIC_MIN,
      )
    }

    // ":309 CMP I,1C / BCC 20$" — 0x1B is the last face; 0x1C wraps to 0x14.
    const wrapped = stepSpider(stage({ pic: SPIDER_PIC_LIMIT - 1 }), field, [], ctx({ frame: 4 })).spider
    expect(wrapped.pic, 'past BUG7 (0x1B) the cycle restarts at BUG0 (0x14)').toBe(SPIDER_PIC_MIN)
  })

  it('never leaves the 8-face BUG pool over a long run', async () => {
    const { createSpider, stepSpider } = await loadCp31()
    const field = createPlayfield()
    let s = { ...createSpider(createRng(3), 0), pic: SPIDER_PIC_MIN, h: 0x80 }
    const rng = createRng(3)
    const seen = new Set<number>()
    for (let frame = 1; frame <= 400; frame++) {
      s = stepSpider(s, field, [], { frame, score: 0, rng }).spider
      if (s.pic >= SPIDER_PIC_MIN && s.pic < SPIDER_PIC_LIMIT) seen.add(s.pic)
      expect(
        s.pic === SPIDER_OFF_PIC || (s.pic >= SPIDER_PIC_MIN && s.pic < SPIDER_PIC_LIMIT),
        `frame ${frame}: picture 0x${s.pic.toString(16)} is outside BUG0..BUG7 and is not the off picture`,
      ).toBe(true)
    }
    expect(seen.size, 'a 400-frame run must exercise more than one face').toBeGreaterThan(1)
  })
})

describe('cp3-1 AC-1 BUGMV — the diagonal walk (:342-356)', () => {
  it('steps h by -dh and v by -dv every frame (the INVERTED sign vs a segment)', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    const before = stage({ h: 0x80, v: 0x40, dh: 2, dv: 2, count2: SPIDER_TURN_COUNT })
    const after = stepSpider(before, field, [], ctx({ frame: 1 })).spider
    // ":343-345 SEC / SBC BUGDH" and ":354-355 SEC / SBC BUGDV" — both SUBTRACT.
    expect(after.h, 'BUGH = BUGH - BUGDH').toBe(0x80 - 2)
    expect(after.v, 'BUGV = BUGV - BUGDV (upright branch, :354)').toBe(0x40 - 2)
  })

  it('a negative dh walks the other way, so the two entry sides mirror', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    const left = stepSpider(stage({ h: 0x80, dh: 2 }), field, [], ctx()).spider
    const right = stepSpider(stage({ h: 0x80, dh: -2 }), field, [], ctx()).spider
    expect(left.h, 'dh=+2 decreases h').toBe(0x7e)
    expect(right.h, 'dh=-2 increases h').toBe(0x82)
    expect(0x80 - left.h, 'the two sides are exact mirrors').toBe(right.h - 0x80)
  })

  it('holds direction while COUNT2 is still running, and reloads it to 0x30 on expiry (:314/:340-341)', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    const running = stepSpider(stage({ count2: 5 }), field, [], ctx()).spider
    expect(running.count2, 'COUNT2 just decrements while it is running').toBe(4)

    const expired = stepSpider(stage({ count2: 1 }), field, [], ctx()).spider
    expect(expired.count2, 'on expiry COUNT2 reloads to 0x30 (:340-341)').toBe(SPIDER_TURN_COUNT)
  })

  it('draws NO entropy on a frame where COUNT2 does not expire (:316/:335 are inside the expiry branch)', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    const rng = createRng(12345)
    const before = rng.seed
    stepSpider(stage({ count2: 20 }), field, [], { frame: 1, score: 0, rng })
    expect(rng.seed, 'a non-expiry frame must not advance the seeded rng cursor').toBe(before)
  })
})

describe('cp3-1 AC-1 BUGMV — the h-direction park and its edge guards (:316-331)', () => {
  it('can park dh at 0 (a straight vertical drop) and later restore it from OLDDH', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    // ":319-331" — with the rng bit set and the spider away from both edges,
    // OLDDH takes the current dh and BUGDH becomes 0; a later expiry with
    // BUGDH == 0 restores it. Sweep seeds so this does not depend on one roll.
    const parked = new Set<number>()
    for (let seed = 1; seed <= 64; seed++) {
      const out = stepSpider(stage({ h: 0x80, dh: 2, count2: 1 }), field, [], ctx({ rng: createRng(seed) })).spider
      parked.add(out.dh)
    }
    expect(parked.has(0), 'some seed must park dh at 0 (:327 LDA I,0)').toBe(true)
    expect(parked.has(2), 'some seed must leave dh alone (:318 BEQ 30$)').toBe(true)

    const restored = new Set<number>()
    for (let seed = 1; seed <= 64; seed++) {
      const out = stepSpider(
        stage({ h: 0x80, dh: 0, oldDh: -2, count2: 1 }),
        field,
        [],
        ctx({ rng: createRng(seed) }),
      ).spider
      restored.add(out.dh)
    }
    expect(restored.has(-2), 'a parked spider must be able to restore OLDDH (:330-331)').toBe(true)
  })

  it('NEVER parks dh while the spider sits at either edge (:321-325) — for ANY rng roll', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    // "CPY I,0FB / BCS 30$" and "CPY I,05 / BCC 30$" — at an edge the park is
    // skipped, because a spider with dh=0 at the edge could never walk back on.
    for (const h of [SPIDER_EDGE_LEFT, 0xfe, SPIDER_EDGE_RIGHT - 1, 0x00]) {
      for (let seed = 1; seed <= 32; seed++) {
        const out = stepSpider(stage({ h, dh: 2, count2: 1 }), field, [], ctx({ rng: createRng(seed) })).spider
        expect(out.dh, `h=0x${h.toString(16)} seed ${seed}: dh must never be parked at an edge`).not.toBe(0)
      }
    }
    // ...and the guard is a boundary, not a blanket: one step INSIDE it, parking
    // is reachable again. (The bug lives where the range ends.)
    const inside = new Set<number>()
    for (let seed = 1; seed <= 64; seed++) {
      inside.add(stepSpider(stage({ h: SPIDER_EDGE_LEFT - 1, dh: 2, count2: 1 }), field, [], ctx({ rng: createRng(seed) })).spider.dh)
    }
    expect(inside.has(0), 'h = 0xFA is INSIDE the guard, so parking must be reachable').toBe(true)
  })

  it('can reverse dv on a COUNT2 expiry, and both outcomes are reachable (:332-339)', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    const dvs = new Set<number>()
    for (let seed = 1; seed <= 64; seed++) {
      dvs.add(stepSpider(stage({ v: 0x40, dv: 2, count2: 1 }), field, [], ctx({ rng: createRng(seed) })).spider.dv)
    }
    expect(dvs.has(-2), 'some roll must reverse dv (:337-339 JSR COMP)').toBe(true)
    expect(dvs.has(2), 'some roll must leave dv alone (:336 BEQ 35$)').toBe(true)
  })
})

describe('cp3-1 AC-1 BUGMV — the vertical bounds (:369-415)', () => {
  it('bounces off the bottom row: v < 9 while descending reverses dv (:372-378)', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    // dv > 0 subtracts from v, i.e. descends. At v < 9 the ROM reverses it.
    const bounced = stepSpider(stage({ v: SPIDER_BOTTOM_V - 1, dv: 2, count2: 20 }), field, [], ctx()).spider
    expect(bounced.dv, 'at the bottom row a descending spider reverses').toBe(-2)

    const free = stepSpider(stage({ v: 0x40, dv: 2, count2: 20 }), field, [], ctx()).spider
    expect(free.dv, 'mid-field it keeps descending').toBe(2)
  })

  it('does not re-reverse an ALREADY ascending spider at the bottom (:376-377 BPL)', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    // "LDA BUGDV / BPL 85$" — only a NON-NEGATIVE dv is flipped. An ascending
    // spider passing through the bottom band must keep climbing, or it locks.
    const out = stepSpider(stage({ v: SPIDER_BOTTOM_V - 1, dv: -2, count2: 20 }), field, [], ctx()).spider
    expect(out.dv, 'an ascending spider at the bottom is left alone').toBe(-2)
  })

  it('reverses at the score-driven TOP limit while ascending (:400-409)', async () => {
    const { stepSpider, spiderTopLimit } = await loadCp31()
    const field = createPlayfield()
    const limit = spiderTopLimit(0)
    // "CMP BUGV / BCS 80$ ;NOT AT TOP" — at top means limit < BUGV.
    const turned = stepSpider(stage({ v: limit + 1, dv: -2, count2: 20 }), field, [], ctx({ score: 0 })).spider
    expect(turned.dv, 'above the limit an ascending spider turns back down').toBe(2)

    const below = stepSpider(stage({ v: limit - 8, dv: -2, count2: 20 }), field, [], ctx({ score: 0 })).spider
    expect(below.dv, 'below the limit it keeps climbing').toBe(-2)
  })

  it('resets through BUGOFF when it walks off the side (:369-371, :420)', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    // "LDA BUGH / CMP I,0FF / BCS 100$" — reaching 0xFF re-parks the spider.
    const out = stepSpider(stage({ h: 0x01, dh: 2, count2: 20 }), field, [], ctx()).spider
    expect(out.h, 'stepping to 0xFF re-parks off screen').toBe(SPIDER_OFF_H)
    expect(out.pic, 'and the picture goes back to the no-spider code').toBe(SPIDER_OFF_PIC)
    expect(out.count2, 'and COUNT2 is reloaded to the hide count').toBe(SPIDER_HIDE_COUNT)
  })

  it('never straddles the 0xFF seam: the exit gate is an EQUALITY, kept safe by dh parity', async () => {
    const { createSpider, stepSpider } = await loadCp31()
    // ":369-371 LDA BUGH / CMP I,0FF / BCS 100$" is `h >= 0xFF` on a BYTE, so it
    // fires ONLY on h == 0xFF exactly. That is not a wrap bug purely because
    // |dh| is fixed for a spider's whole life (createSpider picks it once; the
    // step only flips dv's sign and parks/restores dh via oldDh, never its
    // magnitude). A fast spider therefore enters on the ODD h 0xFF and stays
    // odd, so it can never land on 0xFE and skip over the gate to 0x00.
    // Pinned because it is the load-bearing reason the gate is an equality.
    for (let seed = 1; seed <= 24; seed += 1) {
      const rng = createRng(seed)
      // score 1100 forces the fast (|dv| == 2) spider — the only parity at risk.
      let s = createSpider(rng, 1100)
      expect(Math.abs(s.dh), `seed ${seed}: the fast spider steps by 2`).toBe(SPIDER_DV_FAST)
      const field = createPlayfield()
      let parks = 0

      for (let frame = 1; frame <= 1200; frame += 1) {
        const before = s
        s = stepSpider(s, field, [], ctx({ frame, score: 1100, rng })).spider

        if (before.pic !== SPIDER_OFF_PIC && s.pic === SPIDER_OFF_PIC) {
          // A re-park. It may ONLY have happened by landing exactly on 0xFF.
          expect(((before.h - before.dh) & 0xff), `seed ${seed} frame ${frame}: re-park lands on 0xFF`).toBe(
            SPIDER_OFF_H,
          )
          parks += 1
        }
        // A walking spider's h is always odd; 0xFE — the value that would let it
        // cross the gate unnoticed — is unreachable.
        if (s.pic !== SPIDER_OFF_PIC) {
          expect(s.h % 2, `seed ${seed} frame ${frame}: h stays odd (h=${s.h.toString(16)})`).toBe(1)
        }
        expect(Math.abs(s.dh) === SPIDER_DV_FAST || s.dh === 0, `seed ${seed}: |dh| never changes magnitude`).toBe(
          true,
        )
      }
      expect(parks, `seed ${seed}: the spider actually walked off at least once`).toBeGreaterThan(0)
    }
  })
})

describe('cp3-1 AC-1 — spiderTopLimit: the score-driven ceiling (:380-399)', () => {
  it('sits at the base until 80,000, then steps down 8 per 20,000 points', async () => {
    const { spiderTopLimit } = await loadCp31()
    // The BCD datum is 60,000 (:384 "SBC I,6"), but the halving at :388 means the
    // limit does not actually MOVE until 80,000 — the 60K prose in CENTIP.DOC:201
    // marks where the arithmetic starts, not where the spider first drops.
    expect(spiderTopLimit(0)).toBe(SPIDER_TOP_BASE)
    expect(spiderTopLimit(59_999), 'below the datum uses the minimum (:386-387)').toBe(SPIDER_TOP_BASE)
    expect(spiderTopLimit(60_000), 'AT 60,000 the arithmetic is 0 — the limit has not moved yet').toBe(SPIDER_TOP_BASE)
    expect(spiderTopLimit(70_000)).toBe(SPIDER_TOP_BASE)
    expect(spiderTopLimit(80_000), 'the first actual step down').toBe(SPIDER_TOP_BASE - SPIDER_TOP_STEP)
    expect(spiderTopLimit(100_000)).toBe(SPIDER_TOP_BASE - 2 * SPIDER_TOP_STEP)
  })

  it('clamps at 5 steps from 160,000 up — and STAYS clamped far past the table', async () => {
    const { spiderTopLimit } = await loadCp31()
    const floor = SPIDER_TOP_BASE - SPIDER_TOP_MAX_STEPS * SPIDER_TOP_STEP
    expect(spiderTopLimit(160_000), ':389-391 "CMP I,6 / LDA I,5" clamps here').toBe(floor)
    // The bug lives where the table ENDS: walk far past the clamp and past the
    // point where a naive linear formula would drive the limit negative.
    for (const score of [200_000, 400_000, 799_999]) {
      expect(spiderTopLimit(score), `score ${score} must stay clamped at the floor`).toBe(floor)
    }
  })

  it('reproduces the ROM\'s own BCD wrap at 860,000 — the limit RESETS to the base', async () => {
    const { spiderTopLimit } = await loadCp31()
    // The ROM comment at :386 says so out loud: "IF SCORE >=60K OR >=860K".
    // SCORE2 = 0x86; BCD 0x86 - 6 = 0x80, whose bit 7 is set, so the BPL fails
    // and the minimum is used. This is a FAITHFUL quirk, not a bug to fix.
    expect(spiderTopLimit(860_000), 'SCORE2 0x86 wraps negative and falls back to the base').toBe(SPIDER_TOP_BASE)
    expect(spiderTopLimit(869_999)).toBe(SPIDER_TOP_BASE)
    expect(spiderTopLimit(870_000), 'SCORE2 0x87 - 6 = 0x81, still negative').toBe(SPIDER_TOP_BASE)
  })

  it('matches the independently recomputed ROM arithmetic across the whole range', async () => {
    const { spiderTopLimit } = await loadCp31()
    for (let score = 0; score <= 999_000; score += 10_000) {
      expect(spiderTopLimit(score), `score ${score}`).toBe(expectedTopLimit(score))
    }
  })
})

describe('cp3-1 AC-1 — OVRLAP: a segment on the same row bounces the spider (:410-415)', () => {
  it('reverses dv when a live segment shares the row on the trigger side', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    // "(BUGH - MOBJH) EOR BUGDH / CMP I,0F4 / BCS ;WE HAVE AN OVERLAP" — with
    // dh > 0 the window is (BUGH - MOBJH) in [-12,-1], i.e. the segment sits at a
    // HIGHER h. The spider moves toward LOWER h (h -= dh), so the ROM's trigger
    // side is BEHIND it. Counterintuitive and easy to "correct" — pinned here.
    // OVRLAP runs AFTER the frame's move (:342-356 precede :411), so the segment
    // must share the spider's POST-move row and be measured against its POST-move
    // h — staging it on the pre-move row tests nothing.
    const v = 0x40
    const postV = v - 2 // dv = 2 subtracts
    const hit = stepSpider(stage({ h: 0x80, v, dh: 2, dv: 2, count2: 20 }), field, [seg(0x86, postV)], ctx()).spider
    expect(hit.dv, 'a segment on the HIGHER-h side bounces a dh>0 spider').toBe(-2)

    const miss = stepSpider(stage({ h: 0x80, v, dh: 2, dv: 2, count2: 20 }), field, [seg(0x7a, postV)], ctx()).spider
    expect(miss.dv, 'the same segment on the LOWER-h side does not').toBe(2)
  })

  it('mirrors for dh < 0 — the trigger side follows the direction byte', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    const v = 0x40
    const postV = v - 2
    const hit = stepSpider(stage({ h: 0x80, v, dh: -2, dv: 2, count2: 20 }), field, [seg(0x7a, postV)], ctx()).spider
    expect(hit.dv, 'with dh<0 the LOWER-h side triggers').toBe(-2)

    const miss = stepSpider(stage({ h: 0x80, v, dh: -2, dv: 2, count2: 20 }), field, [seg(0x86, postV)], ctx()).spider
    expect(miss.dv, 'and the higher-h side does not').toBe(2)
  })

  it('requires an EXACT row match and a LIVE segment (:1750-1755)', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    const v = 0x40
    const postV = v - 2
    // One pixel off the post-move row: OVRLAP compares MOBJV for EQUALITY.
    const offRow = stepSpider(stage({ h: 0x80, v, dh: 2, dv: 2, count2: 20 }), field, [seg(0x86, postV + 1)], ctx())
      .spider
    expect(offRow.dv, 'OVRLAP compares MOBJV for EQUALITY — one pixel off is no overlap').toBe(2)

    for (const deadPic of [SPIDER_EXPLODE_PIC, 0xf4, 0x80]) {
      const dead = stepSpider(stage({ h: 0x80, v, dh: 2, dv: 2, count2: 20 }), field, [seg(0x86, postV, deadPic)], ctx())
        .spider
      expect(dead.dv, `a segment with picture 0x${deadPic.toString(16)} must not bounce the spider`).toBe(2)
    }
  })
})

describe('cp3-1 AC-1 — the respawn countdown (:424-433)', () => {
  it('holds the parked spider until COUNT2 runs out, then re-enters with BUG0', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    const waiting = stepSpider(stage({ pic: SPIDER_OFF_PIC, count2: 5 }), field, [], ctx()).spider
    expect(waiting.pic, 'still parked').toBe(SPIDER_OFF_PIC)
    expect(waiting.count2, 'the hide counter ticks down').toBe(4)

    const back = stepSpider(stage({ pic: SPIDER_OFF_PIC, count2: 1 }), field, [], ctx()).spider
    expect(back.pic, 'at 0 the spider re-enters with the first face (:430-433)').toBe(SPIDER_PIC_MIN)
  })

  it('reloads the respawn delay into the ROM range 0x0F..0x3F (:426-429)', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    // "LDA RNGEN / AND I,2F / ORA I,0F" — the mask keeps bits 0-5 minus 0x10,
    // and the ORA floors the low nibble, so the value is always >= 0x0F.
    const seen = new Set<number>()
    for (let seed = 1; seed <= 64; seed++) {
      const out = stepSpider(stage({ pic: SPIDER_OFF_PIC, count2: 1 }), field, [], ctx({ rng: createRng(seed) })).spider
      expect(out.count2, `seed ${seed}: respawn delay >= 0x0F`).toBeGreaterThanOrEqual(0x0f)
      expect(out.count2, `seed ${seed}: respawn delay <= 0x3F`).toBeLessThanOrEqual(0x3f)
      expect(out.count2 & 0x10, `seed ${seed}: bit 4 is masked out by AND I,2F`).toBe(0)
      seen.add(out.count2)
    }
    expect(seen.size, 'the delay must actually vary with the rng, not be a constant').toBeGreaterThan(1)
  })

  it('is FROZEN while the points display is up (:297-301)', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    // "AND I,20 / BEQ 10$" then "CPY I,0F8 / BCC 3$ ;PTS.STILL ON" — a picture
    // with bit 5 set that is BELOW 0xF8 is a points sprite: BUGMV returns at once,
    // so the spider neither moves nor animates while the score is displayed.
    for (const pic of [PTS_300, PTS_600, PTS_900]) {
      const before = stage({ pic, h: 0x80, v: 0x40, count2: 1 })
      const after = stepSpider(before, field, [], ctx({ frame: 4 })).spider
      expect(after, `picture 0x${pic.toString(16)} must freeze the spider entirely`).toEqual(before)
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-2 — the spider EATS mushrooms (:357-368)
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-1 AC-2 — mushroom eating', () => {
  // The cell the spider probes is OBSTAC's, which cp2-3 already models. These
  // tests place a mushroom on the cell the spider is about to occupy and assert
  // on the FIELD, so they stay independent of the probe's internal arithmetic.
  it('clears EVERY mushroom damage state it crosses — poison band included (:362-366)', async () => {
    const { stepSpider } = await loadCp31()
    // "AND I,3F / CMP I,38 / BCC 60$" — the SAME (cell & 0x3F) >= 0x38 test
    // playfield.ts already calls isMushroom (PM-15/16). All eight codes qualify.
    for (const code of [0x38, 0x39, 0x3a, 0x3b, 0x3c, 0x3d, 0x3e, 0x3f]) {
      const field = createPlayfield()
      // Fill the whole row band the spider can probe so the probe cannot miss.
      for (let h = 0; h < 30; h++) field.cells[h * PLYFLD_STRIDE + 8] = code
      const out = stepSpider(stage({ h: 0x80, v: 0x44, dh: 2, dv: 2, count2: 20 }), field, [], ctx())
      expect(out.ate, `code 0x${code.toString(16)} is a mushroom and must be eaten`).toBe(true)
      // The FLAG is not the behaviour: assert the field actually changed, or an
      // implementation that returns ate=true without clearing anything passes.
      const cleared = Array.from(field.cells).filter((c) => c === 0).length
      expect(cleared, `code 0x${code.toString(16)}: exactly one cell must go to 0`).toBe(960 - 30 + 1)
    }
  })

  it('refuses to eat a NON-mushroom cell — "DO NOT LET BUG EAT MESSAGES" (:364)', async () => {
    const { stepSpider } = await loadCp31()
    // Text/score glyphs live in the same playfield RAM at codes below 0x38.
    for (const code of [0x01, 0x10, 0x20, 0x30, 0x37]) {
      const field = createPlayfield()
      for (let h = 0; h < 30; h++) field.cells[h * PLYFLD_STRIDE + 8] = code
      const before = Array.from(field.cells)
      const out = stepSpider(stage({ h: 0x80, v: 0x44, dh: 2, dv: 2, count2: 20 }), field, [], ctx())
      expect(out.ate, `code 0x${code.toString(16)} is below 0x38 and must NOT be eaten`).toBe(false)
      expect(Array.from(field.cells), `code 0x${code.toString(16)} must leave the field untouched`).toEqual(before)
    }
  })

  it('zeroes the eaten cell rather than damaging it (:365-366 "LDA I,0 / STA NY,OBST")', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    for (let h = 0; h < 30; h++) field.cells[h * PLYFLD_STRIDE + 8] = MUSHROOM_FULL
    const out = stepSpider(stage({ h: 0x80, v: 0x44, dh: 2, dv: 2, count2: 20 }), field, [], ctx())
    expect(out.ate, 'the spider ate this frame').toBe(true)
    const cleared = Array.from(field.cells).filter((c) => c === 0).length
    expect(cleared, 'exactly one cell went to 0 — a full mushroom is removed outright, not stepped down').toBe(
      960 - 30 + 1,
    )
    // ...and it is NOT a damage step: no cell may hold a partial code afterwards.
    for (const c of field.cells) {
      expect(c === 0 || c === MUSHROOM_FULL, 'eating never produces a partial mushroom').toBe(true)
    }
  })

  it('scores NOTHING for eating — the spider is not the player (:365-368 has no SCORNG)', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    for (let h = 0; h < 30; h++) field.cells[h * PLYFLD_STRIDE + 8] = MUSHROOM_FULL
    const out = stepSpider(stage({ h: 0x80, v: 0x44, dh: 2, dv: 2, count2: 20 }), field, [], ctx())
    expect(out.ate).toBe(true)
    expect(out.scored ?? 0, 'BUGMV calls MUSHDC, never SCORNG — eating awards no points').toBe(0)
  })

  it('decrements the lower-screen mushroom court only for a lower-screen cell (MUSHDC :1601-1612)', async () => {
    const { stepSpider } = await loadCp31()
    // "LDA OBST / AND I,1F / CMP I,0C / BCS 10$" — only a row BELOW 0x0C counts
    // against MUSH, the court the flea's spawn trigger will read in cp3-2.
    const low = fieldWith([])
    for (let h = 0; h < 30; h++) low.cells[h * PLYFLD_STRIDE + 8] = MUSHROOM_FULL
    low.mush = 5
    stepSpider(stage({ h: 0x80, v: 0x44, dh: 2, dv: 2, count2: 20 }), low, [], ctx())
    expect(low.mush, 'row 8 is below 0x0C, so the court drops').toBe(4)

    const high = fieldWith([])
    for (let h = 0; h < 30; h++) high.cells[h * PLYFLD_STRIDE + 0x14] = MUSHROOM_FULL
    high.mush = 5
    stepSpider(stage({ h: 0x80, v: 0xa4, dh: 2, dv: 2, count2: 20 }), high, [], ctx())
    expect(high.mush, 'row 0x14 is on the upper screen, so the court is untouched').toBe(5)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-3 — contact death through cp2-5's PLAY chain
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-1 AC-3 — PLAY gives the spider its OWN, WIDER windows (:1779-1782, :1822)', () => {
  const gun = { h: 0x80, v: 0x10 }
  const spiderAt = (h: number, v: number): Spider => stage({ h, v })

  it('collides out to |dH| < 10 DECIMAL, well past a segment\'s 7', async () => {
    const { checkPlayerContact } = await loadCp31()
    // ":1779-1781 CPX I,13. / BNE 10$ / CMP I,10." — the trailing period makes
    // this DECIMAL 10. Reading it as hex 0x10 would stretch the box to 16.
    expect(
      checkPlayerContact([], gun, spiderAt(gun.h + SPIDER_PLAY_H_WINDOW - 1, gun.v)),
      '|dH| = 9 is inside the spider window',
    ).toBe(true)
    expect(
      checkPlayerContact([], gun, spiderAt(gun.h + SPIDER_PLAY_H_WINDOW, gun.v)),
      '|dH| = 10 is out — and 10 is DECIMAL, not 0x10',
    ).toBe(false)
    expect(
      checkPlayerContact([], gun, spiderAt(gun.h + 0x10, gun.v)),
      'a hex reading of "10." would wrongly still collide at |dH| = 16',
    ).toBe(false)
  })

  it('shares the segment V window of 7 (:1792 "CMP I,7", hex)', async () => {
    const { checkPlayerContact } = await loadCp31()
    expect(checkPlayerContact([], gun, spiderAt(gun.h, gun.v + SPIDER_PLAY_V_WINDOW - 1)), '|dV| = 6 hits').toBe(true)
    expect(checkPlayerContact([], gun, spiderAt(gun.h, gun.v + SPIDER_PLAY_V_WINDOW)), '|dV| = 7 misses').toBe(false)
  })

  it('uses the WIDER diamond bound of 14 DECIMAL (:1822 "CMP I,14.")', async () => {
    const { checkPlayerContact } = await loadCp31()
    // Both axes inside their windows; the SUM decides.
    const hi = SPIDER_PLAY_H_WINDOW - 1 // 9, the widest legal |dH|
    expect(
      checkPlayerContact([], gun, spiderAt(gun.h + hi, gun.v + (SPIDER_PLAY_SUM_WINDOW - 1 - hi))),
      `sum ${SPIDER_PLAY_SUM_WINDOW - 1} < ${SPIDER_PLAY_SUM_WINDOW} hits`,
    ).toBe(true)
    expect(
      checkPlayerContact([], gun, spiderAt(gun.h + hi, gun.v + (SPIDER_PLAY_SUM_WINDOW - hi))),
      `sum ${SPIDER_PLAY_SUM_WINDOW} is out`,
    ).toBe(false)
    // A segment at the same offset would already be out on both counts — proof
    // the spider is genuinely using a different, larger diamond.
    expect(checkPlayerContact([seg(gun.h + 9, gun.v + 4)], gun), 'a SEGMENT there does not collide').toBe(false)
  })

  it('leaves the segment windows EXACTLY as cp2-5 pinned them (regression guard)', async () => {
    const { checkPlayerContact } = await loadCp31()
    // PLAY is one shared routine; widening it for the spider must not leak into
    // the segment path. These mirror cp2-5's own assertions.
    expect(checkPlayerContact([seg(gun.h + SEG_PLAY_H_WINDOW - 1, gun.v)], gun), 'segment |dH| = 6 hits').toBe(true)
    expect(checkPlayerContact([seg(gun.h + SEG_PLAY_H_WINDOW, gun.v)], gun), 'segment |dH| = 7 misses').toBe(false)
    expect(
      checkPlayerContact([seg(gun.h + 5, gun.v + (SEG_PLAY_SUM_WINDOW - 1 - 5))], gun),
      'segment sum 11 hits',
    ).toBe(true)
    expect(checkPlayerContact([seg(gun.h + 6, gun.v + (SEG_PLAY_SUM_WINDOW - 6))], gun), 'segment sum 12 misses').toBe(
      false,
    )
  })

  it('ignores a parked or exploding spider', async () => {
    const { checkPlayerContact } = await loadCp31()
    expect(checkPlayerContact([], gun, stage({ h: gun.h, v: gun.v, pic: SPIDER_OFF_PIC })), 'parked spider').toBe(false)
    expect(
      checkPlayerContact([], gun, stage({ h: gun.h, v: gun.v, pic: SPIDER_EXPLODE_PIC })),
      'exploding spider',
    ).toBe(false)
    expect(checkPlayerContact([], gun, stage({ h: gun.h, v: gun.v, pic: PTS_300 })), 'points-display spider').toBe(
      false,
    )
    expect(checkPlayerContact([], gun, null), 'no spider at all').toBe(false)
  })
})

describe('cp3-1 AC-3 — the sim runs the spider death through cp2-5\'s chain, not a copy', () => {
  it('a spider on the gun produces the IDENTICAL death transition a segment does', async () => {
    await loadCp31()
    const sim = (await import('../src/core/sim')) as Record<string, unknown>
    const createSim = sim.createSim as (seed: number) => Record<string, unknown>
    const stepSim = sim.stepSim as (s: unknown, i: unknown) => Record<string, unknown>
    const idle = { dh: 0, dv: 0, fire: false } as unknown

    const base = createSim(99) as Record<string, unknown> & { player: { h: number; v: number } }
    const gun = base.player

    // Stage the SPIDER on the gun, every segment far away.
    const bySpider = stepSim(
      { ...base, segs: [], spider: stage({ h: gun.h, v: gun.v, pic: SPIDER_PIC_MIN }) },
      idle,
    )
    // Stage a SEGMENT on the gun. "No spider hazard" is the ROM's PARKED
    // picture (slot 13 always exists), not an absent object.
    const bySegment = stepSim(
      { ...base, segs: [seg(gun.h, gun.v)], spider: stage({ pic: SPIDER_OFF_PIC, h: SPIDER_OFF_H }) },
      idle,
    )

    expect(bySpider.delay, 'the spider must arm the same DEATH_DELAY').toBe(bySegment.delay)
    expect(bySpider.playerExplode, 'and the same player-explosion picture').toBe(bySegment.playerExplode)
    expect(bySpider.lives, 'and must not shortcut the life count at contact time').toBe(bySegment.lives)
  })

  it('sim.ts builds the PLAYEX transition in exactly ONE place (no duplicated death path)', () => {
    // AC-3 says "reused, not duplicated". A behavioural test cannot tell a shared
    // path from a faithful copy, so this reads the source: the death transition's
    // two signature fields may be constructed once and only once.
    // NOTE: this scan is comment-inclusive (the repo's convention for source
    // scans). Writing the phrase in a comment will trip it — reword rather than
    // relax the guard.
    const armings = (s: string): number => (s.match(/playerExplode:\s*PLAYER_EXPLODE_START/g) ?? []).length

    // Fixture-pin the scanner itself: a guard that cannot fail guards nothing.
    expect(armings('a: 1'), 'scanner: an unrelated source arms nothing').toBe(0)
    expect(
      armings('{ delay: DEATH_DELAY, playerExplode: PLAYER_EXPLODE_START }\n' + '{ playerExplode:  PLAYER_EXPLODE_START }'),
      'scanner: a COPIED death path must read as two armings',
    ).toBe(2)

    const src = readFileSync(join(repoRoot, 'src/core/sim.ts'), 'utf8')
    expect(
      armings(src),
      'PLAYER_EXPLODE_START is assigned more than once — the spider death path was copied ' +
        'rather than routed through cp2-5\'s existing PLAYEX branch',
    ).toBe(1)
  })

  it('the RESTOR sweep and the life loss still run after a spider death', async () => {
    await loadCp31()
    const sim = (await import('../src/core/sim')) as Record<string, unknown>
    const createSim = sim.createSim as (seed: number) => Record<string, unknown>
    const stepSim = sim.stepSim as (s: unknown, i: unknown) => Record<string, unknown>
    const STARTING_LIVES = sim.STARTING_LIVES as number
    const idle = { dh: 0, dv: 0, fire: false } as unknown

    const base = createSim(5) as Record<string, unknown> & { player: { h: number; v: number } }
    const gun = base.player
    let s: Record<string, unknown> = stepSim(
      { ...base, segs: [], spider: stage({ h: gun.h, v: gun.v, pic: SPIDER_PIC_MIN }) },
      idle,
    )
    expect(s.delay, 'the death pause is armed').toBeGreaterThan(0)
    for (let i = 0; i < 400 && (s.delay as number) > 0; i++) s = stepSim(s, idle)
    expect(s.delay, 'the pause eventually ends').toBe(0)
    expect(s.lives, 'a spider death costs exactly one life, like a segment death').toBe(STARTING_LIVES - 1)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-4 — shooting the spider: windows, proximity bands, the points sprite
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-1 AC-4 — SHOOT windows for the spider (:2202, :2232)', () => {
  const player = { h: 0x80, v: 0x10 }
  const shotAt = (h: number, v: number): Shot => ({ h, v, live: true })

  it('uses the DECIMAL 10 h-window, not the segment\'s 6', async () => {
    const { resolveSpiderShotHit } = await loadCp31()
    const s = stage({ h: 0x80, v: 0x40 })
    expect(resolveSpiderShotHit(shotAt(0x80 + SPIDER_HIT_H_WINDOW - 1, 0x40), s, player).hit, '|dH| = 9 hits').toBe(
      true,
    )
    expect(resolveSpiderShotHit(shotAt(0x80 + SPIDER_HIT_H_WINDOW, 0x40), s, player).hit, '|dH| = 10 misses').toBe(
      false,
    )
    expect(
      resolveSpiderShotHit(shotAt(0x80 + 0x0f, 0x40), s, player).hit,
      'a hex misreading of "10." would still hit at 15',
    ).toBe(false)
  })

  it('shares the segment V window of 5 (:2202 "CPY I,5", hex)', async () => {
    const { resolveSpiderShotHit } = await loadCp31()
    const s = stage({ h: 0x80, v: 0x40 })
    expect(resolveSpiderShotHit(shotAt(0x80, 0x40 + SPIDER_HIT_V_WINDOW - 1), s, player).hit, '|dV| = 4 hits').toBe(
      true,
    )
    expect(resolveSpiderShotHit(shotAt(0x80, 0x40 + SPIDER_HIT_V_WINDOW), s, player).hit, '|dV| = 5 misses').toBe(false)
  })

  it('a resting shot never hits, and a hit consumes the shot (one-shot economy)', async () => {
    const { resolveSpiderShotHit } = await loadCp31()
    const s = stage({ h: 0x80, v: 0x40 })
    expect(resolveSpiderShotHit({ h: 0x80, v: 0x40, live: false }, s, player).hit, 'a dead shot cannot hit').toBe(false)
    const out = resolveSpiderShotHit(shotAt(0x80, 0x40), s, player)
    expect(out.hit).toBe(true)
    expect(out.shot.live, 'the shot is consumed by the kill').toBe(false)
  })

  it('cannot hit a parked, exploding, or points-displaying spider', async () => {
    const { resolveSpiderShotHit } = await loadCp31()
    for (const pic of [SPIDER_OFF_PIC, SPIDER_EXPLODE_PIC, PTS_300]) {
      const s = stage({ h: 0x80, v: 0x40, pic })
      expect(resolveSpiderShotHit(shotAt(0x80, 0x40), s, player).hit, `picture 0x${pic.toString(16)}`).toBe(false)
    }
  })
})

describe('cp3-1 AC-4 — the proximity bands (:2236-2250)', () => {
  const shotOn = (s: Spider): Shot => ({ h: s.h, v: s.v, live: true })

  /** Stage a spider at a chosen |BUGV - PLAYV| from the gun and shoot it. */
  async function killAtDistance(distance: number) {
    const { resolveSpiderShotHit } = await loadCp31()
    const player = { h: 0x80, v: 0x10 }
    const s = stage({ h: 0x80, v: player.v + distance })
    return resolveSpiderShotHit(shotOn(s), s, player)
  }

  it('scores 300 at or beyond 0x40 away (:2243 "CMP I,40" / BCS)', async () => {
    expect((await killAtDistance(SPIDER_FAR_BAND)).scored, 'distance 0x40 is the far band').toBe(300)
    expect((await killAtDistance(0x50)).scored, 'further still is 300').toBe(300)
  })

  it('scores 600 in the middle band [0x16, 0x40) (:2247-2250)', async () => {
    expect((await killAtDistance(SPIDER_NEAR_BAND)).scored, 'distance 0x16 is the middle band floor').toBe(600)
    expect((await killAtDistance(SPIDER_FAR_BAND - 1)).scored, 'distance 0x3F is still the middle band').toBe(600)
  })

  it('scores 900 closer than 0x16 (:2247 "CMP I,16" / BCC)', async () => {
    expect((await killAtDistance(SPIDER_NEAR_BAND - 1)).scored, 'distance 0x15 is the near band').toBe(900)
    expect((await killAtDistance(0)).scored, 'point blank is 900').toBe(900)
  })

  it('measures |BUGV - PLAYV| — the band is symmetric about the gun', async () => {
    const { resolveSpiderShotHit } = await loadCp31()
    const player = { h: 0x80, v: 0x40 }
    // "SBC PLAYV / JSR ABS" — the ROM takes the ABSOLUTE difference, so a spider
    // BELOW the gun scores the same as one the same distance above it.
    const above = stage({ h: 0x80, v: player.v + 0x20 })
    const below = stage({ h: 0x80, v: player.v - 0x20 })
    expect(resolveSpiderShotHit({ h: above.h, v: above.v, live: true }, above, player).scored).toBe(600)
    expect(resolveSpiderShotHit({ h: below.h, v: below.v, live: true }, below, player).scored).toBe(600)
  })

  it('every band is reachable and they are the ONLY three values', async () => {
    const { resolveSpiderShotHit } = await loadCp31()
    const player = { h: 0x80, v: 0x08 }
    const scores = new Set<number>()
    for (let d = 0; d <= 0x80; d++) {
      const s = stage({ h: 0x80, v: player.v + d })
      scores.add(resolveSpiderShotHit({ h: s.h, v: s.v, live: true }, s, player).scored)
    }
    expect(scores, 'a full sweep of distances yields exactly 900/600/300').toEqual(new Set([900, 600, 300]))
  })
})

describe('cp3-1 AC-4 — the kill visual: PTS picture and the on-screen clamp (:2236-2262)', () => {
  const shotOn = (s: Spider): Shot => ({ h: s.h, v: s.v, live: true })

  it('stamps the explosion picture and arms the post-kill counters (:2251-2253, :2302)', async () => {
    const { resolveSpiderShotHit } = await loadCp31()
    const player = { h: 0x80, v: 0x10 }
    const s = stage({ h: 0x80, v: 0x20 })
    const out = resolveSpiderShotHit(shotOn(s), s, player)
    expect(out.spider.pic, 'the slot takes the shared explosion picture').toBe(SPIDER_EXPLODE_PIC)
    expect(out.spider.count, 'COUNT = 0x80 (:2252)').toBe(SPIDER_KILL_COUNT)
    expect(out.spider.count2, 'COUNT2 = 0x80 (:2253)').toBe(SPIDER_KILL_COUNT)
  })

  it('EXPLOD flips the finished explosion to the PTS sprite for the band scored (:972-979)', async () => {
    const { resolveSpiderShotHit, stepSpiderExplosion } = await loadCp31()
    const player = { h: 0x80, v: 0x10 }
    // The picture code is NOT ordered by score — it is the CENPIC sprite order
    // THREE(0x36) / NINE(0x37) / SIX(0x38), reached by "LDY I,0B6" then INC PTS.
    const cases: ReadonlyArray<[number, number, number]> = [
      [SPIDER_FAR_BAND, 300, PTS_300],
      [SPIDER_NEAR_BAND, 600, PTS_600],
      [0, 900, PTS_900],
    ]
    for (const [distance, score, pts] of cases) {
      const s = stage({ h: 0x80, v: player.v + distance })
      const killed = resolveSpiderShotHit(shotOn(s), s, player)
      expect(killed.scored, `distance ${distance}`).toBe(score)
      // Run the explosion down to its rest picture, then EXPLOD puts the points up.
      let e = { ...killed.spider, pic: SPIDER_EXPLODE_DONE }
      e = stepSpiderExplosion(e, true)
      expect(e.pic, `${score} points must draw picture 0x${pts.toString(16)}`).toBe(pts)
    }
  })

  it('does NOT put the points up while the player is dead (:974-976)', async () => {
    const { stepSpiderExplosion } = await loadCp31()
    const e = stepSpiderExplosion(stage({ pic: SPIDER_EXPLODE_DONE, count: SPIDER_KILL_COUNT }), false)
    expect(e.pic, 'a dead player suppresses the points display').toBe(SPIDER_EXPLODE_DONE)
  })

  it('clamps the spider h into [0x10, 0xF0] so the points stay on screen (:2256-2262)', async () => {
    const { resolveSpiderShotHit } = await loadCp31()
    const player = { h: 0x80, v: 0x10 }
    const offLeft = stage({ h: 0x05, v: 0x20 })
    expect(resolveSpiderShotHit({ h: 0x05, v: 0x20, live: true }, offLeft, player).spider.h).toBe(SPIDER_PTS_CLAMP_LO)

    const offRight = stage({ h: 0xfa, v: 0x20 })
    expect(resolveSpiderShotHit({ h: 0xfa, v: 0x20, live: true }, offRight, player).spider.h).toBe(SPIDER_PTS_CLAMP_HI)

    const inside = stage({ h: 0x80, v: 0x20 })
    expect(
      resolveSpiderShotHit({ h: 0x80, v: 0x20, live: true }, inside, player).spider.h,
      'a spider already on screen is not moved',
    ).toBe(0x80)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-4 — the points sprites must exist in the picture ROM naming table
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-1 AC-4 — THREE / SIX / NINE join the STAMPS table', () => {
  it('names the three points sprites at their CENPIC offsets', async () => {
    const pics = (await import('../src/core/pictures')) as Record<string, unknown>
    const stamps = pics.STAMPS as ReadonlyArray<{ name: string; offset: number; kind: string }>
    // Offsets computed by walking CENPIC.MAC's .BYTE/.REPT stream from ".=0":
    // THREE :47 -> 0x1B0, SIX :48 -> 0x1C0, NINE :146 -> 0x5B0. They decode from
    // the PTS codes as offset = ((pic & 1) << 10) | (((pic >> 1) & 0x3F) << 4):
    //   0xB6 -> 0x1B0 THREE, 0xB7 -> 0x5B0 NINE, 0xB8 -> 0x1C0 SIX.
    const want: ReadonlyArray<[string, number]> = [
      ['THREE', 0x1b0],
      ['SIX', 0x1c0],
      ['NINE', 0x5b0],
    ]
    for (const [name, offset] of want) {
      const found = stamps.find((s) => s.name === name)
      expect(found, `STAMPS must name ${name} (the ${name === 'THREE' ? 300 : name === 'SIX' ? 600 : 900}-point sprite)`)
        .toBeDefined()
      expect(found?.offset, `${name} sits at 0x${offset.toString(16)} in the lower plane`).toBe(offset)
      expect(found?.kind, `${name} is an 8x16 motion-object sprite`).toBe('sprite')
    }
  })

  it('the renderer draws the points sprite for a spider in its points state', async () => {
    const render = (await import('../src/shell/render')) as Record<string, unknown>
    const spiderStamp = render.spiderStamp as ((pic: number) => string) | undefined
    expect(typeof spiderStamp, 'render.ts must export spiderStamp(pic)').toBe('function')
    if (typeof spiderStamp !== 'function') return
    expect(spiderStamp(PTS_300)).toBe('THREE')
    expect(spiderStamp(PTS_600)).toBe('SIX')
    expect(spiderStamp(PTS_900)).toBe('NINE')
    // ...and a live spider still draws its BUG face.
    expect(spiderStamp(SPIDER_PIC_MIN)).toBe('BUG0')
    expect(spiderStamp(SPIDER_PIC_LIMIT - 1)).toBe('BUG7')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-1 — determinism and the citation gate
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-1 — determinism', () => {
  // NOTE what this proves and what it does not: it establishes REPLAY SAFETY —
  // the spider is a pure function of (seed, inputs) with no ambient entropy —
  // which is what the purity guard and any future replay feature depend on. It
  // does NOT establish that the trajectory is ROM-faithful; a wrong-but-
  // deterministic BUGMV would satisfy it. Fidelity is carried by the transcribed
  // unit tests above, each pinned to a cited ROM line. Naming it honestly beats
  // adding a "reference trajectory" fixture derived from this same code, which
  // would be circular.
  it('replays an identical trajectory from an identical seed (replay safety, not fidelity)', async () => {
    const { createSpider, stepSpider } = await loadCp31()
    const run = (seed: number): string => {
      const rng = createRng(seed)
      const field = createPlayfield()
      let s = createSpider(rng, 0)
      const trace: string[] = []
      for (let frame = 1; frame <= 300; frame++) {
        s = stepSpider(s, field, [], { frame, score: 0, rng }).spider
        trace.push(`${s.h},${s.v},${s.dh},${s.dv},${s.pic}`)
      }
      return trace.join('|')
    }
    expect(run(2024), 'the same seed must replay exactly').toBe(run(2024))
    // A seeded PRNG makes "it is deterministic" vacuous on its own — vary the
    // INPUT the behaviour depends on and require the trajectory to differ.
    expect(run(2024), 'a different seed must produce a different trajectory').not.toBe(run(9))
  })

  it('never draws from Math.random — the spider is pure (purity.test.ts sweeps core/)', () => {
    const src = readFileSync(join(repoRoot, 'src/core/spider.ts'), 'utf8')
    expect(src.includes('Math.random'), 'spider.ts must draw only from the seeded rng').toBe(false)
  })
})

describe('cp3-1 — project rule enforcement (lang-review/typescript.md)', () => {
  it('rule 1 — the new module defeats the type system nowhere', () => {
    const src = readFileSync(join(repoRoot, 'src/core/spider.ts'), 'utf8')
    for (const escape of ['as any', 'as unknown as', '@ts-ignore', '@ts-nocheck']) {
      expect(src.includes(escape), `spider.ts must not use "${escape}" (typescript.md rule 1)`).toBe(false)
    }
  })

  it('rule 4 — the score/limit arithmetic uses ?? not ||, since 0 is a VALID value', () => {
    // spiderTopLimit legitimately returns 0-valued intermediate steps and the
    // spider's dh is legitimately 0 when parked. `x || fallback` would silently
    // swallow both. This scan is comment-inclusive by repo convention.
    const src = readFileSync(join(repoRoot, 'src/core/spider.ts'), 'utf8')
    const stripped = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(
      /\|\|\s*(?:0x60|SPIDER_TOP_BASE|SPIDER_DV|1|2)\b/.test(stripped),
      'a `||` fallback on a value whose 0 is meaningful (parked dh, a zero step) — use `??`',
    ).toBe(false)
  })

  it('rule 2 — the exported Spider shape is a named interface, not an inline object type', () => {
    const src = readFileSync(join(repoRoot, 'src/core/spider.ts'), 'utf8')
    expect(
      /export\s+interface\s+Spider\b/.test(src),
      'spider.ts must export a named `Spider` interface (sim.ts and render.ts both consume it)',
    ).toBe(true)
  })
})

describe('cp3-1 — the citation gate covers every constant this story transcribes', () => {
  it('files SP-* claims for the spider, byte-verified against the vendored rev-4 tree', () => {
    const claimsDir = join(repoRoot, 'docs/rom-study/claims')
    const claims = readdirSync(claimsDir)
      .filter((f) => f.endsWith('.json'))
      .flatMap((f) => JSON.parse(readFileSync(join(claimsDir, f), 'utf8')) as Array<{ id: string }>)
    const ids = new Set(claims.map((c) => c.id))
    // One claim per transcribed mechanism. The verbatim/byte check itself is
    // tests/audit/citations.test.ts's job; this only pins COVERAGE, so a
    // constant cannot land in spider.ts with no cited source behind it.
    const required = [
      'SP-1', // BUGOFF entry coords (BUGV/BUGH/BUGP/COUNT2)
      'SP-2', // the score-gated V speed + the DIP threshold
      'SP-3', // the rng-picked entry side, |dh| == |dv|
      'SP-4', // the BUG0..BUG7 face cycle and its 4-frame cadence
      'SP-5', // the h-=dh / v-=dv step (the inverted sign)
      'SP-6', // COUNT2, the direction-change branch, and the 0x30 reload
      'SP-7', // the edge guards on the h-direction park
      'SP-8', // the bottom bounce
      'SP-9', // the score-driven top limit
      'SP-10', // OVRLAP bouncing the spider off a segment
      'SP-11', // the off-screen reset through BUGOFF
      'SP-12', // the respawn delay range
      'SP-13', // mushroom eating: the >= 0x38 gate and the cell clear
      'SP-14', // MUSHDC's lower-screen court decrement
      'SP-15', // PLAY's spider h-window (DECIMAL 10)
      'SP-16', // PLAY's spider diamond bound (DECIMAL 14)
      'SP-17', // SHOOT's spider h-window (DECIMAL 10)
      'SP-18', // the proximity bands 0x16 / 0x40
      'SP-19', // the PTS picture codes 0xB6/0xB7/0xB8
      'SP-20', // the on-screen clamp for the points display
      'SP-21', // EXPLOD's spider branch putting the points up
      'SP-22', // the THREE/SIX/NINE CENPIC offsets
      'SP-23', // SHOOT's tail — the COUNT timer that brings a killed spider back
      'SP-24', // BUGMV's picture-class gate — the points-display freeze
    ]
    const missing = required.filter((id) => !ids.has(id))
    expect(missing, `unfiled spider claims: ${missing.join(', ')}`).toEqual([])
  })

  it('records the CENTIP.DOC rev-1 diff for the spider in open-questions.md (epic open question 4)', () => {
    const doc = readFileSync(join(repoRoot, 'docs/rom-study/open-questions.md'), 'utf8')
    expect(
      /cp3-1/.test(doc),
      'open-questions.md must carry a cp3-1 entry diffing CENTIP.DOC:117 (300/600/900) and ' +
        'CENTIP.DOC:201-202 (the 60,000-point bottom-hugging) against the rev-4 code',
    ).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Review regression (cp3-1, Thought Police) — the post-kill lifecycle
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-1 regression — a killed spider must come BACK (SHOOT tail, :2304-2314)', () => {
  const idle = { dh: 0, dv: 0, fire: false } as unknown

  it('runs the full kill -> explosion -> points -> re-park -> walk cycle', async () => {
    await loadCp31()
    const sim = (await import('../src/core/sim')) as Record<string, unknown>
    const createSim = sim.createSim as (seed: number) => Record<string, unknown>
    const stepSim = sim.stepSim as (s: unknown, i: unknown) => Record<string, unknown>

    // Exactly the state resolveSpiderShotHit produces on a kill.
    const killed = stage({ h: 0x80, v: 0x40, pic: SPIDER_EXPLODE_PIC, count: SPIDER_KILL_COUNT, count2: SPIDER_KILL_COUNT })
    let s: Record<string, unknown> = { ...createSim(7), spider: { ...killed, pts: PTS_300 } }

    const pics: number[] = []
    for (let i = 0; i < 600; i++) {
      s = stepSim(s, idle)
      pics.push((s.spider as Spider).pic)
    }

    // The explosion must count down, the points sprite must appear...
    expect(pics.some((p) => p === SPIDER_EXPLODE_DONE), 'the explosion reaches its rest picture').toBe(true)
    expect(pics.some((p) => p === PTS_300), 'the points sprite goes up').toBe(true)
    // ...the spider must be re-parked by the COUNT timer...
    expect(pics.some((p) => p === SPIDER_OFF_PIC), 'BUGOFF re-parks the spider (:2314)').toBe(true)
    // ...and it MUST walk again. Without SHOOT's tail the points sprite is
    // welded to the screen forever: BUGMV freezes on it (:299-300), so COUNT2
    // stops ticking and nothing else in the frame can ever clear it.
    const walking = pics.filter((p) => p >= SPIDER_PIC_MIN && p < SPIDER_PIC_LIMIT)
    expect(walking.length, 'the spider must return to a walking face').toBeGreaterThan(0)
    expect(
      pics[pics.length - 1],
      'and it must not be stuck on the points sprite at the end of the run',
    ).not.toBe(PTS_300)
  })

  it('does not tick the kill timer while the spider is alive and walking (:2310-2311)', async () => {
    const walking = stage({ pic: SPIDER_PIC_MIN, count: 0x80 })
    expect(stepSpiderKillTimer(walking, createRng(1), 0).count, 'a walking spider does not burn COUNT').toBe(0x80)

    // ...but every dead-state picture DOES tick it.
    for (const pic of [SPIDER_EXPLODE_PIC, SPIDER_EXPLODE_DONE, PTS_300, PTS_600, PTS_900, SPIDER_OFF_PIC]) {
      const dead = stage({ pic, count: 0x80 })
      expect(
        stepSpiderKillTimer(dead, createRng(1), 0).count,
        `picture 0x${pic.toString(16)} is a dead state and must burn COUNT`,
      ).toBe(0x7f)
    }
  })
})

describe('cp3-1 regression — the renderer survives EVERY reachable spider picture', () => {
  const idle = { dh: 0, dv: 0, fire: false } as unknown

  it('renders a full post-kill lifecycle without throwing', async () => {
    await loadCp31()
    const sim = (await import('../src/core/sim')) as Record<string, unknown>
    const renderMod = (await import('../src/shell/render')) as Record<string, unknown>
    const createSim = sim.createSim as (seed: number) => Record<string, unknown>
    const stepSim = sim.stepSim as (s: unknown, i: unknown) => Record<string, unknown>
    const render = renderMod.render as (c: unknown, a: unknown, s: unknown, h?: number) => void

    // A recording context + a fake atlas: render() must not throw for any frame.
    const ctx = new Proxy(
      { fillStyle: '', imageSmoothingEnabled: false },
      { get: (t, k) => (k in t ? (t as Record<string, unknown>)[k as string] : () => undefined), set: () => true },
    )
    const atlas = { image: {}, rect: () => ({ sx: 0, sy: 0, sw: 8, sh: 16 }) }

    const killed = stage({ h: 0x80, v: 0x40, pic: SPIDER_EXPLODE_PIC, count: SPIDER_KILL_COUNT, count2: SPIDER_KILL_COUNT })
    let s: Record<string, unknown> = { ...createSim(7), spider: { ...killed, pts: PTS_300 } }

    const seen = new Set<number>()
    for (let i = 0; i < 600; i++) {
      s = stepSim(s, idle)
      seen.add((s.spider as Spider).pic)
      expect(
        () => render(ctx, atlas, s),
        `frame ${i}: render threw on spider picture 0x${(s.spider as Spider).pic.toString(16)}`,
      ).not.toThrow()
    }
    // Prove the sweep actually visited the dangerous states rather than passing
    // by never reaching them.
    expect(seen.has(SPIDER_EXPLODE_DONE), 'the run must pass through the 0xF9 rest picture').toBe(true)
    expect(seen.has(SPIDER_OFF_PIC), 'and through the parked picture').toBe(true)
    expect(seen.has(PTS_300), 'and through the points sprite').toBe(true)
  })
})

describe('cp3-1 review — the ROM measures distance around the BYTE (:2204-2207 SBC/ABS)', () => {
  it('a shot near h=0x02 hits a spider at h=0xFE — 4 apart, not 252', async () => {
    const { resolveSpiderShotHit } = await loadCp31()
    const player = { h: 0x80, v: 0x10 }
    // BUGH legitimately occupies 0xF8-0xFF (BUGOFF parks at 0xFF, :275-276), so
    // this wrap is reachable for the spider specifically. An unwrapped
    // Math.abs reads 252 and misses; the ROM's 8-bit SBC + ABS reads 4.
    const s = stage({ h: 0xfe, v: 0x40 })
    expect(resolveSpiderShotHit({ h: 0x02, v: 0x40, live: true }, s, player).hit, '|dH| wraps to 4 — a hit').toBe(true)
    // ...and the window still CLOSES at 10 in wrapped space, so this is not a
    // blanket "everything near the seam hits".
    const far = stage({ h: 0xf4, v: 0x40 })
    expect(
      resolveSpiderShotHit({ h: 0x02, v: 0x40, live: true }, far, player).hit,
      '|dH| wraps to 14, still outside the decimal-10 window',
    ).toBe(false)
  })

  it('the proximity distance wraps too (:2239-2242)', async () => {
    const { resolveSpiderShotHit } = await loadCp31()
    // Spider just above the byte seam, gun just below it: 6 apart, not 250.
    const player = { h: 0x80, v: 0x02 }
    const s = stage({ h: 0x80, v: 0xfc })
    expect(
      resolveSpiderShotHit({ h: 0x80, v: 0xfc, live: true }, s, player).scored,
      'a wrapped distance of 6 is well inside the near band — 900, not the far 300',
    ).toBe(900)
  })

  it('bcdSub returns real BCD on borrow — 0x00-6 is 0x94, not 0xF4', async () => {
    // Verified through the observable: spiderTopLimit only reads bit 7, which is
    // set for both, so this pins the OUTCOME the ROM produces at every decade
    // rather than the helper's internals.
    const { spiderTopLimit } = await loadCp31()
    for (const score of [0, 10_000, 50_000, 860_000, 900_000, 990_000]) {
      const limit = spiderTopLimit(score)
      expect(limit, `score ${score}: the ceiling stays inside [0x38, 0x60]`).toBeGreaterThanOrEqual(0x38)
      expect(limit, `score ${score}`).toBeLessThanOrEqual(SPIDER_TOP_BASE)
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Review round 2 (cp3-1) — gaps found by the test-quality pass
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-1 review — coverage gaps closed', () => {
  it('cloneState deep-copies the spider (slot 13 always exists)', async () => {
    await loadCp31()
    const sim = (await import('../src/core/sim')) as Record<string, unknown>
    const createSim = sim.createSim as (seed: number) => Record<string, unknown>
    const cloneState = sim.cloneState as (s: unknown) => Record<string, unknown>

    const base = createSim(11)
    const original = { ...base, spider: stage({ h: 0x40, v: 0x30 }) }
    const clone = cloneState(original)
    expect(clone.spider, 'the clone carries a spider').not.toBe(null)
    // Mutating the clone must not reach the original — an ALIASED reference
    // would silently couple a replay to its source.
    ;(clone.spider as Spider).h = 0x99
    expect((original.spider as Spider).h, 'the original is untouched').toBe(0x40)

    // SimState.spider is non-nullable by design: the ROM's INIT calls BUGOFF
    // (:1199) so slot 13 always holds an object, and "no spider on screen" is
    // the PARKED PICTURE, not an absent one. A parked spider must clone like
    // any other — the state that used to be modelled as `null`.
    const parkedClone = cloneState({ ...base, spider: stage({ pic: SPIDER_OFF_PIC, h: SPIDER_OFF_H }) })
    expect((parkedClone.spider as Spider).pic, 'a parked spider survives the clone').toBe(SPIDER_OFF_PIC)
  })

  it('a bottom bounce SKIPS OVRLAP — dv flips once, never twice (:376-378 vs :410-415)', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    // Bottom bound AND an overlapping segment on the post-move row at once.
    // The ROM's 85$ jumps PAST the OVRLAP call, so dv must end up reversed
    // exactly once. Without the `!bounced` guard it flips twice and comes back
    // to +2 — the spider would burrow through the floor.
    const v = SPIDER_BOTTOM_V - 1
    const postV = v - 2
    const out = stepSpider(
      stage({ h: 0x80, v, dh: 2, dv: 2, count2: 20 }),
      field,
      [seg(0x86, postV)],
      ctx(),
    ).spider
    expect(out.dv, 'bounced once, not double-flipped back to +2').toBe(-2)
  })

  it("the `easy` DIP widens stepSpider's V-reversal mask (:332-334)", async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    // "(OPTNS & 40) | 20" — hard masks one bit (reverse ~1/2 of rolls), easy
    // masks two (~3/4). Over a fixed seed sweep, easy must reverse STRICTLY
    // more often, which is only true if the 0x40 bit really joins the mask.
    const countReversals = (easy: boolean): number => {
      let n = 0
      for (let seed = 1; seed <= 128; seed++) {
        const out = stepSpider(
          stage({ v: 0x40, dv: 2, count2: 1 }),
          field,
          [],
          { frame: 1, score: 0, rng: createRng(seed), easy },
        ).spider
        if (out.dv === -2) n++
      }
      return n
    }
    const hard = countReversals(false)
    const easy = countReversals(true)
    expect(hard, 'hard mode still reverses sometimes').toBeGreaterThan(0)
    expect(easy, 'easy mode reverses strictly more often than hard').toBeGreaterThan(hard)
  })

  it('the off-screen reset PRESERVES count (BUGOFF does not touch it)', async () => {
    const { stepSpider } = await loadCp31()
    const field = createPlayfield()
    // Both stage() and createSpider default count to 0, so a test that leaves
    // it at the default cannot tell "preserved" from "reset".
    const out = stepSpider(stage({ h: 0x01, dh: 2, count: 0x42, count2: 20 }), field, [], ctx()).spider
    expect(out.h, 'the spider re-parked').toBe(SPIDER_OFF_H)
    expect(out.count, 'COUNT survives BUGOFF').toBe(0x42)
  })

  it('the kill timer re-parks through BUGOFF at exactly zero (:2312-2314)', async () => {
    const out = stepSpiderKillTimer(stage({ h: 0x33, pic: PTS_300, count: 1 }), createRng(4), 0)
    expect(out.pic, 'BUGOFF stamps the parked picture').toBe(SPIDER_OFF_PIC)
    expect(out.h, 'and the off-screen h').toBe(SPIDER_OFF_H)
    expect(out.v, 'and the entry row').toBe(SPIDER_ENTER_V)
    expect(out.count2, 'and the hide counter').toBe(SPIDER_HIDE_COUNT)
  })

  it('the on-screen clamp leaves its exact boundaries untouched (:2256-2262)', async () => {
    const { resolveSpiderShotHit } = await loadCp31()
    const player = { h: 0x80, v: 0x10 }
    for (const h of [SPIDER_PTS_CLAMP_LO, SPIDER_PTS_CLAMP_HI]) {
      const s = stage({ h, v: 0x20 })
      expect(
        resolveSpiderShotHit({ h, v: 0x20, live: true }, s, player).spider.h,
        `h=0x${h.toString(16)} is exactly ON the boundary and must not move`,
      ).toBe(h)
    }
  })

  it('the entry side follows the CITED rng bit (0x04), not merely "some bit"', async () => {
    const { createSpider } = await loadCp31()
    // "Both signs occur across seeds" would pass for an implementation reading
    // any other bit. Recompute the ROM's actual decision from the SAME rng
    // primitive the module draws with, and require an exact per-seed match.
    for (let seed = 1; seed <= 32; seed++) {
      const expectRng = createRng(seed)
      const byte = nextInt(expectRng, 0x100)
      const s = createSpider(createRng(seed), 0)
      const expectedSign = (byte & 0x04) === 0 ? 1 : -1
      expect(
        Math.sign(s.dh),
        `seed ${seed}: RNGEN byte 0x${byte.toString(16)} bit 2 decides the side (:266)`,
      ).toBe(expectedSign)
    }
  })
})

describe('cp3-1 review — PLAY measures distance around the byte too (:1775-1791)', () => {
  it("kills the player when a respawning spider's h=0xFF meets a gun near h=0x02", async () => {
    const { checkPlayerContact } = await loadCp31()
    // BUGMV's respawn (:430-433) stamps a WALKING picture while h is still the
    // parked 0xFF, so for one frame a live spider sits at 0xFF. The ROM's 8-bit
    // SBC + ABS reads 3 pixels from a gun at 0x02; an unwrapped Math.abs reads
    // 253 and silently skips the death.
    const gun = { h: 0x02, v: 0x10 }
    const respawned = stage({ h: SPIDER_OFF_H, v: gun.v, pic: SPIDER_PIC_MIN })
    expect(checkPlayerContact([], gun, respawned), '|dH| wraps to 3 — inside the decimal-10 window').toBe(true)
  })

  it('does not turn the seam into a blanket hit — the window still closes', async () => {
    const { checkPlayerContact } = await loadCp31()
    const gun = { h: 0x02, v: 0x10 }
    // 0xF4 vs 0x02 wraps to 14, outside both the h window (10) and the sum (14).
    expect(checkPlayerContact([], gun, stage({ h: 0xf4, v: gun.v, pic: SPIDER_PIC_MIN }))).toBe(false)
  })

  it('wraps for SEGMENTS as well — PLAY is one 8-bit routine for every slot', async () => {
    const { checkPlayerContact } = await loadCp31()
    // wrapH already lets a body segment march past 0xFF (centipede.ts CT-13), so
    // the same convention has to hold on the segment path.
    const gun = { h: 0x01, v: 0x10 }
    expect(checkPlayerContact([seg(0xfe, gun.v)], gun), 'a segment 3px away across the seam collides').toBe(true)
  })
})
