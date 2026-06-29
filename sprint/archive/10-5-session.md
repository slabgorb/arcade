---
story_id: "10-5"
jira_key: ""
epic: "10"
workflow: "tdd"
---
# Story 10-5: Authentic explosions: 16-spoke enemy burst + color-cycling death splat

## Story Details
- **ID:** 10-5
- **Jira Key:** (none — no Jira integration)
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 3
- **Priority:** p2
- **Type:** enhancement

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T14:46:22Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T13:54:49Z | 2026-06-29T13:56:34Z | 1m 45s |
| red | 2026-06-29T13:56:34Z | 2026-06-29T14:08:34Z | 12m |
| green | 2026-06-29T14:08:34Z | 2026-06-29T14:18:31Z | 9m 57s |
| review | 2026-06-29T14:18:31Z | 2026-06-29T14:32:41Z | 14m 10s |
| red | 2026-06-29T14:32:41Z | 2026-06-29T14:38:14Z | 5m 33s |
| green | 2026-06-29T14:38:14Z | 2026-06-29T14:39:53Z | 1m 39s |
| review | 2026-06-29T14:39:53Z | 2026-06-29T14:46:22Z | 6m 29s |
| finish | 2026-06-29T14:46:22Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Improvement** (non-blocking): The new enemy burst keys off `enemy-death`; the old bullet-vanish spark (`fx.ts:62-76`) still fires on bullet hits and would double up on a kill. Affects `tempest/src/shell/fx.ts` (Dev should decide whether to drop the spark for kills or keep it as a generic bullet-impact effect). *Found by TEA during test design.*
- **Gap** (non-blocking): The epic context (`context-epic-10.md`) "Explosions" section is a generated stub with no detail; the authentic spec lives only in the story description ("explosions one to four" / "splat control" / ROTCOL). Affects `sprint/context/context-epic-10.md` (could be fleshed out for sibling stories). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): `render.ts` has no shared colour-RAM intensity helper, so the enemy burst maps `brightness` (0..15) to canvas alpha inline (`brightness / 15`). Affects `tempest/src/shell/render.ts` (a shared intensity→alpha helper would help future authentic-brightness stories). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `spawnEnemyBurst`/`spawnPlayerSplat` params (`p: { x; y }`) lack `readonly` (lang-review #2). Affects `tempest/src/shell/fx.ts:111,121` — consistent with the existing `burst()` convention (fx.ts:95), so a repo-wide cleanup rather than a one-off. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the `Explosion`-union `if/else` in `update()` and `drawExplosions()` has no `assertNever` exhaustiveness guard (lang-review #3). Affects `tempest/src/shell/fx.ts:208` and `tempest/src/shell/render.ts:511` — forward-risk only; TS narrows correctly today (a 3rd variant WOULD compile-error on `ex.radius`/`ex.cycle`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the player splat advances colour once per `update()` call (~60 Hz → white/red/yellow strobe). Faithful to ROTCOL/AC3, but a mild photosensitivity consideration over its 0.9 s life; a future story could cap the cycle rate if it reads harshly in play. Affects `tempest/src/shell/fx.ts:216`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): in the grow-then-shrink test, `expect(peakIdx).toBeGreaterThan(0)` is now redundant with the reworked `radii[1] > radii[0]` growth check (both encode "grew from the start"). Affects `tempest/tests/shell/fx.explosions.test.ts` (optional: drop the redundant line). *Found by Reviewer during re-review.*

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **Introduced a structured `fx.explosions` surface instead of reusing `particles`**
  - Spec source: context-story-10-5.md, Technical Approach
  - Spec text: "Approach hints to be refined by TEA/Dev. The story title above defines the intended behavior."
  - Implementation: Tests pin a new readonly `fx.explosions` collection — a `kind`-discriminated union (`EnemyBurst` with spokes/scale/brightness, `PlayerSplat` with spokes/radius/color) — rather than the existing flat `Particle[]`.
  - Rationale: A flat list of fixed-colour point particles cannot express "16 spokes", a discrete 4-frame scale-doubling (1,2,4,8), a two-tier brightness ramp (7→14), a grow-then-shrink radius, or a per-frame colour cycle. The ACs are unobservable without a structured surface. Dev must add `explosions` to the `Fx` interface and `render.ts` must draw it.
  - Severity: minor
  - Forward impact: Dev implements the `Explosion` union + `fx.explosions` getter and a renderer draw path; Reviewer should confirm the type design (discriminant, readonly).
- **Enemy burst keyed off the `enemy-death` EVENT; player splat kept on the alive-diff**
  - Spec source: context-story-10-5.md, AC4
  - Spec text: "Keyed to existing enemy-death / player-death events; existing fx tests pass"
  - Implementation: Enemy burst fires on the explicit `enemy-death` event (carries lane/depth) — replacing today's bullet-vanish heuristic. The player splat is triggered by the existing `prevAlive && !alive` state diff (the same trigger as the twin bursts it replaces), NOT the `player-death` event.
  - Rationale: The existing red flash/shake fire off the alive-diff and the existing fx tests assert against it; keeping the splat on the same trigger is a clean drop-in that guarantees AC4 ("existing fx tests pass"). The enemy path has no current event-keying, so moving it onto the authoritative `enemy-death` event is the faithful, deterministic choice.
  - Severity: minor
  - Forward impact: none — both deaths still produce their cue. Dev may additionally honour the `player-death` event if desired.
- **Pinned canonical hexes and a 1/60 frame cadence for the splat colour cycle**
  - Spec source: context-story-10-5.md, AC3
  - Spec text: "The splat color-cycles through white/red/yellow each frame"
  - Implementation: Tests assert the splat colour is drawn from exactly {`#ffffff`, `#ff0000`, `#ffff00`} and changes on >80% of frames sampled at dt=1/60.
  - Rationale: "white/red/yellow" and "each frame" cannot be asserted without concrete hexes and a frame cadence. Canonical RGB primaries chosen; the >80%-of-frames tolerance absorbs float jitter while still proving per-frame cycling.
  - Severity: trivial
  - Forward impact: If Dev prefers different hexes, update the three constants in `fx.explosions.test.ts` and note it.

### Dev (implementation)
- **Kept the bullet-vanish spark instead of removing it for enemy death**
  - Spec source: context-story-10-5.md, Problem statement
  - Spec text: "Replace generic particle puffs with authentic vector explosions. Enemy death … today 12 random particles (fx.ts:46-77)."
  - Implementation: Added the 16-spoke burst on the `enemy-death` event but LEFT the existing bullet-vanish spark (`fx.ts` ~line 62) in place.
  - Rationale: The bullet-vanish spark fires on ANY bullet disappearance — enemy kills (which DO emit `enemy-death`), but also spike hits and far-end misses (which do NOT). Blanket-removing it would silently drop bullet-impact feedback for spike hits and misses. Keying the authentic burst off the event also gives superzapper kills (which vanish no bullet) an explosion for the first time. The spark now reads as a small bullet-impact accent layered under the star. Addresses the TEA "double-up" finding.
  - Severity: minor
  - Forward impact: none for tests. A future story could split bullet-impact (spark) from enemy-death (burst) cleanly if the overlap looks busy in play; Reviewer should eyeball the kill FX.
- **Animated scale/brightness from elapsed-life progress, not a literal frame counter**
  - Spec source: context-story-10-5.md, AC1
  - Spec text: "a 4-frame 16-spoke star doubling in size (scale 1,2,4,8) with brightness 7 then 14"
  - Implementation: The burst lives `ENEMY_BURST_LIFE = 0.24s`; scale/brightness are derived from `progress` quartiles (frame = floor(progress·4)), yielding the exact 1→2→4→8 / 7→14 sequence the tests pin, rather than a discrete per-render-frame tick.
  - Rationale: Decouples the authentic doubling SEQUENCE from the host frame rate (the test asserts the deduped sequence, not wall-clock timing). 0.24s keeps it a quick, visible burst.
  - Severity: trivial
  - Forward impact: none.

### Reviewer (audit)
- **TEA #1 — structured `fx.explosions` surface instead of `particles`** → ✓ ACCEPTED: sound. The ACs (16 spokes, scale doubling, two-tier brightness, grow/shrink, per-frame colour) are genuinely unobservable on a flat fixed-colour `Particle[]`. The `kind`-discriminated union is clean type design.
- **TEA #2 — enemy burst on `enemy-death` event; player splat on the alive-diff** → ✓ ACCEPTED: faithful and low-risk. The event carries lane/depth, and keeping the splat on the existing diff trigger preserved the existing fx tests exactly. Bonus: superzapper kills now explode.
- **TEA #3 — pinned canonical hexes + 1/60 cadence for the colour cycle** → ✓ ACCEPTED (with note): the hexes are reasonable canonical white/red/yellow. HOWEVER the partnered `>80%` per-frame tolerance is unjustified given the impl's integer `cycle` counter (no float jitter) — see finding [TEST] F3; the assertion should be tightened to "changes every frame". The deviation itself stands; the tolerance is a test-strength fix.
- **Dev #1 — kept the bullet-vanish spark alongside the enemy burst** → ✓ ACCEPTED: correct call. The spark also fires on spike-hits and far-end misses (no `enemy-death` event), so a blanket removal would silently drop that feedback. Layering a small spark under the authentic star is acceptable; eyeballed the logic, no double-spawn bug.
- **Dev #2 — scale/brightness derived from elapsed-life progress, not a literal frame tick** → ✓ ACCEPTED: sound. Decoupling the doubling sequence from host frame rate is the right move; `Math.min` caps the frame index so no out-of-bounds.

No undocumented spec deviations found — the implementation matches the ACs as written.

## Impact Summary

**Upstream Effects:** 4 findings (1 Gap, 0 Conflict, 0 Question, 3 Improvement)
**Blocking:** None

- **Improvement:** The new enemy burst keys off `enemy-death`; the old bullet-vanish spark (`fx.ts:62-76`) still fires on bullet hits and would double up on a kill. Affects `tempest/src/shell/fx.ts`.
- **Gap:** The epic context (`context-epic-10.md`) "Explosions" section is a generated stub with no detail; the authentic spec lives only in the story description ("explosions one to four" / "splat control" / ROTCOL). Affects `sprint/context/context-epic-10.md`.
- **Improvement:** `render.ts` has no shared colour-RAM intensity helper, so the enemy burst maps `brightness` (0..15) to canvas alpha inline (`brightness / 15`). Affects `tempest/src/shell/render.ts`.
- **Improvement:** in the grow-then-shrink test, `expect(peakIdx).toBeGreaterThan(0)` is now redundant with the reworked `radii[1] > radii[0]` growth check (both encode "grew from the start"). Affects `tempest/tests/shell/fx.explosions.test.ts`.

### Downstream Effects

Cross-module impact: 4 findings across 3 modules

- **`tempest/src/shell`** — 2 findings
- **`sprint/context`** — 1 finding
- **`tempest/tests/shell`** — 1 finding

## Sm Assessment

**Phase:** finish → handoff to TEA (red)

Story 10-5 is a 3pt, shell-only FX enhancement in the `tempest` subrepo:
replace generic particle puffs with two authentic vector explosions in
`tempest/src/shell/fx.ts`.

- **Enemy death** (fx.ts:46-77): a 4-frame 16-spoke star doubling in size
  (scale 1,2,4,8) with brightness ramp 7→14 — replacing today's 12 random
  particles.
- **Player death** (fx.ts:80-89): a concentric jagged star that grows then
  shrinks with white/red/yellow color-cycling (ROTCOL) — replacing today's
  two fixed-color bursts with no cycling.

**Scope:** Shell-only. No `src/core` simulation changes; FX are presentation,
so determinism of the sim is unaffected. Reference: `context-epic-10.md`
Explosions section.

**Workflow:** tdd (phased). Session, context (`context-story-10-5.md`), and
branch `feat/10-5-authentic-explosions` (gitflow, tracking origin/develop) all
created and verified. No Jira (local tracking only).

**Routing:** Handing off to TEA (O'Brien) to specify failing tests for the
explosion geometry/timing. No blockers, no upstream findings.

---
## TEA Assessment

**Tests Required:** Yes
**Reason:** Behavioural FX change with specific, observable acceptance criteria.

**Test Files:**
- `tempest/tests/shell/fx.explosions.test.ts` — 9 tests across AC1–AC4

**Tests Written:** 9 tests covering 4 ACs
**Status:** RED (all 9 failing — verified, ready for Dev)

### Coverage map (AC → tests)

| AC | Test(s) | Status |
|----|---------|--------|
| AC1 — 16-spoke enemy burst, ~4-frame expansion, two-tier brightness | `spawns one 16-spoke enemy burst…`, `expands in authentic doubling steps 1→2→4→8`, `ramps brightness 7 then 14`, `clears the burst after its short animation` | failing |
| AC2 — player splat is a concentric jagged star that grows then shrinks | `spawns one concentric jagged star splat…`, `grows then shrinks — radius rises to a peak, then falls` | failing |
| AC3 — splat colour-cycles white/red/yellow each frame | `color-cycles through white/red/yellow, changing essentially every frame` | failing |
| AC4 — keyed to existing events; existing fx tests pass | `player death still flashes red and shakes`, `keeps the two death kinds distinct`; plus full-suite regression (577 pass, 59/59 other files green) | failing (new) / passing (existing) |

### Rule Coverage (lang-review: typescript.md)

Shell-only FX feature — most of the 13-check TS checklist is N/A (no enums, async, API boundaries, JSX, input validation, or error handling in scope). The genuinely applicable design rules are covered:

| Rule | Coverage | Status |
|------|----------|--------|
| #2 missing `readonly` on collections | Tests treat `fx.explosions` as a readonly snapshot (per-frame copies), matching the existing `readonly Particle[]` contract Dev must mirror | enforced via interface expectation |
| #3 / #11 discriminant field (narrowable union) | `keeps the two death kinds distinct` pins a `kind: 'enemy' \| 'player'` discriminant; tests filter on `kind` | failing |
| #8 test quality (no vacuous assertions) | Self-check pass C: caught + fixed the vacuous "clears the burst" test (added a spawn `.toBe(1)` so it fails in RED) | fixed |

**Rules checked:** 3 applicable of 13 (rest N/A for shell FX — documented above).
**Self-check:** 1 vacuous test found and fixed (re-verified: 0 of 9 pass in RED).

**Handoff:** To Dev (Julia) for GREEN — implement the `Explosion` union + `fx.explosions` getter, key the enemy burst off `enemy-death`, replace the player twin-bursts with the color-cycling splat (preserve the red flash/shake), and add a renderer draw path. See Design Deviations for the interface contract.

---
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `tempest/src/shell/fx.ts` — Added the `EnemyBurst` / `PlayerSplat` / `Explosion` discriminated union and the `fx.explosions` getter. `spawnEnemyBurst` fires on the `enemy-death` event; `spawnPlayerSplat` replaces the player twin-bursts (red flash + shake preserved). `update()` animates each explosion over its life (enemy: scale 1→2→4→8, brightness 7→14; player: sin-arch grow/shrink radius + per-frame colour cycle), removing expired ones.
- `tempest/src/shell/render.ts` — Imported the explosion types; added `drawEnemyBurst` (16 glowing spokes scaled by `scale`, alpha from `brightness/15`), `jaggedStarPath` + `drawPlayerSplat` (two concentric jagged rings in the cycling colour), and `drawExplosions`, called in the phosphor scene right after `drawParticles`.

**Tests:** 585/585 passing (GREEN) — all 9 in `fx.explosions.test.ts`, zero regressions.
**Build:** `npm run build` clean — `tsc --noEmit` no type errors, `vite build` succeeded.
**Branch:** `feat/10-5-authentic-explosions` (pushed to origin).

**ACs:** AC1 (16-spoke burst, doubling, two-tier brightness) ✓ · AC2 (jagged star grow/shrink) ✓ · AC3 (white/red/yellow per-frame cycle) ✓ · AC4 (event-keyed; existing fx cues + full suite green) ✓.

**Self-review:** Wired into the render path (visible in-game); follows the existing fx/render patterns (phosphor scene, glow via shadowBlur); no debug code; shell-only (core determinism untouched). Visual FX not unit-testable beyond geometry/timing — Reviewer may want to eyeball the kill burst overlap with the bullet-spark (see Dev deviation).

**Handoff:** To Reviewer (The Thought Police) for code review.

---
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (585 green, tsc clean, vite ok, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 4, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 6 | confirmed 6 (2 corroborate TEST F1), dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned; 6 disabled via settings)
**Total findings:** 6 unique confirmed (1 High, 1 Medium, 4 Low), 0 dismissed, 0 deferred

### Rule Compliance (lang-review: typescript.md, 14 checks)

| # | Rule | Verdict | Evidence |
|---|------|---------|----------|
| 1 | Type-safety escapes | **VIOLATION** | `as unknown as {...}` double-cast at tests:88,104 (+ `as Record` at :116,162). Rule #1 names `as unknown as T` "almost always wrong". |
| 2 | Generics / readonly params | **VIOLATION (Low)** | `spawnEnemyBurst`/`spawnPlayerSplat` `p:{x;y}` lack `readonly` (fx.ts:111,121) — but matches existing `burst()` (fx.ts:95). No `Record<string,any>`/`object`/`Function`. |
| 3 | Union exhaustiveness | **VIOLATION (Low)** | `if/else` on `Explosion.kind` lacks `assertNever` (fx.ts:208, render.ts:511). Forward-risk only — TS narrows correctly today. |
| 4 | Null / `??` vs `\|\|` | COMPLIANT | Ternary guard `ex.max > 0 ? … : 1` (fx.ts:207); no `\|\|` on potentially-0 numerics. |
| 5 | Module / declaration | COMPLIANT | `export type Explosion`; interface imports erased; Vite bundler resolution (no `.js` ext needed). |
| 6 | React/JSX | N/A | No `.tsx`. |
| 7 | Async/Promise | N/A | No async in diff. |
| 8 | Test quality | **VIOLATION** | Vacuous assertion `radii[0] < peak` (always 0<positive) at tests:182; over-loose `>80%` cycle tolerance at :200. |
| 9 | Build/config | N/A | No config changes. |
| 10 | Input validation / security | N/A | No user input, JSON.parse, or API boundary — internal animation state only. |
| 11 | Error handling | N/A | No try/catch / error paths in diff. |
| 12 | Performance / bundle | COMPLIANT | Specific imports (no barrel); 0–3 explosions/frame, trivial trig. |
| 13 | Fix-introduced regressions | COMPLIANT | Existing particle/shake/flash/warp cues untouched; 585/585 green. |
| 14 | **Architectural boundary** (core purity) | COMPLIANT | Shell-only; no `core/` change; `shell→core` imports only; spawn helpers use NO `Math.random`; core stays deterministic. |

---
## Reviewer Assessment

**Verdict:** REJECTED

The **shipping code is correct and ships no defects** — ACs genuinely met, build clean, 585/585 green, core determinism intact (rule #14), no security/null/error/regression issues. The rejection is entirely about **test-file quality**: two independent specialists confirmed rule-matching escapes that I cannot dismiss, and the casts are *obsolete* (the interface they work around landed in this same PR).

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [TEST][RULE] | Obsolete `as unknown as {...}` double-cast (rule #1 — "almost always wrong"). `Fx.explosions`/`EnemyBurst`/`PlayerSplat` are exported THIS PR, so the cast is moot and defeats the union narrowing; cascades into `as Record<string,number>` at :116,162. | `tests/shell/fx.explosions.test.ts:88,104` | Use `fx.explosions.filter((e): e is EnemyBurst => e.kind==='enemy')`; type `trackExplosion` return as `Explosion[]`; delete the downstream casts and the stale "before the interface exists" comment. |
| [MEDIUM] [TEST][RULE] | Vacuous assertion (rule #8): `expect(radii[0]).toBeLessThan(peak)` — `radii[0]` is always 0 (spawn sets `radius:0`, sampled pre-update), `peak`>0, so it can never fail. | `tests/shell/fx.explosions.test.ts:182` | Replace with `expect(radii[1]).toBeGreaterThan(radii[0])` (asserts it actually grew on tick 1). |
| [LOW] [TEST] | Over-loose colour-cycle tolerance `>80%` — impl uses an integer `cycle` counter (no float jitter), so "each frame" (AC3) can be asserted exactly. | `tests/shell/fx.explosions.test.ts:200` | `expect(dedupeConsecutive(colors).length).toBe(colors.length)`. |
| [LOW] [TEST] | No coverage for multiple simultaneous `enemy-death` events — the superzapper batch case the code comments call out. | `tests/shell/fx.explosions.test.ts` | Add: `detect(s, FRAME, [enemyDeath(1,0.4), enemyDeath(3,0.6)])` → expect 2 enemy bursts at distinct positions. |

**Non-blocking** (do NOT gate; logged as delivery findings for a fast-follow): `readonly` on the two spawn-helper params (matches existing `burst()` convention) · `assertNever` exhaustiveness on the `Explosion` if/else (forward-risk only) · the ~60 Hz colour strobe (faithful, mild photosensitivity note).

### Observations

1. [HIGH] [TEST] [RULE] Obsolete `as unknown as` double-cast — `tests/shell/fx.explosions.test.ts:88,104`. Rule #1. Corroborated by both test-analyzer and rule-checker.
2. [MEDIUM] [TEST] Vacuous `radii[0] < peak` — `:182`. Rule #8. The test still proves AC2 via `peakIdx>0 && peakIdx<len-1 && radii[last]<peak`, so it is a dead *line*, not a coverage hole — but a dead assertion nonetheless.
3. [LOW] [TEST] Unjustified `>80%` tolerance — `:200`.
4. [LOW] [RULE] Missing `readonly` on `p:{x;y}` params — `fx.ts:111,121` (consistent with `burst()`).
5. [LOW] [RULE] Missing `assertNever` — `fx.ts:208`, `render.ts:511` (forward-risk).
6. [VERIFIED] Core determinism preserved — `fx.ts`/`render.ts` are shell; no `core/` file changed; `spawnEnemyBurst`/`spawnPlayerSplat` use no `Math.random` (only the pre-existing `burst()` does). Evidence: imports at fx.ts:7-9 are core-only; rule-checker #14 clean.
7. [VERIFIED] No falsy-0 bug — `progress` uses a ternary `ex.max > 0 ? … : 1` (fx.ts:207), not `||`; brightness/scale via ternary+index. Complies with rule #4.
8. [VERIFIED] No canvas state leak — `drawExplosions` resets `globalAlpha=1`/`shadowBlur=0` (render.ts:514-515); `drawPlayerSplat` early-returns at `radius<0.5` *before* mutating ctx state (render.ts:496).
9. [VERIFIED] No out-of-bounds — frame index capped by `Math.min(ENEMY_SCALE_STEPS.length-1, …)` (fx.ts:210); colour index via modulo (fx.ts:217).
10. [TYPE] (subagent disabled — assessed by Reviewer) The `Explosion` discriminated union on `kind` is sound; narrowing works in both consumers. Only gap is the missing `assertNever` idiom (obs. 5).
11. [SEC] (subagent disabled — assessed by Reviewer) No attack surface: no user input, no DOM injection, no secrets, no network, no `JSON.parse`. Pure internal animation state. Nothing to exploit.
12. [SILENT] (subagent disabled — assessed by Reviewer) No swallowed errors / empty catches — there is no `try/catch` in the diff; `modulo`/`min` are total functions, no silent fallback path.
13. [EDGE] (subagent disabled — assessed by Reviewer) Boundaries checked: progress at 0 and ≥1 (capped), radius 0 at spawn/death (early-returned in render), `life≤0` (filtered out), N simultaneous bursts (independent). The one residual edge — a single huge `dt` could spawn+expire a burst within one `update()` (never rendered) — is mitigated by the fixed-timestep loop feeding a fixed small dt; flagged to TEA as an optional large-dt test, non-blocking.
14. [DOC] (subagent disabled — assessed by Reviewer) Source comments are accurate. The test's "typed loosely … before the interface exists" comment (tests:85) is now stale — folds into the cast fix (obs. 1).
15. [SIMPLE] (subagent disabled — assessed by Reviewer) No over-engineering; the two concentric rings are justified by "concentric jagged star"; helpers are minimal. The only simplification is removing the vestigial casts (obs. 1).

### Devil's Advocate

Assume this code is broken and a hostile reality is trying to prove it. First, the **photosensitivity vector**: the player splat flips white→red→yellow once per `update()` — at 60 fps that is a high-contrast strobe for 0.9 s. A confused or vulnerable user is genuinely harmed here, and nothing caps the rate. It is faithful to the ROM (the original strobed on a 60 Hz CRT), so I keep it non-blocking, but a real arcade cabinet had phosphor persistence softening it that a crisp canvas does not. Second, the **large-dt swallow**: `update()` drains `life` by raw `dt`. If the host ever feeds a single large `dt` (tab refocus, GC stall) ≥ 0.24 s, the enemy burst spawns and is filtered out in the same tick — the kill explosion never draws. The fixed-timestep loop should clamp this, but the FX layer does not defend itself, and no test pins large-dt behaviour. Third, **batch kills**: the comments promise superzapper kills explode, yet no test fires two `enemy-death` events at once; a future refactor that accidentally caps `explosions` to one per frame would sail through the suite (finding F4). Fourth, the **bullet-spark overlap**: on every bullet kill, the spark (12 particles) and the 16-spoke burst fire at the same lane/depth — a confused user could read the doubled effect as a rendering glitch rather than intent. Fifth, **`SPLAT_CYCLE` modulo**: safe only because the array is a non-empty const; were it ever emptied, `cycle % 0 = NaN` → `undefined` colour → silent no-draw. None of these are correctness defects in the shipped paths, but the strobe and large-dt edges are worth a follow-up, and the batch-kill gap is a real test hole I am routing into the rework.

**Handoff:** Back to TEA (O'Brien) — RED rework. The implementation needs NO changes; tighten the test file (remove the obsolete casts + type `trackExplosion` against `Explosion`, replace the vacuous `radii[0]` assertion, tighten the colour-cycle tolerance to exact, add the multi-`enemy-death` batch test), then re-verify GREEN against the unchanged code.

---
## TEA Assessment (rework — round-trip 1)

**All 4 Reviewer findings addressed in `tempest/tests/shell/fx.explosions.test.ts` (test-only; implementation untouched):**

| Finding | Sev | Fix |
|---------|-----|-----|
| Obsolete `as unknown as` double-cast (rule #1) | HIGH | Imported `type Explosion`; added a `kind` type-guard (`isKind`/`OfKind<K>`); `explosionsOf`/`trackExplosion` now return the narrowed member type. Removed the downstream `as Record<string,number>` casts and the stale "before the interface exists" comment. |
| Vacuous `radii[0] < peak` (rule #8) | MEDIUM | Replaced with `expect(radii[1]).toBeGreaterThan(radii[0])` — asserts the radius actually grew on the first tick (fails on a flat/shrinking curve). |
| Over-loose `>80%` colour tolerance | LOW | Tightened to `expect(dedupeConsecutive(colors).length).toBe(colors.length)` — exact "changes every frame" (the cycle is an integer counter, no float jitter). |
| Missing batch coverage | LOW | Added "spawns an independent burst per simultaneous enemy-death (superzapper sweep)" — two events → two bursts at distinct projected positions. |

**Note on phase semantics:** these were test-QUALITY fixes against already-correct code, so the tightened suite passes rather than fails — there is no RED to hand to Dev. Verified GREEN: 586/586 pass (was 585 + 1 new test), `tsc --noEmit` clean, `vite build` ok. No new spec deviations. Non-blocking Reviewer improvements (readonly params, `assertNever`, strobe-rate) left as logged delivery findings for a future cleanup.

**Handoff:** The implementation is unchanged and was already substantively approved; the test file is now clean and green — returning to Reviewer (The Thought Police) to re-verify and approve.

---
## Dev Assessment (rework — round-trip 1)

**Implementation Complete:** Yes — **no implementation change required this round.** The Reviewer's rejection was test-quality only; O'Brien's test rework passes against my unchanged `fx.ts`/`render.ts`.

**Files Changed (this round):** none by Dev. (`tests/shell/fx.explosions.test.ts` was reworked by TEA and committed/pushed: `2e1d03d`.)

**Tests:** 586/586 passing (GREEN) — all 10 in `fx.explosions.test.ts`. **Build:** `tsc --noEmit` clean, `vite build` ok.
**Branch:** `feat/10-5-authentic-explosions` (pushed; working tree clean).

**Self-review:** No new code, so no new deviations (round-1 Dev deviations stand). The typed test helpers exercise the same public `fx.explosions` surface the renderer consumes. Non-blocking Reviewer improvements (readonly params, `assertNever`, strobe-rate) remain logged as delivery findings for a future cleanup — out of scope for this test-only round.

**Handoff:** To Reviewer (The Thought Police) for re-review.

---
## Subagent Results (re-review — round-trip 1)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (586 green, tsc clean, build ok, impl unchanged) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 1 (low) | confirmed 1 non-blocking, 4 prior findings verified RESOLVED |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations | prior #1/#8 RESOLVED; deferred #2/#3 unchanged |

**All received:** Yes (3 enabled returned; 6 disabled via settings)
**Total findings:** 1 new (Low, non-blocking); all 4 prior findings RESOLVED; 0 outstanding blockers

## Reviewer Assessment (re-review — round-trip 1)

**Verdict:** APPROVED

All four round-1 rejection findings are resolved by the test-only rework (the implementation is byte-identical to the version I already cleared — confirmed by diffstat + preflight):

- [TEST] [RULE] Obsolete `as unknown as` double-cast (was HIGH, rule #1) — **RESOLVED.** Zero casts remain (grep-confirmed across the whole file); narrowing is via the typed `isKind`/`OfKind<K>` guard against the exported `Explosion` union, so a field rename now compile-errors. Both test-analyzer and rule-checker confirm.
- [TEST] [RULE] Vacuous `radii[0] < peak` (was MEDIUM, rule #8) — **RESOLVED.** Now `expect(radii[1]).toBeGreaterThan(radii[0])`, a real first-tick growth check that fails on a flat/shrinking curve.
- [TEST] Over-loose `>80%` colour tolerance (was LOW) — **RESOLVED.** Now exact `dedupeConsecutive(colors).length === colors.length` (every frame changes; integer counter ⇒ no jitter).
- [TEST] Missing batch coverage (was LOW) — **RESOLVED.** New superzapper-sweep test: two `enemy-death` events → two independent bursts at distinct projected positions.

**New finding (non-blocking):**
- [LOW] [TEST] `expect(peakIdx).toBeGreaterThan(0)` in the grow-then-shrink test is now redundant with the added `radii[1] > radii[0]` check (both encode "grew from the start"). Harmless — the `peakIdx>0` / `peakIdx<len-1` pair reads as a clear "interior peak". Logged as a delivery finding; not worth another round-trip.

**Still-deferred (unchanged shipping code, accepted non-blocking):** [RULE] `readonly` on spawn params; [RULE] `assertNever` exhaustiveness on the `Explosion` if/else; [SEC]/[EDGE] ~60 Hz strobe + large-dt swallow — all remain logged delivery findings for a future cleanup.

**Dispatch-tag coverage:** [TEST] test-analyzer — 4 resolved, 1 low nit. [RULE] rule-checker — CLEAN (13 checks, 0 violations). [EDGE] [SILENT] [DOC] [TYPE] [SEC] [SIMPLE] — subagents disabled via settings; re-assessed by Reviewer against the unchanged shipping code + reworked tests: unchanged from round 1 (no swallowed errors; sound discriminated-union typing; comments accurate incl. the now-fixed stale test comment; no security surface; no over-engineering — the cast removal simplified the helpers).

**Data flow traced:** `enemy-death` event → `fx.detect` → `spawnEnemyBurst(project(tube,lane,depth))` → `fx.explosions` → `drawExplosions`/`drawEnemyBurst` in the phosphor scene. Player death (alive-diff) → `spawnPlayerSplat` + red flash/shake → `drawPlayerSplat`. Safe: shell-only, deterministic, `core/` untouched.
**Pattern observed:** `kind`-discriminated `Explosion` union drawn in the phosphor scene beside particles (render.ts:509-516), consistent with the existing `drawParticles` pattern.
**Error handling:** N/A — no error paths; total functions (modulo / Math.min / ternary guards), all inputs bounded.

**Handoff:** To SM (Winston Smith) for finish-story.