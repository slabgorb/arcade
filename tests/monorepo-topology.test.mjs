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
//   4. The per-game CI callers' interior detail — the `arcade-<id>` bucket
//      target, the push-to-main trigger, the ten-line thin-caller shape and the
//      sibling-bucket guard (centipede, joust). Task 18 replaces all eight
//      callers with ONE tag-triggered workflow whose bucket is `arcade-lobby`
//      for every app; the shape being guarded no longer exists. What survives
//      as an invariant — that there is exactly one workflow — is asserted below
//      (todo until Task 18).
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
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
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

test('exactly one deploy workflow exists for the whole cabinet', { todo: 'Task 18 creates .github/workflows/deploy.yml and deletes deploy-r2.yml' }, () => {
  // Was eight ten-line per-repo callers plus the reusable deploy-r2.yml (the
  // describes centipede and joust each removed whole). Today the directory
  // still holds deploy-r2.yml alone; Task 18 replaces it with one tag-triggered
  // workflow. Written now, todo-marked, so the invariant has an owner rather
  // than a hole. Sorted: readdir order is filesystem-dependent, and this must
  // stay a stable comparison if the directory ever holds more than one entry.
  assert.deepEqual(readdirSync(path('.github', 'workflows')).sort(), ['deploy.yml']);
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
