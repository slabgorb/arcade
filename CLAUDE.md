# CLAUDE.md — arcade

This file provides guidance to Claude Code when working on this project.

## Project Overview

**arcade** is the orchestrator repo for a series of browser-based, vector-style
arcade games. It holds shared context, sprint/session tooling, the tmux session
launcher, and Pennyfarthing workflows. The games themselves live in their own
gitignored subrepos, each with independent git history.

**Type:** orchestrator (no application code lives here)
**First game:** `tempest/` — a faithful vector clone of Atari's 1981 *Tempest*

## Repository Structure

```
arcade/                      # Orchestrator (this repo)
├── .claude/                 # Claude Code configuration
├── .pennyfarthing/          # Pennyfarthing framework (pf 13.3.0)
│   └── repos.yaml           # Registry of orchestrated game subrepos
├── .session/                # Active work sessions
├── sprint/                  # Combined sprint + epics for ALL games
├── justfile                 # Task runner (imports .pennyfarthing/justfile.pf)
├── start-session            # tmux multi-pane session launcher
├── tmux.conf.*              # tmux layouts (left / right / vert)
├── tempest/                 # Game subrepo (gitignored) — pure game code
│   ├── src/core/            # Deterministic simulation
│   └── src/shell/           # Render / audio / input / storage
└── lobby/                   # Arcade lobby subrepo (gitignored) — vector menu shell
```

New games are added as sibling subrepos and registered in `repos.yaml`.

## Subrepos & Commands

Build and test commands run **inside the game subrepo**. Sprint and workflow
commands (`/pf-sprint`, `/sm`, …) run at the **orchestrator root**, where the
combined sprint lives.

### tempest (TypeScript · Vite 8 · Vitest 4 · ES modules)

```bash
cd tempest
npm install
npm run dev      # vite dev server → http://localhost:5273
npm run build    # tsc --noEmit && vite build
npm test         # vitest run --passWithNoTests
npm run test:watch
```

### lobby (TypeScript · Vite 8 · Vitest 4 · ES modules)

```bash
cd lobby
npm install
npm run dev      # vite dev server → http://localhost:5270/lobby/
npm run build    # tsc --noEmit && vite build
npm test         # vitest run --passWithNoTests
```

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

| Subrepo    | URL                                    | Port |
|------------|----------------------------------------|------|
| lobby      | `http://localhost:5270/lobby/`         | 5270 |
| tempest    | `http://localhost:5273/tempest/`       | 5273 |
| star-wars  | `http://localhost:5274/star-wars/`     | 5274 |
| asteroids  | `http://localhost:5275/asteroids/`     | 5275 |
| battlezone | `http://localhost:5276/battlezone/`    | 5276 |
| red-baron  | `http://localhost:5277/red-baron/`     | 5277 |

Ports are pinned with `strictPort` in each subrepo's `vite.config.ts`, so a
collision fails loudly instead of silently wandering to another port. The first
server to bind a pinned port owns it; a second `just serve` on the same port
errors out rather than quietly starting a rival copy.

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

- **Orchestrator (arcade):** remote `origin` → [github.com/slabgorb/arcade](https://github.com/slabgorb/arcade); default branch `main` (trunk-based — commit straight to `main`). Commit only when asked.
- **Game subrepos:** each has its own remote and history.
  - **Default branch:** `develop`
  - **PRs target:** `develop`
  - **`main` = production:** never commit or push to a game's `main` directly —
    it only receives release merges (`just release <name>`), and every push to
    it auto-deploys to R2.
  - **Naming:** `feat/{story}-{description}`, `fix/{issue}-{description}`,
    `chore/{story}-{description}`

## Developer Guidance

### Getting Started

- Run `/pf-help` for context-aware help on any command or agent
- Run `/pf-sprint status` to see current sprint progress
- Run `/pf-sprint work` to pick up your next story

### Daily Workflow

1. `/sm` — Start or resume a story (Scrum Master handles setup)
2. Agent handoffs guide you through the workflow automatically
3. `/reviewer` — Code review when implementation is complete
4. `/sm` — Finish the story (archive, merge, update tracking)

### Key Commands

| Command | Purpose |
|---------|---------|
| `/pf-help` | Context-aware help |
| `/pf-sprint backlog` | See available work |
| `/pf-sprint work STORY` | Start a specific story |
| `/pf-theme show` | See your current persona theme |
| `/pf-workflow` | Check active workflow status |

## Important Notes

- **Sprint tracking lives at the orchestrator root** (`arcade/sprint/`) — one
  combined sprint with an epic per game. Run sprint/workflow commands from the
  orchestrator; run a game's build/test commands from inside that game's directory.
- **No shared code yet.** Games share a visual language (glowing vector lines on
  black, Canvas 2D, no backend) but not implementation. Extract a shared library
  only once a second game proves the duplication is real.
- **Persona theme:** Blade Runner (`/pf-theme show` for the cast).
- **No Jira** — issue tracking is local via `sprint/` YAML files.
