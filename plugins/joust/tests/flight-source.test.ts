// tests/flight-source.test.ts
//
// Story jt1-5 — RED phase (O'Brien / TEA). The transcription gate (AC-1's
// "transcribed with radix-cited comments + claims entries"), the X-tables
// seam, partial reachability, and the arena-consumption obligations.
//
// The behaviour these constants drive is the companion suite, flight.test.ts.
//
// ─── THE X-TABLES SEAM (obligation 1) ────────────────────────────────────────
// jt1-4 delivered `groundOutcome(mask)` but could not supply the mask, because
// LNDXTB/BCKXTB are per-wave RAM buffers. Investigated before writing any
// landing test, and the story's framing turned out to be wrong:
//
//   LNDXS1 (:7787) is ONE contiguous 352-byte table covering CRT pixel −$20
//   through $13F. LNDXS3 (:7799) is a LABEL INTO it at the zero point — the
//   same zero-point-label shape as FLYX. LNDXS2 (:7879) is the END MARKER,
//   exactly parallel to the RAM bound LNDXD2. Same for BCKXS1/BCKXS2.
//
// Confirmed by the RAM declarations: LNDXD1 $20 + LNDXTB $140 = 352 bytes,
// precisely LNDXS1's size (RAMDEF.SRC:376-378). So there is no per-wave family
// of ROM tables and no split is needed. The wave variance lives entirely in RAM
// mutation, in two steps:
//
//   1. Wave init (`LNDXUP`, :987-989): copy ROM, then `ORA #$20` — "FOR NOW,
//      CLIFF 5 LANDS AT ALL POINTS".
//   2. Per-cliff create/destroy (:2341-2352): a read-modify-write masking one
//      cliff's bit out of RAM and OR-ing the ROM's bits back in, driven by
//      WCLFTB.
//
// jt1-5 therefore transcribes the ROM tables plus step 1 — the wave-1 landing
// map, which is exactly what AC-2's landing tests need. Step 2 is wave-machine
// scope and only ever REMOVES bits, so nothing here becomes wrong when it lands.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vendoredAvailable, sourceLines, parseStatement, evalNumber } from './helpers/joust-source.js'
import { loadFlight } from './helpers/flight-contract.js'
import { loadArena } from './helpers/arena-contract.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

function readFcbBytes(startLine: number, count: number): number[] {
  const lines = sourceLines('JOUSTRV4.SRC')
  const out: number[] = []
  for (let n = startLine; out.length < count && n <= lines.length; n++) {
    const st = parseStatement(lines[n - 1], n)
    if (!st || st.op !== 'FCB') continue
    for (const t of st.operands) out.push(evalNumber(t) & 0xff)
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — CONSTANTS RE-DERIVE FROM THE VENDORED SOURCE.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('AC-1 — the physics constants re-derive', () => {
  it('FLYX matches the nine FDB entries, with the label on the ZERO entry', async () => {
    // The trap, gated: the table starts FOUR entries before the FLYX label
    // (:7150) and the index is signed. Re-deriving from :7150 rather than from
    // the label is the whole point.
    const f = await loadFlight()
    const lines = sourceLines('JOUSTRV4.SRC')
    const derived: number[] = []
    for (let n = 7150; derived.length < 9; n++) {
      const st = parseStatement(lines[n - 1], n)
      if (!st || st.op !== 'FDB') continue
      derived.push(evalNumber(st.operands[0]) | 0)
    }
    // FDB stores 16-bit two's complement; sign-extend for comparison.
    const signed = derived.map((v) => (v >= 0x8000 ? v - 0x10000 : v))
    expect(signed).toEqual(f.FLYX)
    expect(lines[7153], 'the FLYX label sits on the fifth entry').toMatch(/^FLYX\s+FDB\s+\$0000/)
  })

  it('GRAV is 4 and MAXVX is 8', async () => {
    const f = await loadFlight()
    const lines = sourceLines('JOUSTRV4.SRC')
    expect(lines[951], 'JOUSTRV4.SRC:952').toContain('#4')
    expect(f.GRAV).toBe(4)
    expect(f.MAX_VEL_X_INDEX, 'MAXVX EQU 8, :40').toBe(8)
  })

  it('the flap impulse constants come from ADDFLP', async () => {
    const lines = sourceLines('JOUSTRV4.SRC')
    const block = lines.slice(6428, 6437).join('\n')
    expect(block, 'the 96 multiplier').toContain('256*96/255')
    expect(block, 'and the −96 offset').toContain('#96')
  })

  it('ORRUN and the skid delta re-derive', async () => {
    const f = await loadFlight()
    const lines = sourceLines('JOUSTRV4.SRC')
    const deltas: number[] = []
    for (let n = 7185; n <= 7189; n++) {
      const st = parseStatement(lines[n - 1], n)
      if (st?.op === 'FCB') deltas.push(evalNumber(st.operands[1]))
    }
    expect(deltas).toEqual(f.ORRUN_DELTAS)
    expect(lines[7241], 'the skid delta, :7242').toContain('SKID*256+2')
  })

  it('the takeoff impulse is −$0080 and carries a one-pixel lift', async () => {
    const f = await loadFlight()
    const lines = sourceLines('JOUSTRV4.SRC')
    expect(lines[6123], 'STFLY, :6124').toContain('-$0080')
    expect(lines[6125], 'DEC PPOSY+1 — the lift, :6126').toMatch(/DEC\s+PPOSY\+1/)
    expect(f.TAKEOFF_VEL_Y).toBe(-0x0080)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE X-TABLES — obligation 1.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the landing X-tables re-derive from ROM', () => {
  it('LNDXS1 is one 352-byte table, not a family of per-wave variants', async () => {
    const f = await loadFlight()
    const derived = readFcbBytes(7788, 352)
    expect(derived.length, 'LNDXD1 $20 + LNDXTB $140 = 352').toBe(352)
    expect(f.LND_X_TABLE).toEqual(derived)
  })

  it('BCKXS1 likewise', async () => {
    const f = await loadFlight()
    expect(f.BCK_X_TABLE).toEqual(readFcbBytes(7617, 352))
  })

  it('the index origin is CRT pixel −32', async () => {
    const f = await loadFlight()
    expect(f.X_TABLE_ORIGIN, 'the table begins $20 pixels left of screen zero').toBe(32)
    const lines = sourceLines('JOUSTRV4.SRC')
    // lines[] is 0-indexed, so the FIRST data row (source line 7788, the one
    // carrying the "CRT PIXEL -$20" comment) is lines[7787]. Corrected in GREEN
    // — the original index pointed one row further in, which has no comment.
    expect(lines[7787], 'the first row is labelled CRT PIXEL -$20').toContain('-$20')
  })

  it('LNDXS2 and BCKXS2 are END MARKERS, not alternative tables', () => {
    // The story treats LNDXS1/2/3 as three sources. They are one table, its end
    // marker, and a zero-point label — the same shape as LNDXD1/LNDXD2 in RAM.
    const lines = sourceLines('JOUSTRV4.SRC')
    expect(lines[7878], 'LNDXS2 sits immediately after LNDXS1\'s 352 bytes').toMatch(/^LNDXS2\s+EQU\s+\*/)
    expect(lines[7707]).toMatch(/^BCKXS2\s+EQU\s+\*/)
  })

  it('the wave-1 map applies the ORA #$20 init (CLIF5 lands everywhere)', async () => {
    // `LNDXUP` copies ROM then ORs in bit 5 — the ROM comment says "FOR NOW,
    // CLIFF 5 LANDS AT ALL POINTS". Omitting it makes the bottom island
    // unlandable outside its own X span, which AC-2's landing tests would
    // surface as an entity falling through the world.
    const f = await loadFlight()
    const lines = sourceLines('JOUSTRV4.SRC')
    expect(lines[986], 'LNDXUP, :987-989').toContain('LNDXS1-LNDXD1')
    expect(lines[987]).toContain('ORA')
    expect(lines[987]).toContain('$20')
    for (const x of [-10, 0, 100, 292]) {
      expect(f.landMaskAtX(x) & 0x20, `CLIF5 bit must be set at x=${x}`).toBe(0x20)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PARTIAL REACHABILITY — obligation 2.
// ─────────────────────────────────────────────────────────────────────────────
describe('every mask the tables can actually produce is handled', () => {
  it('groundOutcome handles every distinct LNDYTB value, by construction', async () => {
    // Derived from the table rather than enumerated by hand: whatever the Y map
    // contains, the dispatch must have an answer for it. An unhandled value is
    // an entity in an undefined state mid-flight.
    const arena = await loadArena()
    const distinct = [...new Set(arena.LND_Y_TABLE)]
    expect(distinct.length, 'the Y map must carry more than just zero').toBeGreaterThan(1)
    for (const v of distinct) {
      const outcome = arena.groundOutcome(v)
      expect(['airborne', 'platform', 'troll'], `LNDYTB value $${v.toString(16)}`).toContain(
        outcome.kind,
      )
    }
  })

  it('and every mask the X and Y maps can jointly produce', async () => {
    // The real domain is the AND of the two tables, which is a subset of the
    // cross product — this is what the sim actually sees.
    const f = await loadFlight()
    const arena = await loadArena()
    const masks = new Set<number>()
    for (let x = -32; x < 320; x += 1) {
      const xm = f.landMaskAtX(x)
      for (const ym of new Set(arena.LND_Y_TABLE)) masks.add(xm & ym)
    }
    expect(masks.size, 'the joint domain must be non-trivial').toBeGreaterThan(1)
    for (const m of masks) {
      expect(() => arena.groundOutcome(m), `mask $${m.toString(16)}`).not.toThrow()
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ARENA CONSUMPTION — obligation 3.
// ─────────────────────────────────────────────────────────────────────────────
describe('arena.ts is safe to consume from a hot sim loop', () => {
  it('exports are frozen — a consumer cannot corrupt shared tables', async () => {
    // flight.ts reads these every frame. An accidental write to PLATFORMS or a
    // Y table would corrupt every subsequent entity silently, and determinism
    // (AC-3) would fail in a way that reproduces only within one run.
    const a = await loadArena()
    expect(Object.isFrozen(a.PLATFORMS), 'PLATFORMS must be frozen').toBe(true)
    expect(Object.isFrozen(a.LND_Y_TABLE), 'LND_Y_TABLE must be frozen').toBe(true)
    expect(Object.isFrozen(a.BCK_Y_TABLE), 'BCK_Y_TABLE must be frozen').toBe(true)
    expect(Object.isFrozen(a.BACKGROUND_SURFACES)).toBe(true)
    for (const p of a.PLATFORMS) expect(Object.isFrozen(p), `${p.cliffs.join('/')}`).toBe(true)
  })

  it('rejects out-of-domain input rather than propagating NaN', async () => {
    // ONE decision for the whole cluster: core functions are total over their
    // documented domain and THROW outside it. The alternative — silent NaN —
    // is far worse in a deterministic sim: it propagates for thousands of
    // frames and surfaces as an unreproducible trajectory rather than a stack
    // trace at the call that caused it.
    const a = await loadArena()
    expect(() => a.applyCeiling(NaN, 0), 'applyCeiling(NaN)').toThrow()
    expect(() => a.applyCeiling(0, NaN), 'applyCeiling(_, NaN)').toThrow()
    expect(() => a.isLavaDeath(NaN), 'isLavaDeath(NaN)').toThrow()
    expect(() => a.groundOutcome(NaN), 'groundOutcome(NaN)').toThrow()
    expect(() => a.groundOutcome(256), 'a mask is one byte').toThrow()
    expect(() => a.groundOutcome(-1)).toThrow()
    expect(() => a.wrapX(NaN), 'wrapX(NaN)').toThrow()
  })

  it('wrapX is documented and validated over WHOLE pixels', async () => {
    // X position is a 16-bit signed PIXEL count (the sub-pixel accumulator
    // lives in the velocity), so a fractional X is a caller bug, not a value to
    // round silently.
    const a = await loadArena()
    expect(() => a.wrapX(10.5), 'a fractional X is out of domain').toThrow()
    for (const x of [-10, 0, 292, 293]) expect(Number.isInteger(a.wrapX(x))).toBe(true)
  })

  it('arena.ts\'s header no longer claims ALL positions are 16-bit pixel+fraction', async () => {
    // The false header claim, located precisely. arena.ts opens with
    // "Positions are 16-bit pixel+fraction: 256 units = one pixel" — unqualified
    // and wrong for X. Verified against the ROM this session: Y is 8.8
    // (`ADDD PPOSY+1,U`), but X is a 16-bit SIGNED PIXEL count whose sub-pixel
    // accumulator lives in the VELOCITY (`ADDB PVELX+2,U`), not the position.
    //
    // That is why `wrapX` takes whole pixels while `applyCeiling`/`isLavaDeath`
    // take 8.8 — the same module, two formats. A header that flattens them is
    // worse than none, because the next author trusts it and makes both 8.8,
    // which is the natural symmetry assumption and silently wrong.
    //
    // (The BACKGROUND_SURFACES bit-assignment note at :131 is already correct —
    // jt1-4's gate holds. This is a different false claim in the same file.)
    const src = readFileSync(join(repoRoot, 'src', 'core', 'arena.ts'), 'utf8')
    const header = src.slice(0, src.indexOf('export'))
    expect(
      header,
      'the header must not state one position format for the whole module',
    ).not.toMatch(/^\/\/ Positions are 16-bit pixel\+fraction[^\n]*$/m)
    expect(header, 'X must be documented as whole pixels').toMatch(/X[^\n]*whole[- ]pixel|whole[- ]pixel[^\n]*X/i)
    expect(header, 'and Y as 8.8 / pixel+fraction').toMatch(/Y[^\n]*(8\.8|pixel\+fraction)/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CLAIMS COUPLING.
// ─────────────────────────────────────────────────────────────────────────────
function loadClaims(): Array<{ id: string; source?: { file: string; line: number } }> {
  const dir = join(repoRoot, 'docs', 'rom-study', 'claims')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
    .flat()
}

describe('every constant this story introduces is anchored', () => {
  const anchored = (from: number, to: number): boolean =>
    loadClaims().some(
      (c) => c.source?.file === 'JOUSTRV4.SRC' && c.source.line >= from && c.source.line <= to,
    )

  it.each([
    ['ADDFLP, the flap impulse', 6429, 6448],
    ['PTIMUP saturation (AIRTIM)', 6476, 6478],
    ['the gravity offsets', 6169, 6199],
    ['the FLYX ladder', 7150, 7158],
    ['STFLY / STFALL takeoff', 6123, 6151],
    ['the ground state machine', 7160, 7180],
    ['ORRUN deltas', 7185, 7189],
    ['FRCONV', 6253, 6257],
    ['PLANTZ on skid', 6071, 6072],
    ['the input normalisation', 7261, 7263],
    ['LNDXS1', 7787, 7790],
    ['the LNDXUP wave init', 987, 989],
  ])('%s is claimed', (_name, from, to) => {
    expect(anchored(from, to)).toBe(true)
  })

  it('the claims set grew past jt1-10\'s 240', () => {
    expect(loadClaims().length).toBeGreaterThan(240)
  })

  it('every claim id is still unique', () => {
    const ids = loadClaims().map((c) => c.id)
    expect([...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]).toEqual([])
  })
})
