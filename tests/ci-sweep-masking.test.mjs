// td1-10 — `just test-all`, `just build-all`, and therefore `just ci` must not
// swallow a game's failure.
//
// THE DEFECT (justfile as of 2026-07-20):
//   test-all:
//       @for g in {{games}}; do echo "==> $g"; (cd {{root}}/$g && npm test); done
//   build-all:
//       @for g in {{games}}; do echo "==> $g"; (cd {{root}}/$g && npm run build); done
//   ci: test-orchestrator test-all build-all
//       @echo "CI passed!"
// A `for` loop's exit status is its LAST iteration's. These bodies are a single
// `sh` line (just's default shell, NOT a bash-shebang recipe) with no `set -e` and
// no per-iteration status tracking, so every game's failure except the last (joust)
// is discarded. `games := "tempest star-wars asteroids battlezone red-baron
// centipede joust"`, so six of seven games can be fully red and `just ci` still
// prints "CI passed!" and exits 0. This is worse than td1-8's blast radius: td1-8
// makes a dev-loop launcher look healthy; this makes a CI GATE report success.
//
// WHY THESE TESTS ARE SHAPED THIS WAY  (same lesson td1-8 was rejected three times
// for missing, and the reason this whole td1 epic exists)
// A test that greps the justfile for `set -e`, or for the ABSENCE of a bare `for`,
// would pass the moment someone types the right string — whether or not the recipe
// actually reports a red game. So these tests EXERCISE THE SEAM THE OPERATOR RUNS:
// they invoke the REAL `just` binary on the REAL recipe bodies (extracted verbatim
// from this repo's justfile — never hand-pasted), rendered against a throwaway
// fixture tree whose "games" are stub dirs with a package.json whose `test`/`build`
// script exits with a code we choose. They assert on the recipe's real exit status
// and on what it prints — not on any string in the justfile.
//
// HARD CONSTRAINT honoured: the real recipes run `npm test`/`npm run build` in all
// seven REAL games (minutes long, and colliding with sibling checkouts). Nothing
// here touches {{games}} — every fixture is a fresh temp dir of stub games OUTSIDE
// this repo, so no test file joins the `node --test 'tests/**/*.test.mjs'` glob.
//
// ANTI-VACUITY CONTROL (verified during RED, mirroring td1-8):
//   • REAL recipe (today)        -> the position + naming + ci tests RED.
//   • a REFERENCE fix (track a per-iteration failure flag, name the failures,
//     exit non-zero if any)      -> every test GREEN.
//   • a STRAW-MAN that "passes" by always exiting 1 -> the all-green guard REDs.
// So these are not passable by typing the right string into the justfile, and a fix
// that always fails cannot pass either.
//
// HOW `ci` IS COVERED (not faked): `ci: test-orchestrator test-all build-all` runs
// its dependencies first; if one exits non-zero, `just` aborts and never runs the
// body — so "CI passed!" is never printed and the gate exits non-zero. The ci tests
// below assemble the REAL `ci`, `test-all`, and `build-all` recipe bodies into the
// fixture and drive `just ci`. The ONLY substitution is a stub `test-orchestrator`
// (exit 0): that recipe runs the orchestrator's own node suite, not the game sweep,
// so stubbing it isolates the game-masking + "CI passed!" guard that is this story's
// subject. Thus ci's correctness genuinely INHERITS from test-all/build-all
// propagating failure, and is exercised through the real dependency chain.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relPath) => readFileSync(join(root, relPath), 'utf8');

// Extract a FULL `just` recipe (header + indented body) by name. Same header rules
// as recipeBody() in canonical-serve.test.mjs / serve-launcher.test.mjs: a header
// sits at column 0 (`name:`, `name args:`, or `name: deps`); `:=` assignments are
// excluded; body lines are indented. Unlike recipeBody() this KEEPS the header line,
// because `ci`'s dependencies (`ci: test-orchestrator test-all build-all`) live there
// and must survive into the fixture.
function fullRecipe(justfile, name) {
  const lines = justfile.split('\n');
  const header = new RegExp(`^${name}(\\s|:)`);
  const isAssignment = /:=/;
  const start = lines.findIndex((l) => header.test(l) && !isAssignment.test(l));
  if (start === -1) return null;
  const out = [lines[start]];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') { out.push(line); continue; }
    if (!/^\s/.test(line)) break; // a non-indented line ends the recipe
    out.push(line);
  }
  return out.join('\n').replace(/\n+$/, '');
}

// `just` is this repo's build tool and the seam under test; without it there is no
// honest way to run these behaviours, so a missing binary is a loud failure (never a
// silent skip — a skipped guard is exactly the can't-fail check this epic kills).
const JUST = 'just';
const justAvailable = spawnSync(JUST, ['--version'], { encoding: 'utf8' }).status === 0;

// Stub games: each is a real dir with a package.json whose `test`/`build` scripts
// exit with the code we choose. A passing game exits 0; a red game exits non-zero,
// exactly like a real failing `npm test`/`npm run build` (npm propagates the code).
function makeStubGames(dir, games) {
  for (const g of games) {
    const gdir = join(dir, g.name);
    mkdirSync(gdir, { recursive: true });
    writeFileSync(
      join(gdir, 'package.json'),
      JSON.stringify({
        name: g.name,
        scripts: { test: `exit ${g.testCode ?? 0}`, build: `exit ${g.buildCode ?? 0}` },
      }),
    );
  }
}

// Assemble a fixture justfile from the REAL recipe bodies and run `just <recipe>`
// against stub games. `{{root}}`/`{{games}}` are resolved by `just` itself from the
// `root`/`games` assignments we prepend — the same substitution the real justfile
// does, not a hand-rolled string replace.
//
//   games:        [{ name, testCode?, buildCode? }]
//   recipeNames:  the recipes to extract into the fixture (deps first for `ci`)
//   overrides:    { name: "full recipe text" } used instead of extracting (stubs)
function runRecipe({ justfileText, recipe, recipeNames, games, overrides = {} }) {
  assert.ok(
    justAvailable,
    'the `just` binary is required to test its recipes (brew install just) — these tests exercise the real recipe through the real launcher, not the justfile text',
  );
  const dir = mkdtempSync(join(tmpdir(), 'td1-10-'));
  makeStubGames(dir, games);

  const parts = [`root := "${dir}"`, `games := "${games.map((g) => g.name).join(' ')}"`, ''];
  for (const name of recipeNames) {
    if (overrides[name] !== undefined) {
      parts.push(overrides[name], '');
      continue;
    }
    const r = fullRecipe(justfileText, name);
    assert.notEqual(r, null, `justfile must define a \`${name}\` recipe`);
    parts.push(r, '');
  }

  const jf = join(dir, 'fixture.just');
  writeFileSync(jf, parts.join('\n'));

  const res = spawnSync(JUST, ['--justfile', jf, '--working-directory', dir, recipe], {
    encoding: 'utf8',
    timeout: 60000,
  });
  return {
    status: res.status,
    signal: res.signal,
    combined: `${res.stdout ?? ''}${res.stderr ?? ''}`,
  };
}

// A game is "named as failed" only when its name shares a line with a failure word.
// This is the discriminator that keeps the naming assertion honest: the `==> $g`
// progress echo prints EVERY game's name (pass or fail), and `just`'s own recipe-
// level error line (`error: Recipe `test-all` failed ... exit code N`) names the
// recipe and the last code but no game — so neither satisfies this, and today's
// summary-less recipe reds it. A real fix prints e.g. "test-all FAILED: alpha".
const failLines = (out) => out.split('\n').filter((l) => /fail|✗/i.test(l));
const namedFailed = (out, name) => failLines(out).some((l) => new RegExp(`\\b${name}\\b`).test(l));

// Three stub games are enough to place a single failure first / middle / last.
const gamesWithFail = (position, code = 3) =>
  ['alpha', 'bravo', 'charlie'].map((name, i) => ({
    name,
    ...(i === position ? { testCode: code, buildCode: code } : {}),
  }));
const ALL_PASS = [{ name: 'alpha' }, { name: 'bravo' }, { name: 'charlie' }];

const TO = { timeout: 30000 };

// ---------------------------------------------------------------------------
// test-all — the CI-critical game test sweep
// ---------------------------------------------------------------------------

test('td1-10 AC1: `test-all` — a FIRST-position game failure makes the sweep exit non-zero', TO, () => {
  // The case the bug most obviously drops: SM proved first-position is masked, not
  // just middle. Today the loop's exit is joust's (the last game), so alpha's red
  // vanishes and the sweep returns 0.
  const r = runRecipe({ justfileText: read('justfile'), recipe: 'test-all', recipeNames: ['test-all'], games: gamesWithFail(0) });
  assert.equal(r.signal, null, `test-all must not be killed by a signal; got signal=${r.signal}`);
  assert.notEqual(
    r.status,
    0,
    `the first game failed, but \`just test-all\` returned 0 — the for-loop discarded every failure but the last. Output:\n${r.combined}`,
  );
});

test('td1-10 AC1: `test-all` — a MIDDLE-position game failure makes the sweep exit non-zero', TO, () => {
  const r = runRecipe({ justfileText: read('justfile'), recipe: 'test-all', recipeNames: ['test-all'], games: gamesWithFail(1) });
  assert.equal(r.signal, null);
  assert.notEqual(r.status, 0, `a middle game failed but \`just test-all\` returned 0 (masked). Output:\n${r.combined}`);
});

test('td1-10 AC1: `test-all` — a LAST-position game failure makes the sweep exit non-zero', TO, () => {
  // True today (only the last game's status survives), pinned so a fix cannot regress
  // the one position that currently works.
  const r = runRecipe({ justfileText: read('justfile'), recipe: 'test-all', recipeNames: ['test-all'], games: gamesWithFail(2) });
  assert.equal(r.signal, null);
  assert.notEqual(r.status, 0, `the last game failed and \`just test-all\` must exit non-zero. Output:\n${r.combined}`);
});

test('td1-10 AC3: `test-all` — an all-green sweep still exits 0', TO, () => {
  // Guards a "fix" that passes by always failing (the straw-man the RED control reds).
  const r = runRecipe({ justfileText: read('justfile'), recipe: 'test-all', recipeNames: ['test-all'], games: ALL_PASS });
  assert.equal(r.signal, null);
  assert.equal(r.status, 0, `every game passed, so \`just test-all\` must exit 0; got ${r.status}. Output:\n${r.combined}`);
});

test('td1-10 AC2: `test-all` — the sweep NAMES the game that failed, not just a bad exit code', TO, () => {
  const r = runRecipe({ justfileText: read('justfile'), recipe: 'test-all', recipeNames: ['test-all'], games: gamesWithFail(0) });
  assert.ok(
    namedFailed(r.combined, 'alpha'),
    `the sweep must name the failed game (e.g. "test-all FAILED: alpha"); today only \`just\`'s recipe-level error appears, naming no game. Output:\n${r.combined}`,
  );
  assert.ok(
    !namedFailed(r.combined, 'bravo'),
    `a passing game must not be reported as failed. Output:\n${r.combined}`,
  );
});

test('td1-10 AC2: `test-all` — MULTIPLE failures are ALL named, and a passing sibling is not', TO, () => {
  const games = [{ name: 'alpha', testCode: 3 }, { name: 'bravo' }, { name: 'charlie', testCode: 5 }];
  const r = runRecipe({ justfileText: read('justfile'), recipe: 'test-all', recipeNames: ['test-all'], games });
  assert.notEqual(r.status, 0, `two games failed; the sweep must exit non-zero. Output:\n${r.combined}`);
  assert.ok(namedFailed(r.combined, 'alpha'), `alpha failed and must be named. Output:\n${r.combined}`);
  assert.ok(namedFailed(r.combined, 'charlie'), `charlie failed and must be named. Output:\n${r.combined}`);
  assert.ok(!namedFailed(r.combined, 'bravo'), `bravo passed and must not be named as failed. Output:\n${r.combined}`);
});

// ---------------------------------------------------------------------------
// build-all — the same defect on `npm run build`. AC1 says EVERY multi-repo
// for-loop recipe must propagate failure, so build-all is proven for all three
// positions too.
// ---------------------------------------------------------------------------

test('td1-10 AC1: `build-all` — a FIRST-position build failure makes the sweep exit non-zero', TO, () => {
  const r = runRecipe({ justfileText: read('justfile'), recipe: 'build-all', recipeNames: ['build-all'], games: gamesWithFail(0) });
  assert.equal(r.signal, null);
  assert.notEqual(r.status, 0, `the first game's build failed but \`just build-all\` returned 0 (masked). Output:\n${r.combined}`);
});

test('td1-10 AC1: `build-all` — a MIDDLE-position build failure makes the sweep exit non-zero', TO, () => {
  const r = runRecipe({ justfileText: read('justfile'), recipe: 'build-all', recipeNames: ['build-all'], games: gamesWithFail(1) });
  assert.equal(r.signal, null);
  assert.notEqual(r.status, 0, `a middle game's build failed but \`just build-all\` returned 0 (masked). Output:\n${r.combined}`);
});

test('td1-10 AC1: `build-all` — a LAST-position build failure makes the sweep exit non-zero', TO, () => {
  const r = runRecipe({ justfileText: read('justfile'), recipe: 'build-all', recipeNames: ['build-all'], games: gamesWithFail(2) });
  assert.equal(r.signal, null);
  assert.notEqual(r.status, 0, `the last game's build failed and \`just build-all\` must exit non-zero. Output:\n${r.combined}`);
});

test('td1-10 AC3: `build-all` — an all-green sweep still exits 0', TO, () => {
  const r = runRecipe({ justfileText: read('justfile'), recipe: 'build-all', recipeNames: ['build-all'], games: ALL_PASS });
  assert.equal(r.signal, null);
  assert.equal(r.status, 0, `every build passed, so \`just build-all\` must exit 0; got ${r.status}. Output:\n${r.combined}`);
});

test('td1-10 AC2: `build-all` — the sweep NAMES the game whose build failed', TO, () => {
  const r = runRecipe({ justfileText: read('justfile'), recipe: 'build-all', recipeNames: ['build-all'], games: gamesWithFail(0) });
  assert.ok(namedFailed(r.combined, 'alpha'), `build-all must name the failed game. Output:\n${r.combined}`);
  assert.ok(!namedFailed(r.combined, 'bravo'), `a passing game must not be reported as failed. Output:\n${r.combined}`);
});

test('td1-10 AC2: `build-all` — MULTIPLE build failures are ALL named, and a passing sibling is not', TO, () => {
  // Mirror of the test-all multiple-failure test — build-all's all-named property must
  // be proven directly, not only transitively through test-all. It pins the summary as
  // ACCUMULATING failures (`failed="$failed $g"`) rather than OVERWRITING (`failed="$g"`):
  // under an overwrite regression only the LAST failing game (charlie) would survive the
  // summary and the alpha assertion below would red. alpha (first) and charlie (last)
  // fail their build; bravo (middle) passes.
  const games = [{ name: 'alpha', buildCode: 3 }, { name: 'bravo' }, { name: 'charlie', buildCode: 5 }];
  const r = runRecipe({ justfileText: read('justfile'), recipe: 'build-all', recipeNames: ['build-all'], games });
  assert.notEqual(r.status, 0, `two builds failed; the sweep must exit non-zero. Output:\n${r.combined}`);
  assert.ok(namedFailed(r.combined, 'alpha'), `alpha's build failed and must be named. Output:\n${r.combined}`);
  assert.ok(namedFailed(r.combined, 'charlie'), `charlie's build failed and must be named. Output:\n${r.combined}`);
  assert.ok(!namedFailed(r.combined, 'bravo'), `bravo's build passed and must not be named as failed. Output:\n${r.combined}`);
});

// ---------------------------------------------------------------------------
// ci — the gate that must not lie. Exercised through the REAL dependency chain
// (`ci: test-orchestrator test-all build-all`) with only test-orchestrator stubbed;
// see the header note for why that is isolation, not fakery.
// ---------------------------------------------------------------------------

const CI_RECIPES = ['test-orchestrator', 'test-all', 'build-all', 'ci'];
// test-orchestrator runs the orchestrator's OWN node suite, not the game sweep; a
// no-op stub isolates the game-masking + "CI passed!" guard under test.
const CI_OVERRIDES = { 'test-orchestrator': 'test-orchestrator:\n    @exit 0' };

test('td1-10 AC2: `ci` cannot print "CI passed!" — a red game exits non-zero and suppresses the banner', TO, () => {
  // First game's test fails; today test-all masks it, so `ci` proceeds through
  // build-all and prints "CI passed!" — the exact defect. A fixed test-all exits
  // non-zero, `just` aborts the dependency chain, and the body never runs.
  const r = runRecipe({
    justfileText: read('justfile'),
    recipe: 'ci',
    recipeNames: CI_RECIPES,
    games: gamesWithFail(0),
    overrides: CI_OVERRIDES,
  });
  assert.equal(r.signal, null);
  assert.notEqual(r.status, 0, `a game is red, so \`just ci\` must exit non-zero. Output:\n${r.combined}`);
  assert.doesNotMatch(
    r.combined,
    /CI passed/i,
    `\`just ci\` printed "CI passed!" while a game was red — the gate reports success on a broken fleet. Output:\n${r.combined}`,
  );
});

test('td1-10 AC3: `ci` still passes when the whole fleet is green', TO, () => {
  // Guards a fix that suppresses "CI passed!" unconditionally.
  const r = runRecipe({
    justfileText: read('justfile'),
    recipe: 'ci',
    recipeNames: CI_RECIPES,
    games: ALL_PASS,
    overrides: CI_OVERRIDES,
  });
  assert.equal(r.signal, null);
  assert.equal(r.status, 0, `the whole fleet is green, so \`just ci\` must exit 0; got ${r.status}. Output:\n${r.combined}`);
  assert.match(r.combined, /CI passed/i, `an all-green ci must still announce success. Output:\n${r.combined}`);
});
