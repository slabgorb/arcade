// tests/cadence-source.test.ts
//
// Story uf1-9 — RED phase (Mr. Praline / TEA). The PROVENANCE companion to
// tests/cadence-wiring.test.ts. This file proves, out of the vendored 1982
// source, the ROM laws the eleven cadence rows actually obey — and it exists
// because THREE of this story's acceptance criteria are corrections to claims
// the backlog made about those rows.
//
// ─── READ THIS FIRST: WHICH GROUPS START GREEN, AND WHY (the jt5-10 split) ────
// A reader who finds most of this file passing at RED and no explanation
// reasonably concludes the RED phase was botched. It was not. The groups are
// deliberately of two kinds and each says which it is in its own header:
//
//   • ORACLE groups re-derive a fact from JOUSTRV4.SRC. The 1982 source already
//     says what it says, so they PASS ON ARRIVAL. They are the evidence base
//     for AC4/AC5/AC6 — the thing that makes the corrections measurements
//     rather than opinions — and they are the regression guard the day someone
//     "tidies" a row back into the wrong family.
//   • RECORD groups demand the PORT carry the finding. Those are RED: they read
//     src/core/difficulty.ts's ROW_DISPOSITION and src/core/enemy.ts, neither of
//     which knows about any of this yet.
//
// ─── THE DOUBLE-ENTRY RULE (jt1-3) ───────────────────────────────────────────
// The reader below is INDEPENDENT of any production decoder: it re-reads the raw
// text of JOUSTRV4.SRC and parses the consumer lines itself. `parseStatement` in
// helpers/joust-source.ts only handles FCB/FDB (the data directives), and every
// line this story cares about is an LDA/CMPD/STA instruction — so this file
// carries its own three-line instruction matcher rather than widening a shared
// helper that thirty other tests depend on.
//
// ─── DEGRADATION (the jt1-3 CI path) ─────────────────────────────────────────
// Every vendored read lives inside an it() body and the source groups are
// skipIf(!vendoredAvailable) — CI clones without the reference tree must skip,
// not fail. The port-record groups read only committed source and run everywhere.

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'
import { loadDifficulty } from './helpers/difficulty-contract.js'

const SRC = 'JOUSTRV4.SRC'

// ─────────────────────────────────────────────────────────────────────────────
// The independent instruction reader.
//
// One 6809 statement per line: LABEL<tab>OP<tab>OPERAND<tab>COMMENT. As in the
// data reader, THE OPERAND FIELD ENDS AT THE FIRST WHITESPACE — everything after
// it is comment, even when (as here) the comment is itself an assembler-shaped
// immediate like `#20+1`. That is precisely the property this story leans on:
// the trailing `#N` is the PRE-DYTBL immediate the row replaced, preserved by
// the 1982 author as a migration note, and it is a COMMENT — never assembled.
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
  const line = raw.replace(/\r$/, '')
  if (line.startsWith('*') || line.trim() === '') return null
  const m = line.match(/^(\S*)\s+([A-Z][A-Z0-9]*)\s+(\S+)\s*(.*)$/)
  if (!m) return null
  return { label: m[1], op: m[2], operand: m[3], comment: m[4].trim(), line: lineNo }
}

function readInsns(): Insn[] {
  const lines = sourceLines(SRC)
  const out: Insn[] = []
  for (let i = 0; i < lines.length; i++) {
    const s = parseInsn(lines[i], i + 1)
    if (s !== null) out.push(s)
  }
  return out
}

/** Every statement whose OPERAND is exactly this row label (the row's consumers). */
function consumersOf(insns: readonly Insn[], row: string): Insn[] {
  return insns.filter((s) => s.operand === row)
}

/**
 * Evaluate a trailing comment immediate — `#2`, `#20+1`, `#-$0100`, `#8+1`.
 * Bare digits are DECIMAL, `$` is hex (the joust-source radix rule); `+` adds.
 * Returns null when the comment carries no immediate at all, which is itself a
 * measured fact about SHCLTM's neighbours and never silently treated as zero.
 */
function commentImmediate(comment: string): number | null {
  const m = comment.match(/^#(-?)(\$?[0-9A-Fa-f]+)(?:\+(\d+))?\b/)
  if (!m) return null
  const base = m[2].startsWith('$') ? parseInt(m[2].slice(1), 16) : parseInt(m[2], 10)
  const plus = m[3] === undefined ? 0 : parseInt(m[3], 10)
  return (m[1] === '-' ? -base : base) + plus
}

/** The eleven rows this story owns, split by the family the ROM puts them in. */
const WING_ROWS = ['BOUPWD', 'BOUPWU', 'HUUPWD', 'HUUPWU'] as const
const DECISION_ROWS = ['BOLETM', 'HULETM', 'SHUPTM', 'SHLETM'] as const
const CLIFF_ROW = 'SHCLTM' as const
const UP_VY_ROWS = ['HUUPVY', 'SHUPVY'] as const
const ALL_ELEVEN = [...WING_ROWS, ...DECISION_ROWS, CLIFF_ROW, ...UP_VY_ROWS] as const

/** The ROM comment that defines the decision-timer family. */
const DECISION_COMMENT = 'TIME UNTIL NEXT DECISION'

/**
 * AC6's two measured exceptions. Written as DATA, with both sides of each
 * comparison, so the test reports the divergence rather than merely tolerating
 * it — a skipped row and a known-divergent row must not look the same.
 */
const FREE_CHECK_EXCEPTIONS: Readonly<Record<string, { start: number; comment: number }>> =
  Object.freeze({
    SHLETM: { start: 0x0015, comment: 9 },
    SHUPTM: { start: 0x000a, comment: 9 },
  })

// ═════════════════════════════════════════════════════════════════════════════
// ORACLE — GREEN ON ARRIVAL. The eleven rows and their single consumers.
// ═════════════════════════════════════════════════════════════════════════════
describe.skipIf(!vendoredAvailable)('ORACLE — each cadence row has exactly ONE consumer', () => {
  it('finds a DYWORD definition and exactly one reading instruction per row', () => {
    const lines = sourceLines(SRC)
    const insns = readInsns()
    for (const row of ALL_ELEVEN) {
      // The definition line: `DYWORD $..,$..,…  <ROW>` — the label is the
      // TRAILING comment on the macro call, not an operand.
      const defs = lines
        .map((l, i) => ({ l: (l ?? '').replace(/\r$/, ''), n: i + 1 }))
        .filter(({ l }) => /^\s*DYWORD\s/.test(l) && l.trim().endsWith(row))
      expect(defs.length, `${row}: DYWORD definition lines`).toBe(1)

      const consumers = consumersOf(insns, row)
      expect(consumers.length, `${row}: instructions whose operand is the row`).toBe(1)
    }
  })

  it('pins each consumer to the exact line and opcode the story cites', () => {
    const insns = readInsns()
    // Cited in the story, the context and ROW_DISPOSITION. If a re-vendoring
    // shifts these, THIS is the test that says so — before eleven claim
    // citations rot silently.
    const expected: ReadonlyArray<readonly [string, number, string]> = [
      ['BOUPWD', 3864, 'LDA'],
      ['BOUPWU', 3894, 'LDA'],
      ['HUUPWU', 4047, 'LDA'],
      ['HUUPWD', 4182, 'LDA'],
      ['BOLETM', 3909, 'LDA'],
      ['HULETM', 4060, 'LDA'],
      ['SHUPTM', 4283, 'LDA'],
      ['SHLETM', 4316, 'LDA'],
      ['SHCLTM', 4375, 'LDA'],
      ['HUUPVY', 4178, 'CMPD'],
      ['SHUPVY', 4272, 'CMPD'],
    ]
    for (const [row, line, op] of expected) {
      const c = consumersOf(insns, row)[0]
      expect(c, `${row} has a consumer`).toBeDefined()
      expect(c.line, `${row} consumer line`).toBe(line)
      expect(c.op, `${row} consumer opcode`).toBe(op)
    }
  })

  it('stores all NINE timer rows into PJOYT on the very next line', () => {
    // The load and the store are a pair; a row that loads into A and is then
    // used for something else is not a timer. This is also the measurement that
    // made the SHCLTM/decision split decidable at all — SHCLTM stores to PJOYT
    // like the others, so it IS a timer; it is only not a DECISION timer.
    const lines = sourceLines(SRC)
    const insns = readInsns()
    for (const row of [...WING_ROWS, ...DECISION_ROWS, CLIFF_ROW]) {
      const c = consumersOf(insns, row)[0]
      const next = parseInsn(lines[c.line], c.line + 1) // 0-based index = next line
      expect(next, `${row}: line after the load parses`).not.toBeNull()
      expect(`${next!.op} ${next!.operand}`, `${row} at :${c.line} stores the loaded value`).toBe(
        'STA PJOYT,U',
      )
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// ORACLE — GREEN ON ARRIVAL. AC4's correction: SHCLTM is NOT a decision timer.
//
// The backlog grouped five rows as "the DECISION timer … (each 'TIME UNTIL NEXT
// DECISION')". Four carry that comment. This group is the measurement.
// ═════════════════════════════════════════════════════════════════════════════
describe.skipIf(!vendoredAvailable)('ORACLE — the decision-timer family is FOUR rows, not five', () => {
  it('gives exactly the four named rows the TIME UNTIL NEXT DECISION comment', () => {
    const insns = readInsns()
    for (const row of DECISION_ROWS) {
      const c = consumersOf(insns, row)[0]
      expect(c.comment, `${row} at :${c.line}`).toContain(DECISION_COMMENT)
    }
  })

  it('does NOT give SHCLTM that comment — its comment is a bare immediate', () => {
    const insns = readInsns()
    const c = consumersOf(insns, CLIFF_ROW)[0]
    expect(c.comment, `${CLIFF_ROW} at :${c.line}`).not.toContain(DECISION_COMMENT)
    // Positive half: say what it IS, so this cannot pass by the comment merely
    // being absent/reworded. `#8` and nothing else.
    expect(c.comment.trim(), `${CLIFF_ROW}'s whole comment`).toBe('#8')
  })

  it('searches the WHOLE file: SIX sites carry the comment, and only FOUR are rows', () => {
    // The quantifier is the thing that was wrong in the backlog ("each of these
    // five"), so this asserts over every occurrence in the source rather than
    // over the list we already believe — and doing that is what found the two
    // sites below. B2UP3 (:4199) and SHUP3 (:4415), the "LEVEL FLIGHT, READY TO
    // GO UP" states, carry a HARDCODED `#20+1` that the 1982 authors never
    // migrated to DYTBL. They are decision timers by the ROM's own comment and
    // they are NOT wave-scaled — see the FROZEN group below for why that
    // matters to this story.
    const insns = readInsns()
    const bearers = insns.filter((s) => s.comment.includes(DECISION_COMMENT))
    expect(bearers.map((s) => s.line).sort((a, b) => a - b), 'every site').toEqual([
      3909, 4060, 4199, 4283, 4316, 4415,
    ])
    const rowBacked = bearers.filter((s) => (DECISION_ROWS as readonly string[]).includes(s.operand))
    expect(rowBacked.map((s) => s.operand).sort(), 'the DYTBL-backed four').toEqual(
      [...DECISION_ROWS].sort(),
    )
    const frozen = bearers.filter((s) => s.operand.startsWith('#'))
    expect(frozen.map((s) => s.line), 'the two never migrated to a row').toEqual([4199, 4415])
    expect(new Set(frozen.map((s) => s.operand)), 'both frozen at the same immediate').toEqual(
      new Set(['#20+1']),
    )
  })

  it('places SHCLTM inside the cliff-avoidance block, not a level-flight decide', () => {
    const lines = sourceLines(SRC)
    // :4373-4377 — SHDICL loads the SHAV "slow down" routine into PJOY and dwells.
    // The four decision rows all sit under a *LEV/*LEP level-flight label.
    const block = lines
      .slice(4372, 4377)
      .map((l) => (l ?? '').replace(/\r$/, ''))
      .join('\n')
    expect(block, 'the SHCLTM block').toContain('SHDICL')
    expect(block, 'the SHCLTM block').toContain('SHAV')
    expect(block, "the ROM's own words for what this dwell is").toContain(
      'SLOW DOWN!!! GOING INTO A CLIFF',
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// ORACLE — GREEN ON ARRIVAL. THE FROZEN SITES: wiring eleven rows does NOT wire
// the whole mechanic, and the rows are narrower than their names suggest.
//
// Found by the whole-file census above. `PJOYT` is armed at FOURTEEN sites in
// the enemy brains; only NINE are DYTBL rows. The other five are hardcoded
// immediates the 1982 authors never migrated, and two of them sit directly
// beside a row this story wires. A port that treats "the wing timer" or "the
// decision timer" as one wave-scaled quantity everywhere will wave-scale five
// sites the machine keeps constant — a divergence that only opens at wave 3,
// which is exactly where nothing is looking.
// ═════════════════════════════════════════════════════════════════════════════
describe.skipIf(!vendoredAvailable)('ORACLE — the FROZEN PJOYT sites the rows do not cover', () => {
  /** Every `STA PJOYT,U` in the enemy brains, paired with the load above it. */
  function armingSites(): Array<{ line: number; source: string }> {
    const lines = sourceLines(SRC).map((l) => (l ?? '').replace(/\r$/, ''))
    const out: Array<{ line: number; source: string }> = []
    for (let i = 3780; i <= 4430; i++) {
      if (!/^\s*\S*\s*STA\s+PJOYT,U/.test(lines[i - 1] ?? '')) continue
      const prev = parseInsn(lines[i - 2], i - 1)
      out.push({ line: i, source: prev === null ? '(none)' : `${prev.op} ${prev.operand}` })
    }
    return out
  }

  it('arms PJOYT at nine ROW-backed sites and five FROZEN ones', () => {
    const sites = armingSites()
    const rowNames = new Set<string>([...WING_ROWS, ...DECISION_ROWS, CLIFF_ROW])
    const byRow = sites.filter((s) => s.source.startsWith('LDA ') && rowNames.has(s.source.slice(4)))
    const frozen = sites.filter((s) => /^LDA #/.test(s.source))
    expect(byRow.length, 'PJOYT arming sites fed by a DYTBL row').toBe(9)
    expect(
      frozen.map((s) => `${s.line}:${s.source}`),
      'PJOYT arming sites fed by a hardcoded immediate',
    ).toEqual(['4009:LDA #2', '4145:LDA #8', '4200:LDA #20+1', '4416:LDA #20+1'])
    // :3825 is the fifth non-row site — a commented-out store the author replaced
    // with `BRA BOUP12` (:3824), so the bounder's DOWN path reuses BOUP12's store
    // with its OWN `LDA #2` at :3823. Counted here so "fourteen" is exhaustive.
    expect(sites.length, 'every STA PJOYT,U in the enemy brains').toBe(14)
  })

  it('freezes the DOWN-seek wing hold at 2 in BOTH brains — it is not BOUPWD/HUUPWD', () => {
    const lines = sourceLines(SRC).map((l) => (l ?? '').replace(/\r$/, ''))
    // BODN1A :3821-3824 — the bounder's down-seek flap arms a hardcoded 2 and
    // BRANCHES into BOUP12's store; B2DN1A :4006-4009 does it inline.
    expect(lines[3822], ':3823 the bounder down-seek wing-down time').toMatch(/LDA\s+#2\b/)
    expect(lines[3823], ':3824 reuses the shared store').toMatch(/BRA\s+BOUP12/)
    expect(lines[4007], ':4008 the hunter down-seek wing-down time').toMatch(/LDA\s+#2\b/)
    expect(lines[4008], ':4009 stores it').toMatch(/STA\s+PJOYT,U/)
    // So BOUPWD (:3864) and HUUPWD (:4182) are the UP-seek holds SPECIFICALLY —
    // BOUP1/B2UP1 are the climb states. Both are 2 at wave 1, which is exactly
    // why a port could wire the row to both paths and look correct until wave 3.
  })

  it('gives the DOWN-seek NO wing-up reload — the brake decides that side', () => {
    const lines = sourceLines(SRC).map((l) => (l ?? '').replace(/\r$/, ''))
    // BODN2's expiry (:3836-3839) sets PJOY back to BODN1 and CLRBs. There is no
    // second `STA PJOYT,U`, so the wings-up duration is not timed at all: BODN1
    // re-runs the BODNVY brake test every wake. The port's existing down law
    // (`flap: velY >= brake`) is therefore already correct for that half, and
    // must NOT gain a BOUPWU-style hold.
    const block = lines.slice(3833, 3840).join('\n')
    expect(block, 'BODN2 expiry returns to BODN1').toContain('BODN1')
    expect(block, 'BODN2 expiry raises the wings').toContain('CLRB')
    expect(block, 'BODN2 expiry arms no new countdown').not.toMatch(/STA\s+PJOYT,U/)
    const b2 = lines.slice(4017, 4024).join('\n')
    expect(b2, 'B2DN22 expiry returns to B2DN1').toContain('B2DN1')
    expect(b2, 'B2DN22 expiry arms no new countdown').not.toMatch(/STA\s+PJOYT,U/)
  })

  it("freezes the HUNTER's cliff dwell at 8 while the shadow's is a row (SHCLTM)", () => {
    const lines = sourceLines(SRC).map((l) => (l ?? '').replace(/\r$/, ''))
    // B2DICL :4142-4145 vs SHDICL :4373-4376 — structurally identical blocks,
    // and only the shadow's dwell was migrated to DYTBL. Both are 8 at wave 1.
    expect(lines[4141], ':4142 B2DICL').toContain('B2DICL')
    expect(lines[4143], ':4144 the hunter cliff dwell is hardcoded').toMatch(/LDA\s+#8\b/)
    expect(lines[4372], ':4373 SHDICL').toContain('SHDICL')
    expect(lines[4374], ':4375 the shadow cliff dwell is a row').toMatch(/LDA\s+SHCLTM/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// ORACLE — GREEN ON ARRIVAL. AC6: the wave-1 "free check" holds for NINE rows.
//
// The backlog promised it for all eleven. Asserting the blanket version would
// redden on two rows that are CORRECTLY ported — the defect this group exists
// to make impossible.
// ═════════════════════════════════════════════════════════════════════════════
describe.skipIf(!vendoredAvailable)('ORACLE — the free check: nine rows match, two diverge', () => {
  /** Re-read a row's GA1 column 1 (`starts[1]`) straight out of its DYWORD line. */
  function startColumn1(row: string): number {
    const lines = sourceLines(SRC)
    const def = lines
      .map((l) => (l ?? '').replace(/\r$/, ''))
      .find((l) => /^\s*DYWORD\s/.test(l) && l.trim().endsWith(row))
    expect(def, `${row}: DYWORD line`).toBeDefined()
    const operands = def!.match(/^\s*DYWORD\s+(\S+)/)![1].split(',')
    const tok = operands[1]
    // START2 is the GA1-default tier (GA1 0-3→col0, 4-6→col1, 7+→col2; default 5).
    const v = tok.startsWith('$') ? parseInt(tok.slice(1), 16) : parseInt(tok, 10)
    return v > 0x7fff ? v - 0x10000 : v
  }

  it('matches the pre-DYTBL immediate on the nine rows where it holds', () => {
    const insns = readInsns()
    const matching = ALL_ELEVEN.filter((r) => !(r in FREE_CHECK_EXCEPTIONS))
    expect(matching.length, 'rows the free check covers').toBe(9)
    for (const row of matching) {
      const c = consumersOf(insns, row)[0]
      const imm = commentImmediate(c.comment)
      expect(imm, `${row} at :${c.line}: the comment carries an immediate`).not.toBeNull()
      expect(startColumn1(row), `${row}: GA1 col 1 vs the ROM comment ${c.comment}`).toBe(imm)
    }
  })

  it('names the two divergent rows and pins BOTH sides of each divergence', () => {
    // AC6's teeth: the exclusion is ASSERTED, not skipped. A future author who
    // "fixes" SHLETM's start to 9 to make a blanket sweep pass reddens here.
    const insns = readInsns()
    for (const [row, want] of Object.entries(FREE_CHECK_EXCEPTIONS)) {
      const c = consumersOf(insns, row)[0]
      expect(startColumn1(row), `${row}: GA1 col 1`).toBe(want.start)
      expect(commentImmediate(c.comment), `${row}: the pre-DYTBL immediate at :${c.line}`).toBe(
        want.comment,
      )
      expect(startColumn1(row), `${row} genuinely diverges`).not.toBe(want.comment)
    }
  })

  it('holds the exception list to exactly two — a third divergence must be noticed', () => {
    const insns = readInsns()
    const diverging = ALL_ELEVEN.filter((row) => {
      const imm = commentImmediate(consumersOf(insns, row)[0].comment)
      return imm === null || startColumn1(row) !== imm
    })
    expect(diverging.sort(), 'every row whose GA1 col 1 disagrees with its comment').toEqual(
      Object.keys(FREE_CHECK_EXCEPTIONS).sort(),
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// ORACLE — GREEN ON ARRIVAL. AC5: the two up-flight VY gates are NOT a pair.
// ═════════════════════════════════════════════════════════════════════════════
describe.skipIf(!vendoredAvailable)('ORACLE — HUUPVY is timer-gated and re-arms; SHUPVY is not', () => {
  it('guards HUUPVY behind a PJOYT expiry that RE-ARMS with INC on the failing side', () => {
    const lines = sourceLines(SRC).map((l) => (l ?? '').replace(/\r$/, ''))
    // :4174-4179 — DEC PJOYT / BGT out / INC PJOYT / LDD PVELY / CMPD HUUPVY / BLT out.
    const block = lines.slice(4173, 4179)
    expect(block[0], ':4174').toContain('DEC')
    expect(block[0], ':4174').toContain('PJOYT,U')
    expect(block[1], ':4175 leaves when the timer has NOT expired').toContain('BGT')
    // The INC is the whole point: on the wake the timer expires but the climb is
    // too fast, the timer is put BACK so the next wake retries — not a full
    // cadence re-wait. A port that drops it silently slows every hunter flap.
    expect(block[2], ':4176 re-arms the timer').toContain('INC')
    expect(block[2], ':4176 re-arms the timer').toContain('PJOYT,U')
    expect(block[4], ':4178').toContain('CMPD')
    expect(block[4], ':4178').toContain('HUUPVY')
  })

  it('leaves SHUPVY with NO PJOYT instruction anywhere in its block', () => {
    const lines = sourceLines(SRC).map((l) => (l ?? '').replace(/\r$/, ''))
    // :4269-4275 — SHUP1: set PJOY, read PVELY, compare, branch. No timer at all.
    const block = lines.slice(4268, 4275)
    expect(block.join('\n'), 'the SHUP1 block reads the gate').toContain('SHUPVY')
    // PJOY (the state pointer) IS written here; PJOYT (the countdown) is not.
    // Matching on the exact token keeps `PJOY,U` from satisfying a loose search.
    expect(block.join('\n'), 'the SHUP1 block has no countdown').not.toContain('PJOYT')
  })

  it('keeps the difference structural: only ONE of the two sits under a DEC PJOYT', () => {
    const lines = sourceLines(SRC).map((l) => (l ?? '').replace(/\r$/, ''))
    const guarded = (consumerLine: number): boolean =>
      lines.slice(consumerLine - 6, consumerLine).some((l) => /\bDEC\s+PJOYT,U/.test(l))
    expect(guarded(4178), 'HUUPVY :4178 is timer-gated').toBe(true)
    expect(guarded(4272), 'SHUPVY :4272 is not').toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// RECORD — RED. The port must carry these findings, not just the behaviour.
// ═════════════════════════════════════════════════════════════════════════════
describe('RECORD — the port inventories all eleven rows as wired', () => {
  it('leaves no cadence row still owned by this story', async () => {
    const d = await loadDifficulty()
    const stillWaiting = ALL_ELEVEN.filter((r) => {
      const disp = d.ROW_DISPOSITION[r]
      return disp.kind === 'no-consumer-yet'
    })
    expect(stillWaiting, 'rows still marked no-consumer-yet after uf1-9').toEqual([])
  })

  it('names a consumer for each of the eleven', async () => {
    const d = await loadDifficulty()
    for (const row of ALL_ELEVEN) {
      const disp = d.ROW_DISPOSITION[row]
      expect(disp.kind, `${row} disposition kind`).toBe('wired')
      expect(
        disp.kind === 'wired' ? disp.consumer : '',
        `${row} names the module that reads it`,
      ).toMatch(/\S/)
    }
  })

  it('does NOT describe SHCLTM as a decision timer (AC4)', async () => {
    const d = await loadDifficulty()
    const disp = d.ROW_DISPOSITION[CLIFF_ROW]
    const text = JSON.stringify(disp)
    // The pre-uf1-9 entry read `missing: 'the "time until next decision" timer'`.
    // Wiring it without correcting the family would ship the misgrouping under a
    // `wired` label, which is worse than leaving it unwired and honest.
    expect(text.toLowerCase(), 'the SHCLTM entry').not.toContain('next decision')
    expect(text.toLowerCase(), 'the SHCLTM entry names the cliff dwell').toMatch(/cliff|shdicl|shav/)
  })

  it('keeps the four real decision rows described as decision timers', async () => {
    // The complement of the test above. Without it, "delete the word decision
    // everywhere" makes the SHCLTM test pass and destroys the distinction the
    // whole correction exists to draw.
    const d = await loadDifficulty()
    for (const row of DECISION_ROWS) {
      const disp = d.ROW_DISPOSITION[row]
      expect(JSON.stringify(disp).toLowerCase(), `${row} entry`).toMatch(/decision/)
    }
  })
})
