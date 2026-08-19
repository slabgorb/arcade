// tests/core/cutscene-act2-act3.test.ts
//
// Story pm6-3 (RED, TEA / O'Brien) — ACT 2 (ripped-ghost / "nail") and ACT 3
// (worm / tearing-ghost), the second and third coffee-break intermissions,
// written BEFORE the code exists. Both are new SCRIPTED TIMELINES layered on the
// pm6-2 scripted-actor player (src/core/cutscene.ts) — same file surface, same
// pure/seeded/clock-free contract (purity.test.ts must stay green), distinct
// arcs. No new framework, no new sprite bake (pm3 already baked all 64 sprites).
//
// ─── DECISION C — EVERY CONSTANT RED-ANCHORED TO THE VENDORED SOURCE ──────────
//   Like act 1, acts 2 & 3 are NOT frame-counted animations: each is a driver
//   dispatching on its own cutscene sub-state byte and advancing on TILE-POSITION
//   THRESHOLDS. The three drivers are siblings:
//     act 1  state #4e06  driver #2108  (pm6-2)
//     act 2  state #4e07  driver #219e  (this story)
//     act 3  state #4e08  driver #2297  (this story)
//   Each POSITION threshold below is the `sub #NN` operand the driver tests
//   against a tile byte (#4d3a = Pac, #4d32 = Blinky/worm), decoded from the
//   vendored `pacman.asm` AND re-checked against the raw bytes. Each cite names
//   the address whose byte CARRIES the value (the `sub #NN`, never the adjacent
//   load — the 168f/15e9 discipline), so a drift in the operand reddens:
//
//     Act-2 driver entry            pacman.asm:219e  `219e  3a074e    ld a,(#4e07)`  (line 4711)
//     Act-2 Pac snag col 0x2c       pacman.asm:21e4  `21e4  d62c      sub #2c`       (line 4743)
//     Act-2 ripped-sheet gate       pacman.asm:162d  `162d  3a074e    ld a,(#4e07)`  (line 3223)
//         (the torn sheet is sprite #32 then #33 — pacman.asm:1642/#164d — CONSUMED
//          from pm3's baked SPRITES atlas; a render fact, not a new core constant)
//     Act-3 driver entry            pacman.asm:2297  `2297  3a084e    ld a,(#4e08)`  (line 4821)
//     Act-3 Pac col 0x25            pacman.asm:22aa  `22aa  d625      sub #25`       (line 4830)
//     Act-3 worm col A 0x2d         pacman.asm:22e0  `22e0  d62d      sub #2d`       (line 4857)
//     Act-3 worm col B 0x1e         pacman.asm:22f8  `22f8  d61e      sub #1e`       (line 4866)
//
// ─── SHARED START TABLEAU (consumed, not re-cited) ───────────────────────────
//   The coffee-break actor-layout routine #260f is SHARED across all three acts:
//   it seeds Pac's tile #4d3a = #1f (#266b) and Blinky's #4d32 = #1e (#261e) for
//   EVERY break — there is no per-act start column. So acts 2 & 3 open at the same
//   tableau pm6-2 already cited (ACT1_PAC_START_COL / ACT1_BLINKY_START_COL); these
//   tests CONSUME those constants rather than minting new (uncitable) ones.
//
// ─── ACT→LEVEL CADENCE (honest-uncited, gated on the ROM level byte) ──────────
//   act 1 after round 2, act 2 after round 5, act 3 after rounds 9/13/17 — the
//   documented Pac-Man Dossier order (INTERMISSION_LEVELS = [2,5,9,13,17],
//   intermission.ts). Like pm6-1's SET it is NOT a contiguous ROM table, so the
//   act→level MAP is honest-uncited, gated on the cited level byte #4e13 — never a
//   fabricated address. A test PINS the map (AC3).
//
// ─── SPEED / DURATION HONEST-UNCITED (same policy as pm6-2) ───────────────────
//   There is no cutscene speed literal and no total-frame counter; motion is the
//   2x mover (CUTSCENE_STEPS_PER_FRAME). The tear/worm sprite-swap timeline runs
//   off the ROM's #4d01 object counter, whose tick→frame factor is not in the asm
//   — so, like pm6-2's FREEZE_BEAT_FRAMES, any tear-hold duration is a gentle
//   gated hold, never a fabricated frame literal. These tests pin POSITION
//   thresholds + determinism + termination, never a per-frame pixel speed.

import { describe, it, expect } from 'vitest'
import {
  createAct1Cutscene,
  createAct2Cutscene,
  createAct3Cutscene,
  createCutsceneForLevel,
  cutsceneActForLevel,
  stepCutscene,
  ACT1_PAC_START_COL,
  ACT1_BLINKY_START_COL,
  ACT2_PAC_SNAG_COL,
  ACT3_PAC_COL,
  ACT3_WORM_COL_A,
  ACT3_WORM_COL_B,
  CUTSCENE_STEPS_PER_FRAME,
  type CutsceneState,
} from '../../src/core/cutscene'
import { INTERMISSION_LEVELS } from '../../src/core/intermission'
import { createGameState, stepGame, type GameState } from '../../src/core/game'
import { SPRITES } from '../../src/shell/sprite-data'
import { loadClaims } from '../audit/dossier-sweep'

// A generous ceiling: each scene terminates on position (a tile threshold), not a
// clock, and at 2x mover speed settles in a few hundred frames — 4000 is "it never
// terminates" territory, not a real bound.
const MAX_FRAMES = 4000

interface Sample {
  act: number
  substate: number
  pacCol: number
  blinkyCol: number
  bigPacActive: boolean
  blinkyFrightened: boolean
  blinkyRipped: boolean
  done: boolean
}

function sample(s: CutsceneState): Sample {
  return {
    act: s.act,
    substate: s.substate,
    pacCol: s.pac.col,
    blinkyCol: s.blinky.col,
    bigPacActive: s.bigPacActive,
    blinkyFrightened: s.blinky.frightened,
    blinkyRipped: s.blinky.ripped,
    done: s.done,
  }
}

/** Wrap-aware tile distance between two ROM tile bytes (0..255) — the counter is
 *  the ROM's 8-bit #4d3a/#4d32, so 0xff→0x00 is a ONE-unit step, not a jump. */
function tileDelta(a: number, b: number): number {
  const d = Math.abs(a - b) & 0xff
  return Math.min(d, 256 - d)
}

/** Drive a scene to completion, returning every frame's Sample (index 0 = open). */
function runToDone(create: (seed: number) => CutsceneState, seed = 1): Sample[] {
  const state = create(seed)
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
// AC1 — act 2 & act 3 PLAY on the pm6-2 player: pure, seeded, clock-free, each
// replays bit-for-bit under seed. (purity.test.ts sweeps src/core/cutscene.ts the
// moment the new code lands; these pin the OBSERVABLE determinism the AC names.)
// ─────────────────────────────────────────────────────────────────────────────
describe('pm6-3 AC1: acts 2 & 3 are pure, seeded, deterministic scenes on the shared player', () => {
  it('act 2 opens on the SHARED start tableau (Pac 0x1f ahead of Blinky 0x1e, forward)', () => {
    const s = createAct2Cutscene(1)
    expect(s.act, 'the state carries its act number for the shell to render').toBe(2)
    expect(s.substate, 'act 2 opens in sub-state 0').toBe(0)
    expect(s.pac.col, 'Pac enters at the shared cutscene start column 0x1f (#266b)').toBe(ACT1_PAC_START_COL)
    expect(s.blinky.col, 'Blinky enters one tile behind at 0x1e (#261e)').toBe(ACT1_BLINKY_START_COL)
    expect(s.blinky.ripped, "Blinky's sheet is intact at the open — the nail hasn't caught it yet").toBe(false)
    expect(s.done).toBe(false)
  })

  it('act 3 opens on the SHARED start tableau and carries act number 3', () => {
    const s = createAct3Cutscene(1)
    expect(s.act).toBe(3)
    expect(s.substate).toBe(0)
    expect(s.pac.col).toBe(ACT1_PAC_START_COL)
    expect(s.blinky.col).toBe(ACT1_BLINKY_START_COL)
    expect(s.done).toBe(false)
  })

  it('each scene replays the SAME seed bit-for-bit', () => {
    expect(runToDone(createAct2Cutscene, 1)).toEqual(runToDone(createAct2Cutscene, 1))
    expect(runToDone(createAct3Cutscene, 1)).toEqual(runToDone(createAct3Cutscene, 1))
  })

  it('neither scene carries entropy — different seeds produce the identical scripted scene', () => {
    expect(runToDone(createAct2Cutscene, 1)).toEqual(runToDone(createAct2Cutscene, 999))
    expect(runToDone(createAct3Cutscene, 1)).toEqual(runToDone(createAct3Cutscene, 999))
  })

  it('each scene TERMINATES on position, well within the frame ceiling (never runs to the cap)', () => {
    for (const create of [createAct2Cutscene, createAct3Cutscene]) {
      const trace = runToDone(create, 1)
      expect(trace[trace.length - 1].done, 'the scene reaches its done state').toBe(true)
      expect(trace.length, 'it actually ends (does not hit the ceiling)').toBeLessThan(MAX_FRAMES)
    }
  })

  it('act 2 and act 3 are DISTINCT scenes (a shared player must not collapse them to one arc)', () => {
    expect(runToDone(createAct2Cutscene, 1)).not.toEqual(runToDone(createAct3Cutscene, 1))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC2 — actor paths/timing RED-anchored to the vendored source; the ripped/worm
// sprites are pm3 BAKED graphics (CONSUMED, no new bake). The sub-state machine
// advances forward through its cited position gates and terminates.
// ─────────────────────────────────────────────────────────────────────────────
describe('pm6-3 AC2: the arcs play the ROM sub-state machines (positions cited)', () => {
  it('act 2 advances its sub-states monotonically to done (never runs backwards)', () => {
    const trace = runToDone(createAct2Cutscene, 1)
    for (let i = 1; i < trace.length; i++) {
      expect(trace[i].substate, `act-2 sub-state is non-decreasing at frame ${i}`).toBeGreaterThanOrEqual(
        trace[i - 1].substate,
      )
    }
    expect(new Set(trace.map((f) => f.substate)).size, 'act 2 is a multi-beat arc, not a single frozen state').toBeGreaterThan(1)
  })

  it('act 3 advances its sub-states monotonically to done (never runs backwards)', () => {
    const trace = runToDone(createAct3Cutscene, 1)
    for (let i = 1; i < trace.length; i++) {
      expect(trace[i].substate, `act-3 sub-state is non-decreasing at frame ${i}`).toBeGreaterThanOrEqual(
        trace[i - 1].substate,
      )
    }
    expect(new Set(trace.map((f) => f.substate)).size, 'act 3 is a multi-beat arc').toBeGreaterThan(1)
  })

  it('act 2 RIPS the sheet: Blinky becomes ripped only once Pac reaches the cited snag column 0x2c', () => {
    // The single POSITION beat of act 2 is the nail snag — the ROM tests Pac's tile
    // #4d3a against `sub #2c` (#21e4). Model: the sheet catches (blinky.ripped) at /
    // after that column, never before. Mutating ACT2_PAC_SNAG_COL moves the flip
    // point, so this reddens.
    const state = createAct2Cutscene(1)
    let frames = 0
    let rippedAtCol: number | null = null
    let sawRipped = false
    while (!state.done && frames < MAX_FRAMES) {
      const wasRipped = state.blinky.ripped
      stepCutscene(state)
      if (!wasRipped && state.blinky.ripped) rippedAtCol = state.pac.col
      if (state.blinky.ripped) sawRipped = true
      frames++
    }
    expect(sawRipped, "act 2's whole point is the sheet tearing — Blinky must end ripped").toBe(true)
    expect(state.blinky.ripped, 'the ripped state persists to the end of the scene').toBe(true)
    expect(rippedAtCol, 'the sheet catches at/after the cited snag column, never before').not.toBeNull()
    expect(tileDelta(rippedAtCol as number, ACT2_PAC_SNAG_COL)).toBeLessThanOrEqual(CUTSCENE_STEPS_PER_FRAME)
  })

  it('act 3 fires each transition AT its cited gate column (drift-green guard: script wiring must match the constant)', () => {
    // The act-2 "rips at col" test above wires ACT2_PAC_SNAG_COL to observed
    // behaviour; act 3 needs the same, else its three thresholds are only
    // value-pinned and ACT3_SCRIPT could be wired to unrelated columns with the
    // suite still green (the AC3 drift-green gap). Observe the actual column at each
    // sub-state transition and assert it equals the CITED constant — so hard-coding
    // a wrong column into ACT3_SCRIPT (while leaving the exported constant) reddens.
    const state = createAct3Cutscene(1)
    let frames = 0
    let pacColAt01: number | null = null
    let wormColAt12: number | null = null
    while (!state.done && frames < MAX_FRAMES) {
      const prev = state.substate
      stepCutscene(state)
      if (prev === 0 && state.substate === 1) pacColAt01 = state.pac.col
      if (prev === 1 && state.substate === 2) wormColAt12 = state.blinky.col
      frames++
    }
    expect(pacColAt01, 'sub-state 0→1 fires when Pac reaches the cited run-in column 0x25').not.toBeNull()
    expect(tileDelta(pacColAt01 as number, ACT3_PAC_COL), 's0→s1 is at ACT3_PAC_COL').toBeLessThanOrEqual(
      CUTSCENE_STEPS_PER_FRAME,
    )
    expect(wormColAt12, 'sub-state 1→2 fires when the worm reaches the cited column 0x2d').not.toBeNull()
    expect(tileDelta(wormColAt12 as number, ACT3_WORM_COL_A), 's1→s2 is at ACT3_WORM_COL_A').toBeLessThanOrEqual(
      CUTSCENE_STEPS_PER_FRAME,
    )
    expect(state.done, 'the scene terminates').toBe(true)
    expect(tileDelta(state.blinky.col, ACT3_WORM_COL_B), 'the worm ends at the cited column 0x1e').toBeLessThanOrEqual(
      CUTSCENE_STEPS_PER_FRAME,
    )
  })

  it('act 2 is the ripped scene, NOT the blue-frightened one (that is act 1 — the ROM refutes the title conflation)', () => {
    // pm6-2 recorded the ROM correction: act 1's chased-back ghost is the BLUE
    // frightened sprite (#1c, #1aa1); the RIPPED sheet (#32/#33, #162d, gated on the
    // act-2 var #4e07) is THIS story. So act 2 goes ripped and is never the big-Pac
    // frightened-chase; act 1 goes frightened and is never ripped.
    const act2 = runToDone(createAct2Cutscene, 1)
    expect(act2.some((f) => f.blinkyRipped), 'act 2 rips the sheet').toBe(true)
    expect(act2.every((f) => !f.bigPacActive), 'act 2 has no big-Pac return leg (that is act 1)').toBe(true)
    const act1 = runToDone(createAct1Cutscene, 1)
    expect(act1.every((f) => !f.blinkyRipped), 'act 1 never rips — it frightens (blue #1c)').toBe(true)
  })

  it('PRECONDITION: the ripped/worm sprite tiles a later shell story (pm6-5) will draw already exist in pm3’s atlas', () => {
    // NOT a behavioural test of pm6-3 (nothing in this story's diff reads SPRITES or
    // wires blinky.ripped to a sprite — the cutscene RENDER is pm6-5's scope; core
    // only carries the `ripped` flag). This is a narrow non-regression guard that
    // AC2's "CONSUMED, no new bake" holds: the torn sheet is sprite tiles #32 then #33
    // (pacman.asm:1642/#164d), and pm3 baked all 64 sprites into SPRITES, so those
    // indices already exist and decode — pm6-3 (and pm6-5) reference them, adding no
    // sprite data. Reddens if pm3's atlas ever loses those tiles.
    expect(SPRITES.length, 'pm3 baked the full 64-sprite ROM').toBeGreaterThanOrEqual(0x34)
    for (const idx of [0x32, 0x33]) {
      expect(SPRITES[idx], `ripped-sheet sprite #${idx.toString(16)} is a baked pm3 tile`).toBeInstanceOf(Uint8Array)
      expect(SPRITES[idx].length, `ripped-sheet sprite #${idx.toString(16)} is non-empty (16x16 = 256 groups)`).toBe(256)
    }
  })

  it('both scenes glide at the cited 2x mover step (the CUTSCENE_STEPS_PER_FRAME pm6-2 pinned)', () => {
    // The one citable speed fact is the doubling; per-step distance is honest-uncited.
    expect(CUTSCENE_STEPS_PER_FRAME).toBe(2)
    for (const create of [createAct2Cutscene, createAct3Cutscene]) {
      const trace = runToDone(create, 1)
      for (let i = 1; i < trace.length; i++) {
        expect(
          tileDelta(trace[i].pacCol, trace[i - 1].pacCol),
          `Pac glides <=${CUTSCENE_STEPS_PER_FRAME} tiles/frame at frame ${i}`,
        ).toBeLessThanOrEqual(CUTSCENE_STEPS_PER_FRAME)
        expect(
          tileDelta(trace[i].blinkyCol, trace[i - 1].blinkyCol),
          `the ghost glides <=${CUTSCENE_STEPS_PER_FRAME} tiles/frame at frame ${i}`,
        ).toBeLessThanOrEqual(CUTSCENE_STEPS_PER_FRAME)
      }
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC3 — every new constant is value-pinned (a mutation reddens THIS) AND carries a
// citations.test.ts claim; and the act→level MAP is pinned. The byte-check in
// tests/audit/citations.test.ts independently re-opens each claim's verbatim
// against pacman.asm, so a fabricated cite reddens there.
// ─────────────────────────────────────────────────────────────────────────────
describe('pm6-3 AC3: constants are value-pinned + cited, and the act→level map is pinned', () => {
  it('the act-2 and act-3 position thresholds are the exact cited `sub #NN` operands', () => {
    expect(ACT2_PAC_SNAG_COL).toBe(0x2c) // pacman.asm:21e4 `sub #2c`
    expect(ACT3_PAC_COL).toBe(0x25) // pacman.asm:22aa `sub #25`
    expect(ACT3_WORM_COL_A).toBe(0x2d) // pacman.asm:22e0 `sub #2d`
    expect(ACT3_WORM_COL_B).toBe(0x1e) // pacman.asm:22f8 `sub #1e`
  })

  it('a citations.test.ts CLAIM anchors every cited act-2/act-3 address to the ROM (Decision C)', () => {
    // Each address is a `sub #NN` position gate or a driver/ripped-sheet entry,
    // decoded and re-checked against the raw bytes. GREEN adds claims/cutscene.json
    // entries covering them; loadClaims() scans every claims/*.json and
    // citations.test.ts byte-verifies each verbatim against pacman.asm. RED until
    // those claims land.
    const REQUIRED_ADDRS = [
      '219e', // act-2 driver entry (state #4e07)
      '21e4', // act-2 Pac snag col 0x2c
      '162d', // act-2 ripped-sheet gate (#4e07 -> sprite #32/#33)
      '2297', // act-3 driver entry (state #4e08)
      '22aa', // act-3 Pac col 0x25
      '22e0', // act-3 worm col A 0x2d
      '22f8', // act-3 worm col B 0x1e
    ]
    const addrs = new Set(loadClaims().map((c) => String(c.addr).toLowerCase()))
    const missing = REQUIRED_ADDRS.filter((a) => !addrs.has(a))
    expect(
      missing,
      `claims/cutscene.json must cover these cited act-2/act-3 addresses (Decision C): ${missing.join(', ')}`,
    ).toEqual([])
  })

  it('the act→level map is the documented dossier cadence: act 1@2, act 2@5, act 3@9/13/17', () => {
    expect(cutsceneActForLevel(2)).toBe(1) // INTERMISSION_LEVELS[0]
    expect(cutsceneActForLevel(5)).toBe(2) // INTERMISSION_LEVELS[1]
    expect(cutsceneActForLevel(9)).toBe(3) // INTERMISSION_LEVELS[2]
    expect(cutsceneActForLevel(13)).toBe(3) // INTERMISSION_LEVELS[3]
    expect(cutsceneActForLevel(17)).toBe(3) // INTERMISSION_LEVELS[4]
    // every coffee-break round maps to a real act...
    for (const lvl of INTERMISSION_LEVELS) {
      expect([1, 2, 3], `round ${lvl} maps to a real act`).toContain(cutsceneActForLevel(lvl))
    }
    // ...and NON-coffee-break rounds map to none.
    for (const lvl of [1, 3, 4, 6, 7, 8, 10, 20]) {
      expect(cutsceneActForLevel(lvl), `round ${lvl} is not a coffee break`).toBeNull()
    }
  })

  it('createCutsceneForLevel builds the RIGHT act for each cadence round (and none otherwise)', () => {
    expect(createCutsceneForLevel(2, 1)?.act, 'round 2 -> act 1').toBe(1)
    expect(createCutsceneForLevel(5, 1)?.act, 'round 5 -> act 2').toBe(2)
    expect(createCutsceneForLevel(9, 1)?.act, 'round 9 -> act 3').toBe(3)
    expect(createCutsceneForLevel(13, 1)?.act, 'round 13 -> act 3').toBe(3)
    expect(createCutsceneForLevel(17, 1)?.act, 'round 17 -> act 3').toBe(3)
    expect(createCutsceneForLevel(3, 1), 'a non-coffee-break round builds no cutscene').toBeNull()
    // and the built scene matches the standalone constructor bit-for-bit (same seed)
    expect(runToDone((s) => createCutsceneForLevel(5, s) as CutsceneState, 1)).toEqual(runToDone(createAct2Cutscene, 1))
    expect(runToDone((s) => createCutsceneForLevel(9, s) as CutsceneState, 1)).toEqual(runToDone(createAct3Cutscene, 1))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC4 — a GENTLE animation: NO >3 Hz large-area luminance strobe (Decision B, the
// standing Pac-Man accessibility ruling — the owner has photosensitive epilepsy).
// The pure player carries NO full-field flash signal; motion is smooth gliding and
// the sheet-tear is a small-area per-actor sprite swap.
// ─────────────────────────────────────────────────────────────────────────────
describe('pm6-3 AC4: acts 2 & 3 are gentle — no large-area luminance strobe', () => {
  it('neither scene exposes a full-field flash/invert signal (there is nothing to strobe)', () => {
    for (const s of [createAct2Cutscene(1), createAct3Cutscene(1)]) {
      for (const banned of ['flash', 'invert', 'strobe', 'blank', 'flashOn', 'fullFieldFlash']) {
        expect(banned in s, `a pure cutscene player must not carry a "${banned}" field (act ${s.act})`).toBe(false)
      }
    }
  })

  it('actor motion is smooth — no actor teleports (a column never jumps > the 2x step per frame)', () => {
    // Large-area luminance change comes from teleport/flash, not from a sprite
    // gliding a tile at a time. (Covered per-actor in AC2's glide test; this states
    // the accessibility invariant directly for both new scenes.)
    for (const create of [createAct2Cutscene, createAct3Cutscene]) {
      const trace = runToDone(create, 1)
      for (let i = 1; i < trace.length; i++) {
        expect(tileDelta(trace[i].pacCol, trace[i - 1].pacCol)).toBeLessThanOrEqual(CUTSCENE_STEPS_PER_FRAME)
        expect(tileDelta(trace[i].blinkyCol, trace[i - 1].blinkyCol)).toBeLessThanOrEqual(CUTSCENE_STEPS_PER_FRAME)
      }
    }
  })

  it('the ripped sheet is a state FLAG, not a per-frame toggle — it latches on and stays (no flicker)', () => {
    // A ripped sheet that flipped on/off every frame would be a strobe. Assert it is
    // a one-way latch: once ripped, never un-rips within the scene.
    const state = createAct2Cutscene(1)
    let frames = 0
    let everRipped = false
    while (!state.done && frames < MAX_FRAMES) {
      stepCutscene(state)
      if (state.blinky.ripped) everRipped = true
      if (everRipped) expect(state.blinky.ripped, 'ripped never toggles back off (no flicker)').toBe(true)
      frames++
    }
    expect(everRipped).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION — acts 2 & 3 run DURING the pm6-1 intermission phase (AC1 "during
// the pm6-1 intermission phase"). The wiring is part of THIS story, not deferred:
// a round-5 clear must enter `intermission` with an ACT-2 cutscene, a round-9
// clear with an ACT-3 cutscene, and the pm6-2 round-2 ACT-1 path must still hold.
//
// NOTE: level 5+ trips a pre-existing Elroy-2 speed defect in full gameplay (see
// pm6-2's Delivery Findings — out of pm6-3 scope), so — exactly as pm6-2's
// no-cutscene test did — these drive the level-clear -> intermission TRANSITION
// directly by forcing the phase, keeping the test on the cutscene-selection arm
// and off the unrelated speed defect. The playing -> level-clear path itself is
// already covered by pm6-2's round-2 gameplay test.
// ─────────────────────────────────────────────────────────────────────────────
const STEP_CAP = 4000

/** Force a phase without narrowing `s.phase` to a single literal at the call site
 *  (the pm6-2 / freeze-pauses precedent: a bare `s.phase = 'x'` makes tsc treat a
 *  later `.toBe('y')` as an impossible comparison and reddens `npm run lint`). */
function forcePhase(s: GameState, phase: GameState['phase']): void {
  s.phase = phase
}

/** Force the machine to the just-cleared `level` in `level-clear`, then step until
 *  it enters `intermission` (or the cap). Returns the state at that point. */
function clearIntoIntermission(seed: number, level: number): GameState {
  const state = createGameState(seed)
  forcePhase(state, 'level-clear')
  state.level = level
  state.freezeFrames = 0
  let frames = 0
  while (state.phase !== 'intermission' && frames < STEP_CAP) {
    stepGame(state, { dir: 'none' })
    frames++
  }
  return state
}

describe('pm6-3 integration: acts 2 & 3 play inside the intermission phase', () => {
  it('a round-5 clear enters intermission carrying a live ACT-2 cutscene', () => {
    const state = clearIntoIntermission(3, 5)
    expect(state.phase, 'a round-5 clear diverts through the coffee break').toBe('intermission')
    expect(state.cutscene, 'the round-5 break spawns a scripted cutscene (no more null fallback)').not.toBeNull()
    expect(state.cutscene?.act, 'round 5 plays act 2').toBe(2)
  })

  it('a round-9 clear enters intermission carrying a live ACT-3 cutscene', () => {
    const state = clearIntoIntermission(3, 9)
    expect(state.phase).toBe('intermission')
    expect(state.cutscene).not.toBeNull()
    expect(state.cutscene?.act, 'round 9 plays act 3').toBe(3)
  })

  it('the pm6-2 round-2 ACT-1 path is UNBROKEN (regression guard)', () => {
    const state = clearIntoIntermission(3, INTERMISSION_LEVELS[0])
    expect(state.phase).toBe('intermission')
    expect(state.cutscene?.act, 'round 2 still plays act 1').toBe(1)
  })

  it('the act-2/act-3 intermission runs the SCRIPTED cutscene to completion, then hands off to ready', () => {
    // With a cutscene present the break ends on the cutscene's COMPLETION (a
    // position), not the INTERMISSION_HOLD_FRAMES frame-count fallback. Drive the
    // round-5 break to its end and assert it both STEPPED the cutscene and settled.
    const state = clearIntoIntermission(3, 5)
    expect(state.cutscene?.act).toBe(2)
    let frames = 0
    let sawCutsceneAdvance = false
    while (state.phase === 'intermission' && frames < STEP_CAP) {
      const before = state.cutscene?.substate ?? -1
      stepGame(state, { dir: 'none' })
      if ((state.cutscene?.substate ?? -1) > before || state.cutscene?.done) sawCutsceneAdvance = true
      frames++
    }
    expect(sawCutsceneAdvance, 'the intermission actually STEPPED the act-2 cutscene').toBe(true)
    expect(state.phase, 'and the machine settles into the next round once the scene completes').toBe('ready')
    expect(state.cutscene, 'the cutscene is cleared on hand-off to ready').toBeNull()
  })
})
