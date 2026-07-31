// mg1-9 — src/shared/tests must be TYPECHECKED, with nothing excluded and nothing
// suppressed.
//
// History, because the shape of this guard is a reaction to a specific near-miss.
// arcade-shared shipped with no tsconfig of its own, so its tests were never
// compiled — vitest strips types without checking them. Folding the library into
// `src/shared` during the 2026-07-30 collapse newly typechecked those 26 files and
// surfaced 22 pre-existing errors, every one in `synth.test.ts`: hand-rolled
// FakeAudioContext / FakeGain doubles that do not satisfy the real WebAudio types.
//
// The migration held the line with `"exclude": ["src/shared/tests/synth.test.ts"]`
// and filed the errors (as `uf1-28`, renamed `mg1-9` at the 2026-07-31 epic split).
// This story removes the exclusion. The guard that policed the exclusion's SHAPE
// ("the tsc exclusion is ONE file, not the src/shared/tests directory", formerly in
// `monorepo-topology.test.mjs`) is retired by that removal — its own comment said to
// delete it when this story landed — and these tests replace it.
//
// WHY THIS IS NOT JUST `npm run lint`. Lint proves tsc exits 0 over whatever the
// config happens to include, which is exactly the thing under attack: every cheap
// way to "fix" 22 type errors makes tsc exit 0 while restoring the blindness the
// exclusion created.
//
//   - re-exclude the file           → caught by `nothing is excluded` (textual)
//   - narrow `include` instead      → caught by `in the tsc program` (behavioural)
//   - delete the file, or tests     → caught by `in the tsc program` + `not quietly removed`
//   - `@ts-nocheck` at the top      → caught by `not cast or suppressed`
//   - `as unknown as AudioContext`  → caught by `not cast or suppressed`
//
// So the pairing is deliberate: a BEHAVIOURAL check that the file is in the program
// (from tsc itself, not from reading the config) plus a SOURCE check that being in
// the program was not bought with a suppression. Neither half is sufficient alone.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const path = (...rel) => join(repo, ...rel);
const read = (...rel) => readFileSync(path(...rel), 'utf8');

const SHARED_TESTS = join('src', 'shared', 'tests');
const SYNTH_TEST = join(SHARED_TESTS, 'synth.test.ts');

// ── one tsc run, shared by the two behavioural tests ─────────────────────────
// `tsc --noEmit --listFiles` reports the program's file list AND the exit status
// in a single ~4s invocation. Memoised so the suite pays for it once.
//
// Spawned as `process.execPath node_modules/typescript/lib/tsc.js`, NOT as
// `npx tsc`. Two reasons, and the first is enforced by a sibling test:
//
//   1. `every binary the orchestrator suite spawns is provisioned by CI` in
//      monorepo-topology.test.mjs scans this directory for spawn targets and pins
//      the set to {bash, git, just, node}. `npx` was a newcomer and reddened it on
//      the first run of this file — correctly: that guard exists because sixteen
//      tests needing a brew-installed `just` once blocked eight releases from a
//      runner that did not have it. It skips `process.execPath` and any target
//      containing `/`, so this form asks nothing new of CI.
//   2. It is the stronger invocation anyway. `typescript` is a devDependency, so
//      `npm ci` puts this exact file on disk before the test step runs; `npx` would
//      go looking, and a resolution that can reach the network is not a thing a
//      test should depend on.
const TSC = join(repo, 'node_modules', 'typescript', 'lib', 'tsc.js');

let tscRun;
const tsc = () => {
  if (!tscRun) {
    const r = spawnSync(process.execPath, [TSC, '--noEmit', '--listFiles'], {
      cwd: repo,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    // `--listFiles` prints paths on stdout; diagnostics land there too. Errors are
    // the lines carrying `error TS####`, which no absolute file path can imitate.
    const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    tscRun = {
      status: r.status,
      files: out.split('\n').filter((l) => l.includes('/') && !/error TS\d+/.test(l)),
      errors: out.split('\n').filter((l) => /error TS\d+/.test(l)),
    };
  }
  return tscRun;
};

test('every test file under src/shared/tests is in the tsc program', () => {
  // The behavioural half of AC1, and the one that cannot be satisfied by editing a
  // comment. tsc itself reports what it compiled; if `synth.test.ts` is absent then
  // it is not being checked, no matter what the config says or how it got that way
  // (`exclude`, a narrowed `include`, or the file being deleted outright).
  const onDisk = readdirSync(path(SHARED_TESTS))
    .filter((f) => f.endsWith('.test.ts'))
    .sort();
  assert.ok(
    onDisk.length >= 26,
    `expected the shared suite's 26+ test files, found ${onDisk.length} — did a file get deleted?`,
  );

  const compiled = new Set(
    tsc()
      .files.map((l) => l.trim())
      .filter((l) => l.includes(`${SHARED_TESTS}/`))
      .map((l) => l.slice(l.lastIndexOf('/') + 1)),
  );
  const missing = onDisk.filter((f) => !compiled.has(f));
  assert.deepEqual(
    missing,
    [],
    `these src/shared/tests files are NOT typechecked: ${missing.join(', ')} — ` +
      'being absent from the tsc program is exactly the blindness mg1-9 removes',
  );
});

test('tsc --noEmit exits 0 with the shared tests in the program', () => {
  // The other half of AC1. INSUFFICIENT ALONE — not vacuous, a distinction review
  // round 1 was right to draw. Each half catches a state the other misses:
  //
  //   exclusion present (pre-fix)      → `in the tsc program` FAILS, this one passes
  //   exclusion gone, doubles unfixed  → `in the tsc program` passes, this one FAILS (22 errors)
  //   fixed                            → both pass
  //
  // So both can fail, neither is tautological, and only the pair covers the middle
  // state — which is precisely where a half-done fix would sit.
  const { status, errors } = tsc();
  assert.equal(
    status,
    0,
    `tsc --noEmit exited ${status} with ${errors.length} error(s):\n${errors.slice(0, 25).join('\n')}`,
  );
});

test('the root tsconfig excludes nothing', () => {
  // Replaces `the tsc exclusion is ONE file, not the src/shared/tests directory`.
  // That test asserted the exclusion existed and named exactly one path; this one
  // asserts it is gone. They are direct contradictions, which is why the old one was
  // deleted rather than left to fail.
  //
  // Raw text, not JSON.parse: the root tsconfig carries `//` comments. They are
  // STRIPPED first — the old note quoted `"exclude": []` as the measurement it
  // rested on, and an unstripped regex reads that quotation as the setting. (It did,
  // on the first run of the test this replaces: `actual: []`.) A comment must never
  // be able to satisfy or defeat this check.
  const raw = read('tsconfig.json').replace(/^\s*\/\/.*$/gm, '');
  const m = /"exclude"\s*:\s*\[([^\]]*)\]/.exec(raw);
  const entries = m
    ? m[1]
        .split(',')
        .map((s) => s.trim().replace(/^"|"$/g, ''))
        .filter(Boolean)
    : [];
  assert.deepEqual(
    entries,
    [],
    'the root tsconfig must exclude nothing — AC3: no path may be added to the ' +
      'exclude list, and mg1-9 removes the one that was there',
  );
});

// ── AC2: the doubles must SATISFY the WebAudio types, not be cast past them ──

/**
 * Strip `//` and block comments, then string/template literals, so a source scan
 * reads CODE and not prose or data. Order matters: comments first, or an
 * apostrophe inside a comment opens a phantom string that swallows real code.
 * (cp1-1's purity guard shipped exactly that bug, then the mirror one — a URL
 * containing `/window.` flagged as a live `window.` access.)
 *
 * EVERY literal regex is line-bounded, and the backtick one is why. Review round 1
 * found a real cast could be hidden from this scanner entirely:
 *
 *     const s = "quote" // contains a stray backtick ` here
 *     const c = ctx as unknown as AudioContext
 *     const t = `template`
 *
 * The line-comment strip deliberately refuses to fire on a line carrying a quote
 * before its `//` (so a URL like 'http://x' cannot have its own contents eaten),
 * which leaves that stray backtick alive. The backtick rule then paired it with the
 * OPENING backtick of the real template literal two lines down and swallowed the
 * cast between them. What the scanner believed it was reading was one line:
 *
 *     const s = "" // contains a stray backtick ``template`
 *
 * `[^`\\\n]` closes it: a literal cannot span lines, so a stray backtick can reach
 * at most to the end of its own. Measured before changing it — synth.test.ts has 0
 * multi-line template literals and 0 lines with an odd backtick count, so nothing
 * legitimate is affected. The bypass shape is pinned in the fixture test below.
 */
export const stripToCode = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[^\n'"`]*?\/\/.*$/gm, (line) => line.replace(/\/\/.*$/, ' '))
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\\n]|\\.)*`/g, '``');

// The types the doubles stand in for. A cast to any of these is the failure AC2
// names: it makes tsc exit 0 while the double still does not satisfy the type,
// which is the same blindness the exclusion created. Casts to UNRELATED types are
// not this story's business — `synth.test.ts` already carries a deliberate
// `as unknown as Record<string, unknown>` to read an optional export, and banning
// that would be scope creep dressed up as rigour.
const WEBAUDIO_TYPES = [
  'AudioContext',
  'BaseAudioContext',
  'AudioNode',
  'AudioParam',
  'GainNode',
  'OscillatorNode',
  'AudioBuffer',
  'AudioBufferSourceNode',
  'AudioDestinationNode',
  'AudioScheduledSourceNode',
];

/** Returns a list of human-readable violations; empty means clean. */
export const findSuppressions = (src) => {
  const bad = [];
  // ts-directives live in COMMENTS, so these scan the RAW text — but a directive only
  // WORKS immediately after the comment opener. Matching the bare token anywhere made
  // the guard redden on its own documentation: a comment reading "never add
  // @ts-nocheck to this file" is advice, not a suppression, and review round 1 caught
  // that this file survived only because it happened to write the glob `@ts-*`.
  for (const d of ['@ts-nocheck', '@ts-ignore', '@ts-expect-error']) {
    const directive = new RegExp(String.raw`(?:^|[^\S\n])\/\/\s*${d}\b|\/\*\s*${d}\b`, 'm');
    if (directive.test(src)) bad.push(`${d} suppresses the checker instead of satisfying it`);
  }
  const code = stripToCode(src);
  // `any` defeats the check as thoroughly as a cast does.
  if (/\bas\s+any\b/.test(code)) bad.push('`as any` cast');
  if (/:\s*any\b/.test(code)) bad.push('`: any` annotation');
  // No lookbehind here, unlike the WebAudio rule below. `<any>` is unwanted in EVERY
  // position — a `<any>x` cast, a `Array<any>` type argument, a `identity<any>(x)`
  // call — because all three are `any` defeating the checker. Round 1 briefly copied
  // the lookbehind here too and silently stopped catching `Array<any>`.
  if (/<any>/.test(code)) bad.push('`<any>` usage');
  for (const t of WEBAUDIO_TYPES) {
    if (new RegExp(String.raw`\bas\s+(?:unknown\s+as\s+)?${t}\b`).test(code)) {
      bad.push(`cast to ${t} — the double must satisfy it, not be asserted into it`);
    }
    // The lookbehind is the difference between a legacy cast `<T>expr` (nothing before
    // the `<`) and an ordinary generic call `identity<T>(x)` (a callee name before it).
    // Without it the scanner flagged the latter, which is not a cast at all.
    if (new RegExp(String.raw`(?<![A-Za-z0-9_$])<${t}>\s*[A-Za-z_(]`).test(code)) {
      bad.push(`angle-bracket cast to ${t}`);
    }
  }
  return bad;
};

test('the WebAudio doubles are not cast or suppressed into place', () => {
  // AC2. This PASSES today and is expected to keep passing — it is a regression
  // guard against the wrong fix, not a driver. Its non-vacuity was established by
  // mutation, not by argument: TEA inserted `as unknown as AudioContext`, a
  // `@ts-nocheck`, and an `: any` in turn and confirmed each one reddens this test.
  // an `as any` and a `: any` in turn and confirmed each one reddens this test. Review
  // round 1 added two more shapes it MISSED; those are pinned in the fixture test below.
  // See the TEA Assessment in the mg1-9 session for the four failure messages.
  const bad = findSuppressions(read(SYNTH_TEST));
  assert.deepEqual(
    bad,
    [],
    `src/shared/tests/synth.test.ts buys its type-check with suppressions:\n  - ${bad.join('\n  - ')}\n` +
      'AC2: the doubles must satisfy the real WebAudio types. A cast reintroduces ' +
      'exactly the blindness the tsconfig exclusion created.',
  );
});

test('the suppression scanner flags what it must and ignores what it must not', () => {
  // The scanner is code under test too. Without these fixtures a scanner that
  // matches nothing at all would pass the test above forever, and a scanner that
  // matches prose would fail it for the wrong reason. Both directions are pinned.
  const flagged = [
    ['const c = ctx as unknown as AudioContext', 'cast via unknown'],
    ['const c = ctx as AudioContext', 'direct cast'],
    ['const g = node as GainNode', 'cast to a node type'],
    ['// @ts-nocheck', 'whole-file suppression'],
    ['  // @ts-expect-error the double is wrong', 'line suppression, indented'],
    ['/* @ts-ignore */', 'a block-comment directive'],
    ['const c = ctx as any', '`as any`'],
    ['function f(ctx: any) {}', '`: any` parameter'],
    ['const c = <AudioContext>ctx', 'a legacy angle-bracket cast'],
    ['const xs: Array<any> = []', '`any` as a generic type argument'],
    // THE REVIEW-ROUND-1 BYPASS. A stray backtick inside a `//` comment on a line
    // that also carries a quote — so the comment survives the strip — used to pair
    // with the opening backtick of a real template literal below and swallow every
    // line between, cast included. If this row ever goes green again, the
    // line-bounding on the backtick rule in stripToCode has been undone.
    [
      'const s = "quote" // contains a stray backtick ` here\n' +
        'const c = ctx as unknown as AudioContext\n' +
        'const t = `template`',
      'a cast hidden behind a stray backtick in a surviving comment',
    ],
  ];
  for (const [src, why] of flagged) {
    assert.ok(findSuppressions(src).length > 0, `the scanner must flag ${why}: ${src}`);
  }

  const ignored = [
    ['// the double must not be cast as AudioContext', 'a comment describing the rule'],
    ['// never add @ts-nocheck to this file', 'PROSE naming a directive, not a directive'],
    ['// the guard bans @ts-ignore and friends', 'prose naming a directive mid-sentence'],
    ['const url = "as unknown as AudioContext"', 'the pattern inside a string'],
    ['const x = synth as unknown as Record<string, unknown>', 'a cast to an unrelated type'],
    ['class FakeGain extends FakeAudioNode implements GainNode {}', '`implements` — the honest form'],
    ['const anyOf = (xs) => xs.length > 0', 'an identifier merely containing "any"'],
    ['let ctx: AudioContext | null = null', 'an honest type annotation'],
    ['const c = identity<AudioContext>(ctx)', 'a generic CALL, which is not a cast'],
  ];
  for (const [src, why] of ignored) {
    assert.deepEqual(findSuppressions(src), [], `the scanner must NOT flag ${why}: ${src}`);
  }
});

test('the production synth seams still demand the REAL WebAudio types', () => {
  // The loophole AC2 does not literally name. There are two ways to make a double
  // satisfy a signature: raise the double to meet the type, or lower the type to
  // meet the double. Narrowing `noiseBuffer(context: AudioContext)` to the structural
  // subset it happens to use — `Pick<AudioContext, 'sampleRate' | 'createBuffer'>` —
  // would turn all 22 errors green with the doubles untouched, and every other test
  // in this file would still pass.
  //
  // That is the same trade the exclusion made, moved one level down: it buys a green
  // check by shrinking what is checked, except this time it weakens a PRODUCTION
  // signature to accommodate a test. `src/shared/synth.ts` is the shared library
  // seven cabinets compile against; its contract is not the test suite's to relax.
  //
  // TEA logged this as a deviation (an AC2 reading enforced beyond the literal text)
  // — see the mg1-9 session. It is also why the honest route was PROVEN achievable
  // before this test was written: cast-free doubles that satisfy the real types
  // typecheck AND run, in ~135 lines. The strict reading is not a dead end.
  const src = read('src', 'shared', 'synth.ts');
  assert.match(
    src,
    /export function noiseBuffer\(\s*context: AudioContext\s*,/,
    'noiseBuffer must still take a real AudioContext — widening the double is this ' +
      "story's job, narrowing the production signature is not",
  );
  assert.match(
    src,
    /readonly context: AudioContext\b/,
    'SynthTarget.context must still be a real AudioContext',
  );
  assert.match(src, /readonly out: GainNode\b/, 'SynthTarget.out must still be a real GainNode');
});

test('no test was quietly removed from synth.test.ts', () => {
  // AC4: "the fix is a typing change and not a quiet removal of tests that would not
  // compile." Deleting an inconvenient test is the cheapest possible way to make tsc
  // exit 0, and the suite's own pass count cannot object — it would simply be
  // smaller, and still green.
  //
  // THIS IS A PROXY FOR AC4, NOT AC4 ITSELF. Be clear about the gap, because the
  // numbers below invite more confidence than they earn:
  //
  //   - AC4's literal claim is about the SUITE's pass count. The baselines measured on
  //     the pre-fix tree (2026-07-31, TEA) were 501 tests across 26 files for the
  //     shared vitest project, and 10413 + 1 todo across 698 files cabinet-wide. NO
  //     test asserts those — running vitest from inside the orchestrator suite would
  //     cross the two-runner boundary CLAUDE.md draws and cost ~110s. They are
  //     recorded in the session and re-measured by hand at review.
  //   - What IS asserted is a source-text census of one file. It catches a deletion,
  //     which is the failure AC4 names. It does NOT catch a SWAP — delete one
  //     meaningful test, add a trivial one, and both counts are unchanged. Closing
  //     that would mean pinning every test's title against a committed baseline;
  //     judged not worth the churn for a file that changes rarely.
  //
  // So: green here means "no test was deleted outright from synth.test.ts", not "the
  // suite's coverage is provably identical". Both review rounds re-measured the real
  // numbers to cover the difference.
  const src = read(SYNTH_TEST);
  const its = (src.match(/^\s*(?:it|test)\(/gm) ?? []).length;
  const describes = (src.match(/^\s*describe\(/gm) ?? []).length;
  assert.equal(
    its,
    51,
    `synth.test.ts declares ${its} tests, baseline 51 — a typing fix must not change this. ` +
      'If a test was legitimately split or merged, update this number and say why in the session.',
  );
  assert.equal(describes, 11, `synth.test.ts declares ${describes} describes, baseline 11`);
});
