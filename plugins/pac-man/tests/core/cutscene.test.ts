// tests/core/cutscene.test.ts
//
// Story pm6-2 (RED, TEA / Atia) — the scripted-actor CUTSCENE PLAYER + ACT 1,
// written BEFORE the code exists. Decision A: the coffee break is the pm6-1
// `intermission` PHASE; this story fills that phase with a pure, seeded,
// clock-free scripted-actor player and the iconic act-1 scene. Pure-first:
// nothing here reads a clock, DOM or RNG, so purity.test.ts must stay green.
//
// ─── DECISION C — EVERY CONSTANT RED-ANCHORED TO THE VENDORED SOURCE ──────────
//   Unlike pm6-1's cadence SET (which is honest-uncited — no contiguous ROM
//   table exists), act 1 turned out to be RICHLY citable. The cutscene is NOT a
//   frame-counted animation: it is a 7-sub-state machine (`4e06`) at ROM `2108`
//   that reuses the gameplay actor mover (called TWICE per frame = 2x speed) and
//   advances on TILE-POSITION THRESHOLDS, never on a frame clock. Each constant
//   below was decoded from the vendored `pacman.asm` AND independently re-checked
//   against the raw bytes (several "tables" are mis-decoded as instructions, so
//   each cite names the address whose byte carries the value):
//
//     Act-1 driver entry            pacman.asm:2108  `2108  3a064e  ld a,(#4e06)`
//     sub-state 0 → Pac col 0x21    pacman.asm:211d  `211d  d621    sub #21`
//     sub-state 1 → Pac col 0x1e    pacman.asm:2143  `2143  d61e    sub #1e`
//     sub-state 2 → Blinky col 0x1e pacman.asm:214e  `214e  d61e    sub #1e`
//     sub-state 4 → Blinky col 0x2f pacman.asm:2173  `2173  d62f    sub #2f`
//     sub-state 5 → Blinky col 0x3d pacman.asm:217e  `217e  d63d    sub #3d`
//     sub-state 6 → Pac col 0x3d    pacman.asm:218f  `218f  d63d    sub #3d`
//     Pac start col 0x1f            pacman.asm:266b  `266b  21321f  ld hl,#1f32`
//     Blinky start col 0x1e         pacman.asm:261e  `261e  21321e  ld hl,#1e32`
//     2x mover (steps/frame)        pacman.asm:2186  `2186  cd0618  call #1806` (x2, a count)
//     big-Pac from sub-state >= 5   pacman.asm:15e6  `15e6  3a064e  ld a,(#4e06)` / `sub #05`
//     Pac mouth cadence (8-cycle)   pacman.asm:168f  `168f  e607    and #07`  (4 images)
//     big-Pac mouth cadence (16)    pacman.asm:15ef  `15ef  e60f    and #0f`  (same 4, ½ rate)
//     ghost leg wiggle (8 frames)   pacman.asm:0e27  `0e27  3e08    ld a,#08` (counter #4dc4 cmp 8)
//     return-Blinky = BLUE frighten pacman.asm:1aa1  `1aa1  dd36021c ld (ix+#02),#1c`
//
// ─── STORY-TITLE CORRECTION (refuted by the ROM, recorded as a Design Deviation)
//   The pm6-2 TITLE says big-Pac chases a "ripped Blinky" back. The ROM refutes
//   that: in ACT 1 the chased-back Blinky is the BLUE FRIGHTENED sprite (image
//   #1c, set by the frighten-all routine `pacman.asm:1a70`/:1aa1). The RIPPED /
//   torn sheet (#32, then #33) is `pacman.asm:162d`, gated on `4e07` — the ACT 2
//   sub-state var, i.e. pm6-3's scene. The epic already assigns "ripped-ghost" to
//   act 2, so the ROM and the epic AGREE; only the story title conflated them.
//   These tests anchor to the ROM: act 1 = blue-frightened Blinky, never ripped.
//
// ─── SPEED / DURATION ARE HONEST-UNCITED (gated, never fabricated) ────────────
//   There is NO cutscene speed literal and NO total-frame counter in the source:
//   movement uses the level-dependent gameplay speed bit-patterns, ticked twice
//   per frame (the citable "2x" is the double `call #1806`). So the tests pin the
//   2x step count and the position THRESHOLDS (cited), and assert the arc is
//   monotonic and terminating — but never a fabricated per-frame pixel speed or a
//   total-length-in-frames constant. Same policy as game.ts's speed table.

import { describe, it, expect } from 'vitest'
import {
  createAct1Cutscene,
  stepCutscene,
  ACT1_PAC_START_COL,
  ACT1_BLINKY_START_COL,
  ACT1_THRESHOLDS,
  CUTSCENE_STEPS_PER_FRAME,
  BIG_PAC_FIRST_SUBSTATE,
  PAC_MOUTH_CYCLE_PX,
  BIG_PAC_MOUTH_CYCLE_PX,
  GHOST_WIGGLE_PERIOD_FRAMES,
  ACT1_SUBSTATE_COUNT,
  type CutsceneState,
} from '../../src/core/cutscene'
import { createGameState, stepGame, type GameState } from '../../src/core/game'
import { DOT_COUNT } from '../../src/core/maze'
import { loadClaims } from '../audit/dossier-sweep'

// A generous ceiling: the cutscene terminates on position (Pac reaching col
// 0x3d), not a clock, and at 2x gameplay speed it settles in a few hundred
// frames — 4000 is "it never terminates" territory, not a real bound.
const MAX_FRAMES = 4000

/** One observed frame of the cutscene — the fields the ACs constrain.
 *  `pacStep`/`blinkyStep` are the CITED movement-vector sign (+1 forward, -1 after
 *  the sub-state-2 reversal), NOT an invented screen 'left'/'right': the ROM works
 *  in a rotated frame and this repo declines to synthesise the screen transform
 *  (glossary.md; Decision C). The "across then back" arc IS the +1 → -1 reversal. */
interface Sample {
  substate: number
  pacCol: number
  blinkyCol: number
  pacStep: number
  blinkyStep: number
  bigPacActive: boolean
  blinkyFrightened: boolean
  pacFrame: number
  pacMoved: number
  blinkyFrame: number
  done: boolean
}

function sample(s: CutsceneState): Sample {
  return {
    substate: s.substate,
    pacCol: s.pac.col,
    blinkyCol: s.blinky.col,
    pacStep: s.pac.step,
    blinkyStep: s.blinky.step,
    bigPacActive: s.bigPacActive,
    blinkyFrightened: s.blinky.frightened,
    pacFrame: s.pac.frame,
    pacMoved: s.pac.moved,
    blinkyFrame: s.blinky.frame,
    done: s.done,
  }
}

/** Wrap-aware tile distance between two ROM tile bytes (0..255). The counter is
 *  the ROM's 8-bit `4d3a`/`4d32`, so `0xff → 0x00` is a ONE-unit step, not a jump. */
function tileDelta(a: number, b: number): number {
  const d = Math.abs(a - b) & 0xff
  return Math.min(d, 256 - d)
}

/** Drive a cutscene to completion, returning every frame's Sample (including
 *  the initial frame at index 0). Stops on `done` or the frame ceiling. */
function runToDone(seed = 1): Sample[] {
  const state = createAct1Cutscene(seed)
  const trace: Sample[] = [sample(state)]
  let frames = 0
  while (!state.done && frames < MAX_FRAMES) {
    stepCutscene(state)
    trace.push(sample(state))
    frames++
  }
  return trace
}

// ─────────────────────────────────────────────────────────────────────────────
// AC1 — a PURE, seeded, clock-free player; the same seed replays bit-for-bit.
// (purity.test.ts already sweeps src/core/cutscene.ts the moment it lands; these
// pin the OBSERVABLE determinism the AC names.)
// ─────────────────────────────────────────────────────────────────────────────
describe('pm6-2 AC1: the cutscene player is pure, seeded and deterministic', () => {
  it('createAct1Cutscene sets the act-1 opening tableau (Blinky chasing Pac, rightward)', () => {
    const s = createAct1Cutscene(1)
    expect(s.substate, 'act 1 opens in sub-state 0').toBe(0)
    expect(s.pac.col, 'Pac enters at the cited start column 0x1f').toBe(ACT1_PAC_START_COL)
    expect(s.blinky.col, 'Blinky enters one tile behind at 0x1e').toBe(ACT1_BLINKY_START_COL)
    expect(s.pac.step, 'both actors set off in the forward (+1) vector').toBe(1)
    expect(s.blinky.step, 'Blinky gives chase in the same forward vector').toBe(1)
    expect(s.blinky.col, 'Blinky trails Pac at the open').toBeLessThan(s.pac.col)
    expect(s.bigPacActive, 'no big-Pac at the open').toBe(false)
    expect(s.blinky.frightened, 'Blinky is not yet frightened at the open').toBe(false)
    expect(s.done).toBe(false)
  })

  it('the same seed replays the cutscene bit-for-bit', () => {
    expect(runToDone(1)).toEqual(runToDone(1))
  })

  it('the cutscene carries no entropy — different seeds produce the identical scripted scene', () => {
    // Act 1 is a fixed scripted animation: the seed is accepted for signature
    // symmetry with the rest of core, but the scene has no RNG to diverge on.
    expect(runToDone(1)).toEqual(runToDone(999))
  })

  it('the cutscene terminates on position, well within the frame ceiling', () => {
    const trace = runToDone(1)
    expect(trace[trace.length - 1].done, 'the scene reaches its done state').toBe(true)
    expect(trace.length, 'it does not run to the ceiling (i.e. it actually ends)').toBeLessThan(MAX_FRAMES)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC2 — act 1 plays: Blinky-chase then big-Pac-chase, actor paths/timing
// RED-anchored to the vendored source (the 7-sub-state machine at `2108`).
// ─────────────────────────────────────────────────────────────────────────────
describe('pm6-2 AC2: act 1 plays the ROM sub-state arc', () => {
  it('the machine advances monotonically through all seven sub-states 0..6', () => {
    const trace = runToDone(1)
    const seen = [...new Set(trace.map((f) => f.substate))]
    // every sub-state is visited, in order, none skipped
    expect(seen).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(ACT1_SUBSTATE_COUNT, 'the 7-word dispatch table at pacman.asm:210c').toBe(7)
    // sub-state never runs backwards
    for (let i = 1; i < trace.length; i++) {
      expect(trace[i].substate, `sub-state is non-decreasing at frame ${i}`).toBeGreaterThanOrEqual(
        trace[i - 1].substate,
      )
    }
  })

  it('sub-state 0 holds until Pac reaches the cited column 0x21, then advances', () => {
    // Pac walks in from 0x1f; the ROM waits `sub #21` on Pac's tile byte (211d).
    const state = createAct1Cutscene(1)
    let frames = 0
    while (state.substate === 0 && frames < MAX_FRAMES) {
      stepCutscene(state)
      frames++
    }
    expect(state.pac.col, 'the trigger column is the cited 0x21').toBeGreaterThanOrEqual(ACT1_THRESHOLDS.s0)
    expect(state.substate, 'crossing 0x21 advances the machine').toBeGreaterThan(0)
  })

  it('Blinky chases Pac in the FORWARD vector through the first leg (both step +1, Blinky trailing)', () => {
    const trace = runToDone(1)
    const chase = trace.filter((f) => f.substate <= 1)
    expect(chase.length).toBeGreaterThan(0)
    for (const f of chase) {
      expect(f.pacStep, 'Pac flees in the forward vector in the first leg').toBe(1)
      expect(f.blinkyStep, 'Blinky chases in the forward vector in the first leg').toBe(1)
    }
  })

  it('the RETURN leg is big-Pac chasing a BLUE-FRIGHTENED Blinky (reversed vector, NOT a ripped Blinky)', () => {
    const trace = runToDone(1)
    const ret = trace.filter((f) => f.bigPacActive)
    expect(ret.length, 'the big-Pac chase actually plays').toBeGreaterThan(0)
    for (const f of ret) {
      expect(f.pacStep, 'big-Pac chases in the reversed vector on the return').toBe(-1)
      expect(f.blinkyStep, 'Blinky flees in the reversed vector on the return').toBe(-1)
      expect(
        f.blinkyFrightened,
        'the chased-back Blinky is the blue frightened sprite (pacman.asm:1aa1 #1c), never the act-2 ripped sheet',
      ).toBe(true)
    }
  })

  it('big-Pac activates exactly at sub-state 5 and never before (pacman.asm:15e6 gate 4e06>=5)', () => {
    const trace = runToDone(1)
    for (const f of trace) {
      if (f.substate < BIG_PAC_FIRST_SUBSTATE) {
        expect(f.bigPacActive, `no big-Pac in sub-state ${f.substate}`).toBe(false)
      }
    }
    // and it IS active once the return leg starts
    expect(
      trace.some((f) => f.substate >= BIG_PAC_FIRST_SUBSTATE && f.bigPacActive),
      'big-Pac is on screen from sub-state 5',
    ).toBe(true)
  })

  it('the scene ends when Pac reaches the cited column 0x3d in sub-state 6', () => {
    const trace = runToDone(1)
    const last = trace[trace.length - 1]
    expect(last.done).toBe(true)
    expect(last.substate, 'termination is in the final sub-state').toBe(6)
    expect(last.pacCol, 'Pac has reached the cited end column 0x3d').toBeGreaterThanOrEqual(ACT1_THRESHOLDS.s6)
  })

  it('advances at 2 mover steps per frame (pacman.asm:2186 double `call #1806`)', () => {
    // The single citable speed fact is the DOUBLING; the per-step distance is the
    // level-dependent gameplay pattern (honest-uncited). Pin only the 2x.
    expect(CUTSCENE_STEPS_PER_FRAME).toBe(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC3 — every cutscene constant carries an exact value (a mutation reddens THIS)
// AND a citations.test.ts claim (RED until GREEN adds claims/cutscene.json). The
// byte-check in tests/audit/citations.test.ts independently re-opens each claim's
// verbatim against the vendored source, so a fabricated cite reddens there.
// ─────────────────────────────────────────────────────────────────────────────
describe('pm6-2 AC3: every constant is value-pinned (a mutation reddens an assertion)', () => {
  it('the start columns are the exact cited ROM tile bytes', () => {
    expect(ACT1_PAC_START_COL).toBe(0x1f) // pacman.asm:266b `ld hl,#1f32`
    expect(ACT1_BLINKY_START_COL).toBe(0x1e) // pacman.asm:261e `ld hl,#1e32`
  })

  it('the six sub-state thresholds are the exact cited `sub #NN` operands', () => {
    expect(ACT1_THRESHOLDS.s0).toBe(0x21) // pacman.asm:211d
    expect(ACT1_THRESHOLDS.s1).toBe(0x1e) // pacman.asm:2143
    expect(ACT1_THRESHOLDS.s2).toBe(0x1e) // pacman.asm:214e
    expect(ACT1_THRESHOLDS.s4).toBe(0x2f) // pacman.asm:2173
    expect(ACT1_THRESHOLDS.s5).toBe(0x3d) // pacman.asm:217e
    expect(ACT1_THRESHOLDS.s6).toBe(0x3d) // pacman.asm:218f
  })

  it('the animation-cadence and speed constants are the exact cited ROM values', () => {
    expect(CUTSCENE_STEPS_PER_FRAME).toBe(2) // double call #1806, pacman.asm:2186 (structural count)
    expect(BIG_PAC_FIRST_SUBSTATE).toBe(5) // sub #05 gate, pacman.asm:15e6
    expect(PAC_MOUTH_CYCLE_PX).toBe(8) // (4d09)&#07, pacman.asm:168f
    expect(BIG_PAC_MOUTH_CYCLE_PX).toBe(16) // (4d09)&#0f, pacman.asm:15ef
    expect(BIG_PAC_MOUTH_CYCLE_PX).toBe(2 * PAC_MOUTH_CYCLE_PX) // big-Pac chews at half Pac's rate
    expect(GHOST_WIGGLE_PERIOD_FRAMES).toBe(8) // #4dc4 cmp 8, pacman.asm:0e27
    expect(ACT1_SUBSTATE_COUNT).toBe(7) // 7-word table, pacman.asm:210c (structural length)
  })

  it('a citations.test.ts CLAIM anchors every cited cutscene constant to the ROM (Decision C)', () => {
    // Each address below is a `sub #NN` / `ld hl,#NNNN` / gate line decoded and
    // re-checked against the raw bytes. GREEN adds claims/cutscene.json covering
    // them; loadClaims() scans every claims/*.json, and citations.test.ts
    // byte-verifies each verbatim against pacman.asm. RED until those claims land.
    const REQUIRED_ADDRS = [
      '2108', // act-1 driver entry
      '211d', // sub-state 0 threshold 0x21
      '2143', // sub-state 1 threshold 0x1e
      '214e', // sub-state 2 threshold 0x1e
      '2173', // sub-state 4 threshold 0x2f
      '217e', // sub-state 5 threshold 0x3d
      '218f', // sub-state 6 threshold 0x3d
      '266b', // Pac start col 0x1f
      '261e', // Blinky start col 0x1e
      '15e6', // big-Pac gate (4e06 >= 5)
      '168f', // Pac mouth cadence (8-cycle, and #07)
      '15ef', // big-Pac mouth cadence (16-cycle, and #0f)
      '0e27', // ghost leg wiggle period (cmp 8)
      '1aa1', // return-Blinky = blue frightened (#1c)
    ]
    const addrs = new Set(loadClaims().map((c) => String(c.addr).toLowerCase()))
    const missing = REQUIRED_ADDRS.filter((a) => !addrs.has(a))
    expect(
      missing,
      `claims/cutscene.json must cover these cited ROM addresses (Decision C): ${missing.join(', ')}`,
    ).toEqual([])
  })

  it('the mouth cadence is a LIVE animation: 8-cycle small, 16-cycle big-Pac (a mutation reddens here)', () => {
    // AC3 "not a coverage check": observe the actual mouth image, not just the
    // constant. The image is floor((moved mod cycle)/(cycle/4)) with the CITED
    // cycle — 8 small, 16 (half the rate) once big-Pac is on. LITERAL cycles here
    // (not the imported constants) so mutating BIG_PAC_MOUTH_CYCLE_PX, or collapsing
    // the bigPacActive branch to a single cadence, reddens THIS assertion.
    const trace = runToDone(1)
    const IMAGES = 4
    let sawSmall = false
    let sawBig = false
    for (const f of trace) {
      const cycle = f.bigPacActive ? 16 : 8
      f.bigPacActive ? (sawBig = true) : (sawSmall = true)
      const expected = Math.floor((f.pacMoved % cycle) / (cycle / IMAGES))
      expect(f.pacFrame, `mouth image at moved=${f.pacMoved}, cycle ${cycle}`).toBe(expected)
    }
    expect(sawSmall && sawBig, 'both the 8-cycle and the 16-cycle big-Pac phase are exercised').toBe(true)
    expect(new Set(trace.map((f) => f.pacFrame)).size, 'the mouth actually cycles, not a frozen image').toBeGreaterThan(
      1,
    )
  })

  it('the leg wiggle flips on the cited 8-frame period (a mutation of the period reddens here)', () => {
    // AC3 "not a coverage check": observe the flip SPACING and assert it against the
    // LITERAL 8, so mutating GHOST_WIGGLE_PERIOD_FRAMES changes the observed spacing
    // and reddens. Small-area 2-frame toggle (Decision B), never a full-field flash.
    const frames = runToDone(1).map((f) => f.blinkyFrame)
    expect(new Set(frames), 'the legs actually wiggle (both toggle states appear)').toEqual(new Set([0, 1]))
    const flips: number[] = []
    for (let i = 1; i < frames.length; i++) if (frames[i] !== frames[i - 1]) flips.push(i)
    expect(flips.length, 'the wiggle flips several times across the scene').toBeGreaterThan(2)
    for (let j = 1; j < flips.length; j++) {
      expect(flips[j] - flips[j - 1], 'consecutive leg-flips are the cited 8 frames apart').toBe(8)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC4 — a GENTLE animation: NO >3 Hz large-area luminance strobe (Decision B,
// the standing Pac-Man accessibility ruling — the owner has photosensitive
// epilepsy). The pure player carries NO full-field flash signal; motion is
// smooth scrolling and the only animation is small-area per-actor sprite frames.
// ─────────────────────────────────────────────────────────────────────────────
describe('pm6-2 AC4: the cutscene is gentle — no large-area luminance strobe', () => {
  it('the player state exposes no full-field flash/invert signal (there is nothing to strobe)', () => {
    const s = createAct1Cutscene(1)
    for (const banned of ['flash', 'invert', 'strobe', 'blank', 'flashOn', 'fullFieldFlash']) {
      expect(banned in s, `a pure cutscene player must not carry a "${banned}" field`).toBe(false)
    }
  })

  it('actor motion is smooth — a column never jumps more than the 2x step per frame', () => {
    // Large-area luminance change comes from teleport/flash, not from a sprite
    // gliding a tile at a time. Pin (wrap-aware, since the tile byte is 8-bit)
    // that neither actor moves more than CUTSCENE_STEPS_PER_FRAME tiles in a frame.
    const trace = runToDone(1)
    for (let i = 1; i < trace.length; i++) {
      expect(
        tileDelta(trace[i].pacCol, trace[i - 1].pacCol),
        `Pac glides (<=${CUTSCENE_STEPS_PER_FRAME} tiles/frame) at frame ${i}`,
      ).toBeLessThanOrEqual(CUTSCENE_STEPS_PER_FRAME)
      expect(
        tileDelta(trace[i].blinkyCol, trace[i - 1].blinkyCol),
        `Blinky glides (<=${CUTSCENE_STEPS_PER_FRAME} tiles/frame) at frame ${i}`,
      ).toBeLessThanOrEqual(CUTSCENE_STEPS_PER_FRAME)
    }
  })

  it('the fastest scripted flip is the small-area leg wiggle (8-frame period), far below any strobe', () => {
    // The ghost leg wiggle flips every GHOST_WIGGLE_PERIOD_FRAMES frames; even
    // that small-area 2-pixel toggle is the fastest thing in the scene. It is a
    // few-pixel sprite detail, not a large-area luminance flash — but pin that no
    // per-FRAME (every-frame) large flip exists by requiring the wiggle period to
    // stay well above 1 (a period of 1 would be an every-frame toggle).
    expect(GHOST_WIGGLE_PERIOD_FRAMES).toBeGreaterThan(1)
    expect(PAC_MOUTH_CYCLE_PX).toBeGreaterThan(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION — the cutscene runs DURING the pm6-1 intermission phase (AC1
// "over the pm6-1 intermission phase"). The wiring is part of this story, not
// deferred: a round-2 clear must enter `intermission` with an act-1 cutscene
// present and advancing; a non-coffee-break round carries none.
// ─────────────────────────────────────────────────────────────────────────────
const DOT_COUNT_CAP = 4000

/** Force a phase without narrowing `s.phase` to a single literal at the call
 *  site — the pm6-1 / freeze-pauses precedent: a bare `s.phase = 'x'` makes tsc
 *  treat a later `.toBe('y')` as an impossible comparison and reddens
 *  `npm run lint` forever. */
function forcePhase(s: GameState, phase: GameState['phase']): void {
  s.phase = phase
}

/** A board already in `playing` at a chosen just-about-to-complete level. */
function playingAtLevel(seed: number, level: number): GameState {
  const state = createGameState(seed)
  forcePhase(state, 'playing')
  state.level = level
  return state
}

describe('pm6-2 integration: the act-1 cutscene plays inside the intermission phase', () => {
  it('a round-2 clear enters intermission carrying a live act-1 cutscene', () => {
    const state = playingAtLevel(3, 2) // round 2 → act 1 coffee break
    // eat every dot so the round clears (the game.test.ts idiom)
    state.dotsEaten = DOT_COUNT // "every dot eaten" — the game.test.ts idiom
    let frames = 0
    let sawCutscene = false
    while (frames < DOT_COUNT_CAP) {
      stepGame(state, { dir: 'none' })
      if (state.phase === 'intermission' && state.cutscene != null) sawCutscene = true
      if (state.level > 2 && state.phase === 'ready') break
      frames++
    }
    expect(sawCutscene, 'the intermission phase drives an act-1 cutscene').toBe(true)
    expect(state.phase, 'and the machine still settles back into the next round').toBe('ready')
  })

  it('a NON-coffee-break round (round 3) enters no cutscene at all', () => {
    const state = playingAtLevel(3, 3)
    state.dotsEaten = DOT_COUNT // "every dot eaten" — the game.test.ts idiom
    let frames = 0
    while (frames < DOT_COUNT_CAP) {
      stepGame(state, { dir: 'none' })
      expect(state.cutscene, 'round 3 shows no coffee break, so never a cutscene').toBeNull()
      if (state.level > 3 && state.phase === 'ready') break
      frames++
    }
  })

  it('a coffee-break round with no scripted cutscene (act 2/3, pm6-3) HOLDS on the frame-count fallback, then advances', () => {
    // Only round 2 (INTERMISSION_LEVELS[0]) plays act 1; the other coffee-break
    // rounds (5/9/13/17 — act 2/3, pm6-3) enter intermission with cutscene=null and
    // end on the INTERMISSION_HOLD_FRAMES frame-count fallback. Drive the
    // intermission handler DIRECTLY (the playing→level-clear→intermission path is
    // covered by the round-2 test above): forcing the phase keeps this focused on
    // the fallback arm and off the pre-existing level-5+ Elroy2 speed defect that
    // full gameplay would trip (speedPattern rejects the ROM's 105% Cruise-Elroy-2 —
    // see Delivery Findings, out of pm6-2 scope). Mutating the fallback to a bare
    // `true` (expire after one frame) makes the hold vanish, so `heldPastFirstFrame`
    // never latches and this reddens. Decoupled from the exact 300 (honest-uncited).
    const state = createGameState(3)
    forcePhase(state, 'intermission')
    state.cutscene = null
    state.freezeFrames = 0
    let frames = 0
    let heldPastFirstFrame = false
    while (state.phase === 'intermission' && frames < DOT_COUNT_CAP) {
      stepGame(state, { dir: 'none' })
      if (state.phase === 'intermission' && state.freezeFrames > 1) heldPastFirstFrame = true
      frames++
    }
    expect(state.cutscene, 'a no-cutscene coffee break never spawns one').toBeNull()
    expect(heldPastFirstFrame, 'the no-cutscene intermission held on the frame-count fallback').toBe(true)
    expect(state.phase, 'and the machine settles back into the next round').toBe('ready')
  })
})
