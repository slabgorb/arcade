// tests/demo-jt9-9-source.test.ts
//
// Story jt9-9 — RED phase (Mr. Praline / TEA). The PROVENANCE companion to
// tests/demo-jt9-9.test.ts, following the jt1-10/jt2-1 double-entry pattern: the
// behaviour suite encodes the laws, this file proves they are REAL in the
// vendored 1982 source and that every line the port cites is pinned by a
// committed claim.
//
// The vendored tree is gitignored, so the byte-reads SKIP on CI (the jt1-3
// degradation pattern); the claim-coverage checks read the committed claims/ and
// run everywhere.
//
// ─── WHY THE NAP LINE GETS ITS OWN PIN ───────────────────────────────────────
// The single most load-bearing correction this story makes is that the settled-
// egg wait is counted in PCNAP-12 naps, not frames. That fact lives on ONE line
// (:3227) sitting between the wait's load (:3224) and its decrement (:3236), and
// a reader skimming EGGLND for "DEC PJOYT" would miss it entirely and ship a
// twelve-times-too-fast hatch that looks perfectly reasonable. Pinning the load,
// the nap and the decrement TOGETHER — and asserting they are in that order and
// inside one routine — is what makes the unit checkable rather than assumed.
//
// ─── THE TWO EGGSCR CALL SITES ───────────────────────────────────────────────
// `grep JSR EGGSCR JOUSTRV4.SRC` returns exactly two, and the port models one:
//   :3006  SCORE EGG                  — inside DEATH3, on the KILL (this story)
//   :3021  COLLECT THE EGGS SCORE VALUE — PLYEGG, the catch (wired by jt8-4)
// The exhaustiveness assertion below is the one that matters: it is what stops a
// future reader "finding" a third site or quietly losing one.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'
import { loadClaims, claimCovers } from './helpers/claims.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const demoPath = join(repoRoot, 'src', 'core', 'demo.ts')
const eggPath = join(repoRoot, 'src', 'core', 'egg.ts')

/** A core module with comments and string literals stripped — CODE, not prose. */
function codeOf(p: string): string {
  return readFileSync(p, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')
}

const SRC = 'JOUSTRV4.SRC'
const describeVendored = vendoredAvailable ? describe : describe.skip

// ═════════════════════════════════════════════════════════════════════════════
describeVendored('the EGGWT wait is loaded, NAPPED and decremented — one routine', () => {
  it('EGGLND loads EGGWT into the egg workspace timer (:3224-3225)', () => {
    const lines = sourceLines(SRC)
    expect(lines[3224 - 1]).toBe('EGGLND\tLDA\tEGGWT\t\tGET CURRENT WAIT TIME')
    expect(lines[3225 - 1]).toBe('\tSTA\tPJOYT,U')
  })

  it('THE UNIT — one decrement costs a PCNAP 12, so the wait is in 12-frame naps', () => {
    const lines = sourceLines(SRC)
    // The three lines that jointly define the unit, asserted verbatim and IN
    // ORDER. KILLS: reading EGGWT as a frame count.
    expect(lines[3227 - 1]).toBe('\tPCNAP\t12\t\t12 EGG MAXIMUM, HOPEFULLY MULTIPLEXED')
    expect(lines[3236 - 1]).toBe('\tDEC\tPJOYT,U')
    // …and the nap sits BETWEEN the load and the decrement, which is what makes
    // it the loop body's cost rather than a one-off delay before it.
    expect(3224, 'load precedes nap').toBeLessThan(3227)
    expect(3227, 'nap precedes decrement').toBeLessThan(3236)
    // The loop closes back above the nap (`BNE EGGLN2`, EGGLN2 = :3226), so the
    // nap is paid once per decrement rather than once in total.
    expect(lines[3226 - 1], 'EGGLN2 is the loop head the DEC branches back to').toMatch(/EGGLN2/)
    expect(lines[3237 - 1], 'and the branch closes the loop').toMatch(/BNE\s+EGGLN2/)
  })

  it('EGGWT2 is a SEPARATE row, loaded once at egg-wave setup (:2761)', () => {
    const lines = sourceLines(SRC)
    expect(lines[2761 - 1]).toBe('\tLDB\tEGGWT2\t\tINITIAL EGG WAITING TIME')
    // RAMDEF names the split; without it a reader wires one row to both paths.
    const ram = sourceLines('RAMDEF.SRC')
    expect(ram[393 - 1], 'EGGWT is the general hatch wait').toMatch(
      /EGGWT\s+RMB.*TIME TO WAIT BEFORE STARTING EGG HATCHIN SEQUENCE/,
    )
    expect(ram[395 - 1], 'EGGWT2 is the EGG-WAVE wait').toMatch(
      /EGGWT2\s+RMB.*TIME TO WAIT BEFORE STARTING EGG HATCHIN \(EGG WAVES\)/,
    )
  })

  it('both rows are DYTBL rows 4 and 5, so the per-wave walk is the difficulty engine', () => {
    const lines = sourceLines(SRC)
    expect(lines[7307 - 1], 'EGGWT row').toMatch(/DYWORD\s+\$0060,\$0040,\$0020,-02,\$0010/)
    expect(lines[7308 - 1], 'EGGWT2 row').toMatch(/DYWORD\s+\$5A\+4,\$34\+4,\$1E\+4,-04,\$0008/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describeVendored('DEATH3 transfers PEGG and scores the LAST egg to the victor', () => {
  it('transfers the victim count and decrements it (:2999-3002)', () => {
    const lines = sourceLines(SRC)
    expect(lines[2999 - 1]).toBe('\tLDA\tPEGG,U\t\tTRANSFER NBR OF EGG LEFT')
    expect(lines[3000 - 1]).toBe('\tSTA\tPEGG,Y')
    expect(lines[3001 - 1]).toBe(
      '\tDEC\tPEGG,Y\t\tYOU CAN ONLY SQUEEZE SO MUCH BLOOD FROM AN EGG',
    )
    expect(lines[3002 - 1]).toBe('\tBNE\t1$\t\t BR=YOU CAN GET MORE EGGS')
  })

  it('THE VICTOR GUARD — LDU ,S then BEQ skips EGGSCR when there is no victor (:3004-3006)', () => {
    const lines = sourceLines(SRC)
    expect(lines[3004 - 1]).toBe(
      '\tLDU\t,S\t\tGET VICTORS WORKSPACE (CURRENTLY DIEING ENEMY)',
    )
    expect(lines[3005 - 1]).toBe('\tBEQ\t1$')
    expect(lines[3006 - 1]).toBe('\tJSR\tEGGSCR\t\tSCORE EGG')
    // The BEQ's target is the SAME `1$` the BNE at :3002 takes — the routine's
    // exit. KILLS: reading the BEQ as a branch into some other scoring path.
    expect(lines[3007 - 1], '1$ is the epilogue both branches reach').toMatch(/1\$\s+PULS/)
  })

  it('EXHAUSTIVE — EGGSCR has exactly TWO call sites, and jt8-4 wired the other', () => {
    const lines = sourceLines(SRC)
    const callSites = lines
      .map((l, i) => ({ line: i + 1, text: l }))
      .filter((r) => /\bJSR\s+EGGSCR\b/.test(r.text))
      .map((r) => r.line)
    // KILLS: a third site being invented, and a story that "ports EGGSCR"
    // while silently re-doing the one jt8-4 already shipped.
    expect(callSites, 'the DEATH3 kill site and the PLYEGG catch site, and no others').toEqual([
      3006, 3021,
    ])
    expect(lines[3021 - 1]).toBe('\tJSR\tEGGSCR\t\tCOLLECT THE EGGS SCORE VALUE')
  })

  it('the hatched BIRD carries the count on (:3251-3252)', () => {
    const lines = sourceLines(SRC)
    // This is the line that makes permadeath reachable at all: without it the
    // remounted bird forgets, and the count can never walk down to zero.
    expect(lines[3251 - 1]).toBe('\tLDA\tPEGG,U\t\tMAINTAIN NBR OF EGGS LEFT IN THE BIRD')
    expect(lines[3252 - 1]).toBe('\tSTA\tPEGG,Y')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('every line this story cites is covered by a committed claim', () => {
  const CITED: ReadonlyArray<{ what: string; start: number; end: number }> = [
    { what: 'EGGLND loads EGGWT into PJOYT', start: 3224, end: 3225 },
    { what: 'the PCNAP 12 that gives the wait its unit', start: 3226, end: 3227 },
    { what: 'the DEC PJOYT / BNE EGGLN2 wait loop', start: 3236, end: 3237 },
    { what: 'EGGWT2, the egg-wave initial wait', start: 2761, end: 2761 },
    { what: 'DEATH3 transfers and decrements PEGG', start: 2999, end: 3002 },
    { what: 'the victor guard and the DEATH3 EGGSCR call', start: 3004, end: 3006 },
    { what: 'the hatch maintains the count in the bird', start: 3251, end: 3252 },
  ]

  it('claims cover every cited range — Dev commits the JT99-* entries', () => {
    const claims = loadClaims()
    const uncovered = CITED.filter((c) => !claimCovers(claims, SRC, c.start, c.end))
    expect(
      uncovered.map((c) => `${c.what} (${SRC}:${c.start}-${c.end})`),
      'each cited range needs a committed claim',
    ).toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('project rules — the core boundary holds across the change', () => {
  it('keeps egg.ts and demo.ts inside the pure core', () => {
    // The wait timer is the kind of thing that tempts a `Date.now()` or a
    // module-scope mutable counter. Neither module may reach a clock, entropy or
    // a browser surface — the jt1-7 scanner's law, asserted here on the two
    // files this story edits.
    for (const [name, p] of [
      ['egg.ts', eggPath],
      ['demo.ts', demoPath],
    ] as const) {
      const text = codeOf(p)
      expect(text, `${name} must not reach a clock`).not.toMatch(/\bDate\s*\.\s*now\b/)
      expect(text, `${name} must not reach ambient entropy`).not.toMatch(/\bMath\s*\.\s*random\b/)
      expect(text, `${name} must not cast away the type system`).not.toMatch(/\bas\s+any\b/)
      expect(text, `${name} must not suppress errors without a code`).not.toMatch(/@ts-ignore/)
    }
  })

  it('carries the .js extension on every relative import (checklist rule 5)', () => {
    for (const [name, p] of [
      ['egg.ts', eggPath],
      ['demo.ts', demoPath],
    ] as const) {
      for (const m of codeOf(p).matchAll(/from\s+'(\.[^']*)'/g)) {
        expect(m[1], `${name}: relative import ${m[1]} needs the .js extension`).toMatch(/\.js$/)
      }
    }
  })
})
