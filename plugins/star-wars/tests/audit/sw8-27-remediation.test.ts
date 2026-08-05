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
 *  NO GUARD CONSUMES THIS ANY MORE. It was the unit the rounds 3-5 attribution guard read:
 *  a character radius is the right scope for "is the citation beside the claim" and the
 *  WRONG one for "which mechanism does this figure belong to" — the round-3 review's Z1 sits
 *  in a block that also contains the word it must not be attributed to — and an attribution
 *  is owned by a sentence. That guard was deleted at the round-5 review (V1/V2; THE
 *  REDUCTION note in the R5 describe below says what that leaves unchecked). The helper and
 *  its seats stay as the record of the segmentation and of its limits.
 *
 *  ROUND 4 (W7): the justification that stood here was measured wrong and argued the wrong
 *  way round. It said `tie-status.ts` puts "the same viewport aspect" *some 400 characters
 *  above* the flick sentence, so a ±600 window would wrongly REACH it. Re-taken against the
 *  anchors this file actually uses — the `u` and `%` matches themselves — the C_PS block's
 *  single occurrence of `aspect` sits **618 characters** before the nearest of them (`613 u`),
 *  which a ±600 window would MISS, by 18 characters. The conclusion survives and the reason
 *  inverts: a character window is wrong here not because it over-reaches but because 18
 *  characters is the whole margin, and any re-wrap of the two paragraphs in between crosses
 *  it in one direction or the other. A sentence boundary is structural and cannot drift.
 *
 *  Recompute: `flat()` `tie-status.ts`, take `cpsBlock()`, and diff the index of `/aspect/i`
 *  against the first `/(\d[\d,.]*)\s*u\b/` match. (The seat that pinned this live was the
 *  round-5 review's V4 — a 40-character window any re-wrap of the block would cross — and it
 *  was deleted with the parser rather than re-expressed.)
 *
 *  Bounded by `[.!?]` + whitespace, which the flattened comments produce only at real
 *  sentence ends: `0.1`, `WSMAIN.MAC:3881` and `tie-vm.ts:341-342` all keep a non-space after
 *  the dot, so none of them splits. (`sim.ts:341` stood here as the third example and occurs
 *  nowhere in this block — nor anywhere in this plugin as a LIVE citation, only in notes like
 *  this one — round-4 review W7, qualified at the round-5 review's V6. `tie-vm.ts:341-342`
 *  is the real token of that shape in the block, same line number, different file.) The `\s+`
 *  is the load-bearing half and it has its own seats below: drop it and all three tokens split.
 *  `:` and `;` are deliberately NOT breaks — `sim.ts` names the mechanism before the colon
 *  ("The aspect gap grows with the yoke, though: 2694 u at full deflection"), and breaking
 *  there would strip the subject off its own figure and make a correct sentence
 *  unattributable. */
function sentenceAt(text: string, i: number): string {
  let start = 0
  for (const m of text.slice(0, i).matchAll(/[.!?]\s+/g)) start = m.index + m[0].length
  const rel = text.slice(i).search(/[.!?]\s+/)
  return text.slice(start, rel < 0 ? text.length : i + rel + 1)
}

// (`numericSentences` and its `u`/`%` population selectors stood here from round 4 to the
// round-5 review. Deleted, not deepened, at that review's V1/V2 — see THE REDUCTION note in
// the R5 describe below for what that deliberately leaves unchecked.)

/** `src` with comments — and optionally string BODIES — replaced by spaces of the same length,
 *  so both character indices and line numbers survive untouched.
 *
 *  Needed by `enclosingLiteral`: a brace inside a comment or a string would derail brace
 *  matching, and this file's whole subject is prose that sits inside comments. Blanking rather
 *  than stripping is what keeps a derived line number comparable to a cited one. */
function blankNonCode(src: string, blankStrings: boolean): string {
  let out = ''
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i)
      const end = nl < 0 ? src.length : nl
      out += ' '.repeat(end - i)
      i = end
    } else if (c === '/' && src[i + 1] === '*') {
      const close = src.indexOf('*/', i + 2)
      const end = close < 0 ? src.length : close + 2
      out += src.slice(i, end).replace(/[^\n]/g, ' ')
      i = end
    } else if (blankStrings && (c === "'" || c === '"' || c === '`')) {
      let j = i + 1
      while (j < src.length && src[j] !== c) {
        if (src[j] === '\\') j++
        else if (src[j] === '\n' && c !== '`') break
        j++
      }
      const end = Math.min(j + 1, src.length)
      out += c + src.slice(i + 1, Math.max(i + 1, end - 1)).replace(/[^\n]/g, ' ') + (src[end - 1] === c ? c : '')
      i = end
    } else {
      out += c
      i++
    }
  }
  return out
}

/** The innermost `{…}` span containing `i`, by brace matching, or `null` if `i` is not inside
 *  one. Expects `code` to have come through `blankNonCode(src, true)`.
 *
 *  This is brace matching, not a parser, which is why every derivation resting on it is pinned
 *  by a fixture below: if it ever mismatches, the pinned line numbers move and say so. */
function enclosingLiteral(code: string, i: number): readonly [number, number] | null {
  let depth = 0
  let start = -1
  for (let k = i; k >= 0; k--) {
    if (code[k] === '}') depth++
    else if (code[k] === '{') {
      if (depth === 0) {
        start = k
        break
      }
      depth--
    }
  }
  if (start < 0) return null
  depth = 0
  for (let k = start; k < code.length; k++) {
    if (code[k] === '{') depth++
    else if (code[k] === '}') {
      depth--
      if (depth === 0) return [start, k + 1]
    }
  }
  return null
}

/** 1-based line number of character `i`. */
const lineOf = (src: string, i: number) => src.slice(0, i).split('\n').length

describe('sw8-27 W5 — the apparatus: the sentence splitter has a seat of its own', () => {
  // The round-4 review's W5. `sentenceAt` reimplements sentence segmentation and its docstring
  // rests the whole design on one clause — that `[.!?]` must be followed by WHITESPACE to count
  // as a boundary. A specialist deleted the `\s+` and the whole file stayed 18/18 green: the
  // guarantee the helper advertises was the one thing nothing exercised (#18, apparatus that
  // passes by construction). Every assertion below fails under that exact mutation, and two of
  // them fail from opposite ends — one because the returned sentence STARTS in the wrong place,
  // one because it ENDS in the wrong place.

  it('does not split inside a decimal — the operating points the prose quotes are `0.1`, `0.2`', () => {
    const t = 'A flick of 0.1 is small. The band is 750 u.'
    // Ends at the real full stop, not at the dot in `0.1`. Without `\s+`: 'A flick of 0.'
    expect(sentenceAt(t, t.indexOf('0.1')), 'the decimal point is not a sentence end').toBe(
      'A flick of 0.1 is small.',
    )
  })

  it('does not split inside a ROM citation — `WSMAIN.MAC:3881`, and from the START side', () => {
    const u = 'See WSMAIN.MAC:3881 for the cursor. The band is 750 u.'
    // The `start` scan runs over `slice(0, i)`, so this is the other half of the same clause:
    // without `\s+` the last boundary found is the bare `.` of `cursor.` and the slice keeps
    // its trailing space — ' The band is 750 u.' — while the dot in `WSMAIN.MAC` also matches.
    expect(sentenceAt(u, u.indexOf('750')), 'a ROM citation is not a sentence end').toBe('The band is 750 u.')
  })

  it('does not split inside a source citation — `tie-vm.ts:341-342`, the token W7 corrected', () => {
    // The docstring named `sim.ts:341` here for three rounds. It occurs nowhere in the block it
    // describes — and nowhere in this plugin as a live citation, only in notes like this one
    // (round-5 review V6); this is the real token of that shape in it (same line number,
    // different file).
    const v = 'The VM seat is tie-vm.ts:341-342 and the flick is 0.1. Done.'
    expect(sentenceAt(v, v.indexOf('0.1')), 'a source citation is not a sentence end').toBe(
      'The VM seat is tie-vm.ts:341-342 and the flick is 0.1.',
    )
    expect(cpsBlock(), 'fixture: and that token really is in the block the docstring describes').toMatch(
      /tie-vm\.ts:341-342/,
    )
  })

  it('DOES split at a real sentence end, in both directions', () => {
    const w = 'First claim is 613 u. Second claim is 750 u. Third is 6158 u.'
    expect(sentenceAt(w, w.indexOf('613')), 'the first sentence').toBe('First claim is 613 u.')
    expect(sentenceAt(w, w.indexOf('750')), 'the middle one, bounded on both sides').toBe('Second claim is 750 u.')
    expect(sentenceAt(w, w.indexOf('6158')), 'the last one, which has no following boundary').toBe(
      'Third is 6158 u.',
    )
  })

  it('does NOT treat `:` or `;` as a break — the subject must stay with its own figure', () => {
    // Deliberate, and load-bearing: `sim.ts` names the mechanism before the colon, so breaking
    // there would leave `2694 u at full deflection` attributable to nothing.
    const c = 'The aspect gap grows with the yoke, though: 2694 u at full deflection; it bites.'
    expect(sentenceAt(c, c.indexOf('2694')), 'the colon keeps the subject attached').toBe(c)
    expect(sentenceAt(c, c.indexOf('2694')), 'so the mechanism is inside the extracted sentence').toMatch(/aspect/)
  })

  // (The 'W7, live' seat stood here: it pinned the 618-character distance from `aspect` to the
  // block's first `u` figure inside a 600..640 window — the round-5 review's V4, which any
  // re-wrap of the intervening prose reddened with a message about something else. With the
  // attribution guard deleted there is no window left to justify, so the seat is deleted too,
  // per the review's handoff, rather than re-expressed as the property it was arguing for.)
})

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

describe('sw8-27 R5 — the separation figures, re-derived from the production geometry', () => {
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
  // So rounds 3-5's guard derived the pair per mechanism and matched it against the SENTENCE
  // that made the claim, its failure message quoting the computed figure rather than a typed
  // one — it could not prescribe a stale number, because it had no stale number to prescribe.
  // That guard is deleted now — THE REDUCTION, at the end of this header, says why.
  //
  // == ROUND 4 (W1): THE MAGNITUDE MUST COME FROM THE CLAIM, NOT FROM A POSITION =======
  //
  // Round 3's guard was right about the MECHANISM and still wrong about the MAGNITUDE,
  // because of HOW it read one: `const at = s.search(/full[- ]…/)`, then
  // `s.slice(0, at).matchAll(QUOTED_U)`, then the LAST match. So a sentence could assert one
  // thing after the phrase while the guard read another before it, and the review reproduced
  // it line-preserving — `2694 u was the old estimate, but at full deflection it is really
  // 9999 u, so past ~28% it bites.` passed 18/18. #15 for the third consecutive round, inside
  // the file written to enforce #15: the assertion matched a POSITION, not the claim. (It also
  // carried the `-1`-into-`slice` fail-open that `block()` twelve screens above exists to
  // close, W10, and a hand-maintained second copy of `AT_FULL`'s pattern.)
  //
  // Round 5's replacement sliced nothing: a sentence's numbers were checked against what the
  // SENTENCE'S OWN TERMS produced — the mechanisms it named, the operating points it stated,
  // and the production geometry that turned those into separations. The round-5 review broke
  // that one level down again, twice: membership in the cross-product of named mechanisms and
  // stated points is not ATTRIBUTION, so two figures could swap clauses and stay green (V1),
  // and the population was keyed on the unit token's spelling, so `9999 U` was never examined
  // at all (V2). THE REDUCTION below is the answer.
  //
  // == AND THE BASIS IS PART OF THE CLAIM (W4) ========================================
  //
  // At round 4 the live sentences quoted `613 u`, the flick measured ALONG THE RAY. The 750 u band
  // is an L1 bound on `siteOffset`'s dx/dy, so it lives in the DEPTH PLANE, and an along-ray
  // chord is not a quantity that band can be compared against. The same flick in the plane the
  // band bounds is 615.8 u. That is not a rounding quibble — the two bases behave differently:
  //
  //   * in the plane, separation is exactly LINEAR in the yoke (615.8403 × 10 = 6158.4029), so
  //     `BAND / at(1)` IS the crossover: bisection and the ratio agree to ten places;
  //   * along the ray it is not. 613.4238 × 10 = 6134.2 while the true full-travel chord is
  //     4664.3, and the ratio method would put the crossover at 16.08% where bisection puts it
  //     at 12.25%. A reader scaling 613 by ten to check 6158 gets 6134, decides the sentence is
  //     self-consistent, and is wrong twice over; the near-agreement is a small-angle accident.
  //   * and the along-ray flick is POSITION-DEPENDENT — 613.4 from rest, 577.2 from yoke 0.2,
  //     507.3 from 0.4, 315.8 from 0.9 — so "a one-frame yoke move of 0.1 separates the two
  //     rays by 613 u" is true only at rest, while the in-plane 615.8 holds at every yoke.
  //
  // The note that used to sit in the seat below said the two bases were "2.4 u apart, and
  // nothing here turns on which". True of a sentence quoting ONE figure, which is what it was
  // written against. These sentences quoted a pair 1494 u apart and invited the reader to scale
  // between them, so it turns on which — the round-5 GREEN moved the prose onto the in-plane
  // figures, and the seat below keeps both bases derived and told apart.
  //
  // == THE REDUCTION (after the round-5 review): WHAT THIS SUITE NO LONGER CHECKS ======
  //
  // Round 3 matched a DIGIT. Round 4 matched a POSITION — a keyword's side. Round 5 matched a
  // SET, and keyed its population on a token's spelling. Each round replaced a shallow proxy
  // for "this figure belongs to that claim" with a deeper proxy, and each broke exactly one
  // level down, because no regex reads English. A sixth proxy would be the same failure mode
  // again, so per the round-5 review's handoff this rework is a guard REDUCTION, not a
  // deepening: `numericSentences`, the `u`/`%` population selectors, the mechanisms' `names`
  // regexes, the operating-point extraction and the whole sentence-attribution seat are
  // DELETED (V1, V2), along with the W7 character-window seat that only that machinery
  // justified (V4).
  //
  // WHAT REMAINS: the `.not.toMatch()` retirement guards above — they caught rounds 1 and 2,
  // and are cheap and stable — and the arithmetic seat below, which re-derives every figure in
  // this story from the production geometry, so the correct numbers stay on record beside the
  // constants they follow from, with their recompute.
  //
  // WHAT IS NOW UNCHECKED, DELIBERATELY: nothing in this suite reads the prose in `sim.ts` or
  // `tie-status.ts` any more. Every prose mutant the round-5 review recorded was RE-RUN under
  // this reduced guard at the rework, and every one rides through green: the `616 u`/`6158 u`
  // swap inside the C_PS flick sentence, the `616 u`/`539 u` swap in the stepGame preamble,
  // `539 u` -> `1232 u`, and the spelling escapes `9999 U`, `9999 units` and `40 percent`.
  // Nothing else catches them either; they are unchecked. A wrong figure in those comments is
  // now caught by a reader with the seat below as the reference table, or not at all. Do not
  // rebuild the parser on the assumption its absence was an oversight — its five-round history
  // is in the sw8-27 session record and the sw8 archive.

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

  /** The same two rays measured ALONG THE RAY — the 3-D chord between their tips at range
   *  DEPTH. Derived because the prose quotes it and because the gap between the two bases IS
   *  the W4 finding; never an accepted figure. */
  const alongRay = (aimA: number, aspA: number, aimB: number, aspB: number) => {
    const a = aimDirection(aimA, 0, aspA)
    const b = aimDirection(aimB, 0, aspB)
    return Math.hypot(a[0] * DEPTH - b[0] * DEPTH, a[1] * DEPTH - b[1] * DEPTH, a[2] * DEPTH - b[2] * DEPTH)
  }

  /** The two mechanisms the two blocks describe.
   *
   *  `at(x)` is the IN-PLANE separation at operating point `x` ∈ (0, 1], COMPUTED from the
   *  production geometry and never typed. `x` means different things to the two mechanisms:
   *  for the freshness gap it is the SIZE of a one-frame yoke change (that gap does not know
   *  where the yoke already was); for the aspect drop it is the absolute deflection. (The
   *  `names` regexes that let the retired attribution guard read a sentence's subject were
   *  deleted with it — THE REDUCTION above.) */
  const MECHANISMS = [
    {
      what: 'the aim-freshness gap (one frame of stale yoke)',
      at: (d: number) => apart(inPlane(0, WIDE), inPlane(d, WIDE)),
      alongRayAt: (d: number) => alongRay(0, WIDE, d, WIDE),
    },
    {
      what: 'the aspect drop (the same yoke against a different viewport)',
      at: (y: number) => apart(inPlane(y, WIDE), inPlane(y, 1)),
      alongRayAt: (y: number) => alongRay(y, WIDE, y, 1),
    },
  ] as const
  type Mechanism = (typeof MECHANISMS)[number]
  const [FRESH, ASPECT] = MECHANISMS

  /** Where `m` first separates the two rays by more than the band, as a FRACTION of full
   *  travel — found by bisection on `m.at`, not as `BAND / m.at(1)`, so the guard does not
   *  assume the linearity it also asserts. In the along-ray basis the two disagree by 3.8
   *  points, which is why this is a root and not a ratio. */
  const crossoverOf = (m: Mechanism) => {
    let lo = 0
    let hi = 1
    for (let k = 0; k < 200; k++) {
      const mid = (lo + hi) / 2
      if (m.at(mid) < BAND) lo = mid
      else hi = mid
    }
    return (lo + hi) / 2
  }

  it('RESOLVED — the two quoted separations are BELOW the band, and the crossover is not', () => {
    // Fixture anchors first: if either production constant is retuned, every number below
    // moves and this test must be re-derived rather than quietly re-passing.
    expect(TIE_HIT_RADIUS, 'fixture anchor: the established TIE kill radius').toBe(250)
    expect(SIGHTS_OCTAGON, 'fixture anchor: the sights octagon, WSMAIN.MAC:3920-3923').toBe(3)
    expect(BAND, 'the band on the axis, which is what a pure-lateral separation is measured against').toBe(750)
    expect(FOV_Y, 'fixture anchor: the projection the yoke inverts').toBeCloseTo(Math.PI / 3, 10)

    // The aim-freshness example: one frame of yoke at 0.1, both rays built at 16:9.
    const flick = FRESH.at(0.1)
    expect(flick, 'a one-frame flick of 0.1 at depth 6000 on 16:9, IN THE DEPTH PLANE').toBeCloseTo(615.8403, 3)

    // The static example: the same yoke, the aspect dropped.
    const dropped = ASPECT.at(0.2)
    expect(dropped, 'dropping the aspect at yoke 0.2, in the same plane').toBeCloseTo(538.8603, 3)

    // THE FINDING. A fighter centred on one ray is outside the OTHER's band only once the
    // separation exceeds the band; on the axis a pure-lateral offset gives |dx| = the
    // separation and |dy| = 0, so the octagon bound is the flat 750.
    expect(flick, '615.8 does not clear a 750 u band').toBeLessThan(BAND)
    expect(dropped, 'nor does 538.9').toBeLessThan(BAND)

    // What DOES clear it, and where — PER MECHANISM. Round 3 (Z1/Z2): the whole defect is
    // that one file took the second figure below and attached it to the first mechanism.

    // The aim-freshness gap first, because it is the one the numbers were taken from. Its
    // separation depends on the CHANGE in yoke and not on where the yoke already is, which
    // is why "at full deflection" is a category error for it: there is no such thing as a
    // stale-aim gap "at full deflection", only one for a flick of a given size.
    for (const base of [0, 0.4, 0.9]) {
      expect(
        apart(inPlane(base, WIDE), inPlane(base + 0.1, WIDE)),
        `a 0.1 flick starting from yoke ${base} — the freshness gap does not know where the yoke was`,
      ).toBeCloseTo(615.8403, 3)
    }
    expect(FRESH.at(1), 'so a FULL-TRAVEL flick separates the two rays by this much').toBeCloseTo(6158.4029, 3)
    expect(FRESH.at(1), 'which clears the band').toBeGreaterThan(BAND)
    expect(crossoverOf(FRESH) * 100, 'and it crosses at 12.18% of travel in one frame, not 28%').toBeCloseTo(
      12.1785,
      3,
    )

    // The aspect drop second. This one genuinely does grow with absolute deflection — 539 u
    // at yoke 0.2 (measured above), 2694 u at full — so a crossover in % of travel is the
    // right shape for it, and 28% is the right value FOR IT.
    expect(ASPECT.at(1), 'the aspect drop at full deflection').toBeCloseTo(2694.3013, 3)
    expect(ASPECT.at(1), 'which does clear the band').toBeGreaterThan(BAND)
    expect(crossoverOf(ASPECT) * 100, 'so the crossover is 27.84% of yoke travel, not zero').toBeCloseTo(27.8365, 3)
    expect(dropped / ASPECT.at(1), 'and it is LINEAR in the yoke, so yoke 0.2 is a fifth of full').toBeCloseTo(0.2, 6)

    // THE DISCRIMINATOR. The two full-travel figures are 2.3× apart, so a sentence that
    // quotes one while naming the other is not off by a rounding — it is off by more than
    // the band itself, and in the direction that matters: the freshness gap bites at less
    // than half the deflection the smaller figure implies. The ratio is exactly 16/7, and that
    // is worth pinning as a closed form rather than as 2.286: in the depth plane the lateral
    // offset is `DEPTH · aim · aspect / f` — the normalisation cancels — so the flick spans
    // `WIDE` and the aspect drop spans `WIDE - 1`, and `(16/9) / (7/9)` falls out with DEPTH
    // and FOV_Y cancelling too. A retune of either constant must NOT move this number; a
    // change to the 16:9 assumption must.
    expect(FRESH.at(1) / ASPECT.at(1), 'the two mechanisms are exactly WIDE / (WIDE - 1) apart').toBeCloseTo(16 / 7, 9)
    expect(
      crossoverOf(FRESH),
      'and quoting the aspect crossover for the freshness gap OVERSTATES the safe travel 2.3×',
    ).toBeLessThan(crossoverOf(ASPECT))

    // == THE BASIS, W4 ================================================================
    // The prose quotes 613, which is this flick measured ALONG THE RAY rather than in the
    // depth plane. The old note here said the two were "2.4 u apart, and nothing here turns on
    // which"; these three assertions are why that is no longer true.
    expect(FRESH.alongRayAt(0.1), 'the same 0.1 flick as a chord between the ray tips').toBeCloseTo(613.4238, 3)
    expect(FRESH.at(0.1) - FRESH.alongRayAt(0.1), 'the two bases differ by 2.4 u at a 0.1 flick').toBeCloseTo(2.4165, 3)

    // (a) the along-ray flick is POSITION-DEPENDENT where the in-plane one is not, so the
    //     prose's unqualified "a one-frame yoke move of 0.1 separates the two rays by 613 u"
    //     is true at rest and false everywhere else. 315.8 at yoke 0.9 is half the figure.
    const alongRayFromRest = FRESH.alongRayAt(0.1)
    for (const [base, want] of [
      [0.2, 577.2152],
      [0.4, 507.3002],
      [0.9, 315.7873],
    ] as const) {
      expect(alongRay(base, WIDE, base + 0.1, WIDE), `the along-ray 0.1 flick from yoke ${base}`).toBeCloseTo(want, 3)
      expect(
        alongRay(base, WIDE, base + 0.1, WIDE),
        `and it is NOT ${alongRayFromRest.toFixed(1)} — the along-ray basis knows where the yoke was`,
      ).toBeLessThan(alongRayFromRest - 1)
    }

    // (b) the reader's own consistency check — scale the small figure by ten — is valid in the
    //     plane and invalid along the ray. 6134 ≈ 6158 is the coincidence that hides the error.
    expect(FRESH.at(0.1) * 10, 'in the plane, separation is exactly linear in the yoke').toBeCloseTo(FRESH.at(1), 6)
    expect(FRESH.alongRayAt(1), 'along the ray the full-travel chord is 4664, not 6158').toBeCloseTo(4664.3184, 3)
    expect(
      FRESH.alongRayAt(0.1) * 10 - FRESH.at(1),
      'and 613 × 10 lands within 24 u of 6158, which is why the mixed pair reads as consistent',
    ).toBeCloseTo(-24.1653, 3)
    expect(
      Math.abs(FRESH.alongRayAt(0.1) * 10 - FRESH.alongRayAt(1)),
      'while the honest along-ray comparison is 1470 u out',
    ).toBeGreaterThan(1400)

    // (c) so `BAND / at(1)` — the shape every crossover in this file uses — is a crossover in
    //     the plane and is not one along the ray: 16.08% by ratio against a true root of
    //     12.25%. Pinned because it is the reason `crossoverOf` bisects instead of dividing.
    const alongRayRatio = (BAND / FRESH.alongRayAt(1)) * 100
    let lo = 0
    let hi = 1
    for (let k = 0; k < 200; k++) {
      const mid = (lo + hi) / 2
      if (FRESH.alongRayAt(mid) < BAND) lo = mid
      else hi = mid
    }
    const alongRayRoot = ((lo + hi) / 2) * 100
    expect(alongRayRatio, 'the ratio method in the along-ray basis').toBeCloseTo(16.0795, 3)
    expect(alongRayRoot, 'the actual along-ray crossover, found by bisection').toBeCloseTo(12.2504, 3)
    expect(Math.abs(alongRayRatio - alongRayRoot), 'they disagree by 3.8 points, so the ratio is not the root').toBeGreaterThan(
      3,
    )
    expect(crossoverOf(FRESH) * 100, 'whereas in the plane the ratio IS the root').toBeCloseTo(
      (BAND / FRESH.at(1)) * 100,
      9,
    )

    // (d) and the band itself is an in-plane quantity, which is what makes the plane the only
    //     basis a separation may be compared against it in: `siteOffset` returns dx/dy in the
    //     target's depth plane and C_PS bounds |dx| + |dy| by 3 · TIE_HIT_RADIUS.
    expect(SIGHTS_OCTAGON * TIE_HIT_RADIUS, 'the band is the octagon bound on in-plane dx/dy').toBe(BAND)
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

  /** A `mode:` assignment to `'gameover'`, matched ANYWHERE on a line rather than only at the
   *  start of one (round 4, W6) — an inline literal writes both fields on one line and the
   *  anchored form could not see it. Verified to select the same four lines as the anchored
   *  version on today's `sim.ts`, so the relaxation costs nothing and closes the hole. */
  const MODE_ASSIGN = /\bmode:\s*[^,}\n]*'gameover'/
  const simLines = () => read('src', 'core', 'sim.ts').split(/\r\n|\r|\n/)

  /** The death sites, derived by ENCLOSING OBJECT LITERAL rather than by line proximity.
   *
   *  ROUND 4 (W6): the previous derivation was `gameOver:` at the start of a line with a
   *  `mode: … 'gameover'` within ±2 lines, and #19 both ways. A specialist appended
   *  `({ ...s, gameOver: true, mode: 'gameover' as const })` to `sim.ts` and the site list did
   *  not move — so the completeness assertion below, which exists to catch a death site added
   *  and left uncited, was vacuous for exactly the shape someone would add. And the converse: a
   *  ±2 window happily pairs a `gameOver:` in one literal with a `mode:` in the NEXT one. Both
   *  directions were reproduced against the replacement and both are closed by it; the mutants
   *  are in the session file's round-5 battery.
   *
   *  Braces are matched over the source with comments AND string bodies blanked, so a brace in
   *  either cannot derail it; the `mode:` token is then sought in the same span with only
   *  comments blanked, since the token itself lives inside a string. Line numbers survive both
   *  passes untouched, which is what lets a derived number be compared to a cited one.
   *
   *  KNOWN LIMIT, with the direction it fails. `\bgameOver:` also matches a TYPE position — a
   *  `{ gameOver: boolean }` member reads as a field. Found while mutating for W9, where an
   *  appended helper typed that way entered the `fields` population. Not patched, deliberately:
   *  the value cannot be narrowed to a boolean literal, because the four real death sites are
   *  `gameOver: lives <= 0` and `gameOver: gunHit.lives <= 0 ? true : base.gameOver` — a
   *  `true|false` requirement would exclude every one of them and select only the two
   *  attract-mode fields. A blacklist of type names would dodge the one mutant that found this
   *  and nothing else, which is the sort of scenery this file exists to refuse. What makes it
   *  safe to leave is the direction: a type member has no `mode: … 'gameover'` in its literal,
   *  so it can only join `fields`, never `pairing` — and `fields` is pinned to an exact list
   *  below. It therefore fails CLOSED, as a red on a named fixture that says which line moved,
   *  and can never turn into a silent pass. */
  const deathSites = () => {
    const src = read('src', 'core', 'sim.ts')
    const braces = blankNonCode(src, true)
    const code = blankNonCode(src, false)
    const fields: number[] = []
    const pairing: number[] = []
    for (const m of braces.matchAll(/\bgameOver:/g)) {
      const line = lineOf(braces, m.index)
      fields.push(line)
      const span = enclosingLiteral(braces, m.index)
      if (span && MODE_ASSIGN.test(code.slice(span[0], span[1]))) pairing.push(line)
    }
    return { fields, pairing }
  }

  it('the machine: sim.ts assigns `mode: gameover`, beside `gameOver`, at four sites', () => {
    const lines = simLines()
    const sites = lines.flatMap((l, i) => (MODE_ASSIGN.test(l) ? [i + 1] : []))
    expect(sites, "sim.ts assigns mode 'gameover' — the claim under test says nothing does").toEqual([
      762, 1266, 1517, 1690,
    ])
    // And each sits with its `gameOver:` sibling, which refutes the other half of the claim: the
    // mode does not stay 'playing' while gameOver flips — they move together, IN ONE LITERAL.
    // That is now asserted as the literal it is (W6) rather than as a line window: the enclosing
    // `{…}` of each mode assignment must itself carry the flag, so a formatter cannot redden it
    // and an adjacent-but-different literal cannot satisfy it.
    const braces = blankNonCode(read('src', 'core', 'sim.ts'), true)
    for (const line of sites) {
      const at = braces.split('\n').slice(0, line).join('\n').lastIndexOf('mode:')
      const span = enclosingLiteral(braces, at)
      // V5 (round-5 review): a throwing narrow instead of `expect(…).toBeTruthy()` plus a `!`
      // on the next line — the same condition still reddens the test, and the type flows.
      if (span === null)
        throw new Error(`sim.ts:${line}'s mode assignment sits inside an object literal — brace matching found none`)
      expect(
        braces.slice(span[0], span[1]),
        `sim.ts:${line} sets the mode in the SAME literal as gameOver, not merely near it`,
      ).toMatch(/gameOver:/)
    }
    // And the two populations agree from the other end: every literal that pairs them is one of
    // these four, so neither derivation is finding sites the other cannot see.
    expect(deathSites().pairing, 'the same four, derived from the gameOver: side').toEqual([761, 1265, 1516, 1689])
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
    //   a PAIRING site  — a `gameOver:` field whose ENCLOSING OBJECT LITERAL also carries
    //                     `mode: … 'gameover'`. This is the "set gameOver alongside the mode"
    //                     claim, in code. Bounded by the literal rather than by a line window
    //                     since round 4 (W6) — see `deathSites` above for both holes that closed.
    //   a game-over BRANCH — an `if (…)` on THE RUN'S OWN flag or mode, which is what the clause
    //                     "the branch at sim.ts:221 is finalised now" cites. It is a
    //                     different claim about a different kind of line, and collapsing the
    //                     two is how :221 would be failed for being correct.
    //
    // A citation must be one or the other, and every PAIRING site must be cited, because the
    // sentence presents its list as *the* death sites rather than as examples.
    //
    // ROUND 4 (W9): the branch pattern was `if\s*\(.*(?:gameOver|'gameover')`, whose unbounded
    // `.*` accepts an `if` mentioning the token on ANY object. That is not merely loose — it
    // interacts with W6: an inline `if (s.lives <= 0) return { ...s, gameOver: true, mode:
    // 'gameover' }` was excluded from the pairing population by the line window and then
    // MISCOUNTED as a branch by this regex, so a real death site was silently reclassified into
    // the population that carries no completeness obligation. The condition must now name the
    // run's own state: `state.gameOver`/`s.gameOver`, or `state.mode`/`s.mode` compared against
    // `'gameover'`. All four live matches read `state`/`s` already, so nothing moves today.
    const lines = simLines()
    const IF_LINE = /^\s*(?:\}\s*)?(?:else\s+)?if\s*\(/
    const OWN_END_OF_RUN = /\b(?:state|s)\.gameOver\b|\b(?:state|s)\.mode\s*[!=]==?\s*'gameover'/
    const derived = deathSites()
    const pairingSites = derived.pairing
    const branches = lines.flatMap((l, i) => (IF_LINE.test(l) && OWN_END_OF_RUN.test(l) ? [i + 1] : []))

    // Fixture anchors, so a derivation that quietly matched nothing cannot pass this by
    // admitting everything. Derived, not typed — if sim.ts gains a fifth death site these
    // three lines are what say so, along with the mode-assignment seat above.
    expect(
      derived.fields,
      'fixture: every `gameOver:` field line in sim.ts. Pinned as an exact list because it is ' +
        'what makes the type-position limit in `deathSites` fail closed — a new one shows up here',
    ).toEqual([245, 260, 761, 1265, 1516, 1689])
    expect(pairingSites, 'fixture: the death sites that set BOTH, derived from sim.ts').toEqual([761, 1265, 1516, 1689])
    expect(branches, 'fixture: and the places sim.ts branches on the end of a run').toEqual([225, 936, 947, 1868])
    // The branch population must be bound to the run's own state, not to the mere presence of a
    // token. `sim.ts` branches on OTHER modes too, and those are not ends of a run.
    for (const n of branches) {
      expect(lines[n - 1], `sim.ts:${n} tests the run's own state, not some other object's`).toMatch(OWN_END_OF_RUN)
    }
    expect(
      lines.flatMap((l, i) => (IF_LINE.test(l) && /'attract'|'select'/.test(l) && OWN_END_OF_RUN.test(l) ? [i + 1] : [])),
      'and a branch on another mode is not an end-of-run branch',
    ).toEqual([])
    // THE DISCRIMINATOR, and the reason the retired token check was not one: `sim.ts` has
    // `gameOver:` lines that are not death sites at all, and the old assertion accepted them.
    const wordWithoutPairing = derived.fields.filter((n) => !pairingSites.includes(n))
    expect(
      wordWithoutPairing,
      'fixture: these two carry the word `gameOver:` WITHOUT the pairing — they are the ' +
        "`gameOver: false` fields in the `mode: 'attract'` literals, and citing them would be false",
    ).toEqual([245, 260])

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
