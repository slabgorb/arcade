# arcade

A home for a series of **browser-based, vector-style arcade games** — glowing
lines on black, Canvas 2D, no backend, no game engine. Each game is small,
self-contained, and playable in a browser.

This repo is the **orchestrator**: it coordinates the games, shared tooling, and
development workflow. Each game lives in its own repository.

## Games

| Game | Description | Repo | Stack |
|------|-------------|------|-------|
| **Tempest** | Faithful clone of Atari's 1981 vector arcade game — ride the rim of a tube and blast enemies climbing the lanes. | [slabgorb/tempest](https://github.com/slabgorb/tempest) | TypeScript · Vite · Vitest |

More games to come — each added as a sibling repo and registered here.

## Design principles

- **Vector aesthetic** — glowing vector lines on black, rendered with HTML5
  Canvas 2D. No 3D engine, no physics engine.
- **Pure-sim core** — game logic is a deterministic, framework-free simulation
  (`src/core`), kept separate from the rendering/audio/input shell (`src/shell`).
  This keeps the logic unit-testable without a DOM.
- **No backend** — everything runs client-side; high scores live in
  `localStorage`.
- **Share late** — games share a visual language but not code. A shared library
  gets extracted only once a second game proves the duplication is real.

## Repo layout

```
arcade/                  # this orchestrator repo
├── .pennyfarthing/      # multi-agent dev workflow (pf) + repos.yaml registry
├── justfile            # task runner — `just serve` runs the whole arcade
├── lobby/              # arcade lobby shell (tracked separately)
└── tempest/            # game repo, developed alongside (tracked separately)
```

The orchestration tooling is [Pennyfarthing](https://github.com/slabgorb/pennyfarthing),
a multi-agent development framework.

## Running the arcade

The **canonical** way to serve the whole arcade — the lobby plus every game — is
a single command at the orchestrator root:

```bash
just install-all     # once per fresh checkout (installs lobby + every game)
just serve           # serve the cabinet: lobby on :5270, tempest on :5273
```

`just serve` is the one authoritative launch command. The live arcade
([arcade.slabgorb.com](https://arcade.slabgorb.com), via a Cloudflare tunnel) is
served from a single canonical checkout running exactly this — **never** start an
ad-hoc server from a duplicate / non-authoritative clone. See `CLAUDE.md` →
_Serving the arcade (canonical)_ for the full workflow.

## Working on a game

```bash
just dev-tempest     # start tempest's dev server  (http://localhost:5273/tempest/)
just dev-lobby       # start the lobby dev server  (http://localhost:5270/lobby/)
just test-all        # run tests across every game
just build-all       # build every game
just status          # git status across orchestrator + games
```
