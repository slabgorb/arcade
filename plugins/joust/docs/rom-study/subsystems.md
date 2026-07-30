# Joust — Subsystem Map

Companion to [`brief.md`](brief.md). Subsystem → owning file, routines, and the
load-bearing facts, each cited file:line into the vendored tree (pin `9bcfdb1`).
Produced from five parallel study passes, 2026-07-19; every citation was
re-opened against numbered tool output, and a 20-citation cross-sample was
re-verified at synthesis. Line numbers cite `JOUSTRV4.SRC` (the red-label
final) unless another file is named.

## 1. Executive / OS (`SYSTEM.SRC`, with `RAMDEF.SRC` + `EQU.SRC`)

**Process model — the architecture a clone's core must mirror.**
40 cooperative coroutine slots (`PBLKM EQU 40`, `RAMDEF.SRC:166`), each a
**56-byte block**, laid out by the `RMB` directives from the block's own
`ORG $0` (`RAMDEF.SRC:167`):

| Field | Bytes | Cite | Role |
|---|---|---|---|
| `PLINK` | 2 | `RAMDEF.SRC:168` | link to next process (0 ends the chain) |
| `PID` | 1 | `RAMDEF.SRC:169` | id number (0 = slot empty) |
| `PPRI` | 1 | `RAMDEF.SRC:170` | scheduling class / object-block link |
| `PNAP` | 1 | `RAMDEF.SRC:171` | sleep time in frames |
| `PPC` | 2 | `RAMDEF.SRC:172` | resume PC |
| **overhead** | **7** | | the five fields above |
| `PPOSX` | 3 | `RAMDEF.SRC:173` | X position — **16-bit pixel + fraction** |
| `PPOSY` | 3 | `RAMDEF.SRC:174` | Y position — **16-bit pixel + fraction** |
| `PRAM` | 43 | `RAMDEF.SRC:176` (`PRAML EQU 43`, `RAMDEF.SRC:175`) | process-exclusive RAM |
| **`PBLKL`** | **56** | `RAMDEF.SRC:180` | `EQU *` — the assembled block length |

That is **7 overhead** bytes plus six position bytes plus 43 exclusive bytes =
a **56-byte block**.

**Provenance — why this said 51 for four stories.** `PBLKL`'s own author
comment reads *"8 OVERHEAD BYTES + PROCESSES EXCLUSIVE RAM"*
(`RAMDEF.SRC:180`). That comment is **stale and the directives above it are
authoritative** — the assembler follows `RMB`, not the comment. The old 51
figure was wrong in *two independent ways*: it took the comment's inflated
overhead (8 rather than 7) **and** dropped `PPOSX`/`PPOSY` entirely, since
8 + 43 = 51 only works if the position fields do not exist. Correcting the
overhead alone would give 50, still wrong. The comment is kept here rather than
deleted because it is the evidence for how the error survived, and a reader who
finds it later should meet the correction with it.

**For jt1-5:** those six position bytes are the field the flight model
integrates — `PPOSX`/`PPOSY` are 3 bytes each, a 16-bit pixel+fraction value
plus its page byte, and they live **inside** the process block, not beside it.
A core state struct sized from the old 51 would have no room for them.

Dispatch is `JMP [PPC,U]`
(`SYSTEM.SRC:221`); `PCNAP n` pops the JSR return address as the resume PC
(`NAPTPC`, `SYSTEM.SRC:222-225`). **The stack is reset every pass**
(`LDS #STACK` at `SYSTEM.SRC:216,237,321`) — all coroutine state lives in the
block, never in locals. Two scheduling classes run as two full passes
(primaries then secondaries — `PRISEC`, `SYSTEM.SRC:217,231,248`; `PROCCR`
sets `PPRI`=0, `SECCR` 255, `RAMDEF.SRC:8-18`). Kill takes ID+mask so one call
kills a class (`KLPROC`, `SYSTEM.SRC:341-346`).

**Frame pacing.** `PNAP` decrements once per exec-loop pass
(`SYSTEM.SRC:233,250`) and the loop is gated by the DMA double-buffer
(`EXECST`/`EXEINT` spin, `SYSTEM.SRC:162-169`; buffer release `SYSTEM.SRC:316-317`) —
one pass per video frame. **1 nap unit = 1 frame = 1/60.096 s**, confirmed
independently by author oracles: `PCNAP 60 WAIT A SECOND` (`JOUSTRV4.SRC:5934`),
`LDA #90  1 1/2 SECOND` (`JOUSTRV4.SRC:959`), `LDD #30*60  30 SECOND WAIT` (`JOUSTRV4.SRC:6393`),
`LDD #60*60  NBR OF INTERUPTS UNTIL 1 MINUTE` (`SYSTEM.SRC:612`), and the
`SECONDS*60/8` idiom in `BAITBL` (`JOUSTRV4.SRC:2150-2163`). Overrun slows the game
(nap units stretch); it never tears.

**IRQ** (`SYSTEM.SRC:578-728`): PIA CB1 rising edge on VA11 → handler at
~240 Hz; everything after the quadrant test (`VSCAN ANDB #$C0`,
`SYSTEM.SRC:587-589`) runs only on quadrant 0 = 60 Hz. Per-IRQ: watchdog
(`SYSTEM.SRC:579-580`), PRNG stir (`INC RANDOM / DEC RANDOM+1`, `SYSTEM.SRC:581-582` — **RNG
advances on a timer, not only on calls**), beam-interference DMA walk
(never blit into the beam's quadrant, `SYSTEM.SRC:697-700`). Per-frame: colour-RAM
commit from the `RAMCOL` shadow (`SYSTEM.SRC:591-593` — palette writes are deferred,
not immediate), switch debounce (9-deep shift register, `SYSTEM.SRC:617-650`).

**Blitter** ("Special Chips", DMA at `$CA00`): 8-byte blocks + link, 60
transfers/frame budget (`RAMDEF.SRC:144-152,362`); control bits
`H,L,F,K,Z,S,W,R` (`RAMDEF.SRC:154-162`) map 1:1 to MAME's flags; fired by a
`PULU`/`PSHS` trick with IRQs off (`SYSTEM.SRC:708-711`). Full pixel-format
detail in [`pictures.md`](pictures.md).

**Memory map** (source ↔ MAME `williams.cpp:532-548` agree on every symbol):
DP base `$A000`, stack `$BF00`, `GAMORG $5ED0`, video RAM `$0000-$97FF`
(column-major), ROM overlay bank-switch `$C900` (write-only; shadow `DRRUC
$BFFF`), palette `$C000`, blitter `$CA00`, video counter `$CB00`, watchdog
`$CBFF` (feed `$39`), CMOS `$CC00` (**4-bit wide** — `cmos_4bit_w`),
PIAs `$C804`/`$C80C`.

**Input**: muxed via widget-PIA CB2 (`EQU.SRC:70`; game code `P1JOY`/`P2JOY`,
`JOUSTRV4.SRC:7247-7264`): WPIAA `$01` left, `$02` right, `$04` flap ("JUMP BUTTON"),
`$10` start-2, `$20` start-1. Joystick normalised to −1/0/+1
(`ANDA #$03 / ASRA / SBCA #0`, `JOUSTRV4.SRC:7261-7263`).

**Sound interface**: 6-bit command on coin-door PIA B (`$C80E`), `$FF` idle
strobe (`SYSTEM.SRC:184-187`); priority-gated queue of (code, duration)
entries (`SND`, `SYSTEM.SRC:761-773`). Board: M6808 @ 3.58 MHz÷4 + MC1408
DAC (`williams.cpp:1540,1563`); its 4K ROM source is absent from the tree
(brief §1).

## 2. Flight physics + entity mechanics (`JOUSTRV4.SRC` + `SHRAMDEF.SRC`)

**Entity model**: every entity is a process block; position is 3 bytes/axis
(page, pixel, fraction — `SHRAMDEF.SRC:176-177`); **velocity unit = 256 per
pixel/frame** (`ADDGRX ADDD PPOSY+1,U`, `JOUSTRV4.SRC:6494`). `PVELY` is a 16-bit signed
fraction; **`PVELX` is a table index, not a velocity** (`SHRAMDEF.SRC:191,193`).
The struct is overlaid per role (wave processes `ORG PPOSX` `JOUSTRV4.SRC:146`; eggs
store score-message state in `PRDIR`/`PPVELX` `JOUSTRV4.SRC:3028-3036`) — a clone needs a
tagged union, not one flat struct.

**The flap model** (the game's soul):
- Gravity base 4/frame (`GRAV`, `JOUSTRV4.SRC:952-953`); wings **down adds 0**, wings
  **up adds 4** (`FLAPS2 CLRB` `JOUSTRV4.SRC:6170`; `FLIPS2 LDB #$04` `JOUSTRV4.SRC:6197`) —
  *holding the button halves gravity*: the glide mechanic.
- Flap impulse `ΔVY = ((PTIMUP×96)>>8) − 96` (`ADDFLP`, `JOUSTRV4.SRC:6429-6436`):
  −96 (=0.375 px/frame) at instant re-flap, decaying toward 0 the longer the
  wings were up. `PTIMUP` saturates at 255 (`JOUSTRV4.SRC:6476-6478`).
- Horizontal: 9-entry table `FLYX` ±{2.0, 1.0, 0.5, 0.25, 0} px/frame
  (`JOUSTRV4.SRC:7150-7158`, non-linear doubling); index changes **only on the flap
  edge**, ±2×joystick (`JOUSTRV4.SRC:6437-6439`); out-of-range updates are *rejected*,
  not clamped (`MAXVX 8`, `JOUSTRV4.SRC:40,6440-6448`).
- **No air drag; no terminal velocity** (`MAXVY`/`MINVY` declared `JOUSTRV4.SRC:41-42`,
  never referenced — a cited negative claim). Glides are ballistic.
- Ceiling `$20` reflects velocity elastically (`JOUSTRV4.SRC:6497-6506`); floor kills at
  `FLOOR+7 = $E6` ("DEATH VIA SWIMMING IN THE LAVA", `JOUSTRV4.SRC:6508-6521`).
- X wraps over [−10, 292] modulus 303 (`ELEFT/ERIGHT`, `JOUSTRV4.SRC:38-39`, `WRAPX`
  `JOUSTRV4.SRC:7291-7297`); eggs use a narrower 4..288 wrap (`JOUSTRV4.SRC:3141-3146`).

**Ground movement** is a separate `STATE`-macro state machine
(`JOUSTRV4.SRC:7160-7175`) — speed is *animation-driven* (run table 0/3/2/1/2 px,
`JOUSTRV4.SRC:7185-7189`), with a fictitious velocity byte only for bump maths (`JOUSTRV4.SRC:6000`).
Landing is a bitmask lookup (`LNDXTB[x] & LNDYTB[y]`, `JOUSTRV4.SRC:6703-6707`) then a
**snap** to hard-coded surface Ys (68/80/128/137/162/210, `JOUSTRV4.SRC:6729-6759`).
Bump registers are one-shot positional shoves (X drained ≤3 px/frame,
`JOUSTRV4.SRC:7270-7284`; Y consumed whole, `JOUSTRV4.SRC:6495-6496`).

**The joust** (`OSTBO`, `JOUSTRV4.SRC:5002-5012`): compare
`(PLANTZ + PPOSY)` on **whole pixels, the fraction EXCLUDED** (`OSTBO` reads
`PPOSY` at offset +0, the whole-pixel word, not the flight core's +1 fraction) — strictly lower wins,
exact tie = both bounce (`JOUSTRV4.SRC:5014-5017`). Skidding sets `PLANTZ` = 2 (lance 2 px
lower, `JOUSTRV4.SRC:6071-6072`). Enemies never kill each other (`JOUSTRV4.SRC:4953-4961`).
Bounce-apart: winner `PBUMPY` −2 / loser +2, wrong-way velocity inverted and
halved (`JOUSTRV4.SRC:5163-5176`); horizontal reverse-minus-2 with half passed to the
other as bump (`JOUSTRV4.SRC:5114-5157`).

**Eggs**: spawn with the victim's velocities (`JOUSTRV4.SRC:2991-2996`); bounce keeps ¼
of VY inverted, X index decays 2/bounce (`JOUSTRV4.SRC:3204-3218`); settle when
|VY| ≤ `$20` and X index = 0 (`JOUSTRV4.SRC:3219-3222`); ledge tables `EGLEDG`/`EGGLNT`
(69 slots, 8 px apart, `JOUSTRV4.SRC:2910-2935`). Values 250/500/750/1000 capped
(`EGGVAL`, `JOUSTRV4.SRC:3097-3104`); mid-air catch +500 (`PFEET`, `JOUSTRV4.SRC:3065-3069`). Hatch →
buzzard flies in from the farther edge at max speed to remount (`JOUSTRV4.SRC:3245-3278`).
Each enemy carries 4 eggs before permadeath (`PEGG`, `JOUSTRV4.SRC:2900-2901,3001`).

### Arena transcription hazards (jt1-4)

Three traps in the arena code produce implementations that are wrong but
plausible. Every one of them ships green under a naive reading.

**1. `LNDB2`'s author comment names the wrong cliff.** The label line
(`JOUSTRV4.SRC:6740`) reads `CLIF3R`, but its constant is `$0081-1` = 128,
which is one pixel above scanline 129 — **`CLIF3U`'s** band. `CLIF3R` sits at
138 and is served by `LNDB3` ("CLIF3L & CLIF3R", `JOUSTRV4.SRC:6746`).
**Follow the constant, not the comment.** Claim JT4-026.

**2. Landing and background collision use DIFFERENT bit assignments.** The
landing table (`LNDXTB`/`LNDYTB`) has **six** bits with the left/right cliff
pairs *merged*; `BCKXTB`/`BCKYTB` has **eight** with left and right *separate*.
Bit 4 means `CLIF4` in the landing table and `CLIF3L` in the background table
(`JOUSTRV4.SRC:6752` vs `JOUSTRV4.SRC:6823`). Sharing one mapping between the
two mechanisms collides against the wrong geometry. Keep two tables.
Claim JT4-042.

**3. `BCKB3` and `BCKB5` are byte-identical in the ROM.** Both dereference
`CLIF3R`'s collision pointer with **`CLIF3U`'s** origin (202,129)
(`JOUSTRV4.SRC:6873-6876` and `JOUSTRV4.SRC:6862-6865`), even though `CLIF3R`
actually sits at (254,138). Whether that is a shipped bug or deliberate reuse
is unsettled — but a transcription must **preserve** it, because "tidying" it
silently changes collision behaviour. It is also the one surface whose origin
deliberately does *not* match its own cliff record. Claim JT4-044.

A fourth, smaller one: **`CLIF5`'s landing band is not four scanlines.** The
five thin ledges each span 4, but `CLIF5` is the bottom *island* and its `$A0`
band runs Y 211..227 — **seventeen** scanlines. Its mask is also why `CKGND`
tests it with `BITA #$20` rather than equality (`JOUSTRV4.SRC:6720`): `LNDYTB`
never holds a bare `$20`. Claim JT4-021.

**Lava troll**: spawns off CLIF5's landing path after the bridge burns
(wave 3 + 1, `TBRIDGE`/`TTROLL`, `JOUSTRV4.SRC:954-957`); grip repoints the victim's
gravity vector (`PADGRA → ADDLAV`, `JOUSTRV4.SRC:1651-1652`); break-free needs sustained
VY < −$0180 (`JOUSTRV4.SRC:6616-6617`, escape scores 50, `JOUSTRV4.SRC:6666-6670`); the red-label
patches give it a 30-second grace then +1 pull/frame capped at `$500` —
arithmetically inescapable at cap (`PATCH1/2/3`, `JOUSTRV4.SRC:6374-6396`).

**Pterodactyl**: gravity-exempt (`FLYXP` table ±$0300, "NO GRAVITY!" `JOUSTRV4.SRC:1506`,
`JOUSTRV4.SRC:1585-1595`); kill window is a **lance-height match** (attack frame: offset
8 ± 3; else offset 10 ± 2) requiring opposite facings and the player facing
into it (`JOUSTRV4.SRC:4971-5000`) — failing any test falls into the normal joust, which
the ptero wins. The V4 patches (baiters only, `PCHASE`-gated) aim it lower,
slow its dive, reroute its lanes, make its first pass miss (`JOUSTRV4.SRC:6296-6360`).

**Transporter/spawn**: 4 pads tied to platform tiers (`TR1ID-TR4ID`,
`JOUSTRV4.SRC:5587-5590`); spawn requires an empty screen third (`SELARE`, `JOUSTRV4.SRC:6413-6424`);
players hold tickets ahead of enemies (`NPSERV`/`LPSERV`, `JOUSTRV4.SRC:5615-5674`);
safety is a timed materialisation, aborted by any control — not
invulnerability (`JOUSTRV4.SRC:5841-5892,5923-5925`). P1: X=100, facing right, ostrich;
P2: X=200, facing left, stork (`JOUSTRV4.SRC:1020-1039`).

## 3. Waves, AI, scoring (`JOUSTRV4.SRC`)

**Wave machine** (`CIA` process, `JOUSTRV4.SRC:1875`): 4-byte nibble-packed table —
bounders:hunters / lords:pursuers / pterodactyls / status (`JOUSTRV4.SRC:175-181`);
status low nibble dispatches six wave types (nop / intro / co-op / gladiator
/ egg / pterodactyl — `WJSRTB`, `JOUSTRV4.SRC:2586-2591`), high nibble destroys cliffs
(`JOUSTRV4.SRC:185-192`). **80 authored waves, looping at 81** (`WTBRST`/`WTBEND`,
`JOUSTRV4.SRC:2535-2546,2018-2021`); late waves are all Shadow Lords at max pursuit
(`$00,$AF`). Wave number is independent BCD 0-99 (`JOUSTRV4.SRC:2001-2004`). Wave types
degrade by live player count (co-op → survival, `JOUSTRV4.SRC:2628-2631`; gladiator
no-ops solo, `JOUSTRV4.SRC:2697-2700`).

**Enemy AI**: three ground enemies share one dumb brain — `LINET`
lane-tracking toward the three cliff-tier altitudes `$45/$81/$D0` ± `$20`
(`JOUSTRV4.SRC:3722-3749,7994-7997`) — and are *promoted* to their smart brains
(`BOUNDR`/`B2UNDR`/`SHADOW`, `JOUSTRV4.SRC:3787,3971,4230`) under a **global intelligence
budget**: `NSMART` vs `WSMART`, seeded per wave from the pursuit nibble and
growing every 15 s while enemies live (`JOUSTRV4.SRC:2075-2129`). **Baiters** are
anti-stall pterodactyls (max 3, `PCHASE`=−1, `JOUSTRV4.SRC:2108-2113`) on the `BAITBL`
schedule — written literally as `SECONDS*60/8`; the V4 rewrite collapses the
mid-game cadence from 15 s to 1 s ("4 MIN 16 SEC → 2 MIN 16 SEC",
`JOUSTRV4.SRC:2150-2163`, RV3 original preserved in `********` comments `JOUSTRV4.SRC:2135-2148`).

**Scoring** (BCD; `SCRHUN` thousands/hundreds, `SCRTEN` tens/hundreds
*backwards* — `JOUSTRV4.SRC:7340-7366`): Bounder 500 / Hunter 750 / Shadow Lord 1500 /
Ptero 1000 (decision-block `DVALUE` bytes, `JOUSTRV4.SRC:5563-5577`; ptero value derived,
open question); eggs 250-1000 + 500 air-catch; co-op bonus 3000 each unless a
partner-kill voids it; survival 3000 for a deathless wave; gladiator bounty
3000 to the first partner-killer (`JOUSTRV4.SRC:2642-2728,4691-4698`) — **the same two
flag bytes (`PLYG1/2`) invert polarity between co-op and gladiator**
(`JOUSTRV4.SRC:2634-2635` vs `JOUSTRV4.SRC:2703-2705`), the "GAME START GOOF" `PATC11` cleans up
(`JOUSTRV4.SRC:6282-6284`). The dying player is credited 50 points (`JOUSTRV4.SRC:4730-4732`).
Extra men: CMOS `REPLAY` threshold ×16, re-armed after each award
(`JOUSTRV4.SRC:915-928,7382-7411`).

**Difficulty**: 28 `DYWORD` rows (`DYTBL`, `JOUSTRV4.SRC:7303-7332`) each walk
start→end by a per-difficulty step schedule once per wave, then **plateau**
(`IWAVE`, `JOUSTRV4.SRC:1890-1926`); operator `GA1` picks the starting column (tiers
0-3 / 4-6 / 7+, `JOUSTRV4.SRC:930-939`). Separately: bridge burns after wave 3, troll one
wave later (`JOUSTRV4.SRC:954-957`), lava creeps `$EA→$E0` (`JOUSTRV4.SRC:1929-1933`), waves 1-2 run
enemies at half rate (`EMYTIM`=2, `JOUSTRV4.SRC:2202-2205`).

**The red-label patch block** (`ORG $D760`, `JOUSTRV4.SRC:6270-6403`): eleven patches,
each preserving its displaced instruction as a `********` comment; six exist
to stop pterodactyl farming (header `JOUSTRV4.SRC:6268`). Full inventory with pre/post
behaviour: physics + waves study archives; RV3 carried only patches 1-3,
inline (`JOUSTRV3.SRC:7170-7197`).

## 4. Images (`JOUSTI.SRC` + entity sources)

See [`pictures.md`](pictures.md) — record formats, pixel/VRAM geometry,
collision spans, palette, playfield layout, frame inventory (91 blocks).

## 5. Text engine (`MESSAGE.SRC`, `PHRASE.SRC`, `MESSEQU*.SRC`)

Separate ROM block, 11-entry jump table at `$4A50` (`EQU.SRC:12`,
`MESSAGE.SRC:28-39`), authored by Cary Kolker (`MESSAGE.SRC:13`). Two fonts:
"5×7" = 3 bytes × 7 rows, "3×5" = 2 bytes × 5 rows (`MESSAGE.SRC:347,839`;
53 + 49 glyphs at `MESSAGE.SRC:241-344`, data to `MESSAGE.SRC:1055`). Glyphs are 1-bit stencils
blitted SOLID with the colour in the constant register (`MESSAGE.SRC:91-92`) — one font,
any colour; **erase = draw in colour 0** (`MESSAGE.SRC:213-222`), correct only over
black. Text is **not ASCII**: custom charset (digits `$00-$09`, space `$0A`,
`A-Z $0B-$24`; `MESSEQU2.SRC:1-61`) with the terminator OR'd into the last
byte (`END EQU $80`); the two fonts diverge above `$2E` (`$2F` = "000"
ligature small / slash large). Phrase index is *signed* — `$F5-$FF` sit
physically before the `PHRASE` label (`PHRASE.SRC:1-12`). A TEXT block is a
screen-full of {address, colour, phrase#} records (`PHRASE.SRC:376-384`;
walker `MESSAGE.SRC:218-226`). All fidelity text quotes come from
`PHRASE.SRC` data, never from equate comments (they drift — open questions).

## 6. Attract mode (`ATT.SRC` + game module)

Two presentations: the `MARQUE` logo page — Ken Lantz's line-drawing engine
(`ATT.SRC:3,49-50`, workspace `$BC00`, undecoded, open question) — and the
14-entry instructional sequence (`ATMST`, `JOUSTRV4.SRC:337-365`: 5-byte records
{demo routine, message, dwell, erase}), which runs live demo gameplay behind
captions (WELCOME → TO FLY → SURVIVE A JOUST → EGGS → ENEMIES →
BOUNDER/HUNTER/SHADOW LORD → TEMPORARY SAFETY → PTERODACTYL). Bit 7 of a
message byte selects the small font (`JOUSTRV4.SRC:284-290` — the hand-computed-branch
block bannered `!!!!BECAREFULL!!!!`). `GOVER` is tri-state: 0 = over,
negative = running, positive `$7F` = attract simulation (`JOUSTRV4.SRC:232-233,712,1015`).

## 7. Operator / CMOS (`TB12REV3.SRC`, `T12REV3.SRC`, `EQU.SRC`)

`TB12` = shared utility block at `$3B10` reached via 28 3-byte vectors
(`EQU.SRC:11,210-237`): CMOS nibble r/w, BCD↔hex, credits, coin pricing,
audits, the HSTD page. CMOS: protected adjustments at `$CC00`, writable
bookkeeping at `$CD00` (`EQU.SRC:30,90,109`), all 4-bit. 18 adjustments with
factory defaults (`EQU.SRC:110-127`; `TB12REV3.SRC:134-151`) — a free-play
clone keeps only `GA1` (difficulty), `REPLAY` (extra man @20,000), `NSHIP`
(lives, default 5), and the HSTD gate; **`COINSL $09` = free play**
(`TB12REV3.SRC:835-837`). Ten audit counters (`EQU.SRC:92-101`). High scores: all-time
"JOUST CHAMPIONS" + daily "DAILY BUZZARDS", 14-nibble entries, 5/player/table
("MAXIMUM 5 ENTRYS", `PHRASE.SRC:306`), 3 initials, default table = the dev
team (WIL/MRS/JRN/PFZ/CWK, `TB12REV3.SRC:389-393` — whose top score's BCD
digits double as the build date, brief §0). `T12` = the `$F000` diagnostics
ROM: reset vectors (`T12REV3.SRC:1997-1999` → `JMP [$EFF8]` trampoline),
per-PROM checksum ledger (`ROMTAB`), operator books.
