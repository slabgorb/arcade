---
story_id: "sw7-17"
jira_key: "sw7-17"
epic: "sw7"
workflow: "tdd"
---
# Story sw7-17: R11b ROM laser is HITSCAN gun→site — 8-frame LZ.EDG sweep, instant resolve under the site, trench clip $7000 (G-004 re-ruled wont_fix→fix, G-012); BLOCKS sw7-6

## Story Details
- **ID:** sw7-17
- **Jira Key:** sw7-17
- **Workflow:** tdd
- **Stack Parent:** sw7-16 (already merged to develop at ed90205)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-17T13:08:38Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-16T14:22:00Z | 2026-07-16T14:25:43Z | 3m 43s |
| red | 2026-07-16T14:25:43Z | 2026-07-16T14:54:23Z | 28m 40s |
| green | 2026-07-16T14:54:23Z | 2026-07-17T12:48:56Z | 21h 54m |
| review | 2026-07-17T12:48:56Z | 2026-07-17T13:08:38Z | 19m 42s |
| finish | 2026-07-17T13:08:38Z | - | - |

## Sm Assessment

**Story:** sw7-17 — R11b: port the ROM's HITSCAN player laser (5 pt, tdd, star-wars).

**Setup verified (not taken on the subagent's word):**
- Session file `.session/sw7-17-session.md` — present, story-id-only filename.
- Context `sprint/context/context-story-sw7-17.md` — authored, not the stub.
- Branch `fix/sw7-17-rom-hitscan-laser` — created in star-wars off `develop` @ `ed90205`.
- Story `status: in_progress`, `started: 2026-07-16`, `branch:` recorded in epic-sw7.yaml.
- Merge gate CLEAR: `gh pr list -R slabgorb/star-wars --state open` empty after `fetch --prune`.

**Dependency:** sw7-16 (R11a ship point) is `done` and merged — `ed90205` is the branch
base, so the ship point this story's beam originates from already exists in the tree.

**Corrections made at setup:**
- sm-setup left `status: backlog` and recorded no `branch:`. Both fixed.
- `pf context create` emitted a stub with placeholder Technical Approach and
  "no ACs recorded". No committed context existed, so nothing was clobbered — the
  stub was replaced with the ruled design transcribed from
  `docs/superpowers/specs/2026-07-16-surface-gunnery-and-traversal-design.md` (Defect 2 /
  Design R11b). Seven candidate ACs are recorded there for TEA to finalize in RED.

**Routing notes for TEA (Han Solo):**
- The design is **already ruled by the Jedi** — implement R11b, do not redesign it.
- Scope trap: enemy fireballs **stay projectiles** (authentic); `PROJECTILE_SPEED`/`TTL`
  must survive for them. The trench torpedo latch is untouched. Pacing is sw7-18, not here.
- Citation trap: remediated citations stay **frozen as history** — do not launder onto
  live lines. Stamp `remediated_by` G-004 (+G-012 if the sweep lands).
- Inherited follow-up **(b)** is a live hazard for this exact change: `spawnTie`'s
  `toCockpit` is untested and safe only while `dir` is vestigial — sw7-16's reviewer
  named R11b's hitscan beam as the candidate to break it.
- Hard rule: the hitscan resolve is pure-core (`dt` only, seeded RNG, 3D world space);
  only the gun→site beam stroke belongs in `shell/`.
- Proportionality (per the sw7-16 retro): this is 5 points. Prose/comment MEDIUMs are
  follow-ups, not blocks.

**Verdict:** Setup complete. Gate conditions met. Handing off to TEA for the RED phase.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 5-pt behavioural change to the pure core — the firing model itself.

**Test Files:**
- `tests/core/hitscan-laser.test.ts` — the resolve model: instant (no travelling bolt), lead-free at lateral offset, nearest-under-the-site (CLSLZ), cast from the ship point, the trench $7000 clip (CLBLZ), enemy fire left alone, purity/determinism.
- `tests/core/laser-sweep.test.ts` — the 8-frame LZ.EDG window: it exists and is ~8 game frames, it is retriggerable, it is a DURATION and not a cooldown, and no trigger means no laser.
- `tests/audit/sw7-17-remediation.test.ts` — the bookkeeping AC: G-004 + G-012 stamped; G-005/6/7/8/9 stay open; G-003 keeps sw7-1.

**Tests Written:** 30 tests (13 failing) covering 7 ACs
**Status:** RED — verified, and verified to fail for the RIGHT reasons.

```
Test Files  3 failed | 122 passed (125)
     Tests  13 failed | 1500 passed (1513)
npm run lint (tsc --noEmit)  clean
```

Every failure is a clean assertion failure — no compile errors, no fixture throws, no
undefined-property crashes. The pre-existing suite is **fully green**: the only failing files are
the three added here.

### ROM grounding (read at source, not taken from the finding)

`~/Projects/star-wars-1983-source-text/WSLAZR.MAC`, `.RADIX 16`. Four facts drive the suite:

| Fact | ROM |
|------|-----|
| Trigger loads the counter to 8 (≈0.390 s @ 20.508 Hz) | `:106-107` `LDB #8 / STB LZ.EDG` |
| The laser can ONLY hit while it is on — the window IS the collision window | `:98-99` `STA LZ.ON ;AND STOP ALL LAZARS`; `CLSLZ:763` opens `LDA LZ.ON / IFNE` |
| Nearest wins — min(CL.GDS, CL.ADS) | `:766-771` `SUBD CL.ADS / BLO HTSG` |
| The site is **re-latched every frame of the sweep**, not frozen at the pull | `LDD VG.RSX / STD LZ.RSX` sits INSIDE the `IFGT` |

Two corrections to the received account, both load-bearing:
- **"Under the site" is a size-scaled test, not a fixed reticle radius.** Each object tests the
  site against its own projected size and keeps the nearest (`WSGUNS.MAC:938-948` — a box test,
  then `MAKE 1.5 FOR OCTAGON`, then `CMPD CL.GDS / IFLO / STD CL.GDS`). The clone's exact
  world-space equivalent needs **no new constant**: the aim ray from the eye passes within the
  object's existing hit radius, nearest along the ray wins. Same predicate, same radii, pure Math Box.
- **The 8 frames are a DURATION, never a cooldown** — G-012 says so in terms ("do not port 8
  frames as a cooldown") and the ROM agrees. `laser-sweep.test.ts` has a test whose only job is
  to catch that conflation.

### Rule Coverage

No `.claude/rules/` or `SOUL.md` in this project; the rubric is
`.pennyfarthing/gates/lang-review/typescript.md` plus star-wars's own core/shell boundary.

| Rule | Test(s) | Status |
|------|---------|--------|
| #3 exhaustiveness over `Phase` | all three phases resolve a hit — space (`homing`/cockpit), surface (a-d), trench (f) | failing |
| #4 null/undefined (`0` is falsy-but-valid) | probes seated at `altitude`/`EYE_HIGH`; the sw7-16 suite already pins `surfaceShip(0)` | passing |
| #8 test quality — no vacuous assertions | self-checked; every test asserts a value, none uses `let _ =`/`assert(true)` | — |
| #8 test quality — fixtures must discriminate | "the fixture is honest" derives the projectile's miss from the constants and fails loudly if a retune ever closes the gap | passing |
| core purity (star-wars hard rule) | "is pure and deterministic" + "does not mutate the state it was handed"; `events.test.ts:282-314` already scans core for shell imports | failing |

### The honesty pass — what I got wrong and fixed before handoff

The first RED run turned up **five** of my own errors, and they are worth recording because they
are the exact failure sw7-16 was rejected for (a suite claiming credit it had not earned):

- Four tests carried labels asserting they were "green today"/"AC coverage" when they were in
  fact red. They are measured on ONE frame, so they were red for the instant-resolve reason, not
  the reason their comment advertised. All four now state which reason makes them red and what
  their real (forward) job is.
- One test was simply **wrong** and could never have passed: it asserted a tower's fireball flies
  UP at the pilot. The white cap stands at `TOWER_HEIGHT` (352) and the pilot cruises at
  `MAX_SKIM_ALTITUDE` (238) — the tower shoots **down** at him. Replaced with a direction
  assertion against `normalize(sub(eyeOf(s), muzzle))`.
- I nearly committed a comment claiming today's bolt kills a square beyond $7000 at t≈2.3 s.
  **Probed it instead of asserting it**, and it was false: the bolt *aliases past* it (see the
  Delivery Finding). That test is green today for a reason unrelated to the clip, and now says so.

**Handoff to Dev (Yoda):** the story is ruled and designed — implement R11b, do not redesign it.
The three traps, in order of how likely they are to bite: (1) reusing `lockedEnemy` as the
resolver re-introduces R11a's parallax, because it measures from the origin; (2) `advance()` is
shared with enemy fire — it is a caller deletion; (3) sw7-16's muzzle guards must be migrated,
not deleted. Read the Delivery Findings before stamping G-012.

## Dev Assessment

**Implementation Complete:** Yes — **1501/1501, `tsc` clean, citations clean (0 drift, 0 lost).**

**Branch:** `fix/sw7-17-rom-hitscan-laser` (pushed)

### Verified by MUTATION, not by being green

Green proves nothing on its own — this story found **eleven** tests that were already passing
vacuously. Each ruled behaviour was reverted in `src/` and the suite re-run:

| Mutation | Result |
|---|---|
| `beamHit` → always `null` (the beam hits nothing) | **120 tests / 31 files** red |
| The `$7000` trench clip disabled | 2 red (`hitscan-laser` + `swept-port-collision`) |
| Edge-trigger removed (back to level-triggered auto-fire) | 1 red |
| Beam cast from the world origin instead of `shipPoint` | 3 red — incl. R11a's parallax guard |

The origin mutation reddening "hits a near, low tower the pilot is diving at" is the forward guard
doing exactly the job it was written for: it catches the `lockedEnemy`-reuse trap.

**Files Changed (src — complete):**
- `src/core/gameRules.ts` — `beamHit()`: ray-vs-sphere in world space. "Under the site within the object's hit radius at its depth" needs NO new constant and reuses the existing radii, so the beam and the sphere can never disagree about a target's size.
- `src/core/state.ts` — `LASER_SWEEP_SECONDS = 8 / TICK_HZ` (the house idiom, cf. `ENEMY_SHOT_TTL = 64 / TICK_HZ`); `laserEdge` (LZ.EDG); `firePrev` (the trigger's rising edge).
- `src/core/sim.ts` — the trigger opens the sweep instead of spawning a bolt; CLSLZ/CLGLZ/CLBLZ resolves per phase; the trench beam clipped to `TRENCH_FAR`; the torpedo latch re-wired to the beam; `shipPoint` exported.
- `src/shell/render.ts` — the beam is drawn gun-ports → SITE while the sweep is on. The core's window IS the flash, so the shell keeps no timer of its own and cannot drift from the frames that actually kill things. `LASER_FLASH_SECONDS` and the `PROJECTILE_TTL - p.ttl` trigger are gone.
- `docs/audit/findings/` — G-004 + G-012 stamped; G-005/S-005/A-005 re-quoted onto their rewritten lines (still OPEN — not laundered); citations reanchored, 0 lost.

**Rulings taken (the Jedi, 2026-07-16):**
- **Land edge-trigger too (full G-012).** One pull = one shot. This was load-bearing, not scope creep: `FIRE_INTERVAL` (0.25 s) is SHORTER than the sweep (0.39 s), so under the old level-triggered auto-fire a held trigger reloaded `LZ.EDG` before it could ever expire and the laser was simply on for ever — the window had no observable meaning.
- **Push on through the fixture migration** rather than re-size.

**The migration, which was the bulk of the story:** 29 suites / 125 tests encoded the projectile
model. All migrated — a hand-placed bolt became an aimed trigger pull, which is strictly stronger
(it goes through the real aim, the real ship point and the real resolve). What it turned up:

- **ELEVEN tests were already passing vacuously** once the bolt stopped landing ("no shield lost"
  was really "nothing happened"; "a bunker kill cannot clear the phase" was really "no shot fired").
  None were in the 125 failures — they would have survived a green run unnoticed.
- **An in-window exhaust port is unshootable BY ANYONE, and has been since sw5-6.** The pilot sits
  768 above a floor-mounted porthole so the yoke only reaches past ~1,330, while
  `PORT_APPROACH_WINDOW` is 800 — the bands do not overlap at ANY eye height. Every `-300` port
  fixture in this epic was an impossible shot; hand-placed bolts never had to be aimable, a beam
  does. So arm-early/resolve-late is **forced**, not a convenience. Several surface fixtures were
  un-aimable the same way (a target 52° down against the 30° the FOV allows).
- **Nothing tested edge-triggering** — `laser-sweep.test.ts` scoped it out at RED, before the
  ruling — so that gap is now closed.
- `extra-life`'s both-thresholds guard needs a 400,001 single-frame delta; the beam's maximum is
  now 2,000. Rather than lose a guard no other test can catch, `finalizeScore` is **exported** and
  the funnel tested directly: the same arithmetic with the unreachable theatre removed.
- `swept-port-collision` keeps its file but changes premise — a ray cannot tunnel, so it now pins
  the guarantee sw4-4 was *protecting* (outcome independent of frame rate and range) rather than
  the mechanism that protected it.

## Subagent Results

Only `preflight` and `rule_checker` are enabled in `workflow.reviewer_subagents`; the other seven
are disabled via settings. I covered their domains **myself** — every claim below is backed by a
probe I ran, not an opinion (the probes are recorded in the assessment).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1501/1501, lint+build clean, citations 0-drift/0-lost, tree clean, zero smells, tests net +26 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — covered by me (beamHit totality probe, laserEdge hostile-dt probe) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — covered by me (beamHit fails CLOSED on every degenerate input) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by 4-mutation check (120/2/1/3 red) + preflight's net +26 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by me; found the stale cluster (F3/F4) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by me + rule-checker rules #2/#3/#20 |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — no new input/API/parse boundary in the diff; the only external input is `input.fire: boolean` and the yoke scalars |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — covered by me; found the dead exports (F5) |
| 9 | reviewer-rule-checker | Yes | findings | 5 (2 confirmed bugs, 3 smells) | confirmed 5, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled returned; 7 disabled via settings and covered by the Reviewer directly)
**Total findings:** 6 confirmed, 0 dismissed, 0 deferred

**The rule-checker earned its keep — it found two bugs I missed**, both reproduced by execution, and
I independently re-reproduced both before accepting them. Its rule sweep was clean on #1-#18 and #21
(61 instances across 21 rules); its two violations are F1 and F6 below.

## Reviewer Assessment

**Verdict:** APPROVED — with six required follow-ups. No Critical or High.

**Data flow traced:** pointer (`shell/input.ts:22`, listener on `window`, **unclamped**) →
`input.aimX` → `sim.ts:109` → `aimDirection` (unclamped) → `beamDir` → `beamHit` → kill. In
parallel: `crosshairNdc` (**clamps** to ±1) → the drawn reticle and the drawn beam. Safe for
|aim| ≤ 1; diverges beyond it — see F2.

**Pattern observed:** `beamHit` (`gameRules.ts:115-127`) is the right shape — it says the ROM's
screen-space "under the site" test in world space, reuses the existing hit radii instead of
inventing a reticle size, and routes every operation through the Math Box. Beam and sphere cannot
disagree about a target's size by construction.

**Error handling:** `beamHit` is TOTAL and fails **closed** on every degenerate input — probed:
target-at-the-eye, behind-the-gun, `radius=0`, `maxRange=0`, NaN in eye/dir/radius, zero-length
dir, and non-unit dir all return `null`. It never produces a *false hit*. `laserEdge` stays finite
and ≥ 0 under `dt` ∈ {1/60, 0, negative, 1e6, NaN} — probed.

### Findings

| Sev | # | Issue | Location | Fix required |
|-----|---|-------|----------|--------------|
| MEDIUM | F1 | **[RULE] The draw window is one frame SHORTER than the kill window.** `laserOn` (the collision gate) reads `laserEdge` PRE-decrement; the value stored on the returned state — which the shell gates on — is POST-decrement. So the last collision-eligible frame of EVERY sweep stores `laserEdge === 0` and draws no beam. **Reproduced twice** (rule-checker, then me independently): frame 22, `kill landed=true`, `storedLaserEdge=0`. In the ROM both draw and collide hang off the SAME `LZ.ON` (`LDA LZ.EDG / IFGT / DEC LZ.EDG / STA LZ.ON` — A holds the pre-decrement value and feeds both), so this is a real fidelity divergence, not just cosmetics. **And `render.player-laser.test.ts:259` states the opposite as fact**: "the window the shell draws is exactly the window the core can kill in, because it IS that counter." | `sim.ts:192-196` vs `render.ts:443` | Expose the true `laserOn` gate to the shell (or store the pre-decrement value) so both windows are one value again. Correct the test's claim. |
| MEDIUM | F2 | **[DOC] A false claim in a comment I wrote as Dev.** `render.ts` says the beam "lands where it is drawn". **Probed false**: at `aimX=1.5` it is DRAWN at 1.000 (`crosshairNdc` clamps) and RESOLVES along 1.500 (`aimDirection` does not). Reachable in ordinary play — the yoke listener is on `window`, so the pointer leaves the canvas routinely. **The underlying divergence is PRE-EXISTING** (`gameRules.ts:29-32`'s docstring makes the same claim and is untouched by this diff); what is NEW is that the beam's drawn convergence now follows the clamped reticle, where the old render converged on the projected bolt (the truth). | `render.ts:529-541`; pre-existing at `gameRules.ts:29-32` | Correct the claim. The clamp divergence itself is a separate, older bug — worth its own story. |
| MEDIUM | F3 | **[DOC] `sim.ts`'s FILE HEADER still describes the deleted model**: "the player's bolts fly down the aim direction … bolts kill TIEs (score)". This is the first thing a reader of the most-changed file sees. It is precisely the sin that made sw5-6's stale comment mislead sw7-16 into existing. Also `render.ts:567` ("Anchored to the bolt's projected point like the player laser" — no longer true of the player laser), and `state.ts:278`/`:394` ("Hit sphere … for player bolts"). | `sim.ts:8-11`, `render.ts:567`, `state.ts:278,394` | Rewrite to the hitscan model. |
| MEDIUM | F4 | **[DOC] Two comments point at a symbol that no longer exists** — `LASER_FLASH_SECONDS` was correctly deleted, but `render.ts:117` ("Mirrors LASER_FLASH_SECONDS") and `render.ts:882` ("like LASER_FLASH_SECONDS") still name it. Caught by the rule-checker; I missed both. | `render.ts:117,882` | Re-point or drop. |
| MEDIUM | F5 | **[SIMPLE] Three dead exports with actively false docblocks.** `PROJECTILE_SPEED`, `PROJECTILE_TTL` and `sweptCollides` have **zero** `src/` consumers — alive only because tests import them. Their docblocks still describe live behaviour in the present tense ("Player bolt speed … fired down the aim direction"; a 14-line essay on why the reach is split 12000×3 — for a bolt that no longer exists). The design spec expected `PROJECTILE_SPEED`/`TTL` to "survive only where a real projectile remains (fireballs)" — they survive NOWHERE, because fireballs use `ENEMY_SHOT_*`. | `state.ts:172,201`; `gameRules.ts:69` | Delete, or mark plainly as retained-for-tests with the docblocks corrected. |
| MEDIUM | F6 | **[RULE] The trench port-arming precedence violates nearest-wins.** `armingBeam` requires `beamObstacle < 0`, so ANY obstacle under the beam blocks arming REGARDLESS of distance — where CLSLZ ranks by `min(CL.GDS, CL.ADS)`. **Probed**: a farther obstacle gives `armed=false` where the control gives `armed=true`. **Currently unreachable** — obstacle stations sit at y ∈ [768, 1280] (probed), all above the floor, so the ray to a floor-mounted port descends below them beyond it. But **sw7-6 rebuilds exactly this code** on the B-010 panel grid and can trivially make it reachable. | `sim.ts:938-941` | Rank the port against `bestRange` instead of testing `beamObstacle < 0`. |
| LOW | F7 | **[EDGE] A held trigger fires a phantom shot on frame 1 of every run.** None of the six early-return paths maintain `firePrev` (unlike `startPrev`, which is threaded through all of them), and `startRun` → `initialState` hard-resets it to `false` regardless of `input.fire`. Found by me, confirmed and reproduced by the rule-checker. Contradicts "one pull is one shot" in a narrow case; arguably harmless (the cabinet's own verb is PULL TRIGGER TO START). | `sim.ts:118-151`, `sim.ts:489-502` | Seed `firePrev` from `input.fire` in `startRun`, or accept and document. |

### Verified good (each with evidence and rule)

- `[VERIFIED]` **Core purity holds** — `gameRules.ts`/`sim.ts`/`state.ts` contain no shell import, no
  DOM, no `Date.now`/`performance.now`/`Math.random`/`rAF` (grepped). All time enters as `dt`; all
  new state derives purely from `(state, input, dt)`. Complies with CLAUDE.md's hard boundary.
- `[VERIFIED]` **`stepGame` does not mutate its input** — `hitscan-laser.test.ts` structuredClones
  `s0` and deep-equals it after the step; passes. Rule-checker independently confirmed every new
  local is freshly scoped.
- `[VERIFIED]` **Exhaustiveness intact** — `shipPoint`'s switch over `Phase` (`sim.ts:1516`) has
  three cases, no `default`, no trailing return, so a fourth phase is a TS2366. `tsc` clean.
  Rule #3 compliant. No new switch over a union anywhere in the diff.
- `[VERIFIED]` **Rule #4 (`||` vs `??`)** — the only `||` added is
  `portTorpedoArmed || armingBeam`, a boolean disjunction, not a nullish default. `laserEdge: 0`
  and `altitude: 0` are falsy-but-valid and are only ever compared with `>`/`<=`. Compliant.
- `[VERIFIED]` **Rule #1** — zero `as any` / `as unknown` / `@ts-ignore` / `@ts-expect-error` /
  non-null assertions in the src diff. Preflight found zero smells across the whole diff.
- `[VERIFIED]` **The suite is not vacuous** — four mutations of the ruled behaviours: `beamHit`→null
  reddens **120 tests / 31 files**; the `$7000` clip 2; edge-trigger 1; beam-from-origin 3. Green
  here is earned, not assumed. This is the evidence I trust, over any subagent's report or my own.
- `[VERIFIED]` **Wiring** — the shell genuinely reads `state.laserEdge` (`render.ts:443`), and
  `main.ts:146` drives `stepGame(state, input.sample(), dt)` then renders. Not dead wiring.

### Devil's Advocate

*This code is broken. Here is the case.*

**It ships four sentences that are false, in an epic whose entire existence is a monument to one
false sentence.** sw5-6 left "other phases keep the fixed cockpit" — a claim true when written and
false a story later. That sentence cost the project sw7-16, an entire story whose header is a
lament about it. This diff leaves `sim.ts`'s FILE HEADER saying the player's bolts fly down the aim
direction, leaves `render.ts` claiming the beam lands where it is drawn (probed false), leaves two
comments naming a symbol that has been deleted, and leaves `PROJECTILE_SPEED`'s docblock — fourteen
lines of careful reasoning about a bolt's reach — describing an object that no longer exists. The
next story to read those will be sw7-6, which rebuilds the trench, and it will believe them. This
is not a prose complaint: it is the exact failure mode, in the exact repo, for the third time.

**The beam lies to the player twice.** For the last frame of every sweep it kills with nothing drawn
(F1) — and the test that is supposed to guard the draw window asserts, in its own header, that this
cannot happen. A malicious reader would note that the suite's most confident sentence about itself
is false, and ask what else is. Off the canvas (F2) the beam is drawn at the screen edge while the
kill resolves somewhere else entirely — and the pointer leaves the canvas constantly, because the
listener is on `window`.

**A confused user would ask why holding the trigger through the title screen shoots** (F7). A
stressed one would ask what happens at 30fps: the answer is that the sweep resolves ~12 times
instead of ~23, and the ROM's own answer is 8 — the gun's lethality inside a pull is a function of
the frame rate, in a core that promises frame-rate independence.

**What saves it:** the model itself is right, and it is right for verified reasons. `beamHit` fails
closed on every hostile input I could construct — NaN, zero-length, non-unit, behind-the-gun — and
never fabricates a hit. Four mutations of the ruled behaviours redden 120, 2, 1 and 3 tests. Eleven
tests that were quietly passing on nothing were found and re-armed. The findings above are a
maintenance debt and one latent precedence bug, not a broken gun. **But every one of them is the
kind that comes back as somebody else's story.**

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` (#1-#13) + CLAUDE.md's core/shell boundary.
No `.claude/rules/` or `SOUL.md` exist in this project. Rule-checker swept 21 rules / 61 instances.

| Rule | Instances | Verdict |
|------|-----------|---------|
| #1 type-safety escapes | 0 added | ✅ none |
| #2 generic/interface (readonly) | 5 new `StepCommon` fields | ✅ `Vec3` is already a readonly tuple |
| #3 exhaustiveness | 1 (`shipPoint`) | ✅ intact, no `default`, TS2366 on a 4th phase |
| #4 `\|\|` vs `??` | 1 (`portTorpedoArmed \|\| armingBeam`) | ✅ boolean disjunction, not a nullish default |
| #5 module/`.js` extension | 1 new import | ✅ `moduleResolution: bundler` — matches every sibling import |
| #6 React/JSX | 0 | ✅ N/A |
| #7 async | 0 | ✅ N/A — `stepGame` stays synchronous |
| #8 test quality | 33 files | ✅ no `as any`, no mocks, no dist imports, no `.skip`; net **+26** tests |
| #9 build/config | tsconfig untouched | ✅ `strict` + `noUnusedLocals` still on, `tsc` clean |
| #10 input validation | 0 new boundaries | ✅ N/A |
| #11 error handling | 0 | ✅ N/A |
| #12 performance/bundle | 0 | ✅ N/A |
| #13 fix-introduced regressions | 12 re-scanned | ✅ none |
| **core/shell boundary** | 4 sites | ✅ compliant — the resolve is pure core, only the stroke is shell |
| **collision in world space** | 1 (`beamHit`) | ✅ Math Box only, no screen pixels |
| **no input mutation** | 1 (`stepGame`) | ✅ asserted and passing |
| **API surface (#20)** | 3 exports | ⚠️ `shipPoint` + `finalizeScore` are exported for tests only; `finalizeScore(prev, next)` takes two whole `GameState`s to read four scalars — F5-adjacent smell, not a violation |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Question** (non-blocking): G-012 is TWO divergences and this story lands ONE. Its title is "Player fire is **edge-triggered** with an 8-frame laser sweep; ours is a fixed 0.25 s auto-fire cooldown", and its `refutation_corrections` pins the other half: "the ROM fires exactly one shot per trigger falling-edge with no auto-repeat (semi-auto), whereas ours auto-fires at 4/s while the button is held". The story scopes the sweep and rules "stamp +G-012 if the sweep lands" — but stamping it claims the edge-trigger half too. This is not cosmetic: `FIRE_INTERVAL` (0.25 s) is **shorter** than the sweep (8/TICK_HZ ≈ 0.39 s), so a HELD trigger reloads `LZ.EDG` before it can ever expire and the laser is permanently on — the window is only observable if the player lets go. Affects `docs/audit/findings/pair-guns.json` (the G-012 stamp) and `src/core/state.ts:174` (`FIRE_INTERVAL`); needs a ruling from the Jedi — either land edge-triggering too, or stamp G-012 with a scoping note. *Found by TEA during test design.*

- **Gap** (non-blocking): removing the player projectile **breaks sw7-16's regression guards**, which pin "gun == ship point == camera eye" through `s.projectiles[0].pos` — `tests/core/surface-aim-wysiwyg.test.ts` (:162, :167, :177-179, :189, :226-227, :255, :482-483, :520-521) and `tests/core/surface-ship-point.test.ts` (:130-131). These must be **migrated, not deleted**: sw7-16 is one story old and its invariant has to survive in its new form (the beam's origin). Same for `tests/shell/render.player-laser.test.ts`, which imports `PROJECTILE_TTL` and builds `Projectile` fixtures, and `src/shell/render.ts:449`, which derives the muzzle flash from `PROJECTILE_TTL - p.ttl` — with no TTL there is no elapsed-time source and the flash needs a new trigger. *Found by TEA during test design.*

- **Improvement** (non-blocking): the nearest-object-under-the-reticle resolver **already exists** — `isLocked`/`lockedEnemy` (`src/core/gameRules.ts:110-137`) is CLSLZ in miniature, and its own docstring says "a lock means a bolt fired now flies into the target — *the circle never lies*". But it measures from the **world origin** (`length(e.pos)`, and a `transform(perspective…, pos)` that assumes the camera is at the origin) and reads only `state.enemies`. Under hitscan the lock-on ring and the beam MUST agree or the ring starts lying, so they want one shared implementation rather than two answers to the same question — "two ways to ask what is under the reticle" is exactly the drift `surface-ship-point.test.ts` exists to punish. *Found by TEA during test design.*

- **Improvement** (non-blocking): player bolts **alias past trench squares at range** today — a pre-existing defect this story incidentally cures. The bolt advances 200 units/frame (12,000 u/s ÷ 60) and is tested as a POINT against a 90-unit sphere (`collides`, `src/core/sim.ts:750`), so registering a hit depends on where the frame grid lands. Measured on this build: a square at 28,272 dies at t=2.25 s, while one at 29,072 **never dies at all** despite sitting well inside the bolt's ~36,000-unit reach. (The port already knew: the exhaust port uses `sweptCollides` precisely because "the 12,000 u/s bolt tunnels".) An exact ray cannot alias, so hitscan removes it. Recorded, not fixed here. *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (blocking): **the story is materially under-sized — 29 suites / 125 tests encode the projectile firing model** and must be migrated for the suite to go green, which the story explicitly owns ("keep suite green"). The R11b core itself is DONE and green (its own 22 tests pass, `tsc` clean, all 42 audit tests pass incl. citations). The breakage is not a bug in the port; it is the cost of the port. Worst offenders: `surface-aim-wysiwyg` (23), `extra-life` (13), `wave-parity-gates` (10), `shootable-fireballs` (8), `space-combat` (7), `exhaust-port-outcome`/`music-cue`/`swept-port-collision` (6 each), `render.player-laser` (5). **It is not a find-and-replace**, for two reasons: (1) many fixtures hand-place a bolt AT a target and step once — the hitscan equivalent is an *aimed trigger pull*, which is per-test geometry; (2) see the ruling below — one beam resolves ONE object per frame, so every fixture that kills N things in a single frame with N bolts is now expressing something the model cannot do. Affects ~29 files under `tests/`. *Found by Dev during implementation.*

- **Question** (blocking): **hitscan makes multi-kills-per-frame impossible, and that is a gameplay change beyond "the gun no longer travels."** CLSLZ resolves exactly one object per frame (`CL.GDS` holds ONE winner; `min(CL.GDS, CL.ADS)` picks one), and re-fire stays gated at `FIRE_INTERVAL` = 0.25 s. So killing three TIEs went from one frame (three bolts, as `extra-life.test.ts:139` and `:156` do today) to ~0.75 s of held trigger. That is authentic, and it is also a real difficulty change the design spec does not mention. It needs a ruling before ~125 tests are rewritten around it, because the rewrite bakes the answer in. Affects `src/core/sim.ts` (the CLSLZ resolve) and every multi-kill fixture. *Found by Dev during implementation.*

- **Gap** (non-blocking): **the sweep resolves once per SIM frame, but the ROM resolves once per GAME frame — so our beam is ~3× the cabinet's lethality inside one pull.** `laserOn` is true for `LASER_SWEEP_SECONDS` (0.39 s) and the resolve runs every `stepGame`, i.e. ~23 times at dt=1/60. The ROM's `LZ.EDG` is an integer counted down ONCE per game frame at 20.508 Hz, so a pull gets exactly **8** resolves and therefore at most 8 kills. Ours gets ~23 — and the number depends on dt, which is a frame-rate dependence in a core that promises not to have one (in practice the loop is fixed-timestep at 1/60, so it is latent rather than live). Invisible in the common case (one target dies on frame 1 and the rest of the sweep is idle); visible when the reticle is dragged across a cluster, which one pull now clears ~3× faster than the cabinet. The story's AC ("resolve per frame against the nearest object under the site") is met either way, so this is recorded rather than fixed — the faithful port wants an integer `LZ.EDG` plus a game-frame accumulator, which is a story of its own. Affects `src/core/sim.ts` (`laserOn` / `laserEdge`). *Found by Dev during implementation.*

- **Gap** (non-blocking): **hitscan cost sw7-16 a guard, and it cannot be bought back.** `surface-aim-wysiwyg.test.ts` section (b) was a 15-case altitude × yoke sweep pinning that the gun fires from the AIM-TIME ship point (`shipPoint(state)`, the eye the pilot sighted down) rather than the ship the frame's flight then carried him to. It read the bolt's spawn point straight off the state. The hitscan gun leaves no object behind, so nothing on the returned state records where the beam started — and no behavioural fixture can recover it either: the two points differ by one frame of climb (3.33) or at most 87 on a crash frame, against `TURRET_HIT_RADIUS` 200, so a dead-on shot lands from either origin at every altitude in the band. The sweep was DELETED rather than migrated (fifteen copies of an assertion that cannot fail would be the exact sin sw7-16 was rejected for); the code still makes the right choice and says why at `sim.ts` `beamOrigin = shipPoint(state)`, and the 87-unit fact the sweep rested on is still pinned. Recovering the guard would need the beam's origin on `GameState`, which nothing else needs — test-only state, deliberately not added. Affects `tests/core/surface-aim-wysiwyg.test.ts`. *Found by Dev during implementation.*

- **Improvement** (non-blocking): the trench torpedo latch could not stay "untouched" as the design spec assumed — it was driven by `sweptCollides` against a **player bolt**, so removing the bolt made the trench unwinnable. Re-wired to the beam, which is what the ROM does anyway and is strictly more faithful: `LDA PT.LZF / IFGT ;?LAZAR GOT CLOSE ENUF TO FIRE PROTON TORPS? / JSR FRPTGN` (`WSLAZR.MAC:406-411`) sits in CLBLZ immediately above the `#7000` clip — same beam, same forward line. The `sweptCollides` anti-tunnelling wrapper went with the projectile it existed to chase. G-005 (the ±$200 arming box) is **unaffected and still open** — we still arm on the porthole radius. *Found by Dev during implementation.*

- **Improvement** (non-blocking): `advance()` (`src/core/sim.ts:1223`) is **shared** between player bolts (:162) and surface/trench enemy fire (:194) — dropping the player projectile is a *caller* deletion, never a deletion of the function. `PROJECTILE_SPEED`/`PROJECTILE_TTL` are genuinely player-only (grep-confirmed: they appear only at `sim.ts:178-179` and `render.ts:449`), but `FIRE_INTERVAL` is cited by G-012 and `sim.ts:178` is cited by G-004 — both are **fix-not-move**, so they must be **hand-stamped** `remediated_by`; the reanchor tool deliberately leaves fixed lines alone ("there is nothing to re-anchor TO"). *Found by TEA during test design.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **No test for the gun→site beam DRAW**
  - Spec source: `docs/superpowers/specs/2026-07-16-surface-gunnery-and-traversal-design.md`, Design (R11b)
  - Spec text: "Draw the beam gun→site (also more authentic than the tracer)."
  - Implementation: the RED suite is pure-core and covers the RESOLVE only; no shell/render test was written.
  - Rationale: what the shell can observe depends on how Dev exposes "the laser is on", and pinning a state field name from the RED phase would dictate the design instead of the behaviour. `render.player-laser.test.ts` must be migrated by Dev anyway (it imports `PROJECTILE_TTL`), and that migration is where the beam's draw belongs.
  - Severity: minor
  - Forward impact: the beam draw ships without a TEA-authored guard — Reviewer should confirm Dev covered it.

- **The edge-triggered half of G-012 is deliberately not tested**
  - Spec source: `sprint/context/context-story-sw7-17.md` (scope); `docs/audit/findings/pair-guns.json` G-012
  - Spec text: "trigger starts an 8-game-frame sweep … retriggerable"; G-012's title: "Player fire is **edge-triggered** with an 8-frame laser sweep; ours is a fixed 0.25 s auto-fire cooldown".
  - Implementation: every test pulls the trigger for exactly ONE frame — well-defined under either firing model. Nothing asserts one-sweep-per-pull.
  - Rationale: the story scopes the SWEEP. Converting level→edge triggering changes the fire cadence, which is a balance change past R11b's stated scope; raised as a Delivery Finding for a ruling rather than settled unilaterally in the RED phase.
  - Severity: minor
  - Forward impact: G-012 may be stamped while half its divergence stands — see the matching Delivery Finding.

- **The sweep's counter is pinned by DURATION, not by name**
  - Spec source: `sprint/context/context-story-sw7-17.md`, AC-3
  - Spec text: "Trigger opens an 8-game-frame sweep window; it decrements once per game frame and is retriggerable."
  - Implementation: `laser-sweep.test.ts` derives `SWEEP_SECONDS = 8 / TICK_HZ` locally and asserts the observable window (a target reached at 0.8× dies, at 1.2× does not), rather than importing a new constant or asserting a `state.laserEdge` field.
  - Rationale: keeps the RED phase behavioural — Dev picks the storage and the name. The pair brackets the window to ~7-9 game frames, which is what the AC actually promises.
  - Severity: minor
  - Forward impact: none. A per-frame integer counter and a seconds countdown both satisfy it; the seconds form matches the house idiom (`ENEMY_SHOT_TTL = 64 / TICK_HZ`) and stays dt-independent.
### Reviewer (audit)

**TEA's three deviations — all ✓ ACCEPTED, two now resolved:**

- **No test for the gun→site beam DRAW** → ✓ ACCEPTED, and **RESOLVED**: the migration rewrote
  `render.player-laser.test.ts` to pin the beam converging on the site, gated on `laserEdge > 0`,
  reading the convergence off the drawing rather than recomputing render's own mapping. TEA's
  reasoning (don't dictate a field name from RED) was right, and its stated forward impact
  ("Reviewer should confirm Dev covered it") is discharged here. One caveat: that file's header now
  carries the F1 false claim.
- **The edge-triggered half of G-012 is deliberately not tested** → ✓ ACCEPTED, and **SUPERSEDED**
  by the Jedi's 2026-07-16 ruling to land edge-triggering. TEA was right to raise it rather than
  decide it unilaterally — and right that it mattered: `FIRE_INTERVAL` (0.25 s) is shorter than the
  sweep (0.39 s), so without the ruling the window would have had no observable meaning. The gap
  TEA named ("no suite anywhere tested edge-triggering") is now closed.
- **The sweep's counter is pinned by DURATION, not by name** → ✓ ACCEPTED: agrees with author
  reasoning. Behavioural pinning left Dev free to choose the storage, and the seconds form matches
  `ENEMY_SHOT_TTL`'s idiom.

**Dev logged NO deviations, but made two. Both are sound; both belonged here rather than only in
the findings:**

- **UNDOCUMENTED — the trench torpedo latch was NOT "untouched".** Spec (Design R11b) said "the
  trench torpedo latch is untouched here"; the code re-wired it from a `sweptCollides` bolt test to
  the beam. → ✓ **ACCEPTED**: the spec's assumption was simply wrong — the latch consumed a player
  bolt, so removing the bolt made the trench unwinnable. The rewire is strictly MORE faithful
  (`LDA PT.LZF / IFGT ;?LAZAR GOT CLOSE ENUF TO FIRE PROTON TORPS? / JSR FRPTGN`, WSLAZR.MAC:406-411,
  sits inside CLBLZ immediately above the same `#7000` clip). Dropping `sweptCollides` with it is
  correct: a ray cannot tunnel. Severity: none — but it WAS a spec deviation and belonged here.
  G-005 (the ±$200 arming box) correctly stays OPEN.
- **UNDOCUMENTED — `PROJECTILE_SPEED`/`TTL` survive nowhere.** Spec said they "survive only where a
  real projectile remains (fireballs …)". Fireballs use `ENEMY_SHOT_*`, so both have zero consumers.
  → ✗ **FLAGGED** as finding F5: dead exports with false docblocks. Severity: MEDIUM.

**Reviewer's own undocumented-deviation sweep:** no others found. The exported `shipPoint` /
`finalizeScore` are test-surface widenings, not spec deviations — noted under Rule #20.