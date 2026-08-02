// citation-guard: ignore-file — this suite is FULL of deliberately-broken citations
// (the AC6 mutants). Without the pragma the guard reports its own fixtures and can
// never be green; that conflict is pinned by "honours a file-level opt-out pragma".
// tests/audit/comment-citations.test.ts — RED for sw8-18 AC5/AC6/AC7.
//
// THE STORY. sw8-8's review found eleven citation and prose defects; sw8-17 added a
// twelfth. `tools/audit/check-citations.mjs` already re-opens citations, but ONLY the
// structured ones in `docs/audit/findings/*.json`. Nothing re-opens a `<file>:<span>`
// written into an ordinary source comment, which is why all twelve survived two green
// review rounds and one (item 7) was invalidated by its own commit.
//
// == WHAT THIS GUARD CAN AND CANNOT CATCH (AC7 — measured, not asserted) ============
//
// Of the twelve items, this guard catches THREE. That is the honest number and the
// story's own title was corrected to say so. Measured at RED:
//
//   item 4  a bare filename (`bounded-eye-combat.test.ts`) that no longer exists   CAUGHT
//   item 7  a span whose adjacent verbatim moved out of it (the spec's longplay
//           observation, pushed :26-30 -> :45-46 by sw8-8's own amendment)         CAUGHT
//   item 8  the BARE-COLON form `.REPT 0, :2273-2290` — no filename at all         CAUGHT
//
// The other nine are prose defects with correct or absent spans: a false `.SBTTL`
// attribution, an omitted routine, a duplicate import, a wrong fixture value, a stale
// paragraph, a stale forward reference, and the "only reader" condensation — whose
// span (`WSSTAR.MAC:98`) is CORRECT, so no span-checker can ever see it. Those are
// pinned in `sw8-18-remediation.test.ts`, not here.
//
// == THE ASSOCIATION RULE, AND WHY IT IS IMMEDIATE-ADJACENCY ONLY ===================
//
// A verbatim check needs to know WHICH quote belongs to a citation. That rule was
// measured against the real tree at RED before this suite was written, because the
// obvious rules are unsatisfiable:
//
//   nearest quoted string within 240 chars   ->  267 candidates, 184 mismatches
//   nearest backticked fragment within 200   ->  265 candidates, 116 mismatches
//   IMMEDIATELY adjacent (<=4 chars of punctuation)  ->  129 candidates, 17 mismatches
//
// The first two overwhelmingly capture the AUTHOR'S OWN PROSE, not a quote from the
// cited file, so a guard built on them can never go green. Immediate adjacency is the
// only rule with a tractable failure set — and it is the pattern items 7 and 8 use.
// Of its 17 mismatches, four are genuine defects this story must also close (see
// "closes the four off-by-N defects" below); the rest are prose captures removed by
// pairing delimiters properly — a naive /`([^`]+)`/ pairs the CLOSING backtick of one
// identifier with the OPENING of the next, so "`ST.UX` is the STARFIELD's register"
// reads as a quote. Scan delimiter pairs from the start of the text instead.
//
// RESOLVER NOTE for Dev: `math3d.ts`, `loop.ts`, `rng.ts` and friends do NOT live in
// this plugin — they are `@shared/*` at `src/shared/` in the monorepo root, and
// `vite.config.ts` / `sprint/**` sit at the root too. A resolver that only walks
// plugins/star-wars reports all of them as dangling. Path-qualified citations must
// resolve by PATH before any basename lookup, or `src/shell/input.ts:45` is checked
// against the wrong `input.ts`.
//
// == SACRED BOUNDARY ================================================================
// Pure text analysis. No DOM, no sim, no time. The unit groups run on synthetic
// fixtures so they cannot rot with the tree; only the last group reads the real tree.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  extractCitations,
  checkCitations,
  checkTree,
  UNCATCHABLE,
} from '../../tools/audit/check-comment-citations.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const swRoot = join(here, '..', '..')
const repoRoot = join(swRoot, '..', '..')
const romDir = join(repoRoot, 'reference', 'atari-source', 'star-wars-1983')
const opts = { swRoot, romDir }

describe('sw8-18 AC5 — the three citation forms', () => {
  it('extracts a plain `<file>:<line>`', () => {
    const c = extractCitations('// see `WSSTAR.MAC:98` for the read')
    expect(c).toHaveLength(1)
    expect(c[0].file).toBe('WSSTAR.MAC')
    expect(c[0].start).toBe(98)
    // a single line is a degenerate span, not a null end
    expect(c[0].end).toBe(98)
  })

  it('extracts a `<file>:<line-span>`', () => {
    const c = extractCitations('// (`WSMAIN.MAC:2522-2530`) is the whole routine')
    expect(c).toHaveLength(1)
    expect(c[0].file).toBe('WSMAIN.MAC')
    expect(c[0].start).toBe(2522)
    expect(c[0].end).toBe(2530)
  })

  it('resolves a BARE-COLON span against the nearest preceding filename — item 8 form', () => {
    // gameRules.ts:240 as filed: the filename is on the line above, the span is bare.
    const text = [
      '//   * Every writer sits under `WSMAIN.MAC` `.SBTTL MOVE STARS IN SOME DIRECTION`',
      '//     are assembled OUT (`.REPT 0`, :2273-2290; call sites :2186 commented out).',
    ].join('\n')
    const c = extractCitations(text)
    const bare = c.filter((x) => x.bare)
    expect(bare.length).toBeGreaterThanOrEqual(1)
    // it must INHERIT the filename, not report null — otherwise item 8 is invisible
    expect(bare[0].file).toBe('WSMAIN.MAC')
    expect(bare[0].start).toBe(2273)
    expect(bare[0].end).toBe(2290)
  })

  it('extracts a bare `<file>` with no line at all — item 4 form', () => {
    const c = extractCitations('// WHY NO SUITE CAUGHT IT: `bounded-eye-combat.test.ts` (sw8-2 AC9) checks')
    expect(c).toHaveLength(1)
    expect(c[0].file).toBe('bounded-eye-combat.test.ts')
    expect(c[0].start).toBeNull()
  })

  it('does NOT invent a citation for a bare span with no filename anywhere before it', () => {
    // A phantom here would fire on every ":123" in ordinary prose.
    expect(extractCitations('// the window is :2273-2290 wide')).toEqual([])
  })

  it('resolves a PATH-QUALIFIED citation by its PATH, not by basename', () => {
    // Measured trap: `src/shell/input.ts` (51 lines) and a shorter `input.ts` both exist.
    // A basename-only resolver reports :45 out of range against the wrong file.
    const errs = checkCitations('// the shell supplies it (src/shell/input.ts:45)', opts)
    expect(errs).toEqual([])
  })
})

describe('sw8-18 AC5 — the two failure modes', () => {
  it('fails on a reference to a file that does not exist', () => {
    const errs = checkCitations('// see `bounded-eye-combat.test.ts` for the old check', opts)
    expect(errs).toHaveLength(1)
    expect(errs[0]).toMatch(/bounded-eye-combat\.test\.ts/)
    expect(errs[0]).toMatch(/does not exist|not found/i)
  })

  it('fails when the adjacent verbatim is NOT inside the cited span', () => {
    // `.REPT 0` is at WSMAIN.MAC:2271; :2273 is the routine BODY. Item 8 exactly.
    const errs = checkCitations('// assembled OUT (`.REPT 0`, `WSMAIN.MAC:2273-2290`)', opts)
    expect(errs).toHaveLength(1)
    expect(errs[0]).toMatch(/WSMAIN\.MAC:2273-2290/)
  })

  it('RE-LOCATES the anchor instead of only reporting it wrong', () => {
    // A gate that says "wrong" buys one clean round; a gate that says WHERE survives
    // the next story. `.REPT 0` really is at :2271.
    const errs = checkCitations('// assembled OUT (`.REPT 0`, `WSMAIN.MAC:2273-2290`)', opts)
    expect(errs[0]).toMatch(/2271/)
  })

  it('passes when the verbatim IS inside the cited span', () => {
    expect(checkCitations('// (`STD ST.UX ;STARS RELATIVE MOVEMENT`, `WSMAIN.MAC:2528`)', opts)).toEqual([])
  })

  it('accepts a span that BRACKETS the verbatim rather than starting on it', () => {
    // The correction AC1 asks for is :2522-2530, where the quote sits at :2526-2528.
    const errs = checkCitations('// (`LDD FRAME / JSR LSLD7 / STD ST.UX`, `WSMAIN.MAC:2522-2530`)', opts)
    expect(errs).toEqual([])
  })
})

describe('sw8-18 AC5 — the traps that make a doc guard inert', () => {
  it('rejoins a quote WRAPPED across comment-continuation lines', () => {
    // The cp5-1 trap. Item 7's quote is split by `\n    // `; a guard that matches the
    // raw bytes never sees it, silently passes, and the stale citation survives.
    const wrapped = [
      '    // observation: "Longplay ~wave 4 (score 352,171): mid space-combat, the Death',
      '    // Star is entirely out of frame" (`WSMAIN.MAC:2528`)',
    ].join('\n')
    const c = extractCitations(wrapped)
    expect(c).toHaveLength(1)
    expect(c[0].quote).toMatch(/Death Star is entirely out of frame/)
    // and the joined quote must not carry the comment leader
    expect(c[0].quote).not.toMatch(/\/\//)
  })

  it('rejoins a quote wrapped across MARKDOWN blockquote lines', () => {
    const wrapped = ['> its only reader is the star', '> generator (`WSSTAR.MAC:98`)'].join('\n')
    const c = extractCitations(wrapped)
    expect(c).toHaveLength(1)
    expect(c[0].quote ?? '').not.toMatch(/>/)
  })

  it('does NOT associate a quote separated from the citation by prose', () => {
    // Immediate adjacency only. At 200 chars this rule had 116 false positives.
    const text = '// `LDD FRAME / JSR LSLD7` is the mover, and separately the banner phase is described in WSMAIN.MAC:2244'
    const c = extractCitations(text)
    expect(c).toHaveLength(1)
    expect(c[0].quote).toBeNull()
  })

  it('honours a file-level opt-out pragma', () => {
    // AC5 (scan `tests/`) and AC6 (mutation fixtures full of deliberately-broken
    // citations, which live in `tests/`) are JOINTLY UNSATISFIABLE without this: the
    // guard scans its own fixtures and reports them as defects, so it can never be
    // green. Measured at RED — the unscoped scan reported this very file 14 times.
    const errs = checkCitations(
      '// citation-guard: ignore-file\n// see `bounded-eye-combat.test.ts` and `WSMAIN.MAC:99999`',
      opts,
    )
    expect(errs).toEqual([])
  })

  it('applies the pragma only to the file that declares it', () => {
    // A pragma that leaked to the whole run would silence the guard globally.
    expect(checkCitations('// see `bounded-eye-combat.test.ts`', opts)).toHaveLength(1)
  })

  it('never re-opens a citation the prose explicitly DISOWNS', () => {
    // The corrections this story ships will quote the old wrong spans in order to
    // retire them. Without this, the guard reddens on the very text that fixes it.
    const errs = checkCitations('// this comment used to say RETIRED:`WSMAIN.MAC:2273-2290`, which was wrong', opts)
    expect(errs).toEqual([])
  })

  it('still checks a NON-retired citation on the same line as a retired one', () => {
    // Guards against a `retired` flag that short-circuits the whole line.
    const errs = checkCitations(
      '// was RETIRED:`WSMAIN.MAC:2273-2290`; the real one is (`.REPT 0`, `WSMAIN.MAC:2299`)',
      opts,
    )
    expect(errs).toHaveLength(1)
    expect(errs[0]).toMatch(/2299/)
  })
})

describe('sw8-18 AC6 — mutation proof, each item caught INDEPENDENTLY', () => {
  // Each mutant is the defect as it actually stood, pasted verbatim, so the next
  // reader re-runs the exact string rather than reconstructing the intent.

  const M4 = '// WHY NO EXISTING SUITE CAUGHT IT: `bounded-eye-combat.test.ts` (sw8-2 AC9) checks reachability'
  const M7 =
    '    // observation: "Longplay ~wave 4 (score 352,171): mid space-combat, the Death Star is entirely\n' +
    '    // out of frame" (`docs/superpowers/specs/2026-07-20-cabinet-feel-render-fidelity-design.md:26-30`).'
  const M8 = '//     are assembled OUT (`.REPT 0`, :2273-2290; call sites :2186/:2216/:2233 commented out).'

  it('item 4 mutant — the dangling test-file reference reddens', () => {
    const errs = checkCitations(M4, opts)
    expect(errs).toHaveLength(1)
    expect(errs[0]).toMatch(/bounded-eye-combat/)
  })

  it('item 7 mutant — the spec span that no longer holds the longplay quote reddens', () => {
    const errs = checkCitations(M7, opts)
    expect(errs).toHaveLength(1)
    expect(errs[0]).toMatch(/26-30/)
  })

  it('...and it is the ROOTS that resolve it — varying them changes the verdict (sw8-23 AC7)', () => {
    // This replaces a variation that did nothing. Until sw8-23 the test above was run a
    // second time with a `fromFile` option "to simulate the citation living in a
    // different file" — but nothing ever read `fromFile`, so the two runs were the same
    // call twice and the suite read as covering citing-file-relative resolution that no
    // line of the implementation performed. Resolution is a function of the CITED name
    // and the roots, so the roots are what a real mutation has to move.
    const narrowed = { swRoot: join(swRoot, 'src'), romDir, repoRoot: join(swRoot, 'src') }
    expect(checkCitations(M7, narrowed)[0]).toMatch(/does not exist/)
    // ...and the same input under the real roots fails for the SPAN, not the file —
    // which is what makes the difference attributable to resolution rather than to noise.
    expect(checkCitations(M7, opts)[0]).toMatch(/26-30/)
  })

  it('item 8 mutant — the bare-colon `.REPT 0` span reddens', () => {
    const text = '//   * Every writer sits under `WSMAIN.MAC` and is an `SMV*` routine\n' + M8
    const errs = checkCitations(text, opts)
    expect(errs.length).toBeGreaterThanOrEqual(1)
    expect(errs.join('\n')).toMatch(/2273-2290/)
  })

  it('the three mutants are UNCOUPLED — none of them catches the other two', () => {
    // A guard that fired on all three from one mechanism would look 3x stronger than
    // it is. Each mutant must be caught by its own rule and be clean of the others.
    const e4 = checkCitations(M4, opts).join('\n')
    const e7 = checkCitations(M7, opts).join('\n')
    const e8 = checkCitations(M8, opts).join('\n')
    expect(e4).not.toMatch(/26-30|2273-2290/)
    expect(e7).not.toMatch(/bounded-eye-combat|2273-2290/)
    expect(e8).not.toMatch(/bounded-eye-combat|26-30/)
  })

  it('the item-7 mutant is caught for the RIGHT reason — the correct span passes', () => {
    // If the correct span also reddened, the guard would be rejecting the spec file
    // wholesale rather than checking the span, and item 7's fix could never go green.
    //
    // The span is DERIVED, not written down. It was `:45-46` when this test was drafted
    // and `:47-48` an hour later, because closing the twelfth item edited the spec three
    // lines above the observation. A literal here would rot exactly the way the citation
    // it is testing rotted — which is the whole subject of this story.
    const spec = readFileSync(
      join(swRoot, 'docs', 'superpowers', 'specs', '2026-07-20-cabinet-feel-render-fidelity-design.md'),
      'utf8',
    ).split('\n')
    const at = spec.findIndex((l) => /Death Star is entirely out/.test(l)) + 1
    expect(at).toBeGreaterThan(0)
    const fixed = M7.replace('design.md:26-30', `design.md:${at}-${at + 1}`)
    expect(checkCitations(fixed, opts)).toEqual([])
  })
})

describe('sw8-18 AC7 — the guard documents what it cannot catch', () => {
  it('publishes an UNCATCHABLE note naming the prose classes it is blind to', () => {
    expect(typeof UNCATCHABLE).toBe('string')
    expect(UNCATCHABLE.length).toBeGreaterThan(80)
  })

  it('names the condensation as the case whose span is CORRECT', () => {
    // The most misleading class: `WSSTAR.MAC:98` verifies, so the guard passes it
    // while the sentence around it is false. A reader must not infer coverage.
    expect(UNCATCHABLE).toMatch(/WSSTAR\.MAC:98/)
    expect(UNCATCHABLE).toMatch(/correct/i)
  })

  it('states the count honestly — three of twelve, not "the class"', () => {
    expect(UNCATCHABLE).toMatch(/\b(three|3)\b/i)
    expect(UNCATCHABLE).toMatch(/\b(twelve|12)\b/i)
  })
})

describe('sw8-18 AC5 — the real tree scans clean', () => {
  it('has the vendored ROM available (else the scan below is vacuous)', () => {
    expect(existsSync(join(romDir, 'WSMAIN.MAC'))).toBe(true)
    expect(readFileSync(join(romDir, 'WSMAIN.MAC'), 'utf8').split('\n').length).toBeGreaterThan(2600)
  })

  // == WHY THIS IS NOT A TREE-WIDE GREEN GATE =====================================
  //
  // AC5 asks for a scan "across plugins/star-wars (src, tests, and docs/…/specs)".
  // MEASURED at RED, an unrestricted scan of that scope reported 146 errors:
  //
  //     57  dangling file reference   (many are resolver gaps — `math3d.ts`, `loop.ts`
  //                                    and `rng.ts` are `@shared/*` at src/shared, and
  //                                    `vite.config.ts` / `sprint/**` are at the
  //                                    monorepo root; roughly a dozen look genuine)
  //      7  span out of range
  //     82  verbatim not in the cited span
  //
  // Closing ~100 genuine stale citations across seven years of star-wars comments is a
  // bigger story than this one, and dragging it in is the scope creep cp5-2 warned
  // about. So the HARD gate is this story's own files, and the rest is a RATCHET:
  // the tree-wide count may fall but never rise, which makes the guard load-bearing
  // for the whole plugin immediately without demanding the sweep. The sweep is filed
  // as a Delivery Finding with these counts attached.

  const STORY_FILES = [
    ['src', 'core', 'gameRules.ts'],
    ['src', 'core', 'tie-status.ts'],
    ['src', 'core', 'sim.ts'],
    ['src', 'core', 'starfield.ts'],
    ['src', 'shell', 'render.ts'],
    ['tests', 'core', 'tie-sights-status.test.ts'],
    ['tests', 'core', 'space-eye-is-cockpit.test.ts'],
    ['tests', 'core', 'incoming-fire-reaction-window.test.ts'],
    ['tests', 'core', 'tie-fire-visibility.test.ts'],
    ['tests', 'shell', 'render.space-camera.test.ts'],
    ['docs', 'superpowers', 'specs', '2026-07-20-cabinet-feel-render-fidelity-design.md'],
  ]

  it.each(STORY_FILES.map((p) => [p.join('/'), p] as const))(
    '%s carries no stale citation',
    (_label, parts) => {
      const f = join(swRoot, ...parts)
      expect(checkCitations(readFileSync(f, 'utf8'), { swRoot, romDir })).toEqual([])
    },
  )

  it('closes the four off-by-N defects the guard found outside the filing', () => {
    // Found BY this guard at RED, in files the filing never names — the proof it bites
    // on arrival. Each is one number; they are listed so Dev corrects rather than hunts.
    //
    //   starfield.ts   WSMAIN.MAC:2529-2531  `S1MV: LDD FRAME / JSR LSLD7 / STD ST.UX` -> :2525-2528
    //   gameRules.ts   WSLAZR.MAC:417        `LDD #7000 ;FARTHEST FORWARD POINT`       -> :418
    //   state.ts       WSBASE.MAC:1330       `SUBD #6000 ;FURTHEST AWAY FIRING BUNKER` -> :1340
    //   state.ts       WSMAIN.MAC:2654       `ADDD M$TX+M.S1`                          -> :2656
    const state = join(swRoot, 'src', 'core', 'state.ts')
    const errs = checkCitations(readFileSync(state, 'utf8'), { swRoot, romDir })
    expect(errs.filter((e) => /WSBASE\.MAC:1330|WSMAIN\.MAC:2654/.test(e))).toEqual([])
  })

  it('does not let the tree-wide count RISE above the delivered baseline of 29', () => {
    // A ratchet, not a gate. If this fails, the change added new stale citations.
    // If it passes with room to spare, lower the number in the same commit.
    //
    // TIGHTENED at finish from 146 to 35. The RED baseline of 146 was measured with an
    // early, under-calibrated checker; the delivered one reports 35 against this tree
    // (and 49 against the pre-story tree, so 14 of the drop was the corrections and the
    // rest was calibration). Left at 146 this could not have failed until 111 new stale
    // citations landed — a ratchet with that much slack is the exact "guard that does
    // not bite" this story exists to retire.
    //
    // TIGHTENED AGAIN, 35 -> 29, by sw8-23 — and note the scanned surface GREW in the
    // same commit. `tools/` and `.mts` joined the scan (+11 raw), six phantom "dangling"
    // reports turned out to be globs and wrapped-sentence remnants rather than citations
    // (-6), and the eight real stale citations the widened scan found were re-anchored
    // or disowned (-8). Widening the scope therefore cost the tree nothing and left it
    // six better off. Mutation-proven at that value: adding one stale citation reddens.
    expect(checkTree({ swRoot, romDir }).length).toBeLessThanOrEqual(29)
  })
})
