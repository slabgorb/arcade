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
 *  retired claim was reinstated. MEASURED at the round-2 rework, so the radius is a
 *  reproducible choice rather than a round number: in `gameRules.ts` the supporting
 *  citation sits **193 characters** from the `+10.` mention it belongs to; in `sim.ts` the
 *  nearest one is **23 724** away, in the aim-freshness paragraph 431 lines up. 600 clears
 *  the first by 3× and misses the second by 40×, so no plausible re-wrap moves either
 *  across it. Recompute with `tools/`-free node: flatten both files and diff the indices. */
const CITATION_WINDOW = 600
function windowsAround(text: string, claim: RegExp, radius = CITATION_WINDOW): string[] {
  const re = new RegExp(claim.source, claim.flags.includes('g') ? claim.flags : claim.flags + 'g')
  return [...text.matchAll(re)].map((m) =>
    text.slice(Math.max(0, m.index - radius), Math.min(text.length, m.index + radius)),
  )
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

    // What DOES clear it, and where. This is the figure the two sentences need.
    const full = apart(inPlane(1, WIDE), inPlane(1, 1))
    expect(full, 'the aspect drop at full deflection').toBeCloseTo(2694.3, 1)
    expect(full, 'which does clear the band').toBeGreaterThan(BAND)
    expect(BAND / full, 'so the crossover is ~28% of yoke travel, not zero').toBeCloseTo(0.278, 3)
  })

  it('so neither source comment offers a sub-band separation as the divergence', () => {
    // Scoped to the BLOCK that carries the claim in each file, never the file (R1/R2's
    // defect class). Three routes clear this and the fix column allows all three: quote the
    // crossover alongside the example, drop the sub-band figures, or drop the comparison
    // against the band. What must not survive is the pairing.
    const SUB_BAND = /\b(613|539)\b/ // the two figures measured above, both < 750
    const THE_BAND = /\b750\b/
    const CROSSOVER = /\b2694\b|\b28\s?%/
    const examined: string[] = []
    const pairing: string[] = []
    for (const [name, text] of [
      ['sim.ts (the stepGame preamble)', preambleOf(read('src', 'core', 'sim.ts'))],
      ['tie-status.ts (the C_PS block)', cpsBlock()],
    ] as const) {
      examined.push(name)
      if (!SUB_BAND.test(text) || !THE_BAND.test(text)) continue
      pairing.push(name)
      expect(
        text,
        `${name}: 613 u and 539 u are both INSIDE the 750 u band this story widened it to, so ` +
          'neither shows the gun resolving what the bit denies. Quote the crossover ' +
          '(750 / 2694 ≈ 28% of yoke travel) beside the example, or retire the example.',
      ).toMatch(CROSSOVER)
    }
    expect(examined.length, 'floor: both blocks that carry the claim were opened').toBe(2)
    expect(
      pairing.length,
      'non-vacuity: the assertion above ran. A zero here means both blocks stopped comparing a ' +
        'separation against the band, which is a real fix — delete this guard rather than leave it green.',
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

  it('RESOLVED — and every sim.ts line it cites for the end of a run really mentions it', () => {
    // The half a rewrite cannot fake: the four cited numbers are opened against the working
    // tree. At the round-2 rework they were `:567`, `:937`, `:1185` and `:1344`, landing on
    // a `Set` construction, a docstring, a closing brace and an `events` field — none of
    // them gameOver-related. BARE spellings are parsed too (`sim.ts:567, :937, …` inherits
    // its filename from the first), because a `sim\.ts:` regex is blind to them and that is
    // how three of these four evaded every citation sweep the story ran.
    const src = read('src', 'core', 'coaching.ts')
    const guard = block(src, "coachingFor's death guard", 'export function coachingFor', 'if (s.wave !== 1)')
    const cited = [...guard.matchAll(/sim\.ts:(\d+)|[\s(,]:(\d+)/g)].map((m) => Number(m[1] ?? m[2]))
    expect(cited.length, 'fixture guard: the paragraph does cite sim.ts, so this check has work to do').toBeGreaterThan(
      0,
    )
    const lines = simLines()
    for (const n of cited) {
      expect(
        lines[n - 1] ?? `(sim.ts has only ${lines.length} lines)`,
        `coaching.ts cites sim.ts:${n} for the end of a run — that line must mention it`,
      ).toMatch(/gameOver|'gameover'/)
    }
  })
})
