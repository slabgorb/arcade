// Story bz1-1 — Battlezone subrepo bootstrap: orchestrator wiring contract.
//
// The keystone bootstrap for epic bz1 (faithful Battlezone 1980 clone) stands up
// the gitignored `battlezone/` subrepo AND wires it into every place the
// orchestrator tracks a game. These tests guard the ORCHESTRATOR + LOBBY side of
// that wiring (the battlezone-internal scaffold — vite.config/tsconfig/index.html/
// math3d port — is guarded by battlezone/tests/scaffold.test.ts, which must stay
// inside the subrepo so a standalone `git clone battlezone` still passes).
//
// Guarded here, per the story ACs:
//   - orchestrator .gitignore ignores battlezone/ (like tempest/lobby/star-wars)
//   - .pennyfarthing/repos.yaml registers battlezone in the star-wars entry shape
//   - justfile lists battlezone in `games`, `subrepos`, and the `serve` recipe
//     CONSISTENTLY — Dev must fix the variables, not just the hardcoded trap block
//     (star-wars is currently wired only in the trap — see Delivery Findings)
//   - the lobby tile (lobby/src/core/registry.ts GAMES) gains a green battlezone
//   - cloudflared/config.yml routes /battlezone/* → :5276 ahead of the lobby
//     catch-all, and NEVER to 5275 (the pin bz1 lost to asteroids/epic A)
//   - battlezone/.git exists with a develop branch (gitflow)
//
// RED until GREEN lands the wiring. Run from the orchestrator root:
//   npm test   (→ node --test 'tests/**/*.test.mjs')

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relPath) => readFileSync(join(root, relPath), 'utf8');

// The pinned port contract: battlezone owns 5276. 5275 belongs to asteroids
// (epic A) and MUST NOT be reintroduced; 5270/5273/5274 are lobby/tempest/star-wars.
const BATTLEZONE_PORT = '5276';
const ASTEROIDS_PORT = '5275';

// --- helpers ---------------------------------------------------------------

// Extract a `just` recipe body by name (col-0 header, indented body). Copied
// from tests/canonical-serve.test.mjs so the two suites read the justfile the
// same way. `:=` never appears in a recipe header, so it screens out variables.
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

// Extract a top-level repo block (`  name:` at 2-space indent) from repos.yaml,
// returning its 4-space-indented field lines.
function repoBlock(yaml, name) {
  const lines = yaml.split('\n');
  const start = lines.findIndex((line) => line === `  ${name}:`);
  if (start === -1) return null;
  const body = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') { body.push(line); continue; }
    if (!/^\s{4,}/.test(line)) break; // dedent → next repo or top-level key
    body.push(line);
  }
  return body.join('\n');
}

// Pull the { ... } object literal for a given game id out of the lobby registry.
function lobbyTile(registry, id) {
  const re = new RegExp(`\\{[^{}]*id:\\s*['"]${id}['"][^{}]*\\}`);
  const m = registry.match(re);
  return m ? m[0] : null;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

// --- AC: orchestrator .gitignore ------------------------------------------

test('AC: orchestrator .gitignore ignores the battlezone/ subrepo', () => {
  const gitignore = read('.gitignore');
  assert.match(
    gitignore,
    /^\/battlezone\/\s*$/m,
    'battlezone/ must be gitignored at the orchestrator, root-anchored and directory-only (alongside tempest/lobby/star-wars)',
  );
});

// --- AC: repos.yaml registration (star-wars entry shape) -------------------

test('AC: repos.yaml registers battlezone in the star-wars entry shape', () => {
  const block = repoBlock(read('.pennyfarthing/repos.yaml'), 'battlezone');
  assert.notEqual(block, null, 'battlezone must be registered under repos: in .pennyfarthing/repos.yaml');
  assert.match(block, /path:\s*battlezone/, 'repos.yaml battlezone entry needs path: battlezone');
  assert.match(block, /type:\s*ui/, 'repos.yaml battlezone entry needs type: ui');
  assert.match(block, /default_branch:\s*develop/, 'repos.yaml battlezone entry needs default_branch: develop');
  assert.match(block, /branch_strategy:\s*gitflow/, 'repos.yaml battlezone entry needs branch_strategy: gitflow');
  assert.match(block, /language:\s*typescript/, 'repos.yaml battlezone entry needs language: typescript');
  assert.match(block, /framework:\s*vite/, 'repos.yaml battlezone entry needs framework: vite');
  assert.match(block, /dev_command:/, 'repos.yaml battlezone entry needs a dev_command');
  assert.match(block, /build_command:/, 'repos.yaml battlezone entry needs a build_command');
  assert.match(block, /test_command:/, 'repos.yaml battlezone entry needs a test_command');
});

// --- AC: justfile wiring (consistent across vars AND serve) -----------------

test('AC: justfile `games` variable includes battlezone', () => {
  const justfile = read('justfile');
  const games = justfile.match(/^games\s*:=\s*"([^"]*)"/m);
  assert.notEqual(games, null, 'justfile must define a `games` list');
  assert.match(
    games[1],
    /\bbattlezone\b/,
    'battlezone must be in the `games` variable (fix the variable, do not just hardcode it in serve)',
  );
});

test('AC: justfile `subrepos` variable includes battlezone', () => {
  const justfile = read('justfile');
  const subrepos = justfile.match(/^subrepos\s*:=\s*"([^"]*)"/m);
  assert.notEqual(subrepos, null, 'justfile must define a `subrepos` list');
  assert.match(subrepos[1], /\bbattlezone\b/, 'battlezone must be in the `subrepos` variable (serve/install-all iterate it)');
});

test('AC: canonical `serve` recipe launches battlezone', () => {
  const body = recipeBody(read('justfile'), 'serve') ?? '';
  assert.match(body, /battlezone/, 'the canonical serve recipe must launch battlezone alongside lobby/tempest/star-wars');
});

test('reconcile (SM decision #1): justfile `games`/`subrepos` also backfill star-wars', () => {
  // star-wars is wired only in the hardcoded serve trap today — `games := "tempest"`
  // and `subrepos := "lobby tempest"` silently skip it, so build-all/test-all/
  // install-all never touch star-wars. AC6 says battlezone must be "reconciled
  // with however star-wars is wired": the SM ruled we backfill star-wars into the
  // vars in passing (logged as a Delivery Finding), not copy the drift forward.
  const justfile = read('justfile');
  const games = justfile.match(/^games\s*:=\s*"([^"]*)"/m);
  const subrepos = justfile.match(/^subrepos\s*:=\s*"([^"]*)"/m);
  assert.notEqual(games, null, 'justfile must define a `games` list');
  assert.notEqual(subrepos, null, 'justfile must define a `subrepos` list');
  assert.match(games[1], /\bstar-wars\b/, 'backfill star-wars into `games` (build-all/test-all iterate it)');
  assert.match(subrepos[1], /\bstar-wars\b/, 'backfill star-wars into `subrepos` (install-all/serve iterate it)');
});

// --- AC: lobby tile --------------------------------------------------------

test('AC: lobby registry lists a battlezone tile launching /battlezone/', () => {
  const registry = read('lobby/src/core/registry.ts');
  const tile = lobbyTile(registry, 'battlezone');
  assert.notEqual(tile, null, "lobby GAMES must contain a { id: 'battlezone', ... } tile");
  assert.match(tile, /title:\s*['"]BATTLEZONE['"]/, "battlezone tile needs title: 'BATTLEZONE'");
  assert.match(tile, /launchUrl:\s*['"]https:\/\/battlezone\.slabgorb\.com\/['"]/, "battlezone tile must launch its subdomain");
});

test('AC: the battlezone tile is a green-family colour, distinct from the cyan/yellow tiles', () => {
  const registry = read('lobby/src/core/registry.ts');
  const tile = lobbyTile(registry, 'battlezone') ?? '';
  const m = tile.match(/color:\s*['"](#[0-9a-fA-F]{3,8})['"]/);
  assert.notEqual(m, null, 'battlezone tile must define a colour hex');
  const hex = m[1].toLowerCase();
  assert.notEqual(hex, '#00eaff', 'battlezone colour must differ from tempest cyan (#00eaff)');
  assert.notEqual(hex, '#ffe81f', 'battlezone colour must differ from star-wars yellow (#ffe81f)');
  const { r, g, b } = hexToRgb(hex);
  assert.ok(g > r && g > b, `battlezone tile should be green-family (G dominant); got ${hex}`);
});

// --- AC: cloudflared ingress (/battlezone/* → :5276, ahead of lobby) --------

test('AC: cloudflared routes /battlezone/* to :5276, ahead of the lobby catch-all', () => {
  const cf = read('cloudflared/config.yml');
  const bzIdx = cf.indexOf('^/battlezone');
  assert.notEqual(bzIdx, -1, 'cloudflared/config.yml must contain a path: ^/battlezone rule');

  // The rule's service must be the battlezone dev server on :5276.
  const ruleWindow = cf.slice(bzIdx, bzIdx + 200);
  assert.match(ruleWindow, new RegExp(`localhost:${BATTLEZONE_PORT}`), 'the /battlezone rule must proxy to localhost:5276');
  assert.doesNotMatch(ruleWindow, new RegExp(ASTEROIDS_PORT), 'the /battlezone rule must NOT use 5275 (asteroids/epic A owns it)');

  // First-match, top-to-bottom: the per-game rule must precede the lobby catch-all
  // (the pathless rule pointing at :5270).
  const lobbyCatchAll = cf.indexOf('service: http://localhost:5270');
  assert.notEqual(lobbyCatchAll, -1, 'cloudflared/config.yml must retain the lobby catch-all (:5270)');
  assert.ok(bzIdx < lobbyCatchAll, 'the /battlezone rule must be ordered AHEAD of the lobby catch-all');
});

// --- AC: battlezone repo initialized with develop (gitflow) ----------------

test('AC: battlezone/.git exists with a develop branch (gitflow)', () => {
  assert.ok(existsSync(join(root, 'battlezone/.git')), 'battlezone/.git must exist (git init -b develop)');
  const branches = execFileSync('git', ['-C', join(root, 'battlezone'), 'branch', '--list', 'develop'], {
    encoding: 'utf8',
  });
  assert.match(branches, /develop/, 'battlezone repo must have a develop branch');
});
