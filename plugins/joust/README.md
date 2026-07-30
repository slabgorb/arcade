# Joust

A faithful, browser-based clone of Williams' 1982 arcade game *Joust* — John
Newcomer's flapping, bouncing, lava-and-platform knight-vs-buzzard duel. The
first **Williams** game in an arcade of Atari siblings, and the second raster
title, rendered with HTML5 Canvas 2D. No game engine, no backend — a
**deterministic pure simulation core** wrapped by a thin input/render shell,
the same architecture as its siblings
[tempest](../tempest), [asteroids](../asteroids), [battlezone](../battlezone),
[star-wars](../star-wars), [red-baron](../red-baron) and
[centipede](../centipede).

> **Status:** Live at **v0.0.8** and **silent**. Thirty-six stories are archived
> across five epics: the scaffold and the machine-verified primary-source
> dossier (jt1, 11); the simulation — process scheduler, enemies, the joust,
> eggs, the wave machine, transporters and the wave-1 demo (jt2, 9); the
> menagerie — difficulty ramp, bridge/cliff destruction, lava troll,
> pterodactyl, baiters, death dissolve (jt3, 7); the game structure — BCD
> scoring, extra men, wave types and bounties, game-over and the loop (jt4, 5);
> and the in-progress playability epic (jt8, 4 so far) that makes enemies hunt
> and eggs catchable.
> **Audio is the known gap:** there is no `src/shell/audio.ts`, no
> `src/core/events.ts` channel and no dispatch. Unlike centipede, joust carries
> **no in-source note deferring it** — `sprint/epic-jt5.yaml` is the only record
> that the gap is known, which is precisely why it is said here too.

---

## Quick start

**joust is a plugin inside the arcade monorepo — it is not a standalone repo and
has no build, dev-server or test commands of its own.** Its `package.json` is a
three-field stub (name/version/private); the repository root owns every tool.
Run everything from the **monorepo root**:

```bash
npm install                         # once, for the whole cabinet
npx vitest run --project joust      # joust's suite: 75 files / 1846 tests
npx vitest run                      # the whole cabinet
npm run lint                        # tsc --noEmit across the monorepo
npm run test:orchestrator           # the root node:test suite
node plugins/joust/tools/audit/check-citations.mjs   # → "checked 883 claim(s)"
```

> **There is no way to open joust in a browser from this repo right now.** The
> root `npx vite` serves the **lobby** at every path — probed on a spare port
> (5296), `/`, `/joust/` and a nonsense control `/banana/` all return 200 with
> the same `<title>Slabcade</title>` page. That is a blanket SPA fallback, not
> routing. Do not screenshot `/joust/` and report it as joust. The per-plugin
> dev server, the port pin (joust owned 5279) and `npm run build` were all
> removed by the monorepo migration; the root build and the plugin router are
> still being wired up. The **shipped** game is unaffected and still live at
> [joust.slabgorb.com](https://joust.slabgorb.com/).

---

## Reference sources

- **Primary:** the preserved original 6809 assembler source
  ([historicalsource/joust](https://github.com/historicalsource/joust)),
  vendored as a greppable copy at the **monorepo root** —
  `reference/williams-source/joust/`, pinned `9bcfdb1`, reached from here as
  `../../reference/williams-source/joust`. Per-entity source files (`OSTRICH`,
  `BUZZARD`, `EGG`, `LAVA`, `PTE`, …), four revisions of the main game file
  (`JOUSTRV1–RV4.SRC`), image data as Motorola S-Records (`*.PIC`), and the
  author's own assembly map (`JOUST.DOC`).
- **Secondary:** the MAME driver (`src/mame/midway/williams*.cpp`) for
  board-level facts the source never states — clocks, blitter behavior, screen
  geometry, IRQ generation, the sound board. Cited externally by file:line; not
  vendored.

**That path depth is load-bearing.** The 1982 tree is now *two* levels above
this directory, not one. Six files here resolve it (`tests/helpers/joust-source.ts`,
`tests/audit/citations.test.ts` and the four tools), and every one of them
honours `JOUST_SOURCE_DIR` first. Get the depth wrong and nothing goes red:
110 `describe.skipIf(!vendoredAvailable)` guards across 29 test files quietly
skip, the byte-for-byte citation gate stops opening its 883 claims, and the
suite still reports 75 files passed. The Task 12 import measured that failure
mode deliberately — 1280 passed | 566 skipped, fully green — before repairing it.

The vendored tree **is committed to this monorepo** (49 files), so the
byte-verification half of the citation gate runs everywhere, not only on a
machine that happens to have quarried it. `.gitignore` here still excludes a
checkout-local `reference/` for scratch work, which is a different directory.

---

## Architecture

- `src/core/` — pure deterministic simulation. No DOM, no Canvas, no time,
  no `Math.random`. 18 modules (`flight`, `arena`, `enemy`, `egg`, `wave`,
  `target`, `pictures`, …), guarded by `tests/purity.test.ts`.
- `src/shell/` — render / input / timebase. Three modules; **no audio and no
  storage**, both deliberately.

That boundary is the single most important rule in this repo, as in every
sibling.

### What joust does NOT do (said plainly, so nobody "fixes" it)

- **It persists no high scores.** No `localStorage`, no storage module, no
  `@shared/highscore` — like red-baron, unlike centipede. This is not an
  oversight.
- **It consumes nothing from `@shared`.** joust is the fleet's outlier: every
  other game consumes between four and nine subpaths. Its mulberry32 is lifted
  **byte-for-byte** into `src/core/frame.ts` rather than imported (the comments
  there naming `@arcade/shared/rng` are provenance, not a dependency). Whether
  joust adopts the shared library is an open ruling owned by `sprint/epic-jt5.yaml`,
  not something to settle by adding an import.
- **It has no citation-gate escape hatch.** Every claim in
  `docs/rom-study/claims/*.json` re-opens against the vendored line
  byte-for-byte, and the checker refuses to report success over an empty claim
  set rather than passing vacuously.
