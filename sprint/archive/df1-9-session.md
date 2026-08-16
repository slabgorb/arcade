---
story_id: "df1-9"
jira_key: "df1-9"
epic: "df1"
workflow: "tdd"
---
# Story df1-9: Close the games-roster staleness cycle

## Story Details
- **ID:** df1-9
- **Jira Key:** df1-9
- **Workflow:** tdd
- **Type:** chore
- **Points:** 3
- **Stack Parent:** none
- **Branch Strategy:** gitflow (feat/df1-9-close-roster-staleness-cycle)
- **Branch:** feat/df1-9-close-roster-staleness-cycle
- **PR:** #448 (code, into develop — awaiting user merge)
- **Base:** develop

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T09:57:38Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T09:30:24Z | 2026-08-16T09:33:31Z | 3m 7s |
| red | 2026-08-16T09:33:31Z | 2026-08-16T09:39:37Z | 6m 6s |
| green | 2026-08-16T09:39:37Z | 2026-08-16T09:41:04Z | 1m 27s |
| review | 2026-08-16T09:41:04Z | 2026-08-16T09:50:12Z | 9m 8s |
| red | 2026-08-16T09:50:12Z | 2026-08-16T09:51:25Z | 1m 13s |
| green | 2026-08-16T09:51:25Z | 2026-08-16T09:52:14Z | 49s |
| review | 2026-08-16T09:52:14Z | 2026-08-16T09:57:38Z | 5m 24s |
| finish | 2026-08-16T09:57:38Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No design deviations

## Sm Assessment

Setup complete for df1-9 (3pt, chore, arcade, tdd). This is the df1-7-review-routed
cleanup that also closes the roster-staleness mechanism df1-5 left open.

**Ownership probes (clean):** no `df1-9` branch on origin before setup; live sibling
sessions were a-1/df1-8 and a-3/ml10-3 only — no collision. Merge gate clear (no open
non-draft PRs). Claim committed and the feature branch pushed so the sibling probe sees
it; story stamped `in_progress` (verified on disk — the first stamp silently no-op'd and
was re-applied).

**Premise measured against the current tree (all three title clauses LIVE, 2026-08-16):**
1. `README.md:127` still reads "nine games + the lobby"; wired count is eleven.
2. `CLAUDE.md` R2 table lines 203–212 lists nine game rows, missing `defender/` and
   `millipede/`.
3. `tests/monorepo-topology.test.mjs:96` `GAMES` holds all eleven. Existing guards pin
   the plugins/ directory count (line 104) and prose wording
   (`tests/df1-5-defender-roster-doc.test.mjs`), but nothing derives the prose roster
   total numeral / raster-vector split from `GAMES` — the gap this story closes.

Because the epic YAML's `acceptance_criteria` is `null`, the context ACs are derived
from the title (three deliverables, one per clause) for TEA to firm up in RED. Context
enriched with the verified facts and file:line anchors; no correction banner needed
since nothing in the premise had rotted.

Handing off to TEA (Leeloo) for the RED phase.
## Tea Assessment

RED landed for df1-9. One new orchestrator test file: `tests/df1-9-roster-count-guard.test.mjs`
(node:test `.mjs`, run by `npm run test:orchestrator`). 7 tests: **4 pass, 3 fail** — the
three fails are feature-shaped and are the Dev's GREEN targets.

**Single source of truth:** every count is derived from `readdirSync(plugins/)` (the wired
game set), compared to `WIRED_COUNT` — never a hardcoded 11. That is the exact set
`tests/monorepo-topology.test.mjs:104` binds its `GAMES` const to, so the two cannot diverge
without that topology test reddening first. Hardcoding the total is the desync this story
closes, so the guard refuses to.

**RED (feature-shaped, → Dev makes green):**
- ✖ `AC1: README build-all comment states the wired game count` — `README.md:127` says
  "(nine games + the lobby)"; 9 ≠ 11. Anchored on the build-all comment so it can neither be
  satisfied by nor falsely reddened by the HISTORICAL "nine separate repos" at README.md:9.
- ✖ `AC2: every wired game has a row in the CLAUDE.md R2 hosting table` — `defender/` and
  `millipede/` rows are absent.
- ✖ `AC2: the R2 hosting table lists exactly the wired games` — deep-equals the row id set to
  the wired set (catches both a missing row and a stray retired-game row).

**GREEN on arrival (the AC3 mechanism — NOT filler):**
- ✔ `AC3: **Games** total numeral equals the wired count` (prose already says "eleven")
- ✔ `AC3: vector + raster split sums to the wired count` (5 + 6 = 11)
- ✔ `AC3: **Games** prose enumerates exactly the wired count of dated games` (11 year-clauses)
These pass today because df1-5's follow-up already corrected the `**Games:**` prose. They are
the anti-desync guard this story installs, and they are non-vacuous by construction:
**MUTATION PROOF** — add `plugins/pong/` (a 12th wired game) and all five count guards redden
(README numeral, R2 row set, total numeral, split sum, year-clause count) because each
disagrees with `WIRED_COUNT=12`.

**Values, not spellings:** `parseCount()` accepts a word ("eleven") OR a digit ("11"), so Dev
may write the README/table fix either way. Over-pinning the `**Games:**` wording is df1-5's
job, not this guard's.

### Dev handoff (what makes it GREEN)
1. `README.md:127` — change "(nine games + the lobby)" to the true count (eleven / 11).
2. `CLAUDE.md` R2 hosting table (~203–212) — add a `defender/` row and a `millipede/` row in
   roster order, matching the existing `| id | https://arcade.slabgorb.com/id/ | id/ |` format.
   Do NOT touch the historical "nine … repos" lines (README:9, CLAUDE:12/16/295) or the
   already-correct `**Games:**` prose.
3. No source changes — this is docs + a guard. `npm run test:orchestrator` (df1-9 file) goes
   7/7; run it green before handoff.

### Rule Coverage (`.pennyfarthing/gates/lang-review/javascript.md`)
- **#8 Test quality:** no vacuous assertions — every test compares a parsed value to a derived
  `WIRED_COUNT`; the control test proves `parseCount` accepts words, digits, and rejects junk
  (guards against a silent NaN comparison). No `.only`/`.skip`. Deletion-proof: AC2 asserts
  positive per-id presence AND an exact deep-equal.
- **#4 Equality/coercion:** `assert.equal`/`assert.deepEqual` (strict) throughout; no `==`.
- **#7 Regex safety:** all patterns are static (no user input), anchored to literal markers,
  no catastrophic backtracking; the one `new RegExp` interpolates a plugins/ dir name (trusted,
  filesystem-derived), not external input.
- **#1 Silent errors / #10 Error handling:** region extractors assert `!== -1` before slicing,
  so a moved/renamed heading fails loudly instead of slicing garbage — no swallowed miss.
- **#9 Module/scope:** `const` throughout, no side-effect imports beyond `readFileSync`.

Handing off to Dev (Korben) for GREEN.
## Dev Assessment

GREEN for df1-9. Two markdown edits, no source changes.

**Changes:**
- `README.md:127` — `just build-all` comment: "nine games + the lobby" → "eleven games + the lobby" (AC1).
- `CLAUDE.md` R2 hosting table — appended a `defender/` row and a `millipede/` row after `pac-man`, in `GAMES`-const tail order, matching the existing `| id | https://arcade.slabgorb.com/id/ | id/ |` format (AC2).

**Deliberately untouched** (per TEA handoff — these are historical or already-correct):
- README.md:9 and CLAUDE.md:12/16/295 "nine … repos" (the archived-repo count, a historical fact).
- The `**Games:**` prose ("eleven … five vector … six raster") — already correct; df1-5 owns its wording.

**Verification:**
- `tests/df1-9-roster-count-guard.test.mjs`: **7/7 pass** (was 4/7). AC1, AC2×2 flipped RED→GREEN; the three AC3 mechanism guards stayed green.
- Full orchestrator suite: **505 pass, 0 fail** — no other doc/topology guard regressed.
- No TS/JS source touched → `lint` (tsc --noEmit) and the JS lang-review checklist are N/A for this diff.

Handing off to Reviewer (Zorg).
## Round 1 Subagent Results (superseded by round 2 below)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (505/505 orch, 7/7 df1-9, 0 smells, lint N/A) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — hand-covered by Reviewer |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — hand-covered by Reviewer |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — hand-covered by Reviewer |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — hand-covered by Reviewer |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — hand-covered by Reviewer |
| 7 | reviewer-security | Yes | findings | 1 (low, defense-in-depth) | dismissed→noted 1 (see below) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — hand-covered by Reviewer |
| 9 | reviewer-rule-checker | Yes | findings | 1 (rule #3, high conf) | confirmed 1 (BLOCKING) |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled as Skipped)
**Total findings:** 1 confirmed (blocking), 1 noted-non-blocking (security, downgraded with rationale), 0 deferred

## Round 1 Reviewer Assessment (REJECTED — superseded by round 2 below)

**Verdict:** REJECTED (round 1 — the fix landed; see round 2 for the APPROVED verdict)

I know this music. One defect — and it is the exact defect this repo already wrote a
dedicated test to forbid.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| HIGH | `parseCount()` does `t in WORD_TO_NUMBER` / `WORD_TO_NUMBER[t]` against a plain `{}` object literal, so `in`/bracket access walk the prototype chain. `parseCount('constructor')` returns `[Function: Object]` and `parseCount('__proto__')` returns `Object.prototype` — both violate the docstring contract "Returns null for anything else." This is a rule #3 (prototype pollution, CWE-1321) violation, and the repo has ALREADY ruled this shape a defect: `tests/sprint-repo-routing.test.mjs:177-193` names "javascript.md check #3 applied to this exact code shape" and prescribes a `Set`/`Map`/`Object.create(null)`, not `{}`. Raw exploitability in THIS file is low (the parsed tokens come from README/CLAUDE.md roster prose, which will never read "constructor games + the lobby", and the sole caller compares via `assert.equal(parseCount(...), WIRED_COUNT)` so a function value fails loudly rather than false-greening) — but a non-dismissable rule match with standing in-repo precedent may be downgraded, not shipped. | `tests/df1-9-roster-count-guard.test.mjs:70-85` (esp. `t in WORD_TO_NUMBER` at :84) | (a) Make the lookup prototype-safe: `const WORD_TO_NUMBER = Object.create(null)` (or guard with `Object.hasOwn(WORD_TO_NUMBER, t)`, or use a `Map`). (b) Extend the control test to PROVE the contract: assert `parseCount('constructor') === null` and `parseCount('__proto__') === null` — this assertion is RED against the current `{}` impl and GREEN after the fix, which is the missing coverage the rule-checker flagged. |

### Observations (≥5)
- [RULE] CONFIRMED prototype-pollution violation at `tests/df1-9-roster-count-guard.test.mjs:84` — verified live: `parseCount('constructor')` → `[Function: Object]`; precedent `tests/sprint-repo-routing.test.mjs:177-193` verified real. This is the blocking finding.
- [SEC] Security subagent's one finding (unescaped `${id}` in `new RegExp` at :139) — NOTED, downgraded to Low/non-blocking: `id` is a `readdirSync(plugins/)` dir name (repo-trusted, no external trust boundary) and the interpolation has no quantifier wrapper, so no ReDoS path; worst case is a thrown SyntaxError that fails the test loudly. Not dismissed — recorded as a Delivery Finding for optional hardening. Note it overlaps the same `WORD_TO_NUMBER`/RegExp rigor theme as the blocker.
- [TEST] (hand-covered, test_analyzer disabled) [VERIFIED] the three AC3 guards are green-on-arrival but NON-vacuous — evidence: rule-checker mutation-tested live (added `plugins/pong/`, all guards reddened, tree reverted clean); every assertion compares to readdirSync-derived `WIRED_COUNT`, never a literal. `tests/df1-9-roster-count-guard.test.mjs:58-62`.
- [DOC] (hand-covered, comment_analyzer disabled) [VERIFIED] header comments are accurate — the `monorepo-topology.test.mjs:104` citation is correct, the MUTATION PROOF is reproducible, and the AC1 comment correctly distinguishes the build-all "nine" from the historical README:9 "nine repos". No stale/misleading comments.
- [EDGE] (hand-covered) [VERIFIED] `WIRED` source is pure — `plugins/` holds exactly the 11 game dirs, no stray dir/file (`ls plugins/` + isDirectory filter); the AC2 exactly-wired regex excludes the lobby root row (verified: only `tempest` captured from a lobby+tempest sample), so the deep-equal to `WIRED` is sound and the lobby row is a genuine control.
- [VERIFIED] historical "nine … repos" lines UNTOUCHED — evidence: `git diff origin/develop...HEAD` on README.md/CLAUDE.md shows only README:127 (`nine`→`eleven`) and the two added table rows; README:9, CLAUDE:12/16/297 unchanged.
- [SIMPLE] (hand-covered) no over-engineering — the guard is the minimal shape for the AC; the `WORD_TO_NUMBER` 0–20 range is justified (a future "twelve" must parse). No dead code.
- [SILENT] (hand-covered, silent_failure_hunter disabled) [VERIFIED] no swallowed errors — there are no try/catch, no `.catch`, no empty fallbacks; every extraction failure surfaces via `assert.notEqual(idxOf, -1)` / `assert.ok(m)` before use, so a moved heading or a wording change fails loudly rather than silently matching nothing. `tests/df1-9-roster-count-guard.test.mjs:105,127-130,168-171`.
- [TYPE] (hand-covered, type_design disabled) [VERIFIED] `parseCount` returns a clean `number | null` union at every non-error path AND the callers guard the null (`assert.ok(m)` / `v != null && r != null`) before arithmetic — no NaN leaks into a comparison. The ONE type-contract breach is the blocker: the `{}` lookup lets an inherited *function/object* escape the documented `number | null`, which is precisely why the fix restores the type invariant. `tests/df1-9-roster-count-guard.test.mjs:80-85,193`.

### Rule Compliance (`.pennyfarthing/gates/lang-review/javascript.md`)
- #1 Silent errors: PASS — `r2TableBlock()`/`gamesProse()` assert `indexOf !== -1` before slicing (fail loud, no garbage slice).
- #3 Prototype pollution: **FAIL** — `parseCount` `{}` lookup (the blocker above). One instance, confirmed.
- #4 Equality/coercion: PASS — `node:assert/strict`; the two `== null`/`!= null` are the idiomatic null-or-undefined exception, and `!= null` at :193 correctly avoids the 0-is-falsy trap for the word "zero".
- #7 Regex safety: PASS — 8 patterns, all linear/anchored, `g`-flag ones used with `matchAll` not `.test()` (no statefulness bug); the `${id}` interpolation is the Low security note above.
- #8 Test quality: PASS — no `.only`/`.skip`, no vacuous assertions, mutation-tested non-vacuity; the ONE gap (control test doesn't prove the reject-non-numbers contract for inherited keys) is folded into the blocking fix.
- #9 Module/scope: PASS — all `const`, side-effect-free builtin imports, correct `tests/*.test.mjs` orchestrator home.

### Devil's Advocate
Argue this guard is broken. First and strongest: the file's own contract-enforcing helper,
`parseCount`, lies. Its docstring promises "Returns null for anything else," yet
`parseCount('constructor')` hands back the `Object` constructor function. A confused future
editor, trusting that contract, could build a new roster surface whose numeral token happens
to collide with an inherited key and get a silent non-null where they expected a clean reject —
and the control test, which is supposed to be the anti-vacuity anchor, never exercises a single
inherited key, so it certifies a contract it does not actually test. The repo already learned
this lesson once (`sprint-repo-routing.test.mjs`) with a real YAML-driven exploit path; shipping
the same `{}` shape in a brand-new rigor-focused file is a regression in discipline even if not
in exploitability. Second: the year-clause guard (`/\((\d{4})\)/g`) is brittle — the moment
someone writes a parenthesized four-digit number inside the `**Games:**` block for any reason
("(2024)"), the count silently inflates and reddens a correct roster; it counts a proxy (any
`(YYYY)`) for the thing it means (a listed game). Third: the AC1 anchor depends on the exact
phrase "build every app (N games + the lobby)"; a Dev who rewords the comment while keeping it
truthful would trip the extraction `assert.ok(m)` and redden a correct doc — the guard couples
to prose wording, not meaning. Fourth: `WIRED` trusts that `plugins/` contains only game dirs;
a scratch dir (`plugins/.tmp/`, or a future `plugins/shared/`) would silently inflate every
count — mitigated only because `monorepo-topology.test.mjs:104` reddens first, an external
dependency this file doesn't restate. None of these except the first rise to blocking today, but
the first is a confirmed, precedented rule violation with a one-line fix, and Zorg does not
grant zero-defects to a file that reproduces a defect the codebase already outlawed. The rest
are logged for awareness. REJECTED.

**Handoff:** Back to TEA (Leeloo) for fixes — the finding is testable (add the inherited-key
control assertions, then harden `parseCount`).

### Reviewer (audit)
- No undocumented spec deviations. The session's `## Design Deviations` reads "No design
  deviations" and the diff matches the ACs (README numeral, R2 rows, roster guard). Nothing
  to stamp ACCEPTED/FLAGGED.

### Reviewer (code review)
- **Improvement** (blocking): `parseCount()` uses a plain-`{}` membership lookup, a rule #3
  (prototype-pollution) violation. Affects `tests/df1-9-roster-count-guard.test.mjs:70-85`
  (switch to `Object.create(null)`/`Object.hasOwn`/`Map` and add inherited-key control
  assertions). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `${id}` interpolated unescaped into `new RegExp` — safe
  today (trusted `plugins/` dir names) but matches rule #7's letter. Affects
  `tests/df1-9-roster-count-guard.test.mjs:139` (optional: regex-escape `id`).
  *Found by Reviewer during code review.*
### TEA rework (review round 1 → red)
Reviewer's HIGH (rule #3 prototype pollution in `parseCount`) is CONFIRMED and now pinned by
a test. Added three control assertions — `parseCount('constructor'|'__proto__'|'toString') ===
null` — to the control test. They are RED against the current plain-`{}` `WORD_TO_NUMBER`:
`parseCount('constructor')` returns the `Object` function, `__proto__` returns `Object.prototype`
('toString' is dodged only by `.toLowerCase()`, but pinned for completeness). Current state:
6/7 pass, 1 fail (control). AC1/AC2/AC3 remain green (Dev's doc fixes stand).

**Dev fix (make green):** change `const WORD_TO_NUMBER = { … }` to a prototype-free lookup —
`Object.create(null)` seeded with the same entries, or guard the membership with
`Object.hasOwn(WORD_TO_NUMBER, t)`, or a `Map`. One line; no other change needed. Repo remedy
precedent: `tests/sprint-repo-routing.test.mjs:177-193`. Then `node --test tests/df1-9-roster-count-guard.test.mjs`
→ 7/7, and re-run the full orchestrator suite.

Handing off to Dev (Korben) for GREEN.
### Dev rework (review round 1 → green)
Fixed the rule #3 finding one line: `parseCount` now uses `Object.hasOwn(WORD_TO_NUMBER, t)`
instead of `t in WORD_TO_NUMBER`, so inherited Object members no longer leak through the
prototype chain. `WORD_TO_NUMBER` kept as a readable literal. TEA's three control assertions
(`constructor`/`__proto__`/`toString` → null) now pass. df1-9 guard **7/7**, full orchestrator
suite **505/505**. No other file touched. Handing back to Reviewer (Zorg).
## Subagent Results

Review round 2 — verifying the round-1 rework (prototype-safe `parseCount`).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (7/7 df1-9, 505/505 orch, only docs+test changed) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — hand-covered |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — hand-covered |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — hand-covered |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — hand-covered |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — hand-covered |
| 7 | reviewer-security | Yes | clean | none (fix closes CWE-1321, no new surface) | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — hand-covered |
| 9 | reviewer-rule-checker | Yes | clean | rule #3 CLOSED (mutation-verified), no #13 regression | confirmed closed |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled as Skipped)
**Total findings:** 0 confirmed, 0 deferred — the single round-1 finding is verified CLOSED

## Reviewer Assessment

**Verdict:** APPROVED

Zero defects. The round-1 finding is closed and independently re-verified; the rework is a
three-line, additive, test-only change and every gate is green.

**Round-1 finding resolution:**
- [RULE] The rule #3 (prototype pollution, CWE-1321) violation in `parseCount` is CLOSED.
  `t in WORD_TO_NUMBER` → `Object.hasOwn(WORD_TO_NUMBER, t)` at `tests/df1-9-roster-count-guard.test.mjs:86`.
  The rule-checker MUTATION-verified it: reverting that one line reproduces exactly one failure,
  on the `constructor` assertion, leaking `[Function: Object]` — proving both the fix and the new
  control assertions' non-vacuity. My own run confirms `constructor`/`__proto__`/`toString`/
  `hasOwnProperty`/`valueOf` → null, while `nine`/`eleven`/`11` still parse.
- [SEC] Security round 2: clean — `Object.hasOwn` guards the bracket read so no residual
  prototype-walking path remains; the only lookup site; no new surface introduced.

**Observations (≥5):**
- [RULE] CONFIRMED closed — rule #3 fix is correct and mutation-proven (above). No rule #13
  fix-introduced regression; full javascript.md re-scan of the hunk is clean.
- [TEST] (hand-covered) [VERIFIED] the three new control assertions are non-vacuous — evidence:
  reverting line 86 fails exactly the `constructor` assertion with the predicted leaked value.
  They pin the `number | null` contract, not a token. `tests/df1-9-roster-count-guard.test.mjs:106-108`.
- [TYPE] (hand-covered) [VERIFIED] the `number | null` return contract of `parseCount` is now
  actually honoured for inherited keys — the one path that could leak a function/object is closed.
  `tests/df1-9-roster-count-guard.test.mjs:80-86`.
- [SILENT] (hand-covered) [VERIFIED] no swallowed errors introduced — the change is a pure ternary
  swap; region extractors still assert `!== -1`/`assert.ok(m)` before use (unchanged).
- [DOC] (hand-covered) [VERIFIED] the new comment accurately describes the mechanism and cites a
  real precedent (`tests/sprint-repo-routing.test.mjs:177-193` confirmed to exist and match).
  No stale/misleading comments.
- [EDGE] (hand-covered) [VERIFIED] `Object.hasOwn` handles the full inherited-member set
  (`constructor`, `__proto__`, `toString`, `hasOwnProperty`, `valueOf`) → null; real words/digits
  and null/undefined all still correct (independently run).
- [SIMPLE] (hand-covered) minimal fix — one line, kept the readable object literal; no over-engineering.
- [VERIFIED] no regression anywhere — full orchestrator suite 505/505; diff is docs + the one test file.

**Rule Compliance (`.pennyfarthing/gates/lang-review/javascript.md`):** #3 now PASS (the fix);
#4/#7/#8/#9/#13 all PASS (rule-checker full re-scan clean). No remaining violations.

**Data flow traced:** a roster numeral token (regex-captured from README/CLAUDE.md prose, or a
plugins/ dir name) → `parseCount` → compared to readdirSync-derived `WIRED_COUNT`. Safe: inherited
Object keys can no longer masquerade as counts; a real miss returns null and fails the assertion loudly.

**Pattern observed:** prototype-safe membership via `Object.hasOwn` — the repo's own prescribed
remedy (`tests/sprint-repo-routing.test.mjs`) — at `tests/df1-9-roster-count-guard.test.mjs:86`.

**Error handling:** extraction misses fail loudly via `assert.notEqual(idxOf,-1)` / `assert.ok(m)`;
no swallowed paths — `tests/df1-9-roster-count-guard.test.mjs:105,127-130,168-171`.

**Handoff:** To SM (Ruby Rhod) for finish-story.

### Reviewer (audit) — round 2
- No undocumented spec deviations. `## Design Deviations` reads "No design deviations"; the
  rework matches the round-1 finding exactly (prototype-safe lookup + control assertions).

### Reviewer (code review) — round 2
- No new upstream findings. The round-1 findings (blocking rule #3; non-blocking regex-escape)
  are resolved / recorded; nothing further surfaced.