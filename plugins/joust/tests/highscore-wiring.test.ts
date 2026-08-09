// tests/highscore-wiring.test.ts
//
// Story jt10-7 — RED (Tyr / TEA). The main.ts WIRING for the high-score screen:
// the persistence seam (@shared/highscore's makeHighScoreStorage — the ONE thing
// that touches localStorage), the core entry verb (beginEntry / enterInitial /
// isEntryComplete / commitEntry / promptForRank), and the shell overlay
// (layoutHighscoreScreen). What a node test CAN pin here is the IMPORT graph and
// the disappearance of jt10-6's empty-table placeholder — not pixels, not the
// event loop's exact shape (a human smoke test at /joust/ confirms the screen).
//
// The confirm is an EDGE and the edge lives in the SHELL: main.ts already keeps
// prevFlap1/prevFlap2 (the rising-edge discipline it uses for start/flap). The
// commit must ride that edge, not a held check — else the 3rd letter commits every
// frame the flap button stays down (lang-review #14: a derived edge must be taken
// where it cannot double-fire). This suite pins the discipline's PRESENCE; the
// behaviour is a human smoke test.

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
// symbol is imported FROM a given module (not merely mentioned in a comment) —
// lang-review #15/#25: anchor to the import, not a bare keyword. (Shared idiom with
// select-wiring.test.ts.)
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

// ─────────────────────────────────────────────────────────────────────────────
// AC4 — the persistence seam. makeHighScoreStorage is the ONLY localStorage touch,
// keyed for 'joust' with the 'wave' domain guard (the fleet convention:
// tempest→'level', centipede/star-wars→'wave'). joust has a `wave`, so 'wave'.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC4 main.ts wires the joust high-score persistence seam', () => {
  it('imports makeHighScoreStorage + makeHighScoreRowGuard from @shared/highscore', () => {
    const src = readMain()
    expect(importsFrom(src, /@shared\/highscore$/, 'makeHighScoreStorage'), 'makeHighScoreStorage import').toBe(true)
    expect(importsFrom(src, /@shared\/highscore$/, 'makeHighScoreRowGuard'), 'makeHighScoreRowGuard import').toBe(true)
  })

  it("binds the storage to the 'joust' game id with the 'wave' domain guard", () => {
    const src = readMain()
    // Kills "the table is persisted under the wrong game id / no domain guard" — the
    // lobby reads `joust-high-scores`, and a wrong domainKey silently drops rows.
    expect(src, "makeHighScoreStorage('joust', makeHighScoreRowGuard('wave'), 'wave')").toMatch(
      /makeHighScoreStorage\(\s*['"]joust['"]\s*,\s*makeHighScoreRowGuard\(\s*['"]wave['"]\s*\)\s*,\s*['"]wave['"]\s*\)/,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC1 — the empty-table PLACEHOLDER is gone. jt10-6 wired `afterGameOver(cabinet,
// [])`; jt10-7 must feed the PERSISTED table so the qualify gate is real.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC1 main.ts feeds the persisted table into afterGameOver (placeholder removed)', () => {
  it('no longer calls afterGameOver with the empty-array placeholder', () => {
    const src = readMain()
    // Kills the jt10-6 stopgap literally: `afterGameOver(cabinet, [])` routed every
    // positive score to 'highscore' against an empty board. It must read the table.
    expect(src, "the jt10-6 `afterGameOver(cabinet, [])` placeholder is replaced").not.toMatch(
      /afterGameOver\(\s*cabinet\s*,\s*\[\s*\]\s*\)/,
    )
    expect(src, 'afterGameOver is still wired').toContain('afterGameOver(')
    // The routed table comes from the persisted storage, loaded once.
    expect(src, 'the persisted table is loaded').toMatch(/\.load\(\)/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC2/AC3 — the entry verb + the rank-conditional prompt are wired from core, and
// the overlay from shell. The commit rides the prevFlap rising edge (#14).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC2/AC3 main.ts wires the entry verb, the prompt, and the overlay', () => {
  it('imports the entry verb (beginEntry / enterInitial / isEntryComplete / commitEntry) from core/highscore', () => {
    const src = readMain()
    for (const sym of ['beginEntry', 'enterInitial', 'isEntryComplete', 'commitEntry']) {
      expect(importsFrom(src, /core\/highscore(\.js)?$/, sym), `${sym} from core/highscore`).toBe(true)
    }
  })

  it('feeds letter keydowns to enterInitial ONLY while on the highscore screen (mode-guarded)', () => {
    const src = readMain()
    // Kills "every keydown feeds enterInitial regardless of mode" — the call must be
    // guarded by cabinet.mode === 'highscore', in the SAME statement (not merely
    // present somewhere in the file). e.key (the character) is what the verb consumes.
    expect(
      src,
      "enterInitial(entry, e.key) is gated by cabinet.mode === 'highscore'",
    ).toMatch(/cabinet\.mode === 'highscore'[^\n]*enterInitial\(\s*entry\s*,\s*e\.key\s*\)/)
  })

  it('imports promptForRank (the rank-conditional prompt) from core/highscore', () => {
    expect(importsFrom(readMain(), /core\/highscore(\.js)?$/, 'promptForRank'), 'promptForRank import').toBe(true)
  })

  it('imports the overlay (layoutHighscoreScreen) from shell/highscoreScreen', () => {
    expect(
      importsFrom(readMain(), /shell\/highscoreScreen(\.js)?$/, 'layoutHighscoreScreen'),
      'layoutHighscoreScreen import',
    ).toBe(true)
  })

  it('commits on the flap RISING edge — the completeness check is ANDed with a !prevFlap guard, not a held check (#14)', () => {
    const src = readMain()
    // Kills "commit on a HELD flap" — a level check re-inserts the row every frame the
    // button stays down. The guard must AND isEntryComplete with the NEGATION of a
    // per-frame flap flag (the rising edge), in the SAME condition. Anchored to the
    // commit guard specifically (isEntryComplete appears only on the commit path), so
    // the unrelated player-input prevFlap1/prevFlap2 cannot satisfy it. Dropping the
    // `!prev…Flap` term (leaving `flapHeld && isEntryComplete`) reddens THIS.
    expect(src, 'commitEntry is called on the highscore screen').toMatch(
      /highScoreTable\s*=\s*commitEntry\(/,
    )
    expect(
      src,
      'the commit is gated by isEntryComplete AND a rising-edge (!prevFlap) term in one condition',
    ).toMatch(
      /!prev\w*[Ff]lap\w*\s*&&\s*isEntryComplete\(\s*entry\s*\)|isEntryComplete\(\s*entry\s*\)\s*&&\s*!prev\w*[Ff]lap\w*/,
    )
    // …and that rising-edge flag is advanced every frame (so the edge is real, not a
    // constant that would make the negation always-true).
    expect(src, 'the rising-edge flag is updated each frame from the held level').toMatch(
      /prev\w*[Ff]lap\w*\s*=\s*flapHeld/,
    )
  })

  it('threads (table, initials, score, wave) into commitEntry in that order', () => {
    const src = readMain()
    // Kills a silent entryScore/entryWave swap — both are numbers, so a swap compiles,
    // passes commitEntry's pure unit tests (correct args in isolation), and corrupts
    // the persisted table. Pin the exact call-site argument order.
    expect(src, "commitEntry(highScoreTable, entry.initials, entryScore, entryWave)").toMatch(
      /commitEntry\(\s*highScoreTable\s*,\s*entry\.initials\s*,\s*entryScore\s*,\s*entryWave\s*\)/,
    )
  })
})
