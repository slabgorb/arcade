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
    expect(
      /\.load\s*\(/.test(code),
      'the storage seam is built but never .load()ed — the saved board is not read at boot',
    ).toBe(true)
  })

  it('the loaded board is seeded onto the Session (bootSession is called with the board, not bare)', () => {
    // bootSession(rand, board) — the second argument carries the loaded board into the pure core.
    expect(
      /bootSession\s*\(\s*[\w.]+\s*,\s*[\w.$]+/.test(code),
      'bootSession is still called with one argument — the loaded board never reaches the core Session',
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

  it('the name-entry keydown path is gated on an OPEN entry (session.nameEntry), not always-on', () => {
    // The initials keys must only be consumed while an entry is open — otherwise Enter/letters
    // are swallowed during normal play. Anchor on the gate reading session.nameEntry.
    expect(
      /\bnameEntry\b/.test(code),
      "main.ts never reads session.nameEntry — the initials keydown path is ungated (it would eat play keys)",
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
    // arg carrying board + nameEntry so scene.ts can draw the HOF screen. Anchor on a
    // composeFrame call whose arguments mention BOTH board and nameEntry.
    expect(
      /composeFrame\s*\([^;]*\bboard\b[^;]*\bnameEntry\b/s.test(code) ||
        /composeFrame\s*\([^;]*\bnameEntry\b[^;]*\bboard\b/s.test(code),
      'composeFrame is still fed session.sim alone — the board and in-progress initials never reach the renderer, so the HOFIN display cannot draw',
    ).toBe(true)
  })
})
