// tests/pt1-23-enemy-banks-drawn.test.ts
//
// Story pt1-23 — RED phase (Tyr One-Handed / TEA). THE BUG: composeFrame (core/scene.ts)
// blits only state.landers and state.humanoids into the main view. The other six live banks
// — mutants (SCZP1), baiters/UFOs (UFOP1), bombers/TIEs (TIEP1), pods (PRBP1), swarmers
// (SWPIC1) and the bombers' dropped bombs (BMBP1) — are live in SimState (sim.ts:212-217),
// scheduler-driven and fully collidable (enemyObjects adds every bank, sim.ts:745-762), but
// drawn NOWHERE. They only blink in for one frame at spawn (materialize) and death
// (explosion); for their whole roaming/shooting life they attack the player invisibly.
//
// The fix is a composeFrame blit loop over those banks, projecting each through projectWorldX
// exactly as the lander loop does (scene.ts:459-465). Collision already uses that same
// projection (toScreenCol IS projectWorldX, sim.ts:626), so the positions are correct today —
// the defect is purely the missing draw. pt1-22 (DONE, merged) revived the live palette, so
// the mutant/bomber/pod/bomb indices (A–F) are now non-black; but composeFrame returns palette
// INDICES, so these tests see a bank's pixels the instant it is blitted regardless of colour.
//
// METHOD (the df5-9 / pt1-18 diff-against-control idiom, palette-agnostic): locate a bank's
// columns without knowing its colour by diffing a frame containing one live member against the
// same frame with that bank empty. Everything shared (stars, terrain, ship, scanner, HUD)
// cancels; only the bank under test remains. So a non-empty diff == "this bank is drawn". The
// six banks read from PUBLIC SimState fields, which withBanks (sim.ts:426-449) fills straight
// from the runtime banks the real scheduler advances — so a hand-built state with those fields
// set is exactly what the live sim hands composeFrame.

import { describe, it, expect } from 'vitest'
import { createSim, type SimState } from '../src/core/sim.js'
import { composeFrame } from '../src/core/scene.js'
import { projectWorldX, SCREEN_WIDTH } from '../src/core/world.js'
import type { Framebuffer } from '../src/core/framebuffer.js'

const W = 292
const H = 240
const EY = 100 // an enemy row well inside the vertical play band (all sprite heights ≤ 8)

// projectWorldX(4000, 0) = 121: camera-rel 4000 < 150*64 (9600) → inside the visible window,
// and the widest sprite (baiter, 6 bytes → 12px) fits well within [0, 292).
const WX = 4000
const ON_COL = 121 // projectWorldX(WX, 0), pinned so the projection-agreement bound is explicit

// projectWorldX(20000, 0) = null: camera-rel 20000 ≥ 150*64 → OFF the visible window at camera 0.
const OFF_WX = 20000
// wrap16(20000 - 15000) = 5000 < 9600 → the same member is revealed once the camera scrolls to it.
const REVEAL_CAMERA = 15000

// The widest bank sprite is UFOP1 at width 6 → 12 raster px. The leftmost drawn column of any
// bank is ≥ its projected column and < projected + 2*width, so this bound clears every bank.
const MAX_SPRITE_PX = 2 * 6

function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

const base = createSim(makeRand(1))

/** The control frame's state: `base` with EVERY drawable population emptied, so a single
 *  populated bank is the only thing a diff can pick up. */
const cleared = (camera = 0): SimState => ({
  ...base,
  camera,
  lasers: [],
  landers: [],
  humanoids: [],
  mutants: [],
  baiters: [],
  bombers: [],
  bombs: [],
  pods: [],
  swarmers: [],
  shots: [],
  effects: [],
})

/** Columns where two same-size frames differ in ANY row (pt1-18's diffCols). */
function diffCols(a: Framebuffer, b: Framebuffer): number[] {
  const cols: number[] = []
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      if (a.data[y * W + x] !== b.data[y * W + x]) {
        cols.push(x)
        break
      }
    }
  }
  return cols
}

/** The columns a bank occupies in the main view under `camera` (empty == not drawn). */
const bankCols = (place: (camera: number) => SimState, camera: number): number[] =>
  diffCols(composeFrame(place(camera), W, H), composeFrame(cleared(camera), W, H))

interface BankCase {
  /** Public SimState field composeFrame must read. */
  readonly name: string
  /** ROM sprite label the bank blits (for the failure message). */
  readonly sprite: string
  /** One LIVE member at world-x `wx`, on top of an otherwise-empty state. */
  readonly live: (wx: number, camera: number) => SimState
  /** One DEAD member at world-x `wx` (null for bombs — a Bomb has lifetime, not `alive`). */
  readonly dead: ((wx: number, camera: number) => SimState) | null
}

const BANKS: readonly BankCase[] = [
  {
    name: 'mutants',
    sprite: 'SCZP1',
    live: (wx, c) => ({ ...cleared(c), mutants: [{ x: wx, y: EY, alive: true }] }),
    dead: (wx, c) => ({ ...cleared(c), mutants: [{ x: wx, y: EY, alive: false }] }),
  },
  {
    name: 'baiters',
    sprite: 'UFOP1',
    live: (wx, c) => ({ ...cleared(c), baiters: [{ x: wx, y: EY, alive: true }] }),
    dead: (wx, c) => ({ ...cleared(c), baiters: [{ x: wx, y: EY, alive: false }] }),
  },
  {
    name: 'bombers',
    sprite: 'TIEP1',
    live: (wx, c) => ({ ...cleared(c), bombers: [{ x: wx, y: EY, alive: true }] }),
    dead: (wx, c) => ({ ...cleared(c), bombers: [{ x: wx, y: EY, alive: false }] }),
  },
  {
    name: 'pods',
    sprite: 'PRBP1',
    live: (wx, c) => ({ ...cleared(c), pods: [{ x: wx, y: EY, alive: true }] }),
    dead: (wx, c) => ({ ...cleared(c), pods: [{ x: wx, y: EY, alive: false }] }),
  },
  {
    name: 'swarmers',
    sprite: 'SWPIC1',
    live: (wx, c) => ({ ...cleared(c), swarmers: [{ x: wx, y: EY, alive: true }] }),
    dead: (wx, c) => ({ ...cleared(c), swarmers: [{ x: wx, y: EY, alive: false }] }),
  },
  {
    // A Bomb carries `lifetime`, not `alive` (ties.ts:52-56): it is drawn while it is in the
    // bank, so there is no dead-member case for it.
    name: 'bombs',
    sprite: 'BMBP1',
    live: (wx, c) => ({ ...cleared(c), bombs: [{ x: wx, y: EY, lifetime: 30 }] }),
    dead: null,
  },
]

describe('pt1-23 — every live enemy bank is blitted into the main view (today only landers + humanoids are)', () => {
  // Fixture sanity, pinned so the whole file's premise is checkable in one place.
  it('the fixture world-x lands ON the visible window and the off-window one is culled by projectWorldX', () => {
    expect(projectWorldX(WX, 0), 'WX must project on-screen').toBe(ON_COL)
    expect(ON_COL, 'and the on-screen column is inside the raster').toBeGreaterThanOrEqual(0)
    expect(ON_COL).toBeLessThan(SCREEN_WIDTH)
    expect(projectWorldX(OFF_WX, 0), 'OFF_WX must be off-window (null) at camera 0').toBeNull()
    expect(projectWorldX(OFF_WX, REVEAL_CAMERA), 'and on-window once the camera scrolls to it').not.toBeNull()
  })

  it.each(BANKS)('$name ($sprite) are blitted at their projected column when a live member is on-window', ({ name, sprite, live }) => {
    const cols = bankCols((c) => live(WX, c), 0)
    // Collected count FIRST (lang-review #15): a live, on-window member MUST paint pixels.
    expect(
      cols.length,
      `the ${name} bank (${sprite}) is not blitted into the main view — composeFrame loops only over ` +
        `state.landers and state.humanoids (scene.ts:459-472), so ${name} attack the player invisibly for ` +
        `their whole life. GREEN adds a blit loop over this bank, projected through projectWorldX like the ` +
        `landers.`,
    ).toBeGreaterThan(0)
    // …and it lands where the SHARED world projection puts it — the same projectWorldX the collision
    // path uses (toScreenCol, sim.ts:626), NOT projectOnscreenX or a naive world>>8. A member drawn at
    // the wrong column would fail here even though the count above passed.
    expect(Math.min(...cols), `${name} drawn left of its projected column ${ON_COL}`).toBeGreaterThanOrEqual(ON_COL)
    expect(Math.max(...cols), `${name} drawn beyond one sprite width of column ${ON_COL}`).toBeLessThan(ON_COL + MAX_SPRITE_PX)
  })
})

describe('pt1-23 — the blit loop must honour the visible-window cull (not blit the whole world)', () => {
  it.each(BANKS)('an off-window $name member is culled from the main view', ({ name, live }) => {
    // Sanity: the fixture really is off-window per the projection contract.
    expect(projectWorldX(OFF_WX, 0), `${name} fixture: OFF_WX must be off-window`).toBeNull()
    expect(
      bankCols((c) => live(OFF_WX, c), 0).length,
      `an off-window ${name} member must NOT be blitted — the loop must project through projectWorldX and skip ` +
        `a null column exactly as the lander loop does (scene.ts:462-463), not paint every world entity`,
    ).toBe(0)
  })

  it.each(BANKS)('scrolling the camera reveals an off-window $name member', ({ name, live }) => {
    expect(bankCols((c) => live(OFF_WX, c), 0).length, `${name} off-window at camera 0`).toBe(0)
    expect(
      bankCols((c) => live(OFF_WX, c), REVEAL_CAMERA).length,
      `scrolling the camera must bring an off-window ${name} member into the main view — proof the loop ` +
        `projects camera-relative through projectWorldX, not at a fixed absolute column`,
    ).toBeGreaterThan(0)
  })
})

describe('pt1-23 — a dead bank member is not blitted (the loop must carry the lander loop’s alive guard)', () => {
  const KILLABLE = BANKS.filter((b): b is BankCase & { dead: NonNullable<BankCase['dead']> } => b.dead !== null)

  it.each(KILLABLE)('a dead $name member is not drawn even when on-window', ({ name, live, dead }) => {
    // Control the fixture: the SAME member alive IS drawn, so this is not vacuous once GREEN lands.
    expect(bankCols((c) => live(WX, c), 0).length, `${name} sanity: a live member is drawn`).toBeGreaterThan(0)
    expect(
      bankCols((c) => dead(WX, c), 0).length,
      `a dead ${name} member must be skipped — the blit loop must guard on \`alive\` like the lander loop ` +
        `(scene.ts:461, \`if (!lander.alive) continue\`), or corpses paint over the play field`,
    ).toBe(0)
  })
})
