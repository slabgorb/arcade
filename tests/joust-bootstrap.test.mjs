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
//
// ===========================================================================
// TASK 19 (one dev server, one port) — RETIRED, as the ledger above routes it
// ===========================================================================
// //   - `justfile \`subrepos\` lists joust (install-all + fleet ops coverage)`  DELETED
//   - `\`serve\` launches joust alongside the fleet, on its pinned port`  DELETED
//   - `justfile vars do not regress the existing games`  KEPT, `subrepos` half dropped
//
// Why each is gone rather than re-homed:
//
//   · `subrepos` is not a variable that changed value — it is a CONCEPT that
//     stopped existing. Eight gitignored sibling checkouts are one repo; there
//     is no per-subrepo install, test or build to iterate. `games` survives as
//     the seven plugin directory names and is still asserted here; recipes that
//     mean "every app" spell it `{{{{games}}}} lobby`.
//
//   · the `serve` assertion read scripts/serve.mjs's spawn table, and Task 19
//     deletes that supervisor along with the eight-server fleet it existed to
//     launch, watch and tear down. It was already stale in exactly the way this
//     header warned — it asserted a cwd of `<root>/joust`, a directory that
//     stopped existing at the import — and no per-game successor is possible,
//     because there is one dev server on one port. Its two halves survive
//     cabinet-wide, not per game: the pin is PROVEN behaviourally by `strictPort
//     is real, not just declared` (tests/monorepo-topology.test.mjs), and what
//     the one server actually serves is pinned by `the dev server serves the
//     LOBBY at every path` (tests/canonical-serve.test.mjs).
//
//   · the per-game pinned PORT (5279) goes with them. Its nearest successor is
//     base-path uniqueness — `/joust/` — asserted for all seven in
//     tests/monorepo-topology.test.mjs.
//
// ===========================================================================
// TASK 22 (docs — CLAUDE.md, repos.yaml) — RETIRED, as the ledger above routes it
// ===========================================================================
//   - `CLAUDE.md port table row 5279 is live, not reserved`  DELETED
//   - `repos.yaml joust entry has moved past pre-implementation`  DELETED
//   - `CLAUDE.md no longer calls joust pre-implementation`  KEPT, and STRENGTHENED
//     rather than left to pass vacuously (see below).
//
// Why each:
//
//   · the port ROW asserted `| joust | http://localhost:5279/ | 5279 |` in
//     CLAUDE.md's dev-URL table, and Task 22 deletes that table: eight ports are
//     one, and 5279 is not a port anything binds. It read the DOCUMENTATION of a
//     fleet Task 19 had already deleted, which is the only reason it outlived it.
//     tests/canonical-serve.test.mjs:30 predicted this removal and deliberately
//     left it to the task that owns the file. The surviving halves are
//     cabinet-wide: the one pinned port is read from the config and required in
//     both docs by `AC2: each canonical serve doc references THE pinned port`, and
//     joust's `/joust/` base path is asserted with the other six in
//     tests/monorepo-topology.test.mjs.
//
//   · the repos.yaml entry test asserted joust had a BLOCK of its own — its notes
//     past "pre-implementation", 5279 not "reserved", and dev/build/test commands.
//     repos.yaml now holds exactly ONE entry, `arcade`; there is no joust repo to
//     register and no per-game commands (they take an app id at the root). Its
//     `assert.notEqual(start, -1, 'repos.yaml must register joust')` is the half
//     that had to go, and nothing in it is re-homable per game. The one invariant
//     that survived is the load-bearing one — a wrong `branch_strategy` blocks
//     every direct commit to main — and it is asserted cabinet-wide by
//     `repos.yaml is one trunk-based entry, which is what keeps main committable`
//     in tests/monorepo-topology.test.mjs.
//
//   · the "pre-implementation" prose test still has a live subject (the roster in
//     CLAUDE.md must not call a shipped game unimplemented), but its regex named
//     the exact old phrasing "`joust/` (1982, pre-implementation)" — with the
//     subrepo trailing slash — so after the rewrite it would have passed on a
//     string that can no longer occur in any form. It is rewritten below to anchor
//     on the roster that exists, with an anti-vacuity check that joust is named at
//     all.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relPath) => readFileSync(join(root, relPath), 'utf8');

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

// The `subrepos` half of this test went with the `subrepos` variable (Task 19).
// `games` is the whole of the fleet list now, so this is the whole of the guard.
test('justfile vars do not regress the existing games', () => {
  const games = justfileVar(read('justfile'), 'games');
  for (const g of EXISTING_GAMES) {
    assert.ok(games.includes(g), `\`games\` must keep ${g}`);
  }
});

// `CLAUDE.md port table row 5279 is live, not reserved` and `repos.yaml joust entry
// has moved past pre-implementation` were retired here by Task 22 — see the ledger
// at the top of this file.

test('CLAUDE.md no longer calls joust pre-implementation', () => {
  // The games roster used to label joust "(1982, pre-implementation)". Once the
  // scaffold landed that label was stale, and a stale label in the file every agent
  // primes from is how a later story re-derives a wrong assumption. joust has since
  // shipped epics jt1-jt4 and is a plugin like any other.
  //
  // Task 22 rewrote the roster (`joust/` the subrepo became `joust` the plugin), so
  // the original regex — which named the exact old phrasing, trailing slash and all
  // — would now pass on a string that cannot occur. Anchor on what exists instead,
  // and prove the file still names joust so this cannot pass by omission.
  const prose = read('CLAUDE.md').replace(/\s+/g, ' ');
  assert.match(prose, /\bjoust\b/i, 'CLAUDE.md must still name joust in its games roster');
  assert.ok(
    !/pre-implementation/i.test(prose),
    'no app in CLAUDE.md may be labelled "pre-implementation" — joust shipped jt1-jt4',
  );
});
