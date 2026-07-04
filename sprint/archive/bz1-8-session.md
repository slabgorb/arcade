---
story_id: "bz1-8"
jira_key: ""
epic: "bz1"
workflow: "tdd"
---
# Story bz1-8: Missiles + super tanks — guided missile (2000), super tank (3000), score-threshold intro

## Story Details
- **ID:** bz1-8
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-03T23:45:08Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-03T23:04:52Z | 2026-07-03T23:06:37Z | 1m 45s |
| red | 2026-07-03T23:06:37Z | 2026-07-03T23:23:36Z | 16m 59s |
| green | 2026-07-03T23:23:36Z | 2026-07-03T23:33:55Z | 10m 19s |
| review | 2026-07-03T23:33:55Z | 2026-07-03T23:45:08Z | 11m 13s |
| finish | 2026-07-03T23:45:08Z | - | - |

## Sm Assessment

**Setup complete; story routed to TEA for the RED phase.**

- **Scope:** Two new hostile kinds — guided missile (2000 pts) and super tank (3000 pts) — plus the score-threshold logic that introduces them. Direct successor to bz1-7's enemy-tank foundation; the roster rework this story performs is where bz1-7's queued edge tests (dt=0 no-op for stepEnemies, mutual-kill frame) get paid down.
- **Workflow:** `tdd` (phased) per sprint YAML — correct for a 3-pt core-sim feature with ROM-derived behavior to pin.
- **Branch:** `feat/bz1-8-missiles-super-tanks` cut from `develop` at f3fcdb5 (the bz1-7 merge); working tree clean; PRs target `develop` (gitflow).
- **Jira:** none — local sprint tracking only, intentionally skipped.
- **Technical anchor (from bz1-7 review):** copy the AI-as-Input pattern (`src/core/enemies.ts:aiInput`) — hostiles emit dual-tread `Input` and move through the same `stepTank` physics as the player. `Hostile.kind: 'tank'` is a literal union built to widen. Missiles may need their own kinematics (they fly, not drive) — that's a TEA/Dev/Architect call, not mine.
- **Risks:** slow-tank ROM constants were provisional in bz1-7; missile/super-tank constants may be equally undocumented — same behavioral-band approach applies. Core purity rule (no Date.now/Math.random in src/core) remains in force and is test-enforced.

Handoff: Imperator Furiosa (TEA) authors the failing contract tests.

## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `battlezone/tests/core/enemies-roster.test.ts` — the bz1-8 contract: roster widening ('tank' | 'super-tank' | 'missile'), score-threshold introduction, GetTankType launch-counter selection, ROM-exact kill awards (2000/3000), guided-missile flight (contact kill, straight first missile, weave-then-home, scrap-on-overshoot), super-tank behavior, radar kinds, bz1-7's carried edge debts (dt=0, mutual-kill frame), era invariants (always-one-hostile, determinism, non-mutation).
- `battlezone/tests/core/core-purity-sweep.test.ts` — epic-rule backstop: EVERY `.ts` under `src/core/` (present and future) scanned for DOM/time/randomness tokens and type-safety escapes. Green against the pre-bz1-8 tree; closes the "new core file dodges the per-story purity scan" hole.

**Tests Written:** 33 roster tests covering the 7 ACs (defined into context-story-bz1-8.md) + 27 sweep tests
**Status:** RED (failing — ready for Dev). Verified by testing-runner: 32 failed, ALL clean `CONTRACT:` misses on the missing widened exports (first miss: `SUPER_TANK_AFTER_MISSILES`); 347 passed (319 pre-existing + 27 sweep + 1 radar-filter pin that pins existing bz1-6 behavior); zero collection-time crashes.

**Contract pinned for Dev (full citations in the test-file header):**
- `Hostile.kind: 'tank' | 'super-tank' | 'missile'` (spellings = radar.ts's RadarContactKind — no translation table)
- `EnemyState.missilesLaunched: number` (ROM launch counter; increments on missile SPAWN, dis65 6690)
- `stepEnemies(..., score = 0)` — 5th param feeds spawn selection; every bz1-7 call site stays valid
- `SUPER_TANK_AFTER_MISSILES = 5` ROM-EXACT (dis65 6587), `MISSILE_CLOSE_RANGE = 0x0800` ROM-EXACT (dis65 5787), `MISSILE_ABANDON_RANGE` band ≥ FAR_CULL (dis65 7076)
- Missiles: contact-kill, never fire shells, weave-then-home, scrap-and-replace on overshoot (tank persists). Super tank: slow-tank AI, faster, shared shell system.
- **Technical anchor for GREEN:** copy bz1-7's AI-as-Input pattern for the super tank verbatim (throttle up); the missile needs its own kinematics (it flies — no dual-tread pivot), but keep it a pure reducer drawing from the carried seed.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| epic core-purity (no DOM/time/randomness) | `core-purity-sweep` × every src/core file | passing (enforcement, incl. Dev's future files) |
| lang-review #1 type-safety escapes | `core-purity-sweep` escape scan × every src/core file | passing (enforcement) |
| lang-review #2 readonly/mutation discipline | `stepEnemies never mutates its inputs` (frozen state) | failing (RED) |
| lang-review #4 null/undefined handling | shell-null paths: `never fires a shell`, mutual-kill in-flight shell | failing (RED) |
| lang-review #8 test quality (self-check) | vacuous-assertion sweep of own suite; 1 drafting artifact (unused helper w/ vacuous ternary) found and removed pre-commit | done |
| determinism (epic standing AC) | `replays byte-identical`, `deterministic respawn` | failing (RED) |

**Rules checked:** 4 of 4 applicable lang-review families have enforcement or RED coverage (React/async/build/perf families N/A — pure core, no JSX/promises/config changes)
**Self-check:** 1 vacuous construct found and removed before commit; loader keeps the established `as unknown as Partial<T>` house pattern (bz1-7 review: accepted precedent, runtime-gated); test-local `Hostile.kind` typed as the literal union — the "tighten next touch" note from bz1-7's review is honored

**Commit:** `c8afdfb` on `feat/bz1-8-missiles-super-tanks`

**Handoff:** To The Word Burgers (Dev) for GREEN — make the 32 contract misses pass without touching the 347 that already do.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `battlezone/src/core/enemies.ts` — roster widening: `HostileKind` union + `missilesLaunched` counter; ROM spawn selection (`chooseKind` — DIP threshold gate, seeded missile draw, GetTankType counter rule); `spawnHostile` takes a kind (one creation path, dis65 6725); kill awards by kind (`KILL_AWARD`); `stepMissile` guided flight (weave-then-home on the phaseAge half-second clock, first-missile straight-in, contact kill at PLAYER_RADIUS, no obstacle checks — it flies); missile scrap-and-replace past `MISSILE_ABANDON_RANGE` (tanks persist); super tank = slow tank AI at full throttle (AI-as-Input, per TEA's anchor); dt>0 gate on blast expiry; `radarContacts` kind passthrough; `score = 0` 5th param on `stepEnemies`.
- `battlezone/src/main.ts` — live score threaded into `stepEnemies`; alive hostile drawn by kind via `HOSTILE_MODEL` (SLOW_TANK / SUPER_TANK / MISSILE, all pre-existing ROM-exact wireframes); header updated.

**Tests:** 379/379 passing (GREEN — verified by testing-runner, RUN_ID bz1-8-dev-green: 319 pre-existing + 33 roster + 27 purity sweep, zero regressions). `npm run build` (tsc --noEmit + vite) clean.
**Branch:** `feat/bz1-8-missiles-super-tanks` (pushed; commits c8afdfb RED, 0f28b98 GREEN)

**Wiring check:** missile/super-tank reachable in the running game — score ≥ 10000 flips `chooseKind` live because main.ts now passes its score accumulator; radar paints the new kinds through the untouched bz1-6 filter; render picks the right wireframe per kind and EXPLOSION_DEBRIS for any blast.

**Handoff:** To Imperator Furiosa (TEA) for verify (simplify + quality-pass).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (379/379 tests, build clean, 0 smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered personally (see [EDGE] items) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered personally (see [SILENT] item) |
| 4 | reviewer-test-analyzer | Yes | findings | 7 (3 medium, 4 low) | confirmed 7, dismissed 0, deferred 0 — all non-blocking, queued below |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered personally (see [DOC] items) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain covered personally (see [TYPE] item) |
| 7 | reviewer-security | Yes | findings | 2 (both low, informational) | confirmed 2 as defense-in-depth notes, dismissed 0 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain covered personally (see [SIMPLE] item) |
| 9 | reviewer-rule-checker | Yes | clean | none (16 rules × 47 instances, 0 violations) | N/A — cross-referenced against my own rule pass, no contradictions |

**All received:** Yes (4 enabled returned; 5 disabled covered personally)
**Total findings:** 9 confirmed (0 blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Observations (tagged by domain — disabled subagents' domains covered personally):**

1. `[TEST]` (MEDIUM ×3, confirmed from test-analyzer) Missing edge tests: (a) MISSILE_ABANDON_RANGE exercised only at 1.05× — the exact boundary and just-under cases are unpinned (a `>`→`>=` mutation would survive); (b) stepMissile never driven at extreme dt — the "no tunneling" comment is load-bearing but only true at the shell's 0.05 clamp; (c) no kill-mid-weave case (all missile kills strike a pristine pose). All non-blocking: the abandon constant is itself provisional (boundary tests on a provisional byte have limited value until the quarry decode), extreme-dt is the same class as bz1-7's accepted point-sample deferral (swept walk queued for sim.ts), and kill-mid-weave goes to the next roster touch (bz1-9). Logged as Delivery Findings with owners.
2. `[TEST]` (LOW ×4, confirmed) Weave test pins bidirectionality but not periodicity (random jitter would pass — acknowledged in the logged provisional-band deviation); close-range boundary (exactly $0800) untested; dt=0 with already-overlapping missile unverified either way; one dead-weight `expect(r.state).toBeTruthy()` at enemies-roster.test.ts:1330 (the real assertion is the frozen-input JSON compare on the next line). Fix opportunistically next touch.
3. `[SEC]` (LOW ×2, confirmed as informational) No exploitable path: dt is unvalidated at the core boundary (shell clamp at main.ts is the only guard — queue core-side finite-dt validation with sim.ts); KILL_AWARD/HOSTILE_MODEL Record reads are safe under the closed union (no runtime path for an out-of-union kind in the shipped game). Purity grep-verified independently: zero banned tokens across all of src/core.
4. `[RULE]` (clean) 16 rules × 47 instances, zero violations. The two judgment calls I specifically ordered checked came back sound: `state.missilesLaunched ?? 0` is NOT dead code (bz1-7's test literals genuinely deliver undefined at runtime; `??` is the correct operator); `KILL_AWARD: Readonly<Record<HostileKind, number>>` is compile-time exhaustive — STRONGER than switch+assertNever (a new kind fails to compile until every table updates). The `as unknown as Partial<T>` loader instance matches the accepted bz1-7 precedent exactly (downgraded LOW, not dismissed — standing follow-up to formalize the pattern remains open).
5. `[EDGE]` (personal pass — subagent disabled) Boundary sweep: missile at exactly MISSILE_ABANDON_RANGE flies on (strict `>`, consistent with the house's strict comparisons); `Math.sign(0) = 0` → aimed missile holds course, no NaN; wrapAngle(±π) resolves to π deterministically; kill-vs-contact same frame resolves kill-first (justKilled skips movement — deterministic, no double event); a dt=0 step CAN scrap-and-replace an out-of-range missile (position-triggered, not time-triggered — only reachable via hand-built states since position can't drift at dt=0; consistent enough, noted); first-missile pampering keyed on launched===1 dies with missile #1 even if scrapped unseen — acceptable; the ROM's 8-bit counter wrap (the 256th missile is ALSO "nice") is not replicated — our counter never wraps; unreachable in human play (~512K+ score), logged as a Delivery Finding for honesty.
6. `[SILENT]` (personal pass — subagent disabled) No swallowed errors in the new core paths — pure math, no exceptions, no fallbacks except the deliberate, commented `?? 0` back-compat shim (returned states always carry the field, so it cannot mask a live-game caller bug); `playerHit = playerHit || flown.playerHit` preserves the enemy-shell signal — no event swallowing. The playerHit signal itself remains consequence-free by standing scope decision (bz1-10 owns lives).
7. `[DOC]` (personal pass — subagent disabled, LOW ×2) Two stale doc drifts caught: stepEnemies's function doc block still reads "kill → exploding + 1000 pts" and "AI drive + aimed fire while alive" (now 1000/2000/3000 and missiles never aim-fire); EnemyStepResult.playerHit's doc says "the enemy's shell reached the player" (now also missile contact). Both misleading-if-trusted; next-touch fix, logged as a Delivery Finding. Header ROM citations verified against the quarry — GetTankType 6581/6587, CreateNewEnemyUnit 6590-6617, counter 6690, flight 5753-5807, scrap 7076/6889, common creation 6725 — all accurate.
8. `[TYPE]` (personal pass — subagent disabled) Type design sound: HostileKind literal union spelled identically to RadarContactKind (passthrough, no translation drift possible); missilesLaunched readonly on state; stepMissile returns explicit readonly shape; `score = 0` default is minimal-breaking widening done right; `type`-qualified imports correct in main.ts. The union deliberately excludes the saucer (bz1-9 visitor ≠ hostile) — right call, prevents bz1-9 from abusing the hostile slot.
9. `[SIMPLE]` (personal pass — subagent disabled) Lean diff: no dead code, no speculative abstraction. spawnReplacement closure used exactly twice, justified. Math.hypot in stepMissile could reuse squared distances (trivial, not worth a cycle). wrapAngle is now at 2 source copies + test copies — extraction trigger (3rd source copy) not yet fired, Dev logged it. HOSTILE_MODEL map in main.ts is the minimal render dispatch.
10. `[VERIFIED]` Core purity — zero banned tokens across ALL of src/core (independently grep-verified by security agent AND the new directory-wide core-purity-sweep.test.ts, which closes the new-file-dodges-scan hole; complies with the epic core-purity rule). Evidence: security agent's grep sweep, 0 matches; sweep test enumerates every src/core/*.ts.
11. `[VERIFIED]` Determinism — roster-era replay: longRun (600 steps spanning kills, blasts, missile spawns at threshold) deep-equals itself (enemies-roster.test.ts:1319); replacement spawns deterministic per seed word (respawn toEqual respawn). Complies with the epic's standing determinism AC. Evidence: tests pass at HEAD, re-verified by preflight.
12. `[VERIFIED]` ROM-exact pins — SUPER_TANK_AFTER_MISSILES === 5 (dis65 6587 quoted in quarry: "super tank if it's $05 <= N < $80") and MISSILE_CLOSE_RANGE === 0x0800 (dis65 5787: "use distance threshold of $0800") both byte-cited and test-pinned both ways. Complies with the "ROM is canonical" epic rule; provisional constants are all labeled and deviation-logged.

**Rule Compliance:** rule-checker's 16-rule enumeration cross-checked against my own read of `.pennyfarthing/gates/lang-review/typescript.md`: #1 escapes (2 instances — 1 accepted precedent, 1 enforcement test), #2 generics (6 — all typed Records/readonly shapes), #3 exhaustiveness (3 — union+Record pattern exceeds switch/assertNever), #4 null handling (5 — the one defaulting site uses `??`), #5 modules (4 — export type/import type correct), #6 N/A, #7 async (1 — RED-loader accepted), #8 test quality (3 — contract interfaces field-identical to real exports), #9-#10 N/A, #11 errors (1 — bare catch re-surfaces as CONTRACT message), #12 perf (3 — test-only I/O), #13 meta (re-scan clean), + epic purity, accepted precedents, house conventions (7 readonly/reducer instances). Zero violations; no dismissals of rule-matching findings.

**Data flow traced:** keyboard → `KeyboardTreads.read()` → `Input` → `stepTank`/`stepFiring` (player pose + shell) → `stepEnemies(state, pose, shell, dt, score)` — score being main.ts's own accumulator fed back in — → `chooseKind` gates missile entry at MISSILE_INTRO_THRESHOLD (≥, ROM semantics) → `{state, scoreAward, playerShellConsumed, playerHit}` → main.ts nulls consumed shell, accumulates score → render dispatch by `hostile.kind` (HOSTILE_MODEL) → radarContacts kind-passthrough → deriveRadar (filter untouched). Safe because: every core stage is a pure reducer over readonly inputs; the only wall-clock/DOM lives in the shell; score is a local integer that only grows by ROM constants.

**Wiring:** missile and super tank are REACHABLE in the running game — main.ts:70 passes the live score (threshold crossable at 10 kills), HOSTILE_MODEL renders MISSILE/SUPER_TANK wireframes (ROM-exact, models.ts), radar paints both new kinds through the unchanged bz1-6 filter, EXPLOSION_DEBRIS covers every kind's blast. Build + 379 tests green at HEAD (preflight re-verified, not stale).

**Pattern observed:** the AI-as-Input pattern held its promise — the super tank is ONE constant (throttle 1.0) through the identical aiInput/stepTank path (enemies.ts:441), zero new physics; and the missile correctly REFUSED the pattern (stepMissile owns flying kinematics — dual treads can't fly). Knowing when a pattern doesn't apply is the pattern working.

**Error handling:** pure-math core, no throw paths; NaN-in→NaN-out garbage-in contract unchanged (security confirmed no hang path — the turn clamp is bounded by |err| ≤ π regardless of dt); rAF dt clamped shell-side (main.ts, Math.min(0.05, …)) remains the single dt guard — core-side validation queued as defense-in-depth.

**Tenant isolation audit:** N/A as a domain — client-only single-player game, no backend, no tenancy, no cross-user state, no identity parameters on any function in the diff. localStorage untouched this story (grep-confirmed).

**Hard questions:** Can the weave starve closure? No — net closure ≥ cos(0.35)·speed ≈ 94%, and homing takes over inside $0800. Two hostiles at once? Impossible — single slot, replacement only on retire/scrap. Counter overflow? Unbounded increment, but Number-safe for ~10¹⁵ missiles. Threshold hysteresis? Score never decreases until game-restart (bz1-10's scope; page reload resets everything today). Missile hits player — then what? A signal and a detonation; lives are bz1-10's owned scope, standing decision. Race conditions? None possible — synchronous single-threaded reducer.

### Devil's Advocate

Let me argue this code ships a broken game. First, the duel is still theater: a missile screams in at 11,520 units per second, detonates on the player — and NOTHING happens. No death, no life lost, no screen crack. The playerHit signal has been consequence-free since bz1-7, and now we've built a whole weapon whose ONLY job is to deliver a consequence that doesn't exist. Is the story even meaningful without it? Yes — narrowly: the missile is killable (2000 pts), it drives the launch counter that summons super tanks, and the threshold machinery is real progression; the consequence arrives with bz1-10's lives model, which every log names as owner. But I want it on the record: until bz1-10 lands, missiles are expensive fireworks. Second: the first-missile pampering is keyed to launched === 1, so if missile #1 spawns behind the player and gets scrapped unseen, the player's actual first ENCOUNTER is an un-pampered weaving missile — arguably violating the ROM's "be nice" intent. Micro-fidelity; the ROM keys off its own counter the same way. Third: MISSILE_SPAWN_CHANCE = 0.4 is invented. The ROM XORs successive random draws — the true odds might be 50% or state-dependent; our 40% is a guess wearing a provisional label. If playtest says missiles feel rare or relentless, that byte is the first knob. Fourth: a missile that chases a fleeing player can orbit at exactly the abandon boundary forever in principle — strict `>` plus re-homing means no despawn while it hovers at 35,999. Contrived (requires matched speeds), bounded (it still closes when it can), and the one-pass latch queued for bz1-10 dissolves it. Fifth: the dt=0 scrap-and-replace is a zero-time world mutation — philosophically impure, practically unreachable. None of this rises to blocking; all of it has a named owner. The threshold machinery, the counter rule, and the kill awards are byte-cited ROM facts with tests pinning them both ways. Witness me approve this.

**Handoff:** To The Organic Mechanic (SM) for finish-story — PR creation, merge ceremony. I do not merge; I judge.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

Carry-forward from bz1-7 (Enemy tanks):
- The "AI-as-Input" pattern (enemy emits dual-tread Input and moves through stepTank physics) should be copied for bz1-8's missile/super-tank AI
- Queued edge tests: dt=0 no-op for stepEnemies, mutual-kill frame
- `Hostile` type has `kind: 'tank'` union ready for widening to include 'missile' and 'super_tank'

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): `stepEnemies` gains a 5th parameter `score = 0` — main.ts must thread its live score accumulator into the call so threshold spawning actually engages in the running game. Affects `src/main.ts` (pass score into stepEnemies). *Found by TEA during test design.*
- **Improvement** (non-blocking): the render layer needs a kind-switch — `MISSILE` and `SUPER_TANK` wireframes already exist ROM-exact in `models.ts` (bz1-2 §6); alive hostiles must draw by `hostile.kind`, not hardcoded SLOW_TANK. Affects `src/main.ts` / `src/shell/render.ts` (model selection). *Found by TEA during test design.*
- **Question** (non-blocking): the missile/super-tank speed constants, missile swerve amplitude, and the "gets too far away" scrap distance are undecoded quarry bytes — Dev picks provisional values inside the tests' behavioral bands and labels them provisional (bz1-7 house pattern; bz1-12 playtest trues up). Affects `src/core/enemies.ts` (new tuned constants). *Found by TEA during test design.*
- **Improvement** (non-blocking): the missile buzz (POKEY ch3/4, findings §8) is bz1-11's audio story — `kind === 'missile'` in EnemyState is the hook it will read; nothing to do this story. Affects `src/shell/` (future audio wiring). *Found by TEA during test design.*
- **Gap** (non-blocking, PAID DOWN): bz1-7's queued edge tests — dt=0 spatial no-op for stepEnemies and the mutual-kill frame — are shipped in this suite, closing that review debt. Affects `tests/core/enemies-roster.test.ts` (now covered). *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): missiles are not one-pass — a dodged missile circles back instead of flying on to the scrap range, softening the ROM's dodge-reward (see the moderate Dev deviation). Affects `src/core/enemies.ts` (stepMissile needs a "passed the player" latch + a moving-player test). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the missile draws as a ground-level wireframe; the ROM missile flies at altitude $1800 and visibly dives. A render-side vertical offset (fade-in drop) would sell the flight without touching the planar core. Affects `src/main.ts` / `src/shell/render.ts` (projectModel already takes a world pose — needs a y hook or a dedicated missile draw). *Found by Dev during implementation.*
- **Question** (non-blocking): the ROM forces missile consideration at score ≥ 100K ("over 100K points? yes, think about a missile", dis65 6594-6596) independent of the DIP threshold — irrelevant until scores can reach 100K, but bz1-10's ratchet should decide whether to port it. Affects `src/core/enemies.ts` (chooseKind). *Found by Dev during implementation.*
- **Improvement** (non-blocking): `wrapAngle` now has copies in radar.ts, enemies.ts and the test files — bz1-7's review said a third source copy justifies a math util extraction; enemies.ts is still the second source copy, so the trigger hasn't fired, but the next angle-touching story should extract. Affects `src/core/` (future math util). *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): missing edge tests — MISSILE_ABANDON_RANGE exact boundary, extreme-dt missile tunneling (same class as the deferred swept-walk), kill-mid-weave. Affects `tests/core/enemies-roster.test.ts` (three cases; fold the first two into the sim.ts-era swept refinement, the third into bz1-9's roster touch). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): two stale doc drifts — stepEnemies's doc block still says "+ 1000 pts" / "AI drive + aimed fire while alive", and EnemyStepResult.playerHit's doc says "the enemy's shell" (now also missile contact); plus one dead-weight `toBeTruthy` assertion. Affects `src/core/enemies.ts` (two doc blocks) and `tests/core/enemies-roster.test.ts:1330` (tighten or drop). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): core-side dt validation absent — the shell's `Math.min(0.05, …)` clamp is the only guard against non-finite dt poisoning EnemyState; bound it at the core boundary when sim.ts arrives (pairs with bz1-7's unbounded-spawn-loop deferral). Affects `src/core/enemies.ts` (stepEnemies dt guard). *Found by Reviewer during code review.*
- **Gap** (non-blocking): the ROM's 8-bit missile counter wraps — the 256th missile is ALSO "nice" (first-missile straight-in); our unbounded counter never wraps, so that fidelity nuance is absent. Unreachable in human play (~512K+ score); record for the bz1-10 ratchet decision. Affects `src/core/enemies.ts` (stepMissile pampering predicate). *Found by Reviewer during code review.*
- **Question** (non-blocking): missiles detonate with zero player consequence until bz1-10's lives model — the roster's headline weapon delivers a signal into a void. Confirming this is understood as the standing playerHit scope decision, not an oversight; bz1-10 must close the loop. Affects `src/main.ts` (future lives/death wiring). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Missile weave pinned as a behavioral band, not the ROM's exact swerve curve**
  - Spec source: reference/rom-quarry/Battlezone.dis65, offsets 5799-5807 + boxed comment ("amount of swerve is determined by the low 5 bits of the game frame counter, which cycle in the span of 2 seconds")
  - Spec text: swerve direction flips on frame-counter bit 3 (0.5 s halves); amplitude derived from the low 5 counter bits
  - Implementation: tests pin "deviation visibly crosses BOTH sides of the bearing line (> 0.05 rad each way) within 2 s, while net distance shrinks" — no global frame counter exists in the dt-based sim
  - Rationale: the counter mechanism is ROM hardware ambience; the observable behavior (alternating ~0.5 s weave that still closes) is what the player experiences and what the sim can honestly promise
  - Severity: minor
  - Forward impact: bz1-12 playtest true-up may tighten amplitude/period once felt in-game
- **Missile / super-tank speeds pinned as RELATIVE closure bands, not absolute constants**
  - Spec source: docs/battlezone-1980-source-findings.md (velocity tables listed among deferred decodes)
  - Spec text: exact per-unit velocity constants exist in ROM but are not yet byte-decoded
  - Implementation: tests assert missile out-closes super tank out-closes slow tank from identical starts; absolutes are Dev-provisional
  - Rationale: bz1-7 precedent (slow-tank throttle provisional inside a behavioral band); pinning invented absolutes would fabricate ROM facts
  - Severity: minor
  - Forward impact: bz1-12 playtest + future quarry decode true up the constants
- **MISSILE_ABANDON_RANGE pinned as a band (≥ FAR_CULL), not the ROM distance**
  - Spec source: Battlezone.dis65 offset 7076 / 6889
  - Spec text: "Player out of range of enemy. If it's a missile, we kill it and make a new unit." — the actual range value is not in the quarried comments
  - Implementation: exported constant required, bounded below by FAR_CULL so fresh spawns (≤ 30k ring) can never be scrapped at birth; behavioral tests exercise 1.05× the constant
  - Rationale: the semantics (missile scrapped, tank persists, same-step replacement, no score) are the ROM facts; the distance byte is not yet decoded
  - Severity: minor
  - Forward impact: quarry decode or bz1-12 playtest pins the exact value
- **Secondary missile threshold (base + 25K) NOT tested this story**
  - Spec source: findings doc §2 (dis65 $6679 / offsets 5753-5781)
  - Spec text: "Missiles have a second score threshold equal to the base threshold plus 25K points" — it modulates missile close-in behavior via score-differential distance thresholds
  - Implementation: no tests; the base-threshold intro is fully pinned, the secondary behavior shift is left to the difficulty story
  - Rationale: the dis65 shows the secondary threshold woven into the aggression/score-differential machinery that IS bz1-10's scope; splitting it here would half-port bz1-10
  - Severity: minor
  - Forward impact: bz1-10 (difficulty ratchet) must pick this up — flagged in its direction by this entry
- **"Player dead → always create a tank" (dis65 6592) untested**
  - Spec source: Battlezone.dis65 offset 6590-6592
  - Spec text: "is the player alive? no, always create a tank"
  - Implementation: no player-death model exists (playerHit is still a signal-only, per bz1-7's logged scope decision), so the branch is unreachable and untestable
  - Rationale: cannot test a state the sim cannot represent; lives/death arrive in bz1-10
  - Severity: minor
  - Forward impact: bz1-10 adds the lives model and must add this selection test
- **Missile altitude ($1800) not modeled in the planar core**
  - Spec source: Battlezone.dis65 offset 6693 ("set altitude = $1800")
  - Spec text: missiles fly at a fixed altitude above the plain
  - Implementation: EnemyState stays planar (x/z) per the standing planar-sim ruling; altitude is a render-layer affair
  - Rationale: bz1-4's planar ruling is epic-wide; altitude affects the drawn silhouette, not the duel geometry
  - Severity: minor
  - Forward impact: render wiring (this story's GREEN or bz1-12) may fake the visual drop; core unaffected
- **missilesLaunched modeled 0-based, ROM uses a $ff "none yet" sentinel**
  - Spec source: Battlezone.dis65 offsets 1603-1605, 6582-6587
  - Spec text: game start writes $ff ("no missiles launched yet"); GetTankType wants slow tanks for $80-ff and super tanks for $05 ≤ N < $80
  - Implementation: counter starts at 0 and only increments; the $80-ff sentinel band is unreachable by construction
  - Rationale: the sentinel is a 6502 idiom (sign-bit test), not gameplay; a monotone 0-based count preserves every observable behavior
  - Severity: minor
  - Forward impact: none

### Dev (implementation)

- **MISSILE_SPAWN_CHANCE pinned at 0.4 (provisional)**
  - Spec source: Battlezone.dis65 offsets 6613-6617 (via context-story-bz1-8.md AC-2)
  - Spec text: "get a random number" / "XOR with previous random value" — a draw decides missile-vs-tank above the threshold; exact odds not quarried
  - Implementation: `nextFloat(rng) < 0.4` in `chooseKind`, one draw per above-threshold replacement
  - Rationale: TEA's band only requires "missiles join a mixed rotation, deterministically per seed"; 40% keeps tanks the majority partner, which matches the hub page's tone (missiles as punctuation, not the norm)
  - Severity: minor
  - Forward impact: bz1-10 (difficulty) or a deeper quarry decode may replace the flat draw with the ROM's XOR chain
- **Missile flight constants: speed 11520 (2× player MAX_SPEED), turn 8 rad/s, swerve ±0.35 rad / 0.5 s**
  - Spec source: context-story-bz1-8.md AC-4; dis65 5753-5807
  - Spec text: velocity/amplitude bytes undecoded; period IS the ROM's half-second flip
  - Implementation: constants in enemies.ts, labeled provisional; swerve clock reads `phaseAge` (the sim's deterministic stand-in for the ROM frame counter)
  - Rationale: satisfies TEA's relative bands (missile > super > slow closure) and the homing-monotonicity pin (turn rate must beat bearing drift v·sin(err)/d down to contact range — 8 rad/s clears the worst case ~5.6)
  - Severity: minor
  - Forward impact: bz1-12 playtest true-up
- **MISSILE_ABANDON_RANGE = 36000 (provisional)**
  - Spec source: context-story-bz1-8.md AC-4; dis65 7076/6889
  - Spec text: "gets too far away" — distance byte undecoded; TEA band: ≥ FAR_CULL (31487)
  - Implementation: 36000 — clears the far plane and the 30k spawn ring with margin
  - Rationale: smallest round number that can never scrap a fresh spawn
  - Severity: minor
  - Forward impact: quarry decode or bz1-12 playtest pins the true value
- **Missile re-homes after a missed pass (ROM: one pass, then scrap)**
  - Spec source: Battlezone.dis65 offset 6889 ("if a missile misses the player and gets too far away, this spawns a new one")
  - Spec text: ROM missiles make one dive; a dodged missile flies on until the range check kills it
  - Implementation: the missile always steers toward the player (weave/home), so after a dodge it circles back; the abandon check exists but rarely triggers against the steer-back behavior
  - Rationale: no test pins one-pass (a stationary test player can't be missed); one-pass needs a "passed the player" latch — scope-creep without a failing test
  - Severity: moderate — dodging a missile currently doesn't dispose of it, which softens the ROM's dodge-reward
  - Forward impact: bz1-10 (aggression/difficulty) should add the one-pass latch + a moving-player test; flagged in Delivery Findings
- **Missiles ignore obstacles in flight**
  - Spec source: Battlezone.dis65 offset 6693 ("set altitude = $1800")
  - Spec text: missiles fly above the field
  - Implementation: stepMissile performs no isBlocked/shellBlocked checks
  - Rationale: matches the ROM (altitude clears the obstacles); the planar core simply omits the check rather than modeling y
  - Severity: minor
  - Forward impact: none — render may fake the drop visually (bz1-12)
- **Missile contact radius = PLAYER_RADIUS (provisional)**
  - Spec source: Battlezone.dis65 offset 6533 ("missile radius?")
  - Spec text: the ROM's collision-diameter table ($6139) remains an undecoded deferral (house pattern since bz1-4/bz1-5)
  - Implementation: contact when dist < PLAYER_RADIUS (1152)
  - Rationale: same stand-in TANK_HIT_RADIUS already uses; one frame-step (192) ≪ radius, no tunneling
  - Severity: minor
  - Forward impact: $6139 decode trues up all collision radii at once
- **dt = 0 no longer expires a blast (behavior change from bz1-7 code)**
  - Spec source: tests/core/enemies-roster.test.ts ("dt = 0 never expires a blast") via context-story-bz1-8.md AC-7
  - Spec text: frozen time must not advance lifecycle timers
  - Implementation: the expiry branch now requires `dt > 0`
  - Rationale: TEA pinned the freeze; bz1-7's code would have respawned off a stale `age >= duration` comparison at dt=0
  - Severity: minor
  - Forward impact: none — no caller steps with dt=0 outside tests
- **Super tank throttle = 1.0 (provisional)**
  - Spec source: context-story-bz1-8.md AC-5
  - Spec text: "strictly faster closure" — ROM speed byte undecoded
  - Implementation: the player's full throttle through the same aiInput/stepTank path (AI-as-Input pattern, per TEA's anchor)
  - Rationale: 2× the slow tank's crawl with zero new physics; one throttle constant is the entire slow/super difference
  - Severity: minor
  - Forward impact: bz1-12 playtest true-up
### Reviewer (audit)

Every logged deviation reviewed against spec sources and the diff. Verdicts:

- **Missile weave pinned as a behavioral band, not the ROM's exact swerve curve** → ✓ ACCEPTED by Reviewer: the frame-counter mechanism is hardware ambience; the band pins what the player experiences. Test-analyzer's note that random jitter would also pass is the KNOWN cost of this band — tighten only if bz1-12 playtest demands it.
- **Missile / super-tank speeds pinned as RELATIVE closure bands, not absolute constants** → ✓ ACCEPTED by Reviewer: matches the bz1-7 provisional-band precedent; inventing absolutes would fabricate ROM facts.
- **MISSILE_ABANDON_RANGE pinned as a band (≥ FAR_CULL), not the ROM distance** → ✓ ACCEPTED by Reviewer: semantics are the ROM fact, the byte is undecoded; boundary test queued with the true-up.
- **Secondary missile threshold (base + 25K) NOT tested this story** → ✓ ACCEPTED by Reviewer: dis65 shows it woven into score-differential machinery that IS bz1-10's scope; splitting it here would half-port that story.
- **"Player dead → always create a tank" (dis65 6592) untested** → ✓ ACCEPTED by Reviewer: untestable until a lives model exists; bz1-10 must add the selection test with the model.
- **Missile altitude ($1800) not modeled in the planar core** → ✓ ACCEPTED by Reviewer: planar-sim ruling is epic-wide; render may fake the drop (finding logged).
- **missilesLaunched modeled 0-based, ROM uses a $ff "none yet" sentinel** → ✓ ACCEPTED by Reviewer: the sentinel is a 6502 sign-bit idiom; observable behavior preserved. One nuance found and logged as a finding: the ROM's 8-bit wrap (256th missile pampered) is not replicated — unreachable in human play.
- **MISSILE_SPAWN_CHANCE pinned at 0.4 (provisional)** → ✓ ACCEPTED by Reviewer: the ROM's XOR-chain odds are undecoded; 40% is a labeled guess and the first playtest knob (devil's advocate notes it explicitly).
- **Missile flight constants: speed 11520, turn 8 rad/s, swerve ±0.35 / 0.5 s** → ✓ ACCEPTED by Reviewer: inside TEA's bands; the turn-rate-vs-bearing-drift math in the rationale is sound (verified: 8 rad/s clears the worst-case ~5.6 at contact range).
- **MISSILE_ABANDON_RANGE = 36000 (provisional)** → ✓ ACCEPTED by Reviewer: clears far plane + spawn ring with margin; agrees with author reasoning.
- **Missile re-homes after a missed pass (ROM: one pass, then scrap)** → ✓ ACCEPTED by Reviewer, with emphasis: this is the diff's one MODERATE fidelity gap — dodging currently doesn't dispose of the missile, softening the ROM's dodge-reward. Correctly logged, correctly routed (bz1-10 one-pass latch + moving-player test, finding on file). Accepted BECAUSE it has an owner, not because it's small.
- **Missiles ignore obstacles in flight** → ✓ ACCEPTED by Reviewer: matches the ROM (altitude clears the field); omission is the honest planar rendering of that fact.
- **Missile contact radius = PLAYER_RADIUS (provisional)** → ✓ ACCEPTED by Reviewer: same stand-in the whole collision family already uses; $6139 decode trues up all radii at once.
- **dt = 0 no longer expires a blast (behavior change from bz1-7 code)** → ✓ ACCEPTED by Reviewer: frozen time freezing timers is the right semantics; TEA pinned it, Dev implemented it minimally (dt > 0 gate). The position-triggered dt=0 scrap remains possible by construction — noted in [EDGE], not a defect.
- **Super tank throttle = 1.0 (provisional)** → ✓ ACCEPTED by Reviewer: one constant through the shared physics is exactly what the AI-as-Input pattern promised.

No UNDOCUMENTED deviations found — I hunted specifically for unlogged spec drift (ROM 100K missile-force rule: Dev logged it as a Question finding; first-missile counter wrap: I logged it myself as a Gap finding). Every spec deviation in this diff is now explicitly accepted with rationale.