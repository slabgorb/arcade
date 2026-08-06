# Missile Command — ROM ground-truth brief

Pre-implementation dossier for the `missile-command` plugin. Every claim cites the
**REV-01** primary source vendored at `plugins/missile-command/reference/source/`
(provenance: `reference/PROVENANCE.md`, historicalsource @ `bab468c`). Hardware-only
facts cite MAME `src/mame/atari/missile.cpp`. This file is handed verbatim to every
later agent and to `rom-fidelity-audit` once code exists.

> Status: **skeleton-first** kickoff (owner decision, 2026-08-05). This brief is the
> constant-oracle the skeleton is built against so nothing hardens un-cited. The
> formal split-out (`subsystems.md`, `glossary.md`, `claims/*.json`, TDD citation
> checker) is a back-fill epic, not yet done.

## Preflight

### 0. Which revision?
**REV-01** — the vendored source (`035820-01`…`035825-01`; `MISSIL.DOC.txt`:
"LINK:REV-01 STARTING ADDRESS=5000"). It is the only revision with readable
assembler, so it is the only one whose *game logic* is citable. MAME's default
`missile` parent is REV-03 (`035820-02`, `035822-03e`) — treat every REV-03 delta as
an open question, never a silent pick.

### 1. What shipped?
Six 2716 program ROMs at `$5000–$7FFF` + one 82S123 video PROM. The CPU link
(`MISSIL.DOC.txt`) is `W3DSUP` + `W3COIN` + `W3SOUN` + `W3MAIN` + `W3INT`, each
`.INCLUDE`-ing the shared `W3COMN` (→ `COND65`) and, for `W3COIN`, `COIN65`.
- `035826-01` "BIT/BYTE PROM" (`A35826-PROM.txt`, @L6) is the **video write-mask
  PROM** — MAME's `m_writeprom` / `"proms"` region. It is *data assembled outside the
  CPU link* (the raster trap): it appears in no link string but absolutely ships.
- Bitmap game — **no character/picture/sprite ROM**. The playfield is a framebuffer
  in video RAM (see §Video). This is why the source is pure logic + a mask PROM.
- `A35820.1C` decodes to **`W3SOUN`** — the POKEY sound-system control ROM (ROM2 @
  `$6000`). O-1 is now **resolved** (see below and `reference/PROVENANCE.md`).

### 2. What radix?
`.RADIX 16` (hex) is set **once**, at `W3COMN.MAC:1`, and inherited by W3MAIN,
W3DSUP and W3INT via `.INCLUDE W3COMN` (`W3COMN.MAC` header: "THIS MODULE MUST BE
.INCLUDED IN W3MAIN, W3DSUP AND W3INT"). **No module sets its own radix** — a module
with no `.RADIX` is hex, not decimal. A **trailing period = decimal literal**
override, and it is used for real: `MAXMIS=10.` (decimal 10) vs `NABMS=8` (hex),
`TOPSCR=222.` (decimal) vs `CITY2H=0B4` (hex). Read every bare number as hex; read
`N.` as decimal.

### 3. What timebase?
Hardware (MAME, authoritative on the board):
- Master clock 10 MHz; pixel clock 5 MHz; `HTOTAL 320`, `VTOTAL 256`
  (`missile.cpp:454–462`).
- **VSYNC ≈ 61.0076 Hz** (PCB note, `missile.cpp:58`); nominal 60. Use the exact rate
  for any timer math; record both.
- 6502 @ **1.25 MHz** (10 MHz/8), dropping to **half speed** (10 MHz/16) from
  scanline 224 (`adjust_cpu_speed`, `missile.cpp:542–555`) — the CPU literally runs
  slower during the visible lower band; relevant to per-frame work budget.
- IRQ = `/32V` latched at SYNC, **4 IRQs per frame** (V = 0, 64, 128, 192 unflipped;
  `schedule_next_irq`, `missile.cpp:485–497`). VBLANK true when `V < 24`
  (`vblank_r`, `missile.cpp:528–532`).
Game-logic tick (**O-2, resolved** — full working in [`timebase.md`](./timebase.md)):
**one logic step per video frame.** The VBLANK interrupt sets `SYNC` (`INC SYNC`,
`W3INT.MAC:281`) once per frame — of the 4 IRQs/frame only the blank one does — and the
mainline blocks on it (`BEGIN ;SYNC UP WITH I/O`, `W3MAIN.MAC:497`), runs a frame, then
`INC FRAME` (`W3MAIN.MAC:781`). `FRAME` is the per-frame counter
(`FRAME: .BLKB 1 ;FRAME COUNTER (1-60)`, `W3MAIN.MAC:239`; sub-second use
`UPDATE EVERY 4/60 SEC`, `:623`). So the sim tick = **61.0076 Hz** (nominal 60).
(brief's earlier `W3DSUP.MAC:19` / `W3MAIN:2039` FRAME refs were logical/approximate;
the physical lines are `:239`/`:781`.)

### 4. What did the author already tell us?
- `MISSIL.DOC.txt` — Atari's own ROM/file ledger (part numbers, link command).
- `MISSIL.MAP.txt` — the memory map (RAM/video/POKEY/inputs/PROGRAM), matching
  MAME's decode.
- Programmer initials **DFT** (`W3MAIN.MAC:5`). Codename **WW3 / WWIII**.

## Subsystem map (source of record)

| Subsystem                         | Module      | Anchor (`.SBTTL`)                         |
|-----------------------------------|-------------|-------------------------------------------|
| Mainline loop + state machine     | `W3MAIN`    | `:238 MAINLINE`, `:270 PLAY`, `:281 SETUP STATE`, `:308 PAUSE STATE` |
| Cursor / trackball → crosshair    | `W3MAIN`    | `:424 PROCESS CURSOR MOTION`, `:546 ADD TBALL TO CURSOR`, `:587 UPDATE CURSOR` |
| Player ABM launch                 | `W3MAIN`    | `:606 LAUNCH ABMS`, `:665 LAUNCH 1 ABM`   |
| Enemy ICBM / CM / MIRV            | `W3MAIN`    | `:722 UPDATE ICBM POSITIONS`, `:1137 LAUNCH ICBMS`, `:1318 CRUISE MISSILE LAUNCH`, `:1342 MIRV AN ICBM` |
| Explosions + damage detection     | `W3MAIN`    | `:906 PROCESS EXPLOSIONS`, `:963 MISSILE DAMAGE DETECTION`, `:1035 SPUTNIK KILL`, `:1084 DESTROY A CITY OR BASE` |
| Missile geometry (velocity/aim)   | `W3MAIN`    | `:1589 CALC DELTA`, `:1640 CALC MISSILE VELOCITY`, `:1736 DIVIDE` |
| Wave setup + scoring + bonus      | `W3MAIN`    | `:1916 NEW GAME SETUP`, `:1951 NEW WAVE SETUP`, `:2025 ICBM SPEED & SCORING`, `:2074 END OF WAVE`, `:2162 CITY BONUS`, `:2383 REGENERATE CITIES` |
| Circle / explosion picture        | `W3MAIN`    | `:2466 DISPLAY EXPLOSION PICTURE`, `:2503 DRAW A CIRCLE` |
| Attract mode + scroll             | `W3MAIN`    | `:446 SMART CURSOR MOVER (ATTRACT)`, `:2639 REFRESH ATTRACT`, `:2666 SCROLL ATTRACT` |
| All drawing (stamps/cities/text)  | `W3DSUP`    | `:294 WRITE A STAMP`, `:534 DRAW ALL LIVING CITIES`, `:611 DRAW MISSILE`, `:742 DRAW COAST`, `:792 COLORS FOR NEXT WAVE`, `:856 CLEAR SCREEN` |
| High-score ladder + name entry    | `W3DSUP`    | `:1862 INIT HI SCORE`, `:1890 UPDATE LADDER`, `:2032 TAKE INITIALS`, `:2145 DISPLAY HI SCORES` |
| Language literals (EN/FR/DE/ES)   | `W3DSUP`    | `:1513–1749` FR/DE/ES/EN literal tables    |
| Coin door                         | `W3COIN`+`COIN65` | Atari standard coin handler          |
| Interrupt / video timebase        | `W3INT`     | `:169 PROCESS INTERRUPT`, `:269 HANDLE VBLANK` (O-2 resolved → `timebase.md`) |

## Cited constants (the skeleton's oracle) — all `W3COMN.MAC`

| Symbol   | Value (as written) | Decoded | Meaning | Line |
|----------|--------------------|---------|---------|------|
| `MAXMIS` | `10.`  | 10 dec | ABMs per base (missiles loaded)        | `:29` |
| `NABMS`  | `8`    | 8      | max friendly ABMs in flight            | `:33` |
| `NICBMS` | `8`    | 8      | max enemy ICBMs tracked                | `:35` |
| `NCITY`  | `6`    | 6      | **max cities (default hardware = 6)**  | `:39` |
| `NMISBA` | `3`    | 3      | missile bases                          | `:41` |
| `MXICON` | `7`    | 7      | max ICBMs on screen at once            | `:193` |
| `MAXMUL` | `6`    | 6      | max score multiplier (rises by wave)   | `:201` |
| `SPUTWV` | `2`    | 2      | first wave with a Sputnik (satellite)  | `:203` |
| `MIRVWV` | `1`    | 1      | first wave with a MIRV                  | `:205` |
| `STUPID` | `9`    | 9      | wave at which cruise missiles may fly up | `:231` |
| `TOPSCR` | `222.` | 222 dec| top-of-screen vertical coord           | `:107` |
| `CITY1H..CITY6H / ..V` | hex | — | the six cities' fixed H/V positions | `:123–145` |
| `SCITYM` | `03`   | mask   | "5 cities at start" option-2 mask      | `:195` |
| `LAUHGT` | `0CA`  | hex    | ICBM height gate: below this launches more | `:171` |

Radix caution: `MAXMIS`/`TOPSCR` are decimal (trailing period); city coords are hex.

## Open questions

- **O-1** *(RESOLVED — see [`PROVENANCE.md`](../../reference/PROVENANCE.md))* — `A35820.1C.bin` is **`W3SOUN`**, the WW3 POKEY sound-system control ROM.
  It is REV-01 **ROM2** (part `035822-01`, load `$6000`, `MISSIL.DOC.txt:21`). Decode method: it is
  not a raw ROM image but **ASCII assembler source** (CRLF-lined, null-padded to
  `0x2400`) that was mis-vendored as a `.bin` because its CR/LF + padding were never
  LF-normalized like its `.MAC` siblings. Identity is doubly pinned — by its own
  `.TITLE W3SOUN-(WAS T2SOUN)` header + POKEY content (`AUDCTL`/`AUDF1`), and by its
  `.INCLUDE COND65`-yes / `W3COMN`-no fingerprint matching MISSIL.DOC's per-object
  include ledger for `.1C` (COND65 list = `.1A,.1C,.1D,.1E`; W3COMN list =
  `.1A,.1D,.1E`). All five link objects now resolve — `.1A`=W3DSUP, `.1B`=W3COIN,
  `.1C`=W3SOUN, `.1D`=W3MAIN, `.1E`=W3INT — so the module inventory is provably complete.
- **O-2** *(RESOLVED — see [`timebase.md`](./timebase.md))* Exact sim tick: **one logic
  step per video frame**, released by the VBLANK IRQ (`W3INT.MAC:281`) and counted by
  `FRAME` (`W3MAIN.MAC:781`). Rate **61.0076 Hz**, nominal 60.
- **O-3** REV-01 vs MAME REV-03 default: the "missile" most players know is REV-03.
  Catalogue behavioural deltas (e.g. difficulty tuning) as they surface.
- **O-4** *(RESOLVED — see [`starting-cities.md`](./starting-cities.md))* Default start =
  **6** cities = `STCITY[0]` when `OPTIO2 & SCITYM` = 0, read at NEW GAME SETUP
  (`LDA AY,STCITY`, `W3MAIN.MAC:3877`; table `STCITY: .BYTE 6,4,5,7`, `W3MAIN.MAC:3895`).
  `NCITY=6` is the *max*; `SCITYM`'s "5 cities" is the option-2 (Y=2) selection, not the
  default. Options: `{0:6, 1:4, 2:5, 3:7}`.
- **O-5** Video RAM 3rd-colour-bit scatter (`missile.cpp:617–625 get_bit3_addr`,
  MISSIL.MAP "3RD BIT COLOR REGION" `$0200–$05FF`): our render need not reproduce the
  hardware address scramble, but the *palette* (8 colours, 3 bits) and per-wave colour
  cycling (`W3DSUP:792`) must match. Confirm colour source.
