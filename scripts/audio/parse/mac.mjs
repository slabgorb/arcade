// scripts/audio/parse/mac.mjs
// Parses the DATA-emitting subset of Atari's MACRO-11 sources: .BYTE, the
// 16-arg BYT macro, labels, and the `.=` location-counter directive.
//
// .RADIX 16 is in force in every sound source we read, so bare numerals are HEX.
// A leading 0 (0C0, 0FF) is a lexer artifact — MACRO-11 requires a number to
// start with a digit so it isn't confused with a symbol. It is NOT octal.
//
// NO .WORD HANDLING, ON PURPOSE: zero of the 6502 sources this parser reads
// (ALSOUN.MAC, RBSOUN.MAC, BZSOUN.MAC) contain a single `.WORD` directive.
// The two 6809 sources that DO have word tables (SWVOC3's SPKVTB, SWMUS's
// TUNTAB) are deliberately read a different way — straight out of the linked
// ROM image (see star-wars-speech.mjs / star-wars-music.mjs) — because their
// `.WORD` tables are baked BIG-ENDIAN in the image and reference bare
// symbolic labels a line-based parser like this one can't resolve anyway. A
// `.WORD` handler here would therefore either never fire (6502 sources) or
// fire with the WRONG endianness if some future source ever tempted a caller
// to reach for it (6809). Previously this file carried exactly that: a
// little-endian `.WORD` handler nothing production called. Deleted rather
// than fixed — a correct-but-unused handler is still a loaded gun for the
// next caller who doesn't know the endianness trap.

// `VOCAB+0038` -> 0x38 ; `0C0` -> 0xC0 ; `10` -> 0x10
function value(tok) {
  const t = tok.trim();
  if (t === '') return null;
  const plus = t.indexOf('+');
  const hex = plus >= 0 ? t.slice(plus + 1) : t;
  const neg = hex.startsWith('-');
  const n = parseInt(neg ? hex.slice(1) : hex, 16);
  if (Number.isNaN(n)) return null;
  return neg ? -n : n;
}

export function parseMac(text) {
  const out = [];
  const labels = new Map();

  for (const raw of text.split('\n')) {
    const line = raw.split(';')[0];        // strip comment
    if (!line.trim()) continue;

    // Label(s) at the start of the line: NAME: or NAME::
    const lm = line.match(/^([A-Za-z0-9$.]+)::?/);
    if (lm) {
      labels.set(lm[1], out.length);
    }

    // `.=SYMBOL+38` — advance the location counter, zero-filling.
    const dot = line.match(/\.\s*=\s*[A-Za-z0-9$.]+\s*\+\s*([0-9A-Fa-f]+)/);
    if (dot) {
      const target = parseInt(dot[1], 16);
      while (out.length < target) out.push(0);
      continue;
    }

    const bm = line.match(/(?:^|\s)(?:\.BYTE|BYT)\s+(.*)$/i);
    if (bm) {
      for (const tok of bm[1].split(',')) {
        const v = value(tok);
        if (v !== null) out.push(v & 0xff);
      }
      continue;
    }
  }
  return { bytes: Uint8Array.from(out), labels };
}
