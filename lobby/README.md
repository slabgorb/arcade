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
npx vite                          # dev server; today this serves ONLY the lobby (no
                                   # plugins/ tree exists yet for vite to also serve)
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

The lobby ships as part of the `arcade` monorepo, not as its own repo — its
`.git` history is gone (removed when it was imported) and it has no `develop`/
`main` of its own to gate a release on. The monorepo-wide release path (what
gates a release, what tags it, what pushes and deploys) is still being built by
a later stage of this migration and is not in place yet — do not try
`just release lobby` today; it predates this app being an app in a monorepo
and cannot run against it.

The one settled fact already: release tags are `lobby-vX.Y.Z`. A bare
`vX.Y.Z` is invalid in this monorepo, since it holds every app's tags side by
side. **`main` is production — never push it by hand.**
