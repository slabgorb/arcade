# Story A-1 Context

## Title
Subrepo scaffold + arcade wiring (repos.yaml, just serve, lobby tile, cloudflared, port 5275, /asteroids/ base)

## Metadata
- **Story ID:** A-1
- **Type:** chore
- **Points:** 3
- **Priority:** p1
- **Workflow:** trivial
- **Repo:** asteroids
- **Epic:** Asteroids — faithful 1979 vector clone

## Problem
The `asteroids/` subrepo does not exist yet — this is the epic's chicken-and-egg
bootstrap story. Every later Asteroids story assumes a working subrepo (gitflow
history, Vite/Vitest toolchain, dev server) plumbed into the orchestrator's
serve/build/test fan-out, the lobby's game list, and the Cloudflare tunnel. A-1
creates that subrepo from scratch (copying the star-wars blueprint verbatim)
and wires it into all four integration points so `just serve` and the live
tunnel both light up `/asteroids/` alongside lobby, tempest, and star-wars.

## Technical Approach

**1. Create the subrepo (gitflow, no remote yet)**
- `mkdir asteroids && cd asteroids && git init && git checkout -b develop`
  (gitflow default branch; remote `github.com/slabgorb/asteroids` is added
  once the GitHub repo exists — not blocking for this story).
- `asteroids/.gitignore` — mirror `star-wars/.gitignore`: `node_modules/`,
  `dist/`, `.DS_Store`, the pf/tmux runtime lines, and `reference/` (gitignored
  quarry directory, even though no reference porting happens until A-17 —
  create the entry now so nobody accidentally commits it later).

**2. Copy the star-wars toolchain verbatim, three substitutions**
- `asteroids/package.json` — copy `star-wars/package.json` verbatim except
  `"name": "asteroids"`. Scripts stay identical: `dev` (`vite`), `build`
  (`tsc --noEmit && vite build`), `preview` (`vite preview`), `test`
  (`vitest run --passWithNoTests`), `test:watch` (`vitest`), `lint`
  (`tsc --noEmit`). Same devDependencies (`typescript ^5.4.0`, `vite ^8.1.0`,
  `vitest ^4.1.9`).
- `asteroids/vite.config.ts` — copy `star-wars/vite.config.ts` with exactly
  three substitutions: `base: '/asteroids/'`, `server.port: 5275`,
  `preview.port: 5275`. Keep `strictPort: true` and
  `allowedHosts: ['arcade.slabgorb.com']` on **both** `server` and `preview`
  blocks (the Cloudflare tunnel forwards that Host header — dropping either
  block breaks tunnel access). No multi-page `rollupOptions.input` — that's a
  star-wars-specific need (models.html/scenes.html contact sheets); Asteroids
  ships a single `index.html` like tempest.
- `asteroids/tsconfig.json` — copy `star-wars/tsconfig.json` verbatim (ES2020
  target, strict, `types: ["vitest/globals", "vite/client"]`,
  `include: ["src", "tests"]`).
- `asteroids/index.html` — copy `star-wars/index.html`'s shape (black
  full-bleed `<canvas id="game">`, `<script type="module" src="/src/main.ts">`)
  with the title changed to "Asteroids".

**3. Minimal scaffold proving the dev server works**
- `asteroids/src/main.ts` — minimal canvas bootstrap: get `#game`, size it to
  the window, fill black, stroke one placeholder vector shape (e.g. a small
  triangle outline standing in for the ship) so a person hitting
  `localhost:5275/asteroids/` sees something other than a blank tab. No input
  loop, no game state — that starts in A-2.
- `asteroids/src/core/` and `asteroids/src/shell/` — created now (per the
  epic's hard core/shell boundary) but left empty or with a single placeholder
  file; real modules (`state.ts`, `sim.ts`, `rng.ts`, `render.ts`, …) are A-2+.
- `asteroids/tests/` — empty directory is fine; `npm test` uses
  `--passWithNoTests` so an empty suite is a valid green run.

**4. Orchestrator wiring (four integration points)**
- **`.gitignore`** (orchestrator root) — add `asteroids` to the list already
  containing `tempest`, `lobby`, `star-wars`.
- **`.pennyfarthing/repos.yaml`** — add an `asteroids:` entry copying the
  `star-wars:` entry shape: `path: asteroids`, `type: ui`,
  `default_branch: develop`, `branch_strategy: gitflow`, `language: typescript`,
  `languages: [typescript]`, `framework: vite`, `dev_command: npm run dev`,
  `build_command: npm run build`, `test_command: npm test`, plus a
  `description`/`notes` pair identifying it as the fourth subrepo (1979
  Asteroids, gitignored, own git history, origin
  `github.com/slabgorb/asteroids` once created).
- **`justfile`** — two edits:
  - `games := "tempest"` → `games := "tempest asteroids"` (star-wars is
    intentionally absent from `games`/`test-all`/`build-all` today — match
    that existing convention rather than "fixing" it in this story; don't
    silently add star-wars too).
  - `subrepos := "lobby tempest"` → add `asteroids` (star-wars is *not* in
    `subrepos` either, which looks like a pre-existing gap — the `serve`
    recipe's `trap`/`&`/`wait` block already runs star-wars by name directly,
    bypassing the `subrepos` var. Add an `(cd {{root}}/asteroids && npm run
    dev) &` line to `serve` alongside the tempest/star-wars lines, and echo
    `asteroids → http://localhost:5275/asteroids/` in the startup banner. If
    `install-all`'s use of `{{subrepos}}` is meant to cover every servable
    repo, flag the star-wars gap to the team rather than silently fixing scope
    beyond this story — but *do* make sure asteroids is covered one way or
    the other (either var).
- **`lobby/src/core/registry.ts`** — add a `Game` entry to the `GAMES` array:
  `{ id: 'asteroids', title: 'ASTEROIDS', launchUrl: '/asteroids/', color:
  '<pick an unused glow hex>' }` (tempest is `#00eaff`, star-wars is
  `#ffe81f` — pick a third distinct hue, e.g. `#ff6a00`). `lobby/src/main.ts`
  needs no change; it already renders every entry in `GAMES`.
- **`cloudflared/config.yml`** and **`cloudflared/README.md`** — add an
  `/asteroids/*` → `:5275` ingress rule to the checked-in reference, using the
  same shape as the `star-wars` block (`path: ^/asteroids`, `service:
  http://localhost:5275`, same `originRequest` timeouts), placed *before* the
  lobby catch-all rule (first-match-wins ordering). Update the README's
  routing table and the "regression guarded against" ordering note to mention
  asteroids. Per the README, the live apply (splicing into
  `~/.cloudflared/config.yml` and restarting the tunnel) is a separate manual
  step outside this repo — this story only needs the checked-in reference
  updated and documented; do not touch the live host file as part of the
  commit.

**5. Initial commit**
- Stage the asteroids scaffold inside `asteroids/` and commit on `develop`
  (e.g. `chore(A-1): scaffold asteroids subrepo`), then commit the
  orchestrator wiring changes at the orchestrator root per normal trunk-based
  workflow.

## Scope
- **In scope:** everything in Technical Approach — asteroids subrepo init
  (gitflow, develop branch), toolchain copy with the three vite.config.ts
  substitutions, minimal `main.ts` canvas bootstrap, empty `core/`/`shell/`
  dirs, `.gitignore` (both repos), `repos.yaml` registration, `justfile`
  wiring, lobby tile, cloudflared ingress rule + README update.
- **Out of scope:** any game simulation logic, `GameState`/`stepGame`/RNG/
  input handling (A-2), real ship/rock/saucer shapes or gameplay, sound,
  `reference/` quarry population or porting (A-17), high scores wiring beyond
  what the lobby tile already does generically, pushing a remote to GitHub
  (repo doesn't exist yet — local `develop` with initial commit is sufficient),
  applying the cloudflared change to the live `~/.cloudflared/config.yml` or
  restarting the tunnel.

## Acceptance Criteria
- `asteroids/` exists as its own git repo on branch `develop` with an initial
  commit containing the scaffold.
- `just install-all` (from orchestrator root) installs asteroids' dependencies
  without error.
- `just serve` (from orchestrator root) serves lobby + tempest + star-wars +
  asteroids concurrently; `http://localhost:5275/asteroids/` loads a black
  canvas with a visible placeholder vector shape.
- Starting a second `asteroids` dev server on `:5275` fails loudly
  (`strictPort: true`), not a silent port hop.
- Inside `asteroids/`: `npm run build` completes clean (`tsc --noEmit && vite
  build`) and `npm test` passes (green with `--passWithNoTests` on an empty
  suite is acceptable).
- The lobby (`http://localhost:5270/lobby/`) shows an "ASTEROIDS" tile that
  links to `/asteroids/`.
- `.pennyfarthing/repos.yaml` has an `asteroids` entry with
  `default_branch: develop` and `branch_strategy: gitflow`, matching the
  star-wars entry shape.
- `cloudflared/config.yml` has an `/asteroids/*` → `:5275` ingress rule ahead
  of the lobby catch-all, and `cloudflared/README.md`'s routing table and
  ordering notes mention it.
- Orchestrator `.gitignore` includes `asteroids`.

---
_Generated by `pf context create story A-1` from the sprint YAML._
_Enriched by Architect (Goldstein): problem, technical approach, scope, and acceptance criteria filled in from the epic context, the star-wars blueprint, and verified orchestrator wiring points (justfile, repos.yaml, lobby registry, cloudflared)._
