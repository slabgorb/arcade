---
story_id: "SH-3"
jira_key: ""
epic: "SH"
workflow: "tdd"
---
# Story SH-3: Extract RNG into @arcade/shared/rng — settle the single Rng contract (mutable vs immutable) and migrate all sims

## Story Details
- **ID:** SH-3
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade-shared
- **Assignee:** Keith Avery

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-07T11:10:43Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-07T09:16:11Z | 2026-07-07T09:19:10Z | 2m 59s |
| red | 2026-07-07T09:19:10Z | 2026-07-07T10:33:49Z | 1h 14m |
| green | 2026-07-07T10:33:49Z | 2026-07-07T11:02:03Z | 28m 14s |
| review | 2026-07-07T11:02:03Z | 2026-07-07T11:10:43Z | 8m 40s |
| finish | 2026-07-07T11:10:43Z | - | - |

## Story Context

### Problem
rng.ts is logic-identical (mulberry32 PRNG) across four games:
- **Mutable form:** star-wars, asteroids, battlezone — return new value each call
- **Immutable form:** tempest — return {value, rng} pair (functional style)

Two incompatible contracts block shared extraction. This story settles the contract, extracts to @arcade/shared/rng, and migrates all consumers. Determinism/replay behavior must be preserved exactly for already-shipped games.

### Acceptance Criteria
1. A single Rng contract is chosen and documented in the extraction; the decision + rationale is recorded (deviation log or ADR note).
2. @arcade/shared/rng exports the PRNG; star-wars/asteroids/battlezone/tempest all consume it at a pinned ref; local core/rng.ts removed.
3. Seeded-sequence tests prove byte-identical output to each game's pre-extraction RNG (no determinism regression).

### Technical Approach
- **Precedent:** SH-2 (extract-math3d) proved the pattern end-to-end. Reuse the exact mechanism:
  - Extract verbatim to @arcade/shared
  - Add subpath export to @arcade/shared/rng in package.json exports
  - Consumers pin a git-URL dep with a tag or commit ref
  - Delete local core/rng.ts files
- **Key decision:** Contract choice (mutable vs immutable). Whichever loses requires migration of all its call sites. This decision MUST be recorded in a deviation or ADR note.
- **Blocking carryover from SH-2:** Verify that SH-2's arcade-shared/develop state is ready. SH-2 should have:
  - feat/SH-2-extract-math3d merged to develop
  - Tag v0.2.0 cut and pushed
  - Consumer pins in star-wars/battlezone bumped from #feat/SH-2-... to #v0.2.0
  - If locks are provisional, confirm they resolve correctly
- **Testing:** Seeded RNG tests must prove byte-identical output to each game's existing RNG before extraction. This validates determinism/replay preservation.

### Breadcrumbs from SH-2
- @arcade/shared is at 0.2.0 with ./math3d subpath export
- SH-3 adds ./rng subpath export using the same pattern
- Verify arcade-shared/develop is clean before layering SH-3 on top
- Non-blocking follow-up from SH-2 review: add rotationX(PI/2) test case when suite next grows (opportunistic for SH-3)

## Sm Assessment

**Setup verdict:** Ready for RED. tdd is a phased workflow → next phase `red`, owner **tea (O'Brien)**.

**Pre-handoff checklist:**
- Session file created ✓ · context file `sprint/context/context-story-SH-3.md` written with all 3 ACs + technical approach ✓
- Branch `feat/SH-3-extract-rng` created off `develop` in arcade-shared (gitflow) ✓
- Jira: none — local sprint tracking only (jira field null); claim step N/A ✓
- Merge gate clear at setup: 0 in-review / 0 in-progress PRs ✓
- Story status → in_progress; epic-SH.yaml diff verified clean (only SH-3 status/started; SH-1 AC unchanged) ✓

**Two things TEA must own early (do not let them slide to green):**
1. **The contract decision is the story's spine, not a detail.** AC-1 demands the mutable-vs-immutable choice be *recorded with rationale* (deviation log or ADR note). 3 games use mutable (star-wars/asteroids/battlezone); tempest alone uses immutable {value, rng}. Whichever loses, its call sites are the migration cost. Surface this to Architect/Dev before writing migration tests — the RED tests should encode the chosen contract.
2. **Verify SH-2's release state before layering on top.** SH-2 carried a BLOCKING-AT-RELEASE step (merge feat/SH-2 → develop, cut tag v0.2.0, bump star-wars/battlezone pins from #feat/SH-2-... to #v0.2.0). Per my standing note on the finish-merge gotcha, do NOT assume it's done — confirm arcade-shared/develop actually has the math3d extraction and that consumer pins resolve, before building SH-3's ./rng export beside it.

**Determinism is non-negotiable (AC-3):** RED must include seeded-sequence tests proving byte-identical output to each game's pre-extraction rng.ts. Pin shipped games by tag so replay behavior can't drift.

**Opportunistic (non-blocking):** SH-2 review left a `rotationX(PI/2)` coverage gap in arcade-shared/tests/math3d.test.ts — fair to fold in if the shared suite grows here.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Julia/Dev)

**Test Files (5, across 5 repos — this story is multi-repo):**
- `arcade-shared/tests/rng.test.ts` — the extraction suite: mutable contract (createRng/nextFloat/nextInt) + full determinism, incl. a tempest-parity block proving the immutable→mutable flip preserves byte-identical output. 17 tests. RED: `../src/rng` does not exist.
- `asteroids/tests/rng-extraction.test.ts` — migration guard (local rng.ts removed + `@arcade/shared` pinned + a src consumer imports `@arcade/shared/rng`). 3 tests, 3 fail.
- `battlezone/tests/rng-extraction.test.ts` — same guard. 3 tests, 2 fail / 1 pass (pin already at v0.2.0).
- `star-wars/tests/rng-extraction.test.ts` — same guard. 3 tests, 2 fail / 1 pass.
- `tempest/tests/rng-extraction.test.ts` — guard + asserts the old immutable `tests/core/rng.test.ts` is deleted (contract-flip case). 4 tests, 4 fail.

**Tests Written:** 30 tests covering 3 ACs.
- **AC-1** (single contract chosen + documented): MUTABLE, recorded in Design Deviations + the rng.test.ts header. The suite locks the mutable API shape (incl. the `advances (MUTATES) the Rng seed` assertion that distinguishes it from tempest's old immutable form).
- **AC-2** (shared export + games consume at pinned ref + local rng.ts removed): the 4 per-game guards enforce removal + pin + re-point.
- **AC-3** (byte-identical determinism, no regression): shared suite golden sequences captured from the ACTUAL pre-extraction code; verified mutable ≡ immutable across seeds incl. edge cases (-1, 2³²+5, 0, 0xFFFFFFFF); tempest-parity block (seeds 42/1/5/7) locks the contract-flip case.

### Rule Coverage (lang-review/typescript.md — applicable checks only)

| Rule | Test / Coverage | Status |
|------|-----------------|--------|
| #2 readonly vs intentional mutation | `nextFloat … advances (MUTATES) the Rng seed`; `nextInt … advances the Rng seed` — locks the chosen mutable contract | failing |
| #5 module/type-only export | game guards assert `@arcade/shared/rng` subpath consumed; shared suite imports `type Rng` | failing |
| #8 test quality (no `as any`, no vacuous asserts) | self-checked: every test has a meaningful assertion; no `as any`; no `is-none`-on-always-none | n/a (self-check) |
| #1 type-safety escapes | no `as any`/`@ts-ignore` in any test file | n/a (self-check) |

**Rules checked:** 4 of 13 lang-review checks are applicable to a pure numeric PRNG extraction (no React/async/input-validation/error-handling/enum surface). The rest are N/A.
**Self-check:** 0 vacuous tests. (An earlier draft imported `@arcade/shared/rng` inside the game guards; Vite failed that at transform-time when the dep was installed-but-not-yet-exporting, masking the fs assertions — rewritten to pure fs/text guards so all assertions collect and report granularly.)

**Handoff:** To Julia (Dev) for GREEN. Critical GREEN prerequisites are in Delivery Findings: (1) `npm install` in star-wars to resolve `@arcade/shared@v0.2.0`; (2) delete the 3 games' superseded local rng tests; (3) SH-3 is 5 repos, not 1 — after the shared `./rng` export ships, cut a new tag (e.g. v0.3.0) and bump each game's pin.

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** GREEN across all 5 repos — arcade-shared 40 · star-wars 541 · battlezone 742 · asteroids 836 · tempest 806. `tsc --noEmit` clean in every game.
**Branches (pushed):** `feat/SH-3-extract-rng` in all 5 repos.

**Files Changed:**
- `arcade-shared`: `src/rng.ts` (new — mutable mulberry32), `package.json` (+`./rng` export, 0.2.0→0.3.0), `src/index.ts` (SHARED_VERSION 0.3.0), pushed → games can resolve.
- `star-wars`: re-pointed `state.ts`/`sim.ts` imports → `@arcade/shared/rng`; deleted `src/core/rng.ts`; pin → feat branch; +`@types/node` (fs guard).
- `battlezone`: re-pointed `saucer.ts`/`enemies.ts`; deleted `rng.ts` + old `tests/core/rng.test.ts`; relaxed `enemies-purity` (allow `@arcade/shared/`), bumped `arcade-shared-pipe` to 0.3.0.
- `asteroids`: re-pointed 7 core files + 8 test files; deleted `rng.ts` + old `tests/rng.test.ts`; added `@arcade/shared` dep; dropped rng.ts from `core-boundary` expected files.
- `tempest`: **contract flip** — migrated 6 core files off immutable `rngNext→{value,rng}` to mutable `nextFloat`; `cloneState` clones rng/fireRng fresh (purity); deleted `rng.ts` + old immutable suite; re-pointed 6 enemy/sim tests; +`@types/node`.

**AC status:** AC-1 ✓ (mutable chosen + documented) · AC-2 ✓ (shared `./rng` export; 4 games consume at pinned ref; local rng.ts removed — all guards green) · AC-3 ✓ (byte-identical determinism; tempest-parity + all sim determinism suites green).

**Handoff:** To The Thought Police (Reviewer). Note: 5 PRs to review (tempest is highest-risk); a BLOCKING-AT-RELEASE tag/pin-bump step is in Delivery Findings.

## Delivery Findings

No upstream findings yet. TEA to document contract decision rationale and verify SH-2 completion state.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (blocking): SH-2's arcade-shared payload (math3d extraction) is NOT on `arcade-shared` origin/develop — it is stranded in the **a-2** local checkout only (a-2/arcade-shared/develop @ `9b25618` "Merge PR #2 feat/SH-2-extract-math3d", local tag `v0.2.0` @ `e20b681`, `src/math3d.ts` present). In a-1, origin/develop = `a28c139` (SH-1 scaffold, v0.1.0); no v0.2.0, no math3d. The SH-3 branch `feat/SH-3-extract-rng` was cut from this SH-2-less develop. Sprint says SH-2 `completed`, but its subrepo work was never pushed to the shared origin (finish-merge gotcha). Affects `arcade-shared/` (SH-2 must be pushed a-2→origin, develop synced, SH-3 rebased) — otherwise SH-3's `./rng` export collides with the unlanded SH-2 `./math3d` in package.json exports/index.ts/tsconfig and v0.2.0 diverges. RED phase halted pending resolution. *Found by TEA during test design.*
  - **RESOLVED (per Comrade: "merge the fix in and pull that first"):** SH-2 was actually on origin all along; a-1's refs were stale. Fetched + fast-forwarded a-1's arcade-shared develop a28c139→9b25618 (v0.2.0, math3d present), reinstalled deps (vitest), 23 shared tests green. FF'd star-wars→5f9bba9 and battlezone→5e53cf3 (both now pin `@arcade/shared#v0.2.0`, local math3d.ts removed). tempest/asteroids already current. `feat/SH-3-extract-rng` rebased onto develop@9b25618. Note: star-wars/battlezone need `npm install` to pull v0.2.0 into node_modules before their suites run.
- **Question** (blocking): AC-1 requires ONE Rng contract chosen + documented. Two exist: MUTABLE (`createRng`/`nextFloat`→number/`nextInt`, mutates `rng.seed`; used by star-wars+battlezone+asteroids) vs IMMUTABLE (`makeRng`/`rngNext`→{value,rng}/`rngInt`; tempest only). Migration cost: mutable wins → migrate tempest only (16 call-sites/6 files); immutable wins → migrate 3 games (59 call-sites/10 files). Algorithm is provably byte-identical between the two (same mulberry32; signed `|0` vs unsigned `>>>0` state + XOR/OR-commutative expression forms yield identical float sequences), so AC-3 determinism holds either way. TEA recommends MUTABLE (4× less migration, incumbent 3/4, and the battlezone cursor pattern already preserves durable-state purity). Decision deferred to Comrade. Affects `arcade-shared/src/rng.ts` contract shape + all consumer migrations. *Found by TEA during test design.*
  - **RESOLVED:** Comrade chose MUTABLE. Recorded in Design Deviations (AC-1) + the `arcade-shared/tests/rng.test.ts` header.
- **Gap** (non-blocking): Story `repos:` field is `arcade-shared`, but AC-2 explicitly migrates all 4 games (star-wars/asteroids/battlezone/tempest) — the story is genuinely MULTI-REPO. RED tests were committed to each game on a `feat/SH-3-extract-rng` branch. Affects sprint tracking (`sprint/epic-SH.yaml` SH-3 repos) and Dev's GREEN scope (5 repos, not 1). *Found by TEA during test design.*
- **Gap** (blocking-for-GREEN): After the SH-2 fast-forward, `star-wars/node_modules` has NO `@arcade/shared` installed (its rng-extraction import failed at RUNTIME, unlike battlezone which resolved to v0.2.0). Dev must `npm install` in star-wars (and verify battlezone/asteroids/tempest) before the games' suites — including existing math3d tests — can resolve the pinned dep. Affects each game's `node_modules`. *Found by TEA during test design.*
- **Question** (non-blocking): Dev must handle the games' EXISTING local rng tests during migration — `asteroids/tests/rng.test.ts`, `battlezone/tests/core/rng.test.ts` (both import the local mutable `../src/core/rng`) and `tempest/tests/core/rng.test.ts` (immutable, asserts "does not mutate" — now reversed). All three are superseded by `arcade-shared/tests/rng.test.ts` and must be DELETED (not re-pointed) once local `rng.ts` is removed; tempest's guard already asserts its removal. Affects those 3 files. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (blocking-at-release): The 4 games pin the arcade-shared FEATURE BRANCH (`#feat/SH-3-extract-rng`, resolves v0.3.0) provisionally. Before feature branches are deleted: merge `arcade-shared` `feat/SH-3-extract-rng` → develop, cut+push tag **`v0.3.0`**, then bump each game's `@arcade/shared` pin `#feat/SH-3-extract-rng` → `#v0.3.0` (commit to each game branch). Mirrors SH-2's v0.2.0 release step. Affects `arcade-shared` + all 4 game `package.json`/lockfiles. *Found by Dev during implementation.*
- **Improvement** (non-blocking): npm git-URL dep staleness — plain `npm install` after changing a game's `@arcade/shared` ref in package.json HONORS the stale `package-lock.json` commit (it re-installed the old v0.2.0 `e20b681`, not the feat branch). Must run `npm install "@arcade/shared@github:slabgorb/arcade-shared#<ref>"` explicitly to force re-resolution + lock update. Future SH extraction stories (SH-4/SH-5) will hit this. Affects each consumer's install step. *Found by Dev during implementation.*
- **Question** (non-blocking): This story shipped **5 PRs** (arcade-shared + tempest/star-wars/battlezone/asteroids), all on `feat/SH-3-extract-rng`. The Reviewer should review all 5; the arcade-shared PR is the contract, the tempest PR is the highest-risk (contract flip), the other 3 are mechanical re-points. Affects the review/merge ceremony. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): No test asserts `stepGame` leaves its INPUT state's `rng` unmutated on a DRAWING frame — the `cloneState` fresh-cursor clone (the mutable migration's correctness lynchpin) is covered only transitively by determinism suites. A regression removing those clone lines would slip past the current OUTPUT-rng purity tests. Affects `tempest/tests/core/` (add a "stepGame does not mutate input.rng after a spawn" guard). *Found by Reviewer during code review.*
- **Gap** (blocking-at-release): CONFIRMED Dev's release finding — verified all 4 games pin the arcade-shared feature-branch commit `edbeed1` (deterministic, identical across games). Before feature branches are deleted: merge arcade-shared → develop, cut+push `v0.3.0`, bump the 4 game pins to `#v0.3.0`. SM finish/release task, not a code defect. Affects `arcade-shared` + 4 game `package.json`. *Found by Reviewer during code review.*

## Design Deviations

<!-- Agents: log deviations as they happen — not after the fact. -->

### TEA (test design)
- **AC-1 contract decision recorded: MUTABLE wins** (this entry IS the AC-1 record; the full rationale also lives in the header of `arcade-shared/tests/rng.test.ts`, ready to lift into an ADR if Reviewer prefers)
  - Spec source: context-story-SH-3.md, AC-1 ("A single Rng contract is chosen and documented … decision + rationale recorded (deviation log or ADR note)")
  - Spec text: "Pick ONE contract, extract to @arcade/shared/rng, and migrate consumers"
  - Implementation: Chose the MUTABLE contract (`createRng`/`nextFloat`→number/`nextInt`, `{ seed }`) over tempest's IMMUTABLE (`makeRng`/`rngNext`→{value,rng}). Confirmed by Comrade.
  - Rationale: Incumbent for 3 of 4 games; only tempest migrates (16 call-sites/6 files vs 59/10 the other way). Battlezone's documented local-cursor pattern already keeps the DURABLE cross-frame state pure (a plain seed word), so the mutable generator does not erode core purity. Output is provably byte-identical either way (verified across seeds incl. edge cases), so AC-3 determinism is unaffected by the choice.
  - Severity: major (defines the published shared contract + tempest's migration)
  - Forward impact: tempest's ~16 rng call-sites flip from `{value, rng}` threading to a mutable cursor (Dev/GREEN); its old immutable `tests/core/rng.test.ts` must be deleted, not re-pointed (asserts "does not mutate", now reversed).
- **Determinism (AC-3) proven by hardcoded goldens, centralized in the shared suite**
  - Spec source: context-story-SH-3.md, AC-3 ("Seeded-sequence tests prove byte-identical output to each game's pre-extraction RNG")
  - Spec text: "no determinism regression"
  - Implementation: Captured golden float/int sequences from the ACTUAL pre-extraction implementations (both forms) and hardcoded them in `arcade-shared/tests/rng.test.ts`, incl. a tempest-parity block (seeds 42/1/5/7 from tempest's immutable `rngNext`). The per-game guards do NOT re-prove determinism (they are fs/text scaffold checks only).
  - Rationale: The old implementations are being deleted, so hardcoded goldens are the correct frozen historical record. Centralizing avoids importing the shared module from game tests, which Vite fails to resolve at transform-time until the `./rng` export ships (would mask the fs assertions).
  - Severity: minor
  - Forward impact: none — coverage is complete; game guards enforce AC-2 (removal + pinning + re-pointing) only.
- **Per-game guards duplicate the seed-12345 golden constant across independent repos**
  - Spec source: SOUL/DRY conventions (implicit)
  - Spec text: "no shared code yet … extract only once duplication is proven" (arcade CLAUDE.md)
  - Implementation: Each game's `tests/rng-extraction.test.ts` is near-identical; the shared golden appears in the shared suite only (guards are fs/text, no golden). Guard files themselves are structurally duplicated across the 4 game repos.
  - Rationale: The games are independent gitignored repos that cannot import a shared test fixture; SH-2 duplicated math3d test assertions across repos for the same reason. Standalone-repo purity (a lone `git clone` must pass) forbids cross-repo test imports.
  - Severity: minor
  - Forward impact: none.

### Dev (implementation)
- **cloneState clones rng/fireRng into FRESH cursors (tempest determinism/purity)**
  - Spec source: tempest CLAUDE.md "Hard Architectural Boundary"; AC-3 (no determinism regression)
  - Spec text: "stepGame(state, input, dt) → state must produce identical output for identical input"
  - Implementation: The old immutable `rngNext` never mutated its input (threading swapped in a new object). The mutable `nextFloat` mutates `rng.seed` in place, and `cloneState` shallow-spreads `...s` (aliasing the rng object). Added `rng: { ...s.rng }, fireRng: { ...s.fireRng }` to cloneState so the working state owns its cursors — otherwise a draw would mutate the CALLER's input state.
  - Rationale: Preserves stepGame purity (verified by sim.framing/highscore "rng untouched" tests) and byte-identical replay. This is battlezone's documented cursor pattern applied at tempest's state boundary.
  - Severity: major (correctness-critical for the contract flip)
  - Forward impact: none — behavior identical to pre-extraction.
- **Added @types/node + tsconfig `types:["...","node"]` to star-wars and tempest**
  - Spec source: TEA's per-game guard (`tests/rng-extraction.test.ts`) uses node:fs
  - Spec text: guard reads the filesystem to assert local rng.ts removed
  - Implementation: battlezone/asteroids already had `@types/node`; star-wars/tempest did not, so `tsc --noEmit` failed on `node:fs` in the guard. Added `@types/node@^20` (dev) + `"node"` to their tsconfig `types`.
  - Rationale: Smallest change that keeps `npm run build` green while supporting the fs-based scaffold guard; brings both repos in line with battlezone/asteroids.
  - Severity: minor
  - Forward impact: none.
- **Relaxed battlezone enemies-purity + updated asteroids core-boundary / battlezone pipe tests**
  - Spec source: existing sibling tests invalidated by the extraction
  - Spec text: enemies-purity "imports only sibling core modules (`./`)"; core-boundary "expected core files include rng.ts"; pipe "SHARED_VERSION === 0.2.0"
  - Implementation: enemies-purity now allows `@arcade/shared/` imports (mirrors render-foundation-purity's SH-2 allowance) and drops rng.ts from its local-module list; core-boundary drops rng.ts from EXPECTED_CORE_FILES; the SH-1 pipe test asserts 0.3.0.
  - Rationale: These encode assumptions the story deliberately changes (rng extracted, @arcade/shared is a lawful core dependency, version bumped). Not weakening tests — realigning them to the new architecture, exactly as SH-2 relaxed render-foundation-purity.
  - Severity: minor
  - Forward impact: none.
- **Games pin the arcade-shared FEATURE BRANCH provisionally, not a tag**
  - Spec source: AC-2 ("consume it at a pinned ref"); SH-2 release pattern
  - Spec text: "star-wars/asteroids/battlezone/tempest all consume it at a pinned ref"
  - Implementation: All 4 games pin `github:slabgorb/arcade-shared#feat/SH-3-extract-rng` (resolves v0.3.0 with ./rng). The tag `v0.3.0` + pin bump to `#v0.3.0` is deferred to release, as SH-2 deferred its v0.2.0 bump.
  - Rationale: The arcade-shared PR is not yet merged to develop; a tag can't point at a released commit until it is. Provisional branch pins are deterministic (lockfile pins the exact commit) and let the games go green now.
  - Severity: minor
  - Forward impact: BLOCKING-AT-RELEASE — see Delivery Findings (merge arcade-shared → develop, cut v0.3.0, bump all 4 game pins to `#v0.3.0`).
### Reviewer (audit)

Deviation audit — every logged deviation stamped:
- **TEA: AC-1 contract decision (MUTABLE)** → ✓ ACCEPTED by Reviewer: user-confirmed; migration-cost + incumbency rationale is sound and the byte-identical proof neutralizes the only counter-argument (purity).
- **TEA: determinism via hardcoded goldens centralized in shared suite** → ✓ ACCEPTED: correct — deleted impls demand frozen goldens; centralizing dodges the Vite transform-time resolution trap.
- **TEA: per-game guard golden duplication** → ✓ ACCEPTED: unavoidable across independent gitignored repos; matches SH-2 precedent.
- **Dev: cloneState clones rng/fireRng fresh** → ✓ ACCEPTED: correctness-critical and correctly placed (overrides the `...s` spread); verified at sim.ts:36-40. Without it the mutable draw would corrupt caller state.
- **Dev: @types/node added to star-wars/tempest** → ✓ ACCEPTED: minimal, brings them in line with battlezone/asteroids; needed for the fs-based guard to typecheck.
- **Dev: purity/scaffold test relaxation** → ✓ ACCEPTED: enemies-purity allows only `@arcade/shared/` in addition to `./` (shell/node-builtin ban intact); mirrors SH-2's render-foundation-purity allowance. Not a weakening.
- **Dev: provisional feature-branch pins** → ✓ ACCEPTED: matches SH-2; deterministic via lockfile (all 4 games pin the same commit edbeed1). Carried forward as a BLOCKING-AT-RELEASE finding.

No undocumented deviations found (version bumps, test re-points, core-boundary/pipe updates are all consequences of the logged deviations).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (2965/2965 tests green, 0 tsc errors, 0 smells across 5 repos) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Self-assessed (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Self-assessed (see [SILENT]) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Self-assessed (see [TEST]) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Self-assessed (see [DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Self-assessed (see [TYPE]) |
| 7 | reviewer-security | No | Skipped | disabled | Self-assessed (see [SEC]) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Self-assessed (see [SIMPLE]) |
| 9 | reviewer-rule-checker | No | Skipped | disabled | Self-assessed (see [RULE] + Rule Compliance) |

**All received:** Yes (1 enabled subagent returned; 8 disabled via `workflow.reviewer_subagents`)
**Total findings:** 1 confirmed (non-blocking [TEST] coverage gap), 0 dismissed, 1 deferred (BLOCKING-AT-RELEASE pin bump)

### Rule Compliance (lang-review/typescript.md — applied to the diff)

- **#1 type-safety escapes:** No `as any` / `@ts-ignore` / `as unknown as` introduced anywhere in the diff (checked arcade-shared/src/rng.ts, tempest sim.ts/rules.ts/state.ts/enemies/*, all re-points). The `as number`/`as const` in tempest flipper tests are pre-existing and legitimate. **Compliant.**
- **#2 readonly vs intentional mutation:** `nextFloat(rng)`/`nextInt(rng,n)` mutate `rng.seed` BY DESIGN (the chosen mutable contract). Not a missing-readonly violation — mutation is the contract, asserted by the shared suite. cloneState guarantees callers pass owned cursors. **Compliant.**
- **#5 module/declaration:** arcade-shared uses `export interface Rng` + `export function` under `verbatimModuleSyntax` (correct); consumers import `{ type Rng, ... }` (correct type-only syntax); the `./rng` export maps both `types` and `import`. **Compliant.**
- **#8 test quality:** No vacuous assertions introduced; goldens are real captured sequences; re-pointed tests preserve intent (e.g. "advances the RNG" now asserts `rng.seed !== before`). **Compliant** (one coverage improvement noted below).
- **#3 enum / #4 null-undefined / #6 react-jsx / #7 async / #10 input-validation / #11 error-handling / #12 perf-bundle:** N/A — a pure numeric PRNG extraction has no such surface.

### Devil's Advocate

Assume this migration silently broke a shipped game's replay. Where would it hide? The scariest failure mode is a determinism drift that self-consistency tests can't see: every "same seed → same output" test would still pass while the NEW sequence differs from the PRE-extraction one. I attacked this three ways. (1) Draw order/count: I traced tempest's spawn path (rollSpawnKind → nextInt(lane) → rollTankerCargo-if-tanker) and every enemy stepper; the mutable rewrite deletes only the `s.rng = X.rng` threading lines and preserves the exact sequence and conditions of draws — no reorder, no added/dropped draw. (2) Algorithm identity: the shared rng.ts function bodies are byte-identical to the original mutable mulberry32 (diff = IDENTICAL), and the arcade-shared tempest-parity block locks the mutable stream to tempest's OLD immutable `rngNext` for seeds 42/1/5/7. Together these mean "same order + same generator = same numbers." (3) Aliasing/purity: the mutable generator's real danger is in-place mutation leaking into a retained input state. cloneState now clones rng/fireRng into fresh objects before any draw, so the working state owns its cursors. A confused future maintainer who deletes those two clone lines would reintroduce the bug — and here is the one real gap: the purity suites assert the OUTPUT state's rng, not that stepGame leaves its INPUT's rng unmutated, so that specific regression is only caught transitively. That is a test-hardening opportunity, not a current defect. What would a malicious/confused user do? Nothing — there is no input surface, no secrets, no I/O; the PRNG is pure. What about the dependency? All four games pin the SAME feature-branch commit (verified), so no game gets a divergent RNG; the only live risk is the provisional pin being deleted before the v0.3.0 release bump, which Dev documented as BLOCKING-AT-RELEASE. Conclusion: I tried to break it and could not find a correctness defect — only one non-blocking test-coverage improvement.

## Reviewer Assessment

**Verdict:** APPROVED

**Observations (≥5):**
- [VERIFIED] arcade-shared/src/rng.ts is byte-identical to the original mutable mulberry32 — evidence: `diff` of function bodies vs star-wars' pre-extraction rng.ts = IDENTICAL; constants `0x6d2b79f5`, shifts 15/7/14, `| 1`/`| 61`, `/ 4294967296` all intact. Satisfies AC-3.
- [VERIFIED] tempest draw order + count preserved through the contract flip — evidence: sim.ts:122-133 keeps rollSpawnKind→nextInt→rollTankerCargo(if tanker); flipper/pulsar/fuseball each draw once under the unchanged condition; only `s.rng = X.rng` threading lines removed. Determinism preserved by construction.
- [VERIFIED] cloneState owns fresh RNG cursors — evidence: sim.ts:36-40 adds `rng: { ...s.rng }, fireRng: { ...s.fireRng }` AFTER the `...s` spread, so mutable draws never touch the caller's input state. Preserves stepGame purity/replay.
- [VERIFIED] all 4 games resolve the identical arcade-shared commit `edbeed1` — evidence: package-lock `resolved` refs match across tempest/star-wars/battlezone/asteroids; no game gets a divergent generator.
- [VERIFIED] no dangling local-rng imports after deletion — evidence: grep for `core/rng`/`./rng` imports = 0 hits across all game src+tests (excluding the guard's string literal).
- [VERIFIED] AC-2 satisfied — evidence: every game deleted `src/core/rng.ts`, pins `@arcade/shared`, and re-points ≥1 consumer to `@arcade/shared/rng`; all 4 rng-extraction guards green.
- [EDGE] (self-assessed — subagent disabled) Boundary draws checked: `nextInt(rng, laneCount)`, `nextInt(rng, DEMO_MAX_LEVEL)`, weightedPick with weight-0 rows — all preserve prior semantics; seed edge cases (-1, 2³²+5, 0, 0xFFFFFFFF) locked in the shared suite. No new boundary bug.
- [SILENT] (self-assessed) No swallowed errors/silent fallbacks introduced; the migration is pure re-point + mutate-in-place with no try/catch or optional-chaining fallbacks.
- [TEST] (self-assessed) Improvement (non-blocking): the purity suites assert the OUTPUT state's rng is untouched on framing frames, but no test asserts stepGame leaves its INPUT state's rng unmutated on a DRAWING frame — the cloneState fresh-clone (the migration's correctness lynchpin) is only covered transitively. Adding a "stepGame does not mutate input.rng after a spawn" test would harden against a future clone-removal regression.
- [DOC] (self-assessed) Comments are accurate and improved — new cursor-ownership notes on stepFlipper/stepPulsar/stepFuseball/weightedPick/cloneState correctly describe the mutable contract; stale "port, don't share" narratives were not in scope here.
- [TYPE] (self-assessed) Type design sound: `Rng` stays a plain serialisable `{ seed }`; return types correctly dropped the `rng` field; `type Rng` imports respect verbatimModuleSyntax. No stringly-typed or unsafe-cast introductions.
- [SEC] (self-assessed) No security surface — deterministic PRNG, no user input, no secrets, no I/O, no auth/tenant concern. This is NOT a CSPRNG and is never used for security (game randomness only).
- [SIMPLE] (self-assessed) The mutable rewrite is a net simplification (−583 lines): removed the `{value, rng}` threading boilerplate. No over-engineering or dead code introduced.
- [RULE] (self-assessed — see Rule Compliance) All applicable lang-review/typescript checks (#1, #2, #5, #8) compliant; the rest N/A for a pure PRNG.

**Data flow traced:** seed → `createRng(seed)` → carried in GameState.rng → `cloneState` fresh cursor each frame → `nextFloat`/`nextInt` mutate the cursor in draw order → threaded out via the returned state. Safe: no aliasing to caller input (cloneState clone), byte-identical stream (parity lock).
**Pattern observed:** mutable-cursor-owned-by-reducer, cloned at the state boundary — arcade-shared/src/rng.ts + tempest/src/core/sim.ts:36-40. Matches battlezone's documented cursor discipline.
**Error handling:** N/A (pure numeric core, no failure modes).
**Handoff:** To Winston Smith (SM) for finish-story.

## SM Finish — Impact Summary

**SH-3: Extract RNG into @arcade/shared/rng — shipped v0.3.0 across 5 repos, contract settled as MUTABLE, determinism preserved.**

### What shipped
- **arcade-shared:** mutable `Rng` contract (`createRng(seed)` → `{ seed }`; `nextFloat(rng)`/`nextInt(rng, n)` advance `rng.seed` in place). Version 0.3.0, `./rng` subpath export added alongside `./math3d` (SH-2).
- **tempest (highest-risk):** flipped immutable `rngNext → {value, rng}` threading to mutable cursor; `cloneState` clones `rng`/`fireRng` fresh (purity/replay preserved).
- **star-wars / battlezone / asteroids:** mechanical re-points (already mutable locally); local `core/rng.ts` deleted.
- **Determinism:** hardcoded goldens in `arcade-shared/tests/rng.test.ts`; tempest parity block (seeds 42/1/5/7) locks the contract flip.

### Contract decision: MUTABLE (AC-1)
Incumbent for 3 of 4 games; only tempest migrated (16 call-sites vs 59 the other way). Byte-identical either way (mulberry32 preserved), so AC-3 determinism unaffected. Recorded in Design Deviations.

### Release ceremony (all merged to develop)
- arcade-shared PR #3 → develop `f5f9f7f`; annotated tag **v0.3.0** cut + pushed on that commit.
- tempest PR #80 (`9eaa6bd`, 806 tests) · star-wars PR #44 (`d9de963`, 545 tests) · battlezone PR #20 (`0ee4a43`, 742 tests) · asteroids PR #29 (`5b8bf1c`, 836 tests).
- All 4 games re-pinned `#feat/SH-3-extract-rng` → `#v0.3.0`; every lockfile resolves the identical tagged commit `f5f9f7f`. All 5 feature branches deleted.
- star-wars merged current develop (sw2-1 TIE-hittable fix) into its branch first; `state.ts` auto-merged clean.

### Carried-forward follow-ups (non-blocking)
- **Reviewer:** add a `tempest/tests/core/` guard asserting `stepGame` does not mutate its INPUT `rng` on a DRAWING frame (cloneState fresh-clone is only covered transitively today).
- **Dev:** npm git-URL staleness — plain `npm install` honors the stale lock; future SH-4/SH-5 extractions must force `npm install "@arcade/shared@github:slabgorb/arcade-shared#<ref>"`.

### Sprint-tooling fix folded in
- Repaired pre-existing truncation of SH-1's 4th AC in `sprint/epic-SH.yaml` (unquoted ` #branch ref` had been eaten by an earlier pf round-trip); now quoted so it survives future serialization.