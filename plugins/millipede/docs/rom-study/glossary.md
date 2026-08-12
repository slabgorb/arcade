# Glossary — Millipede author names → plain English

Millipede's 1982 source (`reference/original-source/millipede/`) names its
creatures and objects with terse assembler symbols. This table translates each to
the plain-English name a player would use. Line numbers are `grep -n` tool output
over the vendored tree, not transcription; read `brief.md` first for the shipped
set, radix and timebase ground truth, and `subsystems.md` for where each mover
lives.

## Creatures

| Author symbol | Plain English | Where |
|---|---|---|
| `BEETL` | beetle | `MILLI.MAC:243` |
| `SPDMV` | spider | `MILLI.MAC:2295` |
| `EARWIG` | earwig | `MILLI.MAC:672` |
| `WRMMV` | inch worm (inchworm) | `MILLI.MAC:2559` |
| `MOSQT` | mosquito | `MILLI.MAC:1324` |
| `FLYMV` | dragonfly | `MILLI.MAC:1004` |
| `BEEMV` | bee | `MILLI.MAC:56` |

The centipede itself is the segmented column the mushroom field steers — its
picture is set up by `CENTPC` and stepped by `MOTION` (see `subsystems.md`).

## Objects

| Author symbol | Plain English | What it is | Where |
|---|---|---|---|
| `DDT` | DDT bomb | a plunger the player detonates; it releases a poison **cloud**, and any bug caught in the **explosion** dies. The bomb count is `NDDT` | `MLDEF.MAC:191` |
| `POISON` | poison mushroom | a mushroom the Conway automaton has poisoned; it forces the centipede to dive | `CONWAY.MAC:216` |

> The author's `BEEMV`/`FLYMV`/`MOSQT` are the three fliers the `BOMBS` routine
> uses to bomb the player; the DDT bomb (`DDT`) is the player's counter-weapon, and
> the poison mushroom (`POISON`) is the hazard the mushroom-field automaton grows.
