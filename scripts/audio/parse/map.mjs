// scripts/audio/parse/map.mjs
// Parses ATARI LINKM load maps. TWO dialects (V05.00 dense grid / V6.4 one-per-line),
// both of which reprint the page banner MID-TABLE at form-feed page breaks — so the
// tables are NOT blank-line-delimited. See the plan's Task 1 background.

// Lines that are printer furniture, not data. They may appear ANYWHERE, including
// between two rows of the symbol table.
function isFurniture(line) {
  const t = line.trim();
  if (t === '') return true;
  if (t.startsWith('ATARI LINKM')) return true;
  if (/^[A-Z0-9]+:\S+$/.test(t)) return true;       // BIN:RBARON.SAV
  if (t.startsWith('Low limit')) return true;
  if (t.startsWith('Name')) return true;            // column header
  return false;
}

const SECTION_HDR = 'Section Summary:';
const SYMBOL_HDR = 'Global Symbol Summary:';

// A symbol is 1-6 chars of [A-Z0-9.$]; its value is exactly 4 uppercase hex digits.
const PAIR = /([A-Z0-9.$]{1,6})\s+([0-9A-F]{4})(?![0-9A-F])/g;

export function parseMap(text) {
  const isV6 = /ATARI LINKM V6/.test(text);
  const lines = text.split('\n');
  const symbols = new Map();
  const modules = [];
  let mode = null;

  for (const line of lines) {
    const t = line.trim();
    if (t === SECTION_HDR) { mode = 'section'; continue; }
    if (t === SYMBOL_HDR) { mode = 'symbol'; continue; }
    if (isFurniture(line)) continue;               // NB: does NOT reset `mode`
    if (mode === 'section') {
      // Fixed-width: name is the first 8 columns (may hold ". ABS." — embedded
      // space — or be entirely blank for an unnamed REL,CON section).
      const name = line.slice(0, 8).trim();
      const rest = line.slice(8);
      const m = rest.match(/^\s*([0-9A-F]{4})\s+([0-9A-F]{4})\s+([A-Z,]+)\s*(.*)$/);
      if (!m) continue;                            // reference continuation line
      modules.push({
        name,
        base: parseInt(m[1], 16),
        size: parseInt(m[2], 16),
        attrs: m[3],
        refs: m[4].trim().split(/\s+/).filter(Boolean).map((r) => r.replace(/#$/, '')),
      });
    } else if (mode === 'symbol') {
      if (isV6) {
        // NAME  VALUE  ref ref#...  — one symbol, then a reference list.
        const m = line.match(/^([A-Z0-9.$]{1,6})\s+([0-9A-F]{4})\s/);
        if (m) symbols.set(m[1], parseInt(m[2], 16));
      } else {
        // Up to 5 (name, value) pairs per line; the last row of a page is short.
        PAIR.lastIndex = 0;
        let m;
        while ((m = PAIR.exec(line)) !== null) symbols.set(m[1], parseInt(m[2], 16));
      }
    }
  }
  return { symbols, modules };
}
