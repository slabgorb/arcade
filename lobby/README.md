# lobby

The arcade's front door — a vector-style lobby on black that lists the games as
glowing tiles, launches them, runs an attract-mode demo loop when idle, and shows
per-game high scores. Canvas 2D, no backend. One app in the **arcade** monorepo;
sprint/epics are managed at the orchestrator root (epic 7).

**▶ Live: [arcade.slabgorb.com](https://arcade.slabgorb.com)** — this lobby is
the arcade's front door.

## Stack

TypeScript (ES modules, strict) · Vite 8 · Vitest 4 · HTML5 Canvas 2D. No engine,
no backend. Uses the same root Vite/Vitest toolchain as every other app in this
monorepo — there is no separate lobby-specific config left to drift.

## Commands

`lobby/` is no longer its own toolchain — `lobby/package.json` is a bare
`{name, version, private}` stub, and there is no `lobby/vite.config.ts` or
lockfile. The root owns install, dev-serve and test for the whole cabinet.
Run these from the **repo root**, not from inside `lobby/`:

```bash
npm install                       # installs the whole cabinet — no per-app npm install
just serve                        # the ONE dev server (== `npx vite`, pinned :5270)
npm test                          # vitest across every project, lobby included
npx vitest run --project lobby    # this app's tests only
node ../scripts/build-app.mjs lobby   # build this app → dist/
```

**The lobby owns `/`, and each game owns `/<id>/`** — in dev exactly as in the
bucket, where this app holds the root keys and each game its own prefix. The root
`vite.config.ts` default-exports `defineAppConfig({ id: 'lobby' })`, whose `root`
is this directory, and its `arcade:serve-the-cabinet` plugin mounts one
middleware-mode Vite server per game under that game's prefix. A screenshot taken
at `/tempest/` is tempest.

Two things about this app specifically. Unknown paths (`/banana/`) still reach
**this app's** SPA fallback, because owning `/` means owning everything unclaimed —
so an all-`200` check of game paths proves nothing (it passed for months while
every path returned this page). And `lobby/index.html` references `/src/main.ts`,
the same absolute specifier every plugin uses; it stays unambiguous only because
each app is served with its own `root`. Pinned by `the one dev server serves the
whole cabinet, not one app at every path` in `tests/canonical-serve.test.mjs`.

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

The lobby ships as part of the `arcade` monorepo, not as its own repo — its
`.git` history is gone (removed when it was imported) and it has no `develop`/
`main` of its own to gate a release on. It releases like every other app, from
the repo root:

```bash
just release lobby [patch|minor|major]
```

That gates on `npx vitest run --project lobby` plus `node scripts/build-app.mjs
lobby`, bumps `lobby/package.json`, regenerates the committed
`src/host/registry.ts` into the same commit, tags **`lobby-vX.Y.Z`** and pushes.
The TAG is what deploys — a push to `main` ships nothing, because `main` carries
every app's commits and could not say which one to build. A bare `vX.Y.Z` is
invalid in this monorepo, since it holds every app's tags side by side.

`just release-all` deliberately ships the lobby **last**: each game's version
bump is baked into the generated registry, and these tiles read their versions
from there, so one lobby release at the end carries every accumulated bump.
