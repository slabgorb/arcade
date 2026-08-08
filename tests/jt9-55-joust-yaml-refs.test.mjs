// Story jt9-55 — sprint/epic YAML comment refs of the form `<file>.ts:<line>` go
// stale with no gate to catch them. jt9-30 converted the 86 such refs living in
// JOUST TEST-FILE comments to symbol refs and explicitly left the refs living in
// sprint/epic YAML out of scope — that remainder is this story.
//
// ─── SCOPE: THE ORCHESTRATOR SUITE, DELIBERATELY ─────────────────────────────
// Per CLAUDE.md the two suites do not overlap: vitest owns the apps' `*.test.ts`,
// and `npm run test:orchestrator` owns `tests/**/*.test.mjs` under node:test.
// sprint/epic-jt9.yaml and sprint/context/*.md live at the monorepo ROOT and are
// sprint tracking, not app behaviour — the same call jt5-7 and mg1-4 made for the
// same file family.
//
// ─── IN-SCOPE FILES (controller's scope resolution — see task-1-brief.md) ────
// ACTIVE joust sprint files only: sprint/epic-jt9.yaml and every
// sprint/context/context-*jt9*.md (globbed, not hardcoded — a new jt9 context
// file must fall under this gate without anyone remembering to list it).
// OUT of scope, deliberately untouched: sprint/archive/** (frozen history — a
// rewritten archive falsifies the record) and every other game's active
// epic/context files (this is the JOUST remainder of jt9-30, not a fleet-wide
// sweep).
//
// ─── THE TRAP THIS SUITE MUST NOT FALL INTO ──────────────────────────────────
// jt5-7's header explains it and it applies here unchanged: asserting a citation
// by REBUILDING it (`assert.match(text, /enemy\.ts:3727/)`) just moves the
// staleness up a layer — the next legitimate refactor that moves the line makes
// THIS FILE the stale citation. So every ref is resolved dynamically against the
// file it actually cites, never compared against a hardcoded line literal.
//
// ─── RESOLUTION RULE (the "defensible rule" the brief asks for, spelled out) ──
// A ref is `<path>.ts:<line>` or `<path>.ts:<start>-<end>`.
//   1. If `<path>` exists as a repo-relative path (e.g.
//      `plugins/joust/src/core/enemy.ts`), resolve it directly.
//   2. Otherwise `<path>` is treated as BARE (e.g. `enemy.ts`, or a partial path
//      like `core/sim.ts` that does not exist verbatim) and is resolved by
//      basename against every `.ts` file under `plugins/joust/` (src + tests +
//      tools, excluding node_modules). Exactly one candidate resolves; zero or
//      more than one is itself staleness, not silently ignored — see below.
//   3. A resolved ref's line (or, for a range, BOTH ends) must fall within the
//      resolved file's current line count.
//
// This is a narrower rule than "search the whole repo": measured against the
// real refs in scope, one story (jt9-35/jt9-6's cross-game audio finding) cites
// CENTIPEDE's `sim.ts` using bare/partial paths (`core/sim.ts:683-687`,
// `sim.ts:563`). `sim.ts` is not unique repo-wide either — five games each have
// one (asteroids, battlezone, centipede, star-wars, tempest) — so widening the
// search would not have rescued that ref; it would still correctly resolve as
// ambiguous. A bare ref that cites another game's file by basename alone is
// exactly the kind of un-anchored citation this gate exists to catch, so the
// joust-only rule is kept: it is simpler, and on the actual data it draws the
// same line the wider rule would.
//
// This gate deliberately checks RESOLUTION only (file exists, line/range in
// current bounds) — not that the cited span still holds the content it is
// quoted for. jt5-7's AC3 does that deeper, content-level check, but it does so
// for exactly ONE hand-picked citation against a frozen vendored ROM. Doing the
// same for the ~240 refs in scope here is not tractable by the same method (no
// stable oracle text to match against, and the citations point at live,
// frequently-edited application source) — see task-1-report.md's Design
// Deviations for the full reasoning.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join, basename, sep } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const read = (...p) => readFileSync(join(repo, ...p), 'utf8');

// ─── In-scope file list, globbed (not hardcoded) ──────────────────────────────
const CONTEXT_DIR = ['sprint', 'context'];

function inScopeFiles() {
  const contextFiles = readdirSync(join(repo, ...CONTEXT_DIR))
    .filter((f) => /^context-.*jt9.*\.md$/i.test(f))
    .map((f) => [...CONTEXT_DIR, f]);
  return [['sprint', 'epic-jt9.yaml'], ...contextFiles];
}

// ─── Every `.ts` file under plugins/joust/, for bare-ref resolution ───────────
function joustTsFiles() {
  const root = join(repo, 'plugins', 'joust');
  return readdirSync(root, { recursive: true })
    .filter((f) => f.endsWith('.ts'))
    .filter((f) => !f.split(sep).includes('node_modules'))
    .map((f) => join('plugins', 'joust', f));
}

// ─── Ref extraction — `<path>.ts:<line>` or `<path>.ts:<start>-<end>` ─────────
const REF_RE = /([A-Za-z0-9_./-]+\.ts):(\d+)(?:-(\d+))?/g;

function extractRefs(text) {
  const refs = [];
  let m;
  REF_RE.lastIndex = 0;
  while ((m = REF_RE.exec(text)) !== null) {
    const [, refPath, startS, endS] = m;
    refs.push({ refPath, start: Number(startS), end: endS ? Number(endS) : Number(startS) });
  }
  return refs;
}

/** Resolve a cited path (repo-relative or bare) to a real repo-relative path. */
function resolvePath(refPath, joustFiles) {
  if (existsSync(join(repo, refPath))) return { ok: true, path: refPath };
  const name = basename(refPath);
  const candidates = joustFiles.filter((f) => basename(f) === name);
  if (candidates.length === 1) return { ok: true, path: candidates[0] };
  if (candidates.length === 0) {
    return { ok: false, reason: `no file named '${name}' exists under plugins/joust/` };
  }
  return {
    ok: false,
    reason: `'${name}' is ambiguous under plugins/joust/ (${candidates.length} candidates: ${candidates.join(', ')})`,
  };
}

/** Resolve + range-check one ref. Returns { ok, reason? }. */
function checkRef({ refPath, start, end }, joustFiles) {
  const resolved = resolvePath(refPath, joustFiles);
  if (!resolved.ok) return resolved;
  if (start < 1) return { ok: false, reason: `line ${start} is < 1` };
  if (end < start) return { ok: false, reason: `range ${start}-${end} has end before start` };
  const lineCount = read(resolved.path).split('\n').length;
  if (end > lineCount) {
    return {
      ok: false,
      reason: `${resolved.path} has ${lineCount} lines; ref cites up to line ${end}`,
    };
  }
  return { ok: true };
}

// ═════════════════════════════════════════════════════════════════════════════
// PREMISE — the scope is non-empty and the extractor actually finds refs. A
// gate that silently iterates zero refs would pass forever without checking
// anything.
// ═════════════════════════════════════════════════════════════════════════════

test('PREMISE: in-scope joust sprint files exist and are non-trivial', () => {
  const files = inScopeFiles();
  assert.ok(files.length >= 2, 'expected at least the epic plus one context file');
  for (const p of files) {
    assert.ok(existsSync(join(repo, ...p)), `${p.join('/')} must exist`);
  }
});

test('PREMISE: the ref pattern finds a substantial number of refs in scope', () => {
  const total = inScopeFiles().reduce((n, p) => n + extractRefs(read(...p)).length, 0);
  // Measured 2026-08-08: 111 in epic-jt9.yaml + ~130 across context-*jt9*.md.
  // A wide floor, not a pinned count — the point is "the extractor isn't
  // silently matching nothing", not "no one may ever add or resolve a ref".
  assert.ok(total > 150, `expected >150 '.ts:<line>' refs across in-scope files, found ${total}`);
});

test('PREMISE: bare-ref resolution has real joust source to resolve against', () => {
  const files = joustTsFiles();
  assert.ok(files.length > 20, `expected a substantial plugins/joust .ts file set, found ${files.length}`);
  assert.ok(files.some((f) => f.endsWith('enemy.ts')), 'plugins/joust/src/core/enemy.ts must be indexed');
});

// ═════════════════════════════════════════════════════════════════════════════
// THE GATE — every ref in every in-scope file must resolve.
// ═════════════════════════════════════════════════════════════════════════════

for (const p of inScopeFiles()) {
  const label = p.join('/');
  test(`every '.ts:<line>' ref in ${label} resolves`, () => {
    const joustFiles = joustTsFiles();
    const refs = extractRefs(read(...p));
    const failures = [];
    for (const ref of refs) {
      const verdict = checkRef(ref, joustFiles);
      if (!verdict.ok) {
        failures.push(`${ref.refPath}:${ref.start}${ref.end !== ref.start ? `-${ref.end}` : ''} — ${verdict.reason}`);
      }
    }
    assert.deepEqual(failures, [], `stale refs in ${label}:\n  ${failures.join('\n  ')}`);
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// The gate's own non-vacuity, asserted against synthetic refs rather than
// argued — mirrors jt5-7 AC3's discriminator test. Without this, `checkRef`
// could be trivially true and the tests above would pass on any ref at all.
// ═════════════════════════════════════════════════════════════════════════════

test('checkRef discriminates: a real ref passes, fabricated bad refs fail', () => {
  const joustFiles = joustTsFiles();

  // A real, currently-true ref: this very file's own first line.
  const goodLineCount = read('tests', 'jt9-55-joust-yaml-refs.test.mjs').split('\n').length;
  const good = checkRef(
    { refPath: 'tests/jt9-55-joust-yaml-refs.test.mjs', start: 1, end: 1 },
    joustFiles,
  );
  assert.equal(good.ok, true, 'a real, in-range ref must resolve');

  const lineTooFar = checkRef(
    { refPath: 'tests/jt9-55-joust-yaml-refs.test.mjs', start: goodLineCount + 10_000, end: goodLineCount + 10_000 },
    joustFiles,
  );
  assert.equal(lineTooFar.ok, false, 'a line far past EOF must be rejected');

  const noSuchFile = checkRef({ refPath: 'plugins/joust/src/core/no-such-file.ts', start: 1, end: 1 }, joustFiles);
  assert.equal(noSuchFile.ok, false, 'a nonexistent repo-relative path must be rejected');

  const bareUnresolvable = checkRef({ refPath: 'no-such-basename.ts', start: 1, end: 1 }, joustFiles);
  assert.equal(bareUnresolvable.ok, false, 'a bare name with zero joust candidates must be rejected');

  // sim.ts exists in five OTHER games but not joust — a real example of the
  // ambiguity class this suite exists to catch (see the header note).
  const bareAmbiguousElsewhere = checkRef({ refPath: 'sim.ts', start: 1, end: 1 }, joustFiles);
  assert.equal(bareAmbiguousElsewhere.ok, false, "'sim.ts' has no joust candidate and must be rejected, not silently skipped");

  const rangeBackwards = checkRef({ refPath: 'plugins/joust/src/core/enemy.ts', start: 50, end: 10 }, joustFiles);
  assert.equal(rangeBackwards.ok, false, 'a range whose end precedes its start must be rejected');
});
