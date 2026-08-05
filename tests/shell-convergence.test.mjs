// Story sc1-1 — shell convergence: the cabinet-wide half of the contract.
//
// The helpers' BEHAVIOUR is guarded in `src/shared/tests/host-helpers.test.ts`
// (the AC-4 mutation battery). What lives here is everything that is about the
// SEVEN GAMES rather than about a helper: which games adopted what (AC-1), that
// adoption landed one game per commit (AC-3), and that the two ROM-cadence games
// kept their cadence and their input sampling (AC-2).
//
// ─── WHY AC-1 IS TESTED THIS WAY: THE MATRIX THAT ROTTED IN 48 HOURS ────────
// This story's declared input is the "MEASURED adoption matrix" at
// docs/superpowers/specs/2026-07-30-arcade-plugin-host-design.md:176-184. It was
// measured, it was correct on 2026-07-30 — and by the time the story was picked
// up it was WRONG in two rows. It records centipede and joust as having no audio
// unlock. Both have one:
//
//   joust      plugins/joust/src/main.ts:174   `audio.resume()`   (jt5-1, 2cafac2, 2026-07-31)
//   centipede  plugins/centipede/src/main.ts:114-117 `unlockAudio` (cp5-2, 6c2bf1a, 2026-08-01)
//
// A hand-copied matrix is a claim about seven files that nothing re-runs, so it
// starts rotting the moment it is written. The recorded matrix this story ships
// therefore records ONLY the adoption decision and its reason CODE — never the
// behaviour census, which is derived from the tree on every run. There is
// nothing left to rot: the one fact a reader needs ("does this game do this at
// all?") is computed, not remembered.
//
// The reason codes are a CLOSED vocabulary for the same purpose. `behaviour-absent`
// is the only code that asserts something about the tree, and the check below
// refutes it against the tree — which is exactly the error the spec's matrix made.
// A prose reason could have said "centipede has no audio unlock" forever.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MATRIX = join(ROOT, 'docs', 'ops', 'shell-adoption-matrix.md');

const GAMES = [
  'tempest',
  'star-wars',
  'asteroids',
  'battlezone',
  'red-baron',
  'centipede',
  'joust',
];

const HELPERS = ['mountCanvas', 'installAudioUnlock', 'installPauseToggle'];

/** A cell is either an adoption, or a reason code for not adopting. */
const REASON_CODES = ['behaviour-absent', 'rom-cadence', 'own-implementation'];
const CELL_VALUES = ['adopted', ...REASON_CODES];

/**
 * Source with comments removed.
 *
 * EVERY source-text assertion in this file goes through this. Without it a guard
 * cannot tell code from prose ABOUT code, so commenting a line out leaves the
 * guard green — the mechanism is gone and nothing says so. This is not
 * hypothetical here: three separate guards in this story were defeated exactly
 * that way (a `15750/263` check the file's own explanatory comment kept alive; a
 * mutation that hit `host-helpers.ts`'s doc comment instead of its code; and the
 * joust input seam below, where commenting out `held.add(e.code)` left all eight
 * tests passing). The repo already had the idiom in
 * `plugins/centipede/tests/audio-citations.test.ts`, which pins whole lines.
 *
 * Block comments first, then line comments. The `//` pattern is anchored to
 * start-of-line-or-whitespace so it cannot eat the `//` inside a `https://` URL.
 */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');

const mainSrc = (game) => stripComments(readFileSync(join(ROOT, 'plugins', game, 'src', 'main.ts'), 'utf8'));

/** A game's main.ts as it stood at the recorded baseline — BEFORE any adoption. */
const mainSrcAt = (baseline, game) =>
  stripComments(
    execFileSync('git', ['show', `${baseline}:plugins/${game}/src/main.ts`], {
      cwd: ROOT,
      encoding: 'utf8',
    }),
  );

// ─── The behaviour census, DERIVED — never recorded ─────────────────────────
// "Does this game do this at all?" — answered from source, never written down,
// so there is no census to go stale.
//
// ── READ THIS BEFORE CHANGING WHERE THESE ARE EVALUATED ─────────────────────
// These run against the BASELINE commit, not the working tree, and that is the
// whole correctness of the AC-1 growth check. The first cut evaluated them
// against the tree, and because each predicate also matches the helper's own
// call site (`\binstallPauseToggle\s*\(` …), an `adopted` cell made its own
// predicate true: the check "a helper is adopted only where the behaviour
// already exists" became tautological and could never fail, for any of the three
// helpers. It was reproduced end-to-end — joust, a game with no pause, was given
// a real import and call and its cell flipped to `adopted`, and all eight tests
// stayed green. That is verbatim what the epic forbids ("a game that has no
// pause today must not grow one here").
//
// A question about what a game did BEFORE the story can only be answered by the
// tree as it was BEFORE the story. The call-site alternations are kept because
// they cost nothing at the baseline (no game had adopted yet) and keep the
// predicates honest if a later story moves the baseline forward.
const PERFORMS = {
  mountCanvas: (src) => /#game|getElementById\(\s*['"]game['"]\s*\)|\bmountCanvas\s*\(/.test(src),
  installAudioUnlock: (src) => /\bresume\b|\binstallAudioUnlock\s*\(/.test(src),
  installPauseToggle: (src) => /\bisPauseKey\b|\btogglePaused\b|\binstallPauseToggle\s*\(/.test(src),
};

// ─── DELIBERATE, POST-CONVERGENCE GROWTHS ───────────────────────────────────
// The AC-1 growth check forbids a game ADOPTING a helper for a behaviour it did
// not already perform at the baseline. That rule scopes sc1 — a pure convergence
// refactor that must not sneak in a new behaviour. It does NOT bind a later
// FEATURE story that deliberately adds one: those are the epic's own words
// ("a game that has no pause today must not grow one HERE" — i.e. in the
// convergence), not a ban for all time.
//
// Each entry is a `<game>/<helper>` cell whose behaviour was grown ON PURPOSE by
// a named later story, so the baseline predicate would (correctly) report it
// absent. The waiver is NARROW: it exempts ONLY the "existed at baseline" test.
// The `adopted`-requires-import-and-call check (AC-1, above) is UNAFFECTED, so a
// cell here still has to genuinely wire the helper in the tree — this cannot be
// used to mark a cell adopted that nothing implements.
const DELIBERATE_GROWTH = new Set([
  // cp7-6 — centipede grew the house player pause (five vector games already had
  // it) and adopted installPauseToggle for it. Absent at the 088bc3d baseline by
  // construction; see docs/ops/shell-adoption-matrix.md's pause note.
  'centipede/installPauseToggle',
]);

/** Parse the recorded matrix into { [game]: { [helper]: cell } } plus its baseline. */
function readMatrix() {
  assert.ok(
    existsSync(MATRIX),
    `AC-1 requires the adoption matrix to be RECORDED — expected ${MATRIX.slice(ROOT.length + 1)}`,
  );
  const text = readFileSync(MATRIX, 'utf8');

  const baseline = /^\s*Baseline:\s*([0-9a-f]{7,40})\s*$/m.exec(text);
  assert.ok(
    baseline,
    'the matrix must carry a `Baseline: <commit-sha>` line — AC-3 measures adoption commits after it',
  );

  // Read ONLY the delimited block. The first cut of this parser scanned every
  // markdown row in the file whose first cell was a game name, and the document
  // that satisfied it immediately broke it: the section explaining how the old
  // matrix rotted carries a second table keyed by game
  // (`| centipede | 2026-08-01 | cp5-2 | ...`), which parsed as a matrix row and
  // silently OVERWROTE the real one. A file about seven games will keep growing
  // tables about those seven games, so the block is delimited explicitly rather
  // than inferred. Missing markers is a loud failure, not an empty scan.
  const block = /<!--\s*adoption-matrix:start\s*-->([\s\S]*?)<!--\s*adoption-matrix:end\s*-->/.exec(text);
  assert.ok(
    block,
    'the matrix table must sit between <!-- adoption-matrix:start --> and <!-- adoption-matrix:end -->',
  );

  const rows = {};
  for (const line of block[1].split('\n')) {
    const m = /^\|\s*([a-z-]+)\s*\|(.+)\|\s*$/.exec(line.trim());
    if (!m) continue;
    const game = m[1];
    if (!GAMES.includes(game)) continue;
    const cells = m[2].split('|').map((c) => c.trim());
    assert.equal(
      cells.length,
      HELPERS.length,
      `row \`${game}\` must have exactly ${HELPERS.length} helper cells, found ${cells.length}`,
    );
    rows[game] = Object.fromEntries(HELPERS.map((h, i) => [h, cells[i]]));
  }
  return { rows, baseline: baseline[1], text };
}

test('AC-1: the adoption matrix records every game against every helper', () => {
  const { rows } = readMatrix();
  for (const game of GAMES) {
    assert.ok(rows[game], `the matrix must carry a row for \`${game}\``);
    for (const helper of HELPERS) {
      assert.ok(
        CELL_VALUES.includes(rows[game][helper]),
        `${game}/${helper} is \`${rows[game][helper]}\` — must be one of ${CELL_VALUES.join(', ')}`,
      );
    }
  }
});

test('AC-1: `adopted` means the game actually imports that helper', () => {
  // The direction that catches a matrix drifting AHEAD of the code — a row
  // marked adopted for a game nobody wired up.
  const { rows } = readMatrix();
  let checked = 0;
  for (const game of GAMES) {
    const src = mainSrc(game);
    for (const helper of HELPERS) {
      if (rows[game][helper] !== 'adopted') continue;
      checked++;
      // Anchored to the IMPORT of @shared/host-helpers AND to a call site.
      //
      // The first cut asserted a bare `\b<helper>\b` plus "some `@shared/` import
      // exists", and verified neither thing it claimed: the bare name is
      // satisfied by a COMMENT, and every adopting game already imports
      // @shared/highscore or @shared/view, so the second half was unconditionally
      // true and discriminated nothing. Reproduced: tempest's mountCanvas import
      // was replaced by a LOCAL shadow reimplementing the exact pre-story
      // anti-pattern (`as HTMLCanvasElement` + `getContext('2d')!`) and this test
      // still passed it as "adopted" — tsc could not object either, because the
      // local function is used.
      // Asserted as BOOLEANS: `assert.match` against a whole main.ts dumps the
      // entire file into the failure output (red-baron's is 916 lines) and buries
      // the message that says what to do about it.
      assert.ok(
        new RegExp(`import\\s*\\{[^}]*\\b${helper}\\b[^}]*\\}\\s*from\\s*['"]@shared/host-helpers['"]`).test(src),
        `${game} is recorded as adopting ${helper} but does not import it from @shared/host-helpers`,
      );
      assert.ok(
        new RegExp(`\\b${helper}\\s*\\(`).test(src),
        `${game} imports ${helper} but never calls it`,
      );
    }
  }
  // The count is asserted FIRST-class, not incidentally: every assertion above
  // sits behind a `continue`, so a matrix with no `adopted` cell at all would
  // skip every iteration and this test would pass having compared nothing
  // (TS lang-review #15). A story that adopts no helper anywhere has not
  // happened.
  assert.ok(checked > 0, 'no helper is recorded as adopted by any game — the matrix asserts nothing');
});

test('AC-1: no game GROWS a behaviour — a helper is adopted only where the behaviour already exists', () => {
  // "a game that has no pause today must not grow one here" — the epic's words.
  const { rows, baseline } = readMatrix();
  let checked = 0;
  for (const game of GAMES) {
    // The BASELINE tree, not the working tree — see the PERFORMS note above.
    // Asking "did this game already do this?" of a tree that has already adopted
    // is asking the question after the answer has been overwritten.
    const before = mainSrcAt(baseline, game);
    for (const helper of HELPERS) {
      if (rows[game][helper] !== 'adopted') continue;
      // A cell grown on purpose by a later feature story is exempt from the
      // "existed at baseline" test — but NOT from the adopted-requires-import
      // check above, which still holds it to actually wiring the helper.
      if (DELIBERATE_GROWTH.has(`${game}/${helper}`)) continue;
      checked++;
      assert.ok(
        PERFORMS[helper](before),
        `${game} adopted ${helper} but did NOT perform that behaviour at ${baseline} — ` +
          `AC-1 forbids growing it here ("a game that has no pause today must not grow one"). ` +
          `If this is a DELIBERATE feature growth, add \`${game}/${helper}\` to DELIBERATE_GROWTH ` +
          `with the story that grew it`,
      );
    }
  }
  assert.ok(checked > 0, 'no adopted cell to check — see the count note above (TS lang-review #15)');
});

test('AC-1: a `behaviour-absent` cell is refuted by the tree if the game DOES perform it', () => {
  // This is the guard the spec's own matrix would have failed. `behaviour-absent`
  // is the single reason code that makes a claim about the source, so it is the
  // single one that can be checked — and it is checked against the tree, not
  // against a remembered census.
  const { rows } = readMatrix();
  let checked = 0;
  for (const game of GAMES) {
    // Evaluated on the WORKING TREE deliberately, unlike the growth check above.
    // `behaviour-absent` is a claim about the code as it stands NOW ("this game
    // does not do this"), so the live tree is the right thing to refute it with.
    const src = mainSrc(game);
    for (const helper of HELPERS) {
      if (rows[game][helper] !== 'behaviour-absent') continue;
      checked++;
      assert.ok(
        !PERFORMS[helper](src),
        `${game}/${helper} is recorded \`behaviour-absent\`, but ${game}'s main.ts performs it — ` +
          `use a different reason code (this is exactly how the 2026-07-30 spec matrix went stale)`,
      );
    }
  }
  // The count guard its two siblings already carried. Proven necessary, not
  // theoretical: flipping the two live `behaviour-absent` cells to another valid
  // code left this test green while it compared ZERO things (TS lang-review #15,
  // "assert the collected count FIRST").
  assert.ok(
    checked > 0,
    'the matrix records no `behaviour-absent` cell, so this test compared nothing — ' +
      'either a cell is miscoded, or this guard needs retiring rather than passing silently',
  );
});

test('AC-1: the stale spec matrix is corrected, not silently superseded', () => {
  // The design spec is the story's declared input and it is WRONG in two rows.
  // Leaving it uncorrected means the next reader re-derives this story's scope
  // from a document this story already proved false.
  const spec = join(ROOT, 'docs', 'superpowers', 'specs', '2026-07-30-arcade-plugin-host-design.md');
  const text = readFileSync(spec, 'utf8');
  // Asserted as a BOOLEAN, not via assert.match: matching against a 20KB
  // document dumps the entire file into the failure output and buries the
  // message that says what to do about it.
  assert.ok(
    /shell-adoption-matrix|sc1-1/.test(text),
    'spec section 4.3 must point at the live adoption matrix — its own table is stale ' +
      '(centipede gained audio unlock in cp5-2, joust in jt5-1, both AFTER the table was measured)',
  );
});

test('AC-3: adoption lands one game per commit, so a timing regression has one suspect', () => {
  // Bounded to the commits AFTER the recorded baseline. A whole-history rule
  // would be wrong, not merely brittle: cd94e59 ("seed same-origin scores from
  // the legacy cookie") legitimately touched five games' main.ts at once, and
  // this story has no business re-litigating it.
  const { baseline } = readMatrix();
  const range = `${baseline}..HEAD`;
  const shas = execFileSync('git', ['log', '--format=%h', range, '--', 'plugins/*/src/main.ts'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);

  // Closes the loophole that would make this test measure nothing: a `Baseline:`
  // recorded AFTER the adoption work leaves the range empty and the loop below
  // never runs. So an adopted matrix REQUIRES adoption commits inside the range.
  // (Same family as the ratchet that called checkTree with its default roots and
  // reported the un-widened tree as proof — a test whose subject is a change must
  // not be able to measure the world before it.)
  const { rows } = readMatrix();
  const anyAdopted = GAMES.some((g) => HELPERS.some((h) => rows[g][h] === 'adopted'));
  if (anyAdopted) {
    assert.ok(
      shas.length > 0,
      `the matrix records adoptions but no commit after ${baseline} touches any game's main.ts — ` +
        `the baseline is recorded ahead of the work, so AC-3 would measure an empty range`,
    );
  }

  for (const sha of shas) {
    const touched = new Set(
      execFileSync('git', ['show', '--name-only', '--format=', sha, '--', 'plugins/*/src/main.ts'], {
        cwd: ROOT,
        encoding: 'utf8',
      })
        .split('\n')
        .filter(Boolean)
        .map((p) => p.split('/')[1]),
    );
    assert.ok(
      touched.size <= 1,
      `commit ${sha} changed ${touched.size} games' main.ts (${[...touched].join(', ')}) — ` +
        `AC-3 requires one game per commit`,
    );
  }
});

// ─── AC-2 — the two ROM-cadence games ───────────────────────────────────────
// READ THIS BEFORE TRUSTING A GREEN SUITE HERE.
//
// AC-2 names "their existing determinism replays reproducing bit-for-bit" as the
// proof. Those replays cannot deliver it. Both are CORE replays:
//
//   joust      tests/arena-destruction.test.ts:235 replays `applyWaveDestruction`
//              over ArenaState — pure geometry, no DOM, no shell, no main.ts
//   centipede  tests/attract-demo.test.ts:119 replays a seeded sim; it imports
//              core/sim and shell/render, and never main.ts
//
// Neither mounts a canvas, unlocks audio or installs a pause toggle, so neither
// can observe ANY helper this story ships. They will reproduce bit-for-bit
// whether adoption was correct or catastrophic. Keeping them green is necessary
// and nowhere near sufficient, and a story that cited them as its cadence proof
// would be citing an instrument that is blind to the change.
//
// What CAN see a cadence regression is pinned below: the frame clock itself, and
// the input-sampling seam that the helper is most likely to disturb.
test('AC-2: centipede keeps the ROM frame clock (15750/263 Hz), not a rounded stand-in', () => {
  // Comments stripped, then anchored to the DECLARATION rather than the ratio.
  // Both halves were earned by mutation. The first cut asserted a bare
  // /15750\s*\/\s*263/ and was VACUOUS: timebase.ts:5 explains the clock in a
  // comment ("FRAME_HZ = 15750/263 = 59.88593 Hz"), so rewriting the real
  // constant on :20 to `60` left it green. Naming `export const FRAME_HZ` fixed
  // that; stripping comments closes the remaining hole, where COMMENTING OUT the
  // declaration would have left its text in the file and the guard still green.
  const timebase = stripComments(
    readFileSync(join(ROOT, 'plugins', 'centipede', 'src', 'shell', 'timebase.ts'), 'utf8'),
  );
  assert.match(
    timebase,
    /export\s+const\s+FRAME_HZ\s*=\s*15750\s*\/\s*263\b/,
    'centipede FRAME_HZ must stay the ROM ratio 15750/263 — a rounded 60 is a cadence regression',
  );
});

test('AC-2: joust keeps its per-frame input sampling — the unlock must not swallow the held set', () => {
  // joust's audio unlock is FUSED into the handler that samples input:
  //
  //   window.addEventListener('keydown', (e) => {
  //     audio.resume()          <- the unlock
  //     held.add(e.code)        <- the input sample
  //     if (e.code === 'Space') e.preventDefault()
  //   })
  //
  // So adopting installAudioUnlock here necessarily edits the input path — the
  // precise hazard the epic names ("a helper that changes when a frame starts or
  // how input is sampled is a regression even if every test stays green"). The
  // helper must be added ALONGSIDE this handler, never by replacing it.
  //
  // `mainSrc` strips comments, and that is load-bearing here rather than tidy.
  // The first cut matched raw source, so all three assertions below survived
  // COMMENTING OUT the very lines they guard — `// held.add(e.code)` still
  // contains the text `held.add(e.code)`. The sampling could have been disabled
  // outright with the suite green, on the one guard this file calls the
  // load-bearing proof for the riskiest cadence-sensitive game.
  const src = mainSrc('joust');
  assert.match(src, /held\.add\(\s*e\.code\s*\)/, "joust must still sample held keys into `held`");
  assert.match(src, /held\.delete\(\s*e\.code\s*\)/, 'joust must still release held keys on keyup');
  assert.match(
    src,
    /e\.preventDefault\(\)/,
    'joust must still preventDefault on Space — losing it scrolls the page mid-game',
  );
});
