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

## Serving the arcade (canonical)

There is **one** authoritative way to serve the arcade: `just serve`, from the
orchestrator root.

```bash
just install-all   # once per fresh checkout — installs lobby + every game
just serve         # serve the whole cabinet (lobby + games) on pinned ports
```

`just serve` is the single source of truth for running the arcade in dev. It
launches every servable subrepo from the current checkout on its pinned port
(Ctrl-C stops them all):

| Subrepo | URL                              | Port |
|---------|----------------------------------|------|
| lobby   | `http://localhost:5270/lobby/`   | 5270 |
| tempest | `http://localhost:5273/tempest/` | 5273 |

Ports are pinned with `strictPort` in each subrepo's `vite.config.ts`, so a
collision fails loudly instead of silently wandering to another port. The first
server to bind a pinned port owns it; a second `just serve` on the same port
errors out rather than quietly starting a rival copy.

### Tunnel routing: the front door is the lobby

On the live host the Cloudflare tunnel routes `arcade.slabgorb.com` **path-based**
so the root lands on the **lobby**, not a game: `/tempest/*` → `:5273`, and
everything else (`/`, `/lobby/*`) → the lobby on `:5270` (Vite 302-redirects `/`
→ `/lobby/`). The runtime config (`~/.cloudflared/config.yml`) lives outside the
repo and is shared with other tunnels, so the canonical arcade ingress is
checked in at [`cloudflared/`](./cloudflared/) — see `cloudflared/README.md` for
the apply + restart procedure.

### "Canonical" is the repo, not the directory

The orchestrator repo is **arcade**. It can be checked out in any directory
(`~/Projects/arcade`, `a-1`, `a-2`, …) — the directory name is just a location
and carries no authority. Every checkout is equally `arcade`; there is no
blessed folder.

The live arcade ([arcade.slabgorb.com](https://arcade.slabgorb.com), via a
Cloudflare tunnel) is whatever checkout currently has `just serve` bound to the
tunnel's pinned ports (`:5273` tempest, `:5270` lobby). Which checkout is "live"
is a **runtime fact — which process owns the ports — not a property of the
directory name.** To make a checkout live, run `just serve` from it; `strictPort`
guarantees only one server can hold each pinned port at a time, so two checkouts
never silently fight over `:5273`.

## Git Workflow

- **Orchestrator (arcade):** remote `origin` → [github.com/slabgorb/arcade](https://github.com/slabgorb/arcade); default branch `main` (trunk-based — commit straight to `main`). Commit only when asked.
- **Game subrepos:** each has its own remote and history.
  - **Default branch:** `develop`
  - **PRs target:** `develop`
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
