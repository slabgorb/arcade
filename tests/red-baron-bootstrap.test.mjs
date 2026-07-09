// Story rb1-1 — Red Baron subrepo bootstrap: orchestrator wiring contract.
//
// The keystone bootstrap for epic rb1 (faithful Red Baron 1980 clone) stands up
// the gitignored `red-baron/` subrepo AND wires it into every place the
// orchestrator tracks a game. These tests guard the ORCHESTRATOR + LOBBY side of
// that wiring (the red-baron-internal scaffold — vite.config/tsconfig/index.html/
// @arcade/shared pipe — is guarded by red-baron/tests/scaffold.test.ts, which must
// stay inside the subrepo so a standalone `git clone red-baron` still passes).
//
// Guarded here, per the story ACs:
//   - orchestrator .gitignore ignores red-baron/ (root-anchored, like battlezone/)
//   - .pennyfarthing/repos.yaml registers red-baron in the star-wars entry shape
//   - justfile lists red-baron in `games`, `subrepos`, and the `serve` recipe
//     CONSISTENTLY (fix the variables, not just the hardcoded trap block), and
//     does NOT regress the existing games out of those variables
//   - the lobby tile (lobby/src/core/registry.ts GAMES) gains a red RED BARON tile
//   - cloudflared/config.yml routes /red-baron/* → :5277 ahead of the lobby
//     catch-all, and NEVER to a sibling pin (5270/5273/5274/5275/5276)
//   - red-baron/.git exists with a develop branch (gitflow), no remote required
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

// The pinned port contract: red-baron owns 5277. Every other pin belongs to a
// live sibling (5270 lobby, 5273 tempest, 5274 star-wars, 5275 asteroids, 5276
// battlezone) and must NOT be reused for red-baron.
const RED_BARON_PORT = '5277';
const SIBLING_PORTS = ['5270', '5273', '5274', '5275', '5276'];

// Games expected to already be wired into the justfile vars — GREEN adds red-baron
// WITHOUT dropping any of these (regression guard).
const EXISTING_GAMES = ['tempest', 'star-wars', 'asteroids', 'battlezone'];

// --- helpers ---------------------------------------------------------------

// Extract a `just` recipe body by name (col-0 header, indented body). Copied
// from tests/canonical-serve.test.mjs so the suites read the justfile the same
// way. `:=` never appears in a recipe header, so it screens out variables.
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

test('AC: orchestrator .gitignore ignores the red-baron/ subrepo', () => {
  const gitignore = read('.gitignore');
  assert.match(
    gitignore,
    /^\/red-baron\/\s*$/m,
    'red-baron/ must be gitignored at the orchestrator, root-anchored and directory-only (like /battlezone/)',
  );
});

// --- AC: repos.yaml registration (star-wars entry shape) -------------------

test('AC: repos.yaml registers red-baron in the star-wars entry shape', () => {
  const block = repoBlock(read('.pennyfarthing/repos.yaml'), 'red-baron');
  assert.notEqual(block, null, 'red-baron must be registered under repos: in .pennyfarthing/repos.yaml');
  assert.match(block, /path:\s*red-baron/, 'repos.yaml red-baron entry needs path: red-baron');
  assert.match(block, /type:\s*ui/, 'repos.yaml red-baron entry needs type: ui');
  assert.match(block, /default_branch:\s*develop/, 'repos.yaml red-baron entry needs default_branch: develop');
  assert.match(block, /branch_strategy:\s*gitflow/, 'repos.yaml red-baron entry needs branch_strategy: gitflow');
  assert.match(block, /language:\s*typescript/, 'repos.yaml red-baron entry needs language: typescript');
  assert.match(block, /framework:\s*vite/, 'repos.yaml red-baron entry needs framework: vite');
  assert.match(block, /dev_command:/, 'repos.yaml red-baron entry needs a dev_command');
  assert.match(block, /build_command:/, 'repos.yaml red-baron entry needs a build_command');
  assert.match(block, /test_command:/, 'repos.yaml red-baron entry needs a test_command');
  // Port authority is vite.config strictPort + cloudflared, NOT repos.yaml.
  assert.doesNotMatch(block, /^\s*port:/m, 'repos.yaml red-baron entry must NOT carry a port key (matches the sibling shape)');
});

// --- AC: justfile wiring (consistent across vars AND serve, no regressions) --

test('AC: justfile `games` variable includes red-baron (and keeps the existing games)', () => {
  const justfile = read('justfile');
  const games = justfile.match(/^games\s*:=\s*"([^"]*)"/m);
  assert.notEqual(games, null, 'justfile must define a `games` list');
  assert.match(
    games[1],
    /\bred-baron\b/,
    'red-baron must be in the `games` variable (fix the variable, do not just hardcode it in serve)',
  );
  for (const g of EXISTING_GAMES) {
    assert.match(games[1], new RegExp(`\\b${g}\\b`), `\`games\` must not drop the existing game ${g} (regression guard)`);
  }
});

test('AC: justfile `subrepos` variable includes red-baron (and keeps the existing subrepos)', () => {
  const justfile = read('justfile');
  const subrepos = justfile.match(/^subrepos\s*:=\s*"([^"]*)"/m);
  assert.notEqual(subrepos, null, 'justfile must define a `subrepos` list');
  assert.match(subrepos[1], /\bred-baron\b/, 'red-baron must be in the `subrepos` variable (serve/install-all iterate it)');
  for (const g of ['lobby', ...EXISTING_GAMES]) {
    assert.match(subrepos[1], new RegExp(`\\b${g}\\b`), `\`subrepos\` must not drop ${g} (regression guard)`);
  }
});

test('AC: canonical `serve` recipe launches red-baron', () => {
  const body = recipeBody(read('justfile'), 'serve') ?? '';
  // Anchor to the actual launch invocation, not a bare `red-baron` mention — the
  // recipe also echoes a "red-baron → :5277" diagnostic line, so a bare match
  // would pass even if the `(cd .../red-baron && npm run dev)` launch were missing.
  assert.match(body, /\(cd \{\{root\}\}\/red-baron && npm run dev\) &/, 'the canonical serve recipe must LAUNCH red-baron (not just echo it)');
});

// --- AC: lobby tile --------------------------------------------------------

test('AC: lobby registry lists a red-baron tile launching /red-baron/', () => {
  const registry = read('lobby/src/core/registry.ts');
  const tile = lobbyTile(registry, 'red-baron');
  assert.notEqual(tile, null, "lobby GAMES must contain a { id: 'red-baron', ... } tile");
  assert.match(tile, /title:\s*['"]RED BARON['"]/, "red-baron tile needs title: 'RED BARON'");
  assert.match(tile, /launchUrl:\s*['"]https:\/\/red-baron\.slabgorb\.com\/['"]/, "red-baron tile must launch its subdomain");
});

test('AC: the red-baron tile is a red-family colour, distinct from the sibling tiles', () => {
  const registry = read('lobby/src/core/registry.ts');
  const tile = lobbyTile(registry, 'red-baron') ?? '';
  const m = tile.match(/color:\s*['"](#[0-9a-fA-F]{3,8})['"]/);
  assert.notEqual(m, null, 'red-baron tile must define a colour hex');
  const hex = m[1].toLowerCase();
  // Distinct from every existing tile colour.
  for (const taken of ['#00eaff', '#ffe81f', '#ff6a00', '#00ff41']) {
    assert.notEqual(hex, taken, `red-baron colour must differ from the existing tile colour ${taken}`);
  }
  // "Red Baron" → a red-dominant hue (faithful to the crimson Fokker).
  const { r, g, b } = hexToRgb(hex);
  assert.ok(r > g && r > b, `red-baron tile should be red-family (R dominant); got ${hex}`);
});

// --- AC: cloudflared ingress (/red-baron/* → :5277, ahead of lobby) ---------

test('AC: cloudflared routes /red-baron/* to :5277, ahead of the lobby catch-all', () => {
  const cf = read('cloudflared/config.yml');
  const rbIdx = cf.indexOf('^/red-baron');
  assert.notEqual(rbIdx, -1, 'cloudflared/config.yml must contain a path: ^/red-baron rule');

  // The rule's service must be the red-baron dev server on :5277, never a sibling.
  // Narrow to red-baron's OWN rule block (up to the next ingress rule) so the
  // sibling-port guard doesn't bleed into the adjacent lobby catch-all (:5270).
  const nextRuleRel = cf.slice(rbIdx).indexOf('- hostname:');
  const ruleBlock = nextRuleRel === -1 ? cf.slice(rbIdx) : cf.slice(rbIdx, rbIdx + nextRuleRel);
  assert.match(ruleBlock, new RegExp(`localhost:${RED_BARON_PORT}`), 'the /red-baron rule must proxy to localhost:5277');
  for (const sibling of SIBLING_PORTS) {
    assert.doesNotMatch(ruleBlock, new RegExp(sibling), `the /red-baron rule must NOT use the sibling port ${sibling}`);
  }

  // First-match, top-to-bottom: the per-game rule must precede the lobby catch-all
  // (the pathless rule pointing at :5270).
  const lobbyCatchAll = cf.indexOf('service: http://localhost:5270');
  assert.notEqual(lobbyCatchAll, -1, 'cloudflared/config.yml must retain the lobby catch-all (:5270)');
  assert.ok(rbIdx < lobbyCatchAll, 'the /red-baron rule must be ordered AHEAD of the lobby catch-all');
});

// --- AC: red-baron repo initialized with develop (gitflow) -----------------

test('AC: red-baron/.git exists with a develop branch (gitflow)', () => {
  assert.ok(existsSync(join(root, 'red-baron/.git')), 'red-baron/.git must exist (git init -b develop)');
  const branches = execFileSync('git', ['-C', join(root, 'red-baron'), 'branch', '--list', 'develop'], {
    encoding: 'utf8',
  });
  assert.match(branches, /develop/, 'red-baron repo must have a develop branch');
});
