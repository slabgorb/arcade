// Story 7-7 — Canonical arcade server (hardened by 7-8; reframed for R2 hosting;
// REWRITTEN by Task 19 of the monorepo migration).
//
// The contract this file guards is unchanged in intent: there is ONE authoritative
// way to serve the arcade in dev, it lives at the orchestrator root, and the docs
// say so. What changed is the shape of "one way". It used to mean one recipe that
// launched EIGHT dev servers on eight pinned ports through scripts/serve.mjs; it
// now means one Vite dev server on one port, and both the recipe's supervisor and
// the fleet it supervised are deleted.
//
// RETIRED HERE BY TASK 19, quoted by exact old title so the accounting is auditable:
//
//   * `AC2: canonical `serve` launches the lobby and the game subrepos`
//     It called jobsFor() from scripts/serve.mjs — the spawn table for the eight-
//     server fleet — and asserted every entry of the justfile `games` list appeared
//     in it. There is no fleet and no spawn table. Its successor is the behavioural
//     test at the bottom of this file, which asks the stronger question the old one
//     could not: not "would the launcher spawn a server for tempest" but "what does
//     the one server actually return for /tempest/".
//
//   * `AC2: the canonical serve set (`subrepos` / install-all) includes the lobby`
//     `subrepos` is not a variable whose value changed; it is a concept that stopped
//     existing. `install-all` is `npm install` — one install for the whole cabinet —
//     so there is no set for the lobby to be missing from.
//
//   * `AC2: each canonical serve doc references both pinned ports (5273 tempest,
//     5270 lobby)`
//     Half of it survives below, read from the config instead of a literal. The
//     tempest half asserted a port that no longer exists: eight pinned ports are
//     one. NOTE (owner: the docs task) — CLAUDE.md and README.md still carry the
//     eight-port table and the eight-subrepo layout wholesale. That staleness is
//     deliberately NOT patched here, and deliberately NOT asserted against either:
//     a test demanding 5273 be absent would go red on documentation this task does
//     not own, which is the failure mode the migration keeps hitting.
//
// They do not touch the operator's live infrastructure (R2 buckets, CI runs);
// that is a runtime fact, not an in-repo one.
//
// Run from the orchestrator root: `npm run test:orchestrator`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relPath) => readFileSync(join(root, relPath), 'utf8');

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

/** A recipe body with its `#` comment lines stripped — the commands, not the prose. */
const commandsOf = (body) =>
  body
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');

// --- AC2: one launch command at the orchestrator ---------------------------

test('AC2: justfile defines a single canonical `serve` recipe', () => {
  const body = recipeBody(read('justfile'), 'serve');
  assert.notEqual(
    body,
    null,
    'expected a `serve` recipe in justfile as the single canonical launch command for the arcade',
  );
});

test('AC2: canonical `serve` runs the one root vite, not a fleet launcher', () => {
  const body = commandsOf(recipeBody(read('justfile'), 'serve') ?? '');
  assert.match(body, /\bvite\b/, 'the canonical `serve` recipe must run vite');
  // The supervisor and the dependency doctor existed only to orchestrate eight
  // subrepos. A recipe still invoking either is a recipe that will die on a
  // missing module the first time anyone runs it.
  assert.doesNotMatch(body, /serve\.mjs/, 'scripts/serve.mjs is deleted — the fleet it launched is gone');
  assert.doesNotMatch(body, /deps-doctor/, 'scripts/deps-doctor.mjs is deleted — there is no @arcade/shared pin left to reconcile');
});

test('AC2: the pin comes from the config, so a BARE `npx vite` is pinned too', () => {
  // The recipe deliberately passes no --port/--strictPort/--host. If it did, the
  // pin would protect `just serve` and nothing else: every other way anyone starts
  // the dev server (`npx vite`, an editor task, a doc's copy-paste) would be
  // unpinned, and an unpinned host is exactly how a sibling checkout binds
  // [::1]:5270 beside this one's 127.0.0.1:5270 with no collision error at all.
  const body = commandsOf(recipeBody(read('justfile'), 'serve') ?? '');
  for (const flag of ['--port', '--strictPort', '--host']) {
    assert.doesNotMatch(
      body,
      new RegExp(flag.replace(/-/g, '\\-')),
      `\`serve\` must not pass ${flag} — the pin belongs in vite.config.ts, where it also covers a bare \`npx vite\``,
    );
  }
  // …and it is genuinely there to be inherited.
  const config = read('vite.config.ts');
  assert.match(config, /strictPort:\s*true/, 'vite.config.ts must pin strictPort');
  assert.match(config, /host:\s*'127\.0\.0\.1'/, "vite.config.ts must pin host to '127.0.0.1'");
});

// --- docs name the canonical command and the repo-not-directory rule --------

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

test('AC2: each canonical serve doc references THE pinned port', async () => {
  // Read from the factory, never a literal: a doc and a config that disagree is
  // the whole hazard, and a hardcoded constant here could drift from both.
  const { defineAppConfig } = await import('../vite.config.ts');
  const port = String(defineAppConfig({ id: 'lobby' }).server.port);
  for (const file of ['CLAUDE.md', 'README.md']) {
    assert.match(read(file), new RegExp(port), `${file} must reference the pinned port ${port}`);
  }
});

// --- docs: strictPort gives exactly one owner of the pinned port ------------

test('docs explain that strictPort lets only one server own the pinned port', () => {
  const docs = read('CLAUDE.md') + '\n' + read('README.md');
  assert.match(
    docs,
    /strictPort/,
    'docs must reference strictPort, which pins the port so only one server can hold it',
  );
  assert.match(
    docs,
    /fails? loudly|errors? out|only one server/i,
    'docs must explain a port collision fails loudly — no silent rival copy on the pinned port',
  );
});

// ---------------------------------------------------------------------------
// What the one dev server ACTUALLY serves — behavioural, not declarative
// ---------------------------------------------------------------------------
//
// This is the successor to `AC2: canonical serve launches the lobby and the game
// subrepos`, and it exists because that test's replacement was very nearly a curl
// loop asserting 200 on `/`, `/tempest/`, `/star-wars/` … which passes VACUOUSLY.
// MEASURED against the real root `vite` on 2026-07-31: every one of those paths
// returns 200 — and so does `/banana/`, which is not an app, with byte-identical
// HTML and `<title>Slabcade</title>`. The root vite.config.ts default-exports
// `defineAppConfig({ id: 'lobby' })`, whose `root` is lobby/, so the dev server is
// the LOBBY and every path is its SPA fallback. An all-200 check would have
// reported "the cabinet serves" about a server that serves one app.
//
// So the assertion is the identity, not the status code: a game's path returns the
// same bytes as a nonsense path. That is the operational statement of "the dev
// server does not serve the games", it cannot be satisfied by a fallback, and it
// reddens the day someone genuinely wires the games in — which is exactly when the
// `serve` recipe's comment, lobby/README.md and each plugin's CLAUDE.md all have to
// stop warning that a screenshot taken at /tempest/ is the lobby.
//
// Making the one dev server genuinely serve the cabinet is uf1-19 (PLAN DEFECT
// #22) — the gap is accepted and filed, not an oversight.
//
// IF YOU ARE READING THIS BECAUSE IT WENT RED: check whether the dev server now
// really serves the games. If it does, this test has done its job — correct all
// FOUR sites that describe the behaviour (vite.config.ts's default-export comment,
// which is the file that causes it; the justfile `serve` recipe; lobby/README.md;
// README.md), plus the affected plugins' CLAUDE.md, and replace this with the real
// per-app assertion.
test('the dev server serves the LOBBY at every path (a game path is not a game)', { timeout: 60_000 }, async () => {
  // A spare port, passed on the CLI. The pinned 5270 is deliberately NOT used: a
  // sibling checkout (a-2, a-3) may legitimately hold it, and this test is about
  // WHAT is served, not about the pin — the pin is proven separately and
  // behaviourally by `strictPort is real, not just declared` in
  // tests/monorepo-topology.test.mjs.
  const port = 5290 + Math.floor(Math.random() * 40);
  const vite = spawn('node_modules/.bin/vite', ['--port', String(port), '--strictPort'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  vite.stdout.on('data', (b) => (output += b.toString()));
  vite.stderr.on('data', (b) => (output += b.toString()));

  const get = async (path) => {
    const res = await fetch(`http://127.0.0.1:${port}/${path}`);
    return { status: res.status, body: await res.text() };
  };

  try {
    // Poll for readiness rather than sleeping: a fixed sleep either flakes on a
    // slow machine or wastes the difference on a fast one.
    let ready = null;
    for (let i = 0; i < 100 && ready === null; i++) {
      try {
        ready = await get('');
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    assert.notEqual(ready, null, `the dev server never accepted a connection on ${port}. Output:\n${output}`);
    assert.equal(ready.status, 200, `the dev server must serve the lobby at /. Output:\n${output}`);
    assert.match(ready.body, /<title>Slabcade<\/title>/, 'the root must be the lobby');

    // The control. `/banana/` is not an app, not a plugin directory, and not a
    // route — whatever comes back is the fallback, by construction.
    const control = await get('banana/');

    for (const game of ['tempest', 'star-wars', 'asteroids', 'battlezone', 'red-baron', 'centipede', 'joust']) {
      const res = await get(`${game}/`);
      assert.equal(
        res.body,
        control.body,
        `/${game}/ returned different bytes from the nonsense control /banana/ — the dev server may now ` +
          `genuinely serve the games (uf1-19). If so this guard has done its job: correct vite.config.ts's ` +
          `default-export comment FIRST — it is the file that causes the behaviour — then the \`serve\` ` +
          `recipe's comment, lobby/README.md, README.md and plugins/${game}/CLAUDE.md, and replace this ` +
          `test with the real per-app assertion.`,
      );
    }

    // Anti-vacuity: the control must be the LOBBY, not an error page or an empty
    // body that everything would trivially match.
    assert.match(
      control.body,
      /<title>Slabcade<\/title>/,
      `the control /banana/ must be the lobby's SPA fallback; if it is an error page this test compares ` +
        `errors to errors and proves nothing. Got status ${control.status}.`,
    );
  } finally {
    vite.kill('SIGKILL');
  }
});
