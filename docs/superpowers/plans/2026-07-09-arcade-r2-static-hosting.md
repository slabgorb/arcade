# Arcade → R2 Static Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the whole arcade cabinet as static sites from Cloudflare R2 (one subdomain per site) so it no longer depends on a local `just serve` + Cloudflare tunnel running from a canonical checkout.

**Architecture:** Each game + the lobby builds to a self-contained `dist/` at `base: '/'` and is uploaded to its own public R2 bucket, fronted by a custom subdomain (`<slug>.slabgorb.com`; lobby keeps `arcade.slabgorb.com`). R2 serves objects by exact key, so a single zone-level Cloudflare URL-rewrite rule appends `index.html` to `/`-terminated paths. Deploys are a new orchestrator `just deploy` recipe (build all + push each dist with correct content-types). The shared `sidequest` tunnel's arcade routing is retired last.

**Tech Stack:** Vite 8 (TypeScript, ES modules), Cloudflare R2 + Rules, `wrangler` 4.90.1, Node's built-in test runner (`node --test`) for the orchestrator, `just` task runner.

## Global Constraints

- **Subdomain map (exact):** lobby → `arcade.slabgorb.com`; tempest → `tempest.slabgorb.com`; star-wars → `star-wars.slabgorb.com`; asteroids → `asteroids.slabgorb.com`; battlezone → `battlezone.slabgorb.com`; red-baron → `red-baron.slabgorb.com`.
- **Bucket map (exact):** bucket name is always `arcade-<subrepo>` — `arcade-lobby`, `arcade-tempest`, `arcade-star-wars`, `arcade-asteroids`, `arcade-battlezone`, `arcade-red-baron`.
- **Every site builds at `base: '/'`** (served at the root of its own subdomain).
- **Cloudflare account ID:** `a55aafa9b0691f828cd6864be28c1674`. **Zone:** `slabgorb.com` (Zone ID looked up in Task 4).
- **Content-types are mandatory** on upload — `wrangler r2 object put` does not auto-detect; a wrong type ships a broken site.
- **Never touch the `sidequest.slabgorb.com` tunnel routes** — the runtime `~/.cloudflared/config.yml` is shared; only the arcade ingress block is removed.
- **Tempest SFX stay put** at `https://arcade-assets.slabgorb.com/tempest/sfx/` (absolute URL in `tempest/src/shell/audio.ts`) — do not move or re-reference them.
- **Orchestrator commits are made as plan steps** (executing the plan is the "ask"); each game subrepo uses its own gitflow (`develop`). **red-baron has no GitHub remote** — its change is committed to local `develop`, no PR.
- **`just test-orchestrator`** (`node --test 'tests/**/*.test.mjs'`) must pass at the end of every task.

---

### Task 1: Repoint the five game Vite bases to root

Each game currently builds under a path prefix (`base: '/tempest/'`, …) because the old model served all games under one host. On its own subdomain each game lives at `/`, so its emitted asset URLs (`/assets/…`) must resolve from the root.

**Files (one edit each, in the gitignored game subrepos):**
- Modify: `tempest/vite.config.ts` — `base: '/tempest/'` → `base: '/'`
- Modify: `star-wars/vite.config.ts` — `base: '/star-wars/'` → `base: '/'`
- Modify: `asteroids/vite.config.ts` — `base: '/asteroids/'` → `base: '/'`
- Modify: `battlezone/vite.config.ts` — `base: '/battlezone/'` → `base: '/'`
- Modify: `red-baron/vite.config.ts` — `base: '/red-baron/'` → `base: '/'`

**Interfaces:**
- Produces: each `<game>/dist/index.html` referencing assets at `/assets/...` (root-absolute). Task 3's deploy uploads these; Task 5 serves them.

Do the following **for each of the five games** (shown for `tempest`; repeat identically, substituting the slug and its current base string from the list above):

- [ ] **Step 1: Branch**

```bash
cd tempest && git checkout develop && git pull --ff-only 2>/dev/null; git checkout -b chore/r2-cutover-base-root
```
(red-baron: no remote, so `git pull` is skipped — just `git checkout develop && git checkout -b chore/r2-cutover-base-root`.)

- [ ] **Step 2: Edit the base**

In `tempest/vite.config.ts`, change:
```ts
  base: '/tempest/',
```
to:
```ts
  base: '/',
```

- [ ] **Step 3: Build to verify asset paths are now root-absolute**

Run: `cd tempest && npm run build`
Expected: build succeeds. Then confirm assets no longer carry the old prefix:
```bash
grep -o '/tempest/assets' tempest/dist/index.html || echo "OK: no /tempest/ prefix remains"
grep -o '/assets/[^"]*' tempest/dist/index.html | head -1
```
Expected: prints `OK: no /tempest/ prefix remains`, then a `/assets/...` path.

- [ ] **Step 4: Run the game's own tests (regression guard)**

Run: `cd tempest && npm test`
Expected: PASS (base change is asset-path-only; sim tests unaffected).

- [ ] **Step 5: Commit (and PR for repos with a remote)**

```bash
cd tempest && git add vite.config.ts && git commit -m "chore: build at root base for R2 subdomain hosting"
# repos with a GitHub remote (all except red-baron): open a PR to develop
gh pr create --base develop --title "chore: build at root base for R2 subdomain hosting" --body "Serve at the root of tempest.slabgorb.com (R2). See docs/superpowers/plans/2026-07-09-arcade-r2-static-hosting.md" 2>/dev/null || true
# red-baron only (no remote): merge locally
# git checkout develop && git merge --no-ff chore/r2-cutover-base-root
```

Repeat Steps 1–5 for `star-wars`, `asteroids`, `battlezone`, `red-baron`.

---

### Task 2: Lobby — build at root, link tiles to game subdomains, keep orchestrator tests green

The lobby lists games from `registry.ts`, each with a root-relative `launchUrl` (`/tempest/`) rendered as an `<a href>`. Subdomains require absolute URLs. This same change breaks the `launchUrl` assertions in two orchestrator bootstrap suites, updated here in the same task.

**Files:**
- Modify: `lobby/vite.config.ts` — `base: '/lobby/'` → `base: '/'`
- Modify: `lobby/src/core/registry.ts` — every `launchUrl` → absolute subdomain URL
- Modify: `tests/battlezone-bootstrap.test.mjs:~176` (the `launchUrl` assertion)
- Modify: `tests/red-baron-bootstrap.test.mjs:168` (the `launchUrl` assertion)

**Interfaces:**
- Consumes: the subdomain map (Global Constraints).
- Produces: `lobby/dist/index.html` at root base; tiles navigating to `https://<slug>.slabgorb.com/`.

- [ ] **Step 1: Branch the lobby subrepo**

```bash
cd lobby && git checkout develop && git pull --ff-only 2>/dev/null; git checkout -b chore/r2-cutover-lobby
```

- [ ] **Step 2: Repoint the lobby base**

In `lobby/vite.config.ts`, change `base: '/lobby/',` to `base: '/',`.

- [ ] **Step 3: Rewrite the registry launch URLs**

In `lobby/src/core/registry.ts`, replace the `GAMES` array entries' `launchUrl` values:
```ts
export const GAMES: readonly Game[] = [
  { id: 'tempest', title: 'TEMPEST', launchUrl: 'https://tempest.slabgorb.com/', color: '#00eaff' },
  { id: 'star-wars', title: 'STAR WARS', launchUrl: 'https://star-wars.slabgorb.com/', color: '#ffe81f' },
  { id: 'asteroids', title: 'ASTEROIDS', launchUrl: 'https://asteroids.slabgorb.com/', color: '#ff6a00' },
  { id: 'battlezone', title: 'BATTLEZONE', launchUrl: 'https://battlezone.slabgorb.com/', color: '#00ff41' },
  { id: 'red-baron', title: 'RED BARON', launchUrl: 'https://red-baron.slabgorb.com/', color: '#ff2b2b' },
]
```
Also update the `Game.launchUrl` doc comment from "Root-relative path" to "Absolute URL the tile launches to (e.g. 'https://tempest.slabgorb.com/')."

- [ ] **Step 4: Build + test the lobby**

Run: `cd lobby && npm run build && npm test`
Expected: build succeeds; tests PASS. Confirm no `/lobby/` prefix leaked:
```bash
grep -o '/lobby/assets' lobby/dist/index.html || echo "OK: no /lobby/ prefix remains"
```
Expected: `OK: no /lobby/ prefix remains`.

- [ ] **Step 5: Commit the lobby change (+ PR)**

```bash
cd lobby && git add vite.config.ts src/core/registry.ts && git commit -m "chore: root base + subdomain launch URLs for R2 hosting"
gh pr create --base develop --title "chore: root base + subdomain launch URLs for R2 hosting" --body "Lobby serves from arcade.slabgorb.com (R2); tiles link to per-game subdomains." 2>/dev/null || true
```

- [ ] **Step 6: Update the orchestrator bootstrap tests' launchUrl assertions**

In `tests/battlezone-bootstrap.test.mjs`, change the assertion:
```js
  assert.match(tile, /launchUrl:\s*['"]\/battlezone\/['"]/, "battlezone tile must launch '/battlezone/'");
```
to:
```js
  assert.match(tile, /launchUrl:\s*['"]https:\/\/battlezone\.slabgorb\.com\/['"]/, "battlezone tile must launch its subdomain");
```
In `tests/red-baron-bootstrap.test.mjs`, change:
```js
  assert.match(tile, /launchUrl:\s*['"]\/red-baron\/['"]/, "red-baron tile must launch '/red-baron/'");
```
to:
```js
  assert.match(tile, /launchUrl:\s*['"]https:\/\/red-baron\.slabgorb\.com\/['"]/, "red-baron tile must launch its subdomain");
```

- [ ] **Step 7: Run the orchestrator suite — still green**

Run: `just test-orchestrator`
Expected: PASS. (The cloudflared-routing assertions in these suites still pass — `cloudflared/config.yml` is unchanged until Task 7.)

- [ ] **Step 8: Commit the orchestrator test update**

```bash
git add tests/battlezone-bootstrap.test.mjs tests/red-baron-bootstrap.test.mjs
git commit -m "test(orchestrator): expect subdomain launch URLs for battlezone/red-baron tiles"
```

---

### Task 3: Deploy tooling — `scripts/deploy-r2.mjs` + content-type test + `just deploy` (TDD)

A Node script uploads a built `dist/` to its bucket with a correct `Content-Type` per file (the R2 static-hosting footgun). The MIME mapping is a pure, unit-tested function.

**Files:**
- Create: `scripts/deploy-r2.mjs`
- Test: `tests/deploy-r2.test.mjs`
- Modify: `justfile` (new `deploy` recipe)

**Interfaces:**
- Produces: `contentTypeFor(fileName: string): string` (exported); CLI `node scripts/deploy-r2.mjs <distDir> <bucket>` that uploads every file under `<distDir>` to `<bucket>` via `wrangler r2 object put <bucket>/<key> --file <path> --remote --content-type <mime>`. Task 5/6 invoke it through `just deploy`.

- [ ] **Step 1: Write the failing content-type test**

Create `tests/deploy-r2.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentTypeFor } from '../scripts/deploy-r2.mjs';

test('contentTypeFor maps the static extensions the arcade ships', () => {
  assert.equal(contentTypeFor('index.html'), 'text/html; charset=utf-8');
  assert.equal(contentTypeFor('assets/main-abc123.js'), 'text/javascript; charset=utf-8');
  assert.equal(contentTypeFor('assets/main-abc123.mjs'), 'text/javascript; charset=utf-8');
  assert.equal(contentTypeFor('assets/index-x.css'), 'text/css; charset=utf-8');
  assert.equal(contentTypeFor('assets/data.json'), 'application/json');
  assert.equal(contentTypeFor('assets/main.js.map'), 'application/json');
  assert.equal(contentTypeFor('sprite.svg'), 'image/svg+xml');
  assert.equal(contentTypeFor('fonts/VectorBattle-e9XO.ttf'), 'font/ttf');
  assert.equal(contentTypeFor('fonts/x.woff2'), 'font/woff2');
  assert.equal(contentTypeFor('icon.png'), 'image/png');
  assert.equal(contentTypeFor('favicon.ico'), 'image/x-icon');
});

test('contentTypeFor is case-insensitive on the extension', () => {
  assert.equal(contentTypeFor('README.HTML'), 'text/html; charset=utf-8');
});

test('contentTypeFor falls back to octet-stream for unknown extensions', () => {
  assert.equal(contentTypeFor('mystery.xyz'), 'application/octet-stream');
  assert.equal(contentTypeFor('noextension'), 'application/octet-stream');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/deploy-r2.test.mjs`
Expected: FAIL — cannot resolve `../scripts/deploy-r2.mjs` (module does not exist yet).

- [ ] **Step 3: Write the script with the mapping + uploader**

Create `scripts/deploy-r2.mjs`:
```js
// Uploads a built Vite dist/ to its R2 bucket with correct Content-Types.
// wrangler r2 object put does NOT auto-detect content-type; a wrong type ships
// a broken static site (html downloads, js fails to load as a module), so every
// object is put with an explicit --content-type derived from its extension.
//
// Usage: node scripts/deploy-r2.mjs <distDir> <bucket>
import { readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
};

export function contentTypeFor(fileName) {
  return TYPES[extname(fileName).toLowerCase()] ?? 'application/octet-stream';
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

export function uploadDir(distDir, bucket) {
  const files = walk(distDir);
  if (files.length === 0) throw new Error(`no files found under ${distDir} — did the build run?`);
  for (const file of files) {
    const key = relative(distDir, file).split('\\').join('/'); // POSIX keys on any OS
    const ct = contentTypeFor(key);
    console.log(`  ${bucket}/${key}  (${ct})`);
    execFileSync(
      'wrangler',
      ['r2', 'object', 'put', `${bucket}/${key}`, '--file', file, '--remote', '--content-type', ct],
      { stdio: ['ignore', 'ignore', 'inherit'] },
    );
  }
  console.log(`Uploaded ${files.length} objects to ${bucket}.`);
}

// CLI entry (only when run directly, not when imported by the test).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [distDir, bucket] = process.argv.slice(2);
  if (!distDir || !bucket) {
    console.error('Usage: node scripts/deploy-r2.mjs <distDir> <bucket>');
    process.exit(1);
  }
  uploadDir(distDir, bucket);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/deploy-r2.test.mjs`
Expected: PASS (all content-type cases green).

- [ ] **Step 5: Add the `just deploy` recipe**

In `justfile`, after the `serve` recipe block, add:
```just
# ============================================
# DEPLOY (R2 static hosting)
# ============================================
# Build every servable subrepo and push its dist/ to its R2 bucket
# (arcade-<name>) with correct content-types. Requires `wrangler` logged in.
# This is how the live arcade is updated — no local server, no tunnel.
deploy:
    #!/usr/bin/env bash
    set -euo pipefail
    for s in {{subrepos}}; do
      echo "==> building $s"
      (cd {{root}}/$s && npm run build)
      echo "==> deploying $s -> arcade-$s"
      node {{root}}/scripts/deploy-r2.mjs {{root}}/$s/dist "arcade-$s"
    done
    echo "Deploy complete."

# Deploy a single subrepo (e.g. `just deploy-one tempest`)
deploy-one name:
    #!/usr/bin/env bash
    set -euo pipefail
    (cd {{root}}/{{name}} && npm run build)
    node {{root}}/scripts/deploy-r2.mjs {{root}}/{{name}}/dist "arcade-{{name}}"
```

- [ ] **Step 6: Verify the recipe parses**

Run: `just --list | grep -E 'deploy|deploy-one'`
Expected: both `deploy` and `deploy-one` appear.

- [ ] **Step 7: Run the orchestrator suite**

Run: `just test-orchestrator`
Expected: PASS (new deploy-r2 test included; nothing else changed).

- [ ] **Step 8: Commit**

```bash
git add scripts/deploy-r2.mjs tests/deploy-r2.test.mjs justfile
git commit -m "feat(deploy): add R2 static deploy script + just deploy recipe"
```

---

### Task 4: Create the six R2 buckets, wire the five game domains, add the directory-index rule

One-time Cloudflare setup. `arcade.slabgorb.com` (the front door) is wired later in Task 6 — connecting it now would repoint the live tunnel host before the lobby bucket exists.

**Files:** none (infrastructure).

**Interfaces:**
- Produces: six empty public buckets + five connected game subdomains + one zone URL-rewrite rule that maps `…/` → `…/index.html`. Task 5 deploys into these.

- [ ] **Step 1: Look up the slabgorb.com Zone ID**

Cloudflare dashboard → select the `slabgorb.com` zone → **Overview** → right sidebar → copy **Zone ID**. Export it for the commands below:
```bash
export ZONE_ID=<paste-zone-id>
```

- [ ] **Step 2: Create all six buckets**

```bash
for s in lobby tempest star-wars asteroids battlezone red-baron; do
  wrangler r2 bucket create "arcade-$s"
done
```
Expected: `Created bucket 'arcade-<s>'` for each (or "already exists" if re-run — safe).

Verify:
```bash
wrangler r2 bucket list | grep -E 'arcade-(lobby|tempest|star-wars|asteroids|battlezone|red-baron)'
```
Expected: all six listed.

- [ ] **Step 3: Connect the five GAME custom domains (not arcade.slabgorb.com yet)**

```bash
for s in tempest star-wars asteroids battlezone red-baron; do
  wrangler r2 bucket domain add "arcade-$s" --domain "$s.slabgorb.com" --zone-id "$ZONE_ID" --min-tls 1.2 -y
done
```
Expected: each reports the domain connecting (status **Initializing** → **Active** within a few minutes).

Verify one:
```bash
wrangler r2 bucket domain get arcade-tempest
```
Expected: shows `tempest.slabgorb.com` with an enabled/active status.

- [ ] **Step 4: Create the directory-index URL-rewrite rule (dashboard)**

Cloudflare dashboard → `slabgorb.com` zone → **Rules → Transform Rules → URL Rewrite** → **Create rule**.
- **Rule name:** `arcade index.html for directory paths`
- **When incoming requests match** → *Custom filter expression* → Edit expression, paste exactly:
  ```
  (http.host in {"arcade.slabgorb.com" "tempest.slabgorb.com" "star-wars.slabgorb.com" "asteroids.slabgorb.com" "battlezone.slabgorb.com" "red-baron.slabgorb.com"} and ends_with(http.request.uri.path, "/"))
  ```
- **Then... Rewrite to** → **Path** → **Dynamic** → expression:
  ```
  concat(http.request.uri.path, "index.html")
  ```
- Leave Query unchanged. **Deploy.**

- [ ] **Step 5: Sanity-check the rule scope**

The `http.host` set includes `arcade.slabgorb.com` (harmless now; it still routes through the tunnel until Task 6). Confirm the rule is **enabled** and appears in the URL Rewrite list. No verification against R2 is possible yet (buckets are empty — that's Task 5).

---

### Task 5: First deploy of the five games + verify the subdomains serve from R2

**Files:** none (uses `just deploy-one` from Task 3).

**Interfaces:**
- Consumes: buckets + domains + rule (Task 4), deploy tooling (Task 3), root-base builds (Task 1).
- Produces: five live game subdomains served from R2.

- [ ] **Step 1: Deploy each game**

```bash
for s in tempest star-wars asteroids battlezone red-baron; do
  just deploy-one "$s"
done
```
Expected: each prints per-object upload lines and `Uploaded N objects to arcade-<s>.`

- [ ] **Step 2: Verify the bare subdomain returns HTML (rule + bucket working)**

```bash
for s in tempest star-wars asteroids battlezone red-baron; do
  echo "== $s =="; curl -sSI "https://$s.slabgorb.com/" | grep -iE '^HTTP|^content-type'
done
```
Expected per site: `HTTP/2 200` and `content-type: text/html; charset=utf-8`.
(If a site 404s: the URL-rewrite rule from Task 4 Step 4 is missing/mis-scoped — the bare `/` maps to the empty key. `curl https://<s>.slabgorb.com/index.html` returning 200 confirms the object is present and the rule is the gap.)

- [ ] **Step 3: Verify the entry JS is served with the right type**

```bash
JS=$(curl -sS https://tempest.slabgorb.com/ | grep -oE '/assets/[^"]+\.js' | head -1)
curl -sSI "https://tempest.slabgorb.com$JS" | grep -iE '^HTTP|^content-type'
```
Expected: `HTTP/2 200` and `content-type: text/javascript; charset=utf-8`.

- [ ] **Step 4: Browser smoke test**

Open each `https://<slug>.slabgorb.com/` in a browser. Expected: the game boots, no console 404s for assets. On `tempest.slabgorb.com`, trigger a sound and confirm the SFX fetch from `arcade-assets.slabgorb.com` succeeds (cross-origin; it already works cross-path today).

---

### Task 6: Front-door cutover — deploy the lobby, repoint arcade.slabgorb.com to R2

`arcade.slabgorb.com` currently resolves through the tunnel. This task deploys the lobby bucket first, then repoints the hostname to R2. Expect a brief blip while TLS provisions — do it intentionally.

**Files:** none (infrastructure + deploy).

**Interfaces:**
- Consumes: `arcade-lobby` bucket (Task 4), lobby root-base build + subdomain tiles (Task 2).
- Produces: `arcade.slabgorb.com` served from R2, tiles launching the (already-live) game subdomains.

- [ ] **Step 1: Deploy the lobby into its bucket (before repointing DNS)**

```bash
just deploy-one lobby
```
Expected: `Uploaded N objects to arcade-lobby.`

- [ ] **Step 2: Remove the old arcade.slabgorb.com DNS record (tunnel CNAME)**

Cloudflare dashboard → `slabgorb.com` → **DNS → Records** → find the `arcade` record (CNAME to `…cfargotunnel.com`, proxied) → **Delete**. (This frees the name so R2 can attach its own proxied record. `sidequest.slabgorb.com` is a *separate* record — leave it.)

- [ ] **Step 3: Connect arcade.slabgorb.com to the lobby bucket**

```bash
wrangler r2 bucket domain add arcade-lobby --domain arcade.slabgorb.com --zone-id "$ZONE_ID" --min-tls 1.2 -y
```
Expected: domain connecting; status **Initializing** → **Active** within a few minutes.

- [ ] **Step 4: Verify the front door**

```bash
curl -sSI https://arcade.slabgorb.com/ | grep -iE '^HTTP|^content-type'
```
Expected: `HTTP/2 200`, `content-type: text/html; charset=utf-8`.

- [ ] **Step 5: Browser verify the lobby + tile navigation**

Open `https://arcade.slabgorb.com/`. Expected: lobby renders; each tile links to `https://<slug>.slabgorb.com/` (hover to confirm the href) and navigates there when clicked. (Per-game "best score" tiles show "NO SCORE" — accepted; storage is now per-origin.)

---

### Task 7: Retire the tunnel's arcade routing, document the R2 setup, keep orchestrator tests green

With all six subdomains live on R2, the tunnel no longer serves the arcade. Remove only the arcade ingress block from the shared runtime config, retire the checked-in reference, add an ops runbook, and update the orchestrator suites whose cloudflared assertions this breaks.

**Files:**
- Modify: `~/.cloudflared/config.yml` (runtime, outside the repo — arcade block only)
- Modify: `cloudflared/config.yml` (checked-in reference — mark arcade retired)
- Modify: `cloudflared/README.md` (note arcade no longer routes through the tunnel)
- Create: `docs/ops/r2-hosting.md` (the new runbook)
- Modify: `tests/battlezone-bootstrap.test.mjs` (cloudflared-routing assertions)
- Modify: `tests/red-baron-bootstrap.test.mjs` (cloudflared-routing assertions)

**Interfaces:**
- Consumes: the live R2 setup (Tasks 4–6).
- Produces: a tunnel serving only `sidequest.slabgorb.com`; a checked-in runbook; green orchestrator tests reflecting the R2 model.

- [ ] **Step 1: Back up and edit the runtime tunnel config**

```bash
cp ~/.cloudflared/config.yml ~/.cloudflared/config.yml.bak-$(git -C {{root}} rev-parse --short HEAD 2>/dev/null || echo pre-r2)
```
Then edit `~/.cloudflared/config.yml`: delete the six `- hostname: arcade.slabgorb.com …` ingress entries (the five game rules + the lobby catch-all). **Keep** every `sidequest.slabgorb.com` rule and the terminal `- service: http_status:404`.

- [ ] **Step 2: Validate + restart the tunnel**

```bash
cloudflared tunnel ingress validate
cloudflared tunnel ingress rule https://sidequest.slabgorb.com/   # must still resolve to sidequest's origin
```
Expected: validation passes; the sidequest rule still resolves. Then restart the tunnel process that reads this config (per `cloudflared/README.md`: `pkill -f 'cloudflared tunnel run sidequest'` then relaunch it). Note: this briefly drops `sidequest.slabgorb.com` too — intentional.

- [ ] **Step 3: Verify arcade is served by R2, not the tunnel**

```bash
curl -sSI https://arcade.slabgorb.com/ | grep -i '^server'      # Cloudflare/R2 edge, not the tunnel origin
curl -sSI https://arcade.slabgorb.com/tempest/ | grep -iE '^HTTP'   # old path is gone → 404/redirect, not a game
```
Expected: `arcade.slabgorb.com/` is 200 from R2; the old `/tempest/` path is no longer a live game (that content now lives at `tempest.slabgorb.com`).

- [ ] **Step 4: Retire the checked-in cloudflared reference**

In `cloudflared/config.yml`, replace the six `hostname: arcade.slabgorb.com` ingress rules with a single comment block:
```yaml
# RETIRED 2026-07-09: the arcade no longer routes through this tunnel. Every
# site is served statically from Cloudflare R2 (one bucket per subdomain) — see
# docs/ops/r2-hosting.md. The tunnel now serves only sidequest.slabgorb.com.
```
Keep the file otherwise valid (tunnel/credentials header + the terminal 404).
In `cloudflared/README.md`, add a top note: "**Retired for the arcade (2026-07-09).** The arcade is served from R2; see `docs/ops/r2-hosting.md`. This directory is kept as the historical tunnel reference."

- [ ] **Step 5: Write the R2 hosting runbook**

Create `docs/ops/r2-hosting.md` documenting, concretely: the subdomain→bucket map; that each bucket is a public bucket with a connected custom domain; the exact URL-rewrite rule expression from Task 4 Step 4; that content-types are set explicitly by `scripts/deploy-r2.mjs`; and the deploy command (`just deploy`, or `just deploy-one <name>`). Include the "bare subdomain 404 ⇒ the rewrite rule is missing" diagnostic and the "verify content-type via `curl -sSI`" check.

- [ ] **Step 6: Update the cloudflared-routing assertions in the bootstrap suites**

In `tests/battlezone-bootstrap.test.mjs`, the test `'AC: cloudflared routes /battlezone/* to :5276, ahead of the lobby catch-all'` no longer reflects reality. Replace its body with an assertion that the arcade tunnel routing is retired:
```js
test('AC: cloudflared no longer routes the arcade (served from R2)', () => {
  const cf = read('cloudflared/config.yml');
  assert.doesNotMatch(cf, /hostname:\s*arcade\.slabgorb\.com/, 'arcade tunnel ingress is retired — the arcade is served from R2 (docs/ops/r2-hosting.md)');
});
```
Apply the identical change to the corresponding `'AC: cloudflared routes /red-baron/* to :5277 …'` test in `tests/red-baron-bootstrap.test.mjs` (assert `doesNotMatch` the same `hostname: arcade.slabgorb.com`).

- [ ] **Step 7: Run the orchestrator suite**

Run: `just test-orchestrator`
Expected: the two rewritten cloudflared tests PASS; `canonical-serve.test.mjs` may now FAIL on its CLAUDE.md assertions (the "bound to the tunnel ports" narrative) — fixed in Task 8. If canonical-serve is the only remaining red, proceed to Task 8.

- [ ] **Step 8: Commit**

```bash
git add cloudflared/config.yml cloudflared/README.md docs/ops/r2-hosting.md tests/battlezone-bootstrap.test.mjs tests/red-baron-bootstrap.test.mjs
git commit -m "chore(ops): retire arcade tunnel routing; document R2 hosting"
```

---

### Task 8: Rewrite the serving docs (CLAUDE.md, README) and reframe the canonical-serve contract

`canonical-serve.test.mjs` asserts the docs describe the live arcade as "whatever checkout is bound to the tunnel ports." That model is retired: the live arcade is R2; `just serve` is now dev-only. Update the docs and the contract test together.

**Files:**
- Modify: `CLAUDE.md` (the "Serving the arcade", "Tunnel routing", and "Canonical is the repo" sections)
- Modify: `README.md` (serving guidance)
- Modify: `justfile` (the `serve` recipe comment block)
- Modify: `tests/canonical-serve.test.mjs` (the tunnel-binding assertions)

**Interfaces:**
- Consumes: the retired-tunnel reality (Task 7).
- Produces: docs describing R2 as production + `just serve` as dev; a green orchestrator suite.

- [ ] **Step 1: Rewrite the CLAUDE.md serving sections**

Replace the "Serving the arcade (canonical)", "Tunnel routing: the front door is the lobby", and "'Canonical' is the repo, not the directory" sections with an R2-based description. It MUST retain the tokens the contract tests still check: mention **`just serve`** (now framed as the **dev** loop), keep the **`strictPort`** explanation and both pinned ports (**5273** tempest, **5270** lobby) for local dev, and keep language that a pinned-port collision **fails loudly**. Add: production is served from R2 per `docs/ops/r2-hosting.md`; deploy with **`just deploy`**; the front door is `arcade.slabgorb.com` (R2), games at `<slug>.slabgorb.com`.

- [ ] **Step 2: Reframe the canonical-serve tunnel-binding assertions**

In `tests/canonical-serve.test.mjs`, the test `'CLAUDE.md defines "canonical" by the repo + tunnel binding, not the directory name'` asserts `/bound to the[\s\S]*?ports/i`. Update this test to the R2 model:
```js
test('CLAUDE.md defines production as R2, with `just serve` as the dev loop', () => {
  const claude = read('CLAUDE.md');
  assert.match(claude, /R2/, 'CLAUDE.md must describe production as served from Cloudflare R2');
  assert.match(claude, /just serve/, 'CLAUDE.md must still document `just serve` as the local dev loop');
  assert.match(claude, /just deploy/, 'CLAUDE.md must document `just deploy` as the way to update the live arcade');
});
```
Leave the other canonical-serve tests as-is — they assert `just serve`, the `subrepos` list, `strictPort`, and the pinned ports, all still true for dev (Step 1 preserves those tokens).

- [ ] **Step 3: Update the README serving guidance**

In `README.md`, update any "canonical serve"/tunnel language to: `just serve` for local dev (pinned ports 5273/5270, `strictPort`), `just deploy` to publish to R2. Keep the `just serve`, `5273`, `5270`, and `strictPort` tokens (the port/strictPort tests read README too).

- [ ] **Step 4: Update the justfile serve comment**

In `justfile`, edit the comment block above the `serve` recipe: drop "the single canonical checkout wired to the tunnel" language; state that `serve` is the local **dev** loop and the live arcade is deployed to R2 via `just deploy`. Do not change the recipe body (the tests assert it still launches lobby + games).

- [ ] **Step 5: Run the full orchestrator suite**

Run: `just test-orchestrator`
Expected: PASS (all suites green — canonical-serve reframed, bootstrap suites updated in Task 7, deploy-r2 from Task 3).

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md README.md justfile tests/canonical-serve.test.mjs
git commit -m "docs(serve): R2 is production; just serve is the dev loop"
```

- [ ] **Step 7: Final full verification**

```bash
just test-orchestrator
for s in tempest star-wars asteroids battlezone red-baron; do curl -sSI "https://$s.slabgorb.com/" | grep -iE '^HTTP'; done
curl -sSI https://arcade.slabgorb.com/ | grep -iE '^HTTP'
```
Expected: orchestrator suite green; all six hostnames return `HTTP/2 200`.

---

## Notes for the executor

- **Ordering matters for the front door.** Do not connect `arcade.slabgorb.com` to R2 (Task 6) before the lobby bucket is deployed and the game subdomains are verified live (Task 5) — the front door and its tile links must be simultaneously valid.
- **Wrangler auth.** `just deploy` / `wrangler r2 …` use the existing logged-in wrangler session (the same one the Tempest SFX went up with). If a call 401s, run `wrangler login`.
- **Idempotency.** `wrangler r2 bucket create` and `domain add` are safe to re-run (they report "already exists"). `just deploy` overwrites objects; it does not delete orphaned old hashed assets (harmless — `index.html` is always overwritten).
- **Rollback.** The tunnel config backup from Task 7 Step 1 restores the old routing; re-adding the arcade ingress block + `just serve` reverts to tunnel serving if a subdomain misbehaves.
