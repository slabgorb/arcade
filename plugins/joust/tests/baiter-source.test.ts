// tests/baiter-source.test.ts
//
// Story jt3-5 — RED phase (Leeloo / TEA). The PROVENANCE + SOURCE-RE-DERIVATION
// companion to tests/baiter.test.ts. The behaviour suite encodes the baiter laws;
// this one RE-DERIVES their constants straight out of the vendored 1982 source with
// the INDEPENDENT reader (tests/helpers/joust-source.ts, which nothing under src/ may
// import — the jt1-3 double-entry), proves the six PCHASE-gated patches preserve their
// displaced instructions, closes the seam against jt2-2's budget invariant (AC-3), and
// pins the JT35-* claims.
//
// ─── THE DOUBLE-ENTRY (the jt1-3 tautology trap) ─────────────────────────────
// Dev transcribes the constants into src/core/baiter.ts one way; this file reads them
// out of the vendored tree another way (a raw-line reader Dev never imports), and the
// gate is that the two agree. A derivation that re-bakes its own misreadings cannot
// pass a reader it did not write.
//
// ─── DEGRADATION (the CI path) ───────────────────────────────────────────────
// CI clones only the joust subrepo and has no vendored tree, so every source
// re-derivation SKIPS there (describe.skipIf(!vendoredAvailable)); the claim-coverage
// checks read the committed claims/ and run EVERYWHERE. Every vendored read lives
// INSIDE an it() body (the tp1-8 collection trap).

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vendoredAvailable, sourceLines, evalOperand } from './helpers/joust-source.js'
import { loadBaiter } from './helpers/baiter-contract.js'
import { loadEnemy } from './helpers/enemy-contract.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const claimsDir = join(repoRoot, 'docs', 'rom-study', 'claims')
const baiterSrc = join(repoRoot, 'src', 'core', 'baiter.ts')

// ─────────────────────────────────────────────────────────────────────────────
// Claims plumbing (the ptero-source.test.ts pattern).
// ─────────────────────────────────────────────────────────────────────────────
interface Claim {
  id?: string
  claim?: string
  source?: { file: string; line: number; verbatim?: string }
}

function loadClaims(): Claim[] {
  if (!existsSync(claimsDir)) return []
  return readdirSync(claimsDir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(join(claimsDir, f), 'utf8')) as Claim | Claim[])
    .flat()
}

const basename = (p: string): string => p.split('/').pop() ?? p

function claimCovers(claims: Claim[], file: string, start: number, end: number): boolean {
  return claims.some(
    (c) => c.source && basename(c.source.file) === file && c.source.line >= start && c.source.line <= end,
  )
}

/**
 * As claimCovers, but only counts a jt3-5 (JT35-*) claim. The crux lines are
 * ALREADY pinned by jt1-8's qualified citations (JT8-015 :2150, JT8-094 :2135), so a
 * bare claimCovers would go vacuously green; these two pins must force jt3-5 to cite
 * the collapse and the ******** provenance with ITS OWN claim.
 */
function jt35Covers(claims: Claim[], file: string, start: number, end: number): boolean {
  return claims.some(
    (c) =>
      /^JT35-\d+$/.test(c.id ?? '') &&
      c.source &&
      basename(c.source.file) === file &&
      c.source.line >= start &&
      c.source.line <= end,
  )
}

// Raw-line reader for INSTRUCTION lines (the joust-source reader parses only FCB/FDB).
function line(n: number): string {
  return sourceLines('JOUSTRV4.SRC')[n - 1] ?? ''
}
function operandOf(n: number, op: string): string {
  const m = line(n).match(new RegExp(`\\b${op}\\s+#?(\\S+)`))
  if (!m) throw new Error(`no ${op} operand on JOUSTRV4.SRC:${n} — got: ${JSON.stringify(line(n))}`)
  return m[1]
}
// The joust-source reader handles `+` and negative literals but NOT `-` subtraction;
// the cap operand is `3-1`, both halves bare decimals.
function evalDiff(tok: string): number {
  const [a, b] = tok.split('-')
  return parseInt(a, 10) - parseInt(b, 10)
}
// Pull the SECONDS out of a `FDB SECONDS*60/8` row (asserts the literal FORM too).
function baitblSeconds(raw: string): number | null {
  const m = raw.match(/FDB\s+(\d+)\*60\/8/)
  return m ? parseInt(m[1], 10) : null
}

// The 14 BAITBL rows live on two adjacent line ranges: the RV3 original as ********
// comment rows (:2135-2148) and the V4 live rows (:2150-2163).
const RV3_FIRST = 2135
const RV3_LAST = 2148
const V4_FIRST = 2150
const V4_LAST = 2163

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 source — the PCHASE=−1 tag, the 3-live cap, and the SECONDS*60/8 nap math.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('AC-1 source — baiter = PCHASE=−1 ptero, capped at 3 (JOUSTRV4.SRC:2108-2113)', () => {
  it('the cap is CMPA #3-1 / BHI — ONLY ALLOW 3 BAITERS ON THE SCREEN', () => {
    // :2108 CMPA #3-1 / :2109 BHI 11$  (BR=3 BAITERS ON SCREEN, BUT READY)
    expect(operandOf(2108, 'CMPA'), 'the cap operand is written 3-1').toBe('3-1')
    expect(evalDiff(operandOf(2108, 'CMPA')), '3-1 = 2, so the 3rd is the last allowed').toBe(2)
    expect(line(2108)).toContain('ONLY ALLOW 3 BAITERS ON THE SCREEN')
    expect(line(2109)).toMatch(/BHI/)
    expect(line(2109)).toContain('3 BAITERS ON SCREEN')
  })

  it('the baiter is tagged PCHASE = −1 ("BAITER TYPE PTERODACTYL\'S")', () => {
    // :2112 LDA #-1 / :2113 STA PCHASE,Y  BAITER TYPE PTERODACTYL'S
    expect(evalOperand(operandOf(2112, 'LDA')), 'PCHASE tag literal is −1').toBe(-1)
    expect(line(2113)).toMatch(/STA\s+PCHASE,Y/)
    expect(line(2113)).toContain('BAITER TYPE')
  })

  it('the module agrees: BAITER_PCHASE = −1, MAX_BAITERS = 3', async () => {
    const b = await loadBaiter()
    expect(b.BAITER_PCHASE).toBe(evalOperand(operandOf(2112, 'LDA')))
    expect(b.BAITER_PCHASE).toBe(-1)
    expect(b.MAX_BAITERS, 'the cap, one more than the CMPA #3-1 compare').toBe(evalDiff(operandOf(2108, 'CMPA')) + 1)
    expect(b.MAX_BAITERS).toBe(3)
  })

  it('the EMYOK send-off naps PCNAP 8 — the /8 in SECONDS*60/8 (JOUSTRV4.SRC:2096)', () => {
    // :2096 EMYOK PCNAP 8 — the clock decrements once per 8-frame nap, so a BAITBL entry
    // is a nap-tick count and SECONDS*60/8 = nap-ticks (60 = display rate, /8 = the nap).
    expect(line(2096)).toMatch(/EMYOK\s+PCNAP\s+8/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 source — the BAITBL schedule + the V4 15s→1s collapse, RV3 ******** preserved.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('AC-1 source — BAITBL SECONDS*60/8, the V4 collapse, ******** provenance (JOUSTRV4.SRC:2134-2163)', () => {
  it('the V4 live rows re-derive to [1×6, 3, 5, 7, 15, 15, 30, 45, 60] seconds', () => {
    const secs: number[] = []
    for (let n = V4_FIRST; n <= V4_LAST; n++) {
      const s = baitblSeconds(line(n))
      if (s !== null) secs.push(s)
    }
    expect(secs, 'the fourteen V4 send-off entries in index order').toEqual([
      1, 1, 1, 1, 1, 1, 3, 5, 7, 15, 15, 30, 45, 60,
    ])
    // The first live row carries the V4 banner and the seventh is labelled PATCH7.
    expect(line(V4_FIRST)).toContain('A FASTER SEND OFF OF BAITERS (V4)')
    expect(line(V4_FIRST + 1)).toContain('THIS IS PATCH7')
  })

  it('the RV3 original rows are ******** comments and re-derive to [1, 3, 5, 7, 15×7, 30, 45, 60]', () => {
    const secs: number[] = []
    for (let n = RV3_FIRST; n <= RV3_LAST; n++) {
      const raw = line(n)
      expect(raw.startsWith('********'), `RV3 row :${n} is preserved as ******** provenance`).toBe(true)
      const s = baitblSeconds(raw)
      if (s !== null) secs.push(s)
    }
    expect(secs, 'the RV3 original schedule, kept behind ******** so classic green is recoverable').toEqual([
      1, 3, 5, 7, 15, 15, 15, 15, 15, 15, 15, 30, 45, 60,
    ])
    expect(line(RV3_FIRST), 'the RV3 banner').toContain('MAKE THE BAITER MORE FIERCE')
  })

  it('THE COLLAPSE: RV3 has seven 15 s rows, V4 has two; RV3 one 1 s row, V4 six', () => {
    const rv3: number[] = []
    const v4: number[] = []
    for (let n = RV3_FIRST; n <= RV3_LAST; n++) {
      const s = baitblSeconds(line(n))
      if (s !== null) rv3.push(s)
    }
    for (let n = V4_FIRST; n <= V4_LAST; n++) {
      const s = baitblSeconds(line(n))
      if (s !== null) v4.push(s)
    }
    expect(rv3.filter((x) => x === 15).length, 'RV3: seven 15 s rows').toBe(7)
    expect(v4.filter((x) => x === 15).length, 'V4: two 15 s rows').toBe(2)
    expect(rv3.filter((x) => x === 1).length, 'RV3: one 1 s row').toBe(1)
    expect(v4.filter((x) => x === 1).length, 'V4: six 1 s rows').toBe(6)
  })

  it('the module BAITBL_SECONDS_V4 / _RV3 equal the re-derived rows, and napTicks matches', async () => {
    const b = await loadBaiter()
    const v4: number[] = []
    const rv3: number[] = []
    for (let n = V4_FIRST; n <= V4_LAST; n++) {
      const s = baitblSeconds(line(n))
      if (s !== null) v4.push(s)
    }
    for (let n = RV3_FIRST; n <= RV3_LAST; n++) {
      const s = baitblSeconds(line(n))
      if (s !== null) rv3.push(s)
    }
    expect([...b.BAITBL_SECONDS_V4]).toEqual(v4)
    expect([...b.BAITBL_SECONDS_RV3]).toEqual(rv3)
    // napTicks is the assembler's integer SECONDS*60/8.
    for (const s of v4) expect(b.napTicks(s)).toBe(Math.floor((s * 60) / 8))
  })

  it('PATCH7 documents the collapse: "MAKE BAITERS COME OUT MORE QUICKLY", VERSION 4 (JOUSTRV4.SRC:6313-6317)', () => {
    // The header of the 7th patch spells the intent and the marketing timings.
    expect(line(6313)).toContain('MAKE BAITERS COME OUT MORE QUICKLY')
    expect(line(6313)).toContain('4 MIN')
    expect(line(6314)).toContain('2 MIN 16 SEC')
    expect(line(6317)).toMatch(/PATCH7\s+EQU\s+\*/)
    expect(line(6317)).toContain('NO CODE MODIFIED, JUST A TABLE')
  })

  it('the BAISBL wave-start offsets re-derive to [10, 11, 12] via (BWAVn-BAITBL-2)/2 (JOUSTRV4.SRC:2167-2169)', () => {
    // Independently: the word index of each BWAVn label among the 14 V4 rows, minus 1,
    // is the BAISBL start index — exactly the source's (BWAVn-BAITBL-2)/2 in words.
    const labels: Array<{ label: string; word: number }> = []
    let word = 0
    for (let n = V4_FIRST; n <= V4_LAST; n++) {
      const m = line(n).match(/^(\S*)\s+FDB\s+\d+\*60\/8/)
      if (!m) continue
      if (m[1]) labels.push({ label: m[1], word })
      word++
    }
    const idxOf = (lab: string) => labels.find((l) => l.label === lab)!.word - 1
    expect(idxOf('BWAVN'), 'wave-N start index').toBe(10)
    expect(idxOf('BWAV2'), 'wave-2 start index').toBe(11)
    expect(idxOf('BWAV1'), 'wave-1 start index').toBe(12)
    // The BAISBL table itself spells the same three offsets.
    expect(line(2167)).toMatch(/BAISBL\s+FCB\s+\(BWAVN-BAITBL-2\)\/2/)
    expect(line(2168)).toMatch(/FCB\s+\(BWAV2-BAITBL-2\)\/2/)
    expect(line(2169)).toMatch(/FCB\s+\(BWAV1-BAITBL-2\)\/2/)
  })

  it('the module BAISBL equals the re-derived offsets', async () => {
    const b = await loadBaiter()
    expect([...b.BAISBL]).toEqual([10, 11, 12])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 source — the six PCHASE-gated patches (header :6268) and their displaced
// (RESTORE OLD INSTRUCTION) provenance. Each gates on TST PCHASE,U / BEQ.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('AC-2 source — the six PCHASE-gated anti-farming patches (JOUSTRV4.SRC:6268-6360)', () => {
  it('the block header names its purpose: PATCHES TO PREVENT PLAYER FROM PTERODACTYL HUNTING', () => {
    expect(line(6268)).toContain('PATCHES TO PREVENT PLAYER FROM PTERODACTYL HUNTING')
  })

  it('every code patch gates on TST PCHASE,U — NON-BAITERS are exempt', () => {
    // Each of the five code patches opens with the same gate and a "not for non-baiters" note.
    for (const n of [6296, 6307, 6327, 6345, 6357]) {
      expect(line(n), `PATCH gate at :${n}`).toMatch(/TST\s+PCHASE,U/)
    }
    expect(line(6296)).toContain('NON-BAITERS IGNORE THIS') // PATCH9
    expect(line(6307)).toContain('THIS ONLY APPLIES TO BAITERS') // PATCH8
    expect(line(6327)).toContain('ONLY FOR BAITERS') // PATCH6
    expect(line(6345)).toContain('DOES NOT PERTAIN TO NON-BAITERS') // PATCH5
    expect(line(6357)).toContain('NOT USED ON NON-BAITERS') // PATCH4
  })

  it('PATCH4 aim-lower: ADDB #2 "JUST LOWER THE ATTACK WINDOW BY 2 PIXELS", displaced STB PRDIR,U kept', () => {
    // :6359 ADDB #2 / :6360 10$ STB PRDIR,U … (RESTORE OLD INSTRUCTION)
    expect(evalOperand(operandOf(6359, 'ADDB'))).toBe(2)
    expect(line(6359)).toContain('LOWER THE ATTACK WINDOW BY 2 PIXELS')
    expect(line(6360)).toMatch(/STB\s+PRDIR,U/)
    expect(line(6360), 'the displaced pre-patch instruction is kept inline').toContain('RESTORE OLD INSTRUCTION')
  })

  it('PATCH5 slow-dive: ASR/ROR twice = signed VY ÷ 4, displaced STA PEGG,U kept', () => {
    // :6344 PATCH5 STA PEGG,U  RESTORE OLD INSTRUCTION / :6347-6350 ASR PVELY / ROR PVELY ×2.
    expect(line(6344)).toMatch(/PATCH5\s+STA\s+PEGG,U/)
    expect(line(6344)).toContain('RESTORE OLD INSTRUCTION')
    expect(line(6347)).toMatch(/ASR\s+PVELY\+0,U/)
    expect(line(6348)).toMatch(/ROR\s+PVELY\+1,U/)
    expect(line(6349)).toMatch(/ASR\s+PVELY\+0,U/)
    expect(line(6350)).toMatch(/ROR\s+PVELY\+1,U/)
    expect(line(6340)).toContain("SLOW DOWN 'Y' VELOCITY")
  })

  it('PATCH6 lane-reroute: LDA #$88 "NEW LINE TO TRACK FOR LOWER CLIFFS", displaced 2 instructions kept', () => {
    // :6323 PATCH6 BLO 10$ … (RESTORE OLD 2 INSTRUCTIONS) / :6334 20$ LDA #$88.
    expect(line(6323)).toContain('RESTORE OLD 2 INSTRUCTIONS')
    expect(evalOperand(operandOf(6334, 'LDA'))).toBe(0x88)
    expect(line(6334)).toContain('NEW LINE TO TRACK FOR LOWER CLIFFS')
    // The non-baiter fall-through tracks AOFFL2-2 (line 2), the plain target.
    expect(line(6337)).toMatch(/LDA\s+#AOFFL2-2/)
  })

  it('PATCH8 first-pass-miss: LDA #138 "DELAY TILL PTERODACTYL IS 1/2 WAY", displaced STA PPVELX,U kept', () => {
    // :6309 LDA #138 / :6310 10$ STA PPVELX,U (RESTORE OLD INSTRUCTION)
    expect(evalOperand(operandOf(6309, 'LDA'))).toBe(138)
    expect(line(6309)).toContain('DELAY TILL PTERODACTYL IS 1/2 WAY ACROSS SCREEN')
    expect(line(6310)).toMatch(/STA\s+PPVELX,U/)
    expect(line(6310)).toContain('RESTORE OLD INSTRUCTION')
  })

  it('PATCH9 seek-timer: DEC PPVELX,U saturating at 1 (DEC / BNE / INC), "ACCOUNT FOR ITSELF DURING ATTACKS"', () => {
    // :6294 header / :6296 TST PCHASE / :6298 DEC PPVELX / :6299 BNE / :6300 INC PPVELX.
    expect(line(6294)).toContain('ACCOUNT FOR ITSELF DURING ATTACKS')
    expect(line(6298)).toMatch(/DEC\s+PPVELX,U/)
    expect(line(6299)).toMatch(/BNE/)
    expect(line(6300)).toMatch(/INC\s+PPVELX,U/)
    expect(line(6299), 'saturate it at 1').toContain('SATURATE')
  })

  it('the module patch effects match the re-derived operands, gated both ways', async () => {
    const b = await loadBaiter()
    // aim-lower = +ADDB operand; slow-dive = ÷2^2; first-pass = LDA #138; lane = #$88.
    expect(b.AIM_LOWER_PIXELS).toBe(evalOperand(operandOf(6359, 'ADDB')))
    expect(b.FIRST_PASS_DELAY).toBe(evalOperand(operandOf(6309, 'LDA')))
    expect(b.LANE_LOWER).toBe(evalOperand(operandOf(6334, 'LDA')))
    // Both ways: fires for a baiter, no-op for a plain ptero.
    expect(b.patchAimLower(-1, 8)).toBe(10)
    expect(b.patchAimLower(0, 8)).toBe(8)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — THE SEAM CLOSES vs jt2-2. The RV3 15-second baiter cadence (napTicks(15)=112)
//        IS the 15-second WSMART growth interval (INTEL_GROWTH_NAPS=112, ×8 = 896
//        frames — the IFN DEBUG budget invariant, kept green as an oracle).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 — the baiter schedule and the jt2-2 budget growth share the 15 s / 896-frame interval', () => {
  it('the budget invariant still holds as an oracle: INTEL_GROWTH_FRAMES = 112 × 8 = 896', async () => {
    // This runs everywhere (enemy.ts is already built) — the jt2-2 invariant is unchanged
    // by jt3-5; the demo.test.ts frame-896 pin stays the free oracle.
    const e = await loadEnemy()
    expect(e.INTEL_GROWTH_NAPS, '15 s = 112 naps').toBe(112)
    expect(e.INTEL_GROWTH_NAP_FRAMES).toBe(8)
    expect(e.INTEL_GROWTH_FRAMES, 'the unchanged 896-frame budget cadence').toBe(896)
  })

  it('napTicks(15) equals the budget growth naps (112) — the same 15 s, so the seam is one interval', async () => {
    const b = await loadBaiter()
    const e = await loadEnemy()
    expect(b.napTicks(15), 'the RV3 15 s baiter cadence in nap-ticks').toBe(e.INTEL_GROWTH_NAPS)
    expect(b.napTicks(15) * b.NAP_FRAMES, 'and in frames = the 896-frame budget interval').toBe(
      e.INTEL_GROWTH_FRAMES,
    )
    // The V4 collapse to 1 s decouples baiter appearance (7 ticks) from the unchanged budget.
    expect(b.napTicks(1) * b.NAP_FRAMES, 'V4 baiters now appear in ~56 frames, not 896').toBe(56)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PROVENANCE IN THE PORT — the ******** RV3 schedule + the PCHASE gate must survive
// into src/core/baiter.ts. Reading the src TEXT is not the double-entry violation
// (that is IMPORTING joust-source from src/); the VALUES are re-derived above.
// ─────────────────────────────────────────────────────────────────────────────
describe('the RV3 ******** provenance + the PCHASE gate survive into the port', () => {
  it('src/core/baiter.ts exists (GREEN creates it)', () => {
    expect(existsSync(baiterSrc), 'GREEN (Julia) creates joust/src/core/baiter.ts').toBe(true)
  })

  it('baiter.ts documents BAITBL, the V4 collapse, the ******** RV3 provenance, and the PCHASE gate', () => {
    if (!existsSync(baiterSrc)) return // the existence rail above owns the red
    const text = readFileSync(baiterSrc, 'utf8')
    expect(text, 'the schedule table is named').toMatch(/BAITBL/)
    expect(text, 'the V4 rewrite is called out').toMatch(/V4/)
    expect(text, 'the RV3 ******** provenance marker survives (classic green recoverable)').toContain('********')
    expect(text, 'the PCHASE gate is named').toMatch(/PCHASE/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CLAIM COVERAGE (AC "claims entries; citations suite green"). Runs EVERYWHERE —
// reads the committed claims/, not the vendored tree.
// ─────────────────────────────────────────────────────────────────────────────
describe('each baiter law is pinned by a claims/*.json entry', () => {
  // (file, start, end) ranges every jt3-5 law must be cited within.
  const REQUIRED: ReadonlyArray<readonly [string, number, number]> = [
    ['JOUSTRV4.SRC', 2108, 2109], //   the 3-live cap (CMPA #3-1 / BHI)
    ['JOUSTRV4.SRC', 2112, 2113], //   PCHASE = −1 baiter tag
    ['JOUSTRV4.SRC', 2096, 2096], //   EMYOK PCNAP 8 (the /8 nap length)
    ['JOUSTRV4.SRC', 2150, 2163], //   the V4 live BAITBL schedule
    ['JOUSTRV4.SRC', 2135, 2148], //   the RV3 ******** original (provenance)
    ['JOUSTRV4.SRC', 2167, 2169], //   the BAISBL wave-start offsets
    ['JOUSTRV4.SRC', 6268, 6268], //   the anti-farming patch block header
    ['JOUSTRV4.SRC', 6294, 6302], //   PATCH9 seek-timer (account-for-itself)
    ['JOUSTRV4.SRC', 6304, 6311], //   PATCH8 first-pass-miss (LDA #138)
    ['JOUSTRV4.SRC', 6313, 6317], //   PATCH7 the schedule collapse (15s→1s)
    ['JOUSTRV4.SRC', 6319, 6338], //   PATCH6 lane-reroute (LDA #$88)
    ['JOUSTRV4.SRC', 6340, 6351], //   PATCH5 slow-dive (ASR/ROR ×2)
    ['JOUSTRV4.SRC', 6353, 6360], //   PATCH4 aim-lower (ADDB #2)
  ]

  it('loads a non-empty claims set (the guard must have teeth)', () => {
    expect(loadClaims().length).toBeGreaterThan(0)
  })

  it('every jt3-5 baiter law has a committed claim in its cited range', () => {
    const claims = loadClaims()
    for (const [file, start, end] of REQUIRED) {
      expect(
        claimCovers(claims, file, start, end),
        `no committed claim pins ${file}:${start}-${end} — add a JT35-* claim to ` +
          `docs/rom-study/claims/baiter.json`,
      ).toBe(true)
    }
  })

  it('jt3-5 added its own JT35-* claims, each naming its own FILE:LINE in its text', () => {
    const jt35 = loadClaims().filter((c) => /^JT35-\d+$/.test(c.id ?? ''))
    expect(jt35.length, 'jt3-5 must add JT35-* claims (one per required law, floor 13)').toBeGreaterThanOrEqual(13)
    // The jt1-8 lesson: never a bare `:N` — each claim names its fully-qualified FILE:LINE.
    const bare = jt35.filter((c) => !/[A-Z0-9]+\.SRC:\d+/.test(c.claim ?? ''))
    expect(bare.map((c) => c.id), 'these JT35 claims do not name their own source line').toEqual([])
  })

  it('the V4 15s→1s collapse is pinned by a jt3-5 claim on the PATCH7 table (JOUSTRV4.SRC:2150-2163)', () => {
    // The collapse is the crux of AC-1: a JT35 claim must pin a V4 row (jt1-8's qualified
    // JT8-015 already sits on :2150, so this demands jt3-5's OWN citation of the schedule).
    expect(jt35Covers(loadClaims(), 'JOUSTRV4.SRC', 2150, 2163)).toBe(true)
  })

  it('the RV3 ******** provenance is pinned by a jt3-5 claim (JOUSTRV4.SRC:2135-2148)', () => {
    expect(jt35Covers(loadClaims(), 'JOUSTRV4.SRC', 2135, 2148)).toBe(true)
  })

  it('every claim id is unique (JT35 does not collide with JT34/JT33/JT31/…)', () => {
    const ids = loadClaims()
      .map((c) => c.id)
      .filter((id): id is string => typeof id === 'string')
    expect(new Set(ids).size, 'duplicate claim ids').toBe(ids.length)
  })
})
