// tests/playfield-colour.test.ts
//
// Story ml7-11 — RED phase (Tyr / TEA). PER-REGION PLAYFIELD PALETTE from the
// 99$ colour table. ml2-3's palette seam (tests/palette.test.ts) shipped the
// pure decode of ONE colour-RAM byte and explicitly DEFERRED "the per-slot
// semantic map (which ANCOL/MOCOL slot is 'inside of mushroom' etc.) and
// CLRCH's per-level table walk" to "the render/sim stories behind ml2-3"
// (palette.test.ts:48-50). tests/audit/palette-claims.test.ts fenced its claim
// window at MLIRQ.MAC:315 and named the continuation as "the business of
// whichever story transcribes the full per-level table" (palette-claims:27-34).
// This is that story.
//
// ─── GROUND TRUTH: CLRCH (MLIRQ.MAC:242-302) ─────────────────────────────────
// CLRCH forms the table index X = 12*(CENTIN-1) (MLIRQ.MAC:256-263, PAL-11) and
// reads the per-level `99$` table (MLIRQ.MAC:304-351 — one 12-byte row per
// CENTIN level 1..12, `.PAGE` at :352). The CODE — not the table's inline
// comment — assigns the field regions:
//
//   99$+0 -> ANCOL+5/+0D  INSIDE OF MUSHROOM   (:265-266)  [also DDT, ANCOL+1/+9]
//   99$+1 -> ANCOL+6/+0E  OUTSIDE OF MUSHROOM  (:270-271)
//   99$+2 -> ANCOL+7/+0F  INSIDE OF POISON MUSHROOM (:273-274)
//   $1F (RED)  -> ANCOL+2  ALPHANUMERICS   (:294-296) — wave-INVARIANT
//   $00 (WHITE)-> MOCOL+0F PLAYER, ANCOL+3 (:297-299)  — wave-INVARIANT (gun/lives)
//
// THE TRAP (memory: "citation gate checks quotes not meaning"): the table's own
// line-304 comment reads ";WHEN CENTIN=1 (MUCHROOMS-INSIDE,OUTSIDE,DDT)", which
// labels the THIRD byte "DDT". The routine disagrees: byte 0 (inside-mushroom)
// is the one shared with DDT explosions, and byte 2 is INSIDE-OF-POISON. A Dev
// who trusts the table comment sends the poison colour to DDT. The code wins.
//
// ─── WHAT GREEN (Loki) MUST SHIP ─────────────────────────────────────────────
//   src/core/playfield-colour.ts — pure (the ml1-1 scanner sweeps src/core the
//   moment a new file lands): the per-level field-region colour map, derived
//   from CLRCH's 99$ walk, plus the two wave-invariant fixed colours.
//     export function waveColours(centin: number):
//         { insideMushroom: number; outsideMushroom: number; poison: number }
//     export const PLAYER_COLOUR      = 0x00  // WHITE — gun + lives ship (MOCOL+0F/ANCOL+3)
//     export const ALPHANUMERIC_COLOUR = 0x1f // RED   — HUD text/score (ANCOL+2)
//   Cite MLIRQ.MAC:242 (CLRCH) and the 99$ table (MLIRQ.MAC:304-351).
//   Add the poison-slot claim to docs/rom-study/claims/06-colour-ram-palette.json
//   (ANCOL+7, MLIRQ.MAC:273) — "poison" is a story-named region with no source
//   pin today; the existing citations gate byte-verifies it.
//
// The bytes are TRANSCRIBED, so this suite does not hand-copy the 36 field
// values it checks — it PARSES the vendored 99$ table straight out of MLIRQ.MAC
// and asserts the module against those bytes (the "independent input" rule).
//
// SCOPE (record, not build here): the motion-object per-creature colours
// (centipede/bee/spider, MOCOL slots, 99$+3..+11) and the render-side wiring of
// drawGridStamps/drawStampAtPx are GREEN's; the render change is verified by the
// AC3 VISUAL playtest, not by this pure suite. The diagnostic census page
// (drawStampPlayfield / PLAYFIELD_COLOUR_BYTES, tests/playfield.test.ts) KEEPS
// its max-distinct palette — it is not a game region.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { decodeColourByte } from '../src/core/palette'
import { loadClaims } from './audit/dossier-sweep'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const modulePath = join(root, 'src', 'core', 'playfield-colour.ts')
const mlirqPath = join(root, '..', '..', 'reference', 'original-source', 'millipede', 'MLIRQ.MAC')

interface WaveColours {
  insideMushroom: number
  outsideMushroom: number
  poison: number
}

interface PlayfieldColourModule {
  waveColours(centin: number): WaveColours
  PLAYER_COLOUR: number
  ALPHANUMERIC_COLOUR: number
}

/**
 * Load the not-yet-built per-region colour core with a self-describing failure
 * (the ml1-1 loadScanner idiom, as tests/palette.test.ts): the specifier is
 * assembled at runtime so neither tsc nor the bundler resolves it statically,
 * and a missing module reads as "not built yet", never a collect-time trace.
 */
async function loadModule(): Promise<PlayfieldColourModule> {
  const parts = ['..', 'src', 'core', 'playfield-colour.js']
  try {
    return (await import(/* @vite-ignore */ new URL(parts.join('/'), import.meta.url).href)) as PlayfieldColourModule
  } catch {
    throw new Error(
      'per-region colour core not built yet: GREEN ships ' +
        'plugins/millipede/src/core/playfield-colour.ts exporting waveColours(centin), ' +
        'PLAYER_COLOUR and ALPHANUMERIC_COLOUR — see this file’s header for the CLRCH law',
    )
  }
}

/**
 * Parse the vendored `99$` per-level colour table (MLIRQ.MAC:304-351) into a
 * flat array of 144 bytes (12 levels * 12 bytes). Independent ground truth: the
 * module is asserted against THESE bytes, not against a hand-copy in this file.
 * CRLF quarry (millipede reference is CRLF) — trimEnd each line; `.BYTE`
 * operands are hex with a leading `0` before A-F digits (`0EF`, `0A7`).
 */
function parse99Table(): number[] {
  const lines = readFileSync(mlirqPath, 'utf8').split('\n')
  const bytes: number[] = []
  for (let n = 304; n <= 351; n++) {
    const raw = (lines[n - 1] ?? '').replace(/\r$/, '')
    const operand = raw.split(';')[0] // strip the inline comment
    const m = operand.match(/\.BYTE\s+(.+)$/)
    if (!m) throw new Error(`MLIRQ.MAC:${n} is not a .BYTE row: ${JSON.stringify(raw)}`)
    for (const tok of m[1].split(',')) {
      const t = tok.trim()
      if (t === '') continue
      const v = parseInt(t, 16)
      if (!Number.isInteger(v) || v < 0 || v > 0xff) {
        throw new Error(`MLIRQ.MAC:${n} bad byte token ${JSON.stringify(tok)}`)
      }
      bytes.push(v)
    }
  }
  return bytes
}

const STRIDE = 12 // 99$ index is 12 bytes per level — MLIRQ.MAC:262 (PAL-11)
const LEVELS = 12 // one row per CENTIN 1..12, MLIRQ.MAC:304-351

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — the per-region map is a NEW src/core module (enters the purity sweep)
//        and carries the CLRCH citation.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml7-11 AC1 — per-region colour is a pure src/core module', () => {
  it('GREEN ships src/core/playfield-colour.ts', () => {
    expect(
      existsSync(modulePath),
      'plugins/millipede/src/core/playfield-colour.ts must exist — src/core is the ' +
        'pure tier ml1-1’s scanner sweeps; the 99$ table walk is pure ROM-derived data',
    ).toBe(true)
  })

  it('the module cites CLRCH (MLIRQ.MAC:242) and the 99$ table (MLIRQ.MAC:304)', () => {
    expect(existsSync(modulePath), 'premise: the module exists').toBe(true)
    const src = readFileSync(modulePath, 'utf8')
    expect(src, 'the CLRCH routine').toMatch(/MLIRQ\.MAC:242\b/)
    expect(src, 'the 99$ per-level colour table').toMatch(/MLIRQ\.MAC:304\b/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — the per-wave field-region bytes match the vendored 99$ table, verbatim.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml7-11 AC2 — waveColours reproduces the 99$ table', () => {
  it('CENTIN=1 is the source’s own opening row: inside $1F, outside $27, poison $21', async () => {
    // The human-readable anchor (MLIRQ.MAC:304 `.BYTE 1F,27,21`). If the ROM
    // parse below and this literal ever disagree, one of them is wrong loudly.
    const m = await loadModule()
    expect(m.waveColours(1)).toEqual({ insideMushroom: 0x1f, outsideMushroom: 0x27, poison: 0x21 })
  })

  it('all 12 levels match 99$[12*(centin-1) + {0,1,2}] parsed from MLIRQ.MAC', async () => {
    const m = await loadModule()
    const table = parse99Table()
    expect(table.length, '99$ is 12 levels * 12 bytes').toBe(LEVELS * STRIDE)
    for (let centin = 1; centin <= LEVELS; centin++) {
      const base = STRIDE * (centin - 1)
      expect(m.waveColours(centin), `CENTIN=${centin}`).toEqual({
        insideMushroom: table[base + 0],
        outsideMushroom: table[base + 1],
        poison: table[base + 2],
      })
    }
  })

  it('poison is the THIRD byte (99$+2), NOT the DDT byte — the table-comment trap', async () => {
    // The line-304 comment mislabels byte 2 as "DDT"; the routine sends byte 2
    // to INSIDE-OF-POISON (:273) and byte 0 to inside-mushroom+DDT (:265-267).
    // Pick levels where byte 0 and byte 2 DIFFER so a swap cannot hide.
    const m = await loadModule()
    const table = parse99Table()
    for (const centin of [1, 2, 3]) {
      const base = STRIDE * (centin - 1)
      expect(table[base + 0], `precondition CENTIN=${centin}: byte0 != byte2`).not.toBe(table[base + 2])
      expect(m.waveColours(centin).poison, `CENTIN=${centin} poison is 99$+2`).toBe(table[base + 2])
      expect(m.waveColours(centin).poison, `CENTIN=${centin} poison is NOT the inside/DDT byte`).not.toBe(
        table[base + 0],
      )
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 (data half) — the fixed colours are wave-INVARIANT and are the source's
//        own RED/WHITE. (The rendered field is the VISUAL-playtest half.)
// ═════════════════════════════════════════════════════════════════════════════
describe('ml7-11 AC3 — fixed gun/lives + alphanumeric colours', () => {
  it('PLAYER_COLOUR is $00 (WHITE, MLIRQ.MAC:297) — the gun/lives ship', async () => {
    const m = await loadModule()
    expect(m.PLAYER_COLOUR).toBe(0x00)
  })

  it('ALPHANUMERIC_COLOUR is $1F (RED, MLIRQ.MAC:294) — the HUD text/score', async () => {
    const m = await loadModule()
    expect(m.ALPHANUMERIC_COLOUR).toBe(0x1f)
  })

  it('the fixed colours do not vary with CENTIN — they are immediate constants, not 99$ reads', async () => {
    // CLRCH loads $1F/$00 as immediates AFTER the table walk (:294-301); they
    // must be identical for every level. A Dev who sourced them from the table
    // by mistake would see them drift.
    const m = await loadModule()
    const players = new Set<number>()
    const alnums = new Set<number>()
    for (let centin = 1; centin <= LEVELS; centin++) {
      players.add(m.PLAYER_COLOUR)
      alnums.add(m.ALPHANUMERIC_COLOUR)
    }
    expect([...players]).toEqual([0x00])
    expect([...alnums]).toEqual([0x1f])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC — the region bytes are REAL colours: they decode through the ml2-3 seam.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml7-11 — the region bytes decode through the palette seam', () => {
  it('CENTIN=1 inside-mushroom ($1F) decodes to the source’s pure RED (255,0,0)', async () => {
    const m = await loadModule()
    expect(decodeColourByte(m.waveColours(1).insideMushroom)).toEqual({ r: 0xff, g: 0, b: 0 })
  })

  it('PLAYER_COLOUR ($00) decodes to the hardware’s WHITE (255,222,255)', async () => {
    const m = await loadModule()
    expect(decodeColourByte(m.PLAYER_COLOUR)).toEqual({ r: 0xff, g: 0xde, b: 0xff })
  })

  it('every field-region byte across all 12 levels is a valid colour-RAM byte', async () => {
    // Nothing in the table may throw the ml2-3 byte guard — a transcription
    // typo that produced e.g. 0x1FF is caught here rather than at render.
    const m = await loadModule()
    for (let centin = 1; centin <= LEVELS; centin++) {
      const w = m.waveColours(centin)
      for (const byte of [w.insideMushroom, w.outsideMushroom, w.poison]) {
        expect(() => decodeColourByte(byte), `CENTIN=${centin} byte ${byte}`).not.toThrow()
      }
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC — CENTIN is a level index 1..12; anything else is a caller bug.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml7-11 — waveColours guards its level index', () => {
  it.each([[0], [13], [1.5], [Number.NaN], [-1]])('rejects CENTIN=%s', async (bad) => {
    const m = await loadModule()
    expect(() => m.waveColours(bad)).toThrow()
  })

  it('accepts the full valid range 1..12 without throwing', async () => {
    const m = await loadModule()
    for (let centin = 1; centin <= LEVELS; centin++) {
      expect(() => m.waveColours(centin)).not.toThrow()
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC — "poison" is a story-named region: pin it as a byte-verifiable claim.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml7-11 — the poison-mushroom slot is pinned as a claim', () => {
  it('a claim quotes the INSIDE-OF-POISON write (MLIRQ.MAC:273)', () => {
    // Today the colour claims cover inside/outside mushroom (PAL-5/6) but not
    // poison. GREEN adds it to 06-colour-ram-palette.json; the existing
    // citations gate byte-verifies the verbatim against the vendored MLIRQ.MAC.
    const claimed = loadClaims().some((c) => c.source.file === 'MLIRQ.MAC' && c.source.line === 273)
    expect(
      claimed,
      'add a claim for ANCOL+7 (INSIDE OF POISON MUSHROOM, MLIRQ.MAC:273) to ' +
        'docs/rom-study/claims/06-colour-ram-palette.json',
    ).toBe(true)
  })
})
