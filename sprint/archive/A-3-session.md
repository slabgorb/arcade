---
story_id: "A-3"
jira_key: ""
epic: "A"
workflow: "tdd"
---
# Story A-3: Ship flight model (rotate/thrust/inertia/drag/screen-wrap), ROM-tuned

## Story Details
- **ID:** A-3
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** asteroids
- **Branch:** feat/A-3-ship-flight-model

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-03T13:40:04Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-03T12:55:56Z | 2026-07-03T12:59:06Z | 3m 10s |
| red | 2026-07-03T12:59:06Z | 2026-07-03T13:16:25Z | 17m 19s |
| green | 2026-07-03T13:16:25Z | 2026-07-03T13:26:45Z | 10m 20s |
| review | 2026-07-03T13:26:45Z | 2026-07-03T13:40:04Z | 13m 19s |
| finish | 2026-07-03T13:40:04Z | - | - |

## Sm Assessment

Setup complete and verified; story routed to TEA for the RED phase.

- **Story:** A-3 — Ship flight model (rotate/thrust/inertia/drag/screen-wrap),
  ROM-tuned. 5 points, p1, workflow `tdd` (phased: setup → red → green →
  review → finish).
- **Repo/branch:** `asteroids` subrepo, `feat/A-3-ship-flight-model` created
  off `develop` (gitflow; PR will target `develop`, squash-merge).
- **Jira:** explicitly skipped — no Jira key; this project tracks stories in
  local sprint YAML only.
- **Context:** `sprint/context/context-story-A-3.md` enriched with problem,
  technical approach, scope, and 7 acceptance criteria transcribed from the
  epic context (`context-epic-A.md`, Architect-enriched). Determinism and
  core-purity are standing ACs per the epic.
- **Dependencies:** A-2 (deterministic tick + RNG + entity model) is merged on
  `develop` — `src/core/{state,sim,rng,input}.ts` exist. Story order holds.
- **Risk noted:** the `reference/` disassembly quarry does not exist in this
  checkout; ROM constants must be sourced from
  https://6502disassembly.com/va-asteroids/ and cited in committed core source
  (recorded as a Delivery Finding below).
- **Routing:** `SETUP_RESULT.next_agent = tea` — hand off to O'Brien to write
  failing tests.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 5-point p1 story, tdd workflow — core flight model is exactly the
kind of pure-sim behavior the epic mandates TDD for.

**Test Files:**
- `asteroids/tests/ship.test.ts` — NEW: 30 tests covering rotation, thrust,
  inertia, drag, max-velocity clamp, toroidal wrap, purity/determinism, and
  ROM-constant pins.
- `asteroids/tests/core-boundary.test.ts` — extended: `ship.ts` added to
  `EXPECTED_CORE_FILES` so the purity scanner requires and covers it.

**Tests Written:** 30 tests covering all 7 ACs from `context-story-A-3.md`
**Status:** RED (verified by testing-runner, run `A-3-tea-red`: ship.test.ts
fails on missing `src/core/ship`; core-boundary fails only its ship.ts
existence check; all 45 pre-existing tests pass — no regressions).
**Commit:** `b4961e4` on `feat/A-3-ship-flight-model`.

### ROM Source Notes (for Julia — saves re-deriving from the disassembly)

All constants verified against the rev-4 ROM disassembly
(https://6502disassembly.com/va-asteroids/Asteroids.html); cite these
addresses in code comments (AC-7):

- **Contract:** `src/core/state.ts` exports `WORLD_W = 8192`, `WORLD_H = 6144`
  and `Ship` gains `vel: Vec2` + `dir: number`; `src/core/ship.ts` (new)
  exports `SHIP_ROTATION_RATE = 3`, `SHIP_MAX_SPEED = 16383/256`,
  `SHIP_THRUST_TABLE` (65 ROM bytes — verbatim array is in the test file).
- **Units:** world = ROM lo-units (8 per screen pixel at 1024×768); velocity
  = world-units per 60 Hz frame; `dir` = 256 units/circle, 0 = +x, CCW
  (ROM "rotate left" ADDS 3 — left has priority when both buttons held,
  branch order at $7089).
- **Thrust lookup** (CalcXThrust $77d2 / CalcThrustDir $77d5): define
  `sinLookup(d)` = `sign * T[fold(d & 127)]` where `sign = (d & 128) ? -1 : +1`
  and `fold(i) = i <= 64 ? i : 128 - i`. Then Y-accel uses `sinLookup(dir)`,
  X-accel uses `sinLookup(dir + 64)`. Per ROM velocity update (every other
  frame): `v += 2 * lookup / 256`; the per-frame half-rate equivalent
  (`v += lookup / 256`) also passes the bands.
- **Drag** (ShipDecelerate $70e1): every other coasting frame,
  `v16 -= 2*hi(+1)` ⇒ ×127/128 per update; per-frame ×(1 − 1/256) equivalent
  passes. Never flips sign; must reach < 1/256 units/frame eventually.
- **Clamp** (ChkShipMaxVel $7125): per-axis, ±16383/256 — NOT a vector-norm
  clamp (diagonal top speed √2× cardinal is ROM-correct and tested).
- **Wrap** (UpdateObjPos $6fc7): exact toroidal mod on both axes (the ROM's
  `and #$1f` X-mask is exact mod; its Y edge-snap is equivalent to exact mod
  at all reachable speeds).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| TS #1 type-safety escapes | `core/ contains no as any, @ts-ignore, or @ts-expect-error` (scans all core files incl. future ship.ts) | guarding (green now, constrains GREEN) |
| TS #2 readonly/interface | `SHIP_THRUST_TABLE` pinned by deep equality; Dev should declare it `readonly`/`as const` (compile-level, enforced by tsc in `pf check`) | partial |
| TS #8 test quality | Self-check pass: no `as any`, no vacuous assertions; sweep tests assert non-vacuity (edge-crossing proven, ≥1 file scanned) | pass |
| Epic: determinism | replay equality, purity snapshot, RNG-untouched tests | failing (RED) |
| Epic: core purity | core-boundary guard extended to require + scan ship.ts | failing (RED) |
| TS #3/#6/#7/#9–#12 | N/A — pure sim module: no enums, JSX, async, config, external input, or error paths introduced | n/a |

**Rules checked:** 3 of 3 applicable lang-review rules have coverage (rest n/a)
**Self-check:** 0 vacuous tests found

**Handoff:** To Julia (Dev) for GREEN — implement `src/core/ship.ts` + extend
`state.ts`/`sim.ts` until `npm test` is green. No test may be modified.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `asteroids/src/core/ship.ts` — NEW: flight constants (SHIP_ROTATION_RATE,
  SHIP_MAX_SPEED, SHIP_THRUST_TABLE — 65 ROM bytes) + `stepShip()` (rotation,
  quarter-sine thrust folding, drag, per-axis clamp, toroidal wrap). Every
  constant cites its ROM address (AC-7).
- `asteroids/src/core/state.ts` — WORLD_W/WORLD_H exports; `Ship` extended
  with `vel: Vec2` + `dir`; center spawn (4096, 3072), dir 64, at rest.
- `asteroids/src/core/sim.ts` — `stepGame` now threads `ship: stepShip(...)`.
- `asteroids/tests/ship.test.ts` — ONE test rewritten (TEA's wrap-sweep was
  unsatisfiable + vacuous; see major deviation entry and Conflict finding).

**Tests:** 84/84 passing (GREEN) — verified by testing-runner run
`A-3-dev-green-2`; `tsc --noEmit` clean; vite build clean.
**Branch:** `feat/A-3-ship-flight-model` (LOCAL ONLY — no remote exists; see
Gap finding: GitHub repo `slabgorb/asteroids` not yet created, per repos.yaml
"once the GitHub repo exists").
**Commits:** `b4961e4` (RED tests, TEA), `101803c` (implementation),
`675f05f` (wrap-sweep test fix).

**Implementation notes:**
- Per-frame half-rate cadence chosen (thrust `table/256`/frame, drag
  `×255/256`/frame) — the sanctioned equivalent of the ROM's every-other-frame
  updates; all rates scale by `dt*60`.
- Flight is not mode-gated (simplest green); attract-mode story decides later.
- No RNG consumed; core purity guards pass (boundary scanner + typed-core
  scan).

**Handoff:** To The Thought Police (Reviewer) for review phase.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **Gap (non-blocking):** The `reference/` ROM-disassembly quarry is absent
  from this checkout (quarries live only in the checkout that created them —
  star-wars lesson). For A-3's ROM-tuned constants, source values directly
  from https://6502disassembly.com/va-asteroids/ and cite them in committed
  `core/` source so no checkout depends on a local quarry. (SM, setup)

### TEA (test design)

- **Improvement** (non-blocking): The bullet-spawn routine (BulletSlotFound
  $6cfd–$6d8e) was extracted alongside the flight code: bullets get velocity
  `ship_vel + sinLookup(dir)/2 + sinLookup(dir)` folded per axis, clamped to
  ±111 lo-units/frame, and inherit the firing ship's velocity — ready-made
  quarry data for A-4. Affects `sprint/context/context-story-A-4.md` (seed
  its Technical Approach with these addresses).
  *Found by TEA during test design.*
- **Question** (non-blocking): Whether ship flight applies in `attract` mode
  is unspecified — A-3 tests set `mode: 'playing'` and do not constrain
  attract behavior. Affects `asteroids/src/core/sim.ts` (Dev may gate or not;
  the attract/demo story owns the final call).
  *Found by TEA during test design.*

### Dev (implementation)

- **Conflict** (non-blocking, resolved in green): TEA's wrap-sweep test was
  unsatisfiable by any correct implementation (rotating-thrust integral
  cancels to ~35.6 speed, never >60) and vacuous on its wrap AC (the script
  never reaches a seam). Rewritten with proven seam crossings — see the major
  Dev deviation entry. Affects `asteroids/tests/ship.test.ts` (done; Reviewer
  to verify the physics argument).
  *Found by Dev during implementation.*
- **Gap** (non-blocking): The asteroids subrepo has NO git remote — the
  GitHub repo `slabgorb/asteroids` does not exist yet, and `repos.yaml`
  documents origin as pending "once the GitHub repo exists" (A-1 debt).
  `git push` is impossible; A-2 precedent is local merge to `develop`.
  Affects `.pennyfarthing/repos.yaml` / A-1 follow-up (create the GitHub repo
  and wire origin), and the A-3 finish flow (Reviewer must merge locally; the
  memory-noted "verify merge landed on origin/develop" check cannot apply).
  *Found by Dev during implementation.*
- **Question** (non-blocking): `attract` mode currently flies the ship too —
  flight is not mode-gated (simplest green; no test constrains attract). The
  attract-mode story (A-16 area) should decide gating when it lands demo play.
  Affects `asteroids/src/core/sim.ts` (possible `mode` gate later).
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): The rotate-then-thrust ROM order
  (ChkPlyrInput $7097 before ChkThrust) is implemented and documented but not
  numerically pinned — swapping the order would pass every current test. A
  future test should assert the exact velocity vector after LEFT_THRUST
  frames. Affects `asteroids/tests/ship.test.ts` ("can rotate and thrust in
  the same frame" — pin the vector, not just hypot > 0).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The per-axis clamp is only exercised via
  thrust ramp-up; a clamp accidentally moved inside the thrust branch would
  still pass. Add a coasting-from-overspeed case (vel {1000, 0}, NO_INPUT,
  one step → vel.x ≤ SHIP_MAX_SPEED). Affects `asteroids/tests/ship.test.ts`
  (max velocity describe block).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The wrap-sweep's y-seam guard passes with
  exactly 1 crossing (zero margin) and depends on the provisional spawn
  dir=64; if A-17 changes spawn constants this unrelated test may flip red.
  Give the y-seam proof its own scripted scenario or add slack. Affects
  `asteroids/tests/ship.test.ts` (wrap-sweep test).
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): Shell input capture is in no story's explicit AC —
  `src/main.ts` steps the sim with NO_INPUT and its comment says input
  "arrives with A-3+", but A-3 scoped shell wiring out. A-4/A-5 (fire/render)
  must claim the keyboard→Input mapping so the flight model becomes playable.
  Affects `asteroids/src/main.ts` + `sprint/context/context-story-A-5.md`
  (assign `shell/input.ts` ownership).
  *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

7 deviations

- **Velocity-update cadence relaxed to tolerance bands**
  - Rationale: The two cadences are trajectory-identical at gameplay
  - Severity: minor
  - Forward impact: A-19 (feel calibration) may tighten the bands
- **dt-scaling required for rotation despite the ROM being frame-locked**
  - Rationale: architecture rule outranks ROM literalism; the fixed-timestep
  - Severity: minor
- **Velocity stored in world-units per 60 Hz frame, not per second**
  - Rationale: byte-comparability to the quarry is the whole point of
  - Severity: minor
  - Forward impact: A-4/A-6+ must keep the same velocity convention
- **Y-wrap edge-snap quirk replaced by exact toroidal mod**
  - Rationale: at all reachable speeds (≤ 64 lo-units/frame < 256) the ROM
  - Severity: minor
- **Spawn orientation (dir 64, up) pinned from footage/analyses, not bytes**
  - Rationale: ship-points-up at spawn is unambiguous in every recording;
  - Severity: minor
  - Forward impact: A-17 (table port) verifies the spawn value against the quarry
- **Drag constant enforced behaviorally, not as a named export**
  - Rationale: the ROM's drag is an algorithm (subtract 2×hi-byte), not a
  - Severity: minor
  - Forward impact: Reviewer should check the drag code cites $70e1
- **Rewrote TEA's defective wrap-sweep test (one test, intent preserved)**
  - Rationale: the original guard is unsatisfiable by ANY correct
  - Severity: major (test contract change during GREEN — Reviewer must
  - Forward impact: none beyond this story; all other 37 ship tests untouched

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)

- **Velocity-update cadence relaxed to tolerance bands**
  - Spec source: context-epic-A.md, fidelity bar; ROM ChkThrust $709b
  - Spec text: "each story ships ROM-accurate behavior for its slice"
  - Implementation: ROM updates thrust/drag every OTHER frame; tests assert
    rates via bands at even frame counts, accepting both the 30 Hz cadence
    and its half-rate 60 Hz equivalent
  - Rationale: The two cadences are trajectory-identical at gameplay
    granularity; byte-exact parity would over-constrain Dev for zero
    observable fidelity gain
  - Severity: minor
  - Forward impact: A-19 (feel calibration) may tighten the bands
  - → ✓ ACCEPTED by Reviewer: bands verified by independent re-implementation
    (test-analyzer) — 30 Hz and half-rate 60 Hz cadences land inside every band.
- **dt-scaling required for rotation despite the ROM being frame-locked**
  - Spec source: context-epic-A.md, core/shell boundary
  - Spec text: "All time enters as `dt`"
  - Implementation: test pins dir advance of 1.5 units at dt=1/120 (linear
    in dt); ROM has no dt concept (hard 60 Hz)
  - Rationale: architecture rule outranks ROM literalism; the fixed-timestep
    loop makes this unobservable in-game but keeps the core honest
  - Severity: minor
  - Forward impact: none
  - → ✓ ACCEPTED by Reviewer: architecture rule outranks ROM literalism;
    verified (1/60)*60 === 1 in-engine so the exact-integer rotation pins hold.
- **Velocity stored in world-units per 60 Hz frame, not per second**
  - Spec source: context-story-A-3.md, Technical Approach
  - Spec text: "constants are ROM-tuned per the epic authority chain"
  - Implementation: tests read `ship.vel` in ROM-native per-frame units so
    every constant stays byte-comparable to the disassembly ($3FFF cap,
    table bytes, 127/256 thrust rate)
  - Rationale: byte-comparability to the quarry is the whole point of
    ROM-tuning; per-second units would smear every citation by ×60
  - Severity: minor
  - Forward impact: A-4/A-6+ must keep the same velocity convention
  - → ✓ ACCEPTED by Reviewer: byte-comparability to the quarry is the epic's
    fidelity bar; the convention is documented in state.ts and ship.ts headers.
- **Y-wrap edge-snap quirk replaced by exact toroidal mod**
  - Spec source: ROM UpdateObjPos $7007–$7013
  - Spec text: hi-byte == $18 → 0; hi-byte > $18 → $17 (lo byte kept)
  - Implementation: tests enforce exact `mod 6144` on both axes
  - Rationale: at all reachable speeds (≤ 64 lo-units/frame < 256) the ROM
    snap is arithmetically identical to exact mod; exact mod is also what
    the X axis does ($6fe0 `and #$1f`)
  - Severity: minor
  - Forward impact: none
  - → ✓ ACCEPTED by Reviewer: equivalence argument checked — max per-axis speed
    (64 lo-units/frame) is far below the 256 lo-unit snap window, so the ROM
    snap and exact mod coincide at all reachable states.
- **Spawn orientation (dir 64, up) pinned from footage/analyses, not bytes**
  - Spec source: context-epic-A.md, fidelity authority chain (tier 3)
  - Spec text: "Observed behavior in footage / MAME — for feel calibration only"
  - Implementation: `initialState` test pins `ship.dir === 64`; the spawn
    byte was not located in the disassembly this session
  - Rationale: ship-points-up at spawn is unambiguous in every recording;
    blocking on a byte hunt was not worth it
  - Severity: minor
  - Forward impact: A-17 (table port) verifies the spawn value against the quarry
  - → ✓ ACCEPTED by Reviewer: agrees with author reasoning; risk is one
    constant with a designated settling story. Note the wrap-sweep test's
    y-seam margin depends on this constant (see [TEST] finding).
- **Drag constant enforced behaviorally, not as a named export**
  - Spec source: context-story-A-3.md, AC-7
  - Spec text: "Flight constants cite their disassembly source in the
    committed core code"
  - Implementation: no `SHIP_DRAG` export is pinned; decay is enforced by a
    band (0.785–0.796 of v after 1 s) plus no-sign-flip and comes-to-rest
    invariants
  - Rationale: the ROM's drag is an algorithm (subtract 2×hi-byte), not a
    single constant; pinning one export would force one formulation. The
    citation requirement still applies to whatever form Dev writes
  - Severity: minor
  - Forward impact: Reviewer should check the drag code cites $70e1
  - → ✓ ACCEPTED by Reviewer: checked — DRAG_PER_FRAME cites ShipDecelerate
    $70e1 at ship.ts:49-52; behavioral band excludes no-drag, double-drag, and
    1/64-rate implementations.

### Dev (implementation)

- **Rewrote TEA's defective wrap-sweep test (one test, intent preserved)**
  - Spec source: asteroids/tests/ship.test.ts, "spiralling max-speed run"
    sweep (TEA handoff: "No test may be modified")
  - Spec text: script `i % 3 === 0 ? LEFT_THRUST : THRUST` for 600 frames,
    then `expect(hypot(vel)).toBeGreaterThan(60)`
  - Implementation: replaced the script with 21 rotate+thrust frames (heading
    64→127) followed by sustained straight thrust, and added explicit wrap
    counters (`|Δpos| > world/2` per frame) asserting ≥2 x-seam and ≥1 y-seam
    crossings plus the >60 final-speed guard
  - Rationale: the original guard is unsatisfiable by ANY correct
    implementation — a continuously rotating thrust vector integrates toward
    zero (geometric sum |sin(600π/256)|/sin(π/256) ≈ 71.8 × 127/256/frame ≈
    35.6; testing-runner measured 35.6497, matching the prediction to 3
    figures). Worse, that script's position oscillates ±~1500 units around
    center and never reaches a seam, so the original test also never actually
    exercised wrap — vacuous on its own AC. The rewrite keeps the documented
    intent (bounds invariant + non-vacuity) and strengthens it by proving
    seam crossings instead of assuming them
  - Severity: major (test contract change during GREEN — Reviewer must
    re-derive the physics and confirm the defect was real)
  - Forward impact: none beyond this story; all other 37 ship tests untouched
  - → ✓ ACCEPTED by Reviewer: independently CONFIRMED — test-analyzer
    re-implemented stepShip from the ROM notes in a standalone script and
    reproduced the original script's terminal speed (35.6498 — unsatisfiable
    vs the >60 guard) and the rewrite's crossings (wrapsX=4, wrapsY=1, final
    speed 65.36). The rewritten test is strictly stronger than the original
    (it PROVES seam crossings; the original could pass without ever wrapping).
    Dev's unilateral test edit was justified and correctly escalated as major.

### Reviewer (audit)

- **Sub-integer position integration (undocumented):** Spec (ROM UpdateObjPos
  $6fc7) adds only the INTEGER velocity hi-byte to the position each frame;
  the clone integrates the full float velocity (`pos += vel * frames`,
  ship.ts:110-113). Not documented by TEA/Dev as its own entry (implied by
  the cadence deviation but distinct). Divergence is bounded by <1 lo-unit
  per frame (~1/8 screen pixel) and is invisible at gameplay granularity.
  Severity: L. → ✓ ACCEPTED by Reviewer (consistent with the accepted
  per-frame smoothing; A-19 may revisit if byte-exact feel calibration
  demands it).
- **Record note:** TEA Assessment says "30 tests"; the committed ship.test.ts
  contains 38 (39 after the wrap-sweep rewrite added assertions). Counting
  error in the record only — coverage is larger than recorded, not smaller.
  Severity: L (record accuracy; no action).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 84/84 green, tsc clean, build clean, tree clean, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings; Reviewer covered boundaries manually (dir seam, clamp edges, wrap seams, dt=0) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings; no error paths exist in the pure core diff (no catch/fallback constructs) |
| 4 | reviewer-test-analyzer | Yes | findings | 7 | confirmed 3 (order-pin gap M, clamp-path gap M, y-seam margin M), noted 4 as Low (dir-seam case, duplicate drag test, tautological table pin, no stasis baseline), dismissed 0 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings; Reviewer checked comments manually — found stale main.ts input note (logged as Gap finding) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings; rule-checker #1/#2/#5 covered type escapes, readonly, module hygiene — clean |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings; no attack surface in diff (no user strings, network, storage, or DOM) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings; test-analyzer flagged the one duplication (drag/thrust test overlap, Low) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations | N/A — 18 rules × 51 instances, all compliant; 2 borderline items judged compliant with rationale |

**All received:** Yes (3 enabled returned; 6 disabled via settings, pre-filled)
**Total findings:** 7 confirmed (3 Medium, 4 Low), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** Input booleans (shell keyboard — not yet wired; main.ts
feeds NO_INPUT) → `stepGame(state, input, dt)` → `stepShip` (ship.ts:80):
left/right → `dir` wrapped mod 256 → `sinLookup` (index provably ∈ [0, 64]
after fold — no out-of-bounds path) → velocity ± table/256·frames → per-axis
clamp ±16383/256 → position += vel·frames → toroidal wrap into
[0,8192)×[0,6144). No NaN sources (dt is the loop's constant 1/60; inputs are
booleans); no randomness consumed (seed pinned by test ship.test.ts:398).

**Pattern observed:** Good — constants-with-ROM-citations pattern
(ship.ts:24-52, every constant carries its disassembly address), matching the
star-wars convention of documented core constants; core/shell boundary
respected (ship.ts imports only ./state, ./input).

**Error handling:** N/A by design — pure total functions over well-typed
inputs; no I/O, no exceptional paths. Degenerate inputs verified: dt=0 yields
the identity flight step (pow(x,0)=1, zero displacement); both-rotate-held
resolves left-first per ROM branch order (tested, ship.test.ts:166).

### Rule Compliance

Mapped to `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) plus
epic rules — full enumeration in rule-checker report [RULE]:

- #1 type escapes: PASS — 0 `as any`/`@ts-ignore`/`!` across 5 changed files
  (also runtime-guarded by ship.test.ts:406).
- #2 generics/readonly: PASS — `SHIP_THRUST_TABLE: readonly number[]`
  (ship.ts:37); `Partial<Ship>` only in test override helper, merged over
  full defaults.
- #3 enums: N/A (string-literal unions, pre-existing pattern).
- #4 null/undefined: PASS — no `?.`/`??`/`||` in changed core files.
- #5 modules: PASS — `import type` used correctly (ship.ts:20-22, sim.ts:8-10);
  extensionless imports valid under `moduleResolution: bundler`.
- #6 React/JSX: N/A. #7 async: PASS (one awaited dynamic import in tests).
- #8 test quality: PASS with 3 Medium coverage-gap findings (below).
- #9 build/config: PASS — configs untouched, strict on, build green.
- #10 input validation: N/A (no external input surface).
- #11 errors: N/A. #12 perf/bundle: PASS (no barrels; sync fs in test only).
- #13 fix regressions: N/A (no fix rounds in this diff).
- Epic core purity: PASS — boundary scanner covers ship.ts
  (core-boundary.test.ts:19); zero banned globals.
- Epic determinism: PASS — replay/purity/RNG tests; verified
  `(1/60)*60 === 1` in-engine so exact-integer rotation pins are sound.
- Epic AC-7 citations: PASS — 7/7 constants cite ROM routine+address.

### Observations

1. [VERIFIED] Per-axis clamp is unconditional — ship.ts:107-108 applies
   `clampAxis` after BOTH thrust and drag branches, complying with
   ChkShipMaxVel semantics; checked against epic fidelity rules — compliant.
2. [VERIFIED] `sinLookup` cannot index out of bounds — fold of `b & 127`
   yields [0,64] for all inputs (ship.ts:60-65); table has 65 entries;
   bitwise ops truncate fractional dirs exactly like ROM byte math.
3. [TEST][MEDIUM] Rotate-then-thrust order contract unpinned — swapping the
   order passes all tests (test-analyzer, confirmed by hand-check); forwarded
   as Improvement finding.
4. [TEST][MEDIUM] Clamp reached only via thrust ramp — a regression scoping
   the clamp to the thrust branch would pass; forwarded as Improvement.
5. [TEST][MEDIUM] Wrap-sweep y-seam margin is exactly zero (1 crossing) and
   coupled to provisional spawn dir; forwarded as Improvement.
6. [TEST][LOW] Four low-confidence notes confirmed as real but non-blocking:
   missing exact dir-seam case (253+3→0), duplicated drag/thrust bound,
   tautological ROM-table pin (guards drift, not transcription), no
   full-stasis baseline test.
7. [DOC][LOW] main.ts comment "input... arrives with A-3+" is now misleading
   (A-3 shipped core-only); forwarded as Gap finding for A-5 scoping.
   (comment-analyzer disabled; found manually.)
8. [VERIFIED] Purity and no-aliasing — stepShip/stepGame never write into
   inputs (rule-checker enumeration; runtime-proven by ship.test.ts:373-397).
9. [SEC] No security surface in this diff — no user strings, network,
   storage, DOM, or tenant data (security subagent disabled; verified
   manually — nothing to isolate). [TYPE] and [SILENT] domains likewise
   covered manually: types are strict with readonly table, and the pure core
   has no swallowed-error constructs. [EDGE] boundaries hand-checked (dir
   seam via wrap(dir,256), clamp at exactly ±MAX, wrap at 0/W/H, dt=0
   identity). [SIMPLE] one Low duplication noted above.

### Devil's Advocate

Assume this code is broken. Where would it bleed? First: cross-engine
determinism. `Math.pow` is not required to be correctly rounded; a future
attract-mode ghost replay recorded on V8 and replayed on JavaScriptCore could
diverge after thousands of drag frames. Today's AC is same-run determinism,
so it holds — but the moment someone ships recorded demos (A-16), this
becomes a real bug with a confusing repro. Second: `dt` is trusted absolutely.
A NaN or negative dt would silently poison dir/vel/pos — no guard exists.
The only caller is the fixed-timestep loop, which clamps and fixes dt, so the
trust is currently justified; but any future caller (tests aside) inherits an
unguarded contract. Third: the flight model runs in ALL modes — a "game over"
screen with a still-drifting, still-steerable invisible ship is a latent
surprise for A-15/A-16; it is on record as a Question, which is the correct
containment. Fourth: the ROM table exists twice (src constant and test pin);
both trace to ONE transcription session — a transcription error would be
invisible to every test. Mitigated only by the fact that the transcription
was cross-checked against the live disassembly page during RED, and endpoint/
monotonicity tests catch gross slips. Fifth: per-frame half-rate cadence is a
smooth approximation — if A-19's feel calibration ever compares frame-by-frame
against MAME captures, the every-other-frame staircase will differ at
microscopic scale and the bands may need re-derivation. None of these break
A-3's ACs today; all five have named owners or recorded findings. The devil
finds no unrecorded crime.

**Handoff:** To Winston Smith (SM) for finish-story. Merge note: no remote
exists — local merge of `feat/A-3-ship-flight-model` (3 commits) into
`develop`, per A-2 precedent and the Gap finding.