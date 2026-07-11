# arcade

A home for a series of **browser-based, vector-style arcade games** — glowing
lines on black, Canvas 2D, no backend, no game engine. Each game is small,
self-contained, and playable in a browser.

This repo is the **orchestrator**: it coordinates the games, shared tooling, and
development workflow. Each game lives in its own repository.

## Play it

**The arcade is live: [arcade.slabgorb.com](https://arcade.slabgorb.com)** — the
lobby front door, with every game one tile away.

## Games

<table>
<tr>
<td width="50%"><a href="https://tempest.slabgorb.com"><img width="100%" src="https://arcade-assets.slabgorb.com/tempest/thumb.png" alt="Tempest gameplay — the Claw riding a square tube as Flippers climb the lanes"></a></td>
<td width="50%"><a href="https://star-wars.slabgorb.com"><img width="100%" src="https://arcade-assets.slabgorb.com/star-wars/thumb.png" alt="Star Wars gameplay — the Death Star trench run toward the exhaust port"></a></td>
</tr>
<tr>
<td width="50%"><a href="https://asteroids.slabgorb.com"><img width="100%" src="https://arcade-assets.slabgorb.com/asteroids/thumb.png" alt="Asteroids gameplay — the vector ship among drifting rocks as a saucer crosses"></a></td>
<td width="50%"><a href="https://battlezone.slabgorb.com"><img width="100%" src="https://arcade-assets.slabgorb.com/battlezone/thumb.png" alt="Battlezone gameplay — first-person wireframe tank duel under the radar scanner"></a></td>
</tr>
</table>

| Game | Play | Description | Repo | Stack |
|------|------|-------------|------|-------|
| **Tempest** | [tempest.slabgorb.com](https://tempest.slabgorb.com) | Faithful clone of Atari's 1981 vector arcade game — ride the rim of a tube and blast enemies climbing the lanes. | [slabgorb/tempest](https://github.com/slabgorb/tempest) | TypeScript · Vite · Vitest |
| **Star Wars** | [star-wars.slabgorb.com](https://star-wars.slabgorb.com) | Faithful clone of Atari's 1983 vector arcade game — first-person cockpit shooter (TIEs → Death Star surface → trench run). | [slabgorb/star-wars](https://github.com/slabgorb/star-wars) | TypeScript · Vite · Vitest |
| **Asteroids** | [asteroids.slabgorb.com](https://asteroids.slabgorb.com) | Faithful clone of Atari's 1979 vector arcade game — inertial ship flight, splitting rocks, and a roaming saucer. | [slabgorb/asteroids](https://github.com/slabgorb/asteroids) | TypeScript · Vite · Vitest |
| **Battlezone** | [battlezone.slabgorb.com](https://battlezone.slabgorb.com) | Faithful clone of Atari's 1980 vector arcade game — first-person 3D wireframe tank duel with dual-tread steering. | [slabgorb/battlezone](https://github.com/slabgorb/battlezone) | TypeScript · Vite · Vitest |
| **Red Baron** | [red-baron.slabgorb.com](https://red-baron.slabgorb.com) | Faithful clone of Atari's 1980 vector arcade game — first-person WWI biplane dogfight over a vector landscape. | [slabgorb/red-baron](https://github.com/slabgorb/red-baron) | TypeScript · Vite · Vitest |

Plus the shared front door: [**lobby**](https://github.com/slabgorb/lobby), the
vector-style menu that lists and launches every game above — live at
[arcade.slabgorb.com](https://arcade.slabgorb.com).

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
├── justfile             # task runner — `just serve` (dev), `just release` (ship)
├── lobby/               # arcade lobby shell (tracked separately)
├── tempest/             # game repo (tracked separately)
├── star-wars/           # game repo (tracked separately)
├── asteroids/           # game repo (tracked separately)
├── battlezone/          # game repo (tracked separately)
└── red-baron/           # game repo (tracked separately)
```

The orchestration tooling is [Pennyfarthing](https://github.com/slabgorb/pennyfarthing),
a multi-agent development framework.

## Running the arcade locally

The **canonical** way to serve the whole arcade in dev — the lobby plus every
game — is a single command at the orchestrator root:

```bash
just install-all     # once per fresh checkout (installs lobby + every game)
just serve           # serve the whole cabinet: lobby + every game
```

`just serve` is the one authoritative dev launch command. Ports are pinned with
`strictPort`, so a port collision fails loudly — only one server can hold a
given pinned port at a time. Local servers are dev-only; they never affect the
live site. See `CLAUDE.md` → _Serving the arcade (dev)_ for the full workflow.

| Subrepo | URL | Port |
|---------|-----|------|
| lobby | `http://localhost:5270/lobby/` | 5270 |
| tempest | `http://localhost:5273/tempest/` | 5273 |
| star-wars | `http://localhost:5274/star-wars/` | 5274 |
| asteroids | `http://localhost:5275/asteroids/` | 5275 |
| battlezone | `http://localhost:5276/battlezone/` | 5276 |
| red-baron | `http://localhost:5277/red-baron/` | 5277 |

## Deploying and releasing

Production is Cloudflare **R2 static hosting**: each app's `dist/` lives in its
own public bucket behind its own domain (table above). Each game repo's `main`
branch **is** production — merging to it auto-deploys via GitHub Actions.

```bash
just release <name> [patch|minor|major]  # test+build gate, version bump, merge
                                         # develop → main, tag vX.Y.Z, push —
                                         # CI then deploys to R2 (default: patch)
just release-all [level]                 # release the whole fleet
just deploy                              # manual fallback: build + upload every
                                         # local dist/ straight to the buckets
```

Details and runbook: [`docs/ops/hosting.md`](docs/ops/hosting.md).

## Working on a game

```bash
just dev-tempest     # start tempest's dev server  (http://localhost:5273/tempest/)
just dev-lobby       # start the lobby dev server  (http://localhost:5270/lobby/)
just test-all        # run tests across every game
just build-all       # build every game
just status          # git status across orchestrator + games
```

star-wars, asteroids, battlezone, and red-baron don't yet have dedicated
`dev-*`/`build-*` recipes — run their commands directly instead:
`cd star-wars && npm run dev` (same pattern for the others). See each game's
own README for details.
