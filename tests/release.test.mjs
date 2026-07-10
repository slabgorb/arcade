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
