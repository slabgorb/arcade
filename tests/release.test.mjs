import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bumpRegistryVersion, releaseSteps, shouldRelease } from '../scripts/release.mjs';

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

// The lobby lists each game with a hand-maintained `version` string in
// lobby/src/core/registry.ts. `just release <game>` bumped the game's own
// package.json but never that string, so every release left the tile stale —
// centipede's tile still read 0.0.0 after it had shipped. bumpRegistryVersion is
// the pure text transform release.mjs now applies to the registry so the tile
// follows the release; the IO wrapper that commits it to the lobby's develop is
// built on top. Pure text in -> text out keeps it unit-testable and keeps
// release.mjs's single-repo purity: the transform knows nothing about git.
const REGISTRY_FIXTURE = `export const GAMES = [
  {
    id: 'tempest',
    title: 'TEMPEST',
    launchUrl: 'https://tempest.slabgorb.com/',
    color: '#00eaff',
    controls: ['ROTATE — Wheel / ←→', 'FIRE — Click / Space'],
    version: '1.0.24',
  },
  {
    id: 'joust',
    title: 'JOUST',
    launchUrl: 'https://joust.slabgorb.com/',
    color: '#f0a828',
    controls: ['MOVE — ←→ / A D', 'FLAP — Space / Shift'],
    version: '0.0.4',
  },
]
`;

test('bumpRegistryVersion: rewrites the named entry and reports it changed', () => {
  const { text, changed } = bumpRegistryVersion(REGISTRY_FIXTURE, 'joust', '0.0.5');
  assert.equal(changed, true);
  assert.match(text, /id: 'joust',[\s\S]*?version: '0\.0\.5',/);
  assert.doesNotMatch(text, /version: '0\.0\.4'/);
});

test('bumpRegistryVersion: leaves every OTHER entry untouched (no cross-entry bleed)', () => {
  // The non-greedy match must stop at the FIRST version after the id, or bumping
  // tempest could reach across and rewrite joust's version too.
  const { text } = bumpRegistryVersion(REGISTRY_FIXTURE, 'tempest', '1.0.25');
  assert.match(text, /id: 'tempest',[\s\S]*?version: '1\.0\.25',/);
  assert.match(text, /id: 'joust',[\s\S]*?version: '0\.0\.4',/); // joust unchanged
});

test('bumpRegistryVersion: id with no tile is a no-op — changed:false, text identical', () => {
  // Releasing a game the lobby does not list (red-baron is provisioned but not
  // listed) or the lobby itself must NOT rewrite the file or trigger a commit.
  const { text, changed } = bumpRegistryVersion(REGISTRY_FIXTURE, 'red-baron', '1.0.0');
  assert.equal(changed, false);
  assert.equal(text, REGISTRY_FIXTURE);
});

test('bumpRegistryVersion: bumping to the SAME version is a no-op — no empty commit', () => {
  const { text, changed } = bumpRegistryVersion(REGISTRY_FIXTURE, 'joust', '0.0.4');
  assert.equal(changed, false);
  assert.equal(text, REGISTRY_FIXTURE);
});
