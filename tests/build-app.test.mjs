// tests/build-app.test.mjs — the dev-tool entry reader in scripts/build-app.mjs.
//
// WHY THIS FILE EXISTS (plan defect #20). Three games ship a second HTML page —
// tempest models.html, star-wars models.html + scenes.html, red-baron models.html —
// and nothing but this reader carries that fact from the manifest into the build.
// The declaration is ordinary TypeScript, so `tsc` is perfectly happy with any
// reformatting of it, and the naive reader the plan started from
//
//     /export const build:\s*BuildSpec\s*=\s*\{\s*entries:\s*\[([^\]]*)\]/
//
// returns null for FOUR formattings, measured below and named there: `satisfies
// BuildSpec`, no type annotation, a comment before the key, and a quoted key. Each
// yields zero entries and a GREEN build that has silently dropped a dev-tool page.
//
// The plan named six, and three of those (`entries` on its own line, a trailing
// comma, an array spilling across lines) plus `as const` do NOT defeat it — see the
// measurement in `survives every reformatting…` below, which is the authority here.
// The hazard is real either way; only its trigger list was wrong.
//
// So this file asserts two properties, and they are different properties:
//   1. those formattings PARSE — the reader is structural, not a shape-match;
//   2. anything it cannot read THROWS. Never `[]`. Returning `[]` from a failed
//      read is indistinguishable from "this game has no dev tools", which is the
//      entire hazard.
//
// tests/monorepo-topology.test.mjs owns the other half — that what the real seven
// manifests declare matches the .html files actually on disk, in both directions.
// It calls THIS reader to do it, rather than restating the parse, so a reader that
// breaks reddens the fleet invariant too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseBuildEntries, appBuildConfig, cleanLobbyOutput } from '../scripts/build-app.mjs';

const WHERE = 'plugins/demo/plugin.ts';
const parse = (src) => parseBuildEntries(src, WHERE);
const HEAD = "import { version } from './package.json'\nimport type { GameMeta, BuildSpec } from '@host/contract'\n\n";

test('reads the plain one-line declaration the manifests ship today', () => {
  assert.deepEqual(parse(`${HEAD}export const build: BuildSpec = { entries: ['models.html'] }`), [
    'models.html',
  ]);
  assert.deepEqual(
    parse(`${HEAD}export const build: BuildSpec = { entries: ['models.html', 'scenes.html'] }`),
    ['models.html', 'scenes.html'],
  );
});

test('survives every reformatting that defeats a shape-matching regex', () => {
  // Each of these is valid TypeScript that a printer can produce, and each one
  // returns null from the plan's original regex. The name of the case is the
  // formatting under test.
  const cases = {
    'entries on its own line': `${HEAD}export const build: BuildSpec = {
  entries: ['models.html'],
}`,
    'trailing comma inside the array': `${HEAD}export const build: BuildSpec = { entries: ['models.html',] }`,
    'satisfies BuildSpec': `${HEAD}export const build = { entries: ['models.html'] } satisfies BuildSpec`,
    'as const': `${HEAD}export const build: BuildSpec = { entries: ['models.html'] as const }`,
    'double-quoted strings': `${HEAD}export const build: BuildSpec = { entries: ["models.html"] }`,
    'array spilling past the printer width': `${HEAD}export const build: BuildSpec = {
  entries: [
    'models.html',
  ],
}`,
    'no type annotation at all': `${HEAD}export const build = { entries: ['models.html'] }`,
    'a comment between the key and the value': `${HEAD}export const build: BuildSpec = {
  // the model contact sheet
  entries: ['models.html'], // dev only
}`,
    'quoted key': `${HEAD}export const build: BuildSpec = { 'entries': ['models.html'] }`,
    'everything at once': `${HEAD}export const build = {
  entries: [
    "models.html",
    "scenes.html",
  ],
} satisfies BuildSpec`,
  };
  for (const [name, src] of Object.entries(cases)) {
    const expected = name === 'everything at once' ? ['models.html', 'scenes.html'] : ['models.html'];
    assert.deepEqual(parse(src), expected, `formatting case: ${name}`);
  }
  // …and the anti-vacuity check, which MEASURES rather than repeats the claim.
  //
  // Correction to the plan, established here: of the six formattings the brief said
  // defeat the naive regex, only some do. `\s*` spans newlines, so `entries` on its
  // own line and an array spilling across lines both still match; `[^\]]*` tolerates
  // a trailing comma; and `as const` sits after the `]`, outside the match. Nor
  // would a printer reflow the shipped declarations at the usual 80-column width:
  // measured, they are 60 chars (tempest, red-baron) and 75 (star-wars). So
  // "Prettier reformatting a manifest is enough" overstates the trigger.
  //
  // What genuinely defeats it is pinned by name below — dropping the `: BuildSpec`
  // annotation (which `satisfies BuildSpec` does), a comment between `{` and the
  // key, and a quoted key. The hazard is real; its trigger list was not. If a
  // future reader is asked to handle a new formatting, this set is where it is
  // recorded that the old one could not.
  const naive = /export const build:\s*BuildSpec\s*=\s*\{\s*entries:\s*\[([^\]]*)\]/;
  const defeated = Object.keys(cases).filter((name) => !naive.test(cases[name])).sort();
  assert.deepEqual(defeated, [
    'a comment between the key and the value',
    'everything at once',
    'no type annotation at all',
    'quoted key',
    'satisfies BuildSpec',
  ]);
});

test('an empty or absent declaration is the ONLY way to get zero entries', () => {
  // A manifest that says nothing about the build — four of the seven games.
  assert.deepEqual(parse("import type { GameMeta } from '@host/contract'\nexport const meta = {}"), []);
  // An explicit "no extra pages" is a statement, and is honoured.
  assert.deepEqual(parse(`${HEAD}export const build: BuildSpec = {}`), []);
  assert.deepEqual(parse(`${HEAD}export const build: BuildSpec = { entries: [] }`), []);
});

test('a declaration it cannot read THROWS — it never falls through to zero entries', () => {
  const unreadable = {
    // The headline case: the type import survives a mangled/removed declaration.
    'BuildSpec imported but no build export': `${HEAD}export const meta = {}`,
    'the declaration commented out': `${HEAD}// export const build: BuildSpec = { entries: ['models.html'] }`,
    'assigned from a call': `${HEAD}export const build: BuildSpec = devPages()`,
    'entries assigned a variable': `${HEAD}const P = ['models.html']\nexport const build: BuildSpec = { entries: P }`,
    'an element that is an identifier': `${HEAD}export const build: BuildSpec = { entries: [MODELS] }`,
    'an element that is a template literal': `${HEAD}export const build: BuildSpec = { entries: [\`models.html\`] }`,
    'an element built by concatenation': `${HEAD}export const build: BuildSpec = { entries: ['models' + '.html'] }`,
    'a spread instead of literals': `${HEAD}export const build: BuildSpec = { ...DEFAULTS }`,
    'a typo in the key name': `${HEAD}export const build: BuildSpec = { entires: ['models.html'] }`,
    'an unbalanced object': `${HEAD}export const build: BuildSpec = { entries: ['models.html'`,
  };
  for (const [name, src] of Object.entries(unreadable)) {
    assert.throws(() => parse(src), /plugins\/demo\/plugin\.ts/, `must throw: ${name}`);
  }
});

test('the message names BuildSpec-without-a-declaration specifically', () => {
  // The one failure a reader is most likely to hit, so it gets the sentence that
  // says what happened and what to do — not a generic parse error.
  assert.throws(() => parse(`${HEAD}export const meta = {}`), /no readable `export const build/);
  assert.throws(() => parse(`${HEAD}export const meta = {}`), /zero dev-tool entries/);
});

test('rejects entries that would build something other than a sibling dev page', () => {
  const bad = {
    'not an html page': [`${HEAD}export const build: BuildSpec = { entries: ['models.txt'] }`, /not an \.html/],
    'the implicit index': [
      `${HEAD}export const build: BuildSpec = { entries: ['index.html'] }`,
      /implicit entry/,
    ],
    'an absolute path': [`${HEAD}export const build: BuildSpec = { entries: ['/etc/x.html'] }`, /inside the app/],
    'a parent escape': [`${HEAD}export const build: BuildSpec = { entries: ['../lobby/index.html'] }`, /inside the app/],
    'a duplicate': [
      `${HEAD}export const build: BuildSpec = { entries: ['models.html', 'models.html'] }`,
      /duplicate/,
    ],
    'a blank name': [`${HEAD}export const build: BuildSpec = { entries: ['  '] }`, /blank|not an \.html/],
  };
  for (const [name, [src, pattern]] of Object.entries(bad)) {
    assert.throws(() => parse(src), pattern, `must reject: ${name}`);
  }
});

test('structure inside strings and comments cannot derail the read', () => {
  // The reader blanks comments and string CONTENTS before matching brackets, so a
  // brace in a control hint or a comma in a title stays inert.
  const src = `${HEAD}export const meta: GameMeta = {
  title: 'A } GAME, WITH { BRACES',
  controls: ['FIRE — Space'], // entries: ['ghost.html']
}

/* entries: ['also-a-ghost.html'] */
export const build: BuildSpec = { entries: ['models.html'] }`;
  assert.deepEqual(parse(src), ['models.html']);
});

// ---------------------------------------------------------------------------
// Building one app must not disturb the other seven
// ---------------------------------------------------------------------------

test('building the lobby must not empty dist/ — it is every game\'s parent', async () => {
  // MEASURED before it was fixed: with the factory's `emptyOutDir: true`, building
  // tempest and then the lobby left dist/tempest/index.html GONE. The lobby's
  // outDir is dist/ itself, so emptying it takes all seven games with it — and a
  // build script whose apps delete each other is not building them independently.
  const lobby = await appBuildConfig('lobby');
  assert.equal(lobby.build.emptyOutDir, false, 'the lobby must not empty its outDir');
  assert.match(lobby.build.outDir, /dist$/);

  // The opposite for a game: dist/<id>/ is its own, so it MUST still be emptied,
  // or a renamed asset lingers forever and gets uploaded to R2 next deploy.
  const game = await appBuildConfig('tempest');
  assert.equal(game.build.emptyOutDir, true, 'a game must still empty its own dist/<id>/');
  assert.match(game.build.outDir, /dist\/tempest$/);

  // And neither may pick up a config file: the root vite.config.ts's default export
  // is the LOBBY's config, so a config search that ever walked up from an app root
  // would build the lobby while reporting a game.
  assert.equal(lobby.configFile, false);
  assert.equal(game.configFile, false);
  // The entries really reach the build — the whole chain, end to end.
  assert.deepEqual(Object.keys(game.build.rollupOptions.input).sort(), ['main', 'models']);
});

test('cleanLobbyOutput removes the lobby\'s own output and nothing else', () => {
  const dist = mkdtempSync(join(tmpdir(), 'dist-'));
  try {
    mkdirSync(join(dist, 'tempest'), { recursive: true });
    writeFileSync(join(dist, 'tempest', 'index.html'), 'game');
    mkdirSync(join(dist, 'assets'), { recursive: true });
    writeFileSync(join(dist, 'assets', 'lobby-abc.js'), 'stale');
    writeFileSync(join(dist, 'index.html'), 'lobby');

    cleanLobbyOutput(dist);

    assert.ok(existsSync(join(dist, 'tempest', 'index.html')), 'a game build must survive');
    assert.ok(!existsSync(join(dist, 'assets')), 'the lobby\'s stale assets must go');
    assert.ok(!existsSync(join(dist, 'index.html')), 'the lobby\'s stale index must go');
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});
