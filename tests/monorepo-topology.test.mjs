// The cabinet-wide wiring invariants. These were asserted eight times over — once
// per app's own `tests/scaffold.test.ts` (plus the per-game extraction/adoption
// suites) — back when every app was its own repo with its own vite config, port,
// scripts, lockfile, CI caller and `@arcade/shared` git pin. The collapse to a
// single root `vite.config.ts` factory, a single `package.json` and a single
// `src/shared` makes every one of them singular — and the codebase's own rule
// (centipede `scaffold.test.ts`: "cross-repo wiring invariants live in the
// ORCHESTRATOR suite") says this is where they belong.
//
// Provenance, so a future reader can audit the consolidation rather than trust it:
//   - Task 5  deleted `lobby/tests/scaffold.test.ts`        (5 tests)
//   - Task 6  deleted `tempest/tests/scaffold.test.ts`       (5) + 2 git-pin assertions
//   - Task 7  deleted `star-wars/tests/scaffold.test.ts`     (5) + 3 git-pin assertions
//   - Task 8  deleted `asteroids/tests/scaffold.test.ts`     (5) + 3 git-pin assertions
//   - Task 9  removed 2 whole describes + 4 git-pin assertions from battlezone (19)
//   - Task 10 removed 2 whole describes + 2 git-pin assertions from red-baron  (16)
//   - Task 11 removed 3 whole describes from centipede (19 tests / 35 assertions)
//   - Task 12 removed 5 whole describes from joust     (26 tests / 50 assertions)
// Each surviving `plugins/<id>/tests/scaffold.test.ts` header quotes its own
// removals by exact old title; the deleted three (tempest, star-wars, asteroids)
// are recorded in `.superpowers/sdd/2026-07-30-arcade-plugin-host/task-{6,7,8}-report.md`.
//
// TWO of these tests predate Task 12b: Task 5's fix round shipped the lobby's
// `base` assertion (extended here with the seven games' loop, and renamed to say
// so) and the declarative host-pin test (left exactly as shipped). `node:test`
// permits duplicate test names silently, so nothing below re-adds them.
//
// KNOWINGLY ACCEPTED LOSSES — invariants that were removed and are NOT restored
// anywhere. Recorded here, not omitted, because an invariant that vanishes
// between the two accountings is the failure this file exists to prevent:
//
//   1. `does NOT reuse 5270/5273/5274/5275/...` (battlezone, centipede, joust —
//      a loop over each game's TAKEN_PORTS). There is one port now. Its nearest
//      successor is base-path uniqueness, which IS asserted below.
//   2. `allow-lists arcade.slabgorb.com on both server and preview` (battlezone
//      only). That existed so the retired Cloudflare tunnel could forward a
//      public Host header into a dev server. The tunnel is history
//      (`cloudflared/` is kept as history; production is static R2), and `host`
//      is pinned to IPv4 loopback below, so no external hostname can reach the
//      dev server at all. Restoring it would re-open the hole it once managed.
//   3. red-baron's `resolves an @arcade/shared new enough to carry /synth` —
//      its VERSION half read `node_modules/@arcade/shared/package.json` and
//      demanded >= 0.14.0 to catch the stale-lockfile trap (edit the `#ref`,
//      run a bare `npm install`, keep the old commit). There is no installed
//      package, no `#ref` and no lockfile entry, so the trap cannot occur. Its
//      export half survives in-plugin on `@shared/synth`.
//   4. WITHDRAWN by Task 18 — NOT a loss, though it was very nearly one. The
//      per-game CI callers' interior detail (the `arcade-<id>` bucket target,
//      the push-to-main trigger, the ten-line thin-caller shape and the
//      sibling-bucket guard) was booked here as accepted on the grounds that
//      Task 18 replaces all eight callers — and Task 18, as first written,
//      produced workflow YAML and no test. Seven per-repo guards would have
//      become ZERO, with two tasks each assuming the other held the invariant.
//      The successor is the `deploy workflow` block at the bottom of this file:
//      one bucket (`arcade-lobby`), a tag trigger, and the retired seven named
//      as forbidden. Only the thin-caller SHAPE is genuinely gone with the
//      thing it described.
//   5. WITHDRAWN — NOT a loss. `vite`/`vitest` RESOLVED major versions were
//      first booked here on the grounds that plugins have no `node_modules`.
//      That was the wrong reading: the invariant was never about the plugins'
//      node_modules. joust's own record routes it by name — "the 'what actually
//      RESOLVED into node_modules' Vite-8 / Vitest-4 check now belongs to the
//      root's single node_modules". It is asserted below, against the real
//      installed versions, alongside the declared ranges.
//   6. `npm run dev` and `npm run preview` (all seven games' `package.json
//      scripts` describes asserted `dev → vite` and `preview → vite preview`).
//      The root has NEITHER, and Task 19 did not add them: `just serve` is a
//      bare `npx vite` run from the root — the port, host and strictPort come
//      from vite.config.ts rather than CLI flags, precisely so that an
//      invocation which forgets the flags is pinned too — and preview has no
//      successor recipe at all. So the SCRIPTS are gone with no root
//      equivalent — booked here rather than glossed, because the test below
//      deliberately does not pretend to cover them. The capability they named
//      is not gone (one dev server still serves the cabinet); the per-app npm
//      entry points are.
//
// The one removal that is NOT a loss, and was nearly booked as one: joust's
// `scaffold — strictPort is real, not just declared (AC-1, behavioural)`. See
// the behavioural test near the bottom of this file — it is restored, not
// downgraded to the declarative check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// tests/ → the repo root is one level up. Resolved from the file, not from cwd,
// so `node --test tests/monorepo-topology.test.mjs` and `npm run test:orchestrator`
// (which globs from the root) agree no matter where either is invoked.
const repo = resolve(import.meta.dirname, '..');
const path = (...rel) => join(repo, ...rel);
const read = (...rel) => readFileSync(path(...rel), 'utf8');

const GAMES = ['tempest', 'star-wars', 'asteroids', 'battlezone', 'red-baron', 'centipede', 'joust', 'missile-command'];
// Every app, with its directory: the games under plugins/, the lobby at the root.
const APPS = [...GAMES.map((id) => [id, join('plugins', id)]), ['lobby', 'lobby']];

// Anti-vacuity anchor for every GAMES loop below. A loop over a hardcoded list
// is blind to an EIGHTH plugin nobody added to the list — it would sail through
// all seven iterations and guard nothing about the newcomer. This test is what
// makes the seven-element loops honest, so it must run and it must be first.
test('plugins/ holds exactly the eight games this file loops over', () => {
  const dirs = readdirSync(path('plugins'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  assert.deepEqual(
    dirs,
    [...GAMES].sort(),
    'plugins/ and this file\'s GAMES list have diverged — every loop below is now ' +
      'silently skipping an app. Add the new game to GAMES (and to vitest.config.ts).',
  );
});

test('exactly one package.json declares dependencies', () => {
  // Replaces the seven `scaffold — package.json scripts` describes (battlezone 7,
  // red-baron 7, centipede 8 tests, joust 9 tests) and the four-way @arcade/shared
  // version drift they lived alongside. Per-app package.json files carry
  // name/version/private and nothing else: no scripts, no devDependencies, no
  // `type: module`, no dependencies. The root owns the toolchain.
  for (const [id, dir] of APPS) {
    const pkg = JSON.parse(read(dir, 'package.json'));
    assert.deepEqual(
      Object.keys(pkg).sort(),
      ['name', 'private', 'version'],
      `${dir}/package.json must carry only name/version/private — ${id} has grown a field back`,
    );
    // The key SET is not the whole contract. The pre-migration tests asserted the
    // values too (joust: `name === 'joust'`, `private === true`), and both still
    // matter: `name` is what Task 17's `<app>-vX.Y.Z` tags and Task 14's manifests
    // read back, and `private: false` would make an app publishable to npm.
    assert.equal(pkg.name, id, `${dir}/package.json name must match its directory`);
    assert.equal(pkg.private, true, `${dir} must stay private`);
    assert.match(pkg.version, /^\d+\.\d+\.\d+$/, `${dir} version must be a bare semver`);
  }
});

test('no @arcade/shared dependency survives anywhere', () => {
  // Replaces the NINE identical `pins @arcade/shared as a git-URL dependency`
  // assertions removed across tempest (2), star-wars (3), asteroids (3),
  // battlezone (4) and red-baron (2 — one of them `drops the pre-font #v0.5.0
  // pin (AC-4)`). Those guarded a pinned git pipe; the pipe is now the
  // `@shared/*` alias. A reappearance means someone re-introduced the pin and
  // with it the version drift the monorepo exists to delete.
  assert.ok(!read('package.json').includes('@arcade/shared'), 'root package.json');
  for (const [, dir] of APPS) {
    assert.ok(!read(dir, 'package.json').includes('@arcade/shared'), `${dir}/package.json`);
  }
  // The lockfile and node_modules are where a re-introduced pin would actually
  // land, so check the artifacts and not only the declaration.
  assert.ok(!read('package-lock.json').includes('@arcade/shared'), 'package-lock.json');
  assert.ok(!existsSync(path('node_modules', '@arcade')), 'node_modules/@arcade must not exist');
});

test('no per-app vite config, tsconfig base, lockfile, or CI caller survives', () => {
  // Replaces the eight `vite.config.ts exists` assertions (which inverted), the
  // per-repo `.github/workflows/deploy.yml` callers (centipede 5 tests, joust 6)
  // and joust's `fresh-checkout hygiene` lockfile assertion — which the collapse
  // likewise INVERTS: a plugin must now NOT carry a lockfile.
  for (const [, dir] of APPS) {
    assert.ok(!existsSync(path(dir, 'vite.config.ts')), `${dir} must not carry its own vite config`);
    assert.ok(!existsSync(path(dir, 'vitest.config.ts')), `${dir} must not carry its own vitest config`);
    assert.ok(!existsSync(path(dir, 'package-lock.json')), `${dir} must not carry its own lockfile`);
    assert.ok(!existsSync(path(dir, '.github')), `${dir} must not carry its own CI`);
    // "No node_modules of its own" (centipede/joust) means no INSTALLED tree —
    // not literally no directory. Vite writes its dep-optimizer cache to
    // <root>/node_modules/.vite, and every app IS a vite root, so `lobby/` grows
    // that directory the moment anyone runs the dev server. Asserting absence
    // outright would go red on a developer's machine for doing nothing wrong.
    // Anything OTHER than the cache means someone ran `npm install` in here.
    if (existsSync(path(dir, 'node_modules'))) {
      assert.deepEqual(
        readdirSync(path(dir, 'node_modules')).filter((e) => e !== '.vite'),
        [],
        `${dir}/node_modules holds installed packages — the root owns the toolchain`,
      );
    }
  }
});

test('repos.yaml is one trunk-based entry, which is what keeps main committable', () => {
  // The SUCCESSOR to five per-repo registration assertions Task 22 retired:
  //   `AC: repos.yaml registers battlezone in the star-wars entry shape`
  //   `AC: repos.yaml registers red-baron in the star-wars entry shape`
  //   `repos.yaml joust entry has moved past pre-implementation`
  //   `CLAUDE.md port table row 5278 is live, not reserved`   (centipede)
  //   `CLAUDE.md port table row 5279 is live, not reserved`   (joust)
  // Each named a repo, a `develop`, a gitflow strategy or a pinned port that no
  // longer exists. What survives is not per-game and is far more load-bearing:
  // repos.yaml is the gate every pf command reads, and one wrong word in it
  // blocks every direct commit to main — the workflow this repo is built on.
  //
  // MEASURED against pf 13.4.0's own `_get_protected_branches` (2026-07-31), which
  // is why the assertions below are on the LITERAL spelling rather than on "some
  // trunk-ish value":
  //   as committed (`trunk-based`) -> protected set is EMPTY   -> main committable
  //   `trunk` / `trunk_based` / `gitflow` -> protected == {main} -> every commit blocked
  // The hook defaults to trunk-based when the key is absent, so a DELETED key is
  // survivable and a MISSPELLED one is not. That is the trap; hence this test.
  const yaml = read('.pennyfarthing', 'repos.yaml');

  const reposAt = yaml.indexOf('\nrepos:');
  assert.notEqual(reposAt, -1, 'repos.yaml must have a top-level `repos:` key — pf reads it by name');
  const body = yaml.slice(reposAt);
  const entries = [...body.matchAll(/^ {2}([A-Za-z0-9._-]+):\s*$/gm)].map((m) => m[1]);
  assert.deepEqual(
    entries,
    ['arcade'],
    'repos.yaml must hold exactly ONE entry — nine repos are one repo. A second entry means a ' +
      'retired subrepo came back, and if it is gitflow the hook starts protecting its default branch.',
  );

  // `path: .` is what makes pf recognise THIS checkout as that entry:
  // _detect_current_repo compares `git rev-parse --show-toplevel` against
  // project_root/path. If it does not match, pf falls back to protecting
  // {main, develop, master} and main is blocked again — from the other direction.
  assert.match(yaml, /^ {4}path: \.$/m, 'the arcade entry must be `path: .` — the repo root IS the repo');
  assert.match(yaml, /^ {4}default_branch: main$/m, 'the arcade entry must declare `default_branch: main`');
  assert.match(
    yaml,
    /^ {4}branch_strategy: trunk-based$/m,
    'branch_strategy must be the literal string `trunk-based` — pf compares against that exact spelling',
  );
  // The mutants, named. `assert.match` on the good value alone would still pass if
  // a second, wrong branch_strategy line were added below it.
  for (const wrong of ['trunk', 'trunk_based', 'trunkbased', 'gitflow']) {
    assert.doesNotMatch(
      yaml,
      new RegExp(`^ {4}branch_strategy: ${wrong}\\s*$`, 'm'),
      `branch_strategy: ${wrong} silently falls through to the gitflow path and PROTECTS main`,
    );
  }
});

test('every app tsconfig extends the root, at the right depth', () => {
  // The games sit one level deeper than the lobby, so the relative `extends`
  // differs by exactly one `../`. Getting it wrong is silent: tsc reports a
  // missing base config only when it runs, and each plugin's strict-mode guard
  // walks this same chain — a broken hop makes those guards unreachable.
  for (const g of GAMES) {
    const tc = JSON.parse(read('plugins', g, 'tsconfig.json'));
    assert.equal(tc.extends, '../../tsconfig.json', `plugins/${g}/tsconfig.json extends`);
  }
  assert.equal(JSON.parse(read('lobby', 'tsconfig.json')).extends, '../tsconfig.json');
  // Raw text, not JSON.parse: the ROOT tsconfig carries `//` comments (the
  // src/shared/tests exclusion note), so parsing it throws. Every plugin's own
  // strict-mode guard walks the `extends` chain expecting to land here, and
  // this is the one config that terminates that walk.
  assert.match(read('tsconfig.json'), /"strict":\s*true/,
    'the root config is the only place strictness is declared — every plugin stub delegates here');
});

// `the tsc exclusion is ONE file, not the src/shared/tests directory` lived here.
// It policed the SHAPE of the migration's `"exclude": ["src/shared/tests/synth.test.ts"]`
// — that the exclusion named one file rather than the whole directory, which would
// have taken 25 innocent files down with it. mg1-9 removes the exclusion entirely,
// so there is no shape left to police; the test's own closing message said to delete
// it when that landed. Its successors are in `tests/shared-tests-typechecked.test.mjs`,
// which asserts the stronger property: nothing is excluded, and every TEST file under
// src/shared/tests is in the tsc program.

test('the root declares the scripts and the toolchain the apps used to declare individually', () => {
  // Replaces the interior of the seven `package.json scripts` describes. Each one
  // demanded SIX scripts — dev/build/preview/test/test:watch/lint — plus
  // vite/vitest/typescript devDependencies, in its OWN package.json.
  //
  // FOUR of the six have a root equivalent and are asserted below. TWO do not:
  // `dev` and `preview` are NOT root scripts and are not coming back — see
  // accepted loss #6 in the header. Saying "there is one of each now" would be
  // false, and a false coverage claim in this file is worse than the gap it
  // papers over: it tells the next auditor a window is closed when it is open.
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.type, 'module', 'the cabinet is ESM (joust asserted this per-repo)');
  assert.equal(pkg.scripts.test, 'vitest run --passWithNoTests');
  assert.equal(pkg.scripts['test:watch'], 'vitest');
  assert.equal(pkg.scripts.lint, 'tsc --noEmit');
  assert.ok(pkg.scripts.build.includes('build-app.mjs'), 'build must go through the app builder');
  assert.ok(pkg.devDependencies.typescript, 'typescript must be a root devDependency');
  // Declared ranges…
  assert.match(pkg.devDependencies.vite, /^\^8\./, 'Vite 8 must be asked for');
  assert.match(pkg.devDependencies.vitest, /^\^4\./, 'Vitest 4 must be asked for');
  // …and what ACTUALLY RESOLVED. joust's removal record routes this half here by
  // name: "the 'what actually RESOLVED into node_modules' Vite-8 / Vitest-4 check
  // now belongs to the root's single node_modules". A declared range cannot catch
  // a stale install — which is the entire reason the original existed — and there
  // is exactly one node_modules to read now. This file already hard-requires the
  // root install (the behavioural strictPort test spawns node_modules/.bin/vite),
  // so reading it here costs no new precondition.
  for (const [dep, major] of [['vite', 8], ['vitest', 4]]) {
    const installed = JSON.parse(read('node_modules', dep, 'package.json')).version;
    assert.equal(
      installed.split('.')[0],
      String(major),
      `node_modules/${dep} resolved to ${installed}, not ${major}.x — the install is stale ` +
        `even though package.json asks for the right range`,
    );
  }
});

test('the running Node meets the floor package.json declares', () => {
  // A DIAGNOSTIC, not a wiring rule. The cabinet loads TypeScript into bare Node in two
  // places — the root vite.config.ts that four tests below reach through, and
  // scripts/gen-registry.mjs's `import … from '../src/host/contract.ts'`, which
  // tests/registry.test.mjs imports in turn — and both need Node's type stripping, on by
  // default since 22.18/23.6.
  //
  // Below that floor the suite does not explain itself. Measured on this checkout with
  // `node --no-experimental-strip-types --test 'tests/**/*.test.mjs'`, which reproduces an
  // older Node exactly: 305 tests, 298 pass, 5 fail — four of these tests plus the whole of
  // tests/registry.test.mjs, whose six tests simply never collect, reported as one bare
  // `✖ tests/registry.test.mjs` over an ERR_UNKNOWN_FILE_EXTENSION stack. (node:test runs
  // each file in its own process, so the damage stops at the file; the rest of the suite
  // still runs.) Nothing in that output says "your Node is too old". This test does.
  //
  // It is also the only thing checking `engines` at all, which was `>=20` — already untrue
  // before Task 14, since the vite.config.ts loads predate it.
  const { engines } = JSON.parse(read('package.json'));
  const declared = engines?.node;
  assert.match(String(declared), /^>=\d+\.\d+/, 'package.json must declare engines.node as >=X.Y');

  const [wantMajor, wantMinor] = declared.replace('>=', '').split('.').map(Number);
  const [haveMajor, haveMinor] = process.versions.node.split('.').map(Number);
  assert.ok(
    haveMajor > wantMajor || (haveMajor === wantMajor && haveMinor >= wantMinor),
    `arcade needs Node ${declared}, but this is v${process.versions.node}. Below ${declared} ` +
      `Node cannot import a .ts file, so scripts/gen-registry.mjs, tests/registry.test.mjs ` +
      `and the root vite.config.ts all fail to load with ERR_UNKNOWN_FILE_EXTENSION.`,
  );
});

test('every game is served under its own base path, lobby at the root', async () => {
  // Task 5's fix round shipped the lobby half of this test (as `the lobby is
  // served under base /`); Task 12b adds the seven games' loop and the outDir
  // assertions, and renames it to match what it now covers. Between them these
  // replace the eight per-repo `serves under base /` assertions — which are
  // now false for the games BY DESIGN: each is mounted under /<id>/ on the one
  // origin, and only the lobby keeps the root.
  const { defineAppConfig } = await import('../vite.config.ts');
  const bases = new Set();
  for (const g of GAMES) {
    const cfg = defineAppConfig({ id: g });
    assert.equal(cfg.base, `/${g}/`, `${g} must serve under /${g}/`);
    assert.ok(cfg.build.outDir.endsWith(`dist/${g}`), `${g} must build into dist/${g}`);
    bases.add(cfg.base);
  }
  const lobby = defineAppConfig({ id: 'lobby' });
  assert.equal(lobby.base, '/', 'the lobby must serve at the cabinet root, not under a subpath');
  assert.ok(lobby.build.outDir.endsWith('dist'), 'the lobby must build into dist/');
  bases.add(lobby.base);
  // The successor to the retired `does NOT reuse <sibling port>` loops: eight
  // apps on one origin collide on PATH now, not on port. Two games sharing a
  // base would silently overwrite each other in dist/ and in the bucket.
  assert.equal(bases.size, GAMES.length + 1, 'every app must own a distinct base path');
});

test('dev-tool HTML entries are opt-in, never inherited', async () => {
  // Replaces battlezone's `does not copy star-wars models.html rollupOptions` —
  // the one assertion in the eight configs that guarded against a game
  // inheriting a sibling's second entry point by copy-paste. The factory makes
  // that structural: a game gets exactly `index.html` unless it declares more.
  const { defineAppConfig } = await import('../vite.config.ts');
  for (const g of GAMES) {
    assert.deepEqual(
      Object.keys(defineAppConfig({ id: g }).build.rollupOptions.input),
      ['main'],
      `${g} must not inherit a sibling's extra HTML entry`,
    );
  }
  // …and the opt-in half really opts in, or the assertion above would pass on a
  // factory that simply ignores `entries`.
  const withTool = defineAppConfig({ id: 'tempest', entries: ['models.html'] });
  assert.deepEqual(Object.keys(withTool.build.rollupOptions.input).sort(), ['main', 'models']);
});

test('the dev-server host pin survives — strictPort alone does not protect it', async () => {
  // ALREADY SHIPPED BY TASK 5's FIX ROUND — untouched by Task 12b.
  // Replaces the per-repo scaffold assertion on strictPort + host:'127.0.0.1'
  // (originated jt1-3, ported fleet-wide as td1-1). Still load-bearing with one
  // dev server: a-1/a-2/a-3 race the same port, and an unpinned host lets a
  // second checkout's Vite bind [::1]:5270 alongside this one's 127.0.0.1:5270
  // with NO collision error at all — serving the whole cabinet from the wrong
  // working tree. strictPort only stops a second server on the SAME host from
  // wandering to a different port; it does nothing about the [::1] escape hatch.
  const { defineAppConfig } = await import('../vite.config.ts');
  const lobby = defineAppConfig({ id: 'lobby' });
  for (const block of ['server', 'preview']) {
    assert.equal(lobby[block].host, '127.0.0.1', `${block}.host must be pinned to IPv4 loopback`);
    assert.equal(lobby[block].strictPort, true, `${block}.strictPort must be true`);
    assert.equal(lobby[block].port, 5270, `${block}.port must stay pinned to 5270`);
  }
});

test('strictPort is real, not just declared — the pin is PROVEN, not asserted', async () => {
  // ===================================================================
  // joust's `scaffold — strictPort is real, not just declared (AC-1,
  // behavioural)`, RESTORED — not downgraded.
  // ===================================================================
  // joust is where this guard was invented (jt1-3, ported fleet-wide as td1-1)
  // and it was the ONLY repo in the arcade where the pin was ever PROVEN rather
  // than asserted: it bound a real TCP port, spawned the real vite, and watched
  // it refuse to start. Task 12's removal record warns, correctly, that the
  // declarative test above restores the CLAIM and not the PROOF, and asks that
  // the difference be booked as a knowingly-accepted reduction in coverage.
  //
  // It does not have to be. The collapse removed the seven per-plugin vite
  // binaries and ports, but it did not remove the ROOT one: there is one vite,
  // one config and one pinned port, which is exactly what this proof needs. It
  // is reconstructed here, cabinet-wide, and it catches what no config-object
  // assertion can — a vite that silently ignores `strictPort`, a pin sitting on
  // the wrong block, or the IPv6 fall-through ([::1]:5270 alongside a held
  // 127.0.0.1:5270) that a declarative check reads straight past.
  //
  // It is also cheap: vite refuses in ~150ms, well under the 25s cap below.
  //
  // The port comes from the factory, not from a literal: a hardcoded constant
  // that drifted from the config would still fail — but it would burn the full
  // 25s cap and then report "strictPort is not in effect", pointing the reader
  // at the pin when the fault was in this test.
  const { defineAppConfig } = await import('../vite.config.ts');
  const PORT = defineAppConfig({ id: 'lobby' }).server.port;

  /** Hold the port so the dev server has to collide with something. */
  const occupy = () =>
    new Promise((res) => {
      const s = createServer();
      // Already held by somebody else (a sibling checkout, a stray dev server).
      // The collision the test needs exists either way, so carry on.
      s.once('error', () => res({ release: async () => {} }));
      s.listen(PORT, '127.0.0.1', () =>
        res({ release: () => new Promise((done) => s.close(() => done())) }),
      );
    });

  const lock = await occupy();
  const vite = spawn('node_modules/.bin/vite', [], { cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  let spawnError = null;
  vite.stdout.on('data', (b) => (output += b.toString()));
  vite.stderr.on('data', (b) => (output += b.toString()));

  const exit = await new Promise((res) => {
    const timer = setTimeout(() => {
      vite.kill('SIGKILL');
      res('still-running');
    }, 25_000);
    vite.on('error', (e) => {
      clearTimeout(timer);
      spawnError = e;
      res('spawn-failed');
    });
    vite.on('exit', (code) => {
      clearTimeout(timer);
      res(code ?? -1);
    });
  });
  await lock.release();

  // Distinguish "vite could not be launched" from "vite refused to start",
  // or a fresh checkout with no install reads as a passing proof.
  assert.equal(spawnError, null, `could not spawn node_modules/.bin/vite: ${spawnError?.message}`);
  assert.notEqual(
    exit,
    'still-running',
    `vite kept running with ${PORT} occupied — strictPort is not in effect, so the dev ` +
      `server silently wandered to another port (or to [::1]:${PORT}). Output:\n${output}`,
  );
  assert.notEqual(exit, 0, `vite must exit non-zero on a port collision. Output:\n${output}`);
  assert.match(
    output,
    new RegExp(String(PORT)),
    `vite failed, but never named the contested port ${PORT} — it may have failed for an ` +
      `unrelated reason, which would make this proof vacuous. Output:\n${output}`,
  );
});

test('build output is never tracked', () => {
  // joust's `fresh-checkout hygiene` `git ls-files -- dist` anti-tracking check.
  // It always ran with cwd: root, so it was a repo-wide property even then; the
  // collapse just makes that explicit. dist/ is where every app now builds.
  const tracked = execFileSync('git', ['ls-files', '--', 'dist'], { cwd: repo, encoding: 'utf8' });
  assert.equal(tracked.trim(), '', 'built output has been committed');
});

// The other half of joust's `fresh-checkout hygiene` describe: its .gitignore had
// to cover node_modules AND dist, and Task 12's record routes both to the root
// .gitignore. These are SPLIT deliberately. node_modules is assertable today;
// dist is not. Bundling them would put the provable half behind a `{ todo }`,
// where node:test swallows the failure — leaving a removed invariant unguarded
// while the file looked like it was covering it. A todo must defer only what
// genuinely cannot pass yet.
test('the root .gitignore covers node_modules', () => {
  assert.match(read('.gitignore'), /^node_modules\/$/m, '.gitignore must cover node_modules');
});

// Un-todo'd by Task 16 Step 5b, which added the rule before it ran the first build.
// Until then, `build output is never tracked` above was the only thing standing
// between `git add -A` and a committed build — and a todo cannot stop a commit.
test('the root .gitignore covers dist', () => {
  assert.match(read('.gitignore'), /^\/?dist\/?$/m, '.gitignore must cover dist');
  // Declaration is not behaviour: ask git itself. A rule that landed in a
  // `!`-negated section, or after a stray `#`, still matches the regex above.
  // `--no-index` because dist/ need not exist for the rule to be checkable.
  const out = execFileSync('git', ['check-ignore', '--no-index', '-v', 'dist/tempest/index.html'], {
    cwd: repo,
    encoding: 'utf8',
  });
  assert.match(out, /\.gitignore:\d+:\/?dist\//, `git does not actually ignore built output: ${out}`);
});

// ===========================================================================
// THE ONE DEPLOY WORKFLOW  (was: eight per-repo callers + the reusable
// deploy-r2.yml, and the `CI deploy caller` describes centipede and joust each
// removed whole — see withdrawn loss #4 in the header)
//
// These tests are deliberately NOT greps. A grep for `arcade-lobby` in a file
// that obviously contains `arcade-lobby` proves close to nothing, and every
// silent failure found during this migration passed a reading. So the workflow's
// own shell is EXTRACTED AND EXECUTED here, with node/npm/npx replaced by shims
// that record their argv — which makes the deployed bucket, the key prefix, the
// dist directory, the gate steps and their ORDER all observable, and makes the
// tag parse a behaviour rather than a claim.
//
// Four assertions below are unavoidably textual, because they live in `on:`,
// `uses:` and `env:` blocks that no run: shim can observe: fetch-depth, the
// secret wiring, the account id and the Node major. Each names the edit that
// breaks it, and each was mutation-checked against the REAL key rather than
// against the prose above it — a distinction this file learned the hard way
// twice (see workflowConfig, and the account id's own note).
//
// The tag TRIGGER used to be the fifth. It is not textual any more: the globs
// are parsed out and evaluated against the tags scripts/release.mjs actually
// cuts, because `assert.match(cfg, /tags:/)` could not tell a trigger that
// fires from one that never runs at all.
// ===========================================================================

const WORKFLOW = ['.github', 'workflows', 'deploy.yml'];

/**
 * The workflow with every comment line removed — what a POSITIVE assertion about
 * its configuration must be made against.
 *
 * Found by mutation, not by inspection: `assert.match(wf, /fetch-depth:\s*0/)`
 * over the raw file SURVIVED changing the real `with:` key to 1, because the
 * comment above it (`# fetch-depth: 0 is REQUIRED, not tidiness…`) satisfied the
 * match on its own. The file explains itself at length, so "the string appears
 * somewhere" and "the workflow does it" are genuinely different claims here.
 *
 * NEGATIVE assertions keep using the raw text: for those, the comments are extra
 * surface to hold, not a way to cheat.
 */
function workflowConfig() {
  return read(...WORKFLOW)
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .join('\n');
}

/**
 * Every GitHub Actions expression in `text`, as
 * `{ line, raw, body, terminated }`.
 *
 * Scanned out of the RAW file, COMMENTS INCLUDED — which is the whole point, and
 * the one thing every other test in this section is structurally blind to.
 * `runWorkflow` hands each `run:` block to bash, and bash throws `#` lines away
 * before anything else happens; GitHub does the opposite, expanding the template
 * over the entire file BEFORE any shell exists to have comments in. So a broken
 * expression inside a comment is invisible to an executing test and fatal to the
 * real thing. `workflowConfig()` — which strips comments — must never be used
 * here for the same reason.
 */
function actionsExpressions(text) {
  const found = [];
  const open = /\$\{\{/g;
  let m;
  while ((m = open.exec(text)) !== null) {
    const close = text.indexOf('}}', m.index + 3);
    const line = text.slice(0, m.index).split('\n').length;
    if (close === -1) {
      found.push({ line, raw: text.slice(m.index), body: null, terminated: false });
      break;
    }
    found.push({
      line,
      raw: text.slice(m.index, close + 2),
      body: text.slice(m.index + 3, close),
      terminated: true,
    });
    open.lastIndex = close + 2;
  }
  return found;
}

/**
 * The contexts and built-in functions an expression may begin with. Not a
 * grammar — deliberately. The empty-expression check below is the one that
 * fires on the observed failure; this heads-only check is a cheap extension that
 * catches an expression referring to nothing at all, and it is kept to a
 * leading-identifier test so it cannot start pretending to be a parser.
 */
const ACTIONS_EXPRESSION_HEADS = new Set([
  'github', 'env', 'vars', 'job', 'jobs', 'steps', 'runner', 'secrets',
  'strategy', 'matrix', 'needs', 'inputs',
  'contains', 'startsWith', 'endsWith', 'format', 'join', 'toJSON', 'fromJSON',
  'hashFiles', 'success', 'always', 'cancelled', 'failure',
]);

/**
 * Everything wrong with `text`'s Actions expressions, as messages naming the
 * file and line. An empty array means nothing is wrong — and the test below
 * proves this function can return a NON-empty one before trusting that.
 */
function expressionDefects(where, text) {
  const defects = [];
  for (const e of actionsExpressions(text)) {
    const at = `${where}:${e.line}`;
    if (!e.terminated) {
      defects.push(`${at}: an Actions expression is opened and never closed`);
      continue;
    }
    const body = e.body.trim();
    if (body === '') {
      defects.push(
        `${at}: an EMPTY Actions expression — GitHub expands this before any shell runs, ` +
          'so the whole workflow fails to parse and never starts',
      );
      continue;
    }
    const head = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(body);
    if (!head || !ACTIONS_EXPRESSION_HEADS.has(head[0])) {
      defects.push(
        `${at}: '${e.raw}' does not begin with an Actions context or built-in function`,
      );
    }
  }
  return defects;
}

/**
 * The tag globs the workflow actually triggers on, read out of `on: push: tags:`.
 *
 * Parsed rather than grepped, because a grep cannot tell a trigger that FIRES
 * from one that never runs. MEASURED: rewriting `tags: ['*-v*']` to `tags: ['v*']`
 * left the whole orchestrator suite green at 348/348 — and `v*` matches NONE of
 * the tags `just release` cuts, since every one of them starts with an app id.
 * A workflow that never runs is the quietest deploy failure there is: no red X,
 * no run, nothing at all to notice.
 *
 * THROWS rather than returning `[]`: a parser that quietly found no globs would
 * make the assertions below vacuous, which is the failure this file exists for.
 */
function tagTriggerGlobs() {
  const lines = workflowConfig().split('\n');
  const at = lines.findIndex((l) => /^\s*tags:/.test(l));
  if (at === -1) throw new Error('deploy.yml has no `tags:` trigger at all');
  // The globs must hang off `on: push:`. A `tags:` under anything else — or with
  // no `push:` before it — is not a tag trigger however much it looks like one.
  const push = lines.findIndex((l) => /^\s*push:\s*$/.test(l));
  if (push === -1 || push > at) throw new Error('deploy.yml: `tags:` is not under an `on: push:`');
  const inline = /^\s*tags:\s*\[(.*)\]\s*$/.exec(lines[at]);
  let raw;
  if (inline) {
    raw = inline[1].split(',');
  } else {
    raw = [];
    for (let i = at + 1; i < lines.length; i++) {
      const item = /^\s*-\s*(\S.*?)\s*$/.exec(lines[i]);
      if (!item) break;
      raw.push(item[1]);
    }
  }
  const globs = raw.map((g) => g.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  if (globs.length === 0) throw new Error('deploy.yml declares `tags:` with no pattern');
  return globs;
}

/**
 * GitHub's filter-pattern semantics for a ref, the subset a tag glob can use:
 * `*` matches zero or more characters but NOT `/`, `**` matches across `/`, and
 * everything else is literal. (Workflow syntax → "filter pattern cheat sheet".)
 */
function globMatchesRef(glob, ref) {
  const source = glob
    .split('**')
    .map((between) =>
      between
        .split('*')
        .map((literal) => literal.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('[^/]*'),
    )
    .join('.*');
  return new RegExp(`^${source}$`).test(ref);
}

/**
 * The workflow's YAML skeleton: every configuration line, comments and blank
 * lines removed, with each `run:` VALUE collapsed to `<shell>` (the shell itself
 * is pinned behaviourally by the argv deep-equals below, and duplicating it here
 * would just make this brittle without making it stronger).
 *
 * This exists because of a question the first sweep of this file never asked.
 * That sweep asked "can prose satisfy each assertion?" and closed every hole it
 * found — but the review then found a defect in the one block that had NO
 * assertion at all, which no amount of auditing existing assertions could ever
 * have surfaced. `concurrency`, `permissions`, `timeout-minutes`, `runs-on`,
 * `cache: npm` and both `uses:` action versions were all invisible to the suite.
 *
 * So this is deliberately exhaustive rather than selective: a deep-equal over
 * the WHOLE skeleton cannot leave a key unguarded, because adding, removing or
 * editing any line changes the array. It is the structural complement to the
 * behavioural tests, not a replacement for them.
 */
function workflowSkeleton() {
  const lines = workflowConfig().split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    const m = /^(\s*)(- )?run:(.*)$/.exec(lines[i]);
    if (!m) {
      out.push(lines[i]);
      continue;
    }
    const keyIndent = m[1].length + (m[2]?.length ?? 0);
    out.push(`${m[1]}${m[2] ?? ''}run: <shell>`);
    if (m[3].trim() === '|') {
      let j = i + 1;
      for (; j < lines.length; j++) {
        if (lines[j].trim() === '') continue;
        if (lines[j].length - lines[j].trimStart().length <= keyIndent) break;
      }
      i = j - 1;
    }
  }
  if (out.length === 0) throw new Error('deploy.yml has no configuration lines at all');
  return out;
}

/**
 * Every `run:` script in a workflow file, in order and dedented — either an
 * inline `run: npm ci` or a `run: |` literal block.
 *
 * A hand parse, because the repo has no YAML dependency and must not acquire one
 * to guard its own CI. It THROWS rather than returning what it managed to
 * understand: a parser that quietly returned `[]` would make every assertion
 * below vacuous, which is precisely the failure this file exists to catch.
 */
function runScripts(text) {
  const lines = text.split('\n');
  const scripts = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\s*)(- )?run:(.*)$/.exec(lines[i]);
    if (!m) continue;
    const keyIndent = m[1].length + (m[2]?.length ?? 0);
    const inline = m[3].trim();
    if (inline !== '' && inline !== '|') {
      scripts.push(inline);
      continue;
    }
    if (inline === '') {
      throw new Error(`deploy.yml:${i + 1}: a run: with no command and no \`|\` block`);
    }
    const body = [];
    let j = i + 1;
    for (; j < lines.length; j++) {
      if (lines[j].trim() === '') {
        body.push('');
        continue;
      }
      if (lines[j].length - lines[j].trimStart().length <= keyIndent) break;
      body.push(lines[j]);
    }
    if (body.length === 0) throw new Error(`deploy.yml:${i + 1}: empty \`run: |\` block`);
    const pad = Math.min(...body.filter(Boolean).map((l) => l.length - l.trimStart().length));
    scripts.push(body.map((l) => l.slice(pad)).join('\n'));
    i = j - 1;
  }
  if (scripts.length === 0) throw new Error('deploy.yml declares no run: steps at all');
  return scripts;
}

/**
 * Run the deploy workflow's shell the way the runner would, against `tag`.
 *
 *  · `node`, `npm` and `npx` are replaced on PATH by shims that only append their
 *    own name and argv to a log. Nothing installs wrangler, nothing builds and
 *    nothing uploads; what is asserted is the COMMAND LINE the workflow composes.
 *  · The tag-parse step runs with cwd = the REAL repo, because it asks the
 *    filesystem whether `plugins/<app>` exists — the same question build-app.mjs's
 *    appIds() asks. Every LATER step runs in a throwaway directory: this executes
 *    text out of a file, and the shims only neutralise the commands we know about.
 *  · `bash -e` is the runner's own default shell for a `run:` step.
 *  · `$GITHUB_ENV` is a real file, read back exactly as the runner reads it, so
 *    nothing here stands in for GitHub's own templating.
 */
function runWorkflow(tag, { overrides = {}, resolveOnly = false } = {}) {
  const scripts = runScripts(read(...WORKFLOW));
  const tmp = mkdtempSync(join(tmpdir(), 'deploy-wf-'));
  try {
    const bin = join(tmp, 'bin');
    const work = join(tmp, 'work');
    const log = join(tmp, 'argv.log');
    const envFile = join(tmp, 'github_env');
    mkdirSync(bin);
    mkdirSync(work);
    writeFileSync(log, '');
    writeFileSync(envFile, '');
    for (const cmd of ['node', 'npm', 'npx']) {
      writeFileSync(
        join(bin, cmd),
        `#!/bin/sh\n{ printf '%s' "${cmd}"; for a in "$@"; do printf '\\t%s' "$a"; done; printf '\\n'; } >> "$ARGV_LOG"\n`,
        { mode: 0o755 },
      );
    }
    const base = { ...process.env, PATH: `${bin}:${process.env.PATH}`, ARGV_LOG: log };

    const first = spawnSync('bash', ['-e', '-c', scripts[0]], {
      cwd: repo,
      encoding: 'utf8',
      env: { ...base, GITHUB_REF_NAME: tag, GITHUB_ENV: envFile },
    });
    const exported = Object.fromEntries(
      readFileSync(envFile, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
    );
    const output = `${first.stdout}${first.stderr}`;
    if (first.status !== 0 || resolveOnly) {
      return { rejected: first.status !== 0, output, exported, commands: [], failures: [] };
    }

    const failures = [];
    for (const script of scripts.slice(1)) {
      const step = spawnSync('bash', ['-e', '-c', script], {
        cwd: work,
        encoding: 'utf8',
        env: { ...base, ...exported, CLOUDFLARE_API_TOKEN: 'a-test-token', ...overrides },
      });
      if (step.status !== 0) failures.push({ script, output: `${step.stdout}${step.stderr}` });
    }
    const commands = readFileSync(log, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split('\t'));
    return { rejected: false, output, exported, commands, failures };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

test('exactly one deploy workflow exists for the whole cabinet', () => {
  // Was eight ten-line per-repo callers plus the reusable deploy-r2.yml (the
  // describes centipede and joust each removed whole). Sorted: readdir order is
  // filesystem-dependent, and this must stay a stable comparison if the
  // directory ever holds more than one entry.
  assert.deepEqual(readdirSync(path('.github', 'workflows')).sort(), ['deploy.yml']);
});

test('every Actions expression in every workflow is well-formed', () => {
  // THE GUARD THAT WAS MISSING. Everything else in this section models the
  // SHELL; GitHub models the TEMPLATE first, and nothing checked the file
  // against the thing that actually parses it. The workflow carried a comment
  // that spelled out an empty expression while explaining why no expression
  // belongs in a run: block, and it took the whole workflow down — while this
  // suite happily EXECUTED that comment as a bash no-op and stayed green.
  //
  // OBSERVED, not reasoned from docs (`gh run view 30647462417`, and
  // `gh run list` over all four runs of this file):
  //   · "This run likely failed because of a workflow file issue."
  //   · `--json jobs` returns `[]` — every run, zero jobs, nothing ever ran.
  //   · `--json name` returns ".github/workflows/deploy.yml", the PATH, not the
  //     `name: deploy` on line 14 — GitHub never parsed far enough to read it.
  //   · Plain pushes to `main` produced runs at all, so the `tags:` filter that
  //     should have rejected them was never read either.
  // Four pushes, four startup failures, back to this file's first commit: it had
  // never once started.
  const dir = ['.github', 'workflows'];
  const files = readdirSync(path(...dir)).sort();
  assert.ok(files.length > 0, 'no workflow files at all — this guard would be checking nothing');

  // POSITIVE CONTROL FIRST. A green run of this test means the files are clean
  // only if the check can go red at all, so it is fired at four known-bad texts
  // before it is believed about the real ones. The first is the LITERAL line 106
  // that broke production, comment marker and all.
  for (const [why, text, expected] of [
    [
      'the exact line that broke production',
      '          # command below is plain shell over "$APP" with no ${{ }} interpolation',
      /EMPTY Actions expression/,
    ],
    ['an empty expression in a config value', '      group: deploy-${{ }}', /EMPTY Actions expression/],
    ['an expression naming no context', '        if: ${{ nonsense.value }}', /context or built-in function/],
    ['an expression that is never closed', '      group: deploy-${{ github.ref_name', /never closed/],
  ]) {
    const defects = expressionDefects('control', text);
    assert.equal(defects.length, 1, `positive control (${why}) found ${defects.length} defects, not 1`);
    assert.match(defects[0], expected, `positive control (${why}) reported the wrong defect`);
  }

  const defects = files.flatMap((f) => expressionDefects(`.github/workflows/${f}`, read(...dir, f)));
  assert.deepEqual(
    defects,
    [],
    'a malformed Actions expression fails the workflow at STARTUP: no jobs, no logs, no deploy, ' +
      'and nothing that executes the run: blocks can see it',
  );

  // ANTI-VACUITY, and the pin. Zero expressions found would also report zero
  // defects — so the two the workflow is known to carry are named as data. Both
  // are legitimate and neither may quietly become something else; a third one
  // added on purpose belongs in this list, deliberately.
  assert.deepEqual(
    actionsExpressions(read(...WORKFLOW)).map((e) => (e.body ?? '').trim()),
    ['github.ref_name', 'secrets.CLOUDFLARE_API_TOKEN'],
    'deploy.yml must carry exactly the two expressions it needs — and the scanner must find them',
  );
});

test('the deploy workflow gates and ships exactly one app, in order, to one bucket', () => {
  // The whole command plan, pinned as data. Every one of these is an invariant
  // some other test would otherwise have to state separately: that a type check
  // runs at all, that the orchestrator suite runs at all, that only THIS app's
  // vitest project runs, that the build precedes the upload, that the upload
  // names the cabinet bucket, that dist/<id> and the <id>/ key prefix agree —
  // and the ORDER, which no `assert.match` over the file text can see.
  const { commands, failures } = runWorkflow('tempest-v1.0.29');
  assert.deepEqual(failures, [], `a workflow step exited non-zero: ${JSON.stringify(failures)}`);
  assert.deepEqual(commands, [
    ['npm', 'ci'],
    ['npm', 'run', 'lint'],
    ['npm', 'run', 'test:orchestrator'],
    ['npx', 'vitest', 'run', '--project', 'tempest'],
    ['node', 'scripts/build-app.mjs', 'tempest'],
    ['npm', 'install', '-g', 'wrangler'],
    ['node', 'scripts/deploy-r2.mjs', 'dist/tempest', 'arcade-lobby', 'tempest'],
  ]);
});

test('the lobby ships to the bucket ROOT, a game under its own key prefix', () => {
  // The one asymmetry in "one origin, one bucket, eight apps". Getting it
  // backwards uploads the lobby's index.html over a game's, or files the whole
  // lobby under a directory nobody links to — and both would report success.
  const lobby = runWorkflow('lobby-v0.2.0');
  assert.deepEqual(lobby.exported, { APP: 'lobby', R2_PREFIX: '', DIST: 'dist' });
  assert.deepEqual(lobby.commands.at(-1), [
    'node', 'scripts/deploy-r2.mjs', 'dist', 'arcade-lobby', '',
  ]);
  // A hyphenated id, end to end, because it is the one that a naive tag parse
  // silently truncates to `star` — a prefix no game is served under.
  const game = runWorkflow('star-wars-v0.0.33');
  assert.deepEqual(game.exported, {
    APP: 'star-wars',
    R2_PREFIX: 'star-wars',
    DIST: 'dist/star-wars',
  });
  assert.deepEqual(game.commands.at(-1), [
    'node', 'scripts/deploy-r2.mjs', 'dist/star-wars', 'arcade-lobby', 'star-wars',
  ]);
});

test('no exported job variable is a name npm reads as configuration', () => {
  // OBSERVED IN PRODUCTION, not hypothetical: the resolve step exported the R2
  // key prefix as `PREFIX`, and npm adopts a PREFIX environment variable as its
  // GLOBAL PREFIX when no config file pins one (@npmcli/config lib/index.js:
  // `if (this.env.PREFIX) { this.globalPrefix = this.env.PREFIX }`). On the
  // runner nothing pins one, so the upload step's `npm install -g wrangler`
  // installed into `./<app>/bin` — a RELATIVE path inside the workspace, never
  // on PATH — and the very next spawn died with `spawnSync wrangler ENOENT`.
  // Every game deploy since the migration failed exactly there. The lobby
  // exports the EMPTY prefix, which is falsy, escapes the hijack, and was the
  // one app to reach the Cloudflare API — the asymmetry that localised the bug
  // (runs 30703378860 vs 30703475989, and the probe runs on
  // chore/debug-wrangler-probe). A developer's machine cannot reproduce this:
  // Homebrew's npm carries a builtin npmrc whose explicit `prefix =` outranks
  // the env default.
  //
  // The ban is the CLASS, not the incident: any exported name npm treats as
  // configuration silently reconfigures every npm/npx invocation in every later
  // step of the job.
  const npmSignificant = (name) =>
    name === 'PREFIX' || name === 'DESTDIR' || /^npm_config_/i.test(name) || /^NODE_(OPTIONS|PATH)$/.test(name);
  for (const tag of ['tempest-v1.0.29', 'lobby-v0.2.0']) {
    const { exported } = runWorkflow(tag, { resolveOnly: true });
    // Anti-vacuity: a resolve step that exported nothing would pass the ban
    // while breaking the deploy; APP proves the parse ran and the file was read.
    assert.ok(exported.APP, `${tag}: the resolve step exported nothing at all`);
    assert.deepEqual(
      Object.keys(exported).filter(npmSignificant),
      [],
      `${tag}: an exported name npm reads as configuration hijacks every later npm invocation in the job`,
    );
  }
});

test('the workflow accepts exactly the tags scripts/release.mjs cuts, and no others', async () => {
  // The contract between the tag maker and the tag reader, checked against the
  // REAL isReleaseTag rather than against a restatement of it. A reader looser
  // than the writer deploys tags the writer would never cut; a reader stricter
  // than the writer silently deploys nothing after a real release.
  const { tagFor, isReleaseTag } = await import('../scripts/release.mjs');
  const { appIds } = await import('../scripts/build-app.mjs');
  const ids = appIds();
  const candidates = [
    ...ids.map((id) => tagFor(id, '10.20.30')),
    'v1.0.0', //               unprefixed: which of the eight apps would it deploy?
    'tempest-v1.0', //         no patch — a version release.mjs would never write
    'tempest-vector-v0.1.0', // a plausible FUTURE id, with no directory today
    'joust-v0.0.4-rc.1', //    a prerelease suffix nextVersion refuses to produce
    'lobby-vlatest', //        a moving tag: it names no version at all
  ];
  let accepted = 0;
  for (const tag of candidates) {
    const wanted = ids.find((id) => isReleaseTag(id, tag)) ?? null;
    const got = runWorkflow(tag, { resolveOnly: true });
    if (wanted) {
      accepted++;
      assert.equal(got.rejected, false, `${tag}: release.mjs cuts this tag; CI refused it: ${got.output}`);
      assert.equal(got.exported.APP, wanted, `${tag} must resolve to ${wanted}`);
    } else {
      assert.equal(got.rejected, true, `${tag}: no app owns this tag, but CI would deploy ${got.exported.APP}`);
      assert.match(got.output, /::error::/, `${tag}: a refusal must annotate the run, not just exit`);
    }
  }
  // Anti-vacuity: a resolve step that rejected EVERYTHING would satisfy every
  // negative above, and there must be one accepted tag per app.
  assert.equal(accepted, ids.length, 'every app must have a tag shape CI accepts');
});

test('the deploy workflow targets the cabinet bucket, on a tag trigger', () => {
  // Step 4b, verbatim from the brief: the successor to seven deleted per-repo
  // `CI deploy caller` describes. Textual on purpose — it is the negative that
  // carries the weight, and an absent string cannot be executed.
  const wf = read(...WORKFLOW);
  const cfg = workflowConfig(); // positives must hold of the CONFIG, not the prose
  assert.match(cfg, /arcade-lobby/, 'CI must upload to the cabinet bucket');
  assert.match(cfg, /tags:/, 'deploy must fire on a tag, not a push to main');
  assert.doesNotMatch(
    wf,
    /arcade-(tempest|star-wars|asteroids|battlezone|red-baron|centipede|joust)\b/,
    'the seven per-game buckets are retired — a reference to one means the prefix collapse regressed',
  );
  // ADDED to the brief's three: a workflow that keeps `tags:` and ALSO grows a
  // branch trigger passes all three above, and redeploys all eight apps on every
  // commit to main — which is the exact defect the tag trigger exists to prevent.
  assert.doesNotMatch(wf, /^\s*branches:/m, 'main carries every app; a branch trigger redeploys all eight');
});

test('the tag trigger actually fires for every tag scripts/release.mjs cuts', async () => {
  // The `tags:` match above is the brief's, and it is not enough on its own:
  // MEASURED, `tags: ['v*']` — a glob that matches no release tag this repo can
  // produce — left the suite green at 348/348. That is the whole deploy silently
  // never running, which is worse than a red one.
  //
  // So the globs are evaluated against the tags the RELEASE SCRIPT makes, the
  // same way the resolve step below is checked against isReleaseTag(). Two
  // halves of one contract: the trigger has to fire, and the step has to agree
  // about which app fired it.
  const { tagFor } = await import('../scripts/release.mjs');
  const { appIds } = await import('../scripts/build-app.mjs');
  const globs = tagTriggerGlobs();
  const fires = (ref) => globs.some((g) => globMatchesRef(g, ref));

  for (const id of appIds()) {
    const tag = tagFor(id, '10.20.30');
    assert.ok(
      fires(tag),
      `just release ${id} pushes ${tag}, and ${JSON.stringify(globs)} does not match it — no run at all`,
    );
  }

  // Anti-vacuity, with subjects that CAN exhibit the effect: `tags: ['*']` would
  // satisfy every line above while deploying on any tag whatsoever. The first two
  // are REAL tags in this repo (the audit anchors from Task 2), and a bare
  // `vX.Y.Z` is the pre-monorepo tag shape the app-prefixed scheme retired.
  for (const ref of ['audit/tempest', 'audit/red-baron', 'v1.0.0']) {
    assert.ok(
      !fires(ref),
      `${ref} names no app to deploy, but ${JSON.stringify(globs)} would start a run for it`,
    );
  }
});

test('the deploy workflow gives every tag its own concurrency group', () => {
  // A SHARED concurrency group does not serialise deploys. It DISCARDS them.
  //
  // A group holds exactly one pending run by default — "any additional pending
  // runs cancel the previous one" (Actions docs, concurrency), i.e. `queue:
  // single`. `cancel-in-progress: false` governs only the RUNNING job and does
  // nothing for the queue. An earlier revision of this workflow used one group,
  // `deploy-arcade`, for all eight apps, in the stated belief that it serialised
  // the uploads. Under `just release-all` — eight tags pushed in a burst — the
  // first would run, and each new arrival would cancel the one waiting: roughly
  // the first and the last deploy, and the middle six silently do not. Silently
  // is the word: release-all exits 0 having already bumped, committed, tagged and
  // pushed all eight, the lost runs read as *cancelled* rather than failed, and
  // release.mjs's change detection then skips the re-release because the bump is
  // already on main.
  //
  // The invariant is therefore NOT "the group string is this literal", it is
  // "two different tags cannot collide in one group" — so it is checked by
  // rendering the group expression for two tags and requiring them to differ.
  // The one other legitimate design, a single group that opts into real queueing
  // with `queue: max` (up to 100 pending), satisfies this too.
  const cfg = workflowConfig();
  const group = /^\s*group:\s*(.+?)\s*$/m.exec(cfg);
  assert.ok(group, 'the deploy job must declare a concurrency group');
  // Only `github.ref_name` is substituted, because the tag is the only thing that
  // varies between two deploys. A group keyed on something per-RUN instead (a run
  // id, say) would fail here, and rightly: it is indistinguishable from having no
  // concurrency control at all.
  const render = (tag) => group[1].replaceAll(/\$\{\{\s*github\.ref_name\s*\}\}/g, tag);
  const disjoint = render('tempest-v1.0.29') !== render('joust-v0.0.4');
  const queuesForReal = /^\s*queue:\s*max\s*$/m.test(cfg);
  assert.ok(
    disjoint || queuesForReal,
    `concurrency group '${group[1]}' is shared by every tag and does not set queue: max — ` +
      'a release-all burst would cancel its own pending deploys instead of queueing them',
  );
});

test("the deploy workflow's configuration skeleton is pinned, key for key", () => {
  // The exhaustive structural guard — see workflowSkeleton. Every line of YAML
  // configuration, in order. This is the test that would have caught the shared
  // concurrency group on the commit that introduced it, and it is the only thing
  // guarding `permissions`, `timeout-minutes`, `runs-on`, `cache: npm` and the
  // two pinned action versions at all.
  //
  // When this reddens, read the diff rather than pasting the new value in: it
  // fires on any CI change whatsoever, which is the point. Every line here is
  // load-bearing and several are asserted a second time, semantically, above.
  assert.deepEqual(workflowSkeleton(), [
    'name: deploy',
    'on:',
    '  push:',
    "    tags: ['*-v*']",
    'permissions:',
    '  contents: read',
    'jobs:',
    '  deploy:',
    '    runs-on: ubuntu-latest',
    '    timeout-minutes: 30',
    '    concurrency:',
    '      group: deploy-${{ github.ref_name }}',
    '      cancel-in-progress: false',
    '    steps:',
    '      - uses: actions/checkout@v5',
    '        with:',
    '          fetch-depth: 0',
    '      - name: Resolve the app from the tag',
    '        run: <shell>',
    '      - uses: actions/setup-node@v5',
    '        with:',
    '          node-version: 22',
    '          cache: npm',
    '      - run: <shell>',
    '      - run: <shell>',
    '      - run: <shell>',
    '      - name: Unit tests for this app',
    '        run: <shell>',
    '      - name: Build this app',
    '        run: <shell>',
    '      - name: Upload to R2',
    '        run: <shell>',
    '        env:',
    '          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}',
    '          CLOUDFLARE_ACCOUNT_ID: a55aafa9b0691f828cd6864be28c1674',
  ]);
});

test('the deploy workflow clones full history and carries the Cloudflare credentials', () => {
  // All three read the COMMENT-STRIPPED file (see workflowConfig): the first of
  // them survived a real mutation until it did, because this workflow explains
  // `fetch-depth: 0` in a comment directly above the key it sets.
  const cfg = workflowConfig();
  // tempest's and red-baron's citation gates read blobs out of the commit their
  // audit was taken against. Under a shallow clone those objects are absent and
  // both gates fail, blocking the deploy of a perfectly good build.
  assert.match(cfg, /^\s+fetch-depth:\s*0\s*$/m, 'the citation gates need real history, not a snapshot');
  assert.match(
    cfg,
    /CLOUDFLARE_API_TOKEN:\s*\$\{\{\s*secrets\.CLOUDFLARE_API_TOKEN\s*\}\}/,
    'the upload step must receive the repository secret',
  );
  // The VALUE, not the shape. This read `[0-9a-f]{32}` and MEASURED green at
  // 348/348 with the id swapped for another well-formed 32-hex string: an
  // assertion that could not tell the arcade account from anybody else's, on a
  // step whose whole job is to authenticate to one particular account. Same
  // defect class as the fetch-depth comment above — the assertion described the
  // right thing without being able to check it.
  //
  // The id is a plan constant and is not a secret (docs/ops/hosting.md carries it
  // in the clear); pinning it literally is the point.
  assert.match(
    cfg,
    /CLOUDFLARE_ACCOUNT_ID:\s*a55aafa9b0691f828cd6864be28c1674\s*$/m,
    'wrangler must authenticate against the arcade Cloudflare account',
  );
});

test('an empty CLOUDFLARE_API_TOKEN stops the upload instead of authenticating as nobody', () => {
  // Not hypothetical: `gh secret set` reading EOF stores a BLANK value, and joust
  // shipped nothing for weeks behind one. wrangler's own error for a blank token
  // never says "your secret is empty".
  const { commands, failures } = runWorkflow('tempest-v1.0.29', {
    overrides: { CLOUDFLARE_API_TOKEN: '' },
  });
  assert.equal(failures.length, 1, 'exactly the upload step must fail');
  assert.match(failures[0].output, /CLOUDFLARE_API_TOKEN/, 'the failure must name the empty secret');
  assert.ok(
    !commands.some((c) => c.join(' ').includes('deploy-r2.mjs')),
    'nothing may be uploaded with a blank token',
  );
});

test('CI is the only type check in the release or deploy path', () => {
  // MEASURED during Task 18: `grep -n "tsc" scripts/build-app.mjs` returns
  // nothing, and `just release`'s gate is `vitest run --project <id>` plus
  // `build-app.mjs <id>`. Vite transpiles through esbuild without checking
  // types, so before this step a type error could be released AND deployed,
  // reddening only in a developer's own terminal.
  const { commands } = runWorkflow('tempest-v1.0.29');
  const lint = commands.findIndex((c) => c.join(' ') === 'npm run lint');
  const build = commands.findIndex((c) => c[1] === 'scripts/build-app.mjs');
  assert.ok(lint !== -1, 'the deploy workflow must type-check');
  assert.ok(lint < build, 'the type check must gate the build, not trail it');
  // `npm run lint` is a type check only because package.json says so. Without
  // this half, redefining `lint` as `echo ok` would leave CI green and the whole
  // repo unchecked. It is repo-wide by necessity: the root tsconfig covers src,
  // plugins, lobby and scripts together, so it cannot be scoped per app.
  assert.equal(JSON.parse(read('package.json')).scripts.lint, 'tsc --noEmit');
});

test('CI runs the orchestrator suite — the only guard against a stale registry', () => {
  // `gen-registry.mjs --check` exists but has NO npm script and nothing invokes
  // it; `gen:registry` only writes. Staleness is enforced solely through
  // tests/registry.test.mjs, which vitest does not run. A workflow that ran only
  // vitest would let the committed registry drift from the manifests forever
  // with CI green.
  const { commands } = runWorkflow('tempest-v1.0.29');
  assert.ok(
    commands.some((c) => c.join(' ') === 'npm run test:orchestrator'),
    'the node:test suite must run in CI',
  );
  const script = JSON.parse(read('package.json')).scripts['test:orchestrator'];
  assert.match(script, /node --test/, 'test:orchestrator must be the node:test runner');
  assert.match(script, /tests\//, 'it must glob the orchestrator tests, wherever they live');
});

test('the deploy workflow runs a Node that meets the floor package.json declares', () => {
  // The floor is real and predates Task 14: scripts/build-app.mjs imports
  // gen-registry.mjs, which imports src/host/contract.ts, so bare Node must
  // strip types — on by default only from 22.18. MEASURED with
  // `node --no-experimental-strip-types scripts/build-app.mjs tempest`:
  // ERR_UNKNOWN_FILE_EXTENSION at load. A literal 20 here would not redden a
  // test, it would produce no build at all.
  // This compared MAJORS ONLY (`>=22.18` -> 22, `node-version: 22` -> 22), so it
  // enforced `>=22` while its own name and message claimed `>=22.18`.
  // `node-version: 22.17.0` — an ordinary reproducibility pin — passed it, and
  // installs a Node WITHOUT default type stripping: exactly the "no build at all"
  // failure described above. Same defect class as the account id below: an
  // assertion that described the right thing without being able to check it.
  const declared = JSON.parse(read('package.json')).engines.node;
  const floor = declared.replace(/^[^\d]*/, '').split('.').map(Number);
  const pinned = /node-version:\s*'?"?([0-9]+(?:\.[0-9]+)*)/.exec(workflowConfig());
  assert.ok(pinned, 'the workflow must pin a Node version for setup-node');
  const parts = pinned[1].split('.').map(Number);

  // Unstated components of the PIN are +Infinity, not 0: setup-node resolves any
  // partial spec to the newest build matching it, so `22` means "the latest 22.x"
  // and `22.18` means "the latest 22.18.x". Unstated components of the FLOOR are
  // 0, since `>=22.18` means `>=22.18.0`. That asymmetry is the whole fix — it is
  // what makes a bare `22` pass and an explicit `22.17.0` fail against `>=22.18`.
  const meets = (() => {
    for (let i = 0; i < 3; i++) {
      const p = i < parts.length ? parts[i] : Infinity;
      const f = i < floor.length ? floor[i] : 0;
      if (p !== f) return p > f;
    }
    return true;
  })();
  assert.ok(
    meets,
    `deploy.yml pins Node ${pinned[1]} but package.json declares ${declared} — ` +
      'setup-node would install a Node without default type stripping, and ' +
      'build-app.mjs -> gen-registry.mjs -> src/host/contract.ts would not load',
  );
});

/**
 * Every external binary the orchestrator suite spawns, as `name -> [test files]`.
 *
 * Read out of the test SOURCES rather than listed here, so a spawn of some new
 * binary is covered the day it is written instead of the day somebody remembers
 * this file. A bare name is a PATH lookup and therefore a prerequisite; anything
 * containing a `/` is a path inside the repo (`node_modules/.bin/vite`) and
 * `process.execPath` is the Node already running, so neither is one.
 *
 * It scans SOURCE TEXT, comments included — so a comment that spells out a spawn
 * call with a literal binary name is picked up as if it were code. That is not a
 * false negative and it does not go quiet: the named-set assertion below reddens on
 * it immediately. Describe such a call in words rather than in syntax.
 *
 * It THROWS on a spawn target it cannot resolve to a literal — the same rule
 * `runScripts` follows above, for the same reason. A scanner that quietly skipped
 * what it did not understand would make the test below pass by finding nothing,
 * which is the precise failure mode this whole section exists to catch.
 */
function suiteBinaries() {
  const files = readdirSync(path('tests'), { recursive: true })
    .map(String)
    .filter((f) => f.endsWith('.mjs'))
    .sort();
  if (files.length === 0) throw new Error('no orchestrator test sources found — this scanner would find nothing');
  const found = new Map();
  for (const f of files) {
    const text = read('tests', f);
    // `const JUST = 'just'` — the one indirection the suite actually uses. Any
    // OTHER expression is rejected below rather than guessed at.
    const consts = new Map(
      [...text.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(['"])([^'"]*)\2\s*;/g)].map((m) => [m[1], m[3]]),
    );
    for (const m of text.matchAll(/\b(spawnSync|spawn|execFileSync|execSync)\(\s*([^,)]+?)\s*[,)]/g)) {
      const raw = m[2];
      if (raw === 'process.execPath') continue;
      const literal = /^(['"])(.*)\1$/.exec(raw);
      let cmd = literal ? literal[2] : consts.get(raw);
      if (cmd === undefined) {
        throw new Error(
          `tests/${f}: cannot resolve the spawn target \`${raw}\` to a binary name. ` +
            'Bind it to a `const NAME = \'binary\';` so this guard can see what CI must provide.',
        );
      }
      // execSync takes a whole command line; the binary is its first word.
      if (m[1] === 'execSync') cmd = cmd.trim().split(/\s+/)[0];
      if (cmd === '' || cmd.includes('/')) continue;
      if (!found.has(cmd)) found.set(cmd, []);
      if (!found.get(cmd).includes(f)) found.get(cmd).push(f);
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// THE PREREQUISITE GUARD. Everything above models what the deploy workflow RUNS.
// This models what the runner HAS — the question nothing in this repo had ever
// asked.
//
// Task 18 put `npm run test:orchestrator` in the workflow for a real reason: it
// is the only check that the committed registry still matches the manifests. But
// that suite had never once executed on a runner, and nobody checked what it
// needs in order to execute at all.
//
// MEASURED, `gh run view 30648720269` (the lobby v0.0.23 deploy): 328 tests, 312
// pass, 16 fail — every failure carrying the same sentence,
//   "the `just` binary is required to test its recipes (brew install just)".
// tests/ci-sweep-masking.test.mjs drives the REAL justfile recipes through the
// REAL launcher, and `just` is a brew install here and absent from ubuntu-latest.
// Green locally at 328/328, red on the runner at 312/328, on all EIGHT release
// tags cut that afternoon. Nothing deployed.
//
// Why no existing test could see it: runWorkflow executes the workflow's `run:`
// blocks with `node`, `npm` and `npx` REPLACED on PATH by logging shims. It
// proves the command LINE the workflow composes — it cannot prove the command
// EXISTS, and a missing binary is invisible to it by construction.
//
// So this test never asks the machine whether a binary is installed. `which just`
// passes here and would have passed on the commit that broke production; it is
// not a weaker version of the missing measurement, it is the wrong measurement.
// What is asserted instead is that each binary is PROVISIONED for CI: by
// package-lock.json (which `npm ci` installs before the test step), by a workflow
// step that installs it first, or by the runner image itself.
// ---------------------------------------------------------------------------
test('every binary the orchestrator suite spawns is provisioned by CI, not by the developer machine', () => {
  const required = suiteBinaries();

  // ANTI-VACUITY, and the pin. A scanner that found nothing would satisfy every
  // assertion below without checking anything, so what it found is named as data.
  // A new prerequisite belongs in this list deliberately — and only once the
  // provisioning half below is satisfied for it.
  assert.deepEqual(
    [...required.keys()].sort(),
    ['bash', 'git', 'just', 'node'],
    'the set of binaries the suite spawns changed — provision the newcomer before pinning it here',
  );
  assert.deepEqual(
    required.get('just'),
    ['ci-sweep-masking.test.mjs'],
    'the scanner must find `just` in the very file whose sixteen tests blocked eight releases',
  );

  const cfg = workflowConfig();
  const scripts = runScripts(read(...WORKFLOW));
  const provided = new Map();

  // (1) THE RUNNER IMAGE. Claimed only for the runner this workflow actually
  // names: `bash` is the default shell of a `run:` step on a Linux runner, and
  // `git` is both in the image and a hard requirement of actions/checkout, which
  // could not have produced the checkout every later step reads. Retarget the job
  // at a different image and these claims stop being made.
  assert.match(cfg, /^\s+runs-on:\s*ubuntu-latest\s*$/m, 'this guard only knows what ubuntu-latest provides');
  const RUNNER = { os: 'linux', cpu: 'x64' };
  provided.set('bash', 'the ubuntu-latest default shell for `run:` steps');
  if (/uses:\s*actions\/checkout@/.test(cfg)) provided.set('git', 'actions/checkout, which cannot clone without it');
  if (/uses:\s*actions\/setup-node@/.test(cfg)) {
    for (const b of ['node', 'npm', 'npx']) provided.set(b, 'actions/setup-node');
  }

  // (2) ORDER. Everything the lockfile provides arrives with `npm ci`, so a suite
  // that ran before it would find nothing installed.
  const testStep = scripts.findIndex((s) => s.includes('npm run test:orchestrator'));
  const ciStep = scripts.findIndex((s) => /\bnpm ci\b/.test(s));
  assert.ok(testStep !== -1, 'the workflow must run the orchestrator suite at all');
  assert.ok(ciStep !== -1, 'the workflow must install the dependencies');
  assert.ok(ciStep < testStep, '`npm ci` must run BEFORE the orchestrator suite, not after it');

  // (3) A WORKFLOW STEP that installs a binary — and only one that runs BEFORE the
  // suite. `npm install -g wrangler` lives in the upload step, three steps later,
  // so it is deliberately NOT counted: a tool installed after the suite has already
  // exited cannot help it. This leg is what keeps the workflow-step route open for
  // a future prerequisite that has no npm package.
  for (const [i, s] of scripts.entries()) {
    if (i >= testStep) continue;
    for (const m of s.matchAll(/npm (?:install|i) -g\s+([\w@/.-]+)/g)) {
      provided.set(m[1].replace(/^.*\//, ''), `\`${m[0]}\`, a workflow step before the suite`);
    }
  }

  // (4) THE PROJECT'S OWN DEPENDENCIES — read from package-lock.json, which is
  // exactly what `npm ci` installs, and NOT from node_modules, which is a fact
  // about this machine. Only direct dependencies of the root count: those are the
  // ones npm is guaranteed to link into the top-level node_modules/.bin, which is
  // what npm puts on PATH for `npm run`.
  const lock = JSON.parse(read('package-lock.json'));
  const root = lock.packages[''];
  const direct = { ...(root.dependencies ?? {}), ...(root.devDependencies ?? {}) };
  assert.ok(Object.keys(direct).length > 0, 'package-lock.json lists no root dependencies — it is not the arcade lock');
  const fromLock = new Map();
  for (const name of Object.keys(direct)) {
    const entry = lock.packages[`node_modules/${name}`];
    assert.ok(entry, `package-lock.json has no entry for the direct dependency \`${name}\` — the lock is stale`);
    for (const bin of Object.keys(entry.bin ?? {})) {
      fromLock.set(bin, name);
      provided.set(bin, `the \`${name}\` dependency, installed by \`npm ci\``);
    }
  }

  const missing = [...required.keys()].filter((b) => !provided.has(b));
  assert.deepEqual(
    missing,
    [],
    `${missing.map((b) => `\`${b}\` (spawned by tests/${required.get(b)?.join(', tests/')})`).join('; ')} ` +
      'is required by the orchestrator suite and provisioned NOWHERE in CI. It exists on this ' +
      'machine and not on the runner — the exact shape that reddened all sixteen ' +
      'ci-sweep-masking tests and blocked eight releases. Add it as a devDependency (so `npm ci` ' +
      'installs it and node_modules/.bin puts it on PATH for every npm script) or install it in a ' +
      'workflow step before `npm run test:orchestrator`.',
  );

  // (5) THE PLATFORM. A lockfile generated on this developer's darwin/arm64
  // machine can carry a wrapper package whose real binary ships as a
  // platform-gated optional dependency — rust-just is exactly that shape, ten of
  // them. If the runner's platform is missing from the lock, `npm ci` links a
  // `just` on ubuntu that cannot exec anything: provisioned on paper, absent in
  // fact, and a second helping of the same "verified here, assumed there" bug.
  for (const [bin, name] of fromLock) {
    if (!required.has(bin)) continue;
    const optional = Object.keys(lock.packages[`node_modules/${name}`].optionalDependencies ?? {});
    if (optional.length === 0) continue;
    const usable = optional.filter((dep) => {
      const e = lock.packages[`node_modules/${dep}`];
      return e && (e.os ?? [RUNNER.os]).includes(RUNNER.os) && (e.cpu ?? [RUNNER.cpu]).includes(RUNNER.cpu);
    });
    assert.ok(
      usable.length > 0,
      `\`${name}\` provides \`${bin}\` through ${optional.length} platform-gated packages and ` +
        `package-lock.json carries none for ${RUNNER.os}/${RUNNER.cpu} — \`npm ci\` on the runner ` +
        'would link a launcher with no binary behind it. Re-generate the lock so the runner\'s platform is in it.',
    );
  }

  // (6) …and it must actually have LANDED. `npm ci` writes node_modules/.bin from
  // the same lock read above, so a bin named in the lock and absent from .bin means
  // THIS checkout's install is stale — the same gap the vite/vitest resolved-version
  // check near the top of this file closes. It is the only line here that reads the
  // machine, and it reads the product of `npm ci`, never the developer's PATH.
  for (const [bin, name] of fromLock) {
    if (!required.has(bin)) continue;
    assert.ok(
      existsSync(path('node_modules', '.bin', bin)),
      `package-lock.json says \`${name}\` provides \`${bin}\`, but node_modules/.bin/${bin} does not ` +
        'exist — run `npm ci`; this install predates the dependency',
    );
  }
});

test('every plugins/ directory is a real app with an entry', () => {
  // The brief's draft looked for `main.ts` at the plugin root; every game
  // actually boots `src/main.ts` (index.html: <script src="/src/main.ts">) and
  // no later task moves it, so this asserts the real entry. The manifest half
  // is the separate todo below — splitting them keeps four provable files
  // provable instead of parking all five behind Task 14.
  for (const g of GAMES) {
    for (const f of ['package.json', 'tsconfig.json', 'index.html', 'src/main.ts']) {
      assert.ok(existsSync(path('plugins', g, f)), `plugins/${g}/${f} missing`);
    }
    assert.match(read('plugins', g, 'index.html'), /src=["']\/src\/main\.ts["']/,
      `plugins/${g}/index.html must boot src/main.ts`);
  }
});

// Un-todo'd by Task 14, which wrote the seven manifests. What they CONTAIN is
// tests/registry.test.mjs's and src/host/registry.test.ts's business; this stays a
// bare existence check, in the file that owns "every app is wired the same way".
test('every plugins/ directory carries a plugin manifest', () => {
  for (const g of GAMES) {
    assert.ok(existsSync(path('plugins', g, 'plugin.ts')), `plugins/${g}/plugin.ts missing`);
  }
});

// Added by Task 16 (plan defect #20). Three games ship a second HTML page and
// NOTHING guarded the chain that carries that fact into the build: BuildSpec has
// no runtime validator, and the reader is a text parse of a declaration `tsc` is
// happy to see reformatted. A reader that stops matching drops a dev-tool page
// with no error at all.
//
// Note what this calls: `buildEntriesFor` from scripts/build-app.mjs — the REAL
// reader the build uses, not a copy of its regex. A restated parse would keep
// passing while the shipped one broke, which is precisely the failure being
// guarded. Both directions are asserted against the filesystem, so neither a
// silent drop nor a stale declaration survives.
test('every plugin dev-tool HTML file is declared, and every declared one exists', async () => {
  const { buildEntriesFor } = await import('../scripts/build-app.mjs');
  // Pinned as DATA, per game — not an aggregate count, which stays green when one
  // game's page moves to another. Taken from the per-repo vite.config.ts files
  // before they were deleted.
  const EXPECTED = {
    tempest: ['models.html'],
    'star-wars': ['models.html', 'scenes.html'],
    'red-baron': ['models.html'],
    asteroids: [],
    battlezone: [],
    centipede: [],
    joust: [],
    'missile-command': [],
  };
  for (const id of GAMES) {
    const onDisk = readdirSync(path('plugins', id))
      .filter((f) => f.endsWith('.html') && f !== 'index.html')
      .sort();
    // Throws rather than returning [] when it cannot read a declaration, so a
    // mangled manifest fails here loudly instead of comparing [] against [].
    const declared = [...buildEntriesFor(id)].sort();
    assert.deepEqual(
      declared,
      onDisk,
      `${id}: declared dev-tool entries must match the .html files on disk — a reader that ` +
        `stops matching drops a page silently, and a stale declaration breaks the build`,
    );
    assert.deepEqual(declared, [...EXPECTED[id]].sort(), `${id}: dev-tool page set changed`);
  }
  // Anti-vacuity: three games must actually HAVE pages, or seven empty comparisons
  // would pass with the reader returning nothing at all.
  assert.equal(
    GAMES.reduce((n, id) => n + buildEntriesFor(id).length, 0),
    4,
    'the fleet ships four dev-tool pages; zero would mean the reader is reading nothing',
  );
});
