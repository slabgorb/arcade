# ROM Model Contact Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parse the original Atari `WSOBJ.MAC` source into authentic vertices + edges, and show them side-by-side against Star Wars' shipped (hand-guessed) wireframes, producing a punch-list of what's wrong.

**Architecture:** A radix-aware MACRO-11 parser at the orchestrator root reads the vendored source (`~/Projects/*-source-text`), emits a `VectorPicture` IR (points + ordered pen strokes), and bakes a committed TypeScript artifact into `star-wars/src/tools/`. The existing contact sheet gains a compare mode. A **red-baron oracle test gates the parser** before any star-wars output is trusted.

**Tech Stack:** Node ≥20 ESM (`.mjs`), `node:test` + `node:assert/strict` (orchestrator), TypeScript/Vite/Vitest (star-wars), `just` recipes.

## Global Constraints

- Orchestrator tests run via `node --test 'tests/**/*.test.mjs'` — plain `node:test`, no vitest, no transpiler. Test files are `.mjs`.
- Scripts export pure functions for unit testing and run `main()` only when invoked directly — mirror `scripts/vendor-source.mjs:273-275`.
- The orchestrator repo is **trunk-based on `main`**. Commit straight to `main`. Use `git -C /Users/slabgorb/Projects/a-1` for every git call — the pf branch-protection hook judges the repo from the *shell's* cwd, so a stray `cd` into a game subrepo makes commits fail with a misleading "protected branch 'develop'" error.
- The generated artifact goes in `star-wars/src/tools/`, **never `src/core/`** — `core/` is the deterministic pure sim and must not gain dev-tool data.
- Vendored source is machine-local at `~/Projects/star-wars-1983-source-text/` and `~/Projects/red-baron-source-text/` (see `docs/reference-sources.md`). It is in **no repo**. Never `import` it from browser code; only the bake script reads it.
- Never edit `star-wars/src/core/models.ts` in this plan. The tool **reports**; fixing the models is a follow-up story.

## Deviations from the spec

Two, both logged deliberately:

1. **Battlezone oracle dropped.** The spec proposed battlezone as a second oracle validating a *byte decoder*. But battlezone's objects use a different macro family (`TVCTR`/`TLABS`/`OBJEND`) with no vertex tables in `BZONE.MAC`; its port was byte-decoded from a ROM image at `~/Downloads/va-battlezone/` (unvendored, machine-specific). Star-wars needs only the **macro** parser, so a byte decoder would exist solely to test itself — circular. red-baron alone exercises every mechanism star-wars depends on (radix tracking, pen semantics, vertex parsing, index handling). Battlezone stays a future option.
2. **No generic "dialect table."** The spec sketched one parser driven by a macro→emitter table. star-wars is directive-structured (`.WP`/`.WL`) and red-baron is label-structured (`DB.PLN:`/`DB.MAP:`); forcing them into one scanner is a fake abstraction. They are two small parsers sharing a tested radix/number core and one IR.

## Findings that drive the code

Verified against the vendored source, not assumed:

- `WSOBJ.MAC:2` does `.INCLUDE WSCOMN`; `WSCOMN.MAC:5` is `.RADIX 16`. **The file assembles in hex.** `WSOBJ.MAC` itself contains no `.RADIX`, so the parser must be *told* the initial radix is 16.
- Two vertex macros differ only in decimal-forcing: `.P` → `.WORD .1'.*.S` (the `'.` appends a decimal point → **decimal**); `.PH` → `.WORD .1'*.S` (no point → **current radix = hex**). `.PH` = "Point, **Hex**".
- `.LD a,b,c` → `.BYTE a*4` each = draw. `.BD a,b,c` → `.BYTE a*4+1` (pen **up**, first arg only) then delegates the rest to `.LD` (draw). So `.BD` starts a new stroke.
- `.WL2 NAME` **aliases the previous `.WL` list** — `TW3`, `BK1`, `BK2`, `BK3`, `WG1` all share `TW1`'s draw list.
- The `.P 0,0,0` anchor is **conditional**. `TIE` has one (53 `.P` → 52 verts, draw list 1-based). `WFF` has none (its comments index from 0). Drop-and-rebase only when index 0 is `[0,0,0]`.
- `PORT`, `WPN`, `WFF` have vertex tables but **no `.WL` draw list** — drawn procedurally elsewhere. They yield a *vertex* correction (hex!), not an edge diff.
- `RBARON.MAC` flips radix mid-file: `.RADIX 16` (L74) → **`.RADIX 10` (L6217)** → `.RADIX 16` (L6281). The plane points sit inside the decimal fence. **A parser that ignores `.RADIX` fails the oracle immediately** — that is the whole point of the oracle.
- red-baron's `DB.PLN` table is **label-bounded, not radix-bounded**: 50 `POINTP` lines sit in the decimal region, but only 42 are the plane (the other 8 are `BLCOLL:`). `P.BACK:` is a label *on* a `POINTP` line.

## File Structure

| File | Responsibility |
|---|---|
| `scripts/rom-models/source.mjs` | MACRO-11 lexical core: comment stripping, radix-aware number parsing. No game knowledge. |
| `scripts/rom-models/derive.mjs` | IR → geometry: connect-list → edges; edge diffing. No parsing. |
| `scripts/rom-models/redbaron.mjs` | red-baron parser (`POINTP` / `BLANKV` / `VSBLEV`). Oracle input only. |
| `scripts/rom-models/portdata.mjs` | Extracts ground-truth literals from `.ts` source **text** (a `.mjs` test cannot import `.ts`). |
| `scripts/rom-models/wsobj.mjs` | star-wars parser (`.WP`/`.P`/`.PH`/`.WL`/`.LD`/`.BD`). |
| `scripts/bake-models.mjs` | CLI: parse → emit `romModels.generated.ts`. |
| `tests/rom-models/*.test.mjs` | Unit tests + **the red-baron oracle**. |
| `star-wars/src/tools/romModels.generated.ts` | Committed artifact (generated). |
| `star-wars/src/tools/contactSheet.ts` | Gains compare mode. |

---

### Task 1: MACRO-11 lexical core (radix + numbers)

This is where the silent-corruption bug lives. `parseInt('18', 8)` returns `1` — it truncates at the first invalid digit instead of failing. A parser built on bare `parseInt` would decode invalid-radix numbers into plausible wrong values. We reject them loudly.

**Files:**
- Create: `scripts/rom-models/source.mjs`
- Test: `tests/rom-models/source.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `stripComment(line) -> string`, `parseNum(token, radix) -> number`, `readRadixDirective(line) -> number|null`.

- [ ] **Step 1: Write the failing test**

Create `tests/rom-models/source.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripComment, parseNum, readRadixDirective } from '../../scripts/rom-models/source.mjs';

test('stripComment: removes ; to end of line, keeps code', () => {
  assert.equal(stripComment('\t.P -10,-16,18\t\t;LEFT OUTER FIN').trim(), '.P -10,-16,18');
  assert.equal(stripComment(';whole line').trim(), '');
  assert.equal(stripComment('\tPOINTP 0,0,40').trim(), 'POINTP 0,0,40');
});

test('parseNum: bare token uses the CURRENT radix', () => {
  assert.equal(parseNum('18', 16), 24);   // 0x18
  assert.equal(parseNum('18', 10), 18);
  assert.equal(parseNum('20', 16), 32);   // 0x20  — the .PH trap
});

test('parseNum: a trailing dot forces decimal regardless of radix', () => {
  assert.equal(parseNum('18.', 16), 18);
  assert.equal(parseNum('13.', 16), 13);  // .S=13. under .RADIX 16
});

test('parseNum: signs are preserved', () => {
  assert.equal(parseNum('-20', 16), -32);
  assert.equal(parseNum('-20.', 16), -20);
  assert.equal(parseNum('+8', 16), 8);
});

// The bug this guard exists to prevent: parseInt('18', 8) === 1 (silent truncation).
test('parseNum: throws on a digit invalid in the current radix', () => {
  assert.throws(() => parseNum('18', 8), /invalid in base 8/);
  assert.throws(() => parseNum('1F', 10), /invalid in base 10/);
  assert.throws(() => parseNum('', 16), /not a number/);
});

test('readRadixDirective: recognises .RADIX, always decimal, else null', () => {
  assert.equal(readRadixDirective('\t.RADIX 16'), 16);
  assert.equal(readRadixDirective('\t.RADIX 10'), 10);
  assert.equal(readRadixDirective('\t.P 1,2,3'), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/rom-models/source.test.mjs`
Expected: FAIL — `Cannot find module '.../scripts/rom-models/source.mjs'`

- [ ] **Step 3: Write minimal implementation**

Create `scripts/rom-models/source.mjs`:

```js
// MACRO-11 lexical core, shared by every ROM-source parser.
//
// The assembler carries a CURRENT RADIX, set by `.RADIX N` and changeable
// mid-file (RBARON.MAC flips 16 -> 10 -> 16 around the plane points). A number
// with a TRAILING DOT is decimal regardless of the current radix — that is how
// star-wars' `.P` macro forces decimal (`.WORD .1'.*.S`) while `.PH` does not
// (`.WORD .1'*.S`), which is why `.PH` vertices are HEX.
//
// No game knowledge lives here. Pure functions, unit-tested.

/** Strip a MACRO-11 `;` comment from a line. */
export function stripComment(line) {
  const i = String(line).indexOf(';');
  return i < 0 ? String(line) : String(line).slice(0, i);
}

/** Are all `digits` legal in `base`? Guards parseInt's silent truncation. */
function validDigits(digits, base) {
  for (const ch of digits.toLowerCase()) {
    const d = parseInt(ch, 36);
    if (Number.isNaN(d) || d >= base) return false;
  }
  return true;
}

/**
 * Parse one MACRO-11 numeric token in `radix`. A trailing `.` forces base 10.
 * Throws (never silently truncates) on a digit illegal in the effective base.
 */
export function parseNum(token, radix) {
  const t = String(token).trim();
  const m = /^([+-]?)([0-9a-fA-F]+)(\.?)$/.exec(t);
  if (!m) throw new Error(`not a number: "${token}"`);
  const [, sign, digits, dot] = m;
  const base = dot ? 10 : radix;
  if (!validDigits(digits, base)) {
    throw new Error(`"${token}" has a digit invalid in base ${base}`);
  }
  const value = parseInt(digits, base);
  return sign === '-' ? -value : value;
}

/** `.RADIX N` -> N (its operand is always decimal). Any other line -> null. */
export function readRadixDirective(line) {
  const m = /^\s*\.RADIX\s+(\d+)\s*$/i.exec(stripComment(line));
  return m ? parseInt(m[1], 10) : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/rom-models/source.test.mjs`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git -C /Users/slabgorb/Projects/a-1 add scripts/rom-models/source.mjs tests/rom-models/source.test.mjs
git -C /Users/slabgorb/Projects/a-1 commit -m "feat(rom-models): radix-aware MACRO-11 number core

A trailing dot forces decimal; a bare token uses the current radix. Rejects
digits illegal in the base rather than letting parseInt truncate silently
(parseInt('18', 8) === 1) — the silent-corruption bug this whole tool exists
to avoid."
```

---

### Task 2: IR → edges, and the diff

**Files:**
- Create: `scripts/rom-models/derive.mjs`
- Test: `tests/rom-models/derive.test.mjs`

**Interfaces:**
- Consumes: nothing. Operates on the IR shape `{ point: number, draw: boolean }[]`.
- Produces: `connectToEdges(connect) -> [number, number][]`, `edgeKey(edge) -> string`, `diffEdges(romEdges, portEdges) -> { onlyInRom: string[], onlyInPort: string[] }`.

- [ ] **Step 1: Write the failing test**

Create `tests/rom-models/derive.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connectToEdges, edgeKey, diffEdges } from '../../scripts/rom-models/derive.mjs';

const B = (p) => ({ point: p, draw: false }); // pen up
const V = (p) => ({ point: p, draw: true });  // pen down

test('connectToEdges: a pen-up op moves without drawing', () => {
  // .BD 1,2,3 rebased -> move 0, draw 1, draw 2
  assert.deepEqual(connectToEdges([B(0), V(1), V(2)]), [[0, 1], [1, 2]]);
});

test('connectToEdges: a leading draw op emits no edge (nothing to draw from)', () => {
  assert.deepEqual(connectToEdges([V(5), V(6)]), [[5, 6]]);
});

test('connectToEdges: a pen-up mid-list breaks the stroke', () => {
  assert.deepEqual(connectToEdges([B(0), V(1), B(4), V(5)]), [[0, 1], [4, 5]]);
});

test('connectToEdges: closes a ring when the list returns to its start', () => {
  assert.deepEqual(
    connectToEdges([B(0), V(1), V(2), V(0)]),
    [[0, 1], [1, 2], [2, 0]],
  );
});

test('edgeKey: undirected — orientation does not matter', () => {
  assert.equal(edgeKey([3, 1]), edgeKey([1, 3]));
});

test('diffEdges: reports each side exclusively, ignoring orientation', () => {
  const d = diffEdges([[0, 1], [1, 2]], [[1, 0], [2, 3]]);
  assert.deepEqual(d.onlyInRom, ['1-2']);
  assert.deepEqual(d.onlyInPort, ['2-3']);
});

test('diffEdges: identical sets diff to nothing', () => {
  const d = diffEdges([[0, 1]], [[1, 0]]);
  assert.deepEqual(d.onlyInRom, []);
  assert.deepEqual(d.onlyInPort, []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/rom-models/derive.test.mjs`
Expected: FAIL — `Cannot find module '.../scripts/rom-models/derive.mjs'`

- [ ] **Step 3: Write minimal implementation**

Create `scripts/rom-models/derive.mjs`:

```js
// IR -> geometry. The connect list is the ROM's actual BEAM PATH: an ordered
// walk where each op either moves the beam dark (pen up) or strokes a line to
// the vertex (pen down). Edges are a LOSSY derivation of it — they discard
// stroke order — but they are what `models.ts` stores, so they are what we can
// diff against the port.

/** Walk a connect list into undirected line segments (index pairs). */
export function connectToEdges(connect) {
  const edges = [];
  let prev = null;
  for (const op of connect) {
    if (op.draw && prev !== null) edges.push([prev, op.point]);
    prev = op.point;
  }
  return edges;
}

/** Orientation-independent identity for an edge, so [1,3] and [3,1] match. */
export function edgeKey([a, b]) {
  return a <= b ? `${a}-${b}` : `${b}-${a}`;
}

/** Set difference both ways, as edge keys. */
export function diffEdges(romEdges, portEdges) {
  const rom = new Set(romEdges.map(edgeKey));
  const port = new Set(portEdges.map(edgeKey));
  return {
    onlyInRom: [...rom].filter((k) => !port.has(k)),
    onlyInPort: [...port].filter((k) => !rom.has(k)),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/rom-models/derive.test.mjs`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git -C /Users/slabgorb/Projects/a-1 add scripts/rom-models/derive.mjs tests/rom-models/derive.test.mjs
git -C /Users/slabgorb/Projects/a-1 commit -m "feat(rom-models): connect-list -> edges, and undirected edge diff"
```

---

### Task 3: The red-baron oracle — the gate

Nothing star-wars produces may be trusted until this passes. It validates radix tracking, pen semantics, vertex parsing and label-bounded table extraction against data a human transcribed byte-for-byte from the same ROM.

**Files:**
- Create: `scripts/rom-models/redbaron.mjs`
- Create: `scripts/rom-models/portdata.mjs`
- Test: `tests/rom-models/oracle-red-baron.test.mjs`

**Interfaces:**
- Consumes: `stripComment`, `parseNum`, `readRadixDirective` (Task 1).
- Produces:
  - `parsePointTable(text, label, initialRadix) -> [x,y,z][]`
  - `parseConnectList(text, label) -> { point, draw }[]`
  - `extractPoint3(tsText, exportName) -> [x,y,z][]`
  - `extractConnect(tsText, exportName) -> { point, draw }[]`

- [ ] **Step 1: Write the failing test**

Ground truth: `red-baron/src/core/biplane.ts` (`PLANE_POINTS`, 42 verts) and `red-baron/src/core/topology.ts` (`DB_MAP`/`DB_MAR`/`DB_LNS`), both hand-transcribed from the same ROM files we parse.

Create `tests/rom-models/oracle-red-baron.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parsePointTable, parseConnectList } from '../../scripts/rom-models/redbaron.mjs';
import { extractPoint3, extractConnect } from '../../scripts/rom-models/portdata.mjs';

const RB_SRC = join(homedir(), 'Projects', 'red-baron-source-text');
const REPO = join(import.meta.dirname, '..', '..');

// The vendored source is machine-local (docs/reference-sources.md). Skip loudly
// rather than fail if this checkout has not run `just vendor-source-all`.
const haveSource = existsSync(join(RB_SRC, 'RBARON.MAC'));
const opts = { skip: haveSource ? false : 'run `just vendor-source-all` first' };

test('ORACLE: parsed DB.PLN vertices === red-baron biplane.ts PLANE_POINTS', opts, () => {
  // RBARON.MAC is .RADIX 16 at the top but flips to .RADIX 10 (L6217) for this
  // table. Starting the parser at 16 and NOT honouring .RADIX yields hex
  // garbage — this assertion is what catches that.
  const rom = parsePointTable(readFileSync(join(RB_SRC, 'RBARON.MAC'), 'utf8'), 'DB.PLN', 16);
  const port = extractPoint3(
    readFileSync(join(REPO, 'red-baron', 'src', 'core', 'biplane.ts'), 'utf8'),
    'PLANE_POINTS',
  );
  assert.equal(port.length, 42, 'ground truth should be the 42-vertex plane');
  assert.equal(rom.length, 42, 'table is label-bounded: 42, not the 50 POINTP in the radix region');
  assert.deepEqual(rom[0], [0, 0, 40]);    // DB.PLN: POINTP 0,0,40  ;0 BACK TAILS
  assert.deepEqual(rom[41], [0, 0, -36]);  // last row before the .PLPNT equate
  assert.deepEqual(rom, port);
});

test('ORACLE: parsed DB.MAP/DB.MAR/DB.LNS === red-baron topology.ts', opts, () => {
  const pics = readFileSync(join(RB_SRC, '037007.XXX'), 'utf8');
  const ts = readFileSync(join(REPO, 'red-baron', 'src', 'core', 'topology.ts'), 'utf8');
  for (const [romLabel, tsName] of [['DB.MAP', 'DB_MAP'], ['DB.MAR', 'DB_MAR'], ['DB.LNS', 'DB_LNS']]) {
    assert.deepEqual(parseConnectList(pics, romLabel), extractConnect(ts, tsName), tsName);
  }
});

test('ORACLE: pen semantics are not inverted (BLANKV=up, VSBLEV=down)', opts, () => {
  const ops = parseConnectList(readFileSync(join(RB_SRC, '037007.XXX'), 'utf8'), 'DB.MAP');
  assert.deepEqual(ops[0], { point: 12, draw: false }); // DB.MAP: BLANKV 12
  assert.deepEqual(ops[1], { point: 29, draw: true });  //         VSBLEV 29
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/rom-models/oracle-red-baron.test.mjs`
Expected: FAIL — `Cannot find module '.../scripts/rom-models/redbaron.mjs'`

- [ ] **Step 3: Write the port-data extractor**

A `.mjs` test cannot `import` a `.ts` file, so read the ground truth as **text**. `topology.ts` has zero imports and both files are plain data literals, so this is reliable — but note the pitfall: `readonly Point3[] = [` contains a `[` in the *type annotation*, so anchor on `= [`, not the first `[`.

Create `scripts/rom-models/portdata.mjs`:

```js
// Extracts ground-truth literals from a game's TypeScript source AS TEXT.
//
// The orchestrator's tests are plain `node --test` on .mjs — there is no
// transpiler, so a test cannot import red-baron's .ts modules. These files are
// pure data literals, so reading them as text is reliable.

/** Body of the array literal assigned to `export const <name>`, comments removed. */
function arrayBody(text, name) {
  const src = String(text).replace(/\/\/[^\n]*/g, ''); // drop line comments first
  const at = src.indexOf(`export const ${name}`);
  if (at < 0) throw new Error(`no export named ${name}`);
  // Anchor on "= [" — `readonly Point3[] = [` has a '[' in the TYPE annotation.
  const eq = /=\s*\[/.exec(src.slice(at));
  if (!eq) throw new Error(`${name} is not assigned an array literal`);
  const open = at + eq.index + eq[0].length - 1;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']' && --depth === 0) return src.slice(open + 1, i);
  }
  throw new Error(`unterminated array literal for ${name}`);
}

/** `export const X: readonly Point3[] = [[0,0,40], ...]` -> [[0,0,40], ...]. */
export function extractPoint3(text, name) {
  return [...arrayBody(text, name).matchAll(/\[\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\]/g)]
    .map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
}

/** `export const X: readonly ConnectOp[] = [B(12), V(29), ...]` -> ops. B=pen up, V=pen down. */
export function extractConnect(text, name) {
  return [...arrayBody(text, name).matchAll(/\b([BV])\(\s*(\d+)\s*\)/g)]
    .map((m) => ({ point: Number(m[2]), draw: m[1] === 'V' }));
}
```

- [ ] **Step 4: Write the red-baron parser**

Create `scripts/rom-models/redbaron.mjs`:

```js
// red-baron ROM source parser — THE ORACLE INPUT.
//
// Vertices:  RBARON.MAC   `POINTP .X,.Y,.Z`  (.BYTE .Z,.X*2,.Y*4 — we keep the
//            logical [x,y,z] the args name, matching biplane.ts's Point3).
// Connect:   037007.XXX   `BLANKV/BV .P` -> .BYTE .P*6   (flag 0 = pen UP)
//                         `VSBLEV/VV .P` -> .BYTE .P*6+1 (flag 1 = pen DOWN)
//                         `ENDDB`        -> .BYTE $FF
//
// Tables are LABEL-BOUNDED, not radix-bounded: 50 POINTP lines sit inside
// RBARON.MAC's .RADIX 10 fence but only 42 belong to DB.PLN (BLCOLL: owns the
// other 8). A label may sit ON a POINTP line (`P.BACK:  POINTP -40,20,-8`).

import { stripComment, parseNum, readRadixDirective } from './source.mjs';

const LABEL = String.raw`(?:[A-Z0-9_.$]+:)?`;
const POINTP = new RegExp(String.raw`^\s*${LABEL}\s*POINTP\s+(.+)$`, 'i');
const BARE_LABEL = /^\s*[A-Z0-9_.$]+:\s*$/i;
const startsAt = (label) => new RegExp(String.raw`^\s*${label.replace(/[.$]/g, '\\$&')}:`, 'i');

/**
 * Collect the `POINTP` rows of the table labelled `label`, honouring `.RADIX`
 * changes as the scan proceeds. Stops at the first content line that is neither
 * a POINTP row nor a bare label (e.g. the `.PLPNT =.-DB.PLN` equate).
 */
export function parsePointTable(text, label, initialRadix) {
  const lines = String(text).split('\n');
  const begin = startsAt(label);
  let radix = initialRadix;
  let started = false;
  const points = [];

  for (const raw of lines) {
    const next = readRadixDirective(raw);
    if (next !== null) { radix = next; continue; }

    const code = stripComment(raw);
    if (!started) {
      if (begin.test(code)) started = true;
      else continue;
    } else if (!code.trim()) {
      continue; // blank / comment-only line inside the table
    }

    const m = POINTP.exec(code);
    if (m) {
      const args = m[1].split(',').map((a) => parseNum(a.trim(), radix));
      if (args.length !== 3) throw new Error(`POINTP needs 3 args: "${code.trim()}"`);
      points.push(args);
    } else if (BARE_LABEL.test(code)) {
      continue;
    } else if (code.trim()) {
      break; // end of table
    }
  }
  if (!started) throw new Error(`no table labelled ${label}`);
  return points;
}

/** Collect the connect-list ops of the list labelled `label`, up to `ENDDB`. */
export function parseConnectList(text, label) {
  const begin = startsAt(label);
  const OP = /^\s*(?:[A-Z0-9_.$]+:)?\s*(BLANKV|BV|VSBLEV|VV)\s+(\d+)\s*$/i;
  let started = false;
  const ops = [];

  for (const raw of String(text).split('\n')) {
    const code = stripComment(raw);
    if (!started) {
      if (begin.test(code)) started = true;
      else continue;
    }
    if (/^\s*ENDDB\s*$/i.test(code)) break;
    const m = OP.exec(code);
    if (m) {
      const macro = m[1].toUpperCase();
      ops.push({ point: Number(m[2]), draw: macro === 'VSBLEV' || macro === 'VV' });
    }
  }
  if (!started) throw new Error(`no connect list labelled ${label}`);
  return ops;
}
```

- [ ] **Step 5: Run the oracle**

Run: `node --test tests/rom-models/oracle-red-baron.test.mjs`
Expected: PASS — 3 tests. If the vendored source is missing, the tests report **skipped** with `run \`just vendor-source-all\` first` (not failed).

If the vertex test fails with values like `[0, 0, 64]` instead of `[0, 0, 40]`, the `.RADIX 10` directive is being ignored and `40` decoded as hex — fix the radix tracking, do not adjust the expectation.

- [ ] **Step 6: Commit**

```bash
git -C /Users/slabgorb/Projects/a-1 add scripts/rom-models/redbaron.mjs scripts/rom-models/portdata.mjs tests/rom-models/oracle-red-baron.test.mjs
git -C /Users/slabgorb/Projects/a-1 commit -m "test(rom-models): red-baron oracle — the gate on the macro parser

Parses RBARON.MAC DB.PLN + 037007.XXX DB.MAP/MAR/LNS and asserts equality with
red-baron's hand-transcribed biplane.ts/topology.ts. Pins radix tracking
(RBARON flips 16->10->16 around the plane points), pen semantics
(BLANKV=up/VSBLEV=down), and label-bounded table extraction (42 of the 50
POINTP rows in the decimal fence). No star-wars output is trusted until this
passes."
```

---

### Task 4: The star-wars WSOBJ parser

**Files:**
- Create: `scripts/rom-models/wsobj.mjs`
- Test: `tests/rom-models/wsobj.test.mjs`

**Interfaces:**
- Consumes: `stripComment`, `parseNum` (Task 1).
- Produces: `parseWsobj(text) -> RomObject[]` where
  `RomObject = { name, scale, vertices: [x,y,z][], connect: {point,draw}[], anchorDropped: boolean, hasDrawList: boolean }`.

- [ ] **Step 1: Write the failing test**

Uses inline fixtures for the mechanics plus the real file for the headline facts.

Create `tests/rom-models/wsobj.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseWsobj } from '../../scripts/rom-models/wsobj.mjs';

const WSOBJ = join(homedir(), 'Projects', 'star-wars-1983-source-text', 'WSOBJ.MAC');
const opts = { skip: existsSync(WSOBJ) ? false : 'run `just vendor-source-all` first' };
const byName = (objs, n) => objs.find((o) => o.name === n);

test('.P args are DECIMAL and scaled by .S', () => {
  const [o] = parseWsobj(['\t.S=13.', '\t.WP TIE', '\t.P 0,0,0', '\t.P -10,-16,18'].join('\n'));
  assert.equal(o.scale, 13);
  assert.equal(o.anchorDropped, true);            // .P 0,0,0 is metadata
  assert.deepEqual(o.vertices, [[-130, -208, 234]]); // -10*13, -16*13, 18*13
});

// The headline bug: WSOBJ.MAC assembles under .RADIX 16 (via .INCLUDE WSCOMN),
// and .PH does NOT force decimal. Reading these as decimal is silently wrong.
test('.PH args are HEX, not decimal', () => {
  const [o] = parseWsobj(['\t.S=8', '\t.WP WFF', '\t.PH -20,0,0', '\t.PH -20,40,0'].join('\n'));
  assert.equal(o.anchorDropped, false, 'WFF has no .P 0,0,0 anchor');
  assert.deepEqual(o.vertices[0], [-256, 0, 0]);  // -0x20 * 8 = -32 * 8   (NOT -160)
  assert.deepEqual(o.vertices[1], [-256, 512, 0]); // -0x20*8, 0x40*8 = 64*8 (NOT 320)
});

test('.S accepts a decimal-dot expression (.S=30.*4)', () => {
  const [o] = parseWsobj(['\t.S=30.*4', '\t.WP WPN', '\t.PH 1,0,0'].join('\n'));
  assert.equal(o.scale, 120);
  assert.deepEqual(o.vertices[0], [120, 0, 0]);
});

test('.LD draws; .BD lifts the pen on its FIRST arg only, then draws', () => {
  const src = ['\t.S=1', '\t.WP T', '\t.P 0,0,0', '\t.P 1,0,0', '\t.P 2,0,0', '\t.P 3,0,0',
               '\t.WL T', '\t.BD 1,2', '\t.LD 3', '\t.LEND'].join('\n');
  const [o] = parseWsobj(src);
  assert.equal(o.hasDrawList, true);
  // 1-based ROM indices rebased by -1 because the anchor was dropped.
  assert.deepEqual(o.connect, [
    { point: 0, draw: false }, // .BD 1  -> pen UP
    { point: 1, draw: true },  // .BD ,2 -> draw
    { point: 2, draw: true },  // .LD 3  -> draw
  ]);
});

test('.WL2 aliases the previous .WL draw list', () => {
  const src = ['\t.S=1', '\t.WP A', '\t.P 0,0,0', '\t.P 1,0,0', '\t.P 2,0,0',
               '\t.WP B', '\t.P 0,0,0', '\t.P 9,0,0', '\t.P 8,0,0',
               '\t.WL A', '\t.BD 1,2', '\t.LEND', '\t.WL2 B'].join('\n');
  const objs = parseWsobj(src);
  assert.deepEqual(byName(objs, 'B').connect, byName(objs, 'A').connect);
  assert.notDeepEqual(byName(objs, 'B').vertices, byName(objs, 'A').vertices);
});

test('an object with no .WL draw list yields vertices and no connect', () => {
  const [o] = parseWsobj(['\t.S=8', '\t.WP PORT', '\t.PH 1,0,0', '\t.WPZ'].join('\n'));
  assert.equal(o.hasDrawList, false);
  assert.deepEqual(o.connect, []);
});

test('REAL WSOBJ.MAC: TIE matches the port, PORT is hex, XW/YW exist', opts, () => {
  const objs = parseWsobj(readFileSync(WSOBJ, 'utf8'));

  const tie = byName(objs, 'TIE');
  assert.equal(tie.vertices.length, 52, '53 .P rows minus the anchor');
  // models.ts TIE_FIGHTER.vertices[0] — the ported vertices already agree, so
  // any divergence the sheet shows is in the EDGES.
  assert.deepEqual(tie.vertices[0], [-130, -208, 234]);
  assert.ok(tie.connect.length > 0, 'TIE has a .WL draw list');

  // The exhaust port: hex vertices, and NO .WL list (drawn procedurally).
  const port = byName(objs, 'PORT');
  assert.equal(port.hasDrawList, false);
  assert.equal(port.vertices.length, 12);

  // XW/YW are PHANTOMS — compiled out via `.IF NE,0` (MACRO-11's `#if 0`).
  // They must NOT appear in the output. See "Findings" above.
  assert.equal(byName(objs, 'XW'), undefined);
  assert.equal(byName(objs, 'YW'), undefined);

  // TW1's list is shared by TW3/BK1/BK2/BK3/WG1 via .WL2.
  assert.deepEqual(byName(objs, 'BK1').connect, byName(objs, 'TW1').connect);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/rom-models/wsobj.test.mjs`
Expected: FAIL — `Cannot find module '.../scripts/rom-models/wsobj.mjs'`

- [ ] **Step 3: Write minimal implementation**

Create `scripts/rom-models/wsobj.mjs`:

```js
// star-wars WSOBJ.MAC parser.
//
// RADIX: WSOBJ.MAC has NO .RADIX of its own — it does `.INCLUDE WSCOMN`
// (WSOBJ.MAC:2), and WSCOMN.MAC:5 is `.RADIX 16`. So the file assembles in HEX
// and we seed the parser at 16. The two vertex macros differ ONLY in whether
// they force decimal:
//     .MACRO .P  -> .WORD .1'.*.S   the '. appends a decimal point -> DECIMAL
//     .MACRO .PH -> .WORD .1'*.S    no point -> current radix -> HEX
// `.PH` = "Point, Hex". Decoding those 26 vertices as decimal yields geometry
// at ~60% of true magnitude that looks plausible and is silently wrong.
//
// CONNECT: .LD a,b,c -> .BYTE a*4   (draw)  for every arg
//          .BD a,b,c -> .BYTE a*4+1 (pen UP) for the FIRST arg, then delegates
//                       the REST to .LD (draw). So .BD begins a new stroke.
//          .WL2 NAME aliases the previous .WL list (TW3/BK1/BK2/BK3/WG1 share TW1's).
//          .LEND ends a list.
//
// ANCHOR: a leading `.P 0,0,0` is the object centre — metadata, not a drawn
// point. It is CONDITIONAL: TIE has one, WFF does not. Draw lists index the
// table INCLUDING the anchor, so dropping it rebases the indices by -1.

import { stripComment, parseNum } from './source.mjs';

const WSCOMN_RADIX = 16; // WSCOMN.MAC:5, pulled in by WSOBJ.MAC:2

const isZero = ([x, y, z]) => x === 0 && y === 0 && z === 0;

/** `.S=13.` / `.S=8` / `.S=30.*4` -> a number, in the current radix. */
function parseScale(expr, radix) {
  return expr.split('*').reduce((acc, term) => acc * parseNum(term.trim(), radix), 1);
}

export function parseWsobj(text) {
  const order = [];
  const objects = new Map();
  const get = (name) => {
    if (!objects.has(name)) {
      objects.set(name, {
        name, scale: 1, vertices: [], connect: [],
        anchorDropped: false, hasDrawList: false,
      });
      order.push(name);
    }
    return objects.get(name);
  };

  let radix = WSCOMN_RADIX;
  let scale = 1;
  let table = null;    // object currently receiving .P/.PH rows
  let list = null;     // object currently receiving .LD/.BD rows
  let lastList = null; // for .WL2 aliasing

  const push = (obj, indices, firstIsBlank) => {
    indices.forEach((raw, i) => {
      // Draw lists are 1-based when an anchor was dropped; rebase to the
      // stored vertex array.
      const point = obj.anchorDropped ? raw - 1 : raw;
      obj.connect.push({ point, draw: !(firstIsBlank && i === 0) });
    });
  };

  for (const raw of String(text).split('\n')) {
    const code = stripComment(raw).trim();
    if (!code) continue;

    let m;
    if ((m = /^\.RADIX\s+(\d+)$/i.exec(code))) { radix = parseInt(m[1], 10); continue; }
    if ((m = /^\.S\s*=\s*(.+)$/i.exec(code))) { scale = parseScale(m[1], radix); continue; }

    // A .MACRO definition body must never be read as data.
    if (/^\.MACRO\b/i.test(code)) { table = null; list = null; continue; }

    if ((m = /^\.WP\s+([A-Z0-9_$]+)$/i.exec(code))) {
      table = get(m[1]); table.scale = scale; continue;
    }
    if (/^\.WPZ2?\b/i.test(code)) { table = null; continue; }

    if ((m = /^\.W(?:L|GD)\s+([A-Z0-9_$]+)$/i.exec(code))) {
      list = get(m[1]); list.hasDrawList = true; lastList = list; continue;
    }
    if ((m = /^\.W(?:L|GD)2\s+([A-Z0-9_$]+)$/i.exec(code))) {
      const alias = get(m[1]);                       // shares the previous list
      alias.connect = lastList ? [...lastList.connect] : [];
      alias.hasDrawList = alias.connect.length > 0;
      continue;
    }
    if (/^\.LEND\b/i.test(code)) { list = null; continue; }

    if (table && (m = /^\.(PH?)\s+(.+)$/i.exec(code))) {
      const hex = m[1].toUpperCase() === 'PH';       // .PH -> current radix (16); .P -> decimal
      const args = m[2].split(',').map((a) => parseNum(a.trim(), hex ? radix : 10));
      if (args.length !== 3) throw new Error(`.${m[1]} needs 3 args: "${code}"`);
      const v = args.map((n) => n * table.scale);
      // A leading (0,0,0) is the object anchor: metadata, dropped, and the
      // draw-list indices rebase by -1 to match.
      if (table.vertices.length === 0 && isZero(v)) { table.anchorDropped = true; continue; }
      table.vertices.push(v);
      continue;
    }

    if (list && (m = /^\.(LD|BD)\s+(.+)$/i.exec(code))) {
      const indices = m[2].split(/[,\s]+/).filter(Boolean).map((a) => parseNum(a, 10));
      push(list, indices, m[1].toUpperCase() === 'BD');
      continue;
    }
  }

  return order.map((n) => objects.get(n));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/rom-models/wsobj.test.mjs`
Expected: PASS — 7 tests.

If `TIE.vertices[0]` is anything but `[-130, -208, 234]`, stop: that value is independently confirmed by `star-wars/src/core/models.ts:66`, so a mismatch means the parser is wrong, not the port.

- [ ] **Step 5: Commit**

```bash
git -C /Users/slabgorb/Projects/a-1 add scripts/rom-models/wsobj.mjs tests/rom-models/wsobj.test.mjs
git -C /Users/slabgorb/Projects/a-1 commit -m "feat(rom-models): parse WSOBJ.MAC — vertices, .PH hex, and the draw lists

WSOBJ.MAC assembles under .RADIX 16 (via .INCLUDE WSCOMN), so .PH vertices are
HEX and .P vertices are decimal-forced by the macro. Recovers the .WL draw
lists — the authentic connectivity models.ts had to guess — including .WL2
aliasing and the conditional (0,0,0) anchor rebase."
```

---

### Task 5: Bake the artifact

**Files:**
- Create: `scripts/bake-models.mjs`
- Modify: `justfile` (add a recipe after the `vendor-source-all` recipe, currently `justfile:54-56`)
- Test: `tests/rom-models/bake.test.mjs`
- Generates: `star-wars/src/tools/romModels.generated.ts`

**Interfaces:**
- Consumes: `parseWsobj` (Task 4), `connectToEdges` (Task 2).
- Produces: `toRomModels(objs) -> RomModel[]`, `emitTs(models) -> string`; the generated module exports `ROM_MODELS: readonly RomModel[]`.

- [ ] **Step 1: Write the failing test**

Create `tests/rom-models/bake.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toRomModels, emitTs } from '../../scripts/bake-models.mjs';

const OBJS = [{
  name: 'TIE', scale: 13,
  vertices: [[-130, -208, 234], [104, -208, 234], [182, -208, 0]],
  connect: [{ point: 0, draw: false }, { point: 1, draw: true }, { point: 2, draw: true }],
  anchorDropped: true, hasDrawList: true,
}];

test('toRomModels: derives edges from the connect list', () => {
  const [m] = toRomModels(OBJS);
  assert.equal(m.name, 'TIE');
  assert.deepEqual(m.edges, [[0, 1], [1, 2]]); // pen-up on 0 draws nothing
  assert.equal(m.hasDrawList, true);
});

test('toRomModels: an object with no draw list gets no edges', () => {
  const [m] = toRomModels([{ ...OBJS[0], name: 'PORT', connect: [], hasDrawList: false }]);
  assert.deepEqual(m.edges, []);
  assert.equal(m.hasDrawList, false);
});

test('emitTs: emits a DO-NOT-EDIT header and a typed ROM_MODELS export', () => {
  const ts = emitTs(toRomModels(OBJS));
  assert.match(ts, /GENERATED by scripts\/bake-models\.mjs/);
  assert.match(ts, /DO NOT EDIT/);
  assert.match(ts, /export const ROM_MODELS: readonly RomModel\[\]/);
  assert.match(ts, /name: 'TIE'/);
  assert.match(ts, /\[-130, -208, 234\]/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/rom-models/bake.test.mjs`
Expected: FAIL — `Cannot find module '.../scripts/bake-models.mjs'`

- [ ] **Step 3: Write minimal implementation**

Create `scripts/bake-models.mjs`:

```js
// Bakes the original Atari ROM source into a committed TypeScript artifact the
// contact sheet can import.
//
// WHY BAKE: the vendored source lives at ~/Projects/*-source-text and is in NO
// repo, so a browser page cannot import it. Same pattern as the existing
// star-wars/tools/pokey-bake and tools/speech-bake. The generated file IS the
// audit record.
//
// Usage:  node scripts/bake-models.mjs star-wars
//         just bake-models star-wars
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { parseWsobj } from './rom-models/wsobj.mjs';
import { connectToEdges } from './rom-models/derive.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const GAMES = {
  'star-wars': {
    source: join(homedir(), 'Projects', 'star-wars-1983-source-text', 'WSOBJ.MAC'),
    out: join(ROOT, 'star-wars', 'src', 'tools', 'romModels.generated.ts'),
    parse: parseWsobj,
  },
};

// --- pure core (unit-tested) -------------------------------------------------

/** Parsed ROM objects -> render-ready models (edges derived from the beam path). */
export function toRomModels(objs) {
  return objs.map((o) => ({
    name: o.name,
    scale: o.scale,
    vertices: o.vertices,
    edges: connectToEdges(o.connect),
    hasDrawList: o.hasDrawList,
  }));
}

const vec = (v) => `[${v.join(', ')}]`;

export function emitTs(models) {
  const body = models.map((m) => `  {
    name: '${m.name}',
    scale: ${m.scale},
    hasDrawList: ${m.hasDrawList},
    vertices: [${m.vertices.map(vec).join(', ')}],
    edges: [${m.edges.map(vec).join(', ')}],
  },`).join('\n');

  return `// GENERATED by scripts/bake-models.mjs — DO NOT EDIT.
// Re-generate with: just bake-models star-wars
//
// The authentic geometry from the original 1983 Atari source (WSOBJ.MAC):
// vertices from the .WP/.P/.PH tables, edges walked from the .WL draw lists.
// This is what the ROM actually drew — unlike src/core/models.ts, whose EDGES
// were reconstructed by heuristic because the disassembly held no draw lists.
//
// \`hasDrawList: false\` means the ROM has vertices but no .WL list for that
// object (PORT/WPN/WFF are drawn procedurally elsewhere) — its \`edges\` are
// empty and only its VERTICES are authoritative.
//
// Dev-tool data. Never import this from src/core — the core is the pure sim.

import type { Vec3 } from '@arcade/shared/math3d'

export interface RomModel {
  readonly name: string
  readonly scale: number
  readonly hasDrawList: boolean
  readonly vertices: readonly Vec3[]
  readonly edges: readonly (readonly [number, number])[]
}

export const ROM_MODELS: readonly RomModel[] = [
${body}
]
`;
}

// --- cli ---------------------------------------------------------------------

function main() {
  const game = process.argv[2];
  const cfg = GAMES[game];
  if (!cfg) {
    console.error(`usage: bake-models <${Object.keys(GAMES).join('|')}>`);
    process.exit(2);
  }
  if (!existsSync(cfg.source)) {
    console.error(`missing vendored source: ${cfg.source}`);
    console.error('run `just vendor-source-all` first');
    process.exit(1);
  }

  const models = toRomModels(cfg.parse(readFileSync(cfg.source, 'utf8')));
  mkdirSync(dirname(cfg.out), { recursive: true });
  writeFileSync(cfg.out, emitTs(models));

  const drawn = models.filter((m) => m.hasDrawList).length;
  console.log(`${game}: ${models.length} objects (${drawn} with draw lists) -> ${cfg.out}`);
  for (const m of models) {
    const note = m.hasDrawList ? `${m.edges.length} edges` : 'no draw list (vertices only)';
    console.log(`  ${m.name.padEnd(6)} ${String(m.vertices.length).padStart(3)} verts  ${note}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/rom-models/bake.test.mjs`
Expected: PASS — 3 tests.

- [ ] **Step 5: Add the just recipe**

In `justfile`, immediately after the `vendor-source-all` recipe (currently ends at line 56), add:

```just
# Bake a game's ROM source into its committed contact-sheet artifact
bake-models game="star-wars":
    @node {{root}}/scripts/bake-models.mjs {{game}}
```

- [ ] **Step 6: Generate the artifact and check it in**

Run: `just bake-models star-wars`
Expected: a table listing ~21 objects — `TIE 52 verts …`, `PORT 12 verts  no draw list (vertices only)`, `XW`/`YW` present.

Then confirm the whole orchestrator suite is green:

Run: `just test-orchestrator`
Expected: PASS — all `tests/**/*.test.mjs`, oracle included.

- [ ] **Step 7: Commit**

The generated artifact belongs to the **star-wars** repo (a separate git repo on `develop`), the script and recipe to the orchestrator. Two commits:

```bash
# orchestrator (main)
git -C /Users/slabgorb/Projects/a-1 add scripts/bake-models.mjs tests/rom-models/bake.test.mjs justfile
git -C /Users/slabgorb/Projects/a-1 commit -m "feat(rom-models): bake WSOBJ.MAC into star-wars/src/tools/romModels.generated.ts"

# star-wars (feature branch off develop — never commit to its main)
git -C /Users/slabgorb/Projects/a-1/star-wars fetch origin
git -C /Users/slabgorb/Projects/a-1/star-wars checkout -b feat/rom-model-contact-sheet origin/develop
git -C /Users/slabgorb/Projects/a-1/star-wars add src/tools/romModels.generated.ts
git -C /Users/slabgorb/Projects/a-1/star-wars commit -m "feat(tools): baked ROM geometry from WSOBJ.MAC

Generated by the orchestrator's \`just bake-models star-wars\`. The authentic
vertices AND draw-list edges from the 1983 source — the connectivity
src/core/models.ts had to reconstruct."
```

---

### Task 6: Compare mode on the contact sheet

**Files:**
- Modify: `star-wars/src/tools/contactSheet.ts` (whole-file rework of the render loop; current file is 137 lines)
- Test: `star-wars/tests/core/modelView.test.ts` is unaffected; add `star-wars/tests/tools/romCompare.test.ts`
- Create: `star-wars/src/tools/romCompare.ts` (pure pairing + diff logic, so it is testable without a DOM)

Work on the `feat/rom-model-contact-sheet` branch created in Task 5. Run commands from `star-wars/`.

**Interfaces:**
- Consumes: `ROM_MODELS` (Task 5), `MODELS` from `../core/models`, `diffEdges` logic (re-expressed in TS — the `.mjs` module is not importable from the browser build).
- Produces: `pairModels() -> ModelPair[]` where `ModelPair = { romName, portName, rom: RomModel|null, port: Model3D|null, onlyInRom: string[], onlyInPort: string[] }`.

- [ ] **Step 1: Write the failing test**

Create `star-wars/tests/tools/romCompare.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { edgeKey, diffEdges, pairModels, ROM_TO_PORT } from '../../src/tools/romCompare'

describe('edgeKey', () => {
  it('is orientation-independent', () => {
    expect(edgeKey([3, 1])).toBe(edgeKey([1, 3]))
  })
})

describe('diffEdges', () => {
  it('reports each side exclusively', () => {
    const d = diffEdges([[0, 1], [1, 2]], [[1, 0], [2, 3]])
    expect(d.onlyInRom).toEqual(['1-2'])
    expect(d.onlyInPort).toEqual(['2-3'])
  })

  it('finds no drift between identical sets', () => {
    const d = diffEdges([[0, 1]], [[1, 0]])
    expect(d.onlyInRom).toEqual([])
    expect(d.onlyInPort).toEqual([])
  })
})

describe('pairModels', () => {
  const pairs = pairModels()

  it('pairs every mapped ROM object with its port model', () => {
    const tie = pairs.find((p) => p.romName === 'TIE')
    expect(tie).toBeDefined()
    expect(tie!.port?.name).toBe('TIE Fighter')
    expect(tie!.rom).not.toBeNull()
  })

  it('the ROM vertices for TIE agree with the port (only edges should drift)', () => {
    const tie = pairs.find((p) => p.romName === 'TIE')!
    expect(tie.rom!.vertices.length).toBe(tie.port!.vertices.length)
    expect(tie.rom!.vertices[0]).toEqual(tie.port!.vertices[0])
  })

  // X-Wing and Y-Wing are NOT in the ROM — their vertices and draw lists sit
  // inside `.IF NE,0` blocks (MACRO-11's `#if 0`), so they were compiled OUT of
  // the shipped cabinet. The parser omits them; the sheet must never present
  // them as "ROM objects the port is missing".
  it('does not surface the phantom X-Wing / Y-Wing', () => {
    expect(pairs.find((p) => p.romName === 'XW')).toBeUndefined()
    expect(pairs.find((p) => p.romName === 'YW')).toBeUndefined()
  })

  it('declines to claim edges for objects the ROM draws procedurally', () => {
    // PORT/WPN/WFF are `.WGD` ground-type objects — direct-executing
    // PLOT/DRAWTO assembly, not an interpretable point list. Vertices are
    // authoritative; edges are not ours to assert.
    const port = pairs.find((p) => p.romName === 'PORT')!
    expect(port.rom!.hasDrawList).toBe(false)
    expect(port.onlyInRom).toEqual([])
    expect(port.onlyInPort).toEqual([])
  })

  it('every ROM_TO_PORT target names a real port model', () => {
    for (const p of pairs) {
      if (ROM_TO_PORT[p.romName]) expect(p.port, `${p.romName}`).not.toBeNull()
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd star-wars && npm test -- romCompare`
Expected: FAIL — cannot resolve `../../src/tools/romCompare`

- [ ] **Step 3: Write the pure compare module**

Create `star-wars/src/tools/romCompare.ts`:

```ts
// src/tools/romCompare.ts
//
// Pairs the baked ROM geometry (romModels.generated.ts) against the shipped
// models (core/models.ts) and diffs their edges. PURE — no DOM — so the pairing
// and the diff are unit-tested; contactSheet.ts only renders the result.
//
// Dev tool. Never imported by src/core.

import { MODELS, type Model3D } from '../core/models'
import { ROM_MODELS, type RomModel } from './romModels.generated'

/** ROM object name (WSOBJ.MAC) -> the `name` of its counterpart in MODELS. */
export const ROM_TO_PORT: Readonly<Record<string, string>> = {
  TIE: 'TIE Fighter',
  RTH: 'Darth TIE',
  TI1: 'TIE Wing Frag 1',
  TI2: 'TIE Wing Frag 2',
  TI3: 'TIE Wing Frag 3',
  TW1: 'Surface Tower',
  TW2: 'Tower Cap',
  BK1: 'Surface Bunker',
  WG1: 'Trench Turret',
  PORT: 'Exhaust Port',
}

export type Edge = readonly [number, number]

/** Orientation-independent identity, so [1,3] and [3,1] are one edge. */
export function edgeKey([a, b]: Edge): string {
  return a <= b ? `${a}-${b}` : `${b}-${a}`
}

export function diffEdges(
  rom: readonly Edge[],
  port: readonly Edge[],
): { onlyInRom: string[]; onlyInPort: string[] } {
  const r = new Set(rom.map(edgeKey))
  const p = new Set(port.map(edgeKey))
  return {
    onlyInRom: [...r].filter((k) => !p.has(k)),
    onlyInPort: [...p].filter((k) => !r.has(k)),
  }
}

export interface ModelPair {
  readonly romName: string
  readonly portName: string | null
  readonly rom: RomModel | null
  readonly port: Model3D | null
  readonly onlyInRom: string[]
  readonly onlyInPort: string[]
}

/** Every ROM object, paired with its port model where one exists. */
export function pairModels(): ModelPair[] {
  return ROM_MODELS.map((rom) => {
    const portName = ROM_TO_PORT[rom.name] ?? null
    const port = portName ? (MODELS.find((m) => m.name === portName) ?? null) : null
    // Only meaningful when the ROM actually has a draw list.
    const d = port && rom.hasDrawList
      ? diffEdges(rom.edges, port.edges)
      : { onlyInRom: [], onlyInPort: [] }
    return { romName: rom.name, portName, rom, port, ...d }
  })
}
```

**Note:** if a `ROM_TO_PORT` target does not match a real `MODELS[].name`, the last test fails and tells you which. Fix the map against `star-wars/src/core/models.ts` — do not weaken the test.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd star-wars && npm test -- romCompare`
Expected: PASS — 6 tests.

- [ ] **Step 5: Add compare mode to the contact sheet**

Modify `star-wars/src/tools/contactSheet.ts`. Keep the existing spin/fit/glow pipeline; add a `[C]` toggle that swaps the cell renderer.

Add these imports alongside the existing ones (`contactSheet.ts:14-20`):

```ts
import { pairModels, type ModelPair } from './romCompare'
```

Add to the module state (near `let fitToCell = true`, `contactSheet.ts:57-59`):

```ts
let compare = false
const pairs = pairModels()
const DRIFT_COLOR = '#ff5a5a'
```

Extend the existing `keydown` handler (`contactSheet.ts:61-68`) with a `c` case:

```ts
  } else if (e.key === 'c' || e.key === 'C') {
    compare = !compare
  }
```

Add a cell renderer for a ROM/PORT pair. Both halves share one camera and spin,
so any visible difference is geometry, not framing:

```ts
// Draw one ROM|PORT comparison cell: the ROM wireframe left, the port's right,
// framed identically so only geometry can differ.
function drawPair(p: ModelPair, r: { x: number; y: number; w: number; h: number }): void {
  const half = r.w / 2
  const sides: [string, Model3D | null][] = [
    ['ROM', p.rom && p.rom.hasDrawList ? { name: p.romName, vertices: p.rom.vertices, edges: p.rom.edges } : null],
    ['PORT', p.port],
  ]

  // Frame BOTH halves to the same bounding sphere so scale is comparable.
  const framed = p.rom ?? p.port
  if (!framed) return
  const { center, radius } = modelBounds({ name: p.romName, vertices: framed.vertices, edges: [] })
  const dist = fitToCell ? fitDistance(radius, FOV_Y) : GAMEPLAY_DISTANCE

  sides.forEach(([label, model], i) => {
    ctx.save()
    ctx.beginPath()
    ctx.rect(r.x + i * half, r.y, half, r.h)
    ctx.clip()
    ctx.translate(r.x + i * half, r.y)

    if (model) {
      const proj = perspective(FOV_Y, half / r.h, NEAR, FAR)
      const recentre = translation(-center[0], -center[1], -center[2])
      const spun = multiply(rotationY(spinAngle), multiply(orientFor(model.name), recentre))
      const orient = multiply(rotationX(VIEW_TILT), spun)
      const modelView = multiply(translation(0, 0, -dist), orient)
      drawWireframe(ctx, model, modelView, proj, half, r.h, GLOW_FOR[model.name] ?? DEFAULT_GLOW)
    }

    ctx.font = LABEL_FONT
    ctx.textAlign = 'left'
    ctx.fillStyle = HINT_COLOR
    ctx.fillText(label, 8, 36)
    if (!model) ctx.fillText(label === 'ROM' ? 'no draw list' : 'not ported', 8, 54)
    ctx.restore()
  })

  // Header + drift counts.
  ctx.save()
  ctx.translate(r.x, r.y)
  ctx.font = LABEL_FONT
  ctx.textAlign = 'left'
  ctx.fillStyle = DEFAULT_GLOW
  ctx.fillText(`${p.romName}${p.portName ? ` → ${p.portName}` : ''}`, 8, 18)

  const drift = p.onlyInRom.length + p.onlyInPort.length
  ctx.fillStyle = drift ? DRIFT_COLOR : HINT_COLOR
  ctx.fillText(
    drift
      ? `⚠ ${p.onlyInRom.length} in ROM not in port · ${p.onlyInPort.length} in port not in ROM`
      : p.port && p.rom?.hasDrawList ? '✓ edges match' : '—',
    8,
    r.h - 10,
  )
  ctx.restore()
}
```

In `frame()`, branch the loop on `compare` — when on, iterate `pairs` instead of `MODELS`:

```ts
  const items = compare ? pairs : MODELS
  const rects = cellRects(W, H, items.length, COLS)
  for (let i = 0; i < items.length; i++) {
    if (compare) drawPair(pairs[i], rects[i])
    else drawModelCell(MODELS[i], rects[i], bounds[i])   // the existing per-model body, extracted
  }
```

Extract the existing per-model cell body (currently `contactSheet.ts:85-119`) verbatim into `drawModelCell(m, r, b)` so both modes share the loop.

Update the footer hint (`contactSheet.ts:127-131`) to mention the new key:

```ts
  ctx.fillText(
    `${compare ? 'ROM|PORT COMPARE' : 'PORT ONLY'}   ·   [C] compare   ·   [G] scale   ·   [SPACE] ${spinning ? 'pause' : 'play'}`,
    W / 2,
    H - 8,
  )
```

- [ ] **Step 6: Verify the build and see it**

Run: `cd star-wars && npm run build`
Expected: PASS — `tsc --noEmit` clean, vite build succeeds.

Run: `cd star-wars && npm test`
Expected: PASS — full suite, including the new `romCompare` tests.

Run: `cd star-wars && npm run dev`, open `http://localhost:5274/models.html`, press **`C`**.
Expected: each cell shows ROM (left) vs PORT (right). Read off the punch-list: which models show `⚠`, and how many edges differ.

- [ ] **Step 7: Commit and open the PR**

```bash
git -C /Users/slabgorb/Projects/a-1/star-wars add src/tools/romCompare.ts src/tools/contactSheet.ts tests/tools/romCompare.test.ts
git -C /Users/slabgorb/Projects/a-1/star-wars commit -m "feat(tools): ROM|PORT compare mode on the model contact sheet

[C] pairs each WSOBJ.MAC object against its models.ts counterpart, framed
identically, and counts the edge drift. The port's edges were reconstructed by
heuristic; these are the ones the ROM actually drew."

git -C /Users/slabgorb/Projects/a-1/star-wars push -u origin feat/rom-model-contact-sheet
gh pr create -R slabgorb/star-wars --base develop \
  --title "feat(tools): ROM|PORT model contact sheet" \
  --body "Parses WSOBJ.MAC (via the orchestrator's \`just bake-models star-wars\`) and compares the ROM's real draw-list edges against models.ts's reconstructed ones. Reports only — models.ts is untouched."
```

**Do not merge without human authorization** — an AI-authored, AI-reviewed PR must not self-merge.

---

## Self-Review

**Spec coverage.** Every spec section maps to a task: lexical/radix core → T1; IR→edges + diff → T2; the oracle gate → T3; the WSOBJ parser incl. `.P`/`.PH`/`.LD`/`.BD`/anchor → T4; bake + `just` recipe + committed artifact → T5; compare sheet → T6. Two spec items are **deliberately dropped and logged** in "Deviations": the battlezone oracle (circular — it would test a byte decoder star-wars never uses) and the generic dialect table (fake abstraction over two structurally different source formats).

**Corrections the plan makes to the spec.** The spec called `EXHAUST_PORT` a "hex verts + reconstructed edges" case. It has **no `.WL` draw list at all**, so it yields a *vertex* correction, not an edge diff — `hasDrawList` carries this through the IR, the artifact, and the sheet. The spec also implied the `(0,0,0)` anchor is universal; `WFF` has none, so the drop/rebase is conditional.

**Placeholders:** none. Every code step is complete; every command has an expected result.

**Type consistency:** `{point, draw}` is the connect op everywhere (T2/T3/T4). `RomModel{name, scale, hasDrawList, vertices, edges}` is emitted by `emitTs` (T5) and consumed by `romCompare.ts` (T6). `edgeKey`/`diffEdges` exist twice by necessity — once in `.mjs` (T2, for the node tests) and once in `.ts` (T6, for the browser build, which cannot import `.mjs` from `scripts/`); both are independently tested with identical cases, and the duplication is deliberate and noted.

**Ordering:** the oracle (T3) lands **before** the star-wars parser (T4), so no star-wars output is ever produced by an unvalidated parser.
