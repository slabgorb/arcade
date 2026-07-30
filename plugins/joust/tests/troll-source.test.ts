// tests/troll-source.test.ts
//
// Story jt3-3 — RED phase (Leeloo / TEA). The PROVENANCE + SOURCE-RE-DERIVATION
// companion to tests/troll.test.ts. The behaviour suite encodes the troll laws;
// this one RE-DERIVES their constants straight out of the vendored 1982 source
// with the INDEPENDENT reader (tests/helpers/joust-source.ts, which nothing under
// src/ may import — the jt1-3 double-entry), proves the RV4 PATCH block preserves
// its displaced instructions as ******** provenance, and pins the claims.
//
// ─── THE DOUBLE-ENTRY (the jt1-3 tautology trap) ─────────────────────────────
// Dev transcribes the constants into src/core/troll.ts one way; this file reads
// them out of the vendored tree another way (a raw-line reader Dev never imports),
// and the gate is that the two agree. A derivation that re-bakes its own
// misreadings cannot pass a reader it did not write.
//
// ─── DEGRADATION (the CI path) ───────────────────────────────────────────────
// CI clones only the joust subrepo and has no vendored tree, so every source
// re-derivation SKIPS there (describe.skipIf(!vendoredAvailable)); the claim-
// coverage checks read the committed claims/ and run EVERYWHERE. Every vendored
// read lives INSIDE an it() body (the tp1-8 collection trap).

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vendoredAvailable, sourceLines, evalOperand } from './helpers/joust-source.js'
import { loadTroll } from './helpers/troll-contract.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const claimsDir = join(repoRoot, 'docs', 'rom-study', 'claims')
const trollSrc = join(repoRoot, 'src', 'core', 'troll.ts')

// ─────────────────────────────────────────────────────────────────────────────
// Claims plumbing (the arena-destruction-source.test.ts pattern).
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

// Raw-line reader for INSTRUCTION lines (the joust-source reader parses only
// FCB/FDB). Pulls the operand off a `<label?> <OP> #<operand> …` line.
function line(n: number): string {
  return sourceLines('JOUSTRV4.SRC')[n - 1] ?? ''
}
function operandOf(n: number, op: string): string {
  const m = line(n).match(new RegExp(`\\b${op}\\s+#?(\\S+)`))
  if (!m) throw new Error(`no ${op} operand on JOUSTRV4.SRC:${n} — got: ${JSON.stringify(line(n))}`)
  return m[1]
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — the spawn gate seeds: TBRIDGE=3, TTROLL=1, so the troll wave = 3+1 = 4.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('AC-1 source — the TTROLL/TBRIDGE spawn seeds re-derive (JOUSTRV4.SRC:954-957)', () => {
  it('TBRIDGE is seeded 3 and TTROLL 1 — the troll comes out ONE wave after the bridge burns', () => {
    // :954 LDA #3 / :955 STA TBRIDGE ; :956 LDA #1 / :957 STA TTROLL
    expect(evalOperand(operandOf(954, 'LDA'))).toBe(3)
    expect(line(955)).toMatch(/STA\s+TBRIDGE/)
    expect(evalOperand(operandOf(956, 'LDA'))).toBe(1)
    expect(line(957)).toMatch(/STA\s+TTROLL/)
    expect(line(956), 'the comment states the +1-wave delay').toContain('AFTER BRIDGE DESTROY')
  })

  it('the module agrees: BRIDGE_WAVE=3, TROLL_DELAY=1, TROLL_WAVE=4', async () => {
    const t = await loadTroll()
    expect(t.BRIDGE_WAVE).toBe(3)
    expect(t.TROLL_DELAY).toBe(1)
    expect(t.TROLL_WAVE, 'TTROLL = TBRIDGE + 1 = wave 4').toBe(t.BRIDGE_WAVE + t.TROLL_DELAY)
    expect(t.TROLL_WAVE).toBe(4)
  })

  it('LNDB7 gates the grab on TTROLL and caps live trolls on LAVNBR (JOUSTRV4.SRC:6765-6767)', () => {
    expect(line(6764), 'LNDB7 is the lava-troll landing dispatch').toMatch(/LNDB7/)
    expect(line(6765)).toMatch(/LDA\s+TTROLL/)
    expect(line(6765)).toContain('LAVA TROLL ACTIVE?')
    expect(line(6767)).toMatch(/LDA\s+LAVNBR/)
    expect(line(6767)).toContain('TOO MANY LAVA TROLLS?')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — the grip: PADGRA→ADDLAV, the -$0180 break-free threshold, the $50 escape.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('AC-2 source — PADGRA→ADDLAV grip + break-free + escape (JOUSTRV4.SRC:1651-1652,6616-6617,6666-6670)', () => {
  it('the grip repoints the victim gravity to ADDLAV (LDX #ADDLAV / STX PADGRA,U)', () => {
    expect(line(1651)).toMatch(/LDX\s+#ADDLAV/)
    expect(line(1652)).toMatch(/STX\s+PADGRA,U/)
  })

  it('the module names the routines it swaps between', async () => {
    const t = await loadTroll()
    expect(t.GRIP_ROUTINE, 'the grip gravity routine').toBe('ADDLAV')
    expect(t.NORMAL_ROUTINE, 'the routine it replaces / restores').toBe('ADDGRA')
  })

  it('break-free threshold re-derives to -$0180 (a SIGNED compare, BLT)', () => {
    // :6616 CMPD #-$0180  (BREAK FREE VELOCITY?) / :6617 BLT ADLFRE
    expect(evalOperand(operandOf(6616, 'CMPD'))).toBe(-0x180)
    expect(-0x180, 'sanity: -$0180 is -384 decimal').toBe(-384)
    expect(line(6616)).toContain('BREAK FREE VELOCITY?')
    expect(line(6617), 'signed less-than to the free path').toMatch(/BLT\s+ADLFRE/)
  })

  it('the module BREAK_FREE_VY equals the re-derived threshold', async () => {
    const t = await loadTroll()
    expect(t.BREAK_FREE_VY).toBe(evalOperand(operandOf(6616, 'CMPD')))
    expect(t.BREAK_FREE_VY).toBe(-0x180)
  })

  it('ADDLAV adds the troll pull BEFORE the break-free check — the sustain lever', () => {
    // :6612 ADDD CLVGRA (the pull) ; :6614 ADDD PVELY ; :6615 STD PVELY ; then :6616 the compare.
    // The pull is folded into VY before the -$0180 test, so a single-frame raw spike
    // to the threshold does not clear it (the behaviour suite exercises this).
    expect(line(6612)).toMatch(/ADDD\s+CLVGRA/)
    expect(line(6614)).toMatch(/ADDD\s+PVELY/)
    expect(line(6616)).toMatch(/CMPD\s+#-\$0180/)
  })

  it('a clean escape scores $50 via SCRTEN — 50 points BCD, the verify-in-emulation caveat', () => {
    // :6668 LDA #$50  (SCORE 50 POINTS FOR BREAKING FREE) / :6670 JSR SCRTEN
    // $50 is the RAW byte (=80 decimal); SCRTEN reads it as a BCD tens value (DAA),
    // so the AWARDED score is 50 — misreading the "backwards" convention would give
    // 500 (open-questions §4, ruling C). The test asserts 50; the caveat lives in the
    // claim, and NOTHING here gates on an emulator.
    expect(evalOperand(operandOf(6668, 'LDA')), 'the RAW byte is $50 = 80').toBe(0x50)
    expect(0x50).toBe(80)
    expect(line(6668)).toContain('SCORE 50 POINTS')
    expect(line(6670)).toMatch(/JSR\s+SCRTEN/)
    // SCRTEN is a BCD routine — it decimal-adjusts (DAA), which is why $50 → 50.
    expect(sourceLines('JOUSTRV4.SRC').slice(7356, 7380).join('\n'), 'SCRTEN uses DAA (BCD)').toContain('DAA')
  })

  it('the module ESCAPE_SCORE is the DECODED 50, and its event carries reason "escape"', async () => {
    const t = await loadTroll()
    expect(t.ESCAPE_SCORE, 'the BCD-decoded award, not the raw $50/80').toBe(50)
    expect(t.escapeScoreEvent()).toEqual({ kind: 'score', value: 50, reason: 'escape' })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — the RV4 escalation: 30s grace, +1/frame to the $500 cap, ******** provenance.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('AC-3 source — the PATCH1/2/3 escalation block (JOUSTRV4.SRC:6374-6396)', () => {
  it('PATCH1 seeds a 30-second grace, traced as SECONDS*RATE not a magic 1800', () => {
    // :6393 LDD #30*60  (30 SECOND WAIT ...). VNAPTIM #1 renaps the patch process every
    // video frame (PATCH2 :6384-6385), so the timer decrements ONCE PER FRAME at the
    // 60 Hz field rate — 30 s × 60 frames/s = 1800 frames. The literal is 30*60, so the
    // frame math is on the wire, not assumed.
    const tok = operandOf(6393, 'LDD') // "30*60"
    expect(tok, 'the operand is written SECONDS*RATE').toBe('30*60')
    const [secs, rate] = tok.split('*').map((s) => parseInt(s, 10))
    expect(secs).toBe(30)
    expect(rate, 'the 60 Hz video field rate (VNAPTIM #1 renaps every frame)').toBe(60)
    expect(secs * rate).toBe(1800)
    expect(line(6393)).toContain('30 SECOND')
    // PATCH2 re-naps the patch process 1 frame at a time — so LAVKLL is a frame count.
    expect(line(6384)).toMatch(/LDA\s+#1/)
    expect(line(6385)).toMatch(/JMP\s+VNAPTIM/)
  })

  it('the module GRACE_FRAMES equals 30*60', async () => {
    const t = await loadTroll()
    expect(t.GRACE_FRAMES).toBe(30 * 60)
    expect(t.GRACE_FRAMES).toBe(1800)
  })

  it('PATCH2 grows the pull +1/frame after the grace, capped by CMPD #$500 / BHI', () => {
    // :6378 CMPD #$500 (MAXIMUM ...) / :6379 BHI 5$ / :6380 ADDD #1 / :6381 STD CLVGRA
    expect(evalOperand(operandOf(6378, 'CMPD'))).toBe(0x500)
    expect(line(6378)).toContain('MAXIMUM LAVA TROLL GRAVITY')
    expect(line(6379), 'unsigned-higher skips the increment above the cap').toMatch(/BHI/)
    expect(evalOperand(operandOf(6380, 'ADDD')), '+1 per frame').toBe(1)
    expect(line(6381)).toMatch(/STD\s+CLVGRA/)
  })

  it('the module PULL_CAP equals the re-derived $500', async () => {
    const t = await loadTroll()
    expect(t.PULL_CAP).toBe(evalOperand(operandOf(6378, 'CMPD')))
    expect(t.PULL_CAP).toBe(0x500)
  })

  it('PATCH1 preserves its displaced instruction as the OLD INSTRUCTION line', () => {
    // :6392 PATCH1 STD PPICH,Y  OLD INSTRUCTION — the pre-patch instruction the patch
    // header displaced, kept as the patch's first line (the RV4 convention).
    expect(line(6392)).toMatch(/PATCH1\s+STD\s+PPICH,Y/)
    expect(line(6392)).toContain('OLD INSTRUCTION')
  })

  it('PATCH3 preserves its displaced instruction as a ******** comment under the CLVGRA add', () => {
    // :6612 ADDD CLVGRA  PATCH3   (the live, patched instruction — variable gravity)
    // :6613 ******** ADDD LAVGRA  (the DISPLACED pre-patch instruction — constant gravity,
    //                              kept behind a ******** comment so "classic green" is recoverable)
    expect(line(6612)).toContain('PATCH3')
    expect(line(6613).startsWith('********'), 'the displaced instruction is ******** provenance').toBe(true)
    expect(line(6613)).toMatch(/ADDD\s+LAVGRA/)
    // PATCH3 itself needs no routine — the swap lives in ADDLAV.
    expect(line(6367)).toMatch(/PATCH3\s+EQU\s+\*/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PROVENANCE IN THE PORT — the ******** displaced instruction must survive into
// src/core/troll.ts (the architect's "classic green recoverable" ruling). Reading
// the src TEXT is not the double-entry violation (that is IMPORTING joust-source
// from src/); the VALUES are re-derived independently above.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 — the RV4 patch provenance survives into the port', () => {
  it('src/core/troll.ts exists (GREEN creates it)', () => {
    expect(existsSync(trollSrc), 'GREEN (Julia) creates joust/src/core/troll.ts').toBe(true)
  })

  it('troll.ts documents the PATCH3 swap AND its displaced pre-patch instruction', () => {
    if (!existsSync(trollSrc)) return // the existence rail above owns the red
    const text = readFileSync(trollSrc, 'utf8')
    // The live patched behaviour uses the variable CLVGRA…
    expect(text, 'the variable pull CLVGRA is named').toMatch(/CLVGRA/)
    // …and the DISPLACED constant-gravity instruction is preserved as provenance.
    expect(text, 'the displaced ADDD LAVGRA is kept as provenance').toMatch(/LAVGRA/)
    // The ******** RV4 provenance marker carries over so "classic green" stays recoverable.
    expect(text, 'the ******** RV4 provenance marker survives').toContain('********')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CLAIM COVERAGE (AC "all cited + claims entries; citations suite green"). Runs
// EVERYWHERE — reads the committed claims/, not the vendored tree.
// ─────────────────────────────────────────────────────────────────────────────
describe('each troll law is pinned by a claims/*.json entry', () => {
  // (file, start, end) ranges every jt3-3 law must be cited within.
  const REQUIRED: ReadonlyArray<readonly [string, number, number]> = [
    ['JOUSTRV4.SRC', 954, 957], //   TTROLL/TBRIDGE spawn seeds
    ['JOUSTRV4.SRC', 1651, 1652], // PADGRA → ADDLAV grip repoint
    ['JOUSTRV4.SRC', 6608, 6617], // ADDLAV + the -$0180 break-free threshold
    ['JOUSTRV4.SRC', 6666, 6670], // the $50 escape score via SCRTEN
    ['JOUSTRV4.SRC', 6374, 6396], // PATCH1/2/3 — grace + escalation + provenance
    ['JOUSTRV4.SRC', 6764, 6775], // LNDB7 spawn gate (TTROLL/LAVNBR)
    ['JOUSTRV4.SRC', 7357, 7364], // SCRTEN BCD (the "backwards" convention, the caveat)
  ]

  it('loads a non-empty claims set (the guard must have teeth)', () => {
    expect(loadClaims().length).toBeGreaterThan(0)
  })

  it('every jt3-3 troll law has a committed claim in its cited range', () => {
    const claims = loadClaims()
    for (const [file, start, end] of REQUIRED) {
      expect(
        claimCovers(claims, file, start, end),
        `no committed claim pins ${file}:${start}-${end} — add a JT33-* claim to ` +
          `docs/rom-study/claims/troll.json`,
      ).toBe(true)
    }
  })

  it('jt3-3 added its own JT33-* claims, each naming its own FILE:LINE in its text', () => {
    const jt33 = loadClaims().filter((c) => /^JT33-\d+$/.test(c.id ?? ''))
    expect(jt33.length, 'jt3-3 must add JT33-* claims').toBeGreaterThanOrEqual(12)
    // The jt1-8 lesson: never a bare `:N` — each claim names its fully-qualified
    // FILE:LINE in its prose.
    const bare = jt33.filter((c) => !/[A-Z0-9]+\.SRC:\d+/.test(c.claim ?? ''))
    expect(bare.map((c) => c.id), 'these JT33 claims do not name their own source line').toEqual([])
  })

  it('the PATCH3 ******** provenance is pinned by a claim on JOUSTRV4.SRC:6613', () => {
    // The displaced-instruction convention is a LAW here, not decoration: pin it.
    expect(claimCovers(loadClaims(), 'JOUSTRV4.SRC', 6613, 6613)).toBe(true)
  })

  it('every claim id is unique (JT33 does not collide with JT32/JT4/JT23/…)', () => {
    const ids = loadClaims()
      .map((c) => c.id)
      .filter((id): id is string => typeof id === 'string')
    expect(new Set(ids).size, 'duplicate claim ids').toBe(ids.length)
  })
})
