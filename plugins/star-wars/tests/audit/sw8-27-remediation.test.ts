// citation-guard: ignore-file — quotes the retired claims verbatim as historical record.
// tests/audit/sw8-27-remediation.test.ts — RED for sw8-27's round-1 review findings F1, F6,
// F9 and F10, all of which are prose in `src/` that the delivered code contradicts.
//
// == WHY THIS FILE EXISTS AT ALL ====================================================
//
// sw8-27 closed a visibility divergence that had been documented as DELIBERATE. It closed
// it in the code and left the documentation saying it was deliberate, in the same file,
// 380 lines above the change. Nothing in 2276 tests noticed, because nothing in this suite
// reads a comment. The round-1 Reviewer's charge is worth writing down where the next
// person will find it: after this diff a maintainer opening `sim.ts` reads that the gun
// resolving an unseen fighter is on purpose and filed elsewhere, and every clause of that
// is false. The dangerous actor is not a malicious user; it is the next well-intentioned
// refactor, reasoning from a record the machine no longer matches.
//
// So the sweep is asserted rather than trusted. These are RED and Dev's GREEN is what
// clears them.
//
// == WHAT THIS FILE CAN AND CANNOT SEE ==============================================
//
// It is an INVENTORY, not a semantic check, and the difference matters. Each retired claim
// was located by hand in the round-1 review, is quoted here in a `RETIRED:` marker, and is
// asserted absent. A rewrite that says the same false thing in different words passes.
// That is the known limit of the form and the reason each item also carries either a
// POSITIVE assertion (the paragraph must name the thing that actually replaced it, so a
// silent deletion does not count as a fix) or a RESOLVED one (the cited ROM span is opened
// and its content checked, so the claim is verified rather than spelled).
//
// Every negative token below was verified PRESENT in its target file at RED — the counts
// are recorded per assertion — so none of the `.not` assertions can be passing vacuously
// on the day it is written.
//
// == A GUARD BINDS TO A SLICE, NEVER TO A FILE (round-2 review, R1/R2) ==============
//
// Writing that caveat into this header was not a substitute for scoping the match, and
// round 2 proved it three times. Two of the assertions below searched the WHOLE flattened
// file for a token that had to appear in ONE paragraph, and both passed on a hit hundreds
// of lines away in unrelated prose — F9's citation on `sim.ts:163` (431 lines from the
// sentence it was supposed to support) and F6's `SIGHTS_OCTAGON` on the constant's own
// declaration. Reinstating the exact retired claim each one exists to forbid left the file
// green. So:
//
//   * a POSITIVE anchor is matched against the BLOCK that must carry it — `preambleOf`,
//     `cpsBlock` below — bounded by real code on both sides rather than by a line count;
//   * a supporting CITATION is matched against a measured character WINDOW around the
//     claim it supports (`windowsAround`), because a citation that is not beside the
//     sentence is not supporting it;
//   * and each is mutation-proven at write time by reinstating the exact claim it forbids
//     and requiring red. The battery in the session file records what each one caught.
//
// == SACRED BOUNDARY ================================================================
// Pure text, the vendored 1983 source, and — where a claim under test is ARITHMETIC (R5)
// — the pure core's own geometry helpers and constants, so the numbers in the prose are
// re-derived from the machine rather than re-typed. No DOM, no sim step, no time.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { aimDirection, FOV_Y } from '../../src/core/gameRules'
import { SIGHTS_OCTAGON } from '../../src/core/tie-status'
import { TIE_HIT_RADIUS } from '../../src/core/state'

const here = dirname(fileURLToPath(import.meta.url))
const swRoot = join(here, '..', '..')
const romDir = join(swRoot, '..', '..', 'reference', 'atari-source', 'star-wars-1983')

const read = (...p: string[]) => readFileSync(join(swRoot, ...p), 'utf8')
const rom = (f: string) => readFileSync(join(romDir, f), 'utf8').split(/\r\n|\r|\n/)

/** Join comment continuations so a claim wrapped across lines is matchable. Without this a
 *  regex written against the sentence as READ never matches the file as STORED, `.not`
 *  passes trivially, and the stale claim survives (the cp5-1 defect, inherited from
 *  `sw8-18-remediation.test.ts` along with the rest of this file's shape). */
const flat = (s: string) => s.replace(/\n\s*(?:\/\/+|\*|>)\s?/g, ' ').replace(/\s+/g, ' ')

const sim = () => flat(read('src', 'core', 'sim.ts'))
const tieStatus = () => flat(read('src', 'core', 'tie-status.ts'))
const gameRules = () => flat(read('src', 'core', 'gameRules.ts'))

/** The flattened text between two markers, with both ends asserted before the slice is
 *  taken — a `String.indexOf` miss returns -1, and `slice(-1, …)` silently yields a
 *  DIFFERENT window rather than an error, which is how a scoped guard quietly goes
 *  unscoped. `what` names the block in the failure so a renamed marker reports itself. */
function block(src: string, what: string, from: string, to: string): string {
  const start = src.indexOf(from)
  expect(start, `${what}: the opening marker \`${from}\` is still in the file`).toBeGreaterThanOrEqual(0)
  const end = src.indexOf(to, start)
  expect(end, `${what}: the closing marker \`${to}\` still follows it`).toBeGreaterThan(start)
  return flat(src.slice(start, end))
}

/** `stepGame`'s preamble — everything above the first line of its body. */
const preambleOf = (src: string) => block(src, "stepGame's preamble", 'export function stepGame', 'const rawAspect =')

/** The C_PS derivation block in `tie-status.ts`: its heading comment down to the first
 *  line of code it documents. Bounded by code on both sides, which is what excludes the
 *  two sites that made R2's whole-file match vacuous — `SIGHTS_OCTAGON`'s own declaration
 *  (`tie-status.ts:180`) and the predicate that reads it (`:400`). Neither is prose. */
const cpsBlock = () =>
  block(read('src', 'core', 'tie-status.ts'), 'the C_PS block', '// C_PS (0x800)', 'const sightsRay =')

/** ±`radius` characters of FLATTENED text around every occurrence of `claim`.
 *
 *  A citation supports the sentence it sits beside; one in another paragraph supports
 *  nothing, and matching it against the whole file is how R1 stayed green while the exact
 *  retired claim was reinstated. The radius is MEASURED rather than a round number.
 *
 *  Re-taken against HEAD after GREEN (round 3, Z4). The round-2 figures were exact when
 *  written and this story's OWN next commit falsified them, which is #20's opening sentence
 *  happening inside the docstring that quotes it: `gameRules.ts` still sits **193
 *  characters** from the `+10.` mention it belongs to, but in `sim.ts` the nearest is now
 *  **116** — GREEN put a citation beside the mention, which is the fix working — and the
 *  decoy 431 lines up in the aim-freshness paragraph has drifted from 23 724 to **23 805**,
 *  because GREEN rewrote the paragraph it sits in. So 600 still clears the nearest
 *  legitimate cite by ~3× and misses the decoy by ~40×, and no plausible re-wrap moves
 *  either across it.
 *
 *  Recompute (no `tools/` needed): flatten `sim.ts` and `gameRules.ts` with `flat()` above,
 *  then diff the indices of `/\+10\./` against `/WSMAIN\.MAC:3881|WSGUNS\.MAC:918/`. */
const CITATION_WINDOW = 600
function windowsAround(text: string, claim: RegExp, radius = CITATION_WINDOW): string[] {
  const re = new RegExp(claim.source, claim.flags.includes('g') ? claim.flags : claim.flags + 'g')
  return [...text.matchAll(re)].map((m) =>
    text.slice(Math.max(0, m.index - radius), Math.min(text.length, m.index + radius)),
  )
}

/** The FLATTENED sentence containing index `i`.
 *
 *  A character radius is the right scope for "is the citation beside the claim" and the
 *  WRONG one for "which mechanism does this figure belong to" — the round-3 review's Z1 sits
 *  inside a 600-character window that also contains the word it must not be attributed to
 *  (`tie-status.ts` says "the same viewport aspect" some 400 characters above the flick
 *  sentence). An attribution is owned by a sentence, so that is the unit matched.
 *
 *  Bounded by `[.!?]` + whitespace, which the flattened comments produce only at real
 *  sentence ends: `0.1`, `WSMAIN.MAC:3881` and `sim.ts:341` all keep a non-space after the
 *  dot, so none of them splits. `:` and `;` are deliberately NOT breaks — `sim.ts` names the
 *  mechanism before the colon ("The aspect gap grows with the yoke, though: 2694 u at full
 *  deflection"), and breaking there would strip the subject off its own figure and make a
 *  correct sentence unattributable. */
function sentenceAt(text: string, i: number): string {
  let start = 0
  for (const m of text.slice(0, i).matchAll(/[.!?]\s+/g)) start = m.index + m[0].length
  const rel = text.slice(i).search(/[.!?]\s+/)
  return text.slice(start, rel < 0 ? text.length : i + rel + 1)
}

describe('sw8-27 F1 — the preamble no longer calls the divergence this story closed deliberate', () => {
  // The whole paragraph, `sim.ts:169-178` at the time of the review:
  //
  //   RETIRED: "A SECOND, unrelated way for the gun and the bit to disagree is now shipped
  //   ON PURPOSE: since sw8-19, C_PS is gated on C_PV, so an off-glass fighter is not
  //   sighted — while `beamHit` below still resolves it … Closing the second one is filed
  //   separately, and it is not a change to `beamHit`"
  //
  // Three independent falsehoods, asserted separately so a partial rewrite reports WHICH
  // clause survived rather than one opaque failure.

  it('does not say the gun/bit disagreement is shipped ON PURPOSE', () => {
    // Verified PRESENT at RED: 1 occurrence of `shipped ON PURPOSE` in sim.ts.
    expect(sim(), 'the visibility divergence is closed as of this story, not designed in').not.toMatch(
      /shipped\s+ON PURPOSE/i,
    )
  })

  it('does not say closing it is FILED SEPARATELY — it is this commit', () => {
    // Verified PRESENT at RED: 1 occurrence of `filed separately` in sim.ts.
    expect(sim(), 'sw8-27 IS the separate filing; there is nothing left to file').not.toMatch(/filed separately/i)
  })

  it('does not claim `beamHit` still resolves the off-glass fighter', () => {
    // Verified PRESENT at RED: 1 occurrence of "while `beamHit` below still resolves it".
    // The space arm does not call `beamHit` at all any more.
    expect(sim(), 'the space arm resolves its own hits; `beamHit` is not below it').not.toMatch(
      /`beamHit` below still resolves/,
    )
  })

  it('POSITIVE — the paragraph names what actually replaced the divergence', () => {
    // The half a deletion cannot satisfy. `spaceSiteHit` is the local the space arm now
    // resolves through, and `inPlayerView` is the gate it applies; a preamble that describes
    // the gun's relationship to the sights bit and mentions neither is describing code that
    // is no longer there. Both are real symbols in this file, so this is an anchor that
    // moves with the code rather than a phrase to be matched.
    const src = read('src', 'core', 'sim.ts')
    expect(src, 'fixture guard: `spaceSiteHit` really is the symbol in question').toMatch(/const spaceSiteHit =/)
    // Bounded by code at BOTH ends since the round-2 review (R2's defect class): the old
    // slice started at character 0, so every import and file-header comment above
    // `stepGame` was in scope for a match that has to land in the preamble itself.
    expect(preambleOf(src), 'the stepGame preamble must describe the arm that exists now').toMatch(
      /spaceSiteHit|inPlayerView/,
    )
  })
})

describe('sw8-27 F6 — the retired 2·R disc is gone from the files that describe the band', () => {
  it('sim.ts no longer measures the aim-freshness gap against a 500 u band', () => {
    // Verified PRESENT at RED: 1 occurrence of `500 u band` in sim.ts (`sim.ts:166`).
    // RETIRED: "a single-frame yoke move of 0.1 separates the two rays by 613 u against a
    // 500 u band". The band is the L1 octagon now — 750 u on the axis, 375 per axis on the
    // diagonal — so the number is wrong and, worse, the comparison changed sign in spirit:
    // 613 no longer clears the band outright.
    expect(sim(), 'the 500 u disc was retired by this story').not.toMatch(/500 u band/)
  })

  it('tie-status.ts no longer measures it against a 500 u band either', () => {
    // Verified PRESENT at RED: 1 occurrence of `500 u band` in tie-status.ts (`:313`).
    expect(tieStatus(), 'same retired disc, same story').not.toMatch(/500 u band/)
  })

  it('tie-status.ts no longer describes C_PS as a ray within SIGHTS_BAND_FACTOR × the radius', () => {
    // The worst of the seven, because it contradicts this story's OWN new paragraph 85 lines
    // below it. RETIRED (`tie-status.ts:295-300`): "Ported as the AIM RAY passing within
    // SIGHTS_BAND_FACTOR × the target's hit radius". C_PS is `|dx| + |dy| <= 3·TMPSIZ`, an
    // L1 octagon, which has no radius at all.
    //
    // Verified PRESENT at RED: 1 occurrence of `AIM RAY passing within` in tie-status.ts.
    expect(tieStatus(), 'C_PS is an L1 octagon on screen deltas, not a distance from the ray').not.toMatch(
      /AIM RAY passing within\s+SIGHTS_BAND_FACTOR/,
    )
  })

  it('POSITIVE — and the C_PS BLOCK says what the band IS', () => {
    // Again the half a deletion cannot satisfy: the file that derives C_PS must describe the
    // region it derives. `SIGHTS_OCTAGON` is the exported constant that region is built from.
    //
    // R2 (round-2 review): this matched the whole file, and `SIGHTS_OCTAGON` appears in it
    // twice outside any prose — the constant's own declaration at `tie-status.ts:180` and
    // the predicate that reads it at `:400`. Gutting every mention from the C_PS paragraph
    // left all 12 tests green, so the anchor verified that the symbol EXISTS, which was
    // never in doubt. `cpsBlock` is bounded by code on both sides and excludes both.
    expect(cpsBlock(), 'the C_PS derivation must name the octagon it tests').toMatch(/SIGHTS_OCTAGON/)
  })
})

describe('sw8-27 F9 — the `+10.` cursor fudge is not offered as what makes the ground pass different', () => {
  // RESOLVED, not spelled. The claim under test is a ROM claim, so it is settled against the
  // ROM: if the `+10.` term appears in all three collision passes it cannot be a
  // differentiator, whatever any comment says about it.
  const CURSOR_FUDGE = /ADDD\s+#10\./

  it('the ROM itself: all three passes add the same cursor size', () => {
    // The measurement the finding rests on, re-derived here so the assertions below are not
    // taking the review's word for it.
    expect(rom('WSMAIN.MAC')[3880], 'space aliens, WSMAIN.MAC:3881').toMatch(CURSOR_FUDGE)
    expect(rom('WSMAIN.MAC')[3880], 'and it is the CURSOR being added').toMatch(/ADDIN CURSOR SIZE/)
    expect(rom('WSGUNS.MAC')[917], 'fireballs, WSGUNS.MAC:918').toMatch(CURSOR_FUDGE)
    expect(rom('WSGUNS.MAC')[917], 'likewise').toMatch(/SIZE OF CURSOR/)
    expect(rom('WSGRND.MAC')[1077], 'ground, WSGRND.MAC:1078').toMatch(CURSOR_FUDGE)
    expect(rom('WSGRND.MAC')[1077], 'likewise').toMatch(/SITE RADIUS FOR FUDGE/)
  })

  it('so no source comment presents it as a ground-only property', () => {
    // Verified PRESENT at the round-2 rework: the `+10.` term occurs exactly once in each
    // file — `sim.ts:594` and `gameRules.ts:125` — in both cases inside the sentence about
    // how the GROUND test differs.
    //
    // The rule is not "never mention it" — it is "do not mention it as the difference".
    // A file may keep the term as long as it also records that the space passes carry it,
    // which is what makes the statement true. The real differentiators are the unrotated
    // width/height box and the absent octagon.
    //
    // R1 (round-2 review): the citation was matched against the whole flattened file, and
    // `sim.ts:163` carries `WSMAIN.MAC:3881-3930` in the aim-freshness paragraph — 431
    // lines and 23 724 flattened characters from the sentence it was credited with
    // supporting. Reinstating the exact retired claim left all 12 tests green. The
    // citation is now required in the WINDOW around the mention, which is the only place
    // it can be doing the job this test credits it with.
    //
    // `gameRules.ts` passes: its cite sits 193 characters below the sentence. `sim.ts`
    // defers to `gameRules.ts` by name and cites nothing locally — that is the RED, and
    // Dev clears it by naming `WSMAIN.MAC:3881` (or `WSGUNS.MAC:918`) in that sentence, or
    // by dropping the term from the contrast entirely.
    const CITE = /WSMAIN\.MAC:3881|WSGUNS\.MAC:918/
    const examined: string[] = []
    const carrying: string[] = []
    for (const [name, text] of [
      ['sim.ts', sim()],
      ['gameRules.ts', gameRules()],
    ] as const) {
      examined.push(name)
      const windows = windowsAround(text, /\+10\./)
      if (windows.length === 0) continue
      carrying.push(name)
      for (const w of windows) {
        expect(
          w,
          `${name}: the +10. fudge is common to all three passes, so a file that names it must say so ` +
            'IN THAT SENTENCE (cite WSMAIN.MAC:3881 or WSGUNS.MAC:918 beside it, or drop it from the contrast)',
        ).toMatch(CITE)
      }
    }
    // R8 (round-2 review): the loop above records that it examined something. Without this
    // the `continue` was the only thing standing between a two-file sweep and a sweep of
    // nothing, and nothing in the result would have said which.
    expect(examined, 'floor: both files that describe the ground contrast were opened').toEqual([
      'sim.ts',
      'gameRules.ts',
    ])
    // And the non-vacuity floor, which is a DIFFERENT question: the assertions above run
    // only for files that still name the term. Both do today. A legitimate zero is
    // reachable — the fix column allows dropping the term outright — and it means this
    // guard has nothing left to guard, at which point DELETE it rather than let it sit
    // green. It must never reach zero silently.
    expect(
      carrying.length,
      'non-vacuity: at least one file still names the +10. fudge, so the assertions above ran',
    ).toBeGreaterThan(0)
  })
})

describe('sw8-27 F10 — VWGUN’s four exits are cited as the compare-and-branch PAIRS they are', () => {
  // Each exit is two instructions: a compare, then a long branch to `90$`. The quoted text
  // beside these citations is the pair, so a single-line span does not contain its own
  // quote. The parallel `S2VW` four were already written as ranges.
  const EXITS: ReadonlyArray<readonly [number, number, RegExp]> = [
    [884, 885, /LBLE\s+90\$/],
    [886, 887, /LBHI\s+90\$/],
    [895, 896, /LBHS\s+90\$/],
    [902, 903, /LBHS\s+90\$/],
  ]

  it('RESOLVED — each two-line span really does hold a compare AND its branch', () => {
    // The check that keeps the assertion below from being a spelling test: open the spans.
    const lines = rom('WSGUNS.MAC')
    for (const [start, end, branch] of EXITS) {
      const span = lines.slice(start - 1, end)
      expect(span.join(' '), `WSGUNS.MAC:${start}-${end} holds the compare`).toMatch(/CMPD|SUBD/)
      expect(span.join(' '), `WSGUNS.MAC:${start}-${end} holds the branch`).toMatch(branch)
      expect(lines[start - 1], `WSGUNS.MAC:${start} is the COMPARE — a one-line cite would miss it`).toMatch(
        /CMPD|SUBD/,
      )
    }
  })

  it('and the source comments cite them that way', () => {
    // Verified PRESENT at RED: `sim.ts:558` and `tie-status.ts:366` both spell the four as
    // the single BRANCH lines — ":885, :887, :896, :903".
    const examined: string[] = []
    const carrying: string[] = []
    for (const [name, text] of [
      ['sim.ts', sim()],
      ['tie-status.ts', tieStatus()],
    ] as const) {
      examined.push(name)
      if (!/VWGUN/.test(text)) continue
      carrying.push(name)
      for (const [start, end] of EXITS) {
        expect(text, `${name}: VWGUN exit ${start}-${end} is cited as its two-line span`).toMatch(
          new RegExp(`:${start}-${end}\\b`),
        )
      }
    }
    // R8, same shape as F9's floor above. This loop is not currently vacuous — a missing
    // file throws rather than passing — but it is the form check #15 names, and a guard
    // whose scope was ALSO wrong is what R1 looked like.
    expect(examined, 'floor: both files that cite VWGUN were opened').toEqual(['sim.ts', 'tie-status.ts'])
    expect(carrying, 'non-vacuity: both still name VWGUN, so the four span assertions ran for each').toEqual([
      'sim.ts',
      'tie-status.ts',
    ])
  })
})

describe('sw8-27 R5 — the separation examples support the conclusion attached to them', () => {
  // The round-2 review's R5. sw8-27 widened the warning band from the retired 500 u disc to
  // the cabinet's L1 octagon, 3 × TIE_HIT_RADIUS = 750 u on the axis. Two source comments
  // made that 500 → 750 edit and did NOT re-derive the conclusion resting on it, so they now
  // quote a separation SMALLER than the band as evidence that the gun and the sights bit
  // disagree. Against a 500 u disc, 613 and 539 both cleared it and the sentences were true.
  //
  // This is RESOLVED rather than spelled: every figure is re-derived below from the
  // production geometry (`aimDirection`, `FOV_Y`) and the production constants
  // (`SIGHTS_OCTAGON`, `TIE_HIT_RADIUS`), so what is asserted is the arithmetic, not a token.
  // The two TEST files that made the same 500 → 750 edit DID re-derive and quote the
  // crossover correctly (`tie-sights-status.test.ts:286-288`,
  // `tie-loiter-sights.test.ts:236-239`) — the care was available and was not applied here.
  //
  // == ROUND 3 (Z2): A CROSSOVER BELONGS TO A MECHANISM ==============================
  //
  // The first version of the prose guard below asked `/\b2694\b|\b28\s?%/` of a correctly
  // scoped block. Scope was the round-2 lesson and it was applied faithfully; the assertion
  // inside the scope was still a digit match, and a digit match cannot see the only thing
  // R5 is about — WHICH mechanism a figure is attached to. It was mutation-proven in both
  // directions and failed both: a sentence reading "2694 u is the price of a banana, so
  // past ~28% of Tuesday it bites" passed, and the CORRECT re-derivation for the block that
  // carries it turned red, whereupon the failure message instructed the author to put the
  // wrong number back. A guard that punishes the true statement is worse than no guard.
  //
  // There are TWO mechanisms here and they differ by 2.3×, so the confusion is not a
  // rounding error:
  //
  //   * the AIM-FRESHNESS gap — one frame of stale yoke. Its separation is a function of
  //     the CHANGE in aim alone (615.8 u per 0.1 wherever the yoke already sits, asserted
  //     over the domain below), so at full travel it is 6158 u and it crosses the band at
  //     ~12% of travel in one frame;
  //   * the ASPECT drop — the same yoke read against a different viewport. This one DOES
  //     grow with absolute deflection: 539 u at yoke 0.2, 2694 u at full, crossing at ~28%.
  //
  // So the guard derives the pair per mechanism and matches it against the SENTENCE that
  // makes the claim, and its failure message quotes the computed figure rather than a typed
  // one — it cannot prescribe a stale number, because it has no stale number to prescribe.

  const DEPTH = 6000
  const WIDE = 16 / 9
  const BAND = SIGHTS_OCTAGON * TIE_HIT_RADIUS

  /** Where a ray sits in the target's DEPTH PLANE — the plane `siteOffset` measures dx/dy
   *  in, and therefore the plane the octagon bound applies to. */
  const inPlane = (aimX: number, aspect: number): [number, number] => {
    const d = aimDirection(aimX, 0, aspect)
    const t = DEPTH / -d[2]
    return [d[0] * t, d[1] * t]
  }
  const apart = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1])

  /** The two mechanisms the two blocks describe. `full` is the separation at FULL yoke
   *  travel and is COMPUTED from the production geometry, never typed — which is what stops
   *  the guard below being wrong about which mechanism it is checking, since it will have
   *  worked the answer out. `names` is how a sentence declares which one it is talking
   *  about; both spellings are the ones the two files already use. */
  const MECHANISMS = [
    {
      what: 'the aim-freshness gap (one frame of stale yoke)',
      names: /stale aim|flick|freshness/i,
      full: apart(inPlane(0, WIDE), inPlane(1, WIDE)),
    },
    {
      what: 'the aspect drop (the same yoke against a different viewport)',
      names: /aspect/i,
      full: apart(inPlane(1, WIDE), inPlane(1, 1)),
    },
  ] as const

  it('RESOLVED — the two quoted separations are BELOW the band, and the crossover is not', () => {
    // Fixture anchors first: if either production constant is retuned, every number below
    // moves and this test must be re-derived rather than quietly re-passing.
    expect(TIE_HIT_RADIUS, 'fixture anchor: the established TIE kill radius').toBe(250)
    expect(SIGHTS_OCTAGON, 'fixture anchor: the sights octagon, WSMAIN.MAC:3920-3923').toBe(3)
    expect(BAND, 'the band on the axis, which is what a pure-lateral separation is measured against').toBe(750)
    expect(FOV_Y, 'fixture anchor: the projection the yoke inverts').toBeCloseTo(Math.PI / 3, 10)

    // The aim-freshness example: one frame of yoke at 0.1, both rays built at 16:9.
    const flick = apart(inPlane(0, WIDE), inPlane(0.1, WIDE))
    expect(flick, 'a one-frame flick of 0.1 at depth 6000 on 16:9').toBeCloseTo(615.8, 1)
    // The prose says 613, which is the same gap measured along the RAY rather than in the
    // depth plane — 2.4 u apart, and nothing here turns on which. Both are recorded so a
    // later reader does not "correct" one into the other and redden this.
    const alongRay = (() => {
      const [a, b] = [aimDirection(0, 0, WIDE), aimDirection(0.1, 0, WIDE)]
      return Math.hypot(a[0] * DEPTH - b[0] * DEPTH, a[1] * DEPTH - b[1] * DEPTH, a[2] * DEPTH - b[2] * DEPTH)
    })()
    expect(alongRay, 'the same flick measured along the ray — the figure the prose quotes').toBeCloseTo(613.4, 1)

    // The static example: the same yoke, the aspect dropped.
    const dropped = apart(inPlane(0.2, WIDE), inPlane(0.2, 1))
    expect(dropped, 'dropping the aspect at yoke 0.2').toBeCloseTo(538.9, 1)

    // THE FINDING. A fighter centred on one ray is outside the OTHER's band only once the
    // separation exceeds the band; on the axis a pure-lateral offset gives |dx| = the
    // separation and |dy| = 0, so the octagon bound is the flat 750.
    expect(flick, '615.8 does not clear a 750 u band').toBeLessThan(BAND)
    expect(alongRay, 'and neither does 613.4 — the figure the sentence actually quotes').toBeLessThan(BAND)
    expect(dropped, 'nor does 538.9').toBeLessThan(BAND)

    // What DOES clear it, and where — PER MECHANISM. Round 3 (Z1/Z2): the whole defect is
    // that one file took the second figure below and attached it to the first mechanism.
    const [fresh, aspect] = MECHANISMS

    // The aim-freshness gap first, because it is the one the numbers were taken from. Its
    // separation depends on the CHANGE in yoke and not on where the yoke already is, which
    // is why "at full deflection" is a category error for it: there is no such thing as a
    // stale-aim gap "at full deflection", only one for a flick of a given size.
    for (const base of [0, 0.4, 0.9]) {
      expect(
        apart(inPlane(base, WIDE), inPlane(base + 0.1, WIDE)),
        `a 0.1 flick starting from yoke ${base} — the freshness gap does not know where the yoke was`,
      ).toBeCloseTo(615.8, 1)
    }
    expect(fresh.full, 'so a FULL-TRAVEL flick separates the two rays by this much').toBeCloseTo(6158.4, 1)
    expect(fresh.full, 'which clears the band').toBeGreaterThan(BAND)
    expect(BAND / fresh.full, 'and it crosses at ~12.2% of travel in one frame, not 28%').toBeCloseTo(0.1218, 4)

    // The aspect drop second. This one genuinely does grow with absolute deflection — 539 u
    // at yoke 0.2 (measured above), 2694 u at full — so a crossover in % of travel is the
    // right shape for it, and 28% is the right value FOR IT.
    expect(aspect.full, 'the aspect drop at full deflection').toBeCloseTo(2694.3, 1)
    expect(aspect.full, 'which does clear the band').toBeGreaterThan(BAND)
    expect(BAND / aspect.full, 'so the crossover is ~27.8% of yoke travel, not zero').toBeCloseTo(0.278, 3)
    expect(dropped / aspect.full, 'and it is LINEAR in the yoke, so yoke 0.2 is a fifth of full').toBeCloseTo(0.2, 3)

    // THE DISCRIMINATOR. The two full-travel figures are 2.3× apart, so a sentence that
    // quotes one while naming the other is not off by a rounding — it is off by more than
    // the band itself, and in the direction that matters: the freshness gap bites at less
    // than half the deflection the smaller figure implies.
    expect(fresh.full / aspect.full, 'the two mechanisms are nowhere near each other').toBeCloseTo(2.286, 2)
    expect(
      BAND / fresh.full,
      'and quoting the aspect crossover for the freshness gap OVERSTATES the safe travel 2.3×',
    ).toBeLessThan(BAND / aspect.full)
  })

  it('so neither source comment offers a sub-band separation as the divergence', () => {
    // Scoped to the BLOCK that carries the claim in each file, never the file (R1/R2's
    // defect class), and then — round 3 (Z2) — to the SENTENCE that makes the claim, because
    // scope alone cannot tell a right crossover from a wrong one. Three routes clear this and
    // the fix column allows all three: quote the crossover FOR THIS MECHANISM alongside the
    // example, drop the sub-band figures, or drop the comparison against the band. What must
    // not survive is a sub-band example paired with the band and no honest crossover.
    const SUB_BAND = /\b(613|539)\b/ // the two figures measured above, both < 750
    const THE_BAND = /\b750\b/
    const AT_FULL = /full[- ](?:deflection|travel)/g
    /** A separation quoted in world units. Commas tolerated so `6,158 u` is read, not
     *  silently re-read as `158`. */
    const QUOTED_U = /(\d[\d,.]*)\s*u\b/g
    const QUOTED_PCT = /(\d+(?:\.\d+)?)\s?%/g
    const examined: string[] = []
    const pairing: string[] = []
    const claimsChecked: string[] = []
    for (const [name, text] of [
      ['sim.ts (the stepGame preamble)', preambleOf(read('src', 'core', 'sim.ts'))],
      ['tie-status.ts (the C_PS block)', cpsBlock()],
    ] as const) {
      examined.push(name)
      if (!SUB_BAND.test(text) || !THE_BAND.test(text)) continue
      pairing.push(name)

      const claims = [...text.matchAll(AT_FULL)].map((m) => sentenceAt(text, m.index))
      expect(
        claims.length,
        `${name}: 613 u and 539 u are both INSIDE the 750 u band this story widened it to, so ` +
          'neither shows the gun resolving what the bit denies. Say where the separation DOES ' +
          'clear the band ("… at full travel, so past …% of travel"), or retire the example.',
      ).toBeGreaterThan(0)

      for (const s of claims) {
        claimsChecked.push(s)
        // WHICH mechanism is this sentence about? Exactly one, or the figures in it belong
        // to nothing in particular — which is the defect, stated precisely.
        const named = MECHANISMS.filter((m) => m.names.test(s))
        expect(
          named.map((m) => m.what),
          `${name}: a crossover belongs to ONE mechanism, and this sentence names ${named.length}. ` +
            `Name the mechanism the figure belongs to, as sim.ts does ("The aspect gap grows with ` +
            `the yoke, though: …"). The sentence: "${s}"`,
        ).toHaveLength(1)
        const mech = named[0]

        // The separation it quotes AT FULL TRAVEL: the last figure in units before the
        // phrase, so `750 u on the axis, but 2694 u at full deflection` reads 2694 and not
        // the band it was contrasted against.
        const at = s.search(/full[- ](?:deflection|travel)/)
        const mags = [...s.slice(0, at).matchAll(QUOTED_U)].map((m) => Number(m[1].replace(/,/g, '')))
        expect(
          mags.length,
          `${name}: this sentence reaches full travel without saying how far apart the rays are ` +
            `there. ${mech.what} separates them by ${mech.full.toFixed(1)} u. The sentence: "${s}"`,
        ).toBeGreaterThan(0)
        expect(
          Math.round(mags[mags.length - 1]),
          `${name}: this sentence is about ${mech.what}, which at full travel separates the rays ` +
            `by ${mech.full.toFixed(1)} u — the figure quoted is another mechanism's. The ` +
            `sentence: "${s}"`,
        ).toBe(Math.round(mech.full))

        // And where it bites. Every percentage in the crossover sentence must be THIS
        // mechanism's crossover: a second one in the same sentence is the wrong mechanism's
        // being smuggled in beside the right one. If a sentence legitimately needs another
        // percentage, split it — an attribution is owned by a sentence.
        const want = (BAND / mech.full) * 100
        const pcts = [...s.matchAll(QUOTED_PCT)].map((m) => Number(m[1]))
        expect(
          pcts.length,
          `${name}: the crossover sentence must say WHERE it bites, as a % of travel — ` +
            `${mech.what} crosses the ${BAND} u band at ${want.toFixed(1)}%. The sentence: "${s}"`,
        ).toBeGreaterThan(0)
        for (const p of pcts) {
          expect(
            Math.abs(p - want),
            `${name}: ${mech.what} crosses the ${BAND} u band at ${want.toFixed(1)}% of travel ` +
              `(${BAND} / ${mech.full.toFixed(1)}), so ${p}% is the other mechanism's crossover. ` +
              `The sentence: "${s}"`,
          ).toBeLessThanOrEqual(0.5)
        }
      }
    }
    expect(examined.length, 'floor: both blocks that carry the claim were opened').toBe(2)
    expect(
      pairing.length,
      'non-vacuity: the assertion above ran. A zero here means both blocks stopped comparing a ' +
        'separation against the band, which is a real fix — delete this guard rather than leave it green.',
    ).toBeGreaterThan(0)
    expect(
      claimsChecked.length,
      'non-vacuity: at least one crossover sentence was actually opened and its arithmetic checked, ' +
        'rather than the loop finding none and the block passing on the floors alone',
    ).toBeGreaterThan(0)
  })
})

describe('sw8-27 R6 — coaching.ts does not deny the mode assignments sim.ts makes', () => {
  // The round-2 review's R6, and the one finding in this file that is FALSE rather than
  // merely stale. `coaching.ts` says production "signals death with `gameOver: true` while
  // `mode` stays `'playing'` … and nothing in `src/` ever assigns `mode: 'gameover'`".
  // Four sites do, each in the same object literal as its `gameOver:` sibling. sw8-27's
  // diff shifted the first of the four cited line numbers and re-asserted the paragraph as
  // current without opening it — a mechanical re-anchor preserves a wrong target rather
  // than fixing it, which is why this is carved out of the pre-existing citation drift.
  //
  // RESOLVED against `sim.ts` itself, so the claim is settled rather than spelled.

  const MODE_ASSIGN = /^\s*mode:\s*.*'gameover'/
  const simLines = () => read('src', 'core', 'sim.ts').split(/\r\n|\r|\n/)

  it('the machine: sim.ts assigns `mode: gameover`, beside `gameOver`, at four sites', () => {
    const lines = simLines()
    const sites = lines.flatMap((l, i) => (MODE_ASSIGN.test(l) ? [i + 1] : []))
    expect(sites.length, "sim.ts assigns mode 'gameover' — the claim under test says nothing does").toBe(4)
    // And each sits with its `gameOver:` sibling, which refutes the other half of the claim:
    // the mode does not stay 'playing' while gameOver flips — they move together, in one
    // literal. Searched ±2 lines rather than exactly one, so a formatter cannot redden this.
    for (const line of sites) {
      const near = lines.slice(Math.max(0, line - 3), line + 2).join('\n')
      expect(near, `sim.ts:${line} sets the mode in the same literal as gameOver`).toMatch(/gameOver:/)
    }
  })

  it('so coaching.ts no longer claims nothing in src/ ever assigns it', () => {
    // Verified PRESENT at the round-2 rework: 1 occurrence in coaching.ts.
    expect(
      flat(read('src', 'core', 'coaching.ts')),
      "four sites in sim.ts assign mode 'gameover'; the claim is false, not stale",
    ).not.toMatch(/nothing in .{0,4}src\/.{0,4} ever assigns/i)
  })

  it('and no longer claims the mode stays `playing` when the run ends', () => {
    // Verified PRESENT at the round-2 rework: 1 occurrence in coaching.ts. The guard the
    // paragraph justifies may well be right — `gameOver` and the mode move together, so
    // either test would clear the hint — but the REASON given for it is not.
    expect(
      flat(read('src', 'core', 'coaching.ts')),
      'the mode is set to gameover in the same literal as gameOver, not left at playing',
    ).not.toMatch(/while .{0,4}mode.{0,4} stays/i)
  })

  it('RESOLVED — and every sim.ts line it cites is the KIND of site the sentence claims', () => {
    // The half a rewrite cannot fake: the cited numbers are opened against the working tree.
    // At the round-2 rework they were `:567`, `:937`, `:1185` and `:1344`, landing on a `Set`
    // construction, a docstring, a closing brace and an `events` field — none of them
    // gameOver-related. BARE spellings are parsed too (`sim.ts:567, :937, …` inherits its
    // filename from the first), because a `sim\.ts:` regex is blind to them and that is how
    // three of those four evaded every citation sweep the story ran.
    //
    // ROUND 3 (Z3): requiring each cited line to match `/gameOver|'gameover'/` asserts the
    // WORD, not the claim. The paragraph says the death sites set gameOver ALONGSIDE the
    // mode; retargeting every citation to `sim.ts:241`/`:256` — which are `gameOver: false`
    // inside `mode: 'attract'` literals on the name-entry/restart path, the opposite of a
    // death site — left this green. Today's citations happen to be right, so that was a
    // latent hole rather than a live falsehood, and a latent hole is exactly what a
    // mechanical re-anchor walks into: it preserves a wrong target rather than fixing it.
    //
    // So the two populations the paragraph talks about are DERIVED from `sim.ts` and every
    // citation is classified against them:
    //
    //   a PAIRING site  — a `gameOver:` line with `mode: … 'gameover'` within ±2 lines. This
    //                     is the "set gameOver alongside the mode" claim, in code.
    //   a game-over BRANCH — an `if (…)` on the flag or the mode, which is what the clause
    //                     "the branch at sim.ts:221 is finalised now" cites. It is a
    //                     different claim about a different kind of line, and collapsing the
    //                     two is how :221 would be failed for being correct.
    //
    // A citation must be one or the other, and every PAIRING site must be cited, because the
    // sentence presents its list as *the* death sites rather than as examples.
    const lines = simLines()
    const GAMEOVER_FIELD = /^\s*gameOver:/
    const GAMEOVER_BRANCH = /^\s*(?:\}\s*)?(?:else\s+)?if\s*\(.*(?:gameOver|'gameover')/
    const pairingSites = lines.flatMap((l, i) =>
      GAMEOVER_FIELD.test(l) && lines.slice(Math.max(0, i - 2), i + 3).some((n) => MODE_ASSIGN.test(n)) ? [i + 1] : [],
    )
    const branches = lines.flatMap((l, i) => (GAMEOVER_BRANCH.test(l) ? [i + 1] : []))

    // Fixture anchors, so a derivation that quietly matched nothing cannot pass this by
    // admitting everything. Derived, not typed — if sim.ts gains a fifth death site these
    // three lines are what say so, along with the `toBe(4)` seat above.
    expect(pairingSites, 'fixture: the death sites that set BOTH, derived from sim.ts').toEqual([757, 1261, 1509, 1667])
    expect(branches, 'fixture: and the places sim.ts branches on the end of a run').toEqual([221, 932, 943, 1846])
    // THE DISCRIMINATOR, and the reason the retired token check was not one: `sim.ts` has
    // `gameOver:` lines that are not death sites at all, and the old assertion accepted them.
    const wordWithoutPairing = lines.flatMap((l, i) =>
      GAMEOVER_FIELD.test(l) && !pairingSites.includes(i + 1) ? [i + 1] : [],
    )
    expect(
      wordWithoutPairing,
      'fixture: these two carry the word `gameOver:` WITHOUT the pairing — they are the ' +
        "`gameOver: false` fields in the `mode: 'attract'` literals, and citing them would be false",
    ).toEqual([241, 256])

    const src = read('src', 'core', 'coaching.ts')
    const guard = block(src, "coachingFor's death guard", 'export function coachingFor', 'if (s.wave !== 1)')
    const cited = [...guard.matchAll(/sim\.ts:(\d+)|[\s(,]:(\d+)/g)].map((m) => Number(m[1] ?? m[2]))
    expect(cited.length, 'fixture guard: the paragraph does cite sim.ts, so this check has work to do').toBeGreaterThan(
      0,
    )
    for (const n of cited) {
      expect(
        lines[n - 1] ?? `(sim.ts has only ${lines.length} lines)`,
        `coaching.ts cites sim.ts:${n} for the end of a run — that line must mention it`,
      ).toMatch(/gameOver|'gameover'/)
      expect(
        pairingSites.includes(n) || branches.includes(n),
        `coaching.ts cites sim.ts:${n}, but that line is neither a death site setting gameOver ` +
          `alongside the mode (${pairingSites.join(', ')}) nor a branch on the end of a run ` +
          `(${branches.join(', ')}), so it does not support the sentence it sits in. ` +
          `sim.ts:${n} reads: ${lines[n - 1]?.trim() ?? '(past the end of the file)'}`,
      ).toBe(true)
    }
    // And the list is COMPLETE, not a sample. "The death sites set gameOver alongside the
    // mode" is a claim about all of them, so one added to sim.ts and left uncited makes the
    // paragraph false by omission — the drift this whole file exists to catch, running the
    // other way.
    expect(
      pairingSites.filter((n) => !cited.includes(n)),
      'the paragraph claims what THE death sites do, so every one of them must be cited by it',
    ).toEqual([])
  })
})
