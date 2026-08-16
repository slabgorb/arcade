// Story df1-9 — close the games-roster staleness cycle (RED, Leeloo/TEA).
//
// Routed from df1-7 review. df1-5 corrected the CLAUDE.md `**Games:**` prose but
// EXPLICITLY filed the surviving stale surfaces + the missing mechanism out of scope
// (see tests/df1-5-defender-roster-doc.test.mjs, "DELIBERATELY NOT ASSERTED"). This
// file is that follow-up: it reconciles the last two stale surfaces AND installs the
// guard neither df1-5 nor df1-7 added, so a future twelfth game reddens a test instead
// of silently desyncing the docs again.
//
// ─── THE SINGLE SOURCE OF TRUTH ──────────────────────────────────────────────────
// The wired game set is the set of directories under plugins/. That is exactly the set
// tests/monorepo-topology.test.mjs binds its `GAMES` const to ("plugins/ holds exactly
// the eleven games this file loops over", monorepo-topology.test.mjs:104), so deriving
// from readdirSync(plugins) here and from GAMES there cannot diverge — if they ever did,
// that topology test reddens first. Every count below is compared against WIRED_COUNT,
// NEVER against a hardcoded 11: hardcoding the total is precisely the desync this story
// closes, because it would sail through the addition of a twelfth game.
//
// ─── WHAT IS RED NOW, AND WHY (feature-shaped failures — AC1, AC2) ────────────────
//   • AC1  README.md:127's `just build-all` comment says "(nine games + the lobby)".
//          Nine ≠ WIRED_COUNT (eleven) → "README build-all comment states the wired
//          count" FAILS until Dev updates the numeral.
//   • AC2  CLAUDE.md's R2 hosting table lists nine game rows and omits `defender/` and
//          `millipede/` → "every wired game has an R2 hosting-table row" and "the R2
//          table lists exactly the wired games" FAIL until Dev adds the two rows.
//
// ─── WHAT IS GREEN NOW, AND WHY IT STILL BELONGS HERE (AC3 — the mechanism) ───────
// The `**Games:**` prose ("eleven faithful clones — five vector … six raster …") was
// already corrected by df1-5's follow-up and is CORRECT today, so the three prose-numeral
// guards below PASS on arrival. They are not RED filler — they are the anti-desync
// mechanism this story exists to install. They are non-vacuous because each is compared
// to WIRED_COUNT (a readdirSync-derived number), not to a literal:
//
//   MUTATION PROOF — add a directory `plugins/pong/` (a twelfth wired game) and every
//   count guard here reddens: the README numeral (still 11), the R2 row set (no pong
//   row), the "faithful clones" numeral (still eleven), the vector+raster split sum
//   (still 5+6=11), and the enumerated year-clause count (still 11) all disagree with
//   WIRED_COUNT=12. That is the whole point: silence becomes red.
//
// We pin the VALUE, not the spelling — `parseCount` accepts a word ("eleven") OR a digit
// ("11"), so Dev may write the fix either way without tripping the guard. Over-pinning
// the wording is a separate concern df1-5 already owns for the `**Games:**` block.
//
// Run from the orchestrator root: `npm run test:orchestrator`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

// ── The wired game set (source of truth) ─────────────────────────────────────
// Directories under plugins/. Sorted for stable diffs. This is the same roster
// monorepo-topology.test.mjs:104 pins its GAMES const equal to.
const WIRED = readdirSync(join(root, 'plugins'), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();
const WIRED_COUNT = WIRED.length;

const README = read('README.md');
const CLAUDE = read('CLAUDE.md');

/** English cardinal words this repo's roster prose actually uses, 0–20, so a numeral
 *  written as a word ("eleven") is comparable to WIRED_COUNT. A future twelfth game
 *  needs "twelve" to be recognised, hence the range extends past today's counts. */
const WORD_TO_NUMBER = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20,
};

/** Parse a roster count token that may be a digit ("11") or an English word ("eleven").
 *  Returns null for anything else, so a caller can assert on a real miss rather than
 *  silently comparing NaN. */
function parseCount(token) {
  if (token == null) return null;
  const t = String(token).trim().toLowerCase();
  if (/^\d+$/.test(t)) return Number(t);
  // Object.hasOwn (not `t in …`) so inherited Object members ('constructor', '__proto__')
  // cannot leak through the prototype chain — rule #3, per tests/sprint-repo-routing.test.mjs.
  return Object.hasOwn(WORD_TO_NUMBER, t) ? WORD_TO_NUMBER[t] : null;
}

// ── Control / anti-vacuity ───────────────────────────────────────────────────
// If any of this fails, every guard below is measuring against the wrong text.
// Must PASS both before and after GREEN.
test('control: the wired game set is derived, plausible, and includes known games', () => {
  assert.ok(WIRED_COUNT >= 9, `expected at least the nine original games, got ${WIRED_COUNT}: ${WIRED}`);
  for (const g of ['tempest', 'centipede', 'pac-man', 'defender', 'millipede']) {
    assert.ok(WIRED.includes(g), `control: plugins/${g}/ must exist — wired set: ${WIRED}`);
  }
  assert.equal(parseCount('nine'), 9, 'parseCount must read English words');
  assert.equal(parseCount('11'), 11, 'parseCount must read digits');
  assert.equal(parseCount('banana'), null, 'parseCount must reject non-numbers');
  // Rule #3 (prototype pollution, CWE-1321): membership must be answered by real content
  // only. Against a plain `{}` lookup these inherited Object members leak — `constructor`
  // returns the Object function and `__proto__` returns Object.prototype — breaking the
  // documented "returns null for anything else" contract. The repo already ruled this shape
  // a defect (tests/sprint-repo-routing.test.mjs:177-193). These assertions are RED until
  // WORD_TO_NUMBER stops walking the prototype chain.
  assert.equal(parseCount('constructor'), null, 'inherited Object members must not parse as a count (rule #3)');
  assert.equal(parseCount('__proto__'), null, 'inherited Object members must not parse as a count (rule #3)');
  assert.equal(parseCount('toString'), null, 'inherited Object members must not parse as a count (rule #3)');
});

// ══ AC1 — README `just build-all` comment states the true wired count ════════
// RED NOW: the comment reads "(nine games + the lobby)"; nine ≠ WIRED_COUNT.
// Anchored on the build-all comment so it can never be satisfied by (or falsely
// reddened by) the HISTORICAL "nine separate repos" line at README.md:9.
test('AC1: README build-all comment states the wired game count', () => {
  const m = README.match(/build every app \(([\w-]+) games \+ the lobby\)/);
  assert.ok(
    m,
    'README.md must keep the `just build-all` comment in the form ' +
      '"build every app (<count> games + the lobby)" — extraction anchor for this guard',
  );
  const stated = parseCount(m[1]);
  assert.equal(
    stated,
    WIRED_COUNT,
    `README build-all comment says "${m[1]} games" but ${WIRED_COUNT} games are wired ` +
      `under plugins/ (${WIRED.join(', ')}). Update the numeral to match the roster.`,
  );
});

// ══ AC2 — CLAUDE.md R2 hosting table covers exactly the wired games ══════════
// RED NOW: the table omits the defender/ and millipede/ rows.

/** The R2 hosting table block: from its "| App " header to the blank line that ends
 *  the table. Extracted (not grepped line-by-line) so the row assertions read the
 *  hosting table specifically and not some other pipe-table elsewhere in the file. */
function r2TableBlock() {
  const header = CLAUDE.indexOf('| App        | Path on the single origin');
  assert.notEqual(header, -1, 'CLAUDE.md must carry the R2 hosting table with its "| App … " header');
  const end = CLAUDE.indexOf('\n\n', header);
  assert.notEqual(end, -1, 'the R2 hosting table must be terminated by a blank line');
  return CLAUDE.slice(header, end);
}

test('AC2: every wired game has a row in the CLAUDE.md R2 hosting table', () => {
  const table = r2TableBlock();
  for (const id of WIRED) {
    assert.match(
      table,
      new RegExp(`https://arcade\\.slabgorb\\.com/${id}/`),
      `the R2 hosting table must list ${id} at arcade.slabgorb.com/${id}/ — it is a wired game ` +
        `under plugins/${id}/ but has no hosting row (df1-9 adds the defender/ and millipede/ rows)`,
    );
  }
});

test('AC2: the R2 hosting table lists exactly the wired games — no more, no fewer', () => {
  const table = r2TableBlock();
  // Game rows only — the lobby row points at the bucket root (…/com/`), not a /<id>/ prefix.
  const rowIds = [...table.matchAll(/https:\/\/arcade\.slabgorb\.com\/([\w-]+)\//g)]
    .map((m) => m[1])
    .sort();
  assert.deepEqual(
    rowIds,
    WIRED,
    'the R2 hosting table\'s game rows must be exactly the wired game set. A stray row (a ' +
      'retired game) or a missing row (a game with no hosting entry) both desync the docs.',
  );
  // Control: the lobby still owns the root, proving this is the hosting table.
  assert.match(table, /\| lobby\s+\| `https:\/\/arcade\.slabgorb\.com\/`/, 'lobby must own the bucket root');
});

// ══ AC3 — the desync-closure mechanism: `**Games:**` prose numerals ══════════
// GREEN NOW (the prose is already correct). These pin the roster total and the
// raster/vector split to WIRED_COUNT so a future addition cannot silently rot them.

/** The `**Games:**` roster paragraph, from its marker to the section that follows. */
function gamesProse() {
  const start = CLAUDE.indexOf('**Games:**');
  assert.notEqual(start, -1, 'CLAUDE.md must carry a `**Games:**` roster paragraph');
  const end = CLAUDE.indexOf('## Repository Structure', start);
  assert.notEqual(end, -1, 'the roster must be followed by the Repository Structure section');
  return CLAUDE.slice(start, end);
}

test('AC3: the `**Games:**` total numeral equals the wired game count', () => {
  const prose = gamesProse();
  const m = prose.match(/\*\*Games:\*\*\s+([\w-]+)\s+faithful clones/);
  assert.ok(m, 'the roster must open "**Games:** <count> faithful clones …"');
  assert.equal(
    parseCount(m[1]),
    WIRED_COUNT,
    `the roster claims "${m[1]} faithful clones" but ${WIRED_COUNT} games are wired`,
  );
});

test('AC3: the vector + raster split sums to the wired game count', () => {
  const prose = gamesProse();
  const vec = prose.match(/([\w-]+)\s+vector:/);
  const ras = prose.match(/([\w-]+)\s+raster:/);
  assert.ok(vec && ras, 'the roster must name a "<n> vector:" and "<n> raster:" split');
  const v = parseCount(vec[1]);
  const r = parseCount(ras[1]);
  assert.ok(v != null && r != null, `unparseable split numerals: "${vec[1]}" / "${ras[1]}"`);
  assert.equal(
    v + r,
    WIRED_COUNT,
    `the roster split says ${v} vector + ${r} raster = ${v + r}, but ${WIRED_COUNT} games are wired`,
  );
});

test('AC3: the `**Games:**` prose enumerates exactly the wired count of dated games', () => {
  const prose = gamesProse();
  // Each game is listed as `<id>` (<year>). Count the year clauses — one per game.
  const years = [...prose.matchAll(/\((\d{4})\)/g)];
  assert.equal(
    years.length,
    WIRED_COUNT,
    `the roster enumerates ${years.length} dated games but ${WIRED_COUNT} are wired — a game ` +
      'was added to plugins/ without being listed (or a numeral was changed without the list)',
  );
});
