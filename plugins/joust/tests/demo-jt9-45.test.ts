// tests/demo-jt9-45.test.ts
//
// Story jt9-45 — RED phase (TEA). Port the FULL PTERST/PTERWV ptero entry:
// random side + time-stagger — not just the jt9-44 Y-lane spread.
//
// WHAT jt9-44 LEFT UNPORTED. jt9-44 spread a wave's pteros onto three distinct
// cliff-appear Y lanes (CLIF5=209, CLIF3=128, CLIF1=61 — PTERO_APPEAR_Y,
// JOUSTRV4.SRC:1457-1463) so their entry no longer stacks at one coordinate. But it
// deliberately left the pteros entering in horizontal LOCKSTEP — every ptero at
// posX 8, moving right, on the SAME frame — because a time-stagger would have
// dropped the count present on the entry frame below its `length === 3` guard. The
// ROM does two more things at entry that jt9-45 owns:
//
//   1. RANDOM SIDE (PTERST, JOUSTRV4.SRC:1421-1489). `LDA #2 / STA PVELX` (default
//      velocity +, moving right) and `LDX #ELEFT+1` (left edge, ELEFT=-10 → -9);
//      then `JSR VRAND / BCC 1$` — carry-clear keeps the LEFT entry, carry-set does
//      `COM PFACE / NEG PVELX / LDX #ERIGHT-1` (right edge, ERIGHT=292 → 291) and
//      flies the opposite way. So the coin flip picks the entry EDGE *and* negates
//      the velocity so the bird always flies INTO the arena.
//   2. TIME-STAGGER (PTERWV, JOUSTRV4.SRC:2618). `PTERWV PCNAP 65 / DEC PJOYT /
//      SECCR PTERST / BRA PTERWV` — the wave creates its pteros ONE AT A TIME with a
//      65-frame nap between each. They enter ~65 frames apart, not all at once.
//
// THE OLD (pre-jt9-45) OBSERVABLE, measured on the current tree before writing this
// suite (throwaway probe): every seed produced `x=8,8,8`, `vX=8,8,8`, all three
// pteros present and MOVING from the entry frame (x: 8→11→14 …, +3px/frame). Side
// did not vary with the seed at all, and there was no stagger. That fixed vector —
// `OLD_BIRTH_XS` / `OLD_ACTIVATION_FRAMES` below — is the non-vacuity control: the
// predicates this suite leans on are unit-tested against it (they must call it
// "not varied" / "not staggered") so a vacuous predicate cannot pass this suite.
//
// FIX-AGNOSTIC. The suite never calls `spawnWavePteros` directly and never pins the
// exact edge coordinates or the RNG-threading signature — Dev is free to draw VRAND
// however the core's RNG works and to stagger via nap or incremental creation. It
// observes only what stepDemo produces: each ptero's BIRTH X (first posX seen, before
// it flies), its birth Y lane, its ACTIVATION frame (first frame its posX leaves
// birth X — i.e. it starts flying), and its flight DIRECTION. Those hold for any
// faithful port.

import { describe, it, expect } from 'vitest'
import { createWaveDemo, stepDemo, type DemoProcess, type DemoState } from '../src/core/demo.js'

// WAVE_TABLE[42] (wave 43): status 0xbb → WJSRTB index 5 = WPTERO, 3 pterodactyls.
// Identical fixture to demo-jt9-44: park one wave before the ptero wave, strip to
// players, and the next stepDemo clears-and-advances into WPTERO — spawnWavePteros
// runs for real (jt3-4).
const WAVE_BEFORE_PTERO_WAVE = 42
const EXPECTED_PTEROS = 3
// jt9-44's three cliff-appear lanes (PTERO_APPEAR_Y, JOUSTRV4.SRC:1457-1463). AC6:
// this story adds side + time ON TOP of the lanes — it must not lose them.
const CLIFF_LANES = [61, 128, 209]

// A wide set of seeds so the random-side aggregate cannot hinge on one coin flip:
// 16 seeds × 3 pteros = 48 draws, so "every draw landed on the same side" is ~2^-48.
const SEEDS = [
  0x1234, 0x5678, 0x9abc, 0xdead, 0xbeef, 0x0f0f, 0x7777, 0x2468, 0x1357, 0xcafe,
  0xface, 0xba5e, 0x1010, 0x3141, 0x5926, 0x8080,
]

// Screen edges of the ~292-wide wrap field (ELEFT=-10 … ERIGHT=292). A ptero that
// "enters from a screen edge" arrives deep in one half; these thresholds bracket the
// two edges with a wide neutral gap so no near-centre value satisfies either.
const LEFT_EDGE_MAX = 50
const RIGHT_EDGE_MIN = 200

/** Per-ptero entry record accumulated across a whole run, keyed by process id so it
 *  survives a ptero despawning before a later, time-staggered one has entered. */
interface PteroTrack {
  birthX: number
  birthY: number
  birthFrame: number
  /** First frame this ptero's posX left birthX — the frame it starts to fly. */
  activationFrame: number | null
  /** posX the frame it first moves (to read flight direction). */
  movedX: number | null
}

const pterosOf = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'ptero')

/** Park on the brink of the WPTERO wave, players only — the next step advances in. */
function onTheBrinkOfThePteroWave(seed: number): DemoState {
  const base = createWaveDemo(seed)
  return {
    ...base,
    wave: WAVE_BEFORE_PTERO_WAVE,
    sim: { ...base.sim, processes: base.sim.processes.filter((p) => p.kind === 'player') },
  }
}

/** Hush every non-player, non-ptero process (the wave's lords) each frame so nothing
 *  bumps a ptero's posX — a bump would look like flight to the activation detector.
 *  Pteros ride distinct Y lanes so they never overlap each other (jt5-16 no-op). */
function hushNonPteros(d: DemoState): DemoState {
  return {
    ...d,
    sim: {
      ...d.sim,
      processes: d.sim.processes.map((p) =>
        p.kind === 'player' || p.kind === 'ptero' ? p : { ...p, nap: 100_000 },
      ),
    },
  }
}

/** Advance the WPTERO wave for `frames` and record, per ptero id, where and WHEN it
 *  entered and started to fly. Fix-agnostic: works whether Dev staggers by napping a
 *  present ptero or by creating pteros incrementally. */
function trackWaveEntry(seed: number, frames = 260): PteroTrack[] {
  let d = stepDemo(onTheBrinkOfThePteroWave(seed), {}) // frame 0: the clear-and-advance
  const tracks = new Map<number, PteroTrack>()
  for (let f = 0; f < frames; f++) {
    for (const p of pterosOf(d)) {
      const x = p.entity?.posX ?? 0
      const existing = tracks.get(p.id)
      if (existing === undefined) {
        tracks.set(p.id, {
          birthX: x,
          birthY: (p.entity?.posY ?? 0) >> 8,
          birthFrame: f,
          activationFrame: null,
          movedX: null,
        })
      } else if (existing.activationFrame === null && x !== existing.birthX) {
        existing.activationFrame = f
        existing.movedX = x
      }
    }
    d = hushNonPteros(d)
    d = stepDemo(d, {})
  }
  return [...tracks.values()]
}

// ── The non-vacuity control (AC3) ─────────────────────────────────────────────
// The literal pre-jt9-45 vectors, from the probe. The predicates below MUST call
// these "not varied" / "not staggered", or they are vacuous.
const OLD_BIRTH_XS = [8, 8, 8]
const OLD_ACTIVATION_FRAMES = [1, 1, 1]

/** True when the entry X's occupy BOTH screen edges (a real two-sided entry). */
function entersBothEdges(birthXs: number[]): boolean {
  return birthXs.some((x) => x <= LEFT_EDGE_MAX) && birthXs.some((x) => x >= RIGHT_EDGE_MIN)
}

/** True when consecutive activation frames are all ≥ `minGap` apart (a real stagger). */
function isStaggered(activationFrames: number[], minGap: number): boolean {
  const sorted = [...activationFrames].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) if (sorted[i] - sorted[i - 1] < minGap) return false
  return sorted.length >= 2
}

describe('jt9-45 — the ptero wave entry ports PTERST random side and PTERWV time-stagger', () => {
  // ── AC3: the detectors are not vacuous ──────────────────────────────────────
  it('CONTROL — the detectors reject the pre-jt9-45 lockstep vector', () => {
    // The old entry was all-posX-8 and all-same-frame; a working detector must see
    // that as neither two-sided nor staggered. If either of these flips, every
    // green below is suspect.
    expect(entersBothEdges(OLD_BIRTH_XS), 'old x=8,8,8 is one-sided, not two edges').toBe(false)
    expect(isStaggered(OLD_ACTIVATION_FRAMES, 60), 'old all-same-frame is not staggered').toBe(false)
    // And it must ACCEPT a genuine two-sided, staggered vector.
    expect(entersBothEdges([8, 291, 8])).toBe(true)
    expect(isStaggered([1, 66, 131], 60)).toBe(true)
  })

  // ── AC1: random entry side ───────────────────────────────────────────────────
  it('AC1 — a wave enters from BOTH screen edges, and the entry X is binary (two edges only)', () => {
    const allBirthXs = SEEDS.flatMap((s) => trackWaveEntry(s).map((t) => t.birthX))
    // Non-vacuity: some ptero really does enter from the right edge. Pre-fix every
    // birthX is 8, so this is exactly what fails today.
    expect(
      entersBothEdges(allBirthXs),
      'across seeds, pteros must enter from BOTH the left and right screen edges (PTERST ELEFT+1 / ERIGHT-1), not all at posX 8',
    ).toBe(true)
    // ROM-faithful shape: PTERST has exactly TWO entry X's (ELEFT+1, ERIGHT-1). The
    // aggregate over every seed must therefore be a two-valued set — one left edge,
    // one right edge — never a scatter of offsets.
    const distinct = [...new Set(allBirthXs)].sort((a, b) => a - b)
    expect(distinct.length, `entry X must be a binary edge choice; saw values ${distinct.join(',')}`).toBe(2)
    expect(distinct[0], 'the low entry X is the LEFT edge').toBeLessThanOrEqual(LEFT_EDGE_MAX)
    expect(distinct[1], 'the high entry X is the RIGHT edge').toBeGreaterThanOrEqual(RIGHT_EDGE_MIN)
  })

  it('AC1 — the side is RNG-driven: reproducible for a seed, but varies across seeds', () => {
    // Reproducible: the same seed replays the same side sequence (seeded determinism).
    const once = trackWaveEntry(0x1234).map((t) => t.birthX)
    const twice = trackWaveEntry(0x1234).map((t) => t.birthX)
    expect(twice, 'same seed → identical entry-side sequence (deterministic replay)').toEqual(once)
    // Driven by the stream, not fixed: at least two seeds must disagree. Pre-fix
    // every seed yields 8,8,8, so every pair is identical and this fails.
    const perSeed = SEEDS.map((s) => trackWaveEntry(s).map((t) => t.birthX).join(','))
    const distinctSequences = new Set(perSeed)
    expect(
      distinctSequences.size,
      'entry sides must depend on the RNG seed — pre-fix every seed gives the same lockstep 8,8,8',
    ).toBeGreaterThan(1)
  })

  it('AC1 — the chosen side sets the flight direction: each ptero flies INTO the arena', () => {
    // PTERST negates PVELX on the right-edge branch (COM PFACE / NEG PVELX), so a
    // right-edge ptero flies LEFT and a left-edge ptero flies RIGHT — always inward.
    // Pre-fix there are no right-edge pteros at all, so the right-edge assertion has
    // nothing to check and the "must exist a right-enterer" guard fails.
    const tracks = SEEDS.flatMap((s) => trackWaveEntry(s)).filter((t) => t.activationFrame !== null)
    const rightEnterers = tracks.filter((t) => t.birthX >= RIGHT_EDGE_MIN)
    const leftEnterers = tracks.filter((t) => t.birthX <= LEFT_EDGE_MAX)

    expect(rightEnterers.length, 'some ptero must enter from the RIGHT edge (else side never flipped)').toBeGreaterThan(0)
    expect(leftEnterers.length, 'some ptero must enter from the LEFT edge').toBeGreaterThan(0)

    for (const t of rightEnterers) {
      expect(
        t.movedX! - t.birthX,
        `a right-edge ptero (birthX=${t.birthX}) must fly LEFT into the arena (NEG PVELX)`,
      ).toBeLessThan(0)
    }
    for (const t of leftEnterers) {
      expect(
        t.movedX! - t.birthX,
        `a left-edge ptero (birthX=${t.birthX}) must fly RIGHT into the arena`,
      ).toBeGreaterThan(0)
    }
  })

  // ── AC2: time-stagger ────────────────────────────────────────────────────────
  it('AC2 — the wave enters its 3 pteros ≥65 frames apart, not all on one frame', () => {
    const tracks = trackWaveEntry(0x1234)
    // Non-vacuity, and the successor to jt9-44's entry-frame count guard: all three
    // pteros still enter — but now spread over TIME rather than all at frame 0.
    expect(tracks, 'the WPTERO wave must still enter its three pterodactyls').toHaveLength(EXPECTED_PTEROS)
    const activations = tracks.map((t) => t.activationFrame)
    expect(activations.every((a) => a !== null), 'every ptero must eventually start to fly').toBe(true)

    const frames = (activations as number[]).slice().sort((a, b) => a - b)
    // PTERWV naps 65 frames between creates (JOUSTRV4.SRC:2618). Pre-fix all three
    // activate on frame 1 (gaps 0). Assert each gap ≥ 60 (a hair under 65, tolerant
    // of Dev's exact nap-vs-move off-by-one) — today's gap of 0 fails hard.
    for (let i = 1; i < frames.length; i++) {
      expect(
        frames[i] - frames[i - 1],
        `pteros must enter ≥65 frames apart (PTERWV PCNAP 65); activation frames were ${frames.join(',')}`,
      ).toBeGreaterThanOrEqual(60)
    }
    // Upper sanity: a "stagger" that parks a ptero off past the horizon is not the
    // ROM's 65-frame cadence. Everyone should be in within a few intervals.
    expect(frames[frames.length - 1], 'all three should enter within a few 65-frame naps').toBeLessThanOrEqual(240)
  })

  // ── AC6: jt9-44's Y lanes survive ────────────────────────────────────────────
  it('AC6 — the three cliff Y-lanes are preserved (side + time added ON TOP)', () => {
    const lanes = trackWaveEntry(0x1234)
      .map((t) => t.birthY)
      .sort((a, b) => a - b)
    // The spread jt9-44 delivered must not be lost to the side/time port: each ptero
    // still appears on its own CLIF lane (61/128/209).
    expect(lanes, 'wave pteros must still occupy the three distinct cliff-appear lanes').toEqual(CLIFF_LANES)
  })
})
