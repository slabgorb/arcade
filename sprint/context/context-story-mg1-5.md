# Story mg1-5: deploy-r2 is not atomic

## Problem

> ⚠ **SM MEASUREMENT (2026-08-01)**
> 
> **VERIFIED TRUE (measured 2026-08-01, this checkout):**
> - The lobby's real upload order is exactly as described. `collectUploads('dist','',{only:lobbyOwnedEntries('dist')})` returns 5 objects in this order:
>   1. `assets/main-C_7-CnmN.js`
>   2. `favicon.png`
>   3. `fonts/Readme.txt`
>   4. `fonts/VectorBattle-e9XO.ttf`
>   5. `index.html`
>   
>   index.html IS last, and the "assets/… then favicon.png then fonts/… then index.html" sentence is accurate.
> - Assets ARE content-hashed and therefore additive: `main-C_7-CnmN.js`, `VectorBattle-e9XO.ttf`.
> - The script DOES already exit non-zero on a mid-flight failure — `execFileSync` throws (`scripts/deploy-r2.mjs:123`) and `uploadDir` does not catch it — so AC3's "it already does that" is correct and a test asserting only a non-zero exit would be vacuous.
>
> **SHARPENED — the hazard is worse than the description says:**
> - The description attributes the survival to alphabetical luck ("It sorted last purely because it begins with the letter i"). Measured: `scripts/deploy-r2.mjs` contains **no `.sort()` at all** (grep confirms; `scripts/build-app.mjs:37` does call `.sort()`, so sorting exists elsewhere in the pipeline but not here). `walk()` at `scripts/deploy-r2.mjs:38-46` returns raw `readdirSync` order, depth-first with directories expanded inline. **Node guarantees no ordering for `readdirSync`.** On this macOS/APFS checkout it came back sorted; that is a filesystem accident, not a property of the code.
>
> **A CLAIM FOR TEA TO VERIFY — SM did NOT determine this:**
> - CI's deploy job runs on `ubuntu-latest` (`.github/workflows/deploy.yml:32`) and invokes the same uploader at `:223`. That is a DIFFERENT filesystem from this checkout. SM did not measure whether readdir order there is alphabetical. **If it is not, then the "protected by the letter i" framing is optimistic and CI deploys have never had even the accidental protection.** State this as an open question with the check named ("measure readdir order on the CI runner's filesystem, or make the question moot by sorting explicitly"), NOT as a finding.
>
> **One detail the description does not mention, worth carrying:**
> - Two lobby objects are NOT content-hashed — `favicon.png` and `fonts/Readme.txt`. They are overwrite-in-place rather than additive. This does not change the commit-point analysis (index.html is still the switch) but AC1 speaks of "every asset it references", and favicon.png is referenced by index.html, so TEA should be aware the additive-assets premise is not universal.

The 2026-07-30 flag day collapsed nine repos into this one (design: docs/superpowers/specs/2026-07-30-arcade-plugin-host-design.md, plan: docs/superpowers/plans/2026-07-30-arcade-plugin-host.md). Every story here was filed BY that migration — deferred out of it by owner ruling, descoped by a task implementer who declined to fix outside their file list, or created by the collapse itself. They were filed into epic uf1 because that is where the previous sweep's leftovers went, which left uf1 carrying two unrelated charters under a title describing only one; this epic is that split. What is NOT here: uf1 keeps the 2026-07-28 unwired-features sweep (ported-but-unconsumed ROM mechanics), ad1-6 moved to ad1 because it edits the same red-baron manifest as ad1-5, sw8-20 moved to sw8 because it is a star-wars ROM display ruling, and shell convergence became its own epic sc1 because the design says so in its own words (section 4.3). TWO ITEMS OUTSIDE THESE STORIES REMAIN OWNER ACTIONS, not backlog: the seven <game>.slabgorb.com custom domains are still bound to their old R2 buckets and have NOT been replaced with Single Redirects onto arcade.slabgorb.com/<id>/ (CLAUDE.md records this), and the old per-game buckets must not be deleted until that is verified end to end with a live 200 per game, not a green suite.

Found for real during the monorepo cutover, 2026-07-31, not by inspection. The first `just deploy` of the whole cabinet died on its FOURTH object when Cloudflare returned 523 Origin is unreachable, a transient API-gateway fault. wrangler had already authenticated and uploaded three files; the script threw, the recipe exited 1, and the games loop never ran at all. Production survived completely intact, and the reason it survived is the problem. scripts/deploy-r2.mjs uploads whatever collectUploads() walks, which is alphabetical, so the lobby goes assets/... then favicon.png then fonts/... then index.html. index.html is the COMMIT POINT - the single object that switches the live site from the old build to the new one, because every other asset is content-hashed and therefore additive. It sorted last purely because it begins with the letter i. Had the 523 arrived one object later, the new index.html would have gone live with tiles linking to /<id>/ for seven games that had not been uploaded yet: six dead tiles on the front door, from a command that exits 1 without indicating which side of the commit point it stopped on. This is not hypothetical headroom either. Any future lobby file sorting after index.html - manifest.json, robots.txt, sw.js, a sitemap - moves the commit point permanently into the middle of the upload, and then a mid-flight failure publishes a page whose assets do not exist. The fix is to make the ordering a property rather than an accident.

## Scope

### In Scope

The behavior described by the story title:

1. **Reorder uploads so HTML entry points sort after their assets:** `collectUploads()` and its caller must guarantee every HTML file sorts after every asset it references. The lobby has one entry point (index.html) which references content-hashed assets and two non-hashed files (favicon.png, fonts/Readme.txt). A prefixed game also has one entry point (index.html under the game's prefix) with its own asset dependencies.

2. **Prove the ordering with a fixture whose HTML sorts BEFORE assets:** The current behavior passes trivially because index.html's alphabetical position is already last. A test must fail on a fixture where the HTML filename sorts before its assets, then pass after the fix is applied. This demonstrates the ordering is enforced by the code, not by a lucky letter.

3. **Test partial failures with HTML not yet written:** When an upload throws midway (e.g., on the 4th of 10 objects), no HTML entry point should have been written. The test must verify this condition directly; asserting that the command exits non-zero is insufficient because it already does that and is exactly what happened during the real incident while the site was one object away from breaking.

4. **Cover both lobby (root) and prefixed game uploads:** The lobby writes to the bucket root and a game writes under its own prefix. Only the lobby's index.html can replace the live front door, but the ordering principle applies to both.

5. **Record the rationale in the script:** A comment must explain why the ordering matters and cite the real incident, so a future reader does not restore alphabetical ordering as a simplification.

### Out of Scope

- **CI's lobby deploy leg missing --lobby-only flag** (`.github/workflows/deploy.yml:223`). This is a separate defect owned by story **mg1-3** (2pt, p2, backlog, UNCLAIMED). Do not fix it here; if a sibling checkout claims mg1-3 mid-flight, both stories will contend on the same files. Record mg1-3 as a named dependency in your findings if you encounter the same code path.

## Technical Approach

### Measured Surface
The key files and functions to modify:

1. **`scripts/deploy-r2.mjs`** — The upload orchestrator
   - **`contentTypeFor(path)`** (line 34): Maps file extensions to MIME types; unchanged by this work
   - **`normalizePrefix(prefix)`** (line 56): Normalizes key prefixes; unchanged
   - **`collectUploads(distDir, keyPrefix = '', { only })`** (line 71): Walks the directory tree and returns an array of `{ key, file, contentType }` — note the field is `file`, not `path`. **THIS is where reordering happens.** Currently returns raw `readdirSync` order; the fix enforces a deterministic ordering where HTML entry points come last.
   - **`onlyFor(distDir, { lobbyOnly = false })`** (line 104): returns `lobbyOwnedEntries(distDir)` when `lobbyOnly`, else `undefined`. It does NOT filter by key prefix — it restricts the walk to a set of TOP-LEVEL entry NAMES of `distDir`, and exists for exactly one caller (the lobby, whose distDir IS `dist/`, the parent of every game's `dist/<id>/`). Unchanged by this story.
   - **`uploadDir(distDir, bucket, prefix, opts)`** (line 119): The wrangler `execFileSync` loop (lines 121-128) that uploads in the order returned by `collectUploads()`. **THIS is where the partial-failure test needs a seam.** The current signature takes no injectable uploader; a test will need to mock or stub this function to simulate mid-flight failures.

2. **`tests/deploy-r2.test.mjs`** — The orchestrator test suite (327 lines, node:test)
   - Already covers: contentTypeFor mapping, collectUploads tree-walking, prefixing, trailing/leading-slash normalization, empty/missing dist errors, and four lobby-isolation tests
   - **Missing:** No ordering test, no partial-failure test
   - Must add: One fixture test for ordering (HTML before assets in filename), one fixture test for partial failure (mock uploader that throws on object N, verify HTML not written)

3. **`scripts/build-app.mjs`** (line 37): Contains `.sort()` for reference; deploy-r2.mjs does NOT sort at all. Node's `readdirSync` offers no ordering guarantee; filesystem order (this machine: alphabetical by accident; CI runner: unknown without measurement).

### Testing Strategy

- **Fixture 1 (ordering):** Create a test fixture where the HTML filename sorts before its assets (e.g., `aaa.html` referencing `zzz.css`). Verify that `collectUploads()` returns the HTML LAST after the fix.
- **Fixture 2 (partial failure):** Mock the wrangler uploader to throw an error after N objects. Verify no HTML has been written and the returned array's HTML entries come at the end (so if it stops before reaching them, no page can go live).
- **Real case (lobby):** Verify the lobby's `index.html` comes after all its referenced assets (measured: `main-C_7-CnmN.js`, `VectorBattle-e9XO.ttf`, `favicon.png`, `fonts/Readme.txt`).
- **Real case (prefixed game):** Verify a prefixed game's `index.html` comes after its assets.

### Constraints TEA and Dev must design against (measured facts, not a prescribed design)

SM does not own the design. These are the constraints the measurement established; how to satisfy them is TEA's and Dev's call.

- **Filesystem order is not a foundation.** `walk()` (`scripts/deploy-r2.mjs:38-46`) returns raw `readdirSync` order and the file contains no `.sort()`. Whatever ordering the fix relies on must be established by the code, since neither Node nor POSIX guarantees an order — this is AC1's "must not depend on a letter" restated as a mechanism.
- **"Every HTML entry point" is plural, and AC1 says so deliberately.** MEASURED: the built cabinet ships **12** HTML objects, and three games ship more than one — `tempest` and `red-baron` carry `index.html` + `models.html`, `star-wars` carries `index.html` + `models.html` + `scenes.html`. Treating "the entry point" as a singular `index.html` would satisfy AC4's letter and miss five of the twelve.
- **The accident currently holds cabinet-wide, which is a stronger claim than the story makes — and the reason is the same letter.** MEASURED per game: star-wars' three HTML objects sit at positions 7,8,9 of 9; red-baron's two at 4,5 of 5; tempest's two at 5,6 of 6. In every case **zero** non-HTML objects upload after the first HTML. So no game is broken today. The protection is identical to the lobby's, though: `assets/` and `fonts/` begin with letters before `i`/`m`/`s`. A future `zzz.js`, or an FS that does not return sorted order, breaks all of them at once. This is what AC2 means by "passes trivially" — a test written against today's real `dist/` cannot fail, which is exactly why AC2 demands a fixture whose HTML sorts FIRST.
- **`uploadDir` currently has no injectable uploader.** It calls `execFileSync('wrangler', …)` directly at `:123`. AC3's partial-failure test needs some seam there; the current signature `uploadDir(distDir, bucket, keyPrefix = '', options = {})` already carries an `options` bag, but nothing in it reaches the upload call today.
- **Two lobby objects are not content-hashed** (`favicon.png`, `fonts/Readme.txt`), so "assets are additive" is true of the hashed ones and not universal. AC1 says "every asset it references"; `favicon.png` is referenced by `index.html`.
- **`--lobby-only` changes the walk, not the order.** The lobby leg passes `only: lobbyOwnedEntries('dist')`, measured at 5 objects; without it the same call walks 34, 29 of them games (the PLAN DEFECT #21 note at `:90-103`). Any ordering change must hold on both paths.

## Acceptance Criteria

- collectUploads or its caller orders every HTML entry point after every asset it references, so a partial upload can never publish a page ahead of the files it loads. Ordering by filename is not sufficient - the guarantee must not depend on a letter.
- A test proves the ordering holds for a fixture whose HTML filename sorts BEFORE its assets, since the current behaviour passes trivially for a directory whose index.html happens to sort last.
- A partial-failure test asserts that when an upload throws midway, no HTML entry point has been written. Asserting that the command exits non-zero is not enough - it already does that, and it is exactly what happened while the site was one object away from breaking.
- The lobby and a prefixed game are both covered, since the lobby writes to the bucket root and a game writes under its own prefix, and only the lobby's index.html can replace the live front door.
- The rationale is recorded in the script so the next reader does not restore alphabetical ordering as a simplification.

<!-- SM-AUTHORED: do not regenerate this file. -->
