// tests/demo-jt9-14-source.test.ts
//
// Story jt9-14 — RED phase (Mr. Praline / TEA). The PROVENANCE companion to
// demo-jt9-14.test.ts (the jt1-10/jt2-1 double-entry pattern): the behaviour
// suite encodes what the ptero pass now DOES; this file proves (a) the ROM runs
// the span-mask test as a precondition to the player-vs-ptero dispatch, which is
// what makes wiring narrowPhase in FAITHFUL rather than an invention, and (b) all
// THREE overlap passes consult the mask once the story lands.
//
// The vendored tree is gitignored, so the byte-read SKIPS where it is absent
// (the jt1-3 degradation pattern); the census reads the committed source and runs
// everywhere.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROM = 'JOUSTRV4.SRC'

/** demo.ts with block and line comments removed — so a census of `narrowPhase(`
 *  counts CALL SITES, never a mention of the word in a comment (the sidecar's
 *  "a guard that greps source reads your prose about the thing as the thing"). */
function strippedDemoSource(): string {
  const src = readFileSync(join(root, 'src', 'core', 'demo.ts'), 'utf8')
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

// ─────────────────────────────────────────────────────────────────────────────
// THE ROM GATE — BPCOL runs BEFORE the player-vs-ptero lance dispatch.
//
//   OSTXYP  JSR  BPCOL     the span-mask (narrowPhase) collision test  (:4944)
//           BCS  OSTHIT    branch to the dispatch ONLY on a collision  (:4945)
//   OSTHIT  ...            player-vs-ptero lance compare, :4971-5001
//
// So the machine does NOT resolve a player-vs-ptero contact on the box alone —
// the mask gates it. The port's box-only third pass is therefore the infidelity,
// and consulting narrowPhase is the correction. (A residual divergence — BPCOL
// folds a screen-X COLDX term the port's narrowPhase drops — is a filed follow-up,
// not this story.)
// ─────────────────────────────────────────────────────────────────────────────
describe('jt9-14 — the ROM gates the player-vs-ptero dispatch on BPCOL', () => {
  it.skipIf(!vendoredAvailable)('OSTXYP calls BPCOL then branches to OSTHIT on a collision (:4944-4945)', () => {
    const lines = sourceLines(ROM)
    const l4944 = lines[4944 - 1]
    const l4945 = lines[4945 - 1]
    expect(l4944, ':4944 must call the span-mask test BPCOL').toContain('BPCOL')
    expect(l4944, ':4944 is the OSTXYP entry').toContain('OSTXYP')
    expect(l4945, ':4945 branches to OSTHIT only on a carry (a real collision)').toMatch(/BCS\s+OSTHIT/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE CENSUS — all THREE passes consult narrowPhase.
//
// The story's frame: "collisionPass has THREE overlap passes and only two of them
// consult a mask." Re-derived from the SOURCE (not a hand list): the count of
// narrowPhase call sites in demo.ts must reach three. RED today (two: the joust
// pass and the jt8-7 egg catch); GREEN once the ptero pass is wired.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt9-14 — every overlap pass in demo.ts consults the mask', () => {
  it('demo.ts calls narrowPhase from THREE call sites (joust, egg, and now ptero)', () => {
    const calls = strippedDemoSource().match(/narrowPhase\(/g) ?? []
    expect(
      calls.length,
      'the player-vs-ptero pass must join the joust and egg passes in consulting narrowPhase',
    ).toBe(3)
  })
})
