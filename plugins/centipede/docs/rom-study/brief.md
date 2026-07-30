# Centipede (1981) — Ground-Truth Brief

Produced 2026-07-18 with the `rom-source-study` skill. Every citation below was
re-opened and verified byte-for-byte in this session (the hand-run equivalent of
the citation checker; building the automated checker is the first story).

**Primary source:** `arcade/reference/atari-source/centipede/` (LF/ASCII vendored
copy of [historicalsource/centipede](https://github.com/historicalsource/centipede),
pinned `dbbe6de`). Citations are file:line in that tree.
**Secondary source:** MAME driver `src/mame/atari/centiped.cpp` (sparse clone at
`~/Projects/mame`). Wins only on board-level facts the source never states.
Neither source's code is ever copied into this repo (copyright / GPL).

**Line-number trap — cite the VENDORED tree, nothing else.** A second checkout of
the same upstream repo also sits on this machine at `~/Projects/centipede-source`,
and **its line numbers do not match**. It preserves the original CRLF endings and
each form-feed as its own line; the vendored copy is LF and expands them. The two
diverge by one line from line 44 of `CENTI4.MAC` onward — so `CENTPC`'s
`CMP I,03` is `:465` in the vendored tree and `:464` in the other, and every
citation derived
from the wrong copy is silently off by one. The citation gate only re-opens the
vendored tree, so a mis-derived line either fails the gate with a confusing
verbatim mismatch or — worse — lands on a real-but-wrong neighbouring
instruction. Read `reference/atari-source/centipede/`, or set
`CENTIPEDE_SOURCE_DIR`. (Found the hard way in cp3-4.)

## 0. Revision — build against rev 4, know its gaps

Four complete releases are preserved, documented in one running ledger
(`CENTI.DOC`): rev 1 disk 34A 5/11/81 (`CENTI.DOC:3`), rev 2 34B 5/28/81 (`:64`),
rev 3 34C 7/14/81 (`:124`), rev 4 34D "CENTIPEDE 4" 9/23/81 (`:177`).
**Target: revision 4** (`revision.v4/` — `CENTI4.MAC`, `CENIR4.MAC`,
`CENTS4.MAC`, include `CENDE4.MAC`, plus `COIN65.MAC`; `CENTI.DOC:198-199`) —
the final shipped program, EPROMs `136001-407..410`.

**Gaps:** rev 4 re-cut *only* program EPROMs — no picture ROM, no sync PROM, no
design doc (`GENERAL ROMS/PROMS:NONE` `CENTI.DOC:214`, `DOCUMENTATION FILE:NONE`
`CENTI.DOC:210`). MAME's parent `centiped` set confirms the pairing in silicon:
rev-4 program EPROMs + rev-**2** picture EPROMs `136001-211/212` + rev-2 sync
PROM `136001-213` (`centiped.cpp:2029` `ROM_START( centiped )`; the four `GAME`
entries at `centiped.cpp:2377-2380` name this set "Centipede (revision 4)",
cabinet `ROT270`). So graphics/sync ground truth is **rev 2's artifacts**, and
the gameplay design doc is **rev 1's** `CENTIP.DOC` (Ed Logg, 5/13/81).

Stability across revisions: `CENDEF.MAC` and `revision.v4/CENDE4.MAC` differ
only in their `.TITLE` line (diff of everything after line 1 is empty), and
`COIN65.MAC` is byte-identical (md5) in all four revisions.

## 1. What shipped

Link command, in the author's own comment (`CENDEF.MAC:42`) and the linker map
(`CENTI.MAP:6`): three CPU modules — rev 4's `CENTI4,CENIR4,CENTS4` — each
`.INCLUDE`ing `CENDE4` (`CENTI4.MAC:2`, `CENIR4.MAC:3`, `CENTS4.MAC:4`), with
`COIN65` included from the IRQ module (`CENIR4.MAC:13`).

**Raster trap:** `CENPIC.MAC` (picture data) and `SYNC.MAC` (video sync PROM)
appear in **no** link string yet absolutely shipped — they assemble straight to
chips, mapped by the part ledger: picture ROMs `136001-101/102` (`CENTI.DOC:18-19`),
sync PROM `136001-113`, a 256×4 82S129 (`CENTI.DOC:32`).

Never assembled (tooling/paperwork): `*.MAP` (linker maps), `*.COM` (link
scripts), `*.DOC` — but see question 4; the DOCs are not disposable.

## 2. Radix

`.RADIX 16` is set **once** for the CPU modules, in the shared include
(`CENDEF.MAC:2` / `CENDE4.MAC:2`). `CENTI*.MAC`, `CENIR*.MAC`, `CENTS*.MAC`
carry no `.RADIX` of their own — they **inherit hex through `.INCLUDE`**.
The separately-assembled files set it independently: `CENPIC.MAC:8`,
`SYNC.MAC:5`, `COIN65.MAC:11` — and `COIN65.MAC:662` restores the caller's
radix on exit (`.RADIX .RAD`).

**Every bare numeric literal is hex unless it carries a trailing period** —
`NCENT =12.` is decimal twelve (`CENDEF.MAC:119`); `CMP I,37.` is decimal 37
inside an otherwise-hex file (`CENIRQ.MAC:285`).

## 3. Timebase

Author's spec: `;INTERRUPT REQUIREMENTS:IRQ 4 PER FRAME (1 IN VBLANK)`
(`CENDEF.MAC:31`). The IRQ handler distinguishes the VBLANK-flagged interrupt
with `BIT ENDSCN` / `BVS` (`CENIRQ.MAC:264-265`); only that one increments
`SYNC` and the 16-bit `FRAME` counter (`CENIRQ.MAC:268-271`) and runs the
per-frame input/housekeeping block. The mainloop gates on it — `LSR SYNC` /
`BCC` spin-wait at `CENTI.MAC:17-18` (`CENTI4.MAC:17-18` identically) — then
immediately pets the watchdog (`STA WTCHDG`, `CENTI.MAC:19`).

**Game logic runs once per video frame. Nominal 60 Hz; exact 59.886 Hz.**
Corroborated three ways:

- **MAME hardware header:** 12.096 MHz master → HSYNC = XTAL/256/3 = 15.75 kHz →
  VSYNC = HSYNC/263 = **59.88593 Hz** (`centiped.cpp:22-25`); machine config pins
  `set_refresh_hz(60)` (`centiped.cpp:1798`). **MAME hedges the divisor** —
  "`/263 ?? ... not sure, could be /262`" (`centiped.cpp:25`) — recorded as
  open question 1.
- **Timer arithmetic:** `GTIME`, the BCD game-time counter, increments when
  `FRAME`'s low byte wraps — every 256 frames (`CENIRQ.MAC:268-280`,
  `SED`/`CLD`-wrapped). 256 ÷ 59.886 ≈ 4.27 s, matching both the equate comment
  "GAME TIME IN 4 SECOND INCREMENTS" (`CENDEF.MAC:277`) and the self-test doc's
  "average game time accurate to four seconds" (`CENTIP.DOC:407`, phrase wraps
  to the next line).
- **IRQ generation in hardware:** a scanline timer every 16 lines toggling on
  `(scanline-1) & 32` yields exactly 4 rising edges per 256-scanline frame
  (`centiped.cpp:436-441`, timer config `:1794`) — independently matches
  "IRQ 4 per frame".

Watchdog resets after 8 missed VBLANKs (`centiped.cpp:1791`), matching the
per-frame `STA WTCHDG` and the IRQ's own `SYNC`-overrun trap (`CENIRQ.MAC:281-283`:
if `SYNC` ≥ 8, spin until the watchdog resets the machine).

## 4. What the author already told us

- `CENTIP.DOC` — **Ed Logg's own program documentation** (dated May 13 1981,
  `CENTIP.DOC:1-3`): game rules, wave composition, scoring, option switches,
  monitor orientation, EAROM accounting. Treat as primary design intent.
  Verified scoring examples: flea 200 (`:115`), scorpion 1000 (`:116`), spider
  300/600/900 by proximity (`:117`); spider hugs the bottom from 60,000 points
  (`:201-202`). It documents **rev 1** — diff constants against rev-4 code
  before trusting its numbers (open question 3).
- `CENTI.DOC` — the ROM part ledger: every source file ↔ chip part number per
  revision. This is how question 1's data ROMs were mapped.

## 5. Board facts the source never states (MAME)

6502 at 1.512 MHz (XTAL/8), **halved to 0.756 MHz while the video generator
steals the bus on playfield-RAM access** (`centiped.cpp:22-23`). Screen 32×8 =
256 square, visible 256(h)×240(v) (`set_visarea`, `centiped.cpp:1800`), cabinet
rotated **ROT270** (`centiped.cpp:2377`) — consistent with the source's 30-wide
× 32-high playfield RAM at `400-7BF` (`CENDEF.MAC:61`) on a vertically mounted
monitor. Trackball counters are read 240×/s — once per IRQ (`centiped.cpp:514`).
