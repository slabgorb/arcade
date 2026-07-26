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
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOBBY_REGISTRY_REL = 'src/core/registry.ts';

const LEVELS = ['patch', 'minor', 'major'];

// Pure: is there anything to ship? main is the release target and only ever
// receives release merges, so "something to release" is exactly "origin/develop
// holds commits origin/main lacks".
//
// Without this, a release carries no commits but still bumps the version, tags,
// and pushes main — which re-triggers the R2 deploy for a byte-identical dist/.
// `just release-all` run twice in a row did precisely that: six repos, six empty
// versions, six pointless deploys. It is cheap to ask first.
//
// A first release has no origin/main to diff against, so it always ships.
export function shouldRelease({ mainExistsOnRemote, pendingCommits }) {
  if (!mainExistsOnRemote) return true;
  return pendingCommits > 0;
}

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

// Pure: rewrite the `version` string of the lobby-registry entry whose `id`
// matches `id`, returning { text, changed }. Returns the source untouched with
// changed:false when no entry has that id — releasing a game the lobby does not
// list (red-baron), or the lobby itself, must not rewrite the file. The match is
// non-greedy so it stops at the FIRST `version` after the id and never bleeds
// into the next entry. This is the whole cross-repo coupling, kept pure and
// git-free so it stays unit-testable and release.mjs stays single-repo at heart.
export function bumpRegistryVersion(source, id, version) {
  const safeId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(id:\\s*'${safeId}'[\\s\\S]*?version:\\s*')[^']*(')`);
  const text = source.replace(re, `$1${version}$2`);
  return { text, changed: text !== source };
}

function out(cwd, cmd, args) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function run(cwd, cmd, args) {
  execFileSync(cmd, args, { cwd, stdio: ['ignore', 'inherit', 'inherit'] });
}

// Impure follow-on: after a game ships, carry its new version into the lobby's
// tile registry and commit it to the lobby's develop, so the tile stops going
// stale (centipede's tile read 0.0.0 long after it shipped). This runs AFTER the
// game is already released, so it is best-effort by contract: every precondition
// miss — releasing the lobby itself, no lobby checkout beside this repo, the
// lobby not release-ready (off develop / dirty / diverged), or no tile for this
// game — SKIPS LOUDLY and returns. It must never throw and turn a shipped game
// into a failed command. The tile ships to prod on the next lobby release
// (release-all releases the lobby last, so one deploy carries every game's bump).
export function syncLobbyTileVersion({ repoDir, name, version }) {
  const warn = (msg) =>
    console.warn(
      `  ⚠ lobby tile sync skipped — ${msg}. ${name} v${version} shipped; edit lobby/${LOBBY_REGISTRY_REL} by hand to make the tile match.`,
    );

  // The lobby lists games, not itself — releasing it has no tile to sync.
  if (name === 'lobby') return { synced: false, reason: 'lobby has no tile of its own' };

  const lobbyDir = resolve(repoDir, '..', 'lobby');
  try {
    try {
      out(lobbyDir, 'git', ['rev-parse', '--is-inside-work-tree']);
    } catch {
      warn(`no lobby checkout at ${lobbyDir}`);
      return { synced: false };
    }
    if (out(lobbyDir, 'git', ['rev-parse', '--abbrev-ref', 'HEAD']) !== 'develop') {
      warn('the lobby is not on develop');
      return { synced: false };
    }
    if (out(lobbyDir, 'git', ['status', '--porcelain']) !== '') {
      warn('the lobby working tree is dirty');
      return { synced: false };
    }
    run(lobbyDir, 'git', ['fetch', 'origin', 'develop']);
    try {
      // Reconcile with origin before adding our commit. ff-only is a no-op when
      // local is level with or ahead of origin, and fails (→ skip) if diverged.
      run(lobbyDir, 'git', ['merge', '--ff-only', 'origin/develop']);
    } catch {
      warn('the lobby develop has diverged from origin/develop');
      return { synced: false };
    }

    const registryPath = resolve(lobbyDir, LOBBY_REGISTRY_REL);
    const { text, changed } = bumpRegistryVersion(readFileSync(registryPath, 'utf8'), name, version);
    if (!changed) {
      console.log(`  lobby: no tile for ${name} (or already at v${version}) — nothing to sync.`);
      return { synced: false };
    }
    writeFileSync(registryPath, text);
    run(lobbyDir, 'git', ['add', LOBBY_REGISTRY_REL]);
    run(lobbyDir, 'git', ['commit', '-m', `chore(lobby): sync ${name} tile to v${version}`]);
    run(lobbyDir, 'git', ['push', 'origin', 'develop']);
    console.log(`  lobby: ${name} tile synced to v${version} on develop (ships on the next lobby release).`);
    return { synced: true, version };
  } catch (err) {
    warn(String(err?.message ?? err));
    return { synced: false };
  }
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

  // Nothing to ship? Say so and stop — before the gate, so an empty release does
  // not even pay for a test run. Skipping is a no-op success, not a failure: it
  // must not abort the rest of a `release-all` sweep.
  const mainExistsOnRemote = out(repoDir, 'git', ['ls-remote', '--heads', 'origin', 'main']) !== '';
  const pendingCommits = mainExistsOnRemote
    ? Number(out(repoDir, 'git', ['rev-list', '--count', 'origin/main..origin/develop']))
    : 0;
  if (!shouldRelease({ mainExistsOnRemote, pendingCommits })) {
    console.log(`${name}: nothing to release — origin/main is already at origin/develop. Skipped.`);
    return { name, skipped: true };
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
  // Follow the version into the lobby's tile registry (best-effort; never fatal).
  syncLobbyTileVersion({ repoDir, name, version });
  return { name, skipped: false, version };
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
