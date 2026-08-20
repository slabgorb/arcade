// tests/pt1-15-egg-hatch-grounded-rider.test.ts
//
// Story pt1-15 — RED phase (TEA / Atia). The 2026-08-19 playtest FOLLOW-UP that
// jt9-25 explicitly deferred: the standing-knight vulnerability (EGGLLP,
// JOUSTRV4.SRC:3316). Filed as a p1 bug from the fleet playtest.
//
// ─── THE BUG (playtest 2026-08-19) ───────────────────────────────────────────
// "When an egg hatches, the new enemy appears in the AIR immediately." jt9-25
// built the EGGMAN crack cutscene, but — by the explicit user scope decision of
// 2026-08-04 (see the demo-jt9-25 suite header) — DEFERRED the standing-knight
// phase. So today, the frame the cutscene's PLY4S frame is reached, the egg is
// REPLACED by `remountEnemyProcess` (sim.ts): an AIRBORNE buzzard-enemy that
// materialises at the FAR arena edge (`airborne: true`, `posX =
// REMOUNT_ENTRY_{LEFT,RIGHT}_X`) and flies across. There is no grounded rider and no
// wait for a buzzard to collect it. The `remountEnemyProcess` spawn comment in
// sim.ts confesses it: "the EGGLLP wait, :3316, collapsed to the spawn here; the
// standing knight's own vulnerability is the filed follow-up." THIS story is it.
//
// ─── THE ROM (EGGLND → EGGMAN → EGGLLP, JOUSTRV4.SRC:3224-3319) ───────────────
// After the crack walk reveals the STANDING PLAYER (`LEAY 24,Y  POINT TO STANDING
// PLAYER`, :3313) the hatched knight stands GROUNDED at its hatch spot and LOOPS at
// EGGLLP (:3316) — "WAIT UNTILL BUZZARD COMES OR KILLED BY PLAYER". A SEPARATE,
// RIDERLESS buzzard (`STD PRIDER,Y  & WITHOUT A RIDER`, :3260) flies in "NOT FALLING
// YET" (PVELY=0, :3259) to fetch it. Only after that buzzard mounts (MOUNRI) is the
// rider an airborne threat. So the authentic order is: hatch → rider STANDS on the
// ground → buzzard flies in → mount → threat.
//
// ─── WHAT THESE TESTS PIN (and what they leave to Dev) ───────────────────────
// The OBSERVABLE inversion the bug is about, not an internal representation:
//   • the hatched rider first appears STANDING ON THE GROUND at its hatch spot —
//     not airborne, not at the arena entry edge;
//   • across the whole hatch, no enemy ever flies in airborne from an arena entry
//     edge (the "appears in the air" symptom) — a POSITION magnitude, not a
//     one-frame ordering claim (lang-review TS #29);
//   • the wave still self-clears — the collected rider does become a threat later
//     (guards against a "grounded forever" degenerate fix; preserves jt4-5).
// HOW the grounded rider and the buzzard-collect are represented (a grounded
// enemy state, a terminal egg state, a separate inbound buzzard process) is the
// Dev's call — these invariants hold under any faithful one. See the TEA
// Assessment's Delivery Findings for the structural note (the port carries no
// riderless-buzzard EnemyState today — see enemy.ts's remount-brain PRDIR note).
//
// Node env on purpose (dynamic import of sim.js off disk). Staging helpers mirror
// the demo-jt9-25 / jt9-9 local-factory idiom.

import { describe, it, expect } from 'vitest'
import { loadSim, type SimProcess, type SimState, type EggState } from './helpers/sim-contract.js'
import { withNoPendingEnemies } from './helpers/wave-entry.js'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'

const SEED = 0x1234_5678
const PLAYER1_ID = 1

// The port's remount entry edges + the side split, read from the module under test
// so the "at the edge" discriminator tracks the real ELEFT/ERIGHT (egg.ts).
interface EggEdges {
  REMOUNT_ENTRY_LEFT_X: number
  REMOUNT_ENTRY_RIGHT_X: number
  REMOUNT_HALF_X: number
}
async function loadEggEdges(): Promise<EggEdges> {
  const specifier = ['..', '..', 'src', 'core', 'egg.js'].join('/')
  const mod = (await import(/* @vite-ignore */ specifier)) as Record<string, unknown>
  return {
    REMOUNT_ENTRY_LEFT_X: mod.REMOUNT_ENTRY_LEFT_X as number,
    REMOUNT_ENTRY_RIGHT_X: mod.REMOUNT_ENTRY_RIGHT_X as number,
    REMOUNT_HALF_X: mod.REMOUNT_HALF_X as number,
  }
}

// ─── Staging (the demo-jt9-25 / jt9-9 local-factory idiom) ──────────────────────

function eggOf(over: Partial<EggState>): EggState {
  return {
    posX: 100,
    posY: 40 << 8,
    velX: 0,
    velY: 0,
    bumpX: 0,
    bumpY: 0,
    eggsLeft: 2,
    hitCount: 0,
    pfeet: 1,
    settled: true,
    ...over,
  }
}
/** A SETTLED kill-egg, primed to hatch on the next frame (waitFrames 1). */
function hatchingEggProc(over: Partial<EggState> = {}): SimProcess {
  return { id: 0x1_0000 + 1, cls: 'secondary', nap: 1, period: 1, kind: 'egg', egg: eggOf({ waitFrames: 1, ...over }) }
}
/** A player parked far from the egg so it never collects the hatch itself. */
function playerAt(id: number, posX: number, pixelY: number): SimProcess {
  return {
    id,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    facing: 1,
    mount: 'ostrich',
    entity: {
      posX,
      posY: pixelY << 8,
      velXIndex: 0,
      velXFrac: 0,
      velY: 0,
      timeUp: 1,
      groundState: null,
      plantZ: 0,
      airborne: true,
      animPhase: 0,
    },
  }
}
async function stagedDemo(processes: SimProcess[], wave = 1): Promise<SimState> {
  const dmod = await loadSim()
  const base = dmod.createWaveSim(SEED)
  // jt11-4: empty the transporter waiting room too, or a queued bounder walks into
  // the cutscene and ends the frame walk before the egg has hatched.
  return withNoPendingEnemies({ ...base, wave, sim: { ...base.sim, processes } })
}

const enemiesIn = (d: SimState): SimProcess[] => d.sim.processes.filter((p) => p.kind === 'enemy')
const entityOf = (p: SimProcess) => p.enemy?.entity

/**
 * Step until the hatch first produces a live enemy, or the cap is hit. The staged
 * arena holds only the hatching egg + a parked player, so before the wave clears
 * the ONLY enemy that can appear is the hatch's rider.
 */
async function stepToFirstEnemy(d: SimState, cap = 400): Promise<{ d: SimState; rider: SimProcess | undefined }> {
  const dmod = await loadSim()
  for (let f = 0; f < cap; f++) {
    d = dmod.stepSim(d)
    const es = enemiesIn(d)
    if (es.length > 0) return { d, rider: es[0] }
  }
  return { d, rider: undefined }
}

// A settled egg does not move, so its posX IS the hatch spot. The knight stands
// where the egg was; allow a few px of drift for the cutscene wiggle frames.
const HATCH_SPOT_TOL = 24
// "At the entry edge" — the far-edge fly-in the bug is about. Kept tight so an
// interior pad-spawn from a later wave-advance can never trip it.
const EDGE_TOL = 8
const nearEdge = (x: number, edges: EggEdges): boolean =>
  Math.abs(x - edges.REMOUNT_ENTRY_LEFT_X) <= EDGE_TOL || Math.abs(x - edges.REMOUNT_ENTRY_RIGHT_X) <= EDGE_TOL

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — the hatched rider stands ON THE GROUND at its hatch spot
//        (not airborne at the arena entry edge)
// ═════════════════════════════════════════════════════════════════════════════
describe('pt1-15 AC-1 — the hatched rider first appears grounded at its hatch spot', () => {
  // Both screen sides: a LEFT-half egg's buzzard enters from the RIGHT edge, a
  // RIGHT-half egg's from the LEFT edge. A fix that grounds only one side is caught.
  for (const [side, EGG_X] of [
    ['left half', 100],
    ['right half', 200],
  ] as const) {
    it(`(${side}, egg X=${EGG_X}) the rider is GROUNDED, not airborne`, async () => {
      let d = await stagedDemo([playerAt(PLAYER1_ID, EGG_X === 100 ? 260 : 40, 40), hatchingEggProc({ posX: EGG_X })])
      const { rider } = await stepToFirstEnemy(d)
      const e = rider && entityOf(rider)
      expect(e, 'the hatch produced a rider entity within the frame budget').toBeDefined()
      // TODAY: remountEnemyProcess sets airborne:true — the enemy appears in the air.
      expect(e!.airborne, 'the hatched rider stands on the ground (EGGLLP), not airborne').toBe(false)
      expect(e!.groundState, 'a grounded rider carries a standing groundState, not null').not.toBeNull()
    })

    it(`(${side}, egg X=${EGG_X}) the rider stands at its hatch spot, not the arena entry edge`, async () => {
      const edges = await loadEggEdges()
      let d = await stagedDemo([playerAt(PLAYER1_ID, EGG_X === 100 ? 260 : 40, 40), hatchingEggProc({ posX: EGG_X })])
      const { rider } = await stepToFirstEnemy(d)
      const e = rider && entityOf(rider)
      expect(e, 'the hatch produced a rider entity within the frame budget').toBeDefined()
      // TODAY: the enemy materialises at REMOUNT_ENTRY_{LEFT,RIGHT}_X (~191px away).
      expect(
        Math.abs(e!.posX - EGG_X),
        `the rider stands at the hatch spot ${EGG_X}, not flown in from the edge`,
      ).toBeLessThanOrEqual(HATCH_SPOT_TOL)
      expect(nearEdge(e!.posX, edges), 'the rider is NOT parked at an arena entry edge').toBe(false)
    })
  }
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — no enemy ever flies in airborne from an arena entry edge
//        (the "appears in the air" symptom — a POSITION magnitude, TS-#29)
// ═════════════════════════════════════════════════════════════════════════════
describe('pt1-15 AC-2 — nothing flies in airborne from the arena edge during the hatch', () => {
  it('across the whole hatch, no enemy is airborne AT an entry edge', async () => {
    const dmod = await loadSim()
    const edges = await loadEggEdges()
    let d = await stagedDemo([playerAt(PLAYER1_ID, 260, 40), hatchingEggProc({ posX: 100 })])
    // Bounded so a later wave-advance's interior pad-spawns cannot enter the sample;
    // the grounded knight holds the wave open, so within this window the hatch rider
    // is the only enemy. Long enough to pass the cutscene (~112) and see the remount
    // the current code spawns right after it.
    const offenders: Array<{ f: number; x: number }> = []
    for (let f = 0; f < 220; f++) {
      d = dmod.stepSim(d)
      for (const p of enemiesIn(d)) {
        const e = entityOf(p)
        if (e && e.airborne && nearEdge(e.posX, edges)) offenders.push({ f, x: e.posX })
      }
    }
    // TODAY: remountEnemyProcess puts an airborne buzzard at REMOUNT_ENTRY_RIGHT_X
    // (291) the frame the cutscene ends → offenders is non-empty.
    expect(offenders, 'no enemy flew in airborne from an arena edge').toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — self-clear GUARD: the collected rider still becomes a threat later
//        (green today; must stay green — a grounded-forever fix would egg-lock the
//        wave, so this pins the buzzard-collect resolution jt4-5 depends on)
// ═════════════════════════════════════════════════════════════════════════════
describe('pt1-15 AC-3 — the hatch is not a permanent egg-lock: a threat eventually appears', () => {
  it('within a generous budget the hatched rider resolves to an airborne enemy', async () => {
    const dmod = await loadSim()
    let d = await stagedDemo([playerAt(PLAYER1_ID, 260, 40), hatchingEggProc({ posX: 100 })])
    let sawAirborneThreat = false
    for (let f = 0; f < 1200 && !sawAirborneThreat; f++) {
      d = dmod.stepSim(d)
      if (enemiesIn(d).some((p) => entityOf(p)?.airborne === true)) sawAirborneThreat = true
    }
    expect(sawAirborneThreat, 'the rider is collected by a buzzard and becomes a flying threat').toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — the standing rider is HARMLESS to the player during the hold
//        ("...before it becomes a threat"). Reviewer round-1 HIGH regression guard:
//        the ROM's standing knight is COLLECTED via EGGSCR and can never kill the
//        player (EGGLLP :3316), but a live kind:'enemy' collides by joust height, so a
//        player flying UP into the grounded knight would lose and DIE. The rider is now
//        intangible (collisionEnabled:false + mat) for the hold, so the player passes
//        through unharmed until it wakes.
// ═════════════════════════════════════════════════════════════════════════════
describe('pt1-15 AC-4 — a player cannot die to the standing rider during the hold', () => {
  it('a player overlapping the held rider FROM BELOW is not killed', async () => {
    const dmod = await loadSim()
    const EGG_X = 100
    let d = await stagedDemo([playerAt(PLAYER1_ID, 260, 40), hatchingEggProc({ posX: EGG_X })])
    // Step to the frame the grounded standing rider first exists (parked player far away).
    let rider: SimProcess | undefined
    for (let f = 0; f < 300; f++) {
      d = dmod.stepSim(d)
      const e = enemiesIn(d).find((p) => entityOf(p)?.airborne === false)
      if (e) { rider = e; break }
    }
    const re = rider && entityOf(rider)
    expect(re, 'the grounded standing rider exists').toBeDefined()
    // It must be intangible during the hold — otherwise the joust-height kill is live.
    expect(rider!.collisionEnabled, 'the standing rider is intangible during the hold').toBe(false)
    // Drop a player ON the rider, 6px BELOW it (higher plantHeight => would LOSE the joust
    // if the rider were collidable). With the pre-fix collidable rider this was `player-death`.
    const kx = re!.posX
    const ky = re!.posY >> 8
    const procs = d.sim.processes.filter((p) => p.kind !== 'player')
    procs.push(playerAt(PLAYER1_ID, kx, ky + 6))
    let d2: SimState = { ...d, sim: { ...d.sim, processes: procs } }
    d2 = dmod.stepSim(d2)
    expect(
      d2.cues.some((c) => c.type === 'player-death'),
      'a helpless standing rider must NOT kill the player (before it becomes a threat)',
    ).toBe(false)
    expect(
      d2.sim.processes.some((p) => p.kind === 'player' && p.id === PLAYER1_ID),
      'the player survives the overlap',
    ).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// PROVENANCE — the ROM facts this story rests on (JOUSTRV4.SRC, LF-vendored)
//   Byte-reads only; SKIP where the copyrighted tree is absent (CI). Each pairs the
//   instruction with its own comment so the anchor is the CLAIM, not a bare token
//   (lang-review TS #15). Every read is inside an it() body (the tp1-8 trap).
// ═════════════════════════════════════════════════════════════════════════════
describe.skipIf(!vendoredAvailable)('pt1-15 provenance — EGGLLP: the knight stands and waits', () => {
  const line = (file: string, n: number): string => (sourceLines(file)[n - 1] ?? '').replace(/\s+$/, '')

  it('the cutscene ends on the STANDING PLAYER (:3313)', () => {
    const l = line('JOUSTRV4.SRC', 3313)
    expect(l).toContain('LEAY')
    expect(l.toUpperCase()).toContain('POINT TO STANDING PLAYER')
  })

  it('EGGLLP loops "UNTILL BUZZARD COMES OR KILLED BY PLAYER" (:3316)', () => {
    const l = line('JOUSTRV4.SRC', 3316)
    expect(l).toContain('EGGLLP')
    expect(l).toContain('PCNAP')
    expect(l.toUpperCase()).toContain('WAIT UNTILL BUZZARD COMES OR KILLED BY PLAYER')
  })

  it('the buzzard that comes is created "NOT FALLING YET" (PVELY=0, :3259) — it flies in horizontally', () => {
    const l = line('JOUSTRV4.SRC', 3259)
    expect(l).toContain('PVELY,Y')
    expect(l.toUpperCase()).toContain('NOT FALLING YET')
  })

  it('...and RIDERLESS (:3260) — it becomes a threat only after it mounts the standing man', () => {
    const l = line('JOUSTRV4.SRC', 3260)
    expect(l).toContain('PRIDER,Y')
    expect(l.toUpperCase()).toContain('WITHOUT A RIDER')
  })
})
