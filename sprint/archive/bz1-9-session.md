---
story_id: "bz1-9"
jira_key: ""
epic: "bz1"
workflow: "tdd"
---
# Story bz1-9: Saucer bonus — drifts in at 2000 pts, random path, 5000 pts, radar-invisible

## Story Details
- **ID:** bz1-9
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-04T01:12:52Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-04T00:34:59Z | 2026-07-04T00:37:00Z | 2m 1s |
| red | 2026-07-04T00:37:00Z | 2026-07-04T00:46:40Z | 9m 40s |
| green | 2026-07-04T00:46:40Z | 2026-07-04T00:53:06Z | 6m 26s |
| review | 2026-07-04T00:53:06Z | 2026-07-04T01:03:48Z | 10m 42s |
| red | 2026-07-04T01:03:48Z | 2026-07-04T01:07:28Z | 3m 40s |
| green | 2026-07-04T01:07:28Z | 2026-07-04T01:08:09Z | 41s |
| review | 2026-07-04T01:08:09Z | 2026-07-04T01:12:52Z | 4m 43s |
| finish | 2026-07-04T01:12:52Z | - | - |

## Story Context

**Scope:** Add a bonus saucer enemy — a radar-invisible visitor that drifts in at 2000 pts, follows a random path, and awards 5000 pts on destruction. The saucer is independent of the "always one hostile" invariant (bz1-7) — it coexists with whatever hostile is active but never participates in the hostile lifecycle.

**Technical Approach:**
- Add `state.saucer: Saucer | null` field to `GameState` (independent lifecycle alongside `hostile`)
- Spawn gating: saucer becomes eligible at `score >= 2000` (from epic fidelity bar)
- Spawn timing and drift path: RNG-driven deterministic motion, per bz1-2 findings quarry data
- Radar exclusion: wire `state.saucer` into bz1-6's `deriveRadar` filter (already built against a stub)
- Hit/explosion: route saucer hits through bz1-7's existing shell-hit/explosion machinery, awarding 5000 pts
- Rendering: draw saucer wireframe (bz1-2's model tables) through bz1-3 camera/projection pipeline
- No offensive behavior: saucer does not fire; pending bz1-2 confirmation on collision damage (assume harmless for now)
- Determinism: all movement/spawn/despawn driven by seeded RNG, reproducible with fixed seed + dt sequence

**Files Likely Touched:**
- `battlezone/src/core/state.ts` — add Saucer type + state.saucer field
- `battlezone/src/core/sim.ts` — add stepSaucer logic (spawn gating, movement, despawn)
- `battlezone/src/core/enemies.ts` — or new `saucer.ts` for saucer-specific lifecycle
- `battlezone/src/core/radar.ts` — wire saucer into deriveRadar exclusion (should already have hook)
- `battlezone/src/core/scoring.ts` or `sim.ts` — add 5000 pt award on saucer hit
- `battlezone/src/main.ts` — thread saucer into render dispatch, pass saucer state to stepGame
- `battlezone/tests/core/saucer.test.ts` — new test suite for spawn/drift/radar/hit/determinism

**Acceptance Criteria (from context-story-bz1-9.md):**
- AC-1: No saucer spawns while `score < 2000` (fixed seed determinism test)
- AC-2: Saucer coexists without violating "always one hostile" invariant
- AC-3: Saucer produces zero radar blips (test via `deriveRadar` with live `state.saucer`)
- AC-4: Saucer destruction awards exactly 5000 pts + standard explosion (bz1-7 machinery)
- AC-5: Spawn timing, drift path, despawn are deterministic (identical seed/dt → identical lifecycle)
- AC-6: Saucer never fires at player (assertion in step logic)
- AC-7: Build clean (`tsc --noEmit && vite build`), all tests green

## Sm Assessment

**Viability:** Healthy. 2-point tdd story with clear scope and strong upstream scaffolding — this one survives.

- **Story:** bz1-9 — saucer bonus enemy: eligible at 2000 pts, random drift path, 5000 pts on kill, radar-invisible, never fires.
- **Workflow:** tdd (phased) — routed to TEA for the red phase.
- **Branch:** `feat/bz1-9-saucer-bonus` off `develop` in the battlezone subrepo (PRs target `develop`).
- **Dependencies in place:** bz1-6 `deriveRadar` already has the saucer-exclusion hook stubbed; bz1-7 provides the shell-hit/explosion machinery and the "always one hostile" invariant the saucer must coexist with (not participate in); bz1-2 quarry data covers the wireframe model and drift behavior.
- **Risks:** minor — collision-damage behavior on player contact is unconfirmed from quarry data (assumed harmless; flagged in context). Determinism requirements are explicit in the ACs, so TEA should pin seed/dt sequences in tests.
- **Jira:** none — local sprint tracking (jira_key intentionally empty).

Context is written, branch is cut, ACs are testable. Next agent has everything needed to author failing tests.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 2-pt story but all-new core behavior (spawn gate, drift, despawn, kill, radar exclusion) — full RED contract.

**Test Files:**
- `battlezone/tests/core/saucer.test.ts` — 31 tests, the complete bz1-9 contract: module API for `src/core/saucer.ts` (SaucerState/stepSaucer/saucerContacts/SAUCER_HIT_RADIUS), spawn gate at `SAUCER_APPEARANCE_SCORE`, TEA behavioral bands for spawn wait (≤60 s), standoff (PLAYER_RADIUS < d ≤ FAR_CULL), drift (moves every step, ≤30 000 u/s), lifetime (≤120 s), 5000-pt kill through bz1-7's blast semantics with NO replacement spawn, end-to-end radar invisibility via the real `deriveRadar`, unarmed contract (no shell/playerHit channel), one-hostile coexistence with bit-identical enemy traces, determinism under jittered dt, purity (frozen inputs, dt=0 no-op), and a render-path smoke through `projectModel(SAUCER, …)`.

**Tests Written:** 31 tests covering all 7 ACs
**Status:** RED (29 failing with clean CONTRACT misses; 2 constant-guard tests lawfully green against existing scoring.ts/radar.ts exports; 381 pre-existing tests unaffected — verified by testing-runner, RUN_ID bz1-9-tea-red)

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes | `core-purity-sweep.test.ts` auto-scans the future `src/core/saucer.ts` (directory-wide, bz1-8); saucer.test.ts itself ships no `as any` | enforced (sweep) |
| #3 union exhaustiveness | SaucerPhase driven through alive → exploding → null across kill/blast/despawn tests | failing (RED) |
| #4 null/undefined handling | `saucer: null` exercised at init, below-gate, post-despawn, post-blast; nullable `playerShell` in every step signature | failing (RED) |
| #8 test quality (anti-vacuous) | radar test asserts the contact list is NON-empty (kind 'saucer', live x/z) before asserting zero blips — the exclusion is proven, not vacuous | failing (RED) |
| Epic determinism/purity rule | dt=0 full no-op, frozen-input immutability, referential transparency, identical-trace runs under jittered dt; impurity tokens banned by the sweep | failing (RED) |

**Rules checked:** 5 of 5 runtime-testable lang-review/epic rules have coverage (checks #2, #5–#7, #9–#12 are review-time rubric with no runtime surface in a pure sim module — Immortan Joe's beat, not mine)
**Self-check:** 0 vacuous tests found — every `it` carries value-level assertions; the one conditional test (seeded-path divergence) asserts meaningfully on both branches

**Handoff:** To The Word Burgers (Dev) for GREEN — the contract block at the top of `saucer.test.ts` is the implementation spec.

### TEA Rework (round-trip 1)

Immortan Joe's four test-suite findings, all addressed in `tests/core/saucer.test.ts` (commit 6c12ec0; src/ untouched per the verdict):

1. **[HIGH] Tautological kill-independence test** — rewritten as a kill-interleave-vs-control comparison: the saucer spawns and takes a scripted shell kill beside a live enemy loop; the test asserts the 5000-pt kill actually landed (non-vacuous guard) AND the 900-step hostile trace is bit-identical to a saucer-free control run.
2. **[MEDIUM] AC-5 gap** — new test: scripted-kill two-run determinism trace (spawn → kill → blast → despawn → NEXT spawn), asserting the kill lands and ≥2 spawns occur in each run, then comparing the full 40 s traces byte-for-byte — the blast-expiry rng draw is now under determinism scrutiny.
3. **[MEDIUM] Unreachable else branch** — seeded-path test now compares the two seeds' full 300-step lifecycle traces (`not.toEqual`); positions and despawn ticks both count as divergence, no conditional branches remain.
4. **[LOW] Swallowed import error** — `loadSaucer` now captures the caught error (`catch (e: unknown)` with instanceof narrowing, lang-review #11 compliant) and appends it to the CONTRACT message.

**Status after rework:** 413/413 GREEN (32 saucer tests — was 31 — plus 381 pre-existing; testing-runner RUN_ID bz1-9-tea-rework), `tsc --noEmit` clean. Self-check rerun: 0 vacuous tests remain.
**Note on RED semantics:** this round-trip is a test-quality fix against an already-correct implementation — the new/rewritten tests are regression witnesses and pass by design; no TDD cycle was fabricated (house rule).

**Handoff:** Back to Immortan Joe for re-review.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `battlezone/src/core/saucer.ts` (new) — the bonus visitor's pure state slice: `SaucerState { saucer, rng, spawnWait }`, `initSaucer`, `stepSaucer` (kill check → frozen-time guard → spawn-clock/drift/blast lifecycle), `saucerContacts`, `SAUCER_HIT_RADIUS` (= bz1-7's TANK_HIT_RADIUS). Spawn clock burns only at score ≥ SAUCER_APPEARANCE_SCORE; blast reuses enemies.ts's EXPLOSION_DURATION and clears to null (no replacement); every draw from the module's own carried seed word.
- `battlezone/src/main.ts` — wires the saucer beside the enemy side: independent seed, hostile-first shell precedence (deliberate, logged), SAUCER wireframe / EXPLOSION_DEBRIS render through the bz1-3 pipeline, and the live saucer contact concatenated into `deriveRadar` so the §7 exclusion runs end-to-end every frame.

**Tests:** 412/412 passing (GREEN — all 31 saucer contract tests + 381 pre-existing, zero regressions; verified by testing-runner, RUN_ID bz1-9-dev-green). `npm run build` (`tsc --noEmit && vite build`) clean — AC-7 satisfied.
**Branch:** `feat/bz1-9-saucer-bonus` (pushed to origin)

**Handoff:** To Imperator Furiosa (TEA) for verify — simplify fan-out + quality-pass.

### Dev Addendum (round-trip 1, green)

**Implementation changes:** none — the review verdict scoped all fixes to the test suite and ordered src/ untouched; TEA's rework commit (6c12ec0) is test-only. Zero-diff green phase, no fabricated work.
**Tests:** 413/413 GREEN at HEAD 6c12ec0 (32 saucer tests + 381 pre-existing; testing-runner RUN_ID bz1-9-tea-rework), `tsc --noEmit` clean.
**Branch:** `feat/bz1-9-saucer-bonus` pushed and current.
**Handoff:** To Immortan Joe for re-review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (412/412 GREEN, build clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 5 | confirmed 4, deferred 1 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none (1 prose note: NaN-dt, assessed below) | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 (19 rule groups, 58 instances checked) | confirmed 1 (downgraded to LOW with citation) |

**All received:** Yes (4 enabled returned; 5 disabled via settings)
**Total findings:** 5 confirmed, 0 dismissed, 1 deferred

### Rule Compliance

Mapped to `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) + epic guardrails (context-epic-bz1.md), per the rule-checker's exhaustive enumeration (58 instances), independently spot-verified:

| Rule | Instances | Verdict |
|------|-----------|---------|
| #1 type-safety escapes | 6 | 1 literal match: `as unknown as Partial<SaucerModule>` at saucer.test.ts:132 — downgraded to LOW, NOT dismissed: the checklist's own recovery text prescribes "use as unknown with narrowing," and the loader runtime-narrows every field via typeof checks; byte-identical idiom ships in 8 pre-existing merged test files (enemies/firing/movement/rng/input suites). No `as any`, no @ts-ignore, no new non-null assertions in the diff |
| #2 generics/interfaces | 6 | compliant — 100% readonly interfaces, `readonly RadarContact[]` return, lawful Partial<T> in the RED loader |
| #3 enums | 4 | compliant — SaucerPhase is a union type (recommended pattern); no switch constructs to exhaust |
| #4 null/undefined | 5 | compliant — no `||`-as-default on falsy-valid values; `?.` never chained into unguarded calls |
| #5 modules/declarations | 5 | compliant — `export type`/`import type` correct throughout; bundler resolution needs no .js extensions |
| #6 React/JSX | 0 | N/A — no .tsx |
| #7 async/promises | 4 | compliant — loadSaucer's catch adds context (CONTRACT errors) rather than losing it |
| #8 test quality | 5 | **VIOLATION** — one provably vacuous test (see [HIGH] finding); otherwise compliant (no as-any assertions, src/ imports, shapes match) |
| #9 build/config | 0 | N/A — no config changes |
| #10 input validation | 0 | N/A — no input boundary in a pure sim reducer |
| #11 error handling | 4 | compliant — unbound `catch {`, no catch(e: any) |
| #12 perf/bundle | 4 | compliant — JSON.stringify only in test loops; dynamic import is test-harness-only |
| #13 fix-regressions | 0 | N/A — initial RED→GREEN diff, no fix commits yet |
| Epic: core purity | 1 | compliant — saucer.ts imports core-only; zero banned tokens (also enforced by core-purity-sweep); main.ts's Date.now() is shell-side, mirroring the initEnemies precedent |
| Epic: planar space | 2 | compliant — Saucer is (x, z, heading); no y anywhere in the sim |
| Epic: determinism | 3 | compliant — all three exports pure functions of their arguments |
| Epic: reducer purity | 2 | compliant — local createRng cursor, returns cursor.seed; frozen path re-carries state.rng verbatim |
| Epic: explosion semantics | 3 | compliant — occupied-through-blast, dt=0 never expires, debris inert; each directly tested |
| Epic: immutability | 4 | compliant — all readonly; frozen-input test passes |

### Devil's Advocate

Assume this code is broken; where would the bodies be? **First, the NaN vector:** `stepSaucer` trusts `dt`. A NaN slips past the `dt <= 0` freeze (NaN comparisons are false), poisons `spawnWait`, and the saucer silently never visits again — a soft-lock no test would catch, invisible to the player except as absence. Today `main.ts` clamps dt at the boundary and `enemies.ts` carries the identical exposure, so this is a house-wide pattern, not a bz1-9 defect — but the pattern's safety rests entirely on every future shell caller remembering the clamp. **Second, the false witness:** the suite claims "killing the visitor never spawns, kills, or replaces the hostile," but that test's `enemies` local never enters any call — `JSON.stringify(enemies)` before and after compares a variable nothing could have touched. The property it claims to prove is real (the type system provides no data path from stepSaucer to EnemyState), but the test is a tautology wearing a contract's clothing, and the adjacent bit-identical-trace test never fires a shell — so the kill step's independence is proven by NOTHING except the function signature. **Third, determinism's blind spot:** AC-5 demands identical lifecycles for identical seeds, and the rng carry-through the exploding phase (the despawn draw of the next spawnWait) is exercised by zero two-run comparisons. A regression there — say, a future edit drawing from an uncreated cursor on the blast-expiry path — would ship green. **Fourth, the drift has no fences:** the saucer can wander beyond FAR_CULL (invisible but alive) or straight through obstacles and the player tank; the ROM's actual saucer-vs-terrain behavior is undecoded, so this is unfalsifiable today, but bz1-12's playtest should look at it. **Fifth, the generous-death edge:** a shell landing on the saucer at the exact step its visit clock expires resolves kill-first (5000 pts) because the kill check precedes lifecycle aging — deterministic and player-favorable, but nobody chose it on purpose; it fell out of the ordering. None of the last three break the ACs; the second and third are why this review does not approve.

## Reviewer Assessment

**Verdict:** APPROVED (round 2 — round 1 REJECTED; severity table below is the round-1 record, resolutions in the Re-review addendum)

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [TEST] | Tautological test: "killing the visitor never spawns, kills, or replaces the hostile" — local `enemies` never enters any call; the before/after JSON comparison cannot fail regardless of implementation behavior. Violates lang-review #8 / house "do not preserve broken tests" — a rule-matching finding, not dismissible | tests/core/saucer.test.ts:557-567 | Delete it, or rewrite to interleave `stepEnemies` with the saucer-kill step and compare the hostile trace against a control run without the saucer |
| [MEDIUM] [TEST] | AC-5 coverage gap: no two-run trace-equality test crosses the kill → blast → despawn path — the rng carry-through the exploding phase (the despawn draw) is never exercised under determinism scrutiny | tests/core/saucer.test.ts (determinism block, :570+) | Add a scripted-kill determinism test: shell hit at a known step, two full runs, byte-identical traces through blast and despawn |
| [MEDIUM] [TEST] | Seeded-path test's else branch is unreachable-by-construction (VISIT_DURATION 25 s vs the 5 s window) and asserts a condition unrelated to path divergence | tests/core/saucer.test.ts:329-333 | Drop the branch or make it compare the two seeds' full traces |
| [LOW] [SILENT] | loadSaucer's bare `catch {}` discards the real import error — a future module-evaluation failure would masquerade as a missing-export CONTRACT miss | tests/core/saucer.test.ts:130-135 | Optional: fold the caught error's message into the CONTRACT error text |
| [LOW] [RULE] | `as unknown as Partial<SaucerModule>` — literal lang-review #1 match, downgraded with citation: the checklist's recovery guidance endorses as-unknown-plus-narrowing, the loader runtime-validates every field, and the idiom is byte-identical in 8 merged sibling suites | tests/core/saucer.test.ts:132 | No change required |

**Deferred (1):** [TEST] band-tightening (spawn 4–12 s / visit 25 s / speed 2 400 never pinned tighter than the outer TEA bands) — deferred to bz1-12 with rationale: the constants are explicitly provisional (logged TEA + Dev deviations); pinning them now would freeze values the epic mandates bz1-12's playtest to retune. Recorded as a delivery finding.

**Dispatch coverage:** [EDGE] disabled — own boundary pass done (kill-at-visit-expiry ordering noted in Devil's Advocate, spawn ring inside FAR_CULL verified at saucer.ts:118-121). [SILENT] disabled — own pass surfaced the loader catch (LOW above). [TEST] 5 findings from analyzer, 4 confirmed 1 deferred. [DOC] disabled — own read: module headers accurate, provisional constants honestly labeled PROVISIONAL, no stale claims. [TYPE] disabled — rule-checker's #2/#5 enumeration covered type design; all-readonly interfaces verified. [SEC] clean — core purity intact, no input boundary; NaN-dt noted as pre-existing house exposure (enemies.ts identical), not a bz1-9 defect. [SIMPLE] disabled — own read: no dead code, no over-abstraction; module mirrors enemies.ts's proven shape at ~40% its size. [RULE] 19 groups / 58 instances: one downgraded literal match (LOW above), all epic guardrails compliant.

**Observations (own review, beyond subagents):**
- [VERIFIED] One shell cannot double-kill: main.ts:76-86 nulls the shell after the hostile's claim before stepSaucer sees it — complies with the logged hostile-first-precedence deviation; no rule governs the ordering.
- [VERIFIED] Kill award crosses the gate same-frame correctly: main.ts adds enemyStep.scoreAward to score BEFORE stepSaucer reads it, so a 2000-crossing kill starts the saucer clock that frame — complies with findings §2 ("start appearing at 2000 points").
- [VERIFIED] Blast clears to null with NO replacement (saucer.ts:230-243) — the deliberate inversion of the hostile's no-gap rule; complies with findings §2's "bonus visitor, not the hostile" and is directly tested (saucer.test.ts:427-448).
- [VERIFIED] Frozen-time path re-carries state.rng verbatim and skips cursor creation (saucer.ts:180-186) — complies with the rng.ts reducer-purity convention; tested at saucer.test.ts:345-359.
- [VERIFIED] Radar exclusion runs end-to-end every frame: main.ts:141-147 concatenates saucerContacts into deriveRadar — the live contact IS supplied and dropped by the untouched bz1-6 filter; complies with epic §7 guardrail.

**Data flow traced:** keyboard treads → stepTank pose → stepSaucer(pose) spawn ring (10–28 k off the live pose, saucer.ts:196-206) → drift state → projectModel → Canvas strokes; and saucerContacts → deriveRadar → dropped. No user-controlled strings, no DOM sinks beyond Canvas draws — safe.
**Pattern observed:** module-slice reducer mirroring enemies.ts (own rng word, own step result, radar-contacts passthrough) at saucer.ts:71-91 — good pattern, proven twice now; evidence for a future GameState consolidation story.
**Error handling:** pure reducer — no I/O to fail; null shell and null saucer legs all covered by tests; NaN-dt exposure documented above as house-wide, guarded at the only call site (main.ts:63).

**Why REJECTED despite no runtime defect:** every confirmed fix is in the test suite, but the [HIGH] is a rule-matching violation (lang-review #8) — approving would merge a test that cannot fail while claiming to guard the kill-step independence AC. Project rules are not suggestions. The fixes are surgical and test-only.

**Handoff:** Back to Imperator Furiosa (TEA) — red rework, test-file changes only. The implementation itself stands as-is; do not touch src/.

### Re-review (round-trip 1) — APPROVED

Delta reviewed: commit 6c12ec0, tests/core/saucer.test.ts only (+86/−23), src/ untouched as ordered. reviewer-test-analyzer re-run on the delta (returned clean) plus my own line read; both verified analytically AND empirically (32/32 saucer tests, 413/413 full suite, `tsc --noEmit` clean).

| Round-1 finding | Resolution |
|-----------------|------------|
| [HIGH] Tautological kill-independence test | RESOLVED — kill now provably lands (`killAward === SCORES.saucer` guard) inside a 900-step interleave whose enemy trace is compared in full against a same-seed saucer-free control; capable of failing on any cross-module coupling |
| [MEDIUM] AC-5 kill-path determinism gap | RESOLVED — new scripted-kill two-run trace (2 400 steps) covers spawn → kill → blast → despawn → NEXT spawn with non-vacuity guards (kill landed, ≥2 spawns), exercising the blast-expiry rng draw under comparison |
| [MEDIUM] Unreachable else branch | RESOLVED — branch-free full-trace `not.toEqual` over fixed-length (301) traces; divergence is content-driven |
| [LOW] Swallowed import error | RESOLVED — `catch (e: unknown)` with instanceof narrowing (lang-review #11 compliant), message folded into the CONTRACT error |

No new findings. Loop-bound margins verified (~3 s slack in the interleave window, ~14.5 s in the scripted-kill window). Dev's zero-diff green round correctly declined to fabricate work.

**Data flow traced:** (round 1, unchanged) treads → pose → spawn ring → drift → projectModel/Canvas; contacts → deriveRadar → dropped.
**Pattern observed:** module-slice reducer (saucer.ts:71-91) — approved pattern, second proof after enemies.ts.
**Error handling:** pure reducer, no I/O; NaN-dt house exposure recorded as an epic-level delivery finding.

**Final verdict:** APPROVED — no Critical/High outstanding; all round-1 findings resolved or lawfully deferred (band-tightening → bz1-12, recorded).
**Handoff:** To The Organic Mechanic (SM) for finish — PR creation, merge, archive.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): the bz1-2 findings doc has no decoded saucer spawn-timing, drift-path, or lifetime data — only the 2000-pt threshold, 5000-pt value, and radar invisibility. Affects `battlezone/docs/battlezone-1980-source-findings.md` (a future quarry decode should replace the TEA bands pinned in saucer.test.ts; bz1-12 playtest trues up meanwhile). *Found by TEA during test design.*
- **Question** (non-blocking): one player shell, two kill checks — when Dev wires `stepSaucer` into `main.ts`, a single shell could overlap both the saucer and the hostile in one frame; the wiring order (which stepper sees the shell first, nulling on consumption) decides the winner and must be chosen deliberately. Affects `battlezone/src/main.ts` (wiring precedence in GREEN). *Found by TEA during test design.*
- **Improvement** (non-blocking): the epic names the saucer's hover height "a render offset", but `scene.ts`'s `Placement` carries only `{x, z, orientation}` — Dev may need an optional height field on `Placement` (or bake hover into the SAUCER model verts) for the visual to read as flying. Core tests don't pin either choice. Affects `battlezone/src/core/scene.ts` (render wiring only). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): testing-runner writes its cache into the SUBREPO working tree (`battlezone/.session/test-runs/`, plus a stray `dev-server.log`) and battlezone's `.gitignore` doesn't cover it — it sat untracked through bz1-8 and now bz1-9. A one-line `.session/` ignore entry would keep the tree clean. Affects `battlezone/.gitignore` (add `.session/`). *Found by Dev during implementation.*
- **Question** (non-blocking): the saucer currently renders at ground level — `Placement` has no height field, and the story context's "no saucer-specific render path" ruling won out over the epic's "fixed hover height, a render offset" note (see TEA's Improvement above). Whether it visually reads as flying is a bz1-12 playtest call. Affects `battlezone/src/core/scene.ts` (optional hover offset, if the playtest wants it). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): saucer visit constants (spawn 4–12 s, visit 25 s, speed 2 400) are only bounded by the loose outer TEA bands — a within-band regression (e.g. 4× drift speed) would pass green. Deliberately deferred here because the constants are provisional; when bz1-12's playtest pins finals, tighten the tests to match. Affects `battlezone/tests/core/saucer.test.ts` (band-tightening alongside bz1-12's constant true-up). *Found by Reviewer during code review.*
- **Gap** (non-blocking): `stepSaucer` (and `stepEnemies` before it — house-wide) trusts `dt`: a NaN bypasses the `dt <= 0` freeze and permanently poisons the spawn clock. Safe today because `main.ts` clamps dt at the only call site, but the invariant lives in the shell, not the core. Affects `battlezone/src/core/` (a core-side dt sanitization decision, epic-level — one story should settle it for all step functions). *Found by Reviewer during code review.*
- **Question** (non-blocking): a shell landing on the saucer at the exact step its visit expires resolves kill-first (5000 pts awarded) because the kill check precedes lifecycle aging — deterministic and player-favorable, but chosen by ordering, not intent. Affects `battlezone/src/core/saucer.ts` (confirm or document at bz1-12 playtest). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **TEA behavioral bands stand in for absent bz1-2 quarry data**
  - Spec source: context-story-bz1-9.md, Technical Approach
  - Spec text: "Spawn timing and drift path: RNG-driven deterministic motion, per bz1-2 findings quarry data" / "a timer- or distance-based despawn rule per the bz1-2 findings"
  - Implementation: the findings doc contains no decoded saucer spawn-timing/drift/lifetime facts, so saucer.test.ts pins TEA bands instead: spawn within 60 s of eligibility, standoff PLAYER_RADIUS < d ≤ FAR_CULL, drift moves every step at ≤ 30 000 u/s, unshot lifetime ≤ 120 s — all documented as bands in the test header, exact values Dev's choice inside them
  - Rationale: the story context itself calls these "placeholder pending bz1-2's findings"; bands keep the contract testable without inventing fake ROM facts (bz1-8's MISSILE_ABANDON_RANGE precedent)
  - Severity: minor
  - Forward impact: a future quarry decode or bz1-12's playtest trues up the constants; the bands only need loosening if real ROM values fall outside them
- **Module-slice state (`SaucerState` in `src/core/saucer.ts`) instead of a `GameState.saucer` field**
  - Spec source: context-story-bz1-9.md, Technical Approach (echoed in the session Story Context)
  - Spec text: "Add a dedicated `state.saucer: Saucer | null` field to `GameState`"
  - Implementation: no `GameState` type exists in the repo — the house pattern is per-module state slices carried by `main.ts` (`EnemyState` precedent, bz1-7/8); the RED contract pins a new `saucer.ts` module owning `SaucerState { saucer, rng }` with the same shape/discipline as `enemies.ts`
  - Rationale: matches the codebase that actually shipped rather than the epic's early architecture sketch; the saucer-vs-hostile independence the spec wants is enforced harder this way (separate modules, separate rng words, bit-identical enemy traces asserted)
  - Severity: minor
  - Forward impact: a future sim.ts/GameState consolidation story would fold the slices together; nothing in this contract blocks that
- **dt = 0 pinned as a full saucer-side no-op (except the position-based kill check)**
  - Spec source: context-epic-bz1.md, determinism guardrail (no explicit dt=0 rule for the saucer)
  - Spec text: "every story's tests drive the core with a fixed RNG seed and fixed dt" (silent on frozen frames)
  - Implementation: tests require `stepSaucer(state, …, dt=0, …)` to return a state deep-equal to its input (no spawn draw, no drift, no timer burn) while a shell-on-target kill still lands at dt=0
  - Rationale: extends bz1-7's "frozen time never expires a blast" and bz1-8's mutual-kill-at-dt-0 house semantics to the new module — consistency across the core, not a new invention
  - Severity: minor
  - Forward impact: none — Dev implements to the pin; it matches how enemies.ts already behaves

### Dev (implementation)
- **Concrete visit constants pinned inside TEA's bands (no quarry citation)**
  - Spec source: context-story-bz1-9.md, Technical Approach (via TEA's band deviation above)
  - Spec text: "spawn timing/frequency roll beyond that gate is a placeholder pending bz1-2's findings"
  - Implementation: `saucer.ts` pins spawn wait 4–12 s (drawn per visit), spawn ring 10 000–28 000, drift speed 2 400 u/s with ±1.6 rad/s seeded wander, visit duration 25 s — all PROVISIONAL, flagged as such in the module header
  - Rationale: some number must ship; each sits comfortably inside TEA's bands and reads plausibly against MAME footage pacing; bz1-12's playtest or a quarry decode replaces them without touching the tests
  - Severity: minor
  - Forward impact: bz1-12 true-up may retune the four constants; the test bands only need revisiting if real ROM values fall outside them
- **Hostile-first shell precedence in main.ts wiring**
  - Spec source: context-story-bz1-9.md, Scope ("wiring saucer hits into bz1-7's existing hit/explosion/scoring machinery")
  - Spec text: spec is silent on which entity claims the one player shell when both could be struck in the same frame
  - Implementation: `main.ts` steps `stepEnemies` first, nulls the shell if consumed, and `stepSaucer` only sees a surviving shell — the hostile (the ROM's own slot) outranks the bonus visitor
  - Rationale: TEA's session Question asked for a deliberate choice; the hostile is the ROM's projectile-slot peer while the saucer is an addition, so the pre-existing order wins; the overlap case is geometrically rare either way
  - Severity: minor
  - Forward impact: none — a future quarry decode of the ROM's collision walk order could flip it trivially

### Reviewer (audit)
- **TEA behavioral bands stand in for absent bz1-2 quarry data** → ✓ ACCEPTED by Reviewer: the quarry is genuinely silent (verified against the findings doc); bands-not-inventions is the bz1-8 MISSILE_ABANDON_RANGE precedent, correctly followed. Caveat recorded as a delivery finding: bands are loose enough that within-band regressions pass — tighten at bz1-12.
- **Module-slice state (`SaucerState`) instead of a `GameState.saucer` field** → ✓ ACCEPTED by Reviewer: no GameState type exists to amend; the module-slice pattern is the shipped architecture (EnemyState precedent) and enforces the independence AC harder than a shared struct would. The epic's sketch was aspiration, not code.
- **dt = 0 pinned as a full saucer-side no-op (except the kill check)** → ✓ ACCEPTED by Reviewer: consistent extension of bz1-7's frozen-blast rule and bz1-8's mutual-kill-at-dt-0 semantics; verified compliant at saucer.ts:158-186.
- **Concrete visit constants pinned inside TEA's bands (no quarry citation)** → ✓ ACCEPTED by Reviewer: every constant is honestly labeled PROVISIONAL in the module header with the true-up story named; values sit comfortably inside the bands.
- **Hostile-first shell precedence in main.ts wiring** → ✓ ACCEPTED by Reviewer: a deliberate, logged answer to TEA's open Question; the hostile-outranks-visitor rationale is sound and the ordering is trivially flippable if a quarry decode rules otherwise. Verified at main.ts:76-86.