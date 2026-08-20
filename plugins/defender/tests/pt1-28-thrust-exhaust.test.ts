// plugins/defender/tests/pt1-28-thrust-exhaust.test.ts
//
// Story pt1-28 — RED phase (O'Brien / TEA). Owner playtest bug: holding thrust
// accelerates the ship but draws NO exhaust flame — thrust is audio-only today
// (sim.ts thrust-start/thrust-stop cues, the df6-2 SNDSEQ edge) and no render code
// reads the thrust bit. `ShipView` carries only x/y/facing; `input.thrust` and the
// runtime's `prevThrust` never reach composeFrame.
//
// ─── THE ROM: THOUT / THOUT1, read for this story ─────────────────────────────────────
// The player draw chain is PRDISP (DEFA7.SRC PRDSP2): POUT draws the ship picture,
// then THOUT draws the exhaust — THOUT for PLADIR >= 0 (PLAPIC, the RIGHT-facing
// cell), THOUT1 ("BACKWARDS THRUST") for PLADIR < 0 (PLBPIC, facing LEFT).
//
// Williams VRAM is COLUMN-major: address = byteColumn*$100 + y, one byte = two 4-bit
// pixels. So `-$100` off PLAXC (the ship's left-edge byte column) is ONE BYTE-COLUMN
// (2 px) LEFT of the ship, and a `+1..+5` byte offset walks DOWN rows 1..5. Reading
// THOUT (DEFA7.SRC THOUT..THOUTX) byte store by byte store:
//
//   ALWAYS (before the PIA21 thrust-bit test — the idle flicker stub):
//     column -$100, rows +1..+5            → px dx {-2,-1} × dy {1..5}
//   ONLY when PIA21 bit $02 (thrust) is held (after `BITA #$02 / BEQ THOUTX IDLE`):
//     column -$200, rows +2..+4            → px dx {-4,-3} × dy {2..4}
//     column -$300, rows +2..+4            → px dx {-6,-5} × dy {2..4}
//     column -$400, row  +3                → px dx {-8,-7} × dy {3}
//
// So the plume TRAILS the right-facing ship leftward — behind it, opposite travel —
// tapering 5 rows → 3 → 3 → 1. THOUT1 stores the mirror image at +$801..+$B02: the
// ship occupies byte columns PLAXC..+7 (PLAPIC is 8 bytes = 16 px wide), so column
// +$800 rows 1-5 / +$900 rows 2-4 / +$A00 rows 2-4 / +$B00 row 3 is the SAME taper
// immediately RIGHT of the left-facing ship. THE FLAME FLIPS WITH FACING, and the
// mirror is exactly pt1-26's ship transform (local px → SHIP_W-1-px, rows unchanged),
// extended past the cell edge: dx -1..-8 ↔ dx 16..23.
//
// FLICKER: the 13 bytes THOUT stores each frame come from THTAB (offsets 0..12 off
// THX), a table THINIT fills from RAND (DEFA7.SRC THINIT: `JSR RAND / STA 32,X /
// STA ,X+` over 32+32 bytes). THPROC (DEFA7.SRC, *THRUST PROCESS*) advances THX one
// byte per NAP-4 slice, wrapping at THTAB+32 — the flame ANIMATES from a
// random-seeded window. Two consequences pinned here: the exact pixel VALUES are
// random-table nibbles (a nibble may be zero — we pin the ENVELOPE and liveness, never
// an exact sprite, and say so), and in the clone the table/phase MUST live in sim
// state fed by the injected deterministic rand (createSim's `rand` — the df3 seam;
// tests/purity.test.ts bans Math.random in core), advanced in stepSim, so replays
// reproduce bit-for-bit.
//
// ─── APPROACH: BLACK-BOX over composeFrame (the pt1-26 shape) ─────────────────────────
// No assertion names the new state field. Thrust is applied where the machine applies
// it — `input.thrust` into stepSim — and observed where the player observes it — pixels
// out of composeFrame. Whatever plumbing GREEN adds (ShipView.thrust plus a
// THTAB/THX-shaped table in state is the expected shape), thrust information can only
// cross stepSim → composeFrame through SimState, so these tests pin the wiring
// end-to-end without coupling to its spelling.
//
// Each stepped state is PROJECTED into a parked, emptied arena before composing:
// every visible bank emptied, stars emptied, camera zeroed, HUD fields fixed, and the
// ship forced to a clear play-field slot (the pt1-26 box) — so the ONLY pixels that
// can differ between a thrust and a no-thrust projection are the exhaust's own.
// Everything else stepSim computed (including any flame table/phase) rides through
// the spread untouched.
//
// RED today: composeFrame reads no thrust bit, so a thrust frame is byte-identical
// to its no-thrust control — no plume (AC1), no flip (AC2), no idle stub (AC3), no
// flicker (AC4). AC5 (replay determinism) is green on arrival and stays as the guard
// that GREEN's flicker uses the seeded rand, never ambient entropy.

import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import type { Framebuffer } from '../src/core/framebuffer.js'
import { OBJECTS } from '../src/core/objects.js'
import { composeFrame } from '../src/core/scene.js'
import { createSim, stepSim, type Input, type SimState } from '../src/core/sim.js'
import type { Facing } from '../src/core/world.js'

const LOGICAL_WIDTH = 292 // src/shell/render.ts LOGICAL_WIDTH — core takes it as an arg (pt1-26 precedent)
const LOGICAL_HEIGHT = 240

// The pt1-26 clear play-field slot: below the scanner band, above the terrain, and with
// 8 px of clear air on BOTH sides for the plume (right-facing flame spans x-8..x-1,
// left-facing x+16..x+23).
const SHIP_X = 140
const SHIP_Y = 110

const PLAPIC = (() => {
  const o = OBJECTS.find((r) => r.name === 'PLAPIC' && r.encoding === 'raster')
  if (!o) throw new Error('PLAPIC not found in OBJECTS — fixture precondition failed')
  return o
})()
const SHIP_W = PLAPIC.width * 2 // 8 bytes × 2 px — the mirror pivot, exactly pt1-26's

// ─── The ROM flame envelope, ship-anchor-relative (facing RIGHT) ───────────────────────
// Transcribed from THOUT's stores (header). dx in PIXELS (one ROM byte-column = 2 px).
type Cell = readonly [dx: number, dy: number]

/** The idle stub — THOUT's writes BEFORE the PIA21 test: column -$100, rows 1-5. */
const STUB_RIGHT: readonly Cell[] = (() => {
  const cells: Cell[] = []
  for (const dx of [-2, -1]) for (let dy = 1; dy <= 5; dy++) cells.push([dx, dy])
  return cells
})()

/** The thrust-only extension — THOUT's writes AFTER `BITA #$02`: -$200/-$300 rows 2-4, -$400 row 3. */
const EXT_RIGHT: readonly Cell[] = (() => {
  const cells: Cell[] = []
  for (const dx of [-4, -3, -6, -5]) for (let dy = 2; dy <= 4; dy++) cells.push([dx, dy])
  for (const dx of [-8, -7]) cells.push([dx, 3])
  return cells
})()

/** THOUT1's mirror: the pt1-26 flip transform (px → SHIP_W-1-px) run past the cell edge —
 *  -$100..-$400 left of PLAXC ↔ +$800..+$B00 right of it, rows unchanged. */
const mirrorCell = ([dx, dy]: Cell): Cell => [SHIP_W - 1 - dx, dy]
const EXT_LEFT: readonly Cell[] = EXT_RIGHT.map(mirrorCell)

const cellKey = ([dx, dy]: Cell): string => `${SHIP_X + dx},${SHIP_Y + dy}`

/** Deterministic byte source (LCG) — the df7-8/pt1-26 shape, no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

const HOLD: Input = { thrust: true, reverse: false, up: false, down: false, fire: false }
const IDLE: Input = { thrust: false, reverse: false, up: false, down: false, fire: false }

/** Step `state` through `ticks` frames of one input, asserting the run stays benign —
 *  a hostile seed (a death mid-run) must fail LOUD here, not as a mystery pixel diff. */
function run(seed: number, input: Input, ticks: number): SimState {
  let s = createSim(makeRand(seed))
  const men = s.men
  for (let t = 0; t < ticks; t++) {
    s = stepSim(s, input)
    expect(s.gameOver, `seed ${seed} proved hostile: game over at tick ${t + 1} — pick another seed`).toBe(false)
    expect(s.men, `seed ${seed} proved hostile: a death at tick ${t + 1} — pick another seed`).toBe(men)
  }
  return s
}

/**
 * Project a stepped state into the parked, emptied arena: every visible entity bank
 * emptied, stars emptied, camera zeroed (terrain identical across projections), HUD
 * fields fixed, ship forced to the clear slot facing `facing`. Every OTHER field —
 * including whatever thrust/flame state GREEN adds — rides through the spreads, so two
 * projections can differ ONLY through state the exhaust draw reads.
 */
function parked(state: SimState, facing: Facing): SimState {
  return {
    ...state,
    camera: 0,
    stars: [],
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
    wave: 1,
    score: 0,
    men: 2,
    smartBombs: 3,
    gameOver: false,
    cues: [],
    ship: { ...state.ship, x: SHIP_X, y: SHIP_Y, facing },
  }
}

const at = (fb: Framebuffer, x: number, y: number): number => fb.data[y * fb.width + x]
const digest = (fb: Framebuffer): string => createHash('sha256').update(fb.data).digest('hex').slice(0, 16)

/** Every framebuffer coordinate where two frames differ, as "x,y" keys. */
function diffKeys(a: Framebuffer, b: Framebuffer): string[] {
  const keys: string[] = []
  for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < a.width; x++) {
      if (at(a, x, y) !== at(b, x, y)) keys.push(`${x},${y}`)
    }
  }
  return keys
}

/** The flame region's pixel values in reading order — the flicker fingerprint. */
const flamePattern = (fb: Framebuffer, cells: readonly Cell[]): string =>
  cells.map(([dx, dy]) => at(fb, SHIP_X + dx, SHIP_Y + dy)).join(',')

// Thrust is HELD for a few ticks before every observation (not a one-tick edge): THOUT
// keys the plume on the PIA21 LEVEL, so a GREEN gated on the thrust-start CUE edge
// (df6-2's audio idiom) would wrongly go dark while the button stays down.
const TICKS = 3

// ─── AC1 (RED — the story) — held thrust paints the plume BEHIND the ship, per THOUT ──
describe('pt1-28 AC1 — held thrust draws the exhaust plume behind a right-facing ship', () => {
  it('thrust vs no-thrust frames differ, exactly within the THOUT extension envelope', () => {
    // Same seed, same ticks, only input.thrust differs; both projected into the same
    // parked arena. RED today: no draw reads thrust, the frames are byte-identical, and
    // the diff is empty. GREEN: the diff is non-empty and every differing pixel lies in
    // THOUT's thrust-only stores (-$200/-$300 rows 2-4, -$400 row 3 — dx -8..-3). The
    // stub column (dx -2..-1) is drawn in BOTH frames (it precedes the PIA21 test), so
    // it cancels out of this diff; containment therefore also proves the plume lands
    // where THOUT puts it and nowhere else.
    const thrust = composeFrame(parked(run(11, HOLD, TICKS), 'right'), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const idle = composeFrame(parked(run(11, IDLE, TICKS), 'right'), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const diffs = diffKeys(thrust, idle)
    expect(diffs.length, 'held thrust draws NO exhaust — thrust and idle frames are identical').toBeGreaterThan(0)
    const allowed = new Set(EXT_RIGHT.map(cellKey))
    for (const key of diffs) {
      expect(allowed.has(key), `thrust changed pixel (${key}) OUTSIDE the THOUT plume envelope`).toBe(true)
    }
  })

  it('non-vacuity: the no-thrust frame has NO pixels in the extension envelope', () => {
    // Guards the diff above from passing against a plume that is merely always-on: the
    // thrust-gated region must be EMPTY when thrust is idle (THOUT's `BEQ THOUTX IDLE`).
    const idle = composeFrame(parked(run(11, IDLE, TICKS), 'right'), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    for (const cell of EXT_RIGHT) {
      const [dx, dy] = cell
      expect(
        at(idle, SHIP_X + dx, SHIP_Y + dy),
        `idle ship has a plume pixel at (${dx},${dy}) — the extension must be thrust-gated`,
      ).toBe(0)
    }
  })
})

// ─── AC2 (RED) — the flame flips with facing, per THOUT1 ──────────────────────────────
describe('pt1-28 AC2 — the exhaust trails the ship on the side OPPOSITE its facing', () => {
  it('facing left, the thrust diff lands entirely in the MIRRORED envelope (right of the ship)', () => {
    // THOUT1 stores the same taper at +$800..+$B00 — immediately right of the 8-byte
    // left-facing ship — the exact pt1-26 mirror (px → SHIP_W-1-px) of THOUT's stores.
    // The facing seam is the rendered one: state.ship.facing, forced in the projection.
    const thrust = composeFrame(parked(run(13, HOLD, TICKS), 'left'), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const idle = composeFrame(parked(run(13, IDLE, TICKS), 'left'), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const diffs = diffKeys(thrust, idle)
    expect(diffs.length, 'held thrust draws NO exhaust on a left-facing ship').toBeGreaterThan(0)
    const wrongSide = new Set(EXT_RIGHT.map(cellKey))
    for (const key of diffs) {
      expect(wrongSide.has(key), `left-facing plume painted on the RIGHT-facing side at (${key}) — flame did not flip`).toBe(false)
    }
    const allowed = new Set(EXT_LEFT.map(cellKey))
    for (const key of diffs) {
      expect(allowed.has(key), `left-facing thrust changed pixel (${key}) outside the mirrored THOUT1 envelope`).toBe(true)
    }
  })
})

// ─── AC3 (RED) — THOUT's idle stub: the tail flickers even without thrust ─────────────
describe('pt1-28 AC3 — the idle exhaust stub is drawn whenever the ship is', () => {
  it('an idle ship still shows tail pixels in the -$100 stub column', () => {
    // THOUT writes column -$100 rows 1-5 BEFORE testing PIA21 — the ship's tail flickers
    // constantly on real hardware, thrust or not; only the 3-column extension is gated.
    // Values are THTAB nibbles (any single one may be zero), so this pins LIVENESS of the
    // 10-pixel stub region, not an exact pattern.
    const idle = composeFrame(parked(run(17, IDLE, TICKS), 'right'), LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const lit = STUB_RIGHT.filter(([dx, dy]) => at(idle, SHIP_X + dx, SHIP_Y + dy) !== 0)
    expect(lit.length, 'no idle exhaust stub — THOUT paints its first column unconditionally').toBeGreaterThan(0)
  })
})

// ─── AC4 (RED) — the flame FLICKERS over time, per THINIT/THPROC ──────────────────────
describe('pt1-28 AC4 — the exhaust animates while thrust is held', () => {
  it('the flame region shows at least two distinct patterns across a held-thrust run', () => {
    // THPROC slides THX one byte per NAP-4 slice through the RAND-filled THTAB (wrap at
    // +32), so the 13 bytes THOUT reads change every few frames — the flame is a
    // flicker, not a static sprite. 33 held ticks cover several advances at any faithful
    // cadence. RED today: the region is empty every tick — one (blank) pattern.
    // The exact per-tick values are random-table nibbles and are deliberately NOT pinned.
    let s = createSim(makeRand(19))
    const men = s.men
    const patterns = new Set<string>()
    for (let t = 0; t < 33; t++) {
      s = stepSim(s, HOLD)
      expect(s.gameOver, `seed 19 proved hostile: game over at tick ${t + 1} — pick another seed`).toBe(false)
      expect(s.men, `seed 19 proved hostile: a death at tick ${t + 1} — pick another seed`).toBe(men)
      const fb = composeFrame(parked(s, 'right'), LOGICAL_WIDTH, LOGICAL_HEIGHT)
      patterns.add(flamePattern(fb, [...STUB_RIGHT, ...EXT_RIGHT]))
    }
    expect(patterns.size, 'the exhaust never flickers — THTAB/THPROC animate it on the machine').toBeGreaterThan(1)
  })
})

// ─── AC5 (guard) — the flicker is DETERMINISTIC: seeded rand, never ambient entropy ───
describe('pt1-28 AC5 — same seed, same inputs → identical exhaust, frame for frame', () => {
  it('two identically-seeded held-thrust runs render byte-identical frames every tick', () => {
    // Green on arrival (the sim is already seed-deterministic); it stays as the guard
    // that GREEN's THTAB port draws its randomness from createSim's injected rand — the
    // df3 seam the purity sweep (tests/purity.test.ts) enforces — never Math.random,
    // which would flicker differently on every replay and break frame reproducibility.
    let a = createSim(makeRand(23))
    let b = createSim(makeRand(23))
    for (let t = 0; t < 12; t++) {
      a = stepSim(a, HOLD)
      b = stepSim(b, HOLD)
      expect(
        digest(composeFrame(parked(a, 'right'), LOGICAL_WIDTH, LOGICAL_HEIGHT)),
        `replay diverged at tick ${t + 1} — the exhaust is not deterministic under a fixed seed`,
      ).toBe(digest(composeFrame(parked(b, 'right'), LOGICAL_WIDTH, LOGICAL_HEIGHT)))
    }
  })

  it('recomposing the same state twice is byte-identical (composeFrame stays pure)', () => {
    const s = parked(run(29, HOLD, TICKS), 'right')
    expect(digest(composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT))).toBe(
      digest(composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)),
    )
  })
})
