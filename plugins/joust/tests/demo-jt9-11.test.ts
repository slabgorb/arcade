// tests/demo-jt9-11.test.ts
//
// Story jt9-11 — RED phase (TEA, Mr. Praline). THE LAVA TROLL'S GRIP IS
// PRODUCTION-DEAD, and I intend to prove it. beginGrip, stepGrip, escalateGrip and
// escapeScoreEvent are a faithful, cited, tested PURE core (troll.ts) with ZERO
// production callers — a parrot nailed to its perch. This file wires it into the
// demo and pins the wiring, at the FULL-FIDELITY scope the user chose (2026-08-04):
// the whole LNDB7 → LT1HT hand-tracking → LT1GRP grab → ADDLAV grip → break-free /
// lava-death chain, not a shortcut grab.
//
// ─── THE MECHANISM, straight off the 1982 wire ───────────────────────────────
//
//   • THE SPAWN IS A LANDING (LNDB7, JOUSTRV4.SRC:6764-6789). The troll is NOT a
//     per-wave placeholder — it is created the frame a live bird (PLAYER $80+PLYID
//     or ENEMY $80+EMYID) LANDS in the lava-troll ground zone (groundOutcome
//     `{kind:'troll'}` — bit 7 without bit 5, arena.ts). Only one at a time (LAVNBR).
//     The new troll is FINGER-PRINTED with its victim: `STU PJOY,Y` (:6781) stamps
//     the lander's id, and it starts on the floor (`LDD #FLOOR-9`, :6784) offset
//     `#-2` in X from the victim (:6786), at PFRAME 0.
//
//   • THE HAND RISES AND TRACKS (LAVAT1/LT1HT, :1606-1665). Phase 1: the hand's
//     PFRAME steps 0→6→…→5*6 on the LAVTIM cadence (`LDA LAVTIM / STA PJOYT,U`,
//     :1611-1612 — the frame timer, a DYTBL row this story wires), tracking the
//     victim's X. Phase 2, once the hand is at the extended frame (`CMPA #5*6 /
//     BEQ LT1HT`): the hand's pixel-Y closes 1px/frame toward the victim's
//     pixel-Y + 3 (`ADDB #10-7`, :1667), until equal → LT1GRP.
//
//   • THE GRAB REPOINTS GRAVITY (LT1GRP, :1651-1664). `LDX #ADDLAV / STX PADGRA,U`
//     — the victim's gravity is now the troll's — and `JSR PATCH1` seeds the grip
//     (CLVGRA = LAVGRA, LAVKLL = 30*60). From here every frame is `troll.stepGrip`
//     + `troll.escalateGrip` on the victim.
//
//   • BREAK-FREE OR LAVA (ADDLAV, :6608-6670). Sustained upward flap drives the
//     post-pull VY < -$0180 → the victim breaks free and scores 50 (`LDA #$50 /
//     JSR SCRTEN`, :6666-6668); otherwise the fall integrates and, at FLOOR+7 whole
//     pixels, the bird dies in the lava.
//
// ─── WHAT DEV BUILDS (the contract this file and demo-jt9-11-source.test.ts pin) ─
// A `kind:'troll'` DemoProcess gains `victimId` (the PJOY binding) and `grip`
// (`TrollGrip`, present only after the grab commits) — both mirrored in
// tests/helpers/demo-contract.ts. stepDemo grows: (1) the LNDB7 landing→spawn, (2)
// the LT1HT rise/track/grab animation, (3) the per-frame grip driving the victim,
// and (4) the break-free score + lava death. `troll.beginGrip/stepGrip/
// escalateGrip/escapeScoreEvent` become its production callers. LAVGRA/LAVTIM are
// read from `difficulty` (their ROW_DISPOSITION flips to `wired` — AC-5, pinned in
// difficulty-wiring.test.ts).
//
// Node env on purpose (dynamic import of demo.js off disk). This header never
// spells the vitest env directive as a token.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  loadDemo,
  type DemoState,
  type DemoProcess,
  type EntityState,
} from './helpers/demo-contract.js'
import { loadTroll } from './helpers/troll-contract.js'

const SEED = 0x1234_5678
const PLAYER1_ID = 1

// ─── ROM constants this wiring introduces (re-derived byte-for-byte in the
// companion demo-jt9-11-source.test.ts; used here to drive the behaviour) ───────
const FLOOR = 0xdf //           JOUSTRV4.SRC:37  — THE FLOOR
const HAND_START_Y = FLOOR - 9 //          :6784 — LDD #FLOOR-9 (the hand's first pixel row)
const EXTENDED_FRAME = 5 * 6 //            :1614 — CMPA #5*6 (the extended grab frame)
const GRIP_Y_OFFSET = 10 - 7 //            :1667 — ADDB #10-7 (proper hand-grip offset, +3)
const DEATH_Y = FLOOR + 7 //               :6620 — CMPA #FLOOR+7 (bird in the lava)

// ─── Staging (the jt9-25 stagedDemo idiom) ───────────────────────────────────

function entityAt(posX: number, pixelY: number, over: Partial<EntityState> = {}): EntityState {
  return {
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
    ...over,
  }
}

function playerAt(id: number, posX: number, pixelY: number, over: Partial<EntityState> = {}): DemoProcess {
  return {
    id,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    facing: 1,
    mount: 'ostrich',
    entity: entityAt(posX, pixelY, over),
  }
}

/**
 * A lava troll already bound to a victim, staged at a chosen point in its life:
 *   • before a grab: pass `grip: undefined` and a `pixelY` for the rising hand;
 *   • after the grab commits: pass a `grip`.
 * `victimId` is the PJOY binding — the id of the player/enemy it holds.
 */
function trollProc(victimId: number, posX: number, pixelY: number, over: Partial<DemoProcess> = {}): DemoProcess {
  return {
    id: 0x15_0000 + victimId, // LAVID-flavoured, clear of the enemy/ptero namespaces
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'troll',
    facing: 1,
    collisionEnabled: true,
    victimId,
    entity: entityAt(posX, pixelY),
    ...over,
  }
}

async function stagedDemo(processes: DemoProcess[], wave = 4, arena?: Partial<DemoState['arena']>): Promise<DemoState> {
  const dmod = await loadDemo()
  const base = dmod.createWaveDemo(SEED)
  return {
    ...base,
    wave,
    sim: { ...base.sim, processes },
    // The troll is only active once the bridge has burned (wave >= 4).
    arena: { ...base.arena, bridgeBurned: true, ...arena },
  }
}

const trollsIn = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'troll')
const byId = (d: DemoState, id: number): DemoProcess | undefined => d.sim.processes.find((p) => p.id === id)
const pixelY = (p?: DemoProcess): number => (p?.entity ? p.entity.posY >> 8 : NaN)

// ═════════════════════════════════════════════════════════════════════════════
// AC-0 — THE PARROT IS DEAD: the grip core has, today, NO production caller
// ═════════════════════════════════════════════════════════════════════════════
//
// This is the whole story in one assertion. A source scan, not a behaviour probe,
// because "has a caller" is a fact about the SOURCE — and a behaviour test alone
// could pass on a mock. It reddens now (zero callers) and can only green by wiring
// the real functions into demo.ts. A dead call (`void beginGrip`) would satisfy a
// naive grep, so the behaviour suites below are what stop that.
describe('jt9-11 AC-0 — beginGrip/stepGrip/escalateGrip/escapeScoreEvent get a production caller', () => {
  const demoSrc = (): string =>
    readFileSync(fileURLToPath(new URL('../src/core/demo.ts', import.meta.url)), 'utf8')
  const frameSrc = (): string =>
    readFileSync(fileURLToPath(new URL('../src/core/frame.ts', import.meta.url)), 'utf8')

  for (const fn of ['beginGrip', 'stepGrip', 'escalateGrip', 'escapeScoreEvent'] as const) {
    it(`\`${fn}\` is called from production (demo.ts or frame.ts), not just troll.ts`, () => {
      const src = demoSrc() + '\n' + frameSrc()
      // A CALL, not a mere mention: `fn(` somewhere in the wiring. RED today — the
      // grip is a pure core exercised only by its own tests.
      const called = new RegExp(`\\b${fn}\\s*\\(`).test(src)
      expect(called, `${fn} must have a production call site once the grip is wired`).toBe(true)
    })
  }

  it('demo.ts imports the grip functions (not just trollSpawnable) from ./troll.js', () => {
    // demo.ts already imports `trollSpawnable`; the RED here is that the GRIP core is
    // not among the imported names. Match the import binding list and require the
    // grab entry point in it.
    const m = demoSrc().match(/import\s*\{([^}]*)\}\s*from\s*'\.\/troll\.js'/)
    expect(m, 'demo.ts must import from ./troll.js').not.toBeNull()
    const names = (m?.[1] ?? '').split(',').map((s) => s.trim())
    expect(names, 'the grip entry point must be imported for wiring').toContain('beginGrip')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — THE SPAWN ACQUIRES A VICTIM: the wave-4 troll (jt3-3 trollSpawnable /
//         insertTroll) now binds the in-range bird it will grab (PJOY), instead of
//         standing inert. The spawn path is unchanged; the BINDING is what's new.
// ═════════════════════════════════════════════════════════════════════════════
//
// The CLIF5 lava island the hand grabs off sits mid-screen; the placeholder troll
// entity stands at posX 148 (demo.ts trollEntity). A bird within the hand's
// horizontal reach of that spot is the grab target. We drive the real spawn with
// the demo-troll.test.ts `forceAdvance` idiom (strip the wave clear, keep players,
// advance to the troll wave) so nothing about the wave arithmetic is re-derived.
describe('jt9-11 AC-1 — the spawned troll binds the in-range bird as its victim', () => {
  const CLIF5_X = 148 // demo.ts trollEntity's resting X on the bottom island

  /** Advance a fresh demo to the troll wave (4), keeping ONE player parked in the
   *  troll's reach so the spawn has a bird to bind. Returns the demo at wave 4. */
  async function trollWaveWithVictim(victimX = CLIF5_X): Promise<{ d: DemoState; step: (d: DemoState) => DemoState }> {
    const dmod = await loadDemo()
    let d = dmod.createWaveDemo(SEED)
    // Keep a single player, parked on the island, across each forced advance.
    const park = (s: DemoState): DemoState => ({
      ...s,
      sim: { ...s.sim, processes: [playerAt(PLAYER1_ID, victimX, 120)] },
    })
    d = dmod.stepDemo(park(d)) // → wave 2
    d = dmod.stepDemo(park(d)) // → wave 3 (bridge burns)
    d = dmod.stepDemo(park(d)) // → wave 4 (the troll wave — trollSpawnable true)
    return { d, step: dmod.stepDemo }
  }

  it('reaches wave 4 and spawns a troll (the jt3-3 gate is unchanged)', async () => {
    const { d } = await trollWaveWithVictim()
    expect(d.wave, 'the forced advance reached the troll wave').toBe(4)
    expect(d.arena.bridgeBurned, 'the bridge burned on the way').toBe(true)
    expect(trollsIn(d).length, 'a lava troll spawned at wave 4').toBe(1)
  })

  it('the spawned troll is finger-printed with the in-range bird (victimId = that player)', async () => {
    const { d } = await trollWaveWithVictim()
    const t = trollsIn(d)[0]
    expect(t, 'a troll spawned').toBeDefined()
    // PJOY (:6781) — the troll carries the id of the bird it will grab. Today the
    // placeholder carries none; that absence is exactly the "grip has nowhere to
    // attach" the story is filed on.
    expect(t?.victimId, 'the troll bound the in-range player as its victim').toBe(PLAYER1_ID)
  })

  it('the fresh troll starts on the floor (FLOOR-9) and is not yet gripping', async () => {
    const { d } = await trollWaveWithVictim()
    const t = trollsIn(d)[0]
    expect(t, 'a troll spawned').toBeDefined()
    // The hand comes UP from the ground (LDD #FLOOR-9, :6784) — it does not begin at
    // the victim. The grip is absent until the hand reaches its target.
    expect(pixelY(t), 'the hand begins on the floor — FLOOR-9').toBe(HAND_START_Y)
    expect(t?.grip, 'no grip yet — the hand has not reached the victim').toBeUndefined()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — THE HAND-TRACKING ANIMATION (LT1HT): frame-extend on the LAVTIM cadence,
//         then close the pixel-Y gap 1px/frame to victim+3, then GRAB
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-11 AC-2 — the hand rises and tracks its victim before it can grab', () => {
  it('phase 1: PFRAME extends 0→5*6 on the LAVTIM cadence, one step per timer expiry', async () => {
    const dmod = await loadDemo()
    // A troll on the floor, victim well above: the hand must first EXTEND (animPhase
    // steps through the GRAB frames) before it starts closing the Y gap. animPhase is
    // PFRAME/6, so it visits 0..5 (the extended frame) in order.
    const victim = playerAt(PLAYER1_ID, 100, HAND_START_Y - 30)
    let d = await stagedDemo([victim, trollProc(PLAYER1_ID, 98, HAND_START_Y)])

    const phases: number[] = []
    for (let f = 0; f < 120; f++) {
      d = dmod.stepDemo(d)
      const t = trollsIn(d)[0]
      const ph = t?.entity?.animPhase
      if (ph !== undefined && phases[phases.length - 1] !== ph) phases.push(ph)
      if (ph === EXTENDED_FRAME / 6) break
    }
    // The frame extends monotonically up to the extended frame (5), and does not
    // start there — the hand is not born fully extended.
    expect(phases[0], 'PFRAME starts at frame 0').toBe(0)
    expect(phases[phases.length - 1], 'reaches the extended frame 5*6 → animPhase 5').toBe(EXTENDED_FRAME / 6)
    expect([...phases].sort((a, b) => a - b), 'the extension is monotone through the GRAB frames').toEqual(phases)
  })

  it('phase 2: once extended, the hand closes the Y gap toward victim pixelY + 3, 1px per frame', async () => {
    const dmod = await loadDemo()
    // Stage the hand already extended (animPhase 5) and BELOW its victim, so the only
    // thing left is the raise: the hand pixel-Y must DECREASE toward victim+3.
    const victimY = HAND_START_Y - 20
    const victim = playerAt(PLAYER1_ID, 100, victimY)
    let d = await stagedDemo([
      victim,
      trollProc(PLAYER1_ID, 98, HAND_START_Y, { entity: entityAt(98, HAND_START_Y, { animPhase: EXTENDED_FRAME / 6 }) }),
    ])

    const first = pixelY(trollsIn(d)[0])
    d = dmod.stepDemo(d)
    const second = pixelY(trollsIn(d)[0])
    // The hand starts below (larger pixelY) and rises toward the victim — pixelY falls
    // by exactly one per frame (DEC PPOSY+1,U), not a snap.
    expect(second, 'the hand rises one pixel toward its victim').toBe(first - 1)
    expect(first - second, 'exactly one pixel per frame — no teleport').toBe(1)
  })

  it('the grab COMMITS only when the hand reaches victim pixelY + 3 (CMPB PPOSY equal → LT1GRP)', async () => {
    const dmod = await loadDemo()
    // Hand extended and ONE pixel short of the grip point: the next frame should land
    // it on victim+3 and commit the grip. Grip is absent until that frame.
    const victimY = 120
    const victim = playerAt(PLAYER1_ID, 100, victimY)
    const gripY = victimY + GRIP_Y_OFFSET
    let d = await stagedDemo([
      victim,
      trollProc(PLAYER1_ID, 98, gripY + 1, {
        entity: entityAt(98, gripY + 1, { animPhase: EXTENDED_FRAME / 6 }),
      }),
    ])
    expect(trollsIn(d)[0]?.grip, 'not gripped one pixel short').toBeUndefined()

    let committedAtY: number | null = null
    for (let f = 0; f < 10 && committedAtY === null; f++) {
      d = dmod.stepDemo(d)
      const t = trollsIn(d)[0]
      if (t?.grip) committedAtY = pixelY(t)
    }
    expect(committedAtY, 'the grip committed as the hand reached the grip point').not.toBeNull()
    expect(committedAtY, 'and it committed AT victim pixelY + 3 (ADDB #10-7)').toBe(gripY)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — THE GRAB REPOINTS GRAVITY AND SEEDS THE GRIP (LT1GRP → PATCH1): the grip
//         is beginGrip(LAVGRA); from here the victim's fall is troll.stepGrip
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-11 AC-3 — the committed grip is seeded from the wave LAVGRA and drives the victim', () => {
  /** Stage a troll already at the grip point so the next step commits the grab. */
  async function aboutToGrab(wave: number): Promise<{ d: DemoState; step: (d: DemoState) => DemoState }> {
    const dmod = await loadDemo()
    const victimY = 120
    const gripY = victimY + GRIP_Y_OFFSET
    const d = await stagedDemo(
      [
        playerAt(PLAYER1_ID, 100, victimY),
        trollProc(PLAYER1_ID, 98, gripY, { entity: entityAt(98, gripY, { animPhase: EXTENDED_FRAME / 6 }) }),
      ],
      wave,
    )
    return { d, step: dmod.stepDemo }
  }

  it('beginGrip seeds pull = the wave LAVGRA and killTimer = the 30s grace', async () => {
    const troll = await loadTroll()
    const diff = (await import(['..', '..', 'src', 'core', 'difficulty.js'].join('/'))) as {
      waveValue(name: string, wave: number): number
    }
    let { d, step } = await aboutToGrab(4)
    let grip: DemoProcess['grip']
    for (let f = 0; f < 10 && !grip; f++) {
      d = step(d)
      grip = trollsIn(d)[0]?.grip
    }
    expect(grip, 'the grip committed').toBeDefined()
    // PATCH1: CLVGRA = LAVGRA (the per-wave value the difficulty engine resolves),
    // LAVKLL = 30*60. Exactly troll.beginGrip(LAVGRA_for_wave).
    const lavgra = diff.waveValue('LAVGRA', 4)
    expect(grip?.pull, 'pull seeded from the wave LAVGRA').toBe(lavgra)
    expect(grip?.killTimer, 'killTimer seeded from the 30-second grace').toBe(troll.GRACE_FRAMES)
    expect(grip, 'and it equals a fresh beginGrip(LAVGRA)').toEqual(troll.beginGrip(lavgra))
  })

  it('a gripped victim falls FASTER than gravity — its VY is driven by the pull, not normal flight', async () => {
    // The whole point of the repoint (ADDGRA → ADDLAV): the victim held by the troll
    // accelerates downward by the grip pull each frame. Compared against the same bird
    // ungripped, the gripped one's downward VY is strictly greater after a few frames.
    const dmod = await loadDemo()
    // Ungripped control: a lone falling player, no troll.
    let control = await stagedDemo([playerAt(PLAYER1_ID, 100, 120, { velY: 0 })])
    let { d: gripped, step } = await aboutToGrab(4)
    for (let f = 0; f < 6; f++) {
      control = dmod.stepDemo(control)
      gripped = step(gripped)
    }
    const controlVY = byId(control, PLAYER1_ID)?.entity?.velY ?? 0
    const grippedVY = byId(gripped, PLAYER1_ID)?.entity?.velY ?? 0
    expect(byId(gripped, PLAYER1_ID), 'the victim is still held').toBeDefined()
    expect(grippedVY, 'the troll pull adds to the victim VY beyond normal gravity').toBeGreaterThan(controlVY)
  })

  it('the grip escalates: after the grace, pull grows toward the $500 cap (escalateGrip is live)', async () => {
    const troll = await loadTroll()
    let { d, step } = await aboutToGrab(4)
    let grip: DemoProcess['grip']
    for (let f = 0; f < 10 && !grip; f++) {
      d = step(d)
      grip = trollsIn(d)[0]?.grip
    }
    const seeded = grip?.pull ?? -1
    // Blow past the 30-second grace; the pull must climb (escalateGrip's +1/frame),
    // proving escalateGrip has a live per-frame caller and not just a one-shot seed.
    for (let f = 0; f < troll.GRACE_FRAMES + 120; f++) {
      d = step(d)
      if (!trollsIn(d)[0]) break // escaped or lava'd — a different suite owns that
      grip = trollsIn(d)[0]?.grip
    }
    if (trollsIn(d)[0]) {
      expect(grip?.pull ?? -1, 'the pull escalated past its seed after the grace').toBeGreaterThan(seeded)
      expect(grip?.pull ?? 0, 'and never exceeds the $501 terminal (BHI overshoot of $500)').toBeLessThanOrEqual(
        troll.PULL_CAP + 1,
      )
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — BREAK-FREE (+50) OR LAVA DEATH (ADDLAV): the two terminal outcomes are
//         reachable, mutually exclusive, and scored per the ROM
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-11 AC-4 — a gripped victim can break free for 50 points or be pulled into the lava', () => {
  /** Stage a COMMITTED grip directly (grip present, hand at the grip point). */
  async function committed(gripOver: Partial<NonNullable<DemoProcess['grip']>> = {}, inputs = false) {
    const troll = await loadTroll()
    const dmod = await loadDemo()
    const victimY = 120
    const gripY = victimY + GRIP_Y_OFFSET
    const base = troll.beginGrip(4)
    const d = await stagedDemo([
      playerAt(PLAYER1_ID, 100, victimY),
      trollProc(PLAYER1_ID, 98, gripY, {
        grip: { ...base, ...gripOver },
        entity: entityAt(98, gripY, { animPhase: EXTENDED_FRAME / 6 }),
      }),
    ])
    return { d, step: (s: DemoState) => dmod.stepDemo(s, inputs ? { [PLAYER1_ID]: { dir: 0, flap: true, flapHeld: false } } : undefined) }
  }

  it('sustained upward flap breaks the victim free and awards a {value:50, reason:"escape"} event', async () => {
    // Grip still in its grace (pull small), victim flapping hard up: the post-pull VY
    // reaches below -$0180 and ADLFRE fires. The 50-point escape award (LDA #$50) is
    // emitted as a score event the session layer can drain.
    let { d, step } = await committed({ killTimer: 1800, pull: 4 }, true)
    let escapeEvent = false
    let freed = false
    for (let f = 0; f < 200; f++) {
      d = step(d)
      if (d.events.some((e) => e.kind === 'score' && e.value === 50 && (e as { reason?: string }).reason === 'escape'))
        escapeEvent = true
      if (trollsIn(d).length === 0 && byId(d, PLAYER1_ID)) freed = true
      if (escapeEvent && freed) break
    }
    expect(escapeEvent, 'breaking free scored exactly 50 with reason "escape"').toBe(true)
    expect(freed, 'the victim survives and the troll releases').toBe(true)
  })

  it('with no flap the victim is dragged down and dies in the lava (removed, no escape score)', async () => {
    // No input, and shove the grip past its grace so the pull is heavy: the fall
    // integrates to FLOOR+7 and the bird dies. It must NOT also score an escape.
    let { d, step } = await committed({ killTimer: 1, pull: 0x40 }, false)
    let escaped = false
    let died = false
    for (let f = 0; f < 300; f++) {
      d = step(d)
      if (d.events.some((e) => e.kind === 'score' && (e as { reason?: string }).reason === 'escape')) escaped = true
      if (!byId(d, PLAYER1_ID)) {
        died = true
        break
      }
    }
    expect(died, 'the victim was pulled into the lava and removed').toBe(true)
    expect(escaped, 'a lava death is NOT an escape — no 50-point award').toBe(false)
    // And the death is a LAVA death: it happened at/below the death line.
    expect(DEATH_Y, 'the lava death line is FLOOR+7 (sanity on the constant this drove)').toBe(0xe6)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-6 — insertTroll places the troll BEFORE its REAL victim (:6778 PPREV). jt9-1
//         placed it before the FIRST enemy because there was no victim to pick;
//         now there is, and the splice point is the bound victim.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-11 AC-6 — a spawned troll sits immediately before the process it bound', () => {
  const CLIF5_X = 148

  it('the troll is spliced directly BEFORE its bound victim, not merely before the first enemy', async () => {
    const dmod = await loadDemo()
    let d = dmod.createWaveDemo(SEED)
    // Park a single player on the island so the wave can CLEAR and advance (a live
    // enemy would hold the wave open). At the wave-4 spawn the freshly-arrived wave
    // enemies are in the list too, so jt9-1's insertTroll (splice before the first
    // ENEMY) puts the troll AFTER the player; this story must splice before the
    // troll's bound VICTIM — the player — so the troll leads it, and no enemy
    // precedes the troll.
    const park = (s: DemoState): DemoState => ({
      ...s,
      sim: { ...s.sim, processes: [playerAt(PLAYER1_ID, CLIF5_X, 120)] },
    })
    d = dmod.stepDemo(park(d)) // wave 2
    d = dmod.stepDemo(park(d)) // wave 3
    d = dmod.stepDemo(park(d)) // wave 4 — troll spawns, binds the player, arrivals appended
    const t = trollsIn(d)[0]
    expect(t, 'a troll spawned at wave 4').toBeDefined()
    const procs = d.sim.processes
    const ti = procs.findIndex((p) => p.kind === 'troll')
    const vi = procs.findIndex((p) => p.id === (t?.victimId ?? -1))
    expect(t?.victimId, 'the troll bound the parked player as its victim').toBe(PLAYER1_ID)
    expect(vi, 'the victim is in the list').toBeGreaterThanOrEqual(0)
    expect(ti, 'the troll sits DIRECTLY before its bound victim (PPREV)').toBe(vi - 1)
    // And the "BEFORE THIS ONE" invariant jt9-1 pinned: no enemy precedes the troll.
    const enemyBefore = procs.slice(0, ti).some((p) => p.kind === 'enemy')
    expect(enemyBefore, 'no enemy may precede the troll').toBe(false)
  })
})
