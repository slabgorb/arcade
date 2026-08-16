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

> **Status:** Live at **v0.0.8** and, since jt5-2, **audible**. Stories are archived
> across five epics: the scaffold and the machine-verified primary-source
> dossier (jt1); the simulation — process scheduler, enemies, the joust,
> eggs, the wave machine, transporters and the wave-1 demo (jt2); the
> menagerie — difficulty ramp, bridge/cliff destruction, lava troll,
> pterodactyl, baiters, death dissolve (jt3); the game structure — BCD
> scoring, extra men, wave types and bounties, game-over and the loop (jt4);
> and the in-progress playability epic (jt8) that makes enemies hunt
> and eggs catchable.
> **Audio: seam and samples.** jt5-1 landed the three-file wiring —
> `src/core/events.ts` (ROM-cited moments, emitted as data), the
> `src/shell/audio.ts` manifest over the shared `@shared/audio` engine, and
> `src/shell/audio-dispatch.ts` behind a `never` exhaustiveness guard — and
> jt5-2 synthesised the samples and uploaded them: one `.wav` per manifest
> entry, baked by `tools/sample-bake/bake-samples.mjs` (deterministic
> stand-ins whose lengths span each table's own ROM window — the sound
> board's firmware was never vendored, so waveform character is judgement)
> and staged under `joust/sfx/` on the assets bucket by `just deploy-assets`,
> with a 200 + `audio/wav` curled for every file at upload (2026-08-01). No
> `.wav` lives in this repo — the samples' home is the bucket, and
> `@shared/audio` still degrades quietly on a 404, so a green suite proves
> the wiring only; if sound goes missing, re-verify with a curl, not a test
> run.

---

## Quick start

**joust is a plugin inside the arcade monorepo — it is not a standalone repo and
has no build, dev-server or test commands of its own.** Its `package.json` is a
three-field stub (name/version/private); the repository root owns every tool.
Run everything from the **monorepo root**:

```bash
npm install                         # once, for the whole cabinet
npx vitest run --project joust      # this game's tests only
npx vitest run                      # the whole cabinet
npm run lint                        # tsc --noEmit across the monorepo
npm run test:orchestrator           # the root node:test suite
node plugins/joust/tools/audit/check-citations.mjs   # verifies the ROM citations
```

> **Open joust in a browser with `just serve`, from the monorepo root.** One
> Vite dev server holds the whole cabinet on `http://127.0.0.1:5270/` — the
> lobby at `/` and this game at `/joust/`, served from these plugin sources, so
> a dev URL and a production URL differ only in origin. mg1-2 landed that; the
> per-plugin dev server and joust's old private port are gone with it.
>
> Unknown paths still fall back to the lobby's SPA shell, which is why an
> all-`200` sweep proves nothing — a fallback answers 200 to everything. A check
> that means something compares a game path against a nonsense control and
> asserts they DIFFER, which is what `tests/canonical-serve.test.mjs` pins.
> Hot reload does not reach the games; refresh the browser (mg1-14).
>
> The **shipped** game was MEASURED live on 2026-08-02, not inferred from a
> hostname — CLAUDE.md's rule is to request it, with a control:
> `arcade.slabgorb.com/joust/` and `joust.slabgorb.com/` each served
> `<title>Joust</title>`, while `/banana-control/` on each served `Not Found`.
> The single-origin path is the canonical one.

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
every `describe.skipIf(!vendoredAvailable)` / `it.skipIf(...)` guard in the
suite quietly skips, the byte-for-byte citation gate degrades to schema-only,
and the run still reports every file passed. The 2026-07-30 monorepo migration
hit exactly this failure mode — a fully-green run that was silently skipping the
citation gate — before repairing it.

The vendored tree **is committed to this monorepo**, so the
byte-verification half of the citation gate runs everywhere, not only on a
machine that happens to have quarried it. `.gitignore` here still excludes a
checkout-local `reference/` for scratch work, which is a different directory.

---

## Architecture

- `src/core/` — pure deterministic simulation. No DOM, no Canvas, no time,
  no `Math.random`. The core modules (`flight`, `arena`, `enemy`, `egg`, `wave`,
  `target`, `pictures`, …), guarded by `tests/purity.test.ts`.
- `src/shell/` — render, input, timebase, audio (manifest + dispatch) and the
  per-mode screens (title, select, attract, game-over, high-score); no storage
  module — high-score persistence lives at the host layer in `main.ts` (jt10-7),
  not in the shell.

That boundary is the single most important rule in this repo, as in every
sibling.

### What joust does and does NOT do (said plainly, so nobody "fixes" it)

- **It persists high scores.** jt10-7 added the JOUST CHAMPIONS table:
  `main.ts` keeps one `localStorage` key, `joust-high-scores`, through
  `makeHighScoreStorage` from `@shared/highscore` — single-origin, so the lobby
  and every cabinet share it. Like centipede, unlike red-baron (which persists
  nothing).
- **It consumes several `@shared` subpaths:** `@shared/audio`, `@shared/font`,
  `@shared/held-keys`, `@shared/highscore`, `@shared/host-helpers`,
  `@shared/loop`, `@shared/name-entry`, `@shared/rng` and `@shared/view`. The SH3
  epic retired joust's per-game re-implementations (SH3-1 the rng, SH3-2 the
  `mountCanvas` host helper), and jt5-1 had already ended joust's original run as
  the fleet's zero-consumption outlier.
  Its mulberry32 is no longer inlined: `src/core/frame.ts` sources the seeded
  draw from `@shared/rng` through `src/core/rng.ts` (SH3-1 retired the
  byte-for-byte copy that used to live in `frame.ts`). There was
  no adoption ruling left to make: the 2026-07-30 monorepo collapse put
  `src/shared/` in-tree behind the `@shared/*` alias, so an import costs a line
  and nothing is pinned, git-URL'd or version-bumped.
- **The citation gate cannot pass over an empty CLAIM SET.** With
  `docs/rom-study/claims/` missing or empty the checker refuses to report
  success and exits non-zero, rather than announcing victory over nothing.
  **That guard does not extend to a missing SOURCE TREE**, and the distinction
  is the whole of the path-depth warning above: with the tree absent the gate
  degrades *by design* to a schema-only check and still prints
  its `all claims verified`, exit 0 —
  `JOUST_SOURCE_DIR=/nonexistent node plugins/joust/tools/audit/check-citations.mjs`
  demonstrates it in one command. Byte-for-byte re-opening is therefore a
  property of *having the tree wired up correctly*, not something the gate can
  enforce on its own. Check the skip count, not the exit code.
