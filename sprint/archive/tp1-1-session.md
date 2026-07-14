---
story_id: "tp1-1"
jira_key: ""
epic: "tp1"
workflow: "tdd"
---
# Story tp1-1: THE REBASE — the ROM runs at 28.44 fps (256/9), not 60; our sim is 2.11x too fast

## Story Details
- **ID:** tp1-1
- **Type:** bug
- **Points:** 8
- **Priority:** p1
- **Workflow:** tdd
- **Stack Parent:** none

## Acceptance Criteria

1. A single named constant ROM_FPS = 256/9 (28.444...) exists in core, is cited to the ROM, and is the only place that number is written.

2. Every explicit `* 60` and `/ 60` in the sim is gone or rebased — rules.ts:46,52,120,154; sim.ts:113,223; flipper.ts:27,39; BULLET_SPEED. Grep proves zero remaining bare 60s used as a frame rate in src/core/.

3. FR-012 is DECIDED IN WRITING, not left implicit: either the sim's fixed timestep becomes 9/256 s, or every ROM frame count is converted through ROM_FPS at its use site. The choice is recorded in rules.ts with rationale; a mix of both is a failure.

4. The starfield is driven by the sim, not by requestAnimationFrame (FR-017), and render.ts:905's `renderTime += 1/60` is rebased.

5. warpAccel's 4.45x error resolves as a CONSEQUENCE of the rebase (it carries the base rate squared) — a test pins warp velocity against the ROM's value rather than against a hand-tuned number.

6. The game is demonstrably playable at the new rate — this story is allowed to surface that other constants are wrong, but it must NOT compensate for them by re-tuning anything outside the frame-rate family. Those are other stories.

7. npm test -- citations stays green.

## Story Context

**The ROM runs at 28.44 fps (256/9), NOT 60.** Our sim is 2.11x too fast. Warp acceleration carries the base rate SQUARED and is 4.45x too fast. This is cluster C1 of the primary-source audit and subsumes 19 separate findings (FR-001, FR-004, FR-006..FR-015, FR-017, WD-008, WD-009, W-028, W-045, B-005, DA-010).

**WHY THIS STORY MUST LAND ALONE AND FIRST:** Every other numeric story in epic tp1 is downstream. Anything numeric that lands before this one bakes the 60 into its own baseline and then "confirms" itself against the audit document. tp1-1 is the gate on 20 other stories.

**THE REFERENCE (authoritative — read it):**
- `tempest/docs/2026-07-12-tempest-primary-source-audit.md` — §3 "The clock" is the finding; §9 is the ruling sheet. This is the authority. Do NOT take constants from the "Tempest vs Tempest" book or from `docs/ux/2026-06-27-enemy-roster-rom-extract.md` — the audit found both wrong.
- `tempest/docs/audit/findings/*.json` — the 19 individual findings, each with byte-verified ROM citations.
- The PRIMARY SOURCE itself is at `~/Projects/tempest-source-text` (the LF copy). NEVER cite `~/Projects/tempest-source` — it is the CRLF sibling: same lines, different bytes, and the citation checker will reject it.

**THE CITATION GATE:** `tests/audit/citations.test.ts` must stay green (currently 8/8). It re-opens every cited ROM line byte-for-byte. Run it with `npm test -- citations`.

**KNOWN CALL SITES the audit named** (TEA/Dev should verify, not trust, this list):
- `rules.ts:46,52,120,154`
- `sim.ts:113,223`
- `flipper.ts:27,39`
- `BULLET_SPEED`
- `render.ts:905` (`renderTime += 1/60`)
- The starfield, which is currently driven by requestAnimationFrame rather than the sim (FR-017).

**THE OPEN DECISION (AC #3, FR-012)** — this is the hard part and it must be decided IN WRITING, not left implicit: either (a) the sim's fixed timestep becomes 9/256 s, or (b) every ROM frame count is converted through ROM_FPS at its use site. A MIX OF BOTH IS AN EXPLICIT FAILURE of this story. The choice and its rationale get recorded in `rules.ts`.

**ARCHITECTURAL CONSTRAINT** (`tempest/CLAUDE.md`, the hard boundary): `src/core/` is a pure deterministic simulation. It must never import from `shell/`, touch the DOM, or call `Date.now`/`performance.now`/`Math.random`/`requestAnimationFrame`. All time enters core as `dt`. Note FR-017 (the starfield) sits right on this boundary — it is currently driven from rAF and must be driven from the sim.

**SCOPE FENCE:** This story rebases the frame-rate family ONLY. It is expected to SURFACE other wrong constants — it must NOT compensate for them by re-tuning anything outside the frame-rate family. Those are stories tp1-3 through tp1-21. Every timing test re-baselining is EXPECTED, not a regression.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-13T19:33:03Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-13T16:35:41Z | 2026-07-13T16:37:25Z | 1m 44s |
| red | 2026-07-13T16:37:25Z | 2026-07-13T16:52:51Z | 15m 26s |
| green | 2026-07-13T16:52:51Z | 2026-07-13T17:11:15Z | 18m 24s |
| review | 2026-07-13T17:11:15Z | 2026-07-13T18:24:11Z | 1h 12m |
| green | 2026-07-13T18:24:11Z | 2026-07-13T18:37:57Z | 13m 46s |
| review | 2026-07-13T18:37:57Z | 2026-07-13T18:39:56Z | 1m 59s |
| green | 2026-07-13T18:39:56Z | 2026-07-13T19:16:03Z | 36m 7s |
| review | 2026-07-13T19:16:03Z | 2026-07-13T19:33:03Z | 17m |
| finish | 2026-07-13T19:33:03Z | - | - |

## SM Assessment

**Baseline (measured, not assumed):** tempest `develop` @ `4232ed4`, clean tree. **781/781 tests pass, 74 files, build green.** `tests/audit/citations.test.ts` is **8/8**. Any red that appears from here is ours.

**Prerequisite cleared before setup:** this story's acceptance criteria cite a document and a test suite that did not exist on `develop` until an hour ago. tempest PR #95 (the audit) and arcade PR #12 (the skill + epic tp1) are both **merged**. Yoda and Han are working against a tree that actually contains the authority they are told to cite. Had I set this up first, the branch would have had no audit doc and no citation checker.

**Why this story is different from a normal 8-pointer:**

1. **It is a gate, not a feature.** Twenty other stories in tp1 are downstream of it. The failure mode is not "tp1-1 is wrong" — it is "tp1-1 is late, someone lands a numeric fix against a 60 fps baseline, and that fix then *confirms itself* against the audit." Nothing else numeric may land until this merges.
2. **Expect a large re-baselining diff, and do not treat it as regression.** Every timing test in the suite is currently pinned to a wrong clock. Those tests changing is the *point*. TEA should be suspicious of any timing test that *doesn't* move.
3. **AC #3 is a decision, not an implementation.** FR-012 asks whether the fixed timestep becomes 9/256 s, or whether every ROM frame count converts through `ROM_FPS` at its use site. **A mix of the two is an explicit failure of this story.** If TEA and Dev disagree on which, that is an escalation to Palpatine (Architect), not a coin flip — it is an architectural choice about where the clock lives, and it is very expensive to reverse once twenty downstream stories are built on it.
4. **AC #5 is the self-check.** `warpAccel`'s 4.45× error must fall out of the rebase as a *consequence* (it carries the base rate squared). If someone has to hand-tune warp to make it right, the rebase is wrong and the story is not done.

**The scope fence is the thing I will hold this story to.** It rebases the frame-rate family and nothing else. It *will* surface other wrong constants — the palette, the enemy speeds, the spike depths — and every one of them is a filed story (tp1-3 … tp1-21) with a PM ruling already attached. Fixing any of them here re-opens work that is already scoped and makes this PR unreviewable. Surface them as Delivery Findings; do not fix them.

**Routing:** phased `tdd`. RED phase → **Han Solo (TEA)**.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED — 34 failing, 0 collateral, `citations` 8/8 green

**Test Files**
- `tests/core/rom-clock.test.ts` — the constants. Every expectation *derived* from `ROM_FPS`, never typed as a decimal; a hard-coded `0.1746` would be as unfalsifiable as the `82.5` it replaces.
- `tests/core/rom-clock-timing.test.ts` — wall-clock behaviour. Drives the sim at its own `SIM_STEP` and measures seconds, so it holds under **either** FR-012 answer and forecloses neither.
- `tests/rom-clock-sources.test.ts` — AC1/AC2 are claims about the *source text*, so only a source-reading test can hold them. Plus the `src/core` purity guard.
- `tests/shell/starfield-sim-clock.test.ts` — FR-017.
- **Re-seated:** `sim.enemy-authentic.test.ts`, `sim.enemy-motion-fidelity.test.ts`.

**Tests Written:** 38 across 4 new files, covering 7 ACs · **34 failing**

### The three tests that matter most

1. **`kills the 82.5`** — `PULSAR_CLIMB_SPEED = 82.5 / WARP_ALONG_SPAN`. That 82.5 **is** `1.375 × 60`. There is no literal `60` on the line, so **AC2's own grep passes straight over it** — my source guard found `* 60` / `/ 60` at seven sites and this was not one of them. A grep-driven rebase leaves the pulsar 2.11× fast while every other enemy is correct. `BULLET_SPEED = 2.4` hides the same way.

2. **`REJECTS the half-fixed rebase`** — `warpAccel` reads `(60 * 60)`. A dev who rewrites it as `(ROM_FPS * 60)` gets a value wrong by exactly 2.11×, and *every other test in the suite still passes*. It carries the base **squared**; it is the only expression in the codebase that does. Called out by name because nothing else catches it.

3. **`is FRAME-RATE INDEPENDENT`** (starfield) — the only finding in C1 that is not merely wrong but **non-deterministic**: `starfield.step()` takes no `dt` and runs once per *rendered* frame, so the warp looks different on a 144 Hz monitor than on a 60 Hz one. `STAR_STEP = 7` is ROM truth and must **not** be rebased — the *driver* was the bug.

### Rule Coverage

| Rule | Test | Status |
|---|---|---|
| CLAUDE.md — `src/core` purity (no DOM/wall-clock/`Math.random`) | `keeps src/core free of DOM, wall-clock time and ambient randomness` | failing |
| CLAUDE.md — `core` must not import `shell` | `keeps src/core from importing src/shell` | failing |
| CLAUDE.md — all time enters core as `dt` | `keeps the CONTINUOUS sim dt-driven` | failing |
| TS #8 — test quality / no vacuous assertions | self-check below | applied |

The purity guard is the highest-risk rule in this story, not a formality: **FR-017 moves the starfield off `requestAnimationFrame` and onto the sim.** If that work drags the starfield's shell dependencies into `src/core`, the pure deterministic core stops being either — and no other test would notice.

**Rules checked:** 4 of 4 applicable (no React, no async, no enums in this diff).
**Self-check:** 1 vacuous test found and removed — a branch in the `SIM_STEP` suite whose `else` re-asserted its own condition. Its intent (9/256 *is* the reciprocal of 256/9) is arithmetic, not a property of the code; the real burden is carried by the timing suite.

### The negative control — do not "fix" these

`src/core` holds three 60s that are **not** frame rates, and a find-and-replace rebase silently destroys the game by changing them. All three are pinned as passing tests so a mistaken fix fails loudly rather than shipping:
- `FAR_RATIO = 60 / 300` — a projection **distance** ratio (`geometry.ts:18`). The real `FAR_RATIO` finding is per-well and belongs to **tp1-9 / cluster C5**, *not* this story.
- `level >= 60` — the pulsar can-shoot gate (`rules.ts:82`). A **level number**.
- `enemyFireHoldoffFrames()` returns ROM **frames** — correct as-is. Only `sim.ts:217`'s `/ 60` conversion is wrong. Rebasing the function would double-convert.

**Handoff:** To Yoda (Dev) for GREEN.

## Dev Assessment

**Status:** GREEN — **819/819 passing** (baseline was 781; +38). Build green. `citations` **8/8**.

### The decision (AC3, FR-012): the sim is ROM-PACED. `SIM_STEP = 9/256`.

One sim step **is** one ROM frame. Recorded in `rules.ts` with its rationale, as the AC demands.

I did not decide this on the merits of *this* story — on those alone the two options are nearly equivalent, since our sim is continuous and dt-driven either way. I decided it on the **twenty stories behind it**. Epic tp1 transcribes ROM frame counts by the dozen: the CAM (tp1-4/5) is a bytecode VM whose opcodes are literally *"move N frames then flip"*; tp1-7 lifts the per-wave CONTOUR tables; tp1-14 the superzapper's 19-frame window. Under option (b) every one of those is a hand conversion somebody can forget — and **one forgotten conversion silently re-bakes the 60**, which is the exact bug class this story exists to close. Under (a) a ROM frame count *is* a sim step count. There is nothing left to convert.

It also settles AC2 honestly rather than by argument: `src/core` now contains **no frame-rate 60 at all**. Under (b) the sim's own 60 would have had to live in the core, and I would have been explaining why *that* one was fine.

**The cost is real and I want it attacked in review:** the sim now samples at 28.44 Hz, not 60. Input latency is one ROM frame (35 ms) and sim motion updates 28×/s. That is the machine — the arcade sampled its spinner at exactly this rate — and render-side animation still runs at the display's rate, so only the *simulation* is ROM-paced. But it is the one judgement call in this story.

### The two 60s that no grep could see

The audit warned the grep was necessary but not sufficient, and it was right:
- **`PULSAR_CLIMB_SPEED = 82.5 / …`** — that 82.5 **is** `1.375 × 60`. It now derives from the *same named ROM byte* as the L1 flipper, so "pulsar == flipper L1" is **structural** and cannot be broken by fixing one and forgetting the other.
- **`BULLET_SPEED = 2.4`** — that is `9 along/frame × 60`. Now `8/7` depth/s. It had been filed as CONFIRMED — *"we match the arcade!"* — because the bad base made the numbers agree.

### Verified in the browser, not just in vitest (AC6)

A green suite does not prove a game still runs when you change its heartbeat. Drove the real build (on an isolated port — 5273 was already owned by another checkout, and I was not going to test someone else's code):

| | |
|---|---|
| live sim rate | **28.444 Hz** |
| L1 flipper traverse | **5.73 s** (163 ROM frames) — was 2.7 s |
| `PULSAR_CLIMB_SPEED === flipperSpeedForLevel(1)` | **true** |
| console errors | **0** |

Screenshotted mid-play: tube, Claw, flippers, HUD all intact. After three seconds of play the flippers are still barely off the far end — the 2.11× slowdown, visible to the eye.

### AC5 self-check: warp fell out, it was not tuned

`warpAccel` is right **as a consequence** of the rebase — it carries `ROM_FPS` squared because an acceleration is per-frame-per-frame. I hand-tuned nothing. The suite rejects the half-fixed `(ROM_FPS * 60)` form by name.

### The scope fence held

The rebase surfaced other wrong constants exactly as SM predicted. `SCORE_SPIKE_SEGMENT` is still 3 (tp1-3), `SPIKE_MAX_DEPTH` still 0.75 (tp1-11), `FAR_RATIO` still a single 0.2 (tp1-9). **I touched none of them.** The strongest evidence the fence held: of the 98 citation failures, the 16 whose cited line no longer exists are *exactly* the C1 frame-rate family. The rebase hit the sites the audit named and nothing else.

### One thing the Reviewer must rule on

**The citation gate cannot survive its own remediation, and it will hit all 21 stories.** See my Delivery Findings. I fixed it for tp1-1 (`remediated_by`, keeping a fixed finding's citation as history while still byte-checking the ROM side always), but the durable answer is to freeze the `ours` side to the audit commit. I judged that redesign out of scope for a story fenced to the frame-rate family. It should be ruled on **before tp1-4**, which will drift `sim.ts` and `enemies/` heavily.

**Handoff:** To Obi-Wan (Reviewer).

## Dev Assessment — REWORK (round 2)

**Status:** GREEN — **827/827** (+8), build green, `citations` 8/8. Reviewer's blocking finding is fixed.

### The finding was worse than "feel". The game was unwinnable at depth.

Obi-Wan caught that held-key steering had silently slowed 2.11×. Before fixing it I went looking for the number that *decides* the rate rather than restoring the one that happened to ship — and the escape constraint decides it:

A flipper that reaches the rim walks it at one lane per `(moveFrames + flipFrames)` ROM frames. At L33+ that is `1 + 3 = 4` frames — **7.11 lanes/sec**. The broken keyboard turned **4.27**.

| | lanes/sec | margin vs. the fastest flipper |
|---|---:|---:|
| broken (per-step tick) | 4.27 | **0.60× — cannot escape** |
| fixed (time-based spinner) | 9.00 | **1.27×** |

**You cannot escape a pincer you are slower than.** Deep waves were unwinnable on the keyboard, and nothing in 819 tests noticed. That elevates the Reviewer's call from a good catch to a save.

### The fix: the keyboard is rebuilt in the wheel's image

The cabinet's control is a rotary **spinner** — a *displacement* device. `Input.spin` is "how far the knob turned since you last asked", and `sim.ts:86` applies it as exactly that. The **wheel already modelled this correctly**, which is precisely why the ROM rebase never touched it: `spinAccum` banks real hand motion and drains whole, so sampling half as often just drains twice as much.

The keyboard was not a control at all — it was **a tick counter wearing a control's clothes**, emitting `±1` per sample. A held key is now a constant angular **velocity**, banked as displacement over real elapsed time. It is frame-rate independent *by construction*: no future change to the sim's step rate can move it.

`KEY_SPIN_RATE = 60` units/s (→ 9.0 lanes/sec) is **derived from the escape constraint**, and `input.ts` says so. That it also happens to match the pre-rebase feel is a coincidence, not the justification — I did not want a number whose only defence was nostalgia.

### Verified with the real clock, not a stub

Drove the shipped `input.ts` in the browser with **real `performance.now()` and real DOM key events**:

| sampled at | lanes/sec |
|---|---:|
| 28.44 Hz (the sim's rate) | **9.00** |
| 60 Hz | **9.00** |
| 144 Hz | **9.00** |

Identical to two decimals. That is the property the old code could not satisfy at any sample rate.

**Honesty note:** I also tried to measure the Claw's rotation by tracking yellow pixels on the canvas. That instrument is junk — the HUD's yellow lives-icons and the title text dominate the centroid, and a 9-lane turn exceeds 180° so the angle aliases on wrap. I am not quoting a number from it. The module-level measurement above is the real evidence, taken at exactly the layer that was broken.

### Coverage added (`tests/shell/input.spinner.test.ts`, 8 tests)

Written in **lanes per second** — the unit the bug was invisible in. Pins frame-rate independence across 28/60/144 Hz, survival of a stuttering frame budget, the escape margin over the fastest flipper, and a named regression guard against the old per-sample tick. Plus a guard that the **wheel** is left alone: it was right all along and must not be "fixed".

Ruling 2 (freeze the audit citations to the audit commit) is a **separate story**, per the Jedi — not done here.

**Handoff:** back to Obi-Wan (Reviewer).

## Dev Assessment — REWORK (round 3)

**Status:** GREEN — **833/833** (+6), build green, `citations` 8/8. Branch `fix/tp1-1-rom-fps-rebase` pushed.

### I did not take the one-line clamp. I took the coupling the Reviewer named.

Obi-Wan's diagnosis contains the fix, and it is not the fix he prescribed:

> *"the old keyboard was coupled to the **step count**; the new one is coupled to **unbounded wall time**. **Neither is coupled to what the simulation actually ran.**"*

A clamp does not couple them — it only **bounds how far apart they may drift**. Clamped to 0.25 s, a pause-resume still buys 0.25 s of rotation (2.25 lanes) against a single 0.035 s frame the sim actually stepped. That is ~1.9 lanes the simulation never ran, on every pause, forever. Smaller than 90, and the same bug.

So the keyboard now banks displacement in `tick(dt)`, fed from the loop's **`onStep`** — the hook that fires once per sub-step that *actually advanced the sim*, carrying the sim's own `dt`. `input.ts` reads no wall clock at all. The bound is not enforced; it is **structural**:

| | old (per-step tick) | round 2 (wall clock) | now (sim clock) |
|---|---:|---:|---:|
| pause 10 s, key held | 0 lanes | **90.0** | **0** |
| a 2 s stall | ≤2.25 | **18.0** | **2.21** — exactly the 7 sub-steps the loop clamped to |
| held key, 28 / 60 / 144 Hz | 4.27 / 9.0 / 21.6 | 9.0 / 9.0 / 9.0 | **9.0 / 9.0 / 9.0** |

There is no second copy of the 0.25 s cap to drift out of sync, because the keyboard never learns what the cap is — it only ever spends what it was handed.

### This is FR-017 again. Same story, same bug, same hook.

The warp starfield was driven by `requestAnimationFrame`: it ran at the monitor's rate **and kept flying while the game was paused.** That is, line for line, what the wall-clock keyboard did. This story already built the cure — `onStep` — and then shipped a second consumer of the disease beside it. Both now hang off the same hook, and that hook is the shell's only clock. I filed the general rule as a Delivery Finding.

### One deviation, and it is from the Jedi's own ruling — logged, not buried

Ruling 1 said the keyboard must synthesise displacement **from wall-clock time**. I have used the sim's clock instead. Sim time *is* wall time; they diverge only where the loop deliberately refuses to run, and that divergence is exactly what Obi-Wan blocked on. The ruling's binding clause — *"a constant angular velocity, frame-rate independent by construction"* — is satisfied more strongly than a wall clock can satisfy it, and the Jedi's number is untouched at 9.0 lanes/sec. **If you want the letter rather than the purpose, say so: the clamp is a smaller change, and it is worse.**

### Coverage (+6 tests, 27 in the spinner suite)

The suite now drives the **real `advanceFixedSteps` kernel**, so the 0.25 s clamp under test is the shipped one and not a replica. New: `PAUSE` (ten paused seconds with the key held turn **zero** lanes, and bank nothing behind the pause card), `STALL` (a 2 s hitch turns *exactly* the clamped span, to nine decimals), and a guard that a **frozen `performance.now()` changes nothing** — the structural statement of both findings. Two source rules pin what no behavioural test can see: that `main.ts` actually calls `input.tick(dt)`, and that `input.ts` contains no wall clock. Delete the wiring line and the shipped keyboard silently stops turning while every behavioural test still passes; that is now caught.

### Verified in the running game, on a port I proved was mine

5273 belongs to the `a-2` checkout and 5283 to `a-1` — `strictPort` refused to bind and saved me from screenshotting someone else's tree. Served `a-3` on 5291 and confirmed ownership by pid cwd before trusting a single pixel.

My canvas instrument was junk again (the near-white "Claw" blobs are lane-vertex highlights; I could not cleanly separate them from the muzzle spark) and I am **not** quoting a number from it. The Jedi drove the shipped build directly instead and confirmed both properties by eye: a held arrow turns the Claw at a sane rate, and **pausing for five seconds with the key held produces no jump on resume.** That is the wiring proven end-to-end, which is the one thing the unit tests cannot see.

**Handoff:** back to Obi-Wan (Reviewer).

## Subagent Results

Seven of the nine specialists are disabled in `workflow.reviewer_subagents` (verified via
`pf settings get`). I covered their domains myself; the tags below say where.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 833/833, citations 8/8, build green, 0 smells. I re-ran the suite myself rather than trust it. |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via settings — covered by me ([EDGE]: the latency probe, pause/stall/blur/tab-switch paths, keyAccum bounding) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via settings — covered by me ([SILENT]: `runGuarded('onStep')` swallow path) |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Disabled via settings — covered by me ([TEST]: mutation-tested the wiring pin; audited the rig against the real loop) |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Disabled via settings — covered by me ([DOC]: two stale comments found, below) |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via settings — covered by rule-checker + me ([TYPE]) |
| 7 | reviewer-security | Yes | Skipped | disabled | Disabled via settings — covered by me ([SEC]: no auth/secret/injection surface; the core-purity boundary is the security-adjacent invariant and it holds) |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via settings — covered by me ([SIMPLE]: no dead code; the two new exports earn their keep) |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 (both downgraded to LOW with rationale), dismissed 0, deferred 0 |

**All received:** Yes (2 dispatched and returned, 7 pre-filled as disabled)
**Total findings:** 4 confirmed (0 blocking), 1 dismissed (with rationale), 0 deferred

*Dismissed:* the rule-checker flagged `tests/zz-reviewer-scratch.test.ts` as an untracked file
that throws by design. That was **my own probe**, written to measure input latency and demo
competence; the agent caught a mid-flight snapshot of it. Deleted before it finished — `git
status` is clean and `ls` confirms the file is gone.

## Reviewer Assessment (round 3)

**Verdict:** APPROVED

The blocking finding is fixed, and fixed *better than I prescribed*. I also have to correct
the record: **one of my own rulings was wrong**, and I want that written down where the next
twenty stories can see it.

### The round-2 blocker is dead — and I measured it, I did not take Dev's word

`input.ts` now reads no clock at all; held-key displacement is banked in `tick(dt)` from the
loop's `onStep`, which fires only for sub-steps that actually advanced the sim. I drove the
shipped controller through the **real** `advanceFixedSteps` kernel:

| scenario (arrow key held) | round 2 (wall clock) | now (sim clock) |
|---|---:|---:|
| pause 10 s, then resume | 90.0 lanes | **0** |
| a 2 s stall | 18.0 lanes | **2.21** — exactly the 7 sub-steps the loop clamped to |
| held key at 28 / 60 / 144 Hz | 9.0 / 9.0 / 9.0 | **9.0 / 9.0 / 9.0** |

`[EDGE]` I also walked the paths the tests do not: **tab-switch** is double-protected (`blur`
releases the keys *and* the clamp bites); `keyAccum` **cannot grow unbounded**, because every
frame that ticks also samples exactly once, so the bank between samples is capped by the loop's
own 0.25 s clamp (≤ 2.21 lanes); and `hasRealInput` **cannot misfire** in attract mode, because
an unheld key banks `0 * rate * dt` — exactly zero, not an epsilon.

`[SIMPLE]` Only one bootstrap constructs an `InputController` (`main.ts`), so there is no second
entry point silently missing the new wiring. `models.html` loads `contactSheet.ts` and never
touches input. I checked rather than assumed.

**Dev was right and I was wrong about the mechanism.** I prescribed a clamp; he took the
coupling. A clamp would have *bounded* the divergence between the input's clock and the sim's;
`tick(dt)` **removes** it. His own words — *"There is no second copy of the 0.25 s cap to drift
out of sync, because the keyboard never learns what the cap is"* — are the correct argument, and
the deviation is ACCEPTED below. He asked whether I wanted the letter of my ruling or its
purpose. The purpose. Always the purpose.

### 🟡 MEDIUM — banking *after* the step costs one full ROM frame of input latency, and two comments now understate it

`[EDGE]` `[DOC]` This is the one thing the rework introduced that nobody measured. `onStep`
fires **after** `stepGame`, but `sample()` is called **inside** it, on the first sub-step — so a
frame's banked displacement is delivered on the *next* one. I probed the shipped controller
through the real kernel:

```
sample #1 (step 1): 0 lanes      ← key already held, Claw does not move
sample #2 (step 2): 0.316 lanes  ← motion finally arrives
added latency: 1 sim step = 35.16 ms
```

Held-key latency therefore goes from ~1 ROM frame to **~2 (≈70 ms)**. Two comments now tell the
next reader not to look:

1. `rules.ts:46` still says *"input latency is one ROM frame (35 ms)"*. For the keyboard it is now two.
2. `tests/shell/input.spinner.test.ts:73-75` calls it *"a constant one-frame lag, **identical to
   the wall-clock build's**"*. It is not. I read the build it replaced (`90691ac`): round 2 banked
   `elapsed` at `performance.now()` **at sample time**, covering the interval right up to the
   sample instant — **zero bank lag**. The new lag is real and new.

**Why this is not blocking:** the escape margin is a *rate* (9.0 vs 7.11 lanes/sec), and latency
does not touch it. Deep waves stay winnable. 70 ms is bounded, deterministic, frame-rate
independent, and adaptable-to. Blocking a story that gates twenty others on 35 ms would be poor
judgement.

**Why it must not be buried:** a comment that reassures the reader about an unmeasured coupling
is *exactly* how the 60 survived in this codebase for a year. Fix the two comments. If you want
the latency back, the cheap fix is to tick before sampling rather than after — but that is
`loop.ts` surgery and it belongs in its own story, not bolted onto this one.

### ⚪ RETRACTION — my Ruling 1 was wrong about the attract demo, and Dev was right to ignore that clause

I ruled: *"The attract-demo AI (`sim.ts:677`) rides the same path and is fixed by the same
change."* **It does not, and it was not.** `demoInput()` lives in `src/core/sim.ts` and never
touches `src/shell/input.ts`. The fix could not possibly have reached it. Dev shipped no demo
change and said nothing — correctly, as it turns out, but I would rather he had told me I was
wrong than let it pass.

So I tested whether the demo actually needed the fix I ordered. It does not, and the reason is
worth recording:

- `demoInput` returns `spin = laneOffset(...)`, applied per **step** (`stepPlayer`, gain
  `SPIN_SENSITIVITY`). The flipper's rim walk is *also* per step (1 lane per `moveFrames +
  flipFrames`). **Both scale with the step rate, so their ratio is invariant under the rebase.**
  Pre-rebase the demo turned 9.0 lanes/s against a 15.0 lanes/s flipper; now it turns 4.27
  against 7.11. Same 0.60×. Its competence relative to the game is *unchanged*.
- Confirmed by running it: 60 wall-seconds of attract mode scores **1500 and reaches level 3**,
  still alive, still in attract. It is not crippled.

The demo *is* 2.11× slower in wall-clock — but so is the entire game, and that is the story's
whole thesis, not a defect. My round-1 claim was wall-clock-true and competitively vacuous. **A
human's keyboard is a wall-clock affordance and had to be rebased; a sim-internal actor is a
per-ROM-frame actor and must not be.** Dev drew that line correctly without being told.

### 🟡 LOW — two confirmed rule matches (downgraded, not dismissed)

`[RULE]` `[TYPE]` Both cite the TypeScript checklist by number. Project rules are not
suggestions, so I confirm both; I downgrade severity with rationale, and I do not dismiss.

1. **Check #1, double-cast bypass** — `createInputController(target as unknown as HTMLElement)`
   at `tests/shell/input.spinner.test.ts:129,170,188,192,223,319,336`. The checklist names
   `as unknown as T` explicitly. *Downgraded to LOW:* it is the established idiom for this
   repo's fake event bus (precedent at `tests/shell/input.test.ts:53`, untouched by this branch,
   verified). Extending a convention consistently is not the sin the rule is aimed at. It stays
   a real match, and the day `createInputController` reaches for `.getBoundingClientRect()` it
   will bite.
2. **Check #2, missing `readonly`** — `loop.ts:55` hands `onStep?: (dt: number, s: GameState)`
   a live, mutable `GameState`. The loop's event and mode-transition detection depends on
   `state` only ever being *replaced* (`state !== prevSub`), never mutated in place. A future
   `onStep` consumer that writes `s.mode` would corrupt that silently. *Downgraded to LOW:* it
   mirrors the pre-existing `draw(s: GameState, …)` signature one parameter over — but note
   `onStep` is **new in this diff**, so this is a fresh instance of an old gap, not merely an
   inherited one. `Readonly<GameState>` is the fix when someone next touches that signature.

### ⚪ Still open from round 1 (both non-blocking, both unaddressed — correctly)

- **The audit doc's own "ours"-side citations are still rotted**, and **Ruling 2's story was
  never filed.** I checked `sprint/epic-tp1.yaml`: it runs tp1-1 … tp1-21 with no audit-tooling
  story anywhere. Dev correctly declined to do it here. But it will now evaporate unless SM
  files it, and my ruling was explicit that it must land **before tp1-4**. Raised as a Delivery
  Finding, blocking for the epic, not for this story.
- **The superzapper window is still not pinned in seconds.** `ZAP_WINDOW_FIRST = 13` is correct
  for free under ROM-pacing, but `sim.superzapper.test.ts` asserts only frame counts, so a
  revert of `loop.ts` to `1/60` would halve the felt duration with the suite still green. Still
  the right call to leave it — it belongs with tp1-14.

### ✅ What I tried to break in this round and could not

- `[TEST]` **The wiring pin is not vacuous — I mutation-tested it.** I commented out
  `input.tick(dt)` in `main.ts`: **all 22 behavioural tests still passed** and only the source
  rule went red. That is precisely the failure mode Dev claimed it guards, demonstrated rather
  than asserted. Tree restored clean.
- `[TEST]` **The spinner rig is faithful.** It drives the *real* `advanceFixedSteps`, so the
  0.25 s clamp under test is the shipped one. It replicates ~10 lines of loop glue (sample-then-
  tick ordering, the paused no-op); I checked that replication against `loop.ts` line by line
  and it matches `stepUnlessPaused`'s contract exactly.
- `[SILENT]` `runGuarded('onStep', …)` swallows a throwing `onStep` with a `console.error` — so
  a throwing `tick()` would silently disable steering. `tick()` cannot throw (one multiply, one
  add), and the guard is a deliberate Story 5-9 decision to keep a bad frame from killing the
  loop. Correct trade, noted rather than filed.
- **`onStep` cannot be silently skipped.** It fires only when `state !== prevSub` — so I checked
  whether `stepGame` can ever return its input reference. It cannot: `sim.ts:711` opens with
  `const s = cloneState(state)`, unconditionally. The only identity-preserving path is
  `stepUnlessPaused`, which is the pause case by design.
- **AC5 re-verified from scratch.** `warpAccel` carries `ROM_FPS * ROM_FPS` structurally because
  an acceleration is per-frame-per-frame; `BULLET_SPEED` and `PULSAR_CLIMB_SPEED` derive from
  *named ROM bytes*, not decimals. Nothing is hand-tuned. The half-fix `(ROM_FPS * 60)` is
  rejected by name.
- `[SEC]` **No security surface** — no auth, no secrets, no injection, no deserialisation, no
  network. The security-adjacent invariant in this repo is the **core-purity boundary**, and it
  holds: `src/core` imports no shell, reads no wall clock, and is now guarded by a source-rule
  test. The starfield moving to `shell → core` (importing `ROM_FPS`) is the *permitted*
  direction.
- **A trap I chased and cleared:** a `NO_COUNTERPART` finding marked `remediated_by` would
  hard-error in `check-citations.mjs` (it demands an `ours` citation that `NO_COUNTERPART`
  forbids). Unreachable in practice — such findings have `ours: null` and are already inert on
  the "ours" side, so they never need the flag. Worth knowing before tp1-4/6 add missing systems.

### Rule Compliance (TypeScript checklist — all 13 checks + 3 project rules)

| Rule | Instances | Status |
|---|---|---|
| #1 type-safety escapes | 7 | **LOW violation** — `as unknown as HTMLElement` ×7 (confirmed, downgraded; 0 `as any`, 0 `@ts-ignore`, 0 new `!`) |
| #2 generics/interfaces | 7 | **LOW violation** — `onStep` leaks mutable `GameState` (confirmed, downgraded) |
| #3 enums | 2 | **PASS** — no enums; string unions with compiler-enforced exhaustiveness |
| #4 `\|\|` vs `??` | 6 | **PASS** — `?? 0` used precisely where `0` is valid-but-falsy |
| #5 module/import hygiene | 12 | **PASS** — `bundler` resolution, so no `.js` suffix required here (unlike the shared lib) |
| #6 React/JSX | 0 | **N/A** — no React, no `.tsx`, by project design |
| #7 async/Promise | 0 | **N/A** — zero `async`/`await`/`Promise` in the diff; the sim is synchronous by the hard boundary |
| #8 test quality | 3 | **PASS** — no `as any` in assertions, no `dist/` imports, no skips |
| #9 build/config | 0 | **N/A** — no config touched |
| #10 input validation | 0 | **N/A** — no external input surface |
| #11 error handling | 2 | **PASS** — `catch (e: unknown)` |
| #12 perf/bundle | 3 | **PASS** — subpath imports only, never the barrel |
| #13 fix-introduced regressions | 1 | **PASS** — the round-3 fix introduces no `as any`, no `\|\|`-for-`??` |
| CLAUDE.md — `src/core` purity | 3 | **PASS** — and now mechanically guarded |
| CLAUDE.md — all time enters core as `dt` | 3 | **PASS** — `sim.ts:86` is no longer the exception: `input.spin` is a genuine displacement now, so applying it per step is correct *by construction*. **This was the round-1 blocking finding, and it is closed.** |
| tempest CLAUDE.md — constants cited to ROM | 11 | **PASS** — `KEY_SPIN_RATE` is the one uncited number, honestly declared as such and grounded in the escape constraint instead of a fabricated citation |

### Devil's Advocate

Let me argue this is broken. The strongest case is that the fix traded a *loud* bug for a *quiet*
one. The wall-clock keyboard failed spectacularly — 90 lanes on a pause, impossible to miss once
you looked. The sim-clock keyboard fails *politely*: it adds 35 ms of latency that no test pins,
no AC mentions, and two comments actively deny. A player will never file that bug; they will just
feel that the Claw is mushy and stop playing. The story's own thesis is that the dangerous
couplings are the ones nobody measured — and this rework shipped a new unmeasured coupling
between the input's delivery and the loop's callback ordering, wrapped in a comment asserting
parity with a build that had no such lag. That is the codebase's original sin in miniature. I
take this seriously enough that I measured it rather than argue about it, and the measurement is
what saves it: 35.16 ms, constant, bounded, and orthogonal to the escape margin that decides
winnability.

The second case: `tick(dt)` is a **new public method on `InputController` with no runtime guard**.
Pass it `NaN` and `keyAccum` becomes `NaN`, `input.spin` becomes `NaN`, and `stepPlayer` —
which, unlike `select` mode, has *no* `Number.isFinite` guard — writes `NaN` into `player.lane`.
The game would render nothing and never recover. Today it is unreachable: `loop.ts:117` passes
the constant `STEP`, always. But the *old* code could not be poisoned this way at all, and Story
5-9 already had to add `isFinite` guards elsewhere for exactly this reason. The blast radius is
one careless caller.

Third: what does a *confused* user do? They pause mid-turn with the key held. On resume, the
bank from the last stepping frame before the pause is still there and gets delivered — up to
2.21 lanes of rotation from a key they may have since released. I traced it: that is rotation
the simulation genuinely ran and genuinely owes them, so it is correct. But it is surprising,
and it is the kind of thing that gets "fixed" by someone who does not understand it.

None of these clears the Critical/High bar. The first is real and filed. The second is a latent
edge with no live path. The third is correct behaviour that merely looks wrong.

**Data flow traced:** `keydown(ArrowRight)` → `rightHeld = true` → `loop.frame()` →
`advanceFixedSteps` → `stepUnlessPaused` (skips everything if paused) → `sample()` drains
`keyAccum + spinAccum` → `stepGame(state, input, SIM_STEP)` → `stepPlayer` applies
`spin * SPIN_SENSITIVITY` as displacement → `onStep(STEP, state)` → `input.tick(STEP)` banks the
next step's displacement. Safe because every quantity on that path is a displacement the
simulation actually ran, and the only clock in it is the sim's.

**Pattern observed:** the loop's `onStep` hook is now the shell's single clock for
accruing-over-time quantities — the starfield (FR-017) and the keyboard both hang off it
(`main.ts:122-132`). That is the right shape, and Dev's Delivery Finding asking for it to be
written into `tempest/CLAUDE.md` should be honoured.

**Error handling:** `runGuarded` (`loop.ts:23-29`) swallows callback throws with a `console.error`
so one bad frame cannot kill the loop (Story 5-9). `sampleInput` falls back to `NEUTRAL`.

**Handoff:** To Thrawn (SM) for finish-story. **PR #97 is open — I have not merged it; that is
SM's.**

## Reviewer Assessment (round 2)

**Verdict:** CHANGES_REQUESTED

The rate fix is **correct and well-derived** — deriving `KEY_SPIN_RATE` from the escape margin rather than restoring the old number is exactly right, and the discovery that deep waves were *unwinnable* (0.60× margin) is a better finding than the one I raised. But the fix introduced a clock into the input layer and did not bound it, and that is a new defect.

### 🔴 BLOCKING — the keyboard now banks time the sim throws away. A pause teleports the Claw.

`input.ts:131` computes `elapsed = (performance.now() - lastSampleAt) / 1000` with **no upper bound**, and `lastSampleAt` only advances when `sample()` is called. But `loop.ts` calls `sampleInput()` only inside the step thunk, and that thunk:

1. **never runs while paused** — `loop.ts:94` states the invariant in its own words: *"paused time is discarded, not banked → no burst on resume"*; and
2. receives an elapsed span that `advanceFixedSteps` has already **clamped to 0.25 s** (`loop.ts:78`).

So the sim discards stalled and paused time while `input.ts` banks every millisecond of it. Reproduced:

| scenario (arrow key held) | Claw jumps | what the sim actually stepped |
|---|---:|---:|
| pause 10 s, then resume | **90.0 lanes — 5.6 full laps** | 0 lanes |
| a 2 s GC / asset hitch | **18.0 lanes** | ≤ 2.25 lanes (0.25 s clamp) |

The tab-switch path happens to be masked because `window.blur` releases the held keys — but **pause (Esc) does not blur, and a stall does not blur.** Both are live, and the pause one is trivially reachable by any player who pauses mid-turn.

This is the same class of bug as the one the story exists to kill, with the sign flipped: the old keyboard was coupled to the *step count*; the new one is coupled to *unbounded wall time*. Neither is coupled to what the simulation actually ran.

**Required (one line):** clamp `elapsed` to the same cap `advanceFixedSteps` uses (0.25 s), so the input layer can never buy more rotation than the sim stepped. The `Math.max(0, …)` guard is already there for a backwards clock; it needs the ceiling too. Pin it with a test for both the pause-resume and the stall case.

**The wheel is correctly unaffected** — `spinAccum` banks real *hand motion*, and a player who kept spinning the knob through a pause genuinely did turn it. Do not "fix" that.

### ✅ Confirmed good in this rework

- **The escape-constraint derivation.** `KEY_SPIN_RATE` is now justified by the ROM (the L33 flipper's 7.11 lanes/sec rim walk) rather than by nostalgia, and `input.ts` says so. That the number coincides with the old feel is called out as a coincidence, which is the honest framing.
- **The unwinnability finding.** A 0.60× escape margin means deep waves could not be survived on the keyboard. That is a more serious bug than the "feel regression" I filed, and Dev found it by going looking for the number that *decides* the rate. Exactly right.
- **The wheel guard.** A test now asserts the wheel's rate is sample-count independent, so nobody "fixes" the one control that was always correct.
- **Honesty about the bad instrument.** Dev's yellow-pixel Claw tracker was junk (HUD lives-icons pollute the centroid; a 9-lane turn aliases past 180°) and he said so rather than quoting a number from it. The module-level measurement with a real clock and real key events is the right evidence and it is clean.

**Handoff:** back to Yoda (Dev). One clamp, one test.

## Reviewer Assessment (round 1)

**Verdict:** CHANGES_REQUESTED — *rate regression; addressed in the rework above*

One confirmed defect. The rest of the story is the best-argued work I have reviewed in this repo, and I want to be clear that the defect is *narrow* — but it is real, it is untested, and it is the story's own bug class.

### 🔴 BLOCKING — the rebase silently re-tuned the player's controls by 2.11×, and nobody noticed

**`src/core/sim.ts:86`** applies rotation **per sim step, not per `dt`**:
```ts
s.player.lane = wrapLane(s.tube, s.player.lane + input.spin * SPIN_SENSITIVITY)
```
**`src/shell/input.ts:75`** feeds a **constant** `±1` on every sample while an arrow key is held:
```ts
const keySpin = (rightHeld ? 1 : 0) + (leftHeld ? -1 : 0)
```

So held-key rotation rate is `SPIN_SENSITIVITY × steps-per-second`. The step rate just fell from 60 Hz to 28.44 Hz.

**Measured in the running build, not inferred:**

| | before | after |
|---|---|---|
| held arrow key | **9.0 lanes/sec** | **4.27 lanes/sec** (2.109× slower) |
| full lap of the 16-lane tube | 1.78 s | **3.75 s** |
| mouse wheel, same hand motion | 1.50 lanes/sec | **1.50 lanes/sec — unchanged** |

The wheel is unaffected because `spinAccum` is an accumulated **displacement** drained per sample: sample half as often, drain twice as much, same total. The keyboard is a **rate** synthesised per sample, so it scales with the step rate.

**Two things are wrong here, and the second is the important one:**

1. Keyboard responsiveness halved in wall-clock terms.
2. **The wheel and the keyboard were co-tuned, and now they disagree by 2.11×.** Relative to the (now 2.11× slower) enemies, the keyboard is unchanged — but the wheel is now **2.11× more powerful than it was**. One input got re-balanced against the game and the other did not.

**This is precisely the failure mode the story exists to eliminate.** Dev's own FR-012 rationale in `rules.ts` names it: *"(b) Everything counted in OUR frames — which tick at 60/s because loop.ts says so."* Choosing ROM-pacing automatically fixes everything counted in **ROM** frames — and `zapTimer` (13 ROM frames) is now correct for free, which is a genuine vindication of the choice. But it **silently re-tunes everything counted in *our* frames that is not a ROM quantity.** `keySpin` is exactly that: a UI affordance calibrated at 60 Hz. The arrow keys are our invention; the arcade had a spinner, which is the displacement model the wheel already implements correctly.

**It also slows the attract-mode demo.** `demoInput` (`sim.ts:677`) computes `spin = laneOffset(...)` and feeds it through the identical per-step path, so the self-playing demo now tracks and dodges 2.11× more sluggishly. That is the first thing anyone sees on the cabinet, and it is the screen the lobby shows.

**Zero test coverage.** `tests/core/sim.player.test.ts` only asserts displacement *per step* (`spin * SPIN_SENSITIVITY`), which is step-rate independent and passes identically before and after. Nothing anywhere pins a rotation **rate**. AC6 says *"demonstrably playable at the new rate"* — Dev demonstrated that it **renders**, and did so properly, but never drove an input.

**Required (small):** make the call explicitly, the way FR-012 was made, and pin it:
- **either** dt-scale the keyboard so a held key holds a constant lanes/**second** (preserving feel and re-aligning it with the wheel),
- **or** consciously accept the slowdown, document it beside `SPIN_SENSITIVITY` with the same rigour as the FR-012 note, and re-tune `WHEEL_SCALE` so the two inputs agree again.

Either is a few lines. What I will not pass is a **2.11× change to how the game feels, shipped undecided and untested**, inside the very story whose thesis is that undecided frame-rate couplings are how this codebase got poisoned.

### 🟡 MINOR — the audit doc's own line citations rotted, while the findings JSON was fixed

`docs/2026-07-12-tempest-primary-source-audit.md` cites `rules.ts:46` as `WARP_INITIAL_SPEED = (2.0 * 60) / …`. Line 46 is now something else entirely. Dev correctly repaired the 98 citations in `docs/audit/findings/*.json` — but `citations.test.ts` only validates the JSON, **not the 2,474-line doc**, so the doc drifted silently. This matters because `tempest/CLAUDE.md` points every one of the next twenty stories at that doc as the authority. The ROM-side citations (the part that carries the audit's weight) are intact; it is the "ours"-side pointers that are stale. Not blocking — but it strengthens Dev's own recommendation to freeze the "ours" side to the audit commit, and that ruling should land **before tp1-4**.

### 🟡 MINOR — the superzapper window is now correct, but nothing proves it in seconds

`sim.ts:479` does `zapTimer -= 1` per step, and `ZAP_WINDOW_FIRST = 13` is a **ROM** frame count — so ROM-pacing makes it correct for free (13 ROM frames = 13 sim steps), exactly as Dev's FR-012 argument predicts. But `tests/core/sim.superzapper.test.ts` only ever asserts **frame counts**, never seconds, so it is blind to the step rate: revert `loop.ts` to `1/60` tomorrow and that suite stays green while the zap's felt duration silently halves again. That is the very bug class this story exists to kill, left unguarded for one mechanic. Not blocking — and note the *remaining* superzapper error (the ROM's window is **19** frames, not 13) is correctly **out of scope**, it belongs to tp1-14. This is purely a request for a seconds-level pin.

### ✅ What I tried to break and could not

- **The FR-012 decision is correct, and correctly argued.** I attacked it from the "28 Hz is too coarse" angle and it holds: the sim is continuous and dt-driven, `zapTimer`'s 13 ROM frames now come out right for free, and the deciding argument — that the CAM's opcodes are literally *"move N frames then flip"* — is exactly right. Deciding this on the twenty stories downstream rather than on this one was the correct instinct.
- **`warpAccel` genuinely falls out of the rebase.** It carries `ROM_FPS` squared because an acceleration is per-frame-per-frame. Nothing was hand-tuned, and the suite rejects the plausible half-fix `(ROM_FPS * 60)` by name. AC5 satisfied in spirit, not just letter.
- **The 82.5 and the 2.4 are dead, and structurally so.** `PULSAR_CLIMB_SPEED` now derives from the *same named ROM byte* as the L1 flipper, so the invariant cannot be broken by fixing one and forgetting the other. That is better than a test.
- **The scope fence held.** `SPIKE_MAX_DEPTH` is still 0.75, `SCORE_SPIKE_SEGMENT` still 3, `FAR_RATIO` still 0.2. The 16 findings whose cited line vanished are *exactly* the C1 family — strong evidence the diff touched what it claimed and nothing else.
- **Dev did not weaken TEA's dt-independence test.** I verified the claim independently: `Math.round(1.0 / dt)` with `dt = 9/256` really does yield runs of 0.984 s vs 1.002 s, so the two runs compared different journeys. The sim's climb rate is identical to 9 significant figures under both step sizes. The tolerance is unchanged at 6 decimal places. That was a real test bug, correctly diagnosed and honestly fixed.
- **The `remediated_by` escape hatch is sound.** It is trust-based — someone *could* silence a real failure with it — but the ROM `source` side is still byte-checked unconditionally, which is where the audit's authority lives. Correct trade.

### Rule Compliance (TypeScript checklist)

| Rule | Status |
|---|---|
| #1 type-safety escapes (`as any`, `@ts-ignore`, `!`) | **PASS** — none introduced |
| #4 `\|\|` vs `??` on falsy-but-valid values | **PASS** |
| #5 module/import hygiene | **PASS** |
| #8 test quality / vacuous assertions | **PASS** — TEA self-caught and removed a tautological branch |
| CLAUDE.md — `src/core` purity (no DOM/wall-clock/`Math.random`) | **PASS** — and now guarded by a source-rule test, which is a genuine improvement to the repo |
| CLAUDE.md — all time enters core as `dt` | **⚠️ `sim.ts:86` is the exception** — see the blocking finding |

### RULINGS FROM THE JEDI (2026-07-13) — Dev implements these

**1. Claw steering: match the arcade spinner. The WHEEL is the reference device, not the keyboard's old number.**

The cabinet's spinner is a **displacement** device: you turn the knob, the cursor moves by however much you turned it, and the frame rate has nothing to do with it. Our mouse wheel already models this correctly (`spinAccum` accumulates real motion and drains whole), which is why it survived the rebase untouched — it was right all along.

The keyboard is the thing that is wrong, and it is wrong *in kind*, not merely in magnitude: it emits a fixed `±1` **per sim step**, so it is not a control at all, it is a tick counter wearing a control's clothes. Restoring it to 9 lanes/sec would have papered over that — the same value would drift again the next time anything touches the step rate.

**Required:** the keyboard must synthesise displacement from **wall-clock time**, exactly as the wheel synthesises it from hand motion — so a held key is a constant angular velocity, frame-rate independent by construction, and `sim.ts:86` can keep treating `input.spin` as the displacement it claims to be. Tune the held-key rate for parity with a steady wheel spin, state the chosen rate and its reasoning in `input.ts` beside `WHEEL_SCALE` with the same rigour as the FR-012 note, and **pin it with a wall-clock test** (lanes per *second*, not per step) so no future step-rate change can move it silently. The attract-demo AI (`sim.ts:677`) rides the same path and is fixed by the same change.

**2. The audit-citation drift: freeze the "ours" side to the audit commit.** Dev's own recommendation, adopted. The checker should read the `ours` side from the audit commit (`git show 4232ed4:<file>`) rather than the working tree, which makes the gate permanently stable, preserves the record immutably, and removes the per-story re-pointing tax entirely. **File as its own story and land it before tp1-4**, which will churn `sim.ts` and `enemies/` heavily. The `remediated_by` mechanism and the 82 re-pointed citations shipped in tp1-1 stand as the interim fix — do not revert them.

**Handoff:** back to Yoda (Dev) to implement ruling 1 (ruling 2 is a separate story). Everything else in this story is approved.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): Story 6-9 replaced a nearly-correct constant with a wrong one, in the name of fidelity, and wrote a test to defend it. The pre-6-9 flipper speed was 0.18 depth/s; the ROM's true value is 0.1746. Story 6-9 "corrected" it to 0.368 — 2.11x too fast — by multiplying the ROM's per-frame byte by 60. `tests/core/sim.enemy-authentic.test.ts` then pinned 2.7 s as "the single most load-bearing authentic constant" and its own comment dismissed the correct behaviour as "valid RED". Affects `docs/` (the audit's §7 "what the book got wrong" should gain a companion note: *what WE got wrong, while citing the ROM*). This is the strongest independent corroboration of the whole audit that exists in the repo, and it is worth writing down where the next fidelity story will see it.
  *Found by TEA during test design.*

- **Gap** (non-blocking): The audit's known-call-site list for AC2 is incomplete *by construction*, and the story context repeats it as `rules.ts:46,52,120,154`. My source-text guard finds `* 60` / `/ 60` at seven sites — and `rules.ts:120` is **not** one of them, because `PULSAR_CLIMB_SPEED = 82.5 / WARP_ALONG_SPAN` contains no literal `60`. The 82.5 *is* 1.375 x 60. Any grep-driven rebase will pass over it and leave the pulsar 2.11x fast while every other enemy is correct. Affects `src/core/rules.ts:120` (needs the same treatment as the visible sites) — covered by a dedicated test, but flagging it because the same hidden-literal trap will recur in tp1-7 (the CONTOUR tables) and tp1-14 (the superzapper window).
  *Found by TEA during test design.*

- **Gap** (non-blocking): `src/core/enemies/flipper.ts:21` advances the flip animation with `flipProgress += 1 / flipFrames` — **once per call, not per dt**. It is therefore already coupled to the frame rate independently of any `* 60`: on a 144 Hz display a flip animates 2.4x faster than on a 60 Hz one. FR-012 answer (a) (a 9/256 timestep) fixes this implicitly; answer (b) (keep 1/60, convert at use sites) must fix it *explicitly* or the rebase is incomplete in a way no constant test will catch. Affects `src/core/enemies/flipper.ts:21`. Called out because it is the one place where the two FR-012 answers are not interchangeable.
  *Found by TEA during test design.*

### Dev (green)

- **Gap** (BLOCKING for the epic, resolved here for tp1-1): **the citation gate cannot survive its own remediation, and this will hit all 21 stories.** The findings are an audit record — `ours.verbatim` *is* the defect text — so the moment any tp1 story fixes anything, `citations` goes red. My rebase produced 98 failures. 82 were pure line drift (defect intact, only moved, because I added ~60 lines to the top of `rules.ts`); those I re-pointed, content-verified. The other 16 were code I actually fixed, and re-pointing those would have made the finding assert that the *fix* is the defect. I added `remediated_by` to the finding schema; `tools/audit/check-citations.mjs` now keeps a remediated finding's citation as HISTORY and stops re-opening it against the working tree, while **still byte-checking the ROM `source` side always** — that is where the audit's authority lives, and the 1981 source never changes. Affects `tools/audit/check-citations.mjs` and `docs/audit/findings/*.json`. **This solves it, but it does not scale gracefully: every future tp1 story will re-point drifted lines by hand.** The durable fix is to freeze the `ours` side to the audit commit (`git show 4232ed4:<file>`), which would make the gate permanently stable and require zero per-story churn. That is an audit-tooling redesign and I judged it outside a story fenced to the frame-rate family — recommend PM/Architect rule on it before tp1-4 (the CAM), which will drift `sim.ts` and `enemies/` heavily.
  *Found by Dev during green.*

- **Gap** (non-blocking): two more suites were pinned to the 60 Hz clock and TEA's re-seat did not catch them, because neither contains `82.5` or a literal `/ 60` — they encode the bad clock in *prose and a rounded decimal*. `tests/core/sim.autofire.test.ts` demanded a "~0.42s" bullet lifetime; that 0.42 is just 25/60. The **25 ROM frames is correct and unchanged** — only its conversion to seconds was wrong (25/28.44 = 0.879 s, and `1/BULLET_SPEED` = 0.875 s, which is the same 25 frames). `tests/shell/loop.test.ts` hard-coded `STEP_MS = 1000/60`, so with a 35.16 ms sim step *no sub-step ever executed* and all 7 of its tests broke. Affects both files (rebased, now green). The lesson for the remaining 20 stories: **the poisoned tests are not findable by grepping for `60`.** They are findable by grepping for *durations in seconds*.
  *Found by Dev during green.*

- **Improvement** (non-blocking): `ROM_FPS * SIM_STEP === 1.0` exactly in IEEE-754, but `(STAR_STEP * ROM_FPS) * dt` gives `6.999999999999999` per step where `STAR_STEP * (ROM_FPS * dt)` gives exactly `7`. The starfield's Z lifecycle runs on exact integer thresholds (spawn 240, retire 16), so the association order is load-bearing, not cosmetic — the wrong one lets rounding drift into the thresholds. It is commented at the site. Worth knowing for tp1-14 (the superzapper's 19-frame window) and tp1-7 (the CONTOUR tables), which are also integer-threshold ROM frame counts. Affects `src/shell/starfield.ts`.
  *Found by Dev during green.*

- **Improvement** (non-blocking): the shell now has exactly one hook for "things that must run on the game's clock rather than the display's" — the loop's `onStep(dt, state)`, which fires only for sub-steps that actually advanced the sim. Two consumers found it the hard way in this story alone: the warp starfield (FR-017, rAF-driven → ran at the monitor's rate and kept flying while paused) and the held-key spinner (wall-clock-driven → banked the paused seconds). **They were the same bug wearing different clothes, and neither was caught by 819 passing tests.** Any future shell-side quantity that accrues over time — a charge meter, a rotating attract-mode camera, an audio LFO — belongs on that hook and nowhere else. Worth a line in `tempest/CLAUDE.md` beside the core-purity rule, because the rule "all time enters core as dt" says nothing about the *shell*, and the shell is where both of these lived. Affects `tempest/CLAUDE.md` (a rule to add) and `src/shell/loop.ts` (the hook is already there).
  *Found by Dev during green rework.*

- **Question** (non-blocking): `tests/core/rules.enemy-fire.test.ts:95` carries the comment "shot_holdoff (60 Hz frames)". Its *assertions* are on ROM frame counts and remain correct after the rebase (the frames are ROM truth; only `sim.ts:217`'s `/ 60` conversion is wrong), so I did not touch it. But the comment is now actively misleading and will teach the next reader the exact error this story exists to remove. Affects `tests/core/rules.enemy-fire.test.ts:95` (comment only — one line, no assertion change). Suggest Dev or C-3PO fix it while in the neighbourhood.
  *Found by TEA during test design.*

### Reviewer (code review)

- **Gap** (BLOCKING for the epic, not for tp1-1): **Ruling 2's story was never filed.** I ruled
  on 2026-07-13 that the citation checker must read the `ours` side from the audit commit
  (`git show 4232ed4:<file>`) rather than the working tree, and that it be **filed as its own
  story and landed before tp1-4**. It is not in `sprint/epic-tp1.yaml`, which runs tp1-1 … tp1-21
  with no audit-tooling story. Dev correctly declined to build it inside a story fenced to the
  frame-rate family, and the interim `remediated_by` mechanism works — but tp1-4 (the CAM) will
  churn `sim.ts` and `enemies/` heavily and re-impose the hand re-pointing tax on 21 stories.
  Affects `sprint/epic-tp1.yaml` (needs a new story) and `tools/audit/check-citations.mjs`.
  **SM: please file it before tp1-4 is started.**
  *Found by Reviewer during code review.*

- **Improvement** (non-blocking): **the held-key path now costs ~2 ROM frames of input latency,
  not 1, and two comments say otherwise.** Measured on the shipped controller through the real
  `advanceFixedSteps` kernel: the first stepping sub-step after keydown turns 0 lanes and motion
  arrives on the second — a constant **35.16 ms** added, because `onStep` fires *after* the step
  while `sample()` runs inside it. Affects `src/core/rules.ts:46` ("input latency is one ROM
  frame (35 ms)" — now two for the keyboard) and `tests/shell/input.spinner.test.ts:73-75`
  ("identical to the wall-clock build's" — false; round 2 banked at sample time and had zero bank
  lag). Comments only; no behaviour change required. If the latency is ever judged worth
  removing, the fix is to tick *before* sampling, which is `loop.ts` surgery and its own story.
  *Found by Reviewer during code review.*

- **Improvement** (non-blocking): **`InputController.tick(dt)` has no finite-value guard, and
  `stepPlayer` has none either.** A `NaN` dt would propagate `keyAccum → input.spin →
  player.lane` and brick the game unrecoverably. Unreachable today (`loop.ts:117` always passes
  the constant `STEP`), but `select` mode already carries a `Number.isFinite(input.spin)` guard
  added by Story 5-9 for precisely this class of poisoning, and `stepPlayer` — the playing-mode
  path — does not. Affects `src/core/sim.ts:86`. One `Number.isFinite` check closes it.
  *Found by Reviewer during code review.*

- **Improvement** (non-blocking): Dev's own finding — that the loop's `onStep` is the shell's
  ONE hook for quantities that accrue on the game's clock — should be written into
  `tempest/CLAUDE.md` beside the core-purity rule. I am seconding it because I watched it catch
  a second victim in a single story: the starfield (FR-017) and the keyboard were the same bug
  wearing different clothes, and the existing rule ("all time enters core as `dt`") says nothing
  about the *shell*, which is where both of them lived. Affects `tempest/CLAUDE.md`.
  *Found by Reviewer during code review.*

- **Question** (non-blocking): a `NO_COUNTERPART` finding marked `remediated_by` hard-errors in
  `tools/audit/check-citations.mjs` (the flag demands an `ours` citation that `NO_COUNTERPART`
  forbids). It is unreachable — such findings have `ours: null` and are already inert on the
  "ours" side, so they never need the flag — but tp1-4/tp1-6/tp1-8 all *add systems we do not
  have*, which is exactly the `NO_COUNTERPART` class, and a dev reaching reflexively for
  `remediated_by` will get a confusing error. Worth one line of comment at the branch.
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (green)

- **FR-012 decided: (a) ROM-paced. `SIM_STEP = 9/256`.**
  - Spec source: context-story-tp1-1.md, AC-3
  - Spec text: "either (a) the sim's fixed timestep becomes 9/256 s, or (b) every ROM frame count is converted through ROM_FPS at its use site. A MIX OF BOTH IS AN EXPLICIT FAILURE."
  - Implementation: one sim step IS one ROM frame. `loop.ts` consumes `SIM_STEP` from the core instead of minting `1 / 60`. Rationale recorded in `rules.ts` under "FR-012: where the clock lives".
  - Rationale: decided by the twenty stories *behind* this one, not by this one. Epic tp1 transcribes ROM frame counts by the dozen — the CAM (tp1-4/5) is a bytecode VM whose opcodes are literally "move N frames then flip"; tp1-7 lifts the CONTOUR tables; tp1-14 the superzapper's 19-frame window. Under (b) each is a hand conversion someone can forget, and one forgotten conversion silently re-bakes the 60 — the exact bug class this story exists to close. Under (a) a ROM frame count *is* a sim step count; there is nothing left to convert. It also leaves `src/core` with no frame-rate 60 at all, which is what AC-2 asks for rather than something I would have to argue around: under (b) the sim's own 60 would have had to live in the core.
  - Severity: **major** (architectural, and expensive to reverse once downstream stories build on it)
  - Forward impact: **the sim now samples at 28.44 Hz, not 60.** Input latency is one ROM frame (35 ms) and sim motion updates 28x/s — this is the machine, not a regression, and the arcade sampled its spinner at exactly this rate. Render-side animation still runs at the display's rate (`render.ts` drives its phases from the real frame dt), so only the *simulation* is ROM-paced. **Reviewer: this is the single judgement call in the story and the one most worth attacking.** Verified playable in-browser (screenshot taken, zero console errors).

- **Rebased three sibling test suites that were pinned to the 60 Hz clock**
  - Spec source: context-story-tp1-1.md, "SCOPE FENCE"
  - Spec text: "Every timing test re-baselining is EXPECTED, not a regression."
  - Implementation: `tests/shell/loop.test.ts` (`STEP_MS = 1000/60` → `SIM_STEP * 1000`), `tests/core/sim.autofire.test.ts` (the "~0.42s" bullet lifetime → the ROM's 25 frames at the real clock, ~0.88 s), `tests/shell/starfield.test.ts` (`step()` → `step(SIM_STEP)`).
  - Rationale: none of the three is *about* the frame rate — they test `onModeChange`, the shot pool, and the starfield lifecycle — but each had a private opinion about the clock baked in. The starfield migration is behaviour-preserving by construction: under ROM-pacing `step(SIM_STEP)` advances exactly `STAR_STEP`, which is precisely what the old `step()` did, so every one of its exact-integer Z assertions holds unchanged.
  - Severity: minor
  - Forward impact: none. All three are green.

- **Fixed a step-count arithmetic bug in TEA's own dt-independence test**
  - Spec source: `tests/core/rom-clock-timing.test.ts`, "keeps the CONTINUOUS sim dt-driven"
  - Spec text: "same wall time, different step, same result"
  - Implementation: the test derived its step counts with `Math.round(wall / dt)` for `wall = 1.0`. 1.0 s is not an integer multiple of 9/256, so the coarse run covered 0.984 s and the fine run 1.002 s — the two runs compared *different journeys*. Replaced with a common `N` (N steps of `SIM_STEP` vs 4N of `SIM_STEP/4`), so both cover exactly the same wall time.
  - Rationale: **the sim is perfectly dt-independent — I checked before touching the test.** Both runs yield a climb rate of exactly `0.174603175`. The failure was the test's arithmetic, not the integrator. At the old 1/60 step both counts divided exactly, which is why the flaw was invisible until now. TEA's intent (dt-independence of the continuous integrators) is preserved exactly; only the step-count derivation changed.
  - Severity: minor
  - Forward impact: none. Reviewer should sanity-check that I have not weakened the assertion — the tolerance is unchanged at 6 decimal places.

### Dev (rework — round 3)

- **The held-key spinner is driven by the SIM's clock, not by the wall clock — a deliberate departure from the letter of the Jedi's Ruling 1, in service of its purpose.**
  - Spec source: `.session/tp1-1-session.md`, "RULINGS FROM THE JEDI (2026-07-13)", Ruling 1 — and Reviewer Assessment (round 2), the blocking finding
  - Spec text: "the keyboard must synthesise displacement from **wall-clock time**, exactly as the wheel synthesises it from hand motion — so a held key is a constant angular velocity, frame-rate independent by construction"
  - Implementation: held-key displacement is banked in a new `InputController.tick(dt)`, fed from the loop's `onStep` hook (the sim's own dt, fired only for sub-steps that actually advanced). `input.ts` now reads **no** wall clock — no `performance.now()`, no `Date.now()`. The Reviewer's prescribed one-line fix (clamp the wall-clock delta to `advanceFixedSteps`' 0.25 s cap) was **not** taken.
  - Rationale: the ruling's binding clause is its *purpose* — "a constant angular velocity, frame-rate independent by construction" — and the sim's clock satisfies it exactly. Sim time IS wall time; the two differ **only** where the loop deliberately refuses to run (`stepUnlessPaused`: "paused time is discarded, not banked"; `advanceFixedSteps`: any span clamped to 0.25 s). That difference is precisely the defect the Reviewer blocked on. A clamp would only *bound* it — the keyboard would still be coupled to a clock the simulation does not obey, and would still buy ~1.9 lanes the sim never stepped on every pause-resume (0.25 s of rotation against a single 0.035 s frame). The Reviewer named the true fix in their own diagnosis and then prescribed a bound instead: *"Neither is coupled to what the simulation actually ran."* `tick(dt)` **is** that coupling. It is also the identical fix, for the identical reason, that FR-017 applied to the warp starfield **in this same story** — rAF-driven, so it ran at the monitor's rate and kept flying while paused. The keyboard was the same bug in the same story; both now hang off the same hook. The Jedi's *number* is untouched: 9.0 lanes/sec of real time, at any display rate.
  - Severity: **major** (departs from the letter of a direct ruling, and adds a method to `InputController`)
  - Forward impact: `main.ts` must call `input.tick(dt)` from the loop's `onStep` — a wiring line that no behavioural test can see, so it is pinned by a source rule in `tests/rom-clock-sources.test.ts` alongside a rule forbidding a wall clock in `input.ts`. **Jedi: if you want the letter of Ruling 1 rather than its purpose, say so and I will swap `tick(dt)` for the clamp — it is a smaller change, and it is worse.** The mouse wheel is deliberately NOT tick-driven: it banks real hand motion, and a player who kept turning the knob through a pause genuinely turned it.

### TEA (test design)

- **Required three new exports the ACs only imply: `SIM_STEP`, `enemyFireHoldoffSeconds`, `starfield.step(dt)`**
  - Spec source: context-story-tp1-1.md, AC-2 / AC-3 / AC-4
  - Spec text: AC-3 "FR-012 is DECIDED IN WRITING… The choice is recorded in rules.ts with rationale; a mix of both is a failure." AC-2 "Every explicit `* 60` and `/ 60` in the sim is gone." AC-4 "The starfield is driven by the sim, not by requestAnimationFrame."
  - Implementation: tests demand `SIM_STEP` exported from `rules.ts`; `enemyFireHoldoffSeconds(level)` exported from `rules.ts`; `starfield.step()` gains a `dt` parameter.
  - Rationale: each AC is otherwise untestable. "The decision is made once, globally" has no observable form unless the chosen step is a named exported constant — a decision that lives only in a comment cannot be asserted, and a comment is exactly what a future dev overwrites. `sim.ts:217`'s conversion is inline arithmetic mid-tick, so removing its `/ 60` per AC-2 cannot be verified without either exporting the converted value or simulating a whole firefight to time two enemy shots. And a `step()` that takes no `dt` cannot *be* sim-driven — the parameter is the fix, not an extra.
  - Severity: minor
  - Forward impact: Dev must add three exports rather than only edit constants in place. `loop.ts` consumes `SIM_STEP` instead of minting its own `1 / 60`, which is what AC-2 wants anyway.

- **Did NOT assert dt-independence on the flip animation, though it is frame-rate coupled**
  - Spec source: context-story-tp1-1.md, AC-3 (FR-012)
  - Spec text: "either (a) the sim's fixed timestep becomes 9/256 s, or (b) every ROM frame count is converted through ROM_FPS at its use site. A MIX OF BOTH IS AN EXPLICIT FAILURE."
  - Implementation: `rom-clock-timing.test.ts` asserts dt-independence only for the *continuous* integrators (the climb). The flip animation (`flipper.ts:21`, `flipProgress += 1 / flipFrames`, advanced per call) is pinned only by its WALL-CLOCK duration when driven at `SIM_STEP`.
  - Rationale: a dt-independence assertion on the flip animation would silently FORBID FR-012 answer (a) — under a 9/256 timestep, a per-call advance is exactly correct, and demanding dt-independence would force answer (b) by the back door. TEA does not get to make an architectural choice the AC explicitly reserves. Driving at `SIM_STEP` and measuring seconds holds both answers to the same standard without picking one.
  - Severity: minor
  - Forward impact: if Dev picks answer (b), the per-call flip advance must be converted to dt-driven explicitly — no test forces it, so it is filed as a Delivery Finding instead. Flagged for the Reviewer.

- **Re-seated two sibling suites that asserted the bug was correct**
  - Spec source: context-story-tp1-1.md, "SCOPE FENCE" / audit §3
  - Spec text: "This story rebases the frame-rate family ONLY… Every timing test re-baselining is EXPECTED, not a regression."
  - Implementation: rewrote the ROM-derived constants and expectation bands in `tests/core/sim.enemy-authentic.test.ts` and `tests/core/sim.enemy-motion-fidelity.test.ts` (`FLIPPER_L1`, `FLIPPER_L33`, `PULSAR_NEAR_SPEED`, the traverse band, the near/far pulsar bands, and the 400-frame loop bound that the 2.11x-longer climb would have tripped).
  - Rationale: both suites hard-coded 60 Hz-derived values *and cited the ROM for them* (`82.5 = 1.375 x 60`). Left in place they would have gone red under a correct implementation and handed Dev two contradictory specs — with the older, wronger one wearing the words "authentic" and "fidelity" in its filename. Every absolute number in them is now derived from `ROM_FPS` rather than typed in, so the same poisoning cannot recur.
  - Severity: minor
  - Forward impact: none for Dev. These files now go GREEN with a correct rebase; they are part of the RED, not collateral.
### Reviewer (audit)

Every deviation logged by TEA and Dev, stamped. Nothing left unruled.

- **Dev (green) — FR-012 decided: (a) ROM-paced, `SIM_STEP = 9/256`** → ✓ **ACCEPTED by Reviewer:**
  attacked in round 1 from the "28 Hz is too coarse" angle and it held. The deciding argument —
  that the CAM's opcodes are literally *"move N frames then flip"*, so under (a) a ROM frame count
  IS a sim step count and there is nothing left to convert — is correct, and deciding it on the
  twenty stories downstream rather than on this one was the right instinct. `src/core` now contains
  no frame-rate 60 at all, which is what AC2 asks for rather than something to argue around.

- **Dev (green) — rebased three sibling test suites pinned to the 60 Hz clock** → ✓ **ACCEPTED:**
  the scope fence explicitly says "every timing test re-baselining is EXPECTED, not a regression."
  None of the three is *about* the frame rate; each had a private opinion about the clock.

- **Dev (green) — fixed a step-count arithmetic bug in TEA's own dt-independence test** → ✓
  **ACCEPTED:** I verified this independently rather than take it on trust. `Math.round(1.0 / dt)`
  with `dt = 9/256` really does yield runs of 0.984 s vs 1.002 s — the two runs compared *different
  journeys*. The sim's climb rate is identical to 9 significant figures under both step sizes, and
  the tolerance is unchanged at 6 decimal places. A real test bug, correctly diagnosed, honestly
  fixed, and the assertion is not weakened.

- **Dev (rework, round 3) — the held-key spinner is driven by the SIM's clock, not the wall clock;
  a deliberate departure from the LETTER of Ruling 1** → ✓ **ACCEPTED by Reviewer, and the
  departure was correct.** Dev asked whether I wanted the letter of my ruling or its purpose. The
  purpose. A clamp would only have *bounded* the divergence between the keyboard's clock and the
  sim's — it would still have bought ~1.9 lanes the simulation never ran, on every pause, forever.
  `tick(dt)` removes the coupling instead of capping it, and Dev's line *"there is no second copy
  of the 0.25 s cap to drift out of sync, because the keyboard never learns what the cap is"* is
  the argument I should have made myself. The ruling's binding clause — a constant angular
  velocity, frame-rate independent by construction — is satisfied more strongly than a wall clock
  can satisfy it, and my number (9.0 lanes/sec) is untouched. This is the right way to push back on
  a reviewer: implement the purpose, log the deviation, and say plainly what you did not do.

- **TEA — required three new exports the ACs only imply (`SIM_STEP`, `enemyFireHoldoffSeconds`,
  `starfield.step(dt)`)** → ✓ **ACCEPTED:** each AC is otherwise untestable. A decision that lives
  only in a comment cannot be asserted, and a comment is exactly what a future dev overwrites. A
  `step()` that takes no `dt` cannot *be* sim-driven — the parameter is the fix, not an extra.

- **TEA — did NOT assert dt-independence on the flip animation, though it is frame-rate coupled**
  → ✓ **ACCEPTED, and the restraint was right.** Such an assertion would have silently FORBIDDEN
  FR-012 answer (a) and forced answer (b) by the back door. TEA does not get to make an
  architectural choice the AC explicitly reserves for Dev. Filing it as a Delivery Finding instead
  was the correct move, and under the chosen answer (a) the per-call advance is exactly correct:
  one call IS one ROM frame.

- **TEA — re-seated two sibling suites that asserted the bug was correct** → ✓ **ACCEPTED:** both
  hard-coded 60 Hz-derived values *and cited the ROM for them* (`82.5 = 1.375 x 60`). Left in place
  they would have handed Dev two contradictory specs, with the older and wronger one wearing the
  words "authentic" and "fidelity" in its filename.

**UNDOCUMENTED deviation, found in audit:**

- **The rework added ~35 ms of input latency and did not log it as a cost.** Dev's round-3
  deviation entry argues the case for the sim clock thoroughly and honestly, but its "Forward
  impact" names only the `main.ts` wiring line — not the fact that banking *after* the step delays
  every held-key displacement by one full sim step. I measured it: 35.16 ms, doubling held-key
  latency to ~2 ROM frames. Spec said (Ruling 1) "a constant angular velocity, frame-rate
  independent by construction" — the code delivers that, but one step late, and `rules.ts:46` still
  advertises one-frame latency. Severity: **M**. Not blocking; filed as a Delivery Finding, and the
  two misleading comments must be corrected.