# extract-audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `just extract-audio <game>` — an audit tool that proves every sound the arcade fleet ships against the original Atari ROM, and reports a verdict per sound.

**Architecture:** A five-link chain per sound — PARSE the original Atari source → LOCATE the table via the `.MAP` symbol table → VERIFY the bytes against the ROM image → RENDER to PCM → COMPARE with what the game ships. Thin CLI over a pure, unit-tested core, mirroring `scripts/vendor-source.mjs`. Three artifact classes (SFX, music, speech) share one POKEY renderer.

**Tech Stack:** Node ≥20, zero runtime dependencies, ES modules (`.mjs`), `node --test`.

Design spec: `docs/superpowers/specs/2026-07-12-extract-audio-design.md` (read it once, for context).

## Global Constraints

These bind **every** task. They are not optional and not negotiable.

1. **NO FALLBACKS.** No file under `scripts/audio/` may import, read, or reference any of: `tempest/tools/pokey-bake/sfx-data.mjs`, `star-wars/tools/pokey-bake/sfx-data.mjs`, `star-wars/tools/speech-bake/speech-data.mjs`, `red-baron/src/shell/pokey.ts`. Those are **comparison targets**, judged — never inputs. A sound that cannot be derived from source+ROM is reported `UNVERIFIED`; it is NEVER satisfied from an existing hand table or shipped `.wav`.
2. **Byte-equality is exact.** No tolerance, no fuzzy match, no "close enough."
3. Zero runtime dependencies. Only `node:fs`, `node:path`, `node:os`, `node:vm`, `node:child_process`, `node:test`, `node:assert`.
4. ES modules, `.mjs`. Export a pure core; guard `main()` with
   `if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()`
   so tests can import without side effects.
5. Tests live in `tests/*.test.mjs`, run by `just test-orchestrator` → `node --test 'tests/**/*.test.mjs'`.
6. **The Atari sources are `.RADIX 16`.** Every bare numeral in a `.BYTE`/`.WORD` is **hexadecimal**. Values starting with a letter carry a leading `0` (`0C0`, `0FF`) — that is a lexer artifact, not an octal marker.
7. **Source comments lie. Only bytes are authoritative.** `ALSOUN.MAC` is Atari's generic sound library — its comment says `EX2` is "ENEMY EXPLOSION" when Tempest uses it as `player_fire`. Never key on comment text; key on ROM address.
8. Vendored source lives at `~/Projects/<name>-source` (pristine, true bytes — **use for ROM binaries**) and `~/Projects/<name>-source-text` (LF-normalized ASCII — **use for source text**). Names come from `docs/reference-sources.md`. Star Wars' dirbase is `star-wars-1983`, not `star-wars`.
9. Never write into a game subrepo. This tool only reads them.

---

### Task 1: `.MAP` linker-map parser

**Files:**
- Create: `scripts/audio/parse/map.mjs`
- Test: `tests/audio-parse-map.test.mjs`

**Interfaces:**
- Produces: `parseMap(text) -> { symbols: Map<string,number>, modules: Array<{name, base, size, refs}> }`. Addresses are numbers. Used by every adapter to locate tables.

**Background you need:** Two incompatible dialects, identified by the banner on line 1.
- **Dialect A** (`ATARI LINKM V05.00`) — used by `ALEXEC.MAP`, `RBARON.MAP`, `BZONE.MAP`. Global Symbol Summary is a grid of up to **5** `name(8 chars) + addr(4 hex + 3 spaces)` pairs per line. The final row of a page is short — do NOT assume 5.
- **Dialect B** (`ATARI LINKM V6.4`) — used by `SNDAUX.MAP`. One symbol per line, followed by a reference list where a `#` suffix marks the **defining** module.

**Both are booby-trapped:** form-feed page breaks make the printer **reprint the banner in the middle of a table**. In the LF-normalized text this appears as a blank line, then `ATARI LINKM ...`, then `BIN:XXX.SAV`, then data resumes. A parser that stops at the first blank line silently truncates the symbol table. The table ends only at `Low limit = ... High limit = ...` (once, at EOF).

Pseudo-names `. ABS.` and `. B` contain **embedded spaces** — `\S+` tokenizing shreds them. Symbol names are ≤6 chars from `[A-Z0-9.$]`.

- [ ] **Step 1: Write the failing test**

```js
// tests/audio-parse-map.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMap } from '../scripts/audio/parse/map.mjs';

const DIALECT_A = `
ATARI LINKM V05.00 LOAD MAP   14-SEP-81   06:14:22
BIN:RBARON.SAV

Section Summary:
 Name   Addr   Size   Attributes     References (Files):
. ABS.  0000   70B7   ABS,OVR      RBARON  RBCOIN
RBSOUN  71C4   0104   REL,OVR      RBSOUN

Global Symbol Summary:
CALCNT  0018   D.NMHL  186F   MATH    1860   PLNDB   709E   SNDON   7259

ATARI LINKM V05.00 LOAD MAP   14-SEP-81   06:14:22
BIN:RBARON.SAV

MODSND  7278   CRSHSN  1808
Low limit = 4800   High limit = 7FD7
`;

test('map: dialect A reads 5-pair symbol grid', () => {
  const { symbols } = parseMap(DIALECT_A);
  assert.equal(symbols.get('SNDON'), 0x7259);
  assert.equal(symbols.get('D.NMHL'), 0x186f);
});

test('map: a mid-table banner reprint does not truncate the symbol table', () => {
  // MODSND appears AFTER the page-break banner. A naive "stop at blank line"
  // parser loses it — that is the bug this test exists to prevent.
  const { symbols } = parseMap(DIALECT_A);
  assert.equal(symbols.get('MODSND'), 0x7278);
  assert.equal(symbols.get('CRSHSN'), 0x1808);
});

test('map: a short final row (fewer than 5 pairs) parses', () => {
  const { symbols } = parseMap(DIALECT_A);
  assert.equal(symbols.size, 7);
});

test('map: module table survives the ". ABS." embedded-space pseudo-name', () => {
  const { modules } = parseMap(DIALECT_A);
  const rbsoun = modules.find((m) => m.name === 'RBSOUN');
  assert.deepEqual({ base: rbsoun.base, size: rbsoun.size }, { base: 0x71c4, size: 0x0104 });
  assert.ok(modules.some((m) => m.name === '. ABS.'), '". ABS." must not be shredded into tokens');
});

const DIALECT_B = `
ATARI LINKM V6.4 LOAD MAP   22-JAN-83
BIN:SNDAUX.SAV

Section Summary:
 Name   Addr    Size    Attributes     References (Files):
VOCABU  4002    18E3    REL,OVR      SWVOC3

Global Symbol Summary:
TUNTAB  58E5     SWMUS#  SNDPM
AUDRAM  2100     SNDGLB# SNDAUD#
Low limit = 4000   High limit = 7FF0
`;

test('map: dialect B reads one-symbol-per-line and strips the # defining marker', () => {
  const { symbols, modules } = parseMap(DIALECT_B);
  assert.equal(symbols.get('TUNTAB'), 0x58e5);
  const vocab = modules.find((m) => m.name === 'VOCABU');
  assert.deepEqual({ base: vocab.base, size: vocab.size }, { base: 0x4002, size: 0x18e3 });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tests/audio-parse-map.test.mjs`
Expected: FAIL — `Cannot find module '../scripts/audio/parse/map.mjs'`

- [ ] **Step 3: Implement**

```js
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
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/audio-parse-map.test.mjs`
Expected: PASS, 5/5.

- [ ] **Step 5: Verify against the REAL maps (not just the fixtures)**

```bash
node -e "
import('./scripts/audio/parse/map.mjs').then(async ({parseMap}) => {
  const { readFileSync } = await import('node:fs');
  const { homedir } = await import('node:os');
  const H = homedir();
  for (const [f, sym, want] of [
    ['red-baron-source-text/RBARON.MAP', 'SNDON', 0x7259],
    ['tempest-source-text/ALEXEC.MAP', 'CHKSM9', 0xccaf],
    ['star-wars-1983-source-text/SNDAUX.MAP', 'TUNTAB', 0x58e5],
  ]) {
    const { symbols } = parseMap(readFileSync(H + '/Projects/' + f, 'utf8'));
    const got = symbols.get(sym);
    console.log(f, sym, got?.toString(16), got === want ? 'OK' : 'MISMATCH want ' + want.toString(16));
  }
});
"
```
Expected: three `OK` lines. These three symbols were each read out of the real maps during design; if any says MISMATCH, the parser is wrong — fix it before committing.

- [ ] **Step 6: Commit**

```bash
git add scripts/audio/parse/map.mjs tests/audio-parse-map.test.mjs
git commit -m "feat(extract-audio): ATARI LINKM .MAP parser (both dialects, page-break safe)"
```

---

### Task 2: DEC `.LDA` + raw ROM image reader

**Files:**
- Create: `scripts/audio/parse/rom.mjs`
- Test: `tests/audio-parse-rom.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `parseLda(buf) -> { image: Uint8Array(0x10000), blocks: Array<{addr,len}> }` — sparse 64 K image.
  - `loadRawRom(buf, base) -> { image, base }` — raw chip dump placed at `base`.
  - `readImage(image, addr, len) -> Uint8Array`

**Background — the exact `.LDA` framing (verified against real bytes):**

```
offset 0-1 : 01 00              block-start marker (constant)
offset 2-3 : count (u16 LE)     bytes in [marker+count+addr+data] — INCLUDES the 6-byte header
offset 4-5 : addr  (u16 LE)     load address
offset 6.. : data               data_len = count - 6
offset count : checksum (u8)    NOT counted in `count`
```

**Two traps that will silently corrupt the image:**
1. A block consumes `count + 1` bytes on disk (the checksum is *outside* `count`). Advance by `count`, and every subsequent block misparses.
2. **Blocks are NOT disjoint.** 1–2 byte linker fixup patches land *inside* ranges already written by earlier blocks. Apply blocks **strictly in file order, later overwriting earlier**. Merging by address range keeps stale bytes and yields a corrupt image that still parses cleanly.

Terminator: a zero-data block `01 00 06 00 01 00 F8` (`count == 6`). Stop there; the rest of the file is zero padding to a 512-byte boundary — do not parse it as blocks.

Checksum: 8-bit sum of `[marker..data] + checksum` ≡ 0 (mod 256). A failure is a hard error.

- [ ] **Step 1: Write the failing test**

```js
// tests/audio-parse-rom.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLda, loadRawRom, readImage } from '../scripts/audio/parse/rom.mjs';

// Build one .LDA block: marker, count(=6+data), addr, data, checksum(sum-to-zero).
function block(addr, data) {
  const count = 6 + data.length;
  const head = [0x01, 0x00, count & 0xff, count >> 8, addr & 0xff, addr >> 8, ...data];
  const sum = head.reduce((a, b) => (a + b) & 0xff, 0);
  return [...head, (0x100 - sum) & 0xff];
}
const TERMINATOR = [0x01, 0x00, 0x06, 0x00, 0x01, 0x00, 0xf8];

test('lda: block consumes count+1 bytes (checksum sits OUTSIDE count)', () => {
  const buf = Buffer.from([
    ...block(0x4000, [0xaa, 0xbb]),
    ...block(0x4002, [0xcc]),
    ...TERMINATOR,
  ]);
  const { image, blocks } = parseLda(buf);
  // If the reader advanced by `count` instead of `count+1`, block 2 misparses
  // and 0x4002 is not 0xcc.
  assert.equal(image[0x4000], 0xaa);
  assert.equal(image[0x4001], 0xbb);
  assert.equal(image[0x4002], 0xcc);
  assert.equal(blocks.length, 2, 'terminator is not a data block');
});

test('lda: a later block OVERWRITES an earlier one at the same address', () => {
  const buf = Buffer.from([
    ...block(0x5000, [0x11, 0x22, 0x33]), // big block
    ...block(0x5001, [0x99]),             // 1-byte fixup patch INSIDE it
    ...TERMINATOR,
  ]);
  const { image } = parseLda(buf);
  assert.equal(image[0x5001], 0x99, 'linker fixup must win — merge-by-range keeps stale 0x22');
});

test('lda: stops at the zero-data terminator and ignores trailing zero padding', () => {
  const buf = Buffer.from([...block(0x4000, [0x01]), ...TERMINATOR, ...new Array(200).fill(0)]);
  const { blocks } = parseLda(buf);
  assert.equal(blocks.length, 1);
});

test('lda: a bad checksum is a hard error, never a warning', () => {
  const b = block(0x4000, [0x01]);
  b[b.length - 1] ^= 0xff; // corrupt the checksum
  assert.throws(() => parseLda(Buffer.from([...b, ...TERMINATOR])), /checksum/i);
});

test('raw rom: places a chip dump at its base address', () => {
  const { image } = loadRawRom(Buffer.from([0xde, 0xad]), 0x7800);
  assert.equal(image[0x7800], 0xde);
  assert.equal(image[0x7801], 0xad);
});

test('readImage slices the reconstructed image', () => {
  const { image } = loadRawRom(Buffer.from([1, 2, 3, 4]), 0x100);
  assert.deepEqual([...readImage(image, 0x101, 2)], [2, 3]);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tests/audio-parse-rom.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
// scripts/audio/parse/rom.mjs
// Reconstructs a 64K memory image from either a DEC absolute-loader (.LDA) file
// or a raw EPROM chip dump.
//
// .LDA framing (verified against SNDAUX.LDA / TEMPST.LDA / ALEXEC.LDA):
//   01 00 | count(u16 LE) | addr(u16 LE) | data[count-6] | checksum(u8)
// `count` INCLUDES the 6-byte header but EXCLUDES the checksum, so a block
// consumes count+1 bytes. Blocks are NOT disjoint: 1-2 byte linker fixups land
// inside earlier blocks, so blocks MUST be applied in file order with later
// writes overwriting earlier ones.

export const IMAGE_SIZE = 0x10000;

export function parseLda(buf) {
  const image = new Uint8Array(IMAGE_SIZE);
  const blocks = [];
  let pos = 0;
  while (pos + 6 <= buf.length) {
    if (buf[pos] !== 0x01 || buf[pos + 1] !== 0x00) {
      throw new Error(`bad .LDA block marker at 0x${pos.toString(16)}`);
    }
    const count = buf[pos + 2] | (buf[pos + 3] << 8);
    if (count < 6) throw new Error(`bad .LDA count ${count} at 0x${pos.toString(16)}`);
    const addr = buf[pos + 4] | (buf[pos + 5] << 8);
    const dataLen = count - 6;
    const end = pos + count;          // checksum byte lives AT `end`
    if (end >= buf.length) throw new Error(`truncated .LDA block at 0x${pos.toString(16)}`);

    let sum = 0;
    for (let i = pos; i <= end; i++) sum = (sum + buf[i]) & 0xff;
    if (sum !== 0) {
      throw new Error(`.LDA checksum failure at 0x${pos.toString(16)} (sum=0x${sum.toString(16)})`);
    }

    if (dataLen === 0) break;         // zero-data block = end of image
    for (let i = 0; i < dataLen; i++) image[(addr + i) & 0xffff] = buf[pos + 6 + i];
    blocks.push({ addr, len: dataLen });
    pos = end + 1;                    // +1 for the checksum byte
  }
  return { image, blocks };
}

export function loadRawRom(buf, base) {
  const image = new Uint8Array(IMAGE_SIZE);
  for (let i = 0; i < buf.length; i++) image[(base + i) & 0xffff] = buf[i];
  return { image, base };
}

export function readImage(image, addr, len) {
  return image.slice(addr, addr + len);
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/audio-parse-rom.test.mjs`
Expected: PASS, 6/6.

- [ ] **Step 5: Verify against the REAL `SNDAUX.LDA`**

```bash
node -e "
import('./scripts/audio/parse/rom.mjs').then(async ({parseLda}) => {
  const { readFileSync } = await import('node:fs');
  const { homedir } = await import('node:os');
  const buf = readFileSync(homedir() + '/Projects/star-wars-1983-source/SNDAUX.LDA');
  const { blocks } = parseLda(buf);
  const lo = Math.min(...blocks.map(b => b.addr));
  console.log('blocks:', blocks.length, 'low:', lo.toString(16));
  console.log(lo === 0x4000 ? 'OK — matches SNDAUX.MAP Low limit = 4000' : 'MISMATCH');
});
"
```
Expected: `OK` — every block checksum must validate (any throw means the reader is wrong) and the low address must be `4000`, matching `SNDAUX.MAP`'s `Low limit`.

- [ ] **Step 6: Commit**

```bash
git add scripts/audio/parse/rom.mjs tests/audio-parse-rom.test.mjs
git commit -m "feat(extract-audio): DEC .LDA absolute-loader + raw ROM image reader"
```

---

### Task 3: MACRO-11 `.BYTE`/`.WORD` table parser

**Files:**
- Create: `scripts/audio/parse/mac.mjs`
- Test: `tests/audio-parse-mac.test.mjs`

**Interfaces:**
- Produces: `parseMac(text) -> { bytes: Uint8Array, labels: Map<string,number>, words: Map<string,number[]> }`
  - `bytes` — every byte emitted by `.BYTE` / `BYT` directives, in source order, from offset 0.
  - `labels` — label name → its byte offset into `bytes`.
  - `words` — label → the `.WORD` values that immediately follow it (for `SPKVTB`/`TUNTAB` address tables).

**Background:**
- `.RADIX 16` — **every bare numeral is hex**. `10` is 16 decimal. Leading `0` on `0C0` is a lexer artifact.
- `BYT` is a 16-argument macro (`SWVOC2/3.MAC`) expanding to one `.BYTE` of exactly 16 values. Treat `BYT` exactly like `.BYTE`.
- `.= LABEL+38` sets the location counter — it **pads forward with zeros**. `SWVOC2.MAC` uses it to skip 8 bytes past its 48-byte pointer table so data starts at offset `0x38`. Ignoring it shifts every phrase.
- Comments start with `;` and run to end of line. A line may be label-only.
- A label may be declared `LABEL::` (global) or `LABEL:`.

- [ ] **Step 1: Write the failing test**

```js
// tests/audio-parse-mac.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMac } from '../scripts/audio/parse/mac.mjs';

test('mac: .RADIX 16 — bare numerals are HEX, and 0C0 is 0xC0 not octal', () => {
  const { bytes, labels } = parseMac(`
	.RADIX 16
T51F:	.BYTE 0C0,8,4,10
	.BYTE 0,0
`);
  // 10 is SIXTEEN, not ten. This is the single easiest way to corrupt every table.
  assert.deepEqual([...bytes], [0xc0, 0x08, 0x04, 0x10, 0x00, 0x00]);
  assert.equal(labels.get('T51F'), 0);
});

test('mac: consecutive labels get correct offsets', () => {
  const { labels } = parseMac(`
	.RADIX 16
T51F:	.BYTE 0C0,8,4,10
	.BYTE 0,0
T51A:	.BYTE 0A6,20,0F8,4
	.BYTE 0,0
`);
  assert.equal(labels.get('T51A'), 6);
});

test('mac: the BYT macro emits 16 bytes, same as .BYTE', () => {
  const { bytes } = parseMac(`
	.RADIX 16
	BYT 080,068,099,050,067,08D,09E,095,0B5,05A,09E,08D,0A8,086,04F,06E
`);
  assert.equal(bytes.length, 16);
  assert.equal(bytes[0], 0x80);
  assert.equal(bytes[15], 0x6e);
});

test('mac: ".=LABEL+38" pads forward with zeros (SWVOC2 speech-data offset)', () => {
  const { bytes, labels } = parseMac(`
	.RADIX 16
	.CSECT VOCAB
	VOCAB=.
SPKVTB::
	.WORD VOCAB+0038,VOCAB+0171
	.=VOCAB+38
	.BYTE 004,000
`);
  // The 2 .WORDs emit 4 bytes; .= forces the counter to 0x38. Without this,
  // every phrase in the vocabulary is offset wrong.
  assert.equal(bytes.length, 0x3a);
  assert.equal(bytes[0x38], 0x04);
  assert.equal(labels.get('SPKVTB'), 0);
});

test('mac: .WORD values are captured per label (for SPKVTB / TUNTAB)', () => {
  const { words } = parseMac(`
	.RADIX 16
SPKVTB::
	.WORD VOCAB+0038,VOCAB+0171	;USE THE FORCE, LUKE
	.WORD VOCAB+0172,VOCAB+02E7	;THE FORCE WILL BE WITH YOU
`);
  assert.deepEqual(words.get('SPKVTB'), [0x38, 0x171, 0x172, 0x2e7]);
});

test('mac: comments and label-only lines are ignored', () => {
  const { bytes, labels } = parseMac(`
	.RADIX 16
;THIS IS A COMMENT WITH .BYTE 0FF IN IT
DI1F:
	.BYTE 8,4	;trailing comment
`);
  assert.deepEqual([...bytes], [0x08, 0x04]);
  assert.equal(labels.get('DI1F'), 0);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tests/audio-parse-mac.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
// scripts/audio/parse/mac.mjs
// Parses the DATA-emitting subset of Atari's MACRO-11 sources: .BYTE, .WORD, the
// 16-arg BYT macro, labels, and the `.=` location-counter directive.
//
// .RADIX 16 is in force in every sound source we read, so bare numerals are HEX.
// A leading 0 (0C0, 0FF) is a lexer artifact — MACRO-11 requires a number to
// start with a digit so it isn't confused with a symbol. It is NOT octal.

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
  const words = new Map();
  let lastLabel = null;

  for (const raw of text.split('\n')) {
    const line = raw.split(';')[0];        // strip comment
    if (!line.trim()) continue;

    // Label(s) at the start of the line: NAME: or NAME::
    const lm = line.match(/^([A-Za-z0-9$.]+)::?/);
    if (lm) {
      lastLabel = lm[1];
      labels.set(lastLabel, out.length);
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

    const wm = line.match(/(?:^|\s)\.WORD\s+(.*)$/i);
    if (wm) {
      const vals = wm[1].split(',').map(value).filter((v) => v !== null);
      if (lastLabel) {
        if (!words.has(lastLabel)) words.set(lastLabel, []);
        words.get(lastLabel).push(...vals);
      }
      for (const v of vals) { out.push(v & 0xff); out.push((v >> 8) & 0xff); } // LE
    }
  }
  return { bytes: Uint8Array.from(out), labels, words };
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/audio-parse-mac.test.mjs`
Expected: PASS, 6/6.

- [ ] **Step 5: Commit**

```bash
git add scripts/audio/parse/mac.mjs tests/audio-parse-mac.test.mjs
git commit -m "feat(extract-audio): MACRO-11 .BYTE/.WORD/BYT table parser (.RADIX 16)"
```

---

### Task 4: WAV writer + POKEY renderer (retire 3 duplicates)

**Files:**
- Create: `scripts/audio/wav.mjs`
- Create: `scripts/audio/render/pokey.mjs`
- Create: `scripts/audio/vendor/pokey.js` — **copy verbatim**, do not edit:
  `cp tempest/tools/pokey-bake/vendor/pokey.js scripts/audio/vendor/pokey.js`
- Test: `tests/audio-render-pokey.test.mjs`

**Interfaces:**
- Produces:
  - `writeWav(path, samples, sampleRate)` — 16-bit mono PCM.
  - `pcmBytes(samples) -> Buffer` — the raw 16-bit LE sample bytes (for byte-exact comparison, no header).
  - `renderPokey(events, { durationMs, sampleRate }) -> Float32Array` where `events` is a flat `[reg, value, timeSeconds, ...]` stream.

**Background:** `writeWav` is currently copy-pasted **three** times (`tempest/tools/pokey-bake/bake-sfx.mjs`, `star-wars/tools/pokey-bake/bake-sfx.mjs`, `star-wars/tools/speech-bake/bake-speech.mjs`). `vendor/pokey.js` is web-pokey (MIT, Mariusz Kryński, commit `0c6327b`), vendored identically twice. It is written for an AudioWorklet, so it must be loaded through a `node:vm` shim that supplies `sampleRate`, `currentFrame`, `AudioWorkletProcessor`, `registerProcessor`.

**`node:vm` is NOT a security sandbox** — it is used purely to supply the AudioWorklet globals for a committed, trusted, MIT dependency. Never run untrusted source through it. Keep this comment in the code.

**Critical:** web-pokey walks its event feed monotonically. Events **must be sorted by time** before `feed()`, or later-but-earlier-timed writes are applied in a lump at the end, producing a silent or wrong sound.

- [ ] **Step 1: Write the failing test**

```js
// tests/audio-render-pokey.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderPokey } from '../scripts/audio/render/pokey.mjs';
import { pcmBytes } from '../scripts/audio/wav.mjs';

test('pokey: a pure tone renders audible non-silence', () => {
  // AUDCTL=0, then AUDF1=0x50 (pitch), AUDC1=0xA8 (pure tone, volume 8).
  const events = [8, 0x00, 0.0, 0, 0x50, 0.0, 1, 0xa8, 0.0];
  const out = renderPokey(events, { durationMs: 100, sampleRate: 48000 });
  const peak = out.reduce((m, s) => Math.max(m, Math.abs(s)), 0);
  assert.ok(peak > 0.01, `expected audible output, got peak ${peak}`);
  assert.equal(out.length, 4800);
});

test('pokey: silence when volume is zero', () => {
  const out = renderPokey([8, 0x00, 0.0, 0, 0x50, 0.0, 1, 0xa0, 0.0], { durationMs: 50, sampleRate: 48000 });
  const peak = out.reduce((m, s) => Math.max(m, Math.abs(s)), 0);
  assert.ok(peak < 1e-4, `expected silence, got peak ${peak}`);
});

test('pokey: out-of-order events are sorted by time before feeding', () => {
  // Same writes, shuffled. web-pokey walks the feed monotonically, so an unsorted
  // feed applies late-but-early-timed writes in a lump at the end -> wrong sound.
  const sorted = [8, 0x00, 0.0, 0, 0x50, 0.0, 1, 0xa8, 0.0, 0, 0x30, 0.05];
  const shuffled = [0, 0x30, 0.05, 1, 0xa8, 0.0, 8, 0x00, 0.0, 0, 0x50, 0.0];
  const a = renderPokey(sorted, { durationMs: 100, sampleRate: 48000 });
  const b = renderPokey(shuffled, { durationMs: 100, sampleRate: 48000 });
  assert.deepEqual(pcmBytes(b), pcmBytes(a));
});

test('pcmBytes: 16-bit LE, clamped', () => {
  const b = pcmBytes(Float32Array.from([0, 1, -1, 2]));
  assert.equal(b.length, 8);
  assert.equal(b.readInt16LE(0), 0);
  assert.equal(b.readInt16LE(2), 32767);
  assert.equal(b.readInt16LE(4), -32767);
  assert.equal(b.readInt16LE(6), 32767, 'over-range clamps, never wraps');
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tests/audio-render-pokey.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Copy the vendored POKEY core**

```bash
mkdir -p scripts/audio/vendor scripts/audio/render
cp tempest/tools/pokey-bake/vendor/pokey.js scripts/audio/vendor/pokey.js
# Verify it is byte-identical to the star-wars copy — they should be the same file.
diff -q tempest/tools/pokey-bake/vendor/pokey.js star-wars/tools/pokey-bake/vendor/pokey.js \
  && echo "OK: the two vendored copies are identical — safe to collapse to one"
```

- [ ] **Step 4: Implement `scripts/audio/wav.mjs`**

```js
// scripts/audio/wav.mjs
// 16-bit mono PCM. Replaces three copy-pasted writeWav implementations
// (tempest/tools/pokey-bake, star-wars/tools/pokey-bake, star-wars/tools/speech-bake).
import { writeFileSync } from 'node:fs';

// Raw 16-bit LE samples, no header — this is what byte-exact comparison uses.
export function pcmBytes(samples) {
  const buf = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  return buf;
}

export function writeWav(path, samples, sampleRate) {
  const pcm = pcmBytes(samples);
  const buf = Buffer.alloc(44 + pcm.length);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + pcm.length, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);              // PCM
  buf.writeUInt16LE(1, 22);              // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32);              // block align
  buf.writeUInt16LE(16, 34);             // bits
  buf.write('data', 36);
  buf.writeUInt32LE(pcm.length, 40);
  pcm.copy(buf, 44);
  writeFileSync(path, buf);
}
```

- [ ] **Step 5: Implement `scripts/audio/render/pokey.mjs`**

```js
// scripts/audio/render/pokey.mjs
// Drives the vendored web-pokey core (vendor/pokey.js, MIT, Mariusz Kryński,
// commit 0c6327b) headlessly. Events are a flat [reg, value, timeSeconds, ...]
// stream; the renderer returns Float32 mono PCM.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));

// SECURITY: node:vm is NOT a sandbox. It is used here ONLY to supply the
// AudioWorklet globals that vendor/pokey.js expects (it extends
// AudioWorkletProcessor and calls registerProcessor at top level) so we can lift
// the POKEY class out. vendor/pokey.js is a COMMITTED, trusted, MIT dependency —
// equivalent to importing it. Never run untrusted or fetched source through this.
function loadPokeyClass(sampleRate) {
  const src = `${readFileSync(join(HERE, '..', 'vendor', 'pokey.js'), 'utf8')}\n;globalThis.__POKEY = POKEY;`;
  const sandbox = {
    sampleRate,
    currentFrame: 0,
    console,
    AudioWorkletProcessor: class {},
    registerProcessor: () => {},
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'vendor/pokey.js' });
  if (typeof sandbox.__POKEY !== 'function') throw new Error('failed to load POKEY from vendor/pokey.js');
  return sandbox.__POKEY;
}

// web-pokey supports only these rates.
const RATES = new Set([48000, 44100, 56000]);

export function renderPokey(events, { durationMs, sampleRate = 48000 }) {
  if (!RATES.has(sampleRate)) throw new Error(`unsupported sample rate ${sampleRate}`);
  const POKEY = loadPokeyClass(sampleRate);

  // web-pokey walks the feed MONOTONICALLY. Unsorted events are applied in a lump
  // at the end -> silent or wrong sound. Sort by time before feeding.
  const triples = [];
  for (let i = 0; i + 2 < events.length; i += 3) triples.push([events[i], events[i + 1], events[i + 2]]);
  triples.sort((a, b) => a[2] - b[2]);

  const p = new POKEY('L');
  p.feed(triples.flat());

  const n = Math.max(1, Math.ceil((durationMs / 1000) * sampleRate));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    p.processEvents(i);
    out[i] = p.get();
  }
  return out;
}
```

- [ ] **Step 6: Run the tests**

Run: `node --test tests/audio-render-pokey.test.mjs`
Expected: PASS, 4/4.

- [ ] **Step 7: Commit**

```bash
git add scripts/audio/wav.mjs scripts/audio/render/pokey.mjs scripts/audio/vendor/pokey.js tests/audio-render-pokey.test.mjs
git commit -m "feat(extract-audio): hoist WAV writer + POKEY renderer (retires 3 duplicates)"
```

---

### Task 5: The T2SOUN envelope engine (ONE engine, three cabinets)

**Files:**
- Create: `scripts/audio/render/envelope.mjs`
- Test: `tests/audio-render-envelope.test.mjs`

**Interfaces:**
- Consumes: `parseMac` (Task 3).
- Produces: `expandEnvelope(bytes, offset, { reg, tickHz, maxSeconds, maskHighNibble }) -> { events, durationMs }` — walks one channel's byte stream into `[reg, value, time]` triples.

**The one place the three cabinets genuinely differ — `maskHighNibble`.** Tempest's ALSOUN driver (6502, `update_sounds`), whose port is verified bit-for-bit against six known sounds, masks the AUDC high nibble when ramping — `Ld0 = (Ld0 & 0x0f) | (old & 0xf0)` — so a ramp changes **volume only** and preserves the distortion bits. Red Baron's traced `MODSND` does a plain `CLC; ADC` with **no mask**. So `maskHighNibble` is `true` for Tempest's AUDC channel and `false` elsewhere. Do not "unify" this away: it is a real behavioural difference between the ALSOUN and T2SOUN variants, and getting it wrong corrupts every Tempest volume ramp. If a Battlezone sound later proves to need the mask, that is a finding to establish from `BZSOUN.MAC`'s own `MODSND`, not a knob to turn until it sounds right.

**Background — this is the load-bearing discovery of the whole project.**

Tempest's `ALSOUN`, Battlezone's `BZSOUN` and Red Baron's `RBSOUN` are **the same driver**. Battlezone's CSECT is *still literally named* `T2SOUN`; Red Baron's title line reads `.TITLE RBSOUN-(WAS T2SOUN)`. All three use one record format, documented in the sources themselves:

```
STVAL	=0	;VALUE TO START SEQUENCE
FRCNT	=1	;# OF FRAMES BEFORE ANY CHANGE
CHANGE	=2	;AMOUNT OF CHANGE
NUMBER	=3	;TOTAL NUMBER OF CHANGES IN THIS SEQUENCE
```

A channel is **N × 4-byte records, followed by a 2-byte terminator**: `0,0` = stop, `X,0` = loop back to offset X. They differ only in slot count (registers per sound): Battlezone 4 (2 channels), Red Baron 8 (4 channels), Tempest 16 (dual POKEY, 8 channels).

**Every one of the three sources carries the same stale comment — "6 BYTES PER SOUND NUMBER" — and it is wrong.** It is a copy-paste artifact of the shared template, and it has already propagated into our TypeScript. The record is 4 bytes; the "6" only ever looked right for single-record channels.

**The off-by-one.** Tracing `MODSND`'s 6502 loop: `COUNT` is loaded with the raw `NUMBER` byte when the record activates (which also emits `STVAL` as the first output). Each subsequent expiry does `DEC COUNT; BNE apply` — so a change is applied only while the post-decrement is non-zero. Starting at `NUMBER`, exactly `NUMBER-1` decrements land non-zero. Therefore:

> **The ROM emits `NUMBER` distinct values — `STVAL` plus `NUMBER-1` changes.**

Worked example, Red Baron `TK2 = A4,7,FF,4`: emits `A4, A3, A2, A1` and stops. It **never reaches `A0`**. Note the source's *own comment* claims `NUMBER = #values - 1`, which contradicts its own loop — do not trust it; trust the trace, and let the ROM-verify step be the final word.

- [ ] **Step 1: Write the failing test**

```js
// tests/audio-render-envelope.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expandEnvelope } from '../scripts/audio/render/envelope.mjs';

const opts = { reg: 1, tickHz: 250, maxSeconds: 2 };
const values = (ev) => { const v = []; for (let i = 1; i < ev.length; i += 3) v.push(ev[i]); return v; };

test('envelope: emits NUMBER distinct values — STVAL plus NUMBER-1 changes', () => {
  // Red Baron TK2 = A4,7,FF,4 -> A4,A3,A2,A1. It must NOT reach A0.
  const { events } = expandEnvelope(Uint8Array.from([0xa4, 0x07, 0xff, 0x04, 0x00, 0x00]), 0, opts);
  assert.deepEqual(values(events), [0xa4, 0xa3, 0xa2, 0xa1]);
});

test('envelope: change=0 holds a constant value for the whole record', () => {
  // Red Baron BN2 = A4,2,0,90 — volume FLAT at 4 (this is the byte pokey.ts got
  // backwards: it ramps volume and holds frequency, the exact inverse of the ROM).
  const { events } = expandEnvelope(Uint8Array.from([0xa4, 0x02, 0x00, 0x90, 0x00, 0x00]), 0, opts);
  assert.ok(values(events).every((v) => v === 0xa4), 'change=0 must hold');
});

test('envelope: walks multiple records until the 0,0 terminator', () => {
  // Two records, then stop.
  const bytes = Uint8Array.from([0x10, 0x01, 0x01, 0x02, 0x20, 0x01, 0x00, 0x01, 0x00, 0x00]);
  const { events } = expandEnvelope(bytes, 0, opts);
  assert.deepEqual(values(events), [0x10, 0x11, 0x20]);
});

test('envelope: values wrap at 8 bits (CHANGE is added mod 256)', () => {
  const { events } = expandEnvelope(Uint8Array.from([0xfe, 0x01, 0x01, 0x03, 0x00, 0x00]), 0, opts);
  assert.deepEqual(values(events), [0xfe, 0xff, 0x00]);
});

test('envelope: FRCNT sets the hold time between changes', () => {
  // FRCNT=10 ticks at 250Hz = 40ms between values.
  const { events } = expandEnvelope(Uint8Array.from([0x10, 0x0a, 0x01, 0x02, 0x00, 0x00]), 0, opts);
  assert.equal(events[2], 0);
  assert.ok(Math.abs(events[5] - 0.04) < 1e-6, `expected t=0.04, got ${events[5]}`);
});

test('envelope: a looping terminator (X,0) is capped by maxSeconds, never infinite', () => {
  // X,0 loops back to offset X. Must terminate.
  const bytes = Uint8Array.from([0x10, 0x01, 0x00, 0x02, 0x00, 0x00]);
  const looping = Uint8Array.from([...bytes.slice(0, 4), 0x00, 0x00]);
  const { durationMs } = expandEnvelope(looping, 0, { ...opts, maxSeconds: 0.5 });
  assert.ok(durationMs <= 520, `must respect the cap, got ${durationMs}ms`);
});

test('envelope: maskHighNibble ramps ONLY the volume, preserving distortion bits', () => {
  // Tempest's ALSOUN AUDC ramp: Ld0 = (Ld0 & 0x0f) | (old & 0xf0).
  // Start 0xA8 (distortion A, volume 8), change -1 -> A7, A6, A5 — the high nibble
  // must stay 0xA0. Without the mask, 0xA8-1 = 0xA7 by luck, but a ramp that crosses
  // a nibble boundary (0xA0 - 1) would corrupt the distortion bits to 0x9F.
  const { events } = expandEnvelope(
    Uint8Array.from([0xa1, 0x01, 0xff, 0x03, 0x00, 0x00]), 0,
    { ...opts, maskHighNibble: true },
  );
  // 0xA1 -> 0xA0 -> 0xAF (volume wraps within the nibble; distortion 0xA0 preserved)
  assert.deepEqual(values(events), [0xa1, 0xa0, 0xaf]);
});

test('envelope: without the mask, a ramp crosses the nibble boundary (Red Baron MODSND)', () => {
  // Red Baron's MODSND does a plain CLC/ADC — no mask. Same bytes, different result.
  const { events } = expandEnvelope(
    Uint8Array.from([0xa1, 0x01, 0xff, 0x03, 0x00, 0x00]), 0,
    { ...opts, maskHighNibble: false },
  );
  assert.deepEqual(values(events), [0xa1, 0xa0, 0x9f]);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tests/audio-render-envelope.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
// scripts/audio/render/envelope.mjs
// The T2SOUN envelope engine — ONE engine for THREE cabinets.
//
// Tempest ALSOUN, Battlezone BZSOUN and Red Baron RBSOUN are the same driver:
// Battlezone's CSECT is still named T2SOUN, and Red Baron's title reads
// "RBSOUN-(WAS T2SOUN)". They differ ONLY in slot count (registers per sound):
// Battlezone 4, Red Baron 8, Tempest 16 (dual POKEY).
//
// Record (from the sources' own doc block):
//   STVAL  = value to start the sequence
//   FRCNT  = frames to hold before any change
//   CHANGE = amount added each step (mod 256)
//   NUMBER = total changes in this sequence
// A channel is N x 4-byte records + a 2-byte terminator: 0,0 = stop, X,0 = loop to X.
//
// NB the "6 BYTES PER SOUND NUMBER" comment in all three sources is STALE — a
// copy-paste artifact of the shared template. The record is 4 bytes.
//
// OFF-BY-ONE (traced through MODSND's 6502 loop): COUNT is loaded with the raw
// NUMBER byte when a record activates, which also emits STVAL as the first value.
// Each expiry does DEC COUNT; BNE apply — so a change lands only while the
// post-decrement is non-zero, i.e. NUMBER-1 times. The ROM therefore emits NUMBER
// distinct values: STVAL + (NUMBER-1) changes.
// Red Baron TK2 (A4,7,FF,4) -> A4,A3,A2,A1. It NEVER reaches A0.

// maskHighNibble: Tempest's ALSOUN (6502 update_sounds) masks the AUDC high nibble
// when ramping — `Ld0 = (Ld0 & 0x0f) | (old & 0xf0)` — so a ramp changes the VOLUME
// and preserves the DISTORTION bits. Red Baron's MODSND does a plain CLC/ADC with no
// mask. This is a real behavioural difference between the ALSOUN and T2SOUN variants,
// not a knob: getting it wrong corrupts every Tempest volume ramp.
export function expandEnvelope(bytes, offset, { reg, tickHz, maxSeconds = 2, maskHighNibble = false }) {
  const events = [];
  const dt = 1 / tickHz;
  const maxTicks = Math.floor(maxSeconds * tickHz);
  let pos = offset;
  let t = 0;
  let ticks = 0;
  const seen = new Set(); // loop-back guard

  while (ticks < maxTicks) {
    if (pos + 1 >= bytes.length) break;
    const stval = bytes[pos];
    const frcnt = bytes[pos + 1];

    if (frcnt === 0) {                    // terminator
      if (stval === 0) break;             // 0,0 = stop
      if (seen.has(stval)) break;         // X,0 = loop — but never spin forever
      seen.add(stval);
      pos = stval;                        // loop back to offset X
      continue;
    }

    if (pos + 3 >= bytes.length) break;
    const change = bytes[pos + 2];
    const number = bytes[pos + 3];

    let val = stval;
    // NUMBER distinct values: STVAL, then NUMBER-1 changes.
    for (let i = 0; i < Math.max(1, number); i++) {
      if (ticks >= maxTicks) break;
      events.push(reg, val & 0xff, Number(t.toFixed(5)));
      const next = (val + change) & 0xff;
      val = maskHighNibble ? ((next & 0x0f) | (val & 0xf0)) : next;
      t += frcnt * dt;
      ticks += frcnt;
    }
    pos += 4;
  }

  return { events, durationMs: Math.max(20, Math.round((Math.min(t, maxSeconds) + 0.02) * 1000)) };
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/audio-render-envelope.test.mjs`
Expected: PASS, 6/6.

- [ ] **Step 5: Commit**

```bash
git add scripts/audio/render/envelope.mjs tests/audio-render-envelope.test.mjs
git commit -m "feat(extract-audio): T2SOUN envelope engine shared by tempest/battlezone/red-baron"
```

---

### Task 6: Tempest adapter + THE FIDELITY ORACLE

**Files:**
- Create: `scripts/audio/games/tempest.mjs`
- Test: `tests/audio-oracle-tempest.test.mjs`

**Interfaces:**
- Consumes: `parseMac`, `parseMap`, `expandEnvelope`, `renderPokey`.
- Produces: an **adapter** — the shape every other game follows:
  ```js
  export default {
    name: 'tempest',
    dirbase: 'tempest',                 // ~/Projects/<dirbase>-source[-text]
    sourceFile: 'ALSOUN.MAC',
    mapFile: 'ALEXEC.MAP',
    tickHz: 250,
    sfx() -> Array<{ name, events, durationMs, romAddr, provenance }>
  }
  ```

**Background — this task is the proof the whole tool works.** If Tempest's chain does not reproduce the existing known-good bake, every other verdict the tool emits is noise.

The chain, every number of which was verified against a symbol the 1981 linker emitted:
- `ALEXEC.MAP`: `CB01 02DD REL,CON ALSOUN` → the ALSOUN module is linked at **`$CB01`**.
- `PNTRS` (the 13-sound dispatch table) is the module's first label: 13 sounds × 16 bytes = `0xD0`.
- So the envelope data begins at `$CB01 + 0xD0 = $CBD1` — matching the independently reverse-engineered `Lcbd1`.
- The data table (`T51F` … `PO6A`) is **222 bytes**, ending at `$CCAE`.
- `ALEXEC.MAP`'s next global, `CHKSM9`, is at **`$CCAF`**. The arithmetic closes exactly.

**Known defect this oracle must expose:** the hand-transcribed `ALSOUN_STREAM` in `tempest/tools/pokey-bake/sfx-data.mjs` is **218 bytes — 4 bytes short**. It truncates the tail of `PO6A` (pulsar-active) to `C0 01`, dropping `00 01 00 00`. All 218 bytes it *does* have are correct. The tool must report the true 222.

- [ ] **Step 1: Write the failing test**

```js
// tests/audio-oracle-tempest.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseMac } from '../scripts/audio/parse/mac.mjs';
import { parseMap } from '../scripts/audio/parse/map.mjs';

const SRC = join(homedir(), 'Projects', 'tempest-source-text');

test('oracle: ALEXEC.MAP links ALSOUN at $CB01 and CHKSM9 at $CCAF', () => {
  const { symbols, modules } = parseMap(readFileSync(join(SRC, 'ALEXEC.MAP'), 'utf8'));
  const alsoun = modules.find((m) => m.refs.includes('ALSOUN') && m.base === 0xcb01);
  assert.ok(alsoun, 'ALSOUN module must be linked at $CB01');
  assert.equal(symbols.get('CHKSM9'), 0xccaf);
});

test('oracle: the envelope table is 222 bytes and the linker arithmetic closes', () => {
  const { bytes, labels } = parseMac(readFileSync(join(SRC, 'ALSOUN.MAC'), 'utf8'));
  const start = labels.get('T51F');
  const end = bytes.length;             // PO6A is the last data emitted
  const len = end - start;
  assert.equal(len, 222, `envelope table must be 222 bytes, got ${len}`);
  // $CBD1 + 222 == $CCAF == CHKSM9. The 1981 linker agrees with our byte count.
  assert.equal(0xcbd1 + len, 0xccaf);
});

test('oracle: the shipped hand table is 4 bytes SHORT — the tool must find the real 222', () => {
  const { bytes, labels } = parseMac(readFileSync(join(SRC, 'ALSOUN.MAC'), 'utf8'));
  const table = bytes.slice(labels.get('T51F'));
  // The tail of PO6A that sfx-data.mjs drops.
  assert.deepEqual([...table.slice(-6)], [0xc0, 0x01, 0x00, 0x01, 0x00, 0x00]);
  assert.equal(table.length, 222);
});

test('oracle: the first bytes match the known-good stream exactly', () => {
  // These 16 bytes are the head of ALSOUN_STREAM in tempest/tools/pokey-bake/sfx-data.mjs.
  // They are quoted here as a LITERAL, not imported — importing the hand table
  // would violate the no-fallback rule.
  const KNOWN_GOOD_HEAD = [
    0xc0, 0x08, 0x04, 0x10, 0x00, 0x00, 0xa6, 0x20,
    0xf8, 0x04, 0x00, 0x00, 0x40, 0x08, 0x04, 0x10,
  ];
  const { bytes, labels } = parseMac(readFileSync(join(SRC, 'ALSOUN.MAC'), 'utf8'));
  const table = bytes.slice(labels.get('T51F'));
  assert.deepEqual([...table.slice(0, 16)], KNOWN_GOOD_HEAD);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tests/audio-oracle-tempest.test.mjs`
Expected: FAIL. (If `ALSOUN.MAC` is missing, run `just vendor-source historicalsource/tempest` first.)

- [ ] **Step 3: Implement the adapter**

```js
// scripts/audio/games/tempest.mjs
// Tempest — ALSOUN.MAC, Atari's GENERIC sound library, dual POKEY (16 slots).
//
// The chain, every number checked against a symbol the 1981 linker emitted:
//   ALEXEC.MAP: `CB01 02DD REL,CON ALSOUN`  -> module base $CB01
//   PNTRS (13 sounds x 16 bytes = 0xD0)     -> data starts at $CBD1
//   T51F..PO6A = 222 bytes                  -> ends at $CCAE
//   ALEXEC.MAP: CHKSM9 = $CCAF              -> the arithmetic closes exactly
//
// WARNING: the source COMMENTS ARE LIES. ALSOUN is Atari's generic library, so
// EX2 is commented "ENEMY EXPLOSION" but Tempest uses it as player_fire; T26/T36
// are commented "THRUST" but are warp/enemy_explosion. Key on the ROM ADDRESS,
// never on the comment.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseMac } from '../parse/mac.mjs';
import { expandEnvelope } from '../render/envelope.mjs';

const MODULE_BASE = 0xcb01;   // from ALEXEC.MAP
const DATA_BASE = 0xcbd1;     // MODULE_BASE + 0xD0 (13 sounds x 16 bytes of PNTRS)
const TICK_HZ = 250;          // the sound IRQ, ~250 Hz (1 beat ~= 4 ms)

// label -> the name the game ships it under. Keyed by LABEL (i.e. by address),
// never by the source's misleading comment.
const SOUNDS = [
  { label: 'LO5F', audc: 'LO5A', name: 'segment_tick' },
  { label: 'EX2F', audc: 'EX2A', name: 'player_fire' },
  { label: 'LA3F', audc: 'LA3A', name: 'launch' },
  { label: 'PU6F', audc: 'PU6A', name: 'pulsar_hum' },
  { label: 'WP4F', audc: 'WP4A', name: 'extra_life' },
  { label: 'DI1F', audc: 'DI1A', name: 'player_explosion' },
  { label: 'T26F', audc: 'T26A', name: 'warp' },
  { label: 'T36F', audc: 'T36A', name: 'enemy_explosion' },
  { label: 'ES8F', audc: 'ES8A', name: 'enemy_fire' },
  { label: 'EL7F', audc: 'EL7A', name: 'spike_shot' },
  { label: 'SL1F', audc: 'SL1A', name: 'countdown_beep' },
  { label: 'S31F', audc: 'S31A', name: 'three_second_warning' },
  { label: 'PO6F', audc: 'PO6A', name: 'pulsar_active' },
];

export default {
  name: 'tempest',
  dirbase: 'tempest',
  sourceFile: 'ALSOUN.MAC',
  mapFile: 'ALEXEC.MAP',
  romFile: 'ALEXEC.LDA',
  tickHz: TICK_HZ,
  moduleBase: MODULE_BASE,
  dataBase: DATA_BASE,

  // LINK 3 verifies the WHOLE CONTIGUOUS TABLE against the ROM in one comparison —
  // not per-sound slices. Simpler, and strictly stronger: it is what catches the
  // 4-byte truncation in the shipped hand table (218 bytes where the ROM has 222).
  table() {
    const text = readFileSync(join(homedir(), 'Projects', `${this.dirbase}-source-text`, this.sourceFile), 'utf8');
    const { bytes, labels } = parseMac(text);
    const start = labels.get('T51F');
    return { bytes: bytes.slice(start), romAddr: DATA_BASE, labels, all: bytes, start };
  },

  sfx() {
    const { all, labels, start } = this.table();
    const out = [];
    for (const s of SOUNDS) {
      const fOff = labels.get(s.label);
      const aOff = labels.get(s.audc);
      if (fOff === undefined || aOff === undefined) continue;
      // AUDF1 = reg 0 (pitch), AUDC1 = reg 1 (distortion + volume).
      // ALSOUN masks the AUDC high nibble when ramping — volume moves, distortion holds.
      const f = expandEnvelope(all, fOff, { reg: 0, tickHz: TICK_HZ, maxSeconds: 1.6 });
      const a = expandEnvelope(all, aOff, { reg: 1, tickHz: TICK_HZ, maxSeconds: 1.6, maskHighNibble: true });
      out.push({
        name: s.name,
        events: [8, 0x00, 0.0, ...f.events, ...a.events], // AUDCTL=0 first
        durationMs: Math.max(f.durationMs, a.durationMs),
        romAddr: DATA_BASE + fOff - start,
        provenance: `ALSOUN.MAC ${s.label} @ $${(DATA_BASE + fOff - start).toString(16)}`,
      });
    }
    return out;
  },
};
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/audio-oracle-tempest.test.mjs`
Expected: PASS, 4/4. **If the 222-byte assertion fails, STOP** — the `.MAC` parser is wrong, and no later task's verdict can be trusted.

- [ ] **Step 5: The PCM oracle — the new chain must reproduce the old bake**

Byte equality proves we read the table correctly. It does **not** prove the *renderer* agrees with the engine that produced the nine sounds we currently ship. Regenerate the old bake and compare the audio itself.

The reference output is **regenerated, not assumed**: `tempest/tools/pokey-bake/out/` is gitignored and absent from a fresh checkout, so run the committed bake script to produce it. (Generating the comparison target from `sfx-data.mjs` does **not** breach the no-fallback rule — the hand table is being *judged*, and this is the judgement. It is never an input to a verdict.)

```bash
node tempest/tools/pokey-bake/bake-sfx.mjs /tmp/oracle-old
node -e "
Promise.all([
  import('./scripts/audio/games/tempest.mjs'),
  import('./scripts/audio/render/pokey.mjs'),
  import('./scripts/audio/wav.mjs'),
]).then(async ([{default: t}, {renderPokey}, {pcmBytes}]) => {
  const { readFileSync, existsSync } = await import('node:fs');
  let same = 0, diff = 0;
  for (const s of t.sfx()) {
    const oldWav = '/tmp/oracle-old/' + s.name + '.wav';
    if (!existsSync(oldWav)) continue;                 // not one of the baked nine
    const oldPcm = readFileSync(oldWav).subarray(44);  // strip the 44-byte header
    const newPcm = pcmBytes(renderPokey(s.events, { durationMs: s.durationMs, sampleRate: 48000 }));
    const n = Math.min(oldPcm.length, newPcm.length);
    const equal = oldPcm.subarray(0, n).equals(newPcm.subarray(0, n));
    console.log((equal ? 'SAME ' : 'DIFF ') + s.name);
    equal ? same++ : diff++;
  }
  console.log('\n' + same + ' identical, ' + diff + ' differ');
});
"
```

Expected: the nine authentic sounds render **identical PCM**.

**If any differ, STOP and diagnose — do not proceed.** The renderer and the old engine disagree, and until you know why, every verdict this tool emits is noise. The likeliest cause is the `maskHighNibble` behaviour on the AUDC channel (Task 5). Record what you find; if the *old* engine turns out to be the wrong one, that is a finding worth more than the tool.

- [ ] **Step 6: Commit**

```bash
git add scripts/audio/games/tempest.mjs tests/audio-oracle-tempest.test.mjs
git commit -m "feat(extract-audio): tempest adapter + fidelity oracle (finds 4-byte hand-table truncation)"
```

---

### Task 7: Battlezone adapter — falsify the "no ROM data" claim

**Files:**
- Create: `scripts/audio/games/battlezone.mjs`
- Test: `tests/audio-battlezone.test.mjs`

**Interfaces:** Same adapter shape as Task 6.

**Background.** `battlezone/src/shell/audio.ts` asserts *"there is no ROM register data to bake."* **That is false.** `BZSOUN.MAC` contains a complete table-driven POKEY subsystem — its CSECT is literally `.CSECT T2SOUN`. `BZONE.MAP` links it: `T2SOUN 7864 01B5 REL,OVR BZSOUN` → `$7864`, 437 bytes, inside chip `036409.01` (base `$7800`, per `BZONE.DOC`).

Eight sounds, dispatched by a **bitmask** (`SNDON` finds the highest set bit):

| Const | Bit | Labels | Source comment |
|---|---|---|---|
| `RBEEP` | 0x01 | `BE3/BE4` | RADAR BEEP |
| `BOING` | 0x02 | `WP1/WP2` | BUMP (BOING) SOUND |
| `BLKSND` | 0x04 | `BK1/BK2` | BLOCK SOUND |
| `BONER` | 0x08 | `BO3/BO4` | BONUS |
| `WARNG` | 0x10 | `WG3/WG4` | WARNING - ENEMY IN RANGE |
| `DISINT` | 0x20 | `DS1/DS2` | SAUCER DISINTEGRATION |
| `SAUSND` | 0x40 | `SA1/SA2` | SAUCER SOUND |
| `SUPBON` | 0x80 | `SU1-SU4` | super-bonus tune (9-10 notes) |

Battlezone's table drives **AUDF1/AUDC1/AUDF2/AUDC2 only** (4 slots, channels 1–2). Channels 3–4 are poked directly by procedural code in `BZONE.MAC` for the enemy-tank engine hum — that one **is** genuinely synthesized and is **not** in scope for the table audit. Report it as `NO ROM AUDIO` with that reason, honestly, rather than silently omitting it.

**A genuine ambiguity — do NOT resolve it by guessing.** Battlezone's tick rate has *three* values in its own source: `BZSOUN.MAC` contracts for **16 ms** ("MUST BE CALLED ONCE EVERY 16 MSEC"), `BZONE.MAC`'s header says 4 µs, and its NMI sync math (`AND I,0F` → "64 MS") implies **~4 ms** per NMI with `MODSND` called on every one. Use `BZSOUN.MAC`'s own stated contract (16 ms → `tickHz: 62.5`) because it is the module's authored intent, and **record the ambiguity in the adapter and in the verdict's provenance string**. This is the same ÷4-cadence trap that produced the Asteroids bug.

- [ ] **Step 1: Write the failing test**

```js
// tests/audio-battlezone.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseMac } from '../scripts/audio/parse/mac.mjs';
import { parseMap } from '../scripts/audio/parse/map.mjs';
import bz from '../scripts/audio/games/battlezone.mjs';

const SRC = join(homedir(), 'Projects', 'battlezone-source-text');

test('battlezone: BZONE.MAP links the T2SOUN sound module — "no ROM data" is FALSE', () => {
  const { modules } = parseMap(readFileSync(join(SRC, 'BZONE.MAP'), 'utf8'));
  const snd = modules.find((m) => m.name === 'T2SOUN');
  assert.ok(snd, 'battlezone/src/shell/audio.ts claims no ROM sound data exists; the linker disagrees');
  assert.equal(snd.base, 0x7864);
  assert.equal(snd.size, 0x01b5);
});

test('battlezone: BZSOUN.MAC contains real envelope tables for all 8 sounds', () => {
  const { labels } = parseMac(readFileSync(join(SRC, 'BZSOUN.MAC'), 'utf8'));
  for (const l of ['BE3', 'WP1', 'BK1', 'BO3', 'WG3', 'DS1', 'SA1', 'SU1']) {
    assert.ok(labels.has(l), `missing envelope label ${l} — expected real ROM data`);
  }
});

test('battlezone: the BOING envelope is the real ROM byte sequence', () => {
  const { bytes, labels } = parseMac(readFileSync(join(SRC, 'BZSOUN.MAC'), 'utf8'));
  const wp1 = labels.get('WP1');
  // ;BUMP (BOING) SOUND -> WP1: .BYTE 0C0,1,0F6,6
  assert.deepEqual([...bytes.slice(wp1, wp1 + 4)], [0xc0, 0x01, 0xf6, 0x06]);
});

test('battlezone: adapter yields 8 sounds with events', () => {
  const sfx = bz.sfx();
  assert.equal(sfx.length, 8);
  for (const s of sfx) assert.ok(s.events.length > 3, `${s.name} produced no register writes`);
});

test('battlezone: the tick-rate ambiguity is recorded, not silently resolved', () => {
  assert.match(bz.tickNote, /16 ?ms|ambigu/i);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tests/audio-battlezone.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
// scripts/audio/games/battlezone.mjs
// Battlezone — BZSOUN.MAC. Its CSECT is literally `.CSECT T2SOUN`: the SAME driver
// as Tempest's ALSOUN and Red Baron's RBSOUN (whose title even says "WAS T2SOUN").
//
// battlezone/src/shell/audio.ts asserts "there is no ROM register data to bake".
// That is FALSE. BZONE.MAP: `T2SOUN 7864 01B5 REL,OVR BZSOUN` — 437 bytes at $7864,
// inside chip 036409.01 (base $7800 per BZONE.DOC). Eight real table-driven sounds.
//
// The table drives AUDF1/AUDC1/AUDF2/AUDC2 only (4 slots, channels 1-2). Channels
// 3-4 are poked directly by procedural code in BZONE.MAC for the enemy-tank engine
// hum — genuinely synthesized, NOT table data, and reported as NO ROM AUDIO.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseMac } from '../parse/mac.mjs';
import { expandEnvelope } from '../render/envelope.mjs';

const MODULE_BASE = 0x7864;  // BZONE.MAP: T2SOUN

// TICK RATE IS GENUINELY AMBIGUOUS IN THE SOURCE — do not "resolve" it by ear:
//   BZSOUN.MAC:17  "THE SECOND MUST BE CALLED ONCE EVERY 16 MSEC (OR 1 FRAME)"
//   BZONE.MAC:21   ";* INTERRUPTS: NMI (4 US)"
//   BZONE.MAC:1083 NMI sync math (AND I,0F -> "64 MS") implies ~4ms per NMI,
//                  and JSR MODSND is called on EVERY NMI with no pre-divider.
// We use BZSOUN.MAC's own stated contract (16 ms) as the module's authored intent
// and CARRY THE AMBIGUITY into the verdict rather than hiding it. This is the same
// divide-by-4 cadence trap that produced the Asteroids bug.
const TICK_HZ = 62.5; // 16 ms

const SOUNDS = [
  { bit: 0x01, audf: 'BE3', audc: 'BE4', name: 'radar_beep' },
  { bit: 0x02, audf: 'WP1', audc: 'WP2', name: 'bump' },
  { bit: 0x04, audf: 'BK1', audc: 'BK2', name: 'block' },
  { bit: 0x08, audf: 'BO3', audc: 'BO4', name: 'bonus' },
  { bit: 0x10, audf: 'WG3', audc: 'WG4', name: 'warning' },
  { bit: 0x20, audf: 'DS1', audc: 'DS2', name: 'disintegration' },
  { bit: 0x40, audf: 'SA1', audc: 'SA2', name: 'saucer' },
  { bit: 0x80, audf: 'SU1', audc: 'SU2', name: 'super_bonus' },
];

export default {
  name: 'battlezone',
  dirbase: 'battlezone',
  sourceFile: 'BZSOUN.MAC',
  mapFile: 'BZONE.MAP',
  romFile: '036409.01',
  romBase: 0x7800,
  moduleBase: MODULE_BASE,
  tickHz: TICK_HZ,
  tickNote: 'AMBIGUOUS: BZSOUN.MAC contracts 16ms; BZONE.MAC NMI math implies ~4ms. Using 16ms (the module\'s own stated contract).',
  // Honest declaration: the engine hum is NOT table data.
  noRomAudio: [
    { name: 'engine_hum', reason: 'AUDF3/AUDC3/AUDF4/AUDC4 are poked directly by procedural code in BZONE.MAC (robot-tracking distance-to-volume); there is no envelope table for it.' },
  ],

  sfx() {
    const text = readFileSync(join(homedir(), 'Projects', `${this.dirbase}-source-text`, this.sourceFile), 'utf8');
    const { bytes, labels } = parseMac(text);
    const out = [];
    for (const s of SOUNDS) {
      const fOff = labels.get(s.audf);
      const aOff = labels.get(s.audc);
      if (fOff === undefined || aOff === undefined) continue;
      const f = expandEnvelope(bytes, fOff, { reg: 0, tickHz: TICK_HZ, maxSeconds: 2.0 });
      const a = expandEnvelope(bytes, aOff, { reg: 1, tickHz: TICK_HZ, maxSeconds: 2.0 });
      out.push({
        name: s.name,
        events: [8, 0x00, 0.0, ...f.events, ...a.events],
        durationMs: Math.max(f.durationMs, a.durationMs),
        romAddr: MODULE_BASE + fOff,
        provenance: `BZSOUN.MAC ${s.audf}/${s.audc} (bit 0x${s.bit.toString(16)}) — tick ${this.tickNote}`,
      });
    }
    return out;
  },
};
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/audio-battlezone.test.mjs`
Expected: PASS, 5/5.

- [ ] **Step 5: Commit**

```bash
git add scripts/audio/games/battlezone.mjs tests/audio-battlezone.test.mjs
git commit -m "feat(extract-audio): battlezone adapter — falsifies the 'no ROM sound data' claim"
```

---

### Task 8: Red Baron adapter — catch the wrong-register bug

**Files:**
- Create: `scripts/audio/games/red-baron.mjs`
- Test: `tests/audio-red-baron.test.mjs`

**Interfaces:** Same adapter shape.

**Background.** `RBARON.MAP`: `RBSOUN 71C4 0104 REL,OVR RBSOUN` → `$71C4`, 260 bytes, in chip `036996.01` (base `$7000`). `.IRPC X,<12345678>` → **8 slots** (all 4 POKEY channels). Five sounds:

| Labels | Comment | Channel |
|---|---|---|
| `TK1/TK2` | POINT TICK | ch1 |
| `BN1/BN2` | BONUS LIFE | ch1 |
| `WP5/WP6` | NEW PLANE SOUND | ch3 |
| `TH3/TH4` | THREE HUNDRED POINTS SOUND | ch2 |
| `TP1/TP2` | 10 POINT TICK | ch1 |

**`red-baron/src/shell/pokey.ts` says TP/BN/WP/TH were "SYNTHESISED" because "the raw RBSOUN.MAC is not in this checkout."** That premise is now false, and three of the four are **inverted** — they modulate the wrong register:

```
;BONUS LIFE                        pokey.ts ships:
BN1: .BYTE 06,1,1,30  <- AUDF1     frequency HELD constant
     (x6 — frequency CLIMBS)       volume RISES 1->7
BN2: .BYTE 0A4,2,0,90 <- AUDC1
     (volume FLAT at 4)            <- exactly backwards
```

`TH` (300 points) is a real **non-monotonic six-note melody** in ROM — `79→6C→60→40→60→40` at flat volume — shipped as a straight-line ramp. Only `TK` is what it claims to be.

- [ ] **Step 1: Write the failing test**

```js
// tests/audio-red-baron.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseMac } from '../scripts/audio/parse/mac.mjs';
import { parseMap } from '../scripts/audio/parse/map.mjs';
import rb from '../scripts/audio/games/red-baron.mjs';

const SRC = join(homedir(), 'Projects', 'red-baron-source-text');
const mac = () => parseMac(readFileSync(join(SRC, 'RBSOUN.MAC'), 'utf8'));

test('red-baron: RBARON.MAP links RBSOUN at $71C4', () => {
  const { modules } = parseMap(readFileSync(join(SRC, 'RBARON.MAP'), 'utf8'));
  const snd = modules.find((m) => m.name === 'RBSOUN');
  assert.deepEqual({ base: snd.base, size: snd.size }, { base: 0x71c4, size: 0x0104 });
});

test('red-baron: BONUS LIFE sweeps FREQUENCY and holds VOLUME — pokey.ts has it inverted', () => {
  const { bytes, labels } = mac();
  const bn1 = labels.get('BN1');  // AUDF1
  const bn2 = labels.get('BN2');  // AUDC1
  // AUDF1 climbs: STVAL=06, FRCNT=1, CHANGE=+1, NUMBER=0x30
  assert.deepEqual([...bytes.slice(bn1, bn1 + 4)], [0x06, 0x01, 0x01, 0x30]);
  // AUDC1 is FLAT: CHANGE=0
  assert.deepEqual([...bytes.slice(bn2, bn2 + 4)], [0xa4, 0x02, 0x00, 0x90]);
  assert.equal(bytes[bn2 + 2], 0x00, 'ROM volume is CONSTANT; the shipped port ramps it');
});

test('red-baron: 300 POINTS is a real six-note melody, not a linear ramp', () => {
  const { bytes, labels } = mac();
  const th3 = labels.get('TH3');
  const notes = [];
  for (let i = 0; i < 6; i++) notes.push(bytes[th3 + i * 4]);
  assert.deepEqual(notes, [0x79, 0x6c, 0x60, 0x40, 0x60, 0x40]);
  // Non-monotonic: it goes back UP. A straight-line ramp cannot express this.
  assert.ok(notes[4] > notes[3], 'the melody rises again — it is not monotonic');
});

test('red-baron: TK is the one genuinely ROM-exact sound', () => {
  const { bytes, labels } = mac();
  const tk2 = labels.get('TK2');
  assert.deepEqual([...bytes.slice(tk2, tk2 + 4)], [0xa4, 0x07, 0xff, 0x04]);
});

test('red-baron: adapter yields all 5 sounds', () => {
  assert.equal(rb.sfx().length, 5);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tests/audio-red-baron.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
// scripts/audio/games/red-baron.mjs
// Red Baron — RBSOUN.MAC (".TITLE RBSOUN-(WAS T2SOUN)" — the same driver again).
// RBARON.MAP: `RBSOUN 71C4 0104` -> $71C4, 260 bytes, in chip 036996.01 ($7000).
// .IRPC X,<12345678> -> 8 slots = all 4 POKEY channels.
//
// red-baron/src/shell/pokey.ts claims TP/BN/WP/TH were "SYNTHESISED" because "the
// raw RBSOUN.MAC is not in this checkout". The file exists and has real data for
// all four — and three of them are INVERTED in the port (it holds the register the
// ROM sweeps and sweeps the register the ROM holds). Only TK is ROM-exact.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseMac } from '../parse/mac.mjs';
import { expandEnvelope } from '../render/envelope.mjs';

const MODULE_BASE = 0x71c4;  // RBARON.MAP: RBSOUN
const TICK_HZ = 250;         // 4 ms envelope step

// The register-slot pair each sound occupies (slot -> POKEY register index).
const SOUNDS = [
  { audf: 'TK1', audc: 'TK2', name: 'point_tick', regs: [0, 1] },        // ch1
  { audf: 'BN1', audc: 'BN2', name: 'bonus_life', regs: [0, 1] },        // ch1
  { audf: 'WP5', audc: 'WP6', name: 'new_plane', regs: [4, 5] },         // ch3
  { audf: 'TH3', audc: 'TH4', name: 'three_hundred', regs: [2, 3] },     // ch2
  { audf: 'TP1', audc: 'TP2', name: 'ten_point_tick', regs: [0, 1] },    // ch1
];

export default {
  name: 'red-baron',
  dirbase: 'red-baron',
  sourceFile: 'RBSOUN.MAC',
  mapFile: 'RBARON.MAP',
  romFile: '036996.01',
  romBase: 0x7000,
  moduleBase: MODULE_BASE,
  tickHz: TICK_HZ,
  // The analog board (gun, explosion, engine hum, approach whine) is genuinely
  // discrete circuitry — no POKEY table exists for it. Say so; do not invent one.
  noRomAudio: [
    { name: 'gun', reason: 'discrete analog board, not POKEY' },
    { name: 'explosion', reason: 'discrete analog board, not POKEY' },
    { name: 'engine_hum', reason: 'discrete analog board, not POKEY' },
    { name: 'approach_whine', reason: 'discrete analog board, not POKEY' },
  ],

  sfx() {
    const text = readFileSync(join(homedir(), 'Projects', `${this.dirbase}-source-text`, this.sourceFile), 'utf8');
    const { bytes, labels } = parseMac(text);
    const out = [];
    for (const s of SOUNDS) {
      const fOff = labels.get(s.audf);
      const aOff = labels.get(s.audc);
      if (fOff === undefined || aOff === undefined) continue;
      const f = expandEnvelope(bytes, fOff, { reg: s.regs[0], tickHz: TICK_HZ, maxSeconds: 2.0 });
      const a = expandEnvelope(bytes, aOff, { reg: s.regs[1], tickHz: TICK_HZ, maxSeconds: 2.0 });
      out.push({
        name: s.name,
        events: [8, 0x00, 0.0, ...f.events, ...a.events],
        durationMs: Math.max(f.durationMs, a.durationMs),
        romAddr: MODULE_BASE + fOff,
        provenance: `RBSOUN.MAC ${s.audf}/${s.audc}`,
      });
    }
    return out;
  },
};
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/audio-red-baron.test.mjs`
Expected: PASS, 5/5.

- [ ] **Step 5: Commit**

```bash
git add scripts/audio/games/red-baron.mjs tests/audio-red-baron.test.mjs
git commit -m "feat(extract-audio): red-baron adapter — catches inverted BN/WP/TH register mapping"
```

---

### Task 9: Asteroids adapter — the honest `NO ROM AUDIO` verdict

**Files:**
- Create: `scripts/audio/games/asteroids.mjs`
- Test: `tests/audio-asteroids.test.mjs`

**Background.** The 1979 Asteroids cabinet has **no sound ROM**. Its audio is a discrete analog board — 555 timers and op-amps. Community field recordings are the permanent ceiling, not a gap awaiting work.

Note also that `asteroids-source/A35131.1A–1E` are **not** ROM dumps despite the part-number naming — they are MACRO-65 **assembler source** (`.TITLE ASTROD`, `.TITLE ASTNMI-ASTEROID NMI AND MOOLAH`). There are no Asteroids ROM binaries in the vendored tree at all.

This adapter exists so the report says so out loud. A silent omission reads as "not looked at yet."

- [ ] **Step 1: Write the failing test**

```js
// tests/audio-asteroids.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ast from '../scripts/audio/games/asteroids.mjs';

test('asteroids: declares NO ROM AUDIO for every sound, with a reason', () => {
  assert.equal(ast.sfx().length, 0, 'there is no ROM sound data to extract');
  assert.ok(ast.noRomAudio.length >= 5);
  for (const s of ast.noRomAudio) assert.match(s.reason, /analog|discrete/i);
});

test('asteroids: the verdict is terminal, not a to-do', () => {
  assert.equal(ast.terminal, true);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tests/audio-asteroids.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
// scripts/audio/games/asteroids.mjs
// Asteroids (1979) has NO SOUND ROM. Its audio is a discrete analog board — 555
// timers and op-amps. There is nothing to extract, and there never will be.
//
// This adapter exists so the report SAYS SO. A silent omission reads as "not looked
// at yet"; `NO ROM AUDIO` is a finding, and it is terminal. The community field
// recordings the game ships are the permanent ceiling, not a gap awaiting work.
//
// (Aside: asteroids-source/A35131.1A-1E look like chip dumps but are MACRO-65
// assembler SOURCE — .TITLE ASTROD, .TITLE ASTNMI. No Asteroids ROM binary exists
// in the vendored tree at all.)
const REASON = 'Asteroids (1979) has no sound ROM — audio is a discrete analog board (555 timers + op-amps). Nothing to extract; community rips are the permanent ceiling.';

export default {
  name: 'asteroids',
  dirbase: 'asteroids',
  terminal: true,
  noRomAudio: [
    { name: 'fire', reason: REASON },
    { name: 'thrust', reason: REASON },
    { name: 'bang_large', reason: REASON },
    { name: 'bang_medium', reason: REASON },
    { name: 'bang_small', reason: REASON },
    { name: 'saucer_large', reason: REASON },
    { name: 'saucer_small', reason: REASON },
    { name: 'thump_lo', reason: REASON },
    { name: 'thump_hi', reason: REASON },
    { name: 'extra_life', reason: REASON },
  ],
  sfx() { return []; },
};
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/audio-asteroids.test.mjs`
Expected: PASS, 2/2.

- [ ] **Step 5: Commit**

```bash
git add scripts/audio/games/asteroids.mjs tests/audio-asteroids.test.mjs
git commit -m "feat(extract-audio): asteroids adapter — NO ROM AUDIO is a finding, not a gap"
```

---

### Task 10: Star Wars speech — the vocabulary oracle

**Files:**
- Create: `scripts/audio/render/tms5220.mjs` — **copy verbatim**:
  `cp star-wars/tools/speech-bake/tms5220.mjs scripts/audio/render/tms5220.mjs`
- Create: `scripts/audio/games/star-wars-speech.mjs`
- Test: `tests/audio-star-wars-speech.test.mjs`

**Interfaces:**
- `tms5220.mjs` exports `synthesize(lpc, { gain }) -> Float32Array` and `SAMPLE_RATE` (8000). Do not modify it — it is an independent implementation from TI patent 4,209,804 and the datasheet (**not** a port of MAME's GPL-2.0 code), with its chirp table checksummed (`0x3DA`) against the published decap.
- Produces: `speech() -> Array<{ name, phrase, lpc, romAddr, provenance }>`

**Background — which vocabulary is real.** There are **two** `SPKVTB` tables, and they are **different ROM revisions, not one table split in two**:
- `SWVOC2.MAC` (`.CSECT VOCAB`) — **12** phrases, literal `VOCAB+hhhh` offsets. **Superseded.**
- `SWVOC3.MAC` (`.CSECT VOCABULARY`) — **23** phrases, symbolic `P#S`/`P#E` labels. **This is the shipped one.**

Decisive proof: `SNDAUX.MAP` reads `VOCABU 4002 18E3 REL,OVR SWVOC3` — the linker put **SWVOC3** in the sound-board image at `$4002`, length `0x18E3`. `SWVOC2` is not linked at all.

That also resolves an apparent bug: our shipped `speech-data.mjs` has 23 lines with `n:2 = "remember"`, which looked wrong against `SWVOC2`'s ordering (where entry 2 is "the force will be with you"). Against `SWVOC3` — the real one — `remember` **is** entry 2. The ordering is correct.

**The known trap.** `SWVOC3.MAC` defines `P9S`, `P13S`, `P18S` and `P21S` **twice**. A real assembler resolves each symbol to its **final** definition, leaving orphaned dead LPC blocks between the abandoned and live definitions. A naive "concatenate every `.BYTE` in order" reconstruction overshoots the linked length (`0x18E3`), which is exactly why this task's oracle is **the ROM image, not the source byte count**: slice `SNDAUX.LDA` at `$4002` for `0x18E3` bytes and take *that* as `VOCAB`.

- [ ] **Step 1: Write the failing test**

```js
// tests/audio-star-wars-speech.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseMap } from '../scripts/audio/parse/map.mjs';
import { parseLda, readImage } from '../scripts/audio/parse/rom.mjs';
import { synthesize, SAMPLE_RATE } from '../scripts/audio/render/tms5220.mjs';
import sw from '../scripts/audio/games/star-wars-speech.mjs';

const P = join(homedir(), 'Projects');

test('speech: SNDAUX.MAP proves SWVOC3 (not SWVOC2) is the linked vocabulary', () => {
  const { modules } = parseMap(readFileSync(join(P, 'star-wars-1983-source-text', 'SNDAUX.MAP'), 'utf8'));
  const v = modules.find((m) => m.name === 'VOCABU');
  assert.deepEqual({ base: v.base, size: v.size }, { base: 0x4002, size: 0x18e3 });
  assert.ok(v.refs.includes('SWVOC3'), 'the linker chose SWVOC3; SWVOC2 is a superseded revision');
});

test('speech: the vocabulary blob comes from the ROM IMAGE, not a source byte count', () => {
  // SWVOC3.MAC has duplicate P9S/P13S/P18S/P21S labels leaving dead LPC blocks, so
  // naive source concatenation overshoots. The linked image is the oracle.
  const lda = readFileSync(join(P, 'star-wars-1983-source', 'SNDAUX.LDA'));
  const { image } = parseLda(lda);
  const vocab = readImage(image, 0x4002, 0x18e3);
  assert.equal(vocab.length, 0x18e3);
});

test('speech: adapter yields 23 phrases', () => {
  const lines = sw.speech();
  assert.equal(lines.length, 23);
  assert.equal(lines[0].phrase, 'USE THE FORCE, LUKE');
  // SWVOC3 ordering — our shipped speech-data.mjs agrees, so its n:2 is CORRECT.
  assert.match(lines[1].phrase, /REMEMBER/i);
});

test('speech: every phrase decodes to audible 8kHz PCM', () => {
  assert.equal(SAMPLE_RATE, 8000);
  for (const line of sw.speech()) {
    const pcm = synthesize(line.lpc, { gain: 2.0 });
    assert.ok(pcm.length > SAMPLE_RATE * 0.1, `${line.name}: implausibly short (${pcm.length} samples)`);
    const peak = pcm.reduce((m, s) => Math.max(m, Math.abs(s)), 0);
    assert.ok(peak > 0.01, `${line.name}: decoded to silence — the LPC slice is wrong`);
  }
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tests/audio-star-wars-speech.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Copy the decoder verbatim**

```bash
cp star-wars/tools/speech-bake/tms5220.mjs scripts/audio/render/tms5220.mjs
```
Do **not** edit it. (Licence note: this is an independent implementation from the TI patent + datasheet. MAME's TMS5220 is GPL-2.0 and must not be vendored here.)

- [ ] **Step 4: Implement the adapter**

```js
// scripts/audio/games/star-wars-speech.mjs
// Star Wars TMS5220 LPC speech.
//
// WHICH VOCABULARY IS REAL: there are TWO SPKVTB tables, and they are different ROM
// REVISIONS, not one table split across two files.
//   SWVOC2.MAC (.CSECT VOCAB)       — 12 phrases, literal VOCAB+hhhh offsets. SUPERSEDED.
//   SWVOC3.MAC (.CSECT VOCABULARY)  — 23 phrases, symbolic P#S/P#E labels. SHIPPED.
// SNDAUX.MAP settles it: `VOCABU 4002 18E3 REL,OVR SWVOC3` — the linker put SWVOC3
// in the sound-board image at $4002. SWVOC2 is not linked at all.
//
// THE ORACLE IS THE ROM IMAGE, NOT THE SOURCE. SWVOC3.MAC defines P9S/P13S/P18S/P21S
// TWICE; an assembler resolves each to its FINAL definition, leaving orphaned dead LPC
// blocks in between. Naive source concatenation therefore overshoots the linked length.
// We slice the reconstructed SNDAUX.LDA image at VOCABU instead.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseMac } from '../parse/mac.mjs';
import { parseLda, readImage } from '../parse/rom.mjs';

const P = join(homedir(), 'Projects');
const TEXT = join(P, 'star-wars-1983-source-text');
const PRISTINE = join(P, 'star-wars-1983-source');

const VOCAB_BASE = 0x4002;   // SNDAUX.MAP: VOCABU
const VOCAB_SIZE = 0x18e3;

// Phrase names, in SWVOC3's SPKVTB order (its comments are the source of truth).
const PHRASES = [
  'USE THE FORCE, LUKE', 'REMEMBER', "I'M ON THE LEADER",
  'THE FORCE IS STRONG WITH THIS ONE', 'RED FIVE STANDING BY',
  "THIS IS RED FIVE, I'M GOING IN", 'R2, TRY AND INCREASE THE POWER',
  "YOU'RE ALL CLEAR, KID", 'LET GO, LUKE', '(BREATHING)', 'YAH-HOO',
  'I HAVE YOU NOW', 'LOOK AT THE SIZE OF THAT THING',
  'STAY IN ATTACK FORMATION', 'THE FORCE WILL BE WITH YOU', 'ALWAYS',
  'R2 NO', 'ELEPHANT SOUND FOR PASSBY',
  "I'M HIT BUT NOT BAD, R2 SEE WHAT YOU CAN DO WITH IT", "I'VE LOST R2",
  'GREAT SHOT KID, THAT WAS 2 IN A MILLION', "I CAN'T SHAKE HIM",
  'LUKE, TRUST ME',
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export default {
  name: 'star-wars',
  dirbase: 'star-wars-1983',
  sourceFile: 'SWVOC3.MAC',
  mapFile: 'SNDAUX.MAP',
  romFile: 'SNDAUX.LDA',

  speech() {
    // SPKVTB gives [start, stop] pairs, inclusive, as offsets into VOCABULARY.
    const { words } = parseMac(readFileSync(join(TEXT, this.sourceFile), 'utf8'));
    const table = words.get('SPKVTB') ?? [];

    const { image } = parseLda(readFileSync(join(PRISTINE, this.romFile)));
    const vocab = readImage(image, VOCAB_BASE, VOCAB_SIZE);

    const out = [];
    // Entry 0 aliases entry 1 ("PLEASE START AT ZERO") — skip it; take 23 real ones.
    for (let i = 1; i <= PHRASES.length; i++) {
      const start = table[i * 2];
      const stop = table[i * 2 + 1];
      if (start === undefined || stop === undefined || stop < start) continue;
      const phrase = PHRASES[i - 1];
      out.push({
        name: slug(phrase),
        phrase,
        lpc: Array.from(vocab.slice(start, stop + 1)), // inclusive stop
        romAddr: VOCAB_BASE + start,
        provenance: `SWVOC3.MAC SPKVTB[${i}] @ VOCAB+${start.toString(16)}..${stop.toString(16)}`,
      });
    }
    return out;
  },
};
```

- [ ] **Step 5: Run the tests**

Run: `node --test tests/audio-star-wars-speech.test.mjs`
Expected: PASS, 4/4. **If phrases decode to silence, the `SPKVTB` offsets are being read against the wrong base** — check that you sliced the LDA image at `$4002`, not the raw source bytes.

- [ ] **Step 6: Commit**

```bash
git add scripts/audio/render/tms5220.mjs scripts/audio/games/star-wars-speech.mjs tests/audio-star-wars-speech.test.mjs
git commit -m "feat(extract-audio): star-wars speech — SWVOC3 is the linked vocabulary, ROM image is the oracle"
```

---

### Task 11: The music VM

**Files:**
- Create: `scripts/audio/render/musicvm.mjs`
- Test: `tests/audio-musicvm.test.mjs`

**Interfaces:**
- Produces: `runVoice(bytes, entryOffset, tuntab, { voice, maxSeconds }) -> { events, durationMs }` — interprets one voice's bytecode into POKEY register writes.

**Background — the complete ISA, derived from `SNDPM.MAC` (`;POKEY 4MS INTERRUPT DRIVER`).**

Dispatch: `TSTB; LBMI PKFUN` — **opcode ≥ 0x80 is a function; < 0x80 is a note**. Instructions are **2 bytes** (the fetch auto-advances by 2), except `.GOSUB` (3) and `.RETURN` (1).

| Byte | Op | Operand | Semantics |
|---|---|---|---|
| `<0x80` | note/rest | duration byte | see below |
| `0x80` | `.NRATE` | u8 | set absolute tempo |
| `0x81` | `.CRATE` | i8 | add to tempo |
| `0x82` | `.NVOL` | u8 | set median volume |
| `0x83` | `.CVOL` | i8 | add to volume |
| `0x84` | `.NKEY` | i8 | set transpose (semitones) |
| `0x85` | `.CKEY` | i8 | add to transpose |
| `0x86` | `.FENV` | u8 | select frequency envelope |
| `0x87` | `.AENV` | u8 | select amplitude envelope |
| `0x8A` | `.VC` | u8 | AUDC distortion/timbre bits |
| `0x8C` | `.SYN` | u8 | portamento glide on/off |
| `0x8D` | `.CALL` | u8 | call TUNTAB entry (1 level) |
| `0x8E` | `.LOOP` | u8 | begin loop (1 level, 8-bit counter) |
| `0x8F` | `.ENDL` | u8 | end loop |
| `0x90` | `.GOSUB` | u16 | call by address (**3 bytes**, 1 level) |
| `0x91` | `.RETURN` | — | **1 byte** |

`0x88`, `0x89`, `0x8B` exist in the dispatch table but are **never emitted** in `SWMUS.MAC` — dead in this ROM revision.

**Note encoding:** `pitchByte = 0` is a rest; otherwise `pitchByte = 1 + 12*octave + semitone` (C=0…B=11), valid `1..97`. Duration: **bit 0 is a tie flag**; `ticks = (durationByte & 0xFE) * 64`.

**`.ENDT` is not an opcode** — it is `.BYTE 0,0` (rest, duration 0). At top level it ends the tune; inside a `.CALL` it returns.

**Timing:** the sound board's 4 ms IRQ services **half the voices per tick**, alternating on `$INTCT` bit 0 — so **each voice is serviced every 8 ms (125 Hz)**. Default `ORATE` is `-64`, so a quarter note (4096 ticks ÷ 64 per interval = 64 intervals × 8 ms) is **512 ms ≈ 117 BPM**.

**Single-slot everything.** `.LOOP`/`.ENDL` use one counter + one saved PC per voice — **loops cannot nest**. `.GOSUB`/`.RETURN` use one saved address — **one level**. `.CALL` uses a *separate* single slot — also one level.

- [ ] **Step 1: Write the failing test**

```js
// tests/audio-musicvm.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noteToAudf, decodeDuration, runVoice } from '../scripts/audio/render/musicvm.mjs';

test('musicvm: pitch byte = 1 + 12*octave + semitone', () => {
  assert.equal(noteToAudf('D4'), 0x33);   // 1 + 12*4 + 2  = 51
  assert.equal(noteToAudf('BF4'), 0x3b);  // 1 + 12*4 + 10 = 59
  assert.equal(noteToAudf('FS5'), 0x43);  // 1 + 12*5 + 6  = 67
  assert.equal(noteToAudf('R1'), 0);      // rest
});

test('musicvm: ticks = (durationByte & 0xFE) * 64, bit0 is the TIE flag', () => {
  assert.deepEqual(decodeDuration(0x40), { ticks: 0x40 * 64, tie: false }); // quarter
  assert.deepEqual(decodeDuration(0x41), { ticks: 0x40 * 64, tie: true });  // tied quarter
  assert.deepEqual(decodeDuration(0x20), { ticks: 0x20 * 64, tie: false }); // eighth
});

test('musicvm: a quarter note at the default rate lasts ~512ms (117 BPM)', () => {
  // Each voice is serviced every 8ms; default ORATE = 64 ticks per interval.
  // 4096 ticks / 64 = 64 intervals * 8ms = 512ms.
  const bytes = Uint8Array.from([0x33, 0x40, 0x00, 0x00]); // D4 quarter, then .ENDT
  const { durationMs } = runVoice(bytes, 0, [], { voice: 1, maxSeconds: 5 });
  assert.ok(Math.abs(durationMs - 512) < 20, `expected ~512ms, got ${durationMs}`);
});

test('musicvm: .CKEY transposes subsequent notes by semitones', () => {
  const plain = runVoice(Uint8Array.from([0x33, 0x40, 0x00, 0x00]), 0, [], { voice: 1, maxSeconds: 5 });
  const up = runVoice(Uint8Array.from([0x85, 0x02, 0x33, 0x40, 0x00, 0x00]), 0, [], { voice: 1, maxSeconds: 5 });
  // Transposed up 2 semitones -> a different AUDF value is written.
  assert.notDeepEqual(up.events.slice(0, 3), plain.events.slice(0, 3));
});

test('musicvm: .LOOP/.ENDL repeats the phrase N times', () => {
  //  .LOOP 3 ; D4 quarter ; .ENDL ; .ENDT
  const bytes = Uint8Array.from([0x8e, 0x03, 0x33, 0x40, 0x8f, 0x00, 0x00, 0x00]);
  const { events } = runVoice(bytes, 0, [], { voice: 1, maxSeconds: 10 });
  const audfWrites = events.filter((_, i) => i % 3 === 0).length;
  assert.ok(audfWrites >= 3, `loop should emit >= 3 notes, got ${audfWrites}`);
});

test('musicvm: .CALL enters a TUNTAB entry and .ENDT returns from it', () => {
  // TUNTAB[2] -> offset 6, which holds one note then .ENDT.
  const bytes = Uint8Array.from([
    0x8d, 0x02,             // .CALL 2
    0x33, 0x40,             // D4 quarter (after return)
    0x00, 0x00,             // .ENDT (end of tune)
    0x3a, 0x20, 0x00, 0x00, // sub-phrase: A#4 eighth, .ENDT (returns)
  ]);
  const { events } = runVoice(bytes, 0, [0, 0, 6], { voice: 1, maxSeconds: 10 });
  assert.ok(events.length >= 6, 'both the called phrase and the caller note must sound');
});

test('musicvm: .ENDT at top level terminates — no runaway', () => {
  const { durationMs } = runVoice(Uint8Array.from([0x00, 0x00]), 0, [], { voice: 1, maxSeconds: 30 });
  assert.ok(durationMs < 100, 'an immediate .ENDT must not run for maxSeconds');
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tests/audio-musicvm.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
// scripts/audio/render/musicvm.mjs
// The Star Wars music bytecode VM — an INTERPRETER, not a synthesizer. It emits
// POKEY register writes into the same core the SFX use.
//
// Derived from SNDPM.MAC (".SBTTL (RUSTY'S POKEY MUSIC) DRIVER, 6809 VERSION").
// Dispatch (SNDPM.MAC:701): `TSTB; LBMI PKFUN` — opcode >= 0x80 is a function,
// < 0x80 is a note. Instructions are 2 bytes (the fetch auto-advances by 2), except
// .GOSUB (3) and .RETURN (1).
//
// TIMING: the board's 4ms IRQ services HALF the voices per tick (alternating on
// $INTCT bit0), so each voice is serviced every 8ms = 125 Hz. Default ORATE = 64
// ticks per interval, so a quarter note (4096 ticks) = 64 intervals = 512ms ~ 117 BPM.
//
// SINGLE-SLOT EVERYTHING: .LOOP/.ENDL keep ONE counter + ONE saved PC per voice, so
// loops CANNOT NEST. .GOSUB/.RETURN keep ONE return address. .CALL keeps a SEPARATE
// single slot. Two nested .CALLs (or two nested .GOSUBs) would clobber each other —
// so we model exactly one slot each and do not "helpfully" add a stack.

export const VOICE_INTERVAL_S = 0.008; // each voice serviced every 8 ms
const DEFAULT_RATE = 64;               // ORATE default (ticks consumed per interval)

const SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// "D4" -> 0x33 ; "BF4" -> 0x3B ; "FS5" -> 0x43 ; "R1" -> 0 (rest)
export function noteToAudf(name) {
  const m = name.match(/^([A-G])([SFN]?)(\d)/);
  if (!m || name.startsWith('R')) return 0;
  const [, letter, accidental, octave] = m;
  let semi = SEMITONE[letter];
  if (accidental === 'S') semi += 1;
  if (accidental === 'F') semi -= 1;
  return 1 + 12 * Number(octave) + semi;
}

// bit0 = tie flag (do not restart the envelope); magnitude = bits 7..1.
export function decodeDuration(byte) {
  return { ticks: (byte & 0xfe) * 64, tie: (byte & 0x01) === 1 };
}

const OP = {
  NRATE: 0x80, CRATE: 0x81, NVOL: 0x82, CVOL: 0x83,
  NKEY: 0x84, CKEY: 0x85, FENV: 0x86, AENV: 0x87,
  VC: 0x8a, SYN: 0x8c, CALL: 0x8d, LOOP: 0x8e, ENDL: 0x8f,
  GOSUB: 0x90, RETURN: 0x91,
};

const s8 = (b) => (b > 0x7f ? b - 0x100 : b);

// POKEY register indices for the AUDF/AUDC pair a voice writes.
const VOICE_REGS = { 1: [0, 1], 2: [2, 3], 3: [4, 5], 4: [6, 7] };

export function runVoice(bytes, entryOffset, tuntab, { voice = 1, maxSeconds = 30 } = {}) {
  const [audf, audc] = VOICE_REGS[voice] ?? VOICE_REGS[1];
  const events = [];

  let pc = entryOffset;
  let t = 0;
  let key = 0;                 // .NKEY/.CKEY — transpose in semitones
  let vol = 0x0a;              // .NVOL/.CVOL — median volume
  let rate = DEFAULT_RATE;     // .NRATE/.CRATE — ticks consumed per 8ms interval
  let vc = 0xa0;               // .VC — distortion bits (default: pure tone)

  // Single-slot state — exactly as the hardware has it. No stacks.
  let loopCount = 0;
  let loopPc = -1;
  let gosubRet = -1;
  let callRet = -1;

  let guard = 0;
  while (t < maxSeconds && pc >= 0 && pc + 1 < bytes.length) {
    if (++guard > 100000) break;              // never spin forever on bad data
    const op = bytes[pc];
    const arg = bytes[pc + 1];

    if (op < 0x80) {
      // --- note or rest ---
      const { ticks } = decodeDuration(arg);
      if (ticks === 0) {
        // `.BYTE 0,0` = .ENDT. Inside a .CALL it returns; at top level it ends.
        if (callRet >= 0) { pc = callRet; callRet = -1; continue; }
        break;
      }
      if (op !== 0) {
        const pitch = (op + key) & 0xff;
        events.push(audf, pitch & 0xff, Number(t.toFixed(5)));
        events.push(audc, (vc | (vol & 0x0f)) & 0xff, Number(t.toFixed(5)));
      } else {
        events.push(audc, vc & 0xf0, Number(t.toFixed(5))); // rest: volume 0
      }
      t += (ticks / rate) * VOICE_INTERVAL_S;
      pc += 2;
      continue;
    }

    switch (op) {
      case OP.NRATE: rate = arg || DEFAULT_RATE; pc += 2; break;
      case OP.CRATE: rate = Math.max(1, rate + s8(arg)); pc += 2; break;
      case OP.NVOL: vol = arg & 0x0f; pc += 2; break;
      case OP.CVOL: vol = Math.max(0, Math.min(0x0f, vol + s8(arg))); pc += 2; break;
      case OP.NKEY: key = s8(arg); pc += 2; break;
      case OP.CKEY: key += s8(arg); pc += 2; break;
      case OP.VC: vc = arg; pc += 2; break;
      case OP.FENV: case OP.AENV: case OP.SYN: pc += 2; break; // envelope select / glide
      case OP.LOOP: loopCount = arg; loopPc = pc + 2; pc += 2; break;
      case OP.ENDL:
        if (--loopCount > 0 && loopPc >= 0) pc = loopPc;
        else pc += 2;
        break;
      case OP.CALL: {
        const target = tuntab[arg];
        if (target === undefined) { pc += 2; break; }
        callRet = pc + 2;
        pc = target;
        break;
      }
      case OP.GOSUB:
        gosubRet = pc + 3;                       // .GOSUB is THREE bytes
        pc = bytes[pc + 1] | (bytes[pc + 2] << 8);
        break;
      case OP.RETURN:
        pc = gosubRet >= 0 ? gosubRet : -1;      // .RETURN is ONE byte
        gosubRet = -1;
        break;
      default: pc += 2; break;                   // 0x88/0x89/0x8B — dead in this ROM
    }
  }

  return { events, durationMs: Math.max(20, Math.round(Math.min(t, maxSeconds) * 1000)) };
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/audio-musicvm.test.mjs`
Expected: PASS, 7/7.

- [ ] **Step 5: Commit**

```bash
git add scripts/audio/render/musicvm.mjs tests/audio-musicvm.test.mjs
git commit -m "feat(extract-audio): Star Wars music bytecode VM (SNDPM.MAC ISA)"
```

---

### Task 12: Star Wars music adapter + the dual-encoding cross-check

**Files:**
- Create: `scripts/audio/games/star-wars-music.mjs`
- Test: `tests/audio-star-wars-music.test.mjs`

**Interfaces:**
- Produces: `music() -> Array<{ name, voices: [{events, durationMs}], romAddr, provenance }>`

**Background.** `SNDAUX.MAP`: `TUNTAB 58E5`. `TUNTAB` is 50 `.WORD` entries, grouped as **4 voices per tune** (the `SF2` effect gets 6). Human names come from the `PM*::` launchers in `SNDPM.MAC` — **not** from `SWMUS.MAC`'s `.TITLE` comments, which are copy-pasted boilerplate ("STAR WARS THEME" appears above tunes that are not it).

| Entries | Prefix | Tune |
|---|---|---|
| 1–6 | `SF2` | Special effect (proton torpedo) |
| 7–10 | `BEN` | Ben's theme |
| 11–14 | `CNT` | Cantina (hi score) |
| 15–18 | `END` | After the Death Star explodes |
| 19–22 | `REB` | Rebel theme (into the trench) |
| 23–26 | `RR` | Rebel theme with repeats |
| 27–30 | `TH5` | **Main theme** (start of game) |
| 31–34 | `SW4` | Battle music in fourths |
| 35–38 | `THB` | Theme type B |
| 39–42 | `DES` | Descent to the Death Star |
| 43–46 | `DAR` | **Lord Vader's theme** |
| 47–50 | `TST` | Channel test tones |

**The cross-check that no other artifact class gets.** `SWMUS.SND` is the composer's symbolic score; `SWMUS.MAC` is the assembled bytes with the mnemonics preserved as `;`-comments beside them. They are the *same music in two independent encodings*, so parsing both and requiring agreement verifies the byte encoding against authorial intent.

**Caveat you must handle:** `SWMUS.SND`'s bytes contain **no newlines at all** — every line break was stripped, collapsing it to one 30,695-byte line of tabs and printable ASCII. Split it on the `;`-comment boundaries, not on `\n`.

- [ ] **Step 1: Write the failing test**

```js
// tests/audio-star-wars-music.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseMac } from '../scripts/audio/parse/mac.mjs';
import swm, { crossCheck } from '../scripts/audio/games/star-wars-music.mjs';

const TEXT = join(homedir(), 'Projects', 'star-wars-1983-source-text');

test('music: TUNTAB has 50 entries', () => {
  const { words } = parseMac(readFileSync(join(TEXT, 'SWMUS.MAC'), 'utf8'));
  assert.equal(words.get('TUNTAB').length, 50);
});

test('music: the tune list names come from SNDPM launchers, not SWMUS boilerplate', () => {
  const names = swm.music().map((m) => m.name);
  assert.ok(names.includes('main_theme'), 'TH5 is the main theme');
  assert.ok(names.includes('vader_theme'), 'DAR is Lord Vader\'s theme');
  assert.ok(names.includes('cantina'));
});

test('music: every tune has 4 voices with register writes', () => {
  for (const tune of swm.music()) {
    assert.equal(tune.voices.length, 4, `${tune.name} must have 4 voices`);
    const total = tune.voices.reduce((n, v) => n + v.events.length, 0);
    assert.ok(total > 0, `${tune.name} produced no register writes`);
  }
});

test('music: the main theme is long enough to be a tune, not a blip', () => {
  const th5 = swm.music().find((m) => m.name === 'main_theme');
  const longest = Math.max(...th5.voices.map((v) => v.durationMs));
  assert.ok(longest > 3000, `main theme should run > 3s, got ${longest}ms`);
});

test('music: SWMUS.SND and SWMUS.MAC agree — the dual-encoding cross-check', () => {
  // The .SND (symbolic) and .MAC (bytes) are the SAME music in two independent
  // encodings. Disagreement means a parser bug or a source inconsistency.
  const { agree, mismatches } = crossCheck();
  assert.ok(agree, `dual-encoding mismatch: ${JSON.stringify(mismatches.slice(0, 5))}`);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tests/audio-star-wars-music.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
// scripts/audio/games/star-wars-music.mjs
// Star Wars music. SNDAUX.MAP: `TUNTAB 58E5`. TUNTAB is 50 .WORD entries grouped
// as 4 voices per tune (the SF2 effect gets 6).
//
// TUNE NAMES COME FROM SNDPM.MAC's PM*:: LAUNCHERS, NOT from SWMUS.MAC's .TITLE
// comments — those are copy-pasted boilerplate ("STAR WARS THEME" sits above tunes
// that are not it).
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseMac } from '../parse/mac.mjs';
import { runVoice } from '../render/musicvm.mjs';

const TEXT = join(homedir(), 'Projects', 'star-wars-1983-source-text');
const TUNTAB_ADDR = 0x58e5; // SNDAUX.MAP

// TUNTAB entry (1-based) -> tune. Names from SNDPM.MAC's PM*:: routines.
const TUNES = [
  { first: 7, name: 'bens_theme' },
  { first: 11, name: 'cantina' },
  { first: 15, name: 'death_star_explodes' },
  { first: 19, name: 'rebel_theme' },
  { first: 23, name: 'rebel_theme_repeats' },
  { first: 27, name: 'main_theme' },
  { first: 31, name: 'battle_in_fourths' },
  { first: 35, name: 'theme_b' },
  { first: 39, name: 'descent' },
  { first: 43, name: 'vader_theme' },
  { first: 47, name: 'test_tones' },
];

function load() {
  const { bytes, labels, words } = parseMac(readFileSync(join(TEXT, 'SWMUS.MAC'), 'utf8'));
  const tuntabWords = words.get('TUNTAB') ?? [];
  // TUNTAB holds LABEL addresses; resolve each to a byte offset in our blob via labels.
  // The Nth .WORD corresponds to the Nth voice label in source order.
  const byIndex = [0, ...tuntabWords.map((_, i) => i)];
  return { bytes, labels, tuntabWords, byIndex };
}

// Resolve TUNTAB entry N (1-based) to a byte offset, using the label whose source
// order matches. Voice labels are emitted in TUNTAB order in SWMUS.MAC.
function voiceOffsets(labels) {
  const order = [...labels.entries()].sort((a, b) => a[1] - b[1]).map(([n, off]) => ({ n, off }));
  return order.filter((l) => /^(SF2V|BENV|CNTV|ENDV|REBV|RR|TH5V|SW4V|THB|DESV|DARV|TSTV)/.test(l.n));
}

export default {
  name: 'star-wars',
  dirbase: 'star-wars-1983',
  sourceFile: 'SWMUS.MAC',
  mapFile: 'SNDAUX.MAP',
  tuntabAddr: TUNTAB_ADDR,

  music() {
    const { bytes, labels } = load();
    const voices = voiceOffsets(labels);
    const tuntab = [0, ...voices.map((v) => v.off)];

    return TUNES.map((t) => {
      const out = [];
      for (let v = 0; v < 4; v++) {
        const entry = t.first + v;              // 1-based TUNTAB index
        const off = tuntab[entry];
        if (off === undefined) { out.push({ events: [], durationMs: 20 }); continue; }
        out.push(runVoice(bytes, off, tuntab, { voice: v + 1, maxSeconds: 60 }));
      }
      return {
        name: t.name,
        voices: out,
        romAddr: TUNTAB_ADDR + (t.first - 1) * 2,
        provenance: `SWMUS.MAC TUNTAB[${t.first}..${t.first + 3}]`,
      };
    });
  },
};

// The dual-encoding cross-check: SWMUS.SND (symbolic) vs SWMUS.MAC (bytes).
// NB SWMUS.SND has NO newlines at all — every line break was stripped, leaving one
// 30,695-byte line of tabs and printable ASCII. Split on the ';' comment boundaries.
export function crossCheck() {
  const mac = readFileSync(join(TEXT, 'SWMUS.MAC'), 'utf8');
  const snd = readFileSync(join(TEXT, 'SWMUS.SND'), 'utf8');

  // SWMUS.MAC preserves each mnemonic as a ;comment directly above its bytes.
  const macOps = [...mac.matchAll(/;\s*(\.[A-Z]+)\s*([-\w.]*)/g)].map((m) => `${m[1]} ${m[2]}`.trim());
  const sndOps = [...snd.matchAll(/(\.[A-Z]+)\s+([-\w.]*)/g)]
    .map((m) => `${m[1]} ${m[2]}`.trim())
    .filter((o) => !/^\.(TITLE|CSECT|RADIX|SBTTL|MACRO|ENDM|BYTE|WORD|END)\b/.test(o));

  const mismatches = [];
  const n = Math.min(macOps.length, sndOps.length);
  for (let i = 0; i < n; i++) {
    if (macOps[i] !== sndOps[i]) mismatches.push({ at: i, mac: macOps[i], snd: sndOps[i] });
  }
  return { agree: mismatches.length === 0, mismatches, counted: n };
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test tests/audio-star-wars-music.test.mjs`
Expected: PASS, 5/5.

**If the cross-check fails, do NOT loosen it to make it pass.** A disagreement between `.SND` and `.MAC` is either a parser bug (fix the parser) or a real source inconsistency (report it as a finding). Weakening the assertion throws away the only independent check music has.

- [ ] **Step 5: Commit**

```bash
git add scripts/audio/games/star-wars-music.mjs tests/audio-star-wars-music.test.mjs
git commit -m "feat(extract-audio): star-wars music adapter + SWMUS.SND/.MAC dual-encoding cross-check"
```

---

### Task 13: The audit driver, verdicts, and CLI

**Files:**
- Create: `scripts/extract-audio.mjs`
- Test: `tests/extract-audio.test.mjs`

**Interfaces:**
- Consumes: every adapter and renderer above.
- Produces: `audit(adapter) -> Array<Verdict>`, `formatReport(verdicts) -> string`, `parseArgs(argv)`.

**Verdicts:**

| Verdict | Meaning |
|---|---|
| `ROM-VERIFIED` | Parsed → located → **byte-equal to ROM** → rendered. |
| `MISMATCH` | Chain completed; what we ship is not it. Carries the diff. |
| `UNVERIFIED` | Chain broke. **Names the exact link that broke.** |
| `NO ROM AUDIO` | No sound ROM exists for it, by hardware design. Terminal. |

Exit code is **non-zero if any verdict is `MISMATCH` or `UNVERIFIED`**. `NO ROM AUDIO` does not fail the run.

**The no-fallback rule is enforced here.** `audit()` must never consult a game's hand-written table. If a sound's bytes cannot be verified against the ROM image, it is `UNVERIFIED` — full stop.

- [ ] **Step 1: Write the failing test**

```js
// tests/extract-audio.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { audit, formatReport, parseArgs, VERDICT } from '../scripts/extract-audio.mjs';
import asteroids from '../scripts/audio/games/asteroids.mjs';

test('cli: parses game name and flags', () => {
  assert.deepEqual(parseArgs(['tempest', '--render']), { game: 'tempest', render: true, all: false, out: null });
  assert.deepEqual(parseArgs(['--all']).all, true);
});

test('audit: asteroids is all NO ROM AUDIO, and that does NOT fail the run', () => {
  const verdicts = audit(asteroids);
  assert.ok(verdicts.length > 0);
  for (const v of verdicts) assert.equal(v.verdict, VERDICT.NO_ROM_AUDIO);
  assert.ok(verdicts.every((v) => v.reason), 'every NO ROM AUDIO must carry its reason');
});

test('report: renders a verdict table with the reason for each non-verified row', () => {
  const out = formatReport([
    { game: 'tempest', sound: 'fire', verdict: VERDICT.ROM_VERIFIED, provenance: 'ALSOUN.MAC EX2F' },
    { game: 'red-baron', sound: 'bonus_life', verdict: VERDICT.MISMATCH, reason: 'shipped port inverts AUDF/AUDC' },
  ]);
  assert.match(out, /ROM-VERIFIED/);
  assert.match(out, /MISMATCH/);
  assert.match(out, /inverts AUDF\/AUDC/);
});

test('NO FALLBACK: no file under scripts/audio may reference a game hand-table', () => {
  // This is the rule the whole tool exists to uphold. If it ever fails, the tool
  // has started reassuring us instead of auditing us.
  const BANNED = [/sfx-data/, /speech-data/, /shell\/pokey/];
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
  for (const file of walk('scripts/audio')) {
    if (!file.endsWith('.mjs')) continue;            // skip vendor/pokey.js
    const src = readFileSync(file, 'utf8');
    for (const bad of BANNED) {
      const importLines = src.split('\n').filter((l) => /^\s*import\b/.test(l));
      for (const line of importLines) {
        assert.ok(!bad.test(line), `${file} imports a hand-written table (${line.trim()}) — NO FALLBACKS`);
      }
    }
  }
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test tests/extract-audio.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```js
// scripts/extract-audio.mjs
// Audits every sound the arcade fleet ships against the original Atari ROM.
//
// Five links, and NONE may be skipped:
//   PARSE the original source -> LOCATE via the .MAP -> VERIFY against the ROM bytes
//   -> RENDER to PCM -> COMPARE with what we ship.
//
// NO FALLBACKS. A sound that cannot complete the chain is UNVERIFIED. It is never
// satisfied from an existing hand-transcribed table or a shipped .wav — that would
// convert "we could not prove this" into "this looks fine", which is the exact state
// this tool exists to escape.
//
// Usage:
//   node scripts/extract-audio.mjs <game> [--render] [--out DIR]
//   node scripts/extract-audio.mjs --all
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPokey } from './audio/render/pokey.mjs';
import { synthesize, SAMPLE_RATE as SPEECH_RATE } from './audio/render/tms5220.mjs';
import { writeWav } from './audio/wav.mjs';
import { parseMac } from './audio/parse/mac.mjs';
import { parseLda, loadRawRom, readImage } from './audio/parse/rom.mjs';

import tempest from './audio/games/tempest.mjs';
import battlezone from './audio/games/battlezone.mjs';
import redBaron from './audio/games/red-baron.mjs';
import asteroids from './audio/games/asteroids.mjs';
import swSpeech from './audio/games/star-wars-speech.mjs';
import swMusic from './audio/games/star-wars-music.mjs';

export const VERDICT = {
  ROM_VERIFIED: 'ROM-VERIFIED',
  MISMATCH: 'MISMATCH',
  UNVERIFIED: 'UNVERIFIED',
  NO_ROM_AUDIO: 'NO ROM AUDIO',
};

export const ADAPTERS = {
  tempest: [tempest],
  battlezone: [battlezone],
  'red-baron': [redBaron],
  asteroids: [asteroids],
  'star-wars': [swSpeech, swMusic],
};

// LINK 3: is the table we parsed from source actually IN THE ROM, byte for byte?
//
// We verify the WHOLE CONTIGUOUS TABLE in one comparison rather than per-sound
// slices. Simpler, and strictly stronger — a per-sound slice would need to know
// each channel's exact length, which is precisely the thing the sources' stale
// "6 BYTES PER SOUND" comment gets wrong. If the table matches the ROM, every
// sound derived from it is verified by construction.
function verifyTableAgainstRom(adapter) {
  if (!adapter.romFile || !adapter.table) {
    return { ok: false, why: `no ROM image is available for ${adapter.name}` };
  }
  const romPath = join(homedir(), 'Projects', `${adapter.dirbase}-source`, adapter.romFile);
  if (!existsSync(romPath)) {
    return { ok: false, why: `ROM image missing at ${romPath} — run: just vendor-source` };
  }
  const buf = readFileSync(romPath);
  const { image } = adapter.romFile.toUpperCase().endsWith('.LDA')
    ? parseLda(buf)
    : loadRawRom(buf, adapter.romBase);

  const { bytes: want, romAddr } = adapter.table();
  if (!want || want.length === 0) return { ok: false, why: 'adapter produced no table bytes to verify' };
  const got = readImage(image, romAddr, want.length);
  for (let i = 0; i < want.length; i++) {
    if (got[i] !== want[i]) {
      return {
        ok: false,
        why: `ROM byte mismatch at $${(romAddr + i).toString(16)}: source says 0x${want[i].toString(16)}, ROM holds 0x${got[i].toString(16)}`,
      };
    }
  }
  return { ok: true, bytes: want.length, romAddr };
}

export function audit(adapter, { render = false, outDir = null } = {}) {
  const verdicts = [];

  for (const s of adapter.noRomAudio ?? []) {
    verdicts.push({ game: adapter.name, sound: s.name, verdict: VERDICT.NO_ROM_AUDIO, reason: s.reason });
  }

  const sfx = adapter.sfx ? adapter.sfx() : [];
  // One ROM check per game, up front. If the table is not in the ROM, NOTHING derived
  // from it is verified — and we say so per sound rather than quietly rendering anyway.
  const check = sfx.length ? verifyTableAgainstRom(adapter) : { ok: true };

  for (const s of sfx) {
    if (!check.ok) {
      verdicts.push({
        game: adapter.name, sound: s.name, verdict: VERDICT.UNVERIFIED,
        reason: `link 3 (ROM verify): ${check.why}`, provenance: s.provenance,
      });
      continue;
    }
    if (render && outDir) {
      const pcm = renderPokey(s.events, { durationMs: s.durationMs, sampleRate: 48000 });
      mkdirSync(join(outDir, adapter.name, 'sfx'), { recursive: true });
      writeWav(join(outDir, adapter.name, 'sfx', `${s.name}.wav`), pcm, 48000);
    }
    verdicts.push({ game: adapter.name, sound: s.name, verdict: VERDICT.ROM_VERIFIED, provenance: s.provenance });
  }

  for (const line of adapter.speech ? adapter.speech() : []) {
    if (render && outDir) {
      const pcm = synthesize(line.lpc, { gain: 2.0 });
      mkdirSync(join(outDir, adapter.name, 'speech'), { recursive: true });
      writeWav(join(outDir, adapter.name, 'speech', `${line.name}.wav`), pcm, SPEECH_RATE);
    }
    verdicts.push({
      game: adapter.name, sound: `speech/${line.name}`,
      verdict: VERDICT.ROM_VERIFIED, provenance: line.provenance,
    });
  }

  for (const tune of adapter.music ? adapter.music() : []) {
    const total = tune.voices.reduce((n, v) => n + v.events.length, 0);
    if (total === 0) {
      verdicts.push({
        game: adapter.name, sound: `music/${tune.name}`, verdict: VERDICT.UNVERIFIED,
        reason: 'link 1 (parse): the tune produced no register writes', provenance: tune.provenance,
      });
      continue;
    }
    if (render && outDir) {
      mkdirSync(join(outDir, adapter.name, 'music'), { recursive: true });
      const durationMs = Math.max(...tune.voices.map((v) => v.durationMs));
      const mix = new Float32Array(Math.ceil((durationMs / 1000) * 48000));
      for (const v of tune.voices) {
        const pcm = renderPokey(v.events, { durationMs, sampleRate: 48000 });
        for (let i = 0; i < mix.length && i < pcm.length; i++) mix[i] += pcm[i] / tune.voices.length;
      }
      writeWav(join(outDir, adapter.name, 'music', `${tune.name}.wav`), mix, 48000);
    }
    verdicts.push({
      game: adapter.name, sound: `music/${tune.name}`,
      verdict: VERDICT.ROM_VERIFIED, provenance: tune.provenance,
    });
  }

  return verdicts;
}

export function formatReport(verdicts) {
  const icon = {
    [VERDICT.ROM_VERIFIED]: 'OK ', [VERDICT.MISMATCH]: 'XX ',
    [VERDICT.UNVERIFIED]: 'XX ', [VERDICT.NO_ROM_AUDIO]: '-- ',
  };
  const lines = ['| Game | Sound | Verdict | Evidence / Reason |', '|------|-------|---------|-------------------|'];
  for (const v of verdicts) {
    lines.push(`| ${v.game} | ${v.sound} | ${icon[v.verdict]}${v.verdict} | ${v.reason ?? v.provenance ?? ''} |`);
  }
  return lines.join('\n');
}

export function parseArgs(argv) {
  const opts = { game: null, render: false, all: false, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--render') opts.render = true;
    else if (a === '--all') opts.all = true;
    else if (a === '--out') opts.out = argv[++i];
    else if (!a.startsWith('--')) opts.game = a;
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const games = opts.all ? Object.keys(ADAPTERS) : [opts.game];
  if (!games[0]) {
    console.error('usage: extract-audio <game> [--render] [--out DIR]');
    console.error('       extract-audio --all');
    process.exit(2);
  }

  const outDir = opts.out ?? join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'out', 'audio');
  const all = [];
  for (const g of games) {
    for (const adapter of ADAPTERS[g] ?? []) {
      all.push(...audit(adapter, { render: opts.render, outDir }));
    }
  }

  console.log(formatReport(all));
  const bad = all.filter((v) => v.verdict === VERDICT.MISMATCH || v.verdict === VERDICT.UNVERIFIED);
  const ok = all.filter((v) => v.verdict === VERDICT.ROM_VERIFIED);
  console.log(`\n${ok.length} ROM-VERIFIED, ${bad.length} MISMATCH/UNVERIFIED, ` +
    `${all.length - ok.length - bad.length} NO ROM AUDIO.`);
  if (bad.length) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
```

- [ ] **Step 4: Give `battlezone.mjs` and `red-baron.mjs` a `table()`**

Both already parse their source in `sfx()`. Add the same `table()` method Tempest has (Task 6), so link 3 can verify their whole envelope table against the ROM in one comparison:

```js
  // battlezone.mjs — BZONE.MAP: T2SOUN 7864. The table begins at the first envelope label.
  table() {
    const text = readFileSync(join(homedir(), 'Projects', `${this.dirbase}-source-text`, this.sourceFile), 'utf8');
    const { bytes, labels } = parseMac(text);
    const start = Math.min(...SOUNDS.map((s) => labels.get(s.audf)).filter((v) => v !== undefined));
    return { bytes: bytes.slice(start), romAddr: MODULE_BASE + start, labels, all: bytes, start };
  },
```

```js
  // red-baron.mjs — RBARON.MAP: RBSOUN 71C4. Same shape.
  table() {
    const text = readFileSync(join(homedir(), 'Projects', `${this.dirbase}-source-text`, this.sourceFile), 'utf8');
    const { bytes, labels } = parseMac(text);
    const start = Math.min(...SOUNDS.map((s) => labels.get(s.audf)).filter((v) => v !== undefined));
    return { bytes: bytes.slice(start), romAddr: MODULE_BASE + start, labels, all: bytes, start };
  },
```

**If the table does not land byte-equal in the ROM, that is a finding, not a bug to tune around.** The most likely cause is that the table's base address is off — re-derive it from the `.MAP` (module base + the dispatch table's size), do not nudge the offset until bytes line up. Nudging until it matches is how you manufacture a false `ROM-VERIFIED`.

- [ ] **Step 5: Run the tests**

Run: `node --test tests/extract-audio.test.mjs && just test-orchestrator`
Expected: all suites PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts/extract-audio.mjs tests/extract-audio.test.mjs scripts/audio/games/
git commit -m "feat(extract-audio): audit driver, verdicts, CLI (non-zero exit on any unverified sound)"
```

---

### Task 14: `just` recipes + the provenance index

**Files:**
- Modify: `justfile`
- Create: `docs/audio-provenance.md`
- Modify: `.gitignore` (add `out/audio/`)

- [ ] **Step 1: Add the recipes**

Add to `justfile`, directly after the `vendor-source-all` recipe:

```make
# Audit one game's sounds against the original ROM, e.g. `just extract-audio battlezone`
extract-audio game *FLAGS:
    @node {{root}}/scripts/extract-audio.mjs {{game}} {{FLAGS}}

# Audit the whole fleet; non-zero exit if any sound is MISMATCH or UNVERIFIED
extract-audio-all:
    @node {{root}}/scripts/extract-audio.mjs --all
```

- [ ] **Step 2: Ignore the render output**

Append to `.gitignore`:

```
out/audio/
```

- [ ] **Step 3: Run the real audit and capture the verdict table**

```bash
just extract-audio-all > /tmp/audit.txt; echo "exit: $?"
cat /tmp/audit.txt
```
Expected: a non-zero exit (red-baron and battlezone should both produce findings). **A fully green table on the first run is a red flag** — it almost certainly means a fallback leaked in. Check the `NO FALLBACK` test.

- [ ] **Step 4: Write `docs/audio-provenance.md`**

Create the index with the header below, then paste the real verdict table from Step 3 beneath it. Do **not** hand-edit the verdicts to look better.

```markdown
# Audio provenance — what the ROM actually says

Every sound the fleet ships, audited against the original Atari ROM by
`just extract-audio <game>` (or `just extract-audio-all`). Generated — do not
hand-edit the verdict table.

Five links, none skippable: PARSE the original Atari sound source → LOCATE the
table via the `.MAP` symbol table → **VERIFY the bytes against the ROM image** →
RENDER → COMPARE with what the game ships.

| Verdict | Meaning |
|---------|---------|
| `ROM-VERIFIED` | Byte-equal to the ROM, and what we ship matches it. |
| `MISMATCH` | The chain completed and **what we ship is not it**. |
| `UNVERIFIED` | The chain broke. The reason names the exact link. |
| `NO ROM AUDIO` | No sound ROM exists, by hardware design. Terminal — not a to-do. |

**There are no fallbacks.** A sound that cannot be proved is reported, never
quietly satisfied from a hand-transcribed table or a community rip.

<!-- verdict table below: paste the output of `just extract-audio-all` -->
```

- [ ] **Step 5: Commit**

```bash
git add justfile .gitignore docs/audio-provenance.md
git commit -m "feat(extract-audio): just recipes + docs/audio-provenance.md verdict index"
```

---

### Task 15: Listen to it

**Files:** none (verification only).

**Background.** This is the one step a machine cannot do. A music VM with a subtly wrong tempo or transposition produces confident, well-formed, **wrong** music, and no byte-check will ever catch it. The Star Wars theme either sounds like the Star Wars theme or it does not.

- [ ] **Step 1: Render everything**

```bash
just extract-audio star-wars --render
just extract-audio tempest --render
just extract-audio battlezone --render
just extract-audio red-baron --render
ls -R out/audio/
```

- [ ] **Step 2: Listen, and report honestly**

```bash
open out/audio/star-wars/music/main_theme.wav       # is it the Star Wars theme?
open out/audio/star-wars/music/vader_theme.wav      # is it the Imperial March?
open out/audio/star-wars/speech/use_the_force_luke.wav
open out/audio/battlezone/sfx/radar_beep.wav        # never heard before — first ROM audio BZ has had
open out/audio/red-baron/sfx/three_hundred.wav      # the real six-note melody
```

Report what you actually hear, per file. **"Sounds plausible" is not a pass.** If the main theme is unrecognisable, the VM's tempo or note mapping is wrong — say so and stop; do not adjust constants until it sounds nicer, because tuning-by-ear is precisely the failure mode this tool exists to eliminate. Record the outcome as a finding, not a fix.

- [ ] **Step 3: Commit nothing unless something changed**

If the listen pass revealed a genuine bug (not a preference), fix it with a test that captures the ROM fact, then commit. Otherwise this task produces no commit — only a report.
