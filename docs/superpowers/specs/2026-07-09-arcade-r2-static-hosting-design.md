# Arcade → R2 static hosting (subdomain-per-game)

**Date:** 2026-07-09
**Status:** Approved (brainstorming) — pending spec review, then implementation plan
**Owner:** DevOps

## Goal

Serve the whole arcade cabinet as static sites from Cloudflare R2 so it no
longer depends on a local `just serve` + Cloudflare tunnel running from a
canonical checkout. Today, if the host machine is off, the arcade is off. After
this change, the arcade is live entirely from R2; deploying is `just deploy`.

## Decisions (locked during brainstorming)

- **Full cutover to R2** — R2 is the production origin for every site. The
  tunnel + local `just serve` become dev-only conveniences (or retired).
- **Subdomain-per-game**, not path-per-host. DNS names on `slabgorb.com` are
  free to mint, so each game gets its own subdomain and builds at its domain
  root. This is the cleanest fit for R2 (one bucket → one custom domain, served
  at `/`), and removes the path-prefix juggling and root-redirect hack that a
  single-host layout would need.
- **Pure R2 custom domains + one zone URL-rewrite rule** (no Worker, no
  compute). R2 has **no** native index-document behavior — a custom-domain
  bucket serves objects by exact key, so a bare `/` request 404s (verified:
  wrangler has no static-hosting command; R2 docs describe object-by-key
  serving). A single Cloudflare Transform (URL Rewrite) rule appends
  `index.html` to directory/root requests, scoped to the arcade subdomains.
  That is the only shim needed; hashed `/assets/*` resolve by exact key already.
- **Front door keeps `arcade.slabgorb.com`**, now pointing at the lobby bucket.
- **All six at once** — no single-game pilot. (Rollout is still ordered; see
  "Rollout".)

## Current state (what we are replacing)

- Six servable static sites, one host, path-based:
  `arcade.slabgorb.com/lobby/`, `/tempest/`, `/star-wars/`, `/asteroids/`,
  `/battlezone/`, `/red-baron/`.
- `just serve` runs six Vite **dev** servers locally on pinned ports
  (5270–5277). The shared `sidequest` Cloudflare tunnel proxies
  `arcade.slabgorb.com` to those ports, path-based
  (`cloudflared/config.yml` is the checked-in reference).
- Each game's `vite.config.ts` has `base: '/<game>/'` and allow-lists
  `arcade.slabgorb.com` for the tunnelled Host header.
- The lobby lists games from `lobby/src/core/registry.ts`, each with a
  root-relative `launchUrl` (`/tempest/`, …) rendered as an `<a href>`.
- **Tempest SFX already live in R2**, absolute URL
  `https://arcade-assets.slabgorb.com/tempest/sfx/` (`tempest/src/shell/audio.ts`),
  bucket `arcade`. Unaffected by this migration.

## Target architecture

### Topology & naming

| Site | Public URL | R2 bucket |
|---|---|---|
| lobby (front door) | `arcade.slabgorb.com` | `arcade-lobby` |
| tempest | `tempest.slabgorb.com` | `arcade-tempest` |
| star-wars | `star-wars.slabgorb.com` | `arcade-star-wars` |
| asteroids | `asteroids.slabgorb.com` | `arcade-asteroids` |
| battlezone | `battlezone.slabgorb.com` | `arcade-battlezone` |
| red-baron | `red-baron.slabgorb.com` | `arcade-red-baron` |

- SFX stay at `arcade-assets.slabgorb.com` in the existing `arcade` bucket —
  **not** touched.
- Each game's subdomain equals its registry `id`/slug (`star-wars`, `red-baron`
  included — hyphenated subdomains are valid hostnames).

### Request flow (after cutover)

```
browser → https://tempest.slabgorb.com/            (Cloudflare edge, proxied DNS)
        → zone URL-rewrite rule: "/" ends with "/"  → rewrites path to /index.html
        → R2 bucket arcade-tempest serves index.html (exact key)
        → hashed assets under /assets/... resolve at the domain root (base '/')
        → SFX fetched cross-origin from arcade-assets.slabgorb.com (absolute URL)
```

## Component changes

### 1. Per-repo code changes (in the gitignored subrepos)

Each subrepo has its own git history; default branch `develop`, gitflow
(`chore/…` branch → PR → `develop`). Small changes:

- **Every game + lobby** `vite.config.ts`: `base: '/<game>/'` → `base: '/'`.
  Each site now lives at the root of its own subdomain, so its emitted asset
  URLs must resolve from `/`, not `/<game>/`. Remove the now-moot
  `allowedHosts: ['arcade.slabgorb.com']` (no tunnel forwarding a foreign Host
  header any more; harmless but dead).
  - Tempest's multi-page build (`index.html` + `models.html`) still works at
    root base — the `rollupOptions.input` map is unaffected.
  - Assets that read `import.meta.env.BASE_URL` (e.g. `font.ts`, tempest's
    `audio.ts` default base) now see `/` — correct for root serving.
- **lobby** `registry.ts`: change each game's `launchUrl` from `/<game>/` to the
  absolute subdomain URL, e.g. `https://tempest.slabgorb.com/`. One line each.
  The tile `<a href>` then points cross-subdomain. (The lobby's best-effort
  read of each game's high score via `localStorage` will now return `null`
  cross-origin and show "NO SCORE" — accepted; global high scores are a
  separate future feature, explicitly out of scope.)

### 2. R2 buckets + custom domains + directory-index rule (one-time)

R2 has **no** native static-site/index-document feature (verified: wrangler has
no such command; R2 custom domains serve objects by exact key). So instead of a
per-bucket static-hosting toggle, we use plain public buckets + one zone rule.

For each of the six new buckets:

1. `wrangler r2 bucket create <bucket>`.
2. `wrangler r2 bucket domain add <bucket> --domain <subdomain> --zone-id <zone>`
   to connect the custom domain. Because `slabgorb.com` is a Cloudflare zone,
   this provisions the proxied DNS record and edge TLS automatically. Allow a
   few minutes for the certificate to go active.

Then **one** Cloudflare Transform (URL Rewrite) rule for the whole cabinet, in
the `slabgorb.com` zone (dashboard: Rules → Transform Rules → URL Rewrite; the
wrangler token is zone-read only, so this is a dashboard step, not an API call):

- **When incoming requests match** (custom filter expression):
  `(http.host in {"arcade.slabgorb.com" "tempest.slabgorb.com" "star-wars.slabgorb.com" "asteroids.slabgorb.com" "battlezone.slabgorb.com" "red-baron.slabgorb.com"} and ends_with(http.request.uri.path, "/"))`
- **Then rewrite path to → Dynamic:** `concat(http.request.uri.path, "index.html")`

This turns `/` (and any `…/`) into `…/index.html`, which R2 serves by exact key.
Genuine misses fall back to R2's default 404 response (coarse — accepted).

### 3. Deploy automation — `just deploy`

New orchestrator recipe. Builds every site, then uploads each `dist/` to its
bucket. Deploying the whole cabinet becomes one command; no local server, no
tunnel.

- **Build:** reuse `build-all` (+ lobby build) → each subrepo emits `dist/`.
- **Upload:** loop over `find dist -type f` and `wrangler r2 object put
  <bucket>/<relpath> --file <path> --remote --content-type <mime>`. Uses the
  **existing wrangler auth** (same path the SFX went up) — **no new
  credentials.**
- **MIME map is mandatory.** `wrangler r2 object put` does not auto-detect
  content-type; the default breaks static hosting (`.html` downloads instead of
  rendering, `.js` fails to load as a module). The recipe sets `--content-type`
  per extension:

  | ext | content-type |
  |---|---|
  | `.html` | `text/html; charset=utf-8` |
  | `.js`, `.mjs` | `text/javascript; charset=utf-8` |
  | `.css` | `text/css; charset=utf-8` |
  | `.json`, `.map` | `application/json` |
  | `.svg` | `image/svg+xml` |
  | `.ttf` | `font/ttf` |
  | `.woff2` | `font/woff2` |
  | `.png` | `image/png` |
  | `.ico` | `image/x-icon` |
  | `.wav` | `audio/wav` |

  Unknown extensions fall back to `application/octet-stream` with a warning.

- **Orphans:** the put-loop never deletes, so stale hashed assets from old
  builds linger in the bucket. They are unreferenced (harmless) — and
  `index.html` has a stable key so it is always overwritten, meaning the live
  site never goes stale. Accepted for now; an R2 lifecycle rule or a
  wipe-before-deploy can prune later.
- **Scale-up option (documented, not adopted now):** `rclone sync` or
  `aws s3 sync` against R2's S3-compatible endpoint auto-detects MIME, deletes
  orphans, and is faster — at the cost of a one-time R2 S3 API token (Access Key
  ID + Secret). Adopt if the put-loop gets slow or the MIME map gets unwieldy.
  Sites are small (tens of files each), so the loop is fine to start.

### 4. Retire the tunnel + update orchestrator docs (last)

Only after all six subdomains are confirmed serving from R2:

- Splice the arcade ingress block **out** of `~/.cloudflared/config.yml`,
  keeping the `sidequest.slabgorb.com` routes intact. Validate with
  `cloudflared tunnel ingress validate`, then restart the tunnel (this briefly
  drops `sidequest.slabgorb.com` too — they share the tunnel).
- Update the checked-in `cloudflared/config.yml` + `README.md` to reflect that
  the arcade no longer routes through the tunnel (mark historical / remove the
  arcade block).
- `justfile`: keep `just serve` as a **dev-only** convenience; drop the
  "canonical live checkout wired to the tunnel" language from its comments. Add
  the `deploy` recipe.
- Update the orchestrator regression test under `tests/**/*.test.mjs`
  (canonical-serve contract guard) — it asserts the old tunnel/serve contract
  and must be updated to the R2 model (or the relevant assertions retired).
- Rewrite `CLAUDE.md` serving sections ("Serving the arcade", "Tunnel routing",
  "Canonical is the repo") to describe R2 static hosting + `just deploy`, with
  `just serve` demoted to local dev.

## What stays the same

- **Tempest SFX** — absolute `arcade-assets.slabgorb.com` URL, existing `arcade`
  bucket. Served cross-origin; no change.
- **`just serve`** — still works for local dev (six Vite dev servers). It is no
  longer tied to production.
- **Game code / sim** — untouched except the two config/data edits above.

## Risks & gotchas

- **Content-type correctness** (see §3) — the single most likely way to ship a
  broken site. Verify `curl -sI` returns `text/html` for index and
  `text/javascript` for the entry chunk after first deploy.
- **The URL-rewrite rule is the linchpin** — if it's missing or mis-scoped, the
  bare subdomains 404 (empty key) even though `/index.html` works. Verify each
  subdomain root returns 200 immediately after wiring the rule.
- **Local dev cross-links go to production** — once the lobby's `launchUrl`
  values are absolute subdomain URLs and each game builds at `base: '/'`,
  clicking a lobby tile under `just serve` navigates to the live subdomain, not
  the local port. Per-game local dev (`localhost:<port>/`) still works; the
  integrated local lobby→game hop is retired along with the tunnel. Accepted.
- **TLS provisioning lag** — a freshly connected R2 custom domain can take a few
  minutes before its certificate is active; the subdomain may 5xx briefly.
- **DNS/edge cutover for `arcade.slabgorb.com`** — it currently resolves through
  the tunnel. Connecting it as the `arcade-lobby` bucket's custom domain
  repoints it. Do this only after the lobby bucket is populated and the game
  subdomains are live, so the front door and its links are simultaneously valid.
- **Cross-origin `localStorage`** — acknowledged and accepted; lobby tiles show
  "NO SCORE". Not a regression we care about.
- **Orphaned old assets** accumulate in buckets (see §3) — harmless, prunable
  later.

## Rollout

"All six at once," but ordered to keep the front door valid throughout:

1. Land the per-repo code changes (base → `/`, lobby `launchUrl` → absolute) on
   each subrepo's `develop` and build.
2. Create all six buckets, connect the five **game** subdomains, and add the one
   zone URL-rewrite rule. Deploy all six sites via `just deploy`.
3. Verify each `<game>.slabgorb.com` serves from R2 (200, correct content-types,
   game boots, SFX load on tempest).
4. Connect `arcade.slabgorb.com` to `arcade-lobby`; verify the lobby loads and
   every tile launches its game subdomain.
5. Retire the tunnel's arcade block + update orchestrator docs/tests (§4).

## Verification

- `curl -sI https://<game>.slabgorb.com/` → `200`, `content-type: text/html`.
- `curl -sI https://<game>.slabgorb.com/<entry>.js` → `text/javascript`.
- Load each subdomain in a browser: game boots, no console 404s for assets.
- `tempest.slabgorb.com`: SFX fetch from `arcade-assets` succeeds (CORS ok — it
  already works today cross-path; confirm cross-subdomain).
- `arcade.slabgorb.com`: lobby renders, each tile navigates to its subdomain.
- After tunnel edit: `cloudflared tunnel ingress rule
  https://sidequest.slabgorb.com/` still resolves (other project unbroken).

## Out of scope

- Global / cross-device high scores (would need a backend; separate feature).
- Cloudflare Worker routing and Cloudflare Pages (evaluated, not chosen).
- Pruning orphaned bucket objects (deferred; lifecycle rule later).
- CI-driven deploy on push (start with manual `just deploy`; automate later if
  wanted).
