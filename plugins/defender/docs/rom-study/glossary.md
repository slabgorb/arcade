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
