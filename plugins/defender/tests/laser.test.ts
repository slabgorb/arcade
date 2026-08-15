// plugins/defender/tests/laser.test.ts
//
// Story df3-5 — RED phase (Tyr One-Handed / TEA). Laser fire for Defender: the
// player's laser as a cooperative-scheduler (super)process, re-derived from the
// Williams source at reference/original-source/defender/DEFA7.SRC (LFIRE/LASR/LASL/
// LASD) and PHR6.SRC (the LFLG/LCOLRX laser data structure). Pure, clock-free core —
// it is driven by df3-1's scheduler (src/core/scheduler.ts, MERGED); the src/core
// purity sweep (tests/purity.test.ts) scans laser.ts the moment it lands.
//
// SCOPE FENCE (from the story title): df3-5 FIRES and TRAVELS only. Collision AGAINST
// ENEMIES is df4 — the ROM's LCOL/COLIDE calls (DEFA7.SRC:2778-2788, 2828, 2876) are
// deliberately OUT of scope and this suite pins none of them.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// src/core/laser.ts does not exist yet. loadLaser() throws a self-describing "not
// built yet" per test (the scheduler.test.ts / framebuffer.test.ts pattern), so a RED
// failure proves the FEATURE is absent — never a cryptic module-resolution trace.
//
// ─── THE ROM SEMANTICS THIS SUITE PINS ───────────────────────────────────────────
//   LFLG/LCOLRX (PHR6.SRC:301-303) "LASER DATA STRUCTURE": LFLG is the live-laser
//     COUNT (0..4); LCOLRX the colour index (a render field — not pinned here).
//   LFIRE (DEFA7.SRC:2763-2773):
//       LDA LFLG / CMPA #4 / BHS LFIREX   ; at 4 lasers → LFIREX → JMP SUCIDE: the
//                                           fire attempt SPAWNS NOTHING (cap of 4).
//       INC LFLG                          ; under cap → one more live laser (:2766)
//       LDA NPLAD / BPL LASR / JMP LASL   ; spawn side by FACING: NPLAD≥0 (facing
//                                           right) → LASR, else LASL (:2770-2772)
//   LASR — RIGHT laser (DEFA7.SRC:2790-2837):
//       LEAX $704,X / STX PD,U            ; spawn X = shipX + $704 (:2792)
//       LDX PD,U / CMPX #$9800 / BHS LRDIE; die when the LEADING EDGE ≥ $9800 (:2802)
//       LASR1 … LEAX $100,X … BNE LASR1   ; advance the head each tick (:2804-2807)
//       NAP 1,LASR0                       ; sleep 1 tick, resume the travel loop (:2830)
//   LASL — LEFT laser (DEFA7.SRC:2839-2878):
//       LEAX 4,X / STX PD,U               ; spawn X = shipX + $4 (:2841)
//       CMPX #$0500 / BLS LLDIE           ; die when the leading edge ≤ $0500 (:2851)
//       LEAX -$100,X                      ; advance the head LEFTWARD each tick (:2854)
//       NAP 1,LASL0                       ; sleep 1 tick (:2878)
//   LASD (DEFA7.SRC:2885-2886) — the shared death tail:
//       DEC LFLG / JMP SUCIDE             ; off-screen death FREES a slot, then the
//                                           process self-terminates.
//   MKPROC (DEFA7.SRC:82, via scheduler): a fresh process inits PTIME=1, so a laser
//     first TRAVELS on the NEXT stepTick, never on the tick it is fired.
//
// ─── CONTRACT (what GREEN/Dev must build) ────────────────────────────────────────
//   type Facing = 'right' | 'left'                       // mirrors world.ts (PLADIR sign)
//   export const MAX_LASERS = 4                          // the LFLG cap (:2764)
//   export interface Laser {          // a LIVE read-only view (like scheduler's Process)
//     readonly x: number              // PD — the leading-edge screen X, advances/tick
//     readonly facing: Facing         // travel direction
//     readonly alive: boolean         // false once it dies off-screen (LASD)
//   }
//   export interface LaserBank {
//     readonly count: number                    // LFLG — live-laser count
//     readonly lasers: readonly Laser[]          // the live lasers
//     fire(shipX: number, facing: Facing): Laser | null   // LFIRE: null at the cap
//   }
//   export function createLaserBank(sched: Scheduler): LaserBank   // shares ONE scheduler
//
// ─── DESIGN DECISIONS (logged as TEA deviations this session) ─────────────────────
// D1 (coordinate model): the laser lives in the ROM's SCREEN-pointer space (PD), where
//    the death edges $9800/$0500 and the spawn offsets $704/$4 are ROM literals. It is
//    a screen beam, NOT a world-cylinder entity — it does NOT wrap16 (distinct from
//    world.ts). This suite pins those ROM magnitudes, never the module's own constants
//    (lang-review #26/#29), and both facing branches independently (#14).
// D2 (render deferred): the 4-segment beam blit (LASR1/LASR3 draw loops, the FISS
//    "fissle" sparkle table, LCOLRX colour) is RENDER. The pure core models only the
//    LEADING-EDGE travel + off-screen death. So this suite pins the per-tick delta's
//    DIRECTION and CONSTANCY (uniform velocity, faithful to NAP 1/tick) but not an
//    exact pixel step. Concretely: the ROM's head PD advances $400/tick — LASR1 runs
//    `LEAX $100,X` FOUR times per frame (`LDA #4`, :2799-2807) to lay the 4-segment
//    beam — so pinning the core's placeholder STEP=0x100 as an exact magnitude would
//    assert a number the ROM does not use. Direction + constancy only; the true speed
//    is a render/tuning concern, distinct from the fire/travel mechanism df3-5 covers.
// D3 (fire is synchronous, travel is a process): fire() models LFIRE executing — the
//    cap check + INC LFLG + positioning PD — synchronously, and returns the laser
//    handle; its TRAVEL then runs as a scheduler process (NAP 1/tick). The laser is
//    positioned at spawn immediately (ROM STX PD before the loop) but does not MOVE
//    until the first stepTick (MKPROC PTIME=1).
// D4 (facing input): fire() takes a Facing, not the raw NPLAD byte — the ship story
//    (df3-3, not yet built) owns the NPLAD→Facing sign map, exactly as world.ts does.
//    So df3-5 stays independent of the ship (matches the story's depends_on: none).
//
// Purity (D1's "no browser/clock") is enforced by the armed src/core sweep in
// purity.test.ts the moment laser.ts lands — NOT duplicated here (the scheduler.test.ts
// precedent).

import { describe, it, expect } from 'vitest'
import { createScheduler } from '../src/core/scheduler.js'

// Facing mirrors world.ts's exported type (PLADIR sign: right = BPL/positive).
type Facing = 'right' | 'left'

// A live read-only view of one laser (the module returns getter-backed handles, like
// the scheduler's Process view — fields reflect current state).
interface Laser {
  readonly x: number
  readonly facing: Facing
  readonly alive: boolean
}

interface LaserBank {
  readonly count: number
  readonly lasers: readonly Laser[]
  fire: (shipX: number, facing: Facing) => Laser | null
}

interface LaserModule {
  MAX_LASERS: number
  createLaserBank: (sched: ReturnType<typeof createScheduler>) => LaserBank
}

// ROM literals this suite pins — sourced from DEFA7.SRC, NOT from laser.ts's own
// exports (lang-review #26: an assertion whose terms are all local to the module under
// test is vacuous). These are the checkable facts of the Williams source.
const SPAWN_OFFSET_RIGHT = 0x704 // LEAX $704,X (DEFA7.SRC:2792)
const SPAWN_OFFSET_LEFT = 0x4 //   LEAX 4,X    (DEFA7.SRC:2841)
const RIGHT_EDGE = 0x9800 //       CMPX #$9800 BHS LRDIE (DEFA7.SRC:2802-2803)
const LEFT_EDGE = 0x0500 //        CMPX #$0500 BLS LLDIE (DEFA7.SRC:2851-2852)
const CAP = 4 //                   CMPA #4 BHS LFIREX    (DEFA7.SRC:2764)

async function loadLaser(): Promise<LaserModule> {
  try {
    const mod = (await import('../src/core/laser.js')) as Partial<LaserModule>
    if (typeof mod.createLaserBank !== 'function') throw new Error('no `createLaserBank` export')
    if (typeof mod.MAX_LASERS !== 'number') throw new Error('no `MAX_LASERS` export')
    return mod as LaserModule
  } catch (e) {
    throw new Error(
      'src/core/laser.ts not built yet — GREEN (Dev) creates the pure, clock-free laser ' +
        'core re-derived from defender/DEFA7.SRC (LFIRE :2763, LASR :2790, LASL :2839, ' +
        'LASD :2885) and PHR6.SRC:301-303 (LFLG/LCOLRX). Export `MAX_LASERS = 4` and ' +
        '`createLaserBank(sched): LaserBank` with count (LFLG), lasers, and ' +
        'fire(shipX, facing) — each laser a scheduler process that travels one step/tick ' +
        '(NAP 1) and dies off-screen (LASD DEC LFLG). No clock, no Date, no browser ' +
        `surface — the src/core purity sweep scans it. (${(e as Error).message})`,
    )
  }
}

// A fresh (scheduler, bank) pair per test — isolated run-lists, no shared state.
async function freshBank(): Promise<{ sched: ReturnType<typeof createScheduler>; bank: LaserBank; MAX_LASERS: number }> {
  const { createLaserBank, MAX_LASERS } = await loadLaser()
  const sched = createScheduler()
  const bank = createLaserBank(sched)
  return { sched, bank, MAX_LASERS }
}

describe('LFIRE — the laser count LFLG and the cap of 4 (DEFA7.SRC:2763-2773)', () => {
  it('MAX_LASERS is the ROM cap of 4 (CMPA #4, :2764)', async () => {
    const { MAX_LASERS } = await loadLaser()
    expect(MAX_LASERS).toBe(CAP)
  })

  it('a fire under the cap spawns a laser and increments LFLG (INC LFLG, :2766)', async () => {
    const { bank } = await freshBank()
    expect(bank.count).toBe(0)
    const laser = bank.fire(0x2000, 'right')
    expect(laser).not.toBeNull()
    expect(laser!.alive).toBe(true)
    expect(bank.count).toBe(1)
    expect(bank.lasers).toContain(laser)
  })

  it('the 5th concurrent fire is a NO-OP — LFLG stays 4, no laser spawns (BHS LFIREX → SUCIDE)', async () => {
    const { bank } = await freshBank()
    // Fire four without stepping the scheduler, so none has a chance to die: all four
    // stay live and LFLG saturates at the ROM cap.
    for (let i = 0; i < CAP; i++) expect(bank.fire(0x2000, 'right')).not.toBeNull()
    expect(bank.count).toBe(CAP)
    expect(bank.lasers.length).toBe(CAP)

    const overflow = bank.fire(0x2000, 'right') // the 5th — LFLG already 4
    expect(overflow).toBeNull() // spawned nothing
    expect(bank.count).toBe(CAP) // LFLG unchanged — not 5
    expect(bank.lasers.length).toBe(CAP)
  })

  it('LFLG is ONE shared counter across facings — a mix of 4 caps out EITHER facing', async () => {
    const { bank } = await freshBank()
    // LFIRE checks LFLG BEFORE it branches on NPLAD (:2763-2771), so the cap is a single
    // shared budget — not a per-facing pool. Saturate it with a 2-right / 2-left mix.
    expect(bank.fire(0x2000, 'right')).not.toBeNull()
    expect(bank.fire(0x2000, 'left')).not.toBeNull()
    expect(bank.fire(0x2000, 'right')).not.toBeNull()
    expect(bank.fire(0x2000, 'left')).not.toBeNull()
    expect(bank.count).toBe(CAP)

    // A 5th fire of EITHER facing is rejected. A per-facing implementation (two pools of
    // 4, allowing 8 total) would still have room for a 3rd right and a 3rd left — this
    // asserts it does NOT.
    expect(bank.fire(0x2000, 'right')).toBeNull()
    expect(bank.fire(0x2000, 'left')).toBeNull()
    expect(bank.count).toBe(CAP)
  })
})

describe('spawn side + position by FACING (BPL LASR / JMP LASL, :2771-2772)', () => {
  it('facing RIGHT spawns at shipX + $704 (LEAX $704,X, :2792)', async () => {
    const { bank } = await freshBank()
    const shipX = 0x3000
    const laser = bank.fire(shipX, 'right')!
    expect(laser.facing).toBe('right')
    expect(laser.x).toBe(shipX + SPAWN_OFFSET_RIGHT)
  })

  it('facing LEFT spawns at shipX + $4 (LEAX 4,X, :2841) — a DISTINCT offset from right', async () => {
    const { bank } = await freshBank()
    const shipX = 0x3000
    const laser = bank.fire(shipX, 'left')!
    expect(laser.facing).toBe('left')
    expect(laser.x).toBe(shipX + SPAWN_OFFSET_LEFT)
    // A right laser from the SAME ship spawns at a DIFFERENT x — the spawn side is
    // facing-derived, not a single fixed offset. (This reads real code output for both
    // branches, unlike a comparison of two test-local literals.)
    const right = bank.fire(shipX, 'right')!
    expect(right.x).not.toBe(laser.x)
    expect(right.x - laser.x).toBe(SPAWN_OFFSET_RIGHT - SPAWN_OFFSET_LEFT)
  })
})

describe('travel — the laser is a scheduler process (NAP 1/tick, :2830/:2878)', () => {
  it('does NOT move on the tick it is fired — first travel is the NEXT stepTick (MKPROC PTIME=1)', async () => {
    const { sched, bank } = await freshBank()
    const shipX = 0x3000
    const spawn = shipX + SPAWN_OFFSET_RIGHT
    const laser = bank.fire(shipX, 'right')!
    // Positioned at spawn (STX PD before the loop) but NOT yet advanced — a fresh
    // process inits PTIME=1, so no travel has happened before the first stepTick.
    expect(laser.x).toBe(spawn)
    // Exactly ONE stepTick runs the process for the first time → it advances once.
    sched.stepTick()
    expect(laser.x).not.toBe(spawn)
    expect(laser.x).toBeGreaterThan(spawn) // toward the right edge
  })

  it('a RIGHT laser advances by a CONSTANT positive step each tick (LEAX $100 head, +dir)', async () => {
    const { sched, bank } = await freshBank()
    // Spawn far from the right edge so it survives several travel ticks.
    const laser = bank.fire(0x1000, 'right')!
    const xs: number[] = [laser.x]
    for (let i = 0; i < 4; i++) {
      sched.stepTick()
      xs.push(laser.x)
    }
    const deltas = [xs[2] - xs[1], xs[3] - xs[2], xs[4] - xs[3]]
    // Moved toward the right edge…
    expect(deltas[0]).toBeGreaterThan(0)
    // …at a uniform velocity (one NAP-gated step per tick).
    expect(deltas[1]).toBe(deltas[0])
    expect(deltas[2]).toBe(deltas[0])
    expect(laser.alive).toBe(true)
  })

  it('a LEFT laser advances by a CONSTANT negative step each tick (LEAX -$100 head, -dir)', async () => {
    const { sched, bank } = await freshBank()
    // Spawn far from the left edge so it survives several travel ticks.
    const laser = bank.fire(0x8000, 'left')!
    const xs: number[] = [laser.x]
    for (let i = 0; i < 4; i++) {
      sched.stepTick()
      xs.push(laser.x)
    }
    const deltas = [xs[2] - xs[1], xs[3] - xs[2], xs[4] - xs[3]]
    expect(deltas[0]).toBeLessThan(0) // moves left
    expect(deltas[1]).toBe(deltas[0]) // uniform velocity
    expect(deltas[2]).toBe(deltas[0])
    expect(laser.alive).toBe(true)
  })
})

describe('off-screen death frees a slot (LASD DEC LFLG, :2885)', () => {
  it('a RIGHT laser reaches the right edge $9800, dies, and DECREMENTS LFLG', async () => {
    const { sched, bank } = await freshBank()
    // Spawn well left of the right edge so it must TRAVEL to reach it.
    const laser = bank.fire(0x1000, 'right')!
    expect(laser.x).toBeLessThan(RIGHT_EDGE)

    // Track the last TWO live positions: the one that triggers death (lastAliveX) and
    // the one a tick earlier (prevAliveX). The pair BRACKETS the edge — asserting only
    // "died somewhere past the edge" does not pin the edge (a too-far edge would still
    // die past it); asserting the tick before was still INSIDE does.
    let prevAliveX = laser.x
    let lastAliveX = laser.x
    let ticks = 0
    while (bank.count > 0 && ticks < 1000) {
      if (laser.alive) {
        prevAliveX = lastAliveX
        lastAliveX = laser.x
      }
      sched.stepTick()
      ticks++
    }
    expect(bank.count).toBe(0) // LFLG decremented back to 0 (LASD)
    expect(laser.alive).toBe(false) // the process self-terminated
    expect(bank.lasers).not.toContain(laser)
    expect(lastAliveX).toBeGreaterThanOrEqual(RIGHT_EDGE) // crossed the ROM edge…
    expect(prevAliveX).toBeLessThan(RIGHT_EDGE) // …and was still inside it one tick before
    expect(ticks).toBeGreaterThan(1) // it TRAVELLED — not instant death
  })

  it('a LEFT laser reaches the left edge $0500, dies, and DECREMENTS LFLG', async () => {
    const { sched, bank } = await freshBank()
    // Spawn well right of the left edge so it must TRAVEL leftward to reach it.
    const laser = bank.fire(0x8000, 'left')!
    expect(laser.x).toBeGreaterThan(LEFT_EDGE)

    // Bracket the LEFT edge the same way (see the right-death test): the death-triggering
    // position crossed below $0500, and the tick before was still above it. Without the
    // prevAliveX bound, a mutated-too-small edge (dying far past $0500, even negative)
    // would still satisfy `lastAliveX <= LEFT_EDGE`.
    let prevAliveX = laser.x
    let lastAliveX = laser.x
    let ticks = 0
    while (bank.count > 0 && ticks < 1000) {
      if (laser.alive) {
        prevAliveX = lastAliveX
        lastAliveX = laser.x
      }
      sched.stepTick()
      ticks++
    }
    expect(bank.count).toBe(0)
    expect(laser.alive).toBe(false)
    expect(bank.lasers).not.toContain(laser)
    expect(lastAliveX).toBeLessThanOrEqual(LEFT_EDGE) // crossed the LEFT ROM edge…
    expect(prevAliveX).toBeGreaterThan(LEFT_EDGE) // …and was still inside it one tick before
    expect(ticks).toBeGreaterThan(1)
  })

  it('a freed slot is REUSABLE — after four lasers die, a fresh fire succeeds again', async () => {
    const { sched, bank } = await freshBank()
    // Saturate the cap with four right-facing lasers, then run the scheduler until
    // every one has flown off-screen and freed its slot.
    for (let i = 0; i < CAP; i++) bank.fire(0x1000, 'right')
    expect(bank.count).toBe(CAP)
    let ticks = 0
    while (bank.count > 0 && ticks < 1000) {
      sched.stepTick()
      ticks++
    }
    expect(bank.count).toBe(0) // all four freed their LFLG slots

    // The cap is a live COUNT, not a lifetime budget: firing works again.
    const reused = bank.fire(0x1000, 'right')
    expect(reused).not.toBeNull()
    expect(bank.count).toBe(1)
  })

  it('frees the RIGHT laser mid-flight while another still travels (removal by identity)', async () => {
    const { sched, bank } = await freshBank()
    // Two lasers at DIFFERENT spawn positions so they die on different ticks: one spawned
    // one step from the edge, one far away. This exercises a slot freed while another is
    // still live — and because the two records have distinct x, it distinguishes correct
    // removal-by-identity from a bug that removed the wrong record by matching value.
    const dying = bank.fire(0x9000, 'right')! // spawn 0x9704 — dies in ~2 ticks
    const living = bank.fire(0x1000, 'right')! // spawn 0x1704 — a long way to go
    expect(bank.count).toBe(2)

    let ticks = 0
    while (dying.alive && ticks < 100) {
      sched.stepTick()
      ticks++
    }
    expect(dying.alive).toBe(false) // the near one flew off-screen…
    expect(living.alive).toBe(true) // …and ONLY it was removed — the far one still lives
    expect(bank.lasers).toContain(living)
    expect(bank.lasers).not.toContain(dying)
    expect(bank.count).toBe(1)

    // A fresh fire succeeds while a laser is still airborne — the freed slot is reusable
    // mid-flight, not only after a full drain.
    const fresh = bank.fire(0x1000, 'left')
    expect(fresh).not.toBeNull()
    expect(bank.count).toBe(2)
  })

  it('rejects a fire from a non-finite shipX — no immortal laser, no LFLG leak', async () => {
    const { sched, bank } = await freshBank()
    // A NaN/Infinity leading edge can never satisfy offScreen() (NaN >= edge is false),
    // so an unguarded laser would sleep forever and permanently occupy an LFLG slot.
    // fire() must reject it outright: spawn nothing, leave the count untouched.
    expect(bank.fire(Number.NaN, 'right')).toBeNull()
    expect(bank.fire(Number.POSITIVE_INFINITY, 'left')).toBeNull()
    expect(bank.count).toBe(0)

    // And the bank still works normally afterwards — the rejects left no wedged state.
    const ok = bank.fire(0x1000, 'right')
    expect(ok).not.toBeNull()
    expect(bank.count).toBe(1)
    // It travels and dies like any other laser (no leaked immortal process lingering).
    let ticks = 0
    while (bank.count > 0 && ticks < 1000) {
      sched.stepTick()
      ticks++
    }
    expect(bank.count).toBe(0)
  })
})
