# Arcade Release Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One-command semver releases (`just release <game>`) that merge `develop` → `main` with a `vX.Y.Z` tag, plus a GitHub Actions job that auto-deploys each game's `dist/` to its R2 bucket on every push to `main`.

**Architecture:** A pure "release steps" planner + thin executor in the orchestrator (`scripts/release.mjs`, mirroring `scripts/deploy-r2.mjs`), driven by just recipes. CI is one reusable `workflow_call` workflow in `slabgorb/arcade` (build → test → upload via the same `deploy-r2.mjs`), called by a ~10-line workflow committed to each of the six game repos.

**Tech Stack:** Node 22 (`node:test`, `node:child_process`), just, GitHub Actions, wrangler (R2).

**Spec:** `docs/superpowers/specs/2026-07-10-arcade-release-automation-design.md`

## Global Constraints

- Six servable subrepos, exact list (= justfile `subrepos`): `lobby tempest star-wars asteroids battlezone red-baron`.
- Bucket naming: `arcade-<name>` (e.g. `arcade-tempest`).
- Cloudflare account ID (not secret, in the clear in the workflow): `a55aafa9b0691f828cd6864be28c1674`.
- Per-repo secret `CLOUDFLARE_API_TOKEN` — **already set on all six repos** (done during design; do not re-do).
- Game repos: default branch `develop`; `main` = production, never takes direct commits. Orchestrator: trunk-based on `main`.
- Orchestrator tests run with `just test-orchestrator` (`node --test 'tests/**/*.test.mjs'`) from the orchestrator root.
- All git commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Run all commands from the orchestrator root `/Users/slabgorb/Projects/a-2` unless a step says otherwise.

---

### Task 1: Release planner + executor (`scripts/release.mjs`) — TDD

**Files:**
- Create: `scripts/release.mjs`
- Test: `tests/release.test.mjs`

**Interfaces:**
- Produces: `releaseSteps({version: string, mainExistsOnRemote: boolean}) → Array<{desc: string, cmd: string, args: string[], onFail?: 'abort-merge'}>` (pure, exported); `release(repoDir: string, level?: 'patch'|'minor'|'major')` (executor, exported); CLI `node scripts/release.mjs <repoDir> [level]`. Task 2's just recipes call the CLI.

- [ ] **Step 1: Write the failing test**

Create `tests/release.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseSteps } from '../scripts/release.mjs';

test('releaseSteps: full command order when main already exists on the remote', () => {
  const steps = releaseSteps({ version: '0.1.0', mainExistsOnRemote: true });
  assert.deepEqual(
    steps.map((s) => [s.cmd, ...s.args]),
    [
      ['git', 'add', '-A'],
      ['git', 'commit', '-m', 'chore(release): v0.1.0'],
      ['git', 'push', 'origin', 'develop'],
      ['git', 'checkout', '-B', 'main', 'origin/main'],
      ['git', 'merge', '--no-ff', 'develop', '-m', 'release: v0.1.0'],
      ['git', 'tag', '-a', 'v0.1.0', '-m', 'release v0.1.0'],
      ['git', 'push', '-u', 'origin', 'main', 'v0.1.0'],
      ['git', 'checkout', 'develop'],
    ],
  );
});

test('releaseSteps: first release creates main from develop (no origin/main)', () => {
  const steps = releaseSteps({ version: '0.0.1', mainExistsOnRemote: false });
  const checkout = steps.find((s) => s.args[0] === 'checkout' && s.args.includes('main'));
  assert.deepEqual(checkout.args, ['checkout', '-B', 'main']);
});

test('releaseSteps: only the merge step carries abort-merge recovery', () => {
  const steps = releaseSteps({ version: '0.0.1', mainExistsOnRemote: true });
  const flagged = steps.filter((s) => s.onFail === 'abort-merge');
  assert.equal(flagged.length, 1);
  assert.equal(flagged[0].args[0], 'merge');
});

test('releaseSteps: every step has a human-readable desc', () => {
  for (const s of releaseSteps({ version: '1.2.3', mainExistsOnRemote: true })) {
    assert.ok(s.desc && s.desc.length > 3, `step ${s.args.join(' ')} lacks desc`);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/release.test.mjs`
Expected: FAIL — `Cannot find module '../scripts/release.mjs'`

- [ ] **Step 3: Write the implementation**

Create `scripts/release.mjs`:

```js
// Cuts a release of one game subrepo: gate on tests+build, bump version on
// develop, merge develop -> main (--no-ff), tag vX.Y.Z, push. The push to main
// triggers the repo's GitHub Actions deploy workflow (R2 upload), so after this
// script succeeds, CI ships it — no manual deploy step.
//
// main never takes direct commits; it exists only as the merge target of
// releases, which is why checkout -B (reset to origin/main) is safe here.
//
// Usage: node scripts/release.mjs <repoDir> [patch|minor|major]   (default patch)
import { execFileSync } from 'node:child_process';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LEVELS = ['patch', 'minor', 'major'];

// Pure: the ordered command plan from "version is bumped in the worktree"
// through "back on develop". Unit-tested; the executor below just runs it.
export function releaseSteps({ version, mainExistsOnRemote }) {
  const tag = `v${version}`;
  return [
    { desc: 'stage version bump', cmd: 'git', args: ['add', '-A'] },
    { desc: `commit version bump ${tag}`, cmd: 'git', args: ['commit', '-m', `chore(release): ${tag}`] },
    { desc: 'push develop', cmd: 'git', args: ['push', 'origin', 'develop'] },
    {
      desc: mainExistsOnRemote ? 'check out main (from origin/main)' : 'create main from develop (first release)',
      cmd: 'git',
      args: mainExistsOnRemote ? ['checkout', '-B', 'main', 'origin/main'] : ['checkout', '-B', 'main'],
    },
    { desc: 'merge develop into main', cmd: 'git', args: ['merge', '--no-ff', 'develop', '-m', `release: ${tag}`], onFail: 'abort-merge' },
    { desc: `tag ${tag}`, cmd: 'git', args: ['tag', '-a', tag, '-m', `release ${tag}`] },
    { desc: 'push main + tag (triggers CI deploy)', cmd: 'git', args: ['push', '-u', 'origin', 'main', tag] },
    { desc: 'return to develop', cmd: 'git', args: ['checkout', 'develop'] },
  ];
}

function out(cwd, cmd, args) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function run(cwd, cmd, args) {
  execFileSync(cmd, args, { cwd, stdio: ['ignore', 'inherit', 'inherit'] });
}

export function release(repoDir, level = 'patch') {
  if (!LEVELS.includes(level)) {
    throw new Error(`unknown level "${level}" — expected ${LEVELS.join('|')}`);
  }
  const name = basename(repoDir);

  // Preflight — every check aborts before anything is mutated.
  if (out(repoDir, 'git', ['status', '--porcelain']) !== '') {
    throw new Error(`${name}: working tree is dirty — commit or stash first`);
  }
  if (out(repoDir, 'git', ['rev-parse', '--abbrev-ref', 'HEAD']) !== 'develop') {
    throw new Error(`${name}: releases are cut from develop — check it out first`);
  }
  run(repoDir, 'git', ['fetch', 'origin', '--tags']);
  if (out(repoDir, 'git', ['rev-parse', 'develop']) !== out(repoDir, 'git', ['rev-parse', 'origin/develop'])) {
    throw new Error(`${name}: develop is not in sync with origin/develop — push or pull first`);
  }

  // Gate (release-ready): tests green + build succeeds, or nothing ships.
  console.log(`==> ${name}: npm test`);
  run(repoDir, 'npm', ['test']);
  console.log(`==> ${name}: npm run build`);
  run(repoDir, 'npm', ['run', 'build']);

  // Bump. npm prints the new version ("v0.0.1"); no git tag yet — the tag
  // goes on the main merge commit, the exact commit CI deploys.
  const version = out(repoDir, 'npm', ['version', level, '--no-git-tag-version']).replace(/^v/, '');
  const tag = `v${version}`;
  let tagExists = true;
  try {
    out(repoDir, 'git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`]);
  } catch {
    tagExists = false;
  }
  if (tagExists) {
    run(repoDir, 'git', ['checkout', '--', '.']); // undo the bump
    throw new Error(`${name}: tag ${tag} already exists`);
  }

  const mainExistsOnRemote = out(repoDir, 'git', ['ls-remote', '--heads', 'origin', 'main']) !== '';

  for (const step of releaseSteps({ version, mainExistsOnRemote })) {
    console.log(`==> ${name}: ${step.desc}`);
    try {
      run(repoDir, step.cmd, step.args);
    } catch (err) {
      if (step.onFail === 'abort-merge') {
        try {
          run(repoDir, 'git', ['merge', '--abort']);
        } catch {
          // not in a merge state — nothing to abort
        }
        run(repoDir, 'git', ['checkout', 'develop']);
        throw new Error(`${name}: merge into main failed — aborted, back on develop`);
      }
      throw err;
    }
  }
  console.log(`${name}: released ${tag} — the push to main triggers the R2 deploy workflow.`);
}

// CLI entry (only when run directly, not when imported by the test).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [repoDir, level = 'patch'] = process.argv.slice(2);
  if (!repoDir) {
    console.error('Usage: node scripts/release.mjs <repoDir> [patch|minor|major]');
    process.exit(1);
  }
  try {
    release(resolve(repoDir), level);
  } catch (err) {
    console.error(String(err.message ?? err));
    process.exit(1);
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/release.test.mjs`
Expected: PASS (4 tests)

Run: `just test-orchestrator`
Expected: PASS (release tests + existing deploy-r2 and bootstrap suites)

- [ ] **Step 5: Commit**

```bash
git add scripts/release.mjs tests/release.test.mjs
git commit -m "feat(release): semver release script — develop → main + vX.Y.Z tag

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: just recipes — `release` / `release-all`

**Files:**
- Modify: `justfile` (append a RELEASE section after the DEPLOY section, i.e. after the `deploy-one` recipe around line 97)

**Interfaces:**
- Consumes: CLI `node scripts/release.mjs <repoDir> [level]` (Task 1); justfile vars `root`, `subrepos`.
- Produces: `just release <name> [level]`, `just release-all [level]` — the user-facing entry points.

- [ ] **Step 1: Append the recipes to the justfile**

Add after the `deploy-one` recipe:

```just
# ============================================
# RELEASE (develop → main + tag → CI deploys to R2)
# ============================================
# Cut a semver release of one subrepo: gate on tests+build, bump version on
# develop, merge to main, tag vX.Y.Z, push. The push to main triggers the
# repo's GitHub Actions deploy workflow (R2 upload).
# e.g. `just release tempest` (patch) or `just release tempest minor`
release name level="patch":
    node {{root}}/scripts/release.mjs {{root}}/{{name}} {{level}}

# Release every servable subrepo (lobby + games) at the same bump level
release-all level="patch":
    #!/usr/bin/env bash
    set -euo pipefail
    for s in {{subrepos}}; do
      echo "==> releasing $s"
      node {{root}}/scripts/release.mjs {{root}}/$s {{level}}
    done
```

- [ ] **Step 2: Verify the justfile parses and the recipes resolve**

Run: `just --list | grep release`
Expected: both `release` and `release-all` listed.

Run: `just --dry-run release tempest`
Expected: prints `node /Users/slabgorb/Projects/a-2/scripts/release.mjs /Users/slabgorb/Projects/a-2/tempest patch` (no execution).

- [ ] **Step 3: Run the orchestrator suite (regression guard)**

Run: `just test-orchestrator`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add justfile
git commit -m "feat(release): just release / release-all recipes

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Reusable deploy workflow in `slabgorb/arcade` + push orchestrator

**Files:**
- Create: `.github/workflows/deploy-r2.yml` (orchestrator repo)

**Interfaces:**
- Consumes: `scripts/deploy-r2.mjs` CLI (`node scripts/deploy-r2.mjs <distDir> <bucket>`, needs `wrangler` on PATH and `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` env).
- Produces: reusable workflow callable as `slabgorb/arcade/.github/workflows/deploy-r2.yml@main` with input `bucket` and secret `CLOUDFLARE_API_TOKEN` (Task 4's callers).

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/deploy-r2.yml`:

```yaml
# Reusable deploy for the arcade game repos: build + test the CALLER repo,
# then upload its dist/ to the given R2 bucket using the same
# scripts/deploy-r2.mjs that local `just deploy` uses (one source of truth).
# Called by each game repo's .github/workflows/deploy.yml on push to main.
name: deploy-r2

on:
  workflow_call:
    inputs:
      bucket:
        description: 'R2 bucket to upload dist/ to (e.g. arcade-tempest)'
        required: true
        type: string
    secrets:
      CLOUDFLARE_API_TOKEN:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    # Queue overlapping deploys of the same repo instead of interleaving uploads.
    concurrency:
      group: deploy-r2-${{ github.repository }}
      cancel-in-progress: false
    steps:
      # In a reusable workflow, checkout defaults to the CALLER repo (the game).
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm test
      - name: Fetch deploy script from slabgorb/arcade
        uses: actions/checkout@v4
        with:
          repository: slabgorb/arcade
          path: .arcade
          sparse-checkout: scripts
      - name: Deploy dist/ to R2
        run: |
          npm install -g wrangler
          node .arcade/scripts/deploy-r2.mjs dist "${{ inputs.bucket }}"
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: a55aafa9b0691f828cd6864be28c1674
```

- [ ] **Step 2: Validate the YAML parses**

Run: `ruby -ryaml -e 'YAML.load_file(".github/workflows/deploy-r2.yml"); puts "YAML OK"'`
Expected: `YAML OK`

- [ ] **Step 3: Commit and push the orchestrator**

The push publishes the reusable workflow at `@main` — Task 4's callers cannot resolve it (and CI cannot fetch `deploy-r2.mjs`) until this lands on GitHub. This also pushes the spec/plan/release-script commits (orchestrator is trunk-based on `main`).

```bash
git add .github/workflows/deploy-r2.yml
git commit -m "feat(ci): reusable R2 deploy workflow for the game repos

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

---

### Task 4: Caller workflows in the six game repos

**Files (per game `<name>` in `lobby tempest star-wars asteroids battlezone red-baron`):**
- Create: `<name>/.github/workflows/deploy.yml` (committed to that repo's `develop`, pushed)

**Interfaces:**
- Consumes: `slabgorb/arcade/.github/workflows/deploy-r2.yml@main` (Task 3, pushed); repo secret `CLOUDFLARE_API_TOKEN` (already set).
- Produces: push-to-`main` deploy trigger in every game repo. Inert until the repo's first release merges it onto `main`.

- [ ] **Step 1: Confirm every game repo can run `npm ci` (lockfile present) and is on develop**

```bash
for s in lobby tempest star-wars asteroids battlezone red-baron; do
  echo -n "$s: branch=$(git -C $s branch --show-current) lockfile="
  test -f $s/package-lock.json && echo yes || echo MISSING
done
```

Expected: every line `branch=develop lockfile=yes`. If a lockfile is MISSING, run `(cd <name> && npm install)` and include `package-lock.json` in that repo's commit in Step 3. If a repo is not on `develop`, stop and surface it to the user instead of switching branches over their work.

- [ ] **Step 2: Write the six caller workflows**

```bash
for s in lobby tempest star-wars asteroids battlezone red-baron; do
  mkdir -p "$s/.github/workflows"
  cat > "$s/.github/workflows/deploy.yml" <<EOF
# Deploys this game to its R2 bucket whenever main is updated (i.e. on release
# — \`just release $s\` in the arcade orchestrator merges develop into main).
# Build/test/upload logic lives in slabgorb/arcade .github/workflows/deploy-r2.yml.
name: deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    uses: slabgorb/arcade/.github/workflows/deploy-r2.yml@main
    with:
      bucket: arcade-$s
    secrets: inherit
EOF
done
```

- [ ] **Step 3: Validate, commit to each repo's develop, push**

Commit ONLY the workflow file (explicit pathspec) so any unrelated local work in a game repo stays untouched.

```bash
for s in lobby tempest star-wars asteroids battlezone red-baron; do
  ruby -ryaml -e "YAML.load_file('$s/.github/workflows/deploy.yml')" || exit 1
  git -C "$s" add .github/workflows/deploy.yml
  git -C "$s" commit -m "chore(ci): deploy to R2 on merge to main

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
  git -C "$s" push origin develop
done
```

Expected: six commits pushed. If a push is rejected (develop moved on the remote), `git -C <name> pull --ff-only origin develop` and push again.

---

### Task 5: End-to-end verification — first release of tempest

**Files:** none (uses `just release` from Task 2).

**Interfaces:**
- Consumes: everything above. The user approved this proof in the spec ("End-to-end proof: first real release of one game").

- [ ] **Step 1: Verify secrets are in place (set during design — just confirm)**

```bash
for s in lobby tempest star-wars asteroids battlezone red-baron; do
  echo -n "$s: "; gh secret list -R "slabgorb/$s" | grep -o CLOUDFLARE_API_TOKEN || echo MISSING
done
```

Expected: `CLOUDFLARE_API_TOKEN` on all six.

- [ ] **Step 2: Release tempest**

Run: `just release tempest`
Expected: tests + build pass, `chore(release): v0.0.1` lands on develop, merge commit `release: v0.0.1` + tag `v0.0.1` pushed to main, script ends back on develop.

- [ ] **Step 3: Watch the Actions run**

```bash
gh run list -R slabgorb/tempest --branch main --limit 1
gh run watch -R slabgorb/tempest $(gh run list -R slabgorb/tempest --branch main --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status
```

Expected: the `deploy` workflow completes green (build → test → R2 upload).

- [ ] **Step 4: Verify the live site still serves from R2**

```bash
curl -sI https://tempest.slabgorb.com/ | head -5
curl -s https://tempest.slabgorb.com/ | grep -o '<title>[^<]*</title>'
```

Expected: `HTTP/2 200`, content-type `text/html; charset=utf-8`, a sane title.

- [ ] **Step 5: Report**

Summarize to the user: tag cut, Actions run URL, site verified. Remaining games release the same way (`just release <name>` or `just release-all`) whenever they choose.
