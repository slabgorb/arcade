// tests/objects-gate.test.ts
//
// Story df2-4 — RED phase (Han Solo / TEA). THE OBJECT-IMAGE BYTE GATE.
//
// DEFB6 (defender/DEFB6.SRC) carries the object graphics: a PICTURE DESCRIPTOR
// `LABEL FCB W,H` + `FDB <data0>[,<data1>,<ON>,<OFF>]` (e.g. the UFO,
// defender/DEFB6.SRC:1954), whose pixel-data label(s) hold W×H bytes of packed
// 4-bit palette indices — some as FDB words (UFOD10), some as FCB bytes (the smart
// bomb SBD10, defender/DEFB6.SRC:2183). SAMEXAP7 (defender/SAMEXAP7.SRC:6-7, "SAM
// EXPLOSIONS AND APPEARANCES") is NOT a picture table at all — it is the explosion/
// appear BLITTER CODE (APST/EXST/EXPU vector routines, ending in a `STARTS FDB`
// jump table). This story transcribes DEFB6's full picture roster into a GENERATED
// module and proves every byte against the vendored source with an INDEPENDENT
// reader that refuses any mismatch, and records an encoding discriminant per block
// so SAMEXAP7 lands as a non-raster the blit path REFUSES to raster
// (streams-are-not-rasters — the joust COMCL5/ASH lesson).
//
// ─── RED / GREEN SPLIT ────────────────────────────────────────────────────────
// TEA (this file + the picture-table reader added to tests/helpers/defender-source.ts)
// authors the failing suite and the SECOND, independent reader. GREEN (Yoda / Dev)
// ships:
//   1. scripts/transcribe-objects.mjs — the transcribe tool (Dev's OWN reading of
//      DEFB6.SRC; it must NOT import the test-side reader — see the independence
//      block below, or the byte gate is tautological).
//   2. plugins/defender/src/core/objects-data.ts — the GENERATED module: an
//      `OBJECTS` list of object-image records (name/width/height/encoding/bytes/
//      source), plus the SAMEXAP7 non-raster block.
//   3. plugins/defender/src/core/objects.ts — re-exports OBJECTS and a pure
//      `blitObject` (contract pinned in tests/objects-blit.test.ts). Held to
//      src/core purity (tests/purity.test.ts).
//
// ─── WHY THIS IS RED, AND WHY THE READER'S TEETH ARE GREEN ────────────────────
// The module does not exist yet, so `loadObjects()` throws a self-describing "not
// built yet" and every module/gate test fails. The READER's own-teeth tests pass on
// arrival — they must, because a gate built on an unchecked reader is just a second
// guess (lang-review #18). Their fixtures are facts verified against the vendored
// tree THIS session, not values echoed back from the module.
//
// reference/original-source/defender/ is tracked in git, so the byte gate runs
// EVERYWHERE including CI (df1-1 settled this). Every vendored read lives inside an
// it() body (the collection trap).

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  vendoredAvailable,
  readImageBytes,
  pictureTable,
} from './helpers/defender-source.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

// ─── The module contract GREEN must satisfy (local shim; declared here so this
//     suite COMPILES against a not-yet-built module and vitest reports clean
//     per-test failures instead of a collect crash). objects-data.ts becomes canonical.
interface ObjectImage {
  /** A stable name — the DEFB6 picture label, e.g. 'UFOP1', or 'SAMEXAP7'. */
  name: string
  /** Bytes per row (a byte is two horizontal pixels); 0 for a non-raster block. */
  width: number
  /** Rows; 0 for a non-raster block. */
  height: number
  /** The encoding discriminant — 'raster' is the only kind blitObject may draw;
   *  a non-raster block (e.g. SAMEXAP7's explosion code) is refused, never rastered. */
  encoding: string
  /** A raster's effective cell: exactly width×height bytes, big-endian from source.
   *  A non-raster block carries NO rasterizable bytes (an empty list). */
  bytes: readonly number[]
  /** Provenance: the vendored file, the label transcribed, and its line. */
  source: { file: string; label: string; line: number }
}
interface ObjectsModule {
  OBJECTS: readonly ObjectImage[]
}

async function loadObjects(): Promise<ObjectsModule> {
  // Runtime-assembled specifier so neither tsc nor the bundler resolves it
  // statically; a missing module reads as "not built yet", never a collect crash.
  const spec = ['..', 'src', 'core', 'objects.js'].join('/')
  try {
    return (await import(/* @vite-ignore */ spec)) as unknown as ObjectsModule
  } catch (e) {
    throw new Error(
      'src/core/objects.ts not built yet (GREEN transcribes DEFB6.SRC into the ' +
        `generated OBJECTS module): ${(e as Error).message}`,
    )
  }
}

const DEFB6 = 'DEFB6.SRC'
const rasters = (m: ObjectsModule) => m.OBJECTS.filter((o) => o.encoding === 'raster')

// ══════════════════════════════════════════════════════════════════════════════
// THE READER'S OWN TEETH. A gate resting on an unchecked reader is a second guess
// (lang-review #18). Every fixture below was verified against the vendored tree this
// session; these run everywhere and never touch the module.
// ══════════════════════════════════════════════════════════════════════════════
describe.skipIf(!vendoredAvailable)('independent reader — real DEFB6 picture facts (this session)', () => {
  it('the picture table has 31 descriptors, in source order', () => {
    const t = pictureTable(DEFB6)
    expect(t.length).toBe(31)
    expect(t[0].label).toBe('SCZP1') // first real picture (defender/DEFB6.SRC:1896)
    expect(t[t.length - 1].label).toBe('TEREX') // last (defender/DEFB6.SRC:1978)
  })

  it('the UFO descriptor is 6×4 with two data fields UFOD10/UFOD11', () => {
    const ufo = pictureTable(DEFB6).find((d) => d.label === 'UFOP1')
    expect(ufo).toBeDefined()
    expect([ufo!.width, ufo!.height]).toEqual([6, 4])
    expect(ufo!.dataPtrs.slice(0, 2)).toEqual(['UFOD10', 'UFOD11'])
  })

  it('reads an FDB field BIG-ENDIAN — UFOD10 is the UFO’s 24-byte 6×4 cell', () => {
    // prettier-ignore
    expect(readImageBytes(DEFB6, 'UFOD10')).toEqual([
      0, 3, 52, 3, 51, 112, 64, 51,
      51, 7, 68, 51, 51, 0, 4, 51,
      48, 115, 64, 51, 0, 0, 48, 0,
    ])
  })

  it('reads an FCB field as RAW bytes — the smart bomb SBD10 is 9 bytes, not FDB words', () => {
    // SBD10 FCB $90,$09,$90 / $99,$99,$99 / $90,$CC,$90 — the one FCB-encoded cell.
    expect(readImageBytes(DEFB6, 'SBD10')).toEqual([0x90, 0x09, 0x90, 0x99, 0x99, 0x99, 0x90, 0xcc, 0x90])
  })

  it('LASP1 is an 8×1 laser cell — LASD10 is $FFFF×4 = eight 0xFF bytes', () => {
    const las = pictureTable(DEFB6).find((d) => d.label === 'LASP1')
    expect([las!.width, las!.height]).toEqual([8, 1])
    expect(readImageBytes(DEFB6, 'LASD10')).toEqual([255, 255, 255, 255, 255, 255, 255, 255])
  })

  it("every picture's first field is exactly its width×height bytes (the raster cell law)", () => {
    const wrong = pictureTable(DEFB6)
      .map((d) => ({ d, n: readImageBytes(DEFB6, d.dataPtrs[0]).length }))
      .filter(({ d, n }) => n !== d.width * d.height)
      .map(({ d, n }) => `${d.label}: field0 ${n} bytes for ${d.width}×${d.height}`)
    expect(wrong, 'a field whose length is not W×H is a non-raster hiding in the picture table').toEqual([])
  })

  it('refuses to fabricate pixels from a SYMBOLIC block — SAMEXAP7’s STARTS jump table throws', () => {
    // STARTS FDB STRT01,STRT23,… (defender/SAMEXAP7.SRC) is a table of code labels,
    // not pixel words; evalNumber refuses the symbol rather than coercing it to 0.
    expect(() => readImageBytes('SAMEXAP7.SRC', 'STARTS')).toThrow()
  })

  it('a pure code label yields NO image bytes (an empty block, never a guessed cell)', () => {
    // APST is explosion CODE (LDD/PSHS/…), so there are no FCB/FDB rows to read.
    expect(readImageBytes('SAMEXAP7.SRC', 'APST')).toEqual([])
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// THE MODULE CONTRACT — shape teeth that need no vendored tree.
// ══════════════════════════════════════════════════════════════════════════════
describe('generated OBJECTS — module shape (AC: generated module)', () => {
  it('exists and is a non-empty list of object-image records', async () => {
    const { OBJECTS } = await loadObjects()
    expect(Array.isArray(OBJECTS)).toBe(true)
    expect(OBJECTS.length).toBeGreaterThan(0)
  })

  it("only 'raster' and 'stream' encodings appear — no third, undefined kind", async () => {
    const { OBJECTS } = await loadObjects()
    const strange = OBJECTS.filter((o) => o.encoding !== 'raster' && o.encoding !== 'stream').map((o) => o.name)
    expect(strange).toEqual([])
  })

  it('every RASTER record has width×height bytes — no padding, no truncation', async () => {
    const wrong = rasters(await loadObjects())
      .filter((o) => o.bytes.length !== o.width * o.height)
      .map((o) => `${o.name}: ${o.bytes.length} bytes for ${o.width}×${o.height}`)
    expect(wrong).toEqual([])
  })

  it('every raster byte is an integer 0-255 — no NaN, no sentinels, no negatives', async () => {
    const bad = rasters(await loadObjects())
      .filter((o) => o.bytes.some((v) => !Number.isInteger(v) || v < 0 || v > 255))
      .map((o) => o.name)
    expect(bad).toEqual([])
  })

  it('carries the DEFB6 objects a gallery needs — UFO, a lander, a score, the terrain explosion', async () => {
    const names = new Set((await loadObjects()).OBJECTS.map((o) => o.name))
    const required = ['UFOP1', 'LNDP1', 'C25P1', 'TEREX']
    expect(required.filter((n) => !names.has(n))).toEqual([])
  })

  it('records SAMEXAP7 as a NON-raster block with no rasterizable bytes (the discriminant’s reason)', async () => {
    const { OBJECTS } = await loadObjects()
    const sam = OBJECTS.find((o) => o.source.file === 'SAMEXAP7.SRC')
    expect(sam, 'SAMEXAP7 must appear as the non-raster block the gate refuses to raster').toBeDefined()
    expect(sam!.encoding).not.toBe('raster')
    expect(sam!.bytes.length).toBe(0)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// THE GATE — every raster re-derives byte-for-byte from its cited DEFB6 label, and
// its geometry agrees with the picture descriptor (two independent statements). The
// full roster is covered — every descriptor has a matching raster and vice versa.
// ══════════════════════════════════════════════════════════════════════════════
describe.skipIf(!vendoredAvailable)('THE GATE — every raster matches the vendored source', () => {
  it('every object carries a resolvable source {file, label, line}', async () => {
    const unanchored = (await loadObjects()).OBJECTS.filter(
      (o) => !o.source || !o.source.file || !o.source.label || !Number.isInteger(o.source.line),
    ).map((o) => o.name)
    expect(unanchored, 'a record without a source anchor is unprovable by construction').toEqual([])
  })

  it("re-derives every raster's cell bytes from its DEFB6 descriptor (refuses any mismatch)", async () => {
    const table = pictureTable(DEFB6)
    const byLabel = Object.fromEntries(table.map((d) => [d.label, d]))
    const mismatches: string[] = []
    for (const o of rasters(await loadObjects())) {
      const d = byLabel[o.source.label]
      if (!d) {
        mismatches.push(`${o.name}: source label ${o.source.label} is not a DEFB6 picture descriptor`)
        continue
      }
      if (d.width !== o.width || d.height !== o.height) {
        mismatches.push(`${o.name}: descriptor ${d.width}×${d.height} vs module ${o.width}×${o.height}`)
        continue
      }
      const derived = readImageBytes(DEFB6, d.dataPtrs[0])
      const i = derived.findIndex((v, k) => v !== o.bytes[k])
      if (derived.length !== o.bytes.length || i >= 0) {
        mismatches.push(
          `${o.name} (${d.dataPtrs[0]}): byte ${i} source $${derived[i]?.toString(16)} vs module $${o.bytes[i]?.toString(16)}`,
        )
      }
    }
    expect(mismatches, `${mismatches.length} raster(s) do not match the vendored source`).toEqual([])
  })

  it('covers the FULL DEFB6 picture roster — every descriptor has exactly one raster, and no raster invents a label', async () => {
    const table = pictureTable(DEFB6)
    const descLabels = new Set(table.map((d) => d.label))
    const rasterLabels = rasters(await loadObjects()).map((o) => o.source.label)
    const missing = [...descLabels].filter((l) => !rasterLabels.includes(l))
    const invented = rasterLabels.filter((l) => !descLabels.has(l))
    expect(missing, 'these DEFB6 pictures are not transcribed').toEqual([])
    expect(invented, 'these raster records cite a label that is not a DEFB6 picture').toEqual([])
    expect(new Set(rasterLabels).size, 'a picture is transcribed at most once').toBe(rasterLabels.length)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// THE INDEPENDENCE RULE. Without this the whole gate is theatre: if GREEN's
// transcribe tool consumes TEA's reader, the two entries collapse into one and the
// byte gate proves only that the reader agrees with itself — while green. Runs
// everywhere; never skips. (lang-review #25/#28 — a POSITIVE read-set.)
// ══════════════════════════════════════════════════════════════════════════════
describe('the two derivations stay independent', () => {
  function sourceFilesUnder(dir: string): string[] {
    if (!existsSync(dir)) return []
    const out: string[] = []
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry)
      if (statSync(p).isDirectory()) out.push(...sourceFilesUnder(p))
      else if (['.ts', '.mts', '.mjs', '.js'].includes(extname(p))) out.push(p)
    }
    return out
  }

  // Strip comments so a file may NAME the reader in prose (the self-match trap) while
  // any CODE reference — including a computed import specifier assembled from path
  // segments — is still caught.
  function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
  }

  it('production code (defender src/tools + repo scripts) never references the test-side reader — literal OR computed import', () => {
    const roots = [
      join(repoRoot, 'plugins', 'defender', 'src'),
      join(repoRoot, 'plugins', 'defender', 'tools'),
      join(repoRoot, 'scripts'),
    ]
    const scanned = roots.flatMap(sourceFilesUnder)
    // POSITIVE read-set floor (lang-review #28): the scan must reach the production
    // file under test, or the guard can silently stop reading it.
    expect(scanned.length, 'the independence scan must read production files').toBeGreaterThan(5)
    expect(
      scanned.some((f) => f.endsWith(join('scripts', 'transcribe-objects.mjs'))),
      'the scan MUST include the transcribe tool — the one file that must not import the reader',
    ).toBe(true)

    const referencesReader = /defender-source|tests[/\\]helpers/
    const offenders = scanned.filter((f) => referencesReader.test(stripComments(readFileSync(f, 'utf8'))))
    expect(
      offenders.map((f) => f.replace(repoRoot + '/', '')),
      'production must not consume the test-side reader (import or computed specifier) — that makes the byte gate tautological',
    ).toEqual([])
  })
})
