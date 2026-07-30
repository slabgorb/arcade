# Joust

A faithful, browser-based clone of Williams' 1982 arcade game *Joust* — John
Newcomer's flapping, bouncing, lava-and-platform knight-vs-buzzard duel. The
first **Williams** game in an arcade of Atari siblings, and the second raster
title, rendered with HTML5 Canvas 2D. No game engine, no backend — a
**deterministic pure simulation core** wrapped by a thin input/render shell,
the same architecture as its siblings
[tempest](https://github.com/slabgorb/tempest),
[asteroids](https://github.com/slabgorb/asteroids),
[battlezone](https://github.com/slabgorb/battlezone),
[star-wars](https://github.com/slabgorb/star-wars),
[red-baron](https://github.com/slabgorb/red-baron), and
[centipede](https://github.com/slabgorb/centipede).

> **Status:** Pre-implementation. The primary-source study of the original 1982
> Williams assembler source lives in [`docs/rom-study/`](docs/rom-study/) — it
> is the ground truth every implementation story cites. The project scaffold
> (Vite + TypeScript + Vitest, dev port 5279) lands with the first story.

## Reference sources

- **Primary:** the preserved original 6809 assembler source
  ([historicalsource/joust](https://github.com/historicalsource/joust)),
  vendored at the orchestrator as a greppable copy
  (`arcade/reference/williams-source/joust/`, pinned `9bcfdb1`). Per-entity
  source files (`OSTRICH`, `BUZZARD`, `EGG`, `LAVA`, `PTE`, …), four revisions
  of the main game file (`JOUSTRV1–RV4.SRC`), image data as Motorola S-Records
  (`*.PIC`), and the author's own assembly map (`JOUST.DOC`).
- **Secondary:** the MAME driver (`src/mame/midway/williams*.cpp`) for
  board-level facts the source never states — clocks, blitter behavior, screen
  geometry, IRQ generation, the sound board.

Neither source is ever copied into this repo (copyright / GPL) — both are cited
externally by file:line. A checkout-local `reference/` directory is gitignored
for scratch quarrying.

## Architecture (when code lands)

- `src/core/` — pure deterministic simulation. No DOM, no Canvas, no time,
  no `Math.random`.
- `src/shell/` — render / audio / input / storage.

That boundary is the single most important rule in this repo, as in every
sibling.
