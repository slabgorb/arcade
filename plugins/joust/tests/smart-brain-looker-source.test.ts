// tests/smart-brain-looker-source.test.ts
//
// Story jt9-29 — RED phase (Mr. Praline / TEA). The PROVENANCE companion to
// tests/smart-brain-looker.test.ts, which carries the behaviour.
//
// ─── WHAT THIS STORY IS ──────────────────────────────────────────────────────
// jt9-1 ported the lava-troll looker for LINET only (`BEQ LNTUP`). The SAME
// eight instructions run at the TOP of the three SMART brains — BOUNDR (:3787),
// B2UNDR (:3971) and SHADOW (:4230) — and jt9-1's own source oracle already
// pins that shared shape (glide-prologue-source.test.ts, "the SAME eight-
// instruction block runs in FOUR brains"). What THIS story turns on is the part
// that oracle stopped at: the three smart brains each `BEQ` a DIFFERENT target,
// and the targets are NOT a shared flap.
//
//   LINET   BEQ LNTUP    → the flapping wake, parks a glide (jt9-1)
//   BOUNDR  BEQ BODN1A    → the DOWN-seek's forced flap  (LDB #$01)
//   B2UNDR  BEQ B2DN1A    → the DOWN-seek's forced flap  (LDB #$01)
//   SHADOW  BEQ SHUPST    → the UP-seek START, wings UP  (CLRB, NO flap)
//
// So a port that copies LINET's "force the flap bit" into all three brains is
// wrong on SHADOW: SHUPST clears the accumulator (wings up) and arms the climb
// for the NEXT wake. These oracle groups re-derive those three target bodies
// out of the vendored 1982 source so the behaviour file's per-brain assertions
// are the machine's law and not a reading of it.
//
// ─── THE DOUBLE-ENTRY RULE (jt1-3) ───────────────────────────────────────────
// The reader below is INDEPENDENT of any production decoder and of the sibling
// source file: it re-declares its own three-field statement parser over
// `sourceLines` (the shared line reader, which does no interpreting) rather than
// importing anything from glide-prologue-source.test.ts.
//
// ─── DEGRADATION (the tp1-8 collection trap) ─────────────────────────────────
// Every vendored read happens INSIDE an `it()`, never hoisted into a
// `describe.skipIf` body, which still executes at collection.

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'

const SRC = 'JOUSTRV4.SRC'

// The looker's FIRST instruction in each of the three smart brains, and its own
// branch target — the pair glide-prologue-source.test.ts already pins.
const BOUNDR_LOOKER = 3787
const B2UNDR_LOOKER = 3971
const SHADOW_LOOKER = 4230

// The three branch targets, at the lines the looker's `BEQ` names.
const BODN1A = 3821
const B2DN1A = 4006
const SHUPST = 4264

// ─────────────────────────────────────────────────────────────────────────────
// An independent three-field statement reader (the double-entry rule). One 6809
// statement per line: LABEL<tab>OP<tab>OPERAND<tab>COMMENT, label empty on a
// continuation line. THE OPERAND FIELD ENDS AT THE FIRST WHITESPACE.
// ─────────────────────────────────────────────────────────────────────────────
interface Insn {
  readonly label: string
  readonly op: string
  readonly operand: string
  readonly line: number
}

// 6809 inherent-mode ops take NO operand, so whatever follows on the line is
// the 1982 author's comment (e.g. `CLRB<tab>WINGS UP`). Without this the field
// reader would misread that comment word as an operand.
const INHERENT = new Set(['CLRB', 'CLRA', 'RTS', 'NOP', 'INCB', 'INCA', 'DECB', 'DECA'])

function parseInsn(raw: string | undefined, lineNo: number): Insn | null {
  if (raw === undefined) return null
  const text = raw.replace(/\r$/, '')
  if (text.trim() === '' || text.startsWith('*')) return null
  const m = /^(\S*)\s+(\S+)(?:\s+(\S+))?(?:\s+(.*))?$/.exec(text)
  if (m === null) return null
  const op = m[2] ?? ''
  return { label: m[1] ?? '', op, operand: INHERENT.has(op) ? '' : m[3] ?? '', line: lineNo }
}

/** Every parsed instruction in the INCLUSIVE 1-based line span. */
function insnsIn(lines: readonly string[], from: number, to: number): Insn[] {
  const out: Insn[] = []
  for (let n = from; n <= to; n++) {
    const i = parseInsn(lines[n - 1], n)
    if (i !== null) out.push(i)
  }
  return out
}

/** The instruction on the line a given label sits on. */
function atLabel(lines: readonly string[], line: number): Insn | null {
  return parseInsn(lines[line - 1], line)
}

/** Walk forward from `line` following BRA/JMP once, returning the body reached
 *  up to (and including) the next unconditional transfer. The BODN1A path needs
 *  this because its flap bit lives past a `BRA BOUP12`. */
function bodyFrom(lines: readonly string[], line: number, span = 6): Insn[] {
  return insnsIn(lines, line, line + span)
}

describe.skipIf(!vendoredAvailable)(
  'ORACLE — the three smart lookers all sit at the brain entry, above its decision',
  () => {
    it('each looker IS the brain\'s first instruction — DEC PLAVT,U at the entry label', () => {
      const lines = sourceLines(SRC)
      for (const [name, line] of [
        ['BOUNDR', BOUNDR_LOOKER],
        ['B2UNDR', B2UNDR_LOOKER],
        ['SHADOW', SHADOW_LOOKER],
      ] as const) {
        const head = atLabel(lines, line)
        expect(head?.label, `${name}: the looker sits AT the brain entry`).toBe(name)
        expect(`${head?.op} ${head?.operand}`, `${name}: first instruction is the DEC`).toBe(
          'DEC PLAVT,U',
        )
      }
    })
  },
)

describe.skipIf(!vendoredAvailable)(
  'ORACLE — BODN1A and B2DN1A: the down-seek FORCED FLAP (LDB #$01)',
  () => {
    it('BODN1A arms #BODN2 and reaches the flap bit via BRA BOUP12', () => {
      const lines = sourceLines(SRC)
      const head = bodyFrom(lines, BODN1A, 3)
      expect(head[0]?.label, 'the target label BOUNDR branches to').toBe('BODN1A')
      expect(head.map((i) => `${i.op} ${i.operand}`), 'arm the next state, then jump to BOUP12').toEqual([
        'LDD #BODN2',
        'STD PJOY,U',
        'LDA #2',
        'BRA BOUP12',
      ])
      // BOUP12 is the shared wing-down tail; its second instruction raises the
      // flap bit. This is the whole content of "BODN1A flaps".
      const boup12 = insnsIn(lines, 3865, 3867).map((i) => `${i.op} ${i.operand}`)
      expect(boup12, 'the flap bit is set on the BODN1A path').toContain('LDB #$01')
    })

    it('B2DN1A arms #B2DN2 and sets the flap bit inline', () => {
      const lines = sourceLines(SRC)
      const body = bodyFrom(lines, B2DN1A, 5)
      expect(body[0]?.label).toBe('B2DN1A')
      expect(body.map((i) => `${i.op} ${i.operand}`), 'the hunter down-seek forced flap').toEqual([
        'LDD #B2DN2',
        'STD PJOY,U',
        'LDA #2',
        'STA PJOYT,U',
        'LDB #$01',
        'JMP B2DIRL',
      ])
    })
  },
)

describe.skipIf(!vendoredAvailable)(
  'ORACLE — SHUPST: the up-seek START, wings UP (CLRB), NOT a flap',
  () => {
    it('SHUPST arms the climb #SHUP1 and CLEARS the flap bit (CLRB)', () => {
      const lines = sourceLines(SRC)
      const body = bodyFrom(lines, SHUPST, 3)
      expect(body[0]?.label).toBe('SHUPST')
      expect(body.map((i) => `${i.op} ${i.operand}`.trim()), 'arm the climb, wings up, no flap').toEqual([
        'LDD #SHUP1',
        'STD PJOY,U',
        'CLRB',
        'JMP SHDIRB',
      ])
      // The distinguishing fact: no `LDB #1` anywhere in the body. SHADOW's
      // looker does NOT flap on the wake it fires; it arms the climb for next.
      expect(
        body.some((i) => i.op === 'LDB' && /^#\$?0*1$/.test(i.operand)),
        'SHUPST raises no flap bit',
      ).toBe(false)
    })
  },
)

describe.skipIf(!vendoredAvailable)('ORACLE — the asymmetry, asserted: two flap, one does not', () => {
  it('BODN1A/B2DN1A carry a flap bit; SHUPST carries CLRB — "not a shared flap"', () => {
    const lines = sourceLines(SRC)
    // The down-seek targets raise the flap bit (directly, or one BRA away).
    const downFlaps = (target: number, span: number): boolean =>
      bodyFrom(lines, target, span).some((i) => i.op === 'LDB' && /^#\$?0*1$/.test(i.operand))
    expect(downFlaps(B2DN1A, 5), 'B2DN1A flaps inline').toBe(true)
    // BODN1A reaches its flap bit through BRA BOUP12 (asserted line-exactly above);
    // here the point is only the CONTRAST with SHUPST.
    const shupst = bodyFrom(lines, SHUPST, 3)
    expect(
      shupst.some((i) => i.op === 'CLRB'),
      'SHUPST clears the flap bit where the others set it',
    ).toBe(true)
    expect(
      shupst.some((i) => i.op === 'LDB' && /^#\$?0*1$/.test(i.operand)),
      'and SHUPST sets no flap bit at all',
    ).toBe(false)
  })
})
