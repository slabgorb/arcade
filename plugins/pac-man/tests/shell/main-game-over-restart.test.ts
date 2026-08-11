// tests/shell/main-game-over-restart.test.ts
//
// Story pm4-10 (RED, TEA / Leeloo) — the SHELL half: `src/main.ts` must stop
// hand-rolling the game-over restart and let the core timeout own it. Today
// main.ts does two things pm4-10 retires:
//   1. It SKIPS the sim in game-over (`if (game.phase === 'game-over') return`
//      before `stepGame`), so the core game-over hold could never tick.
//   2. It restarts the run itself on Enter (`… phase === 'game-over' … 'Enter' …
//      game = createGameState(…)`) — the "manual Enter-to-restart" the story
//      names.
// With pm4-10's core timeout wired, the sim must RUN during game-over (so the
// hold counts down and `advancePhase` returns the cabinet to attract), and the
// manual Enter restart must be GONE — attract + a START/coin (pm4-6) is now the
// only way back into play.
//
// main.ts is a side-effectful boot module (querySelector + rAF at import) that
// cannot run under node vitest, so — exactly like pm4-6's main-lifecycle.test.ts
// and SH3-4's main-host-adoption.test.ts — its wiring is pinned by a `?raw`
// SOURCE scan with comments stripped (a token surviving only in a doc comment can
// never satisfy or defeat a match). This is the MECHANICAL half; the AUTHORITATIVE
// observable half — sit on a real game-over, watch it return to the attract demo
// on its own with no key — is the human/Playwright playtest in review (the pm4-6
// precedent: "the observable render half is the screenshot; this file is the
// mechanical half"). RED now: both retired constructs are still present.

import { describe, it, expect } from 'vitest'
import mainSrc from '../../src/main.ts?raw'

// Strip block + line comments so a mention in prose can't satisfy (or defeat) a
// scan (cp2-1 R3 idiom, as in main-lifecycle.test.ts).
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

const code = stripComments(mainSrc)

describe('pm4-10: main.ts lets the core timeout own the game-over -> attract return', () => {
  it('still drives the sim through stepGame (the sim seam is untouched)', () => {
    expect(code, 'the sim must still be stepped from the frame loop').toMatch(/stepGame\(/)
  })

  it('no longer SKIPS the sim in game-over — the hold must be allowed to tick', () => {
    // The early-out that returns before stepGame whenever the phase is game-over
    // must be gone, or the core timeout can never count down.
    expect(
      code,
      "main.ts must not short-circuit game-over before stepGame — the timeout needs the frames",
    ).not.toMatch(/phase\s*===\s*'game-over'\s*\)\s*return/)
  })

  it('no longer restarts the run itself on Enter (the manual Enter-to-restart is retired)', () => {
    // The hand-rolled restart: a game-over Enter branch that re-seeds the game via
    // createGameState. Its removal is the core of the story — the cabinet returns
    // to attract on the timeout, and a START/coin (pm4-6) begins the next game.
    expect(
      code,
      'the manual Enter-to-restart must be removed — the core timeout replaces it',
    ).not.toMatch(/game-over'[\s\S]{0,200}'Enter'[\s\S]{0,120}createGameState/)
  })
})
