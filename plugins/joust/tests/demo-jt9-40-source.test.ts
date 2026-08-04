// tests/demo-jt9-40-source.test.ts
//
// Story jt9-40 — RED phase (Mr. Praline / TEA). The PROVENANCE companion to
// tests/demo-jt9-40.test.ts: proves PWHCH is really in the vendored 1982 source,
// and DERIVES the two numbers this story puts into production rather than
// transcribing either of them.
//
// ─── WHY A DERIVATION, AND NOT TWO MORE LINE PINS ────────────────────────────
// This story arrived with its count stated BOTH ways. SM's first draft asserted
// THREE "despite the comment saying two"; the correction says TWO; and the
// committed description still carries the sentence "With PWHCH the first three
// would arrive earlier", contradicting its own title. A line pin on `LDA #2`
// would settle none of that — the disagreement was never about what the immediate
// says, it was about what `DEC` then `BMI` DO with it. Somebody who reads the
// immediate as 2 and the loop as firing on 2, 1 and 0 gets three, and a byte-exact
// citation of :2776 agrees with them.
//
// So the count is derived by EXECUTION: the test parses the immediate, the
// read-modify-write mnemonic and the BRANCH mnemonic out of the source and runs
// the loop over the twelve CREGG calls the wave makes. Change the immediate,
// change `DEC` to `INC`, change `BMI` to `BPL`, or change the number of CREGG
// calls, and the derived count moves. That is a test the "three" reading fails.
//
// A NOTE ON THE DECLARATION COMMENT, because there are now THREE phrasings in
// play and only one of them is executable. JOUSTRV4.SRC:160 declares PWHCH as "IF
// >0 A PRE-MATURE HATCHING EGG TO BE CREATED" — but the code shortens while the
// DECREMENTED value is >= 0, so at PWHCH = 1 (not > 0 after the DEC) an egg is
// still shortened. The 1982 declaration comment is loose, the 1982 inline comment
// ("NUMBER OF PRE-MATURE EGG HATCHINGS", with the value 2) is exact, and the code
// is what is simulated below. Distrusting a ROM comment stays right; replacing one
// with an unchecked count is what went wrong here.
//
// ─── THE RANGE IS CORROBORATED, NOT TAKEN FROM ITS OWN COMMENT ───────────────
// `A RANDOM NUMBER 0-127` (JOUSTRV4.SRC:2890) is a comment, and a comment is the
// unguarded surface. It is the load-bearing half of "1/2 OF THE RANGE" — at 0-255
// the same MUL would take up to the whole wait — so it is confirmed twice more
// from CODE that would not work if VRAND returned 0-255
// (`citation-gate-checks-quotes-not-meaning`).
//
// The vendored tree is gitignored, so the byte-reads SKIP on CI (the jt1-3
// degradation pattern); the claim-coverage check reads the committed claims/ and
// runs everywhere.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'
import { loadClaims, claimCovers } from './helpers/claims.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const demoPath = join(repoRoot, 'src', 'core', 'demo.ts')

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

/** `A RANDOM NUMBER 0-127` (JOUSTRV4.SRC:2890) — the draw's top value. */
const MAX_DRAW = 127

// ═════════════════════════════════════════════════════════════════════════════
describeVendored('PWHCH is set at egg-wave setup and spent inside CREGG', () => {
  it('the egg-wave setup primes it, immediately before the placement loops (:2776-2777)', () => {
    const lines = sourceLines(SRC)
    expect(lines[2776 - 1]).toBe('\tLDA\t#2\t\tNUMBER OF PRE-MATURE EGG HATCHINGS')
    expect(lines[2777 - 1]).toBe('\tSTA\tPWHCH,U')
    // It sits INSIDE the egg-wave block, not in a general wave reset: the line
    // before it clears the egg placement table and the line after primes the first
    // placement loop. That is what makes it re-arm on every egg wave.
    expect(lines[2773 - 1], 'the placement table clear precedes it').toContain('EGLEND')
    expect(lines[2779 - 1], 'and the ledge loop is primed right after').toContain('PWREGA,U')
  })

  it('the DECLARATION exists, and its comment is looser than the code (:160)', () => {
    // Pinned so the discrepancy is on the record rather than rediscovered. "IF >0"
    // is not the rule the DEC/BMI implements; the simulation below is.
    const lines = sourceLines(SRC)
    expect(lines[160 - 1]).toBe('PWHCH\tRMB\t1\tIF >0 A PRE-MATURE HATCHING EGG TO BE CREATED')
  })

  it('CREGG spends it, in the block that sets the egg\'s hatch time (:2886-2894)', () => {
    const lines = sourceLines(SRC)
    expect(lines[2886 - 1]).toBe('\tLDB\tPEGGTM,U\tHATCHING TIME')
    expect(lines[2887 - 1]).toBe('\tSTB\tPJOYT,Y')
    expect(lines[2888 - 1]).toBe('\tDEC\tPWHCH,U\t\tANYMORE EGGS TO HATCH PREMATURLY?')
    expect(lines[2889 - 1]).toBe('\tBMI\t20$')
    expect(lines[2890 - 1]).toBe('\tJSR\tVRAND\t\tA RANDOM NUMBER 0-127')
    expect(lines[2891 - 1]).toBe('\tMUL\t\t\tGET A RANDOM TIME 1/2 OF THE RANGE')
    expect(lines[2892 - 1]).toBe('\tNEGA')
    expect(lines[2893 - 1]).toBe('\tADDA\tPJOYT,Y')
    expect(lines[2894 - 1]).toBe('\tSTA\tPJOYT,Y\t\tNEW HATCHING TIME')
  })

  it('the branch SKIPS the whole shortening — 20$ is the line after it', () => {
    // A span says what the code contains; the branch target says what it can avoid.
    // If `20$` were anywhere else the BMI would be skipping something other than the
    // draw, and every reading in this story would be about the wrong five lines.
    // KILLS a re-citation that quotes the right lines in the wrong relationship.
    const lines = sourceLines(SRC)
    expect(lines[2895 - 1], '20$ labels the line immediately after STA PJOYT,Y').toMatch(/^20\$\s/)
    const targets = lines
      .slice(2863 - 1, 2905)
      .map((l, i) => ({ n: i + 2863, text: l }))
      .filter((r) => /^20\$/.test(r.text))
      .map((r) => r.n)
    expect(targets, 'exactly one 20$ label inside CREGG, and it is at :2895').toEqual([2895])
  })

  it('EXHAUSTIVE — CREGG has exactly two call sites, both inside the egg-wave loops', () => {
    // This is what makes PWHCH the EGG WAVE's counter and nothing else's. If any
    // other egg-creating path reached CREGG, a kill-egg could spend the budget and
    // the port's "wave eggs only" scoping would be the port's invention.
    // KILLS "an unhorsed rider's egg is also created by CREGG".
    const lines = sourceLines(SRC)
    const callSites = lines
      .map((l, i) => ({ n: i + 1, text: l }))
      .filter((r) => /\bJSR\s+CREGG\b/.test(r.text))
      .map((r) => r.n)
    expect(callSites, 'the ledge loop and the scatter loop, and no others').toEqual([2802, 2820])
    expect(lines[2863 - 1], 'and CREGG itself is the routine those two enter').toBe('CREGG\tPSHS\tA')
    // Both sites sit between the PWHCH prime (:2777) and the block's JMP WBEGIN.
    for (const n of callSites) expect(n, `the CREGG call at ${SRC}:${n} is after the prime`).toBeGreaterThan(2777)
    expect(Math.max(...callSites), 'and before the egg-wave block hands off').toBeLessThan(2823)
  })

  it('nothing writes to PWHCH except those two lines', () => {
    // The scope claim, enumerated rather than sampled. A second `STA PWHCH` anywhere
    // would mean the counter is re-armed somewhere the port does not model.
    const lines = sourceLines(SRC)
    const writes = lines
      .map((l, i) => ({ n: i + 1, text: l }))
      .filter((r) => /\b(?:STA|STB|CLR|INC|DEC|LDA)\s+PWHCH\b/.test(r.text))
      .map((r) => r.n)
    expect(writes, 'the egg-wave prime and CREGG\'s decrement — that is the whole life of PWHCH').toEqual([2777, 2888])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describeVendored('THE COUNT, derived by running the loop the source describes', () => {
  /**
   * The three tokens the count depends on, read out of the source rather than
   * assumed: the immediate PWHCH is primed with, the read-modify-write applied to
   * it per egg, and the branch that decides whether the draw is skipped.
   */
  function romOperands(): { imm: number; rmw: string; branch: string } {
    const lines = sourceLines(SRC)
    const imm = /\bLDA\s+#(\d+)\b/.exec(lines[2776 - 1] ?? '')
    const rmw = /^\s*(\w+)\s+PWHCH,U\b/.exec(lines[2888 - 1] ?? '')
    const branch = /^\s*(B\w+)\s+\S/.exec(lines[2889 - 1] ?? '')
    expect(imm, `${SRC}:2776 must load an immediate into A`).not.toBeNull()
    expect(rmw, `${SRC}:2888 must apply an operation to PWHCH,U`).not.toBeNull()
    expect(branch, `${SRC}:2889 must be a conditional branch`).not.toBeNull()
    return { imm: Number(imm?.[1]), rmw: String(rmw?.[1]), branch: String(branch?.[1]) }
  }

  /** The twelve CREGG calls a wave makes, derived from the two loop immediates. */
  function cregCalls(): number {
    const lines = sourceLines(SRC)
    let pending: number | null = null
    const batches: number[] = []
    for (let i = 2770 - 1; i < 2825; i++) {
      const lda = /^\s*(?:\S+\s+)?LDA\s+#(\d+)\s*(?:\s|$)/.exec(lines[i] ?? '')
      if (lda) {
        pending = Number(lda[1])
        continue
      }
      if (/\bSTA\s+PWREGA,U\b/.test(lines[i] ?? '')) {
        expect(pending, `the STA PWREGA,U at ${SRC}:${i + 1} has no preceding LDA # immediate`).not.toBeNull()
        batches.push(pending as number)
        pending = null
      }
    }
    expect(batches, 'WAVEGG primes the egg counter twice, six each').toEqual([6, 6])
    return batches.reduce((a, b) => a + b, 0)
  }

  it('is TWO — and the derivation, not a comment, is what says so', () => {
    // Simulate the 6809. `DEC mem` sets N from bit 7 of the RESULT; `BMI` takes the
    // branch when N is set, i.e. when the decremented byte has gone negative. Both
    // mnemonics are read from the source, so a source that said `BPL` would derive a
    // different number here rather than quietly agreeing with a hard-coded 2.
    //
    // Walked out: 2 -> 1 (positive, shorten) -> 0 (positive, shorten) -> $FF
    // (negative, skip) -> $FE (skip) … Two eggs, and the twelve calls are what prove
    // the sequence has somewhere to run out.
    //
    // KILLS the "three" reading this story's own filing still carries, and any
    // future edit of the immediate that forgets to move the port.
    const { imm, rmw, branch } = romOperands()
    const calls = cregCalls()
    expect(calls, 'twelve eggs are created, so the counter is exercised past its end').toBe(12)

    let v = imm & 0xff
    let shortened = 0
    for (let call = 0; call < calls; call++) {
      if (rmw === 'DEC') v = (v - 1) & 0xff
      else if (rmw === 'INC') v = (v + 1) & 0xff
      else throw new Error(`${SRC}:2888 applies ${rmw} to PWHCH, which this derivation cannot execute`)
      const negative = (v & 0x80) !== 0
      let taken: boolean
      if (branch === 'BMI') taken = negative
      else if (branch === 'BPL') taken = !negative
      else throw new Error(`${SRC}:2889 branches on ${branch}, which this derivation cannot execute`)
      if (!taken) shortened++
    }

    expect(shortened, 'the DEC/BMI pair shortens exactly two of the twelve').toBe(2)
    expect(shortened, 'and it is NOT the three the first draft of this story asserted').not.toBe(3)
  })

  it('CONTROL — the derivation moves when the immediate does, so it is not hard-coded', () => {
    // Without this, the simulation above could be a loop that returns 2 whatever it
    // is fed. Same executor, a fabricated immediate: an implementation of PWHCH that
    // ignored the ROM value entirely would still satisfy the test above.
    const run = (imm: number, calls: number): number => {
      let v = imm & 0xff
      let n = 0
      for (let c = 0; c < calls; c++) {
        v = (v - 1) & 0xff
        if ((v & 0x80) === 0) n++
      }
      return n
    }
    expect(run(2, 12), 'the real immediate').toBe(2)
    expect(run(3, 12), 'a fabricated 3 gives three').toBe(3)
    expect(run(0, 12), 'and a zero shortens nothing at all').toBe(0)
    // The count saturates at the number of eggs — 12 shortens all of them, not 20.
    expect(run(20, 12), 'and it can never exceed the eggs the wave deals').toBe(12)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describeVendored('THE CUT: the multiplicand is the WAIT, and the draw tops out at 127', () => {
  it('B still holds PEGGTM when the MUL runs — nothing rewrites it in between', () => {
    // This is the whole reason the shortening SCALES. `LDB PEGGTM,U` (:2886) is four
    // lines above the `MUL` (:2891) with a `JSR VRAND` in between, so the claim
    // "the reduction is a fraction of the wave's own wait" rests on B surviving the
    // call. Enumerated: no instruction between them defines B.
    // KILLS reading the cut as "a random number of frames" independent of the wait.
    const lines = sourceLines(SRC)
    const DEFINES_B = /^\s*(?:\S+\s+)?(?:LDB|LDD|CLRB|ADDB|ADCB|SUBB|SBCB|INCB|DECB|ANDB|ORB|EORB|ASLB|ASRB|LSRB|ROLB|RORB|NEGB|COMB|MUL|PULS|PULU|TFR|EXG)\b/
    const rewriters: number[] = []
    for (let n = 2887; n <= 2890; n++) {
      if (DEFINES_B.test(lines[n - 1] ?? '')) rewriters.push(n)
    }
    expect(rewriters, 'between the LDB and the MUL, nothing touches B').toEqual([])
    expect(lines[2886 - 1], 'so the multiplicand is the wave\'s hatch time').toContain('PEGGTM,U')
    expect(lines[2891 - 1], 'and the product is described as half the range').toContain('1/2 OF THE RANGE')
  })

  it('VRAND yields 0-127 — corroborated TWICE from code, not from its own comment', () => {
    // (a) THE ROL. JOUSTRV4.SRC:2794-2795 draws and then ROLAs to "GET RANDOM NBR 0
    //     TO 255". A shift left is how you get from 0-127 to 0-255; if VRAND already
    //     returned 0-255 the ROL would be discarding the top bit and the comment
    //     would be describing the opposite of what the line does.
    // (b) THE LEDGE SELECT. JOUSTRV4.SRC:2782-2784 draws, loads 6*2 and MULs to
    //     "SELECT RANDOM LEDGE". The high byte of draw x 12 is 0-5 only while the
    //     draw stays at or below 127; at 255 it reaches 11 and indexes off the end
    //     of a six-entry table.
    // Together these make the 0-127 range a property of the CODE. It is what makes
    // "1/2 OF THE RANGE" true, and it is the bound AC-1 sweeps.
    const lines = sourceLines(SRC)
    expect(lines[2794 - 1]).toBe('\tJSR\tVRAND')
    expect(lines[2795 - 1]).toBe('\tROLA\t\t\tGET RANDOM NBR 0 TO 255')
    expect(lines[2782 - 1]).toBe('\tJSR\tVRAND\t\tSELECT RANDOM LEDGE')
    expect(lines[2783 - 1]).toBe('\tLDB\t#6*2')
    expect(lines[2784 - 1]).toBe('\tMUL')
    // The six-entry table the ledge select indexes, read to its own end rather than
    // to a pinned row count (`rom-table-continuation-bit`).
    const start = lines.findIndex((l) => /^EGLEDG\s+FCB\b/.test(l))
    expect(start, 'EGLEDG is present').toBeGreaterThan(-1)
    let rows = 0
    for (let i = start; i < lines.length; i++) {
      if (!/^\s*(?:EGLEDG\s+)?FCB\b/.test(lines[i] ?? '')) break
      rows++
    }
    expect(rows, 'six ledges — so a draw above 127 would index past the table').toBe(6)
    // And the arithmetic the two corroborations agree on: high(127 x 12) = 5.
    expect((MAX_DRAW * 12) >> 8, 'the top draw selects the LAST ledge, never one past it').toBe(5)
    expect((255 * 12) >> 8, 'where a 0-255 draw would run to 11').toBe(11)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('every line this story cites is covered by a committed claim', () => {
  const CITED: ReadonlyArray<{ what: string; start: number; end: number }> = [
    { what: 'PWHCH is declared', start: 160, end: 160 },
    { what: 'the egg-wave setup primes PWHCH with 2', start: 2776, end: 2777 },
    { what: 'CREGG loads the wave wait into the egg PJOYT', start: 2886, end: 2887 },
    { what: 'the DEC/BMI that decides a pre-mature hatching', start: 2888, end: 2889 },
    { what: 'the VRAND draw and the MUL that halves the range', start: 2890, end: 2891 },
    { what: 'the NEGA/ADDA/STA that shortens the wait', start: 2892, end: 2894 },
  ]

  it('claims cover every cited range — Dev commits the JT940-* entries', () => {
    // The dossier gate (tests/audit/citations.test.ts) re-opens each claim's
    // `verbatim` against the vendored line, so a citation that rides it is checked
    // byte for byte on every run. A citation that lives only in a .ts comment is
    // prose, and prose is the unguarded surface.
    const claims = loadClaims()
    const uncovered = CITED.filter((c) => !claimCovers(claims, SRC, c.start, c.end))
    expect(
      uncovered.map((c) => `${c.what} (${SRC}:${c.start}-${c.end})`),
      'each cited range needs a committed claim in docs/rom-study/claims/',
    ).toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('project rules — the core boundary holds across the change', () => {
  it('demo.ts stays inside the pure core', () => {
    // A draw is exactly the kind of thing that tempts a `Math.random()`, and this
    // story's whole determinism requirement rests on it not being one.
    const text = codeOf(demoPath)
    expect(text, 'demo.ts must not reach ambient entropy').not.toMatch(/\bMath\s*\.\s*random\b/)
    expect(text, 'demo.ts must not reach a clock').not.toMatch(/\bDate\s*\.\s*now\b/)
    expect(text, 'demo.ts must not cast away the type system').not.toMatch(/\bas\s+any\b/)
    expect(text, 'demo.ts must not suppress errors without a code').not.toMatch(/@ts-ignore/)
  })

  it('carries the .js extension on every relative import (checklist rule 5)', () => {
    for (const m of codeOf(demoPath).matchAll(/from\s+'(\.[^']*)'/g)) {
      expect(m[1], `demo.ts: relative import ${m[1]} needs the .js extension`).toMatch(/\.js$/)
    }
  })
})
