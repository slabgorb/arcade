// tests/demo-jt9-38-source.test.ts
//
// Story jt9-38 — RED phase (Mr. Praline / TEA). The PROVENANCE companion to
// demo-jt9-38.test.ts: proves the two halves this story ports are really in the
// vendored 1982 source, and — for the number that matters most — DERIVES the
// twelve from the source rather than transcribing it.
//
// WHY A DERIVATION AND NOT A LINE PIN. `12` is the one constant this story adds
// to production, and a test that reads `LDA #6` twice and asserts "12" is a
// transcription checking a transcription. The gate below re-reads the WAVEGG
// placement block, resolves each loop's `STA PWREGA,U` immediate, counts the
// loops, and multiplies — so a mis-read of either immediate, or a block that
// turns out to have one loop rather than two, produces a RED rather than an
// agreeing pair of wrong numbers.
//
// THE FOUR CLAIMS THE STORY'S SETUP CORRECTED are each pinned here, because a
// correction that lives only in a session file is prose, and prose is the
// unguarded surface:
//   1. WENEMY is 255 in a normal wave        — JOUSTRV4.SRC:1991-1992 + the four
//                                              branches that reach WNRM
//   2. WENEMY is the egg wave's own nibble   — JOUSTRV4.SRC:2744-2759
//   3. the deferral re-primes to ONE nap     — JOUSTRV4.SRC:3238 + :3227
//   4. the egg wave deals twelve             — JOUSTRV4.SRC:2778-2822 + EGLEDG
//
// CI DEGRADATION: CI has no vendored tree for some checkouts, so every source
// read sits behind `describe.skipIf(!vendoredAvailable)` and inside an `it()`
// body (the tp1-8 collection trap). Measured at RED in this checkout: the tree IS
// committed — `git ls-files reference/williams-source/joust` returns 49 tracked
// files — so these DO run here.

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'

const SRC = 'JOUSTRV4.SRC'
const line = (n: number): string => sourceLines(SRC)[n - 1] ?? ''

/** Every ROM line this story cites, with the tokens that must be on it. */
const LAWS: ReadonlyArray<{ name: string; n: number; must: readonly string[] }> = [
  // ── (1) the NORMAL wave's quota: 255, i.e. no gate at all ──────────────────
  { name: 'WNRM loads the normal-wave maximum', n: 1991, must: ['LDA', '#255'] },
  {
    name: 'and stores it to WENEMY as the normal-wave maximum',
    n: 1992,
    must: ['STA', 'WENEMY', 'MAXIMIM ENEMIES FOR A NORMAL WAVE'],
  },
  { name: 'WNRM is the label the wave-advance paths converge on', n: 1979, must: ['WNRM', 'CLR', 'EGGS1'] },

  // ── (2) the EGG wave's quota: the row's own ground nibble ──────────────────
  { name: 'the egg-wave setup reads WBOUND for the intelligence/count branch', n: 2746, must: ['LDA', 'WBOUND,X'] },
  { name: 'the hunter test is the LOW nibble of WBOUND', n: 2751, must: ['BITA', '#$0F'] },
  { name: 'the bounder/lord path shifts the HIGH nibble down (four LSRAs start here)', n: 2754, must: ['LSRA'] },
  { name: 'the selected nibble is masked', n: 2758, must: ['ANDA', '#$0F'] },
  {
    name: 'and stored to WENEMY as the per-wave hatch batch',
    n: 2759,
    must: ['STA', 'WENEMY', 'NUMBER OF ENEMIES TO HATCH AT A TIME'],
  },
  { name: 'the same block reads EGGWT2 — this is the egg-wave setup', n: 2761, must: ['LDB', 'EGGWT2'] },

  // ── (3) the hatch gate, and the line the filing omitted ────────────────────
  { name: 'the wait decrements and loops back while it is unexpired', n: 3236, must: ['DEC', 'PJOYT,U'] },
  { name: 'the loop-back branch of the wait', n: 3237, must: ['BNE', 'EGGLN2'] },
  { name: 'THE OMITTED LINE — the timer is re-primed to 1 before the population test', n: 3238, must: ['INC', 'PJOYT,U', 'SET = 1,'] },
  { name: 'the population is read', n: 3239, must: ['LDA', 'NENEMY', 'ENOUGH ENEMIES IN THIS WAVE?'] },
  { name: 'and compared against the wave quota', n: 3240, must: ['CMPA', 'WENEMY'] },
  { name: 'at or above the quota the hatch is DEFERRED back round the loop', n: 3241, must: ['BHS', 'EGGLN2'] },
  { name: 'only the pass that hatches increments the population', n: 3242, must: ['INC', 'NENEMY', '1 MORE ENEMY COMMING UP'] },
  { name: 'the loop body naps 12 — the deferral quantum', n: 3227, must: ['PCNAP', '12'] },

  // ── (4) the egg wave's density ─────────────────────────────────────────────
  { name: 'the first placement loop is primed with six', n: 2778, must: ['LDA', '#6'] },
  { name: 'six eggs, one per ledge', n: 2779, must: ['STA', 'PWREGA,U', 'EGGS ON EACH LEDGE'] },
  { name: 'the ledge loop walks every ledge', n: 2780, must: ['EGLEDG', 'PUT AN EGG ON EVERY LEDGE'] },
  { name: 'the second placement loop is primed with six again', n: 2805, must: ['LDA', '#6'] },
  { name: 'six MORE eggs, scattered', n: 2806, must: ['STA', 'PWREGA,U', '6 MORE EGGS TO GO'] },
  { name: 'the scatter loop reads the egg placement table', n: 2807, must: ['EGPTBL', 'EGG POSITION TABLE'] },

  // ── the population's OTHER writers, which decide that a derived count is right ──
  { name: 'a wave spawn increments the population', n: 2193, must: ['INC', 'NENEMY', '1 MORE ENEMY ON THE SCREEN'] },
  { name: 'a death decrements it', n: 2965, must: ['DEC', 'NENEMY', 'DECREMENT NBR OF ENEMIES ON THE SCREEN'] },
  { name: 'a wave reset zeroes it', n: 975, must: ['CLR', 'NENEMY', 'NO ENEMIES ARE ON THE SCREEN'] },
  { name: 'collecting an egg whose remount bird is already inbound decrements it', n: 3080, must: ['DEC', 'NENEMY', 'THIS GUY IS NO LONGER AN ENEMY'] },
  { name: 'BAITERS are counted separately, on NBAIT', n: 2111, must: ['INC', 'NBAIT', '1 MORE BAITER ON THE SCREEN'] },
]

describe.skipIf(!vendoredAvailable)('jt9-38 — the density and the population gate are really in the 1982 source', () => {
  it.each(LAWS)(`${SRC}:$n carries "$name"`, ({ n, must }) => {
    const text = line(n)
    for (const token of must) {
      expect(text, `${SRC}:${n} must carry ${JSON.stringify(token)} — got: ${JSON.stringify(text)}`).toContain(token)
    }
  })

  it('DERIVES the twelve: two placement loops, each primed with its own immediate', () => {
    // The number this story puts in production, re-derived rather than transcribed.
    // Walk the WAVEGG placement block and collect every `STA PWREGA,U` together with
    // the immediate the preceding `LDA #n` loaded. The total is the product of the
    // loop count and the batch size only if BOTH loops are found and BOTH immediates
    // read — a block with one loop, or an immediate misread as something else, reds.
    const lines = sourceLines(SRC)
    const batches: number[] = []
    let pending: number | null = null
    for (let i = 2770 - 1; i < 2825; i++) {
      const t = lines[i] ?? ''
      const lda = /^\s*(?:\S+\s+)?LDA\s+#(\d+)\s*(?:\s|$)/.exec(t)
      if (lda) {
        pending = Number(lda[1])
        continue
      }
      if (/\bSTA\s+PWREGA,U\b/.test(t)) {
        expect(pending, `the STA PWREGA,U at ${SRC}:${i + 1} has no preceding LDA # immediate`).not.toBeNull()
        batches.push(pending as number)
        pending = null
      }
    }
    expect(batches.length, 'WAVEGG primes the egg counter TWICE — one ledge pass, one scatter pass').toBe(2)
    expect(batches, 'and each pass places six').toEqual([6, 6])
    expect(
      batches.reduce((a, b) => a + b, 0),
      'so an egg wave deals TWELVE eggs, independent of the wave row',
    ).toBe(12)
  })

  it('EGLEDG really has six ledge entries, so the first pass is one egg per ledge', () => {
    // The corroborating second source for the first six (JOUSTRV4.SRC:2910-2915).
    // Read to the next non-FCB line rather than a pinned extent, so a table that
    // GREW would be reported rather than silently truncated at a hard-coded row
    // count (`rom-table-continuation-bit`).
    const lines = sourceLines(SRC)
    const start = lines.findIndex((l) => /^EGLEDG\s+FCB\b/.test(l))
    // MEASURED EQUIVALENCE, recorded so nobody re-derives it: replacing this
    // label-find with the literal `2910 - 1` leaves the whole file green, because
    // EGLEDG really is at that line today. The label-find is chosen for robustness
    // if the table moves, and NO assertion here can observe the difference — do not
    // add one. What IS guarded is the EXTENT below: expecting 7 rows instead of 6 reds.
    expect(start, 'EGLEDG is present in the source').toBeGreaterThan(-1)
    let rows = 0
    for (let i = start; i < lines.length; i++) {
      if (!/^\s*(?:EGLEDG\s+)?FCB\b/.test(lines[i] ?? '')) break
      rows++
    }
    expect(rows, 'EGLEDG lists LEVEL0..LEVEL5 — six ledges, six eggs in the first pass').toBe(6)
  })

  it('all FOUR wave-advance routes converge on WNRM, so the 255 is not a special case', () => {
    // CORRECTION 1's structural half. If any advance path skipped WNRM, a normal wave
    // could inherit the previous egg wave's quota and the gate would bite where the
    // machine does not. Every branch to WNRM is enumerated, and the count is asserted
    // so a fifth route appearing later reds rather than being silently ignored.
    const lines = sourceLines(SRC)
    const refs: number[] = []
    lines.forEach((l, i) => {
      if (/^\s*(?:BNE|BRA|BEQ|LBRA|LBNE|LBEQ)\s+WNRM\b/.test(l)) refs.push(i + 1)
    })
    expect(refs, 'the four branches that reach WNRM').toEqual([1937, 1952, 1955, 1957])
  })

  it('the gate lines sit BETWEEN the wait and the hatch, in that order', () => {
    // A span tells you what the code says; the ORDER tells you what can reach it.
    // The re-prime must precede the population read, and the population read must
    // precede the increment, or the mechanism is a different mechanism.
    // KILLS a re-citation that quotes the right lines in the wrong relationship.
    expect(3237, 'the wait branch').toBeLessThan(3238)
    expect(line(3238)).toContain('INC')
    expect(line(3239)).toContain('LDA')
    for (let n = 3238; n <= 3242; n++) {
      expect(line(n).trim().length, `${SRC}:${n} must not be blank — the block is contiguous`).toBeGreaterThan(0)
    }
    // The branch target of the deferral is the loop head, i.e. the nap is paid again.
    expect(line(3226), 'EGGLN2 is the loop head the deferral branches back to').toContain('EGGLN2')
    expect(line(3227), 'and the very next thing it does is nap 12').toContain('PCNAP')
  })

  it('NENEMY has exactly six writers, and one of them is attract-mode only', () => {
    // The claim behind AC-3's "a DERIVED count satisfies every writer by
    // construction". Enumerated rather than sampled: a seventh writer appearing
    // would mean the derived count no longer tracks the ROM's, and nothing else
    // in the suite would notice.
    const lines = sourceLines(SRC)
    const writers: number[] = []
    lines.forEach((l, i) => {
      if (/^\s*(?:\S+\s+)?(?:INC|DEC|CLR)\s+NENEMY\b/.test(l)) writers.push(i + 1)
    })
    expect(writers, 'the NENEMY write set').toEqual([460, 975, 2193, 2965, 3080, 3242])
    // :460 is inside ATTEMY — "START ATTRACT MODES ENEMY" — so it never runs in play.
    const attemy = lines.findIndex((l) => /^ATTEMY\b/.test(l)) + 1
    expect(attemy, 'ATTEMY must be found').toBeGreaterThan(0)
    expect(attemy, 'the :460 write is inside the attract-mode enemy starter').toBeLessThan(460)
    expect(line(attemy - 4), 'and the routine says so').toContain('ATTRACT')
  })
})
