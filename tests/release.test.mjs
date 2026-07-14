import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseSteps, shouldRelease } from '../scripts/release.mjs';

// On 2026-07-13 `just release-all` was run twice in a row. The second run shipped
// SIX releases whose entire diff was package.json + package-lock.json: six version
// bumps, six tags, six CI deploys re-uploading a byte-identical dist/. Nothing in
// the script asked whether there was anything to release — it bumped uncondition-
// ally. main IS the release target, so "is there anything to ship" is exactly
// "does origin/develop hold commits origin/main lacks".

test('shouldRelease: develop is ahead of main — there is something to ship', () => {
  assert.equal(shouldRelease({ mainExistsOnRemote: true, pendingCommits: 1 }), true);
  assert.equal(shouldRelease({ mainExistsOnRemote: true, pendingCommits: 42 }), true);
});

test('shouldRelease: main is level with develop — the empty release that actually happened', () => {
  assert.equal(shouldRelease({ mainExistsOnRemote: true, pendingCommits: 0 }), false);
});

test('shouldRelease: first release always ships (there is no origin/main to compare against)', () => {
  // pendingCommits is meaningless here — `origin/main..origin/develop` cannot even
  // be resolved — so the absence of main must short-circuit before it is consulted.
  assert.equal(shouldRelease({ mainExistsOnRemote: false, pendingCommits: 0 }), true);
});

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
