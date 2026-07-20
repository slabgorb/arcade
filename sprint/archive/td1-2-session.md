---
story_id: "td1-2"
jira_key: "td1-2"
epic: "td1"
workflow: "tdd"
---
# Story td1-2: Fold the AST purity scanner back to centipede and tempest — six false negatives each

## Story Details
- **ID:** td1-2
- **Jira Key:** td1-2
- **Workflow:** tdd
- **Stack Parent:** none

## Story Description

joust proved the shape; the siblings still run the regex comment-stripper with all six holes. Source: joust/tests/helpers/purity-scanner.ts (jt1-7 + jt1-11), built on the TypeScript compiler API (ts.createSourceFile — acorn is NOT in the Vite 8/rolldown tree and is JS-only anyway; that misprescription cost jt1-7 a finding). What ports: five intent-named ban tables (objects, member pairs, bare identifiers, calls, constructors) plus aliasing, general trivia-node unwrapping (parens/NonNull/satisfies/as-casts, proven general by composed review attacks), string-literal element access through the member table, located file:line reports, and the documented-limits header (five dataflow routes + shadowing strictness) with its mutation-checked rail. The six false negatives the siblings currently have: string-embedded /*, string-embedded //, template interpolation, Math destructuring alias, Date function-reference alias, and a string carrying BOTH markers. joust's test file is written as a portable flip/hold case table — copy it, expect to DELETE more code than you add. Watch for repo-specific ban differences (each game's core bans its own shell globals).

## Acceptance Criteria
- centipede and tempest each run the TS-compiler-API scanner; all six false negatives are caught in each repo, each proven red against the old scanner once.
- Each repo's existing purity expectations still pass and the full suites stay green — no false positives on their generated/data modules.
- Both carry the documented-limits header and its rail; the centipede '= Date' double-report (fixed in joust's copy with a lookahead) is gone.

## Workflow Tracking
**Workflow:** tdd
**Phase:** setup
**Phase Started:** 2026-07-20T18:49:38Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T18:49:38Z | - | - |

## Repository and Branch Info
**Repos:** centipede, tempest
**Branch:** chore/td1-2-ast-purity-scanner (both repos)

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): tempest's current scanner strips ONLY comments, never strings, so it OVER-flags string DATA — a false positive. Measured: `const err = "window.open failed"` → `[window]`; `"…Math.random() calls"` → `[Math.random]`. The AST port FIXES this (strings become data) — a deliberate semantic change. Safe because no real tempest core module currently carries a banned name in a string (suite green). Pinned in the new "no false positives — string DATA" test. Affects `tempest/tests/purity-scanner.test.ts` (Dev must not preserve the over-broad string matching). *Found by TEA during test design.*
- **Conflict** (non-blocking): two of the canonical six are NOT false negatives in these repos and were re-aimed (see Design Deviations). FN-3 (`\`${Math.random()}\``) is already caught by tempest (never strips strings). FN-5 (`const readClock = Date.now`) is already caught by BOTH — centipede via its over-broad `= Date` alias regex, tempest via the literal `Date.now`. Same evasion family, different red-producing construction per repo; all 12 re-verified red-vs-old / green-vs-joust. *Found by TEA during test design.*
- **Gap** (non-blocking): a 7th genuine false negative — the shell-import regex is case-SENSITIVE in BOTH repos (`.../shell` with no `i` flag), so `../SHELL/render` (which macOS resolves and RUNS) is missed. Matches joust's jt1-7 review. Added as a BONUS flip; joust's case-insensitive `SHELL_SPECIFIER` closes it on port. Affects `centipede/tests/purity.test.ts` and `tempest/tests/rom-clock-sources.test.ts:181`. *Found by TEA during test design.*
- **Improvement** (non-blocking): tempest has a SECOND inline core-purity regex table at `tempest/tests/core/events.test.ts:155` (`const FORBIDDEN`) that scans `events.ts`/`sim.ts`/`state.ts` and does NOT even strip comments — same holes, on three files, plus prone to comment false-positives. RED targets only the PRIMARY recursive sweep (`rom-clock-sources.test.ts:166`, the one tp1-4 names as THE guard). Consider migrating events.test.ts onto the shared scanner too, or record the duplication. *Found by TEA during test design.*
- **Question** (non-blocking): repo ban sets DIFFER and are smaller than joust's. centipede bans navigator/localStorage/eval/new Function/globalThis/HTMLCanvasElement/etc.; tempest bans EXACTLY requestAnimationFrame/Date.now/new Date/performance.now/Math.random/document/window + shell import. Dev must build each port's tables from THAT repo's set (not joust's) — the six only require alias/element-access closure of bans each repo ALREADY has (adds no new surface). Full ban sets are documented in each new test file's header. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): joust bans several globals neither sibling currently guards against. centipede does NOT ban `crypto.*`, `process.*`, `queueMicrotask()`, `OffscreenCanvas`, `ImageData`, or bare `Function(...)` calls (only `new Function()`). tempest's surface is far smaller still — it does NOT ban `setTimeout`/`setInterval`, `localStorage`/`sessionStorage`, `fetch`, `addEventListener`, `eval`, `new Function`, `globalThis`, `navigator.*`, `crypto.*`, `process.*`, `HTMLCanvasElement`/`CanvasRenderingContext2D`, `AudioContext`(+variants), or dynamic `import()`. Per the story's explicit instruction, none of these were added during the port (would be a scope-creeping behaviour change) — the AST engine was driven strictly from each repo's existing ban table. A future story could evaluate whether tempest's much smaller surface (7 rules vs. joust's ~20) should be widened to match its siblings. Affects `centipede/tests/helpers/purity-scanner.ts`, `tempest/tests/helpers/purity-scanner.ts`. *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **FN-3 tempest re-aim:** Spec's canonical case is `` `t${Math.random()}` ``; tempest already CATCHES it (never strips strings). Tests use `` `t${Math["random"]()}` `` — element access inside the interpolation so the literal `Math.random` never appears. Reason: produces the genuine tempest miss while staying in the template-interpolation family. Proven red-vs-tempest / green-vs-joust.
- **FN-5 centipede re-aim:** Spec's canonical case is `const readClock = Date.now`; centipede's over-broad `= Date` alias regex CATCHES it. Tests use `const rnd = Math.random; rnd()` — a function-reference alias of Math.random that the call-anchored `Math.random(` regex genuinely misses. Reason: same evasion family, one banned member over. Proven red-vs-centipede / green-vs-joust.
- **FN-5 tempest re-aim:** tempest catches the canonical form via the literal `Date.now`. Tests use `const readClock = Date["now"]; readClock()` — element-access re-spelling. Proven red-vs-tempest / green-vs-joust.
- **Naming-agnostic assertions:** MUST FLIP/HOLD member checks assert via regex (`/\bDate\.now/`) rather than exact rule strings. Reason: the ported rule NAMES are Dev's choice and legitimately differ per repo (tempest historically `Date.now`, centipede `Date.now()`); a regex match keeps the tests honest without dictating punctuation. Alias/destructure checks assert `hits.length > 0` (mirrors joust).

## TEA Assessment

**Tests Required:** Yes
**Reason:** RED phase — port joust's AST core/shell purity scanner into centipede and tempest, closing the six regex false negatives in each.

**Test Files:**
- `centipede/tests/purity-scanner.test.ts` — 31 tests (6 flip + 1 bonus, 9 hold, 6 no-FP, 2 double-report, 2 location, 2 limits, 3 structural)
- `tempest/tests/purity-scanner.test.ts` — 29 tests (6 flip + 1 bonus, 9 hold, 6 no-FP, 2 location, 2 limits, 3 structural)

**Tests Written:** 60 tests covering all 3 ACs.
**Status:** RED (centipede full suite 31 failed | 669 passed; tempest 29 failed | 1710 passed — old baselines 669/1710 exactly intact, no pre-existing test broken).

**Anti-vacuity:** every false negative empirically proven 6/6 red-vs-old-scanner and 6/6 green-vs-joust-AST in BOTH repos (probe outside the repos). Real src/core of both repos scanned clean under the AST engine (AC-2 satisfiable, no false positives on the pictures.ts / rules.ts data modules).

**Commits:** centipede `6ddd407`, tempest `2514d17` (test-only, branch `chore/td1-2-ast-purity-scanner`, not pushed).

**Handoff:** To Dev (GREEN) — create `tests/helpers/purity-scanner.ts` in EACH repo (TS-compiler-API, joust's engine) built from THAT repo's ban set (see each test-file header + Delivery Findings), migrate the src/core sweep onto it, delete the inline regex stripper. `.session/td1-2-handoff-red.md`.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `centipede/tests/helpers/purity-scanner.ts` (new) - TS-compiler-API port of joust's scanner, driven by centipede's own ban tables (BANNED_OBJECTS {window, document, navigator}; BANNED_MEMBERS {Date.now, Math.random, performance.now}; BANNED_IDENTIFIERS {localStorage, sessionStorage, globalThis, HTMLCanvasElement, CanvasRenderingContext2D} + AudioContext-suffix check; BANNED_CALLS {setTimeout, setInterval, requestAnimationFrame, fetch, addEventListener, eval}; BANNED_CONSTRUCTORS {Date, Function}; ALIASABLE_OBJECTS {Date, Math}; case-insensitive shell-import; dynamic import() check kept). Exports `violations(source, filename?)`.
- `centipede/tests/purity.test.ts` - deleted the inline `stripComments`/`stripStrings`/`BANNED`/`SHELL_IMPORT`/local `violations()`; now imports the shared scanner and wraps it with a location-suffix-stripping `violations()` for the fixture self-tests (preserves every existing assertion's exact rule-name semantics), and the src/core sweep now calls the shared scanner's located form directly for better error messages. No coverage dropped — all pre-existing fixture assertions and the full src/core sweep still pass.
- `tempest/tests/helpers/purity-scanner.ts` (new) - same engine, driven by tempest's much smaller ban table (BANNED_OBJECTS {window, document}; BANNED_MEMBERS {Date.now, Math.random, performance.now}; BANNED_CALLS {requestAnimationFrame}; BANNED_CONSTRUCTORS {Date}; ALIASABLE_OBJECTS {Date, Math, performance, window, document} per the RED header's explicit breakdown; case-insensitive shell-import). No BANNED_IDENTIFIERS, no AudioContext check, no dynamic-import() check — none of those are in tempest's ban surface.
- `tempest/tests/rom-clock-sources.test.ts` - deleted the inline `FORBIDDEN` regex table and its two `it(...)` bodies inside "the core purity boundary" describe block; replaced with calls to the shared scanner (filtering on/checking for the `import from shell/` prefix to preserve the original two-test split). Rest of the file (ROM_FPS `*60`/`/60` checks, `stripComments` used elsewhere, spinner/loop/render checks) untouched.
- `tempest/tests/core/events.test.ts` - untouched by design (TEA flagged its duplicate inline `FORBIDDEN` table as non-blocking/out-of-RED-scope; left it as a separate, still-green guard rather than scope-creeping the migration).

**Tests:** centipede 700/700 passing (31 new + 669 baseline); tempest 1739/1739 passing (29 new + 1710 baseline). Both exactly match the target counts, no deltas to explain. `npm run build` (tsc --noEmit && vite build) clean in both repos.

**Branch:** `chore/td1-2-ast-purity-scanner` (both repos, NOT committed/pushed per Dev's explicit instructions — SM/Dev-orchestrator owns the commit).

**Handoff:** To review. Full report delivered in chat (file-by-file rationale, exact ban-set tables as wired, `git diff --stat` scope, no test found to be wrong, joust-only bans correctly withheld and recorded above as a Delivery Finding).
