# Defender (1981) — Ground-Truth Brief

Produced with the `rom-source-study` skill (story `df1-2`). Defender is Eugene
Jarvis's 1981 Williams game — the first of the Williams 6809 line — and this tree
is its original RASM assembler source: twelve `.SRC` files, eleven assembler
modules plus the prose build notes `INFO.SRC`. Everything below was re-opened
against the vendored 1981 source this session, and every backticked citation is
pinned by a `claims/*.json` entry the citation gate re-opens byte-for-byte.

**Primary source:** `reference/original-source/defender/` — a vendored copy of
[historicalsource/defender](https://github.com/historicalsource/defender), pinned
`3fae9d3` (`docs/reference-sources.md`). Citations are `defender/FILE:LINE` into
that tree; a bare filename resolves at the tree root (a single vendored revision).
**Secondary source:** MAME drivers `src/mame/midway/williams.cpp` /
`williams_m.cpp`. They win only on board-level facts the source never states
(master clock, exact refresh, ROM checksums per set) — cited in prose, never
copied (GPL).

**Line-number discipline.** Line numbers are copied only from numbered tool output
(`awk`, `grep -n`), never from memory or arithmetic — the centipede study drifted
its line numbers by one, and the citation gate exists because of it. Read
`reference/original-source/defender/`, or set `DEFENDER_SOURCE_DIR`.

---

## 0. Revision — this tree is the RED (cocktail) software

`INFO.SRC` carries Williams' own colour-coded release ledger
(`defender/INFO.SRC:15-23`): **WHITE** is the first release *without checksums*,
BLUE the first with checksums, GREEN the second release re-cut for 2716 EPROMs,
and ROM1C et al. are the **RED software — the cocktail release**, also released
for upright. The vendored tree is the RED software, identified three independent
ways:

1. **The cocktail machinery is present and live.** The screen-flip data pair is
   declared at `defender/PHR6.SRC:15` — `WDATA EQU $38` with the comment
   `NORMAL SCREEN;($39=FLIPPED)` — and the player-2 switch tests the cocktail
   PIA bit and swaps in the upside-down IRQ: `LDA PIA3` / `COCKTAIL?` /
   `LDX #IRQB SWITCH UPSIDE DOWN GUYS` (`defender/DEFA7.SRC:1190-1193`), with
   the flipped handler itself headed `*INVERTED IRQ FOR SCREEN FLIP`
   (`defender/DEFA7.SRC:2006-2008`).
2. **Checksums are present, ruling out WHITE.** The resident block opens with a
   baked-in checkbyte — `FCB $4A CKBYT CHECKSUM(ACTUAL)` (`defender/DEFA7.SRC:5`)
   — and WHITE is defined by the ledger as the release *without* checksums.
3. **CRC-for-CRC match against MAME's parent set.** Every ROM image in the
   owner's zip matches ROM_START(defender) in williams.cpp:1985-2007, the set
   MAME labels the "Red label" parent (williams.cpp:3968). The CRC leg is
   measurement against the built ROMs; the two legs above are the same fact read
   out of the source.

## 1. What shipped — eleven modules, one banked window, and two gaps

**The RASM assembly chains.** The build notes open with the three chains
(`defender/INFO.SRC:3-9`): `RASM PHR2,DEFA2,DEFB2,AMODE0;-X` (the `-X` else
"CREF SYMBOL OVERFLOW"), `RASM PHR2,SAMEXPA7` (the notes' own spelling — the
shipped file is `SAMEXAP7.SRC`), and `RASM PHR2,DEFA2,DEFB2`; diagnostics chain
"ALL.CF". Each chain opens with a PHR-series module — the equate/macro header
whose shipped revision is `PHR6.SRC` — listed first in every `RASM` invocation;
`SAMEXAP7.SRC` is the one module that also *textually* pulls it in, beginning
`INCLUDE PHR6.SRC` (`defender/SAMEXAP7.SRC:2`).

**The file ledger.** `INFO.SRC` closes with the shipped file list and line counts
(`defender/INFO.SRC:30-39`): PHR6, DEFA7, DEFB6, AMODE1, BLK71, SAMEXAP7, MESS0,
ROMF8, ROMC0, ROMC8 — ten `.SRC` modules (plus INFO itself and one straggler,
below). **BRUTSUM2.SRC is absent from that ledger and was never shipped**: it is
a stand-alone development checkbyte tool — it assembles at `ORG $8000`
(`defender/BRUTSUM2.SRC:1`) and sums 2K ROMs — not part of any chain.

**The banked-ROM block map.** The resident code assembles at `$D000-$FFFF`
(`ORG $D000`, `defender/DEFA7.SRC:4`: DEFA7 + DEFB6 + ROMF8 + SAMEXAP7), and
banked blocks swap through the `$C000` window under `MAPC EQU $D000 MAP CONTROL`
(`defender/PHR6.SRC:11`):

| block | contents | evidence |
|-------|----------|----------|
| 1 | AMODE1 — attract / hall of fame | `ATTR JSR MAPCH1` (`defender/DEFA7.SRC:1085-1086`) |
| 2 | MESS0 — messages / charset | `LDA #2` … `SELECT CHARS` (`defender/DEFA7.SRC:2030-2031`) |
| 3 | ROMC0/ROMC8 — diagnostics | `DIABLK EQU 3 DIAGNOSTIC BLOCK` (`defender/ROMF8.SRC:7`) |
| 7 | BLK71 — terrain + wave data | `LDA #7` → `STA MAPC` before BGOUT (`defender/DEFA7.SRC:2024-2025`) |

**The sound-source gap.** The sound board is a **separate M6808 CPU** with its
own sound program — historically distributed as **`defend.snd`**, carried in
current MAME sets under a different ROM name — and its source is **not in this
tree** — the same gap as joust. These are MAME-driver facts (williams.cpp; the
vendored tree names neither the M6808 nor any sound file), stated here without a
structure-level citation because this repo pins no MAME revision yet — `df1-4`
pins one before board facts are recorded as claims.
ROMF8/ROMC0/ROMC8 are main-CPU control and diagnostic ROMs, *not* sound; nothing
here assembles the sound program. Sound ground truth will need the MAME set
(`df1-6`'s problem, recorded as a gap here).

## 2. RASM dialect — the conventions, one cited example each

Williams RASM (Motorola 6809), not MAC65 — the discipline differs from the Atari
games in this cabinet:

- **`$` prefixes hex; a bare literal is decimal.** Both spellings sit side by
  side in the equates: `MAPC EQU $D000` (`defender/PHR6.SRC:11`) vs
  `YMAX EQU 240` (`defender/PHR6.SRC:20`). There is **no octal, no binary, and
  no trailing-period radix game** (unlike MAC65's `16.`).
- **`!>` is the shift/byte operator.** `SETDP RAM!>8` sets the direct page from
  the high byte of the RAM base (`defender/DEFA7.SRC:6`).
- **`!.` is the bit-mask operator.** `LDB #LCOINV!.$FF` masks the equate to a
  byte (`defender/DEFA7.SRC:629`).
- **`MACRO`/`ENDM` with backslash-numbered params** (`\0`, `\1`, …):
  `NAPP MACRO \0,\1` (`defender/AMODE1.SRC:33`) — the process-nap macro the
  timebase answer leans on.
- **No conditional assembly, no local labels** — every label is global, which is
  why the chains hit "CREF SYMBOL OVERFLOW" without `-X`.

## 3. Timebase — nominal 60 Hz vs exact 60.09615 Hz, as separate numbers

Two numbers, deliberately recorded as **separate** facts, never conflated:

- **Nominal (the author's model): 60 Hz — a 16-msec tick.** The scheduler's own
  comment defines sleep time in 16-msec units: `*A=SLEEP TIME X 16MSEC`
  (`defender/DEFA7.SRC:9`), and the attract code sleeps `NAPP 60,HOFST` with the
  comment `SLEEP 1 SECOND` (`defender/AMODE1.SRC:311`) — sixty ticks to the
  author's second.
- **Exact (the board): 60.09615 Hz.** MAME measures the video chain as
  `set_raw` 8 MHz / (512 × 260) = 60.09615 Hz (williams.cpp:1556). Prose
  corroboration only — the source never states it.

**Gating.** The mainloop spins on the frame counter: `EXEC0 LDA TIMER` /
`BEQ EXEC0` / `CLR TIMER` (`defender/DEFA7.SRC:3048-3050`). `TIMER` is
incremented **once per frame** by the IRQ's sub-128 beam arm — the handler reads
`VERTCT` (`PAST 128`), compares with 128 and branches to the `I0` arm
(`defender/DEFA7.SRC:1937-1939`), which does `INC TIMER`
(`defender/DEFA7.SRC:1963`).

**Overload.** When the executive falls behind, it degrades rather than slows:
the `EXEC00` path accumulates an overload count, cuts the stars down and — at
`*OVERLOAD WIPE OUT A GUY` — starts culling objects
(`defender/DEFA7.SRC:3056-3070`). Any port that "runs the whole frame or
nothing" has erased this mechanism.

## 4. Authorship — INFO.SRC is the author's own documentation

The build notes are signed and dated: `DR J. 1/21/81` (`defender/INFO.SRC:11`) —
Eugene Jarvis, in the first person ("LOAD IT ALL AND THEN PRAY IT WORKS"). The
notes are primary source for the build process, the release ledger and the file
list, in the author's own voice.

The credits ship inside the game, smuggled into the **default high-score table**:
`DEFALT` in ROMC8 seeds the CMOS high-score defaults with three-letter initials
`FCC 'DRJ'` (Jarvis) through `FCC 'TMH'` (`defender/ROMC8.SRC:783-797`) — DRJ,
SAM, LED, PGD, CRB, MRS, SSR, TMH: the development team, in score order, where an
attract-mode viewer sees them.

---

*Scope: this brief answers the five `rom-source-study` preflight questions only.
The glossary, subsystem map and open questions are `df1-3`; the secondary-source
MAME board facts are `df1-4`; sound is `df1-6`'s gap to close.*
