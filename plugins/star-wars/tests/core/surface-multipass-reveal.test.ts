// tests/core/surface-multipass-reveal.test.ts
//
// Story pt1-21 — the Death Star surface run is ONE dense pass; restore the ROM's
// STAGED MULTI-PASS tower reveal. RED phase (O'Brien / TEA). EXPECTED TO FAIL.
//
// Distinct from pt1-3 (projection scale) and from sw7-18's D-018/D-019 (which
// added `gdSeq`, the 5-pass phase length, and a FIRING gate on the awakening
// byte). Two ROM behaviours are still missing, and together they make the run
// feel "too close together / brief encounter" (user playtest 2026-08-20):
//
//   1. PRESENCE, not just firing, is gated on `gdSeq`. The maze loop top SKIPS a
//      dormant object ENTIRELY — no draw, no gun, no collision:
//        LDA GD.SEQ / CMPA TGD$SQ(X) / LBLT 90$   (WSGRND.MAC:738-742)
//      GDVIEW (draw) and GDGUN (fire) both sit DOWNSTREAM of that skip
//      (WSGRND.MAC:771-781). DIFF splits its towers across sequences (7-0/9-1/
//      7-2/5-3, WSGRND.MAC:146) so only ~1/3 of the maze exists on pass 0.
//      OURS gates only FIRING (the `armed` filter in `stepSurface`): every object is laid,
//      drawn and collidable from frame 1 — the `turrets` set the shell renders
//      and the crash loop reads is the WHOLE maze regardless of gdSeq. (The
//      `Turret.seq` doc already CLAIMS "nor, in the shell, draw"; the core does
//      not honour it yet — this story makes that comment true.)
//
//   2. The maze RE-FLIES across ~5 laps. Forward position M$TX is a wrapping
//      16-bit accumulator; each $8000 wrap does INC GD.SEQ (WSMAIN.MAC:2537-2547),
//      and the phase ends on a LAP COUNT — `LDA GD.SEQ / CMPA #5` (WSMAIN.MAC:
//      1678-1689) — flying the SAME $1000..$8000 maze five times as the staged
//      subset grows. OURS lays the authored field ONCE and culls each object as
//      it sweeps past (the old `filter(pos[0] > 0)` cull in `stepSurface`); the maze is only
//      ~1 SEQ_SPAN deep (depths 0..$8000 + SPAWN_DISTANCE), so it is EMPTY by
//      gdSeq 1 and the remaining four passes fly over bare ground. All the towers
//      land in the opening ~few seconds — the "one dense pass".
//
// THE FIX (design): gate PRESENCE on `gdSeq >= (seq ?? 0)` so a dormant object is
// absent from `turrets` (undrawn, uncollidable, unshootable), and re-fly the maze
// each lap so towers keep coming until the traversal ends at `gdSeq >= 5`.
//
// Sacred boundary: pure core, no DOM, no time except dt, no RNG except state's.

import { describe, it, expect } from 'vitest'
import {
  initialState,
  TOWER_FIRE_GRACE,
  SURFACE_SEQ_SPAN,
  SURFACE_END_SEQ,
  SKIM_ALTITUDE,
  type GameState,
  type Turret,
} from '../../src/core/state'
import { stepGame, enterPhase } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'
import { fireAt } from '../support/aim'
import { mazeForWave } from '../../src/core/surfaceMazes'
import type { GameEvent } from '../../src/core/events'
import type { Vec3 } from '@shared/math3d'

const DT = 0.02

/** A hand-placed ground object at lateral x / depth d, past its fire grace, with an
 *  awakening sequence. sw10-1 native layout: pos = [depth(+X fwd), right(+Y), up]. */
const objAt = (x: number, depth: number, seq: number, kind: Turret['kind'] = 'tower'): Turret => ({
  pos: [depth, x, 0],
  age: TOWER_FIRE_GRACE + 1,
  kind,
  seq,
})

/** A surface fixed at a chosen gdSeq (surfaceScrollZ kept consistent so the gate
 *  reads the same value however Dev derives it), the hand-placed field respected.
 *  `surfaceScrollSpeed` is left at enterPhase's ROM seed so a normal frame scrolls. */
function surfaceAt(gdSeq: number, turrets: Turret[], over: Partial<GameState> = {}): GameState {
  return {
    ...enterPhase(initialState(1983), 'surface'),
    gdSeq,
    surfaceScrollZ: gdSeq * SURFACE_SEQ_SPAN,
    turrets,
    surfaceMazeLaid: true, // respect the hand-placed field; don't lay the wave maze over it
    enemyFireCooldown: 0,
    enemyShots: [],
    altitude: SKIM_ALTITUDE, // safe height: no terrain scrape to confound crash counting
    lives: 9999,
    fireCooldown: 0,
    firePrev: false,
    ...over,
  }
}

/** A fresh surface at a real ground wave, entered exactly as progression would
 *  (enterPhase seeds gdSeq 0 / the scroll rate / surfaceMazeLaid=false), padded so
 *  surface fire cannot end the run before the traversal completes. */
const freshWave = (wave: number, seed = 1983): GameState => ({
  ...enterPhase({ ...initialState(seed), wave }, 'surface'),
  lives: 9999,
})

const crashed = (s: GameState): number =>
  (s.events as GameEvent[]).filter((e) => e.type === 'object-crash').length
const killedTurret = (s: GameState): boolean =>
  (s.events as GameEvent[]).some((e) => e.type === 'enemy-death' && e.enemyType === 'turret')

// ── AC 1 — PRESENCE: a dormant object is absent from `turrets` (undrawn, uncollidable) ──
//
// The core observable of the presence gate: `s.turrets` (what the shell draws and
// the crash/laser loops read) must contain ONLY objects the traversal has reached.

describe('pt1-21 — a dormant object (seq > gdSeq) is not present in the field', () => {
  it('a seq-2 tower is ABSENT from turrets at gdSeq 0 (not drawn, not collidable)', () => {
    const s = stepGame(surfaceAt(0, [objAt(0, 6000, 2)]), NO_INPUT, DT)
    expect(s.turrets).toHaveLength(0) // the whole field is dormant this pass
  })

  it('a seq-0 tower IS present at gdSeq 0 (its sequence has come up)', () => {
    const s = stepGame(surfaceAt(0, [objAt(0, 6000, 0)]), NO_INPUT, DT)
    expect(s.turrets).toHaveLength(1)
  })

  it('the seq-2 tower BECOMES present once gdSeq reaches its sequence', () => {
    const dormant = stepGame(surfaceAt(1, [objAt(0, 6000, 2)]), NO_INPUT, DT)
    const awake = stepGame(surfaceAt(2, [objAt(0, 6000, 2)]), NO_INPUT, DT)
    expect(dormant.turrets).toHaveLength(0) // still below its sequence
    expect(awake.turrets).toHaveLength(1) // gdSeq 2 >= seq 2 — revealed
  })

  it('only the reached-seq subset is present when several sequences share a pass', () => {
    // seq 0 and seq 3 side by side at gdSeq 1: the seq-0 survives, the seq-3 is gone.
    const s = stepGame(surfaceAt(1, [objAt(-4000, 6000, 0), objAt(4000, 6000, 3)]), NO_INPUT, DT)
    expect(s.turrets).toHaveLength(1)
    expect(s.turrets[0].seq).toBe(0)
  })
})

// ── AC 2 — PRESENCE: a dormant object cannot crash the ship ──
//
// WSGRND's skip is BEFORE GDVIEW's crash test, so a dormant tower cannot be flown
// into. Ours crashes on anything that sweeps past the cockpit (the crash loop in `stepSurface`).

describe('pt1-21 — a dormant object cannot crash the ship (presence, not just fire)', () => {
  // Seated just ahead of the cockpit plane so the frame's scroll (~seed 5,250 · DT
  // ≈ 105 u) sweeps it past — the single-frame crash moment. Lateral 0 is dead on
  // the flight line (|y| < OBJECT_CRASH_LATERAL).
  const grazing = (seq: number): Turret => objAt(0, 30, seq)

  it('flying through a seq-2 tower at gdSeq 0 crashes NOTHING (it is not there)', () => {
    const s = stepGame(surfaceAt(0, [grazing(2)]), NO_INPUT, DT)
    expect(crashed(s)).toBe(0)
    expect(s.lives).toBe(9999) // no shield charged — the pilot passed through empty air
  })

  it('control: the SAME seat with a seq-0 tower DOES crash — the fixture really sweeps past', () => {
    const s = stepGame(surfaceAt(0, [grazing(0)]), NO_INPUT, DT)
    expect(crashed(s)).toBe(1) // present object → one crash, proving the seat is live
  })
})

// ── AC 3 — PRESENCE: a dormant object cannot be shot ──
//
// GDGUN/the shootable set sit downstream of the skip too: a dormant tower is not a
// laser target. The aimed-fire idiom is surface-tower-escalation.test.ts's.

describe('pt1-21 — a dormant object cannot be shot (no score, no kill)', () => {
  const SITE: Vec3 = [100, 0, SKIM_ALTITUDE] // dead ahead, at the eye — a purely lateral shot

  it('a laser aimed at a seq-2 tower at gdSeq 0 kills nothing and banks no score', () => {
    const s0 = surfaceAt(0, [objAt(SITE[1], SITE[0], 2)], { score: 0 })
    const s1 = stepGame(s0, fireAt(s0, SITE), 0.001)
    expect(killedTurret(s1)).toBe(false)
    expect(s1.score).toBe(0)
  })

  it('control: the SAME aimed shot DOES kill a seq-0 tower — the aim really lands', () => {
    const s0 = surfaceAt(0, [objAt(SITE[1], SITE[0], 0)], { score: 0 })
    const s1 = stepGame(s0, fireAt(s0, SITE), 0.001)
    expect(killedTurret(s1)).toBe(true)
    expect(s1.score).toBeGreaterThan(0)
  })
})

// ── AC 4 — the STAGED reveal comes off the real wave maze ──
//
// Laying a real maze at gdSeq 0 must present EXACTLY its seq-0 subset — a magnitude,
// not an ordering (checks #26/#29): the count is pinned to the maze DATA, and the
// gate is proved non-vacuous by asserting the excluded (seq > 0) subset is non-empty.

describe('pt1-21 — the fresh maze reveals only its seq-0 subset on pass 0', () => {
  const WAVE = 7 // DIFF — spans seq 0..3 (the story's staged example)
  const maze = mazeForWave(WAVE)
  const seq0 = maze.entries.filter((e) => e.seq === 0).length
  const laterSeq = maze.entries.filter((e) => e.seq > 0).length

  it('the DIFF maze genuinely stages across sequences (fixture sanity — gate is non-vacuous)', () => {
    expect(seq0).toBeGreaterThan(0) // there IS a pass-0 subset to reveal
    expect(laterSeq).toBeGreaterThan(0) // ...and a later-seq remainder the gate must hide
  })

  it('a fresh wave-7 surface lays only the seq-0 towers on the opening frame', () => {
    // Tiny dt: the field is laid and barely scrolled, so every object is still
    // ahead — present iff its sequence has come up (gdSeq 0 → seq 0 only).
    const s = stepGame(freshWave(WAVE), NO_INPUT, 0.001)
    expect(s.turrets.length).toBe(seq0) // exactly the pass-0 subset, not the whole maze
    expect(s.turrets.every((t) => (t.seq ?? 0) === 0)).toBe(true) // nothing later leaked in
  })
})

// ── AC 5 — the maze RE-FLIES: towers persist across the passes, not one dense burst ──
//
// The heart of the bug report. Fly a real no-input traversal and record, per frame,
// the gdSeq at which any tower is present ahead. Under the fix the maze wraps, so
// towers appear on nearly every one of the five passes; under today's single-pass
// lay they vanish after gdSeq 0. The assertion carries the NUMBER (>= 4 of 5 passes),
// not a mere "distinct/increasing" (check #29 — the defect is about SPACING).

describe('pt1-21 — the surface run re-flies the maze across its laps', () => {
  /** Fly with no input to the trench, recording each gdSeq at which >=1 tower stood
   *  ahead (s.turrets is already the present-and-ahead set). */
  function flyRecordingPasses(s: GameState, maxSteps = 4000): { passesWithTowers: Set<number>; cleared: boolean; steps: number } {
    const passesWithTowers = new Set<number>()
    let steps = 0
    for (; steps < maxSteps && s.phase === 'surface' && !s.gameOver; steps++) {
      s = stepGame(s, NO_INPUT, DT)
      if (s.turrets.length > 0) passesWithTowers.add(s.gdSeq)
    }
    return { passesWithTowers, cleared: s.phase === 'trench', steps }
  }

  it('towers are encountered on at least 4 of the 5 passes — not crammed into pass 0', () => {
    const { passesWithTowers, cleared } = flyRecordingPasses(freshWave(7))
    expect(cleared).toBe(true) // the run really completed the traversal
    // The maze re-flies: towers keep coming as gdSeq climbs. Today they are gone by
    // gdSeq 1 (a single pass), so this set has size 1 and the bound reddens.
    const passesBeforeEnd = [...passesWithTowers].filter((seq) => seq < SURFACE_END_SEQ)
    expect(passesBeforeEnd.length).toBeGreaterThanOrEqual(4)
  })

  it('towers are still present deep into the run (a full pass past the first)', () => {
    const { passesWithTowers } = flyRecordingPasses(freshWave(7))
    // At gdSeq 3 — three full $8000 passes in — the maze must still be presenting
    // objects. Today the field emptied at gdSeq 1, so nothing is present here.
    const deep = [...passesWithTowers].filter((seq) => seq >= 3 && seq < SURFACE_END_SEQ)
    expect(deep.length).toBeGreaterThan(0)
  })
})

// ── AC 6 — the staged presence is deterministic / frame-rate honest (purity guard) ──

describe('pt1-21 — the staged reveal is deterministic (no time/RNG in the gate)', () => {
  it('replays identically for a fixed seed', () => {
    const run = (): number[] => {
      let s = freshWave(7, 4242)
      const counts: number[] = []
      for (let i = 0; i < 200 && s.phase === 'surface'; i++) {
        s = stepGame(s, NO_INPUT, DT)
        counts.push(s.turrets.length)
      }
      return counts
    }
    expect(run()).toEqual(run())
  })
})
