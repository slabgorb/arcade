// Story uf1-20 — the showcase carousel proves a game is FRAMED, never that it is
// ALIVE. Raised by Dev + Reviewer on ad1-2 (2026-08-01): every existing guard around
// the showcase asserts MEMBERSHIP (registry.test.ts pins ['tempest','battlezone',
// 'centipede']), WIRING (lobby/tests/main.test.ts:156 asserts the launch href), or
// HTTP STATUS (`just check-showcase` — hosting.md: "the HTTP status of /<id>/, and
// nothing else"). None observes whether the framed game actually renders. A black,
// frozen, or exception-throwing pane ships green — hosting.md even states it: "A game
// serving a broken build still fires load and looks healthy from the lobby."
//
// AC-4 DECISION (recorded 2026-08-06, uf1-20 RED): the liveness check is a DOCUMENTED
// MANUAL GATE, not a CI gate. The repo has no browser harness today — every vitest
// project runs `environment: 'node'`, and CI is npm ci → lint → orchestrator → vitest
// → build — and observing real canvas pixels REQUIRES a real browser. Bolting a
// Playwright browser gate into every deploy contradicts the repo's fast, deterministic,
// no-backend CI identity and adds browser-install + dev-server + flakiness cost to each
// release. So the deliverable is an on-demand `just check-showcase-alive` recipe
// (Playwright, run locally) that automates ad1-2's hand method — sample the same-origin
// iframe canvas's lit-pixel counts over ten 250 ms ticks; distinct counts = alive,
// static = dead — plus a hosting.md record of the decision and the browser cost.
//
// What THIS orchestrator suite can pin (it cannot itself drive a browser) is the manual
// gate's CONTRACT: the two pure functions the probe is built from, that the gate's game
// roster is DERIVED from the showcase manifests (so it auto-covers ad1-1/3/4/5), that
// the recipe is reachable, and that the decision + cost are recorded. The one piece it
// cannot run — the actual canvas read — is proven by hand and recorded (AC-3 mutation).
//
// Run from the orchestrator root: `npm run test:orchestrator`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const path = (...rel) => join(repo, ...rel);
const read = (...rel) => readFileSync(path(...rel), 'utf8');

// The probe script does not exist yet (RED). Import it fresh per test so each failure
// reports "Cannot find module scripts/check-showcase-alive.mjs" — i.e. feature missing.
const probe = () => import('../scripts/check-showcase-alive.mjs');

// ---------------------------------------------------------------------------
// AC-2 — the gate covers EVERY `showcase: true` game, derived from the manifests,
// so it keeps working as ad1-1/ad1-3/ad1-4/ad1-5 add members. The derivation is the
// strong, mutation-proof assertion: a hardcoded ['tempest','battlezone','centipede']
// list would pass today's registry check but CANNOT pass the synthetic-input test.
// ---------------------------------------------------------------------------

test('showcaseLivenessTargets derives targets by filtering showcase:true — not a hardcoded list', async () => {
  const { showcaseLivenessTargets } = await probe();
  // Synthetic registry: only `b` and `d` are showcased. A gate that hardcodes the
  // real roster (or forgets to filter) fails this — that is the point.
  const games = [
    { id: 'a', showcase: false },
    { id: 'b', showcase: true },
    { id: 'c', showcase: false },
    { id: 'd', showcase: true },
  ];
  const targets = showcaseLivenessTargets(games);
  assert.deepEqual(
    targets,
    [
      { id: 'b', path: '/b/' },
      { id: 'd', path: '/d/' },
    ],
    'targets must be exactly the showcase:true games, each at its gamePath /<id>/',
  );
});

test('showcaseLivenessTargets() defaults to the live registry roster and paths', async () => {
  const { showcaseLivenessTargets } = await probe();
  const { GAMES, gamePath } = await import('../src/host/registry.ts');
  const expected = GAMES.filter((g) => g.showcase).map((g) => ({ id: g.id, path: gamePath(g.id) }));

  const targets = showcaseLivenessTargets();
  assert.deepEqual(targets, expected, 'the default roster must track the registry, live');

  const ids = targets.map((t) => t.id);
  // Membership sanity against the ad1-2 census — and, crucially, the exclusions:
  for (const id of ['tempest', 'battlezone', 'centipede']) {
    assert.ok(ids.includes(id), `${id} is showcase:true and must be probed`);
  }
  for (const id of ['joust', 'asteroids', 'red-baron']) {
    assert.ok(!ids.includes(id), `${id} is showcase:false and must NOT be probed`);
  }
});

// ---------------------------------------------------------------------------
// AC-1 + AC-3 — the verdict: a game is alive iff its lit-pixel counts VARY over the
// samples. This is the pure heart of ad1-2's method, and it directly encodes "fails
// when a showcase game draws nothing or draws a frozen frame" — the black pane (all
// zero) and the frozen pane (all identical) are exactly the two dead cases.
// ---------------------------------------------------------------------------

test('isAlive is FALSE for a frozen frame — every sample the same non-zero count', async () => {
  const { isAlive } = await probe();
  assert.equal(isAlive([812, 812, 812, 812, 812, 812, 812, 812, 812, 812]), false);
});

test('isAlive is FALSE for a black pane — every sample zero lit pixels', async () => {
  const { isAlive } = await probe();
  assert.equal(isAlive([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), false);
});

test('isAlive is TRUE for a live game — counts vary across the samples', async () => {
  const { isAlive } = await probe();
  assert.equal(isAlive([804, 831, 796, 850, 812, 799, 868, 777, 823, 841]), true);
});

// ---------------------------------------------------------------------------
// AC-1 (wiring) — the probe actually reaches into the framed canvas and samples pixels
// over time through a real browser. This is what makes it observe RENDERED OUTPUT
// rather than an HTTP status. The change that reddens it: replacing the browser
// pixel-sampler with a DOM-only or curl/HTTP check (as `check-showcase` already is).
// ---------------------------------------------------------------------------

test('the probe observes framed pixels through a real browser, not HTTP status', async () => {
  const src = read('scripts', 'check-showcase-alive.mjs');
  assert.match(src, /playwright/i, 'must drive a real browser (the harness cost AC-4 records)');
  assert.match(src, /canvas/i, 'must reach the framed game canvas');
  assert.match(src, /getImageData|image ?data|lit[- ]?pixel/i, 'must sample pixel data, not HTTP status');
});

test('`just check-showcase-alive` recipe exists and invokes the probe', async () => {
  const jf = read('justfile');
  assert.match(jf, /^check-showcase-alive:/m, 'a `check-showcase-alive` recipe must exist');
  assert.match(jf, /check-showcase-alive\.mjs/, 'the recipe must run scripts/check-showcase-alive.mjs');
});

// ---------------------------------------------------------------------------
// AC-4 — the CI-vs-manual decision is made EXPLICITLY and recorded, with the
// browser-harness cost stated. hosting.md is the runbook that already owns the
// `check-showcase` prose; the decision belongs beside it.
// ---------------------------------------------------------------------------

test('hosting.md records the explicit manual-not-CI decision and the browser-harness cost', async () => {
  const doc = read('docs', 'ops', 'hosting.md');
  assert.match(doc, /check-showcase-alive/, 'the runbook must document the liveness gate');
  assert.match(doc, /manual|on-demand/i, 'must record it as a manual / on-demand gate');
  assert.match(
    doc,
    /not run in CI|not in CI|CI does not|no browser harness/i,
    'must state EXPLICITLY that it does not run in CI',
  );
  assert.match(doc, /playwright|browser harness/i, 'must state the browser-harness cost');
});
