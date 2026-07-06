---
story_id: "bz2-9"
jira_key: ""
epic: "bz2"
workflow: "tdd"
---
# Story bz2-9: Unfair enemy spawns: enemies appear behind/out-of-view and fire instantly, killing the player within ~2s — fix spawn geometry + add a post-spawn fire grace so the opening is survivable

## Story Details
- **ID:** bz2-9
- **Jira Key:** (no Jira integration)
- **Workflow:** tdd
- **Stack Parent:** none
- **Priority:** p1
- **Type:** bug

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-05T18:04:57Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-04T12:46:11.739584+00:00 | 2026-07-04T12:47:51Z | 1m 39s |
| red | 2026-07-04T12:47:51Z | 2026-07-04T13:00:57Z | 13m 6s |
| green | 2026-07-04T13:00:57Z | 2026-07-04T13:07:47Z | 6m 50s |
| review | 2026-07-04T13:07:47Z | 2026-07-04T13:21:33Z | 13m 46s |
| finish (R1) | 2026-07-04T13:21:33Z | 2026-07-05T17:14:59Z | held for playtest |
| red | 2026-07-05T17:14:59Z | 2026-07-05T17:40:30Z | 25m 31s |
| green | 2026-07-05T17:40:30Z | 2026-07-05T17:50:26Z | 9m 56s |
| review | 2026-07-05T17:50:26Z | 2026-07-05T18:04:57Z | 14m 31s |
| finish | 2026-07-05T18:04:57Z | - | - |

> **R2 REOPEN (2026-07-05):** Playtest FAILED — R1's geometry fix landed but the
> opening is still unsurvivable (~3s of life, respawn re-kill, barrier shot-spam).
> Reopened to `red` for the ROM-grounded fix. R1's Reviewer APPROVED below is
> SUPERSEDED and applies only to the R1 diff (still on branch, unmerged). See the
> **Architect Design Note** below for the R2 spec.

## Sm Assessment

**Story:** p1 playtest bug in `battlezone/`. At wave open, enemies spawn behind the
player (outside the forward view cone) and fire instantly, killing the player within
~2s — reads as UNFAIR, not hard. Fix is engagement GEOMETRY + instant-fire, not a
difficulty-volume problem.

**Routing:** phased `tdd` → RED first. Handing off to TEA (Furiosa).

**Technical approach (for TEA/Dev):**
- Two independent levers; RED should pin down both, Dev may need one or both:
  1. **Spawn placement** — bias initial/respawn bearing toward the forward view cone,
     or at minimum a reactable bearing, instead of the rear blind spot.
  2. **Post-spawn fire grace** — a newly spawned enemy cannot fire for a brief window,
     giving the player time to turn/react.
- Both belong in `src/core` (deterministic planar sim — spawn logic + enemy firing AI
  live there), so they're unit-testable without the shell/render loop.

**Constraint (project canon — do NOT violate):** authentic Atari ROM difficulty is the
CEILING for later levels. This is about FAIR opening geometry, not softening the
difficulty ratchet. Do not exceed ROM difficulty; do not gold-plate deep-level fidelity.
Real ROM bearing data exists (va-battlezone SourceGen) if authentic spawn angles are
wanted — but the goal is survivable, not soft.

**RED focus for TEA:** deterministic tests that (a) assert no enemy spawns in the rear
blind spot / assert spawn bearings fall within the reactable forward arc, and (b) assert
a freshly spawned enemy cannot fire until the grace window elapses. 4 ACs on the story —
cover the spawn-geometry and fire-grace ACs first.

## Architect Design Note (R2 reopen — ROM-grounded fair opening)

**Decoded from the committed disassembly** (`reference/va-battlezone/web/Battlezone.html`;
memory `battlezone-enemy-fire-grace-rom`). BZ game logic runs ~15–16 fps, so ROM frame
counts port to **seconds** for our 60fps dt-based sim.

**Why R1 failed the playtest (3 gaps vs the 1980 ROM):**
1. R1's `SPAWN_FIRE_GRACE` (0.5s) keys on the ENEMY's `hostile.phaseAge`. On the PLAYER's
   respawn the enemy is NOT re-spawned — it's carried forward (`sim.ts:177-188`) with a
   large `phaseAge`, so the grace has long passed → instant re-kill. And 0.5s ≪ ROM ~2s.
2. The enemy shell slot frees the instant the shell clears an obstacle
   (`firing.ts:127 shellBlocked → return null`) → re-fires next frame → the barrier
   shot-spam. The ROM instead sets a struck projectile to an EXPLOSION state that keeps
   the fire gate closed until the blast ends (a built-in reload).
3. No respawn reposition: the ROM randomizes player location and turns the survivor away.

**Authoritative ROM model:**
- `rez_protect` ($d1): spawn-grace counter, +1/frame, reset to 0 on player respawn
  ($5215) AND enemy spawn. `TryShootPlayer` ($6595): `lda rez_protect / cmp #$20 / bcc
  :Return` → **no enemy shot until ~2s (32 frames) since the last spawn — "don't be
  unfair"**. It also gates enemy movement ($6538 "summoning sickness").
- One enemy shot in flight (`projectile_state_1 != 0` → :Return). On strike the
  projectile → exploding `$a0` (nonzero) so re-fire stays blocked through the explosion.
  TTL when fired = `$7f`.
- `RespawnPlayer` ($5222): `move_counter=$30` freeze, random player location, random
  enemy heading.

**Design to build (R2):**
1. **Spawn-grace counter in game state, reset on player respawn AND enemy spawn**, that
   blocks enemy fire for ~**2s**. REPLACES R1's phaseAge grace. Must live where the
   `sim.ts` respawn path can reset it (respawn currently carries enemies forward
   unchanged). Keep pure/dt-based (no wall-clock, no Math.random — seeded rng only).
2. **Post-hit reload:** after the enemy shell clears (obstacle/expiry), the enemy cannot
   re-fire until a short reload elapses (the ROM's explosion delay). Don't free the fire
   gate the same frame the slot empties.
3. *Optional:* on player respawn, turn the survivor to a random/away heading.

**Test impact:** grace rising to ~2s means `enemies-roster.test.ts:588` ("aimed super
tank fires at phaseAge 1s") must be updated to ~2s — ROM is canonical
(`tempest-rom-is-canonical`). ~2s grace does NOT violate AC-4: enemies stay lethal AFTER
grace; the ROM ramps aggression via rez_protect/score.

**RED focus for TEA (Furiosa):**
- After a simulated player death→respawn, the surviving enemy fires NO shell for ~2s,
  then resumes (grace tied to the respawn EVENT, not the enemy's phaseAge).
- An enemy whose shell just cleared (e.g. blocked by an obstacle) cannot fire on the very
  next frame — assert a minimum reload gap between successive enemy shells at a barrier.
- Keep R1's forward-hemisphere spawn-geometry tests green.

Constraint unchanged: ROM is the difficulty CEILING; goal is survivable, not soft.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Gap** (non-blocking): The post-spawn fire grace must stay UNDER the smallest
  "aimed enemy fires" phaseAge already pinned by the green suite — `enemies-roster.test.ts`
  expects an aimed super tank at `phaseAge: 1` to fire on the first step. A grace ≥ ~1s
  would regress that test. Affects `src/core/enemies.ts` (the fire gate — recommend
  gating on `hostile.phaseAge`, which is already 0 at spawn; pick a grace in the
  ~0.25–0.75s band). *Found by TEA during test design.*
- **Improvement** (non-blocking): The instant-fire half of the bug stems from
  `spawnHostile` seating every newcomer already aimed at the player
  (`heading: bearingTo(x, z, player)`, enemies.ts:229). The grace is the AC-3 fix, but
  Dev may also consider whether a fresh spawn should face the player at all. Either way
  the RED grace tests assert the OUTCOME (no frame-1 fire) and are agnostic to which
  lever is used. Affects `src/core/enemies.ts`. *Found by TEA during test design.*
- **[R2 reopen] Conflict** (non-blocking — SUPERSEDES the R1 "grace must stay under ~1s"
  Gap above): the R1 grace keys on the ENEMY's `hostile.phaseAge`, which never resets when
  the PLAYER respawns — the carried-forward, still-aimed tank re-fires the frame after
  respawn and re-kills the fresh spawn (the "~3s of life" playtest bug). The ROM's
  `rez_protect` grace (~2s) resets on player respawn AND enemy spawn ("don't be unfair").
  Cleanest fix that keeps the roster tests green: in `sim.ts`'s respawn path (the
  `enemyStep.playerHit` branch, ~sim.ts:177-188) RESET the surviving `hostile.phaseAge` to 0
  and raise `SPAWN_FIRE_GRACE` to the ROM ~2s — reusing the phaseAge clock avoids a new
  `EnemyState` field whose default would trip the many roster tests that construct hostiles.
  Affects `src/core/sim.ts` + `src/core/enemies.ts`. *Found by TEA during R2 test design.*
- **[R2 reopen] Gap** (non-blocking): the enemy shell slot frees the instant a shell clears
  an obstacle (`enemies.ts:442`, `firing.ts:127 shellBlocked → null`) with no reload, so a
  barrier-wedged tank re-fires every few frames (RED: 24 muzzle flashes / 2s). The ROM holds
  the slot through the projectile's EXPLOSION state before the enemy may re-fire. Dev needs a
  post-clear reload so the fire gate can't reopen the same/next frame a shell clears; the RED
  test asserts the OUTCOME (≤8 muzzle flashes / 2s), agnostic to the mechanism. Affects
  `src/core/enemies.ts`. *Found by TEA during R2 test design.*

### Dev (implementation)
- **Improvement** (non-blocking): The new tuning knobs `SPAWN_FORWARD_ARC` (π) and
  `SPAWN_FIRE_GRACE` (0.5s) are provisional, like the surrounding AI constants
  (`AIM_TOLERANCE`, throttles) the file flags for a bz1-12-style playtest true-up.
  They pass the behavioral bands but the exact feel wants a live playtest (cf. the
  held bz1-12 playtest). Affects `src/core/enemies.ts` (retune the two constants if the
  opening still feels off). *Found by Dev during implementation.*
- **[R2] Improvement** (non-blocking): the R2 values `SPAWN_FIRE_GRACE` (now 2.0s, was
  0.5s — SUPERSEDES the 0.5 above) and `SHELL_RELOAD` (0.4s) are provisional ROM-ports:
  2.0s matches rez_protect's ~2 s and the reload sits in TEA's "not a machine-gun" band,
  but the exact feel wants the same live playtest that gates this story. Affects
  `src/core/enemies.ts`. *Found by Dev during implementation.*
- **[R2] Question** (non-blocking): the fire grace stops the survivor SHOOTING for ~2 s but
  not MOVING — it keeps crawling toward the origin the player respawns onto (the ROM also
  freezes movement via `move_counter=$30` and repositions the player randomly, deferred as a
  R2 Dev deviation). Low risk for the reported tank case (you can turn/shoot in the 2 s), but
  a score-gated missile still kills by CONTACT inside the grace (the R1 Reviewer's open
  Question). If the playtest shows either still feels unfair, add the movement freeze /
  reposition. Affects `src/core/sim.ts` + `src/core/enemies.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): The "grace is BRIEF" test (`enemies-spawn-fairness.test.ts:189`)
  only asserts the tank fires before t=3s — a loose upper bound that wouldn't catch a grace
  regression in the (0.5, 1.0]s band. Real AC-4 exposure is small because
  `enemies-roster.test.ts:588` (super tank fires at phaseAge 1) already caps the grace ≤1s, but the
  guard would be stronger with an upper bound near the ~1s ceiling. Affects
  `tests/core/enemies-spawn-fairness.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The post-spawn grace is only pinned for the `tank` kind via
  `initEnemies`; the exploding→replacement path and the `super-tank` kind (shared fire-gate code)
  aren't directly asserted at phaseAge 0. Current risk is low (all spawns share `spawnHostile`'s
  `phaseAge: 0` seed and one fire gate), but a future special-case could regress AC-3 on the
  respawn path silently. Affects `tests/core/enemies-spawn-fairness.test.ts`. *Found by Reviewer during code review.*
- **Question** (non-blocking): Missiles kill by CONTACT and are outside the tank fire grace; a
  non-weaving first missile from `SPAWN_MIN` contacts in ~1.39s, under AC-1's 2s bar. This diff does
  NOT regress that (missile speed/range unchanged) and in fact IMPROVES it — the geometry fix now
  spawns missiles in the forward hemisphere (visible + shootable). Missiles are score-gated, not part
  of the opening bz2-9 targets, so this is out of scope here; a follow-up may evaluate missile opening
  fairness. Affects `src/core/enemies.ts`. *Found by Reviewer during code review.*
- **[R2] Improvement** (non-blocking): the respawn `phaseAge`-reset ternary's `: survivor`
  branch (survivor already `exploding` at player death — every missile-contact kill, and the
  lingering-shell tank kill) has no test. The CODE is correct (the exploding blast timer must
  survive the respawn; verified at `enemies.ts:523-527`), but a hardening test — rig an
  exploding hostile + a killing shell/missile and assert `phaseAge` is UNCHANGED across the
  respawn — would pin the deliberate design. Affects `tests/core/enemies-respawn-fairness.test.ts`.
  *Found by Reviewer during code review.*
- **[R2] Improvement** (non-blocking): the new `reload` gate is exercised only through obstacle
  strikes and only for `kind: 'tank'`. Two untested interactions: (a) a low-aggro "bad shot"
  that expires at the range wall lets an immediate same-frame refire (intended — obstacle-only
  reload — but unpinned), and (b) `super-tank` shares the identical fire-gate/reload path with no
  dedicated test. Low risk (shared code, and open-field expiry is flight-time-limited, not spam),
  but a parameterised `['tank','super-tank']` reload test would close it. Affects
  `tests/core/enemies-respawn-fairness.test.ts`. *Found by Reviewer during code review.*
- **[R2] Question** (non-blocking): `reload` lives on `EnemyState`, so a same-step
  `spawnReplacement` inherits ≤0.4 s of leftover reload. Impact is nil today (a fresh replacement
  is `phaseAge`-0 and grace-locked for 2 s, which fully masks the reload), but if a future story
  shortens the spawn grace below the reload, a replacement could inherit a brief unintended
  fire-lock. Affects `src/core/enemies.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **Operationalised the qualitative spawn-geometry AC as a hard angular bound**
  - Spec source: context-story-bz2-9.md, AC-2
  - Spec text: "Spawn placement biases toward the player's forward view cone (or a reactable bearing), not the rear blind spot."
  - Implementation: Tests assert every spawn bearing (relative to `player.heading`) falls in the forward hemisphere, `|offset| ≤ π/2` — in front of or abeam, never behind. Did NOT require the tight 45° view cone (`camera.H_FOV`).
  - Rationale: "or at least a reactable bearing" explicitly permits the looser bound; forcing the narrow view cone would over-specify and risk an un-fun "always dead ahead" result. The forward hemisphere directly encodes "not the rear blind spot" (the reported bug) and is the least brittle contract.
  - Severity: minor
  - Forward impact: If a future story wants fair FLANKING spawns, this bound must be widened deliberately (and paired with a longer grace).
- **Pinned the fire grace by behavior, not by an exact constant**
  - Spec source: context-story-bz2-9.md, AC-3
  - Spec text: "A brief post-spawn grace prevents a just-spawned enemy from firing on the same frame/instant it appears."
  - Implementation: Tests assert a fresh spawn holds fire (frame 1 + through a ~0.25s reaction window) and that a settled spawn still fires — no exact grace-duration constant is asserted.
  - Rationale: The AI tuning constants are provisional (bz1-12 playtest true-up); pinning an exact grace would make a later retune break RED tests. Behavior bands survive a retune.
  - Severity: minor
  - Forward impact: none.
- **[R2] Respawn grace pinned as a reaction-window band, not the exact ~2s**
  - Spec source: .session/bz2-9-session.md — Architect Design Note (R2); context-story-bz2-9.md AC-1
  - Spec text: "no sub-2s unavoidable deaths from spawn"; ROM rez_protect ~2s "don't be unfair", reset on player respawn.
  - Implementation: the sim-level test asserts the survivor fires NO shell for the first 1s after respawn (and no second death in that window) — not that the grace is exactly 2s.
  - Rationale: the grace duration is a provisional ROM-port (like the other AI constants); a 1s reaction-window band is a strict subset of the ~2s design, robust to a playtest true-up, and still a strong RED (R1 fires on frame 1 post-respawn).
  - Severity: minor
  - Forward impact: none — a longer grace only makes the test pass more comfortably.
- **[R2] Reload pinned as a bounded muzzle-flash rate, not the exact ROM explosion duration**
  - Spec source: .session/bz2-9-session.md — Architect Design Note (R2)
  - Spec text: the ROM holds a struck projectile in an EXPLOSION state ($a0) that blocks re-fire until it ends.
  - Implementation: the test asserts a barrier-wedged tank opens fire ≤8 times / 2s (⇒ reload ≥ ~0.25s), not the exact explosion-state frame count (an undecoded ROM byte).
  - Rationale: the explosion duration is undecoded; a "not a machine-gun" upper bound is the least-brittle contract and cleanly separates R1 (24/2s) from any reasonable reload.
  - Severity: minor
  - Forward impact: a later byte-decode can tighten the bound.
- **[R2] Bumped two existing settled-tank tests past the raised grace**
  - Spec source: enemies-roster.test.ts:588; enemies-spawn-fairness.test.ts (R1)
  - Spec text: both assert an aimed, SETTLED tank fires; both settled at a phaseAge that assumed the 0.5s R1 grace.
  - Implementation: raised their construction phaseAge (1→3 and 2→3) so they stay "settled fires" assertions under the ~2s R2 grace, and updated the now-stale "grace must stay ≤1s" header note.
  - Rationale: the grace value is changing (R1 0.5s → R2 ~2s); these tests were coupled to the old value. Bumping preserves the invariant ("a settled aimed tank fires") without coupling to the exact new grace.
  - Severity: minor
  - Forward impact: none.

### Dev (implementation)
- **Used a uniform forward hemisphere rather than a view-cone-weighted distribution**
  - Spec source: context-story-bz2-9.md, AC-2
  - Spec text: "Spawn placement biases toward the player's forward view cone (or a reactable bearing), not the rear blind spot."
  - Implementation: `spawnHostile` draws `dir = player.heading + (nextFloat − 0.5)·π`, i.e. uniform across the forward hemisphere (±π/2). No extra weighting toward the 45° view-cone centre.
  - Rationale: Satisfies the AC's "or at least a reactable bearing" clause (never behind) with a one-draw change that preserves the existing rng-consumption count and the whole green suite. Minimalist per TEA's contract, which requires only the hemisphere.
  - Severity: minor
  - Forward impact: If a later story wants enemies to appear predominantly dead-ahead, add a centre-weighting curve to `dir` (the hemisphere bound already holds).
- **Implemented BOTH levers (geometry + grace), not one**
  - Spec source: context-story-bz2-9.md, AC-1/AC-2/AC-3
  - Spec text: "bias initial/respawn placement … and/or add a brief post-spawn grace"
  - Implementation: Shipped both — forward-hemisphere spawns AND a phaseAge fire grace.
  - Rationale: AC-2 and AC-3 are distinct acceptance criteria with distinct RED tests; both must pass. The "and/or" is satisfied most robustly by doing both (geometry makes the enemy visible; grace covers the instant-fire the aimed spawn still creates).
  - Severity: none (fuller compliance, not a reduction)
  - Forward impact: none.
- **[R2] Fire grace only; deferred the ROM's movement-freeze + respawn reposition**
  - Spec source: .session/bz2-9-session.md — Architect Design Note (R2), item 3
  - Spec text: "Optional: on player respawn, turn the survivor to a random/away heading" (and the ROM's `move_counter=$30` movement freeze / random player reposition, $5222).
  - Implementation: shipped only the FIRE grace (phaseAge reset on respawn + raised `SPAWN_FIRE_GRACE`) and the reload. The survivor still crawls toward the player during the grace; the player still respawns at the fixed origin, and the survivor keeps its heading.
  - Rationale: the fire grace alone satisfies AC-1 and both RED tests (the survivor cannot SHOOT for ~2 s → the player has a reaction beat). The reposition/freeze were marked optional; adding them is scope beyond the failing tests (Dev minimalism).
  - Severity: minor
  - Forward impact: if the playtest shows the silently-crawling survivor still feels unfair (or a score-gated missile contact-kills inside the grace — a pre-existing, separate concern the R1 Reviewer logged), a follow-up can add the movement freeze / reposition.
- **[R2] Reload fires on OBSTACLE strike only, not on max-range expiry or player-hit**
  - Spec source: .session/bz2-9-session.md — Architect Design Note (R2), item 2
  - Spec text: the ROM sets a struck projectile to an explosion state ($a0) that blocks re-fire "after a strike".
  - Implementation: `SHELL_RELOAD` is armed only when the shell hits an obstacle (`shellBlocked`), not when it expires at max range or reaches the player.
  - Rationale: the barrier machine-gun (the reported bug + the RED test) is the obstacle-strike case. Open-field expiry is already flight-time-limited (~2 s), and a player-hit leads to respawn (the grace covers it) — reloading those would only slow open-field lethality with no fairness gain.
  - Severity: minor
  - Forward impact: none — a later full ROM port can extend the lock to unit strikes if desired.
- **[R2] `EnemyState.reload` is an OPTIONAL field (`?? 0`), not required**
  - Spec source: enemies.ts `EnemyState`; TEA R2 Delivery Finding (avoid a new-field default hazard)
  - Spec text: TEA advised reusing state so "the many roster tests that construct hostiles stay green".
  - Implementation: added `readonly reload?: number` read via `state.reload ?? 0` — the same idiom as `missilesLaunched`'s defensive read — so every pre-R2 `EnemyState` literal in the suite still typechecks without edits.
  - Rationale: a required field would force `reload: 0` into dozens of test literals (the blast radius TEA flagged); optional + `?? 0` is the minimal, backward-compatible contract.
  - Severity: minor
  - Forward impact: none.

### Reviewer (audit)
- **TEA: forward-hemisphere threshold (|offset| ≤ π/2)** → ✓ ACCEPTED by Reviewer: sound operationalisation of AC-2's "reactable bearing" clause; directly encodes "not the rear blind spot" and is the least-brittle bound. Verified the code's `dir` formula yields exactly this (offset ∈ [−π/2, π/2)).
- **TEA: grace pinned by behavior, not an exact constant** → ✓ ACCEPTED by Reviewer: correct — the tuning value is provisional (bz1-12-style true-up); behavioral bands survive a playtest retune. NB the grace is additionally capped ≤1s by the existing roster super-tank test, so the value cannot balloon unnoticed.
- **Dev: uniform forward hemisphere (no view-cone weighting)** → ✓ ACCEPTED by Reviewer: satisfies AC-2's explicit "or at least a reactable bearing" clause with a one-draw change that preserves rng consumption; minimalist, and a future centre-weighting is a clean additive follow-up.
- **Dev: implemented BOTH levers (geometry + grace)** → ✓ ACCEPTED by Reviewer: AC-2 and AC-3 are distinct acceptance criteria with distinct RED tests; shipping both is fuller compliance, not scope creep.
- **[R2] TEA: respawn grace pinned as a 1 s reaction-window band, not exact ~2 s** → ✓ ACCEPTED by Reviewer: a 1 s band is a strict subset of the ~2 s design, robust to a playtest true-up, and still a strong RED (R1 fires at t≈0 post-respawn — empirically confirmed by the test-analyzer's revert).
- **[R2] TEA: reload pinned as ≤8 muzzle flashes / 2 s, not the exact ROM explosion frame count** → ✓ ACCEPTED by Reviewer: the explosion duration is an undecoded quarry byte; a "not a machine-gun" upper bound is the least-brittle contract and cleanly separates R1 (24/2 s) from any reasonable reload.
- **[R2] TEA: bumped two settled-tank tests (phaseAge 1→3, 2→3) past the raised grace** → ✓ ACCEPTED by Reviewer: necessary and correct — the grace value changed (0.5→2.0 s); the bumps preserve each test's "settled aimed tank fires" intent with margin, matching the file's existing idiom.
- **[R2] Dev: fire grace only; deferred the ROM's movement-freeze + respawn reposition** → ✓ ACCEPTED by Reviewer: the fire grace alone satisfies AC-1 and both RED tests (the survivor can't SHOOT for ~2 s). The reposition/freeze were explicitly optional; the residual (a score-gated missile contact inside the grace) is a pre-existing, R1-logged, out-of-scope concern, correctly carried forward as a Question, not introduced here.
- **[R2] Dev: reload arms on OBSTACLE strike only (not range-expiry / player-hit)** → ✓ ACCEPTED by Reviewer: targets the reported barrier machine-gun; open-field expiry is already flight-time-limited (~2 s) so needs no reload, and a player-hit leads to respawn (the grace covers it). The untested open-field-refire interaction (test-analyzer #2) is captured as a non-blocking Delivery Finding.
- **[R2] Dev: `EnemyState.reload` is OPTIONAL (`?? 0`), not required** → ✓ ACCEPTED by Reviewer: mirrors the established `missilesLaunched ?? 0` defensive-read idiom; keeps the dozens of pre-R2 `EnemyState` test literals typechecking without edits (the blast radius TEA flagged). Rule-checker #2 confirms compliant.

## TEA Assessment

> **R2 REOPEN (2026-07-05, Furiosa):** the R1 Red Phase record below is SUPERSEDED for the
> reopened work. R1 shipped the geometry + a 0.5s phaseAge grace; the live playtest showed
> the opening is still unsurvivable (respawn re-kill + barrier shot-spam). The R2 red phase
> is documented here.

### Red Phase (R2 reopen — respawn grace + reload)

**Tests Required:** Yes
**Reason:** the playtest exposed two behaviors R1 never modelled — the fire grace must reset on player RESPAWN (not just enemy spawn), and the enemy needs a post-hit reload so a barrier-wedged tank can't machine-gun. Both are pure, deterministic `src/core` behaviors, ROM-grounded (Architect Design Note).

**Test Files:**
- `tests/core/enemies-respawn-fairness.test.ts` (NEW) — 5 tests. Respawn grace, driven through the REAL `stepGame` sim (rig sanity → "holds fire a reaction second after respawn" → "grace lifts"); reload, driven through `stepEnemies` (scenario-valid → "≤8 muzzle flashes / 2s at a barrier").
- `tests/core/enemies-roster.test.ts` + `tests/core/enemies-spawn-fairness.test.ts` — bumped one settled-tank `phaseAge` each past the raised ~2s grace, updated a stale header note; still green.

**Tests Written:** 5 new (2 RED-driving AC-1 contracts + 3 guards).
**Status:** RED — 2 failing (respawn grace, reload), 3 passing (guards/sanity).

**RED evidence (testing-runner):**
- `the surviving, dead-aimed enemy fires NO shell for a full reaction second after the respawn` — FAIL at t≈0.000s: the carried-forward tank fires on the FIRST post-respawn frame (R1's phaseAge grace never resets on player death).
- `over two seconds it opens fire only a handful of times` — FAIL: **24 muzzle flashes / 2s** at a barrier (vs ≤8) — the machine-gun.
- Guards PASS: respawn rig (lives 3→2, tank re-centred at origin) · respawn grace lifts (fires within 4s) · reload scenario valid (barrier blocks shots + tank opens fire).
- Full suite: **693 passing, only the 2 new RED tests fail** — no regressions (roster/spawn-fairness green after the phaseAge bumps).

**Rule Coverage (R2):** Epic core-purity (no DOM/time/`Math.random`; time via `dt`, randomness via seeded rng) and TS #1/#2 (no type escapes, non-mutating reducer) are enforced wholesale by the existing `enemies-purity.test.ts` source-scan of `enemies.ts` — which auto-covers Dev's GREEN edits there. **NB for Dev:** R2 also edits `sim.ts` (the respawn phaseAge reset) — keep it pure (phaseAge reset is plain data; no wall-clock, no ambient rng). TS #8 self-checked on the 5 new tests: every test has a meaningful, message-carrying assertion; 0 vacuous (`let _=`, `assert(true)`, always-null `.toBeNull()`); the two RED assertions print the offending state (fired shell / muzzle-flash count).

**Handoff:** To Dev (The Word Burgers) for GREEN. Per the R2 Delivery Findings: (1) reset the surviving `hostile.phaseAge` to 0 in `sim.ts`'s respawn path AND raise `SPAWN_FIRE_GRACE` to the ROM ~2s (reuse the phaseAge clock — no new `EnemyState` field, so the roster tests that construct hostiles stay green); (2) add a post-hit reload so the enemy fire gate cannot reopen the frame its shell clears a barrier.

### Red Phase (test writing) — R1 (superseded)

**Tests Required:** Yes
**Reason:** p1 gameplay bug with two concrete behavioral contracts (spawn geometry + fire grace) — squarely testable in the pure, deterministic `src/core`.

**Test Files:**
- `tests/core/enemies-spawn-fairness.test.ts` — 7 tests: spawn geometry (init + replacement forward-hemisphere, distance safe-ring guard) and post-spawn fire grace (fresh holds frame-1, fresh holds through 0.25s, settled still fires, grace-is-brief eventually-fires).

**Tests Written:** 7 tests covering 4 ACs (AC-1 fairness outcome, AC-2 forward geometry, AC-3 fire grace, AC-4 ceiling preserved via the "settled still fires" / "grace is brief" guards).
**Status:** RED — 4 failing (the AC contracts), 3 passing (positive controls / guards that prevent over-correction).

**RED evidence (testing-runner, RUN_ID bz2-9-tea-red):**
- `initial spawn lands in the forward hemisphere` — FAIL: 434/864 spawns behind the player (worst 180°).
- `replacement spawn stays forward` — FAIL: 140/288 spawns behind the player (worst 176.7°).
- `brand-new spawn does not fire on its first frame` — FAIL: seed 0 fired on frame 1.
- `grace spans a real reaction window (0.25s)` — FAIL: fires at t≈0.
- Guards PASS: settled tank still fires · grace is brief (fires ≤3s) · spawns on the safe ring.
- Existing enemy suite (enemies / roster / aggro / purity): 75 passing, 0 regressions. File compiled clean (no import/type error).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| Epic core-purity (no DOM/time/`Math.random`) in `enemies.ts` | `enemies-purity.test.ts` (existing, source-scans the whole file — covers Dev's edits) | green, guards the fix |
| TS #1 type-safety escapes (`as any` / `@ts-ignore`) in `enemies.ts` | `enemies-purity.test.ts` BANNED_ESCAPES (existing) | green, guards the fix |
| TS #2 readonly / non-mutating reducer | `enemies-purity.test.ts` deep-freeze reducer test (existing) | green, guards the fix |
| TS #8 test quality (meaningful assertions, no vacuous `let _=`/`assert(true)`) | self-check on the 7 new tests | pass |
| AC-4 difficulty ceiling not softened | `settled tank still fires` + `grace is brief` guards | passing (positive controls) |

**Rules checked:** core-purity + TS #1/#2 for the edited module are enforced wholesale by the existing `enemies-purity.test.ts`, which source-scans `enemies.ts` and so automatically covers Dev's GREEN edits — no duplication needed. TS #8 self-checked on the new file.
**Self-check:** 0 vacuous tests. Every test has a meaningful assertion with a diagnostic message; the two `.toBe(0)` geometry assertions carry the offending count + worst offset.

**Handoff:** To Dev (The Word Burgers) for the GREEN implementation. Heed the Delivery Finding: gate fire on `hostile.phaseAge` with a grace in the ~0.25–0.75s band (< the phaseAge-1 super-tank fire the green suite pins), and bias `spawnHostile`'s bearing into the forward hemisphere relative to `player.heading`.

## Dev Assessment

> **R2 REOPEN (2026-07-05, The Word Burgers):** the R1 Dev assessment below is SUPERSEDED.
> R1 shipped geometry + a 0.5s phaseAge grace; the playtest proved the opening still dies in
> ~3 s. The R2 implementation is documented here.

### R2 — respawn fire grace + barrier reload

**Implementation Complete:** Yes

**Files Changed:**
- `battlezone/src/core/sim.ts` — the player-respawn path (`enemyStep.playerHit` branch) now
  resets the surviving ALIVE tank's `phaseAge` to 0, so it re-earns the full spawn fire grace
  when the player comes back (ROM rez_protect resets on respawn — "don't be unfair"). An
  exploding hostile is left alone (it owns its `EXPLOSION_DURATION` timer). This is the fix
  for the respawn re-kill (the "~3 s of life").
- `battlezone/src/core/enemies.ts` — three surgical changes, all pure:
  1. `SPAWN_FIRE_GRACE` 0.5s → **2.0s** (ROM `$20`≈32 frames at ~16 fps). The R1 grace was
     both too short and blind to player respawn; combined with the sim.ts reset it now covers
     the opening AND every respawn.
  2. New optional `EnemyState.reload` (seconds; read `?? 0`, the `missilesLaunched` idiom) —
     counts down each step; armed to `SHELL_RELOAD` (0.4s) when an enemy shell STRIKES an
     obstacle; the fire gate gained a `reload <= 0` term. A barrier-wedged tank now fires on a
     reload, not every frame — the barrier machine-gun fix.
  3. `initEnemies` seeds `reload: 0`.

**Approach:** Followed the Architect Design Note + TEA's marked path exactly — reused the
`phaseAge` clock (no required new field → the many `EnemyState` test literals stay green) and
armed the reload only on obstacle strikes (targets the barrier case; no open-field cadence
change). Deferred the ROM's optional movement-freeze / random reposition (logged as R2
deviations) — the fire grace alone satisfies AC-1 and both RED tests. Values (2.0s / 0.4s)
are provisional ROM-ports, flagged for the live playtest that gates this story.

**Tests:** 695/695 passing (GREEN). Both previously-RED R2 tests pass; `tsc --noEmit` clean.
Core-purity intact (phaseAge reset + reload are plain dt-driven data; no wall-clock, no
ambient rng) — `enemies-purity.test.ts` green.
**Branch:** `feat/bz2-9-fair-enemy-spawns` (pushed — commits `70efd9c` tests, `382782c` fix).

**Handoff:** To the verify/review phase.

### R1 — geometry + 0.5s grace (superseded)

**Implementation Complete:** Yes

**Files Changed:**
- `battlezone/src/core/enemies.ts` — two surgical changes, both in the pure core:
  1. `spawnHostile` now biases the spawn bearing into the forward hemisphere:
     `dir = player.heading + (nextFloat − 0.5)·SPAWN_FORWARD_ARC` (arc = π ⇒ ±π/2).
     A newcomer is always in front of or abeam, never in the rear blind spot.
     One rng draw as before — determinism/consumption preserved.
  2. The tank fire gate gained a `hostile.phaseAge >= SPAWN_FIRE_GRACE` (0.5s)
     term, so a just-spawned unit holds fire briefly. A settled tank fires
     exactly as before — ROM lethality / difficulty ceiling untouched (AC-4).

**Approach:** Followed TEA's guidance exactly. Grace = 0.5s sits in the safe band
— above the ~0.25s reaction window the RED tests require, below the ~1s at which
`enemies-roster.test.ts` already expects an aimed super tank (phaseAge 1) to fire.
Kept both constants module-private, consistent with the file's other provisional
AI tuning knobs (`AIM_TOLERANCE`, throttles). No new exports, no new Hostile
fields (reused the existing `phaseAge` clock), no aggro-scaling of the grace
(not requested by any AC).

**Tests:** 690/690 passing (GREEN), full battlezone suite. `tsc --noEmit` clean.
Verified by testing-runner, RUN_ID bz2-9-dev-green:
- `enemies-spawn-fairness.test.ts` — 7/7 green (AC-1/AC-2/AC-3).
- `enemies` / `enemies-roster` / `enemies-aggro` / `enemies-purity` — no regressions
  (purity green ⇒ the core stayed pure: no DOM/time/`Math.random`, no type escapes).

**Branch:** `feat/bz2-9-fair-enemy-spawns` (pushed to origin, tracking set; no PR — SM opens it at finish).

**AC coverage:**
- AC-1 (no sub-2s unavoidable spawn deaths) — forward spawn + fire grace; RED tests green.
- AC-2 (forward/reactable bearing, not rear) — `SPAWN_FORWARD_ARC` bias; green across seeds×facings.
- AC-3 (post-spawn fire grace) — `SPAWN_FIRE_GRACE` gate on `phaseAge`; green.
- AC-4 (ROM difficulty ceiling intact) — settled tanks fire unchanged; grace is brief; guards green.

**Self-review:** Code wired into the live sim (`spawnHostile`/`stepEnemies` are the
real spawn + step paths used by `sim.ts`); follows the file's existing constant +
comment idiom; error handling N/A (pure deterministic reducer); working tree clean;
no debug code.

**Handoff:** To Reviewer (Immortan Joe) for code review.

## Subagent Results

### R2 (2026-07-05)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 695/695 green, tsc clean, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — self-covered (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — self-covered (see [SILENT]) |
| 4 | reviewer-test-analyzer | Yes | findings | 5 | 0 blocking; 3 confirmed non-blocking (→ Delivery Findings), 2 dismissed w/ rationale |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — self-covered (see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — self-covered (see [TYPE]) |
| 7 | reviewer-security | Yes | clean | none (1 informational) | N/A — no impurity/overflow/escapes; reload carry-over masked by the 2s grace |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — self-covered (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 14 rules / 46 instances, 0 violations |

**All received:** Yes (4 enabled returned; 5 disabled via settings, domains self-covered below)
**Total findings:** 0 blocking, 3 confirmed non-blocking (→ Delivery Findings), 3 dismissed/informational with rationale

### R1 (superseded)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 690/690 green, tsc clean, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain self-covered (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain self-covered (see [SILENT]) |
| 4 | reviewer-test-analyzer | Yes | findings | 6 | confirmed 3 (non-blocking → Delivery Findings), 3 noted/dismissed with rationale |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain self-covered (see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain self-covered (see [TYPE]) |
| 7 | reviewer-security | Yes | clean | none | N/A — no impurity/DoS/overflow/escapes |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain self-covered (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 18 rules / 24 instances, 0 violations |

**All received:** Yes (4 enabled returned; 5 disabled via settings, their domains self-covered below)
**Total findings:** 0 confirmed blocking, 3 confirmed non-blocking (→ Delivery Findings), 3 noted/dismissed with rationale

## Reviewer Assessment

> **R2 REOPEN (2026-07-05, Immortan Joe).** The R1 assessment below is SUPERSEDED. This
> is the review of the R2 delta (`git diff 591878e HEAD`): the respawn fire-grace reset +
> the barrier reload. R1's forward-hemisphere geometry (approved at 591878e) is unchanged
> and carried on the same branch.

**Verdict:** APPROVED

**Scope reviewed:** `src/core/enemies.ts` (+`reload?` field, `SPAWN_FIRE_GRACE` 0.5→2.0,
`SHELL_RELOAD` const, reload countdown/strike-set/gate), `src/core/sim.ts` (respawn
`phaseAge` reset), + the R2 tests. 4 enabled subagents returned (preflight/test-analyzer/
security/rule-checker); 5 disabled, self-covered below.

**Observations (≥5, tagged):**
1. [VERIFIED] Respawn grace is correct — `sim.ts` respawn branch resets `phaseAge` to 0
   ONLY for an `alive` survivor (`survivor.hostile.phase === 'alive' ? {...} : survivor`),
   via spread (non-mutating). With `SPAWN_FIRE_GRACE = 2.0` the survivor holds fire ~2 s
   after the player respawns. ROM-faithful: rez_protect resets on respawn ($5215/$5222).
   Empirically load-bearing — the test-analyzer reverted this line and the survivor fires
   at t≈0 (the "~3 s of life" bug), restored clean. `sim.ts:185-193`.
2. [VERIFIED] Reload is correct — `reload = Math.max(0, (state.reload ?? 0) − dt)` (clamped
   ≥0, dt-driven, pure), armed to `SHELL_RELOAD` (0.4 s) on `shellBlocked`, gated in the
   fire `if` via `reload <= 0`. Barrier-wedged tank drops from 24 → ~5 muzzle flashes / 2 s.
   Empirically load-bearing — removing the gate restores 24 flashes. `enemies.ts:391/452/498`.
3. [TEST] test-analyzer, finding #1 (CONFIRMED, non-blocking — coverage gap, not a defect):
   the `: survivor` branch (an EXPLODING hostile at player death — every missile-contact
   kill, and the lingering-shell tank kill) is untested. I verified the CODE is correct
   (`enemies.ts:523-527` burns the blast timer + spawns the replacement; leaving phaseAge
   untouched is exactly right — resetting it would corrupt `EXPLOSION_DURATION`). → Delivery
   Finding for a hardening test.
4. [TEST] test-analyzer, finding #2 (CONFIRMED as accepted-deviation, non-blocking): reload
   arms only on obstacle strike, not on range-wall expiry / player-hit, so a low-aggro "bad
   shot" that flies to the range wall lets the tank refire the same frame it expires. Sound
   — an expiring shot has already occupied ~127 frames of flight (~2 s), so this is NOT the
   barrier machine-gun; it's the intended Dev deviation (obstacle-strike only). Untested
   interaction → Delivery Finding.
5. [TEST] test-analyzer, findings #3/#4/#5 (DISMISSED w/ rationale): super-tank reload
   untested → shared fire-gate code path with tank, low risk (noted). Roster `phaseAge 1→3`
   margin coupling → accepted TEA deviation, already commented, soft not exact. `range===0`
   muzzle-flash proxy → the only fire signal at the `stepEnemies` API surface, reasonable.
6. [SEC] security subagent: clean, 0 violations. No impurity (`Math.random`/`Date`/DOM), no
   NaN/∞ (`Math.max(0, …−dt)` bounded), no unbounded loop (substep bound untouched), no type
   escape, non-mutating reducers verified. One informational nuance: `reload` lives on
   `EnemyState`, so a same-step `spawnReplacement` inherits ≤0.4 s of leftover reload —
   DISMISSED (impact nil: a fresh replacement has `phaseAge 0` and is grace-locked for 2 s,
   which dwarfs and fully masks the ≤0.4 s reload). Corroborated by `enemies-purity.test.ts`.
7. [RULE] rule-checker: clean, 14 rules / 46 instances / 0 violations. `reload?: number` is
   `readonly`, typed, optional-for-a-documented-reason (#2); `?? 0` not `||` (#4); const
   style + ROM-cited docs (#14 core-purity); test-quality (#8) meaningful. Matches my own read.
8. [EDGE] (self-covered — subagent disabled): the `phase === 'alive'` reset also fires for an
   alive MISSILE carrying a lingering tank shell that kills the player (tank→dies→missile
   replacement→old shell hits) — it resets the missile's swerve clock. LOW/harmless: the
   missile keeps homing (deterministic), and a missile has no fire grace so the reset is
   inert. A `kind !== 'missile'` guard would tidy it; not required. `sim.ts:186`.
9. [SILENT] (self-covered): no swallowed errors — pure arithmetic reducer, no try/catch, no
   silent fallback. `Math.max(0, …)` explicitly clamps (no silent negative reload).
10. [DOC] (self-covered): comments accurate + ROM-cited ($6595 rez_protect, $a0 explosion,
    $5215/$5222 respawn) against the decoded quarry; the stale R1 "kept under ~1 s" claim was
    correctly removed; `SHELL_RELOAD` honestly self-flags PROVISIONAL.
11. [TYPE] (self-covered): optional `reload?: number` is a sound minimal choice — mirrors the
    `missilesLaunched ?? 0` idiom, keeps dozens of pre-R2 `EnemyState` literals typechecking;
    output always carries `reload: number`. No casts/escapes. `tsc --noEmit` clean.
12. [SIMPLE] (self-covered): minimal — 1 field + 2 consts + 3 expression edits + 1 sim branch.
    No new abstraction, no dead code, one rng draw preserved. Appropriately restrained.

### Rule Compliance (lang-review checklist mapping)

- **#1 type escapes** — none (no `as any`/`!`/`@ts-ignore` in the R2 hunks; rule-checker + grep clean).
- **#2 generics/readonly** — `reload?: number` is `readonly` + typed; no `Record<string,any>`/`Function`.
- **#3 enums** — n/a (no enums; `HostileKind`/`HostilePhase` unions untouched).
- **#4 null/undefined** — `state.reload ?? 0` uses `??` (0 is a valid "ready"); no `||` bug.
- **#5 module/declaration** — test imports use inline `type`/`import type` correctly; `.js` omitted per `moduleResolution: bundler`.
- **#6 React/JSX** — n/a (.ts).
- **#7 async** — n/a (pure sync sim).
- **#8 test quality** — meaningful assertions w/ messages; RED-drivers empirically load-bearing; no `.only`/`.skip`/`as any`.
- **#9 build/config** — no config change; strict on; tsc clean.
- **#10 input validation** — n/a (pure sim math).
- **#11 error handling** — n/a (no try/catch).
- **#12 perf/bundle** — no barrel/`JSON.stringify`/sync-fs; hot-path additions are O(1) arithmetic.
- **#13 fix-introduced regressions** — re-scanned R2 hunks against #1-12; none.
- **Core-purity (epic)** — no banned impurity; time via `dt`, randomness unchanged (no new draw); non-mutating reducer; ROM-cited doc-comment idiom. Green under `enemies-purity.test.ts`.

**Data flow traced:** player death (`enemyStep.playerHit`, `sim.ts`) → respawn branch resets
`survivor.hostile.phaseAge` to 0 → `stepEnemies` fire gate reads `phaseAge >= SPAWN_FIRE_GRACE`
→ survivor holds fire ~2 s. Separately: enemy shell strikes obstacle (`shellBlocked`) → `reload
= SHELL_RELOAD` → fire gate reads `reload <= 0` → no barrel machine-gun. Both inputs are pure
carried state (dt-driven), no DOM/time/external source.

**Wiring:** `stepBattle`'s respawn branch and `stepEnemies`' fire gate are the real live-sim
paths (`stepGame` drives them); the new tests exercise them end-to-end via `stepGame`/
`stepEnemies`. Not dead code — the 695-test suite is green.

**Pattern observed:** constants-with-ROM-rationale + a defensively-read optional counter
(`reload ?? 0`) mirroring the established `missilesLaunched ?? 0` idiom — `enemies.ts:387-391`.

**Error handling:** N/A — pure deterministic reducer; the only new branch (`phase === 'alive'`)
is total (alive vs not); `Math.max` clamps the one arithmetic edge.

### Devil's Advocate

Assume it's broken. **Grace too generous (AC-4)?** 2.0 s of no-fire after every spawn/respawn
could gut lethality — but the ROM does exactly this (rez_protect ~2 s, "don't be unfair") and
enemies stay fully lethal AFTER the beat; the aggro + roster lethality suites are green, and the
"grace lifts within 4 s" test guards against a permanent cease-fire. Not over-corrected.
**Open-field machine-gun?** The reload arms only on obstacle strike, so a shot that misses
everything and expires at the range wall lets an immediate refire (test-analyzer #2) — but that
shot flew ~127 frames (~2 s) first, so the cadence is flight-limited, not spam; the barrier case
(fast clear) is exactly what's gated. **Determinism drift?** `reload` is dt-driven and consumes
no rng; the fire gate adds no draw; determinism/replay tests green. **NaN/∞?** `reload =
Math.max(0, (reload ?? 0) − dt)` is bounded below at 0 and finite for finite dt; `phaseAge` reset
to 0 is finite. **Exploding-survivor corruption?** The reset deliberately skips exploding
hostiles, so the blast timer runs intact and the replacement gets a fresh grace — verified
correct, though untested (captured). **Missile respawn?** A missile contact marks the missile
exploding → hits the `: survivor` (no-reset) branch → replacement spawns grace-locked; the player
IS protected. **Reload carry-over to a replacement?** Real but masked — a fresh replacement is
phaseAge-0 grace-locked for 2 s ≫ the ≤0.4 s inherited reload. **Weakest spot:** the
exploding-survivor branch and the super-tank reload path lean on shared-code-path reasoning
rather than a pinned test — captured as non-blocking Delivery Findings, not blockers, because
the code is provably correct and the shared paths are green. Conclusion: no Critical/High; the
R2 diff is correct, minimal, pure, ROM-grounded, and green.

**Handoff:** To SM (The Organic Mechanic) for finish-story. NOTE: like R1 and the sibling
Battlezone tuning stories, the two provisional values (`SPAWN_FIRE_GRACE=2.0`, `SHELL_RELOAD=0.4`)
warrant the user's LIVE PLAYTEST before archive — this fixes a playtest bug and the "fair feel"
is the user's subjective call.

---

### R1 Reviewer Assessment (superseded)

**Verdict:** APPROVED

**Observations (≥5, tagged):**
1. [VERIFIED] Forward-hemisphere spawn math is correct — `dir = player.heading + (nextFloat−0.5)·SPAWN_FORWARD_ARC` (π) ⇒ offset ∈ [−π/2, π/2), measured off `player.heading` (NOT a world axis) — `src/core/enemies.ts:244`. Draws from the seeded rng (core-purity compliant). Geometry RED tests green across 96 seeds × 9 headings, init + replacement paths.
2. [VERIFIED] Fire grace is correct — `hostile.phaseAge >= SPAWN_FIRE_GRACE` (0.5s) added to the alive-tank fire gate — `src/core/enemies.ts:474-479`. `phaseAge` is dt-accumulated (pure). Missiles are correctly excluded (they own no shell). The grace value is capped ≤1s by the existing `enemies-roster.test.ts:588` (aimed super tank fires at phaseAge 1), so it cannot balloon unnoticed.
3. [SEC] security subagent: clean. No impurity (`Math.random`/`Date`/DOM), no unbounded-work hang (the `for(;;)` spawn-rejection loop still terminates against ~21 sparse obstacles over the half-ring), no NaN/overflow, no type escapes. Corroborated by my read + `tests/core/enemies-purity.test.ts` (green).
4. [RULE] rule-checker: clean. 18 rules / 24 instances, 0 violations. Both constants are `const`/SCREAMING_SNAKE with accurate ROM/story doc comments; rule #4 (`||` vs `??`) does not arise in either new expression; core-purity + non-mutating-reducer discipline intact.
5. [TEST] test-analyzer: 6 findings, NONE a current correctness bug. Confirmed 3 as non-blocking Delivery Findings (F4 loose 3s upper bound; replacement/super-tank grace not directly pinned; missile spawn-to-contact ~1.39s). Dismissed with rationale: a literal "player invulnerable for 2s" test would CONTRADICT AC-4 (enemies must remain lethal) — reactability is correctly pinned by grace+geometry instead; and the rng-consumption-parity claim is factually true (one `nextFloat` draw, verified) though not independently pinned (low, doc-only).
6. [EDGE] (subagent disabled — self-covered): Boundary audit — `nextFloat()` returns [0,1), so the offset reaches exactly −π/2 (spawn dead abeam, left) but never +π/2; both extremes are "not behind" and within spec. The grace gate uses `>=` (inclusive), so a tank fires on the first frame `phaseAge` reaches the grace — consistent with the settled-fires test. No off-by-one.
7. [SILENT] (disabled — self-covered): No swallowed errors — pure arithmetic reducer, no try/catch, no silent fallback. The `for(;;)` loop does not degrade silently (it retries deterministically; it never returns a blocked position on give-up).
8. [DOC] (disabled — self-covered): Both new constants and the fire-gate inline comment are accurate; the "kept under ~1s" claim is verified against `enemies-roster.test.ts:588`. No stale/misleading comments.
9. [TYPE] (disabled — self-covered): No new types; constants are plain `number`; no casts/escapes; `Hostile`/`EnemyState` unchanged — the fix reused the existing `phaseAge` clock rather than adding a field, so zero type blast-radius on the many literal constructors across the suite.
10. [SIMPLE] (disabled — self-covered): Minimal change — two module constants + two expression edits, no new abstraction, no dead code, one rng draw preserved. Appropriately restrained.

### Rule Compliance (lang-review checklist mapping)

- **#1 type-safety escapes** — none (grep clean, both files).
- **#2 generics/readonly** — constants plain `number`; no `Record<string,any>`/`Function`/un-readonly params.
- **#3 enums** — n/a (`HostileKind`/`HostilePhase` are pre-existing string unions, unchanged).
- **#4 null/undefined (`??` vs `||`)** — n/a; neither new expression uses `??`/`||`.
- **#5 module/declaration** — test imports use inline `type`; `.js` omitted per `moduleResolution: bundler`. Compliant.
- **#6 React/JSX** — n/a (.ts).
- **#7 async** — n/a.
- **#8 test quality** — meaningful assertions with messages, no vacuous/`.only`/`.skip`/`as any`; deliberate decoupling from the exact grace value. Compliant (F4 upper-bound noted as Improvement).
- **#9 build/config** — no config changes; strict on.
- **#10 input validation** — n/a (pure sim math, no external input).
- **#11 error handling** — n/a.
- **#12 perf/bundle** — no barrel/`JSON.stringify`/sync-fs; loop shape unchanged.
- **#13 fix-introduced regressions** — re-scanned #1-#12 on the added hunks; none.
- **Core-purity (epic)** — no banned impurity tokens; time via `dt`, randomness via `nextFloat(rng)`; core-only sibling imports; non-mutating reducer; doc-comment idiom. Compliant (continuously enforced by `enemies-purity.test.ts`, green).

**Data flow traced:** `player.heading` (carried `TankPose` sim state) → `spawnHostile` `dir` → spawn (x,z); `hostile.phaseAge` (dt-accumulated in `stepEnemies`) → fire gate. Safe because both inputs are pure carried state — no DOM/time/external source.

**Wiring:** `initEnemies` / `stepEnemies` / `spawnHostile` are the real spawn + step paths the live sim (`sim.ts`) drives; exercised end-to-end by the 690-test suite (green). Not dead code.

**Pattern observed:** constants-with-rationale + guarded expression edits, matching the file's established "Provisional AI tuning" idiom (`AIM_TOLERANCE`, throttles) at `src/core/enemies.ts:157-182`.

**Error handling:** N/A — pure deterministic reducer, no failure modes; inputs required by type; the sole loop is bounded-in-practice (verified).

### Devil's Advocate

Assume it's broken. **Spawn loop hang:** if a player sat where the entire forward half-ring were obstacle-blocked, `for(;;)` would spin forever — but 21 obstacles of radius ~512–1130 units cannot cover a half-ring arc of ~72k+ circumference at 16k–30k radius; the 100-seed obstacle test at ORIGIN (inside the field) is green. Not broken. **Determinism drift:** the new `dir` consumes one `nextFloat` (was one), so downstream draws are unshifted; the determinism-replay tests are green. **NaN/∞:** `phaseAge` is dt-accumulated from 0 (finite, monotone); `heading` is wrapped sim state; `sin/cos` of finite → finite; no NaN path. **Over-correction (AC-4):** does the grace make the opening too safe? No — a settled tank fires unchanged (F2 green), the grace is a brief 0.5s, and enemies still crawl/aim/fire and stay lethal (the aggro + roster lethality suites are green). **Confused constant:** `SPAWN_FORWARD_ARC = π` reads as "hemisphere width"; a maintainer might mistake it for a half-angle and pass `π/2`, silently narrowing to ±π/4 — still in-spec (forward), so not a bug, just a naming sharp-edge worth the doc comment it already has. **The real residual:** missiles bypass the grace and can contact in ~1.39s (first, non-weaving, from `SPAWN_MIN`) — under AC-1's 2s bar. But missiles are score-gated (not the opening bz2-9 addresses), this diff does not change their speed/range, and the geometry fix actually *improves* them (forward, visible, shootable). Captured as a deferred Question, not a blocker. **Weakest test:** F4's 3s upper bound could admit a grace drift into (0.5, 1.0] — but the roster test caps grace ≤1s, bounding the blast radius to a minor fairness nudge. Captured as an Improvement. Conclusion: no Critical/High findings; the code is correct, minimal, pure, and green.

**Handoff:** To SM (The Organic Mechanic) for finish-story.