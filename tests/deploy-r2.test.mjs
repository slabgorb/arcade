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
