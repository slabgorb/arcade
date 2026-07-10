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
