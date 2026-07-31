// The release script after the collapse. Nine repos are one, so the three things
// the old tests pinned are gone with the world they described:
//
//   · the develop -> main `--no-ff` merge plan (there is no develop);
//   · `shouldRelease`'s origin/main..origin/develop count (neither ref exists);
//   · `bumpRegistryVersion`, the pure text transform that hand-wrote each game's
//     version into `lobby/src/core/registry.ts` — a file Task 15 deleted. The tile
//     version is DERIVED now (package.json -> plugin.ts -> gen-registry.mjs ->
//     src/host/registry.ts), so there is no second copy to keep in step and
//     nothing left for that transform to transform.
//
// What survives is the invariant underneath each: a release must be attributable
// to ONE app, must not ship what it did not test, and must not tag a tree whose
// own suite is red. Those are what this file asserts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import {
  appDirFor,
  changePathsFor,
  nextVersion,
  packagePathFor,
  releaseFiles,
  gateSteps,
  isReleaseTag,
  releaseSteps,
  setPackageVersion,
  shouldRelease,
  tagFor,
} from '../scripts/release.mjs';
import { appIds } from '../scripts/build-app.mjs';

const repo = resolve(import.meta.dirname, '..');
const path = (...rel) => join(repo, ...rel);

// ---------------------------------------------------------------------------
// The tag — the whole reason per-app releases still work in one repo
// ---------------------------------------------------------------------------

test('tagFor namespaces every tag by app', () => {
  assert.equal(tagFor('tempest', '1.0.29'), 'tempest-v1.0.29');
  assert.equal(tagFor('star-wars', '0.0.33'), 'star-wars-v0.0.33');
  assert.equal(tagFor('lobby', '0.1.0'), 'lobby-v0.1.0');
  // The negative is the point: an unprefixed vX.Y.Z cannot say WHICH app it
  // releases now that main carries all eight, and Task 18's workflow rejects it.
  for (const id of appIds()) assert.doesNotMatch(tagFor(id, '1.2.3'), /^v\d/);
});

test('the deploy workflow can parse the app back out of every tag this script makes', () => {
  // Run the REAL parameter expansion that Task 18's `.github/workflows/deploy.yml`
  // WILL use (`app="${GITHUB_REF_NAME%-v*}"`) — the file does not exist yet —
  // rather than a JavaScript imitation of it. The round trip is the contract
  // between this file and that workflow, and an imitation could agree with this
  // script while disagreeing with bash.
  const parse = (tag) =>
    execFileSync('bash', ['-c', 'printf %s "${1%-v*}"', 'bash', tag], { encoding: 'utf8' });
  for (const id of appIds()) {
    assert.equal(parse(tagFor(id, '10.20.30')), id, `${id} does not survive the tag round trip`);
  }
  // Hyphenated ids are the case that makes this non-obvious, and the case a
  // greedy strip would break: `%` removes the SHORTEST matching suffix.
  assert.equal(parse('star-wars-v0.0.33'), 'star-wars');
  assert.equal(parse('red-baron-v0.1.1'), 'red-baron');
  // An unprefixed tag comes back unchanged — which is how the workflow detects it.
  assert.equal(parse('v1.0.0'), 'v1.0.0');
});

test('isReleaseTag is the exact inverse of tagFor, not the glob that finds candidates', () => {
  // `git tag -l 'tempest-v*'` is a PREFIX match. It answers "which tags might be
  // tempest's", not "which are" — a future app named `tempest-vector` would put
  // `tempest-vector-v0.1.0` in that list, and taking it as tempest's last release
  // would diff tempest's directory against a sibling's tag and skip the release.
  for (const id of appIds()) assert.ok(isReleaseTag(id, tagFor(id, '1.2.3')), id);
  assert.equal(isReleaseTag('tempest', 'tempest-vector-v0.1.0'), false);
  assert.equal(isReleaseTag('tempest', 'asteroids-v1.0.0'), false);
  assert.equal(isReleaseTag('tempest', 'tempest-v1.0'), false);
  assert.equal(isReleaseTag('tempest', 'audit/tempest'), false);
  // Hyphens and dots in an id are literal, never regex metacharacters.
  assert.equal(isReleaseTag('star-wars', 'star-wars-v0.0.33'), true);
  assert.equal(isReleaseTag('star-wars', 'starxwars-v0.0.33'), false);
});

// ---------------------------------------------------------------------------
// The command plan
// ---------------------------------------------------------------------------

test('releaseSteps: the full command order, with no develop and no merge', () => {
  const steps = releaseSteps({
    id: 'tempest',
    version: '1.0.29',
    files: ['plugins/tempest/package.json', 'src/host/registry.ts'],
  });
  assert.deepEqual(
    steps.map((s) => [s.cmd, ...s.args]),
    [
      ['git', 'add', '--', 'plugins/tempest/package.json', 'src/host/registry.ts'],
      ['git', 'commit', '-m', 'chore(release): tempest v1.0.29'],
      ['git', 'tag', '-a', 'tempest-v1.0.29', '-m', 'release tempest v1.0.29'],
      ['git', 'push', 'origin', 'main'],
      ['git', 'push', 'origin', 'tempest-v1.0.29'],
    ],
  );
});

test('releaseSteps: main is pushed BEFORE the tag', () => {
  // The tag is the deploy trigger. If it landed first and the branch push then
  // failed, CI would build and ship a commit that is on no branch.
  const flat = releaseSteps({ id: 'joust', version: '0.0.4', files: ['a'] }).map((s) => s.args.join(' '));
  const branchPush = flat.findIndex((a) => a === 'push origin main');
  const tagPush = flat.findIndex((a) => a === 'push origin joust-v0.0.4');
  assert.ok(branchPush !== -1 && tagPush !== -1, 'both pushes must exist');
  assert.ok(branchPush < tagPush, 'the tag must not reach origin before the commit it points at');
});

test('releaseSteps: staging is explicit, never `git add -A`', () => {
  // The old script staged `-A`. In a monorepo that sweeps whatever else is
  // sitting in the tree into the release commit — this checkout carries an
  // untracked `arcade-shared/` right now — and the release commit must contain
  // the two files the script itself wrote.
  const files = ['plugins/asteroids/package.json', 'src/host/registry.ts'];
  const add = releaseSteps({ id: 'asteroids', version: '0.0.2', files }).find((s) => s.args[0] === 'add');
  assert.deepEqual(add.args, ['add', '--', ...files]);
  assert.ok(!add.args.includes('-A'), 'a release must never stage the whole tree');
});

test('releaseSteps: nothing in the plan mentions develop, merge or checkout', () => {
  // The three stages the collapse deleted. Any of them reappearing means someone
  // restored a workflow whose branches no longer exist.
  const words = releaseSteps({ id: 'lobby', version: '0.0.23', files: ['lobby/package.json'] })
    .flatMap((s) => [s.desc, s.cmd, ...s.args])
    .join(' ');
  for (const gone of ['develop', 'merge', 'checkout', '--no-ff']) {
    assert.ok(!words.includes(gone), `the plan still mentions "${gone}"`);
  }
});

test('releaseSteps: every step has a human-readable desc', () => {
  for (const s of releaseSteps({ id: 'tempest', version: '1.2.3', files: ['x'] })) {
    assert.ok(s.desc && s.desc.length > 3, `step ${s.args.join(' ')} lacks desc`);
  }
});

// ---------------------------------------------------------------------------
// The bump, and the generated data hanging off it
// ---------------------------------------------------------------------------

test('releaseFiles: the regenerated registry is IN the release commit', () => {
  // The generated-data consequence of the version living in exactly one place:
  // src/host/registry.ts bakes each game's package.json version in, and
  // tests/registry.test.mjs pins the committed file against the manifests. A
  // release that bumped without regenerating would tag — and deploy — a red tree.
  // Literals for two apps, because `[packagePathFor(id), …]` alone would agree
  // with itself no matter what packagePathFor returned.
  assert.deepEqual(releaseFiles('tempest'), ['plugins/tempest/package.json', 'src/host/registry.ts']);
  assert.deepEqual(releaseFiles('lobby'), ['lobby/package.json', 'src/host/registry.ts']);
  for (const id of appIds()) {
    assert.deepEqual(releaseFiles(id), [packagePathFor(id), 'src/host/registry.ts'], id);
  }
});

test('packagePathFor and appDirFor point at files that exist, for every app', () => {
  // Loops over the real app list, so an eighth game is covered the day it lands
  // rather than the day someone remembers to extend a hardcoded list here.
  const ids = appIds();
  assert.ok(ids.includes('lobby') && ids.length === 8, `expected 8 apps, got ${ids.join(',')}`);
  for (const id of ids) {
    assert.ok(existsSync(path(packagePathFor(id))), `${packagePathFor(id)} does not exist`);
    assert.ok(existsSync(path(appDirFor(id))), `${appDirFor(id)} does not exist`);
    // The lobby is NOT under plugins/ — the one asymmetry in the layout, and the
    // one a `plugins/${id}` template would get wrong.
    assert.equal(packagePathFor(id).startsWith('plugins/'), id !== 'lobby');
  }
});

test('nextVersion bumps the right field and zeroes the ones below it', () => {
  assert.equal(nextVersion('1.0.28', 'patch'), '1.0.29');
  assert.equal(nextVersion('1.0.28', 'minor'), '1.1.0');
  assert.equal(nextVersion('1.0.28', 'major'), '2.0.0');
  assert.equal(nextVersion('0.0.22', 'patch'), '0.0.23');
  assert.equal(nextVersion('1.9.9', 'minor'), '1.10.0'); // 9 -> 10, not 1.10 lexically
});

test('nextVersion refuses to guess at anything that is not a bare X.Y.Z', () => {
  // Leading zeros are in the list because the comment says "refusing to guess"
  // and `01.2.3` -> `01.2.4` is a guess: semver forbids the form outright, and
  // the tag it would produce is not a version anyone meant.
  for (const bad of ['1.0', 'v1.0.0', '1.0.0-rc.1', '1.0.0+build', '', 'latest', '01.2.3', '1.02.3', '1.2.03']) {
    assert.throws(() => nextVersion(bad, 'patch'), /not a bare X\.Y\.Z/, `accepted ${JSON.stringify(bad)}`);
  }
  assert.throws(() => nextVersion('1.0.0', 'sideways'), /unknown level/);
});

test('setPackageVersion rewrites the version and NOTHING else, on a real package.json', () => {
  // The real shipped file, not a fixture of one: a formatting difference between
  // an invented fixture and the files on disk is exactly what a text rewrite
  // trips over.
  const source = readFileSync(path('plugins', 'tempest', 'package.json'), 'utf8');
  const before = JSON.parse(source);
  const after = setPackageVersion(source, before.version, '99.98.97');
  assert.equal(JSON.parse(after).version, '99.98.97');
  assert.deepEqual(
    { ...JSON.parse(after), version: before.version },
    before,
    'no other field may change',
  );
  // Byte-level: only the version substring moved. Indentation, key order and the
  // trailing newline are all preserved, which a JSON round-trip would not promise.
  assert.equal(after.replace('99.98.97', before.version), source);
});

test('setPackageVersion refuses when the file is not what the caller read', () => {
  const source = '{\n  "name": "x",\n  "version": "1.0.0"\n}\n';
  assert.throws(() => setPackageVersion(source, '2.0.0', '2.0.1'), /reads "1\.0\.0"/);
  // Two version fields (a dependency block) — a blind regex would rewrite one of
  // them and the caller would never know which.
  const two = '{\n  "version": "1.0.0",\n  "deps": { "version": "9.9.9" }\n}\n';
  assert.throws(() => setPackageVersion(two, '1.0.0', '1.0.1'), /exactly one "version" field, found 2/);
  assert.throws(() => setPackageVersion('{}', '1.0.0', '1.0.1'), /found 0/);
});

// ---------------------------------------------------------------------------
// "Is there anything to ship?"
// ---------------------------------------------------------------------------

test('shouldRelease: the app changed since its last tag', () => {
  assert.equal(shouldRelease({ hasPreviousTag: true, changedFiles: 1 }), true);
  assert.equal(shouldRelease({ hasPreviousTag: true, changedFiles: 42 }), true);
});

test('shouldRelease: nothing changed — the empty release that actually happened', () => {
  // `just release-all` twice on 2026-07-13: six bumps, six tags, six CI deploys
  // of a byte-identical dist/. Under one trunk the question is asked of the app's
  // own directory, because main is ahead of every app's tag after any release.
  assert.equal(shouldRelease({ hasPreviousTag: true, changedFiles: 0 }), false);
});

test('shouldRelease: an app that has never been released always ships', () => {
  // There is no tag to diff against, and changedFiles cannot be computed — so the
  // absence of a previous tag must short-circuit before it is consulted.
  assert.equal(shouldRelease({ hasPreviousTag: false, changedFiles: 0 }), true);
});

test('shouldRelease: --force wins over both other clauses', () => {
  // The escape hatch for what the pathspec still cannot see (root build config).
  assert.equal(shouldRelease({ hasPreviousTag: true, changedFiles: 0, force: true }), true);
  assert.equal(shouldRelease({ hasPreviousTag: false, changedFiles: 0, force: true }), true);
});

test('changePathsFor asks about everything the app is built from, minus the registry', () => {
  // The first draft asked only about plugins/<id>, justified by a claim review
  // MEASURED as false: widening to src/shared costs nothing (a release commit
  // touches only <app>/package.json and src/host/registry.ts), and src/host —
  // which every plugin.ts imports from — is poisoned by that one file alone.
  // Without this, a src/shared-only fix plus `just release-all` shipped nothing,
  // exit 0, eight times over.
  assert.deepEqual(changePathsFor('tempest'), [
    'plugins/tempest',
    'src/shared',
    'src/host',
    'vite.config.ts',
    ':(exclude)src/host/registry.ts',
  ]);
  assert.deepEqual(changePathsFor('lobby')[0], 'lobby');
  for (const id of appIds()) {
    const paths = changePathsFor(id);
    assert.equal(paths[0], appDirFor(id), `${id}: its own directory must be first`);
    assert.ok(paths.includes('src/shared'), `${id}: a shared-code change must be visible`);
    assert.ok(paths.includes('src/host'), `${id}: a host change must be visible`);
    // The single vite config decides base, outDir, the alias map and the rollup
    // inputs for every app — build-app.mjs imports it. Omitting it repeats the
    // src/shared defect: a build-affecting change reading as "nothing to release".
    assert.ok(paths.includes('vite.config.ts'), `${id}: a vite config change must be visible`);
    // The exclusion is what keeps every OTHER app's release from looking like a
    // change to this one — every release rewrites the registry.
    assert.ok(
      paths.includes(':(exclude)src/host/registry.ts'),
      `${id}: without the exclusion this guard can never fire again`,
    );
    // Deliberately ABSENT, pinned so the next reader does not "complete the set".
    // Nothing in the gate type-checks (`grep -n tsc scripts/build-app.mjs` finds
    // nothing), so a TYPE-ONLY tsconfig change cannot reach dist/ and including
    // the file would guarantee a release of an unchanged artifact — the
    // 2026-07-13 empty-release bug through a different door.
    //
    // Not "tsconfig can never change dist/": esbuild reads a few options, and
    // `useDefineForClassFields: true` measurably changes dist/battlezone (the one
    // ES class in the shipped fleet). scripts/release.mjs carries the three-way
    // measurement and says why the exclusion is a policy call, not a proof.
    for (const out of ['tsconfig.json', 'package-lock.json']) {
      assert.ok(!paths.includes(out), `${id}: ${out} must stay out — it cannot change dist/`);
    }
  }
});

// ---------------------------------------------------------------------------
// The gate, and the two files that must never come back
// ---------------------------------------------------------------------------

test('the gate runs ONE app\'s project and ONE app\'s build', () => {
  // The claim this whole task rests on: a red joust must not block a tempest
  // release. Eight repos with eight suites became one suite with ten projects, so
  // `--project <id>` IS the isolation — an unfiltered `vitest run` would restore
  // the fleet-wide gate the collapse was supposed to survive.
  const steps = gateSteps('tempest');
  assert.equal(steps.length, 2, 'the gate is tests + build, both of them');
  assert.deepEqual(steps[0].args, ['vitest', 'run', '--project', 'tempest']);
  assert.equal(steps[0].cmd, 'npx');
  assert.deepEqual(steps[1].args, ['scripts/build-app.mjs', 'tempest']);
  assert.equal(steps[1].cmd, process.execPath, 'the build must run under this node, not a shell lookup');
  // Every step is the named app's, for every app — no cross-app leakage.
  for (const id of appIds()) {
    for (const step of gateSteps(id)) {
      assert.ok(step.args.includes(id), `${id}: a gate step does not name the app being released`);
    }
  }
});

test('every app id names a real vitest project — the gate cannot be vacuous', async () => {
  // The gate is `npx vitest run --project <id>`. An id with no matching project
  // is a startup error rather than a silent zero-test pass (measured on vitest
  // 4.1.10: "No projects matched the filter", exit 1), so the failure is loud —
  // but it is loud DURING a release, after the preflight has passed. Catching the
  // drift here means adding plugins/<newgame> without extending vitest.config.ts
  // reddens the suite instead of a release.
  const config = (await import('../vitest.config.ts')).default;
  const projects = config.test.projects.map((p) => p.test.name);
  for (const id of appIds()) {
    assert.ok(projects.includes(id), `no vitest project named "${id}" — the release gate would abort`);
  }
});

test('syncLobbyTileVersion and the hand-written lobby registry are gone, with no callers', async () => {
  // The tile version used to be COPIED into lobby/src/core/registry.ts by this
  // script, in the lobby's own checkout, on the lobby's develop, best-effort —
  // and it drifted (centipede's tile read 0.0.0 long after it shipped). It is
  // derived now. A reappearance means the second copy is back.
  const GONE = ['syncLobbyTileVersion', 'bumpRegistryVersion'];
  assert.ok(
    !existsSync(path('lobby', 'src', 'core', 'registry.ts')),
    'lobby/src/core/registry.ts is back — the generated registry is the only registry',
  );

  // Every script, not only release.mjs: a caller left anywhere fails at run time,
  // which for a release script means halfway through a release.
  //
  // Scanned as CODE, through the real scrubber the manifest reader uses — comments
  // are blanked, string contents are kept. Prose about the removal is exactly what
  // release.mjs's header should carry, and a scan that forbade the word there
  // would force the explanation out of the file that needs it.
  const { scrub } = await import('../scripts/build-app.mjs');
  const codeOf = (file) => scrub(readFileSync(path('scripts', file), 'utf8'), { strings: false });
  for (const file of readdirSync(path('scripts')).filter((f) => f.endsWith('.mjs'))) {
    for (const gone of GONE) {
      assert.ok(!codeOf(file).includes(gone), `scripts/${file} still has live code referencing ${gone}`);
    }
  }
  // The deleted PATH is checked against release.mjs alone: gen-registry.mjs emits
  // prose naming it (the generated header says what the file replaced), and that
  // is a true sentence, not a write to a file that no longer exists.
  assert.ok(
    !codeOf('release.mjs').includes('src/core/registry.ts'),
    'release.mjs still has live code pointing at the deleted lobby registry',
  );
  // Anti-vacuity: the scrubber must not be blanking the whole file out from under
  // the loop above — a scan of nothing passes every assertion in it.
  assert.ok(
    scrub(readFileSync(path('scripts', 'release.mjs'), 'utf8'), { strings: false }).includes(
      'export function releaseSteps',
    ),
    'the scrubbed source lost its own declarations — the loop above proves nothing',
  );

  // The justfile and the tests are held to the stricter rule: a COMMENT there
  // claiming the release script syncs the lobby tile is itself the defect, since
  // the behaviour it documents no longer exists.
  // This file necessarily names it — it is the guard — so it excludes itself.
  const grep = (term) =>
    spawnSync('git', ['grep', '-n', '-e', term, '--', 'tests', 'justfile', ':(exclude)tests/release.test.mjs'], {
      cwd: repo,
      encoding: 'utf8',
    });
  const hits = grep(GONE[0]);
  // git grep exits 1 for "no match" and >1 for a real error — a bad pathspec
  // returns empty stdout and empty stderr, byte-identical to clean.
  assert.ok(hits.status === 0 || hits.status === 1, `git grep failed (${hits.status}): ${hits.stderr}`);
  assert.equal(hits.stdout.trim(), '', `${GONE[0]} is still claimed by:\n${hits.stdout}`);
  // Anti-vacuity: the SAME invocation must find a term that really is in there,
  // or this leg reports "clean" for everything, for ever.
  const control = grep('release-all');
  assert.equal(control.status, 0, 'the control term was not found — this grep is searching nothing');
  assert.match(control.stdout, /^justfile:\d+:/m);
});

test('the CLI rejects an unknown option instead of ignoring it', () => {
  // This script pushes tags, and a tag push deploys. Someone typing a `--dry-run`
  // that does not exist and getting a REAL release out of it is the worst failure
  // this file could have, so unknown flags abort before any git command runs.
  //
  // The app id is deliberately one that CANNOT exist. This test spawns the real
  // CLI: with the flag check removed it would fall through to release(), and a
  // test that only avoids cutting a real release because the tree happens to be
  // dirty is not a test, it is a near miss. `nosuchapp` is refused by the id
  // check, and — if that were removed too — by the absent package.json, so no
  // mutation of this file can turn this line into a release.
  const cli = [path('scripts', 'release.mjs'), 'nosuchapp', 'patch', '--dry-run'];
  const result = spawnSync(process.execPath, cli, { cwd: repo, encoding: 'utf8' });
  assert.equal(result.status, 1, `expected exit 1, got ${result.status}\n${result.stderr}`);
  assert.match(result.stderr, /unknown option: --dry-run/);
  assert.match(result.stderr, /Usage: node scripts\/release\.mjs/);
  // It must have stopped before touching git: no fetch, no tag, no push.
  assert.equal(result.stdout.trim(), '', `it started working: ${result.stdout}`);
});

test('release() actually RUNS the gate, and runs it before the bump', () => {
  // gateSteps' shape is pinned above, but its shape is not its use: review deleted
  // the executor's four-line gate loop outright and the entire orchestrator suite
  // stayed green (337/336), because the only thing that had ever run the gate was
  // a sandbox release that does not persist.
  //
  // Nor can CI supply this guard. `node --test tests/**` in the deploy workflow
  // would catch the registry mutant after the fact, but a MISSING gate is only
  // observable when some other app is red — there is nothing for CI to see. So it
  // lives here, in the same source-text idiom as the preflight-ordering test
  // below, which is the only kind of assertion that can reach the executor
  // without a test that performs a release.
  const source = readFileSync(path('scripts', 'release.mjs'), 'utf8');
  const body = source.slice(source.indexOf('export function release('));
  const gate = body.indexOf('gateSteps(');
  const bump = body.indexOf('writeFileSync(pkgPath');
  assert.ok(gate >= 0, 'release() never calls gateSteps — a release could ship code it did not test');
  assert.ok(bump >= 0, 'release() never writes the bumped version — this test is reading the wrong function');
  assert.ok(gate < bump, 'the gate must run BEFORE the version is bumped, or a red app is left bumped');
});

test('release() rejects an unknown app before it runs any git command', () => {
  // The id check is FIRST in the preflight on purpose: `no such app` is a typo,
  // and a typo should not cost a fetch — or, if the later checks were ever
  // reordered, a bump of a package.json that does not exist.
  const source = readFileSync(path('scripts', 'release.mjs'), 'utf8');
  const body = source.slice(source.indexOf('export function release('));
  const check = body.indexOf('no such app');
  const firstGit = body.indexOf("out('git'");
  // Both must EXIST before they can be ordered. Measured: without this, deleting
  // the check outright made `-1 < 300` true and the test passed on its absence —
  // a mutation-found hole in this very assertion.
  assert.ok(check >= 0, 'the unknown-app check is gone');
  assert.ok(firstGit >= 0, 'no git command found — this test is reading the wrong function');
  assert.ok(check < firstGit, 'the unknown-app check must precede the first git command');
});
