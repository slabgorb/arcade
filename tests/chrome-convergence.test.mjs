// Story sa1-1 (epic sa1, "Polish and QOL") — RED phase (O'Brien / TEA).
//
// The cabinet-wide half of the display-chrome contract: "ALL games route through
// it for consistency." The pure region math and the uniform draw seam are pinned
// per-behaviour in src/shared/tests/cabinet.test.ts; what lives HERE is the fleet
// fact that fidelity to a single shared surround can only mean — every game
// actually imports and uses @shared/cabinet, and none quietly keeps painting its
// own margins.
//
// This mirrors tests/shell-convergence.test.mjs exactly, and for the same reason
// its author gives: a hand-copied "which games adopted" list rots the moment it
// is written, so the matrix records ONLY the adoption DECISION (adopted, or a
// reason code from a closed vocabulary) and this test refutes it against the tree
// on every run. The one fact a reader needs — "does this game route through the
// shared chrome?" — is computed from the source, never remembered.
//
// ── CONTRACT Dev implements to turn this GREEN ──────────────────────────────
//   1. src/shared/cabinet.ts exists (the module the unit test pins).
//   2. Every listed game adopts it: some file under plugins/<id>/src imports
//      from '@shared/cabinet'. A game that genuinely cannot (documented) carries
//      a reason code instead of `adopted`.
//   3. docs/ops/chrome-adoption-matrix.md records the decision between the
//      <!-- chrome-adoption-matrix:start --> / :end markers, one row per game.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MATRIX = join(ROOT, 'docs', 'ops', 'chrome-adoption-matrix.md');

// The whole cabinet floor — the same eleven vitest projects list. "All games"
// means all of them, not the seven that predate the monorepo collapse.
const GAMES = [
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
  'defender',
];

// A cell is either an adoption or a reason code for not adopting. The vocabulary
// is CLOSED and the test rejects anything outside it — a prose reason nobody can
// check is a reason nobody will re-examine (the sc1-1 lesson).
const REASON_CODES = ['own-implementation', 'no-fit-margins'];
const CELL_VALUES = ['adopted', ...REASON_CODES];

/** Strip comments so a commented-out import cannot satisfy the adoption check. */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');

/** Every .ts file under plugins/<game>/src, recursively. */
function srcFiles(game) {
  const root = join(ROOT, 'plugins', game, 'src');
  const out = [];
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.endsWith('.ts')) out.push(p);
    }
  };
  if (existsSync(root)) walk(root);
  return out;
}

/** Does any of this game's source IMPORT from '@shared/cabinet'? */
function importsChrome(game) {
  const importRe = /from\s*['"]@shared\/cabinet['"]/;
  return srcFiles(game).some((f) => importRe.test(stripComments(readFileSync(f, 'utf8'))));
}

/**
 * Does this game genuinely ROUTE THROUGH the shared chrome — import it AND actually
 * CALL `drawCabinetChrome(...)`? The import alone is not adoption: a dangling import
 * (or one kept only for a type) paints nothing, so requiring the call site closes the
 * hole where a game satisfies the matrix without ever framing its surround. (Whether
 * that call paints a bar this frame depends on the live fit — a full-bleed game's call
 * is a legitimate no-op — so we require the call site, not a proven non-empty draw.)
 */
function routesThroughChrome(game) {
  if (!importsChrome(game)) return false;
  const callRe = /\bdrawCabinetChrome\s*\(/;
  return srcFiles(game).some((f) => callRe.test(stripComments(readFileSync(f, 'utf8'))));
}

/** Parse the recorded matrix into { [game]: cell }. */
function readMatrix() {
  assert.ok(
    existsSync(MATRIX),
    `sa1-1 requires the chrome adoption matrix to be RECORDED — expected ${MATRIX.slice(ROOT.length + 1)}`,
  );
  const text = readFileSync(MATRIX, 'utf8');
  const block =
    /<!--\s*chrome-adoption-matrix:start\s*-->([\s\S]*?)<!--\s*chrome-adoption-matrix:end\s*-->/.exec(text);
  assert.ok(
    block,
    'the matrix table must sit between <!-- chrome-adoption-matrix:start --> and <!-- chrome-adoption-matrix:end -->',
  );

  const rows = {};
  for (const line of block[1].split('\n')) {
    const m = /^\|\s*([a-z-]+)\s*\|\s*([a-z-]+)\s*\|\s*$/.exec(line.trim());
    if (!m) continue;
    const [, game, cell] = m;
    if (!GAMES.includes(game)) continue;
    assert.ok(
      CELL_VALUES.includes(cell),
      `${game}: cell '${cell}' is not one of ${CELL_VALUES.join(', ')}`,
    );
    rows[game] = cell;
  }
  return rows;
}

test('the matrix lists exactly the whole cabinet floor — no game omitted', () => {
  const rows = readMatrix();
  assert.ok(GAMES.length > 0);
  assert.deepEqual(Object.keys(rows).sort(), [...GAMES].sort());
});

test('every game marked `adopted` imports AND calls @shared/cabinet (not just a dangling import)', () => {
  const rows = readMatrix();
  for (const game of GAMES) {
    if (rows[game] !== 'adopted') continue;
    assert.ok(
      routesThroughChrome(game),
      `${game} is 'adopted' but its source does not both import '@shared/cabinet' AND call drawCabinetChrome(...)`,
    );
  }
});

test('every game NOT marked `adopted` does NOT import @shared/cabinet (the reason code is honest)', () => {
  const rows = readMatrix();
  for (const game of GAMES) {
    if (rows[game] === 'adopted') continue;
    // A non-adopted game must not import the module at all — not merely skip the call.
    assert.ok(
      !importsChrome(game),
      `${game} is '${rows[game]}' but its source DOES import '@shared/cabinet' — mark it 'adopted'`,
    );
  }
});

test('consistency is real: every game routes through the shared chrome (no reason codes yet)', () => {
  // sa1-1's own AC is fleet-wide adoption. A reason code is the documented escape
  // hatch for a future game that genuinely cannot fit margins, not a way to ship
  // this story with games left inconsistent. If a real exception surfaces during
  // GREEN, relax THIS test with the named game + reason and record it in the matrix.
  const rows = readMatrix();
  const holdouts = GAMES.filter((g) => rows[g] !== 'adopted');
  assert.deepEqual(holdouts, [], `these games do not yet route through @shared/cabinet: ${holdouts.join(', ')}`);
});
