// plugins/defender/tests/df7-3-main-wiring.test.ts
//
// Story df7-3 — RED phase (Leeloo / TEA). AC1/AC2 wiring half. df7-2 left main.ts booting
// into attract holding a fresh, UNstepped sim ("df7-3 gives attract its self-playing
// driver") and exiting attract only on the START button. df7-3 wires the pure auto-player
// (core/attract.ts, see df7-3-attract.test.ts) into the boot loop so that DURING attract:
//   1. the REAL sim is stepped by attractInput(session.sim) — the same stepSim play uses,
//      so the attract screen shows actual gameplay (jt13 lesson: no forked demo path); and
//   2. ANY player input exits attract -> setup — startRequested is computed from the HUMAN
//      keyboard via hasPlayerInput(mapInput(held)), NOT from attractInput (which would make
//      the demo instantly exit itself).
//
// main.ts is a side-effectful boot module (mountCanvas at import, installHeldKeys,
// createLoop().start()) that cannot boot in the node vitest env, so its wiring is pinned by
// the `?raw` source read — the reviewer-blessed idiom (df7-2 main-wiring, df3-6 shell-wiring,
// missile-command sh3-3, pac-man SH3-4). The observable render half is the human screenshot
// in the df7 visual playtest; this file is the mechanical half.
//
// RED now: main.ts imports neither core/attract, attractInput nor hasPlayerInput, and steps
// the sim only in play. GREEN wires the attract driver above.

import { describe, it, expect } from 'vitest'
import mainSrc from '../src/main.ts?raw'

// Strip line + block comments so a token surviving only in a doc comment can neither satisfy
// a positive scan nor trip a negative one. The `[^:]` guard leaves `http://` and other `://`
// URLs intact (they are not line comments). (df7-2 / df3-6 / missile-command sh3-3 idiom.)
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}
const code = stripComments(mainSrc)

describe('df7-3 AC1 — main.ts drives the REAL sim with the pure auto-player during attract', () => {
  it('imports the df7-3 attract driver from ./core/attract', () => {
    expect(code, 'main.ts must import the attract auto-player (core/attract.ts)').toMatch(
      /from\s+['"]\.\/core\/attract(\.js)?['"]/,
    )
  })

  it('steps the sim with attractInput(...) — the SAME stepSim, no forked demo path', () => {
    // The load-bearing positive: the demo drives the REAL sim by feeding attractInput's output
    // straight into stepSim. Anchor to the stepSim(<sim>, attractInput( shape so a dead import
    // bolted beside the old boot cannot false-green — the auto-player must actually reach the step.
    expect(code, "main.ts must step the real sim via stepSim(session.sim, attractInput(...)) in attract").toMatch(
      /stepSim\s*\(\s*[\w.]+\s*,\s*attractInput\s*\(/,
    )
  })
})

describe('df7-3 AC2 — ANY human input during attract exits attract -> setup', () => {
  it('computes the attract exit from the HUMAN keyboard via hasPlayerInput(mapInput(held))', () => {
    // The exit signal must watch the HUMAN input snapshot, never attractInput — the demo drives
    // the sim but does NOT count as "player input", or attract would exit on frame 1. Pinning
    // hasPlayerInput(mapInput(...)) proves the exit reads the keyboard, not the auto-player.
    expect(
      code,
      'main.ts must exit attract on any human key: hasPlayerInput(mapInput(held)) feeds startRequested',
    ).toMatch(/hasPlayerInput\s*\(\s*mapInput\s*\(/)
  })

  it('still feeds startRequested to the phase machine (the df7-1 attract -> setup edge)', () => {
    // The broadened any-input signal still flows through df7-1's startRequested edge — df7-3
    // widens WHAT sets it, it does not bypass the phase machine.
    expect(code, 'the any-input exit must still drive startRequested (df7-1 attract->setup)').toMatch(
      /startRequested\s*:/,
    )
  })
})
