# Centipede

A faithful, browser-based clone of Atari's 1981 arcade game *Centipede* — Ed
Logg and Dona Bailey's mushroom-field shooter. The first **raster** game in an
arcade of vector siblings, rendered with HTML5 Canvas 2D. No game engine, no
backend — a **deterministic pure simulation core** wrapped by a thin
input/render shell, the same architecture as its siblings
[tempest](https://github.com/slabgorb/tempest),
[asteroids](https://github.com/slabgorb/asteroids),
[battlezone](https://github.com/slabgorb/battlezone),
[star-wars](https://github.com/slabgorb/star-wars), and
[red-baron](https://github.com/slabgorb/red-baron).

> **Status:** Pre-implementation. The primary-source study of the original 1981
> Atari assembler source lives in [`docs/rom-study/`](docs/rom-study/) — it is
> the ground truth every implementation story cites. The project scaffold
> (Vite + TypeScript + Vitest, dev port 5278) lands with the first story.

## Reference sources

- **Primary:** the preserved original assembler source
  ([historicalsource/centipede](https://github.com/historicalsource/centipede)),
  vendored at the orchestrator as a greppable LF copy
  (`arcade/reference/atari-source/centipede/`, pinned `dbbe6de`). Four ROM
  revisions in one tree; the study targets **revision 4** (final, Sept 1981).
- **Secondary:** the MAME driver (`src/mame/atari/centiped*.cpp`) for
  board-level facts the source never states — clocks, exact refresh, screen
  geometry, IRQ generation.

Neither source is ever copied into this repo (copyright / GPL) — both are cited
externally by file:line. A checkout-local `reference/` directory is gitignored
for scratch quarrying.

## Architecture (when code lands)

- `src/core/` — pure deterministic simulation. No DOM, no Canvas, no time,
  no `Math.random`.
- `src/shell/` — render / audio / input / storage.

That boundary is the single most important rule in this repo, as in every
sibling.
