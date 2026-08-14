// Story df1-5 — the roster-doc half of the Defender visual boot check (RED, O'Brien/TEA).
//
// df1-5 has two acceptance criteria and only ONE of them is mechanically testable:
//
//   • AC1 (visual boot check) is a HUMAN step: screenshot http://127.0.0.1:5270/defender/
//     and confirm a black canvas actually renders. The MECHANICAL half of AC1 — that
//     /defender/ serves a page DISTINCT from the /banana/ nonsense control, not merely a
//     200 — is ALREADY covered, and not here: tests/canonical-serve.test.mjs derives its
//     game list from readdirSync(plugins/), so the instant df1-1 landed plugins/defender/
//     the "every game path DIFFERS from the nonsense control" test began asserting it.
//     A 200 proves nothing (the lobby SPA fallback answers 200 to everything); the pixels
//     are what AC1 is about, and only a person looking at them can sign that off.
//
//   • AC2 (roster correction) IS mechanical, and it is what this file guards. It is a
//     df1-1 review Gap finding routed to df1-5: CLAUDE.md's `**Games:**` roster (a) does
//     not name defender at all, and (b) calls `joust` (1982) "the first Williams title"
//     — which is false. Defender (© 1980 Williams) predates Joust (1982); among these
//     clones Defender is the earlier — the first — Williams title. The fix relocates the
//     "first Williams title" attribution from joust to defender and adds defender (1980)
//     to the roster.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// GREEN (the CLAUDE.md edit) has not landed, so each assertion below fails for a real,
// feature-shaped reason:
//   • the roster names no defender at all           → "defender (1980) in roster" fails
//   • the first-Williams clause still names joust    → "attribution is defender" fails
//   • the exact stale phrase is still present        → "stale phrase is gone" fails
// The control test ("the roster block is real, non-empty") PASSES now and must keep
// passing — it is the anti-vacuity anchor that proves the three guards above are being
// evaluated against the actual roster prose, not against an empty match.
//
// A prose guard fails three ways if it is written carelessly (see the arcade's own
// history of prose tripwires going vacuous): it can match nothing, it can ban a spelling
// without asserting the truth that replaces it, or it can be satisfied by DELETING the
// sentence. This file answers all three: a control proves the subject is non-empty; the
// stale spelling is banned AND the true attribution is required (they are symmetric —
// the "first Williams title" phrase must move FROM joust TO defender); and the positive
// assertions make a bare deletion insufficient.
//
// ─── DELIBERATELY NOT ASSERTED (scope — filed, not missed) ───────────────────────
// The roster prose count is stale beyond df1-5's routed finding: it says "nine faithful
// clones … five vector … four raster", but eleven games are wired (millipede AND
// defender are both absent from the prose). Adding defender makes "four raster" read as
// five, and "nine" was already two short. Correcting the numerals drags millipede into
// scope, which is a SEPARATE doc-accuracy story — filed as a df1-5 Delivery Finding
// (Gap, non-blocking), not pinned here. This file guards ONLY the routed finding:
// defender named + attributed, and the joust misattribution removed.
//
// Run from the orchestrator root: `npm run test:orchestrator`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const claude = readFileSync(join(root, 'CLAUDE.md'), 'utf8');

/** The `**Games:**` roster block — from the `**Games:**` marker to the section that
 *  follows it (`## Repository Structure`). Extracted rather than grepped line-by-line
 *  because the roster spans several wrapped lines and the "first Williams title …"
 *  attribution can sit on any of them. */
function rosterBlock() {
  const start = claude.indexOf('**Games:**');
  assert.notEqual(start, -1, 'CLAUDE.md must carry a `**Games:**` roster paragraph');
  const end = claude.indexOf('## Repository Structure', start);
  assert.notEqual(end, -1, 'the roster must be followed by the Repository Structure section');
  return claude.slice(start, end);
}

// ── Control / anti-vacuity ───────────────────────────────────────────────────
// If this fails the roster moved or the extraction broke; every guard below would
// then be asserting against the wrong text. It must PASS both before and after GREEN.
test('control: the `**Games:**` roster block is real and lists the known games', () => {
  const roster = rosterBlock();
  assert.ok(roster.length > 100, 'the roster block is implausibly short — extraction is wrong');
  // A handful of games that df1-5 does NOT touch, to prove we are reading the roster.
  for (const g of ['tempest', 'star-wars', 'centipede', 'joust', 'pac-man']) {
    assert.match(roster, new RegExp(g), `control: the roster must still list ${g}`);
  }
});

// ── AC2: defender is added to the roster, attributed to 1980 ─────────────────
test('AC2: the roster names `defender` with its 1980 attribution', () => {
  const roster = rosterBlock();
  assert.match(
    roster,
    /`?defender`?\s*\(1980\)/i,
    'CLAUDE.md\'s games roster must add defender with its year — `defender` (1980), © 1980 Williams ' +
      '(the year the df1-1 registry entry and plugin.ts meta already pin)',
  );
});

// ── AC2: the "first Williams title" attribution is defender, not joust ───────
// The roster is a comma-separated list of "`<game>` (<year>)" clauses; the phrase
// "first Williams title" lives inside exactly one of those clauses. The false state
// puts it in joust's clause; the fix moves it to defender's. Asserting on the CLAUSE
// (not on a character window) is robust to wording and to the games being listed
// adjacently — a naive "no line holds both joust and 'first Williams'" would wrongly
// redden the correct fix, because the corrected clause sits right beside joust's.
test('AC2: the "first Williams title" clause names defender, not joust', () => {
  const roster = rosterBlock();
  const firstWilliamsClause = roster
    .split(',')
    .find((clause) => /first Williams/i.test(clause));
  assert.ok(
    firstWilliamsClause,
    'the roster must attribute "first Williams title" to a game (the fix relocates it, it does not merely delete it — ' +
      'Defender being Williams\' first title is a fact worth keeping)',
  );
  assert.match(
    firstWilliamsClause,
    /defender/i,
    'the "first Williams title" must be defender (1980), Williams\' earlier title. Clause found: ' +
      JSON.stringify(firstWilliamsClause.trim()),
  );
  assert.doesNotMatch(
    firstWilliamsClause,
    /joust/i,
    'joust must NOT be in the "first Williams title" clause — Joust (1982) is not the first Williams title; ' +
      'Defender (1980) is. Clause found: ' + JSON.stringify(firstWilliamsClause.trim()),
  );
});

// ── AC2: the exact stale false phrasing is gone ──────────────────────────────
// Belt-and-suspenders on the LITERAL current defect ("the first Williams title `joust`").
// This is the "mutate with a WRONG value, not the old spelling" guard read in reverse:
// it bans the precise false text that ships today, so a fix that somehow satisfied the
// clause test while leaving this phrasing intact still cannot pass.
test('AC2: CLAUDE.md no longer calls joust "the first Williams title"', () => {
  assert.doesNotMatch(
    claude,
    /first Williams title\s+`?joust/i,
    'the phrase "the first Williams title `joust`" is the df1-1 review Gap finding this story removes — ' +
      'Defender (1980) predates Joust (1982)',
  );
});
