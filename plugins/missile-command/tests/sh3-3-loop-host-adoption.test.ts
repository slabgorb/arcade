// tests/sh3-3-loop-host-adoption.test.ts
//
// Story SH3-3 — RED phase (Han Solo / TEA). Shared-module adoption: missile-command's
// `src/main.ts` must retire its raw requestAnimationFrame loop in favour of
// `@shared/loop.createLoop`, and its hand-rolled canvas mount in favour of
// `@shared/host-helpers.mountCanvas`.
//
// ⚠ The sprint-YAML TITLE cites stale line numbers (src/main.ts:71/74). This file
// pins the CORRECTED scope (see sprint/context/context-story-SH3-3.md, the SM
// correction block), NOT the title:
//   • AC-1  drive the frame loop through @shared/loop.createLoop (retire the raw
//           `requestAnimationFrame(frame)` at main.ts:128/131)
//   • AC-2  mount the canvas via @shared/host-helpers.mountCanvas (retire the raw
//           `querySelector('#game')` + `getContext('2d')` at main.ts:19-22)
//   • AC-3  the @shared/rng-driven sim sequence is BYTE-IDENTICAL across the refactor
//           (green regression guard — the core is out of scope, so this must stay green)
//   • AC-4  KEEP the existing audio-unlock; do NOT adopt @shared/host-helpers.installAudioUnlock
//           (out of scope — fusing it into the input path is the hazard the SH3 epic warns of)
//   • AC-6  the core seams (createGame/stepGame/drawFrame) survive the refactor
//
// main.ts is a side-effectful boot module: it runs `document.querySelector` at import,
// throws without a real `<canvas id="game">`, and starts a requestAnimationFrame loop —
// none of which exists in the node vitest env. Its wiring is therefore pinned by the
// `?raw` source read — the reviewer-blessed idiom (pac-man SH3-4 tests/shell/
// main-host-adoption.test.ts; centipede cp1-6). The observable render half is the human
// screenshot in review; this file is the mechanical half.
//
// RED now: the AC-1/AC-2 groups fail because main.ts still hand-rolls both seams.
// The AC-3/AC-4/AC-6 groups are GREEN guards — they must STAY green so the GREEN
// refactor cannot drift the deterministic core, smuggle in installAudioUnlock, or rip
// out the render/step seams.

import { describe, it, expect } from 'vitest'
import mainSrc from '../src/main.ts?raw'
import { createPlayGame, stepGame, type GameState } from '../src/core/game.js'

// Strip line + block comments so a token that survives only in a doc comment (a gutted
// call, or a mention of the very symbol we scan for) can never satisfy a positive scan
// nor trip a negative one. Every assertion below runs against comment-free code.
// (cp2-1 R3 / pac-man SH3-4 idiom — the arcade source scanners read comments.)
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}
const code = stripComments(mainSrc)

describe('SH3-3 AC-1 — drive the frame loop through @shared/loop.createLoop', () => {
  it('imports createLoop from @shared/loop', () => {
    expect(code, 'main.ts must import from @shared/loop').toMatch(/from\s+['"]@shared\/loop['"]/)
    expect(code, 'the imported binding must be createLoop').toMatch(/\bcreateLoop\b/)
  })

  it('calls createLoop() to build the loop', () => {
    expect(code, 'main.ts must CALL createLoop(), not merely import it').toMatch(/\bcreateLoop\s*\(/)
  })

  it('starts the loop (loop.start())', () => {
    // asteroids' pattern (main.ts:132): `const loop = createLoop(...)` then `loop.start()`.
    // A built-but-unstarted loop would render a dead cabinet, so pin the .start() kick.
    expect(code, 'the createLoop instance must be started with .start()').toMatch(/\.start\s*\(\s*\)/)
  })

  it("retires the raw requestAnimationFrame loop (createLoop owns rAF now)", () => {
    // Today main.ts:128 and :131 call requestAnimationFrame(frame) directly. createLoop
    // owns the rAF pump internally (src/shared/loop.ts), so NO bare requestAnimationFrame
    // may remain in main.ts — proves adoption, not a dead raw loop beside a new import.
    expect(
      code,
      'main.ts must no longer call requestAnimationFrame — createLoop owns the rAF pump',
    ).not.toMatch(/\brequestAnimationFrame\b/)
  })
})

describe('SH3-3 AC-2 — mount the canvas via @shared/host-helpers.mountCanvas', () => {
  it('imports mountCanvas from @shared/host-helpers', () => {
    expect(code, 'main.ts must import from @shared/host-helpers').toMatch(
      /from\s+['"]@shared\/host-helpers['"]/,
    )
    expect(code, 'the imported binding must be mountCanvas').toMatch(/\bmountCanvas\b/)
  })

  it('calls mountCanvas() to acquire the #game canvas + 2d context', () => {
    expect(code, 'main.ts must CALL mountCanvas(), not merely import it').toMatch(/\bmountCanvas\s*\(/)
  })

  it("retires the hand-rolled querySelector('#game') mount", () => {
    // Today main.ts:19 does `document.querySelector<HTMLCanvasElement>('#game')`.
    // mountCanvas owns that lookup + the null guard now.
    expect(
      code,
      "main.ts must no longer hand-roll querySelector('#game') — mountCanvas replaces it",
    ).not.toMatch(/querySelector[^\n]*#game/)
  })

  it("retires the hand-rolled getContext('2d')", () => {
    // Today main.ts:21 does `canvas.getContext('2d')` + null-throw. mountCanvas returns
    // { canvas, ctx }, so the raw getContext must be gone from main.ts.
    expect(code, 'main.ts must no longer hand-roll getContext — mountCanvas returns the ctx').not.toMatch(
      /getContext\s*\(/,
    )
  })
})

describe('SH3-3 AC-4 — keep the existing audio-unlock; do NOT adopt installAudioUnlock (out of scope)', () => {
  it('still unlocks the audio engine via audio.resume()', () => {
    // main.ts:48-51 wires `audio.resume()` to the first pointerdown+keydown. The
    // loop/mount refactor must not disturb the unlock path.
    expect(code, "the audio-unlock (audio.resume()) must survive the refactor").toMatch(/audio\.resume\s*\(/)
  })

  it('does NOT adopt @shared/host-helpers.installAudioUnlock', () => {
    // Scope fence: installAudioUnlock fuses into the input-sampling path — a separate
    // SH3 story and the exact hazard the epic warns of. mountCanvas is imported from the
    // same module, so guard the specific symbol, not the module.
    expect(code, 'main.ts must not adopt installAudioUnlock in this story').not.toMatch(
      /\binstallAudioUnlock\b/,
    )
  })
})

describe('SH3-3 AC-6 — the core seams survive the host/loop refactor', () => {
  it('still seeds the core via createGame()', () => {
    expect(code, 'the sim seed seam must be untouched').toMatch(/\bcreateGame\s*\(/)
  })

  it('still steps the sim via stepGame()', () => {
    expect(code, 'stepGame must still be driven — now from inside createLoop step callback').toMatch(
      /\bstepGame\s*\(/,
    )
  })

  it('still renders via drawFrame()', () => {
    expect(code, 'drawFrame must still be driven — now from inside createLoop render callback').toMatch(
      /\bdrawFrame\s*\(/,
    )
  })
})

// ── AC-3 — determinism pin (GREEN regression guard) ──────────────────────────
// The refactor must not touch the pure core, so the @shared/rng-driven state sequence
// from successive stepGame() calls must be byte-identical before and after. This golden
// was captured from the current tree (seed 7, sampled every 40 frames to 600) and
// exercises spawn (rng advance: 4→8 ICBMs, seed 1767624623→3535249239) and descent
// (the position sum falls monotonically as warheads fall). If GREEN drifts the core,
// any sampled value moves and this reddens.
const round = (n: number): number => Math.round(n * 100) / 100
function digest(s: GameState): string {
  const icbmSum = s.icbms.reduce((a, i) => a + round(i.pos.h) + round(i.pos.v), 0)
  const cities = s.cities.filter((c) => c.alive).length
  return [round(s.rng.seed), s.icbms.length, round(icbmSum), s.explosions.length, s.score, s.wave, cities].join(':')
}

const GOLDEN_SEED = 7
const GOLDEN_SEQ = [
  '40=1767624623:4:1346.17:0:0:1:6',
  '80=1767624623:4:1318.32:0:0:1:6',
  '120=1767624623:4:1290.48:0:0:1:6',
  '160=1767624623:4:1262.66:0:0:1:6',
  '200=3535249239:8:2539.41:0:0:1:6',
  '240=3535249239:8:2483.29:0:0:1:6',
  '280=3535249239:8:2427.14:0:0:1:6',
  '320=3535249239:8:2371.01:0:0:1:6',
  '360=3535249239:8:2314.89:0:0:1:6',
  '400=3535249239:8:2258.78:0:0:1:6',
  '440=3535249239:8:2202.62:0:0:1:6',
  '480=3535249239:8:2146.48:0:0:1:6',
  '520=3535249239:8:2090.35:0:0:1:6',
  '560=3535249239:8:2034.21:0:0:1:6',
  '600=3535249239:8:1978.08:0:0:1:6',
]

function sample(): string[] {
  let g = createPlayGame(GOLDEN_SEED)
  const seq: string[] = []
  for (let i = 1; i <= 600; i++) {
    g = stepGame(g)
    if (i % 40 === 0) seq.push(`${i}=${digest(g)}`)
  }
  return seq
}

describe('SH3-3 AC-3 — the @shared/rng-driven sim sequence is pinned (no determinism drift)', () => {
  it('matches the captured golden sequence for a fixed seed', () => {
    expect(sample()).toEqual(GOLDEN_SEQ)
  })

  it('is reproducible: two same-seed runs are identical (guards against ambient entropy leaking in)', () => {
    expect(sample()).toEqual(sample())
  })

  it('is non-vacuous: the rng stream actually advances and ICBMs actually spawn', () => {
    // Refutes a golden of all-constant rows: the seed must change (a new wave drew rng)
    // and the ICBM count must grow across the run — otherwise the pin proves nothing.
    const seeds = new Set(sample().map((r) => r.split(':')[0].split('=')[1]))
    expect(seeds.size, 'the seed word must advance during the run (rng was drawn)').toBeGreaterThan(1)
    const counts = sample().map((r) => Number(r.split(':')[1]))
    expect(Math.max(...counts), 'ICBMs must spawn beyond the initial field').toBeGreaterThan(counts[0])
  })
})
