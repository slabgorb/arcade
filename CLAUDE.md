# CLAUDE.md — arcade

This file provides guidance to Claude Code when working on this project.

## Project Overview

**arcade** is the orchestrator repo for a series of browser-based, vector-style
arcade games. It holds shared context, sprint/session tooling, the tmux session
launcher, and Pennyfarthing workflows. The games themselves live in their own
gitignored subrepos, each with independent git history.

**Type:** orchestrator (no application code lives here — only tooling in `scripts/`)
**Games:** seven faithful clones — five vector: `tempest/` (1981), `star-wars/` (1983),
`asteroids/` (1979), `battlezone/` (1980), `red-baron/` (1980) — two raster:
`centipede/` (1981) and the first Williams title, `joust/` (1982) — and the
`lobby/` front-end and the `arcade-shared/` library.

## Repository Structure

```
arcade/                      # Orchestrator (this repo)
├── .claude/                 # Claude Code configuration
├── .pennyfarthing/          # Pennyfarthing framework (pf 13.3.0)
│   └── repos.yaml           # Registry of orchestrated subrepos — SOURCE OF TRUTH
├── .session/                # Active work sessions
├── sprint/                  # Combined sprint + epics for ALL games
├── scripts/                 # Orchestrator tooling (release.mjs, …)
├── docs/ops/                # Hosting architecture + runbook
├── justfile                 # Task runner (imports .pennyfarthing/justfile.pf)
├── start-session            # tmux multi-pane session launcher
├── tmux.conf.*              # tmux layouts (left / right / vert)
│
│   # every subrepo below is GITIGNORED, with its own remote and history:
├── lobby/                   # Vector menu shell — the arcade's front door
├── tempest/                 # Game — Atari 1981
├── star-wars/               # Game — Atari 1983
├── asteroids/               # Game — Atari 1979
├── battlezone/              # Game — Atari 1980
├── red-baron/               # Game — Atari 1980
├── centipede/               # Game — Atari 1981 (raster)
├── joust/                   # Game — Williams 1982 (raster)
└── arcade-shared/           # Library — published as @arcade/shared
```

Each game splits the same way: `src/core/` is the pure deterministic simulation,
`src/shell/` is render / audio / input / storage. That boundary is the single most
important rule in every game repo — see the game's own CLAUDE.md.

New games are added as sibling subrepos and registered in `repos.yaml`.

## Subrepos & Commands

Build and test commands run **inside the subrepo**. Sprint and workflow commands
(`/pf-sprint`, `/pf-sm`, …) run at the **orchestrator root**, where the combined
sprint lives.

### Every game + the lobby (TypeScript · Vite 8 · Vitest 4 · ES modules)

All eight browser subrepos — `lobby`, `tempest`, `star-wars`, `asteroids`,
`battlezone`, `red-baron`, `centipede`, `joust` — take the **same** commands.
Only the port differs (see the table below).

```bash
cd <subrepo>
npm install
npm run dev        # vite dev server on its pinned port
npm run build      # tsc --noEmit && vite build
npm test           # vitest run --passWithNoTests
npm run test:watch
npm run lint       # tsc --noEmit (games only; the lobby has no lint script)
```

### arcade-shared (library — no dev server)

Consumed by the games as a **version-pinned git-URL dependency**, so it has no
dev server and is not part of `just serve`.

```bash
cd arcade-shared
npm test           # note: `pretest` builds first — dist/ is gitignored
npm run build
```

Current subpath exports: `/math3d` (the ported Atari Math Box), `/rng`,
`/highscore`, `/loop`, `/font`, `/pause`, `/glow`, `/view`, `/audio`.

## Serving the arcade (dev)

There is **one** canonical way to run the arcade locally: `just serve`, from the
orchestrator root. It serves **this checkout's working tree** for development —
it has nothing to do with what the public sees (see Production below).

```bash
just install-all   # once per fresh checkout — installs lobby + every game
just serve         # serve the whole cabinet (lobby + games) on pinned ports
```

`just serve` launches every servable subrepo from the current checkout on its
pinned port (Ctrl-C stops them all):

Every subrepo has `base: '/'`, so each app is served at the **root** of its own
port — there is no `/tempest/` path prefix:

| Subrepo    | URL                       | Port |
|------------|---------------------------|------|
| lobby      | `http://localhost:5270/`  | 5270 |
| tempest    | `http://localhost:5273/`  | 5273 |
| star-wars  | `http://localhost:5274/`  | 5274 |
| asteroids  | `http://localhost:5275/`  | 5275 |
| battlezone | `http://localhost:5276/`  | 5276 |
| red-baron  | `http://localhost:5277/`  | 5277 |
| centipede  | `http://localhost:5278/`  | 5278 |
| joust      | `http://localhost:5279/`  | 5279 |

Ports are pinned with `strictPort` in each subrepo's `vite.config.ts`, so a
collision fails loudly instead of silently wandering to another port. The first
server to bind a pinned port owns it; a second `just serve` on the same port
errors out rather than quietly starting a rival copy.

> **Trap — the port may belong to a *different checkout*.** Because every checkout
> (`a-1`, `a-2`, …) pins the *same* ports, `localhost:5274` may be served by a
> sibling checkout's working tree. If you screenshot it to verify a render change,
> you are verifying **someone else's code**. Prove whose server answers before you
> trust it, and serve your own tree on a spare port rather than killing theirs:
>
> ```bash
> PID=$(lsof -ti tcp:5274 | head -1)
> lsof -a -p "$PID" -d cwd -Fn | grep '^n'   # → n/Users/you/Projects/a-2/star-wars
> npx vite --port 5284 --strictPort          # serve YOUR checkout instead
> ```

### Production: R2 static hosting — the front door is the lobby

The live arcade is **not** a dev server. Each subrepo builds to a self-contained
`dist/` that is uploaded to its own public Cloudflare R2 bucket, fronted by a
custom domain. The front door, `arcade.slabgorb.com`, **is** the lobby bucket;
its tiles launch each game's subdomain.

| App        | Live URL                                                       | Bucket            |
|------------|----------------------------------------------------------------|-------------------|
| lobby      | [arcade.slabgorb.com](https://arcade.slabgorb.com)             | arcade-lobby      |
| tempest    | [tempest.slabgorb.com](https://tempest.slabgorb.com)           | arcade-tempest    |
| star-wars  | [star-wars.slabgorb.com](https://star-wars.slabgorb.com)       | arcade-star-wars  |
| asteroids  | [asteroids.slabgorb.com](https://asteroids.slabgorb.com)       | arcade-asteroids  |
| battlezone | [battlezone.slabgorb.com](https://battlezone.slabgorb.com)     | arcade-battlezone |
| red-baron  | [red-baron.slabgorb.com](https://red-baron.slabgorb.com)       | arcade-red-baron  |

The Cloudflare-tunnel routing that used to serve the arcade is retired;
[`cloudflared/`](./cloudflared/) is kept as history. Architecture and runbook:
[`docs/ops/hosting.md`](./docs/ops/hosting.md).

### Releasing: main is production

Game repos ship by release, never by hand-editing `main`:

```bash
just release <name> [patch|minor|major]   # default patch
just release-all [level]                  # whole fleet; stops at first failure
```

`scripts/release.mjs` gates on the game's own tests + build, bumps the version
on `develop`, merges `--no-ff` into `main`, tags `vX.Y.Z`, and pushes. The push
to `main` triggers that repo's GitHub Actions deploy (a ten-line caller of the
reusable `slabgorb/arcade/.github/workflows/deploy-r2.yml@main`): build → test →
upload `dist/` to the R2 bucket. A red CI run uploads nothing — the bucket keeps
serving the last good build.

- `just deploy` / `just deploy-one <name>` still exist as the manual fallback;
  they upload the local checkout's build directly and are the only way
  production can diverge from `main`. Prefer releases.
- First release of a repo: watch CI. Tests that pass locally can exceed
  vitest's 5s default timeout on GitHub's slower runners (tempest needed a
  scoped 30s timeout on one CPU-bound test).

### "Canonical" is the repo, not the directory

The orchestrator repo is **arcade**. It can be checked out in any directory
(`~/Projects/arcade`, `a-1`, `a-2`, …) — the directory name is just a location
and carries no authority. Every checkout is equally `arcade`; there is no
blessed folder.

What's live is defined by **what's on each repo's `main` branch** — CI deploys
it to R2 — not by any checkout or dev server. `just serve` in any checkout is
local-only and cannot affect production; only a release (or an explicit
`just deploy`) can.

## Git Workflow

- **Orchestrator (arcade):** remote `origin` → [github.com/slabgorb/arcade](https://github.com/slabgorb/arcade); default branch `main` (trunk-based — commit straight to `main`). Just commit; no need to ask first.
- **Game subrepos + arcade-shared:** each has its own remote and history.
  - **Default branch:** `develop`
  - **PRs target:** `develop`
  - **`main` = production:** never commit or push to a game's `main` directly —
    it only receives release merges (`just release <name>`), and every push to
    it auto-deploys to R2.
  - **Naming:** `feat/{story}-{description}`, `fix/{issue}-{description}`,
    `chore/{story}-{description}`

**`repos.yaml` is what the tooling actually enforces**, not this file. pf's
branch-protection hook reads each repo's `branch_strategy` and protects the
default branch of every `gitflow` repo. Two consequences worth knowing:

- The value **must be the literal string `trunk-based`**. pf compares against that
  exact spelling (`pf/hooks/branch_protection.py`), and *any* other value — a bare
  `trunk`, a typo — silently falls through to the gitflow path and **protects
  `main`**, blocking the direct sprint commits this repo is meant to allow. This
  actually happened; the fix was one word, and `repos.yaml` now carries a comment
  saying so. If commits to `main` start getting blocked here, check that line first.
- Even from the orchestrator, the games' `develop` stays protected — so you cannot
  push a game's `develop` by accident from the wrong working directory.

Both hooks judge the repo/branch from the **session's** working directory, not from
a `cd` inside your command. When touching another repo, use `git -C <path>` and
`gh -R <owner>/<repo>` or you will trip a false positive.

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

- **Sprint tracking lives at the orchestrator root** (`arcade/sprint/`) — one
  combined sprint with an epic per game. Run sprint/workflow commands from the
  orchestrator; run a game's build/test commands from inside that game's directory.
- **Shared code lives in `arcade-shared`**, published as `@arcade/shared` and
  consumed as a **version-pinned git-URL dependency** — so each subrepo pins its
  own tag and they drift on purpose (star-wars is on `v0.13.1`, the lobby on
  `v0.4.0`). Bumping the library does not move a game until that game re-pins.
  The games still share a visual language (glowing vector lines on black, Canvas 2D,
  no backend) more than they share implementation; extract into the library only
  once a second game proves the duplication is real.
- **Persona theme:** 1984 (`/pf-theme show` for the cast) — Winston Smith (SM),
  O'Brien (TEA), Julia (Dev), the Thought Police (Reviewer).
- **No Jira** — issue tracking is local via `sprint/` YAML files. The `jira_key`
  in a session file is just the story id.
