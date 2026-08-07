# pac-man — reference source provenance

## Primary source (source of record)

`reference/source/pacman.asm` — a complete, commented **Z80 disassembly of the original
1980 Namco / Midway arcade Pac-Man program ROM** (the 16 KB program space, addresses
`0000`–`3fff`; 9,896 lines, ~9,289 instructions per the disassembler header).

- **Origin:** http://www.cubeman.org/arcade-source/pacman.asm — the widely-circulated
  commented arcade Pac-Man disassembly. Its embedded ROM text (`@ 1980 MIDWAY MFG.CO.`,
  the `BLINKY/PINKY/INKY/CLYDE` name table at `36bf`+) confirms it is the arcade machine,
  not a home port.
- **Vendored:** provided by the repo owner on 2026-08-06 and committed in-tree under
  `plugins/pac-man/reference/source/`, mirroring missile-command's
  `reference/source/` + this PROVENANCE.md convention. Tracked in-repo (not gitignored),
  because the citation gate byte-verifies against it — a CI checkout must contain it.

## Radix & encoding conventions (traps the citation gate MUST survive)

- **Radix:** hex throughout. Instruction operands are written `#xx` / `#xxxx`
  (e.g. `ld a,#3f`); the 4-digit address column and data words (`2b17  0100`) are hex.
  A bare number in a comment may be decimal — read the column, not the prose.
- **Scores are BCD, stored low-byte-first, displayed ×10.** The `SCORING TABLE` at
  `2b17` stores each value as a little-endian BCD word with an *implied trailing zero*:
  `2b1b 20 00` → BCD `0x0020` → "20" → **200** (ghost 1); `2b21 60 01` → `0x0160` →
  **1600** (ghost 4); fruit `2b23 10 00` → **100** (cherry) … `2b31 00 05` → **5000** (key).
  The dot is `2b17 01 00` → **10**, the energizer `2b19 05 00` → **50**.
  A claim that cites a raw byte as the decimal point value is WRONG — cite the byte and
  record the decoded (×10 BCD) value; the Dossier is the decoder.
- **RAM map** is documented in the file header (`4e6e` credits, `4e6f` lives/game,
  `4e80`+ scores, `4e88`+ high score, `4d..` actor state, `4e13` level). Sprite/actor
  working RAM lives at `4c00`/`4d00`.

## Secondary sources (decoders / cross-checks — NOT the source of record)

- **The Pac-Man Dossier** (Jamey Pittman, `pacman.holenet.info`) — the behavioral
  decoder: it explains what the routines *do* (ghost targeting, scatter/chase timing,
  speed/Elroy/fruit level tables, the ×10 scoring). Cite it in `glossary.md` for decoded
  meaning; cite `pacman.asm:<addr>` for the byte-level truth.
- **`shaunlebron/pacman`** (GitHub) — a faithful JS remake, **GPL v3**. Read-only oracle
  to disambiguate; **never copy a line of its code, structure, or data tables** into this
  repo. MAME is the final tiebreaker.

## Sound PROMs (added pm2-1 — the Namco WSG byte source)

`pacman.asm` is the 16 KB *program* ROM only; the eight 32-sample 4-bit WSG waveforms
live in a **separate PROM** the program ROM cannot supply. The Namco WSG sound region
is two 256-byte 82S126 PROMs, vendored here under `reference/sound/`:

- `reference/sound/82s126.1m` — **the waveform PROM.** 256 bytes = 8 waveforms × 32
  samples, one 4-bit sample per byte's **low nibble** (high nibble is always 0). MAME
  reads it signed as `(byte & 0x0f) - 8` (`namco.cpp:241`); this is the byte source for
  every WSG waveform Task 2 bakes.
  **SHA-1 `bbcec0570aeceb582ff8238a4bc8546a23430081`**, CRC32 `a9cc86bf`.
- `reference/sound/82s126.3m` — the **timing PROM**, **not used** by Pac-Man's sound
  (MAME labels it `// Timing - not used` in `ROM_START(pacman)`). Vendored only to keep a
  complete `"namco"` sound-region provenance record; **no claim cites it**.
  **SHA-1 `0c4d0bee858b97632411c440bea6948a74759746`**, CRC32 `77245b66`.

- **Origin:** the MAME `pacman` parent romset (`~/roms/pacman.zip`). Both SHA-1s match
  MAME's `ROM_START( pacman )` `ROM_REGION(0x0200, "namco")` entries exactly
  (`src/mame/pacman/pacman.cpp`) — the same byte-verified provenance shape as the
  program ROM above.
- **Vendored:** extracted and committed in-tree under `reference/sound/` on 2026-08-07,
  because the citation gate byte-verifies waveform claims against `82s126.1m` — a CI
  checkout must contain it.

> **ROM-vs-plan correction (pm2-1).** The pm2 plan and epic description name `82s126.3m`
> as "the waveform PROM." MAME's `ROM_START(pacman)` is authoritative and says otherwise:
> **`82s126.1m` holds the waveforms**; `82s126.3m` is the timing PROM, "not used." ROM
> wins — the waveform claims in `claims/sound.json` cite **`82s126.1m`**.

## Graphics ROMs (added pm3-1 — the tile/sprite/colour byte source)

`pacman.asm` supplies no pixel data at all; the tile/sprite bitmaps and the two
colour-DAC PROMs live in the machine's separate **video ROM/PROM set**, vendored here
under `reference/graphics/`:

- `reference/graphics/pacman.5e` — the **tile ROM.** 4096 bytes = 256 8×8 1bpp-planar
  tiles (the character-generator ROM later tasks decode with MAME's `gfxlayout` for
  `charlayout`). **SHA-1 `06ef227747a440831c9a3a613b76693d52a2f0a9`**, CRC32 `0c944964`.
- `reference/graphics/pacman.5f` — the **sprite ROM.** 4096 bytes = 64 16×16 1bpp-planar
  sprites (Pac-Man's mouth frames, the four ghosts' bodies and eyes, the fruit, the
  score numerals — MAME's `spritelayout`). **SHA-1 `4a937ac02216ea8c96477d4a15522070507fb599`**,
  CRC32 `958fedf9`.
- `reference/graphics/82s123.7f` — the **palette PROM.** 32 bytes = 32 RGB colour
  entries, one byte each, decoded via a resistor-ladder DAC (MAME's `pacman_palette`
  in `PALETTE_INIT`; a byte is `-BBGGGRRR` across 3-3-2 weighted resistors). Byte 0 is
  the black entry (all resistor bits low). **SHA-1 `8d0268dee78e47c712202b0ec4f1f51109b1f2a5`**,
  CRC32 `2fc650bd`.
- `reference/graphics/82s126.4a` — the **colour-lookup PROM.** 256 bytes; each byte is
  a 4-bit index into the 32-entry palette above, indexed by (tile/sprite colour-select ×
  4 + pixel colour-code) — MAME's `pacman_palette` colourtable build. **SHA-1
  `19097b5f60d1030f8b82d9f1d3a241f93e5c75d6`**, CRC32 `3eb3a8e4`.

- **Origin:** the MAME `pacman` parent romset (`~/roms/pacman.zip`). All four hashes
  match MAME's `ROM_START( pacman )` `gfx1` region (`pacman.5e`, `pacman.5f`) and
  `proms` region (`82s123.7f`, `82s126.4a`) entries exactly (`src/mame/pacman/pacman.cpp`)
  — the same byte-verified provenance shape as the sound PROMs above.
- **Vendored:** extracted and committed in-tree under `reference/graphics/` on
  2026-08-07, because the citation gate byte-verifies `graphics.json` claims against
  these four files — a CI checkout must contain them.
- **Decoder authority:** MAME's `gfxlayout`/`spritelayout`/`PALETTE_INIT` for
  `pacman.cpp` is cited by comment wherever a later task decodes these bytes into
  pixels — never copied. This task vendors and byte-cites only; no pixel is decoded
  here.
