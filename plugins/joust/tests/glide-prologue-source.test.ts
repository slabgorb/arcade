// tests/glide-prologue-source.test.ts
//
// Story jt9-1 — RED phase (Mr. Praline / TEA). The PROVENANCE companion to
// tests/glide-prologue.test.ts, which carries the behaviour.
//
// ─── MOST GROUPS HERE PASS ON ARRIVAL, AND THAT IS THE DESIGN ────────────────
// Same contract as its predecessor `dumb-wingbeat-source.test.ts`: these are
// ORACLE groups. They re-derive out of the vendored 1982 source the laws the
// behaviour file then asserts about the port, so that "a dumb bird cannot
// promote mid-glide" is the machine's law and not a preference.
//
// EXACTLY ONE GROUP IS RED ON ARRIVAL — `THE DYTBL ROW THE PORT CALLS DEAD`.
// It is here rather than in the behaviour file because what it corrects is a
// claim about the SOURCE: `difficulty.ts` records DYTBL row 3 as
// `{ kind: 'dead-in-rom' }` on the reasoning that "its label appears exactly
// ONCE in the whole of JOUSTRV4.SRC". That is true of the LABEL and false of
// the ROW, and only a source-side derivation can show it.
//
// ─── THE DOUBLE-ENTRY RULE (jt1-3) ───────────────────────────────────────────
// The readers below are INDEPENDENT of any production decoder. In particular the
// DYTBL group re-derives the table/RAM alignment from the assembler text rather
// than importing `DIFFICULTY_TABLE`, because the thing under test IS that
// module's reading of it. Importing the decoder would make the group agree with
// itself. It uses `sourceLines` only — the shared line reader, which does no
// interpreting.
//
// ─── DEGRADATION (the tp1-8 collection trap) ─────────────────────────────────
// `describe.skipIf` still executes the describe callback BODY at collection, so
// a file-reading const hoisted there throws where the vendored tree is absent.
// Every vendored read below therefore happens INSIDE an `it()`.

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'

const SRC = 'JOUSTRV4.SRC'
const RAMDEF = 'RAMDEF.SRC'

// The LINET block, as this story cites it throughout.
const LINET_FIRST = 3722 // LDA NSMART
const PROMO_LAST = 3724 // BLO LNTSMT
const LOOKER_FIRST = 3725 // DEC PLAVT,U
const LOOKER_LAST = 3732 // BEQ LNTUP
const LANE_FIRST = 3733 // 1$ LDA #AOFFL1
const LNTUP_LINE = 3746
const LNTOFP_LINE = 3759

// ─────────────────────────────────────────────────────────────────────────────
// An independent three-field statement reader. One 6809 statement per line:
// LABEL<tab>OP<tab>OPERAND<tab>COMMENT, label empty on a continuation line.
// THE OPERAND FIELD ENDS AT THE FIRST WHITESPACE — whatever follows is the 1982
// author's comment, even when it looks like another operand.
// ─────────────────────────────────────────────────────────────────────────────
interface Insn {
  readonly label: string
  readonly op: string
  readonly operand: string
  readonly line: number
}

function parseInsn(raw: string | undefined, lineNo: number): Insn | null {
  if (raw === undefined) return null
  const text = raw.replace(/\r$/, '')
  if (text.trim() === '' || text.startsWith('*')) return null
  const m = /^(\S*)\s+(\S+)(?:\s+(\S+))?(?:\s+(.*))?$/.exec(text)
  if (m === null) return null
  return { label: m[1] ?? '', op: m[2] ?? '', operand: m[3] ?? '', line: lineNo }
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

/** Every 1-based line on which `sym` appears as a whole word. */
function refsTo(lines: readonly string[], sym: string): number[] {
  const re = new RegExp(`(^|[^A-Z0-9_$#])${sym}([^A-Z0-9_$]|$)`)
  const out: number[] = []
  lines.forEach((l, i) => {
    const text = l.replace(/\r$/, '')
    // Strip the comment field so a mention in 1982 prose is not a reference.
    const code = /^(\S*\s+\S+(?:\s+\S+)?)/.exec(text)?.[1] ?? ''
    if (re.test(code) || code.includes(`#${sym}`)) out.push(i + 1)
  })
  return out
}

describe.skipIf(!vendoredAvailable)('ORACLE — PJOY,U is an ENTRY ADDRESS, not merely state', () => {
  it('the scheduler dispatches THROUGH it: JSR [PJOY,U] at exactly three sites', () => {
    const lines = sourceLines(SRC)
    // The INDIRECT form is the whole claim. `JSR [PJOY,U]` resumes execution at
    // the address stored in the workspace; `JSR PJOY,U` (no brackets) would not
    // exist here and `STD PJOY,U` merely writes it. Anchored to the bracket.
    const sites = lines
      .map((l, i) => ({ text: l.replace(/\r$/, ''), line: i + 1 }))
      .filter(({ text }) => /\bJSR\s+\[PJOY,U\]/.test(text))
      .map(({ line }) => line)
    expect(sites, 'the three dispatch sites, exhaustively').toEqual([5830, 5951, 6456])
  })

  it('a glide wake resumes BELOW the whole prologue, so :3722-3758 is skipped', () => {
    const lines = sourceLines(SRC)
    // LNTUP parks #LNTOFP; LNTOFP is the address the NEXT wake enters at.
    const park = insnsIn(lines, LNTUP_LINE, LNTUP_LINE + 1)
    expect(park.map((i) => `${i.op} ${i.operand}`)).toEqual(['LDD #LNTOFP', 'STD PJOY,U'])
    expect(park[0]?.label, 'the park sits at LNTUP').toBe('LNTUP')

    const entry = parseInsn(lines[LNTOFP_LINE - 1], LNTOFP_LINE)
    expect(entry?.label, 'the glide entry point').toBe('LNTOFP')

    // The structural claim: the entry address is strictly BELOW every
    // instruction this story is about, so none of them can run on that wake.
    expect(LNTOFP_LINE).toBeGreaterThan(PROMO_LAST)
    expect(LNTOFP_LINE).toBeGreaterThan(LOOKER_LAST)
  })
})

describe.skipIf(!vendoredAvailable)('ORACLE — the promotion check, and why a glide cannot reach it', () => {
  it("LINET's first three instructions ARE the promotion check", () => {
    const lines = sourceLines(SRC)
    const head = insnsIn(lines, LINET_FIRST, PROMO_LAST)
    expect(head.length, 'a floorless span would make every claim below vacuous').toBe(3)
    expect(head[0]?.label, 'the routine entry').toBe('LINET')
    expect(head.map((i) => `${i.op} ${i.operand}`)).toEqual([
      'LDA NSMART',
      'CMPA WSMART',
      'BLO LNTSMT',
    ])
  })

  it('LNTSMT is reachable ONLY from that branch — the label has exactly two references', () => {
    const lines = sourceLines(SRC)
    const refs = refsTo(lines, 'LNTSMT')
    // Two and only two: the BLO that jumps there, and the label's own
    // definition. A third reference anywhere would mean another route into
    // promotion and would falsify this story's central claim.
    expect(refs, 'the branch and the definition, and nothing else').toEqual([PROMO_LAST, 3764])
    expect(parseInsn(lines[3764 - 1], 3764)?.label, 'the definition').toBe('LNTSMT')
  })

  it('CONTROL — the reference reader can see a symbol that IS referenced many times', () => {
    // Without this, `refsTo` returning a short list would be indistinguishable
    // from `refsTo` being broken. LNTFLP is the same kind of local label in the
    // same routine and has four references.
    const lines = sourceLines(SRC)
    expect(refsTo(lines, 'LNTFLP').length).toBe(4)
    expect(refsTo(lines, 'PJOY').length).toBeGreaterThan(20)
  })
})

describe.skipIf(!vendoredAvailable)('ORACLE — the lava-troll looker is a SECOND entry into the flapping wake', () => {
  it('it is exactly these eight instructions', () => {
    const lines = sourceLines(SRC)
    const body = insnsIn(lines, LOOKER_FIRST, LOOKER_LAST)
    expect(body.length, 'the non-vacuity floor for the two claims below').toBe(8)
    expect(body.map((i) => `${i.op} ${i.operand}`)).toEqual([
      'DEC PLAVT,U',
      'BGT 1$',
      'LDA LNTLAV',
      'STA PLAVT,U',
      'LDX PPREV',
      'LDA PID,X',
      'CMPA #LAVID',
      'BEQ LNTUP',
    ])
  })

  it('LNTUP has exactly TWO entries: the lane decision falling through, and the looker', () => {
    const lines = sourceLines(SRC)
    const refs = refsTo(lines, 'LNTUP')
    // The looker's BEQ, and the label's own definition. Falling in from :3745
    // is the second entry and leaves no reference at all — which is why the
    // count is two and not three.
    expect(refs).toEqual([LOOKER_LAST, LNTUP_LINE])
    // The looker branches FORWARD past the whole lane decision.
    expect(LNTUP_LINE).toBeGreaterThan(LANE_FIRST)
  })

  it('PPREV is a GLOBAL — "previously executed process", not a per-process link', () => {
    const ram = sourceLines(RAMDEF)
    const decl = ram.map((l) => l.replace(/\r$/, '')).find((l) => /^PPREV\s+RMB/.test(l))
    expect(decl, 'PPREV is declared in RAMDEF, not in the per-process block').toBeDefined()
    expect(decl).toMatch(/^PPREV\s+RMB\s+2\s+ADDR OF PREVIOUSLY EXECUTED PROCESS BLOCK/)

    // The distinction that decides the port's design: every use is the BARE
    // symbol. A `PPREV,U` anywhere would make it a field of the workspace and
    // the looker would be asking a different question entirely.
    const src = sourceLines(SRC)
    const uses = src.filter((l) => /\bPPREV\b/.test(l.replace(/\r$/, '')))
    expect(uses.length, 'the floor — a zero here would make the next claim vacuous').toBeGreaterThan(3)
    expect(uses.filter((l) => /PPREV\s*,/.test(l)), 'no indexed use exists').toEqual([])
  })

  it('the troll is CREATED immediately before its victim, which is what makes the looker fire', () => {
    const lines = sourceLines(SRC)
    // :6778 — the creation site. `LDU PPREV` selects the insertion point, and
    // the 1982 comment states the geometry outright.
    const ins = parseInsn(lines[6778 - 1], 6778)
    expect(`${ins?.op} ${ins?.operand}`).toBe('LDU PPREV')
    expect(lines[6778 - 1]).toContain('AFTER PREVIOUS PROCESS (BEFORE THIS ONE)')
    // The id being planted is the lava troll's.
    expect(parseInsn(lines[6775 - 1], 6775)?.operand).toBe('#LAVID')
  })

  it('the SAME eight-instruction block runs in FOUR brains, each with its own target', () => {
    const lines = sourceLines(SRC)
    // Found while deriving this story: the looker is not LINET's alone. In the
    // three SMART brains it is the brain's FIRST instruction; only in LINET does
    // a promotion check sit above it. That asymmetry is exactly what this story
    // is about, and the other three are filed as a follow-up rather than ported
    // here.
    const blocks: ReadonlyArray<readonly [string, number, string]> = [
      ['LINET', LOOKER_FIRST, 'LNTUP'],
      ['BOUNDR', 3787, 'BODN1A'],
      ['B2UNDR', 3971, 'B2DN1A'],
      ['SHADOW', 4230, 'SHUPST'],
    ]
    const shape = ['DEC PLAVT,U', 'BGT 1$', 'LDA LNTLAV', 'STA PLAVT,U', 'LDX PPREV', 'LDA PID,X', 'CMPA #LAVID']
    for (const [brain, first, target] of blocks) {
      const body = insnsIn(lines, first, first + 7)
      expect(body.length, `${brain}: floor`).toBe(8)
      expect(body.slice(0, 7).map((i) => `${i.op} ${i.operand}`), `${brain}: the shared shape`).toEqual(shape)
      expect(`${body[7]?.op} ${body[7]?.operand}`, `${brain}: its own branch target`).toBe(`BEQ ${target}`)
    }
    // The asymmetry, asserted rather than described: the three smart brains
    // carry the block AT their entry label; LINET does not.
    expect(insnsIn(lines, 3787, 3787)[0]?.label).toBe('BOUNDR')
    expect(insnsIn(lines, 3971, 3971)[0]?.label).toBe('B2UNDR')
    expect(insnsIn(lines, 4230, 4230)[0]?.label).toBe('SHADOW')
    expect(insnsIn(lines, LOOKER_FIRST, LOOKER_FIRST)[0]?.label, 'LINET has a prologue above it').toBe('')
  })
})

describe.skipIf(!vendoredAvailable)('THE DYTBL ROW THE PORT CALLS DEAD — LNTLAV is row 3', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // `difficulty.ts` records row 3 as `{ kind: 'dead-in-rom' }`, reasoning that
  // "its label appears exactly ONCE in the whole of JOUSTRV4.SRC, on its own
  // DYWORD line at :7306 — Williams shipped a row nothing reads".
  //
  // The label does appear once. The ROW is read four times, because the DYTBL
  // comment spells it LAVLAV and the RAM variable it initialises is LNTLAV.
  // The initialiser never uses either name: it walks both blocks positionally.
  // ───────────────────────────────────────────────────────────────────────────

  /** The trailing label comment on each DYWORD line, in DYTBL order. */
  function dytblLabels(lines: readonly string[]): string[] {
    const start = lines.findIndex((l) => l.replace(/\r$/, '') === 'DYTBL')
    expect(start, 'DYTBL must be found').toBeGreaterThan(0)
    const out: string[] = []
    for (let n = start + 1; n < lines.length; n++) {
      const text = lines[n]?.replace(/\r$/, '') ?? ''
      if (text.startsWith('DYEND')) break
      const m = /^\s+DYWORD\s+\S+\s+(\w+)/.exec(text)
      if (m?.[1] !== undefined) out.push(m[1])
    }
    return out
  }

  /** The DYNADJ RAM block as 3-byte slots, each named by its first labelled RMB. */
  function dynadjSlots(ram: readonly string[]): { name: string; bytes: number }[] {
    const start = ram.findIndex((l) => l.replace(/\r$/, '').startsWith('DYNADJ'))
    expect(start, 'DYNADJ must be found').toBeGreaterThan(0)
    const slots: { name: string; bytes: number }[] = []
    let off = 0
    let names: string[] = []
    for (let n = start + 1; n < ram.length && slots.length < 40; n++) {
      const text = ram[n]?.replace(/\r$/, '') ?? ''
      const m = /^(\S*)\s+[Rr][Mm][Bb]\s+(\S+)/.exec(text)
      if (m === null) continue
      const size = (m[2] ?? '0').split('+').reduce((a, b) => a + Number(b), 0)
      if (m[1] !== '') names.push(m[1])
      off += size
      if (off >= 3) {
        slots.push({ name: names[0] ?? '(filler)', bytes: off })
        off = 0
        names = []
      }
    }
    return slots
  }

  it('the initialiser walks DYTBL and DYNADJ in lockstep — three RAM bytes per row', () => {
    const lines = sourceLines(SRC)
    // :939-950. Nothing in this loop names a row; the mapping is POSITIONAL,
    // which is the whole reason the two spellings describe one row.
    const loop = insnsIn(lines, 939, 950).map((i) => `${i.op} ${i.operand}`)
    expect(loop.length, 'floor').toBeGreaterThan(8)
    expect(loop).toContain('LDX #DYTBL')
    expect(loop).toContain('LDY #DYNADJ')
    expect(loop, 'one DYWORD row per iteration').toContain('LEAX DYWLEN,X')
    expect(loop, 'THREE RAM bytes per iteration').toContain('LEAY 3,Y')
    expect(loop, 'until the table ends').toContain('CMPX #DYEND')
    // And DYWLEN is the assembled row width, 14 bytes.
    const w = insnsIn(lines, 202, 207).reduce(
      (a, i) => a + (i.op.toUpperCase() === 'RMB' ? Number(i.operand) : 0),
      0,
    )
    expect(w, 'DYWORD emits 6 FDB + 2 FCB = 14 bytes').toBe(14)
  })

  it('27 of the 28 names agree — the ONE that differs is row 3', () => {
    const labels = dytblLabels(sourceLines(SRC))
    const slots = dynadjSlots(sourceLines(RAMDEF))
    expect(labels.length, 'the whole table').toBe(28)
    expect(slots.length, 'the whole dynamic RAM block').toBeGreaterThanOrEqual(28)
    const paired = slots.slice(0, 28)
    expect(
      paired.map((s) => s.bytes),
      'every slot is 3 bytes, which is what LEAY 3,Y requires',
    ).toEqual(Array(28).fill(3))

    const differ = paired
      .map((s, i) => ({ i: i + 1, ram: s.name, dytbl: labels[i] }))
      .filter((r) => r.ram !== r.dytbl)
    expect(differ, 'exactly one disagreement, and it is slot 3').toEqual([
      { i: 3, ram: 'LNTLAV', dytbl: 'LAVLAV' },
    ])
  })

  it('the ROW is READ at four sites, so it is not dead — only its DYTBL label is unique', () => {
    const lines = sourceLines(SRC)
    // The claim the port's disposition rests on is TRUE of the label…
    const lavlav = lines.filter((l) => /\bLAVLAV\b/.test(l.replace(/\r$/, '')))
    expect(lavlav.length, 'LAVLAV really does appear exactly once').toBe(1)
    expect(lavlav[0]).toContain('DYWORD')
    // …and false of the row, which four brains load every time their looker
    // countdown expires.
    const reads = lines
      .map((l, i) => ({ text: l.replace(/\r$/, ''), line: i + 1 }))
      .filter(({ text }) => /^\s+LDA\s+LNTLAV\b/.test(text))
      .map(({ line }) => line)
    expect(reads, 'LINET, BOUNDR, B2UNDR, SHADOW').toEqual([3727, 3789, 3973, 4232])
  })

  it("RED — the port still records row 3 as dead in the ROM", async () => {
    const d = await import('../src/core/difficulty.js')
    // AC3. The disposition must name the looker as the row's live consumer.
    // Until then `difficulty-wiring.test.ts` and `seek-wiring.test.ts` are both
    // guarding a claim the source refutes.
    const row = d.ROW_DISPOSITION.LAVLAV as { kind: string; consumer?: string }
    expect(row.kind, 'the row is read by four brains — it is wired, not dead').toBe('wired')
    expect(row.consumer, 'and the disposition must say who reads it').toMatch(/looker/i)
  })

  it('GREEN ON ARRIVAL — the row it decodes is already the wave-scaled looker period', async () => {
    const d = await import('../src/core/difficulty.js')
    const row = d.DIFFICULTY_TABLE[2]
    // Byte-gated against :7306 — `DYWORD $0010,$0008,$0004,-01,$0001,…`. The
    // DATA already matches; this pins that the story did not "fix" the reading
    // while re-labelling the row.
    expect(row?.starts, 'the three game-adjust start values').toEqual([0x0010, 0x0008, 0x0004])
    expect(row?.end, 'the floor').toBe(0x0001)
    expect(row?.inc, 'decrement by one per adjustment').toBe(0xff)
  })
})
