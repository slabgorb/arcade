# Arcade release automation — design

**Date:** 2026-07-10
**Status:** Approved
**Follows:** `2026-07-09-arcade-r2-static-hosting-design.md` (the cabinet is live on R2:
`arcade.slabgorb.com` = lobby, `<game>.slabgorb.com` per game, buckets `arcade-<name>`)

## Goal

Make shipping a game a one-command, repeatable act, and make merges to `main`
deploy themselves. Two deliverables:

1. **Release script** — merge a game's `develop` into `main` with a semver tag,
   gated on tests + build.
2. **CI deploy job** — GitHub Actions uploads the built `dist/` to the game's R2
   bucket automatically on every push to `main`.

After this, `main` **is** production: what's on `main` is what R2 serves.

## Current state

- Six servable subrepos: `lobby tempest star-wars asteroids battlezone red-baron`,
  all public on GitHub under `slabgorb/`, default branch `develop`.
- Only `tempest` and `star-wars` have a `main` branch on the remote; the other
  four get one created by their first release.
- Every `package.json` version is `0.0.0` — versioning starts here.
- Deploy logic exists once, in the orchestrator: `scripts/deploy-r2.mjs`
  (wrangler per-object put with explicit content-types) driven by
  `just deploy` / `just deploy-one`. No subrepo has any GitHub workflow yet.

## Decisions

| Decision | Choice |
|----------|--------|
| Tag scheme | semver bump via `npm version <level>`, default `patch`; tags `vX.Y.Z` |
| CI sharing | one reusable (`workflow_call`) workflow in `slabgorb/arcade`; each game repo carries a ~10-line caller |
| Deploy trigger | push to `main` (the release merge), not tags |
| Account ID | `a55aafa9b0691f828cd6864be28c1674` — not secret, baked into the reusable workflow env |
| Per-repo secret | `CLOUDFLARE_API_TOKEN` only (R2 edit token, set once per repo) |

## 1. Release script — `scripts/release.mjs` + just recipes

**Interface:**

```bash
just release <name> [level]      # level ∈ patch|minor|major, default patch
just release-all [level]         # loop over all six subrepos
# under the hood:
node scripts/release.mjs <name> [level]
```

**Steps for one repo (`<root>/<name>`):**

1. **Preflight** — abort with a clear message unless: working tree clean,
   current branch is `develop`, and after `git fetch origin` local `develop`
   is exactly `origin/develop` (push or pull first if not).
2. **Gate (release-ready)** — `npm test` and `npm run build` must pass.
   Nothing is pushed if they don't.
3. **Version** — `npm version <level> --no-git-tag-version`; commit
   `package.json` (+ lockfile) as `chore(release): vX.Y.Z`; push `develop`.
4. **Merge** — check out `main`: `git checkout -B main origin/main` when the
   remote branch exists, else `git checkout -b main` (first release — `main`
   born from `develop`). Then `git merge --no-ff develop -m "release: vX.Y.Z"`.
   On conflict: `git merge --abort`, return to `develop`, exit non-zero.
   (`main` never takes direct commits, so conflicts should not occur.)
5. **Tag + push** — abort if tag `vX.Y.Z` already exists; annotated tag on the
   `main` merge commit; `git push -u origin main vX.Y.Z`; check out `develop`.

The tag points at the exact commit the push-to-`main` event deploys.

**Structure:** a pure, unit-testable planner (given `{name, version, level,
mainExistsOnRemote}` returns the ordered command plan) plus a thin executor
that shells out. Test lives with the existing `tests/deploy-r2.test.mjs`.

## 2. Reusable CI workflow — `slabgorb/arcade:.github/workflows/deploy-r2.yml`

`workflow_call` with input `bucket` (required string) and secret
`CLOUDFLARE_API_TOKEN` (required). One job on `ubuntu-latest`:

1. `actions/checkout@v4` — checks out the **caller** repo (the game).
2. `actions/setup-node@v4` — Node 22, npm cache.
3. `npm ci` → `npm run build` → `npm test` — a red build/test stops the job;
   R2 keeps serving the previous deploy.
4. `actions/checkout@v4` of `slabgorb/arcade` (sparse: `scripts/`) into
   `.arcade/` — the same `deploy-r2.mjs` local deploys use; one source of truth.
5. `npm install -g wrangler`, then
   `node .arcade/scripts/deploy-r2.mjs dist "${{ inputs.bucket }}"` with env
   `CLOUDFLARE_API_TOKEN` (secret) and `CLOUDFLARE_ACCOUNT_ID`
   (`a55aafa9b0691f828cd6864be28c1674`, in the clear).

`concurrency: deploy-r2-${{ github.repository }}` with
`cancel-in-progress: false` so overlapping merges queue instead of
interleaving uploads.

## 3. Caller workflow — one per game repo

`.github/workflows/deploy.yml` in each of the six repos:

```yaml
name: deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    uses: slabgorb/arcade/.github/workflows/deploy-r2.yml@main
    with:
      bucket: arcade-<name>
    secrets: inherit
```

Committed to each repo's `develop` as `chore(ci): deploy to R2 on merge to main`.
It rides the repo's first release onto `main`, where the `push` trigger becomes
active. Until then it is inert.

## 4. Secrets — one manual step

One Cloudflare API token with **R2 edit** permission (created in the Cloudflare
dashboard — local wrangler uses OAuth, so no existing token can be reused),
set on all six repos:

```bash
gh secret set CLOUDFLARE_API_TOKEN -R slabgorb/<repo>
```

Until the secret exists, a merge to `main` still runs build + test but the
deploy step fails visibly; `just deploy` / `just deploy-one` remain the manual
fallback (and stay useful for deploying without a release).

## Error handling

| Failure | Behaviour |
|---------|-----------|
| Dirty tree / wrong branch / develop out of sync | release aborts before any mutation |
| Tests or build fail locally | release aborts; nothing bumped, nothing pushed |
| Merge conflict on `main` | `merge --abort`, back to `develop`, non-zero exit |
| Tag already exists | abort before tagging |
| CI build/test fails on `main` | no upload; last good deploy keeps serving |
| Missing/invalid `CLOUDFLARE_API_TOKEN` | deploy step fails loudly in Actions |
| `release-all` mid-loop failure | stops at the failing repo; earlier repos are already released (each release is independent and re-runnable) |

## Testing

- Unit test for the release planner (pure function) alongside the deploy-r2
  tests; runs in `just test-orchestrator`.
- `just --list` parses (recipe syntax check).
- End-to-end proof: first real release of one game (`just release tempest`)
  and a green Actions run that redeploys `tempest.slabgorb.com`.

## Out of scope (YAGNI)

- GitHub Releases / changelogs — tags only.
- Orchestrator deploys — nothing of the orchestrator is served.
- Tag-triggered deploys — push to `main` is the single trigger.
- Rollback tooling — re-run `just deploy-one` from a checkout of the previous
  tag, or cut a new release.
- Shared-workflow versioning — callers pin `@main`; revisit if a workflow
  change ever needs to roll out gradually.
