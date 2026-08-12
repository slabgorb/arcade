// tests/audit/graphics-rom.test.ts
//
// Story ml2-1 — RED phase (Leeloo / TEA). Vendor + byte-citation-gate the two
// Millipede PICTURE EPROMs and record their provenance. This is the pac-man model
// (plugins/pac-man/tools/audit/check-citations.mjs, the `{file, offset, bytes}`
// GRAPHICS-ROM byte teeth) grafted onto ml1's single-sided Millipede citation gate,
// which today is TEXT-ONLY (`{file, line, verbatim}`). GREEN (Korben / Dev) must:
//
//   1. VENDOR the two 2 KiB picture EPROMs into the vendored tree
//      (reference/original-source/millipede/), LICENCE-WALLED — a .gitignore rule so
//      the bytes are never committed (the .MAC assembler source there IS committed;
//      the ROM images are not). Source: ~/roms/milliped.zip.
//        · 136013-106.p5 — 2048 bytes, CRC32 f4468045
//        · 136013-107.r5 — 2048 bytes, CRC32 68c3437a
//      Both CRC-verified against MAME by TEA this session.
//   2. EXTEND plugins/millipede/tools/audit/check-citations.mjs (+ .d.mts) with a
//      BYTE citation shape `{ file, offset, bytes }` (whole bytes 0..255), ported
//      verbatim in spirit from pac-man's graphics-ROM teeth. It must byte-verify the
//      run against the vendored binary, AND — the CI-green invariant — treat a binary
//      that is ABSENT under the root as SKIP (schema-only), never an error, because
//      the images are licence-walled and absent on a CI clone. (millipede's existing
//      `vendoredAvailable = existsSync(vendoredRoot)` keys on the DIRECTORY, which is
//      always present, so the per-FILE guard has to live in the byte path itself —
//      the "First-ship quarry gate CI-red" trap.)
//   3. RECORD the provenance as byte claims under docs/rom-study/claims/ (one run per
//      EPROM is enough to pin identity; loadClaims globs the dir), each carrying a
//      MAME CRC32 + centiped.cpp corroboration in prose (GPL — cite, never copy).
//
// SCOPE FENCE (epic ml2): vendor + byte-gate + provenance ONLY. The 8x8 planar decode
// primitive is ml2-2, the RAM-colour palette seam ml2-3, the bake + visual playfield
// ml2-4. Nothing here decodes a pixel — a claim pins RAW bytes.
//
// MAME ground truth (centiped.cpp:2225-2227 — Millipede has NO milliped.cpp; it rides
// the Centipede driver), region "gfx1": 107.r5 loads at 0x0000, 106.p5 at 0x0800.
// Cited in prose only; nothing in this file is copied from MAME source.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { crc32 } from 'node:zlib'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadClaims } from './dossier-sweep.js'

// ─── Local fixture types ─────────────────────────────────────────────────────────
// A NARROWED view of the byte arm of `check-citations.d.mts`'s `Claim.source` union,
// used to build byte-citation fixtures inline (a required `bytes`, not the text|byte
// union). Kept local so a fixture reads as a plain object literal; it mirrors the
// pac-man byte-citation contract.
interface ByteSource {
  file: string
  offset: number
  bytes: number[]
}
interface ByteClaim {
  id: string
  claim: string
  source: ByteSource
  corroboration?: unknown
}
type CheckClaims = (
  claims: ReadonlyArray<{ id: string; claim: string; source: unknown; corroboration?: unknown }>,
  opts: { vendoredRoot: string | null },
) => string[]

// tests/audit/graphics-rom.test.ts → the plugin root is two levels up.
const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const repoRoot = join(pluginRoot, '..', '..')

// Same wiring ml1's citations.test.ts uses: the vendored 1982 tree sits at the
// MONOREPO root. The picture EPROMs are vendored INTO this same dir, licence-walled.
const vendoredRoot =
  process.env.MILLIPEDE_SOURCE_DIR ?? join(repoRoot, 'reference', 'original-source', 'millipede')

// The two picture EPROMs, with the identity MAME records (centiped.cpp:2226-2227) —
// verified byte-for-byte against ~/roms/milliped.zip by TEA this session.
const EPROMS = [
  { file: '136013-106.p5', size: 2048, crc32: 'f4468045' },
  { file: '136013-107.r5', size: 2048, crc32: '68c3437a' },
] as const

// Per-FILE existence (NOT `existsSync(vendoredRoot)`): the dir is always present
// because the .MAC source is committed, but the licence-walled binaries are absent
// on CI. These byte-proofs skip when the images are absent, and assert when a dev
// checkout has vendored them.
const romPresent = (e: (typeof EPROMS)[number]) => existsSync(join(vendoredRoot, e.file))
const allRomsPresent = EPROMS.every(romPresent)

// Load the not-yet-extended checker with a self-describing failure (the harness-error
// trap: a RED must prove the FEATURE is absent, not that the test is broken).
async function loadChecker(): Promise<CheckClaims> {
  try {
    const mod = (await import('../../tools/audit/check-citations.mjs')) as { checkClaims?: CheckClaims }
    if (typeof mod.checkClaims !== 'function') throw new Error('module has no `checkClaims` export')
    return mod.checkClaims
  } catch (e) {
    throw new Error(
      'citation checker not built / not byte-extended yet — GREEN (Dev) extends ' +
        'plugins/millipede/tools/audit/check-citations.mjs (+ .d.mts) with a byte citation ' +
        "`{ file, offset, bytes }` ported from pac-man's graphics-ROM teeth: schema-validate " +
        'everywhere, byte-verify against the vendored binary, and SKIP (not error) a binary that ' +
        `is absent under the root (licence-wall / CI-green). (${(e as Error).message})`,
    )
  }
}

const isByteClaim = (c: { source: unknown }): c is ByteClaim => {
  const s = c.source as Record<string, unknown> | null
  return !!s && typeof s.file === 'string' && Number.isInteger(s.offset) && Array.isArray(s.bytes)
}

// ───────────────────────────────────────────────────────────────────────────────
// BYTE-CITATION SCHEMA TEETH — run everywhere (no vendored tree needed)
// ───────────────────────────────────────────────────────────────────────────────
describe('citation checker — byte-citation schema (ml2-1 AC2, runs schema-only)', () => {
  it('accepts a well-formed byte citation `{ file, offset, bytes }` (schema-only)', async () => {
    const checkClaims = await loadChecker()
    const claim: ByteClaim = {
      id: 'GFX-OK',
      claim: 'a byte run of the picture EPROM',
      source: { file: '136013-106.p5', offset: 0, bytes: [0, 1, 2, 255] },
    }
    expect(checkClaims([claim], { vendoredRoot: null })).toEqual([])
  })

  it('rejects a byte citation with an out-of-range byte (>255)', async () => {
    const checkClaims = await loadChecker()
    const bad: ByteClaim = { id: 'GFX-BIG', claim: 'c', source: { file: 'x', offset: 0, bytes: [256] } }
    expect(checkClaims([bad], { vendoredRoot: null }).join('\n')).toMatch(/GFX-BIG/)
  })

  it('rejects a byte citation with a negative byte', async () => {
    const checkClaims = await loadChecker()
    const bad: ByteClaim = { id: 'GFX-NEG', claim: 'c', source: { file: 'x', offset: 0, bytes: [-1] } }
    expect(checkClaims([bad], { vendoredRoot: null }).join('\n')).toMatch(/GFX-NEG/)
  })

  it('rejects a byte citation with an empty bytes array (a claim that pins nothing)', async () => {
    const checkClaims = await loadChecker()
    const bad: ByteClaim = { id: 'GFX-EMPTY', claim: 'c', source: { file: 'x', offset: 0, bytes: [] } }
    expect(checkClaims([bad], { vendoredRoot: null }).join('\n')).toMatch(/GFX-EMPTY/)
  })

  it('rejects a byte citation with a negative offset', async () => {
    const checkClaims = await loadChecker()
    const bad: ByteClaim = { id: 'GFX-OFF', claim: 'c', source: { file: 'x', offset: -4, bytes: [1] } }
    expect(checkClaims([bad], { vendoredRoot: null }).join('\n')).toMatch(/GFX-OFF/)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// BYTE-VERIFICATION TEETH — synthetic binary, deterministic, runs everywhere
// ───────────────────────────────────────────────────────────────────────────────
describe('citation checker — byte teeth over a present binary (ml2-1 AC2/AC4)', () => {
  it('a correct byte run re-opens clean; a drifted byte reddens (the gate has teeth)', async () => {
    const checkClaims = await loadChecker()
    const root = mkdtempSync(join(tmpdir(), 'ml2-1-rom-'))
    try {
      writeFileSync(join(root, 'FAKE.rom'), Buffer.from([10, 20, 30, 40, 50]))
      const ok: ByteClaim = { id: 'BT-OK', claim: 'run', source: { file: 'FAKE.rom', offset: 1, bytes: [20, 30] } }
      expect(checkClaims([ok], { vendoredRoot: root })).toEqual([])

      const drifted: ByteClaim = { id: 'BT-BAD', claim: 'run', source: { file: 'FAKE.rom', offset: 1, bytes: [20, 99] } }
      expect(checkClaims([drifted], { vendoredRoot: root }).join('\n')).toMatch(/BT-BAD/)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('a run that overflows end-of-file reddens rather than reading past it', async () => {
    const checkClaims = await loadChecker()
    const root = mkdtempSync(join(tmpdir(), 'ml2-1-rom-'))
    try {
      writeFileSync(join(root, 'TINY.rom'), Buffer.from([1, 2]))
      const over: ByteClaim = { id: 'BT-OVER', claim: 'run', source: { file: 'TINY.rom', offset: 1, bytes: [2, 3, 4] } }
      expect(checkClaims([over], { vendoredRoot: root }).join('\n')).toMatch(/BT-OVER/)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('SKIPS a byte citation whose binary is ABSENT under the root — never errors (licence-wall / CI-green)', async () => {
    // THE CI-safety invariant. On a CI clone the vendored DIR exists (.MAC committed)
    // but the licence-walled EPROM does not. A byte citation to a missing binary must
    // degrade to schema-only, not to a "file does not exist" error, or every deploy
    // reddens the moment a graphics claim lands.
    const checkClaims = await loadChecker()
    const emptyRoot = mkdtempSync(join(tmpdir(), 'ml2-1-absent-'))
    try {
      const claim: ByteClaim = { id: 'BT-ABSENT', claim: 'run', source: { file: '136013-106.p5', offset: 0, bytes: [1, 2, 3] } }
      expect(checkClaims([claim], { vendoredRoot: emptyRoot })).toEqual([])
    } finally {
      rmSync(emptyRoot, { recursive: true, force: true })
    }
  })

  it('REFUSES a PATHFUL / traversal-shaped byte citation loudly — the licence-wall skip is bare-filenames only', async () => {
    // The skip is ONLY for a bare filename absent everywhere (the walled EPROM on CI).
    // A `../…` byte citation must be REFUSED with an error, exactly as the text path
    // refuses an escaping path (cp1-2/cp1-3, ml1-1 S1) — never silently reported clean.
    const checkClaims = await loadChecker()
    const base = mkdtempSync(join(tmpdir(), 'ml2-1-esc-'))
    try {
      const tree = join(base, 'tree')
      mkdirSync(tree, { recursive: true })
      writeFileSync(join(base, 'SECRET.rom'), Buffer.from([1, 2, 3, 4])) // sibling of tree → OUTSIDE
      // The escape: ../SECRET.rom resolves OUTSIDE the tree. Without the guard it would
      // silently skip (no read escapes, but the citation is reported as clean/verified).
      const escape: ByteClaim = { id: 'BT-ESC', claim: 'traversal', source: { file: '../SECRET.rom', offset: 0, bytes: [1, 2] } }
      expect(
        checkClaims([escape], { vendoredRoot: tree }).join('\n'),
        'a byte citation whose path escapes the vendored tree must be refused, not silently accepted',
      ).toMatch(/BT-ESC/)
      // And a bare `..` (the exact S1 shape the text path hardened) is likewise refused.
      const dotdot: ByteClaim = { id: 'BT-DOTDOT', claim: 'dir', source: { file: '..', offset: 0, bytes: [1] } }
      expect(checkClaims([dotdot], { vendoredRoot: tree }).join('\n')).toMatch(/BT-DOTDOT/)
    } finally {
      rmSync(base, { recursive: true, force: true })
    }
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// PROVENANCE RECORDED — the real dossier (ml2-1 AC3), runs everywhere
// ───────────────────────────────────────────────────────────────────────────────
describe('dossier — provenance byte claims for both picture EPROMs (ml2-1 AC3)', () => {
  it('records a byte citation pinning each of 136013-106.p5 and 136013-107.r5', () => {
    const byteClaims = loadClaims().filter(isByteClaim)
    for (const e of EPROMS) {
      const forFile = byteClaims.filter((c) => c.source.file === e.file && c.source.bytes.length > 0)
      expect(forFile.length, `no byte claim pins ${e.file} — GREEN records one in docs/rom-study/claims/`).toBeGreaterThan(0)
    }
  })

  it('records the MAME CRC32 + centiped.cpp provenance in a STRUCTURED corroboration for each EPROM', () => {
    // Assert against the `corroboration` FIELD, not the whole serialized claim: a token
    // check over the entire claim passes when the CRC/driver are merely name-dropped in
    // the free-text `claim` prose with no corroboration recorded at all. Provenance (AC3)
    // means a structured, checkable citation of where the identity comes from.
    const byteClaims = loadClaims().filter(isByteClaim)
    for (const e of EPROMS) {
      const forFile = byteClaims.filter((c) => c.source.file === e.file)
      expect(forFile.length, `no byte claim pins ${e.file}`).toBeGreaterThan(0)
      const withProv = forFile.filter((c) => c.corroboration !== undefined && c.corroboration !== null)
      expect(withProv.length, `${e.file} must carry a corroboration object recording provenance (not just prose)`).toBeGreaterThan(0)
      const corr = JSON.stringify(withProv.map((c) => c.corroboration)).toLowerCase()
      expect(corr, `${e.file} corroboration must record its MAME CRC32 ${e.crc32}`).toContain(e.crc32)
      expect(corr, `${e.file} corroboration must cite the MAME driver centiped.cpp`).toContain('centiped.cpp')
    }
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// LICENCE-WALL — the bytes are gitignored, never committed (ml2-1 AC1), runs everywhere
// ───────────────────────────────────────────────────────────────────────────────
describe('licence-wall — the picture EPROM bytes are gitignored (ml2-1 AC1)', () => {
  for (const e of EPROMS) {
    it(`${e.file} is git-ignored (never committed)`, () => {
      const rel = join('reference', 'original-source', 'millipede', e.file)
      let ignored = false
      try {
        // check-ignore exits 0 when a rule matches, 1 when none does (throws here).
        execFileSync('git', ['check-ignore', '--quiet', rel], { cwd: repoRoot })
        ignored = true
      } catch {
        ignored = false
      }
      expect(ignored, `${rel} must be matched by a .gitignore rule so the ROM bytes are never committed`).toBe(true)
    })
  }
})

// ───────────────────────────────────────────────────────────────────────────────
// REAL VENDORED BYTES — dev-only proof (skips on a licence-walled CI clone)
// ───────────────────────────────────────────────────────────────────────────────
describe.skipIf(!allRomsPresent)('vendored bytes — the real picture EPROMs match MAME (ml2-1 AC1/AC4)', () => {
  for (const e of EPROMS) {
    it(`${e.file} is exactly ${e.size} bytes and CRC32 ${e.crc32}`, () => {
      const buf = readFileSync(join(vendoredRoot, e.file))
      expect(buf.length).toBe(e.size)
      expect((crc32(buf) >>> 0).toString(16).padStart(8, '0')).toBe(e.crc32)
    })
  }

  it('every recorded graphics byte claim re-opens byte-for-byte against the vendored EPROM', async () => {
    const checkClaims = await loadChecker()
    const graphics = loadClaims().filter(
      (c): c is ByteClaim => isByteClaim(c) && EPROMS.some((e) => c.source.file === e.file),
    )
    expect(graphics.length, 'expected graphics byte claims once GREEN records provenance').toBeGreaterThan(0)
    expect(checkClaims(graphics, { vendoredRoot })).toEqual([])
  })
})
