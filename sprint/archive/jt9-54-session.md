---
story_id: "jt9-54"
jira_key: "jt9-54"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-54: homingWake (BOLEVB) runs on BOLAVA wakes; the ROM skips it (BRA BODIR3 past :3939-3945)

## Story Details
- **ID:** jt9-54
- **Jira Key:** jt9-54
- **Workflow:** tdd
- **Stack Parent:** none
- **PR:** #104 (merged to develop 2026-08-08)
- **Branch:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-08T12:36:36Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-08T11:58:16Z | 2026-08-08T12:00:02Z | 1m 46s |
| red | 2026-08-08T12:00:02Z | 2026-08-08T12:20:17Z | 20m 15s |
| green | 2026-08-08T12:20:17Z | 2026-08-08T12:26:01Z | 5m 44s |
| review | 2026-08-08T12:26:01Z | 2026-08-08T12:36:36Z | 10m 35s |
| finish | 2026-08-08T12:36:36Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA] Gap / non-blocking — the story's PRIMARY concern is already fixed by jt9-49.** The story was written against the code state at jt9-22 review, when `stepEnemyDetailed` called `homingWake(enemy, target)` UNCONDITIONALLY. jt9-49 (`4fad7d8c`, "scope the horizontal-homing throttle to a live level interval") since gated it: `const inLevelInterval = enemy.pjoy?.kind === 'interval'; const flipped = inLevelInterval ? homingWake(enemy, target) : enemy` (enemy.ts:1460-1461). A lava wake is `pjoy.kind === 'lava'`, so the throttle already does NOT run on it — measured firsthand (lava wake, matched snapshot, prdir=1 → prdir HELD at 1, facing HELD). **Dev must NOT re-implement a lava/throttle guard; it exists.** jt9-54's remaining, real work is GAP 2 below. AC-1 in the RED suite is the lava-angle REGRESSION LOCK jt9-49 never wrote (jt9-49 tested only seek/mount wakes) — green today, teeth proven by reverting the jt9-49 gate (throttle then ticks the lava wake).

- **[TEA] Gap / non-blocking — GAP 2 is the genuine RED (the airborne guard).** The lava-hold branch in `stepEnemyDetailed` (enemy.ts:1475-1482) runs the BOLAVA ping-pong with NO `airborne` re-check, unlike `steerWake` (which holds when `!entity.airborne`). Measured: a GROUNDED enemy carrying a BOLAV1 lava pjoy at/below the lava line, not rising, FLAPS and takes off (airborne false→true, velY 0→−128). Not reachable in normal play (no platform at `pixelY >= $D3`, BOLAVA absent from demo seeds), so this is a defensive boundary invariant — the "cheap airborne guard while here" the story asks for.

### Reviewer (code review)

- **Improvement (non-blocking):** the test at `plugins/joust/tests/joust-jt9-54-lava-throttle-and-airborne.test.ts:129` casts `r.enemy.pjoy as { kind: 'lava'; entry: string }`, widening `PjoyState`'s lava variant `entry: 'BOLAV2' | 'BOLAV1'` to `string`. Harmless — it only feeds `.toBe('BOLAV1')` — but `as Extract<PjoyState, { kind: 'lava' }>` would preserve the literal type. A LOW nit, not a block. Affects that one test line. *Found by Reviewer during code review.*
- **Improvement (non-blocking):** the grounded-hold path does `settled = homed`, keeping the lava `pjoy` indefinitely — a grounded lava enemy never self-clears via the BOLAV1 re-check the way the pre-guard coast arm did. Verified UNREACHABLE (a lava enemy exits via `lavaRecheckExits` on `velY < 0` while still airborne and below any platform — `PLATFORMS` max snapY is 210, below `$D3`=211 — so it cannot land while carrying the pjoy). No observable effect either way; recorded only so a future reader knows the hold-keeps-lava behaviour is intentional for an impossible state. Affects `plugins/joust/src/core/enemy.ts` lava-hold branch. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No design deviations.

### Reviewer (audit)

- No logged spec deviations to stamp. The Dev "false start" (first gating the whole branch on `airborne`, which fell through to the brain and launched the grounded bird) was an implementation iteration, not a spec deviation — the SHIPPED code (hold when grounded) matches the story's stated intent ("a cheap airborne guard ... analogous to steerWake", which returns `held` when `!airborne`). Verified no UNDOCUMENTED divergence: the moved else-arm is byte-identical to the pre-diff body (rule-checker #13, byte-diffed) and every ROM citation in the new comment re-verified against `JOUSTRV4.SRC`.

## Sm Assessment

Setup complete for jt9-54 — a 2-point TDD ROM-fidelity bugfix in joust, surfaced by the Reviewer during jt9-22 review.

**The defect:** `stepEnemyDetailed` in `plugins/joust/src/core/enemy.ts` runs `homingWake(enemy, target)` (the BOLEVB complement block, JOUSTRV4.SRC:3939-3945) unconditionally at the top of every wake. The ROM skips BOLEVB on a lava wake — BOLAVA (:3953) / BOLAV2 (:3958) / BOLAV1-flap all `BRA BODIR3` (:3946), branching *past* the BOLEVB block; only the level-flight path (BOLEV1/BOFAST/BOLEVA) falls into it. In the port, a lava wake still DECs PRDIR and can COM PFACE, spuriously reversing the facing mid-BOLAVA-episode.

**Scope for TEA:** RED test should pin that on a lava-pjoy wake, BOLEVB does not run (PRDIR/PFACE unchanged by the homing throttle), matching `BRA BODIR3`. The seed fixtures wrap PRDIR to 0xff on the 2nd lava wake → a flip is the observable symptom. Secondary (LOW): the lava-hold branch does not re-check `entity.airborne` — a cheap airborne guard is in scope while here, though not reachable in normal play.

## Tea Assessment

RED committed at `3168fb23` — `plugins/joust/tests/joust-jt9-54-lava-throttle-and-airborne.test.ts`.

**Before writing a line I verified the story's premise, and it is stale (see Delivery Findings).** The primary "runs unconditionally" defect was fixed by jt9-49; a lava wake already skips the throttle. So the RED suite splits into a regression LOCK (green, mutation-proven) and one genuine failure (the airborne guard):

**AC-1 — a lava wake skips BOLEVB (4 tests, GREEN — guard-backfill / regression lock).**
`pjoy.kind === 'lava'` wake, matched snapshot, `prdir=1`: `prdir` stays 1 for boundr+b2undr, bounder `facing` stays right, and a sanity test proves the lava ping-pong DID run (BOLAV2→BOLAV1) so the assertions aren't vacuous. jt9-49's suite pins throttle-scoping for SEEK and MOUNT wakes but never the LAVA angle — this is that lock. **Teeth are real:** I reverted the jt9-49 gate to the pre-jt8-2 unconditional `homingWake(enemy, target)` and re-ran — the lava wake then ticked `prdir 1→0` and flipped `facing 1→-1`. Restored the gate (`git diff` clean) before committing.

**AC-2 — the airborne guard (2 tests, 1 RED / 1 green).**
- **RED:** a grounded enemy carrying a BOLAV1 lava pjoy at `pixelY 0xd5` (≥ `LAVA_ESCAPE_Y` $D3), `velY 0`, must stay grounded — today `airborne` goes false→true (the flap launches it). This drives Dev.
- **Green companion:** a grounded BOLAV2 (coast) lava enemy already stays grounded — pinned so the guard doesn't regress the coast arm.

**Dev's job (GREEN):** add the airborne guard to the lava-hold branch in `stepEnemyDetailed` (enemy.ts:1475), analogous to `steerWake`'s `if (!entity.airborne) return held` — a grounded enemy must not be launched by the lava ping-pong. Do **not** touch the throttle gate (already correct — AC-1 must stay green). The change is in `src/core/`, so keep it deterministic and clock-free (purity-scanner applies).

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

| Rule / check | How covered |
|---|---|
| #13 fix-introduced regressions | AC-1 (green lock) reddens if Dev's guard disturbs the throttle scoping; AC-2 BOLAV2-green companion catches a guard that over-reaches into the coast arm. |
| #8 test quality — no vacuous assertions | Every test asserts a concrete value; the AC-1 sanity test proves the lava branch actually executed so the "held" assertions can't pass for the wrong reason. Self-checked: no `let _ =`, no `assert(true)`, no always-`undefined` reads. |
| core/ purity (joust `purity-scanner.test.ts`) | RED lives in `tests/`; the GREEN change is a pure `entity.airborne` read in `stepEnemyDetailed` — no I/O, no clock. Full suite re-run: 1 failed (the intended AC-2 RED) / 3163 passed; `npm run lint` clean. |

Routing to Dev for GREEN. She may not look stable, but she's got bugs where it counts.

## Dev Assessment

GREEN at `e4b20fa2`. One failing test (AC-2 BOLAV1) → passing; the full joust suite is 3164 green (incl. the purity scanner), `npm run lint` clean. AC-1 (the throttle regression lock) untouched and still green.

**The change** — `plugins/joust/src/core/enemy.ts`, the lava-hold branch in `stepEnemyDetailed` (~:1475). Added an airborne guard mirroring `steerWake`'s `if (!entity.airborne) return held`: when the enemy is grounded, the lava episode HOLDS — `decision = { dir: homed.facing, flap: false }`, `settled = homed` (coast, keep facing and the episode pointer, advance nothing). BOLAVA is airborne-only (entered solely by `lavaGateFires`, which requires a falling bird), so a grounded enemy is never in it; this is a defensive boundary invariant.

**A false start worth recording:** my first cut gated the whole branch on `airborne` so a grounded lava enemy fell THROUGH to the brain. That was worse — the brain launched the grounded bird (it chases the player above and flaps), reddening BOTH AC-2 cases. The faithful analog to `steerWake` is to HOLD in place, not re-decide. Measured, corrected, re-ran.

**Scope discipline:** did not touch the jt9-49 throttle gate (TEA's Delivery Finding was explicit — the primary concern is already fixed; AC-1 is a regression lock, not new work). The diff is the guard clause and nothing else.

**For the Reviewer:** the guard adds a branch inside the lava-hold arm — worth confirming the grounded-hold path can't strand an enemy (it can't arise in play; `lavaGateFires` requires airborne). The `homed.entity.airborne` read is pure/clock-free (purity scanner green). No new fixtures beyond the RED suite.

Handing to the Thought Police for review.

This is a `src/core/` simulation change, so the joust purity/core-boundary source-scan test applies — keep the guard deterministic and clock-free.

Routing to TEA for the RED phase. Everything proceeds according to the sprint plan.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (joust 3164 + orchestrator 408 + purity 47 green; lint clean; no smells) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A (every ROM citation + clause verified byte-for-byte vs JOUSTRV4.SRC) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A (pure logic; no eval/IO/secrets/casts) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 1 non-blocking nit | confirmed 1 (LOW test cast, deferred to Delivery Findings), dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned, all clean; 5 disabled via settings)
**Total findings:** 0 confirmed blocking, 1 confirmed non-blocking (LOW test-cast nit → Delivery Findings), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

A 2-point defensive `src/core/` guard. The premise was already the cleanest part of the story — TEA correctly caught that jt9-49 fixed the primary concern, so the real change is a single airborne guard on the lava-hold branch. Four enabled specialists (preflight, comment-analyzer, security, rule-checker) all returned clean; the rule-checker independently mutation-tested the guard (reverting it reproduces the exact `airborne false→true, velY −128, wingEdge down` defect), byte-diffed the moved else-arm (identical modulo indent), re-verified every ROM citation against `JOUSTRV4.SRC`, and re-ran the purity suite (79/79). I traced the data flow and reachability myself and agree.

**Data flow traced:** `stepEnemyDetailed` input `enemy.entity.airborne` → the new `if (!homed.entity.airborne)` leaf (`enemy.ts:1476`) → `decision = { dir, flap: false }` / `settled = homed` → the single common exit computes `wingsDown = decision.flap || steered.turned` = `false` (grounded ⇒ `steered.turned` false) → `input.flap`/`flapHeld` false → `stepEntity` keeps the enemy grounded. A grounded lava enemy can no longer be launched. Safe.

**Observations (≥5):**
- `[VERIFIED]` The moved else-arm is unchanged behaviour — evidence: rule-checker byte-diffed the pre-diff body against `enemy.ts:1489-1497`; identical modulo a 2-space re-indent. No clause dropped (lang-review #13). Complies with the core/shell purity rule (pure reads only).
- `[VERIFIED]` The guard cannot bypass the shared wing-edge exit — evidence: `settled`/`decision` are set in every leaf of the now-3-way branch and the `wingsDown`/`edge` computation still runs once at `enemy.ts:~1534` after the whole `if/else` (lang-review #14). No early return.
- `[VERIFIED]` The comment's factual claims hold — evidence: `lavaGateFires` opens `if (!enemy.entity.airborne) return false` (`enemy.ts:1165`) and `steerWake` opens `if (!enemy.entity.airborne) return held` (`enemy.ts:1185`); confirmed by comment-analyzer AND rule-checker independently.
- `[VERIFIED]` core/ purity preserved — evidence: the leaf reads `homed.entity.airborne` and constructs plain objects; `purity.test.ts` + `purity-scanner.test.ts` 79/79 green. No Date/Math.random/IO/clock.
- `[RULE][LOW]` Test cast widens the literal type — `joust-jt9-54-...test.ts:129` casts to `{ entry: string }` instead of `Extract<PjoyState, {kind:'lava'}>`. Cosmetic, feeds only `.toBe('BOLAV1')`. Non-blocking → Delivery Findings.
- `[LOW]` Grounded-hold keeps the lava `pjoy` indefinitely (never self-clears via the BOLAV1 re-check). Verified UNREACHABLE (a lava enemy exits while airborne/rising below any platform; `PLATFORMS` max snapY 210 < `$D3` 211). No observable effect. Non-blocking → Delivery Findings.
- `[VERIFIED]` AC-1 (the lava-throttle regression lock) is not vacuous and has teeth — evidence: the paired sanity test proves the lava branch ran (pjoy BOLAV2→BOLAV1), and both TEA and the rule-checker mutation-proved that reverting the jt9-49 gate reddens it.
- `[DOC][VERIFIED]` comment-analyzer returned clean — every ROM citation and every clause in the new comment block verified byte-for-byte against `JOUSTRV4.SRC` (`BOLAVA` :3953-3956, `BOLAV2` :3958-3961, `$D3`=`LAVA_ESCAPE_Y`), and the pre-existing else-arm comment moved verbatim with no drift. No stale/misleading/missing docs.
- `[SEC][VERIFIED]` security returned clean — the diff adds only a boolean field read (`homed.entity.airborne`) and pure object construction; no eval/`Function`, no IO (`fetch`/`fs`/`localStorage`/`document`), no secrets, no unsafe casts. Consistent with the backend-less single-player sim.

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md` — 26 checks + core-purity)

- **#1 type-safety escapes:** compliant — no `as any`/`as unknown as`/`ts-ignore`; the one `as {..}` cast is a widening nit (above), not an escape.
- **#4 null/undefined:** compliant — `homed.entity.airborne` is a boolean field read, no `?.`-then-call; `prdirOf` returns `number | undefined` correctly.
- **#5 module/imports:** compliant — test imports use the `.js` extension and inline `type` specifiers.
- **#8 test quality:** compliant — no vacuous assertions; AC-1 guarded by a sanity test, AC-2 mutation-verified.
- **#13 fix-introduced regressions:** compliant — else-arm byte-identical; no `||`-for-`??` introduced (grep: zero `||` added).
- **#14 derived edges in one branch:** compliant — wing-edge computed once at the common exit.
- **#17/#18/#20 claims/mutants/measured quantities re-run:** compliant — every mechanism re-executed, not reasoned about (mutation, byte-diff, re-measured file count 161, re-measured velY −128).
- **core/ purity (project rule):** compliant — pure reads + object construction; purity suite 79/79.
- **Not applicable (no instances in diff):** #3 enums, #6 JSX, #7 async, #9 build, #10–#12 security/perf, #15/#16/#19/#21–#26 — enumerated by rule-checker, zero instances.

### Devil's Advocate

Let me argue this is broken. First attack: the guard *changes* a behaviour for a state Dev calls "impossible" — a grounded enemy in the lava episode now HOLDS forever instead of coasting into the BOLAV1 re-check that would clear it. If any path lands a lava-carrying enemy on a platform, it is now stuck ping-ponging on the ground forever, a soft-lock the old code self-healed. So the whole reachability claim must be airtight, not merely "the story said so." I checked it independently: `lavaRecheckExits` fires on `velY < 0`, which runs on the very next BOLAV1 wake as the enemy rises to escape, and it fires while the enemy is still airborne and BELOW any platform (`PLATFORMS` top the arena at snapY 210, one pixel above the `$D3`=211 escape line). To land it must reach a platform above `$D3`; to get there it must rise; rising sets `velY < 0`, which exits it on the next BOLAV1 wake before it arrives. There is no wake ordering that lands a lava enemy. The rule-checker confirmed demo seeds never spawn a lava pjoy and no platform sits at/below `$D3`. Soft-lock refuted. Second attack: does the guard mis-fire for the AIRBORNE path — could `!homed.entity.airborne` be true for a bird that should be in the episode? No: `homed` is post-`steerWake`, and the only airborne mutation upstream is homing/steer, neither of which grounds a bird. Third attack: a confused future reader deletes the guard thinking it's dead code — but AC-2 goes RED immediately (mutation-proven), so the test net holds. Fourth: null/empty inputs — `homed.entity.airborne` is a required boolean on `EntityState`; no undefined path. Nothing survives. The change is correct and minimal.

**Error handling:** N/A — pure deterministic sim, no failure modes; every branch leaf assigns `settled`/`decision`, TS-enforced.
**Handoff:** To SM for finish-story.