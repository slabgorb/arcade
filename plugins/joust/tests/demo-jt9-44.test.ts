// tests/demo-jt9-44.test.ts
//
// Story jt9-44 — RED phase (TEA). Suppress the wave-entry cue-spam that
// `spawnWavePteros` causes by stacking a wave's whole pterodactyl complement at
// ONE coordinate.
//
// THE DEFECT. `spawnWavePteros` (demo.ts) builds every ptero of a wave from the
// same `pteroFlightEntity()` — identical posX (8), posY, and velocity — so a
// WPTERO wave enters with its pteros perfectly stacked. Now that jt5-16 (ptero /
// ptero) and jt9-15 (PTEBRD, ptero / buzzard) both RESOLVE overlapping pairs, the
// collision pass finds `C(k,2)` overlapping pairs among the k stacked pteros and
// sounds `enemy-thud` for EACH on a single frame — a BURST. The physics is
// ROM-lawful (each pair really is overlapping and OSTBMP really bumps them ±2);
// it is the CUE TIMING that is un-ROM-like — a real machine spreads its spawns,
// so the thuds never pile onto one frame.
//
// WHY jt5-16 / jt9-15 NEVER TRIP IT. Both suites keep a napped base enemy as a
// wave-open ANCHOR precisely "so spawnWavePteros never stacks a later wave's
// pteros at one coordinate behind our backs" (demo-jt9-15.test.ts). This suite
// does the OPPOSITE: it lets a cleared wave ADVANCE into a real WPTERO wave, so
// spawnWavePteros stacks the pteros for real and the burst is observed end to end.
//
// THE FIXTURE. createWaveDemo, wave forced to 42, stripped to players only → the
// next stepDemo clears-and-advances to wave 43, a WPTERO wave whose table row
// carries THREE pterodactyls (WAVE_TABLE[42], status 0xbb → WJSRTB index 5 =
// WPTERO). Three stacked pteros give three overlapping pairs → three enemy-thud
// cues on the first collision frame. Non-ptero enemies (the wave's lords) are
// hushed every frame so the only enemy-thud source is the ptero stack — cues carry
// no process id, so attribution is the fixture's (jt5-16 / jt9-15 discipline).
//
// THE OBSERVABLE, fix-agnostic. A "burst" is >= 2 enemy-thud cues on ONE frame.
// The story leaves the mechanism open: Dev may SPREAD the spawn coordinate (pteros
// no longer overlap on entry → 0 stack thuds) or SUPPRESS the duplicate wave-entry
// cues (the stream dedupes → <= 1). BOTH collapse the per-frame enemy-thud count
// to <= 1, so this suite pins exactly that bound and nothing about the mechanism.
// The ptero COUNT (3) is unchanged by either fix and is the non-vacuity guard: if
// a future change stops the WPTERO wave from spawning its three pteros, that guard
// reddens rather than letting the burst assertion pass empty.

import { describe, it, expect } from 'vitest'
import { createWaveDemo, stepDemo, type DemoProcess, type DemoState } from '../src/core/demo.js'

const SEED = 0x1234
// WAVE_TABLE[42] (wave 43): 7 lords + 3 pterodactyls, status 0xbb. `(0xbb & 0x0e)
// >> 1 = 5` → the WPTERO dispatch, so its three pteros really enter (jt3-4).
const WAVE_BEFORE_PTERO_WAVE = 42
const EXPECTED_PTEROS = 3

const cueKinds = (d: DemoState): string[] => d.cues.map((c) => c.type as string)
const enemyThuds = (d: DemoState): number => cueKinds(d).filter((k) => k === 'enemy-thud').length
const pterosOf = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'ptero')

/** A demo parked one wave BEFORE the WPTERO wave, cleared to players only, so the
 *  very next step advances into the WPTERO wave and spawnWavePteros runs for real. */
function onTheBrinkOfThePteroWave(): DemoState {
  const base = createWaveDemo(SEED)
  return {
    ...base,
    wave: WAVE_BEFORE_PTERO_WAVE,
    sim: { ...base.sim, processes: base.sim.processes.filter((p) => p.kind === 'player') },
  }
}

/** Hush every non-player, non-ptero process (the wave's lords) so the ONLY
 *  enemy-thud source left is the stacked ptero complement under test. */
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

describe('jt9-44 — a multi-ptero wave entry does not spam enemy-thud cues on one frame', () => {
  it('spawnWavePteros stacks 3 pteros, but no single frame may carry a BURST of enemy-thuds', () => {
    // Frame 0: the clear-and-advance into wave 43. spawnWavePteros runs here.
    let d = stepDemo(onTheBrinkOfThePteroWave(), {})

    // Non-vacuity guard: the WPTERO wave really entered its three pteros. This
    // count is what BOTH candidate fixes preserve (spread changes coordinates,
    // suppress changes cues — neither drops a ptero), so it stays true post-fix
    // and a regression that stops the spawn reddens HERE instead of masking the
    // burst assertion below.
    expect(pterosOf(d), 'wave 43 must enter its three pterodactyls (WPTERO complement)').toHaveLength(
      EXPECTED_PTEROS,
    )
    // The advance frame itself sounds ptero-arrives (the intro scream), not thuds —
    // the collision pass this frame ran on the pre-advance process set (players only).
    expect(enemyThuds(d), 'the advance frame sounds arrivals, not thuds').toBe(0)

    // Walk the entry window. Pre-fix, the stacked pteros pile 3 enemy-thud cues
    // onto the first collision frames; post-fix (spread OR suppressed) no frame
    // carries more than one.
    let maxThudsInOneFrame = 0
    for (let f = 0; f < 6; f++) {
      d = hushNonPteros(d)
      d = stepDemo(d, {})
      maxThudsInOneFrame = Math.max(maxThudsInOneFrame, enemyThuds(d))
    }

    expect(
      maxThudsInOneFrame,
      'a stacked multi-ptero wave entry must not fire >=2 enemy-thud cues on any single frame',
    ).toBeLessThanOrEqual(1)
  })

  it('the 3 stacked pteros survive — this is a cue/spacing story, no kills, no deaths', () => {
    // Guards against a false green via the wrong mechanism: nobody may DIE to make
    // the burst go away. PTEBRD/OSTBMP are pure bumps; a death cue here would mean
    // a fix reached for resolveJoust instead of spread-or-suppress.
    let d = stepDemo(onTheBrinkOfThePteroWave(), {})
    expect(pterosOf(d)).toHaveLength(EXPECTED_PTEROS)

    const deaths: string[] = []
    for (let f = 0; f < 6; f++) {
      d = hushNonPteros(d)
      d = stepDemo(d, {})
      deaths.push(...cueKinds(d).filter((k) => k.endsWith('-death')))
    }

    expect(pterosOf(d), 'all three pteros still fly — a stack is not a kill').toHaveLength(EXPECTED_PTEROS)
    expect(deaths, 'no death cue: this is a spacing/cue fix, not a cull').toEqual([])
  })
})
