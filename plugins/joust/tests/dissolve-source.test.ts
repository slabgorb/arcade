// tests/dissolve-source.test.ts
//
// Story jt3-6 — RED phase (Leeloo / TEA). The CONSUMER TRACE + PROVENANCE
// companion to tests/dissolve.test.ts.
//
// ─── STEP 1 (open-questions §5): TRACE THE CONSUMER BEFORE DECODING ──────────
// §5 recorded ASH1R/L (JOUSTI.SRC:2778-2815) as a THIRD, undecoded image format —
// "value/run pairs?" — with the instruction "trace the consumer before the ptero
// death story". This suite IS that trace. The consumer chain is:
//
//     DEATH4 (JOUSTRV4.SRC:2941)  the ptero's death dispatch: PJOYT ← 8-1, PJOY ← PTEKLL
//       → PTEKLL (:1369)          the death dance; the BAITER branch DECs NBAIT (:1370-1372)
//       → LDD ASH1R (:1390)       load the dissolve data pointer; LDA #3 = 3 frames (:1388)
//       → BSR PTEASH (:1393,1396) draw a frame …
//       → PTEASH (:1411) → JMP CLIFER (:1419)   … the run-length BLITTER
//       → CLIFER (:4604-4631)     ESTABLISHES the format: byte = (len<<4)|color,
//                                 $00 ends the image, len-nibble-0 ends the line,
//                                 last byte of a run is one pixel.
//
// So the format is NOT invented — it is READ OFF the routine that consumes the
// bytes, exactly as the ruling B (decode-now) requires. Because a real consumer
// establishes it, this story takes the DECODE path, not the poof fallback.
//
// ─── THE DOUBLE-ENTRY (the jt1-3 tautology trap) ─────────────────────────────
// Dev writes expandAsh in src/core/pictures.ts one way; this file re-derives the
// ASH bytes from the vendored tree another way (the joust-source reader, which
// nothing under src/ may import) and decodes them with a SECOND, independent
// reader transcribed straight from CLIFER. The gate is that the two agree. A
// derivation that re-bakes its own misreading cannot pass a reader it did not write.
//
// ─── DEGRADATION (the CI path) ───────────────────────────────────────────────
// CI clones only the subrepo and has no vendored tree, so every source
// re-derivation SKIPS there (describe.skipIf(!vendoredAvailable)); the claim
// coverage + the decode-of-the-gated-bytes checks run EVERYWHERE (the ASH bytes
// are already re-derived from source by pictures-gate.test.ts, so decoding them on
// the CI path inherits that provenance). Every vendored read lives INSIDE an it().

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines, bytesInRange } from './helpers/joust-source.js'
import { loadPictures, type ExpandedImage } from './helpers/pictures-contract.js'
// jt9-2 swept this suite's local pre-hardening claims plumbing onto the shared
// loader jt8-3 extracted. Behaviour-preserving.
import { loadClaims, claimCovers } from './helpers/claims.js'

// The ASH data anchor (the same range pictures-gate re-derives ASH1R from).
const ASH_FILE = 'JOUSTI.SRC'
const ASH_START = 2781
const ASH_END = 2815

// ─────────────────────────────────────────────────────────────────────────────
// TEA'S INDEPENDENT DECODER — transcribed straight from CLIFER (JOUSTRV4.SRC:
// 4604-4631). Nothing in src/ imports this; Dev's expandAsh is a separate
// derivation, and the gate below is that the two agree byte-for-byte.
//
// Per byte: color = byte & 0x0F, length = (byte & 0xF0) >> 4.
//   • byte === 0x00 → end of IMAGE.
//   • length === 0 (byte !== 0) → end of LINE (X resets, Y advances one row).
//   • else a run of `length` screen-bytes of `color`: each byte is two 4bpp
//     pixels [color,color], EXCEPT the last byte of the run, one pixel [color,0]
//     (ANDB #$F0 — "last byte is always one pixel", :4622-4624).
// The $9800 clip (:4627) is a VRAM-address guard, not a data property — a logical
// decode from column 0 does not apply it.
// ─────────────────────────────────────────────────────────────────────────────
function refExpandAshFrame(bytes: readonly number[], start: number): { image: ExpandedImage; next: number } {
  const pixels: number[] = []
  const rowLengths: number[] = []
  let x = 0
  let width = 0
  let i = start
  for (;;) {
    const b = bytes[i++]
    if (b === undefined || b === 0x00) break // end of image
    const color = b & 0x0f
    const length = (b >> 4) & 0x0f
    if (length === 0) {
      if (x > 0) {
        rowLengths.push(x)
        if (x > width) width = x
      }
      x = 0
      continue
    }
    for (let k = 0; k < length; k++) {
      pixels.push(color)
      x++
      pixels.push(k === length - 1 ? 0 : color) // last byte of the run is one pixel
      x++
    }
  }
  if (x > 0) {
    rowLengths.push(x)
    if (x > width) width = x
  }
  return { image: { width, height: rowLengths.length, pixels, rowLengths }, next: i }
}

function refExpandAshFrames(bytes: readonly number[]): ExpandedImage[] {
  const frames: ExpandedImage[] = []
  let off = 0
  while (off < bytes.length) {
    const f = refExpandAshFrame(bytes, off)
    frames.push(f.image)
    if (f.next <= off) break // safety: never loop
    off = f.next
  }
  return frames
}

function jline(n: number): string {
  return sourceLines('JOUSTRV4.SRC')[n - 1] ?? ''
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — CLIFER establishes the format (the routine PTEASH JMPs into).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('STEP 1 — CLIFER establishes the run-length format (JOUSTRV4.SRC:4604-4631)', () => {
  it('the byte packing: "lo nybble is color, hi nybble is length"', () => {
    // :4605 LDA ,Y+  — reads one byte and its own comment states the packing.
    expect(jline(4605)).toMatch(/LDA\s+,Y\+/)
    expect(jline(4605), 'the format is stated on the byte read itself').toContain(
      'lo nybble is color, hi nybble is length',
    )
  })

  it('$00 ends the IMAGE (length & color both 0)', () => {
    // :4606 BEQ 1$  length & color equ 0, end of image → 1$ RTS (:4631).
    expect(jline(4606)).toMatch(/BEQ\s+1\$/)
    expect(jline(4606)).toContain('length & color equ 0, end of image')
    expect(jline(4631)).toMatch(/1\$\s+RTS/)
  })

  it('the colour is the LOW nibble, replicated across a byte (ANDA #$0F / LDB #17 / MUL)', () => {
    // :4607 ANDA #$0F (isolate colour) ; :4608 LDB #17 (×17 = replicate a nibble,
    // $0A→$AA) ; :4609 MUL — so colour C paints a byte of both-nibble C.
    expect(jline(4607)).toMatch(/ANDA\s+#\$0F/)
    expect(jline(4608)).toMatch(/LDB\s+#17/)
    expect(jline(4608)).toContain('replicate lo nybble')
    expect(jline(4609)).toMatch(/MUL/)
  })

  it('the length is the HIGH nibble (ANDA #$F0 then four LSRA)', () => {
    // :4610 LDA -1,Y (reload the byte) ; :4611 ANDA #$F0 ; :4612-4615 LSRA×4.
    expect(jline(4611)).toMatch(/ANDA\s+#\$F0/)
    expect(jline(4611)).toContain('length nybble is extracted')
    for (let n = 4612; n <= 4615; n++) expect(jline(n), `LSRA at :${n}`).toMatch(/LSRA/)
  })

  it('a length-0 byte ends the LINE — next row is one down', () => {
    // :4616 BNE 3$ (if length equ 0, end of line) ; fall-through :4617-4619 resets
    // to the line start and steps one row down.
    expect(jline(4616)).toMatch(/BNE\s+3\$/)
    expect(jline(4616)).toContain('if length equ 0, end of line')
    expect(jline(4617)).toContain('next line is always 1 down')
  })

  it('the LAST byte of a run is one pixel (CMPA #1 / ANDB #$F0)', () => {
    // :4622 CMPA #1 (last byte…) ; :4624 ANDB #$F0 (keep the high nibble only).
    expect(jline(4622)).toMatch(/CMPA\s+#1/)
    expect(jline(4622)).toContain('last byte is always one pixel')
    expect(jline(4624)).toMatch(/ANDB\s+#\$F0/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 (cont.) — the consumer chain that reaches CLIFER with ASH1R.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('STEP 1 — the death dispatch drives ASH1R through PTEASH → CLIFER', () => {
  it('DEATH4 dispatches the ptero death to PTEKLL with PJOYT = 8-1 (JOUSTRV4.SRC:2941-2945)', () => {
    expect(jline(2941)).toMatch(/DEATH4\s+PSHS/)
    expect(jline(2942)).toMatch(/LDA\s+#8-1/)
    expect(jline(2943)).toMatch(/STA\s+PJOYT,U/)
    expect(jline(2944)).toMatch(/LDD\s+#PTEKLL/)
    expect(jline(2944)).toContain('SHOW A DEAD PTERODACTYL')
  })

  it('the BAITER shares PTEKLL and only DECs NBAIT (JOUSTRV4.SRC:1369-1372)', () => {
    // Both the wave-type ptero and the baiter enter PTEKLL; the baiter branch
    // (PCHASE≠0) just decrements the live-baiter count, then rejoins.
    expect(jline(1369)).toMatch(/PTEKLL\s+COM\s+PFACE,U/)
    expect(jline(1370)).toMatch(/LDA\s+PCHASE,U/)
    expect(jline(1370)).toContain('KILLED A BAITER?')
    expect(jline(1372)).toMatch(/DEC\s+NBAIT/)
  })

  it('the dissolve is a 3-frame animation over ASH1R (JOUSTRV4.SRC:1388-1400)', () => {
    expect(jline(1388)).toMatch(/LDA\s+#3/)
    expect(jline(1388)).toContain('3 FRAME ANIMATION')
    expect(jline(1390)).toMatch(/LDD\s+ASH1R/)
    expect(jline(1390)).toContain('ASHES TO ASHES')
    // The frame is drawn, PCNAP 2, redrawn, PCNAP 6 — 8 naps per frame.
    expect(jline(1393)).toMatch(/BSR\s+PTEASH/)
    expect(jline(1394)).toMatch(/PCNAP\s+2/)
    expect(jline(1398)).toMatch(/PCNAP\s+6/)
    expect(jline(1399)).toMatch(/DEC\s+PFRAME\+2,U/)
  })

  it('PTEASH JMPs into CLIFER — the ash IS drawn by the cliff run-length blitter (JOUSTRV4.SRC:1411,1419)', () => {
    expect(jline(1411)).toMatch(/PTEASH\s+LDD\s+PPOSX,U/)
    expect(jline(1419)).toMatch(/JMP\s+CLIFER/)
  })

  it('ASH1R/L are stacked labels; the image pointer table points at them (JOUSTI.SRC:48-49,2778-2779)', () => {
    const jousti = sourceLines('JOUSTI.SRC')
    expect(jousti[47], 'FDB ASH1R in the image table').toMatch(/FDB\s+ASH1R/)
    expect(jousti[48], 'FDB ASH1L in the image table').toMatch(/FDB\s+ASH1L/)
    expect(jousti[2777].trim(), 'ASH1R label').toBe('ASH1R')
    expect(jousti[2778].trim(), 'ASH1L stacked on the same address').toBe('ASH1L')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — THE BYTE GATE. Re-derive ASH1R/L from the vendored source and decode
// it with the independent reader; Dev's expandAsh must agree byte-for-byte.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('STEP 2 — the ASH decode re-derives from JOUSTI.SRC through the CLIFER format', () => {
  it('the ASH bytes re-derive from JOUSTI.SRC:2781-2815 (172 bytes, three $00 terminators)', () => {
    const bytes = bytesInRange(ASH_FILE, ASH_START, ASH_END)
    expect(bytes.length, 'PTERA1+PTERA2+PTERA3 run-length rows').toBe(172)
    const zeros = bytes.map((b, i) => (b === 0 ? i : -1)).filter((i) => i >= 0)
    expect(zeros, 'each of the three frames ends with a $00 end-of-image byte').toEqual([50, 108, 171])
  })

  it("the module's ASH1R block equals the source bytes (the jt1-3 gate, re-checked)", async () => {
    const pics = await loadPictures()
    const ash = pics.PIXEL_BLOCKS.find((b) => b.name === 'ASH1R')
    expect(ash, 'ASH1R must be transcribed').toBeDefined()
    expect(ash!.bytes).toEqual(bytesInRange(ASH_FILE, ASH_START, ASH_END))
  })

  it('Dev expandAshFrames matches the INDEPENDENT decode of the source bytes, frame-for-frame', async () => {
    const pics = await loadPictures()
    if (typeof pics.expandAshFrames !== 'function') {
      throw new Error('GREEN adds expandAshFrames to src/core/pictures.ts (the CLIFER decoder)')
    }
    const bytes = bytesInRange(ASH_FILE, ASH_START, ASH_END)
    const mine = refExpandAshFrames(bytes)
    const theirs = pics.expandAshFrames(bytes)
    // The full byte gate: not just geometry — every pixel of every frame agrees.
    expect(theirs, 'Dev decoder disagrees with the independent CLIFER decode').toEqual(mine)
  })

  it('the independent decode itself is the three PTERA frames with the expected geometry', () => {
    // Guards the reader that guards the module (a gate on an unchecked reader
    // proves nothing). These are the numbers dissolve.test.ts pins as literals.
    const frames = refExpandAshFrames(bytesInRange(ASH_FILE, ASH_START, ASH_END))
    expect(frames.length).toBe(3)
    expect([frames[0].width, frames[0].height, frames[0].pixels.length]).toEqual([28, 11, 248])
    expect([frames[1].width, frames[1].height, frames[1].pixels.length]).toEqual([28, 11, 254])
    expect([frames[2].width, frames[2].height, frames[2].pixels.length]).toEqual([28, 11, 252])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// CLAIM COVERAGE (AC "claims entries"). Runs EVERYWHERE — reads committed claims/.
// TEA writes the coverage pin; Dev commits the JT36-* claims (the jt3-4/jt3-5 seam).
// ─────────────────────────────────────────────────────────────────────────────
describe('each jt3-6 dissolve law is pinned by a claims/*.json entry (JT36-*)', () => {
  // (file, start, end) every jt3-6 law must be cited within.
  const REQUIRED: ReadonlyArray<readonly [string, number, number]> = [
    ['JOUSTRV4.SRC', 4605, 4606], // CLIFER: byte packing + $00 end-of-image
    ['JOUSTRV4.SRC', 4607, 4616], // CLIFER: colour = low nibble, length = high nibble, end-of-line
    ['JOUSTRV4.SRC', 4622, 4624], // CLIFER: last byte of a run is one pixel
    ['JOUSTRV4.SRC', 1411, 1419], // PTEASH → JMP CLIFER (the consumer)
    ['JOUSTRV4.SRC', 1388, 1390], // LDA #3 (three frames) + LDD ASH1R
    ['JOUSTRV4.SRC', 1393, 1399], // the PCNAP 2 + PCNAP 6 nap-driven frame loop
    ['JOUSTRV4.SRC', 2941, 2945], // DEATH4 dispatch → PTEKLL, PJOYT
    ['JOUSTRV4.SRC', 1369, 1372], // the baiter branch (DEC NBAIT)
    ['JOUSTI.SRC', 2778, 2815], // the ASH1R/L run-length data
    ['JOUSTI.SRC', 48, 49], // the image pointer table entries
  ]

  it('loads a non-empty claims set (the guard must have teeth)', () => {
    expect(loadClaims().length).toBeGreaterThan(0)
  })

  it('every jt3-6 dissolve law has a committed claim in its cited range', () => {
    const claims = loadClaims()
    for (const [file, start, end] of REQUIRED) {
      expect(
        claimCovers(claims, file, start, end),
        `no committed claim pins ${file}:${start}-${end} — add a JT36-* claim to ` +
          `docs/rom-study/claims/dissolve.json`,
      ).toBe(true)
    }
  })

  it('jt3-6 added its own JT36-* claims, each naming its own FILE:LINE in its text', () => {
    const jt36 = loadClaims().filter((c) => /^JT36-\d+$/.test(c.id ?? ''))
    expect(jt36.length, 'jt3-6 must add JT36-* claims').toBeGreaterThanOrEqual(10)
    // The jt1-8 lesson: never a bare `:N` — each claim names its fully-qualified
    // FILE:LINE in its prose.
    const bare = jt36.filter((c) => !/[A-Z0-9]+\.SRC:\d+/.test(c.claim ?? ''))
    expect(bare.map((c) => c.id), 'these JT36 claims do not name their own source line').toEqual([])
  })

  it('the format-establishing CLIFER line is pinned (open-questions §5 resolved)', () => {
    // The crux of ruling B: the format was traced to its consumer. Pin the exact
    // line that states "lo nybble is color, hi nybble is length".
    expect(
      claimCovers(loadClaims(), 'JOUSTRV4.SRC', 4605, 4605),
      'the CLIFER byte-packing line (JOUSTRV4.SRC:4605) must carry a claim',
    ).toBe(true)
  })

  it('every claim id is unique (JT36 does not collide with JT34/JT35/…)', () => {
    const ids = loadClaims()
      .map((c) => c.id)
      .filter((id): id is string => typeof id === 'string')
    expect(new Set(ids).size, 'duplicate claim ids').toBe(ids.length)
  })
})
