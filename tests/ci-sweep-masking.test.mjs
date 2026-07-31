// td1-10 — `just test-all`, `just build-all`, and therefore `just ci` must not
// swallow a game's failure. (Task 19 added `just serve`, on the same principle
// and through the same harness: a just recipe must carry its command's exit
// status out to the caller. See the `serve` block near the bottom.)
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
//
// ===========================================================================
// REWRITTEN BY TASK 19 (one dev server, one port) — the sweeps changed shape
// ===========================================================================
// The defect above was a PROPERTY OF A LOOP, so where the loop went, the tests
// had to follow. Both sweeps used to iterate eight subrepo directories running
// `npm test` / `npm run build` in each.
//
//   · `test-all` is now ONE process — `npx vitest run` across every project. One
//     process has one exit status; there is no per-iteration status left to
//     discard. The six position/naming tests are therefore GONE, quoted here by
//     exact old title so the removal is auditable, not silent:
//       - `td1-10 AC1: \`test-all\` — a FIRST-position game failure makes the sweep exit non-zero`
//       - `td1-10 AC1: \`test-all\` — a MIDDLE-position game failure makes the sweep exit non-zero`
//       - `td1-10 AC1: \`test-all\` — a LAST-position game failure makes the sweep exit non-zero`
//       - `td1-10 AC3: \`test-all\` — an all-green sweep still exits 0`
//       - `td1-10 AC2: \`test-all\` — the sweep NAMES the game that failed, not just a bad exit code`
//       - `td1-10 AC2: \`test-all\` — MULTIPLE failures are ALL named, and a passing sibling is not`
//     They are replaced by two tests of what the recipe must still do — carry the
//     runner's exit status out to the caller — driven through a PATH-shimmed
//     `npx` that exits with a code we choose. That is not a downgrade to a text
//     assertion: the real recipe body still runs under the real `just`.
//
//   · `build-all` is STILL A LOOP, and deliberately so — one build per app is the
//     point ("one origin does not mean one build") — so all six of its tests
//     survive intact. Only the fixture moved: the stub is now a fake
//     `scripts/build-app.mjs` (the one builder the recipe invokes) instead of a
//     stub package.json per subrepo, because that is what the recipe calls now.
//     It gained one assertion it could not make before: build-all must build the
//     LOBBY too, which the old per-game loop never did.
//
//   · `ci` is exercised through MORE of the real chain than before. It used to
//     stub test-orchestrator and drive a red *game*; now test-all and build-all
//     both run for real against the shims, and only test-orchestrator (which runs
//     this very suite) is stubbed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync } from 'node:fs';
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

// Stub builder: a fake `{{root}}/scripts/build-app.mjs`, which is what `build-all`
// invokes for every app. It exits with the code chosen for the id it is handed
// (0 for anything unlisted — notably `lobby`, which build-all appends), exactly
// like a real failing build, and appends the id to a log so a test can assert
// WHICH apps were built and not merely that the sweep exited non-zero.
const BUILT_LOG = 'built.log';
function makeStubBuilder(dir, games) {
  const codes = Object.fromEntries(games.map((g) => [g.name, g.buildCode ?? 0]));
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  writeFileSync(
    join(dir, 'scripts', 'build-app.mjs'),
    `import { appendFileSync } from 'node:fs';\n` +
      `const codes = ${JSON.stringify(codes)};\n` +
      `const id = process.argv[2];\n` +
      `appendFileSync(${JSON.stringify(join(dir, BUILT_LOG))}, id + '\\n');\n` +
      `process.exit(codes[id] ?? 0);\n`,
  );
}

// PATH shim for `npx`, which is what `test-all` invokes. `test-all` is one process
// now, so what has to be proven is that its exit status reaches the caller — and
// that cannot be proven by running the real vitest, which would take minutes and
// be green by construction. The shim exits with the code we choose and records its
// argv, so a test can also assert WHAT was run (`vitest run`, unfiltered).
function makeNpxShim(dir, exitCode) {
  const bin = join(dir, 'bin');
  mkdirSync(bin, { recursive: true });
  const log = join(dir, 'npx.log');
  writeFileSync(
    join(bin, 'npx'),
    `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> ${JSON.stringify(log)}\nexit ${exitCode}\n`,
    { mode: 0o755 },
  );
  return { bin, log };
}

// Assemble a fixture justfile from the REAL recipe bodies and run `just <recipe>`
// against stub games. `{{root}}`/`{{games}}` are resolved by `just` itself from the
// `root`/`games` assignments we prepend — the same substitution the real justfile
// does, not a hand-rolled string replace.
//
//   games:        [{ name, testCode?, buildCode? }]
//   recipeNames:  the recipes to extract into the fixture (deps first for `ci`)
//   overrides:    { name: "full recipe text" } used instead of extracting (stubs)
function runRecipe({ justfileText, recipe, recipeNames, games, overrides = {}, npxExit = 0 }) {
  assert.ok(
    justAvailable,
    'the `just` binary is required to test its recipes (brew install just) — these tests exercise the real recipe through the real launcher, not the justfile text',
  );
  const dir = mkdtempSync(join(tmpdir(), 'td1-10-'));
  makeStubBuilder(dir, games);
  const npx = makeNpxShim(dir, npxExit);

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

  // `recipe` may carry arguments (`test-one tempest`); `just` takes them as
  // separate argv entries, not one string.
  const invocation = recipe.trim().split(/\s+/);
  const res = spawnSync(JUST, ['--justfile', jf, '--working-directory', dir, ...invocation], {
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, PATH: `${npx.bin}:${process.env.PATH}` },
  });
  const readLog = (file) => {
    const path = join(dir, file);
    return existsSync(path) ? readFileSync(path, 'utf8').trim().split('\n').filter(Boolean) : [];
  };
  return {
    status: res.status,
    signal: res.signal,
    combined: `${res.stdout ?? ''}${res.stderr ?? ''}`,
    built: readLog(BUILT_LOG),
    npxCalls: readLog('npx.log'),
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
// test-all — ONE process across every project. The masking property is gone with
// the loop, so what is proven here is what remains provable and load-bearing:
// the runner's exit status reaches the caller, and the run is not silently
// narrowed. Both drive the REAL recipe body under the REAL `just`, against a
// PATH-shimmed `npx`.
// ---------------------------------------------------------------------------

test('td1-10 AC1 (successor): `test-all` carries a failing run out to the caller', TO, () => {
  const r = runRecipe({
    justfileText: read('justfile'),
    recipe: 'test-all',
    recipeNames: ['test-all'],
    games: ALL_PASS,
    npxExit: 3,
  });
  assert.equal(r.signal, null, `test-all must not be killed by a signal; got signal=${r.signal}`);
  assert.notEqual(
    r.status,
    0,
    `the test run exited 3 but \`just test-all\` returned 0 — the fleet gate is swallowing its runner's status. Output:\n${r.combined}`,
  );
  // Anti-vacuity: a recipe that ran NOTHING would also fail to be green, and would
  // pass the assertion above for the wrong reason.
  assert.deepEqual(
    r.npxCalls,
    ['vitest run'],
    `test-all must invoke the runner exactly once, across every project. Calls: ${JSON.stringify(r.npxCalls)}`,
  );
});

test('td1-10 AC3 (successor): `test-all` exits 0 on a green run', TO, () => {
  // Guards a "fix" that passes by always failing (the straw-man the RED control reds).
  const r = runRecipe({
    justfileText: read('justfile'),
    recipe: 'test-all',
    recipeNames: ['test-all'],
    games: ALL_PASS,
    npxExit: 0,
  });
  assert.equal(r.signal, null);
  assert.equal(r.status, 0, `the run passed, so \`just test-all\` must exit 0; got ${r.status}. Output:\n${r.combined}`);
});

test('`test-all` is the WHOLE cabinet — `test-one` is the narrowed one', TO, () => {
  // The gate must not quietly become one project's suite. `--project` narrows the
  // run; a `test-all` that grew one would go green having skipped seven apps, and
  // the exit-status tests above cannot see that. `--passWithNoTests` is the other
  // half: it makes a config that matches no test file report success.
  const all = runRecipe({
    justfileText: read('justfile'),
    recipe: 'test-all',
    recipeNames: ['test-all'],
    games: ALL_PASS,
  });
  assert.ok(
    !all.npxCalls.some((c) => /--project|--passWithNoTests/.test(c)),
    `test-all must run every project and must not pass --passWithNoTests. Calls: ${JSON.stringify(all.npxCalls)}`,
  );

  // …and the narrowing really is available, or the assertion above just describes
  // a capability nobody has.
  const one = runRecipe({
    justfileText: read('justfile'),
    recipe: 'test-one tempest',
    recipeNames: ['test-one'],
    games: ALL_PASS,
  });
  assert.deepEqual(
    one.npxCalls,
    ['vitest run --project tempest'],
    `test-one must run exactly the named project. Calls: ${JSON.stringify(one.npxCalls)}`,
  );
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

test('`build-all` builds the LOBBY as well as the seven games — and FIRST', TO, () => {
  // NEW with Task 19, and it could not have been asked before: the old recipe
  // looped `{{games}}` only, so the lobby — the arcade's front door, and the one
  // app whose outDir is the parent of every other's — was never in the sweep. A
  // regression to `for g in {{games}}` would still exit 0 on a green fleet, so no
  // exit-status test can see it; only the log of what was actually built can.
  //
  // THE ORDER IS PART OF THE ASSERTION, and it is not tidiness. The lobby's outDir
  // is dist/, the parent of every game's dist/<id>/, so its clean step is the only
  // one that can reach another app's output. cleanLobbyOutput exists to stop that;
  // building the lobby first is the independent second defence for the day it
  // regresses, because a game's own `emptyOutDir: true` clears only its own
  // subdirectory. MEASURED by replacing cleanLobbyOutput with `rmSync(distDir)` —
  // the exact emptyOutDir: true behaviour Task 16 found deleting all seven games —
  // and running both orders: lobby LAST leaves 0 of 7 games, lobby FIRST leaves 7.
  const r = runRecipe({
    justfileText: read('justfile'),
    recipe: 'build-all',
    recipeNames: ['build-all'],
    games: ALL_PASS,
  });
  assert.equal(r.status, 0, `an all-green build-all must exit 0. Output:\n${r.combined}`);
  assert.deepEqual(
    r.built,
    ['lobby', 'alpha', 'bravo', 'charlie'],
    `build-all must build every game AND the lobby, once each, with the LOBBY FIRST — a lobby-last ` +
      `sweep loses all seven games to any regression in cleanLobbyOutput (measured: 0 of 7 survive). ` +
      `\`just deploy\` builds it first too; the two must not drift. Built: ${JSON.stringify(r.built)}`,
  );
});

// ---------------------------------------------------------------------------
// serve — a dev server that fails to start must NOT read as success
// ---------------------------------------------------------------------------
// RESTORED HERE. These are the successors to two guards retired with
// tests/serve-launcher.test.mjs, quoted by exact old title:
//
//   - `td1-8: the serve recipe exits 0 when the launcher shut down healthy`
//   - `td1-8: the serve recipe exit code DISTINGUISHES a dead server from a
//      healthy fleet`
//
// The FLEET they described is gone — one dev server, no supervisor, nothing left
// to be half-dead. The INVARIANT is not: `just serve` must still carry the dev
// server's exit status out to the caller. td1-8 exists because that recipe once
// swallowed it two different ways (a bare `wait` that returned 0 with a server
// dead, then a `trap … EXIT` whose `kill 0` made every run die of signal 15), and
// both times the recipe reported success while the arcade was not being served.
//
// Nothing else asserts this any more. tests/canonical-serve.test.mjs TEXT-MATCHES
// the recipe body, and its behavioural test spawns `node_modules/.bin/vite`
// directly — bypassing the recipe entirely. So `serve: @npx vite || true`, a
// backgrounded `@npx vite &`, or a re-added preflight line that dies before vite
// starts would pass every one of those assertions. These two catch all three.

test('td1-8 (successor): `serve` carries a failed dev server out to the caller', TO, () => {
  const r = runRecipe({
    justfileText: read('justfile'),
    recipe: 'serve',
    recipeNames: ['serve'],
    games: ALL_PASS,
    npxExit: 7,
  });
  assert.equal(r.signal, null, `serve must not die of a signal; got signal=${r.signal}`);
  assert.equal(
    r.status,
    7,
    `the dev server exited 7, but \`just serve\` returned ${r.status} — a server that fails to start ` +
      `must not read as success. A trailing \`|| true\`, a backgrounded \`&\`, or a \`trap … EXIT\` ` +
      `whose \`kill 0\` signals the recipe's own shell all do this. Output:\n${r.combined}`,
  );
  // Anti-vacuity: it must have exited 7 BECAUSE the dev server did, not because
  // the recipe fell over earlier (a missing script, a bad preflight). A recipe
  // that never reached vite would satisfy the status assertion for free.
  assert.deepEqual(
    r.npxCalls,
    ['vite'],
    `serve must actually launch the dev server exactly once; it ran ${JSON.stringify(r.npxCalls)}`,
  );
});

test('td1-8 (successor): `serve` exits 0 when the dev server shut down healthy', TO, () => {
  // The other half, and the reason the first is not satisfiable by a recipe that
  // simply always fails — Ctrl-C on a healthy server must not look like a crash.
  const r = runRecipe({
    justfileText: read('justfile'),
    recipe: 'serve',
    recipeNames: ['serve'],
    games: ALL_PASS,
    npxExit: 0,
  });
  assert.equal(r.signal, null);
  assert.equal(r.status, 0, `a healthy shutdown must exit 0; got ${r.status}. Output:\n${r.combined}`);
  assert.deepEqual(r.npxCalls, ['vite'], `serve must launch the dev server; it ran ${JSON.stringify(r.npxCalls)}`);
});

// ---------------------------------------------------------------------------
// ci — the gate that must not lie. Exercised through the REAL dependency chain
// (`ci: test-orchestrator test-all build-all`) with only test-orchestrator stubbed;
// see the header note for why that is isolation, not fakery.
// ---------------------------------------------------------------------------

const CI_RECIPES = ['test-orchestrator', 'test-all', 'build-all', 'ci'];
// test-orchestrator runs the orchestrator's OWN node suite — THIS suite — not the
// cabinet sweep; a no-op stub isolates the guard under test and avoids recursion.
// test-all and build-all are the REAL recipes, driven by the shims.
const CI_OVERRIDES = { 'test-orchestrator': 'test-orchestrator:\n    @exit 0' };

test('td1-10 AC2: `ci` cannot print "CI passed!" when the test sweep is red', TO, () => {
  // The unit tests fail. `ci`'s dependency chain must abort at test-all, so
  // build-all never runs and the body — the "CI passed!" banner — never executes.
  const r = runRecipe({
    justfileText: read('justfile'),
    recipe: 'ci',
    recipeNames: CI_RECIPES,
    games: ALL_PASS,
    overrides: CI_OVERRIDES,
    npxExit: 3,
  });
  assert.equal(r.signal, null);
  assert.notEqual(r.status, 0, `the suite is red, so \`just ci\` must exit non-zero. Output:\n${r.combined}`);
  assert.doesNotMatch(
    r.combined,
    /CI passed/i,
    `\`just ci\` printed "CI passed!" while the suite was red — the gate reports success on a broken cabinet. Output:\n${r.combined}`,
  );
  assert.deepEqual(r.built, [], `ci must abort before build-all when the suite is red. Built: ${JSON.stringify(r.built)}`);
});

test('td1-10 AC2: `ci` cannot print "CI passed!" when one app fails to BUILD', TO, () => {
  // The other half of the chain, and the one that still runs through a loop: the
  // suite is green, alpha's build is red. build-all must accumulate that failure
  // rather than let the last iteration's status speak for all of them.
  const r = runRecipe({
    justfileText: read('justfile'),
    recipe: 'ci',
    recipeNames: CI_RECIPES,
    games: gamesWithFail(0),
    overrides: CI_OVERRIDES,
    npxExit: 0,
  });
  assert.equal(r.signal, null);
  assert.notEqual(r.status, 0, `an app failed to build, so \`just ci\` must exit non-zero. Output:\n${r.combined}`);
  assert.doesNotMatch(
    r.combined,
    /CI passed/i,
    `\`just ci\` printed "CI passed!" while an app's build was red. Output:\n${r.combined}`,
  );
  assert.ok(namedFailed(r.combined, 'alpha'), `ci must name the app that failed to build. Output:\n${r.combined}`);
});

test('td1-10 AC3: `ci` still passes when the whole cabinet is green', TO, () => {
  // Guards a fix that suppresses "CI passed!" unconditionally.
  const r = runRecipe({
    justfileText: read('justfile'),
    recipe: 'ci',
    recipeNames: CI_RECIPES,
    games: ALL_PASS,
    overrides: CI_OVERRIDES,
    npxExit: 0,
  });
  assert.equal(r.signal, null);
  assert.equal(r.status, 0, `the whole cabinet is green, so \`just ci\` must exit 0; got ${r.status}. Output:\n${r.combined}`);
  assert.match(r.combined, /CI passed/i, `an all-green ci must still announce success. Output:\n${r.combined}`);
});
