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
// == SACRED BOUNDARY ================================================================
// Pure text + the vendored 1983 source. No DOM, no sim, no time.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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
    const preamble = flat(src.slice(0, src.indexOf('const state: GameState =')))
    expect(preamble, 'the stepGame preamble must describe the arm that exists now').toMatch(
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

  it('POSITIVE — and tie-status.ts says what the band IS', () => {
    // Again the half a deletion cannot satisfy: the file that derives C_PS must describe the
    // region it derives. `SIGHTS_OCTAGON` is the exported constant that region is built from.
    expect(tieStatus(), 'the C_PS derivation must name the octagon it tests').toMatch(/SIGHTS_OCTAGON/)
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
    // Verified PRESENT at RED: the phrase "`+10.` site fudge" occurs once in sim.ts
    // (`:570`) and once in gameRules.ts (`:122`), in both cases inside the sentence
    // describing how the GROUND test differs.
    //
    // The rule is not "never mention it" — it is "do not mention it as the difference".
    // A file may keep the term as long as it also records that the space passes carry it,
    // which is what makes the statement true. The real differentiators are the unrotated
    // width/height box and the absent octagon.
    for (const [name, text] of [
      ['sim.ts', sim()],
      ['gameRules.ts', gameRules()],
    ] as const) {
      if (!/\+10\./.test(text)) continue
      expect(
        text,
        `${name}: the +10. fudge is common to all three passes, so a file that names it must say so ` +
          '(cite WSMAIN.MAC:3881 or WSGUNS.MAC:918 beside it, or drop it from the contrast)',
      ).toMatch(/WSMAIN\.MAC:3881|WSGUNS\.MAC:918/)
    }
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
    for (const [name, text] of [
      ['sim.ts', sim()],
      ['tie-status.ts', tieStatus()],
    ] as const) {
      if (!/VWGUN/.test(text)) continue
      for (const [start, end] of EXITS) {
        expect(text, `${name}: VWGUN exit ${start}-${end} is cited as its two-line span`).toMatch(
          new RegExp(`:${start}-${end}\\b`),
        )
      }
    }
  })
})
