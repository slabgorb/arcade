// Story 7-7 — Canonical arcade server.
//
// These tests guard the *in-repo* contract for a single authoritative way to
// serve the arcade: a canonical `serve` recipe at the orchestrator + docs that
// name the canonical serve workflow, checkout, and pinned ports. They cannot
// test the operator-only acceptance criteria (wiring the live Cloudflare tunnel,
// deleting/renaming stale clones on disk) — those are verified manually and are
// recorded as Delivery Findings in the session file.
//
// Run from the orchestrator root: `npm test` (→ `node --test tests/`).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relPath) => readFileSync(join(root, relPath), 'utf8');

// The pinned ports are the canonical contract: tempest owns 5273, lobby 5270.
const TEMPEST_PORT = '5273';
const LOBBY_PORT = '5270';

// Extract a `just` recipe body by name. A recipe header sits at column 0
// (`name:`, `name args:`, or `name: deps`); its body lines are indented.
function recipeBody(justfile, name) {
  const lines = justfile.split('\n');
  const header = new RegExp(`^${name}(\\s|:)`);
  const start = lines.findIndex((line) => header.test(line));
  if (start === -1) return null;
  const body = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      body.push(line);
      continue;
    }
    if (!/^\s/.test(line)) break; // a non-indented line ends the recipe
    body.push(line);
  }
  return body.join('\n');
}

// --- AC2: one launch command at the orchestrator ---------------------------

test('AC2: justfile defines a single canonical `serve` recipe', () => {
  const body = recipeBody(read('justfile'), 'serve');
  assert.notEqual(
    body,
    null,
    'expected a `serve` recipe in justfile as the single canonical launch command for the arcade',
  );
});

test('AC2: canonical `serve` recipe launches the lobby and the game subrepos', () => {
  const body = recipeBody(read('justfile'), 'serve') ?? '';
  assert.match(body, /lobby/i, 'serve recipe must launch the lobby');
  assert.match(
    body,
    /tempest|games/i,
    'serve recipe must launch the game subrepos (a literal game or the games list)',
  );
});

// --- AC1 + AC5: docs name the canonical workflow, checkout, and ports -------

test('AC1/AC5: CLAUDE.md documents the canonical serve workflow (`just serve`)', () => {
  const claude = read('CLAUDE.md');
  assert.match(claude, /just serve/, 'CLAUDE.md must document the `just serve` command');
  assert.match(
    claude,
    /canonical/i,
    'CLAUDE.md must describe serving the arcade as the single canonical workflow',
  );
});

test('AC1: docs identify a single canonical checkout/location as the source of truth', () => {
  const claude = read('CLAUDE.md');
  assert.match(
    claude,
    /source of truth|authoritative/i,
    'CLAUDE.md must name a single canonical checkout/location as the authoritative source of truth for serving',
  );
});

test('AC5: README documents the canonical serve command (`just serve`)', () => {
  assert.match(
    read('README.md'),
    /just serve/,
    'README must point developers at `just serve` instead of ad-hoc per-game servers',
  );
});

test('AC2: canonical serve docs reference both pinned ports (5273 tempest, 5270 lobby)', () => {
  const docs = read('CLAUDE.md') + '\n' + read('README.md');
  assert.match(docs, new RegExp(TEMPEST_PORT), `docs must reference the pinned tempest port ${TEMPEST_PORT}`);
  assert.match(docs, new RegExp(LOBBY_PORT), `docs must reference the pinned lobby port ${LOBBY_PORT}`);
});

// --- AC4 (in-repo doc footprint): warn against ad-hoc / duplicate servers ---

test('AC4/AC5: docs warn against serving from a random / non-authoritative clone', () => {
  const docs = read('CLAUDE.md') + '\n' + read('README.md');
  assert.match(
    docs,
    /ad-hoc|non-authoritative|random clone|duplicate clone|stale clone/i,
    'docs must warn against starting an ad-hoc server from a duplicate/non-authoritative clone',
  );
});
