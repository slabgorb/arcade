// tests/pictures.test.ts
//
// Story cp1-3 — RED phase (O'Brien / TEA). Picture-ROM transcription: decode the
// two rev-2 picture chips (136001.201/202, which rev 4 shipped) into the pure
// data module src/core/pictures.ts, byte-gated against the silicon and auditable
// rather than asserted. NO hand-authored pixels anywhere (AC-4).
//
// ─── THE THREE-WAY IDENTITY, AND HOW EACH LINK IS TESTED ─────────────────────────
// AC-1 degrades to a "committed fixture" on CI (which lacks the orchestrator's
// reference/ tree). The hazard: pictures.ts vs a hand-copied fixture is a
// self-confirming tautology — both could be wrong the same way. This suite closes
// it with a THIRD fixed point: the SHA-256 of each physical chip, pinned here as a
// TEA constant (EXPECTED_*), computed from the silicon THIS session and
// independently corroborated by MAME's own SHA1 for the rev-4 parent set
// (centiped.cpp ROM_START(centiped): 136001-211.f7 / 136001-212.hj7).
//
//   • the chips ↔ the anchor:  sha256(vendored .201/.202) === EXPECTED  (tree only)
//   • the committed fixture ↔ the anchor:  the fixture manifest's digests === EXPECTED
//   • pictures.ts ↔ the anchor:  sha256(PLANE_LOWER/UPPER) === EXPECTED   (always)
//   • pictures.ts ↔ the chips:  PLANE_* === bytes(vendored .201/.202)     (tree only)
//
// Neither pictures.ts nor the fixture is ever validated against the OTHER — each is
// pinned to the anchor, and the anchor is re-verified against the real chips
// wherever the tree exists (every dev machine + the RED commit). So a drifted byte
// anywhere breaks a hash, and there is no hand-authored surface that escapes it.
//
// ─── DECODE-LAYOUT GROUND TRUTH (the ruling GREEN encodes as constants) ───────────
// CENPIC.MAC is .RADIX 16 (line 8), .ASECT. The assembled image is 0x1000 bytes:
// the LOWER bitplane is region 0x000-0x7FF (chip .201), the UPPER bitplane is the
// same stamp layout mirrored at 0x800-0xFFF (chip .202) — the upper-plane byte for
// a stamp at region offset X lives at X + 0x800. CENPIC's own comments name the
// split: "LOWER BIT FOR 8X16 MOTION OBJECTS" (:12) at .=0, "UPPER BIT OF 8 X 16
// MOTION OBJECT STAMPS" (:156) at .=800. MAME corroborates the decode: gfx region
// "gfx1" is 0x1000 with .201@0x000 + .202@0x800 (centiped.cpp ROM_START); the
// planar 2bpp layout is spritelayout {8,16, RGN_FRAC(1,2), planes 2, planeoffset
// {RGN_FRAC(1,2),0}, xoffset {0..7}} (centiped.cpp:1722-1732) — plane 1 (MSB) from
// the second half (.202), plane 0 (LSB) from the first (.201), pixel x=0 is the
// MSB. Motion objects are 8x16 (16 bytes/plane); playfield stamps are 8x8.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// src/core/pictures.ts is a TEA-authored STUB: placeholder constants (0), empty
// PLANE_*/STAMPS, a throwing decodeStamp. Every teeth test below fails until GREEN
// transcribes the planes, fills the naming table, and implements the decode. The
// committed fixture manifest (tests/fixtures/pictures/rom-manifest.json) and the
// claims/05-pictures.json entries are likewise GREEN's to author.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  REGION_SIZE,
  PLANE_SIZE,
  SPRITE_W,
  SPRITE_H,
  TILE_W,
  TILE_H,
  PLANE_LOWER,
  PLANE_UPPER,
  STAMPS,
  decodeStamp,
  type Stamp,
} from '../src/core/pictures'

// tests/pictures.test.ts → the plugin root is one level up.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

// The vendored 1981 source lives at the MONOREPO root — TWO levels above this
// plugin (plugins/centipede/../..). MIGRATION: it was one level up while
// centipede was a gitignored sibling subrepo; a stale `..` silently flips
// vendoredAvailable to false and SKIPS the byte-for-byte blocks below.
const vendoredRoot =
  process.env.CENTIPEDE_SOURCE_DIR ??
  join(repoRoot, '..', '..', 'reference', 'atari-source', 'centipede')
const picDir = join(vendoredRoot, 'revision.v2')
const rom201 = join(picDir, '136001.201')
const rom202 = join(picDir, '136001.202')
const vendoredAvailable = existsSync(rom201) && existsSync(rom202)

// The committed CI fixture: a digest manifest, NOT a redundant byte copy (a byte
// copy compared to pictures.ts would be the vacuous tautology AC-4 warns against).
const manifestPath = join(repoRoot, 'tests', 'fixtures', 'pictures', 'rom-manifest.json')

// ─── THE ANCHOR — TEA constants computed from the silicon this session ───────────
// SHA-256 is the immutable third reference. SHA1 is here purely to cross-check the
// vendored dump against MAME's independently-published hashes for the shipped chips.
const EXPECTED = {
  lower: {
    size: 2048,
    sha1: '6c862352c329776f2f9974a0df9dbe41f9dbc361', // === MAME 136001-211.f7
    sha256: '8916f56b898f448abd4f45e5590531c747617ffe14efa2b611135dd0781f148c',
  },
  upper: {
    size: 2048,
    sha1: '974c03d29aeca672fffa4dfc00a06be6a851aacb', // === MAME 136001-212.hj7
    sha256: '9d0c60b686a2478c679c36be0bf6cdd312363b0af161533de3d3ebcf304b105f',
  },
} as const

const sha256 = (bytes: Uint8Array | readonly number[]): string =>
  createHash('sha256').update(Buffer.from(bytes as number[])).digest('hex')
const sha1 = (bytes: Uint8Array): string => createHash('sha1').update(bytes).digest('hex')

/** A read-only binary read of a ROM chip — no encoding, ever (SM binary discipline). */
const readRom = (p: string): Uint8Array => new Uint8Array(readFileSync(p))

// A reference 2bpp decoder built from the RULED convention, used to derive golden
// grids from cited CENPIC bytes so the golden is ROM-DERIVED, not hand-drawn.
function refDecode(lower: number[], upper: number[]): number[][] {
  const rows: number[][] = []
  for (let r = 0; r < lower.length; r++) {
    const L = lower[r]
    const U = upper[r]
    const row: number[] = []
    for (let x = 0; x < 8; x++) {
      const m = 0x80 >> x // x=0 is the MSB
      row.push(((U & m ? 1 : 0) << 1) | (L & m ? 1 : 0)) // colour = upper<<1 | lower
    }
    rows.push(row)
  }
  return rows
}

// ───────────────────────────────────────────────────────────────────────────────
// DECODE-LAYOUT CONSTANTS — the ruling, pinned so a wrong transcription reddens.
// ───────────────────────────────────────────────────────────────────────────────
describe('pictures — decode-layout constants (the ruling; radix-cited in GREEN)', () => {
  it('REGION_SIZE is 0x1000 and PLANE_SIZE is 0x800 (two 2KB chips)', () => {
    expect(REGION_SIZE).toBe(0x1000)
    expect(PLANE_SIZE).toBe(0x800)
    expect(REGION_SIZE).toBe(PLANE_SIZE * 2)
  })

  it('sprites are 8x16, tiles are 8x8', () => {
    expect(SPRITE_W).toBe(8)
    expect(SPRITE_H).toBe(16)
    expect(TILE_W).toBe(8)
    expect(TILE_H).toBe(8)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-4 / AC-1 — pictures.ts IS the ROM bytes, pinned to the anchor. Runs always:
// the digest side needs neither the tree nor Dev's fixture.
// ───────────────────────────────────────────────────────────────────────────────
describe('pictures — plane bytes are the ROM chips, pinned to the SHA anchor (AC-1/AC-4)', () => {
  it('PLANE_LOWER / PLANE_UPPER are each exactly 2048 bytes', () => {
    expect(PLANE_LOWER.length).toBe(2048)
    expect(PLANE_UPPER.length).toBe(2048)
  })

  it('every plane entry is a byte (0..255) — no sentinels, no hand-authored escapes', () => {
    for (const b of PLANE_LOWER) expect(Number.isInteger(b) && b >= 0 && b <= 255).toBe(true)
    for (const b of PLANE_UPPER) expect(Number.isInteger(b) && b >= 0 && b <= 255).toBe(true)
  })

  it('sha256(PLANE_LOWER) matches the chip anchor (136001.201)', () => {
    expect(sha256(PLANE_LOWER)).toBe(EXPECTED.lower.sha256)
  })

  it('sha256(PLANE_UPPER) matches the chip anchor (136001.202)', () => {
    expect(sha256(PLANE_UPPER)).toBe(EXPECTED.upper.sha256)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-1 — the committed fixture (digest manifest) is itself pinned to the anchor, so
// the degraded CI path is NOT a self-confirming copy. Runs always.
// ───────────────────────────────────────────────────────────────────────────────
describe('pictures — committed fixture manifest is anchored to the chips (AC-1 degraded path)', () => {
  it('the fixture manifest exists (GREEN commits it for the CI fallback)', () => {
    expect(
      existsSync(manifestPath),
      'tests/fixtures/pictures/rom-manifest.json must be committed so CI can verify pictures.ts without the tree',
    ).toBe(true)
  })

  it('the manifest digests equal the anchor (the fixture is provably the real chips)', () => {
    expect(existsSync(manifestPath)).toBe(true) // guard: fail here, not with a JSON parse throw
    const m = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<
      string,
      { size: number; sha1: string; sha256: string }
    >
    expect(m['136001.201']).toMatchObject(EXPECTED.lower)
    expect(m['136001.202']).toMatchObject(EXPECTED.upper)
  })

  it('pictures.ts planes hash-match the committed fixture (the CI comparison)', () => {
    expect(existsSync(manifestPath)).toBe(true)
    const m = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, { sha256: string }>
    expect(sha256(PLANE_LOWER)).toBe(m['136001.201'].sha256)
    expect(sha256(PLANE_UPPER)).toBe(m['136001.202'].sha256)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-1 — the byte-for-byte gate against the silicon + the anchor's own self-test.
// Needs the vendored tree, so skipped on CI.
// ───────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('pictures — byte-for-byte against the vendored chips (AC-1)', () => {
  it('the anchor is honest: sha256/sha1 of the vendored chips === EXPECTED', () => {
    const lo = readRom(rom201)
    const hi = readRom(rom202)
    expect(lo.length).toBe(EXPECTED.lower.size)
    expect(hi.length).toBe(EXPECTED.upper.size)
    expect(sha1(lo)).toBe(EXPECTED.lower.sha1) // and === MAME 136001-211.f7
    expect(sha1(hi)).toBe(EXPECTED.upper.sha1) // and === MAME 136001-212.hj7
    expect(sha256(lo)).toBe(EXPECTED.lower.sha256)
    expect(sha256(hi)).toBe(EXPECTED.upper.sha256)
  })

  it('PLANE_LOWER decodes 136001.201 byte-for-byte', () => {
    const lo = readRom(rom201)
    expect(Array.from(lo)).toEqual(Array.from(PLANE_LOWER))
  })

  it('PLANE_UPPER decodes 136001.202 byte-for-byte', () => {
    const hi = readRom(rom202)
    expect(Array.from(hi)).toEqual(Array.from(PLANE_UPPER))
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The 2bpp DECODE — pinned to golden grids DERIVED from cited CENPIC bytes (so the
// golden is ROM-derived, never hand-drawn). Pins plane roles, MSB-first, row order,
// and both stamp geometries. Runs always (decodeStamp reads pictures.ts's planes).
// ───────────────────────────────────────────────────────────────────────────────
describe('pictures — decodeStamp obeys the ruled 2bpp convention (colour = upper<<1 | lower)', () => {
  const findByOffset = (offset: number): Stamp | undefined => STAMPS.find((s) => s.offset === offset)

  it('HEAD0 (8x16 sprite @ region 0x000) decodes to the ROM-derived golden', () => {
    // HEAD0 lower — CENPIC.MAC:13 ; upper is HEADS row0 at region 0x800 — CENPIC.MAC:157.
    const lower = [0, 0, 0, 0, 0x3c, 0x18, 0x18, 0xff, 0x7e, 0x3c, 0x18, 0, 0, 0, 0, 0]
    const upper = [0, 0, 0, 0, 0x3c, 0x7e, 0x7e, 0x7e, 0x7e, 0x3c, 0x18, 0, 0, 0, 0, 0]
    const golden = refDecode(lower, upper)
    const head0 = findByOffset(0x000)
    expect(head0, 'a stamp at region offset 0x000 (HEAD0) must exist').toBeTruthy()
    expect(head0!.kind).toBe('sprite')
    const grid = decodeStamp(head0!)
    expect(grid.length).toBe(16)
    expect(grid.every((row) => row.length === 8)).toBe(true)
    expect(grid).toEqual(golden)
    // HEAD0 exercises every plane combination — its decode must use all four
    // colours. A plane FLATTENED to 1bpp would be missing colour 2 or 3.
    expect(new Set(grid.flat())).toEqual(new Set([0, 1, 2, 3]))
  })

  it('FULL MUSHROOM (8x8 tile @ region 0x3F8) decodes to the ROM-derived golden', () => {
    // FULL MUSHROOM lower — CENPIC.MAC:111 ; upper — CENPIC.MAC:253 (region 0xBF8).
    const lower = [0x00, 0x0c, 0x0e, 0x6e, 0x6e, 0x0e, 0x0c, 0x00]
    const upper = [0x1c, 0x12, 0xf1, 0x91, 0x91, 0xf1, 0x12, 0x1c]
    const golden = refDecode(lower, upper)
    const mush = findByOffset(0x3f8)
    expect(mush, 'a tile at region offset 0x3F8 (FULL MUSHROOM) must exist').toBeTruthy()
    expect(mush!.kind).toBe('tile')
    const grid = decodeStamp(mush!)
    expect(grid.length).toBe(8)
    expect(grid.every((row) => row.length === 8)).toBe(true)
    expect(grid).toEqual(golden)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-2 — every motion-object stamp's name is a real CENPIC.MAC label AT the offset
// pictures.ts claims. A location-counter simulator (validated below by its own
// fixture self-tests) parses CENPIC's .ASECT/.RADIX-16 source. Needs the tree.
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Simulate the MACRO-11 location counter over CENPIC.MAC to map every LABEL to
 * its byte offset. Handles `.=EXPR` (set .), `LABEL:`, `.BYTE a,b,..` (advance by
 * comma count), `.REPT N`/`.ENDR` (repeat the body's byte count), `;` comments,
 * and hex/`.`/trailing-period-decimal literals (the file is .RADIX 16).
 */
function parseCenpicLabels(text: string): Record<string, number> {
  const num = (tokRaw: string, dot: number): number => {
    const tok = tokRaw.trim()
    if (tok === '.') return dot
    if (/^[0-9]+\.$/.test(tok)) return parseInt(tok.slice(0, -1), 10) // trailing-period decimal
    return parseInt(tok, 16) // radix 16
  }
  const evalExpr = (expr: string, dot: number): number => {
    const m = expr.match(/^([^+\-]+)([+-])(.+)$/)
    if (m) {
      const a = num(m[1], dot)
      const b = num(m[3], dot)
      return m[2] === '+' ? a + b : a - b
    }
    return num(expr, dot)
  }
  const labels: Record<string, number> = {}
  let dot = 0
  let rept: { count: number; bytes: number } | null = null
  for (const raw of text.split('\n')) {
    const semi = raw.indexOf(';')
    let line = semi >= 0 ? raw.slice(0, semi) : raw
    if (!line.trim()) continue
    const lab = line.match(/^([A-Za-z_][A-Za-z0-9_]*):/)
    if (lab) {
      labels[lab[1]] = dot
      line = line.slice(lab[0].length)
    }
    const t = line.trim()
    if (!t) continue
    if (t.startsWith('.=')) {
      dot = evalExpr(t.slice(2).trim(), dot)
    } else if (/^\.REPT\b/i.test(t)) {
      rept = { count: num(t.replace(/^\.REPT\s+/i, ''), dot), bytes: 0 }
    } else if (/^\.ENDR\b/i.test(t)) {
      if (rept) {
        dot += rept.bytes * rept.count
        rept = null
      }
    } else if (/^\.BYTE\b/i.test(t)) {
      const n = t.replace(/^\.BYTE\s+/i, '').split(',').length
      if (rept) rept.bytes += n
      else dot += n
    }
  }
  return labels
}

// Motion-object labels every entity in AC-3 must resolve to. Head/body share ONE
// sprite pool: CENDEF.MAC:129-137 documents motion-object picture numbers (0-7 =
// centipede head pictures + body/poisoned variants) all indexing the HEAD0..HEADF
// stamps; CENTI4.MAC:478/500 pick "HEAD PICTURE" vs "BODY PICTURE" by number.
const CENTIPEDE_LABELS = Array.from({ length: 16 }, (_, i) => `HEAD${i.toString(16).toUpperCase()}`)
const SPIDER_LABELS = Array.from({ length: 8 }, (_, i) => `BUG${i}`)
const FLEA_LABELS = Array.from({ length: 4 }, (_, i) => `ANT${i}`)
const SCORPION_LABELS = Array.from({ length: 4 }, (_, i) => `SCORP${i}`)
const REQUIRED_MOTION_LABELS = [
  ...CENTIPEDE_LABELS,
  ...SPIDER_LABELS,
  ...FLEA_LABELS,
  ...SCORPION_LABELS,
  'GUN', // player gun (motion object)
  'SHOT', // player shot
]

describe('AC-2 — the location-counter parser has teeth (fixture self-tests)', () => {
  // A tiny hand-checked CENPIC fragment: proves the simulator handles .=, labels,
  // .BYTE comma-counting, and .REPT/.ENDR without needing the vendored tree.
  const fragment = [
    '\t.RADIX 16',
    '\t.=0',
    'A:\t.BYTE 0,0,0,0,3C,18,18,0FF,7E,3C,18,0,0,0,0,0', // 16 bytes -> next at 0x10
    'B:\t.BYTE 0,0,0,0', // 4 bytes -> next at 0x14
    '\t.REPT 4.',
    '\t.BYTE 0,0,0', // body is 3 bytes, x4 -> +0x0C -> next at 0x20
    '\t.ENDR',
    'C:\t.BYTE 0', // at 0x20
    '\t.=800',
    'D:\t.BYTE 0', // at 0x800
  ].join('\n')

  it('resolves labels, comma-counts .BYTE, and multiplies .REPT bodies', () => {
    const L = parseCenpicLabels(fragment)
    expect(L.A).toBe(0x00)
    expect(L.B).toBe(0x10)
    expect(L.C).toBe(0x20)
    expect(L.D).toBe(0x800)
  })
})

describe.skipIf(!vendoredAvailable)('AC-2 — motion-object names trace to CENPIC labels + offsets', () => {
  const cenpic = join(picDir, 'CENPIC.MAC')
  const labels = existsSync(cenpic) ? parseCenpicLabels(readFileSync(cenpic, 'utf8')) : {}

  it('the parser agrees with the decode-verified anchor offsets against real CENPIC.MAC', () => {
    // Independent corroboration of both the parser AND the decode offsets.
    expect(labels.HEAD0).toBe(0x000)
    expect(labels.HEADS).toBe(0x800) // upper plane of HEAD0 == region 0x000 + 0x800
    expect(labels.GUN).toBe(0x080)
    expect(labels.BUG0).toBe(0x0a0)
    expect(labels.SHOT).toBe(0x480)
  })

  it('every required motion label exists in CENPIC and its lower-plane stamp sits below 0x800', () => {
    for (const name of REQUIRED_MOTION_LABELS) {
      expect(labels[name], `CENPIC.MAC must define label ${name}`).toBeTypeOf('number')
      expect(labels[name], `${name}'s lower plane must be in region 0x000-0x7FF`).toBeLessThan(0x800)
    }
  })

  it('every motion-object STAMP in pictures.ts sits at its true CENPIC label offset', () => {
    const named = STAMPS.filter((s) => s.name in labels)
    expect(named.length, 'no STAMP name matched a CENPIC label — the naming table is unwired').toBeGreaterThan(0)
    const wrong = named.filter((s) => s.offset !== labels[s.name])
    expect(
      wrong.map((s) => `${s.name}@0x${s.offset.toString(16)} (CENPIC says 0x${labels[s.name].toString(16)})`),
      'these STAMP offsets disagree with CENPIC.MAC',
    ).toEqual([])
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-3 — every listed entity is present + identified in the naming table. Names
// only, so this runs everywhere. The contact-sheet artifact is verified by
// tools/pictures-bake/bake-contact-sheet.test.mjs.
// ───────────────────────────────────────────────────────────────────────────────
describe('AC-3 — the naming table names every required entity', () => {
  const names = () => new Set(STAMPS.map((s) => s.name))

  it('all 16 centipede head/body frames (HEAD0..HEADF)', () => {
    const missing = CENTIPEDE_LABELS.filter((n) => !names().has(n))
    expect(missing, 'centipede segment frames missing from STAMPS').toEqual([])
  })

  it('the spider (BUG0..BUG7), flea (ANT0..ANT3), and scorpion (SCORP0..SCORP3) frames', () => {
    const req = [...SPIDER_LABELS, ...FLEA_LABELS, ...SCORPION_LABELS]
    expect(req.filter((n) => !names().has(n)), 'enemy frames missing from STAMPS').toEqual([])
  })

  it('the player gun (GUN motion stamp) and the shot (SHOT)', () => {
    expect(names().has('GUN')).toBe(true)
    expect(names().has('SHOT')).toBe(true)
  })

  it('mushroom tiles are present (at least the four growth stages)', () => {
    const mushrooms = STAMPS.filter((s) => s.kind === 'tile' && /mushroom/i.test(s.name))
    expect(mushrooms.length, 'STAMPS must name the mushroom tiles').toBeGreaterThanOrEqual(4)
  })

  it('character + digit tiles are present (CHAR_A..CHAR_Z and DIGIT_0..DIGIT_9)', () => {
    // The chars/digits are UNLABELED in CENPIC (commented `;A`..`;Z`, `;0`..`;9` in
    // the .=200/.=800+200 playfield blocks) — GREEN names them by this convention.
    const names = new Set(STAMPS.filter((s) => s.kind === 'tile').map((s) => s.name))
    const missingLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter((c) => !names.has(`CHAR_${c}`))
    const missingDigits = '0123456789'.split('').filter((d) => !names.has(`DIGIT_${d}`))
    expect(missingLetters, 'character tiles missing from STAMPS').toEqual([])
    expect(missingDigits, 'digit tiles missing from STAMPS').toEqual([])
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-2 — the naming table is committed as a human doc in the story docs.
// ───────────────────────────────────────────────────────────────────────────────
describe('AC-2 — the naming table is committed in the story docs', () => {
  const docPath = join(repoRoot, 'docs', 'rom-study', 'pictures.md')

  it('docs/rom-study/pictures.md exists (the committed naming table)', () => {
    expect(existsSync(docPath), 'the naming table must be committed at docs/rom-study/pictures.md').toBe(true)
  })

  it('the naming doc names every motion-object label + each entity class', () => {
    expect(existsSync(docPath)).toBe(true)
    const doc = readFileSync(docPath, 'utf8')
    const missingLabels = REQUIRED_MOTION_LABELS.filter((n) => !doc.includes(n))
    expect(missingLabels, 'these CENPIC labels are absent from the naming table doc').toEqual([])
    for (const word of ['centipede', 'spider', 'flea', 'scorpion', 'mushroom', 'shot', 'gun']) {
      expect(doc.toLowerCase(), `the naming table must identify the ${word}`).toContain(word)
    }
  })
})
