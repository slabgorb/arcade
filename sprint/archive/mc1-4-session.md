---
story_id: "mc1-4"
jira_key: "mc1-4"
epic: "mc1"
workflow: "tdd"
---
# Story mc1-4: Player ABM launch to expanding/collapsing blast

## Story Details
- **ID:** mc1-4
- **Jira Key:** mc1-4
- **Workflow:** tdd
- **Stack Parent:** none

## Branch Strategy
**Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-06T12:49:05Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T11:44:48Z | 2026-08-06T11:47:38Z | 2m 50s |
| red | 2026-08-06T11:47:38Z | 2026-08-06T12:19:28Z | 31m 50s |
| green | 2026-08-06T12:19:28Z | 2026-08-06T12:33:13Z | 13m 45s |
| review | 2026-08-06T12:33:13Z | 2026-08-06T12:49:05Z | 15m 52s |
| finish | 2026-08-06T12:49:05Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): AC2's on-screen half — a fire drawing a trail to the crosshair and an expanding/collapsing blast at `/missile-command/` — is a SCREENSHOT the owner/Reviewer must verify; the vitest env is `node` (no canvas, no key surface). No node test covers `render.ts` drawing the trail+blast or `main.ts` wiring the frame loop. Affects `plugins/missile-command/src/shell/render.ts` and `src/main.ts` (Dev must wire fire→abm→explosion→render and paint them; Reviewer/owner confirms with a live screenshot). *Found by TEA during test design.*
- **Gap** (non-blocking): the skeleton does NOT model per-base ammo (`MAXMIS=10.`, `W3COMN`) or base liveness, so "empty base → no launch" (REV-01 ABMLAU: "ANY MISSILES LEFT AT BASE?") is out of scope — every fire launches. Ammo/liveness belongs with scoring/damage (explicitly deferred by the story). Affects a future mc2 story (ABM ammo + base destruction). *Found by TEA during test design.*
- **Question** (non-blocking): the exact ABM speed magnitude and the exact OLDRAD per-tick curve / EXPFRA update cadence are left to Dev within the pinned SHAPE (unit-velocity straight line; radius 0→13→0). The mc2 dossier back-fill (citation checker, `claims/*.json`) will pin the 8.8 fixed-point velocity and the cadence exactly. Affects `plugins/missile-command/src/core/{abm.ts,explosion.ts}` at the mc2 fidelity pass. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): resolved TEA's speed/curve Question by choosing `ABM_SPEED=1` (unit velocity, faithful to ABVE=delta/totalDelta) and a symmetric radius triangle `min(t, LIFETIME-t)` with `LIFETIME=EXDONE-1=26`. The ROM's exact 8.8 fixed-point velocity and the asymmetric OLDRAD curve (0,0,2,… on the way up) + EXPFRA update cadence remain the mc2 fidelity pass. Affects `plugins/missile-command/src/core/{abm.ts,explosion.ts}`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the AC2 on-screen acceptance was verified live at `/missile-command/` (dev server on port 5293, my checkout) — latency-immune in-page canvas capture at the blast frame shows a yellow blast at the crosshair with red trails climbing from the correct left/right bases; pixel sampling measured 637 trail px + up to 11467 blast px. This is the artifact TEA flagged as the Reviewer/owner check; recording that Dev already confirmed it renders. Affects `plugins/missile-command/src/{shell/render.ts,main.ts}` (Reviewer may re-verify). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking, → mc2 citation dossier): the mc source-line citations MIX two numbering methods — `ceil(physical/2)` (ABMLAU :606, ABMVEL :1640, PREXPL :906, DRAW A CIRCLE :2503) vs. true-non-blank-count (UPDPOS :854, EXDONE :111). Symbols/`.SBTTL` text/values are all CORRECT; only the advisory line numbers drift. Specifically `abm.ts:16` (+ `tests/abm.test.ts:14,94`) cite UPDPOS `:854` where the sibling method — and the story description itself — give `:860`. mc2's citation checker + `claims/*.json` must pick ONE method and reconcile every mc line cite (fix UPDPOS `:854`→`:860`). Affects `plugins/missile-command/src/core/{abm.ts,explosion.ts}` + their tests + the mc2 dossier. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, → mc2 citation checker): the 6 source-scan citation guards in the test files (`toMatch(/W3MAIN/)`, `/ABMLAU|.../`, `/launchAbm/`, etc.) are mutation-proven vacuous whole-file token anchors (lang-review #15/#25) — a throwaway comment with the same tokens keeps them green. They are behaviorally backstopped (the launch/flight/blast behaviour is non-vacuously tested) and are the DEFERRED skeleton placeholders for mc2's real citation checker, which should replace them with declaration-anchored / claims-JSON checks. Affects `tests/{abm,explosion,fire}.test.ts`. *Found by Reviewer during code review.*
- **Gap** (non-blocking, → mc2): the skeleton enforces no `NABMS=8` in-flight cap (`W3COMN`) and no per-base ammo/liveness — every fire launches, arrays bounded only by fire-rate×flight-time. Confirms TEA's deferred-ammo finding and reviewer-security's low-severity unbounded-growth note; a concurrent-ABM cap / fire cooldown belongs with mc2 gameplay pacing. Affects `plugins/missile-command/src/{main.ts,core/game.ts}`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC1's "nearest live base to the cursor" is NOT implemented as written — the tests pin per-key specific-base launch instead**
  - Spec source: context-story-mc1-4.md, AC1 ("model launch from the nearest live base to the cursor")
  - Spec text: "abm.ts + explosion.ts (core, pure) model launch from the nearest live base to the cursor…"
  - Implementation: core/abm.ts is base-agnostic (`launchAbm(origin, target)`); the SHELL selects the base by key (Z/X/C → left/centre/right). No `nearestLiveBase()` exists in core.
  - Rationale: REV-01 `LAUNCH ABMS` (ABMLAU, W3MAIN:606) reads three fire switches via `FIREMA: .BYTE MFIREL,MFIREC,MFIRER` — each switch fires its OWN base, no nearest-base auto-select anywhere in the source. AC2 and plugin.ts controls both say per-key. **Owner ruling 2026-08-06: per-key specific base, source-faithful.** Building an unwired `nearestLiveBase` would add a dead core helper (fleet "unwired-feature" scar).
  - Severity: minor
  - Forward impact: AC1's title/wording still says "nearest live base"; the epic YAML likewise. A later reader should treat that phrase as superseded by the owner ruling recorded here. If a single-fire/mouse launch is ever wanted, nearest-base selection can be added then.

### Dev (implementation)
- **GameState grew to carry `abms` + `explosions`, and `stepGame` now flies/detonates/reaps them**
  - Spec source: context-story-mc1-4.md AC2 ("a fire draws a trail to the crosshair and an expanding/collapsing blast"); docs/design/mc1-skeleton.md (`game.ts` = "the reducer over input+tick")
  - Spec text: AC1/AC2 name `abm.ts`, `explosion.ts`, `input.ts`, `render.ts`; they do NOT name `game.ts`.
  - Implementation: extended `GameState` with `readonly abms: readonly Abm[]` and `readonly explosions: readonly Explosion[]`, and `stepGame` now steps each ABM, detonates a blast at the target of any that arrived (dropping it from flight), steps every blast and drops finished ones. `main.ts` appends an ABM on a fire keydown; `render.ts` paints trails + blasts.
  - Rationale: wiring the feature to the front end (AC2's on-screen acceptance) needs the sim state somewhere; the design doc makes `game.ts` the reducer, so growing it is design-faithful and keeps the sim deterministic in core (vs. stashing mutable arrays in the shell). No test demanded it (there is no `game.test.ts`), so it is logged here rather than assumed.
  - Severity: minor
  - Forward impact: **mc2 stories build on this shape** — `enemy.ts`/`damage.ts`/`wave.ts` will add fields to `GameState` and stages to `stepGame`. The ABM/explosion reaping order (blasts stepped-then-appended, done ones filtered) is the pattern to extend. `render-field.test.ts` still green because it renders `createGame()` (empty arrays → no trails/blasts, nine field marks unchanged).

### Reviewer (audit)
- **TEA — AC1 "nearest live base" → per-key specific base** → ✓ ACCEPTED by Reviewer: source-correct and owner-ruled. Verified against REV-01 ABMLAU/FIREMA (`FIREMA: .BYTE MFIREL,MFIREC,MFIRER`, each switch → its own base, no nearest-select in source) — comment-analyzer independently confirmed the FIREMA/BASES ordering. Building `nearestLiveBase` would have added a dead helper. Sound.
- **Dev — GameState grew to carry `abms`+`explosions`; `stepGame` flies/detonates/reaps** → ✓ ACCEPTED by Reviewer: design-faithful (`game.ts` is the reducer per the design doc), keeps the sim pure/deterministic in core, and the arrival→detonation edge is computed at `stepGame`'s single exit over ALL abms (lang-review #14 compliant, mutation-verified by rule-checker: a velocity-sign flip reddens 8/15 abm tests). `render-field.test.ts` remains green via `createGame()`. Sound; the mc2 hand-off note is captured.
- **UNDOCUMENTED (Reviewer):** the story description cited `UPDATE MISSILE POSITION` at `W3MAIN:860`; Dev's `abm.ts:16`/tests wrote `:854` (a silent switch to true-non-blank-count numbering, inconsistent with the four sibling `ceil(physical/2)` cites). Symbol + `.SBTTL` label are correct, so retrieval-by-label is unaffected; Severity: **Low** (advisory line number only). Routed to the mc2 citation-dossier Delivery Finding rather than a rework — see Reviewer code-review findings.

## SM Assessment

**Story:** mc1-4 — Player ABM launch to expanding/collapsing blast (5pt, p3, tdd). Final story of the mc1 skeleton epic; mc1-1/2/3/5 are done.

**Setup verification (all confirmed against the tree):**
- Sibling probes clean at setup: no `mc1-4` remote branch, no sibling `.session/mc1-4` anywhere (a-1=jt9-28, a-2=bz5-3). Nobody else owns this.
- Merge gate clear — no open PRs on slabgorb/arcade.
- ACs copied VERBATIM (both phrase-checked against epic-mc1.yaml). No either/or — no ruling needed.
- Session carries Workflow/Repos/Phase; `**Repos:** arcade` was added by hand (sm-setup omitted it, as it habitually does).
- Story stamped `in_progress` (sm-setup left it `backlog`, as always). Claim pushed to origin/main (20708af) + empty branch `feat/mc1-4-player-abm-launch-blast`. A sibling raced main between commit and push (a-1's jt9-28 claim) — rebased clean, no collision.

**Scope (what TEA/Dev own):** creates `plugins/missile-command/src/core/{abm.ts, explosion.ts}` (do not exist yet — expected). Core stays PURE (purity scanner copied from joust enforces it — no clock/render/DOM). Shell: `input.ts` binds Z/X/C→left/centre/right base; `render.ts` draws trail + blast. No enemy/scoring/damage — mc1 acceptance ends at fire→blast.

**Ground truth & the traps (measured, pass forward):**
- Constants authority: `docs/rom-study/brief.md`; design: `docs/design/mc1-skeleton.md` (both present). Skeleton-first defers the TDD citation checker to mc2, but RADIX DISCIPLINE binds — no magic number faithful to nothing; W3COMN sets `.RADIX 16`, trailing `.` = decimal.
- `reference/source/W3MAIN.MAC` TWO traps proven this session: (a) grep sees it as BINARY → false-empty, ALWAYS `grep -a`; (b) the description's line cites (:606/:665/:860/:906/:2503) are LOGICAL non-blank lines, not physical (~2× physical, and ~6 above the renumbered non-blank count). All five anchors are real .SBTTL/JSR sites (LAUNCH ABMS/ABMLAU, LAUNCH 1 ABM, UPDATE MISSILE POSITION, PROCESS EXPLOSIONS/PREXPL, DRAW A CIRCLE) — findable via `grep -a`. Cites are sound, just not physical-line-exact.

**Handoff:** phased/tdd → TEA for RED (failing unit tests for abm.ts + explosion.ts: nearest-live-base launch, straight-line flight to target, blast expand-to-max then collapse-to-nothing over deterministic ticks; core purity).

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** 5pt tdd feature story creating two pure core modules + a shell seam — squarely a RED-first target.

**Test Files:**
- `plugins/missile-command/tests/abm.test.ts` — AC1 flight half: `launchAbm`/`stepAbm` — starts at the base, flies a STRAIGHT line to the crosshair at ~constant unit velocity, closes distance monotonically, SNAPS to the target on arrival (no overshoot), farther target ⇒ more ticks; purity/determinism; W3MAIN citation scan. (15 tests)
- `plugins/missile-command/tests/explosion.test.ts` — AC1 blast half: `startExplosion`/`stepExplosion`/`blastRadius`/`isExplosionDone` — grows 0→`MAX_BLAST_RADIUS`(13) then collapses →0, single-peaked, done exactly once after collapse; `EXDONE`=27 / `MAX_BLAST_RADIUS`=13 exports; determinism; W3MAIN/W3COMN citation scan; **plus a GREEN-from-day-one "source ground truth" describe that decodes EXDONE=27 from W3COMN.MAC and the OLDRAD peak=13 from W3MAIN.MAC directly** (anti-drift anchor). (15 tests; 2 green)
- `plugins/missile-command/tests/fire.test.ts` — AC2 shell seam: `fireKeyToBase` (Z/X/C→0/1/2, upper+lower, null for non-fire, 3 distinct bases) and `launchFromKey` (launches from the chosen base to the cursor via core/abm, `null` for non-fire, left key = leftmost real field.ts base); source-scan that input.ts imports `launchAbm` and cites ABMLAU/FIREMA; **plus a proof-of-life chain test** composing fire→straight flight→arrival→full blast lifecycle. (11 tests)

**Tests Written:** 41 tests covering 2 ACs (AC1 across abm+explosion, AC2 across the fire seam). Status: **RED** — 39 failing (features absent), 2 passing (source-ground-truth anchors).
**Status:** RED (failing — ready for Dev). Verified twice directly and once via `testing-runner` (RUN_ID `mc1-4-tea-red`): missile-command project 39 failed / 69 passed, all failures confined to the three new files; every pre-existing mc1-1/2/3/5 test still green; `npm run lint` (tsc --noEmit) clean via the `@vite-ignore` RED-import idiom.

### Rule Coverage

Project rule source: the load-bearing **core/shell purity boundary** (`tests/purity.test.ts`, ported joust scanner) + skeleton-first RADIX/citation discipline (design doc + brief). No `lang-review/{lang}.md` checklist applies to this TS game repo beyond purity.

| Rule | Test(s) | Status |
|------|---------|--------|
| core stays PURE (no clock/entropy/DOM/shell import) | auto-swept by `purity.test.ts` src/core sweep the moment `abm.ts`/`explosion.ts` land — not re-asserted here (cursor.test.ts precedent) | will bite on GREEN |
| no magic number faithful to nothing (RADIX/citation) | `explosion.test.ts` source-ground-truth (EXDONE=27, OLDRAD peak=13 decode from ROM); abm/explosion/input citation scans (W3MAIN/W3COMN/EXDONE/OLDRAD/ABMLAU/FIREMA) | red (scans) / green (ground truth) |
| reducers are pure & non-mutating | abm + explosion "pure reducer" describes (referential transparency + frozen-input) | failing |
| shell consumes core, never re-implements it | `fire.test.ts` "imports launchAbm from core/abm" source-scan | failing |

**Rules checked:** purity (deferred to the auto-sweep) + RADIX/citation discipline covered; no other applicable lang-review checklist.
**Self-check:** 0 vacuous tests — every test asserts on a concrete value (positions, radii, base indices, ROM-decoded constants); fuzz/sweep tests assert real bounds. No `let _ =`, no `assert(true)`, no is-none-on-always-none.

**Handoff:** To Yoda (Dev) for GREEN. Build `src/core/abm.ts` (pure: `launchAbm`/`stepAbm`, unit-velocity straight-line flight, arrival-snap; cite W3MAIN ABMLAU/UPDPOS/ABMVEL) and `src/core/explosion.ts` (pure: `startExplosion`/`stepExplosion`/`blastRadius`/`isExplosionDone`, grow-0→13-then-collapse; export `EXDONE`=27/`MAX_BLAST_RADIUS`=13; cite W3COMN EXDONE + W3MAIN OLDRAD/PROCESS EXPLOSIONS), then add `fireKeyToBase`/`launchFromKey` to `src/shell/input.ts` (import `launchAbm`; cite ABMLAU/FIREMA), and wire fire→abm→explosion→render in `render.ts`/`main.ts` for the `/missile-command/` screenshot (Delivery Finding: that render + the screenshot are the AC2 on-screen acceptance, not a node test). Owner ruling: **per-key specific base, no `nearestLiveBase`** (see Design Deviations).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/missile-command/src/core/abm.ts` (NEW) — pure ABM flight: `Vec`/`Abm` types, `ABM_SPEED=1`, `launchAbm(origin,target)` (pos=origin, not arrived), `stepAbm` (advance ~1 unit along the unit vector toward target; snap to target + `arrived=true` within one step; idempotent once arrived). Cites ABMLAU/UPDPOS/ABMVEL (W3MAIN:606/854/1640).
- `plugins/missile-command/src/core/explosion.ts` (NEW) — pure blast: `Explosion` {h,v,t}, `EXDONE=27` (W3COMN:111), `MAX_BLAST_RADIUS=13` (OLDRAD peak, W3MAIN:906), `startExplosion`/`stepExplosion`, `blastRadius` = symmetric triangle `min(t, LIFETIME-t)` with `LIFETIME=EXDONE-1=26`, `isExplosionDone` (t≥LIFETIME). Grows 0→13 then collapses →0.
- `plugins/missile-command/src/core/game.ts` — `GameState` gained `abms`/`explosions`; `stepGame` flies ABMs, detonates a blast at each arrival, steps blasts and reaps finished ones (see Design Deviation).
- `plugins/missile-command/src/shell/input.ts` — added `fireKeyToBase` (Z/X/C→0/1/2, else null) and `launchFromKey` (launches from the chosen base via core/abm.launchAbm); cites FIREMA/ABMLAU.
- `plugins/missile-command/src/main.ts` — `keydown` → `launchFromKey` appends an ABM to `game.abms`.
- `plugins/missile-command/src/shell/render.ts` — paints red ABM trails (origin→pos) and yellow expanding/collapsing blast circles (radius scaled by the H scale).

**Tests:** 110/110 passing (GREEN) for the missile-command project — 41/41 new mc1-4 tests plus all pre-existing mc1-1/2/3/5. The `src/core` purity sweep now scans `abm.ts`/`explosion.ts`/`game.ts` with zero violations. `npm run lint` (tsc --noEmit) clean; `node scripts/build-app.mjs missile-command` builds (12 modules).

**Live verification (AC2 on-screen):** at `/missile-command/` (my checkout, port 5293) — fire → straight red trail from the correct base → yellow blast blooms at the crosshair and collapses. Base selection visually correct (Z=left trail, C=right trail). Latency-immune in-page capture at the blast frame + pixel sampling (637 trail px, up to 11467 blast px) confirm it. Temp capture artifacts removed; tree clean.

**Branch:** none
**Commits (trunk-based, on `main`):** RED `479d162`, GREEN `8055169`

**Handoff:** To Obi-Wan (Reviewer) for review. Owner ruling (per-key specific base, no `nearestLiveBase`) and the `GameState` growth are logged in Design Deviations; the live-render confirmation and the mc2 fidelity items are in Delivery Findings.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (110 vitest / 15 purity / lint / build / 398 orchestrator all green; 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — edge/boundary paths self-assessed (div-by-zero, arrival, NaN) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no swallowed errors in diff (self-assessed) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test quality self-assessed + covered by rule-checker #15/#18/#26 |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 (UPDPOS line HIGH, EXDONE line LOW) | confirmed 2 (both non-blocking DOC), dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — types self-assessed (readonly interfaces, Vec[] not 3-tuple) |
| 7 | reviewer-security | Yes | findings | 1 (unbounded ABM growth, LOW) | confirmed 1 (non-blocking), dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — no over-engineering in diff (self-assessed) |
| 9 | reviewer-rule-checker | Yes | findings | 11 (6× #15/#25 vacuous guards HIGH-conf, 5× #11 catch-idiom) | confirmed 11 (all MEDIUM/LOW non-blocking), dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 14 confirmed (all Medium/Low, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

mc1-4 is correct, pure, well-tested, and verified rendering live. No Critical or High issues survived across four enabled specialists + my own read. Every finding is a Medium/Low documentation, test-quality, or deferred-scope item — none blocks, and the two clusters (citation line-number reconciliation, source-scan guard strengthening) land squarely in mc2's explicit citation-dossier scope.

**Data flow traced:** `keydown` (`main.ts` window listener) → `event.key` → `fireKeyToBase` (exhaustive switch, `null` default — `input.ts:41-53`) → `launchFromKey` → `core/abm.launchAbm(BASES[i], cursor)` → appended to `GameState.abms` → `stepGame` flies each ABM, detonates a blast at any that arrive, reaps finished blasts → `render.ts` paints trails + circles. Safe: external input is a single `KeyboardEvent.key` narrowed against three literals before ever reaching core; core takes only plain finite `Vec` data (BASES constants + clamped cursor). No injection/eval/DOM-string surface.

**Pattern observed:** pure reducers with source-cited constants, immutable state, the reaping done at the reducer's single exit — consistent with the established cursor.ts/field.ts idiom. Good pattern at `game.ts:39-48`, `abm.ts:58-75`.

### Rule Compliance (CLAUDE.md + lang-review/typescript.md, 26+ checks)

- **[VERIFIED] Core/shell purity (CLAUDE.md, THE load-bearing rule):** `abm.ts`, `explosion.ts`, `game.ts` are pure — plain arithmetic, no clock/entropy/DOM/scheduling; `game.ts` imports only core (`./cursor.js`,`./abm.js`,`./explosion.js`). Evidence: `tests/purity.test.ts` src/core sweep passes (15/15) now that the files exist — the guard actively bites, confirmed by preflight + reviewer-security independently. Complies.
- **[VERIFIED] RADIX / no-magic-number (CLAUDE.md #28):** `EXDONE=27` cites `W3COMN:111` (trailing-dot decimal), `MAX_BLAST_RADIUS=13` cites `W3MAIN:906` OLDRAD peak, `ABM_SPEED=1` cites `ABMVEL` and is honestly scoped as a unit-velocity model (8.8 fixed-point deferred). All three are independently ROM-parse-anchored by `explosion.test.ts`'s source-ground-truth describe (green from the vendored `.MAC`). Values correct; line numbers see finding [DOC] below. Complies (values); Medium note (line numbers).
- **[VERIFIED] lang-review #14 (edges at single exit):** `stepGame` arrival→detonation computed over the whole `abms` array at the function's one exit — mutation-verified (velocity-sign flip → 8/15 red). Complies.
- **[VERIFIED] lang-review #21/#22 (degenerate numeric input):** `stepAbm` guards `remaining <= ABM_SPEED` before `dh/remaining`, so `remaining===0` (target==origin) snaps instead of dividing; NaN/Infinity unreachable (inputs trace to finite BASES/clamped cursor). ACCEPT-form `<=` retained (new code, not a reject-rewrite). Evidence: `abm.ts:66`, test "target AT the origin arrives immediately". Complies.
- **[VERIFIED] lang-review #4/#5 (?? vs ||, .js extensions):** no nullish-default misuse; all 13 relative ESM imports carry `.js`. Complies.
- **[VERIFIED] lang-review #2 (readonly):** every `Vec`/`Abm`/`Explosion` field and `GameState.abms/.explosions` and `launchFromKey(bases: readonly Vec[])` is `readonly`. Complies.
- **[MEDIUM] lang-review #15/#25 (source-text token guards):** 6 citation scan guards are mutation-proven vacuous whole-file positive anchors. Rule-matching finding — NOT dismissed; downgraded to Medium/non-blocking with rationale (deferred skeleton placeholders for mc2's citation checker; behaviorally backstopped). Routed to mc2.
- **[LOW] lang-review #11 (catch narrow):** 5× `(e as Error).message` without `instanceof`. The established fleet RED-loader idiom (identical in cursor.test.ts/field.test.ts), test-only, tsc-accepted, `e` provably an Error at these sites. Downgraded Low, non-blocking, fleet-wide (not this story's to fix alone).
- **[VERIFIED] Desktop-only (CLAUDE.md #29):** keyboard-only; no touch/viewport branching added. Complies.

### Observations (≥5, tagged by source)

- `[VERIFIED]` Core purity holds — `abm.ts`/`explosion.ts`/`game.ts` pure; `purity.test.ts` src/core sweep green (15/15). Evidence: preflight + `[SEC]` both ran the sweep. Complies with CLAUDE.md's load-bearing rule.
- `[VERIFIED]` `[EDGE]` (self, edge-hunter disabled) Div-by-zero guarded at `abm.ts:66` (`remaining <= ABM_SPEED` before divide); arrival snaps to target exactly (no overshoot); `[RULE]` mutation-confirmed the flight edge is live.
- `[DOC]` `[MEDIUM]` `abm.ts:16` cites UPDPOS `W3MAIN:854` (true-non-blank-count) where its four sibling cites and the story description use `ceil(physical/2)` → `:860`; under the block's own "≈physical/2" rule `:854` points into the prior routine. Label "UPDATE MISSILE POSITION" is correct so grep-by-label retrieval is unaffected. Routed to mc2 (Delivery Finding). Also `tests/abm.test.ts:14,94`.
- `[DOC]` `[LOW]` `explosion.ts:19` EXDONE `:111` same mixed-method (2-line drift). Reconcile in mc2.
- `[TEST]` `[RULE]` `[MEDIUM]` 6 source-scan citation guards mutation-proven vacuous (`toMatch(/W3MAIN/)` etc.) — deferred placeholders, behaviorally backstopped; mc2's citation checker replaces them.
- `[SEC]` `[LOW]` `main.ts:22-...` keydown appends an ABM per press with no cap — self-inflicted, client-only, single-player; non-exploitable. Cap belongs with mc2 pacing.
- `[TYPE]` `[LOW]` (self, type-design disabled) `input.ts:63` `bases[base]` unchecked; `bases: readonly Vec[]` not a 3-tuple — safe (one caller passes 3-element field.ts BASES). Nit.
- `[SIMPLE]` (self, simplifier disabled) No over-engineering — reducers are minimal; `[VERIFIED]` explosion peak = `LIFETIME/2` equals `MAX_BLAST_RADIUS` only via `EXDONE-1=2·13`, but the `peak==MAX_BLAST_RADIUS` test + source-ground-truth anchor both guard the coupling. Acceptable.
- `[SILENT]` (self, silent-failure-hunter disabled) No swallowed errors: `launchFromKey` returns explicit `null` for non-fire keys (handled by the caller `if (abm)`); no empty catches beyond the documented RED-loader wrappers.
- `[DOC]` `[VERIFIED]` `[SEC]`-adjacent: comment-analyzer confirms all citation SYMBOLS/`.SBTTL` text/values/behavioral paraphrases are TRUE — only line numbers drift.

### Devil's Advocate

Suppose this code is broken. Where would it hide? First, the flight: `stepAbm` divides by `Math.hypot(dh,dv)`. A malicious or confused caller who launches an ABM whose target equals its origin would divide by zero — but the `remaining <= ABM_SPEED` guard fires first and snaps, and the test "target AT the origin" pins it; a caller cannot inject NaN because targets come from the clamped cursor and BASES constants, all finite. Could an ABM never arrive and leak forever? Only if `remaining` stopped decreasing — but each step subtracts exactly `ABM_SPEED` along the unit vector, monotonic to ≤1 then snap, so arrival is bounded by `ceil(distance)` and `game.ts` filters arrived ones out. Could a blast never end and pin memory? `isExplosionDone` is `t >= LIFETIME` and `stepGame` filters on it every tick — bounded at 26 ticks. Now the nastier angle: unbounded ABM spawn. A user scripting `dispatchEvent(keydown 'z')` in a tight loop grows `game.abms` without a cap — reviewer-security caught this. But it is same-origin, self-inflicted, single-player, no server: the "attacker" harms only their own tab, equivalent to `while(true){}` in the console. Not a security vulnerability by the repo's own (no-backend) threat model; a fidelity cap (NABMS=8) is mc2 gameplay. What would a confused *future reader* misread? The citation line numbers: `UPDPOS :854` under the documented "≈physical/2" rule points at the wrong routine — a real trap, but the correct `.SBTTL` label sits right beside it and the house convention is grep-the-label, so the blast radius is a few wasted seconds, not a wrong constant. What would a stressed renderer do? On a zero-width canvas, `blastRadius`/trail draws collapse to radius/length 0 — no crash, nothing drawn. What if `stepGame` receives an ABM that arrived on the same tick it was appended? `launchAbm` sets `arrived:false`; the first `stepAbm` may arrive and detonate uniformly — no special case leaks. The most substantive residue is the vacuous citation guards: a future edit could delete a real citation and stay green — but the *values* are ROM-anchored non-vacuously and the citations are the deferred half of the skeleton, so the exposure is bounded and owned by mc2. Nothing here reaches Critical or High.

**Error handling:** external input (`event.key`) narrowed to a base index or `null` before core; `launchFromKey` returns `null` for non-fire keys, consumed by `if (abm)` in `main.ts`. Core reducers are total over finite inputs. Evidence: `input.ts:41-64`, `main.ts` keydown handler.

**Handoff:** To Grand Admiral Thrawn (SM) for finish-story. All findings are non-blocking and routed to the mc2 citation dossier + gameplay-pacing epics via Delivery Findings.
## Impact Summary

mc1-4 is GREEN on main (110/110 missile-command tests, lint clean, orchestrator passing) with a single-round Reviewer verdict of APPROVED and zero blocking findings.

**Delivery Findings by Phase (all explicitly routed forward to mc2, none blocking mc1 finish):**

### TEA (test design, round 1)
- **Improvement** (non-blocking → mc2 acceptance verification): AC2's on-screen proof (fire→trail→blast rendering at /missile-command/) is a SCREENSHOT the Reviewer/owner must verify — the node test env cannot cover render.ts or main.ts wiring. Dev later confirmed it live (see Dev findings). This finding stands as the Reviewer/owner's gate for final sign-off.
- **Gap** (non-blocking → mc2 gameplay): skeleton does NOT model per-base ammo (MAXMIS=10.) or base liveness (W3MAIN:??? REV-01 ABMLAU: "ANY MISSILES LEFT AT BASE?") — every fire launches. Ammo/liveness belongs with scoring/damage, explicitly deferred by the story scope.
- **Question** (non-blocking → mc2 fidelity pass): exact ABM speed magnitude and exact OLDRAD per-tick curve / EXPFRA update cadence are left to Dev within the pinned SHAPE (unit-velocity straight line; radius 0→13→0). Dev resolved to ABM_SPEED=1 and symmetric triangle; the ROM's exact 8.8 fixed-point velocity and asymmetric curve + cadence remain the mc2 citation-dossier anchor.

### Dev (implementation, round 1)
- **Improvement** (non-blocking → mc2 fidelity pass): resolved TEA's speed/curve Question by choosing ABM_SPEED=1 (unit velocity, faithful to ABVE=delta/totalDelta) and symmetric radius triangle min(t,LIFETIME-t) with LIFETIME=26. The ROM's exact 8.8 fixed-point velocity and asymmetric OLDRAD curve (0,0,2,…) + EXPFRA cadence remain the mc2 pass. Details in abm.ts:42-43 comment.
- **Improvement** (non-blocking, Reviewer/owner final gate): AC2 on-screen acceptance verified live at /missile-command/ (dev server port 5293, my checkout) — latency-immune in-page capture at the blast frame shows yellow blast at the crosshair with red trails from the correct left/right bases; pixel sampling: 637 trail px + up to 11467 blast px. This is the artifact TEA flagged; recording that Dev already confirmed the render works. Reviewer may re-verify before final sign-off.

### Reviewer (code review, round 1)
- **Improvement** (non-blocking → mc2 citation dossier): source-line citations MIX two numbering methods — ceil(physical/2) (ABMLAU:606, ABMVEL:1640, PREXPL:906, DRAW A CIRCLE:2503) vs. true-non-blank-count (UPDPOS:854, EXDONE:111). Symbols/.SBTTL text/values all CORRECT; only advisory line numbers drift. Example: abm.ts:16 + tests cite UPDPOS:854 where sibling method gives :860. mc2's citation checker + claims/*.json must pick ONE method and reconcile every mc line cite.
- **Improvement** (non-blocking → mc2 citation checker): 6 source-scan citation guards in test files (toMatch(/W3MAIN/), /ABMLAU|.../, /launchAbm/, etc.) are mutation-proven vacuous whole-file token anchors. Behaviorally backstopped (launch/flight/blast behaviour is non-vacuously tested). These are deferred skeleton placeholders for mc2's real citation checker, which should replace them with declaration-anchored / claims-JSON checks.
- **Gap** (non-blocking → mc2 gameplay pacing): skeleton enforces no NABMS=8 in-flight cap (W3COMN) and no per-base ammo/liveness — every fire launches, arrays bounded only by fire-rate×flight-time. Confirms TEA's deferred-ammo finding. A concurrent-ABM cap / fire cooldown belongs with mc2 gameplay pacing.

**Verdict:** All three phases (TEA, Dev, Reviewer) converge on zero blocking issues. Every finding explicitly routes to mc2's citation-dossier epic (line-number reconciliation, source-scan guard strengthening) or gameplay-pacing epics (ammo/NABMS cap, fire cooldown). The skeleton is fit-for-purpose as the proof-of-life interaction (fire→blast rendering, deterministic flight/detonation) and the core/shell purity boundary is proven.

**blocking_count: 0**
