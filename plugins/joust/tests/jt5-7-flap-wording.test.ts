// tests/jt5-7-flap-wording.test.ts
//
// Story jt5-7 — RED phase (Mr. Praline / TEA). AC4: the "FLAPS2/FLIPS2, the
// labels BELOW each JSR VSND" wording is true of FLIPS2 and FALSE of FLAPS2,
// and it propagated across three files.
//
// ─── WHAT THE ROM ACTUALLY SAYS ──────────────────────────────────────────────
// Both loops are silent while the button is held, but they get there by
// OPPOSITE geometry, and one sentence was written to cover both:
//
//   WING-UP.   GOFLIP plays the cue at :6182-6184 and then `BRA FLIPS2`
//              (:6186). FLIPS2 (:6197) genuinely IS below its JSR VSND (:6184),
//              in file order and in control flow.
//
//   WING-DOWN. FLAPS2 (:6170) is ABOVE its JSR VSND (:6218). The cue path never
//              reaches FLAPS2 at all: after `JSR VSND` GOFLAP runs :6219, then
//              `TSTB` (:6223), then `BLE WINGDN` (:6176) or `BRA WINGFK`
//              (:6177). FLAPS2 is the FALL-THROUGH label the held path drops
//              into from FLAPLP's `TSTB` / `BEQ GOFLIP` (:6168-6169), bypassing
//              GOFLAP and its cue entirely.
//
// STFALL is the same shape: it ends `BNE FLAPS2` / `BRA FLIPS2` (:6156-6157),
// entering at those bypass labels, which is why walking off a ledge raises no
// wing cue.
//
// So the LAW — a held button never re-fires the cue — is TRUE of both loops and
// must survive this story. Only the positional word "below" is wrong, and it is
// wrong for FLAPS2 in BOTH senses. The fix is a rewording, NOT a behaviour
// change: nothing in the two-edge cue jt5-3 shipped is in question here.
//
// ─── WHY THIS GUARD IS KEYED ON CLAIM SHAPE, NOT ON THE LABEL ────────────────
// Measured census of the three files: of the SEVEN sites in audio-flap.test.ts,
// only THREE name FLAPS2 at all. The other four make the same false claim
// generically — "enters both loops BELOW their cues", "STFALL enters BELOW both
// cues", "a HELD button re-enters BELOW the cue". A guard keyed on the string
// FLAPS2 would have missed the majority of its own subject and reported the
// defect fixed while four sites still carried it.
//
// ─── AND WHY IT NEEDS AN ESCAPE CLAUSE ───────────────────────────────────────
// The CORRECTED sentence necessarily contains "FLAPS2" and "below" in one
// breath — "FLIPS2 sits below the wing-up cue, while FLAPS2 sits ABOVE the
// wing-down cue". A bare proximity rule flags the fix itself; that false
// positive was measured on a draft of this guard, twice. Hence `CONTRADICTS`:
// a nearby above / bypass / fall-through wording clears the match. And because
// prose WRAPS, the contradiction is judged over a CHARACTER WINDOW rather than
// per line — the first draft scanned line-by-line and split the corrected
// sentence across two lines, flagging it.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel: string): string => readFileSync(join(root, rel), 'utf8')

/**
 * The three files jt5-3's wording reached. Kept explicit rather than globbed:
 * this is a census of a KNOWN propagation, and a glob would silently widen the
 * subject the first time someone quotes the sentence in a fourth file.
 */
const SITES = [
  'docs/rom-study/claims/audio.json',
  'src/core/flight.ts',
  'tests/audio-flap.test.ts',
] as const

/**
 * Phrasings with NO correct form. Each asserts the geometry of BOTH loops in
 * one clause, and the whole point of the correction is that the two loops
 * DIFFER — so any single "below" covering both is wrong however it is reworded.
 */
const REFUTED: ReadonlyArray<readonly [RegExp, string]> = [
  [/below\s+each/i, 'below-each (asserts the FLAPS2/FLIPS2 pair together)'],
  [
    /both\s+(loops|cues)[\s\S]{0,40}?below|below[\s\S]{0,40}?both\s+(loops|cues)/i,
    'both-loops/cues + below',
  ],
  [/re-enters?\s+below\s+the\s+cue/i, 're-enters below the cue (unqualified)'],
]

/** FLAPS2 spoken of as being "below" — refuted only if nothing nearby says otherwise. */
const FLAPS2_NEAR_BELOW = /FLAPS2[\s\S]{0,45}?\bbelow\b|\bbelow\b[\s\S]{0,45}?FLAPS2/gi
const CONTRADICTS = /\babove\b|\bnot below\b|bypass|skips?\b|fall-through|falls through/i
const WINDOW = 180

export interface Violation {
  readonly line: number
  readonly rule: string
  readonly text: string
}

export function wordingViolations(text: string): Violation[] {
  const out: Violation[] = []
  const seen = new Set<number>()
  const lines = text.split('\n')
  const lineAt = (idx: number): number => text.slice(0, idx).split('\n').length
  const push = (idx: number, rule: string): void => {
    const line = lineAt(idx)
    if (seen.has(line)) return
    seen.add(line)
    out.push({ line, rule, text: (lines[line - 1] ?? '').trim().slice(0, 90) })
  }

  for (const [re, name] of REFUTED) {
    for (const m of text.matchAll(new RegExp(re.source, `${re.flags.replace('g', '')}g`))) {
      push(m.index, name)
    }
  }
  for (const m of text.matchAll(FLAPS2_NEAR_BELOW)) {
    const win = text.slice(Math.max(0, m.index - WINDOW), m.index + m[0].length + WINDOW)
    if (!CONTRADICTS.test(win)) push(m.index, 'FLAPS2 + below (no countervailing above/bypass)')
  }
  return out.sort((a, b) => a.line - b.line)
}

// ═════════════════════════════════════════════════════════════════════════════
// The guard's own controls. These PASS on arrival and are what make the census
// below meaningful — a censor that flags everything, or nothing, is not a test.
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-7 AC4 — the wording censor discriminates', () => {
  it('clears a CORRECTED passage that states the asymmetry', () => {
    // Measured false positive: two earlier drafts of this guard flagged this
    // exact passage, once for naming both labels and once because the "ABOVE"
    // wrapped onto the next line. It must stay clean, or the guard forbids
    // writing the correction the story asks for.
    const corrected = [
      '// Holding never re-fires either cue because the held path SKIPS it:',
      '// FLIPS2 (:6197) sits below the wing-up JSR VSND (:6184), while FLAPS2',
      '// (:6170) sits ABOVE the wing-down JSR VSND (:6218) and is reached by',
      "// fall-through from FLAPLP's TSTB / BEQ GOFLIP (:6168-6169).",
    ].join('\n')
    expect(wordingViolations(corrected)).toEqual([])
  })

  it('clears the TRUE claim that FLIPS2 alone sits below its cue', () => {
    const trueClaim = '// FLIPS2 (:6197) is the label below the wing-up JSR VSND (:6184).'
    expect(wordingViolations(trueClaim)).toEqual([])
  })

  it('clears innocuous "below" prose that means "further down this file"', () => {
    // audio-flap.test.ts uses "below" this way ~13 times. A guard that caught
    // them would be unfixable without rewriting unrelated prose.
    const innocuous = [
      '// the group below is therefore necessary and NOT sufficient',
      "expect(seen.flat().length, 'nothing was emitted — the rows below are vacuous')",
      '// Every staged frame below is an OBSERVATION of the shipped sim',
      '// NON-VACUITY first: an always-empty stream satisfies half the rows below.',
    ].join('\n')
    expect(wordingViolations(innocuous)).toEqual([])
  })

  it('CATCHES each refuted phrasing, including the four that never say FLAPS2', () => {
    // Non-vacuity of the censor itself. Without this the census could pass by
    // matching nothing at all.
    const refutedSamples = [
      '// the labels BELOW each `JSR VSND`',
      '//     enters both loops BELOW their cues.',
      "it('a HELD button re-enters BELOW the cue — which is why holding is silent', () => {",
      "it('STFLY jumps AT the wing-down cue; STFALL enters BELOW both cues', () => {",
      "why: 'HELD — FLAPLP re-enters at FLAPS2, below the cue'",
    ]
    for (const sample of refutedSamples) {
      expect(wordingViolations(sample), `must flag: ${sample}`).toHaveLength(1)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC4 — the census. Fails until every site is corrected TOGETHER.
//
// MEASURED 2026-08-02, before any fix — TEN sites, not the nine jt5-7 filed:
//
//   docs/rom-study/claims/audio.json:130   claim JT53-001, "BELOW each JSR VSND"
//   docs/rom-study/claims/audio.json:202   ← NOT FILED BY ANY STORY. The STFLY
//                                            claim's tail says STFALL "re-enters
//                                            below both cues" — the same defect,
//                                            in a claim nobody listed.
//   src/core/flight.ts                 "re-enters its loop BELOW the cue"
//   tests/audio-flap.test.ts   (seven occurrences)
//
// The story's own text says "fix all nine together or the next reader finds the
// corrected copy and the stale copies disagreeing" — which is exactly why this
// is one census assertion over all three files rather than ten spot checks.
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-7 AC4 — no site claims the wing-down cue is entered from below', () => {
  it('the census is clean across all three files', () => {
    const found = SITES.flatMap((rel) =>
      wordingViolations(read(rel)).map((v) => `${rel}:${v.line}  [${v.rule}]\n      ${v.text}`),
    )
    expect(
      found,
      `sites still asserting FLAPS2 / both loops sit BELOW their cue:\n  ${found.join('\n  ')}\n\n` +
        'FLIPS2 (:6197) IS below its cue (:6184). FLAPS2 (:6170) is ABOVE its cue (:6218) and ' +
        'the cue path never reaches it — it is the fall-through the held path takes. Reword to ' +
        'the BYPASS, keeping the law (holding never re-fires the cue) true of both loops.',
    ).toEqual([])
  })

  it('the correction is a rewording, not a deletion of the mechanism', () => {
    // The cheap way out of the census is to delete every sentence that
    // discusses the loops. Each file must still explain WHY holding is silent.
    //
    // Mixed role, measured 2026-08-02: audio.json (2 hits) and
    // audio-flap.test.ts (1) already carry bypass wording, so for those two
    // this is a REGRESSION guard, green on arrival. src/core/flight.ts has
    // ZERO — its comment explains the silence purely as "BELOW the cue" — so
    // for that file this is a RED target, and it is the reason the assertion
    // fails today.
    for (const rel of SITES) {
      const text = read(rel)
      expect(
        /bypass|skips|fall-through|falls through|without passing|never reaches/i.test(text),
        `${rel} must still explain that the held path BYPASSES the cue`,
      ).toBe(true)
    }
  })

  it('the two labels are still named — the asymmetry is the point', () => {
    // A "fix" that drops FLAPS2/FLIPS2 entirely would pass the census and lose
    // the ROM anchoring jt5-3 established.
    for (const rel of SITES) {
      const text = read(rel)
      expect(text, `${rel} must still name FLAPS2`).toMatch(/FLAPS2/)
      expect(text, `${rel} must still name FLIPS2`).toMatch(/FLIPS2/)
    }
  })
})
