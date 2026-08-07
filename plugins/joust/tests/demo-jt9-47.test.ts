// tests/demo-jt9-47.test.ts
//
// Story jt9-47 — RED phase (Tyr One-Handed / TEA). Split out of jt9-46 as the
// user directed: jt9-46 made the remount rider VISIBLE, this story fixes the SIM
// bug underneath it. `remountEnemyProcess` (the buzzard a SETTLED egg hatches
// into, in demo.ts) hardcodes `const type: EnemyType = 'bounder'`, then
// `decision: brainFor(type)` and `enemyType: type`. So EVERY hatched bird is a
// bounder regardless of the species
// that laid the egg — a hunter's egg remounts a bounder, losing its b2undr brain
// AND its 750-point value; a shadow lord's loses SHADOW and 1500.
//
// THE FIX (Dev's, GREEN): thread the laying enemy's species across the hatch.
// `EggVictim.enemyType` (the dying enemy's PID) → `spawnEgg` writes it onto
// `EggState.enemyType` → `remountEnemyProcess` reads `egg.enemyType` instead of
// the hardcode. A WAVEGG wave egg has no laying enemy, so `enemyType` is absent
// and the remount falls back to 'bounder' (preserving today's wave-egg behaviour,
// which jt9-46's Group 4 pins).
//
// ROM GROUND TRUTH: the remount (EGGLND/MOUNRI) carries the bird's identity —
// `LDA PEGG,U / STA PEGG,Y` (:3251-3252, PEGG already ported) rides in the same
// record as the species PID and its decision pointer (EGGLND/MOUNRI block
// :3239-3279). A hunter's egg remounts a hunter. The vendored tree is NOT in this
// checkout (sibling a-2); nothing here needs it — these are PORT-BEHAVIOUR pins
// driven through `stepDemo`, not source oracles.
//
// DETERMINISM NOTE (AC-5, Dev's): giving the remount its real brain changes its
// flight, so seeded replay fixtures that hatch a non-bounder and step it WILL
// move. Every pin below is IDENTITY/EVENT-searching (it reads the remount's type,
// brain, score — never a frame-pinned coordinate), so none of these tests will
// need a re-baseline. The moved fixtures are elsewhere and are Dev's separate
// re-baseline commit.

import { describe, it, expect } from 'vitest'
import {
  loadDemo,
  type DemoState,
  type DemoProcess,
  type EnemyType,
  type EnemyState,
} from './helpers/demo-contract.js'
import { loadEgg, type EggVictim } from './helpers/egg-contract.js'
import { loadJoust } from './helpers/joust-collision-contract.js'

const SEED = 0x1234_5678

/** The smart brain each species promotes into — mirrors the port's `brainFor`. */
const BRAIN_FOR: Record<EnemyType, EnemyState['decision']> = {
  bounder: 'boundr',
  hunter: 'b2undr',
  shadowLord: 'shadow',
}

/** The transcribed kill value per species (the `killScore` switch in joust.ts). */
const SCORE_FOR: Record<EnemyType, number> = {
  bounder: 500,
  hunter: 750,
  shadowLord: 1500,
}

const ALL_SPECIES = ['bounder', 'hunter', 'shadowLord'] as const

/** Replace a demo's process list, clearing the event log (jt9-46 idiom). */
const only = (d: DemoState, procs: DemoProcess[]): DemoState => ({
  ...d,
  sim: { ...d.sim, processes: procs },
  events: [],
})

/**
 * A SETTLED egg primed to hatch on the next frame, carrying `species` as the
 * laying enemy's type. Matures through the EGGMAN cutscene into a remount buzzard
 * (the jt9-46 `hatchingEggProc` shape, plus this story's `enemyType`). `eggsLeft`
 * is overridable so the permadeath guard can drive the count to 0.
 */
function hatchingEggProc(
  id: number,
  posX: number,
  pixelY: number,
  species: EnemyType,
  eggsLeft = 2,
): DemoProcess {
  return {
    id,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'egg',
    egg: {
      posX,
      posY: pixelY << 8,
      velX: 0,
      velY: 0,
      bumpX: 0,
      bumpY: 0,
      waitFrames: 1,
      eggsLeft,
      hitCount: 0,
      pfeet: 1,
      settled: true,
      enemyType: species,
    },
  }
}

/**
 * Drive a lone hatching egg through its wait + EGGMAN cutscene until the remount
 * buzzard flies in, and return that `kind:'enemy'` process. Fails the test if no
 * remount appears within the budget (so an assertion below can never be vacuous
 * on a missing remount).
 */
async function driveToRemount(species: EnemyType, eggsLeft = 2): Promise<DemoProcess> {
  const dmod = await loadDemo()
  let d: DemoState = only(dmod.createWaveDemo(SEED), [hatchingEggProc(0x1_0001, 60, 40, species, eggsLeft)])
  let remount: DemoProcess | undefined
  for (let f = 0; f < 800 && !remount; f++) {
    d = dmod.stepDemo(d)
    remount = d.sim.processes.find((p) => p.kind === 'enemy')
  }
  expect(remount, `a settled ${species} egg hatched into a remount buzzard`).toBeDefined()
  return remount!
}

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — a remount PRESERVES the laying species (enemyType survives the hatch)
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-47 AC-1 — the hatched remount keeps the species that laid the egg', () => {
  it('a full drop→settle→hatch cycle remounts as the SAME species, all three', async () => {
    // MUTATION: restoring `const type: EnemyType = 'bounder'` in remountEnemyProcess
    // collapses every remount to 'bounder' and reddens the hunter + shadowLord cases.
    // The bounder case is the control — it must stay green either way.
    for (const species of ALL_SPECIES) {
      const remount = await driveToRemount(species)
      expect(remount.enemyType, `${species} egg → ${species} remount`).toBe(species)
    }
  })

  it('the remount is NOT unconditionally a bounder — a hunter egg is the discriminator', async () => {
    // The single most direct statement of the bug: today this reads 'bounder'.
    const remount = await driveToRemount('hunter')
    expect(remount.enemyType, 'a hatched hunter is a hunter, not a bounder').not.toBe('bounder')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — EggState carries the parent species, set EXPLICITLY at DEATH (spawnEgg)
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-47 AC-2 — spawnEgg records the dying enemy species on the egg', () => {
  /** A DEATH3 victim with sane defaults; override only what a test needs. */
  const victim = (over: Partial<EggVictim> = {}): EggVictim => ({
    posX: 120,
    posY: 90 << 8,
    velX: 4,
    velY: 0,
    eggsLeft: 3,
    ...over,
  })

  it('an egg dropped by each species carries THAT species (threaded, not inferred)', async () => {
    // MUTATION: dropping the field in spawnEgg (so the egg has no enemyType and the
    // remount defaults to bounder) reddens the hunter + shadowLord rows here.
    const e = await loadEgg()
    for (const species of ALL_SPECIES) {
      const egg = e.spawnEgg(victim({ enemyType: species }))
      expect(egg.enemyType, `a dying ${species} lays a ${species} egg`).toBe(species)
    }
  })

  it('the egg species VARIES with the victim — two species yield two different eggs', async () => {
    // A discriminator, not a `.not.toBe('bounder')` (which passes vacuously while
    // the field is undefined). Two different-species victims must produce eggs with
    // DIFFERENT enemyType; a spawnEgg that ignores the victim (both undefined, or
    // both a constant) reddens here.
    const e = await loadEgg()
    const hunterEgg = e.spawnEgg(victim({ enemyType: 'hunter' }))
    const lordEgg = e.spawnEgg(victim({ enemyType: 'shadowLord' }))
    expect(hunterEgg.enemyType, 'a hunter egg and a shadow-lord egg differ in species').not.toBe(
      lordEgg.enemyType,
    )
    expect(hunterEgg.enemyType).toBe('hunter')
    expect(lordEgg.enemyType).toBe('shadowLord')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 (integration) — the DEATH3 KILL SEAM: resolveContacts → spawnEgg wiring
// (round-1 review R1-1: the unit tests above seed the egg's species directly;
//  nothing proved the demo.ts wiring that feeds a REAL kill's species into
//  spawnEgg. Dropping `enemyType: victim.enemyType` from resolveContacts must
//  redden HERE — the story's actual gameplay path, not a hand-built egg.)
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-47 AC-2 (integration) — a killed enemy leaves an egg of ITS species', () => {
  /** A killed enemy of `species` — sits LOWER (larger joust height) so it loses. */
  const enemyVictim = (posX: number, pixelY: number, species: EnemyType, eggsLeft = 3) =>
    ({
      posX, posY: pixelY << 8, velY: 0, velX: 0, plantZ: 0, facing: 1,
      bumpX: 0, bumpY: 0, party: 'enemy', enemyType: species, collision: null,
      groundState: null, eggsLeft,
    }) as never
  /** The winning player — higher lance, so resolveJoust gives it the kill. */
  const playerVictor = (posX: number, pixelY: number) =>
    ({
      posX, posY: pixelY << 8, velY: 0, velX: 0, plantZ: 0, facing: 1,
      bumpX: 0, bumpY: 0, party: 'player', collision: null, groundState: null,
    }) as never

  it('resolveContacts threads the killed enemy species onto the egg — all three', async () => {
    // MUTATION (R1-1): removing `enemyType: victim.enemyType` from resolveContacts
    // makes the egg carry no species and reddens the hunter + shadowLord rows.
    const dmod = await loadDemo()
    for (const species of ALL_SPECIES) {
      const r = dmod.resolveContacts(enemyVictim(120, 40, species), playerVictor(120, 30))
      expect(r.egg?.enemyType, `a killed ${species} leaves a ${species} egg`).toBe(species)
    }
  })

  it('full chain: a REAL killed-hunter egg (no hand-set species) remounts a hunter', async () => {
    // The strongest guard — the species is set ONLY by the kill, then driven all the
    // way to the remount. Take the actual egg resolveContacts produces, settle it (the
    // fall/settle is harness convenience, exactly as hatchingEggProc), and hatch it.
    const dmod = await loadDemo()
    const killed = dmod.resolveContacts(enemyVictim(120, 40, 'hunter', 3), playerVictor(120, 30))
    expect(killed.egg, 'the killed enemy left an egg').not.toBeNull()

    const settledKillEgg: DemoProcess = {
      id: 0x3_0001, cls: 'secondary', nap: 1, period: 1, kind: 'egg',
      egg: { ...killed.egg!, settled: true, waitFrames: 1, pfeet: 1 },
    }
    let d: DemoState = only(dmod.createWaveDemo(SEED), [settledKillEgg])
    let remount: DemoProcess | undefined
    for (let f = 0; f < 800 && !remount; f++) {
      d = dmod.stepDemo(d)
      remount = d.sim.processes.find((p) => p.kind === 'enemy')
    }
    expect(remount, 'the kill-egg hatched a remount').toBeDefined()
    expect(remount!.enemyType, 'a killed hunter, through the whole chain, remounts a hunter').toBe('hunter')
    expect(remount!.enemy!.decision, 'and carries the hunter brain').toBe('b2undr')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — the remount keeps its BRAIN and its SCORE (behaviour, not only colour)
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-47 AC-3 — the remount promotes into its species brain and scores its species value', () => {
  it('a hatched hunter carries the b2undr brain and scores 750; a shadow lord SHADOW/1500', async () => {
    // MUTATION: the same 'bounder' hardcode makes decision=brainFor('bounder')='boundr'
    // and killScore('bounder')=500 for EVERY remount, reddening both assertions on the
    // hunter and shadow-lord rows. This is the behaviour half — distinct from AC-1's
    // identity pin: a fix that set enemyType but still called brainFor('bounder') would
    // pass AC-1 and fail HERE.
    const joust = await loadJoust()
    for (const species of ALL_SPECIES) {
      const remount = await driveToRemount(species)
      expect(remount.enemy!.decision, `${species} remount promotes into ${BRAIN_FOR[species]}`).toBe(
        BRAIN_FOR[species],
      )
      expect(joust.killScore(remount.enemyType!), `${species} remount scores ${SCORE_FOR[species]}`).toBe(
        SCORE_FOR[species],
      )
    }
  })

  it('a hatched hunter does NOT get the bounder brain (b2undr, not boundr)', async () => {
    const remount = await driveToRemount('hunter')
    expect(remount.enemy!.decision, 'a hunter pursues (b2undr), it does not bounce (boundr)').toBe('b2undr')
    expect(remount.enemy!.decision).not.toBe('boundr')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — PEGG is still preserved and the 4-egg permadeath still TERMINATES
// (regression guard: adding the species thread must not perturb the egg ladder)
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-47 AC-4 — the species thread leaves the eggsLeft/permadeath ladder intact', () => {
  it('spawnEgg still DEC PEGGs regardless of species (:3001)', async () => {
    const e = await loadEgg()
    // The eggsLeft carry the type thread must not touch (egg.test.ts AC pins this
    // for the untyped path; here we prove a TYPED victim decrements the same way).
    expect(e.spawnEgg({ posX: 0, posY: 0, velX: 0, velY: 0, eggsLeft: 4, enemyType: 'hunter' }).eggsLeft).toBe(3)
    expect(e.spawnEgg({ posX: 0, posY: 0, velX: 0, velY: 0, eggsLeft: 1, enemyType: 'shadowLord' }).eggsLeft).toBe(0)
  })

  it('a species-carrying egg at eggsLeft 0 is PERMADEATH — it does not hatch', async () => {
    const e = await loadEgg()
    // permadeath is species-independent: the 4th egg (0 left) never remounts,
    // hunter or not. `willHatch` is `eggsLeft > 0` (BNE, :3002).
    expect(e.willHatch({ posX: 0, posY: 0, velX: 0, velY: 0, bumpX: 0, bumpY: 0, eggsLeft: 0, hitCount: 0, pfeet: 1, settled: true, enemyType: 'hunter' })).toBe(false)
    expect(e.willHatch({ posX: 0, posY: 0, velX: 0, velY: 0, bumpX: 0, bumpY: 0, eggsLeft: 1, hitCount: 0, pfeet: 1, settled: true, enemyType: 'hunter' })).toBe(true)
  })

  it('the remount still carries PEGG forward — a hunter egg with 2 left remounts a bird with 2 left', async () => {
    // The eggsLeft carry-forward (PEGG — `LDA PEGG,U / STA PEGG,Y`,
    // JOUSTRV4.SRC:3251-3252 — in remountEnemyProcess) rides alongside the new type
    // thread; a bird that hatched must still walk its count toward permadeath.
    const remount = await driveToRemount('hunter', 2)
    expect(remount.enemy!.eggsLeft, 'PEGG survives the hatch beside the species').toBe(2)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// FALLBACK — a WAVEGG wave egg (no laying enemy) still remounts a bounder
// (lang-review #4/#21: the new OPTIONAL enemyType must be handled with a `??`
//  default, never read raw — `killScore(undefined)` would crash/score 0)
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-47 fallback — a species-less (wave) egg remounts a bounder, not undefined', () => {
  it('a hatching egg with NO enemyType yields a bounder remount that scores 500', async () => {
    // Green on arrival (the hardcode is bounder today) AND after the fix (the
    // `egg.enemyType ?? "bounder"` default). It reddens on the exact regression the
    // rule warns of: a fix that reads `egg.enemyType` RAW makes the remount's type
    // undefined — decision/killScore would then be wrong or throw. Mirrors the
    // wave-egg path jt9-46's Group 4 exercises, but pins the TYPE not the rider.
    const joust = await loadJoust()
    const dmod = await loadDemo()
    let d: DemoState = only(dmod.createWaveDemo(SEED), [
      // a settled wave egg: same shape as hatchingEggProc but WITHOUT enemyType
      {
        id: 0x2_0001,
        cls: 'secondary',
        nap: 1,
        period: 1,
        kind: 'egg',
        egg: { posX: 60, posY: 40 << 8, velX: 0, velY: 0, bumpX: 0, bumpY: 0, waitFrames: 1, eggsLeft: 2, hitCount: 0, pfeet: 1, settled: true },
      },
    ])
    let remount: DemoProcess | undefined
    for (let f = 0; f < 800 && !remount; f++) {
      d = dmod.stepDemo(d)
      remount = d.sim.processes.find((p) => p.kind === 'enemy')
    }
    expect(remount, 'the species-less wave egg still hatched a remount').toBeDefined()
    expect(remount!.enemyType, 'a wave egg has no laying species → bounder fallback').toBe('bounder')
    expect(joust.killScore(remount!.enemyType!), 'and it scores the bounder value, not 0/NaN').toBe(500)
  })
})
