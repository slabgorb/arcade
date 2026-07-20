// Story cp1-1 — Centipede scaffold: orchestrator wiring contract (AC-4).
//
// The centipede/ subrepo already exists (bootstrapped with the rom-study dossier);
// cp1-1 gives it a build scaffold and wires it into the orchestrator's canonical
// dev loop. These tests guard the ORCHESTRATOR side of that wiring (the
// centipede-internal scaffold — vite.config/tsconfig/index.html/purity guard/CI
// caller — is guarded by centipede/tests/scaffold.test.ts + purity.test.ts, which
// must stay inside the subrepo so a standalone `git clone centipede` still passes).
//
// Guarded here, per AC-4:
//   - justfile lists centipede in `games` AND `subrepos` (install-all/test-all/
//     build-all iterate these) without regressing any existing game out of them
//   - the `serve` recipe launches centipede alongside the fleet on its pinned 5278
//   - the CLAUDE.md port table row for 5278 is live (URL), no longer "reserved"
//
// NOT guarded here: .gitignore + repos.yaml registration (landed with the repo
// bootstrap, commit 43f388c) and the R2 bucket/release (cp6's problem).
//
// RED until GREEN lands the wiring. Run from the orchestrator root:
//   npm test   (→ node --test 'tests/**/*.test.mjs')

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
// td1-8 moved the fleet launch out of the justfile `serve` recipe into this module;
// the "serve launches centipede" assertion below now reads the real spawn spec.
import { jobsFor } from '../scripts/serve.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relPath) => readFileSync(join(root, relPath), 'utf8');

// Extract a `just` recipe body by name (col-0 header, indented body). Copied from
// tests/canonical-serve.test.mjs, as the battlezone/red-baron bootstrap suites also do,
// so every suite reads the justfile the same way. `:=` never appears in a recipe header,
// so it screens out variable assignments. Added by td1-8's re-aim.
function recipeBody(justfile, name) {
  const lines = justfile.split('\n');
  const header = new RegExp(`^${name}(\\s|:)`);
  const isAssignment = /:=/;
  const start = lines.findIndex((line) => header.test(line) && !isAssignment.test(line));
  if (start === -1) return null;
  const body = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') { body.push(line); continue; }
    if (!/^\s/.test(line)) break;
    body.push(line);
  }
  return body.join('\n');
}

// The pinned port contract: centipede owns 5278.
const CENTIPEDE_PORT = '5278';

// Games expected to already be wired into the justfile vars — GREEN adds
// centipede WITHOUT dropping any of these.
const EXISTING_GAMES = ['tempest', 'star-wars', 'asteroids', 'battlezone', 'red-baron'];

const justfileVar = (justfile, name) => {
  const m = justfile.match(new RegExp(`^${name}\\s*:=\\s*"([^"]*)"`, 'm'));
  assert.notEqual(m, null, `justfile must define the \`${name}\` variable`);
  return m[1].split(/\s+/).filter(Boolean);
};

test('justfile `games` lists centipede (test-all/build-all fleet coverage)', () => {
  const games = justfileVar(read('justfile'), 'games');
  assert.ok(games.includes('centipede'), '`games` must include centipede');
});

test('justfile `subrepos` lists centipede (install-all + fleet ops coverage)', () => {
  const subrepos = justfileVar(read('justfile'), 'subrepos');
  assert.ok(subrepos.includes('centipede'), '`subrepos` must include centipede');
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

// RE-AIMED BY td1-8 (2026-07-20). Same intent, still this story's guard; only the
// evidence moved. It used to match `{{root}}/centipede && npm run dev` and a
// `centipede…localhost:5278` echo in the justfile. td1-8 moved the fleet launch out
// of the `serve` recipe into scripts/serve.mjs (the recipe's bare `wait` returned 0
// with a server dead, and it echoed all eight ready URLs BEFORE any server had bound
// — so the banner was asserting readiness it had not observed).
//
// Both halves survive, and the second is now stronger than it was. The old port
// assertion only proved the recipe ECHOED "centipede … localhost:5278"; that echo was
// exactly the unconditional banner td1-8 deleted, and it was true whether or not
// centipede was served there. The port is now the one the supervisor actually
// launches on and probes for readiness before announcing it.
test('`serve` launches centipede alongside the fleet, on its pinned port', () => {
  const job = jobsFor('/ARCADE').find((j) => j.name === 'centipede');
  assert.ok(job, 'centipede must be in the fleet scripts/serve.mjs launches (SERVERS)');
  assert.equal(job.command, 'npm', 'serve must launch the centipede dev server like the sibling games');
  assert.deepEqual(job.args, ['run', 'dev']);
  assert.equal(job.cwd, join('/ARCADE', 'centipede'), 'centipede must be launched from its own subrepo directory');
  assert.equal(
    job.port,
    Number(CENTIPEDE_PORT),
    `serve must launch centipede on its pinned port ${CENTIPEDE_PORT}`,
  );

  const body = recipeBody(read('justfile'), 'serve') ?? '';
  assert.match(body, /serve\.mjs/, 'the `serve` recipe must invoke scripts/serve.mjs, which launches the fleet');
});

test('CLAUDE.md port table row 5278 is live, not reserved', () => {
  const claude = read('CLAUDE.md');
  const row = claude
    .split('\n')
    .find((line) => line.includes('| centipede') && line.includes(CENTIPEDE_PORT));
  assert.notEqual(row, undefined, 'CLAUDE.md must keep a centipede row in the port table');
  assert.ok(
    !/reserved/i.test(row),
    `the centipede port row must no longer read "reserved": ${row}`,
  );
  assert.ok(
    row.includes(`http://localhost:${CENTIPEDE_PORT}/`),
    `the centipede port row must carry the live dev URL: ${row}`,
  );
});
