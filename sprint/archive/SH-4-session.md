---
story_id: "SH-4"
jira_key: ""
epic: "SH"
workflow: "tdd"
---
# Story SH-4: Extract high-score + storage into @arcade/shared/highscore and make the lobby import the same contract (compile-time)

## Story Details
- **ID:** SH-4
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade-shared
- **Assignee:** Keith Avery

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-07T20:17:04Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-07T19:30:43Z | 2026-07-07T19:32:37Z | 1m 54s |
| red | 2026-07-07T19:32:37Z | 2026-07-07T19:44:33Z | 11m 56s |
| green | 2026-07-07T19:44:33Z | 2026-07-07T20:05:49Z | 21m 16s |
| review | 2026-07-07T20:05:49Z | 2026-07-07T20:17:04Z | 11m 15s |
| finish | 2026-07-07T20:17:04Z | - | - |

## Story Context

### Problem
highscore.ts + storage.ts are algorithm-identical across tempest/star-wars/asteroids. The lobby reads their `{gameId}-high-scores` localStorage entries by convention only. This story extracts a module with the table logic generic over the domain field (level vs wave) plus a makeHighScoreStorage factory and a shared key-builder. Wire the lobby to import the SAME key-builder + row guard the games write — turning today's convention into a compile-time contract.

### Acceptance Criteria
1. `@arcade/shared/highscore` exports `HighScoreEntry` (generic domain field), qualifies/insert logic, a `{gameId}-high-scores` key-builder, and a row validator.
2. tempest/star-wars/asteroids write high scores via the shared module at a pinned ref; local highscore.ts + storage.ts duplication removed.
3. The lobby imports the shared key-builder + row guard rather than re-deriving the key/shape by hand.
4. The single MAX_HIGH_SCORES source-of-truth lives in the shared module (no per-repo redeclaration).

### Technical Approach
- **Precedent:** SH-2 (extract-math3d) and SH-3 (extract-rng) proved the extraction pattern end-to-end. Reuse the exact mechanism:
  - Extract verbatim to @arcade/shared
  - Add subpath export to @arcade/shared/highscore in package.json exports
  - Consumers pin a git-URL dep with a tag or commit ref
  - Delete local highscore.ts + storage.ts files
- **Key consideration:** The domain field differs across games (tempest/star-wars use `level`, asteroids uses `wave`). The shared module must be generic to support both.
- **Blocking carryover from SH-3:** Verify that SH-3's arcade-shared/develop state is ready (v0.3.0 with ./rng export landed, all 4 games pinned + green).
- **Testing:** Extract guards must prove each game removes local highscore.ts/storage.ts and re-points to the shared module.

### Breadcrumbs from SH-3
- @arcade/shared is at 0.3.0 with ./rng subpath export shipped
- SH-4 adds ./highscore subpath export using the same pattern
- Verify arcade-shared/develop is clean and all games at v0.3.0 before starting SH-4

## Branch Strategy
**Branch Strategy:** gitflow (feat/SH-4-shared-highscore)
**Repos:** arcade-shared (primary); tempest/star-wars/asteroids/lobby (consumers in GREEN/finish)

## Sm Assessment

**Routing decision: setup → RED (TEA / O'Brien).** Story is ready and unblocked.

- **Dependencies clear:** SH-1, SH-2, SH-3 all `done`. SH-4 has no `depends_on`. The extraction pattern is proven twice (SH-2 math3d, SH-3 rng), so this is a known-shape story, not a first-of-kind.
- **Baseline verified:** arcade-shared `develop` is clean at `f5f9f7f` (v0.3.0, ./rng export landed). Feature branch `feat/SH-4-shared-highscore` cut off that baseline. Gitflow — targets `develop`, squash PR.
- **Merge gate clear:** No open PRs across any repo. No in-progress/in-review stories competing.
- **Jira:** N/A — local sprint tracking only (JIRA_KEY empty by design).
- **Scope note for TEA:** This story is wider than SH-2/SH-3 — the shared module must be generic over the domain field (`level` for tempest/star-wars, `wave` for asteroids), and AC-3 turns the lobby's by-convention `{gameId}-high-scores` read into a compile-time contract (shared key-builder + row guard). RED tests should pin both the generic-domain shape and the shared key/guard the lobby will import. Carry SH-3's npm git-URL staleness gotcha into GREEN (force `npm install '@arcade/shared@github:...#<ref>'`).
- **Prior-archive quarry:** `sprint/archive/SH-3-session.md` Delivery Findings hold the extraction mechanics and pin/ref workflow — TEA should mine it before scaffolding.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** New shared module `@arcade/shared/highscore` with a genuinely new (generic) public contract — not a mechanical config/doc change.

**Test Files:**
- `arcade-shared/tests/highscore.test.ts` — 40 tests pinning the shared module's public surface (mirrors `tests/rng.test.ts` style + the games' `storage.test.ts` fake-localStorage harness).

**Tests Written:** 40 tests covering AC-1 and AC-4 (and the contract AC-3 depends on).
**Status:** RED — confirmed by `testing-runner` (RUN_ID SH-4-tea-red): `highscore.test.ts` fails with `Cannot find module '../src/highscore'` (the intended module-not-found RED); the 3 pre-existing suites (rng, math3d, camera-mvp) stay green, no regression.

**Pinned public surface of `@arcade/shared/highscore` (the contract Dev must satisfy):**
- `MAX_HIGH_SCORES = 10` — AC-4, single source of truth; `qualifiesForHighScore` reads it.
- `HighScoreEntry<DomainKey extends string>` + `HighScoreEntryBase` — AC-1 generic domain field (`'level'` | `'wave'`).
- `qualifiesForHighScore(table: readonly …, score)` / `insertHighScore(table, entry)` — AC-1 table logic (ordering, ties-after, truncation, purity), generic over the domain field.
- `highScoreKey(gameId) → \`${gameId}-high-scores\`` — AC-1 key-builder; AC-3 the exact literal the lobby + games share.
- `isHighScoreRow(value): value is HighScoreEntryBase` — AC-1 row validator, domain-agnostic (name + **finite** score); **the guard the lobby imports** (AC-3).
- `makeHighScoreRowGuard(domainKey)` — domain-aware guard the games use (kills the residual per-game `Number.isFinite(row[field])` duplication — AC-2).
- `makeHighScoreStorage(gameId, validator) → { load, save }` — the persistence factory; graceful degradation on every storage failure mode.

### Rule Coverage

| Rule (lang-review typescript.md) | Test(s) | Status |
|------|---------|--------|
| #1 / #10 input validation — validate `JSON.parse` output per row, never `as T` | `isHighScoreRow` guard block + `makeHighScoreStorage — load()` drop-malformed tests + source predicate check | failing (RED) |
| #2 readonly array params | `save` frozen-table test + source-text `readonly` regex on `qualifiesForHighScore`/`insertHighScore` | failing (RED) |
| #4 / #11 graceful degradation, never throw | `load()`/`save()` missing/corrupt/not-array/undefined/throwing/quota tests | failing (RED) |
| purity (no input mutation) | `insertHighScore` "does not mutate the input table"; `save` frozen-table | failing (RED) |
| finite-guard contract (score not just `typeof number`) | `isHighScoreRow` "rejects non-finite score (1e999)" + `load()` 1e999 drop | failing (RED) |

**Rules checked:** 4 of the applicable lang-review rules (#1/#10, #2, #4/#11, plus purity) have test coverage. (#3 enums, #6 React, #12 bundle — N/A to this pure-logic module.)
**Self-check:** 0 vacuous tests. Every `it` has a meaningful `expect`; removed a dead compile-time doc block and an unused import before commit.

**Handoff:** To Dev (Julia) for implementation.

## Dev Assessment

**Implementation Complete:** Yes
**Branch:** `feat/SH-4-shared-highscore` — pushed in all 5 repos.

**Tests:** GREEN across every repo (each verified by `testing-runner` + `tsc --noEmit`):

| Repo | Tests | Files | Notes |
|------|-------|-------|-------|
| arcade-shared | 94/94 | 4 | 40 new highscore + 54 pre-existing; build clean; `dist/highscore.{js,d.ts}` emitted |
| tempest (`level`) | 764/764 | 69 | behavior-preserving |
| star-wars (`wave`) | 504/504 | 44 | behavior-preserving |
| asteroids (`wave`) | 790/790 | 38 | behavior-preserving |
| lobby (AC-3) | 22/22 | 2 | one test updated for the name-required guard |

**Files Changed:**
- **arcade-shared (the contract):** `src/highscore.ts` (new — 8 exports), `src/index.ts` (`SHARED_VERSION` 0.4.0), `package.json` (`./highscore` export, version 0.4.0).
- **tempest (`level`):** main.ts uses `makeHighScoreStorage('tempest', makeHighScoreRowGuard('level'))`; import qualifies/insert/HighScoreTable from shared; state.ts/render.ts typed `HighScoreTable<'level'>`; deleted `core/highscore.ts` + `shell/storage.ts`; dropped `rules.ts` MAX_HIGH_SCORES; removed 3 superseded tests; repin+install.
- **star-wars (`wave`):** main.ts factory (`'star-wars'`/`'wave'`); render.ts `HighScoreTable<'wave'>`; deleted local modules (MAX_HIGH_SCORES lived in highscore.ts); removed 2 superseded tests; repin+install.
- **asteroids (`wave`):** main.ts factory (`'asteroids'`/`'wave'`); state.ts `HighScoreTable<'wave'>`; sim/lives import from shared; deleted local modules; removed 2 superseded tests; repointed `modes.test.ts` type import; updated `render-wiring.test.ts` source-text asserts to the factory calls; repin+install.
- **lobby (AC-3):** `storage.ts` imports `highScoreKey` + `isHighScoreRow` (dropped private `highScoreKey`/`scoreOf`); added `@arcade/shared` dep (lobby's first); updated one test for the name-required guard.

**AC coverage:**
- **AC-1** ✅ `@arcade/shared/highscore` exports generic `HighScoreEntry<DomainKey>`, `qualifiesForHighScore`/`insertHighScore`, `highScoreKey`, a row validator (`isHighScoreRow`) — plus `makeHighScoreRowGuard` + `makeHighScoreStorage`.
- **AC-2** ✅ tempest/star-wars/asteroids write via the shared module at a pinned ref; local `highscore.ts` + `storage.ts` removed.
- **AC-3** ✅ lobby imports the shared key-builder + row guard instead of re-deriving the key/shape.
- **AC-4** ✅ MAX_HIGH_SCORES lives only in the shared module; every per-repo redeclaration removed.

**Handoff:** To the next phase (verify/review).

## Delivery Findings

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): Story `repos:` is `arcade-shared`, but AC-2/AC-3 make this genuinely MULTI-REPO — GREEN must also migrate tempest/star-wars/asteroids (write via the shared module, delete local `core/highscore.ts` + `shell/storage.ts`) and rewire the lobby (`lobby/src/shell/storage.ts`) to import `highScoreKey` + `isHighScoreRow`. Affects Dev's GREEN scope (5 repos, not 1) and `sprint/epic-SH.yaml` SH-4 repos. Mirrors SH-3's shape. *Found by TEA during test design.*
- **Improvement** (non-blocking): npm git-URL dep staleness (carried from SH-3) — plain `npm install` honours the stale `package-lock.json` commit; each consumer must run `npm install "@arcade/shared@github:slabgorb/arcade-shared#<ref>"` explicitly to re-resolve. Affects each game/lobby install step in GREEN. *Found by TEA during test design.*
- **Gap** (blocking-for-GREEN): When Dev deletes each game's local `core/highscore.ts` + `shell/storage.ts`, the games' EXISTING suites that import them — `tempest/tests/core/highscore.table.test.ts`, `tempest/tests/core/highscore.source.test.ts`, `tempest/tests/shell/storage.test.ts`, `star-wars/tests/core/highscore.table.test.ts`, `star-wars/tests/shell/storage.test.ts`, `asteroids/tests/highscore.table.test.ts`, `asteroids/tests/storage.test.ts` — must be DELETED (superseded by `arcade-shared/tests/highscore.test.ts`), not re-pointed, exactly as SH-3 handled the local rng tests. `tempest/tests/core/sim.highscore.test.ts` (the sim state machine) stays but may need its import path updated. Affects those files. *Found by TEA during test design.*
- **Gap** (blocking-at-release): Consumers will pin the arcade-shared FEATURE BRANCH (`#feat/SH-4-shared-highscore`) provisionally. Before feature branches are deleted: merge arcade-shared → develop, cut+push tag **`v0.4.0`**, bump each consumer's `@arcade/shared` pin `#feat/SH-4-shared-highscore` → `#v0.4.0`, and bump `SHARED_VERSION`/`package.json` version to `0.4.0`. Mirrors SH-3's v0.3.0 release step. Affects `arcade-shared` + consumer `package.json`/lockfiles. *Found by TEA during test design.*
- **Improvement** (non-blocking): The build tsconfig (`tsconfig.build.json`) compiles only `src/`, and vitest strips types via esbuild — so the generic `HighScoreEntry<DomainKey>` type and `readonly` params get NO compile-time gate from the shared repo's own tooling. RED pins genericity + the no-mutation contract at RUNTIME (guard/storage factory) and via source-text regex. The real compile-time proof of genericity lands in GREEN when tempest (`level`) and asteroids (`wave`) both consume the type and their `tsc --noEmit` builds pass. *Found by TEA during test design.*

### Dev (implementation)
- **Conflict** (non-blocking): The story context and SM scope note say "tempest/star-wars use `level`, asteroids uses `wave`" — but **star-wars actually records `wave`** (`star-wars/src/core/highscore.ts` field `wave`; `main.ts` inserts `{name, score, wave}`). Real domains: tempest=`level`, star-wars=`wave`, asteroids=`wave`. The shared module's genericity absorbed it with zero code impact (star-wars uses `makeHighScoreRowGuard('wave')`). Affects `context-story-SH-4.md` (informational). *Found by Dev during implementation.*
- **Gap** (blocking-at-release): CONFIRMED TEA's release finding — all 5 repos pin the arcade-shared FEATURE BRANCH `#feat/SH-4-shared-highscore`, which npm resolves + locks to commit **`6f4da3e`** (v0.4.0), identical across consumers. Before feature branches are deleted: merge arcade-shared → develop, cut+push tag **`v0.4.0`**, bump each consumer pin `#feat/SH-4-shared-highscore` → `#v0.4.0` and `npm install` the tag. SM finish/release task, not a code defect. Affects `arcade-shared` + 4 consumer `package.json`/lockfiles. *Found by Dev during implementation.*
- **Improvement** (non-blocking): npm git-URL staleness CONFIRMED — used explicit `npm install "@arcade/shared@github:slabgorb/arcade-shared#feat/SH-4-shared-highscore"` in each consumer to force re-resolution + lock update (plain `npm install` would honour the stale lock). *Found by Dev during implementation.*
- **Question** (non-blocking): This story ships **5 PRs** (all on `feat/SH-4-shared-highscore`): arcade-shared (the contract — highest scrutiny), lobby (a deliberate behaviour tightening — rows now require a `name`), and tempest/star-wars/asteroids (mechanical re-points). Reviewer should review all 5. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking, fix-before-tag): `arcade-shared/src/highscore.ts` header comment (line ~9) says "tempest/star-wars record `level`, asteroids records `wave`" — **wrong**: star-wars records `wave` (Dev's own finding confirms it). The flagship shared module's doc contradicts its own genericity rationale and will mislead SH-6 (battlezone). Fix to "tempest records `level`; star-wars and asteroids record `wave`" on the arcade-shared feat branch BEFORE the v0.4.0 tag is cut. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `star-wars/src/main.ts` and `asteroids/src/main.ts` place the `const highScoreStorage = makeHighScoreStorage(...)` statement BETWEEN import statements (before `import { loadVectorFont }` / `import { createAudioEngine }`). Legal (ES imports hoist; all tests + builds green) but malformed module structure — `tempest/src/main.ts` correctly groups the const AFTER all imports. Tidy on the two feat branches (move the const below the import block) before merge or as a fast follow-up. Confirmed independently by reviewer-preflight. *Found by Reviewer during code review.*
- **Gap** (non-blocking, process): star-wars LOCAL `develop` is STALE (`d9de963`) vs `origin/develop` (`91cdba1`, which already has sw2-2). The feat branch correctly bases on origin/develop, so the PR diff is clean SH-4-only — but the SM should diff/merge against `origin/develop` and re-sync local develop after merge (the recurring gitflow-staleness gotcha). *Found by Reviewer during code review.*
- **Gap** (blocking-at-release): CONFIRMED — all 5 repos pin `#feat/SH-4-shared-highscore` (locks to `6f4da3e`, v0.4.0). Release sequence for SM finish: fix the header comment above → merge arcade-shared → develop → cut+push `v0.4.0` → bump each consumer pin to `#v0.4.0` + `npm install` the tag → merge the 4 consumer PRs. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Finite-score row guard (strengthens tempest/star-wars)**
  - Spec source: context-story-SH-4.md, AC-1 ("a row validator") + AC-3 (lobby imports the same row guard)
  - Spec text: "exports … a row validator" / "The lobby imports the shared … row guard rather than re-deriving the key/shape by hand."
  - Implementation: The shared `isHighScoreRow` requires `Number.isFinite(score)` (and the domain guard requires `Number.isFinite(domainField)`). tempest/star-wars' original guards used loose `typeof x === 'number'`, which ADMITS `Infinity` (a `1e999` row). asteroids already hardened to `Number.isFinite`, and the lobby's `getTopScore`/`scoreOf` demands a finite score. Tests pin the finite behaviour for all consumers.
  - Rationale: One shared guard cannot hold two standards; the finite one is the lobby's actual contract and asteroids' shipped behaviour. Unifying up (stricter) removes the "Infinity locks the qualify boundary / renders 'Infinity' on the HUD" hazard tempest logged as a non-blocking finding. Behaviour change is a strict tightening; no existing tempest/star-wars test asserted the loose case (they explicitly left finiteness unpinned).
  - Severity: minor
  - Forward impact: In GREEN, tempest/star-wars gain finite-score dropping they didn't have. Their existing storage suites don't assert the loose case, so nothing breaks; but those local suites are deleted anyway (superseded — see Delivery Findings).
- **Row-guard split: base `isHighScoreRow` + `makeHighScoreRowGuard(domainKey)`**
  - Spec source: context-story-SH-4.md, AC-1 ("a row validator", singular) + AC-2 ("duplication removed") + Problem statement ("makeHighScoreStorage(gameId, validator)")
  - Spec text: "exports … a row validator" and "makeHighScoreStorage(gameId, validator) factory".
  - Implementation: Two exports instead of one — `isHighScoreRow` (domain-agnostic base: name + finite score, the guard the LOBBY imports) and `makeHighScoreRowGuard(domainKey)` (layers the finite domain-field check, the guard the GAMES pass to `makeHighScoreStorage`).
  - Rationale: The lobby is domain-agnostic (reads only `.score`) while the games must validate their `level`/`wave` field. A single guard can't serve both without the lobby depending on a domain it doesn't use. The domain-guard factory is also where the residual per-game `Number.isFinite(row[field])` line is extracted — required by AC-2 ("duplication removed"), and it makes AC-1's "generic domain field" runtime-observable.
  - Severity: minor
  - Forward impact: Dev implements two guard exports; lobby imports `isHighScoreRow`, games use `makeHighScoreRowGuard(theirField)`.
- **Generic domain field pinned at RUNTIME, not compile-time (in this repo)**
  - Spec source: context-story-SH-4.md, AC-1 ("HighScoreEntry (generic domain field)")
  - Spec text: "@arcade/shared/highscore exports HighScoreEntry (generic domain field)"
  - Implementation: `HighScoreEntry<DomainKey extends string>` is a compile-time generic, but `tsconfig.build.json` compiles only `src/` and vitest strips types — so the RED signal for "generic" is delivered by RUNTIME tests exercising both `'level'` and `'wave'` through the guard/storage factory, not a compile-only annotation.
  - Rationale: A type-only assertion would be vacuous here (no tooling checks tests). Runtime genericity proofs are meaningful and fail correctly in RED. The compile-time proof lands in GREEN via consumers' `tsc --noEmit`.
  - Severity: minor
  - Forward impact: none — stronger coverage, not weaker.
- **RED suite scoped to arcade-shared only (consumer migration deferred to GREEN)**
  - Spec source: context-story-SH-4.md, AC-2 + AC-3 (consumer-side migration)
  - Spec text: "tempest/star-wars/asteroids write high scores via the shared module …" / "The lobby imports the shared key-builder + row guard …"
  - Implementation: No RED tests were committed to the consumer repos; AC-2/AC-3 are verified in GREEN by each consumer's own (existing) suite staying green after rewiring, exactly as SH-3 did.
  - Rationale: The shared contract is the RED deliverable; the consumers already have suites that lock their behaviour and must remain green through the migration. Duplicating them as new RED tests adds no signal.
  - Severity: minor
  - Forward impact: Dev's GREEN verification is per-repo `npm test`, tracked as Delivery Findings above.

### Dev (implementation)
- **star-wars domain field is `wave`, not `level` as the context stated**
  - Spec source: context-story-SH-4.md (Problem) + Sm Assessment scope note
  - Spec text: "tempest/star-wars use `level` … asteroids uses `wave`"
  - Implementation: star-wars migrated with `makeHighScoreRowGuard('wave')` + `HighScoreTable<'wave'>`, matching its ACTUAL code (records the wave reached), not the context's `level`.
  - Rationale: Working code is authoritative over prose context — `star-wars/src/core/highscore.ts` + `main.ts` prove `wave`. The generic shared type made this a one-token choice with no ripple.
  - Severity: minor
  - Forward impact: none — the shared module is generic; SH-6 (battlezone) picks its own field the same way.
- **Lobby row guard tightened: nameless `{score}` rows now rejected**
  - Spec source: context-story-SH-4.md, AC-3
  - Spec text: "The lobby imports the shared key-builder + row guard rather than re-deriving the key/shape by hand."
  - Implementation: lobby `getTopScore` now filters via the shared `isHighScoreRow` (requires a string `name` + finite score), replacing its local `scoreOf` (which accepted ANY object with a finite score, name-less included). One test (`drops malformed rows`) updated to use well-formed named rows.
  - Rationale: AC-3 asks the lobby to use the SAME guard the games write with, and the games always write `{name, score, domain}`. A name-less `{score}` blob is not a row any game produces, so dropping it is correct; real tiles are unaffected. Tightening, not loosening.
  - Severity: minor
  - Forward impact: none for real data; a corrupt/synthetic name-less row no longer contributes a tile score (dropped → tile shows NO SCORE if it was the only row).
- **asteroids render-wiring source-text test re-pointed to the factory calls**
  - Spec source: asteroids/tests/render-wiring.test.ts (existing structural guard)
  - Spec text: asserts `main.ts` calls `loadHighScores(` and `saveHighScores(`
  - Implementation: updated the two regexes to `highScoreStorage.load(` / `highScoreStorage.save(` — the migration replaced the free functions with the shared factory's methods.
  - Rationale: The test guards that main.ts loads at boot + persists on change; the behaviour is unchanged, only the call shape. Leaving it would be a false RED.
  - Severity: minor
  - Forward impact: none.
### Reviewer (audit)

Every logged deviation reviewed:

- **TEA #1 — Finite-score row guard (strengthens tempest/star-wars)** → ✓ ACCEPTED by Reviewer: the finite guard is the lobby's + asteroids' actual standard; unifying up is a strict, safe tightening. No real game row is Infinity; the only affected input is a synthetic `1e999`. Agrees with author reasoning.
- **TEA #2 — Row-guard split (`isHighScoreRow` + `makeHighScoreRowGuard`)** → ✓ ACCEPTED by Reviewer: the lobby is genuinely domain-agnostic (reads only `.score`); a single guard can't serve both without the lobby depending on `level`/`wave` it never reads. The domain-guard factory also removes the residual per-game duplication (AC-2). Sound.
- **TEA #3 — Generic domain field pinned at RUNTIME** → ✓ ACCEPTED by Reviewer: verified `tsconfig.build.json` includes only `src/`; a type-only test assertion would be vacuous here. Runtime genericity proofs (both `level` + `wave` through guard/factory) are meaningful, and consumers' `tsc --noEmit` gives the compile-time proof (all 4 green).
- **TEA #4 — RED scoped to arcade-shared only** → ✓ ACCEPTED by Reviewer: mirrors SH-3; consumers' own suites lock their behaviour and stayed green through the migration (764/512/790/22). No signal lost.
- **Dev #1 — star-wars records `wave`, not `level`** → ✓ ACCEPTED by Reviewer: verified in `star-wars/src/core/highscore.ts` (deleted) + `main.ts` insert `{name, score, wave}`. Code is authoritative; the generic type absorbed it. (Note: the shared module's header comment still says `level` for star-wars — flagged as a [DOC] finding to fix.)
- **Dev #2 — Lobby row guard tightened (name now required)** → ✓ ACCEPTED by Reviewer: verified every game's insert constructs a `name` (tempest `initials`, star-wars `'ACE'`, asteroids `over.initials`), so no real tile loses its score; only synthetic name-less `{score}` blobs drop. Faithful to AC-3 ("the same row guard the games write").
- **Dev #3 — asteroids render-wiring source-text test re-pointed** → ✓ ACCEPTED by Reviewer: verified `main.ts` contains `highScoreStorage.load(`/`.save(`; the regex update tracks the real wiring, behaviour unchanged. Not a weakened test.

**No undocumented deviations found.** Every spec divergence in the diff is logged and now explicitly accepted.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 (style nit) | confirmed 1 (interleaved const, [SIMPLE] Low), 0 dismissed |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — assessed by Reviewer ([EDGE] below) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — assessed by Reviewer ([SILENT] below) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — assessed by Reviewer ([TEST] below) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — assessed by Reviewer ([DOC] below) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — assessed by Reviewer ([TYPE] below) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — assessed by Reviewer ([SEC] below) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — assessed by Reviewer ([SIMPLE] below) |
| 9 | reviewer-rule-checker | No | Skipped | disabled | Disabled via settings — assessed by Reviewer ([RULE] below) |

**All received:** Yes (1 enabled subagent returned; 8 disabled via `workflow.reviewer_subagents` and assessed directly)
**Total findings:** 2 confirmed (both Low, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

Extraction is correct, exhaustively tested (94 + 764 + 512 + 790 + 22 = 1382 tests green across 5 repos), type-clean (all `tsc` builds pass), and every AC is met. No Critical/High issues. Two Low findings, both non-blocking, documented for fix at the release-pin step.

**Data flow traced:** a stored high-score row → `makeHighScoreStorage(gameId, validator).load()` reads `localStorage['${gameId}-high-scores']` → `JSON.parse` (try/catch) → `Array.isArray` gate → `parsed.filter(validator)` drops malformed rows → typed `E[]` into the game. Lobby side: same key via shared `highScoreKey`, `parsed.filter(isHighScoreRow).map(r => r.score)` → `Math.max`. Safe: every parse/access failure degrades to `[]`/`null`, never throws; gameId literals preserve the exact localStorage keys the games already wrote (`tempest`/`star-wars`/`asteroids`-`high-scores`), so no data migration.

**Pattern observed:** faithful SH-2/SH-3 extraction pattern — verbatim logic lifted to `@arcade/shared`, subpath export added (`arcade-shared/package.json:27`), consumers pin a git-URL ref, local copies deleted. Generic `HighScoreEntry<DomainKey>` (`arcade-shared/src/highscore.ts:38`) cleanly unifies `level`/`wave`.

**Error handling:** `getStorage()` (`highscore.ts:129`) swallows access throws → null; `load()` returns `[]` on every unhappy path; `save()` swallows quota/unavailable. Matches the games' original graceful-degradation contract, pinned by tests.

### Rule Compliance (lang-review typescript.md)

- **#1 type-safety escapes** — ✓ No `as any`, no `as unknown as T`, no `@ts-ignore`. Two `value as Record<string, unknown>` casts (`highscore.ts:107,120`) are the standard `unknown`→record idiom, each guarded (object check / `isHighScoreRow` short-circuit). `isHighScoreRow` and the guard returned by `makeHighScoreRowGuard` are type predicates **with** real runtime validation (`typeof` + `Number.isFinite`) — compliant.
- **#2 generic/interface pitfalls** — ✓ `readonly` on every non-mutated array param: `qualifiesForHighScore` (`:60`), `insertHighScore` (`:78`), `save` (`:171`). No `Record<string, any>` (uses `unknown`).
- **#4 null/undefined** — ✓ `globalThis.localStorage ?? null` correct (`?.`/`??` not misused on falsy-valid values); `raw === null` explicit check.
- **#5 module/declaration** — ✓ `verbatimModuleSyntax: true` honoured; consumers use `import type` for `HighScoreTable` and value imports for functions; no `.js`-extension issue (bare specifier `@arcade/shared/highscore` resolved via `exports`).
- **#10 input validation** — ✓ `JSON.parse` output is runtime-validated per row via the injected `validator`, never trusted with `as T`.
- **#11 error handling** — ✓ `catch {}` blocks are intentional graceful degradation with `console.warn` on the parse/quota paths (mirrors the games' shipped behaviour, pinned by tests), not swallowed logic errors.
- **#3 enums / #6 React / #12 bundle** — N/A (pure logic module, no enums/JSX).

### Observations

- `[VERIFIED]` **table logic correct** — `qualifiesForHighScore`/`insertHighScore` (`arcade-shared/src/highscore.ts:60,78`) are byte-identical to the games' proven helpers; boundary (empty/full/tie/truncation/purity) pinned by `tests/highscore.test.ts`. Complies with lang-review #2 (readonly params). Evidence: `insertHighScore` does `table.slice()` then `out.slice(0, MAX_HIGH_SCORES)` — pure, no input mutation (`:81,89`).
- `[VERIFIED]` **localStorage keys preserved** — `makeHighScoreStorage('tempest'|'star-wars'|'asteroids', …)` → `highScoreKey` yields the exact old keys; verified against each game's deleted `STORAGE_KEY`. No high-score data migration. Evidence: `highscore.ts:96` returns `` `${gameId}-high-scores` ``.
- `[EDGE]` `[VERIFIED]` **boundary paths safe** — `qualifiesForHighScore` reads `table[length-1]` only in the `length >= MAX` branch (`:63`); `length < MAX` (incl. 0) returns early, so no empty-array deref. `makeHighScoreRowGuard` never derefs a non-object (the `&&` short-circuits on `isHighScoreRow` first, `:122`). No unhandled boundary.
- `[SILENT]` `[VERIFIED]` **no improper swallowing** — every `catch` degrades per the documented, tested contract; the one non-warning catch (`getItem` throw → `[]`, `:145`) matches the games' original (private-browsing) behaviour. Not a silent logic failure.
- `[TEST]` `[VERIFIED]` **tests non-vacuous** — 40 shared-module tests each assert a concrete value; runtime genericity is exercised for both `level` and `wave`; source-text regexes back the `readonly`/predicate contract that `tsconfig.build` can't gate. Consumer suites stayed green (behaviour-preserving), and the two updated tests (lobby `drops malformed rows`, asteroids `render-wiring`) track real behaviour, not weakened.
- `[TYPE]` `[VERIFIED]` **generic contract sound** — `HighScoreEntry<DomainKey extends string> = HighScoreEntryBase & { [K in DomainKey]: number }` (`:38`); `insertHighScore<E extends HighScoreEntryBase>` preserves the domain field through the sort; all 4 consumers' `tsc --noEmit` pass with `<'level'>`/`<'wave'>`. No stringly-typed escape.
- `[SEC]` `[VERIFIED]` **no security surface** — client-only, per-origin localStorage; gameId is a hardcoded literal (no injection); `JSON.parse` guarded; no secrets/eval/DOM-sink. A user can only poison their own board, which the guards then drop.
- `[RULE]` `[VERIFIED]` **AC-4 single source** — `MAX_HIGH_SCORES` exists only in `arcade-shared/src/highscore.ts:31`; verified removed from `tempest/src/core/rules.ts`, and star-wars/asteroids' declarations were in the now-deleted `highscore.ts`. No per-repo redeclaration remains.
- `[DOC]` **[LOW]** stale/incorrect comment — `arcade-shared/src/highscore.ts:9` says star-wars records `level`; it records `wave`. Non-blocking; fix before the v0.4.0 tag (Delivery Finding logged).
- `[SIMPLE]` **[LOW]** interleaved statement — `const highScoreStorage` sits between imports in `star-wars/src/main.ts` and `asteroids/src/main.ts` (tempest groups it correctly). Works via ES hoisting; tidy before merge (Delivery Finding logged). Corroborated by reviewer-preflight.

### Devil's Advocate

Assume this is broken. **Data migration:** if any gameId literal didn't match the old `STORAGE_KEY`, every player's saved board would silently vanish on first load (new key → `[]` → overwrite). I checked all three: `'tempest'`→`tempest-high-scores`, `'star-wars'`→`star-wars-high-scores`, `'asteroids'`→`asteroids-high-scores` — each equals the deleted module's literal. Safe. **The lobby tightening:** the shared `isHighScoreRow` now requires a string `name`; could a real game persist a name-less row the tile used to show? I traced every insert site — all three hardcode/collect a `name` before insert — so no real tile regresses; only synthetic `{score}` blobs drop, which is correct. **The finite-guard flip:** tempest/star-wars previously admitted `Infinity` (loose `typeof`). A player with a poisoned `1e999` board would now see those rows dropped instead of an "Infinity" HUD line and a permanently-unbeatable qualify boundary — strictly better, and their existing loose-case tests were never written (and are deleted). **What could a malicious user do?** Only edit their own localStorage; the guards drop garbage; there is no backend, no other user, no injection (gameId is a literal, not user input). **Confused user / stressed filesystem:** quota-exceeded on save → swallowed no-op (board just doesn't persist, game keeps playing); corrupt JSON → `[]`; private-browsing access throw → `[]`/no-op. All pinned by tests. **The interleaved `const`:** could ES module hoisting ever leave `makeHighScoreStorage` undefined when the const runs? No — imports are fully initialised before any module-body statement executes, and `@arcade/shared` is a leaf dep (no cycle), so there is no TDZ; it is purely cosmetic. **Weakest point:** the flagship module's header comment is factually wrong about star-wars — harmless at runtime but the exact kind of doc that misleads the next extraction (SH-6). Flagged. Nothing here rises to Critical/High; the substance is correct and exhaustively verified.

**Handoff:** To SM (Winston Smith) for finish-story.