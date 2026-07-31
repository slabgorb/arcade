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
//   - .pennyfarthing/repos.yaml registers battlezone in the star-wars entry shape
//   - justfile lists battlezone in `games`, `subrepos`, and the `serve` recipe
//     CONSISTENTLY — Dev must fix the variables, not just the hardcoded trap block
//     (star-wars is currently wired only in the trap — see Delivery Findings)
//   - cloudflared/config.yml routes /battlezone/* → :5276 ahead of the lobby
//     catch-all, and NEVER to 5275 (the pin bz1 lost to asteroids/epic A)
//
// RED until GREEN lands the wiring. Run from the orchestrator root:
//   npm test   (→ node --test 'tests/**/*.test.mjs')
//
// ===========================================================================
// MONOREPO MIGRATION (Task 9 — battlezone imported as plugins/battlezone)
// ===========================================================================
//
// TWO assertions were REMOVED here, both false BY DESIGN once battlezone stopped
// being a gitignored sibling subrepo. Quoted by their exact old titles:
//
//   * `AC: orchestrator .gitignore ignores the battlezone/ subrepo`
//     It matched the root .gitignore against /^\/battlezone\/\s*$/m. The import
//     deletes that line — the tree is tracked in this repo now, so ignoring it
//     would erase the game. Nothing survives to re-home.
//
//   * `AC: battlezone/.git exists with a develop branch (gitflow)`
//     It asserted existsSync('battlezone/.git') and that the repo carried a
//     `develop` branch. battlezone has no repo, no remote and no develop branch
//     any more; its pre-monorepo history is PARKED at
//     .migration-backup/battlezone.git, which .gitignore itself declares
//     transient ("safe to remove once every game is imported"). A deliberately
//     temporary backup is not an invariant, so this is NOT re-created anywhere —
//     specifically NOT in tests/monorepo-topology.test.mjs, whose header reserves
//     the games' share for Task 12b.
//
// The file is NOT deleted. Six assertions below still pass and still guard LIVE
// orchestrator config that this task does not touch. Their owners, so the tasks
// that retire them can find them:
//
//   TASK 22 (rewrites .pennyfarthing/repos.yaml)
//     - `AC: repos.yaml registers battlezone in the star-wars entry shape`
//       NOTE: still GREEN but already STALE — it asserts `path: battlezone`,
//       which is now wrong on disk (plugins/battlezone). It reads the YAML, not
//       the filesystem, so it cannot tell. Fix both together.
//
//   TASK 19 (one dev server — collapses the eight pinned ports, scripts/serve.mjs
//            and the cloudflared routing)
//     - `AC: justfile \`games\` variable includes battlezone`
//     - `AC: justfile \`subrepos\` variable includes battlezone`
//     - `AC: canonical \`serve\` launches battlezone`
//       (imports jobsFor from ../scripts/serve.mjs, which Task 19 deletes, and
//       asserts cwd === <root>/battlezone — stale for the same reason as above)
//     - `reconcile (SM decision #1): justfile \`games\`/\`subrepos\` also backfill star-wars`
//     - `AC: cloudflared routes /battlezone/* to :5276, ahead of the lobby catch-all`
//
// Ruling (PLAN DEFECT #14): each import task retires its OWN game's bootstrap
// assertions as it lands. centipede-, joust- and red-baron-bootstrap.test.mjs
// carry the identical pair and are Tasks 10-13's to retire the same way.
//
// ===========================================================================
// TASK 19 (one dev server, one port) — RETIRED, as the ledger above routes it
// ===========================================================================
// //   - `AC: justfile \`subrepos\` variable includes battlezone`  DELETED
//   - `AC: canonical \`serve\` launches battlezone`  DELETED
//   - `AC: cloudflared routes /battlezone/* to :5276, ahead of the lobby catch-all`  DELETED
//   - `reconcile (SM decision #1): justfile \`games\`/\`subrepos\` also backfill star-wars`
//     KEPT and renamed to `... justfile \`games\` also backfills star-wars`; its subject
//     (star-wars must not be silently skipped by the fleet list) is unchanged.
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
//     header warned — it asserted a cwd of `<root>/battlezone`, a directory that
//     stopped existing at the import — and no per-game successor is possible,
//     because there is one dev server on one port. Its two halves survive
//     cabinet-wide, not per game: the pin is PROVEN behaviourally by `strictPort
//     is real, not just declared` (tests/monorepo-topology.test.mjs), and what
//     the one server actually serves is pinned by `the dev server serves the
//     LOBBY at every path` (tests/canonical-serve.test.mjs).
//
//   · the per-game pinned PORT (5276) goes with them. Its nearest successor is
//     base-path uniqueness — `/battlezone/` — asserted for all seven in
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

// The `subrepos` half went with the `subrepos` variable (Task 19); `games` is the
// whole fleet list now, and this test's subject — that star-wars is IN it, not
// silently skipped — is unchanged.
test('reconcile (SM decision #1): justfile `games` also backfills star-wars', () => {
  // star-wars was wired only in the hardcoded serve trap — `games := "tempest"`
  // silently skipped it, so build-all/test-all never touched star-wars. AC6 says
  // battlezone must be "reconciled with however star-wars is wired": the SM ruled
  // we backfill star-wars into the vars in passing, not copy the drift forward.
  const games = read('justfile').match(/^games\s*:=\s*"([^"]*)"/m);
  assert.notEqual(games, null, 'justfile must define a `games` list');
  assert.match(games[1], /\bstar-wars\b/, 'backfill star-wars into `games` (build-all/test-all iterate it)');
});

// --- AC: cloudflared ingress (/battlezone/* → :5276, ahead of lobby) --------

