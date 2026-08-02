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
  assert.deepEqual([...identifiers], ['solo'], 'a pathless entry must be valid under its own name, and nothing else');

  // The empty-set trap this test was written to catch is asserted where it can
  // actually fail: a registry the helper cannot make sense of must THROW, never hand
  // back an empty Set that reads as "nothing is registered" and reddens every sprint
  // line at once. The previous `identifiers.size > 0` could not fail independently —
  // `.has('solo')` on the line above already implies it — so it was decoration.
  // (Reviewer finding 6; javascript.md check #8.)
  assert.throws(
    () => registeredRepoIdentifiers(['repos:', '    solo:', '        type: game'].join('\n')),
    /registered no entries/,
    'an unparseable repos block must throw, not degrade to an empty Set',
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

test("no sprint scalar carries an unquoted ' #' — the exact shape that truncated epic-SH", async () => {
  const { yamlRoundTripRisks } = await helper();

  // This test used to carry its own inline scan, and that scan matched only
  // `id|title|repos|workflow|status|priority|description` key:value lines — so it
  // could not fail on the shape its own name cites. SH-1's loss was an
  // acceptance_criteria LIST ITEM. It now delegates to `yamlRoundTripRisks`, which
  // reads list items and mapping entries alike, and it is measured: re-adding the
  // archived SH-1 line unquoted to a live shard leaves this test RED, where before
  // the whole suite stayed green.
  //
  // Both round-trip shapes are asserted here rather than only the hash, because the
  // live tree is where a real regression lands and the fixtures above only prove the
  // detector works in a laboratory.
  const risks = yamlRoundTripRisks(epicFiles());

  const rendered = risks.map((r) => `${r.file}:${r.line} [${r.kind}] ${r.text}`).join('\n');
  assert.deepEqual(
    risks,
    [],
    `values that will not survive the next pf YAML round-trip:\n${rendered}`,
  );
});

// ---------------------------------------------------------------------------
// REWORK — mg1-4 round 2. Four failures the Reviewer proved by mutation, plus
// one live corruption that arrived with the mg1-2 merge. Every test below was
// observed failing on real data before being committed; none fails merely
// because an export is missing.
// ---------------------------------------------------------------------------

test('the unquoted-# scan covers LIST ITEMS, which is the shape that actually truncated epic-SH', async () => {
  const { yamlRoundTripRisks } = await helper();

  // The test above this one is named "the exact shape that truncated epic-SH" and
  // CANNOT FAIL on that shape. Proven by mutation: its regex matches only
  // `id|title|repos|workflow|status|priority|description` key:value lines, and the
  // SH-1 line that was actually lost is an acceptance_criteria LIST ITEM. The repair
  // is preserved verbatim in sprint/archive/epic-SH.yaml, single-quoted by SH-3 on
  // 2026-07-07:
  //
  //   - 'The dev inner-loop path (npm link or a #branch ref) is documented in the
  //      shared repo README.'
  //
  // Re-adding that line unquoted to a live shard left the suite 10/10 green. This is
  // the incident's own text, replayed. A guard named after an incident it cannot
  // detect is worse than no guard: it reads as coverage.
  const fixture = {
    path: 'sprint/epic-fixture.yaml',
    text: [
      '  - id: fx-1',
      '    title: a story',
      '    acceptance_criteria:',
      '      - The dev inner-loop path (npm link or a #branch ref) is documented in the shared repo README.',
      "      - 'A quoted item with a #branch ref survives the round-trip and is NOT an offender.'",
      '      - An ordinary item with no hash at all.',
    ].join('\n'),
  };

  const risks = yamlRoundTripRisks([fixture]);

  assert.deepEqual(
    risks.filter((r) => r.kind === 'unquoted-hash').map((r) => r.line),
    [4],
    'only the UNQUOTED list item is at risk — line 5 is single-quoted and line 6 has no hash',
  );
});

test('a scalar field with an unquoted # is still caught — the old coverage must not regress', async () => {
  const { yamlRoundTripRisks } = await helper();

  // Widening the scan to list items must not drop what the inline version already
  // caught. Both shapes, one fixture, so a fix that swaps one for the other reddens.
  const fixture = {
    path: 'sprint/epic-fixture.yaml',
    text: [
      '  - id: fx-1',
      '    title: a title with a #ref in it',
      "    description: 'a quoted description with a #ref survives'",
      '    acceptance_criteria:',
      '      - a list item with a #ref in it',
    ].join('\n'),
  };

  assert.deepEqual(
    yamlRoundTripRisks([fixture]).filter((r) => r.kind === 'unquoted-hash').map((r) => r.line),
    [2, 5],
    'the unquoted title AND the unquoted list item, but not the quoted description',
  );
});

test('an acceptance criterion mangled into a YAML complex key is reported', async () => {
  const { yamlRoundTripRisks, guardedSprintFiles } = await helper();

  // A SECOND round-trip corruption, and unlike the one above this is LIVE in the
  // tree right now rather than reconstructed. mg1-14 arrived with the mg1-2 merge
  // carrying an acceptance criterion whose text contains ': ', which pf's YAML
  // writer emitted as an explicit complex mapping key:
  //
  //   - ? A test covers HMR end to end ... is explicitly insufficient
  //     : that check passed while game HMR was entirely dead ...
  //
  // `yaml.safe_load` parses that criterion as a DICT, not a string. The AC survived
  // its text but lost its type, so anything iterating acceptance_criteria as prose
  // now gets an object. The existing story-shape guard waves it through because
  // `- ? A test covers` still matches /^ {6}- \S/ — the `?` is a non-space character.
  // AC-4 is "the pf toolchain still round-trips every touched sprint file"; this is
  // that toolchain failing to, in a file this story touched.
  const fixture = {
    path: 'sprint/epic-fixture.yaml',
    text: [
      '    acceptance_criteria:',
      '      - ? a criterion whose text contained a colon-space and got mangled',
      '        : the remainder, now parsed as the mapping VALUE',
      '      - an ordinary criterion',
    ].join('\n'),
  };

  assert.deepEqual(
    yamlRoundTripRisks([fixture]).filter((r) => r.kind === 'complex-key').map((r) => r.line),
    [2],
    'the complex-key item is reported at the line that opens it',
  );

  // And on the real tree, because a fixture-only guard proves only that the fixture
  // was written correctly. This is the assertion that is red on arrival.
  const live = yamlRoundTripRisks(guardedSprintFiles(repo)).filter((r) => r.kind === 'complex-key');
  assert.deepEqual(
    live,
    [],
    `acceptance criteria mangled into YAML complex keys — re-quote the value so it round-trips as a string:\n${live
      .map((r) => `${r.file}:${r.line}`)
      .join('\n')}`,
  );
});

test('a block-sequence repos value is not invisible to the guard', async () => {
  const { repoRoutingViolations } = await helper();

  // The guard splits a `repos:` SCALAR on commas. Given the block-sequence form it
  // captures an empty remainder, skips the empty token and reports NOTHING — proven
  // by mutation. That is the worst available outcome for AC-2, whose whole purpose is
  // that a retired repo "cannot silently reappear": in this form every value is
  // invisible, permanently and silently.
  //
  // It is not hypothetical. `pf/core/resolver.py:42` does `epic.get("repos", [])` — a
  // LIST default — so the list form is the shape pf's own model expects, and
  // normalising to it is the natural fix for td1-15, which this very story filed.
  // The guard must not go blind on the day its sibling bug is fixed.
  const listForm = {
    path: 'sprint/epic-fixture.yaml',
    text: ['repos:', '  - joust', '  - arcade', 'stories:'].join('\n'),
  };

  assert.deepEqual(repoRoutingViolations([listForm], new Set(['arcade', '.'])), [
    { file: 'sprint/epic-fixture.yaml', line: 2, token: 'joust' },
  ]);
});

test('a repos key with neither a scalar nor list items is itself a violation', async () => {
  const { repoRoutingViolations } = await helper();

  // The failure mode above generalises: any `repos:` the guard cannot read a value
  // out of must fail LOUD rather than yield zero violations. Silence is what let the
  // block-sequence form through, so an empty key is reported rather than skipped —
  // otherwise the fix for the previous test can be "return nothing for empty values",
  // which passes it while preserving the hole.
  const empty = { path: 'sprint/epic-fixture.yaml', text: ['repos:', 'stories:'].join('\n') };

  assert.deepEqual(repoRoutingViolations([empty], new Set(['arcade', '.'])), [
    { file: 'sprint/epic-fixture.yaml', line: 1, token: '' },
  ]);
});

// ---------------------------------------------------------------------------
// AC-1 / AC-2 applied to the ARTEFACT, not just its source. The sweep corrected
// the YAML; pf renders that YAML into sprint/context/*.md, and those files are
// what an agent is actually handed.
// ---------------------------------------------------------------------------

test('generated context docs in live scope name a registered repo', async () => {
  const { registeredRepoIdentifiers, contextRepoViolations, guardedContextFiles } = await helper();

  // The defect this story exists to fix is not "a YAML file contains the string
  // joust" — nobody reads the YAML. It is, in the story's own words, that "every
  // future story setup hands the agent a context file telling it to work in a repo
  // that does not exist." That sentence describes sprint/context/, and four of those
  // files still name retired repos: jt8 -> joust, sw8 -> star-wars, td1 and uf1 ->
  // multi-name lists, behind 30 open stories between them.
  //
  // They do not self-heal. sm-setup Step 4b regenerates a STORY context
  // unconditionally but an EPIC context only "if the epic has no context document
  // yet", and the sm-setup-exit gate's epic-context-validated check asserts only that
  // the file exists and is non-empty. So a drifted context passes its gate forever.
  // Filed upstream as td1-16; this guard is the local half.
  const identifiers = registeredRepoIdentifiers(read('.pennyfarthing', 'repos.yaml'));
  const violations = contextRepoViolations(guardedContextFiles(repo), identifiers);

  const rendered = violations.map((v) => `${v.file}:${v.line} -> ${v.token}`).join('\n');
  assert.deepEqual(
    violations,
    [],
    `generated context docs still route to repos the registry does not register:\n${rendered}`,
  );
});

test('context scope follows the archive rule — completed work is left as a record', async () => {
  const { guardedContextFiles } = await helper();

  // ARCHIVE_POLICY's reasoning is that no agent is ever routed from a completed
  // story, so correcting the live backlog is the fix and editing the record is not.
  // The same rule decides this scope, and it must be applied rather than restated:
  // ~30 story contexts on disk belong to DONE stories and carry pre-collapse names.
  // Rewriting them would falsify the record; scanning them would redden the guard
  // over work nobody will ever be routed to.
  const scanned = guardedContextFiles(repo).map((f) => f.path);
  assert.ok(scanned.length > 0, 'the context guard must scan something');

  for (const p of scanned) {
    assert.match(p, /^sprint\/context\/context-(epic|story)-[^/]+\.md$/, `${p}: unexpected path shape`);
  }

  // Every path decoded to a string, for the same Buffer reason as the YAML scan:
  // a Buffer matches no anchored regex, so the guard would report zero violations
  // across every file and read as a clean pass. (javascript.md check #6.)
  for (const f of guardedContextFiles(repo)) {
    assert.equal(typeof f.text, 'string', `${f.path}: file text must be decoded, not a Buffer`);
  }

  // A context belonging to a story that is `done` must NOT be scanned. sw8-11 is
  // done and its context names star-wars; if it appears here the guard has adopted a
  // scope its own policy rejects, and it will be red for reasons no one can fix.
  assert.ok(
    !scanned.includes('sprint/context/context-story-sw8-11.md'),
    'a completed story\'s context is a record, not live routing — see ARCHIVE_POLICY',
  );

  // And an epic that still has open stories MUST be scanned, or the guard is scoped
  // into vacuity.
  //
  // This exemplar was `jt8`, which had 4 open stories when the assertion was
  // written. The 2026-08-02 jt9 cut moved every remaining joust story out of jt5
  // and jt8, so jt8 is now 6/6 done and correctly OUT of scope — the assertion
  // started failing on an epic that had simply finished, which is the guard
  // working, not breaking. Re-pointed at jt9 (28 stories, 27 still open).
  //
  // Anti-staleness: rather than trust the name, this asserts the PROPERTY the
  // scope rule is about — pick whichever epic actually has open stories, and
  // require that one to be scanned. A future cut then re-points it for free.
  const liveEpics = guardedContextFiles(repo)
    .map((f) => f.path)
    .filter((p) => /context-epic-/.test(p));
  assert.ok(
    liveEpics.length > 0,
    'at least one epic with open stories must be in scope, or the guard is vacuous',
  );
  assert.ok(
    scanned.includes('sprint/context/context-epic-jt9.md'),
    'an epic with open stories (jt9: 27 of 28 open) is live routing and must be in scope',
  );
  assert.ok(
    !scanned.includes('sprint/context/context-epic-jt8.md'),
    'jt8 is 6/6 done since the jt9 cut — a completed epic is a record, not live routing',
  );
});
