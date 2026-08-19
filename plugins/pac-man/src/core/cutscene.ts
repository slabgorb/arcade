// src/core/cutscene.ts
//
// Story pm6-2 (GREEN, Dev / Lucius Vorenus) — the scripted-actor CUTSCENE PLAYER
// + ACT 1, the first coffee-break intermission. A PURE, seeded, clock-free state
// machine that drives the act-1 actors during the pm6-1 `intermission` phase. No
// clock, DOM, RNG or shell import — purity.test.ts sweeps this file.
//
// ─── DECISION C — RED-ANCHORED, NOTHING FABRICATED ───────────────────────────
//   Act 1 is NOT a frame-counted animation. In the ROM it is a 7-sub-state
//   machine (state byte `4e06`) dispatched at `pacman.asm:2108` that reuses the
//   gameplay actor mover (called TWICE per frame = 2x speed) and advances on
//   TILE-POSITION THRESHOLDS, never on a frame clock. Every POSITION / THRESHOLD /
//   MASK constant below is byte-cited to the vendored `pacman.asm` and re-verified
//   against the raw bytes — a `claims/cutscene.json` entry re-opens each verbatim,
//   and citations.test.ts fails on drift. The two STRUCTURAL counts (steps-per-
//   frame is a call-count, the sub-state count is a table length) are NOT byte
//   literals, so they are honest-uncited, gated on the cited structure — see the
//   HONEST-UNCITED note below. Which is which:
//
//     driver entry / 7-word dispatch  pacman.asm:2108 / :210c  (count = table len)
//     sub 0 → Pac tile == 0x21        pacman.asm:211d  `sub #21`
//     sub 1 → Pac tile == 0x1e        pacman.asm:2143  `sub #1e`
//     sub 2 → Blinky tile == 0x1e     pacman.asm:214e  `sub #1e`
//     sub 4 → Blinky tile == 0x2f     pacman.asm:2173  `sub #2f`
//     sub 5 → Blinky tile == 0x3d     pacman.asm:217e  `sub #3d`
//     sub 6 → Pac tile == 0x3d        pacman.asm:218f  `sub #3d`
//     Pac start tile 0x1f             pacman.asm:266b  `ld hl,#1f32`
//     Blinky start tile 0x1e          pacman.asm:261e  `ld hl,#1e32`
//     2x mover (steps/frame)          pacman.asm:2186  `call #1806` (x2 — a count)
//     dir vector +1 (fwd) / -1 (rev)  pacman.asm:3303 `00 01` / reversal 05ae `4d3c = 4d30 ^ 2` (port's ±1 sign — honest-uncited, no byte-claim)
//     frighten (return Blinky = blue) pacman.asm:1a70 / :1aa1 `ld (ix+#02),#1c`
//     big-Pac from sub-state >= 5     pacman.asm:15e6  `ld a,(#4e06)` / `sub #05`
//     Pac mouth cadence (8px cycle)   pacman.asm:168f  `and #07`  (4-image cycle)
//     big-Pac mouth cadence (16px)    pacman.asm:15ef  `and #0f`  (same 4 images, ½ rate)
//     ghost leg wiggle (8-frame flip) pacman.asm:0e27  `ld a,#08` (counter #4dc4 cmp 8)
//
// ─── STORY-TITLE CORRECTION (ROM refutes it — see the session Design Deviations)
//   The story TITLE says the return leg chases a "ripped Blinky." The ROM refutes
//   that: act 1's chased-back ghost is the BLUE FRIGHTENED sprite (image #1c,
//   `pacman.asm:1a70`/`:1aa1`). The RIPPED sheet (#32/#33, `pacman.asm:162d`,
//   gated on the ACT-2 var `4e07`) is pm6-3's act-2 scene. This player models the
//   blue-frightened Blinky (`blinky.frightened`), never a ripped sprite.
//
// ─── HONEST-UNCITED (gated on cited facts, never a fabricated address) ────────
//   • SPEED VALUE. The ROM has no cutscene speed literal — movement uses the
//     level-dependent gameplay bit-patterns, ticked twice per frame. The one
//     citable fact is the DOUBLING (CUTSCENE_STEPS_PER_FRAME = 2). This player
//     advances one tile-unit per mover-step (a gentle, deterministic realisation
//     of the 2x cite); the per-step distance is NOT a ROM constant.
//   • SCREEN DIRECTION. The ROM works in a rotated frame and this repo declines
//     to invent the rotated→screen transform (glossary.md). So an actor carries a
//     movement-vector SIGN `step` (+1 fwd / -1 reversed), never an invented screen
//     'left'/'right'. The "across then back" arc IS the +1 -> -1 reversal the ROM
//     performs at the sub-state-2 boundary (the direction-flip at `pacman.asm:05ae`
//     `4d3c = 4d30 ^ 2`). Like the structural counts, the ±1 SIGN is this port's
//     representation of that flip — traced to the ROM, but NOT carried by its own
//     byte-claim (no `3303`/`05ae` entry in claims/cutscene.json); honest-uncited.
//   • STRUCTURAL COUNTS. CUTSCENE_STEPS_PER_FRAME (2) is the NUMBER of `call #1806`
//     the driver makes per frame, and ACT1_SUBSTATE_COUNT (7) is the LENGTH of the
//     dispatch table at `210c` — both are structure, not byte literals, so neither
//     carries a byte-claim; they are gated on the cited driver/table addresses.
//   • The tile counter is the ROM's 8-bit byte `4d3a`/`4d32` and WRAPS mod 256.
//     This port keeps a single forward step-sign across sub-states 0→1, so the
//     0x21→0x1e gap closes by that wrap. No cited `sub #NN` address SHOWS a wrap or
//     reset (contrast the leg-wiggle counter at `0e27`, which has an explicit
//     `cp #08` / `ld (hl),#00`) — the wrap is THIS PORT's step-sign realisation,
//     inferred, not a directly-cited ROM mechanism. Motion is one tile-unit per
//     step: never a jump.

/** Pac's cutscene start tile (the high byte of `#1f32`, `pacman.asm:266b`). */
export const ACT1_PAC_START_COL = 0x1f
/** Blinky's cutscene start tile (the high byte of `#1e32`, `pacman.asm:261e`). */
export const ACT1_BLINKY_START_COL = 0x1e

/** The six sub-state advance thresholds — the `sub #NN` operand each driver tests
 *  against a tile byte. Sub-state 3 has NO position gate (a timed freeze beat).
 *  s0/s1/s6 gate on Pac's tile `4d3a`; s2/s4/s5 gate on Blinky's tile `4d32`. */
export const ACT1_THRESHOLDS = {
  s0: 0x21, // pacman.asm:211d
  s1: 0x1e, // pacman.asm:2143
  s2: 0x1e, // pacman.asm:214e
  s4: 0x2f, // pacman.asm:2173
  s5: 0x3d, // pacman.asm:217e
  s6: 0x3d, // pacman.asm:218f
} as const

/** The ROM ticks the actor mover TWICE per cutscene frame (the double `call
 *  #1806`, `pacman.asm:2186`) — a 2x speed. STRUCTURAL: this is the COUNT of mover
 *  calls, not a byte literal, so it is honest-uncited (see the header); the
 *  per-step DISTANCE is likewise not a ROM constant. */
export const CUTSCENE_STEPS_PER_FRAME = 2

/** big-Pac is on screen from sub-state 5 onward (`pacman.asm:15e6` gate `4e06 >= 5`). */
export const BIG_PAC_FIRST_SUBSTATE = 5

/** Pac's normal mouth cadence: 4 images across an 8-value pixel cycle — the mask
 *  `and #07` gives an 8-long cycle, split into 4 images by the thresholds 2/4/6
 *  (`pacman.asm:168f`/`:1691`..`:16a7`). Byte-cited to the `and #07` mask. */
export const PAC_MOUTH_CYCLE_PX = 8
/** big-Pac's mouth cadence: the SAME 4 images across a 16-value cycle — the mask
 *  `and #0f` (`pacman.asm:15ef`), split by thresholds 4/8/c (`:15f1`..`:1601`).
 *  Half the rate of Pac's 8-cycle; drives the `bigPacActive` branch in updateFrames. */
export const BIG_PAC_MOUTH_CYCLE_PX = 16
/** The ghost leg wiggle toggles every 8 frames — the counter `#4dc4` is compared
 *  to 8 and reset (`pacman.asm:0e27` `ld a,#08`, `:0e29` `cp (hl)`, `:0e2b` reset). */
export const GHOST_WIGGLE_PERIOD_FRAMES = 8

/** The act-1 driver dispatches on a 7-word sub-state table (`pacman.asm:210c`).
 *  STRUCTURAL: 7 is the table LENGTH, not a byte literal — honest-uncited. */
export const ACT1_SUBSTATE_COUNT = 7

/** Both mouth cadences draw 4 images per cycle (Pac's #2a/#2c/#2e/#30 at the 2/4/6
 *  thresholds; big-Pac's 4 `d`-bands at 4/8/c). Only the cycle LENGTH differs. */
const MOUTH_IMAGE_COUNT = 4

/** How long the sub-state-3 freeze beat holds, in frames. The ROM waits 5 class-1
 *  timer ticks (`rst #30 45 07 00` at `pacman.asm:2169`); as a wall-clock time
 *  that is honest-uncited (the tick→seconds factor is the 60.6 Hz VBLANK, not in
 *  the asm), so this is a gentle gated hold, not a fabricated frame literal. */
const FREEZE_BEAT_FRAMES = 30

/** One cutscene actor. `col` is the ROM tile byte (`4d3a`/`4d32`), 0..255, wrapping.
 *  `step` is the movement-vector sign (+1 forward / -1 after the sub-state-2
 *  reversal) — NOT a screen direction, and honest-uncited: it is this port's
 *  representation of the ROM's direction-flip, not a byte-claimed value (see the
 *  header's SCREEN DIRECTION note). `frame` is the sprite
 *  animation phase the shell renders. `frightened` marks the blue frightened sprite. */
export interface CutsceneActor {
  col: number
  step: 1 | -1
  frame: number
  frightened: boolean
  /** Total mover-steps this actor has taken — drives the mouth phase. */
  moved: number
}

/** The pure act-1 cutscene state. Carries no clock, no DOM handle and — Decision B
 *  — NO full-field flash/strobe signal: the only animation is small-area per-actor
 *  sprite frames and gliding position. */
export interface CutsceneState {
  substate: number
  frame: number
  pac: CutsceneActor
  blinky: CutsceneActor
  bigPacActive: boolean
  done: boolean
  /** Frames elapsed in the current sub-state (drives the sub-state-3 freeze beat). */
  beatFrames: number
}

/** Per-sub-state script: which actors the mover advances, and the tile-threshold
 *  that ends the sub-state (sub-state 3 is a timed beat with no position gate). */
interface SubstateSpec {
  moves: readonly ('pac' | 'blinky')[]
  gate?: { actor: 'pac' | 'blinky'; col: number }
  hold?: number
}

const ACT1_SCRIPT: readonly SubstateSpec[] = [
  { moves: ['pac'], gate: { actor: 'pac', col: ACT1_THRESHOLDS.s0 } }, // 0: Pac walks in, Blinky frozen
  { moves: ['pac', 'blinky'], gate: { actor: 'pac', col: ACT1_THRESHOLDS.s1 } }, // 1: the chase, both move
  { moves: ['blinky'], gate: { actor: 'blinky', col: ACT1_THRESHOLDS.s2 } }, // 2: Blinky alone → frighten+reverse
  { moves: [], hold: FREEZE_BEAT_FRAMES }, // 3: the freeze beat
  { moves: ['blinky'], gate: { actor: 'blinky', col: ACT1_THRESHOLDS.s4 } }, // 4: frightened Blinky flees
  { moves: ['pac', 'blinky'], gate: { actor: 'blinky', col: ACT1_THRESHOLDS.s5 } }, // 5: big-Pac chases
  { moves: ['pac'], gate: { actor: 'pac', col: ACT1_THRESHOLDS.s6 } }, // 6: big-Pac closes → done
]

function actor(col: number): CutsceneActor {
  return { col, step: 1, frame: 0, frightened: false, moved: 0 }
}

/** Build the act-1 opening tableau: Pac ahead of a chasing Blinky, both moving
 *  forward (`step` +1), in sub-state 0. `seed` is accepted for signature symmetry
 *  with the rest of core — act 1 is a fixed scripted scene with no entropy. */
export function createAct1Cutscene(_seed: number): CutsceneState {
  return {
    substate: 0,
    frame: 0,
    pac: actor(ACT1_PAC_START_COL),
    blinky: actor(ACT1_BLINKY_START_COL),
    bigPacActive: false,
    done: false,
    beatFrames: 0,
  }
}

/** Advance out of the current sub-state's gate. Fires the sub-state-2 boundary
 *  effects (frighten Blinky, reverse both actors — `pacman.asm:1a70` + `05a5`),
 *  arms big-Pac from sub-state 5 (`pacman.asm:15e6`), and ends the scene when the
 *  final sub-state 6 gate is reached (Pac at 0x3d, `pacman.asm:218f`). */
function advance(s: CutsceneState): void {
  if (s.substate >= ACT1_SUBSTATE_COUNT - 1) {
    s.done = true // sub-state 6 gate reached: stay at 6, mark done
    return
  }
  const from = s.substate
  s.substate += 1
  s.beatFrames = 0
  if (from === 2) {
    // the return leg: frighten Blinky (blue #1c) and reverse both actors' vectors
    s.blinky.frightened = true
    s.pac.step = s.pac.step === 1 ? -1 : 1
    s.blinky.step = s.blinky.step === 1 ? -1 : 1
  }
  s.bigPacActive = s.substate >= BIG_PAC_FIRST_SUBSTATE
}

/** Which mouth image (0..MOUTH_IMAGE_COUNT-1) an actor shows after `moved` units
 *  of travel, for a cadence whose cycle is `cyclePx` long. `floor((moved mod
 *  cyclePx) / (cyclePx / 4))` reproduces the ROM's threshold bands — 2/4/6 for the
 *  8-cycle (`pacman.asm:1691`..`:16a7`), 4/8/c for the 16-cycle (`:15f1`..`:1601`). */
function mouthImage(moved: number, cyclePx: number): number {
  return Math.floor((moved % cyclePx) / (cyclePx / MOUTH_IMAGE_COUNT))
}

function updateFrames(s: CutsceneState): void {
  // mouth: big-Pac chews over its cited 16-cycle — HALF the rate of small Pac's
  // 8-cycle — so the `bigPacActive` branch genuinely changes the cadence.
  const cyclePx = s.bigPacActive ? BIG_PAC_MOUTH_CYCLE_PX : PAC_MOUTH_CYCLE_PX
  s.pac.frame = mouthImage(s.pac.moved, cyclePx)
  // ghost leg wiggle: a small-area 2-frame toggle every GHOST_WIGGLE_PERIOD_FRAMES
  // frames (Decision B — small-area, not a large luminance strobe).
  s.blinky.frame = Math.floor(s.frame / GHOST_WIGGLE_PERIOD_FRAMES) % 2
}

/** Advance the cutscene one frame (mutates in place, the `stepGame` idiom). Runs
 *  the mover CUTSCENE_STEPS_PER_FRAME times (the ROM's 2x), moving each active
 *  actor one tile-unit per step (wrapping mod 256) and checking the sub-state gate
 *  after each step — matching the ROM's per-mover threshold test. */
export function stepCutscene(s: CutsceneState): void {
  if (s.done) return
  const spec = ACT1_SCRIPT[s.substate]
  if (spec.hold != null) {
    // the freeze beat: no motion, hold then advance
    s.beatFrames += 1
    if (s.beatFrames >= spec.hold) advance(s)
  } else {
    for (let i = 0; i < CUTSCENE_STEPS_PER_FRAME && !s.done; i++) {
      for (const who of spec.moves) {
        const a = s[who]
        a.col = (a.col + a.step + 256) & 0xff
        a.moved += 1
      }
      if (spec.gate && s[spec.gate.actor].col === spec.gate.col) {
        advance(s)
        break
      }
    }
  }
  updateFrames(s)
  s.frame += 1
}
