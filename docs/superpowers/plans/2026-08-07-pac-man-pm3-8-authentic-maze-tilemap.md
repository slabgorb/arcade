# pm3-8 — Authentic maze tilemap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the malformed heuristic maze autotiler with the authentic per-cell Pac-Man maze tilemap, dumped from MAME video RAM, baked to committed JS, and cited under the graphics gate.

**Architecture:** Dump `:maincpu` video RAM (`0x4000–0x43FF`) and colour RAM (`0x4400–0x47FF`) from MAME running the vendored `pacman` romset, once, into a committed `maze-vram.bin`. A pure decoder unpacks it — via MAME's own `pacman_scan_rows` mapper — into a 28×36 `{tileIndex, colorCode}` grid, baked to `maze-tilemap-data.ts`. `render.ts` consumes that grid directly; the `wallTileFor` neighbour autotiler and its `WALL_*` constants retire. Core is untouched; a built-in oracle (baked dot/energizer cells must equal `core/maze.ts`'s) pins correctness.

**Tech Stack:** TypeScript (strict), Vitest, Node ≥ 22.18 (`.mjs` bake tools using native `.ts` import), MAME 0.288 Lua (`-autoboot_script`), the existing `tools/bake-graphics.mjs` + `src/shell/gfx-rom.ts` decode pipeline.

## Global Constraints

- Node ≥ 22.18 (repo `engines`); `scripts/`/`tools/` import `.ts` directly via type-stripping.
- Core/shell boundary holds: **no change to `plugins/pac-man/src/core/`**. `tests/purity.test.ts` scans `core/` for shell imports.
- `TOTAL_PELLETS` stays 244 (`pacman.asm:20e6`); `DOT_COUNT` stays derived from the `ROWS` table — do not touch `core/maze.ts`.
- GPL firewall: `shaunlebron/pacman` is a read-only oracle, zero lines copied. MAME is the tiebreaker; its arithmetic (`pacman_scan_rows`) is **cited, re-implemented, not copied wholesale**.
- Silent-404 trap avoided: the tilemap ships as committed JS (`maze-tilemap-data.ts`) — zero runtime asset fetch. The `.bin` and MAME are build-time only.
- Every generated module carries the `tools/bake-graphics.mjs` GENERATED header and is re-derivable byte-for-byte by its test.
- All commands run from the **repo root** (`/Users/slabgorb/Projects/a-2`). The vitest project id equals the plugin directory name: `pac-man`.
- Work on branch `feat/pm3-8-authentic-maze-tilemap` (already created). `develop` is protected — never commit to it.

## Reference facts (verified, cite these verbatim)

- MAME `pacman_v.cpp:170` `pacman_state::pacman_scan_rows`:
  ```
  row += 2;
  col -= 2;
  if (col & 0x20)
      return row + ((col & 0x1f) << 5);   // :175
  else
      return col + (row << 5);            // :177
  ```
  Tilemap is created `8, 8, 36, 28` (`pacman_v.cpp:225`) — 36 cols × 28 rows, screen is ROT90.
- MAME `pacman.cpp:1053-1054`: `videoram` = `0x4000–0x43ff`, `colorram` = `0x4400–0x47ff`.
- MAME `pacman_v.cpp:183`: tile colour attr = `(m_colorram[tile_index] & 0x1f) | (m_colortablebank << 5) | (m_palettebank << 6)`. For the stock `pacman` set both banks are 0, so **`colorCode = colorByte & 0x1f`**.
- `DOT_TILE = 16` (0x10, byte-cited `pacman.asm:2463`), `ENERGIZER_TILE = 20` (0x14) — current `render.ts:113,121`.
- Baked-data precedent + GENERATED header: `plugins/pac-man/tools/bake-graphics.mjs`. Pure decoders live in `plugins/pac-man/src/shell/gfx-rom.ts`.

---

### Task 1: Capture & vendor the maze video-RAM dump

**Files:**
- Create: `plugins/pac-man/tools/dump-maze-vram.lua`
- Create: `plugins/pac-man/tools/dump-maze-vram.mjs`
- Create (artifact, committed): `plugins/pac-man/reference/graphics/maze-vram.bin`
- Modify: `plugins/pac-man/reference/PROVENANCE.md` (append a section)

**Interfaces:**
- Produces: `reference/graphics/maze-vram.bin` — exactly 2048 bytes: `[0..0x3ff]` = video RAM `0x4000–0x43ff`, `[0x400..0x7ff]` = colour RAM `0x4400–0x47ff`.

- [ ] **Step 1: Write the MAME autoboot Lua dumper**

Create `plugins/pac-man/tools/dump-maze-vram.lua`:

```lua
-- plugins/pac-man/tools/dump-maze-vram.lua
-- Dumps Pac-Man video RAM (0x4000-0x43ff) + colour RAM (0x4400-0x47ff) to a
-- flat 2048-byte file once the attract-mode maze has drawn. MAME 0.288 API.
-- Env: MAZE_VRAM_OUT (output path), MAZE_VRAM_FRAME (frame to dump at).
local out = assert(os.getenv("MAZE_VRAM_OUT"), "set MAZE_VRAM_OUT")
local target = tonumber(os.getenv("MAZE_VRAM_FRAME") or "1500")
local n, done = 0, false
emu.add_machine_frame_notifier(function()
  if done then return end
  n = n + 1
  if n < target then return end
  done = true
  local mem = manager.machine.devices[":maincpu"].spaces["program"]
  local f = assert(io.open(out, "wb"))
  for addr = 0x4000, 0x47ff do
    f:write(string.char(mem:read_u8(addr)))
  end
  f:close()
  print(string.format("[dump-maze-vram] wrote %s at frame %d", out, n))
  manager.machine:exit()
end)
```

- [ ] **Step 2: Write the runner that invokes MAME**

Create `plugins/pac-man/tools/dump-maze-vram.mjs`:

```js
#!/usr/bin/env node
// tools/dump-maze-vram.mjs — run MAME headless on the vendored `pacman` romset
// and dump video+colour RAM to reference/graphics/maze-vram.bin (pm3-8).
// One-time / human-run; never CI, never runtime. Requires MAME + ~/roms/pacman.zip.
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const toolsDir = dirname(fileURLToPath(import.meta.url))
const pluginRoot = join(toolsDir, '..')
const out = join(pluginRoot, 'reference', 'graphics', 'maze-vram.bin')
const romPath = process.env.PACMAN_ROMPATH || join(homedir(), 'roms')
const frame = process.env.MAZE_VRAM_FRAME || '1500'

const args = [
  'pacman',
  '-rompath', romPath,
  '-video', 'none',
  '-sound', 'none',
  '-nothrottle',
  '-seconds_to_run', '40',
  '-autoboot_script', join(toolsDir, 'dump-maze-vram.lua'),
]
const r = spawnSync(process.env.MAME_BIN || 'mame', args, {
  stdio: 'inherit',
  env: { ...process.env, MAZE_VRAM_OUT: out, MAZE_VRAM_FRAME: frame },
})
if (r.status !== 0) {
  console.error(`mame exited ${r.status}; is MAME installed and ${romPath}/pacman.zip present?`)
  process.exit(1)
}
console.log(`dump complete: ${out}`)
```

- [ ] **Step 3: Run the dumper**

Run: `node plugins/pac-man/tools/dump-maze-vram.mjs`
Expected: prints `[dump-maze-vram] wrote …maze-vram.bin at frame 1500` then `dump complete`.

- [ ] **Step 4: Verify the artifact size and that it is not a blank maze**

Run:
```bash
wc -c < plugins/pac-man/reference/graphics/maze-vram.bin   # expect 2048
node -e "const b=require('fs').readFileSync('plugins/pac-man/reference/graphics/maze-vram.bin'); let dots=0; for(let i=0;i<0x400;i++) if(b[i]===0x10) dots++; console.log('dot tiles (0x10):', dots)"
```
Expected: `2048`, and dot-tile count in the **200–244** range (a fully-drawn attract maze). If the count is ~0, the dump landed on the pre-maze intro screen — re-run with `MAZE_VRAM_FRAME=2400 node plugins/pac-man/tools/dump-maze-vram.mjs` and re-check. (Task 6's oracle is the authoritative positional check; this step just rejects an obviously-blank capture early.)

- [ ] **Step 5: Record provenance**

Compute checksums:
```bash
shasum -a 1 plugins/pac-man/reference/graphics/maze-vram.bin
crc32 plugins/pac-man/reference/graphics/maze-vram.bin 2>/dev/null || node -e "const b=require('fs').readFileSync('plugins/pac-man/reference/graphics/maze-vram.bin');let c=~0>>>0;for(const x of b){c^=x;for(let k=0;k<8;k++)c=(c>>>1)^(0xEDB88320&-(c&1))}console.log(((~c)>>>0).toString(16).padStart(8,'0'))"
```
Append to `plugins/pac-man/reference/PROVENANCE.md`:

```markdown
## Maze tilemap capture (added pm3-8 — the authentic maze layout)

`pacman.asm` is the program ROM; the maze wall/dot/energizer arrangement is not a
static table there (the `0x35b5` table only places dots). It is **video-RAM state**
the program ROM builds at level start. Captured from MAME 0.288 running the vendored
`pacman` romset (`~/roms/pacman.zip`), attract-mode maze fully drawn:

- `reference/graphics/maze-vram.bin` — 2048 bytes. `[0..0x3ff]` = video RAM
  `0x4000–0x43ff` (tile indices), `[0x400..0x7ff]` = colour RAM `0x4400–0x47ff`.
  Regenerate with `node tools/dump-maze-vram.mjs`.
  **SHA-1 `<paste>`**, CRC32 `<paste>`.
- **Decoder authority:** MAME `pacman_v.cpp:170` `pacman_scan_rows` (video-RAM offset
  ↔ 36×28 tilemap) and `pacman_v.cpp:183` (colour attr `colorram & 0x1f`, banks 0 for
  stock `pacman`). Cited, re-implemented in `src/shell/gfx-rom.ts`, not copied.
```

- [ ] **Step 6: Commit**

```bash
git add plugins/pac-man/tools/dump-maze-vram.lua plugins/pac-man/tools/dump-maze-vram.mjs plugins/pac-man/reference/graphics/maze-vram.bin plugins/pac-man/reference/PROVENANCE.md
git commit -m "feat(pm3-8): vendor authentic maze video-RAM dump from MAME"
```

---

### Task 2: `pacman_scan_rows` decoder + screen-cell offset (pure, TDD)

**Files:**
- Modify: `plugins/pac-man/src/shell/gfx-rom.ts` (append two functions)
- Test: `plugins/pac-man/tests/shell/maze-scan.test.ts`

**Interfaces:**
- Produces:
  - `pacmanScanRows(col: number, row: number): number` — MAME mapper, `col` 0..35, `row` 0..27, returns a `0..0x3ff` offset.
  - `mazeCellOffset(sx: number, sy: number): number` — screen cell (`sx` 0..27 column, `sy` 0..35 row) → RAM offset. Primary orientation: `pacmanScanRows(sy, sx)`.

- [ ] **Step 1: Write the failing test**

Create `plugins/pac-man/tests/shell/maze-scan.test.ts`:

```ts
// tests/shell/maze-scan.test.ts
// pm3-8 — pins MAME's pacman_scan_rows mapper (pacman_v.cpp:170) that maps a
// (col,row) in the 36x28 tilemap to a video/colour-RAM offset.
import { describe, it, expect } from 'vitest'
import { pacmanScanRows, mazeCellOffset } from '../../src/shell/gfx-rom'

describe('pacmanScanRows (MAME pacman_v.cpp:170)', () => {
  it('playfield cells use the else branch: col + (row<<5)', () => {
    expect(pacmanScanRows(2, 0)).toBe(64) // col-2=0, row+2=2 -> 0 + (2<<5)
    expect(pacmanScanRows(3, 0)).toBe(65) // col-2=1 -> 1 + (2<<5)
    expect(pacmanScanRows(2, 1)).toBe(96) // row+2=3 -> 0 + (3<<5)
  })
  it('the two score/credit columns use the col&0x20 branch', () => {
    expect(pacmanScanRows(0, 0)).toBe(962) // col-2=-2 -> 2 + ((-2 & 0x1f)<<5) = 2 + (30<<5)
    expect(pacmanScanRows(34, 0)).toBe(2) // col-2=32 -> 2 + ((32 & 0x1f)<<5) = 2 + 0
    expect(pacmanScanRows(35, 27)).toBe(61) // col-2=33 -> 29 + ((33 & 0x1f)<<5) = 29 + 32
  })
  it('mazeCellOffset stays within the 0x400-byte RAM window for every screen cell', () => {
    for (let sy = 0; sy < 36; sy++)
      for (let sx = 0; sx < 28; sx++) {
        const off = mazeCellOffset(sx, sy)
        expect(off).toBeGreaterThanOrEqual(0)
        expect(off).toBeLessThan(0x400)
      }
  })
  it('mazeCellOffset maps distinct screen cells to distinct offsets (a bijection over the 28x36 grid)', () => {
    const seen = new Set<number>()
    for (let sy = 0; sy < 36; sy++)
      for (let sx = 0; sx < 28; sx++) seen.add(mazeCellOffset(sx, sy))
    expect(seen.size).toBe(28 * 36)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project pac-man plugins/pac-man/tests/shell/maze-scan.test.ts`
Expected: FAIL — `pacmanScanRows`/`mazeCellOffset` are not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `plugins/pac-man/src/shell/gfx-rom.ts`:

```ts
/** MAME `pacman_v.cpp:170` `pacman_scan_rows`: maps a (col,row) in Pac-Man's
 *  36x28 tilemap to a video/colour-RAM offset (0..0x3ff). Re-implemented from
 *  the driver arithmetic (`row += 2; col -= 2; if (col & 0x20) ...`), cited not
 *  copied. `col` 0..35, `row` 0..27. */
export function pacmanScanRows(col: number, row: number): number {
  const r = row + 2
  const c = col - 2
  if (c & 0x20) return r + ((c & 0x1f) << 5)
  return c + (r << 5)
}

/** Screen cell (sx: column 0..27, sy: row 0..35) -> RAM offset. Pac-Man's tube
 *  is ROT90, so a screen row is a tilemap column: col=sy, row=sx. (If Task 6's
 *  oracle rejects this orientation, it is one of exactly four candidates —
 *  see that task.) */
export function mazeCellOffset(sx: number, sy: number): number {
  return pacmanScanRows(sy, sx)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project pac-man plugins/pac-man/tests/shell/maze-scan.test.ts`
Expected: PASS (all four).

- [ ] **Step 5: Commit**

```bash
git add plugins/pac-man/src/shell/gfx-rom.ts plugins/pac-man/tests/shell/maze-scan.test.ts
git commit -m "feat(pm3-8): pacman_scan_rows video-RAM offset decoder"
```

---

### Task 3: Bake `maze-tilemap-data.ts` + byte-equality test

**Files:**
- Modify: `plugins/pac-man/tools/bake-graphics.mjs` (add `bakeMaze()` + call it)
- Create (GENERATED, committed): `plugins/pac-man/src/shell/maze-tilemap-data.ts`
- Test: `plugins/pac-man/tests/shell/maze-tilemap.test.ts` (byte-equality half; the oracle half is added in Task 6)

**Interfaces:**
- Consumes: `mazeCellOffset` (Task 2), `reference/graphics/maze-vram.bin` (Task 1).
- Produces: `export const MAZE_TILEMAP: readonly (readonly MazeCell[])[]` where `MazeCell = { tileIndex: number; colorCode: number }`; dimensions `[36][28]` (`[sy][sx]`).

- [ ] **Step 1: Add the bake function**

In `plugins/pac-man/tools/bake-graphics.mjs`, add an import for the decoder and a `bakeMaze()` beside `bakeTiles()`:

```js
// add to the existing import from '../src/shell/gfx-rom.ts':
//   decodePaletteFromProm, decodeColourLookupFromProm, decodeTilePixel, decodeSpritePixel, mazeCellOffset

function bakeMaze() {
  const vram = readFileSync(join(graphicsDir, 'maze-vram.bin')) // 2048 bytes
  if (vram.length !== 2048) throw new Error(`maze-vram.bin is ${vram.length} bytes, expected 2048`)
  const TILE_BASE = 0x000 // 0x4000-0x43ff
  const COLOR_BASE = 0x400 // 0x4400-0x47ff
  const COLS = 28
  const ROWS = 36
  const grid = Array.from({ length: ROWS }, (_, sy) =>
    Array.from({ length: COLS }, (_, sx) => {
      const off = mazeCellOffset(sx, sy)
      return { tileIndex: vram[TILE_BASE + off], colorCode: vram[COLOR_BASE + off] & 0x1f }
    }),
  )

  const body =
    HEADER +
    '//\n' +
    '// Source: reference/graphics/maze-vram.bin (MAME video RAM 0x4000-0x43ff +\n' +
    '// colour RAM 0x4400-0x47ff). Unpack: src/shell/gfx-rom.ts mazeCellOffset\n' +
    '// (MAME pacman_v.cpp:170 pacman_scan_rows); colorCode = colourByte & 0x1f.\n\n' +
    '/** One maze cell: a tile-ROM index and its 82s126.4a colour code. */\n' +
    'export interface MazeCell {\n  readonly tileIndex: number\n  readonly colorCode: number\n}\n\n' +
    '/** The authentic 28x36 maze tilemap [row sy][col sx], unpacked from the\n' +
    ' * cabinet\'s video+colour RAM. The maze-tilemap test re-derives this and\n' +
    ' * asserts byte-equality. Retires pm3-4\'s wallTileFor autotiler. */\n' +
    'export const MAZE_TILEMAP: readonly (readonly MazeCell[])[] = [\n' +
    grid
      .map((row) => '  [' + row.map((c) => `{ tileIndex: ${c.tileIndex}, colorCode: ${c.colorCode} }`).join(', ') + '],')
      .join('\n') +
    '\n]\n'

  writeFileSync(join(outDir, 'maze-tilemap-data.ts'), body)
  console.log(`wrote ${join(outDir, 'maze-tilemap-data.ts')} (${ROWS}x${COLS} cells)`)
}
```

Add `bakeMaze()` to the call list at the bottom of the file (after `bakeSprites()`).

- [ ] **Step 2: Run the bake**

Run: `node plugins/pac-man/tools/bake-graphics.mjs`
Expected: prints `wrote …/maze-tilemap-data.ts (36x28 cells)` among the other modules; `plugins/pac-man/src/shell/maze-tilemap-data.ts` now exists.

- [ ] **Step 3: Write the byte-equality test**

Create `plugins/pac-man/tests/shell/maze-tilemap.test.ts`:

```ts
// tests/shell/maze-tilemap.test.ts
// pm3-8 — the authentic maze tilemap. Half 1 (here): the baked module equals a
// fresh unpack of maze-vram.bin. Half 2 (Task 6): the semantic oracle.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { mazeCellOffset } from '../../src/shell/gfx-rom'
import { MAZE_TILEMAP } from '../../src/shell/maze-tilemap-data'
import { MAZE } from '../../src/core/maze'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const vram = new Uint8Array(readFileSync(join(root, 'reference', 'graphics', 'maze-vram.bin')))

describe('maze tilemap (pm3-8)', () => {
  it('is a 36x28 grid of {tileIndex, colorCode}', () => {
    expect(MAZE_TILEMAP.length).toBe(MAZE.rows) // 36
    for (const row of MAZE_TILEMAP) {
      expect(row.length).toBe(MAZE.cols) // 28
      for (const cell of row) {
        expect(cell.tileIndex).toBeGreaterThanOrEqual(0)
        expect(cell.tileIndex).toBeLessThanOrEqual(255)
        expect(cell.colorCode).toBeGreaterThanOrEqual(0)
        expect(cell.colorCode).toBeLessThanOrEqual(0x1f)
      }
    }
  })

  it('equals a fresh unpack of the vendored video+colour RAM', () => {
    for (let sy = 0; sy < MAZE.rows; sy++)
      for (let sx = 0; sx < MAZE.cols; sx++) {
        const off = mazeCellOffset(sx, sy)
        expect(MAZE_TILEMAP[sy][sx]).toEqual({
          tileIndex: vram[off],
          colorCode: vram[0x400 + off] & 0x1f,
        })
      }
  })
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project pac-man plugins/pac-man/tests/shell/maze-tilemap.test.ts`
Expected: PASS (both `it`s).

- [ ] **Step 5: Commit**

```bash
git add plugins/pac-man/tools/bake-graphics.mjs plugins/pac-man/src/shell/maze-tilemap-data.ts plugins/pac-man/tests/shell/maze-tilemap.test.ts
git commit -m "feat(pm3-8): bake authentic maze tilemap from video RAM"
```

---

### Task 4: Swap `render.ts` to the baked tilemap; retire the autotiler

**Files:**
- Modify: `plugins/pac-man/src/shell/render.ts`
- Modify: `plugins/pac-man/tests/shell/tiles.test.ts` (update the wall-colour assertion the autotiler owned)

**Interfaces:**
- Consumes: `MAZE_TILEMAP` from `./maze-tilemap-data` (Task 3).
- `drawMaze` keeps its signature: `drawMaze(ctx: CanvasRenderingContext2D, eaten?: ReadonlySet<string>): void`.

- [ ] **Step 1: Import the baked tilemap and rewrite `drawMaze`**

In `plugins/pac-man/src/shell/render.ts`, add near the other data imports:

```ts
import { MAZE_TILEMAP } from './maze-tilemap-data'
```

Replace the body of `drawMaze` (currently ~line 361) with:

```ts
export function drawMaze(ctx: CanvasRenderingContext2D, eaten: ReadonlySet<string> = new Set()): void {
  clearField(ctx, MAZE.cols * TILE_PX, MAZE.rows * TILE_PX)

  for (let ty = 0; ty < MAZE.rows; ty++) {
    for (let tx = 0; tx < MAZE.cols; tx++) {
      const kind = tileAt(tx, ty)
      // Eaten dots/energizers: skip so the corridor reads as cleared. The
      // authentic tilemap draws the pellet; the core `eaten` set removes it.
      if ((kind === 'dot' || kind === 'energizer') && eaten.has(`${tx},${ty}`)) continue

      const cell = MAZE_TILEMAP[ty][tx]
      ctx.putImageData(tileImageData(ctx, cell.tileIndex, cell.colorCode), tx * TILE_PX, ty * TILE_PX)
    }
  }
}
```

- [ ] **Step 2: Delete the retired autotiler and its constants**

Remove from `render.ts` (all pm3-4 autotiler machinery, now dead):
- `wallTileFor` (the whole function, ~line 165).
- The old `export const MAZE_TILEMAP` computed grid (~line 199) and its `TileCell` interface if unused elsewhere.
- `isHudRow` (~line 135).
- The wall-tile constants: `WALL_H_TILE`, `WALL_V_TILE`, `WALL_CORNER_DOWN_RIGHT_TILE`, `WALL_CORNER_DOWN_LEFT_TILE`, `WALL_CORNER_UP_RIGHT_TILE`, `WALL_CORNER_UP_LEFT_TILE`, `WALL_COLOR_CODE`, `DOT_TILE`, `ENERGIZER_TILE`, `PELLET_COLOR_CODE`, and `GATE_COLOR` (the procedural gate is retired — the authentic tilemap carries the door tile).

Run: `npm run lint`
Expected: PASS — no "declared but never used". If lint flags a remaining reference to any deleted symbol, that reference is now dead code; remove it. (`ENERGIZER_TILES` is a *core* export and is unrelated — do not touch it.)

- [ ] **Step 3: Update the pm3-4 wall-colour assertion in `tiles.test.ts`**

The `'wall-tile blits contain the authentic blue and never the pellet peach'` test (~line 90) hard-codes `HARDWARE_PALETTE[11]` — that was the autotiler's hand-picked `WALL_COLOR_CODE=16` blue. The authentic tilemap uses the cabinet's own wall colour code. Replace the `BLUE` constant derivation with one read from the authentic tilemap, and keep the never-peach guard:

```ts
import { MAZE_TILEMAP } from '../../src/shell/maze-tilemap-data'
import { colourLookup } from '../../src/shell/palette-data'
// ... inside the test, replace the `const BLUE = HARDWARE_PALETTE[11]` line:
// derive the authentic wall colour from a known border wall cell (0,3 is a
// wall just below the HUD band).
const wallCell = MAZE_TILEMAP[3][0]
const wallInk = HARDWARE_PALETTE[colourLookup(wallCell.colorCode, 3)] // pv3 = wall ink
const PEACH = HARDWARE_PALETTE[14] // dot/energizer colour; must never appear on a wall
```

Then change the wall-blit assertion to require the authentic `wallInk` (not `BLUE`) present and `PEACH` absent. Leave the rest of the test's structure intact.

- [ ] **Step 4: Run the full pac-man suite**

Run: `npx vitest run --project pac-man`
Expected: PASS. In particular `tiles.test.ts` `'draws the maze as 8x8 tile blits via putImageData'` still passes (the authentic map blits via `putImageData`), and the updated wall-colour test passes. If any other test referenced a deleted `render.ts` export, update it to the authentic equivalent.

- [ ] **Step 5: Commit**

```bash
git add plugins/pac-man/src/shell/render.ts plugins/pac-man/tests/shell/tiles.test.ts
git commit -m "feat(pm3-8): drawMaze consumes the authentic tilemap; retire the autotiler"
```

---

### Task 5: Citation claim for `maze-vram.bin` + gate green

**Files:**
- Modify: `plugins/pac-man/docs/rom-study/claims/graphics.json` (add one claim)
- Verify (extend only if resolution fails): `plugins/pac-man/tools/audit/check-citations.mjs`

**Interfaces:**
- Produces: a byte-verified `source:{file:"maze-vram.bin", offset, bytes:[...]}` claim of the same shape as the existing `PALETTE-ALL` claim.

- [ ] **Step 1: Pick a stable byte run to cite**

The claim pins a known-invariant run of the dump. The two score/credit-row columns are constant across attract; cite the first 4 tile bytes:
```bash
node -e "const b=require('fs').readFileSync('plugins/pac-man/reference/graphics/maze-vram.bin'); console.log([b[0],b[1],b[2],b[3]])"
```

- [ ] **Step 2: Add the claim**

Append to the `graphics.json` array (paste the 4 bytes from Step 1):

```json
{
  "id": "MAZE-VRAM-CAPTURE",
  "symbol": "MAZE_TILEMAP",
  "value": "vram",
  "meaning": "The authentic maze tilemap: a MAME video+colour-RAM capture (reference/graphics/maze-vram.bin) of the fully-drawn attract maze. Bytes 0..0x3ff are video RAM 0x4000-0x43ff (tile indices), 0x400..0x7ff are colour RAM 0x4400-0x47ff. Unpacked via MAME's pacman_scan_rows (pacman_v.cpp:170) into the 28x36 grid baked to src/shell/maze-tilemap-data.ts. This claim pins the raw capture bytes; the unpack/decode is src/shell/gfx-rom.ts's job.",
  "addr": "4000",
  "source": {
    "file": "maze-vram.bin",
    "offset": 0,
    "bytes": [0, 0, 0, 0]
  }
}
```

- [ ] **Step 3: Run the citation gate**

Run: `node plugins/pac-man/tools/audit/check-citations.mjs`
Expected: exit 0, the new claim verified. If it errors that `maze-vram.bin` cannot be resolved, extend the checker's graphics-directory resolver to include the new file (the resolver already scans `reference/graphics/`; a whitelist, if any, is the only thing to widen — do the minimal change and re-run).

- [ ] **Step 4: Run the citations vitest**

Run: `npx vitest run --project pac-man plugins/pac-man/tests/audit/citations.test.ts`
Expected: PASS (it asserts `loadClaims().length > 0` and per-claim byte verification; no hard count to bump).

- [ ] **Step 5: Commit**

```bash
git add plugins/pac-man/docs/rom-study/claims/graphics.json plugins/pac-man/tools/audit/check-citations.mjs
git commit -m "feat(pm3-8): cite the maze-vram capture under the graphics gate"
```

---

### Task 6: Invariant + oracle test; resolve orientation; visual confirmation

**Files:**
- Modify: `plugins/pac-man/tests/shell/maze-tilemap.test.ts` (add the oracle/invariant `describe`)
- Possibly modify: `plugins/pac-man/src/shell/gfx-rom.ts` `mazeCellOffset` (only if the oracle rejects the primary orientation) + re-bake

**Interfaces:**
- Consumes: `MAZE_TILEMAP`, `core/maze.ts` (`tileAt`, `ENERGIZER_TILES`, `TUNNEL_ROW`, `MAZE`).

- [ ] **Step 1: Write the oracle + invariant test**

Append to `plugins/pac-man/tests/shell/maze-tilemap.test.ts`:

```ts
import { tileAt, ENERGIZER_TILES, TUNNEL_ROW } from '../../src/core/maze'

const DOT_TILE = 16 // 0x10, pacman.asm:2463
const ENERGIZER_TILE = 20 // 0x14
const SPACE_TILE = 0x40 // Pac-Man blank/background tile

describe('maze tilemap oracle — authentic layout agrees with core (pm3-8)', () => {
  it('every core dot cell carries the dot tile (0x10) in the authentic map', () => {
    for (let ty = 0; ty < 36; ty++)
      for (let tx = 0; tx < 28; tx++)
        if (tileAt(tx, ty) === 'dot')
          expect(MAZE_TILEMAP[ty][tx].tileIndex, `dot expected at ${tx},${ty}`).toBe(DOT_TILE)
  })

  it('the four core energizer cells carry the energizer tile (0x14)', () => {
    expect(ENERGIZER_TILES.length).toBe(4)
    for (const { x, y } of ENERGIZER_TILES)
      expect(MAZE_TILEMAP[y][x].tileIndex, `energizer at ${x},${y}`).toBe(ENERGIZER_TILE)
  })

  it('the authentic map places exactly four energizer tiles', () => {
    let n = 0
    for (const row of MAZE_TILEMAP) for (const c of row) if (c.tileIndex === ENERGIZER_TILE) n++
    expect(n).toBe(4)
  })

  it('the tunnel row is open (background tiles) edge-to-edge at both ends', () => {
    expect(MAZE_TILEMAP[TUNNEL_ROW][0].tileIndex).toBe(SPACE_TILE)
    expect(MAZE_TILEMAP[TUNNEL_ROW][27].tileIndex).toBe(SPACE_TILE)
  })

  it('the ghost-house band has an interior of background tiles (a real house, not scattered walls)', () => {
    // core marks the house body 'house'; the authentic map paints it background.
    let houseBg = 0
    for (let ty = 0; ty < 36; ty++)
      for (let tx = 0; tx < 28; tx++)
        if (tileAt(tx, ty) === 'house' && MAZE_TILEMAP[ty][tx].tileIndex === SPACE_TILE) houseBg++
    expect(houseBg).toBeGreaterThan(10) // a recognizable hollow house
  })
})
```

- [ ] **Step 2: Run the oracle**

Run: `npx vitest run --project pac-man plugins/pac-man/tests/shell/maze-tilemap.test.ts`

**If it PASSES:** the primary orientation (`mazeCellOffset = pacmanScanRows(sy, sx)`) is correct — skip to Step 4.

**If it FAILS** (dots land on the wrong cells → the ROT90 orientation is flipped/mirrored): the correct mapping is exactly one of four candidates. Edit `mazeCellOffset` in `gfx-rom.ts` to the next candidate, re-bake (`node plugins/pac-man/tools/bake-graphics.mjs`), and re-run — until the oracle passes:

```ts
// Candidate A (primary):      return pacmanScanRows(sy, sx)
// Candidate B (flip column):  return pacmanScanRows(sy, 27 - sx)
// Candidate C (flip row):     return pacmanScanRows(35 - sy, sx)
// Candidate D (flip both):    return pacmanScanRows(35 - sy, 27 - sx)
```

Exactly one satisfies "every core dot cell has tile 0x10." Update the `mazeCellOffset` doc-comment to state which orientation was confirmed by the oracle.

- [ ] **Step 3: If orientation changed, re-commit the corrected decoder + re-baked module**

```bash
git add plugins/pac-man/src/shell/gfx-rom.ts plugins/pac-man/src/shell/maze-tilemap-data.ts
git commit -m "fix(pm3-8): confirm maze ROT90 orientation against the core oracle"
```

- [ ] **Step 4: Visual confirmation (required — the defect was only caught visually)**

Serve and screenshot the real render (repo convention: Playwright, headless, on its own port — do NOT use the shared 5270):

```bash
npx vite --port 5291 --strictPort &   # serve this working tree
# then, via the Playwright MCP: navigate to http://127.0.0.1:5291/pac-man/,
# wait for READY!, screenshot the board.
```

Confirm by eye against a real Pac-Man maze: recognizable double-line rounded blue corridors, a clean central ghost house, symmetric halves, the four energizers in their corners. Kill the dev server when done (`kill %1`). Attach the screenshot to the implementation PR.

- [ ] **Step 5: Full guard run**

Run:
```bash
npx vitest run --project pac-man
npm run lint
node plugins/pac-man/tools/audit/check-citations.mjs
npm run test:orchestrator
```
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add plugins/pac-man/tests/shell/maze-tilemap.test.ts
git commit -m "test(pm3-8): oracle + invariants pin the authentic maze against core"
```

---

## Self-Review

**1. Spec coverage:**
- MAME video-RAM dump ground truth → Task 1. ✓
- Video-RAM addressing decoder (pacman_scan_rows) → Task 2. ✓
- Bake committed 28×36 tilemap → Task 3. ✓
- `render.ts` consumes it, autotiler + WALL_* retire → Task 4. ✓
- Core untouched → enforced by Global Constraints + `purity.test.ts`; no task edits `core/`. ✓
- Built-in oracle (baked dot/energizer == core) → Task 6. ✓
- Citation gate extension → Task 5. ✓
- Invariant test (dims, dots==core, energizers==4, tunnel, ghost house) → Task 6. ✓
- Visual Playwright confirmation → Task 6 Step 4. ✓
- Two PRs (design already merged-to-branch; implementation = this plan) → covered by the branch/PR flow. ✓

**2. Placeholder scan:** No TBD/TODO. The one genuine unknown — ROT90 orientation — is resolved deterministically in Task 6 Step 2 against a hard oracle (four enumerated candidates, exactly one valid), not left vague. The two `<paste>` markers in Task 1 Step 5 are checksum outputs the engineer computes in that same step, not deferred work.

**3. Type consistency:** `mazeCellOffset(sx, sy)` and `pacmanScanRows(col, row)` signatures match across Tasks 2/3/6. `MazeCell {tileIndex, colorCode}` defined in the generated module (Task 3) and consumed identically in Task 4. `MAZE_TILEMAP` is `[sy][sx]` (`[36][28]`) everywhere — bake, byte-equality test, oracle, and `drawMaze`'s `MAZE_TILEMAP[ty][tx]` all agree. `DOT_TILE=16`/`ENERGIZER_TILE=20` consistent with `render.ts` and the oracle.
