// The generated registry replaced a hand-maintained list whose versions and launch
// URLs silently rotted (battlezone sat at '1.0.0' in the lobby while its package.json
// said 1.0.3; red-baron was live but absent entirely). These tests are the anti-rot
// guard: the committed src/host/registry.ts must match what the generator produces
// from the seven manifests RIGHT NOW.
//
// Deliberately NON-DESTRUCTIVE. The obvious way to write the staleness check is to
// shell out to the generator and diff the file before/after — but that rewrites the
// very file under test, so a stale registry fails once and then passes forever after,
// with the drift silently committed. Instead scripts/gen-registry.mjs exports
// `buildRegistry()` (render, no write) and only writes from its CLI `main()`; the one
// test that does run the CLI runs it in `--check` mode and asserts the file on disk is
// byte-identical afterwards.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { buildRegistry } from '../scripts/gen-registry.mjs';

const repo = resolve(import.meta.dirname, '..');
const path = (...rel) => join(repo, ...rel);
const read = (...rel) => readFileSync(path(...rel), 'utf8');

const pluginDirs = () =>
  readdirSync(path('plugins'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

test('every plugins/* directory has a plugin.ts', () => {
  const dirs = pluginDirs();
  assert.equal(dirs.length, 9, 'expected nine games under plugins/');
  for (const dir of dirs) {
    assert.doesNotThrow(
      () => readFileSync(path('plugins', dir, 'plugin.ts')),
      `plugins/${dir}/plugin.ts is missing`,
    );
  }
});

test('the committed registry matches a fresh generation', () => {
  assert.equal(
    read('src', 'host', 'registry.ts'),
    buildRegistry().source,
    'src/host/registry.ts is stale — run `npm run gen:registry`',
  );
});

test('the generator CLI runs, agrees, and --check writes nothing', () => {
  // Covers the half `buildRegistry()` above cannot: that main() is wired up and the
  // script is runnable as `npm run gen:registry`. --check must not touch the file.
  const before = readFileSync(path('src', 'host', 'registry.ts'));
  const out = execFileSync('node', [path('scripts', 'gen-registry.mjs'), '--check'], {
    encoding: 'utf8',
    cwd: repo,
  });
  assert.match(out, /9 games \(8 listed\)/);
  assert.deepEqual(readFileSync(path('src', 'host', 'registry.ts')), before, '--check wrote to the registry');
});

test('the cabinet keeps its curated tile order', () => {
  // The order the old hand-maintained registry shipped. Generating from directory
  // names would have re-sorted the lobby alphabetically — a visible change nobody
  // asked for. This test is what makes that a failure rather than a surprise.
  // red-baron is last: unlisted, so it never had a tile position to preserve.
  const registry = read('src', 'host', 'registry.ts');
  const ids = [...registry.matchAll(/^\s*id: '([^']+)'/gm)].map((m) => m[1]);
  assert.deepEqual(ids, [
    'tempest', 'star-wars', 'asteroids', 'battlezone', 'centipede', 'joust', 'red-baron', 'missile-command', 'pac-man',
  ]);
});

test('each registry entry carries ITS OWN package.json version', () => {
  // Anchored id -> version. A bare `registry.includes("version: '1.0.14'")` would pass
  // as long as SOME game shipped that version, which is exactly the class of drift
  // (battlezone stuck at a stale string) this file exists to catch.
  const registry = read('src', 'host', 'registry.ts');
  for (const dir of pluginDirs()) {
    const { version } = JSON.parse(read('plugins', dir, 'package.json'));
    const entry = registry.match(new RegExp(`id: '${dir}',[\\s\\S]*?version: '([^']+)'`));
    assert.ok(entry, `registry has no entry for ${dir}`);
    assert.equal(entry[1], version, `registry has ${dir} at ${entry[1]}, package.json says ${version}`);
  }
});

test('the registry declares no launch URLs', () => {
  // The shape it replaced hardcoded six absolute subdomains. Under the single-origin
  // scheme a game is served at '/<id>/', derived by gamePath(). A launchUrl reappearing
  // means someone hand-edited the generated file or re-added the retired field.
  //
  // Anchored to a FIELD declaration, not the bare word: gamePath's doc comment names
  // `launchUrl` to say what it replaced, and a bare /launchUrl/ reddens on that comment
  // — a test that fails on prose explaining the rule rather than on a breach of it.
  const registry = read('src', 'host', 'registry.ts');
  assert.doesNotMatch(registry, /^\s*launchUrl:/m);
  assert.doesNotMatch(registry, /slabgorb\.com/);
});
