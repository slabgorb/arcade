// tests/demo.test.ts
//
// Story jt2-7 — RED phase (Leeloo / TEA). The wave-1 DEMO wiring: the integration
// story that turns jt2-1..jt2-6's pure cores into a playable slice. This suite
// pins the WIRING behaviourally — that the demo loop and the sim are ONE thing
// that cannot diverge — not new ROM laws (those were transcribed and gated by the
// earlier stories' citations suites; nothing here adds a claim).
//
// RED today: tests/helpers/demo-contract.ts::loadDemo throws "demo wiring not
// built yet" because src/core/demo.ts does not exist — a clean feature-absent red,
// per test, not an import trace.
//
// ─── ROUTING ≠ GEOMETRY (MEMORY) ─────────────────────────────────────────────
// The dangerous failure here is a demo that IMPORTS stepFrame yet assembles the
// wrong sim, or forks a divergent stepping path, and ships green. So the drive
// pin (AC-1 group) compares ACTUAL player COORDINATES coming out of the demo to a
// solo scheduler run of the identical process — a data equality, not a "was it
// called". Every collision/egg pin asserts the surviving/settled DATA, both
// directions, and each is annotated with the mutant it kills — the epic has lost
// FOUR rounds to mutation survivors (who-wins, signed-settle, gladiator both-out,
// count-thread + inert-exit), and the Reviewer WILL mutation-test.

import { describe, it, expect } from 'vitest'
import {
  loadDemo,
  type DemoState,
  type DemoProcess,
  type JoustEntity,
  type EggState,
} from './helpers/demo-contract.js'
import { loadScheduler } from './helpers/scheduler-contract.js'
import { loadFlight, type PlayerInput } from './helpers/flight-contract.js'
import { loadArena } from './helpers/arena-contract.js'
import { loadWave } from './helpers/wave-contract.js'
import { loadTransporter } from './helpers/transporter-contract.js'
import { loadEgg } from './helpers/egg-contract.js'
import { loadJoust } from './helpers/joust-collision-contract.js'

const SEED = 0x1234_5678

// ─── Local factories (only what the test controls) ──────────────────────────

/** A joust participant with test-neutral defaults; callers override what matters. */
function participant(over: Partial<JoustEntity>): JoustEntity {
  return {
    posX: 100,
    posY: 90 << 8,
    velY: 0,
    velX: 0,
    plantZ: 0,
    facing: 1,
    bumpX: 0,
    bumpY: 0,
    party: 'player',
    collision: null,
    groundState: null,
    ...over,
  }
}

/** An egg with test-neutral defaults. */
function eggOf(over: Partial<EggState>): EggState {
  return {
    posX: 100,
    posY: 40 << 8,
    velX: 0,
    velY: 0,
    bumpX: 0,
    bumpY: 0,
    eggsLeft: 4,
    hitCount: 0,
    pfeet: 0,
    settled: false,
    ...over,
  }
}

const enemies = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'enemy')
const players = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'player')

/** Step a demo N frames threading a single (optional) fixed input map. */
async function stepN(
  demo: DemoState,
  n: number,
  inputs?: Record<number, PlayerInput>,
): Promise<DemoState> {
  const dmod = await loadDemo()
  let d = demo
  for (let i = 0; i < n; i++) d = dmod.stepDemo(d, inputs)
  return d
}

/** Replace the demo's process list (keeps sim/budget/rng), for controlled pins. */
const withProcesses = (d: DemoState, procs: readonly DemoProcess[]): DemoState => ({
  ...d,
  sim: { ...d.sim, processes: procs },
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — WAVE-1 ASSEMBLY. createWaveDemo builds wave 1 from the transcribed data.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — createWaveDemo assembles wave 1 from the cores', () => {
  it('starts on wave 1 with both players and the transcribed enemy complement', async () => {
    const dmod = await loadDemo()
    const trans = await loadTransporter()
    const wave = await loadWave()
    const demo = dmod.createWaveDemo(SEED)

    expect(demo.wave, 'the demo opens on wave 1').toBe(1)

    // The 2P contract: P1 and P2 both live, at the transporter spawn constants.
    const px = players(demo).map((p) => p.entity?.posX).sort((a, b) => (a ?? 0) - (b ?? 0))
    expect(px, 'P1 at 100 and P2 at 200 — the jt2-6 spawn constants').toEqual([
      trans.PLAYER1_SPAWN.x,
      trans.PLAYER2_SPAWN.x,
    ])

    // The enemy complement is the wave-1 row's bounders+hunters+lords+ptero — 3
    // bounders — via enterViaPads. Tie the count to the transcribed law, never a
    // bare literal.
    const complement = trans.waveEnemyComplement(wave.waveRowAt(1))
    expect(complement, 'wave 1 is three bounders').toBe(3)
    expect(enemies(demo).length, 'three enemy processes entered via pads').toBe(complement)
  })

  it('seeds the intelligence budget from wave 1s pursuit nibble (wsmart=1, nsmart=0)', async () => {
    const dmod = await loadDemo()
    const wave = await loadWave()
    const demo = dmod.createWaveDemo(SEED)
    const seeded = wave.seedWaveBudget(wave.waveRowAt(1))
    expect(demo.sim.budget, 'budget = seedWaveBudget(row 1) — one law, not a re-derivation').toEqual(
      seeded,
    )
    expect(demo.sim.budget.wsmart, 'wave 1 pursuit nibble is 1').toBe(1)
    expect(demo.sim.budget.nsmart, 'nobody promoted yet').toBe(0)
  })

  it('sets each enemys period to the EMYTIM divider for the wave (2 on wave 1)', async () => {
    // EMYTIM is the integrate-every-Nth-frame DIVIDER = the scheduler `period`,
    // not a speed scale (epic ruling). The divider LAW (half displacement) is
    // pinned in the enemy/scheduler suites; here we pin the WIRING SETS it from
    // the oracle. A mutant that hard-codes period 1 (enemies run full speed on
    // wave 1) dies here.
    const dmod = await loadDemo()
    const wave = await loadWave()
    const demo = dmod.createWaveDemo(SEED)
    const emytim = wave.emytimForWave(1)
    expect(emytim, 'wave 1 EMYTIM is the slow divider').toBe(2)
    for (const e of enemies(demo)) {
      expect(e.period, 'enemy period is the EMYTIM divider').toBe(emytim)
    }
  })

  it('surfaces the wave-1 message beats as console/overlay events (no fonts rendered)', async () => {
    // The TEXT SEAM: the wave machine emits WAVMSG beats; the shell renders NONE
    // of them here (fonts are jt4). Wave 1 status 0x02 → type 'intro' → INTRO1,
    // INTRO2. They must appear as `beat` EVENTS (data), never as drawn glyphs.
    const dmod = await loadDemo()
    const wave = await loadWave()
    const row1 = wave.waveRowAt(1)
    const resolved = wave.dispatchWaveType(row1.status, { p1: true, p2: true })
    const wanted = wave.waveBeats(resolved).map((b) => b.message)
    expect(wanted.length, 'wave 1 emits intro beats').toBeGreaterThan(0)

    // Collect beat messages from creation and the first handful of frames.
    let demo = dmod.createWaveDemo(SEED)
    const seen = new Set<string>()
    const collect = (d: DemoState): void => {
      for (const ev of d.events) if (ev.kind === 'beat') seen.add(ev.message)
    }
    collect(demo)
    for (let i = 0; i < 8; i++) {
      demo = dmod.stepDemo(demo)
      collect(demo)
    }
    for (const m of wanted) {
      expect([...seen], `the '${m}' beat must surface as a console/overlay event`).toContain(m)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — THE DEMO DRIVES THE SIM FROM stepFrame (routing ≠ geometry).
//        A player in the demo must land on the IDENTICAL coordinates a solo
//        scheduler run of the same process produces — a data equality, so a
//        forked/divergent demo loop fails loudly rather than shipping green.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — the demo and the sim do not diverge (jt2-1 carried seam)', () => {
  it('a player stepped by the demo matches a solo scheduler run bit-for-bit', async () => {
    const dmod = await loadDemo()
    const sched = await loadScheduler()
    const demo = dmod.createWaveDemo(SEED)

    // P1 — identify by its spawn X, capture its exact process spec.
    const trans = await loadTransporter()
    const p1 = players(demo).find((p) => p.entity?.posX === trans.PLAYER1_SPAWN.x)
    expect(p1, 'the demo must carry a P1 player process').toBeDefined()
    const pid = p1!.id
    const e0 = p1!.entity!

    // A solo scheduler with ONLY that identical player process.
    const solo0 = sched.spawn(sched.createState(SEED), {
      id: pid,
      cls: p1!.cls,
      nap: p1!.nap,
      period: p1!.period,
      kind: 'player',
      entity: e0,
    })

    // Drive both 40 frames with the SAME input for that id — a flap script so the
    // bird actually moves (a match over a motionless bird would prove nothing).
    const input: Record<number, PlayerInput> = { [pid]: { dir: 1, flap: true, flapHeld: true } }
    let demoS = demo
    let soloS = solo0
    for (let i = 0; i < 40; i++) {
      demoS = dmod.stepDemo(demoS, input)
      soloS = sched.stepFrame(soloS, input)
    }

    const demoP1 = demoS.sim.processes.find((p) => p.id === pid)?.entity
    const soloP1 = soloS.processes.find((p) => p.id === pid)?.entity
    expect(demoP1, 'the demos P1 must still exist').toBeDefined()
    expect(demoP1, 'the demo drives the player through the identical stepFrame pipeline').toEqual(
      soloP1,
    )
    expect(demoP1, 'and it actually moved — the pin is not vacuous').not.toEqual(e0)
  })

  it('advances the sim frame counter exactly one per stepDemo', async () => {
    const dmod = await loadDemo()
    let demo = dmod.createWaveDemo(SEED)
    const start = demo.sim.frame
    demo = dmod.stepDemo(demo)
    expect(demo.sim.frame, 'one video frame per step').toBe(start + 1)
    demo = dmod.stepDemo(demo)
    expect(demo.sim.frame).toBe(start + 2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — THE 15 s GROWTH CADENCE (growthDue → growWanted while enemies live).
//        The "count-thread" mutation the epic lost a round to: threading the
//        budget through the loop. Pinned BOTH directions.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — the frame loop drives the growth oracle', () => {
  it('does NOT grow WSMART before the cadence, then grows it exactly once at 896', async () => {
    const dmod = await loadDemo()
    const wave = await loadWave()
    expect(wave.CIA_GROWTH_FRAMES, 'the cadence is 112×8 frames').toBe(896)

    // Controlled: enemies only (no players ⇒ nothing kills them ⇒ ≥1 alive at the
    // cadence), so the pin is deterministic rather than emergent.
    const demo = dmod.createWaveDemo(SEED)
    const start = withProcesses(demo, enemies(demo))
    expect(start.sim.budget.wsmart, 'seeded WSMART').toBe(1)

    const before = await stepN(start, wave.CIA_GROWTH_FRAMES - 1) // 895 frames
    expect(before.sim.budget.wsmart, 'no growth before the 896th frame').toBe(1)
    expect(enemies(before).length, 'the enemies are still alive at the cadence').toBeGreaterThan(0)

    const at = dmod.stepDemo(before) // the 896th frame
    expect(at.sim.budget.wsmart, 'the 15 s timer fires once at 896 while enemies live').toBe(2)
  })

  it('does NOT grow WSMART when no enemies are alive (the enemiesAlive gate)', async () => {
    // The mutant that grows every cadence REGARDLESS of enemies dies here.
    //
    // jt2-7 ROUND-2 RECONCILIATION (Dev/Julia, blocking Conflict — see session):
    // round-2 Rail 4 makes a CLEARED wave (no enemies, players present) advance and
    // spawn the next wave's complement — so a players-only sim no longer stays
    // enemy-free (the wave-2 buzzards enter and DO grow WSMART at 896). Rail 4's
    // `cleared` setup and this test's `playersOnly` setup are byte-identical, so no
    // stepDemo can satisfy both. This test's own purpose — the growWanted
    // enemiesAlive GATE — is isolated from that new behaviour by driving an EMPTY
    // sim (no enemies AND no player to trigger the advance): the gate still holds
    // and the "grows regardless" mutant still dies (it would push WSMART to 2).
    const dmod = await loadDemo()
    const wave = await loadWave()
    const demo = dmod.createWaveDemo(SEED)
    const noEnemies = withProcesses(demo, [])
    const after = await stepN(noEnemies, wave.CIA_GROWTH_FRAMES + 4)
    expect(after.sim.budget.wsmart, 'no enemies ⇒ the timer grows nothing').toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1/AC-2 — THE EGG BECOMES A SCHEDULER PROCESS: fall + guarded bounce + settle.
//        The BMI EGGBCK guard (bounceEgg ONLY with velY ≥ 0) is the mutant target
//        the story names — pinned both directions. signed-settle pinned too.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — the egg fall loop (STEGG/EGGLPA) with the BMI EGGBCK guard', () => {
  /** The first (x,y) whose scanline BELOW is a ledge and whose own line is air. */
  async function findLedge(): Promise<{ x: number; y: number }> {
    const flight = await loadFlight()
    const arena = await loadArena()
    for (let x = 8; x <= 284; x++) {
      for (let y = 24; y <= 200; y++) {
        const below = arena.groundOutcome(flight.groundMaskAt(x, y + 1))
        const here = arena.groundOutcome(flight.groundMaskAt(x, y))
        if (below.kind === 'platform' && here.kind === 'airborne') return { x, y }
      }
    }
    throw new Error('no ledge found in the arena')
  }

  /** A column that stays airborne well below (x,y), for an open-air fall. */
  async function findAir(): Promise<{ x: number; y: number }> {
    const flight = await loadFlight()
    const arena = await loadArena()
    for (let x = 8; x <= 284; x++) {
      let clear = true
      for (let y = 24; y <= 60; y++) {
        if (arena.groundOutcome(flight.groundMaskAt(x, y)).kind !== 'airborne') {
          clear = false
          break
        }
      }
      if (clear) return { x, y: 24 }
    }
    throw new Error('no open-air column found')
  }

  it('a falling egg in open air descends (the fall is integrated)', async () => {
    const dmod = await loadDemo()
    const { x, y } = await findAir()
    const before = eggOf({ posX: x, posY: y << 8, velY: 0x300 }) // ~3 px/frame down
    const after = dmod.stepEgg(before)
    expect(after.posY >> 8, 'a downward egg moves DOWN one frame').toBeGreaterThan(before.posY >> 8)
    expect(after.settled, 'and is not settled in mid-air').toBe(false)
  })

  it('a DOWNWARD egg that reaches a ledge bounces per the jt2-4 law and settles', async () => {
    const dmod = await loadDemo()
    const egg = await loadEgg()
    const { x, y } = await findLedge()
    // Slow downward impact: bounceVelY($40) = −$10, which settles (≥ −$20).
    const landed = dmod.stepEgg(eggOf({ posX: x, posY: y << 8, velX: 0, velY: 0x40 }))
    expect(landed.velY, 'the bounce is the transcribed quarter-invert').toBe(egg.bounceVelY(0x40))
    expect(landed.settled, 'a slow downward bounce settles').toBe(true)
    expect(egg.eggSettles(landed.velY, landed.velX), 'settled agrees with the eggSettles law').toBe(
      true,
    )
  })

  it('a FAST downward impact bounces but does NOT settle (the SIGNED −$20 bound)', async () => {
    // signed-settle mutant: `abs(velY) ≤ $20` and `velY ≥ −$20` disagree here.
    // bounceVelY($200) = −$80, a fast UPWARD bounce → keeps bouncing, no settle.
    const dmod = await loadDemo()
    const egg = await loadEgg()
    const { x, y } = await findLedge()
    const landed = dmod.stepEgg(eggOf({ posX: x, posY: y << 8, velX: 0, velY: 0x200 }))
    expect(landed.velY, 'quarter-inverted').toBe(egg.bounceVelY(0x200))
    expect(landed.settled, 'a fast upward bounce does not settle').toBe(false)
  })

  it('an ASCENDING egg at a ledge is NOT bounced — the BMI EGGBCK guard holds', async () => {
    // THE named mutant: dropping the `velY ≥ 0` guard would sign-flip a rising
    // egg POSITIVE (bounceVelY(−$40) = +$10) and wrongly settle it. The guarded
    // wiring leaves a rising egg rising.
    const dmod = await loadDemo()
    const egg = await loadEgg()
    const { x, y } = await findLedge()
    const rising = dmod.stepEgg(eggOf({ posX: x, posY: y << 8, velX: 0, velY: -0x40 }))
    expect(rising.velY, 'a rising egg is not quarter-inverted to a positive velY').not.toBe(
      egg.bounceVelY(-0x40),
    )
    expect(rising.velY, 'it is still ascending').toBeLessThan(0)
    expect(rising.settled, 'and it does not settle on the ledge while rising').toBe(false)
  })

  it('an egg IS a scheduler process the demo loop advances each frame', async () => {
    // Wiring, not law: an egg dropped into the process list must be integrated by
    // the SAME loop the players/enemies ride (kind:'egg' dispatch), not left inert.
    const dmod = await loadDemo()
    const { x, y } = await findAir()
    const demo = dmod.createWaveDemo(SEED)
    const eggProc: DemoProcess = {
      id: 0x900,
      cls: 'secondary',
      nap: 1,
      period: 1,
      kind: 'egg',
      egg: eggOf({ posX: x, posY: y << 8, velY: 0x300 }),
    }
    const withEgg = withProcesses(demo, [eggProc])
    const stepped = await stepN(withEgg, 3)
    const after = stepped.sim.processes.find((p) => p.id === 0x900)?.egg
    expect(after, 'the egg process survives the loop').toBeDefined()
    expect(after!.posY >> 8, 'and the loop integrated its fall').toBeGreaterThan(y)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — HATCH / REMOUNT: the buzzard enters from the FARTHER edge; permadeath
//        at the 4th egg. (egg.ts's remountEntryEdge — the ROM correction to
//        "nearer" — is the law; here we pin the demo consumes it.)
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — hatch enters from the farther edge, permadeath at eggsLeft 0', () => {
  it('an egg in the LEFT half hatches a buzzard entering from the RIGHT edge', async () => {
    const dmod = await loadDemo()
    const egg = await loadEgg()
    const leftX = egg.REMOUNT_HALF_X - 10
    const entry = dmod.hatchEgg(eggOf({ posX: leftX, settled: true, eggsLeft: 3 }))
    expect(entry, 'a hatchable egg yields a remount').not.toBeNull()
    expect(entry!.posX, 'enters from the RIGHT (farther) edge').toBe(egg.REMOUNT_ENTRY_RIGHT_X)
    expect(entry!.velX, 'flying left').toBeLessThan(0)
    expect(entry!.facing, 'facing left').toBe(-1)
  })

  it('an egg in the RIGHT half hatches a buzzard entering from the LEFT edge', async () => {
    const dmod = await loadDemo()
    const egg = await loadEgg()
    const rightX = egg.REMOUNT_HALF_X + 10
    const entry = dmod.hatchEgg(eggOf({ posX: rightX, settled: true, eggsLeft: 1 }))
    expect(entry!.posX, 'enters from the LEFT (farther) edge').toBe(egg.REMOUNT_ENTRY_LEFT_X)
    expect(entry!.velX, 'flying right').toBeGreaterThan(0)
    expect(entry!.facing, 'facing right').toBe(1)
  })

  it('the 4th egg (eggsLeft 0) is permadeath — nothing hatches', async () => {
    const dmod = await loadDemo()
    const entry = dmod.hatchEgg(eggOf({ posX: 100, settled: true, eggsLeft: 0 }))
    expect(entry, 'eggsLeft 0 is the enemys permanent death').toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — COLLISION WIRING (the jt2-3 core goes live). resolveContacts is the
//        loop layer over resolveJoust: remove the LOSER (never the winner, never
//        both), leave an egg where a dying enemy stood, surface the kill score.
//        who-wins + both-out + enemies-never-kill mutants pinned.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — resolveContacts applies the joust between entities', () => {
  it('the higher entity (smaller plantHeight) WINS; only the LOSER is removed', async () => {
    const dmod = await loadDemo()
    const joust = await loadJoust()
    const a = participant({ party: 'player', posY: 90 << 8 }) // higher on screen
    const b = participant({ party: 'enemy', enemyType: 'bounder', posY: 96 << 8, velX: 5, velY: 0x123 })
    const r = dmod.resolveContacts(a, b)

    expect(r.outcome, 'the outcome IS the jt2-3 law, not a re-derivation').toEqual(joust.resolveJoust(a, b))
    expect(r.outcome.kind).toBe('kill')
    // who-wins mutant: the WINNER (a, higher) survives; the loser (b) is gone.
    expect(r.survivors, 'exactly the winner remains — not both, not the winner removed').toEqual(['a'])
    // kills spawn eggs carrying the victims velocities (DEATH3 "SAME VELOCITIES").
    expect(r.egg, 'a dying enemy leaves an egg').not.toBeNull()
    expect([r.egg!.velX, r.egg!.velY], 'the egg carries the victims velocities').toEqual([5, 0x123])
    expect(r.egg!.eggsLeft, 'and it starts with eggs to hatch').toBeGreaterThan(0)
    // the score surfaces as the transcribed DVALUE (bounder = 500), not a raw ×100.
    expect(r.score, 'kill score is the transcribed bounder value').toBe(joust.killScore('bounder'))
  })

  it('when the enemy is higher the PLAYER dies, and a player victim leaves no egg', async () => {
    const dmod = await loadDemo()
    const a = participant({ party: 'player', posY: 100 << 8 }) // lower on screen
    const b = participant({ party: 'enemy', enemyType: 'bounder', posY: 90 << 8 })
    const r = dmod.resolveContacts(a, b)
    expect(r.outcome.kind).toBe('kill')
    expect(r.survivors, 'the higher enemy wins; the player is removed').toEqual(['b'])
    expect(r.egg, 'players do not lay eggs').toBeNull()
    expect(r.score, 'no enemy died, so no kill score').toBe(0)
  })

  it('two enemies NEVER kill each other — they bounce and both survive', async () => {
    // enemies-never-kill / gladiator-both-out analogue: neither is removed.
    const dmod = await loadDemo()
    const a = participant({ party: 'enemy', enemyType: 'bounder', posY: 90 << 8 })
    const b = participant({ party: 'enemy', enemyType: 'hunter', posY: 100 << 8 })
    const r = dmod.resolveContacts(a, b)
    expect(r.outcome.kind, 'enemy vs enemy is always a bounce').toBe('bounce')
    expect([...r.survivors].sort(), 'both enemies survive').toEqual(['a', 'b'])
    expect(r.egg, 'no egg on a bounce').toBeNull()
    expect(r.score, 'no score on a bounce').toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — MATERIALISATION: a spawning enemy cannot be jousted until its window
//        exits (the "inert-exit" mutation round — the window must re-enable
//        collisions).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — materialising enemies are collision-safe until the window exits', () => {
  it('freshly-entered enemies start with collisions DISABLED', async () => {
    const dmod = await loadDemo()
    const demo = dmod.createWaveDemo(SEED)
    for (const e of enemies(demo)) {
      expect(e.collisionEnabled, 'a materialising enemy cannot be jousted').toBe(false)
    }
  })

  it('the window EXITS and re-enables collisions (PLYINT) — not inert forever', async () => {
    // Controlled: enemies only, so none die before the window closes.
    const dmod = await loadDemo()
    const demo = dmod.createWaveDemo(SEED)
    const enemiesOnly = withProcesses(demo, enemies(demo))
    const after = await stepN(enemiesOnly, 600)
    const surviving = enemies(after)
    expect(surviving.length, 'the enemies are still there').toBeGreaterThan(0)
    for (const e of surviving) {
      expect(e.collisionEnabled, 'the window re-enabled collisions on exit').toBe(true)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — THE 2P CONTRACT. Both players stay live through the demo.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — P1 and P2 are both live', () => {
  it('both players persist across neutral frames (neither despawns)', async () => {
    const dmod = await loadDemo()
    const demo = dmod.createWaveDemo(SEED)
    expect(players(demo).length, 'two players at the start').toBe(2)
    const after = await stepN(demo, 30)
    expect(players(after).length, 'both still live after 30 neutral frames').toBe(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — DETERMINISM. The seeded wave-1 sequence replays bit-for-bit.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 — the seeded wave-1 sequence is deterministic', () => {
  it('replays bit-for-bit from the same seed and inputs', async () => {
    const dmod = await loadDemo()
    const run = (): string => {
      let d = dmod.createWaveDemo(SEED)
      for (let i = 0; i < 60; i++) d = dmod.stepDemo(d)
      return JSON.stringify(d)
    }
    expect(run(), 'identical seed ⇒ identical wave').toBe(run())
  })

  it('a different seed produces a different wave (the seed actually threads)', async () => {
    const dmod = await loadDemo()
    const run = (seed: number): string => {
      let d = dmod.createWaveDemo(seed)
      for (let i = 0; i < 60; i++) d = dmod.stepDemo(d)
      return JSON.stringify(d)
    }
    expect(run(SEED), 'the seed must actually change the run').not.toBe(run(0x0bad_f00d))
  })
})
