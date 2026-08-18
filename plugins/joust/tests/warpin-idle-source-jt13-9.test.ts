// tests/warpin-idle-source-jt13-9.test.ts
//
// Story jt13-9 — RED phase (Han Solo / TEA). The PROVENANCE companion to
// tests/warpin-idle-jt13-9.test.ts: the TREFF phase-2 wait-loop seeds and the TREPL
// palette re-derived from the vendored JOUSTRV4.SRC with an INDEPENDENT parser (the
// jt1-3 double-entry), plus the claims coverage the epic's source gate requires
// (each newly-cited ROM range carries a committed JT139-* claim in
// docs/rom-study/claims/warpin.json).
//
// ─── THE DOUBLE-ENTRY (the jt1-3 tautology trap) ─────────────────────────────
// Dev writes IDLE_SPEED_INIT / IDLE_STEP_INIT / IDLE_COLOUR_INDEX_INIT /
// IDLE_SPEED_WINDOW_NAPS / IDLE_CADENCE / the TREPL role tables in src/core/warpin.ts
// one way; this file re-derives the SAME numbers from the vendored wait loop
// (:5805-5871) and the TREPL FCB tables (:5581-5583) another way — a tiny
// instruction/FCB parser transcribed straight from the listing — and the gate is
// that the two agree. A module that re-bakes its own misreading cannot pass a reader
// it did not write.
//
// ─── DEGRADATION (the CI path) ───────────────────────────────────────────────
// CI has no vendored tree, so every source re-derivation SKIPS there
// (describe.skipIf(!vendoredAvailable)); the claims coverage runs EVERYWHERE (the
// JSON is committed, not vendored). Every vendored read lives INSIDE an it() (the
// tp1-8 collection trap).

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'
import { loadClaims, claimCovers, type Claim } from './helpers/claims.js'
import { loadWarpInIdle, type IdleColour } from './helpers/warpin-idle-contract.js'

const FILE = 'JOUSTRV4.SRC'
const basename = (p: string): string => p.split('/').pop() ?? p

// ─────────────────────────────────────────────────────────────────────────────
// TEA'S INDEPENDENT PARSER — a label/op/operand split and a #-immediate / $-hex /
// `A*B` operand evaluator, transcribed straight from the wait-loop listing. Nothing
// in src/ imports this; Dev's constants are a separate derivation.
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
/** Evaluate a `#30` / `#$04` / `#16*2` / `20` / `$04` operand to a number. */
function operandNum(operand: string): number {
  const t = operand.replace(/^#/, '')
  const val = (tok: string): number => (tok.startsWith('$') ? parseInt(tok.slice(1), 16) : parseInt(tok, 10))
  if (t.includes('*')) return t.split('*').map(val).reduce((a, b) => a * b, 1)
  return val(t)
}
function operandAt(lineNo: number): number {
  const ins = instrAt(lineNo)
  if (!ins) throw new Error(`no instruction parsed at ${FILE}:${lineNo}`)
  return operandNum(ins.operand)
}
function pcnapAt(lineNo: number): number {
  const ins = instrAt(lineNo)
  if (!ins || ins.op !== 'PCNAP') throw new Error(`no PCNAP at ${FILE}:${lineNo}`)
  return operandNum(ins.operand)
}
/** Parse a `TREPL FCB PL1*$11,WHI*$11,…` row into its colour ROLES (symbol before `*`). */
function treplRoles(lineNo: number): IdleColour[] {
  const raw = sourceLines(FILE)[lineNo - 1]
  const m = raw?.match(/^\S+\s+FCB\s+(\S+)/)
  if (!m) throw new Error(`no FCB row at ${FILE}:${lineNo}`)
  return m[1].split(',').map((tok) => {
    const sym = tok.split('*')[0]
    if (sym === 'PL1' || sym === 'PL2') return 'owner'
    if (sym === 'WHI') return 'white'
    if (sym === 'GRY') return 'grey'
    throw new Error(`unmapped TREPL colour symbol ${sym} at ${FILE}:${lineNo}`)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURE — the wait loop is where and what we say it is.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the TREFF wait loop is at :5805-5871', () => {
  it('the loop is labelled "WAIT FOR 1ST MOVE, OR TIME OUT" (:5805)', () => {
    expect(sourceLines(FILE)[5805 - 1], 'the ROM comment names the phase').toContain(
      'WAIT FOR 1ST MOVE, OR TIME OUT',
    )
  })

  it('PFEET seeds to 16*2 = 32: LDA #16*2 / STA PFEET,U (:5810-5811)', () => {
    expect(instrAt(5810)?.op, 'LDA').toBe('LDA')
    expect(operandAt(5810), 'the #16*2 immediate evaluates to 32').toBe(32)
    expect(sourceLines(FILE)[5811 - 1], 'stored into PFEET').toContain('STA')
    expect(sourceLines(FILE)[5811 - 1]).toContain('PFEET')
  })

  it('PACCX seeds to PFEET>>1 = 16: LSRA / STA PACCX,U (:5812-5813)', () => {
    // LSRA is inherent-mode (no operand) — match the source line, not instrAt.
    expect(sourceLines(FILE)[5812 - 1], 'LSRA halves PFEET into A').toContain('LSRA')
    expect(sourceLines(FILE)[5813 - 1], 'stored into PACCX').toContain('STA')
    expect(sourceLines(FILE)[5813 - 1]).toContain('PACCX')
  })

  it('PLANTZ seeds to 2: LDA #2 / STA PLANTZ,U (:5814-5815)', () => {
    expect(operandAt(5814), 'the starting colour index').toBe(2)
    expect(sourceLines(FILE)[5815 - 1]).toContain('PLANTZ')
  })

  it('one nap per wake: PCNAP 1 (:5828)', () => {
    expect(pcnapAt(5828), 'PCNAP 1 — one nap per loop iteration').toBe(1)
  })

  it('any joystick input aborts the wait: LDD CURJOY / BNE 51$ (:5831, :5841)', () => {
    expect(sourceLines(FILE)[5831 - 1], 'reads the current joystick/decision').toContain('CURJOY')
    const branch = instrAt(5841)
    expect([branch?.op, branch?.operand], 'a non-zero input leaves the loop (wants to flap)').toEqual([
      'BNE',
      '51$',
    ])
    expect(sourceLines(FILE)[5841 - 1], 'the ROM comment').toContain('WANTS TO FLAP')
  })

  it('the speed window reloads to 75: DEC PTIMUP / LDA #75 (:5843, :5845)', () => {
    expect(sourceLines(FILE)[5843 - 1], 'DEC PTIMUP — the speed-change timer').toContain('PTIMUP')
    expect(sourceLines(FILE)[5843 - 1], 'the ROM comment').toContain('TIME TO CHANGE SPEEDS')
    expect(operandAt(5845), 'PTIMUP reloads to 75').toBe(75)
  })

  it('the cadence halves and times out at zero: LSR PFEET / BEQ 50$ (:5847-5848)', () => {
    expect(sourceLines(FILE)[5847 - 1], 'LSR PFEET halves the speed').toContain('LSR')
    expect(sourceLines(FILE)[5847 - 1]).toContain('PFEET')
    const branch = instrAt(5848)
    expect([branch?.op, branch?.operand], 'PFEET reaching 0 ends the phase (time out)').toEqual([
      'BEQ',
      '50$',
    ])
  })

  it('the colour advances when PACCX expires, reloading PACCX=PFEET: DEC PACCX / INC PLANTZ / LDA PFEET / STA PACCX (:5862-5866)', () => {
    expect(sourceLines(FILE)[5862 - 1], 'DEC PACCX — the colour-step counter').toContain('PACCX')
    expect(sourceLines(FILE)[5862 - 1], 'the ROM comment').toContain('CHANGE EFFECT')
    expect(sourceLines(FILE)[5864 - 1], 'INC PLANTZ — advance the colour').toContain('PLANTZ')
    expect(sourceLines(FILE)[5865 - 1], 'reload value is PFEET').toContain('PFEET')
    expect(sourceLines(FILE)[5866 - 1], 'reloaded into PACCX').toContain('PACCX')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE PALETTE — TREPL1/2/3 are the owner/white/grey role tables (:5581-5583).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the TREPL palettes are the owner/white/grey tables', () => {
  it('TREPL1 (P1) and TREPL2 (P2) share the owner/white/grey role shape (:5581-5582)', () => {
    expect(sourceLines(FILE)[5581 - 1], 'TREPL1 is the row we think').toContain('TREPL1')
    expect(treplRoles(5581), 'owner,owner,white,owner,owner,grey,owner,owner').toEqual([
      'owner', 'owner', 'white', 'owner', 'owner', 'grey', 'owner', 'owner',
    ])
    expect(treplRoles(5582), 'TREPL2 has the same role shape (only the owner nibble differs)').toEqual(
      treplRoles(5581),
    )
  })

  it('TREPL3 (enemy) is the white/grey shape (:5583)', () => {
    expect(sourceLines(FILE)[5583 - 1]).toContain('TREPL3')
    expect(treplRoles(5583), 'white,white,grey,white,white,grey,white,white').toEqual([
      'white', 'white', 'grey', 'white', 'white', 'grey', 'white', 'white',
    ])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE GATE — the module constants re-derive from the wait loop byte-for-byte.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the idle-cycle module re-derives from the wait loop', () => {
  it('IDLE_SPEED_INIT === the LDA #16*2 seed (:5810)', async () => {
    const w = await loadWarpInIdle()
    expect(w.IDLE_SPEED_INIT).toBe(operandAt(5810))
  })

  it('IDLE_STEP_INIT === PFEET>>1 (:5810 halved)', async () => {
    const w = await loadWarpInIdle()
    expect(w.IDLE_STEP_INIT).toBe(operandAt(5810) >> 1)
  })

  it('IDLE_COLOUR_INDEX_INIT === the LDA #2 PLANTZ seed (:5814)', async () => {
    const w = await loadWarpInIdle()
    expect(w.IDLE_COLOUR_INDEX_INIT).toBe(operandAt(5814))
  })

  it('IDLE_SPEED_WINDOW_NAPS === the LDA #75 PTIMUP reload (:5845)', async () => {
    const w = await loadWarpInIdle()
    expect(w.IDLE_SPEED_WINDOW_NAPS).toBe(operandAt(5845))
  })

  it('IDLE_CADENCE is PFEET halved down to (not incl.) 0, from PFEET>>1 (:5810, :5847)', async () => {
    const w = await loadWarpInIdle()
    const derived: number[] = []
    for (let v = operandAt(5810) >> 1; v >= 1; v >>= 1) derived.push(v)
    expect([...w.IDLE_CADENCE], 'the live cadences the halving loop passes through').toEqual(derived)
  })

  it('IDLE_SEQUENCE_PLAYER === TREPL1 roles, IDLE_SEQUENCE_ENEMY === TREPL3 roles (:5581, :5583)', async () => {
    const w = await loadWarpInIdle()
    expect([...w.IDLE_SEQUENCE_PLAYER]).toEqual(treplRoles(5581))
    expect([...w.IDLE_SEQUENCE_ENEMY]).toEqual(treplRoles(5583))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CLAIMS — each phase-2 law is pinned by a committed JT139-* claim in its own cited
// range (runs EVERYWHERE; the JSON is committed, not vendored).
// ─────────────────────────────────────────────────────────────────────────────
describe('each phase-2 law is pinned by a claims/warpin.json entry', () => {
  const idleClaims = (): Claim[] => loadClaims().filter((c) => (c.id ?? '').startsWith('JT139-'))

  // (start, end, what) — the laws the idle-cycle constants must cite.
  const laws: ReadonlyArray<readonly [number, number, string]> = [
    [5810, 5811, 'PFEET seed (LDA #16*2 / STA PFEET) — IDLE_SPEED_INIT'],
    [5812, 5813, 'PACCX seed (LSRA / STA PACCX) — IDLE_STEP_INIT'],
    [5814, 5815, 'PLANTZ seed (LDA #2 / STA PLANTZ) — IDLE_COLOUR_INDEX_INIT'],
    [5828, 5828, 'PCNAP 1 — one nap per wake'],
    [5831, 5841, 'LDD CURJOY / BNE 51$ — the first-move abort'],
    [5845, 5848, 'LDA #75 / LSR PFEET / BEQ 50$ — the 75-nap window and the timeout'],
    [5862, 5866, 'DEC PACCX / INC PLANTZ / STA PACCX — the accelerating colour advance'],
    [5581, 5583, 'TREPL1/2/3 — the owner/white/grey palette'],
  ]

  it('warpin.json contributes a non-empty JT139-* claim set (the guard has teeth)', () => {
    expect(
      idleClaims().length,
      'GREEN adds JT139-* claims for the wait loop to docs/rom-study/claims/warpin.json',
    ).toBeGreaterThan(0)
  })

  it.each(laws)('a JT139-* claim covers %i-%i (%s)', (start, end, what) => {
    expect(
      claimCovers(idleClaims(), FILE, start, end),
      `no JT139-* claim pins ${FILE}:${start}-${end} — ${what}`,
    ).toBe(true)
  })

  it('the idle-cycle claims cite only the wait loop (:5805-5890) or the TREPL palette (:5581-5583)', () => {
    const cited = idleClaims()
      .map((c) => c.source)
      .filter((s): s is NonNullable<typeof s> => !!s && basename(s.file) === FILE)
    expect(cited.length, 'the idle cycle cites JOUSTRV4.SRC lines').toBeGreaterThan(0)
    const inWaitLoop = (n: number): boolean => n >= 5805 && n <= 5890
    const inPalette = (n: number): boolean => n >= 5581 && n <= 5583
    const strays = cited.filter((s) => !inWaitLoop(s.line) && !inPalette(s.line))
    expect(
      strays.map((s) => s.line),
      'every citation is inside the wait loop or the TREPL palette — none leaks into a neighbour',
    ).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// VERBATIM — a JT139-* claim may not misquote the line it cites (vendored-gated).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('every JT139-* verbatim matches the real source line', () => {
  it('each cited line equals the claim verbatim', () => {
    const claims = loadClaims().filter((c) => (c.id ?? '').startsWith('JT139-'))
    for (const c of claims) {
      const s = c.source
      if (!s || basename(s.file) !== FILE || s.verbatim === undefined) continue
      expect(sourceLines(FILE)[s.line - 1], `${c.id} misquotes ${FILE}:${s.line}`).toBe(s.verbatim)
    }
  })
})
