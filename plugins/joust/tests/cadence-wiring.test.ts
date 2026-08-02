// tests/cadence-wiring.test.ts
//
// Story uf1-9 — RED phase (Mr. Praline / TEA). The BEHAVIOUR half; the ROM
// provenance for every law asserted here lives in tests/cadence-source.test.ts,
// whose ORACLE groups pass on arrival and are the evidence base.
//
// Every test in THIS file is RED. The port has no PJOYT equivalent at all: the
// three brains recompute a flap from scratch on every wake (`pursue`,
// enemy.ts — `flap: velY >= brake` on the down route and `flap: velY >= 0` on
// the climb and level routes), and `stepEnemyDetailed` assigns the press EDGE
// to the held LEVEL (`flapHeld: wingsDown`). So there is no cadence, no
// decision interval and no VY gate to observe yet.
//
// ─── THE FIXTURE DISCIPLINE THIS SUITE NEEDS (jt5-10 / jt8-3) ────────────────
// 1. A cadence is a RUN-LENGTH, and run-lengths are only readable if the wake
//    is otherwise unchanging. So the latch probes FREEZE the two inputs that
//    would otherwise re-route the brain (`velY` and the seek episode) and
//    RE-APPLY that freeze every wake — a one-shot stage at wake 0 decays as
//    soon as the episode spends itself. Everything else is carried forward
//    with `...stepped`, which is what lets Dev's new latch state survive the
//    freeze without this file naming it.
// 2. PHASE IS NOT PINNED, PERIOD IS. Where the cycle starts depends on how the
//    up-seek is entered, which is Dev's design. Pinning it would make the suite
//    an implementation transcript. So the assertions drop the first and last
//    partial runs and pin the COMPLETE runs and the period.
// 3. WAVE 7, NOT WAVE 1, for anything that must prove WHICH row was read.
//    Measured: BOUPWU/HUUPWU are both 8 at waves 1-6 and first differ at wave 7
//    (6 vs 7), and BOUPWD/HUUPWD are equal at EVERY wave 1-16. A bounder/hunter
//    swap of the wing-DOWN rows is therefore invisible to any value-based test
//    — a real, measured coverage limit, recorded in the assessment and covered
//    structurally by the disposition consumer strings in the source suite
//    instead.
//
// ─── WHAT THE ROWS ACTUALLY GOVERN (measured; narrower than their names) ─────
// BOUPWD/BOUPWU and HUUPWD/HUUPWU are the UP-SEEK holds only (BOUP1/BOUP2 at
// :3855-3899, B2UP1/B2UP2 at :4174-4185 + :4044-4051). The DOWN-seek has its
// own hardcoded 2-wake wing-down hold (`LDA #2`, :3823 and :4008) and NO
// wing-up reload at all — its wings-up side is decided by the BODNVY/HUDNVY
// brake every wake, which the port ALREADY does correctly. See the FROZEN
// group in cadence-source.test.ts.

import { describe, it, expect } from 'vitest'
import { loadEnemy } from './helpers/enemy-contract.js'
import { loadDifficulty } from './helpers/difficulty-contract.js'
import type { EnemyState, PlayerView } from './helpers/enemy-contract.js'

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

/** An airborne enemy at a chosen brain and Y-velocity, clear of cliffs and lava. */
const airborneEnemy = (brain: 'boundr' | 'b2undr' | 'shadow', velY: number): EnemyState => ({
  entity: {
    posX: 100,
    posY: 0x60 << 8, // mid-air: below the ceiling, well above the lava line ($D3)
    velXIndex: 0,
    velXFrac: 0,
    velY,
    timeUp: 0,
    groundState: null,
    plantZ: 0,
    airborne: true,
  },
  brain,
  decision: brain,
  pchase: 1,
  facing: 1,
})

/** A quarry far ABOVE the enemy — routes bounder/hunter onto the UP-seek path. */
const FAR_ABOVE: PlayerView = { pixelY: 0x10, velXIndex: 0 }
/** A quarry far BELOW — long-range DOWN. */
const FAR_BELOW: PlayerView = { pixelY: 0xd2, velXIndex: 0 }
/** A quarry at the enemy's own line — SHORT range, so the brain flies level. */
const SAME_LINE: PlayerView = { pixelY: 0x60, velXIndex: 0 }

/** Compress a boolean stream into run-lengths: [[value, length], …]. */
function runs(seq: readonly boolean[]): Array<[boolean, number]> {
  const out: Array<[boolean, number]> = []
  for (const v of seq) {
    const last = out[out.length - 1]
    if (last !== undefined && last[0] === v) last[1] += 1
    else out.push([v, 1])
  }
  return out
}

/**
 * Drive `wakes` wakes of a brain held in a committed UP-seek episode, and return
 * the HELD wing level (`prevFlapHeld`) observed after each wake.
 *
 * The freeze is re-applied every wake (rule 1 above): `velY` is pinned so the
 * brake/climb tests cannot change their answer, and the episode is re-armed
 * unspent so `seekWake` cannot exhaust it and re-decide. Everything else —
 * including whatever latch state the implementation adds — rides forward.
 *
 * THE HORIZONTAL STATE IS FROZEN TOO, and it is not optional. `stepEnemyDetailed`
 * computes `wingsDown = decision.flap || steered.turned`, so jt8-3's cliff
 * look-ahead can force the wings down mid-hold. Measured while implementing:
 * every flap steps the FLYX index toward the facing, the bird drifts (posX 100 →
 * 65 over 40 wakes), reaches a cliff at wake 41, turns, and `turned` splits a
 * 7-wake wings-up run into 6 + 1. The cadence was correct; the fixture was
 * measuring a turn. Pinning `posX`/`velXIndex`/`velXFrac` keeps the latch the
 * only thing that moves — which is what a run-length reading requires.
 */
async function heldLevels(
  brain: 'boundr' | 'b2undr',
  velY: number,
  wave: number,
  wakes: number,
): Promise<boolean[]> {
  const e = await loadEnemy()
  let enemy: EnemyState = { ...airborneEnemy(brain, velY), seek: { mode: 'up', pdist: 0x4000 } }
  const seen: boolean[] = []
  for (let i = 0; i < wakes; i++) {
    const stepped = e.stepEnemy(enemy, { player: FAR_ABOVE, wave })
    seen.push(stepped.prevFlapHeld ?? false)
    enemy = {
      ...stepped,
      seek: { mode: 'up', pdist: 0x4000 },
      entity: { ...stepped.entity, posY: 0x60 << 8, velY, airborne: true, posX: 100, velXIndex: 0, velXFrac: 0 },
    }
  }
  return seen
}

/** The complete runs of a stream — first and last dropped as partial (rule 2). */
function completeRuns(seq: readonly boolean[]): Array<[boolean, number]> {
  const r = runs(seq)
  return r.slice(1, Math.max(1, r.length - 1))
}

// ═════════════════════════════════════════════════════════════════════════════
// AC1 + AC2 — the UP-SEEK wing latch: a square wave of BOUPWD / BOUPWU wakes.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC1/AC2 — the up-seek wing cadence is a LATCH, not a per-wake recompute', () => {
  it('holds the bounder wings DOWN for BOUPWD wakes and UP for BOUPWU wakes at wave 1', async () => {
    const d = await loadDifficulty()
    const down = d.waveValue('BOUPWD', 1)
    const up = d.waveValue('BOUPWU', 1)
    // Premise, asserted rather than assumed: these are the free-check values.
    expect([down, up], 'BOUPWD/BOUPWU at wave 1').toEqual([2, 8])

    // Rising hard, so the SHIPPED per-wake law (`flap: velY >= 0`) answers a
    // constant false — the stream is all-up today and this cannot pass by luck.
    const seq = await heldLevels('boundr', -0x180, 1, 40)
    const complete = completeRuns(seq)
    expect(complete.length, 'complete runs observed in 40 wakes').toBeGreaterThanOrEqual(4)
    for (const [level, len] of complete) {
      expect(len, `a wings-${level ? 'down' : 'up'} run`).toBe(level ? down : up)
    }
    // and it genuinely alternates rather than being one long run
    expect(new Set(complete.map(([lvl]) => lvl)), 'both phases occur').toEqual(new Set([true, false]))
  })

  it('scales the cadence with the wave — period follows the DYTBL walk', async () => {
    const d = await loadDifficulty()
    for (const wave of [1, 3, 7]) {
      const down = d.waveValue('BOUPWD', wave)
      const up = d.waveValue('BOUPWU', wave)
      const seq = await heldLevels('boundr', -0x180, wave, 60)
      const complete = completeRuns(seq)
      expect(complete.length, `w${wave}: complete runs`).toBeGreaterThanOrEqual(4)
      for (const [level, len] of complete) {
        expect(len, `w${wave}: a wings-${level ? 'down' : 'up'} run`).toBe(level ? down : up)
      }
    }
  })

  it('reads the HUNTER rows for the hunter — discriminated at wave 7', async () => {
    const d = await loadDifficulty()
    // Measured: BOUPWU=6 and HUUPWU=7 at wave 7 (they agree at waves 1-6). This
    // is the only wave-1..16 window in which reading the bounder's wing-up row
    // for the hunter is observable at all.
    expect(d.waveValue('BOUPWU', 7), 'BOUPWU w7').toBe(6)
    expect(d.waveValue('HUUPWU', 7), 'HUUPWU w7').toBe(7)

    const hunter = completeRuns(await heldLevels('b2undr', -0x180, 7, 60))
    const upRuns = hunter.filter(([lvl]) => !lvl).map(([, n]) => n)
    expect(upRuns.length, 'wings-up runs seen').toBeGreaterThanOrEqual(2)
    for (const n of upRuns) expect(n, 'the hunter holds HUUPWU, not BOUPWU').toBe(7)
  })

  it('drives the flight core with the HELD level, so the impulse fires once per hold', async () => {
    // AC1's second sentence. Today `stepEnemyDetailed` sets `flap` and `flapHeld`
    // to the same value, so the flap IMPULSE repeats every wings-down wake. Under
    // the latch the wing-down edge is one wake and the hold is BOUPWD wakes, so
    // exactly one impulse may fire per cycle. The wing EDGE is the observable
    // jt5-3 already exposes.
    const e = await loadEnemy()
    let enemy: EnemyState = { ...airborneEnemy('boundr', -0x180), seek: { mode: 'up', pdist: 0x4000 } }
    let downEdges = 0
    let upEdges = 0
    const wakes = 40
    for (let i = 0; i < wakes; i++) {
      const r = e.stepEnemyDetailed(enemy, { player: FAR_ABOVE, wave: 1 })
      if (r.wingEdge === 'down') downEdges += 1
      if (r.wingEdge === 'up') upEdges += 1
      enemy = {
        ...r.enemy,
        seek: { mode: 'up', pdist: 0x4000 },
        entity: { ...r.enemy.entity, posY: 0x60 << 8, velY: -0x180, airborne: true , posX: 100, velXIndex: 0, velXFrac: 0 },
      }
    }
    // 40 wakes at a period of BOUPWD+BOUPWU = 10 ⇒ 4 cycles, so 3-4 complete
    // down-edges. The upper bound is the assertion that bites: today every one
    // of the wings-down wakes would be an edge if the level ever went true.
    expect(downEdges, 'wing-down edges in 40 wakes').toBeGreaterThanOrEqual(3)
    expect(downEdges, 'one impulse per cycle, not one per wake').toBeLessThanOrEqual(4)
    expect(upEdges, 'wing-up edges').toBeGreaterThanOrEqual(3)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1 (negative half) — the DOWN-seek must NOT gain the wave-scaled cadence.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC1 — the down-seek keeps its frozen hold and its brake-decided wings-up', () => {
  it('holds the down-seek wings down for 2 wakes at EVERY wave', async () => {
    // `LDA #2` at :3823 (bounder) and :4008 (hunter) — hardcoded, never migrated
    // to DYTBL. BOUPWD is 2 at wave 1 and 1 from wave 3, so wiring the ROW to
    // this path looks right until wave 3 and is wrong forever after.
    const e = await loadEnemy()
    for (const wave of [1, 7]) {
      // Falling faster than the brake ⇒ the down law's flap side is live.
      let enemy: EnemyState = {
        ...airborneEnemy('boundr', 0x300),
        seek: { mode: 'down', pdist: -0x4000 },
      }
      const seen: boolean[] = []
      for (let i = 0; i < 30; i++) {
        const stepped = e.stepEnemy(enemy, { player: FAR_BELOW, wave })
        seen.push(stepped.prevFlapHeld ?? false)
        enemy = {
          ...stepped,
          seek: { mode: 'down', pdist: -0x4000 },
          entity: { ...stepped.entity, posY: 0x60 << 8, velY: 0x300, airborne: true , posX: 100, velXIndex: 0, velXFrac: 0 },
        }
      }
      const downRuns = completeRuns(seen)
        .filter(([lvl]) => lvl)
        .map(([, n]) => n)
      expect(downRuns.length, `w${wave}: wings-down runs`).toBeGreaterThanOrEqual(2)
      for (const n of downRuns) expect(n, `w${wave}: the frozen 2-wake hold`).toBe(2)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — the decision timer: a level-flight episode HOLDS its route.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC3 — a level-flight decide holds for its BOLETM interval', () => {
  it('does not re-route mid-interval when the quarry moves into long range', async () => {
    const e = await loadEnemy()
    const d = await loadDifficulty()
    const interval = d.waveValue('BOLETM', 1)
    expect(interval, 'BOLETM at wave 1').toBe(21)

    // Establish the level episode with a short-range quarry…
    let enemy: EnemyState = airborneEnemy('boundr', 0)
    enemy = e.stepEnemy(enemy, { player: SAME_LINE, wave: 1 })
    expect(enemy.seek, 'a short-range decide commits no seek episode').toBeUndefined()

    // …then drop the quarry to long range. The ROM re-runs SELPLY only when the
    // timer expires (`BOLEV1 DEC PJOYT,U / BLE BOBRA2`, :3911-3912), so the next
    // several wakes must stay level. Today `seekWake` re-routes immediately.
    const routes: Array<string | undefined> = []
    for (let i = 0; i < interval - 2; i++) {
      enemy = e.stepEnemy(enemy, { player: FAR_BELOW, wave: 1 })
      routes.push(enemy.seek?.mode)
      enemy = { ...enemy, entity: { ...enemy.entity, posY: 0x60 << 8, velY: 0, airborne: true } }
    }
    expect(routes.filter((r) => r !== undefined), 'wakes that re-routed inside the interval').toEqual(
      [],
    )
  })

  it('DOES re-decide once the interval elapses — the hold is a timer, not a freeze', async () => {
    // The complement. Without it, "never re-decide" passes the test above and
    // strands every level-flying enemy forever.
    const e = await loadEnemy()
    const d = await loadDifficulty()
    const interval = d.waveValue('BOLETM', 1)

    let enemy: EnemyState = airborneEnemy('boundr', 0)
    enemy = e.stepEnemy(enemy, { player: SAME_LINE, wave: 1 })
    let armedAt: number | null = null
    for (let i = 0; i < interval * 2 + 4; i++) {
      enemy = e.stepEnemy(enemy, { player: FAR_BELOW, wave: 1 })
      if (armedAt === null && enemy.seek?.mode === 'down') armedAt = i + 1
      enemy = { ...enemy, entity: { ...enemy.entity, posY: 0x60 << 8, velY: 0, airborne: true } }
    }
    expect(armedAt, 'the wake on which the level episode finally re-decided').not.toBeNull()
    expect(armedAt!, 'it re-decides at the interval, not immediately and not never').toBeGreaterThanOrEqual(
      interval - 1,
    )
    expect(armedAt!).toBeLessThanOrEqual(interval + 1)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC5 — the two up-flight VY gates, ported as the DIFFERENT shapes they are.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC5 — SHUPVY is consulted every wake; HUUPVY only at expiry, and re-arms', () => {
  it('flaps the shadow whenever velY >= SHUPVY, not merely when velY >= 0', async () => {
    const e = await loadEnemy()
    const d = await loadDifficulty()
    const gate = d.waveValue('SHUPVY', 1)
    expect(gate, 'SHUPVY at wave 1').toBe(-0x200)

    // The discriminating band: rising, but slower than the gate. The ROM flaps
    // here (`CMPD SHUPVY / BLT SHUP0` — BLT exits only strictly BELOW the gate);
    // the shipped per-wake collapse (`flap: velY >= 0`) does not.
    const inBand = e.shadow(airborneEnemy('shadow', -0x100), FAR_ABOVE, 1)
    expect(inBand.flap, 'rising slower than SHUPVY still flaps').toBe(true)

    // …and the far side of the same gate must NOT flap, or the test is satisfied
    // by a constant true.
    const belowGate = e.shadow(airborneEnemy('shadow', -0x300), FAR_ABOVE, 1)
    expect(belowGate.flap, 'rising faster than SHUPVY does not flap').toBe(false)

    // The boundary itself: BLT is strict, so velY === gate flaps.
    expect(e.shadow(airborneEnemy('shadow', gate), FAR_ABOVE, 1).flap, 'velY === SHUPVY').toBe(true)
    expect(e.shadow(airborneEnemy('shadow', gate - 1), FAR_ABOVE, 1).flap, 'one under').toBe(false)
  })

  it('consults the shadow gate on CONSECUTIVE wakes — it carries no countdown', async () => {
    const e = await loadEnemy()
    // Two wakes in a row, answer flipping with velY alone. A timer-gated port
    // would swallow the second.
    const a = e.shadow(airborneEnemy('shadow', -0x100), FAR_ABOVE, 1)
    const b = e.shadow(airborneEnemy('shadow', -0x300), FAR_ABOVE, 1)
    const c = e.shadow(airborneEnemy('shadow', -0x100), FAR_ABOVE, 1)
    expect([a.flap, b.flap, c.flap], 'the gate answers every wake').toEqual([true, false, true])
  })

  it('scales the shadow gate with the wave', async () => {
    const e = await loadEnemy()
    const d = await loadDifficulty()
    const w3 = d.waveValue('SHUPVY', 3)
    expect(w3, 'SHUPVY at wave 3').toBe(-0x400)
    // velY that flaps at wave 1 (above -$200) still flaps at wave 3; velY in the
    // widened band flaps ONLY at wave 3. That difference is the wiring.
    const v = -0x300
    expect(e.shadow(airborneEnemy('shadow', v), FAR_ABOVE, 1).flap, 'w1: below the gate').toBe(false)
    expect(e.shadow(airborneEnemy('shadow', v), FAR_ABOVE, 3).flap, 'w3: inside the wider gate').toBe(
      true,
    )
  })

  it('re-arms the hunter timer when HUUPVY refuses the flap, so the NEXT wake retries', async () => {
    // `INC PJOYT,U` at :4176. The hunter's wing timer expires, the climb is too
    // fast, the flap is refused — and the timer goes back so the very next wake
    // tests again instead of waiting a whole HUUPWU cadence.
    const e = await loadEnemy()
    const d = await loadDifficulty()
    const gate = d.waveValue('HUUPVY', 1)
    expect(gate, 'HUUPVY at wave 1').toBe(-0x100)

    // Drive the hunter until a wings-down edge is due, holding it rising FASTER
    // than the gate so every expiry is refused.
    let enemy: EnemyState = { ...airborneEnemy('b2undr', -0x400), seek: { mode: 'up', pdist: 0x4000 } }
    let refusedWakes = 0
    for (let i = 0; i < 30; i++) {
      const r = e.stepEnemyDetailed(enemy, { player: FAR_ABOVE, wave: 1 })
      if (r.wingEdge === 'down') refusedWakes += 1
      enemy = {
        ...r.enemy,
        seek: { mode: 'up', pdist: 0x4000 },
        entity: { ...r.enemy.entity, posY: 0x60 << 8, velY: -0x400, airborne: true , posX: 100, velXIndex: 0, velXFrac: 0 },
      }
    }
    expect(refusedWakes, 'a hunter climbing faster than HUUPVY never flaps').toBe(0)

    // Now let it slow to inside the gate. Because the refusals RE-ARMED the
    // timer to 1 rather than reloading HUUPWU, the flap must come on the very
    // next wake — not up to HUUPWU wakes later.
    const after = e.stepEnemyDetailed(
      { ...enemy, entity: { ...enemy.entity, velY: -0x080 } },
      { player: FAR_ABOVE, wave: 1 },
    )
    expect(after.wingEdge, 'the retry lands on the very next wake').toBe('down')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC7 — determinism survives. The digests MOVE (that is the point); the
//        property that must not move is that a seed still replays to itself.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC7 — the sim stays deterministic across the cadence change', () => {
  it('replays a seeded wave bit-for-bit from the same seed', async () => {
    const demo = await import('../src/core/demo.js')
    const run = (): unknown => {
      let s = demo.createWaveDemo(0x51ce)
      for (let i = 0; i < 240; i++) s = demo.stepDemo(s)
      return JSON.parse(JSON.stringify(s))
    }
    // This is NOT a re-baseline pin — it deliberately holds no recorded digest,
    // because AC7 says the recorded digests are EXPECTED to move. It pins the
    // invariant that must survive the move: same seed, same run.
    expect(run(), 'the same seed replays identically').toEqual(run())
  })

  it('makes the wave argument reach the UP-SEEK cadence in a full-cabinet run', async () => {
    // The end-to-end proof that the latch is wired into the running sim rather
    // than only into `boundr()` — the uf1-2 failure mode, where the engine was
    // perfect and no caller ever reached it.
    //
    // THIS PROBE MUST BE STAGED, AND THE STAGING MUST BE RE-APPLIED EVERY FRAME.
    // Measured on this seed: a natural 240-frame wave enters the up-seek on
    // ZERO frames (down-seek 128) — buzzards only climb toward a quarry ABOVE
    // them, and knights do not stay above them, because gravity. Parking the
    // knights high ONCE decays within a few frames and measures nothing; parking
    // them every frame yields 149 up-seek frames. That is the jt5-10 re-apply
    // rule, and skipping it is what made the first draft of this test compare
    // two empty arrays and pass for the wrong reason.
    const demo = await import('../src/core/demo.js')

    interface Proc { kind: string; enemy?: { seek?: { mode: string } } }
    type Demo = ReturnType<typeof demo.createWaveDemo>

    type Process = Demo['sim']['processes'][number]
    const park = (s: Demo): Demo => ({
      ...s,
      sim: {
        ...s.sim,
        processes: s.sim.processes.map((p): Process => {
          if (p.kind !== 'player' || p.entity === undefined) return p
          return { ...p, entity: { ...p.entity, posY: 0x18 << 8, velY: 0, airborne: true } }
        }),
      },
    })

    const play = (wave: number): { trace: string; upFrames: number } => {
      let s: Demo = park({ ...demo.createWaveDemo(0x51ce), wave })
      let upFrames = 0
      const trace: string[] = []
      for (let i = 0; i < 240; i++) {
        s = park(demo.stepDemo(s))
        const enemies = (s.sim.processes as unknown as Proc[]).filter((p) => p.kind === 'enemy')
        upFrames += enemies.filter((p) => p.enemy?.seek?.mode === 'up').length
        trace.push(
          JSON.stringify(
            s.sim.processes
              .filter((p) => p.kind === 'enemy')
              .map((p) => [p.id, p.enemy?.entity.posY, p.enemy?.entity.velY]),
          ),
        )
      }
      return { trace: trace.join('|'), upFrames }
    }

    const w1 = play(1)
    const w7 = play(7)

    // THE PROBE GUARDS ITS OWN DISCRIMINABILITY (the uf1-2 pattern). The wing
    // rows live ONLY on the up-seek path, so if the staging stops producing
    // up-seek frames this comparison silently becomes untestable — and would
    // then "pass" for a port that wired nothing.
    expect(w1.upFrames, 'wave 1 must actually reach the up-seek').toBeGreaterThan(0)
    expect(w7.upFrames, 'wave 7 must actually reach the up-seek').toBeGreaterThan(0)

    // BOUPWD/BOUPWU are 2/8 at wave 1 and 1/6 at wave 7, so an enemy climbing
    // under the latch flaps on a different cadence and its trajectory diverges.
    expect(w7.trace, 'wave 7 climbs on a different wing cadence from wave 1').not.toBe(w1.trace)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// ROUND 2 — the review's mutation battery found six survivors. These close the
// four that were real gaps (R1-1 … R1-4); M8 is an equivalent mutant and is
// recorded in the assessment rather than tested.
//
// The cliff coordinates are steering.test.ts's, re-asserted as premises here so
// this file does not inherit an unstated dependency: at (204, 75) the BACKGROUND
// pair is solid 31 px to the right and clear at the bird itself.
// ═════════════════════════════════════════════════════════════════════════════
describe('R1-1/R1-2 — the cliff dwell is SHCLTM wakes of SHAV/B2AV, and it never flaps', () => {
  /** A brain parked at the cliff, travelling right into it (`velXIndex` 8). */
  const atCliff = (brain: 'b2undr' | 'shadow'): EnemyState => ({
    ...airborneEnemy(brain, 0),
    entity: {
      ...airborneEnemy(brain, 0).entity,
      posX: 204,
      posY: 75 << 8,
      velXIndex: 8,
      velY: 0,
    },
  })

  it('fixture premise: the staged coordinate really turns the brain', async () => {
    const e = await loadEnemy()
    // Without this the dwell tests would pass vacuously on a bird that never
    // turned — nothing would arm a dwell and nothing would flap either.
    expect(e.steerWake(atCliff('shadow'), null).turned, 'the shadow turns here').toBe(true)
    expect(e.steerWake(atCliff('b2undr'), null).turned, 'the hunter turns here').toBe(true)
  })

  it('holds the SHADOW for SHCLTM wakes after a cliff turn, wings UP throughout', async () => {
    const e = await loadEnemy()
    const d = await loadDifficulty()
    const dwell = d.waveValue('SHCLTM', 1)
    // The discriminating neighbour: SHUPTM is 10 at wave 1 where SHCLTM is 8, so
    // a dwell wired to the wrong row is visible in the run length.
    expect([dwell, d.waveValue('SHUPTM', 1)], 'SHCLTM vs its neighbour at wave 1').toEqual([8, 10])

    // The turn wake itself flaps (`LDB #1`, :4377) and arms the dwell.
    let r = e.stepEnemyDetailed(atCliff('shadow'), { player: null, wave: 1 })
    expect(r.enemy.pjoy, 'the turn arms a dwell').toEqual({ kind: 'dwell', timer: dwell })
    expect(r.enemy.prevFlapHeld, 'the turn wake itself flaps').toBe(true)

    // Then SHCLTM wakes of wings-UP. The bird is carried with `velXIndex: 0`
    // from here on: `steerWake` returns early when the horizontal index is zero
    // (:924-925), so it cannot turn AGAIN and re-arm the dwell to full length on
    // every wake — which is faithful behaviour at a cliff, and makes the decay
    // unobservable. Staging the turn once and then holding still is what lets the
    // countdown be read at all.
    const timers: Array<number | undefined> = []
    const heldAfter: boolean[] = []
    for (let i = 0; i < dwell + 1; i++) {
      const carried: EnemyState = {
        ...r.enemy,
        entity: { ...r.enemy.entity, posX: 204, posY: 75 << 8, velXIndex: 0, velY: 0 },
      }
      r = e.stepEnemyDetailed(carried, { player: null, wave: 1 })
      timers.push(r.enemy.pjoy?.kind === 'dwell' ? r.enemy.pjoy.timer : undefined)
      heldAfter.push(r.enemy.prevFlapHeld ?? false)
    }
    // It counts DOWN one per wake from SHCLTM−1 and then clears — the dwell is a
    // real countdown of the row's length, not a flag.
    expect(timers.slice(0, dwell - 1), 'SHCLTM wakes, counted down').toEqual(
      Array.from({ length: dwell - 1 }, (_, i) => dwell - 1 - i),
    )
    expect(timers[dwell - 1], 'and then it is cleared — JMP SHADOW re-decides').toBeUndefined()
    // Wings stay UP for every wake of it. Kills "the dwell is a wing-DOWN hold"
    // and "the dwell flaps on expiry".
    expect(heldAfter.slice(0, dwell - 1), 'the dwell holds the wings up').toEqual(
      new Array(dwell - 1).fill(false),
    )
  })

  it('gives the HUNTER a dwell of its own frozen 8 — never the SHCLTM row', async () => {
    const e = await loadEnemy()
    const d = await loadDifficulty()
    // At wave 3 SHCLTM has walked to 7 while `B2DICL`'s `LDA #8` (:4144) has not
    // moved. That gap is the whole assertion — at wave 1 both read 8 and a
    // wrongly-wired dwell would be invisible.
    expect(d.waveValue('SHCLTM', 3), 'SHCLTM walks').toBe(7)
    expect(e.HUNTER_CLIFF_DWELL, 'the hunter dwell is frozen').toBe(8)

    const r = e.stepEnemyDetailed(atCliff('b2undr'), { player: null, wave: 3 })
    expect(r.enemy.pjoy, 'the hunter dwells on its own constant, not the row').toEqual({
      kind: 'dwell',
      timer: e.HUNTER_CLIFF_DWELL,
    })
  })

  it('re-decides on dwell expiry instead of flapping — B2AV/SHAV JMP, never LDB #1', async () => {
    const e = await loadEnemy()
    const d19 = await loadDifficulty()
    // R1-2's actual defect: the hunter's dwell used to share a shape with the
    // wing cadence, so its expiry ran the wing law and FLAPPED. `B2AV`
    // (:4190-4193) is `CLRB / DEC PJOYT,U / BGT B2DIRA / JMP B2UNDR`.
    // `velXIndex: 0` so the staged dwell is not overwritten by a fresh turn, and
    // RISING so the re-decided state's own law says no-flap. That isolates the
    // thing under test: any wing-down edge on this wake could only come from the
    // dwell being mis-read as a wing hold. (At velY 0 the level law flaps by
    // itself — `B2LEV1`'s "FALLING?" — which would mask the defect entirely.)
    let enemy: EnemyState = {
      ...atCliff('b2undr'),
      pjoy: { kind: 'dwell', timer: 1 },
      entity: { ...atCliff('b2undr').entity, velXIndex: 0, velY: -0x100 },
    }
    const r = e.stepEnemyDetailed(enemy, { player: null, wave: 1 })
    // The expiry RE-DECIDES on the same wake — `JMP B2UNDR` (:4193) falls into
    // `BEQ B2LEVV` with no players, so the hunter arrives in level flight and
    // arms HULETM. What must NOT happen is the dwell becoming a wing phase, or
    // the expiry pressing the button.
    expect(r.enemy.pjoy?.kind, 'the expiry re-decides, it does not become a wing hold').toBe(
      'interval',
    )
    expect(r.enemy.pjoy, 'and the re-decide armed the level interval').toEqual({
      kind: 'interval',
      timer: d19.waveValue('HULETM', 1),
    })
    expect(r.wingEdge, 'the expiry does not press the button').not.toBe('down')

    // …and the dwell is honoured on the DOWN route too, which the pre-fix code
    // ignored outright because that branch re-tested the brake and never read
    // the timer.
    enemy = {
      ...atCliff('b2undr'),
      seek: { mode: 'down', pdist: -0x4000 },
      pjoy: { kind: 'dwell', timer: 4 },
      entity: { ...atCliff('b2undr').entity, velY: 0x400, velXIndex: 0 },
    }
    const down = e.stepEnemyDetailed(enemy, { player: FAR_BELOW, wave: 1 })
    expect(down.enemy.pjoy, 'a down-route dwell still counts down').toEqual({
      kind: 'dwell',
      timer: 3,
    })
    expect(down.enemy.prevFlapHeld, 'and holds the wings up despite the brake').toBe(false)
  })
})

describe('R1-3 — the shadow reads SHLETM with no target and SHUPTM with one', () => {
  it('arms SHLETM (its OWN line) when SELPLY finds nobody', async () => {
    const e = await loadEnemy()
    const d = await loadDifficulty()
    // SHLEV :4312-4317 tracks its own line on SHLETM; SHLEP :4277-4284 tracks the
    // PLAYER's on SHUPTM. They differ 21 vs 10 at wave 1, so this discriminates.
    expect([d.waveValue('SHLETM', 1), d.waveValue('SHUPTM', 1)], 'the two shadow rows').toEqual([
      21, 10,
    ])
    const noTarget = e.stepEnemy(airborneEnemy('shadow', 0), { player: null, wave: 1 })
    expect(noTarget.pjoy, 'a shadow with no players holds SHLEV/SHLETM').toEqual({
      kind: 'interval',
      timer: d.waveValue('SHLETM', 1),
    })
  })

  it('arms SHUPTM when it has a quarry at short range', async () => {
    const e = await loadEnemy()
    const d = await loadDifficulty()
    const targeted = e.stepEnemy(airborneEnemy('shadow', 0), { player: SAME_LINE, wave: 1 })
    expect(targeted.pjoy, 'a hunting shadow holds SHLEP/SHUPTM').toEqual({
      kind: 'interval',
      timer: d.waveValue('SHUPTM', 1),
    })
  })
})

describe('R1-4 — the down-seek arms NO wing-up reload', () => {
  it('keeps every wings-UP run to a single wake, at every wave', async () => {
    // `BODN2`'s expiry is `LDD #BODN1 / STD PJOY,U / CLRB` (:3837-3839) — it
    // stores NOTHING into PJOYT, so the wings-up side is re-decided by the brake
    // on the very next wake. TEA's original down-seek test filtered the
    // wings-DOWN runs only, so a BOUPWU-length hold here went unnoticed (M4).
    const e = await loadEnemy()
    for (const wave of [1, 7]) {
      let enemy: EnemyState = {
        ...airborneEnemy('boundr', 0x300),
        seek: { mode: 'down', pdist: -0x4000 },
      }
      const seen: boolean[] = []
      for (let i = 0; i < 30; i++) {
        const stepped = e.stepEnemy(enemy, { player: FAR_BELOW, wave })
        seen.push(stepped.prevFlapHeld ?? false)
        enemy = {
          ...stepped,
          seek: { mode: 'down', pdist: -0x4000 },
          entity: {
            ...stepped.entity,
            posY: 0x60 << 8,
            velY: 0x300,
            airborne: true,
            posX: 100,
            velXIndex: 0,
            velXFrac: 0,
          },
        }
      }
      const upRuns = completeRuns(seen)
        .filter(([lvl]) => !lvl)
        .map(([, n]) => n)
      expect(upRuns.length, `w${wave}: wings-up runs observed`).toBeGreaterThanOrEqual(2)
      for (const n of upRuns) expect(n, `w${wave}: the brake re-decides every wake`).toBe(1)
    }
  })
})

describe('R1-3b — a running shadow interval HOLDS the level branch', () => {
  it('ignores a quarry that wanders into climb range until the interval expires', async () => {
    // Found by mutation M17: before this the interval was armed from the right
    // row, ticked correctly, and gated NOTHING — `shadow()` re-ran its range gate
    // every wake, so SHUPTM/SHLETM were read and inert. `SHLEP1`/`SHLEV1` spend
    // the countdown and only its expiry returns to SHADOW (:4286-4287, :4319-4320).
    const e = await loadEnemy()
    const d = await loadDifficulty()
    const interval = d.waveValue('SHUPTM', 1)

    // Establish the level episode with a short-range quarry…
    let enemy: EnemyState = airborneEnemy('shadow', -0x100)
    enemy = e.stepEnemy(enemy, { player: SAME_LINE, wave: 1 })
    expect(enemy.pjoy, 'a short-range shadow holds SHLEP/SHUPTM').toEqual({
      kind: 'interval',
      timer: interval,
    })

    // …then put the quarry far ABOVE, which is long-range CLIMB — and stage the
    // shadow RISING FASTER than SHUPVY (−$600 vs the wave-1 gate −$200). That is
    // the one geometry where the two branches disagree: the climb branch refuses
    // the flap (`CMPD SHUPVY / BLT SHUP0`) while SHLEP flaps because the shadow
    // sits below its quarry (`enemyY > player.pixelY`). With a slower rise BOTH
    // branches flap and the hold is unobservable — the first draft of this test
    // staged −$100 and passed for that reason.
    const RISING_FAST = -0x600
    expect(RISING_FAST, 'premise: faster than the wave-1 SHUPVY gate').toBeLessThan(
      d.waveValue('SHUPVY', 1),
    )
    const flaps: boolean[] = []
    for (let i = 0; i < interval - 2; i++) {
      const held: EnemyState = {
        ...enemy,
        entity: { ...enemy.entity, posY: 0x60 << 8, velY: RISING_FAST, airborne: true },
      }
      flaps.push(e.shadow(held, FAR_ABOVE, 1).flap)
      enemy = e.stepEnemy(held, { player: FAR_ABOVE, wave: 1 })
    }
    // Every mid-interval wake takes SHLEP (flap), not the climb (no flap).
    expect(flaps.every((f) => f), 'the level branch is held for the whole interval').toBe(true)
    // The control: with no interval running, the SAME state takes the climb.
    const fresh: EnemyState = {
      ...airborneEnemy('shadow', RISING_FAST),
      entity: { ...airborneEnemy('shadow', RISING_FAST).entity, velY: RISING_FAST },
    }
    expect(e.shadow(fresh, FAR_ABOVE, 1).flap, 'unheld, the climb branch refuses the flap').toBe(
      false,
    )
  })

  it('re-decides once the interval elapses — the hold is a timer, not a freeze', async () => {
    const e = await loadEnemy()
    const d = await loadDifficulty()
    const interval = d.waveValue('SHUPTM', 1)
    let enemy: EnemyState = e.stepEnemy(airborneEnemy('shadow', -0x100), {
      player: SAME_LINE,
      wave: 1,
    })
    let cleared: number | null = null
    for (let i = 0; i < interval * 2; i++) {
      enemy = e.stepEnemy(
        { ...enemy, entity: { ...enemy.entity, posY: 0x60 << 8, velY: -0x100, airborne: true } },
        { player: FAR_ABOVE, wave: 1 },
      )
      // On expiry it re-decides: the quarry is far above, which is the CLIMB
      // branch, and the climb carries no countdown at all (SHUP1 :4269-4275).
      if (cleared === null && enemy.pjoy === undefined) cleared = i + 1
    }
    expect(cleared, 'the interval must end').not.toBeNull()
    expect(cleared!, 'and end at its own length, not immediately or never').toBeGreaterThanOrEqual(
      interval - 2,
    )
  })
})
