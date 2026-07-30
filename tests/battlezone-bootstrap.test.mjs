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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
// td1-8 moved the fleet launch out of the justfile `serve` recipe into this module;
// the "serve launches battlezone" assertion below now reads the real spawn spec.
import { jobsFor } from '../scripts/serve.mjs';

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

// RE-AIMED BY td1-8 (2026-07-20). Same intent, still this story's guard; only the
// evidence moved. It used to match `/battlezone/` against the justfile `serve` recipe
// body. td1-8 moved the fleet launch out of that recipe into scripts/serve.mjs (the
// recipe's bare `wait` returned 0 with a server dead, so the launch had to become
// testable). The launch is now the spawn spec jobsFor() produces.
//
// Note the original was the WEAK form its red-baron sibling explicitly warned about —
// a bare `/battlezone/` mention would have passed even if the launch were missing.
// Re-aiming fixes that: this asserts the real spawn spec, not a mention.
test('AC: canonical `serve` launches battlezone', () => {
  const job = jobsFor('/ARCADE').find((j) => j.name === 'battlezone');
  assert.ok(job, 'battlezone must be in the fleet scripts/serve.mjs launches (SERVERS)');
  assert.equal(job.command, 'npm', 'battlezone must be LAUNCHED alongside lobby/tempest/star-wars');
  assert.deepEqual(job.args, ['run', 'dev']);
  assert.equal(job.cwd, join('/ARCADE', 'battlezone'), 'battlezone must be launched from its own subrepo directory');

  const body = recipeBody(read('justfile'), 'serve') ?? '';
  assert.match(body, /serve\.mjs/, 'the canonical `serve` recipe must invoke scripts/serve.mjs, which launches the fleet');
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
