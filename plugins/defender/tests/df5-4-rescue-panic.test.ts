// tests/df5-4-rescue-panic.test.ts
//
// Story df5-4 — RED phase, rework cycle 1 (O'Brien / TEA). Close the df4-3 abduction loop:
// the RESCUE catch (a falling humanoid caught by the ship, returned to the surface) and the
// signature PANIC (all humanoids lost → the planet explodes → every remaining lander
// becomes a df4-4 mutant, en masse). Re-derived from DEFB6.SRC / DEFA7.SRC / BLK71.SRC:
//   • catch     — the ROM catch path is AKIL1 (player-vs-FALLING-astro, DEFB6.SRC:398) →
//                 AFALL2 (:945): the caught astro TRACKS the ship (OY16←PLAY16, OX16←PLABX)
//                 and rides down until GETALT (:933-934) reports the terrain, then ALAND0
//                 (:961) leaves it there, walking (P500 is df5-3). The astro's ground row is
//                 the TERRAIN-SURFACE base — BGALT `LDA #$E0` ROFF (BLK71.SRC:380, terrain.ts
//                 BASE_OFFSET) — NOT the ASTS2 wave-spawn row and NOT written by ALAND0.
//   • panic     — ASTCLR `DEC ASTCNT` :432 → `BNE ASTCX` → `NEWP TERBLO,STYPE BLOW UP
//                 TERRAIN` :434 (fires ONCE, the BNE guard); the lander freak GTARG
//                 `LDA ASTCNT / BEQ GTX NOBODY LEFT` :631-633 → `LBEQ SCZ00 NO, FREAK`
//                 :710 → the SCZ00 transform :828.
//
// REWORK (round-1 review, F1/F2): the caught astro is DEPOSITED at the flat terrain base
// ($E0, BGALT) immediately on catch — a documented SIMPLIFICATION of the ROM's per-column
// GETALT landing + AFALL2 ship-tracking descent (see the session Design Deviation; GREEN
// logs it and cites BGALT, not ASTS2/ALAND0). The re-arm must NOT leave a duplicate walk
// process alive (the determinism test below pins single-process / stable entropy).
//
// SCOPE FENCE (encoded here so a later reader sees the boundary in the tests):
//   IN  — the catch (df4-1 collide reuse, re-ground to the terrain base, FALLING-only), the
//         one-shot panic edge, the lander→mutant FREAK feeding df4-4's `transformLander`
//         (REUSE, no re-model), the planet explosion as the df4-2 TERBLO/terrain-blow event
//         routed through the ADR-0005 SAFE presentation, the scheduler-process discipline,
//         and single-process determinism across a rescue re-arm.
//   OUT — the P250/P500 SCORING VALUES (df5-3, score.ts — this story delivers only the
//         MECHANIC); the HUD/render (df7); PER-COLUMN terrain landing + the AFALL2
//         ship-tracking descent (deposit-at-base simplification, deferred); the UNCAUGHT
//         fall ground outcome (AFALL0 fatal / ALAND survivable, DEFB6.SRC:933-960 — a
//         df5-later unit, so a botched rescue leaving an astro at the floor is a known gap).
//
// Every scenario drives the ONE cabinet scheduler (df3 scheduler.ts) — humanoids,
// falling astros and landers are processes, never their own tick. `rand` is injected.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { createScheduler } from '../src/core/scheduler.js'
import { YMIN, YMAX } from '../src/core/world.js'
import type { EnemyDeps } from '../src/core/enemy-motion.js'
import { stepUntil } from './helpers/df4-3-landers-contract.js'
import {
  loadRescuePanic,
  createMutantBank,
  classify,
  assertNoFullFrameStrobe,
  type Query,
  type RescuePanicBank,
} from './helpers/df5-4-rescue-panic-contract.js'

// A generous "eventually" bound: descent/carry/hunt speeds are GREEN's df4-3 placeholders
// (LNDYV is wave RAM), so the abduction scenarios assert the loop REACHES a state, not how
// fast. A loop that never reaches it inside 40k ticks is not wired — the point of RED.
const MAX_TICKS = 40_000

// A fixed injected byte source keeps every scenario reproducible (the sim owns real
// entropy). 0x40 = 64: 64 < WALK_TURN_THRESHOLD(8) is false, so a humanoid walks steadily
// (no turn) and the abduction is deterministic.
const constRand = (): number => 0x40

/** A mid-strip altitude with fall room below it and carry room above. */
const MID_Y = Math.floor((YMIN + YMAX) / 2)

/** Spin up a fresh scheduler + df5-4 bank for one scenario. */
function freshBank(rand: () => number = constRand): {
  sched: ReturnType<typeof createScheduler>
  bank: RescuePanicBank
} {
  const sched = createScheduler()
  const bank = loadRescuePanic().createEnemyBank(sched, rand)
  return { sched, bank }
}

/** A ship collision query centred on (x, y) with an 8×6 PLAPIC-shaped box (COLCHK
 *  DEFA7.SRC:3130 uses `#PLAPIC`, 8 wide × 6 tall) — big enough to overlap a coincident
 *  falling humanoid regardless of the humanoid box GREEN picks. */
function shipAt(x: number, y: number): Query {
  return { x, y, picture: { width: 8, height: 6 } }
}

/** Drive the abduction loop until the single lander is CARRYING the single humanoid, then
 *  shoot it — dropping the humanoid into an AFALL free-fall. Returns the now-falling astro. */
function dropAFallingHumanoid(sched: ReturnType<typeof createScheduler>, bank: RescuePanicBank): { x: number; y: number } {
  bank.spawnHumanoid(0x4000, MID_Y)
  bank.spawnLander(0x4000)
  const caught = stepUntil(sched, () => bank.landers.some((l) => l.carrying), MAX_TICKS)
  expect(caught).toBeGreaterThan(0) // the abduction reached CARRY (precondition wired)

  const carrier = bank.landers.find((l) => l.carrying)
  expect(carrier).toBeDefined()
  bank.killLander(carrier!) // LKIL1 :905 → NEWP AFALL,STYPE :911: the humanoid free-falls

  const falling = bank.humanoids.find((h) => h.state === 'falling' && h.alive)
  expect(falling).toBeDefined()
  return { x: falling!.x, y: falling!.y }
}

// ─────────────────────────────────────────────────────────────────────────────────────
// AC1 — the RESCUE catch: df4-1 collision, FALLING-only, re-ground; not a re-derived overlap
// ─────────────────────────────────────────────────────────────────────────────────────
describe('df5-4 AC1 — the RESCUE catch (AKIL1 DEFB6.SRC:398; ground = terrain base BGALT BLK71.SRC:380)', () => {
  it('exposes the humanoid ground row at the terrain-surface base $E0 (BGALT), exactly', () => {
    // The rescued astro returns to the TERRAIN-SURFACE base row — BGALT ROFF `LDA #$E0`
    // (BLK71.SRC:380 = terrain.ts BASE_OFFSET), the same flat ground sim.ts spawns humanoids
    // at. NOT the ASTS2 wave-spawn line and NOT written by ALAND0 (GREEN cites BGALT + logs the
    // flat-base-vs-per-column-GETALT deviation). Pin the EXACT value, not "> YMIN" (lang-review #29).
    expect(loadRescuePanic().HUMANOID_GROUND_Y).toBe(0xe0)
  })

  it('a ship box overlapping a FALLING humanoid catches it and returns it to the surface', () => {
    const { sched, bank } = freshBank()
    const at = dropAFallingHumanoid(sched, bank)

    const rescued = bank.catchFalling(shipAt(at.x, at.y))
    expect(rescued).toHaveLength(1) // exactly the one falling humanoid was caught

    const h = bank.humanoids.find((x) => x.alive)
    expect(h).toBeDefined()
    expect(h!.state).toBe('walking') // AFALL ended — back on the terrain, not falling
    expect(h!.alive).toBe(true) // a catch SAVES it (it is not consumed)
    expect(h!.y).toBe(loadRescuePanic().HUMANOID_GROUND_Y) // deposited at the terrain base $E0
  })

  it('a ship box NOWHERE NEAR the falling humanoid catches nothing and leaves it falling', () => {
    const { sched, bank } = freshBank()
    const at = dropAFallingHumanoid(sched, bank)

    const rescued = bank.catchFalling(shipAt(at.x + 0x2000, at.y)) // a whole screen away in X
    expect(rescued).toHaveLength(0)
    expect(bank.humanoids.find((h) => h.alive)!.state).toBe('falling') // still in AFALL
  })

  it('does NOT catch a WALKING humanoid the ship overlaps — only FALLING astros are rescuable', () => {
    const { bank } = freshBank()
    const walker = bank.spawnHumanoid(0x4000, MID_Y)
    expect(walker!.state).toBe('walking')

    const rescued = bank.catchFalling(shipAt(0x4000, MID_Y)) // ship sits right on the walker
    expect(rescued).toHaveLength(0) // a walking earthling is not "caught"
    expect(bank.humanoids[0].state).toBe('walking')
  })

  it('rejects a non-finite ship coord (lang-review #21 module boundary): [] , no NaN poisoning', () => {
    const { sched, bank } = freshBank()
    dropAFallingHumanoid(sched, bank)

    expect(bank.catchFalling(shipAt(Number.NaN, MID_Y))).toHaveLength(0)
    // The falling humanoid survived the bad query intact — still falling, still catchable.
    expect(bank.humanoids.find((h) => h.alive)!.state).toBe('falling')
  })

  it('pins the catch box EXTENT to ASTP1 4×8 directly (a ship-only box test passes for any value)', () => {
    // F3 (round-1 review, lang-review #29): the catch RADIUS is HUMANOID_BOX. A boundary test that
    // only moves the SHIP box exercises collide()'s ship-side clause and stays GREEN for ANY
    // HUMANOID_BOX value (review mutation: {400,800} and {1,1} both passed). Pin the extent
    // DIRECTLY, exactly like HUMANOID_GROUND_Y — ASTP1 is 2 bytes ×2px = 4 wide × 8 tall (DEFB6.SRC:1913).
    expect(loadRescuePanic().HUMANOID_BOX).toEqual({ width: 4, height: 8 })
  })

  it('the catch radius is the ASTRO box edge — a ship at HUMANOID_BOX.width misses, one unit inside catches', () => {
    // Build the boundary on the ASTRO's OWN right edge — collide()'s clause `astro.x +
    // HUMANOID_BOX.width > ship.x`, the one that depends on HUMANOID_BOX (NOT the ship box). The ship
    // sits to the RIGHT of the falling astro at coincident Y (8×6 PLAPIC) so only this X edge governs.
    // Offsets are FIXED literals tied to the expected width 4 (NOT read back from HUMANOID_BOX), so a
    // wrong catch-box width reddens; collide's edges are exclusive (COLIDE box pre-test, collision.ts).
    const ASTRO_W = 4 // ASTP1 width (DEFB6.SRC:1913) — a fixed expectation, not derived from HUMANOID_BOX

    // Case A — ship's LEFT edge exactly meets the astro's RIGHT edge (ship.x === astro.x + ASTRO_W):
    // exclusive box ⇒ astro.x + width is NOT > ship.x ⇒ no overlap ⇒ no catch.
    {
      const { sched, bank } = freshBank()
      const at = dropAFallingHumanoid(sched, bank)
      const edgeTouch = bank.catchFalling({ x: at.x + ASTRO_W, y: at.y, picture: { width: 8, height: 6 } })
      expect(edgeTouch).toHaveLength(0) // touching edges do NOT collide (open intervals)
      expect(bank.humanoids.find((h) => h.alive)!.state).toBe('falling')
    }
    // Case B — the ship nudged ONE unit into the astro box (ship.x === astro.x + ASTRO_W - 1): catches.
    {
      const { sched, bank } = freshBank()
      const at = dropAFallingHumanoid(sched, bank)
      const overlap = bank.catchFalling({ x: at.x + ASTRO_W - 1, y: at.y, picture: { width: 8, height: 6 } })
      expect(overlap).toHaveLength(1) // one unit of real overlap into the astro box ⇒ caught
    }
  })

  it('calls the df4-1 collide() seam INSIDE catchFalling, not a re-derived overlap test (AC1)', () => {
    // AC1 is explicit: "the catch uses df4-1 collision, not a re-derived overlap test." Prove the
    // catch CONSUMES collide — anchor to the call site inside catchFalling's own body, not merely the
    // import line (which a hand-rolled AABB could satisfy with an unused import elsewhere; round-1
    // review #25). Same source-scan discipline purity.test.ts uses over src/core.
    const landersSrc = readFileSync(fileURLToPath(new URL('../src/core/landers.ts', import.meta.url)), 'utf8')
    expect(landersSrc).toMatch(/from ['"]\.\/collision\.js['"]/) // imports the shipped seam...
    // ...AND catchFalling's OWN body calls collide() over the falling astros (not a re-derived overlap).
    const start = landersSrc.indexOf('const catchFalling')
    const end = landersSrc.indexOf('const panic', start)
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    expect(landersSrc.slice(start, end)).toMatch(/collide\(/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────
// AC2 — the PANIC: one-shot on the zero-humanoid edge; freak reuses df4-4 transformLander
// ─────────────────────────────────────────────────────────────────────────────────────
describe('df5-4 AC2 — the PANIC (ASTCLR DEC ASTCNT→0 DEFB6.SRC:432; freak GTARG→SCZ00 :710)', () => {
  /** Deplete the humanoids by abduction: 1 humanoid, 2 landers — one abducts it (count→0),
   *  the other is left hunting with no target. Returns the drained bank + scheduler. */
  function drainToPanicEdge() {
    const { sched, bank } = freshBank()
    bank.spawnHumanoid(0x4000, MID_Y)
    bank.spawnLander(0x2000)
    bank.spawnLander(0x8000)
    const drained = stepUntil(sched, () => bank.humanoids.filter((h) => h.alive).length === 0, MAX_TICKS)
    expect(drained).toBeGreaterThan(0) // the abduction actually emptied the field (precondition)
    expect(bank.landers.filter((l) => l.alive).length).toBeGreaterThan(0) // survivors remain to freak
    return { sched, bank }
  }

  it('fires ONCE on the zero-humanoid transition: every alive lander freaks (reachedTop)', () => {
    const { bank } = drainToPanicEdge()

    const result = bank.panic()
    expect(result).not.toBeNull()
    const survivors = bank.landers.filter((l) => l.alive)
    // The FREAK latches the df4-4 transform trigger on EVERY survivor (GTARG-EQ → SCZ00) —
    // "every remaining lander transforms", the core panic invariant.
    expect(survivors.every((l) => l.reachedTop)).toBe(true)
    // The result names the freaked survivors, and each one carries the latched trigger.
    expect(result!.landersFreaked.length).toBeGreaterThan(0)
    expect(result!.landersFreaked.every((l) => l.reachedTop)).toBe(true)
  })

  it('is idempotent — a second (and third) call returns null, so it is NOT a per-frame effect', () => {
    const { bank } = drainToPanicEdge()

    expect(bank.panic()).not.toBeNull() // the one transition
    expect(bank.panic()).toBeNull() // already fired
    expect(bank.panic()).toBeNull() // still fired — no re-arming while at zero
  })

  it('does NOT fire while a humanoid is still alive', () => {
    const { bank } = freshBank()
    bank.spawnHumanoid(0x4000, MID_Y)
    bank.spawnLander(0x4000)
    expect(bank.panic()).toBeNull() // humanoid present → no panic
  })

  it('does NOT fire on a field that NEVER had a humanoid (a 0-count start is not a transition)', () => {
    // The LNDST0 `JMP SCZS0` fresh-wave path (0 astronauts at spawn) spawns mutants directly;
    // it is NOT the mid-wave panic. A level-only `count===0` check would wrongly fire here.
    const { bank } = freshBank()
    bank.spawnLander(0x4000)
    expect(bank.panic()).toBeNull()
  })

  it('the freak REUSES df4-4 transformLander (no re-model): each freaked lander → one mutant', () => {
    const { sched, bank } = drainToPanicEdge()
    bank.panic()

    const deps: EnemyDeps = { rand: () => 0x40, player: () => ({ x: 0, y: MID_Y }), fire: () => {} }
    const mutantBank = createMutantBank(sched, deps)

    const survivors = bank.landers.filter((l) => l.alive)
    const mutants = survivors.map((l) => mutantBank.transformLander(l))
    expect(mutants.every((m) => m !== null)).toBe(true) // every freaked lander transformed
    expect(mutantBank.mutants.length).toBe(survivors.length) // en masse — one mutant each
    // Reuse guard: transformLander refuses a lander that did NOT reach/freak (reachedTop false),
    // so the mutants above exist ONLY because panic() latched the trigger — not a re-model.
    expect(mutantBank.transformLander({ x: 0x100, y: MID_Y, reachedTop: false })).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────
// AC3 — the planet explosion obeys ADR-0005: the df4-2 render guard stays GREEN, safe variant
// ─────────────────────────────────────────────────────────────────────────────────────
describe('df5-4 AC3 — planet explosion via the df4-2 ADR-0005 policy (TERBLO terrain-blow)', () => {
  function panicResult() {
    const { sched, bank } = freshBank()
    bank.spawnHumanoid(0x4000, MID_Y)
    bank.spawnLander(0x2000)
    bank.spawnLander(0x8000)
    stepUntil(sched, () => bank.humanoids.filter((h) => h.alive).length === 0, MAX_TICKS)
    const r = bank.panic()
    expect(r).not.toBeNull()
    return r!
  }

  it('reports the planet explosion as the ROM TERBLO terrain-blow event (DEFB6.SRC:434)', () => {
    expect(panicResult().effectEvent).toBe('terrain-blow')
  })

  it('the explosion classifies as a full-frame strobe rendered by a SAFE (non-raster) variant', () => {
    const policy = classify(panicResult().effectEvent)
    expect(policy.class).toBe('full-frame-strobe') // it IS a screen-wide effect...
    // ...so ADR-0005 substitutes a seizure-safe presentation — never the raw raster strobe.
    expect(['freeze', 'fade', 'particle']).toContain(policy.presentation)
    expect(policy.presentation).not.toBe('raster')
  })

  it('the df4-2 render guard stays GREEN for the panic: a bounded change passes, a full-frame strobe still throws', () => {
    const before = [0x1, 0x2, 0x3, 0x4]
    // The SAFE particle/fade presentation touches part of the frame — the guard must pass it.
    expect(() => assertNoFullFrameStrobe(before, [0x1, 0x2, 0x3, 0x5])).not.toThrow()
    // Sanity that the guard is LIVE (not vacuously passing): a whole-frame inversion still trips it,
    // so if the panic ever rendered the ROM's COM-invert strobe, AC3 would redden.
    expect(() => assertNoFullFrameStrobe(before, before.map((b) => 0xf ^ b))).toThrow(/ADR-0005|strobe/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────
// AC4 — scheduler-process discipline (no per-humanoid rAF/tick); new constant is cited
// ─────────────────────────────────────────────────────────────────────────────────────
describe('df5-4 AC4 — the falling/caught astro is a df3 scheduler process, no self-tick', () => {
  it('a falling humanoid advances ONLY when the scheduler ticks (a process, not its own clock)', () => {
    const { sched, bank } = freshBank()
    dropAFallingHumanoid(sched, bank)

    const y0 = bank.humanoids.find((h) => h.alive)!.y
    // Read again WITHOUT stepping: a self-clocked (rAF/setInterval) fall would have moved on
    // wall-time; a scheduler process cannot advance without a tick.
    const yStill = bank.humanoids.find((h) => h.alive)!.y
    expect(yStill).toBe(y0)

    stepUntil(sched, () => bank.humanoids.find((h) => h.alive)!.y > y0, MAX_TICKS)
    expect(bank.humanoids.find((h) => h.alive)!.y).toBeGreaterThan(y0) // it fell only on ticks
  })

  it('a rescued humanoid stops falling — its AFALL process is retired, not left ticking', () => {
    const { sched, bank } = freshBank()
    const at = dropAFallingHumanoid(sched, bank)
    bank.catchFalling(shipAt(at.x, at.y))

    const rescued = bank.humanoids.find((h) => h.alive)!
    expect(rescued.state).toBe('walking')
    const groundY = rescued.y
    // Step the scheduler hard: a rescued astro must never resume falling BELOW the ground row
    // (a stale AFALL process still on the run-list would drag it past $E0 toward YMAX).
    for (let t = 0; t < 200; t++) sched.stepTick()
    expect(bank.humanoids.find((h) => h.alive)!.y).toBeLessThanOrEqual(groundY) // never fell again
  })

  it('a rescue re-arm leaves EXACTLY ONE live movement process — no duplicate walk (determinism)', () => {
    // F2 (round-1 review, BLOCKING): the walk guard `state !== 'walking'` assumes state only
    // moves forward; the rescue is the first path that cycles it BACK to 'walking'. If the
    // ORIGINAL walk process is still asleep when grab→drop→catch happens with no ticks between
    // (exactly this sequence, and reachable on a fast in-play catch), it REVIVES alongside the
    // freshly-armed one → two walk processes → doubled rand() draws → entropy consumption that
    // depends on catch timing, breaking the sim's determinism guarantee. The y-only "stops
    // falling" test above cannot see it (walking moves x, not y); this one pins the invariant.
    const { sched, bank } = freshBank()
    const at = dropAFallingHumanoid(sched, bank) // grab → killLander (drop), NO ticks elapsed
    bank.catchFalling(shipAt(at.x, at.y)) //         → catch, still NO ticks elapsed
    expect(bank.humanoids.find((h) => h.alive)!.state).toBe('walking')

    // Let every stale/dead process (the killed lander's, the retired AFALL) wake once and SUICIDE.
    // A correctly-armed rescue leaves ONE live process (the single walk); a revived stale walk
    // leaves TWO and never settles.
    for (let t = 0; t < 20; t++) sched.stepTick()
    const live = sched.processes.filter((p) => p.alive)
    expect(live.length).toBe(1)
  })
})
