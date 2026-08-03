# Centipede

A faithful, browser-based clone of Atari's 1981 arcade game *Centipede* — Ed
Logg and Dona Bailey's mushroom-field shooter. The first **raster** game in an
arcade of vector siblings, rendered with HTML5 Canvas 2D. No game engine, no
backend — a **deterministic pure simulation core** wrapped by a thin
input/render shell, the same architecture as its siblings
[tempest](../tempest), [asteroids](../asteroids), [battlezone](../battlezone),
[star-wars](../star-wars) and [red-baron](../red-baron).

> **Status:** Live at **v0.0.6**, playable and **audible**. Five epics have
> shipped: the scaffold and the machine-verified primary-source dossier (cp1),
> the playable raster slice — playfield, mushrooms, the centipede train,
> rendering and the trackball (cp2), the ecosystem — spider, flea, scorpion
> (cp3), the game structure — waves, bonus lives, attract mode, high-score
> entry (cp4), and the audio seam (cp5). **The cabinet now has sound.**
> `src/core/events.ts` emits every gameplay moment as data,
> `src/shell/audio-manifest.ts` holds the fourteen-cue SOUNDS manifest,
> `src/shell/audio.ts` builds the shared engine and holds the channel map, and
> `src/shell/audio-dispatch.ts` wires the two together. `main.ts` constructs the
> engine with `createAudio()` behind the browser's gesture gate and calls
> `playEventSounds` once per stepped frame — the shell has been wired that way
> **as of `cp5-2`**, which connected it.
>
> **The samples are live.** `cp6-1` ruled what each of the fourteen cues
> transcribes — six POKEY frequency tables at `CENTI4.MAC:2455-2465`, recorded
> in [`docs/rom-study/sound.md`](./docs/rom-study/sound.md) — and `cp6-2` baked
> them with [`tools/pokey-bake/bake-sfx.mjs`](./tools/pokey-bake/bake-sfx.mjs)
> and uploaded them. They are served from
> `arcade-assets.slabgorb.com/centipede/sfx/`, staged and shipped by
> `just deploy-assets` from the monorepo root.
>
> **Ten of the fourteen are transcriptions; four are declared stand-ins.** The
> ROM has no sound at all for the mushroom hit, a head reaching the bottom row,
> or a wave clearing — the machine marks those visually — and the flea's voice
> is COMPUTED from its vertical position rather than tabulated, so a fixed
> sample can only ever stand in for it. The baker's `PROVENANCE` record says
> which cue is which, derived from `docs/rom-study/sound.fixture.json` rather
> than asserted by hand.
>
> **The acceptance test for an asset story here is a live `200` and an ear,
> never a green vitest** — the shared engine swallows a failed fetch, a blocked
> autoplay and undecodable data identically, so a missing sample and a working
> one look the same to the whole suite. A decodable `.wav` of the wrong tone
> passes every mechanical check in this repo.

---

## Quick start

**centipede is a plugin inside the arcade monorepo — it is not a standalone
repo and has no build, dev-server or test commands of its own.** Its
`package.json` is a three-field stub (name/version/private); the repository root
owns every tool. Run everything from the **monorepo root**:

```bash
npm install                            # once, for the whole cabinet
npx vitest run --project centipede     # centipede's suite: 50 files / 893 tests
npx vitest run                         # the whole cabinet
npm run lint                           # tsc --noEmit across the monorepo
npm run test:orchestrator              # the root node:test suite
```

> **There is no way to open centipede in a browser from this repo right now.**
> The root `npx vite` serves the **lobby** at every path — probed on a spare
> port (5297), `/`, `/centipede/` and a nonsense control `/banana/` all return
> 200 with the same `<title>Slabcade</title>` page. That is a blanket SPA
> fallback, not routing. Do not screenshot `/centipede/` and report it as
> centipede. The per-plugin dev server, the port pin (centipede owned 5278) and
> `npm run build` were all removed by the monorepo migration; the root build and
> the plugin router are still being wired up. The **shipped** game is unaffected
> and still live at [centipede.slabgorb.com](https://centipede.slabgorb.com/).

---

## Reference sources

- **Primary:** the preserved original assembler source
  ([historicalsource/centipede](https://github.com/historicalsource/centipede)),
  vendored as a greppable LF copy at the **monorepo root** —
  [`reference/atari-source/centipede/`](../../reference/atari-source/centipede/),
  pinned `dbbe6de`, and tracked in this repo. Four ROM revisions in one tree;
  the study targets **revision 4** (final, Sept 1981), with rev-2 supplying the
  graphics/sync artifacts rev 4 never re-cut.
- **Secondary:** the MAME driver (`src/mame/atari/centiped*.cpp`) for
  board-level facts the source never states — clocks, exact refresh, screen
  geometry, IRQ generation. Never byte-opened; corroboration only.

The dossier that reads them is [`docs/rom-study/`](docs/rom-study/), and it is
**machine-verified, not prose**: 373 claims across `docs/rom-study/claims/*.json`
each re-open a cited `FILE:LINE` byte-for-byte against the vendored tree.

```bash
node tools/audit/check-citations.mjs   # from plugins/centipede/ — "checked 373 claim(s)"
```

The gate also runs inside the suite (`tests/audit/citations.test.ts`). Because
`reference/` is now tracked in-repo, it no longer degrades to schema-only in a
fresh checkout — every claim is byte-verified everywhere.

## Architecture

```
src/
├── core/               # PURE, deterministic, unit-tested — no DOM, no Canvas,
│   │                   # no time, no Math.random (tests/purity.test.ts enforces it)
│   ├── sim.ts          # the frame step: the whole game state machine
│   ├── playfield.ts    # the mushroom field, seeding and regrowth
│   ├── centipede.ts    # the train — marching, splitting, the loose head
│   ├── spider.ts       # the spider
│   ├── flea.ts         # the flea and the mushrooms it drops
│   ├── scorpion.ts     # the scorpion and mushroom poisoning
│   ├── player.ts       # the gun and its shot
│   ├── bonus.ts        # bonus lives
│   ├── score.ts        # scoring
│   └── pictures.ts     # the ROM picture-stamp decoder (2bpp, rev-2 chips)
├── shell/              # IO: render / input / storage / timing
│   ├── render.ts       # Canvas 2D drawing
│   ├── atlas.ts        # the sprite atlas built from pictures.ts
│   ├── palette.ts      # the ROM colour palette and its cycling
│   ├── layout.ts       # screen layout and the HUD
│   ├── input.ts        # trackball via pointer lock, plus keyboard
│   ├── timebase.ts     # the ROM cadence, 15750/263 Hz — centipede's own
│   └── demo.ts         # the attract-mode self-play driver
└── main.ts             # bootstrap: canvas + wire shell ↔ core
```

That boundary is the single most important rule in this repo, as in every
sibling. Two centipede-specific notes an agent will otherwise get wrong:

- **centipede runs its OWN timebase and integer-scale blit.** `shell/timebase.ts`
  ticks at the ROM's 15750/263 Hz, not 60 Hz, and the raster blit uses a bespoke
  integer scale. Both are deliberate and are *not* being converged onto the
  shared shell.
- **centipede DOES persist high scores, and the table lives in `core`.** The
  board, the `qualifies` verdict and the initials buffer are core state, by a
  fleet-wide ruling; the shell holds only the storage adapter
  (`makeHighScoreStorage` in `main.ts` — the one thing that touches
  `localStorage`). This is not a layering mistake to "fix".

## Shared library

centipede consumes `@shared/rng`, `@shared/highscore`, `@shared/name-entry`,
`@shared/loop` and — as of cp5-1 — `@shared/audio`, the in-repo library at
[`src/shared/`](../../src/shared/), reached through the `@shared/*` path alias.
`src/shell/audio-manifest.ts` holds the SOUNDS manifest (dependency-free, so the
POKEY bake can read it under plain node) and `src/shell/audio.ts` holds the rest
of this cabinet's numbers — the CHANNELS voice map and the R2 base URL — and
builds the shared engine from them; the WebAudio machinery itself is not forked.
**The samples are baked and live** — see the status note above. It does **not** consume `@shared/font` (score and level
digits are ROM picture tiles, by epic ruling).

Two known divergences, both recorded rather than silently absorbed:

- `@shared/highscore` keeps 10 entries; the ROM's table is 8
  (`CENDE4.MAC:120 "NSCORE =8"`). The clone therefore accepts two placings the
  cabinet would refuse — invisible in play, since only the top score is drawn.
- Initials entry is a keyboard **UX port**. The cabinet scrolls one letter with
  the horizontal trackball and commits with FIRE through a 5-frame debounce; the
  buffer arithmetic is still the shared `stepNameEntry` verb.

Both are written up in [`docs/rom-study/open-questions.md`](docs/rom-study/open-questions.md),
which also carries the resolved study questions and their citations.
