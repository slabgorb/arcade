---
story_id: "rb2-6"
jira_key: ""
epic: ""
workflow: "tdd"
---
# Story rb2-6: Kill to explosion + scoring — UPPLEX falling/spinning wreck (EX.ACY gravity, EXPL1/EXPL2 debris via PIECE0-3), score PLVALU = depth x VALFRC (closer worth more), OBJKLD to GMLEVL level ramp

## Story Details
- **ID:** rb2-6
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-10T20:05:45Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-10T19:25:01Z | 2026-07-10T19:28:06Z | 3m 5s |
| red | 2026-07-10T19:28:06Z | 2026-07-10T19:43:06Z | 15m |
| green | 2026-07-10T19:43:06Z | 2026-07-10T19:58:14Z | 15m 8s |
| review | 2026-07-10T19:58:14Z | 2026-07-10T20:05:45Z | 7m 31s |
| finish | 2026-07-10T20:05:45Z | - | - |

## Sm Assessment

**Story:** rb2-6 — Kill → explosion + scoring. When a player shell downs the enemy
biplane, replace the current instant-respawn with a ROM-faithful UPPLEX
falling/spinning wreck (EX.ACY gravity), EXPL1/EXPL2 debris (PIECE0-3), depth-scaled
score `PLVALU = depth × VALFRC` (closer kills worth more), and an `OBJKLD`→`GMLEVL`
level ramp.

**Repo / branch:** red-baron · `feat/rb2-6-kill-explosion-scoring` (gitflow → base
`develop`, NOT `main`). Workflow `tdd` (phased). No Jira — local sprint YAML only.

**Handoff to TEA (O'Brien) for RED phase — load-bearing pointers:**
- **The seam:** rb2-5 left `guns.step()` returning `hits: Hit[]` (`{ shell, target }`).
  That is the signal rb2-6 consumes to explode + score. rb2-5 explicitly kept the
  `Hit{shell,target}` shape stable for this story (see rb2-5 Delivery Findings).
- **The replacement site:** `red-baron/src/main.ts` currently does a minimal instant
  respawn on hit. rb2-6 swaps that for the UPPLEX explosion + PLVALU scoring. The
  `Hit` seam it consumes is unchanged.
- **Canonical spec:** `docs/red-baron-1980-source-findings.md` (ROM source
  `historicalsource/red-baron` is gitignored / may be absent — the findings doc is
  the authoritative in-repo source). ROM is canonical over playtest curves; full-diff
  TS against the fidelity doc, don't pin a single golden value.
- **Cadence trap:** the sim ticks one step per **calc-frame** (~10.42 Hz / 96 ms), not
  the 62.5 Hz display frame — `src/core/timing.ts` (`SIM_HZ`, `SIM_TIMESTEP_S`) already
  encodes it. Wreck-fall/debris/gravity must tick on calc-frame, not display-frame.
- **Prior-art:** read `sprint/archive/rb2-5-session.md` (Delivery Findings + reviewer
  notes) before test design — it pre-extracts this story's quarry.

**Verdict:** Setup complete, session + context + branch in place, no blocking PRs.
Routing to TEA for RED (write failing tests). Confirm → handoff.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (41 rb2-6 tests failing cleanly; 10 pre-existing cockpit-boot tests still green; no collection crashes, no regressions — verified by testing-runner run `rb2-6-tea-red`)

**Test Files:**
- `red-baron/tests/core/explosion.test.ts` (NEW, 18 tests) — the `UPPLEX` wreck sim contract for `src/core/explosion.ts`: EX_ACY=-20 accelerating fall, spin about Z, falling(6)→exploding(12)→done lifecycle, DEBRIS_COUNT=4 tied to topology's `EXPLOSION_PIECES`, purity/totality (idempotent past 'done').
- `red-baron/tests/core/scoring.test.ts` (NEW, 18 tests) — the score + level-ramp contract for `src/core/scoring.ts`: PLVALU lead score strictly decreasing in depth ("closer worth more"), flat DRONE_SCORE=300 / BLIMP_SCORE=200 (depth-independent), the byte-exact `PLNLVL` OBJKLD→GMLEVL table, monotone ramp saturating at MAX_GMLEVL=5, total on bad kill counts.
- `red-baron/tests/cockpit-boot.test.ts` (5 tests appended) — the "keep the sneaky dev honest" wiring guard: main.ts must import `./core/explosion` + `./core/scoring`, CALL `explode(` / `stepWreck(` / `scoreKill(` / `gmlevlForKills(`, and drop the dead `const LEVEL = 0` hardcode (mirrors rb2-4 retiring `proximity: 'far'`).

**Tests Written:** 41 tests covering the story's four behaviours (explosion, PLVALU scoring, drone/blimp flats, OBJKLD→GMLEVL ramp) + the runnable wiring.

### The GREEN contract (for Julia / Dev)

Create two pure, deterministic core modules (no DOM/time/randomness); each test file's header block is the authoritative signature.

- `src/core/explosion.ts` — exports `EX_ACY`(-20), `EXPL1_FRAMES`(6), `EXPL2_FRAMES`(12), `DEBRIS_COUNT`(4), `type WreckPhase = 'falling'|'exploding'|'done'`, `interface Wreck`, `explode(enemy): Wreck`, `stepWreck(wreck): Wreck`. Gravity is an ACCELERATING fall (vy += EX_ACY each frame, y += vy); spin advances a fixed non-zero Z step; lifecycle is exactly 18 calc-frames then idempotent 'done'. DEBRIS_COUNT must equal `EXPLOSION_PIECES.length` (import from `./topology`).
- `src/core/scoring.ts` — exports `DRONE_SCORE`(300), `BLIMP_SCORE`(200), `MAX_GMLEVL`(5), `PLNLVL`([0,0,0,0,1,2,2,2,3,3,3,4,4,4,4,4,5]), `type KillKind='lead'|'drone'|'blimp'`, `scoreKill(kind, depth)`, `gmlevlForKills(objkld)`. **The lead score must DECREASE with depth** (closer = more — a literal `depth × VALFRC` fails AC-2; see Design Deviations). Drone/blimp are flat. `gmlevlForKills` indexes `PLNLVL` clamped to `[0, len-1]`, negative/NaN → 0.
- Rewire `src/main.ts`: on a `Hit`, `explode(enemy)` → step the wreck to 'done' (replacing the instant respawn), add `scoreKill('lead', enemy.depth)` to a running score, bump a kill count, and set the enemy level via `gmlevlForKills(kills)` (remove `const LEVEL = 0`), then spawn the next plane.

### Rule Coverage

| Rule (lang-review/typescript.md) | Test(s) | Status |
|------|---------|--------|
| #3 enum/union exhaustiveness | explosion "every phase … is a valid WreckPhase"; scoring "every KillKind returns a positive finite score" | failing (RED) |
| #4 null/undefined — 0 is a real value, not falsy-unset | explosion "vy is 0 (a REAL starting velocity)", "timer … exactly 0 when done"; scoring "starts at level 0 with no kills" | failing (RED) |
| #2 missing `readonly` / no-mutation of inputs | explosion "never mutates its input wreck"; readonly `Wreck` / `PLNLVL` interfaces | failing (RED) |
| #8 test quality — meaningful assertions, no vacuous, VALUE-pinned totality | gravity accelerates / spin monotone / score monotone (all fail if the mechanism is deleted); explosion & scoring totality pin the VALUE (idempotent done; bad count → 0), not just the type | failing (RED) |
| purity/determinism (SOUL: pure sim, no DOM/time/rng) | explosion "pure — same inputs give same outputs"; scoring "pure" | failing (RED) |

**Rules checked:** 5 of the applicable lang-review rules (#2, #3, #4, #8, purity) have test coverage; #1/#5–#7/#9–#13 are N/A to a leaf pure-sim module + node-env test files (no `as any`, no React, no async, no JSON/user-input boundary).
**Self-check (Phase C):** no vacuous tests — every test asserts a value; degenerate-input tests pin the VALUE not `typeof` (the rb2-5 review lesson: "tests that stay green through a real regression"). The gravity/spin/score-monotonicity tests each FAIL if their mechanism is removed.

**Handoff:** To Dev (Julia) for the GREEN phase — implement `explosion.ts` + `scoring.ts` + the `main.ts` rewire to turn all 41 tests green.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `red-baron/src/core/explosion.ts` (NEW) — the pure UPPLEX wreck sim: `EX_ACY`/`EXPL1_FRAMES`/`EXPL2_FRAMES`/`DEBRIS_COUNT`, `WreckPhase` union, `Wreck`, `explode(enemy)`, `stepWreck(wreck)`. Gravity accumulates then moves (accelerating fall); fixed Z spin; falling(6)→exploding(12)→done, idempotent once done.
- `red-baron/src/core/scoring.ts` (NEW) — the pure score + level ramp: `DRONE_SCORE`(300)/`BLIMP_SCORE`(200)/`MAX_GMLEVL`(=max PLNLVL=5)/`PLNLVL`, `KillKind` union with an `assertNever` exhaustiveness guard, `scoreKill(kind, depth)` (lead depth-scaled via `DRONE_SCORE + max(0, P_INDP−depth)×VALFRC`; drone/blimp flat), `gmlevlForKills(objkld)` (clamped table lookup, total on bad counts).
- `red-baron/src/main.ts` (MODIFIED) — rewired the calc-frame loop: a `Hit` now scores the kill, bumps `kills` (OBJKLD), and hands the plane to a `Wreck` that animates to 'done' before a fresh plane spawns; the enemy level is `gmlevlForKills(kills)` (the dead `const LEVEL = 0` is gone); `draw()` renders the falling wreck then the PIECE0-3 debris burst, plus a minimal `SCORE` readout.

**Tests:** 278/278 passing (GREEN) — the full red-baron suite including all 41 rb2-6 tests. `npm run build` (tsc --noEmit && vite build) exits 0 (verified by testing-runner run `rb2-6-dev-green`).

**Runtime verification:** the Chrome extension was unavailable for a visual playtest, so I drove the integration with a throwaway `tsx` harness that replays main.ts's loop against the real pure modules. It confirmed the full cascade at runtime: a hit scored 776 (mid-range depth-400 kill), the wreck rendered 6 falling + 12 exploding frames then respawned, `gmlevlForKills(0,4,5,16,999)=0,1,2,5,5`, and `scoreKill('lead',140)=958 > far(1080)=300` (drone 300 / blimp 200). Harness deleted (not committed). A live in-browser playtest of the explosion visuals is deferred to rb2-12 (the epic's playtest story), consistent with rb2-4/rb2-5.

**Self-review:**
- [x] Wired to front end — main.ts draws the wreck (falling plane + PIECE0-3 debris) and the score; cockpit-boot guards pass.
- [x] Follows project patterns — pure `src/core` sim (no DOM/time/rng), calc-frame cadence, ROM constants + inferred tunables flagged, mirrors guns.ts/enemy.ts.
- [x] All ACs met — explosion lifecycle, PLVALU (closer=more), drone/blimp flats, OBJKLD→GMLEVL ramp.
- [x] Error handling / totality — `stepWreck` idempotent past done; `gmlevlForKills` total on negative/NaN; `scoreKill` exhaustive union.

**Branch:** `feat/rb2-6-kill-explosion-scoring` (pushed to origin).

**Handoff:** To Reviewer (The Thought Police) for code review.

## Subagent Results

Only `reviewer-preflight` is enabled in this project (`workflow.reviewer_subagents`); the eight thematic specialists are disabled via settings, so I performed each of their domains myself and tagged the observations by source in the assessment below.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 (278 tests green, tsc+vite build PASS, tree clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — edges reviewed by Reviewer (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — reviewed by Reviewer (see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — reviewed by Reviewer (see [TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — reviewed by Reviewer (see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — reviewed by Reviewer (see [TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — reviewed by Reviewer (see [SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — reviewed by Reviewer (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — reviewed by Reviewer (see [RULE]) |

**All received:** Yes (1 enabled subagent returned; 8 disabled via settings and covered by the Reviewer directly)
**Total findings:** 1 confirmed (LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Summary:** Two small, pure, well-documented core modules (`explosion.ts`, `scoring.ts`) plus a clean `main.ts` rewire. 278/278 tests pass, tsc + vite build clean, working tree clean. The behavioural tests are robust (they fail if the mechanism is removed — gravity acceleration, monotone spin, monotone score, VALUE-pinned totality), directly addressing the rb2-5 "tests that stay green through a regression" lesson. I independently verified the one novel runtime risk (rb2-6 is the first `renderModel` consumer of `EXPLOSION_PIECES`) and the depth-convention deviation. One LOW, non-blocking finding.

**Observations (tagged by domain; thematic subagents disabled, analysis by Reviewer):**

- **[LOW] [TYPE][DOC][EDGE] `scoreKill('lead', depth)` is not total on non-finite depth** — `src/core/scoring.ts:leadScore` → `DRONE_SCORE + Math.round(Math.max(0, P_INDP − depth) × VALFRC)` returns **NaN** for `depth = NaN/±Infinity`, yet `scoreKill`'s JSDoc claims "Total — every KillKind returns a positive, finite score," and its sibling `gmlevlForKills` (scoring.ts:88) *does* guard `!Number.isFinite`, as do `guns.collides` and `enemy.proximityBand`. This breaks the codebase's totality-on-degenerate-input convention. **Not blocking:** unreachable in the wired game — `main.ts` only ever calls `scoreKill('lead', enemy.depth)`, and `enemy.depth` is always finite (`enemy.ts:step` = `Math.max(depth − CLOSE_SPEED, MIN_DEPTH)`). Logged as a non-blocking Delivery Finding for a future one-line guard or a softened doc claim.
- **[VERIFIED] [EDGE] debris rendering is bounds-safe** — rb2-6 is the FIRST `renderModel` consumer of `EXPLOSION_PIECES`. I confirmed every connect-list index is in range (PIECE0 14pts/max13, PIECE1 23/21, PIECE2 9/8, PIECE3 9/8) and each list starts with a move op (`draw:false`), so `renderModel`'s pen-turtle (`biplane.ts:163`) never indexes an undefined vertex nor draws from a null `current`. No runtime crash path.
- **[VERIFIED] [EDGE] wreck lifecycle is exact and total** — `stepWreck` (explosion.ts:80) maintains `timer > 0` within a phase and transitions falling(6)→exploding(12)→done at 18 frames; `'done'` short-circuits to idempotent (no runaway timer/fall/spin). `drawWreck`'s `spread = (EXPL2_FRAMES − timer) × DEBRIS_SPREAD` is never negative (timer ∈ [1,12] while exploding). The `'done'` branch of `drawWreck` is unreachable (the loop nulls `wreck` the same frame it becomes done) — a harmless defensive no-op.
- **[VERIFIED] [correctness] no double-scoring on a multi-shell frame** — `main.ts` loop: `if (shotResult.hits.length > 0)` scores ONCE and bumps `kills` ONCE even if two shells connect the same calc-frame (one enemy = one kill); the branch then flips to the wreck path, so the dead enemy is never re-stepped or re-hit (`stepGuns(guns, [])` during the wreck). One kill per wreck cycle.
- **[VERIFIED] [SILENT] no swallowed errors** — no empty catches, no silent fallbacks; `assertNever` (scoring.ts:44) THROWS loudly on an unhandled `KillKind`. `if (!ctx) return` in `draw` is the pre-existing canvas-guard pattern, not a new silent path.
- **[VERIFIED] [TEST] tests fail on regression** — the gravity-accelerates, monotone-spin, monotone-score, exact-phase-boundary, and VALUE-pinned-totality tests each detect their mechanism's removal (I traced each). No vacuous assertions; the DEBRIS_COUNT test ties to `EXPLOSION_PIECES.length` so it can't drift. Gap: no test for `scoreKill('lead', NaN)` (the LOW finding above) — unreachable, so not a blocker.
- **[VERIFIED] [SEC] no attack surface** — client-only canvas game, no backend/network/storage, no `eval`/`innerHTML`; the score is rendered via `ctx.fillText(\`SCORE ${score}\`)` where `score` is always an integer (`scoreKill` returns integers), so no injection/XSS. Keyboard input is boolean flags. N/A by architecture.
- **[VERIFIED] [SIMPLE] no over-engineering / dead code** — two minimal modules; `gmlevlForKills(kills)` is recomputed ~2×/frame (trivial array index) and `readInput` uses the stale `enemy.depth` for proximity during the ~18 wreck frames (cosmetic only, enemy fire is rb2-8) — not worth a change.
- **[VERIFIED] [RULE] TypeScript lang-review compliant** — see the Rule Compliance section below; the only near-miss is the `scoreKill` "Total" doc claim (the LOW finding).

**Data flow traced:** player Space keydown → `held.has(' ')` → `fire(guns, true)` → `stepGuns(guns, [enemy])` → `Hit` → `scoreKill('lead', enemy.depth)` accrues to `score`, `kills++` → `explode(enemy)` → `stepWreck` ×18 (falling→exploding→done) → fresh `spawn(..., gmlevlForKills(kills))`. Every hop is pure + typed; `score`/`kills` are the only mutable accumulators and both are finite integers by construction. Safe.

**Pattern observed:** faithfully mirrors the established rb2-4/rb2-5 house pattern — pure `src/core` sim (no DOM/time/rng), ROM constants byte-pinned with citations, inferred tunables explicitly flagged (`SPIN_RATE`, `VALFRC`, `DEBRIS_DIRS`/`DEBRIS_SPREAD`), calc-frame cadence, structural wiring guards in `cockpit-boot.test.ts` (`src/main.ts:231` loop).

**Error handling:** `stepWreck` total past 'done' (explosion.ts:81); `gmlevlForKills` total on negative/NaN (scoring.ts:88); `scoreKill` exhaustive via `assertNever`. One gap: `scoreKill('lead')` non-finite depth (the LOW finding) — unreachable.

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md`)

Enumerated against every type/function in the diff. No `.claude/rules/*.md` or `SOUL.md` exists in red-baron; CLAUDE.md has no type/security rules for game code.

| Rule | Applies to | Verdict |
|------|-----------|---------|
| #1 type-safety escapes (`as any`/`@ts-ignore`/`!`) | all new code | **Compliant** — zero in the diff (preflight grep = 0); no non-null assertions |
| #2 generics/interfaces — `readonly`, no `Record<string,any>`/`Function` | `Wreck`, `PLNLVL`, `DEBRIS_DIRS`, `KillKind`, params | **Compliant** — all `Wreck` fields `readonly`; `PLNLVL`/`DEBRIS_DIRS` `readonly` + frozen; no broad types |
| #3 enum/union exhaustiveness (default→assertNever) | `scoreKill` switch on `KillKind`; `stepWreck` on `WreckPhase` | **Compliant** — `scoreKill` has `default: assertNever(kind)`; `stepWreck` handles done/falling/exploding exhaustively via early returns |
| #4 null/undefined — `??` not `||` on 0-valid; narrow `\| null` | `wreck: Wreck \| null`; `vy`/`timer`/`score`/`kills` = 0 real values | **Compliant** — `if (wreck)` narrows; no `\|\|` on 0-valid values in new code; 0 treated as genuine |
| #5 module/declaration (`export type`, imports) | all imports | **Compliant** — `type Wreck`/`type Guns`/`type Shell` type-only; no missing `export type` |
| #8 test quality — no vacuous, no `as any` in tests | 3 test files | **Compliant** — value-pinned assertions, fail-on-regression, zero `as any` |
| #11 error handling — no swallowing; total contracts | `assertNever`, `stepWreck`, `gmlevlForKills`, `scoreKill` | **Near-miss** — all total EXCEPT `scoreKill('lead')` on non-finite depth vs its "Total" doc claim (the LOW finding); everything else honors totality |
| #6 React, #7 async, #9 build-config, #10 input-validation, #12 perf-bundle, #13 fix-regressions | — | **N/A** — no React, no async, no user-input/JSON boundary, strict config unchanged |

### Devil's Advocate

Assume this is broken. Where would it bite? First, the **score readout**: `ctx.fillText(\`SCORE ${score}\`)`. If `score` ever became `NaN`, the HUD would read "SCORE NaN" forever, and nothing resets it — a permanent, ugly, non-recoverable UI state. The only route to a NaN score is `scoreKill('lead', <non-finite>)`, which I proved returns NaN. Today that is unreachable because `enemy.depth` is clamped finite, but this is a *latent trap*: the moment rb2-7 wires drones with a different depth source, or a refactor lets a wreck's depth feed scoring, a single NaN poisons the score irrecoverably. The sibling `gmlevlForKills` guards against exactly this; `scoreKill` should too. That is the LOW finding, and it is the single most plausible future break. Second, a **confused/stressed user**: mash fire during the explosion — shells fly against an empty target list, zero hits, no re-kill; the wreck can't be scored twice. A tab-stall produces a huge `dt`, but the accumulator is clamped to 0.25s (pre-existing), so the loop can't spiral; the wreck simply advances several idempotent steps. Rapid consecutive kills ramp `kills` and thus `GMLEVL`, but `gmlevlForKills` saturates at 5 — no out-of-range table read (I checked negative, NaN, 17, 10 000). Third, a **malicious user**: there is no server, no network, no storage, no `eval`/`innerHTML`, and the only string interpolated into the canvas is an integer score — so there is no injection, XSS, or tenant surface to attack. Fourth, **rendering**: rb2-6 is the first code to push `EXPLOSION_PIECES` through `renderModel`; a bad connect index would throw at runtime (invisible to tsc and the pure tests). I enumerated all four pieces — every index is in bounds and every list opens with a move op, so the pen-turtle never dereferences an undefined vertex. Fifth, **spin overflow**: `spin` accumulates unbounded (~4.5π over a wreck's life) but feeds `rotationZ` (cos/sin), which is periodic — no glitch. Conclusion: nothing rises above LOW; the code is sound and the one weakness is an unreachable, well-contained robustness gap.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): the fidelity doc's PLVALU formula and its plain-English reward rule are in tension under our depth convention — "`PLVALU = depth × VALFRC` … closer kills are worth more" reads backwards when `depth` shrinks as the plane nears (enemy.ts). Affects `docs/red-baron-1980-source-findings.md` §4 (clarify that ROM "depth" is a closeness/brightness proxy, or note the inversion) — a one-line doc clarification would remove the trap. *Found by TEA during test design.*
- **Gap** (non-blocking): the kill payoff needs to know WHICH kind was downed, but the `Hit{shell,target}` seam (guns.ts) and `Enemy` (enemy.ts) carry no lead/drone/blimp discriminant — for the lone-plane rb2-6 main.ts hardcodes `'lead'`. Affects `src/core/enemy.ts` / `src/core/guns.ts` (`Hit`): rb2-7 must add a `kind` (or equivalent) so `scoreKill(kind, depth)` and the `PLNXCG` drone→lead promotion pick the right entity. *Found by TEA during test design.*
- **Improvement** (non-blocking): rb2-6 turns `main.ts`'s rb2-5 `const LEVEL = 0` into a kills-driven `gmlevlForKills(OBJKLD)`, so the enemy weave (P_OLIM/P_ILIM are GMLEVL-indexed, enemy.ts) actually widens as the player wins — the first place the difficulty ramp becomes visible. Affects `src/main.ts` (thread the running kill count → level into `stepEnemy`/`spawn`). *Found by TEA during test design.*
- **Question** (non-blocking): does rb2-6 own an on-screen score readout, or only the scoring LOGIC? rb2-5's reviewer note said "score/lives arrive in rb2-6/rb2-9". TEA scoped the RED contract to the logic + wiring and DEFERRED the HUD glyph render (findings §7 RBCHAR font) — flagged so the Reviewer/PM can confirm the scope split. Affects `src/main.ts` draw path. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the explosion-debris pieces render through biplane.ts's `renderModel` unchanged because a topology `VectorPicture` (`{points, connect}`) is structurally identical to a `BiplaneModel` — the two interchangeable shapes could be unified into one shared type/renderer when a third caller appears. Affects `src/core/biplane.ts` / `src/core/topology.ts` (candidate consolidation, not needed now). *Found by Dev during implementation.*
- **Question** (non-blocking): I resolved TEA's HUD scope question by shipping a minimal `SCORE {n}` text readout (forced by `noUnusedLocals` on the running score + the "wired to front end" self-review); the authentic ROM score-glyph HUD stays deferred. Reviewer/PM should confirm this placeholder is acceptable for rb2-6 vs. wanting zero display. Affects `src/main.ts` draw path. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `scoreKill('lead', depth)` returns `NaN` for a non-finite `depth` (`leadScore` = `DRONE_SCORE + Math.round(Math.max(0, P_INDP − depth) × VALFRC)`), yet its JSDoc claims totality and the sibling `gmlevlForKills` / `guns.collides` / `enemy.proximityBand` all guard `!Number.isFinite`. Unreachable today (`main.ts` only passes the always-finite `enemy.depth`), but a latent trap: a future non-finite depth would poison `score` → a permanent "SCORE NaN" HUD. Affects `red-baron/src/core/scoring.ts` (add a `Number.isFinite(depth)` guard to `leadScore`, or soften the "Total … positive, finite" JSDoc to exclude non-finite depth). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): rb2-6 is the first `renderModel` consumer of a topology `VectorPicture` (the debris pieces) — the interchangeable `VectorPicture` (`topology.ts`) and `BiplaneModel` (`biplane.ts`) shapes could be unified into one shared type/renderer now that a second caller exists. Affects `red-baron/src/core/biplane.ts` / `topology.ts` (candidate consolidation; not needed for rb2-6). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **PLVALU pinned as "closer = more" (monotone in depth), NOT the literal `depth × VALFRC` formula**
  - Spec source: docs/red-baron-1980-source-findings.md §4; context-epic-rb2.md §6
  - Spec text: "a lit/close plane scores `PLVALU = depth × VALFRC` (score fraction, starts 7/10) — **closer kills are worth more**"
  - Implementation: `scoring.test.ts` pins the lead score as STRICTLY DECREASING in `enemy.depth` (near=140 scores more than far=1080), not the literal product `depth × VALFRC`
  - Rationale: under the enemy.ts depth convention (P_INDP=1080 far → MIN_DEPTH=140 near, so smaller depth = closer), the literal `depth × VALFRC` would make FARTHER worth more — the opposite of the doc's explicit English. Per the Spec Authority hierarchy I pinned the stated behaviour ("closer worth more") and left the arithmetic form to Dev; the exact VALFRC curve is unpinned tuning
  - Severity: minor
  - Forward impact: Dev must implement the lead score so it DECREASES with `depth` (invert/normalise), e.g. `(FAR − depth) × VALFRC`; a naive `depth × VALFRC` will fail AC-2
- **`scoreKill` covers `'drone'`/`'blimp'` kinds though rb2-6 only kills the lone lead**
  - Spec source: session story scope (rb2-6); context-epic-rb2.md §4 sequencing (drones = rb2-7, blimp = rb2-10)
  - Spec text: "drones and dim/far planes are a flat **300 pts** (`DRNPNT=30.`); blimp = **200 pts**"
  - Implementation: the RED contract's `scoreKill(kind, depth)` takes a `'lead' | 'drone' | 'blimp'` union and byte-pins DRONE_SCORE=300 / BLIMP_SCORE=200 now, even though the runnable game this story only ever kills the lead
  - Rationale: the flat values are ROM-pinned in the same findings paragraph as PLVALU; pinning them now (with an exhaustive-union API) means rb2-7 drones / rb2-10 blimp inherit a tested contract instead of re-deriving it, and it exercises the #3 exhaustive-union rule
  - Severity: minor
  - Forward impact: rb2-7 (drones) / rb2-10 (blimp) wire the non-lead kinds; the Enemy/Hit seam must carry WHICH kind was killed so main.ts passes the right `kind` (see Delivery Findings)
- **Debris pinned by COUNT + phase window, not per-fragment kinematics**
  - Spec source: session story title; docs/red-baron-1980-source-findings.md §3
  - Spec text: "`.EXPL1=6` frames fall → `.EXPL2=12` explosion … EXPL1/EXPL2 debris via PIECE0-3"
  - Implementation: `explosion.test.ts` pins DEBRIS_COUNT=4 (tied to `EXPLOSION_PIECES.length` in topology.ts) and that the `'exploding'` phase lasts exactly EXPL2_FRAMES; it does NOT pin individual debris-fragment scatter velocities/spin
  - Rationale: the findings doc pins the debris GEOMETRY (PIECE0-3, transcribed rb2-2) and the phase TIMERS, but not the per-piece kinematics (velocities are off-source, like the analog sound timbre) — pinning fabricated scatter values would violate "don't invent ROM data"
  - Severity: minor
  - Forward impact: debris fragment motion is Dev/render tuning within the EXPL2 window, ratified by MAME/playtest; not test-gated
- **Score DISPLAY (on-screen HUD readout) is out of the RED contract**
  - Spec source: session story scope; docs/red-baron-1980-source-findings.md §7 (glyph/HUD font = RBCHAR, a future story)
  - Spec text: story = "Kill to explosion + scoring … score PLVALU = depth × VALFRC"
  - Implementation: tests pin the scoring LOGIC (scoreKill/gmlevlForKills) and that main.ts CALLS scoreKill on a hit (wiring), but NOT an on-screen score readout
  - Rationale: the ROM HUD/score glyphs (VGAN/RBCHAR) are a distinct font/HUD concern (findings §7) and there is no HUD infrastructure yet; rb2-5 already deferred a richer heat gauge to rb2-12 for the same reason
  - Severity: minor
  - Forward impact: a later HUD story renders the accumulated score/lives; rb2-6 leaves a running score value for it to display

### Dev (implementation)
- **PLVALU implemented as `DRONE_SCORE + max(0, P_INDP − depth) × VALFRC`**
  - Spec source: docs/red-baron-1980-source-findings.md §4; TEA Design Deviation ("closer = more, monotone in depth")
  - Spec text: "`PLVALU = depth × VALFRC` (score fraction, starts 7/10) — closer kills are worth more"
  - Implementation: the far/dim lead meets the flat `DRONE_SCORE` (300) floor; each unit of depth CLOSED below `P_INDP` (imported from enemy.ts) adds `VALFRC`(0.7)-scaled points, rounded — so a 400-depth kill = 776, a 140-depth kill = 958, a 1080-depth (far) kill = 300
  - Rationale: satisfies TEA's monotone-decreasing-in-depth invariant with a formula anchored to real ROM constants (the far spawn depth and the flat drone floor), rather than the literal `depth × VALFRC` that reads backwards under our depth convention
  - Severity: minor
  - Forward impact: the exact score magnitudes are inferred tuning (VALFRC scale, DRONE_SCORE floor) — ratify against MAME/playtest (rb2-12); the ORDERING is ROM-pinned and test-gated
- **Minimal on-screen SCORE readout added (TEA scoped display OUT)**
  - Spec source: TEA Design Deviation #4 ("Score DISPLAY out of the RED contract")
  - Spec text: TEA pinned the scoring LOGIC + that main.ts CALLS scoreKill, but "NOT an on-screen score readout"
  - Implementation: main.ts draws a minimal `SCORE {n}` in the existing monospace/glow style (like the rb2-5 "GUNS HOT" cue)
  - Rationale: `noUnusedLocals` requires the running `score` to be consumed, and the self-review "wired to front end" wants the kill payoff visible; a text readout is the minimal consumption. The authentic ROM glyph HUD (VGAN/RBCHAR, findings §7) remains deferred to a future HUD story
  - Severity: minor
  - Forward impact: the HUD story replaces the placeholder text with the ROM score-glyph render; no logic depends on the placeholder
- **Debris burst render: 4 fixed diagonal directions × DEBRIS_SPREAD/frame**
  - Spec source: session story title ("debris via PIECE0-3"); TEA Design Deviation #3 (debris kinematics unpinned)
  - Spec text: "EXPL1/EXPL2 debris via PIECE0-3"
  - Implementation: during 'exploding', main.ts draws the four `EXPLOSION_PIECES` (via the shared `renderModel`, since a topology `VectorPicture` is structurally a `BiplaneModel`), each translated out along a distinct diagonal by `(EXPL2_FRAMES − timer) × DEBRIS_SPREAD` so the burst expands
  - Rationale: gives a visible, expanding PIECE0-3 burst from the real ROM geometry without fabricating ROM-unpinned per-fragment velocities; the directions/spread are inferred tunables (like enemy.ts's WEAVE_SPEED_CAP)
  - Severity: minor
  - Forward impact: debris scatter is pure render tuning within the EXPL2 window; not test-gated, ratify by playtest

### Reviewer (audit)
- **TEA: PLVALU pinned as "closer = more" (monotone in depth), not the literal formula** → ✓ ACCEPTED by Reviewer: correct Spec-Authority reasoning — the literal `depth × VALFRC` reads backwards under enemy.ts's depth convention; pinning the doc's explicit English behaviour is right, and the monotone test detects the mechanism's removal.
- **TEA: `scoreKill` covers `'drone'`/`'blimp'` though rb2-6 kills only the lead** → ✓ ACCEPTED by Reviewer: the flat 300/200 are byte-pinned in the same findings paragraph as PLVALU; a forward-ready exhaustive union is sound and exercises rule #3.
- **TEA: debris pinned by count + phase window, not per-fragment kinematics** → ✓ ACCEPTED by Reviewer: the ROM pins geometry + timers but not fragment velocities; refusing to fabricate them is correct, and DEBRIS_COUNT is tied to `EXPLOSION_PIECES.length` so it can't drift.
- **TEA: score DISPLAY out of the RED contract** → ✓ ACCEPTED by Reviewer: consistent with the deferred ROM glyph HUD (findings §7); superseded in practice by Dev's minimal readout (audited below).
- **Dev: PLVALU implemented as `DRONE_SCORE + max(0, P_INDP − depth) × VALFRC`** → ✓ ACCEPTED by Reviewer: honours TEA's monotone invariant with a formula anchored to real ROM constants (far spawn depth + flat drone floor); magnitudes are flagged inferred and correctly ratified-by-playtest. *(Caveat, not a rejection: the non-finite-depth NaN gap is logged as a LOW Delivery Finding — the deviation itself is sound.)*
- **Dev: minimal on-screen SCORE readout added (TEA scoped display OUT)** → ✓ ACCEPTED by Reviewer: forced by `noUnusedLocals` on the running score + the "wired to front end" self-review; the text placeholder is the minimal consumption and the authentic ROM glyph HUD stays deferred — a reasonable, well-documented resolution of TEA's open scope question.
- **Dev: debris burst render — 4 fixed diagonal directions × DEBRIS_SPREAD/frame** → ✓ ACCEPTED by Reviewer: renders a visible expanding burst from the real PIECE0-3 geometry (I verified the connect indices are in bounds) without fabricating ROM-unpinned velocities; directions/spread are flagged inferred.
- No UNDOCUMENTED deviations found — every spec divergence in the diff was logged by TEA or Dev.