---
story_id: "A2-6"
jira_key: "A2-6"
epic: "A2"
workflow: "tdd"
---
# Story A2-6: Rock split vectors — fragments overlap after break (momentum over-conserved); retune split spread against ROM reference

## Story Details
- **ID:** A2-6
- **Jira Key:** A2-6 (local YAML tracking)
- **Workflow:** tdd (phased: red → green → review → finish)
- **Type:** bug
- **Points:** 3
- **Priority:** p2
- **Repos:** asteroids
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-05T22:40:10Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-05T21:09:26Z | - | - |
| red | - | 2026-07-05T22:30:00Z | unknown |
| green | 2026-07-05T22:30:00Z | 2026-07-05T22:34:47Z | 4m 47s |
| review | 2026-07-05T22:34:47Z | 2026-07-05T22:40:10Z | 5m 23s |
| finish | 2026-07-05T22:40:10Z | - | - |
| green | - | 2026-07-05T22:34:47Z | unknown |
| review | 2026-07-05T22:34:47Z | 2026-07-05T22:40:10Z | 5m 23s |
| finish | 2026-07-05T22:40:10Z | - | - |
| review | - | 2026-07-05T22:40:10Z | unknown |
| finish | 2026-07-05T22:40:10Z | - | - |
| finish | - | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): The epic-A2 context stub (`sprint/context/context-epic-A2.md`) documents only A2-1/A2-2 and asserts "No new game mechanics or simulation changes in A2 ... core sim (`src/core/`) remains untouched" — but A2-3, A2-5, A2-6, and A2-9 all change `src/core`. Per the spec-authority hierarchy the story scope wins, so this was non-blocking; but the epic stub should be enriched (or its blanket "core untouched" claim scoped explicitly to A2-1/A2-2) so future stories don't trust a stale guardrail. Affects `sprint/context/context-epic-A2.md`. *Found by TEA during test design.*
- **Improvement** (non-blocking): The ROM (`BreakAsteroid` $7630/$764A) offsets each child's spawn POSITION from the parent by `(AstSpeed & $1F) * 2 EOR AstPosLo`; the port spawns both children at the EXACT parent position (`splitRock`, `rocks.ts:154`), so they start co-located. That is a SECOND, independent contributor to "fragments overlap after break," on top of the velocity model. A2-6 fixes only velocity/direction (user chose "Faithful ROM velocity kick," not "Full ROM split"). A follow-up (or A-17) could add the ROM position offset for authentic immediate spatial separation. Affects `asteroids/src/core/rocks.ts` (child `pos`). *Found by TEA during test design.*
- **Improvement** (non-blocking): The ROM clamps each velocity AXIS to magnitude [6,31] via `GetAstVelocity` ($7233) — the SAME band for every asteroid size — not the port's per-size vector-magnitude bands (`ROCK_SPEED_MIN/MAX`) with `SPLIT_SPEED_SCALE`. A2-6 keeps the port's provisional per-tier model (child SPEED is A-17's job) and derives only child DIRECTION from the ROM kick. A-17 should reconcile: adopt the ROM's per-axis [6,31] clamp (dropping per-size bands + `SPLIT_SPEED_SCALE`) or justify the port's model. Affects `asteroids/src/core/rocks.ts` (`ROCK_SPEED_MIN/MAX`, `SPLIT_SPEED_SCALE`). *Found by TEA during test design.*
- **Reference** (non-blocking): ROM quarry recovered for A2-6 (the split-velocity routine A-6/A-7 could not find) — `SetAstVel` $7203 (per-axis kick: `GetRandNum AND #$8F` ⇒ ±16, added to parent `AstXSpeed`/`AstYSpeed`); `GetAstVelocity` $7233 (per-axis clamp [6,31]); `BreakAsteroid` $75EC (calls `UpdateAsteroid`+`SetAstVel` once per child, plus the position offset). Source: nmikstas/asteroids-disassembly `asteroids_program_rom.asm` + computerarcheology.com — same sources as A2-9. *Recorded by TEA for A-17 / A-8 / any downstream split-physics story.*

### Dev (implementation)
- No new upstream findings during implementation. TEA's findings still stand: the ROM child-position offset (a second overlap cause) remains deferred, and A-17 still owns the per-axis-clamp speed-model reconciliation. One handoff note for the reviewer/playtest: the two children now share a spawn POSITION (unchanged) but diverge in DIRECTION, so they overlap for one frame then separate — the subjective "matches cabinet feel" AC is the only remaining human-judgment item and wants an eyeball at `:5275`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): The three A2-6 divergence tests (`does NOT confine…`, `can kick sideways/backward`, `widely different headings`) only exercise a LARGE→medium split (parent `{6,3}`); the medium→small split's divergence is not directly pinned (only the speed-band re-clamp test covers both tiers). The behavior is correct for medium→small too — the `child()` closure is tier-agnostic, and a medium parent's per-axis components (≤16) are still comparable to the ±16 kick — but a future edit that narrowed divergence only for medium→small wouldn't be caught. LOW: add a medium-parent case to one divergence test when convenient. Affects `asteroids/tests/rocks.test.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Split fix is a mechanism change (polar heading-spread → ROM per-axis velocity kick), not a constant retune**
  - Spec source: context-story-A2-6.md, Technical Approach §3 + Notes
  - Spec text: "The heading formula itself is unchanged; only the constant is updated." / "No other changes to the split logic."
  - Implementation: Tests pin the ROM's per-axis additive velocity kick (`SetAstVel` $7203) as the child-DIRECTION mechanism, replacing the polar `parentAngle + rand*SPLIT_SPREAD_ANGLE` model. `SPLIT_SPREAD_ANGLE` is removed in favor of `SPLIT_VELOCITY_KICK`.
  - Rationale: RED-phase ROM research recovered the split routine the context said "was not found." The polar model conserves the parent's momentum (each child keeps ~the parent heading+speed) — literally the "momentum over-conserved" bug. The ROM adds an independent ±16 per-axis kick that mostly overrides parent momentum, producing the cabinet's wide divergence. The user (story owner) explicitly chose the faithful ROM mechanism over a constant-only retune. Mirrors A2-9's "the title says retune-a-constant, the ROM says the real fix is a mechanism."
  - Severity: minor
  - Forward impact: `SPLIT_SPREAD_ANGLE` export removed (`shipDebris.ts:23` references it in a comment only — cosmetic, Dev updates). Per-child RNG draw count changes (2 → 3: kick_x, kick_y, shapeVariant), which shifts downstream wave-spawn determinism — deliberate and still fully deterministic per seed.
- **Constant renamed vs the AC's literal `SPLIT_SPREAD_ANGLE` wording**
  - Spec source: context-story-A2-6.md, Acceptance Criteria
  - Spec text: "The `SPLIT_SPREAD_ANGLE` constant ... is updated to the ROM reference value" / "A new unit test documents the updated `SPLIT_SPREAD_ANGLE` value."
  - Implementation: `SPLIT_SPREAD_ANGLE` is replaced by `SPLIT_VELOCITY_KICK = 16` (world-units/frame); the "documents the value" test pins the kick constant and cites the ROM (`SetAstVel` $7203, `AND #$8F`).
  - Rationale: The mechanism change makes an angular-spread constant meaningless — the tunable is now the per-axis kick magnitude. Same AC intent (one ROM-cited, documented, tested constant), different name and units.
  - Severity: minor
  - Forward impact: none beyond the mechanism deviation above.
- **ROM per-axis speed clamp [6,31] NOT adopted; port's per-tier magnitude band kept (deliberate scope boundary)**
  - Spec source: context-story-A2-6.md, Technical Notes
  - Spec text: "Child speed scaling (`SPLIT_SPEED_SCALE`) is separate from angular spread and is NOT in scope for this story. Focus exclusively on angle."
  - Implementation: The ROM clamps each velocity AXIS to [6,31] regardless of size; the port keeps its provisional per-tier vector-magnitude band and derives only DIRECTION from the kick. Existing speed-band tests are left unchanged.
  - Rationale: Honors the story's scope boundary — the speed model (per-axis vs magnitude, single-band vs per-size) is A-17's quarry reconciliation, not this bug. Only direction is in scope. Logged (not silently assumed) per deviation discipline.
  - Severity: minor
  - Forward impact: A-17 must reconcile the port's per-tier magnitude speed model with the ROM's per-axis [6,31] clamp (captured as a Delivery Finding).

### Dev (implementation)
- No deviations from spec. Implemented the TEA Dev contract verbatim: replaced `SPLIT_SPREAD_ANGLE` with `SPLIT_VELOCITY_KICK = 16` (ROM SetAstVel $7203, cited); in `splitRock`'s `child()` closure took the child DIRECTION from the parent velocity plus an independent per-axis random kick (`vx/vy = parent + (nextFloat*2-1)*SPLIT_VELOCITY_KICK`, `angle = atan2(vy, vx)`), kept the per-tier speed magnitude (`SPLIT_SPEED_SCALE` + `ROCK_SPEED_MIN/MAX` clamp) untouched, removed the now-unused `parentAngle`, preserved the small-rock zero-draw early return. Updated the `splitRock` doc comment and the two stale `shipDebris.ts` cross-references to `SPLIT_SPREAD_ANGLE` to match the new mechanism (docs-accuracy, not a behavior change). No abstractions added, no speed-model changes, no position-offset (deferred per TEA).

### Reviewer (audit)
- **TEA #1 (mechanism change: polar heading-spread → ROM per-axis velocity kick)** → ✓ ACCEPTED by Reviewer: ROM-grounded and correct. The recovered `SetAstVel` ($7203) / `GetAstVelocity` ($7233) routine — `GetRandNum AND #$8F` per-axis kick added to the parent velocity, called once per child by `BreakAsteroid` ($75EC) — is the authentic split-velocity mechanism, and the port's polar `parentAngle ± π/6` cone is exactly the "momentum over-conserved" bug (both children hug the parent heading). User (story owner) directed the faithful mechanism. Diff at `rocks.ts:154-156` implements it faithfully for DIRECTION.
- **TEA #2 (constant renamed `SPLIT_SPREAD_ANGLE` → `SPLIT_VELOCITY_KICK = 16`)** → ✓ ACCEPTED by Reviewer: an angular-spread constant is meaningless under the Cartesian kick model; the kick constant is ROM-cited (`AND #$8F` ⇒ ±16) and test-pinned (`toBe(16)`). Same AC intent (a documented, tested, ROM-cited tunable), correct units.
- **TEA #3 (ROM per-axis [6,31] clamp NOT adopted; port's per-tier magnitude band kept)** → ✓ ACCEPTED by Reviewer: honors the story's explicit "speed scaling NOT in scope" boundary; child SPEED stays `clamp(parentSpeed·SPLIT_SPEED_SCALE, MIN, MAX)` unchanged, and the per-axis-clamp reconciliation is correctly deferred to A-17 as a Delivery Finding. The fidelity cost (both children share one speed magnitude) is documented, not hidden.
- **Dev (no deviations)** → ✓ ACCEPTED by Reviewer: verified against the diff — the implementation matches the TEA contract line-for-line (constant + value, per-axis kick → `atan2(vy,vx)`, `parentAngle` removed, speed clamp and `SPLIT_SPEED_SCALE` untouched, small-rock zero-draw early return preserved, stale comments fixed). No scope creep.
- No UNDOCUMENTED deviations found. The `splitRock` doc's "spawns at the parent's exact position (no offset)" is accurate to the CODE (position is deliberately unchanged); the ROM's position offset is a separately-logged deferred Delivery Finding, not a silent divergence.

## TEA Assessment

**Tests Required:** Yes

**The bug (root cause, ROM-cited):** The playtest symptom is "fragments overlap after break (momentum over-conserved)." The port's `splitRock` (`src/core/rocks.ts:145-158`) uses a POLAR model: each child keeps the parent's heading rotated by an independent random `±SPLIT_SPREAD_ANGLE` (π/6 = 30°) and the parent's speed (scaled + clamped). Both children therefore stay within a narrow ±30° cone of the parent's direction at ~the parent's speed — they pile up and drift together. RED-phase ROM research recovered the split-velocity routine that A-6/A-7 declared "not found":
- `BreakAsteroid` ($75EC): for EACH of the two children, `JSR UpdateAsteroid` (copy slot) then `JSR SetAstVel` — the child's velocity is (re)set independently, plus a position offset.
- `SetAstVel` ($7203): child velocity = **parent velocity + an independent per-axis random kick** — `GetRandNum AND #$8F` yields a signed kick of magnitude ≤16 lo-units, added to `AstXSpeed`/`AstYSpeed`; the Y axis draws 4 extra `GetRandNum` to decorrelate.
- `GetAstVelocity` ($7233): clamps each axis to magnitude [6,31].
This is a **Cartesian per-axis perturbation**, not a polar heading rotation — the kick (≈ parent speed in magnitude) mostly overrides parent momentum, so the two children fly apart. That is the authentic fix; "momentum over-conserved" precisely names the polar model as the bug.

**Scope (per the story owner's decision — "Faithful ROM velocity kick"):** Fix the child DIRECTION via the ROM per-axis kick; keep the port's provisional per-tier speed-magnitude band for child SPEED (A-17 owns the magnitude model). NOT in scope: the ROM per-axis [6,31] clamp, the ROM child-position offset, `SPLIT_SPEED_SCALE` (all → Delivery Findings / A-17).

**Test Files:**
- `asteroids/tests/rocks.test.ts` — swapped the `SPLIT_SPREAD_ANGLE` import for `SPLIT_VELOCITY_KICK`; replaced the "sane spread angle" constant test with a `SPLIT_VELOCITY_KICK = 16` ROM-cited pin; replaced the "keeps each child within SPLIT_SPREAD_ANGLE of parent" cone test (which encoded the bug) with a "does NOT confine children to a narrow cone" divergence pin; added `describe('splitRock — ROM per-axis velocity kick: children fly apart (A2-6)')` with a sideways/backward-veer pin, a wide-pairwise-separation pin, and a determinism pin.

**Tests Written:** 4 new/updated failing pins + 1 determinism guard. **Status:** RED — full asteroids suite **4 failed | 742 passed (746)**; the 4 failures are all A2-6-attributable, every other file (incl. the A2-7 `overlapping-rocks.test.ts` regression guards) stays green. Failing pins:
1. `SPLIT_VELOCITY_KICK` constant exists and `=== 16` (currently undefined).
2. `does NOT confine children to a narrow cone` — max deviation from parent heading `> π/3` (old cone ceiling is π/6, so impossible now).
3. `can kick a child sideways or backward` — ∃ seed with a child `> π/2` off the parent (impossible under the ±π/6 cone).
4. `sends the two children onto widely different headings` — ∃ seed with pairwise separation `> π/2` (old model caps pairwise at π/3).

The behavioral pins (2–4) assert observable scatter and deliberately do NOT prescribe the internal formula (parent+kick→direction, or parent+kick→rescale, both satisfy them).

**Dev contract (GREEN):**
1. In `src/core/rocks.ts`, REMOVE `SPLIT_SPREAD_ANGLE` (line 54) and ADD, in its place, a ROM-cited kick constant:
   ```ts
   /** A2-6: per-axis random velocity kick (world-units/frame) added INDEPENDENTLY
    * to each child's inherited velocity on split — the ROM's SetAstVel ($7203):
    * `GetRandNum AND #$8F` ⇒ a signed kick of magnitude ≤16 lo-units per axis,
    * added to the parent's AstXSpeed/AstYSpeed, then clamped (GetAstVelocity $7233).
    * This Cartesian per-axis perturbation (NOT a polar heading rotation) is what
    * makes the cabinet's two children fly apart. Port models it as symmetric ±this;
    * unit correspondence to ROM lo-units is provisional — verify vs quarry (A-17). */
   export const SPLIT_VELOCITY_KICK = 16
   ```
2. In `splitRock`'s `child()` closure (lines 145-158), derive the child DIRECTION from the per-axis kick, KEEP the existing per-tier speed magnitude:
   ```ts
   const child = (): Rock => {
     // ROM SetAstVel ($7203): parent velocity + independent per-axis random kick.
     const vx = rock.velocity.x + (nextFloat(rng) * 2 - 1) * SPLIT_VELOCITY_KICK
     const vy = rock.velocity.y + (nextFloat(rng) * 2 - 1) * SPLIT_VELOCITY_KICK
     const angle = Math.atan2(vy, vx)
     // Speed magnitude stays the port's provisional per-tier model (A-17 owns it).
     const speed = clamp(
       parentSpeed * SPLIT_SPEED_SCALE[childSize],
       ROCK_SPEED_MIN[childSize],
       ROCK_SPEED_MAX[childSize],
     )
     const shapeVariant = nextInt(rng, ROCK_SHAPE_VARIANT_COUNT)
     return {
       pos: { x: rock.pos.x, y: rock.pos.y },
       velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
       size: childSize,
       shapeVariant,
     }
   }
   ```
   - Remove the now-unused `parentAngle` (line 142); KEEP `parentSpeed` (still feeds the magnitude).
   - Draw order per child is now kick_x, kick_y, shapeVariant (3 draws vs the old 2) — intended; keeps the small-rock early-return (0 draws) so despawns never desync spawns.
   - Do NOT replicate the ROM's 4 extra decorrelation draws (a 6502-LFSR artifact; the port's `nextFloat` PRNG is already decorrelated) — noted as a trivial non-replication.
3. Update the cosmetic comment in `src/core/shipDebris.ts:23` ("same role as rocks.ts's SPLIT_SPREAD_ANGLE") to reference the new mechanism or drop the analogy.
4. Do NOT change: `ROCK_SPEED_MIN/MAX`, `SPLIT_SPEED_SCALE`, child position (exact parent pos), shape reroll, small-rock early return, the per-tier speed clamp. Speed model = A-17.
5. `npm test` (expect 746 green) + `npm run build` (`tsc --noEmit && vite build` — tsc will flag any lingering `SPLIT_SPREAD_ANGLE` reference to clean up).
6. Manual playtest at `:5275` — shoot rocks; confirm the two children visibly diverge (no pile-up), per the epic guardrail's "eyeball-verify in the dev server."

### Rule Coverage (typescript.md — 13 checks)

| # | Rule | Applies to | Test / Note | Status |
|---|------|-----------|-------------|--------|
| 1 | type-safety escapes | test design | No `as any`/`as unknown`/`@ts-ignore`/`!` in the new tests | clean |
| 2 | generic/readonly | test design | No `Record<string,any>`/`Function`/`object`; helpers use typed `Rock`/`Vec2` | clean |
| 4 | null/undefined (`??` vs `||`) | Dev | `SPLIT_VELOCITY_KICK === 16` pin blocks a `\|\| 16` fallback slipping in; the split math has no nullable | RED (const absent) |
| 5 | module/declaration | Dev | New named export `SPLIT_VELOCITY_KICK`; old `SPLIT_SPREAD_ANGLE` export removed; tests import from `src/`; `.js` omitted per repo/bundler convention | RED (export absent) |
| 8 | test quality | test design | Every new test asserts a concrete value/bound; no vacuous checks, no `as any`, `src/`-imports, deterministic seeds | clean |
| 13 | fix-introduced regressions | Dev | Re-scan the GREEN diff vs #1–12 (esp. no `parentAngle` dead var, no `Math.atan2(0,0)` NaN path — resting parent → speed=MIN, direction +x, finite) | deferred |
| 3,6,7,9,10,11,12 | enums / react / async / build-config / input-validation / error-handling / perf-bundle | — | n/a to a pure numeric core-sim change (no enums/JSX/async/IO/config/external input/barrel imports) | — |

**Rules checked:** 13 of 13 reviewed; 4 applicable to test design (all clean), #4/#5 pinned by the RED tests, #13 deferred to Dev's GREEN re-scan, the remaining 7 n/a.
**Self-check:** 0 vacuous tests — the constant test pins an exact value; the divergence tests assert quantified angular bounds (`> π/3`, `> π/2`) impossible under the old cone; the determinism test asserts deep-equality of a replayed split. The removed cone test was the one that ENCODED the bug (asserted children stay within ±π/6), correctly replaced rather than preserved.

**Delivery Findings:** Logged above (epic-context stale-stub conflict; ROM position-offset as a second overlap cause, deferred; A-17 per-axis-clamp reconciliation; ROM quarry recorded for downstream).

**Handoff:** To Dev (Julia) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `asteroids/src/core/rocks.ts` — Replaced `SPLIT_SPREAD_ANGLE = Math.PI/6` with `SPLIT_VELOCITY_KICK = 16` (ROM `SetAstVel` $7203 / `GetAstVelocity` $7233, cited). `splitRock`'s `child()` now derives DIRECTION from the ROM per-axis kick — `vx = parent.vx + (nextFloat*2-1)*SPLIT_VELOCITY_KICK`, `vy` likewise, `angle = atan2(vy, vx)` — replacing the polar `parentAngle ± SPLIT_SPREAD_ANGLE` cone. Removed the now-unused `parentAngle`; kept `parentSpeed` feeding the unchanged per-tier speed clamp. Updated the `splitRock` doc comment to describe the kick.
- `asteroids/src/core/shipDebris.ts` — Fixed two stale comment cross-references to the removed `SPLIT_SPREAD_ANGLE` (its own `BREAKUP_SPREAD_ANGLE` polar fan is a legitimately different mechanism and is unchanged).

**Tests:** 746/746 passing (GREEN) — full asteroids Vitest suite, 36 files. `npm run build` clean (`tsc --noEmit` + `vite build`). No stray `SPLIT_SPREAD_ANGLE` references remain.

**Branch:** `fix/A2-6-rock-split-vectors` (pushed to origin; no PR — SM opens it at finish).

**Self-review (judgment checks):**
- **Wired:** `splitRock` is called by `sim.ts:345` (`working.splice(hit, 1, ...splitRock(destroyed, rng))`) inside the collision loop, threading the cloned per-step rng — the new kick flows through `stepGame` to the rendered scene. No dead exports; `SPLIT_VELOCITY_KICK` is consumed in `splitRock` and pinned by a test.
- **Follows patterns:** ROM-cited, isolated named constant with a `verify vs quarry (A-17)` note; comment density and the "isolate the tunable, cite the ROM" convention match the surrounding core-sim code (identical to A2-9's style).
- **ACs met:** children now diverge widely (behavioral tests: deviation > π/3, sideways/backward > π/2, pairwise separation > π/2); speed stays in the per-tier band (existing tests green); determinism preserved (replay-equal test green); a new test documents the ROM-derived constant. The one remaining AC — the subjective "matches cabinet feel" visual playtest — is human-judgment and is flagged for the reviewer/user to eyeball at `:5275` (deterministic mechanism is fully test-proven; a real-time-shooter screenshot adds little over the sim pins, mirroring A2-9's deferred feel-eyeball).
- **Error handling:** n/a — pure numeric core-sim change, no IO/nullable/external input. Edge case checked: a resting parent (velocity 0) yields `atan2(kick_y, kick_x)` (finite; both kicks near-certainly non-zero) with speed clamped to the tier MIN — no NaN, no divide-by-zero; the resting-parent drift test stays green.

**Handoff:** To review phase (The Thought Police).

## Subagent Results

Toggles (`workflow.reviewer_subagents`): `preflight` = **enabled**; `edge_hunter`, `silent_failure_hunter`, `test_analyzer`, `comment_analyzer`, `type_design`, `security`, `simplifier`, `rule_checker` = **disabled** (pre-filled Skipped; their domains assessed by Reviewer directly — see dispatch tags in the assessment).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 746/746 green; build+typecheck clean; tree clean; 0 smells; test-first commits | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — boundary analysis done by Reviewer ([EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — swallow/fallback scan done by Reviewer ([SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — test quality assessed by Reviewer ([TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — comment/doc scan done by Reviewer ([DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — type rules assessed by Reviewer ([TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — security assessed by Reviewer ([SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — complexity assessed by Reviewer ([SIMPLE]) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — rule enumeration done by Reviewer ([RULE], see Rule Compliance) |

**All received:** Yes (1 enabled returned clean; 8 disabled pre-filled Skipped)
**Total findings:** 0 confirmed blocking, 0 dismissed, 1 deferred (LOW test-coverage note, captured as a Delivery Finding)

## Reviewer Assessment

**Verdict:** APPROVED

**Scope reviewed:** 3 files, +106/−32 — `src/core/rocks.ts` (the split mechanism + `SPLIT_VELOCITY_KICK`), `src/core/shipDebris.ts` (comment-only), `tests/rocks.test.ts` (constant swap + divergence pins).

**Data flow traced:** collision (`sim.ts:345`, `working.splice(hit, 1, ...splitRock(destroyed, rng))`) → `splitRock(rock, rng)` → per child: `vx = rock.velocity.x + (nextFloat(rng)*2−1)·SPLIT_VELOCITY_KICK`, `vy` likewise → `angle = atan2(vy, vx)` → `velocity = { cos(angle)·speed, sin(angle)·speed }`, `speed = clamp(parentSpeed·SPLIT_SPEED_SCALE[childSize], MIN, MAX)` → returned children flow back through `stepGame` into the rendered scene. **Safe because:** `rng` is the seeded `nextFloat` stream (a per-step clone, `sim.ts`), never wall-clock/`Math.random`, so determinism holds; there is no division and no external input; the only degenerate input, a resting parent (`vx=vy=0`), yields `atan2(0,0)=0` (0, not NaN) with `speed` clamped to `MIN>0`, and resting parents don't occur in production (spawn/split both enforce speed ≥ MIN).

**Pattern observed:** ROM-cited, isolated named tunable with a `verify vs quarry (A-17)` note — `rocks.ts:47-54` (`SPLIT_VELOCITY_KICK`). Matches the codebase's "isolate the tunable, cite the ROM address, tag provisional magnitudes for A-17" convention exactly (identical to A2-9's `SHOT_TIMER_PERIOD_FRAMES`). The per-axis kick reuses the existing `(nextFloat*2−1)·K` idiom the old spread used — minimal, idiomatic. Good pattern.

**Error handling:** N/A by design — pure numeric core-sim change, no IO / nullable / external input / try-catch. The only control flow, `if (childSize === null) return []` (`rocks.ts:144`, strict `===`), is unchanged and preserves the small-rock zero-draw despawn.

**Observations & dispatch (all 8 disabled-domain tags assessed directly):**
- `[EDGE]` VERIFIED — resting parent → `speed=MIN`, direction from kick (test `gives children of a RESTING parent a real drift`, seed 3, green); `atan2(0,0)=0` is finite and unreachable in production; fast parents (all tiers) still scatter since ±16 ≥ per-axis components. One LOW gap: divergence pinned only for large→medium (see `[TEST]`).
- `[SILENT]` VERIFIED clean — no try/catch, no `||`-default, no swallowed errors; no silent fallback introduced. Evidence: `rocks.ts:143-167` has one explicit early-return, no catch.
- `[TEST]` **LOW, deferred non-blocking** — the divergence trio exercises only a large parent `{6,3}`; medium→small divergence is not directly pinned (tier-agnostic closure makes this low-risk). The existence tests are non-vacuous (they require a real `>π/2` event or fail RED); `does NOT confine` pins a concrete `>π/3` bound; the determinism test asserts deep-equality. Captured as a Delivery Finding.
- `[DOC]` VERIFIED clean — the constant doc + `splitRock` doc now cite the ROM accurately; the two stale `shipDebris.ts` cross-references to the removed `SPLIT_SPREAD_ANGLE` are correctly fixed and its own `BREAKUP_SPREAD_ANGLE` (a legit separate polar fan) is untouched. No misleading comment introduced.
- `[TYPE]` VERIFIED clean — no new casts, no `as any`/`as unknown`, no non-null assertions; `vx`/`vy`/`angle`/`speed` are `number`, `Rock` return shape unchanged. `readonly` records untouched.
- `[SEC]` VERIFIED clean — no entropy from wall-clock, no `Math.random`, no secrets/injection/input surface; determinism preserved. A pure arithmetic change on existing deterministic state.
- `[SIMPLE]` VERIFIED clean — minimal diff (one constant, one closure body, comments); no dead code (`parentAngle` correctly removed, `parentSpeed` still used), no abstraction, no over-engineering. Preflight corroborates 0 smells.
- `[RULE]` VERIFIED clean — see Rule Compliance below; 13/13 typescript.md checks + epic rules, 0 violations.

### Rule Compliance

Rubric = `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) + epic ROM/determinism rules. Exhaustive over the diff (source items: 1 renamed constant, the `splitRock` `child()` closure, 2 comment blocks; test items: 1 import, 1 rewritten test, 3 new tests):

| Rule | Governed items in diff | Verdict |
|------|------------------------|---------|
| #1 type-safety escapes | none added (`as any`/`as unknown`/`@ts-ignore`/`!` — 0) | ✅ compliant |
| #2 generic/readonly | `Readonly<Record>` tables untouched; no new generics; `Rock` return unchanged | ✅ compliant |
| #3 enum | none (`RockSize` union untouched) | ✅ n/a |
| #4 null/undefined | `childSize === null` strict check unchanged; no `\|\|`-default; no nullable in the split math | ✅ compliant |
| #5 module/declaration | new named export `SPLIT_VELOCITY_KICK`; old export removed; tests import from `src/`; missing `.js` waived by repo convention | ✅ compliant |
| #6 react/jsx | none (no `.tsx`) | ✅ n/a |
| #7 async | none (synchronous) | ✅ n/a |
| #8 test quality | 4 tests import from `src/`, no `as any`/`!`; existence tests require a real event (non-vacuous); constant + bound + deep-equal assertions concrete | ✅ compliant (1 LOW coverage note, deferred) |
| #9 build/config | tsconfig untouched; `tsc --noEmit` clean | ✅ n/a |
| #10 input validation | no external input | ✅ n/a |
| #11 error handling | no try/catch | ✅ n/a |
| #12 perf/bundle | no barrel imports; no `JSON.stringify`/dynamic import; concrete-module import | ✅ compliant |
| #13 fix-introduced regressions | fix diff re-scanned vs #1–12: no `as any`, no `\|\|`, no dead code, `parentAngle` cleanly removed | ✅ compliant |
| Epic: core-sim purity/determinism | uses `nextFloat(rng)` only — no `Math.random`/`Date.now`/`performance.now`; replay-equal test green | ✅ compliant |
| Epic: ROM-cited named constants | `SPLIT_VELOCITY_KICK` cites `SetAstVel $7203`/`AND #$8F` + `verify vs quarry (A-17)` note | ✅ compliant |

### Devil's Advocate

Let me argue this code is broken. **Attack 1 — the two children always share one speed magnitude, so do they really separate, or just rotate in place?** `speed` depends only on `parentSpeed` and tier, so both children move at the same rate; only direction differs. But they spawn co-located and the separation grows as `2·speed·sin(Δθ/2)·t`, and the tests prove Δθ frequently exceeds 90° (vs the old model's ≤60°, usually ~20°). They genuinely fly apart — the old near-parallel headings were the pile-up. Refuted. **Attack 2 — `atan2(0,0)` NaN corrupts a velocity.** `atan2(0,0)` is `0` in IEEE/JS, not NaN, and requires both kicks to be exactly 0 on a resting parent — parents never rest in production (spawn/split enforce speed ≥ MIN). Refuted. **Attack 3 — the extra RNG draw silently desyncs replays.** Determinism is preserved (same seed → deep-equal, tested); the absolute spawn sequence shifting is the intended, documented consequence, and no golden-master replay test broke (746 green). Refuted. **Attack 4 — ±16 kick on a large rock's [4,8] speed is so large it randomizes direction entirely, unfaithfully.** The ROM's kick is likewise ±16 on per-axis speeds [6,31] — a comparable ratio — so a wide, weakly-parent-biased scatter IS the authentic behavior; the only un-automatable question is the subjective spread "feel," correctly routed to a playtest. Not a defect. **Attack 5 — medium→small divergence is untested.** True, and logged LOW; mitigated because the `child()` closure is tier-agnostic, so the large-tier proof carries. **Attack 6 — both children could get identical velocities (overlap).** Requires identical `(kick_x,kick_y)` from distinct RNG positions — won't coincide deterministically, and the `non-identical velocity` test (line 529) still passes. **Attack 7 — a confused maintainer.** The doc says children "spawn at the parent's exact position (no offset)" — accurate to the code, though the ROM offsets position; that gap is a separately-logged deferred finding, not a silent lie. The devil finds only a LOW coverage note and the documented, deferred speed/position-fidelity gaps. The fix is correct.

**Handoff:** To SM (Winston Smith) for finish-story.