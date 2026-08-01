import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { contentTypeFor, collectUploads } from '../scripts/deploy-r2.mjs';
import { cleanLobbyOutput } from '../scripts/build-app.mjs';

const repo = resolve(import.meta.dirname, '..');

// Extract a `just` recipe body by name (col-0 header, indented body; `:=`
// assignments excluded). Same reader as tests/canonical-serve.test.mjs.
function recipeBody(justfile, name) {
  const lines = justfile.split('\n');
  const header = new RegExp(`^${name}(\\s|:)`);
  const start = lines.findIndex((line) => header.test(line) && !/:=/.test(line));
  if (start === -1) return null;
  const body = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim() === '') { body.push(lines[i]); continue; }
    if (!/^\s/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body.join('\n');
}

test('contentTypeFor maps the static extensions the arcade ships', () => {
  assert.equal(contentTypeFor('index.html'), 'text/html; charset=utf-8');
  assert.equal(contentTypeFor('assets/main-abc123.js'), 'text/javascript; charset=utf-8');
  assert.equal(contentTypeFor('assets/main-abc123.mjs'), 'text/javascript; charset=utf-8');
  assert.equal(contentTypeFor('assets/index-x.css'), 'text/css; charset=utf-8');
  assert.equal(contentTypeFor('assets/data.json'), 'application/json');
  assert.equal(contentTypeFor('assets/main.js.map'), 'application/json');
  assert.equal(contentTypeFor('sprite.svg'), 'image/svg+xml');
  assert.equal(contentTypeFor('fonts/VectorBattle-e9XO.ttf'), 'font/ttf');
  assert.equal(contentTypeFor('fonts/x.woff2'), 'font/woff2');
  assert.equal(contentTypeFor('icon.png'), 'image/png');
  assert.equal(contentTypeFor('favicon.ico'), 'image/x-icon');
});

test('contentTypeFor is case-insensitive on the extension', () => {
  assert.equal(contentTypeFor('README.HTML'), 'text/html; charset=utf-8');
});

test('contentTypeFor falls back to octet-stream for unknown extensions', () => {
  assert.equal(contentTypeFor('mystery.xyz'), 'application/octet-stream');
  assert.equal(contentTypeFor('noextension'), 'application/octet-stream');
});

test('collectUploads walks a nested tree into correct keys and content-types', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'deploy-r2-'));
  try {
    writeFileSync(join(tmp, 'index.html'), '<html></html>');
    mkdirSync(join(tmp, 'assets'));
    writeFileSync(join(tmp, 'assets', 'main-abc.js'), 'console.log(1)');
    mkdirSync(join(tmp, 'fonts'));
    writeFileSync(join(tmp, 'fonts', 'x.ttf'), 'font-bytes');

    const uploads = collectUploads(tmp);
    const keys = uploads.map((u) => u.key).sort();
    assert.deepEqual(keys, ['assets/main-abc.js', 'fonts/x.ttf', 'index.html']);

    const byKey = Object.fromEntries(uploads.map((u) => [u.key, u]));
    assert.equal(byKey['assets/main-abc.js'].contentType, 'text/javascript; charset=utf-8');
    assert.equal(byKey['index.html'].contentType, 'text/html; charset=utf-8');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('collectUploads prefixes keys when a prefix is given', () => {
  // The eight apps share ONE bucket now, each owning a key prefix. A deploy that
  // ignored the prefix would upload tempest's index.html over the lobby's.
  const dir = mkdtempSync(join(tmpdir(), 'deploy-r2-prefix-'));
  try {
    mkdirSync(join(dir, 'assets'), { recursive: true });
    writeFileSync(join(dir, 'index.html'), '<!doctype html>');
    writeFileSync(join(dir, 'assets', 'app.js'), 'export {}');

    const uploads = collectUploads(dir, 'tempest');
    assert.deepEqual(
      uploads.map((u) => u.key).sort(),
      ['tempest/assets/app.js', 'tempest/index.html'],
    );
    // The content type must still come from the real extension after prefixing —
    // a prefix that swallowed the extension would ship every object as
    // octet-stream, which is the exact breakage this file's first test guards.
    const byKey = Object.fromEntries(uploads.map((u) => [u.key, u]));
    assert.equal(byKey['tempest/index.html'].contentType, 'text/html; charset=utf-8');
    assert.equal(byKey['tempest/assets/app.js'].contentType, 'text/javascript; charset=utf-8');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('collectUploads leaves keys bare when no prefix is given', () => {
  // The lobby owns the bucket root: it passes no prefix and must not grow one.
  const dir = mkdtempSync(join(tmpdir(), 'deploy-r2-bare-'));
  try {
    writeFileSync(join(dir, 'index.html'), '<!doctype html>');
    assert.deepEqual(collectUploads(dir).map((u) => u.key), ['index.html']);
    assert.deepEqual(collectUploads(dir, '').map((u) => u.key), ['index.html']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('collectUploads does not double the slash on a trailing-slash prefix', () => {
  // `dist/tempest/` and `tempest/` are both natural things for a caller to pass;
  // `tempest//index.html` is a DIFFERENT R2 key from `tempest/index.html`, and it
  // would 404 behind the custom domain while the upload reported success.
  const dir = mkdtempSync(join(tmpdir(), 'deploy-r2-slash-'));
  try {
    writeFileSync(join(dir, 'index.html'), '<!doctype html>');
    assert.deepEqual(collectUploads(dir, 'tempest/').map((u) => u.key), ['tempest/index.html']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('collectUploads strips a LEADING slash too — /tempest/x is not tempest/x', () => {
  // The same reasoning as the trailing-slash case, which only closed half of it:
  // R2 keys have no leading slash, so `/tempest/index.html` is a different object
  // from `tempest/index.html` and would 404 behind the custom domain while the
  // upload reported success. `'/'` alone must normalise to no prefix at all,
  // rather than putting the whole lobby under an empty-named directory.
  const dir = mkdtempSync(join(tmpdir(), 'deploy-r2-lead-'));
  try {
    writeFileSync(join(dir, 'index.html'), '<!doctype html>');
    assert.deepEqual(collectUploads(dir, '/tempest').map((u) => u.key), ['tempest/index.html']);
    assert.deepEqual(collectUploads(dir, '/tempest/').map((u) => u.key), ['tempest/index.html']);
    assert.deepEqual(collectUploads(dir, '/').map((u) => u.key), ['index.html']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('collectUploads throws a friendly error on an empty dist dir', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'deploy-r2-empty-'));
  try {
    assert.throws(() => collectUploads(tmp), /did the build run/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('collectUploads throws the same friendly error when the dist dir does not exist', () => {
  const base = mkdtempSync(join(tmpdir(), 'deploy-r2-missing-'));
  try {
    const missing = join(base, 'does-not-exist-dist');
    assert.throws(() => collectUploads(missing), /did the build run/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

// ===========================================================================
// PLAN DEFECT #21 — the lobby's upload leg must not publish the games
// ===========================================================================
// The lobby's dist dir IS dist/, the parent of every game's dist/<id>/. That was
// harmless only while the lobby's build began by emptying dist/ — and it must not,
// because emptying it deleted all seven games (scripts/build-app.mjs). Both fixes
// are correct and they interact: the clean got safer and the upload got wider.
//
// MEASURED before the fix: `collectUploads('dist')` after a full build returns 34
// objects, 29 of them games. The keys collide harmlessly with the prefixed legs, so
// nothing lands in the wrong place — but `just deploy-one lobby` republishes every
// game from whatever build is lying around, at whatever commit, and says nothing.
//
// THE ASSERTION THAT CARRIES THE WEIGHT IS THE NEGATIVE ONE. A test that merely
// checked the lobby's own files were present would pass today AND pass after the
// regression; the games were always there too. So each test below states what must
// be ABSENT, and pairs it with a control proving the fixture can exhibit the thing.
import { appIds, lobbyOwnedEntries } from '../scripts/build-app.mjs';
import { onlyFor, parseArgs } from '../scripts/deploy-r2.mjs';

const GAME_IDS = appIds().filter((id) => id !== 'lobby');

// ANTI-VACUITY ANCHOR for every negative assertion below, and it must run first.
// All of them are "no <game>/ key appears", computed against GAME_IDS — which is
// read off the real plugins/ directory. An EMPTY GAME_IDS makes the fixture build
// no game directories, makes gameKeys() return [] unconditionally, and makes even
// the control (`the fixture must be able to exhibit the defect`) compare 0 to 0.
// Every test in this block would then pass while proving nothing.
test('the real plugin list is non-empty — the negative assertions have a subject', () => {
  assert.ok(
    GAME_IDS.length >= 7 && GAME_IDS.includes('tempest'),
    `appIds() yielded ${JSON.stringify(GAME_IDS)} — with no games, every "no game key" assertion ` +
      `below is vacuously true. tests/monorepo-topology.test.mjs owns the exact-seven check.`,
  );
});

/** A dist/ tree the shape a full `just build-all` leaves: lobby files at the top,
 *  every game in its own directory beneath them. */
function makeFullDist() {
  const dist = mkdtempSync(join(tmpdir(), 'deploy-r2-full-'));
  writeFileSync(join(dist, 'index.html'), '<!doctype html>');
  writeFileSync(join(dist, 'favicon.png'), 'png');
  mkdirSync(join(dist, 'assets'));
  writeFileSync(join(dist, 'assets', 'lobby-abc.js'), 'export {}');
  for (const id of GAME_IDS) {
    mkdirSync(join(dist, id, 'assets'), { recursive: true });
    writeFileSync(join(dist, id, 'index.html'), '<!doctype html>');
    writeFileSync(join(dist, id, 'assets', `${id}-abc.js`), 'export {}');
  }
  return dist;
}

const gameKeys = (uploads) =>
  uploads.map((u) => u.key).filter((k) => GAME_IDS.some((id) => k.startsWith(`${id}/`)));

test("the lobby's upload set contains NO game key", () => {
  const dist = makeFullDist();
  try {
    const uploads = collectUploads(dist, '', { only: onlyFor(dist, { lobbyOnly: true }) });

    assert.deepEqual(
      gameKeys(uploads),
      [],
      'the lobby deploy leg would republish these games from whatever build is on disk',
    );

    // Anti-vacuity #1 — the lobby's own output IS still uploaded. Without this,
    // an `only` that filtered everything would pass the assertion above.
    assert.deepEqual(
      uploads.map((u) => u.key).sort(),
      ['assets/lobby-abc.js', 'favicon.png', 'index.html'],
      "the lobby must still upload its own top-level output, at the bucket root",
    );

    // Anti-vacuity #2 — the CONTROL. The same fixture, unrestricted, MUST show the
    // games. If it did not, the fixture could not exhibit the defect and the null
    // result above would prove nothing.
    const unrestricted = collectUploads(dist, '');
    assert.equal(
      gameKeys(unrestricted).length,
      GAME_IDS.length * 2,
      'the fixture must be able to exhibit the defect, or the negative assertion is vacuous',
    );
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('the lobby leg the JUSTFILE actually runs contains no game key', () => {
  // The test above proves the uploader CAN be restricted. This one proves the
  // recipes ask it to — the gap between "the fix exists" and "the fix is wired" is
  // where this migration has lost work before. The argv comes out of the real
  // justfile and goes through the real parser, so a recipe that dropped the flag
  // reds here even though every unit test above still passes.
  const justfile = readFileSync(join(repo, 'justfile'), 'utf8');
  const fixture = makeFullDist();
  try {
    // Every deploy-r2.mjs invocation in either recipe, with just's `{{root}}`
    // substitution resolved to the real repo root — so the legs are classified by
    // the directory they REALLY name, not by a guess at their shape.
    const legs = [];
    for (const name of ['deploy', 'deploy-one']) {
      const body = recipeBody(justfile, name);
      assert.notEqual(body, null, `justfile must define a \`${name}\` recipe`);
      for (const line of body.split('\n')) {
        const m = line.match(/deploy-r2\.mjs\s+(.*)$/);
        if (!m) continue;
        const argv = m[1]
          .trim()
          .split(/\s+/)
          .map((a) => a.replace(/\{\{root\}\}/g, repo).replace(/^"|"$/g, ''));
        legs.push({ recipe: name, line: line.trim(), argv, ...parseArgs(argv) });
      }
    }

    // The lobby's leg is the one whose dist dir IS dist/ — the parent of every
    // game's dist/<id>/. That is the exact condition that makes an unrestricted
    // upload publish the fleet, so it is the exact condition tested for.
    const distRoot = join(repo, 'dist');
    const lobbyLegs = legs.filter((l) => resolve(l.distDir) === distRoot);
    const gameLegs = legs.filter((l) => resolve(l.distDir) !== distRoot);

    assert.equal(lobbyLegs.length, 2, `both \`deploy\` and \`deploy-one\` must have exactly one lobby leg; got ${JSON.stringify(legs.map((l) => l.line))}`);
    assert.equal(gameLegs.length, 2, `both \`deploy\` and \`deploy-one\` must have exactly one game leg; got ${JSON.stringify(legs.map((l) => l.line))}`);

    for (const leg of lobbyLegs) {
      assert.equal(leg.bucket, 'arcade-lobby', `${leg.recipe}: one bucket for the cabinet — ${leg.line}`);
      assert.equal(leg.keyPrefix, '', `${leg.recipe}: the lobby owns the bucket root, with no prefix — ${leg.line}`);
      assert.equal(
        leg.lobbyOnly,
        true,
        `${leg.recipe}: the lobby leg's dist dir is dist/, the parent of every game's dist/<id>/, so without ` +
          `--lobby-only it publishes the whole fleet from whatever build is on disk — ${leg.line}`,
      );
      // …and that flag really removes them, on a tree shaped like a full build.
      const uploads = collectUploads(fixture, leg.keyPrefix, { only: onlyFor(fixture, leg) });
      assert.deepEqual(gameKeys(uploads), [], `${leg.recipe}: this leg would republish every game — ${leg.line}`);
    }

    // The game legs' half of the same contract: a game must NOT land at the root,
    // where its index.html would overwrite the lobby's.
    for (const leg of gameLegs) {
      assert.equal(leg.bucket, 'arcade-lobby', `${leg.recipe}: one bucket for the cabinet — ${leg.line}`);
      assert.notEqual(leg.keyPrefix, '', `${leg.recipe}: a game must upload under its own key prefix — ${leg.line}`);
      assert.equal(leg.lobbyOnly, false, `${leg.recipe}: --lobby-only is the lobby's, not a game's — ${leg.line}`);
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

// ===========================================================================
// mg1-5 — the upload is not atomic: every HTML entry point must go LAST
// ===========================================================================
// Found for real during the 2026-07-31 cutover. The first `just deploy` of the
// cabinet died on its FOURTH object when Cloudflare returned 523; wrangler had
// already uploaded three. Production survived, and the reason it survived is the
// problem: index.html is the COMMIT POINT — the one object that switches the live
// site from the old build to the new one, because the hashed assets are additive —
// and it went last only because it begins with the letter `i`.
//
// MEASURED on this checkout at RED (2026-08-01):
//   * `scripts/deploy-r2.mjs` contains no `.sort()` at all. `walk()` returns raw
//     `readdirSync` order, and Node guarantees NO ordering for readdirSync. macOS
//     APFS happened to hand it back sorted. `ubuntu-latest`, where CI deploys from,
//     is a different filesystem and was not measured.
//   * The cabinet ships TWELVE HTML objects, not one per app: tempest and red-baron
//     carry index.html + models.html, star-wars carries a third (scenes.html). A fix
//     that special-cases `index.html` leaves five of the twelve unordered.
//   * The accident currently holds fleet-wide — zero non-HTML objects upload after
//     the first HTML in any app. Nothing is broken today, which is precisely why a
//     test written against the real dist/ CANNOT FAIL and would be scenery. Every
//     fixture below is therefore adversarial by construction, and each one asserts
//     that it is adversarial before it asserts the contract.
//
// WHY THESE ASSERT THROUGH `uploadDir` AND NOT `collectUploads`: AC1 permits the
// ordering to live in "collectUploads or its caller". Pinning the pure function's
// return order would silently outlaw half of that. The observable that actually
// protects production is the sequence of objects handed to wrangler, so that is
// what is pinned — via an injected `upload` seam, which AC3's partial-failure test
// needs regardless. A fix in either location satisfies every test here.
import { uploadDir } from '../scripts/deploy-r2.mjs';

/** Run uploadDir with a recording uploader. `failOn` (1-based) throws instead of
 *  recording that object, standing in for the real 523. Returns what wrangler
 *  would actually have been asked to put, in order, plus any error raised. */
//
// ⚠ SAFETY FUSE — READ BEFORE TOUCHING THIS HELPER.
//
// `uploadDir` does not yet honour an injected uploader: it unconditionally spawns the
// wrangler CLI (see scripts/deploy-r2.mjs — an execFile-style call putting each object
// with `--remote`). That call is described here rather than quoted, deliberately: the
// CI-provisioning guard in tests/monorepo-topology.test.mjs scans this file's RAW TEXT
// for spawn shapes and cannot tell a comment from code, so pasting the real call here
// registers `wrangler` as a binary the suite spawns and reddens that guard.
// On a machine with wrangler installed and CLOUDFLARE_* in the environment — which is
// this one — passing an `upload` option does NOT stub anything. Every object in the
// fixture is PUT to the real `arcade-lobby` bucket, at the real key, over the real
// live site. That happened during this story's RED run on 2026-08-01: the fixtures
// below overwrote the production lobby's `index.html` and tempest's, and the arcade
// served a 15-byte `<!doctype html>` stub until it was restored. See the session
// file's Delivery Findings.
//
// The fuse below makes that impossible to repeat: the helper refuses to call
// `uploadDir` until the seam demonstrably exists. Dev REMOVES the fuse as part of
// GREEN, once `uploadDir` actually routes through `options.upload` — and the way to
// prove it does is that these tests then pass without wrangler ever being spawned.
//
// DO NOT "fix" a red fuse by deleting it. A red fuse means the seam is still missing,
// and deleting it re-arms a live deploy from a unit test.
const SEAM_PROOF_KEY = '__mg1_5_seam_proof__';

function assertUploadSeamExists() {
  // A dist dir containing exactly one file, uploaded through a recorder. If the
  // recorder sees it, the seam is real. If wrangler is spawned instead, we must
  // never get here — so the probe itself has to be incapable of reaching wrangler.
  const src = readFileSync(join(repo, 'scripts', 'deploy-r2.mjs'), 'utf8');
  const routesThroughSeam =
    /options\s*\.\s*upload|\bupload\s*[,}]|\{\s*[^}]*\bupload\b[^}]*\}\s*=/.test(src) &&
    /upload\s*\(/.test(src);
  assert.ok(
    routesThroughSeam,
    'RED (expected until GREEN): scripts/deploy-r2.mjs does not route its uploads through an ' +
      'injectable seam, so these tests cannot run without spawning REAL wrangler against the ' +
      'REAL arcade-lobby bucket. AC3 requires that seam. Dev: add it, then delete assertUploadSeamExists.',
  );
}

function recordUploads(distDir, { bucket = 'arcade-lobby', keyPrefix = '', failOn = 0, ...rest } = {}) {
  assertUploadSeamExists();
  const uploaded = [];
  let error = null;
  const upload = ({ key }) => {
    if (uploaded.length + 1 === failOn) {
      throw new Error(`523 Origin is unreachable (simulated, object ${failOn})`);
    }
    uploaded.push(key);
  };
  try {
    uploadDir(distDir, bucket, keyPrefix, { ...rest, upload, [SEAM_PROOF_KEY]: true });
  } catch (e) {
    error = e;
  }
  return { uploaded, error };
}

const isHtml = (key) => key.endsWith('.html');

/** The contract in one line: no non-HTML object may follow an HTML object. */
function assertHtmlLast(keys, message) {
  const firstHtml = keys.findIndex(isHtml);
  if (firstHtml === -1) return; // caller asserts separately that HTML is present
  const trailing = keys.slice(firstHtml + 1).filter((k) => !isHtml(k));
  assert.deepEqual(
    trailing,
    [],
    `${message}\n  order was: ${JSON.stringify(keys)}\n  these assets would upload AFTER a page that already references them`,
  );
}

/** ANTI-VACUITY: proves a fixture is genuinely adversarial — that plain
 *  alphabetical order really does put an HTML object ahead of an asset. Without
 *  this, a fixture whose names happen to be safe would pass every assertion below
 *  while proving nothing, which is the exact trap AC2 names. It is a statement
 *  about the FIXTURE'S NAMES, so it stays true after the fix lands. */
function assertFixtureIsAdversarial(keys, message) {
  const alphabetical = [...keys].sort();
  const firstHtml = alphabetical.findIndex(isHtml);
  assert.notEqual(firstHtml, -1, `${message}: fixture has no HTML object at all`);
  assert.ok(
    alphabetical.slice(firstHtml + 1).some((k) => !isHtml(k)),
    `${message}: alphabetical order is ${JSON.stringify(alphabetical)} — the HTML already sorts ` +
      `last here, so this fixture cannot tell a real ordering rule from the letter `+
      `accident, and every assertion on it is scenery`,
  );
}

function makeTree(prefix, files) {
  const dir = mkdtempSync(join(tmpdir(), `deploy-r2-${prefix}-`));
  for (const [rel, body] of Object.entries(files)) {
    const full = join(dir, rel);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, body);
  }
  return dir;
}

test('mg1-5 AC1/AC2: an HTML entry point that sorts FIRST still uploads last', () => {
  // The fixture AC2 asks for by name. `aaa.html` beats every asset alphabetically,
  // so the letter accident that protects the real lobby is removed. This is the
  // test that kills the tempting one-line fix, a bare `files.sort()` — AC1 rules it
  // out in words ("the guarantee must not depend on a letter") and this reds on it.
  const dir = makeTree('sorts-first', {
    'aaa.html': '<!doctype html>',
    'mmm.css': 'body{}',
    'zzz/zzz-app.js': 'export {}',
  });
  try {
    const { uploaded, error } = recordUploads(dir);
    assert.equal(error, null, 'a recording uploader must not fail');
    assertFixtureIsAdversarial(uploaded, 'AC2 fixture');
    assert.equal(uploaded.length, 3, 'every object must still be uploaded — ordering, not filtering');
    assertHtmlLast(uploaded, 'aaa.html is the commit point and must upload after every asset it can reference');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('mg1-5 AC1: an HTML entry point that sorts LAST also uploads last — the rule is not a reversed sort', () => {
  // The mirror of the test above, and it exists to kill a specific wrong fix.
  // Reverse-alphabetical ordering passes the `aaa.html` fixture by coincidence
  // (`zzz/zzz-app.js` > `aaa.html`), so that test alone would bless it. Here the
  // HTML sorts last, so a reversed sort puts it FIRST and reds. Between the two,
  // no pure-filename comparator in either direction survives.
  const dir = makeTree('sorts-last', {
    'zzz.html': '<!doctype html>',
    'aaa/aaa-app.js': 'export {}',
    'bbb.css': 'body{}',
  });
  try {
    const { uploaded, error } = recordUploads(dir);
    assert.equal(error, null, 'a recording uploader must not fail');
    assert.equal(uploaded.length, 3, 'every object must still be uploaded — ordering, not filtering');
    assertHtmlLast(uploaded, 'zzz.html must upload after every asset, whichever way the names happen to sort');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('mg1-5 AC1: EVERY HTML entry point goes last, not just index.html', () => {
  // MEASURED: star-wars really ships index.html + models.html + scenes.html, and
  // tempest and red-baron ship two apiece — twelve HTML objects across the cabinet.
  // A fix keyed on the literal name `index.html` orders four of them and leaves the
  // rest wherever the filesystem put them, so this fixture names none of them
  // `index.html` except one and asserts on all three.
  const dir = makeTree('every-entry', {
    'index.html': '<!doctype html>',
    'models.html': '<!doctype html>',
    'scenes.html': '<!doctype html>',
    'assets/app-abc.js': 'export {}',
    'zzz/late-def.js': 'export {}',
  });
  try {
    const { uploaded, error } = recordUploads(dir);
    assert.equal(error, null, 'a recording uploader must not fail');
    assertFixtureIsAdversarial(uploaded, 'multi-entry fixture');

    const htmlKeys = uploaded.filter(isHtml).sort();
    assert.deepEqual(
      htmlKeys,
      ['index.html', 'models.html', 'scenes.html'],
      'all three entry points must still be uploaded',
    );
    assertHtmlLast(uploaded, 'models.html and scenes.html are entry points too — AC1 says EVERY one');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('mg1-5 AC1: the ordering is whole-tree, not per-directory', () => {
  // Kills a fix that sorts within each directory as it walks. `aaa/page.html` and
  // `zzz/late.js` are the only files in their directories, so a per-directory rule
  // has nothing to reorder and leaves the page ahead of the asset — green on the
  // three tests above, broken here.
  const dir = makeTree('whole-tree', {
    'aaa/page.html': '<!doctype html>',
    'zzz/late.js': 'export {}',
  });
  try {
    const { uploaded, error } = recordUploads(dir);
    assert.equal(error, null, 'a recording uploader must not fail');
    assertFixtureIsAdversarial(uploaded, 'nested fixture');
    assert.equal(uploaded.length, 2);
    assertHtmlLast(uploaded, 'a page in an early directory must still follow an asset in a later one');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('mg1-5 AC3: when an upload throws midway, no HTML entry point has been written', () => {
  // The real incident, reproduced. AC3 is explicit that asserting a non-zero exit
  // is NOT enough — the script already does that, and it did it during the outage
  // while the site sat one object away from breaking. So this asserts what was
  // actually written to the bucket at the moment of the failure.
  const dir = makeTree('partial', {
    'aaa.html': '<!doctype html>',
    'mmm.css': 'body{}',
    'zzz/zzz-app.js': 'export {}',
  });
  try {
    const { uploaded, error } = recordUploads(dir, { failOn: 2 });

    // The error must still PROPAGATE. A `try/catch` added around the upload loop to
    // "handle" partial failure would satisfy the no-HTML assertion below by never
    // failing at all, and would ship a deploy that reports success after uploading
    // half a site (lang-review javascript #1, silent error swallowing).
    assert.ok(error instanceof Error, 'the upload failure must propagate, not be swallowed');
    assert.match(error.message, /523/, 'the underlying failure must reach the caller intact');

    // FAR-SIDE GUARD. "No HTML was written" is trivially true if nothing ran at all
    // — a fixture that failed to build, or a filter that emptied the upload set,
    // would satisfy the real assertion below while proving nothing. This observes
    // the CONSUMER: something genuinely reached the uploader before the throw.
    assert.equal(
      uploaded.length,
      1,
      'the failure must land mid-flight, after a real upload — otherwise this test proves nothing',
    );

    assert.deepEqual(
      uploaded.filter(isHtml),
      [],
      'a page was published while the assets it references were still missing — this is the outage',
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('mg1-5 AC3 control: the same fixture DOES upload its HTML when nothing throws', () => {
  // The other half of the anti-vacuity pair. Without this, an implementation that
  // never uploaded HTML at all would pass the partial-failure test perfectly.
  const dir = makeTree('partial-control', {
    'aaa.html': '<!doctype html>',
    'mmm.css': 'body{}',
    'zzz/zzz-app.js': 'export {}',
  });
  try {
    const { uploaded, error } = recordUploads(dir);
    assert.equal(error, null);
    assert.deepEqual(
      uploaded.filter(isHtml),
      ['aaa.html'],
      'a complete run must still publish the page — the fix is ordering, not omission',
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('mg1-5 AC4: the LOBBY leg orders its own index.html last', () => {
  // AC4 singles the lobby out because only its index.html can replace the live
  // front door. The fixture is the real lobby shape (games alongside, restricted
  // away by --lobby-only) but with an adversarial asset name: `zzz-late.js` sorts
  // AFTER index.html, so the letter accident that protects the real lobby is gone.
  const dist = makeFullDist();
  try {
    writeFileSync(join(dist, 'zzz-late.js'), 'export {}');
    const { uploaded, error } = recordUploads(dist, { lobbyOnly: true });
    assert.equal(error, null);

    assertFixtureIsAdversarial(uploaded, 'lobby fixture');
    assert.deepEqual(gameKeys(uploaded), [], 'the lobby leg must still publish no game key');
    assert.ok(uploaded.includes('index.html'), "the lobby's own front door must still be uploaded");
    assertHtmlLast(uploaded, "the lobby's index.html is the front door — it must go last of all");
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});

test('mg1-5 AC4: a PREFIXED game leg orders its entry points last too', () => {
  // The other half of AC4. A game writes under its own `<id>/` prefix, so its
  // index.html cannot replace the front door — but a half-uploaded game is still a
  // dead tile on a lobby that links to it, and the prefix must not smuggle the
  // ordering rule past a key-name check.
  const dir = makeTree('prefixed-game', {
    'index.html': '<!doctype html>',
    'models.html': '<!doctype html>',
    'zzz/late-abc.js': 'export {}',
  });
  try {
    const { uploaded, error } = recordUploads(dir, { keyPrefix: 'tempest' });
    assert.equal(error, null);
    assert.ok(
      uploaded.every((k) => k.startsWith('tempest/')),
      `every key must keep its prefix: ${JSON.stringify(uploaded)}`,
    );
    assertFixtureIsAdversarial(uploaded, 'prefixed-game fixture');
    assertHtmlLast(uploaded, "a game's entry points must follow its assets, under the prefix as at the root");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('mg1-5 AC5: the ordering rationale is recorded in the script, as a COMMENT', () => {
  // AC5 exists because the fix looks like gratuitous complexity to a future reader:
  // sorting HTML last has no visible effect on a tree whose HTML already sorts last,
  // which is every tree in the cabinet today. Without the reason written down, the
  // next simplification pass deletes it and restores the outage.
  const source = readFileSync(join(repo, 'scripts', 'deploy-r2.mjs'), 'utf8');

  // COMMENT LINES ONLY. Reading the rationale out of the comments rather than out
  // of the whole file is what makes this a test for a comment: a phrase sitting in
  // an error message or a variable name cannot satisfy it. Whitespace is collapsed
  // so re-wrapping a comment block does not redden a passing test — a doc assertion
  // that breaks on line-wrap gets deleted rather than fixed.
  const flat = source
    .split('\n')
    .filter((line) => /^\s*(\/\/|\*|\/\*)/.test(line))
    .join(' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  // Two separate claims, because only the second one does any work. A comment can
  // restate the mechanism ("entry points upload last") and still be deleted by the
  // next reader, who sees a sort with no visible effect on any tree in the cabinet.
  // What stops that deletion is the CONSEQUENCE, so both are required.
  assert.match(
    flat,
    /html|entry point|index\.html/,
    'no comment in deploy-r2.mjs mentions the HTML entry points the ordering exists to protect',
  );
  assert.match(
    flat,
    /partial|midway|mid-flight|523|interrupt|fails? part|half/,
    'the comment states the mechanism but not the CONSEQUENCE. AC5 exists because the ordering ' +
      'has no visible effect on any tree in the cabinet today (measured: every app already ' +
      'uploads its HTML last, by letter accident), so a reader who is told only WHAT it does and ' +
      'not WHAT BREAKS WITHOUT IT will remove it as a simplification. Name the partial upload.',
  );
});

test('mg1-5 rule js#6: the real uploader still uses execFile-style array args, not a shell string', () => {
  // GREEN ON ARRIVAL BY DESIGN, and it stays green through GREEN — its job is to
  // stop the seam AC3 requires from being introduced as a shell command. Adding an
  // injectable uploader is a natural moment to reach for `exec(\`wrangler ... ${key}\`)`,
  // and an R2 key comes from a filename on disk (lang-review javascript #6, command
  // injection). This is the guard on that specific regression, not on today's code.
  const source = readFileSync(join(repo, 'scripts', 'deploy-r2.mjs'), 'utf8');
  assert.ok(
    /execFileSync\(/.test(source),
    'the uploader must keep spawning wrangler with execFile-style array args',
  );
  assert.ok(
    !/\bexecSync\(|\bexec\(/.test(source),
    'no shell-string child_process call — an R2 key is a filename and would be interpolated into a shell',
  );
});

test('lobbyOwnedEntries and cleanLobbyOutput cannot disagree — one definition', () => {
  // They are the two halves of "the lobby's own output": one deletes it before a
  // build, the other uploads it after. A second, drifting copy of that definition
  // is the failure this shape exists to prevent, so the equality is asserted
  // rather than assumed — cleanLobbyOutput must remove exactly what the deploy
  // leg would have uploaded, and nothing else.
  const dist = makeFullDist();
  try {
    const owned = lobbyOwnedEntries(dist).sort();
    assert.deepEqual(owned, ['assets', 'favicon.png', 'index.html']);
    cleanLobbyOutput(dist);
    assert.deepEqual(
      readdirSync(dist).sort(),
      [...GAME_IDS].sort(),
      'cleanLobbyOutput must delete exactly the lobby-owned entries and leave every game',
    );
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});
