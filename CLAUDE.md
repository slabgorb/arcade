# CLAUDE.md — arcade

This file provides guidance to Claude Code when working on this project.

## Project Overview

**arcade** is **one repository**: a plugin host for a series of browser-based
arcade-game clones, the lobby that fronts them, the shared library they all import,
and the sprint/session tooling, tmux launcher and Pennyfarthing workflows that build
them.

It used to be nine independent repos — seven games, the `lobby`, and `arcade-shared`,
each gitignored inside this orchestrator with its own remote and history. They were
collapsed into this repo on 2026-07-30. Provenance (the source SHA and release tag of
every tree) is recorded in [`docs/ops/migration-manifest.md`](./docs/ops/migration-manifest.md).
History was squashed on import, so those nine GitHub repos — to be **archived, never
deleted** — remain the only place pre-migration per-file blame survives.

**Type:** monorepo — application code (`plugins/`, `lobby/`, `src/`) and its tooling
(`scripts/`, `tests/`) live together.
**Games:** seven faithful clones — five vector: `tempest` (1981), `star-wars` (1983),
`asteroids` (1979), `battlezone` (1980), `red-baron` (1980) — and two raster:
`centipede` (1981) and the first Williams title, `joust` (1982).

## Repository Structure

```
arcade/                      # ONE repo, ONE history, ONE npm install
├── .claude/                 # Claude Code configuration
├── .pennyfarthing/          # Pennyfarthing framework
│   └── repos.yaml           # ONE entry (`arcade`) — the gate every pf command reads
├── .session/                # Active work sessions
├── sprint/                  # Combined sprint + epics for ALL apps
├── src/
│   ├── host/                # Plugin contract + the GENERATED game registry  (`@host`)
│   └── shared/              # The shared library, in-tree                    (`@shared`)
├── lobby/                   # The arcade's front door — served at the ROOT of the origin
├── plugins/                 # One directory per game: plugin.ts, index.html, src/, tests/
│   ├── tempest/  star-wars/  asteroids/  battlezone/
│   └── red-baron/  centipede/  joust/
├── scripts/                 # build-app.mjs · release.mjs · deploy-r2.mjs · gen-registry.mjs
├── tests/                   # The ORCHESTRATOR suite (node:test) — vitest never sees these
├── vite.config.ts           # ONE config factory, parameterised by app id
├── vitest.config.ts         # ONE vitest project per app
├── tsconfig.json            # ONE tsconfig — covers src, plugins, lobby, scripts
├── justfile                 # Task runner (imports .pennyfarthing/justfile.pf)
├── docs/ops/                # Hosting architecture + runbook + the migration manifest
├── start-session            # tmux multi-pane session launcher
└── tmux.conf.*              # tmux layouts (left / right / vert)
```

Each game splits the same way: `plugins/<id>/src/core/` is the pure deterministic
simulation, `plugins/<id>/src/shell/` is render / audio / input / storage. That
boundary is the single most important rule in every game, and every game enforces it
mechanically with a test that scans its own `src/core/` source text (variously named
`purity`, `core-boundary`, `sim-clock-free`). Two games carry their own supplementary
guidance — `plugins/tempest/CLAUDE.md` and `plugins/star-wars/CLAUDE.md`.

**Shared code is in-tree.** `src/shared/` is the former `@arcade/shared` package,
imported as `@shared/<module>` (alias declared in `vite.config.ts`, `vitest.config.ts`
and `tsconfig.json` — all three, or the editor and the build disagree). There is no
version pin, no git-URL dependency, and nothing to re-point: a change to `src/shared`
is compiled, type-checked and tested against every game in the same commit.
Modules: `math3d` (the ported Atari Math Box), `rng`, `highscore`, `name-entry`,
`loop`, `font`, `pause`, `glow`, `view`, `audio`, `synth`, `esc-overlay`.

> A leftover `arcade-shared/` directory may still sit at the root of an older
> checkout. It is **gitignored and dead** — the pre-migration library's working copy,
> imported into `src/shared/` and no longer referenced by anything (`no @arcade/shared
> dependency survives anywhere`, `tests/monorepo-topology.test.mjs`). Never import
> from it; it is safe to delete.

**Adding a game** is a directory plus three registrations: create `plugins/<id>/` with
a `plugin.ts` manifest and an `index.html`, add the id to `games` in the `justfile` and
to `GAMES` in `vitest.config.ts`, then `npm run gen:registry` to regenerate the
committed `src/host/registry.ts`. `scripts/build-app.mjs` and the deploy workflow read
the `plugins/` directory itself, so neither needs editing.

## Commands

Everything runs from the **repo root**. There is one `package.json`, one lockfile and
one `node_modules`; no command ever needs a `cd`.

```bash
npm install                          # once per fresh checkout (== `just install-all`)

just serve                           # the ONE dev server (see below)
npx vitest run                       # every app's tests in one process (== `just test-all`)
npx vitest run --project tempest     # ONE app's tests (== `just test-one tempest`)
npm run lint                         # tsc --noEmit, repo-wide — the only type check anywhere
npm run test:orchestrator            # tests/ (node:test): the cabinet's wiring invariants
node scripts/build-app.mjs tempest   # build ONE app into dist/<id>/ (lobby → dist/)
just build-all                       # every app, lobby first (the order is load-bearing)
just ci                              # test-orchestrator + test-all + build-all
```

Two suites, two runners, and they do not overlap: **vitest** runs the apps'
`*.test.ts` (one project per app, each rooted at its own directory), while
`npm run test:orchestrator` runs `tests/**/*.test.mjs` under `node:test` — the
cabinet-wide wiring invariants. A change to CI, the justfile, the deploy workflow or
this file is guarded by the second, not the first.

Sprint and workflow commands (`/pf-sprint`, `/pf-sm`, …) also run at the root, where
the combined sprint lives.

## Serving the arcade (dev)

There is **one** canonical way to run the arcade locally: `just serve`, from the repo
root. It serves **this checkout's working tree** for development — it has nothing to
do with what the public sees (see Production below).

```bash
npm install     # once per fresh checkout — one install for the whole cabinet
just serve      # ONE vite dev server, on ONE port: http://127.0.0.1:5270/
```

`just serve` is a bare `npx vite`. The port (**5270**), the host and `strictPort` come
from `vite.config.ts`, deliberately **not** from CLI flags, so a bare `npx vite`, an
editor task or a copy-pasted command is pinned exactly as the recipe is.

> ⚠ **What it actually serves today: the LOBBY, at every path.** The root
> `vite.config.ts` default-exports `defineAppConfig({ id: 'lobby' })`, whose `root` is
> `lobby/`, so `/`, `/tempest/`, `/tempest/models.html` and a nonsense `/banana/` all
> return `200` with byte-identical HTML and `<title>Slabcade</title>`. It is a blanket
> SPA fallback, not a route table. **A screenshot taken at `/tempest/` is the lobby** —
> do not verify a game's render there. The `/<id>/` paths are real in the *built*
> output (that is what `base` decides, and what the R2 key prefixes mirror); making the
> dev server serve them too is filed as **uf1-19**. Pinned by `the dev server serves
> the LOBBY at every path` in `tests/canonical-serve.test.mjs`, which reddens the day
> uf1-19 lands and this paragraph has to change.

Eight pinned ports are now one, but the pin still matters — and `strictPort` alone
does not protect it. `strictPort` makes a collision **fail loudly**, so only one
server can own `127.0.0.1:5270`; with that address held, however, an unpinned `host`
lets Vite bind `[::1]:5270` instead, and two dev servers share the port with no
collision error at all. `vite.config.ts` therefore pins `host: '127.0.0.1'` on both
the `server` and `preview` blocks (discovered on joust as jt1-3, ported fleet-wide as
td1-1). Sibling checkouts (`a-1`, `a-2`, `a-3`) all pin the **same** 5270, so the
first to bind it owns it and the others fail — visibly, which is the point. To serve
your own tree alongside someone else's, take a spare port explicitly:

```bash
npx vite --port 5290 --strictPort
```

### Production: R2 static hosting — one origin, one bucket

The live arcade is **not** a dev server. Every app builds to a self-contained
directory (`dist/` for the lobby, `dist/<id>/` for each game) and is uploaded into a
**single public Cloudflare R2 bucket, `arcade-lobby`**, fronted by
`arcade.slabgorb.com`. The lobby owns the bucket's **root keys** — that is what makes
it the front door at `/` — and each game owns its own **`<id>/` key prefix**.

| App        | Path on the single origin                        | Bucket key prefix |
|------------|--------------------------------------------------|-------------------|
| lobby      | `https://arcade.slabgorb.com/`                   | *(root)*          |
| tempest    | `https://arcade.slabgorb.com/tempest/`           | `tempest/`        |
| star-wars  | `https://arcade.slabgorb.com/star-wars/`         | `star-wars/`      |
| asteroids  | `https://arcade.slabgorb.com/asteroids/`         | `asteroids/`      |
| battlezone | `https://arcade.slabgorb.com/battlezone/`        | `battlezone/`     |
| red-baron  | `https://arcade.slabgorb.com/red-baron/`         | `red-baron/`      |
| centipede  | `https://arcade.slabgorb.com/centipede/`         | `centipede/`      |
| joust      | `https://arcade.slabgorb.com/joust/`             | `joust/`          |

One origin means the lobby and every game share `localStorage`, which is what retires
the cross-origin high-score cookie of ADR-0004 (see that ADR's 2026-07-30 amendment).

The seven `arcade-<game>` buckets and their `<game>.slabgorb.com` custom domains still
exist and still serve their pre-migration builds: unbinding them and replacing them
with Single Redirects onto `arcade.slabgorb.com/<id>/` is the **owner's** step, and it
had not been taken when this file was written. Until it is, treat a game's own
subdomain as live. Full architecture, the real bucket inventory and the runbook:
[`docs/ops/hosting.md`](./docs/ops/hosting.md).

The Cloudflare tunnel that once served the arcade is retired; [`cloudflared/`](./cloudflared/)
is kept as history.

### Releasing: a TAG is production

Apps ship one at a time, by release — never by hand-editing anything:

```bash
just release <app> [patch|minor|major]   # default patch, e.g. `just release tempest`
just release-all [level]                 # every app; games first, lobby last
```

`scripts/release.mjs` gates on that app's own suite (`npx vitest run --project <app>`)
and its own build (`node scripts/build-app.mjs <app>`), bumps
`plugins/<app>/package.json` (or `lobby/package.json`), regenerates the committed
`src/host/registry.ts` into the **same** commit, then tags **`<app>-vX.Y.Z`** and
pushes.

**The tag is the deploy trigger, not a push to `main`.** `main` now carries every
app's commits, so a branch trigger could not say which app to ship — it would
redeploy all eight on every commit. `.github/workflows/deploy.yml` fires on `*-v*`,
parses the app id back out of the tag, and refuses anything that is not
`<app>-vX.Y.Z`. **A bare `vX.Y.Z` tag is invalid here** — it matches no app and
deploys nothing.

CI then runs: `npm ci` → `npm run lint` (the only type check in the whole release or
deploy path) → `npm run test:orchestrator` → that app's vitest project → build →
upload to `arcade-lobby` under the app's key prefix. A red run uploads nothing, so the
bucket keeps serving the last good build. The checkout uses `fetch-depth: 0` because
tempest's and red-baron's citation gates read blobs out of the commits their audits
were taken against (the `audit/*` tags); a shallow clone fails them.

- `just deploy` / `just deploy-one <app>` remain the manual fallback: they upload the
  local checkout's build straight to the bucket, bypassing the tag and CI, and are
  therefore the only way production can diverge from a release. Prefer releases.
- Game assets (star-wars' sfx/speech/music) are **not** in any app's build. They live
  in a separate bucket — named plain **`arcade`**, not `arcade-assets` — uploaded by
  hand with `just deploy-assets`. CI never touches it. See `docs/ops/hosting.md`.

### "Canonical" is the repo, not the directory

The repo is **arcade**. It can be checked out in any directory (`~/Projects/arcade`,
`a-1`, `a-2`, …) — the directory name is just a location and carries no authority.
Every checkout is equally `arcade`; there is no blessed folder.

What's live is defined by **which tags have been pushed and deployed**, not by any
checkout or dev server. `just serve` in any checkout is local-only and cannot affect
production; only a release (or an explicit `just deploy`) can.

## Git Workflow

**One repo, one remote, one branch.** `origin` → [github.com/slabgorb/arcade](https://github.com/slabgorb/arcade);
default branch `main`, trunk-based — commit straight to `main`. Just commit; no need
to ask first. There are no per-game remotes, no `develop` branches and no per-game
PRs; the nine archived repos are read-only history.

Branch naming, when a branch is warranted: `feat/{story}-{description}`,
`fix/{issue}-{description}`, `chore/{story}-{description}`.

**`repos.yaml` is what the tooling actually enforces**, not this file. It now holds a
single entry, `arcade`, and pf's branch-protection hook reads its `branch_strategy`:

- The value **must be the literal string `trunk-based`**. pf compares against that
  exact spelling (`pf/hooks/branch_protection.py`), and *any* other value — a bare
  `trunk`, a typo, `gitflow` — falls through to the gitflow path and **protects
  `main`**, blocking the direct sprint commits this repo depends on. Measured against
  pf 13.4.0's own hook: with the file as committed the protected set is **empty**;
  with `trunk`, `trunk_based` or `gitflow` substituted it becomes `{main}`. (Deleting
  the key entirely is *safe* — the hook defaults to `trunk-based` — but a wrong value
  is not.) If commits to `main` start getting blocked here, check that line first.
- The hook used to protect the games' `develop` branches even from the orchestrator.
  With one repo in `repos.yaml` there are no gitflow entries left, so it now protects
  **nothing**. That guard is gone because the thing it guarded is gone, not because it
  was disabled.

The hook judges the repo/branch from the **session's** working directory, not from a
`cd` inside your command. That still matters when touching a checkout outside this one
(a sibling `a-2`, or `~/Projects/pennyfarthing`): use `git -C <path>` and
`gh -R <owner>/<repo>`.

## Developer Guidance

### Getting Started

- Run `/pf-help` for context-aware help on any command or agent
- Run `/pf-sprint status` to see current sprint progress
- Run `/pf-sprint work` to pick up your next story

### Daily Workflow

Every agent command is `pf`-prefixed — there is no bare `/sm` or `/reviewer`.

1. `/pf-sm` — Start or resume a story (Scrum Master handles setup)
2. Agent handoffs guide you through the workflow automatically
   (`/pf-tea` → `/pf-dev` → `/pf-reviewer` in the default `tdd` workflow)
3. `/pf-reviewer` — Code review when implementation is complete
4. `/pf-sm` — Finish the story (archive, merge, update tracking)

### Key Commands

| Command | Purpose |
|---------|---------|
| `/pf-help` | Context-aware help |
| `/pf-sprint status` | Sprint progress |
| `/pf-sprint backlog` | See available work |
| `/pf-sprint work STORY` | Start a specific story |
| `/pf-theme show` | See your current persona theme |
| `/pf-workflow` | Check active workflow status |

## Important Notes

- **Sprint tracking lives at the repo root** (`sprint/`) — one combined sprint with an
  epic per app. Everything else does too now: there is no "run this from inside the
  subrepo" any more.
- **Extract into `src/shared` only once a second game proves the duplication is real.**
  The collapse removed the *pinning* ceremony, not the eligibility bar — the games
  share a visual language (glowing vector lines on black, Canvas 2D, no backend) more
  than they share implementation, and code that is genuinely one game's belongs in
  that game's `plugins/<id>/src/`.
- **Node ≥ 22.18** (`package.json` `engines`), and the floor is real: `scripts/`
  imports `.ts` modules directly and relies on Node's default type stripping, which
  landed in 22.18.
- **Persona theme:** 1984 (`/pf-theme show` for the cast) — Winston Smith (SM),
  O'Brien (TEA), Julia (Dev), the Thought Police (Reviewer).
- **No Jira** — issue tracking is local via `sprint/` YAML files. The `jira_key` in a
  session file is just the story id.
