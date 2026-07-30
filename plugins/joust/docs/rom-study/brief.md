# Joust (1982) — Ground-Truth Brief

Produced 2026-07-19 with the `rom-source-study` skill. Every citation below was
re-opened and verified against numbered tool output in this session (the
hand-run equivalent of the citation checker; building the automated checker is
an early story, per the centipede precedent).

**Primary source:** `arcade/reference/williams-source/joust/` (verbatim vendored
copy of [historicalsource/joust](https://github.com/historicalsource/joust),
pinned `9bcfdb1` "Prepare to Joust"; already LF/ASCII). Citations are file:line
in that tree.
**Secondary source:** MAME driver `src/mame/williams/williams*.cpp` (sparse
clone at `~/Projects/mame`, extended this session with `src/mame/williams` +
`src/mame/shared`). Wins only on board-level facts the source never states.
Neither source's code is ever copied into this repo (copyright / GPL).

Credits, in the author's own header (`JOUSTRV4.SRC:5-11`, identical in RV1-3):
Williams Electronics 1982 · game designer **John Newcomer** · main programmer
**Bill Pfutzenreuter** · other programmers Cary Kolker, Ken Lantz · started
Feb 10, 1982.

## 0. Revision — four program revisions, three shipped label sets

The tree holds four complete revisions of the game module in one flat directory
— `JOUSTRV1.SRC` … `JOUSTRV4.SRC` — plus paired diagnostic/utility revisions
(`T12REV1/T12REV3`, `TB12REV1/TB12REV3`). MAME preserves three shipped sets
(`williams.cpp:4013-4015`): `joust` (Green label, parent), `jousty` (Yellow),
`joustr` (Red) — all `GAME( 1982, … "Williams" … ROT0 …)`.

**The correlation, from checksum forensics** (details and full evidence chain
in `open-questions.md` §1):

| Source family | Diagnostic pair | Label sets | Evidence |
|---|---|---|---|
| RV1, RV2 | T12REV1, TB12REV1 | Yellow `1a-12a 3006-1..12` + Green `1b-12b 3006-13..24` (which is which is **open** — open-questions §1) | T12REV1 ROMTAB expects `$6000` PROM sum `$22`; TB12REV1 date stamp `07/21/82` (`TB12REV1.SRC:394`) |
| RV3, RV4 | T12REV3, TB12REV3 | Red `3006-28..39` (`joustr`); RV4 is the shipped red program | RV3/RV4 fudge `$6000` to sum `$85` (`JOUSTRV3.SRC:1140`, `JOUSTRV4.SRC:1136`); RV4's patch-area fudge targets `$D000` sum `$3D` (`JOUSTRV4.SRC:6278`) — both match T12REV3's ROMTAB (`FCB $60,$85` / `FCB $D0,$3D`); TB12REV3 stamps `09/10/82` (`TB12REV3.SRC:394`); RV4 patch area dated `10/29/82` (`JOUSTRV4.SRC:6270`) |

The clincher: `diff T12REV1 T12REV3` is **only** the ROMTAB — and the sums
left unchanged (`$0000/$1000/$2000/$4000`) correspond exactly to the four
EPROMs MAME says all three label sets share (ROMs 1,2,3,5), while the changed
sums (`$3000,$5000,$6000,$7000,$8000,$D000,$E000` + the `$F000` check byte)
correspond exactly to the eight chips the red set re-cut.

Revision deltas (verified by direct diff this session):

- **RV1→RV2** (79 diff lines): message-queue erase fix (`PAMSG` area).
- **RV2→RV3** (97 lines): the patch era begins — new RAM at `$B300` for the
  lava troll (`LAVKLL` "TIME LEFT TILL LAVA TROLL GETS REAL STRONG", `CLVGRA`
  "LAVA TROLL CURRENT GRAVITY"), `PATCH1`/`PATCH2`, `JZAPPER` anti-tamper
  re-keyed, copyright string shortened to make room for checksum fudges.
- **RV3→RV4** (403 lines): the famous pterodactyl/balance patches —
  `PATCH4` "PTERODACTYL BETTER KILLER (AIM LOWER)", `PATCH5` "PTERODACTYL,
  SLOW DOWN TO KILL PLAYER", `PATCH6` (cliff-gap zoom), `PATCH8`/`PATCH9`
  (baiters), `PATC10`, `PATC11` "CLEAN UP GLADIATOR WAVE", `BAITBL` retuned.
  Patch bodies live at `ORG $D760` (`JOUSTRV4.SRC:6270-6403`), each preserving
  the pre-patch instruction as a `********` comment.

**Implementation-target ruling is deferred to the design spec** (green/B = the
MAME parent and the common July-'82 cabinet, vs red/RV4 = Williams' final word
with the harder pterodactyl). All four revisions are single files in one tree,
so stories can cite RV4 line numbers while the spec records which behavior
(pre- or post-patch) is authoritative. The revision question is therefore a
*ruling*, not a source gap.

## 1. What shipped

The author's own assembly map (`JOUST.DOC:14-21`): seven modules —
`JOUSTI.SRC` (images), `MESSAGE.SRC` (strings/font/routines), `TB12.SRC` (game
utilities), `JOUST.SRC` (the game), `ATT.SRC` (attract marquee), `SYSTEM.SRC`
(beam interference / process / IRQ overhead), `T12.SRC` (diagnostics +
H.S.T.D. boarder). The tree's `JOUSTRV*.SRC` / `T12REV*` / `TB12REV*` are the
revisioned instances of `JOUST.SRC` / `T12.SRC` / `TB12.SRC`.

Include graph (all verified): game modules pull the *short* twins —
`JOUSTRV4.SRC:15-17` includes `SHRAMDEF.SRC`, `SHORTEQU.SRC` ("CMOS"),
`MESSEQU.SRC` — while system/support modules pull the full ones:
`SYSTEM.SRC:12-13` (`RAMDEF`, `EQU`), `MESSAGE.SRC:3-6` + `PHRASE` at `MESSAGE.SRC:1176`,
`ATT.SRC:6-8`, `T12REV*:3-6`, `TB12REV*:2-5`. `JOUST.DOC:26,28,30` warns
"BEWARE OF JOUST.SRC" on the short twins.

ROM address map (MAME `ROM_START( joust )`, `williams.cpp:3006-3027`): twelve
4K program EPROMs — 1-9 at `$0000-$8FFF`, 10-12 at `$D000-$FFFF`. `$9000-$CFFF`
is unstuffed, confirmed three ways: no ROM_LOAD, and T12's ROMTAB carries
`SUM=0 THEN PART IS NOT STUFFED` for `$9000-$C000`.

**Gaps (vendoring):**

- **No ROM binaries in the tree** (unlike centipede) — byte-gating a picture
  transcription must gate against `JOUSTI.SRC`'s own FCB/FDB data and the
  `*.PIC` Motorola S-Records, which are themselves primary source.
- **The sound board source is absent.** `JOUSTSND.DOC:2` says only
  `SEE [LIBRARY.SOUND]VSNDRM4.SRC`; `JOUST.DOC:33` names `JOUSTSND.SRC -
  ENTIRE 4K SOUND ROM (6800 PROCESSOR)`. Neither file is in the repo. MAME
  confirms the shipped chip is the *shared* Williams board ROM
  `video_sound_rom_4_std_780.ic12` (`williams.cpp:3022`) — sound ground truth
  will lean on MAME's board emulation + that ROM's behavior (open question).
- `JOUSTI.SRC` is the merged, self-contained images source (single
  `ORG $0000`, no INCLUDEs); the per-entity `OSTRICH.SRC`/`BUZZARD.SRC`/… and
  `*.PIC`/`OSTICH.FRM` S-Records are the artist's working copies (provenance,
  not the link target).

## 2. Radix — Motorola conventions, three bases in live use

No `.RADIX` directive exists in this assembler. Bare numbers are **decimal**;
`$` = hex; `@` = **octal**; `%` = binary. All three appear in shipped data:
decimal loop constants (`50$ LDX #14285/2  1/2 SEC DEBOUNCE`,
`JOUSTRV4.SRC:1830`), hex addresses everywhere, and **octal pixel rows in the
image sources** (`FCB @000,@377,@160,…` — `OSTRICH.SRC`). The trap to record
in every transcription story: an `@` row next to a `$` row in the same frame.
Operators: `!H(x)` high byte (`RAMDEF.SRC:116` `SETDP !H(BASE)`), `!X`
XOR-family (`OSTRICH.SRC` `$0814!XDMAFIX`); `SETDP` is direct-page, not radix.

## 3. Timebase — 60.10 Hz video, a "4 ms" VA11 IRQ, nap-scheduled processes

Board facts (MAME): master clock 12 MHz (`williams.cpp:1531`), MC6809E at
12/3/4 = **1.0 MHz** E-clock (`williams.cpp:1537`); video `set_raw(MASTER_CLOCK*2/3, 512,
6, 298, 260, 7, 247)` (`williams.cpp:1556`) → 8 MHz dot clock, 512×260 total, 292×240
visible → line rate 15.625 kHz, frame **60.0962 Hz exact** (8e6/(512·260));
nominal 60.
The VA11 line toggles every 32 scanlines (`williams.cpp:1545-1546`); a separate COUNT240
line rises at scanline 240 (`williams.cpp:1548-1549`).

Source side: the PIA is initialized to interrupt on VA11's **low-high edge
only** — "`ENABLE PIA'S 4MS INTERUPT LOW-HIGH EDGE`" (`SYSTEM.SRC:95`) — so
the "4 ms" IRQ fires on a subset of VA11 toggles, ~4 per frame; the IRQ
handler walks display DMA by quadrant ("`BUMP QUADRANT COUNTER (SAME AS VERT
COUNTER)`", `SYSTEM.SRC:715`) and updates color RAM "`ON VERTICAL LINE 0`"
(`SYSTEM.SRC:589`). Game logic is **not** a per-frame mainloop: entities are
cooperative *processes* that sleep in IRQ ticks (`PCNAP n`). Exact IRQ
cadence, the process scheduler, and the tick unit of every gameplay constant
are subsystem-study material (`subsystems.md`); **no gameplay constant may be
converted to seconds without naming its tick basis.**

## 4. What the author already told us

- `JOUST.DOC` (42 lines, read in full) — the assembly conditions (`DEBUG EQU
  0/1`, `JOUST.DOC:3-12`), the module map (`JOUST.DOC:14-30`), the missing-sound pointer
  (`JOUST.DOC:32-34`), the checksum calculator (`SUMMER.SRC`, `JOUST.DOC:36-37`), and the VAX
  tooling (`COMPACT.COM` "COMPACT CLIFF5 GIVEN 1 SCREEN LINE PER-RECORD,
  ASCII HEX NIBBLES 0, 8-E", `DOWNLDS.COM`, `JOUST.DOC:39-42`).
- **Anti-tamper is load-bearing**: `SUMMER.SRC` is the developer's calculator
  for the in-game `JZAP`/`LZAP`/`KZAP` checksum traps and the `$F000` master
  table at `$F320` ("MAKE F000 ADD UP TO 77"); the game re-keys these every
  revision (`EORA #$B6` in RV2 → `EORA #$A1` "JZAPPER DATA",
  `JOUSTRV4.SRC:1741`). The sting is deliberately subtle: on mismatch `JZAP`
  executes `INC LXPOS2+1` (`JOUSTRV4.SRC:1743`) — corrupt one position byte
  and return, so bootlegs degrade mysteriously. The clone **omits** the
  zappers deliberately and documents that omission; it must never port a
  checksum trap whose sums cannot hold in a re-implementation.
- `T12REV*` is the `$F000` "TEST ROM … INCLUDING AUDITING AND ADJUSTMENTS"
  (`T12REV1.SRC:1`) — diagnostics, operator bookkeeping, H.S.T.D. — and its
  `ROMTAB` (`IFE DEBUG … SUM=0 THEN PART IS NOT STUFFED`) is the per-PROM
  checksum ledger used for the revision correlation above.
