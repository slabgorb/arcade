// Story jt5-7 — RED phase (Mr. Praline / TEA). AC1, AC2 and AC3: the jt5 epic
// YAML still asserts things that landed stories refuted.
//
// ─── SCOPE: THE ORCHESTRATOR SUITE, DELIBERATELY ─────────────────────────────
// Per CLAUDE.md the two suites do not overlap: vitest owns the apps'
// `*.test.ts`, and `npm run test:orchestrator` owns `tests/**/*.test.mjs` under
// node:test. `sprint/epic-jt5.yaml` lives at the monorepo ROOT and is sprint
// tracking, not app behaviour, so it belongs here — the same call
// `tests/sprint-repo-routing.test.mjs` (mg1-4) made for the same file family.
// jt5-7's PLUGIN-local halves (the FLAPS2 wording census, the README counts)
// are guarded from joust's vitest project instead.
//
// ─── WHY A GUARD ON A DESCRIPTION AT ALL ─────────────────────────────────────
// Because nothing machine-reads these fields. pf renders `description` into the
// agent context as prose, so a false sentence in an epic YAML is inherited by
// every future story's setup and never fails anything. jt5-7 exists precisely
// because that happened three times over in one epic. A defect that cannot fail
// loudly comes back the moment someone files a story by copying its neighbour.
//
// ─── THE TRAP THIS SUITE MUST NOT FALL INTO ──────────────────────────────────
// AC3's subject is a ROTTED LINE CITATION. The obvious assertion —
// `assert.match(desc, /JOUSTRV4\.SRC:6216-6218/)` — REBUILDS THE DEFECT one
// layer up: the next legitimate renumber of the vendored ROM makes THIS FILE
// the stale citation, and it fails for a change that was correct. So AC3
// asserts by RESOLUTION instead: it opens whatever span the description cites
// and checks that the span CONTAINS the routine being claimed. That survives a
// renumber and fails the moment a citation stops pointing at its subject, which
// is the property the story actually wants. Line numbers appear below only
// inside `REFUTED:` markers, as the record of what the text used to say.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const read = (...p) => readFileSync(join(repo, ...p), 'utf8');

const epicText = () => read('sprint', 'epic-jt5.yaml');

/**
 * One story's YAML block as raw text, by id.
 *
 * Text scanning rather than a YAML parse, matching the orchestrator suite's
 * existing idiom (`tests/helpers/sprint-repos.mjs`) — there is no YAML parser
 * in this repo's dependencies, and the descriptions are what we assert on, so
 * the raw block is exactly the right granularity.
 */
function storyBlock(text, id) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.trim() === `- id: ${id}`);
  if (start < 0) return null;
  const indent = lines[start].indexOf('- id:');
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].indexOf('- id:') === indent && lines[i].trim().startsWith('- id:')) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

/** The EPIC's own description — everything above the `stories:` key. */
const epicDescription = (text) => {
  const i = text.indexOf('\nstories:');
  return i < 0 ? text : text.slice(0, i);
};

// ─── The vendored ROM, CRLF-stripped and 1-indexed ───────────────────────────
// The Williams tree is CRLF, so a naive split on '\n' leaves a trailing \r on
// every line and `.includes('JSR\tVSND')` still works but equality does not.
// It is TRACKED in git (`git ls-files` resolves it), so this suite may depend
// on it unconditionally — no skipIf, and its absence is a real failure.
const ROM = 'reference/williams-source/joust/JOUSTRV4.SRC';
const romLines = () => read(...ROM.split('/')).split(/\r?\n/);
const romSpan = (a, b) => romLines().slice(a - 1, b).join('\n');

// ═════════════════════════════════════════════════════════════════════════════
// Premise checks — these PASS today. They are the control that keeps the
// negative assertions below honest: each one states the fact that makes the
// corresponding stale sentence false, so if the premise ever stops holding, the
// story's whole basis is gone and this suite says so instead of silently
// guarding nothing.
// ═════════════════════════════════════════════════════════════════════════════

test('PREMISE: the epic YAML and the vendored ROM are both readable', () => {
  assert.ok(epicText().length > 1000, 'sprint/epic-jt5.yaml is missing or truncated');
  assert.ok(existsSync(join(repo, ROM)), `${ROM} is tracked in git and must be present`);
  assert.equal(
    romSpan(6216, 6216).replace(/\s+/g, ' ').trim(),
    'FLAST2 LDX PDECSN,U',
    'ROM line numbering moved — re-derive every span in this suite before trusting it',
  );
});

test('PREMISE: the audio subsystem the epic description denies actually exists', () => {
  // AC1 rests entirely on this. jt5-1 built the seam and jt5-2 uploaded the
  // samples, so all three modules are on disk — which is what makes the epic
  // description's opening sentence false rather than merely dated.
  for (const f of ['src/shell/audio.ts', 'src/core/events.ts', 'src/shell/audio-dispatch.ts']) {
    assert.ok(existsSync(join(repo, 'plugins/joust', f)), `plugins/joust/${f} must exist`);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — the EPIC description stops denying the subsystem that landed.
//
// REFUTED TEXT (epic-jt5.yaml:4, the description's opening sentence):
//   "joust has no audio module at all: no src/shell/audio.ts, no core/events.ts
//    event channel, no dispatch, and nothing under an arcade-assets joust prefix"
// All four particulars are false as of jt5-1 and jt5-2.
//
// NOTE the scoping: `epicDescription()` returns ONLY the text above `stories:`.
// Measured — the refuted phrases jt5-7 attributes to "the epic description"
// live in jt5-1's STORY description instead, so a guard that scanned the whole
// FILE would pass once jt5-1 was fixed and never force the epic's own sentence
// to change. That mis-attribution is the single largest defect in this story as
// filed; the split below is what makes AC1 and AC2 independently falsifiable.
// ═════════════════════════════════════════════════════════════════════════════

test('AC1 — the epic description no longer says joust has no audio module', () => {
  const desc = epicDescription(epicText());

  assert.doesNotMatch(
    desc,
    /no audio module at all/i,
    'the epic description still opens by denying a subsystem that shipped in jt5-1',
  );
  // The enumerated denials that follow the headline claim, each independently.
  assert.doesNotMatch(desc, /no `?src\/shell\/audio\.ts`?/i, 'src/shell/audio.ts exists');
  assert.doesNotMatch(desc, /no `?core\/events\.ts`? event channel/i, 'core/events.ts exists');
  assert.doesNotMatch(
    desc,
    /nothing under an arcade-assets joust prefix/i,
    'jt5-2 uploaded the samples under joust/sfx/ and curled a 200 for each',
  );
});

test('AC1 — the fix is a rewrite, not a deletion', () => {
  // Guards the cheap way out. Deleting the opening sentence would satisfy every
  // negative above and leave the epic with no statement of what it is for.
  const desc = epicDescription(epicText());
  assert.ok(desc.length > 800, 'the epic description was gutted rather than corrected');
  assert.match(desc, /audio|sound/i, 'the epic must still say what it is about');
});

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — jt5-1's STORY description drops three refuted claims.
//
// REFUTED TEXT (epic-jt5.yaml:11, inside jt5-1's block):
//   a) "every other game consumes between four and nine subpaths" — measured
//      2026-07-31 the range is FIVE to THIRTEEN (centipede 5, red-baron 8,
//      asteroids 10, tempest 10, star-wars 11, battlezone 13). joust's own
//      README already carries the corrected range at README.md:125-127, so the
//      YAML is now the only place the refuted one survives.
//   b) "emitted as DATA on the step result" — stepGame returns a bare
//      GameState; the event stream is a FIELD on it, not a step-result wrapper.
//   c) "the usual pin-and-bump ceremony applies" — there is no ceremony. The
//      2026-07-30 collapse put src/shared/ in-tree behind the @shared/* alias.
//
// Each was verified to MATCH the unchanged file before being written as a
// negative: an assertion that cannot fire today can never fire.
// ═════════════════════════════════════════════════════════════════════════════

test('AC2 — jt5-1 no longer quotes the refuted four-to-nine subpath range', () => {
  const jt51 = storyBlock(epicText(), 'jt5-1');
  assert.ok(jt51, 'jt5-1 is missing from the epic');
  assert.doesNotMatch(
    jt51,
    /between four and nine subpaths/i,
    'the measured range is five to thirteen — README.md:125-127 already says so',
  );
});

test('AC2 — jt5-1 no longer describes events as riding on the step result', () => {
  const jt51 = storyBlock(epicText(), 'jt5-1');
  assert.doesNotMatch(
    jt51,
    /emitted as DATA on the step result/i,
    'stepGame returns a bare GameState; the stream is a field on it',
  );
});

test('AC2 — jt5-1 no longer invokes the pin-and-bump ceremony', () => {
  const jt51 = storyBlock(epicText(), 'jt5-1');
  assert.doesNotMatch(
    jt51,
    /pin-and-bump ceremony/i,
    'the monorepo collapse removed the package boundary — an import costs a line',
  );
  // The ruling must read as SETTLED, matching the epic description's own
  // 2026-07-31 amendment rather than contradicting it.
  assert.doesNotMatch(
    jt51,
    /joust gains its first shared dependency/i,
    'joust already consumes @shared/audio — this is not a prospective gain',
  );
});

test('AC2 — jt5-1 is corrected, not gutted', () => {
  // Regression guard, green on arrival by design (mg1-4 uses the same shape).
  // This repo has already lost acceptance criteria to a pf YAML round-trip, and
  // the cheapest way to satisfy three negatives is to delete the paragraph.
  const jt51 = storyBlock(epicText(), 'jt5-1');
  assert.ok(jt51.length > 1200, 'jt5-1 description was gutted rather than corrected');
  assert.match(jt51, /events\.ts/, 'jt5-1 must still describe the seam it built');
});

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — jt5-3's ROM citation must RESOLVE to the routine it claims.
//
// REFUTED TEXT (jt5-3's description): "GOFLAP -> FLAST2, 'LDX DSNWD,X',
// JOUSTRV4.SRC:6207-6218". Measured: :6207 is `GOTFIT JSR SRCADA` — the tail of
// the wings-UP loop, a different routine. GOFLAP is :6212, FLAST2 is :6216, and
// the load-bearing cue is :6216-6218.
//
// A wrong extent is worse than a wrong fact because it MANUFACTURES
// corroboration: a reader who opens only the cited span sees FLAST2, DSNWD and
// JSR VSND sitting there and takes the claim as confirmed. The span is wrong
// only at its START, which is exactly the error a spot-check cannot catch.
//
// Asserted by RESOLUTION, not by pinning ":6216-6218" — see the header note.
// Measured against both defensible corrections: :6216-6218 and :6212-6218 each
// PASS, so Dev is not forced onto one arbitrary span, while :6207-6218 FAILS.
// ═════════════════════════════════════════════════════════════════════════════

/** Does this ROM span hold the wing-down cue, and stay inside its own routine? */
function cueSpanVerdict(text) {
  return {
    holdsCue: text.includes('DSNWD') && /JSR\s+VSND/.test(text),
    // GOTFIT/SRCADA belong to the wings-UP loop's tail. Their presence is the
    // tell that the extent has over-reached backwards into another routine.
    staysInRoutine: !text.includes('GOTFIT') && !text.includes('SRCADA'),
  };
}

test('AC3 — the span jt5-3 cites for the wing-down cue actually holds it', () => {
  const jt53 = storyBlock(epicText(), 'jt5-3');
  assert.ok(jt53, 'jt5-3 is missing from the epic');

  const cites = [...jt53.matchAll(/JOUSTRV4\.SRC:(\d+)(?:-(\d+))?/g)];
  assert.ok(cites.length > 0, 'jt5-3 cites the ROM at all');

  // Measured: jt5-3 carries exactly ONE JOUSTRV4.SRC citation, so no
  // quote-to-citation association rule is needed here. If a later edit adds
  // more, this assertion fails loudly rather than silently checking the wrong
  // one — which is the failure mode an unmeasured association rule invites.
  assert.equal(
    cites.length,
    1,
    `jt5-3 now cites the ROM ${cites.length} times; this guard resolves exactly one — ` +
      'add an association rule before widening it',
  );

  const [, startS, endS] = cites[0];
  const start = Number(startS);
  const end = endS ? Number(endS) : start;
  const verdict = cueSpanVerdict(romSpan(start, end));

  assert.ok(
    verdict.holdsCue,
    `JOUSTRV4.SRC:${start}-${end} does not contain the wing-down cue it is cited for ` +
      '(expected LDX DSNWD,X and JSR VSND)',
  );
  assert.ok(
    verdict.staysInRoutine,
    `JOUSTRV4.SRC:${start}-${end} reaches back into the wings-UP loop's tail ` +
      '(GOTFIT/SRCADA at :6207). GOFLAP is :6212, FLAST2 :6216, the cue :6216-6218 — ' +
      'the citation manufactures corroboration by opening on another routine.',
  );
});

test('AC3 — the resolution guard discriminates: wrong span fails, both right spans pass', () => {
  // The guard's own non-vacuity, asserted against the ROM rather than argued.
  // Without this, `cueSpanVerdict` could be trivially true and the test above
  // would pass on any span at all.
  const wrong = cueSpanVerdict(romSpan(6207, 6218));
  assert.equal(wrong.holdsCue, true, 'the wrong span DOES hold the cue — that is why it deceives');
  assert.equal(wrong.staysInRoutine, false, 'the wrong span must be caught by the routine check');

  for (const [a, b] of [
    [6216, 6218],
    [6212, 6218],
  ]) {
    const v = cueSpanVerdict(romSpan(a, b));
    assert.deepEqual(
      v,
      { holdsCue: true, staysInRoutine: true },
      `:${a}-${b} is a defensible correction and must pass`,
    );
  }
});
