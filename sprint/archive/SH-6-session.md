---
story_id: "SH-6"
jira_key: ""
epic: "SH"
workflow: "tdd"
---
# Story SH-6: Battlezone — add high-score capture + persistence via @arcade/shared/highscore, closing the lobby NO SCORE gap

## Story Details
- **ID:** SH-6
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** battlezone
- **Assignee:** Keith Avery

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-07T22:44:17Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-07T22:13:26Z | 2026-07-07T22:15:15Z | 1m 49s |
| red | 2026-07-07T22:15:15Z | 2026-07-07T22:27:33Z | 12m 18s |
| green | 2026-07-07T22:27:33Z | 2026-07-07T22:37:11Z | 9m 38s |
| review | 2026-07-07T22:37:11Z | 2026-07-07T22:44:17Z | 7m 6s |
| finish | 2026-07-07T22:44:17Z | - | - |

## Story Context

### Problem (Corrected Framing)

**STALE YAML PROSE CORRECTED BY SM:** The epic-SH.yaml description says battlezone has "no highscore.ts/storage.ts, reads NO SCORE forever." This is FALSE on disk. **Reality verified by SM:**

- **battlezone ALREADY has a complete, wired local high-score system:**
  - `battlezone/src/core/highscore.ts` — hand-ported `HighScoreEntry {name, score, date?}`, `qualifiesForHighScore`, `insertHighScore`, `MAX_HIGH_SCORES=10` (ported from star-wars in story bz1-10).
  - `battlezone/src/shell/storage.ts` — `loadHighScores`/`saveHighScores`, key `battlezone-high-scores`.
  - Capture wired: `src/core/sim.ts` calls qualifies/insert on game-over; `src/main.ts` saves on transition to attract; `src/core/screens.ts` renders via `attractLines`.
- **battlezone ALREADY consumes `@arcade/shared` but pinned to `#v0.3.0`** (the rng release, PRE-highscore). The `./highscore` subpath export landed in v0.4.0.
- **battlezone entry has NO domain field** (unlike tempest=`level`, star-wars=`wave`, asteroids=`wave`) — "the run itself is the unit."

**So SH-6's TRUE shape is exactly AC-1's "no hand-copied fourth variant":** battlezone's local highscore.ts + storage.ts ARE the surviving 4th copy SH-4 did not reach. SH-6 = **MIGRATE battlezone onto `@arcade/shared/highscore`**, mirroring the mechanical re-point SH-4 applied to tempest/star-wars/asteroids:

1. Bump `@arcade/shared` pin `#v0.3.0` → `#v0.4.0` in battlezone/package.json, then run `npm install "@arcade/shared@github:slabgorb/arcade-shared#v0.4.0"` (force it explicitly — plain `npm install` honours the stale lock; documented git-dep staleness gotcha).
2. Adopt the shared module in main.ts: `makeHighScoreStorage('battlezone', <validator>)`; import qualifies/insert/table type from shared.
3. Delete local `src/core/highscore.ts` + `src/shell/storage.ts`; update importers (`sim.ts`, `state.ts`, `screens.ts`).
4. Prove the persisted shape satisfies the shared row validator (AC-3).
5. Confirm the lobby's battlezone tile shows a real top score (AC-2, NO SCORE gap closed).

### Acceptance Criteria (SH-6)

1. Battlezone captures and persists high scores via `@arcade/shared/highscore` (no hand-copied fourth variant).
2. The lobby's battlezone tile shows a real top score after a qualifying run (NO SCORE gap closed).
3. A test asserts battlezone's persisted shape satisfies the shared row validator.

### Shared Module Public Surface (v0.4.0 — already released)

From `sprint/archive/SH-4-session.md` Delivery Findings:

- `MAX_HIGH_SCORES=10`, `HighScoreEntry<DomainKey extends string>` + `HighScoreEntryBase`
- `qualifiesForHighScore`/`insertHighScore` (generic)
- `highScoreKey(gameId)` → `${gameId}-high-scores`
- `isHighScoreRow` (domain-agnostic base guard: name + FINITE score — the guard the lobby imports)
- `makeHighScoreRowGuard(domainKey)` (domain-aware, layers finite domain-field check)
- `makeHighScoreStorage(gameId, validator)` → `{load, save}` (persistence factory, graceful degradation)

### KEY OPEN RED-DESIGN QUESTION FOR TEA

**Flag in context; do NOT resolve this in setup.** battlezone has NO domain field, but shared `HighScoreEntry<DomainKey extends string>` is generic over a domain key. **TEA must decide battlezone's adoption:**

- **(a) Use the domain-agnostic base guard directly:** `makeHighScoreStorage('battlezone', isHighScoreRow)` and a domainless entry — likely correct, matches the lobby's own usage and battlezone's "run is the unit" reality; OR
- **(b) Pick a nominal domain key** (e.g., `'run'`).

**Also:** battlezone's `date?` optional field is an extra not present in the sibling ports — **TEA/Dev must verify it survives the shared round-trip** (`isHighScoreRow` ignores extra fields, so it should pass through, but pin it). Note per prior findings: shared repo's own tooling gives NO compile-time gate on the generic; the compile-time proof is battlezone's `tsc --noEmit` passing after adoption.

### Release State (Verified by SM)

- arcade-shared v0.4.0 is ALREADY tagged and merged to develop (PR #4, develop tip 4f4ed90). NO release/tag step needed at finish. battlezone just bumps the pin to `#v0.4.0`.
- No open PRs anywhere — merge gate clear.
- **Do NOT provisionally pin battlezone to a feature branch; pin straight to `#v0.4.0`.**

### Quarry Pointers (for TEA)

- **`sprint/archive/SH-4-session.md` Delivery Findings + Design Deviations:** the shared module's public surface, the exact main.ts factory-call pattern each game adopted, and the "delete local highscore/storage + delete their superseded local test suites (do not re-point)" mechanic. battlezone should mirror asteroids/star-wars (both deleted `tests/highscore.table.test.ts` + `tests/storage.test.ts`).
- **battlezone's existing local highscore/storage tests will be SUPERSEDED** by the shared `arcade-shared/tests/highscore.test.ts` — identify them for deletion (mirror SH-4), but keep any battlezone sim-state-machine test with its import path updated.

## Branch Strategy
**Branch Strategy:** gitflow (feat/SH-6-battlezone-shared-highscore)
**Repos:** battlezone (primary); arcade-shared (dep)
**Base:** origin/develop (5727dbd)

## Sm Assessment

**Routing decision: setup → RED (TEA).** Story is ready and unblocked.

- **Dependencies clear:** SH-4 is `done` (v0.4.0 released). SH-6 has no `depends_on`. arcade-shared's highscore module is the proven contract; battlezone is the final migration.
- **Baseline verified:** battlezone develop is clean at 5727dbd (origin/develop). Feature branch cut off that baseline. Gitflow — targets develop, squash PR.
- **Merge gate clear:** No open PRs. No in-progress stories competing.
- **Jira:** N/A — local sprint tracking only (JIRA_KEY empty by design).
- **Scope note for TEA:** battlezone is the ONLY game without a domain field. The open RED-DESIGN QUESTION asks TEA to choose: domain-agnostic base guard (`isHighScoreRow` directly) or a nominal domain key. The choice is runtime-observable via `makeHighScoreRowGuard` and affects neither AC-2 nor AC-3 (both mirror SH-4's pattern). battlezone's `date?` field must survive the shared round-trip (isHighScoreRow ignores extra fields; pin it in tests).

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** SH-6 is a behaviour-bearing migration (retire the local fourth-variant high-score table + storage seam; adopt `@arcade/shared/highscore` v0.4.0) with three concrete ACs — not a doc/config chore. RED must lock the migration end-state.

**Open RED-design question — RESOLVED (a): domain-agnostic.** battlezone binds `makeHighScoreStorage('battlezone', isHighScoreRow)` with a plain `HighScoreEntryBase { name, score, date? }` — NO nominal domain field. Rationale in Design Deviations. Option (b) was rejected: a nominal `run:`/`level:` field would rewrite the persisted JSON for zero gameplay meaning and force a localStorage migration.

**Test Files:**
- `battlezone/tests/highscore-extraction.test.ts` (new) — pure fs/text migration guard (mirrors battlezone's own SH-3 `rng-extraction.test.ts`): local `src/core/highscore.ts` + `src/shell/storage.ts` deleted; pin bumped to `#v0.4.0`; every src consumer + `main.ts` re-pointed to the shared factory; NO src still imports the local modules. Enforces AC-1.
- `battlezone/tests/highscore-shared-contract.test.ts` (new) — runtime AC-2/AC-3 + AC-1 capture. Drives battlezone's REAL sim capture path (`stepGame` game-over auto-cycle folds a qualifying score in), persists via `makeHighScoreStorage('battlezone', isHighScoreRow)`, and proves every persisted row passes the shared `isHighScoreRow` and the lobby's `getTopScore` read (replayed inline with the same shared functions) returns a real top score — the NO SCORE gap closed. Pins the domain-agnostic decision + `date` round-trip survival.
- `battlezone/tests/arcade-shared-pipe.test.ts` (edited) — `SHARED_VERSION` assertion bumped `0.3.0` → `0.4.0`: the runtime proof the pin bump actually re-resolved through the lockfile (guards the documented git-URL lock-staleness gotcha).

**Tests Written:** 3 new/edited files, 12 new assertions, covering all 3 ACs.
**Status:** RED — confirmed by `testing-runner` (RUN_ID `SH-6-tea-red`): 3 failing files / 9 failing assertions + 1 module-load failure. `highscore-shared-contract.test.ts` fails to LOAD (`"./highscore" is not exported ... from @arcade/shared` at the v0.3.0 pin — the intended subpath-unresolved RED, same idiom as battlezone's bz1-10 `storage.test.ts`). `highscore-extraction.test.ts` — 8 assertion failures (local files present, pin v0.3.0, no shared imports). `arcade-shared-pipe.test.ts` — `expected '0.3.0' to be '0.4.0'`. All 49 pre-existing suites still green (no regression), including the soon-to-be-superseded `highscore.table.test.ts` / `storage.test.ts` (they pass in RED because the local files still exist).

### Rule Coverage

| Rule (lang-review/typescript.md) | Test(s) | Status |
|------|---------|--------|
| #10 input-validation — `JSON.parse` output runtime-validated, never `as T` | contract: "every row … passes isHighScoreRow", "reports the true maximum even if a tampered board is out of order" | failing (RED) |
| #1 type predicate has runtime validation inside | contract: "domainless entry passes the shared guard" + the per-row validator loop | failing (RED) |
| #2 generic/interface — `readonly` table params, no `Record<string,any>` | contract: `save(readonly board)` round-trip + `date` survival | failing (RED) |
| #4 null/undefined — lobby read returns `number \| null` correctly | contract: AC-2 "lobby read returns the run score — not NO SCORE" (`toBeNull()` baseline → `toBe(42000)`) | failing (RED) |
| #8 test quality — import from `src/`/package not `dist/`, no `as any`, meaningful assertions | all three files (self-checked below) | failing (RED) |
| #11 error handling — persistence degrades gracefully | inherited: arcade-shared's own `highscore.test.ts` owns the failure-mode suite (extraction point); contract covers the happy round-trip | n/a (owned upstream) |

**Rules checked:** 5 of 5 applicable TS lang-review checks have RED coverage (#3 enums, #6 React, #7 async, #9 build-config, #12 perf, #13 fix-meta — not applicable to this migration).
**Self-check:** 0 vacuous assertions — the per-row validator loop is guarded by a non-empty `toBeGreaterThan(0)` so it can't pass over an empty array; every `it` asserts a concrete value/shape.

**Handoff:** To Dev (Julia) for GREEN — see Delivery Findings for the exact re-point map, the superseded suites to DELETE, and the pin-bump re-install.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `battlezone/package.json` + `package-lock.json` — `@arcade/shared` pin `#v0.3.0` → `#v0.4.0`, re-resolved to commit `4f4ed90` via explicit tag reinstall.
- `battlezone/src/main.ts` — `makeHighScoreStorage('battlezone', isHighScoreRow)` (domain-agnostic base guard) replaces the local `loadHighScores`/`saveHighScores` seam; the const sits AFTER the import block (not between imports — SH-4 reviewer's tidy). `let game` annotated `GameState` so the shared `load()`'s mutable array widens into the readonly board.
- `battlezone/src/core/sim.ts` — `qualifiesForHighScore`/`insertHighScore` re-pointed to `@arcade/shared/highscore`.
- `battlezone/src/core/state.ts` — `export type HighScoreTable = readonly HighScoreEntryBase[]` (domain-agnostic alias; base type imported from shared).
- `battlezone/src/core/screens.ts` + `tests/core/screens.test.ts` — re-point the `HighScoreTable` import to `./state` / `../../src/core/state`.
- DELETED `battlezone/src/core/highscore.ts`, `src/shell/storage.ts`, `tests/core/highscore.table.test.ts`, `tests/shell/storage.test.ts` (superseded — logic now lives + is proven in `@arcade/shared/highscore`).

**Tests:** 737/737 passing (GREEN); `tsc --noEmit` zero errors; `vite build` succeeds. Confirmed by `testing-runner` (RUN_ID `SH-6-dev-green-final`).

**AC status:**
- **AC-1** ✅ battlezone captures + persists via `@arcade/shared/highscore`; the local fourth variant is deleted (extraction guard green, tsc proves the type adoption compiles).
- **AC-2** ✅ proven at the boundary — `highscore-shared-contract.test.ts` replays the lobby's `getTopScore` algorithm (same shared `highScoreKey` + `isHighScoreRow`) and gets the run's top score, not NO SCORE. Optional live `just serve` cabinet check flagged in findings.
- **AC-3** ✅ every persisted row passes the shared `isHighScoreRow`; the optional `date` survives the round-trip.

**Branch:** `feat/SH-6-battlezone-shared-highscore` (pushed to origin, commit `9a0f12b`).
**Handoff:** To Reviewer (The Thought Police) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none — 737/737 tests, clean `tsc`+`vite build`, 0 smells, dead-ref clean, pin bumped→v0.4.0/`4f4ed90` | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([SIMPLE]) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer ([RULE]) |

**All received:** Yes (preflight returned clean; the 8 thematic subagents are disabled via `workflow.reviewer_subagents` — each domain was assessed directly by the Reviewer and tagged in the assessment)
**Total findings:** 1 confirmed (LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

A faithful, minimal migration: battlezone's local fourth-variant high-score table + storage seam are deleted and replaced by `@arcade/shared/highscore` (v0.4.0) — the same module the lobby reads with. Net −181 lines. All three ACs met; 737/737 tests green, clean `tsc --noEmit` + `vite build`. One LOW, non-blocking observation (a deliberate, TEA-logged behaviour narrowing on the read path).

**Data flow traced:** run ends → `sim.returnToAttract` folds `{name:'AAA', score}` into the board via the shared `insertHighScore` → `main.ts frame()` detects the attract re-entry and calls `highScoreStorage.save(game.highScores)` → JSON under `battlezone-high-scores` → lobby `getTopScore('battlezone')` (`lobby/src/main.ts:31`) filters via the shared `isHighScoreRow`, takes `Math.max`, renders `HI SCORE {n}` instead of `NO SCORE` (`lobby/src/main.ts:34`). The write key `highScoreKey('battlezone')` === the old local `STORAGE_KEY` `'battlezone-high-scores'`, so **pre-existing persisted scores survive the upgrade — no data-loss migration.** Safe.

**Observations (all 8 domains — thematic subagents disabled, assessed by Reviewer):**
- [VERIFIED] **Table-logic parity** — the shared `qualifiesForHighScore`/`insertHighScore` are algorithm-identical to the deleted local versions (same `score<=0` reject, open-slot rule, strict-beat-lowest, insert-after-ties, `slice(0, MAX_HIGH_SCORES)` truncation). Capture behaviour unchanged. Evidence: deleted `src/core/highscore.ts:38-59` vs shared `highscore.ts:56-81`; contract tests "folds a qualifying score…" + "non-positive never qualifies" green.
- [RULE][VERIFIED] **TS lang-review compliance** — all 13 applicable checks pass (see `### Rule Compliance`). Most load-bearing: #10 (`JSON.parse` output validated via `isHighScoreRow`, never `as T`) and #2 (`readonly` table params).
- [TYPE][VERIFIED] **Domain-agnostic adoption is type-sound** — `state.ts:20` `HighScoreTable = readonly HighScoreEntryBase[]`; `makeHighScoreStorage<HighScoreEntryBase>('battlezone', isHighScoreRow)`; the `let game: GameState` annotation (`main.ts`) correctly widens the shared `load()`'s mutable `HighScoreEntryBase[]` into the readonly field. No `as any`, no unsafe cast; `tsc --noEmit` clean.
- [SEC][LOW] **Read-path hardening narrowed** — the deleted local `isHighScoreEntry` capped `name.length ≤ 3` and `load()` truncated to `MAX_HIGH_SCORES`; the shared `isHighScoreRow`+`load()` drop both. Impact is cosmetic and self-inflicted-only: the write path still caps at 10 and writes 3-char `DEFAULT_INITIALS`, so normal data never exceeds either bound — only direct localStorage tampering (same-origin, devtools) can inject an over-long name / oversized board into the attract render. `fillText` is not an injection vector (no XSS); the lobby tile uses `Math.max`, immune to name/count. Non-blocking — the deliberate SH-4 unify-on-one-guard decision. Location: `src/core/screens.ts:18` (`attractLines` renders every row).
- [SILENT][VERIFIED] **No new swallowed errors** — the only error-swallowing is the shared `makeHighScoreStorage` graceful degradation (inherited by design, documented); `main.ts` save is fire-and-forget by intent ("scores just don't persist" on failure), unchanged from the deleted seam. No empty catches added in the diff.
- [TEST][VERIFIED] **New suites are honest** — `highscore-extraction.test.ts` (fs/text migration guard) + `highscore-shared-contract.test.ts` (runtime AC-2/AC-3 driving the real `stepGame` capture path). No vacuous assertions; the per-row validator loop is guarded by `toBeGreaterThan(0)`. AC-2 uses an inline `lobbyTopScore` proxy replaying `getTopScore`'s exact algorithm with the SAME shared functions — a faithful boundary proof that avoids a brittle cross-repo import (documented). Superseded local suites correctly deleted, not re-pointed.
- [DOC][VERIFIED] **Comments accurate** — new comments in `state.ts`, `sim.ts:29-32`, `main.ts` correctly describe the domain-agnostic choice and mutable→readonly rationale; `arcade-shared-pipe.test.ts` header updated for the v0.4.0 bump. No stale/misleading doc left (deleted files' docs gone).
- [SIMPLE][VERIFIED] **No over-engineering** — net −181 lines; deletes real duplication; a single new type alias + one annotation are the minimal surface. No dead/commented-out code (preflight: 0).
- [EDGE][VERIFIED] **Boundaries covered** — empty board, non-positive score, ties (inherited from shared), and out-of-order/tampered board (contract test "reports the true maximum even if a tampered board is out of order") all exercised. The one edge behaviour CHANGE (uncapped load count) is the [SEC][LOW] item above.

**Pattern observed:** mirrors battlezone's own SH-3 rng-extraction exactly (fs/text migration guard + version-pipe bump + consumer re-point + local-copy deletion) — consistent with the SH-epic extraction idiom. `tests/highscore-extraction.test.ts`.
**Error handling:** graceful-degradation persistence inherited from the shared factory; save/load never throw. `src/main.ts`.

### Rule Compliance (TS lang-review — 13 checks)

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | Type-safety escapes | ✓ | No `as any`/`@ts-ignore`/non-null-on-nullable in diff; `isHighScoreRow` is a validated predicate |
| 2 | Generic/interface (readonly) | ✓ | `HighScoreTable = readonly HighScoreEntryBase[]`; shared `save(readonly E[])` |
| 3 | Enum anti-patterns | n/a | No enums; `Mode` is a string union |
| 4 | Null/undefined | ✓ | `getTopScore`/`lobbyTopScore` use explicit `=== null`; no `||` on falsy-valid |
| 5 | Module/declaration | ✓ | `import type` on all type-only imports; bundler resolution (project convention, no `.js`) |
| 6 | React/JSX | n/a | No `.tsx` |
| 7 | Async/Promise | n/a | Synchronous |
| 8 | Test quality | ✓ | Imports from `src/`/package (not `dist/`); no `as any`; guarded loop; meaningful assertions |
| 9 | Build/config | ✓ | `tsc --noEmit` strict passes; no config change |
| 10 | Security input-validation | ✓ | `JSON.parse` output validated per-row via `isHighScoreRow`, never `as T` |
| 11 | Error handling | ✓ | Shared factory degrades gracefully; no `catch(e:any)` in diff |
| 12 | Perf/bundle | ✓ | Named subpath import (tree-shakeable); no barrel over-import |
| 13 | Fix-introduced regressions | ✓ | The tsc fix is a clean `GameState` annotation — no `as any`, no `||` |

### Devil's Advocate

Argue this is broken. **Swing 1 — data loss on upgrade:** does switching seams orphan a returning player's existing high scores? No — both write/read `battlezone-high-scores` (`highScoreKey('battlezone')` === the deleted `STORAGE_KEY`), and the shared `load()` FILTERS existing rows rather than rebuilding them, so `{name,score,date?}` rows written by the old code still parse and pass `isHighScoreRow`. Existing boards survive. **Swing 2 — the attract renderer:** the migration silently drops battlezone's two review-round-1 read-path caps (name ≤ 3, board ≤ 10), which existed precisely because "whatever survives this guard is stroked through fillText every attract frame." A curious user with devtools on a public cabinet could inject a 100 KB name or 10 000 rows and bog the attract loop. Real, but: (a) it is the deliberate epic-level decision to collapse onto ONE shared contract — re-adding battlezone-local caps would re-introduce exactly the divergence SH-6 exists to kill; (b) the write path never produces such data; (c) `fillText` executes no markup, so it is a cosmetic/perf nuisance, not an exploit; (d) the correct home for any display-robustness cap is the shared module (all four games benefit) or `attractLines` — both out of SH-6 scope. Logged [SEC][LOW], non-blocking. **Swing 3 — AC-2 is faked with a proxy:** the contract test doesn't import the real lobby. True, but it replays `getTopScore`'s exact algorithm with the SAME shared `highScoreKey`+`isHighScoreRow` the lobby imports, and I independently traced the live lobby wiring (`lobby/src/main.ts:31,34`, `registry.ts:49`) — the mechanism is genuine; only the pixels-on-screen check is unautomated (Dev flagged the optional `just serve` pass). **Swing 4 — the `let game: GameState` annotation hides a deeper mismatch:** no — it is a legitimate mutable→readonly widening; `stepGame` returns `GameState` each frame and reassigns cleanly; `tsc` is green. Nothing rises to blocking.

**Handoff:** To SM (Winston Smith) for finish-story.

## Delivery Findings

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (blocking-for-GREEN): The superseded local suites must be DELETED, not re-pointed — deleting `src/core/highscore.ts` + `src/shell/storage.ts` breaks the suites that import them. Affects `battlezone/tests/core/highscore.table.test.ts` and `battlezone/tests/shell/storage.test.ts` (delete both — the table logic is now proven in `arcade-shared/tests/highscore.test.ts`, and `storage.test.ts` additionally asserts battlezone-only behaviours the shared module intentionally drops: the `name.length ≤ 3` cap and the load-time `≤ MAX_HIGH_SCORES` truncation). Mirrors SH-4's deletion of the sibling games' local suites. *Found by TEA during test design.*
- **Gap** (blocking-for-GREEN): Consumers of the local `HighScoreTable`/`HighScoreEntry` type must be re-pointed to `HighScoreEntryBase` — the shared `HighScoreTable<DomainKey>` is generic and REQUIRES a domain key battlezone doesn't have. Affects `battlezone/src/core/state.ts` (`:18` import, `:58` `highScores` field), `battlezone/src/core/screens.ts` (`:12` import, `:18` `attractLines` param), and `battlezone/tests/core/screens.test.ts` (`:28` import, `:50` `SAMPLE_TABLE`) → use `readonly HighScoreEntryBase[]` from `@arcade/shared/highscore` (NOT `HighScoreTable<…>`). `battlezone/src/core/sim.ts:29` re-points its `qualifiesForHighScore`/`insertHighScore` value imports to the shared module (both are domain-agnostic — read only `.score` — so they drop straight in). *Found by TEA during test design.*
- **Improvement** (blocking-for-GREEN): The pin bump needs an explicit tag re-install, not a plain `npm install` (which honours the stale v0.3.0 lock — the documented git-URL lock-staleness gotcha). Affects `battlezone/package.json` + `battlezone/package-lock.json`: bump `@arcade/shared` `#v0.3.0` → `#v0.4.0` then `npm install "@arcade/shared@github:slabgorb/arcade-shared#v0.4.0"`. `arcade-shared-pipe.test.ts` (`SHARED_VERSION === '0.4.0'`) is the runtime proof the re-resolution actually landed. *Found by TEA during test design.*
- **Conflict** (non-blocking): The SH-6 story YAML prose is stale — it says battlezone has "no highscore.ts/storage.ts … NO SCORE forever," but battlezone has a complete, wired local high-score system already; the real story is the fourth-variant MIGRATION. No code impact (SM's corrected framing is in this session's Problem section). Affects `sprint/epic-SH.yaml` SH-6 `description` (informational — a post-merge tidy if desired). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the shared `@arcade/shared/highscore` `load()` and `insertHighScore()` return MUTABLE `E[]`, while consumers hold `readonly` state fields — battlezone needed a `GameState` annotation on `let game` in `main.ts` to widen mutable→readonly (`tsc` TS2322 otherwise). A future shared-lib tidy could return `readonly E[]` from both to remove this friction for every consumer. Affects `arcade-shared/src/highscore.ts` return types (informational, out of SH-6 scope). *Found by Dev during implementation.*
- **Confirmation** (non-blocking): TEA's git-URL lock-staleness finding held — the explicit `npm install "@arcade/shared@github:slabgorb/arcade-shared#v0.4.0"` re-resolved `package-lock.json` to commit `4f4ed90` (v0.4.0); `arcade-shared-pipe.test.ts` (`SHARED_VERSION === '0.4.0'`) confirms the runtime resolution actually landed. *Found by Dev during implementation.*
- **Question** (non-blocking): AC-2's "the lobby tile shows a real top score" is proven at battlezone's boundary (the contract test replays `getTopScore` with the same shared functions). A live end-to-end check — `just serve`, play battlezone to a qualifying game-over, confirm the lobby's battlezone tile renders the score — would close it visually but is out of GREEN scope; flagged for the Reviewer/verify pass. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the migration drops battlezone's local attract-screen read-path hardening (name `length ≤ 3` cap + load-time `≤ MAX_HIGH_SCORES` truncation) in favour of the shared guard, which caps neither. Impact is cosmetic/self-inflicted-tamper-only (the write path still caps; the lobby tile uses `Math.max`). If display robustness against hand-edited localStorage is ever wanted, add the cap in the SHARED `@arcade/shared/highscore` `load()` (benefits all four games) or in `battlezone/src/core/screens.ts` `attractLines`. Out of SH-6 scope. *Found by Reviewer during code review.*
- **Confirmation** (non-blocking): endorses Dev's finding — the shared `load()`/`insertHighScore()` returning MUTABLE `E[]` forces a `readonly`-widening annotation on every consumer; returning `readonly E[]` from the shared module would remove that friction. Affects `arcade-shared/src/highscore.ts`. *Found by Reviewer during code review.*
- **Note** (non-blocking): existing persisted `battlezone-high-scores` data survives the migration (same key, filter-not-rebuild load) — no user data loss on upgrade. Verified during the data-flow trace. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Domain-agnostic adoption — the base guard, no domain field**
  - Spec source: context-story-SH-6.md AC-1 + session "KEY OPEN RED-DESIGN QUESTION"; `@arcade/shared/highscore` `HighScoreEntry<DomainKey extends string>`
  - Spec text: the shared entry type is "GENERIC over the domain field" (tempest `level`; star-wars/asteroids `wave`); the open question asks TEA to pick the domain-agnostic base guard OR a nominal domain key.
  - Implementation: battlezone binds `makeHighScoreStorage('battlezone', isHighScoreRow)` with a plain `HighScoreEntryBase { name, score, date? }` — no domain field. Tests pin `isHighScoreRow({ name, score }) === true` and a domainless captured board.
  - Rationale: battlezone records no level/wave ("the run is the unit" — its own bz1-10 highscore.ts comment). `isHighScoreRow` is exactly what the lobby's `getTopScore` already uses; a nominal field would rewrite the persisted JSON for zero gameplay meaning and force a localStorage migration. Strictly the smaller change.
  - Severity: minor
  - Forward impact: Dev types the table as `readonly HighScoreEntryBase[]` (not `HighScoreTable<domain>`); `makeHighScoreRowGuard` is NOT used by battlezone.
- **Behaviour narrowing — the shared read drops battlezone's local name-length cap (≤3) and load-count cap (≤MAX)**
  - Spec source: sibling parity — battlezone's local `src/shell/storage.ts` guard (`isHighScoreEntry`) + its "hardened read path" tests
  - Spec text: the local guard rejects rows whose `name.length > 3`, and `loadHighScores` truncates the loaded table to `MAX_HIGH_SCORES`.
  - Implementation: the shared `isHighScoreRow` checks only `typeof name === 'string' && Number.isFinite(score)` (no length cap) and `makeHighScoreStorage.load()` filters but does NOT truncate. Migrating adopts the shared behaviour; the local hardened-read-path assertions are superseded and their suite deleted (see Delivery Findings).
  - Rationale: SH-4 unified all games on the one shared guard = the lobby's actual read contract (name + finite score). One shared guard can hold only one standard; battlezone conforms to it exactly as tempest/star-wars/asteroids did. The name-length + count caps were battlezone-only hardening, not part of the extracted contract, and the write path still caps at MAX via `insertHighScore` (names are the 3-char `DEFAULT_INITIALS`), so well-formed data is unaffected.
  - Severity: minor
  - Forward impact: Dev deletes `tests/shell/storage.test.ts` (its name-length + load-cap assertions no longer hold); the shared module's own suite owns load/save coverage.
- **RED signal for the runtime contract file is a module-load failure, not per-assertion failures**
  - Spec source: TDD RED convention + battlezone bz1-10 `storage.test.ts` idiom ("the import failure IS the RED signal")
  - Spec text: RED tests must fail before GREEN.
  - Implementation: `highscore-shared-contract.test.ts` imports `@arcade/shared/highscore`, a subpath the v0.3.0 pin does not export, so the whole file fails to LOAD; its AC-2/AC-3 assertions run only once GREEN bumps the pin.
  - Rationale: the subpath cannot resolve until the pin is bumped, which is itself a required GREEN step (AC-1); this is the same framing battlezone's own storage.test.ts used in bz1-10.
  - Severity: minor
  - Forward impact: none — once the pin re-resolves at v0.4.0 the file loads and its assertions execute.

### Dev (implementation)
- **`HighScoreTable` alias homed in `src/core/state.ts`**
  - Spec source: TEA Design Deviation "Domain-agnostic adoption"; the shared `HighScoreTable<DomainKey>` is generic.
  - Spec text: battlezone uses `readonly HighScoreEntryBase[]` (no domain field), not `HighScoreTable<…>`.
  - Implementation: defined `export type HighScoreTable = readonly HighScoreEntryBase[]` in `state.ts` (co-located with `GameState.highScores`); `screens.ts` + `screens.test.ts` import the alias from `./state` (not the deleted `./highscore`).
  - Rationale: keeps the readable `HighScoreTable` name with one canonical home next to the state that holds it, without re-instantiating the generic with a meaningless domain key. `screens → state` introduces no cycle (state does not import screens).
  - Severity: trivial
  - Forward impact: none — battlezone-internal alias; the persisted shape + shared contract are unchanged.
- **`let game: GameState` annotation in `main.ts`**
  - Spec source: shared `@arcade/shared/highscore` return types (`load(): E[]`, `insertHighScore(): E[]`).
  - Spec text: n/a — an implementation detail surfaced by `tsc`.
  - Implementation: annotated the `let game` binding `GameState` so the shared `load()`'s MUTABLE `HighScoreEntryBase[]` widens into `GameState.highScores` (`readonly`).
  - Rationale: without it, inference widened `game.highScores` to mutable and rejected the readonly board `stepGame` returns each frame (TS2322). mutable→readonly is a safe widening; zero runtime change.
  - Severity: trivial
  - Forward impact: none.

### Reviewer (audit)
- **TEA "Domain-agnostic adoption — the base guard, no domain field"** → ✓ ACCEPTED by Reviewer: correct — matches the lobby's own `isHighScoreRow` usage and battlezone's "run is the unit" reality; a nominal domain field would rewrite persisted JSON for zero meaning. Type-sound (`tsc` green).
- **TEA "Behaviour narrowing — drops name-length (≤3) + load-count (≤MAX) caps"** → ✓ ACCEPTED by Reviewer (with note): sound as the deliberate SH-4 unify-on-one-shared-guard decision; residual impact is cosmetic + self-inflicted-tamper-only, and the AC-2 lobby surface (`Math.max`) is immune. Logged as [SEC][LOW] non-blocking; the correct home for any restored display cap is the shared module or `attractLines`, out of SH-6 scope.
- **TEA "RED signal is a module-load failure"** → ✓ ACCEPTED by Reviewer: standard battlezone idiom (bz1-10 `storage.test.ts`); the `./highscore` subpath genuinely cannot resolve at the v0.3.0 pin.
- **Dev "`HighScoreTable` alias homed in `state.ts`"** → ✓ ACCEPTED by Reviewer: clean single canonical alias next to `GameState`; `screens → state` is a type-only import — verified no runtime cycle.
- **Dev "`let game: GameState` annotation"** → ✓ ACCEPTED by Reviewer: minimal correct fix for the shared mutable-array return; safe widening, zero runtime change.
- **No UNDOCUMENTED deviations found** — the diff matches the logged deviations exactly; capture/table behaviour is otherwise byte-identical to the retired local code.