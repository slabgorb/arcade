// plugins/defender/tests/pt1-20-main-wiring.test.ts
//
// Story pt1-20 — RED phase (Leeloo / TEA). The WIRING half. pt1-20-control-hint.test.ts pins the
// core capability (composeFrame draws CONTROL_HINT when controlHint:true); this file proves the
// shell actually TURNS IT ON so a real player sees it. Without this, the hint could ship in core
// and never reach the screen — the "built but never wired" trap (memory: never-defer-integration-wiring).
//
// The hint belongs on the ATTRACT screen (the self-playing demo the cabinet shows before a coin):
// main.ts already steps the real sim with attractInput during `session.phase === 'attract'` (df7-3),
// and paints every phase through composeFrame. GREEN passes `{ controlHint: <phase is attract> }`
// into that composeFrame call, so the demo carries the control hint but live play does not.
//
// main.ts is a side-effectful boot module (mountCanvas at import, createLoop().start()) that cannot
// boot in the node vitest env, so its wiring is pinned by the `?raw` source read — the reviewer-blessed
// idiom (df7-2/df7-3 main-wiring, df3-6 shell-wiring, missile-command sh3-3, pac-man SH3-4). The
// observable render half is the human screenshot in the pt1-20 visual playtest; this is the mechanical half.
//
// RED now: main.ts calls composeFrame with no control-hint option — `controlHint` appears nowhere.

import { describe, it, expect } from 'vitest'
import mainSrc from '../src/main.ts?raw'

// Strip line + block comments so a token surviving only in a doc comment can neither satisfy a
// positive scan nor trip a negative one. The `[^:]` guard leaves `http://` URLs intact.
// (df7-2 / df7-3 / df3-6 / missile-command sh3-3 idiom.)
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}
const code = stripComments(mainSrc)

describe('pt1-20 — main.ts shows the control hint on the attract screen', () => {
  it('passes a controlHint option into composeFrame (the hint is wired to the render, not dead in core)', () => {
    expect(
      code,
      'main.ts must request the control hint from composeFrame — pass a `controlHint` option, or the hint never reaches the screen',
    ).toMatch(/controlHint/)
  })

  it('gates the hint on the ATTRACT phase — it shows in the demo, NOT during live play', () => {
    // The flag must be tied to the attract phase, not unconditionally true (which would clutter the
    // playfield). Anchor `controlHint` next to `'attract'` so a bare `controlHint: true` cannot false-green.
    expect(
      code,
      "main.ts must gate controlHint on the attract phase (e.g. controlHint: session.phase === 'attract')",
    ).toMatch(/controlHint[\s\S]{0,80}attract|attract[\s\S]{0,80}controlHint/)
  })
})
