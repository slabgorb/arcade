#!/usr/bin/env node
// scripts/release.mjs — cuts a release of ONE app out of the monorepo.
//
// Nine repos are one repo now, so a release is no longer "merge this repo's
// develop into its main". `main` IS the trunk and carries every app's commits;
// what identifies a release is the TAG:
//
//     just release tempest         ->  tempest-v1.0.29
//     just release lobby minor     ->  lobby-v0.1.0
//
// One repo cannot hold two v1.0.29, so every tag is namespaced by app. Task 18
// will add `.github/workflows/deploy.yml` (it does not exist yet), which parses
// the app id back out of the tag and deploys only that app; an UNPREFIXED vX.Y.Z
// tag will match its trigger not at all and deploy nothing, which is why `tagFor`
// is the one place the name is built.
//
// WHAT WENT AWAY WITH THE SUBREPOS
//   · the develop -> main `--no-ff` merge, and with it `checkout -B main
//     origin/main` and the `git checkout develop` return leg. There is no
//     develop. Releases are cut from `main`, in place.
//   · `shouldRelease`'s old definition — "origin/develop holds commits
//     origin/main lacks" — whose two inputs no longer exist. The invariant it
//     carried (a `release-all` run twice shipped six empty versions and six
//     pointless deploys on 2026-07-13) is kept, restated for one trunk: has
//     ANYTHING under this app's own directory changed since its last tag.
//   · `syncLobbyTileVersion` and `bumpRegistryVersion`, which hand-copied the
//     bumped version into `lobby/src/core/registry.ts` — in the LOBBY's checkout,
//     on the LOBBY's develop, best-effort, because it was a second copy of a fact
//     that could drift (and did: centipede's tile read 0.0.0 long after it
//     shipped). That file is deleted. The tile version is now DERIVED —
//     plugins/<id>/package.json -> plugin.ts -> gen-registry.mjs ->
//     src/host/registry.ts — so there is no second place left to sync.
//
// WHY THE REGISTRY IS REGENERATED IN THE RELEASE COMMIT
// `tests/registry.test.mjs` pins the committed registry against the manifests,
// and every manifest reads its version out of its own package.json. So a bump
// that did not regenerate would tag a tree whose own test suite is red — the
// generated-data consequence of the version living in exactly one place.
//
// Usage: node scripts/release.mjs <app> [patch|minor|major] [--force]
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// The one list of app ids: the plugins/ directories plus the lobby, read from
// the filesystem. Importing it (rather than restating seven names) means a new
// game is releasable the moment its directory exists, and an id this script
// accepts is exactly an id `build-app.mjs` can build.
import { appIds } from './build-app.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LEVELS = ['patch', 'minor', 'major'];
const REGISTRY_REL = 'src/host/registry.ts';

// ---------------------------------------------------------------------------
// Pure — unit-tested in tests/release.test.mjs; the executor below only runs them
// ---------------------------------------------------------------------------

/** Where an app's version lives, repo-relative. The lobby is not under plugins/. */
export function packagePathFor(id) {
  return id === 'lobby' ? 'lobby/package.json' : `plugins/${id}/package.json`;
}

/** The tree a release of `id` ships, repo-relative. See shouldRelease. */
export function appDirFor(id) {
  return id === 'lobby' ? 'lobby' : `plugins/${id}`;
}

/**
 * Everything a release COMMIT contains: the bumped package.json and the
 * regenerated registry, always both.
 *
 * The registry is not incidental. `src/host/registry.ts` bakes every game's
 * version in at generation time, and `tests/registry.test.mjs` pins the committed
 * file against the manifests — so a commit that bumped the version and left the
 * registry behind would be a tagged, deployed, RED tree. Naming the pair in one
 * exported function is what keeps "bump" and "regenerate" from drifting apart.
 */
export function releaseFiles(id) {
  return [packagePathFor(id), REGISTRY_REL];
}

/**
 * The tag name, and the reason this file exists in this shape.
 *
 * `<app>-vX.Y.Z`. Task 18's workflow strips the LAST `-v` (`${ref%-v*}`), which is
 * what lets hyphenated ids survive: `star-wars-v0.0.33` -> `star-wars`.
 */
export function tagFor(id, version) {
  return `${id}-v${version}`;
}

/**
 * Is `tag` a release tag OF `id`? The inverse of tagFor, and stricter than the
 * glob that fetches candidates.
 *
 * `git tag -l 'tempest-v*'` is a prefix match, so a future app called
 * `tempest-vector` would hand `tempest-v0.1.0`… no — it would hand
 * `tempest-vector-v0.1.0`, which that glob matches. Picking it up as tempest's
 * "last tag" would diff tempest's directory against a SIBLING's release and
 * decide, silently, that there was nothing to ship.
 */
export function isReleaseTag(id, tag) {
  const safe = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${safe}-v\\d+\\.\\d+\\.\\d+$`).test(tag);
}

/** Bump a bare X.Y.Z. Anything else throws rather than being guessed at. */
export function nextVersion(current, level) {
  if (!LEVELS.includes(level)) {
    throw new Error(`unknown level "${level}" — expected ${LEVELS.join('|')}`);
  }
  // Deliberately strict: no `v` prefix, no `-rc.1`, no `+build`, and no leading
  // zeros (`01.2.3` — semver forbids them, and `01.2.4` is not a version anyone
  // meant). Every app's package.json is a three-field stub whose version
  // tests/monorepo-topology already pins as bare semver, and a bump this function
  // had to GUESS at would produce a tag CI parses back into a version that is not
  // the one on disk.
  const m = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(String(current).trim());
  if (!m) throw new Error(`version "${current}" is not a bare X.Y.Z — refusing to guess a bump`);
  const [major, minor, patch] = m.slice(1).map(Number);
  if (level === 'major') return `${major + 1}.0.0`;
  if (level === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * Rewrite the one `"version"` field of a package.json's SOURCE TEXT.
 *
 * Text, not a JSON round-trip: a round-trip re-prints the whole file, so any
 * formatting an app's package.json ever grows (key order, indentation, a
 * comment-free but 4-space file) would be silently rewritten by a release. This
 * touches the eleven characters it means to touch.
 *
 * Refuses unless there is EXACTLY ONE `"version":` and it holds `from` — the two
 * ways a blind regex could rewrite the wrong string (a nested dependency block,
 * or a package.json that was edited between the read and the write).
 */
export function setPackageVersion(source, from, to) {
  const hits = [...source.matchAll(/("version"\s*:\s*")([^"]*)(")/g)];
  if (hits.length !== 1) {
    throw new Error(`expected exactly one "version" field, found ${hits.length}`);
  }
  const [full, head, found, tail] = hits[0];
  if (found !== from) {
    throw new Error(`"version" reads ${JSON.stringify(found)}, expected ${JSON.stringify(from)}`);
  }
  const at = hits[0].index;
  return source.slice(0, at) + head + to + tail + source.slice(at + full.length);
}

/**
 * Pure: is there anything to ship?
 *
 * On 2026-07-13 `just release-all` was run twice in a row and the second run
 * shipped SIX releases whose entire diff was the version bump — six tags, six CI
 * deploys re-uploading a byte-identical dist/. Nothing asked first.
 *
 * The old question ("does origin/develop hold commits origin/main lacks?") cannot
 * be asked of a trunk that carries eight apps: after releasing tempest, `main` is
 * ahead of every other app's last tag too. So the question is asked of the paths
 * the app is BUILT FROM instead — see changePathsFor.
 */
export function shouldRelease({ hasPreviousTag, changedFiles, force = false }) {
  if (force) return true;
  if (!hasPreviousTag) return true; // an app's first release has nothing to diff against
  return changedFiles > 0;
}

/**
 * The `git diff` pathspec that answers "has this app changed since its last tag":
 * everything it is built from, minus the one file every release rewrites.
 *
 * The first draft asked only about `plugins/<id>`, on the stated grounds that
 * widening it would make every app look changed by every OTHER app's release.
 * That reasoning was wrong and review measured it: a release commit touches
 * `<app>/package.json` and `src/host/registry.ts`, and nothing else. So
 *
 *   · `src/shared/**` — bundled into every app — costs NOTHING in false
 *     positives. Verified against three real release commits: `git diff
 *     --name-only <tag>~1 <tag> -- plugins/asteroids src/shared` is empty for
 *     tempest's, centipede's and the lobby's releases.
 *   · `src/host/**` matters too — every plugin manifest, `plugins/<id>/plugin.ts`,
 *     imports from `@host` — and is poisoned by exactly one file, `registry.ts`,
 *     which the exclusion removes. Verified in both directions: with the exclusion
 *     the same diff is empty; without it, it returns `src/host/registry.ts`.
 *
 *   · `vite.config.ts` — the ONE vite config in the repo (`git ls-files | grep
 *     vite.config` returns exactly one), which `build-app.mjs:369` imports for
 *     `defineAppConfig`. Its own header calls it "the one place `base`, `outDir`
 *     and the alias map are decided", so a change there moves every app's base
 *     path, output directory, `@shared`/`@host` alias map and rollup inputs. It
 *     is in the set for the same reason `src/shared` is: leaving it out
 *     reproduces the exact defect above — a real, build-affecting change reading
 *     as "nothing to release".
 *
 * A second `release-all` after a shared-only change therefore still skips, so the
 * 2026-07-13 bug this guard exists for stays fixed while a shared fix now ships.
 *
 * TWO ROOT FILES ARE DELIBERATELY OUT, and the reason is not obvious from the
 * code, which is why it is written down here rather than left to be re-litigated:
 *
 *   · `tsconfig.json`. It looks like it belongs beside `vite.config.ts` and it
 *     does not. NOTHING IN THE GATE TYPE-CHECKS — `grep -n "tsc" scripts/build-app.mjs`
 *     returns nothing, the gate is `vitest run --project <id>` plus
 *     `build-app.mjs <id>`, vite transpiles through esbuild without checking
 *     types, and module resolution goes through the vite alias map above rather
 *     than tsconfig's `paths`. So a TYPE-ONLY option cannot reach `dist/` at all,
 *     and including the file would guarantee a release of an unchanged artifact —
 *     the 2026-07-13 bug re-entered through a different door.
 *
 *     THE EXCEPTION IS REAL, AND ALREADY LIVE IN THIS TREE. esbuild reads a few
 *     tsconfig options, and `useDefineForClassFields` is one. An earlier draft of
 *     this comment cited it as measured-identical, which was a VACUOUS
 *     measurement: `false` is already the default below `target: ES2022` and this
 *     repo is ES2020, so setting it changes nothing by definition, and it was
 *     measured on asteroids, which has no classes. Re-measured on
 *     `dist/battlezone`, three ways, in this checkout:
 *
 *       option absent (the shipped state)  hash 0138236…
 *       explicitly `false`                 SAME hash — it is the default; proves nothing
 *       `true`                             DIFFERENT (cf30927…): the emitted class
 *                                          moves from `constructor(){this.down=new Set,
 *                                          this.pendingStart=!1,…}` to
 *                                          `class{down=new Set;pendingStart=!1;…}`
 *
 *     The fleet ships exactly ONE ES class — `plugins/battlezone/src/shell/input.ts:22`,
 *     `KeyboardTreads`. (Of ~117 `class` matches under src/ and plugins/, every
 *     other one is prose or a test double, and tests are not bundled.) So this
 *     option bites battlezone and nothing else, at any value. It is a live
 *     exception, not a theoretical one — which is precisely why the exclusion is a
 *     POLICY call rather than a correctness gate, and why `--force` exists.
 *   · `package-lock.json` — outside for the same reason in the common case (a lock
 *     bump that does not move an installed version cannot change `dist/`), and it
 *     churns on every install.
 *
 * `--force` is the remedy for both, and the skip message names them.
 */
export function changePathsFor(id) {
  return [appDirFor(id), 'src/shared', 'src/host', 'vite.config.ts', `:(exclude)${REGISTRY_REL}`];
}

/**
 * Pure: the GATE — the two commands that must both succeed before anything is
 * bumped, tagged or pushed.
 *
 * `--project <id>` is the whole of the per-app isolation that had to survive the
 * collapse: eight repos with eight suites became one suite with ten projects, and
 * without the filter a red joust would block a tempest release. It is not a
 * vacuous filter — a name no project declares is a startup error, exit 1
 * ("No projects matched the filter", measured on vitest 4.1.10) — but
 * tests/release.test.mjs also checks every app id against vitest.config.ts, so
 * the drift is caught before a release rather than during one.
 *
 * Relative paths: the executor runs every command with `cwd: ROOT`.
 */
export function gateSteps(id) {
  return [
    { desc: `npx vitest run --project ${id}`, cmd: 'npx', args: ['vitest', 'run', '--project', id] },
    {
      desc: `node scripts/build-app.mjs ${id}`,
      cmd: process.execPath,
      args: ['scripts/build-app.mjs', id],
    },
  ];
}

/**
 * Pure: the ordered command plan from "the bump and the regenerated registry are
 * in the worktree" to "the tag is on origin". The executor below just runs it.
 *
 * `git add -- <files>`, never `git add -A`: the release commit contains the two
 * files this script wrote and nothing else. The clean-tree preflight makes those
 * equivalent TODAY; naming the files is what keeps them equivalent if the
 * preflight is ever relaxed to ignore untracked files — and this repo currently
 * carries an untracked `arcade-shared/` awaiting teardown.
 *
 * `main` is pushed BEFORE the tag, in two commands rather than one. The tag is
 * what triggers the deploy: if it landed first and the branch push then failed,
 * CI would ship a commit that is on no branch.
 */
export function releaseSteps({ id, version, files }) {
  const tag = tagFor(id, version);
  return [
    { desc: `stage ${files.join(' ')}`, cmd: 'git', args: ['add', '--', ...files] },
    {
      desc: `commit ${id} v${version}`,
      cmd: 'git',
      args: ['commit', '-m', `chore(release): ${id} v${version}`],
    },
    { desc: `tag ${tag}`, cmd: 'git', args: ['tag', '-a', tag, '-m', `release ${id} v${version}`] },
    { desc: 'push main', cmd: 'git', args: ['push', 'origin', 'main'] },
    {
      desc: `push ${tag} — this is what triggers the deploy`,
      cmd: 'git',
      args: ['push', 'origin', tag],
    },
  ];
}

// ---------------------------------------------------------------------------
// Impure
// ---------------------------------------------------------------------------

function out(cmd, args) {
  return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function run(cmd, args) {
  execFileSync(cmd, args, { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] });
}

/** The app's most recent release tag, or null if it has never been released. */
function lastTagFor(id) {
  // -v:refname sorts by version, not lexically, so v1.0.9 does not beat v1.0.10.
  // The glob only narrows; isReleaseTag is what decides (see its comment — the
  // glob would also match a longer app id that starts with this one).
  const [newest] = out('git', ['tag', '-l', `${id}-v*`, '--sort=-v:refname'])
    .split('\n')
    .filter((t) => isReleaseTag(id, t));
  return newest ?? null;
}

export function release(id, level = 'patch', { force = false } = {}) {
  // ---- Preflight. Every check below aborts before anything is mutated, and the
  // whole of it runs before the gate, so a doomed release does not pay for a
  // test run first.
  const ids = appIds();
  if (!ids.includes(id)) {
    throw new Error(`no such app "${id}" — expected one of: ${ids.join(', ')}`);
  }
  if (!LEVELS.includes(level)) {
    throw new Error(`unknown level "${level}" — expected ${LEVELS.join('|')}`);
  }
  // Untracked files count. They are not noise: an untracked source file is one
  // the build reads here and CI does not, which is the difference between the
  // dist/ you tested and the dist/ that ships.
  if (out('git', ['status', '--porcelain']) !== '') {
    throw new Error(`${id}: working tree is not clean — commit or stash first`);
  }
  const branch = out('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch !== 'main') {
    throw new Error(`${id}: releases are cut from main; you are on ${branch}`);
  }
  try {
    run('git', ['fetch', 'origin', '--tags']);
  } catch (err) {
    // Offline or no access: without this, the operator gets a raw execFileSync
    // dump where every other failure in this file names the app and the problem.
    throw new Error(`${id}: cannot reach origin to fetch branches and tags — ${err.message}`);
  }
  let originMain;
  try {
    originMain = out('git', ['rev-parse', 'origin/main']);
  } catch {
    throw new Error(`${id}: there is no origin/main — push main before releasing`);
  }
  if (out('git', ['rev-parse', 'main']) !== originMain) {
    throw new Error(
      `${id}: main is not in sync with origin/main — push or pull first. ` +
        `CI builds from the tag it receives, so releasing an unpushed main ships code nobody else has.`,
    );
  }

  const pkgRel = packagePathFor(id);
  const pkgPath = join(ROOT, pkgRel);
  const source = readFileSync(pkgPath, 'utf8');
  const current = JSON.parse(source).version;
  const version = nextVersion(current, level);
  const tag = tagFor(id, version);

  // Both sides, not just the local one: `git tag` would fail on a local
  // collision anyway, but only after the gate has run and the bump is committed.
  if (out('git', ['tag', '-l', tag]) !== '') throw new Error(`${id}: tag ${tag} already exists locally`);
  if (out('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`]) !== '') {
    throw new Error(`${id}: tag ${tag} already exists on origin`);
  }

  const previous = lastTagFor(id);
  const paths = changePathsFor(id);
  const changedFiles = previous
    ? out('git', ['diff', '--name-only', previous, 'HEAD', '--', ...paths]).split('\n').filter(Boolean).length
    : 0;
  if (!shouldRelease({ hasPreviousTag: Boolean(previous), changedFiles, force })) {
    // A no-op SUCCESS, not a failure: a sweep over every app must not abort on
    // the first one that has nothing to ship.
    console.log(
      `${id}: nothing to release — no change under ${appDirFor(id)}/, src/shared/, src/host/ or vite.config.ts since ${previous}. Skipped.`,
    );
    console.log(
      `  tsconfig.json and package-lock.json are outside that set on purpose: nothing in the gate`,
    );
    console.log(`  type-checks, so a type-only change to either cannot reach dist/. Re-run with --force`);
    console.log(`  for the exceptions (an esbuild-read tsconfig option, or a lock bump that moves a version).`);
    return { id, skipped: true };
  }

  // ---- Gate: tests green and the build succeeds, or nothing ships. See gateSteps.
  for (const step of gateSteps(id)) {
    console.log(`==> ${id}: ${step.desc}`);
    run(step.cmd, step.args);
  }

  // ---- Bump, then regenerate, in that order and into the same commit.
  //
  // This is the one window where a failure leaves the WORKTREE modified with no
  // commit to explain it: measured with gen-registry.mjs made to throw, the tree
  // was left holding ` M plugins/joust/package.json` at a version that was never
  // released, and the next release of any app then refused with "working tree is
  // not clean" with nothing connecting the two. Undone here rather than left for
  // a reflexive `git add -A` to bake in.
  try {
    writeFileSync(pkgPath, setPackageVersion(source, current, version));
    console.log(`==> ${id}: ${current} -> ${version} in ${pkgRel}`);
    console.log(`==> ${id}: node scripts/gen-registry.mjs (the tile version follows the bump)`);
    run(process.execPath, [join(ROOT, 'scripts', 'gen-registry.mjs')]);
  } catch (err) {
    let restored = true;
    try {
      run('git', ['checkout', '--', ...releaseFiles(id)]);
    } catch {
      restored = false;
    }
    throw new Error(
      `${id}: the version bump / registry regeneration failed — ${err.message}\n` +
        (restored
          ? `  The worktree was restored (${releaseFiles(id).join(', ')}); nothing was committed, tagged or pushed.`
          : `  AND THE RESTORE FAILED. Check git status: ${pkgRel} may still hold ${version}, a version that was never released.`),
    );
  }

  const steps = releaseSteps({ id, version, files: releaseFiles(id) });
  for (const step of steps) {
    console.log(`==> ${id}: ${step.desc}`);
    try {
      run(step.cmd, step.args);
    } catch (err) {
      // No automatic rollback, and no pretence of one: by this point the commit
      // and the tag may exist locally, and guessing which is worse than saying
      // exactly where it stopped. The underlying message is carried through —
      // stderr is inherited when this runs as a CLI, but not when release() is
      // called programmatically, and there the cause would otherwise be lost.
      throw new Error(
        `${id}: release stopped at "${step.desc}" — ${err.message}\n` +
          `  Nothing after that step ran.\n` +
          `  Inspect: git log --oneline -1 && git tag -l ${tag}\n` +
          `  Undo a LOCAL commit/tag: git tag -d ${tag} && git reset --hard origin/main`,
      );
    }
  }

  const where = id === 'lobby' ? 'the bucket root' : `the '${id}/' key prefix`;
  console.log(`${id}: released ${tag} — the tag push triggers the deploy workflow, which ships ${where}.`);
  return { id, skipped: false, version, tag };
}

// CLI entry (only when run directly, not when imported by the test).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const usage = `Usage: node scripts/release.mjs <app> [patch|minor|major] [--force]\n  apps: ${appIds().join(', ')}`;
  // Unknown flags are REJECTED, never ignored. This script pushes tags and CI
  // deploys them: someone typing `--dry-run` (which does not exist) and getting a
  // real release out of it is the worst failure this file could have.
  const unknown = argv.filter((a) => a.startsWith('-') && a !== '--force');
  if (unknown.length) {
    console.error(`unknown option${unknown.length > 1 ? 's' : ''}: ${unknown.join(' ')}\n${usage}`);
    process.exit(1);
  }
  const [id, level = 'patch'] = argv.filter((a) => !a.startsWith('-'));
  if (!id) {
    console.error(usage);
    process.exit(1);
  }
  try {
    release(id, level, { force: argv.includes('--force') });
  } catch (err) {
    console.error(String(err.message ?? err));
    process.exit(1);
  }
}
