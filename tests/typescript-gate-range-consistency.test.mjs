// tests/typescript-gate-range-consistency.test.mjs
//
// Story jt11-10 (R3-F5) — RED phase (Han Solo / TEA). Routed from jt11-4 round-3.
//
// The TypeScript language-review gate (`.pennyfarthing/gates/lang-review/typescript.md`)
// carries a "re-scan the fix diff against every check EXCEPT the one being fixed"
// instruction, written as the check range `#1-#12 and #14-#N` — every check but #13.
// That range appears in THREE places, and jt11-4 bumped the upper bound at the
// checklist head (line 104, `#14-#30`) when it added check #30 but left the two
// procedural copies (the fix-rescan `detail:` and the pre-handoff bullet) reading
// `#14-#29`. The finding IS check #24's own pattern — "a range edited in one place
// and not its copies" — turned on the checklist that defines check #24.
//
// This guard does NOT hardcode the upper bound (that would just move the staleness
// here — the jt5-7/jt9-30 rebuild-the-citation trap). It asserts only that every
// `#14-#N` mention AGREES with the others: there is exactly one correct "all checks
// but #13" range, so a checklist that grows a check and updates one copy but not the
// rest is caught, whatever the new number is.
//
// The file is TRACKED in this repo (single-repo edit). NOTE: the LIVE pf gate is
// loaded from `…/pennyfarthing-dist/`, so this arcade-tracked copy may be a vendored
// duplicate that does not drive the live check — it is guarded here as a
// doc-consistency invariant regardless, which is exactly what the finding is about.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const GATE = join('.pennyfarthing', 'gates', 'lang-review', 'typescript.md');

test('the typescript gate exists at the tracked path (fixture sanity)', () => {
  assert.ok(existsSync(join(repo, GATE)), `${GATE} must exist`);
});

test('every "#14-#N" check-range mention in the typescript gate agrees', () => {
  const text = readFileSync(join(repo, GATE), 'utf8');
  const hits = [...text.matchAll(/#14-#(\d+)/g)].map((m) => ({
    n: Number(m[1]),
    // line number for an actionable failure message
    line: text.slice(0, m.index).split('\n').length,
  }));
  // Anti-vacuity: the phrase is load-bearing and appears several times. Zero or one
  // hit would make "they all agree" pass without checking anything — that would mean
  // the range phrasing changed shape and this guard has gone blind.
  assert.ok(hits.length >= 2, `expected multiple "#14-#N" range mentions, found ${hits.length}`);
  const values = [...new Set(hits.map((h) => h.n))];
  assert.deepEqual(
    values,
    [values[0]],
    `the "all checks but #13" range disagrees across the gate: ` +
      hits.map((h) => `:${h.line}=#14-#${h.n}`).join(', ') +
      `. One check-range grew and its copies were not bumped — make them all match the checklist head.`,
  );
});
