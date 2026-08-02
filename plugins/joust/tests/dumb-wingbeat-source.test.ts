// tests/dumb-wingbeat-source.test.ts
//
// Story jt5-8 — RED phase (Han Solo / TEA). The PROVENANCE companion to
// tests/dumb-wingbeat.test.ts, which carries the behaviour.
//
// ─── EVERY GROUP IN THIS FILE PASSES ON ARRIVAL, AND THAT IS THE DESIGN ──────
// A reader who finds a "RED phase" file entirely green reasonably concludes the
// phase was botched. It was not. These are ORACLE groups in the jt5-10 sense:
// they re-derive the LNTUP/LNTOFP law out of the vendored 1982 source, which
// already says what it says. They exist for three reasons:
//
//   1. They are the evidence base. The behaviour file asserts "a dumb enemy
//      cannot flap on two consecutive wakes"; THIS file is why that is the
//      machine's law and not a preference.
//   2. Two of them are NEGATIVE claims — "the glide is unconditional" and
//      "there is no timer" — and a negative claim is exactly the kind that gets
//      asserted from memory and is wrong. They are mechanically checked here.
//   3. They are the regression guard the day someone "tidies" the dumb
//      wingbeat into the DYTBL wing cadence uf1-9 built for the SMART brains.
//      It is a different mechanism with a different shape, and this file is the
//      proof.
//
// ─── THE DOUBLE-ENTRY RULE (jt1-3) ───────────────────────────────────────────
// The reader below is INDEPENDENT of any production decoder and of the shared
// `parseStatement` helper, which handles the FCB/FDB data directives; every
// line this story cares about is an LDD/STD/CLRB/BRA instruction. So this file
// carries its own three-field instruction matcher rather than widening a helper
// thirty other tests depend on.
//
// ─── DEGRADATION (the tp1-8 collection trap) ─────────────────────────────────
// `describe.skipIf` still executes the describe callback BODY at collection, so
// a file-reading const hoisted there throws on CI, where the gitignored
// reference/ tree is absent — killing the file before any test runs. Every
// vendored read below therefore happens INSIDE an `it()`.

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'

const SRC = 'JOUSTRV4.SRC'

// ─────────────────────────────────────────────────────────────────────────────
// The independent instruction reader. One 6809 statement per line:
// LABEL<tab>OP<tab>OPERAND<tab>COMMENT, with the label field empty on a
// continuation line. THE OPERAND FIELD ENDS AT THE FIRST WHITESPACE — whatever
// follows is the 1982 author's comment, even when it looks like an operand.
// ─────────────────────────────────────────────────────────────────────────────
interface Insn {
  readonly label: string
  readonly op: string
  readonly operand: string
  readonly comment: string
  readonly line: number
}

function parseInsn(raw: string | undefined, lineNo: number): Insn | null {
  if (raw === undefined) return null
  const text = raw.replace(/\r$/, '')
  if (text.trim() === '' || text.startsWith('*')) return null
  const m = /^(\S*)\s+(\S+)(?:\s+(\S+))?(?:\s+(.*))?$/.exec(text)
  if (m === null) return null
  return {
    label: m[1] ?? '',
    op: (m[2] ?? '').toUpperCase(),
    operand: m[3] ?? '',
    comment: (m[4] ?? '').trim(),
    line: lineNo,
  }
}

/** Every instruction in a 1-based inclusive line range. */
function insnsIn(lines: readonly string[], from: number, to: number): Insn[] {
  const out: Insn[] = []
  for (let n = from; n <= to; n++) {
    const i = parseInsn(lines[n - 1], n)
    if (i !== null) out.push(i)
  }
  return out
}

/** The 1-based line a label is defined on. */
function labelLine(lines: readonly string[], label: string): number {
  for (let n = 1; n <= lines.length; n++) {
    const i = parseInsn(lines[n - 1], n)
    if (i !== null && i.label === label) return n
  }
  throw new Error(`${SRC} defines no label \`${label}\``)
}

// The LINE TRACKING INTELLIGENCE routine, by its own banner comment (:3720).
const LINET_FIRST = 3722 // LINET  LDA NSMART
const LINET_LAST = 3762 // LNTOFP's BRA — the last line of the wingbeat pair

describe.skipIf(!vendoredAvailable)('ORACLE — the flapping wake PARKS the glide (LNTUP)', () => {
  it('LNTUP loads LNTOFP and stores it into the state pointer', () => {
    const lines = sourceLines(SRC)
    const [ldd, std] = insnsIn(lines, 3746, 3747)
    expect({ label: ldd?.label, op: ldd?.op, operand: ldd?.operand }).toEqual({
      label: 'LNTUP',
      op: 'LDD',
      operand: '#LNTOFP',
    })
    expect({ op: std?.op, operand: std?.operand }).toEqual({ op: 'STD', operand: 'PJOY,U' })
  })

  it("Williams's own comment says what the wake is for", () => {
    const lines = sourceLines(SRC)
    expect(parseInsn(lines[3746 - 1], 3746)?.comment).toBe('GET OFF GROUND OR JUST FLAP')
  })

  it('and the SAME wake sets the flap bit — LDB #1 into CURJOY+1', () => {
    const lines = sourceLines(SRC)
    const ldb = parseInsn(lines[3748 - 1], 3748)
    expect({ op: ldb?.op, operand: ldb?.operand }).toEqual({ op: 'LDB', operand: '#1' })
  })
})

describe.skipIf(!vendoredAvailable)('ORACLE — the glide wake is UNCONDITIONAL (LNTOFP)', () => {
  it('its four instructions are LDD / STD / CLRB / BRA, in that order', () => {
    const lines = sourceLines(SRC)
    const body = insnsIn(lines, 3759, 3762)
    expect(body.map((i) => i.op)).toEqual(['LDD', 'STD', 'CLRB', 'BRA'])
    expect(body.map((i) => i.operand)).toEqual(['#LINET', 'PJOY,U', '', 'LNTFLP'])
    expect(body[0]?.label).toBe('LNTOFP')
  })

  it('NOTHING in it tests anything — no compare, no test, no conditional branch', () => {
    const lines = sourceLines(SRC)
    const body = insnsIn(lines, 3759, 3762)
    // jt9-1 (R-3): the non-vacuity floor. Every assertion below lives INSIDE the
    // loop, so an empty parse — a moved span, a reader that stops matching —
    // would satisfy this test by iterating nothing at all.
    expect(body.length, 'an empty parse would make every claim below vacuous').toBe(4)
    for (const i of body) {
      expect(i.op, `${i.op} at :${i.line} is a comparison inside the glide wake`).not.toMatch(
        /^(CMP|TST|SUB|BIT)/,
      )
      // BRA is the ONLY branch permitted here: every other B-op is conditional.
      if (i.op.startsWith('B')) expect(i.op, `conditional branch at :${i.line}`).toBe('BRA')
    }
  })

  it('it re-enters the routine BELOW the lane decision — LNTFLP, not LINET', () => {
    const lines = sourceLines(SRC)
    const bra = parseInsn(lines[3762 - 1], 3762)
    expect(bra?.operand).toBe('LNTFLP')
    // The lane decision is :3733-3745 (the AOFFL band walk, the sunk-below test
    // and the already-rising test). LNTFLP sits after ALL of it, so branching
    // there cannot re-run any part of it.
    expect(labelLine(lines, 'LNTFLP')).toBeGreaterThan(3745)
  })

  it('the glide hands control BACK to LINET for the wake after', () => {
    const lines = sourceLines(SRC)
    expect(parseInsn(lines[3759 - 1], 3759)?.operand).toBe('#LINET')
    expect(labelLine(lines, 'LINET')).toBe(LINET_FIRST)
  })
})

describe.skipIf(!vendoredAvailable)('ORACLE — there is NO TIMER in this alternation', () => {
  it('PJOYT — the wing/interval countdown — is never named in LINET', () => {
    const lines = sourceLines(SRC)
    const scanned = insnsIn(lines, LINET_FIRST, LINET_LAST)
    // jt9-1 (R-3): the non-vacuity floor. The claim is that a FILTER comes back
    // empty; an empty input satisfies it just as well as an absent PJOYT, so the
    // population being filtered has to be pinned first.
    expect(scanned.length, 'the routine must have been read at all').toBeGreaterThan(20)
    const timers = scanned.filter((i) => i.operand.includes('PJOYT'))
    expect(
      timers.map((i) => `:${i.line} ${i.op} ${i.operand}`),
      'a PJOYT reference here would make the wingbeat a countdown',
    ).toEqual([])
  })

  it('the state pointer is written exactly TWICE — the flap wake and the glide wake', () => {
    const lines = sourceLines(SRC)
    const writes = insnsIn(lines, LINET_FIRST, LINET_LAST)
      .filter((i) => i.operand === 'PJOY,U' && i.op.startsWith('ST'))
      .map((i) => i.line)
    expect(writes).toEqual([3747, 3760])
  })

  it('the ONE countdown the routine does hold belongs to the lava-troll looker, not the wingbeat', () => {
    const lines = sourceLines(SRC)
    // :3725-3728 DEC PLAVT,U / BGT / LDA LNTLAV / STA PLAVT,U. It gates how
    // often LINET looks BEHIND itself for a lava troll (:3729-3732), and its
    // BEQ jumps to LNTUP — a SECOND entry into the flapping wake that has
    // nothing to do with the lane. Naming it here is what stops "there is no
    // timer in LINET" being repeated as a claim about the whole routine.
    const dec = parseInsn(lines[3725 - 1], 3725)
    expect({ op: dec?.op, operand: dec?.operand }).toEqual({ op: 'DEC', operand: 'PLAVT,U' })
    expect(parseInsn(lines[3727 - 1], 3727)?.comment).toBe('LINE TRACKING LAVA TROLL LOOKER')
    const beq = parseInsn(lines[3732 - 1], 3732)
    expect({ op: beq?.op, operand: beq?.operand }).toEqual({ op: 'BEQ', operand: 'LNTUP' })
  })
})

describe.skipIf(!vendoredAvailable)('ORACLE — promotion overwrites the state pointer wholesale', () => {
  it('LNTSMT replaces PJOY with the smart routine and jumps into it', () => {
    const lines = sourceLines(SRC)
    const body = insnsIn(lines, 3772, 3775)
    expect(body.map((i) => `${i.op} ${i.operand}`)).toEqual([
      'LDX PDECSN,U',
      'LDX DSMART,X',
      'STX PJOY,U',
      'JMP ,X',
    ])
    expect(parseInsn(lines[3774 - 1], 3774)?.comment).toBe('NEW SMARTS')
  })

  it('so no glide obligation can survive it — the write is a STORE, not a merge', () => {
    const lines = sourceLines(SRC)
    // The only ops touching PJOY,U in the whole routine are stores. Nothing
    // reads it back, masks it or conditions on it, so a pending LNTOFP is
    // simply gone the moment LNTSMT runs.
    const touches = insnsIn(lines, LINET_FIRST, 3775).filter((i) => i.operand === 'PJOY,U')
    expect(touches.map((i) => i.op)).toEqual(['STD', 'STD', 'STX'])
  })
})

describe.skipIf(!vendoredAvailable)('ORACLE — the glide wake still moves in the facing direction', () => {
  it('LNTFLP is the SHARED tail: the lane path and the glide both branch to it', () => {
    const lines = sourceLines(SRC)
    const targets = insnsIn(lines, LINET_FIRST, LINET_LAST)
      .filter((i) => i.operand === 'LNTFLP')
      .map((i) => `:${i.line} ${i.op}`)
    // :3743 BPL (at or above the line), :3745 BMI (already rising), :3762 BRA
    // (the glide). Three ways in, one direction routine.
    expect(targets).toEqual([':3743 BPL', ':3745 BMI', ':3762 BRA'])
  })

  it('and that tail reads PFACE — so `dir` is the facing on every one of them', () => {
    const lines = sourceLines(SRC)
    const tst = parseInsn(lines[3749 - 1], 3749)
    expect({ label: tst?.label, op: tst?.op, operand: tst?.operand }).toEqual({
      label: 'LNTFLP',
      op: 'TST',
      operand: 'PFACE,U',
    })
    expect(tst?.comment).toBe('MOVE IN DIRECTION OF FACING')
  })
})
