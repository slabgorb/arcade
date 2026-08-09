---
story_id: "sw10-2"
jira_key: "sw10-2"
epic: "sw10"
workflow: "tdd"
---
# Story sw10-2: Surface turret fire rides surfaceScrollZ — mirror the trench wall-gun scroll-carry fix (sim.ts:1139)

## Story Details
- **ID:** sw10-2
- **Jira Key:** sw10-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 3
- **Priority:** p2
- **Type:** bug

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-09T22:10:53Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-09T20:26:48Z | 2026-08-09T20:29:24Z | 2m 36s |
| red | 2026-08-09T20:29:24Z | 2026-08-09T20:58:19Z | 28m 55s |
| green | 2026-08-09T20:58:19Z | 2026-08-09T21:24:12Z | 25m 53s |
| review | 2026-08-09T21:24:12Z | 2026-08-09T21:43:07Z | 18m 55s |
| green | 2026-08-09T21:43:07Z | 2026-08-09T21:46:53Z | 3m 46s |
| review | 2026-08-09T21:46:53Z | 2026-08-09T22:10:53Z | 24m |
| finish | 2026-08-09T22:10:53Z | - | - |

## Story Context

### Bug Summary
The surface phase models the pilot's forward flight as ground scrolling toward the ship at `scrollSpeed`, accumulated into `state.surfaceScrollZ` (sim.ts:1068). Surface objects/turrets ride that scroll. However, surface turret/tower/bunker enemy fire spawns with a plain aim-at-ship velocity that does NOT carry the surface scroll in depth — the same class of frame-consistency bug the trench had (PR #125), where the world rushes past ~50× faster than the ~300 u/s muzzle speed and "the player outruns the bullet."

### Reference Work (Already Shipped)
- **Trench fix:** `gameRules.trenchGunFireVelocity(gunPos, shipPos)` (gameRules.ts:84) — depth component IS the scroll (negative, closing on cockpit), lateral/vertical components LEAD the ship.
- **Trench degenerate guard:** gun at/past the plane (depth≤0) fires straight at the ship at scroll speed.
- **Trench swept collision:** `gameRules.sweptCollides` handles fast closing (> hit sphere).
- **Reference test:** `plugins/star-wars/tests/core/trench-fire-scroll-carry.test.ts`

### Files in Play (Core Boundary: src/core is pure sim, no clock/render)
- **plugins/star-wars/src/core/sim.ts** — surface turret fire block ~line 1132-1147 (muzzle + `vel:` line to fix); `surfaceScrollZ` accumulation at ~1068
- **plugins/star-wars/src/core/gameRules.ts** — likely new `surfaceGunFireVelocity` (or reuse/generalize `trenchGunFireVelocity`) mirroring trench helper; verify surface scroll speed constant vs TRENCH_SCROLL_SPEED
- **New test:** `plugins/star-wars/tests/core/` (RED→GREEN), modeled on trench-fire-scroll-carry.test.ts

### Watch-outs (Citation/Audit Gates)
- **Line-anchor reachoring:** editing sim.ts/gameRules.ts shifts comment-cited line#s (checkTree gate) — expect citation reanchoring
- **Proof the bug reproduces:** TEA must write a failing test FIRST that proves surface turret fire uses stale muzzle velocity. Verify surface scroll actually advances muzzle each frame (don't assume symmetry with trench)
- **Suite baseline:** whole star-wars suite was ~2361 tests green after trench fix; keep it green

### Acceptance Criteria (TEA + Dev to define in RED)
- RED: test surfaces turret fire muzzle velocity carries `surfaceScrollZ` depth component
- RED: test the shot reaches the ship at the same instant its depth reaches the cockpit plane (lateral/vertical lead)
- RED: test degenerate guard — gun at/past plane (depth≤0) fires straight at scroll speed
- Dev (GREEN): implement `surfaceGunFireVelocity` or generalized helper
- Dev (GREEN): apply to surface turret fire spawn (sim.ts ~1139)
- Optional (TEA + Dev): if closing speed > hit sphere, determine whether swept collision is needed (same as trench)
- All tests pass; citation gates green; orchestrator suite stays green

## Sm Assessment

Setup complete and the story is clean to start. Both sibling probes (pushed remote branch, cross-checkout session sweep) came back empty before setup, and the merge gate's one blocker — an orphaned finish-ceremony chore PR (#170) for mc5-7, code already merged via #167 — was merged (bookkeeping only) to clear it; `develop` was then fast-forwarded to origin. The claim (in_progress stamp + context file) is committed and pushed on `feat/sw10-2-surface-turret-fire-scroll-carry`, so the story is visible to siblings.

Scope is well-bounded: this is the audit's explicit §7 open item — surface turret fire is the direct analog of the already-shipped trench wall-gun scroll-carry fix. The pointer read `setup` on arrival, with a single clean pointer in the tracking block.

The one genuine risk is handed to TEA, not resolved here: do NOT assume the surface phase carries objects on a depth scroll the same way the trench does. RED must PROVE the bug reproduces in a failing test before any fix — if the surface geometry doesn't scroll depth like the trench, the "mirror the trench" fix could be a no-op. This is TEA's call in RED.

Routing: tdd (phased) → TEA for the RED phase.

## Tea Assessment

**The bug is real and reproduces — I proved it before writing the target contract.** The SM's watch-out ("don't assume the surface scrolls depth like the trench") is answered: `stepSurface` DOES scroll the whole field in depth each frame (`sim.ts:1092`, `pos.x -= scrollSpeed·dt`), the muzzle rides that scroll, but the fire velocity (`sim.ts:1144`) is a bare `normalize(ship−muzzle)·ENEMY_SHOT_SPEED` (300 u/s) while the scroll runs 5,250→21,000 u/s. So the shot creeps at 17–70× under the world — the trench bug, one phase over. Not a no-op.

**RED verified directly (not via the runner):** full star-wars project = 5 failing / 2386 passing, `npm run lint` clean. The 5 reds are the complete, intended footprint.

### The three new guards (`tests/core/surface-fire-scroll-carry.test.ts`)
1. **Depth rides the scroll** — a fired shot's `vel[0] ≈ −s.surfaceScrollSpeed` (reads the actual ramped speed off the returned state), i.e. `≫ ENEMY_SHOT_SPEED`. Today it's ≈ −300.
2. **Lead** — an off-axis tower's shot, integrated over its transit (`depth/scroll`), arrives on the flying ship (`eyeOf(s)`), not near the muzzle. Today it barely moves.
3. **Swept, no tunnelling** — a dead-on incoming shot at `SURFACE_MAX_SPEED` leaps ~350 u/frame > the 160u cockpit diameter; it must still register a `turret` death and be consumed. Today the point test at `sim.ts:1198` tunnels it. **This resolves AC#6: swept IS required** — the surface hit must move to `sweptCollides`, exactly as the trench did (`sim.ts:1479`).

### Coupled tests moved onto the new contract (the fix-regression meta-check, checklist #13)
Two tests pinned the *superseded* straight-at-ship velocity and are now RED under the new contract, with their surviving intent preserved:
- `surface-aim-wysiwyg.test.ts` → "aims a tower fireball at the ship point, not at the origin" (still discriminates ship-vs-origin, now via the lead's arrival).
- `hitscan-laser.test.ts` → "…launches from the tower cap and flies AT the ship (sw7-16 stands)" (still asserts cap-launch + convergence on the pilot).
Dev's GREEN flips all 5 together. **This is the sw10-1-lens-vs-uf1-14 pattern: AC#7 "suite stays green" is FALSE without these two — the change to the fire model necessarily rewrites what they assert.**

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)
- **#8 test quality** — every assertion reads a real value and has a belt-and-braces discriminator (the swept test asserts `leap > diameter`; the lead tests assert the muzzle is genuinely off-axis / above the pilot).
- **#13 fix-introduced regression** — the two coupled tests above are exactly this check; handled in RED, not left for Dev to discover mid-GREEN.
- **#20 / #26 non-circular** — tests key off `s.surfaceScrollSpeed` (which the fix does NOT change — scroll speed is independent of fire velocity) and cross-check against `ENEMY_SHOT_SPEED` / `COCKPIT_HIT_RADIUS`, so no term is self-referential to the fix.
- **#21 degenerate input** — AC#3's `depth ≤ 0` guard is **unreachable in surface play**: the ship sits on the cockpit plane (`surfaceShip = [0,0,alt]`, depth 0) and turrets are culled at `pos.x ≤ 0` before they can fire, so no in-sim shot ever has `depth ≤ 0`. I deliberately did NOT write a behavioural test for it (it can't be triggered) nor force a helper's internal API for it. If Dev **generalizes `trenchGunFireVelocity`** the guard comes for free and is already unit-tested by the trench suite — the recommended path.

### Handoff to Dev (GREEN)
- Fix `sim.ts` surface fire (~1139-1146): depth component `= −scrollSpeed` (THIS frame's ramped `scrollSpeed`), laterals lead the ship. Prefer **generalizing `gameRules.trenchGunFireVelocity`** to take the scroll speed (trench passes `TRENCH_SCROLL_SPEED`, surface passes `scrollSpeed`) over a parallel copy.
- Make the surface cockpit hit **swept** (`sim.ts:1197-1198` → `sweptCollides`, mirror `sim.ts:1479`).
- **Stale comment** (checklist #17, Reviewer will flag): `sim.ts:362-365` "Surface/trench fire still flies straight … the trench carries no fire" is now doubly false — update it. Note the frozen audit citation in `pair-trench.json` that quotes "the trench carries no fire" reads the **audit commit's blob**, not the working tree, so editing the comment does NOT redden the citation gate.
- **Reanchor tax** (context + memory): editing `sim.ts` shifts the comment-citation line anchors (`checkTree`) and the sw8-27 anchors — expect to reanchor after the edit.

## Delivery Findings

No upstream findings.

### Reviewer (code review)
- **Gap** (non-blocking): pre-existing citation drift in `plugins/star-wars/tests/core/surface-traversal-end.test.ts` — `:221`/`:210` (gameover dispatcher is at :225, not :221/:210), `:1050` (`const scrollSpeed` is at :1067), `:1000-1004` (terrain scrape is at :1050-1054). Verified stale on `origin/develop`, so NOT introduced by sw10-2; recommend a dedicated citation-hygiene pass so the freshly-reanchored paragraph is not read as wholly re-verified. *Found by Reviewer during code review.*
- **Gap** (non-blocking, round 2): the round-2 re-review widened the pre-existing bare-`:N` drift list in `plugins/star-wars/tests/core/surface-traversal-end.test.ts`. comment-analyzer + rule-checker (both cross-checked against `git show develop:`/`83871e64^`) confirm these predate sw10-2 and sit in `sim.ts` regions this diff never edited, so none is attributable to this story: `:1050`→`:1067` (test 372), `:1000-1004`→`:1049-1054` (test 374), `:221`→`:225` (test 293, 313), `:210`→`:225` (test 426), `:345-350`→`:367-403` phase dispatch (test 427), space `loseShield` `:676`→`:717` and gate `:705`→`:746` (test 295-296), `:1043-1047`→`:1050-1054` (test 344). All are bare `:N` and evade the mechanical `check-comment-citations` sweep (which reports 0 stale) — exactly the rule #17/#24 blind spot. A single citation-hygiene story should reanchor the whole file. *Found by Reviewer during round-2 code review.*

### Dev (implementation)
- **Improvement** (non-blocking): the shared fire-velocity helper is still named `trenchGunFireVelocity` but now serves the surface too (via the added `scrollSpeed` param). A phase-neutral rename (e.g. `scrollGunFireVelocity`) would read truer at the surface call site. Affects `plugins/star-wars/src/core/gameRules.ts` (export + JSDoc), `sim.ts` (2 callers), `tests/core/trench-fire-scroll-carry.test.ts` (import) and one audit-doc mention. Left as-is per minimalist scope — TEA's guidance was "generalize `trenchGunFireVelocity`", which reads as keep-the-name. *Found by Dev during implementation.*
- **Gap** (non-blocking): TEA's RED footprint was stated as "5 failing", but a THIRD coupled test (`hitscan-laser.test.ts` → "a tower fireball travels, frame over frame, at ENEMY_SHOT_SPEED") also pinned the superseded muzzle velocity and went red under the new contract. Moved onto the new contract in GREEN (see deviation below). Affects `plugins/star-wars/tests/core/hitscan-laser.test.ts`. *Found by Dev during implementation.*

## Design Deviations

### Dev (implementation)
- **Moved a third coupled test onto the new fire contract (beyond TEA's stated RED footprint)**
  - Spec source: Tea Assessment (session file), "Coupled tests moved onto the new contract" + "RED verified directly … 5 failing"
  - Spec text: TEA named exactly two coupled tests (`surface-aim-wysiwyg.test.ts`, `hitscan-laser.test.ts` "…launches from the tower cap and flies AT the ship") and pinned the red footprint at 5.
  - Implementation: A third test, `hitscan-laser.test.ts` > "a tower fireball travels, frame over frame, at ENEMY_SHOT_SPEED", also pinned the superseded `ENEMY_SHOT_SPEED*DT` per-frame travel and reddened under the fix. Retitled it and moved it onto the new contract, preserving its describe-block surviving intent (the fire is a real *travelling* object, not hitscan): asserts the shot MOVED (> 0) and now rides the scroll (> ENEMY_SHOT_SPEED*DT*5), and still burns ttl down. Dropped the now-false exact `ENEMY_SHOT_SPEED*DT` figure (the scroll magnitude is covered by `surface-fire-scroll-carry.test.ts` #1).
  - Rationale: Same fix-introduced-regression class (typescript.md #13) as the two TEA already moved; my velocity change necessarily breaks the bare-muzzle-speed assertion. Preserving surviving intent is the correct TDD move.
  - Severity: minor
  - Forward impact: none — the anti-hitscan guarantee (enemy fire stays a projectile, `advance()` survives) is intact; only the superseded speed figure was dropped.
- **Generalized `trenchGunFireVelocity` with an optional `scrollSpeed` param rather than a rename or a parallel copy**
  - Spec source: Tea Assessment, "Prefer generalizing `gameRules.trenchGunFireVelocity` to take the scroll speed … over a parallel copy"
  - Spec text: "trench passes `TRENCH_SCROLL_SPEED`, surface passes `scrollSpeed`"
  - Implementation: Added a third parameter `scrollSpeed = TRENCH_SCROLL_SPEED`; trench callers/tests pass nothing (unchanged), surface passes this frame's ramped `scrollSpeed`. Kept the `trenchGunFireVelocity` name (no rename cascade). The AC#3 degenerate guard (`depth <= 0`) comes for free and stays trench-unit-tested, exactly as TEA recommended.
  - Rationale: The optional param is the least-churn generalization that keeps the trench suite and the frozen audit prose valid; matches TEA's stated preference.
  - Severity: minor
  - Forward impact: none — behaviour identical for trench callers; the name is a non-blocking readability note (see Delivery Findings).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/star-wars/src/core/gameRules.ts` — `trenchGunFireVelocity` generalized to take an optional `scrollSpeed` (defaults to `TRENCH_SCROLL_SPEED`); JSDoc updated for both phases.
- `plugins/star-wars/src/core/sim.ts` — surface turret fire now spawns with `trenchGunFireVelocity(muzzle, ship, scrollSpeed)` (rides the ramped scroll + leads the ship); surface cockpit hit moved from a point `collides` to `sweptCollides` over the frame step; stale `stepGame` comment corrected; removed now-unused `ENEMY_SHOT_SPEED`/`normalize` imports.
- `plugins/star-wars/src/core/coaching.ts` — reanchored the sim.ts branch/death-site citations shifted by the edits (227→225, 1267/1535/1708→1271/1539/1712).
- `plugins/star-wars/tests/core/hitscan-laser.test.ts` — third coupled test moved onto the new contract (see deviation).
- Citation/line-fixture reanchors (the sim.ts reanchor tax): `tests/audit/sw8-27-remediation.test.ts` (death-site line fixtures), `tests/core/{coaching-clears-on-death,gun-visibility-and-shape,surface-traversal-end,tie-waves-past-plan,tie-waves-rom}.test.ts`, `docs/superpowers/specs/2026-07-16-surface-gunnery-and-traversal-design.md`.

**Tests:** GREEN — full star-wars project **2391/2391** passing; orchestrator suite **455/455**; `npm run lint` (tsc --noEmit) clean. The three RED guards in `surface-fire-scroll-carry.test.ts` + all coupled tests pass. Comment-citation `checkTree` = 0 stale.

**Verification:** Ran directly (full vitest project, orchestrator suite, lint, and the citation checker) rather than via `testing-runner` — the direct output is complete and unambiguous, and there is no pre-existing develop-red to misattribute. Evidence above.

**Branch:** feat/sw10-2-surface-turret-fire-scroll-carry (pushed)

**Handoff:** To review phase (Obi-Wan Kenobi / Reviewer).

## Subagent Results (round 1 — superseded)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (all green: lint pass, 2391 sw + 455 orch, 0 stale, no smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 (2 High, 1 Medium) | confirmed 2, deferred 1 (pre-existing) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 confirmed (+1 pre-existing noted) | confirmed 1 (corroborates #5); challenged its "compliant" call on `:1227-1232` |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 2 confirmed (blocking), 0 dismissed, 4 deferred (pre-existing citation drift, non-blocking)

### Cross-subagent reconciliation
- **comment-analyzer vs rule-checker on `sim.ts:1227-1232`:** comment-analyzer flagged it stale; rule-checker listed it "compliant, re-anchored." **I sided with comment-analyzer, verified independently:** my diff did NOT reanchor `:1227-1232` (grep confirms test line 283 still reads `:1227-1232`); on `origin/develop` the gated `finishGround` push sat at 1233 with its `if` gate at 1228-1232, and my +4 shift moved the gate to 1232-1236 / the push to 1237, so `:1227-1232` now lands on explanatory comment. **CONFIRMED stale.** The rule-checker erred here.
- **Both subagents + my own develop-baseline check agree** on `sim.ts:1191-1198` (liveShots block, now 1201-1208). CONFIRMED.
- **security + rule-checker + my own analysis agree**: no numeric-safety / degenerate-input / NaN / purity issue in the core change.

## Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md` — 26 checks)

Exhaustive enumeration against the changed `.ts` (rule-checker ran all 26 over 47 instances; I re-verified the load-bearing ones):

- **#4 (?? vs ||):** `sim.ts:1202` `s.vel ?? ZERO` — COMPLIANT (`??`, and `0` is a valid vel that must not trigger fallback; mirrors trench `:1479`).
- **#14 (edge in one branch):** muzzle-vel assign (~1145) and swept `.filter` (~1201) are each a single write at stepSurface's one exit — COMPLIANT.
- **#15/#18/#26 (guard quality / self-referential):** the 3 new guards in `surface-fire-scroll-carry.test.ts` are **mutation-verified** (rule-checker reverted sim.ts and each reddens exactly its target); terms trace to production outputs (`s.surfaceScrollSpeed`, `eyeOf(s)`, `ENEMY_SHOT_SPEED`), not test-local literals; test-3 asserts its own fixture tunnels a point test before trusting swept — COMPLIANT (exemplary).
- **#17 (comments assert a mechanism nobody re-ran):** the reworded sim.ts comments (359-365, 1141-1145, 1195-1200) and gameRules JSDoc are all TRUE and numerically exact (17-70× = 5250/300..21000/300; 350 u/frame = 21000/60; 160 = COCKPIT_HIT_RADIUS×2) — COMPLIANT. **VIOLATION: `surface-traversal-end.test.ts:371` `:1191-1198`** (see finding R1).
- **#20 (quantity from an artifact the same diff changes):** the 17-70× / 350 figures computed against post-diff constants — COMPLIANT.
- **#21 (degenerate-but-not-nullish):** `scrollSpeed` reaching `trenchGunFireVelocity` is always > 0 (seeded `SURFACE_SEED_SPEED`, monotonically ramps; trench passes the nonzero constant); `depth<=0` guard fails closed — COMPLIANT.
- **#22 (reject-vs-accept NaN safety):** `sweptCollides`/`collides` unchanged, both accept-style `<=` (fail closed); the swap `collides→sweptCollides` only changes the argument shape — COMPLIANT.
- **#24 (retirement applied where named and nowhere else):** the retired surface `ENEMY_SHOT_SPEED` muzzle model has no surviving pinned test (space `homing-fireball` legitimately keeps it); all LIVE reanchors (coaching.ts, sw8-27 fixtures, 4 test files, 1 doc) verified byte-correct; HISTORICAL ROM/audit citations correctly left untouched. **VIOLATION: the citation sweep was incomplete** — `:1191-1198` and `:1227-1232` left stale while siblings 6 lines away were fixed (see R1/R2). This is the exact "a mechanical re-anchor skips a bare `:N` silently" case rule #24 names.
- **#25/#26:** sw8-27 `deathSites()` mechanism unchanged (only its self-derived fixtures reanchored, file 22/22 green) — COMPLIANT.
- **core/shell purity (star-wars CLAUDE.md):** no DOM/Date.now/Math.random/rAF; all time via `dt`, randomness via seeded rng; no shell import — COMPLIANT.
- All other checks (#1-3,#5-13,#16,#19,#23): N/A or COMPLIANT (no `as any`, no enums, no async, no JSX, no external input).

## Independent checklist
- [VERIFIED] Data flow: turret `pos` → `armed` filter → `trenchGunFireVelocity(muzzle, ship, scrollSpeed)` → `enemyShots[].vel` → `advance()` (linear) → `sweptCollides` cockpit test → `player-death cause 'turret'`. Safe: no external input on the path; all values internal `GameState`. Evidence: `sim.ts:1135-1148`, `:1201-1208`.
- [VERIFIED] Swept segment correctness — `sub(s.pos, scale(s.vel ?? dt))` reconstructs the pre-step position because `advance` (`sim.ts:2085-2090`) preserves `vel`; a freshly-spawned (not-yet-advanced) shot extrapolates backward, further downrange — harmless. evidence: `sim.ts:1202`, `:2089`.
- [VERIFIED] No `/0`, no `NaN`-open: `scrollSpeed>0` at both callers, `depth>0` in surface (turrets culled at `pos[0]<=0`), predicate fails closed. Corroborated by reviewer-security.
- [RULE] Two stale citations introduced by this diff (R1/R2) — CONFIRMED, blocking.
- [DOC] Same two, from comment-analyzer — CONFIRMED.

### Devil's Advocate
Argue the code is broken. **Attack 1 — the lead blows up near the plane.** A turret armed at depth ε (just above the `pos[0]>0` cull) fires: `t = ε/scrollSpeed → 0`, so the lateral/vertical lead components `→ ∞`. The shot leaves with an enormous sideways velocity. Could it NaN or overflow? No — ε is a finite positive float, scrollSpeed finite positive, so the components are large-but-finite; the swept segment that frame still passes through the cockpit plane at the ship point by construction. And this is the identical math the shipped trench wall-gun uses, so it is not a new failure mode. **Attack 2 — a fast shot tunnels laterally.** At SURFACE_MAX_SPEED the depth step is ~350 u/frame; if the lateral lead is also huge (Attack 1), could the swept SEGMENT bow around the 80 u sphere and miss? The segment is a straight line from pre- to post-step; `sweptCollides` tests the true closest point on that segment, and the lead is sized so the line passes through the ship at depth 0 — so the crossing frame's segment contains the ship point. A miss requires the pilot to MOVE between spawn and arrival (a climb/dive mid-transit), which is realistic aiming error, not a bug, and identical to trench behaviour. **Attack 3 — a confused reader.** The stale `:1191-1198`/`:1227-1232` citations send a maintainer 4-9 lines off the code they describe — the concrete harm, and exactly why R1/R2 block. **Attack 4 — shots never culled past the cockpit.** Surface `liveShots` returns `true` for non-hits (no `pos[0]>=0` cull, unlike trench), so a shot that zooms past the pilot lives until ttl — but it is behind him, moving away, uncollidable; pre-existing behaviour, out of scope. Nothing here is a shippable behavioural defect; the blockers are the citations.

## Design Deviations

### Reviewer (audit)
- **Dev deviation "Moved a third coupled test onto the new fire contract"** → ✓ ACCEPTED by Reviewer: correct handling of a fix-introduced regression (rule #13); the rewrite preserves the describe-block's anti-hitscan surviving intent and the rule-checker mutation-confirmed the guard set is targeted. Sound.
- **Dev deviation "Generalized `trenchGunFireVelocity` with an optional `scrollSpeed` param"** → ✓ ACCEPTED by Reviewer: matches TEA's stated preference; security + rule-checker + my own analysis confirm no degenerate/NaN/divide-by-zero exposure and the trench path is behaviourally identical (default arg). The name-vs-behaviour note is a non-blocking follow-up, already logged by Dev.
- **UNDOCUMENTED (found in review):** the citation reanchor sweep was INCOMPLETE — `surface-traversal-end.test.ts` `:1191-1198` and `:1227-1232` were shifted +4 by this diff but not reanchored, while their siblings in the same comment block were. Spec/house-rule #24 requires the sweep be complete in the same diff. Severity: High (introduced by this diff; rule-matching). This is R1/R2 below.

### Reviewer (audit — round 2)
- Round-2 rework (`a4472d73`) logged "No spec deviations this round" — confirmed: the diff is exactly two comment-line citation edits + a status bump, no code/assertion/behaviour change. **Nothing new to audit.** The two round-1 Dev deviations remain ✓ ACCEPTED (stamped above). R1/R2 (the round-1 UNDOCUMENTED finding) are now RESOLVED — see round-2 assessment.

## Reviewer Assessment (round 1 — REJECTED, superseded by round 2 below)

**Verdict:** REJECTED

The core change is correct, pure, NaN-safe and mutation-verified — but this diff performed a line-citation reanchor sweep and left two citations in the same comment block stale, the precise rule #24 defect this subsystem (sw8-27) codified. Comment-only, so rework routes to Dev (green), not TEA.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [DOC][RULE] R1 | `:1191-1198` cites the `liveShots` bolt hit-test but this diff moved that block +4; it now lands on `standingTurrets`/header. Confirmed by comment-analyzer + rule-checker + develop-baseline check. | `plugins/star-wars/tests/core/surface-traversal-end.test.ts:371` | Reanchor `sim.ts:1191-1198` → `sim.ts:1201-1208` (the `const liveShots` `sweptCollides` block). |
| [HIGH] [DOC] R2 | `:1227-1232` cites "the gated push" (finishGround) but this diff moved the gate/push +4; it now lands on explanatory comment. Confirmed by comment-analyzer + develop-baseline check (rule-checker miscalled it compliant). | `plugins/star-wars/tests/core/surface-traversal-end.test.ts:283` | Reanchor `(:1227-1232)` → `(:1232-1237)` (the `if (lives>0 && …)` gate through the `events.push({type:'tune',tune:'finishGround'})`). |

**Dispatch tags:** [EDGE] disabled (no boundary findings sought) · [SILENT] disabled · [TEST] disabled — test quality assessed by reviewer + rule-checker (#8/#15/#18/#26 all COMPLIANT, guards mutation-verified) · [DOC] R1+R2 confirmed (comment-analyzer) · [TYPE] disabled — no type-surface change (one optional numeric param, checked #4/#21/#22 COMPLIANT) · [SEC] clean (reviewer-security) · [SIMPLE] disabled — change is minimal (optional-param generalization, no parallel copy) · [RULE] R1 confirmed (rule-checker, #17/#24)

**Not blocking (deferred — pre-existing citation drift, verified stale on `origin/develop`, NOT introduced or shifted-into-wrongness by this diff):** `surface-traversal-end.test.ts` `:221`/`:210` (the gameover dispatcher was at develop-227, so these never pointed at it), `:1050` (scrollSpeed is at 1067 — correctly cited elsewhere in the same file at test line 282), `:1000-1004` (terrain scrape is at 1050-1054). Recommend a separate citation-hygiene cleanup; a reader will otherwise assume the freshly-updated paragraph was wholly re-verified.

**Handoff:** Back to Dev (Yoda) for green rework — reanchor R1 + R2 only.
## Dev Rework (round 1 — review R1/R2)

**Rework complete:** Yes — comment-only, both blocking findings addressed.

- **R1** `surface-traversal-end.test.ts:371` — `sim.ts:1191-1198` → `sim.ts:1201-1208` (the `const liveShots` `sweptCollides` block; verified 1201=`const liveShots`, 1208=`})`).
- **R2** `surface-traversal-end.test.ts:283` — `(:1227-1232)` → `(:1232-1237)` (the `if (lives>0 && …)` gate through `events.push({type:'tune',tune:'finishGround'})`; verified 1232=`if (`, 1237=the push).

Both reanchor targets opened and confirmed; the sentences beside each citation remain true (rule #17 — the claim, not just the number, re-read). The pre-existing drift (`:221`/`:210`/`:1050`/`:1000-1004`) left untouched per the review's out-of-scope ruling — captured as a non-blocking Delivery Finding for a separate citation-hygiene pass.

**No spec deviations this round** — pure citation completion, no code/assertion/behaviour change.

**Verification:** checkTree = 0 stale · `npm run lint` clean · `surface-traversal-end` 23/23 · full star-wars **2391/2391** green.

**Branch:** feat/sw10-2-surface-turret-fire-scroll-carry (pushed)

**Handoff:** Back to review phase (Obi-Wan Kenobi / Reviewer).

## Subagent Results

Round-2 re-review of the citation-reanchor rework `a4472d73` (same subagent toggles).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (green: lint clean, star-wars 2391/2391, citations.test 12, comment-citations 41, sw8-27 22 — all pass; 0 code smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 8 (R1/R2 now CORRECT; 8 pre-existing stale bare-`:N` citations) | confirmed 0 blocking, deferred 8 (all pre-existing per `83871e64^`) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | R1 `:1201-1208` COMPLIANT + R2 `:1232-1237` COMPLIANT; 2 pre-existing #17/#24 violations noted (`:1050`, `:1000-1004`) | confirmed 0 blocking, deferred 2 (pre-existing, unattributable to this diff) |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 0 confirmed blocking, 0 dismissed, 8 deferred (all pre-existing citation drift on `origin/develop`, non-blocking)

### Cross-subagent reconciliation (round 2)
- **R1 `sim.ts:1201-1208` (liveShots) and R2 `sim.ts:1232-1237` (finishGround gated push):** comment-analyzer + rule-checker + my own read of the current `sim.ts` all agree — both land EXACTLY on the cited code (1201=`const liveShots`, 1208=`})`; 1232=`if (`, 1237=`events.push({type:'tune',tune:'finishGround'})`). The round-1 R1/R2 blockers are RESOLVED. Round-1's contested case (rule-checker had miscalled R2 "compliant") is now moot — R2 is verified correct by all three.
- **Remaining stale citations (test 372 `:1050`, 374 `:1000-1004`, plus 293/313/295/344/426/427):** comment-analyzer and rule-checker both confirm via `git show develop:`/`83871e64^` that these are identical on develop and sit in `sim.ts` regions this diff never edited — a citation was never correct cannot be "shifted into wrongness" by this story, so none is a rule-#24 obligation of sw10-2. Pre-existing, deferred to a citation-hygiene follow-up (Delivery Finding above).
- **security + rule-checker + preflight + my analysis agree:** no NaN/divide-by-zero/degenerate/purity issue; the swept-collision core change (already reviewed round 1) is sound and unchanged this round.

## Reviewer Assessment

**Verdict:** APPROVED

The round-2 rework (`a4472d73`) is a surgical, comment-only completion of the round-1 citation sweep, and it does exactly what was asked — no more, no less. Both blocking findings are verified fixed against the current `plugins/star-wars/src/core/sim.ts`:

- **R1 RESOLVED** — `surface-traversal-end.test.ts:371` now cites `sim.ts:1201-1208`, which is exactly the `const liveShots` swept hit-test block (1201 opens the filter, 1208 the closing `})`). Confirmed by comment-analyzer + rule-checker + my own read.
- **R2 RESOLVED** — `surface-traversal-end.test.ts:283` now cites `sim.ts:1232-1237`, exactly the `if (lives > 0 && …)` gate through `events.push({ type:'tune', tune:'finishGround' })`. The whole R2 comment paragraph is now internally consistent (scrollSpeed 1067 ✓, loseShield/lives 1210-1211 ✓, gated push 1232-1237 ✓).

Per the reviewer gotcha ("a citation-fixing rework can ship a FRESH wrong citation"), I read the *new* prose beside each reanchor and re-verified its cross-references against `sim.ts` directly — both sentences remain true, not just renumbered. No fresh lie introduced.

**Data flow traced:** turret `pos` → `armed` filter → `trenchGunFireVelocity(muzzle, ship, scrollSpeed)` → `enemyShots[].vel` → `advance()` → `sweptCollides` cockpit test → `player-death cause 'turret'`. Unchanged from round 1; safe (all values internal `GameState`, no external input). Evidence: `sim.ts:1201-1208`, `:1232-1237`.
**Pattern observed:** correct completion of a shift-driven reanchor (the rule-#24 bare-`:N` blind spot) at `surface-traversal-end.test.ts:283,371`.
**Error handling:** N/A this round (no behaviour change); the core swept-collision path's NaN-safe `s.vel ?? ZERO` (`sim.ts:1202`) remains compliant.

**Dispatch tags:** [EDGE] disabled · [SILENT] disabled · [TEST] disabled — preflight confirms the citation gates + full suite green (2391/2391), no assertion change this round · [DOC] R1+R2 confirmed RESOLVED by comment-analyzer; 8 pre-existing bare-`:N` citations deferred to a hygiene follow-up · [TYPE] disabled — no type-surface change · [SEC] clean (reviewer-security — bounded math, no NaN/divide-by-zero, purity preserved) · [SIMPLE] disabled — rework is two comment lines · [RULE] rule-checker confirms R1/R2 COMPLIANT and the two remaining #17/#24 violations are pre-existing, unattributable to this diff.

**Deferred (non-blocking, pre-existing — verified stale on `origin/develop`/`83871e64^`, NOT introduced or shifted-into-wrongness by sw10-2):** eight bare-`:N` citations in `surface-traversal-end.test.ts` (see Delivery Findings, round 2). These evade the mechanical `check-comment-citations` sweep (which is green) and warrant a dedicated file-wide citation-hygiene story — not a re-block on a 3-point comment-only rework whose own findings are fully closed.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.