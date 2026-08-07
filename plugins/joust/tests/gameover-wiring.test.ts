// tests/gameover-wiring.test.ts
//
// Story jt10-6 — RED (Tyr / TEA). AC-2/AC-3: main.ts wires the cabinet's 'gameover'
// mode to the game-over overlay and the exit to highscore-or-attract. main.ts is a
// SHELL file that touches the canvas/DOM, so a node test cannot run its frame loop —
// what it CAN pin (the render.ts?raw source-wiring idiom jt10-5 used for select) is
// that the wiring LINES are present:
//   • the playing step DERIVES the mode from the stepped game's GOVER (modeForGover),
//     so an all-players-out frame lands in 'gameover' — killing the pre-jt10-6 state
//     where the frame loop's playing step HARD-CODES `{ mode: 'playing', game:
//     stepGame(...) }` (main.ts's pump callback, :277) and the game can never leave 'playing';
//   • the 'gameover' mode drives the overlay render (layoutGameOverScreen);
//   • the exit routes through the pure afterGameOver (→ 'highscore' iff the score
//     qualifies, else 'attract');
//   • the BLOCKING jt4-5 seam is preserved — the literal createGame( / stepGame( calls
//     survive (AC-3; demo-source.test.ts is the primary guard, restated here in this
//     story's voice so a seam break reddens jt10-6's own suite with a clear message).
//
// Deliberately NOT pinned by a node test (see the TEA assessment's Delivery Findings,
// left to the Reviewer + a human smoke test):
//   • the EXACT ~88-tick (~1.47s) hold before the exit (GOVWAT, JOUSTRV4.SRC:678) —
//     a shell timing constant; the hold's PRESENCE is pinned tolerantly below, the
//     value is a smoke-test / reference concern.
//   • pixel placement / colours — a human smoke test + reference capture.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const mainPath = join(srcDir, 'main.ts')

function readMain(): string {
  if (!existsSync(mainPath)) throw new Error('src/main.ts is missing')
  return readFileSync(mainPath, 'utf8')
}

// A single import statement's specifier + brace-list, so an assertion can check a
// symbol is imported FROM a given module (not merely mentioned in a comment).
function importsFrom(src: string, moduleMatch: RegExp, symbol: string): boolean {
  const importRe = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]/g
  for (const m of src.matchAll(importRe)) {
    const [, names, spec] = m
    if (moduleMatch.test(spec) && names.split(',').some((n) => n.trim().replace(/\s+as\s+.*/, '') === symbol)) {
      return true
    }
  }
  return false
}

describe('AC-2 main.ts wires the cabinet gameover mode to the overlay + the exit', () => {
  it('imports the mode hinge (modeForGover) and the exit (afterGameOver) from core/cabinet', () => {
    const src = readMain()
    expect(importsFrom(src, /core\/cabinet(\.js)?$/, 'modeForGover'), 'modeForGover from core/cabinet').toBe(true)
    expect(importsFrom(src, /core\/cabinet(\.js)?$/, 'afterGameOver'), 'afterGameOver from core/cabinet').toBe(true)
  })

  it('imports the game-over overlay (layoutGameOverScreen) from shell/gameOverScreen', () => {
    expect(
      importsFrom(readMain(), /shell\/gameOverScreen(\.js)?$/, 'layoutGameOverScreen'),
      'layoutGameOverScreen import',
    ).toBe(true)
  })

  it('DERIVES the playing mode from the stepped game GOVER — the game can reach gameover', () => {
    const src = readMain()
    // The crux. Pre-jt10-6, the playing step (main.ts pump callback, :277) is
    // `{ mode: 'playing', game: stepGame(...) }` —
    // the mode is a hard literal, so however the game settles, the cabinet stays
    // 'playing' forever and 'gameover' is unreachable in the live loop. jt10-6 must
    // derive the mode from the stepped game's settled GOVER.
    expect(src, 'main.ts maps the stepped GOVER to a mode via modeForGover').toMatch(/modeForGover\s*\(/)
    expect(src, 'main.ts reads the stepped game gover').toMatch(/\.gover\b/)
    // Restrictive (mutation-direction): the playing step must NOT re-hard-code
    // `mode: 'playing'` next to the stepGame call — that is exactly the pre-jt10-6
    // line this story removes.
    expect(
      src,
      "the playing step no longer hard-codes mode: 'playing' beside stepGame",
    ).not.toMatch(/mode:\s*['"]playing['"]\s*,\s*game:\s*stepGame\s*\(/)
  })

  it('branches on the gameover mode to render the overlay', () => {
    const src = readMain()
    // The 'gameover' mode literal drives the overlay branch...
    expect(src, "main.ts references the 'gameover' mode").toMatch(/['"]gameover['"]/)
    // ...painted through the overlay layout function.
    expect(src, 'main.ts calls layoutGameOverScreen to lay the banner out').toMatch(/layoutGameOverScreen\s*\(/)
  })

  it('routes OUT of gameover through the pure afterGameOver gate', () => {
    const src = readMain()
    expect(src, 'main.ts calls afterGameOver to leave gameover').toMatch(/afterGameOver\s*\(/)
  })

  it('HOLDS the overlay before the exit — the exit is not fired every frame', () => {
    const src = readMain()
    // GOVWAT holds the message ~88 ticks (JOUSTRV4.SRC:678) before JMP GAMEND. If main.ts
    // called afterGameOver every gameover frame the banner would flash for one frame and
    // route straight out. Tolerant on the identifier — any game-over hold/timer/elapsed
    // tracker satisfies this; the Reviewer + human smoke test confirm the hold actually
    // lasts and the banner is visible. (Same shape as jt10-5's rising-edge start guard.)
    expect(
      /\b\w*(gameover|gover|govwat|govr)\w*(hold|wait|timer|ticks?|elapsed|frames?|delay|count|until|since)\w*\b|\b\w*(hold|wait|timer|ticks?|elapsed|frames?|delay|count|until|since)\w*(gameover|gover|govwat|govr)\w*\b/i.test(
        src,
      ),
      'main.ts tracks a game-over hold before routing on (a timer / frame counter)',
    ).toBe(true)
  })
})

describe('AC-3 (BLOCKING) main.ts preserves the jt4-5 createGame/stepGame seam', () => {
  it('keeps the literal createGame( and stepGame( calls (demo-source.test.ts seam)', () => {
    const src = readMain()
    // demo-source.test.ts is the PRIMARY guard for this seam; restated here so a seam
    // break during the gameover wiring reddens jt10-6's own suite with a clear message.
    // The context's AC-3 marks this BLOCKING: the gameover transition must NOT route
    // every frame through a cabinet step (stepPlaying) in a way that erases these calls.
    expect(src, 'main.ts still builds the session with a literal createGame( call').toMatch(/createGame\s*\(/)
    expect(src, 'main.ts still steps the session with a literal stepGame( call').toMatch(/stepGame\s*\(/)
  })
})
