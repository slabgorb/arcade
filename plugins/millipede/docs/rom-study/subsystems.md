# Subsystem map — Millipede (1982, version 1)

Every row below was generated from `grep -n "\.SBTTL"` over the vendored 1982
modules (`reference/original-source/millipede/`) — the line numbers are tool
output, not transcription. Each subsystem is cited to its owning file and the
`.SBTTL` section header that opens it (a plain label line for `INICON`, which
carries no `.SBTTL`). Read `brief.md` first for the shipped set and timebase;
creature names are decoded in `glossary.md`.

## Game logic — `MILLI.MAC`

| Subsystem | Owning file + line | Role |
|---|---|---|
| `BEEMV`  | `MILLI.MAC:56`   | move bee down screen |
| `BEETL`  | `MILLI.MAC:243`  | move and start beetle |
| `CENTPC` | `MILLI.MAC:498`  | initialize centipede picture |
| `EARWIG` | `MILLI.MAC:672`  | move and start earwig |
| `EXPLOD` | `MILLI.MAC:763`  | explode centipede segments and player |
| `FLYMV`  | `MILLI.MAC:1004` | enter and move dragonfly |
| `MOSQT`  | `MILLI.MAC:1324` | enter and move the mosquito |
| `MOTION` | `MILLI.MAC:1444` | motion update (centipede stepping) |
| `MOVE`   | `MILLI.MAC:1640` | move player |
| `SHOOT`  | `MILLI.MAC:1820` | check fire switch and fire shot |
| `SPDMV`  | `MILLI.MAC:2295` | move spider |
| `WRMMV`  | `MILLI.MAC:2559` | enter and move inch worm |

## IRQ, sound, colour-RAM, input — `MLIRQ.MAC`

| Subsystem | Owning file + line | Role |
|---|---|---|
| `SOUNDS` | `MLIRQ.MAC:8`   | sound routine |
| `CLRCH`  | `MLIRQ.MAC:242` | colour-RAM initialization (colour is RAM-driven, not PROM) |
| `IRQ`    | `MLIRQ.MAC:701` | IRQ processing — the once-per-frame dispatch |
| `JOYS`   | `MLIRQ.MAC:897` | read and respond to joysticks (input) |

## Attract-mode state machine — `MLATR.MAC`

| Subsystem | Owning file + line | Role |
|---|---|---|
| MODE FE | `MLATR.MAC:126` | attract MODE FE — initialization; execution follows at `MLATR.MAC:165` |
| MODE FF | `MLATR.MAC:313` | attract MODE FF |

## Mushroom-field cellular automaton — `CONWAY.MAC`

| Subsystem | Owning file + line | Role |
|---|---|---|
| `MASTER` | `CONWAY.MAC:24` | master control program — drives the Conway mushroom-growth automaton |
| `INICON` | `CONWAY.MAC:11` | initialize Conway (a plain label, not a `.SBTTL` section) |
