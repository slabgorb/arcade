# Story bz1-1 Context

## Title
Subrepo bootstrap: Vite/TS/Vitest scaffold, pinned port 5276, math3d port, repos.yaml + lobby tile

## Metadata
- **Story ID:** bz1-1
- **Type:** chore
- **Points:** 2
- **Priority:** p2
- **Workflow:** superpowers
- **Repo:** battlezone
- **Epic:** Battlezone (1980) — full faithful vector clone

## Problem
The `battlezone/` directory does not exist yet — this is the keystone bootstrap
story, same bootstrap wrinkle as epic A's A-1 (`sprint/context/context-epic-A.md`
is the freshest bootstrap precedent; star-wars is the direct architectural
blueprint). Nothing here is playable game logic: the job is to stand up the
subrepo (gitflow, `develop` default branch), scaffold TS strict + Vite 8 +
Vitest 4 on the pinned port **5276** (the next free pin — 5275 belongs to
asteroids/epic A, do not reintroduce it), wire it into every place the
orchestrator tracks subrepos (`.gitignore`, `.pennyfarthing/repos.yaml`,
`justfile` serve/install/build/test, the lobby tile, the cloudflared ingress),
and port the Math Box (`star-wars/src/core/math3d.ts` plus its two test
suites) into `battlezone/src/core/` unchanged, per the epic's "port, don't
share" ruling. A minimal `index.html` + `src/main.ts` booting a black canvas
is sufficient gameplay for this story — first pixels, dual-tread steering,
and everything else start at bz1-3/bz1-4.

## Technical Approach
1. `git init` the `battlezone/` subrepo at the orchestrator root: default
   branch `develop`, gitflow branch strategy. A GitHub remote
   (`github.com/slabgorb/battlezone`) can be created when the team is ready to
   push — per the epic wording ("remote ... when created") this does not gate
   the story; the local repo with `develop` checked out does.
2. Add `battlezone` to the orchestrator's `.gitignore`, alongside the existing
   `tempest` / `lobby` / `star-wars` entries.
3. Register `battlezone` in `.pennyfarthing/repos.yaml`, copying the
   **star-wars** entry shape verbatim in structure: `path: battlezone`,
   `type: ui`, `default_branch: develop`, `branch_strategy: gitflow`,
   `language`/`languages: typescript`, `framework: vite`, `dev_command`,
   `build_command`, `test_command`, plus a Battlezone-specific
   `description`/`notes` (first-person tank duel on a flat plain; `src/core`
   holds the deterministic sim + the ported Math Box; `src/shell` holds
   render/input/loop/audio).
4. Scaffold TypeScript strict + Vite 8 + Vitest 4: `package.json` `scripts`
   copied **verbatim** from star-wars — `dev`, `build: tsc --noEmit && vite
   build`, `preview: vite preview`, `test: vitest run --passWithNoTests`,
   `test:watch: vitest`, `lint: tsc --noEmit` — and a `tsconfig.json` mirroring
   star-wars's strict settings.
5. `vite.config.ts` mirrors `star-wars/vite.config.ts` with three
   substitutions: `base: '/battlezone/'`, `server.port: 5276`,
   `preview.port: 5276`. Keep `strictPort: true` and `allowedHosts:
   ['arcade.slabgorb.com']` on **both** `server` and `preview`. Skip
   star-wars's multi-page `rollupOptions.input` (game + `models.html` contact
   sheet) — battlezone has no contact sheet yet; add one only if/when a later
   story needs it.
6. Minimal `index.html` + `src/main.ts` that boots a canvas and paints it
   black — no game loop, render pipeline, or audio wiring yet; that's bz1-3+.
7. Port `star-wars/src/core/math3d.ts` into `battlezone/src/core/math3d.ts`
   **unchanged**, plus both of its test suites
   (`tests/core/math3d.test.ts`, `tests/core/math3d.camera-mvp.test.ts`) into
   `battlezone/tests/core/` unchanged — same assertions, only the relative
   import path may need adjusting if directory depth differs. Add a
   provenance header comment: ported from `star-wars/src/core/math3d.ts` per
   the epic's Math Box ruling ("port, don't share" — no shared library
   extraction in this story; divergence later is evidence for a future
   extraction story, not a defect).
8. Wire `just serve` + `just install-all`: add `battlezone` to the
   `games`/`subrepos` lists and the `serve` recipe's parallel dev-server
   block, the same way `star-wars` is wired there today. **Note:** as of this
   writing the justfile's `games`/`subrepos` variables still only list `"lobby
   tempest"` even though `star-wars` already runs inside the hardcoded `serve`
   trap block — don't just copy that drift forward; make `battlezone`
   consistent across `install-all`/`build-all`/`test-all` *and* `serve`, and
   flag the star-wars gap to Dev/TEA rather than silently leaving it.
9. Add the lobby tile: append a `Game` entry to
   `lobby/src/core/registry.ts`'s `GAMES` array — `id: 'battlezone'`,
   `title: 'BATTLEZONE'`, `launchUrl: '/battlezone/'`, and a green-family
   `color` hex distinct from the existing cyan (tempest) / yellow (star-wars)
   tiles (exact hex is Dev's call — epic's palette note is "green wireframe").
10. Add the cloudflared ingress: a `/battlezone/*` → `:5276` rule in the
    checked-in `cloudflared/config.yml`, ordered **ahead of** the lobby
    catch-all, matching the existing `/tempest/*` / `/star-wars/*` rules —
    per `cloudflared/README.md`. Splicing this into the live, shared
    `~/.cloudflared/config.yml` and restarting the tunnel is a separate,
    manual operator step described in that README; it is not gated on this
    story landing.

## Scope
- In scope: `git init` + gitflow branch setup for `battlezone/`; orchestrator
  `.gitignore` entry; `.pennyfarthing/repos.yaml` registration; TS/Vite/Vitest
  scaffold (`package.json`, `tsconfig.json`, `vite.config.ts`); minimal
  `index.html`/`src/main.ts` black-canvas boot; porting `math3d.ts` and its
  two test suites unchanged with a provenance header; `justfile` wiring
  (`serve`, `install-all`, and the `games`/`subrepos` lists); the lobby tile;
  the checked-in `cloudflared/config.yml` ingress rule for port 5276.
- Out of scope: any actual gameplay code (`state.ts`, `sim.ts`, `input.ts`,
  `models.ts`, `obstacles.ts`, `radar.ts` — bz1-3 onward); the `reference/`
  disassembly quarry and its findings doc (bz1-2); any divergence of the
  ported `math3d.ts` from the star-wars original (a future extraction story's
  concern, not this one); audio, HUD/framing, cracked-glass viewport; creating
  the GitHub remote/pushing; applying the ingress change to the **live**
  `~/.cloudflared/config.yml` or restarting the tunnel (manual operator step,
  separate from this story's checked-in-file AC).

## Acceptance Criteria
- `just serve` starts `battlezone` alongside `lobby`/`tempest`/`star-wars`,
  and `http://localhost:5276/battlezone/` serves a black canvas with no
  console errors and no port collision (5270/5273/5274/5275 untouched).
- `cd battlezone && npm test` is green, including the two ported math3d
  suites (`math3d.test.ts`, `math3d.camera-mvp.test.ts`) passing unchanged.
- `cd battlezone && npm run build` completes clean (`tsc --noEmit && vite
  build`).
- The Battlezone tile renders on the lobby (`http://localhost:5270/lobby/`)
  and launching it navigates to `/battlezone/`.
- `battlezone/` is present in the orchestrator `.gitignore`, registered in
  `.pennyfarthing/repos.yaml` in the star-wars entry shape with port **5276**
  (not 5275), and `battlezone/.git` exists with `develop` as the current
  branch.
- `justfile`'s `install-all`/`build-all`/`test-all` and `serve` recipes all
  include `battlezone` consistently (verified against, and reconciled with,
  however `star-wars` is currently wired there).
- The checked-in `cloudflared/config.yml` contains a `/battlezone/*` →
  `:5276` ingress rule ordered ahead of the lobby catch-all, per
  `cloudflared/README.md`'s existing pattern.

---
_Generated by `pf context create story bz1-1` from the sprint YAML._
_Enriched by Architect (Maude) via story-context subagent._
