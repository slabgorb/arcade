# arcade

A home for a series of **browser-based arcade-game clones** — mostly glowing vector
lines on black, Canvas 2D, no backend, no game engine. Each game is small,
self-contained, and playable in a browser.

This is **one repository**: a plugin host. The games live in `plugins/<id>/`, the
shared library in `src/shared/`, and the lobby that fronts them all in `lobby/`. Until
2026-07-30 they were nine separate repos; `docs/ops/migration-manifest.md` records
where each tree came from.

## Play it

**The arcade is live: [arcade.slabgorb.com](https://arcade.slabgorb.com)** — the lobby
front door, with every game one tile away.

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

| Game | Play | Description | Source |
|------|------|-------------|--------|
| **Tempest** | [tempest.slabgorb.com](https://tempest.slabgorb.com) | Faithful clone of Atari's 1981 vector arcade game — ride the rim of a tube and blast enemies climbing the lanes. | [`plugins/tempest`](plugins/tempest) |
| **Star Wars** | [star-wars.slabgorb.com](https://star-wars.slabgorb.com) | Faithful clone of Atari's 1983 vector arcade game — first-person cockpit shooter (TIEs → Death Star surface → trench run). | [`plugins/star-wars`](plugins/star-wars) |
| **Asteroids** | [asteroids.slabgorb.com](https://asteroids.slabgorb.com) | Faithful clone of Atari's 1979 vector arcade game — inertial ship flight, splitting rocks, and a roaming saucer. | [`plugins/asteroids`](plugins/asteroids) |
| **Battlezone** | [battlezone.slabgorb.com](https://battlezone.slabgorb.com) | Faithful clone of Atari's 1980 vector arcade game — first-person 3D wireframe tank duel with dual-tread steering. | [`plugins/battlezone`](plugins/battlezone) |
| **Red Baron** | [red-baron.slabgorb.com](https://red-baron.slabgorb.com) | Faithful clone of Atari's 1980 vector arcade game — first-person WWI biplane dogfight over a vector landscape. | [`plugins/red-baron`](plugins/red-baron) |
| **Centipede** | [in the lobby](https://arcade.slabgorb.com)&nbsp;† | Faithful clone of Atari's 1981 raster arcade game — trackball shooter in a mushroom field, with spider, flea and scorpion. | [`plugins/centipede`](plugins/centipede) |
| **Joust** | [in the lobby](https://arcade.slabgorb.com)&nbsp;† | Faithful clone of Williams' 1982 raster arcade game — flapping knight duel over a lava pit. | [`plugins/joust`](plugins/joust) |

† The two newest cabinets, added after the per-game hosting table was last written, and
reached through the lobby's tiles. Joust has had a green deploy (v0.0.8, during the
migration); centipede's has never been confirmed from this repo, so its tile may not
launch yet. See [`docs/ops/hosting.md`](docs/ops/hosting.md).

Plus the front door: [**the lobby**](lobby), the vector-style menu that lists and
launches every game above.

**The cabinet is collapsing onto one origin.** Every app now ships into a single
bucket behind `arcade.slabgorb.com`, the lobby at `/` and each game at `/<id>/`. The
per-game hostnames above become permanent redirects to those paths, so they keep
working either way. See [`docs/ops/hosting.md`](docs/ops/hosting.md).

## Design principles

- **Vector aesthetic** — glowing vector lines on black, rendered with HTML5 Canvas 2D.
  No 3D engine, no physics engine. (Centipede and Joust are raster originals and are
  drawn as such.)
- **Pure-sim core** — game logic is a deterministic, framework-free simulation
  (`src/core`), kept separate from the rendering/audio/input shell (`src/shell`). This
  keeps the logic unit-testable without a DOM, and every game has a test that scans its
  own `src/core/` to enforce it.
- **No backend** — everything runs client-side; high scores live in `localStorage`.
- **Share late** — code moves into `src/shared/` only once a second game proves the
  duplication is real.

## Repo layout

```
arcade/                  # ONE repo — this is the whole thing
├── .pennyfarthing/      # multi-agent dev workflow (pf) + repos.yaml (one entry)
├── justfile             # task runner — `just serve` (dev), `just release` (ship)
├── vite.config.ts       # one config factory, parameterised by app id
├── vitest.config.ts     # one vitest project per app
├── src/host/            # the plugin contract + the generated game registry
├── src/shared/          # the shared library, in-tree (imported as `@shared/…`)
├── lobby/               # the arcade lobby shell — served at the origin root
├── plugins/<id>/        # one directory per game
├── scripts/             # build-app · release · deploy-r2 · gen-registry
└── tests/               # the orchestrator suite (node:test)
```

The orchestration tooling is [Pennyfarthing](https://github.com/slabgorb/pennyfarthing),
a multi-agent development framework.

## Running the arcade locally

The **canonical** way to serve the arcade in dev is a single command at the repo root:

```bash
npm install          # once per fresh checkout — one install for the whole cabinet
just serve           # ONE vite dev server: http://127.0.0.1:5270/
```

`just serve` is the one authoritative dev launch command, and it is a bare `npx vite` —
the port `5270`, the host and `strictPort` all come from `vite.config.ts`, so an
invocation that forgets the flags is pinned too. A port collision **fails loudly**;
only one server can hold 5270 at a time, which is what stops a sibling checkout serving
you its working tree by accident. Local servers are dev-only; they never affect the
live site. See `CLAUDE.md` → _Serving the arcade (dev)_ for the full workflow.

## Deploying and releasing

Production is Cloudflare **R2 static hosting**: one public bucket behind
`arcade.slabgorb.com`, with the lobby at the root keys and each game under its own
`<id>/` key prefix. **A tag deploys, not a branch** — `main` carries every app's
commits, so a push to it could not say which app to ship.

```bash
just release <app> [patch|minor|major]  # test+build gate, version bump, tag
                                        # <app>-vX.Y.Z, push — CI then deploys to R2
just release-all [level]                # every app; games first, lobby last
just deploy                             # manual fallback: build + upload straight
                                        # to the bucket from this checkout
```

A bare `vX.Y.Z` tag is invalid here: it names no app and deploys nothing.

Details and runbook: [`docs/ops/hosting.md`](docs/ops/hosting.md).

## Working on a game

```bash
just serve                # the ONE dev server for the cabinet (see the caveat below)
just test-all             # every project's tests, in one vitest process
just test-one tempest     # one app's tests — what the release gate runs
just build-all            # build every app (seven games + the lobby) into dist/
git status                # one repo, one history — `just status` is retired
```

There are no per-game `dev-*`/`test-*`/`build-*` recipes any more, and no
`just status`/`just pull`: each was `cd <name> && npm run …` across eight sibling
checkouts that are now one repo. Take the app id as an argument instead.

⚠ **`just serve` serves the LOBBY at every path today.** The root `vite.config.ts`
default-exports the lobby's config, so `/`, `/tempest/` and even a nonsense `/banana/`
all return `200` with identical bytes. A screenshot taken at `/tempest/` is the lobby —
the `/<id>/` paths are real in the R2 build, not in dev.
