// plugins/defender/tests/df7-4-main-wiring.test.ts
//
// Story df7-4 — RED phase (Atia of the Julii / TEA). The SHELL half of the name-entry flow:
// main.ts must (1) LOAD the df5-6 board from one-origin localStorage and seed it onto the
// booted Session, (2) ROUTE name-entry keys while an entry is open (Enter → confirm, letters
// → step), (3) SAVE the board through the shared storage seam on commit, and (4) pass the
// board + in-progress initials into composeFrame so the HOFIN display renders.
//
// A source-text scan over main.ts (the df7-2/df7-3 `?raw` technique): main.ts mounts a canvas
// and starts a rAF loop at import, so it cannot be booted in the node vitest env — its WIRING
// is pinned as text. Comments are stripped first so a token surviving only in a doc comment
// can neither satisfy a positive scan nor trip a negative one (df7-3-main-wiring precedent),
// and every anchor keys on a call SHAPE, not a bare keyword (lang-review #15/#25).
//
// ─── WHY THIS IS RED ──────────────────────────────────────────────────────────────────
// main.ts today boots `bootSession(rand)` (one arg), passes `composeFrame(session.sim, …)`
// (three args, no board), never imports makeDefenderHighScoreStorage, and has no name-entry
// keydown path. Each anchor below is absent → RED until GREEN wires the shell.

import { describe, it, expect } from 'vitest'
import mainSrc from '../src/main.ts?raw'

/** Strip line + block comments so a token surviving only in a doc comment neither satisfies a
 *  positive scan nor trips a negative one. The `[^:]` guard leaves `http://` … intact. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}
const code = stripComments(mainSrc)

describe('df7-4 main-wiring — the shell loads and seeds the hall-of-fame board', () => {
  it('the source under scan is non-trivial (the strip did not eat the file)', () => {
    // lang-review #18: a broken stripComments returning '' would make every negative scan
    // below pass vacuously. Anchor the population first.
    expect(code.length, 'stripped main.ts is suspiciously small — the comment strip likely over-matched').toBeGreaterThan(400)
  })

  it('main.ts loads the board through the df5-6 shared storage seam (makeDefenderHighScoreStorage)', () => {
    // AC1: "no new persistence" — the board is loaded through @shared makeHighScoreStorage,
    // never hand-rolled. The df5-6 seam exists (shell/highscore.ts); df7-4 must finally CALL it.
    expect(
      /makeDefenderHighScoreStorage\s*\(/.test(code),
      'main.ts never builds the df5-6 hall-of-fame storage — the board is never loaded/persisted',
    ).toBe(true)
  })

  it('the LOADED board is seeded onto the Session — bootSession(_, storage.load()), the value tied into the call', () => {
    // Anchor the whole CALL CHAIN, not two independently-satisfiable shapes: the SECOND argument
    // to bootSession must be a `.load()` result. A bare `.load(` + a `bootSession(x, y)` shape
    // check would both stay green even if the loaded board were computed and discarded and
    // bootSession seeded an empty literal (mutation-tested — that regression is exactly what this
    // must catch). Requiring `.load()` to flow INTO bootSession's board slot closes it.
    expect(
      /bootSession\s*\(\s*[\w.]+\s*,\s*[\w.]+\.load\s*\(\s*\)\s*\)/.test(code),
      'the value from the storage .load() is not passed into bootSession — the saved board is loaded and then discarded, never seeded onto the Session',
    ).toBe(true)
  })
})

describe('df7-4 main-wiring — the shell drives the initials entry and saves on commit', () => {
  it('main.ts routes name-entry keys through the core verbs (step + confirm)', () => {
    expect(
      /stepSessionInitials\s*\(/.test(code),
      'main.ts never calls stepSessionInitials — typing initials cannot advance the buffer',
    ).toBe(true)
    expect(
      /confirmSessionInitials\s*\(/.test(code),
      'main.ts never calls confirmSessionInitials — the player can never commit their initials',
    ).toBe(true)
  })

  it('the name-entry keydown path is GATED on an open entry — `if (session.nameEntry === null) return`', () => {
    // The initials keys must only be consumed while an entry is open — otherwise Enter/letters
    // are swallowed during normal play. Anchor on the GUARD SHAPE, not a bare `nameEntry` token:
    // `nameEntry` also appears in the composeFrame render call, so a token match stays green even
    // if the keydown guard were deleted (mutation-tested). The `=== null) return` early-return is
    // the gate itself; the dwell counter's `=== null) gameOverDwell` does not match it.
    expect(
      /if\s*\(\s*session\.nameEntry\s*===\s*null\s*\)\s*return/.test(code),
      'the initials keydown handler is not gated on an open entry (no `if (session.nameEntry === null) return`) — it would consume play/attract keys',
    ).toBe(true)
  })

  it('main.ts persists the board through the shared seam on commit (.save), never a hand-rolled localStorage board', () => {
    expect(/\.save\s*\(/.test(code), 'the board is never .save()d — a committed high score does not survive a reload').toBe(true)
    // Negative: no bespoke high-score persistence straight onto localStorage (AC1 "no new
    // persistence"; the df5-6 scan owns the src-wide version — this pins main.ts specifically).
    const handRolledBoard = /\blocalStorage\s*\.\s*\w/.test(code) && /high[-\s]?score/i.test(code)
    expect(handRolledBoard, 'main.ts touches localStorage for high scores directly — that is exactly the bespoke persistence AC1 forbids').toBe(false)
  })
})

describe('df7-4 main-wiring — the render is fed the board + initials so the HOFIN display draws', () => {
  it('composeFrame is called with the hall-of-fame payload (board + nameEntry), not sim alone', () => {
    // Today: composeFrame(session.sim, LOGICAL_WIDTH, LOGICAL_HEIGHT). df7-4 threads the 4th
    // arg carrying board + nameEntry so scene.ts can draw the HOF screen. Anchor on the SINGLE
    // composeFrame CALL: `composeFrame(session.sim, … board … nameEntry …)`, bounded by the call's
    // own closing paren (`[^)]*`, and main.ts has no inner parens in this call). A `[^;]*` bound is
    // vacuous here — main.ts is written without semicolons, so it would span to end-of-file and
    // any later mention of both tokens would false-green a regression to the bare 3-arg call
    // (mutation-tested). Tying both tokens to the same `composeFrame(session.sim, …)` call closes it.
    expect(
      /composeFrame\s*\(\s*session\.sim\b[^)]*\bboard\b[^)]*\bnameEntry\b[^)]*\)/s.test(code),
      'composeFrame is fed session.sim alone (or the board/initials sit outside its call) — the HOFIN display cannot draw',
    ).toBe(true)
  })
})
