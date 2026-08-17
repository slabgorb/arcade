// tests/warpin-source-jt13-2.test.ts
//
// Story jt13-2 — RED phase (Tyr / TEA). The PROVENANCE companion to
// tests/warpin-jt13-2.test.ts: the TREFF window's counts re-derived from the
// vendored JOUSTRV4.SRC with an INDEPENDENT parser (the jt1-3 double-entry), plus
// the claims coverage the epic's source gate requires (each newly-cited ROM range
// carries a committed JT132-* claim in docs/rom-study/claims/warpin.json).
//
// ─── THE DOUBLE-ENTRY (the jt1-3 tautology trap) ─────────────────────────────
// Dev writes WARPIN_FRAME_COUNT / WARPIN_FRAME_NAPS / WARPIN_BIRD_VISIBLE_PFRAME
// in src/core/warpin.ts one way; this file re-derives the SAME numbers from the
// vendored TREFF routine another way (a tiny instruction parser, transcribed
// straight from the listing at :5726-5803), and the gate is that the two agree.
// A module that re-bakes its own misreading cannot pass a reader it did not write.
//
// ─── NO `MATER` LABEL (correcting the setup Background) ──────────────────────
// There is no `MATER` label in this source. The materialisation chain is
// GOTTR → TREFF/TREFF2 → the wait loop → PLYINT. `MATERIALISE_WINDOW` is the
// CLONE's own (demo-tuned 120) name, not the ROM's. This suite cites the real
// labels and pins every warpin claim inside the TREFF..PLYINT span (:5726-5925).
//
// ─── DEGRADATION (the CI path) ───────────────────────────────────────────────
// CI has no vendored tree, so every source re-derivation SKIPS there
// (describe.skipIf(!vendoredAvailable)); the claims coverage runs EVERYWHERE (the
// JSON is committed, not vendored). Every vendored read lives INSIDE an it() (the
// tp1-8 collection trap).

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'
import { loadClaims, claimCovers, type Claim } from './helpers/claims.js'
import { loadWarpIn } from './helpers/warpin-contract.js'

const FILE = 'JOUSTRV4.SRC'
const basename = (p: string): string => p.split('/').pop() ?? p

// ─────────────────────────────────────────────────────────────────────────────
// TEA'S INDEPENDENT PARSER — a two-field split of one assembler line and a
// #-immediate / $-hex operand evaluator, transcribed straight from the TREFF
// listing. Nothing in src/ imports this; Dev's constants are a separate
// derivation, and the gate below is that the two agree.
// ─────────────────────────────────────────────────────────────────────────────
interface Instr {
  label: string
  op: string
  operand: string
}
function instrAt(lineNo: number): Instr | null {
  const raw = sourceLines(FILE)[lineNo - 1]
  if (raw === undefined) return null
  const m = raw.match(/^(\S*)\s+([A-Z][A-Z0-9]*)\s+(\S+)/)
  if (!m) return null
  return { label: m[1], op: m[2], operand: m[3] }
}
/** Evaluate a `#30` / `#$04` / `20` / `$04` operand to a number. */
function operandNum(operand: string): number {
  const t = operand.replace(/^#/, '')
  return t.startsWith('$') ? parseInt(t.slice(1), 16) : parseInt(t, 10)
}
function operandAt(lineNo: number): number {
  const ins = instrAt(lineNo)
  if (!ins) throw new Error(`no instruction parsed at ${FILE}:${lineNo}`)
  return operandNum(ins.operand)
}
/** The PCNAP nap value at a line (or throw). */
function pcnapAt(lineNo: number): number {
  const ins = instrAt(lineNo)
  if (!ins || ins.op !== 'PCNAP') throw new Error(`no PCNAP at ${FILE}:${lineNo}`)
  return operandNum(ins.operand)
}

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURE — the TREFF routine is where and what we say it is.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('TREFF is the warp-in effect at :5726-5803', () => {
  it('GOTTR arms the 30-frame window: LDA #30 / STA PFRAME,U (:5726-5727)', () => {
    expect(instrAt(5726)?.op, 'LDA').toBe('LDA')
    expect(operandAt(5726), 'thirty PFRAME frames').toBe(30)
    expect(sourceLines(FILE)[5727 - 1], 'stored into PFRAME').toContain('STA')
    expect(sourceLines(FILE)[5727 - 1]).toContain('PFRAME')
  })

  it('the effect loop opens at the TREFF label (:5733)', () => {
    expect(instrAt(5733)?.label, 'the TREFF loop head').toBe('TREFF')
  })

  it('the transporter is CONSTANT-FILLED in the owner colour: DCONST (:5739)', () => {
    const line = sourceLines(FILE)[5739 - 1]
    expect(line, 'the DMA constant is the player-colour DCONST byte').toContain('DCONST')
    expect(line, 'the ROM comment names it').toContain('COLORED TRANSPORTER')
  })

  it('the bird is drawn only for PFRAME <= 20: CMPA #20 / BGT TREFF2 (:5742-5743)', () => {
    expect(instrAt(5742)?.op, 'CMPA').toBe('CMPA')
    expect(operandAt(5742), 'the twenty-frame split').toBe(20)
    const branch = instrAt(5743)
    expect([branch?.op, branch?.operand], 'skips the bird draw while PFRAME > 20').toEqual([
      'BGT',
      'TREFF2',
    ])
  })

  it('the silhouette VERTICAL size is derived from PFRAME (:5753-5757)', () => {
    // COMA "VERT SIZE" / ASRA / ANDA #$0F / EORA #$04 / STA WCLENY,X — the height
    // grows as PFRAME falls (feet pinned, WCY shifted at :5763-5783).
    expect(sourceLines(FILE)[5753 - 1], 'COMA is the vertical-size derivation').toContain('COMA')
    expect(sourceLines(FILE)[5753 - 1]).toContain('VERT SIZE')
    // ASRA is inherent-mode (no operand), so match the source line, not instrAt.
    expect(sourceLines(FILE)[5754 - 1], 'ASRA halves it').toContain('ASRA')
    expect(instrAt(5755)?.op, 'ANDA masks the low nibble').toBe('ANDA')
    expect(operandAt(5755), 'ANDA #$0F').toBe(0x0f)
    expect(instrAt(5757)?.op, 'stored into WCLENY (the DMA vertical length)').toBe('STA')
    expect(sourceLines(FILE)[5757 - 1]).toContain('WCLENY')
  })

  it('TREFF2 holds one nap per frame and loops PFRAME 30→0 (:5792, :5802-5803)', () => {
    expect(instrAt(5792)?.label, 'the TREFF2 tail').toBe('TREFF2')
    expect(pcnapAt(5792), 'PCNAP 1 EFFECTS TIME — one nap per frame').toBe(1)
    expect(sourceLines(FILE)[5792 - 1], 'the ROM comment').toContain('EFFECTS TIME')
    expect(sourceLines(FILE)[5802 - 1], 'DEC PFRAME each iteration').toContain('DEC')
    expect(sourceLines(FILE)[5802 - 1]).toContain('PFRAME')
    const loop = instrAt(5803)
    expect([loop?.op, loop?.operand], 'and branches back to TREFF while non-zero').toEqual([
      'LBNE',
      'TREFF',
    ])
  })

  it('the window ends by enabling collisions at PLYINT (:5923-5925)', () => {
    expect(operandAt(5923), 'LDA #$80 — the PID collision bit').toBe(0x80)
    expect(sourceLines(FILE)[5923 - 1], 'the ROM comment').toContain('ENABLE THIS PLAYERS COLISIONS')
    expect(sourceLines(FILE)[5924 - 1], 'ORA PID,U').toContain('PID')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE GATE — the module constants re-derive from TREFF byte-for-byte.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the warpin module re-derives from TREFF', () => {
  it('WARPIN_FRAME_COUNT === the LDA #30 window (:5726)', async () => {
    const w = await loadWarpIn()
    expect(w.WARPIN_FRAME_COUNT).toBe(operandAt(5726))
  })

  it('WARPIN_FRAME_NAPS === the TREFF2 PCNAP 1 (:5792)', async () => {
    const w = await loadWarpIn()
    expect(w.WARPIN_FRAME_NAPS).toBe(pcnapAt(5792))
  })

  it('WARPIN_BIRD_VISIBLE_PFRAME === the CMPA #20 split (:5742)', async () => {
    const w = await loadWarpIn()
    expect(w.WARPIN_BIRD_VISIBLE_PFRAME).toBe(operandAt(5742))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CLAIMS — each TREFF law is pinned by a committed JT132-* claim in its own cited
// range (runs EVERYWHERE; the JSON is committed, not vendored).
// ─────────────────────────────────────────────────────────────────────────────
describe('each TREFF law is pinned by a claims/warpin.json entry', () => {
  const warpinClaims = (): Claim[] =>
    loadClaims().filter((c) => (c.id ?? '').startsWith('JT132-'))

  // (start, end, what) — the laws warpin.ts must cite.
  const laws: ReadonlyArray<readonly [number, number, string]> = [
    [5726, 5727, 'the 30-frame window (LDA #30 / STA PFRAME)'],
    [5739, 5739, 'DCONST — the owner-coloured lit transporter'],
    [5741, 5743, 'the CMPA #20 bird-visible split'],
    [5753, 5757, 'the WCLENY vertical-size derivation'],
    [5792, 5792, 'the TREFF2 PCNAP 1 per-frame hold'],
    [5802, 5803, 'DEC PFRAME / LBNE TREFF — the thirty-frame loop'],
    [5923, 5925, 'PLYINT enables collisions — the window ends'],
  ]

  it('warpin.json contributes a non-empty JT132-* claim set (the guard has teeth)', () => {
    expect(
      warpinClaims().length,
      'GREEN commits docs/rom-study/claims/warpin.json with JT132-* claims for TREFF',
    ).toBeGreaterThan(0)
  })

  it.each(laws)('a JT132-* claim covers %i-%i (%s)', (start, end, what) => {
    expect(
      claimCovers(warpinClaims(), FILE, start, end),
      `no JT132-* claim pins ${FILE}:${start}-${end} — ${what}`,
    ).toBe(true)
  })

  it('the warpin claims cite the TREFF..PLYINT span (:5726-5925), not elsewhere', () => {
    const cited = warpinClaims()
      .map((c) => c.source)
      .filter((s): s is NonNullable<typeof s> => !!s && basename(s.file) === FILE)
    expect(cited.length, 'the warpin cites JOUSTRV4.SRC lines').toBeGreaterThan(0)
    const strays = cited.filter((s) => s.line < 5726 || s.line > 5925)
    expect(
      strays.map((s) => s.line),
      'every warpin citation is inside the TREFF effect — none leaks into a neighbour routine',
    ).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// VERBATIM — a warpin claim may not misquote the line it cites (double-entry
// against the real source; vendored-gated).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('every JT132-* verbatim matches the real source line', () => {
  it('each cited line equals the claim verbatim', () => {
    const claims = loadClaims().filter((c) => (c.id ?? '').startsWith('JT132-'))
    for (const c of claims) {
      const s = c.source
      if (!s || basename(s.file) !== FILE || s.verbatim === undefined) continue
      expect(sourceLines(FILE)[s.line - 1], `${c.id} misquotes ${FILE}:${s.line}`).toBe(s.verbatim)
    }
  })
})
