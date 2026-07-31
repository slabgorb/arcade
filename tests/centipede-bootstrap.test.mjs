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
//
// ===========================================================================
// MONOREPO MIGRATION (Task 11 — centipede imported as plugins/centipede)
// ===========================================================================
//
// NOTHING WAS REMOVED FROM THIS FILE, and that is a measurement, not an
// oversight. Unlike battlezone's and red-baron's bootstrap suites, this one
// never carried the two assertions the import retires: there is no
// `.gitignore ignores centipede/` assertion here and no `centipede/.git exists
// with a develop branch` assertion. The header above says why — both landed
// with the repo bootstrap (commit 43f388c) and were explicitly declared NOT
// guarded here. So the import found nothing false by design to retire, and all
// five tests below still pass against live orchestrator config.
//
// Their owners, so the tasks that retire them can find them:
//
//   TASK 19 (one dev server — collapses the eight pinned ports and
//            scripts/serve.mjs)
//     - `justfile \`games\` lists centipede (test-all/build-all fleet coverage)`
//     - `justfile \`subrepos\` lists centipede (install-all + fleet ops coverage)`
//     - `justfile vars do not regress the existing games`
//     - `\`serve\` launches centipede alongside the fleet, on its pinned port`
//       NOTE: still GREEN but already STALE in the same way red-baron's is — it
//       asserts `job.cwd === <root>/centipede`, which is now wrong on disk
//       (plugins/centipede). It reads scripts/serve.mjs's spec, not the
//       filesystem, so it cannot tell. Fix both together.
//
//   TASK 22 (docs — CLAUDE.md, repos.yaml)
//     - `CLAUDE.md port table row 5278 is live, not reserved`
//
// Removing any of them here would delete a live guard and hand this task's
// breakage to the task that owns it; leaving a red one would do the reverse.
// Neither happened: `npm run test:orchestrator` is 290 pass / 0 fail / 0 skipped
// both before and after the import.
//
// ===========================================================================
// TASK 19 (one dev server, one port) — RETIRED, as the ledger above routes it
// ===========================================================================
// //   - `justfile \`subrepos\` lists centipede (install-all + fleet ops coverage)`  DELETED
//   - `\`serve\` launches centipede alongside the fleet, on its pinned port`  DELETED
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
//     header warned — it asserted a cwd of `<root>/centipede`, a directory that
//     stopped existing at the import — and no per-game successor is possible,
//     because there is one dev server on one port. Its two halves survive
//     cabinet-wide, not per game: the pin is PROVEN behaviourally by `strictPort
//     is real, not just declared` (tests/monorepo-topology.test.mjs), and what
//     the one server actually serves is pinned by `the one dev server serves the
//     whole cabinet, not one app at every path` (tests/canonical-serve.test.mjs).
//     That guard was `the dev server serves the LOBBY at every path` until mg1-2,
//     which made the one server serve each game at /<id>/ and inverted it.
//
//   · the per-game pinned PORT (5278) goes with them. Its nearest successor is
//     base-path uniqueness — `/centipede/` — asserted for all seven in
//     tests/monorepo-topology.test.mjs.
//
// ===========================================================================
// TASK 22 (docs — CLAUDE.md, repos.yaml) — RETIRED, as the ledger above routes it
// ===========================================================================
//   - `CLAUDE.md port table row 5278 is live, not reserved`  DELETED
//
// Task 19 already deleted the eight-server fleet and the eight pinned ports; this
// test outlived them by one task only because it read the DOCUMENTATION of the
// ports rather than the ports themselves. It asserted a `| centipede | … | 5278 |`
// row in CLAUDE.md's dev-URL table — and that table is exactly what Task 22
// deletes, because eight ports are one and 5278 is not a port anything binds. The
// note at tests/canonical-serve.test.mjs:30 predicted this and deliberately did
// not assert 5278's ABSENCE, leaving the removal to the task that owns the file.
//
// There is no per-game successor: one dev server, one port. It served the LOBBY at
// every path when this note was written; since mg1-2 it serves each game at /<id>/,
// centipede included, pinned by `the one dev server serves the whole cabinet, not one
// app at every path` (tests/canonical-serve.test.mjs). The surviving halves are
// cabinet-wide — the one
// pinned port is read from the config and required in both docs by `AC2: each
// canonical serve doc references THE pinned port`, and centipede's `/centipede/`
// base path is asserted with the other six in tests/monorepo-topology.test.mjs.
// The `CENTIPEDE_PORT` constant goes with the test that used it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relPath) => readFileSync(join(root, relPath), 'utf8');

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

// The `subrepos` half of this test went with the `subrepos` variable (Task 19).
// `games` is the whole of the fleet list now, so this is the whole of the guard.
test('justfile vars do not regress the existing games', () => {
  const games = justfileVar(read('justfile'), 'games');
  for (const g of EXISTING_GAMES) {
    assert.ok(games.includes(g), `\`games\` must keep ${g}`);
  }
});

// `CLAUDE.md port table row 5278 is live, not reserved` was retired here by Task
// 22 — see the ledger at the top of this file.
