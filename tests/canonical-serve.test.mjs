// Story 7-7 — Canonical arcade server (hardened by 7-8; reframed for R2 hosting).
//
// These tests guard the *in-repo* contract for a single authoritative way to
// run the arcade in dev: a canonical `serve` recipe at the orchestrator + docs
// that name the `just serve` workflow, the pinned ports, and the rule that
// "canonical" is the repo (`arcade`) rather than any one checkout directory.
// Production is Cloudflare R2 (deployed via `just deploy` / `just release`);
// the docs must say so.
//
// They do not touch the operator's live infrastructure (R2 buckets, CI runs);
// that is a runtime fact, not an in-repo one.
//
// Run from the orchestrator root: `npm test` (→ `node --test 'tests/**/*.test.mjs'`).

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
//
// A variable assignment (`name := "value"`) also starts at column 0 and begins
// with the same token, so the `name `-space alternative would otherwise match it.
// `:=` is `just`'s assignment operator and never appears in a recipe header, so
// excluding any line containing `:=` keeps `serve :=` from masquerading as the
// `serve` recipe.
function recipeBody(justfile, name) {
  const lines = justfile.split('\n');
  const header = new RegExp(`^${name}(\\s|:)`);
  const isAssignment = /:=/;
  const start = lines.findIndex((line) => header.test(line) && !isAssignment.test(line));
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

test('AC2: the canonical serve set (`subrepos` / install-all) includes the lobby', () => {
  // `serve` and `install-all` iterate the `subrepos` list; the lobby shell must
  // be part of the canonical cabinet, not just the games.
  const justfile = read('justfile');
  const subrepos = justfile.match(/^subrepos\s*:=\s*"([^"]*)"/m);
  assert.notEqual(subrepos, null, 'justfile must define a `subrepos` list for the canonical serve/install set');
  assert.match(
    subrepos[1],
    /\blobby\b/,
    'the canonical serve/install set (`subrepos`) must include the lobby',
  );
});

// --- docs name the canonical command, the repo-not-directory rule, and ports

test('CLAUDE.md documents the canonical serve workflow (`just serve`)', () => {
  const claude = read('CLAUDE.md');
  assert.match(claude, /just serve/, 'CLAUDE.md must document the `just serve` command');
  assert.match(
    claude,
    /canonical/i,
    'CLAUDE.md must describe serving the arcade as the single canonical workflow',
  );
});

test('CLAUDE.md defines production as R2, with `just serve` as the dev loop', () => {
  const claude = read('CLAUDE.md');
  // The orchestrator repo is `arcade`; the checkout directory carries no authority.
  assert.match(
    claude,
    /directory name/i,
    'CLAUDE.md must address the directory name explicitly — it carries no authority; every checkout is equally `arcade`',
  );
  assert.match(claude, /R2/, 'CLAUDE.md must describe production as served from Cloudflare R2');
  assert.match(claude, /just serve/, 'CLAUDE.md must still document `just serve` as the local dev loop');
  assert.match(claude, /just deploy/, 'CLAUDE.md must document `just deploy` as the way to update the live arcade');
  assert.match(claude, /just release/, 'CLAUDE.md must document `just release` as the normal path to production');
});

test('AC5: README documents the canonical serve command (`just serve`)', () => {
  assert.match(
    read('README.md'),
    /just serve/,
    'README must point developers at `just serve` instead of ad-hoc per-game servers',
  );
});

test('AC2: each canonical serve doc references both pinned ports (5273 tempest, 5270 lobby)', () => {
  // Assert per-file, not against the concatenation: a port present in only one
  // doc must not let the other doc pass on its sibling's text.
  for (const file of ['CLAUDE.md', 'README.md']) {
    const doc = read(file);
    assert.match(doc, new RegExp(TEMPEST_PORT), `${file} must reference the pinned tempest port ${TEMPEST_PORT}`);
    assert.match(doc, new RegExp(LOBBY_PORT), `${file} must reference the pinned lobby port ${LOBBY_PORT}`);
  }
});

// --- docs: strictPort gives exactly one owner per pinned port ---------------

test('docs explain that strictPort lets only one server own each pinned port', () => {
  const docs = read('CLAUDE.md') + '\n' + read('README.md');
  assert.match(
    docs,
    /strictPort/,
    'docs must reference strictPort, which pins the ports so only one server can hold each',
  );
  assert.match(
    docs,
    /fails? loudly|errors? out|only one server/i,
    'docs must explain a port collision fails loudly — no silent rival copy on a pinned port',
  );
});
