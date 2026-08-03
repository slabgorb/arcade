// tests/arena-source.test.ts
//
// Story jt1-4 — RED phase (O'Brien / TEA). The TRANSCRIPTION gate (AC-1) and
// the claims coupling, plus the count floors the jt1-3 review ruled in.
//
// jt1-4's constants are still DATA, so they still get jt1-3's treatment: the
// vendored source is re-read with the independent reader and the module's
// numbers must match. The BEHAVIOUR they drive is the companion suite,
// tests/arena.test.ts.
//
// ─── COUNT FLOORS (the jt1-3 review ruling) ──────────────────────────────────
// Review found that every jt1-3 collection was empirically truncatable green:
// a suite that only checks the entries present passes just as happily with half
// of them deleted. So anything this story CONSUMES gets a floor asserted at the
// point of consumption. The floors are the counts jt1-3 actually shipped; they
// are minimums, so later stories may add without editing this file.
//
// Vendored reads live inside it() bodies (the tp1-8 collection trap).

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines, parseStatement, evalNumber } from './helpers/joust-source.js'
import { loadArena } from './helpers/arena-contract.js'
import { loadPictures } from './helpers/pictures-contract.js'
// jt9-2 swept this suite's local pre-hardening claims loader onto the shared one
// jt8-3 extracted. Behaviour-preserving — the local copy declared `id` required
// where the helper has it optional, and nothing here depends on that.
import { loadClaims } from './helpers/claims.js'

/** Pull `SYMBOL EQU value` out of a vendored file. */
function equValue(file: string, symbol: string): number {
  for (const line of sourceLines(file)) {
    const m = line.match(new RegExp(`^${symbol}\\s+EQU\\s+(\\S+)`))
    if (m) return evalNumber(m[1])
  }
  throw new Error(`${symbol} EQU not found in ${file}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — THE CONSTANTS RE-DERIVE FROM THE VENDORED SOURCE.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('AC-1 — arena constants re-derive from JOUSTRV4.SRC', () => {
  it('CEILNG, FLOOR, ELEFT and ERIGHT match their EQU lines (:36-39)', async () => {
    const a = await loadArena()
    expect(a.CEILING, 'CEILNG EQU $0020').toBe(equValue('JOUSTRV4.SRC', 'CEILNG'))
    expect(a.FLOOR, 'FLOOR EQU $00DF').toBe(equValue('JOUSTRV4.SRC', 'FLOOR'))
    expect(a.ELEFT, 'ELEFT EQU -10').toBe(equValue('JOUSTRV4.SRC', 'ELEFT'))
    expect(a.ERIGHT, 'ERIGHT EQU 292').toBe(equValue('JOUSTRV4.SRC', 'ERIGHT'))
  })

  it('the wrap span is computed from the bounds, not hard-coded independently', async () => {
    const a = await loadArena()
    expect(a.WRAP_SPAN).toBe(a.ERIGHT - a.ELEFT + 1)
  })

  it('DEATH_Y is FLOOR+7, as ADGCEI compares it', async () => {
    const a = await loadArena()
    expect(a.DEATH_Y).toBe(equValue('JOUSTRV4.SRC', 'FLOOR') + 7)
  })

  it('every platform snap Y re-derives from its own LNDBn line', async () => {
    // Each is `LDB #$00xx-1`. Re-reading the cited line and evaluating the
    // expression is the whole gate: a mistyped snap Y cannot survive it.
    const a = await loadArena()
    const wrong: string[] = []
    for (const p of a.PLATFORMS) {
      const lines = sourceLines(p.anchor.file)
      const text = lines[p.anchor.startLine - 1] ?? ''
      const m = text.match(/LDB\s+#\$([0-9A-F]{4})-1/)
      if (!m) {
        wrong.push(`bit $${p.bit.toString(16)}: ${p.anchor.file}:${p.anchor.startLine} is not an LDB #$xxxx-1 line`)
        continue
      }
      const derived = parseInt(m[1], 16) - 1
      if (derived !== p.snapY) {
        wrong.push(`bit $${p.bit.toString(16)}: source says ${derived}, module says ${p.snapY}`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('LNDYTB and BCKYTB re-derive row for row from the vendored tables', async () => {
    const a = await loadArena()
    const readTable = (startLine: number): number[] => {
      const lines = sourceLines('JOUSTRV4.SRC')
      const out: number[] = []
      for (let n = startLine; out.length < 240; n++) {
        const st = parseStatement(lines[n - 1], n)
        if (!st || st.op !== 'FCB') break
        for (const tok of st.operands) out.push(evalNumber(tok) & 0xff)
      }
      return out
    }
    expect(readTable(7719), 'LNDYTB').toEqual(a.LND_Y_TABLE)
    expect(readTable(7549), 'BCKYTB').toEqual(a.BCK_Y_TABLE)
  })

  it('the lava and bridge constants re-derive from their cited lines', async () => {
    const a = await loadArena()
    const lines = sourceLines('JOUSTRV4.SRC')
    // `LDA #$EA  START LEVEL OF LAVA` (:962)
    expect(lines[961], 'JOUSTRV4.SRC:962 must still be the lava start').toContain('$EA')
    expect(a.LAVA_START).toBe(0xea)
    // `CMPA #$E0` / `SUBA #$5` (:1930, :1932)
    const window = lines.slice(1926, 1934).join('\n')
    expect(window).toContain('#$E0')
    expect(window).toContain('#$5')
    expect(a.LAVA_MIN).toBe(0xe0)
    expect(a.LAVA_STEP).toBe(5)
    // `LDA #3 / STA TBRIDGE` (:954-955)
    expect(lines.slice(953, 957).join('\n')).toContain('TBRIDGE')
    expect(a.BRIDGE_WAVE).toBe(3)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE PLATFORM → CLIFF MAPPING, cross-checked against jt1-3's records.
// ─────────────────────────────────────────────────────────────────────────────
describe('platform surfaces line up with the transcribed cliff records', () => {
  it('every snap Y is one pixel above its cliff record\'s destination scanline', async () => {
    // An independent cross-check between two unrelated parts of the ROM: the
    // landing code's `LDB #$xx-1` and the image module's DMA destination word,
    // whose low byte is the cliff's top scanline. They agree for all six —
    // verified this session — so a transcription slip in either one breaks it.
    const arena = await loadArena()
    const pics = await loadPictures()
    const destOf = (name: string): number | undefined =>
      pics.BACKGROUND_RECORDS.find((r) => r.name === name)?.dest
    const wrong: string[] = []
    for (const p of arena.PLATFORMS) {
      for (const cliff of p.cliffs) {
        const dest = destOf(cliff)
        if (dest === undefined) {
          wrong.push(`${cliff}: no background record (bit $${p.bit.toString(16)})`)
          continue
        }
        const topY = dest & 0xff
        if (topY - 1 !== p.snapY) {
          wrong.push(`${cliff}: record top ${topY}, snap ${p.snapY} (expected ${topY - 1})`)
        }
      }
    }
    expect(wrong).toEqual([])
  })

  it('names only cliffs that jt1-3 actually transcribed', async () => {
    const arena = await loadArena()
    const pics = await loadPictures()
    const known = new Set(pics.BACKGROUND_RECORDS.map((r) => r.name))
    const unknown = arena.PLATFORMS.flatMap((p) => p.cliffs).filter((c) => !known.has(c))
    expect(unknown, 'a platform naming a cliff record that does not exist').toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// COUNT FLOORS — the jt1-3 review ruling, applied at the point of consumption.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt1-3 collections are not silently truncatable', () => {
  // Review proved each of these could be emptied and the suite would stay
  // green. jt1-4 consumes them, so jt1-4 asserts they are still there.
  it('BACKGROUND_RECORDS keeps every cliff and transporter record', async () => {
    const pics = await loadPictures()
    expect(pics.BACKGROUND_RECORDS.length, 'jt1-3 shipped 12').toBeGreaterThanOrEqual(12)
  })

  it('COLLISION_TABLES keeps every mask (BCKCOL walks these)', async () => {
    const pics = await loadPictures()
    expect(pics.COLLISION_TABLES.length, 'jt1-3 shipped 35').toBeGreaterThanOrEqual(35)
  })

  it('ENTITY_RECORDS keeps every frame record', async () => {
    const pics = await loadPictures()
    expect(pics.ENTITY_RECORDS.length, 'jt1-3 shipped 26').toBeGreaterThanOrEqual(26)
  })

  it('PIXEL_BLOCKS keeps the whole inventory', async () => {
    const pics = await loadPictures()
    expect(pics.PIXEL_BLOCKS.length, 'jt1-3 shipped 93').toBeGreaterThanOrEqual(93)
  })

  it('PALETTES keeps all three', async () => {
    const pics = await loadPictures()
    expect(Object.keys(pics.PALETTES).length).toBeGreaterThanOrEqual(3)
    for (const name of ['COLOR1', 'HICOLR', 'NULL']) {
      expect(pics.PALETTES[name], `${name} must survive`).toBeDefined()
    }
  })

  it('the arena\'s own collections have floors too', async () => {
    const a = await loadArena()
    expect(a.PLATFORMS.length).toBe(6)
    expect(a.LND_Y_TABLE.length).toBe(240)
    expect(a.BCK_Y_TABLE.length).toBe(240)
    // A table of all zeroes would satisfy a length check while meaning nothing.
    expect(
      a.LND_Y_TABLE.some((v) => v !== 0),
      'LNDYTB cannot be all zeroes — nothing would ever be landable',
    ).toBe(true)
    expect(a.BCK_Y_TABLE.some((v) => v !== 0), 'BCKYTB cannot be all zeroes').toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CLAIMS COUPLING — every constant introduced here is anchored FILE:LINE.
// ─────────────────────────────────────────────────────────────────────────────
describe('every arena constant is anchored by a fully-qualified claim', () => {
  const anchored = (file: string, from: number, to: number): boolean =>
    loadClaims().some((c) => c.source?.file === file && c.source.line >= from && c.source.line <= to)

  it('the bounds block (JOUSTRV4.SRC:36-41) is claimed', () => {
    expect(anchored('JOUSTRV4.SRC', 36, 41), 'CEILNG/FLOOR/ELEFT/ERIGHT').toBe(true)
  })

  it('the wrap routine (:7291-7297) is claimed', () => {
    expect(anchored('JOUSTRV4.SRC', 7291, 7297), 'WRAPX').toBe(true)
  })

  it('the ceiling/floor block (:6497-6521) is claimed', () => {
    expect(anchored('JOUSTRV4.SRC', 6497, 6521), 'ADDGRX/ADGCEI').toBe(true)
  })

  it('the landing dispatch (:6703-6712) and the snap Ys (:6729-6759) are claimed', () => {
    expect(anchored('JOUSTRV4.SRC', 6703, 6712), 'CKGND').toBe(true)
    expect(anchored('JOUSTRV4.SRC', 6729, 6759), 'LNDB0-5').toBe(true)
  })

  it('the lava and bridge constants are claimed', () => {
    expect(anchored('JOUSTRV4.SRC', 954, 962), 'TBRIDGE/TTROLL/SAFRAM start').toBe(true)
    expect(anchored('JOUSTRV4.SRC', 1929, 1933), 'the per-wave lava step').toBe(true)
  })

  it('the claims set grew past jt1-3\'s 182', () => {
    expect(
      loadClaims().length,
      'jt1-4 transcribes new constants, so the set must grow',
    ).toBeGreaterThan(182)
  })

  it('every claim id is still unique', () => {
    const ids = loadClaims().map((c) => c.id)
    expect([...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BCKCOL — the cliff-side collision path (open-questions §4, now traced).
// ─────────────────────────────────────────────────────────────────────────────
describe('BCKCOL is a separate path with its own bit assignment', () => {
  /**
   * Traced from JOUSTRV4.SRC:6817-6915 this session — bit, cliff, `LDD #x`
   * origin, `LDX #y` top scanline. Compare with PLATFORMS: eight bits with the
   * left/right cliffs SEPARATE, against landing's six with the pairs merged.
   */
  const BCK: ReadonlyArray<readonly [number, string, number, number]> = [
    [0x01, 'CLIF1L', -32, 69],
    [0x02, 'CLIF1R', 252, 69],
    [0x04, 'CLIF2', 86, 81],
    [0x08, 'CLIF3U', 202, 129],
    [0x10, 'CLIF3L', -32, 138],
    [0x20, 'CLIF3R', 202, 129],
    [0x40, 'CLIF4', 106, 163],
    [0x80, 'CLIF5', 54, 211],
  ]

  it('has eight surfaces, one per cliff', async () => {
    const a = await loadArena()
    expect(a.BACKGROUND_SURFACES.length).toBe(8)
    expect(a.BACKGROUND_SURFACES.map((s) => s.bit).sort((x, y) => x - y)).toEqual(
      BCK.map(([b]) => b),
    )
  })

  it('maps each bit to the cliff and origin the ROM loads', async () => {
    const a = await loadArena()
    for (const [bit, cliff, originX, originY] of BCK) {
      const s = a.BACKGROUND_SURFACES.find((q) => q.bit === bit)
      expect(s, `background surface for bit $${bit.toString(16)}`).toBeDefined()
      expect(s!.cliff, `bit $${bit.toString(16)}`).toBe(cliff)
      expect(s!.originX, `bit $${bit.toString(16)} LDD origin`).toBe(originX)
      expect(s!.originY, `bit $${bit.toString(16)} LDX origin`).toBe(originY)
    }
  })

  it('uses a DIFFERENT bit assignment from the landing table', async () => {
    // The finding this test exists for. Landing bit 4 is CLIF4 (snap 162);
    // background bit 4 is CLIF3L (top 138). Anything that shares one table
    // between the two mechanisms is collidng against the wrong cliff.
    const a = await loadArena()
    const bckBit4 = a.BACKGROUND_SURFACES.find((s) => s.bit === 0x10)!
    const lndBit4 = a.PLATFORMS.find((p) => p.bit === 0x10)!
    expect(bckBit4.cliff, 'background bit 4').toBe('CLIF3L')
    expect(lndBit4.cliffs, 'landing bit 4').toContain('CLIF4')
    expect(bckBit4.originY - 1, 'and they resolve to different scanlines').not.toBe(lndBit4.snapY)
  })

  it('each origin Y is the cliff record\'s own destination scanline (except the shipped BCKB5 quirk)', async () => {
    // Cross-check against jt1-3: `LDX #69` for CLIF1L and the record's dest
    // low byte are the same number stated in two unrelated places.
    //
    // Bit 5 is EXEMPT, and that exemption is the point of the quirk recorded
    // below: BCKB5 loads CLIF3U's origin (202,129) even though CLIF3R sits at
    // (254,138), so it is the one surface whose origin deliberately does NOT
    // match its own record. Asserting it here would have contradicted the
    // duplication test in this same file — corrected in GREEN (see Design
    // Deviations). The exemption is narrow: exactly one bit, and the
    // duplication test pins what its origin must be instead.
    const arena = await loadArena()
    const pics = await loadPictures()
    const wrong: string[] = []
    for (const s of arena.BACKGROUND_SURFACES) {
      if (s.bit === 0x20) continue // the BCKB3/BCKB5 duplication, pinned below
      const rec = pics.BACKGROUND_RECORDS.find((r) => r.name === s.cliff)
      if (!rec) {
        wrong.push(`${s.cliff}: no background record`)
        continue
      }
      if ((rec.dest & 0xff) !== s.originY) {
        wrong.push(`${s.cliff}: record scanline ${rec.dest & 0xff}, BCKCOL origin ${s.originY}`)
      }
    }
    expect(wrong).toEqual([])
  })

  it('each surface names a collision table jt1-3 transcribed', async () => {
    const arena = await loadArena()
    const pics = await loadPictures()
    const known = new Set(pics.COLLISION_TABLES.flatMap((t) => [t.name, ...t.aliases]))
    const dangling = arena.BACKGROUND_SURFACES.filter((s) => !known.has(s.collisionTable)).map(
      (s) => `${s.cliff} → ${s.collisionTable}`,
    )
    expect(dangling, 'BCKCOL dereferences these tables; they must exist').toEqual([])
  })

  it('records the CLIF3U/CLIF3R duplication rather than silently normalising it', async () => {
    // BCKB3 and BCKB5 are byte-identical in the ROM: both load CLIF3R's
    // collision pointer with CLIF3U's origin (202,129), even though CLIF3R
    // actually sits at (254,138). Whether that is a ROM bug or intent is not
    // this story's call — but the transcription must preserve it, because
    // "tidying" it would silently change collision behaviour.
    const a = await loadArena()
    const u = a.BACKGROUND_SURFACES.find((s) => s.bit === 0x08)!
    const r = a.BACKGROUND_SURFACES.find((s) => s.bit === 0x20)!
    expect([r.originX, r.originY], 'bit 5 carries bit 3\'s origin, as shipped').toEqual([
      u.originX,
      u.originY,
    ])
    expect(r.collisionTable, 'and the same collision table').toBe(u.collisionTable)
  })
})
