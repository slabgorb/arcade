# Glossary — Defender author vocabulary → plain English

Eugene Jarvis's 1981 source names its tools, macros and machinery with terse
in-house words. This table translates each to plain English. Line numbers are
`grep -n`/`awk` tool output over the vendored tree, never transcription; read
`brief.md` first for the shipped set, dialect and timebase ground truth, and
`subsystems.md` for where each subsystem lives.

## Tools and machinery

| Author word | Plain English | Where |
|---|---|---|
| `PHRED` | an assembler — `SAMEXAP7.SRC`'s header says "ASSEMBLE WITH PHRED", naming the tool that builds that module (the build notes name RASM for the main chains; whether PHRED is a distinct assembler or an in-house name for the same one is not stated in the tree) | `defender/SAMEXAP7.SRC:9` |
| `MAPC` | the map-control register at $D000 — writing a block number here selects which banked ROM block appears in the $C000 window | `defender/PHR6.SRC:11` |
| `CKBYT` | the per-chip checksum byte ("CHECKSUM(ACTUAL)") each ROM carries as its first byte — the mechanism whose presence rules the WHITE release out of this tree | `defender/DEFA7.SRC:5` |

## Macros

| Author word | Plain English | Where |
|---|---|---|
| `MLJSR` | the cross-bank long-JSR macro — a JSR through the `LJSRV` vector with the target address and block number inlined, so code in one banked block can call into another. The comment above it explains the name: the assembler ("BSO BONER") would not allow both a macro and a symbol named LJSR, so it became MLJSR | `defender/AMODE1.SRC:38-43` |
| `NAPP` | the nap-and-jump macro — puts the current process to sleep for N 16-msec ticks and names the address it wakes at (a sleep of 60 is one second) | `defender/AMODE1.SRC:33-37` |

## The per-author message-vector blocks

| Author block | Plain English | Where |
|---|---|---|
| `* EUGENE'S VECTORS` | a message-vector table grouped by author — the play-side vectors (PLYR1/PLYR2, BONUS X, ATTACK WAVE, COMPLETED) | `defender/MESS0.SRC:165` |
| `* SAM'S VECTORS` | a message-vector table grouped by author — the hall-of-fame entry vectors (HOF, INIT$, HALLD, HALEN) | `defender/MESS0.SRC:175` |

The message module groups its vector tables by the programmer whose code consumes
them. The names are the authors' own — the vector tables are organized by who
wrote the consuming code, not by function.

## Enemies — Williams process label → arcade-marketing name (df4)

The Williams source names its enemies in an internal vocabulary that does **not**
map 1:1 to the arcade-marketing names players know (Lander/Mutant/Baiter/Bomber/
Pod/Swarmer). Each `df4` enemy story maps its process label to the arcade name here,
CITED, before naming a reducer — a wrong identity stated in prose would otherwise
ship green. The abduction loop (df4-3):

| Author word | Plain English | Where |
|---|---|---|
| `LANDS0` / `*START LANDERS` | the **Lander** — Defender's base ground enemy: spawned at the top of the screen, it descends and hunts a humanoid to carry off (the arcade name; the Williams source uses only the internal process label) | `defender/DEFB6.SRC:649`, `defender/DEFB6.SRC:657` |
| `ASTRO` / `*ASTRONAUT PROCESS` | the **Humanoid** — the abductee that walks the planet surface; a Lander grabs it and carries it toward the top (arcade "Humanoid"; Williams calls it the astronaut) | `defender/DEFB6.SRC:290` |
| `*KILL KIDNAPPING LANDER` → `AFALL` | when a Lander carrying a Humanoid is shot, the Humanoid is released and falls — the AFALL free-fall (df4-3 starts the fall; catching it, or its hitting the planet, is df5) | `defender/DEFB6.SRC:903`, `defender/DEFB6.SRC:911` |
| `SCZS0` / `*START SCHITZOS` | the **Mutant** — the enemy a Lander becomes on reaching the top of the screen (the SCZ / "schizoid" process): it seeks the player, hops erratically in Y, and shoots (the arcade name; the Williams source calls it the schizoid) | `defender/DEFB6.SRC:585`, `defender/DEFB6.SRC:592` |
| `UFOST` / `*UFO PROCESS` | the **Baiter** — the timeout pursuer (Williams' internal "UFO"): once a wave drags on it materializes and hunts the player. The UFO→Baiter identity is SOURCED, not assumed — `DEFA7.SRC:1690` `JSR UFOST` spawns it on a countdown (the "baiter" that appears when you dawdle) and `MESS0.SRC:337` `BAITER FCC "BAITER/"` is the arcade-marketing string | `defender/DEFB6.SRC:5`, `defender/DEFB6.SRC:25`, `defender/DEFA7.SRC:1690`, `defender/MESS0.SRC:337` |
| `TIE` / `*TIE PROCESS` | the **Bomber** — the formation flyer (Williams' internal "TIE"): it cruises in and LAYS BOMBS (mines) as it flies. The TIE→Bomber identity is SOURCED, not assumed — the TIE process drops a bomb on a 1/8 gate (`DEFB6.SRC:1115` `BSR BOMBST`, BOMBST being the bomb it lays, not an enemy) and `MESS0.SRC:341` `BOMBER FCC "BOMBER/"` is the arcade-marketing string. This corrects the story's AC1 guess (START BOMB→Bomber): the TIE is the Bomber, the bomb is its ammo | `defender/DEFB6.SRC:1023`, `defender/DEFB6.SRC:1115`, `defender/MESS0.SRC:341` |
| `PRBST` / `*PROBE START` | the **Pod** — the drifting blob (Williams' internal "PROBE"): shoot it and it BURSTS INTO SWARMERS. The PROBE→Pod identity is SOURCED, not assumed — PRBKIL releases up to six mini-swarmers on death (`DEFB6.SRC:122` `JSR MMSW`, count `DEFB6.SRC:119` `LDA #6`) and `MESS0.SRC:399` `POD FCC " POD/"` is the arcade-marketing string (the 1000-pt Pod). This corrects the story's AC1 guess (PROBE→Probe, not even an arcade name) | `defender/DEFB6.SRC:85`, `defender/DEFB6.SRC:122`, `defender/DEFB6.SRC:119`, `defender/MESS0.SRC:399` |
| `MSWM` / `*MAKE A MINI SWARMER` | the **Swarmer** — the fast pursuer (Williams' internal "MSWM" mini-swarmer) a Pod bursts into when shot: it seeks the player in X and fires swarm bombs at it. The MSWM→Swarmer identity is SOURCED, not assumed — `MESS0.SRC:418` `SWARMR FCC "SWARMER/"` is the arcade-marketing string. This corrects the story's AC1 guess (MSWM→Pod): the Pod is the Probe process, the swarmer is what it releases | `defender/DEFB6.SRC:141`, `defender/MESS0.SRC:418` |

## Scoring — score EVENT → ROM point value (df5-3)

Every score is awarded through one SCORE routine: `D = A:B`, where A is an exponent
(0-7) and B a BCD mantissa (0-99), and the award is `B × 10^A` (`defender/DEFA7.SRC:475`).
Each kill or rescue pop-up loads its own `D` before `JSR SCORE`; the `KILP`/`KILO` macro
inlines it as `FDB $<A><B>`. The point VALUE is pinned here, CITED, before
`src/core/score.ts` names it — a wrong point value stated in prose would otherwise ship
green (the `df4` identity law, applied to values). Score pop-ups run as scheduler
`STYPE`(=0) system processes (`defender/PHR6.SRC:500`), not per-pop-up ticks.

| Score event | Point value | Where |
|---|---|---|
| `LKILL` — Lander kill (`KILP 0115`) | **150** (15×10¹) | `defender/DEFB6.SRC:922` |
| `SCZKIL` — Mutant kill (`KILP 0115`) | **150** (15×10¹) | `defender/DEFB6.SRC:625` |
| `UFOKIL` — Baiter kill (`KILP 0120`) | **200** (20×10¹) | `defender/DEFB6.SRC:82` |
| `TIEKIL` — Bomber kill (`KILO 0125`) | **250** (25×10¹) | `defender/DEFB6.SRC:1120` |
| Pod kill (`PRBKIL`, `KILO 0210`) | **1000** (10×10²) | `defender/DEFB6.SRC:118` |
| Swarmer kill (`LDD #$0115`, `SWHSND`) | **150** (15×10¹) | `defender/DEFB6.SRC:190` |
| `BKIL` — bomb/mine shot (`LDD #$25`) | **25** (25×10⁰) | `defender/DEFA7.SRC:2700` |
| `P250` — an UNCAUGHT humanoid falls and lands safely on its own (`LDX #P250` at `ALAND`, survivable fall; `LDD #$0125`) | **250** (25×10¹) | `defender/DEFB6.SRC:500`, `defender/DEFB6.SRC:959` |
| `P500` — the player CATCHES a falling humanoid (`NEWP P500,STYPE`) and/or returns it to the ground (`LDX #P500` at `ALAND0`; `LDD #$0150`) | **500** (50×10¹) | `defender/DEFB6.SRC:507`, `defender/DEFB6.SRC:408`, `defender/DEFB6.SRC:962` |
| `*BONUS COLLECT` — wave-complete bonus per surviving human (`LDB PWAV,Y` multiplier, `CMPB #5` cap) | **min(wave,5) × 100** | `defender/DEFA7.SRC:1828`, `defender/DEFA7.SRC:1829` |
| `REPLAY @10,000` — the extra-man threshold | one extra man every **10,000** points | `defender/ROMC8.SRC:801` |
| `NSHIP` — starting men (lives) | the game starts with **3** men | `defender/ROMC8.SRC:802` |

## End of game — game over, the hall of fame + the CMOS ledger (df5-6)

The game ends when the current player's ship counter is exhausted: `PLE01` tests the active
ships (`LDB PLAS,X`) and a 1-player game with none left falls through `BNE PLE02` to
`PLE2 … GAME OVER`. `df5-3`'s men counter models that ship count, so the port's end-of-game
condition is `men < 0`. The final score enters the hall of fame through the shared modules
(`HALLOF`), and the cabinet's coin/credit audit — the `* CMOS RAM ALLOCATION` block — maps onto
one-origin `localStorage` (the ADR-0004 cross-origin-cookie retirement).

| Symbol | What it is | Where |
|---|---|---|
| `PLE2` — out-of-ships → GAME OVER: a 1-player game with no ships left (`BNE PLE02` fails) reaches `PLE2`; the port models it as the men counter falling below zero (`men < 0`) | the end-of-game condition | `defender/DEFA7.SRC:1423` |
| `HALLOF` — HALL OF FAME ENTRY: the final score → the `@shared` hall of fame (initials + score, consumed not re-implemented) | hall-of-fame entry vector | `defender/AMODE1.SRC:119` |
| `SLOT1` — left coin total (`* CMOS RAM ALLOCATION`) | coin audit → `localStorage` | `defender/ROMF8.SRC:20` |
| `SLOT2` — center coin total (`* CMOS RAM ALLOCATION`) | coin audit → `localStorage` | `defender/ROMF8.SRC:21` |
| `SLOT3` — right coin total (`* CMOS RAM ALLOCATION`) | coin audit → `localStorage` | `defender/ROMF8.SRC:22` |
| `TOTPDC` — total paid credits (`* CMOS RAM ALLOCATION`) | credit audit → `localStorage` | `defender/ROMF8.SRC:23` |
