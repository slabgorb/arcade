# pac-man — ROM study brief

The source-of-record dossier for the faithful Pac-Man clone. Ground truth here is
the vendored disassembly; the Pac-Man Dossier is the *decoder* of what the code
means, never a substitute for the bytes.

## Source of record

- **File:** `plugins/pac-man/reference/source/pacman.asm` (vendored in-tree;
  provenance in [`../../reference/PROVENANCE.md`](../../reference/PROVENANCE.md)).
- **What it is:** a complete, commented **Z80 disassembly** of the original 1980
  Namco / Midway arcade Pac-Man **program ROM** — the 16 KB program space, addresses
  `0000`–`3fff`, 9,896 lines. Its embedded ROM text (`@ 1980 MIDWAY MFG.CO.`, the
  `BLINKY/PINKY/INKY/CLYDE` name table) confirms it is the arcade machine, not a
  home port.
- **CPU / timebase:** Zilog **Z80** at 3.072 MHz; the game logic runs on the
  **60 Hz** vertical-blank interrupt (the video timebase). Per-frame counters are
  60 Hz frames unless a routine explicitly divides them.

## The citation vocabulary (what every later story writes)

A primary-source citation is the hex ROM address, backtick-wrapped:
**`pacman.asm:<addr>`**. The SCORING TABLE begins at `pacman.asm:2b17`; the
ghost name-pointer table at `pacman.asm:36bf`; the lives-per-game RAM slot is
documented at `pacman.asm:4e6f`. Every such citation in this dossier and in
`glossary.md` is machine-checked: `tools/audit/check-citations.mjs` re-opens the
cited line byte-for-byte, and `tests/audit/citations.test.ts` fails if any prose
citation lacks a covering claim in `docs/rom-study/claims/*.json`.

## Radix & encoding traps (the gate MUST survive these)

- **Radix is hex.** Instruction operands are written `#xx` / `#xxxx` (`ld a,#3f`);
  the 4-digit address column and the data words (`2b17  0100`) are hex. A bare
  number *inside a comment* may be decimal — read the column, not the prose.
- **Scores are BCD, little-endian, displayed ×10.** Each SCORING TABLE word stores
  the value as a little-endian packed-BCD word with an implied trailing zero. The
  two data bytes shown after the address form the little-endian word, that word's
  hex digits are read as decimal, then multiplied by ten:
  - `2b17  0100` → `0x0001` → 1 → **10** (dot)
  - `2b19  0500` → `0x0005` → 5 → **50** (energizer)
  - `2b1b  2000` → `0x0020` → 20 → **200** (ghost 1)
  - `2b1d  4000` → `0x0040` → 40 → **400** (ghost 2)
  - `2b1f  8000` → `0x0080` → 80 → **800** (ghost 3)
  - `2b21  6001` → `0x0160` → 160 → **1600** (ghost 4)

  A claim that cites the raw byte as if it were the decimal point value is WRONG.
  Every scoring claim records the raw word AND the decoded ×10 value, and
  `citations.test.ts` re-derives the decode from the verbatim so the two can never
  silently disagree.

## GPL firewall (binding)

`shaunlebron/pacman` (a faithful JS remake) is **GPL v3**. It may be *read* to
disambiguate a decoding, and a cross-check may be recorded in prose as
"confirmed vs oracle" — but **not one line of its code, structure, or data tables**
may enter this repo. MAME is the final tiebreaker. The vendored `pacman.asm` and
the Pac-Man Dossier are the only sources these docs and claims are built from.

## Secondary decoder

**The Pac-Man Dossier** (Jamey Pittman, `pacman.holenet.info`) explains what the
routines *do* — ghost targeting, scatter/chase timing, the ×10 scoring, the ghost
characters. Cite it in `glossary.md` for decoded meaning; cite `pacman.asm:<addr>`
for the byte-level truth.
