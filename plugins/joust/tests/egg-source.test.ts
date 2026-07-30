// tests/egg-source.test.ts
//
// Story jt2-4 — RED phase (O'Brien / TEA). The PROVENANCE companion to
// tests/egg.test.ts. The behaviour suite encodes the egg lifecycle laws; this
// one proves those laws are REAL in the vendored 1982 source and that each is
// pinned by a committed claim — AC-3's "…citations suite green".
//
// jt1-10 / jt2-3 double-entry pattern: the behaviour suite reads the law one way
// (as a test of the implementation); this file reads the SAME lines straight out
// of JOUSTRV4.SRC the other way. The vendored tree is gitignored, so the
// byte-reads SKIP on CI; the claim-coverage checks read the committed claims/
// and run everywhere.
//
// ─── THE FARTHER-EDGE CORRECTION (this file's teeth) ─────────────────────────
// AC-3 / epic law #7 say the hatched buzzard "flies in from the NEARER screen
// edge". That is jt1-10-class wrong prose. This suite byte-gates the branch that
// proves the OPPOSITE: an egg on the RIGHT side of screen (BHI EGGMRT) starts its
// buzzard at `#ELEFT+1` — the LEFT (FARTHER) edge — while an egg on the LEFT
// starts it at `#ERIGHT-1`. If a later hand "corrects" the port back to the
// nearer edge, the discriminator below goes red. See the TEA Assessment's
// Delivery Findings for the Conflict raised against AC-3 + epic law #7.
//
// Every vendored read lives inside an it() body (the tp1-8 collection trap).

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vendoredAvailable, sourceLines, bytesInRange } from './helpers/joust-source.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const claimsDir = join(repoRoot, 'docs', 'rom-study', 'claims')

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

/** The vendored line (1-based), whitespace-trimmed on the right. */
const line = (file: string, n: number): string => (sourceLines(file)[n - 1] ?? '').replace(/\s+$/, '')

// ─────────────────────────────────────────────────────────────────────────────
// SPAWN — the egg inherits the victim's velocities (DEATH3).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('spawn carries the victim velocities + resets bumps', () => {
  it('SAME VELOCITIES: PVELY then PVELX copied to the egg', () => {
    expect(line('JOUSTRV4.SRC', 2991)).toContain('LDD\tPVELY,U')
    expect(line('JOUSTRV4.SRC', 2991).toUpperCase()).toContain('SAME VELOCITIES')
    expect(line('JOUSTRV4.SRC', 2992)).toContain('STD\tPVELY,Y')
    expect(line('JOUSTRV4.SRC', 2993)).toContain('LDA\tPVELX,U')
    expect(line('JOUSTRV4.SRC', 2994)).toContain('STA\tPVELX,Y')
  })

  it('the bump registers are reset at spawn (CLR PBUMPX / PBUMPY)', () => {
    expect(line('JOUSTRV4.SRC', 2995)).toContain('CLR\tPBUMPX,Y')
    expect(line('JOUSTRV4.SRC', 2995).toUpperCase()).toContain('RESET BUMPAGE')
    expect(line('JOUSTRV4.SRC', 2996)).toContain('CLR\tPBUMPY,Y')
  })

  it('the egg sits X+4 and 8px above the enemy (ADDD #4 / SUBB #13-5)', () => {
    expect(line('JOUSTRV4.SRC', 2980)).toContain('SUBB\t#13-5')
    expect(line('JOUSTRV4.SRC', 2983)).toContain('ADDD\t#4')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PERMADEATH — PEGG=4, DEC per egg, hatch only while nonzero.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('PEGG: 4 eggs, then permadeath', () => {
  it('an enemy starts with 4 eggs before R.I.P.', () => {
    expect(line('JOUSTRV4.SRC', 2900)).toContain('#4')
    expect(line('JOUSTRV4.SRC', 2900).toUpperCase()).toContain('4 EGGS BEFORE ENEMY')
    expect(line('JOUSTRV4.SRC', 2901)).toContain('STA\tPEGG,Y')
  })

  it('each egg DECrements PEGG; BNE = you can get more eggs (else permadeath)', () => {
    expect(line('JOUSTRV4.SRC', 3001)).toContain('DEC\tPEGG,Y')
    expect(line('JOUSTRV4.SRC', 3002)).toContain('BNE')
    expect(line('JOUSTRV4.SRC', 3002).toUpperCase()).toContain('MORE EGGS')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// LEDGE PLACEMENT — EGLEDG cumulative, 69 slots, 8px apart (byte-derived).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('EGLEDG ledge table — 69 slots, 8px apart', () => {
  it('an egg is placed every 8th pixel (LDB #8 / MUL)', () => {
    expect(line('JOUSTRV4.SRC', 2871)).toContain('#8')
    expect(line('JOUSTRV4.SRC', 2871).toUpperCase()).toContain('EVERY 8TH PIXEL')
  })

  it('the EGLEDG cumulative counts byte-derive to [8,19,26,38,46,69] — 69 total slots', () => {
    // Independent re-read of the FCB `+`-expressions straight from the source.
    const egledg = bytesInRange('JOUSTRV4.SRC', 2910, 2915)
    expect(egledg, 'six cliff-tier running totals').toEqual([8, 19, 26, 38, 46, 69])
    expect(egledg[egledg.length - 1], 'the last tier total is the 69-slot maximum').toBe(69)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BOUNCE — X index decays 2, downward velY quarter-inverted.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('EGGBON bounce: X-index decay + quarter-invert velY', () => {
  it('the FLYX X index decays by 2 each way (ADDA #-2 / ADDA #2)', () => {
    expect(line('JOUSTRV4.SRC', 3204)).toContain('ADDA\t#-2')
    expect(line('JOUSTRV4.SRC', 3207)).toContain('ADDA\t#2')
  })

  it('velY keeps a QUARTER (ASRA/RORB twice = >>2) then INVERTS (COMA/NEGB/SBCA #-1)', () => {
    expect(line('JOUSTRV4.SRC', 3211)).toContain('ASRA')
    expect(line('JOUSTRV4.SRC', 3212)).toContain('RORB')
    expect(line('JOUSTRV4.SRC', 3213)).toContain('ASRA')
    expect(line('JOUSTRV4.SRC', 3214)).toContain('RORB')
    expect(line('JOUSTRV4.SRC', 3215)).toContain('COMA')
    expect(line('JOUSTRV4.SRC', 3217)).toContain('SBCA\t#-1')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SETTLE — the exact `CMPD #-$0020 / BLT` and `LDA PVELX / BNE` thresholds.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the settle thresholds are byte-exact', () => {
  it('settle needs velY no faster than $20 up (CMPD #-$0020 / BLT still-too-fast)', () => {
    expect(line('JOUSTRV4.SRC', 3219)).toContain('CMPD\t#-$0020')
    expect(line('JOUSTRV4.SRC', 3220)).toContain('BLT')
    expect(line('JOUSTRV4.SRC', 3220).toUpperCase()).toContain('TOO FAST TO LAND')
  })

  it('settle needs the X index to be exactly 0 (LDA PVELX / BNE still-too-fast)', () => {
    expect(line('JOUSTRV4.SRC', 3221)).toContain('LDA\tPVELX,U')
    expect(line('JOUSTRV4.SRC', 3222)).toContain('BNE')
    expect(line('JOUSTRV4.SRC', 3222).toUpperCase()).toContain('TOO FAST TO LAND')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE NARROW EGG WRAP — [4, 288], distinct from the entity band.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the egg wraps in the NARROW [4,288] band', () => {
  it('CMPD #288 / ADDD #4-288 is the "NEW WRAP AROUND STYLE (4 TO 288)"', () => {
    expect(line('JOUSTRV4.SRC', 3141)).toContain('CMPD\t#288')
    expect(line('JOUSTRV4.SRC', 3141).toUpperCase()).toContain('4 TO 288')
    expect(line('JOUSTRV4.SRC', 3143)).toContain('ADDD\t#4-288')
    expect(line('JOUSTRV4.SRC', 3144)).toContain('CMPD\t#4')
    expect(line('JOUSTRV4.SRC', 3146)).toContain('ADDD\t#288-4')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// VALUE LADDER — EGGVAL bytes + the 4-hit peg + the +500 air catch.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('EGGVAL value ladder (capped) + PFEET air catch', () => {
  it('the four EGGVAL bytes are $52/$05/$57/$10 (250/500/750/1000), pegged at 1,000', () => {
    expect(line('JOUSTRV4.SRC', 3097)).toContain('EGGVAL')
    expect(line('JOUSTRV4.SRC', 3097)).toContain('$52')
    expect(line('JOUSTRV4.SRC', 3097)).toContain('250')
    expect(line('JOUSTRV4.SRC', 3099)).toContain('$05')
    expect(line('JOUSTRV4.SRC', 3099)).toContain('500')
    expect(line('JOUSTRV4.SRC', 3101)).toContain('$57')
    expect(line('JOUSTRV4.SRC', 3101)).toContain('750')
    expect(line('JOUSTRV4.SRC', 3103)).toContain('$10')
    expect(line('JOUSTRV4.SRC', 3103).toUpperCase()).toContain('PEG AT 1,000')
  })

  it('the hit counter pegs at 4 (CMPB #4 THE MAGIC MAXIMUM NUMBER IS 4)', () => {
    expect(line('JOUSTRV4.SRC', 3043)).toContain('CMPB\t#4')
    expect(line('JOUSTRV4.SRC', 3043).toUpperCase()).toContain('MAXIMUM')
  })

  it('a mid-air catch (PFEET) scores an extra 500 via SCRHUN', () => {
    expect(line('JOUSTRV4.SRC', 3065)).toContain('LDA\tPFEET,Y')
    expect(line('JOUSTRV4.SRC', 3068)).toContain('#$05')
    expect(line('JOUSTRV4.SRC', 3068).toUpperCase()).toContain('SCORE 500 POINTS')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// HATCH — max speed, the FARTHER-edge branch, and the MOUNRI budget debit.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('EGGLND hatch: max speed, FARTHER edge, MOUNRI debit', () => {
  it('the buzzard flies in at MAX FLYX speed 8 (LDA #8 / STA PVELX AT MAXIMUM WARP SPEED)', () => {
    expect(line('JOUSTRV4.SRC', 3256)).toContain('#8')
    expect(line('JOUSTRV4.SRC', 3257)).toContain('STA\tPVELX,Y')
    expect(line('JOUSTRV4.SRC', 3257).toUpperCase()).toContain('MAXIMUM WARP SPEED')
  })

  it('the ENTRY EDGE is the FARTHER one — egg on the RIGHT (BHI) → the LEFT edge (#ELEFT+1)', () => {
    // The discriminator that corrects the "nearer edge" prose.
    expect(line('JOUSTRV4.SRC', 3272)).toContain('BHI\tEGGMRT')
    expect(line('JOUSTRV4.SRC', 3272).toUpperCase()).toContain('MAN ON RIGHT SIDE')
    // EGGMRT (the man-on-RIGHT branch) starts the bird at ELEFT+1 — the LEFT edge.
    expect(line('JOUSTRV4.SRC', 3278)).toContain('EGGMRT')
    expect(line('JOUSTRV4.SRC', 3278)).toContain('#ELEFT+1')
    // The fall-through (man on the LEFT) starts it at ERIGHT-1 — the RIGHT edge.
    expect(line('JOUSTRV4.SRC', 3275)).toContain('#ERIGHT-1')
  })

  it('the remount debits the budget exactly like a LINET promotion (MOUNRI INC NSMART, INC PCHASE)', () => {
    expect(line('JOUSTRV4.SRC', 3669)).toContain('MOUNRI')
    expect(line('JOUSTRV4.SRC', 3669)).toContain('INC\tNSMART')
    expect(line('JOUSTRV4.SRC', 3669).toUpperCase()).toContain('JUST GOT SMARTER')
    expect(line('JOUSTRV4.SRC', 3676)).toContain('INC\tPCHASE,U')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EVERY jt2-4 LAW IS PINNED BY A claims/*.json ENTRY (runs everywhere).
// ─────────────────────────────────────────────────────────────────────────────
const CITED_RANGES: ReadonlyArray<{ law: string; file: string; start: number; end: number }> = [
  { law: 'spawn carries victim velocities', file: 'JOUSTRV4.SRC', start: 2991, end: 2996 },
  { law: 'transfer + DEC eggs-left', file: 'JOUSTRV4.SRC', start: 2999, end: 3002 },
  { law: 'PEGG=4 (permadeath start)', file: 'JOUSTRV4.SRC', start: 2900, end: 2901 },
  { law: 'egg every 8th pixel', file: 'JOUSTRV4.SRC', start: 2871, end: 2871 },
  { law: 'EGLEDG cumulative ledge table', file: 'JOUSTRV4.SRC', start: 2910, end: 2915 },
  { law: 'narrow egg wrap [4,288]', file: 'JOUSTRV4.SRC', start: 3141, end: 3146 },
  { law: 'X-index decay 2/bounce', file: 'JOUSTRV4.SRC', start: 3204, end: 3207 },
  { law: 'velY quarter-invert', file: 'JOUSTRV4.SRC', start: 3211, end: 3217 },
  { law: 'settle velY threshold', file: 'JOUSTRV4.SRC', start: 3219, end: 3220 },
  { law: 'settle X-index=0 threshold', file: 'JOUSTRV4.SRC', start: 3222, end: 3222 },
  { law: 'EGGVAL value ladder', file: 'JOUSTRV4.SRC', start: 3097, end: 3104 },
  { law: 'hit-count peg at 4', file: 'JOUSTRV4.SRC', start: 3043, end: 3043 },
  { law: 'PFEET air catch check', file: 'JOUSTRV4.SRC', start: 3065, end: 3065 },
  { law: 'PFEET air catch +500', file: 'JOUSTRV4.SRC', start: 3068, end: 3068 },
  { law: 'hatch signals a fly-in buzzard', file: 'JOUSTRV4.SRC', start: 3245, end: 3245 },
  { law: 'hatch carries PEGG to the bird', file: 'JOUSTRV4.SRC', start: 3251, end: 3251 },
  { law: 'buzzard flies at max FLYX speed 8', file: 'JOUSTRV4.SRC', start: 3257, end: 3257 },
  { law: 'FARTHER-edge decision (BHI)', file: 'JOUSTRV4.SRC', start: 3272, end: 3272 },
  { law: 'man-on-left → RIGHT edge entry', file: 'JOUSTRV4.SRC', start: 3275, end: 3275 },
  { law: 'man-on-right → LEFT edge entry', file: 'JOUSTRV4.SRC', start: 3278, end: 3278 },
  { law: 'remount INC NSMART (budget debit)', file: 'JOUSTRV4.SRC', start: 3669, end: 3669 },
  { law: 'remount INC PCHASE (0→1)', file: 'JOUSTRV4.SRC', start: 3676, end: 3676 },
  { law: 'egg score-message overlays PPVELX', file: 'JOUSTRV4.SRC', start: 3036, end: 3036 },
  { law: 'egg score value overlays PRDIR', file: 'JOUSTRV4.SRC', start: 3054, end: 3054 },
]

/** Does some committed claim pin a line INSIDE this dossier citation range? */
function claimCovers(claims: Claim[], file: string, start: number, end: number): boolean {
  return claims.some(
    (c) => c.source?.file === file && c.source.line >= start && c.source.line <= end,
  )
}

describe('each jt2-4 egg law is pinned by a claims/*.json entry', () => {
  it('loads a non-empty claims set (the guard must have teeth)', () => {
    expect(loadClaims().length, 'docs/rom-study/claims/*.json must exist').toBeGreaterThan(0)
  })

  it.each(CITED_RANGES)('$law ($file:$start-$end) is covered by a claim', ({ file, start, end }) => {
    const claims = loadClaims()
    expect(
      claimCovers(claims, file, start, end),
      `no committed claim pins ${file}:${start}-${end} — AC-3 requires each egg law to be cited`,
    ).toBe(true)
  })

  it('jt2-4 added its own transcription claims (JT24-*)', () => {
    const jt24 = loadClaims().filter((c) => /^JT24-\d+$/.test(c.id ?? ''))
    expect(jt24.length, 'the new egg transcription claims are committed').toBeGreaterThan(0)
  })

  it('every claim id is still unique', () => {
    const ids = loadClaims().map((c) => c.id)
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect([...new Set(dupes)], 'duplicate claim ids').toEqual([])
  })
})
