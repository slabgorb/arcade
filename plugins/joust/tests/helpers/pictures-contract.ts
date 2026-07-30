// tests/helpers/pictures-contract.ts
//
// Story jt1-3 — the CONTRACT for src/core/pictures.ts, TEA-authored, plus the
// loader the suites use to reach a module that does not exist yet.
//
// This is the jt1-2 `.d.mts` pattern applied to a `.ts` deliverable: TEA states
// the shape and the tests that pin it; Dev (GREEN) writes the module and the
// data. The module is loaded through a runtime-assembled specifier so a missing
// file fails the tests that need it with a self-describing message, rather than
// killing the whole file at collection with a resolution error.
//
// ─── SELF-CITING DATA IS THE MECHANISM FOR "NO HAND-AUTHORED PIXELS" ─────────
// AC-4 says every byte must PROVABLY originate in the vendored source. That is
// only checkable if each datum carries its own provenance, so every exported
// record carries a `SourceAnchor` naming the file and inclusive line range it
// came from. The gate then re-reads exactly those lines with TEA's independent
// reader and requires the bytes to match. A byte with no anchor cannot exist;
// a byte whose anchor does not re-derive it fails. "Hand-authored pixels"
// becomes structurally impossible rather than a rule someone remembers.

/** Where a datum came from: an inclusive line range in a vendored file. */
export interface SourceAnchor {
  file: string // e.g. 'JOUSTI.SRC'
  startLine: number // 1-based, inclusive
  endLine: number // 1-based, inclusive
}

/** One block of pixel data — a labelled run of FCB/FDB rows. */
export interface PixelBlock {
  /** Primary JOUSTI.SRC label, e.g. 'ORUN1R'. */
  name: string
  /** Additional labels sharing this address (ASH1R/ASH1L); [] when unique. */
  aliases: string[]
  /** Bytes per row. Pixel width is 2×this (4bpp, 2 pixels/byte). */
  width: number
  /** Scanlines. */
  height: number
  /** width×height bytes, row-major. */
  bytes: number[]
  /** The pixel rows themselves. */
  anchor: SourceAnchor
  /**
   * The `$WWHH!XDMAFIX` header line, when the block has one. Raw cliff and
   * transporter sources are pointed at by a 4-word background record instead
   * and carry no header of their own — those are null.
   */
  headerAnchor: SourceAnchor | null
  /**
   * How the bytes are laid out (mirrors the src module's discriminant; jt3-6
   * extends it with the third value):
   *   • 'raster'    — width×height 4bpp pixels the shell blits directly;
   *   • 'stream'    — COMCL5's Elias-gamma BIT stream (expandComcl5);
   *   • 'runlength' — ASH1R/L's CLIFER (length<<4 | color) run-length stream
   *     (expandAsh). DISTINCT from 'stream' so the ptero dissolve is never blitted
   *     as a raster NOR fed to the Elias-gamma decoder (the jt1-6 consumer hazard).
   */
  encoding?: 'raster' | 'stream' | 'runlength'
}

/** A 3-word entity frame record (the POSOFF macro, JOUSTI.SRC:12-13). */
export interface EntityRecord {
  name: string
  /** Collision-table label, or null when the record carries a literal 0. */
  collision: string | null
  /** Position word: high byte signed X-byte offset, low byte 256−Y. */
  position: number
  /** Pixel-source label. */
  source: string
  anchor: SourceAnchor
}

/** A 4-word background/cliff record — a partial DMA block. */
export interface BackgroundRecord {
  name: string
  /** Collision-table label, or the literal DMA control word for transporters. */
  collision: string | number
  source: string
  /** Absolute column-major VRAM destination. */
  dest: number
  /** w/h as WRITTEN in the source, i.e. already un-XORed back through DMAFIX. */
  wh: number
  anchor: SourceAnchor
}

/** A per-scanline collision mask: (left,right) span pairs. */
export interface CollisionTable {
  name: string
  aliases: string[]
  /** Raw words as assembled, INCLUDING the COFF bias and the sentinels. */
  spans: Array<[number, number]>
  anchor: SourceAnchor
}

export interface Palette {
  name: string
  /** 16 bytes, BBGGGRRR. */
  bytes: number[]
  anchor: SourceAnchor
}

/** Something deliberately not transcribed — recorded, not silently omitted. */
export interface DeferredBlock {
  name: string
  aliases: string[]
  anchor: SourceAnchor
  /** Why it is deferred, in one sentence. */
  reason: string
  /** Where the game consumes it, so the next story starts with the trace. */
  consumer: SourceAnchor
}

export interface ExpandedImage {
  width: number
  height: number
  /** One palette-index nibble per pixel, row-major, length width×height. */
  pixels: number[]
  /** Length of each written row — boundaries are NOT recoverable from width x height (jt1-6 addendum). */
  rowLengths: number[]
}

export interface PicturesModule {
  DMAFIX: number
  COFF: number
  PIXEL_BLOCKS: PixelBlock[]
  ENTITY_RECORDS: EntityRecord[]
  BACKGROUND_RECORDS: BackgroundRecord[]
  COLLISION_TABLES: CollisionTable[]
  PALETTES: Record<string, Palette>
  COMCL5: { bytes: number[]; anchor: SourceAnchor }
  /** Blocks explicitly deferred (ASH1R/L) — may be empty, never undefined. */
  DEFERRED: DeferredBlock[]
  /** The transcribed NEWCL5/UNCOM RLE decoder (SYSTEM.SRC:927-1023). */
  expandComcl5(bytes: readonly number[]): ExpandedImage
  /**
   * jt3-6 — the ASH1R/L dissolve decoder, transcribed from CLIFER, the routine
   * PTEASH JMPs into (JOUSTRV4.SRC:4604-4631, the consumer that ESTABLISHES the
   * format). Decode ONE frame of the run-length stream starting at `offset`:
   *   • each byte packs (length = high nibble) | (color = low nibble);
   *   • a $00 byte ENDS the image; a byte whose length nibble is 0 but is non-zero
   *     (e.g. $01) ENDS the line (X resets, Y advances one row);
   *   • a run of `length` writes `length` screen-bytes of `color` (both 4bpp
   *     nibbles), the LAST byte one pixel only (high nibble; low nibble 0 —
   *     "last byte is always one pixel", JOUSTRV4.SRC:4622-4624).
   * Returns the expanded frame and the offset of the NEXT frame (just past $00).
   * Pure and total; the argument is never mutated. The $9800 screen-bounds clip
   * (JOUSTRV4.SRC:4627) is a VRAM-address guard, not a data property, so a logical
   * decode from column 0 does not apply it.
   */
  expandAsh(bytes: readonly number[], offset?: number): { image: ExpandedImage; next: number }
  /**
   * jt3-6 — all ASH animation frames (PTERA1/PTERA2/PTERA3), decoded in order by
   * walking `expandAsh` across the $00 boundaries. The dissolve is a three-frame
   * animation (LDA #3, JOUSTRV4.SRC:1400), so this returns exactly 3 frames.
   */
  expandAshFrames(bytes: readonly number[]): ExpandedImage[]
}

/**
 * Load src/core/pictures.ts with a self-describing failure while it is missing.
 */
export async function loadPictures(): Promise<PicturesModule> {
  const specifier = ['..', '..', 'src', 'core', 'pictures.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<PicturesModule>
    if (!Array.isArray(mod.PIXEL_BLOCKS)) throw new Error('module has no `PIXEL_BLOCKS` export')
    if (typeof mod.expandComcl5 !== 'function') throw new Error('module has no `expandComcl5` export')
    return mod as PicturesModule
  } catch (e) {
    throw new Error(
      'pictures module not transcribed yet — GREEN (Julia) creates ' +
        'joust/src/core/pictures.ts satisfying tests/helpers/pictures-contract.ts. ' +
        `(${(e as Error).message})`,
    )
  }
}

/**
 * The committed CI fixture: per-block geometry + digest, so the module can be
 * checked without the vendored tree (AC-1's "degrades to committed-fixture
 * comparison"). Dev bakes it; the gate keeps it honest by verifying it against
 * the SOURCE whenever the tree is present, so it can never drift into agreeing
 * with a wrong module.
 */
export interface PicturesFixture {
  /** Total pixel blocks, so a dropped block fails even if every survivor matches. */
  blockCount: number
  blocks: Record<string, { width: number; height: number; sha256: string }>
  comcl5: { byteLength: number; sha256: string; expandedSha256: string }
  palettes: Record<string, string>
}
