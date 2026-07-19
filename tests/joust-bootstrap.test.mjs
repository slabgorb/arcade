// Story jt1-1 — Joust scaffold: orchestrator wiring contract (AC-4).
//
// The joust/ subrepo already exists (bootstrapped with the rom-study dossier +
// design spec); jt1-1 gives it a build scaffold and wires it into the
// orchestrator's canonical dev loop. These tests guard the ORCHESTRATOR side of
// that wiring. The joust-internal scaffold — vite.config/tsconfig/index.html/
// purity guard/CI caller — is guarded by joust/tests/scaffold.test.ts +
// joust/tests/purity.test.ts, which must stay inside the subrepo so a
// standalone `git clone joust` still passes (the tp1 lesson).
//
// Guarded here, per AC-4 and the story description:
//   - justfile lists joust in `games` AND `subrepos` (install-all/test-all/
//     build-all iterate these) without regressing any existing game out of them
//   - the `serve` recipe launches joust alongside the fleet on its pinned 5279
//   - the CLAUDE.md port table row for 5279 is live (URL), no longer "reserved"
//   - repos.yaml's joust entry has moved past "pre-implementation"
//
// NOT guarded here: the R2 bucket provisioning and joust.slabgorb.com (jt6's
// problem — the ship epic), and the release itself (no release is cut in jt1-1).
//
// RED until GREEN lands the wiring. Run from the orchestrator root:
//   npm test   (→ node --test 'tests/**/*.test.mjs')

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relPath) => readFileSync(join(root, relPath), 'utf8');

// The pinned port contract: joust owns 5279, the arcade's ninth subrepo.
const JOUST_PORT = '5279';

// Games expected to already be wired into the justfile vars — GREEN adds joust
// WITHOUT dropping any of these.
const EXISTING_GAMES = ['tempest', 'star-wars', 'asteroids', 'battlezone', 'red-baron', 'centipede'];

const justfileVar = (justfile, name) => {
  const m = justfile.match(new RegExp(`^${name}\\s*:=\\s*"([^"]*)"`, 'm'));
  assert.notEqual(m, null, `justfile must define the \`${name}\` variable`);
  return m[1].split(/\s+/).filter(Boolean);
};

test('justfile `games` lists joust (test-all/build-all fleet coverage)', () => {
  const games = justfileVar(read('justfile'), 'games');
  assert.ok(games.includes('joust'), '`games` must include joust');
});

test('justfile `subrepos` lists joust (install-all + fleet ops coverage)', () => {
  const subrepos = justfileVar(read('justfile'), 'subrepos');
  assert.ok(subrepos.includes('joust'), '`subrepos` must include joust');
  assert.ok(subrepos.includes('lobby'), '`subrepos` must keep the lobby');
});

test('justfile vars do not regress the existing games', () => {
  const justfile = read('justfile');
  const games = justfileVar(justfile, 'games');
  const subrepos = justfileVar(justfile, 'subrepos');
  for (const g of EXISTING_GAMES) {
    assert.ok(games.includes(g), `\`games\` must keep ${g}`);
    assert.ok(subrepos.includes(g), `\`subrepos\` must keep ${g}`);
  }
});

test('justfile `serve` recipe launches joust alongside the fleet', () => {
  const justfile = read('justfile');
  assert.match(
    justfile,
    /\{\{root\}\}\/joust && npm run dev/,
    'serve must launch the joust dev server like the sibling games',
  );
  assert.match(
    justfile,
    new RegExp(`joust[^\\n]*localhost:${JOUST_PORT}`),
    `serve should announce joust on its pinned port ${JOUST_PORT}`,
  );
});

test('CLAUDE.md port table row 5279 is live, not reserved', () => {
  const claude = read('CLAUDE.md');
  const row = claude
    .split('\n')
    .find((line) => line.includes('| joust') && line.includes(JOUST_PORT));
  assert.notEqual(row, undefined, 'CLAUDE.md must keep a joust row in the port table');
  assert.ok(
    !/reserved/i.test(row),
    `the joust port row must no longer read "reserved": ${row}`,
  );
  assert.ok(
    row.includes(`http://localhost:${JOUST_PORT}/`),
    `the joust port row must carry the live dev URL: ${row}`,
  );
});

test('CLAUDE.md no longer calls joust pre-implementation', () => {
  // The games roster paragraph labels joust "(1982, pre-implementation)". Once
  // the scaffold lands that label is stale, and a stale label in the file every
  // agent primes from is how a later story re-derives a wrong assumption.
  // Normalise whitespace first: the label currently straddles a line break.
  const prose = read('CLAUDE.md').replace(/\s+/g, ' ');
  assert.ok(
    !/`joust\/` \(1982,? pre-implementation\)/i.test(prose),
    'the joust roster entry must drop the "pre-implementation" label',
  );
});

test('repos.yaml joust entry has moved past pre-implementation', () => {
  // The story description: "update repos.yaml notes past pre-implementation".
  // Scope the search to the joust block so a sibling's notes cannot satisfy it.
  const yaml = read('.pennyfarthing/repos.yaml');
  const start = yaml.indexOf('\n  joust:');
  assert.notEqual(start, -1, 'repos.yaml must register joust');
  // The block runs until the next top-level (two-space) repo key.
  const rest = yaml.slice(start + 1);
  const nextKey = rest.slice(1).search(/\n {2}[a-z0-9-]+:\n/);
  const block = nextKey === -1 ? rest : rest.slice(0, nextKey + 1);

  assert.ok(
    !/pre-implementation/i.test(block),
    'the joust repos.yaml notes must no longer say "pre-implementation"',
  );
  assert.ok(
    !new RegExp(`${JOUST_PORT} reserved`, 'i').test(block),
    `the joust repos.yaml notes must no longer call ${JOUST_PORT} "reserved"`,
  );
  // The sibling entries carry their commands once scaffolded; joust should too,
  // so `pf` and a fresh agent know how to build/test it.
  for (const cmd of ['dev_command', 'build_command', 'test_command']) {
    assert.match(block, new RegExp(`^\\s{4}${cmd}:`, 'm'), `joust needs a ${cmd} in repos.yaml`);
  }
});
