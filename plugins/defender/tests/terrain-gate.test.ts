// tests/terrain-gate.test.ts
//
// Story df2-5 — RED phase (Han Solo / TEA). THE TERRAIN BYTE GATE.
//
// BLK71 (defender/BLK71.SRC, "TERRAIN , MINI-TERRAIN DATA AND PLAYER EXPLOSION",
// banked block 7) is MOSTLY terrain-generation CODE — BGINIT (:95), BGOUT (:152),
// BGALT (:372), BGERAS (:402) and the left/right terrain functions (:411-506) — plus
// PLAYER EXPLOSION data (PXPOST/PYPOST/…, :21+). The only transcribable DATA in the
// block is TWO labels:
//   • TDATA — "TERRAIN DATA TABLE" (defender/BLK71.SRC:507). An FCB byte stream,
//     exactly TLEN = $100 = 256 bytes (TLEN EQU $100, defender/BLK71.SRC:17). It is a
//     PACKED BIT-STREAM (bit-per-step terrain profile), consumed bit-serially by the
//     BG* routines (LTBYTE/RTBYTE "TERRAIN DATA BYTE", LTCNT/RTCNT "TERRAIN BIT
//     COUNTER", :40-43) — NOT a nibble raster.
//   • MTERR — "MINI TERRAIN" (defender/BLK71.SRC:527). An FCB byte stream referenced
//     by the block's jump table (FDB MTERR "MINI TERRAIN DATA", :87); the scanner/
//     mini-map terrain. Its consumer (the scanner) is df5, so it lands INERT here.
//
// This story transcribes those two blocks into a GENERATED module and proves every
// byte against the vendored source with an INDEPENDENT reader that refuses any
// mismatch, and records an encoding discriminant per block so NEITHER is a 'raster'
// the blit path would try to nibble-decode (streams-are-not-rasters — the joust
// COMCL5/ASH lesson, carried into df2 as guardrail 2). The static planet-surface
// RENDER and the BGALT altitude decode live in tests/terrain-blit.test.ts.
//
// ─── RED / GREEN SPLIT ────────────────────────────────────────────────────────
// TEA (this file + tests/terrain-blit.test.ts) authors the failing suite. It reuses
// the SECOND, independent reader already in tests/helpers/defender-source.ts —
// readImageBytes() is the generic "run of consecutive FCB/FDB rows at a label" reader
// (df2-4), and TDATA/MTERR are plain FCB runs, so no new reader is needed (one
// concept, one helper — lang-review #18). GREEN (Yoda / Dev) ships:
//   1. scripts/transcribe-terrain.mjs — the transcribe tool (Dev's OWN reading of
//      BLK71.SRC; it must NOT import the test-side reader — see the independence
//      block below, or the byte gate is tautological).
//   2. plugins/defender/src/core/terrain-data.ts — the GENERATED module: a `TERRAIN`
//      list of terrain-block records (name/encoding/bytes/source), exactly {TDATA,
//      MTERR}.
//   3. plugins/defender/src/core/terrain.ts — re-exports TERRAIN plus the pure
//      decodeAltitudes + blitTerrain (contract pinned in terrain-blit.test.ts). Held
//      to src/core purity (tests/purity.test.ts).
//
// ─── WHY THIS IS RED, AND WHY THE READER'S TEETH ARE GREEN ────────────────────
// The module does not exist yet, so loadTerrain() throws a self-describing "not built
// yet" and every module/gate test fails. The READER's own-teeth pass on arrival —
// they must, because a gate built on an unchecked reader is a second guess
// (lang-review #18). Their fixtures are byte facts verified against the vendored tree
// THIS session (node read of BLK71.SRC), not values echoed back from the module.
//
// reference/original-source/defender/ is tracked in git, so the byte gate runs
// EVERYWHERE including CI (df1-1 settled this). Every vendored read lives inside an
// it() body (the collection trap).

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vendoredAvailable, readImageBytes } from './helpers/defender-source.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

const BLK71 = 'BLK71.SRC'
/** TLEN EQU $100 = 256 — the terrain table length (defender/BLK71.SRC:17). */
const TLEN = 0x100

// ─── The module contract GREEN must satisfy (local shim; declared here so this suite
//     COMPILES against a not-yet-built module and vitest reports clean per-test
//     failures instead of a collect crash). terrain-data.ts becomes canonical.
interface TerrainBlock {
  /** The BLK71 data label: 'TDATA' (main terrain) or 'MTERR' (mini terrain). */
  name: string
  /** The encoding discriminant. Neither block is 'raster' — terrain is a byte/bit
   *  STREAM, never a nibble grid. TDATA is a bit-stream height profile; MTERR is a
   *  byte stream (scanner triples). The two carry DISTINCT encodings. */
  encoding: string
  /** The transcribed bytes, big-endian from source (FCB rows). */
  bytes: readonly number[]
  /** Provenance: the vendored file, the label transcribed, and its line. */
  source: { file: string; label: string; line: number }
}
interface TerrainModule {
  TERRAIN: readonly TerrainBlock[]
}

async function loadTerrain(): Promise<TerrainModule> {
  // Runtime-assembled specifier so neither tsc nor the bundler resolves it
  // statically; a missing module reads as "not built yet", never a collect crash.
  const spec = ['..', 'src', 'core', 'terrain.js'].join('/')
  try {
    return (await import(/* @vite-ignore */ spec)) as unknown as TerrainModule
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e)
    throw new Error(
      'src/core/terrain.ts not built yet (GREEN transcribes BLK71.SRC into the ' +
        `generated TERRAIN module): ${why}`,
    )
  }
}

const blockNamed = (m: TerrainModule, name: string) => m.TERRAIN.find((b) => b.name === name)

// ══════════════════════════════════════════════════════════════════════════════
// THE READER'S OWN TEETH. A gate resting on an unchecked reader is a second guess
// (lang-review #18). Every fixture below was verified against the vendored tree this
// session (a node read of BLK71.SRC through the SAME FCB grammar readImageBytes
// uses); these run everywhere and never touch the module.
// ══════════════════════════════════════════════════════════════════════════════
describe.skipIf(!vendoredAvailable)('independent reader — real BLK71 terrain facts (this session)', () => {
  it('TDATA is exactly TLEN ($100 = 256) bytes — the full terrain data table', () => {
    // defender/BLK71.SRC:507 TDATA FCB … — sixteen 16-byte FCB rows, ending at the
    // comment separator before MINI TERRAIN.
    expect(readImageBytes(BLK71, 'TDATA').length).toBe(TLEN)
  })

  it('TDATA begins $2A,$AA,$AA,$AA,$AA,$AA,$AB,$A1 and ends …$70,$03,$00,$00', () => {
    const t = readImageBytes(BLK71, 'TDATA')
    expect(t.slice(0, 8)).toEqual([0x2a, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xab, 0xa1])
    expect(t.slice(-4)).toEqual([0x70, 0x03, 0x00, 0x00])
  })

  it('MTERR is 384 bytes — 128 mini-terrain triples (defender/BLK71.SRC:527)', () => {
    const m = readImageBytes(BLK71, 'MTERR')
    expect(m.length).toBe(384)
    expect(m.length % 3, 'the scanner mini-terrain is (alt, x, x) triples').toBe(0)
  })

  it('MTERR begins $25,$70,$07,$26,$77,$00,$26,$07,$70 and ends …$21,$70,$07,$23,$70,$07', () => {
    const m = readImageBytes(BLK71, 'MTERR')
    expect(m.slice(0, 9)).toEqual([0x25, 0x70, 0x07, 0x26, 0x77, 0x00, 0x26, 0x07, 0x70])
    expect(m.slice(-6)).toEqual([0x21, 0x70, 0x07, 0x23, 0x70, 0x07])
  })

  it('TDATA and MTERR are DISTINCT byte streams (a mis-transcription that duplicated one would fail here)', () => {
    expect(readImageBytes(BLK71, 'TDATA')).not.toEqual(readImageBytes(BLK71, 'MTERR'))
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// THE MODULE CONTRACT — shape teeth that need no vendored tree.
// ══════════════════════════════════════════════════════════════════════════════
describe('generated TERRAIN — module shape (AC: generated module)', () => {
  it('exists and is a non-empty list of terrain-block records', async () => {
    const { TERRAIN } = await loadTerrain()
    expect(Array.isArray(TERRAIN)).toBe(true)
    expect(TERRAIN.length).toBeGreaterThan(0)
  })

  it('carries EXACTLY the two BLK71 terrain blocks — TDATA and MTERR, nothing more', async () => {
    // The "do not over-transcribe" guard: BLK71 is mostly generation CODE plus
    // out-of-scope PLAYER EXPLOSION data. Only TDATA + MTERR are terrain DATA.
    const names = (await loadTerrain()).TERRAIN.map((b) => b.name).sort()
    expect(names).toEqual(['MTERR', 'TDATA'])
  })

  it("no block is a 'raster' — terrain is a stream, never a nibble grid (streams-are-not-rasters)", async () => {
    const rastered = (await loadTerrain()).TERRAIN.filter((b) => b.encoding === 'raster').map((b) => b.name)
    expect(rastered, 'a terrain block marked raster would be nibble-decoded as pixels — a fidelity bug').toEqual([])
  })

  it('TDATA and MTERR carry DISTINCT encodings (a bit-stream is not the scanner triple-stream)', async () => {
    const m = await loadTerrain()
    const tdata = blockNamed(m, 'TDATA')
    const mterr = blockNamed(m, 'MTERR')
    expect(tdata, 'TDATA must be present').toBeDefined()
    expect(mterr, 'MTERR must be present').toBeDefined()
    expect(tdata!.encoding).not.toBe(mterr!.encoding)
  })

  it('every byte is an integer 0-255 — no NaN, no sentinels, no negatives', async () => {
    const bad = (await loadTerrain()).TERRAIN
      .filter((b) => b.bytes.some((v) => !Number.isInteger(v) || v < 0 || v > 255))
      .map((b) => b.name)
    expect(bad).toEqual([])
  })

  it('every block carries a resolvable source {file, label, line} anchored in BLK71', async () => {
    const unanchored = (await loadTerrain()).TERRAIN.filter(
      (b) =>
        !b.source ||
        b.source.file !== BLK71 ||
        !b.source.label ||
        !Number.isInteger(b.source.line) ||
        b.source.line <= 0,
    ).map((b) => b.name || '(unnamed)')
    expect(unanchored, 'a record without a BLK71 source anchor is unprovable by construction').toEqual([])
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// THE GATE — each block re-derives byte-for-byte from its cited BLK71 label. The
// full roster is covered — exactly {TDATA, MTERR}, each once, no invented label.
// ══════════════════════════════════════════════════════════════════════════════
describe.skipIf(!vendoredAvailable)('THE GATE — every terrain block matches the vendored source', () => {
  it('re-derives every block’s bytes from its BLK71 label (refuses any mismatch)', async () => {
    const mismatches: string[] = []
    for (const b of (await loadTerrain()).TERRAIN) {
      const derived = readImageBytes(BLK71, b.source.label)
      const i = derived.findIndex((v, k) => v !== b.bytes[k])
      if (derived.length !== b.bytes.length || i >= 0) {
        mismatches.push(
          `${b.name} (${b.source.label}): len ${b.bytes.length} vs source ${derived.length}` +
            (i >= 0 ? `; byte ${i} module $${b.bytes[i]?.toString(16)} vs source $${derived[i]?.toString(16)}` : ''),
        )
      }
    }
    expect(mismatches, `${mismatches.length} terrain block(s) do not match the vendored source`).toEqual([])
  })

  it('the TDATA record is exactly TLEN ($100) bytes and cites the TDATA label', async () => {
    const tdata = blockNamed(await loadTerrain(), 'TDATA')
    expect(tdata, 'TDATA must be present').toBeDefined()
    expect(tdata!.source.label).toBe('TDATA')
    expect(tdata!.bytes.length).toBe(TLEN)
  })

  it('names ONLY real BLK71 data labels — no record invents a label, none cites CODE', async () => {
    // readImageBytes throws on an unresolved symbol operand, so a record citing a code
    // label (APST, BGINIT…) would blow up rather than silently pass. Every cited label
    // must resolve to a numeric FCB/FDB run.
    const invented: string[] = []
    for (const b of (await loadTerrain()).TERRAIN) {
      try {
        const bytes = readImageBytes(BLK71, b.source.label)
        if (bytes.length === 0) invented.push(`${b.name}: ${b.source.label} yields no data bytes (a code label?)`)
      } catch (e) {
        invented.push(`${b.name}: ${b.source.label} is not a BLK71 data label (${(e as Error).message})`)
      }
    }
    expect(invented).toEqual([])
  })

  it('does NOT transcribe PLAYER EXPLOSION data — BLK71 explosion labels are out of scope', async () => {
    // BLK71 also carries PLAYER EXPLOSION tables (PXPOST/PYPOST/PXVELT/PYVELT equates,
    // defender/BLK71.SRC:21+). This story is terrain + mini-terrain ONLY.
    const explosionLabels = new Set(['PXPOST', 'PYPOST', 'PXVELT', 'PYVELT'])
    const strayed = (await loadTerrain()).TERRAIN.filter((b) => explosionLabels.has(b.source.label)).map((b) => b.name)
    expect(strayed, 'a PLAYER EXPLOSION label leaked into the terrain roster').toEqual([])
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

  it('production code (defender src + repo scripts) never references the test-side reader — literal OR computed import', () => {
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
      scanned.some((f) => f.endsWith(join('scripts', 'transcribe-terrain.mjs'))),
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
