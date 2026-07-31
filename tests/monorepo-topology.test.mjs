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
//      The root has NEITHER, and Task 19 does not add them: `just serve`
//      becomes `npx vite --port 5270 --strictPort`, run from the root, and
//      preview has no successor recipe at all. So the SCRIPTS are gone with no
//      root equivalent — booked here rather than glossed, because the test
//      below deliberately does not pretend to cover them. The capability they
//      named is not gone (one dev server still serves the cabinet); the
//      per-app npm entry points are.
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

const GAMES = ['tempest', 'star-wars', 'asteroids', 'battlezone', 'red-baron', 'centipede', 'joust'];
// Every app, with its directory: the games under plugins/, the lobby at the root.
const APPS = [...GAMES.map((id) => [id, join('plugins', id)]), ['lobby', 'lobby']];

// Anti-vacuity anchor for every GAMES loop below. A loop over a hardcoded list
// is blind to an EIGHTH plugin nobody added to the list — it would sail through
// all seven iterations and guard nothing about the newcomer. This test is what
// makes the seven-element loops honest, so it must run and it must be first.
test('plugins/ holds exactly the seven games this file loops over', () => {
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
// Four assertions below are unavoidably textual (the trigger, fetch-depth, the
// secret wiring, the Node major); each names the edit that breaks it.
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
  assert.deepEqual(lobby.exported, { APP: 'lobby', PREFIX: '', DIST: 'dist' });
  assert.deepEqual(lobby.commands.at(-1), [
    'node', 'scripts/deploy-r2.mjs', 'dist', 'arcade-lobby', '',
  ]);
  // A hyphenated id, end to end, because it is the one that a naive tag parse
  // silently truncates to `star` — a prefix no game is served under.
  const game = runWorkflow('star-wars-v0.0.33');
  assert.deepEqual(game.exported, {
    APP: 'star-wars',
    PREFIX: 'star-wars',
    DIST: 'dist/star-wars',
  });
  assert.deepEqual(game.commands.at(-1), [
    'node', 'scripts/deploy-r2.mjs', 'dist/star-wars', 'arcade-lobby', 'star-wars',
  ]);
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
  assert.match(cfg, /CLOUDFLARE_ACCOUNT_ID:\s*[0-9a-f]{32}/, 'wrangler needs the account id');
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
  const declared = JSON.parse(read('package.json')).engines.node;
  const floor = Number(declared.replace('>=', '').split('.')[0]);
  const pinned = /node-version:\s*'?"?(\d+)/.exec(workflowConfig());
  assert.ok(pinned, 'the workflow must pin a Node major for setup-node');
  assert.ok(
    Number(pinned[1]) >= floor,
    `deploy.yml runs Node ${pinned[1]}.x but package.json declares ${declared}`,
  );
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
