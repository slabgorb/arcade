// tools/bake-contact-sheet.mjs
//
// Story jt1-3 (GREEN, Julia) — bakes docs/rom-study/contact-sheet.html, the
// human-review artefact for the transcription (star-wars bake-models.mjs
// precedent, and the same reason: a grid of every frame rendered through the
// real data is the only way a person can SEE that a block is upside down,
// mis-sized, or the wrong colour).
//
// Why HTML and not PNG: the suite checks label COVERAGE mechanically — a
// reviewer cannot notice a block that was never drawn — and that needs a format
// a test can read. Every block label appears as text; the pixels are inline
// SVG rects, so the file is self-contained and opens with no server.
//
// The RLE expansion carries the weight here. The byte gate cannot prove the
// expanded CLIFF5 image is CORRECT (there is no reference decoder — see the
// story's Question finding); its invariants prove only that the stream is
// consumed exactly and the alphabet is legal. So the expansion is drawn large
// at the top of the sheet, and a human deciding "yes, that is the bottom
// island of the Joust arena" is the actual verification step.

import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PIXEL_BLOCKS, PALETTES, COMCL5, expandComcl5 } from '../src/core/pictures.ts'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * The 1982 palette byte is BBGGGRRR — 2 bits blue, 3 green, 3 red — which is
 * how a 3-bit green channel and a 2-bit blue channel share one byte. Scale each
 * field up to 8 bits for display only; the stored bytes are never altered.
 */
function paletteToCss(bytes) {
  return bytes.map((b) => {
    const r = b & 0x07
    const g = (b >> 3) & 0x07
    const bl = (b >> 6) & 0x03
    const to8 = (v, bits) => Math.round((v / ((1 << bits) - 1)) * 255)
    return `rgb(${to8(r, 3)},${to8(g, 3)},${to8(bl, 2)})`
  })
}

const CSS_PALETTE = paletteToCss(PALETTES.COLOR1.bytes)

/** 4bpp, 2 pixels per byte, high nibble is the LEFT pixel. */
function blockToSvg(block, scale = 2) {
  const wPx = block.width * 2
  const rects = []
  for (let i = 0; i < block.bytes.length; i++) {
    const byte = block.bytes[i]
    const row = Math.floor(i / block.width)
    const col = (i % block.width) * 2
    for (const [k, nibble] of [[0, (byte >> 4) & 0x0f], [1, byte & 0x0f]]) {
      if (nibble === 0) continue // nibble 0 is transparent/background
      rects.push(
        `<rect x="${(col + k) * scale}" y="${row * scale}" width="${scale}" height="${scale}" fill="${CSS_PALETTE[nibble]}"/>`,
      )
    }
  }
  return `<svg width="${wPx * scale}" height="${block.height * scale}" viewBox="0 0 ${wPx * scale} ${block.height * scale}">${rects.join('')}</svg>`
}

/** The expanded COMCL5 island: ragged rows, drawn in decode order. */
function expansionToSvg(expanded, scale = 3) {
  const rects = []
  let x = 0
  let y = 0
  // Rows are ragged (each ends at its own end-of-line token), so walk the
  // written pixels in order and wrap on the recorded width.
  for (const nibble of expanded.pixels) {
    if (nibble !== 0) {
      rects.push(
        `<rect x="${x * scale}" y="${y * scale}" width="${scale}" height="${scale}" fill="${CSS_PALETTE[nibble]}"/>`,
      )
    }
    x++
    if (x >= expanded.width) {
      x = 0
      y++
    }
  }
  return `<svg width="${expanded.width * scale}" height="${(y + 1) * scale}" viewBox="0 0 ${expanded.width * scale} ${(y + 1) * scale}">${rects.join('')}</svg>`
}

const expanded = expandComcl5(COMCL5.bytes)

const framed = PIXEL_BLOCKS.filter((b) => b.headerAnchor)
const raw = PIXEL_BLOCKS.filter((b) => !b.headerAnchor && b.height > 1)
const streams = PIXEL_BLOCKS.filter((b) => !b.headerAnchor && b.height === 1)

const card = (b) => `
  <figure class="cell">
    ${blockToSvg(b)}
    <figcaption>
      <b>${b.name}</b>${b.aliases.length ? ` <i>(${b.aliases.join(', ')})</i>` : ''}
      <span>${b.width * 2}&times;${b.height}px</span>
      <span class="cite">${b.anchor.file}:${b.anchor.startLine}-${b.anchor.endLine}</span>
    </figcaption>
  </figure>`

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Joust — image transcription contact sheet (jt1-3)</title>
<style>
  body { background:#111; color:#ddd; font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; margin:0; padding:24px; }
  h1 { font-size:18px; margin:0 0 4px; }
  h2 { font-size:15px; margin:32px 0 8px; border-bottom:1px solid #333; padding-bottom:4px; }
  p.note { color:#999; max-width:70ch; }
  .grid { display:flex; flex-wrap:wrap; gap:14px; }
  .cell { margin:0; background:#000; border:1px solid #333; padding:8px; display:flex;
          flex-direction:column; align-items:center; gap:6px; }
  .cell svg { image-rendering:pixelated; }
  figcaption { text-align:center; font-size:11px; line-height:1.35; }
  figcaption b { color:#fff; }
  figcaption i { color:#8ab; font-style:normal; }
  figcaption span { display:block; color:#888; }
  .cite { color:#666 !important; font-size:10px; }
  .palette { display:flex; gap:0; margin:8px 0 0; }
  .swatch { width:34px; height:34px; display:flex; align-items:flex-end; justify-content:center;
            font-size:9px; color:#fff; text-shadow:0 0 3px #000; border:1px solid #333; }
  .stream { background:#000; border:1px solid #333; padding:10px; display:inline-block; }
</style>
</head>
<body>
<h1>Joust — image transcription contact sheet</h1>
<p class="note">
  Story jt1-3. Generated by <code>tools/bake-contact-sheet.mjs</code> from
  <code>src/core/pictures.ts</code>, which is itself transcribed from the vendored 1982
  Williams source and byte-gated against an independent reading of it. Colours are the
  real <code>COLOR1</code> palette (BBGGGRRR, scaled to 8 bits per channel for display only);
  nibble&nbsp;0 is drawn transparent.
</p>

<h2>COLOR1 — the active game palette (SYSTEM.SRC:908-923)</h2>
<div class="palette">
${PALETTES.COLOR1.bytes.map((b, i) => `  <div class="swatch" style="background:${CSS_PALETTE[i]}">${i}</div>`).join('\n')}
</div>
<p class="note">
  Nibble 5 = Player 1 yellow, 7 = Player 2 light blue, 4 = enemy knight red — the
  identification the rider pixel data confirms (PIC-068/069/070).
</p>

<h2>COMCL5 &rarr; CLIFF5, the compacted bottom island (${expanded.width}&times;${expanded.height}, ${expanded.pixels.length} px)</h2>
<p class="note">
  <b>This is the block that most needs human eyes.</b> The byte gate proves the 871-byte
  stream is consumed exactly and emits only legal nibbles, but there is no reference
  decoder to prove the resulting IMAGE is right. If this reads as the bottom island of
  the Joust arena, the Elias-gamma expansion (SYSTEM.SRC:937-1023) is correct; if it
  reads as noise or is sheared, it is not. Drawn at origin (54, 211).
</p>
<div class="stream">${expansionToSvg(expanded)}</div>

<h2>Framed entity blocks (${framed.length})</h2>
<div class="grid">${framed.map(card).join('')}</div>

<h2>Cliff and transporter pixel sources (${raw.length})</h2>
<div class="grid">${raw.map(card).join('')}</div>

<h2>Compressed streams (${streams.length}) — not rasters</h2>
<p class="note">
  These carry compressed bytes, not a pixel grid, so they are listed rather than drawn:
  COMCL5 is expanded above; ASH1R/ASH1L is the pterodactyl dissolve, whose format is
  decoded by CLIFER (JOUSTRV4.SRC:4604-4631) — hi nibble = run length in BYTES, lo nibble
  = colour, the last byte of each run masked to a single pixel.
</p>
<div class="grid">
${streams.map((b) => `  <figure class="cell"><figcaption><b>${b.name}</b>${b.aliases.length ? ` <i>(${b.aliases.join(', ')})</i>` : ''}<span>${b.bytes.length} bytes</span><span class="cite">${b.anchor.file}:${b.anchor.startLine}-${b.anchor.endLine}</span></figcaption></figure>`).join('\n')}
</div>
</body>
</html>
`

const out = join(repoRoot, 'docs', 'rom-study', 'contact-sheet.html')
writeFileSync(out, html)
console.log(
  `contact sheet → docs/rom-study/contact-sheet.html ` +
    `(${PIXEL_BLOCKS.length} blocks: ${framed.length} framed, ${raw.length} raw, ${streams.length} streams; ` +
    `COMCL5 ${expanded.width}x${expanded.height})`,
)