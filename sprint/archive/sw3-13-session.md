---
story_id: "sw3-13"
jira_key: ""
epic: "sw3"
workflow: "tdd"
---
# Story sw3-13: Animate the enemy fireball sparkle — cycle the ROM's 4 gunshot frames (GNB0-3) + fuse-ball tips (WSVROM.MAC "GUN SHOTS -- SPARKLES WITH FUSE BALLS"); today only the single static GNB0 frame renders (drawFireball, render.ts)

> **Renumbered sw3-11 → sw3-13** (2026-07-11): this story was worked as `sw3-11`, but a concurrent checkout independently used `sw3-11` for "surface tower geometry" (and `sw3-12` for another story), both completed first on the shared `arcade` main. To avoid the ID collision the fireball story was reassigned to **sw3-13**. The star-wars code commits + merged PR (#63) retain their original `sw3-11` labels — the prose below reflects the work as it was performed under that label.

## Story Details
- **ID:** sw3-11
- **Jira Key:** (none — Jira integration not configured)
- **Workflow:** tdd
- **Stack Parent:** none
- **Type:** bug
- **Points:** 3

## Acceptance Criteria
_Intended behavior below — TEA formalizes the pinning tests during RED (repo convention). AC1/AC2 are the fix; AC3/AC4 are the guardrails._
1. **The enemy fireball animates.** The sparkle cycles through the ROM's 4 gunshot frames (`WSVROM.MAC` `GNB0–GNB3`) instead of rendering one frozen frame — live enemy fire visibly changes shape frame-to-frame, not a static red asterisk. Frame deltas are **transcribed from the ROM picture, cited by label**, not invented.
2. **Fuse-ball tips render.** The rounded `FUSE`-ball dots at the spike ends (`WSVROM.MAC` `GNT0–GNT3`, ".SBTTLE GUNSHOT PICTURES / GUN SHOTS -- SPARKLES WITH FUSE BALLS") are drawn, giving the "more complex" look the flat sparkle lacks.
3. **Shell-only; core/boundary preserved.** The animation is driven entirely in `src/shell` — **no `src/core` change**, no new `Date.now()`/RNG/`performance.now()` in the core. The frame index derives from shell effect state or the shot's age threaded into `drawFireball`. `stepGame` stays deterministic. (The precedent is the muzzle-starburst shell timer, `render.ts:83`.)
4. **No regression of the sw2-2 / sw3-9 invariants.** The body stays world-sized, depth-scaled, and billboarded by `ENEMY_SHOT_HIT_RADIUS` ("what you see is what you shoot"), red (`FIREBALL_GLOW` / VGCRED), and colour-separated from the amber muzzle flash (story 9-6).
5. **Tests pin the animation, non-vacuously.** Existing enemy-fireball + muzzle-flash render tests still pass; add/adjust a test that asserts the sparkle **changes across frames** (not a single static frame) and that fuse tips are present — scoped to the shot region, avoiding the sw2-4 vacuous-assertion and sw3-9 whole-screen-red traps.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-11T18:02:54Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T17:28:30Z | 2026-07-11T17:32:05Z | 3m 35s |
| red | 2026-07-11T17:32:05Z | 2026-07-11T17:44:55Z | 12m 50s |
| green | 2026-07-11T17:44:55Z | 2026-07-11T17:53:26Z | 8m 31s |
| review | 2026-07-11T17:53:26Z | 2026-07-11T18:02:54Z | 9m 28s |
| finish | 2026-07-11T18:02:54Z | - | - |

## Sm Assessment

**Setup complete — routing to Han Solo (TEA) for RED.**

**Origin:** Follow-on to the just-completed **sw3-9** (authentic red-sparkle fireball). sw3-9 correctly killed the wrong shape (amber concentric rings → red centre-radiating sparkle) but shipped a **single static frame (GNB0)**. Three parties signed off on that deferral at the time — TEA didn't pin the flicker, Dev logged it as a minor Design Deviation, Reviewer accepted it and flagged it for the sw2-7 eyeball pass — and the Devil's Advocate section predicted this exact report: *"a static, never-rotating red asterisk … can read as decoration, not live fire."* The playtest surfaced it. sw3-11 closes it.

**The defect:** `drawFireball` (`star-wars/src/shell/render.ts`, ~line 531) draws ONE frame — the `FIREBALL_SPIKES` table (GNB0 only) in `FIREBALL_GLOW = '#ff3b30'`, depth-scaled by `ENEMY_SHOT_HIT_RADIUS`. The code comment at **render.ts:506** names the debt verbatim: *"(Fuse-ball tips + the 4-frame flicker are eyeball follow-ons, unpinned.)"* So enemy fire renders as a frozen red starburst.

**Fidelity source (authoritative — cite, do not invent):** the enemy fireball picture is `WSVROM.MAC` `.SBTTLE GUNSHOT PICTURES` → base sparkle **`GNB0–GNB3`** + tip fuse-ball **`GNT0–GNT3`** — `COLOR VGCRED`; ~8 spikes drawn from centre (`CXY 0,0` → `AON dx,dy` draw / `AOFF` move) with `FUSE` ball-dots; `ASPECT` round; **4 flicker frames**. This ROM lives in GitHub **`historicalsource/star-wars`** (codename "Warp Speed", commit `5355b76`), **NOT** in the local gitignored `star-wars/reference/disasm` (which lacks the AVG picture ROM — this bit sw3-9). Provenance is recorded in `star-wars/docs/star-wars-1983-source-findings.md` and auto-memory.

**Open decision for TEA/Dev (I am NOT prescribing it — record it, then choose in RED/GREEN):** how the frame index is driven. Two candidates, both shell-side: (a) thread the shot's age/`ttl` into `drawFireball` (the sw3-9 Dev deviation flagged exactly this — *"drawFireball would take the shot's ttl/age"*), or (b) a shell-owned animation clock like the muzzle-starburst timer (`render.ts:83`). **The load-bearing constraint is the core/shell boundary** (`star-wars/CLAUDE.md`, "most important rule"): the flicker is a pure render effect and must not push any time/RNG into `src/core`. Whichever mechanism, `stepGame` stays deterministic.

**Preserve (must not regress):** the sw2-2/sw3-9 world-sized, depth-scaled, billboarded body sized by `ENEMY_SHOT_HIT_RADIUS`, and the colour separation from the amber muzzle flash (story 9-6). See sw3-9's session for the full contract these tests already pin.

**Scope:** shell-only render change — `drawFireball` + its frame tables in `render.ts`. No core/sim change. No new assets (pure vector geometry transcribed from `WSVROM.MAC`).

**Gate (sm_setup_exit):** session ✓ (`.session/sw3-11-session.md`, Phase: setup) · fields ✓ (tdd / setup / star-wars, Type bug / 3pts) · context ✓ (`sprint/context/context-story-sw3-11.md` — stub by design; the rich brief is this Assessment, matching sw3-9) · branch ✓ (`feat/sw3-11-animate-fireball-sparkle` from `develop`) · Jira N/A (local tracking).

## TEA Assessment

**RED complete — failing tests pin the animated gunshot sparkle. Routing to Yoda (Dev) for GREEN.**

**Tests Required:** Yes
**Test Files:**
- `star-wars/tests/shell/render.enemy-fireball-animation.test.ts` (new) — 3 tests. The sw3-9 file (`render.enemy-fireball.test.ts`) and muzzle-flash file are left intact (they pin the still-true static-frame contract).

**Tests Written:** 3 covering ACs 1/2/4 (+ AC5 self-satisfied). Verified RED by Chewbacca (testing-runner): full suite **2 failed / 682 passed**, `tsc --noEmit` clean.

| Test | AC | Today | Why it fails now |
|------|-----|-------|------------------|
| `ANIMATES: red sparkle geometry not constant over the shot life (≥2 distinct frames)` | AC1 | **FAIL** `expected 1 to be >= 2` | the single static `FIREBALL_SPIKES` table draws byte-identical geometry at every `ttl` |
| `has FUSE-BALL tip detail: short marks at the spike tips, off the centre` | AC2 | **FAIL** `expected 0 to be >= 3` | every red stroke today is a bare centre→tip spike; nothing sits at the tips |
| `preserves the sw3-9 contract on EVERY animated frame (red centre sparkle, never amber)` | AC4 | PASS (guard) | invariant that must survive GREEN — catches a blank/amber/ring animation frame |

**What the fireball must become (authentic spec, sourced):** `WSVROM.MAC` `.SBTTLE GUNSHOT PICTURES` — base sparkle **`GNB0/GNB1/GNB2/GNB3`** (four DISTINCT `AON` spike tables, each `CXY 0,0` + `COLOR VGCRED` + ~8 centre-radiating spikes) cycled as a flicker, plus tip fuse-ball **`GNT0-3`** (short `AON/AOFF` clusters the `FUSE` macro draws at each spike's outer tip). A red centre sparkle that CHANGES shape frame-to-frame and carries little balls at the tips.

**GREEN guidance for Dev (Yoda):**
- **Shell-only.** `drawFireball` in `src/shell/render.ts` — transcribe `GNB1-3` spike deltas (you already have `GNB0` as `FIREBALL_SPIKES`) + the `GNT` fuse geometry. **No `src/core` change; no `Date.now`/`performance.now`/RNG in core** (`star-wars/CLAUDE.md` boundary rule).
- **Frame driver (TEA recommendation, non-binding):** pick the frame from `elapsed = ENEMY_SHOT_TTL - s.ttl` — the *exact* quantity `render.ts:319` already uses to time the muzzle flash. It's deterministic, shell-side, and the tests drive it via the shot's `ttl`. A shell-owned frame counter also passes (the tests sweep 24 render calls), but a **wall-clock** driver would make render non-deterministic — avoid it. See Delivery Findings.
- **Keep the tips SHORT and OFF-CENTRE.** The fuse test only counts marks that don't touch the projected centre and are ≤0.4× the sparkle radius — so a spike split into pieces won't satisfy it; you need real tip clusters (faithful `GNT`) or small tip dots (`ctx.arc` is accepted too).
- **Preserve** sw3-9's world-sized / depth-scaled / billboarded body and the red-vs-amber muzzle separation (story 9-6). Don't turn the muzzle flash red.

### Rule Coverage

| Rule (TS lang-review) | Coverage | Status |
|------|----------|--------|
| #8 Test quality (non-vacuous) | Every assertion is a concrete inequality that fails on today's code (`1≥2`, `0≥3`); red checks scoped to a 120px shot window so HUD red can't satisfy them; guard test asserts real topology, not `is_some` | PASS |
| #2 Generic/interface (readonly params) | Helper params typed `ReadonlyArray<Seg>` / `ReadonlyArray<Dot>` | PASS |
| #1 Type escapes | Only `as unknown as CanvasRenderingContext2D` — the documented shell-test mock idiom (same as sw3-9) | PASS |
| #5 Module/`.js` extension | Extensionless relative imports — the repo idiom under `moduleResolution: bundler` | PASS |
| #3 enum / #6 JSX / #7 async / #10 input-validation / #11 error-handling / #12 perf | N/A — pure Canvas-2D render geometry, no such code touched | N/A |

**Rules checked:** all 13 TS lang-review checks; the load-bearing one for a pure-render change is #8 (test quality), covered above. Structural rules (#1-#7, #9-#12) are N/A for render geometry — same finding sw3-9's reviewer reached.
**Self-check:** 0 vacuous tests. One real TS defect (duplicate `fillStyle` property + accessor) was caught by Chewbacca and fixed before commit; `tsc --noEmit` now exits 0.

**Deviations:** 2 logged under `### TEA (test design)` (topology-not-pixels pinning; AC3 left to Reviewer's diff trace).

**Handoff:** To Dev (Yoda) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/shell/render.ts` — `drawFireball` now cycles the cabinet's **four** base-sparkle frames (`GNB0-3`, `FIREBALL_FRAMES`) with rotating fuse-ball tips (`GNT0-3`, `FIREBALL_FUSE_FRAMES`), replacing sw3-9's single frozen `GNB0` table. The frame is picked from the shot's age (`elapsed = ENEMY_SHOT_TTL - ttl`, `FIREBALL_FRAME_SECONDS = 0.05`) — deterministic, shell-side, no core state, the same "elapsed vs TTL" rule the muzzle flash/player laser use. `drawFireball` takes `ttl` as its 6th param; the one call site (render.ts:333) passes `s.ttl`. Fuse balls draw as small short spokes AT each spike tip (`FIREBALL_FUSE_SCALE = 0.22` of the sparkle radius). Widened `FIREBALL_SPIKE_NOM` 16→18 to fit all four frames.

**Open decision resolved:** I took TEA's recommended seam — frame = `f(ENEMY_SHOT_TTL - s.ttl)`, threaded via `s.ttl` into `drawFireball` (SM's candidate (a)). No wall-clock, no shell effect state. `git diff develop...HEAD --name-only` = `src/shell/render.ts` + the test file only; **zero `src/core`** touched (AC3 satisfied — Reviewer can confirm in one glance).

**Tests:** 684/684 passing (GREEN, verified by the Living Force / testing-runner). `tsc --noEmit` clean; `npm run build` (tsc + vite) succeeds. The two RED tests (`ANIMATES`, `FUSE-BALL tips`) now pass; the guard and all sw3-9 / 9-6 muzzle / player-laser tests stay green (no regression).

**Not pinned by tests (eyeball, deferred to sw2-7 per repo convention):** the flicker RATE (`FIREBALL_FRAME_SECONDS`), the fuse-ball SIZE (`FIREBALL_FUSE_SCALE`), and the ~11%-smaller sparkle from the NOM widening. Tests verify the fireball *animates with fuse tips and never degenerates*; how fast/how big it reads is a playtest call — see Delivery Findings + Deviations.

**Branch:** `feat/sw3-11-animate-fireball-sparkle` (pushed).

**Handoff:** To review — Obi-Wan Kenobi (Reviewer).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 684/684 green, `npm run build` exit 0, tree clean, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — self-assessed (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — self-assessed (see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by rule-checker #8 + self-assessed (see [TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — self-assessed (see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by rule-checker #1/#2 + self-assessed (see [TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — self-assessed (see [SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — self-assessed (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | none (13/13 PASS or N/A + boundary PASS) | confirmed 0, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents`, pre-filled Skipped and self-assessed)
**Total findings:** 0 confirmed blocking; 5 LOW/eyeball observations (all non-blocking, deferred to the sw2-7 playtest), 0 dismissed

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `state.enemyShots[i].ttl` (sim-owned, `sim.ts:821-823` — starts at `ENEMY_SHOT_TTL`, culled at `ttl<=0`, so always `(0, 6]`) → `drawFireball(…, s.ttl)` (render.ts:333) → `frame = ⌊max(0, ENEMY_SHOT_TTL - ttl)/0.05⌋ % 4` → `FIREBALL_FRAMES[frame]` + `FIREBALL_FUSE_FRAMES[frame]` → red spikes + fuse spokes stroked from the projected centre. **Safe:** `drawFireball` is a pure function of `(camPos, proj, w, h, ttl)`, guards both `project()` nulls (early-return), mutates no sim state, uses no time/RNG, and the frame index is provably bounded — no undefined-array-element path on any reachable state.

**Pattern observed:** the single static `FIREBALL_SPIKES` table became a four-frame `FIREBALL_FRAMES` cycle (render.ts:509-518) with a parallel `FIREBALL_FUSE_FRAMES` (526-531), indexed by the shot's age — the same "elapsed vs TTL, no shell effect state" idiom the muzzle flash and player laser already use (render.ts:311-321). Faithful re-expression of the ROM `GNB0-3`/`GNT0-3` gunshot pictures. Good pattern: consistent with the file's established animation approach.

**Error handling:** null-projection early-returns (`if (!c) return` / `if (!edge) return`); no throwing paths; the frame divisor is a nonzero const (0.05) and `k`/`fuseK` divide by nonzero consts (18, 6). Pure Canvas-2D geometry — no I/O, network, storage, or input surface.

### Rule Compliance (TS lang-review, 13 checks — corroborated by reviewer-rule-checker)
- **#1 Type escapes** — PASS. Only `as unknown as CanvasRenderingContext2D` (test:110), the documented repo-wide shell-mock idiom (identical in 10+ sibling test files). No `as any`/`@ts-ignore`/non-null.
- **#2 Generic/readonly** — PASS. `FIREBALL_FRAMES`/`FIREBALL_FUSE_FRAMES` are `ReadonlyArray<ReadonlyArray<readonly [number, number]>>`; every test helper takes `ReadonlyArray<Seg>`/`ReadonlyArray<Dot>`.
- **#4 Null/undefined** — PASS. `FIREBALL_FRAMES[frame]` bounded to `{0,1,2,3}` by `%4` + `max(0,…)`; `ttl` invariant `(0,6]` traced to `sim.ts:822`. (`noUncheckedIndexedAccess` is off, so TS doesn't surface the index as `T|undefined` — a type blind spot, but safe by the runtime invariant; see [SIMPLE] for the latent-coupling note.)
- **#5 Module/`.js`** — PASS. Extensionless relative imports under `moduleResolution: bundler` (repo idiom); `import type` used for `Vec3`/`GameState`/`Projectile`.
- **#8 Test quality** — PASS. Specific-value assertions (`toBeGreaterThanOrEqual`/`toHaveLength`), scoped to a 120px shot window; no vacuous/`.only`/`.skip`.
- **#3 / #6 / #7 / #9 / #10 / #11 / #12 / #13** — N/A or PASS (no enums, JSX, async, config, input-validation, error-handling, or fix-cycle code touched; perf is a small bounded 8×3 loop).
- **Core/shell boundary (`star-wars/CLAUDE.md`)** — PASS. Diff touches only `src/shell/render.ts` + `tests/shell/*`; `src/core` untouched; no `Date.now`/`performance.now`/`Math.random`/`requestAnimationFrame`. AC3 satisfied.

### Observations (self-assessed for the 7 disabled specialists + own analysis)
- `[VERIFIED]` frame index is total and bounded — `sim.ts:822` culls `ttl<=0`, both frame tables are length-4, `%4`+`max(0,…)` — so `FIREBALL_FRAMES[frame]`/`FIREBALL_FUSE_FRAMES[frame]` are never `undefined`. Complies with TS #4.
- `[VERIFIED]` AC3 boundary holds — `git diff develop...HEAD` = `render.ts` + test only; frame derived purely from sim-owned `s.ttl` via arithmetic; no core edit, no wall-clock. Complies with `star-wars/CLAUDE.md`.
- `[VERIFIED]` colour separation preserved — body + fuse stroke `FIREBALL_GLOW` (red/VGCRED, render.ts:540), muzzle flash stays `FIRE_GLOW` amber; the sw3-9 muzzle/aged tests stay green. AC4 held.
- `[VERIFIED]` no regression — 684/684 green; sw3-9 sparkle, 9-6 muzzle, 8-12 player-laser suites all pass.
- `[EDGE]` (disabled — self-assessed): boundary paths enumerated — `ttl` at either end of `(0,6]` → frame 0..3, both projection nulls early-return, empty `enemyShots` draws nothing, a frozen shot on attract/gameover holds one frame (unchanged from sw3-9, which also drew the body in all modes). No unhandled boundary.
- `[SILENT]` (disabled — self-assessed): no swallowed errors — no `try/catch`; the only non-happy path is the intentional null-projection early-return, matching every sibling draw fn.
- `[TEST]` (disabled — self-assessed, + rule-checker #8): assertions are non-vacuous and seam-agnostic (24-sample `ttl` sweep, distinct-signature set, short-off-centre fuse count); the guard test catches a degenerate/amber frame. The `ctx.arc` stub declares 3 of arc's real params — harmless, matches every sibling stub.
- `[DOC]` (disabled — self-assessed): the stale sw3-9 comment ("*Fuse-ball tips + the 4-frame flicker are eyeball follow-ons, unpinned*") is REMOVED, not left dangling; the docstring is rewritten to the sw3-11 animation and the "sim never knows about it" boundary. No stale comment remains.
- `[TYPE]` (disabled — covered by rule-checker #1/#2): readonly frame tables, no type escape beyond the justified mock cast.
- `[SEC]` (disabled — self-assessed): pure Canvas-2D geometry — no user input, network, storage, or injection surface. N/A.
- `[SIMPLE]` **LOW** — the frame index is `% FIREBALL_FRAMES.length` but the same `frame` indexes `FIREBALL_FUSE_FRAMES` too. Both are length-4 today (safe), but a future edit adding a `GNB` frame without a matching `GNT` frame would make `fuse` undefined → the inner `for…of` throws. Latent coupling, not a live bug — a shared frame-count const or an equal-length note would harden it. Non-blocking.
- `[RULE]` reviewer-rule-checker: 13/13 PASS/N/A + boundary PASS, high confidence. Nothing to confirm or dismiss.
- `[LOW]` the outermost fuse-spoke tip reaches ~1.16× `ENEMY_SHOT_HIT_RADIUS` (spike ~1.0× at NOM 18 + fuse ~0.16×) — a marginally larger "see-vs-shoot" overshoot than sw3-9's flagged 1.06×. Eyeball (sw2-7).
- `[LOW]` flicker rate `FIREBALL_FRAME_SECONDS = 0.05` (≈20fps) and fuse-on-all-tips (vs the ROM's per-frame `FUSE` mask) are aesthetic — could read as a fast strobe / busy tips. Eyeball (sw2-7).

### Devil's Advocate
Assume this is broken. First, the index: `FIREBALL_FRAMES[frame]` with `noUncheckedIndexedAccess` off means TypeScript will NOT protect us if `frame` ever escapes `[0,4)`. Could it? Only if `ttl` were `NaN`/`±Infinity` (then `frame` is `NaN`, `FIREBALL_FRAMES[NaN]` is `undefined`, and the `for…of` throws a TypeError that would blank the whole render). I traced the only producer — `advance()` at `sim.ts:821` computes `b.ttl - dt` from a finite seed and drops non-positive results — so on any *reachable* state `ttl` is finite and positive; the existing muzzle-flash code at render.ts:319 already trusts exactly this, so it is not a new risk. Not a live bug, but it rests on an invariant the type system isn't enforcing — worth the [SIMPLE] length-coupling note. Second, legibility: a *fast* four-frame flicker of a red sparkle whose fuse balls now push ~16% past the hittable radius could, under heavy fire, read as visual noise or provoke phantom misses when a player aims at a fuse tip — the very "reads as decoration / see-vs-shoot" concerns sw3-9's review raised, now with motion added. But motion is the entire point of this story (a static sparkle was the reported bug), and these are tuning values, not correctness — the right forum is the sw2-7 playtest this epic already schedules. Third, the frozen-frame-on-gameover case: a fireball caught in `state.enemyShots` when the run ends holds one frame because the sim stops advancing `ttl` — identical to sw3-9's static body, so no new bleed (the 9-6 "no amber on game-over" test still passes). Fourth, robustness: `enemyShots` is ROM-bounded to ≤6, so the added 8×3 inner loop is at most ~192 segments/frame — trivial. None of these rise to Medium, let alone High. Verdict stands: APPROVED.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): drive the animation frame off `elapsed = ENEMY_SHOT_TTL - s.ttl` — the exact quantity `render.ts:319` already uses to time the muzzle flash — for a deterministic, shell-side, testable driver. Do NOT use a wall-clock (`Date.now`/`performance.now`): it makes `render()` non-deterministic and the muzzle-flash precedent is explicitly "derived purely from elapsed flight vs TTL." Affects `src/shell/render.ts` (`drawFireball` frame selection). *Found by TEA during test design.*
- **Reference** (non-blocking): the ROM frame data for GREEN — `WSVROM.MAC` `.SBTTLE GUNSHOT PICTURES`: base sparkle `GNB0/1/2/3` (four distinct `AON` spike tables) at file lines ~961–1288, tip fuse-ball `GNT0-3` at ~1289–1430. Fetch `raw.githubusercontent.com/historicalsource/star-wars/5355b76/WSVROM.MAC` (CR-terminated → `tr '\r' '\n'`). `GNB0` is already ported as `FIREBALL_SPIKES`; transcribe `GNB1-3` + the `GNT` fuse geometry. Affects `src/shell/render.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): AC3 ("shell-only, no core change, stepGame stays deterministic") is NOT unit-pinned — a determinism-across-calls test would forbid the shell-clock seam AC3 permits. Reviewer must trace the GREEN diff to confirm it touches only `src/shell` and adds no `Date.now`/`performance.now`/RNG to `src/core` (the same boundary trace Obi-Wan ran for sw3-9). Affects review scope. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): three aesthetic tunables for the sw2-7 eyeball pass — `FIREBALL_FRAME_SECONDS` (0.05, flicker rate), `FIREBALL_FUSE_SCALE` (0.22, fuse-ball size), and the widened `FIREBALL_SPIKE_NOM` (18, ~11% smaller sparkle than sw3-9). Tests pin behaviour (animates + fuse present + no degenerate frame), not these values. Affects `src/shell/render.ts`. *Found by Dev during implementation.*
- **Confirmed** (non-blocking): AC3 boundary holds — `git diff develop...HEAD` touches only `src/shell/render.ts` + the test; no `src/core` change, no `Date.now`/`performance.now`/RNG added. The animation is driven purely from the sim-owned `s.ttl`. Reviewer's one-glance confirmation, per TEA's finding. Affects review scope. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `frame = … % FIREBALL_FRAMES.length` also indexes `FIREBALL_FUSE_FRAMES`; both are length-4 today (safe), but a future edit adding a `GNB` frame without a matching `GNT` frame would make `fuse` undefined and throw in the inner loop. A shared frame-count const or an equal-length note would harden the coupling. Affects `src/shell/render.ts` (`drawFireball`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): eyeball tunables to judge in the sw2-7 playtest — flicker rate (`FIREBALL_FRAME_SECONDS` 0.05 ≈ 20fps, may read as a strobe), the outermost fuse-spoke tip reaching ~1.16× `ENEMY_SHOT_HIT_RADIUS` (a slightly larger see-vs-shoot overshoot than sw3-9's 1.06×), and fuse-on-all-tips density vs the ROM's per-frame `FUSE` mask. All aesthetic, none affecting correctness. Affects `src/shell/render.ts` (render fidelity). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Pinned animation TOPOLOGY (≥2 distinct frames + ≥3 fuse marks), not the exact GNB0-3/GNT0-3 vertex data**
  - Spec source: `.session/sw3-11-session.md`, AC1 + AC2
  - Spec text: "cycle the ROM's 4 gunshot frames (GNB0-3)" / "rounded FUSE-ball dots at the spike ends (GNT0-3)"
  - Implementation: tests assert the sparkle takes ≥2 distinct configurations across the shot's life and that ≥1 frame carries ≥3 short off-centre tip marks — not the exact four-frame vertex tables or exact fuse geometry.
  - Rationale: repo convention (sw3-9's own test header: "exact hue, spike count, and animation frame stay an EYEBALL concern … we pin colour FAMILY and TOPOLOGY, not pixels"). Pinning exact GNB vertices couples the test to one transcription and rejects valid faithful ports; ≥2-distinct + fuse-mark presence still fails hard today (1 frame, 0 marks) and forces the real animation.
  - Severity: minor
  - Forward impact: exact "all four GNB frames + faithful GNT" fidelity is judged in the sw2-7 eyeball playtest, not CI — identical to how sw3-9's static frame was handled.
- **AC3 (shell-only / deterministic core) left to Reviewer's diff trace, not unit-pinned**
  - Spec source: `.session/sw3-11-session.md`, AC3
  - Spec text: "no `src/core` change … `stepGame` stays deterministic"
  - Implementation: no test asserts "core unchanged" or "render is deterministic across identical calls"; the latter would forbid the shell-animation-clock seam AC3 itself allows.
  - Rationale: "no core change" is a diff-level architectural invariant (Obi-Wan traced exactly this for sw3-9 — "the core/shell boundary holds"); a determinism-across-calls unit test would over-constrain the open seam decision the SM deliberately left to GREEN.
  - Severity: minor
  - Forward impact: captured as a Delivery Finding so Reviewer confirms shell-only + no new time/RNG in core during code review.

### Dev (implementation)
- **Widened `FIREBALL_SPIKE_NOM` 16 → 18 (all four frames share one nominal)**
  - Spec source: `.session/sw3-11-session.md`, AC1 + sw3-9's `FIREBALL_SPIKE_NOM = 16`
  - Spec text: "cycle the ROM's 4 gunshot frames (GNB0-3)"
  - Implementation: raised the nominal from 16 (sw3-9, authored for GNB0's max magnitude ~16) to 18 so GNB2's magnitude-18 tips project inside the body radius; every frame now maps a common nominal to the projected hit radius. Side effect: the static GNB0 sparkle reads ~11% smaller than sw3-9.
  - Rationale: a shared nominal keeps the four frames the same size; 18 also trims the 1.06× spike-tip overshoot the sw3-9 reviewer flagged (magnitude-17 tips at NOM 16). Minimal — one constant.
  - Severity: minor
  - Forward impact: the sparkle is ~11% smaller than sw3-9's; eyeball at sw2-7 (tunable via the nominal).
- **Fuse ball drawn at EVERY spike tip, not only the ROM's per-frame FUSE-flagged tips**
  - Spec source: `WSVROM.MAC` `GNB0-3` (`FUSE` appears on ~6 of 8 spikes per frame, not all)
  - Spec text: "GUN SHOTS -- SPARKLES WITH FUSE BALLS" (`FUSE` macro after selected spikes)
  - Implementation: a fuse ball is drawn at all 8 spike tips of every frame, rather than tracking the ROM's exact per-spike FUSE placement.
  - Rationale: minimalist — the exact per-spike FUSE mask is a parallel per-frame table for an eyeball-scale nuance; fuse-on-all-tips reads as the authentic "sparkle with fuse balls" and satisfies the pinned "tip detail present."
  - Severity: minor
  - Forward impact: slightly denser fuse detail than the cabinet; eyeball at sw2-7 if it reads busy.

### Reviewer (audit)
- **TEA — Pinned animation TOPOLOGY, not exact GNB0-3/GNT0-3 vertices** → ✓ ACCEPTED by Reviewer: matches the repo convention sw3-9 established (colour-family + topology, not pixels); the ≥2-distinct-signature + fuse-mark assertions still fail hard on a static frame (1 signature, 0 marks), so they genuinely force the animation without over-coupling to one transcription.
- **TEA — AC3 left to Reviewer's diff trace, not unit-pinned** → ✓ ACCEPTED by Reviewer: sound — a determinism-across-calls test would forbid the shell-clock seam AC3 permits. I ran the trace: `git diff develop...HEAD` touches only `src/shell` + tests, `src/core` untouched, no time/RNG added. Boundary holds.
- **Dev — Widened `FIREBALL_SPIKE_NOM` 16→18** → ✓ ACCEPTED by Reviewer: a shared nominal keeps the four frames the same size, and 18 fits GNB2's magnitude-18 tips inside the body radius — it also trims the 1.06× spike overshoot sw3-9's review flagged. The ~11%-smaller sparkle is an eyeball delta for sw2-7, not a regression (the depth-scale invariant still holds — near > far).
- **Dev — Fuse ball at every spike tip (not the ROM's per-frame FUSE mask)** → ✓ ACCEPTED by Reviewer: a defensible minimal GREEN — the exact per-spike FUSE mask is an eyeball-scale nuance, and fuse-on-all-tips reads as the authentic "sparkle with fuse balls" while satisfying the pinned tip-detail. Flagged for the sw2-7 pass if it reads busy.