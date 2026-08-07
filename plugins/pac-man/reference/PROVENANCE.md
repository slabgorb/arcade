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
