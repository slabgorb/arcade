# pm3-9 — Authentic maze drives core topology: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `plugins/pac-man/src/core/maze.ts`'s per-cell topology from the byte-cited authentic capture so render and gameplay share one source, turning the pm3-8 oracle green.

**Architecture:** A build-time tool (`tools/bake-core-maze.mjs`) classifies the vendored `maze-vram.bin` (via the existing `mazeCellOffset` decoder) into an authentic ASCII `MAZE_ROWS` table, stamps the ROM-geometry ghost house/gate over the attract-contaminated center, and emits a generated `src/core/maze-topology.generated.ts`. `core/maze.ts` imports that table; its `tileAt`/`kindOf`/`isWalkable`/`wrapThroughTunnel` API is unchanged. Coordinate-pinned gameplay tests re-baseline to the authentic geometry; behavioral invariants stay hard.

**Tech Stack:** TypeScript (Node ≥ 22.18 type-stripping for `.mjs` tools), Vitest (per-app project `pac-man`), Playwright MCP for the visual check, `node:test` orchestrator suite for wiring gates.

## Global Constraints

- **Core/shell purity:** nothing under `src/core/` may import from `src/shell/`, touch the DOM, a clock, or `Math.random`. `tests/purity.test.ts` scans `core/` source text. The generated module is pure ASCII data. — verbatim rule from the spec.
- **GPL firewall:** the maze topology's source of truth is the MAME capture (`reference/graphics/maze-vram.bin`) plus well-known ROM geometry (Dossier ch.3 "The Maze"); nothing is copied from `shaunlebron/pacman` (GPL v3, read-only reference only).
- **Byte-cited:** `TOTAL_PELLETS = 244` (`pacman.asm:20e6`, claim `MAZE-TOTAL-PELLETS`); `DOT_COUNT` stays **derived** (244 − energizers), never a second independent literal. The `MAZE-VRAM-CAPTURE` citation (pm3-8 Task 5, `reference/graphics/graphics.json`) already covers the capture bytes.
- **One decoder:** the tool unpacks the capture with `mazeCellOffset` from `src/shell/gfx-rom.ts` — no second copy of the scan-rows arithmetic.
- **pm3-2 tunnel-wrap survives:** `wrapThroughTunnel` keeps working, now anchored at the authentic `TUNNEL_ROW` (17), which is computed from the table (`findIndex 'T'`), never hardcoded.
- **Test filenames:** app tests are `plugins/pac-man/tests/**/**.test.ts`, run with `npx vitest run --project pac-man` from the repo root.
- **Branch:** all work lands on `feat/pm3-8-authentic-maze-tilemap` (co-ships pm3-8 + pm3-9).

**Measured anchors (verified 2026-08-08, re-derive to confirm — do not trust blind):**
- Classifier over the scan-ordered grid: 240 dots (`0x10`), 4 energizers (`0x14`), 596 wall-art (206–253), 168 path (`0x40`/`0`/letters 48–90), **0 unclassified**.
- Energizers at (x,y): **(1,6), (26,6), (1,26), (26,26)**.
- Tunnel row: the only interior row (3 ≤ y ≤ 32) with background at both col 0 and col 27 → **row 17**.
- House region (cols ~9–18, rows ~14–20) is over-painted by the attract GAME OVER banner: interior tiles are 252/253 (wall-art) + letters, **not** background — so the house is NOT readable from the capture and must be stamped from ROM geometry.

---

### Task 1: The core-maze bake tool + generated ASCII topology (dots/walls/energizers/tunnel + stamped house/gate)

**Files:**
- Create: `plugins/pac-man/tools/bake-core-maze.mjs`
- Create: `plugins/pac-man/src/core/maze-topology.generated.ts` (emitted by the tool)
- Test: `plugins/pac-man/tests/core/maze-topology.test.ts`

**Interfaces:**
- Consumes: `mazeCellOffset(sx, sy)` from `src/shell/gfx-rom.ts`; `reference/graphics/maze-vram.bin` (2048 bytes).
- Produces: `export const MAZE_ROWS: readonly string[]` — 36 strings, 28 chars each, alphabet `# . o ' ' = H T` (wall/dot/energizer/path/gate/house/tunnel), consumed by Task 2's `core/maze.ts`.

- [ ] **Step 1: Write the failing re-derivation test**

`plugins/pac-man/tests/core/maze-topology.test.ts`:

```ts
// tests/core/maze-topology.test.ts
// pm3-9 — the generated authentic core topology must equal a fresh classify-
// and-re-derive of maze-vram.bin (the byte-fidelity guard + the topology's
// byte-citation of record). House/gate are stamped from ROM geometry (the
// attract capture over-paints them) and are asserted structurally, not by tile.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { mazeCellOffset } from '../../src/shell/gfx-rom'
import { MAZE_ROWS } from '../../src/core/maze-topology.generated'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const vram = new Uint8Array(readFileSync(join(root, 'reference', 'graphics', 'maze-vram.bin')))
const tile = (sx: number, sy: number) => vram[mazeCellOffset(sx, sy)]
const DOT = 16, EN = 20

describe('authentic core topology (pm3-9)', () => {
  it('is 36 rows x 28 cols', () => {
    expect(MAZE_ROWS.length).toBe(36)
    for (const r of MAZE_ROWS) expect(r.length).toBe(28)
  })

  it('every dot/energizer/path cell matches the capture classifier', () => {
    for (let y = 3; y <= 32; y++)
      for (let x = 0; x < 28; x++) {
        const ch = MAZE_ROWS[y][x]
        if (ch === '.') expect(tile(x, y), `dot ${x},${y}`).toBe(DOT)
        if (ch === 'o') expect(tile(x, y), `energizer ${x},${y}`).toBe(EN)
      }
  })

  it('places exactly 240 dots and 4 energizers (pacman.asm:20e6 => 244)', () => {
    const flat = MAZE_ROWS.join('')
    expect([...flat].filter((c) => c === '.').length).toBe(240)
    expect([...flat].filter((c) => c === 'o').length).toBe(4)
  })

  it('has exactly one tunnel row, open (T) at both ends, at row 17', () => {
    const rows = MAZE_ROWS.map((r, y) => (r.includes('T') ? y : -1)).filter((y) => y >= 0)
    expect(rows).toEqual([17])
    expect(MAZE_ROWS[17][0]).toBe('T')
    expect(MAZE_ROWS[17][27]).toBe('T')
  })

  it('stamps a contiguous ghost house with a gate at its top', () => {
    const flat = MAZE_ROWS.join('')
    expect([...flat].filter((c) => c === 'H').length).toBeGreaterThan(10)
    expect([...flat].filter((c) => c === '=').length).toBe(2) // two-tile door
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run --project pac-man tests/core/maze-topology.test.ts`
Expected: FAIL — `Cannot find module '../../src/core/maze-topology.generated'`.

- [ ] **Step 3: Write the bake tool**

`plugins/pac-man/tools/bake-core-maze.mjs`:

```js
#!/usr/bin/env node
// tools/bake-core-maze.mjs — regenerate src/core/maze-topology.generated.ts
// (the authentic core maze ASCII table) from the citation-gated
// reference/graphics/maze-vram.bin (pm3-9).
//
// wall/dot/energizer/path + the tunnel row are classified from the capture.
// The ghost HOUSE and GATE are NOT readable from this attract capture — the
// GAME OVER banner over-paints the house interior with solid tiles — so they
// are STAMPED from well-known ROM geometry (Dossier ch.3 "The Maze"), aligned
// to this layout's coordinates, and asserted structurally by the topology test.
// GPL firewall: nothing copied from shaunlebron/pacman.
//
// Usage:  node plugins/pac-man/tools/bake-core-maze.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mazeCellOffset } from '../src/shell/gfx-rom.ts'

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const vram = readFileSync(join(pluginRoot, 'reference', 'graphics', 'maze-vram.bin'))
if (vram.length !== 2048) throw new Error(`maze-vram.bin is ${vram.length} bytes, expected 2048`)

const COLS = 28, ROWS = 36
const DOT = 0x10, EN = 0x14, SPACE = 0x40
const isWallArt = (t) => t >= 206 && t <= 253
const isLetter = (t) => t >= 48 && t <= 90
const tile = (sx, sy) => vram[mazeCellOffset(sx, sy)]

// 1) classify playfield rows 3..32; HUD rows 0-2 & 33-35 are all-wall bands.
const grid = Array.from({ length: ROWS }, (_, y) =>
  Array.from({ length: COLS }, (_, x) => {
    if (y < 3 || y > 32) return '#'
    const t = tile(x, y)
    if (t === DOT) return '.'
    if (t === EN) return 'o'
    if (isWallArt(t)) return '#'
    if (t === SPACE || t === 0 || isLetter(t)) return ' '
    throw new Error(`unclassified tile ${t} at ${x},${y}`)
  }),
)

// 2) tunnel: the unique INTERIOR row open (background) at both edges.
const tunnelRows = []
for (let y = 3; y <= 32; y++) {
  const l = tile(0, y), r = tile(COLS - 1, y)
  if ((l === SPACE || l === 0) && (r === SPACE || r === 0)) tunnelRows.push(y)
}
if (tunnelRows.length !== 1) throw new Error(`expected 1 interior tunnel row, got ${tunnelRows}`)
const TUNNEL = tunnelRows[0] // 17
grid[TUNNEL][0] = 'T'
grid[TUNNEL][COLS - 1] = 'T'

// 3) ghost house + gate — ROM geometry stamped over the attract-contaminated
//    center. Rectangle interior => 'H', two-tile door at its top => '='.
//    (Dossier ch.3: the house is a central rectangle, ghosts inside, one
//    two-tile door pac-man may not cross.) Anchors verified against the oracle
//    + gameplay in Task 2/3; adjust HOUSE_* here if the oracle demands it.
const HOUSE_TOP = 15, HOUSE_BOT = 18, HOUSE_L = 11, HOUSE_R = 16
const GATE_ROW = 14, GATE_L = 13, GATE_R = 14
for (let y = HOUSE_TOP; y <= HOUSE_BOT; y++)
  for (let x = HOUSE_L; x <= HOUSE_R; x++) grid[y][x] = 'H'
grid[GATE_ROW][GATE_L] = '='
grid[GATE_ROW][GATE_R] = '='

const rows = grid.map((r) => r.join(''))
for (const [i, r] of rows.entries())
  if (r.length !== COLS) throw new Error(`row ${i} has ${r.length} cols`)

const HEADER =
  '// GENERATED by tools/bake-core-maze.mjs from the citation-gated\n' +
  '// reference/graphics/maze-vram.bin (MAME video RAM 0x4000-0x43ff); do not\n' +
  '// hand-edit. tests/core/maze-topology.test.ts re-derives this and asserts\n' +
  '// equality. wall/dot/energizer/path/tunnel are classified from the capture;\n' +
  '// the ghost HOUSE and GATE are stamped from ROM geometry (Dossier ch.3) —\n' +
  '// the attract capture over-paints the house with a GAME OVER banner. GPL\n' +
  "// firewall: nothing copied from shaunlebron/pacman.\n"

const body =
  HEADER +
  '\n/** The authentic 28x36 maze topology, one char per tile:\n' +
  " *  '#' wall  '.' dot  'o' energizer  ' ' path  '=' gate  'H' house  'T' tunnel */\n" +
  'export const MAZE_ROWS: readonly string[] = [\n' +
  rows.map((r) => `  '${r}',`).join('\n') +
  '\n]\n'

const out = join(pluginRoot, 'src', 'core', 'maze-topology.generated.ts')
writeFileSync(out, body)
console.log(`wrote ${out} (${ROWS}x${COLS}; tunnel row ${TUNNEL})`)
```

- [ ] **Step 4: Run the tool to emit the generated module**

Run: `node plugins/pac-man/tools/bake-core-maze.mjs`
Expected: prints `wrote .../maze-topology.generated.ts (36x28; tunnel row 17)`; the file exists.

- [ ] **Step 5: Run the re-derivation test to verify it passes**

Run: `npx vitest run --project pac-man tests/core/maze-topology.test.ts`
Expected: PASS — all five cases green (240 dots, 4 energizers, tunnel row 17, house > 10 / gate == 2).
If "stamps a contiguous ghost house" fails, tune `HOUSE_*`/`GATE_*` in the tool, re-run Step 4, re-run this test.

- [ ] **Step 6: Commit**

```bash
git add plugins/pac-man/tools/bake-core-maze.mjs plugins/pac-man/src/core/maze-topology.generated.ts plugins/pac-man/tests/core/maze-topology.test.ts
git commit -m "feat(pm3-9): bake authentic core maze topology from the vram capture"
```

---

### Task 2: Wire `core/maze.ts` to the authentic table; turn the pm3-8 oracle green

**Files:**
- Modify: `plugins/pac-man/src/core/maze.ts` (replace the inline `MAZE_ROWS` pm1-3 table with the generated import; keep HUD assembly, guards, and the whole public API)
- Modify: `plugins/pac-man/tests/shell/maze-tilemap.test.ts` (revise ONLY the house sub-test for the documented GAME OVER contamination — see Step 3)
- Test: existing `tests/shell/maze-tilemap.test.ts` (the pm3-8 oracle) + `tests/core/maze.test.ts`

**Interfaces:**
- Consumes: `MAZE_ROWS` from `src/core/maze-topology.generated` (Task 1).
- Produces: unchanged exports `MAZE`, `tileAt`, `isWalkable`, `TUNNEL_ROW`, `ENERGIZER_TILES`, `DOT_COUNT`, `wrapThroughTunnel`, `kindOf`, types `TileKind`/`Tile`/`Actor`/`MazeSpec`.

- [ ] **Step 1: Point `maze.ts` at the generated table**

In `plugins/pac-man/src/core/maze.ts`, delete the inline `const MAZE_ROWS = [...]` literal (the pm1-3 reconstruction, currently lines ~63–106) and its GPL-firewall/"NOT byte-cited" header block (lines ~7–32), and import instead:

```ts
// The authentic per-cell topology, baked byte-for-byte from the MAME video-RAM
// capture by tools/bake-core-maze.mjs (pm3-9). Replaces pm1-3's non-byte-cited
// reconstruction; re-derivation is pinned by tests/core/maze-topology.test.ts.
// GPL firewall: source is the capture + ROM geometry, not shaunlebron/pacman.
import { MAZE_ROWS } from './maze-topology.generated'
```

Keep `const ROWS = [HUD_ROW, HUD_ROW, HUD_ROW, ...MAZE_ROWS.slice(3, 33), HUD_ROW, HUD_ROW, HUD_ROW]`
**only if** the generated table's HUD rows differ from `HUD_ROW`; since Task 1 already emits rows 0–2 and 33–35 as all-`#`, simplify to `const ROWS = MAZE_ROWS`. Verify the load-time guards (`ROWS.length === 36`, each row 28 cols, exactly one `T`, `DOT_COUNT_FROM_TABLE === 244 − energizers`) still pass unchanged.

- [ ] **Step 2: Run the core maze test to verify the wiring**

Run: `npx vitest run --project pac-man tests/core/maze.test.ts`
Expected: the module-load guards pass (no throw). Some coordinate-pinned cases (energizer positions, dot walkability spots) may fail — those re-baseline in Task 3. Note which fail; do NOT fix them here.

- [ ] **Step 3: Revise the oracle's house sub-test for the documented contamination**

The pm3-8 oracle's house sub-test (`tests/shell/maze-tilemap.test.ts`, the "ghost-house band has an interior of background tiles" case) counts core `house` cells whose capture tile is `0x40`. The attract capture over-paints the house with the GAME OVER banner (tiles 252/253 + letters), so a faithful house cannot satisfy "capture shows background there." Replace that ONE case with a contamination-robust hollowness assertion that does not depend on the over-painted tiles:

```ts
it('core marks a contiguous ghost house that holds no dots (hollow interior)', () => {
  // The attract capture over-paints the house with GAME OVER, so we cannot
  // assert the capture shows background inside the house. Instead assert the
  // structural fact: core's house region is a real enclosed house — a block of
  // >10 'house' cells, none of which is a dot/energizer (a house is hollow of
  // pellets), all pac-man-impassable. pm3-9: house is ROM-geometry-stamped.
  let houseCells = 0
  for (let ty = 0; ty < 36; ty++)
    for (let tx = 0; tx < 28; tx++)
      if (tileAt(tx, ty) === 'house') {
        houseCells++
        expect(isWalkable(tx, ty, 'pac-man'), `pac-man barred at house ${tx},${ty}`).toBe(false)
        expect(isWalkable(tx, ty, 'ghost'), `ghost allowed in house ${tx},${ty}`).toBe(true)
      }
  expect(houseCells).toBeGreaterThan(10)
})
```

Add `isWalkable` to the existing `core/maze` import in that test file. Leave the other four oracle cases (dot cells, energizer cells, four-energizer count, tunnel row open) **unchanged** — those pass against the authentic core.

- [ ] **Step 4: Run the full oracle to verify it is green**

Run: `npx vitest run --project pac-man tests/shell/maze-tilemap.test.ts`
Expected: PASS — all cases green (byte-equality, every dot cell 0x10, 4 energizers, tunnel open edge-to-edge, house hollow-of-pellets & pac-man-barred).
If the tunnel-open case fails, the generated tunnel row and `TUNNEL_ROW` disagree with `MAZE_TILES` — re-check Task 1's tunnel derivation.

- [ ] **Step 5: Commit**

```bash
git add plugins/pac-man/src/core/maze.ts plugins/pac-man/tests/shell/maze-tilemap.test.ts
git commit -m "feat(pm3-9): core/maze consumes the authentic topology; oracle green"
```

---

### Task 3: Re-baseline coordinate-pinned gameplay tests to the authentic geometry

**Files:**
- Modify: `plugins/pac-man/tests/core/maze.test.ts`
- Modify: `plugins/pac-man/tests/core/ghost.test.ts`
- Modify: `plugins/pac-man/tests/core/game.test.ts`
- Modify: `plugins/pac-man/tests/core/targeting.test.ts` (if it pins maze coordinates)
- Modify: `plugins/pac-man/tests/core/pacman.test.ts` (if it pins maze coordinates)

**Interfaces:**
- Consumes: the authentic exports from Task 2 (`tileAt`, `isWalkable`, `ENERGIZER_TILES`, `TUNNEL_ROW`).
- Produces: a green `pac-man` project. No production code changes in this task unless a failure is a genuine behavioral bug (see the decision rule).

- [ ] **Step 1: Enumerate the failures against the authentic tree**

Run: `npx vitest run --project pac-man 2>&1 | tee /tmp/pm3-9-fails.txt`
Expected: a set of failures concentrated in the files above, each a hardcoded coordinate read off the OLD pm1-3 table (e.g. `ENERGIZER_TILES` positions, junction `(12,8)`, red-zone `(12,14)`, `blinky.yPx = 14*8`, `pinky.yPx = 17*8`). Record the list.

- [ ] **Step 2: Re-derive the authentic anchors**

Run this to print the authentic values to substitute:

```bash
cd plugins/pac-man && node --input-type=module -e '
import { tileAt, isWalkable, ENERGIZER_TILES, TUNNEL_ROW } from "./src/core/maze.ts";
console.log("TUNNEL_ROW", TUNNEL_ROW);
console.log("ENERGIZERS", JSON.stringify(ENERGIZER_TILES));
// print the maze as ASCII kinds so junctions/house can be read off it
for (let y=0;y<36;y++){let s="";for(let x=0;x<28;x++){const k=tileAt(x,y);
  s+= k==="wall"?"#":k==="dot"?".":k==="energizer"?"o":k==="house"?"H":k==="gate"?"=":k==="tunnel"?"T":" ";}
  console.log(String(y).padStart(2), s);}'
```

Expected: `TUNNEL_ROW 17`, energizers `[{1,6},{26,6},{1,26},{26,26}]`, and a printed authentic maze to read new junction / red-zone / spawn coordinates from.

- [ ] **Step 3: Apply the decision rule per failure**

For each failing assertion:
- **Coordinate literal stale** (the assertion pins a tile/position that simply moved) → update it to the authentic value from Step 2. Prefer deriving from the exports (`ENERGIZER_TILES`, `TUNNEL_ROW`) over re-hardcoding where the test already does so.
- **Genuine behavioral change** (e.g. a ghost junction that no longer has the walkable neighbour the red-zone rule needs, or pac-man reaching a tile it shouldn't) → this is a real fact about the authentic maze. Re-anchor the test to a tile that still exercises the rule; if the RULE itself is now wrong (a production bug in `isWalkable`/targeting), fix the production code, not the assertion. **Never** loosen a behavioral invariant (244 pellets, tunnel-wrap@17, pac-man barred from house/gate) to force green.

Update the coordinate comments too (e.g. `ghost.test.ts`'s "junction (12,8) read off maze.ts" header) so the archived test explains the authentic anchor, per the repo's citation discipline.

- [ ] **Step 4: Run the full project to verify green**

Run: `npx vitest run --project pac-man`
Expected: PASS — every `pac-man` test green, including the Task 1/2 oracle + topology tests and the purity sweep.

- [ ] **Step 5: Commit**

```bash
git add plugins/pac-man/tests/core/
git commit -m "test(pm3-9): re-baseline gameplay coordinates to the authentic maze"
```

---

### Task 4: Control render + Playwright visual of the authentic maze

**Files:**
- Test/artifact: a screenshot saved under the scratchpad or `plugins/pac-man/` reference notes; no production change expected.

**Interfaces:**
- Consumes: the running dev server (`just serve` on 127.0.0.1:5270, or a private port per the CLAUDE.md pin caveat) serving `/pac-man/`.

- [ ] **Step 1: Serve this checkout's tree on a private port**

Run: `npx vite --port 5291 --strictPort` (from repo root) — avoids colliding with a sibling on 5270 (CLAUDE.md "prove whose server answers").

- [ ] **Step 2: Capture the maze with Playwright MCP**

Navigate to `http://127.0.0.1:5291/pac-man/`, start a game to render the playfield, and take a screenshot. (Held-key trick per the arcade-visual-playtest memory if input is needed.)
Expected: a recognizable authentic Pac-Man maze — correct outer double-wall, side pockets, central ghost house, tunnel on row 17, energizers in the four corners of the play area.

- [ ] **Step 3: Compare against the reference maze shape**

Confirm visually: no broken blue wall-dashes, no stray peach bars, board upright and correctly coloured (the pm3-8 garble is gone). Record the screenshot path in the SDD ledger.

- [ ] **Step 4: Commit any notes**

```bash
git add -A && git commit -m "chore(pm3-9): visual verification of the authentic maze render" --allow-empty
```

---

### Task 4b: Fix the maze wall-tile 90° rotation in the shell render (discovered by Task 4)

**Discovery:** Task 4's Playwright visual revealed the maze walls render 90°-rotated (fragmented blue
dashes), despite suite + oracle green. Root cause: `drawMaze` (`render.ts:267`) blits
`mazeTileImageData(MAZE_TILES[ty][tx])` using the **un-rotated** `TILES`, but Pac-Man's cabinet is ROT90,
so directional wall-art points the wrong way. Dots/energizers are rotation-symmetric so they looked fine.
The identical fix already exists in the same file for digit glyphs: `rotatedDigitPixel` (`x'=y, y'=7-x`,
90°CW). The pm3-7 comment claiming rotation is "invisible for the maze" was true under the retired
`fillRect` autotiler but became false when pm3-8 switched the maze to tile blits.

**Files:**
- Modify: `plugins/pac-man/src/shell/render.ts` (generalize `rotatedDigitPixel` → `rotatedTilePixel`; use it in `mazeTileImageData`; fix the now-false comments at ~416-417, 426)
- Test: `plugins/pac-man/tests/shell/` (a new orientation pin for the maze blit)

**Interfaces:**
- Consumes: `TILES` (tile-data.ts, unchanged — stays raw-oriented).
- Produces: `rotatedTilePixel(tileIndex, x, y)` reused by both the maze blit and the digit path.

- [ ] **Step 1: Write the failing orientation test.** Pin the maze-blit orientation with an asymmetric
  wall tile. Tile **219** (raw = left-vertical band: cols 0-3 filled, all rows) fills row 3 (the maze's
  top *horizontal* border), so after the ROT90 fix its rendered pixels must be a **top-horizontal band**
  (rows 0-3 lit, all cols), NOT a left-vertical band. Prefer testing a pure rotation helper
  (`rotatedTilePixel`) so no canvas is needed; if you test `mazeTileImageData` directly, follow the
  existing render-test canvas pattern. Concretely assert, for tile 219: `rotatedTilePixel(219, x, y)` is
  non-zero for `y in 0..3` (all x) and zero for `y in 4..7`. This FAILS on current code (no such helper /
  un-rotated blit).
- [ ] **Step 2: Run it — expect RED** (`npx vitest run --project pac-man <the new test>`).
- [ ] **Step 3: Implement.** Generalize `rotatedDigitPixel(digit, x, y)` into
  `rotatedTilePixel(tileIndex, x, y)` (same body: `rawX = y; rawY = 7 - x; return TILES[tileIndex][rawY*8 + rawX]`).
  Keep a `rotatedDigitPixel` call-through or update the digit call site. In `mazeTileImageData`, replace
  `const on = pixels[k] !== 0` with a read through `rotatedTilePixel(tileIndex, k % 8, (k/8)|0) !== 0`
  (build the ImageData from the rotated pixel). Fix the stale comments at ~416-417 and ~426 that claim the
  maze needs no rotation — state that since pm3-8 the maze blits tiles and uses this same rotation.
- [ ] **Step 4: Run the new test — expect GREEN.**
- [ ] **Step 5: Run the whole pac-man project** (`npx vitest run --project pac-man`) — must stay green
  (the rotation touches only rendered pixels; oracle checks tile indices, gameplay is core-only).
- [ ] **Step 6: Commit** (`fix(pm3-9): rotate maze wall tiles ROT90 to match the cabinet (was fragmented)`).

---

### Task 4c: Re-run the Playwright visual to confirm the fix

Same procedure as Task 4 (serve on port 5291, Playwright headless, screenshot `/pac-man/`). Acceptance:
the walls now render as **continuous double-line corridors** (no fragmented dashes), no stray peach bars,
board upright and correctly coloured, ghost house + tunnel + four corner energizers present. Save the new
screenshot to the workspace and record the verdict in the ledger. Commit `--allow-empty` if no code change.

---

### Task 5: Full-suite + gates verification

**Files:** none (verification only).

- [ ] **Step 1: Run the pac-man project**

Run: `npx vitest run --project pac-man`
Expected: PASS (all green).

- [ ] **Step 2: Run the citations + purity gates**

Run: `npx vitest run --project pac-man tests/purity.test.ts tests/audit/citations.test.ts` (adjust paths to the actual gate tests).
Expected: PASS — purity sweep clean (no shell import / clock / random in `core/`, generated module included), citations gate green (`MAZE-VRAM-CAPTURE` intact).

- [ ] **Step 3: Run the orchestrator suite**

Run (repo root): `npm run test:orchestrator`
Expected: PASS — cabinet wiring invariants unaffected.

- [ ] **Step 4: Run the type check**

Run (repo root): `npm run lint`
Expected: PASS — `tsc --noEmit` clean across the repo.

- [ ] **Step 5: Final commit / ready for review**

```bash
git commit --allow-empty -m "chore(pm3-9): full suite + gates green — authentic maze drives both"
```

---

## Self-Review

**Spec coverage:**
- §1 architecture (tool → generated module → core import, purity/GPL boundary) → Task 1 + Task 2 Step 1. ✓
- §2 classifier + tunnel derivation → Task 1 Steps 3–5. ✓
- §2 house/gate geometric re-derivation → Task 1 house-stamp + the discovered contamination handled in Task 2 Step 3. ✓
- §3 HUD & 1:1 alignment → Task 1 (HUD all-`#`), Task 2 (oracle byte-equality unchanged). ✓
- §4 invariants (244/DOT_COUNT derived, tunnel-wrap@17, purity, GPL, citation) → Task 2 guards + Task 5 gates. ✓
- §5 oracle green → Task 2; new re-derivation test → Task 1; re-baseline → Task 3; control render + Playwright → Task 4. ✓
- §6 risks (re-baseline hides a bug; house ambiguity; generated module purity) → Task 3 Step 3 decision rule; Task 2 Step 3; Task 5 Step 2. ✓

**Placeholder scan:** house/gate anchors (`HOUSE_*`, `GATE_*`) are concrete starting values with an explicit "tune to the oracle" procedure — empirical by nature, not a placeholder. Re-baseline coordinates are re-derived by a concrete command (Task 3 Step 2), not left as "update as needed."

**Type consistency:** `MAZE_ROWS: readonly string[]` produced by Task 1, consumed by Task 2; `tileAt`/`isWalkable`/`ENERGIZER_TILES`/`TUNNEL_ROW` signatures unchanged from the current `core/maze.ts`; oracle test imports match.

**Known implementation risk (flagged, not a placeholder):** the exact ghost-house rectangle is empirical — the anchors in Task 1 are the starting point and Task 2's oracle + Task 3's gameplay tests are the acceptance signal. If they cannot be reconciled with a faithful house, that is a genuine finding to escalate, per the spec's §6.
