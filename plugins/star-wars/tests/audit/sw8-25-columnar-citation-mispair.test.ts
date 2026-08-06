// citation-guard: ignore-file — this suite quotes deliberately-mis-paired citations
// (`WSTEST.MAC:2` / `WSTEST.MAC:4` against a planted fixture ROM) as fixtures. It must
// stay opted out, or the tree-wide zero-count ratchet (sw8-24) would try to resolve
// `WSTEST.MAC` and redden.
//
// tests/audit/sw8-25-columnar-citation-mispair.test.ts — RED for sw8-25.
//
// == THE DEFECT ====================================================================
// `quoteFor` (in check-comment-citations.mjs) binds the delimited span IMMEDIATELY
// adjacent to a citation as that citation's verbatim, and `unwrap` first rejoins
// comment-continuation lines into one string. Together they MIS-PAIR whenever a comment
// lays out citation/quote pairs in a COLUMN — a very common shape in this codebase:
//
//   //   WSMAIN.MAC:1636  PHIGD (ground INIT, PH.TIM just zeroed):
//   //                      JSR PM4TH   ";BATTLE MUSIC IN FOURTHS"
//   //   WSMAIN.MAC:1673  PHEGD (the PER-FRAME ground handler), guarded by
//
// After unwrap the closing quote of entry 1 is one space from entry 2's citation, so
// `gapOk` accepts it and the quote — which belongs to :1636 — is bound to :1673 as its
// `before` quote. The guard then reports :1673 (a CORRECT citation) as stale and names
// :1636 as where it "moved to". It does not merely miss a defect: it MANUFACTURES one
// and attaches a plausible wrong line number, so a reader who trusts the hint "fixes" a
// correct citation into a wrong one and the guard goes green on the corruption.
//
// == WHY THE FIXTURE IS A PLANTED ROM, NOT WSMAIN =================================
// The real reproduction is `music-data.test.mjs` at ac7eb34~1 citing WSMAIN.MAC:1636 /
// :1673. Pinning those literals here would make THIS suite the next stale citation the
// moment WSMAIN.MAC shifts — the exact defect class the guard exists to catch, one layer
// up (see the sw8-23 suite header). So the fixture is a hermetic `.MAC` planted into a
// temp romDir: line 2 is `LDA PHTIM`, line 4 is `JSR PMREB`. The columnar comment cites
// both; the assertions are by RESOLUTION against that planted file, never by a frozen
// line number.
//
// == SCOPE (SM ruling) =============================================================
// This story owns the LOUD-AND-WRONG columnar mis-pairing only. The silent-evasion
// sibling (a bare `:N-M` span near NO filename that escapes the gate entirely) is
// sw8-26's, and is not exercised here.
//
// == SACRED BOUNDARY ===============================================================
// Pure text/tooling analysis. No DOM, no sim, no time.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { checkCitations } from '../../tools/audit/check-comment-citations.mjs'

// A planted assembler file so every assertion resolves against KNOWN content rather than
// a real ROM line number. Line 2 = `LDA PHTIM`, line 4 = `JSR PMREB`; the `; dummy`
// lines at 1 and 3 keep the two verbatims off each other's lines.
let romDir: string
let opts: { swRoot: string; romDir: string; repoRoot: string }

beforeAll(() => {
  romDir = mkdtempSync(join(tmpdir(), 'sw8-25-columnar-'))
  writeFileSync(join(romDir, 'WSTEST.MAC'), '; dummy\nLDA PHTIM\n; dummy\nJSR PMREB\n')
  opts = { swRoot: romDir, romDir, repoRoot: romDir }
})

afterAll(() => {
  rmSync(romDir, { recursive: true, force: true })
})

// The fixtures assert BEHAVIOUR (`checkCitations` output), never a `quoteFor` internal.
// An earlier draft of this suite asserted `extractCitations(...).quote !== 'LDA PHTIM'`,
// on the assumption that the fix would re-attribute the quote inside `quoteFor`. That
// assumption is provably wrong: `src/shell/render.ts` carries a LEGITIMATE before-quote
// that wraps across a comment row-break to its citation (`"FACE BACKWARDS"` on one line,
// `WSMAIN.MAC:1331` on the next) — structurally IDENTICAL to a stolen columnar quote.
// No positional rule in `quoteFor` can tell the two apart; only RESOLUTION can (does the
// quote appear at THIS line or at a sibling's?), and resolution lives in `checkCitations`.
// So the quote may still bind to `:4` internally; the contract is that a correct citation
// is never REPORTED stale. These tests pin that contract. (See sw8-25 session findings.)

// ===================================================================================
describe('sw8-25 — a columnar quote is not reported against the FOLLOWING citation', () => {
  // The exact reproduction shape: entry 1's quote sits on a middle continuation line and
  // belongs to :2; entry 2 (:4) carries only prose and has NO quote of its own. Before
  // the fix, :4 grabs :2's `LDA PHTIM` via its `before` search and is reported stale,
  // naming :2 as where it "moved to".
  const exact = [
    '//   WSTEST.MAC:2  PHIGD (ground INIT, PH.TIM just zeroed):',
    '//                    LDA PHTIM   "LDA PHTIM"',
    '//   WSTEST.MAC:4  PHEGD (the PER-FRAME ground handler), guarded by',
  ].join('\n')

  it('the following citation (:4) is reported CLEAN, not stale', () => {
    // The whole point of the story: :4 is a CORRECT citation. The guard must not
    // manufacture a defect on it. Assert the exact-clean set, not "some error changed" —
    // an assertion that only checked the message text would pass against a wrong fix.
    expect(checkCitations(exact, opts)).toEqual([])
  })

  it('the suppression keys on the SIBLING, not on "columnar therefore silent"', () => {
    // Mechanism-agnostic proof that the fix disambiguates by resolution rather than by
    // muting anything that looks columnar: the SAME `:4` grabbing the SAME wrong quote
    // (via its `before` search, from the line above), but with the `:2` row REMOVED so
    // no sibling explains it, IS reported stale. It is the presence of the preceding row
    // (:2), whose line the quote actually resolves to, that makes the columnar block
    // clean — not the columnar shape itself.
    const lone = ['//                    LDA PHTIM   "LDA PHTIM"', '//   WSTEST.MAC:4  PHEGD (the PER-FRAME ground handler)'].join('\n')
    expect(checkCitations(lone, opts)).toHaveLength(1)
    expect(checkCitations(exact, opts)).toEqual([])
  })
})

// ===================================================================================
describe('sw8-25 — a two-column table reports neither row', () => {
  // Both rows carry a correct trailing quote. Before the fix, :4's `before` search reaches
  // back over the row boundary and grabs :2's `LDA PHTIM`, reporting :4 stale.
  const both = [
    '//   WSTEST.MAC:2  ground INIT routine    "LDA PHTIM"',
    '//   WSTEST.MAC:4  per-frame handler      "JSR PMREB"',
  ].join('\n')

  it('neither row is reported stale', () => {
    expect(checkCitations(both, opts)).toEqual([])
  })
})

// ===================================================================================
describe('sw8-25 — the fix must not blind the guard (regression controls)', () => {
  // These keep the fix HONEST: the cheapest way to make the fixtures above pass is to stop
  // trusting `before` quotes, or to mute anything columnar — which would silently retire
  // the guard's normal detection.

  it('an ordinary before-quote that is genuinely stale is STILL caught', () => {
    // `JSR PMREB` (line 4) written before a :2 citation is a real stale citation. If the
    // fix disabled `before` resolution wholesale, this would fall silent.
    const errs = checkCitations('// (`JSR PMREB`, `WSTEST.MAC:2`)', opts)
    expect(errs).toHaveLength(1)
    expect(errs[0]).toMatch(/WSTEST\.MAC:2/)
  })

  it('an ordinary before-quote that is CORRECT stays clean', () => {
    // The complementary control: a legitimate before-quote must not become a false
    // positive under an over-aggressive fix.
    expect(checkCitations('// (`LDA PHTIM`, `WSTEST.MAC:2`)', opts)).toEqual([])
  })

  // The suppression predicate has two load-bearing terms beyond same-file: the quote must
  // resolve INSIDE a sibling's span (`at >= o.start && at <= o.end`) and that sibling must
  // be EARLIER (`o.index < c.index`). The two controls below pin BOTH — each was
  // mutation-verified to go red if its term is dropped. (An earlier control here used a
  // quote that resolved NOWHERE, leaving `at === null`; the `at !== null &&` short-circuit
  // made the whole predicate irrelevant, so no mutation of it could redden the control —
  // it proved nothing. Do not reintroduce a fixture whose quote resolves to no line.)

  it('does NOT suppress when the quote resolves OUTSIDE every sibling span (pins span-containment)', () => {
    // `:1` is genuinely stale; its quote `JSR PMREB` resolves to line 4, which is OUTSIDE
    // sibling `:2`'s span [2,2]. A blanket "an earlier same-file citation exists, stay
    // silent" fix (drop the `at >= o.start && at <= o.end` term) would wrongly mute this.
    // Mutation-checked: dropping span-containment turns this from 1 error to 0.
    const outsideSpan = ['//   WSTEST.MAC:2  init routine   "LDA PHTIM"', '//   (`JSR PMREB`, `WSTEST.MAC:1`)'].join('\n')
    const errs = checkCitations(outsideSpan, opts)
    expect(errs).toHaveLength(1)
    expect(errs[0]).toMatch(/WSTEST\.MAC:1/)
  })

  it('does NOT suppress on a LATER sibling’s span (pins the earlier-only ordering)', () => {
    // `:1` is genuinely stale; its quote `LDA PHTIM` resolves to line 2, which a sibling
    // `:2` spans — but that sibling comes AFTER `:1` in the text. A later row's quote must
    // not retroactively excuse an earlier citation. Dropping the `o.index < c.index` term
    // would wrongly mute this. Mutation-checked: dropping ordering turns this 1 → 0.
    const laterSibling = ['//   (`LDA PHTIM`, `WSTEST.MAC:1`) and separately', '//   WSTEST.MAC:2  the init routine'].join('\n')
    const errs = checkCitations(laterSibling, opts)
    expect(errs).toHaveLength(1)
    expect(errs[0]).toMatch(/WSTEST\.MAC:1/)
  })
})
