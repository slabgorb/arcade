---
story_id: "sw4-4"
jira_key: null
epic: "sw4"
workflow: "tdd"
---
# Story sw4-4: Swept/substepped bolt-vs-port collision

## Story Details
- **ID:** sw4-4
- **Jira Key:** (none — local tracking only)
- **Workflow:** tdd
- **Stack Parent:** none (stack root)
- **Repository:** star-wars
- **Branch Strategy:** gitflow (feat/sw4-4-swept-bolt-port-collision)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-12T00:56:55Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-12T00:23:31Z | 2026-07-12T00:25:59Z | 2m 28s |
| red | 2026-07-12T00:25:59Z | 2026-07-12T00:41:49Z | 15m 50s |
| green | 2026-07-12T00:41:49Z | 2026-07-12T00:47:47Z | 5m 58s |
| review | 2026-07-12T00:47:47Z | 2026-07-12T00:56:55Z | 9m 8s |
| finish | 2026-07-12T00:56:55Z | - | - |

## SM Assessment

**Verdict:** Setup complete — routing to TEA (Han Solo) for the RED phase.

**Why this story, now:** sw4-4 is the designated unblocker for sw4-1 (PR #69), which is
APPROVED but sits `CONFLICTING` against develop. The collision is real: sw3-15 (PR #68)
corrected `PORT_HIT_RADIUS` to 70 (octagon-tight); sw4-1 restored the bolt to 12,000 u/s
(200 u/frame), which tunnels the 140-u-diameter exhaust port between frames. sw4-1 was
correctly deferred precisely because sw4-4 must land first. Order of operations:
**sw4-4 → develop → sw4-1 rebases onto it and adopts PORT_HIT_RADIUS=70 → sw4-1 finishes.**

**Hard constraints for the implementer (do NOT violate):**
- `PORT_HIT_RADIUS` STAYS 70. Do **not** restore 120. The anti-tunneling fix must be
  decoupled from the hit radius.
- Fix = a segment-swept or substepped bolt-vs-target hit test, so a fast bolt registers
  on the small port without inflating the radius. Preserve sw3-15's octagon-tight
  accuracy AND sw4-1's far-plane reach.

**Repo/branch:** star-wars, `feat/sw4-4-swept-bolt-port-collision` off develop. PRs target develop.

**Likely surfaces (for TEA to confirm, not gospel):** `src/core/sim.ts` (bolt/collision
path, ~957-983), `src/core/state.ts`, and the trench exhaust-port hit path introduced by
sw3-15 (PR #68). Design spec: `star-wars/docs/superpowers/specs/2026-07-11-world-metric-threat-restoration-design.md`.

**Merge-gate note:** sw4-1's open PR #69 is permitted because sw4-1 is `in_review`; it does
not block this new work.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (6 failing drivers — ready for Dev)

**Test File:**
- `tests/core/swept-port-collision.test.ts` — the swept/substepped bolt-vs-port
  anti-tunnelling contract. 10 tests: 6 RED drivers + 4 green guards/purity.

**The bug pinned:** the port hit test (`sim.ts:631-634`) is a per-frame POINT-in-sphere
snapshot — `collides(port, bolt.pos, PORT_HIT_RADIUS)` samples only the bolt's END-of-frame
position. `advance()` (sim.ts:147) moves each bolt `vel*dt` BEFORE the port test, so the
frame's traversed segment is `[bolt.pos − vel*dt, bolt.pos]`; the snapshot ignores it. A bolt
stepping more than the 140-unit port diameter per frame leaps clean over the 70-radius sphere.

**Why hand-placed fast bolts, not fired ones:** sw4-4 branches off develop, where sw4-1 is
NOT merged, so `PROJECTILE_SPEED` is still 5,000 (~83 u/frame — under the port diameter, no
tunnel). The suite constructs fast bolts directly (the sibling suites' `bolt()` pattern) to
exercise the contract sw4-1's 12,000 u/s bolt will later ride on. See Design Deviations.

### Acceptance Criteria (TEA-defined — the story YAML carried none)

| AC | Contract | Test(s) | RED today |
|----|----------|---------|-----------|
| AC1 | A bolt whose per-frame step exceeds the port-sphere diameter and whose path crosses it detonates the port (no tunnel) | `it.each([2,4,7]×diameter)`, `sw4-1's 12,000 u/s bolt` | ✅ fails |
| AC2 | The port-hit outcome is frame-rate independent (same shot, coarse == fine framing) | `frame-rate independent` | ✅ fails |
| AC3 | Anti-tunnelling is DECOUPLED from the radius: `PORT_HIT_RADIUS` stays octagon-tight (≤~70, never 120); a fast bolt whose whole path stays wider than the radius still misses | `octagon-tight`, `FAST bolt wider than radius misses` | guard (green) |
| AC4 | The sweep stays gated to sw3-15's `$800` approach window | `sweep stays gated to $800 window` | guard (green) |
| AC5 | The swept collision stays pure & deterministic (no wall-clock/RNG; no input mutation) | `deterministic`, `never mutates input` | AC5-det fails ✅ / no-mutation guard |

### Rule Coverage

| Rule (source) | Test(s) | Status |
|---------------|---------|--------|
| Core sacred boundary — deterministic, no `Date.now`/`Math.random` (star-wars CLAUDE.md) | `a swept-hit run is deterministic` | failing (via the hit assertion) |
| Core purity — step never mutates input state | `resolving a swept hit never mutates the input state` | passing |
| lang-review TS #8 test-quality — meaningful, non-vacuous assertions | every straddle test guards BOTH sampled endpoints are OUTSIDE the sphere (genuine tunnel, not a trivially-inside hit); frame-rate asserts coarse==fine AND both true | passing |
| lang-review TS #1/#8 — no `as any` in tests | only `[...] as Vec3` literal-narrowing casts (sibling-suite convention); zero `as any` | passing |

**Rules checked:** 4 of the applicable TS/core rules have coverage. The rest of the TS
lang-review checklist (React/JSX #6, async/Promise #7, enums #3, JSON.parse validation #10,
error handling #11) is **N/A** — this is a pure synchronous geometry change: no I/O, no async,
no user input, no new types.

**Self-check:** 0 vacuous tests. No `let _ =`, no `assert(true)`, no always-None asserts.

**Handoff:** To Dev (Yoda) for the GREEN phase — implement the segment-swept (or substepped)
bolt-vs-port hit test in `stepTrench` (`sim.ts` ~631-634), keeping `PORT_HIT_RADIUS = 70` and
the `PORT_APPROACH_WINDOW` gate untouched. Do NOT touch `rom-score-values` — that develop-red
belongs to sw4-5 (see Delivery Findings).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/gameRules.ts` — new `sweptCollides(center, a, b, radius)` primitive: the
  anti-tunnelling twin of `collides`, testing the closest distance from `center` to the
  segment `a→b` (project-and-clamp, pure Math-Box `dot/sub/add/scale/length`). The sphere
  stays exactly `radius`; only the query widens from a point to the frame's swept segment.
- `src/core/sim.ts` — the exhaust-port hit test (`stepTrench`) now calls
  `sweptCollides(port, bolt.pos − bolt.vel·dt, bolt.pos, PORT_HIT_RADIUS)` instead of the
  point-in-sphere snapshot `collides(port, bolt.pos, PORT_HIT_RADIUS)`. The frame's start is
  reconstructed from the post-`advance` position and velocity. **`PORT_HIT_RADIUS` (70) and
  the `PORT_APPROACH_WINDOW` gate are unchanged** — the fix is decoupled from the radius and
  stays inside the same `$800` window.

**Approach:** chose the *segment-swept* option (the story permitted "segment-swept OR
substepped"). O(1), no sub-step loop, deterministic, no new state — the minimal change that
satisfies the contract.

**Tests:** 10/10 GREEN in `tests/core/swept-port-collision.test.ts`. Full suite: 795 passing,
2 failing — and those 2 are ONLY the pre-existing develop-red `rom-score-values` exhaust-port
tests owned by sw4-5 (verified untouched by this change; see Delivery Findings). `npm run build`
(tsc --noEmit + vite) clean, zero TypeScript errors. No sibling suite regressed.

**Branch:** `feat/sw4-4-swept-bolt-port-collision` (star-wars)

**Handoff:** To Reviewer (Obi-Wan Kenobi) for code review.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Conflict** (non-blocking): `tests/core/rom-score-values.test.ts` is **already RED on develop**,
  independent of sw4-4 — the two exhaust-port-kill tests (`scores 25,000` / `30,000`) fail with
  `expected +0 to be 25000/30000`. Verified by running the suite on a pristine tree (sw4-4's new
  file moved aside): same two failures. This is **sw4-5's scope** (its charter: sw3-15's
  `PORT_APPROACH_WINDOW` gate regressed sw3-1's portKill helper — the bolt drops at deep trench-z
  outside the window, blocking same-frame detonation so the kill scores 0). Affects
  `tests/core/rom-score-values.test.ts` / `src/core/sim.ts` port path — **Dev must NOT fix it in
  sw4-4**; `npm test` will show these 2 unrelated reds until sw4-5 lands. *Found by TEA during test design.*
- **Question** (non-blocking): sw4-4 (swept collision) and sw4-5 (window/deep-z score regression)
  both live in the exhaust-port hit path in `stepTrench`. They are orthogonal — sw4-4 changes the
  bolt-vs-port *geometry test*, sw4-5 reconciles the *window gate* with the score-kill helper — but
  whichever lands second should re-verify the other's tests still pass (my `sweep stays gated to the
  $800 window` guard protects sw4-4's side). Affects `src/core/sim.ts` exhaust-port branch.
  *Found by TEA during test design.*

### Dev (implementation)
- **Conflict** (non-blocking): confirmed the two `rom-score-values` exhaust-port failures are
  NOT caused by sw4-4 and are NOT fixable here. Their `portKill` helper parks a micro-tick bolt
  on the port at its **spawn** position `[0,0,-2400]`, which is outside `PORT_APPROACH_WINDOW`
  (`-2400 < -800`), so `inApproachWindow` is `false` and the hit test is never reached — a pure
  window-gate issue with no tunnelling. My swept change leaves `inApproachWindow` untouched, so
  these two remain red exactly as before. Affects `tests/core/rom-score-values.test.ts` (fix
  belongs to **sw4-5** — reconcile the window gate with the score-kill path). *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (non-blocking): the swept hit-test is applied **only** to the exhaust port
  (`sim.ts:641`); the TIE, turret, trench-obstacle, and cockpit collisions still use the
  point-in-sphere `collides`. When sw4-1 lands its 12,000 u/s bolt (200 u/frame), those
  targets become tunnelable too if their hit radius is small relative to the step. This is
  correctly OUT of sw4-4's scope (its charter is the port), and the new `sweptCollides`
  primitive is already exported and reusable — but a follow-up should audit whether the fast
  bolt tunnels TIEs/turrets and, if so, swap those `collides` sites for `sweptCollides`.
  Affects `src/core/sim.ts` (TIE/turret/obstacle bolt collisions, e.g. lines 234, 450, 587).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **Hand-placed fast bolts instead of a bolt fired at sw4-1's restored speed**
  - Spec source: context-story-sw4-4.md (story title), context-epic-sw4.md §sw4-1
  - Spec text: "sw4-1's restored 12000 u/s bolt (200 u/frame) tunnels the 140-u-diameter port"
  - Implementation: the RED suite constructs the fast bolt directly (`straddleState`/`flyAcross`
    hand-place a `Projectile` with `vel:[0,0,-12000]` etc.), rather than firing via the `FIRE`
    input at `PROJECTILE_SPEED`.
  - Rationale: sw4-4 branches off develop, where sw4-1 is NOT merged — `PROJECTILE_SPEED` is still
    5,000 (~83 u/frame, under the port diameter, so a fired bolt cannot tunnel yet). Hand-placing
    the fast bolt exercises the anti-tunnelling contract now, on develop, exactly as the sibling
    suites hand-place `bolt()` for pinned geometry. One test (`sw4-1's 12,000 u/s bolt`) asserts
    `vel === [0,0,-12000]` so the coupling to sw4-1's real bolt is explicit.
  - Severity: minor
  - Forward impact: when sw4-1 rebases onto sw4-4, a follow-up real-fire test at the restored
    `PROJECTILE_SPEED` (over the full trench) would add end-to-end coverage; not required for sw4-4.
- **Two ACs pinned as green guards, not RED drivers**
  - Spec source: context-story-sw4-4.md (story title)
  - Spec text: "keep sw3-15's octagon-tight accuracy AND sw4-1's far-plane reach ... PORT_HIT_RADIUS
    STAYS 70 ... do NOT restore 120"
  - Implementation: `octagon-tight`, `FAST bolt wider than radius misses`, and `sweep stays gated
    to $800 window` pass on today's code (they guard against a WRONG fix — radius inflation or a
    dropped window gate — rather than driving new behaviour).
  - Rationale: the story's hard constraints are "must NOT regress" properties; the established
    convention here (sw3-15's hard-over guard) is to pin them as green regression guards alongside
    the RED drivers, so a fix that papers over tunnelling by widening the sphere is caught.
  - Severity: minor
  - Forward impact: none.

### Dev (implementation)
- No deviations from spec. Implemented the segment-swept option (the story permitted
  "segment-swept OR substepped"); `PORT_HIT_RADIUS` (70) and the `PORT_APPROACH_WINDOW` gate
  are unchanged, per the story's hard constraints. The new `sweptCollides` helper lives beside
  `collides` in `gameRules.ts` (the collision-primitive home) rather than being inlined, so the
  swept test is reusable and unit-reasoned in one place.

### Reviewer (audit)
- **TEA — hand-placed fast bolts instead of a fired bolt** → ✓ ACCEPTED by Reviewer: unavoidable and
  correct — sw4-1's fast bolt is not on develop, so the only way to exercise anti-tunnelling now is
  a hand-placed fast bolt; the `vel === [0,0,-12000]` pin keeps the coupling to sw4-1's real speed explicit.
- **TEA — two ACs pinned as green guards, not RED drivers** → ✓ ACCEPTED by Reviewer: matches the
  established sw3-15 pattern; the guards catch the two wrong fixes (radius inflation, dropped window gate)
  and the rule-checker independently confirmed both properties hold.
- **Dev — segment-swept option, helper in gameRules.ts** → ✓ ACCEPTED by Reviewer: within the spec's
  permitted "segment-swept OR substepped"; O(1), pure, radius/window untouched — the minimal correct choice.
- No UNDOCUMENTED deviations found: the diff changes only the port hit-query (point → segment); every
  other collision, constant, and the window gate are byte-for-byte unchanged (rule-checker #19, my own read).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 795 pass, only the 2 pre-existing sw4-5 develop-reds, build clean, 0 smells, 0 unused imports |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer (fresh-bolt phantom segment, degenerate/near-zero guard) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer (no swallowed errors; the only fallback is the intentional degenerate-segment point test) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer + rule-checker #8 (anti-vacuous guards, no `as any`, no dist import) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer (comments accurate; "advance (above)" is loose but correct) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — domain covered by rule-checker #1/#2 (0 violations; clean Vec3/number/boolean signature) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer (pure deterministic core, no attack surface, no time/RNG) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — domain covered by Reviewer (minimal O(1), no over-engineering, reusable primitive) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 19 rules / 38 instances | N/A — all TS #1-13 + core-boundary #14-19 pass; PORT_HIT_RADIUS=70 & window gate confirmed untouched |

**All received:** Yes (2 enabled returned; 7 disabled via `workflow.reviewer_subagents`, domains covered by Reviewer)
**Total findings:** 0 confirmed blocking, 0 dismissed, 1 deferred (non-blocking Gap → Delivery Findings for the epic)

## Reviewer Assessment

**Verdict:** APPROVED

**Dispatch tags (2 enabled subagents; 7 disabled via settings, domains covered by Reviewer):**
- `[RULE]` reviewer-rule-checker (enabled): **0 violations across 19 rules / 38 instances** — TS checklist #1-13 + star-wars core-boundary #14-19. Confirmed `PORT_HIT_RADIUS` stays 70 (state.ts:338, untouched), the `PORT_APPROACH_WINDOW` gate is preserved and still evaluated before the hit test (sim.ts:631), `?? ZERO` mirrors the file's existing `advance`/`moveEnemy` pattern, and the `[...] as Vec3` spread idiom is the established one.
- `[EDGE]` (edge-hunter disabled — Reviewer): traced the reconstructed segment start `pos − vel·dt`. For a bolt that existed last frame the reconstruction is EXACT (constant-velocity bolts; `advance` used the same `vel*dt`). For a bolt FIRED this frame (pos = COCKPIT `[0,0,0]`, pushed AFTER `advance`), the phantom start lands *behind* the cockpit, opposite the travel direction — always on the far side of the down-trench port, so the segment's closest point to the port is the endpoint `b.pos` and the swept result collapses to the point result. No false hit, no missed hit. Degenerate segment (`abLen2===0`) falls back to a point test; near-zero `abLen2` is absorbed by the `clamp(...,0,1)` (Infinity→1, −Infinity→0), so no NaN.
- `[TEST]` (test-analyzer disabled — Reviewer + rule-checker #8): the suite is non-vacuous — every straddle test guards that BOTH sampled endpoints sit outside the sphere (proves a genuine tunnel), the frame-rate test asserts coarse == fine AND both hit, and the swept test is a mathematical superset of the point test (min-over-segment ≤ endpoint distance) so it can never turn an existing hit into a miss.
- `[TYPE]` (type-design disabled — rule-checker #1/#2): `sweptCollides(center, a, b, radius): boolean` is cleanly typed on `Vec3`/`number`; no `as any`, no non-null assertions, no new stringly-typed surface.
- `[SEC]` (security disabled — Reviewer): pure deterministic core function — no I/O, no user input, no wall-clock, no RNG-of-time. Zero attack surface.
- `[SILENT]` (silent-failure-hunter disabled — Reviewer): no swallowed errors or silent fallbacks; the sole branch (`abLen2===0 → point test`) is explicit and documented, not an error swallow.
- `[SIMPLE]` (simplifier disabled — Reviewer): minimal O(1) point-to-segment test, no sub-step loop, no new state; the helper is placed beside `collides` (the collision-primitive home) so it is reusable rather than inlined. No over-engineering.
- `[DOC]` (comment-analyzer disabled — Reviewer): the docstring and inline rationale are accurate and cite the sw4-1/sw3-15 provenance; minor looseness in "`advance` (above)" (it is above in execution order, in `stepGame`, not literally above `stepTrench`) — non-blocking.

**Data flow traced:** player bolt `b` → `advance(state.projectiles, dt)` moves `b.pos += vel·dt` (sim.ts:147, before the trench step) → `stepTrench` reconstructs the frame segment `[b.pos − vel·dt, b.pos]` → `sweptCollides(port, start, b.pos, PORT_HIT_RADIUS=70)` projects the port onto the clamped segment and compares the gap to 70 → hit index consumed via `findIndex`/`filter`. Safe: the query is gated behind the unchanged `inApproachWindow` check, uses the same fixed radius, and is pure (no mutation, no time/RNG beyond the threaded `dt`).

**Pattern observed:** correct point-to-segment distance (project-and-clamp) at `gameRules.ts:69-77`, the anti-tunnelling twin of `collides` — a good, reusable collision primitive; radius decoupled from anti-tunnelling exactly as the story demanded.

**Error handling:** no new failure modes — the function cannot throw (pure arithmetic), division-by-zero is guarded by the degenerate-segment branch, and `b.vel ?? ZERO` defends a missing velocity the same way `advance` does.

**Tests:** 10/10 GREEN in the new suite; full suite 795 pass / 2 fail, and those 2 are ONLY the pre-existing sw4-5 develop-red `rom-score-values` tests (verified untouched — the swept change never alters `inApproachWindow`, and those fixtures park a micro-tick bolt outside the window). Build clean.

**One non-blocking Gap deferred** (Delivery Findings): the sweep is port-only; sw4-1's fast bolt could also tunnel TIE/turret/obstacle collisions — a follow-up should reuse the now-exported `sweptCollides`. Not in sw4-4's scope. No Critical/High issues. All TEA ACs satisfied.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.