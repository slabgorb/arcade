// tests/transporter-source.test.ts
//
// Story jt2-6 — RED phase (O'Brien / TEA). The PROVENANCE + BYTE-GATE companion
// to tests/transporter.test.ts. The behaviour suite encodes the transporter/
// spawn-service laws; this file proves those laws are REAL in the vendored 1982
// source, RE-DERIVES the pad X/Y, the SELARE boundaries and the P1/P2 spawn X
// straight from JOUSTRV4.SRC — with a reader Dev's module never touches — and
// requires each newly-cited range to carry a committed JT26-* claim (the epic's
// ground-truth rule: new transcriptions add fully-qualified FILE:LINE claims).
//
// ─── THE DOUBLE-ENTRY (the jt1-3 tautology trap) ─────────────────────────────
// The verification path is INDEPENDENT of the generation path: this file
// evaluates the SAME operands straight out of JOUSTRV4.SRC with its own tiny
// hex±decimal evaluator, and the gate is that its numbers agree with the module's
// committed constants. A decoder that re-runs itself proves only determinism; two
// independent derivations agreeing prove correctness.
//
// ─── THE COLOR1 TRAP (why the boundary re-derivation is not `parseInt`) ───────
// JOUSTRV4.SRC:6414 is `CMPA #$A3+6   $8A+6   BOTTOM AREA3 FREE?`: the OPERAND is
// `$A3+6` (=$A9), and `$8A+6` (=$90) is a DEAD second column the assembler treats
// as comment — the operand field ends at the first whitespace. A reader that
// split on whitespace, or that grabbed the wrong column, would pin the bottom
// third 25 rows too high. The extractor here captures only the operand and a
// dedicated test asserts the dead column is present but NOT the boundary.
//
// ─── DEGRADATION (the jt1-3 / tp1-8 CI path) ─────────────────────────────────
// CI clones only the joust subrepo and has no vendored tree, so every source
// re-derivation SKIPS (describe.skipIf(!vendoredAvailable)). The claim-coverage
// checks read the committed claims/ and run EVERYWHERE. Every vendored read lives
// inside an it() body (the tp1-8 collection trap).

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines, parseStatement } from './helpers/joust-source.js'
import { loadTransporter, type PadId } from './helpers/transporter-contract.js'
// jt9-2 swept this suite's local pre-hardening claims loader onto the shared one
// jt8-3 extracted. Its `claimCovers` was a SUPERSET, not a copy — see
// `claimCoversWithPrefix` below.
import { loadClaims, claimCovers, type Claim } from './helpers/claims.js'

// ─────────────────────────────────────────────────────────────────────────────
// Claims plumbing (the wave-source.test.ts pattern).
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Covered by a claim in [start,end] whose id carries `prefix`.
 *
 * This one is NOT a copy of the shared `claimCovers` — it is a strict superset.
 * jt2-6 needs the id filter so an existing JT8/JT23 citation cannot cover this
 * story's range vacuously, and the shared helper has no such filter. jt9-2 kept
 * the narrowing here and delegated the range match, so the coverage rule itself
 * lives in exactly one place.
 */
function claimCoversWithPrefix(
  claims: readonly Claim[],
  file: string,
  start: number,
  end: number,
  prefix: string,
): boolean {
  return claimCovers(
    claims.filter((c) => (c.id ?? '').startsWith(prefix)),
    file,
    start,
    end,
  )
}

const line = (file: string, n: number): string => sourceLines(file)[n - 1] ?? ''

/**
 * Evaluate a Motorola operand that is a head literal plus `±decimal` terms —
 * `$6A+7`, `$51-1`, `$A3+6`, `100`. Hex head carries `$`, everything is signed
 * additively. This is the ONE place the boundary/pad values are computed on the
 * verification side; keep it tiny and obviously correct.
 */
function evalArith(tok: string): number {
  return tok
    .split(/(?=[+-])/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .reduce((acc, part) => {
      const sign = part.startsWith('-') ? -1 : 1
      const body = part.replace(/^[+-]/, '')
      const val = body.startsWith('$') ? parseInt(body.slice(1), 16) : parseInt(body, 10)
      return acc + sign * val
    }, 0)
}

/** Pull the `#operand` off a `CMPA #…` / `LDX #…` line (stops at whitespace). */
function immediateOperand(text: string): string {
  const m = text.match(/#(\S+)/)
  if (!m) throw new Error(`no #immediate operand in: ${JSON.stringify(text)}`)
  return m[1]
}

// ─────────────────────────────────────────────────────────────────────────────
// THE LAWS RE-DERIVE FROM THE VENDORED SOURCE. Each maps to the vendored line
// that carries it and the substrings that MUST be there. If the ROM changes
// under us, this reds before any behaviour test can pass on a lie.
// ─────────────────────────────────────────────────────────────────────────────
const LAWS: ReadonlyArray<{ name: string; file: string; n: number; must: readonly string[] }> = [
  // ── the transporter record layout (offsets) ─────────────────────────────────
  { name: 'TIMAGE = image source address (offset 0)', file: 'JOUSTRV4.SRC', n: 96, must: ['TIMAGE', 'RMB', 'SOURCE ADDRESS OF IMAGE'] },
  { name: 'TPOSX = transporter X pixel', file: 'JOUSTRV4.SRC', n: 97, must: ['TPOSX', 'TRANSPORTER X PIXEL POSITION'] },
  { name: 'TPOSY = transporter Y pixel', file: 'JOUSTRV4.SRC', n: 98, must: ['TPOSY', 'TRANSPORTER Y PIXEL POSITION'] },
  { name: 'TCURUSE = in-use flag address (offset 6)', file: 'JOUSTRV4.SRC', n: 99, must: ['TCURUSE', 'IN USE'] },
  // ── the four pads (TR1ID..TR4ID) ────────────────────────────────────────────
  { name: 'transporter location table label', file: 'JOUSTRV4.SRC', n: 93, must: ['TRANSPORTER LOCATION TABLE'] },
  { name: 'TR1ID FDB TRANS1,$6A+7,$51-1,CURTR1', file: 'JOUSTRV4.SRC', n: 5587, must: ['TR1ID', 'FDB', 'TRANS1,$6A+7,$51-1,CURTR1'] },
  { name: 'TR2ID FDB TRANS2,$E0+7,$81-1,CURTR2', file: 'JOUSTRV4.SRC', n: 5588, must: ['TR2ID', 'FDB', 'TRANS2,$E0+7,$81-1,CURTR2'] },
  { name: 'TR3ID FDB TRANS3,$10+7,$8A-1,CURTR3', file: 'JOUSTRV4.SRC', n: 5589, must: ['TR3ID', 'FDB', 'TRANS3,$10+7,$8A-1,CURTR3'] },
  { name: 'TR4ID FDB TRANS4,$78+7,$D3-1,CURTR4', file: 'JOUSTRV4.SRC', n: 5590, must: ['TR4ID', 'FDB', 'TRANS4,$78+7,$D3-1,CURTR4'] },
  // ── SELARE: the empty-third boundaries ──────────────────────────────────────
  { name: 'SELARE reads the object Y', file: 'JOUSTRV4.SRC', n: 6413, must: ['SELARE', 'LDA', 'PPOSY+1,X'] },
  { name: 'bottom third boundary $A3+6 (dead $8A+6 column)', file: 'JOUSTRV4.SRC', n: 6414, must: ['CMPA', '#$A3+6', 'BOTTOM', 'AREA3'] },
  { name: 'below bottom → keep checking', file: 'JOUSTRV4.SRC', n: 6415, must: ['BLO', '1$'] },
  { name: 'else mark AREA3 occupied', file: 'JOUSTRV4.SRC', n: 6416, must: ['INC', 'AREA3'] },
  { name: 'middle third boundary $51', file: 'JOUSTRV4.SRC', n: 6419, must: ['CMPA', '#$51', 'MIDDLE', 'AREA2'] },
  { name: 'below middle → top', file: 'JOUSTRV4.SRC', n: 6420, must: ['BLO', '2$'] },
  { name: 'else mark AREA2 occupied', file: 'JOUSTRV4.SRC', n: 6421, must: ['INC', 'AREA2'] },
  { name: 'top third: mark AREA1', file: 'JOUSTRV4.SRC', n: 6424, must: ['INC', 'AREA1', 'TOP AREA1'] },
  // ── the AREA empty flags ────────────────────────────────────────────────────
  { name: 'AREA1 = top empty flag', file: 'RAMDEF.SRC', n: 302, must: ['AREA1', 'TOP AREA', 'SELARE'] },
  { name: 'AREA2 = middle empty flag', file: 'RAMDEF.SRC', n: 303, must: ['AREA2', 'MIDDLE AREA', 'SELARE'] },
  { name: 'AREA3 = bottom empty flag', file: 'RAMDEF.SRC', n: 304, must: ['AREA3', 'BOTTOM AREA', 'SELARE'] },
  // ── the empty-third scan + select ───────────────────────────────────────────
  { name: 'clear the AREA flags before the scan', file: 'JOUSTRV4.SRC', n: 5622, must: ['CLR', 'AREA1', 'CLEAR AREA'] },
  { name: 'SELARE-scan each active object', file: 'JOUSTRV4.SRC', n: 5634, must: ['JSR', 'SELARE', 'AREA IS CLEAR'] },
  { name: 'bottom area empty? then use its transporter', file: 'JOUSTRV4.SRC', n: 5641, must: ['LDA', 'AREA3', 'BOTTOM AREA'] },
  { name: 'the free-transporter check for the empty third', file: 'JOUSTRV4.SRC', n: 5643, must: ['LDA', 'STTR4', 'NOT IN USE'] },
  { name: 'middle area empty?', file: 'JOUSTRV4.SRC', n: 5645, must: ['LDA', 'AREA2', 'MIDDLE AREA'] },
  { name: 'top area empty?', file: 'JOUSTRV4.SRC', n: 5651, must: ['LDA', 'AREA1', 'TOP AREA'] },
  // ── the take-a-number ticket queue ──────────────────────────────────────────
  { name: 'player takes a number (NPSERV)', file: 'JOUSTRV4.SRC', n: 5615, must: ['LDA', 'NPSERV', 'TAKE A NUMBER'] },
  { name: 'NPSERV incremented on the draw', file: 'JOUSTRV4.SRC', n: 5617, must: ['INC', 'NPSERV'] },
  { name: "player's turn? number == LPSERV", file: 'JOUSTRV4.SRC', n: 5620, must: ['CREPLY', 'CMPB', 'LPSERV', 'THIS PLAYERS TURN'] },
  { name: 'enemy takes a number (NESERV)', file: 'JOUSTRV4.SRC', n: 5664, must: ['LDA', 'NESERV', 'TAKE A NUMBER'] },
  { name: 'NESERV incremented on the draw', file: 'JOUSTRV4.SRC', n: 5666, must: ['INC', 'NESERV'] },
  { name: 'any players still holding a number? (NPSERV vs LPSERV)', file: 'JOUSTRV4.SRC', n: 5672, must: ['LDA', 'NPSERV', 'HOLDING A NUMBER'] },
  { name: 'compare against LPSERV', file: 'JOUSTRV4.SRC', n: 5673, must: ['CMPA', 'LPSERV'] },
  { name: 'players find a transporter FIRST', file: 'JOUSTRV4.SRC', n: 5674, must: ['BNE', 'CRELP', 'FIND A TRANSPORTER 1ST'] },
  { name: "enemy's turn? number == LESERV", file: 'JOUSTRV4.SRC', n: 5675, must: ['CMPB', 'LESERV', 'THIS ENEMIES TURN'] },
  { name: 'serving a player bumps LPSERV', file: 'JOUSTRV4.SRC', n: 5722, must: ['INC', 'LPSERV'] },
  { name: 'serving an enemy bumps LESERV', file: 'JOUSTRV4.SRC', n: 5724, must: ['INC', 'LESERV'] },
  // ── the serve RAM defs ──────────────────────────────────────────────────────
  { name: 'NPSERV RAM def (players take-a-number stack)', file: 'RAMDEF.SRC', n: 248, must: ['NPSERV', 'TAKE A NUMBER'] },
  { name: 'LPSERV RAM def (player in service)', file: 'RAMDEF.SRC', n: 249, must: ['LPSERV', 'IN SERVICE'] },
  { name: 'NESERV RAM def (enemies take-a-number stack)', file: 'RAMDEF.SRC', n: 250, must: ['NESERV', 'TAKE A NUMBER'] },
  { name: 'LESERV RAM def (enemy in service)', file: 'RAMDEF.SRC', n: 251, must: ['LESERV', 'IN SERVICE'] },
  // ── timed materialisation: the nap, the abort, the collision re-enable ───────
  { name: 'the materialisation naps 1 frame per pass (PNAP)', file: 'JOUSTRV4.SRC', n: 5828, must: ['PCNAP', '1'] },
  { name: 'read the joystick word', file: 'JOUSTRV4.SRC', n: 5831, must: ['LDD', 'CURJOY'] },
  { name: 'ANY nonzero joystick aborts to 51$', file: 'JOUSTRV4.SRC', n: 5841, must: ['BNE', '51$', 'FLAP'] },
  { name: 'else time out to 50$ when the window elapses', file: 'JOUSTRV4.SRC', n: 5848, must: ['BEQ', '50$'] },
  { name: 'the abort handler — ABORTED EARLY', file: 'JOUSTRV4.SRC', n: 5892, must: ['51$', 'ABORTED EARLY'] },
  { name: 'PLYINT re-enables collisions ($80)', file: 'JOUSTRV4.SRC', n: 5923, must: ['LDA', '#$80', 'ENABLE', 'COLISIONS'] },
  { name: 'OR the enable bit into PID', file: 'JOUSTRV4.SRC', n: 5924, must: ['ORA', 'PID,U'] },
  { name: 'store the now-collidable PID', file: 'JOUSTRV4.SRC', n: 5925, must: ['STA', 'PID,U'] },
  // ── the player spawn constants ──────────────────────────────────────────────
  { name: 'create player 1', file: 'JOUSTRV4.SRC', n: 1019, must: ['PROCCR', 'PLAYR', 'PLYID', 'PLAYER #1'] },
  { name: 'P1 mount = OSTRICH', file: 'JOUSTRV4.SRC', n: 1020, must: ['LDD', 'OSTRICH'] },
  { name: 'P1 faces right (PFACE=0)', file: 'JOUSTRV4.SRC', n: 1022, must: ['CLR', 'PFACE,Y', 'FACING RIGHT'] },
  { name: 'P1 X = 100', file: 'JOUSTRV4.SRC', n: 1023, must: ['LDX', '#100'] },
  { name: 'create player 2', file: 'JOUSTRV4.SRC', n: 1034, must: ['PROCCR', 'PLAYR', 'PLYID', 'PLAYER #2'] },
  { name: 'P2 mount = STORK', file: 'JOUSTRV4.SRC', n: 1035, must: ['LDD', 'STORK'] },
  { name: 'P2 faces left (PFACE=$FF)', file: 'JOUSTRV4.SRC', n: 1037, must: ['LDB', '#$FF', 'FACEING LEFT'] },
  { name: 'P2 X = 200', file: 'JOUSTRV4.SRC', n: 1039, must: ['LDX', '#200'] },
  // ── PFACE semantics (already claimed JT23-015 — provenance guard only) ───────
  { name: 'PFACE 0=right / <>0=left', file: 'RAMDEF.SRC', n: 186, must: ['PFACE', '0=RIGHT', 'LEFT'] },
]

describe.skipIf(!vendoredAvailable)('the transporter laws are really in the 1982 source', () => {
  it.each(LAWS)('$file:$n carries "$name"', ({ file, n, must }) => {
    const text = line(file, n)
    for (const token of must) {
      expect(
        text,
        `${file}:${n} must carry ${JSON.stringify(token)} — got: ${JSON.stringify(text)}`,
      ).toContain(token)
    }
  })

  it('the SELARE bottom boundary is the OPERAND $A3+6, not the dead $8A+6 column (COLOR1 trap)', () => {
    const text = line('JOUSTRV4.SRC', 6414)
    // Both strings are present on the line…
    expect(text).toContain('$A3+6')
    expect(text, 'the dead alternate column is really there').toContain('$8A+6')
    // …but only the first is the operand. The operand extractor takes $A3+6, and
    // the two evaluate to DIFFERENT thirds — $A9 (169) vs $90 (144).
    expect(immediateOperand(text)).toBe('$A3+6')
    expect(evalArith('$A3+6'), 'the real boundary').toBe(0xa9)
    expect(evalArith('$8A+6'), 'the dead column would be 25 rows too high').toBe(0x90)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE BYTE GATE — the module's committed constants re-derive from the source.
// This is the jt1-3 double-entry for the pad X/Y, the SELARE boundaries and the
// P1/P2 spawn X. RED until src/core/transporter.ts exists (loadTransporter throws).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the committed constants re-derive byte-for-byte from the source', () => {
  it('every pad X/Y equals the evaluated TPOSX/TPOSY of its FDB row (JOUSTRV4.SRC:5587-5590)', async () => {
    const t = await loadTransporter()
    const ids: PadId[] = ['TR1', 'TR2', 'TR3', 'TR4']
    for (let i = 0; i < 4; i++) {
      const st = parseStatement(line('JOUSTRV4.SRC', 5587 + i), 5587 + i)
      expect(st, `pad row ${5587 + i} parses as an FDB`).not.toBeNull()
      // operands: TIMAGE, TPOSX, TPOSY, TCURUSE.
      const x = evalArith(st!.operands[1])
      const y = evalArith(st!.operands[2])
      const pad = t.PADS.find((p) => p.id === ids[i])!
      expect([pad.x, pad.y], `${ids[i]} module vs source`).toEqual([x, y])
    }
  })

  it('the third boundaries equal the SELARE CMPA operands (JOUSTRV4.SRC:6414,6419)', async () => {
    const t = await loadTransporter()
    expect(t.THIRD_BOTTOM_MIN, '$A3+6').toBe(evalArith(immediateOperand(line('JOUSTRV4.SRC', 6414))))
    expect(t.THIRD_MIDDLE_MIN, '$51').toBe(evalArith(immediateOperand(line('JOUSTRV4.SRC', 6419))))
  })

  it('the P1/P2 spawn X equal the LDX #100 / #200 operands (JOUSTRV4.SRC:1023,1039)', async () => {
    const t = await loadTransporter()
    expect(t.PLAYER1_SPAWN.x, '#100').toBe(evalArith(immediateOperand(line('JOUSTRV4.SRC', 1023))))
    expect(t.PLAYER2_SPAWN.x, '#200').toBe(evalArith(immediateOperand(line('JOUSTRV4.SRC', 1039))))
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EVERY LAW THIS STORY PINS IS COVERED BY A COMMITTED JT26 CLAIM. Several lines
// already carry a JT8/JT23 dossier claim (README: some anchors hold two claims by
// design); jt2-6's transcription adds its OWN JT26-* claim per range, so the
// coverage here REQUIRES the JT26 prefix — an existing JT8 claim does not satisfy
// it. Runs EVERYWHERE (reads the committed claims/).
// ─────────────────────────────────────────────────────────────────────────────
const CITED_RANGES: ReadonlyArray<{ law: string; file: string; start: number; end: number }> = [
  { law: 'the transporter record layout', file: 'JOUSTRV4.SRC', start: 96, end: 99 },
  { law: 'the four pads by tier (TR1ID..TR4ID)', file: 'JOUSTRV4.SRC', start: 5587, end: 5590 },
  { law: 'the SELARE empty-third boundaries', file: 'JOUSTRV4.SRC', start: 6413, end: 6424 },
  { law: 'the AREA empty flags', file: 'RAMDEF.SRC', start: 302, end: 304 },
  { law: 'the empty-third scan + select', file: 'JOUSTRV4.SRC', start: 5622, end: 5654 },
  { law: 'the take-a-number ticket queue', file: 'JOUSTRV4.SRC', start: 5615, end: 5676 },
  { law: 'the serve increments (LPSERV/LESERV)', file: 'JOUSTRV4.SRC', start: 5722, end: 5724 },
  { law: 'the serve RAM defs (NPSERV/LPSERV/NESERV/LESERV)', file: 'RAMDEF.SRC', start: 248, end: 251 },
  { law: 'the timed-materialisation abort loop', file: 'JOUSTRV4.SRC', start: 5828, end: 5892 },
  { law: 'the collision re-enable (PID $80)', file: 'JOUSTRV4.SRC', start: 5923, end: 5925 },
  { law: 'the P1/P2 spawn constants', file: 'JOUSTRV4.SRC', start: 1019, end: 1039 },
]

describe('each jt2-6 law is pinned by a committed JT26 claim (transcription gate)', () => {
  it('loads a non-empty claims set (the guard must have teeth)', () => {
    expect(loadClaims().length, 'docs/rom-study/claims/*.json must exist').toBeGreaterThan(0)
  })

  it('jt2-6 added its own transporter claims (JT26-*)', () => {
    const jt26 = loadClaims().filter((c) => /^JT26-\d+$/.test(c.id ?? ''))
    expect(
      jt26.length,
      'the new transcription claims are committed to docs/rom-study/claims/transporter.json',
    ).toBeGreaterThan(0)
  })

  it.each(CITED_RANGES)('$law ($file:$start-$end) has a JT26 claim', ({ file, start, end }) => {
    const claims = loadClaims()
    expect(
      claimCoversWithPrefix(claims, file, start, end, 'JT26'),
      `no JT26 claim pins ${file}:${start}-${end} — jt2-6 transcribes this law, so add a ` +
        `JT26-* claim to docs/rom-study/claims/transporter.json (an existing JT8/JT23 claim does not count)`,
    ).toBe(true)
  })

  it('every JT26 claim names its own FILE:LINESPEC in its text (the jt1-2 R2 standard)', () => {
    const jt26 = loadClaims().filter((c) => /^JT26-\d+$/.test(c.id ?? ''))
    const bare = jt26
      .filter((c) => !/[\w./]+\.(?:SRC|DOC|PIC|FRM|cpp):\d/.test(c.claim ?? ''))
      .map((c) => c.id)
    expect(bare, 'these JT26 claims do not name their own source line in their text').toEqual([])
  })

  it('every claim id is still unique (JT26 does not collide with JT25/JT8/…)', () => {
    const ids = loadClaims().map((c) => c.id)
    const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
    expect(dupes, 'duplicate claim ids').toEqual([])
  })
})
