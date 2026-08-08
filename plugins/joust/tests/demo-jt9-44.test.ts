// tests/demo-jt9-44.test.ts
//
// Story jt9-44 — the wave-entry cue-spam guard, RE-SEATED by jt9-59.
//
// jt9-44's ORIGINAL defect. `spawnWavePteros` built a wave's whole pterodactyl
// complement at ONE coordinate on the advance frame (identical posX 8, same lane), so
// the collision pass found `C(k,2)` overlapping pairs among the k STACKED pteros and
// sounded `enemy-thud` for EACH on a single frame — a BURST — while their intro
// screams (SNPTEI / `ptero-arrives`) also piled onto that one frame. jt9-44 pinned
// "no frame carries >=2 enemy-thuds"; jt9-45 then spread the pteros onto distinct
// sides + cliff lanes so they no longer share a coordinate.
//
// jt9-59 SUPERSEDES the mechanism this guard watched. The ROM's PTERWV creates a
// wave's pteros ONE AT A TIME (`PCNAP 65` between each `SECCR PTERST`,
// JOUSTRV4.SRC:2618), so at most ONE ptero is created on any single frame. The
// pre-condition of jt9-44's burst — two-or-more pteros co-created at one coordinate on
// one frame — is now STRUCTURALLY impossible, from two independent directions: they
// enter on different frames (jt9-59) AND on different sides/lanes (jt9-45).
//
// THE INTENT, RE-PINNED against the deferred model (the guard is re-expressed, not
// deleted): across the whole entry window no single frame may CREATE more than one
// ptero or carry more than one `ptero-arrives` cue (the direct successor to the
// no-scream-burst), and no two pteros ever occupy the SAME (posX,posY) — the exact
// stack that produced jt9-44's `enemy-thud` burst. The wave still creates its full
// three-ptero complement (non-vacuity), spread over the PTERWV cadence. Batch the
// creations back onto one frame and the ">=2 created / >=2 screams" bound reddens;
// collapse them onto one coordinate and the no-stack assertion reddens; stop creating
// the three and the count reddens.
//
// (The mid-flight `enemy-thud`s a ptero makes LATER — flying through the frozen lords
// this fixture hushes, or overlapping a peer after ~120 frames of flight — are real
// PTEBRD/OSTBMP physics, not the entry cue-spam this guard is about, so the window is
// scoped to the CREATION span, not the pteros' whole life.)

import { describe, it, expect } from 'vitest'
import { createWaveDemo, stepDemo, type DemoProcess, type DemoState } from '../src/core/demo.js'

const SEED = 0x1234
// WAVE_TABLE[42] (wave 43): 7 lords + 3 pterodactyls, status 0xbb. `(0xbb & 0x0e)
// >> 1 = 5` → the WPTERO dispatch, so its three pteros really enter (jt3-4).
const WAVE_BEFORE_PTERO_WAVE = 42
const EXPECTED_PTEROS = 3
// The PTERWV creation span: bird i is created 65*(i+1) frames in (last ≈ 195). A hair
// of margin captures the third create without walking into the pteros' mutual flight.
const CREATION_WINDOW = 210

const cueKinds = (d: DemoState): string[] => d.cues.map((c) => c.type as string)
const countCue = (d: DemoState, kind: string): number => cueKinds(d).filter((k) => k === kind).length
const pterosOf = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'ptero')
const coord = (p: DemoProcess): string => `${p.entity?.posX},${p.entity?.posY}`

/** A demo parked one wave BEFORE the WPTERO wave, cleared to players only, so the
 *  very next step advances into the WPTERO wave and its ptero schedule is seeded. */
function onTheBrinkOfThePteroWave(): DemoState {
  const base = createWaveDemo(SEED)
  return {
    ...base,
    wave: WAVE_BEFORE_PTERO_WAVE,
    sim: { ...base.sim, processes: base.sim.processes.filter((p) => p.kind === 'player') },
  }
}

/** Hush every non-player, non-ptero process (the wave's lords) so the wave stays open
 *  while the PTERWV creation schedule plays out. */
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

describe('jt9-44 (re-seated by jt9-59) — a multi-ptero wave entry never spams cues, because it enters one bird at a time', () => {
  it('no single frame creates >=2 pteros or spams >=2 ptero-arrives, and no two pteros ever stack', () => {
    // Frame 0: the clear-and-advance into wave 43. The ptero schedule is seeded; no
    // ptero is created yet (PTERWV naps 65 first), so the advance frame sounds no arrival.
    let d = stepDemo(onTheBrinkOfThePteroWave(), {})
    expect(pterosOf(d), 'no ptero stands on the advance frame — deferred creation').toHaveLength(0)
    expect(countCue(d, 'ptero-arrives'), 'no SNPTEI on the advance frame').toBe(0)

    const seen = new Set<number>()
    let maxNewPerFrame = 0
    let maxArrivesPerFrame = 0
    let maxStackedAtOneCoord = 0
    for (let f = 0; f < CREATION_WINDOW; f++) {
      let newThisFrame = 0
      for (const p of pterosOf(d)) if (!seen.has(p.id)) { seen.add(p.id); newThisFrame++ }
      maxNewPerFrame = Math.max(maxNewPerFrame, newThisFrame)
      maxArrivesPerFrame = Math.max(maxArrivesPerFrame, countCue(d, 'ptero-arrives'))
      // No two pteros share a coordinate — the stack that produced jt9-44's thud burst.
      const perCoord = new Map<string, number>()
      for (const p of pterosOf(d)) perCoord.set(coord(p), (perCoord.get(coord(p)) ?? 0) + 1)
      maxStackedAtOneCoord = Math.max(maxStackedAtOneCoord, ...perCoord.values(), 1)
      d = hushNonPteros(d)
      d = stepDemo(d, {})
    }

    // Non-vacuity: the WPTERO wave really created its three pterodactyls over the
    // window — a regression that stopped the spawn reddens HERE.
    expect(seen.size, 'wave 43 must create its three pterodactyls (WPTERO complement)').toBe(EXPECTED_PTEROS)
    // The re-seated invariant: one at a time, on distinct coordinates — no burst possible.
    expect(maxNewPerFrame, 'no frame may create more than one ptero (PTERWV one-at-a-time)').toBeLessThanOrEqual(1)
    expect(maxArrivesPerFrame, 'SNPTEI must never pile onto one frame').toBeLessThanOrEqual(1)
    expect(maxStackedAtOneCoord, 'no two pteros may share a coordinate (the jt9-44 enemy-thud stack)').toBe(1)
  })

  it('all three pteros are genuinely created and distinct — no bird is culled to hide a burst', () => {
    // Guards against a false green via the wrong mechanism: the three complement birds
    // must all actually be created (distinct ids), not silenced by a cull.
    let d = stepDemo(onTheBrinkOfThePteroWave(), {})
    const ids = new Set<number>()
    for (let f = 0; f < CREATION_WINDOW; f++) {
      for (const p of pterosOf(d)) ids.add(p.id)
      d = hushNonPteros(d)
      d = stepDemo(d, {})
    }
    expect(ids.size, 'all three pteros are created over the cadence, each with its own id').toBe(EXPECTED_PTEROS)
  })
})
