// Story mg1-4 — the sprint YAMLs still route stories to repos the registry retired.
//
// The 2026-07-30 collapse made nine repos into one and Task 22 shrank
// `.pennyfarthing/repos.yaml` to a single `arcade` entry. The sprint YAMLs were not
// part of that change, so 80 stories and 9 epics still carry `repos:` values naming
// star-wars, joust, battlezone, centipede, red-baron, lobby, tempest and asteroids.
//
// WHY THIS NEEDS A GUARD RATHER THAN A ONE-OFF SWEEP — measured against pf 13.4.0's
// own source (an editable install; `pf.__file__` resolves to the orc-penny checkout,
// so that source is what actually runs):
//   - `pf/context/generate.py:53` reads `story.get("repos", "")` and renders it into
//     the agent context as PROSE: `- **Repo:** {repos}`. It never resolves a path.
//   - `pf/core/resolver.py:42` only collects epic repo values into a list.
// Nothing looks the value up, so nothing throws, no command exits non-zero, and no
// existing test reddens. The failure mode is silent and human: every story setup
// hands the next agent a context file naming a directory that moved to `plugins/<id>/`.
// A defect that cannot fail loudly will come back the moment someone files a story by
// copying its neighbour — which is exactly what a guard is for.
//
// SCOPE — the orchestrator suite, deliberately. Per CLAUDE.md the two suites do not
// overlap: vitest owns the apps' `*.test.ts`, and `npm run test:orchestrator` owns
// `tests/**/*.test.mjs` under node:test, which is where "a change to CI, the justfile,
// the deploy workflow or this file" is guarded. Sprint YAML routing is cabinet wiring,
// not app behaviour, so it belongs here and NOT in a vitest project.
//
// RED STATE AS WRITTEN (TEA, mg1-4):
//   - The AC-1/AC-2/AC-3 tests below `await import('./helpers/sprint-repos.mjs')`,
//     a module that does not exist yet. They fail on the import. That is intended.
//   - The AC-4 tests deliberately import NOTHING beyond node:fs, so they run and PASS
//     right now. They are a regression guard on the sweep, not a target for it: this
//     repo has already lost an epic's acceptance criteria to a pf YAML round-trip, and
//     these two tests are what turn a repeat into a red build instead of a silent loss.
//     Measured green before the sweep, 2026-07-31: 9 epic files, 80 stories, every one
//     carrying id + title, no empty acceptance_criteria list, no unquoted ' #'.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const path = (...rel) => join(repo, ...rel);
const read = (...rel) => readFileSync(path(...rel), 'utf8');

// The active sprint — epic shards only. `current-sprint.yaml`, `sprint/planning/` and
// `sprint/demos/` were checked and carry no `repos:` line at all, so widening the glob
// would add scanning cost and no coverage. `sprint/archive/` is NOT here on purpose;
// AC-3 makes that a stated decision and the test below holds the helper to it.
const epicFiles = () =>
  readdirSync(path('sprint'))
    .filter((f) => /^epic-.*\.yaml$/.test(f))
    .sort()
    .map((f) => ({ path: `sprint/${f}`, text: read('sprint', f) }));

const helper = () => import('./helpers/sprint-repos.mjs');

// ---------------------------------------------------------------------------
// AC-1 — every repos value names a registered repo, or the field is gone.
// ---------------------------------------------------------------------------

test('every active sprint repos value names a repo the registry registers', async () => {
  const { registeredRepoIdentifiers, repoRoutingViolations } = await helper();

  const identifiers = registeredRepoIdentifiers(read('.pennyfarthing', 'repos.yaml'));
  const violations = repoRoutingViolations(epicFiles(), identifiers);

  // Name the offenders in the failure. A bare count sends the next reader back to
  // grep; the whole point of the guard is that it says what to fix and where.
  const rendered = violations.map((v) => `${v.file}:${v.line} -> ${v.token}`).join('\n');
  assert.deepEqual(
    violations,
    [],
    `sprint files still route to repos .pennyfarthing/repos.yaml does not register:\n${rendered}`,
  );
});

test('a dropped repos field is not a violation — removing it is a valid fix', async () => {
  const { repoRoutingViolations } = await helper();

  // AC-1 offers two ways out: correct the value, or drop the field "where it no
  // longer carries meaning". With exactly one repo registered, dropping it is a
  // defensible reading, so the guard must not force a value to exist. This test
  // exists to keep the sweep's author free to choose — if the guard demanded a
  // `repos:` line, it would quietly convert AC-1's "or" into an "and".
  const noRepoField = {
    path: 'sprint/epic-fixture.yaml',
    text: ['stories:', '  - id: fx-1', '    title: a story with no repos field', '    workflow: tdd'].join('\n'),
  };

  assert.deepEqual(repoRoutingViolations([noRepoField], new Set(['arcade', '.'])), []);
});

// ---------------------------------------------------------------------------
// AC-2 — the guard reads the registry; it does not carry its own list.
// ---------------------------------------------------------------------------

test('valid identifiers are DERIVED from repos.yaml, not hardcoded', async () => {
  const { registeredRepoIdentifiers } = await helper();

  // The story is explicit that a hardcoded set "becomes the next stale list", so
  // assert the property behaviourally rather than by reading the source for the
  // absence of game names. Feed it a registry describing a repo that has never
  // existed in this project: a hardcoded implementation cannot pass this.
  const fixture = ['pr_title_format: x', 'repos:', '  zork:', '    path: dungeons/zork', '    type: game'].join('\n');
  const identifiers = registeredRepoIdentifiers(fixture);

  assert.ok(identifiers.has('zork'), 'the entry NAME in the given registry must be accepted');
  assert.ok(identifiers.has('dungeons/zork'), "the entry's declared path must be accepted");
  assert.ok(
    !identifiers.has('arcade'),
    'arcade must NOT be accepted when the given registry does not contain it — that is the hardcoding tell',
  );
});

test('an entry with no explicit path falls back to its name, as pf itself does', async () => {
  const { registeredRepoIdentifiers } = await helper();

  // Mirrors pf/git/repos.py `_parse_repo_entry`: `path=data.get("path", name)`.
  // Pinning the fallback here keeps the guard's notion of "registered" identical to
  // the toolchain's, rather than merely similar to it.
  //
  // The fixture starts AT `repos:` on purpose, and it is not cosmetic. TEA wrote a
  // throwaway implementation to check these tests fail on data rather than on a
  // missing import, and this is the one test that caught it: locating the block with
  // `text.indexOf('\nrepos:')` — the idiom `monorepo-topology.test.mjs` uses, where
  // the committed file happens to begin with `pr_title_format:` — returns -1 when
  // `repos:` is the first line, and the helper then hands back an EMPTY set. Empty is
  // the worst outcome available: every sprint value becomes a violation at once, so
  // the guard reddens loudly while pointing at 89 innocent lines. Anchor on
  // start-of-line, not on a preceding newline.
  const identifiers = registeredRepoIdentifiers(['repos:', '  solo:', '    type: game'].join('\n'));
  assert.ok(identifiers.has('solo'), 'a pathless entry must still be valid under its own name');
  assert.ok(
    identifiers.size > 0,
    'an empty identifier set means the `repos:` block was not located at all — see the note above',
  );
});

test('the real registry yields exactly the arcade entry and its root path', async () => {
  const { registeredRepoIdentifiers } = await helper();

  const identifiers = registeredRepoIdentifiers(read('.pennyfarthing', 'repos.yaml'));

  // `arcade` is the entry name and `.` is its declared path. Both identify the one
  // registered repo, so both are legitimate values for a sprint file to carry — 23
  // active stories already use `.`. Asserting the exact set (not just membership)
  // is what catches a helper that waves everything through.
  assert.deepEqual([...identifiers].sort(), ['.', 'arcade']);
});

test('an unregistered token is reported with the file and line that carry it', async () => {
  const { repoRoutingViolations } = await helper();

  // Comma-separated lists are the shape most likely to be mis-split: epic-uf1 carries
  // `red-baron,joust,star-wars,lobby,.` — a list mixing four dead names with one live
  // value. A guard that checked the whole string would pass it; a guard that split but
  // did not trim would reject the live `.` too. Both mistakes are pinned here.
  const fixture = {
    path: 'sprint/epic-fixture.yaml',
    text: ['repos: arcade, star-wars , .', 'stories:', '  - id: fx-1', '    repos: joust'].join('\n'),
  };

  const violations = repoRoutingViolations([fixture], new Set(['arcade', '.']));

  assert.deepEqual(violations, [
    { file: 'sprint/epic-fixture.yaml', line: 1, token: 'star-wars' },
    { file: 'sprint/epic-fixture.yaml', line: 4, token: 'joust' },
  ]);
});

test('inherited Object keys are not mistaken for registered repos', async () => {
  const { registeredRepoIdentifiers, repoRoutingViolations } = await helper();

  // javascript.md check #3 (prototype pollution) applied to this exact code shape.
  // If the identifier collection is a plain `{}` rather than a Set or Map, then
  // `identifiers['constructor']` and `identifiers['__proto__']` are truthy for FREE,
  // and a sprint file routing to a repo literally named `constructor` sails through
  // the guard. That is not hypothetical pedantry — a `repos:` value is arbitrary text
  // out of a YAML file, and the whole job of this helper is deciding which arbitrary
  // strings are legitimate. Membership must be answered by real content only.
  const identifiers = registeredRepoIdentifiers(['repos:', '  arcade:', '    path: .'].join('\n'));

  for (const inherited of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
    assert.ok(
      !identifiers.has(inherited),
      `${inherited} is an inherited Object member, never a registered repo — use a Set/Map, not {}`,
    );
  }

  const fixture = { path: 'sprint/epic-fixture.yaml', text: 'repos: constructor' };
  assert.deepEqual(repoRoutingViolations([fixture], identifiers), [
    { file: 'sprint/epic-fixture.yaml', line: 1, token: 'constructor' },
  ]);
});

// ---------------------------------------------------------------------------
// AC-3 — the archive is a decision, not an oversight.
// ---------------------------------------------------------------------------

test('the sprint/archive decision is stated, and the guarded scope matches it', async () => {
  const { ARCHIVE_POLICY, ARCHIVE_SCANNED, guardedSprintFiles } = await helper();

  // `sprint/archive/` holds ~490 pre-collapse repos values across completed stories.
  // Migrating them and leaving them as historical record are BOTH defensible; AC-3
  // only demands the choice be recorded so the next reader does not read it as an
  // oversight. So: require prose, and require the scope to agree with it. A policy
  // saying "left as history" while the guard scans the archive would red on arrival;
  // a policy saying "migrated" while the guard skips it would be unenforced.
  assert.equal(typeof ARCHIVE_POLICY, 'string');
  assert.ok(
    ARCHIVE_POLICY.trim().length >= 80 && /archive/i.test(ARCHIVE_POLICY),
    'ARCHIVE_POLICY must actually explain the sprint/archive decision, not just exist',
  );

  // The decision is declared as a BOOLEAN, and the prose only explains it. Sniffing
  // the prose for a keyword was the first draft and it is a trap: `/\bmigrated\b/`
  // matches "the archive was NOT migrated" just as happily as the affirmative, so the
  // check would invert on a perfectly clear policy. Machine-read the flag; leave the
  // English to the human.
  assert.equal(typeof ARCHIVE_SCANNED, 'boolean', 'the archive decision must be declared, not inferred');

  const files = guardedSprintFiles(repo);
  const scanned = files.map((f) => f.path);
  assert.ok(scanned.length > 0, 'the guard must scan something');

  // javascript.md check #6: `readFileSync(p)` with no encoding hands back a Buffer,
  // not a string. A Buffer survives `.split('\n')`-free code paths and then quietly
  // fails to match any anchored regex, so the guard would report zero violations
  // across every file and read as a clean pass. Pin the type, not just the count.
  for (const f of files) {
    assert.equal(typeof f.text, 'string', `${f.path}: file text must be decoded, not a Buffer`);
  }

  const scansArchive = scanned.some((p) => p.includes('sprint/archive/'));
  assert.equal(
    scansArchive,
    ARCHIVE_SCANNED,
    'ARCHIVE_SCANNED and the guarded file set disagree: declare the archive in scope and it must be ' +
      'scanned; declare it out of scope and it must not be.',
  );
});

// ---------------------------------------------------------------------------
// AC-4 — the sweep must not corrupt what it edits. Green before the sweep;
// these two are a regression guard, and depend on nothing the sweep creates.
// ---------------------------------------------------------------------------

test('every story keeps its id, title and a non-empty acceptance_criteria block', () => {
  // The failure this pins is real and local: `pf sprint story complete/update/finish`
  // round-trips ALL epic YAML on write, and one such round-trip truncated epic-SH's
  // SH-1 acceptance criteria at an unquoted `#`. mg1-4 is a sweep that rewrites the
  // same files with the same toolchain, so the blast radius is identical.
  //
  // Counted, not constant: asserting "80 stories" would redden the next time anyone
  // files a story. Instead every `- id:` block is required to carry its own title,
  // and every acceptance_criteria key is required to be followed by a list item —
  // truncation breaks those relationships without touching any total.
  for (const { path: file, text } of epicFiles()) {
    const lines = text.split('\n');
    const storyStarts = [];
    lines.forEach((line, i) => {
      if (/^ {2}- id: \S/.test(line)) storyStarts.push(i);
    });
    assert.ok(storyStarts.length > 0, `${file}: epic shard declares no stories`);

    storyStarts.forEach((start, n) => {
      const end = n + 1 < storyStarts.length ? storyStarts[n + 1] : lines.length;
      const block = lines.slice(start, end);
      const id = block[0].replace(/^ {2}- id:\s*/, '').trim();

      assert.ok(
        block.some((l) => /^ {4}title:\s*\S/.test(l)),
        `${file}: story ${id} lost its title — the shape a truncated round-trip leaves behind`,
      );

      const acAt = block.findIndex((l) => /^ {4}acceptance_criteria:\s*$/.test(l));
      if (acAt !== -1) {
        assert.match(
          block[acAt + 1] ?? '',
          /^ {6}- \S/,
          `${file}: story ${id} has an acceptance_criteria key with no items under it`,
        );
      }
    });
  }
});

test("no sprint scalar carries an unquoted ' #' — the exact shape that truncated epic-SH", () => {
  // A bare `#` preceded by whitespace starts a YAML comment, so an unquoted value
  // containing one loses everything after it on the next round-trip. Single-quoting
  // the value is what fixed SH-1 and what keeps it fixed. Anchored on the fields the
  // sweep actually rewrites plus the prose fields most likely to carry a `#ref`.
  const offenders = [];
  for (const { path: file, text } of epicFiles()) {
    text.split('\n').forEach((line, i) => {
      const m = /^\s*(id|title|repos|workflow|status|priority|description):\s*(.*)$/.exec(line);
      if (!m) return;
      const value = m[2];
      if (value.startsWith("'") || value.startsWith('"') || value === '') return;
      if (/\s#/.test(value)) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(
    offenders,
    [],
    `unquoted values containing ' #' will be truncated by the next pf YAML round-trip:\n${offenders.join('\n')}`,
  );
});
