// tests/ptero-source.test.ts
//
// Story jt3-4 — RED phase (Leeloo / TEA). The PROVENANCE + SOURCE-RE-DERIVATION
// companion to tests/ptero.test.ts. The behaviour suite encodes the ptero laws;
// this one RE-DERIVES their constants straight out of the vendored 1982 source
// with the INDEPENDENT reader (tests/helpers/joust-source.ts, which nothing under
// src/ may import — the jt1-3 double-entry), RE-DERIVES the 1000-point kill value
// through the SCRHUN chain (DVALUE $10 → thousands/hundreds BCD → 1000, NOT a magic
// literal), and pins the JT34-* claims.
//
// ─── THE DOUBLE-ENTRY (the jt1-3 tautology trap) ─────────────────────────────
// Dev transcribes the constants into src/core/ptero.ts one way; this file reads
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
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vendoredAvailable, sourceLines, evalOperand, parseStatement } from './helpers/joust-source.js'
import { loadPtero } from './helpers/ptero-contract.js'
import { loadWave } from './helpers/wave-contract.js'
// jt9-2 swept this suite's local pre-hardening claims plumbing onto the shared
// loader jt8-3 extracted. Behaviour-preserving.
import { loadClaims, claimCovers } from './helpers/claims.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const pteroSrc = join(repoRoot, 'src', 'core', 'ptero.ts')

// ─────────────────────────────────────────────────────────────────────────────
// Claims plumbing (the troll-source.test.ts pattern).
// ─────────────────────────────────────────────────────────────────────────────

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
// Evaluate an `A-B` difference operand the joust-source reader leaves as a symbol
// (it handles `+` and negative literals but not binary subtraction). Both halves
// must be bare decimals — which is all the ptero window's fudges use (15-7, 15-5).
function evalDiff(tok: string): number {
  const [a, b] = tok.split('-')
  return parseInt(a, 10) - parseInt(b, 10)
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 source — FLYXP ±$0300 + "NO GRAVITY!" (the ADDGRX entry skips ADDB GRAV).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('AC-1 source — FLYXP ±$0300 + the ADDGRX gravity skip (JOUSTRV4.SRC:1506,1587-1595,6489-6494)', () => {
  it('the ptero flight loads FLYXP and the comment states "NO GRAVITY!"', () => {
    // :1506 LDX #FLYXP  ADD IN BUMPX,Y; AND VELX,Y; NO GRAVITY!
    expect(line(1506)).toMatch(/LDX\s+#FLYXP/)
    expect(line(1506), 'the load-bearing comment').toContain('NO GRAVITY!')
  })

  it('the ptero enters the integrator at ADDGRX — one instruction PAST the mount ADDB GRAV', () => {
    // :1508 JSR ADDGRX  — the ptero's per-frame position integrate.
    expect(line(1508)).toMatch(/JSR\s+ADDGRX/)
    // ADDGRA (the mount entry) ADDS the variable gravity to VY; ADDGRX is the label
    // ONE instruction past it, so a JSR to ADDGRX skips the gravity add entirely.
    expect(line(6489)).toMatch(/ADDGRA\s+ADDB\s+GRAV/)
    expect(line(6489), 'the mount adds gravity').toContain('VARIABLE GRAVITY')
    expect(line(6494)).toMatch(/ADDGRX\s+ADDD\s+PPOSY\+1,U/)
    expect(line(6494), 'ADDGRX begins at the position integrate, not the gravity add').toContain(
      'FRACTIONAL DISTANCE',
    )
  })

  it('FLYXP re-derives to the nine-rung ±$0300 ladder, zero in the middle', () => {
    // :1587-1595 the nine FDB words, FLYXP labelling the ZERO entry (the FLYX house
    // convention — the reader parses the labelled and unlabelled FDB lines alike).
    const words = []
    for (let n = 1587; n <= 1595; n++) {
      const st = parseStatement(line(n), n)
      if (st && st.op === 'FDB') words.push(evalOperand(st.operands[0]))
    }
    expect(words, 'the ptero X-velocity ladder in index order −8..+8').toEqual([
      -0x0300, -0x0180, -0x00c0, -0x0060, 0x0000, 0x0060, 0x00c0, 0x0180, 0x0300,
    ])
    expect(words[4], 'FLYXP labels the ZERO entry in the middle').toBe(0)
    expect(line(1591)).toMatch(/FLYXP\s+FDB\s+\$0000/)
  })

  it('the module PTERO_FLYX equals the re-derived ladder; PTERO_FLYX_MAX = $0300', async () => {
    const p = await loadPtero()
    expect(p.PTERO_FLYX).toEqual([
      -0x0300, -0x0180, -0x00c0, -0x0060, 0x0000, 0x0060, 0x00c0, 0x0180, 0x0300,
    ])
    expect(p.PTERO_FLYX_MAX).toBe(0x0300)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 source — the two-band lance-height kill window + the opposite/facing tests.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('AC-2 source — the lance-height window: two bands, opposite facings, facing-into (JOUSTRV4.SRC:4971-5002)', () => {
  it('the lance offset B = PLANTZ,U + PPOSY,U − PPOSY,X (WHOLE pixels)', () => {
    // :4971 LDB PLANTZ,U (LANTZ ON CORRECT LINE?) / :4972 ADDB PPOSY+1,U / :4973 SUBB PPOSY+1,X
    expect(line(4971)).toMatch(/LDB\s+PLANTZ,U/)
    expect(line(4971)).toContain('LANTZ ON CORRECT LINE')
    expect(line(4972)).toMatch(/ADDB\s+PPOSY\+1,U/)
    expect(line(4973)).toMatch(/SUBB\s+PPOSY\+1,X/)
  })

  it('the attacking-frame discriminant is CMPA #FLY2-FLY1 = 12 (the RMB-12 frame stride)', () => {
    // :4975 CMPA #FLY2-FLY1 (ATTACKING FRAME?) / :4976 BLS 13$ (NO WINGS DOWN FRAME).
    expect(operandOf(4975, 'CMPA')).toBe('FLY2-FLY1')
    expect(line(4975)).toContain('ATTACKING FRAME?')
    expect(line(4976)).toMatch(/BLS\s+13\$/)
    expect(line(4976)).toContain('WINGS DOWN')
    // FLY1/FLY2/FLY3 are consecutive RMB 12 buffers (:140-142), so FLY2-FLY1 = 12
    // and FLY3-FLY1 = 24 (the attacking frame). Re-derive the stride from the RMB.
    expect(line(140)).toMatch(/FLY1\s+RMB\s+12/)
    expect(line(141)).toMatch(/FLY2\s+RMB\s+12/)
    expect(operandOf(140, 'RMB'), 'the FLY1 buffer size == the FLY2-FLY1 stride').toBe('12')
    expect(parseInt(operandOf(140, 'RMB'), 10)).toBe(12)
  })

  it('the ATTACKING band re-derives to 8 ± 3 (SUBB #15-7 / CMPB #3, "WITHIN 7 PIXELS")', () => {
    // Fall-through (PIMAGE > FLY2-FLY1): :4978 SUBB #15-7 / :4979 BPL / :4980 NEGB (abs) /
    // :4981 CMPB #3 (WITHIN 7 PIXELS?) — then :4990 BHI OSTBO (out of band → no kill).
    expect(operandOf(4978, 'SUBB')).toBe('15-7')
    expect(evalDiff(operandOf(4978, 'SUBB')), 'the band centre: 15 − 7').toBe(8)
    expect(line(4978)).toContain('PTERO-MOUTH')
    expect(evalOperand(operandOf(4981, 'CMPB')), 'the tolerance: ±3').toBe(3)
    expect(line(4981)).toContain('WITHIN 7 PIXELS')
    // the abs step: NEGB when the difference is negative.
    expect(line(4980)).toMatch(/NEGB/)
  })

  it('the GLIDE band re-derives to 10 ± 2 (SUBB #15-5 / CMPB #2, "WITHIN 5 PIXELS")', () => {
    // 13$ (PIMAGE <= FLY2-FLY1): :4986 SUBB #15-5 / :4988 NEGB / :4989 CMPB #2 (WITHIN 5).
    expect(operandOf(4986, 'SUBB')).toBe('15-5')
    expect(evalDiff(operandOf(4986, 'SUBB')), 'the band centre: 15 − 5').toBe(10)
    expect(line(4986)).toContain('PTERO-MOUTH')
    expect(evalOperand(operandOf(4989, 'CMPB')), 'the tolerance: ±2').toBe(2)
    expect(line(4989)).toContain('WITHIN 5 PIXELS')
  })

  it('an out-of-band lance drops into the NORMAL joust OSTBO — "CANNOT KILL PTERODACTYL"', () => {
    // :4990 14$ BHI OSTBO (BR=NO, CANNOT KILL PTERODACTYL) — the shared band-fail exit.
    expect(line(4990)).toMatch(/BHI\s+OSTBO/)
    expect(line(4990)).toContain('CANNOT KILL PTERODACTYL')
    // OSTBO is the ordinary joust (the plantHeight compare) — the fallback target.
    expect(line(5002)).toMatch(/OSTBO\s+LDB\s+PLANTZ,U/)
  })

  it('OPPOSITE facings is required: EORA PFACE / BPL OSTBO', () => {
    // :4991 LDA PFACE,U (FACING IN OPPSITE DIRECTIONS?) / :4992 EORA PFACE,X / :4993 BPL OSTBO.
    // Same-sign facings EOR to a non-negative byte → BPL → OSTBO (no kill).
    expect(line(4991)).toMatch(/LDA\s+PFACE,U/)
    expect(line(4991)).toContain('OPPSITE DIRECTIONS') // (the ROM's own spelling)
    expect(line(4992)).toMatch(/EORA\s+PFACE,X/)
    expect(line(4993)).toMatch(/BPL\s+OSTBO/)
    expect(line(4993)).toContain('CANNOT KILL PTERODACTYL')
  })

  it('FACING INTO it is required: COLDX sign vs PFACE (both side branches → OSTBO on a miss)', () => {
    // :4994 LDD COLDX (FACING PTERODACTYL?) / :4995 BPL 12$ (ptero on the RIGHT).
    // COLDX = ptero.x − player.x: >=0 → ptero right (need PFACE right), <0 → left.
    expect(line(4994)).toMatch(/LDD\s+COLDX/)
    expect(line(4994)).toContain('FACING PTERODACTYL?')
    expect(line(4995)).toMatch(/BPL\s+12\$/)
    // ptero on the LEFT: :4996 LDA PFACE,U / :4997 BPL OSTBO (player faces right = away).
    expect(line(4996)).toContain('PTERODACTYL ON LEFT')
    expect(line(4997)).toMatch(/BPL\s+OSTBO/)
    // ptero on the RIGHT: :5000 LDA PFACE,U / :5001 BPL 11$ (player faces right = INTO → kill).
    expect(line(5000)).toContain('PTERODACTYL ON RIGHT')
    expect(line(5001)).toMatch(/BPL\s+11\$/)
    expect(line(5001)).toContain('KILLED PTERODACTYL')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 score source — the 1000-point kill is DERIVED: DVALUE $10 through SCRHUN
// (thousands/hundreds BCD), cross-checked against the P6DEC $15→1500 anchor.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('AC-2 score source — DVALUE $10 → SCRHUN → 1000 (DERIVED, ruling C caveat) (JOUSTRV4.SRC:5574-5577,7340-7348)', () => {
  // SCRHUN adds the DVALUE byte at the score's THOUSANDS-&-HUNDREDS position
  // (:7340-7342 header, :7348 ADDA 2,Y), so the byte is a BCD (thousands, hundreds)
  // digit pair: high nibble = thousands, low nibble = hundreds.
  const scrhun = (bcd: number): number => ((bcd >> 4) & 0xf) * 1000 + (bcd & 0xf) * 100

  it('SCRHUN is the THOUSANDS-&-HUNDREDS routine (NOT the "BACKWARDS" SCRTEN)', () => {
    expect(line(7340)).toContain('THOUSANDS AND HUNDREDS')
    expect(line(7342)).toContain('THOUSANDS & HUNDREDS BCD DIGIT')
    expect(line(7346)).toMatch(/SCRHUN\s+LDY\s+DSCORE/)
    expect(line(7348), 'adds the byte at the thousands/hundreds score position').toMatch(/ADDA\s+2,Y/)
    // The trap SCRHUN avoids: SCRTEN reads its byte "BACKWARDS" (tens & hundreds) —
    // the ptero uses SCRHUN, so $10 is a clean thousands/hundreds pair.
    expect(line(7353)).toContain('BACKWARDS')
  })

  it('the ANCHOR: P6DEC (shadow lord) DVALUE $15 via SCRHUN decodes to 1500 (matches joust.ts)', () => {
    // :5571 P6DEC's DVALUR is SCRHUN (4th FDB operand); :5573 FCB WHI*$11,$15,MSGAMO.
    const p6 = parseStatement(line(5571), 5571)!
    expect(p6.operands[3], 'P6DEC scores through SCRHUN').toBe('SCRHUN')
    const p6dvalue = parseStatement(line(5573), 5573)!
    expect(evalOperand(p6dvalue.operands[1]), 'the shadow-lord DVALUE byte is $15').toBe(0x15)
    expect(scrhun(0x15), '$15 = 1 thousand + 5 hundreds = 1500 — the existing killScore anchor').toBe(1500)
  })

  it('the PTERO: P7DEC DVALUE $10 via SCRHUN decodes to 1000', () => {
    // :5575 P7DEC's DVALUR is SCRHUN (4th FDB operand); :5577 FCB WHI*$11,$10,MSGAMO.
    const p7 = parseStatement(line(5575), 5575)!
    expect(p7.operands[3], 'the ptero scores through SCRHUN').toBe('SCRHUN')
    const p7dvalue = parseStatement(line(5577), 5577)!
    expect(evalOperand(p7dvalue.operands[1]), 'the ptero DVALUE byte is $10').toBe(0x10)
    expect(scrhun(0x10), '$10 = 1 thousand + 0 hundreds = 1000 (DERIVED, not stated)').toBe(1000)
  })

  it('the module PTERO_SCORE is the DERIVED 1000, and its event carries reason "kill"', async () => {
    const p = await loadPtero()
    expect(p.PTERO_SCORE, 'the SCRHUN-decoded value, not a magic literal').toBe(scrhun(0x10))
    expect(p.PTERO_SCORE).toBe(1000)
    expect(p.pteroScoreEvent()).toEqual({ kind: 'score', value: 1000, reason: 'kill' })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 source — the ptero WAVE TYPE (WJSRTB index 5) + the WPTEN ptero nibble.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('AC-3 source — WJSRTB WPTERO (index 5) + the WPTEN ptero nibble (JOUSTRV4.SRC:179,2586-2591,2614-2615)', () => {
  it('WPTERO is the SIXTH WJSRTB entry (dispatch index 5)', () => {
    // :2586 WJSRTB FDB WAVRTS … :2591 FDB WPTERO — six entries, ptero last (index 5).
    const entries = []
    for (let n = 2586; n <= 2591; n++) {
      const st = parseStatement(line(n), n)
      if (st && st.op === 'FDB') entries.push(st.operands[0])
    }
    expect(entries, 'the six WJSRTB routines in order').toEqual([
      'WAVRTS',
      'WINTRO',
      'WCOOP',
      'WGLAD',
      'WAVEGG',
      'WPTERO',
    ])
    expect(entries[5], 'the ptero wave type is index 5').toBe('WPTERO')
    expect(line(2591)).toContain('PTERODACTYL WAVE')
  })

  it("jt2-5's WAVE_TYPES already routes index 5 to 'ptero'", async () => {
    const w = await loadWave()
    expect(w.WAVE_TYPES[5]).toBe('ptero')
  })

  it('WPTERO reads WPTEN — the wave row byte "NBR OF PTERODACTYLS IN THIS WAVE"', () => {
    // :179 WPTEN RMB 1  NBR OF PTERODACTYLS IN THIS WAVE (byte 2 of the 4-byte row).
    expect(line(179)).toMatch(/WPTEN\s+RMB\s+1/)
    expect(line(179)).toContain('NBR OF PTERODACTYLS')
    // :2614 LDA WPTEN,X (GET NBR OF PTERODCTYLS) / :2615 STA PJOYT,Y (NUMBER TO CREATE).
    expect(line(2614)).toMatch(/LDA\s+WPTEN,X/)
    expect(line(2614)).toContain('NBR OF PTERODCTYLS') // (the ROM's own spelling)
    expect(line(2615)).toContain('NUMBER OF PTERODACTYLS TO CREATE')
  })

  it('the module spawns the nibble on a ptero-type status, 0 otherwise', async () => {
    const p = await loadPtero()
    const both = { p1: true, p2: true }
    // (status & $0E) >> 1 == 5 ⟺ ptero type ⟺ (status & $0E) == $0A.
    expect(p.pteroWaveSpawnCount(0x0a, 2, both)).toBe(2)
    expect(p.pteroWaveSpawnCount(0x08, 2, both), 'egg type → no pteros').toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PROVENANCE IN THE PORT — the 1000-point value is DERIVED, so ptero.ts must
// carry the SCRHUN chain + the verify-in-emulation caveat (ruling C), not a bare
// magic 1000. Reading the src TEXT is not the double-entry violation (that is
// IMPORTING joust-source from src/); the VALUES are re-derived independently above.
// ─────────────────────────────────────────────────────────────────────────────
describe('the SCRHUN derivation + caveat survive into the port', () => {
  it('src/core/ptero.ts exists (GREEN creates it)', () => {
    expect(existsSync(pteroSrc), 'GREEN (Julia) creates joust/src/core/ptero.ts').toBe(true)
  })

  it('ptero.ts documents the DVALUE $10 → SCRHUN → 1000 chain AND the verify-in-emulation caveat', () => {
    if (!existsSync(pteroSrc)) return // the existence rail above owns the red
    const text = readFileSync(pteroSrc, 'utf8')
    expect(text, 'the derivation names SCRHUN').toMatch(/SCRHUN/)
    expect(text, 'and the DVALUE $10 byte it decodes').toMatch(/\$10|0x10/)
    // Ruling C: the caveat that 1000 is DERIVED and verified in emulation must ride
    // in the source, not be silently dropped.
    expect(text.toLowerCase(), 'the verify-in-emulation caveat is carried').toContain('emulation')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CLAIM COVERAGE (AC "claims entries; citations suite green"). Runs EVERYWHERE —
// reads the committed claims/, not the vendored tree.
// ─────────────────────────────────────────────────────────────────────────────
describe('each ptero law is pinned by a claims/*.json entry', () => {
  // (file, start, end) ranges every jt3-4 law must be cited within.
  const REQUIRED: ReadonlyArray<readonly [string, number, number]> = [
    ['JOUSTRV4.SRC', 1506, 1506], //   "NO GRAVITY!" — the ptero flight comment
    ['JOUSTRV4.SRC', 1587, 1595], //   FLYXP ±$0300 ladder
    ['JOUSTRV4.SRC', 6489, 6494], //   ADDGRA vs ADDGRX — the gravity skip
    ['JOUSTRV4.SRC', 4971, 4973], //   the lance offset B = PLANTZ + playerY − pteroY
    ['JOUSTRV4.SRC', 4975, 4976], //   the attacking-frame discriminant (FLY2-FLY1)
    ['JOUSTRV4.SRC', 140, 142], //     FLY1/FLY2/FLY3 RMB 12 (the frame stride)
    ['JOUSTRV4.SRC', 4977, 4982], //   the attacking band 8 ± 3
    ['JOUSTRV4.SRC', 4984, 4990], //   the glide band 10 ± 2 + the OSTBO band-fail exit
    ['JOUSTRV4.SRC', 4991, 4993], //   opposite facings (EORA PFACE)
    ['JOUSTRV4.SRC', 4994, 5002], //   facing-into (COLDX) + the OSTBO fallback
    ['JOUSTRV4.SRC', 5574, 5577], //   P7DEC — the ptero DVALUE $10 + SCRHUN
    ['JOUSTRV4.SRC', 7340, 7348], //   SCRHUN thousands/hundreds decode
    ['JOUSTRV4.SRC', 2586, 2591], //   WJSRTB — the ptero wave type (index 5)
    ['JOUSTRV4.SRC', 179, 179], //     WPTEN — the ptero nibble
    ['JOUSTRV4.SRC', 2614, 2615], //   WPTERO reads WPTEN for the spawn count
  ]

  it('loads a non-empty claims set (the guard must have teeth)', () => {
    expect(loadClaims().length).toBeGreaterThan(0)
  })

  it('every jt3-4 ptero law has a committed claim in its cited range', () => {
    const claims = loadClaims()
    for (const [file, start, end] of REQUIRED) {
      expect(
        claimCovers(claims, file, start, end),
        `no committed claim pins ${file}:${start}-${end} — add a JT34-* claim to ` +
          `docs/rom-study/claims/ptero.json`,
      ).toBe(true)
    }
  })

  it('jt3-4 added its own JT34-* claims, each naming its own FILE:LINE in its text', () => {
    const jt34 = loadClaims().filter((c) => /^JT34-\d+$/.test(c.id ?? ''))
    expect(jt34.length, 'jt3-4 must add JT34-* claims').toBeGreaterThanOrEqual(14)
    // The jt1-8 lesson: never a bare `:N` — each claim names its fully-qualified
    // FILE:LINE in its prose.
    const bare = jt34.filter((c) => !/[A-Z0-9]+\.SRC:\d+/.test(c.claim ?? ''))
    expect(bare.map((c) => c.id), 'these JT34 claims do not name their own source line').toEqual([])
  })

  it('the DERIVED 1000-point value is pinned by a claim on the P7DEC DVALUE (JOUSTRV4.SRC:5577)', () => {
    // The scoring chain is the crux (ruling C): pin the DVALUE byte itself.
    expect(claimCovers(loadClaims(), 'JOUSTRV4.SRC', 5577, 5577)).toBe(true)
  })

  it('every claim id is unique (JT34 does not collide with JT33/JT32/JT25/…)', () => {
    const ids = loadClaims()
      .map((c) => c.id)
      .filter((id): id is string => typeof id === 'string')
    expect(new Set(ids).size, 'duplicate claim ids').toBe(ids.length)
  })
})
