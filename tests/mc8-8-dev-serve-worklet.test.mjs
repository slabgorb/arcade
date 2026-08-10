// Story mc8-8 — RED phase (Grand Admiral Thrawn's fleet / TEA). "just serve is
// silent: the POKEY worklet fails to load under Vite dev."
//
// ── THE BUG, MEASURED 2026-08-09 on the pre-fix cabinet dev server ────────────
// missile-command's audio engine resolves its ONE dependency — the vendored POKEY
// AudioWorklet — with `new URL('../../../star-wars/tools/pokey-bake/vendor/pokey.js',
// import.meta.url)` (plugins/missile-command/src/shell/audio.ts). Under the
// PRODUCTION BUILD that file is bundled into dist/missile-command/ and resolves
// same-origin (mc8-3 verified: worklet resolves, POKEY output peak 0.157). Under
// `just serve` it does NOT: the target lives OUTSIDE missile-command's Vite root
// (plugins/missile-command), so Vite's dev transform rewrites the specifier to an
// `/@fs/…` absolute-filesystem URL —
//
//     new URL("/missile-command/@fs/…/star-wars/tools/pokey-bake/vendor/pokey.js", …)
//
// — and the missile-command child server's `server.fs.allow` (default: its own root)
// answers that path **403 Forbidden — "outside of Vite serving allow list"**, an
// HTML page, not JavaScript. `audioWorklet.addModule()` fed a 403 HTML body throws
// `AbortError: Unable to load a worklet's module`, the engine degrades to silence,
// and MC is inaudible at http://127.0.0.1:5270/missile-command/. The failure is
// dev-only and swallowed (audio.ts catches every addModule rejection), so no error
// surfaces — which is exactly why this needs a behavioural test rather than a unit.
//
// ── WHY AN ORCHESTRATOR (dev-server) TEST, not a vitest project test ──────────
// The defect is not in any one app's source — audio.ts is CORRECT and mc8-3 pins
// its shape. The defect is in how the ONE cabinet dev server (vite.config.ts's
// `arcade:serve-the-cabinet` plugin, which mounts each app in middlewareMode from
// `defineAppConfig(id)`) serves a cross-app `@fs` asset. A per-app vitest project is
// rooted at plugins/<id>/ and never spins the cabinet server, so it cannot see this.
// This suite spawns the real `node_modules/.bin/vite` at the repo root — the same
// harness tests/canonical-serve.test.mjs uses — and asks the browser's question:
// when the page resolves the worklet URL, does that URL actually load as JavaScript?
//
// A GREEN test next to a silent worklet is worthless (SM assessment / project memory:
// "the video IS the game"), so this asserts the ACTUAL load path — the exact URL the
// transformed module hands to addModule — not a stub, a mock, or a source-string.
//
// ── IF YOU ARE READING THIS BECAUSE IT WENT RED ───────────────────────────────
// Make the dev server serve the vendored worklet same-origin without changing
// audio.ts's `new URL('…pokey.js', import.meta.url)` (mc8-3 BLOCK 1 forbids
// `?worker`/`?url` rewrites and any http(s)/fetch()/baked-media detour). The layer
// to touch is the CHILD server config in vite.config.ts — extend `server.fs.allow`
// so the shared plugins/star-wars/tools/pokey-bake/vendor/pokey.js is reachable
// (note: the child spread at `server: { middlewareMode: true, … }` REPLACES the
// server block from defineAppConfig, so an fs.allow added only there is dropped).
// Do NOT "fix" it by MOVING pokey.js into missile-command — star-wars' bake tool
// (plugins/star-wars/tools/pokey-bake/bake-sfx.mjs) reads it from that path, and the
// regression test below stats it.
//
// Run from the orchestrator root: `npm run test:orchestrator`.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// The vendored POKEY worklet is SHARED: star-wars' bake tool reads it at build time,
// missile-command loads it as a runtime AudioWorklet. The fix must not orphan it.
const VENDORED_WORKLET = join(
  root,
  'plugins',
  'star-wars',
  'tools',
  'pokey-bake',
  'vendor',
  'pokey.js',
);

describe('mc8-8: the MC POKEY worklet loads under `just serve`, so the cabinet is not silent in dev', () => {
  // A spare 54xx port on the loopback, exactly as tests/canonical-serve.test.mjs
  // chooses: the pinned 5270 may legitimately be held by a sibling checkout, and
  // this suite is about WHAT loads, not about the pin. 54xx is documented nowhere,
  // unlike the 5290-range CLAUDE.md tells developers to use.
  const port = 5400 + Math.floor(Math.random() * 100);
  const origin = `http://127.0.0.1:${port}`;
  let vite;
  let output = '';

  const get = async (path) => {
    const res = await fetch(`${origin}${path.startsWith('/') ? path : `/${path}`}`);
    return { status: res.status, type: res.headers.get('content-type') ?? '', body: await res.text() };
  };

  /** The worklet URL the browser actually resolves: extracted from the TRANSFORMED
   *  audio module the dev server serves, i.e. Vite's own rewrite of
   *  `new URL('…pokey.js', import.meta.url)`. This is the exact string passed to
   *  audioWorklet.addModule(), so testing it tests the real load path. */
  const workletUrlFromServedModule = async () => {
    const mod = await get('/missile-command/src/shell/audio.ts');
    assert.equal(
      mod.status,
      200,
      `the dev server did not serve missile-command's audio module (got ${mod.status}). Output:\n${output}`,
    );
    const m = /new URL\(\s*['"]([^'"]*pokey\.js)['"]/.exec(mod.body);
    // Non-vacuity: if the module carries no `new URL(…pokey.js…)` the extraction is
    // meaningless and every assertion below would be trivially satisfiable. This
    // also transitively guards mc8-3 BLOCK 1 — a "fix" that swapped the worklet to a
    // `?worker`/`?url` import (no `new URL`) would redden HERE, loudly.
    assert.ok(
      m,
      `the served missile-command audio module referenced no \`new URL('…pokey.js', import.meta.url)\` worklet ` +
        `specifier — either the module failed to serve or the worklet reference was removed. mc8-3 BLOCK 1 ` +
        `requires audio.ts to keep that shape. Served module head:\n${mod.body.slice(0, 400)}`,
    );
    return m[1];
  };

  before(async () => {
    vite = spawn('node_modules/.bin/vite', ['--port', String(port), '--strictPort'], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    vite.stdout.on('data', (b) => (output += b.toString()));
    vite.stderr.on('data', (b) => (output += b.toString()));

    // Poll for readiness rather than sleeping. Once `/` answers, the cabinet plugin
    // has finished creating every child server (it awaits them before listen).
    let ready = null;
    for (let i = 0; i < 100 && ready === null; i++) {
      try {
        ready = await get('/');
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    assert.notEqual(ready, null, `the dev server never accepted a connection on ${port}. Output:\n${output}`);
  });

  after(() => vite?.kill('SIGKILL'));

  test('AC1: the resolved worklet URL loads same-origin as JavaScript, not a 403 page', { timeout: 60_000 }, async () => {
    const workletUrl = await workletUrlFromServedModule();
    const res = await get(workletUrl);

    // MEASURED pre-fix: this exact URL returns 403 with a text/html "outside of Vite
    // serving allow list" page. addModule() on that HTML throws AbortError. A status
    // check ALONE is the real discriminator here (403 vs 200), and the content-type
    // and body checks below make "200" non-vacuous — a fallback that answered 200
    // with HTML would still not be a loadable worklet.
    assert.equal(
      res.status,
      200,
      `the POKEY worklet URL ${workletUrl} returned ${res.status}, not 200 — so ` +
        `audioWorklet.addModule() fails and missile-command is silent under \`just serve\`. If this is a 403, ` +
        `it is the pre-fix "outside of Vite serving allow list" restriction: extend the missile-command child ` +
        `server's fs.allow in vite.config.ts to reach the shared vendored worklet. Body:\n${res.body.slice(0, 300)}`,
    );
    assert.match(
      res.type,
      /javascript|ecmascript/i,
      `the worklet URL ${workletUrl} came back as "${res.type}", not JavaScript. addModule() requires a JS ` +
        `module; a text/html body (a 403 page or an SPA fallback) throws AbortError.`,
    );
    // It is the REAL vendored worklet — not a stub, not the lobby fallback. These two
    // markers are the processor addModule() must register (`registerProcessor('POKEY', …)`
    // over an AudioWorkletProcessor subclass) and cannot appear in the 403 HTML page.
    assert.match(
      res.body,
      /registerProcessor\(\s*['"]POKEY['"]/,
      `the body served for ${workletUrl} does not register the 'POKEY' processor — it is not the vendored ` +
        `worklet the engine loads. Body head:\n${res.body.slice(0, 300)}`,
    );
    assert.match(
      res.body,
      /AudioWorkletProcessor/,
      `the body served for ${workletUrl} is not an AudioWorkletProcessor module. Body head:\n${res.body.slice(0, 300)}`,
    );
    // Explicit anti-false-green on the precise pre-fix failure: the Vite 403 page.
    assert.doesNotMatch(
      res.body,
      /outside of Vite serving allow list|403 Restricted/i,
      `${workletUrl} served Vite's "403 Restricted / outside of serving allow list" page. This is the exact ` +
        `pre-fix failure: the worklet is reachable only via an /@fs/ path the child server's fs.allow rejects.`,
    );
  });

  test('AC2 (no star-wars regression): the shared vendored worklet stays in-tree and star-wars still serves', { timeout: 60_000 }, async () => {
    // The fix must not MOVE pokey.js: star-wars' bake tool reads it from this path,
    // and mc8-3 depends on it too. A "fix" that relocated the file to make MC's dev
    // URL resolve would silently break star-wars' offline audio bake.
    assert.ok(
      existsSync(VENDORED_WORKLET),
      `the shared vendored POKEY worklet must remain at ${VENDORED_WORKLET} — star-wars' bake tool ` +
        `(plugins/star-wars/tools/pokey-bake/bake-sfx.mjs) reads it there. The mc8-8 fix belongs in the dev ` +
        `server's fs.allow, not in moving the file out of the star-wars tree.`,
    );
    // …and the vite.config change that fixes MC must not have broken star-wars' own
    // dev serve. A 200 for /star-wars/ is the cheap behavioural regression guard.
    const sw = await get('/star-wars/');
    assert.equal(
      sw.status,
      200,
      `/star-wars/ returned ${sw.status} after the mc8-8 dev-server change — the fix regressed star-wars, ` +
        `which shares the vendored worklet. Output:\n${output}`,
    );
  });
});
