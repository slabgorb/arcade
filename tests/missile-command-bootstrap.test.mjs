// Story mc1-1 — Missile Command scaffold: orchestrator wiring contract.
//
// Missile Command is the EIGHTH game. This file guards the ORCHESTRATOR side of
// adding it — the "three registrations" of CLAUDE.md's "Adding a game": the
// justfile `games` var, vitest.config.ts's `GAMES`, and the generated
// src/host/registry.ts. The PLUGIN-internal scaffold (four files, meta, the
// core/shell boundary) is guarded by plugins/missile-command/tests/scaffold.test.ts
// and purity.test.ts, which run under the `missile-command` vitest project.
//
// Modeled on tests/joust-bootstrap.test.mjs. RED until GREEN lands the wiring.
// Run from the orchestrator root:  npm run test:orchestrator
//
// ORDER CORRECTION (TEA, mc1-1 RED): the design doc (mc1-skeleton.md) and the
// story context both say `order: 7`, but red-baron already owns order 7 —
// orders 1..7 are taken (tempest..red-baron). The next free slot is 8, so this
// file pins `order: 8`. Filed as a Design Deviation; Dev must scaffold plugin.ts
// with order 8, not 7.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relPath) => readFileSync(join(root, relPath), 'utf8');
const has = (relPath) => existsSync(join(root, relPath));

// The seven games already wired — GREEN adds missile-command WITHOUT dropping
// any of these from the justfile `games` list.
const EXISTING_GAMES = [
  'tempest',
  'star-wars',
  'asteroids',
  'battlezone',
  'red-baron',
  'centipede',
  'joust',
];

const justfileVar = (justfile, name) => {
  const m = justfile.match(new RegExp(`^${name}\\s*:=\\s*"([^"]*)"`, 'm'));
  assert.notEqual(m, null, `justfile must define the \`${name}\` variable`);
  return m[1].split(/\s+/).filter(Boolean);
};

// ── Registration 1: justfile `games` ─────────────────────────────────────────
test('justfile `games` lists missile-command (test-all/build-all fleet coverage)', () => {
  const games = justfileVar(read('justfile'), 'games');
  assert.ok(games.includes('missile-command'), '`games` must include missile-command');
});

test('justfile `games` does not regress the existing seven games', () => {
  const games = justfileVar(read('justfile'), 'games');
  for (const g of EXISTING_GAMES) {
    assert.ok(games.includes(g), `\`games\` must keep ${g}`);
  }
});

// ── Registration 2: vitest.config.ts `GAMES` ─────────────────────────────────
test('vitest.config.ts `GAMES` includes missile-command (its own vitest project)', () => {
  const cfg = read('vitest.config.ts');
  const block = cfg.match(/const GAMES\s*=\s*\[([\s\S]*?)\]/);
  assert.notEqual(block, null, 'vitest.config.ts must define a GAMES array');
  const ids = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.ok(ids.includes('missile-command'), 'GAMES must include missile-command');
  // Anti-regression: the seven others stay in GAMES too.
  for (const g of EXISTING_GAMES) {
    assert.ok(ids.includes(g), `GAMES must keep ${g}`);
  }
});

// ── Registration 3: the generated src/host/registry.ts ───────────────────────
test('src/host/registry.ts carries the missile-command entry with the correct meta', () => {
  const reg = read('src/host/registry.ts');
  assert.match(reg, /id:\s*'missile-command'/, 'registry must hold a missile-command entry');
  assert.match(reg, /title:\s*'MISSILE COMMAND'/, "title must be 'MISSILE COMMAND'");
  assert.match(reg, /year:\s*1980/, 'year must be 1980');
  // order 8, NOT 7 (red-baron owns 7). See the ORDER CORRECTION header.
  const entry = reg.match(/\{[^}]*id:\s*'missile-command'[^}]*\}/);
  assert.notEqual(entry, null, 'missile-command entry must be a parseable object literal');
  assert.match(entry[0], /order:\s*8\b/, 'missile-command order must be 8 (7 is red-baron)');
});

// ── The four-file plugin shape exists (AC1) ──────────────────────────────────
test('plugins/missile-command holds the four scaffold files', () => {
  for (const f of ['index.html', 'plugin.ts', 'package.json', 'tsconfig.json']) {
    assert.ok(has(join('plugins', 'missile-command', f)), `plugins/missile-command/${f} must exist`);
  }
});

test('plugins/missile-command/plugin.ts declares the meta the registry is generated from', () => {
  const src = read('plugins/missile-command/plugin.ts');
  assert.match(src, /id:\s*'missile-command'/, "plugin.ts meta.id must be 'missile-command'");
  assert.match(src, /title:\s*'MISSILE COMMAND'/, "plugin.ts meta.title must be 'MISSILE COMMAND'");
  assert.match(src, /year:\s*1980/, 'plugin.ts meta.year must be 1980');
  assert.match(src, /order:\s*8\b/, 'plugin.ts meta.order must be 8 (7 is red-baron)');
  assert.match(src, /listed:\s*true/, 'plugin.ts meta.listed must be true');
  // version comes from package.json, never hardcoded — the sibling games import it.
  assert.match(src, /version/, 'plugin.ts meta must carry a version (imported from package.json)');
});
