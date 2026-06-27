# Shared Agent Context

This file contains common context loaded by all agents.

## Project

- **Name:** arcade
- **Type:** Orchestrator for a series of browser-based vector arcade games
- **Sprint Status:** lives in each game subrepo (e.g. `tempest/sprint/current-sprint.yaml`)
- **Active Work:** `.session/{story-id}-session.md`
- **Agent Framework:** Pennyfarthing (pf CLI, v13.3.0)
- **Persona Theme:** Blade Runner
- **Issue Tracking:** local `sprint/` YAML (no Jira)

### Tech Stack

| Component   | Type         | Language   | Framework | Notes |
|-------------|--------------|------------|-----------|-------|
| arcade      | orchestrator | —          | —         | Coordination only; no app code |
| tempest     | ui (game)    | TypeScript | Vite 8    | Canvas 2D vector clone of Atari Tempest; Vitest 4; ES modules |

### Repo Structure

```
arcade/                      # Orchestrator (this repo)
├── .claude/                 # Claude Code configuration
│   └── project/docs/        # This file
├── .pennyfarthing/          # Pennyfarthing framework
│   └── repos.yaml           # Registry of orchestrated game subrepos
├── .session/                # Active work sessions
├── justfile                 # Task runner (imports .pennyfarthing/justfile.pf)
└── tempest/                 # Game subrepo (gitignored, clone separately)
    ├── src/
    │   ├── core/            # Deterministic simulation (sim, state, rules, enemies)
    │   └── shell/           # Render / audio / input / storage / loop / fx
    ├── tests/
    └── sprint/              # tempest's own sprint tracking
```

New games are added as sibling subrepos and registered in `repos.yaml`.

## Git Branch Strategy

- **Orchestrator (arcade):** no remote yet; commit only when asked.
- **Game subrepos:** own remote & history. Default branch `develop`.
  - **Branch from:** `develop`
  - **PRs target:** `develop`
  - **Naming:** `feat/{story}-{description}` or `fix/{issue}-{description}`

## TDD Workflow

1. **SM** creates story and hands off to TEA
2. **TEA** writes failing tests, hands off to Dev
3. **Dev** implements to pass tests, hands off to Reviewer
4. **Reviewer** reviews code, approves or requests changes

## Testing Commands

Run from inside the relevant game subrepo.

```bash
# tempest
cd tempest
npm test                       # vitest run --passWithNoTests
npm test -- -t "test name"     # run a specific test
npm run test:watch             # watch mode
```

## Building

```bash
# tempest
cd tempest
npm run build                  # tsc --noEmit && vite build
npm run dev                    # vite dev server → http://localhost:5273
```

## Conventions

- Games share a visual language (glowing vector lines on black, Canvas 2D, no
  backend) but **no code yet**. Don't build a shared library until a second game
  proves the duplication.
- Work on a game from inside its own directory — sprint, tests, and git history
  all live there, not at the orchestrator root.
