---
story_id: "9-6"
jira_key: ""
epic: "9"
workflow: "trivial"
---
# Story 9-6: Visible starburst flash when a TIE fires (enemy-fire muzzle effect)

## Story Details
- **ID:** 9-6
- **Jira Key:** (none)
- **Workflow:** trivial
- **Stack Parent:** none
- **Repos:** star-wars
- **Points:** 2
- **Priority:** p2

## Acceptance Criteria
- When a TIE fires, a short-lived starburst/flash is rendered at the muzzle/origin of the shot.
- The flash is in keeping with the existing vector glow aesthetic (lines/glow on black, no sprites).
- The flash decays/disappears quickly (a few frames) and does not linger or accumulate.
- Deterministic-sim purity preserved: any flash state belongs in the render/shell layer or is driven deterministically from sim state, consistent with the existing src/core vs src/shell split.

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-06-29T21:28:33Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T21:10:11+00:00 | 2026-06-29T21:12:42Z | 2m 31s |
| implement | 2026-06-29T21:12:42Z | 2026-06-29T21:20:34Z | 7m 52s |
| review | 2026-06-29T21:20:34Z | 2026-06-29T21:28:33Z | 7m 59s |
| finish | 2026-06-29T21:28:33Z | - | - |

## Sm Assessment

A small, self-contained visual-polish story. The pattern is clear: enemy fire
already exists in the sim; what's missing is the muzzle-flash *cue* at the moment
of launch. This is render/presentation work, not simulation logic.

- **Scope:** Add a brief starburst/muzzle-flash rendered at a TIE's firing origin
  when it fires. Decays over a few frames; no accumulation; vector-glow aesthetic
  (lines/glow on black, no sprites).
- **Layer discipline (the critical constraint):** `src/core` is the deterministic
  sim; `src/shell` is render/input/loop. A transient cosmetic flash belongs in the
  shell, OR is driven deterministically from an existing sim event (e.g. a "TIE
  fired this tick" signal the renderer reads). Dev should reuse the existing
  enemy-fire spawn point as the flash trigger rather than inventing new sim state.
- **Reference points for Dev:** locate where TIE shots are spawned (enemy fire) and
  where projectiles/effects are drawn; mirror any existing player-fire or
  explosion/flash treatment for visual consistency.
- **Risk:** Low. 2-point trivial. Main hazard is leaking ephemeral render state into
  `src/core` and breaking sim determinism — verify with the existing test suite.
- **Routing:** trivial → phased. Setup complete; handing off to Dev (Yoda) for the
  implement phase, then Reviewer (Obi-Wan) before finish.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings yet.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Improvement** (non-blocking): The muzzle flash is covered by a structural shell
  test (ray count / colour / transience / muzzle tracking), but the exact *look* —
  that the starburst reads as a flash at the firing point at game scale — is an
  eyeball concern per the repo convention (render.ts SURFACE_ORIENT note, same as
  the 8-12 player laser). Affects `star-wars/src/shell/render.ts` (`drawMuzzleFlash`
  size/glow tuning if it reads too subtle/loud in play). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `drawMuzzleFlash`'s `life` factor only exceeds 1 if a
  shot ever carries `ttl > ENEMY_SHOT_TTL` — which the sim never produces today (fireballs
  spawn at exactly `ENEMY_SHOT_TTL` and only decrement). If a future story adds
  TTL-refreshing enemy fire, clamp `life` to `[0, 1]` so the flash can't render oversized.
  Affects `star-wars/src/shell/render.ts` (`render()` flash call site / `drawMuzzleFlash`).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No deviations yet.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- No deviations from spec. The flash is rendered entirely in the shell, derived
  from existing sim state (`enemyShots` TTL vs `ENEMY_SHOT_TTL`), reusing the
  established player-laser muzzle-flash pattern and the enemy `FIRE_GLOW` colour.
  The pure core was not touched, preserving sim determinism (AC 4).

### Reviewer (audit)
- **Dev: "No deviations from spec" (shell-only, reuses the player-laser pattern)** →
  ✓ ACCEPTED by Reviewer: confirmed. The diff touches only `src/shell/render.ts` and a
  shell test — `src/core/**` is untouched (rule-checker A1/A2: 0 violations), and the
  approach mirrors the established `drawPlayerLaser` TTL-gated muzzle flash. No
  undocumented spec deviations were found during review.

## Dev Assessment

**Implementation Complete:** Yes

**Approach:** Mirrored the existing player-laser muzzle flash. A "freshly fired"
enemy fireball is one whose elapsed flight (`ENEMY_SHOT_TTL - ttl`) is still inside
a brief 0.1s window; for those, `render()` draws an 8-ray amber starburst at the
bolt's projected muzzle point, with ray length and glow fading `1 → 0` across the
window. Derived purely from sim state (no shell-side effect list), gated to
`mode === 'playing'` so a fireball the sim freezes on the framing screens can't keep
flashing. The pure core (`src/core/**`) was not touched — `render()` stays a pure
function of state, so sim determinism is intact.

**Files Changed:**
- `star-wars/src/shell/render.ts` — added `ENEMY_MUZZLE_FLASH_SECONDS`, the
  `drawMuzzleFlash` primitive (+ `MUZZLE_RAYS`/`MUZZLE_MAX_LEN`), and a `playing`-gated
  pass over `enemyShots` in `render()`; imported `ENEMY_SHOT_TTL`.
- `star-wars/tests/shell/render.enemy-muzzle-flash.test.ts` — new shell test (4 cases:
  burst present on fresh fire, transient after the window, tracks the muzzle, no bleed
  onto game-over).

**Acceptance Criteria:**
- AC1 (starburst at the muzzle when a TIE fires) — ✅ 8-ray burst at the fireball's
  projected firing point.
- AC2 (vector-glow aesthetic, no sprites) — ✅ amber `FIRE_GLOW` strokes with
  `shadowBlur`, same primitives as the rest of the renderer.
- AC3 (decays quickly, no lingering/accumulation) — ✅ 0.1s window, length/glow fade
  to 0; nothing is retained frame-to-frame (state-derived).
- AC4 (deterministic-sim purity) — ✅ shell-only; core untouched.

**Tests:** 401/401 passing (4 new + 397 regression). `tsc --noEmit` clean; Vite build
succeeds.

**Branch:** `chore/9-6-tie-muzzle-flash` (pushed to origin).

**Note for review:** The mechanism is structurally tested, but the final visual tuning
(does the burst read as a flash at game scale?) is an eyeball concern per the repo's
render convention — see the Delivery Finding above. Non-blocking.

**Handoff:** To Reviewer (Obi-Wan) for the review phase. No PR created — PR creation is
the SM's at finish.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (tests green, build clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations (16 rules / 41 instances) | N/A |

**All received:** Yes (2 enabled subagents returned; 7 pre-filled Skipped per `workflow.reviewer_subagents`)
**Total findings:** 0 confirmed blocking, 1 non-blocking improvement (deferred forward), 0 dismissed

The 7 disabled domains were assessed by the Reviewer directly (see tagged observations below);
a disabled subagent does not excuse skipping its domain.

### Rule Compliance

Language: TypeScript. Checklist `.pennyfarthing/gates/lang-review/typescript.md` (13 checks)
plus 3 architectural rules from `star-wars/CLAUDE.md`. Enumerated by reviewer-rule-checker
(41 instances) and re-confirmed against the diff:

- **#1 Type-safety escapes** — COMPLIANT. No `as any`, no `@ts-ignore`, no non-null `!`. The
  test's `as unknown as CanvasRenderingContext2D` (test:72) is the documented shell-test mock
  idiom (identical to `render.player-laser.test.ts:39-40`), not a type escape. `if (!p) return`
  (render.ts) is a truthiness guard on `project()`'s nullable, not an assertion.
- **#2 Generics/interfaces** — COMPLIANT. `drawMuzzleFlash` params concretely typed; `Seg`
  fully typed; `muzzleRays(segments: ReadonlyArray<Seg>)` uses `readonly`; `scene(): GameState`
  returns the full concrete type.
- **#3 Enums** — N/A. No enums; `state.mode` checked via `===` if-chain, not a switch.
- **#4 Null/undefined** — COMPLIANT. `project()` null-guarded; `life = 1 - elapsed/0.1` has a
  non-zero constant divisor; no `||`-vs-`??` hazard (all operands are definite numbers).
- **#5 Modules/declarations** — COMPLIANT. `ENEMY_SHOT_TTL` imported as a value (it is a value);
  `type GameState/Projectile/Vec3` use `type`-only imports; extensionless style matches the repo.
- **#6 React/JSX** — N/A (no `.tsx`).
- **#7 Async/Promise** — N/A (no async in the diff).
- **#8 Test quality** — COMPLIANT. Imports from `src/`, not `dist/`; mock methods match the
  render path's calls; no `as any` in assertions.
- **#9 Build/config** — N/A (no config changes).
- **#10 Input validation** — N/A (no user input / JSON.parse / URL params; pure typed state).
- **#11 Error handling** — N/A (no try/catch; the null-return is intentional, not a swallow).
- **#12 Performance/bundle** — COMPLIANT. Named import (not barrel); 8-iteration draw loop over a
  ≤6-slot fireball pool is negligible.
- **#13 Fix-introduced regressions** — N/A→COMPLIANT (feature, not a fix; re-scan clean).
- **A1 core/ purity** — COMPLIANT. No `src/core/**` file touched; import direction is shell→core.
- **A2 shell consumes state, no game math** — COMPLIANT. `ENEMY_SHOT_TTL - s.ttl` reads two
  already-computed numbers for a fade factor (same shape as the existing player-laser gate);
  `cos/sin` lay out screen-space rays, not simulation.
- **A3 vector aesthetic, no sprites** — COMPLIANT. Only `beginPath/moveTo/lineTo/stroke` +
  `shadowBlur` glow; no `drawImage`/`Image`/sprites.

### Devil's Advocate

Let me argue this code is broken. First: `render()` now iterates `state.enemyShots` twice per
frame — once for the muzzle flash, once for the spark. If a future wave ever floods the screen
with hundreds of fireballs, that is double the per-shot work in the hot render path. Rebuttal:
the sim caps simultaneous fireballs at the authentic 6-slot pool (`FIRE_CONCURRENCY` saturates
at 6), so the realistic ceiling is ~6 shots; 12 trivial draw passes is nothing. Second: the
gate `elapsed <= ENEMY_MUZZLE_FLASH_SECONDS`. At the exact boundary `life === 0`, so the loop
still issues eight `moveTo(p); lineTo(p)` zero-length strokes with `shadowBlur = 0` — wasted
draw calls and, on some canvas implementations, a stray dot from a zero-length stroke with round
caps. Rebuttal: `lineWidth` is set but `lineCap` is never `'round'` here (default `'butt'`), so a
zero-length butt-cap stroke paints nothing; it is invisible and harmless, and the window edge is
one frame. Third: a confused future maintainer could read `ENEMY_SHOT_TTL - s.ttl` and think the
shell is doing simulation timing — eroding the boundary. Rebuttal: it only *reads* a core-owned
number, exactly as the long-standing player-laser gate does; the comment makes the intent
explicit. Fourth, the malicious/adversarial input: can a caller drive `life` to `NaN` or
`Infinity`? Only if `s.ttl` is `NaN`/`±Infinity`, which would already have corrupted the spark
and collision math upstream — the sim owns and validates TTL, not the renderer. Fifth: does the
flash bleed onto attract/game-over? The `mode === 'playing'` gate plus the dedicated test
(`does not bleed onto the game-over screen`) close that. Sixth: off-screen/behind-camera shots —
`project()` returns null and `drawMuzzleFlash` early-returns, drawing nothing. I cannot
manufacture a real defect here; the one residual is the unclamped `life > 1` *if* the sim is ever
changed to refresh TTL, captured as a non-blocking forward finding.

## Reviewer Assessment

**Verdict:** APPROVED

**Observations (≥5, by source domain — disabled subagents assessed directly by the Reviewer):**
- [VERIFIED] core/shell boundary intact — evidence: the diff touches only
  `src/shell/render.ts` + a shell test; `render()` *reads* `ENEMY_SHOT_TTL - s.ttl`
  (consume, not compute). [RULE] reviewer-rule-checker A1/A2: 0 violations across 41 instances.
- [VERIFIED] off-screen safety — `drawMuzzleFlash` `if (!p) return` guards a null projection,
  mirroring `drawPlayerLaser`/`drawSpark`; behind-camera/off-screen shots draw nothing.
- [TYPE] (type_design disabled — Reviewer-assessed) params are concretely typed
  (`Vec3`/`Mat4`/`number`); no `as any`; the test's `as unknown as CanvasRenderingContext2D`
  is the documented project mock idiom. No type-invariant violations.
- [SEC] (security disabled — Reviewer-assessed) no attack surface: no user input, no DOM
  injection, no secrets, no network — a pure render of typed `GameState`. No security finding.
- [SILENT] (silent-failure-hunter disabled — Reviewer-assessed) the null-projection early
  return is an intentional, commented "draw nothing" skip, not a swallowed error; there is no
  try/catch and no empty catch in the diff.
- [EDGE] (edge-hunter disabled — Reviewer-assessed) boundary at `elapsed == 0.1` →
  `life == 0` → zero-length, zero-glow rays (invisible, butt-cap, harmless). `ttl > ENEMY_SHOT_TTL`
  would push `life > 1` (oversized flash) but the sim never produces that today — logged as a
  non-blocking forward finding.
- [TEST] (test_analyzer disabled — Reviewer-assessed) 4 structural tests cover presence,
  transience, muzzle-tracking, and no-bleed; confirmed RED (0 rays) → GREEN (8). Not vacuous.
  The fade *curve* is unasserted by design (eyeball convention) — acceptable.
- [DOC] (comment_analyzer disabled — Reviewer-assessed) the new constant and `drawMuzzleFlash`
  JSDoc accurately describe behavior and correctly cite the `LASER_FLASH_SECONDS` sibling; no
  stale or misleading comments.
- [SIMPLE] (simplifier disabled — Reviewer-assessed) the twice-iterated `enemyShots` is
  justified — the spark draws in all modes, the flash only while `playing`; merging would
  entangle the two gates for no gain. ≤6-slot pool → negligible cost. Not over-engineered.
- [VERIFIED] AC coverage — AC1 burst at muzzle, AC2 amber vector glow (no sprites, [RULE] A3),
  AC3 transient (0.1s window + fade-to-0, no accumulation), AC4 determinism (core untouched).

**Data flow traced:** core `stepGame` emits/decrements `enemyShots[i].ttl` → shell `render()`
reads `ENEMY_SHOT_TTL - s.ttl` to derive `life` (display-only) → `drawMuzzleFlash` projects
`s.pos` and strokes amber rays. Safe: the shell only consumes core-computed numbers; no state
is written back, so determinism is preserved.

**Pattern observed:** TTL-derived, `playing`-gated transient flash — a faithful mirror of the
existing player muzzle flash at `src/shell/render.ts` `drawPlayerLaser` / `LASER_FLASH_SECONDS`.
Consistent, idiomatic, no new abstraction introduced.

**Error handling:** the only failure path is a null projection (off-screen/behind-camera),
handled by `if (!p) return` in `drawMuzzleFlash` (`src/shell/render.ts`). No nullable is
dereferenced; no error is swallowed.

**Preflight:** 401/401 tests green (4 new + 397 regression), `tsc --noEmit` clean, Vite build
succeeds, 0 code smells (no console/TODO/FIXME/skip).

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story. No PR created/merged by Reviewer —
PR creation and merge are the SM's at finish.