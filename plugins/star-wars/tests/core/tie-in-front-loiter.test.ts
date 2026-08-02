// tests/core/tie-in-front-loiter.test.ts
//
// sw8-9 RED (Mr. Praline / TEA) — TIEs must LOITER AND CONVERGE IN FRONT of the pilot, never
// crossing behind the eye, and a TIE BODY must not damage the player (model §9-3 "no body
// collision"). Carries the two items sw8-6 deferred (its Dev finding, sprint/archive/sw8-6-session.md):
// the §5 play-cube clamp (`sub_8DE3`) and loiter/no-ram.
//
// THE RULING (rule-before-fix, epic sw8 §3 — established by RUNNING the real sim before writing a
// line of this suite; the numbers below are measured, not assumed. See the session Delivery
// Findings). One hero TIE per ROM spawn slot, no player input, spawner + enemy fire parked:
//
//   slot 0 (spawn [0,1024,-31744])   flies clean PAST the eye to z = +22,857 — 22.8k units BEHIND
//                                     the pilot — then loops. Never rams (it clears the cockpit
//                                     sphere by y=1024), so nothing removes it on the way through.
//   slots 1,2 (spawn [∓1024,0,…])    fly past to z = +5,705.
//   slots 3,4,5                       RAM the cockpit at ~f66 and are REMOVED by the body-collision
//                                     this story deletes, costing a shield (lives 6 → 5).
//
// The two ACs INTERACT, and the interaction is the trap. Slots 3-5 look "in front" today ONLY
// because the ram despawns them. Lift slot 3 clear of the 80-unit cockpit sphere — exactly what
// AC-3 does by deleting the body collision — and its own script carries it to z = +27,964. So
// AC-3 alone makes the fly-past STRICTLY WORSE; the loiter is what must hold the line.
//
// AND THE CLAMP IS NOT THAT MECHANISM. The play cube is ±$7CFF = ±31,999 raw (star-wars
// CLAUDE.md: "coordinates are 16-bit raw ROM units … play cube clamps at ±$7CFF"; ROM distances
// port UNSCALED, and TIE_SPAWN_DISTANCE = $7C00 is already used raw). Every measured overshoot
// above — 22,857 / 5,705 / 27,964 — sits INSIDE that bound with 4k-9k of headroom, so a faithful
// `sub_8DE3` clamp NEVER ENGAGES on a real trajectory. It is CONTAINMENT (a backstop against
// escaping the cube), and porting it is AC-1 on its own merits.
//
// ── GREEN CORRECTION: "never behind the eye" IS NOT THE ROM, and this suite no longer claims it ──
//
// RED pinned AC-2 as "a TIE never travels behind the cockpit eye". Reading the cabinet's own
// choreography source refutes that premise outright. TCH1A1 (WSCPU.MAC:1330-1341) is *authored*
// to overshoot:
//
//     .CT 40,0,C$MF      ;TAKES ME HALFWAY TO PLAYER   -> 66 frames x $100 = 16,896
//     .CT 40,0,C$MF2                                   -> 66 frames x $200 = 33,792
//     .CT 20,C$PU,C$MF   ;PREPARE FOR TURNOVER
//
// From the $7C00 = 31,744 spawn that is 16,896 in (to -14,848) and then 33,792 more — the fighter
// ends ~18,900 units BEHIND the pilot and the next maneuver is literally commented "PREPARE FOR
// TURNOVER". Flying past and looping back is the design, not the defect; our measured 22,857 is
// that same maneuver. `CPCHKL` clamps all three axes symmetrically (`.IRPC .1,<XYZ>`, the same
// $7CFF/$8300 pins on each), so nothing in the ROM holds a fighter in front either. A test
// asserting "never behind" would pin a behaviour the cabinet does not have, so those six slot
// assertions are RETIRED rather than made to pass by an invented mechanism.
//
// What the pilot actually experiences as "TIEs get behind me and then snipe" has a REAL and
// ROM-checkable cause, and it is the fire gate, not the flight path. The cabinet's gate
// (WSCPU.MAC:622-633, label 140$ — reached by every skip above) tests only:
//
//     BITA #C$PV/100 / BEQ 40$   ;NO SHOOTING GUNS IF PLAYER CANT SEE US
//     BITA #C$T9     / BNE 40$   ;B NO SHOOT IF AIMMING IN FRONT
//     LDD M.XP / SUBD #800 / BLE ;B TOO CLOSE
//     LDA A$GLW(X)   / BNE 40$   ;not while glowing from a hit
//
// There is NO aim-cone test. C$AS ("PLAYER IN ALIENS SITES") is set a few lines earlier for the
// CHOREOGRAPHY to branch on (`.CUNTIL C$AS`) and is never consulted by the gate. Ours additionally
// required the fighter's nose within 12° of the pilot — the `FIRE_CONE_COS` this file's history
// names, itself since retired by uf1-15, which found C$AS to be a fixed radius about the nose axis
// rather than a half-angle at all — which is exactly a sniper's firing condition: rare, and
// perfectly lined up every time (measured: 2 shots in 19 s of wave). AC-2 is therefore re-pinned
// onto the divergence that is real.
//
// Sacred boundary: drives the public `stepGame` on the pure core — no DOM, no time except `dt`,
// no randomness except the seeded RNG carried in state.

import { describe, it, expect } from 'vitest'
import {
  initialState,
  TICK_HZ,
  PROJECTILE_TTL,
  TIE_SCORE,
  PLAY_CUBE_MAX,
  PLAY_CUBE_MIN,
  type GameState,
  type Projectile,
  type Enemy,
} from '../../src/core/state'
import { stepGame } from '../../src/core/sim'
import { COCKPIT } from '../../src/core/gameRules'
import { spawnTieForTest, NO_INPUT } from './helpers/space'
import { fireAt } from '../support/aim'
import { IDENTITY, rotationY, type Vec3 } from '@shared/math3d'

const SEED = 1983
const TICK_DT = 1 / TICK_HZ

// The play cube (`sub_8DE3` / CPCHKL, WSCPU.MAC:799-811) is imported from state.ts rather than
// re-declared here, so this suite pins the SHIPPED bound and a rename or retune cannot leave the
// test asserting a stale private copy. RED authored these as a symmetric ±$7CFF; the ROM's own
// negative pin is `LDD #8300` = -32,000, one unit past the positive $7CFF = +31,999 (two's
// complement, not a typo). Corrected against primary source during GREEN — see the deviation log.

/** Every ROM spawn slot the TBG lateral table walks (SPAWN_LATERALS is 6 long). */
const SLOTS = [0, 1, 2, 3, 4, 5]

/** Long enough for a full approach + the far side of any loop: the measured fly-pasts peak
 *  between f150 and f330, and the deepest (slot 0, +22,857) peaks at f154. */
const FLIGHT_FRAMES = 400

const tieAt = (pos: Vec3): Enemy => ({ pos, kind: 'tie', orient: IDENTITY })
const shotAt = (pos: Vec3): Projectile => ({ pos, vel: [0, 0, -1], ttl: PROJECTILE_TTL })

/** A quiet space frame: the hero is the only thing that moves — spawner and enemy fire parked. */
function quiet(over: Partial<GameState>, seed = SEED): GameState {
  return { ...initialState(seed), spawnTimer: 1e9, enemyFireCooldown: 1e9, ...over }
}

describe('sw8-9 AC-2 — the fire gate carries NO aim cone: the ROM tests only that the pilot can see it', () => {
  // THE SNIPER BUG. WSCPU.MAC:622-633 (label 140$) is the whole gate, and C$AS is not in it —
  // C$AS is set at :619-621 purely so the choreography can branch (`.CUNTIL C$AS`). Requiring the
  // nose within 12° before a fighter may shoot makes every shot it ever takes a perfectly lined-up
  // one, which is precisely what reads as sniping, and starves the wave (2 shots in 19 s measured).
  //
  // Staged OFF-AXIS: the fighter sits in clear view, well outside the $800 floor, but its nose is
  // rotated a quarter turn off the pilot — far outside the 12° cone, comfortably inside the ROM's
  // (non-existent) one. It must still be able to fire. The cadence gate and the PRNG roll are
  // authentic and stochastic, so this steps a window and asserts the fighter fires AT ALL.
  const offAxis = (): GameState =>
    quiet({
      enemies: [{ pos: [0, 0, -8000], kind: 'tie', orient: rotationY(Math.PI / 2) }],
      enemyFireCooldown: 0,
    })

  it('an off-axis fighter in plain view still fires (no 12° in-arc election)', () => {
    let s = offAxis()
    let fired = false
    for (let f = 0; f < 400 && !fired; f++) {
      s = stepGame(s, NO_INPUT, TICK_DT)
      fired = s.events.some((e) => e.type === 'enemy-fire')
      s = { ...s, enemies: [{ pos: [0, 0, -8000], kind: 'tie', orient: rotationY(Math.PI / 2) }] }
    }
    expect(fired, 'an off-axis TIE the pilot can plainly see never fired in 400 frames').toBe(true)
  })

  it('a fighter the pilot CANNOT see still never fires — C$PV survives (WSCPU.MAC:624-625)', () => {
    // The guard on the fix: dropping the aim cone must not drop the ROM's own first test. A
    // fighter parked behind the eye is off-screen and must stay silent — this is the assertion
    // that keeps "no aim cone" from becoming "shoots from anywhere", including from behind you.
    let s = quiet({
      enemies: [{ pos: [0, 0, 8000], kind: 'tie', orient: IDENTITY }],
      enemyFireCooldown: 0,
    })
    let fired = false
    for (let f = 0; f < 400 && !fired; f++) {
      s = stepGame(s, NO_INPUT, TICK_DT)
      fired = s.events.some((e) => e.type === 'enemy-fire')
      s = { ...s, enemies: [{ pos: [0, 0, 8000], kind: 'tie', orient: IDENTITY }] }
    }
    expect(fired, 'a TIE BEHIND the pilot fired — C$PV is not gating').toBe(false)
  })

  // THE STANDING GUARANTEE: shots come TOWARD the pilot, never from behind. The staged cases above
  // pin the gate on fixtures; this one pins the WHOLE WAVE, on the real spawner and the real
  // choreography, across several seeds — because the fighters genuinely do end up behind the eye
  // (TCH1A1's authored turnover), and this is the assertion that they cannot shoot from back there
  // when they do. Non-vacuity is asserted too: a run where nothing ever fired would satisfy a bare
  // "no shots from behind" trivially.
  it('across full waves, EVERY enemy shot originates in front of the pilot — never from behind', () => {
    let totalShots = 0
    const offenders: { seed: number; frame: number; shotZ: number; eyeZ: number }[] = []

    for (const seed of [1983, 7, 31337, 2024, 99]) {
      let s: GameState = initialState(seed)
      for (let f = 0; f < 1200; f++) {
        // The eye the C$PV test itself reads. sw8-8: the space eye IS the cockpit at the
        // origin, so its z is 0 — read it from COCKPIT rather than hand-writing the literal,
        // and keep sampling it per-frame so this stays honest if the seat ever moves again.
        const eyeZ = COCKPIT[2]
        const next = stepGame(s, NO_INPUT, TICK_DT)
        for (const ev of next.events) {
          if (ev.type !== 'enemy-fire') continue
          totalShots++
          // In front of the pilot is NEGATIVE z relative to the eye (spawnTie: -TIE_SPAWN_DISTANCE).
          if (ev.pos[2] >= eyeZ) offenders.push({ seed, frame: f, shotZ: ev.pos[2], eyeZ })
        }
        s = next
        if (s.phase !== 'space' || s.gameOver) break
      }
    }

    expect(totalShots, 'no enemy fire at all — the guarantee below would be vacuous').toBeGreaterThan(0)
    expect(offenders, `enemy fire originated BEHIND the pilot: ${JSON.stringify(offenders)}`).toEqual([])
  })

  it('a fighter inside the $800 floor still never fires — the "TOO CLOSE" pin survives', () => {
    let s = quiet({
      enemies: [{ pos: [0, 0, -0x400], kind: 'tie', orient: IDENTITY }],
      enemyFireCooldown: 0,
    })
    let fired = false
    for (let f = 0; f < 400 && !fired; f++) {
      s = stepGame(s, NO_INPUT, TICK_DT)
      fired = s.events.some((e) => e.type === 'enemy-fire')
      s = { ...s, enemies: [{ pos: [0, 0, -0x400], kind: 'tie', orient: IDENTITY }] }
    }
    expect(fired, 'a TIE inside the $800 floor fired — the too-close pin is not gating').toBe(false)
  })
})

describe('sw8-9 — flight-path facts the ROM fixes in place (regression bounds, not feel targets)', () => {
  it('the hero really flies the field, closing most of the spawn distance', () => {
    // Non-vacuity guard for this whole block: if a change parked TIEs at spawn or despawned them
    // on frame 1, the containment bound below would pass while nothing ever flew.
    let s = quiet({ enemies: [spawnTieForTest({ wave: 0, slot: 0, seed: SEED })] })
    const spawnDepth = -s.enemies[0].pos[2]
    let closest = spawnDepth
    for (let f = 0; f < FLIGHT_FRAMES; f++) {
      const e = s.enemies[0]
      if (!e) break
      closest = Math.min(closest, Math.abs(e.pos[2]))
      s = stepGame(s, NO_INPUT, TICK_DT)
    }
    expect(spawnDepth).toBeGreaterThan(30_000) // it really did start at the far edge
    expect(closest).toBeLessThan(spawnDepth / 4) // and really did close on the pilot
  })

  // The overshoot itself is AUTHORED (TCH1A1's `.CT 40,0,C$MF2` + "PREPARE FOR TURNOVER"), so it
  // is not pinned to a feel target. What the ROM DOES fix is the envelope: CPCHKL means no
  // fighter, on any slot, may ever leave the play cube. That is a real regression bound with a
  // primary source, and it is the honest replacement for RED's retired "never behind the eye".
  it.each(SLOTS)('slot %i stays inside the play cube for its whole flight', (slot) => {
    let s = quiet({ enemies: [spawnTieForTest({ wave: 0, slot, seed: SEED })] })
    for (let f = 0; f < FLIGHT_FRAMES; f++) {
      const e = s.enemies[0]
      if (!e) break
      for (const axis of [0, 1, 2] as const) {
        expect(e.pos[axis]).toBeGreaterThanOrEqual(PLAY_CUBE_MIN)
        expect(e.pos[axis]).toBeLessThanOrEqual(PLAY_CUBE_MAX)
      }
      s = stepGame(s, NO_INPUT, TICK_DT)
    }
  })
})

describe('sw8-9 AC-3 — no TIE-BODY collision: only fireballs damage the player (model §9-3)', () => {
  // The ROM has no alien-body-vs-ship test anywhere in the alien code — the choreography scripts
  // end in an infinite loiter (`.CGOTO 10$`, WSCPU.MAC:1387) and CPCHKL merely clamps the alien to
  // the play cube. Audit finding A-010 (docs/audit/findings/pair-tie-ai.json) carries this as a
  // live DIVERGENCE; this is the story that removes it.
  const AT_COCKPIT: Vec3 = [0, 0, 0]

  it('a TIE sitting on the cockpit costs NO shield', () => {
    const s0 = quiet({ enemies: [tieAt(AT_COCKPIT)], lives: 6 })
    expect(stepGame(s0, NO_INPUT, 0.001).lives).toBe(6)
  })

  it('a TIE sitting on the cockpit emits NO player-death event', () => {
    const s0 = quiet({ enemies: [tieAt(AT_COCKPIT)], lives: 6 })
    const out = stepGame(s0, NO_INPUT, 0.001)
    expect(out.events.filter((e) => e.type === 'player-death')).toHaveLength(0)
  })

  it('a TIE sitting on the cockpit is NOT removed — it loiters, it does not vanish into the pilot', () => {
    // The removal is the other half of the divergence: today the body-collision filter deletes the
    // fighter. Loitering fighters stay on the board until they are SHOT (or peel away at wave end).
    const s0 = quiet({ enemies: [tieAt(AT_COCKPIT)], lives: 6 })
    expect(stepGame(s0, NO_INPUT, 0.001).enemies).toHaveLength(1)
  })
})

describe('sw8-9 AC-4 — the surviving damage and kill paths are untouched (green guards)', () => {
  const AT_COCKPIT: Vec3 = [0, 0, 0]
  /** Dead ahead, outside COCKPIT_HIT_RADIUS — a target, not a collision. */
  const DOWNRANGE: Vec3 = [0, 0, -100]

  it('a FIREBALL on the cockpit still costs a shield and is still removed', () => {
    const s0 = quiet({ enemyShots: [shotAt(AT_COCKPIT)], lives: 6 })
    const out = stepGame(s0, NO_INPUT, 0.001)
    expect(out.lives).toBe(5)
    expect(out.enemyShots).toHaveLength(0)
  })

  it("a FIREBALL on the cockpit still emits player-death (cause 'enemy')", () => {
    const s0 = quiet({ enemyShots: [shotAt(AT_COCKPIT)], lives: 6 })
    expect(stepGame(s0, NO_INPUT, 0.001).events).toContainEqual({
      type: 'player-death',
      cause: 'enemy',
    })
  })

  it('the player beam still destroys a TIE and scores it', () => {
    const base = initialState(SEED)
    const s0 = quiet({ enemies: [tieAt(DOWNRANGE)] })
    const out = stepGame(s0, fireAt(s0, DOWNRANGE), 0.001)
    expect(out.enemies).toHaveLength(0)
    expect(out.score).toBe(base.score + TIE_SCORE)
  })
})

describe('sw8-9 AC-1 — the §5 play-cube clamp (sub_8DE3) contains anything that leaves the cube', () => {
  // CONTAINMENT, not the loiter (see this file's header): on every measured trajectory the clamp
  // has thousands of units of headroom and never engages, so it can only be pinned by staging a
  // fighter that is ALREADY outside the cube. A VM-less TIE holds station (twist/move = 0), which
  // isolates the clamp from the flight model completely — whatever moves it back is the clamp.
  const outside = (pos: Vec3): GameState => quiet({ enemies: [tieAt(pos)] })

  it('pulls a fighter past the +X face back inside the cube', () => {
    const out = stepGame(outside([PLAY_CUBE_MAX * 2, 0, -1000]), NO_INPUT, 0.001)
    expect(out.enemies[0].pos[0]).toBeLessThanOrEqual(PLAY_CUBE_MAX)
  })

  it('pulls a fighter past the -X face back inside the cube', () => {
    const out = stepGame(outside([PLAY_CUBE_MIN * 2, 0, -1000]), NO_INPUT, 0.001)
    expect(out.enemies[0].pos[0]).toBeGreaterThanOrEqual(PLAY_CUBE_MIN)
  })

  it('clamps the Y and Z axes independently, not just the one that breached', () => {
    // Each axis is clamped on its own in the ROM (`sub_8DE3` walks the three words); a fix that
    // clamped by VECTOR LENGTH instead would rescale x here and pass the two tests above.
    const out = stepGame(outside([0, PLAY_CUBE_MAX * 3, PLAY_CUBE_MIN * 3]), NO_INPUT, 0.001)
    expect(out.enemies[0].pos[1]).toBeLessThanOrEqual(PLAY_CUBE_MAX)
    expect(out.enemies[0].pos[2]).toBeGreaterThanOrEqual(PLAY_CUBE_MIN)
  })

  it('leaves a fighter exactly ON the cube face alone, and does not disturb a zero axis', () => {
    // Boundary + falsy-zero in one: the ROM bound is INCLUSIVE, so a fighter sitting exactly on
    // the face must not be nudged by an off-by-one (`<` where `<=` belongs). The y = 0 axis rides
    // along to catch the lang-review `x || fallback` trap — 0 is falsy but a perfectly legal
    // coordinate, and a clamp written with `||` would silently replace it.
    const out = stepGame(outside([PLAY_CUBE_MAX, 0, -1000]), NO_INPUT, 0.001)
    expect(out.enemies[0].pos[0]).toBe(PLAY_CUBE_MAX)
    expect(out.enemies[0].pos[1]).toBe(0)
  })

  it('leaves a fighter already inside the cube exactly where it is', () => {
    // The clamp must not become a shrink-wrap: a legal position is untouched. Without this, a
    // "clamp" that multiplied every axis by 0.9 would satisfy every assertion above.
    const inside: Vec3 = [1234, -5678, -20000]
    const out = stepGame(outside(inside), NO_INPUT, 0.001)
    expect(out.enemies[0].pos[0]).toBeCloseTo(inside[0], 6)
    expect(out.enemies[0].pos[1]).toBeCloseTo(inside[1], 6)
    expect(out.enemies[0].pos[2]).toBeCloseTo(inside[2], 6)
  })
})
