// tests/newhd-factory.test.ts
//
// Story cp2-10 — RED phase (O'Brien / TEA). NEWHD, the head factory
// (CENTI4.MAC:1643-1687): once a head reaches the bottom row it arms NEWD
// (CT-23/89), and thereafter — every COUNT1 frames, while the player is not
// dead (DELAY==0) — a FRESH single-segment head is dropped into a dead motion-
// object slot down in the player's zone (MOBJV=0x40), entering from one of two
// mirror edges picked by a single RNGEN read (CT-84/85). This story lifts the
// determinism deferral cp2-5 took: it injects the FIRST rng entropy into the
// motion loop, so every test here is SEEDED and replayable.
//
// ─── WHY THESE REDDEN ────────────────────────────────────────────────────────
// The factory is not built. stepSim carries no `newd`/`count1`/`count3` state
// and never spawns a fresh head, so:
//   • AC-1: no head ever appears at MOBJV=0x40 → the coord/side/cadence asserts fail.
//   • AC-2: no rng draw ever happens → the schedule is empty → determinism asserts fail.
//   • AC-3: a factory head can never be spawned-then-killed → the "wave still
//           ends only when the factory heads are cleared too" asserts fail, and
//           `newd` is never cleared on wave re-lay (CT-90).
// The two clearly-labelled CONTROLS (the DELAY gate, and the all-dead wave still
// re-entering) are green now and MUST stay green through GREEN — they guard the
// Dev against wiring the spawn where it reopens a clearing wave or fires mid-death.
//
// tsc stays clean at RED: the not-yet-built SimState fields are reached through a
// `SimExt` intersection cast (the cp2-5 idiom), and every ROM constant is a
// LOCAL literal cited to its claim — nothing imports a symbol that doesn't exist.

import { describe, it, expect } from 'vitest'
import {
  CENT_BOTTOM_V,
  CENT_BOUNCE_TOP_V,
  type Segment,
} from '../src/core/centipede'
import {
  createSim,
  stepSim,
  cloneState,
  DEATH_DELAY,
  PLAYER_EXPLODE_START,
  type SimState,
} from '../src/core/sim'

// ─── ROM constants (rev-4 CENTI4.MAC, .RADIX 16), each cited to its claim ─────
const NEWHD_SPAWN_V = 0x40 // CT-81 (:1666 "LDA I,40" / :1668 STA MOBJV) — the player-zone entry row
const NEWHD_SPAWN_DV = 2 // CT-82 (:1671 "LDA I,2" ;NEW BUG GOES FAST)
const NEWHD_HEAD_PIC = 0x00 // CT-80 (:1664 "LDA I,0" ;MAKE HEAD PICTURE) — plain head, NOT CENTPC's 0x03
const NEWHD_SIDE_A_H = 0xfc // CT-83/84 (:1669 "LDA I,0FC") — RNGEN bit1 SET side
const NEWHD_SIDE_A_DH = 2 // CT-84 (A still 0x02 at :1685 STA MOBJDH)
const NEWHD_SIDE_B_H = 0x04 // CT-85 (:1682 "LDA I,4") — RNGEN bit1 CLEAR side
const NEWHD_SIDE_B_DH = -2 // CT-85 (:1684 "LDA I,-2")
const NEWHD_COUNT_INIT = 0xc0 // CT-88 (:1195 "LDA I,0C0") — initial COUNT1/COUNT3 (~3 s)

// The extended SimState the factory must carry. Read by name; absent today, so
// the reads are `undefined` and the assertions redden (cp2-5 SimExt idiom).
type SimExt = SimState & {
  segs: Segment[]
  delay: number
  wave: number
  gameOver: boolean
  playerExplode: number
  restorMem: number
  /** CT-23/89/90: the factory-armed flag — set when a plain head reaches the
   *  bottom, cleared on wave re-lay. */
  newd: boolean
  /** CT-78/88: the per-frame down-counter; a spawn is attempted at 0. */
  count1: number
  /** CT-87/88: the ramping spawn interval. */
  count3: number
}
const ext = (s: SimState) => s as SimExt

const NO_INPUT = { dh: 0, dv: 0, fire: false } as const

/** Overlay the factory state onto a base sim (tsc-clean: the widening cast is
 *  legal because the literal is a superset of SimState). */
function withFactory(s: SimState, patch: Partial<SimExt>): SimExt {
  return { ...(s as SimExt), ...patch } as SimExt
}

const vacant = (): Segment => ({ h: 0, v: 0, dh: 0, dv: 0, pic: 0xff }) // dead slot (bit 7 set)
const isVacant = (seg: Segment) => (seg.pic & 0x80) !== 0
const isLiveHead = (seg: Segment) => (seg.pic & 0x80) === 0 && (seg.pic & 0x40) === 0

/** A fresh factory head is the only thing that ever sits at exactly MOBJV=0x40
 *  (the train enters at 0xF8; bounced segments cap at 0x30 < 0x40) — so a live
 *  head at 0x40 unambiguously marks the frame it was spawned. */
const factoryHeadAt40 = (segs: Segment[]): Segment | undefined =>
  segs.find((seg) => seg.v === NEWHD_SPAWN_V && isLiveHead(seg))

/** Build an isolated factory scenario: no mushrooms, one high live decoy so the
 *  array is never all-dead by accident, and `vacantSlots` dead slots to fill. */
function scenario(seed: number, count1: number, count3: number, vacantSlots: number): SimExt {
  const base = createSim(seed)
  base.playfield.cells.fill(0) // isolate the factory from mushroom-triggered turns
  const segs: Segment[] = [{ h: 0x80, v: 0x20, dh: 2, dv: 2, pic: 0x03 }] // a live decoy at v=0x20
  for (let i = 0; i < vacantSlots; i++) segs.push(vacant())
  return withFactory(base, { segs, newd: true, count1, count3, delay: 0 })
}

// ─── AC-1: createSim boots the factory DISARMED (CT-88/90) ───────────────────
describe('cp2-10 NEWHD — createSim boots the factory disarmed (AC-1, CT-88/90)', () => {
  it('newd is false and COUNT1/COUNT3 seed to 0xC0 at boot', () => {
    const s = ext(createSim(0x1234))
    expect(s.newd, 'the factory is disarmed until a head reaches the bottom (CT-90)').toBe(false)
    expect(s.count1, 'COUNT1 seeds to 0xC0 (CT-88)').toBe(NEWHD_COUNT_INIT)
    expect(s.count3, 'COUNT3 seeds to 0xC0 (CT-88)').toBe(NEWHD_COUNT_INIT)
  })
})

// ─── AC-1: NEWD arms when a plain head reaches the bottom (CT-23/89) ──────────
describe('cp2-10 NEWHD — NEWD arms when a head reaches the bottom (AC-1, CT-23/89)', () => {
  it('a lone head descending to the bottom row arms newd; it was disarmed before', () => {
    // A head one short march above the bottom, on the wave-1 even parity so the
    // CT-72/73 bounce lands it exactly on v=8 (never below).
    // cp2-16 re-seat: h moved 0x80 -> 0x40, OFF the default gun's column. The
    // original staging descended straight through the gun's PLAY diamond, and
    // under the ROM frame order (MOTION's PLAY at :1449 + the :1805-1806
    // stamp) that head now correctly dies WITH the player before reaching the
    // bottom row. The intent here — a live head reaching v=8 arms NEWD — is
    // position-orthogonal, so the head descends clear of the gun instead.
    let s = withFactory(createSim(0x2001), {
      segs: [{ h: 0x40, v: 0x0a, dh: 2, dv: 2, pic: 0x03 }],
      newd: false,
      count1: 0xff,
      count3: 0xff,
      delay: 0,
    })
    s.playfield.cells.fill(0)

    expect(s.newd, 'disarmed before any head reaches the bottom').not.toBe(true)

    let sawBottom = false
    let armed = false
    for (let f = 0; f < 40; f++) {
      s = ext(stepSim(s, NO_INPUT))
      if (s.segs.some((seg) => isLiveHead(seg) && seg.v <= CENT_BOTTOM_V)) sawBottom = true
      if (s.newd === true) armed = true
    }
    expect(sawBottom, 'scenario sanity: the lone head does reach the bottom row').toBe(true)
    expect(armed, 'NEWD arms once a plain head reaches the bottom (CT-23/89)').toBe(true)
  })
})

// ─── AC-1: a fresh head backfills a dead slot at the exact ROM coords ─────────
describe('cp2-10 NEWHD — a fresh head enters at the ROM coords/side (AC-1, CT-79/80/81/82/83/84/85)', () => {
  it('once armed, the factory drops a plain head into a dead slot at V=0x40, dv=+2, on a mirror side', () => {
    let s = scenario(0x3001, 0, 4, 6) // count1=0 → spawn as soon as eligible; 6 dead slots
    let spawned: Segment | undefined
    for (let f = 0; f < 8 && !spawned; f++) {
      s = ext(stepSim(s, NO_INPUT))
      spawned = factoryHeadAt40(s.segs)
    }
    expect(spawned, 'the factory drops a fresh head into a dead slot (v=0x40)').toBeDefined()
    const head = spawned as Segment
    expect(head.pic, 'the fresh head is picture 0x00 — a plain head (CT-80)').toBe(NEWHD_HEAD_PIC)
    expect(head.v, 'it enters in the player zone at MOBJV=0x40 (CT-81)').toBe(NEWHD_SPAWN_V)
    expect(head.dv, 'it descends fast at MOBJDV=+2 (CT-82)').toBe(NEWHD_SPAWN_DV)

    const sideA = head.h === NEWHD_SIDE_A_H && head.dh === NEWHD_SIDE_A_DH
    const sideB = head.h === NEWHD_SIDE_B_H && head.dh === NEWHD_SIDE_B_DH
    expect(
      sideA || sideB,
      `the fresh head enters from a mirror edge — (0xFC,+2) or (0x04,-2) (CT-83/84/85); got (h=${head.h}, dh=${head.dh})`,
    ).toBe(true)
  })

  it('the factory fills the HIGHEST-index dead slot first (CT-79 scan 11..0)', () => {
    // Slots 0..5 live decoys (parked high, away from player + spawn), 6..11 dead.
    const base = createSim(0x3002)
    base.playfield.cells.fill(0)
    const segs: Segment[] = []
    for (let i = 0; i < 6; i++) segs.push({ h: 0x40 + i * 8, v: 0x20, dh: 2, dv: 2, pic: 0x03 })
    for (let i = 6; i < 12; i++) segs.push(vacant())
    let s = withFactory(base, { segs, newd: true, count1: 0, count3: 4, delay: 0 })

    let spawnFrame = -1
    for (let f = 0; f < 8 && spawnFrame < 0; f++) {
      s = ext(stepSim(s, NO_INPUT))
      if (factoryHeadAt40(s.segs)) spawnFrame = f
    }
    expect(spawnFrame, 'a fresh head spawned within the cadence budget').toBeGreaterThanOrEqual(0)
    expect(s.segs[11].v, 'the fresh head lands in the HIGHEST-index dead slot (11)').toBe(NEWHD_SPAWN_V)
    expect(isLiveHead(s.segs[11]), 'slot 11 now holds a live head').toBe(true)
    for (let i = 6; i < 11; i++) {
      expect(isVacant(s.segs[i]), `lower dead slot ${i} is left untouched until slot 11 is filled`).toBe(true)
    }
  })

  it('the factory never exceeds NCENT live segments — no spawn when all 12 slots are live (CT-79 cap)', () => {
    const base = createSim(0x3003)
    base.playfield.cells.fill(0)
    // 12 live decoys parked at v=0x20 (never near the player or the 0x40 row).
    const segs: Segment[] = []
    for (let i = 0; i < 12; i++) segs.push({ h: 0x30 + i * 8, v: 0x20, dh: 2, dv: 2, pic: 0x03 })
    let s = withFactory(base, { segs, newd: true, count1: 0, count3: 2, delay: 0 })

    let maxLive = 0
    for (let f = 0; f < 60; f++) {
      s = ext(stepSim(s, NO_INPUT))
      const live = s.segs.filter((seg) => !isVacant(seg)).length
      maxLive = Math.max(maxLive, live)
      expect(factoryHeadAt40(s.segs), `frame ${f}: no fresh head may spawn while all slots are live`).toBeUndefined()
    }
    expect(maxLive, 'the live population never exceeds NCENT (12)').toBeLessThanOrEqual(12)
  })
})

// ─── AC-2: RNGEN — seeded, deterministic spawn schedule (CT-84) ──────────────
describe('cp2-10 RNGEN — the spawn schedule is seeded and deterministic (AC-2, CT-84)', () => {
  /** The ordered sequence of entry sides (each spawn's H) over `frames`. */
  function schedule(seed: number, frames: number): number[] {
    let s = scenario(seed, 0, 2, 8) // count1=0, count3=2 → a spawn every ~3 frames, 8 slots
    const sides: number[] = []
    for (let f = 0; f < frames; f++) {
      s = ext(stepSim(s, NO_INPUT))
      const head = factoryHeadAt40(s.segs)
      if (head) sides.push(head.h)
    }
    return sides
  }

  it('same seed → identical spawn-side schedule (multiple spawns)', () => {
    const a = schedule(0x6161, 40)
    const b = schedule(0x6161, 40)
    expect(a.length, 'the run produced multiple spawns (not a vacuous empty schedule)').toBeGreaterThanOrEqual(2)
    expect(a, 'a seed replays to the identical side schedule').toEqual(b)
    for (const h of a) {
      expect(h === NEWHD_SIDE_A_H || h === NEWHD_SIDE_B_H, `each side is a ROM edge (0xFC/0x04); got ${h}`).toBe(true)
    }
  })

  it('cloneState mid-schedule reproduces the identical remaining schedule (rng + counters deep-copied)', () => {
    let s = scenario(0x6262, 0, 2, 8)
    // Advance to just after the first spawn.
    let firstSeen = false
    for (let f = 0; f < 8 && !firstSeen; f++) {
      s = ext(stepSim(s, NO_INPUT))
      if (factoryHeadAt40(s.segs)) firstSeen = true
    }
    expect(firstSeen, 'the schedule started before cloning').toBe(true)

    const clone = ext(cloneState(s))
    expect(clone.rng, 'clone carries a distinct rng object').not.toBe(s.rng)

    const rest = (state: SimExt): number[] => {
      const sides: number[] = []
      let cur = state
      for (let f = 0; f < 24; f++) {
        cur = ext(stepSim(cur, NO_INPUT))
        const head = factoryHeadAt40(cur.segs)
        if (head) sides.push(head.h)
      }
      return sides
    }
    const fromOriginal = rest(s)
    const fromClone = rest(clone)
    expect(fromOriginal.length, 'more spawns remain after the clone point').toBeGreaterThanOrEqual(1)
    expect(fromClone, 'the clone reproduces the original’s remaining spawn schedule exactly').toEqual(fromOriginal)
  })

  it('the side is rng-driven, not hardcoded — both mirror edges appear across seeds', () => {
    const seen = new Set<number>()
    for (let seed = 0; seed < 64; seed++) {
      let s = scenario(seed, 0, 2, 8)
      for (let f = 0; f < 8; f++) {
        s = ext(stepSim(s, NO_INPUT))
        const head = factoryHeadAt40(s.segs)
        if (head) {
          seen.add(head.h)
          break
        }
      }
    }
    expect(seen.has(NEWHD_SIDE_A_H), 'some seed enters from the 0xFC edge').toBe(true)
    expect(seen.has(NEWHD_SIDE_B_H), 'some seed enters from the 0x04 edge').toBe(true)
    expect(seen.size, 'exactly the two ROM edges are ever used').toBe(2)
  })

  it('idle frames consume no entropy; the spawn is the rng consumer (no ambient randomness)', () => {
    // count1=3 → three idle down-count frames, then a spawn on the fourth.
    let s = scenario(0x6363, 3, 2, 6)
    const seedStart = s.rng.seed
    for (let f = 0; f < 3; f++) {
      s = ext(stepSim(s, NO_INPUT))
      expect(factoryHeadAt40(s.segs), `frame ${f}: no spawn yet (COUNT1 still counting down)`).toBeUndefined()
      expect(s.rng.seed, `frame ${f}: an idle frame draws no entropy`).toBe(seedStart)
    }
    s = ext(stepSim(s, NO_INPUT)) // the spawn frame
    expect(factoryHeadAt40(s.segs), 'the fourth frame spawns a fresh head').toBeDefined()
    expect(s.rng.seed, 'the spawn advanced the seeded rng — the schedule is rng-driven').not.toBe(seedStart)
  })
})

// ─── AC-3: the wave still ends only when ALL live segments are cleared ────────
describe('cp2-10 AC-3 — the wave ends only when train + factory heads are all cleared (CT-62/86/90)', () => {
  it('a live factory head keeps the wave open; killing every live segment then clears it', () => {
    // One high live decoy (the scenario()/CT-79-cap idiom used throughout this
    // file) plus 11 dead slots for the factory to fill. NOT all-12-dead at
    // t=0: the wave-clear poll (CT-62) is evaluated every playing frame and
    // MUST win a race against a due, armed factory (Delivery Finding #1 / the
    // sibling CONTROL below) — an all-dead start would trip that poll on the
    // very first frame, before the factory ever gets to run, and (being
    // indistinguishable from the CONTROL's own all-dead setup) hide whether
    // a spawned head genuinely keeps the wave open.
    const base = createSim(0x7001)
    base.playfield.cells.fill(0)
    const segs: Segment[] = [{ h: 0x80, v: 0x20, dh: 2, dv: 2, pic: 0x03 }] // live decoy, parked away from v=0x40
    for (let i = 0; i < 11; i++) segs.push(vacant())
    let s = withFactory(base, { segs, newd: true, count1: 0, count3: 4, delay: 0 })
    const waveBefore = s.wave

    // Drive until the factory has dropped a fresh head at the exact spawn row.
    let spawned: Segment | undefined
    for (let f = 0; f < 20 && !spawned; f++) {
      s = ext(stepSim(s, NO_INPUT))
      spawned = factoryHeadAt40(s.segs)
    }
    expect(spawned, 'the factory spawned a fresh head into the field (AC-3 setup)').toBeDefined()

    // While a factory head lives, the wave must NOT have re-entered (a fresh
    // 12-live train / advanced wave counter). The wave is still open.
    expect(s.segs.some(isLiveHead), 'a live factory head keeps the wave open').toBe(true)
    expect(s.wave, 'the wave has not re-entered while a factory head lives').toBe(waveBefore)

    // Kill every live segment. The wave-clear (DEAD==0) may now proceed — the
    // factory must NOT keep re-spawning to reopen it (DELAY-gated, CT-71).
    s = withFactory(s, { segs: s.segs.map((seg) => ({ ...seg, pic: 0xff })) })
    let reentered = false
    for (let f = 0; f < 400 && !reentered; f++) {
      s = ext(stepSim(s, NO_INPUT))
      if (s.segs.length === 12 && s.segs.every((seg) => !isVacant(seg)) && s.delay === 0) reentered = true
    }
    expect(reentered, 'clearing every live segment (incl. factory heads) re-enters the wave (CT-62)').toBe(true)
    expect(s.wave, 'the wave counter advanced on re-entry').toBeGreaterThan(waveBefore)
    expect(s.newd, 'the wave re-lay disarms the factory (CT-90)').toBe(false)
  })

  it('a spawned factory head rides the SAME bounce containment and is killable (CT-72/73/86)', () => {
    let s = scenario(0x7002, 0, 8, 6)
    let spawned = false
    for (let f = 0; f < 8 && !spawned; f++) {
      s = ext(stepSim(s, NO_INPUT))
      if (factoryHeadAt40(s.segs)) spawned = true
    }
    expect(spawned, 'a factory head was produced to test containment on').toBe(true)

    // Follow it down: every live segment stays within the ping-pong band, so a
    // factory head can never escape the field (rides CT-72/73 like the train).
    for (let f = 0; f < 2000; f++) {
      s = ext(stepSim(s, NO_INPUT))
      for (const seg of s.segs) {
        if (isVacant(seg)) continue
        expect(seg.v, `frame ${f}: a live segment fell below the floor`).toBeGreaterThanOrEqual(CENT_BOTTOM_V)
        expect(seg.v, `frame ${f}: a live segment rose above the top of the field`).toBeLessThanOrEqual(0xf8)
      }
      // A factory head that has descended into the player zone must sit on the
      // ping-pong band, not run away past the top bound.
      const zoneHeads = s.segs.filter((seg) => isLiveHead(seg) && seg.v <= CENT_BOUNCE_TOP_V && seg.v > CENT_BOTTOM_V)
      for (const h of zoneHeads) {
        expect(h.v, `frame ${f}: a contained head stays under the ping-pong top bound`).toBeLessThanOrEqual(
          CENT_BOUNCE_TOP_V,
        )
      }
    }
  })

  // ─── CONTROL (green now, MUST stay green): the factory must never make the
  // wave permanently unclearable. With every slot dead and the factory armed +
  // due (count1=0), a Dev who spawns BEFORE the wave-clear check would backfill
  // a slot and the wave would never register all-dead → this would hang/fail.
  it('CONTROL: an armed, due factory does NOT reopen a clearing wave (CT-71 DELAY gate)', () => {
    const base = createSim(0x7003)
    base.playfield.cells.fill(0)
    const segs: Segment[] = []
    for (let i = 0; i < 12; i++) segs.push(vacant()) // every slot already dead
    let s = withFactory(base, { segs, newd: true, count1: 0, count3: 2, delay: 0 })
    const waveBefore = s.wave

    let reentered = false
    for (let f = 0; f < 400 && !reentered; f++) {
      s = ext(stepSim(s, NO_INPUT))
      if (s.wave > waveBefore && s.segs.length === 12 && s.segs.every((seg) => !isVacant(seg)) && s.delay === 0) {
        reentered = true
      }
    }
    expect(reentered, 'the all-dead wave still re-enters — the factory does not reopen it').toBe(true)
  })
})

// ─── CONTROL (green now, MUST stay green): the DELAY gate (CT-71) ─────────────
describe('cp2-10 NEWHD — CONTROL: the factory is gated OFF during the death pause (CT-71)', () => {
  it('no fresh head spawns while delay>0 (the player is dead / between waves)', () => {
    const base = createSim(0x8001)
    base.playfield.cells.fill(0)
    const segs: Segment[] = [{ h: 0x80, v: 0x20, dh: 2, dv: 2, pic: 0x03 }]
    for (let i = 0; i < 6; i++) segs.push(vacant())
    // A death pause in progress: delay armed, the player exploding.
    let s = withFactory(base, {
      segs,
      newd: true,
      count1: 0,
      count3: 2,
      delay: DEATH_DELAY,
      playerExplode: PLAYER_EXPLODE_START,
    })

    for (let f = 0; f < DEATH_DELAY && s.delay > 0; f++) {
      s = ext(stepSim(s, NO_INPUT))
      if (s.delay > 0) {
        expect(factoryHeadAt40(s.segs), `frame ${f}: the factory is gated off during the death pause`).toBeUndefined()
      }
    }
  })
})
