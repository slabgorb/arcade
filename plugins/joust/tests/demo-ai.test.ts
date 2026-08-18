// tests/demo-ai.test.ts
//
// Story jt13-13 — RED phase (O'Brien / TEA). The attract "self-play demo" is not
// self-playing: main.ts:618 steps it with EMPTY inputs — `stepGame(cabinet.game, {})` —
// so the demo bird never flaps, never steers, dies on the first hazard and just
// re-materialises in place while a landed twin sits untouched. This story adds a
// DETERMINISTIC demo player AI that drives the demo so it actually plays and CLEARS
// waves. It is also the ENABLER for jt13-14: the passive demo can never clear a wave
// (a bird nobody flaps can't finish a round), so once jt13-14 changes respawn physics
// the demo must already be able to progress under its own control.
//
// ─── THE CONTRACT THIS SUITE PINS ───────────────────────────────────────────────
//
//   src/core/demo-ai.ts
//     export function demoInput(game: GameState): Record<number, PlayerInput>
//
// A PURE function of the game state. Given the current `GameState`, it returns the
// per-player-process input record `stepGame` accepts (keyed by the live player process
// ids, 1 and 2), synthesising each frame's { dir, flap, flapHeld } to keep the knight
// alive, steer toward eggs / away from lava, and joust enemies from above.
//
// Purity + determinism are load-bearing: the demo must replay bit-for-bit from a fixed
// seed so jt13-14 can re-baseline the fingerprint fixtures onto a KNOWN active-demo
// trajectory. No Date / Math.random — thread the durable seed word (game.sim.sim.rng,
// via src/core/rng.ts `rngNext`) if any randomness is wanted. The src/core/ purity sweep
// (tests/purity.test.ts) auto-covers the new file; AC-P below asserts it directly too.
//
// The flap EDGE (release→press) is the AI's own concern: the ROM's flap is an edge, and
// a demo that holds `flapHeld` every frame would machine-gun the wingbeat (the exact bug
// dumb-wingbeat.test.ts:775 guards for the scripted player). The AI derives the edge from
// each process's stored `prevFlapHeld` (sim.ts:206) so it stays pure and stateless —
// AC-4 proves the emergent property (no two adjacent flap edges) rather than the wiring.
//
// The wiring (main.ts:618) stops passing `{}` and passes `demoInput(cabinet.game)`, while
// KEEPING the literal `stepGame(` seam that demo-source.test.ts / gameover-wiring.test.ts
// pin (AC-5).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
import type { PlayerInput } from '../src/core/flight.js'
import { demoInput } from '../src/core/demo-ai.js'
import { violations } from './helpers/purity-scanner.js'

// The demo seed — main.ts:390 `const SEED = 0x1a2b_3c4d`, the word `createGame` boots the
// attract demo from and `toAttract` re-seeds it with on every restart.
const SEED = 0x1a2b_3c4d

const playerIdsOf = (g: GameState): number[] =>
  g.sim.sim.processes.filter((p) => p.kind === 'player').map((p) => p.id)

interface Fingerprint {
  frame: number
  rng: number
  wave: number
  procs: string
  scores: number[]
  lives: number[]
}
const fingerprint = (g: GameState, frame: number): Fingerprint => ({
  frame,
  rng: g.sim.sim.rng,
  wave: g.wave,
  procs: g.sim.sim.processes.map((p) => `${p.kind}#${p.id}`).join(','),
  scores: g.players.map((p) => p.score),
  lives: g.players.map((p) => p.lives),
})

// Step the ACTIVE demo (AI-driven) `frames` frames from `seed`, capturing per-frame the
// synthesised inputs alongside the resulting state. Stops early once `stopWave` is
// reached so the wave-clear probe is cheap on success and only pays the full budget on
// the failure it is meant to catch.
function runActive(
  seed: number,
  frames: number,
  stopWave = Number.POSITIVE_INFINITY,
): { end: GameState; frames: number; inputs: Record<number, PlayerInput>[] } {
  let g = createGame(seed)
  const inputs: Record<number, PlayerInput>[] = []
  let f = 0
  for (; f < frames; f++) {
    const step = demoInput(g)
    inputs.push(step)
    g = stepGame(g, step)
    if (g.wave >= stopWave) {
      f += 1
      break
    }
  }
  return { end: g, frames: f, inputs }
}

function runPassive(seed: number, frames: number): GameState {
  let g = createGame(seed)
  for (let f = 0; f < frames; f++) g = stepGame(g, {})
  return g
}

const livesLost = (g: GameState, startLives: number[]): number[] =>
  g.players.map((p, i) => startLives[i] - p.lives)

describe('jt13-13 demoInput — the contract (shape & keys)', () => {
  it('returns an input for every live player process id and nothing phantom (AC-1)', () => {
    const g = createGame(SEED)
    const ids = playerIdsOf(g)
    expect(ids, 'the demo boots with both knight processes').toEqual([1, 2])

    const out = demoInput(g)
    const keys = Object.keys(out).map(Number)
    // No phantom inputs: every key is a real player process id.
    expect(keys.every((k) => ids.includes(k)), `keys ${JSON.stringify(keys)} ⊆ ${JSON.stringify(ids)}`).toBe(true)
    // Every alive player is driven.
    for (const id of ids) expect(out[id], `player ${id} must be driven`).toBeDefined()
  })

  it('every synthesised PlayerInput is well-formed (dir ∈ {-1,0,1}, booleans, flap⇒flapHeld) (AC-2)', () => {
    let g = createGame(SEED)
    for (let f = 0; f < 400; f++) {
      const out = demoInput(g)
      for (const id of playerIdsOf(g)) {
        const inp = out[id]
        expect([-1, 0, 1], `frame ${f} player ${id} dir`).toContain(inp.dir)
        expect(typeof inp.flap, `frame ${f} player ${id} flap is boolean`).toBe('boolean')
        expect(typeof inp.flapHeld, `frame ${f} player ${id} flapHeld is boolean`).toBe('boolean')
        // A flap EDGE without holding the button is incoherent — the ROM edge is
        // `flapHeld && !prevFlapHeld`, so `flap` can never be true while `flapHeld` is false.
        if (inp.flap) expect(inp.flapHeld, `frame ${f} player ${id}: flap edge implies flapHeld`).toBe(true)
      }
      g = stepGame(g, out)
    }
  })
})

describe('jt13-13 demoInput — purity & determinism', () => {
  it('is a pure function: same state in ⇒ deeply-equal inputs out, with no observable side effect (AC-3)', () => {
    const g = createGame(SEED)
    // Advance to a mid-game state so the decision has real inputs to work with.
    let mid = g
    for (let f = 0; f < 500; f++) mid = stepGame(mid, demoInput(mid))
    const a = demoInput(mid)
    const b = demoInput(mid)
    expect(a, 'demoInput must not depend on hidden mutable state').toEqual(b)
  })

  it('replays bit-for-bit from a fixed seed — the fingerprint (incl. rng) is identical across runs (AC-3)', () => {
    const first = runActive(SEED, 1500).end
    const second = runActive(SEED, 1500).end
    expect(fingerprint(first, 1500)).toEqual(fingerprint(second, 1500))
    // The rng cursor is part of the fingerprint: a non-deterministic AI (Date/Math.random)
    // would desync it. This is the property jt13-14's re-baseline depends on.
    expect(second.sim.sim.rng, 'the durable seed word must be reproducible').toBe(first.sim.sim.rng)
  })

  it('src/core/demo-ai.ts stays inside the core boundary — no Date/Math.random/DOM (AC-P)', () => {
    // The generic src/core/ sweep already covers this file, but the "MUST be pure + seeded"
    // requirement is first-class to THIS story, so assert it here against the real source.
    const src = readFileSync(fileURLToPath(new URL('../src/core/demo-ai.ts', import.meta.url)), 'utf8')
    expect(violations(src), `demo-ai.ts crosses the core/shell boundary via: ${violations(src).join(', ')}`).toEqual([])
  })
})

describe('jt13-13 demoInput — no machine-gun wingbeat (flap edge discipline)', () => {
  it('never emits a flap EDGE on two consecutive frames for the same player (AC-4)', () => {
    // Correct edge discipline (flap = flapHeld && !prevFlapHeld) makes back-to-back flap
    // edges impossible: the second frame's prevFlapHeld would be true. Two adjacent
    // `flap:true`s is therefore proof the AI is holding the edge high every frame — the
    // machine-gun wingbeat dumb-wingbeat.test.ts:775 forbids for the scripted player.
    const { inputs } = runActive(SEED, 2000)
    for (const id of [1, 2]) {
      for (let f = 1; f < inputs.length; f++) {
        const prev = inputs[f - 1][id]
        const curr = inputs[f][id]
        if (!prev || !curr) continue
        expect(
          prev.flap && curr.flap,
          `player ${id}: flap edge on adjacent frames ${f - 1}→${f} — the edge is being held high (machine-gun wingbeat)`,
        ).toBe(false)
      }
    }
  })
})

describe('jt13-13 demoInput — it actually PLAYS (the deliverable)', () => {
  it('the demo player actively flaps — it is not standing dead like the passive bird (AC-5)', () => {
    // The whole bug: the passive demo emits zero flaps. An active demo must beat its wings.
    const { inputs } = runActive(SEED, 1200)
    const flaps1 = inputs.filter((step) => step[1]?.flapHeld).length
    expect(flaps1, 'player 1 must actually flap over ~20s of demo (passive = 0)').toBeGreaterThan(20)
  })

  it('survives materially better than the passive bird — fewer lives lost by frame 3000 (AC-6)', () => {
    // Passive player 1 loses its first life at frame 606 and bleeds down to 0 (measured).
    // An AI that flaps to stay off the lava and away from enemies must do strictly better.
    const start = createGame(SEED).players.map((p) => p.lives)
    const active = runActive(SEED, 3000).end
    const passive = runPassive(SEED, 3000)
    const activeLost1 = livesLost(active, start)[0]
    const passiveLost1 = livesLost(passive, start)[0]
    expect(
      activeLost1,
      `active player 1 lost ${activeLost1} lives by frame 3000; passive lost ${passiveLost1} — the AI must survive better`,
    ).toBeLessThan(passiveLost1)
  })

  it('CLEARS wave 1 — reaches wave ≥ 2, which the passive demo never does in 20000 frames (AC-7)', () => {
    // This is the story's core deliverable and the jt13-14 prerequisite. The passive demo
    // is stuck on wave 1 forever (measured: maxWave = 1 across 20000 frames) because a bird
    // nobody flaps can't finish jousting the wave. The active demo must break through.
    const BUDGET = 20000
    const active = runActive(SEED, BUDGET, /* stopWave */ 2)
    expect(
      active.end.wave,
      `the AI reached wave ${active.end.wave} after ${active.frames} frames — it must clear wave 1 (passive stays on wave 1 indefinitely)`,
    ).toBeGreaterThanOrEqual(2)
    // Guard the contrast is real: the passive bird genuinely cannot do this.
    expect(runPassive(SEED, BUDGET).wave, 'passive control must remain on wave 1').toBe(1)
  })
})

describe('jt13-13 wiring — main.ts drives the demo through demoInput, seam preserved (AC-8)', () => {
  const mainSrc = (): string => readFileSync(fileURLToPath(new URL('../src/main.ts', import.meta.url)), 'utf8')

  it('the demo branch no longer steps with an empty input object', () => {
    expect(
      mainSrc(),
      "main.ts must stop passing `{}` to stepGame in the demo branch (that IS the passive-demo bug)",
    ).not.toMatch(/stepGame\s*\(\s*cabinet\.game\s*,\s*\{\s*\}\s*\)/)
  })

  it('main.ts calls demoInput to synthesise the demo inputs', () => {
    expect(mainSrc(), 'main.ts must drive the demo through demoInput').toMatch(/demoInput\s*\(/)
  })

  it('keeps the literal stepGame( seam (demo-source.test.ts / gameover-wiring.test.ts pin)', () => {
    expect(mainSrc(), 'the jt4-5 stepGame( seam must survive').toMatch(/stepGame\s*\(/)
  })
})
