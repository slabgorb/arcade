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
//   - cloudflared/config.yml routes /red-baron/* → :5277 ahead of the lobby
//     catch-all, and NEVER to a sibling pin (5270/5273/5274/5275/5276)
//   - red-baron/.git exists with a develop branch (gitflow), no remote required
//
// RED until GREEN lands the wiring. Run from the orchestrator root:
//   npm test   (→ node --test 'tests/**/*.test.mjs')
//
// ===========================================================================
// MONOREPO MIGRATION (Task 10 — red-baron imported as plugins/red-baron)
// ===========================================================================
//
// TWO assertions were REMOVED here, both false BY DESIGN once red-baron stopped
// being a gitignored sibling subrepo. Quoted by their exact old titles:
//
//   * `AC: orchestrator .gitignore ignores the red-baron/ subrepo`
//     It matched the root .gitignore against /^\/red-baron\/\s*$/m. The import
//     deletes that line — the tree is tracked in this repo now, so ignoring it
//     would erase the game. Nothing survives to re-home.
//
//   * `AC: red-baron/.git exists with a develop branch (gitflow)`
//     It asserted existsSync('red-baron/.git') and that the repo carried a
//     `develop` branch. red-baron has no repo, no remote and no develop branch
//     any more; its pre-monorepo history is PARKED at
//     .migration-backup/red-baron.git, which .gitignore itself declares
//     transient ("safe to remove once every game is imported"). A deliberately
//     temporary backup is not an invariant, so this is NOT re-created anywhere —
//     specifically NOT in tests/monorepo-topology.test.mjs, whose header reserves
//     the games' share for Task 12b.
//
// The file is NOT deleted. Five assertions below still pass and still guard LIVE
// orchestrator config that this task does not touch. Their owners, so the tasks
// that retire them can find them:
//
//   TASK 22 (rewrites .pennyfarthing/repos.yaml)
//     - `AC: repos.yaml registers red-baron in the star-wars entry shape`
//       NOTE: still GREEN but already STALE — it asserts `path: red-baron`,
//       which is now wrong on disk (plugins/red-baron). It reads the YAML, not
//       the filesystem, so it cannot tell. Fix both together.
//
//   TASK 19 (one dev server — collapses the eight pinned ports, scripts/serve.mjs
//            and the cloudflared routing)
//     - `AC: justfile \`games\` variable includes red-baron (and keeps the existing games)`
//     - `AC: justfile \`subrepos\` variable includes red-baron (and keeps the existing subrepos)`
//     - `AC: canonical \`serve\` launches red-baron`
//       (imports jobsFor from ../scripts/serve.mjs, which Task 19 deletes, and
//       asserts cwd === <root>/red-baron — stale for the same reason as above)
//     - `AC: cloudflared routes /red-baron/* to :5277, ahead of the lobby catch-all`
//
// Ruling (PLAN DEFECT #14): each import task retires its OWN game's bootstrap
// assertions as it lands. centipede- and joust-bootstrap.test.mjs carry the
// identical pair and are Tasks 11-13's to retire the same way.
//
// ===========================================================================
// TASK 19 (one dev server, one port) — RETIRED, as the ledger above routes it
// ===========================================================================
// //   - `AC: justfile \`subrepos\` variable includes red-baron (and keeps the existing subrepos)`  DELETED
//   - `AC: canonical \`serve\` launches red-baron`  DELETED
//   - `AC: cloudflared routes /red-baron/* to :5277, ahead of the lobby catch-all`  DELETED
//
// Why each is gone rather than re-homed:
//
//   · `subrepos` is not a variable that changed value — it is a CONCEPT that
//     stopped existing. Eight gitignored sibling checkouts are one repo; there
//     is no per-subrepo install, test or build to iterate. `games` survives as
//     the seven plugin directory names and is still asserted here; recipes that
//     mean "every app" spell it `{{{{games}}}} lobby`.
//
//   · the `serve` assertion read scripts/serve.mjs's spawn table, and Task 19
//     deletes that supervisor along with the eight-server fleet it existed to
//     launch, watch and tear down. It was already stale in exactly the way this
//     header warned — it asserted a cwd of `<root>/red-baron`, a directory that
//     stopped existing at the import — and no per-game successor is possible,
//     because there is one dev server on one port. Its two halves survive
//     cabinet-wide, not per game: the pin is PROVEN behaviourally by `strictPort
//     is real, not just declared` (tests/monorepo-topology.test.mjs), and what
//     the one server actually serves is pinned by `the dev server serves the
//     LOBBY at every path` (tests/canonical-serve.test.mjs).
//
//   · the per-game pinned PORT (5277) goes with them. Its nearest successor is
//     base-path uniqueness — `/red-baron/` — asserted for all seven in
//     tests/monorepo-topology.test.mjs.
//
//   · the cloudflared ingress rule routed a public Host header at the per-game
//     dev port it no longer has. The tunnel is retired (production is static R2;
//     `cloudflared/` is kept only as history) and vite.config.ts pins the dev
//     server to 127.0.0.1, so no external hostname can reach it at all. The rule
//     it asserted cannot be satisfied and must not be restored.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relPath) => readFileSync(join(root, relPath), 'utf8');


// Games expected to already be wired into the justfile vars — GREEN adds red-baron
// WITHOUT dropping any of these (regression guard).
const EXISTING_GAMES = ['tempest', 'star-wars', 'asteroids', 'battlezone'];

// --- helpers ---------------------------------------------------------------

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

// --- AC: cloudflared ingress (/red-baron/* → :5277, ahead of lobby) ---------

