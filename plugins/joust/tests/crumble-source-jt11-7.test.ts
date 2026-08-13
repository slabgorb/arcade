// tests/crumble-source-jt11-7.test.ts
//
// Story jt11-7 — RED phase (O'Brien / TEA). The PROVENANCE companion to
// tests/crumble-jt11-7.test.ts: the CLFDES counts and naps re-derived from the
// vendored JOUSTRV4.SRC with an INDEPENDENT parser (the jt1-3 double-entry), plus
// the claims coverage the epic's source gate requires (each newly-cited ROM range
// carries a committed JT117-* claim in docs/rom-study/claims/crumble.json).
//
// ─── THE DOUBLE-ENTRY (the jt1-3 tautology trap) ─────────────────────────────
// Dev writes CRUMBLE_SHAKE_COUNT/…/CRUMBLE_DEBRIS_FRAME_NAPS in src/core/crumble.ts
// one way; this file re-derives the SAME numbers from the vendored CLFDES routine
// another way (a tiny instruction parser, transcribed straight from the listing
// at :4562-4599), and the gate is that the two agree. A module that re-bakes its
// own misreading cannot pass a reader it did not write.
//
// ─── NOT THE FALSE FRIEND (the story's central warning) ──────────────────────
// dissolve cites CLIFER at :4604-4631; CLFDES is the routine ABOVE it, :4562-4599.
// This suite pins the CLFDES range as the crumble's source and asserts the crumble
// claims live in that range — never in the dissolve's — so the two are not conflated.
//
// ─── DEGRADATION (the CI path) ───────────────────────────────────────────────
// CI clones only the subrepo and has no vendored tree, so every source
// re-derivation SKIPS there (describe.skipIf(!vendoredAvailable)); the claims
// coverage runs EVERYWHERE (the JSON is committed, not vendored). Every vendored
// read lives INSIDE an it() (the tp1-8 collection trap).

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'
import { loadClaims, claimCovers, type Claim } from './helpers/claims.js'
import { loadCrumble } from './helpers/crumble-contract.js'

const FILE = 'JOUSTRV4.SRC'
const basename = (p: string): string => p.split('/').pop() ?? p

// ─────────────────────────────────────────────────────────────────────────────
// TEA'S INDEPENDENT PARSER — a two-field split of one assembler line and a
// #-immediate / $-hex operand evaluator, transcribed straight from the CLFDES
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
  // optional label in column 1, then mnemonic, then operand
  const m = raw.match(/^(\S*)\s+([A-Z][A-Z0-9]*)\s+(\S+)/)
  if (!m) return null
  return { label: m[1], op: m[2], operand: m[3] }
}
/** Evaluate a `#5` / `#$2A` / `10` / `$2A` operand to a number. */
function operandNum(operand: string): number {
  const t = operand.replace(/^#/, '')
  return t.startsWith('$') ? parseInt(t.slice(1), 16) : parseInt(t, 10)
}
/** Every PCNAP nap value on lines [start, end], in order. */
function pcnapsIn(start: number, end: number): number[] {
  const naps: number[] = []
  for (let n = start; n <= end; n++) {
    const ins = instrAt(n)
    if (ins && ins.op === 'PCNAP') naps.push(operandNum(ins.operand))
  }
  return naps
}

// ─────────────────────────────────────────────────────────────────────────────
// STRUCTURE — the CLFDES routine is where and what we say it is.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('CLFDES is the routine at :4562-4599', () => {
  it('the routine opens at CLFDES (:4562) and ends JMP VSUCIDE (:4599)', () => {
    expect(sourceLines(FILE)[4562 - 1].trim(), 'the label').toBe('CLFDES')
    const end = instrAt(4599)
    expect([end?.op, end?.operand], 'the process ends by suiciding').toEqual(['JMP', 'VSUCIDE'])
  })

  it('the shake setup is LDA #5 "number of shakes to do" (:4563)', () => {
    const ins = instrAt(4563)
    expect(ins?.op, 'LDA').toBe('LDA')
    expect(operandNum(ins!.operand), 'five shakes').toBe(5)
    expect(sourceLines(FILE)[4564 - 1], 'the shake counter is stored').toContain('STA')
    expect(sourceLines(FILE)[4564 - 1]).toContain('number of shakes to do')
  })

  it('the debris setup is LDA #5 "five images" (:4579)', () => {
    const ins = instrAt(4579)
    expect(ins?.op, 'LDA').toBe('LDA')
    expect(operandNum(ins!.operand), 'five debris frames').toBe(5)
    expect(sourceLines(FILE)[4579 - 1], 'the five-image comment').toContain('five images')
  })

  it('the shake tint is LDA #$2A "by altering the cliffs flavor" (:4570)', () => {
    const ins = instrAt(4570)
    expect(ins?.op).toBe('LDA')
    expect(operandNum(ins!.operand), 'the flavor byte $2A').toBe(0x2a)
    expect(sourceLines(FILE)[4570 - 1]).toContain('flavor')
  })

  it('the erase between the phases is JSR LOCCLR / PCNAP 2 (:4575-4576)', () => {
    expect(sourceLines(FILE)[4575 - 1]).toContain('LOCCLR')
    expect(instrAt(4576)?.op).toBe('PCNAP')
    expect(operandNum(instrAt(4576)!.operand), 'the 2-nap erase blip (folded into the transition)').toBe(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE GATE — the module constants re-derive from CLFDES byte-for-byte.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the crumble module re-derives from CLFDES', () => {
  it('CRUMBLE_SHAKE_COUNT === the LDA #5 shake count (:4563)', async () => {
    const c = await loadCrumble()
    expect(c.CRUMBLE_SHAKE_COUNT).toBe(operandNum(instrAt(4563)!.operand))
  })

  it('CRUMBLE_SHAKE_NAPS === the two PCNAP 10 in the shake loop (:4565-4574)', () => {
    const naps = pcnapsIn(4565, 4574)
    // the shake loop `1$` body holds TWO PCNAP 10 (:4567 & :4572)
    expect(naps, 'exactly two PCNAP 10 per shake').toEqual([10, 10])
    return loadCrumble().then((c) =>
      expect(c.CRUMBLE_SHAKE_NAPS, 'the module folds them into one 20-nap hold').toBe(
        naps.reduce((a, b) => a + b, 0),
      ),
    )
  })

  it('CRUMBLE_DEBRIS_FRAME_COUNT === the LDA #5 debris count (:4579)', async () => {
    const c = await loadCrumble()
    expect(c.CRUMBLE_DEBRIS_FRAME_COUNT).toBe(operandNum(instrAt(4579)!.operand))
  })

  it('CRUMBLE_DEBRIS_FRAME_NAPS === the one PCNAP 8 in the debris loop (:4581-4597)', () => {
    const naps = pcnapsIn(4581, 4597)
    expect(naps, 'exactly one PCNAP 8 per debris frame').toEqual([8])
    return loadCrumble().then((c) => expect(c.CRUMBLE_DEBRIS_FRAME_NAPS).toBe(naps[0]))
  })

  it('CRUMBLE_FLAVOR === the LDA #$2A shake tint (:4570)', async () => {
    const c = await loadCrumble()
    expect(c.CRUMBLE_FLAVOR).toBe(operandNum(instrAt(4570)!.operand))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CLAIMS — each CLFDES law is pinned by a committed JT117-* claim in its own
// cited range (runs EVERYWHERE; the JSON is committed, not vendored).
// ─────────────────────────────────────────────────────────────────────────────
describe('each CLFDES law is pinned by a claims/crumble.json entry', () => {
  const crumbleClaims = (): Claim[] =>
    loadClaims().filter((c) => (c.id ?? '').startsWith('JT117-'))

  // (file, start, end, what) — the laws crumble.ts must cite.
  const laws: ReadonlyArray<readonly [number, number, string]> = [
    [4563, 4564, 'FIVE shakes (LDA #5 "number of shakes to do")'],
    [4567, 4572, 'the two PCNAP 10 shake holds'],
    [4570, 4571, 'the $2A shake flavor'],
    [4575, 4576, 'the LOCCLR / PCNAP 2 erase'],
    [4578, 4580, 'FIVE debris frames (LDA #5 "five images")'],
    [4594, 4594, 'the PCNAP 8 debris hold'],
    [4599, 4599, 'JMP VSUCIDE — the cliff is gone'],
  ]

  it('crumble.json contributes a non-empty JT117-* claim set (the guard has teeth)', () => {
    expect(
      crumbleClaims().length,
      'GREEN commits docs/rom-study/claims/crumble.json with JT117-* claims for CLFDES',
    ).toBeGreaterThan(0)
  })

  it.each(laws)('a JT117-* claim covers %i-%i (%s)', (start, end, what) => {
    expect(
      claimCovers(crumbleClaims(), FILE, start, end),
      `no JT117-* claim pins ${FILE}:${start}-${end} — ${what}`,
    ).toBe(true)
  })

  it('the crumble claims cite CLFDES (:4562-4599), NOT the dissolve CLIFER (:4604-4631)', () => {
    const cited = crumbleClaims()
      .map((c) => c.source)
      .filter((s): s is NonNullable<typeof s> => !!s && basename(s.file) === FILE)
    expect(cited.length, 'the crumble cites JOUSTRV4.SRC lines').toBeGreaterThan(0)
    const strays = cited.filter((s) => s.line < 4562 || s.line > 4599)
    expect(
      strays.map((s) => s.line),
      'every crumble citation is inside CLFDES — none leaks into the dissolve or elsewhere',
    ).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// VERBATIM — a crumble claim may not misquote the line it cites (double-entry
// against the real source; vendored-gated).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('every JT117-* verbatim matches the real source line', () => {
  it('each cited line equals the claim verbatim', () => {
    const claims = loadClaims().filter((c) => (c.id ?? '').startsWith('JT117-'))
    // RED today: no JT117-* claims exist, so this asserts the guard runs once
    // they do. It must have teeth — a claim set of zero is a separate failure
    // (the coverage suite above), so here we only check the ones that exist.
    for (const c of claims) {
      const s = c.source
      if (!s || basename(s.file) !== FILE || s.verbatim === undefined) continue
      expect(sourceLines(FILE)[s.line - 1], `${c.id} misquotes ${FILE}:${s.line}`).toBe(s.verbatim)
    }
  })
})
