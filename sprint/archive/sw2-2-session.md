---
story_id: "sw2-2"
jira_key: ""
epic: "sw2"
workflow: "tdd"
---
# Story sw2-2: Enemy fireballs — render/behave as large shootable fireballs, not + glyphs (core mechanic)

## Story Details
- **ID:** sw2-2
- **Jira Key:** (no Jira key)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-07T18:27:42Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-07T17:47:52Z | 2026-07-07T17:49:46Z | 1m 54s |
| red | 2026-07-07T17:49:46Z | 2026-07-07T18:06:13Z | 16m 27s |
| green | 2026-07-07T18:06:13Z | 2026-07-07T18:15:08Z | 8m 55s |
| review | 2026-07-07T18:15:08Z | 2026-07-07T18:27:42Z | 12m 34s |
| finish | 2026-07-07T18:27:42Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

Inherited from sw2-1 Reviewer (targeting sw2-2):
- **Finding:** Enemy fireballs use ENEMY_SHOT_HIT_RADIUS = 90 (core/sim.ts:217). Player bolts now move at PROJECTILE_SPEED = 5000 (~83 units/frame after sw2-1). Per-frame sphere collision with no swept fallback creates TUNNELING exposure on small-radius targets.
  - **Type:** Conflict
  - **Urgency:** blocking
  - Details: Existing fireball tests hand-place unit-velocity bolts; no test exercises a real-fired (fast) bolt intercepting a fireball. Dead-centre closing shots leave ~2 frames inside the sphere; grazing shots can skip it entirely.

- **Finding:** Reviewer directive: add a real-fired-bolt test (fire at real PROJECTILE_SPEED, assert fireball destroyed) and CONSIDER a swept/segment collision or per-target reach cap when this story touches the fireball mechanic.
  - **Type:** Improvement
  - **Urgency:** non-blocking
  - Details: Addresses tunneling exposure from PROJECTILE_SPEED bump; optional but recommended.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): The sprint YAML carried NO acceptance criteria for sw2-2, so TEA defined the contract during RED — including a WYSIWYG design call that the fireball's hit sphere grows with its enlarged render (`ENEMY_SHOT_HIT_RADIUS >= 0.5 * TIE_HIT_RADIUS`). Affects `star-wars/src/core/state.ts` (raise `ENEMY_SHOT_HIT_RADIUS` from 90) and `star-wars/src/shell/render.ts` (retire the `drawSpark(…, FIRE_GLOW, 6)` "+" glyph for a large round body). Reviewer should ratify WYSIWYG-large-hitbox vs. keep-small-radius-plus-swept-collision. *Found by TEA during test design.*
- **Question** (non-blocking): The larger fireball radius mitigates fireball tunneling, but sw2-1's "consider swept/segment collision" remains a general gap — the exhaust port (`PORT_HIT_RADIUS` 120) and trench obstacles (90) still take a per-frame point-sphere test against real-speed bolts. Affects `star-wars/src/core/sim.ts` + `star-wars/src/core/trench-obstacles.ts` — directed at sw2-4 (exhaust-port). *Found by TEA during test design.*
- **Gap** (non-blocking): Cross-test constraint recorded for Dev — the story-9-6 muzzle-flash test classifies any amber segment with one endpoint AT the fireball's projected point as a "ray", so the new large body MUST be drawn as a closed perimeter ring/polygon, NOT centre-radiating spokes, or `render.enemy-muzzle-flash.test.ts` regresses. Affects `star-wars/src/shell/render.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): The fireball orb is drawn at EXACTLY `ENEMY_SHOT_HIT_RADIUS` (world units) — the visible edge is the hittable boundary (true WYSIWYG), so that constant is now a single knob for both the hit sphere and the on-screen size. Retuning one retunes both by design. Affects `star-wars/src/core/state.ts` + `star-wars/src/shell/render.ts` (they share the constant). *Found by Dev during implementation.*
- **Question** (non-blocking): Confirming TEA's swept-collision note from the build side — no swept/segment collision was added; the enlarged radius is the whole tunneling mitigation for fireballs. The exhaust port (sw2-4) and trench obstacles still take a per-frame point-sphere test against real-speed bolts and get no benefit from this change. Affects `star-wars/src/core/sim.ts` + `star-wars/src/core/trench-obstacles.ts` — directed at sw2-4. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): Stale/orphaned JSDoc `/** A small glowing '+' for a bolt in flight. */` left behind by the `drawSpark` removal now sits above the `FIREBALL_FACETS`/`FIREBALL_INNER` consts, describing code that no longer exists. Confirmed by rule-checker (high) and my own read. Affects `star-wars/src/shell/render.ts:427` (delete the orphaned comment). Non-blocking (LOW), but should be swept up — a trivial follow-up or a finish-time cleanup. *Found by Reviewer during code review.*
- **Gap** (non-blocking): No real-fired-bolt MISS test — every new sw2-2 test exercises a HIT (on-axis or the 110u graze inside the 150u body); nothing fires a real bolt at a fireball placed BEYOND the radius (e.g. 200u off-axis) and asserts it survives. The 8-18 miss coverage uses only hand-placed unit-velocity bolts, not the real 60fps/5000u firing path. A future over-generous collision change (e.g. an accidental swept fix) would go uncaught. Affects `star-wars/tests/core/fireball-large-target.test.ts` (add a real-fired miss case). Directed at TEA as a quick follow-up / fold into sw2-7. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The render tests assert "large" and "not a 2-segment cross" and "near>far", but do not strictly prove ROUNDNESS — `bodyRadius` takes only `Math.max` of vertex distances (no min/variance), so a large irregular polygon would also pass; and the 12px "large" threshold is ~6.5× looser than the actual ~78px orb. The implementation is genuinely round (14-gon ring), so this is test-tightening, not a code defect. Affects `star-wars/tests/shell/render.enemy-fireball.test.ts`. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

2 deviations

- **Defined the acceptance criteria myself; added a WYSIWYG large-hitbox contract not spelled out in the story**
  - Rationale: WYSIWYG — a player who sees a big fireball expects to hit a big target; the enlarged radius also mitigates the sw2-1 tunneling finding. Referenced by name/relation (fraction of TIE_HIT_RADIUS), never a bare magic number, so GREEN keeps tuning latitude.
  - Severity: minor
  - Forward impact: Reviewer should ratify the large-hitbox call; if the game instead wants a small-target/swept-collision model, the `large target` suite in `fireball-large-target.test.ts` is the thing to renegotiate.
- **Addressed the sw2-1 real-fired-bolt finding with real-speed guard tests + a larger target, not a swept-collision contract**
  - Rationale: The Reviewer marked swept collision "consider" / non-blocking; a bigger target is the simpler faithful lever and satisfies the same real-speed robustness. A forced worst-phase near-grazing test at the current 90u radius would be brittle.
  - Severity: minor
  - Forward impact: If Dev keeps the radius small and adds swept collision instead, the `large target` radius assertion (`>= 0.5*TIE_HIT_RADIUS`) will need renegotiation with the Reviewer (see the finding above).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Defined the acceptance criteria myself; added a WYSIWYG large-hitbox contract not spelled out in the story**
  - Spec source: context-story-sw2-2.md, "Acceptance Criteria" ("No acceptance criteria recorded in the sprint YAML — TEA to define during the RED phase"); epic-sw2.yaml title ("large shootable fireballs, not + glyphs")
  - Spec text: "Enemy fireballs — render/behave as large shootable fireballs, not + glyphs (core mechanic)"
  - Implementation: Split "large shootable fireballs" into a render contract (large, round, distance-scaled body) AND a gameplay contract (`ENEMY_SHOT_HIT_RADIUS >= 0.5 * TIE_HIT_RADIUS`, so the big visual is a big target). The hitbox growth is an inference from "large", not literal spec text.
  - Rationale: WYSIWYG — a player who sees a big fireball expects to hit a big target; the enlarged radius also mitigates the sw2-1 tunneling finding. Referenced by name/relation (fraction of TIE_HIT_RADIUS), never a bare magic number, so GREEN keeps tuning latitude.
  - Severity: minor
  - Forward impact: Reviewer should ratify the large-hitbox call; if the game instead wants a small-target/swept-collision model, the `large target` suite in `fireball-large-target.test.ts` is the thing to renegotiate.
- **Addressed the sw2-1 real-fired-bolt finding with real-speed guard tests + a larger target, not a swept-collision contract**
  - Spec source: sw2-1 Reviewer Delivery Finding (this session, Delivery Findings)
  - Spec text: "add a real-fired-bolt test (fire at real PROJECTILE_SPEED, assert fireball destroyed) and CONSIDER a swept/segment collision or per-target reach cap"
  - Implementation: Added real-fired-bolt tests that fire at PROJECTILE_SPEED and follow the bolt at a true 60fps dt (on-axis cases are GREEN today — regression guards that lock the real-speed contract). The tunneling exposure is driven out via the larger target (a real-fired bolt grazing the large body 110u off-axis, RED today), NOT a dedicated swept-collision test. The graze test passes under EITHER fix (a bigger radius pulls the shot inside; swept collision catches the segment), so it does not force one implementation.
  - Rationale: The Reviewer marked swept collision "consider" / non-blocking; a bigger target is the simpler faithful lever and satisfies the same real-speed robustness. A forced worst-phase near-grazing test at the current 90u radius would be brittle.
  - Severity: minor
  - Forward impact: If Dev keeps the radius small and adds swept collision instead, the `large target` radius assertion (`>= 0.5*TIE_HIT_RADIUS`) will need renegotiation with the Reviewer (see the finding above).

### Dev (implementation)
- No deviations from spec. Implemented exactly the TEA contract: raised `ENEMY_SHOT_HIT_RADIUS` to 150 (0.6× TIE_HIT_RADIUS, above the ≥125 floor and the 110u graze) and replaced the `drawSpark` "+" with a round, distance-scaled `drawFireball` orb drawn as closed perimeter rings (honouring the 9-6 no-centre-spokes constraint). The 150 value and the concentric-ring look are free choices the tests explicitly leave to GREEN (`value is GREEN's tuning call`), not spec deviations. The now-unused `drawSpark` helper was removed (dead code under `noUnusedLocals`).

### Reviewer (audit)
- **TEA — "Defined the ACs; added a WYSIWYG large-hitbox contract"** → ✓ ACCEPTED by Reviewer: RATIFIED. The story explicitly delegated ACs to TEA, and "large shootable fireballs" reasonably implies a large *target*, not just a large picture. I verified the blast radius: `ENEMY_SHOT_HIT_RADIUS` feeds ONLY the bolt-vs-fireball interception (`sim.ts:217`); cockpit damage uses the separate `COCKPIT_HIT_RADIUS` (80, `sim.ts:233/241`), so 90→150 only makes fireballs easier to *shoot down* — faithful to the story, no difficulty/damage regression. 150 (0.6× TIE) is a sound "large fireball" scale. The alternative (keep 90 + swept collision) is more machinery for no player-visible benefit here; the enlarged radius is the simpler faithful lever. Live feel is the epic's own sw2-7.
- **TEA — "Addressed the real-fired-bolt finding via larger target + guards, not swept collision"** → ✓ ACCEPTED by Reviewer: sw2-1's Reviewer marked swept collision "consider"/non-blocking; a bigger target discharges the same real-speed robustness for fireballs. The general swept-collision gap (exhaust port sw2-4, obstacles) correctly remains an open Delivery Finding directed at sw2-4 — not this story's scope.
- **Dev — "No deviations from spec"** → ✓ ACCEPTED by Reviewer: verified. The implementation is exactly the TEA contract; 150 and the concentric-ring shape are within the tests' explicit tuning latitude. `drawSpark` removal was forced by `noUnusedLocals` and is correct.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Core-mechanic bug (p1, 5pt, TDD). Behaviour is observable through the pure `stepGame` surface and the render function, so it is genuinely testable — no chore bypass.

**Test Files:**
- `star-wars/tests/core/fireball-large-target.test.ts` — fireballs are large shootable targets; real-fired bolts (at PROJECTILE_SPEED, followed at 60fps) down them.
- `star-wars/tests/shell/render.enemy-fireball.test.ts` — fireballs render as a large, round, distance-scaled body, not the fixed 6px "+" spark.

**Tests Written:** 8 tests covering the TEA-defined ACs below.
**Status:** RED — 5 failing (drive the change), 3 passing guards (lock the real-speed interception contract sw2-1's reviewer asked for).

### Acceptance Criteria (TEA-defined — YAML had none)

- **AC-1 (render):** Each enemy fireball renders as a large, round, glowing body — not the small fixed "+" cross — and its drawn size scales with distance (a real projected body, not a fixed glyph).
- **AC-2 (large target / WYSIWYG):** The fireball's hit sphere reflects the large body (`ENEMY_SHOT_HIT_RADIUS >= 0.5 * TIE_HIT_RADIUS`), so the big fireball you see is the big target you shoot.
- **AC-3 (real-fired-bolt robustness — inherited finding):** A bolt fired at the real PROJECTILE_SPEED and followed at 60fps destroys a fireball it is aimed at, downrange, WITHOUT costing a shield — scoring FIREBALL_SCORE and emitting a positioned `fireball-destroyed` cue — including a shot grazing the large body that the old 90u speck let slip.
- **AC-4 (preserve):** All existing shootable-fireball (8-18) and muzzle-flash (9-6) behaviour stays green.

### Rule Coverage

| Contract | Test(s) | Status |
|----------|---------|--------|
| Large hit target (WYSIWYG) | `has a hit sphere a substantial fraction of a TIE` | failing (RED) |
| Real-speed graze connects (no tunneling) | `a real-fired bolt grazing the large body still connects` | failing (RED) |
| Round body, not a "+" cross | `draws a round body — more than the two-segment "+" cross` | failing (RED) |
| Large extent | `reads much larger than the old 6px spark` | failing (RED) |
| Real 3D body (distance-scaled) | `is a real 3D body: a near fireball draws larger than a distant one` | failing (RED) |
| Real-fired interception (no shield / score / cue) | on-axis real-fired-bolt trio | passing (guard) |
| Purity / determinism / one-bolt-one-kill | preserved by 8-18 suite (unchanged) | passing |

**Self-check:** No vacuous tests. Every assertion checks a concrete value or observable; the real-speed guards assert emptiness of `enemyShots`, exact `lives`, exact `score` delta, and a positioned cue — not `is_some()`-style tautologies. Constants (ENEMY_SHOT_HIT_RADIUS, TIE_HIT_RADIUS, FIREBALL_SCORE, STARTING_LIVES) are referenced by name so the suite survives GREEN's tuning.

**Regression:** Full suite 545 passing / 5 failing (the new RED tests). `shootable-fireballs.test.ts` (8-18) and `render.enemy-muzzle-flash.test.ts` (9-6) both green.

**Handoff:** To Dev (The Word Burgers) for GREEN. Two levers, both value-agnostic in the tests: raise `ENEMY_SHOT_HIT_RADIUS` (state.ts) to a large-fireball scale, and replace the `drawSpark(…, FIRE_GLOW, 6)` "+" at `render.ts:301` with a large round body drawn as a **perimeter ring/polygon** (see the cross-test constraint in Delivery Findings — centre-spoked strokes break the 9-6 muzzle-flash test).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `star-wars/src/core/state.ts` — `ENEMY_SHOT_HIT_RADIUS` 90 → 150 (0.6× TIE_HIT_RADIUS): the fireball is now a LARGE target, and real-speed bolts no longer graze past it between frames.
- `star-wars/src/shell/render.ts` — replaced the fixed 6px `drawSpark` "+" with `drawFireball`, a billboarded round amber orb (two concentric perimeter rings, `FIREBALL_FACETS = 14`) sized in world units by `ENEMY_SHOT_HIT_RADIUS` so it projects/scales with depth (WYSIWYG); imported the constant; removed the now-dead `drawSpark`.

**How each AC was met:**
- **AC-1 (render):** `drawFireball` draws a round, ≥14-sided body whose screen radius comes from projecting a point one `ENEMY_SHOT_HIT_RADIUS` to the side in view space — so a near fireball swells and a distant one shrinks (a real 3D body, not a fixed glyph). Perimeter rings only, no centre spokes (keeps the 9-6 muzzle-flash test green).
- **AC-2 (large target / WYSIWYG):** `ENEMY_SHOT_HIT_RADIUS = 150 ≥ 0.5 × TIE_HIT_RADIUS (125)`; the orb is drawn at that same radius, so the big fireball you see is the big target you shoot.
- **AC-3 (real-fired-bolt robustness):** the enlarged sphere is caught by the real-speed bolt at 60fps including the 110u graze; interception still costs no shield and scores FIREBALL_SCORE (unchanged sim collision loop).
- **AC-4 (preserve):** 8-18, 9-6, 8-12 and the whole suite stay green.

**Tests:** 550/550 passing (GREEN) — the 5 sw2-2 tests now pass, zero regressions. `tsc --noEmit` clean.

**Verification:** Unit tests exercise the real `render()` + projection pipeline (round/large/distance-scaled) and the real-fired-bolt collision. Numeric sanity check of the projected orb (FOV_Y 60°): ~78px radius at z=-1000, swelling closer and shrinking to ~40px near spawn — a sane "large fireball" size, centred on the shot. The definitive human visual pass is the epic's own **sw2-7** (live playtest verification), so a browser run was not forced here.

**Branch:** `fix/sw2-2-enemy-fireballs` (pushed, commit `0315a13`). No PR (SM opens it at finish).

**Handoff:** To Reviewer (Immortan Joe) — please ratify the WYSIWYG large-hitbox call (150 vs. keep-small-radius-plus-swept-collision), noted as a TEA/Dev Delivery Finding.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (550/550 green, tsc+build clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Yes | Skipped (disabled) | disabled | Disabled via settings — I assessed boundaries myself (behind-camera null, sub-pixel sr, bounded facet loop) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped (disabled) | disabled | Disabled via settings — no swallowed errors; the two `if (!x) return` guards draw-nothing, correct |
| 4 | reviewer-test-analyzer | Yes | findings | 5 (1 high, 3 medium, 1 low) | confirmed 5 (all non-blocking test-quality), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Yes | Skipped (disabled) | disabled | Disabled via settings — I caught the stale comment myself (render.ts:427), corroborated by rule-checker |
| 6 | reviewer-type-design | Yes | Skipped (disabled) | disabled | Disabled via settings — Vec3/Mat4 readonly at source; no stringly-typed/unsafe casts in the diff |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Yes | Skipped (disabled) | disabled | Disabled via settings — `if (!edge) return` is effectively unreachable (shares z with c) but cheap/defensive; not worth flagging |
| 9 | reviewer-rule-checker | Yes | findings | 1 (high) | confirmed 1 (stale comment, LOW/non-blocking), dismissed 0 — cross-confirms my own finding |

**All received:** Yes (4 ran, 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 6 confirmed (all LOW/Medium, non-blocking — 1 doc [RULE]/[DOC], 5 test-quality [TEST]), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

No Critical or High findings. The change is small, self-contained, faithful to the story, and green across the board (550/550). Every confirmed finding is LOW/Medium test-quality or doc hygiene — none indicate an implementation defect.

**Data flow traced:** `input.fire` → `stepGame` spawns a bolt at the cockpit with `vel = aimDirection·PROJECTILE_SPEED` → per-frame `collides(fireball, bolt, ENEMY_SHOT_HIT_RADIUS)` at `sim.ts:217` → on hit, fireball removed from `enemyShots`, bolt spent, `+FIREBALL_SCORE`, positioned `fireball-destroyed` cue. Render path: `state.enemyShots` → `transform(view, s.pos)` → `drawFireball` projects centre + a one-radius edge point → screen-space concentric amber rings. Safe: perspective divisor is `-z ≥ NEAR` (no NaN/∞); behind-camera projects to null → draws nothing; facet loop bounded (14×2).

### Rule Compliance (lang-review/typescript + project boundary)

Enumerated every changed symbol against every applicable rule:
- **#1 type-safety escapes:** No `as any`/`@ts-ignore`/non-null-on-nullable in the diff. The test mock's `as unknown as CanvasRenderingContext2D` is the ESTABLISHED, documented shell-test idiom (7+ sibling files) — compliant, not a violation. `[TYPE]`
- **#2 generics/interface:** `drawFireball(camPos: Vec3, proj: Mat4, …)` — Vec3/Mat4 are `readonly` at source; `scene(over: Partial<GameState>)` is correct override-merge. Compliant. `[TYPE]`
- **#4 null/undefined:** `cue && 'pos' in cue ? cue.pos[2] : 0` correctly narrows the `GameEvent` discriminated union; the `||` uses in the render test are boolean operands (not the `??` bug). Compliant.
- **#5 modules:** type-only imports marked (`type Input`, `import type { GameEvent }`, `import type { Vec3 }`); `moduleResolution: bundler` so bare-extension imports are fine. Compliant.
- **#8 test quality:** no `as any` in assertions; mock implements every reached ctx method. Compliant (with the test-tightening notes below). `[TEST]`
- **#13 fix-introduced regressions:** the ONE violation — orphaned stale JSDoc at `render.ts:427`. `[RULE]`/`[DOC]`
- **Project boundary (CLAUDE.md):** `state.ts` change is a pure numeric const + doc — `src/core` stays deterministic (no DOM/Date/Math.random/rAF); `render.ts` (shell) may use canvas/Math freely. Compliant. Constants single-sourced by name (`ENEMY_SHOT_HIT_RADIUS` referenced, never re-magic'd). Compliant.

### Observations

1. `[RULE]`/`[DOC]` **[LOW]** Orphaned stale JSDoc `/** A small glowing '+' for a bolt in flight. */` at `render.ts:427`, above the fireball consts — describes the deleted `drawSpark`. Confirmed by rule-checker + me. Non-blocking; recorded for cleanup.
2. `[TEST]` **[LOW]** The three on-axis "real-fired" tests (`fireball-large-target.test.ts:94-120`) were GREEN pre-fix — they are intentional real-speed regression GUARDS (TEA labelled them so), not tunneling drivers; only the 110u graze test discriminates the undersized-radius defect. Fair framing nit, not a defect.
3. `[TEST]` **[MEDIUM]** No real-fired MISS test (a fireball beyond 150u that should survive). Genuine coverage gap; recommended follow-up for TEA (see Delivery Findings). Non-blocking — point-sphere collision correctly misses beyond radius and 8-18 covers misses via hand-placed bolts.
4. `[TEST]` **[LOW]** The render "round body" assertion (`seg.length > 2 || arc.length >= 1`) proves "not a 2-segment cross," not strict roundness; `bodyRadius` uses only `Math.max`. The impl IS round (14-gon); test could be tightened. Non-blocking.
5. `[VERIFIED]` Gameplay soundness — evidence: `grep ENEMY_SHOT_HIT_RADIUS src/` shows it feeds ONLY `sim.ts:217` (interception) + render; cockpit damage is the separate `COCKPIT_HIT_RADIUS` (`sim.ts:233/241`). Raising 90→150 only eases interception — faithful, no damage regression.
6. `[VERIFIED]` Render robustness — evidence: `render.ts:447-452` guards behind-camera (`project`→null→return); perspective divisor `-z ≥ NEAR` (wireframe.ts:18 NEAR=1) so no NaN/∞; facet loop `render.ts:461` bounded at 14. No hang/crash surface.
7. `[SEC]` Security specialist returned clean — correct for a client-only vector game with no network/auth/input surface; the only risk class (render NaN/∞/hang) is verified absent (obs. 6).
8. `[EDGE]`/`[SILENT]`/`[SIMPLE]` subagents disabled via settings — assessed those domains myself: boundary conditions (obs. 6), no swallowed errors (the guards draw-nothing correctly), and the lone `if (!edge) return` is unreachable-but-cheap defensive code, not worth a finding.

### Devil's Advocate

Let me argue this code is broken. First: raising `ENEMY_SHOT_HIT_RADIUS` to 150 could over-widen interception — a bolt aimed near a fireball now connects from 150u out, and if the constant were reused for cockpit-damage the player would take hits from farther away. Refuted: it feeds ONLY the interception test (`sim.ts:217`); cockpit damage uses `COCKPIT_HIT_RADIUS`, untouched. Second: could the larger sphere let ONE bolt clear MULTIPLE fireballs, breaking one-bolt-one-kill? Refuted: `sim.ts:214-224` `break`s after the first hit and shares `spentBolt` — 8-18's "one bolt destroys at most one fireball" still passes. Third: `drawFireball` — what if a fireball sits exactly on the near plane, or dead behind the camera? `project` returns null for `z ≥ -NEAR` → the guard draws nothing (same as the old spark); no NaN reaches the canvas. What if `camPos[0] + ENEMY_SHOT_HIT_RADIUS` pushes the edge point across the frustum edge, projecting to a wild screen coord and drawing a lopsided giant ring? For a fireball near screen centre (the common case) the distortion is negligible; for an extreme-edge fireball the orb is briefly skewed — an aesthetic wrinkle, not a crash, and edge fireballs are transient. What would a confused reader misunderstand? The orphaned `'+'` JSDoc at line 427 — genuine doc-drift, filed. What about determinism? `drawFireball` is pure over `(camPos, proj, w, h)` with no state, no RNG, no time — render stays a pure function of state; the muzzle-flash 9-6 test (perimeter-ring vs centre-spoke) still passes, proving the shape constraint held. What would a stressed input do? `enemyShots` is capped at `MAX_FIREBALL_SLOTS = 6`, so the per-frame draw cost is bounded. The strongest real critique the devil surfaces is the MISSING real-fired MISS test — an over-generous future collision change would slip through today's suite. That is a real coverage gap, filed as a Medium Delivery Finding, but it is not a defect in THIS code, which is correct point-sphere collision. Nothing rises to Critical/High.

**Handoff:** To SM (The Organic Mechanic) for finish-story.

## Sm Assessment

_To be completed by the Scrum Master during finish phase._