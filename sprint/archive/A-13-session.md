---
story_id: A-13
jira_key: ""
epic: A
workflow: tdd
---
# Story A-13: Saucer scoring (200/1000) + collisions + siren cadence

## Story Details
- **ID:** A-13
- **Jira Key:** (not used — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none
- **Repo:** asteroids
- **Branch:** feat/A-13-saucer-scoring-collisions-siren

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-04T11:05:04Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| red | 2026-07-04T10:23:50Z | 2026-07-04T10:42:32Z | 18m 42s |
| green | 2026-07-04T10:42:32Z | 2026-07-04T10:53:00Z | 10m 28s |
| review | 2026-07-04T10:53:00Z | 2026-07-04T11:05:04Z | 12m 4s |
| finish | 2026-07-04T11:05:04Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): The ship hitbox (SHIP_HITBOX=96) exceeds half the player/saucer
  muzzle travel (BULLET_SPEED/SAUCER_BULLET_SPEED = 111 lo-units/frame; 111/2 = 55.5), so a
  *both-endpoints-outside* tunnel through the ship is geometrically impossible — endpoint-only
  hit-testing would still catch a ship-crossing shot. The swept requirement for saucer-bullet↔ship
  is therefore a consistency/defensive measure, not a tunnel fix; the genuinely tunnelling pair is
  player-bullet↔small-saucer (narrow window). Affects `src/core/sim.ts` (collision wiring reuses
  `sweptOverlaps` for both pairs anyway — no change needed, just don't expect a discriminating
  tunnel test for the ship pair). *Found by TEA during test design.*
- **Question** (non-blocking): `SAUCER_HITBOX.small` must stay below ~51 lo-units for the
  player-bullet↔small-saucer tunnel guard to remain discriminating (the test asserts both shot
  endpoints, at −60 and +51 from centre, lie outside the hitbox). A small-rock-sized extent (~42)
  satisfies this and is faithful to the small saucer being a tiny target. Affects `src/core/saucer.ts`
  — A-17's quarry should port exact saucer collision extents and preserve this property. *Found by TEA during test design.*
- **Conflict** (non-blocking): `SAUCER_SCORE_SMALL` value (990 vs 1000) is unresolved — the tests
  assert against the exported constant, never a literal, so Dev/A-9/A-17 own the number without
  breaking these tests. Affects `src/core/score.ts` (constant must be defined + exported there, A-9's
  canonical scoring module, not hardcoded in saucer.ts). Restated from context so Dev sees it at the seam. *Found by TEA during test design.*

### Dev (implementation)
- **Conflict** (non-blocking): Shipped `SAUCER_SCORE_SMALL = 1000` (story-title authority); the 990 research read is unresolved. Affects `src/core/score.ts` — single edit site is the `SAUCER_SCORE_SMALL` constant, sourced everywhere via the `SAUCER_SCORE` record. A-17 to settle vs quarry bytes. *Found by Dev during implementation.*
- **Question** (non-blocking): `SAUCER_HITBOX` shipped as provisional feel values (large 90, small 42); small is kept < 51 so the swept anti-tunnel guard stays discriminating. Affects `src/core/saucer.ts` — A-17 to port exact saucer collision extents. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): Same-frame edge — a player bullet that kills a saucer on the same tick the ship overlaps it leaves the ship ALIVE, because the bullet loop nulls `saucer` before the ram check reads it (`sim.ts:242-289`). This is deterministic and arguably the player-friendly reading (you shot it before it hit you), but it is unverified by any test. Affects `src/core/sim.ts` — add a fixture pinning the intended rule (survive-if-killed), or have A-17 confirm against the quarry. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Defensive test-coverage gaps (all behaviour correct today; these harden against future refactors): a saucer kill wrapping the score past `SCORE_ROLLOVER` (99900+200→100); a two-bullets-one-saucer / bullet-hits-rock-first no-double-score guard; the small-saucer hitbox in the ram/rock contact checks (only the bullet path exercises it); and the two invulnerability tests could also assert the shot/saucer SURVIVE, not just that the ship lives. Affects `tests/saucer-collision.test.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **saucer-bullet↔ship tunnel test uses a path-crossing (not both-endpoints-outside) fixture**
  - Spec source: context-story-A-13.md, "No tunneling (regression guard)" AC
  - Spec text: "bullet↔saucer and saucer-bullet↔ship are tested with MOVING bullets — a shot at cardinal muzzle speed (111 lo-units/frame) whose path crosses the target this frame registers the hit even when neither the pre- nor post-move endpoint sits inside the hitbox"
  - Implementation: player-bullet↔saucer IS tested with BOTH endpoints outside the (small-saucer) hitbox — a genuine tunnel that fails under endpoint-only checking. saucer-bullet↔ship is tested with a MOVING bullet whose path crosses the ship dead-centre, but with one endpoint necessarily inside the hitbox.
  - Rationale: the ship hitbox (96) exceeds half the muzzle travel (111/2=55.5), so a shot cannot skip the 192-wide ship window (2×96) in one frame — a both-endpoints-outside tunnel is geometrically impossible for that pair, and endpoint-only would still catch it. The moving-bullet fixture still guards the wiring and moving-bullet handling (the stationary-fixture blind spot the AC warns about is avoided), and Dev reuses `sweptOverlaps` for both pairs per context. The genuinely tunnelling pair is covered strictly.
  - Severity: minor
  - Forward impact: A-17 should confirm the ship's effective bullet-collision extent; if a smaller extent (<~55) is later chosen, add a strict both-endpoints-outside tunnel test for saucer-bullet↔ship.
- **Collision fixtures hand-build Saucer literals (saucerAt), unlike sibling saucer.test.ts**
  - Spec source: tests/saucer.test.ts design note ("No Saucer is ever hand-built")
  - Spec text: sibling A-11 suite always produces saucers via the real spawn director to avoid coupling to internal timer fields
  - Implementation: saucer-collision.test.ts / siren.test.ts build `Saucer` literals at known positions (courseTimer/fireTimer parked high, zero velocity)
  - Rationale: collision geometry requires a saucer at a KNOWN point, which the random director cannot provide; the Saucer field names are a stable state.ts contract. Parked timers keep stepSaucer a no-op so the collision is isolated from movement/fire — the same motion-free idiom collision.test.ts uses for rocks.
  - Severity: minor
  - Forward impact: none — if the Saucer shape changes, these fixtures update alongside every other Saucer literal.

### Dev (implementation)
- **SAUCER_SCORE_SMALL shipped as 1000 (story title), not the 990 research read**
  - Spec source: context-story-A-13.md scoring table + story title
  - Spec text: "epic/story title say 1000; three independent research reads (both disassembly fetches + web search) say 990 — flagged for A-9/A-17 to resolve against actual quarry bytes"
  - Implementation: `SAUCER_SCORE_SMALL = 1000` in `src/core/score.ts` (A-9's canonical scoring module), consumed via the `SAUCER_SCORE` record — never hardcoded in saucer.ts or sim.ts
  - Rationale: a constant must hold a value; spec authority puts the story title (1000) above a research pass. It lives in exactly one place and the tests assert against the constant, so A-17 flipping it to 990 is a one-line change that cannot silently drift the tests.
  - Severity: minor
  - Forward impact: A-17 settles 990-vs-1000 against the quarry; single edit site is `score.ts` `SAUCER_SCORE_SMALL`.
- **Saucer collisions read the saucer's PRE-move position (stepSaucer runs afterward)**
  - Spec source: context-story-A-13.md "Code shape" + tests/saucer-collision.test.ts
  - Spec text: collision wiring extends A-8's helpers to the saucer pairs; intra-step ordering unspecified
  - Implementation: the saucer collision checks run in the main collision block on `state.saucer`'s position — BEFORE stepSaucer moves the saucer this frame. Bullets are post-move; the saucer is pre-move.
  - Rationale: minimal wiring that reuses the existing collision block. The saucer drifts only 16 lo-units/frame (vs bullets' 111), so the one-frame lag is negligible, and every test uses a zero-velocity saucer so it is exact there. Relocating after stepSaucer would tangle with despawn/fire ordering for no observable gain.
  - Severity: minor
  - Forward impact: none for gameplay; if A-17 wants frame-perfect saucer-motion-vs-collision, relocate the saucer checks after stepSaucer.

### Reviewer (audit)
- **TEA: saucer-bullet↔ship tunnel test uses a path-crossing fixture** → ✓ ACCEPTED by Reviewer: the geometry is provably correct — SHIP_HITBOX 96 > 111/2 = 55.5, so a both-endpoints-outside tunnel is impossible for this pair; test-analyzer independently confirmed the claim. The genuinely tunnelling pair (player-bullet↔small-saucer, hitbox 42) IS covered with a strict both-endpoints-outside fixture. Sound.
- **TEA: collision fixtures hand-build Saucer literals** → ✓ ACCEPTED by Reviewer: collision geometry needs known positions the random director can't give; `Saucer` field names are a stable state.ts contract and the fixtures match the motion-free idiom collision.test.ts uses for rocks. rule-checker confirmed the `Partial<Saucer>` override idiom matches every other test file.
- **Dev: SAUCER_SCORE_SMALL shipped as 1000 (story title), not 990** → ✓ ACCEPTED by Reviewer: spec authority (story scope > research pass) supports 1000; the value lives in exactly one place (`score.ts` `SAUCER_SCORE_SMALL`), is consumed via the `SAUCER_SCORE` record, and tests assert against the constant — so A-17 flipping it to 990 is a one-line, drift-proof change. The conflict is loudly flagged in-code and in Delivery Findings. Correct handling of a genuine ambiguity.
- **Dev: saucer collisions read the saucer's PRE-move position** → ✓ ACCEPTED by Reviewer: the saucer drifts ≤16 lo-units/frame vs bullets' 111, so the one-frame lag is negligible and exact in every zero-velocity test fixture; relocating after stepSaucer would tangle despawn/fire ordering for no observable gain. Forward impact correctly flagged for A-17.
- **No UNDOCUMENTED deviations found.** The same-frame bullet-kill-then-ram ordering (ship survives) is an unspecified implementation ordering, not a divergence from any stated spec; captured as a non-blocking Delivery Finding, not a deviation.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** New scoring wiring, four new collision pairs, and a new pure selector — all behaviour-bearing core code.

**Test Files:**
- `asteroids/tests/saucer-collision.test.ts` — scoring, the four collision pairs, swept anti-tunnel guard, invulnerability gate, determinism/purity
- `asteroids/tests/siren.test.ts` — `sirenState` pure selector + core/ audio-purity source scan

**Tests Written:** 22 tests across 2 files, covering all 8 acceptance criteria.
**Status:** RED — 15 behaviour-driving assertions failing (missing exports + unwired collision); the remaining 7 are negative / determinism / purity guards that are correctly green now and will bite the moment collision is mis-wired. Confirmed via testing-runner (`A-13-tea-red`): **2 files failed, 24 pre-existing files still pass — no regressions.**

**What Dev must build (the RED contract):**
- `src/core/score.ts`: export `SAUCER_SCORE_LARGE` (200 — corroborated) and `SAUCER_SCORE_SMALL` (990 vs 1000 — Dev/A-9/A-17 decide; tests assert vs the constant). Saucer kills must route through the same rollover + bonus-ship path as rocks.
- `src/core/saucer.ts`: export `SAUCER_HITBOX` (per-size `Readonly<Record<SaucerSize, number>>`, mirroring `ROCK_HITBOX`; keep `.small` < ~51), `SAUCER_ROCK_COLLISION_ENABLED` (true), and `sirenState(state) → 'large'|'small'|null`.
- `src/core/sim.ts`: wire four collision pairs into `stepGame` — player-bullet↔saucer (→ score + remove saucer + consume bullet, **via `sweptOverlaps`**), saucer-bullet↔ship (→ ship-destruction hook, **via `sweptOverlaps`**), saucer↔ship (mutual destruction, plain `overlaps`), and saucer↔rock behind the flag (saucer destroyed, rock unaffected, plain `overlaps`). All must honour the invulnerability gate (`shipSpawnTimer > 0` / `shipDestroyed`).

### AC Coverage

| # | Acceptance Criterion | Test(s) | Status |
|---|----------------------|---------|--------|
| 1 | Large kill +SAUCER_SCORE_LARGE(200); small kill +SAUCER_SCORE_SMALL (vs constant) | saucer-collision: 'adds exactly SAUCER_SCORE_LARGE', 'adds exactly SAUCER_SCORE_SMALL', 'pins…200', 'routes…bonus ship' | RED |
| 2 | Saucer↔ship destroys both | saucer-collision: 'destroys the ship AND the saucer', 'clear of the ship leaves both intact' | RED |
| 3 | Saucer-bullet↔ship, distinct path | saucer-collision: 'saucer bullet crossing the ship destroys it', 'flying clear…intact' | RED |
| 4 | Saucer↔rock behind flag; saucer destroyed, rock unaffected | saucer-collision: 'SAUCER_ROCK_COLLISION_ENABLED defaults to true', 'saucer touching a rock is destroyed and the rock is unaffected' | RED |
| 5 | No tunneling — MOVING bullets | saucer-collision: 'moving player shot…kills it (no tunnel)', 'flying clear…no over-trigger', + saucer-bullet moving fixtures (see Design Deviation on ship-pair geometry) | RED |
| 6 | sirenState null/large/small; no Audio in core/ | siren: 5 sirenState tests + 'never references any Web Audio surface' | RED |
| 7 | Determinism (same seed+dt → deep-equal) + banned-globals | saucer-collision: 'deeply-equal state', 'does NOT mutate the input'; core-boundary auto-covers new core files | RED/guard |
| 8 | `npm run build` + `npm test` green | (verified by Dev at GREEN; suite currently RED as intended) | pending |

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| Core purity — no Web Audio in core/ (AC-6 / project rule) | siren.test.ts 'never references any Web Audio surface anywhere in core/' | guard (green once `sirenState` exists) |
| Core purity — no entropy/wall-clock in core/ (A-2 banned-globals) | core-boundary.test.ts auto-scans new saucer/sim code; saucer-collision.test.ts 'deeply-equal state' + 'does NOT mutate the input' | RED/guard |
| TS #4 null/undefined — `sirenState` returns `null` (not `undefined`) when no saucer | siren.test.ts 'returns null when no saucer is alive', 'returns null on a fresh boot state' | RED |
| Determinism (SOUL — pure deterministic core step) | saucer-collision.test.ts determinism suite | RED/guard |

**Rules checked:** 4 of the applicable TS lang-review + project-rule checks have test coverage (≥3 required).
**Self-check:** Reviewed every test for vacuous assertions. Found and fixed one: the saucer↔rock behaviour test originally early-returned on a falsy `SAUCER_ROCK_COLLISION_ENABLED` (undefined in RED → vacuous pass); removed the guard so it genuinely runs and is RED. No `assert(true)`, no `let _ =`, no always-null assertions remain.

**Handoff:** To Dev (Julia) for GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/score.ts` — `SAUCER_SCORE_LARGE` (200) / `SAUCER_SCORE_SMALL` (1000) + `SAUCER_SCORE` record; extracted `addScore(points)` as the single rollover + bonus-ship entry point, with `applyScore` (rocks) delegating to it so saucer kills earn extra ships through the same path.
- `src/core/saucer.ts` — `SAUCER_HITBOX` (per-size: large 90, small 42), `SAUCER_ROCK_COLLISION_ENABLED` (true), and the pure `sirenState(state) → 'large'|'small'|null` selector (no audio, no timers).
- `src/core/sim.ts` — four collision pairs wired into `stepGame`'s single bullet pass + a shared invulnerability gate: player-bullet↔saucer (swept → score via `addScore` + remove saucer + consume shot), saucer-bullet↔ship (swept → ship-destruction latch, consume shot), saucer↔ship (mutual destruction), and flag-gated saucer↔rock (saucer dies, rock unaffected). The invuln window is decayed before the checks so it shields against every hazard.

**Tests:** 516/516 passing (GREEN) — all 22 A-13 tests green, zero regressions across the 24 pre-existing suites (confirmed via testing-runner `A-13-dev-green`, including an explicit regression check on A-11/A-12 saucer tests now that the ship is hittable).
**Build:** `tsc --noEmit && vite build` clean (AC-8).
**Branch:** `feat/A-13-saucer-scoring-collisions-siren` (pushed, commit `67228fb`).

**Self-review (judgment checks):**
- Wired: collision/scoring run inside `stepGame` (the sim the shell already drives); `sirenState` is the pure A-18 seam per scope — A-18 owns the shell wiring.
- Patterns: mirrors `ROCK_HITBOX`/`SHIP_HITBOX`, reuses `overlaps`/`sweptOverlaps` and the `applyScore`→`addScore` path; no new abstractions.
- ACs: all 8 met (see AC Coverage; suite green).
- Error handling: N/A — pure deterministic core functions, no I/O.

**Handoff:** To next phase (verify / review).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (516/516 green, build clean, tree clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 9 (all coverage gaps, 0 production bugs) | confirmed 2 (as non-blocking follow-ups), dismissed 0, deferred 7 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 17 rules / 47 instances | N/A |

**All received:** Yes (3 enabled returned; 6 disabled via `workflow.reviewer_subagents` and pre-filled)
**Total findings:** 2 confirmed (both non-blocking Improvements), 0 dismissed, 7 deferred (non-blocking coverage gaps captured for follow-up)

## Reviewer Assessment

**Verdict:** APPROVED

Adversarial review of A-13 (saucer scoring + collisions + siren hook) across the `asteroids` diff (`develop...HEAD`: score.ts, saucer.ts, sim.ts, + 2 test files). Three enabled specialists ran (preflight, test-analyzer, rule-checker); six were disabled via settings and I covered their domains myself where the diff warranted it. No Critical or High issues found. The code is minimal, faithful to established patterns, provably pure/deterministic, and every AC is covered by passing tests (516/516).

### Findings by specialist source
- `[TEST]` — test-analyzer: 9 coverage gaps, **zero production bugs**. Confirmed as legitimate but **non-blocking** (all flagged behaviour is correct and deterministic today). Two most-notable captured as Delivery Findings: the same-frame bullet-kill-then-ram ordering (ship survives) and the missing saucer-kill rollover-past-100000 test. The rest (double-score guards, multi-saucer-bullet, small-saucer-hitbox-in-contact, invuln tests asserting shot/saucer survival) are deferred hardening. Test-analyzer independently **verified** my two swept-collision claims: player-bullet↔small-saucer IS a genuine tunnel (60>42 and 51>42), and saucer-bullet↔ship cannot tunnel (96 > 55.5) — matching the TEA/Dev deviation.
- `[RULE]` — rule-checker: **clean, 0 violations across 17 rules / 47 instances.** Confirmed no `!` non-null assertions (the `sc`/`scForRock` const-captures are the correct narrowing idiom), `Readonly<Record<SaucerSize,number>>` records match convention, string-literal unions (no enums), `===/!==` null checks (no `|| default`), core purity intact, and `stepGame` non-mutation holds.
- `[EDGE]` — edge-hunter **disabled**; I enumerated boundaries myself (see Hard Questions below): empty bullets, null saucer guards, score at rollover, shipSpawnTimer==0, expiring bullets — all handled.
- `[SILENT]` — silent-failure-hunter **disabled**; N/A — pure functions, no error paths, no swallowed errors (nothing throws, no try/catch, no fallbacks).
- `[DOC]` — comment-analyzer **disabled**; I read every added comment. All accurate and current — the SAUCER_HITBOX tunnel comment (2×42=84<111), the invuln-decay rationale, and the saucer↔rock "verify vs quarry A-17" self-flag are all correct, not stale.
- `[TYPE]` — type-design **disabled**; covered by rule-checker + my read. New records are `Readonly`, `sirenState` returns the `SaucerSize | null` union (not `undefined`), no stringly-typed APIs, no unsafe casts.
- `[SEC]` — security **disabled**; N/A — client-side deterministic game core, no auth, no I/O, no user-controlled parsing, no injection surface, no secrets, no tenant data.
- `[SIMPLE]` — simplifier **disabled**; I checked for over-engineering: the `addScore` extraction is justified (single scoring entry point, removes duplication), no dead code, no premature abstraction. `sirenState` is a one-liner. Minimal.

### Rule Compliance (rule-by-rule enumeration)
- **Core purity — no entropy/wall-clock/audio, no shell imports (project rule, epic-A):** score.ts, saucer.ts, sim.ts — enumerated every added line; zero `Math.random`/`Date.now`/`performance.now`/`Audio`/`AudioContext`; new collision predicates consume **zero rng draws** (pure geometry); `shipSpawnTimer` decays by `dt` only. COMPLIANT. siren.test.ts adds a *new* audio-ban scan reinforcing this.
- **Determinism / stepGame non-mutation (SOUL):** enumerated all reassignments — `let saucer/score/lives` are locals; `working`/`survivors` are fresh arrays; `state.saucer` is never field-mutated (only the local ref is reassigned to `null`); rng cloned once and threaded. COMPLIANT ('does NOT mutate the input state' passes).
- **TS #1 type-safety escapes:** every nullable access (`saucer`, `sc`, `scForRock`) narrowed via `!== null` or const-capture; **no `!`, no `as any`, no `@ts-ignore`** in the diff. COMPLIANT.
- **TS #2 readonly on records:** `SAUCER_HITBOX`, `SAUCER_SCORE` both `Readonly<Record<SaucerSize,number>>`. COMPLIANT.
- **TS #3 union exhaustiveness:** `sirenState` and the two records cover the full `SaucerSize` union; `Record` gives compiler-enforced key coverage; binary `bullet.owner` if/else exhaustive. COMPLIANT.
- **TS #4 null/undefined:** all `===/!==` (no `||` defaulting on nullable); `sirenState` returns `null` not `undefined`. COMPLIANT.
- **Provisional-constant labeling (epic-A):** `SAUCER_HITBOX`, `SAUCER_ROCK_COLLISION_ENABLED`, `SAUCER_SCORE_LARGE/SMALL` each carry a "verify vs quarry (A-17)" note. COMPLIANT.

### Observations (≥5)
1. `[VERIFIED]` Killed-saucer actually disappears — `sim.ts:299` adds `saucer` to the `stepped` object; without it the spread would restore `state.saucer` and a shot could never remove the saucer. Evidence: line 299 `saucer,` overrides the `...state` spread. Complies with non-mutation rule (local ref, not `state.saucer`).
2. `[VERIFIED]` No double-score / one-shot-one-target — `sim.ts:237,250` `continue` after a rock or saucer kill; a second bullet sees `saucer !== null` false (`:243`). Evidence: the `continue` statements + the null guard. Rule-compatible (pure).
3. `[VERIFIED]` Invulnerability shields every hazard uniformly — `shipHittable` (`:206`) gates the saucer-shot branch (`:256`) AND the ram block (`:271`); computed from `state.shipDestroyed` + decayed `shipSpawnTimer`, matching the old ship-vs-rock gate. Evidence: single gate reused at both sites.
4. `[VERIFIED]` Bonus ship on saucer kills routes through A-9 — `sim.ts:246` `addScore(...SAUCER_SCORE[size])`; the `9900→10100, lives 3→4` test proves it is not a naive `score += n`. Evidence: score.ts `addScore` is the shared rollover+extra-life entry point.
5. `[TEST][MEDIUM]` Same-frame bullet-kill-then-ram leaves the ship alive — deterministic, defensible, but unverified (captured as a non-blocking Delivery Finding).
6. `[TEST][LOW]` Saucer-kill score-rollover-past-100000 untested for the sim wiring (addScore's rollover is unit-tested in score.test.ts; bonus-ship test already rules out a naive add) — redundant coverage, non-blocking.
7. `[VERIFIED]` `addScore` extraction is a clean dedup, not scope creep — `applyScore` now delegates; the 24 pre-existing score/collision suites stay green.

### Data flow traced
Player `fire` input → `stepBullets` spawns a `player` bullet → next `stepGame`: bullet advances (post-move) → collision loop sweeps rocks then the saucer (`sim.ts:228,244`) → on saucer hit, `addScore(score, lives, SAUCER_SCORE[size])` bounds score at `SCORE_ROLLOVER` and grants ≤1 bonus ship, `saucer=null`, bullet consumed → `stepped.saucer=null` → spawn director brings the next saucer. Safe: score is modulo-bounded, lives increment is bounded by boundary crossings, no rng consumed, no input mutated. Symmetric path: saucer `owner:'saucer'` bullet → sweeps the ship (`:256`) → `shipDestroyed` latch → `handleShipDeath` (A-15) on the death edge. `sirenState(state)` is a pure read of `state.saucer` for A-18 to poll.

### Wiring
Collision + scoring run inside `stepGame` — the sim the shell's loop already drives — so saucer kills affect the live game immediately. `sirenState` is exported for A-18 to consume (per scope A-18 owns the shell wiring); it is a pure seam, not dead code — the tests consume it and it derives from live state. No render/HUD change is in this story's scope.

### Devil's Advocate
Argue the code is broken. **Attack 1 — double scoring:** could one frame award a saucer twice, or a bullet score both a rock and a saucer? No: the player branch `continue`s after any kill, and a killed saucer is `null` for every later bullet — one shot resolves exactly one target, and score is awarded exactly once per kill. **Attack 2 — the killed saucer resurrects:** if the author forgot to thread `saucer` into `stepped`, the `...state` spread would restore the live saucer and no bullet could ever remove it — but line 299 explicitly overrides it, and the 'destroys the saucer' tests would fail otherwise. **Attack 3 — invulnerability is pierced:** a saucer bullet or contact killing a freshly-respawned (invulnerable) ship would be a nasty regression — but every hazard is behind the single `shipHittable` gate, and two invuln tests confirm the ship survives both a saucer bullet and direct contact. **Attack 4 — non-determinism:** any wall-clock or `Math.random` in the new collision code would break replay — rule-checker + the core-boundary scan + the 'deeply-equal state' test all confirm zero entropy and zero rng draws in the new predicates. **Attack 5 — the confused player:** shooting a saucer point-blank as it rams you leaves you alive (bullet resolves before contact) — surprising to a purist, but deterministic and arguably the fair outcome; it is flagged as a follow-up, not a defect. **Attack 6 — huge/edge inputs:** score at 99900 + a 1000 saucer kill wraps to 100 and still grants a bonus ship (addScore's pre-rollover boundary math); a bullet expiring this frame is dropped before collision (pre-existing `advance` behaviour); an empty bullet list or null saucer takes the guarded no-op paths. The most substantive thing the devil surfaced — the same-frame kill-then-ram ordering — is a real UNTESTED edge, but its behaviour is correct and deterministic, so it is a hardening follow-up (Delivery Finding), not a blocker. Nothing rises to Critical or High.

**Data flow traced:** player fire → bullet → swept saucer kill → `addScore` (bounded) → saucer removed (safe: modulo score, bounded lives, no rng, no input mutation).
**Pattern observed:** faithful reuse — `overlaps`/`sweptOverlaps`, `Readonly<Record<SaucerSize>>`, and the `applyScore`→`addScore` dedup — at `src/core/sim.ts:242-289`, `src/core/score.ts:38`.
**Error handling:** N/A — pure deterministic core, no I/O or throwing paths; null/empty/rollover edges all take guarded branches.
**Handoff:** To SM (Winston Smith) for finish-story. Note for SM: PR #15 is already open with an EMPTY body — fill in a description before merge.