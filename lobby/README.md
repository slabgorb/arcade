# lobby

The arcade's front door — a vector-style lobby on black that lists the games as
glowing tiles, launches them, runs an attract-mode demo loop when idle, and shows
per-game high scores. Canvas 2D, no backend. Second subrepo in the **arcade**
series; sprint/epics are managed at the orchestrator (epic 7).

**▶ Live: [arcade.slabgorb.com](https://arcade.slabgorb.com)** — this lobby is
the arcade's front door.

## Stack

TypeScript (ES modules, strict) · Vite 8 · Vitest 4 · HTML5 Canvas 2D. No engine,
no backend. Mirrors the `tempest` toolchain so the two games stay consistent.

## Commands

`lobby/` is no longer its own toolchain — `lobby/package.json` is a bare
`{name, version, private}` stub, and there is no `lobby/vite.config.ts` or
lockfile. The root owns install, dev-serve and test for the whole cabinet.
Run these from the **repo root**, not from inside `lobby/`:

```bash
npm install                       # installs the whole cabinet — no per-app npm install
npx vite                          # dev server for the whole cabinet; / is the lobby
npm test                          # vitest across every project, lobby included
npx vitest run --project lobby    # this app's tests only
```

(There is no working root `npm run build` yet — that lands in a later stage of
the monorepo migration. Don't run it expecting a lobby build.)

## Structure

```
lobby/
├── src/
│   ├── core/         # PURE, unit-tested, no DOM/canvas (e.g. layout math)
│   └── main.ts       # bootstrap: canvas + render shell
├── tests/            # Vitest suites against the pure core
├── index.html        # Vite entry
├── package.json      # {name, version, private} stub — no scripts, no deps
└── tsconfig.json     # extends the root tsconfig
```

The pure `core/` vs. IO `shell` split follows the same discipline as the other
apps in this monorepo: anything testable without a canvas lives in `core/`; the
DOM bootstrap stays in `main.ts`. The lobby is served at the cabinet root (`/`)
— every other app gets its own `/<id>/` — on arcade.slabgorb.com.

## Releasing

The lobby ships as part of the `arcade` monorepo, not as its own repo. Release
tags are `lobby-vX.Y.Z` — a bare `vX.Y.Z` is invalid here, since this monorepo
holds every app's tags side by side. See the root `justfile`'s `release` /
`release-all` recipes and `docs/ops/hosting.md` for the current release and R2
deploy mechanics; **`main` is production — never push it by hand.**
