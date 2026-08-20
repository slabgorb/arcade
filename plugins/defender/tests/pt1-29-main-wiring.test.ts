// plugins/defender/tests/pt1-29-main-wiring.test.ts
//
// Story pt1-29 — RED phase (O'Brien / TEA). The WIRING half. pt1-29-hud-highscore-smartbomb.test.ts
// pins the core capability (composeFrame draws the smart-bomb stock from state.smartBombs, and the
// in-play high score from options.highScore). This file proves the shell actually FEEDS the high
// score in, so a real player sees it — the "built but never wired" trap (memory:
// never-defer-integration-wiring). The smart-bomb stock needs no wiring: it reads state.smartBombs,
// already on the SimState main.ts composes every frame.
//
// The in-play high score is the top of the persisted hall-of-fame board (highscore.ts / the shell's
// session.board — main.ts already loads it and passes it into composeFrame's game-over `hof` payload).
// GREEN sources the live-play high score from that board — `session.board[0]?.score` — and passes it
// as `options.highScore` into the SAME composeFrame call that already runs every phase.
//
// main.ts is a side-effectful boot module (mountCanvas at import, createLoop().start()) that cannot
// boot in the node vitest env, so its wiring is pinned by the `?raw` source read — the reviewer-blessed
// idiom (pt1-20 main-wiring, df7-2/df7-3 main-wiring, df3-6 shell-wiring, missile-command sh3-3, pac-man
// SH3-4). The observable render half is the human screenshot in the epic's visual playtest; this is the
// mechanical half.
//
// RED now: main.ts calls composeFrame with no highScore option — `highScore` appears nowhere.

import { describe, it, expect } from 'vitest'
import mainSrc from '../src/main.ts?raw'

// Strip line + block comments so a token surviving only in a doc comment can neither satisfy a
// positive scan nor trip a negative one. The `[^:]` guard leaves `http://` URLs intact.
// (pt1-20 / df7-2 / df7-3 / df3-6 / missile-command sh3-3 idiom.)
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}
const code = stripComments(mainSrc)

describe('pt1-29 — main.ts feeds the in-play high score into composeFrame', () => {
  it('passes a highScore option into composeFrame (the readout is wired to the render, not dead in core)', () => {
    // Anchor to the composeFrame( call itself (lang-review #15/#25): a bare /highScore/ over the
    // whole file would false-green on an unrelated identifier — main.ts already has
    // `highScoreStorage.save(session.board)`. Require the option KEY (`highScore:`, with the colon,
    // which highScoreStorage.save cannot satisfy) INSIDE a composeFrame(...) argument list.
    expect(
      code,
      'main.ts must pass a `highScore:` option inside the composeFrame(...) call, or the in-play high score never reaches the screen',
    ).toMatch(/composeFrame\s*\([\s\S]*?highScore\s*:/)
  })

  it('sources the high score from the persisted board (session.board), not a hard-coded literal', () => {
    // The in-play high score is the top of the hall-of-fame board main.ts already loads/persists.
    // Anchor the option KEY `highScore:` next to `board` so a placeholder `highScore: 0` cannot
    // false-green — the value must come from the board (e.g. highScore: session.board[0]?.score ?? 0).
    // The `:` excludes the pre-existing `highScoreStorage.save(session.board)` line, which would
    // otherwise satisfy a bare-`highScore`-near-`board` scan.
    expect(
      code,
      'main.ts must source highScore from session.board (e.g. highScore: session.board[0]?.score) so the readout shows the real high score',
    ).toMatch(/highScore\s*:[\s\S]{0,80}board/)
  })
})
