// deps-doctor contract — `just serve` must reconcile the @arcade/shared git-dep pin
// before launching, so a bumped pin can never serve stale node_modules bytes again.
//
// Background: the lobby once 500'd because node_modules held @arcade/shared v0.4.0 under
// a v0.16.0 pin (plain `npm install` does not re-resolve a bumped `#ref`), blanking the
// game grid on a missing `/glow` export. These tests guard the in-repo wiring that makes
// serve/install-all self-heal it. They are static text contracts (no npm, no network),
// matching canonical-serve.test.mjs.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relPath) => readFileSync(join(root, relPath), 'utf8');

// Same recipe-body extractor contract as canonical-serve.test.mjs: a header at column 0,
// indented body, `:=` assignments excluded so `serve :=` can't masquerade as `serve`.
function recipeBody(justfile, name) {
  const lines = justfile.split('\n');
  const header = new RegExp(`^${name}(\\s|:)`);
  const isAssignment = /:=/;
  const start = lines.findIndex((line) => header.test(line) && !isAssignment.test(line));
  if (start === -1) return null;
  const body = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') { body.push(line); continue; }
    if (!/^\s/.test(line)) break;
    body.push(line);
  }
  return body.join('\n');
}

test('the deps-doctor script exists', () => {
  assert.ok(
    existsSync(join(root, 'scripts/deps-doctor.mjs')),
    'scripts/deps-doctor.mjs must exist — it reconciles installed @arcade/shared against the pin',
  );
});

test('`serve` runs the deps-doctor preflight before launching servers', () => {
  const body = recipeBody(read('justfile'), 'serve') ?? '';
  assert.match(
    body,
    /deps-doctor\.mjs/,
    'the serve recipe must invoke scripts/deps-doctor.mjs as a preflight so it cannot serve stale @arcade/shared bytes',
  );
  // The preflight must precede the launches, or a stale dep is already being served.
  const doctorAt = body.indexOf('deps-doctor.mjs');
  const launchAt = body.search(/npm run dev/);
  assert.ok(doctorAt !== -1 && launchAt !== -1, 'serve must both preflight and launch');
  assert.ok(doctorAt < launchAt, 'the deps-doctor preflight must run BEFORE the first `npm run dev`');
});

test('`install-all` reconciles through deps-doctor (not a bare `npm install` loop)', () => {
  const body = recipeBody(read('justfile'), 'install-all') ?? '';
  assert.match(
    body,
    /deps-doctor\.mjs/,
    'install-all must route through deps-doctor so a bumped git-dep pin is actually re-resolved',
  );
});

test('the deps-doctor preflight covers the whole canonical serve set (`subrepos`)', () => {
  // Both call sites pass {{subrepos}}, the single source of truth the canonical-serve
  // guard already pins to include the lobby — so the reconcile can never skip a subrepo.
  const justfile = read('justfile');
  for (const recipe of ['serve', 'install-all']) {
    const body = recipeBody(justfile, recipe) ?? '';
    assert.match(
      body,
      /deps-doctor\.mjs \{\{subrepos\}\}/,
      `${recipe} must run deps-doctor over the full {{subrepos}} set, not a subset`,
    );
  }
});
