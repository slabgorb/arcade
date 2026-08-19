// plugins/defender/tests/df3-6-shell-wiring.test.ts
//
// Story df3-6 — RED phase (Tyr One-Handed / TEA). AC1: main.ts must stop being the df2
// static still and DRIVE the sim — step the scheduler once per fixed 60 Hz tick off
// @shared/loop, sample input each tick, and paint the DYNAMIC composer. main.ts is a
// side-effectful boot module (runs mountCanvas at import, starts a loop) that cannot boot
// in the node vitest env, so its wiring is pinned by the `?raw` source read — the
// reviewer-blessed idiom (missile-command sh3-3, pac-man SH3-4, centipede cp1-6). The
// observable render half is the human screenshot in the playtest; this file is the
// mechanical half.
//
// The load-bearing guard here is the NEGATIVE one: today main.ts calls
// requestAnimationFrame(frame) directly (twice); createLoop owns the rAF pump internally
// (src/shared/loop.ts), so a correct adoption leaves NO bare requestAnimationFrame. A
// positive `createLoop(` scan alone would pass on a dead import beside the old raw loop.
//
// RED now: main.ts imports composeStaticFrame + bare requestAnimationFrame and knows
// nothing of createLoop, stepSim, composeFrame or input.

import { describe, it, expect } from 'vitest'
import mainSrc from '../src/main.ts?raw'

// Strip line + block comments so a token surviving only in a doc comment can neither
// satisfy a positive scan nor trip a negative one. The `[^:]` guard leaves `http://` and
// other `://` URLs intact (they are not line comments). (missile-command sh3-3 idiom.)
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}
const code = stripComments(mainSrc)

describe('df3-6 AC1 — main.ts drives the frame loop through @shared/loop.createLoop', () => {
  it('imports createLoop from @shared/loop', () => {
    expect(code, 'main.ts must import from @shared/loop').toMatch(/from\s+['"]@shared\/loop['"]/)
    expect(code, 'the imported binding must be createLoop').toMatch(/\bcreateLoop\b/)
  })

  it('calls createLoop() and starts it', () => {
    expect(code, 'main.ts must CALL createLoop(), not merely import it').toMatch(/\bcreateLoop\s*\(/)
    expect(code, 'the loop must be started with .start()').toMatch(/\.start\s*\(\s*\)/)
  })

  it('retires the raw requestAnimationFrame loop — createLoop owns the rAF pump now', () => {
    // Today main.ts:24,26 call requestAnimationFrame(frame). createLoop pumps rAF
    // internally, so NO bare requestAnimationFrame may remain — this proves adoption, not
    // a new import bolted beside the old static-still loop.
    expect(
      code,
      'main.ts must no longer call requestAnimationFrame — createLoop owns the rAF pump',
    ).not.toMatch(/\brequestAnimationFrame\b/)
  })
})

describe('df3-6 AC1/AC3 — main.ts steps the sim and paints the DYNAMIC composer', () => {
  it('steps the sim via stepSim() inside the loop', () => {
    expect(code, 'main.ts must drive stepSim() — the once-per-tick advance').toMatch(/\bstepSim\s*\(/)
  })

  it('seeds the initial state via the df7-2 start seam (bootSession), not a bare createSim()', () => {
    // df3-6 seeded a bare running sim with `createSim()` at boot. df7-2 retired that: main.ts
    // now boots into the df7-1 attract phase via `bootSession()` (core/start.ts), and the
    // createSim reseed lives BEHIND that seam — main.ts calls createSim nowhere. The
    // "no bare createSim(" load-bearing negative is pinned by df7-2-main-wiring.test.ts;
    // here we keep the positive: main.ts still builds its initial state, now via bootSession.
    expect(code, 'main.ts must build initial state via bootSession() (the df7-2 start seam)').toMatch(
      /\bbootSession\s*\(/,
    )
  })

  it('paints composeFrame() — not the static title still', () => {
    // The df2 mount painted composeStaticFrame once. The live game must paint the dynamic
    // composer each frame. (Absence of composeStaticFrame is NOT asserted — an initial or
    // attract paint may legitimately keep it; what matters is that composeFrame drives.)
    expect(code, 'main.ts must call composeFrame() — the live scene, not the static still').toMatch(
      /\bcomposeFrame\s*\(/,
    )
  })
})

describe('df3-6 AC2 — main.ts samples input each tick and feeds the ship', () => {
  it('installs held-keys via @shared/held-keys', () => {
    expect(code, 'main.ts must read the keyboard through @shared/held-keys (installHeldKeys)').toMatch(
      /from\s+['"]@shared\/held-keys['"]/,
    )
    expect(code, 'the imported binding must be installHeldKeys').toMatch(/\binstallHeldKeys\b/)
  })

  it('maps the held keys to the pure Input snapshot via mapInput()', () => {
    expect(code, 'main.ts must turn held keys into the Input snapshot with mapInput()').toMatch(/\bmapInput\s*\(/)
  })
})

describe('df3-6 — the canvas mount survives (no regression to the df2 shell)', () => {
  it('still mounts the canvas via @shared/host-helpers.mountCanvas', () => {
    expect(code, 'main.ts must keep mounting the canvas via mountCanvas').toMatch(/\bmountCanvas\s*\(/)
  })
})
