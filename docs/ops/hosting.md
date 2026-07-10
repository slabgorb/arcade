# Arcade hosting & releases — runbook

The arcade is static files on Cloudflare R2. No servers, no tunnel, no backend.
This is the operator's map: how it's wired, how to ship, how to fix it at 2am.

## Architecture

- Each app builds (`npm run build`) to a self-contained `dist/` at Vite base `/`.
- Each `dist/` is uploaded to a **public R2 bucket** named `arcade-<name>`,
  fronted by a custom domain (Cloudflare account `a55aafa9b0691f828cd6864be28c1674`,
  zone `slabgorb.com`):

| App        | Domain                    | Bucket            |
|------------|---------------------------|-------------------|
| lobby      | `arcade.slabgorb.com`     | `arcade-lobby`    |
| tempest    | `tempest.slabgorb.com`    | `arcade-tempest`  |
| star-wars  | `star-wars.slabgorb.com`  | `arcade-star-wars`|
| asteroids  | `asteroids.slabgorb.com`  | `arcade-asteroids`|
| battlezone | `battlezone.slabgorb.com` | `arcade-battlezone`|
| red-baron  | `red-baron.slabgorb.com`  | `arcade-red-baron`|

- R2 serves objects by **exact key**, so a zone-level URL-rewrite rule
  (`arcade index.html for directory paths`) appends `index.html` to
  `/`-terminated paths.
- Uploads go through `scripts/deploy-r2.mjs`, which sets an explicit
  `--content-type` per file — wrangler does not auto-detect, and a wrong type
  ships a broken site.
- The Cloudflare tunnel that used to serve the arcade is **retired**;
  [`cloudflared/`](../../cloudflared/) is historical.

## Shipping: `main` is production

Every game repo has a ten-line `.github/workflows/deploy.yml` that fires on
push to `main` and calls the reusable workflow in this repo
(`.github/workflows/deploy-r2.yml`): checkout → `npm ci` → build → test →
upload `dist/` to the bucket. **A red run uploads nothing** — the bucket keeps
serving the last good build.

The normal path to `main` is a release, from the orchestrator root:

```bash
just release <name> [patch|minor|major]   # default patch
just release-all [level]                  # whole fleet; stops at first failure
```

`scripts/release.mjs` per repo: preflight (clean tree, on `develop`, in sync
with origin) → gate (`npm test` + `npm run build` locally) → version bump
committed to `develop` → merge `--no-ff` into `main` → annotated tag `vX.Y.Z`
on the merge commit → push. The tag always points at exactly the commit CI
deploys.

**Manual fallback** (bypasses `main` — the only way prod can diverge from it):

```bash
just deploy              # build + upload every app from this checkout
just deploy-one <name>   # one app
```

## Failure modes

| Symptom | What happened | Fix |
|---------|---------------|-----|
| Release aborts in preflight | dirty tree / not on `develop` / out of sync with origin | commit-stash / checkout / pull, re-run |
| Release aborts in gate | the game's own tests or build failed | fix the game, re-run — nothing was pushed |
| `release-all` stops mid-fleet | one repo failed its preflight/gate | fix that repo, then release the **remaining** repos individually (`just release <name>`) — re-running `release-all` would bump the already-released ones again |
| CI green locally, red on `main` at `npm test` | GitHub runners are slower; a CPU-bound test blew vitest's 5s default timeout (tempest, v0.0.1) | scope a per-test timeout (tempest fix: `{ timeout: 30_000 }`), merge via PR to `develop`, release again |
| CI red at "Deploy dist/ to R2" | `CLOUDFLARE_API_TOKEN` secret missing/expired in that repo | rotate in Cloudflare dashboard → `gh secret set CLOUDFLARE_API_TOKEN -R slabgorb/<name>` |
| Site serves stale build after green run | Cloudflare cache | check `cf-cache-status` / `last-modified` headers; purge zone cache if truly stale |
| Need to roll back | `main` has a bad release | check out the previous tag, `just deploy-one <name>` from it, then fix forward on `develop` and release |

## Secrets

One secret per game repo: `CLOUDFLARE_API_TOKEN` (R2-edit token, created in the
Cloudflare dashboard). Account ID is not a secret and is baked into the
reusable workflow. To rotate: create the new token, then for each repo
`gh secret set CLOUDFLARE_API_TOKEN -R slabgorb/<name>`.

## Adding a new game

1. Create the bucket (`arcade-<name>`), connect `<name>.slabgorb.com`, confirm
   the zone URL-rewrite rule's host list covers it.
2. Vite base `/`, `strictPort` with the next pinned port; register in
   `repos.yaml` and the justfile `subrepos` list.
3. Copy a sibling's `.github/workflows/deploy.yml`, change `bucket:` to
   `arcade-<name>`, commit to `develop`.
4. Set the `CLOUDFLARE_API_TOKEN` secret on the repo.
5. `just release <name>` — the first release creates `main` and deploys.

## History

Design + implementation records: R2 migration
(`docs/superpowers/specs/2026-07-09-arcade-r2-static-hosting-design.md`) and
release automation
(`docs/superpowers/specs/2026-07-10-arcade-release-automation-design.md`), each
with a matching plan under `docs/superpowers/plans/`.
