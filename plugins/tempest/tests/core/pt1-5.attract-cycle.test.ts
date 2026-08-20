// tests/core/pt1-5.attract-cycle.test.ts
//
// Story pt1-5 (RED, O'Brien / TEA) — the attract-page scheduler wired into
// stepGame's attract case. This is the RE-NEGOTIATION the context authorised: the
// self-play demo (Story 10-3) no longer seeds on the FIRST idle step; it seeds when
// the scheduler's rotation reaches the DEMO page (ladder → logo → demo). The pure
// demoInput brain and the demo's own behaviours (auto-move, fire, determinism,
// death→title) are unchanged and still covered by sim.attract-demo.test.ts.
//
// The observable contract this suite pins:
//   • `s.attract` carries the scheduler state on GameState; it boots on the first
//     page and rotates once per stepGame frame while idle.
//   • `s.demoActive` is true IFF the current attract page is 'demo' and the demo is
//     alive — false on the ladder and logo pages (checklist #27: a page where the
//     demo is never created must not surface it) and cleared when the rotation
//     leaves the demo page OR the 1-life demo dies (checklist #14: the edge is taken
//     on every path out of the demo page, not just one).
//   • the demo VISIBLY PLAYS on the demo page (spawns enemies + fires) — the defect
//     the story exists to fix, pinned behaviourally rather than by an invented dwell.
//   • real input returns to the attract start and clears the demo; start-to-play is
//     unchanged; the whole rotation is deterministic from the seed.

import { describe, it, expect } from 'vitest'
import * as Sim from '../../src/core/sim'
import { GameState, initialState } from '../../src/core/state'
import { Input } from '../../src/core/input'
import { currentLane } from '../../src/core/geometry'
import { MAX_BULLETS } from '../../src/core/rules'
import type { AttractPage } from '../helpers/pt1-5-attract-contract'

const stepGame = Sim.stepGame
const NEUTRAL: Input = { spin: 0, fire: false, zap: false, start: false }
const DT = 1 / 60

const neutral = (s: GameState): GameState => stepGame(s, NEUTRAL, DT)
// GameState now types `mode` and `attract` (pt1-5), so these read directly — no cast.
const mode = (s: GameState): string => s.mode
const page = (s: GameState): AttractPage => s.attract.page
const framesOnPage = (s: GameState): number => s.attract.framesOnPage

/** Idle-step until the scheduler shows `target`, or fail if it never does. */
function stepUntilPage(seed: number, target: AttractPage): GameState {
  let s = initialState(seed)
  for (let i = 0; i < 200_000; i++) {
    if (page(s) === target) return s
    s = neutral(s)
  }
  throw new Error(`scheduler never reached the '${target}' page within 200k idle frames`)
}

describe('pt1-5 attract cycle — the scheduler boots on GameState (AC2)', () => {
  it('a fresh attract game carries scheduler state, on the first page, with no demo running', () => {
    const s = initialState(1)
    expect(mode(s)).toBe('attract')
    expect(page(s)).toBe('ladder') // PAGE_ORDER[0] — the ROM opens on the high-score ladder
    expect(framesOnPage(s)).toBe(0)
    expect(s.demoActive).toBe(false)
  })

  it('the FIRST idle step does NOT seed the demo any more (re-negotiated 10-3 contract)', () => {
    const s = neutral(initialState(7))
    expect(mode(s)).toBe('attract')
    expect(page(s)).toBe('ladder') // still on the opening page
    expect(s.demoActive).toBe(false) // the demo waits for its page
  })
})

describe('pt1-5 attract cycle — demoActive tracks the demo page only (#27)', () => {
  it('the LADDER page never runs the demo', () => {
    const s = stepUntilPage(3, 'ladder')
    expect(s.demoActive).toBe(false)
  })

  it('the LOGO page never runs the demo', () => {
    const s = stepUntilPage(3, 'logo')
    expect(s.demoActive).toBe(false)
  })

  it('the DEMO page seeds a 1-life game on level 1..8 and runs it, all inside attract', () => {
    const s = stepUntilPage(3, 'demo')
    expect(mode(s)).toBe('attract') // never flips to 'playing'
    expect(s.demoActive).toBe(true)
    expect(s.lives).toBe(1)
    expect(s.level).toBeGreaterThanOrEqual(1)
    expect(s.level).toBeLessThanOrEqual(8)
  })

  it('seeding the demo DRAWS the rng (the random level is rng-picked, deterministically)', () => {
    // Same seed → same demo start (level + rng cursor); and the boot rng was actually
    // consumed to pick the level (it advanced from a fresh initialState).
    const a = stepUntilPage(12345, 'demo')
    const b = stepUntilPage(12345, 'demo')
    expect(a.level).toBe(b.level)
    expect(a.rng).toEqual(b.rng)
    expect(a.rng).not.toEqual(initialState(12345).rng) // a draw happened
  })
})

describe('pt1-5 attract cycle — the demo VISIBLY PLAYS on its page (AC1, the defect)', () => {
  it('over an idle run the demo both spawns enemies and fires, only while demoActive', () => {
    let s = initialState(2024)
    let sawEnemyWhileActive = false
    let firedWhileActive = false
    let sawActive = false
    let sawInactive = false
    for (let i = 0; i < 8000; i++) {
      s = neutral(s)
      expect(mode(s)).toBe('attract') // the demo never leaks into a real 'playing' game
      if (s.demoActive) {
        sawActive = true
        if (s.enemies.length > 0) sawEnemyWhileActive = true
        if (s.events.some((e) => e.type === 'fire')) firedWhileActive = true
      } else {
        sawInactive = true
      }
    }
    // The rotation actually alternates — the demo is one page among the ladder/logo.
    expect(sawActive, 'the demo page must be reached').toBe(true)
    expect(sawInactive, 'the non-demo pages must also be shown (it rotates)').toBe(true)
    // And on its page the demo is a real play example, not a frozen board.
    expect(sawEnemyWhileActive, 'the demo must spawn enemies while it plays').toBe(true)
    expect(firedWhileActive, 'the demo must fire while it plays').toBe(true)
  })

  // MAGNITUDE (Reviewer #29): the test above accumulates spawn/fire across MANY demo
  // visits, so it stays green even if a single demo page is far too short to actually
  // play (a 5-frame dwell flickering on and off would satisfy it after enough cycles).
  // The story's defect is exactly that magnitude — the demo must dwell long enough to
  // BE a play example. Measure ONE uninterrupted demo-page visit: within that single
  // visit the demo must spawn an enemy AND fire. Shrinking DEMO_DWELL_FRAMES below a
  // real play example reddens this (proven: DEMO_DWELL_FRAMES=5 → this test fails).
  it('a SINGLE demo-page visit lasts long enough to spawn an enemy AND fire', () => {
    let s = stepUntilPage(2024, 'demo') // first frame on the demo page (demo seeded)
    expect(s.demoActive).toBe(true)
    let sawEnemy = false
    let fired = false
    // Walk exactly this one demo-page visit — until the rotation advances off 'demo'.
    for (let i = 0; i < 100_000 && page(s) === 'demo'; i++) {
      if (s.enemies.length > 0) sawEnemy = true
      if (s.events.some((e) => e.type === 'fire')) fired = true
      if (sawEnemy && fired) break
      s = neutral(s)
    }
    expect(sawEnemy, 'the demo must spawn an enemy within one demo-page visit').toBe(true)
    expect(fired, 'the demo must fire within one demo-page visit').toBe(true)
  })
})

describe('pt1-5 attract cycle — the demoActive edge is cleared on every exit (#14)', () => {
  it('leaving the demo page (dwell elapsed) clears demoActive without leaving attract', () => {
    let s = stepUntilPage(3, 'demo')
    expect(s.demoActive).toBe(true)
    // step forward until the rotation moves off the demo page
    for (let i = 0; i < 200_000 && page(s) === 'demo'; i++) s = neutral(s)
    expect(page(s)).not.toBe('demo')
    expect(s.demoActive).toBe(false) // the edge is taken on the scheduler-advance path
    expect(mode(s)).toBe('attract')
  })

  it('a demo DEATH clears demoActive and returns to attract, not gameover (the other exit path)', () => {
    const s = stepUntilPage(31, 'demo') // active 1-life demo
    expect(s.demoActive).toBe(true)
    expect(s.lives).toBe(1)
    const pl = currentLane(s.tube, s.player.lane)
    const farLane = (pl + 8) % s.tube.laneCount
    s.player.alive = true
    s.enemies = []
    s.enemyBullets = [{ lane: pl, depth: 1 }] // a bolt at the rim on the player's lane
    s.bullets = Array.from({ length: MAX_BULLETS }, () => ({ lane: farLane, depth: 0.5 }))

    const out = stepGame(s, NEUTRAL, DT)
    expect(out.events.some((e) => e.type === 'player-death')).toBe(true)
    expect(mode(out)).toBe('attract')
    expect(mode(out)).not.toBe('gameover')
    expect(out.demoActive).toBe(false) // the death path clears the edge too
  })
})

describe('pt1-5 attract cycle — a fresh demo each demo-page visit', () => {
  it('re-seeds a new 1-life demo when the rotation returns to the demo page', () => {
    const first = stepUntilPage(777, 'demo')
    expect(first.demoActive).toBe(true)
    // leave the demo page...
    let s = first
    for (let i = 0; i < 200_000 && page(s) === 'demo'; i++) s = neutral(s)
    expect(s.demoActive).toBe(false)
    // ...complete the rotation back to the demo page
    for (let i = 0; i < 200_000 && page(s) !== 'demo'; i++) s = neutral(s)
    expect(page(s)).toBe('demo')
    expect(s.demoActive).toBe(true)
    expect(s.lives).toBe(1) // a fresh 1-life game, not a resumed board
  })
})

describe('pt1-5 attract cycle — input handling is unchanged where it must be', () => {
  it('a real spinner input returns to the attract start and clears the demo, without firing', () => {
    const running = stepUntilPage(5, 'demo') // demo now active
    const out = stepGame(running, { ...NEUTRAL, spin: 5 }, DT)
    expect(mode(out)).toBe('attract')
    expect(out.demoActive).toBe(false)
    expect(page(out)).toBe('ladder') // input resets the rotation to the opening page
    expect(out.events.some((e) => e.type === 'fire')).toBe(false)
  })

  it('start still enters level select (start-to-play path unchanged)', () => {
    const out = stepGame(initialState(5), { ...NEUTRAL, start: true }, DT)
    expect(mode(out)).toBe('select')
    expect(out.select.selectedLevel).toBe(1)
  })
})

describe('pt1-5 attract cycle — deterministic from the seed', () => {
  it('identical seed + identical idle stream → identical state across a multi-page run', () => {
    let a = initialState(99)
    let b = initialState(99)
    for (let i = 0; i < 4000; i++) {
      a = neutral(a)
      b = neutral(b)
    }
    expect(a).toEqual(b)
    // and the run actually spanned more than one page (otherwise the guard is weak)
    expect(a).not.toEqual(initialState(99))
  })
})
