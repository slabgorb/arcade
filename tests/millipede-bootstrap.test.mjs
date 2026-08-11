// Story ml1-5 — Millipede scaffold: orchestrator wiring contract (RED, Leeloo/TEA).
//
// Millipede is the TENTH game. This file guards the ORCHESTRATOR side of adding it
// — the "three registrations" of CLAUDE.md's "Adding a game": the justfile `games`
// var, vitest.config.ts's `GAMES`, and the generated src/host/registry.ts. The
// PLUGIN-internal scaffold (the four files, the meta, and — arriving with the parked
// ml1-1 — the core/shell purity + citation gate) is guarded under the `millipede`
// vitest project once GREEN registers it.
//
// Modeled on tests/missile-command-bootstrap.test.mjs. Run from the orchestrator root:
//   npm run test:orchestrator
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// GREEN has not landed yet, so every assertion below fails for a real, feature-shaped
// reason (never a broken-harness reason):
//   • `plugins/millipede/` does not exist         → the four-file + plugin.ts blocks fail
//   • millipede is absent from justfile `games`    → registration 1 fails
//   • millipede is absent from vitest.config GAMES → registration 2 fails
//   • the generated registry has no millipede entry→ registration 3 fails
// GREEN copies plugins/joust/'s four files, fills the millipede meta, adds `millipede`
// to the justfile + vitest GAMES, and runs `npm run gen:registry`.
//
// ─── THE REGISTRATION SURFACE IS WIDER THAN THE STORY TITLE (GREEN must not miss it) ─
// The title names three registrations, but the orchestrator suite hardcodes the
// nine-game roster in places that will RED the instant `plugins/millipede/` appears —
// updating them is part of GREEN, and `npm run test:orchestrator` is the safety net:
//   • tests/monorepo-topology.test.mjs:96  — its own `GAMES` const; :104 asserts
//     plugins/ holds EXACTLY those games (plus tsconfig-extends, base-path, pkg fields)
//   • tests/registry.test.mjs — `dirs.length === 9` (:33), the `--check` banner
//     `9 games (8 listed)` (:58), and the curated tile-order array (:69)
//   • tests/canonical-serve.test.mjs — derives its games from readdirSync(plugins), so
//     it auto-asserts /millipede/ serves a page DISTINCT from the /banana/ nonsense
//     control (the story's boot check, mechanized): a black canvas that serves the
//     lobby's fallback bytes reddens there.
// NOT covered here (manual verify step): the VISUAL black-canvas boot at
// http://127.0.0.1:5270/millipede/ — screenshot it, don't trust a 200 (lobby SPA
// fallback answers 200 to everything; CLAUDE.md "serve" section).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relPath) => readFileSync(join(root, relPath), 'utf8');
const has = (relPath) => existsSync(join(root, relPath));

// The nine games already wired — GREEN adds millipede WITHOUT dropping any of these
// from the justfile `games` list or vitest's GAMES.
const EXISTING_GAMES = [
  'tempest',
  'star-wars',
  'asteroids',
  'battlezone',
  'red-baron',
  'centipede',
  'joust',
  'missile-command',
  'pac-man',
];

const justfileVar = (justfile, name) => {
  const m = justfile.match(new RegExp(`^${name}\\s*:=\\s*"([^"]*)"`, 'm'));
  assert.notEqual(m, null, `justfile must define the \`${name}\` variable`);
  return m[1].split(/\s+/).filter(Boolean);
};

/** The millipede object literal in the generated registry, or null. `[^}]*` is safe:
 *  a registry entry holds no nested braces. */
const registryEntry = (reg) => {
  const m = reg.match(/\{[^}]*id:\s*'millipede'[^}]*\}/);
  return m ? m[0] : null;
};

// ── Registration 1: justfile `games` ─────────────────────────────────────────
test('justfile `games` lists millipede (test-all/build-all fleet coverage)', () => {
  const games = justfileVar(read('justfile'), 'games');
  assert.ok(games.includes('millipede'), '`games` must include millipede');
});

test('justfile `games` does not regress the existing nine games', () => {
  const games = justfileVar(read('justfile'), 'games');
  for (const g of EXISTING_GAMES) {
    assert.ok(games.includes(g), `\`games\` must keep ${g}`);
  }
});

// ── Registration 2: vitest.config.ts `GAMES` ─────────────────────────────────
test('vitest.config.ts `GAMES` includes millipede (its own vitest project)', () => {
  const cfg = read('vitest.config.ts');
  const block = cfg.match(/const GAMES\s*=\s*\[([\s\S]*?)\]/);
  assert.notEqual(block, null, 'vitest.config.ts must define a GAMES array');
  const ids = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.ok(ids.includes('millipede'), 'GAMES must include millipede');
  for (const g of EXISTING_GAMES) {
    assert.ok(ids.includes(g), `GAMES must keep ${g}`);
  }
});

// ── Registration 3: the generated src/host/registry.ts ───────────────────────
test('src/host/registry.ts carries the millipede entry with the correct meta', () => {
  const reg = read('src/host/registry.ts');
  const entry = registryEntry(reg);
  assert.notEqual(entry, null, 'registry must hold a parseable millipede object literal');
  assert.match(entry, /id:\s*'millipede'/, 'registry entry id must be millipede');
  assert.match(entry, /title:\s*'MILLIPEDE'/, "title must be 'MILLIPEDE'");
  assert.match(entry, /year:\s*1982/, 'year must be 1982 (Ed Logg, Sept 1982)');
  // order 10 — pac-man owns 9; 10 is the next free slot. (The mc1-1 "order 7 was
  // already taken" trap: derive the slot from the current registry, don't guess.)
  assert.match(entry, /order:\s*10\b/, 'millipede order must be 10 (pac-man is 9)');
  // A version is present (imported from package.json by plugin.ts, never hardcoded).
  assert.match(entry, /version:\s*'[^']+'/, 'registry entry must carry a version');
});

test('millipede order 10 does not collide with an existing game', () => {
  const reg = read('src/host/registry.ts');
  const orders = [...reg.matchAll(/id:\s*'([^']+)',[\s\S]*?order:\s*(\d+)/g)].map((m) => [m[1], Number(m[2])]);
  const at10 = orders.filter(([, o]) => o === 10).map(([id]) => id);
  assert.deepEqual(at10, ['millipede'], `order 10 must belong to millipede alone, got: ${at10.join(', ')}`);
});

test('the black-canvas scaffold is NOT a showcase game (showcase-liveness would redden)', () => {
  // showcase:true asserts the game boots into a live self-playing demo
  // (tests/showcase-liveness.test.mjs, derived from the manifests). A scaffold that
  // only paints a black canvas cannot, so millipede must be showcase:false — the one
  // meta value a blind copy of joust (showcase:true) would get wrong.
  const reg = read('src/host/registry.ts');
  const entry = registryEntry(reg);
  assert.notEqual(entry, null, 'registry must hold a millipede entry');
  assert.doesNotMatch(entry, /showcase:\s*true/, 'millipede must not be showcase:true until it self-plays');
});

// ── The four-file plugin shape exists (AC-1) ─────────────────────────────────
test('plugins/millipede holds the four scaffold files', () => {
  for (const f of ['index.html', 'plugin.ts', 'package.json', 'tsconfig.json']) {
    assert.ok(has(join('plugins', 'millipede', f)), `plugins/millipede/${f} must exist`);
  }
});

test('plugins/millipede/tsconfig.json extends the root config at the right depth', () => {
  assert.ok(has('plugins/millipede/tsconfig.json'), 'plugins/millipede/tsconfig.json must exist (scaffold not landed)');
  const tc = JSON.parse(read('plugins/millipede/tsconfig.json'));
  assert.equal(tc.extends, '../../tsconfig.json', 'a game sits one level deeper than the lobby');
});

test('plugins/millipede/package.json is a private millipede package with a version', () => {
  assert.ok(has('plugins/millipede/package.json'), 'plugins/millipede/package.json must exist (scaffold not landed)');
  const pkg = JSON.parse(read('plugins/millipede/package.json'));
  assert.equal(pkg.name, 'millipede', "package.json name must be 'millipede'");
  assert.equal(pkg.private, true, 'the plugin package must be private');
  assert.match(String(pkg.version), /^\d+\.\d+\.\d+$/, 'package.json must carry a semver version');
});

test('plugins/millipede/plugin.ts declares the meta the registry is generated from', () => {
  assert.ok(has('plugins/millipede/plugin.ts'), 'plugins/millipede/plugin.ts must exist (scaffold not landed)');
  const src = read('plugins/millipede/plugin.ts');
  assert.match(src, /id:\s*'millipede'/, "plugin.ts meta.id must be 'millipede'");
  assert.match(src, /title:\s*'MILLIPEDE'/, "plugin.ts meta.title must be 'MILLIPEDE'");
  assert.match(src, /year:\s*1982/, 'plugin.ts meta.year must be 1982');
  assert.match(src, /order:\s*10\b/, 'plugin.ts meta.order must be 10 (pac-man is 9)');
  assert.match(src, /listed:\s*true/, 'plugin.ts meta.listed must be true (native-game scaffold convention)');
  assert.doesNotMatch(src, /showcase:\s*true/, 'plugin.ts meta.showcase must not be true until it self-plays');
  // version comes from package.json, never hardcoded — the sibling games import it.
  assert.match(src, /version/, 'plugin.ts meta must carry a version (imported from package.json)');
});
