# pac-man (pm3): authentic graphics & the working tunnel — design & epic

**Architect design doc.** Eleventh epic, third Pac-Man round. pm1 shipped the AI-authentic
playable core; pm2 gave the cabinet its voice (the Namco WSG). **pm3 gives it its FACE** —
the real tile/sprite graphics and the true hardware palette — and fixes the one broken
mechanic left in the core: the tunnel.

Read §2 (ground truth) before writing a single decoded byte. The graphics are, exactly like
pm2's sound, **not in the program ROM** — they live in separate graphics ROMs and colour
PROMs that must be vendored under a citation gate *before* any pixel is decoded (the pm1-2 /
pm2-1 / rb4 harness-first lesson).

## 1. Why this epic exists (the two problems)

**The render shell is honest placeholder art, by design.** `src/shell/render.ts` says so in
its own header: walls are solid full-tile blue rectangles (not the cabinet's double-line
rounded corridors), dots are 2px squares, **ghosts are solid coloured discs with no eyes or
skirt**, Pac-Man is a plain wedge with no chomp animation, the fruit is a red square. Every
colour is "a plain, readable approximation … not a byte-cited palette." pm1/pm2 deliberately
deferred graphics fidelity to exactly this epic — no colour or sprite ROM was ever vendored.

**The tunnel is broken, not merely ugly.** `maze.tileAt()` wraps *tile-kind lookups* on the
tunnel row (walkability is correct), but the actor step never wraps the actor's *position*.
Walk Pac-Man or a ghost left into the tunnel and `actor.xPx` just goes negative forever — the
actor slides off-screen and never reappears on the right. There is also no tunnel **slowdown**:
the real cabinet drops ghosts to ~40% in the tunnel tiles, and `LevelSpec` has no field for it.

**Owner decisions (2026-08-07):** authentic path (vendor the graphics/colour ROMs under a
gate, no hand-drawn "honest-uncited" art); include the pm2-deferred presentation overlays in
this epic; fix the tunnel fully (wrap **and** slowdown); ship all seven stories as one pm3.

## 2. Ground truth — reuse the pm1/pm2 machinery, invent nothing

The graphics come from the **same MAME `pacman` parent romset** (`~/roms/pacman.zip`) the two
sound PROMs came from in pm2-1, and are byte-verified the same way. The program ROM
(`reference/source/pacman.asm`) is still the source of record for *behaviour*; the graphics
ROMs are the source of record for *pixels*.

| Asset (vendor to `reference/graphics/`) | Size | Holds |
|---|---|---|
| `pacman.5e` — tile / char ROM | 0x1000 (4 KB) | 8×8 tiles: maze walls, dots, energizer, alphanumerics, small fruit |
| `pacman.5f` — sprite ROM | 0x1000 (4 KB) | 16×16 sprites: Pac-Man, the four ghosts, big fruit, score numerals |
| `82s123.7f` — palette PROM | 0x20 (32 B) | the 16 hardware colours (3-bit R, 3-bit G, 2-bit B via a resistor DAC) |
| `82s126.4a` — colour-lookup PROM | 0x100 (256 B) | tile/sprite colour-code → palette-index map (4 entries per colour code) |

Each asset's **SHA-1 and CRC32 are recorded in `reference/PROVENANCE.md`** and asserted to
match MAME's `ROM_START(pacman)` `gfx1` / `proms` regions — the identical provenance shape
already used for `pacman.asm` and the two `82s126` sound PROMs. A CI checkout must contain
them because the citation gate byte-verifies against them.

**The decoder authority is MAME's `gfxdecode` layout, cited not copied** — exactly as pm2-1
cited `namco.cpp:241` for the WSG sample encoding. The claims in `claims/graphics.json` cite
raw byte offsets in `pacman.5e`/`.5f`/the PROMs; MAME's `charlayout`, `spritelayout`,
resistor weights and `PALETTE_INIT` (in `src/mame/pacman/pacman.cpp` / `pacplus` gfx) are the
**decoder** for what those bytes mean, recorded in `glossary.md`. **The GPL firewall still
stands:** `shaunlebron/pacman` remains a read-only oracle — zero lines of its code or data
copied. MAME is the tiebreaker and the decoder reference (cite, never paste).

### Encoding traps the graphics gate MUST survive

- **Planar 2bpp with a split-nibble tile layout.** Pac-Man's 8×8 char is 16 bytes: two
  bitplanes at bit offsets `{0,4}`, and each tile is stored as two 4-pixel-wide halves in the
  low/high nibbles — *not* a naive row-major bitmap. Decode via the cited `charlayout`
  offsets; a naive reader produces garbled, mirror-split tiles. Sprites are the 16×16
  `spritelayout`, same planar scheme.
- **The palette PROM is a resistor DAC, not RGB bytes.** Each of the 16 entries in
  `82s123.7f` encodes R from bits 0-2, G from bits 3-5, B from bits 6-7, weighted by the
  board's resistor ladder (1000/470/220 Ω). Cite the byte; record the decoded 8-bit RGB via
  MAME's weights. A claim that reads a PROM byte as `#RRGGBB` is WRONG.
- **Colour code 0 is transparent.** In the colour-lookup PROM, pixel value 0 maps to "no
  draw" (background shows through) for sprites; the maze background is a specific palette
  entry, not `#000` by accident. Getting this wrong fills the screen or erases the dots.
- **`82s126.4a` is 256 bytes = 64 colour codes × 4.** Tiles use the low colour codes, sprites
  the high ones; only the **low nibble** of each byte is the palette index.

### Tunnel ground truth (behaviour, honest-uncited)

- **Position wrap** is a mechanical fix in the actor step, not a ROM constant: when an actor
  on `TUNNEL_ROW` steps past the left/right edge, wrap `xPx` modulo the maze pixel width
  (`MAZE.cols * TILE_PX`). Must be applied symmetrically in `pacman.ts` **and** `ghost.ts`
  (each has its own step).
- **Tunnel slowdown** is a per-level speed: the Dossier's Table A.1 gives the tunnel ghost
  speed (e.g. 40% at level 1). Add `tunnelSpeedPct` to `LevelSpec` under the *existing*
  honest-uncited speed policy (same status as `ghostSpeedPct`), applied when a ghost's current
  tile kind is `'tunnel'`. **Pac-Man does not slow in the tunnel** — only ghosts do.

## 3. Fleet placement — reuse, invent nothing

- **Graphics are baked to JS, never fetched.** Every decoded tile/sprite/palette becomes a
  committed JS/TS data module (the pm2 waveform-bake precedent, itself the `tools/speech-bake`
  precedent). Zero asset fetch at runtime → no R2 bucket can 404 the graphics away, and the
  render shell stays offline-pure. This is the deliberate escape from the star-wars-music
  silent-404 trap (architect gotcha `SWMUS`).
- **Core stays pure.** Only pm3-2 (tunnel) touches core, and only `pacman.ts` / `ghost.ts`
  movement + `level.ts` tables. All decode and render is shell-side. The `src/core/` purity
  scanner and the `events.ts` seam are untouched.
- **The citation gate is extended, not replaced.** `tools/audit/check-citations.mjs` gains a
  `claims/graphics.json` domain that byte-verifies against the vendored graphics ROMs — the
  same mechanism as `claims/sound.json`.
- **The events seam already exists.** pm1 built `src/core/events.ts`'s `GameEvent` union
  (dot-eaten, energizer, ghost-eaten chain, fruit, pac-died, extra-life, level-cleared,
  game-over). pm2 wired the *audio* consumer; pm3-7 wires the *visual* consumer (overlays +
  score popups) onto the same seam. No new core surface.

## 4. Stories

Harness-first spine: **pm3-1 gates every graphical story**; the tunnel (pm3-2) is an
independent pure-core fix placed early as a fast, visible win; palette (pm3-3) precedes the
tile/sprite/fruit decodes; the score numerals (pm3-6) precede the popups (pm3-7).

| id | title | pts | depends on |
|----|-------|-----|-----------|
| **pm3-1** | Graphics ground truth — vendor `pacman.5e`/`.5f` + `82s123.7f`/`82s126.4a`; record SHA-1/CRC32 in PROVENANCE.md; add `claims/graphics.json`; extend `check-citations.mjs` — BEFORE any decode | 5 | — |
| **pm3-2** | The working tunnel — actor position-wrap (Pac + ghosts) + authentic ~40% tunnel slowdown via `tunnelSpeedPct` in `LevelSpec`; core-only, pure, unit-tested | 5 | — |
| **pm3-3** | Palette bake — decode the 16 hardware colours (resistor DAC) + the colour-lookup map, baked to a committed JS module; the colour source for all render | 3 | pm3-1 |
| **pm3-4** | Tiles + authentic maze — decode 8×8 tiles; render the real double-line rounded blue corridors, dots and energizers, retiring the solid-rectangle placeholder | 5 | pm3-1, pm3-3 |
| **pm3-5** | Sprites — decode 16×16; Pac-Man chomp cycle, ghost body + direction-tracking eyes, frightened blue + white-flash, eaten eyes-only | 5 | pm3-1, pm3-3 |
| **pm3-6** | Fruit + score sprites — the 8 bonus fruit sprites and the point-value numerals (ghost chain 200→1600, fruit values) | 3 | pm3-1, pm3-3 |
| **pm3-7** | Presentation overlays on the events seam — READY!, level-clear maze flash, game-over, and score popups (consumes `events.ts` + pm3-6 numerals) | 5 | pm3-5, pm3-6 |

**Total: 31 points.**

## 5. Acceptance posture

- **Every pixel is byte-cited under the gate.** No hand-drawn art; `check-citations.mjs`
  green over `claims/graphics.json` is a merge condition for pm3-3..6.
- **The tunnel is observed, not just unit-green.** pm3-2's acceptance includes a played
  transcript: an actor entering the tunnel left reappears at the right (position continuity),
  and a ghost's per-frame displacement drops on tunnel tiles (slowdown). A synthetic fixture
  alone does not certify liveness (gotcha: *A feature must be observed in play*).
- **The maze is visibly the real maze.** pm3-4's acceptance is a `just serve` screenshot at
  `/pac-man/` compared against a reference frame — double-line walls, correct blue, dots in
  the right cells — not merely "drawMaze ran."
- **Purity holds.** The `src/core/` scanner stays green; pm3-2 adds no shell import to core.

## 6. Deferred inventory (explicit, so nothing dies in the archive)

- **pm4:** the three intermission cutscenes (Blinky-chase, ripped-ghost, worm), and the
  level-256 kill screen (the right-half glyph corruption). Both consume graphics pm3 bakes.
- **ad1 sibling:** the attract-mode self-play demo (see `epic-ad1`), not pm3.
- **Follow-up if surfaced:** any colour/tile discrepancy the gate reveals between the vendored
  PROMs and MAME's weights is a finding to FILE, not to paper over.

## 7. Plan

Implementation plan (task-by-task, superpowers workflow) to be written by `writing-plans` at
`docs/superpowers/plans/2026-08-07-pac-man-pm3.md`, one task per story above.
