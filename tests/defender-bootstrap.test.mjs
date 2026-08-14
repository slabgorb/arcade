// Story df1-1 — Defender scaffold + citation gate: orchestrator wiring contract (RED, O'Brien/TEA).
//
// Defender is the ELEVENTH game. This file guards the ORCHESTRATOR side of adding it
// — the "three registrations" of CLAUDE.md's "Adding a game": the justfile `games`
// var, vitest.config.ts's `GAMES`, and the generated src/host/registry.ts — plus the
// df1-1 gate deliverables Dev ports from millipede (the citation checker and the
// purity scanner the plugin-side suites import). df1-1 ABSORBED df1-5's scaffold
// (owner decision, .session/df1-1-session.md Delivery Findings): the topology pin
// forbids a plugins/defender/ directory that is not a fully registered game, so the
// gate and the scaffold land together; df1-5 shrinks to the visual boot check.
//
// Modeled on tests/millipede-bootstrap.test.mjs. Run from the orchestrator root:
//   npm run test:orchestrator
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// GREEN has not landed yet, so every assertion below fails for a real, feature-shaped
// reason (never a broken-harness reason):
//   • defender is absent from justfile `games`      → registration 1 fails
//   • defender is absent from vitest.config GAMES   → registration 2 fails
//   • the generated registry has no defender entry  → registration 3 fails
//   • the four-file + plugin.ts blocks fail          (plugins/defender/ scaffold absent)
//   • the gate-module blocks fail                    (checker/sweep/scanner not ported)
// GREEN copies plugins/joust/'s four files (millipede's src/main.ts black canvas),
// fills the defender meta, adds `defender` to the justfile + vitest GAMES, runs
// `npm run gen:registry`, and ports the three gate modules from millipede.
//
// ─── EXPECTED COLLATERAL RED (unlike ml1-5's RED, and why — MEASURED, not guessed) ─
// TEA's plugin-side suites (tests/audit/citations.test.ts, tests/purity.test.ts,
// tests/scaffold.test.ts) are IN this RED commit under plugins/defender/, because the
// absorbed story leaves no later TEA slot to add them. A plugins/defender/ directory
// that is not yet a registered game reddens every suite that derives the roster from
// the FILESYSTEM — all feature-shaped (each names a piece GREEN must land), verified
// by running both runners against this exact commit:
//   • tests/monorepo-topology.test.mjs — the exact-set test (1 test)
//   • tests/registry.test.mjs — plugin.ts presence, fresh-generation match, the
//     --check CLI, per-entry version (4 tests; its curated-order and no-launch-URL
//     tests read the still-unchanged registry and stayed green)
//   • tests/release.test.mjs — packagePathFor/appDirFor existence and the
//     every-app-id-names-a-real-vitest-project gate, both derived from the
//     plugins/ dir (2 tests)
//   • tests/canonical-serve.test.mjs — whole-cabinet + two AC1 probes: /defender/
//     serves the SPA fallback until the scaffold lands (3 tests)
//   • tests/shared-tests-typechecked.test.mjs — the tsc gate carries the three
//     missing-module TS2307s GREEN clears (checker / dossier-sweep / scanner) (1 test)
//   • src/host/registry.test.ts (vitest |host|) — MANIFESTS covers plugins/ dirs +
//     build-spec coverage (2 tests)
// Total: 12 RED drivers here + 1 anti-regression guard passing, 13 collateral across
// six roster-derived suites, and NOTHING unrelated red (vitest fleet: 15775 passing).
// The defender vitest suites themselves are invisible to vitest until GREEN adds the
// project — their absence-of-modules is driven RED from HERE (the gate blocks below).
//
// ─── THE REGISTRATION SURFACE IS WIDER THAN THE STORY TITLE (GREEN must not miss it) ─
// The orchestrator + host suites hardcode the ten-game roster in places that RED the
// instant `plugins/defender/` appears — updating them is part of GREEN, and
// `npm run test:orchestrator` is the safety net:
//   • tests/monorepo-topology.test.mjs — its own `GAMES` const; the exact-set test
//     (plus tsconfig-extends, base-path, pkg-fields loops)
//   • tests/registry.test.mjs — `dirs.length === 10`, the `--check` banner
//     `10 games (9 listed)`, and the curated tile-order array
//   • tests/release.test.mjs — the `expected 11 apps` count (games + lobby)
//   • src/host/registry.test.ts — the MANIFESTS import map + curated/listed arrays
//   • lobby/tests/main.test.ts — the listed-tile count stated as a literal number
//   • tests/canonical-serve.test.mjs — derives its games from readdirSync(plugins), so
//     it auto-asserts /defender/ serves a page DISTINCT from the /banana/ nonsense
//     control: a black canvas that serves the lobby's fallback bytes reddens there.
// NOT covered here (df1-5, now shrunk to exactly this): the VISUAL black-canvas boot
// at http://127.0.0.1:5270/defender/ — screenshot it, don't trust a 200 (lobby SPA
// fallback answers 200 to everything; CLAUDE.md "serve" section).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relPath) => readFileSync(join(root, relPath), 'utf8');
const has = (relPath) => existsSync(join(root, relPath));

// The ten games already wired — GREEN adds defender WITHOUT dropping any of these
// from the justfile `games` list or vitest's GAMES.
const EXISTING_GAMES = [
  'tempest',
  'star-wars',
  'asteroids',
  'battlezone',
  'red-baron',
  'centipede',
  'joust',
  'missile-command',
  'pac-man',
  'millipede',
];

const justfileVar = (justfile, name) => {
  const m = justfile.match(new RegExp(`^${name}\\s*:=\\s*"([^"]*)"`, 'm'));
  assert.notEqual(m, null, `justfile must define the \`${name}\` variable`);
  return m[1].split(/\s+/).filter(Boolean);
};

/** The defender object literal in the generated registry, or null. `[^}]*` is safe:
 *  a registry entry holds no nested braces. */
const registryEntry = (reg) => {
  const m = reg.match(/\{[^}]*id:\s*'defender'[^}]*\}/);
  return m ? m[0] : null;
};

// ── Registration 1: justfile `games` ─────────────────────────────────────────
test('justfile `games` lists defender (test-all/build-all fleet coverage)', () => {
  const games = justfileVar(read('justfile'), 'games');
  assert.ok(games.includes('defender'), '`games` must include defender');
});

test('justfile `games` does not regress the existing ten games', () => {
  const games = justfileVar(read('justfile'), 'games');
  for (const g of EXISTING_GAMES) {
    assert.ok(games.includes(g), `\`games\` must keep ${g}`);
  }
});

// ── Registration 2: vitest.config.ts `GAMES` ─────────────────────────────────
test('vitest.config.ts `GAMES` includes defender (its own vitest project)', () => {
  const cfg = read('vitest.config.ts');
  const block = cfg.match(/const GAMES\s*=\s*\[([\s\S]*?)\]/);
  assert.notEqual(block, null, 'vitest.config.ts must define a GAMES array');
  const ids = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.ok(ids.includes('defender'), 'GAMES must include defender');
  for (const g of EXISTING_GAMES) {
    assert.ok(ids.includes(g), `GAMES must keep ${g}`);
  }
});

// ── Registration 3: the generated src/host/registry.ts ───────────────────────
test('src/host/registry.ts carries the defender entry with the correct meta', () => {
  const reg = read('src/host/registry.ts');
  const entry = registryEntry(reg);
  assert.notEqual(entry, null, 'registry must hold a parseable defender object literal');
  assert.match(entry, /id:\s*'defender'/, 'registry entry id must be defender');
  assert.match(entry, /title:\s*'DEFENDER'/, "title must be 'DEFENDER'");
  // 1980 — the fleet pins MAME's attribution year (battlezone/missile-command/pac-man
  // all match MAME), and MAME dates the defender parent set 1980 (© 1980 Williams;
  // the vendored INFO.SRC's `DR J. 1/21/81` is an assembly-note date, not a release).
  assert.match(entry, /year:\s*1980/, 'year must be 1980 (MAME attribution, © 1980 Williams)');
  // order 11 — millipede owns 10; 11 is the next free slot. (The mc1-1 "order 7 was
  // already taken" trap: derive the slot from the current registry, don't guess.)
  assert.match(entry, /order:\s*11\b/, 'defender order must be 11 (millipede is 10)');
  // A version is present (imported from package.json by plugin.ts, never hardcoded).
  assert.match(entry, /version:\s*'[^']+'/, 'registry entry must carry a version');
});

test('defender order 11 does not collide with an existing game', () => {
  const reg = read('src/host/registry.ts');
  const orders = [...reg.matchAll(/id:\s*'([^']+)',[\s\S]*?order:\s*(\d+)/g)].map((m) => [m[1], Number(m[2])]);
  const at11 = orders.filter(([, o]) => o === 11).map(([id]) => id);
  assert.deepEqual(at11, ['defender'], `order 11 must belong to defender alone, got: ${at11.join(', ')}`);
});

test('defender is NOT a showcase game (a black-canvas scaffold may not claim a carousel slot)', () => {
  // The ml1-5 rule: showcase:true is earned by a live self-playing attract demo
  // (tests/showcase-liveness.test.mjs), which arrives with df7 — not before.
  const reg = read('src/host/registry.ts');
  const entry = registryEntry(reg);
  assert.notEqual(entry, null, 'registry must hold a defender entry');
  assert.doesNotMatch(entry, /showcase:\s*true/, 'showcase stays false until df7 lands attract self-play');
});

// ── The four-file plugin shape exists ────────────────────────────────────────
test('plugins/defender holds the four scaffold files', () => {
  for (const f of ['index.html', 'plugin.ts', 'package.json', 'tsconfig.json']) {
    assert.ok(has(join('plugins', 'defender', f)), `plugins/defender/${f} must exist`);
  }
});

test('plugins/defender/tsconfig.json extends the root config at the right depth', () => {
  assert.ok(has('plugins/defender/tsconfig.json'), 'plugins/defender/tsconfig.json must exist (scaffold not landed)');
  const tc = JSON.parse(read('plugins/defender/tsconfig.json'));
  assert.equal(tc.extends, '../../tsconfig.json', 'a game sits one level deeper than the lobby');
});

test('plugins/defender/package.json is a private defender package with a version', () => {
  assert.ok(has('plugins/defender/package.json'), 'plugins/defender/package.json must exist (scaffold not landed)');
  const pkg = JSON.parse(read('plugins/defender/package.json'));
  assert.equal(pkg.name, 'defender', "package.json name must be 'defender'");
  assert.equal(pkg.private, true, 'the plugin package must be private');
  assert.match(String(pkg.version), /^\d+\.\d+\.\d+$/, 'package.json must carry a semver version');
});

test('plugins/defender/plugin.ts declares the meta the registry is generated from', () => {
  assert.ok(has('plugins/defender/plugin.ts'), 'plugins/defender/plugin.ts must exist (scaffold not landed)');
  const src = read('plugins/defender/plugin.ts');
  assert.match(src, /id:\s*'defender'/, "plugin.ts meta.id must be 'defender'");
  assert.match(src, /title:\s*'DEFENDER'/, "plugin.ts meta.title must be 'DEFENDER'");
  assert.match(src, /year:\s*1980/, 'plugin.ts meta.year must be 1980 (MAME attribution)');
  assert.match(src, /order:\s*11\b/, 'plugin.ts meta.order must be 11 (millipede is 10)');
  assert.match(src, /listed:\s*true/, 'plugin.ts meta.listed must be true (native-game scaffold convention)');
  // A black canvas may not claim a carousel slot "until it self-plays" (ml1-5 rule);
  // df7 grows the attract demo and earns the flip — with the registry test above.
  assert.match(src, /showcase:\s*false/, 'plugin.ts meta.showcase must be false until df7 self-play');
  // version comes from package.json, never hardcoded — the sibling games import it.
  assert.match(src, /version/, 'plugin.ts meta must carry a version (imported from package.json)');
});

// ── The df1-1 gate deliverables Dev ports from millipede ─────────────────────
// The plugin-side suites (tests/audit/citations.test.ts, tests/purity.test.ts) import
// these three modules; until defender joins vitest's GAMES those suites cannot run,
// so THIS file is what makes their absence RED from day one.
test('the citation checker is ported (tools/audit/check-citations.mjs + .d.mts)', () => {
  for (const f of ['check-citations.mjs', 'check-citations.d.mts']) {
    assert.ok(
      has(join('plugins', 'defender', 'tools', 'audit', f)),
      `plugins/defender/tools/audit/${f} must exist — ported from plugins/millipede/tools/audit/ ` +
        '(single revision, REVISION_SUBDIRS=[\'\'], vendoredRoot → reference/original-source/defender, ' +
        'keeping the ml1-1 hardening: unconditional containment + the isFile gate)',
    );
  }
});

test('the dossier coverage sweep is ported (tests/audit/dossier-sweep.ts)', () => {
  assert.ok(
    has('plugins/defender/tests/audit/dossier-sweep.ts'),
    'plugins/defender/tests/audit/dossier-sweep.ts must exist — ported from millipede\'s, ' +
      'DOSSIER_FILES starting EMPTY (df1-2/df1-3 enroll their files), grammar: backtick ' +
      '`FILE.SRC:LINESPEC` with an optional defender/ prefix normalised away',
  );
});

test('the src/core purity scanner is ported (tests/helpers/purity-scanner.ts)', () => {
  assert.ok(
    has('plugins/defender/tests/helpers/purity-scanner.ts'),
    'plugins/defender/tests/helpers/purity-scanner.ts must exist — the TypeScript-compiler-API ' +
      'core/shell scanner ported from millipede\'s (itself from centipede\'s)',
  );
});
