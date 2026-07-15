---
story_id: "rb4-3"
jira_key: "rb4-3"
epic: "rb4"
workflow: "tdd"
---
# Story rb4-3: DETERMINISM — the sim seeds its RNG from Date.now(); the ROM's RANDOM is an LFSR

## Story Details
- **ID:** rb4-3
- **Jira Key:** rb4-3
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T16:15:10Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T15:33:29+00:00 | 2026-07-15T15:35:44Z | 2m 15s |
| red | 2026-07-15T15:35:44Z | 2026-07-15T15:59:11Z | 23m 27s |
| green | 2026-07-15T15:59:11Z | 2026-07-15T16:05:08Z | 5m 57s |
| review | 2026-07-15T16:05:08Z | 2026-07-15T16:15:10Z | 10m 2s |
| finish | 2026-07-15T16:15:10Z | - | - |

## Story Summary
Small, high-priority bug that unblocks regression testing for the entire epic. The sim currently seeds its RNG from Date.now(), violating the core/shell boundary and preventing deterministic replay testing. The ROM's RANDOM is a pure software LFSR. This story eliminates all wall-clock dependencies from core/ and the sim-step path, threads a seeded Rng through the sim, and adds a determinism test.

**Type:** bug  
**Points:** 3  
**Priority:** p1  
**Repos:** red-baron

## Acceptance Criteria
1. Zero calls to Date.now() / performance.now() / Math.random() remain anywhere in src/core/ or in the sim-step path of src/main.ts. A test greps for them.
2. One seeded Rng is threaded through the sim; the SHELL owns the seed and passes it in. The same seed + the same inputs reproduce the same game, pinned by a determinism test.
3. The determinism test fingerprints a full multi-wave run (enemy spawn sides, blimp rolls, wave composition) and asserts two same-seed runs are identical.

## Key Technical Notes
- The red-baron repo enforces a core/shell boundary: src/core/ is the pure deterministic sim, src/shell/ is render/audio/input/storage. The sim MUST NOT read wall-clock time.
- arcade-shared exports an /rng subpath (seeded PRNG). Check whether red-baron already consumes it before introducing a new one.
- The offending call sites: src/main.ts:467 (createRng((Date.now() + kills)) for wave spawn) and src/main.ts:349 (blimp RNG seeded from wall clock). Verify current line numbers — the file has had rb4-1/rb4-4/rb4-5 land on it.
- The SHELL owns the seed and passes it into the sim; a determinism test should fingerprint a full multi-wave run (enemy spawn sides, blimp rolls, wave composition).

## SM Assessment

**Routing:** New work, `tdd` (phased) workflow → RED phase → TEA (Han Solo) writes failing tests.

**Readiness — clear to proceed:**
- No blocking dependencies. Unlike every *numeric* story in this epic, rb4-3 carries **no `Depends on rb4-1` clause** — it is a determinism/boundary fix, not a constant correction. rb4-1 (radix sweep) and rb4-2 (doc retraction) are both `done` regardless, so nothing here can re-bake a decimal reading.
- Merge gate clear: `gh pr list -R slabgorb/red-baron --state open` → empty. No open PRs to block new work.
- Branch `fix/rb4-3-deterministic-rng` created off `develop` (red-baron PRs target `develop`).
- Session + story-context artifacts verified on disk.

**Nature of the impediment (for TEA to test against):**
- Two wall-clock leaks feed the sim's RNG: wave spawn (`createRng(Date.now() + kills)`) and the blimp roll, both in `src/main.ts`. The audit named them at :467 and :349, but rb4-1/rb4-4/rb4-5 have since landed on `main.ts` — **verify current line numbers, do not trust the stale ones.**
- The ROM's `RANDOM` (RBARON.MAC:6193) is a pure software LFSR with no clock input — the fidelity target is determinism, not a specific algorithm.
- This violates the core/shell boundary (the sim must not read wall-clock time) AND makes same-seed regression testing impossible — which is the capability the rest of epic rb4 depends on. Hence "do it early."

**Guardrails for RED:**
- AC1 is grep-shaped: a test that fails if `Date.now()`/`performance.now()`/`Math.random()` appears in `src/core/` or the sim-step path of `src/main.ts`. Write it to turn red against the current code first.
- AC3 wants a *behavioral* fingerprint (enemy spawn sides, blimp rolls, wave composition) of a full multi-wave run — not a shallow "the seed matched" tautology. Two same-seed runs must be byte-identical on observable outcomes.
- Check whether red-baron already consumes `@arcade/shared` `/rng` (seeded PRNG) before introducing a new Rng — the shell should own the seed and thread it in.

**Not in scope:** no numeric-constant work; do not touch topology.ts or the picture-ROM geometry.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Determinism/boundary bug with three testable ACs — a grep boundary guard and a behavioural determinism proof.

**Test Files:**
- `tests/sim-clock-free.test.ts` — AC-1 grep tripwire. Core/ is wall-clock-free (regression guard, green), and main.ts reads a clock ≤1× with the sim-step path (preMotionFrame + frame) clean (RED ×3 today).
- `tests/determinism.test.ts` — AC-2/AC-3 behavioural proof. Boots the REAL loop twice against a fake DOM, injects a shell seed via `?seed=` and controls `Date.now()` independently, holds fire for ~57 s of game time, and fingerprints the full painted stream.

**Tests Written:** 6 failing tests covering 3 ACs.
**Status:** RED (verified — all 6 are ASSERTION failures, not compile/harness errors; full suite 1013/1019 green, only these two files red; tsc clean).

**How the two properties defeat the vacuity trap** (sidecar: "a SEEDED RNG makes 'it's deterministic' vacuous"):
- `boot-cockpit.ts` mocks `Date.now()`, so a naive same-seed test is green against the BROKEN code. This file never freezes the clock. It pins (1) **determinism/clock-independence** — same seed, DIFFERENT clock → identical run (RED: diverges at calc frame 1 today); and (2) **seed sensitivity** — DIFFERENT seed, same clock → different run (RED: identical today because the seed is ignored). (2) is the anti-vacuity guard: an empty/frozen run could never pass it.

### Rule Coverage

| Rule (lang-review typescript.md) | Test | Status |
|----------------------------------|------|--------|
| #4 null/undefined — `\|\|` vs `??` on falsy-but-valid (seed `0`) | `seed 0 is honoured as a seed, not treated as absent (?? not \|\|)` | failing (RED) |
| #8 test quality — no vacuous assertions | seed-sensitivity test is the explicit anti-vacuity guard; self-checked | pass (self-check) |
| #1–3, #5–7, #9–13 | — | N/A (no new types/enums/generics, no user-input types, no React/JSX, no async, no error-handling or build-config change) |

**Rules checked:** 1 of 1 materially-applicable lang-review rule (#4) has a dedicated enforcement test; #8 satisfied by the sensitivity guard + self-check.
**Self-check:** 0 vacuous assertions. Every `it` asserts a divergence index or a comment-stripped source fact; the sensitivity test proves the fingerprints carry real RNG-driven content.

**Handoff:** To Dev (Yoda) for GREEN. The fix: the shell mints/reads ONE seed (clock-independent, `?seed=`-injectable per the Delivery Finding), threads a single seeded Rng through the sim, and deletes all three `createRng(Date.now()…)` sites.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/main.ts` — the shell resolves ONE seed at boot (`?seed=<n>` URL param, else a single fresh-game `Date.now()`), and threads it through the three Rng streams (blimp, ace, per-wave). All three `createRng(Date.now()…)` sites are gone; the sim-step path reads no clock.

**How each AC is met:**
- **AC-1** — `src/core/` is clock-free (unchanged); `main.ts` now reads a wall clock exactly ONCE (the fresh-game fallback, at boot, above `preMotionFrame`); the sim-step path (preMotionFrame + frame) reads no clock. Grep tripwire green.
- **AC-2** — one shell-owned seed governs all randomness and is passed in via `?seed=`; the seed threads through every stream. `!== null` (not `||`) so seed `0` is honoured.
- **AC-3** — determinism test green: same seed + different clock → identical run; different seed + same clock → different run.

**Tests:** 1019/1019 passing (GREEN); typecheck clean (tsc --noEmit exit 0). No regressions — every booting test mocks `Date.now()` to `SEED_MS`, and the fresh-game fallback still reads `Date.now()`, so their seed (and behaviour) is byte-identical to before.
**Branch:** `fix/rb4-3-deterministic-rng` (to be pushed).

**Handoff:** To Reviewer (Obi-Wan) — note the AC-1 grep is a weak tripwire by design; the real proof the clock is gone is the behavioural determinism test, which is green.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1019/1019 green, tsc clean, 0 smells, tree clean) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 (both Low) | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents`)
**Total findings:** 2 confirmed (both Low, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Observations (7 — no rubber-stamp):**
1. **[VERIFIED]** Determinism achieved — one shell seed (`src/main.ts` `const seed`, resolved once at module scope) threads into all three Rng streams (`blimpRng`, `aceRng`, per-wave `spawnWave`). `tests/determinism.test.ts` proves it behaviourally: same seed + different `Date.now()` → identical run; different seed + same clock → different run. Complies with the core/shell determinism rule.
2. **[VERIFIED]** Seed 0 honoured — `seedParam !== null ? Number(seedParam) >>> 0 : (Date.now() >>> 0)` uses an explicit null test, not `||`, so `?seed=0` (a valid seed) is not discarded. Complies with lang-review #4; pinned by `determinism.test.ts` "seed 0 is honoured…". Evidence: `Number("0") >>> 0 === 0`, verified.
3. **[VERIFIED]** No regression — the existing booting tests mock `Date.now()` to `SEED_MS` and do NOT stub `window.location`, so `seed` falls back to `Date.now() = SEED_MS` and `blimpRng = createRng(SEED_MS ^ 0x5eed)` is byte-identical to the pre-change code. Full suite 1019/1019 green confirms it. Evidence: `boot-cockpit.ts:111` mocks Date.now; the new guard's `window.location` half returns `''` there.
4. **[VERIFIED]** core/shell boundary preserved — rule-checker grep-verified all 22 `src/core/` files carry zero `Date.now(`/`performance.now(`/`Math.random(`; the sole `Date.now()` is at module scope, ABOVE `preMotionFrame`/`frame`, outside the calc-frame path. Complies with the repos.yaml core/shell rule ("src/core holds the deterministic flight sim").
5. **[LOW][RULE]** `fingerprintFrame(batches: Stroke[][], texts: string[])` (`tests/determinism.test.ts:39`) — params are never mutated (only `.map`/`.join`); should be `readonly Stroke[][]` / `readonly string[]` per lang-review #2. Confirmed (rule-match, cannot dismiss); Low, non-blocking — a test-helper annotation, no runtime effect.
6. **[LOW][RULE]** `Number(seedParam)` on the untrusted `?seed=` param (`src/main.ts`) — unvalidated per lang-review #10. `?seed=abc` → `NaN >>> 0` → `0`, silently equal to `?seed=0`. Confirmed (rule-match); Low, non-blocking — the `>>> 0` sanitizes (no crash, no NaN propagation), and this is a client-side arcade replay seed, not an auth/request boundary.
7. **[LOW][SIMPLE]** The `typeof window !== 'undefined' &&` half of the seed guard (`src/main.ts`) is unreachable-dead: `main.ts:252` dereferences `window` unconditionally (a keydown listener) many lines before the seed resolution, so a truly-undefined `window` would already have thrown. Harmless; the `window.location` half alone is the necessary part (cockpit-loop stubs `window` without `location`). Non-blocking.

**Data flow traced:** untrusted `?seed=` URL param → `URLSearchParams(...).get('seed')` (null when absent) → `Number(...) >>> 0` (ToUint32-sanitised, always a defined uint32, never NaN/crash) → one `seed` → three sub-seeds via `^`/`+` → `createRng` → the sim. No wall clock enters the sim-step path. Safe.

**Pattern observed:** the shell-owns-entropy pattern matches the fleet — battlezone reads one boot `Date.now()`, asteroids reads `location.search`; this composes both (URL replay seed with a boot-clock fallback) at `src/main.ts`.

**Error handling:** no swallowed errors; the only `throw` is `bootRun`'s intentional "cockpit did not boot" harness assertion. Malformed seed input degrades safely to a defined seed rather than crashing.

**Blocking check:** 0 Critical, 0 High → APPROVED. The two Low findings are recorded (Delivery Findings) but do not block; they are a `readonly` test annotation and a non-crashing input-validation nicety, neither touching correctness or determinism.

### Rule Compliance

Rubric = `.pennyfarthing/gates/lang-review/typescript.md` (#1–13) + red-baron core/shell & determinism conventions. Enumerated exhaustively by rule-checker (16 rules / 56 instances) and cross-checked by me:

| Rule | Instances | Verdict |
|------|-----------|---------|
| #1 type-safety escapes | 3 (seed ternary + 2 test files) | ✓ compliant — no `as any`/`@ts-ignore`/`!` |
| #2 generics/interface (readonly) | 6 | 1 violation — `fingerprintFrame` params not `readonly` (Low, obs #5); rest compliant |
| #3 enums | 0 | N/A |
| #4 `??` vs `\|\|` | 1 (seed resolution) | ✓ compliant — explicit `!== null`, seed 0 honoured |
| #5 module/imports | 2 | ✓ compliant — `.js` extension N/A (Vite app, not the library) |
| #6 React/JSX | 0 | N/A |
| #7 async/promise | 4 | ✓ compliant — `bootRun` returns real data, all `it()` awaited |
| #8 test quality | 8 | ✓ compliant — non-vacuous; the "different seed → different run" test is the explicit anti-vacuity guard |
| #9 build/config | 0 | N/A — no tsconfig/package.json change |
| #10 input validation | 1 (`Number(seedParam)`) | 1 violation — unvalidated URL param (Low, obs #6); safe (no crash) |
| #11 error handling | 1 | ✓ compliant — intentional harness throw, no `catch(e:any)` |
| #12 perf/bundle | 2 (sync fs in test) | ✓ compliant — test file, not a request handler |
| #13 fix-introduced regressions | 1 | ✓ compliant — no `\|\|`/`as any`/validation-gap introduced by the fix |
| core/shell boundary | 26 | ✓ compliant — core clock-free; sole clock read outside the step path |
| determinism (shell-owned seed) | 1 | ✓ compliant — verified functionally by the 3 determinism tests |

### Devil's Advocate

Argue the code is broken. **The seed is read exactly once, at module load.** A malicious or confused user appends `?seed=abc` — does the game explode? No: `Number("abc")` is `NaN`, and `NaN >>> 0` is `0`, so the game silently plays seed 0. That is defensible (deterministic, no crash) but it means three visibly different URLs — `?seed=0`, `?seed=abc`, `?seed=` — are the SAME game, with no feedback; a player "rerolling" by typing garbage always gets seed 0. Low, logged. **What about a huge or negative seed?** `?seed=-5` → `4294967291`, `?seed=99999999999999999999` → a wrapped uint32 — all defined, all deterministic; no overflow crash because `>>> 0` forces ToUint32. **Could determinism silently break?** The wave stream is re-minted per wave as `createRng((seed + kills) >>> 0)` — NOT a continuous LFSR like the ROM's RANDOM; two plane waves with equal `kills` (e.g. separated by a ground wave that scores nothing) would draw the SAME spawn pattern. That is a *fidelity* quirk, but it is (a) pre-existing (the old code did `createRng(Date.now()+kills)`), (b) out of scope for a determinism story, and (c) still fully deterministic — so it does not break this story; noted as a non-blocking Improvement for the enemy-stepper story (rb4-6). **Could the guard throw?** If a future refactor moved the seed read ABOVE `main.ts:252`, the `typeof window` guard would matter — today it's dead but not wrong. **Race conditions?** Single-threaded JS, seed read once at boot — none. **Does the fix leak the clock elsewhere?** The grep tripwire + rule-checker grep both confirm the sim-step path and all of core/ are clock-free. **Regression surface?** The one genuine risk — that changing the seed source shifts every booting test's RNG — is neutralised because the fallback still reads `Date.now()`, which those tests already mock; 1019/1019 proves it. I could not find a correctness or determinism defect. The findings are cosmetic (a `readonly`, an input-validation nicety, a dead guard clause). Verdict stands: APPROVED.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): the shell-seed INJECTION SEAM is unspecified by the ACs. AC-2 requires the shell to "own the seed and pass it in" but names no mechanism. The determinism test pins a `?seed=<n>` URL param (the fleet's established `location.search` shell-config seam — asteroids/src/main.ts already reads it). Affects `src/main.ts` (and possibly a new `src/shell/seed.ts`): Dev must choose/confirm the seam; if relocated (global, exported `boot(seed)`, …) it must stay shell-owned, clock-independent, and test-injectable, and `tests/determinism.test.ts`'s one `bootRun` injection line updates to match. *Found by TEA during test design.*
- **Improvement** (non-blocking): there are THREE wall-clock RNG seeds, not the two the audit named (`:349`/`:467` are stale). Current `src/main.ts`: `blimpRng` (:334, boot), `aceRng` (:345, boot), and the per-wave `spawnWave(createRng((Date.now() + kills)))` (:605, INSIDE the calc-frame loop). All three must collapse onto one shell-owned seed. Affects `src/main.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): draw-order discipline across the streams. `src/main.ts:339-340` records a prior "TEA rng-discipline finding" — the ace draws from its OWN stream so as not to shift the blimp's whole life. When collapsing to one seed, keeping separate deterministic SUB-streams vs one shared stream both satisfy determinism, but the choice changes the fingerprint; the tests pin reproducibility, not a specific draw order, so either is acceptable. Affects `src/main.ts`. *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings during implementation. The fix was self-contained in `src/main.ts`; TEA's three findings were all resolved here (the `?seed=` seam adopted, all three clock reads collapsed onto one seed, the sub-stream draw-order preserved). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `Number(seedParam)` on the `?seed=` URL param is unvalidated — a malformed value (`?seed=abc`, `?seed=`) silently collapses to seed 0 (`NaN >>> 0`), indistinguishable from an intentional `?seed=0`, with no feedback. Safe (the `>>> 0` prevents any crash/NaN leak). Affects `src/main.ts` (could map `NaN` to a fresh clock seed instead of 0, if desired). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `fingerprintFrame`'s array params should be `readonly` (lang-review #2) — they are never mutated. Affects `tests/determinism.test.ts` (annotate `readonly Stroke[][]` / `readonly string[]`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the per-wave RNG is re-minted as `createRng((seed + kills))` each wave, not a continuous LFSR like the ROM's RANDOM — two plane waves with equal `kills` draw the same pattern. Pre-existing and fully deterministic (out of scope for rb4-3). Affects `src/main.ts`; a fidelity note for the enemy-stepper story. *Found by Reviewer during code review.* Relates to rb4-6.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Pinned a concrete `?seed=` URL seam for the shell-owned seed**
  - Spec source: context-story-rb4-3.md, AC-2
  - Spec text: "One seeded Rng is threaded through the sim; the SHELL owns the seed and passes it in."
  - Implementation: `tests/determinism.test.ts` injects the seed via a `?seed=<n>` URL param (`window.location.search`) rather than an unspecified mechanism.
  - Rationale: a behavioural determinism test needs a concrete, clock-INDEPENDENT, test-injectable seed source (mocking `Date.now()` — what `boot-cockpit.ts` does — would make the test vacuously green against the broken code). The URL param is idiomatic for a no-backend browser game (shareable replay) and already used in the fleet (asteroids `?tune`).
  - Severity: minor
  - Forward impact: constrains Dev to a shell-owned, clock-independent, test-injectable seam; the mechanism is negotiable (see Delivery Finding), the two assertions are the contract.
- **AC-1 grep allows ONE boot-time wall-clock read in main.ts**
  - Spec source: context-story-rb4-3.md, AC-1
  - Spec text: "Zero calls to Date.now() / performance.now() / Math.random() remain anywhere in src/core/ or in the sim-step path of src/main.ts."
  - Implementation: `tests/sim-clock-free.test.ts` forbids wall-clock in core/ and in the sim-step path (preMotionFrame + frame), and allows AT MOST ONE read in main.ts (a fresh-game seed mint at shell boot).
  - Rationale: a fresh game needs entropy somewhere; the fleet convention (battlezone/src/main.ts:110) is a single `Date.now()` at shell boot, OUTSIDE the sim-step path. AC-1 scopes the ban to the sim-step path, not all of main.ts. Pushing entropy into a `src/shell/` helper (zero reads in main.ts) also passes.
  - Severity: minor
  - Forward impact: none — both a battlezone-style single boot read and a shell-helper (zero-in-main) design satisfy the grep.

### Dev (implementation)
- **Kept THREE Rng streams (one seed → three sub-seeds), not one shared Rng**
  - Spec source: context-story-rb4-3.md, AC-2
  - Spec text: "One seeded Rng is threaded through the sim; the SHELL owns the seed and passes it in."
  - Implementation: the shell resolves ONE seed (`?seed=` ?? one boot `Date.now()`) and derives three independent streams from it — `blimpRng = createRng((seed ^ 0x5eed))`, `aceRng = createRng((seed ^ 0xace5))`, per-wave `createRng((seed + kills))` — rather than threading a single mutable Rng object.
  - Rationale: ONE clock-free, shell-owned seed governs all randomness (AC-2's intent — reproducible from a seed). Collapsing to one shared Rng would change the draw interleaving and break the deliberate rb4-4 discipline (main.ts:339-340: the ace draws from its OWN stream so consuming it does not shift the blimp's whole life) — and would re-baseline blimp-wiring/ace-wiring/dead-mechanics, which pin seed-driven behaviour at SEED_MS. TEA's own Delivery Finding #3 called either shape acceptable since the tests pin reproducibility, not a draw order.
  - Severity: minor
  - Forward impact: none — determinism holds; the fingerprint is stable for a given seed.
- **Inlined the seed resolution in main.ts rather than a new src/shell/seed.ts**
  - Spec source: TEA Delivery Finding (test design), "possibly a new src/shell/seed.ts"
  - Spec text: "Affects src/main.ts (and possibly a new src/shell/seed.ts)."
  - Implementation: the 3-line `?seed=`-or-`Date.now()` resolution lives in main.ts's shell boot section (main.ts IS the shell), not a separate module.
  - Rationale: minimalist — no test requires a separate module, and the read mirrors asteroids' inline `location.search`. Extraction is a pure refactor available later if a second consumer appears.
  - Severity: minor
  - Forward impact: none.

### Reviewer (audit)
- **TEA — pinned a `?seed=` URL seam for the shell-owned seed** → ✓ ACCEPTED by Reviewer: the seam is idiomatic (asteroids reads `location.search`), clock-independent, and test-injectable; it is the replay/regression mechanism the epic needs and the behavioural assertions — not the mechanism — are the contract.
- **TEA — AC-1 grep allows ONE boot-time wall-clock read in main.ts** → ✓ ACCEPTED by Reviewer: AC-1 scopes the ban to the sim-step path; the fleet convention (battlezone) is one boot `Date.now()`. Verified the sole read sits above `preMotionFrame`, outside the step path.
- **Dev — kept THREE Rng streams (one seed → three sub-seeds), not one shared Rng** → ✓ ACCEPTED by Reviewer: one shell seed governs all randomness (AC-2's intent — reproducibility, proven by the determinism tests); the three sub-seeds preserve the deliberate rb4-4 draw-order discipline and avoid re-baselining the seed-driven wiring tests. TEA finding #3 blessed either shape.
- **Dev — inlined the seed resolution in main.ts rather than a new src/shell/seed.ts** → ✓ ACCEPTED by Reviewer: minimalist and correct — main.ts IS the shell, the read mirrors asteroids' inline `location.search`, and no test requires a separate module.

No undocumented deviations found — the diff matches every logged deviation.