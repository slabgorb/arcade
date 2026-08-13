// tests/millipede-split-death.test.ts
//
// Story ml3-2 — RED phase (Leeloo / TEA). The three subsystems that turn the
// ml3-1 free-space train into a killable, splittable millipede, each a PURE
// src/core extension of plugins/millipede/src/core/millipede.ts:
//
//   1. SPLIT-ON-MUSHROOM — OVRLAP overlap detection (MLSUB.MAC:896) + the
//      body->head promotion in MOTION's bottom-row turn (MILLI.MAC:1561-1592):
//      the tail of a body run becomes a NEW head (colour 0x39, HDIR reversed,
//      DV=0 for one line), so one train splits into two.
//   2. PLAY — player collision (MILLI.MAC:1750): a tight hit box against the
//      player; a hit ARMS the player explosion by setting PEXPLD=0x60 and
//      returns "player is dead".
//   3. EXPLOD — the explosion advance (MILLI.MAC:765): the segment picture
//      countdown + score park, and the player-death PEXPLD sequence.
//
// Constants are hand-mirrored from docs/rom-study/claims/11-millipede-split-death.json
// (MS-1..MS-24), byte-cited to the vendored 1982 source. Values are transcribed
// here INDEPENDENTLY (not imported) so the expectations are self-checking, not an
// echo of the module (lang-review #26 — an assertion whose terms are all local to
// the module tests nothing).
//
// ─── THE ACCESSIBILITY CONTRACT (AC-4 — the reason this story exists apart) ───────
// The ROM's player explosion has a FLASHING-COLORS phase (PEXPLD 0x50..0x60) that
// writes the FULL-SCREEN background colour BKGND every frame (MILLI.MAC:809-813).
// That is a photosensitive-epilepsy strobe, and for THIS project accessibility
// OVERRIDES ROM fidelity (the one standing exception to rom-always-wins). So the
// core death reducer models the PEXPLD countdown and its three phases faithfully,
// but the FLASHING phase is exposed as a STEADY signal the shell renders as a
// static/dim freeze — it must NOT cycle a full-screen colour frame-to-frame. The
// freeze-friendly guard below proves the reducer emits no per-frame strobe.
//
// ─── SCOPE — what ml3-2 does NOT own ─────────────────────────────────────────────
// The spider itself and its bestiary tuning are ml4; PLAY's spider hit box is
// pinned here (it is PLAY's own code) but no spider entity is simulated. The shot
// that STARTS a segment exploding is scoring (ml5); EXPLOD's segment ADVANCE is
// pinned, its trigger is not. DDT-cloud explosions (the FRAME&7 branch of EXPLOD)
// are ml4. Mushroom-field probes (OBSTAC) are ml3-3.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// src/core/millipede.ts EXISTS (ml3-1) but exports none of the ml3-2 functions.
// loadSplitDeath() dynamic-imports it and throws a self-describing "not built yet"
// the moment a required export is missing, so every test reddens for the FEATURE's
// absence — never a module-resolution or TS2307 stack trace. The purity sweep in
// tests/purity.test.ts already guards src/core, so new impurity reddens there.

import { describe, it, expect } from 'vitest'

// ─── the ROM constants ml3-2 transcribes (claims 11, MS-*) — hand-mirrored ────────
const HEAD_COLOR = 0x39 // MT-5 (MILLI.MAC:542) — a promoted tail turns this colour (MS-8)
const BODY_COLOR = 0x3d // MT-6 (MILLI.MAC:600)
const VACANT_COLOR = 0x00 // MT-2 (MILLI.MAC:1455)

// OVRLAP (MLSUB.MAC:896)
const OVRLAP_DEAD_MIN = 0xc0 // MS-3 (MLSUB.MAC:903 "CMP I,0C0") — colour >= this ⇒ dead/score, skipped
const OVRLAP_THRESHOLD = 0xf4 // MS-6 (MLSUB.MAC:911 "CMP I,0F4") — the in-front wrap window

// The split (MILLI.MAC:1561-1592)
const SPLIT_BOTTOM_V = 0x09 // MS-7 (MILLI.MAC:1561 "CMP I,9") — split fires at the bottom row (V < 9)

// EXPLOD (MILLI.MAC:765)
const EXPLODE_DONE = 0xfa // MS-15 area (MILLI.MAC:769 "CPY I,0FA") — explosion picture floor
const SCORE_PIC_LO = 0x28 // MS-13 (MILLI.MAC:772 "CPY I,28")
const SCORE_PIC_HI = 0x34 // MS-13 (MILLI.MAC:774 "CPY I,34")
const SCORE_COLOR = 0xff // MS-13 (MILLI.MAC:792 "LDA I,0FF") — parks a score so OVRLAP ignores it
const SCORE_DELAY = 0xa0 // MS-14 (MILLI.MAC:794 "LDA I,0A0")
const PEXPLD_FLASH_MIN = 0x50 // MS-16 (MILLI.MAC:809 "CPX I,60-10" ⇒ 0x60-0x10)
const PEXPLD_SPARKLE_MIN = 0x20 // MS-17 (MILLI.MAC:819 "CPX I,60-40" ⇒ 0x60-0x40)

// PLAY (MILLI.MAC:1750)
const SPIDER_SPDP_LO = 0x14 // MS-20 (MILLI.MAC:1752 "CMP I,14")
const SPIDER_SPDP_HI = 0x1c // MS-20 (MILLI.MAC:1754 "CMP I,1C")
const SPIDER_HIT_DH_MAX = 10 // MS-20 (MILLI.MAC:1765 "CMP I,10." decimal) — spider H box
const HIT_DH_MAX = 0x06 // MS-21 (MILLI.MAC:1769 "CMP I,06") — non-spider: |dH| >= 6 ⇒ miss
const HIT_DV_MAX = 0x06 // MS-22 (MILLI.MAC:1778 "CMP I,6") — |dV| >= 6 ⇒ miss
const HIT_SUM_MAX = 0x0a // MS-23 (MILLI.MAC:1785 "CMP I,0A") — H+V (or H+2V) >= 0x0A ⇒ miss
const PLAY_DELAY = 0x10 // (MILLI.MAC:1795 "STA DELAY")
const PLAYER_EXPLODE_TIMER = 0x60 // MS-24 (MILLI.MAC:1802 "STA PEXPLD") — the death countdown seed

// ─── the contract GREEN (Julia) extends src/core/millipede.ts with ────────────────

/** One millipede segment = one motion-object slot (mirrors ml3-1's Segment). */
interface Segment {
  h: number
  v: number
  dh: number
  dv: number
  pic: number
  color: number
}

type DeathPhase = 'idle' | 'flashing' | 'sparkle' | 'dying' | 'done'

interface SplitDeathModule {
  // constants (MS-*)
  OVRLAP_DEAD_MIN: number
  OVRLAP_THRESHOLD: number
  SPLIT_BOTTOM_V: number
  EXPLODE_DONE: number
  SCORE_PIC_LO: number
  SCORE_PIC_HI: number
  SCORE_COLOR: number
  SCORE_DELAY: number
  PEXPLD_FLASH_MIN: number
  PEXPLD_SPARKLE_MIN: number
  SPIDER_SPDP_LO: number
  SPIDER_SPDP_HI: number
  SPIDER_HIT_DH_MAX: number
  HIT_DH_MAX: number
  HIT_DV_MAX: number
  HIT_SUM_MAX: number
  PLAY_DELAY: number
  PLAYER_EXPLODE_TIMER: number

  /** OVRLAP (MLSUB.MAC:896): does the head at `headIndex` overlap another live
   *  segment just AHEAD of it on the SAME line? Skips vacant slots (colour 0),
   *  dead/score slots (colour >= 0xC0, MS-3), and itself (MS-4). "Ahead" is the
   *  head's own march direction (MS-5); the window is the 0xF4 wrap (MS-6). */
  checkOverlap: (segs: readonly Segment[], headIndex: number) => boolean

  /** The split (MILLI.MAC:1561-1592): when the head at `headIndex` turns at the
   *  bottom row, promote the TAIL of its contiguous body run to a fresh head —
   *  colour 0x39 (MS-8), horizontal direction reversed (MS-9), dv 0 for one line
   *  (MS-10). Returns a NEW array; the input is not mutated. If the slot after the
   *  head is not a body, nothing splits. */
  splitOnTurn: (segs: readonly Segment[], headIndex: number) => Segment[]

  /** PLAY (MILLI.MAC:1750): is `obj` overlapping the `player`? Non-spider box:
   *  |dH| < 6 AND |dV| < 6 AND (|dH|+|dV|) < 0x0A. Spider box (isSpider): wider H
   *  (|dH| < 10) and a V-weighted sum (|dH|+2|dV|) < 0x0A. Returns the hit bool;
   *  the caller arms the death (PLAYER_EXPLODE_TIMER) on true. */
  checkPlayerCollision: (obj: { h: number; v: number }, player: { h: number; v: number }, isSpider?: boolean) => boolean

  /** EXPLOD player branch (MILLI.MAC:803-838): advance one frame of the player
   *  death countdown. `pexpld` <= 0 ⇒ 'idle'. Otherwise decrements by one and
   *  classifies the phase off the PRE-decrement value: the last tick ('done'),
   *  else >= 0x50 'flashing', >= 0x20 'sparkle', else 'dying'. `flashing` is a
   *  STEADY boolean over the whole flashing phase (the shell renders it as a static
   *  freeze — see the freeze-friendly guard). Emits NO per-frame full-screen
   *  colour. */
  stepPlayerDeath: (pexpld: number) => { pexpld: number; phase: DeathPhase; flashing: boolean }

  /** EXPLOD segment branch (MILLI.MAC:765-799): advance one exploding segment.
   *  An explosion picture in (0xFA, 0xFF] counts DOWN toward 0xFA; on reaching the
   *  0xFA floor the slot either parks as a floating score (colour 0xFF so OVRLAP
   *  ignores it, MS-13, with a 0xA0 hold, MS-14) when `points` is given, or clears
   *  to vacant. Returns a NEW segment. */
  stepSegmentExplosion: (seg: Segment, points?: number) => Segment
}

const SPECIFIER = '../src/core/millipede'

async function loadSplitDeath(): Promise<SplitDeathModule> {
  try {
    const mod = (await import(/* @vite-ignore */ SPECIFIER)) as Partial<SplitDeathModule>
    const missing = (
      ['checkOverlap', 'splitOnTurn', 'checkPlayerCollision', 'stepPlayerDeath', 'stepSegmentExplosion'] as const
    ).filter((k) => typeof mod[k] !== 'function')
    if (missing.length > 0) throw new Error(`missing exports: ${missing.join(', ')}`)
    if (typeof mod.PLAYER_EXPLODE_TIMER !== 'number') throw new Error('missing constant PLAYER_EXPLODE_TIMER')
    return mod as SplitDeathModule
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e)
    throw new Error(
      'ml3-2 split/death core not built yet — GREEN (Julia) EXTENDS src/core/millipede.ts with ' +
        'checkOverlap (OVRLAP, MLSUB.MAC:896), splitOnTurn (the body->head promotion, MILLI.MAC:1561-1592), ' +
        'checkPlayerCollision (PLAY, MILLI.MAC:1750), stepPlayerDeath (the FREEZE-FRIENDLY player explosion, ' +
        'MILLI.MAC:803-838 — no per-frame full-screen strobe) and stepSegmentExplosion (EXPLOD segment branch), ' +
        'plus the MS-* constants. Every value is cited in ' +
        'docs/rom-study/claims/11-millipede-split-death.json. ' +
        `(${detail})`,
    )
  }
}

const seg = (o: Partial<Segment>): Segment => ({ h: 0x80, v: 0x80, dh: 2, dv: 2, pic: 0, color: HEAD_COLOR, ...o })

// ═══════════════════════════════════════════════════════════════════════════════
describe('ml3-2 constants — exported exactly as transcribed (MS-*)', () => {
  it('the whole cited constant set matches the byte-verified claims', async () => {
    const m = await loadSplitDeath()
    expect(m.OVRLAP_DEAD_MIN).toBe(OVRLAP_DEAD_MIN)
    expect(m.OVRLAP_THRESHOLD).toBe(OVRLAP_THRESHOLD)
    expect(m.SPLIT_BOTTOM_V).toBe(SPLIT_BOTTOM_V)
    expect(m.EXPLODE_DONE).toBe(EXPLODE_DONE)
    expect(m.SCORE_PIC_LO).toBe(SCORE_PIC_LO)
    expect(m.SCORE_PIC_HI).toBe(SCORE_PIC_HI)
    expect(m.SCORE_COLOR).toBe(SCORE_COLOR)
    expect(m.SCORE_DELAY).toBe(SCORE_DELAY)
    expect(m.PEXPLD_FLASH_MIN).toBe(PEXPLD_FLASH_MIN)
    expect(m.PEXPLD_SPARKLE_MIN).toBe(PEXPLD_SPARKLE_MIN)
    expect(m.SPIDER_SPDP_LO).toBe(SPIDER_SPDP_LO)
    expect(m.SPIDER_SPDP_HI).toBe(SPIDER_SPDP_HI)
    expect(m.SPIDER_HIT_DH_MAX).toBe(SPIDER_HIT_DH_MAX)
    expect(m.HIT_DH_MAX).toBe(HIT_DH_MAX)
    expect(m.HIT_DV_MAX).toBe(HIT_DV_MAX)
    expect(m.HIT_SUM_MAX).toBe(HIT_SUM_MAX)
    expect(m.PLAY_DELAY).toBe(PLAY_DELAY)
    expect(m.PLAYER_EXPLODE_TIMER).toBe(PLAYER_EXPLODE_TIMER)
  })

  it('the death-phase floors are ordered and inside the countdown (0 < sparkle < flash < seed)', async () => {
    const m = await loadSplitDeath()
    // lang-review #29 — pin the actual magnitudes the phase machine turns on, not
    // just that "some ordering" holds.
    expect(m.PEXPLD_SPARKLE_MIN).toBeLessThan(m.PEXPLD_FLASH_MIN)
    expect(m.PEXPLD_FLASH_MIN).toBeLessThan(m.PLAYER_EXPLODE_TIMER)
    expect(m.PEXPLD_SPARKLE_MIN).toBeGreaterThan(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('ml3-2 OVRLAP — a head overlaps a live segment just ahead on the same line (MS-1..6)', () => {
  it('a body a few px AHEAD in the march direction, same line, overlaps', async () => {
    const m = await loadSplitDeath()
    const segs = [seg({ h: 0x80, v: 0x80, dh: 2, color: HEAD_COLOR }), seg({ h: 0x84, v: 0x80, dh: 2, color: BODY_COLOR })]
    expect(m.checkOverlap(segs, 0), 'a segment 4px ahead on the same line overlaps').toBe(true)
  })

  it('a body the same distance BEHIND does NOT overlap (LOOK ONLY IN FRONT OF US, MS-5)', async () => {
    const m = await loadSplitDeath()
    const segs = [seg({ h: 0x80, v: 0x80, dh: 2, color: HEAD_COLOR }), seg({ h: 0x7c, v: 0x80, dh: 2, color: BODY_COLOR })]
    expect(m.checkOverlap(segs, 0), 'a segment behind the head must not count').toBe(false)
  })

  it('"ahead" tracks the head heading: marching LEFT, the ahead side flips', async () => {
    const m = await loadSplitDeath()
    const left = [seg({ h: 0x80, v: 0x80, dh: -2, color: HEAD_COLOR }), seg({ h: 0x7c, v: 0x80, dh: -2, color: BODY_COLOR })]
    expect(m.checkOverlap(left, 0), 'marching left, a segment at lower H is ahead').toBe(true)
    const behindLeft = [seg({ h: 0x80, v: 0x80, dh: -2, color: HEAD_COLOR }), seg({ h: 0x84, v: 0x80, dh: -2, color: BODY_COLOR })]
    expect(m.checkOverlap(behindLeft, 0), 'marching left, a higher-H segment is behind').toBe(false)
  })

  it('a segment on a DIFFERENT line never overlaps (MS-2)', async () => {
    const m = await loadSplitDeath()
    const segs = [seg({ h: 0x80, v: 0x80, dh: 2, color: HEAD_COLOR }), seg({ h: 0x84, v: 0x88, dh: 2, color: BODY_COLOR })]
    expect(m.checkOverlap(segs, 0)).toBe(false)
  })

  it('skips VACANT slots (colour 0) and the head ITSELF (MS-4)', async () => {
    const m = await loadSplitDeath()
    const onlyVacantAhead = [seg({ h: 0x80, v: 0x80, dh: 2, color: HEAD_COLOR }), seg({ h: 0x84, v: 0x80, dh: 2, color: VACANT_COLOR })]
    expect(m.checkOverlap(onlyVacantAhead, 0), 'an empty slot ahead is not an overlap').toBe(false)
    const lone = [seg({ h: 0x80, v: 0x80, dh: 2, color: HEAD_COLOR })]
    expect(m.checkOverlap(lone, 0), 'a head never overlaps itself').toBe(false)
  })

  it('skips a DEAD or SCORE slot ahead (colour >= 0xC0, MS-3) — the EXPLOD 0xFF park is why', async () => {
    const m = await loadSplitDeath()
    const scoreAhead = [seg({ h: 0x80, v: 0x80, dh: 2, color: HEAD_COLOR }), seg({ h: 0x84, v: 0x80, dh: 2, color: SCORE_COLOR })]
    expect(m.checkOverlap(scoreAhead, 0), 'a parked score (0xFF) must not read as a collidable segment').toBe(false)
    // a colour just under the 0xC0 floor is still a live, collidable segment
    const liveAhead = [seg({ h: 0x80, v: 0x80, dh: 2, color: HEAD_COLOR }), seg({ h: 0x84, v: 0x80, dh: 2, color: OVRLAP_DEAD_MIN - 1 })]
    expect(m.checkOverlap(liveAhead, 0), 'colour 0xBF is below the dead floor — a real overlap').toBe(true)
  })

  it('does not mutate the input array (pure reducer)', async () => {
    const m = await loadSplitDeath()
    const segs = [seg({ h: 0x80, v: 0x80, dh: 2, color: HEAD_COLOR }), seg({ h: 0x84, v: 0x80, dh: 2, color: BODY_COLOR })]
    const snapshot = JSON.parse(JSON.stringify(segs))
    m.checkOverlap(segs, 0)
    expect(segs).toEqual(snapshot)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('ml3-2 the split — a body-run tail is promoted to a new head (MS-7..11)', () => {
  it('the TAIL of the contiguous body run becomes a fresh HEAD (colour 0x39, dv 0, HDIR reversed)', async () => {
    const m = await loadSplitDeath()
    // head + three bodies, all one train marching right
    const train = [
      seg({ h: 0x80, dh: 2, color: HEAD_COLOR }),
      seg({ h: 0x78, dh: 2, color: BODY_COLOR }),
      seg({ h: 0x70, dh: 2, color: BODY_COLOR }),
      seg({ h: 0x68, dh: 2, color: BODY_COLOR }),
    ]
    const out = m.splitOnTurn(train, 0)
    expect(out, 'the slot count is unchanged; a body is re-coloured, not added').toHaveLength(4)
    const tail = out[3]
    expect(tail.color, 'the tail of the body run turns into a head colour 0x39 (MS-8)').toBe(HEAD_COLOR)
    expect(tail.dh, 'the new head reverses its horizontal direction (MS-9)').toBe(-2)
    expect(tail.dv, 'the new head does not descend for one line (MS-10)').toBe(0)
    // the segments between the old head and the new head stay body
    expect(out[1].color, 'the interior of the run stays body').toBe(BODY_COLOR)
    expect(out[2].color, 'the interior of the run stays body').toBe(BODY_COLOR)
    expect(out[0].color, 'the original head is untouched').toBe(HEAD_COLOR)
  })

  it('the promotion snaps the new head onto a clean cell line (V & 7 == 0, MS-11)', async () => {
    const m = await loadSplitDeath()
    const train = [seg({ h: 0x80, v: 0x0b, dh: 2, color: HEAD_COLOR }), seg({ h: 0x78, v: 0x0b, dh: 2, color: BODY_COLOR })]
    const out = m.splitOnTurn(train, 0)
    expect(out[1].color).toBe(HEAD_COLOR)
    expect(out[1].v & 0x07, 'a promoted head starts on an 8px cell boundary').toBe(0)
  })

  it('only the RUN behind THIS head splits — a following head bounds the run', async () => {
    const m = await loadSplitDeath()
    // head, body, body, head, body — the first train's run is slots 1..2
    const segs = [
      seg({ h: 0x80, dh: 2, color: HEAD_COLOR }),
      seg({ h: 0x78, dh: 2, color: BODY_COLOR }),
      seg({ h: 0x70, dh: 2, color: BODY_COLOR }),
      seg({ h: 0x60, dh: 2, color: HEAD_COLOR }),
      seg({ h: 0x58, dh: 2, color: BODY_COLOR }),
    ]
    const out = m.splitOnTurn(segs, 0)
    expect(out[2].color, 'slot 2 (the run tail before the next head) is promoted').toBe(HEAD_COLOR)
    expect(out[2].dv, 'the promoted tail gets dv 0').toBe(0)
    expect(out[3].color, 'the already-existing following head is untouched').toBe(HEAD_COLOR)
    expect(out[4].color, "the second train's body is untouched").toBe(BODY_COLOR)
  })

  it('a head with NO body behind it does not split (nothing to promote)', async () => {
    const m = await loadSplitDeath()
    const segs = [seg({ h: 0x80, dh: 2, color: HEAD_COLOR }), seg({ h: 0x78, dh: 2, color: HEAD_COLOR })]
    const out = m.splitOnTurn(segs, 0)
    expect(out.filter((s) => s.color === HEAD_COLOR), 'still two heads, no new one minted').toHaveLength(2)
    expect(out).toEqual(segs)
  })

  it('does not mutate the input array (pure reducer)', async () => {
    const m = await loadSplitDeath()
    const segs = [seg({ h: 0x80, dh: 2, color: HEAD_COLOR }), seg({ h: 0x78, dh: 2, color: BODY_COLOR })]
    const snapshot = JSON.parse(JSON.stringify(segs))
    m.splitOnTurn(segs, 0)
    expect(segs, 'splitOnTurn rebuilds; it must not re-colour the caller in place').toEqual(snapshot)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('ml3-2 PLAY — player collision hit box (MS-20..24)', () => {
  const player = { h: 0x80, v: 0x40 }

  it('a segment exactly on the player is a hit (dH=0, dV=0 — degenerate but real, #21)', async () => {
    const m = await loadSplitDeath()
    expect(m.checkPlayerCollision({ h: 0x80, v: 0x40 }, player), 'zero distance is the clearest hit').toBe(true)
  })

  it('non-spider: a hit needs |dH|<6 AND |dV|<6 AND sum<0x0A (MS-21/22/23)', async () => {
    const m = await loadSplitDeath()
    // just inside: dH=3, dV=3 → sum 6 < 0x0A ⇒ hit
    expect(m.checkPlayerCollision({ h: 0x83, v: 0x43 }, player)).toBe(true)
    // dH at the exclusive edge (6) ⇒ miss (CMP I,06 / BCS)
    expect(m.checkPlayerCollision({ h: 0x86, v: 0x40 }, player), '|dH|=6 is a miss').toBe(false)
    // dV at the exclusive edge (6) ⇒ miss
    expect(m.checkPlayerCollision({ h: 0x80, v: 0x46 }, player), '|dV|=6 is a miss').toBe(false)
    // both under 6 but the SUM reaches 0x0A ⇒ miss (dH=5, dV=5 → 10)
    expect(m.checkPlayerCollision({ h: 0x85, v: 0x45 }, player), 'sum=0x0A is a miss even with each axis < 6').toBe(false)
    // sum 9 (dH=5, dV=4) ⇒ hit
    expect(m.checkPlayerCollision({ h: 0x85, v: 0x44 }, player), 'sum=9 is a hit').toBe(true)
  })

  it('the abs is symmetric — a negative offset hits the same as a positive one', async () => {
    const m = await loadSplitDeath()
    expect(m.checkPlayerCollision({ h: 0x7d, v: 0x3d }, player), '(-3,-3) hits like (+3,+3)').toBe(true)
  })

  it('spider box is WIDER on H (|dH|<10) but V-weighted (dH + 2*dV < 0x0A)', async () => {
    const m = await loadSplitDeath()
    // dH=8 is a MISS for a segment (>=6) but the spider H box reaches 10
    expect(m.checkPlayerCollision({ h: 0x88, v: 0x40 }, player, false), 'segment: |dH|=8 misses').toBe(false)
    expect(m.checkPlayerCollision({ h: 0x88, v: 0x40 }, player, true), 'spider: |dH|=8, 2*dV=0, sum 8 < 0x0A hits').toBe(true)
    // vertical is doubled for a spider: dV=5 ⇒ 2*dV=10 ⇒ sum >= 0x0A ⇒ miss even at dH=0
    expect(m.checkPlayerCollision({ h: 0x80, v: 0x45 }, player, true), 'spider: 2*dV=0x0A misses').toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('ml3-2 EXPLOD — the player death countdown, phased (MS-15..18)', () => {
  it('pexpld 0 (or below) is idle — no explosion in progress', async () => {
    const m = await loadSplitDeath()
    expect(m.stepPlayerDeath(0).phase, 'nothing exploding').toBe('idle')
    expect(m.stepPlayerDeath(0).pexpld, 'idle stays at 0').toBe(0)
  })

  it('each tick decrements PEXPLD by exactly one (MS-15)', async () => {
    const m = await loadSplitDeath()
    expect(m.stepPlayerDeath(PLAYER_EXPLODE_TIMER).pexpld).toBe(PLAYER_EXPLODE_TIMER - 1)
    expect(m.stepPlayerDeath(0x30).pexpld).toBe(0x2f)
  })

  it('classifies the phase off the PRE-decrement value at the cited floors (#14 — edges pinned)', async () => {
    const m = await loadSplitDeath()
    // seed 0x60 and the top of the flashing band are FLASHING (>= 0x50)
    expect(m.stepPlayerDeath(PLAYER_EXPLODE_TIMER).phase).toBe('flashing')
    expect(m.stepPlayerDeath(PEXPLD_FLASH_MIN).phase, '0x50 is still flashing (>=)').toBe('flashing')
    // one below the flash floor is SPARKLE
    expect(m.stepPlayerDeath(PEXPLD_FLASH_MIN - 1).phase, '0x4F drops to sparkle').toBe('sparkle')
    expect(m.stepPlayerDeath(PEXPLD_SPARKLE_MIN).phase, '0x20 is still sparkle (>=)').toBe('sparkle')
    // one below the sparkle floor is DYING
    expect(m.stepPlayerDeath(PEXPLD_SPARKLE_MIN - 1).phase, '0x1F drops to dying').toBe('dying')
    // the final tick (pexpld 1 -> 0) is DONE (60$ end), regardless of band
    expect(m.stepPlayerDeath(1).phase, 'the last tick ends the explosion').toBe('done')
    expect(m.stepPlayerDeath(1).pexpld).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// AC-4 — THE FREEZE-FRIENDLY GUARD. The ROM's flashing phase strobes BKGND every
// frame; the clone must NOT. This is the accessibility contract that overrides ROM
// fidelity for this project (photosensitive epilepsy). If a future edit reintroduces
// a per-frame full-screen colour cycle, THIS reddens.
// ═══════════════════════════════════════════════════════════════════════════════
describe('ml3-2 EXPLOD — the death sequence is FREEZE-FRIENDLY, no strobe (AC-4)', () => {
  /** Run the whole death from the seed to 0, collecting each frame's state. */
  async function fullDeath(m: SplitDeathModule) {
    const frames: { pexpld: number; phase: DeathPhase; flashing: boolean }[] = []
    let p = PLAYER_EXPLODE_TIMER
    // hard bound so a non-decrementing impl fails loudly instead of looping forever
    for (let guard = 0; guard < 0x200 && p > 0; guard++) {
      const r = m.stepPlayerDeath(p)
      frames.push(r)
      p = r.pexpld
    }
    return frames
  }

  it('the countdown is monotone: pexpld strictly decreases by 1 down to exactly 0', async () => {
    const m = await loadSplitDeath()
    const frames = await fullDeath(m)
    expect(frames[frames.length - 1].pexpld, 'the sequence terminates at 0').toBe(0)
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].pexpld, 'each frame is one below the last — never a jump or a bounce').toBe(frames[i - 1].pexpld - 1)
    }
    expect(frames, 'a 0x60 countdown is 0x60 frames long').toHaveLength(PLAYER_EXPLODE_TIMER)
  })

  it('the phase order never oscillates: flashing → sparkle → dying → done, each contiguous', async () => {
    const m = await loadSplitDeath()
    const order: DeathPhase[] = ['flashing', 'sparkle', 'dying', 'done']
    const frames = await fullDeath(m)
    // the sequence of phases, with consecutive duplicates collapsed, must be a
    // PREFIX-preserving subsequence of the canonical order — no phase reappears
    // after a later one (that would be a visual bounce).
    const seen: DeathPhase[] = []
    for (const f of frames) if (seen[seen.length - 1] !== f.phase) seen.push(f.phase)
    for (let i = 1; i < seen.length; i++) {
      expect(order.indexOf(seen[i]), `phase ${seen[i]} came after ${seen[i - 1]} — the sequence must not go backwards`).toBeGreaterThan(
        order.indexOf(seen[i - 1]),
      )
    }
    expect(seen[0], 'the death opens in the flashing band').toBe('flashing')
  })

  it('NO STROBE: consecutive FLASHING-phase frames differ ONLY in the countdown — no field cycles', async () => {
    const m = await loadSplitDeath()
    const frames = await fullDeath(m)
    const flashing = frames.filter((f) => f.phase === 'flashing')
    expect(flashing.length, 'there is a flashing phase to guard').toBeGreaterThan(1)
    for (const f of flashing) {
      expect(f.flashing, 'the flashing flag is a STEADY signal across the phase (the shell shows a static freeze)').toBe(true)
    }
    // The teeth: if the reducer emitted a full-screen colour (e.g. a `bkgnd` field)
    // that cycled frame-to-frame — the ROM strobe — two adjacent flashing frames
    // would differ in more than `pexpld`. Strip pexpld and require identity.
    for (let i = 1; i < flashing.length; i++) {
      const a = { ...flashing[i - 1], pexpld: 0 }
      const b = { ...flashing[i], pexpld: 0 }
      expect(b, 'a flashing frame must not carry a per-frame-varying colour — that is the strobe AC-4 forbids').toEqual(a)
    }
  })

  it('the flashing flag is FALSE outside the flashing phase (it is not an always-on stub)', async () => {
    const m = await loadSplitDeath()
    const frames = await fullDeath(m)
    for (const f of frames) {
      if (f.phase !== 'flashing') expect(f.flashing, `phase ${f.phase} is not flashing`).toBe(false)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
describe('ml3-2 EXPLOD — the segment explosion advance + score park (MS-13/14)', () => {
  it('an explosion picture in (0xFA,0xFF] counts DOWN toward the 0xFA floor', async () => {
    const m = await loadSplitDeath()
    const out = m.stepSegmentExplosion(seg({ color: HEAD_COLOR, pic: 0xff }))
    expect(out.pic, 'the explosion picture advances one step toward 0xFA').toBe(0xfe)
    expect(out.color, 'still exploding, still on screen').not.toBe(VACANT_COLOR)
  })

  it('reaching the 0xFA floor with POINTS parks the slot as a floating score: colour 0xFF, held 0xA0', async () => {
    const m = await loadSplitDeath()
    const out = m.stepSegmentExplosion(seg({ color: HEAD_COLOR, pic: EXPLODE_DONE + 1 }), 0x30)
    // one step brings pic to 0xFA (the finished floor); the finish parks the score
    expect(out.color, 'a finished explosion with points parks at 0xFF so OVRLAP ignores it (MS-13)').toBe(SCORE_COLOR)
    expect(out.pic, 'the parked score shows the point value in the picture slot').toBe(0x30)
  })

  it('reaching the floor with NO points clears the slot to vacant', async () => {
    const m = await loadSplitDeath()
    const out = m.stepSegmentExplosion(seg({ color: HEAD_COLOR, pic: EXPLODE_DONE + 1 }))
    expect(out.color, 'no points to show ⇒ the slot goes vacant').toBe(VACANT_COLOR)
  })

  it('does not mutate its input segment (pure reducer)', async () => {
    const m = await loadSplitDeath()
    const s = seg({ color: HEAD_COLOR, pic: 0xff })
    const snapshot = JSON.parse(JSON.stringify(s))
    m.stepSegmentExplosion(s)
    expect(s).toEqual(snapshot)
  })
})
