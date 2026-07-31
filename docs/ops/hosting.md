# Arcade hosting & releases — runbook

The arcade is static files on Cloudflare R2. No servers, no tunnel, no backend.
This is the operator's map: how it's wired, how to ship, how to fix it at 2am.

Rewritten 2026-07-31 for the 2026-07-30 monorepo collapse. Nine repos are one repo, eight
buckets are one bucket, and a push to `main` no longer deploys anything — a **tag**
does. Provenance for the collapse itself: [`migration-manifest.md`](./migration-manifest.md).

## Architecture

- Every app builds through the one builder, `node scripts/build-app.mjs <id>`:
  the **lobby** to `dist/` at Vite base `/`, each **game** to `dist/<id>/` at Vite
  base `/<id>/`.
- Every app is uploaded into **one public R2 bucket, `arcade-lobby`**, fronted by the
  custom domain `arcade.slabgorb.com` (Cloudflare account
  `a55aafa9b0691f828cd6864be28c1674`, zone `slabgorb.com`). The lobby owns the
  bucket's **root keys** — that is what makes it the front door at `/` — and each game
  owns its own **`<id>/` key prefix**:

| App        | Path on the single origin                 | Key prefix in `arcade-lobby` |
|------------|-------------------------------------------|------------------------------|
| lobby      | `https://arcade.slabgorb.com/`            | *(root)*                     |
| tempest    | `https://arcade.slabgorb.com/tempest/`    | `tempest/`                   |
| star-wars  | `https://arcade.slabgorb.com/star-wars/`  | `star-wars/`                 |
| asteroids  | `https://arcade.slabgorb.com/asteroids/`  | `asteroids/`                 |
| battlezone | `https://arcade.slabgorb.com/battlezone/` | `battlezone/`                |
| red-baron  | `https://arcade.slabgorb.com/red-baron/`  | `red-baron/`                 |
| centipede  | `https://arcade.slabgorb.com/centipede/`  | `centipede/`                 |
| joust      | `https://arcade.slabgorb.com/joust/`      | `joust/`                     |

- **One origin, so no Origin Rules and no Worker.** R2 custom domains are strictly one
  hostname : one bucket, and path→*multi-bucket* routing would need Enterprise-only
  Origin Rules. Path→*key-prefix* inside a single bucket needs neither. That is the
  correction ADR-0004's cost estimate got wrong; see its 2026-07-30 amendment.
- One origin also means the lobby and every game share `localStorage` again, which is
  what retires the cross-origin high-score cookie ADR-0004 introduced.
- Uploads go through `scripts/deploy-r2.mjs <dist dir> <bucket> [key prefix]`, which
  sets an explicit `--content-type` per file — wrangler does not auto-detect, and a
  wrong type ships a broken site. It only ever `put`s, one object at a time, and never
  lists, deletes or prunes, so two apps deploying at once cannot collide (their key
  prefixes are disjoint).
- The Cloudflare tunnel that used to serve the arcade is **retired**;
  [`cloudflared/`](../../cloudflared/) is historical.

### The `index.html` rewrite rule — the one piece that had to grow

R2 serves objects by **exact key**, so a bare directory path resolves only because a
zone-level URL-rewrite rule (`arcade index.html for directory paths`) appends
`index.html` to `/`-terminated paths. **That rule was written when the only directory
path was the lobby's root.** Nested paths (`/tempest/`) are new with this migration.

Symptom if it does not cover them: `/tempest/` returns `404` while
`/tempest/index.html` returns `200`. Diagnose with exactly that pair —

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://arcade.slabgorb.com/tempest/
curl -s -o /dev/null -w '%{http_code}\n' https://arcade.slabgorb.com/tempest/index.html
```

— and fix it in Cloudflare (extend the rule to nested directory paths), never with a
client-side fallback: a fallback would paper over a routing bug affecting every game
at once.

### The bucket inventory — verified against the account, not against docs

Taken from the Cloudflare account during the migration and recorded in
[`migration-manifest.md`](./migration-manifest.md). The previous edition of this file
listed six buckets (it had red-baron but was missing centipede and joust) and the
lobby's old hardcoded registry listed a different six. **Both were wrong.** All eight
app buckets exist and all eight custom domains are active; `arcade-joust` was created
2026-07-26.

| Bucket | Custom domain | Role after the migration |
|---|---|---|
| `arcade-lobby` | `arcade.slabgorb.com` | **the cabinet** — every app ships here |
| `arcade-tempest` | `tempest.slabgorb.com` | redirect, then delete |
| `arcade-star-wars` | `star-wars.slabgorb.com` | redirect, then delete |
| `arcade-asteroids` | `asteroids.slabgorb.com` | redirect, then delete |
| `arcade-battlezone` | `battlezone.slabgorb.com` | redirect, then delete |
| `arcade-red-baron` | `red-baron.slabgorb.com` | redirect, then delete |
| `arcade-centipede` | `centipede.slabgorb.com` | redirect, then delete |
| `arcade-joust` | `joust.slabgorb.com` | redirect, then delete |
| `arcade` | `arcade-assets.slabgorb.com` | **assets — untouched** (see below) |

Other buckets in the same account (`pennyfarthing`, `sidequest`, `slabgorb`) are not
part of the arcade. Do not touch them.

### The old hostnames become Single Redirects

Each retired game hostname is unbound from its bucket and replaced by a **Single
Redirect** rule on the zone — free tier, no Worker, no Enterprise feature:

- **When:** `http.host eq "tempest.slabgorb.com"`
- **Then:** dynamic redirect → `concat("https://arcade.slabgorb.com/tempest", http.request.uri.path)`,
  status **301**, preserve query string.

A proxied DNS record for the hostname must exist for the rule to run; a DNS record
alone cannot produce a path redirect. `arcade.slabgorb.com` itself stays bound to
`arcade-lobby` and must **not** be touched.

Preserve the original query string and add nothing to it: ADR-0004 records that
Safari's ITP 2.3 caps cookies to 24 hours when a page is reached via tracker-style
link decoration, and the one-time high-score bridge reads that cookie.

> **Status when this was written (2026-07-31): the unbind-and-redirect step had NOT
> been taken.** It is the human owner's, not an agent's. Until it happens the seven
> game hostnames still serve their own pre-migration buckets, and re-binding a custom
> domain is the whole of the rollback. Verify before assuming either way:
>
> ```bash
> for g in tempest star-wars asteroids battlezone red-baron centipede joust; do
>   printf '%-12s %s\n' "$g" "$(curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}' "https://$g.slabgorb.com/")"
> done
> ```
>
> `200` = still its own bucket. `301 -> https://arcade.slabgorb.com/<g>/` = cut over.

## Shipping: a TAG is production

`.github/workflows/deploy.yml` is **one** workflow for the whole cabinet, triggered by
a tag matching `*-v*` and **never by a push to a branch**. `main` carries every app's
commits now, so a branch trigger could not say which app to ship — it would redeploy
all eight on every commit.

The workflow parses the app id back out of the tag (`${tag%-v*}`, which splits at the
LAST `-v` so `star-wars-v0.0.33` → `star-wars`), rejects anything that is not
`<app>-vX.Y.Z`, and then runs:

`checkout (fetch-depth: 0)` → resolve app → `npm ci` → `npm run lint` →
`npm run test:orchestrator` → `npx vitest run --project <app>` → `build-app.mjs <app>`
→ upload `dist/<app>/` (or `dist/` for the lobby) to `arcade-lobby` under the app's key
prefix.

**A red run uploads nothing** — the bucket keeps serving the last good build.

- **`fetch-depth: 0` is required, not tidiness.** tempest's and red-baron's ROM
  citation gates verify each finding against the code *as it was audited*, reading
  blobs out of the audited commit (`git show <AUDIT_COMMIT>:<path>`, preserved as the
  `audit/*` tags). Under `actions/checkout`'s default `fetch-depth: 1` those objects
  are not in the clone at all, so the gates fail and block the deploy of a perfectly
  good build. Confirmed under CI's own invocation: `--project tempest citations` → 25
  passed, `--project red-baron citation` → 48 passed.
- **`npm run lint` is the only type check anywhere in the release or deploy path.**
  `just release` gates on `vitest run --project <id>` plus `build-app.mjs <id>`, and
  vite transpiles through esbuild without checking types. It cannot be scoped per app
  (one root `tsconfig.json` covers `src`, `plugins`, `lobby` and `scripts`), so a type
  error anywhere blocks every app's deploy.
- **Every tag gets its own concurrency group** (`deploy-${{ github.ref_name }}`). It
  must not become one shared group: a group holds exactly ONE pending run, so eight
  tags from `just release-all` would queue, cancel each other, and vanish *silently* —
  the runs read as cancelled rather than failed. Concurrent uploads are safe here
  because the key prefixes are disjoint.

The normal path to a tag is a release, from the repo root:

```bash
just release <app> [patch|minor|major]   # default patch
just release-all [level]                 # every app; games first, lobby LAST
```

`scripts/release.mjs`: preflight (clean tree, on `main`, in sync with origin) → gate
(that app's vitest project + its build, locally) → version bump in
`plugins/<app>/package.json` (or `lobby/package.json`) **plus** the regenerated
`src/host/registry.ts`, in one commit → annotated tag `<app>-vX.Y.Z` → push. The tag
always points at exactly the commit CI deploys.

`release-all` ships the lobby **last** on purpose: each game's bump is baked into the
generated registry, and the lobby's tiles read their versions from there, so one lobby
release at the end carries every accumulated tile bump.

**Manual fallback** (bypasses the tag and CI — the only way prod can diverge from a
release):

```bash
just deploy              # build + upload every app from this checkout
just deploy-one <app>    # one app (`lobby` included)
```

## Failure modes

| Symptom | What happened | Fix |
|---------|---------------|-----|
| Release aborts in preflight | dirty tree / not on `main` / out of sync with origin | commit-stash / checkout / pull, re-run |
| Release aborts in gate | that app's tests or build failed | fix the app, re-run — nothing was pushed |
| `release-all` stops mid-fleet | one app failed its preflight/gate | fix it, then release the **remaining** apps individually (`just release <app>`) — re-running `release-all` would bump the already-released ones again |
| Tagged and pushed, but **no Actions run at all** | the tag missed the `*-v*` glob — most likely a bare `vX.Y.Z`, which is invalid in the monorepo | delete the bad tag, re-run `just release <app>`; silence is always a tag-shape problem, never a build one |
| Run starts, then `tag '…' is not <app>-vX.Y.Z` | the tag matched the loose glob but failed the strict check (e.g. `tempest-v1.0`) | same — the loose glob exists precisely so this fails **loudly** instead of silently |
| Run fails at `Resolve the app from the tag` with `no such app` | the id in the tag is not `lobby` and not a `plugins/` directory | check the id; the workflow reads the filesystem, so a new game is deployable the moment its directory exists |
| CI red at `npm run lint` for an unrelated app | one repo-wide type check; a type error anywhere blocks every app | fix the type error — this is the gate working, not misfiring |
| CI green locally, red on CI at the app's tests | GitHub runners are slower; a CPU-bound test blew vitest's 5s default timeout (tempest, v0.0.1) | scope a per-test timeout (`{ timeout: 30_000 }`), commit, release again |
| CI red at a citation gate that passes locally | the checkout lost `fetch-depth: 0`, so the `audit/*` blobs are not in the clone | restore `fetch-depth: 0` in `deploy.yml` |
| CI red at "Upload to R2" with an auth error | `CLOUDFLARE_API_TOKEN` missing/expired **on `slabgorb/arcade`** (see Secrets) | rotate in the Cloudflare dashboard, re-set the secret from a file or a pipe |
| `/<id>/` 404s but `/<id>/index.html` works | the zone's directory-index rewrite rule does not cover nested paths | extend the rule in Cloudflare (see above) — never a client-side fallback |
| Site serves stale build after a green run | Cloudflare cache | check `cf-cache-status` / `last-modified`; purge zone cache if truly stale |
| Need to roll back one app | a bad release is live | check out the previous `<app>-vX.Y.Z` tag and `just deploy-one <app>` from it, then fix forward on `main` and release |

### The lobby showcase pane is blank or missing

The lobby frames each opted-in game live (`lobby/src/shell/showcase.ts`) at
`gamePath(id)` — `/<id>/` on the same origin. After 8 s of silence it writes that game
off and moves to the next, and if every game fails it **removes the pane entirely**:
an empty bordered box is indistinguishable from a game that happens to be dark.

A game serving a **broken build** still fires `load` and looks healthy from the lobby.
Since the origin collapse the parent *could* read the framed document, so this is now
a choice rather than a wall — liveness is checked out of band, because a real HTTP
status from outside the page beats a DOM heuristic inside it:

    just check-showcase

That recipe reads the game list from the generated `src/host/registry.ts` (not a
hand-kept list) and fails loudly if it can read no list at all, rather than exiting 0
having probed nothing. It probes the old per-game subdomains by default; after the
cutover, run it against the single origin:

    ARCADE_ORIGIN=https://arcade.slabgorb.com just check-showcase

Which games appear is `showcase: true` in that game's `plugins/<id>/plugin.ts` manifest
— not a config, a per-game product decision that flips as each game's self-play demo
lands.

## Game assets: the `arcade` bucket (served at `arcade-assets.slabgorb.com`)

> **⚠ The bucket is called `arcade`, not `arcade-assets`.** Every *other* bucket
> matches its domain (`arcade-lobby` → arcade.slabgorb.com), so this one is the
> exception — and `wrangler` answers a wrong guess with the gloriously unhelpful
> *"The specified bucket does not exist."* There is no bucket named `arcade-assets`;
> the hostname is a custom domain on plain `arcade`.

Sound is **not** shipped in an app's build. The SFX, speech and music live in that
separate public bucket under a per-game prefix:

| Prefix | What | Baked by |
|--------|------|----------|
| `star-wars/sfx/` | POKEY sound effects | `plugins/star-wars/tools/pokey-bake/bake-sfx.mjs` |
| `star-wars/speech/` | TMS5220 LPC speech | `plugins/star-wars/tools/speech-bake/bake-speech.mjs` |
| `star-wars/music/` | POKEY music (sw6-1) | `plugins/star-wars/tools/music-bake/bake-music.mjs` |

**CI does not touch this bucket.** The deploy workflow uploads each app's build and
nothing else, so it is populated by hand:

```bash
just deploy-assets     # bake star-wars music + sfx and upload them
```

> **This gap has already cost us a whole epic.** sw3-5 built the entire music path —
> core `MusicEvent` → `startLoop` → the shared audio module's music channel — and
> pointed it at four `.wav` files that were never produced. The engine's contract is
> *silent degrade at every failure path*, so four 404s were indistinguishable from
> working code: no console error, no crash, just a quiet game. Nothing in CI could see
> it, because CI never looks at this bucket.
>
> So when you add an asset, **the acceptance test is a live 200, not a green test
> run**:
>
> ```bash
> curl -sI https://arcade-assets.slabgorb.com/star-wars/music/space_theme.wav | head -1
> ```
>
> and the filenames must agree with the game's manifest
> (`plugins/star-wars/src/shell/audio.ts`). A name mismatch is a 404, and a 404 is
> silence.

## Secrets

**One secret, on one repo:** `CLOUDFLARE_API_TOKEN` (an R2-edit token, created in the
Cloudflare dashboard) on `slabgorb/arcade`. The account id is not a secret and is
baked into the workflow.

This moved with the collapse and is easy to get wrong. The retired `deploy-r2.yml` was
a **reusable** workflow, so the token was always supplied by the *calling* game repo;
`slabgorb/arcade` never needed one. The new `deploy.yml` runs *in* `slabgorb/arcade`,
so the secret has to live there now. **Measured 2026-07-31: `gh secret list -R
slabgorb/arcade` prints nothing — the orchestrator repo has zero Actions secrets.**
Until it is set, a release tags and pushes successfully and *then* the deploy job
fails, leaving a released tag that shipped nothing.

```bash
# NEVER by typing at a prompt: `gh secret set` reading EOF stores a BLANK value —
# the exact bug that kept joust from shipping for weeks. Pipe it or read a file.
printf %s "$CLOUDFLARE_API_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN -R slabgorb/arcade
```

The workflow refuses to run the upload with an empty token rather than authenticating
as nobody (wrangler's own error for a blank token does not say that), and
`tests/monorepo-topology.test.mjs` pins that guard.

## Adding a new game

No bucket, no domain, no DNS, no per-repo secret, no CI caller — the whole of it is
in-repo now.

1. Create `plugins/<name>/` with a `plugin.ts` manifest and an `index.html`; the game
   builds at Vite base `/<name>/` through the shared `vite.config.ts` factory.
2. Add the id to `games` in the `justfile` and to `GAMES` in `vitest.config.ts`, then
   `npm run gen:registry` to regenerate the committed `src/host/registry.ts`.
   `scripts/build-app.mjs` and `deploy.yml` read the `plugins/` directory itself.
3. `just release <name>` — the tag deploys it into `arcade-lobby` under `<name>/`, and
   it is live at `https://arcade.slabgorb.com/<name>/`.

## History

Design + implementation records: the monorepo collapse
(`docs/superpowers/specs/2026-07-30-arcade-plugin-host-design.md`), the original R2
migration (`docs/superpowers/specs/2026-07-09-arcade-r2-static-hosting-design.md`) and
release automation
(`docs/superpowers/specs/2026-07-10-arcade-release-automation-design.md`), each with a
matching plan under `docs/superpowers/plans/`. Per-tree provenance for the collapse is
[`migration-manifest.md`](./migration-manifest.md).
