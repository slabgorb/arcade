---
story_id: "rb2-13"
jira_key: ""
epic: "rb2"
workflow: "tdd"
---
# Story rb2-13: Blimp cabinet integration

## Story Details
- **ID:** rb2-13
- **Jira Key:** (local tracking, no Jira)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-11T21:10:01Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T20:32:32Z | 2026-07-11T20:35:41Z | 3m 9s |
| red | 2026-07-11T20:35:41Z | 2026-07-11T20:47:33Z | 11m 52s |
| green | 2026-07-11T20:47:33Z | 2026-07-11T20:59:41Z | 12m 8s |
| review | 2026-07-11T20:59:41Z | 2026-07-11T21:10:01Z | 10m 20s |
| finish | 2026-07-11T21:10:01Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): the enemy-shell → player-damage channel (lives.ts, rb2-9) was never wired into main.ts — the running cockpit has NO player damage/lives at all. rb2-13 AC-4 is the FIRST story to wire it (through the blimp). Affects `src/main.ts` (introduce a `Lives` state + `loseLife` on a hit; enemy PLANES still can't damage the player — a separate gap for a later story). *Found by TEA during test design.*
- **Question** (non-blocking): AC-4's "real damage path" HIT MODEL is unspecified. `blimpFires(frame)` only says a shot leaves this calc-frame — whether it HITS is undefined. A deterministic `loseLife()` on every even frame while the blimp is present costs a life every ~200 ms (dead in ~1 s). Dev/Architect must pick a hit model — a per-shot chance, a travel-time shell collision, or reuse `returning-ace.evadeCheck` ('evaded'|'hit') — so the blimp threatens without insta-killing. Affects `src/main.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): AC-6 despawn is text-asserted only (main.ts is DOM-bound; vitest runs node env). A pure predicate in blimp.ts — e.g. `hasDriftedOffScreen(blimp, halfWidth)`, mirroring `guns.collides` — would make the off-screen bound unit-testable. Affects `src/core/blimp.ts` (optional additive export). *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): enemy PLANES still deal no player damage — only the blimp is wired into the `loseLife` channel this story. The unified single `stepGuns` collision pass added here is the natural hook for a later "planes shoot back" story. Affects `src/main.ts` (extend the damage channel to the plane `enemies` via the enemy fire model). *Found by Dev during implementation.*
- **Gap** (non-blocking): `loseLife`'s `gameOver` result is not handled — lives decrement and floor at 0, but no death sequence (`beginDeath`/`DEATH_SEQUENCE`), respawn grace, or high-score entry is wired, and the lives count is not rendered. Deferred to a later render/death story per the lives.ts header. Affects `src/main.ts` + a render story (draw the lives HUD + drive the death/respawn sequence off `lives`). *Found by Dev during implementation.*
- **Improvement** (non-blocking): TEA's suggested pure `hasDriftedOffScreen(blimp, halfWidth)` predicate in blimp.ts was NOT added (kept the bound inline to avoid touching the done rb2-10 core) — the off-screen bound (`BLIMP_DESPAWN_X`) and the blimp hit chance/yaw remain untested inferred tunables. A future core-additive story could make the bound unit-testable. Affects `src/core/blimp.ts` (optional additive export). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the structural wiring tests are weak/gameable — test-analyzer empirically confirmed AC-5's `/explode/`+`/stepGuns|fire/` (line 117) and the regression guard's `/spawnWave/` etc. (line 134) already passed at the merge-base before any blimp code, so they'd survive a full revert. A follow-up test-hardening story should anchor the gameable assertions to the blimp draw/collision blocks (e.g. require `rotationY` in the same `multiply` chain as `BLIMP_PICTURE`, and `blimpFires` co-located with `loseLife`) or add negative-checks like the sibling `multiplane-wiring.test.ts`. Affects `tests/blimp-wiring.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the riskiest new logic — the target-list construction + hit index-split (`blimpTargetIndex = enemies.length`, `targets = [...enemies, blimpEnemy(blimp)]`, `downed.delete(blimpTargetIndex)`) and the hit-roll gate (`nextFloat < BLIMP_HIT_CHANCE`) — is correct today but untestable while it lives in DOM-bound main.ts. Extracting pure helpers into `src/core` (e.g. `splitHits(hits, planeCount)` and `blimpHits(roll, chance)`) would make the boundary cases (blimp-only hit, plane+blimp same pass, roll at 0/chance/1) unit-testable and guard against future off-by-one/comparison regressions. Affects `src/core/*` + `src/main.ts`. *Found by Reviewer during code review.*
- **Bug** (non-blocking): the AC-6 despawn regex `/blimp\s*=\s*(?:null|undefined|no)/i` (tests/blimp-wiring.test.ts:131) lacks a word boundary after `no`, so it matches `blimp = nothing`/`normal`/`nowhere` — a comment could satisfy it with no clearing logic. Tighten to `/blimp\s*=\s*(?:null|undefined)\b/` and drop the `no` alternative. Low severity (today's code genuinely does `blimp = null`, so it passes for the right reason). Affects `tests/blimp-wiring.test.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Wiring tested structurally (text), not behaviorally**
  - Spec source: context-story-rb2-13.md, AC-1..AC-7
  - Spec text: "wire the tested blimp core … into main.ts"
  - Implementation: `tests/blimp-wiring.test.ts` asserts the main.ts wiring by reading main.ts as TEXT (import clauses + symbol regexes), not by importing/executing it.
  - Rationale: vitest runs `environment:'node'`; main.ts touches document/window/requestAnimationFrame at module top level and cannot be imported. This is the established house pattern (multiplane-wiring, ground-mode-wiring, cockpit-boot).
  - Severity: minor
  - Forward impact: a runtime integration test would need a jsdom harness — out of scope, deferred.
- **Pure blimp behavior NOT re-tested here**
  - Spec source: context-story-rb2-13.md, AC-1..AC-7 (behavioral)
  - Spec text: spawn / drift / fire / score / collide / explode behaviors
  - Implementation: the blimp ENTITY behavior (shouldSpawnBlimp, spawn, step, blimpFires, scoreKill('blimp'), collides, explode) is already covered exhaustively by `tests/core/blimp.test.ts` (rb2-10). This story's RED adds only the WIRING guard.
  - Rationale: re-asserting already-green core behavior is not a RED test; the new surface is the main.ts integration.
  - Severity: minor
  - Forward impact: none.
- **AC-4 damage HIT MODEL left to Dev (channel-only test)**
  - Spec source: context-story-rb2-13.md, AC-4
  - Spec text: "fire at the player … via a real enemy-shell→player-damage path"
  - Implementation: the test pins the CHANNEL (blimpFires → lives.loseLife wired) but not the hit probability/evade.
  - Rationale: over-specifying the hit model would prescribe implementation; flagged as a Question finding for Dev/Architect instead.
  - Severity: minor
  - Forward impact: Dev chooses the hit model (see Delivery Findings).

### Dev (implementation)
- **AC-4 hit model: per-shot probability (resolves TEA's Question)**
  - Spec source: context-story-rb2-13.md, AC-4 + TEA Delivery Finding (Question)
  - Spec text: "fires at the player on the ÷2 cadence via a real enemy-shell → player-damage path" (hit model unspecified; TEA warned a deterministic loseLife every even frame kills the pilot in ~1 s)
  - Implementation: on each `blimpFires(simFrame)` fire-frame, a per-shot roll `nextFloat(blimpRng) < BLIMP_HIT_CHANCE` (0.05) gates the REAL `loseLife(lives)` call. The channel is genuine (a life is actually lost, not a discarded bool); the probability makes the airship a threat (~1 hit / ~4 s of exposure) without insta-killing.
  - Rationale: TEA listed "a per-shot chance" as an acceptable model; it is the minimal real hit model and reuses the seeded `blimpRng` already needed for the spawn roll (no new RNG).
  - Severity: minor
  - Forward impact: a later story may replace the probability with a travel-time shell collision or the returning-ace evadeCheck; `BLIMP_HIT_CHANCE` is the single tuning point.
- **Blimp spawn roll gated to the wave-decision boundary (not per calc-frame)**
  - Spec source: context-story-rb2-13.md, AC-1 ("spawns on the ~25 % BLMOTN roll")
  - Spec text: "the blimp APPEARS on shouldSpawnBlimp(roll)"
  - Implementation: `shouldSpawnBlimp(nextFloat(blimpRng))` is rolled only on a wave DECISION (`wasDecision`, sky clearing) when no blimp is already present — not every calc-frame (a per-frame 25 % roll would spawn an airship almost immediately and continuously).
  - Rationale: the ROM's BLMOTN roll is an occasional event; anchoring it to the inter-wave decision gives a ~25 %-per-lull appearance and reuses the existing schedule seam without a bespoke blimp timer (minimalist).
  - Severity: minor
  - Forward impact: if a future story wants blimps concurrent with dense plane waves, the roll site can move out of the sky-clear block.
- **Off-screen despawn bound chosen in main.ts (BLIMP_DESPAWN_X = 640), inline**
  - Spec source: context-story-rb2-13.md, AC-6 + TEA Delivery Finding (Improvement)
  - Spec text: "despawns when it drifts off-screen (the step is unbounded by design)"; TEA suggested an optional pure `hasDriftedOffScreen(blimp, halfWidth)` predicate in blimp.ts to make the bound unit-testable
  - Implementation: the bound is an inline `Math.abs(drifted.x) > BLIMP_DESPAWN_X` check in main.ts (blimp enters at |x| ≤ 300; 640 sits well past the far edge). No new blimp.ts export was added.
  - Rationale: the story scopes blimp CORE behavior OUT ("Out of scope: changing blimp core sim behavior"); adding a core predicate would touch the done rb2-10 module and need its own core test — scope creep for a wiring story. The bound is main.ts's presentation concern.
  - Severity: minor
  - Forward impact: TEA's `hasDriftedOffScreen` predicate remains a clean future refactor if the bound needs unit coverage; the value 640 is the single tuning point.
- **Lives state wired but NOT rendered (HUD deferred)**
  - Spec source: context-story-rb2-13.md, AC-4; lives.ts module header
  - Spec text: lives.ts — "the HUD lives counter are the shell's job, driven off DEATH_SEQUENCE / Lives.count in a later render story"
  - Implementation: `lives` is seeded (`initialLives()`) and decremented on a blimp hit, but not drawn; game-over (loseLife's `gameOver`) is not yet handled (no death sequence / respawn wiring).
  - Rationale: AC-4 asks for the DAMAGE CHANNEL; the lives HUD + death/respawn sequence are explicitly a later render story per lives.ts, and out of this story's scope.
  - Severity: minor
  - Forward impact: a later story renders the lives counter and wires beginDeath/respawn off the same `lives` state; the channel this story adds is the hook.
- **Unified single stepGuns collision pass over planes + blimp (refactor)**
  - Spec source: context-story-rb2-13.md, AC-5 ("collide … through the shared guns/scoring/explosion seams")
  - Spec text: "Reuse the rb2-5 collision (stepGuns/collides) … not a bespoke blimp collision"
  - Implementation: the loop's two prior `stepGuns` call sites (one per branch) were merged into ONE pass over a `targets` list of the planes plus (if present) `blimpEnemy(blimp)`. A hit on the blimp's trailing index scores flat 200 on a 'blimp' path and clears the airship; plane hits are unchanged.
  - Rationale: a second stepGuns pass for the blimp would double-advance every shell's Z (the shells are shared) — the only correct reuse is one pass over a combined target list. Behavior for the no-blimp case is identical to before (stepGuns over the planes, or over [] between waves).
  - Severity: minor
  - Forward impact: enemy-plane→player damage (a separate TEA gap) can hook the same unified pass when it lands.

### Reviewer (audit)
- **Wiring tested structurally (text), not behaviorally** (TEA) → ✓ ACCEPTED by Reviewer: main.ts touches document/window/rAF at module top level and genuinely cannot execute under vitest node env; this is the established house pattern (multiplane-wiring, ground-mode-wiring, cockpit-boot). NOTE: test-analyzer confirmed these structural checks are weak — several regexes matched at the merge-base before any blimp code — and the sibling patterns include negative-checks this file omits. Accepted as the pattern; test-hardening captured as a non-blocking Reviewer finding.
- **Pure blimp behavior NOT re-tested here** (TEA) → ✓ ACCEPTED by Reviewer: the entity's spawn/drift/fire/score/collide/explode is covered exhaustively by tests/core/blimp.test.ts (rb2-10, green). Re-asserting green core behavior is not a RED test.
- **AC-4 damage HIT MODEL left to Dev (channel-only test)** (TEA) → ✓ ACCEPTED by Reviewer: deferring the probability/evade to Dev rather than over-specifying it in RED is sound; Dev resolved it (below).
- **AC-4 hit model: per-shot probability (0.05)** (Dev) → ✓ ACCEPTED by Reviewer: a per-shot roll gating the REAL loseLife (verified assigned, not discarded) is a genuine damage channel that avoids the deterministic-even-frame insta-kill TEA warned of. The 0.05 value is untested tuning (flagged) but the approach is correct.
- **Blimp spawn roll gated to the wave-decision boundary** (Dev) → ✓ ACCEPTED by Reviewer: a per-calc-frame 25% roll would spam airships; anchoring to `wasDecision` in the sky-clear block yields an occasional appearance and reuses the schedule seam. Verified the guard is unchanged from the prior wave logic.
- **Off-screen despawn bound (BLIMP_DESPAWN_X = 640), inline** (Dev) → ✓ ACCEPTED by Reviewer: traced bounded — entry |x| ≤ 300 < 640, deltaX constant-sign ±12/frame, so |x| is strictly monotone and crosses 640 in ~79 frames (~7.5s); no infinite drift/fire. Keeping it inline (not touching the done rb2-10 core) is the correct scope call. Value untested (flagged).
- **Lives state wired but NOT rendered (HUD deferred)** (Dev) → ✓ ACCEPTED by Reviewer: matches lives.ts's own documented scope (HUD/death/respawn is a later render story). The channel is genuinely wired; gameOver descope is explicit. Non-blocking gap captured below.
- **Unified single stepGuns collision pass over planes + blimp** (Dev) → ✓ ACCEPTED by Reviewer: this is the CORRECT reuse — a second stepGuns pass would double-advance shared shells. Verified stepGuns is still called exactly once per calc-frame (was once-per-branch before) and the no-blimp path is behavior-identical. The blimpTargetIndex sentinel is `downed.delete`-ed before the plane loop indexes enemies[idx] — no out-of-bounds read (independently confirmed by rule-checker).

## Sm Assessment

**Setup complete — routing to TEA for RED.** rb2-13 wires the already-tested
blimp core (`src/core/blimp.ts`, rb2-10 = done) into `main.ts`. 3 pts, TDD
(phased), red-baron, local tracking (no Jira), ships via PR to `develop`.

- **Branch:** `feat/rb2-13-blimp-cabinet-integration` (off `develop`, clean).
- **Merge gate:** clear — no blocking open PRs in red-baron.
- **Context:** story context enriched with a 7-item AC checklist (AC-1..AC-7)
  extracted from the dense story title; deep cross-story guardrails live in the
  restored `context-epic-rb2.md`.
- **Restored a clobber:** sm-setup regenerated `context-epic-rb2.md` and wiped
  ~90 lines of curated rb2 Background — `git checkout --` restored it before it
  reached staging. Only legit changes remain (epic YAML status bump + new story
  context).

**For TEA (RED):** formalize failing tests from AC-1..AC-7. Watch the load-bearing
constraints — calc-frame cadence (~10.42 Hz) for drift + ÷2 fire cadence, the
broadside **yaw** on nose-on ROM geometry, the **real** enemy-shell→player-damage
path (not a stub), flat-200 score, unbounded off-screen despawn, and the
Enemy-vs-Blimp `kind` union resolution. NB: blimp **drifts** (non-weaving) —
supersedes rb2-10 AC-3's stale "weaving" wording.

## TEA Assessment

**Tests Required:** Yes
**Reason:** rb2-13 is a wiring/integration story — the RED guard proves main.ts actually plugs in the tested blimp core (rb2-10). The blimp's pure behavior is already green under `tests/core/blimp.test.ts`.

**Test Files:**
- `tests/blimp-wiring.test.ts` — structural wiring guard over `src/main.ts` (reads main.ts as text; house pattern, since main.ts is DOM-bound and vitest runs node env).

**Tests Written:** 11 tests → **8 RED** (import blimp core; AC-1 spawn roll; AC-2 drift-step; AC-3 broadside `rotationY`+`BLIMP_PICTURE`; AC-4 `blimpFires`; AC-4 `lives.loseLife` real damage channel; AC-5+AC-7 flat-200 blimp-kind score; AC-6 off-screen despawn) + **3 green regression guards** (main.ts exists; the shared collide/`explode` seam is present; the rb2-7 plane-wave wiring survives).
**Status:** RED (failing — ready for Dev). Verified via testing-runner: 8 failed / 486 passed / 494 total; `tests/blimp-wiring.test.ts` the ONLY failing file; all failures are clean assertion gaps (no collection/compile crash); the other 25 files (incl. `tests/core/blimp.test.ts`) green.

### Rule Coverage
| Rule (TS lang-review) | Coverage | Status |
|---|---|---|
| #8 test quality (meaningful, non-vacuous) | every `it` pins a concrete symbol/regex; the 3 green tests are deliberate regression guards, not `assert(true)` / `let _ =` | pass (self-check) |
| #4 null/undefined (0 is a valid value) | AC-6 asserts the blimp state is CLEARABLE (nullable), not that a falsy x removes it | pass |

**Rules checked:** the lang-review checklist targets SOURCE `.ts` changes; this suite adds no new src types (the blimp CORE's rule coverage lives in `tests/core/blimp.test.ts`, rb2-10). The applicable surface is Dev's main.ts diff — checked at Dev's green gate.
**Self-check:** 0 vacuous tests.

**Handoff:** To Dev (The Word Burgers) for GREEN — wire the blimp into main.ts to satisfy the 8 RED assertions. **Read the Delivery Findings first**: AC-4 needs a hit-model decision (a deterministic `loseLife` every even frame insta-kills the player), and this story is the first to wire the lives/damage channel into main.ts at all.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/main.ts` — wired the tested blimp core (rb2-10) into the running cockpit:
  - imports the blimp core (`shouldSpawnBlimp`, `spawn`, `step`, `blimpFires`) + the lives spine (`initialLives`, `loseLife`), `BLIMP_PICTURE`, `rotationY`, `nextFloat`.
  - **AC-1** spawn: `shouldSpawnBlimp(nextFloat(blimpRng))` gates a `spawnBlimp(blimpRng)` on each wave-decision lull (no blimp already up).
  - **AC-2** drift: `stepBlimp(blimp)` runs every calc-frame inside the `SIM_TIMESTEP_S` accumulator.
  - **AC-3** render: `BLIMP_PICTURE` drawn BROADSIDE via `rotationY(BLIMP_YAW=π/2)` (ROM geometry is nose-on along local z), through the shared projection substrate.
  - **AC-4** fire: `blimpFires(simFrame)` on the ÷2 cadence → per-shot hit roll → REAL `loseLife(lives)` (channel wired, not a discarded bool; hit model chosen to not insta-kill).
  - **AC-5/AC-7** collide/score/explode + kind: ONE unified `stepGuns` pass over planes + `blimpEnemy(blimp)`; a blimp hit scores flat `scoreKill('blimp', …)` = 200, wrecks through the shared `explode`, clears the airship.
  - **AC-6** despawn: the unbounded drift is bounded — `blimp = null` once `|x| > BLIMP_DESPAWN_X`.

**Tests:** 494/494 passing (GREEN) — all 12 `tests/blimp-wiring.test.ts` pass (was 8 RED); 25 other files unchanged; `tsc --noEmit` + `vite build` clean. Verified via testing-runner (Scrounger).

**Branch:** `feat/rb2-13-blimp-cabinet-integration` (pushed)

**Handoff:** To Reviewer (Immortan Joe) for review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (0 smells, 494/494 green, tsc+build clean) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — domain self-covered (multi-target hit boundary, despawn boundary traced) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — domain self-covered (no swallowed errors introduced) |
| 4 | reviewer-test-analyzer | Yes | findings | 11 (test-quality + coverage) | confirmed 11 as non-blocking; 3 captured as Reviewer Delivery Findings, rest folded into the accepted structural-testing deviation |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — domain self-covered (comments verified accurate) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — domain self-covered + rule-checker rules #1/#2/#4 |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — domain self-covered (unified pass justified, no over-engineering) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations (15 rules / 46 instances) | N/A |

**All received:** Yes (4 ran, 5 disabled via settings)
**Total findings:** 11 confirmed non-blocking (test-quality/coverage debt), 0 dismissed, 0 blocking

## Reviewer Assessment

**Verdict:** APPROVED

The implementation is correct, minimal, and wires the tested blimp core into the cockpit exactly as AC-1..AC-7 require. Three specialists (preflight, security, rule-checker) returned clean; test-analyzer's findings are entirely about **test strength, not code correctness**. I independently hand-traced the two highest-risk paths (collision index-split, despawn bound) and confirm both correct. No Critical or High issues.

### Rule Compliance (TypeScript lang-review checklist)
Exhaustively verified by reviewer-rule-checker (15 rules, 46 instances) and re-confirmed on the items I judged highest-risk:
- **#1 Type-safety escapes** — COMPLIANT. No `as any`/`as unknown as T`/`@ts-ignore`/non-null `!` in the diff. `Blimp | null` is narrowed by explicit `blimp !== null` checks (main.ts:352,371,376), not `!`. The two `as` casts in the file (`getElementById as HTMLCanvasElement`) are pre-existing, unchanged.
- **#2 Generic/interface** — COMPLIANT. `draw()`'s array params are `readonly`; `blimpEnemy(b: Blimp): Enemy` and `targets: readonly Enemy[]` are properly typed; no `Record<string,any>`/bare `object`/`Function`.
- **#3 Enum/exhaustiveness** — COMPLIANT. No new union/switch. `blimpEnemy` sets `kind:'lead'` (existing EnemyKind literal); the downstream `scoreKill` switch already has `default: assertNever` (scoring.ts, unchanged).
- **#4 Null/undefined** — COMPLIANT. No `?.`; the two ternaries (target list, despawn) are explicit strict-null, not `||`-on-0. `downed.delete(blimpTargetIndex)` removes the out-of-bounds sentinel before `enemies[idx]` is read — no undefined dereference.
- **#5 Module/declaration** — COMPLIANT. `type Blimp`/`type Lives` inline type-only marks match the file idiom; extensionless relative imports are correct under `moduleResolution: bundler`.
- **#8 Test quality** — no rule-8 sub-violation (no `assert(true)`/`let _ =`/`as any`/dist import); tests read from `src/`. Weak specificity noted separately as non-blocking debt.
- **#14 Determinism (project rule)** — COMPLIANT. Only main.ts (the shell) changed in src/; `Date.now()` seeding is permitted there; grep confirms 0 `Date.now()`/`Math.random()` in src/core.

### Observations (tagged by source)
1. [VERIFIED] Collision index-split is correct — main.ts:363-388: `blimpTargetIndex = enemies.length` (out-of-bounds for `enemies`), the blimp branch `downed.delete(blimpTargetIndex)` before the plane loop reads `enemies[idx]`; traced blimp-only, plane+blimp-same-pass, and blimp-null cases — no out-of-bounds read. Independently confirmed by rule-checker.
2. [VERIFIED] Despawn is genuinely bounded — main.ts:155,357 `Math.abs(drifted.x) > BLIMP_DESPAWN_X(640)`; entry |x| ≤ 300, deltaX constant-sign ±12/frame (core), so |x| is strictly monotone and crosses 640 in ~79 frames (~7.5s). No infinite drift or infinite fire. Security agent concurs.
3. [VERIFIED] stepGuns runs exactly once per calc-frame — main.ts:365; was once-per-branch pre-diff, now one unified pass; no shell double-advance. no-blimp path is behavior-identical to before.
4. [SEC] No security issues — security agent clean: no injection/XSS/network/storage sinks; RNG is non-crypto game-only (correctly scoped); no resource exhaustion.
5. [RULE] No project-rule violations — rule-checker clean across 15 rules / 46 instances; strict-mode tsc clean.
6. [TEST][LOW] Gameable/vacuous wiring assertions — test-analyzer proved AC-5 (line 117) and the regression guard (line 134) passed at the merge-base before any blimp code; AC-1/AC-3/AC-4 don't enforce symbol proximity. Confirmed as real test-quality debt on the accepted structural-testing pattern; captured as a non-blocking Delivery Finding. Not a code defect — the code satisfies the intent.
7. [TEST][LOW] `no`-boundary regex bug — tests/blimp-wiring.test.ts:131 `/…|no)/i` matches `blimp = nothing`. Latent (code does `blimp = null`, passes for the right reason). Captured as a non-blocking Bug finding.
8. [EDGE][MEDIUM] The multi-target hit path and the numeric tunables (BLIMP_HIT_CHANCE, BLIMP_DESPAWN_X) have no test of any kind (main.ts is DOM-bound). Correct today; a future off-by-one/comparison flip would be undetected. Recommended pure-helper extraction (`splitHits`, `blimpHits`) captured as a non-blocking Improvement.
9. [SILENT] No swallowed errors introduced — the only `catch { return '' }` is in the test file (house idiom). `loseLife`'s `gameOver` is discarded, but that is an explicit, documented descope (lives HUD/death is a later story), not a silent failure.
10. [TYPE] Type design sound — `blimpEnemy` adapter is fully typed (no stringly-typed leakage); `Blimp | null` state handled with strict-null narrowing throughout.
11. [DOC] Comments accurate — the BLIMP_DESPAWN_X docblock ("enters at |x| ≤ 300") and the rotationY/broadside rationale match the code; section banners match file idiom. No stale/misleading docs.
12. [SIMPLE] Appropriately minimal — the unified collision pass is a justified refactor (a second pass would double-advance shells); the parallel plane-kill/blimp-kill branches operate on different shapes (set vs single) and don't warrant extraction for one blimp.
13. [LOW] `lives` is written (main.ts:355) but never read for any game effect — the blimp's damage is currently invisible (no HUD, no game-over). Documented descope matching lives.ts's own scope statement; the channel is genuinely wired (loseLife result IS assigned). Non-blocking.

### Data flow traced
Player fire (Space → `held`) → `fire(guns, fireHeld)` builds shells → `stepGuns(guns, targets)` where `targets = [...enemies, blimpEnemy(blimp)]` → a hit on `blimpTargetIndex` → `scoreKill('blimp', depth)` (flat 200) + `explode(blimpEnemy)` wreck + `blimp = null`. Safe: the sentinel index is deleted before the plane loop; the blimp is cleared so it cannot be double-scored. Enemy fire (blimp) → `blimpFires(simFrame)` ÷2 cadence → `nextFloat(blimpRng) < 0.05` → `loseLife(lives)` — a real (if currently unrendered) damage channel.

### Devil's Advocate
Argue this is broken. First: **the damage is invisible.** The blimp fires and decrements `lives`, but nothing renders lives and nothing consumes `gameOver` — a player is "hit" with zero perceptible consequence, and at `lives.count === 0` the game blithely continues. Is AC-4's "real enemy-shell→player-damage path" honestly satisfied if the damage has no observable effect? Defensible answer: the *channel* is real and correctly wired (the returned state is assigned, not discarded); lives.ts itself declares the HUD/death/respawn to be a later render story, and Dev logged the descope. So it's a documented seam, not a lie — but it is the weakest point, and a reviewer should insist the follow-up render story actually lands. Second: **the tests can't catch a regression.** test-analyzer proved several assertions passed on the pre-story file; a future refactor could silently break the blimp wiring while the suite stays green. Real risk — but the blimp *entity* is thoroughly covered by blimp.test.ts, and the structural guard is an accepted smoke check, not the primary coverage. Third: **the numeric tunables are unpinned** — flip `>` to `<` on the despawn or `0.05` to `0.5` and no test fails. True, and the reason I'm pushing the pure-helper extraction. Fourth: **fire cadence rides the global `simFrame`, not spawn-relative** — a blimp could spawn on an odd frame and fire on a phase the designer didn't intend; but the core doc explicitly says the ÷2 *phase* is inferred, so any parity is within contract. Fifth: **`blimpRng` is time-seeded and shared** across spawn roll, spawn's internal draws, and hit rolls — non-reproducible and order-sensitive; but this is the shell (Date.now seeding is the established pattern) and determinism is a *core* requirement, not a shell one. Conclusion: every angle resolves to either a documented descope or non-blocking test/coverage debt. Nothing corrupts state, crashes, or violates a rule. The code is shiny and chrome.

### Verdict rationale
No Critical/High. The code is correct (verified independently on the riskiest paths), rule-clean, security-clean, and minimal. The test-quality debt is real but confined to an accepted, documented structural-testing pattern, with the true behavioral coverage living in the green core suite — it does not indicate broken code and is captured as non-blocking follow-up findings.

**Handoff:** To SM (The Organic Mechanic) for finish-story.