// plugins/defender/tests/df3-6-live-sim.test.ts
//
// Story df3-6 — RED phase (Tyr One-Handed / TEA). The BUILD half, mechanised: the df3
// core (scheduler/ship/world/stars/laser, df3-1..5) shipped as pure sim modules but was
// never wired so the game actually MOVES. This suite pins the two missing pure-core
// seams and their observable behaviour BLACK-BOX, through the composed framebuffer —
// the same thing the human playtest looks at — so it cannot be faked by a main.ts that
// imports the loop yet still paints a static still.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// Two pure src/core seams do not exist yet:
//   • src/core/sim.ts     — the aggregate: createSim(rand) + stepSim(state, input) that
//                           advances ship+world+stars+lasers ONE 60 Hz tick, plus an
//                           Input snapshot type { thrust, reverse, up, down, fire }.
//   • src/core/scene.ts   — a DYNAMIC composer composeFrame(state, w, h): Framebuffer
//                           beside the existing composeStaticFrame. Renders the live
//                           state by palette INDEX only.
// loadSim()/loadScene() throw a self-describing "not built yet" until they exist.
//
// ─── PROPOSED SEAM (TEA's contract, mirroring the fleet) ─────────────────────────
// Names mirror millipede's createGame/stepGame/GameInput (core/sim.ts) and the existing
// composeStaticFrame(width,height) precedent (board dims stay in the shell — importing
// LOGICAL_WIDTH into core is a purity violation, still-frame.test.ts:26-27). Dev MAY
// rename, but a rename means updating these tests, so the names are the cheap path.
// The minimal observable SimState shape these tests read:
//     { ship: { x, y, facing }, camera, stars: Star[], lasers: Laser[] }
// x is the ON-SCREEN column (the ship-leads target, base 0x20 right / 0x70 left, df3-2);
// y is the player row (clamped [YMIN+1, 238], df3-2).
//
// ─── WHY BLACK-BOX ───────────────────────────────────────────────────────────────
// The raw coordinate maths (slide, clampPlayerY, laser cap, star scroll) are already
// unit-pinned by df3-1..5. df3-6's risk is the WIRING: a wrong seam (feeding 24-bit
// PLAXV where slide wants 16-bit; motion driven by wall-clock not input; a composer that
// ignores state). So the assertions here are about the INTEGRATED, evolving frame, not a
// re-pin of module maths.

import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import type { Framebuffer } from '../src/core/framebuffer.js'
import { composeStaticFrame } from '../src/core/scene.js'
import type { Facing } from '../src/core/world.js'
import type { Star } from '../src/core/stars.js'
import type { Laser } from '../src/core/laser.js'

const LOGICAL_WIDTH = 292
const LOGICAL_HEIGHT = 240
const BACKGROUND = 0
const YMIN = 42 // world.ts YMIN; player clamps to [YMIN+1, 238] = [43, 238]

// ── the proposed df3-6 contract, as TEA expects Dev to build it ──────────────────
type Input = {
  readonly thrust: boolean
  readonly reverse: boolean
  readonly up: boolean
  readonly down: boolean
  readonly fire: boolean
}
interface SimState {
  readonly ship: { readonly x: number; readonly y: number; readonly facing: Facing }
  readonly camera: number
  readonly stars: readonly Star[]
  readonly lasers: readonly Laser[]
}
interface SimModule {
  createSim: (rand: () => number) => SimState
  stepSim: (state: SimState, input: Input) => SimState
}
interface DynamicSceneModule {
  composeFrame: (state: SimState, width: number, height: number) => Framebuffer
}

const NEUTRAL: Input = { thrust: false, reverse: false, up: false, down: false, fire: false }
const withInput = (over: Partial<Input>): Input => ({ ...NEUTRAL, ...over })

// A variable specifier so `tsc --noEmit` does not statically resolve a module that does
// not exist yet (it would be TS2307 during RED); vitest still resolves it at runtime, so
// the import throws and the loader reports the self-describing message below.
const SIM_SPECIFIER = '../src/core/sim.js'
// scene.js exists (composeStaticFrame) but composeFrame may not yet, and its real param
// is the full SimState — a variable specifier keeps tsc from binding this to the concrete
// signature (which would conflict with the observable-subset SimState the tests read).
const SCENE_SPECIFIER = '../src/core/scene.js'

async function loadSim(): Promise<SimModule> {
  try {
    const mod = (await import(/* @vite-ignore */ SIM_SPECIFIER)) as Partial<SimModule>
    if (typeof mod.createSim !== 'function') throw new Error('no `createSim` export')
    if (typeof mod.stepSim !== 'function') throw new Error('no `stepSim` export')
    return mod as SimModule
  } catch (e) {
    throw new Error(
      'src/core/sim.ts not built yet — GREEN (Dev) creates the pure aggregate that wires the df3 ' +
        'core into one tick: `createSim(rand: () => number): SimState` (entropy injected, like ' +
        'initStars) and `stepSim(state, input): SimState` advancing ship (stepVelocityX/stepReverse/' +
        'stepVerticalY), world (slide), stars (stepStars) and lasers (scheduler.stepTick) once, plus ' +
        'the Input snapshot type { thrust, reverse, up, down, fire }. PURE src/core — purity.test.ts ' +
        `sweeps it (no DOM, no clock, no Math.random). (${e instanceof Error ? e.message : String(e)})`,
    )
  }
}

async function loadDynamicScene(): Promise<DynamicSceneModule> {
  const mod = (await import(/* @vite-ignore */ SCENE_SPECIFIER)) as Partial<DynamicSceneModule>
  if (typeof mod.composeFrame !== 'function') {
    throw new Error(
      'src/core/scene.ts has no `composeFrame` export yet — GREEN (Dev) adds the DYNAMIC composer ' +
        '`composeFrame(state, width, height): Framebuffer` BESIDE composeStaticFrame: clear, then blit ' +
        'the starfield (drawStars), the ship at its display column/row, and any lasers in flight, over ' +
        'the scrolling world — by palette INDEX only, board dims as arguments (never import shell dims).',
    )
  }
  return mod as DynamicSceneModule
}

/** A deterministic byte source for createSim (rand() → 0..255). An LCG so the RED suite
 *  never depends on ambient entropy; two builds with the same seed must agree. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

const digest = (fb: Framebuffer): string => createHash('sha256').update(fb.data).digest('hex').slice(0, 16)

/** Run the sim forward `n` ticks under a constant input, from a fresh seeded state. */
async function run(seed: number, n: number, input: Input): Promise<SimState> {
  const { createSim, stepSim } = await loadSim()
  let s = createSim(makeRand(seed))
  for (let i = 0; i < n; i++) s = stepSim(s, input)
  return s
}

describe('df3-6 dynamic composer — the game is a live frame, not the df2 still', () => {
  it('composeFrame(state, 292, 240) returns the visible raster', async () => {
    const { createSim } = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    const fb = composeFrame(createSim(makeRand(1)), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    expect(fb.width).toBe(LOGICAL_WIDTH)
    expect(fb.height).toBe(LOGICAL_HEIGHT)
    expect(fb.data.length).toBe(LOGICAL_WIDTH * LOGICAL_HEIGHT)
  })

  it('is not blank and DIFFERS from the static title still (composeFrame ≠ composeStaticFrame)', async () => {
    // The retired df2 behaviour is a static still. The live game must paint something,
    // and something OTHER than the title screen — the local analogue of the canonical
    // DIFFER check, but against animation, not just serving.
    const { createSim } = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    const live = composeFrame(createSim(makeRand(1)), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const still = composeStaticFrame(LOGICAL_WIDTH, LOGICAL_HEIGHT)
    expect(live.data.some((i) => i !== BACKGROUND), 'composeFrame produced a blank frame').toBe(true)
    expect(digest(live), 'the live frame is byte-identical to the static title still').not.toBe(digest(still))
  })

  it('every composed cell is a valid 4-bit palette index (0..15) — no colour invented by overflow', async () => {
    // still-frame.test.ts pins this for composeStaticFrame; the dynamic path writes the
    // ship/laser/star colours too, and an index > 15 renders as CRAM[i & 0x0f] — a colour
    // the palette never named. Sample across motion so a laser/ship colour can't sneak in.
    const { createSim, stepSim } = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    let s = createSim(makeRand(7))
    let worst = 0
    for (let i = 0; i < 90; i++) {
      s = stepSim(s, withInput({ thrust: true, fire: i % 8 === 0 }))
      const fb = composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)
      for (const px of fb.data) if (px > worst) worst = px
    }
    expect(worst, `composeFrame wrote index ${worst}, outside the 16-entry palette (0..15)`).toBeLessThanOrEqual(15)
  })
})

describe('df3-6 composer isolates each element — the ship and laser are actually drawn (AC3)', () => {
  // "Differs from rest / not blank" is satisfiable by the starfield scroll ALONE, so the
  // composer half needs seams isolated: hold stars/camera/lasers fixed and move only the
  // ship (then only the lasers). Mutation-proven: deleting the ship blitObject, or the
  // laser-draw loop, from composeFrame reddens exactly these two (Reviewer r1, HIGH).
  const overStars = () => makeRand(2)

  it('moving ONLY the ship changes the frame (the ship sprite is composited)', async () => {
    const { createSim } = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    const base = createSim(overStars())
    const at = (x: number, y: number): SimState => ({ ...base, ship: { x, y, facing: 'right' } })
    const a = composeFrame(at(30, 120), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const b = composeFrame(at(200, 120), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    expect(
      digest(a),
      'the ship position does not affect the frame — the ship sprite is not being drawn',
    ).not.toBe(digest(b))
  })

  it('adding a laser in flight changes the frame (lasers are composited)', async () => {
    const { createSim } = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    const base = createSim(overStars())
    const none = composeFrame({ ...base, lasers: [] }, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const one = composeFrame(
      { ...base, lasers: [{ x: 0x4000, facing: 'right', alive: true, y: 120 }] }, // pt1-27: y required (captured fire row)
      LOGICAL_WIDTH,
      LOGICAL_HEIGHT,
    )
    expect(
      digest(one),
      'a laser in flight does not affect the frame — the laser is not being drawn',
    ).not.toBe(digest(none))
  })
})

describe('df3-6 the sim ADVANCES, and only under input (60 Hz step, not the wall clock)', () => {
  it('sustained thrust drives the frame somewhere REST never goes', async () => {
    // The riskiest wiring bug is motion that does not respond to input (a static compose,
    // or a step that drops the velocity seam). Same seed, same tick count: thrust must
    // reach a frame the rest run does not. This is intentionally magnitude-free — it
    // proves the input is wired, not how far it travels.
    const { composeFrame } = await loadDynamicScene()
    const thrust = await run(3, 150, withInput({ thrust: true }))
    const rest = await run(3, 150, NEUTRAL)
    const a = composeFrame(thrust, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const b = composeFrame(rest, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    expect(digest(a), 'thrusting for 150 ticks produced the SAME frame as resting — input is not wired').not.toBe(
      digest(b),
    )
  })

  it('at rest the frame settles and then HOLDS — no ambient clock/entropy drift', async () => {
    // The ship-leads slide may settle the camera to the base column over the first ticks;
    // after that, a no-input sim must be perfectly still. A frame that keeps changing with
    // no input is reading a clock or leaking entropy (the purity backstop, behaviourally).
    const { createSim, stepSim } = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    let s = createSim(makeRand(5))
    for (let i = 0; i < 240; i++) s = stepSim(s, NEUTRAL) // settle
    const settled = digest(composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT))
    for (let i = 0; i < 60; i++) s = stepSim(s, NEUTRAL)
    expect(digest(composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)), 'the resting frame drifted').toBe(settled)
  })

  it('is deterministic: same seed + same inputs → byte-identical frames (guards entropy leaking in)', async () => {
    const { composeFrame } = await loadDynamicScene()
    const inputs = (i: number): Input => withInput({ thrust: i % 3 !== 0, up: i % 5 === 0, fire: i % 11 === 0 })
    const play = async (): Promise<string> => {
      const { createSim, stepSim } = await loadSim()
      let s = createSim(makeRand(42))
      for (let i = 0; i < 120; i++) s = stepSim(s, inputs(i))
      return digest(composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT))
    }
    expect(await play()).toBe(await play())
  })
})

describe('df3-6 ship-leads offset — pin the COORDINATES, not just the direction (routing ≠ geometry)', () => {
  it('reverse flips the facing', async () => {
    const right = await run(9, 60, withInput({ thrust: true }))
    const left = await run(9, 60, withInput({ thrust: true, reverse: true }))
    expect(right.ship.facing).toBe('right')
    expect(left.ship.facing).toBe('left')
  })

  it('the ship sits in its facing LEAD column — left of centre facing right, right of it facing left', async () => {
    // PLAY1 targets screen column base 0x20 (32) facing right, 0x70 (112) facing left
    // (df3-2 world.slide / targetColumn). An absolute-space rewrite would drift and NOT
    // reproduce this display-space split — that is the routing≠geometry trap. Coarse
    // bands (a mid-line at 0x50 = 80) so this pins the lead SIDE without coupling to the
    // exact settled pixel, which df3-2's world.test.ts already owns.
    const right = await run(11, 200, withInput({ thrust: true }))
    const left = await run(11, 200, withInput({ thrust: true, reverse: true }))
    // Pin the COORDINATE, not just the side (routing != geometry). ship.x is now the framebuffer
    // PIXEL (pt1-18 projectOnscreenX = (plax16>>2)*292/9600 ≈ the old plax16>>8 column × 1.947).
    // Measured settled pixels for seed 11 / 200 ticks: right = 107 (base 0x20 + a velocity column),
    // left = 173 (base 0x70 side). The bands still KILL the 24->16 seam mutation: feeding slide the
    // full `plaxv24` instead of `plaxv24 >> 8` settles right=32col/left=112col => 62px / 218px,
    // both OUTSIDE these bands.
    expect(right.ship.x, `facing-right lead column; saw ${right.ship.x}, expected ~107`).toBeGreaterThanOrEqual(96)
    expect(right.ship.x, `facing-right lead column; saw ${right.ship.x}, expected ~107`).toBeLessThanOrEqual(120)
    expect(left.ship.x, `facing-left lead column; saw ${left.ship.x}, expected ~173`).toBeGreaterThanOrEqual(160)
    expect(left.ship.x, `facing-left lead column; saw ${left.ship.x}, expected ~173`).toBeLessThanOrEqual(186)
    expect(left.ship.x, 'the facing-left lead column must sit RIGHT of the facing-right one').toBeGreaterThan(
      right.ship.x,
    )
  })
})

describe('df3-6 vertical CLAMP — the player strip (one of the axis two rules)', () => {
  // The ROM freezes upward at YMIN+1 (43) and downward at 238 (DEFA7.SRC:2450,2461) but
  // INTEGRATES with NO post-add clamp (:2472-2474), so a max ±$200 step overshoots one
  // row past the freeze line before it re-freezes: the faithful reachable strip is
  // [YMIN, 239] = [42, 239], not the epic description's simplified [43, 238]. ROM wins.
  // (Corrected from the first RED draft by Dev — see the df3-6 vertical-clamp deviation.)
  const YMAX_ROW = 239 // YMAX(240) − 1: the lowest row the down-overshoot can reach

  it('holding UP never lifts the ship above row YMIN (42)', async () => {
    const s = await run(13, 400, withInput({ up: true }))
    expect(s.ship.y, `ship rose to row ${s.ship.y}, above the strip floor ${YMIN}`).toBeGreaterThanOrEqual(YMIN)
  })

  it('holding DOWN never drops the ship below row 239', async () => {
    const s = await run(13, 400, withInput({ down: true }))
    expect(s.ship.y, `ship fell to row ${s.ship.y}, past the strip floor ${YMAX_ROW}`).toBeLessThanOrEqual(YMAX_ROW)
  })
})

describe('df3-6 laser — fires, travels, and never exceeds four in flight (LFIRE max-4)', () => {
  it('firing puts a laser in flight where there was none', async () => {
    const before = await run(21, 30, NEUTRAL)
    expect(before.lasers.filter((l) => l.alive).length, 'a resting sim already had lasers').toBe(0)
    const { createSim, stepSim } = await loadSim()
    let s = createSim(makeRand(21))
    for (let i = 0; i < 30; i++) s = stepSim(s, NEUTRAL)
    s = stepSim(s, withInput({ fire: true }))
    expect(s.lasers.filter((l) => l.alive).length, 'firing did not spawn a laser').toBeGreaterThanOrEqual(1)
  })

  it('a laser in flight actually moves down-range across ticks', async () => {
    const { createSim, stepSim } = await loadSim()
    let s = createSim(makeRand(23))
    s = stepSim(s, withInput({ thrust: true, fire: true }))
    const born = s.lasers.find((l) => l.alive)
    expect(born, 'no laser spawned on fire').toBeTruthy()
    const x0 = born!.x
    for (let i = 0; i < 5; i++) s = stepSim(s, withInput({ thrust: true }))
    const moved = s.lasers.some((l) => l.alive && l.x !== x0)
    expect(moved, `laser stayed at x=${x0} — it is not travelling (scheduler.stepTick not driving it)`).toBe(true)
  })

  it('pulsed fire presses cap at four concurrent lasers, never five', async () => {
    // df8-4: fire is edge-per-press, so this pulses (a distinct press every 2 ticks) — a
    // held button is one edge, one laser, and the cap would go unvacuously untested. Six
    // presses inside the ~30-tick flight must pin the LFIRE cap at EXACTLY four.
    const { createSim, stepSim } = await loadSim()
    let s = createSim(makeRand(29))
    let peak = 0
    for (let i = 0; i < 12; i++) {
      s = stepSim(s, withInput({ fire: i % 2 === 0 }))
      peak = Math.max(peak, s.lasers.filter((l) => l.alive).length)
    }
    expect(peak, `had ${peak} lasers in flight — LFIRE caps at 4 (MAX_LASERS), and six presses must REACH it`).toBe(4)
  })
})

describe('df3-6 accessibility forward-note — df3 renders NO full-screen flash', () => {
  it('no composed frame is a full-screen single-colour flash, across varied play', async () => {
    // The df4/df5 accessibility ruling (context-epic-df3.md): smart-bomb/hyperspace flash
    // the whole screen in the ROM and must become freeze/fade downstream — but df3 itself
    // renders none. A "flash" is one non-background colour filling (near) the whole raster.
    // Normal play never does: the widest solid region (the terrain band) is well under a
    // fifth of the screen. So assert no single NON-zero index ever covers > 60% of pixels.
    const { createSim, stepSim } = await loadSim()
    const { composeFrame } = await loadDynamicScene()
    const total = LOGICAL_WIDTH * LOGICAL_HEIGHT
    let s = createSim(makeRand(31))
    let worstFrac = 0
    for (let i = 0; i < 120; i++) {
      s = stepSim(s, withInput({ thrust: i % 2 === 0, reverse: i % 7 === 0, up: i % 3 === 0, fire: i % 4 === 0 }))
      const fb = composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)
      const hist = new Array<number>(16).fill(0)
      for (const px of fb.data) hist[px & 0x0f]++
      for (let idx = 1; idx < 16; idx++) worstFrac = Math.max(worstFrac, hist[idx] / total)
    }
    expect(
      worstFrac,
      `a single non-background colour covered ${(worstFrac * 100).toFixed(1)}% of the screen — that is a ` +
        `full-screen flash, which df3 must never render (accessibility forward-note, context-epic-df3.md)`,
    ).toBeLessThan(0.6)
  })
})
