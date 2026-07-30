# Joust — Image Data, Formats, Palette

Companion to [`brief.md`](brief.md). Citations are file:line into
`arcade/reference/williams-source/joust/` (pin `9bcfdb1`) and the MAME driver.
Everything here was extracted and line-verified in the 2026-07-19 study session.

## The image ROM source

`JOUSTI.SRC` is the merged, self-contained images module (single `ORG $0000`,
`JOUSTI.SRC:18`; pointer table of 30 entries at `JOUSTI.SRC:18-49`; running
`LENGTH EQU *` marker at `JOUSTI.SRC:2817`). The per-entity artist files
(`OSTRICH.SRC`, `CLIFF.SRC`, …) are **byte-identical upstreams**, not variants:
`ORUN1R`'s 20 pixel rows in `OSTRICH.SRC:12-31` reappear verbatim at
`JOUSTI.SRC:1369-1388`, with the artist file's commented-out record header
(`OSTRICH.SRC:6`) made live (`JOUSTI.SRC:1368`). The artist files carry a
64-byte development header (`ORG 4096`; `FDB 5376,$AA05,$0814,$70C0,…`,
`OSTRICH.SRC:7-11`) that the merge strips — its two `FCB` rows are the
16-entry palette, byte-identical to `COLOR1`'s live column.

**Transcription ground truth is therefore `JOUSTI.SRC` itself** (no ROM chip
binaries are vendored — brief §1); the `*.PIC` S-Records are secondary
provenance.

## Two record formats

**Entity frames** — 3-word records, emitted by the `POSOFF` macro
(`JOUSTI.SRC:12-13` — `FDB COLISN,XOFF*256+256-YOFF,SRC`):

```
ORRUN1  FDB  CSTN1R,$00ED,ORUN1R      ; JOUSTI.SRC:764
;            │      │     └ pixel-data pointer; FIRST WORD THERE is w/h
;            │      └ position word: signed (Xbyte, −Y) offset from the
;            │        classified screen address ($00ED → 0 right, 19 up)
;            └ collision-span pointer (0 = no mask, e.g. PLYR1 JOUSTI.SRC:2046)
```

The consumer (`WRHOR2`, `JOUSTRV4.SRC:6093-6098`) adds the position word to
`CLSX`/`CLSY`, loads the source pointer, and post-increments past the leading
w/h word (`ORUN1R FDB $0814!XDMAFIX`, `JOUSTI.SRC:1368`). Facing variants sit
6 bytes apart — `SRCADP` adds `#6` for left-facing (`JOUSTRV4.SRC:1518-1524`).

**Background/cliff records** — 4-word records that *are* a partial DMA block
(`FDB collision, source, absolute_dest, w/h` — field offsets match
`RAMDEF.SRC:144-152`): `CLIF1L FDB CCLF1L,CSRC1L,$0145,$1107!XDMAFIX`
(`JOUSTI.SRC:54`). Consumer `BCKYUP` (`JOUSTRV4.SRC:1112-1117`) un-XORs the
height (`EORB #!WDMAFIX`), computes the lowest scanline for quadrant
bucketing, and blits with control `$0A` (transparent). The first word is
dual-purpose: transporter records carry a literal DMA control word `$0A00`
there instead of a collision pointer (`JOUSTI.SRC:749-752`).

`DMAFIX EQU $0404` (`JOUSTI.SRC:8`) pre-XORs the human-readable w/h for the
first-revision SC1 blitter, which XORs it back
(`williamsblitter.cpp:115-116`; Joust uses `WILLIAMS_BLITTER_SC1`,
`williams.cpp:1589`).

## Pixel format

- 4 bpp, **2 pixels/byte, high nibble = left pixel**
  (`williamsblitter.cpp:159,171`; the source's own `LN EQU 16 / RN EQU 1 /
  BN EQU 17`, `SYSTEM.SRC:782-784`).
- One `FCB` row = one horizontal screen row of `w` bytes (= `2w` pixels);
  blits iterate height outer / width inner with a 256-byte destination
  stride (`williamsblitter.cpp:203-204,213,219`). `CLIF1L` "17 BY 7 BYTES"
  (`JOUSTI.SRC:53`) is literally 7 FCB lines × 17 bytes (`JOUSTI.SRC:57-63`).
- VRAM is column-major: `addr = xbyte·256 + y`, pixel X = 2·xbyte. Proven by
  the `WCX`(high)/`WCY`(low) split (`RAMDEF.SRC:148-149`), by the `OLD X`
  comments (e.g. `CLIF2` dest `$2B51`, 43·2 = 86 = `$56`, `JOUSTI.SRC:106`),
  and by `NEWCL5`'s hard-coded `LDX #$1B*2 / LDY #$D3` (`SYSTEM.SRC:927-928`)
  matching `CLIF5`'s dest `$1BD3` (`JOUSTI.SRC:287`).
- Blit destination Y **wraps within the low byte** (`williamsblitter.cpp:241`)
  — a sprite crossing scanline 255 wraps to 0 in the same column.
- **No remap PROM on Joust — nibbles are literal palette indices.** The
  blitter's remap table is identity when no PROM is attached
  (`williamsblitter.cpp:54-59`); Joust's machine config is `williams_b1` →
  `WILLIAMS_BLITTER_SC1` with no PROM tag (`williams.cpp:1656-1660`, `williams.cpp:1589`);
  the only config in the driver that attaches one is the SC2 machine at
  `williams.cpp:1773`. This is what makes the rider-nibble → palette-entry
  identification (5 = P1 yellow, 7 = P2 blue, 4 = enemy knight) a proven
  fact rather than an assumption.

## Collision data (live, not decorative)

- A mask is a per-scanline `(left,right)` span pair, 4 bytes/row, values
  biased by `COFF EQU $0200` (`JOUSTI.SRC:7`) so sentinels are negative:
  `$8000` = no collision this scanline (`JOUSTI.SRC:837`), `$8100` = end of
  table (`JOUSTI.SRC:73`).
- Entity-vs-entity collision is box broad-phase (`HITEM`,
  `JOUSTRV4.SRC:4909-4923`) then span narrow-phase: indirect loads through
  the frame records' collision pointers (`LDY [PPICH,X]`,
  `JOUSTRV4.SRC:4924,4930`), row-aligned ×4 (`ASLB` pair with a `$1F` max Y
  delta, `JOUSTRV4.SRC:4936-4937`), walked by `BPCOL`
  (`JOUSTRV4.SRC:7043`).
- **Only the mount collides.** Mounted rider overlays carry collision
  pointer 0 (`PLYR1`, `JOUSTI.SRC:2046`); the dismounted standing rider has
  a real mask (`CEGGMN`, `JOUSTI.SRC:2159`).
- Masks are shared aggressively: all three flap frames use one table
  (`CWNG1R/2R/3R` are one address, `JOUSTI.SRC:801-803`).
- Background collision is a *separate* mechanism: per-X-column RAM tables
  `BCKXTB`/`LNDXTB` (`RAMDEF.SRC:372-378`) copied from ROM tables per wave
  (`BCKXS1` `JOUSTRV4.SRC:7616`, `LNDXS1` `JOUSTRV4.SRC:7787`).

## Palette

Hardware: 16 palette bytes, `BBGGGRRR`, resistor-weighted DACs
(`williams_v.cpp:342-343`). Active game palette = the **first** operand
column of `COLOR1` (`SYSTEM.SRC:908-923`; second column is a dead alternate —
the assembler's operand field ends at the first whitespace). Decode confirmed
by the author's English names: `@077 YELLOW PLAYER 1` (`JOUSTRV4.SRC:759`),
`@350 LT BLUE PLAYER 2` (`JOUSTRV4.SRC:761`).

| # | Octal | Note (source's own where quoted) |
|---|---|---|
| 0 | `@000` | "BACKGROUND COLOR" (black) |
| 1 | `@377` | white |
| 2 | `@160` | green |
| 3 | `@130` | dark green |
| 4 | `@017` | red — "MAN'S BODY" (enemy knight, `SYSTEM.SRC:912`) |
| 5 | `@077` | **yellow — Player 1** |
| 6 | `@121` | dark slate |
| 7 | `@350` | **light blue — Player 2** |
| 8 | `@024` | brown |
| 9 | `@220` | medium blue |
| 10 | `@135` | tan |
| 11 | `@021` | dark olive |
| 12 | `@037` | orange |
| 13 | `@244` | light blue-grey |
| 14 | `@012` | dark brown |
| 15 | `@147` | salmon |

Rider bodies confirm the mapping in pixel data: `PLY1R` ≈ all nibble 5,
`PLY2R` ≈ nibble 7, `PLY3R` ≈ nibble 4 (`JOUSTI.SRC:2054,2083,2114`).

Two more palettes ship: `HICOLR` (high-score page, 8 entries + 8 black,
`JOUSTRV4.SRC:754-761`) and `NULL` (blanking, `JOUSTRV4.SRC:762`, used `JOUSTRV4.SRC:705-706`).
**The only palette cycling in the game** is `INC RAMCOL+2` once per frame on
the high-score page (`JOUSTRV4.SRC:727`); the lava shimmer is the `LAVA`
process writing pixels (`SYSTEM.SRC:786-904`), not a palette effect.
⚠️ Radix trap: every palette byte is **octal** (`@077` = `$3F`, not `$77`).

## Playfield layout (screen 292×240 visible)

Positions decoded as (pixel X = 2·dest-high, Y = dest-low); size = 2w × h px.

| Object | Cite | X,Y | Size |
|---|---|---|---|
| CLIF1L / CLIF1R (top ledge pair) | `JOUSTI.SRC:54,78` | 2,69 / 252,69 | 34×7 / 48×7 |
| CLIF2 (mid-left shelf) | `JOUSTI.SRC:106` | 86,81 | 88×9 |
| CLIF3L / CLIF3U / CLIF3R | `JOUSTI.SRC:160,193,222` | 2,138 / 202,129 / 254,138 | 64×8 / 58×11 / 48×7 |
| CLIF4 (mid pedestal) | `JOUSTI.SRC:254` | 106,163 | 64×8 |
| CLIF5 (bottom island: top strip + side caps) | `JOUSTI.SRC:288-290` | 54,211 / 54,211 / 224,211 | 186×2 / 16×13 / 16×13 |
| TRANS1-4 (spawn pads) | `JOUSTI.SRC:749-752` | 106,81 · 224,129 · 16,138 · 120,211 | 28×3 each, one shared source `TRASRC` |
| BRIDGE / BRIDG2 (lava shore) | `JOUSTRV4.SRC:1126-1127` | 0,211 / 240,211 | 54×3 / 60×3 — **solid-colour fills**, control `$1200+LIB*$11` |

The bulk of CLIFF5 is RLE-compacted: `COMCL5` (871 bytes of `%`-binary FCBs,
`JOUSTI.SRC:594-740`), un-compacted at wave start by `VNEWCL5`
(`JOUSTRV4.SRC:996`); the manual background loop draws the rest and stops
before CLIF5 (`JOUSTRV4.SRC:1008-1011`). Cliffs are destroyed/created per
wave from `WCLFTB` (`JOUSTRV4.SRC:2407-2414`: CLIF1L, CLIF1R, CLIF2, CLIF4, with
an associated transporter).

## Frame inventory (contact-sheet checklist — 93 blocks)

Sizes are `w bytes × h scanlines` as written; pixel width = 2w.

| Entity | Records | Blocks | Frames |
|---|---|---|---|
| Ostrich (`JOUSTI.SRC:759`) | 18 (9 states × 2 facings) | 14 | run1-4, skid, fly1, fly3 (R+L) |
| Stork (`JOUSTI.SRC:781`) | 18 | 14 | same states |
| Buzzard (`JOUSTI.SRC:1668`) | 18 | 14 | same states |
| Riders (`JOUSTI.SRC:2046-2206`) | 23 | 13 | PLY1-5 R/L `$0707`; PLY3S/4S/5S standing `$050C` |
| Egg (`JOUSTI.SRC:2255`) | 7 | 6 | up/right/left + 3 hatch stages |
| Lava-troll hand (`JOUSTI.SRC:2376`) | 6 | 6 | GRAB1-6 |
| Flame (`JOUSTI.SRC:2481`) | 4 | 4 | FLAME1-4 |
| Death poof (`JOUSTI.SRC:2564`) | 3 | 3 | FL1-3 |
| Pterodactyl (`JOUSTI.SRC:2601`) | 6 | 6 | PT1-3 R/L |
| Ptero dissolve (`JOUSTI.SRC:2778`) | 1 | 1 | `ASH1R/L` — third format, **decoded in jt1-3** (see below) |
| Cliffs | 8 slots | 10 raw + `COMCL5` | see layout table |
| Transporter (`JOUSTI.SRC:749`) | 4 | 1 | `TRASRC` `$0E03` |

The 93 total is the sum of this table's Blocks column (14+14+14+13+6+6+4+3+6+1
+11+1). An earlier headline here said 91; that was an arithmetic slip in the
total only — every per-entity row was correct, and an independent machine census
of `JOUSTI.SRC` also gives 93. Corrected in jt1-3, which transcribes all 93.

**No text font lives in JOUSTI.SRC** — the font is MESSAGE.SRC territory
(shell study).

## Transcription hazards (read before reading JOUSTI.SRC by machine)

Three traps in this file produce transcriptions that are **wrong but
well-formed**, so nothing downstream complains. jt1-4 and jt1-6 read the same
file and will meet all three.

**1. Comment-wrap debris in the label column.** `JOUSTI.SRC:65` and `JOUSTI.SRC:89` carry
comments that run off the end of the line with no `*` continuation, leaving
`ZERO)` at `JOUSTI.SRC:66` and `CREEN` at `JOUSTI.SRC:90` sitting where a label
goes. Honouring
either one **splits the collision table it interrupts**: `CCLF1L`'s mask is 8
rows (`:65-:73`), but a reader that treats `ZERO)` as a label transcribes **one**
row and hands the other seven to an invented symbol. The result is a plausible
8-row-shaped mask that is simply wrong.

`CREEN` is the harder case — it is a well-formed uppercase identifier, so **no
shape heuristic can find it**. The discriminator that works is semantic: a real
label is referenced somewhere in the file; comment debris is referenced by
nothing. That test selects exactly these two of the file's 27 bare labels.
Claims JT3-017…JT3-020.

**2. Pixel data is both `FCB` and `FDB`, and some rows are space-indented.** All
ten cliff sources (`CSRC1L`, `CSRC1R`, …) and `TRASRC` are **FDB-only**. A reader
that assumes `FCB`, or assumes tab indentation, silently drops exactly those
eleven blocks — a third of the non-framed inventory — and still produces a
tidy-looking result.

**3. `CSRC5L` holds one more row than its record draws.** `CLIF5`'s left-cap
sub-record (`JOUSTI.SRC:289`) specifies 8×13, but the `CSRC5L` data
(`JOUSTI.SRC:307-320`) is
**fourteen** rows of 8. The record draws 13 of the 14. A transcription that
trusts the record truncates 8 source bytes; jt1-3 keeps all 112 and takes the
height from the data. Claims JT3-021/JT3-022.

## `ASH1R`/`ASH1L` — the dissolve format, decoded

Recorded in earlier passes as a third, undecoded format (open-questions §5).
Decoded in jt1-3 from its consumer, `CLIFER` (`JOUSTRV4.SRC:4604-4631`), reached
from the pterodactyl death path at `JOUSTRV4.SRC:1390` (`LDD ASH1R`). The
author states the format outright at `JOUSTRV4.SRC:4605` — *"lo nybble is color,
hi nybble is length"*:

- one byte per run: **low nibble = colour, high nibble = run length**
- the colour nibble is replicated into both halves of a byte (`LDB #17`,
  `JOUSTRV4.SRC:4608`, `$0A → $AA`), so a run writes whole **bytes** — two pixels
  at a time
- the **last** byte of each run is masked to its high nibble alone
  (`JOUSTRV4.SRC:4622-4624`,
  *"last byte is always one pixel to enhance debris image"*), so each run ends on
  a single pixel
- high nibble 0 = **end of line**; a whole byte of `$00` = **end of image**
- the destination advances `$100` per byte (`JOUSTRV4.SRC:4626`) because Williams
  images are stored column-major

The last two points are why counting run lengths as *pixels* yields ragged,
inconsistent row widths — the count is in bytes, less one pixel at each run's
tail. jt1-3 transcribes the raw stream (172 bytes, `ASH1R` with alias `ASH1L`);
rendering it is jt1-6's job. Claims JT3-010…JT3-016.
