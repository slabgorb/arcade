// tests/pt1-23-enemy-banks-drawn.test.ts
//
// Story pt1-23 (Tyr One-Handed / TEA). THE BUG: composeFrame (core/scene.ts) blits only
// state.landers and state.humanoids into the main view. The other six live banks — mutants
// (SCZP1), baiters/UFOs (UFOP1), bombers/TIEs (TIEP1), pods (PRBP1), swarmers (SWPIC1) and the
// bombers' dropped bombs (BMBP1) — are live in SimState (the six `readonly …` bank fields on the
// SimState interface, sim.ts:218-223), scheduler-driven and fully collidable (the enemyObjects
// collision list adds every bank), but drawn NOWHERE. They only blink in for one frame at spawn
// (materialize) and death (explosion); for their whole roaming/shooting life they attack invisibly.
//
// The fix is a composeFrame blit loop over those banks, projecting each through projectWorldX
// exactly as the composeFrame lander loop does. Collision already uses that same projection
// (toScreenCol IS projectWorldX — the `const toScreenCol = … projectWorldX(…)` alias, sim.ts:660),
// so the positions are correct today — the defect is purely the missing draw. pt1-22 (DONE, merged)
// revived the live palette, so the mutant/bomber/pod/bomb indices (A–F) are now non-black; but
// composeFrame returns palette INDICES, so these tests see a bank's pixels the instant it is
// blitted regardless of colour.
//
// METHOD (the df5-9 / pt1-18 diff-against-control idiom, palette-agnostic): locate a bank's
// columns/indices without knowing its colour by diffing a frame containing one live member against
// the same frame with that bank empty. Everything shared (terrain, ship, scanner, HUD — and stars,
// which this file additionally clears) cancels; only the bank under test remains. So a non-empty
// diff == "this bank is drawn". The rework (round-1 review) tightens three things the first draft
// left loose: the diff INDICES must be the bank's OWN sprite (not merely *a* sprite), the column
// bound is PER-BANK (its own sprite width, not the widest), and a MULTI-member case proves the loop
// draws every member, not just the first. The six banks read from PUBLIC SimState fields, which
// withBanks (sim.ts:426-449) fills straight from the runtime banks the real scheduler advances — so
// a hand-built state with those fields set is exactly what the live sim hands composeFrame.

import { describe, it, expect } from 'vitest'
import { createSim, type SimState } from '../src/core/sim.js'
import { composeFrame } from '../src/core/scene.js'
import { OBJECTS } from '../src/core/objects.js'
import { projectWorldX, SCREEN_WIDTH } from '../src/core/world.js'
import type { Framebuffer } from '../src/core/framebuffer.js'

const W = 292
const H = 240
const EY = 100 // an enemy row well inside the vertical play band (all sprite heights ≤ 8)

// projectWorldX(4000, 0) = 121: camera-rel 4000 < 150*64 (9600) → inside the visible window,
// and the widest sprite (baiter, 6 bytes → 12px) fits well within [0, 292).
const WX = 4000
const ON_COL = 121 // projectWorldX(WX, 0), pinned so the projection-agreement bound is explicit

// A SECOND on-window world-x, well separated from WX, for the multi-member test.
// projectWorldX(8000, 0) = 243, i.e. 122 columns right of ON_COL — no sprite footprint bridges them.
const WX2 = 8000
const ON_COL2 = 243

// projectWorldX(20000, 0) = null: camera-rel 20000 ≥ 150*64 → OFF the visible window at camera 0.
const OFF_WX = 20000
// wrap16(20000 - 15000) = 5000 < 9600 → the same member is revealed once the camera scrolls to it.
const REVEAL_CAMERA = 15000

/** A bank sprite spans `2 * width` raster px (two 4-bit pixels per cell byte, objects.ts). The
 *  bound is PER BANK — sizing every bank to the widest sprite (UFOP1, 12px) would let a small
 *  projection offset hide on the four narrower banks (round-1 review [TEST] H2). */
const spriteFootprintPx = (label: string): number => 2 * spriteOf(label).width
/** The distinct NON-zero palette indices a sprite paints (each cell byte packs two 4-bit
 *  indices; 0 is transparent). Used to assert a bank blits ITS OWN sprite, not merely some sprite
 *  (round-1 review [TEST] H1 — the bare diff-against-control could not tell a pod from a TIE). */
const spriteIndices = (label: string): Set<number> => {
  const set = new Set<number>()
  for (const byte of spriteOf(label).bytes) {
    const hi = (byte >> 4) & 0x0f
    const lo = byte & 0x0f
    if (hi !== 0) set.add(hi)
    if (lo !== 0) set.add(lo)
  }
  return set
}
function spriteOf(label: string): { readonly width: number; readonly bytes: readonly number[] } {
  const obj = OBJECTS.find((o) => o.name === label)
  if (!obj) throw new Error(`test fixture: sprite ${label} is not in OBJECTS`)
  return obj
}

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
  stars: [], // emptied too, so the ONLY base pixels are terrain/ship/scanner/HUD — deterministic,
  // which lets the index-identity assertion below compare the diff to the sprite's exact nibbles.
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

/** The first row BELOW the scanner band (the pt1-24 band bound: blips ≤ row 31, contour ≤ 41).
 *  Since pt1-24, every live bank member ALSO blips on the radar strip — off-window members
 *  included (SCNR reads the absolute OX16, AMODE1.SRC:1260). This file measures the MAIN-VIEW
 *  blit and its cull, so its diffs must start below the strip or a member's legitimate radar
 *  blip reads as a cull/footprint failure. The EY=100 fixtures sit far below this bound. */
const MAIN_VIEW_TOP = 60

/** Columns where two same-size frames differ in any MAIN-VIEW row (pt1-18's diffCols,
 *  scanner band excluded). */
function diffCols(a: Framebuffer, b: Framebuffer): number[] {
  const cols: number[] = []
  for (let x = 0; x < W; x++) {
    for (let y = MAIN_VIEW_TOP; y < H; y++) {
      if (a.data[y * W + x] !== b.data[y * W + x]) {
        cols.push(x)
        break
      }
    }
  }
  return cols
}

/** The distinct palette-index VALUES that differ between two frames in the MAIN VIEW. Every
 *  differing main-view pixel's value in the populated frame is a bank-sprite pixel (the bank is
 *  the only change vs the control, and its pt1-24 radar blip sits above MAIN_VIEW_TOP), so this
 *  is exactly the set of nibble indices the bank painted. */
function diffIndices(a: Framebuffer, b: Framebuffer): Set<number> {
  const set = new Set<number>()
  for (let y = MAIN_VIEW_TOP; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      if (a.data[i] !== b.data[i]) set.add(a.data[i])
    }
  }
  return set
}

/** The columns a bank occupies in the main view under `camera` (empty == not drawn). */
const bankCols = (place: (camera: number) => SimState, camera: number): number[] =>
  diffCols(composeFrame(place(camera), W, H), composeFrame(cleared(camera), W, H))

/** The palette indices a bank paints in the main view under `camera`. */
const bankIndices = (place: (camera: number) => SimState, camera: number): Set<number> =>
  diffIndices(composeFrame(place(camera), W, H), composeFrame(cleared(camera), W, H))

interface BankCase {
  /** Public SimState field composeFrame must read. */
  readonly name: string
  /** ROM sprite label the bank blits — the assertions require the bank draws THIS sprite. */
  readonly sprite: string
  /** N LIVE members, one per world-x, on top of an otherwise-empty state. */
  readonly atX: (wxs: readonly number[], camera: number) => SimState
  /** One DEAD member at world-x `wx` (null for bombs — a Bomb has lifetime, not `alive`). */
  readonly dead: ((wx: number, camera: number) => SimState) | null
}

const BANKS: readonly BankCase[] = [
  {
    name: 'mutants',
    sprite: 'SCZP1',
    atX: (wxs, c) => ({ ...cleared(c), mutants: wxs.map((x) => ({ x, y: EY, alive: true })) }),
    dead: (wx, c) => ({ ...cleared(c), mutants: [{ x: wx, y: EY, alive: false }] }),
  },
  {
    name: 'baiters',
    sprite: 'UFOP1',
    atX: (wxs, c) => ({ ...cleared(c), baiters: wxs.map((x) => ({ x, y: EY, alive: true })) }),
    dead: (wx, c) => ({ ...cleared(c), baiters: [{ x: wx, y: EY, alive: false }] }),
  },
  {
    name: 'bombers',
    sprite: 'TIEP1',
    atX: (wxs, c) => ({ ...cleared(c), bombers: wxs.map((x) => ({ x, y: EY, alive: true })) }),
    dead: (wx, c) => ({ ...cleared(c), bombers: [{ x: wx, y: EY, alive: false }] }),
  },
  {
    name: 'pods',
    sprite: 'PRBP1',
    atX: (wxs, c) => ({ ...cleared(c), pods: wxs.map((x) => ({ x, y: EY, alive: true })) }),
    dead: (wx, c) => ({ ...cleared(c), pods: [{ x: wx, y: EY, alive: false }] }),
  },
  {
    name: 'swarmers',
    sprite: 'SWPIC1',
    atX: (wxs, c) => ({ ...cleared(c), swarmers: wxs.map((x) => ({ x, y: EY, alive: true })) }),
    dead: (wx, c) => ({ ...cleared(c), swarmers: [{ x: wx, y: EY, alive: false }] }),
  },
  {
    // A Bomb carries `lifetime`, not `alive` (ties.ts:52-56): it is drawn while it is in the
    // bank, so there is no dead-member case for it.
    name: 'bombs',
    sprite: 'BMBP1',
    atX: (wxs, c) => ({ ...cleared(c), bombs: wxs.map((x) => ({ x, y: EY, lifetime: 30 })) }),
    dead: null,
  },
]

describe('pt1-23 — every live enemy bank is blitted into the main view (today only landers + humanoids are)', () => {
  // Fixture sanity, pinned so the whole file's premise is checkable in one place.
  it('the fixture world-x values land ON / OFF the visible window as claimed (projectWorldX contract)', () => {
    expect(projectWorldX(WX, 0), 'WX must project to ON_COL').toBe(ON_COL)
    expect(projectWorldX(WX2, 0), 'WX2 must project to ON_COL2').toBe(ON_COL2)
    expect(ON_COL, 'both on-screen columns inside the raster').toBeGreaterThanOrEqual(0)
    expect(ON_COL2).toBeLessThan(SCREEN_WIDTH)
    // The two members are far enough apart that no sprite footprint bridges them (multi-member test).
    expect(ON_COL2 - ON_COL, 'WX and WX2 must be more than one sprite width apart').toBeGreaterThan(2 * 6)
    expect(projectWorldX(OFF_WX, 0), 'OFF_WX must be off-window (null) at camera 0').toBeNull()
    expect(projectWorldX(OFF_WX, REVEAL_CAMERA), 'and on-window once the camera scrolls to it').not.toBeNull()
  })

  it.each(BANKS)('$name ($sprite) are blitted, as their OWN sprite, at their projected column when a live member is on-window', ({ name, sprite, atX }) => {
    const cols = bankCols((c) => atX([WX], c), 0)
    // Collected count FIRST (lang-review #15): a live, on-window member MUST paint pixels.
    expect(
      cols.length,
      `the ${name} bank (${sprite}) is not blitted into the main view — composeFrame loops only over ` +
        `state.landers and state.humanoids (the lander/humanoid loops in composeFrame), so ${name} attack ` +
        `the player invisibly for their whole life. GREEN adds a blit loop over this bank, projected through ` +
        `projectWorldX like the landers.`,
    ).toBeGreaterThan(0)
    // IDENTITY ([TEST] H1): every differing pixel is a bank-sprite pixel, so the painted index set must be
    // a subset of THIS sprite's own nibbles. A swapped label (e.g. blitBank(state.pods, BOMBER_OBJECT))
    // paints a foreign sprite's indices and fails here even though the count above passes.
    const painted = bankIndices((c) => atX([WX], c), 0)
    const own = spriteIndices(sprite)
    const foreign = [...painted].filter((i) => !own.has(i))
    expect(
      foreign,
      `${name} painted palette indices ${JSON.stringify([...painted])} that are not in its own sprite ${sprite} ` +
        `(${JSON.stringify([...own])}) — the bank is being drawn with the WRONG sprite`,
    ).toEqual([])
    expect(painted.size, `${name} sanity: its own sprite paints at least one index`).toBeGreaterThan(0)
    // POSITION ([TEST] H2): it lands where the SHARED world projection puts it — the same projectWorldX the
    // collision path uses (toScreenCol), NOT projectOnscreenX or a naive world>>8. The bound is THIS bank's
    // own sprite width, so a projection offset reddens for the narrow banks too, not just the widest.
    const footprint = spriteFootprintPx(sprite)
    expect(Math.min(...cols), `${name} drawn left of its projected column ${ON_COL}`).toBeGreaterThanOrEqual(ON_COL)
    expect(
      Math.max(...cols),
      `${name} drawn beyond its own ${sprite} footprint (${footprint}px) from column ${ON_COL}`,
    ).toBeLessThan(ON_COL + footprint)
  })

  it.each(BANKS)('EVERY live $name member is blitted, not just the first', ({ name, sprite, atX }) => {
    // Two members, far apart. A loop that drew only recs[0] would paint near ON_COL and nothing near ON_COL2.
    const cols = bankCols((c) => atX([WX, WX2], c), 0)
    const footprint = spriteFootprintPx(sprite)
    expect(
      cols.some((c) => c >= ON_COL && c < ON_COL + footprint),
      `${name}: the first member (col ${ON_COL}) must be drawn`,
    ).toBe(true)
    expect(
      cols.some((c) => c >= ON_COL2 && c < ON_COL2 + footprint),
      `${name}: the SECOND member (col ${ON_COL2}) must be drawn too — the blit loop must iterate every live ` +
        `member, not just recs[0]`,
    ).toBe(true)
  })
})

describe('pt1-23 — the blit loop must honour the visible-window cull (not blit the whole world)', () => {
  it.each(BANKS)('an off-window $name member is culled from the main view', ({ name, atX }) => {
    // Sanity: the fixture really is off-window per the projection contract.
    expect(projectWorldX(OFF_WX, 0), `${name} fixture: OFF_WX must be off-window`).toBeNull()
    expect(
      bankCols((c) => atX([OFF_WX], c), 0).length,
      `an off-window ${name} member must NOT be blitted — the loop must project through projectWorldX and skip ` +
        `a null column exactly as the lander loop does (its \`if (col === null) continue\`), not paint every ` +
        `world entity`,
    ).toBe(0)
  })

  it.each(BANKS)('scrolling the camera reveals an off-window $name member', ({ name, atX }) => {
    expect(bankCols((c) => atX([OFF_WX], c), 0).length, `${name} off-window at camera 0`).toBe(0)
    expect(
      bankCols((c) => atX([OFF_WX], c), REVEAL_CAMERA).length,
      `scrolling the camera must bring an off-window ${name} member into the main view — proof the loop ` +
        `projects camera-relative through projectWorldX, not at a fixed absolute column`,
    ).toBeGreaterThan(0)
  })
})

describe('pt1-23 — a dead bank member is not blitted (the loop must carry the lander loop’s alive guard)', () => {
  const KILLABLE = BANKS.filter((b): b is BankCase & { dead: NonNullable<BankCase['dead']> } => b.dead !== null)

  it.each(KILLABLE)('a dead $name member is not drawn even when on-window', ({ name, atX, dead }) => {
    // Control the fixture: the SAME member alive IS drawn, so this is not vacuous once GREEN lands.
    expect(bankCols((c) => atX([WX], c), 0).length, `${name} sanity: a live member is drawn`).toBeGreaterThan(0)
    expect(
      bankCols((c) => dead(WX, c), 0).length,
      `a dead ${name} member must be skipped — the blit loop must guard on \`alive\` like the lander loop ` +
        `(its \`if (!lander.alive) continue\`), or corpses paint over the play field`,
    ).toBe(0)
  })
})
