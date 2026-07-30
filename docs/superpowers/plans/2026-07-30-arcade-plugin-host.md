# Arcade Plugin Host Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the arcade's nine independent repos into one monorepo served from a single origin, with a generated game registry replacing the hand-maintained lobby list, while preserving per-game independent releases.

**Architecture:** Games become tracked directories under `plugins/<id>/`, each keeping its internal shape byte-for-byte so its 40–180 test files, citation gates and purity scanners keep passing untouched. `@arcade/shared` becomes `src/shared/` reached by a path alias, killing the four-way version drift. Each game still builds independently into `dist/<id>/` and uploads to its own key prefix in one bucket, so one origin does not mean one build. A generated `src/host/registry.ts` replaces `lobby/src/core/registry.ts`.

**Tech Stack:** TypeScript 5.4, Vite 8, Vitest 4, Node 20+ (CI on 22), Cloudflare R2 + wrangler, GitHub Actions.

## Global Constraints

- **No game's `main.ts` is modified by this epic.** The boot helper is deferred (spec §4.3). If a task seems to require touching a game's `main.ts` beyond an import-path rewrite, stop and escalate.
- **Node** `>=20` locally; CI uses `node-version: 22`.
- **Pinned dev dependencies, root only:** `typescript@^5.4.0`, `vite@^8.1.0`, `vitest@^4.1.9`, `@types/node@^20.19.43`, `jsdom@^29.1.1`, `@types/jsdom@^28.0.3`.
- **`repos.yaml` `branch_strategy` MUST be the literal string `trunk-based`.** pf's `branch_protection.py` compares against that exact spelling; any other value silently protects `main` and blocks direct sprint commits.
- **Vite base:** `/<id>/` for every game, `/` for the lobby.
- **Bucket:** `arcade-lobby`. **Cloudflare account:** `a55aafa9b0691f828cd6864be28c1674`.
- **Release tags:** `<game>-vX.Y.Z` (e.g. `tempest-v1.0.29`). Unprefixed `vX.Y.Z` tags are invalid in the monorepo.
- **CI checkout MUST use `fetch-depth: 0`.** tempest's and red-baron's citation gates read blobs from historical commits; a shallow clone fails them.
- **Games with no high-score persistence:** red-baron, joust. Do not add storage to them.
- **Version numbers written inline in Tasks 6-12 are ILLUSTRATIVE.** Task 1's
  `just release-all` bumps every app, so the authoritative values are the ones recorded in
  `docs/ops/migration-manifest.md`. Read them from there; never copy a version out of this
  plan.
- **The lobby carries a showcase carousel** (`lobby/src/core/showcase.ts`,
  `lobby/src/shell/showcase.ts`, `just check-showcase`) that reads `showcase` and
  `launchUrl` from the registry. `GameMeta` carries `showcase` and `order`; both are
  required and never defaulted.
- **TOPOLOGY TESTS: 171 tests across the seven games assert the topology this migration removes.** Measured, per game: tempest 12, star-wars 17, asteroids 17, battlezone 38, red-baron 27, centipede 26, joust 34. They live in `scaffold.test.ts`, `rng-extraction.test.ts`, `loop-extraction.test.ts`, `highscore-extraction.test.ts`, `audio-migration.test.ts`, `arcade-shared-pipe.test.ts` and `pause-adoption.test.ts`, and they assert things that are **deliberately gone** after the collapse: the `@arcade/shared` git-URL pin, per-game `dev`/`build`/`test` scripts, pinned dev ports, `strictPort` on server and preview, `base: '/'`, and the ten-line per-repo CI deploy caller.

  **Policy — the invariant moves, it does not evaporate.** This is not licence to delete failing tests. The codebase already states the rule, in centipede's own `scaffold.test.ts`: *"The cross-repo wiring invariants … live in the ORCHESTRATOR suite … a subrepo test must never file-read orchestrator docs (tp1 lesson)."* After the collapse **all** of this is cross-repo wiring, so it belongs in the orchestrator suite — asserted **once** for the whole cabinet instead of seven near-identical times.

  Therefore, in each import task (6–12):
  1. Remove only assertions that are false **by design** because the thing they check no longer exists.
  2. **Record the exact count removed per file, with the reason**, in that task's report. A falling test count is a finding to be justified, never tidying.
  3. Rewrite, do not delete, any assertion whose *intent* survives — `@arcade/shared/rng` becoming `@shared/rng` is a specifier change, and that test should still assert the consumer imports shared RNG.
  4. Do NOT re-create a removed assertion inside another game. Seven copies of one invariant is the duplication this epic exists to delete.
  5. **`scaffold.test.ts` is TWO DIFFERENT FILES across the fleet. Never generalise one game's handling of it to another.** Measured, by `describe` block:

     **The table below is by measured `describe` TITLE, not by index — read the titles in the file
     and match on those.** An earlier version of this table omitted the `package.json scripts`
     describe in all four multi-describe games (PLAN DEFECT #13, found while dispatching Task 9),
     which would have left 7 assertions demanding per-game `dev`/`build`/`test` scripts that the
     monorepo deliberately removes.

     | game | describes | DELETE (false by design) | REWRITE (intent survives) | KEEP unchanged |
     |---|---|---|---|---|
     | tempest, star-wars, asteroids | **1** (5 assertions) | the whole file — it is only the `vite.config.ts` dev/preview contract | — | — |
     | battlezone | **5** (22) | `vite.config.ts`, `package.json scripts` | `tsconfig.json`, `Math Box … from @arcade/shared (SH-2)` | `index.html boots a canvas` |
     | red-baron | **5** (22) | `vite.config.ts`, `package.json scripts` | `tsconfig.json`, `first native @arcade/shared consumer` | `index.html boots a canvas` |
     | centipede | **6** (26) | `vite.config.ts`, `package.json scripts`, `CI deploy caller` | `tsconfig.json` | `index.html boots a canvas`, **`src/core + src/shell skeletons`** |
     | joust | **8** (34) | `vite.config.ts`, `strictPort is real (behavioural)`, `package.json scripts`, `fresh-checkout hygiene`, `CI deploy caller` | `tsconfig.json` | `index.html boots a canvas`, **`src/core + src/shell skeletons`** |

     In the four multi-describe games the vite/CI describes are a **minority** of the file. The rest assert things the collapse does **not** remove:

     - `index.html boots a canvas via src/main.ts` — **survives unchanged.** This epic never modifies a game's `main.ts`.
     - `src/core + src/shell skeletons (the boundary the epic lives on)` — **survives unchanged.** This is the single most important rule in every game repo.
     - `tsconfig.json (TypeScript strict…)` — **intent survives, form changes.** The per-game tsconfig becomes a stub extending the root, so rewrite it to assert the `extends` chain still reaches strict; do not delete it. Note the concrete break: these describes assert on the file's **raw text** (`expect(read('tsconfig.json')).toMatch(/"strict":\s*true/)`), and the stub contains only `extends` + `include`, so the text match fails even though strictness is fully intact. Rewrite it to follow the `extends` chain, or read the root config.
     - `Math Box is consumed from @arcade/shared, not a local copy (SH-2)` (battlezone) and `first native @arcade/shared consumer (proves the dependency pipe)` (red-baron) — **intent survives**, specifier rewrite to `@shared`.
     - `package.json scripts (verbatim from the sibling games)` and `CI deploy caller (.github/workflows/deploy.yml)` — **false by design**; the root owns both.
     - joust only: `strictPort is real, not just declared (behavioural)` — false by design here; this is the behavioural half of the host pin and **Task 12b re-establishes it once**, so it is moving, not dying.
     - joust only: `fresh-checkout hygiene (npm install from a clean clone)` — false by design; the root owns install.

     **Deleting a whole `scaffold.test.ts` because another game's was deletable would silently drop the core/shell boundary guard, and the suite would go GREENER.** That is this epic's documented recurring failure mode — an accurate report, a green suite, and a vanished guarantee. Account for this file describe by describe, never file by file.
- **The `@arcade/shared` grep must tolerate escaped forms.** A plain `grep "@arcade/shared"` **misses** `@arcade\/shared\/highscore` — the backslash-escaped form that appears inside regex literals in source-wiring tests, and which Task 5 hit for real. Use `grep -rnE '@arcade\\?/shared'`, and also check for the bare word pair, since a stale *comment* may say "arcade shared" without a slash at all:

  ```bash
  grep -rnE '@arcade\\?/shared' plugins/<id>/ ; grep -rni "arcade.\{0,3\}shared" plugins/<id>/ | grep -v "@shared"
  ```

  A source-wiring test that greps its own source for an import specifier is a *test* of the migration, not a casualty of it — rewrite its expected string, never delete the test.

  Task 12b then adds the consolidated orchestrator-level assertions covering everything the removals gave up. Until 12b lands, those invariants are unguarded — a bounded, explicitly accepted window.
- Every commit message ends with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

## File Structure

**Created:**
- `package.json` (rewritten) — the only file with dependencies
- `tsconfig.json` — base config + `@shared/*` and `@host/*` aliases
- `vitest.config.ts` — one project per app, each rooted at its own directory
- `vite.config.ts` — config factory keyed by app id
- `src/shared/**` — imported from `arcade-shared/src/**`
- `src/host/contract.ts` — `GameMeta`, `validateMeta`
- `src/host/registry.ts` — generated
- `scripts/gen-registry.mjs`, `scripts/build-app.mjs`
- `plugins/<id>/plugin.ts`, `plugins/<id>/package.json`, `plugins/<id>/tsconfig.json` (×7)
- `.github/workflows/deploy.yml` — one tag-triggered workflow
- `tests/registry.test.mjs`, `tests/audit-refs.test.mjs`

**Moved:**
- `<game>/**` → `plugins/<game>/**` (×7), `arcade-shared/src/**` → `src/shared/**`

**Modified:**
- `.gitignore` — remove the nine subrepo entries
- `scripts/deploy-r2.mjs` — accept a key prefix
- `scripts/release.mjs` — per-game gate, prefixed tags, no develop→main merge
- `justfile` — one dev server, prefixed deploys
- `lobby/src/core/registry.ts` → deleted; `lobby/src/shell/tiles.ts`, `lobby/src/main.ts` consume `@host/registry`
- `src/shared/highscore.ts` — null-domain guard + seed-from-cookie
- `.pennyfarthing/repos.yaml`, `CLAUDE.md`, `docs/ops/hosting.md`, `docs/adr/0001-*.md`, `docs/adr/0004-*.md`

**Deleted:**
- 8× `vite.config.ts`, 8× `tsconfig.json`, 8× `package.json` (replaced by 3-field stubs), 8× `.github/workflows/deploy.yml`, `.github/workflows/deploy-r2.yml`, `arcade-shared/` (archived remotely)

---

## Task 1: Preflight — land in-flight work and record the migration manifest

Nothing may move until the fleet is quiescent and the facts are written down. The manifest is the only record of where the code came from once history is squashed.

**Files:**
- Create: `docs/ops/migration-manifest.md`

**Interfaces:**
- Produces: `docs/ops/migration-manifest.md` containing, per repo, the source SHA on `develop` and the released version — consumed by Tasks 4–12 for their import commit messages, and by Task 3 for the audit-commit list.

- [ ] **Step 1: Confirm the fleet has no open PRs**

```bash
for r in tempest star-wars asteroids battlezone red-baron centipede joust lobby arcade-shared; do
  echo "$r: $(gh pr list -R slabgorb/$r --state open --json number -q 'length') open"
done
```

Expected: every line reads `0 open`. If any repo has an open PR, stop — merge or close it first.

- [ ] **Step 2: Land a-2's in-flight star-wars work**

a-2 holds `feat/sw8-8-incoming-fire-reaction-window` with uncommitted files. Either commit and push it, or accept replaying it by hand into `plugins/star-wars/` later.

```bash
git -C /Users/slabgorb/Projects/a-2/star-wars status --porcelain
git -C /Users/slabgorb/Projects/a-2/star-wars add -A
git -C /Users/slabgorb/Projects/a-2/star-wars commit -m "feat(sw8-8): incoming-fire reaction window

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git -C /Users/slabgorb/Projects/a-2/star-wars push -u origin feat/sw8-8-incoming-fire-reaction-window
```

Then merge it to `develop` through the normal PR flow before continuing.

- [ ] **Step 3: Verify every checkout is clean**

```bash
for c in a-1 a-2 a-3; do
  for r in tempest star-wars asteroids battlezone red-baron centipede joust lobby arcade-shared; do
    d=/Users/slabgorb/Projects/$c/$r
    [ -d "$d/.git" ] && [ -n "$(git -C "$d" status --porcelain)" ] && echo "DIRTY: $c/$r"
  done
done
echo "(silence = all clean)"
```

Expected: silence.

- [ ] **Step 4: Release every game once more from the old world**

```bash
just release-all patch
```

Expected: each repo bumps, tags, pushes, and its CI deploys green. This puts production at a known tag per game, which is the rollback target for the whole epic.

- [ ] **Step 5: Write the migration manifest**

```bash
{
  echo "# Migration manifest — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "Source of truth for where each tree came from. History is squashed on import;"
  echo "this file and the archived repos are the only provenance record."
  echo
  echo "| repo | source SHA (develop) | released version |"
  echo "|---|---|---|"
  for r in lobby tempest star-wars asteroids battlezone red-baron centipede joust arcade-shared; do
    sha=$(git -C "$r" rev-parse develop)
    ver=$(node -p "require('./$r/package.json').version")
    echo "| $r | \`$sha\` | $ver |"
  done
} > docs/ops/migration-manifest.md
cat docs/ops/migration-manifest.md
```

- [ ] **Step 6: Record the real Cloudflare inventory**

`docs/ops/hosting.md` and `lobby/src/core/registry.ts` disagree about which buckets exist, and joust's was never created. The teardown in Task 24 must work from reality.

```bash
npx wrangler r2 bucket list >> docs/ops/migration-manifest.md
```

Append the live custom-domain bindings for each bucket from the Cloudflare dashboard (R2 → bucket → Settings → Public access) under a `## Custom domains` heading. Do not guess from either document.

- [ ] **Step 7: Commit**

```bash
git add docs/ops/migration-manifest.md
git commit -m "chore(migrate): record source SHAs, versions, and the real R2 inventory

Preflight for the monorepo collapse. History is squashed on import, so this
file plus the archived repos are the only provenance record.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Preserve the audit commits that two citation gates depend on

tempest's and red-baron's citation gates verify findings against the code *as it was audited*, by reading blobs from a hardcoded commit. A squashed import destroys those commits and both gates fail permanently — meaning neither game could ever release again. Fetching the commits and pinning them with tags fixes this with **zero change to the gates**, which is far safer than hand re-anchoring pinned line numbers.

**Files:**
- Create: `tests/audit-refs.test.mjs`

**Interfaces:**
- Produces: git tags `audit/tempest` → `4232ed4` and `audit/red-baron` → `6038a07b9044f1add37fd12c217cd39ec1629439`, reachable in the monorepo and on `origin`. Tasks 6 and 10 depend on these existing before their suites can pass.

- [ ] **Step 1: Write the failing test**

Create `tests/audit-refs.test.mjs`:

```javascript
// The citation gates in tempest and red-baron read blobs from the commit their
// audit was taken against. Squashing history on import would delete those commits
// and the gates would fail forever. These tags keep them reachable; this test is
// the tripwire that notices if one is ever dropped or gc'd.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const AUDIT_REFS = [
  { tag: 'audit/tempest', sha: '4232ed4', probe: 'src/core/sim.ts' },
  { tag: 'audit/red-baron', sha: '6038a07b9044f1add37fd12c217cd39ec1629439', probe: 'src/core/flight.ts' },
];

for (const { tag, sha, probe } of AUDIT_REFS) {
  test(`${tag} resolves to a reachable commit`, () => {
    const resolved = execFileSync('git', ['rev-parse', `${tag}^{commit}`], { encoding: 'utf8' }).trim();
    assert.ok(resolved.startsWith(sha.slice(0, 7)), `${tag} points at ${resolved}, expected ${sha}`);
  });

  test(`${tag} can still serve blobs at the audited paths`, () => {
    // The gates call `git show <sha>:<path>` with paths relative to the OLD repo
    // root (src/…), not the monorepo path (plugins/<game>/src/…). The historical
    // commit's tree carries the old layout, which is exactly why this works.
    const text = execFileSync('git', ['show', `${sha}:${probe}`], { encoding: 'utf8' });
    assert.ok(text.length > 0, `${sha}:${probe} came back empty`);
  });
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/audit-refs.test.mjs`
Expected: FAIL — `git rev-parse audit/tempest^{commit}` exits non-zero because the tag does not exist yet.

- [ ] **Step 3: Fetch the commits and create the tags**

Fetch from the **local checkouts**, not from GitHub. Both objects are verified present in `./tempest/.git` and `./red-baron/.git` right now, whereas a GitHub fetch of a bare SHA can be refused with `Server does not allow request for unadvertised object`. This step **must** run before Tasks 6 and 10 delete those `.git` directories.

```bash
# Verify the source objects exist before relying on them.
git -C tempest   cat-file -e 4232ed4^{commit} || { echo "tempest audit commit missing"; exit 1; }
git -C red-baron cat-file -e 6038a07b9044f1add37fd12c217cd39ec1629439^{commit} || { echo "red-baron audit commit missing"; exit 1; }

git fetch --no-tags "$PWD/tempest"   4232ed4
git tag audit/tempest 4232ed4

git fetch --no-tags "$PWD/red-baron" 6038a07b9044f1add37fd12c217cd39ec1629439
git tag audit/red-baron 6038a07b9044f1add37fd12c217cd39ec1629439
```

Note that tagging a commit keeps its whole ancestor chain reachable, so each game's history up to its audit point comes along. That is accepted: it is detached from `main`, it is what makes the gates work unmodified, and it is far cheaper than re-anchoring pinned line numbers by hand.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/audit-refs.test.mjs`
Expected: PASS, 4 tests.

- [ ] **Step 5: Push the tags and commit the test**

```bash
git push origin audit/tempest audit/red-baron
git add tests/audit-refs.test.mjs
git commit -m "chore(migrate): pin the audit commits tempest and red-baron cite

Both citation gates resolve blobs via \`git show <AUDIT_COMMIT>:<path>\`. The
squashed import would delete those commits and red the gates permanently, so the
commits are fetched and tagged. The gates themselves are untouched — re-anchoring
pinned line numbers by hand is the failure mode this avoids.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Root toolchain skeleton

Stand up the single toolchain before any code moves, so each import can be verified immediately.

**Files:**
- Modify: `package.json`
- Create: `tsconfig.json`, `vitest.config.ts`, `vite.config.ts`

**Interfaces:**
- Produces: the `@shared/*` → `src/shared/*` and `@host/*` → `src/host/*` path aliases; `defineAppConfig(id)` from `vite.config.ts`; a `vitest.config.ts` whose `test.projects` array later tasks append one entry per app.

- [ ] **Step 1: Rewrite the root package.json**

```json
{
  "name": "arcade",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "description": "The arcade: a plugin host for browser-based vector and raster arcade-game clones.",
  "engines": { "node": ">=20" },
  "scripts": {
    "build": "node scripts/build-app.mjs",
    "test": "vitest run --passWithNoTests",
    "test:watch": "vitest",
    "lint": "tsc --noEmit",
    "test:orchestrator": "node --test 'tests/**/*.test.mjs'",
    "gen:registry": "node scripts/gen-registry.mjs"
  },
  "devDependencies": {
    "@types/jsdom": "^28.0.3",
    "@types/node": "^20.19.43",
    "jsdom": "^29.1.1",
    "typescript": "^5.4.0",
    "vite": "^8.1.0",
    "vitest": "^4.1.9"
  }
}
```

- [ ] **Step 2: Create the base tsconfig**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals", "vite/client", "node"],
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@host/*": ["src/host/*"]
    }
  },
  "include": ["src", "plugins", "lobby", "scripts"]
}
```

`resolveJsonModule` is required — each `plugin.ts` imports its own `package.json` for the version.

- [ ] **Step 3: Create the Vite config factory**

```typescript
// vite.config.ts — one factory, parameterised by app id. Replaces eight
// near-identical per-repo configs.
//
// Every game is served under /<id>/ on the single origin; the lobby is the root.
// The old per-repo `strictPort` + `host: '127.0.0.1'` pinning is gone: there is
// exactly one dev server now, so there is no eight-way port collision to guard.
import { defineConfig, type UserConfig } from 'vite'
import { resolve } from 'node:path'

const root = import.meta.dirname

export interface AppSpec {
  /** App id: a game's directory name under plugins/, or 'lobby'. */
  id: string
  /** Extra HTML entries beyond index.html (e.g. tempest's models.html). */
  entries?: readonly string[]
}

export function defineAppConfig({ id, entries = [] }: AppSpec): UserConfig {
  const isLobby = id === 'lobby'
  const appRoot = isLobby ? resolve(root, 'lobby') : resolve(root, 'plugins', id)
  const input: Record<string, string> = { main: resolve(appRoot, 'index.html') }
  for (const entry of entries) {
    input[entry.replace(/\.html$/, '')] = resolve(appRoot, entry)
  }
  return {
    root: appRoot,
    base: isLobby ? '/' : `/${id}/`,
    resolve: {
      alias: {
        '@shared': resolve(root, 'src/shared'),
        '@host': resolve(root, 'src/host'),
      },
    },
    build: {
      outDir: isLobby ? resolve(root, 'dist') : resolve(root, 'dist', id),
      emptyOutDir: true,
      rollupOptions: { input },
    },
  }
}

// Bare `vite` / `vite dev` at the repo root serves the whole cabinet from the
// lobby's root: / is the lobby, /<id>/ is each game.
export default defineConfig(defineAppConfig({ id: 'lobby' }))
```

- [ ] **Step 4: Create the vitest projects config**

```typescript
// vitest.config.ts — one project per app, each ROOTED AT ITS OWN DIRECTORY.
//
// The per-app `root` is load-bearing, not tidiness: tempest's, star-wars's,
// centipede's and red-baron's citation gates read paths like 'src/core/sim.ts'
// through a bare readFileSync resolved against cwd, and the core/shell purity
// scanners scan relative source paths. Rooting each project at its own directory
// means none of them notice the move, so no path re-anchoring is needed.
import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

const root = import.meta.dirname
const alias = {
  '@shared': resolve(root, 'src/shared'),
  '@host': resolve(root, 'src/host'),
}

const GAMES = [
  'tempest',
  'star-wars',
  'asteroids',
  'battlezone',
  'red-baron',
  'centipede',
  'joust',
] as const

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'shared',
          root: resolve(root, 'src/shared'),
          globals: true,
          environment: 'node',
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'host',
          root: resolve(root, 'src/host'),
          globals: true,
          environment: 'node',
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'lobby',
          root: resolve(root, 'lobby'),
          globals: true,
          // 'node', NOT 'jsdom'. This matches lobby's own vite.config.ts: the
          // project default is node, and the four tests that need a DOM opt in
          // per-file with a `// @vitest-environment jsdom` docblock
          // (tiles, showcase-dom, refresh, main). Forcing jsdom project-wide
          // BREAKS two other tests — storage.test.ts and refresh-rules.test.ts
          // call fileURLToPath(new URL(...)), and jsdom's URL global does not
          // round-trip through it ("The URL must be of scheme file").
          environment: 'node',
        },
      },
      ...GAMES.map((id) => ({
        resolve: { alias },
        test: {
          name: id,
          root: resolve(root, 'plugins', id),
          globals: true,
          environment: 'node' as const,
        },
      })),
    ],
  },
})
```

- [ ] **Step 5: Install and verify the toolchain resolves**

```bash
npm install
npx tsc --noEmit
npx vitest run --passWithNoTests
```

Expected: `npm install` succeeds; `tsc` reports no errors (nothing to compile yet); vitest reports no test files and exits 0 thanks to `--passWithNoTests`.

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json vite.config.ts vitest.config.ts package-lock.json
git commit -m "chore(migrate): root toolchain — one package.json, vite factory, vitest projects

Replaces eight copies of each config. Per-app vitest root is load-bearing: the
citation gates and purity scanners resolve paths against cwd, so rooting each
project at its own directory means they need no re-anchoring.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Import arcade-shared into src/shared

**Files:**
- Create: `src/shared/**` (from `arcade-shared/src/**`)
- Modify: `src/shared/tests/purity.test.ts` — scan source instead of a built `dist/`
- Modify: `.gitignore` — drop `/arcade-shared/`

**Interfaces:**
- Produces: `@shared/highscore`, `@shared/math3d`, `@shared/rng`, `@shared/loop`, `@shared/font`, `@shared/pause`, `@shared/glow`, `@shared/view`, `@shared/audio`, `@shared/synth`, `@shared/esc-overlay`, `@shared/name-entry` — consumed by every game import in Tasks 5–12.

### ⚠ Read before starting: arcade-shared's tests have never been typechecked

`arcade-shared` has **no tsconfig at all**. Its tests are run by vitest, which strips types without checking them, so `src/shared/tests/**` has never been compiled. The root tsconfig's `include` covers `src`, which would put those files inside `tsc --noEmit` for the first time.

I measured it: **22 pre-existing type errors**, almost all hand-rolled WebAudio doubles that never satisfied the real types (`FakeAudioContext` is not assignable to `AudioContext`; `FakeGain` likewise), plus a few `possibly undefined` and empty-tuple indexing errors in `tests/synth.test.ts`.

**Decision: exclude `src/shared/tests/**` from the root tsconfig, and file the 22 errors as their own story.**

This preserves the pre-migration behaviour *exactly* — those files were never typechecked before and are not typechecked now. It is deliberately NOT a blanket "exclude tests": each game's own tsconfig has always had `include: ["src", "tests"]`, so the games' tests **are** typechecked today and must stay that way. Excluding them all would silently drop real coverage.

Add to the root `tsconfig.json`:

```jsonc
{
  // arcade-shared shipped with no tsconfig, so its tests were never compiled — only
  // run through vitest, which strips types. Folding them into `src` would newly
  // typecheck them and surface 22 pre-existing errors in test doubles. Excluded to
  // hold the pre-migration line; the errors are a filed story, not a silent pass.
  // NOTE: this is scoped to src/shared/tests ONLY. Every game's tests remain
  // typechecked, exactly as they were in their own repos.
  "exclude": ["src/shared/tests"]
}
```

Do **not** attempt to fix the 22 errors in this task, and do **not** widen the exclude to cover any game's tests.

- [ ] **Step 1: Move the tree**

`src/shared/` already exists carrying a `.gitkeep` from Task 3 — remove it once real files land, or it ships as noise.

```bash
cp -R arcade-shared/src/. src/shared/
cp -R arcade-shared/tests src/shared/tests
rm -f src/shared/.gitkeep
```

- [ ] **Step 2: Drop the subrepo from .gitignore**

Remove the `/arcade-shared/` line from `.gitignore`, leaving the other eight for now (each import task removes its own).

- [ ] **Step 2b: Remove the stale `exclude` left by Task 3**

`vitest.config.ts` lines 54-55 carry a leftover from a design that was superseded:

```typescript
// Task 21 adds a jsdom sibling project for the cookie-migration tests.
exclude: ['**/node_modules/**', '**/*.dom.test.ts'],
```

Task 21 no longer adds a sibling project — it uses a `// @vitest-environment jsdom` docblock instead, matching the lobby's idiom. Delete both the comment and the `exclude` line from the `shared` project entry.

This matters beyond tidiness: leaving it means Task 21's `highscore.dom.test.ts` would be **excluded from the only project that would run it**, so the high-score migration test would silently never execute — and a test that never runs is indistinguishable from a passing one.

- [ ] **Step 3: Run the shared tests to see the purity test fail**

Run: `npx vitest run --project shared`
Expected: FAIL — `tests/purity.test.ts` cannot find `dist/`, because the package boundary and its `prepare` build are gone.

- [ ] **Step 4: Rewrite the purity test to scan source**

In `src/shared/tests/purity.test.ts`, replace the `dist/` scan with a source scan. The scanner must stay **comment-inclusive** — naming a forbidden global inside a comment must still fail, which is the property that caught real bugs.

```typescript
// SH2 purity guard. Was: scan the BUILT dist/ as source text, behind a `pretest`
// build. There is no dist/ any more — no package boundary, no prepare step — so
// this scans src/ directly. The scan stays deliberately comment-inclusive: a
// forbidden global named in a comment still fails, because that is how the
// original guard caught the real leaks.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const SHARED_ROOT = resolve(import.meta.dirname, '..')
const FORBIDDEN = /\b(document|window|canvas|FontFace)\b/

// BROWSER subpaths (ADR-0003) are exempt: they legitimately touch a canvas ctx
// or element handed in by the caller. They reference no DOM *global*.
const BROWSER_SUBPATHS = new Set(['view.ts', 'esc-overlay.ts', 'glow.ts', 'font.ts', 'audio.ts'])

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'tests' || entry === 'node_modules') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full))
    else if (entry.endsWith('.ts')) out.push(full)
  }
  return out
}

describe('shared purity', () => {
  it('no pure subpath names a DOM global, comments included', () => {
    const offenders: string[] = []
    for (const file of sourceFiles(SHARED_ROOT)) {
      const name = file.slice(SHARED_ROOT.length + 1)
      if (BROWSER_SUBPATHS.has(name)) continue
      const text = readFileSync(file, 'utf8')
      if (FORBIDDEN.test(text)) offenders.push(name)
    }
    expect(offenders).toEqual([])
  })
})
```

- [ ] **Step 5: Run the shared tests to verify they pass**

Run: `npx vitest run --project shared`
Expected: PASS at **25 test files / 508 tests** — the measured pre-migration baseline. Fewer means files were dropped in the copy.

If the purity test reports offenders, the `BROWSER_SUBPATHS` exemption list must match the set that was exempt under the old `dist/` scan — **read the original test's list and copy it exactly.** The list written in this plan is a guess and is very likely wrong; the original is authoritative.

Then confirm the typecheck holds:

Run: `npx tsc --noEmit`
Expected: exit 0. If it reports errors inside `src/shared/tests/`, the `exclude` from the section above is missing or misspelled. If it reports errors in `src/shared/*.ts` (not tests), those are real and in scope — the library source *was* compiled before, by arcade-shared's own build.

- [ ] **Step 6: Commit**

```bash
git add src/shared .gitignore
git commit -m "chore(migrate): import arcade-shared as src/shared

Direct imports via @shared/*; the git-URL dep, tag pinning, prepare build and
dist/ staleness class are all gone. The purity guard now scans src/ rather than a
built dist/, staying comment-inclusive.

Source: see docs/ops/migration-manifest.md

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Import the lobby

**Files:**
- Move: `lobby/**` → stays at `lobby/` but becomes tracked
- Delete: `lobby/vite.config.ts`, `lobby/.github/`, `lobby/package-lock.json`
- Replace: `lobby/package.json` with a `{name, version, private}` stub; `lobby/tsconfig.json` with one extending the root
- Modify: `lobby/src/**` — rewrite `@arcade/shared/*` imports to `@shared/*`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `@shared/highscore` (Task 4).
- Produces: a tracked `lobby/` passing under the `lobby` vitest project, and a `lobby/package.json` carrying the version that `just release lobby` bumps and tags.

**The count MUST fall: 11 files / 127 tests → 10 / 122.** The pre-migration baseline is a
comparison point, never a target — `tests/scaffold.test.ts` asserts the `lobby/vite.config.ts` that
Step 1 deletes, so the whole file goes. This is defect #9's shape (a bare number that reads like an
order) and it was corrected for Tasks 6–12 but missed here. Removals are still counted and
justified per file in the report, per the topology policy in Global Constraints.

**FIX ROUND — added after Task 5's review, owner ruling 2026-07-30.** The review returned four
Important findings; two of them (`base: '/'` and the dev-server host pin) were invariants whose
intent survives, and the owner ruled they be closed **in place here** rather than left unguarded
until Tasks 19/12b. See Step 4 below.

**`lobby/package.json` is REPLACED, not deleted.** An earlier draft of this plan deleted it, which would have broken Task 17: `just release lobby` bumps a version and tags `lobby-vX.Y.Z`, and with no `package.json` there is nothing to bump or read. The lobby gets the same three-field stub every game gets — no dependencies, no scripts, because the root owns the toolchain.

- [ ] **Step 1: Strip the per-repo tooling and untrack the subrepo**

```bash
rm -rf lobby/.git lobby/.github lobby/node_modules
rm -f lobby/vite.config.ts lobby/package-lock.json
```

Note `lobby/tsconfig.json` and `lobby/package.json` are **replaced** in the next step, not deleted here.

- [ ] **Step 1b: Write the stub package.json and tsconfig**

`lobby/package.json` — read the version from `docs/ops/migration-manifest.md`, do not copy the number below:

```json
{
  "name": "lobby",
  "version": "0.0.22",
  "private": true
}
```

`lobby/tsconfig.json`:

```json
{
  "extends": "../tsconfig.json",
  "include": ["src", "tests"]
}
```

Note the single `../` — the lobby sits one level down, unlike the games at `plugins/<id>/` which need `../../`.

- [ ] **Step 2: Remove /lobby/ from .gitignore**

- [ ] **Step 3: Rewrite the shared imports**

```bash
grep -rl "@arcade/shared" lobby/src lobby/tests \
  | xargs sed -i '' 's|@arcade/shared/|@shared/|g'
grep -rn "@arcade/shared" lobby/ || echo "no @arcade/shared references remain"
```

- [ ] **Step 4: Run the lobby tests**

Run: `npx vitest run --project lobby`
Expected: PASS, 11 test files (127 tests). A failure here is an unrewritten import or a missing jsdom environment — check `vitest.config.ts`'s lobby project has `environment: 'jsdom'`.

- [ ] **Step 5: Commit**

```bash
git add lobby .gitignore
git commit -m "chore(migrate): import the lobby

Per-repo vite/tsconfig/package/CI removed; @arcade/shared/* imports rewritten to
@shared/*. The hardcoded registry is replaced in a later task.

Source: see docs/ops/migration-manifest.md

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Step 4 (FIX ROUND): close the two orphaned invariants and the stale README**

Added after review. Steps 1–3 and 5 are already done and committed at `030b19d`; this step is the
delta.

**4a — Restore the host pin to the root `vite.config.ts`.** The guard is absent from the product,
not just from the deleted test: the factory has **no `server`/`preview` block at all**, and its
header comment at `:5-6` asserts the disproven rationale ("there is exactly one dev server now, so
there is no eight-way port collision to guard"). Replace that comment and add both blocks to
`defineAppConfig`'s returned config:

```typescript
    // ONE dev server for the cabinet, but the pin still matters. strictPort alone
    // does NOT protect it: with 127.0.0.1:5270 held by another checkout (a-2, a-3),
    // an unpinned host lets Vite bind [::1]:5270 instead and two servers share the
    // port with no error — the silent-wrong-checkout trap td1-1 closed fleet-wide.
    // Collapsing eight ports to one reduces that surface; it does not remove it,
    // and a wrong-checkout server now serves the whole cabinet, not one game.
    server: { host: '127.0.0.1', port: 5270, strictPort: true },
    preview: { host: '127.0.0.1', port: 5270, strictPort: true },
```

This is verbatim what **Task 19 Step 0** used to own; that step is now a verify-only check, so do
not expect a later task to add it.

**4b — Seed `tests/monorepo-topology.test.mjs` with the two invariants the deleted
`scaffold.test.ts` orphaned.** Task 12b consolidates the seven games' share into this same file
later and has been amended to **extend, not create** it. Add only these two tests — the games'
share is not yours:

- `defineAppConfig({ id: 'lobby' }).base === '/'` — the intent of the deleted `serves under base /`.
- `host === '127.0.0.1'` on **both** the `server` and `preview` blocks, with a comment stating why
  `strictPort` alone does not protect the pin (the cross-checkout `[::1]` bind).

Import the factory the way 12b does: `const { defineAppConfig } = await import('../vite.config.ts')`.

**4c — Rewrite `lobby/README.md`.** It was imported unchanged and no task in the plan owns it
(`grep -i readme` over this plan returned zero hits before this amendment). It is now false in five
places, two of them actively harmful:

- `:19` tells the reader to run `npm install` inside `lobby/` — which creates precisely the per-app
  lockfile Task 12b asserts must not exist.
- `:46` documents `vX.Y.Z` release tags, which this epic declares **invalid** in the monorepo
  (`<app>-vX.Y.Z` is the form).
- `:20` dev server on port 5270 via `npm run dev`; `:35` a `vite.config.ts` this task deletes;
  `:40` "Served under `/lobby/`" when the lobby's base is `/`; `:47` a `.github/workflows/deploy.yml`
  this task deletes.

Point the commands at the root (`npm install` and `just serve` from the repo root), correct the
tag format, correct the base, and drop the references to deleted files. Do not invent new workflow:
describe what the monorepo actually does now.

**Report:** append a fix report to `task-5-report.md` covering 4a/4b/4c, the covering tests, the
command run, and its output.

---

## Task 6: Import tempest

The hardest game import: it carries a citation gate that reads git history (Task 2's `audit/tempest` tag) and a second HTML entry.

**Files:**
- Move: `tempest/**` → `plugins/tempest/**`
- Create: `plugins/tempest/package.json`, `plugins/tempest/tsconfig.json`
- Delete: `plugins/tempest/vite.config.ts`, `plugins/tempest/.github/`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `@shared/*` (Task 4), the `audit/tempest` tag (Task 2).
- Produces: `plugins/tempest/` with all 150 test files green **minus the topology assertions removed under the Step 5 policy** (the pre-migration measurement is 150 files / 1747 tests; the plan's old "149" was an undercount from a `find` sweep), and a `models.html` second entry recorded for Task 16's build spec.

- [ ] **Step 1: Move the tree and strip per-repo tooling**

```bash
mkdir -p plugins
git mv --force tempest plugins/tempest 2>/dev/null || mv tempest plugins/tempest
rm -rf plugins/tempest/.git plugins/tempest/.github plugins/tempest/node_modules
rm -f plugins/tempest/vite.config.ts plugins/tempest/tsconfig.json \
      plugins/tempest/package-lock.json
```

- [ ] **Step 2: Write the minimal package.json**

Read the version recorded in `docs/ops/migration-manifest.md` and use it verbatim.

```json
{
  "name": "tempest",
  "version": "1.0.28",
  "private": true
}
```

No dependencies and no scripts: the root owns the toolchain. This file exists so `npm version` still works per game and so `plugin.ts` can import its own version.

- [ ] **Step 3: Write the per-game tsconfig**

```json
{
  "extends": "../../tsconfig.json",
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: Remove /tempest/ from .gitignore and rewrite shared imports**

```bash
grep -rlE '@arcade\\?/shared' plugins/tempest/src plugins/tempest/tests \
  | xargs sed -i '' 's|@arcade/shared/|@shared/|g'
grep -rnE '@arcade\\?/shared' plugins/tempest/ || echo "clean"
```

- [ ] **Step 5: Run tempest's suite**

Run: `npx vitest run --project tempest`
Expected: PASS — but **NOT at the 150 files / 1747 tests pre-migration baseline.** This game's topology tests assert the very things the collapse removes, so a count *below* baseline is EXPECTED here. Apply the Global Constraints' topology policy: remove only assertions false **by design**, **rewrite — never delete —** any whose intent survives (`@arcade/shared/rng` → `@shared/rng` is a specifier change; that test must still assert the consumer imports shared RNG), and record the **exact count removed per file, with the reason**, in your report. Never delete a test to reach a number, and never leave a removal unaccounted to protect one.

Measured for tempest before you start: `tests/scaffold.test.ts` (5 assertions, entirely the `vite.config.ts` dev/preview contract Step 1 deletes — the file goes), plus the two `pins @arcade/shared as a git-URL dependency` assertions in `tests/rng-extraction.test.ts` and `tests/loop-extraction.test.ts`. The remaining `rng-extraction`, `loop-extraction` and `pause-adoption` assertions are **specifier rewrites, not removals** — including the two in `pause-adoption` that dynamically `import('@arcade/shared/pause')` and `/esc-overlay`, which become `@shared/*` (the alias is live in `vitest.config.ts`, so the dynamic import resolves).

The host-pin assertion in `scaffold.test.ts` (`pins host 127.0.0.1 on both server and preview`, td1-1) is **not retired** — Task 19 restores that pin at the root and Task 12b asserts it once for the cabinet. Remove it here; do not re-create it in another game.

Also expected to pass: `tests/audit/citations.test.ts` and `tests/audit/citation-gate-freeze.test.ts`, which resolve `git show 4232ed4:src/core/sim.ts`. If those two fail with a git error, Task 2's tag is missing or was not fetched; do not re-anchor the pins.

- [ ] **Step 6: Commit**

```bash
git add plugins/tempest .gitignore
git commit -m "chore(migrate): import tempest as plugins/tempest

Tree moved verbatim — src/core, src/shell, tests, tools/audit and docs keep their
internal paths, so the citation gate and purity scanner need no re-anchoring.
Per-repo vite/tsconfig/CI removed; package.json reduced to name+version+private.

Source: see docs/ops/migration-manifest.md

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: Import star-wars

**Files:**
- Move: `star-wars/**` → `plugins/star-wars/**`
- Create: `plugins/star-wars/package.json`, `plugins/star-wars/tsconfig.json`
- Delete: `plugins/star-wars/vite.config.ts`, `plugins/star-wars/.github/`

**Interfaces:**
- Consumes: `@shared/*` (Task 4).
- Produces: `plugins/star-wars/` with 182 test files green.

- [ ] **Step 1: Move the tree and strip per-repo tooling**

```bash
git mv --force star-wars plugins/star-wars 2>/dev/null || mv star-wars plugins/star-wars
rm -rf plugins/star-wars/.git plugins/star-wars/.github plugins/star-wars/node_modules
rm -f plugins/star-wars/vite.config.ts plugins/star-wars/tsconfig.json \
      plugins/star-wars/package-lock.json
```

- [ ] **Step 2: Write package.json and tsconfig**

`plugins/star-wars/package.json` (version from the manifest):

```json
{
  "name": "star-wars",
  "version": "0.0.33",
  "private": true
}
```

`plugins/star-wars/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Remove /star-wars/ from .gitignore and rewrite shared imports**

```bash
grep -rlE '@arcade\\?/shared' plugins/star-wars/src plugins/star-wars/tests \
  | xargs sed -i '' 's|@arcade/shared/|@shared/|g'
grep -rnE '@arcade\\?/shared' plugins/star-wars/ || echo "clean"
```

- [ ] **Step 4: Run star-wars's suite**

Run: `npx vitest run --project star-wars`
Expected: PASS — but **NOT at the 190 files / 2035 tests pre-migration baseline.** **measured** 15 topology assertions — `scaffold.test.ts` 5 (single `describe`, all the `vite.config.ts` contract → delete the file), `rng-extraction.test.ts` 3, `loop-extraction.test.ts` 3, `pause-adoption.test.ts` 4 — of which only the two `pins @arcade/shared as a git-URL dependency` assertions plus the 5 scaffold ones are false by design. **The other 8 are specifier rewrites.** A count *below* baseline is EXPECTED. Apply the Global Constraints' topology policy: remove only assertions false **by design**, **rewrite — never delete —** any whose intent survives (`@arcade/shared/rng` → `@shared/rng` is a specifier change; that test must still assert the consumer imports shared RNG), and record the **exact count removed per file, with the reason**, in your report. Never delete a test to reach a number. A `scaffold.test.ts` host-pin assertion is **not retired** — Task 19 restores that pin at the root and Task 12b asserts it once; remove it here, do not re-create it elsewhere.

star-wars has a `tools/` test directory and a `tests/support` helper tree — both move with the game and need no path changes.

- [ ] **Step 5: Commit**

```bash
git add plugins/star-wars .gitignore
git commit -m "chore(migrate): import star-wars as plugins/star-wars

Source: see docs/ops/migration-manifest.md

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: Import asteroids

**Files:**
- Move: `asteroids/**` → `plugins/asteroids/**`
- Create: `plugins/asteroids/package.json`, `plugins/asteroids/tsconfig.json`

**Interfaces:**
- Consumes: `@shared/*` (Task 4).
- Produces: `plugins/asteroids/` with 45 test files green.

- [ ] **Step 1: Move the tree and strip per-repo tooling**

```bash
git mv --force asteroids plugins/asteroids 2>/dev/null || mv asteroids plugins/asteroids
rm -rf plugins/asteroids/.git plugins/asteroids/.github plugins/asteroids/node_modules
rm -f plugins/asteroids/vite.config.ts plugins/asteroids/tsconfig.json \
      plugins/asteroids/package-lock.json
```

- [ ] **Step 2: Write package.json and tsconfig**

`plugins/asteroids/package.json` (version from the manifest):

```json
{
  "name": "asteroids",
  "version": "1.0.14",
  "private": true
}
```

`plugins/asteroids/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Remove /asteroids/ from .gitignore and rewrite shared imports**

```bash
grep -rlE '@arcade\\?/shared' plugins/asteroids/src plugins/asteroids/tests \
  | xargs sed -i '' 's|@arcade/shared/|@shared/|g'
grep -rnE '@arcade\\?/shared' plugins/asteroids/ || echo "clean"
```

- [ ] **Step 4: Run asteroids's suite**

Run: `npx vitest run --project asteroids`
Expected: PASS — but **NOT at the 45 files / 831 tests pre-migration baseline.** **measured** 21 topology assertions — `scaffold.test.ts` 5 (single `describe`, all the `vite.config.ts` contract → delete the file), `rng-extraction.test.ts` 3, `loop-extraction.test.ts` 3, `audio-migration.test.ts` 6, `pause-adoption.test.ts` 4. The plan previously said 17; it undercounted `audio-migration.test.ts`. Most of these are **specifier rewrites**, not removals. A count *below* baseline is EXPECTED. Apply the Global Constraints' topology policy: remove only assertions false **by design**, **rewrite — never delete —** any whose intent survives (`@arcade/shared/rng` → `@shared/rng` is a specifier change; that test must still assert the consumer imports shared RNG), and record the **exact count removed per file, with the reason**, in your report. Never delete a test to reach a number. A `scaffold.test.ts` host-pin assertion is **not retired** — Task 19 restores that pin at the root and Task 12b asserts it once; remove it here, do not re-create it elsewhere.

- [ ] **Step 5: Commit**

```bash
git add plugins/asteroids .gitignore
git commit -m "chore(migrate): import asteroids as plugins/asteroids

Source: see docs/ops/migration-manifest.md

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 9: Import battlezone

**Files:**
- Move: `battlezone/**` → `plugins/battlezone/**`
- Create: `plugins/battlezone/package.json`, `plugins/battlezone/tsconfig.json`

**Interfaces:**
- Consumes: `@shared/loop`, `@shared/highscore` (Task 4). battlezone keeps its **own** `src/shell/pause.ts` and `src/shell/viewport.ts` — do not redirect those to the shared modules.
- Produces: `plugins/battlezone/` with 72 test files green.

- [ ] **Step 1: Move the tree and strip per-repo tooling**

```bash
git mv --force battlezone plugins/battlezone 2>/dev/null || mv battlezone plugins/battlezone
rm -rf plugins/battlezone/.git plugins/battlezone/.github plugins/battlezone/node_modules
rm -f plugins/battlezone/vite.config.ts plugins/battlezone/tsconfig.json \
      plugins/battlezone/package-lock.json
```

- [ ] **Step 2: Write package.json and tsconfig**

`plugins/battlezone/package.json` (version from the manifest):

```json
{
  "name": "battlezone",
  "version": "1.0.3",
  "private": true
}
```

`plugins/battlezone/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Remove /battlezone/ from .gitignore and rewrite shared imports**

Only `@arcade/shared/...` specifiers change. battlezone's `./shell/pause` and `./shell/viewport` are local modules and must be left exactly as they are.

```bash
grep -rlE '@arcade\\?/shared' plugins/battlezone/src plugins/battlezone/tests \
  | xargs sed -i '' 's|@arcade/shared/|@shared/|g'
grep -rnE '@arcade\\?/shared' plugins/battlezone/ || echo "clean"
grep -rn "from './shell/pause'" plugins/battlezone/src/main.ts
```

Expected from the last command: one hit, unchanged.

- [ ] **Step 4: Run battlezone's suite**

Run: `npx vitest run --project battlezone`
Expected: PASS — but **NOT at the 72 files / 1057 tests pre-migration baseline.** ~38 of battlezone's assertions are topology tests asserting what the collapse removes — the largest set in the fleet — so a count *below* baseline is EXPECTED. Apply the Global Constraints' topology policy: remove only assertions false **by design**, **rewrite — never delete —** any whose intent survives (`@arcade/shared/rng` → `@shared/rng` is a specifier change; that test must still assert the consumer imports shared RNG), and record the **exact count removed per file, with the reason**, in your report. Never delete a test to reach a number. A `scaffold.test.ts` host-pin assertion is **not retired** — Task 19 restores that pin at the root and Task 12b asserts it once; remove it here, do not re-create it elsewhere.

- [ ] **Step 5: Commit**

```bash
git add plugins/battlezone .gitignore
git commit -m "chore(migrate): import battlezone as plugins/battlezone

Keeps its own shell/pause and shell/viewport — only @arcade/shared specifiers
were rewritten. Shell convergence is a separate epic.

Source: see docs/ops/migration-manifest.md

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 10: Import red-baron

Carries the second git-history citation gate (Task 2's `audit/red-baron` tag) and persists no high scores.

**Files:**
- Move: `red-baron/**` → `plugins/red-baron/**`
- Create: `plugins/red-baron/package.json`, `plugins/red-baron/tsconfig.json`

**Interfaces:**
- Consumes: `@shared/pause`, `@shared/esc-overlay` (Task 4), the `audit/red-baron` tag (Task 2).
- Produces: `plugins/red-baron/` with 81 test files green. **No high-score storage** — do not add any.

- [ ] **Step 1: Move the tree and strip per-repo tooling**

```bash
git mv --force red-baron plugins/red-baron 2>/dev/null || mv red-baron plugins/red-baron
rm -rf plugins/red-baron/.git plugins/red-baron/.github plugins/red-baron/node_modules
rm -f plugins/red-baron/vite.config.ts plugins/red-baron/tsconfig.json \
      plugins/red-baron/package-lock.json
```

- [ ] **Step 2: Write package.json and tsconfig**

`plugins/red-baron/package.json` (version from the manifest):

```json
{
  "name": "red-baron",
  "version": "0.0.23",
  "private": true
}
```

`plugins/red-baron/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Remove /red-baron/ from .gitignore and rewrite shared imports**

```bash
grep -rlE '@arcade\\?/shared' plugins/red-baron/src plugins/red-baron/tests \
  | xargs sed -i '' 's|@arcade/shared/|@shared/|g'
grep -rnE '@arcade\\?/shared' plugins/red-baron/ || echo "clean"
```

- [ ] **Step 4: Run red-baron's suite**

Run: `npx vitest run --project red-baron`
Expected: PASS — but **NOT at the 81 files / 1362 tests (+1 todo) pre-migration baseline.** ~27 of red-baron's assertions are topology tests asserting what the collapse removes, so a count *below* baseline is EXPECTED. Apply the Global Constraints' topology policy: remove only assertions false **by design**, **rewrite — never delete —** any whose intent survives (`@arcade/shared/rng` → `@shared/rng` is a specifier change; that test must still assert the consumer imports shared RNG), and record the **exact count removed per file, with the reason**, in your report. Never delete a test to reach a number. A `scaffold.test.ts` host-pin assertion is **not retired** — Task 19 restores that pin at the root and Task 12b asserts it once; remove it here, do not re-create it elsewhere.

**Vitest patch drift — and it is NOT red-baron that moves.** red-baron ran 4.1.10 while the other apps ran 4.1.9, but the root `^4.1.9` has **resolved to 4.1.10** (measured: `npx vitest run` at the repo root banners `v4.1.10`). So red-baron is already at parity and imports unchanged on this axis; it is the **other six games** whose suites change patch version as a side effect of the move. If exactly one suite goes red in a way the move cannot explain, check it against this before suspecting the import — and it will not be red-baron.

Also expected to pass: `tests/audit/citations.test.ts` and `tests/audit/citation-evidence.test.ts`, which resolve `git cat-file -e 6038a07b9044f1add37fd12c217cd39ec1629439^{commit}`. A `git-said-no` / "this clone's object database has no commit" failure means Task 2's tag is missing. Fix the tag; do not re-anchor the pins.

- [ ] **Step 5: Note red-baron's reference/ quarry**

`red-baron/reference/` (the RBARON/RBGRND ROM source) is gitignored and lives only in the a-2 checkout. If any test needs it, copy it in from `/Users/slabgorb/Projects/a-2/red-baron/reference/` before running. Verify whether the suite depends on it:

```bash
npx vitest run --project red-baron 2>&1 | grep -i "reference/" || echo "no reference/ dependency"
```

- [ ] **Step 6: Commit**

```bash
git add plugins/red-baron .gitignore
git commit -m "chore(migrate): import red-baron as plugins/red-baron

Its citation gate resolves blobs from the audit commit via git; the audit/red-baron
tag from the preflight keeps that commit reachable. Persists no high scores — the
cookie migration does not apply to it.

Source: see docs/ops/migration-manifest.md

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 11: Import centipede

**Files:**
- Move: `centipede/**` → `plugins/centipede/**`
- Create: `plugins/centipede/package.json`, `plugins/centipede/tsconfig.json`

**Interfaces:**
- Consumes: `@shared/highscore` (Task 4). centipede runs its **own** `src/shell/timebase.ts` at the ROM's 15750/263 Hz and its own `fitIntegerScale` — leave both alone.
- Produces: `plugins/centipede/` with **50** test files green — the pre-migration measurement is 50 files / 912 tests, verified by running centipede's own suite immediately before dispatch. **The plan's old "49" was wrong and dangerously so** (PLAN DEFECT #16, same class as tempest's corrected "149" undercount at Task 6): centipede's `scaffold.test.ts` SURVIVES this task — the corrected describe table deletes three of its six describes and keeps three — so the file count must not fall. A worker trusting "49" would look for a whole file to delete and land on exactly the file the policy exists to protect, which is the epic's documented recurring failure mode. **Test count falls; file count does not.**

- [ ] **Step 1: Move the tree and strip per-repo tooling**

```bash
git mv --force centipede plugins/centipede 2>/dev/null || mv centipede plugins/centipede
rm -rf plugins/centipede/.git plugins/centipede/.github plugins/centipede/node_modules
rm -f plugins/centipede/vite.config.ts plugins/centipede/tsconfig.json \
      plugins/centipede/package-lock.json
```

- [ ] **Step 2: Write package.json and tsconfig**

`plugins/centipede/package.json` (version from the manifest):

```json
{
  "name": "centipede",
  "version": "0.0.6",
  "private": true
}
```

`plugins/centipede/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Remove /centipede/ from .gitignore and rewrite shared imports**

```bash
grep -rlE '@arcade\\?/shared' plugins/centipede/src plugins/centipede/tests \
  | xargs sed -i '' 's|@arcade/shared/|@shared/|g'
grep -rnE '@arcade\\?/shared' plugins/centipede/ || echo "clean"
```

- [ ] **Step 4: Run centipede's suite**

Run: `npx vitest run --project centipede`
Expected: PASS — but **NOT at the 50 files / 912 tests pre-migration baseline.** ~26 of centipede's assertions are topology tests asserting what the collapse removes, so a count *below* baseline is EXPECTED. Apply the Global Constraints' topology policy: remove only assertions false **by design**, **rewrite — never delete —** any whose intent survives (`@arcade/shared/rng` → `@shared/rng` is a specifier change; that test must still assert the consumer imports shared RNG), and record the **exact count removed per file, with the reason**, in your report. Never delete a test to reach a number. A `scaffold.test.ts` host-pin assertion is **not retired** — Task 19 restores that pin at the root and Task 12b asserts it once; remove it here, do not re-create it elsewhere. centipede's `scaffold.test.ts` is also where the codebase states the governing rule ("cross-repo wiring invariants live in the ORCHESTRATOR suite") — read it before you cut anything.

Also expected to pass: `tests/audit/citations.test.ts`, which does **not** read git — it re-opens working-tree files, so the move is transparent to it.

- [ ] **Step 5: Commit**

```bash
git add plugins/centipede .gitignore
git commit -m "chore(migrate): import centipede as plugins/centipede

Keeps its own ROM-cadence timebase (15750/263 Hz) and integer-scale blit —
untouched by this epic. Shell convergence is a separate epic.

Source: see docs/ops/migration-manifest.md

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 12: Import joust

**Files:**
- Move: `joust/**` → `plugins/joust/**`
- Create: `plugins/joust/package.json`, `plugins/joust/tsconfig.json`

**Interfaces:**
- Consumes: nothing from `@shared` — joust's `main.ts` imports no shared module today. Do not add any.
- Produces: `plugins/joust/` with **75** test files green — the pre-migration measurement is 75 files / 1872 tests, verified by running joust's own suite immediately before dispatch. **The plan's old "68" was wrong by seven whole files** (PLAN DEFECT #16, the same stale-count class as centipede's "49" and tempest's "149"). joust's `scaffold.test.ts` SURVIVES this task — the corrected table deletes five of its eight describes and keeps three, including the `src/core + src/shell` skeletons guard. **Test count falls; file count does not.** Never delete a file to reach a number in this plan; the numbers in it have been wrong three times and the measurement never has. **No high-score storage.**

- [ ] **Step 1: Move the tree and strip per-repo tooling**

```bash
git mv --force joust plugins/joust 2>/dev/null || mv joust plugins/joust
rm -rf plugins/joust/.git plugins/joust/.github plugins/joust/node_modules
rm -f plugins/joust/vite.config.ts plugins/joust/tsconfig.json \
      plugins/joust/package-lock.json
```

- [ ] **Step 2: Write package.json and tsconfig**

`plugins/joust/package.json` (version from the manifest):

```json
{
  "name": "joust",
  "version": "0.0.8",
  "private": true
}
```

`plugins/joust/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Remove /joust/ from .gitignore and check for shared imports**

```bash
grep -rnE '@arcade\\?/shared' plugins/joust/ || echo "joust imports nothing from @arcade/shared — expected"
```

If any hits appear (in tests, say), rewrite them the same way as the other games.

- [ ] **Step 4: Run joust's suite**

Run: `npx vitest run --project joust`
Expected: PASS — but **NOT at the 75 files / 1872 tests pre-migration baseline.** ~34 of joust's assertions are topology tests asserting what the collapse removes, so a count *below* baseline is EXPECTED. Apply the Global Constraints' topology policy: remove only assertions false **by design**, **rewrite — never delete —** any whose intent survives (`@arcade/shared/rng` → `@shared/rng` is a specifier change; that test must still assert the consumer imports shared RNG), and record the **exact count removed per file, with the reason**, in your report. Never delete a test to reach a number. A `scaffold.test.ts` host-pin assertion is **not retired** — Task 19 restores that pin at the root and Task 12b asserts it once; remove it here, do not re-create it elsewhere. joust's host pin is the ORIGIN of that guard (jt1-3, ported fleet-wide as td1-1) — its removal here is the one most worth double-checking against Task 12b.

- [ ] **Step 5: Verify .gitignore has no subrepo entries left**

```bash
grep -nE "^/(tempest|lobby|star-wars|asteroids|battlezone|red-baron|centipede|joust|arcade-shared)/$" .gitignore \
  && echo "STILL IGNORED — remove these" || echo "all nine subrepo entries removed"
```

- [ ] **Step 6: Run the whole cabinet**

Run: `npx vitest run`

Expected: PASS across every project, at **699 test files and 10 451 tests**. That is the measured pre-migration baseline, captured by running every suite in place before anything moved:

| app | test files | tests |
|---|---|---|
| tempest | 150 | 1747 |
| star-wars | 190 | 2035 |
| asteroids | 45 | 831 |
| battlezone | 72 | 1057 |
| red-baron | 81 | 1362 (+1 todo) |
| centipede | 50 | 912 |
| joust | 75 | 1872 |
| lobby | 11 | 127 |
| arcade-shared | 25 | 508 |

**A lower count means tests were dropped in the move — it is a failure, not a rounding difference.** Compare against this table, never against an estimate. (`src/host`'s own tests are added later by Task 13 and are additional to these.)

- [ ] **Step 7: Commit**

```bash
git add plugins/joust .gitignore
git commit -m "chore(migrate): import joust as plugins/joust — the fleet is now one repo

All nine trees imported; 655 test files green under one vitest run. Persists no
high scores.

Source: see docs/ops/migration-manifest.md

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 12b: Consolidate the removed topology invariants into the orchestrator suite

Tasks 6–12 removed per-game assertions that checked the old topology. Those invariants still matter; they are just now singular. This task re-establishes them **once**, in the orchestrator suite, closing the window opened by the imports.

**Files:**
- Modify: `tests/monorepo-topology.test.mjs` — **it already exists**, created by Task 5's fix round with the two lobby invariants. Do not create it.

**Interfaces:**
- Consumes: the root `package.json`, `tsconfig.json`, `vite.config.ts` factory (Task 3); the seven imported `plugins/<id>/` trees (Tasks 6–12); `src/shared/` (Task 4).
- Produces: one suite asserting the cabinet-wide wiring that seven `scaffold.test.ts` files used to assert per-repo.

- [ ] **Step 1: Read what was actually removed**

Do not guess. Read the "topology assertions removed" section of every import report:

```bash
grep -A 30 -i "topology" .superpowers/sdd/2026-07-30-arcade-plugin-host/task-{5,6,7,8,9,10,11,12}-report.md
```

**Task 5 (the lobby) is in that list deliberately — PLAN DEFECT #11.** Until `9822adc`+ this grep
and the count list below covered only the seven games, so the lobby's five removed assertions were
structurally invisible to the one task built to catch exactly this class of loss. Task 5's review
caught it. The lobby is an app like any other here.

Build a checklist of every distinct invariant that was dropped. The per-app counts to reconcile
against are **lobby 5**, tempest 12, star-wars 17, asteroids 17, battlezone 38, red-baron 27,
centipede 26, joust 34.

- [ ] **Step 2: Extend the consolidated suite**

**`tests/monorepo-topology.test.mjs` ALREADY EXISTS — Task 5's fix round created it** (owner ruling,
2026-07-30) carrying the two invariants the lobby's deleted `scaffold.test.ts` orphaned: the
`base: '/'` assertion and the dev-server host pin. **Do not re-create the file and do not duplicate
those two tests** — read it first, then add the games' share around them.

The completed file must cover, once each:

```javascript
// The cabinet-wide wiring invariants. These were asserted seven times over, once per
// game's scaffold.test.ts, back when each game was its own repo with its own vite
// config, port, scripts and CI caller. The collapse makes them singular — and the
// codebase's own rule (centipede scaffold.test.ts: "cross-repo wiring invariants live
// in the ORCHESTRATOR suite") says this is where they belong.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const GAMES = ['tempest', 'star-wars', 'asteroids', 'battlezone', 'red-baron', 'centipede', 'joust'];

test('exactly one package.json declares dependencies', () => {
  // The four-way @arcade/shared version drift is what this replaces. Per-game
  // package.json files carry name/version/private and nothing else.
  for (const g of GAMES) {
    const pkg = JSON.parse(readFileSync(`plugins/${g}/package.json`, 'utf8'));
    assert.deepEqual(Object.keys(pkg).sort(), ['name', 'private', 'version'],
      `plugins/${g}/package.json must carry only name/version/private`);
  }
  const pkg = JSON.parse(readFileSync('lobby/package.json', 'utf8'));
  assert.deepEqual(Object.keys(pkg).sort(), ['name', 'private', 'version']);
});

test('no @arcade/shared dependency survives anywhere', () => {
  // Replaced by the @shared/* alias. A reappearance means someone re-introduced the
  // pinned git dependency and with it the drift.
  const root = readFileSync('package.json', 'utf8');
  assert.ok(!root.includes('@arcade/shared'));
  for (const g of [...GAMES, 'lobby']) {
    const dir = g === 'lobby' ? 'lobby' : `plugins/${g}`;
    assert.ok(!readFileSync(`${dir}/package.json`, 'utf8').includes('@arcade/shared'));
  }
});

test('no per-app vite config, tsconfig base, or lockfile survives', () => {
  for (const g of [...GAMES.map((g) => `plugins/${g}`), 'lobby']) {
    assert.ok(!existsSync(`${g}/vite.config.ts`), `${g} must not carry its own vite config`);
    assert.ok(!existsSync(`${g}/package-lock.json`), `${g} must not carry its own lockfile`);
    assert.ok(!existsSync(`${g}/.github`), `${g} must not carry its own CI`);
  }
});

test('every app tsconfig extends the root, at the right depth', () => {
  for (const g of GAMES) {
    const tc = JSON.parse(readFileSync(`plugins/${g}/tsconfig.json`, 'utf8'));
    assert.equal(tc.extends, '../../tsconfig.json');
  }
  assert.equal(JSON.parse(readFileSync('lobby/tsconfig.json', 'utf8')).extends, '../tsconfig.json');
});

test('the root scripts the games used to declare individually', () => {
  const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.equal(scripts.test, 'vitest run --passWithNoTests');
  assert.equal(scripts.lint, 'tsc --noEmit');
  assert.ok(scripts.build.includes('build-app.mjs'));
});

// ⚠️ THE NEXT TWO TESTS ALREADY EXIST in the file, shipped by Task 5's fix round.
// `node:test` permits DUPLICATE TEST NAMES SILENTLY — paste either one verbatim and you
// get two copies, with no error to tell you. Do NOT re-add them.
//   - the base test: EXTEND the existing one by adding the GAMES loop below to it. Its
//     lobby assertions are already there.
//   - the host-pin test: it is complete as shipped. Leave it entirely alone.

test('every game is served under its own base path, lobby at the root', async () => {
  // Replaces seven per-repo assertions that base was '/' and the port was pinned.
  // There is one dev server now, so a port pin per game is meaningless.
  const { defineAppConfig } = await import('../vite.config.ts');
  for (const g of GAMES) {              // <-- ADD ONLY THIS LOOP to the existing test
    const cfg = defineAppConfig({ id: g });
    assert.equal(cfg.base, `/${g}/`);
    assert.ok(cfg.build.outDir.endsWith(`dist/${g}`));
  }
  const lobby = defineAppConfig({ id: 'lobby' });   // already present — do not duplicate
  assert.equal(lobby.base, '/');
  assert.ok(lobby.build.outDir.endsWith('dist'));
});

test('the dev-server host pin survives — strictPort alone does not protect it', async () => {
  // ALREADY SHIPPED BY TASK 5 — reproduced here only so you can recognise it. Do not re-add.
  // Replaces the seven per-repo scaffold assertions on strictPort + host:'127.0.0.1'.
  // Still load-bearing with one server: a-1/a-2/a-3 race the same port, and an
  // unpinned host lets a second checkout bind [::1]:5270 alongside 127.0.0.1:5270
  // with no error — serving the whole cabinet from the wrong working tree.
  const { defineAppConfig } = await import('../vite.config.ts');
  for (const block of ['server', 'preview']) {
    const cfg = defineAppConfig({ id: 'lobby' })[block];
    assert.equal(cfg.host, '127.0.0.1', `${block}.host must be pinned to IPv4 loopback`);
    assert.equal(cfg.strictPort, true, `${block}.strictPort must be true`);
    assert.equal(cfg.port, 5270);
  }
});

test('exactly one deploy workflow exists for the whole cabinet', () => {
  // Was eight ten-line callers plus a reusable workflow.
  const wf = readdirSync('.github/workflows');
  assert.deepEqual(wf, ['deploy.yml']);
});

test('every plugins/ directory is a real app with a manifest and an entry', () => {
  for (const dir of readdirSync('plugins', { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const f of ['plugin.ts', 'package.json', 'tsconfig.json', 'index.html', 'main.ts']) {
      assert.ok(existsSync(`plugins/${dir.name}/${f}`), `plugins/${dir.name}/${f} missing`);
    }
  }
});
```

Some assertions depend on later tasks — the single deploy workflow lands in Task 18, and `main.ts`/`plugin.ts` in Tasks 12/14. Any assertion that cannot pass yet must be written and marked with `{ todo: true }` **naming the task that satisfies it**, never omitted.

- [ ] **Step 3: Run it**

Run: `node --test tests/monorepo-topology.test.mjs`
Expected: PASS, with any `todo` entries clearly attributed to a pending task.

- [ ] **Step 4: Reconcile the accounting**

In the commit message, state the total removed across Tasks 6–12 against what this suite now covers, and name any invariant that was dropped and deliberately **not** re-established, with the reason. An invariant that silently disappears between the two accountings is the failure this task exists to prevent.

- [ ] **Step 5: Commit**

```bash
git add tests/monorepo-topology.test.mjs
git commit -m "test(migrate): consolidate the seven games' topology invariants into one suite

Tasks 6-12 removed per-game assertions checking the @arcade/shared git pin, per-game
scripts, pinned ports, strictPort, base '/' and the per-repo CI caller — all
deliberately gone after the collapse. The invariants are re-established here once,
per the codebase's own rule that cross-repo wiring belongs in the orchestrator suite.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 13: The plugin contract

**Files:**
- Create: `src/host/contract.ts`, `src/host/contract.test.ts`

**Interfaces:**
- Produces: `GameMeta` (`{id, title, year, color, controls, listed, version}`), `BuildSpec` (`{entries?: readonly string[]}`), and `validateMeta(meta: unknown, dirName: string): GameMeta` — which throws on any violation. Consumed by Task 14's manifests and generator, and Task 16's build script.

- [ ] **Step 1: Write the failing test**

Create `src/host/contract.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { validateMeta } from './contract'

const valid = {
  id: 'tempest',
  title: 'TEMPEST',
  year: 1981,
  color: '#00eaff',
  controls: ['ROTATE — Wheel / ←→', 'FIRE — Click / Space'],
  order: 1,
  listed: true,
  showcase: true,
  version: '1.0.29',
}

describe('validateMeta', () => {
  it('accepts a well-formed manifest and returns it', () => {
    expect(validateMeta(valid, 'tempest')).toEqual(valid)
  })

  it('rejects an id that does not match its directory', () => {
    expect(() => validateMeta({ ...valid, id: 'tempest' }, 'star-wars')).toThrow(
      /id 'tempest' does not match directory 'star-wars'/,
    )
  })

  it('rejects a non-url-safe id', () => {
    expect(() => validateMeta({ ...valid, id: 'Tempest' }, 'Tempest')).toThrow(/url-safe/)
    expect(() => validateMeta({ ...valid, id: '1980s' }, '1980s')).toThrow(/url-safe/)
  })

  it('rejects an empty title', () => {
    expect(() => validateMeta({ ...valid, title: '' }, 'tempest')).toThrow(/title/)
  })

  it('rejects a non-hex colour', () => {
    expect(() => validateMeta({ ...valid, color: 'cyan' }, 'tempest')).toThrow(/color/)
  })

  it('rejects empty controls', () => {
    expect(() => validateMeta({ ...valid, controls: [] }, 'tempest')).toThrow(/controls/)
  })

  it('rejects a missing version', () => {
    const { version: _drop, ...noVersion } = valid
    expect(() => validateMeta(noVersion, 'tempest')).toThrow(/version/)
  })

  it('rejects a missing showcase flag rather than defaulting it', () => {
    // A falsy default would let a new game drop out of the carousel silently —
    // the exact invisible absence the flag exists to prevent.
    const { showcase: _drop, ...noShowcase } = valid
    expect(() => validateMeta(noShowcase, 'tempest')).toThrow(/showcase/)
  })

  it('rejects a non-object', () => {
    expect(() => validateMeta(null, 'tempest')).toThrow(/not an object/)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/host/contract.test.ts`
Expected: FAIL — cannot resolve `./contract`.

- [ ] **Step 3: Write the contract**

Create `src/host/contract.ts`:

```typescript
// src/host/contract.ts — the plugin contract.
//
// A game declares itself with one exported `meta` object. That manifest is the
// ONLY thing the lobby reads, and src/host/registry.ts is generated from every
// plugins/*/plugin.ts. The hand-maintained lobby list it replaced carried six
// hardcoded launch URLs and six hardcoded version strings that nothing checked.
//
// Validation runs at BUILD time (scripts/gen-registry.mjs), so a malformed
// manifest fails the build instead of shipping a broken tile.

/** A game on the cabinet, as the lobby sees it. */
export interface GameMeta {
  /** Url-safe slug. MUST equal the directory name under plugins/. */
  readonly id: string
  /** Display label on the tile. */
  readonly title: string
  /** Year the cabinet shipped. */
  readonly year: number
  /** Tile glow colour, hex. */
  readonly color: string
  /** Keybinding hints, one line each. */
  readonly controls: readonly string[]
  /**
   * Position on the cabinet floor, ascending. Explicit because the order it replaces
   * was CURATED (tempest, star-wars, asteroids, battlezone, centipede, joust — the
   * order the games were built), and generating from directory names would silently
   * re-sort the lobby alphabetically. Tile order is a design decision, so it is
   * stated rather than inferred.
   */
  readonly order: number
  /** Whether the lobby lists it. `false` is a deliberate statement, not an omission. */
  readonly listed: boolean
  /**
   * Does this game's attract mode earn a slot in the lobby showcase carousel?
   *
   * Required, not optional — carried over verbatim from the field's own rationale in
   * the registry this replaces: "An optional flag with a falsy default means a newly
   * added game silently opts out and nobody notices — the same class of invisible
   * absence this whole feature exists to correct."
   */
  readonly showcase: boolean
  /** The game's released version, imported from its own package.json. */
  readonly version: string
}

/** Build-only configuration. Deliberately NOT part of GameMeta: build settings
 *  have no business travelling into the tile renderer. */
export interface BuildSpec {
  /** Extra HTML entries beyond index.html, e.g. tempest's 'models.html'. */
  readonly entries?: readonly string[]
}

const URL_SAFE_ID = /^[a-z][a-z0-9-]*$/
const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/

/**
 * Validate one manifest against its directory. Throws with a specific message on
 * the first violation — the build stops rather than emitting a broken tile.
 */
export function validateMeta(meta: unknown, dirName: string): GameMeta {
  if (typeof meta !== 'object' || meta === null) {
    throw new Error(`plugins/${dirName}/plugin.ts: meta is not an object`)
  }
  const m = meta as Record<string, unknown>
  const where = `plugins/${dirName}/plugin.ts`

  if (typeof m.id !== 'string' || !URL_SAFE_ID.test(m.id)) {
    throw new Error(
      `${where}: id must be url-safe (lowercase letters, digits, hyphens; starts with a letter); got ${JSON.stringify(m.id)}`,
    )
  }
  if (m.id !== dirName) {
    throw new Error(`${where}: id '${m.id}' does not match directory '${dirName}'`)
  }
  if (typeof m.title !== 'string' || m.title.length === 0) {
    throw new Error(`${where}: title must be a non-empty string`)
  }
  if (typeof m.year !== 'number' || !Number.isInteger(m.year)) {
    throw new Error(`${where}: year must be an integer`)
  }
  if (typeof m.color !== 'string' || !HEX_COLOR.test(m.color)) {
    throw new Error(`${where}: color must be a hex colour like '#00eaff'; got ${JSON.stringify(m.color)}`)
  }
  if (!Array.isArray(m.controls) || m.controls.length === 0 || !m.controls.every((c) => typeof c === 'string')) {
    throw new Error(`${where}: controls must be a non-empty array of strings`)
  }
  if (typeof m.order !== 'number' || !Number.isInteger(m.order)) {
    throw new Error(`${where}: order must be an integer`)
  }
  if (typeof m.listed !== 'boolean') {
    throw new Error(`${where}: listed must be a boolean`)
  }
  // Required, never defaulted — a falsy default is how a new game silently opts out
  // of the carousel and nobody notices.
  if (typeof m.showcase !== 'boolean') {
    throw new Error(`${where}: showcase must be a boolean`)
  }
  if (typeof m.version !== 'string' || m.version.length === 0) {
    throw new Error(`${where}: version must be a non-empty string (import it from ./package.json)`)
  }
  return m as unknown as GameMeta
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/host/contract.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/host/contract.ts src/host/contract.test.ts
git commit -m "feat(host): the plugin contract — GameMeta and validateMeta

A malformed manifest now fails the build rather than shipping a broken tile.
BuildSpec is kept separate from GameMeta so build config never reaches the tile
renderer.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 14: Seven manifests and the registry generator

**Files:**
- Create: `plugins/<id>/plugin.ts` (×7), `scripts/gen-registry.mjs`, `src/host/registry.ts` (generated), `tests/registry.test.mjs`

**Interfaces:**
- Consumes: `validateMeta` (Task 13), each game's `package.json` version (Tasks 6–12).
- Produces: `src/host/registry.ts` exporting `GAMES: readonly GameMeta[]` and `getGame(id): GameMeta | undefined` — consumed by Task 15's lobby rewrite.

> **PLAN DEFECT #19 — three things about this task's relationship to `validateMeta`.** Found by
> Task 13's implementer while building the contract, and verified before amending.
>
> 1. **The tempest literal below omitted `order`** — 7 manifests, 6 `order` fields, with 2-7 taken.
>    `order` is a REQUIRED, never-defaulted field by global constraint. Both `validateMeta` and
>    `tsc` reject the omission, but **the generator below would coerce `Number(undefined)`/`Number(null)`
>    and sort tempest first anyway**, shipping the omission invisibly. Fixed above to `order: 1`. If
>    you add a manifest, `order` is not optional.
> 2. **The generator never actually calls `validateMeta`**, despite the Interfaces line above saying
>    it consumes it — `scripts/gen-registry.mjs` is an `.mjs` script and cannot import a `.ts`
>    module. What it has instead is a **hand-duplicated** subset of the rules, and that subset omits
>    four of them: id-vs-directory agreement, `year`, `listed`, and unknown-key rejection. Two
>    validators that disagree is worse than one, because the loose one is the one that runs. Either
>    make the generator call the real thing, or state in your report exactly which rules the
>    duplicate does NOT enforce and why that is acceptable. Do not leave the Interfaces line
>    claiming a consumption that does not happen.
>    (If you do wire it up, `delete g.showcaseRaw` must happen **before** the call, or unknown-key
>    rejection fires on the generator's own scratch field.)
> 3. **Nothing calls `validateMeta` at runtime anywhere in the plan.** Its only exercise is its own
>    unit suite, so the seven real manifests are never actually put through the gate they were
>    written for. **This task now owns closing that**: add a test under `src/host/` that imports all
>    seven `plugins/<id>/plugin.ts` manifests and runs each through `validateMeta`. It needs no
>    config change — Task 3 already declares a `host` vitest project. That test is what makes the
>    contract load-bearing rather than decorative, and it satisfies the `{ todo: true }` marker Task
>    12b left naming this task.

- [ ] **Step 1: Write the seven manifests**

Copy each game's `title`, `color`, `controls` and `showcase` **verbatim** from the current `lobby/src/core/registry.ts` so no tile text and no carousel membership changes. Values for red-baron (absent from that list) come from its own docs, with `showcase: false`.

`plugins/tempest/plugin.ts`:

```typescript
import { version } from './package.json'
import type { GameMeta, BuildSpec } from '@host/contract'

export const meta: GameMeta = {
  id: 'tempest',
  title: 'TEMPEST',
  year: 1981,
  color: '#00eaff',
  controls: ['ROTATE — Wheel / ←→', 'FIRE — Click / Space'],
  listed: true,
  showcase: true,
  order: 1,
  version,
}

// tempest ships the model contact-sheet dev tool alongside the game.
export const build: BuildSpec = { entries: ['models.html'] }
```

`plugins/star-wars/plugin.ts`:

```typescript
import { version } from './package.json'
import type { GameMeta, BuildSpec } from '@host/contract'

export const meta: GameMeta = {
  id: 'star-wars',
  title: 'STAR WARS',
  year: 1983,
  color: '#ffe81f',
  controls: ['AIM — Mouse', 'FIRE — Click / Space'],
  order: 2,
  listed: true,
  showcase: false,
  version,
}

// star-wars ships TWO dev-tool pages alongside the game.
export const build: BuildSpec = { entries: ['models.html', 'scenes.html'] }
```

`plugins/asteroids/plugin.ts`:

```typescript
import { version } from './package.json'
import type { GameMeta } from '@host/contract'

export const meta: GameMeta = {
  id: 'asteroids',
  title: 'ASTEROIDS',
  year: 1979,
  color: '#ff6a00',
  controls: ['ROTATE/THRUST — ←→↑ / WASD', 'FIRE — Space / K'],
  order: 3,
  listed: true,
  showcase: false,
  version,
}
```

`plugins/battlezone/plugin.ts`:

```typescript
import { version } from './package.json'
import type { GameMeta } from '@host/contract'

export const meta: GameMeta = {
  id: 'battlezone',
  title: 'BATTLEZONE',
  year: 1980,
  color: '#00ff41',
  controls: ['DRIVE — Arrows / E D I K', 'FIRE — Space / F'],
  order: 4,
  listed: true,
  showcase: false,
  version,
}
```

`plugins/red-baron/plugin.ts` — `listed: false` is the deliberate statement replacing its silent omission:

```typescript
import { version } from './package.json'
import type { GameMeta, BuildSpec } from '@host/contract'

// listed: false — red-baron is provisioned but not finished enough for the
// cabinet floor. Under the old hand-maintained registry this was an OMISSION
// nobody had recorded a reason for; here it is a statement.
export const meta: GameMeta = {
  id: 'red-baron',
  title: 'RED BARON',
  year: 1980,
  color: '#d43b3b',
  controls: ['FLY — Mouse / Arrows', 'FIRE — Click / Space'],
  order: 7,
  listed: false,
  showcase: false,
  version,
}

// red-baron ships the model contact sheet too.
export const build: BuildSpec = { entries: ['models.html'] }
```

`plugins/centipede/plugin.ts`:

```typescript
import { version } from './package.json'
import type { GameMeta } from '@host/contract'

export const meta: GameMeta = {
  id: 'centipede',
  title: 'CENTIPEDE',
  year: 1981,
  color: '#2aa358',
  controls: ['Mouse'],
  order: 5,
  listed: true,
  showcase: true,
  version,
}
```

`plugins/joust/plugin.ts`:

```typescript
import { version } from './package.json'
import type { GameMeta } from '@host/contract'

export const meta: GameMeta = {
  id: 'joust',
  title: 'JOUST',
  year: 1982,
  color: '#f0a828',
  controls: ['MOVE — ←→ / A D', 'FLAP — Space / Shift'],
  order: 6,
  listed: true,
  showcase: false,
  version,
}
```

- [ ] **Step 2: Write the failing registry test**

Create `tests/registry.test.mjs`:

```javascript
// The generated registry replaced a hand-maintained list whose versions and launch
// URLs silently rotted. These tests are the anti-rot guard: the committed file must
// match what the generator produces from the manifests right now.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

test('every plugins/* directory has a plugin.ts', () => {
  for (const dir of readdirSync('plugins', { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const path = `plugins/${dir.name}/plugin.ts`;
    assert.doesNotThrow(() => readFileSync(path), `${path} is missing`);
  }
});

test('the committed registry matches a fresh generation', () => {
  const before = readFileSync('src/host/registry.ts', 'utf8');
  execFileSync('node', ['scripts/gen-registry.mjs'], { stdio: 'inherit' });
  const after = readFileSync('src/host/registry.ts', 'utf8');
  assert.equal(after, before, 'src/host/registry.ts is stale — run `npm run gen:registry`');
});

test('the cabinet keeps its curated tile order', () => {
  // The order the old hand-maintained registry shipped. Generating from directory
  // names would have re-sorted the lobby alphabetically — a visible change nobody
  // asked for. This test is what makes that a failure rather than a surprise.
  const registry = readFileSync('src/host/registry.ts', 'utf8');
  const ids = [...registry.matchAll(/^\s*id: '([^']+)'/gm)].map((m) => m[1]);
  assert.deepEqual(ids, [
    'tempest', 'star-wars', 'asteroids', 'battlezone', 'centipede', 'joust', 'red-baron',
  ]);
});

test('each manifest version matches its package.json', () => {
  const registry = readFileSync('src/host/registry.ts', 'utf8');
  for (const dir of readdirSync('plugins', { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const pkg = JSON.parse(readFileSync(`plugins/${dir.name}/package.json`, 'utf8'));
    assert.ok(
      registry.includes(`version: '${pkg.version}'`),
      `registry is missing ${dir.name} at version ${pkg.version}`,
    );
  }
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node --test tests/registry.test.mjs`
Expected: FAIL — `src/host/registry.ts` does not exist and `scripts/gen-registry.mjs` cannot be run.

- [ ] **Step 4: Write the generator**

Create `scripts/gen-registry.mjs`:

```javascript
// Generates src/host/registry.ts from every plugins/*/plugin.ts manifest.
//
// This replaces lobby/src/core/registry.ts, which hardcoded each game's launch
// URL, version, colour and controls with nothing generating or checking it — so
// it rotted (red-baron was live but unlisted; every version was a hand
// transcription). The generated file is COMMITTED so the diff is reviewable and
// the lobby builds with no pre-step; tests/registry.test.mjs fails if it is stale.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PLUGINS_DIR = 'plugins';
const OUT = 'src/host/registry.ts';

// Parse a manifest without a TS toolchain: the manifests are deliberately plain
// object literals, and the only non-literal is `version`, read from package.json.
function readManifest(dir) {
  const src = readFileSync(join(PLUGINS_DIR, dir, 'plugin.ts'), 'utf8');
  const body = src.match(/export const meta:\s*GameMeta\s*=\s*\{([\s\S]*?)\n\}/);
  if (!body) throw new Error(`plugins/${dir}/plugin.ts: no 'export const meta: GameMeta = {…}' found`);

  const pick = (key) => {
    const m = body[1].match(new RegExp(`\\b${key}:\\s*(.+?),\\s*$`, 'm'));
    return m ? m[1].trim() : null;
  };
  const str = (key) => {
    const raw = pick(key);
    if (raw === null) throw new Error(`plugins/${dir}/plugin.ts: missing ${key}`);
    return raw.replace(/^['"]|['"]$/g, '');
  };

  const { version } = JSON.parse(readFileSync(join(PLUGINS_DIR, dir, 'package.json'), 'utf8'));
  const controlsRaw = pick('controls');
  if (!controlsRaw) throw new Error(`plugins/${dir}/plugin.ts: missing controls`);

  return {
    id: str('id'),
    title: str('title'),
    year: Number(pick('year')),
    color: str('color'),
    controls: JSON.parse(controlsRaw.replace(/'/g, '"')),
    order: Number(pick('order')),
    listed: pick('listed') === 'true',
    // Read explicitly and asserted below — never defaulted. `pick` returning null
    // must be an error, not a silent `false`, or a manifest that forgot the flag
    // drops out of the carousel with no signal.
    showcase: pick('showcase') === 'true',
    showcaseRaw: pick('showcase'),
    version,
  };
}

const dirs = readdirSync(PLUGINS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

// Read in directory order, then sort by the CURATED `order` field. Emitting in
// directory order would silently re-sort the cabinet alphabetically — the tile
// sequence is a design decision, not an accident of the filesystem.
const games = dirs.map(readManifest).sort((a, b) => a.order - b.order);

const seenOrder = new Set();
for (const g of games) {
  if (!Number.isInteger(g.order)) throw new Error(`${g.id}: order must be an integer`);
  if (seenOrder.has(g.order)) throw new Error(`duplicate order ${g.order} (${g.id})`);
  seenOrder.add(g.order);
}

// Validate through the same contract the type system uses. Duplicated as a plain
// check here because this script runs before any TS build.
for (const g of games) {
  if (!/^[a-z][a-z0-9-]*$/.test(g.id)) throw new Error(`bad id: ${g.id}`);
  if (!g.title) throw new Error(`${g.id}: empty title`);
  if (!/^#[0-9a-fA-F]{3,8}$/.test(g.color)) throw new Error(`${g.id}: bad colour ${g.color}`);
  if (!g.controls.length) throw new Error(`${g.id}: empty controls`);
  if (!g.version) throw new Error(`${g.id}: empty version`);
  if (g.showcaseRaw !== 'true' && g.showcaseRaw !== 'false') {
    throw new Error(`${g.id}: showcase must be present and literally true or false`);
  }
  delete g.showcaseRaw;
}

const entries = games
  .map(
    (g) => `  {
    id: '${g.id}',
    title: '${g.title}',
    year: ${g.year},
    color: '${g.color}',
    controls: [${g.controls.map((c) => `'${c}'`).join(', ')}],
    order: ${g.order},
    listed: ${g.listed},
    showcase: ${g.showcase},
    version: '${g.version}',
  },`,
  )
  .join('\n');

writeFileSync(
  OUT,
  `// GENERATED by scripts/gen-registry.mjs — do not edit by hand.
// Run \`npm run gen:registry\` after changing any plugins/*/plugin.ts.
//
// This file replaced lobby/src/core/registry.ts, which was maintained by hand and
// silently drifted from what was actually deployed.
import type { GameMeta } from './contract'

/** Every game on the cabinet, ordered by directory name. */
export const GAMES: readonly GameMeta[] = [
${entries}
]

/** The games the lobby lists — \`listed: false\` opts a game out deliberately. */
export const LISTED_GAMES: readonly GameMeta[] = GAMES.filter((g) => g.listed)

/** The path a game is served at on the single origin. Replaces the old
 *  hand-maintained absolute \`launchUrl\`, which could drift from reality. */
export function gamePath(id: string): string {
  return \`/\${id}/\`
}

/** Look up a game by id; \`undefined\` when no game matches. */
export function getGame(id: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === id)
}
`,
);

console.log(`Wrote ${OUT} — ${games.length} games (${games.filter((g) => g.listed).length} listed).`);
```

- [ ] **Step 5: Generate and run the tests**

```bash
node scripts/gen-registry.mjs
node --test tests/registry.test.mjs
npx vitest run src/host/contract.test.ts
```

Expected: the generator reports `7 games (6 listed)`; all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/*/plugin.ts scripts/gen-registry.mjs src/host/registry.ts tests/registry.test.mjs
git commit -m "feat(host): manifests and the generated registry

Seven plugin.ts manifests; src/host/registry.ts is generated from them and
committed, with a test that fails when it goes stale. red-baron's absence from
the lobby is now an explicit listed: false rather than a silent omission.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 15: Point the lobby at the generated registry

**Files:**
- Delete: `lobby/src/core/registry.ts`
- Modify: `lobby/src/main.ts`, `lobby/src/shell/tiles.ts`, `lobby/src/core/showcase.ts`, `lobby/src/shell/showcase.ts`
- Modify: `lobby/tests/**` — every test importing the old registry (`tiles`, `chrome`, `showcase`, `showcase-dom`, `refresh`, `main`, `registry`)
- Modify: `justfile` — the `check-showcase` recipe's URL scheme

**Interfaces:**
- Consumes: `LISTED_GAMES`, `GameMeta` and `gamePath(id)` from `@host/registry` (Task 14).
- Produces: tiles and showcase frames pointing at the relative path `/<id>/` rather than an absolute subdomain URL. This is what makes the single origin work.

**Context this task must not miss.** The lobby gained a **showcase carousel** after the plan was first written: `lobby/src/core/showcase.ts` (pure state — imports the `Game` type from the registry being deleted) and `lobby/src/shell/showcase.ts` (owns an iframe; reads `game.launchUrl` **twice** — `frame.src` and `launch.href`). `createShowcase` filters on `g.showcase`, which `GameMeta` now carries. There is also a `just check-showcase` recipe built around the subdomain URLs.

A welcome side effect: after the cutover the showcase iframes are **same-origin**, so no cross-origin framing constraints apply to them at all.

- [ ] **Step 1: Write the failing test**

Add to `lobby/tests/tiles.test.ts` (create it if absent):

```typescript
import { describe, it, expect } from 'vitest'
import { LISTED_GAMES } from '@host/registry'
import { renderTiles } from '../src/shell/tiles'

describe('tiles use same-origin paths', () => {
  it('links each game to /<id>/ rather than a subdomain', () => {
    const host = document.createElement('div')
    renderTiles(host, LISTED_GAMES, () => null)
    const hrefs = [...host.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(LISTED_GAMES.map((g) => `/${g.id}/`))
    expect(hrefs.some((h) => h?.includes('slabgorb.com'))).toBe(false)
  })

  it('omits games marked listed: false', () => {
    expect(LISTED_GAMES.some((g) => g.id === 'red-baron')).toBe(false)
  })
})

describe('the showcase carousel survives the origin collapse', () => {
  it('carries the same membership the old registry had', () => {
    // tempest and centipede were the two showcase: true entries. If this changes,
    // a game silently entered or left the carousel during the migration.
    expect(GAMES.filter((g) => g.showcase).map((g) => g.id)).toEqual(['tempest', 'centipede'])
  })

  it('frames each showcased game at a same-origin path, not a subdomain', () => {
    const section = document.createElement('section')
    mountShowcase(section, createShowcase(GAMES))
    const src = section.querySelector('iframe')?.getAttribute('src')
    expect(src).toMatch(/^\/[a-z-]+\/$/)
    expect(src).not.toContain('slabgorb.com')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project lobby tests/tiles.test.ts`
Expected: FAIL — `@host/registry` resolves, but `renderTiles` still emits `game.launchUrl`, which no longer exists on `GameMeta`.

- [ ] **Step 3: Rewrite the tile href**

In `lobby/src/shell/tiles.ts`, replace the launch-URL line:

```typescript
// Was: tile.href = game.launchUrl — an absolute subdomain URL from a hand-kept
// list. The cabinet is one origin now, so every game is a relative path and there
// is no URL to keep in sync.
tile.href = `/${game.id}/`
```

Update the `Game` type import at the top of the file to `import type { GameMeta } from '@host/contract'` and rename the parameter type accordingly.

- [ ] **Step 4: Rewrite lobby/src/main.ts**

```typescript
import { LISTED_GAMES } from '@host/registry'
```

replacing `import { GAMES } from './core/registry'`, and pass `LISTED_GAMES` to `renderTiles`.

- [ ] **Step 5: Delete the hand-maintained registry**

```bash
rm lobby/src/core/registry.ts
grep -rn "core/registry" lobby/ || echo "no references to the old registry remain"
```

- [ ] **Step 6: Run the lobby suite**

Run: `npx vitest run --project lobby`
Expected: PASS. Any test still importing `./core/registry` must be repointed at `@host/registry`.

- [ ] **Step 7: Commit**

```bash
git add lobby src/host
git commit -m "feat(lobby): read the generated registry, link same-origin paths

Deletes lobby/src/core/registry.ts — six hardcoded launch URLs and six hardcoded
versions that nothing generated or checked. Tiles now link /<id>/ on the single
origin.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 16: The per-app build script

**Files:**
- Create: `scripts/build-app.mjs`
- Modify: `scripts/deploy-r2.mjs` — accept a key prefix
- Modify: `tests/deploy-r2.test.mjs` (the existing orchestrator test)

**Interfaces:**
- Consumes: `defineAppConfig` (Task 3), each game's `build` export (Task 14).
- Produces: `node scripts/build-app.mjs <id>` writing `dist/<id>/` (or `dist/` for the lobby); `collectUploads(distDir, keyPrefix)` returning keys prefixed with `<keyPrefix>/`.

- [ ] **Step 1: Write the failing test for the key prefix**

Add to `tests/deploy-r2.test.mjs`:

```javascript
test('collectUploads prefixes keys when a prefix is given', () => {
  const dir = mkdtempSync(join(tmpdir(), 'deploy-'));
  mkdirSync(join(dir, 'assets'), { recursive: true });
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');
  writeFileSync(join(dir, 'assets', 'app.js'), 'export {}');

  const keys = collectUploads(dir, 'tempest').map((u) => u.key).sort();
  assert.deepEqual(keys, ['tempest/assets/app.js', 'tempest/index.html']);
});

test('collectUploads leaves keys bare when no prefix is given', () => {
  const dir = mkdtempSync(join(tmpdir(), 'deploy-'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html>');

  assert.deepEqual(collectUploads(dir).map((u) => u.key), ['index.html']);
});
```

Add the imports the new tests need at the top of the file: `mkdtempSync`, `mkdirSync`, `writeFileSync` from `node:fs`, `join` from `node:path`, `tmpdir` from `node:os`.

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/deploy-r2.test.mjs`
Expected: FAIL — `collectUploads` ignores the second argument, so keys come back unprefixed.

- [ ] **Step 3: Add the prefix to deploy-r2.mjs**

```javascript
// Pure: walks distDir and computes the upload set. No wrangler, no side effects.
// `keyPrefix` puts a game's objects under its own key prefix in the shared
// bucket — one origin, one bucket, per-game deploy isolation. The lobby passes
// no prefix and owns the root keys.
export function collectUploads(distDir, keyPrefix = '') {
  if (!existsSync(distDir)) {
    throw new Error(`no files found under ${distDir} — did the build run?`);
  }
  const files = walk(distDir);
  if (files.length === 0) throw new Error(`no files found under ${distDir} — did the build run?`);
  const prefix = keyPrefix ? `${keyPrefix.replace(/\/+$/, '')}/` : '';
  return files.map((file) => {
    const rel = relative(distDir, file).split('\\').join('/'); // POSIX keys on any OS
    const key = `${prefix}${rel}`;
    return { key, file, contentType: contentTypeFor(key) };
  });
}

export function uploadDir(distDir, bucket, keyPrefix = '') {
  const uploads = collectUploads(distDir, keyPrefix);
  for (const { key, file, contentType } of uploads) {
    console.log(`  ${bucket}/${key}  (${contentType})`);
    execFileSync(
      'wrangler',
      ['r2', 'object', 'put', `${bucket}/${key}`, '--file', file, '--remote', '--content-type', contentType],
      { stdio: ['ignore', 'ignore', 'inherit'] },
    );
  }
  console.log(`Uploaded ${uploads.length} objects to ${bucket}${keyPrefix ? `/${keyPrefix}` : ''}.`);
}

// CLI entry (only when run directly, not when imported by the test).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [distDir, bucket, keyPrefix = ''] = process.argv.slice(2);
  if (!distDir || !bucket) {
    console.error('Usage: node scripts/deploy-r2.mjs <distDir> <bucket> [keyPrefix]');
    process.exit(1);
  }
  uploadDir(distDir, bucket, keyPrefix);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/deploy-r2.test.mjs`
Expected: PASS.

- [ ] **Step 5: Write the build script**

Create `scripts/build-app.mjs`:

```javascript
// Builds one app: `node scripts/build-app.mjs <id>` where <id> is a directory
// under plugins/, or 'lobby'.
//
// One origin does not mean one build. Each game builds independently into
// dist/<id>/ and uploads to only its own key prefix, which is what preserves
// per-game versions, per-game test gates and per-game releases in a single repo.
import { build } from 'vite';
import { readFileSync, existsSync } from 'node:fs';
import { defineAppConfig } from '../vite.config.js';

const id = process.argv[2];
if (!id) {
  console.error('Usage: node scripts/build-app.mjs <id>   (a plugins/ directory, or "lobby")');
  process.exit(1);
}

const appDir = id === 'lobby' ? 'lobby' : `plugins/${id}`;
if (!existsSync(appDir)) {
  console.error(`No such app: ${appDir}`);
  process.exit(1);
}

// Extra HTML entries come from the manifest's `build` export, kept separate from
// GameMeta so build config never reaches the tile renderer. Read as text rather
// than imported, because this script runs outside the TS toolchain.
let entries = [];
const manifestPath = `${appDir}/plugin.ts`;
if (existsSync(manifestPath)) {
  const src = readFileSync(manifestPath, 'utf8');
  const m = src.match(/export const build:\s*BuildSpec\s*=\s*\{\s*entries:\s*\[([^\]]*)\]/);
  if (m) {
    entries = m[1]
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }
}

console.log(`Building ${id}${entries.length ? ` (+ ${entries.join(', ')})` : ''}…`);
await build(defineAppConfig({ id, entries }));
```

- [ ] **Step 5b: Gitignore `dist/` BEFORE the first build — this task owns it**

**PLAN DEFECT #17, found by Task 12b.** The root `.gitignore` has **no `dist/` entry**, and no task
in this plan added one. Verified: `git check-ignore -v dist/tempest` matches nothing. Every subrepo
used to carry its own `dist/` rule inside its own `.gitignore`; those went away with the per-repo
tooling, and the build output moved to a **root** `dist/<id>/` that nothing ignores.

This task is the one that first creates that directory, so it is the one that must close the hole —
and it must do so **before Step 6 runs a build**, not after, or the very next `git add -A` in any
session commits eight built apps.

```bash
printf '# Build output — every app builds to dist/<id>/ (Task 16).\ndist/\n' >> .gitignore
git check-ignore -v dist/tempest    # must now match
```

joust's removed `fresh-checkout hygiene` assertion is what routed this here; Task 12b's
`build output is never tracked` test is currently the only guard, and a todo cannot stop a commit.

- [ ] **Step 5c: Pin the dev-tool entries against the filesystem — nothing else does**

**PLAN DEFECT #20.** Three games ship a second HTML entry beyond `index.html`, measured on disk:

| app | HTML files |
|---|---|
| tempest | `index.html`, `models.html` |
| star-wars | `index.html`, `models.html`, `scenes.html` |
| red-baron | `index.html`, `models.html` |

(asteroids, battlezone, centipede and joust ship `index.html` only. The manifests in Task 14 declare
exactly this set — verified — so the *data* is right.)

What is missing is any guard on the **chain** that carries it. `BuildSpec` has no runtime validator
and no test, and Step 5's extraction reads the declaration with a **regex over source text**:

```js
const m = src.match(/export const build:\s*BuildSpec\s*=\s*\{\s*entries:\s*\[([^\]]*)\]/)
```

Reformat a manifest across two lines and that match returns `null`. The build then emits a game with
**no dev-tool page and no error** — `tsc` still passes, because the declaration is perfectly valid
TypeScript. Task 12b's `dev-tool HTML entries are opt-in, never inherited` guards the *factory*
(`defineAppConfig` honours `entries` in both directions); it says nothing about whether the entries
ever reach it.

Add to `tests/monorepo-topology.test.mjs` (node:test), asserting **both directions against the
filesystem** so neither a silent drop nor a stale declaration survives:

```js
test('every plugin dev-tool HTML file is declared, and every declared one exists', () => {
  for (const id of GAMES) {
    const dir = `plugins/${id}`
    const onDisk = readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'index.html').sort()
    const src = existsSync(`${dir}/plugin.ts`) ? readFileSync(`${dir}/plugin.ts`, 'utf8') : ''
    const m = src.match(/export const build:\s*BuildSpec\s*=\s*\{\s*entries:\s*\[([^\]]*)\]/)
    const declared = m ? [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map(x => x[1]).sort() : []
    assert.deepEqual(declared, onDisk,
      `${id}: declared dev-tool entries must match the .html files on disk — a regex that stops matching drops a page silently`)
  }
})
```

Mutation-prove it twice, because it has two failure directions: reformat one manifest's `build`
export across two lines (the regex stops matching → must redden), and delete a declared `.html`
(must redden the other way). Revert both.

**And make the extractor itself fail loudly, not just the test.** A test catches this in CI; the
script should refuse to produce a wrong build at all. In `scripts/build-app.mjs`, if a manifest's
source contains the string `BuildSpec` but the regex does not match, **`throw`** — never fall through
to `entries = []`. The whole hazard is that the regex is defeated by formatting `tsc` is perfectly
happy with, so silence is indistinguishable from "this game has no dev tools":

```
entries on its own line     trailing comma after the array     satisfies BuildSpec
as const                    double-quoted strings              array spilling past printer width
```

Every one of those yields zero entries and a **green** build that silently drops star-wars' two dev
pages and tempest's one. Prettier reformatting a manifest is enough to trigger it.

Also pin the **parsed** list per game as data (`tempest → ['models.html']`, `star-wars →
['models.html','scenes.html']`, `red-baron → ['models.html']`), not merely an aggregate count — an
aggregate stays green when one game's entry moves to another.

- [ ] **Step 6: Build every app**

```bash
for app in lobby tempest star-wars asteroids battlezone red-baron centipede joust; do
  node scripts/build-app.mjs "$app" || echo "FAILED: $app"
done
ls dist dist/tempest
```

Expected: `dist/index.html` (lobby) plus `dist/<id>/index.html` for each game, **and every extra dev-tool page**. Three games ship them, and they are silently lost if a `build` export is missing — assert them explicitly:

```bash
for f in dist/index.html \
         dist/tempest/index.html dist/tempest/models.html \
         dist/star-wars/index.html dist/star-wars/models.html dist/star-wars/scenes.html \
         dist/red-baron/index.html dist/red-baron/models.html \
         dist/asteroids/index.html dist/battlezone/index.html \
         dist/centipede/index.html dist/joust/index.html; do
  [ -f "$f" ] && echo "ok   $f" || echo "MISSING $f"
done
```

Expected: twelve `ok` lines, no `MISSING`. That list is the complete set of HTML entries across the fleet, taken from the per-repo `vite.config.ts` files before they were deleted — tempest and red-baron each had `models.html`, star-wars had `models.html` **and** `scenes.html`, and the other four had only `index.html`.

**Base-path audit.** Each game moved from `base: '/'` to `base: '/<id>/'`. Grep each game's built HTML and JS for absolute asset paths that no longer carry the prefix:

```bash
for g in tempest star-wars asteroids battlezone red-baron centipede joust; do
  echo "== $g"
  grep -roE 'src="/[^"]*"|href="/[^"]*"' "dist/$g" | grep -v "/$g/" | head -5
done
```

Expected: no output. Any hit is a hardcoded root-absolute asset reference that must be changed to a relative path or given the `/<id>/` prefix. tempest's sfx already resolve at `/tempest/sfx/` and should be clean.

- [ ] **Step 7: Commit**

```bash
git add scripts/build-app.mjs scripts/deploy-r2.mjs tests/deploy-r2.test.mjs
git commit -m "feat(build): per-app build script and prefixed R2 uploads

node scripts/build-app.mjs <id> builds one app into dist/<id>/; deploy-r2.mjs
takes a key prefix so each game uploads only under its own prefix in the shared
bucket. Per-game deploy isolation survives the single origin.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 17: Rewrite the release script for prefixed tags

**Files:**
- Modify: `scripts/release.mjs`

**Interfaces:**
- Consumes: `scripts/build-app.mjs` (Task 16), the vitest project names (Task 3).
- Produces: `just release <name> [level]` creating tag `<name>-vX.Y.Z` on `main`. Consumed by Task 18's CI trigger.

- [ ] **Step 1: Read the current release script**

```bash
sed -n '1,80p' scripts/release.mjs
```

Note its preflight, gate, bump, merge and tag stages — the merge stage is being deleted.

- [ ] **Step 2: Rewrite the pipeline**

The new stages, replacing the develop→main `--no-ff` merge entirely:

1. **Preflight** — working tree clean, on `main`, in sync with `origin/main`.
2. **Gate** — `npx vitest run --project <name>` and `node scripts/build-app.mjs <name>`. Only that game's project runs, which is what keeps a red joust from blocking a tempest release.
3. **Bump** — `plugins/<name>/package.json` (or `lobby/package.json`) by `patch|minor|major`.
4. **Regenerate** — `node scripts/gen-registry.mjs`, so the tile version follows the bump in the same commit.

   **Delete `syncLobbyTileVersion`.** The current script hand-writes each game's bumped version into `lobby/src/core/registry.ts` — the file Task 15 deletes. `gen-registry.mjs` replaces it entirely: the tile version is derived from the game's own `package.json` rather than copied into a second place that can drift. Grep for remaining callers before finishing:

   ```bash
   grep -rn "syncLobbyTileVersion" scripts/ tests/ || echo "clean"
   ```
5. **Commit** — `chore(release): <name> vX.Y.Z`, including the regenerated registry.
6. **Tag** — annotated `<name>-vX.Y.Z`.
7. **Push** — `git push origin main && git push origin <name>-vX.Y.Z`.

Key fragment for the tag name, which is what makes per-game releases possible in one repo:

```javascript
// One repo cannot hold two v1.0.29, so every tag is namespaced by app. The deploy
// workflow parses the app id back out of the tag; an unprefixed vX.Y.Z tag will
// not match its trigger and deploys nothing.
const tag = `${name}-v${nextVersion}`;
```

- [ ] **Step 3: Dry-run the gate on one game**

```bash
npx vitest run --project asteroids && node scripts/build-app.mjs asteroids
```

Expected: both succeed. This is exactly what the release gate runs.

- [ ] **Step 4: Verify the release script refuses a dirty tree**

```bash
touch scratch-dirty.txt
node scripts/release.mjs asteroids patch; echo "exit=$?"
rm scratch-dirty.txt
```

Expected: non-zero exit with a "working tree not clean" style message, and **no tag created**. Confirm with `git tag -l 'asteroids-v*'`.

- [ ] **Step 5: Commit**

```bash
git add scripts/release.mjs
git commit -m "feat(release): per-game gate, prefixed tags, no develop->main merge

Tags are <game>-vX.Y.Z because one repo cannot hold two v1.0.29. The gate runs
only that game's vitest project, so a red joust cannot block a tempest release.
The registry is regenerated in the release commit so the tile version follows.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 18: One tag-triggered deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`
- Delete: `.github/workflows/deploy-r2.yml`

**Interfaces:**
- Consumes: tags from Task 17, `build-app.mjs` and prefixed `deploy-r2.mjs` (Task 16).
- Produces: a deploy on every `<app>-v*` tag push, uploading to `arcade-lobby` under that app's key prefix.

- [ ] **Step 1: Write the workflow**

```yaml
# One workflow for the whole cabinet. Replaces eight ten-line per-repo callers
# plus the reusable deploy-r2.yml.
#
# Triggered by a TAG, not by a push to main: main carries every app's commits, so
# a branch trigger would redeploy all eight on every commit. `just release <name>`
# tags <name>-vX.Y.Z, and the app id is parsed back out of the tag here.
name: deploy

on:
  push:
    tags: ['*-v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    concurrency:
      group: deploy-${{ github.ref_name }}
      cancel-in-progress: false
    steps:
      # fetch-depth: 0 is REQUIRED, not tidiness. tempest's and red-baron's
      # citation gates resolve blobs from the commit their audit was taken against
      # (`git show <AUDIT_COMMIT>:<path>`), preserved as the audit/* tags. Under a
      # shallow clone those objects are absent and both gates fail, blocking the
      # deploy of a perfectly good build.
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0

      - name: Resolve the app from the tag
        id: app
        run: |
          # tempest-v1.0.29 -> tempest ; star-wars-v0.0.33 -> star-wars
          app="${GITHUB_REF_NAME%-v*}"
          if [ "$app" = "$GITHUB_REF_NAME" ]; then
            echo "::error::tag '$GITHUB_REF_NAME' is not <app>-vX.Y.Z"; exit 1
          fi
          if [ "$app" != "lobby" ] && [ ! -d "plugins/$app" ]; then
            echo "::error::no such app: $app"; exit 1
          fi
          echo "id=$app" >> "$GITHUB_OUTPUT"
          # The lobby owns the bucket root; every game gets its own key prefix.
          if [ "$app" = "lobby" ]; then
            echo "prefix=" >> "$GITHUB_OUTPUT"
            echo "dist=dist" >> "$GITHUB_OUTPUT"
          else
            echo "prefix=$app" >> "$GITHUB_OUTPUT"
            echo "dist=dist/$app" >> "$GITHUB_OUTPUT"
          fi

      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      # Only this app's project runs. A red joust suite must not block a tempest
      # release — that isolation is the reason per-game releases survived the
      # monorepo collapse.
      - run: npx vitest run --project ${{ steps.app.outputs.id }}

      - run: node scripts/build-app.mjs ${{ steps.app.outputs.id }}

      - name: Upload to R2
        run: |
          npm install -g wrangler
          node scripts/deploy-r2.mjs "${{ steps.app.outputs.dist }}" arcade-lobby "${{ steps.app.outputs.prefix }}"
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: a55aafa9b0691f828cd6864be28c1674
```

- [ ] **Step 2: Delete the reusable workflow**

```bash
rm .github/workflows/deploy-r2.yml
```

- [ ] **Step 3: Verify the tag-parsing logic locally**

```bash
for tag in tempest-v1.0.29 star-wars-v0.0.33 red-baron-v0.1.1 lobby-v0.0.22 v1.0.0; do
  app="${tag%-v*}"
  if [ "$app" = "$tag" ]; then echo "$tag -> REJECTED (not <app>-vX.Y.Z)";
  else echo "$tag -> $app"; fi
done
```

Expected: `star-wars-v0.0.33 -> star-wars` and `red-baron-v0.1.1 -> red-baron` (hyphenated ids survive, because `%-v*` strips the *last* `-v`), and the bare `v1.0.0` is rejected.

- [ ] **Step 4: Confirm the deploy secret exists**

```bash
gh secret list -R slabgorb/arcade | grep CLOUDFLARE_API_TOKEN || echo "MISSING — set it before the first release"
```

If missing, set it from a file or a pipe — `gh secret set` under this harness stores an empty value on EOF.

- [ ] **Step 4b: Assert the workflow's deploy target — this task owns it now**

**PLAN DEFECT #18, found by Task 12b's review.** Every game's deleted `CI deploy caller` describe
asserted *which bucket* its workflow uploaded to and *what triggered* it. Task 12b booked that
interior as an accepted loss on the grounds that this task replaces the callers — but this task, as
written, produces workflow YAML and **no test**, so after 12b's loss and this task's silence,
**nothing anywhere asserts which bucket CI deploys to.** Seven per-repo guards became zero.

That is the exact "the invariant moves, it does not evaporate" failure the epic exists to prevent,
arrived at by two tasks each reasonably assuming the other held it.

Add to `tests/monorepo-topology.test.mjs` (node:test — this is the orchestrator suite, not vitest;
Task 12b already created the file, so extend it rather than replacing anything):

```js
test('the deploy workflow targets the cabinet bucket, on a tag trigger', () => {
  const wf = readFileSync('.github/workflows/deploy.yml', 'utf8')
  assert.match(wf, /arcade-lobby/, 'CI must upload to the cabinet bucket')
  assert.match(wf, /tags:/, 'deploy must fire on a tag, not a push to main')
  assert.doesNotMatch(wf, /arcade-(tempest|star-wars|asteroids|battlezone|red-baron|centipede|joust)\b/,
    'the seven per-game buckets are retired — a reference to one means the prefix collapse regressed')
})
```

Mutation-prove it: point the workflow at `arcade-tempest`, confirm red, revert. Do not skip this
because the workflow "obviously" says the right thing — that is what the seven deleted guards were
for, and every silent failure found in this migration passed a reading.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows
git commit -m "ci: one tag-triggered deploy replacing eight per-repo callers

Fires on <app>-v* tags rather than pushes to main, since main now carries every
app's commits. fetch-depth: 0 is required — tempest's and red-baron's citation
gates read blobs from their audit commits.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 19: One dev server, one port

**Files:**
- Modify: `justfile` — `serve`, `install-all`, `test-all`, `deploy`, `deploy-one`, **`deploy-assets`**
- Modify: `plugins/star-wars/tools/music-bake/deploy-assets.test.mjs` — strengthen its path guard
- Delete: `scripts/serve.mjs`, `scripts/deps-doctor.mjs` (both exist only to orchestrate eight subrepos)

- [ ] **Step 0b: Fix `deploy-assets`, which Task 7 broke and no task owned — added after Task 7's review**

`justfile:268` and `:270` still run `node {{root}}/star-wars/tools/music-bake/bake-music.mjs` and
`…/pokey-bake/bake-sfx.mjs`. Root-level `star-wars/` no longer exists — it is `plugins/star-wars/` —
so the recipe dies before the upload. Task 7's report deferred this to "Task 17/19", but that
ownership did not exist: this task's scope named only `serve`/`install-all`/`test-all`/`deploy`/
`deploy-one`, and Task 17 touches only `scripts/release.mjs`. It is now explicitly yours.

Re-point both paths at `plugins/star-wars/…`.

**And strengthen the guard, because it went green over the breakage.**
`plugins/star-wars/tools/music-bake/deploy-assets.test.mjs:76` asserts only that the *string*
`star-wars/music` appears somewhere in the justfile — which the **stale** path satisfies just as
well as a correct one. Assert that the script paths the recipe invokes actually **exist on disk**,
so a future move reddens instead of passing.

This matters more here than the shape suggests: assets and code deploy independently in this repo,
`audio.ts` degrades silently on a 404, and a missing star-wars upload once hid from sw7-18 all the
way to sw8-14. Losing the only watcher over the upload path is precisely the failure this epic
exists to prevent.

**Interfaces:**
- Consumes: `build-app.mjs` (Task 16), `defineAppConfig` (Task 3).
- Produces: `just serve` running one Vite dev server on 5270 — `/` the lobby, `/<id>/` each game.

- [ ] **Step 0: VERIFY the host pinning — already restored in Task 5, do NOT re-add**

**Owner ruling 2026-07-30: this step moved forward into Task 5's fix round.** Task 5's review found
the guard was gone from the *product*, not merely from the deleted test, and the owner ruled it be
closed in place rather than left unguarded until this task. Your job here is to **confirm** the
`server`/`preview` blocks below are present in `vite.config.ts` and that the misleading comment is
gone. If both hold, tick this step and move to Step 1 — adding them a second time is a defect.

The rationale is retained because the recurring failure is someone "simplifying" the pin away
again. Task 3's factory originally carried this comment and no `server`/`preview` block at all:

```
// The old per-repo `strictPort` + `host: '127.0.0.1'` pinning is gone: there is
// exactly one dev server now, so there is no eight-way port collision to guard.
```

**That reasoning is wrong and the guard must come back.** The collision td1-1 closed was never only eight-way — it is also **between checkouts**. `a-1`, `a-2` and `a-3` all exist on this machine and all run `just serve`. `strictPort` alone does not protect a pin: with `127.0.0.1:5270` held by one checkout, an unpinned `host` lets Vite happily bind `[::1]:5270` in another, and two dev servers share the port with **no collision error at all**. That is the exact silent-wrong-checkout trap documented in the orchestrator CLAUDE.md.

Collapsing eight ports to one shrinks the surface but does not remove it, and in one respect concentrates it: a wrong-checkout server now serves the **entire cabinet** wrongly rather than one game.

Add to `defineAppConfig`'s returned config, and replace the misleading comment:

```typescript
    // ONE dev server for the cabinet, but the pin still matters. strictPort alone
    // does NOT protect it: with 127.0.0.1:5270 held by another checkout (a-2, a-3),
    // an unpinned host lets Vite bind [::1]:5270 instead and two servers share the
    // port with no error — the silent-wrong-checkout trap td1-1 closed fleet-wide.
    // Collapsing eight ports to one reduces that surface; it does not remove it,
    // and a wrong-checkout server now serves the whole cabinet, not one game.
    server: { host: '127.0.0.1', port: 5270, strictPort: true },
    preview: { host: '127.0.0.1', port: 5270, strictPort: true },
```

- [ ] **Step 1: Replace the serve recipe**

```make
# Serve the whole cabinet from ONE dev server. The lobby is /, each game /<id>/.
#
# Replaces eight servers on eight pinned ports. The host+strictPort pin lives in
# vite.config.ts (see its comment) and still matters across sibling checkouts —
# a-1/a-2/a-3 all race this one port now.
serve:
    @npx vite
```

The port and strictPort come from the config rather than CLI flags, so a bare `npx vite` at the repo root is pinned too — not only invocations that remember the flags.

- [ ] **Step 2: Replace install-all and test-all**

```make
# One install for the whole cabinet.
install-all:
    @npm install

# One vitest run across every project.
test-all:
    @npx vitest run

# One app's project only — what the release gate runs.
test-one name:
    @npx vitest run --project {{name}}
```

- [ ] **Step 3: Replace the deploy recipes**

```make
# Manual fallback — bypasses tags and CI, the only way prod can diverge from a
# release. Prefer `just release <name>`.
deploy:
    #!/usr/bin/env bash
    set -euo pipefail
    node {{root}}/scripts/build-app.mjs lobby
    node {{root}}/scripts/deploy-r2.mjs {{root}}/dist arcade-lobby
    for g in {{games}}; do
      echo "==> $g"
      node {{root}}/scripts/build-app.mjs "$g"
      node {{root}}/scripts/deploy-r2.mjs "{{root}}/dist/$g" arcade-lobby "$g"
    done
    echo "Deploy complete."

deploy-one name:
    #!/usr/bin/env bash
    set -euo pipefail
    node {{root}}/scripts/build-app.mjs {{name}}
    if [ "{{name}}" = "lobby" ]; then
      node {{root}}/scripts/deploy-r2.mjs {{root}}/dist arcade-lobby
    else
      node {{root}}/scripts/deploy-r2.mjs {{root}}/dist/{{name}} arcade-lobby {{name}}
    fi
```

- [ ] **Step 4: Update the `games` and `subrepos` variables**

`games` becomes the seven plugin directory names; `subrepos` no longer exists as a concept and every reference to it must go. Verify:

```bash
grep -n "subrepos" justfile || echo "no subrepos references remain"
```

- [ ] **Step 5: Delete the obsolete orchestration scripts**

```bash
rm -f scripts/serve.mjs scripts/deps-doctor.mjs
grep -rn "serve.mjs\|deps-doctor" justfile scripts/ tests/ || echo "no references remain"
```

Delete or update any orchestrator test that asserted the eight-server serve contract.

- [ ] **Step 6: Verify the cabinet serves**

```bash
just serve &
sleep 4
for p in "" tempest/ star-wars/ asteroids/ battlezone/ red-baron/ centipede/ joust/; do
  printf '%-14s %s\n' "/$p" "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:5270/$p")"
done
kill %1
```

Expected: `200` on every line.

- [ ] **Step 7: Commit**

```bash
git add justfile scripts tests
git commit -m "feat(dev): one dev server on one port for the whole cabinet

Replaces eight servers on eight pinned ports, and with them the strictPort/host
pinning and the sibling-checkout port trap. / is the lobby, /<id>/ each game.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 20: Widen the high-score row guard for migrated rows

The cookie carries `{name, score}` only — the domain field (`level`/`wave`) is deliberately stripped. `makeHighScoreRowGuard('level')` requires a finite `level`, so a row seeded from the cookie is dropped on the **next** load. This task makes `null` an accepted, honest value for that field.

**Files:**
- Modify: `src/shared/highscore.ts`
- Modify: `src/shared/tests/highscore.test.ts`

**Interfaces:**
- Produces: `HighScoreEntry<DomainKey>` whose domain field is `number | null`, and a guard accepting a finite number **or** explicit `null` (never `undefined`, never a non-numeric). Consumed by Task 21's seeding, and by every game's board renderer.

- [ ] **Step 1: Write the failing test**

Add to `src/shared/tests/highscore.test.ts`:

```typescript
describe('row guard — migrated rows carry a null domain value', () => {
  const guard = makeHighScoreRowGuard('level')

  it('accepts a normal row', () => {
    expect(guard({ name: 'JPX', score: 149830, level: 12 })).toBe(true)
  })

  it('accepts a migrated row whose level is explicitly null', () => {
    // Seeded from the cross-origin cookie, which carries no domain field. The
    // alternative — fabricating a level — would be the cabinet inventing a fact
    // about a player's game.
    expect(guard({ name: 'JPX', score: 149830, level: null })).toBe(true)
  })

  it('still rejects a row with the domain field missing entirely', () => {
    expect(guard({ name: 'JPX', score: 149830 })).toBe(false)
  })

  it('still rejects a non-numeric, non-null domain value', () => {
    expect(guard({ name: 'JPX', score: 149830, level: 'twelve' })).toBe(false)
    expect(guard({ name: 'JPX', score: 149830, level: undefined })).toBe(false)
    expect(guard({ name: 'JPX', score: 149830, level: NaN })).toBe(false)
  })

  it('still rejects a non-finite score', () => {
    expect(guard({ name: 'JPX', score: Infinity, level: 3 })).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project shared tests/highscore.test.ts`
Expected: FAIL on "accepts a migrated row whose level is explicitly null" — `Number.isFinite(null)` is `false`.

- [ ] **Step 3: Widen the type and the guard**

In `src/shared/highscore.ts`:

```typescript
/** A game's own domain field — the level or wave the score was set on.
 *
 *  `null` means MIGRATED: the row came across the origin boundary in the ADR-0004
 *  summary cookie, which carries name and score only. Fabricating a level would be
 *  the cabinet inventing a fact about a player's game — the same lie the lb2-8
 *  amendment refused when it declined to invent initials. Boards render a blank.
 *  Rows written after migration always carry a real number, so null is strictly
 *  transitional and clears itself as new scores displace old ones. */
export type HighScoreEntry<DomainKey extends string> = HighScoreEntryBase & {
  [K in DomainKey]: number | null
}
```

and in `makeHighScoreRowGuard`:

```typescript
export function makeHighScoreRowGuard<DomainKey extends string>(
  domainKey: DomainKey,
): (value: unknown) => value is HighScoreEntry<DomainKey> {
  return (value: unknown): value is HighScoreEntry<DomainKey> => {
    const row = value as Record<string, unknown>
    if (!isHighScoreRow(value)) return false
    const domain = row[domainKey]
    // A finite number, or an EXPLICIT null (a migrated row). `undefined` and a
    // missing key are still rejected: those mean the row is malformed, not
    // migrated, and silently admitting them would let junk into the table.
    return Number.isFinite(domain) || domain === null
  }
}
```

- [ ] **Step 4: Run the shared suite**

Run: `npx vitest run --project shared`
Expected: PASS. If `insertHighScore`'s sort compares the domain field anywhere, `null` must sort last rather than throwing — check and fix if so.

- [ ] **Step 5: Fix the board renderers**

The domain column must render blank for `null`, not `"null"`.

```bash
grep -rn "\.level\b\|\.wave\b" plugins/*/src/shell/render.ts plugins/*/src/core/*.ts | grep -i "highscore\|table\|board" | head
```

For each hit that formats the value for display, render `''` when it is `null`. Then run the affected games' projects.

- [ ] **Step 6: Run the full cabinet**

Run: `npx vitest run`
Expected: PASS across all projects.

- [ ] **Step 7: Commit**

```bash
git add src/shared plugins
git commit -m "feat(highscore): accept a null domain value on migrated rows

The cross-origin summary cookie carries name and score only, so a row seeded from
it has no level/wave and the guard would drop it on the NEXT load — a migration
that appears to work, then erases itself. null is now an accepted, honest value
that boards render blank; missing and non-numeric are still rejected.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 21: Seed same-origin scores from the cookie, then retire the transport

**Files:**
- Modify: `src/shared/highscore.ts`
- Modify: `src/shared/tests/highscore.test.ts`

**Interfaces:**
- Consumes: the widened guard (Task 20), `readTopScores`, `PUBLISHED_SUMMARY_DEPTH`.
- Produces: `makeHighScoreStorage` seeding once from the cookie when same-origin storage is empty. After this task the cookie is read-only legacy: nothing publishes to it.

- [ ] **Step 1: Write the failing test**

The critical property is **survival across a reload**. A seed-then-read test in one pass would certify a feature that erases itself.

```typescript
describe('one-time migration from the cross-origin cookie', () => {
  beforeEach(() => {
    localStorage.clear()
    document.cookie = 'arcade-hi-tempest=; Max-Age=0; Path=/'
  })

  it('seeds an empty same-origin table from the cookie ladder', () => {
    document.cookie = 'arcade-hi-tempest=JPX:149830,AAA:98000; Path=/'
    const storage = makeHighScoreStorage('tempest', makeHighScoreRowGuard('level'), 'level')

    expect(storage.load()).toEqual([
      { name: 'JPX', score: 149830, level: null },
      { name: 'AAA', score: 98000, level: null },
    ])
  })

  it('SURVIVES a reload — the seeded rows pass the guard on the next load', () => {
    document.cookie = 'arcade-hi-tempest=JPX:149830; Path=/'
    makeHighScoreStorage('tempest', makeHighScoreRowGuard('level'), 'level').load()

    // A brand-new storage instance, as if the page had been reloaded. This is the
    // assertion that matters: seeding into a shape the guard rejects would look
    // correct in a single pass and silently erase itself here.
    const reloaded = makeHighScoreStorage('tempest', makeHighScoreRowGuard('level'), 'level')
    expect(reloaded.load()).toEqual([{ name: 'JPX', score: 149830, level: null }])
  })

  it('does not seed when same-origin storage already has rows', () => {
    localStorage.setItem(
      highScoreKey('tempest'),
      JSON.stringify([{ name: 'ZZZ', score: 10, level: 1 }]),
    )
    document.cookie = 'arcade-hi-tempest=JPX:149830; Path=/'

    expect(makeHighScoreStorage('tempest', makeHighScoreRowGuard('level'), 'level').load()).toEqual([
      { name: 'ZZZ', score: 10, level: 1 },
    ])
  })

  it('seeds nothing from a legacy bare-number cookie', () => {
    // Pre-lb2-8 format: a score with no name. Inventing initials for it would be
    // the cabinet lying, so the game honestly starts empty.
    document.cookie = 'arcade-hi-tempest=149830; Path=/'
    expect(makeHighScoreStorage('tempest', makeHighScoreRowGuard('level'), 'level').load()).toEqual([])
  })

  it('seeds nothing when there is no cookie at all', () => {
    expect(makeHighScoreStorage('tempest', makeHighScoreRowGuard('level'), 'level').load()).toEqual([])
  })
})
```

These need a DOM. **Do not add a vitest project for it** — follow the idiom the lobby already uses: keep the project on `node` and opt this one file into jsdom with a docblock. Put the block in `src/shared/tests/highscore.dom.test.ts` starting with:

```typescript
// @vitest-environment jsdom
```

That is how `lobby/tests/{tiles,showcase-dom,refresh,main}.test.ts` get their DOM today, and it avoids a second project plus an `exclude` rule that has to stay in sync with a filename pattern. It also confines jsdom to the file that wants it — relevant because jsdom's `URL` global does not round-trip through `fileURLToPath`, which is what broke two lobby tests when jsdom was applied project-wide (Task 3).

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --project shared tests/highscore.dom.test.ts`
Expected: FAIL — `load()` returns `[]` because nothing seeds from the cookie yet.

- [ ] **Step 3: Implement the seed**

In `makeHighScoreStorage`, before the first `load()` returns:

```typescript
// ONE-TIME cross-origin migration. Player tables were written on
// <game>.slabgorb.com; the cabinet now serves from arcade.slabgorb.com/<id>/ and
// localStorage does not cross that boundary. The ADR-0004 summary cookie is
// scoped to the registrable domain, so it DOES cross — it is the bridge.
//
// Top five survive (PUBLISHED_SUMMARY_DEPTH); rows six through ten are lost. The
// domain field cannot cross at all, so seeded rows carry null (see the guard).
// Runs only when same-origin storage is empty, so it can never overwrite real
// local scores, and never runs again once anything has been saved.
function seedFromLegacyCookie(
  gameId: string,
  guard: (v: unknown) => boolean,
  domainKey: string,
): void {
  if (localStorage.getItem(highScoreKey(gameId)) !== null) return
  const rows = readTopScores(gameId)
  if (rows.length === 0) return
  const seeded = rows
    .map((r) => ({ name: r.name, score: r.score, [domainKey]: null }))
    .filter(guard)
  if (seeded.length > 0) {
    localStorage.setItem(highScoreKey(gameId), JSON.stringify(seeded))
  }
}
```

The domain key is passed explicitly rather than derived from the guard — a guard is an opaque predicate and reverse-engineering its key would be guesswork. Widen the factory signature to:

```typescript
export function makeHighScoreStorage<E extends HighScoreEntryBase>(
  gameId: string,
  guard: (value: unknown) => value is E,
  domainKey: string,
): HighScoreStorage<E>
```

Then update the five call sites — `plugins/tempest/src/main.ts`, `plugins/star-wars/src/main.ts`, `plugins/asteroids/src/main.ts`, `plugins/battlezone/src/main.ts`, `plugins/centipede/src/main.ts` — to pass their domain key (`'level'` for tempest, `'wave'` for centipede; read each file to confirm which it uses). These are **argument additions only**. If a call site needs any other change, stop: this epic does not modify game logic.

battlezone passes `isHighScoreRow` (the base guard, no domain field) rather than a domain guard. Leave that as it is and pass its existing domain key, or `''` if it genuinely has none — do not convert it to a domain guard here.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run --project shared`
Expected: PASS, including the reload-survival test.

- [ ] **Step 5: Retire the publish side**

Remove the `publish` call inside `save()` and the republish-on-load helper. Keep `readTopScores` and `cookieTopScoreTransport.read` — the seed needs them, and they stay until every player's browser has migrated. Mark them clearly:

```typescript
// LEGACY, read-only. Nothing publishes to this cookie any more (the cabinet is
// one origin). It exists solely so a returning player's pre-migration scores can
// be seeded once. Safe to delete once the migration window has passed.
```

- [ ] **Step 6: Point the lobby at same-origin storage**

`lobby/src/shell/storage.ts` reads the cookie via `readTopScore`. Same-origin now, so it reads `localStorage` directly. Update it and its tests — note the existing test seeded a single shared in-memory store, which modelled the bug as a fixture; same-origin is now genuinely correct, so that fixture becomes accurate rather than misleading.

- [ ] **Step 7: Run the full cabinet**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/shared lobby
git commit -m "feat(highscore): seed same-origin scores from the legacy cookie once

Players' tables live on the old per-game origins and cannot cross to
arcade.slabgorb.com. The ADR-0004 cookie is scoped to the registrable domain, so
it bridges: top five survive with a null domain field, rows six to ten are lost.
The publish side is retired; the read stays until the migration window closes.

Tested across a simulated reload, because seeding into a guard-rejected shape
would pass a single-pass test and then erase itself.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 22: Documentation, repos.yaml, and the ADR amendments

**Files:**
- Modify: `.pennyfarthing/repos.yaml`, `CLAUDE.md`, `docs/ops/hosting.md`, `docs/adr/0001-shared-code-strategy.md`, `docs/adr/0004-cross-origin-high-scores.md`

**Interfaces:**
- Consumes: everything above.
- Produces: `repos.yaml` with exactly one entry — the gate every pf command reads.

- [ ] **Step 1: Collapse repos.yaml to one entry**

```yaml
pr_title_format: '{type}({scope}): {title}'
repos:
  arcade:
    path: .
    type: orchestrator
    default_branch: main
    # MUST be the literal "trunk-based" — pf's branch-protection hook compares
    # against that exact string (pf/hooks/branch_protection.py). A bare "trunk"
    # or a typo silently falls through to the gitflow path and PROTECTS main,
    # blocking the direct sprint commits this repo depends on.
    branch_strategy: trunk-based
    description: 'The arcade: a plugin host for browser-based arcade-game clones.
      Games live in plugins/<id>/, shared code in src/shared/, the lobby at the
      root of the single origin. One repo, one origin, per-game releases by tag.'
    language: typescript
    framework: vite
    dev_command: just serve
    build_command: node scripts/build-app.mjs <id>
    test_command: npx vitest run
```

- [ ] **Step 2: Verify pf still accepts direct commits to main**

```bash
touch sprint/.pf-probe && git add sprint/.pf-probe && git commit -m "chore: probe" && git reset --hard HEAD~1
```

Expected: the commit succeeds. If the branch-protection hook blocks it, `branch_strategy` is not the literal `trunk-based`.

- [ ] **Step 3: Rewrite CLAUDE.md**

Sections needing replacement: Repository Structure (plugins/ tree, no gitignored subrepos), Subrepos & Commands (one install, one test), Serving the arcade (one port, one server — **delete the entire eight-port table and the "the port may belong to a different checkout" trap**), Production (one bucket, key prefixes, redirects), Releasing (tag-triggered, prefixed tags), Git Workflow (one repo, trunk-based).

- [ ] **Step 4: Rewrite docs/ops/hosting.md**

New architecture: one bucket `arcade-lobby` behind `arcade.slabgorb.com`, lobby at root keys, each game under `<id>/`; the old per-game hostnames as Single Redirects; deploy triggered by `<app>-v*` tags; the `fetch-depth: 0` requirement and why. Correct the stale bucket table using the real inventory from Task 1.

- [ ] **Step 5: Amend ADR-0001**

Add a status amendment — do not rewrite the original decision:

```markdown
## Amendment — 2026-07-30: superseded by the monorepo collapse

**Status: Superseded** by `docs/superpowers/specs/2026-07-30-arcade-plugin-host-design.md`.

Option 4 (version-pinned git dependency) is retired; Option 2 (workspace/monorepo),
rejected here because it "directly contradicts the topology," is adopted — the
topology is what changed. Two of this ADR's decision drivers are explicitly
retired by owner ruling: "independence preserved" and "a standalone game clone
must still build."

The determinism driver is RETAINED and better served. A shared change that alters
a game's replay behaviour now fails that game's tests in the same commit, rather
than lying dormant behind a pin until someone re-points it and forty changes land
at once.
```

- [ ] **Step 6: Amend ADR-0004**

```markdown
## Amendment — 2026-07-30: the single-origin collapse happened, and the cost estimate was wrong

**Status: Superseded** by `docs/superpowers/specs/2026-07-30-arcade-plugin-host-design.md`.

This ADR rejected collapsing onto one origin "on cost, not merit," pricing it as
requiring Enterprise-only Origin Rules. That estimate assumed path routing to
MULTIPLE buckets. One bucket with per-game key prefixes needs neither Origin Rules
nor a Worker, and the old hostnames redirect via free-tier Single Redirects.

The cookie is not deleted: it became the one-time migration bridge, since it is
the only pre-migration state readable from the new origin. Its `publish` side is
retired; `readTopScores` remains until the migration window closes. Top five rows
survive; the domain field cannot cross and seeds as `null`.

This ADR's closing note — "kept cheap to revisit… collapsing later swaps one
adapter" — held.

The three follow-ups this ADR logged were never filed as stories. The live one
(Safari's ITP 7-day purge of the games' OWN localStorage) is unaffected by the
migration and is filed separately — see the epic's final task.
```

- [ ] **Step 7: Commit**

```bash
git add .pennyfarthing/repos.yaml CLAUDE.md docs/
git commit -m "docs: one repo, one origin — repos.yaml, CLAUDE.md, hosting, ADRs

repos.yaml collapses to a single trunk-based entry. ADR-0001 and ADR-0004 get
status amendments rather than rewrites: ADR-0004's single-origin cost estimate
assumed path->multi-bucket routing, which one bucket with key prefixes avoids.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 23: Cut over the origin

**Files:** none — a deploy plus Cloudflare configuration.

**Interfaces:**
- Consumes: the real inventory from Task 1, the deploy workflow from Task 18.

### Ownership split (owner ruling, 2026-07-30)

**The owner handles all Cloudflare/DNS work.** Do not attempt it, and do not treat it as blocked work — it is simply somebody else's.

| Steps | Owner | Reversible? |
|---|---|---|
| 0–3: drift check, deploy, verify the new origin, verify assets | **the agent** | Yes — purely additive |
| 4: unbind the 7 R2 custom domains, add 7 Single Redirect rules | **the human owner** | Re-bind to undo |
| 5–6: verify the redirects, verify the high-score bridge in a browser | the agent, *after* step 4 | n/a — read-only |

**Steps 0–3 carry no outage risk at all.** Games are uploaded into key prefixes of the *existing* `arcade-lobby` bucket, which already sits behind the *existing* `arcade.slabgorb.com` custom domain. So `arcade.slabgorb.com/tempest/` starts working as soon as its keys land, with **no DNS change**, while all seven old subdomains keep serving their own buckets exactly as before. Nothing a player can reach changes until the owner does step 4.

That decoupling is the point: the new origin is proven working *before* any hostname is touched, so step 4 is a redirect of already-validated paths rather than a leap.

- [ ] **Step 0: Drift check — has any game moved since the manifest was pinned?**

A sibling session pushed 19 sprint commits to orchestrator `main` during Task 1, and nothing prevents another session claiming a backlog story mid-migration. Game code landing on `slabgorb/<game>/develop` after the import would be **silently absent** from the monorepo, because the import took the SHAs pinned in `docs/ops/migration-manifest.md`.

This converts that invisible loss into a detected one. Run it before the cutover, and re-import any drifted game before continuing.

```bash
while IFS='|' read -r _ repo sha _; do
  repo=$(echo "$repo" | tr -d ' `'); sha=$(echo "$sha" | tr -d ' `')
  case "$repo" in repo|---|'') continue;; esac
  remote=$(git ls-remote "https://github.com/slabgorb/$repo.git" refs/heads/develop 2>/dev/null | cut -f1)
  if [ -n "$remote" ] && [ "$remote" != "$sha" ]; then
    echo "DRIFTED: $repo — manifest $sha, origin/develop $remote"
  fi
done < <(grep '^| ' docs/ops/migration-manifest.md)
echo "drift check complete — any DRIFTED line above must be re-imported before cutover"
```

- [ ] **Step 1: Deploy the whole cabinet to the new bucket**

```bash
just deploy
```

Expected: the lobby's objects at the bucket root and each game's under its own prefix.

- [ ] **Step 2: Verify the new origin serves every app — with real requests**

A green test suite proves nothing here. The audio and asset layers degrade silently by design, so a 404 is indistinguishable from working code in vitest.

```bash
for p in "" tempest/ star-wars/ asteroids/ battlezone/ red-baron/ centipede/ joust/; do
  printf '%-14s %s\n' "/$p" "$(curl -s -o /dev/null -w '%{http_code}' "https://arcade.slabgorb.com/$p")"
done
```

Expected: `200` on every line.

**A `404` on a bare `<id>/` is the one thing here the agent cannot fix, and it is expected to need attention.** R2 serves objects by exact key, so `/tempest/` only resolves because a zone-level URL-rewrite rule (`arcade index.html for directory paths`) appends `index.html` to `/`-terminated paths. That rule was written when the only directory path was the lobby's root. If it does not match nested paths, every game 404s at its bare path while `/tempest/index.html` works fine.

Diagnose precisely and hand it over:

```bash
for p in tempest/ tempest/index.html; do
  printf '%-22s %s\n' "/$p" "$(curl -s -o /dev/null -w '%{http_code}' "https://arcade.slabgorb.com/$p")"
done
```

- Both `200` → the rewrite rule already covers nested paths. Nothing needed.
- `/tempest/` is `404` but `/tempest/index.html` is `200` → **the rewrite rule needs extending to nested directory paths. That is a Cloudflare change and belongs to the owner.** Report it with this exact evidence rather than working around it; a client-side fallback would paper over a routing bug for every game at once.
- Both `404` → the upload did not land. That one *is* the agent's: re-check `just deploy` output and the key prefixes.

- [ ] **Step 3: Verify each game's assets resolve under its prefix**

```bash
curl -s https://arcade.slabgorb.com/tempest/ | grep -oE '(src|href)="[^"]+"' | head
```

Expected: every relative asset resolves under `/tempest/`. Spot-check one JS and one asset URL per game with `curl -o /dev/null -w '%{http_code}'`.

- [ ] **Step 4: Redirect the old hostnames — OWNER'S STEP, not the agent's**

Hand over, do not attempt. The agent's job is to have steps 0–3 green first, so this is a redirect of already-verified paths.

All seven hostnames are live R2 custom-domain bindings (verified in Task 1): `tempest`, `star-wars`, `asteroids`, `battlezone`, `red-baron`, `centipede`, `joust` — each `.slabgorb.com`. `arcade.slabgorb.com` itself stays bound to `arcade-lobby` and must **not** be touched.

Per hostname:
1. R2 → the game's bucket → Settings → Public access → remove the custom domain.
2. Add a proxied DNS record for that hostname pointing at the zone.
3. Add a Single Redirect rule:
   - **When:** `http.host eq "tempest.slabgorb.com"`
   - **Then:** dynamic redirect → `concat("https://arcade.slabgorb.com/tempest", http.request.uri.path)`, status **301**, preserve query string.

A DNS record alone cannot produce a path redirect — the rule does the work. Free tier; needs neither a Worker nor Enterprise Origin Rules.

**Do not pass query-string decorations** on these redirects beyond preserving the original: ADR-0004 records that ITP 2.3 caps cookies to 24 hours when a page is reached via tracker-style link decoration, and the high-score bridge depends on that cookie surviving.

Order matters only in that a hostname is briefly unreachable between steps 1 and 3. Doing one game end-to-end first confirms the rule shape before repeating it six times.

- [ ] **Step 5: Verify each redirect**

```bash
for g in tempest star-wars asteroids battlezone red-baron centipede; do
  printf '%-12s %s\n' "$g" "$(curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}' "https://$g.slabgorb.com/")"
done
```

Expected: `301 -> https://arcade.slabgorb.com/<g>/` for each.

- [ ] **Step 6: Verify the high-score migration against a real browser**

Open `https://arcade.slabgorb.com/tempest/` in a browser that has played the old `tempest.slabgorb.com`. The board should show the top five with initials and blank levels. Reload once and confirm the rows are still there — that reload is the whole point of the guard widening.

- [ ] **Step 7: Record the cutover**

```bash
git commit --allow-empty -m "chore(migrate): cut over to the single origin

Cabinet deployed to arcade-lobby with per-game key prefixes; the six old
hostnames now 301 to arcade.slabgorb.com/<id>/. Verified with live requests, not
a test suite — the asset layers degrade silently, so only a real 200 proves it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 24: Teardown and the deferred follow-ups

Last, and only after Task 23 is verified. Until the old buckets are deleted, rollback is available: re-bind a custom domain and the old build serves again.

**Files:**
- Modify: `docs/ops/migration-manifest.md` — record the teardown

- [ ] **Step 1: Let the redirects soak**

Leave the old buckets in place for at least a week of real use. Deleting them is what makes the migration irreversible; nothing else does.

- [ ] **Step 2: Archive the nine repos**

On GitHub, Settings → Archive this repository for each of `tempest`, `star-wars`, `asteroids`, `battlezone`, `red-baron`, `centipede`, `joust`, `lobby`, `arcade-shared`. **Archive, do not delete** — they are the only place per-file blame before the migration survives, and the `audit/*` tags' provenance lives there too.

- [ ] **Step 3: Delete the old buckets**

```bash
for b in arcade-tempest arcade-star-wars arcade-asteroids arcade-battlezone arcade-red-baron arcade-centipede; do
  echo "==> $b"
  npx wrangler r2 bucket delete "$b"
done
```

Use the real list from Task 1's inventory, not this one — it may differ. Do **not** touch `arcade-lobby` (the live cabinet) or `arcade` (the assets bucket behind `arcade-assets.slabgorb.com`).

- [ ] **Step 4: Re-clone the sibling checkouts**

a-2 and a-3 hold stale gitignored game directories that are now tracked; pulling will fight them.

```bash
mv /Users/slabgorb/Projects/a-2 /Users/slabgorb/Projects/a-2.pre-migration
git clone git@github.com:slabgorb/arcade.git /Users/slabgorb/Projects/a-2
```

Repeat for a-3. Delete the `.pre-migration` copies only after confirming nothing unpushed remains in them.

- [ ] **Step 5: File the deferred follow-up stories**

These are named in the spec as out of scope and must exist as stories rather than dying in an archive note.

> **PLAN DEFECT #15 — the invocations below are written against a CLI that does not exist.**
> `pf sprint story add` takes **positional** arguments and has **no `--description` flag**:
>
> ```
> pf sprint story add [OPTIONS] EPIC_ID TITLE POINTS
> options: --type --priority --workflow --jira --repos --epic --initiative --depends-on --sprint-file --dry-run
> ```
>
> Every command in this step would have failed on unknown option `--title`. Discovered for real
> while filing `uf1-16` during Task 10, so the correct shape is now known and proven:
>
> ```bash
> pf sprint story add uf1 "the title" 1 --type chore --priority p3 --repos .
> ```
>
> **Each story below therefore needs an epic chosen at filing time**, and its `description` and
> `acceptance_criteria` added to the epic YAML *after* the CLI creates the entry — the CLI cannot
> carry them. `sprint/epic-uf1.yaml`'s `uf1-7` is the reference shape (a double-quoted
> `description:` scalar plus an `acceptance_criteria:` list). Verify with `git diff` afterwards:
> `pf` round-trips the entire epic file on every mutation, so a bad scalar corrupts more than the
> row you added. Keep the prose free of unquoted `#`, which has silently truncated an epic before.
>
> The `--description` text in each command below is still the right *content* — it just has to
> reach the YAML by editing, not by flag.

```bash
pf sprint story add --title "Shell convergence: compositional host helpers across the seven games" \
  --description "Spec §4.3. The seven main.ts files share almost nothing (see the adoption matrix). Design and land compositional helpers — mountCanvas, installAudioUnlock, installPauseToggle — that each game adopts only where it already does that thing. Must not change centipede's or joust's ROM cadences."

pf sprint story add --title "Safari ITP purges the games' own high scores after 7 days" \
  --description "ADR-0004 follow-up 1, never filed. ITP deletes script-writable storage including localStorage after 7 days without user interaction, universally since Safari 13.1. A player who does not return within a week can lose their table outright. Pre-existing, unaffected by the monorepo migration."

pf sprint story add --title "Empirically test Safari ITP's interaction clock: per-hostname or per-eTLD+1" \
  --description "ADR-0004 follow-up 2, never filed. Decides the severity of the purge story above. Needs a real Safari, not a spec reading — WebKit's localStorage partitioning already contradicts its own published policy."

pf sprint story add --title "Purity fence: importClosure misses side-effect and dynamic imports" \
  --description "src/shared/tests/purity.test.ts's importClosure() only matches 'from ...' relative imports, so a bare side-effect import (import './x.js') or a dynamic import() bypasses the transitive-closure check entirely. Verified by mutation during the Task 4 re-review: the closure test did NOT catch a side-effect import of a DOM-touching helper; only the whole-tree backstop did, and that backstop only reaches it because src/shared is currently flat. The gap becomes real the moment src/shared grows subdirectories. Inherited byte-identical from the original arcade-shared test, not introduced by the migration."

pf sprint story add --title "Typecheck arcade-shared's tests: 22 pre-existing errors in WebAudio doubles" \
  --description "src/shared/tests is excluded from the root tsconfig (Task 4) because arcade-shared never had a tsconfig and its tests were never compiled — only run through vitest, which strips types. Measured 22 real errors, almost all hand-rolled FakeAudioContext/FakeGain doubles that do not satisfy the WebAudio types, plus possibly-undefined and empty-tuple indexing in tests/synth.test.ts. Fix the doubles and drop the exclude. Until then these tests can assert against types that do not hold."

pf sprint story add --title "Rename the cabinet bucket arcade-lobby -> arcade-cabinet" \
  --description "Spec §6.2. arcade-lobby now holds the whole cabinet, not just the lobby. Cosmetic; costs one custom-domain rebind. Not the bucket named 'arcade', which is the assets bucket."

pf sprint story add --title "One green light: run the orchestrator's node:test suite under vitest too" \
  --description "PLAN DEFECT #14, owner ruling 2026-07-30 (deferred, not descoped). The repo has TWO test runners and the migration was only ever watching one. tests/**/*.test.mjs are node:test files run by 'npm run test:orchestrator'; vitest.config.ts declares projects for shared, host, lobby and the seven games, none rooted at tests/. So 'npx vitest run' — the command every migration task used as its green light — never executed a single orchestrator test. Task 9 surfaced this: two assertions in tests/battlezone-bootstrap.test.mjs went red while 'npx vitest run' reported 489 files / 6239 tests all passing. Give tests/ a vitest project, or otherwise make one command cover both runners, so a red orchestrator test cannot pass unnoticed again. The .mjs files use node:test's API (test/assert from node:test and node:assert/strict), not vitest's, so this is a real port and not a config one-liner."
```

- [ ] **Step 6: Record the teardown and commit**

```bash
{
  echo
  echo "## Teardown — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "Old per-game buckets deleted; nine repos archived (not deleted) on GitHub."
  echo "Rollback is no longer available from this point."
} >> docs/ops/migration-manifest.md

git add docs/ops/migration-manifest.md
git commit -m "chore(migrate): teardown complete — nine repos archived, old buckets deleted

Follow-ups filed: shell convergence, the two Safari ITP stories from ADR-0004
that were never filed, and the bucket rename.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Verification checklist

Run before declaring the epic done:

- [ ] `npx vitest run` — all projects green, 665 app test files + shared + host
- [ ] `npx tsc --noEmit` — clean
- [ ] `node --test 'tests/**/*.test.mjs'` — registry, audit-refs and deploy-r2 tests green
- [ ] `just serve` then `curl` each of `/`, `/tempest/` … `/joust/` — all `200`
- [ ] `node scripts/build-app.mjs <id>` for all eight apps — all succeed
- [ ] `curl` each of the eight paths on `https://arcade.slabgorb.com` — all `200`
- [ ] `curl` each old hostname — all `301` to the right path
- [ ] `git rev-parse audit/tempest^{commit}` and `audit/red-baron^{commit}` — both resolve
- [ ] `grep -rn "@arcade/shared" .` — no hits outside archived docs
- [ ] `grep -c "trunk-based" .pennyfarthing/repos.yaml` — exactly 1
- [ ] One real release end to end: `just release asteroids patch` → tag `asteroids-v*` → CI deploys → live URL serves the new version
