// tests/comment-line-refs.test.ts
//
// Story jt9-30 — RED phase (O'Brien / TEA). Descoped out of jt9-2.
//
// ─── WHAT THIS GUARD ENFORCES ────────────────────────────────────────────────
// A comment that cites one of OUR source files by line number — `demo.ts:1109`,
// `game.ts:374`, `src/shared/audio.ts:69` — goes stale within HOURS. Measured,
// not asserted: jt5-3 cited demo.ts:1109 for the flight-vs-collision cue order;
// that was correct at jt5-3's own GREEN commit, jt5-4 moved it to :1174 the SAME
// DAY, and it is :1275 today — three positions in three days, by two unrelated
// stories. Today's demo.ts:1109 is unrelated egg-catch narrowPhase logic, so the
// stale ref does not dangle: it silently points at the WRONG REAL CODE, the worse
// failure. jt9-38's GREEN sampling found ~87% of the checkable demo.ts refs
// already stale. The story's decision (open question 2), therefore: convert ALL
// comment-body refs on PRINCIPLE — a line number is never a stable anchor — not
// only the demonstrably-stale ones. Name the SYMBOL instead.
//
// This is a permanent regression guard, not a one-shot: the ref count REGREW
// 102 → 145 between the 2026-08-02 filing and this RED (jt9-38 and siblings keep
// re-introducing them), which is precisely the argument for pinning it at zero.
//
// ─── TWO HARD BOUNDARIES ─────────────────────────────────────────────────────
//  1. ROM citations — JOUSTRV4.SRC:<line>, JOUSTI.SRC:<line>, *.MAC:<line> — are
//     OUT OF SCOPE and MUST NOT be converted. They cite an IMMUTABLE primary
//     source, they are the repo's citation idiom, and the citation gates pin
//     them. Converting one is an active regression. This guard distinguishes
//     them by EXTENSION (uppercase .SRC/.MAC vs our lowercase .ts) and asserts,
//     as a live control, that the corpus of ROM cites SURVIVES (see below).
//  2. The sanctioned historical-note form survives on purpose. uf1-9's template
//     keeps a line number that carried information as a DETACHED note —
//     `enemy.ts's BOUNDR_DOWN_BRAKE … (:115/:118 -> :266/:273)` — where the bare
//     `:NNN` is no longer glued to `<file>.ts`. The banned shape is the CONTIGUOUS
//     `<file>.ts:<line>`; the detached `:NNN` is not matched and stays legal.
//
// Scope: joust TEST COMMENTS only. The same rot lives in sprint/epic YAML text
// where no gate can catch it — that is explicitly OUT of this 3-point story and
// needs its own follow-up if the owner wants it (see the TEA assessment).

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, basename, relative } from 'node:path'
import { describe, it, expect } from 'vitest'

const testsDir = dirname(fileURLToPath(import.meta.url))
const SELF = 'comment-line-refs.test.ts'

/**
 * A CONTIGUOUS reference to one of OUR source files by line number:
 * `<name>.ts:<line>`, lowercase `.ts` extension only. The lowercase extension
 * is what excludes ROM citations (`.SRC` / `.MAC`) — see ROM_CITE. The `:` must
 * abut the extension, so the detached historical-note form `enemy.ts (:115)` is
 * deliberately NOT matched.
 */
const OUR_TS_LINE_REF = /\b[a-z0-9-]+\.ts:\d+/g

/** ROM citations — the immutable primary-source idiom this story must not touch. */
const ROM_CITE = /\b[A-Z0-9_]+\.(?:SRC|MAC):\d+/g

/** Every `*.test.ts` under this directory RECURSIVELY, EXCEPT this guard itself.
 *  Recursive (not a flat `readdirSync`) so a ref in a nested test file — e.g.
 *  `audit/citations.test.ts` — cannot slip past this durability guard. Mirrors
 *  the `walk()` in audio-seam-scope.test.ts. Paths are returned relative to
 *  `testsDir`, so an offender reads `audit/citations.test.ts:12`. */
function walkTests(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) walkTests(p, acc)
    else if (p.endsWith('.test.ts') && basename(p) !== SELF) acc.push(relative(testsDir, p))
  }
  return acc
}

const suiteFiles = (): string[] => walkTests(testsDir).sort()

describe('jt9-30 — the regex distinguishes our stale line-refs from ROM citations and the historical-note form', () => {
  it('MATCHES a contiguous <our>.ts:<line> ref', () => {
    for (const s of ['demo.ts:1109', 'game.ts:374', 'src/shared/audio.ts:69', 'audio-flap.test.ts:244']) {
      expect(new RegExp(OUR_TS_LINE_REF.source).test(s), `should flag "${s}"`).toBe(true)
    }
  })

  it('does NOT match a ROM citation (hard exclusion, by extension)', () => {
    for (const s of ['JOUSTRV4.SRC:5544', 'JOUSTI.SRC:12', 'EQU.SRC:111', 'JOUSTX.MAC:900']) {
      expect(new RegExp(OUR_TS_LINE_REF.source).test(s), `must NOT flag ROM cite "${s}"`).toBe(false)
    }
  })

  it('does NOT match the detached historical-note form or a bare ROM line', () => {
    for (const s of ['enemy.ts (:115/:118 -> :266/:273)', "enemy.ts's BOUNDR_DOWN_BRAKE", ':5544']) {
      expect(new RegExp(OUR_TS_LINE_REF.source).test(s), `must leave "${s}" legal`).toBe(false)
    }
  })
})

describe('jt9-30 — no comment-body <our>.ts:<line> reference survives in the joust suite', () => {
  it('every stale line-number ref has been converted to a symbol reference', () => {
    const offenders: string[] = []
    for (const file of suiteFiles()) {
      const text = readFileSync(join(testsDir, file), 'utf8')
      const lines = text.split('\n')
      lines.forEach((line, i) => {
        const hits = line.match(OUR_TS_LINE_REF)
        if (hits) offenders.push(`${file}:${i + 1}  ${hits.join(', ')}  |  ${line.trim().slice(0, 100)}`)
      })
    }
    expect(
      offenders,
      `${offenders.length} comment-body <our>.ts:<line> ref(s) remain. Line numbers are never ` +
        `stable anchors (~87% already stale) — name the SYMBOL instead, keeping any information-` +
        `carrying number as a DETACHED historical note (\`file.ts … (:NNN -> :MMM)\`). Do NOT ` +
        `touch ROM citations (*.SRC / *.MAC).\n` +
        offenders.slice(0, 80).join('\n'),
    ).toEqual([])
  })
})

describe('jt9-30 — ROM citations are preserved, not collateral damage', () => {
  it('the joust suite still carries its corpus of *.SRC / *.MAC citations', () => {
    let romCites = 0
    for (const file of suiteFiles()) {
      const hits = readFileSync(join(testsDir, file), 'utf8').match(ROM_CITE)
      if (hits) romCites += hits.length
    }
    // Measured at RED (2026-08-06): 384 ROM cites across the suite (this file
    // excluded). The conversion must not shrink them — that would be the
    // active regression the hard exclusion forbids. Floor set well below the
    // measured count so it only fires on real collateral damage, not on an
    // unrelated ROM-cite edit elsewhere.
    expect(
      romCites,
      `only ${romCites} ROM citations remain — the conversion must NOT delete or convert ` +
        `*.SRC/*.MAC citations (they cite an immutable primary source).`,
    ).toBeGreaterThan(300)
  })
})
