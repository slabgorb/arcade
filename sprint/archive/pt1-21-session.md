---
story_id: "pt1-21"
jira_key: "pt1-21"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-21: star-wars: surface run is one dense pass — restore the ROM staged multi-pass tower reveal

## Story Details
- **ID:** pt1-21
- **Jira Key:** pt1-21
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-21-star-wars-surface-run-staged-multipass-reveal
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-20T13:43:21Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T12:32:23Z | 2026-08-20T12:33:36Z | 1m 13s |
| red | 2026-08-20T12:33:36Z | 2026-08-20T12:45:31Z | 11m 55s |
| green | 2026-08-20T12:45:31Z | 2026-08-20T13:08:03Z | 22m 32s |
| review | 2026-08-20T13:08:03Z | 2026-08-20T13:30:44Z | 22m 41s |
| green | 2026-08-20T13:30:44Z | 2026-08-20T13:39:16Z | 8m 32s |
| review | 2026-08-20T13:39:16Z | 2026-08-20T13:43:21Z | 4m 5s |
| finish | 2026-08-20T13:43:21Z | - | - |

## Sm Assessment

**Story:** Restore the arcade's staged multi-pass Death Star surface-run tower reveal. This is a
distinct fidelity divergence from pt1-3 (which fixed projection scale); pt1-21 fixes the TRAVERSAL.

**Current vs ROM:**
- Now: `sim.ts` (`mazeField`/`stepSurface`) lays the entire wave maze at once and scrolls it past in
  ONE accelerating ~5s pass. The awakening seq (`turret.seq`) gates only FIRING (`sim.ts:1138`), not
  presence. Result (user playtest 2026-08-20): "towers too close together / brief encounter."
- ROM: ship LAPS a $1000..$8000-deep maze ~5×; `M$TX` wraps → `INC GD.SEQ` per $8000 sweep
  (WSMAIN.MAC:2537-2547). Phase ends on LAP COUNT (`GD.SEQ >= 5`, WSMAIN.MAC:1678-1689), not a timer.
  Awakening byte gates PRESENCE, not just firing (WSGRND.MAC:738-742) — object skipped entirely when
  `GD.SEQ < .C`; towers split across seqs 7-0/9-1/7-2/5-3 (WSGRND.MAC:146), so only ~1/3 exist on pass 0.

**Fix scope:** gate tower PRESENCE on `gdSeq` (not just firing), re-fly the maze across ~5 laps as
`gdSeq` increments, end at `gdSeq >= 5`. Structural change to `stepSurface` + its pacing/traversal tests.

**Routing:** tdd/phased. ROM axes are concrete and byte-cited — TEA has firm ground to write the RED
tests against (lap-count termination, per-lap presence gating, per-seq tower subsets, sweep timing).
No open PRs; merge gate clear. Full ROM audit summarized in the pt1-3 session Delivery Findings.

## Tea Assessment

**RED committed** — `9cc71037` on the feature branch. New suite:
`plugins/star-wars/tests/core/surface-multipass-reveal.test.ts` (13 tests: 8 failing = the
defect, 5 passing = live controls + fixture-sanity + determinism). Full star-wars surface suite:
`8 failed | 307 passed`; `npm run lint` clean (failures are assertions, not type errors).

**The two ROM divergences pinned (both distinct from pt1-3's projection fix):**
1. **PRESENCE gating.** Today `stepSurface` gates only FIRING on `gdSeq` (`armed`, sim.ts:1137-1139);
   every object is laid, drawn and collidable from frame 1. The ROM SKIPS a dormant object entirely
   at the maze-loop top — `LDA GD.SEQ / CMPA TGD$SQ(X) / LBLT 90$` (WSGRND.MAC:738-742), with GDVIEW
   (draw) and GDGUN (fire) downstream (:771-781). Fix: an object with `seq > gdSeq` must be absent
   from `s.turrets` — undrawn, uncrashable, unshootable. (The `Turret.seq` doc at state.ts:199-204
   already CLAIMS "nor, in the shell, draw" — a check-#17 stale claim the fix makes true.)
2. **Multi-pass lapping.** Today the maze is laid ONCE (~1 SEQ_SPAN deep, sim.ts:1085-1102) and each
   object culled as it passes (`filter(pos[0] > 0)`); the field is EMPTY by gdSeq 1 and the remaining
   four passes fly bare ground — the "one dense pass". The ROM re-flies the SAME $1000..$8000 maze
   five times (M$TX wraps → `INC GD.SEQ`, WSMAIN.MAC:2537-2547; ends `CMPA #5`, :1678-1689). Fix:
   re-present the maze each lap so towers persist until `gdSeq >= SURFACE_END_SEQ` (5).

**Test-design notes (mutation-worthy, per lang-review #15/#26/#29):** the "not one dense pass" bug is
a SPACING complaint, so AC-5 carries a magnitude (`>= 4 of 5 passes have towers`), not a bare
distinct/increasing. AC-4 pins the exact seq-0 count (7 for DIFF — matches the ROM's 7-0/9-1/7-2/5-3)
against the maze DATA and proves the gate non-vacuous by asserting the excluded seq>0 subset is
non-empty. Every negative behaviour has a passing seq-0 CONTROL beside it, so the suite can tell a
broken impl from a fixed one (not a fixture-whose-value-is-the-expectation, #18).

### Rule Coverage (lang-review/typescript.md)
- **#15 source-text/token vs claim, #26 all-local terms:** no source-text greps here; every assertion
  reads a value produced by `stepGame` (the code) against maze DATA or an independent literal.
- **#29 ordering vs magnitude:** AC-5 pins the pass COUNT (`>= 4`), AC-4 pins the tower COUNT (`=== 7`).
- **#18 apparatus fails-by-passing:** 5 live controls (seq-0 present/crashes/killable, DIFF-stages
  sanity, determinism replay) prove the fixtures discriminate; each fires against `stepGame` output.
- **#4/#21 nullish/degenerate:** `?? 0` for `seq` (awake-from-start) is exercised by the controls;
  the Dev fix must keep hand-placed `{ pos }` fixtures (undefined seq) awake — asserted indirectly.
- **#14 derived edge in one branch:** flagged for Dev — presence gating touches THREE readers of the
  field (draw set, crash loop, laser loop); gate them at one point, not per-consumer.

## Dev Assessment

**GREEN complete.** `stepSurface` restored to the ROM's five-lap staged traversal:
- New `GameState.surfaceDormant?: Turret[]` reservoir holds objects the traversal has not
  reached (`gdSeq < seq`) — out of `turrets`, so undrawn/uncollidable/unshootable — and promotes
  them as `gdSeq` climbs. Presence gated ONCE (`reached`), reused by the draw set, crash loop and
  laser/fire (TEA's blocking finding — no per-consumer gate).
- The maze WRAPS instead of culling: a swept-past object re-enters one `SURFACE_SEQ_SPAN` ahead
  (M$TX `$8000` wrap), so the same maze re-flies staged across ~5 passes. Killed towers leave
  `turrets` and never re-enter (they were never in the reservoir), so they stay dead across laps —
  faithful, no resurrection.
- `enterPhase('surface')` empties the reservoir; leaving carries nothing into the trench.

**Verification:** full star-wars suite **2443/2443 green** (was 8 failing at RED); `npm run lint`
clean; comment-citation gate (`checkTree`) clean (0). The new suite's 8 RED tests all pass; its 5
controls stay green.

**Sibling reconciliation (in scope per TEA's Improvement finding):** `surface-maze-field.test.ts`
"lays the FULL field" now counts `turrets + surfaceDormant` (the staged reveal splits the field;
none is lost — the no-soft-lock guard is preserved). No OTHER surface/quota/clear test needed
changes — hand-placed fixtures (undefined seq → awake) were unaffected.

**Citation maintenance (my line insertions shifted sim.ts):** re-anchored `sim.ts:NNN` comment
citations in surface-traversal-end, tie-waves-past-plan, tie-waves-rom, the sw8-27 audit fixtures,
`coaching.ts`, and the surface-gunnery design doc — each verified to the verbatim's TRUE new line
(the checker's first-match hints for two were false, per lang-review #20; I read each rather than
trusting them). My own RED test's `sim.ts:NNN` prose refs were softened to symbol names so they
can't drift again.

## Dev Assessment (rework — Reviewer round 1)

Fixed all 5 REJECTED findings (`ad7bd718`), all documentation/test-premise (no behavior change):
1. **[F4/#17/#24]** `surface.test.ts:167` comment "scrolls past ONCE" → staged multi-pass ring (kept the `<= cap` bound, still valid).
2. **[F5/#19]** `surface-awakening.test.ts:126-138` re-scoped onto the `turrets + surfaceDormant` UNION — now asserts the whole field is laid (`=== entries.length`), every laid object has numeric seq 0..3, and the stamping spans `>1` sequence (no longer vacuous for the seq-1..3 entries).
3. **[F3/#17]** `state.ts` `towersForWave` docstring "finite single-pass maze" → FIXED tower set that re-flies ~5 staged laps (the `.TWRS` quota point preserved).
4. **[F2/#17/#24]** `surface-traversal-end.test.ts` sw8-21 block: re-anchored every citation my GREEN shift moved — `liveShots` :1201-1208→:1229-1236, `loseShield`/`lives` :1210/:1216-1217→:1238/:1238-1239, plus `const scrollSpeed` :1050→:1073 and terrain scrape →:1056-1060 (block now internally consistent with its own header). Left the pre-existing dispatcher/space refs (:221/:210/:345-350/:676/:705) — that code is unmoved by this diff and is separate pre-existing debt.
5. **[F1/#17]** `tie-waves-past-plan.test.ts:19` `state.ts:929`→`:972` (SPACE_PHASE_END_S true line).

**Verification:** full star-wars suite **2443/2443 green**; `npm run lint` clean; comment-citation gate (`checkTree`) clean (0). The `state.ts` docstring grew by 1 line — checkTree confirms no tracked citation drifted from it.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Dev / Conflict, non-blocking] PRE-EXISTING orchestrator red, unrelated to this story's code.**
  `npm run test:orchestrator` fails on `tests/sprint-repo-routing.test.mjs` — `sprint/epic-pt1.yaml:259`
  carries an `unquoted-hash`: the pt1-21 story DESCRIPTION text `LDA GD.SEQ / CMPA #5 / IFHS -> ...`.
  Verified identical on `origin/develop` and my branch touches NO sprint files, so it predates this
  work — the `#5` (from the ROM `CMPA #5`) in the plain-scalar description trips the sprint-YAML lint.
  Not fixed here: CLAUDE.md forbids hand-editing sprint YAML (the finish/pf tooling owns it). SM/finish
  to quote or escape the description. Flagged so the Reviewer/finish preflight doesn't read this red as
  a pt1-21 regression — the pt1-21 code + vitest suites are fully green.
- **[Dev / Resolved] TEA's blocking finding (gate once, 3 consumers) — done.** `reached()` gates the
  field in one place; the crash loop reuses it; draw/laser/fire read the pre-gated `turrets`.
- **[Dev / Resolved] TEA's wrapping finding — done.** The maze re-flies via the `SURFACE_SEQ_SPAN`
  wrap; AC-5 (towers across ≥4 passes) is green.

- **[Gap, blocking] Presence gating has THREE consumers of the field, not one.** In `stepSurface`
  the laid field feeds (a) `turrets` = the drawn/returned set (sim.ts:1097-1102), (b) the crash loop
  over `scrolled` (:1115-1122), (c) the laser-target loop over `turrets` (:1170-1198), and (d) the
  `armed` fire filter (:1137-1139). The fix must exclude `seq > gdSeq` objects from PRESENCE (a/b/c),
  not just firing (d). Gate once (filter the field by `gdSeq >= (seq ?? 0)` before it fans out), per
  lang-review #14 — a per-consumer gate will miss one. My AC-2/AC-3 pin crash + laser; AC-1/AC-4 pin
  the drawn set.
- **[Gap, non-blocking] The maze is only ~1 SEQ_SPAN deep, so wrapping is required, not just gating.**
  `mazeField` lays depths `e.y + SPAWN_DISTANCE` = 1200..~34k (< $8000·1.04). Presence gating ALONE
  still empties the field after pass 0. Dev must ALSO re-present the maze each lap (wrap depth by
  `SURFACE_SEQ_SPAN`, or re-lay per pass) so AC-5 (towers across ≥4 passes) goes green. Both halves
  are needed; one without the other leaves the run either empty-late or all-present-early.
- **[Conflict, non-blocking] surface-awakening.test.ts re-scoped in this commit.** Its "spans more
  than one sequence" test read `s.turrets` at gdSeq 0 — which presence gating reduces to seq-0 only.
  Re-pointed onto `mazeForWave(3)` DATA (same intent, presence-independent). Its sibling "every laid
  object exposes numeric seq 0..3" still passes (present = seq-0, all numeric). No action needed.
- **[Question, non-blocking] The ROM's final "blanked pass" is NOT pinned.** WSMAIN.MAC:1678-1689
  clears towers at `GD.SEQ >= 5` then flies ONE blank pass before the trench; our `phaseCleared`
  transitions immediately at `gdSeq >= 5`. I deliberately did not constrain this (it's a render
  nicety and would over-fit the exit), so Dev is free to leave the instant transition. Flagged so the
  Reviewer doesn't read its absence as a miss.
- **[Improvement, non-blocking] Re-verify the traversal/fresh-field suites under the GREEN fix.** All
  307 sibling surface tests pass on CURRENT code, but the structural change may break any that fly a
  FRESH wave and assume the whole maze is present at gdSeq 0, or that the field empties after pass 0
  (candidates: surface-clear, surface-tower-quota, surface-towers, surface-maze-field,
  ground-objects-rom, surface-hazard, surface-visibility). Hand-placed `{ pos }` fixtures (undefined
  seq → awake via `?? 0`) are safe. Reconcile any breakage in GREEN, keeping the intent.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — GREEN: 2506 pass, 0 fail, 0 skip, no smells |
| 2 | reviewer-edge-hunter | No | Skipped | N/A | Disabled via settings — domain assessed by Reviewer (wrap/dt, kill-persistence) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | N/A | Disabled via settings — no swallowed errors in a pure sim; assessed by Reviewer |
| 4 | reviewer-test-analyzer | No | Skipped | N/A | Disabled via settings — test quality assessed by Reviewer + rule-checker (#18/#26/#29) |
| 5 | reviewer-comment-analyzer | No | Skipped | N/A | Disabled via settings — comment/citation drift caught by rule-checker (#17) |
| 6 | reviewer-type-design | No | Skipped | N/A | Disabled via settings — surfaceDormant optional-field design assessed by Reviewer |
| 7 | reviewer-security | Yes | clean | none | N/A — no purity/degenerate/strobing issue; NaN-seq note pre-existing, dismissed |
| 8 | reviewer-simplifier | No | Skipped | N/A | Disabled via settings — code minimal (`reached` reused); assessed by Reviewer |
| 9 | reviewer-rule-checker | Yes | findings | 5 | confirmed 5, dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned; 6 disabled via settings, pre-filled)
**Total findings:** 5 confirmed (all [RULE] #17/#19/#24), 0 dismissed, 0 deferred

**Working-tree audit (`pf reviewer audit-tree`):** flagged DIRTY on `?? sprint/context/context-story-pt1-21.md` — an UNTRACKED context markdown written by sm-setup in the SETUP phase, NOT a source mutation from a review subagent (`git status --porcelain` shows it alone; every source file is committed). Known false-DIRTY pattern (command exits 0). Not `git clean`-ed — it is a legitimate setup artifact (siblings like `context-epic-pt1.md` are tracked; this one is simply uncommitted and rides the finish chore PR). Substantive check (no subagent left source changes) PASSES.

## Reviewer Assessment

**Verdict:** REJECTED
**Round:** 1
**Data flow traced:** `input.aimY`/scroll → `stepSurface` → `scrolled` (wrap) → `reached()` gate → `turrets` (drawn by `render.ts:592`) / `dormant` (reservoir). The gated `turrets` is the single set every consumer reads — safe, gated once.

### Why REJECTED

The **code is correct and fully tested** — the two ROM divergences are faithfully fixed, all 2506 tests pass, purity holds, the new suite is genuinely mutation-worthy. But this diff leaves **its own comments and one docstring contradicting its own code**, drifts **live line-citations it half-re-anchored**, and makes an **existing seq-coverage test vacuous** — exactly the class the lang-review #17/#19/#24 rules and this repo's comment-citation gate exist to catch. Four of the five are self-inflicted by this change. None is Critical/High, but rule-matching findings cannot be dismissed, and shipping self-contradictions in a citation-strict codebase is not acceptable. Cheap to fix in one pass.

### Findings (all confirmed against the working tree)

1. **[MEDIUM] [RULE] #17/#24** `plugins/star-wars/tests/core/surface.test.ts:167` — the comment *"the whole field is present and scrolls past ONCE"* is falsified by THIS diff (the maze now WRAPS across ~5 laps, `sim.ts:1094` "a ring, not a finite single pass"). The `turrets.length <= cap` assertion still holds (the ring is fixed-size), so nothing reddens — a live "premise falsified in the same commit" case. **Fix:** rewrite the comment to the staged multi-pass ring; the `<= cap` bound is still valid and worth keeping.
2. **[MEDIUM] [RULE] #19** `plugins/star-wars/tests/core/surface-awakening.test.ts:126-138` — *"every object the wave maze lays exposes a numeric seq in 0..3"* iterates `s.turrets` at gdSeq 0, which THIS diff's presence gate now narrows to the seq-0 subset. mazeField's seq-1..3 stamping is only covered transitively (AC4's `===7` count, AC5's staging, the surfaceMazes data test) — the direct check went vacuous for 2/3 of the maze. **Fix:** re-scope like its already-fixed sibling two lines below — assert against `mazeForWave(3)` data, or the `turrets + surfaceDormant` union, or lay at a high gdSeq so all seqs are present.
3. **[LOW] [RULE] #17** `plugins/star-wars/src/core/state.ts:990` — `towersForWave` docstring *"The surface is a finite single-pass maze"* now contradicts THIS diff's `sim.ts:1094`. **Fix:** update the docstring to the staged multi-pass ring (the `.TWRS` quota point it makes is still valid).
4. **[LOW] [RULE] #17/#24** `plugins/star-wars/tests/core/surface-traversal-end.test.ts:371,377` — citations `sim.ts:1201-1208` (`liveShots`, actually **1229-1236**) and `(:1216-1217)` (`loseShield`/`lives`, actually **1238-1239**) drifted by this diff's +22..+26 line shift; the SAME block's citations at :282-283 WERE re-anchored, these duplicate references were missed (lang-review #24's "duplicate occurrence later in the file"). Also pre-existing in that block: `:1050` for `const scrollSpeed` (now **1073**). **Fix:** re-anchor the current-claimed citations (checkTree does not catch these — bare `:N` / no adjacent verbatim).
5. **[LOW] [RULE] #17** `plugins/star-wars/tests/core/tie-waves-past-plan.test.ts:19` — `state.ts:929 = 21s` is stale (`SPACE_PHASE_END_S` is at **state.ts:972**). Pre-existing, but this diff re-anchored the adjacent `sim.ts` citation on the same line and left this one — a mechanical re-anchor, not a re-read (#20). **Fix:** 929 → 972.

### Verified good (evidence-backed)

- **[VERIFIED] [SEC] Core/shell purity + safety hold** — the diff (sim.ts/state.ts/coaching.ts) adds no `shell/` import, no DOM/`Date.now`/`performance.now`/`Math.random`/rAF; `reached()` reads only `gdSeq = floor(surfaceScrollZ/SEQ_SPAN)` and motion is `dt`-driven. reviewer-security returned **clean**: no purity violation, no unvalidated-degenerate path, and no flashing/strobing hazard (the staged reveal is a per-object, monotonic, multi-second transition — not a >3 Hz large-area strobe). The one [SEC] note — a malformed `seq = NaN` save stranding an object dormant — is pre-existing (`?? 0` idiom), has no attacker-controlled save format in a client-only game, and is **dismissed** as out of scope, not introduced by this diff.
- **[VERIFIED] Presence gated ONCE (#14)** — `reached` (sim.ts:1116) is defined once and reused by the `turrets`/`dormant` split, the crash loop (`sim.ts:1131` iterates `ring`, gated by `reached`), and the fire filter reads the pre-gated `turrets`; `render.ts:592` draws `state.turrets`, inheriting the gate. No per-consumer edge.
- **[VERIFIED] Killed towers stay dead across laps** — `standingTurrets = turrets.filter(!killed)` (sim.ts:1221); killed objects are only ever in `turrets`, never `dormant`, and next frame `ring = [...turrets, ...dormant]`, so a shot tower cannot resurrect on a later lap.
- **[VERIFIED] New suite is mutation-worthy** — AC5 pins a magnitude (`>=4` of 5 passes, not ordering — #29), AC4's `===7` count derives from the production `mazeForWave` import (#26) and proves the gate non-vacuous, every negative AC ships a live seq-0 control (#18). Removing `reached` flips all of AC1-3. Independently confirmed by reviewer-rule-checker.
- **[VERIFIED] Single-wrap is sufficient** — `src/shared/loop.ts` clamps the frame to `maxFrame=0.25`, so `step = scrollSpeed·dt ≤ 21000·0.25 = 5250 ≪ SURFACE_SEQ_SPAN (32768)`; the `raw > 0 ? raw : raw + SEQ_SPAN` single correction always suffices in play. (A synthetic `dt > 1.56s` at cap could under-wrap — unreachable via the loop; noted, not blocking.)

### Rule Compliance (lang-review/typescript.md)

- **#17 (comment asserts a mechanism nobody re-ran):** VIOLATIONS — findings 1, 3, 4, 5 (self-contradicting docstring/comment; drifted citations).
- **#19 (population filtered by a neighbouring field):** VIOLATION — finding 2.
- **#24 (retirement left standing):** VIOLATIONS — findings 1, 4.
- **#4/#21 (nullish vs degenerate):** COMPLIANT — `?? []`/`?? 0` on legitimately-optional fields; wrap safe under the clamped `dt`.
- **#14 (derived edge in one branch):** COMPLIANT — `reached` gated once (see VERIFIED).
- **#15/#18/#26/#29 (test quality of the new suite):** COMPLIANT — mutation-worthy, magnitude-carrying, non-circular, live controls.
- **#1/#2/#5 (type-safety/generics/modules):** COMPLIANT — `as Vec3` matches existing convention; `import type` correct; no `any`/`Record<string,any>`.
- **core/shell boundary:** COMPLIANT.

### Devil's Advocate

Argue the code is broken. First, the **wrap could strand an object behind the cockpit**: `raw > 0 ? raw : raw + SEQ_SPAN` corrects by exactly one span, so a frame with `step > SEQ_SPAN` leaves `raw + SEQ_SPAN` still ≤ 0 and a turret sits at negative depth in `turrets`, drawn behind the camera and mis-hit-tested. Refuted: `src/shared/loop.ts` clamps `dt` to 0.25s, capping `step` at ~5250 ≪ 32768; no real or tested frame reaches it. Second, the **fire cadence could collapse** now that `turrets` spans the whole ring (near AND far, to depth 32768): a uniform `nextInt(rng, armed.length)` pick often selects a far tower whose fireball expires before arrival, diluting incoming fire. Refuted as a regression: the pre-pt1-21 single-pass field ALSO included far un-culled objects in `turrets`, so the distribution is unchanged in kind; the real net change is MORE total fire (every lap fires, not just pass 0), which is harder and more faithful, not a softening. Third, a **revealed-late tower fires with no grace beat**: `dormant` objects age while waiting, so on promotion `age >> TOWER_FIRE_GRACE` and they fire instantly. Refuted as a regression: before pt1-21 the same seq-gated tower was present-but-not-firing and aged identically, firing the instant `gdSeq` reached it — the timing is unchanged (surface-awakening pins it). Fourth, a **malformed save with `seq = NaN`** makes `gdSeq >= NaN` forever false, stranding that object dormant — real but pre-existing (the `?? 0` idiom), no attacker-controlled save format in a client-only game, out of scope. Fifth, **`surfaceDormant` could leak across waves** — refuted: `enterPhase` resets it to `[]` on every entry (sim.ts:2076). The genuine problems the devil surfaces are all in the DOCUMENTATION layer, which is exactly what the findings above capture.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Reviewer (audit)
- **No `## Design Deviations` were logged by TEA or Dev.** Two spec-adjacent decisions are documented
  in the Dev Assessment and TEA Delivery Findings instead, and I audit them here:
  - **The ROM's final "blanked pass" (clear towers at GD.SEQ>=5, fly one blank pass, THEN trench) is
    NOT implemented** — `phaseCleared` transitions at `gdSeq >= 5` immediately. → ✓ ACCEPTED: TEA
    deliberately did not pin it (render nicety, would over-fit the exit); out of the story's
    presence+lapping scope. Candidate for a future story, not a defect.
  - **`surfaceDormant` is OPTIONAL (`?: Turret[]`), not required.** → ✓ ACCEPTED: matches the
    codebase's established back-compat idiom for `age`/`kind`/`seq`/`turrets` (all `?? default`), so
    pre-pt1-21 saves and hand-placed fixtures deserialize without the field. Read once via `?? []`.
  - **`surface-maze-field.test.ts` "lays the FULL field" re-scoped to count `turrets + surfaceDormant`
    and `surface-awakening.test.ts` "spans >1 sequence" re-pointed to maze DATA.** → ✓ ACCEPTED: both
    preserve the original guard's INTENT (no half-field soft-lock; the maze stages) while honoring the
    new staged-reveal split; neither weakens coverage (the union check still reddens on a lost object).

## Subagent Results

**Cycle: 1**

Method: **targeted re-verification of the 5 characterized round-1 findings** (the gate accepts this in place of a fresh sweep, and it is stronger evidence for known findings). The rework touched only comments, one docstring, and test premises — NO behavior change — so the preflight and security DOMAINS are re-confirmed directly (full suite + purity/strobing surface) rather than re-dispatched.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes — re-verified | clean | none | full star-wars suite 2443/2443 green, lint clean, comment-citation gate 0 |
| 2 | reviewer-edge-hunter | No | Skipped | N/A | Disabled via settings — no code-path change this round |
| 3 | reviewer-silent-failure-hunter | No | Skipped | N/A | Disabled via settings — no code change this round |
| 4 | reviewer-test-analyzer | No | Skipped | N/A | Disabled via settings — the re-scoped surface-awakening test re-verified non-vacuous (see below) |
| 5 | reviewer-comment-analyzer | No | Skipped | N/A | Disabled via settings — comment fixes re-verified against true lines |
| 6 | reviewer-type-design | No | Skipped | N/A | Disabled via settings — no type change this round |
| 7 | reviewer-security | Yes — re-verified | clean | none | doc/test-only rework; no new purity/degenerate/strobing surface introduced |
| 8 | reviewer-simplifier | No | Skipped | N/A | Disabled via settings — no logic change this round |
| 9 | reviewer-rule-checker | Yes — re-verified | resolved | 5 → 0 | all five round-1 findings fixed and re-verified against the working tree (below) |

**All received:** Yes (3 enabled re-verified; 6 disabled via settings)
**Total findings:** 0 open (5 round-1 findings all resolved), 0 dismissed, 0 deferred

**Per-finding re-verification (all against the current working tree):**
- **F1** `tie-waves-past-plan.test.ts:19` → `state.ts:972` — `SPACE_PHASE_END_S` confirmed at state.ts:972. ✓
- **F2** `surface-traversal-end.test.ts:371/377` → `liveShots` confirmed at sim.ts:1229, `loseShield`/`lives` at 1238-1239, `const scrollSpeed` at 1073, terrain scrape at 1056-1060 — the whole sw8-21 block is now internally consistent with its own header. ✓
- **F3** `state.ts towersForWave` docstring — now "FIXED tower set (pt1-21 re-flies it across ~5 staged laps…)", no longer "single-pass". ✓
- **F4** `surface.test.ts:167` — now "a staged RING that re-flies across ~5 laps"; the `<= cap` bound kept. ✓
- **F5** `surface-awakening.test.ts:126-138` — re-scoped onto the `turrets + surfaceDormant` union; asserts `laid.length === entries.length` AND `Set(seq).size > 1`, so it now covers every laid object and reddens if stamping collapses to seq-0 (non-vacuous). ✓
- **comment-citation gate (`checkTree`):** 0 stale. **Full suite:** 2443/2443. **audit-tree:** same untracked sm-setup `context-story-pt1-21.md` (false-DIRTY, exits 0); `git status --porcelain` shows it alone — no source mutation.

## Reviewer Assessment

**Verdict:** APPROVED
**Round:** 2
**Round-Trip Count at approval:** 1

**[RULE]** all five round-1 rule-checker findings (#17/#19/#24) are fixed and re-verified (F1-F5 above); rule-checker re-verification returns **0 open**. **[SEC]** reviewer-security's domain is re-confirmed clean — the rework changed only comments/docstring/test premises, adding no purity, degenerate-input, or strobing surface; the pre-existing NaN-seq note stays out of scope.

All five round-1 findings — every one a documentation / citation / test-premise accuracy issue, four of them self-inflicted by the GREEN diff's line shifts — are fixed and independently re-verified against the working tree. The comment-citation gate is clean, the re-scoped `surface-awakening` test is now non-vacuous across the full seq range, and the sw8-21 citation block is internally consistent. No new findings surfaced; the behavior (correct and fully tested at round 1) is unchanged this round — the rework was comments, one docstring, and test premises only.

**The code itself was already sound at round 1** and remains so: purity holds (core/shell boundary, `dt`/seeded-RNG only), presence is gated once via `reached()` and inherited by every consumer including the shell renderer, killed towers stay dead across laps, and the new suite is genuinely mutation-worthy (magnitude assertions, live controls, non-circular counts). The staged multi-pass reveal faithfully restores the ROM's five-lap traversal (WSGRND.MAC:738-742 presence skip; WSMAIN.MAC:2537-2547 M$TX wrap; `GD.SEQ >= 5` termination).

**Carried forward (non-blocking, documented, accepted):**
- The ROM's final "blanked pass" is not implemented (instant transition at `gdSeq >= 5`) — TEA-scoped-out render nicety; a future-story candidate.
- Pre-existing citation debt in the sw8-21 block's DISPATCHER/space refs (`:221`, `:210`, `:345-350`, `:676`, `:705`) predates pt1-21, references code this diff did not move, and is left for a separate citation-cleanup pass — out of this story's scope.
- The pre-existing orchestrator red (`sprint/epic-pt1.yaml:259` unquoted-hash in the pt1-21 DESCRIPTION) is a sprint-data lint, unrelated to the code; the finish flow / SM owns it.

**Verdict rationale:** no Critical/High findings; the round-1 Medium/Low documentation findings are all resolved and re-verified. Ready for finish.