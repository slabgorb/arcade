---
story_id: "sw3-7"
jira_key: ""
epic: "sw3"
workflow: "tdd"
---
# Story sw3-7: Trench per-run variation — PRNG fixed-head + picked-tail obstacle/section chain (sub_83A4) so runs differ instead of being byte-identical

## Story Details
- **ID:** sw3-7
- **Jira Key:** (none — local sprint story)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-12T08:54:51Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-12T08:22:17Z | 2026-07-12T08:24:14Z | 1m 57s |
| red | 2026-07-12T08:24:14Z | 2026-07-12T08:38:36Z | 14m 22s |
| green | 2026-07-12T08:38:36Z | 2026-07-12T08:46:08Z | 7m 32s |
| review | 2026-07-12T08:46:08Z | 2026-07-12T08:54:51Z | 8m 43s |
| finish | 2026-07-12T08:54:51Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): The ROM gates pie SELECTION by wave — pre-defined pies (`TPIE`) for early waves, switching to the fully-random pie (`RPIE`) only once `BS.WAV` runs past the table (WSBASE.MAC `NWBASE`). This clone seeds variation on every run regardless of wave. Affects `src/core/trench-obstacles.ts` (add the pre-defined `TPIE` pie set + a wave-indexed gate). *Found by TEA during test design.*
- **Gap** (non-blocking): The fixed-HEAD / picked-TAIL split point and the picked-tail POOL are left to Dev to author. The ROM head is the `PIEXX`/`off_7C7E` divider skeleton and the pool is `off_7C9E`/`TWDGXX` ("list of wedges to use"), picked by `nextInt(rng, #entries)` (disasm `lda #$11; ldb PRNG; mul; asla`), but no ROM↔world-unit scale is recovered (same provisional gap as `TRENCH_OBSTACLE_STATIONS`). Recommend Dev derive the chain from the existing `TRENCH_OBSTACLE_STATIONS` (keep LENGTH constant, vary the tail's kinds/positions) rather than inventing new geometry. Affects `src/core/trench-obstacles.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): The RED test "spawnTrenchObstacles(rng) … fresh, unshared arrays" used an in-place `pos[2] = 999` mutation that violates the readonly `Vec3` type — it passed under vitest (esbuild strips types) but failed `npm run build` (tsc TS2540). Corrected in place via reference-identity checks. Process note for TEA: RED-phase test files should be typechecked (`npm run build`), not only run under vitest, since esbuild hides readonly/exhaustiveness errors. Affects `tests/core/trench-variation.test.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): The trench variation is now wired to the run RNG, but the shell boots every run from the FIXED default seed (`main.ts:63` `{ ...initialState(), mode: 'attract' }`, `initialState()` = seed 1983). So variation ACROSS sessions relies on the run's RNG diverging during space/surface combat rather than a varying boot seed. To make each fresh session's trench visibly distinct without depending on gameplay divergence, the shell could seed `initialState(<varying>)` at real-game start. Out of this core-only story's scope; the seed→variation MECHANISM (the AC) is restored. Affects `src/main.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `commonPrefixLen(chains: readonly TrenchObstacle[][])` (`tests/core/trench-variation.test.ts:46`) marks only the outer array `readonly`; the codebase convention deep-readonlys nested arrays (`src/core/models.ts:40`, `tests/core/surface-tower-geometry.test.ts:147`) → should be `readonly (readonly TrenchObstacle[])[]`. Cosmetic, test-only, never mutated. Affects `tests/core/trench-variation.test.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Re-seated the trench-obstacles delegation test onto the seeded generator**
  - Spec source: tests/core/trench-obstacles.test.ts, "enterPhase(trench) seeds the full station table" (fidelity task-3)
  - Spec text: `expect(t.trenchObstacles).toEqual(spawnTrenchObstacles())` — the run chain equals the static no-arg table
  - Implementation: re-seated to `toEqual(spawnTrenchObstacles(createRng(initialState().rng.seed)))` — delegation with the run's own seed
  - Rationale: the sw3-7 seeded fixed-head + picked-tail contract makes the run chain seed-dependent; equating it to the static no-arg default would defeat the variation the story requires. The re-seat preserves the test's ACTUAL intent (enterPhase delegates to the generator) under the new contract, and stays green on both current and post-fix code.
  - Severity: minor
  - Forward impact: Dev must implement `enterPhase(_, 'trench')` to delegate `spawnTrenchObstacles(createRng(state.rng.seed))` — a LOCAL cursor, so the run RNG is unmutated (pinned by the purity test).
- **Did NOT test the wave-gated pie SELECTION (pre-defined pies for early waves)**
  - Spec source: WSBASE.MAC `NWBASE` (TPIE/RPIE selection); the story title scopes this to `sub_83A4` (the random-pie generator, `GNBASE`)
  - Spec text: `IFHS / LDU #RPIE ;THEN DO RANDOM PIE / ELSE / LDU (X) ;ELSE USE PRE-DEFINED PIES`
  - Implementation: the RED tests require seed-driven variation on EVERY trench run, with no early-wave pre-defined-pie exception
  - Rationale: the story is scoped to the fixed-head + picked-tail generation (`sub_83A4`). The wave-gated choice of WHICH pie (pre-defined table vs random) is a distinct authentic behavior that would force porting the `TPIE` pie-table set and a wave gate — out of scope for a 3-pt restore.
  - Severity: minor
  - Forward impact: none for this story; captured as a non-blocking Delivery Finding for a follow-on.

### Dev (implementation)
- **Corrected a readonly-`Vec3` type error in a TEA test (assertion-preserving)**
  - Spec source: tests/core/trench-variation.test.ts, "spawnTrenchObstacles(rng) … fresh, unshared arrays" (TEA RED)
  - Spec text: `a[0].pos[2] = 999 // mutating one result must never corrupt a later spawn`
  - Implementation: that assignment is a tsc error (TS2540 — `Vec3 = readonly [number, number, number]`; vitest via esbuild ran it, but `npm run build` rejected it). Replaced the mutate-then-respawn check with reference-identity freshness assertions (`a !== b`, `a[0] !== b[0]`, `a[0].pos !== b[0].pos`, `a[0].pos !== TRENCH_OBSTACLE_STATIONS[0].pos`).
  - Rationale: `Vec3`'s readonly-ness is a codebase-wide invariant (the sim scrolls by REBUILDING pos arrays — sim.ts:617 — never mutating in place); loosening it to satisfy the test would be architecturally wrong. Reference identity verifies the SAME intent — "no shared mutable state" (TS lang-review #2) — without an illegal mutation, and sharpens it (also asserts no aliasing of the source table).
  - Severity: minor
  - Forward impact: none — the test's intent (freshness / no shared state) is unchanged; Reviewer/TEA can confirm the assertion swap.

### Reviewer (audit)
- **TEA — Re-seated the trench-obstacles delegation test** → ✓ ACCEPTED by Reviewer: sound. The old `toEqual(spawnTrenchObstacles())` asserts the run chain == the static no-arg default, which the seeded contract deliberately breaks; re-seating to `spawnTrenchObstacles(createRng(initialState().rng.seed))` preserves the delegation intent and stays green both sides. Verified the new assertion pins the production seeding path, not a tautology.
- **TEA — Did NOT test the wave-gated pie SELECTION** → ✓ ACCEPTED by Reviewer: correctly scoped. The story title targets `sub_83A4` (the random-pie generator); the pre-defined-pie-vs-random wave gate (`NWBASE` TPIE/RPIE) is a distinct authentic behavior, captured as a non-blocking Delivery Finding (TEA). No silent scope loss.
- **Dev — Corrected a readonly-`Vec3` type error in a TEA test** → ✓ ACCEPTED by Reviewer: the `a[0].pos[2] = 999` mutation violates the codebase-wide readonly `Vec3` invariant (the sim scrolls by REBUILDING pos arrays — sim.ts:617 — never mutating), so loosening the type would be the wrong fix. The reference-identity swap (`a !== b`, `a[0] !== b[0]`, `a[0].pos !== b[0].pos`, `a[0].pos !== TRENCH_OBSTACLE_STATIONS[0].pos`) verifies the SAME "no shared mutable state" intent (and sharpens it) — I confirmed each assertion is meaningful and falsifiable.

## Story Assessment

**Story intent** (from title and epic context): Make trench runs vary from one play-through to the next instead of generating the same obstacle/section chain every run. The cabinet achieves this via a seeded PRNG controlled at the start of each trench entry (`sub_83A4`), where a fixed seed head initializes the generator and a "picked-tail" RNG state (read from ROM-backed save data or game state) seeds subsequent sequence. Restore that seeded randomness so obstacle placement + section variation feels alive like the cabinet.

**Technical approach:**
1. Locate the ROM's trench-entry RNG seeding code (`sub_83A4`) and understand its two-part seed: fixed initialization head + dynamic picked-tail state.
2. Port the RNG seeding contract into `src/core` — the seeded state machine, the trench entry point that reads/seeds it, and any game-state fields needed to thread the picked-tail.
3. Wire test coverage for determinism (fixed seed → same run; different seed → different obstacles) plus validation that runs DO vary (regression against byte-identical runs).

**Acceptance Criteria** (derived from title + epic context):
- The trench obstacle/section chain is derived deterministically from the seeded RNG state (fixed-head + picked-tail).
- Two trench runs with the same initial RNG state produce byte-identical obstacle chains.
- Two trench runs with different picked-tail seeds produce visibly different obstacle chains (regression: today all runs are identical).
- The seeding happens at trench entry (`sub_83A4` equivalent) — after space/surface phases, at the start of trench.
- No new random source (Math.random) is added — seeded RNG only via state injection.

**ROM quarry pointers:**
- `sub_83A4` in star-wars/reference/disasm/StarWars_annotated.lst (trench initialization, RNG seeding).
- `byte_4B2A` or related RNG state bytes that hold the "picked tail" seed.
- Any ROM documentation of the trench random-obstacle algorithm (look in Memory_Map notes or the disasm comments).

## Sm Assessment

**Setup routing:** tdd (phased) → next phase `red`, owner **TEA (test design)**. No separate design phase in tdd, so TEA owns the ROM quarry + failing tests for trench variation.

**Open questions for TEA to resolve during RED:**
- What is the exact shape of the picked-tail seed in the ROM (how many bytes, when set, how initialized)?
- Does the PRNG state reset at every new trench run, or does it carry forward between runs within a game session?
- What obstacle/section properties are controlled by the RNG (spawn position, pattern, velocity, quantity)?

**Context file** (`sprint/context/context-story-sw3-7.md`) to be generated by the setup gate; TEA to enrich during RED with the recovered ROM PRNG contract.

## TEA Assessment

**Tests Required:** Yes
**Reason:** A 3-pt behavior story — restores seeded per-run trench variation (the byte-identical regression). Not a chore/doc/config bypass.

**Test Files:**
- `tests/core/trench-variation.test.ts` (NEW) — the sw3-7 fixed-head + picked-tail contract (9 tests).
- `tests/core/trench-obstacles.test.ts` (re-seated 1 assertion) — the enterPhase→generator delegation, now seeded.

**Tests Written:** 9 new (3 RED-driving + 6 guards) + 1 sibling re-seated.
**Status:** RED — 3 failing, ready for Dev. Full star-wars suite: **842 passing, 3 failing** (all in `trench-variation.test.ts`), **0 collateral regressions** (79 other files + the re-seated sibling all green).

### ROM contract recovered — `sub_83A4` ("Called when starting trench")

The authentic per-run trench is a **PRNG fixed-head + picked-tail** "pie":
1. **Fixed head** — a skeleton copied verbatim from a ROM table (disasm `off_7C7E` → RAM `word_4B3F`; WSBASE.MAC `PIEXX` divider-panel format). Same every run → a stable trench entrance. The divider panels are "DIVIDER W/ CATWALK", so the **catwalk hazard lives in the fixed head**.
2. **Picked tail** — a run of slots OVERWRITTEN with random picks from a ROM pool (disasm `off_7C9E`; WSBASE.MAC `TWDGXX` "list of wedges to use"), indexed by a **scaled PRNG byte**: disasm `lda #$11; ldb PRNG; mul; asla` = `(#entries × rnd) >> 8` — i.e. the classic `nextInt(rng, #entries)`. The tail varies by seed → runs DIFFER.

The RAM pie is a **fixed-size** table (`RPIE..RPIEZ`), filled completely — so chain LENGTH is seed-invariant; only the CONTENTS vary. Sources: `reference/disasm/StarWars_annotated.lst` (sub_83A4, ROM:83A4-83CD) and `~/Projects/star-wars-1983-source-text/WSBASE.MAC` (`NWBASE`/`GNBASE`, "GEN A NEW BASE PIE").

### Rule Coverage

| Rule | Test | Status |
|------|------|--------|
| Core purity — seeded RNG only, no `Math.random` (CLAUDE.md hard boundary) | `is DETERMINISTIC: same seed → same chain` | passing (guard) |
| Purity — no input mutation (sim.ts:142 "Clone the RNG …") | `entering the trench does NOT mutate the caller RNG` | passing (guard) |
| TS lang-review #4 — `\|\| default` on a falsy-but-valid value | `seed 0 is a valid, non-degenerate seed … and still varies` | **failing (RED)** |
| TS lang-review #2 — no shared mutable state / fresh arrays | `spawnTrenchObstacles(rng) … fresh, unshared arrays` | passing (guard) |
| TS lang-review #8 — meaningful assertions (self-check) | — | 0 vacuous found |
| AC — runs differ (regression fix) | `different seeds produce DIFFERENT obstacle chains` | **failing (RED)** |
| AC — fixed-head + picked-tail shape | `has a FIXED HEAD and a PICKED TAIL` | **failing (RED)** |
| AC — fixed-size chain (ROM RPIE) | `chain LENGTH is seed-invariant` | passing (guard) |
| AC — picked-tail pool sanity | `every picked obstacle is a known kind and stays downrange` | passing (guard) |
| Sibling protection — catwalk skeleton survives | `every run keeps at least one CATWALK hazard` | passing (guard) |

**Rules checked:** 3 of 3 applicable TS lang-review rules (#2, #4, #8) + the core-purity boundary have test coverage. (Checklist items #1/#3/#5–#7/#9–#13 are N/A: pure sync core, no enums/JSX/async/external input.)
**Self-check:** 0 vacuous assertions found (each test would fail under a wrong or non-seeded implementation).

### Dev guidance (the seam)
- Widen `spawnTrenchObstacles()` → `spawnTrenchObstacles(rng?: Rng)`: with `rng`, seed the picked tail via `nextInt`; no-arg keeps a valid non-empty default (scene presets + catwalk/viewpoint suites call it) that still contains a catwalk.
- `enterPhase(_, 'trench')` delegates `spawnTrenchObstacles(createRng(state.rng.seed))` — seed from a LOCAL cursor so `state.rng` stays unmutated (purity test).
- Keep the chain LENGTH == `TRENCH_OBSTACLE_STATIONS.length`; vary only the tail contents. Keep the catwalk in the fixed head.
- Watch the TS #4 pitfall: `rng ?? createRng(default)`, never `rng || …` (seed 0 is valid).

**Handoff:** To Dev (Yoda) for GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/trench-obstacles.ts` — seeded `spawnTrenchObstacles(rng?: Rng)`. The first `TRENCH_HEAD_COUNT` (4) stations are the fixed head (verbatim, incl. the catwalk divider); each tail station keeps its fixed downrange position but has its KIND picked from `TRENCH_TAIL_POOL` (`['turret','square']`) via `nextInt(gen, …)`. No-arg = deterministic default run (seed 1983) for scene presets / catwalk fixtures. Ports the ROM `sub_83A4` / WSBASE `GNBASE` fixed-head + picked-tail pie.
- `src/core/sim.ts` — `enterPhase(_, 'trench')` now delegates `spawnTrenchObstacles(createRng(s.rng.seed))`, a LOCAL cursor so the run RNG stays unmutated (purity); added `createRng` to the `@arcade/shared/rng` import.
- `tests/core/trench-variation.test.ts` — corrected a readonly-`Vec3` type error in the freshness test (assertion-preserving; see Design Deviations → Dev).

**Approach:** Minimal port — positions and chain LENGTH stay fixed (the ROM's fixed-size RPIE); only the tail's obstacle KINDS are seeded, so runs differ while every guard (determinism, length, purity, pool sanity, catwalk-present) holds. No new random source; all randomness flows through the seeded `Rng` in `GameState`.

**Tests:** 845/845 passing (GREEN). `npm run build` (`tsc --noEmit && vite build`) clean, exit 0.
**Branch:** feat/sw3-7-trench-per-run-variation (pushed)

**Handoff:** To Reviewer (Obi-Wan) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (845/845 green, build 0 errors, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings (boundaries assessed by Reviewer — see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings (no error paths in diff — see [SILENT]) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (test quality covered by rule-checker #8 — see [TEST]) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings (docs assessed by Reviewer — see [DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings (types covered by rule-checker #2 — see [TYPE]) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings (no external input — see [SEC]) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings (complexity assessed by Reviewer — see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 1 (Low, test-only readonly nit) | confirmed 1, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents`, their domains assessed by Reviewer)
**Total findings:** 1 confirmed (Low), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The change restores authentic per-run trench variation by porting the ROM `sub_83A4` / WSBASE `GNBASE` **fixed-head + picked-tail** pie: `spawnTrenchObstacles(rng?: Rng)` copies the leading `TRENCH_HEAD_COUNT` (4) stations verbatim (the stable entrance, incl. the catwalk divider) and picks each tail station's KIND from `TRENCH_TAIL_POOL` via `nextInt`; `enterPhase(_, 'trench')` seeds it from a local cursor `createRng(s.rng.seed)`. Faithful, pure, well-guarded, and it builds clean.

**Data flow traced:** run RNG (`GameState.rng.seed`) → `enterPhase` local cursor `createRng(s.rng.seed)` (sim.ts:882) → `spawnTrenchObstacles(gen)` → `nextInt(gen, 2)` per tail slot → `trenchObstacles` chain. Safe: the cursor is a fresh disconnected object, so `s.rng` is never mutated (purity), and the pick is a pure function of the seed → deterministic.

**Observations (≥5, tagged):**
- `[VERIFIED]` Core purity — no `Math.random`/`Date.now`/`performance.now` in the changed core files (grep clean); randomness enters only via the `rng?: Rng` param. Evidence: trench-obstacles.ts:108, sim.ts:882. Complies with star-wars CLAUDE.md hard boundary.
- `[VERIFIED]` `enterPhase` does not mutate its input — `createRng(s.rng.seed)` builds a new `{seed}` object; the returned literal never re-assigns `rng`. Evidence: sim.ts:882 + purity test trench-variation.test.ts:99-104. Rule-checker confirmed by reading the compiled mulberry32 (#17).
- `[VERIFIED]` `??` vs `||` correct — `rng ?? createRng(TRENCH_DEFAULT_SEED)` (trench-obstacles.ts:108); no `seed || default` anywhere in the diff (the only `||` is inside a test-description string). Seed 0 explicitly exercised (trench-variation.test.ts seed-0 test). `[EDGE]`
- `[VERIFIED]` Fixed-head/picked-tail is faithful and self-guarding — pool `['turret','square']` matches the original tail-station kinds (indices 4-7); the catwalk (index 3) stays in the head; `TRENCH_HEAD_COUNT` (4) < chain length (8), and the `cp < len` test would fail loudly if a future edit pushed the head over the length (so "zero variation" can't slip in silently). Evidence: trench-obstacles.ts:63-70, 82-114. `[EDGE]`
- `[VERIFIED]` No sibling regressions — full suite 845/845; the scene-preset, catwalk-hazard, and viewpoint fixtures (which call the no-arg default and `.find` the catwalk) stay green because the catwalk lives in the fixed head. Evidence: preflight. `[TEST]`
- `[VERIFIED]` Determinism — same seed → same chain (mulberry32); `stepGame` stays a pure function of state. Evidence: rule-checker #16 + determinism test. `[SILENT]` no swallowed errors (no error paths introduced).
- `[VERIFIED]` Comments accurate — the ROM citations (`sub_83A4`, `off_7C7E`/`off_7C9E`, `GNBASE`/`TWDGXX`, the `lda #$11; ldb PRNG; mul` pick) match the disasm/source I quarried; the sim.ts:876-882 note correctly explains the local-cursor purity. `[DOC]`
- `[LOW][RULE][TYPE]` `commonPrefixLen(chains: readonly TrenchObstacle[][])` (trench-variation.test.ts:46) is outer-readonly only; codebase convention deep-readonlys nested arrays. Test-only, never mutated, cosmetic — CONFIRMED as Low (rule-matching, not dismissed), non-blocking. Captured as a Delivery Finding.
- `[VERIFIED][SIMPLE]` Minimal implementation — a single `.map` with a head/tail ternary; no over-engineering, no dead code, no new random source. `[SEC]` no external/user input (seed is internal deterministic state) — nothing to sanitize.

**### Rule Compliance** (TS lang-review + star-wars core-purity, exhaustive via rule-checker across 17 rules / 24 instances):
- #1 type-safety escapes: compliant — the one `as` is a spread-readonly→tuple narrowing (trench-obstacles.ts pos), no `as any`/`@ts-ignore`/`!`.
- #2 readonly / generics: compliant on `TRENCH_TAIL_POOL` (readonly) and the fresh-array return; ONE Low nit on the test helper `commonPrefixLen` (above).
- #4 `??` vs `||`: compliant (see [EDGE]).
- #5 module/imports: compliant — bare `@arcade/shared/rng` specifier (bundler resolution, no `.js` needed), `Rng` marked `type`-only.
- #8 test quality: compliant — all 10 checked tests assert specific falsifiable properties; 0 vacuous.
- #12 bundle: compliant — named subpath import, no barrel.
- Core purity #14-17: all compliant (no forbidden globals; sole randomness = seeded `Rng`; deterministic; `enterPhase` non-mutating).
- #3/#6/#7/#9/#10/#11/#13: N/A (no enums/JSX/async/config/external-input/error-paths/fix-diff).

### Devil's Advocate

Let me argue this code is broken. **First — variation is an illusion.** The shell boots every run from the fixed default seed 1983 (`main.ts:63`), and the tail is only 4 slots drawn from a 2-kind pool = 16 possible layouts. A player who plays identically twice gets the identical trench, and even across sessions the "variation" is a handful of turret↔square swaps at fixed positions. Is that really "runs differ instead of byte-identical"? **Rebuttal:** before this change the trench was byte-identical for ALL seeds and ALL gameplay — the seed was ignored entirely. Now the chain is a pure function of the run RNG, which advances through every space/surface spawn and enemy shot, so different sessions reach the trench with different seeds and different layouts; identical output for identical input is correct determinism, not a defect. The fixed boot seed is a real refinement — I captured it as a non-blocking Delivery Finding against `main.ts` — but the story's AC is the seed→variation mechanism, which is restored. **Second — silent zero-variation risk.** The tail loop only runs for slots `i >= TRENCH_HEAD_COUNT`; if a future edit set `TRENCH_HEAD_COUNT >= TRENCH_OBSTACLE_STATIONS.length`, `nextInt` would never be called and every run would silently go byte-identical again. **Rebuttal:** the `has a FIXED HEAD and a PICKED TAIL` test asserts `commonPrefixLen < length`, which fails loudly the instant the tail is empty — the regression is guarded, not silent. **Third — a confused caller.** `spawnTrenchObstacles()` no-arg used to return the canonical static table; existing callers (`scenePresets.ts:42`) now silently get a seed-1983 picked-tail chain. **Rebuttal:** the no-arg form is still deterministic, still length-8, still carries the catwalk and only valid kinds; the scene-presets test asserts a non-empty chain and passes, and both kinds render fine — no functional break, full suite green. **Fourth — the discarded cursor.** `createRng(s.rng.seed)` consumes 4 draws that are thrown away (the durable `s.rng` isn't advanced), so the next frame "re-uses" that stream. **Rebuttal:** the trench phase spawns nothing per-frame from the RNG (no enemies), so there is no collision; and `stepGame` re-clones a fresh cursor from `s.rng.seed` each frame deterministically. Harmless one-shot at phase entry. None of these rise to a blocking defect.

**Deviation audit:** 3 logged deviations (2 TEA, 1 Dev) all ✓ ACCEPTED — see Design Deviations → Reviewer (audit). No undocumented deviations found.

**Verdict rationale:** 0 Critical, 0 High. One Low cosmetic finding (test-only deep-readonly annotation), non-blocking. Faithful ROM port, core purity intact, determinism proven, no regressions, clean build.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.