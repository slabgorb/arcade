---
story_id: "sw10-3"
jira_key: "sw10-3"
epic: "sw10"
workflow: "tdd"
---
# Story sw10-3: Migrate the trench phase to the ROM-native world basis — sim scroll/collision index+sign flips, channel/detail/obstacle/wedge generators to native output, and trench-furniture model bakes (sw10-1 AC#2 remaining phase)

## Story Details
- **ID:** sw10-3
- **Jira Key:** sw10-3
- **Workflow:** tdd
- **Stack Parent:** sw10-1
- **Assignee:** slabgorb
- **Branch:** feat/sw10-3-trench-native-basis
- **PR:** 168

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-09T19:33:19Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-09T16:40:18Z | 2026-08-09T16:42:10Z | 1m 52s |
| red | 2026-08-09T16:42:10Z | 2026-08-09T17:16:40Z | 34m 30s |
| green | 2026-08-09T17:16:40Z | 2026-08-09T19:15:11Z | 1h 58m |
| review | 2026-08-09T19:15:11Z | 2026-08-09T19:33:19Z | 18m 8s |
| finish | 2026-08-09T19:33:19Z | - | - |

## Sm Assessment

Story sw10-3 · repos arcade · 5 points · type refactor · tdd (phased).

Setup complete and clean. My assessment before handing off to TEA (Han Solo) for the red phase:

- **Grounding is solid.** The entire scope derives from sw10-1's approved AC#2 deferral (see sprint/archive/sw10-1-session.md "REMAINING (ordered), now mostly mechanical"). The native-basis migration is proven by sw10-1's space + surface phases (basis.ts convention frozen + verified, model bakes enumerated + tested, generators authored-native like surfaceGrid). Trench is the final phase application of the same remap.

- **Deferred placement scope held.** AC#5's re-derivation of SPAWN_DISTANCE, trench dims, camera height from ROM stays deferred to sw10-2 (→ "do it numerically, don't guess" per sw10-1 Dev marker). This story is axis-flip + model bakes only, not placement constants.

- **Merge gate clear.** sw10-1 merged (PR #155); no open blockers on trench migration.

- **Known tax flagged for TEA/Dev.** star-wars is line-anchor sensitive (sw8-27 fixtures cite sim.ts lines; citation gate is 53/53). Edits to sim.ts/gameRules.ts must keep net-line-neutral or re-anchor — no line-count change allowed. The trenchGunFireVelocity(depth) function is ALREADY NATIVE per sw10-1 dev; this story migrates only its TRENCH CALLER, not the function itself (no double-flip). Documented in context-story-sw10-3.md and [[star-wars-sim-edit-reanchor-tax]] memory.

- **13 red tests are deliberate deferrals, enumerated and tracked.** sw10-1 session lists them (trench.test, trench-aim-wysiwyg, … tune-cue, 13 files). Turning them green is AC#3; no space/surface regression expected (those phases done by sw10-1, gates verified).

Handing off to TEA for the red phase.

## Tea Assessment

RED phase complete. New failing suite: `plugins/star-wars/tests/core/sw10-3-trench-native-basis.test.ts` — **8 failing, 0 passing**, every failure an `AssertionError` (no compile/import/collection error), tsc clean. Independently re-verified by testing-runner.

**Why a NEW suite, and not just the inherited 13 reds.** The 13 inherited files (52 reds) assert game OUTCOMES — a run clears, a torpedo arms, the death-knell fires, an obstacle scrolls — that are **invariant under a coordinate-basis change**. They are equally red under "sw10-1's authentic lens on an old-basis trench" (today) and could be greened by *reverting the lens* rather than migrating the trench, so they do not by themselves pin the story's actual target. This suite supplies the discriminating spec: 8 teeth that are each **false against the old trench basis and true only once the trench carries depth on native index 0 (+forward, scrolling down to the cockpit), right on index 1, up on index 2** (`toNative([x,y,z]) = [-z,x,y]`, frozen by sw10-1's `basis.ts`, and already honoured by the migrated aim/eye support `tests/support/aim.ts`).

**What the teeth pin (fail-now → green-after-migration), and the exact old-basis site each targets:**
- **AC#1 sim scroll** — an obstacle ahead scrolls `pos[0]` down (native depth), not `pos[2]` (sim.ts obstacle scroll ~1426 `pos[2]+SCROLL`; today it despawns the native-seated obstacle).
- **AC#1 despawn** — obstacles drop on `pos[0] < 0`, keeping those still ahead (sim.ts despawn ~1454 `pos[2]>0`).
- **AC#1 port scroll** — `exhaustPort.pos[0]` closes toward the cockpit (sim.ts port scroll ~1390/1548 `pos[2]+SCROLL`).
- **AC#1 trenchView** — lateral yoke → native RIGHT (index 1), vertical yoke → native UP (index 2), native DEPTH (index 0) inert (sim.ts trenchView build ~1311 `[lateral, height, 0]`).
- **AC#2 generator** — `trenchChannel` spans depth on index 0 from 0→TRENCH_FAR, walls on right/up (trench-channel.ts verts `[x,y,-TRENCH_FAR]`).
- **AC#2 render** — `trenchPlacement` seats the port + floor on native depth (index 0) (render.ts:457 `floor:[0,0,port[2]]`, default `[0,0,-EXHAUST_PORT_DISTANCE]`).

**Scope I DELIBERATELY did NOT do (Dev's coordinated green-phase work, per the sw10-1 precedent where production + fixture sweeps land together as one unit):**
1. **The mechanical position-literal sweep of the inherited ~24 trench fixtures** old→native (`[lat,vert,-D]`→`[D,lat,vert]`, `.pos[2]`↔`.pos[0]` depth reads, sign flips). This is tightly coupled to Dev's exact native seat/sign choices, so it lands with the production change, not ahead of it. **These are the AC#3 acceptance coverage** — they go green when Dev migrates + sweeps.
2. **Orient/nose/baked-matrix test values** — depend on Dev's numeric model bakes (EXHAUST_PORT/TURRET/SQUARE/CATWALK), so their expected values can only be written after the bake (`render.exhaust-port-orient.test.ts`, model bakes in `models.ts` + `romCompare` ROM_TO_BAKE).
3. **Consumer reindex** (onFieldSide/inBand/inDepth/reachedCockpit/inApproachWindow) — pinned indirectly by the axis teeth above; the catwalk-graze fixture is left to the existing (to-be-swept) `trench-obstacles` catwalk tests to avoid a fragile dual-basis fixture.

**Landmine confirmed by measurement:** `trench-fire-scroll-carry.test.ts` is red because `trenchGunFireVelocity` is ALREADY NATIVE (returns depth on index 0) while the test reads `vel[2]`. Do NOT re-flip the function — sweep the test to `vel[0]` and migrate the CALLER (sim.ts ~1498). (Matches context + [[star-wars-sim-edit-reanchor-tax]].)

### Rule Coverage
- **Purity (core-boundary):** untouched — the new suite adds no clock/RNG/DOM into `src/core`; it only *reads* core state through `stepGame`/`enterPhase` and the shell `trenchPlacement` (tests may import the shell; core may not). `core-purity`/`sim-clock-free` stay green.
- **No vacuous assertions (Phase C self-check):** every test asserts a concrete axis/value or a length change with a discriminating counterpart; no `assert(true)`, no `is-null-on-always-null`. Exact `.toBe(0)` is used only for the native-depth axis that is assigned a literal `0` (not a computed float); magnitudes use `toBeCloseTo`.
- **No new production symbols referenced** → tsc stays green now (unlike sw10-1's RED, which forward-referenced not-yet-existing exports). The suite discriminates purely on the ASSERTED axis of existing APIs.
- **Line-anchor / citation gate (AC#4):** not touched this phase (test-only add); gate remains 53/53. Dev must keep sim.ts/gameRules.ts net-line-neutral or run `pf audit reanchor-citations` after the sim edits.

**Handoff to Dev:** migrate the trench production to native (sim scroll/despawn/consumers + trenchView + generators + render placement + model bakes + romCompare), sweep the inherited ~24 trench fixtures' pos-literals to native, update the orient/baked-matrix test values, and keep the citation gate green. Target end state (AC#3): full star-wars **2328 passed → all trench/port files green, 0 failed**, plus this suite's 8 green.

## Dev Assessment

GREEN complete. **Full star-wars suite: 2388 passed / 0 failed** (214 files); **citation gate 2/2**; **orchestrator 455/455**; **`npm run lint` clean**. Two commits on `feat/sw10-3-trench-native-basis`: `94725187` (migration) + `c074f6ba` (D2 comment re-derivation). RED contract suite `34dba66c` already on branch.

**Production migrated to the native world basis** (depth = index 0 +forward scrolling to 0 at the cockpit, right = 1, up = 2; `toNative = [-z,x,y]`) — 9 `src/` files:
- **`sim.ts` `stepTrench`** — `trenchView` build, obstacle + port scroll (`pos[0] - SCROLL`), despawn (`pos[0] < 0`), shot despawn (`pos[0] >= 0`), gun-range gate, all catwalk consumers (`onFieldSide`→right[1], `inBand`→up[2], `inDepth`→depth[0]), `inApproachWindow` (`port[0] <= WINDOW`), `reachedCockpit` (`port[0] <= 0 && hypot(port[1],port[2])`), and `spawnPort`. **Also fixed `enterPhase`'s `trenchView` seed** — it still seeded the old basis (caught by the collateral sweep agent; a real bug beyond the enumerated scope). **`sim.ts` net-line-neutral** each inter-anchor gap → citation gate 53/53 and sw8-27's exact line list intact, no reanchor needed.
- **`models.ts`** — `EXHAUST_PORT`/`TRENCH_TURRET`/`TRENCH_SQUARE`/`TRENCH_CATWALK` baked native via new `bakePort` (`= toNative(rotationX(-π/2)·v) = [y,x,z]`, the port is a floor hole) and `bakeTrench` (`= toNative = [-z,x,y]`, retiring the old `TRENCH_ORIENT`/`PORT_ORIENT` recovered from git). **`romCompare.ts`** ROM_TO_BAKE gained PORT/WFF/WGA in lockstep.
- **`state.ts`** (trenchView init), **`trench-channel.ts`/`trench-detail.ts`** (generators emit `toNative`), **`trench-obstacles.ts`** (station + streamed seats), **`render.ts`** (`trenchPlacement` + port-ahead banner), **`scenePresets.ts`** (dev-tool scenes).
- **`trenchGunFireVelocity` was already native (sw10-1) — only its caller migrated** (the TEA landmine); confirmed no double-flip.

**Tests:** the ~35 inherited trench/exhaust-port/port-arming fixtures were swept old→native (pos-literals, index reads, depth signs) and the ROM-geometry/baked-matrix values updated (`bakePort`/`bakeTrench` on the raw-ROM oracle side, extent reads remapped to native axes). Self-review: no `.skip`/`.only`/vacuous assertions introduced; expect-lines are a 1:1 translation (89 added / 89 removed), not deletions.

**D2 (TEA):** the falsified 60°/30° FOV rationale in `sim.ts`/`state.ts`/`trench-obstacles.ts` re-derived in-place to the authentic 90° / 45° half-angle, aspect-independent lens.

**Method note for Reviewer:** the fixture sweep was fanned out to three subagents (gameplay, collateral, geometry), each restricted to a disjoint test-file set with orient/matrix/ROM-raw assertions carved out to me; I personally did all `src/` + the ROM-baked/render-orient tests. Every result was verified by the full green suite + lint here. The agent sweeps are the highest-value target for adversarial review (vacuity / mistranslated axis).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA] Gap / non-blocking — old-basis sibling assertions Dev must sweep in lockstep.** `trench-obstacles.test.ts` carries tests that DIRECTLY assert the old basis and are GREEN today: "obstacles scroll toward the cockpit at TRENCH_SCROLL_SPEED" (asserts `pos[2]` scroll) and "despawns obstacles that pass the cockpit (pos z > 0)". Migrating the sim to native will red them; they must be swept to `pos[0]` / `pos[0] < 0`, preserving intent. This is the sibling-re-seat pattern (TEA/Dev owns test maintenance) — enumerated so it is not missed. *Found by TEA in RED (empirically located).*
- **[TEA] Note — the aim/eye support is already native; do not re-flip it.** `tests/support/aim.ts` (`eyeOf`/`aimAt`/`FIRE_AT_PORT`) inverts the authentic lens in native coordinates (target = `[depth, right, up]`). It is CORRECT; the trench suites are red because a native aim meets an old-basis sim. Making the sim native re-aligns them — no change to aim.ts is warranted. *Found by TEA in RED.*
- **[TEA] Note — deferred D2 comment corrections land here.** Falsified 60°/30° FOV rationale in `state.ts:870-872`, `sim.ts:1563-1564`, `trench-obstacles.ts:82-84` annotate the trench/port subsystem this story migrates; re-derive them to the authentic π/2 basis co-located with the code change (context Critical Notes). *Carried from sw10-1 D2.* → **[Dev] DONE** — all three re-derived to the authentic 90°/45° aspect-independent lens (commit `c074f6ba`).
- **[Dev] Improvement / non-blocking (dev-tool) — `debug-overlay.ts` trench branch draws the unbaked `TRENCH` tile at the floor.** `src/shell/debug-overlay.ts:186` draws the flat `TRENCH` model (still old-basis, deliberately NOT baked) at `trenchPlacement().floor` with IDENTITY orient, so in the debug overlay it sits mis-oriented. The `EXHAUST_PORT` beside it IS correct (baked + native). Debug-overlay is a dev-only diagnostic behind a flag, untested, and in the same family as sw10-1's deferred F5/DEATH_STAR_SURFACE overlay findings — carried as a follow-up, not fixed here. *Found by Dev during the src sweep.*
- **[Dev] Note — trench eyeball (AC#3 visual) not yet done.** The migration is structurally green; the `/star-wars/` trench render + `/models.html` port/furniture bakes should be eyeballed on `just serve` (verify who owns 5270 first). Deferred to review, per the render convention. *Found by Dev.*

### Reviewer (code review)
- **Improvement (non-blocking): a 7-site stale axis-index comment cluster the migration left behind.** The basis flip inverted `trenchView`/`pos` index semantics but 7 *unedited* comments still describe the OLD basis, several contradicting the code they annotate. Affects `plugins/star-wars/src/core/state.ts:1070` (the canonical `trenchView` field JSDoc — says `[1]`=height/`[2]`=unused; now `[1]`=right/`[2]`=height — a latent index-off trap for future code), `plugins/star-wars/src/core/trench-obstacles.ts:69` (`trenchView[0]=0` should be `[1]`), `plugins/star-wars/tests/core/trench-viewpoint.test.ts:29` (header calls `[1]` the eye height), `plugins/star-wars/src/core/models.ts:722` + `:774` (TURRET/CATWALK docstrings say "ORIENTATION is the shell's job" while the same diff bakes it in-file 3 lines below), `plugins/star-wars/src/shell/render.ts:161` (survey says TRENCH "needs no reorientation" but `TRENCH_SQUARE=bakeTrench(...)` now, and `TRENCH_ORIENT:161-171` lacks the "RETIRED" annotation its siblings carry), `plugins/star-wars/src/core/models.ts:72` (new bake docstring calls `TRENCH_ORIENT`/`PORT_ORIENT` "retired" but both still exist as live IDENTITY no-ops). A doc-only sweep — no code/test change. *Found by Reviewer during code review (comment-analyzer + Reviewer).*
- **Improvement (non-blocking): AC#3 visual eyeball still open.** Carrying Dev's note forward — the trench render + `/models.html` furniture bakes were not eyeballed on `just serve`. The render-orient structural tests (`render.exhaust-port-orient.test.ts`, genuinely discriminating — flat-floor plate, 512×512 extent, no vertex below floor) pass and are the backstop, so this is a confirmation, not a gap. Affects nothing in the tree; a run-the-game check. *Found by Dev, seconded by Reviewer.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Reviewer (audit)
- **No CODE spec deviations found.** The migration applies sw10-1's frozen `toNative`
  remap uniformly; every scroll/despawn/consumer/generator/bake site was traced and
  matches the native `[depth, right, up]` contract. Nothing to accept or flag on the
  code side.
- **Undocumented doc-consistency gap (severity: LOW/MEDIUM, non-blocking).** The basis
  flip silently invalidated 7 *adjacent, unedited* axis-index comments that TEA/Dev did
  not sweep (enumerated in the Reviewer Assessment). Not a spec deviation in behaviour —
  the code is correct — but a documentation-fidelity gap left by the migration. Recorded
  as a follow-up so it is not lost.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (2388/0 vitest, lint clean, citations 53/53, orch 455/455, 0 smells) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — test quality assessed by Reviewer + rule-checker (rules #8/#18/#24/#26/#30) |
| 5 | reviewer-comment-analyzer | Yes | findings | 7 (stale axis-index comments) | confirmed 7, dismissed 0, deferred 0 → all non-blocking doc follow-ups |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — type shape covered by rule-checker rules #1/#2/#5 |
| 7 | reviewer-security | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 30 rules / 210+ instances | confirmed 0, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 7 confirmed (all documentation, non-blocking), 0 dismissed, 0 deferred

### Rule Compliance

Enumerated against CLAUDE.md + the TS lang-review checklist (rule-checker walked 30 rules / 210+ instances; I cross-checked the load-bearing ones by hand):

- **core purity (no DOM/clock/Math.random)** — 9 touched core files: 0 violations. `basis.ts` (newly imported by `trench-channel.ts`/`trench-detail.ts`) is pure linear algebra. `toNative` is a value import used as a `.map()` callback — correct. ✓
- **core/shell boundary** — no core file imports `shell/`; `render.ts` (shell) consumes `GameState` (correct direction). ✓
- **line-anchor / citation gate (star-wars, sim.ts/gameRules.ts)** — sim.ts 2348→2348 lines, every hunk individually line-preserving; gameRules.ts untouched; citations 53/53. No re-anchor needed. ✓
- **no vacuous assertions** — new suite's 6 teeth + swept fixtures all assert values derived from `stepGame`/`trenchChannel`/`trenchPlacement`/imported constants; 0 `assert(true)`/tautologies. ✓
- **ROM oracle non-circularity** — the 4 `bakePort`/`bakeTrench` ROM tests import the REAL production bake and compare against an independently hand-transcribed table (not a reimplementation). ✓
- **type safety** — `bakeTrench`/`bakePort` typed `(vs: readonly Vec3[]): Vec3[]` matching `bakeTie`; `ROM_TO_BAKE` is `Readonly<Record<string, (vs) => Vec3[]>>`; 0 new `as any`/`@ts-ignore`; `as Vec3` tuple-literal casts in scenePresets are the pre-existing shape. ✓
- **NaN / reject-style safety** — all 5 flipped comparisons (`pos[0]<0`, `s.pos[0]>=0`, `o.pos[0]>RANGE`, `port[0]<=WINDOW`, `port[0]<=0`) preserve accept/reject polarity under negation; NaN fails identically old and new (no fail-open flip). ✓

### Devil's Advocate

Let me try to break this. **Claim: the sim now scrolls the wrong way and the tests can't see it.** The whole story is a coordinate permutation, and the seductive failure mode is a *self-consistent* mistranslation — flip the literal AND the assertion the same wrong way and the test stays green while the game is broken. So I did not trust the green suite: I traced the physics independently. `TRENCH_SCROLL_SPEED` is an unchanged positive constant now *subtracted* from native depth (index 0) each tick, so an obstacle at `+depth` monotonically drives toward 0 and past it; despawn `pos[0] < 0` is therefore reachable in finite time, and the security agent independently confirmed no direction was flipped without a matching threshold flip. A wrong sign here would either despawn everything on frame 1 (suite goes red instantly) or never despawn (the length assertions in the new AC#1 teeth go red). Neither happens.

**Claim: `reachedCockpit` lost its lateral gate.** It now reads `COCKPIT[1]`/`COCKPIT[2]` where it used to read `[0]`/`[1]`. If `COCKPIT` were non-zero on the old lateral axis, the hit sphere would shift. I checked: `COCKPIT = [0,0,0]` (gameRules.ts:26), so the remap is basis-invariant — no behavioural change.

**Claim: the port bake is a billboard, not a floor.** `bakePort = [y,x,z]`; I re-derived it as `toNative(rotationX(-π/2)·v)` by hand and it holds, and the render-orient suite asserts the 12 points lie in ONE horizontal plane with no vertex below the floor — a genuinely discriminating geometric test that a wall-oriented bake would fail loudly.

**Claim: a confused future dev indexes `trenchView[1]` for height because the JSDoc says so.** This is the ONE place the code's correctness is undercut — not today (all live code is right), but tomorrow: `state.ts:1070` still documents the OLD index contract. That is the real residue, and it is why I am filing the doc cluster rather than waving it through silently. It is documentation, not a live defect, so it does not block — but it is a latent trap, and left unswept it perpetuates exactly the axis confusion this story existed to end.

## Reviewer Assessment

**Verdict:** APPROVED

The trench native-basis migration is correct, complete, and green. Every `toNative` remap site (sim scroll/despawn/consumers, `trenchView` build + seeds, generators, `trenchPlacement`, the furniture/port bakes, `romCompare`) was traced by hand and independently confirmed by the security and rule-checker specialists; the model-bake algebra (`bakeTrench`=`toNative`, `bakePort`=`toNative(rotationX(-π/2)·v)`) and the 90°/45° FOV re-derivation are numerically verified, not merely changed. The fixture sweep (Dev's flagged highest-risk target, with test-analyzer disabled) I spot-audited across the force-field, obstacle-sibling, fire-scroll-carry, ROM-geometry and render-orient files — every translation is a faithful `toNative` of both literal and assertion, and the discriminating structure (opposite-wall clears, climbed clears, no-tunnel sweep, flat-floor plate) is preserved, not vacuated.

**Data flow traced:** pilot yoke `aimX/aimY` → `trenchView[1]/[2]` (native right/up, depth pinned 0) → catwalk `onFieldSide`/`inBand`/`inDepth` gates and `sweptCollides` → `terrain-crash`/`player-death` events. Safe: indices consistent end-to-end, COCKPIT is the origin so lateral gates are basis-invariant.
**Pattern observed:** furniture orientation retired from render into the DATA via `bakeTrench`/`bakePort`, exactly mirroring sw10-1's `bakeTie` precedent — models.ts:70-85.
**Error handling / degenerate input:** `state.exhaustPort?.pos ?? [...]` correct `??`; NaN fails all flipped comparisons identically old→new (no fail-open); `TRENCH_SCROLL_SPEED` monotonicity keeps every despawn reachable — no infinite scroll.

Subagent dispatch coverage (tags): **[SEC]** clean (no core-purity/nondeterminism introduced) · **[RULE]** clean (30 rules, 210+ instances, 0 violations, line-neutral, citations 53/53) · **[DOC]** 7 stale axis-index comments confirmed — the only findings, all non-blocking documentation. Disabled this run and assessed by Reviewer/rule-checker instead: **[TEST]** (rules #8/#18/#24/#26/#30 — non-vacuous, non-circular oracles, full sweep) · **[TYPE]** (rules #1/#2/#5 — readonly bake sigs, no `as any`) · **[EDGE]** (NaN/boundary via rule #22 + my scroll-reachability trace) · **[SILENT]** (no try/catch or swallowed-error surface in a pure geometry diff) · **[SIMPLE]** (permutation-only, no dead code or over-engineering introduced).

**Why APPROVED despite 7 findings:** every finding is a stale comment — Medium/Low by the project severity rubric, which blocks only on Critical/High. No code or test defect survives review; all gates are green and line-neutral. Inflating a documentation cluster to High to force a block would be the disproportionality the reviewer-proportionality guidance warns against. The cluster is real and worth fixing (state.ts:1070's inverted field contract is a latent index trap), so it is filed as a non-blocking Delivery Finding + an audited doc-consistency gap — a cheap doc-only sweep for a fast follow-up, nothing that should gate this correct, well-tested migration.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.