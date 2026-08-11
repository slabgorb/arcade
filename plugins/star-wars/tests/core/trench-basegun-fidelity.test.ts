// tests/core/trench-basegun-fidelity.test.ts
//
// Story sw11-1 — RED phase (Han Solo / TEA): the trench return fire is grossly too
// lethal. sw7-20 (B-017) wired the guns to fire; the sw10 basis unification then
// exposed that the CONSTANTS are faithful but three MECHANISMS are missing. This
// suite pins those three, each cited to the 1983 source, each deterministic (fixed
// seed + fixed pilot). It is RED until sw11-1 lands: today `stepTrench`
// (sim.ts:1493-1508) fires every in-range turret on a flat roll, caps concurrent
// shots at MAX_FIREBALL_SLOTS (6), and hands each shot a PERFECT analytic lead
// (`trenchGunFireVelocity`). The cabinet does all three differently.
//
// -- GROUND TRUTH (grep ~/Projects/star-wars-1983-source-text) -----------------
//
// (1) AIM — WSGUNS.MAC PANLIN:409-432 / MOVPL:788-812 / MOVPR:814-846.
//     PANLIN spawns the shell AT THE GUN'S OWN PANEL POSITION with a semi-random Z
//     angle (`LDA P.RND1 / LSRA ;45 DEGREES`; level for a top panel). The ROM NEVER
//     leads: MOVPL/MOVPR then move it with a heavily DAMPED (`ASRD4` = >>4 = 1/16 of
//     the gap per frame), DIRECTIONALLY-LIMITED heat-seek. The spawn angle is a
//     function of the GUN and the RNG, never of the player — so it is INDEPENDENT of
//     where the ship sits. Ours computes `trenchGunFireVelocity(gunPos, trenchView)`,
//     a closed-form lead that points straight at the ship (gameRules.ts:89-94).
//
// (2) CONCURRENCY — WSGUNS.MAC GNBSAVAIL:210-244. Base-gun shells are capped by the
//     per-difficulty TGNBS table `GUNZ-<N*G$IZE>`, N over WV.HRD 0..7 clamped:
//         TGNBS = [1, 1, 2, 2, 3, 3, 3, 4]
//     Wave-1 trench (WV.HRD 0) allows exactly ONE base shell in the air. Ours allows
//     a flat MAX_FIREBALL_SLOTS = 6 — 6x at wave 1.
//
// (3) ELIGIBILITY — WSBASE.MAC BSGUN:1236-1341. A gun fires only when the player is
//     ABOVE the bunker (`SUBD M.Z0 / IFGE ?PLAYER ABOVE BUNKER?`) and within a height
//     band; never when the player is BELOW it, and never point-blank (`ADDA #20+4
//     ;(DONT SHOOT IF TOO CLOSE)`, firing bunkers begin one panel #800 out to the
//     furthest #6000). Ours gates only on the far range (`pos[0] > 0x6000`).
//
// -- REPRESENTATION CONTRACT ---------------------------------------------------
//
// Same seams as sw7-20: a wall gun is `kind:'turret'`; a shot is an `enemyShots`
// `Projectile` and emits `enemy-fire`; a cockpit hit fires `player-death`/spends a
// shield. This suite pins the OBSERVABLE ROM mechanisms (player-independent spawn,
// TGNBS concurrency, the vertical gate, no point-blank fire). The EXACT height-band
// literals (#400 → WALL_SLOT_Y) and the EXACT too-close depth are the Dev's to
// derive from BSGUN — the tests below pin them only with conservative margins plus
// the TGNBS table exactly.

import { describe, it, expect } from 'vitest'
import { initialState, type GameState, type TrenchObstacle } from '../../src/core/state'
import { stepGame, enterPhase } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'
import { wvHrd } from '../../src/core/gameRules'
import { TRENCH_EYE_SEAT, TRENCH_HALF_W } from '../../src/core/trench-channel'
import type { Vec3 } from '@shared/math3d'

const SEAT = TRENCH_EYE_SEAT // 768 — the pilot's seat height
const DT = 1 / 60
const SEEDS = [1, 3, 5, 7, 9, 11, 13, 17] // fixed ⇒ deterministic aggregates

// The ROM's TGNBS base-gun concurrency table (WSGUNS.MAC:236, GUNZ-<N*G$IZE>),
// indexed by WV.HRD 0..7. An INDEPENDENT literal — the contract, not read from src.
const TGNBS = [1, 1, 2, 2, 3, 3, 3, 4] as const

/** An isolated trench holding ONLY the given wall guns (no exhaust port), so the
 *  base-gun shots are the ONLY things in `enemyShots` and the count is clean. */
function trench(guns: TrenchObstacle[], view: Vec3, opts: { wave: number; seed: number }): GameState {
  return {
    ...enterPhase(initialState(opts.seed), 'trench'),
    mode: 'playing',
    wave: opts.wave,
    exhaustPort: null,
    projectiles: [],
    trenchObstacles: guns.map((o) => ({ kind: o.kind, pos: [...o.pos] as Vec3 })),
    trenchView: [...view] as Vec3,
  }
}

/** A wall gun (turret) at wall-x `x`, depth `z` ahead, and height `h` (default seat). */
const gun = (x: number, z: number, h: number = SEAT): TrenchObstacle => ({ kind: 'turret', pos: [z, x, h] })

/** The gunDiff the trench table resolves for a wave at gmDif 0 (clamped 0..7). */
const gunDiffFor = (wave: number): number => Math.min(wvHrd(wave, 0), TGNBS.length - 1)

// ---------------------------------------------------------------------------
// (2) CONCURRENCY — airborne base shots are capped at TGNBS[gunDiff], not a flat 6.
// ---------------------------------------------------------------------------
describe('sw11-1 — trench base-gun concurrency is capped at TGNBS[gunDiff] (GNBSAVAIL, WSGUNS.MAC:210-244)', () => {
  /** A DENSE armed channel: many aligned in-range guns on both walls, so an
   *  unbounded (or flat-6) cap will stack multiple shots in the air at once. */
  const denseChannel = (): TrenchObstacle[] =>
    Array.from({ length: 24 }, (_, i) => gun(i % 2 === 0 ? -300 : 300, 800 + i * 900))

  /** Fly the channel and report the PEAK number of base-gun shots airborne at once
   *  (in the isolated trench, `enemyShots` are exactly those shots) and total fires. */
  function peakConcurrent(s0: GameState, frames = 200): { peak: number; fires: number } {
    let s = s0
    let peak = s.enemyShots.length
    let fires = 0
    for (let i = 0; i < frames && s.mode === 'playing'; i++) {
      s = stepGame(s, NO_INPUT, DT)
      peak = Math.max(peak, s.enemyShots.length)
      fires += s.events.filter((e) => e.type === 'enemy-fire').length
    }
    return { peak, fires }
  }

  it('a wave-1 trench (gunDiff 0) allows exactly ONE base shell in the air — not the flat 6', () => {
    // Aggregated over the fixed seeds so the peak is a hard, non-flaky bound. RED:
    // MAX_FIREBALL_SLOTS = 6 lets a dense wave-1 opening put up to 6 shots airborne.
    let worstPeak = 0
    let totalFires = 0
    for (const seed of SEEDS) {
      const { peak, fires } = peakConcurrent(trench(denseChannel(), [0, 0, SEAT], { wave: 1, seed }))
      worstPeak = Math.max(worstPeak, peak)
      totalFires += fires
    }
    expect(totalFires, 'the dense channel actually fires (the cap is exercised)').toBeGreaterThan(0)
    expect(worstPeak, 'wave-1 base guns never stack more than TGNBS[0] = 1 in the air').toBeLessThanOrEqual(TGNBS[0])
  })

  it('the concurrent cap tracks TGNBS across difficulty (waves 1,3,5,8 → gunDiff 0,2,4,7 → 1,2,3,4)', () => {
    // Each harder wave earns one more concurrent slot, exactly per the ROM table —
    // and never MAX_FIREBALL_SLOTS (6). RED: all four are capped at the flat 6.
    for (const wave of [1, 3, 5, 8]) {
      const cap = TGNBS[gunDiffFor(wave)]
      let worstPeak = 0
      let totalFires = 0
      for (const seed of SEEDS) {
        const { peak, fires } = peakConcurrent(trench(denseChannel(), [0, 0, SEAT], { wave, seed }))
        worstPeak = Math.max(worstPeak, peak)
        totalFires += fires
      }
      expect(totalFires, `wave ${wave} fires (cap exercised)`).toBeGreaterThan(0)
      expect(worstPeak, `wave ${wave} (gunDiff ${gunDiffFor(wave)}) caps concurrent base shots at ${cap}`).toBeLessThanOrEqual(cap)
    }
  })
})

// ---------------------------------------------------------------------------
// (1) AIM — the spawn is the gun's own random/level angle, INDEPENDENT of the ship;
//     never the closed-form analytic lead.
// ---------------------------------------------------------------------------
describe('sw11-1 — trench base guns do not lead the ship (PANLIN/MOVPL, WSGUNS.MAC:409-432,788-846)', () => {
  /** Fire a SINGLE aligned in-range gun and return the first shot's launch velocity,
   *  or null if it never fires within the window. Only the pilot's LATERAL seat
   *  differs between callers — nothing that gates or seeds the shot, so any
   *  difference in the launch is the lead tracking the ship. */
  function firstShotVel(view: Vec3, seed: number, frames = 120): Vec3 | null {
    let s = trench([gun(0, 0x3000)], view, { wave: 8, seed })
    for (let i = 0; i < frames && s.mode === 'playing'; i++) {
      s = stepGame(s, NO_INPUT, DT)
      if (s.enemyShots.length > 0) return [...s.enemyShots[0].vel] as Vec3
    }
    return null
  }

  it('the launch velocity is INDEPENDENT of the ship point (a lead would track it)', () => {
    // Same gun, same seed, same firing frame — only the pilot's lateral seat moves.
    // The ROM spawn angle is a function of the gun + RNG, so both launches are
    // IDENTICAL. RED: `trenchGunFireVelocity(gunPos, trenchView)` points at the ship,
    // so moving the ship laterally changes the launch — the two differ.
    const centred: Vec3 = [0, 0, SEAT]
    const offset: Vec3 = [0, TRENCH_HALF_W / 2, SEAT] // 512 to the right, still in-channel
    let compared = 0
    for (const seed of SEEDS) {
      const a = firstShotVel(centred, seed)
      const b = firstShotVel(offset, seed)
      if (a === null || b === null) continue
      compared++
      expect(b, `seed ${seed}: launch is player-independent, not a lead`).toEqual(a)
    }
    expect(compared, 'at least some seeds fired so the comparison ran').toBeGreaterThan(0)
    // NOTE: today's launch, from the RED output above, is the closed-form lead —
    // e.g. an off-centre pilot draws `[-15750, 810.9, 0]` where a centred one draws
    // `[-15750, 0, 0]`. A random/level spawn angle (PANLIN) makes both identical.
  })
})

// ---------------------------------------------------------------------------
// (3) ELIGIBILITY — the vertical gate: fire only at a player ABOVE the gun; never a
//     player BELOW it; and never point-blank.
// ---------------------------------------------------------------------------
describe('sw11-1 — trench base guns fire only the aligned subset (BSGUN, WSBASE.MAC:1236-1341)', () => {
  const gunLine = (h: number): TrenchObstacle[] =>
    Array.from({ length: 12 }, (_, i) => gun(i % 2 === 0 ? -300 : 300, 800 + i * 1800, h))

  function fireCount(s0: GameState, frames = 200): number {
    let s = s0
    let fires = 0
    for (let i = 0; i < frames && s.mode === 'playing'; i++) {
      s = stepGame(s, NO_INPUT, DT)
      fires += s.events.filter((e) => e.type === 'enemy-fire').length
    }
    return fires
  }

  it('a gun the player sits well BELOW never fires; a level/below gun does (the vertical gate)', () => {
    // The ROM's `IFGE ?PLAYER ABOVE BUNKER?` — a bunker mounted a full wall-height
    // ABOVE the pilot can not depress its gun onto him. RED: `stepTrench` ignores
    // height entirely, so the high guns fire just as often as the level ones.
    let abovePlayerFires = 0 // guns mounted above the pilot ⇒ player is below ⇒ silent
    let levelFires = 0 // guns at the seat ⇒ player level/above ⇒ fire
    for (const seed of SEEDS) {
      abovePlayerFires += fireCount(trench(gunLine(SEAT + 0x1000), [0, 0, SEAT], { wave: 8, seed }))
      levelFires += fireCount(trench(gunLine(SEAT), [0, 0, SEAT], { wave: 8, seed }))
    }
    expect(levelFires, 'the aligned (level/below) guns fire — positive control').toBeGreaterThan(0)
    expect(abovePlayerFires, 'a gun the player is a full wall-height below never fires').toBe(0)
  })

  it('a point-blank gun never fires (DONT SHOOT IF TOO CLOSE)', () => {
    // Firing bunkers begin one panel out; the panel at the cockpit is skipped. RED:
    // the only depth gate is the FAR range (`pos[0] > 0x6000`), so a gun scrolling
    // through the cockpit zone fires point-blank. A dense channel guarantees the
    // near zone is sampled at openings. Assert the closest a gun ever fires from is
    // not point-blank — a conservative half-panel floor (0x400) well inside the
    // ROM's ~one-panel (#800) firing start; the exact too-close depth is Dev's to
    // pin in GREEN from BSGUN.
    const TOO_CLOSE = 0x400 // 1024, half a wall panel
    const dense = Array.from({ length: 24 }, (_, i) => gun(i % 2 === 0 ? -300 : 300, 400 + i * 700))
    let minFireDepth = Infinity
    let fires = 0
    for (const seed of SEEDS) {
      let s = trench(dense, [0, 0, SEAT], { wave: 8, seed })
      for (let i = 0; i < 200 && s.mode === 'playing'; i++) {
        s = stepGame(s, NO_INPUT, DT)
        for (const e of s.events) {
          if (e.type === 'enemy-fire') {
            fires++
            minFireDepth = Math.min(minFireDepth, e.pos[0])
          }
        }
      }
    }
    expect(fires, 'the dense channel fires (the too-close gate is exercised)').toBeGreaterThan(0)
    expect(minFireDepth, 'no gun fires from point-blank range').toBeGreaterThanOrEqual(TOO_CLOSE)
  })
})
