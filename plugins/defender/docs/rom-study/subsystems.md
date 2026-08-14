# Subsystem map — Defender (1981, RED software)

Every row below was read from numbered tool output (`awk`, `grep -n`) over the
vendored 1981 modules (`reference/original-source/defender/`) — the line numbers
are tool output, not transcription. Each subsystem is cited to its owning file
and the routine or header line that opens it. Read `brief.md` first for the
shipped set, banked-ROM model and timebase; the author vocabulary is decoded in
`glossary.md`.

The memory model the map hangs off: `$D000-$FFFF` is RESIDENT (always mapped —
`DEFA7`, `DEFB6`, `ROMF8`, `SAMEXAP7`), while `$C000-$CFFF` is a banked window
selected by writing a block number to the map-control register: block 1 is
`AMODE1`, block 2 is `MESS0`, block 3 is `ROMC0`/`ROMC8`, block 7 is `BLK71`.
The module-side evidence for each block identity is pinned below alongside the
runtime select sites.

## Resident control — `DEFA7` (scheduler, IRQ, collision, sound sequencer)

| Subsystem | Owning file + line | Role |
|---|---|---|
| `SLEEP` | `defender/DEFA7.SRC:12` | scheduler — put the current process to sleep for A 16-msec ticks, waking at X |
| `MKPROC` | `defender/DEFA7.SRC:72` | scheduler — create a process record |
| `IRQ` | `defender/DEFA7.SRC:1931` | the interrupt handler — splits on the beam counter; the sub-128 arm is the once-per-frame tick |
| `COLIDE` | `defender/DEFA7.SRC:2907` | collision detection over the object list |
| `SNDOUT` | `defender/DEFA7.SRC:693-706` | the sound-command sequencer — steps a sound table entry out to the separate sound board |

## Resident enemies — `DEFB6` (enemy processes and the bank-select helpers)

| Subsystem | Owning file + line | Role |
|---|---|---|
| `UFOST` | `defender/DEFB6.SRC:2-5` | enemy process exemplar — the "UFO PROCESS START"; each enemy is a scheduler process in this module |
| `MAPCH1/2/3/7` | `defender/DEFB6.SRC:1292-1299` | the bank-select helpers — write a block number to the map control so resident code can reach a banked block |

## Block 1 — `AMODE1` (attract, hall of fame, scanner)

| Subsystem | Owning file + line | Role |
|---|---|---|
| `HALLOF` / `SCNR` vectors | `defender/AMODE1.SRC:113-115` | the block's `ORG $C000` entry vectors — hall-of-fame entry and the scanner |
| `HALLOF` | `defender/AMODE1.SRC:117-119` | hall-of-fame / attract entry — the block's own content (attract mode, high-score entry) is the module-side evidence that block 1 is `AMODE1` |

## Block 2 — `MESS0` (messages, charset, text writers)

| Subsystem | Owning file + line | Role |
|---|---|---|
| module TTL | `defender/MESS0.SRC:1` | "MESS0 - MESSAGE BLOCK" — the module's own identity line (block 2's module-side evidence) |
| `WTEXTB` | `defender/MESS0.SRC:721-722` | write text block — the message/text writer entry |
| `WTEXTC` | `defender/MESS0.SRC:731-732` | write text character — the single-character text writer |

## Block 7 — `BLK71` (terrain, waves)

| Subsystem | Owning file + line | Role |
|---|---|---|
| module header | `defender/BLK71.SRC:6-7` | "TERRAIN , MINI-TERRAIN DATA AND PLAYER EXPLOSION" — the module's own identity header (block 7's module-side evidence) |
| `BGINIT` | `defender/BLK71.SRC:83` | terrain generation — the block's first entry vector |
| `WVTAB` | `defender/BLK71.SRC:89-90` | the wave data table — wave structure lives here |

## Resident effects — `SAMEXAP7` (materialize and explode)

| Subsystem | Owning file + line | Role |
|---|---|---|
| module header | `defender/SAMEXAP7.SRC:7` | "SAM EXPLOSIONS AND APPEARANCES" — enemy materialize (appear) and explode effects |

## Resident control at $F800 — `ROMF8` (reset, CMOS, pricing)

| Subsystem | Owning file + line | Role |
|---|---|---|
| `RESET` | `defender/ROMF8.SRC:63-64` | reset processing — PIA setup (and the `ORG $FB00 TEMPORARY!!!!!!` co-load origin) |
| CMOS allocation | `defender/ROMF8.SRC:16-20` | the CMOS RAM ledger — coin slot totals and bookkeeping |
| pricing equates | `defender/ROMF8.SRC:12-14` | CREDIT / coin-unit / bonus-unit equates — the coin/pricing state the CMOS ledger persists |

## Block 3 — `ROMC0` + `ROMC8` (diagnostics)

| Subsystem | Owning file + line | Role |
|---|---|---|
| `ROMC0` TTL | `defender/ROMC0.SRC:1` | "DIAG ROM AT C000" — the diagnostics block's own identity line |
| `ROMC8` TTL | `defender/ROMC8.SRC:1` | "DIAG ROM UPPER HALF" — the diagnostics upper half (also carries the default high-score credits `brief.md` answer 4 cites) |
