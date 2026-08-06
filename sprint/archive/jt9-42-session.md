---
story_id: "jt9-42"
jira_key: "jt9-42"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-42: joust lava-troll looker is production-dead again: allow ENEMY victims so LNTLAV can fire, and pin the grip's single-integration

## Story Details
- **ID:** jt9-42
- **Jira Key:** jt9-42
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** gitflow (feat/jt9-42-lava-troll-looker-dead-allow-enemy-victims)
- **Branch:** feat/jt9-42-lava-troll-looker-dead-allow-enemy-victims
- **PR:** 25

## Workflow Tracking
**Repos:** arcade
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T20:16:25Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T19:39:59+00:00 | 2026-08-06T19:42:38Z | 2m 39s |
| red | 2026-08-06T19:42:38Z | 2026-08-06T20:06:15Z | 23m 37s |
| green | 2026-08-06T20:06:15Z | 2026-08-06T20:08:45Z | 2m 30s |
| review | 2026-08-06T20:08:45Z | 2026-08-06T20:16:25Z | 7m 40s |
| finish | 2026-08-06T20:16:25Z | - | - |

## Story Background

FOUND BY Reviewer during jt9-11 review (2026-08-04). jt9-11 wired the lava-troll grip with PLAYER-ONLY victims (pickTrollVictim, demo.ts), per the user chosen "grab a player" scope. TWO CONSEQUENCES the review confirmed. (F1, MEDIUM) the troll is now spliced before a PLAYER, so no enemy ever has a troll as PPREV and jt9-1 LNTLAV looker (LDX PPREV / CMPA #LAVID, JOUSTRV4.SRC:3727) NEVER FIRES in the live demo. Probe (forceAdvance to wave 4, seed 0x1234): ORDER=troll,player,player,enemy,... enemyAfterTroll=false. Before jt9-11 the troll spliced before the first ENEMY, so the looker WAS reachable. The ROM LNDB7 (:6764) grabs player OR enemy; broaden pickTrollVictim to the nearest BIRD (not just player) so an enemy victim restores looker reachability. WATCH: a gripped enemy is skipped by frame.ts (grippedBy) which freezes its own looker countdown; verify a gripped enemy not looking is acceptable and that NEIGHBOUR enemies still see it. (F2, LOW) the frame.ts grippedBy single-integration skip is UNGUARDED; mutation M4 (removing it) left all 17 jt9-11 tests green. Add a test pinning a gripped victim exact per-frame velY (grip pull only, NOT grip+GRAV) so the ADDLAV-replaces-gravity fidelity cannot regress silently.

**SM Note (2026-08-06):** The three anchors of this story's diagnosis were verified CURRENT on the working tree before setup:
- `plugins/joust/src/core/demo.ts:733` — `pickTrollVictim` gates on `p.kind !== 'player'`, PLAYER-ONLY confirmed.
- `plugins/joust/src/core/enemy.ts:1603` — `lavaTrollLooker` reads `PPREV`/`LAVID`, reachability requires enemy PPREV=troll.
- `plugins/joust/src/core/frame.ts:319` — `grippedBy !== undefined` skip is UNGUARDED.

## Acceptance Criteria

_Derived by TEA during RED (the epic YAML carried no `acceptance_criteria`). Each is
pinned by a test in `plugins/joust/tests/demo-jt9-42.test.ts`._

- **AC1 (F1) — the troll can grab an ENEMY.** `pickTrollVictim` binds the nearest
  BIRD, player OR enemy (ROM LNDB7, JOUSTRV4.SRC:6764), not only a player. When an
  enemy is the nearest bird to the CLIF5 grab point, the spawned troll's `victimId`
  is that enemy. _(F1-A)_
- **AC2 (F1) — the looker is reachable again.** Because `insertTroll` splices the
  troll immediately before its victim, an enemy victim puts an enemy right after the
  troll in the (secondary-class) wake order, so that enemy has PPREV = troll and
  `frame.ts`'s `lavaBehind` reaches it. Pinned as: the process immediately after the
  troll is an enemy. _(F1-B)_
- **AC3 (F1 WATCH) — an ungripped enemy behind the troll actually looks; a gripped
  one does not.** The scheduler delivers `lavaBehind` (not a pinned constant): a
  shadow behind a troll arms its SHUPST climb only when the troll ran first _(F1-C)_.
  A GRIPPED enemy is skipped by the flight/looker core, so its looker countdown is
  frozen — acceptable, it is being abducted — while an ungripped one reloads _(F1-D)_.
- **AC4 (F2) — the grip's single integration is guarded.** A gripped victim's
  per-frame velY is the grip pull ALONE (`stepGrip`), never grip + GRAV. Deleting the
  `runBehaviour` grippedBy skip (mutation M4) must redden this. _(F2)_

## Delivery Findings

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

## Design Deviations

No deviations yet.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## Sm Assessment

**Setup verdict:** Ready for RED. jt9-42 is a well-specified 5pt joust story with two findings from the jt9-11 review. Premise verified against the current working tree before setup — the story's diagnosis is CURRENT, not stale:

- **F1 (MEDIUM) — dead looker.** `plugins/joust/src/core/demo.ts:733` — `pickTrollVictim` gates on `p.kind !== 'player'`, so the troll victim is genuinely player-only. Because the troll is spliced ahead of a PLAYER, no enemy ever carries the troll as `PPREV`, and jt9-1's `lavaTrollLooker` (`enemy.ts:1603`, testing `PPREV`/`LAVID` at :1587/1649) can never fire in the live demo. ROM ground truth: LNDB7 (JOUSTRV4.SRC:6764) grabs player OR enemy — the fix broadens `pickTrollVictim` to the nearest BIRD.
- **F2 (LOW) — unguarded skip.** `plugins/joust/src/core/frame.ts:319` — the `grippedBy !== undefined` single-integration skip exists and is UNGUARDED; the review's mutation M4 (removing it) left all 17 jt9-11 tests green. Needs a test pinning a gripped victim's exact per-frame velY (grip pull only, NOT grip+GRAV) so ADDLAV-replaces-gravity fidelity cannot regress silently.

**WATCH for TEA:** a gripped enemy is skipped by the `grippedBy` freeze, so its own looker countdown pauses — verify a gripped enemy not looking is acceptable AND that NEIGHBOUR enemies still see it. Do not seed a probe blind to the enemy-after-troll ordering; the seed-0x1234 wave-4 splice order (troll,player,player,enemy…) is the recorded reproduction.

**ACs:** `null` in the epic YAML — TEA derives them from the F1/F2 description during RED. Nothing to copy verbatim, so no AC-drift risk.

**Claim:** branch `feat/jt9-42-lava-troll-looker-dead-allow-enemy-victims` pushed (commit `5843762`), story stamped `in_progress`. Sibling probes clean at setup — no other checkout owns jt9-42.
## Tea Assessment

**RED verified.** `npx vitest run --project joust plugins/joust/tests/demo-jt9-42.test.ts`
→ 2 failed (F1-A, F1-B — the drivers), 5 passed (2 setup invariants + 3 guards). Full
`--project joust` → 2 failed / 2960 passed, only my two drivers red. `npm run lint` clean.

**The two RED drivers (fail on today's code, green only when Dev broadens the victim pick):**
- **F1-A** — with both players parked at x≈290 (beyond every transporter pad's 125px reach
  of CLIF5_X=148), a wave-4 enemy is unambiguously the nearest bird for ANY seed. Today's
  player-only `pickTrollVictim` binds a far player; the AC wants the near enemy. `expected
  'enemy' to be … 'player'`.
- **F1-B** — same staging: `insertTroll` splices the troll before its (player) victim, so the
  successor is a player. The story's `enemyAfterTroll` probe. Both fixed by one change.

**The three guards are GREEN now and each was proven non-vacuous by running its exact mutant:**
- **F1-C** ← pin `frame.ts` `lavaBehind` to `false`: shadow no longer climbs (`'interval'`≠`'climb'`).
  This closes the R-3 hole smart-brain-looker.test.ts names — every looker UNIT test injects
  `lavaBehind`, so only this assembled-demo probe proves the SCHEDULER delivers it.
- **F1-D / F2** ← mutation M4 (delete the `runBehaviour` grippedBy skip): F1-D's gripped enemy
  reloaded plavt (7≠1); F2's velY became grip+GRAV (20≠12). Both reddened.

**Guidance for Dev (Loki) — the fix is `pickTrollVictim`, and there are TWO enemy-shaped traps:**
1. **`pickTrollVictim` reads `p.entity.posX` and filters `kind !== 'player'`.** An ENEMY carries
   its position at `p.enemy.entity.posX`, NOT `p.entity`. Broadening the filter alone is not
   enough — the distance read must resolve the position for both kinds (see the test's `posXOf`).
2. **`trollProcess` seeds the hand X from `victim.entity?.posX ?? TROLL_CLIF5_X`.** For an enemy
   victim `victim.entity` is undefined, so the hand would fall back to CLIF5_X (cosmetic, but
   wrong). Reachability (F1-B) rides `insertTroll` matching by `id`, so it passes regardless —
   but fix the hand X too for the rise animation to track a real enemy. No test pins the hand X
   here; if you leave it, note it as a deviation.
3. **Keep the victim to player OR enemy only** — LNDB7 grabs `$80+PLYID`/`$80+EMYID`, not pteros
   or baiters. "Nearest bird" = nearest player-or-enemy.
4. **The grip's single integration must stay intact.** Do NOT remove the `runBehaviour` grippedBy
   skip; F1-D/F2 guard it. The core stays pure — the purity scanner already enforces it.

**Rule coverage (TS checklist #8, test quality):** every test asserts a concrete value; no
`as any`, no vacuous `is-some`/`is-none`. The `grippedBy` field was mirrored into
`demo-contract.ts` from the production `DemoProcess` (it was already real, jt9-11) so the tests
typecheck unassisted — no cast. `enemyType` uses the real `'shadowLord'`/`'bounder'` union.

**Census bookkeeping (done at RED, per the joust file-count gotcha):** the new test file bumped
the derived suite count, so `plugins/joust/README.md` `--project joust` line went 144 → 145 to
keep `audio-seam-scope`'s derived-count guard green; no comment-body `<file>.ts:<line>` refs
(jt9-30 `comment-line-refs` guard) — symbol references only.
## Dev Assessment

**GREEN.** All 7 jt9-42 tests pass; full `--project joust` 2962/2962; `npm run lint` clean;
no regressions (jt9-11's troll tests park the player AT the grab point, dist 0, so it stays
nearest and still binds the player).

**The change (demo.ts, minimal):** one broadening plus a shared helper.
- New `birdPosX(p)` resolves a bird's grab-point X from wherever its flight state lives —
  player→`entity`, enemy→`enemy.entity`, undefined otherwise (pteros/baiters not grabbable).
- `pickTrollVictim` dropped its `kind !== 'player'` filter and now measures nearness via
  `birdPosX`, so the nearest live BIRD wins (ROM LNDB7 grabs player OR enemy).
- `trollProcess` reads the hand's tracking X through `birdPosX` too, so the rise tracks a real
  enemy victim's X instead of falling back to CLIF5_X. (TEA flagged this trap #2; fixed, so no
  deviation — the hand X is correct for enemy victims as well.)

**Untouched on purpose:** the `runBehaviour` grippedBy single-integration skip (F1-D/F2 guard
it) and `insertTroll` (already splices by `id`, which is what makes an enemy victim the troll's
immediate successor). The core stays pure — `birdPosX` is a total function over process data.

**No deviations.**
## Reviewer Assessment

**Verdict: APPROVED** — merge-ready. The code is correct, all four derived ACs are met,
and every guard was proven non-vacuous by running its exact mutant. One LOW finding is
filed forward, not blocking.

**Diff reviewed:** `origin/develop...HEAD` — `plugins/joust/src/core/demo.ts` (+21/−6),
the RED suite, the `grippedBy` contract mirror, the README count bump, and the setup
artifacts (context + epic stamp). All 9 reviewer specialists are disabled on this project
(`workflow.reviewer_subagents` all `false`), so per the disabled-subagent protocol I ran an
adversarial MUTATION BATTERY rather than a self-re-read.

**Mutation battery (this round, on the new code):**
- M-A `birdPosX` enemy branch → `undefined`: F1-A/F1-B redden → the enemy-position read is pinned.
- M-B nearest → farthest (`<`→`>`): reddens → the distance selection is pinned.
- M4 (delete the `runBehaviour` grippedBy skip) — re-confirmed from RED: F1-D (plavt 7≠1) and
  F2 (velY 20≠12) redden → the single-integration guard holds.
- `lavaBehind` pinned to a constant — re-confirmed from RED: F1-C reddens → the scheduler
  delivery is pinned (closes the R-3 injected-constant hole).
- **M-C (LOW, surviving mutant):** `trollProcess`'s hand entity X → constant `TROLL_CLIF5_X`
  leaves all 7 green. The enemy-victim hand-track X is unpinned. The CODE IS CORRECT
  (Dev shipped `birdPosX(victim)`); only test coverage is missing, and it is cosmetic (rise
  animation X) and beyond the ACs (reachability rides `insertTroll` by id). **Filed as jt9-58**
  (1pt, trivial) per the descoped-findings rule — approved, not bounced, since the behaviour is
  right and green.

**Scope check (adversarial):** broadening `pickTrollVictim` from player-only does NOT contradict
jt9-11's user-chosen "grab a player" scope — jt9-42 IS the sanctioned correction of that
simplification (the story cites ROM LNDB7 grabbing player OR enemy). `birdPosX` is a total pure
function; the core purity boundary passes. `insertTroll` (by id) and the grip skip are correctly
untouched. jt9-11's troll tests still bind a player (they park the player at the grab point, dist 0,
so it stays nearest) — no regression.

**Verification (final tree):** `--project joust` 2962/2962; `npm run lint` clean;
`tests/sprint-repo-routing.test.mjs` 17/17 (my sprint edits are clean).

**Orchestrator suite — two ENVIRONMENTAL failure clusters, both causally isolated from this diff
(which touches only joust + sprint files):**
1. `audit/star-wars` blob-serving tests — the audit-tag commit lacks `src/core/sim.ts` in this
   checkout (a fetch-depth/history condition for star-wars audit tags); nothing here touches star-wars.
2. `canonical-serve` (the whole-cabinet dev-server probe) — a SIBLING checkout owns port 5270
   (`lsof` confirmed), so the probe hits the wrong tree / times out (10.7s). The documented
   "dev port owned by sibling checkout" gotcha, not this change.
Neither reads any file in this diff; both reproduce independently of jt9-42.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | suite 2962/2962, lint clean, mutation battery run inline | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | none | N/A |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | none | N/A |
| 4 | reviewer-test-analyzer | Skipped | disabled (mutation battery substituted) | none | N/A |
| 5 | reviewer-comment-analyzer | Skipped | disabled | none | N/A |
| 6 | reviewer-type-design | Skipped | disabled | none | N/A |
| 7 | reviewer-security | Skipped | disabled | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | none | N/A |
| 9 | reviewer-rule-checker | Skipped | disabled | none | N/A |

All received: Yes