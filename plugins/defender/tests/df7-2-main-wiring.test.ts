// plugins/defender/tests/df7-2-main-wiring.test.ts
//
// Story df7-2 — RED phase (Leeloo / TEA). AC2: plugins/defender/src/main.ts must stop
// booting a BARE running sim and instead boot into df7-1's attract phase via the pure
// start seam (core/start.ts, see df7-2-start-transition.test.ts), starting play only on
// the start/coin input. main.ts is a side-effectful boot module (mountCanvas at import,
// installHeldKeys, createLoop().start()) that cannot boot in the node vitest env, so its
// wiring is pinned by the `?raw` source read — the reviewer-blessed idiom (df3-6
// shell-wiring, missile-command sh3-3, pac-man SH3-4, centipede cp1-6). The observable
// render half is the human screenshot in the df7 visual playtest; this file is the
// mechanical half.
//
// The load-bearing guard is the NEGATIVE one: today main.ts:28 does
// `let sim = createSim(...)` and steps it unconditionally every tick — the "bare running
// sim" the story retires. A correct adoption moves the reseed behind bootSession/
// advanceStart, so NO bare `createSim(` survives in main.ts. A positive `bootSession(`
// scan alone would pass on a dead import bolted beside the old boot; the negative proves
// the boot was actually rewired (df3-6's no-bare-requestAnimationFrame idiom).
//
// RED now: main.ts imports createSim + stepSim and knows nothing of core/start,
// bootSession, advanceStart, or a play-phase step gate.

import { describe, it, expect } from 'vitest'
import mainSrc from '../src/main.ts?raw'

// Strip line + block comments so a token surviving only in a doc comment can neither
// satisfy a positive scan nor trip a negative one. The `[^:]` guard leaves `http://` and
// other `://` URLs intact (they are not line comments). (df3-6 / missile-command sh3-3 idiom.)
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}
const code = stripComments(mainSrc)

describe('df7-2 AC2 — main.ts boots into attract via the pure start seam, not a bare running sim', () => {
  it('imports the df7-2 start seam from ./core/start', () => {
    expect(code, 'main.ts must import the start seam (core/start.ts)').toMatch(
      /from\s+['"]\.\/core\/start(\.js)?['"]/,
    )
  })

  it('boots a session with bootSession() — into the attract phase', () => {
    expect(code, 'main.ts must boot the cabinet with bootSession()').toMatch(/\bbootSession\s*\(/)
  })

  it('drives the phase machine each frame with advanceStart()', () => {
    expect(code, 'main.ts must advance the start machine via advanceStart()').toMatch(/\badvanceStart\s*\(/)
  })

  it('gates the sim step on the play phase (no live game runs on the attract screen)', () => {
    // stepSim may only run in play — the attract screen must not advance a live game. main.ts
    // must reference the 'play' phase to gate the step (the exact gate shape is Dev's).
    expect(code, "main.ts must gate stepping on the 'play' phase").toMatch(/['"]play['"]/)
  })

  it('LOAD-BEARING NEGATIVE: main.ts no longer calls createSim directly — the reseed moved into the pure seam', () => {
    // Today main.ts:28 `let sim = createSim(...)` is the bare boot. After df7-2 the reseed
    // lives behind bootSession/advanceStart (core/start.ts), so main.ts calls createSim
    // NOWHERE. This is the proof of adoption, not a new import bolted beside the old boot.
    expect(
      code,
      'main.ts must not call createSim directly anymore — it boots via bootSession and reseeds via advanceStart',
    ).not.toMatch(/\bcreateSim\s*\(/)
  })
})
