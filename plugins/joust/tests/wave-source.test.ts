// tests/wave-source.test.ts
//
// Story jt2-5 — RED phase (O'Brien / TEA). The PROVENANCE + BYTE-GATE companion
// to tests/wave.test.ts. The behaviour suite encodes the wave-machine laws; this
// one proves those laws are REAL in the vendored 1982 source, RE-DERIVES the full
// 90-row WAVTBL byte-for-byte from JOUSTRV4.SRC and pins it against the committed
// WAVE_TABLE, and requires each newly-cited range to carry a committed JT25-*
// claim — AC-1's "…committed with a re-derivation gate against the vendored
// source (the jt1-3 byte-gate pattern); … claims entries for the format and the
// decode".
//
// ─── THE DOUBLE-ENTRY, RESTATED (the jt1-3 tautology trap) ────────────────────
// The failure mode this suite refuses: Dev writes a decoder, the test re-runs it,
// the two agree, everything is green, and the gate has proven only that the
// decoder is deterministic. So the verification path is INDEPENDENT of the
// generation path: this file re-reads the SAME FCB rows straight out of
// JOUSTRV4.SRC with a reader that Dev's module never touches (the pictures-gate
// independence rule still holds — nothing under src/ imports the test reader),
// and the gate is that the two derivations agree byte-for-byte.
//
// THE STATUS BYTE uses assembler EQU symbols (WBPER, WBCL1, …), not raw hex — so
// this file builds its wave-status symbol table by RE-DERIVING each EQU from
// JOUSTRV4.SRC:185-197 (not by hand-typing values), then resolves the status
// column with it. A wrong EQU value can therefore only produce a false RED that
// a human sees, never a false green that agrees with a wrong module.
//
// ─── DEGRADATION (the jt1-3 CI path) ─────────────────────────────────────────
// CI clones only the joust subrepo and has no vendored tree, so every source
// re-derivation SKIPS there (describe.skipIf(!vendoredAvailable)). The
// claim-coverage checks read the committed claims/ and run EVERYWHERE. Every
// vendored read lives inside an it() body (the tp1-8 collection trap).

import { describe, it, expect } from 'vitest'
import {
  vendoredAvailable,
  sourceLines,
  parseStatement,
  evalOperand,
} from './helpers/joust-source.js'
import { loadWave, type WaveRow } from './helpers/wave-contract.js'
// jt9-2 swept this suite's local pre-hardening claims plumbing onto the shared
// loader jt8-3 extracted. Behaviour-preserving.
import { loadClaims, claimCovers } from './helpers/claims.js'

const line = (file: string, n: number): string => sourceLines(file)[n - 1] ?? ''

// ─────────────────────────────────────────────────────────────────────────────
// THE INDEPENDENT WAVE READER. Builds the wave-status EQU symbol table from the
// source, then flattens the WAVTBL rows to bytes with it. Dev's module never
// touches any of this.
// ─────────────────────────────────────────────────────────────────────────────

/** Re-derive the wave-status EQUs (JOUSTRV4.SRC:185-197) into a symbol table. */
function waveStatusSymbols(): Map<string, number> {
  const lines = sourceLines('JOUSTRV4.SRC')
  const sym = new Map<string, number>()
  const resolveTok = (tok: string): number => {
    const v = evalOperand(tok.trim())
    if (typeof v === 'number') return v
    const s = sym.get(tok.trim())
    if (s === undefined) throw new Error(`unresolved wave symbol ${tok}`)
    return s
  }
  const resolveExpr = (expr: string): number =>
    expr.split('+').reduce((acc, t) => acc + resolveTok(t), 0) & 0xffff
  for (let n = 185; n <= 197; n++) {
    const m = (lines[n - 1] ?? '').match(/^(\S+)\s+EQU\s+(\S+)/)
    if (!m) continue
    sym.set(m[1], resolveExpr(m[2]))
  }
  return sym
}

/** Resolve one FCB operand (a literal, or a `+`-sum of literals and wave symbols) to a byte. */
function resolveByte(tok: string, sym: Map<string, number>): number {
  return (
    tok.split('+').reduce((acc, part) => {
      const p = part.trim()
      const v = evalOperand(p)
      if (typeof v === 'number') return acc + v
      const s = sym.get(p)
      if (s === undefined) throw new Error(`unresolved WAVTBL operand ${p}`)
      return acc + s
    }, 0) & 0xff
  )
}

/** Flatten JOUSTRV4.SRC:2439-2545 (waves 1-90) to bytes, independently of the module. */
function waveTableBytesFromSource(): number[] {
  const sym = waveStatusSymbols()
  const lines = sourceLines('JOUSTRV4.SRC')
  const out: number[] = []
  for (let n = 2439; n <= 2545; n++) {
    const st = parseStatement(lines[n - 1], n)
    if (!st || st.op !== 'FCB') continue
    for (const tok of st.operands) out.push(resolveByte(tok, sym))
  }
  return out
}

/** Flatten a decoded row back to its 4 nibble-packed bytes. */
function rowBytes(r: WaveRow): number[] {
  return [
    ((r.bounders & 0xf) << 4) | (r.hunters & 0xf),
    ((r.lords & 0xf) << 4) | (r.pursuers & 0xf),
    r.pterodactyls & 0xff,
    r.status & 0xff,
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// THE LAWS RE-DERIVE FROM THE VENDORED SOURCE (AC-1, byte-gated).
// Each mapped to the vendored line that carries it and the substrings that MUST
// be there. If the ROM changes under us, this reds before any behaviour test can
// pass on a lie.
// ─────────────────────────────────────────────────────────────────────────────
const LAWS: ReadonlyArray<{ name: string; file: string; n: number; must: readonly string[] }> = [
  // ── the 4-byte nibble-packed row format (WAVE OFFSETS) ──────────────────────
  { name: 'WBOUND = bounders, upper nibble', file: 'JOUSTRV4.SRC', n: 175, must: ['WBOUND', 'BOUNDERS', 'UPPER NIBBLE'] },
  { name: 'WHUNT = hunters, lower nibble', file: 'JOUSTRV4.SRC', n: 176, must: ['WHUNT', 'HUNTERS', 'LOWER NIBBLE'] },
  { name: 'WLORD = shadow lords, upper nibble', file: 'JOUSTRV4.SRC', n: 177, must: ['WLORD', 'SHADOW LORDS', 'UPPER NIBBLE'] },
  { name: 'WPERSUE = pursuers, lower nibble', file: 'JOUSTRV4.SRC', n: 178, must: ['WPERSUE', 'PERSUERS', 'LOWER NIBBLE'] },
  { name: 'WPTEN = pterodactyls', file: 'JOUSTRV4.SRC', n: 179, must: ['WPTEN', 'PTERODACTYLS'] },
  { name: 'WSTATUS = the status byte', file: 'JOUSTRV4.SRC', n: 180, must: ['WSTATUS', 'STATUS BYTE'] },
  { name: 'WLEN closes the 4-byte row', file: 'JOUSTRV4.SRC', n: 181, must: ['WLEN', 'EQU', '*'] },
  // ── the status byte bit definitions ─────────────────────────────────────────
  { name: 'WBPER = $01, the persue bit', file: 'JOUSTRV4.SRC', n: 185, must: ['WBPER', 'EQU', '$01', 'PERSUE'] },
  { name: 'WBJSR0 = $02, a JSR table offset bit', file: 'JOUSTRV4.SRC', n: 186, must: ['WBJSR0', 'EQU', '$02', 'JSR TABLE OFFSET'] },
  { name: 'WBJSR1 = $04, and the phantom-offset comment (12,14 never implemented)', file: 'JOUSTRV4.SRC', n: 187, must: ['WBJSR1', 'EQU', '$04', '2,4,6,8,10,12,14'] },
  { name: 'WBJSR2 = $08', file: 'JOUSTRV4.SRC', n: 188, must: ['WBJSR2', 'EQU', '$08'] },
  { name: 'WBCL1L = $10, cliff1L destroyed (DATA)', file: 'JOUSTRV4.SRC', n: 189, must: ['WBCL1L', 'EQU', '$10', 'CLIFF1L', 'DESTROYED'] },
  { name: 'WBCL4 = $80, cliff4 destroyed (DATA)', file: 'JOUSTRV4.SRC', n: 192, must: ['WBCL4', 'EQU', '$80', 'CLIFF4', 'DESTROYED'] },
  { name: 'WBCLS = all cliffs', file: 'JOUSTRV4.SRC', n: 197, must: ['WBCLS', 'EQU', 'WBCL1+WBCL2+WBCL4'] },
  // ── the BCD wave counter (independent of the table index) ───────────────────
  { name: 'WAVBCD is the BCD wave number', file: 'JOUSTRV4.SRC', n: 2001, must: ['LDA', 'WAVBCD', 'BCD WAVE NUMBER'] },
  { name: 'increment by one, next wave 0-99', file: 'JOUSTRV4.SRC', n: 2002, must: ['ADDA', '#$01', '0-99'] },
  { name: 'DAA — decimal-adjust makes it BCD', file: 'JOUSTRV4.SRC', n: 2003, must: ['DAA'] },
  { name: 'stored back to WAVBCD', file: 'JOUSTRV4.SRC', n: 2004, must: ['STA', 'WAVBCD'] },
  // ── the table pointer + the loop-at-81 ──────────────────────────────────────
  { name: 'PWAVE seeded one row BEFORE the table (WAVTBL-WLEN)', file: 'JOUSTRV4.SRC', n: 1878, must: ['LDD', '#WAVTBL-WLEN'] },
  { name: 'PWAVE is the wave table address', file: 'JOUSTRV4.SRC', n: 2015, must: ['LDX', 'PWAVE', 'WAVE TABLE ADDRESS'] },
  { name: 'advance one row (WLEN) per wave', file: 'JOUSTRV4.SRC', n: 2017, must: ['LEAX', 'WLEN'] },
  { name: 'at end of table?', file: 'JOUSTRV4.SRC', n: 2018, must: ['CMPX', '#WTBEND', 'END OF TABLE'] },
  { name: 'restart at WTBRST (wave 81)', file: 'JOUSTRV4.SRC', n: 2020, must: ['LDX', '#WTBRST', 'RESTART'] },
  { name: 'the WAVTBL label', file: 'JOUSTRV4.SRC', n: 2438, must: ['WAVTBL'] },
  { name: 'wave 1 row = $30,$01,0,2 (needs intro)', file: 'JOUSTRV4.SRC', n: 2439, must: ['FCB', '$30,$01,0,2', 'WAVE 1'] },
  { name: 'WTBRST plateau row = $00,$AF,0,… (all shadow lords, max pursuit)', file: 'JOUSTRV4.SRC', n: 2535, must: ['WTBRST', 'FCB', '$00,$AF,0,WBPER+WBCL1+0', 'WAVE 81'] },
  { name: 'WTBEND closes the loop, repeat at WTBRST', file: 'JOUSTRV4.SRC', n: 2546, must: ['WTBEND', 'EQU', 'REPEAT AT'] },
  // ── the WJSRTB six-type dispatch skeleton ───────────────────────────────────
  { name: 'dispatch masks the low nibble to the JSR bits ($0E)', file: 'JOUSTRV4.SRC', n: 2042, must: ['ANDB', '#WBJSR0+WBJSR1+WBJSR2', 'MASK'] },
  { name: 'index into WJSRTB', file: 'JOUSTRV4.SRC', n: 2043, must: ['LDX', '#WJSRTB', 'JSR TABLE'] },
  { name: 'call the wave-type routine', file: 'JOUSTRV4.SRC', n: 2044, must: ['JSR', '[B,X]'] },
  { name: 'WJSRTB[0] = WAVRTS (nop)', file: 'JOUSTRV4.SRC', n: 2586, must: ['WJSRTB', 'FDB', 'WAVRTS', 'NOP'] },
  { name: 'WJSRTB[1] = WINTRO', file: 'JOUSTRV4.SRC', n: 2587, must: ['FDB', 'WINTRO', 'INTRODUCTION'] },
  { name: 'WJSRTB[2] = WCOOP', file: 'JOUSTRV4.SRC', n: 2588, must: ['FDB', 'WCOOP', 'CO-OPERATION'] },
  { name: 'WJSRTB[3] = WGLAD', file: 'JOUSTRV4.SRC', n: 2589, must: ['FDB', 'WGLAD', 'GLADIATOR'] },
  { name: 'WJSRTB[4] = WAVEGG', file: 'JOUSTRV4.SRC', n: 2590, must: ['FDB', 'WAVEGG', 'EGG WAVE'] },
  { name: 'WJSRTB[5] = WPTERO', file: 'JOUSTRV4.SRC', n: 2591, must: ['FDB', 'WPTERO', 'PTERODACTYL'] },
  // ── the degrade laws ────────────────────────────────────────────────────────
  { name: 'co-op checks player 2 alive', file: 'JOUSTRV4.SRC', n: 2628, must: ['WCOOP', 'SPLY2+6', 'TWO PLAYERS ONLY'] },
  { name: 'co-op → survival when player 2 is out', file: 'JOUSTRV4.SRC', n: 2629, must: ['BEQ', 'WAVSUR', 'SURVIVAL WAVE'] },
  { name: 'co-op → survival when player 1 is out', file: 'JOUSTRV4.SRC', n: 2631, must: ['BEQ', 'WAVSUR', 'PLAYER 1 DEAD'] },
  { name: 'gladiator checks player 1 alive', file: 'JOUSTRV4.SRC', n: 2697, must: ['WGLAD', 'SPLY1+6', 'TWO PLAYERS ONLY'] },
  { name: 'gladiator no-ops (WAVRT2 RTS) when player 1 is out', file: 'JOUSTRV4.SRC', n: 2698, must: ['BEQ', 'WAVRT2', 'PLAYER 1 DEAD'] },
  { name: 'gladiator no-ops when player 2 is out', file: 'JOUSTRV4.SRC', n: 2700, must: ['BEQ', 'WAVRT2', 'PLAYER 2 DEAD'] },
  // ── the message beats (approximately 1 s — NO exact duration) ────────────────
  { name: 'WAVDEL ~1 s = 180/6 (a message-loop count, not a pinned second)', file: 'JOUSTRV4.SRC', n: 2045, must: ['LDA', '#180/6', 'WAIT A SECOND'] },
  { name: 'the intro reset ~1 s delay = 90/6', file: 'JOUSTRV4.SRC', n: 2601, must: ['LDA', '#90/6', '1 SECOND DELAY'] },
  // ── the pursuit-nibble seed + EMYTIM divider (jt2-2 inputs) ──────────────────
  { name: 'the pursuit nibble mask (→ seedBudget)', file: 'JOUSTRV4.SRC', n: 2076, must: ['ANDA', '#$0F'] },
  { name: 'seed stored to WSMART', file: 'JOUSTRV4.SRC', n: 2077, must: ['STA', 'WSMART'] },
  { name: 'the CIA 15-second growth reload (112)', file: 'JOUSTRV4.SRC', n: 2094, must: ['#112', '15 SECONDS'] },
  { name: 'the growth timer naps 8 frames', file: 'JOUSTRV4.SRC', n: 2096, must: ['PCNAP', '8'] },
  { name: 'EMYTIM = 2 on the bridge (1st/2nd) wave', file: 'JOUSTRV4.SRC', n: 2205, must: ['STA', 'EMYTIM', 'SLOW DOWN THE ENEMY'] },
  // ── the IFN DEBUG wave-bookkeeping oracles ──────────────────────────────────
  { name: 'death path: only an enemy (EMYID) dies here', file: 'JOUSTRV4.SRC', n: 2954, must: ['LDA', 'PID,U', 'DEAD ENEMY'] },
  { name: 'compare against the enemy id', file: 'JOUSTRV4.SRC', n: 2955, must: ['CMPA', '#EMYID'] },
  { name: 'NENEMY decremented on a death', file: 'JOUSTRV4.SRC', n: 2965, must: ['DEC', 'NENEMY', 'DECREMENT'] },
  { name: 'NENEMY oracle: must not go negative (BPL else SWI)', file: 'JOUSTRV4.SRC', n: 2967, must: ['BPL', '45$'] },
]

describe.skipIf(!vendoredAvailable)('the wave-machine laws are really in the 1982 source (AC-1)', () => {
  it.each(LAWS)('$file:$n carries "$name"', ({ file, n, must }) => {
    const text = line(file, n)
    for (const token of must) {
      expect(
        text,
        `${file}:${n} must carry ${JSON.stringify(token)} — got: ${JSON.stringify(text)}`,
      ).toContain(token)
    }
  })

  it('the WBJSR comment names the phantom offsets 12 and 14 that the six-entry table never implements', () => {
    // The negative claim's SOURCE: the offset list is 0,2,4,6,8,10,12,14 but
    // WJSRTB (2586-2591) has only six entries — 12 and 14 are unimplemented.
    const comment = line('JOUSTRV4.SRC', 187)
    expect(comment).toContain('12,14')
    const wjsrtb = sourceLines('JOUSTRV4.SRC').slice(2585, 2591) // 2586-2591
    const entries = wjsrtb.filter((l) => /^\s*(\S+\s+)?FDB\b/.test(l))
    expect(entries.length, 'WJSRTB routes exactly six types; offsets 12/14 read past it').toBe(6)
  })

  it('the WAVTBL byte range yields exactly 90 four-byte rows', () => {
    expect(waveTableBytesFromSource().length, 'waves 1-90 × 4 bytes').toBe(360)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE WAVE-STATUS SYMBOL TABLE IS RE-DERIVED, NOT HAND-TYPED (keeps the gate honest).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the wave-status EQUs re-derive from the source, not the reader', () => {
  it('resolves the composite cliff masks from their primitives', () => {
    const sym = waveStatusSymbols()
    // Primitives.
    expect(sym.get('WBPER')).toBe(0x01)
    expect(sym.get('WBJSR0')).toBe(0x02)
    expect(sym.get('WBJSR1')).toBe(0x04)
    expect(sym.get('WBJSR2')).toBe(0x08)
    expect(sym.get('WBCL1L')).toBe(0x10)
    expect(sym.get('WBCL4')).toBe(0x80)
    // Composites (WBCL1 = WBCL1L+WBCL1R, etc.) — derived, never typed.
    expect(sym.get('WBCL1')).toBe(0x30)
    expect(sym.get('WBCL12')).toBe(0x70)
    expect(sym.get('WBCL14')).toBe(0xb0)
    expect(sym.get('WBCL24')).toBe(0xc0)
    expect(sym.get('WBCLS')).toBe(0xf0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE BYTE GATE — the committed WAVE_TABLE re-derives from JOUSTRV4.SRC (AC-1).
// This is the jt1-3 gate for the 80-row (here full 90-row) decode.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the committed WAVE_TABLE re-derives byte-for-byte from the vendored source', () => {
  it('every one of the 90 rows matches its source bytes (THE GATE)', async () => {
    const wave = await loadWave()
    const derived = waveTableBytesFromSource()
    expect(wave.WAVE_TABLE.length, 'WAVE_TABLE must be the 90 committed rows').toBe(90)
    const module = wave.WAVE_TABLE.flatMap(rowBytes)
    expect(module.length).toBe(derived.length)
    // Report the FIRST divergence with its wave number + byte column, so a wrong
    // nibble split or a mistranscribed status is actionable.
    const i = module.findIndex((v, k) => v !== derived[k])
    if (i >= 0) {
      const waveNo = Math.floor(i / 4) + 1
      const col = ['bounders:hunters', 'lords:pursuers', 'pterodactyls', 'status'][i % 4]
      expect.fail(
        `wave ${waveNo} ${col}: module $${module[i].toString(16)} vs source $${derived[i].toString(16)}`,
      )
    }
    expect(module).toEqual(derived)
  })

  it('the $00,$AF plateau row (wave 81) decodes to all shadow lords at max pursuit', async () => {
    const wave = await loadWave()
    // Independently: byte1 of the WTBRST row is $AF → lords $A (10), pursuers $F (15).
    const sym = waveStatusSymbols()
    const st = parseStatement(line('JOUSTRV4.SRC', 2535), 2535)
    expect(st, 'the WTBRST row parses').not.toBeNull()
    const bytes = st!.operands.map((t) => resolveByte(t, sym))
    expect(bytes[0], 'no bounders/hunters').toBe(0x00)
    expect(bytes[1], 'lords:pursuers = $AF').toBe(0xaf)
    // And the module's wave 81 agrees.
    const row81 = wave.waveRowAt(81)
    expect([row81.bounders, row81.hunters], 'no bounders/hunters').toEqual([0, 0])
    expect(row81.lords, 'all shadow lords ($A = 10)').toBe(0xa)
    expect(row81.pursuers, 'max pursuit ($F = 15)').toBe(0xf)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EVERY LAW IS PINNED BY A COMMITTED CLAIM (AC-4, runs everywhere).
// The wave machine adds JT25-* claims in docs/rom-study/claims/wave.json.
// ─────────────────────────────────────────────────────────────────────────────
const CITED_RANGES: ReadonlyArray<{ law: string; file: string; start: number; end: number }> = [
  { law: 'the 4-byte nibble-packed row format', file: 'JOUSTRV4.SRC', start: 175, end: 181 },
  { law: 'the status byte bit definitions (cliff destruction as data)', file: 'JOUSTRV4.SRC', start: 185, end: 192 },
  { law: 'the WBJSR phantom offsets 12/14', file: 'JOUSTRV4.SRC', start: 187, end: 187 },
  { law: 'the composite cliff masks', file: 'JOUSTRV4.SRC', start: 193, end: 197 },
  { law: 'the BCD wave counter', file: 'JOUSTRV4.SRC', start: 2001, end: 2004 },
  { law: 'PWAVE seeded before the table (wave 0 never played)', file: 'JOUSTRV4.SRC', start: 1878, end: 1878 },
  { law: 'the loop-at-81 pointer advance', file: 'JOUSTRV4.SRC', start: 2015, end: 2021 },
  { law: 'the WAVTBL data + WTBRST/WTBEND', file: 'JOUSTRV4.SRC', start: 2438, end: 2439 },
  { law: 'the WTBRST plateau row', file: 'JOUSTRV4.SRC', start: 2535, end: 2535 },
  { law: 'WTBEND — the loop close', file: 'JOUSTRV4.SRC', start: 2546, end: 2546 },
  { law: 'the WJSRTB dispatch mask + call', file: 'JOUSTRV4.SRC', start: 2041, end: 2044 },
  { law: 'the six-entry WJSRTB skeleton', file: 'JOUSTRV4.SRC', start: 2586, end: 2591 },
  { law: 'the co-op → survival degrade', file: 'JOUSTRV4.SRC', start: 2628, end: 2631 },
  { law: 'the gladiator no-op solo degrade', file: 'JOUSTRV4.SRC', start: 2697, end: 2700 },
  { law: 'the WAVDEL ~1 s message beat', file: 'JOUSTRV4.SRC', start: 2045, end: 2045 },
  { law: 'the intro ~1 s reset delay', file: 'JOUSTRV4.SRC', start: 2601, end: 2601 },
  { law: 'the enemy-id death oracle', file: 'JOUSTRV4.SRC', start: 2953, end: 2958 },
  { law: 'the NENEMY non-negative oracle', file: 'JOUSTRV4.SRC', start: 2966, end: 2970 },
]

describe('each wave-machine law is pinned by a claims/*.json entry (AC-4)', () => {
  it('loads a non-empty claims set (the guard must have teeth)', () => {
    expect(loadClaims().length, 'docs/rom-study/claims/*.json must exist').toBeGreaterThan(0)
  })

  it.each(CITED_RANGES)('$law ($file:$start-$end) is covered by a claim', ({ file, start, end }) => {
    const claims = loadClaims()
    expect(
      claimCovers(claims, file, start, end),
      `no committed claim pins ${file}:${start}-${end} — AC-4 requires each wave law to be cited (add a JT25-* claim to docs/rom-study/claims/wave.json)`,
    ).toBe(true)
  })

  it('jt2-5 added its own wave-machine claims (JT25-*)', () => {
    const jt25 = loadClaims().filter((c) => /^JT25-\d+$/.test(c.id ?? ''))
    expect(
      jt25.length,
      'the new transcription claims are committed to docs/rom-study/claims/wave.json',
    ).toBeGreaterThan(0)
  })

  it('every JT25 claim names its own FILE:LINESPEC in its text (the jt1-2 R2 standard)', () => {
    const jt25 = loadClaims().filter((c) => /^JT25-\d+$/.test(c.id ?? ''))
    const bare = jt25
      .filter((c) => !/[\w./]+\.(?:SRC|DOC|PIC|FRM|cpp):\d/.test(c.claim ?? ''))
      .map((c) => c.id)
    expect(bare, 'these JT25 claims do not name their own source line in their text').toEqual([])
  })

  it('every claim id is still unique (JT25 does not collide with JT22/JT8/…)', () => {
    const ids = loadClaims().map((c) => c.id)
    const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
    expect(dupes, 'duplicate claim ids').toEqual([])
  })
})
