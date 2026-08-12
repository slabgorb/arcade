---
story_id: "ml1-1"
jira_key: "ml1-1"
epic: "ml1"
workflow: "tdd"
---
# Story ml1-1: Citation gate + src/core purity test FIRST (TDD)

## Story Details
- **ID:** ml1-1
- **Jira Key:** ml1-1
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none
- **Branch:** feat/ml1-1-citation-gate-purity
- **PR:** https://github.com/slabgorb/arcade/pull/267

## Background

**Premise verified by SM against current tree:**
- `plugins/centipede/tools/audit/check-citations.mjs` exists — the canonical port source (~12KB, single-sided with `ours` side already dropped per its own header)
- `plugins/centipede/tests/audit/citations.test.ts` exists — the citations test pattern to mirror
- `plugins/centipede/tests/purity.test.ts`, `purity-scanner.test.ts`, and `tests/helpers/purity-scanner.ts` exist — the purity scan pattern to mirror
- `plugins/millipede/` now EXISTS (ml1-5 completed 2026-08-11) with scaffold: index.html, plugin.ts, package.json, tsconfig.json, empty src/
- Every game in the fleet (tempest, star-wars, asteroids, battlezone, red-baron, centipede, joust, missile-command, pac-man) carries this pattern — it is a fleet gate

**TDD authorship ruling (from centipede's citations.test.ts header — carry into RED/GREEN split):**
Claims are DATA; the checker is CODE.
- RED (TEA): authors `citations.test.ts` suite + purity test + INLINE SEED FIXTURES (citations verified by hand); suite FAILS on empty/missing claims dir
- GREEN (Dev): authors `tools/audit/check-citations.mjs` (single-sided checker, drop `ours` side) and the `docs/rom-study/claims/` dossier plumbing; coverage suite must genuinely RED-on-empty to drive Dev

**Acceptance Criteria (derived from title's three named deliverables + TDD authorship + CI guard):**
1. `plugins/millipede/tools/audit/check-citations.mjs` exists and is a single-sided port of centipede's (no git `--ours` conflict side; millipede has one source-of-truth)
2. `plugins/millipede/tests/audit/citations.test.ts` exists and FAILS on any uncovered prose citation (mirror of centipede's, with seed fixtures)
3. `plugins/millipede/tests/` carries a src/core purity scan test that FAILS on fetch / canvas / Date / Math.random in src/core source text (mirrors centipede's purity.test.ts + purity-scanner.ts)
4. The entire gate (AC-1, AC-2, AC-3) is committed on this branch BEFORE the first game constant lands (block future ml* stories from skipping the gate)
5. Byte-verification blocks (`describe.skipIf`) skip on CI (no `reference/` tree) leaving the suite green, mirroring centipede's guard

**Design note for RED/GREEN phases (flagged, not resolved):**
TEA will decide: does the purity scan run green-on-empty `src/core/`, or is a minimal placeholder tree required? Both are valid TDD approaches. Surface the choice in RED findings; Dev implements the GREEN decision.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-12T10:29:44Z
**Round-Trip Count:** 2
**Branch:** feat/ml1-1-citation-gate-purity

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-11T23:14:45Z | 2026-08-11T23:17:04Z | 2m 19s |
| red | 2026-08-11T23:17:04Z | 2026-08-11T23:31:46Z | 14m 42s |
| green | 2026-08-11T23:31:46Z | 2026-08-11T23:39:45Z | 7m 59s |
| review | 2026-08-11T23:39:45Z | 2026-08-11T23:56:25Z | 16m 40s |
| red (rework) | 2026-08-12T00:12:01Z | - | - |

> **Rework loop-back (2026-08-12):** Reviewer REJECTED (see Reviewer Assessment) and handed to TEA for RED rework. The pf `tdd` review gate's `target_phase` is `green`, but the blocking round is predominantly missing/weak test batteries (S1 RED test, R2 hardening-ban battery, R3 accept-branch, R5 tautology, M1 brittle assert), so — with the user's explicit `/pf-tea` — the loop-back is routed to TEA (red) first, then Dev (green). `fix-phase` is forward-only and cannot express the loop-back, so the phase field was set to `red` by hand.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **TEA (red):** The vendored source tree IS present in this checkout (`reference/original-source/millipede/`, 16 files incl. MLDEF/COIN65/CONWAY/MLIRQ/…), so the byte-teeth `describe.skipIf(!vendoredAvailable)` blocks RUN here and are RED against the missing checker — they are not silently skipped. On CI (no `reference/` tree) they skip and the suite is green (AC-5). Dev should confirm the same on a scratch run with `MILLIPEDE_SOURCE_DIR` unset if reproducing the CI path.
- **TEA (red):** `COIN65.MAC` is byte-identical to centipede's (design spec §1a). The whitespace fixture uses `COIN65.MAC:11` — verified 8-space-indented `.RADIX 16` this session — so the leading-space-preservation teeth are real.
- **TEA (red):** No `.MAP` file exists in the millipede tree (only `MILLI.LNK`); the sweep grammar still accepts `.MAP` for parity with centipede, but the AC-4 resolution fixture cites `MILLI.LNK` and `368X1.DOC`, which DO exist. Grammar accepting an extension with no file in-tree is harmless (the checker gates on existence, not extension).

### Reviewer (code review)
- **Gap** (non-blocking): the bare-`..` containment bypass + uncaught EISDIR crash (S1, fixed for millipede in this story's rework) exists IDENTICALLY in `plugins/centipede/tools/audit/check-citations.mjs` and every other game's ported checker (the `if (isAbsolute(file) || file.includes('/'))` guard with an un-contained `REVISION_SUBDIRS` fallback loop). Affects all `plugins/*/tools/audit/check-citations.mjs` (apply the same unconditional-containment fix fleet-wide). *Found by Reviewer during code review — file as a fleet hardening story (ml8+/cross-cutting), do not block ml1-1 on the siblings.*
- **Gap** (non-blocking): containment is computed with lexical `resolve()`, not `realpathSync`, so a symlink planted INSIDE the vendored tree pointing outside it would pass the lexical check yet be read/walked (S2). Requires an attacker who can write the vendored tree (not just claim JSON), so defense-in-depth. Affects `resolveInTree`/`resolveScope`/`countMatchingLines` in every game's checker. *Found by Reviewer during code review — fleet hardening.*
- **Improvement** (non-blocking): `new RegExp(ct.pattern)` on committed-JSON count patterns has no complexity/timeout guard (S3, ReDoS on trusted input only). Retired for ml1-1 if the counts machinery is removed per the Dev-deviation flag; otherwise a fleet-wide note. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **TEA (red) — Purity gate is ARMED-DORMANT, not "non-empty core".** Centipede's `cp1-1` purity test asserts `coreFiles.length > 0` (its GREEN created a core skeleton). Millipede's `src/core/` is **ml3's** deliverable, so copying that assertion would keep ml1-1 RED forever. **Decision:** the scanner's teeth are the fixture self-tests (they mutation-test the scanner directly, lang-review #18); the real-tree `it.each(coreFiles)` sweep ships armed and dormant, auto-activating when ml3 lands the first core module. **Why:** the story is "gate before constants" — the guard is committed before the sim it guards. **Dev:** do NOT add a src/core skeleton to satisfy a non-empty assertion; there isn't one.
  → ✓ ACCEPTED by Reviewer: sound. src/core is ml3's deliverable; armed-dormant `it.each(coreFiles)` + fixture-teeth is the correct shape. (But the fixture battery is INCOMPLETE — see [RULE] R2 — and one doc-test in it is tautological — R5.)
- **TEA (red) — Coverage sweep is green-on-empty-dossier, teeth via inline fixtures.** The dossier (`brief.md`/`glossary.md`/…) is built by ml1-2/3/4, so `DOSSIER_FILES` starts **empty** and the real-dossier gate `uncoveredCitations(loadClaims())` passes on zero enrolled files. **Decision:** the sweep's non-vacuity is proven by INLINE markdown fixtures in the AC-2 block (extract → detect-uncovered → covered → malformed-reported), which need no real dossier. **Why:** a coverage sweep over an empty set is vacuously green (lang-review #18); the fixtures make the mechanism provably able to distinguish covered from not. **Dev:** port `dossier-sweep.ts` with `DOSSIER_FILES = []`; ml1-2 enrolls `brief.md`. The `DOSSIER_FILES starts empty` test asserts it is an ARRAY (not that it is empty), so ml1-2 enrolling a file does not redden ml1-1's suite.
  → ✗ FLAGGED by Reviewer: the DECISION (green-on-empty + inline fixture teeth) is ACCEPTED and correct, but this last sentence is FALSE. The test also asserts `allProseCitations().length).toBe(0)` (citations.test.ts:476), which DOES redden the moment ml1-2 enrols a citation-bearing brief.md — so ml1-2 will be forced to edit ml1-1's test after all. See finding [SEC/RULE-adjacent] M1. Relax the `.toBe(0)` to keep only the ARRAY assertion, or correct this claim.
- **TEA (red) — single revision, not centipede's layered tree.** Millipede is pinned at one historicalsource revision (`29f3e05`), so the ported checker uses `REVISION_SUBDIRS = ['']` and the test's `vendoredLine()` resolves at the tree root only — centipede's `revision.v4`/`revision.v2` layering and its path-qualified-rev-2 tests are dropped. Traversal-containment is KEPT (the `ESC-1` test), since a cited `../` path must still be refused.
  → ✗ FLAGGED by Reviewer: KEEPING containment is correct, but the ported guard has a proven HOLE the port inherited from centipede — a BARE `..` (no slash) skips the containment branch entirely and CRASHES the checker (see [SEC] finding S1, HIGH, reproduced). The `ESC-1` test only covers the slashed `../SECRET.MAC` form; the bare-`..` case and the accept-side "`..` normalises back inside" case (R3) are both untested.
- **TEA (red rework, round 2) — R5 resolved by REPLACE, not DELETE (empty-suite trap).** Reviewer R5 offered "delete the tautological `Array.isArray(coreFiles)` OR replace with a meaningful assertion." Deleting it outright was tried and REVERTED: it left the `src/core/ purity sweep` describe with only the dormant `it.each(coreFiles)` (empty today), which vitest reports as a hard failure — "No test found in suite". **Decision:** replaced it with a test that pins the scanner's LOCATED form (`scan(src, file)` → `rule (file:line)`) — the exact path the `it.each(coreFiles)` sweep uses, which `loadViolations()` strips and the fixture self-tests therefore never exercise. **Why:** it is non-tautological (a broken located-form would fail it), keeps the describe non-empty while core is dormant, and closes a real coverage gap rather than just removing a bad assertion. **Dev:** nothing to do — this is a test-file change.
- **TEA (red rework, round 2) — R1 routed to REMOVAL, so NO counts test authored.** Reviewer R1 gave Dev the choice "port a counts test OR remove the `counts` machinery (removal is the more minimalist fix, and also retires the untested `resolveScope`/`new RegExp(pattern)` ReDoS surface S3)." **Decision:** TEA authored NO counts test — signalling REMOVAL is the chosen resolution (minimalist discipline + the Dev-deviation flag above already conceded the machinery is unused by any ml1-1 test). **Why:** adding a counts test would ratify keeping ~40 lines of guard code ml1-1 never needs; ml1-2 re-adds `counts` + its own test when it first needs a tally. **Dev (GREEN):** REMOVE the `counts` machinery from `check-citations.mjs` (`countSchemaError`/`resolveScope`/`countMatchingLines` + the `'counts' in c` block in `checkClaims`) and the `CountAssertion`/`counts` fields from `check-citations.d.mts`. No ml1-1 test sends a `counts` field, so removal keeps the suite green; the local `Claim.counts?: unknown` shim in the test stays (documents the field ml1-2 will add).

### Dev (implementation)
- **Ported the full `counts` assertion machinery though no ml1-1 test exercises it**
  - Spec source: session AC-1 / context-story-ml1-1.md — "port centipede tools/audit/check-citations.mjs to a single-sided millipede checker"
  - Spec text: "port centipede … check-citations.mjs … (drop the ours side)"
  - Implementation: `check-citations.mjs` retains `countSchemaError` / `resolveScope` / `countMatchingLines` and the `counts?: CountAssertion[]` field from the `.d.mts`, even though the ml1-1 suite only tests schema/byte/resolution/containment (no count assertion).
  - Rationale: the AC is to PORT centipede's checker; the port is faithful and cohesive, and later ml* stories (ml1-2's brief.md tallies, e.g. the 16-entry PTS table) will use `counts`. Removing a whole feature from a "port" would be a larger, riskier change than keeping it, and the `.d.mts` contract centipede ships declares it.
  - Severity: minor
  - Forward impact: minor — ml1-2+ get count-assertion support for free; no other story assumes its absence. The feature is schema-checked always and re-derived only with the vendored tree, so it cannot affect the CI path.
  → ✗ FLAGGED by Reviewer: keeping the ported `counts` machinery ships ~40 lines of LIVE, UNTESTED code (centipede's `count-assertions.test.ts` was NOT ported) — a rule #18 violation ([RULE] R1). "Faithful port" applies to the code AND its guarding tests; porting one without the other is the gap. Resolve by EITHER porting a counts test OR removing the machinery until ml1-2 first needs a tally (removal is the more minimalist fix and also retires the untested `resolveScope`/`new RegExp(pattern)` ReDoS surface, S3). The `.d.mts:47` "one error per claim" doc is also inaccurate vs the per-assertion push (R4).
  → ✓ RESOLVED (GREEN rework, commit `0b0005df`): the `counts` machinery was REMOVED, not tested — `countSchemaError`/`resolveScope`/`countMatchingLines` + the `'counts' in c` block deleted from `check-citations.mjs`, and `CountAssertion` + the `counts?` field deleted from `check-citations.d.mts`. This retires R1, S3 (the `new RegExp(pattern)` ReDoS surface), and the untested `resolveScope` in one move. Net −114 lines. ml1-2 re-adds `counts` + its guarding test on first need. The test's local `Claim.counts?: unknown` shim is retained (harmless; documents the field ml1-2 will add). The prior "keep the machinery" deviation above is thereby withdrawn.
- **S1 fix also closes the sibling `.` / any-directory citation, beyond the reported bare-`..`**
  - Spec source: Reviewer S1 (blocking) + TEA `BARE-1` test (RED rework)
  - Spec text: "Apply the `resolvedRoot`-anchored containment check UNCONDITIONALLY (mirror `resolveScope`), and/or reject `file === '.'|'..'` before the loop."
  - Implementation: `resolveInTree` now runs the containment gate on EVERY candidate (both branches) AND requires `statSync(p).isFile()`. This refuses a bare `..` (escapes → not contained) and ALSO a bare `.` (resolves to the tree root, which IS contained but is a DIRECTORY → the is-file check refuses it). A `.` citation would have crashed with the identical EISDIR, but TEA's `BARE-1` only probes `..`.
  - Rationale: the is-file guard closes the whole `readFileSync`-on-a-directory crash class in one predicate rather than special-casing two string literals; leaving `.` as a known-but-untested crash while fixing `..` would ship the same defect one keystroke away.
  - Severity: minor (strictly safer — no citation legitimately targets a directory)
  - Forward impact: none — every real citation targets a file; the fleet-wide sibling checkers (Delivery Findings, S1) still carry the bare-`..` hole and want the same fix.

### Reviewer (audit)
- **No UNDOCUMENTED deviations found.** TEA and Dev logged all four material design choices. The gaps are within the documented decisions (incomplete fixture batteries, one false sub-claim, one inherited crash), captured as findings S1/R1–R5/M1 above — not silent divergences.

## Sm Assessment

Setup complete for ml1-1 — the millipede citation gate + `src/core` purity scan, gate-first (TDD).

**Premise verified against the current tree (empty epic description / null ACs, so ACs were derived from the title's three named deliverables):**
- Port source is real: `plugins/centipede/tools/audit/check-citations.mjs` (~12KB) is already the single-sided version — its own header states it is "tempest/tools/audit ported with the `ours` side dropped." So centipede, not tempest, is the canonical reference; "drop the ours side" is already done there.
- `plugins/centipede/tests/audit/citations.test.ts` and the purity trio (`purity.test.ts`, `purity-scanner.test.ts`, `tests/helpers/purity-scanner.ts`) exist as the patterns to mirror.
- `plugins/millipede/` is scaffolded (ml1-5) with no `src/core/`, no purity test, no citation gate — this genuinely is the first-gate story, landing before any constant is transcribed (the rb4/cp1 lesson: a numeric story that lands before the gate re-bakes its own misreadings and self-confirms).

**Contention:** none. `git branch -r | grep ml1-1` was empty at setup; no sibling session for ml1-1 in any checkout (a-1 on sw11-2, a-3 on sw11-1). Claim branch now pushed and story stamped `in_progress`, so the claim is visible.

**TDD split carried into the context (from centipede's own header ruling):** claims are DATA, the checker is CODE. RED/TEA authors the `citations.test.ts` suite + purity test + inline seed fixtures and must go RED on an empty/missing claims dir; GREEN/Dev authors `check-citations.mjs` + the `docs/rom-study/claims/` plumbing. One open design choice deliberately left for TEA: whether the purity scan runs green-on-empty `src/core/` or needs a placeholder tree — flagged in Background, not pre-decided.

Handing off to Leeloo (TEA) for RED.

## Tea Assessment

RED landed for ml1-1 — two failing suites for the millipede citation gate + `src/core` purity scan, gate-first before any constant.

**Files authored (RED, commit `65c9b65e` on `feat/ml1-1-citation-gate-purity`):**
- `plugins/millipede/tests/purity.test.ts` — core/shell boundary scanner suite: fixture self-tests (the teeth) for every ban, incl. the four the story names by hand (fetch / canvas / Date / Math.random), plus the armed-dormant real-tree sweep.
- `plugins/millipede/tests/audit/citations.test.ts` — the checker + coverage-sweep suite: schema teeth (run everywhere), graceful degradation (AC-3/AC-5), byte-for-byte + drift (AC-1, skipped on CI), file resolution (AC-4), traversal containment, and the AC-2 coverage sweep proven non-vacuous by inline fixtures.

**RED is clean and legible (verified by direct run, not a confabulating runner):**
- `npx vitest run --project millipede` → 30 failed | 11 passed. Every failure carries a self-describing "not built yet — GREEN ports X from centipede" message (loadChecker/loadSweep/loadScanner), never a cryptic collect crash.
- The 11 passes are 10 pre-existing scaffold tests + **one intentional** doc test ("the real-tree sweep is ARMED", asserts `Array.isArray(coreFiles)` — independent of the scanner). **No feature-bearing test passes vacuously.**
- `npm run lint` → exactly **3** millipede errors, all `TS2307 Cannot find module` for the three modules Dev ports; **zero** other errors. GREEN clears both vitest and tsc by creating those three files.

**What Dev (GREEN) builds — three ports of proven centipede code, no invention:**
1. `plugins/millipede/tools/audit/check-citations.mjs` **+ `.d.mts`** — single-sided checker from `plugins/centipede/tools/audit/check-citations.mjs`, `REVISION_SUBDIRS = ['']`, `vendoredRoot → reference/original-source/millipede` (env `MILLIPEDE_SOURCE_DIR`), exporting `checkClaims(claims, {vendoredRoot})` and the `Claim` type. Keep the containment check (the `ESC-1` test); drop centipede's revision.v4/v2 layering.
2. `plugins/millipede/tests/audit/dossier-sweep.ts` — coverage sweep from centipede's, `DOSSIER_FILES = []`, grammar accepting `.MAC/.DOC/.MAP/.LNK`. Exports used by the suite: `DOSSIER_FILES, scanProseCitations, extractProseCitations, uncoveredCitations, coveredBy, allProseCitations, loadClaims`.
3. `plugins/millipede/tests/helpers/purity-scanner.ts` — the TS-compiler-API scanner from `plugins/centipede/tests/helpers/purity-scanner.ts`, exporting `violations(src, file?)`. Its ban list already covers fetch + HTMLCanvasElement + the clock/entropy/global surface; no widening needed.

See **Design Deviations** above for the two rulings that shape the RED (armed-dormant purity, green-on-empty coverage) — Dev must NOT "fix" them by adding a src/core skeleton or asserting DOSSIER_FILES empty.

**Rule Coverage (lang-review/typescript.md — applicable checks for this test-infra story):**
- **#18 (test apparatus that fails by passing / helper reimplements an algorithm → mutation-test the helper):** the purity scanner IS such a helper; its fixture self-tests feed it code and assert violations, exercising it directly. The coverage sweep's inline fixtures prove it distinguishes covered from uncovered from malformed.
- **#15 (guards must be mutation-tested; a source-text match on a token ≠ the claim):** the byte-teeth read the REAL vendored line via `vendoredLine()` and require a drift (altered verbatim, off-by-one, dropped leading space) to redden — not a token grep.
- **#26 (assertions all-local-to-the-test):** avoided — every coverage assertion feeds fixture markdown through the sweep and asserts on the sweep's output; the one confused `['__inline__']` draft was removed.
- **Test quality (#8) / no vacuous assertions:** confirmed — no `assert(true)`, no `let _ =`; the only passing new test is an intentional, labelled documentation assertion.
- Not applicable: React/JSX (#6), enums (#3), async patterns (#7), input-validation branded types (#10) — this story ships a checker + scanner + sweep, no runtime feature surface.

Handing off to Korben Dallas (Dev) for GREEN.

## Dev Assessment

GREEN landed for ml1-1 — the RED suites pass with three faithful ports from centipede, no invention. Commit `fb466ead` on `feat/ml1-1-citation-gate-purity`.

**Files created (GREEN):**
- `plugins/millipede/tools/audit/check-citations.mjs` + `check-citations.d.mts` — single-sided checker. `REVISION_SUBDIRS = ['']` (single revision 29f3e05); `vendoredRoot` defaults to `reference/original-source/millipede` (env `MILLIPEDE_SOURCE_DIR`); keeps the traversal-containment guard (`resolveInTree`/`resolveScope`); drops centipede's revision.v4/v2 layering and its path-qualified-rev-2 branch. Exports `checkClaims(claims, {vendoredRoot})` + the `Claim`/`CountAssertion`/`CheckOpts` types.
- `plugins/millipede/tests/audit/dossier-sweep.ts` — coverage sweep. `DOSSIER_FILES = []` (ml1-2 enrols brief.md); grammar `/\`([\w./]+\.(?:MAC|DOC|MAP|LNK)):([\d,\-]+)\`/g`; malformed linespecs (reversed/triple-dash) reported not dropped. Exports the whole sweep surface the suite uses.
- `plugins/millipede/tests/helpers/purity-scanner.ts` — the TS-compiler-API core/shell scanner, ban set unchanged from centipede (covers fetch / HTMLCanvasElement / Date.now / new Date / Math.random / window|document|navigator.* / localStorage / globalThis / setTimeout|setInterval|rAF / dynamic import() / eval / new Function / Date|Math aliasing / import-from-shell). The anti-fallback rule is preserved (unparseable source is REPORTED, never certified).

**Verification (run this session, evidence not assertion):**
- `npx vitest run --project millipede` → **41 passed** (0 failed). The 8 byte-teeth ran here because the vendored tree is present.
- `npm run lint` (repo-wide `tsc --noEmit`) → **exit 0, 0 errors**. The three RED-phase `TS2307`s are cleared.
- AC-5 (CI path): `MILLIPEDE_SOURCE_DIR=/nonexistent npx vitest run --project millipede` → **33 passed | 8 skipped**, suite green — the `describe.skipIf(!vendoredAvailable)` byte blocks skip without the reference tree.
- CLI: `node plugins/millipede/tools/audit/check-citations.mjs` → "checked 0 claim(s) / all claims verified" (no dossier yet; schema-only over zero claims).
- Full cabinet regression: `npx vitest run` → **972 files / 14703 tests passed** (1 todo). No other game affected — the change is additive under `plugins/millipede/`.

**TEA's two rulings honoured, NOT "fixed":** no `src/core` skeleton was added (purity sweep stays armed-dormant); `DOSSIER_FILES` is empty and the suite asserts it is an ARRAY, not empty, so ml1-2 enrolling brief.md will not redden ml1-1. See Design Deviations → Dev for the one deviation logged (kept the ported `counts` machinery unused by ml1-1's tests).

Handing off to Jean-Baptiste Emanuel Zorg (Reviewer).

## Round 1 — Subagent Results (superseded)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 41/41 green, lint exit 0, CI-path 33/8, CLI verified. Confirms Dev's evidence. |
| 2 | reviewer-edge-hunter | Yes | Skipped (disabled) | N/A | Disabled via settings — hand-assessed: enumerated checker boundary inputs (bare `..`, absolute, prefix-collision, EOF line, empty claims). The bare-`..` case IS S1. |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped (disabled) | N/A | Disabled — hand-assessed: no swallowed errors (regex-catch pushes, not swallows). The S1 EISDIR is an UNHANDLED (loud crash), not silent. |
| 4 | reviewer-test-analyzer | Yes | Skipped (disabled) | N/A | Disabled — hand-assessed: overlaps rule-checker R1/R2/R3 (untested mechanisms) + R5 (tautology). Confirmed. |
| 5 | reviewer-comment-analyzer | Yes | Skipped (disabled) | N/A | Disabled — hand-assessed: R4 (.d.mts "one error per claim" mismatch) + TEA's containment-comment overclaim (part of S1). Confirmed. |
| 6 | reviewer-type-design | Yes | Skipped (disabled) | N/A | Disabled — hand-assessed: R6 (claims param not `readonly`); the `as unknown as` casts are legitimate malformed-fixture construction. |
| 7 | reviewer-security | Yes | findings | 3 (1 high, 1 med, 1 low) | S1 confirmed HIGH (reproduced crash), S2 med (defer, fleet), S3 low (defer). |
| 8 | reviewer-simplifier | Yes | Skipped (disabled) | N/A | Disabled — hand-assessed: the unused-in-ml1-1 `counts` machinery is a simplification target (remove) — same as R1's resolution. |
| 9 | reviewer-rule-checker | Yes | findings | 6 (5 high-conf, 1 minor) | R1,R2,R3,R5 confirmed (verified vs files); R4,R6 confirmed minor/inherited. |

**All received:** Yes (3 enabled ran, 6 disabled pre-filled and hand-assessed)
**Total findings:** 3 confirmed blocking-round (S1 High + R1/R2/R3 Medium bundled), 5 confirmed low/minor (R4, R5, R6, S2, S3, M1), 0 dismissed, 2 deferred to fleet (S2, S3)

## Round 1 — Reviewer Verdict (REJECTED, superseded by the re-review below)

**Verdict:** REJECTED

I know this music. Zero defects — and this gate has a defect that crashes, plus test batteries left behind at the border. The DESIGN is right (three faithful ports, the two green-on-empty rulings are sound, the CI-skip path works, the coverage fixtures that exist are non-vacuous). But a citation gate is a security boundary that every later `ml*` story will trust blindly, and this one ships a proven containment bypass, a false invariant comment, and ~600 lines of ported guard-code whose guarding tests were not ported. Rejecting.

**Data flow traced:** `claim.source.file` (from committed `claims/*.json`) → `resolveInTree(vendoredRoot, file)` → `lineAt(path)` → `readFileSync`. Safe for the slashed/absolute branch (containment holds — I reproduced escape/absolute/prefix-collision refusals). NOT safe for a bare `..`: it skips containment and reaches `readFileSync` on a directory → uncaught crash. That is the break.

### Blocking findings

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [SEC] | A bare `source.file: ".."` (no slash) bypasses `resolveInTree`'s containment check entirely (it only guards the `isAbsolute\|\|includes('/')` branch), resolves to `dirname(vendoredRoot)` OUTSIDE the tree, and CRASHES the checker with an uncaught `EISDIR` instead of returning an error. Violates the guard's own comment ("an escape is refused"). Reproduced by execution. | `check-citations.mjs:91-105` (resolveInTree bare-name loop) | Apply the `resolvedRoot`-anchored containment check UNCONDITIONALLY (mirror `resolveScope`), and/or reject `file === '.'\|'..'` before the loop. Add a RED test for the bare-`..` case. |

### Non-blocking findings bundled into this rework round (cheap, foundational, fix now)

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| [MEDIUM] [RULE] R2 | The purity scanner bans `globalThis`/`eval()`/`new Function()`/dynamic `import()`/`Date`&`Math` aliasing/destructuring, has an anti-fallback rule and dedup guarantee — ALL shipped LIVE and UNTESTED. Centipede's `purity-scanner.test.ts` (366 lines) + the "cp1-2 hardening bans" `describe` block (which centipede's own `purity.test.ts` carried) were not ported. #18. | `purity.test.ts` | Restore the hardening-ban `describe` block into `purity.test.ts` (it is part of "the src/core purity scan" the story names). |
| [MEDIUM] [RULE] R1 | The `counts` machinery ships live and untested (centipede's `count-assertions.test.ts`, 260 lines, not ported). #18. | `check-citations.mjs:107-248`, `.d.mts:41-75` | Port a counts test, OR remove the `counts` machinery (minimalist; ml1-2 re-adds with its test). See Dev-deviation FLAG. |
| [MEDIUM] [RULE] R3 | Containment tests only cover the escape branch (`ESC-1`); the documented accept-branch ("`..` normalises back inside → resolves") is untested. The S1 fix touches this exact code. | `citations.test.ts:389-417` | Add a "`..` normalises back inside the tree still resolves" test alongside the bare-`..` and escape tests. |
| [LOW] [RULE] R5 | `expect(Array.isArray(coreFiles)).toBe(true)` is tautological — `coreFiles` is array-typed on both ternary branches; no production change makes it fail. #26. | `purity.test.ts:143` | Delete it (the `it.each(coreFiles)` block is the real arming; the fixtures are the teeth), or replace with a meaningful assertion. |
| [LOW] [RULE-adj] M1 | `expect(allProseCitations().length).toBe(0)` reddens when ml1-2 enrols a citation-bearing `brief.md`, contradicting TEA-deviation #2's "does not redden ml1-1's suite." | `citations.test.ts:476` | Drop the `.toBe(0)`; keep only the `Array.isArray(DOSSIER_FILES)` assertion. |

### Deferred (fleet-wide follow-ups — recorded in Delivery Findings, NOT blocking ml1-1)

- [MEDIUM] [SEC] S2 — lexical `resolve()` not `realpathSync`; symlink-in-tree escape. Requires tree-write access. Inherited fleet-wide.
- [LOW] [SEC] S3 — `new RegExp(ct.pattern)` ReDoS on trusted committed JSON. Retired if counts is removed.
- [LOW] [DOC] R4 — `.d.mts:47` "one error, per claim" vs the per-count-assertion push. Inherited. **→ FIXED INLINE by Reviewer** (per user direction: comment-only fixes done in place, commit `pending`). Comment now reads "Each mismatched entry is one error … not one per claim."
- [LOW] [TYPE] R6 — `checkClaims(claims: Claim[])` never mutates `claims` but is not `readonly`. Inherited.

### Disabled-subagent domain coverage (hand-assessed — the 6 disabled specialists)
- [EDGE] (edge-hunter disabled) — I enumerated the checker's boundary inputs; the bare-`..` degenerate is exactly S1 (the blocking crash). EOF-line, absolute, prefix-collision all handled (verified).
- [SILENT] (silent-failure-hunter disabled) — no swallowed errors; the regex-compile `try/catch` PUSHES an error string. The one unhandled path is the S1 EISDIR, which is a LOUD crash, not a silent swallow.
- [TEST] (test-analyzer disabled) — overlaps rule-checker: the untested mechanisms (R1 counts, R2 scanner bans, R3 accept-branch) and the tautology (R5) are the test-quality findings; confirmed against the files.
- [SIMPLE] (simplifier disabled) — the `counts` machinery is complexity unused by anything ml1-1 ships; removing it (R1's resolution) is the simplification and also retires the S3 ReDoS surface.

### Rule Compliance (lang-review/typescript.md + javascript.md — applicable checks enumerated)

- **#15 (guard mutation-tested / anchors the claim not a token):** PASS for the citation checker's schema/byte/escape teeth (they read the REAL vendored line and require a drift to redden). VIOLATION for R1/R3 (untested count + inside-branch paths).
- **#18 (test apparatus fails by passing; a helper reimplementing an algorithm is untested code):** The crux. The coverage-sweep fixtures that exist ARE non-vacuous (distinct `MLDEF.MAC:2` vs `:398` values distinguish covered/uncovered — verified). But two whole mechanisms (counts R1, the scanner's wider ban surface R2) have NO fixture at all — the more severe end of #18. VIOLATION.
- **#17 (a comment asserting a mechanism nobody re-ran):** VIOLATION — the `resolveInTree` comment "an escape is refused, even if the target file is real" is false for bare `..` (S1); `.d.mts:47` "one error per claim" is false vs the impl (R4).
- **#26 (assertion terms all local to the test):** VIOLATION — R5 (`Array.isArray(coreFiles)`).
- **#1 type-safety escapes:** PASS — the `as unknown as Claim` casts are deliberate malformed-fixture construction to exercise the validator, not compiler-appeasement.
- **#2 readonly params:** minor VIOLATION R6 (inherited). #4 null/undefined (`??` vs `||`): PASS. #5 modules/`.js` specifiers: PASS. #7 async/Promise (loaders typed/awaited): PASS. #10/#11 input-validation + error handling: PASS (hand-rolled validator by design; catches convert to descriptive errors — EXCEPT the S1 crash path). #20 (numbers from same-diff artifact): PASS — the port correctly DROPPED centipede's brittle citation-count floors rather than porting stale numbers. #3/#6/#9/#12/#13/#14/#16/#19/#21–#25: N/A (no enums/JSX/config/state-machine/UI/numeric-geometry/retirement in this diff).

### Five+ observations (no rubber-stamping)

1. [HIGH] [SEC] Bare-`..` containment bypass + crash — `check-citations.mjs:91-105`. Reproduced.
2. [VERIFIED] Slashed/absolute/prefix-collision containment HOLDS — evidence: my probe returned `[]` for inside, and refusal errors for `../SECRET.MAC`, an absolute sibling, and `../tree-evil/X.MAC` (the `+ sep` guard at `check-citations.mjs:96` defeats the `/root` vs `/rootother` collision). Complies with the "must not escape the tree" rule for those forms.
3. [VERIFIED] CI-skip path (AC-5) correct — evidence: `MILLIPEDE_SOURCE_DIR=/nonexistent` → 8 byte-teeth skip via `describe.skipIf(!vendoredAvailable)`, suite green (33 passed). Schema teeth still bite.
4. [VERIFIED] Coverage-sweep fixtures are non-vacuous (#18 satisfied for what's covered) — evidence: `citations.test.ts` uses distinct `MLDEF.MAC:2` (uncovered) vs `:398` (claim-covered) and asserts the sweep separates them; the reversed-range `398-2` is asserted MALFORMED, not dropped.
5. [MEDIUM] [RULE] Ported code without its ported tests — R1 (counts) + R2 (scanner hardening bans): ~600 lines of guard code shipped live with the guarding batteries left in centipede.
6. [LOW] [RULE] Tautological `Array.isArray(coreFiles)` (R5) and the brittle `.toBe(0)` (M1).

### Devil's Advocate

Argue this gate is broken. A malicious — or merely careless — author of `claims/*.json` in ml1-2 writes `"file": ".."` (a fat-fingered relative path, or a deliberate probe). The gate does not report "source not found"; it throws an uncaught `EISDIR` from `readFileSync` on a directory, aborting the entire citation check with a stack trace that names `node:fs`, not the offending claim. In CI that is a red deploy with an inscrutable cause; locally it is a developer staring at `illegal operation on a directory`. The guard's own comment swears this cannot happen — "a `..` that escapes is refused, even if the target file is real" — so the next reader trusts a false promise and does not think to check. That is the worst kind of defect: one the documentation actively hides. Now consider the confused user: they run the CLI expecting a clean pass/fail, and a single bad claim crashes the whole audit rather than listing the bad claim among others — the tool's contract (`string[]` of errors) is violated at exactly the moment it matters most. Consider the stressed filesystem / privileged attacker: a symlink dropped into the vendored tree (S2) sails past lexical containment and the checker reads whatever it points at — arbitrary file read framed as a citation. Consider config with unexpected fields: a `counts` array with a pathological regex (S3) hangs the audit with no timeout. And consider the QUIET failures: the scanner bans `eval()` and `globalThis` and `new Function()` in core, but NOTHING in millipede's suite proves those bans fire — if a future refactor of the ported scanner silently broke the `globalThis` case, every millipede core module could import the ambient global and the suite would stay green, because the only bans with teeth here are the four the story named. The gate LOOKS armed; half its barrel is empty. Each of these became a finding above. The gate's skeleton is sound; its border patrol has a hole, a lie, and unmanned posts.

**Handoff:** Back to TEA (RED rework) — the fixes are testable (a containment logic bug + missing test batteries), so a RED test for the bare-`..` case and the restored/added batteries drive the GREEN fix.
## Tea Assessment (RED rework — round 2)

Reviewer REJECTED (verdict above) and requested a RED rework; the blocking round is
predominantly missing/weak test batteries, so — with the user's explicit `/pf-tea` —
the pf `tdd` rework loop was routed to TEA (red) before Dev (green). Phase field set to
`red` by hand (see the Workflow Tracking loop-back note; `fix-phase` is forward-only).

**Files changed (RED rework, on `feat/ml1-1-citation-gate-purity`):**
- `plugins/millipede/tests/audit/citations.test.ts`
  - **S1 (the one true RED):** new `BARE-1` test in the traversal-containment describe —
    a `source.file: ".."` (no separator) must be REPORTED, never crash. It asserts
    `not.toThrow()` then `/BARE-1/`. Runs on CI (throwaway tree). **Currently RED**: the
    checker throws `EISDIR: illegal operation on a directory, read` because a bare `..`
    skips `resolveInTree`'s containment branch, resolves to `dirname(root)`, and
    `readFileSync`s a directory.
  - **R3 (accept side of the S1 fix):** new `INS-1` test — `sub/../MLDEF.MAC` normalises
    back INSIDE the tree and must still resolve + verify. Passes today; guards the S1 fix
    against over-rejecting the legitimate inside-`..`.
  - **M1:** dropped the brittle `expect(allProseCitations().length).toBe(0)`; kept only
    `expect(Array.isArray(DOSSIER_FILES)).toBe(true)` (a real cross-module contract on
    Dev's export). ml1-2 enrolling a citation-bearing `brief.md` no longer reddens ml1-1.
- `plugins/millipede/tests/purity.test.ts`
  - **R2:** restored the "hardening bans" `describe` (ported from centipede's cp1-2 block,
    async-adapted): live `globalThis` / dynamic `import()` / `eval()` / `new Function()` /
    `Date`-aliasing flag; comment/string/lookalike forms do NOT. The scanner already
    implements these (verbatim port), so the battery PASSES — that is the point (#18): the
    bans no longer ship live-and-untested.
  - **R5:** replaced the tautological `expect(Array.isArray(coreFiles)).toBe(true)` with a
    test pinning the scanner's LOCATED form (`scan(src,file)` → `rule (file:line)`) — the
    exact path the dormant `it.each(coreFiles)` sweep uses and `loadViolations()` strips.
    (Pure deletion was tried and reverted: it left an empty describe vitest fails on. See
    Design Deviations → TEA rework round 2.)

**RED is clean and legible (verified by direct run):**
- `npx vitest run --project millipede` → **1 failed | 47 passed**. The single failure is
  `BARE-1`, self-describing (`expected [Function] to not throw … 'EISDIR …' was thrown`).
  No other feature-bearing test passes vacuously; the R2 battery + R3 accept + R5 located
  form all PASS against the current scanner/checker (they close coverage gaps).
- `npm run lint` (repo-wide `tsc --noEmit`) → **exit 0, 0 errors**.

**What Dev (GREEN) does — two changes, no invention:**
1. **S1 fix** — apply the `resolvedRoot`-anchored containment in `resolveInTree`
   UNCONDITIONALLY (mirror `resolveScope`), and/or reject `file === '.'|'..'` before the
   bare-filename loop, so a bare `..` returns `undefined` → "source not found" error.
   `BARE-1` goes green; `INS-1`/`ESC-1` stay green; fix the `resolveInTree` docblock's
   now-true promise. Update the guard comment so it no longer over-claims for the branch
   that used to be skipped.
2. **R1 removal** — delete the `counts` machinery from `check-citations.mjs`
   (`countSchemaError`/`resolveScope`/`countMatchingLines` + the `'counts' in c` block) and
   the `CountAssertion`/`counts` fields from `check-citations.d.mts`. No ml1-1 test sends
   `counts`, so the suite stays green; this also retires S3 (the `new RegExp(pattern)` ReDoS
   surface) and the untested `resolveScope`. ml1-2 re-adds `counts` + its test on first need.

**Deferred, NOT this rework (already in Delivery Findings):** S2 (symlink-in-tree, needs
`realpathSync`) and R6 (`readonly` param) are fleet-wide/inherited; R4 was fixed inline by
Reviewer (commit `a090a741`).

**Rule Coverage (lang-review/typescript.md — rework-relevant checks):**
- **#18 (test apparatus that passes vacuously / a helper's algorithm untested):** the R2
  battery makes the wider scanner bans self-tested; the R5 located-form test exercises the
  sweep's unique code path. Both were the #18 gaps the Reviewer named.
- **#15 (a guard must be mutation-tested, not token-matched):** `BARE-1` requires the
  checker to actually contain the path (a token grep would not catch the crash); `INS-1`
  proves the fix does not over-reject.
- **#26 (assertions local to the test):** R5's tautology retired.

Handing off to Korben Dallas (Dev) for the GREEN fix (S1 containment + R1 removal).

## Dev Assessment (GREEN rework — round 2)

GREEN rework landed for ml1-1 — the Reviewer's blocking round is cleared. Commit
`0b0005df` on `feat/ml1-1-citation-gate-purity` (pushed).

**Files changed (2, net −114 lines):**
- `plugins/millipede/tools/audit/check-citations.mjs`
  - **S1 (HIGH) — fixed.** `resolveInTree` restructured: a single `resolveContainedFile`
    helper runs the `resolvedRoot`-anchored containment on EVERY candidate (both the
    `isAbsolute || includes('/')` branch and the bare-filename loop) and additionally
    requires `statSync(p).isFile()`. A bare `..` (escapes) and a bare `.` (resolves to the
    root directory) are now REFUSED as "source not found", never handed to `readFileSync` —
    the uncaught EISDIR crash is gone. Guard docblock rewritten to state the true behaviour.
  - **R1 (#18) — removed.** Deleted `countSchemaError`, `resolveScope`, `countMatchingLines`
    and the `'counts' in c` block. This also retires S3 (the `new RegExp(pattern)` ReDoS on
    trusted JSON) and the untested `resolveScope`. Header comment updated.
- `plugins/millipede/tools/audit/check-citations.d.mts`
  - Removed the `CountAssertion` interface and the `Claim.counts?` field; updated the schema
    summary. ml1-2 re-adds both with a guarding count-assertions test on first need.

**Verification (evidence, run this session):**
- `npx vitest run --project millipede` → **48 passed** (0 failed). `BARE-1` is green; `INS-1`
  (accept side) and `ESC-1` stay green; the R2 hardening battery + R5 located-form test pass.
- CI path: `MILLIPEDE_SOURCE_DIR=/nonexistent npx vitest run --project millipede` →
  **40 passed | 8 skipped** — the byte-teeth skip without the tree (AC-5), and the containment
  tests (S1/R3/ESC) run on their throwaway trees and pass.
- `npm run lint` (repo-wide `tsc --noEmit`) → **exit 0, 0 errors**.
- Full cabinet: `npx vitest run` → **972 files / 14710 passed** (1 todo). No other game touched.
- CLI: `node plugins/millipede/tools/audit/check-citations.mjs` → "checked 0 claim(s) / all
  claims verified".

**Deviations logged** (Design Deviations → Dev): the prior "keep the counts machinery"
deviation is withdrawn (now removed); one new minor deviation — the S1 is-file guard closes the
sibling `.`/any-directory crash beyond the reported `..`.

**Deferred (Delivery Findings, NOT this story):** S2 (symlink-in-tree → `realpathSync`) and R6
(`readonly` param) remain fleet-wide/inherited; the bare-`..` hole still exists in every other
game's ported checker (fleet hardening story).

Handing off to Jean-Baptiste Emanuel Zorg (Reviewer) for re-review.

## Subagent Results

Re-review of the rework diff (`a090a741..HEAD`: commits `fe37556b` RED, `0b0005df` GREEN, `5d38d8d5` reviewer TS-24 fix). Same toggles as round 1 (preflight / security / rule_checker enabled; six disabled → hand-assessed against the rework).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | [PRE] GREEN — millipede 48/48, CI-path 40 passed \| 8 skipped, `tsc` exit 0, CLI OK; removed symbols (`resolveScope`/`countMatchingLines`/`countSchemaError`/`CountAssertion`) leave NO orphans. |
| 2 | reviewer-edge-hunter | Yes | Skipped (disabled) | N/A | [EDGE] Hand-assessed + independently PROBED: bare `..`, bare `.`, `../SECRET`, `../../etc/passwd`, prefix-collision `../tree-evil/X`, a real inside directory — ALL refused, none crash; accept-side `sub/../MLDEF.MAC` + normal file resolve. The round-1 S1 crash is gone. |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped (disabled) | N/A | [SILENT] Hand-assessed: no swallowed errors introduced. The counts machinery (whose `try/catch` PUSHED a regex error) was DELETED wholesale, not silenced; the S1 EISDIR (a loud crash) is now a returned "not found" string. A stray `counts` field on a claim is now ignored, not errored — noted, benign (byte gate unaffected). |
| 4 | reviewer-test-analyzer | Yes | Skipped (disabled) | N/A | [TEST] Hand-assessed + MUTATION-TESTED: I broke the scanner's Date-alias report → the R2 battery reddened; I stripped the located-form suffix → the R5 replacement reddened. Both non-vacuous (#18/#26). M1's dropped assert does not weaken AC-2 (the uncovered/covered/malformed fixture teeth are untouched). |
| 5 | reviewer-comment-analyzer | Yes | Skipped (disabled) | N/A | [DOC] Hand-assessed: the `resolveInTree` docblock's dual `..`/`.` claim is now TRUE (verified by execution); the R4 `.d.mts` doc was fixed in round 1; the test-shim "these mirror it" comment was made true again by the TS-24 fix. Forward-pointing `counts` comments are accurate (ml1-2). |
| 6 | reviewer-type-design | Yes | Skipped (disabled) | N/A | [TYPE] Hand-assessed: no new casts; `DOSSIER_FILES` stays `readonly string[]`; the local `Claim` shim now matches the real `.d.mts` (TS-24 fixed). R6 (`checkClaims(claims)` not `readonly`) remains inherited/fleet-deferred — unchanged by this diff. |
| 7 | reviewer-security | Yes | clean | none | [SEC] 12 traversal probes executed against the real `resolveInTree` — all refused, none crash; accept-side resolves. S1 genuinely fixed (containment on EVERY candidate + `isFile`). No new issue. S2 (symlink-in-tree via lexical `resolve()`) confirmed still present — KNOWN, deferred, fleet-wide; not blocking. |
| 8 | reviewer-simplifier | Yes | Skipped (disabled) | N/A | [SIMPLE] Hand-assessed: the rework is net −114 lines (counts removal) and the two containment branches were folded into one `resolveContainedFile` helper — strictly simpler, not more complex. No dead code introduced. |
| 9 | reviewer-rule-checker | Yes | findings | 1 (TS-24/TS-8, low-med) | [RULE] Verified R1/R2/R3/R5/M1 all genuinely resolved (not relabelled), each cross-checked against the files; found ONE new stale-artifact: the test's local `Claim` shim still carried `counts?: unknown` after R1. **Resolved inline** (commit `5d38d8d5`) — dead field deleted, "mirrors it" comment made true. |

**All received:** Yes (3 enabled ran, 6 disabled pre-filled and hand-assessed; every hand-assessment backed by my own execution/mutation, not inference)
**Total findings:** 1 confirmed (TS-24 stale test-shim field) — FIXED inline this round. 0 blocking remain. All round-1 blocking findings (S1, R1, R2, R3, R5, M1) verified resolved. Deferred/inherited (unchanged, fleet): S2, R6.

## Reviewer Assessment

**Verdict:** APPROVED

The rework closes the round-1 rejection cleanly, and I verified each fix by execution rather than by reading the diff. The one new finding the rule-checker surfaced (a stale `counts?` field in the test's `Claim` shim) was a real latent trap — the exact "retirement applied where named, stale copy one file over" class this whole story is about — and it is fixed inline (commit `5d38d8d5`). Nothing blocking remains. The two long-standing items (S2 symlink-in-tree, R6 readonly param) are inherited, fleet-wide, and were explicitly deferred in round 1; this diff neither touches nor worsens them.

**Data flow re-traced (the S1 break):** `claim.source.file` (committed `claims/*.json`) → `resolveInTree(vendoredRoot, file)` → `lineAt(path)` → `readFileSync`. Round 1: a bare `..`/`.` skipped containment, resolved to `dirname(root)`/root (a directory), and crashed `readFileSync` with an uncaught EISDIR. Now: `resolveInTree` runs one `resolveContainedFile` gate on EVERY candidate — `resolve()` + `startsWith(resolvedRoot + sep)` containment AND `statSync(p).isFile()` — so every escape and every directory citation returns `undefined` → a reported "source file … not found", never a read. Reproduced the pre-fix crash and the post-fix refusal directly.

### Blocking findings

None. All resolved.

### Round-1 findings — verified resolved this round

| Finding | Round-1 severity | Resolution | How I verified (evidence, not the diff) |
|---------|------------------|-----------|------------------------------------------|
| [SEC] S1 — bare-`..` containment bypass + EISDIR crash | HIGH | `resolveInTree` runs containment + `isFile` on every candidate | 12-probe script against the real `checkClaims`: `..`, `.`, `../SECRET`, `../../etc/passwd`, `../tree-evil/X` (prefix-collision), a real inside dir → all **refused, no throw**; `sub/../MLDEF.MAC` + normal file → resolve. Security subagent reproduced the same 12/0. |
| [RULE] R1 — `counts` machinery live + untested (#18) | MEDIUM | Machinery REMOVED (checker + `.d.mts`), not tested | `grep` finds zero USES of `counts`/`CountAssertion`/removed helpers in millipede (only forward-pointing comments); nothing outside millipede imports the checker (centipede's own count test uses centipede's own module); suite still green. Retires S3 (ReDoS) too. |
| [RULE] R2 — hardening bans live + untested (#18) | MEDIUM | Battery restored into `purity.test.ts` | **Mutation-tested:** disabled the scanner's Date-alias report → the R2 "Date ALIASING" test went RED; reverted → green. Non-vacuous. |
| [RULE] R3 — containment accept-branch untested (#15) | MEDIUM | `INS-1` added | `sub/../MLDEF.MAC` verified (by `path.resolve`) to normalise back inside and byte-verify; exercises the real accept branch. |
| [RULE] R5 — tautological `Array.isArray(coreFiles)` (#26) | LOW | Replaced with a located-form test | **Mutation-tested:** stripped the `(file:line)` suffix in the scanner → the R5 test went RED; reverted → green. Non-tautological, and it keeps the describe non-empty (a bare deletion left an empty suite vitest fails on — the replacement is the correct fix). |
| [RULE-adj] M1 — brittle `allProseCitations().toBe(0)` | LOW | Dropped; kept `Array.isArray(DOSSIER_FILES)` | The AC-2 teeth (`extractProseCitations`/`coveredBy`/uncovered-detection/malformed-reporting + the real-dossier `uncoveredCitations` gate) are untouched — coverage not weakened; ml1-2 enrolling `brief.md` no longer reddens ml1-1. |

### Finding resolved inline this round

| Severity | Issue | Location | Resolution |
|----------|-------|----------|-----------|
| [RULE] [TYPE] TS-24/TS-8 (low-med) | The test's local `Claim` shim still declared `counts?: unknown` after R1 removed `counts` from the real `.d.mts` — a false "mirrors it" comment and a latent trap (a future fixture could write `counts: […]` with no type error and silently test nothing). | `citations.test.ts:48` | **FIXED** (commit `5d38d8d5`): dead field deleted, comment corrected. tsc exit 0, 48/48 green. No test uses `counts`, so no behavioural change. |

### Deferred (fleet-wide/inherited — unchanged by this diff, NOT blocking)

- [SEC] S2 — containment is lexical `resolve()`, not `realpathSync`; a symlink planted INSIDE the tree pointing out passes the lexical check. Requires tree-write access (defence-in-depth). Present in every game's checker. Confirmed still reproducible; deferred to a fleet hardening story.
- [TYPE] R6 — `checkClaims(claims: Claim[])` never mutates `claims` but isn't `readonly`. Inherited, fleet-wide.
- The S1 bare-`..` hole itself still exists IDENTICALLY in every other game's ported checker — fleet hardening story (Delivery Findings).

### Rule Compliance (lang-review typescript.md + javascript.md — rework-relevant checks)

- **#15 (guard mutation-tested / anchors the claim not a token):** PASS. S1 `BARE-1` is bidirectionally discriminating — reconstructed the pre-fix `resolveInTree` (throws EISDIR) vs the shipped one (returns "not found"); `INS-1` exercises the real accept branch by path normalisation, not a token match.
- **#18 (test apparatus fails by passing; a helper reimplementing an algorithm):** PASS. Both restored batteries were mutation-tested to red by me (Date-alias ban; located-form suffix). They exercise the REAL production scanner, with multiple distinct fixtures per rule.
- **#26 (assertion terms all local to the test):** PASS. The R5 tautology is gone; the replacement asserts on production `scan()` output. M1's remaining `Array.isArray(DOSSIER_FILES)` reads a production export (weak but non-vacuous — catches an `any`-escape lie about the export type).
- **#11 (path traversal, CWE-22):** PASS and HARDENED — every candidate contained + `isFile`, `+ sep` defeats prefix-collision. **#7 (ReDoS):** improved — the only `new RegExp(pattern)` was in the deleted counts path.
- **#1 type-safety escapes / #2 readonly / #5 module specifiers / #4 null-handling:** PASS for the diff (Claim shim now matches the real type after TS-24; `.mjs`/`.js` specifiers intact). #24 (retirement applied only where named): was the ONE violation — now fixed.
- N/A to this diff: #3 enums, #6 JSX, #14/#19/#20/#21/#22/#23/#25 (state-machine/population-filter/same-diff-artifact/geometry/NaN/mutant-record/whole-file-scope).

### Five+ observations (no rubber-stamping)

1. [SEC] [VERIFIED] S1 fixed — 12/12 traversal probes refused, no crash; pre-fix crash reproduced, post-fix refusal reproduced. Evidence: my probe script + the security subagent's independent 12/0.
2. [RULE] [VERIFIED] R2 battery has real teeth — mutating the Date-alias report reddens it (I ran the mutant and reverted).
3. [RULE] [VERIFIED] R5 replacement has real teeth AND fixes the empty-suite trap — mutating the located suffix reddens it; the describe is non-empty (48 passing, not 47+empty).
4. [RULE] [VERIFIED] R1 removal is complete and safe — zero orphaned symbols (preflight), zero external importers of millipede's checker (grep), suite green; retires S3.
5. [RULE] TS-24 — the one new stale artifact (a `counts?` field the retirement missed one file over) — caught by the rule-checker, fixed inline. This is the story's own thesis turned on itself, and it's now clean.
6. [TEST] [VERIFIED] M1 doesn't weaken AC-2 — the coverage teeth are the sibling fixture tests, untouched.
7. [PRE] [VERIFIED] Full cabinet unaffected — 972 files / 14710 passed; the change is additive/internal under `plugins/millipede/`.

### Devil's Advocate

Argue this should still be rejected. The strongest case is S2: the checker still trusts a symlink planted inside the vendored tree, so an attacker who can write the tree gets arbitrary file read framed as a citation — and I am approving with that hole open. But the threat model is explicit: claims are the untrusted input (committed JSON), and the vendored tree is trusted build infrastructure; an attacker who can write the tree has already lost the game, and the fix (`realpathSync`) belongs fleet-wide, not bolted onto one game mid-rework. Next: the `counts` removal means a claim carrying a stray `counts` field is now silently ignored rather than schema-rejected — could a future author think their tally is being checked when it isn't? Possibly — but no claim uses `counts` today, the module header and `.d.mts` both say it's not ported, and the very type shim that would have let a fixture write it was just deleted (TS-24), so the trap is closed at the type level. Finally: R2/R5 are tests that PASS, not RED — did I approve green-on-arrival coverage that proves nothing? No — I mutation-tested both to red myself; a passing test I have personally broken and un-broken is a tested test. The gate's barrel, half-empty in round 1, is now loaded and I pulled each trigger.

### Handoff

**To SM (finish).** All blocking findings resolved and verified by execution; the one new finding fixed inline. Branch `feat/ml1-1-citation-gate-purity` pushed (tip `5d38d8d5`). S2/R6 and the fleet-wide bare-`..` hole remain as Delivery Findings for a hardening story — not blockers for ml1-1.
