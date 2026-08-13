// tests/audit/mushroom-claims.test.ts
//
// Story ml3-7 — RED phase (Leeloo / TEA). "Enroll the ml3-3 mushroom reducers as
// byte-verifiable claims." The behaviour arm (tests/mushroom.test.ts, ml3-3) pins
// WHAT the reducers do; this file pins WHERE they came from, in the dossier's own
// byte-verifiable grammar (ml1-1's citation gate). The reducers in
// src/core/mushroom.ts shipped cited in *comments only* (bare `MLSUB.MAC:NNN`), with
// no claim in docs/rom-study/claims/ — unlike conway's CW-* seam. This story extends
// the claim series so the gate re-opens each reducer mechanic against the vendored
// 1982 source (historicalsource/millipede @ 29f3e05).
//
// ─── SCOPE REFINEMENT MEASURED THIS SESSION (see .session/ml3-7-session.md) ───────
// The story lists SIX items; TWO are ALREADY CLAIMED and must be REUSED, not re-minted
// (a byte-duplicate would pass the gate on unique-id alone but is redundant):
//   • ROCK (MLDEF.MAC:204)      → already claimed TWICE: BT-33 (beetle, "indestructible
//                                 feature stamp") and SC-51 (scroll) — and SC-51 already
//                                 frames it as the CMP I,70 count threshold the mushroom
//                                 bookkeeping includes, i.e. exactly this story's context.
//   • OBSTAC probe AND-mask     → already claimed as BT-46 (MLSUB.MAC:888 "AND I,7F",
//                                 the probe's defining mask, from the beetle side).
// The FOUR genuinely un-enrolled mechanics are FULL_MUSHROOM, MUSHER, MUSHDC and
// RESTOR — this suite's RED teeth. The two dedup facts are guarded green-on-arrival
// (they redden only if BT-33/BT-46 are deleted or a duplicate ROCK claim is minted,
// which surfaces the AC-5 "reuse vs architect-approved new claim" decision).
//
// ─── WHY A TIGHT PER-MECHANIC REGION, NOT A SPAN ─────────────────────────────────
// The reducer block MLSUB.MAC:707-949 is SHARED with unrelated claims — the millipede
// train (MT-27..32, :797-817) and split/death (MS-1..6, :897-911) both cite lines
// inside it. A broad span filter would count those as this story's work. Each mechanic
// therefore gets a narrow line window, verified against the vendored file below, and
// the three conway seam claims that already sit in the MUSHER/MUSHDC windows
// (CW-61 :742, CW-62 :770, CW-63 :707) are excluded by id so "net-new" means net-new.
//
// ─── HOW GREEN LANDS ─────────────────────────────────────────────────────────────
// Dev (Korben) authors the claim JSON — GENERATED from the vendored bytes, never
// hand-typed (the ml1-2 sidecar lesson). Whether the mechanics extend CW-* or get a
// dedicated MUSH-* file is an open naming decision (context AC); loadClaims() globs
// claims/*.json, so this suite filters by ROM line, not by filename — it does not
// pre-decide where the claims live.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { claimsDir, loadClaims } from './dossier-sweep'

interface Claim {
  id: string
  claim: string
  source: { file: string; line: number; verbatim: string }
}

// The vendored 1982 source lives at the monorepo root — five levels above claimsDir
// (claims → rom-study → docs → millipede → plugins → root), matching the pattern the
// palette-claims suite (ml2-3) uses.
const vendored = (file: string): string[] =>
  readFileSync(join(claimsDir, '..', '..', '..', '..', '..', 'reference', 'original-source', 'millipede', file), 'utf8').split('\n')

// Conway/beetle claims that ALREADY sit in these windows — NOT this story's work.
const PREEXISTING = new Set(['CW-61', 'CW-62', 'CW-63', 'BT-33', 'BT-46'])

// The four net-new reducer mechanics, as tight windows verified against MLSUB.MAC
// this session. Each excludes the pre-existing seam lines by construction; the
// millipede-train (:797-817) and split-death (:897-911) claims fall OUTSIDE all four.
const MECHANICS: Record<string, (n: number) => boolean> = {
  FULL_MUSHROOM: (n) => n === 741, //                 "LDY I,7F ;FULL MUSHROOM"
  MUSHER: (n) => n >= 738 && n <= 769, //             presence check + row exclusions + row-band INC (excl 741/742)
  MUSHDC: (n) => n >= 708 && n <= 729, //             band decrement body (below the :707 .SBTTL, CW-63)
  RESTOR: (n) => n >= 919 && n <= 949, //             frame/pexpld/cdone gate + restore-to-full
}

const inAnyMechanic = (n: number): boolean => Object.values(MECHANICS).some((f) => f(n))

/** All claims this story is responsible for: MLSUB.MAC lines inside a reducer
 *  mechanic window, minus the pre-existing conway/beetle seam claims. */
const reducerClaims = (): Claim[] =>
  (loadClaims() as Claim[]).filter(
    (c) => c.source.file === 'MLSUB.MAC' && inAnyMechanic(c.source.line) && !PREEXISTING.has(c.id),
  )

/** Claims (from anywhere) that cite a given file:line — used by the dedup guards. */
const claimsAt = (file: string, line: number): Claim[] =>
  (loadClaims() as Claim[]).filter((c) => c.source.file === file && c.source.line === line)

describe('ml3-7 — the ml3-3 mushroom reducers are enrolled as byte-verifiable claims', () => {
  // ── AC-1 headline: the four net-new mechanics gain claims ───────────────────────
  it('the four un-enrolled reducer mechanics gain at least one claim each (floor 4)', () => {
    // One claim per mechanic is the FLOOR, not the ceiling — Dev measures the exact
    // rows (MUSHER and MUSHDC each carry several). RED today: zero net-new claims.
    expect(reducerClaims().length).toBeGreaterThanOrEqual(4)
  })

  // ── Per-mechanic anchors: each window must be covered ───────────────────────────
  for (const [name, inWindow] of Object.entries(MECHANICS)) {
    it(`${name} is claimed within its verified MLSUB.MAC window`, () => {
      const covered = reducerClaims().some((c) => inWindow(c.source.line))
      expect(covered, `no net-new claim cites the ${name} mechanic yet`).toBe(true)
    })
  }

  // ── Every net-new claim re-opens byte-for-byte against the vendored source ───────
  it('every net-new reducer claim byte-matches the vendored MLSUB.MAC line', () => {
    // The same law the whole-gate citations suite enforces, asserted narrowly so a
    // RED run points at THIS story. trimEnd both sides (the checker's comparison).
    // Gains teeth once claims exist; vacuous only while the set is empty (RED).
    const src = vendored('MLSUB.MAC')
    for (const c of reducerClaims()) {
      expect(
        (src[c.source.line - 1] ?? '').trimEnd(),
        `${c.id}: MLSUB.MAC:${c.source.line} must byte-match the claim's verbatim`,
      ).toBe(c.source.verbatim.trimEnd())
    }
  })

  it('every net-new reducer claim quotes a vendored .MAC file with a non-empty verbatim (GPL)', () => {
    for (const c of reducerClaims()) {
      expect(c.source.file, `${c.id}: claims quote VENDORED .MAC files only`).toMatch(/\.MAC$/)
      expect(c.source.verbatim.length, `${c.id}: verbatim is present`).toBeGreaterThan(0)
    }
  })

  // ── Dedup guards: the two already-claimed items are REUSED, not re-minted ────────
  it('ROCK stays claimed by exactly {BT-33, DD-5, SC-51} — no further ROCK claim slips in', () => {
    // ml3-7 pinned {BT-33, SC-51}; DD-5 was minted at the same line by ml4-4 (DDTS2's
    // restore-write threshold — a distinct claim, its own reviewed PR) and the two PRs
    // merged in crossed order (#331 before #328), so develop landed with this guard
    // stale. Updated DELIBERATELY by ml4-5 to admit DD-5; the guard's law is
    // unchanged — a fourth ROCK claim must not slip in silently.
    const rock = claimsAt('MLDEF.MAC', 204)
    expect(rock.map((c) => c.id).sort()).toEqual(['BT-33', 'DD-5', 'SC-51'])
  })

  it('the OBSTAC probe AND-mask stays claimed (BT-46 @ MLSUB.MAC:888)', () => {
    // Green on arrival. The probe's defining mask is already covered from the beetle
    // side; the reducer reuses it rather than re-minting the same verbatim.
    const mask = claimsAt('MLSUB.MAC', 888)
    expect(mask.some((c) => c.id === 'BT-46'), 'BT-46 must remain the AND-mask claim').toBe(true)
  })
})
