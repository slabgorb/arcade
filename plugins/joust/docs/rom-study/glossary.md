# Joust — Glossary

The author's names → plain English. Merged from the five study passes;
citations in [`subsystems.md`](subsystems.md) / [`pictures.md`](pictures.md).

## The OS layer

| Term | Meaning |
|---|---|
| **process** | Cooperative coroutine: resumes at a stored PC, never preempted; all state in its 51-byte block (stack does not survive a nap) |
| **nap / `PCNAP` / `NAPGO`** | Yield for N game frames (1 frame = 1/60.096 s) |
| **primary / secondary** | Two scheduling classes; all primaries run before any secondary each frame (`PROCCR` vs `SECCR` creation macros) |
| **`PID` + mask** | Process class tag; kills are masked, so one call kills a class |
| **`SUCIDE`** | A process terminating itself |
| **DMA / "Special Chips"** | The Williams blitter at `$CA00` |
| **quadrant A-D** | One vertical quarter of the screen (top 2 bits of the video counter) |
| **beam interference** | Blitting into the quadrant the CRT beam is scanning; the IRQ refuses to |
| **flavor** | Shift a blit one pixel (one nibble) right — odd-X placement |
| **suppress zeroes** | Transparent blit (0-nibble = don't write) |
| **constant / K** | Solid-colour fill from the mask register |
| **classify (`CLSX`/`CLSY`)** | Compute a sprite's screen byte address + quadrant bucket |
| **pet the watchdog** | Write `$39` to `$CBFF` |
| **`RRUC`/`DRRUC`** | ROM/RAM bank + upright/cocktail port, and its RAM shadow (the port is write-only) |
| **books** | Operator audit counters in CMOS |

## The game

| Term | Meaning |
|---|---|
| **horse** | The mount (ostrich/stork/buzzard) — carries the collision mask; the **rider** is a maskless overlay |
| **flap / jump button** | The single action button ("JUMP BUTTON" in code, flap in design) |
| **wings down / up** | A *gravity* state (down = 4/frame, up = 8/frame), deliberately decoupled from the animation frame |
| **`PTIMUP`** | Frames since the wings went up — the flap-strength governor |
| **LANTZ (`PLANTZ`)** | Lance-height offset (after programmer Ken Lantz); 0 normally, 2 while skidding — the joust is decided on `PLANTZ + PPOSY` |
| **`FLYX` / `FLYXP`** | Bird / pterodactyl X-velocity tables (9 entries, non-linear) |
| **bump registers** | One-shot positional shoves (`PBUMPX/Y`) — not velocity |
| **decision block** | Per-entity-type vtable (`DJOY`, `DSMART`, `DDEAD`, `DVALUE`, …): `P1DEC`-`P7DEC`, `G1DEC` |
| **CIA** | The wave-machine process (ID `$11`) |
| **Bounder / Hunter / Shadow Lord** | The three enemy knights (500 / 750 / 1500 points) |
| **persue / `WSMART` / `NSMART`** | The *intelligence budget*: how many enemies may run their smart brain at once — a global allowance, not a per-enemy trait |
| **`PCHASE`** | "Currently promoted": smart flag on knights, baiter mark (−1) on pterodactyls |
| **baiter** | Anti-stalling pterodactyl on the `BAITBL` schedule (max 3); distinct from wave-scripted pterodactyls |
| **tracking line / lane** | The three cliff-tier altitudes `$45/$81/$D0` ± `$20` that dumb enemies fly toward |
| **`PWPREV`** | One-shot end-of-wave cleanup callback (how a wave type scores its bonus) |
| **`PLYG1`/`PLYG2`** | Partner-kill flags whose *polarity inverts*: co-op (0 = good, kill = forfeit) vs gladiator (−1 = bounty available) |
| **`GOVER`** | Tri-state game state: 0 over / negative running / positive attract-simulation |
| **ledge slot** | Egg spawn index 0-65 into `EGLEDG`/`EGGLNT`, 8 px apart |
| **ticket queue** | Transporter fairness: players (`NPSERV`) served before enemies (`NESERV`) |
| **`DYTBL` / `DYWORD` / `DYNADJ`** | The 28-row difficulty ramp (`DYTBL`, `JOUSTRV4.SRC:7304-7331`). Each `DYWORD` is a 14-byte struct — three GA1-tier start columns, a signed-word end, a 5-byte/10-nibble per-difficulty cadence table, and a signed-byte increment (macro `JOUSTRV4.SRC:210-213`, field EQUs `JOUSTRV4.SRC:202-208`) — walked into a RAM working copy (`DYNADJ`) once per wave, plateauing at the end value |
| **burster** | A lava bubble popping at the surface |
| **poof** | The death animation (`FL1-FL3`) |

## Images & text

| Term | Meaning |
|---|---|
| **`COFF`** | `$0200` bias on collision-span values so sentinels (`$8000` empty row, `$8100` end) test negative |
| **`DMAFIX`** | `$0404` — the SC1 blitter's width/height XOR, applied at assembly via `!X` (or at runtime via `EORA/B #$04`) |
| **`POSOFF` / position word** | Frame-record macro; signed (X byte, −Y) offset from the classified screen address |
| **span** | Per-scanline (left,right) extent pair — the live collision mask |
| **`COMCL5`** | The RLE-compacted CLIFF5 bitstream (871 bytes), expanded by `NEWCL5` |
| **phrase** | One `END`-terminated string of custom-charset bytes (NOT ASCII) |
| **TEXT block** | A screen-full of {position, colour, phrase#} records |
| **`END` (`$80`)** | Terminator bit OR'd into a string's final byte |
| **`CTHOU`** | A single "000" ligature glyph — 3×5 font only |
| **GOD / PEON** | The operator-set champion vs an ordinary player at initials entry |
| **DAILY BUZZARDS / JOUST CHAMPIONS** | The daily and all-time high-score tables |
| **marquee (`MARQUE`)** | The line-drawn logo attract page (`ATT.SRC`) |
| **lesson (`FLYLES`, …)** | One instructional attract page with live demo behind the caption |
| **GAME ADJUST / `GA1`** | Master difficulty 0-9, bucketed into three tiers (0-3 / 4-6 / 7+, `JOUSTRV4.SRC:930-939`) |
| **units / bonus units** | Coin-pricing intermediates (coins → units → credits) |
| **JZAP / LZAP / KZAP** | The anti-tamper checksum traps (sabotage: corrupt one byte and return) — deliberately omitted from the clone |
