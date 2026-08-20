// tests/pt1-16-enemy-troll-survivable.test.ts
//
// Story pt1-16 — "joust: enemies are too vulnerable to lava — a screen can be
// cleared by waiting for them to suicide." RED authored by O'Brien (TEA).
//
// ─── THE PLAYTEST OBSERVATION, RESOLVED TO ONE DEFECT ────────────────────────
// The story names two suspects: (a) enemy flap/altitude AI that fails to avoid
// the lava, and (b) "the troll grab is survivable for AI." TEA measured (a)
// before RED: a wave of parked-player bounders orbits y∈[50,210] for 40 s and
// NEVER reaches the kill plane (DEATH_Y = FLOOR+7 = 230) — zero suicides. The
// direct-flight avoidance (LINET's $D0 lane hold, the bounder brake, the hunter/
// shadow BOLAVA divert) is already faithful. The defect is (b): the LAVA TROLL.
//
// ─── THE ROM (JOUSTRV4.SRC, verified by TEA before RED) ──────────────────────
// A gripped bird is NOT frozen: the troll only swaps its GRAVITY. PADGRA is
// patched to ADDLAV (:1651-1652) — but ADDLAV ("ADD IN LAVA TROLLS GRAVITY",
// :6608-6642) is invoked from INSIDE the ordinary flying flap/flip loop
// (FLAPST/FLIPST → `JSR [PADGRA,U]`, :6170/:6197). Every wing cycle the gripped
// bird still runs AIROVR → `JSR [PJOY,U]` (:6459) to read its joystick. For an
// ENEMY, [PJOY,U] is its BRAIN, which writes CURJOY (SHDN/BOUNDR/… `STD CURJOY`).
// So a gripped enemy's own AI keeps flapping, and ADDLAV's break-free test
// `CMPD #-$0180 / BLT ADLFRE` (:6616) is reachable by EITHER kind — the routine
// is a shared vtable entry, and the `IFN DEBUG` note at :6525 documents that
// "ONLY PLAYERS & EMIES SHOULD GET HERE." The grab itself is kind-blind:
// LNDB7 grips "THE PLAYER OR ENEMY" (:6764-6772).
//
// The escape is only possible DURING THE GRACE WINDOW. PATCH1 seeds the pull at
// the wave's base LAVGRA (CLVGRA = LAVGRA, :6395) — DYWORD starts $0004/$0006/
// $0008 (:7305), far below the flap impulse (-96, ADDFLP). PATCH2 (:6374-6386)
// holds that pull for 30 s (LAVKLL = 30*60), then grows it +1/frame to the $500
// cap, which is "arithmetically inescapable." So: grip within grace ⇒ a flapping
// bird (player OR enemy) breaks free; grip at the cap ⇒ it drowns regardless.
//
// ─── THE INFIDELITY ON develop ───────────────────────────────────────────────
// `stepTrolls`' grip branch (sim.ts) reads the gripped victim's flap from the
// HUMAN input map — `inputs?.[victim.id] ?? NEUTRAL_INPUT`.
// An AI enemy has no entry, so it is pinned to NEUTRAL_INPUT forever: it never
// flaps, `gs.escaped` is unreachable, and EVERY grabbed enemy drowns — even at
// base pull 4/6/8 where a player trivially flaps out. That is precisely "a screen
// can be cleared by waiting": from wave 4 on, the shore troll picks off enemies
// one by one and none can survive the grip. TEA measured it — a player at pull 8
// escapes; an enemy at pull 8/20/45 always drowns.
//
// ─── WHAT THIS FILE PINS ─────────────────────────────────────────────────────
//   AC1 (RED)   — a gripped enemy in the GRACE window is SURVIVABLE: grabbed,
//                 then it breaks free via its own AI flap (grippedBy clears while
//                 it is alive ABOVE the lava) and never sounds enemy-lava-death.
//   AC1-anchor  — the identical grace fixture IS escapable: a gripped PLAYER
//                 flapping out breaks free. (Proves the setup is winnable, so the
//                 enemy's drown is the defect, not an inescapable grip.)
//   AC2 (GUARD) — the fix must not grant enemies immunity: a gripped enemy at the
//                 post-grace $500 CAP still drowns. Green on develop and after.
//
// The Dev fix: `stepTrolls` must drive a gripped ENEMY's grip flap from its AI
// brain decision (its synthetic CURJOY), not from the human `inputs` map — the
// same brain that flies it when it is not gripped.
//
// node env (dynamic import of the modules off disk). This header never spells the
// vitest env directive as a token.

import { describe, it, expect } from 'vitest'
import { loadSim, type SimState, type SimProcess, type EntityState, type PlayerInput } from './helpers/sim-contract.js'
import { withNoPendingEnemies } from './helpers/wave-entry.js'

const SEED = 0x1234

// ROM scalars (JOUSTRV4.SRC:37 FLOOR = $DF).
const FLOOR = 0xdf
const DEATH_Y = FLOOR + 7 // 230 — the ADGFLR lava kill plane
const PULL_CAP = 0x500 // the escalated grip's $500 cap (troll.ts) — inescapable
const GRACE_FRAMES = 30 * 60 // LAVKLL: the 30 s grace before the pull escalates (troll.ts)
// A base-LAVGRA pull: the wave-1 DYWORD start is $0008 (:7305), well under the
// flap impulse, so a flapping bird breaks free during the grace.
const BASE_PULL = 0x08

const ISLAND = 40 // a keep-alive island buzzard, clear of the grip point

// ─── Fixtures (the jt13-11 / lava-troll-enemy-grip-drown idiom) ──────────────

function entityAt(posX: number, pixelY: number, over: Partial<EntityState> = {}): EntityState {
  return {
    posX,
    posY: pixelY << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 0,
    groundState: null,
    plantZ: 0,
    airborne: true,
    ...over,
  }
}

const stander = (posX: number): EntityState =>
  entityAt(posX, 210, { airborne: false, groundState: 'stand', posY: 210 << 8 })

function enemyAt(id: number, posX: number, entity: EntityState, over: Partial<SimProcess> = {}): SimProcess {
  return {
    id,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'enemy',
    enemy: { entity, facing: 1, pchase: 1, brain: 'boundr', decision: 'boundr', plavt: 1 },
    enemyType: 'bounder',
    collisionEnabled: false,
    ...over,
  } as SimProcess
}

function playerAt(id: number, posX: number, pixelY: number): SimProcess {
  return {
    id,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    facing: 1,
    mount: 'ostrich',
    entity: entityAt(posX, pixelY),
  } as SimProcess
}

/** A troll ALREADY holding a grip on `victimId`, with an explicit pull + grace so a
 *  test can place the grip in the escapable grace window or at the inescapable cap. */
function trollGripping(victimId: number, posX: number, pixelY: number, pull: number, killTimer: number): SimProcess {
  return {
    id: 0x15_0000 + victimId,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'troll',
    facing: 1,
    collisionEnabled: true,
    victimId,
    grip: { pull, killTimer },
    entity: entityAt(posX, pixelY),
  } as SimProcess
}

const enemyIn = (d: SimState, id: number): SimProcess | undefined =>
  d.sim.processes.find((p) => p.kind === 'enemy' && p.id === id)
const playerIn = (d: SimState, id: number): SimProcess | undefined =>
  d.sim.processes.find((p) => p.kind === 'player' && p.id === id)
const grippedByOf = (p: SimProcess | undefined): number | undefined =>
  (p as { grippedBy?: number } | undefined)?.grippedBy
const pixelYOf = (p: SimProcess | undefined): number | undefined => {
  const e = (p?.kind === 'enemy' ? p.enemy?.entity : p?.entity) as EntityState | undefined
  return e ? e.posY >> 8 : undefined
}

/** A wave-4 sim (the troll is active once the bridge has burned) carrying the given
 *  cast plus a keep-alive island buzzard so the wave never advances mid-test. */
async function trollSim(cast: SimProcess[]): Promise<SimState> {
  const smod = await loadSim()
  const base = smod.createWaveSim(SEED, 1)
  return withNoPendingEnemies({
    ...base,
    wave: 4,
    sim: { ...base.sim, processes: [...cast, enemyAt(0x201, ISLAND, stander(ISLAND))] },
    arena: { ...base.arena, bridgeBurned: true },
  })
}

const NEUTRAL: PlayerInput = { dir: 0, flap: false, flapHeld: false }

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — a gripped enemy in the grace window is SURVIVABLE (breaks free via its AI).
//
// RED on develop: `stepTrolls`' grip branch freezes the enemy to NEUTRAL_INPUT,
// so it never flaps, never escapes, and drowns — enemy-lava-death fires and the
// grip is only ever released by the drown, never by a break-free. GREEN: the grip
// flap is driven by the enemy's brain, so the pulled-down bounder flaps out.
// ═════════════════════════════════════════════════════════════════════════════
describe('pt1-16 — a lava-troll grip on an enemy is survivable during the grace window', () => {
  it('a gripped enemy breaks free via its own AI flap and does not drown', async () => {
    const smod = await loadSim()
    const VICTIM_ID = 0x202
    const trollId = 0x15_0000 + VICTIM_ID
    const enemy = { ...enemyAt(VICTIM_ID, 100, entityAt(100, DEATH_Y - 3)), grippedBy: trollId } as SimProcess
    let d = await trollSim([enemy, trollGripping(VICTIM_ID, 98, DEATH_Y - 6, BASE_PULL, GRACE_FRAMES)])

    // Non-vacuity: the fixture really does start with the troll gripping the enemy.
    expect(grippedByOf(enemyIn(d, VICTIM_ID)), 'the fixture stages a committed grace grip on the enemy').toBe(trollId)

    let brokeFree = false
    let drowned = false
    let scoredEscape = false
    // The enemy climbs clear of the troll's reach (LAVVI3) — a slow struggle, not a
    // mash-to-escape-velocity, so give it the grace window rather than a handful of frames.
    for (let i = 0; i < 480 && !brokeFree && !drowned; i++) {
      d = smod.stepSim(d)
      for (const c of d.cues) if (c.type === 'enemy-lava-death') drowned = true
      if (d.events.some((e) => e.kind === 'score' && (e as { reason?: string }).reason === 'escape')) scoredEscape = true
      const en = enemyIn(d, VICTIM_ID)
      const y = pixelYOf(en)
      // A genuine break-free: still alive, no longer gripped, and ABOVE the lava
      // plane (not the transient ungrip the drown itself performs at FLOOR+7).
      if (!drowned && en && grippedByOf(en) === undefined && y !== undefined && y < DEATH_Y) brokeFree = true
    }

    // RED on develop: the enemy is frozen (no brain flap), so it drowns instead of
    // flapping out — the wave depletes by waiting, which is the reported bug.
    expect(drowned, 'a gripped enemy in the grace window must NOT drown — its AI flaps it clear').toBe(false)
    expect(brokeFree, 'the gripped enemy breaks free of the troll and survives above the lava').toBe(true)
    // An enemy climbing free scores NOTHING — the break-free 50 is the PLAYER's award.
    // Crediting it would restore "free points for waiting", the flip side of the bug.
    expect(scoredEscape, 'an enemy break-free awards no escape score').toBe(false)
  })

  it('ANCHOR: the identical grace grip is escapable — a gripped PLAYER flaps free', async () => {
    const smod = await loadSim()
    const PID = 1
    const trollId = 0x15_0000 + PID
    const victim = { ...playerAt(PID, 100, DEATH_Y - 3), grippedBy: trollId } as SimProcess
    let d = await trollSim([victim, trollGripping(PID, 98, DEATH_Y - 6, BASE_PULL, GRACE_FRAMES)])

    expect(grippedByOf(playerIn(d, PID)), 'the fixture stages a committed grace grip on the player').toBe(trollId)

    let brokeFree = false
    let drowned = false
    for (let i = 0; i < 240 && !brokeFree && !drowned; i++) {
      // The human flaps out — the escape the enemy is currently denied.
      d = smod.stepSim(d, { [PID]: { dir: 0, flap: i % 2 === 0, flapHeld: false } })
      for (const c of d.cues) if (c.type === 'player-lava-death') drowned = true
      const pl = playerIn(d, PID)
      const y = pixelYOf(pl)
      if (!drowned && pl && grippedByOf(pl) === undefined && y !== undefined && y < DEATH_Y) brokeFree = true
    }

    // This is the control: it holds on develop TODAY. It proves the grace grip is a
    // winnable setup, so AC1's enemy drown is the infidelity — not a rigged fixture.
    expect(drowned, 'a flapping player is not drowned by a grace-window grip').toBe(false)
    expect(brokeFree, 'a flapping player breaks free of the grace-window grip').toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 (GUARD) — the fix must not make enemies immune to the troll. Past the 30 s
// grace, at the $500 pull cap, a gripped enemy still drowns — "arithmetically
// inescapable" even flapping. Green on develop (frozen ⇒ drowns) and after the fix
// (brain flaps, but -96 cannot beat +1280). Pins the escapable/lethal boundary.
// ═════════════════════════════════════════════════════════════════════════════
describe('pt1-16 — a gripped enemy at the escalated $500 cap still drowns', () => {
  it('an enemy gripped past the grace (pull at the cap) is pulled under and sounds SNELAV', async () => {
    const smod = await loadSim()
    const VICTIM_ID = 0x202
    const trollId = 0x15_0000 + VICTIM_ID
    const enemy = { ...enemyAt(VICTIM_ID, 100, entityAt(100, DEATH_Y - 3)), grippedBy: trollId } as SimProcess
    // killTimer: 1 ⇒ grace already spent; pull already at the cap.
    let d = await trollSim([enemy, trollGripping(VICTIM_ID, 98, DEATH_Y - 6, PULL_CAP, 1)])

    let drowned = false
    for (let i = 0; i < 200 && !drowned; i++) {
      d = smod.stepSim(d, { [VICTIM_ID]: NEUTRAL })
      for (const c of d.cues) if (c.type === 'enemy-lava-death') drowned = true
    }

    expect(drowned, 'at the $500 cap the grip is inescapable — the enemy drowns even with its AI flapping').toBe(true)
  })
})
