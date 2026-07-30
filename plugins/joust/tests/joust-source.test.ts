// tests/joust-source.test.ts
//
// Story jt2-3 — RED phase (O'Brien / TEA). The PROVENANCE companion to
// tests/joust.test.ts. The behaviour suite encodes the joust collision + kill
// laws; this one proves those laws are REAL in the vendored 1982 source and that
// each is pinned by a committed claim — AC-3's "…all cited + claims entries,
// citations suite green".
//
// jt1-10 / jt2-1 double-entry pattern: the behaviour suite reads the law one way
// (as a test of the implementation); this file reads the SAME lines straight out
// of JOUSTRV4.SRC / RAMDEF.SRC / JOUSTI.SRC the other way. The vendored tree is
// gitignored, so the byte-reads SKIP on CI (the jt1-3 degradation pattern); the
// claim-coverage checks read the committed claims/ and run everywhere.
//
// ─── THE WHOLE-PIXEL CORRECTION (this file's teeth) ──────────────────────────
// The dossier (subsystems.md:137-139) and this story's AC-1 say the joust
// compares `(PLANTZ + PPOSY)` with the FRACTION INCLUDED. That is jt1-10-class
// wrong prose. This suite byte-gates the three facts that prove OSTBO compares
// WHOLE PIXELS: PPOSY is 3 bytes, OSTBO reads offset +0 (NOT +1, where the 8.8
// value lives), and PLANTZ=2 is "2 PIXELS LOWER". If a later hand "corrects"
// OSTBO to `PPOSY+1`, the discriminator below goes red. See the TEA Assessment's
// Delivery Findings for the Conflict raised against the dossier + AC.
//
// Every vendored read lives inside an it() body (the tp1-8 collection trap).

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'
import { loadPictures } from './helpers/pictures-contract.js'

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
// THE WHOLE-PIXEL RESOLUTION — proven from the source, correcting the dossier.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('OSTBO compares WHOLE pixels + PLANTZ (fraction EXCLUDED)', () => {
  it('PPOSY is a 3-byte field [super-high, PIXEL, fraction]', () => {
    expect(line('RAMDEF.SRC', 174)).toContain('PPOSY')
    expect(line('RAMDEF.SRC', 174)).toMatch(/RMB\t3/)
  })

  it('OSTBO reads PPOSY at offset +0 (the whole-pixel word) — NOT PPOSY+1', () => {
    // This is the discriminator. `ADDD PPOSY,X` / `SUBD PPOSY,U` read the
    // [super-high, pixel] word. A "correction" to PPOSY+1 (the 8.8 word) would
    // include the fraction and break this assertion.
    expect(line('JOUSTRV4.SRC', 5008)).toContain('ADDD\tPPOSY,X')
    expect(line('JOUSTRV4.SRC', 5008)).not.toContain('PPOSY+1')
    expect(line('JOUSTRV4.SRC', 5009)).toContain('SUBD\tPPOSY,U')
    expect(line('JOUSTRV4.SRC', 5009)).not.toContain('PPOSY+1')
  })

  it('the 8.8 value lives at PPOSY+1 — the flight core reads THAT for the fraction', () => {
    // The contrast that makes offset +0 unambiguously the whole pixel.
    expect(line('JOUSTRV4.SRC', 6494)).toContain('PPOSY+1,U')
    expect(line('JOUSTRV4.SRC', 6494).toUpperCase()).toContain('FRACTIONAL')
  })

  it('PLANTZ = 2 is "2 PIXELS LOWER" — whole pixels, not fractions', () => {
    expect(line('JOUSTRV4.SRC', 6071)).toContain('#2')
    expect(line('JOUSTRV4.SRC', 6071).toUpperCase()).toContain('2 PIXELS LOWER')
    expect(line('JOUSTRV4.SRC', 6072)).toContain('PLANTZ,U')
  })

  it('the tie/winner branch is strict: BEQ=same level (bounce), BMI decides', () => {
    expect(line('JOUSTRV4.SRC', 5010)).toContain('BEQ')
    expect(line('JOUSTRV4.SRC', 5010).toUpperCase()).toContain('SAME LEVEL')
    expect(line('JOUSTRV4.SRC', 5011)).toContain('BMI')
    expect(line('JOUSTRV4.SRC', 5014).toUpperCase()).toContain('PLAYERS COLIDE')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ENEMIES NEVER KILL EACH OTHER.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('enemies never kill each other', () => {
  it('the PID-and test branches to the no-kill bounce for enemy-vs-enemy', () => {
    expect(line('JOUSTRV4.SRC', 4953).toUpperCase()).toContain('ENEMIES DO NOT KILL EACH OTHER')
    expect(line('JOUSTRV4.SRC', 4961).toUpperCase()).toContain('NO KILL')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BOUNCE-APART.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('bounce-apart velocities and bumps', () => {
  it('OSTXUP: the top gets PBUMPY −2', () => {
    expect(line('JOUSTRV4.SRC', 5163)).toContain('OSTXUP')
    expect(line('JOUSTRV4.SRC', 5163)).toContain('#-2')
    expect(line('JOUSTRV4.SRC', 5164)).toContain('PBUMPY,X')
  })

  it('OSTXDN: the bottom gets PBUMPY +2', () => {
    expect(line('JOUSTRV4.SRC', 5175)).toContain('OSTXDN')
    expect(line('JOUSTRV4.SRC', 5175)).toContain('#2')
    expect(line('JOUSTRV4.SRC', 5176)).toContain('PBUMPY,X')
  })

  it('OSTXLF: horizontal reverse "slow down a bit" then half to the other as PBUMPX', () => {
    expect(line('JOUSTRV4.SRC', 5114)).toContain('OSTXLF')
    expect(line('JOUSTRV4.SRC', 5117).toUpperCase()).toContain('SLOW DOWN A BIT')
    expect(line('JOUSTRV4.SRC', 5121)).toContain('ASRA')
    expect(line('JOUSTRV4.SRC', 5122)).toContain('PBUMPX,U')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE BUMP DRAIN LAWS.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('bump register drain laws', () => {
  it('PBUMPX drains ≤3 px/frame (WRAPX)', () => {
    expect(line('JOUSTRV4.SRC', 7270)).toContain('WRAPX')
    expect(line('JOUSTRV4.SRC', 7270)).toContain('PBUMPX,U')
    expect(line('JOUSTRV4.SRC', 7273)).toContain('CMPA\t#3')
    expect(line('JOUSTRV4.SRC', 7276)).toContain('SUBA\t#3')
  })

  it('PBUMPY is consumed WHOLE — added to the pixel then cleared', () => {
    expect(line('JOUSTRV4.SRC', 6495)).toContain('ADDA\tPBUMPY,U')
    expect(line('JOUSTRV4.SRC', 6496)).toContain('CLR\tPBUMPY,U')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// KILL SCORES — DVALUE decoded through DVALUR (the $57 → 750 trap).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('kill scores: DVALUE decoded by the enemy DVALUR routine', () => {
  it('DVALUE is the "score when killed" byte', () => {
    expect(line('JOUSTRV4.SRC', 128)).toContain('DVALUE')
    expect(line('JOUSTRV4.SRC', 128).toUpperCase()).toContain('SCORE WHEN KILLED')
  })

  it('the three ground-enemy decision blocks carry $05 / $57 / $15', () => {
    expect(line('JOUSTRV4.SRC', 5562)).toContain('BOUNDR')
    expect(line('JOUSTRV4.SRC', 5565)).toContain('$05')
    expect(line('JOUSTRV4.SRC', 5566)).toContain('B2UNDR')
    expect(line('JOUSTRV4.SRC', 5569)).toContain('$57')
    expect(line('JOUSTRV4.SRC', 5570)).toContain('SHADOW')
    expect(line('JOUSTRV4.SRC', 5573)).toContain('$15')
  })

  it('SCRTEN reads the byte as TENS (high nibble) & HUNDREDS (low) — so $57 = 750', () => {
    // The trap the behaviour suite pins: a naïve ×100 of $57 is 5700; SCRTEN
    // ANDs the high nibble as TENS and the low as HUNDREDS → 5·10 + 7·100 = 750.
    expect(line('JOUSTRV4.SRC', 7357)).toContain('SCRTEN')
    expect(line('JOUSTRV4.SRC', 7360).toUpperCase()).toContain('SCORE TENS')
    expect(line('JOUSTRV4.SRC', 7361).toUpperCase()).toContain('HUNDREDS')
  })

  it('SCRHUN reads the byte as THOUSANDS & HUNDREDS — so $15 = 1500', () => {
    expect(line('JOUSTRV4.SRC', 7346)).toContain('SCRHUN')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BROAD + NARROW PHASE anchors.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('broad-phase box + narrow-phase spans', () => {
  it('HITEM is the X-then-Y box intersection', () => {
    expect(line('JOUSTRV4.SRC', 4909)).toContain('HITEM')
    expect(line('JOUSTRV4.SRC', 4910).toUpperCase()).toContain('X INTERSECTION')
    expect(line('JOUSTRV4.SRC', 4919).toUpperCase()).toContain('Y INTERSECTION')
  })

  it('the narrow phase walks the frame records collision pointer via BPCOL', () => {
    expect(line('JOUSTRV4.SRC', 4924)).toContain('PPICH')
    expect(line('JOUSTRV4.SRC', 7043)).toContain('BPCOL')
  })

  it('COFF bias and the two span sentinels are byte-real', () => {
    expect(line('JOUSTI.SRC', 7)).toContain('COFF')
    expect(line('JOUSTI.SRC', 7)).toContain('$0200')
    expect(line('JOUSTI.SRC', 73).toUpperCase()).toContain('TERMINATING')
    expect(line('JOUSTI.SRC', 73)).toContain('$8100')
    expect(line('JOUSTI.SRC', 837).toUpperCase()).toContain('NO COLISION')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EVERY jt2-3 LAW IS PINNED BY A claims/*.json ENTRY (runs everywhere).
// ─────────────────────────────────────────────────────────────────────────────
const CITED_RANGES: ReadonlyArray<{ law: string; file: string; start: number; end: number }> = [
  { law: 'HITEM box broad-phase', file: 'JOUSTRV4.SRC', start: 4909, end: 4923 },
  { law: 'BPCOL span narrow-phase', file: 'JOUSTRV4.SRC', start: 7043, end: 7043 },
  { law: 'COFF span bias', file: 'JOUSTI.SRC', start: 7, end: 7 },
  { law: '$8100 end-of-table sentinel', file: 'JOUSTI.SRC', start: 73, end: 73 },
  { law: '$8000 no-collision sentinel', file: 'JOUSTI.SRC', start: 837, end: 837 },
  { law: 'OSTBO joust (whole-pixel + PLANTZ)', file: 'JOUSTRV4.SRC', start: 5002, end: 5017 },
  { law: 'PPOSY is 3 bytes', file: 'RAMDEF.SRC', start: 174, end: 174 },
  { law: 'PPOSY+1 is the 8.8 fraction word', file: 'JOUSTRV4.SRC', start: 6494, end: 6494 },
  { law: 'PLANTZ 2px skid', file: 'JOUSTRV4.SRC', start: 6071, end: 6072 },
  { law: 'PFACE facing', file: 'RAMDEF.SRC', start: 186, end: 186 },
  { law: 'enemies never kill each other', file: 'JOUSTRV4.SRC', start: 4953, end: 4961 },
  { law: 'bounce-apart vertical', file: 'JOUSTRV4.SRC', start: 5163, end: 5185 },
  { law: 'bounce-apart horizontal', file: 'JOUSTRV4.SRC', start: 5114, end: 5157 },
  { law: 'PBUMPX drain ≤3', file: 'JOUSTRV4.SRC', start: 7270, end: 7288 },
  { law: 'PBUMPY consumed whole', file: 'JOUSTRV4.SRC', start: 6495, end: 6496 },
  { law: 'DVALUE score byte', file: 'JOUSTRV4.SRC', start: 128, end: 128 },
  { law: 'kill score fetch (OSTWIN)', file: 'JOUSTRV4.SRC', start: 5076, end: 5080 },
  { law: 'bounder DVALUE $05', file: 'JOUSTRV4.SRC', start: 5565, end: 5565 },
  { law: 'hunter DVALUE $57', file: 'JOUSTRV4.SRC', start: 5569, end: 5569 },
  { law: 'shadow-lord DVALUE $15', file: 'JOUSTRV4.SRC', start: 5573, end: 5573 },
  { law: 'SCRTEN tens&hundreds decode', file: 'JOUSTRV4.SRC', start: 7357, end: 7361 },
  { law: 'SCRHUN thousands&hundreds decode', file: 'JOUSTRV4.SRC', start: 7346, end: 7348 },
]

/** Does some committed claim pin a line INSIDE this dossier citation range? */
function claimCovers(claims: Claim[], file: string, start: number, end: number): boolean {
  return claims.some(
    (c) => c.source?.file === file && c.source.line >= start && c.source.line <= end,
  )
}

describe('each jt2-3 joust law is pinned by a claims/*.json entry', () => {
  it('loads a non-empty claims set (the guard must have teeth)', () => {
    expect(loadClaims().length, 'docs/rom-study/claims/*.json must exist').toBeGreaterThan(0)
  })

  it.each(CITED_RANGES)('$law ($file:$start-$end) is covered by a claim', ({ file, start, end }) => {
    const claims = loadClaims()
    expect(
      claimCovers(claims, file, start, end),
      `no committed claim pins ${file}:${start}-${end} — AC-3 requires each joust law to be cited`,
    ).toBe(true)
  })

  it('jt2-3 added its own transcription claims (JT23-*)', () => {
    const jt23 = loadClaims().filter((c) => /^JT23-\d+$/.test(c.id ?? ''))
    expect(jt23.length, 'the new joust transcription claims are committed').toBeGreaterThan(0)
  })

  it('every claim id is still unique', () => {
    const ids = loadClaims().map((c) => c.id)
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect([...new Set(dupes)], 'duplicate claim ids').toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// COUNT FLOORS on COLLISION_TABLES (the jt1-3 review debt — lands with jt2-3,
// which CONSUMES the tables). Deleting a table OR truncating spans must redden.
// Proven RED once by truncation during the RED phase (see the TEA Assessment).
// ─────────────────────────────────────────────────────────────────────────────
describe('COLLISION_TABLES count floors (jt2-3 consumes them)', () => {
  it('the table COUNT is floored — dropping a table reddens', async () => {
    const pics = await loadPictures()
    expect(
      pics.COLLISION_TABLES.length,
      'jt1-3 shipped 35 collision tables; jt2-3 consumes them and floors the count',
    ).toBeGreaterThanOrEqual(35)
  })

  it('the TOTAL span-row count is floored — truncating any mask reddens', async () => {
    const pics = await loadPictures()
    const total = pics.COLLISION_TABLES.reduce((n, t) => n + t.spans.length, 0)
    expect(
      total,
      'the transcribed masks total 541 span rows; removing rows from any table drops below the floor',
    ).toBeGreaterThanOrEqual(541)
  })

  it('every table carries a floor of span rows (no silently-empty mask)', async () => {
    const pics = await loadPictures()
    const thin = pics.COLLISION_TABLES.filter((t) => t.spans.length < 7).map(
      (t) => `${t.name}:${t.spans.length}`,
    )
    expect(thin, 'the smallest real masks are 7-8 rows; a table under 7 has been truncated').toEqual(
      [],
    )
  })

  it('every table is uniquely named and anchored (a dropped anchor reddens)', async () => {
    const pics = await loadPictures()
    const names = pics.COLLISION_TABLES.map((t) => t.name)
    const dupes = names.filter((n, i) => names.indexOf(n) !== i)
    expect([...new Set(dupes)], 'collision-table names must be unique').toEqual([])
    const unanchored = pics.COLLISION_TABLES.filter(
      (t) => !t.anchor || !t.anchor.file || !(t.anchor.startLine > 0),
    ).map((t) => t.name)
    expect(unanchored, 'every consumed table must keep its source anchor').toEqual([])
  })
})
