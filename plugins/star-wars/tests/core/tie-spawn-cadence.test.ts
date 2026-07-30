// tests/core/tie-spawn-cadence.test.ts
//
// Story sw8-7 — TIE spawn cadence + on-screen density (RED).
//
// THE RULING (epic sw8 §3 — rule before fix): BUG, a fidelity divergence. The
// clone's `SPAWN_INTERVAL = 1.5` countdown (state.ts) is an INVENTION with no ROM
// counterpart. The 1983 cabinet has NO spawn timer anywhere in the alien supply
// path — its dogfight is a swirl because three fighters are aloft from the first
// frame and every loss is replaced on the very next frame:
//
//  * THREE ALIEN SLOTS, exactly. `A$EQ ==3 ;# OF ALIEN RECORDS IN SEQUENCE` and
//    `.BLKB A$EQ*A$IZE` (WSGLOB.MAC:589-590) — the RAM holds three alien records,
//    full stop. Our WAVE_SIZE = 3 cap is AUTHENTIC and must survive.
//  * ONSET IS FRAME ZERO. The space phase INIT chain `PHISP1 → JSR IPGEN`
//    (WSMAIN.MAC:1376-1377) reaches `JSR NWNSHP` (WSMAIN.MAC:502, in IPGEN), and
//    NWNSHP (WSCPU.MAC:969) walks EVERY slot, constructing a ship from the wave
//    group's `.WV` list into each (`INC WV.LIV ;ONE MORE LIFE IN THIS WAVE`,
//    :1005). The first group of every TSPWAV set is 3 TIEs — the player's first
//    frame of space already has all three inbound. Ours shows an empty sky until
//    ~1.5 s and only fills the third slot at ~4.5 s.
//  * REFILL IS NEXT-FRAME, ONE PER FRAME. Every frame of the space phase runs
//    `LDA WV.LIV / CMPA #03 ;3 ALIENS ALIVE? / IFLO ;NO, THEN THROW ANOTHER ONE
//    AT THE PLAYER / JSR ADASHP` (WSMAIN.MAC:1450-1454, in PHESP1). A death runs
//    `CPUGON:: DEC WV.LIV` (WSCPU.MAC:813-818), so the frame after a kill ADASHP
//    (WSCPU.MAC:1058) constructs the NEXT plan entry into the freed slot — one
//    construct per call, one call per frame, no cooldown of any kind. Ours waits
//    out the re-armed 1.5 s countdown.
//  * SUPPLY NEVER RUNS DRY. At end-of-group ADASHP advances `WV.LVL`, clamped to
//    the set's last group, whose loop pointer RESTARTS — the last group (TWV2Z,
//    18 entries) repeats forever. (The clone's past-plan fallback spawns a bare
//    '1A1' mook instead of looping TWV2Z — latent divergence, routed to a
//    Delivery Finding, not pinned here: wave 1's 27-entry plan outlasts the
//    6-kill quota by 3×.)
//
// THE CONTRACT (TEA-ruled seams — deviations logged in the session file):
//  * `initialState`/`enterPhase` stay ENEMY-EMPTY at rest. ~30 suites stage
//    scenes as `{ ...initialState(seed), enemies: [hero], ... }`; a pre-filled
//    state would leak three ghost mooks into any fixture that forgets to
//    override. Deployment happens through stepGame's spawner: full density
//    within the first THREE ticks (≤ 50 ms at 60 fps — imperceptible against
//    the cabinet's frame-0 fill, and the tests below accept either shape).
//  * `GameState.spawnTimer` REMAINS, and a POSITIVE value still PARKS the
//    spawner — the fleet's `spawnTimer: 1e9` fixture idiom (15 files) is a
//    load-bearing seam. The ROM cadence is the degenerate countdown: seeded 0,
//    re-armed 0. (The surface phase's TURRET_SPAWN_INTERVAL arm of the seed at
//    sim.ts `enterPhase` is a DIFFERENT machine — out of scope, unchanged.)
//  * ONE construct per step — the ADASHP once-per-frame cadence, pinned by the
//    double-loss test: refills land one step apart, never as a batch.
//  * The refill CONTINUES the TSPWAV/spawnCount walk (sw7-12/sw7-13) — it never
//    restarts the plan, so Darth's slot arrives on schedule in waves 2+.
import { describe, it, expect } from 'vitest'
import {
  initialState,
  TIE_SPAWN_DISTANCE,
  WAVE_SIZE,
  type GameState,
  type Enemy,
} from '../../src/core/state'
import { stepGame, enterPhase } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'
import { type Mat4 } from '@shared/math3d'

/** One 60 fps shell tick — small enough that "next step" honestly means the ROM's
 * "next frame", not a smuggled quarter-second. */
const TICK = 1 / 60

const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

/** A fresh wave: initialState already starts in the 'space' phase (the
 * space-combat.test.ts idiom). */
const wave = (seed = 1983): GameState => initialState(seed)

/** A station-holding fabricated TIE (no VM — holds position), for cap fixtures
 * where composition is irrelevant. Mirrors tie-wave-ramp's `tieToward`. */
const tie = (pos: readonly [number, number, number]): Enemy => ({
  pos: [pos[0], pos[1], pos[2]],
  kind: 'tie',
  orient: IDENTITY,
})

/** Step the REAL loop until the sky holds a full wave (bounded). Works under
 * both codes: today's timer needs ~4.5 s (270 ticks); the ROM cadence needs ≤ 3.
 * The bound is generous so an exit below WAVE_SIZE is a staging failure, and the
 * guard below makes that loud instead of letting a refill test fail for a
 * staging reason. */
function deployed(s: GameState, maxTicks = 400): GameState {
  let out = s
  for (let i = 0; i < maxTicks && out.enemies.length < WAVE_SIZE; i++) {
    out = stepGame(out, NO_INPUT, TICK)
  }
  expect(out.enemies.length, 'staging: the sky must reach full density').toBe(WAVE_SIZE)
  return out
}

describe('sw8-7 — onset: the wave opens swirling, not empty (NWNSHP fills every slot at init)', () => {
  it('deploys the full opening group within the first three ticks — RED: the sky is empty until ~1.5 s', () => {
    // ROM: PHISP1 → IPGEN → NWNSHP (WSMAIN.MAC:1376-1377, :502) constructs all
    // three BEFORE the first flight frame. Contract: full density within 3 ticks
    // (admits both a frame-0 fill and a one-per-step deploy).
    let s = wave()
    s = stepGame(s, NO_INPUT, TICK)
    expect(s.enemies.length, 'the first tick already puts fighters up').toBeGreaterThanOrEqual(1)
    s = stepGame(s, NO_INPUT, TICK)
    s = stepGame(s, NO_INPUT, TICK)
    expect(s.enemies.length, 'three ticks in, the wave is at full density').toBe(WAVE_SIZE)
    // All three are FRESH constructs on the far spawn horizon ($7C00 = 31,744,
    // WSCPU.MAC:1179-1200) — nobody teleported in half-way down the approach.
    for (const e of s.enemies) {
      expect(e.pos[2], 'a fresh fighter enters at the far spawn depth').toBeLessThan(
        -TIE_SPAWN_DISTANCE * 0.95,
      )
      expect(e.kind, "wave 1's opening group TWV1A is three plain TIEs").toBe('tie')
    }
  })

  it('a wave-2 space entry (enterPhase) opens at full density too — RED: the seeded 1.5 s countdown empties it', () => {
    // The wave-transition path (clearRun → enterPhase('space')) must open the
    // same way the boot path does: the ROM re-runs PHISP1 → NWNSHP for every
    // space wave. SETA2's first group TWV1B is three plain TIEs (WSCPU.MAC:1231,
    // :1258-1261) — Darth is plan entry 5, not part of the opening trio.
    let s = enterPhase({ ...wave(), wave: 2, spawnCount: 0 }, 'space')
    for (let i = 0; i < 3; i++) s = stepGame(s, NO_INPUT, TICK)
    expect(s.enemies.length, 'the fresh wave opens full').toBe(WAVE_SIZE)
    for (const e of s.enemies) expect(e.kind).toBe('tie')
  })
})

describe('sw8-7 — refill: a loss is replaced on the very next step (WV.LIV < 3 → ADASHP)', () => {
  it('one kill → the replacement is aloft ONE step later — RED: ours waits out a 1.5 s countdown', () => {
    // ROM: CPUGON decrements WV.LIV on the death (WSCPU.MAC:813-818); the next
    // PHESP1 frame sees 2 < 3 and ADASHP constructs the next plan entry into the
    // freed slot (WSMAIN.MAC:1450-1454). No timer exists to wait on.
    const full = deployed(wave())
    const afterKill: GameState = { ...full, enemies: full.enemies.slice(0, WAVE_SIZE - 1) }
    const next = stepGame(afterKill, NO_INPUT, TICK)
    expect(next.enemies.length, 'the freed slot is refilled on the next step').toBe(WAVE_SIZE)
    expect(next.spawnCount, 'the refill CONTINUES the TSPWAV walk — it is a fresh construct').toBe(
      full.spawnCount + 1,
    )
  })

  it('a double loss refills ONE per step — the ADASHP once-per-frame cadence, never a batch', () => {
    // ROM: PHESP1 runs the WV.LIV gate once per frame and ADASHP constructs ONE
    // ship per call (WSCPU.MAC:1058 — a single slot scan, a single `.WV` entry).
    // Two losses take two frames to restore. RED today: nothing refills for 1.5 s.
    const full = deployed(wave())
    const afterDouble: GameState = { ...full, enemies: full.enemies.slice(0, 1) }
    const one = stepGame(afterDouble, NO_INPUT, TICK)
    expect(one.enemies.length, 'first step: exactly one replacement, not a batch').toBe(2)
    const two = stepGame(one, NO_INPUT, TICK)
    expect(two.enemies.length, 'second step: the wave is whole again').toBe(WAVE_SIZE)
  })
})

describe('sw8-7 — the seams the fix must keep (green before AND after)', () => {
  it('the refill continues the spawnCount walk from where it stood — never restarts the plan', () => {
    // spawnCount 3 on wave 1 is plan entry 3 — TWV2B's first fighter, begin-loc
    // 1B1 = (0, +1024) on the far horizon (WSCPU.MAC:1186-1200, ×$400). A refill
    // that restarted the walk would re-spawn entry 0 and Darth (entry 5 of the
    // wave-2 plan) would never arrive — the sw7-13 regression this guards.
    const s0: GameState = { ...wave(), enemies: [], spawnCount: 3, spawnTimer: 0 }
    const s = stepGame(s0, NO_INPUT, TICK)
    expect(s.enemies.length).toBe(1)
    expect(s.spawnCount).toBe(4)
    expect(s.enemies[0].pos[0], 'plan entry 3 (1B1) spawns dead-centre laterally').toBe(0)
    expect(s.enemies[0].pos[1], 'plan entry 3 (1B1) spawns one lateral unit up').toBe(0x400)
  })

  it('density never exceeds the three ROM alien slots, even with the timer expired', () => {
    // A$EQ == 3 (WSGLOB.MAC:589) — there is no fourth record to construct into.
    const full: GameState = {
      ...wave(),
      enemies: [tie([0, 1024, -20000]), tie([-1024, 0, -24000]), tie([1024, 0, -28000])],
      spawnTimer: 0,
    }
    const s = stepGame(full, NO_INPUT, TICK)
    expect(s.enemies.length).toBeLessThanOrEqual(WAVE_SIZE)
  })

  it('a parked spawnTimer still parks the spawner — the fleet fixture seam holds', () => {
    // 15 sibling suites stage quiet skies as `spawnTimer: 1e9`. The instant
    // cadence must live in the SEED and RE-ARM values, not in deleting the
    // countdown — a positive timer must go on holding the spawner shut.
    let s: GameState = { ...wave(), enemies: [], spawnTimer: 1e9 }
    for (let i = 0; i < 10; i++) s = stepGame(s, NO_INPUT, TICK)
    expect(s.enemies.length, 'a parked spawner spawns nothing').toBe(0)
  })
})
