// Story 7-7 — Canonical arcade server (hardened by 7-8; reframed for R2 hosting;
// REWRITTEN by Task 19 of the monorepo migration).
//
// The contract this file guards is unchanged in intent: there is ONE authoritative
// way to serve the arcade in dev, it lives at the orchestrator root, and the docs
// say so. What changed is the shape of "one way". It used to mean one recipe that
// launched EIGHT dev servers on eight pinned ports through scripts/serve.mjs; it
// now means one Vite dev server on one port, and both the recipe's supervisor and
// the fleet it supervised are deleted.
//
// RETIRED HERE BY TASK 19, quoted by exact old title so the accounting is auditable:
//
//   * `AC2: canonical `serve` launches the lobby and the game subrepos`
//     It called jobsFor() from scripts/serve.mjs — the spawn table for the eight-
//     server fleet — and asserted every entry of the justfile `games` list appeared
//     in it. There is no fleet and no spawn table. Its successor is the behavioural
//     test at the bottom of this file, which asks the stronger question the old one
//     could not: not "would the launcher spawn a server for tempest" but "what does
//     the one server actually return for /tempest/".
//
//   * `AC2: the canonical serve set (`subrepos` / install-all) includes the lobby`
//     `subrepos` is not a variable whose value changed; it is a concept that stopped
//     existing. `install-all` is `npm install` — one install for the whole cabinet —
//     so there is no set for the lobby to be missing from.
//
//   * `AC2: each canonical serve doc references both pinned ports (5273 tempest,
//     5270 lobby)`
//     Half of it survives below, read from the config instead of a literal. The
//     tempest half asserted a port that no longer exists: eight pinned ports are
//     one.
//
//     RESOLVED BY TASK 22, the docs task this note was addressed to. CLAUDE.md and
//     README.md carried the eight-port table and the eight-subrepo layout
//     wholesale; both are rewritten, and the surviving assertion below now lands on
//     single-port prose rather than on a retired table's lobby row — which is what
//     it was previously satisfied by, making it green off the very staleness it was
//     meant to outlive. Still deliberately NOT asserted: the ABSENCE of 5273. A
//     doc may legitimately mention an old port while explaining the collapse, and
//     an absence test would be a tripwire on prose rather than on the pin.
//
// They do not touch the operator's live infrastructure (R2 buckets, CI runs);
// that is a runtime fact, not an in-repo one.
//
// Run from the orchestrator root: `npm run test:orchestrator`.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relPath) => readFileSync(join(root, relPath), 'utf8');

/** A short content fingerprint. Bodies are compared BY HASH, never by value: the
 *  pages here are ~16KB and the modules carry an inline base64 sourcemap, so an
 *  assertion on the raw strings buries its own failure message under tens of
 *  kilobytes of diff. The identity being asserted is the same either way. */
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);

/** The `<title>` of an HTML file, or null. Read from disk — never hardcoded, so
 *  renaming a game cannot leave this suite asserting a title nothing serves. */
const titleOf = (htmlOrPath, fromDisk = false) => {
  const html = fromDisk ? read(htmlOrPath) : htmlOrPath;
  return (html.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? null;
};

/** Every app id under plugins/, read from the directory rather than listed.
 *  scripts/build-app.mjs and the deploy workflow already read plugins/ directly;
 *  a hand-maintained list here would be a fourth copy free to drift. */
const gameIds = () =>
  readdirSync(join(root, 'plugins'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

// Extract a `just` recipe body by name. A recipe header sits at column 0
// (`name:`, `name args:`, or `name: deps`); its body lines are indented.
//
// A variable assignment (`name := "value"`) also starts at column 0 and begins
// with the same token, so the `name `-space alternative would otherwise match it.
// `:=` is `just`'s assignment operator and never appears in a recipe header, so
// excluding any line containing `:=` keeps `serve :=` from masquerading as the
// `serve` recipe.
function recipeBody(justfile, name) {
  const lines = justfile.split('\n');
  const header = new RegExp(`^${name}(\\s|:)`);
  const isAssignment = /:=/;
  const start = lines.findIndex((line) => header.test(line) && !isAssignment.test(line));
  if (start === -1) return null;
  const body = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      body.push(line);
      continue;
    }
    if (!/^\s/.test(line)) break; // a non-indented line ends the recipe
    body.push(line);
  }
  return body.join('\n');
}

/** A recipe body with its `#` comment lines stripped — the commands, not the prose. */
const commandsOf = (body) =>
  body
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');

// --- AC2: one launch command at the orchestrator ---------------------------

test('AC2: justfile defines a single canonical `serve` recipe', () => {
  const body = recipeBody(read('justfile'), 'serve');
  assert.notEqual(
    body,
    null,
    'expected a `serve` recipe in justfile as the single canonical launch command for the arcade',
  );
});

test('AC2: canonical `serve` runs the one root vite, not a fleet launcher', () => {
  const body = commandsOf(recipeBody(read('justfile'), 'serve') ?? '');
  assert.match(body, /\bvite\b/, 'the canonical `serve` recipe must run vite');
  // The supervisor and the dependency doctor existed only to orchestrate eight
  // subrepos. A recipe still invoking either is a recipe that will die on a
  // missing module the first time anyone runs it.
  assert.doesNotMatch(body, /serve\.mjs/, 'scripts/serve.mjs is deleted — the fleet it launched is gone');
  assert.doesNotMatch(body, /deps-doctor/, 'scripts/deps-doctor.mjs is deleted — there is no @arcade/shared pin left to reconcile');
});

test('AC2: the pin comes from the config, so a BARE `npx vite` is pinned too', () => {
  // The recipe deliberately passes no --port/--strictPort/--host. If it did, the
  // pin would protect `just serve` and nothing else: every other way anyone starts
  // the dev server (`npx vite`, an editor task, a doc's copy-paste) would be
  // unpinned, and an unpinned host is exactly how a sibling checkout binds
  // [::1]:5270 beside this one's 127.0.0.1:5270 with no collision error at all.
  const body = commandsOf(recipeBody(read('justfile'), 'serve') ?? '');
  for (const flag of ['--port', '--strictPort', '--host']) {
    assert.doesNotMatch(
      body,
      new RegExp(flag.replace(/-/g, '\\-')),
      `\`serve\` must not pass ${flag} — the pin belongs in vite.config.ts, where it also covers a bare \`npx vite\``,
    );
  }
  // …and it is genuinely there to be inherited.
  const config = read('vite.config.ts');
  assert.match(config, /strictPort:\s*true/, 'vite.config.ts must pin strictPort');
  assert.match(config, /host:\s*'127\.0\.0\.1'/, "vite.config.ts must pin host to '127.0.0.1'");
});

// --- docs name the canonical command and the repo-not-directory rule --------

test('CLAUDE.md documents the canonical serve workflow (`just serve`)', () => {
  const claude = read('CLAUDE.md');
  assert.match(claude, /just serve/, 'CLAUDE.md must document the `just serve` command');
  assert.match(
    claude,
    /canonical/i,
    'CLAUDE.md must describe serving the arcade as the single canonical workflow',
  );
});

test('CLAUDE.md defines production as R2, with `just serve` as the dev loop', () => {
  const claude = read('CLAUDE.md');
  // The orchestrator repo is `arcade`; the checkout directory carries no authority.
  assert.match(
    claude,
    /directory name/i,
    'CLAUDE.md must address the directory name explicitly — it carries no authority; every checkout is equally `arcade`',
  );
  assert.match(claude, /R2/, 'CLAUDE.md must describe production as served from Cloudflare R2');
  assert.match(claude, /just serve/, 'CLAUDE.md must still document `just serve` as the local dev loop');
  assert.match(claude, /just deploy/, 'CLAUDE.md must document `just deploy` as the way to update the live arcade');
  assert.match(claude, /just release/, 'CLAUDE.md must document `just release` as the normal path to production');
});

test('AC5: README documents the canonical serve command (`just serve`)', () => {
  assert.match(
    read('README.md'),
    /just serve/,
    'README must point developers at `just serve` instead of ad-hoc per-game servers',
  );
});

test('AC2: each canonical serve doc references THE pinned port', async () => {
  // Read from the factory, never a literal: a doc and a config that disagree is
  // the whole hazard, and a hardcoded constant here could drift from both.
  const { defineAppConfig } = await import('../vite.config.ts');
  const port = String(defineAppConfig({ id: 'lobby' }).server.port);
  for (const file of ['CLAUDE.md', 'README.md']) {
    assert.match(read(file), new RegExp(port), `${file} must reference the pinned port ${port}`);
  }
});

// --- docs: strictPort gives exactly one owner of the pinned port ------------

test('docs explain that strictPort lets only one server own the pinned port', () => {
  const docs = read('CLAUDE.md') + '\n' + read('README.md');
  assert.match(
    docs,
    /strictPort/,
    'docs must reference strictPort, which pins the port so only one server can hold it',
  );
  assert.match(
    docs,
    /fails? loudly|errors? out|only one server/i,
    'docs must explain a port collision fails loudly — no silent rival copy on the pinned port',
  );
});

// ---------------------------------------------------------------------------
// What the one dev server ACTUALLY serves — behavioural, not declarative
// ---------------------------------------------------------------------------
//
// RETIRED HERE BY mg1-2, quoted by exact old title so the accounting is auditable:
//
//   * `the dev server serves the LOBBY at every path (a game path is not a game)`
//     It asserted that `/<id>/` returned bytes IDENTICAL to the nonsense control
//     `/banana/` — the operational statement of "the dev server does not serve the
//     games". It was correct, it was deliberately built to redden the day someone
//     wired the games in, and this is that day. It is not deleted: AC3 requires the
//     invariant MOVE rather than evaporate, so the same machinery — one spawned
//     vite, one nonsense control, one body comparison — survives below with the
//     comparison INVERTED. Identical became distinct. Everything that made the old
//     assertion unfakeable by a fallback makes the new one unfakeable too.
//
// The vacuity trap that shaped both versions is unchanged and still live: an
// all-200 sweep of `/`, `/tempest/`, `/star-wars/` … passes against a server that
// serves ONE app at every URL, because a blanket SPA fallback answers 200 to
// everything. That is why there is a control, and why `/banana/` — not an app, not
// a plugin directory, not a route — is compared against rather than merely listed.
//
// mg1-2 MEASURED two further things on 2026-07-31, before writing any of this, and
// both are the reason the tests below assert what they do:
//
//   1. `/tempest/src/main.ts` returned **200 with content-type text/html** — the
//      fallback, serving the lobby's page in place of a module that does not
//      resolve. So "the game's script loads" CANNOT be tested by status alone: a
//      200 is exactly what the broken server already gives. The module tests below
//      assert the content-type and compare against the lobby's own module.
//   2. Every plugin's index.html and lobby/index.html BOTH reference the same
//      absolute specifier `/src/main.ts`. Under the current per-app `root` that is
//      unambiguous; under any server rooted higher up it is a collision, and the
//      losing side gets the lobby's bootstrap while still looking like JavaScript.
//
// The suite therefore asks four separate questions, because passing the first three
// while failing the fourth is a dev server that renders a game page and then dies:
//   is it a DIFFERENT page than the control · is it THIS game's page · does a
//   sub-entry resolve to its OWN file · does the game's module actually load.
//
// IF YOU ARE READING THIS BECAUSE IT WENT RED: the dev server has stopped serving
// the cabinet. Start at vite.config.ts — its default export is what decides this.

describe('the one dev server serves the whole cabinet, not one app at every path', () => {
  // A spare port, passed on the CLI. The pinned 5270 is deliberately NOT used: a
  // sibling checkout (a-1, a-3) may legitimately hold it, and this suite is about
  // WHAT is served, not about the pin — the pin is proven separately and
  // behaviourally by `strictPort is real, not just declared` in
  // tests/monorepo-topology.test.mjs.
  //
  // 54xx, not the 5290-5329 the predecessor drew from: CLAUDE.md tells developers
  // to run `npx vite --port 5290 --strictPort` to serve their own tree beside a
  // sibling's server, so that range is the one most likely to be occupied on a
  // working machine — and with strictPort a collision kills the server, failing
  // this suite for a reason that has nothing to do with the cabinet. Nothing in
  // the repo documents 54xx.
  const port = 5400 + Math.floor(Math.random() * 100);
  let vite;
  let output = '';

  /** GET a path off the dev server. Returns status, content-type and body. */
  const get = async (path) => {
    const res = await fetch(`http://127.0.0.1:${port}/${path}`);
    return { status: res.status, type: res.headers.get('content-type') ?? '', body: await res.text() };
  };

  before(async () => {
    vite = spawn('node_modules/.bin/vite', ['--port', String(port), '--strictPort'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    vite.stdout.on('data', (b) => (output += b.toString()));
    vite.stderr.on('data', (b) => (output += b.toString()));

    // Poll for readiness rather than sleeping: a fixed sleep either flakes on a
    // slow machine or wastes the difference on a fast one.
    let ready = null;
    for (let i = 0; i < 100 && ready === null; i++) {
      try {
        ready = await get('');
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    assert.notEqual(ready, null, `the dev server never accepted a connection on ${port}. Output:\n${output}`);
  });

  after(() => vite?.kill('SIGKILL'));

  test('the lobby is still the front door at /', { timeout: 60_000 }, async () => {
    // A regression guard, not a new requirement. The lobby owns `/` because it owns
    // the bucket's root keys in production; a change that serves the games by
    // demoting the front door has broken the thing it was meant to extend.
    const res = await get('');
    assert.equal(res.status, 200, `the dev server must serve the lobby at /. Output:\n${output}`);
    assert.equal(titleOf(res.body), titleOf('lobby/index.html', true), 'the root must be the lobby');
  });

  test('AC2/AC3: every game path DIFFERS from the nonsense control', { timeout: 60_000 }, async () => {
    const games = gameIds();
    // Anti-vacuity on the LIST itself: a for-loop over an empty array asserts
    // nothing and reports success. If plugins/ ever fails to enumerate, this suite
    // must fail loudly rather than pass by iterating zero times.
    assert.ok(
      games.length >= 7,
      `expected at least the seven games under plugins/, found ${games.length} (${games.join(', ')}) — ` +
        `if this list is empty every loop below passes vacuously`,
    );

    const control = await get('banana/');

    // Anti-vacuity on the CONTROL. Under the old (identical-bytes) assertion the
    // risk was comparing errors to errors; under DIFFERS it is subtler — anything
    // unstable makes "differs" trivially true. Pin it to today's behaviour: an
    // unknown path is the lobby's SPA fallback.
    assert.equal(
      control.status,
      200,
      `the control /banana/ returned ${control.status}. If you deliberately made unknown paths 404, that ` +
        `is a change to unknown-path handling that mg1-2 does not ask for — log a design deviation and ` +
        `re-point this assertion, rather than letting the control silently become an error page.`,
    );
    assert.equal(
      titleOf(control.body),
      titleOf('lobby/index.html', true),
      `the control /banana/ must be the lobby's SPA fallback — it is not an app, not a plugin directory ` +
        `and not a route, so whatever answers it is the fallback by construction.`,
    );

    for (const game of games) {
      const res = await get(`${game}/`);
      assert.notEqual(
        hash(res.body),
        hash(control.body),
        `/${game}/ returned bytes IDENTICAL to the nonsense control /banana/ (both sha256:${hash(control.body)}, ` +
          `<title>${titleOf(control.body)}</title>), which means it is the fallback and not ${game}. The dev ` +
          `server is serving one app at every path. Fix vite.config.ts's default export — it is the file ` +
          `that causes this.`,
      );
    }
  });

  test('AC1: each game path serves THAT game, not merely something non-control', { timeout: 60_000 }, async () => {
    // "Differs from the control" alone is satisfiable by a server that serves ONE
    // game at all seven paths — every path would differ from /banana/ and the
    // previous test would pass. Identity is what closes that hole, and it is read
    // from each plugin's own index.html on disk so the suite cannot drift from a
    // rename.
    const games = gameIds();
    const lobbyTitle = titleOf('lobby/index.html', true);
    const seen = new Map();

    for (const game of games) {
      const expected = titleOf(`plugins/${game}/index.html`, true);
      assert.ok(expected, `plugins/${game}/index.html has no <title> to identify it by`);

      const res = await get(`${game}/`);
      assert.equal(res.status, 200, `/${game}/ returned ${res.status}`);
      assert.equal(
        titleOf(res.body),
        expected,
        `/${game}/ served <title>${titleOf(res.body)}</title>, but plugins/${game}/index.html is ` +
          `<title>${expected}</title>. The path resolved to the wrong app's entry point.`,
      );
      assert.notEqual(
        titleOf(res.body),
        lobbyTitle,
        `/${game}/ served the lobby. A game path must resolve into plugins/${game}/, not into lobby/.`,
      );
      seen.set(game, hash(res.body));
    }

    // Distinctness of the whole set. Implied by distinct titles today, asserted
    // anyway: it is the property that actually matters ("seven paths, seven apps"),
    // and it keeps holding if two games are ever given the same title.
    assert.equal(
      new Set(seen.values()).size,
      games.length,
      `the ${games.length} game paths returned only ${new Set(seen.values()).size} distinct bodies — at ` +
        `least two paths are serving the same app. Fingerprints: ` +
        `${JSON.stringify(Object.fromEntries(seen))}`,
    );
  });

  test('AC1: every shape of a game URL reaches the game, not the lobby', { timeout: 60_000 }, async () => {
    // REGRESSION GUARD (mg1-2 review, finding R1). The first router matched the app
    // id with `(?:\/|$)` — the id had to be followed by a slash or the end of the
    // URL. `/tempest?x=1` is followed by `?`, so the match failed entirely and the
    // request fell through to the lobby: 200, <title>Slabcade</title>, no error.
    // A game path silently serving the lobby is the precise defect this story
    // exists to remove, so every shape a browser or a developer can produce is
    // pinned here rather than only the canonical one.
    const game = gameIds()[0];
    const expected = titleOf(`plugins/${game}/index.html`, true);
    const lobbyTitle = titleOf('lobby/index.html', true);
    assert.notEqual(expected, lobbyTitle, 'fixture problem: the game and the lobby must be distinguishable');

    for (const path of [`${game}/`, `${game}`, `${game}?debug=1`, `${game}/?debug=1`, `${game}/#frag`]) {
      const res = await get(path);
      assert.equal(
        titleOf(res.body),
        expected,
        `/${path} served <title>${titleOf(res.body)}</title> instead of <title>${expected}</title>. ` +
          `Every shape of a game's URL must reach the game — a query string or a missing trailing ` +
          `slash falling through to the lobby is a silent wrong-app serve.`,
      );
    }

    // …and the control is unaffected by the same shapes, so the fix cannot have
    // been "route everything to a game".
    for (const path of ['banana/', 'banana', 'banana?debug=1']) {
      assert.equal(titleOf((await get(path)).body), lobbyTitle, `/${path} must still be the lobby's fallback`);
    }
  });

  test('AC1: a plugin sub-entry serves its OWN file, not the game index', { timeout: 60_000 }, async () => {
    // The failure this catches is a wildcard rewrite: `/<id>/*` → plugins/<id>/index.html
    // serves the right APP but the wrong PAGE, and every assertion above still
    // passes. /tempest/models.html is named in the measurement that opened this
    // story.
    //
    // Enumerated from the directory, not listed: a hardcoded set here would be a
    // fifth copy of "which games ship a second page" (the others being each
    // plugin.ts `build` export, AppSpec.entries, and build-app.mjs), free to drift
    // the day a game gains a page.
    const subEntries = gameIds().flatMap((game) =>
      readdirSync(join(root, 'plugins', game))
        .filter((f) => f.endsWith('.html') && f !== 'index.html')
        .map((f) => [game, f]),
    );
    assert.ok(
      subEntries.length >= 4,
      `expected the known second entries (tempest/models.html, star-wars/models.html, star-wars/scenes.html, ` +
        `red-baron/models.html); found ${subEntries.length} — if this is empty the loop below asserts nothing`,
    );

    for (const [game, entry] of subEntries) {
      const expected = titleOf(`plugins/${game}/${entry}`, true);
      const indexTitle = titleOf(`plugins/${game}/index.html`, true);
      assert.ok(expected, `plugins/${game}/${entry} has no <title> to identify it by`);
      assert.notEqual(expected, indexTitle, `fixture problem: ${game}/${entry} must be distinguishable from its index`);

      const res = await get(`${game}/${entry}`);
      assert.equal(res.status, 200, `/${game}/${entry} returned ${res.status}`);
      assert.equal(
        titleOf(res.body),
        expected,
        `/${game}/${entry} served <title>${titleOf(res.body)}</title> instead of <title>${expected}</title>. ` +
          `A rewrite that maps every /${game}/* to index.html serves the right app and the wrong page.`,
      );
    }
  });

  test('AC1: a game page\'s own module really loads — 200 is not enough', { timeout: 60_000 }, async () => {
    // MEASURED 2026-07-31 on the pre-fix server: /tempest/src/main.ts returned 200
    // with content-type text/html — the SPA fallback answering for a module that
    // does not resolve. A status check here is therefore VACUOUS by measurement,
    // not by argument: it already passes against a server that serves no games.
    //
    // Two things make it non-vacuous. The content-type must be JavaScript (the
    // fallback is text/html), and the module must DIFFER from the lobby's own —
    // because every plugin index.html and lobby/index.html reference the SAME
    // absolute specifier `/src/main.ts`, so a server that resolves game modules
    // against the repo root hands back the lobby's bootstrap, which is real
    // JavaScript and would satisfy a content-type check on its own.
    const appModules = (html) =>
      [...html.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g)]
        .map((m) => m[1])
        // Vite injects its own client; /@vite/, /@id/ and /@fs/ are its namespace,
        // not the app's entry. `includes`, NOT `startsWith` — MEASURED 2026-07-31
        // by serving tempest through defineAppConfig({ id: 'tempest' }): under a
        // per-app `base` Vite emits its client as "/tempest/@vite/client", which
        // does not START with /@. A startsWith filter therefore counts Vite's own
        // client as the app's module — and since that client is real JavaScript
        // that differs from the lobby's bootstrap, every assertion below would
        // pass on it. The `>= 1` guard would then be satisfied by a page carrying
        // NO app entry at all, which is the precise vacuity this suite exists to
        // refuse.
        .filter((src) => !src.includes('/@'));

    const lobbyEntries = appModules((await get('')).body);
    assert.ok(lobbyEntries.length >= 1, 'the lobby page must reference at least one module of its own');
    const lobbyModule = await get(lobbyEntries[0].replace(/^\//, ''));

    for (const game of gameIds()) {
      const page = await get(`${game}/`);
      const entries = appModules(page.body);
      assert.ok(
        entries.length >= 1,
        `/${game}/ referenced no module of its own (only Vite's injected /@… scripts). Found: ` +
          `${JSON.stringify([...page.body.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]))}`,
      );

      for (const src of entries) {
        const mod = await get(src.replace(/^\//, ''));
        assert.equal(mod.status, 200, `/${game}/ references ${src}, which returned ${mod.status}`);
        assert.match(
          mod.type,
          /javascript|ecmascript/i,
          `${src} (referenced by /${game}/) came back as "${mod.type}", not JavaScript. A 200 of text/html ` +
            `is the SPA fallback standing in for a module that does not resolve — the page would render ` +
            `and then die. This is the measured pre-fix behaviour of /${game}/src/main.ts.`,
        );
        assert.notEqual(
          hash(mod.body),
          hash(lobbyModule.body),
          `${src} (referenced by /${game}/) served the LOBBY's module — byte-identical to what / references ` +
            `(sha256:${hash(lobbyModule.body)}). Every plugin index.html and lobby/index.html both reference ` +
            `"/src/main.ts", so a server that resolves it against the repo root gives ${game} the lobby's ` +
            `bootstrap — real JavaScript, wrong app.`,
        );
      }
    }
  });
});

// --- the dead story id this work was filed under ---------------------------

test('mg1-2: nothing still routes this work to the retired id `uf1-19`', () => {
  // uf1-19 was renumbered to mg1-2 when epic uf1 was split on 2026-07-31 (uf1 now
  // ends at uf1-18, and no sprint file defines uf1-19). Unlike the deliberately
  // un-asserted absence of the old port 5273 at the top of this file — a doc may
  // legitimately mention a retired port while explaining the collapse — a dead
  // story id has no legitimate use: it points a reader at nothing. One of the
  // references is this repo explaining when its own tripwire should redden.
  const sites = ['CLAUDE.md', 'README.md', 'lobby/README.md', 'justfile', 'vite.config.ts'];
  for (const site of sites) {
    // Report the LINES, not the file. `assert.doesNotMatch` prints the whole
    // subject on failure, and CLAUDE.md is 10KB — the message that tells you what
    // to fix would be buried under the document containing the defect.
    const hits = read(site)
      .split('\n')
      .map((line, i) => [i + 1, line])
      .filter(([, line]) => line.includes('uf1-19'));
    assert.deepEqual(
      hits,
      [],
      `${site} routes the multi-app dev server to uf1-19, which does not exist — the epic split renumbered ` +
        `it to mg1-2. Point the reader at mg1-2, or drop the sentence if the paragraph is now obsolete.\n` +
        hits.map(([n, line]) => `  ${site}:${n}: ${line.trim()}`).join('\n'),
    );
  }
});
