// tests/stamp-data.test.ts
//
// Story ml2-4 — RED phase (TEA). The BAKE seam: tools/bake-graphics.mjs reads
// the two licence-walled picture EPROMs and emits the COMMITTED
// src/shell/stamp-data.ts module the running game imports — "bake, don't
// fetch" (docs/playbooks/next-sprite-game.md §2, the pac-man model:
// plugins/pac-man/tools/bake-graphics.mjs → tile-data.ts, byte-equality-tested
// in plugins/pac-man/tests/shell/tiles.test.ts).
//
// ─── THE REGION LAW (derived, cited in prose — GPL: never copied) ─────────────
// ml2-2's decodeStamp takes the WHOLE two-plane region and treats the FIRST
// half as the LOW bitplane, the SECOND half as the HIGH bitplane. Which CHIP
// is which half was left to this story, and the ground truth is pinned by the
// ml2-1 byte claims (docs/rom-study/claims/06-graphics.json): in MAME's gfx1
// region 136013-107.r5 loads FIRST (0x0000) and 136013-106.p5 SECOND (0x0800)
// (centiped.cpp:2226-2227 — named as a citation, no MAME code transcribed).
// So the baked region is concat(107.r5, 106.p5): 107 is the low plane, 106
// the high plane. THE VISUAL PLAYTEST AT /millipede/ IS THE FINAL ARBITER
// (playbook §4 — byte-equality hides orientation bugs): if the sheet renders
// inverted/garbled, the fix flips the bake AND this file's provenance pins
// together, in this story.
//
// ─── WHAT GREEN (Dev) MUST SHIP ───────────────────────────────────────────────
//   tools/bake-graphics.mjs — a THIN driver (read bytes → call ml2-2's
//       decodeStamp → write the module). Decode logic lives ONLY in
//       src/shell/gfx-rom.ts; the tool imports it directly as .ts under
//       Node's type stripping (the ml2-2 AC-4 probe proved that leg).
//   src/shell/stamp-data.ts — GENERATED data only, committed. Exports:
//         STAMPS: 256 stamps × 8 rows × 8 pixels, values 0..3
//         LOW_PLANE_FILE  = '136013-107.r5'   (provenance, gfx1 @0x0000)
//         HIGH_PLANE_FILE = '136013-106.p5'   (provenance, gfx1 @0x0800)
//
// LICENCE WALL (the ml2-1 CI-green invariant): the EPROM images are gitignored
// and ABSENT on a CI clone — every test that opens them skips when they are
// missing. The committed-data teeth that run EVERYWHERE are the shape tests
// and the claim-pinned golden below (the claims JSON is committed, so stamps
// 0 and 1 are byte-provable with no ROM on disk).
//
// NOTE for GREEN in THIS checkout (a-1): ml2-1 was worked in a sibling
// checkout, so reference/original-source/millipede/ here has the .MAC sources
// but NOT the two EPROM images. Vendor them first (source: ~/roms/milliped.zip,
// CRCs pinned in tests/audit/graphics-rom.test.ts) or the skipIf teeth below
// stay dormant and prove nothing.

import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { decodeStamp } from '../src/shell/gfx-rom'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bakeToolPath = join(root, 'tools', 'bake-graphics.mjs')
const stampDataPath = join(root, 'src', 'shell', 'stamp-data.ts')

// The vendored tree sits at the MONOREPO root (see check-citations.mjs) — two
// levels above plugins/millipede.
const vendoredRoot = join(root, '..', '..', 'reference', 'original-source', 'millipede')
const LOW_ROM = '136013-107.r5' // gfx1 @0x0000 → FIRST half → low plane
const HIGH_ROM = '136013-106.p5' // gfx1 @0x0800 → SECOND half → high plane
const lowRomPath = join(vendoredRoot, LOW_ROM)
const highRomPath = join(vendoredRoot, HIGH_ROM)
const romsPresent = existsSync(lowRomPath) && existsSync(highRomPath)

interface StampDataModule {
  STAMPS: readonly (readonly (readonly number[])[])[]
  LOW_PLANE_FILE: string
  HIGH_PLANE_FILE: string
}

// A COMPUTED specifier (the centipede bonus-lives.test.ts pattern): tsc cannot
// resolve it, so the RED tree stays lint-clean while stamp-data.ts does not
// exist; vitest resolves it at runtime, relative to this file.
const STAMP_DATA_SPECIFIER = ['..', 'src', 'shell', 'stamp-data'].join('/')

/**
 * Load the baked module with a self-describing failure (the ml1-1 loadScanner
 * pattern): a RED failure must prove the FEATURE is absent, not that the test
 * is broken.
 */
async function loadStampData(): Promise<StampDataModule> {
  try {
    const mod = (await import(/* @vite-ignore */ STAMP_DATA_SPECIFIER)) as Partial<StampDataModule>
    if (!Array.isArray(mod.STAMPS)) throw new Error('module has no STAMPS array export')
    if (typeof mod.LOW_PLANE_FILE !== 'string' || typeof mod.HIGH_PLANE_FILE !== 'string') {
      throw new Error('module lacks LOW_PLANE_FILE / HIGH_PLANE_FILE provenance exports')
    }
    return mod as StampDataModule
  } catch (e) {
    throw new Error(
      'src/shell/stamp-data.ts not baked yet — GREEN (Dev) ships tools/bake-graphics.mjs ' +
        'which decodes the two picture EPROMs via ml2-2 decodeStamp and emits the committed ' +
        `stamp-data.ts module: ${e instanceof Error ? e.message : String(e)}`,
    )
  }
}

/** Strip // and block comments so a wiring grep can never be satisfied by prose. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — the bake tool exists and is a THIN driver over the ml2-2 seam.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml2-4 AC-1 — tools/bake-graphics.mjs is a thin driver', () => {
  it('the bake tool exists', () => {
    expect(existsSync(bakeToolPath), 'plugins/millipede/tools/bake-graphics.mjs must exist').toBe(true)
  })

  it('imports decodeStamp from the src/shell/gfx-rom.ts seam (code, not comment)', () => {
    const code = stripComments(readFileSync(bakeToolPath, 'utf8'))
    expect(
      /import\s*\{[^}]*\bdecodeStamp\b[^}]*\}\s*from\s*['"]\.\.\/src\/shell\/gfx-rom\.ts['"]/.test(code),
      'the tool must import { decodeStamp } from ../src/shell/gfx-rom.ts — decode logic lives in the seam',
    ).toBe(true)
  })

  it('does not re-implement the bitplane decode (no MSB-first mask walk in the tool)', () => {
    const code = stripComments(readFileSync(bakeToolPath, 'utf8'))
    expect(
      /0x80\s*>>/.test(code),
      'the tool re-implements the row-byte mask walk — call decodeStamp instead (one decode law, one home)',
    ).toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — the committed module's shape and provenance. Runs EVERYWHERE (no ROM).
// ═════════════════════════════════════════════════════════════════════════════
describe('ml2-4 AC-2 — committed stamp-data.ts shape + provenance', () => {
  it('exports 256 stamps of 8 rows x 8 pixels, every pixel an integer 0..3', async () => {
    const { STAMPS } = await loadStampData()
    expect(STAMPS.length).toBe(256)
    for (const stamp of STAMPS) {
      expect(stamp.length).toBe(8)
      for (const row of stamp) {
        expect(row.length).toBe(8)
        for (const px of row) {
          expect(Number.isInteger(px)).toBe(true)
          expect(px).toBeGreaterThanOrEqual(0)
          expect(px).toBeLessThanOrEqual(3)
        }
      }
    }
  })

  it('declares the MAME gfx1 chip-to-plane order as provenance', async () => {
    const mod = await loadStampData()
    expect(mod.LOW_PLANE_FILE).toBe(LOW_ROM)
    expect(mod.HIGH_PLANE_FILE).toBe(HIGH_ROM)
  })

  // A stub of zeros (or a bake that dropped one plane) satisfies every shape
  // assertion above. Both planes really loaded ⇔ pixel values 1, 2 AND 3 all
  // occur somewhere: value 1 needs the low plane, 2 the high, 3 both.
  it('is non-trivial: pixel values 1, 2 and 3 each appear somewhere in the sheet', async () => {
    const { STAMPS } = await loadStampData()
    const seen = new Set<number>()
    for (const stamp of STAMPS) for (const row of stamp) for (const px of row) seen.add(px)
    expect([...seen].sort()).toContain(1)
    expect(seen.has(2), 'no pixel uses the HIGH plane — was 136013-106.p5 baked in?').toBe(true)
    expect(seen.has(3), 'no pixel drives both planes — is one plane all zeros?').toBe(true)
  })

  it('carries the GENERATED header so nobody hand-edits baked data', () => {
    if (!existsSync(stampDataPath)) {
      throw new Error('src/shell/stamp-data.ts not baked yet — GREEN ships it via tools/bake-graphics.mjs')
    }
    const src = readFileSync(stampDataPath, 'utf8')
    expect(/^\/\/ GENERATED by tools\/bake-graphics\.mjs/.test(src)).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3a — the CLAIM-PINNED GOLDEN: stamps 0 and 1, provable WITHOUT the ROMs.
// ml2-1's byte claims commit the first 16 bytes of EACH EPROM (GFX-106 /
// GFX-107 in docs/rom-study/claims/06-graphics.json). Building a synthetic
// 32-byte region from those runs — 107's bytes as the first half, 106's as the
// second — gives decodeStamp ground truth for stamp 0 (offset 0) and stamp 1
// (offset 8). A committed bake with the PLANES INVERTED swaps pixel values
// 1↔2 and reddens here, on every clone, licence wall or not.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml2-4 AC-3a — stamps 0 and 1 match the committed byte claims', () => {
  it('STAMPS[0] and STAMPS[1] equal a fresh decode of the claim-pinned bytes', async () => {
    const { STAMPS } = await loadStampData()
    const claims = JSON.parse(
      readFileSync(join(root, 'docs', 'rom-study', 'claims', '06-graphics.json'), 'utf8'),
    ) as { id: string; source: { file: string; offset: number; bytes: number[] } }[]

    const lowRun = claims.find((c) => c.source.file === LOW_ROM)
    const highRun = claims.find((c) => c.source.file === HIGH_ROM)
    if (!lowRun || !highRun) throw new Error('06-graphics.json no longer pins a run per EPROM')
    expect(lowRun.source.offset).toBe(0)
    expect(highRun.source.offset).toBe(0)
    expect(lowRun.source.bytes.length).toBe(16)
    expect(highRun.source.bytes.length).toBe(16)

    // 107.r5 first half (low plane), 106.p5 second half (high plane).
    const region = Uint8Array.from([...lowRun.source.bytes, ...highRun.source.bytes])
    expect(STAMPS[0].map((r) => [...r])).toEqual(decodeStamp(region, 0))
    expect(STAMPS[1].map((r) => [...r])).toEqual(decodeStamp(region, 8))
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3b — FULL byte-equality against the vendored EPROMs (pac-man's
// tiles.test.ts tooth), skipped behind the licence wall.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml2-4 AC-3b — baked stamps equal a fresh decode of the vendored EPROMs', () => {
  it.skipIf(!romsPresent)('all 256 stamps byte-match decodeStamp over concat(107.r5, 106.p5)', async () => {
    const { STAMPS } = await loadStampData()
    const low = new Uint8Array(readFileSync(lowRomPath))
    const high = new Uint8Array(readFileSync(highRomPath))
    expect(low.length).toBe(2048)
    expect(high.length).toBe(2048)
    const region = new Uint8Array(4096)
    region.set(low, 0)
    region.set(high, 2048)
    const fresh = Array.from({ length: 256 }, (_, i) => decodeStamp(region, i * 8))
    expect(STAMPS.map((s) => s.map((r) => [...r]))).toEqual(fresh)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-6 — REGENERABILITY: running the tool reproduces the committed module
// byte-for-byte (the committed data IS the tool's output, not a hand edit).
// Skipped behind the licence wall; the original text is restored afterwards so
// a failing bake never leaves the working tree dirty.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml2-4 AC-6 — the bake is reproducible', () => {
  it.skipIf(!romsPresent)('node tools/bake-graphics.mjs rewrites stamp-data.ts byte-identically', () => {
    const before = readFileSync(stampDataPath, 'utf8')
    try {
      execFileSync(process.execPath, [bakeToolPath], { stdio: 'pipe' })
      const after = readFileSync(stampDataPath, 'utf8')
      expect(after).toBe(before)
    } finally {
      writeFileSync(stampDataPath, before)
    }
  })
})
