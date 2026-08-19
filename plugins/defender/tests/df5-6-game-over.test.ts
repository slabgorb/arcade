// tests/df5-6-game-over.test.ts
//
// Story df5-6 — RED phase (Leeloo / TEA). AC1 (the pure lives<0 → game-over reducer)
// and AC4 (the df7-deferral design note). Decision C (design spec §5): the end of the
// game is PURE-FIRST here; df7 wires it into the attract→play→death→game-over phase
// machine and renders the screens. This suite proves the pure condition, and that the
// deliverable records what is intentionally NOT built here.
//
// ─── THE ROM, DECODED (all lines from tool output) ───────────────────────────────────
// The player-end path (DEFA7.SRC:1391-1423): PLE01 loads the current player's ships
//   PLE01  LDA CURPLR        SHIPS LEFT?          DEFA7.SRC:1391
//          LDB PLAS,X                             DEFA7.SRC:1393   (PLAS = active ships)
//          BNE PLE02         YES  (ships remain)  DEFA7.SRC:1394
//          ...
//          BEQ PLE2          YES, GAME OVER       DEFA7.SRC:1397   (1P, no ships)
//   PLE2   LDU #GO           GAME OVER            DEFA7.SRC:1423
// i.e. game over the moment the ship count is exhausted. df5-3 models the men counter as
// ScoreState.men (STARTING_MEN=3, NSHIP FCB $03, ROMC8.SRC:802); loseMan() decrements it.
// The story's condition is `men < 0` — the men counter has fallen BELOW the last ship.
//
// ─── WHAT GREEN (Dev) MUST SHIP ──────────────────────────────────────────────────────
//   plugins/defender/src/core/endgame.ts — a PURE `isGameOver(state: ScoreState): boolean`
//     that CONSUMES df5-3's ScoreState (does not re-implement the counter) and returns
//     `state.men < 0`, cited to DEFA7.SRC:1394/1423. No phase-machine wiring, no attract
//     loop (Decision C — that is df7). purity.test.ts covers it automatically.
//   A glossary row + a byte-verified claim (docs/rom-study/claims/) pinning the
//     out-of-ships → game-over condition (PLE2, DEFA7.SRC:1423), the df1-1 gate.
//   A df7-deferral note in the module recording that the phase-machine WIRING
//     (attract→play→death→game-over) + the HUD render defer to df7 (Decision C), and that
//     2P alternating handoff defers to df7 (Decision D) with DEFA7.SRC:1179-1237 preserved.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createScore, loseMan, type ScoreState } from '../src/core/score.js'
// RED until GREEN creates the module — a self-describing import so the failure names the
// absent feature, not a bare module-resolution stack trace.
import { isGameOver } from '../src/core/endgame.js'
// The cited-mapping (glossary + claim) assertions live in df5-6-identity.test.ts, which
// reads only the dossier so it is red independently of this module.

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(pluginRoot, '..', '..')
const ENDGAME_SRC = join(pluginRoot, 'src', 'core', 'endgame.ts')
const DESIGN_SPEC = join(
  repoRoot,
  'docs',
  'superpowers',
  'specs',
  '2026-08-17-defender-df5-game-structure-scanner-design.md',
)

/** A ScoreState with a chosen men count; score is deliberately varied to prove the
 *  condition keys on `men` ALONE, never on the score. */
function withMen(men: number, score = 0): ScoreState {
  return { score, men }
}

describe('df5-6 AC1 — the PURE lives<0 → game-over reducer, reading the df5-3 men counter', () => {
  it('a fresh game (men = STARTING_MEN = 3) is NOT game over', () => {
    expect(isGameOver(createScore())).toBe(false)
  })

  it('stays in-play while the men counter is 0 or above — losing down to the last ship is not over', () => {
    // 3 → 2 → 1 → 0: still playing. The ROM ends the game when ships are EXHAUSTED
    // (men < 0), not when the last ship is in play (men === 0).
    let s = createScore()
    for (const expectedMen of [2, 1, 0]) {
      s = loseMan(s)
      expect(s.men, `men should be ${expectedMen} after this death`).toBe(expectedMen)
      expect(isGameOver(s), `men === ${expectedMen} is still in-play, not game over`).toBe(false)
    }
  })

  it('is game over the moment the men counter falls BELOW zero (the last ship is lost)', () => {
    // 3 → 2 → 1 → 0 → -1: the fourth death takes the counter below zero → game over.
    let s = createScore()
    for (let i = 0; i < 4; i++) s = loseMan(s)
    expect(s.men).toBe(-1)
    expect(isGameOver(s)).toBe(true)
  })

  it('keys on men ALONE, never on the score — the exact men < 0 boundary (anti off-by-one)', () => {
    // men === 0 with a huge score is NOT over; men === -1 with a zero score IS over.
    expect(isGameOver(withMen(0, 1_000_000)), 'men === 0 is the last ship, not game over').toBe(
      false,
    )
    expect(isGameOver(withMen(-1, 0)), 'men === -1 is game over regardless of score').toBe(true)
    // Deeper negatives (a hypothetical double-decrement) remain over — the predicate is
    // `< 0`, not `=== -1`.
    expect(isGameOver(withMen(-2, 999))).toBe(true)
  })
})

describe('df5-6 AC4 — a Design note records what is deferred to df7 (Decisions C & D)', () => {
  it('the endgame module records the NARROWED Decision C IN CONTEXT: within the Decision-C paragraph, phase-machine WIRING defers to df7 while df5-7 owns the HUD + bare game-over screen render', () => {
    // df5-7 (the visual-playtest capstone) pulled the HUD render, the scanner strip and a bare
    // GAME OVER / final-score screen into composeFrame (owner ruling: the whole loop must
    // actually render). Decision C is NARROWED — only the attract→play→death→game-over
    // phase-MACHINE wiring (and Decision D's 2P handoff) remain df7's. The note must reflect
    // that split so a reader does not still think the HUD is df7's.
    expect(
      existsSync(ENDGAME_SRC),
      'src/core/endgame.ts must exist and carry the (narrowed) Decision C note (AC4)',
    ).toBe(true)
    const src = readFileSync(ENDGAME_SRC, 'utf8')
    // Anchor to the Decision-C paragraph's own UNIQUE declaration ("Decision C (NARROWED …"),
    // NOT the bare "Decision C" substring — which also appears in the intro (endgame.ts:2) and
    // in the "DEFERRED TO df7 (Decision C & D …)" divider (endgame.ts:12), whose stray "df7"
    // would otherwise satisfy the /df7/ check regardless of the paragraph body (lang-review #15/#25).
    const cStart = src.indexOf('Decision C (NARROWED')
    const cEnd = src.indexOf('Decision D')
    expect(cStart, 'the note must contain the narrowed Decision C paragraph ("Decision C (NARROWED …")').toBeGreaterThanOrEqual(0)
    expect(cEnd, 'the note must contain a Decision D paragraph after Decision C').toBeGreaterThan(cStart)
    const decisionC = src.slice(cStart, cEnd)
    expect(decisionC, 'within Decision C, df7 must be named as owner of the deferred phase-machine wiring').toMatch(
      /df7/,
    )
    expect(
      /attract|phase machine|phase-machine/i.test(decisionC),
      'within Decision C, the attract/phase-machine WIRING must still defer to df7',
    ).toBe(true)
    expect(
      /df5-7/.test(decisionC) && /HUD/i.test(decisionC),
      'within Decision C, df5-7 must be named as the owner of the HUD (and bare game-over screen) render — ' +
        'so a reader does not think the HUD render is still df7’s',
    ).toBe(true)
  })

  it('the endgame module records the 2P handoff deferral to df7 with the DEFA7:1179-1237 citation (Decision D)', () => {
    const src = existsSync(ENDGAME_SRC) ? readFileSync(ENDGAME_SRC, 'utf8') : ''
    expect(
      /2P|two[- ]player|P1SW|P2SW/i.test(src),
      'the note must record that 2P alternating handoff defers to df7 (Decision D)',
    ).toBe(true)
    expect(
      src,
      'the 2P deferral must preserve its ROM citation (DEFA7.SRC:1179-1237, the PLAYER START PROCESS)',
    ).toMatch(/DEFA7\.SRC:1179/)
  })

  it('the design spec preserves Decision D and the 2P player-start citations (regression guard)', () => {
    const spec = existsSync(DESIGN_SPEC) ? readFileSync(DESIGN_SPEC, 'utf8') : ''
    expect(spec, 'the df5 design spec must exist').not.toBe('')
    expect(spec, 'Decision D (2P defers to df7) must remain in the spec').toMatch(/Decision D/)
    expect(
      spec,
      'the 2P player-start citations (DEFA7.SRC:1179…1237) must remain preserved in the spec',
    ).toMatch(/DEFA7\.SRC:1179/)
  })
})
