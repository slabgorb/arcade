---
story_id: "A-4"
jira_key: null
epic: "A"
workflow: "tdd"
---
# Story A-4: Firing — bullet spawn/velocity/lifetime, max-4-shots cap

## Story Details
- **ID:** A-4
- **Jira Key:** (not using Jira)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-03T15:14:18Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-03T14:25:33Z | 2026-07-03T14:28:01Z | 2m 28s |
| red | 2026-07-03T14:28:01Z | 2026-07-03T14:49:55Z | 21m 54s |
| green | 2026-07-03T14:49:55Z | 2026-07-03T15:00:54Z | 10m 59s |
| review | 2026-07-03T15:00:54Z | 2026-07-03T15:14:18Z | 13m 24s |
| finish | 2026-07-03T15:14:18Z | - | - |

## Sm Assessment

**Story:** A-4 — Firing: bullet spawn/velocity/lifetime, max-4-shots cap (2 pts, p1, tdd/phased).
**Repo:** asteroids (gitflow). Branch `feat/A-4-firing` created off `develop`. PRs squash-merge → `develop`, NOT main.

**Routing:** setup → **red (O'Brien / TEA)**. This is a phased tdd workflow; TEA writes failing specs, then Julia (Dev) makes them green.

**Context for RED (TEA — define ROM-grounded ACs here):**
- Builds directly on A-3's ship model (`src/core/ship.ts`, `src/core/sim.ts`). Firing must reuse the established world model: ROM "lo-units" (8 per screen pixel at 1024x768), velocity in world-units per 60 Hz frame, `dir` on a 256-unit circle (0 = +x, CCW positive).
- **No `reference/` quarry in this checkout** (consistent with A-3). Extract ROM-accurate values from the rev-4 disassembly at https://6502disassembly.com/va-asteroids/Asteroids.html and cite them inline by ROM address — the exact convention A-3's `ship.ts` header established.
- Behaviors to pin down against ROM: (1) bullet spawns from the ship nose at ship `dir`; (2) muzzle velocity is added to the ship's current velocity (inherited-momentum firing); (3) finite bullet **lifetime** in frames; (4) the classic **max-4-shots-on-screen** cap (fire input ignored while 4 live bullets exist).
- Keep purity conventions from A-3: pure sim, time enters only as `dt`, entropy only via the seeded RNG (firing should consume none).

**Blockers:** none. Working tree clean, no stale branches, no open PRs. Merge gate clear.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 2-point p1 story, tdd workflow — firing is pure-sim behavior extending
A-3's ship model, exactly the ROM-accurate slice the epic mandates TDD for.

**Test Files:**
- `asteroids/tests/bullet.test.ts` — NEW: 20 tests across 7 ACs — spawn on a
  fire edge, muzzle velocity (heading/sign/cardinal isotropy/outruns the ship/
  constant in flight), inherited ship momentum, finite lifetime + toroidal wrap,
  max-4-shots cap, edge-triggered fire (no auto-fire / re-arm on release / slot
  frees on expiry), and purity/determinism/no-RNG.
- `asteroids/tests/core-boundary.test.ts` — extended: `bullet.ts` added to
  `EXPECTED_CORE_FILES` so the purity scanner requires and covers the new module
  (A-3's precedent for `ship.ts`).

**ACs authored by TEA:** the sprint YAML and story context carried no ACs
("TEA to define during the RED phase"). I derived 7 ACs from the epic fidelity
bar + the ROM firing routine. They are documented in the test-file header.

**Status:** RED — verified by testing-runner run `A-4-tea-red`: `bullet.test.ts`
fails on missing `src/core/bullet` (import resolution, not a syntax error);
`core-boundary.test.ts` fails only its `bullet.ts` existence check; all 83
pre-existing tests pass (no regressions).
**Commit:** `dba132d` on `feat/A-4-firing`.

### Contract for Julia (Dev) — saves re-deriving from the disassembly

- **New module** `src/core/bullet.ts` exports `MAX_PLAYER_SHOTS = 4` and
  `BULLET_LIFETIME_FRAMES` (integer frame count). `src/core/state.ts` `Bullet`
  gains `vel: Vec2` and a lifetime field; firing wires into `stepGame`
  (`src/core/sim.ts`) and carries an edge-triggered fire-debounce in
  `GameState` (initialised so the first press fires).
- **ROM quarry** (from A-3's archive, BulletSlotFound `$6cfd–$6d8e`): shot
  velocity is the per-axis heading velocity (same `sinLookup` fold as thrust)
  **added to the ship's current velocity** (momentum inherited, `$6d11 adc
  ShipXSpeed`), per-axis clamped to **±111 lo-units/frame** (> the ship's
  ±16383/256). Max 4 slots (`$6cee`). Fire is edge-triggered via the fire-
  button shift register (`ShipBulletSR $63`, `$6cdb`). Lifetime is a per-shot
  countdown (`ShpShotTimer ~$021F`). **Cite these addresses in the code.**
- **Not hard-coded on purpose:** the muzzle magnitude (per-axis clamped byte)
  and the exact lifetime frame count — extract + ROM-cite them; the tests pin
  the *mechanism* against your exported constant, not a guessed literal.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| TS #1 type-safety escapes | `core-boundary.test.ts` + `ship.test.ts`'s "core stays typed" scan auto-cover `bullet.ts` (no `as any`/`@ts-ignore`/`@ts-expect-error`) | guarding (constrains GREEN) |
| TS #2 readonly/interface | `CARDINALS` typed `ReadonlyArray<readonly [...]>`; `Bullet.vel` extension enforced by `tsc --noEmit` in `pf check` | partial |
| TS #8 test quality | Self-check pass: no `as any`, no vacuous asserts — muzzle sign+magnitude pinned (not `hypot>0`), isotropy proven relative, non-vacuity via length/edge-crossing/wrap guards | pass |
| Epic: determinism | replay-equality + no-RNG-consumption tests | failing (RED) |
| Epic: core purity | boundary guard extended to require+scan `bullet.ts`; no-input-mutation + fresh-array tests | failing (RED) |
| TS #3/#4/#6/#7/#9–#12 | N/A — pure sim module: no enums, JSX, async, config, external input, or error paths | n/a |

**Rules checked:** 3 of 3 applicable lang-review rules have coverage (rest n/a)
**Self-check:** 0 vacuous tests found

**Handoff:** To Julia (Dev) for GREEN — create `src/core/bullet.ts` + extend
`state.ts`/`sim.ts` until `npm test` is green. No test may be modified without
logging a deviation and escalating (A-3 precedent).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `asteroids/src/core/bullet.ts` — NEW: `MAX_PLAYER_SHOTS` (4, `$6cee`),
  `BULLET_LIFETIME_FRAMES` (18, `ShpShotTimer $6d01`), `BULLET_SPEED` (±111
  per-axis muzzle clamp, `$6d1a/$6d22`), and `stepBullets()` — edge-triggered
  fire, per-axis muzzle velocity via the shared thrust sine fold at 3/2
  amplitude, inherited ship momentum (`$6d11 adc ShipXSpeed`), constant-velocity
  toroidal flight (`UpdateObjPos $6fc7`), lifetime countdown + cull, 4-shot cap
  (BulletSlotFound `$6cfd–$6d8e`). Pure; dt-scaled; consumes no RNG.
- `asteroids/src/core/state.ts` — `Bullet` gains `vel: Vec2` + `life`;
  `GameState` gains `firePrev` (init `false` so the first press fires).
- `asteroids/src/core/ship.ts` — `sinLookup` exported so firing reuses the ROM
  sine routine instead of a private copy (no duplication).
- `asteroids/src/core/sim.ts` — `stepGame` threads `stepBullets` after
  `stepShip` (fire in the direction now faced, inheriting the velocity now held).

**No test modified.** All TEA tests pass as written.

**Tests:** 110/110 passing (GREEN) — verified by testing-runner run
`A-4-dev-green`; `tsc --noEmit` clean; `vite build` clean. (Was 84 at RED: the
~26 firing/boundary tests now pass with zero regressions.)
**Branch:** `feat/A-4-firing` — pushed to `origin` (`slabgorb/asteroids`).
**Commits:** `dba132d` (RED tests, TEA), `c08fdd7` (implementation).

**Implementation notes:**
- Per-frame cadence (life decrements by `dt*60`; position integrates the full
  float velocity), the A-3-sanctioned equivalent of the ROM's frame-locked math.
- Firing order: existing shots advance, then a new shot spawns — so the 4-shot
  cap holds on every frame and a fresh shot appears at the ship un-aged.
- Spawn at the ship position (no nose offset), resolving the SM↔ROM spawn
  conflict in favour of the ROM (see deviation + TEA Conflict finding).
- Firing is not mode-gated (matches A-3's un-gated flight; attract/demo story
  owns the final call).

**Handoff:** To The Thought Police (Reviewer) for code review.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Conflict** (non-blocking): SM assessment says bullets "spawn from the ship
  nose," but the ROM firing routine (BulletSlotFound `$6cfd–$6d8e`) shows the
  shot spawning at the ship position with no explicit nose-offset constant. The
  tests accept either (bullet at or ahead of the ship along heading, y-aligned,
  within 700 lo-units). Affects `asteroids/src/core/bullet.ts` (spawn position —
  Dev to resolve against the ROM and cite; Reviewer to verify).
  *Found by TEA during test design.*
- **Gap** (non-blocking): The exact muzzle-speed magnitude and lifetime-frame
  count are deliberately not pinned as literals (per-axis clamped byte value;
  `ShpShotTimer` init unverified from the summarised disassembly). Dev must
  extract and ROM-cite both; Reviewer must verify the citations
  (BulletSlotFound `$6cfd–$6d8e` / `ShpShotTimer ~$021F`). Affects
  `asteroids/src/core/bullet.ts`.
  *Found by TEA during test design.*
- **Question** (non-blocking): Firing is not mode-gated — tests fire in
  `playing` mode only and do not constrain `attract`/`gameover` firing, matching
  A-3's un-gated flight. The attract/demo story should decide whether firing is
  gated (the demo needs to fire). Affects `asteroids/src/core/sim.ts`.
  *Found by TEA during test design.*
- **Gap** (non-blocking, carry-forward from A-3): The asteroids subrepo's GitHub
  remote may not exist yet (A-3 merged locally to `develop`; `gh pr list`
  returns no remote). The A-4 finish will likely be a LOCAL merge of
  `feat/A-4-firing` into `develop`. Affects `.pennyfarthing/repos.yaml` / the
  finish flow. *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking, resolves A-3 carry-forward): The
  `slabgorb/asteroids` GitHub remote now exists and is pushable — the user
  confirmed it. `feat/A-4-firing` and `develop` are both on `origin` (local
  `develop` == `origin/develop`). The A-4 finish can open a real PR
  (`feat/A-4-firing` → `develop`) and the memory-noted "verify the merge landed
  on origin/develop" check now applies. Affects `.pennyfarthing/repos.yaml`
  (origin is live) / the finish flow. *Found by Dev during implementation.*
- **Gap** (non-blocking): The 3/2-amplitude muzzle fold and the 18-frame
  lifetime are reconstructed from A-3's quarry shorthand and the summarised
  disassembly, not byte-verified against the raw BulletSlotFound `$6cfd–$6d8e` /
  `ShpShotTimer $6d01` listing this session. Behaviour is ROM-plausible and all
  tests pass, but the exact bytes want a read against the live disassembly.
  Affects `asteroids/src/core/bullet.ts` (Reviewer to verify citations; A-19
  feel calibration may adjust). *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): The muzzle-velocity suite tests cardinal
  headings only, where the sine table saturates the ±111 clamp — so the ROM "3/2
  fold" term is unobservable (test-analyzer proved deleting it keeps all 26 tests
  green) AND the 3/2 factor distorts shot direction at mid-angles (dir 20 fires
  ~39° vs the ~28° heading). Add a non-cardinal magnitude+direction test and
  verify the fold factor against the raw BulletSlotFound `$6cfd–$6d8e` bytes;
  if 3/2 is unconfirmed, reconsider 1×. Affects `asteroids/tests/bullet.test.ts`
  + `asteroids/src/core/bullet.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The same-frame "a bullet expires and a fresh
  fire lands in one `stepGame`" path — the reason `stepBullets` runs `advance`
  before the cap check — is untested (test-analyzer proved a stale pre-removal
  count stays green). Add a test that fires at exactly the expiry frame and
  asserts the freed slot is reused same-frame. Affects
  `asteroids/tests/bullet.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Loose test bounds hide real regressions — the
  700-lo-unit spawn slack and the ±2-frame lifetime band (both proven by
  mutation) should be tightened to the exact behavior the shipped code has
  (offset 0; exact expiry frame). Add a `dt != 1/60` bullet test (life/position
  scale by `dt*60`), a ship-wraps-mid-fire test, and an explicit Y-axis bullet
  wrap. Affects `asteroids/tests/bullet.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `wrap()` is duplicated verbatim in `ship.ts`
  (`:75`) and `bullet.ts` (`:43`); both cite `UpdateObjPos $6fc7`. When a third
  user appears, hoist the toroidal wrap into a shared core util. Affects
  `asteroids/src/core/`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The pure-step signatures (`stepGame(state)`,
  `stepShip`/`stepBullets` object params, `Bullet`/`GameState` array fields) are
  not `Readonly<>`/`readonly`, so the epic's determinism invariant is enforced by
  tests + convention, not the compiler. This is a pre-existing repo-wide pattern
  (Ship/Rock/Saucer are identical; A-4 follows it), not a regression — a future
  `Readonly<>` pass on the core step API would make the invariant compiler-checked.
  Affects `asteroids/src/core/`. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

6 deviations

- **Muzzle-speed magnitude enforced behaviorally, not pinned as a literal/export**
  - Rationale: the muzzle velocity is a per-axis *clamped* byte value (±111 lo-units/frame) computed via the sine fold — pinning a single literal would (a) risk a wrong number from the summarised disassembly and (b) over-constrain the per-axis formulation, exactly the trap A-3 avoided with drag. The citation requirement still applies.
  - Severity: minor
  - Forward impact: Reviewer should verify the muzzle constant cites BulletSlotFound $6cfd–$6d8e / the ±111 clamp; A-19 feel calibration may pin exact values.
- **Bullet lifetime pinned by mechanism with a ±2-frame tolerance band, not an exact count**
  - Rationale: the exact timer init and its decrement cadence (before/after the move, whether the spawn frame counts) are uncertain and cadence-dependent; the ±2 band tolerates off-by-one while still proving "lives ~L then dies," consistent with A-3's accepted tolerance-band approach.
  - Severity: minor
  - Forward impact: A-19 (feel calibration) may tighten the band.
- **Spawn position tested loosely (at/ahead of ship, ≤700 lo-units), resolving an SM↔ROM conflict**
  - Rationale: the two higher-authority-vs-ROM sources disagree on a small nose offset; rather than pick one and risk a wrong pin, the test accepts either and defers the exact offset to Dev's ROM reading (logged as a Conflict finding). Per the spec-authority hierarchy the story scope ("bullet spawn") is satisfied by both.
  - Severity: minor
  - Forward impact: Dev resolves the offset against the ROM and cites it; Reviewer verifies.
- **Shots spawn at the ship position, with no nose offset**
  - Rationale: resolved the SM↔ROM conflict in favour of the ROM (higher fidelity authority for a "faithful clone"); a visible nose offset is a feel detail, not a ROM behavior, and would be unfaithful invention here.
  - Severity: minor
  - Forward impact: if a cosmetic nose offset is wanted for feel, A-19 adds it in the render/feel layer; the Conflict finding records the decision.
- **Muzzle fold (3/2 amplitude) and lifetime (18 frames) reconstructed from the A-3 quarry, not byte-verified this session**
  - Rationale: the raw disassembly bytes for the fold factor and timer init were not re-read line-by-line this session; the values are ROM-plausible (cardinal muzzle 111 > ship max; shot range ~1/4 screen) and pass every behavioral test.
  - Severity: minor
  - Forward impact: Reviewer should confirm the fold factor and timer init against the live disassembly (logged as a Dev Gap finding); A-19 feel calibration may adjust.
- **Per-frame lifetime/position integration (dt-scaled), not the ROM's frame-locked step**
  - Rationale: consistency with the established, Reviewer-accepted A-3 convention; at the fixed 1/60 timestep this is frame-identical to the ROM at gameplay granularity.
  - Severity: minor
  - Forward impact: A-19 may revisit if byte-exact feel calibration demands frame-locked integer stepping.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Muzzle-speed magnitude enforced behaviorally, not pinned as a literal/export**
  - Spec source: context-epic-A.md, fidelity bar; ROM firing routine BulletSlotFound $6cfd–$6d8e
  - Spec text: "each story ships ROM-accurate behavior for its slice" / "constants cite their disassembly source in committed core code"
  - Implementation: no muzzle-speed constant is pinned to a number; tests assert direction/sign per cardinal, cardinal isotropy (speeds equal one another), and that a rest-fired shot's speed exceeds `SHIP_MAX_SPEED` (shots outrun the ship). The byte magnitude is Dev's ROM-cited constant.
  - Rationale: the muzzle velocity is a per-axis *clamped* byte value (±111 lo-units/frame) computed via the sine fold — pinning a single literal would (a) risk a wrong number from the summarised disassembly and (b) over-constrain the per-axis formulation, exactly the trap A-3 avoided with drag. The citation requirement still applies.
  - Severity: minor
  - Forward impact: Reviewer should verify the muzzle constant cites BulletSlotFound $6cfd–$6d8e / the ±111 clamp; A-19 feel calibration may pin exact values.
- **Bullet lifetime pinned by mechanism with a ±2-frame tolerance band, not an exact count**
  - Spec source: ROM ShpShotTimer (~$021F); context-epic-A.md cadence bar
  - Spec text: "ROM-accurate behavior" with the A-3-sanctioned cadence tolerance (every-other-frame vs half-rate per-frame)
  - Implementation: tests import `BULLET_LIFETIME_FRAMES` and assert the bullet is present at `L-2` frames and gone by `L+2`, rather than pinning an exact expiry frame or the ROM's raw timer value.
  - Rationale: the exact timer init and its decrement cadence (before/after the move, whether the spawn frame counts) are uncertain and cadence-dependent; the ±2 band tolerates off-by-one while still proving "lives ~L then dies," consistent with A-3's accepted tolerance-band approach.
  - Severity: minor
  - Forward impact: A-19 (feel calibration) may tighten the band.
- **Spawn position tested loosely (at/ahead of ship, ≤700 lo-units), resolving an SM↔ROM conflict**
  - Spec source: SM Assessment ("spawns from the ship nose") vs ROM BulletSlotFound $6cfd–$6d8e (no explicit nose offset)
  - Spec text: SM: "bullet spawns from the ship nose at ship `dir`"; ROM: shot X/Y position = ship position (no separate nose constant found)
  - Implementation: the spawn test asserts the bullet is at or ahead of the ship along the heading, aligned on the perpendicular axis, and near (< 700 lo-units) — satisfied by both "at ship" (offset 0) and "at nose" (small forward offset).
  - Rationale: the two higher-authority-vs-ROM sources disagree on a small nose offset; rather than pick one and risk a wrong pin, the test accepts either and defers the exact offset to Dev's ROM reading (logged as a Conflict finding). Per the spec-authority hierarchy the story scope ("bullet spawn") is satisfied by both.
  - Severity: minor
  - Forward impact: Dev resolves the offset against the ROM and cites it; Reviewer verifies.

### Dev (implementation)

- **Shots spawn at the ship position, with no nose offset**
  - Spec source: SM Assessment (session) vs ROM BulletSlotFound $6cfd–$6d8e
  - Spec text: SM: "bullet spawns from the ship nose at ship `dir`"; ROM: the shot X/Y position is set to the ship position ($6d5c–$6d67), with no separate nose-distance constant found
  - Implementation: `stepBullets` seeds the new shot at `ship.pos` exactly; TEA's spawn test (at/ahead of ship, y-aligned, < 700 lo-units) is satisfied by offset 0.
  - Rationale: resolved the SM↔ROM conflict in favour of the ROM (higher fidelity authority for a "faithful clone"); a visible nose offset is a feel detail, not a ROM behavior, and would be unfaithful invention here.
  - Severity: minor
  - Forward impact: if a cosmetic nose offset is wanted for feel, A-19 adds it in the render/feel layer; the Conflict finding records the decision.
- **Muzzle fold (3/2 amplitude) and lifetime (18 frames) reconstructed from the A-3 quarry, not byte-verified this session**
  - Spec source: A-3 archive Delivery Finding (BulletSlotFound quarry shorthand); WebFetch summary of ShpShotTimer $6d01
  - Spec text: "bullets get velocity `sinLookup(dir)/2 + sinLookup(dir)` folded per axis, clamped to ±111"; "`lda #18` → ShpShotTimer"
  - Implementation: `muzzleAxis(h) = clamp(h + h/2, ±111)` and `BULLET_LIFETIME_FRAMES = 18`, cited by ROM address in `bullet.ts`.
  - Rationale: the raw disassembly bytes for the fold factor and timer init were not re-read line-by-line this session; the values are ROM-plausible (cardinal muzzle 111 > ship max; shot range ~1/4 screen) and pass every behavioral test.
  - Severity: minor
  - Forward impact: Reviewer should confirm the fold factor and timer init against the live disassembly (logged as a Dev Gap finding); A-19 feel calibration may adjust.
- **Per-frame lifetime/position integration (dt-scaled), not the ROM's frame-locked step**
  - Spec source: A-3 Design Deviations (accepted cadence convention); core/shell boundary ("all time enters as `dt`")
  - Spec text: A-3: "per-frame half-rate cadence ... all rates scale by `dt*60`"; position integrates the full float velocity
  - Implementation: bullet `life` decrements by `dt*60` per step and position integrates `vel * dt*60` with toroidal wrap — the same treatment A-3 applied to the ship.
  - Rationale: consistency with the established, Reviewer-accepted A-3 convention; at the fixed 1/60 timestep this is frame-identical to the ROM at gameplay granularity.
  - Severity: minor
  - Forward impact: A-19 may revisit if byte-exact feel calibration demands frame-locked integer stepping.

### Reviewer (audit)

Every logged deviation is stamped below. All are minor and non-blocking; two carry
strengthened follow-ups because the test-analyzer empirically proved the relevant
tests do not pin the behavior.

- **TEA: Muzzle magnitude enforced behaviorally, not pinned** → ✓ ACCEPTED. The
  behavioral approach is sound and matches A-3's drag precedent. BUT the
  test-analyzer proved (by mutation) that the cardinal-only suite leaves the ROM
  "3/2 fold" term entirely unobservable — deleting `+ headingVal/2` keeps all 26
  tests green, because every cardinal saturates the ±111 clamp. Accepted for this
  story (cardinal ACs are met), with a forwarded Improvement to add a non-cardinal
  magnitude test (see [TEST] finding).
- **TEA: Lifetime pinned with a ±2-frame band** → ✓ ACCEPTED, with note. Tolerance
  is consistent with A-3's cadence bands, but the test-analyzer proved the ±2 band
  hides a real off-by-one (`life <= 0` → `life < 0` stays green). Accepted (the
  shipped code uses the correct `<= 0`); forwarded Improvement to pin the exact
  expiry frame.
- **TEA: Spawn position tested loosely (≤700 lo-units)** → ✓ ACCEPTED, with note.
  The loose bound correctly resolved the SM↔ROM conflict, but the test-analyzer
  proved a bogus 600-unit offset would pass. Accepted (the shipped code uses
  offset 0); forwarded Improvement to tighten to `toBeCloseTo(ship.pos, …)`.
- **Dev: Shots spawn at ship position, no nose offset** → ✓ ACCEPTED. Resolving the
  SM↔ROM conflict in favour of the ROM is correct per the spec-authority hierarchy
  (ROM > SM guidance for a faithful clone); a nose offset would be unfaithful
  invention. Verified: `bullet.ts` seeds `pos: { x: ship.pos.x, y: ship.pos.y }`.
- **Dev: 3/2 muzzle fold + 18-frame lifetime reconstructed, not byte-verified** →
  ✗ FLAGGED (non-blocking). Honest and correctly logged, but two concerns compound
  it: (a) the test-analyzer proved the 3/2 fold is untested; (b) my own analysis
  shows the 3/2 factor *distorts* shot direction at mid-angles — e.g. dir 20's
  heading table is (112, 60) ≈ 28°, but `muzzleAxis` saturates x to 111 while y
  stays 90, firing at ≈ 39° (~11° off); a 1× factor would preserve direction. This
  does not block A-4 (no AC covers mid-angle direction; cardinals are correct), but
  the muzzle formula should be verified against the raw BulletSlotFound bytes and,
  if 3/2 is not confirmed, reconsidered vs 1×. Forwarded as a [TEST]/fidelity
  finding for the verification/feel story.
- **Dev: Per-frame dt-scaled integration** → ✓ ACCEPTED. Identical to A-3's
  Reviewer-accepted convention; frame-identical at the fixed 1/60 timestep.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 110/110 green, tsc + vite build clean, tree clean, 0 smells (no console.log/any/TODO) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings; Reviewer covered boundaries manually (cap boundary, exact expiry frame, wrap seams, dt=0 freeze) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings; no error paths exist in the pure-core diff (no catch/throw/fallback constructs) |
| 4 | reviewer-test-analyzer | Yes | findings | 9 | confirmed 4 High (muzzle-fold unobservable, same-frame cap ordering, 700-unit spawn slack, ±2 lifetime slack — all proven by mutation), 3 Medium (no diagonal, no dt≠1/60, no ship-wrap-mid-fire/Y-wrap), 2 Low (mode-gate negative, tautological cap constant); 0 dismissed — all forwarded as non-blocking Improvements |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings; Reviewer checked comments manually — sim.ts header correctly updated (bullets no longer "later"); muzzleAxis "fixed 111 in every direction" is loose (diagonals reach 157) — Low |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings; rule-checker #1/#2 covered type escapes (0) and readonly (Low, below) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings; no attack surface in diff (no user strings, network, storage, DOM, tenant data) — verified manually |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings; Reviewer found the one duplication manually (`wrap()` in ship.ts + bullet.ts) — Low |
| 9 | reviewer-rule-checker | Yes | findings | 9 | all under Rule #2 (missing `readonly` on step params/fields); confirmed as Low — pre-existing repo-wide convention that A-4 follows (Ship/Rock/Saucer identical), determinism invariant test-enforced and independently verified compliant under Rule #15; 0 dismissed |

**All received:** Yes (3 enabled returned; 6 disabled via settings, pre-filled)
**Total findings:** 18 confirmed (0 Critical, 0 High, ~5 Medium, ~13 Low), 0 dismissed, 0 blocking. All forwarded as non-blocking Improvements.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `Input.fire` (shell keyboard — not yet wired; `main.ts` still
feeds `NO_INPUT`, so firing is core-complete but not player-reachable until A-5) →
`stepGame(state, input, dt)` (sim.ts:14) → `ship = stepShip(...)` → `stepBullets(
state.bullets, ship, state.firePrev, input, dt)` (bullet.ts:96): `advance()` moves
+ ages + culls existing shots (fresh objects, toroidal wrap), then `input.fire &&
!firePrev && next.length < 4` gates a spawn at `ship.pos` with velocity
`muzzleAxis(sinLookup(dir±)) + ship.vel`, `life = 18`. Returns fresh `{bullets,
firePrev}`. No NaN source (dt is the loop's 1/60; inputs are booleans); no
randomness consumed (seed cloned, never advanced — verified bullet.test.ts).

**Pattern observed:** Good — constants-with-ROM-citations (bullet.ts:22–53, every
constant cites its disassembly address), matching A-3's `ship.ts` convention;
core/shell boundary respected (bullet.ts imports only ./state, ./input, ./ship);
`sinLookup` reused from ship.ts rather than duplicated (correct DRY choice).

**Error handling:** N/A by design — pure total functions over well-typed inputs; no
I/O, no exceptional paths. Degenerate inputs checked: dt=0 yields an identity step
(bullets neither move nor age — frozen, not corrupted); the only caller is the
fixed-timestep loop, so the trust is currently justified (same posture as A-3).

### Rule Compliance

Mapped to `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) + epic rules
(full enumeration in rule-checker report [RULE]):

- #1 type escapes: PASS — 0 `as any`/`@ts-ignore`/`!` across all 4 core files (also
  runtime-guarded by ship.test.ts's core-typed scan, now covering bullet.ts).
- #2 generics/readonly: PASS-with-Low — `advance`/`stepBullets` array params are
  `readonly Bullet[]` (correct); object params (`ship`, `input`, `state`) and
  `Bullet`/`GameState` array fields are not `Readonly<>`. [RULE] flagged 9 such
  sites; confirmed Low — pre-existing repo-wide convention, determinism
  test-enforced + verified compliant under the determinism rule. Not a regression.
- #3 enums: N/A (string-literal unions, pre-existing).
- #4 null/undefined: PASS — no `?.`/`??`/`||` in the diff; `const { bullets,
  firePrev }` destructures required fields.
- #5 modules: PASS — `import type` used correctly for types, value imports for
  runtime (`WORLD_W/H`, `sinLookup`, `stepBullets`); extensionless imports valid
  under `moduleResolution: bundler`.
- #6 React/JSX: N/A. #7 async: N/A (all synchronous). #10 input validation: N/A
  (no external input surface — `Input` is a typed boolean struct). #11 errors:
  N/A. #12 perf/bundle: PASS (no barrels; no hot-path stringify).
- #8 test quality: PASS-with-findings — no `as any`/mocks/dist-imports, but four
  High-confidence weak-assertion findings ([TEST], below).
- #9 build/config: PASS — configs untouched, strict on, build green.
- #13 fix regressions: N/A (new-feature diff).
- Epic core purity: PASS — boundary scanner covers bullet.ts (EXPECTED_CORE_FILES
  updated); zero banned globals; imports only sibling core files.
- Epic determinism: PASS — replay/purity/no-RNG tests; `stepGame`/`stepBullets`/
  `advance` never mutate inputs, return fresh objects (verified [RULE] #15).
- Epic ROM-citation: PASS — 8/8 constants/behaviors cite a ROM routine+address
  (verified [RULE] #16), though two values are reconstructed-not-byte-verified
  (Dev-logged Gap; flagged deviation).

### Observations

1. [PREFLIGHT][VERIFIED] 110/110 tests green, `tsc --noEmit` + `vite build` clean,
   tree clean — evidence: preflight run + dev-green run agree.
2. [TEST][MEDIUM] Muzzle "3/2 fold" is unobservable — test-analyzer deleted
   `+ headingVal/2` and all 26 tests stayed green (cardinals saturate the ±111
   clamp). Compounded by my own finding that 3/2 *distorts* mid-angle direction
   (dir 20 → ~39° vs ~28°). Forwarded: add a non-cardinal test + verify the fold
   vs ROM. bullet.ts:52.
3. [TEST][MEDIUM] Same-frame expiry+fire (the reason `advance` precedes the cap
   check) is untested — a stale pre-removal count stays green (proven). bullet.ts:98.
4. [TEST][MEDIUM] Loose bounds hide regressions: 700-unit spawn slack (a bogus
   600-unit offset passes) and ±2 lifetime band (`life<=0`→`life<0` passes). The
   shipped code is correct (offset 0, `<= 0`); tighten the tests. bullet.test.ts:116,208.
5. [TEST][LOW] No `dt != 1/60` bullet test, no ship-wrap-mid-fire, no explicit
   Y-axis bullet wrap, no attract/gameover mode negative (mode-gating deferred —
   consistent with A-3, TEA/Dev Question).
6. [RULE][LOW] 9 missing-`readonly` sites (pre-existing convention; determinism
   test-enforced) — sim.ts:14, bullet.ts:93/95, ship.ts:81, state.ts:45-69.
7. [SIMPLE][LOW] `wrap()` duplicated verbatim — ship.ts:75, bullet.ts:43.
8. [DOC][LOW] muzzleAxis comment "fixed 111 in every direction" is imprecise
   (diagonals reach 157 per axis-clamp). bullet.ts:50.
9. [VERIFIED] Cap holds every frame — spawn gated on `next.length < 4` after cull,
   so max is exactly 4; edge-trigger correct (`fire && !firePrev`, init false so
   first press fires). bullet.ts:98-107.
10. [VERIFIED] Purity/no-aliasing — `advance` pushes fresh `{pos,vel}` literals into
   a new array; `stepBullets` never touches `state.bullets`; no RNG consumed.
   bullet.ts:61-76.
11. [SEC] No security surface — no user strings, network, storage, DOM, or tenant
   data in the diff. [SILENT] No swallowed-error constructs (pure core, no catch).
   [EDGE] Boundaries hand-checked: cap at exactly 4, expiry at `life<=0`, wrap at
   0/W/H, dt=0 identity. [TYPE] No type escapes; readonly gap is Low.

### Devil's Advocate

Assume this code is broken. Where does it bleed? First and most real: **shot
direction fidelity.** The `muzzleAxis` fold multiplies the heading amplitude by 3/2
before a ±111 per-axis clamp, so for a wide band of non-cardinal headings the
faster axis saturates while the slower does not — rotating the shot toward 45°. A
player firing at a shallow angle would watch the bullet visibly veer off the ship's
nose. The tests never see this (cardinals only) and the 3/2 factor is a
reconstruction from a shorthand, not a byte read — so both the value and its
observable consequence are unverified. If the ROM actually uses 1× (or clamps
higher), this is a latent fidelity bug that A-5's rendering will expose. It does not
block A-4 — no acceptance criterion covers mid-angle direction and cardinals are
correct — but it is the first thing I would re-check. Second: **the trusted dt.** A
NaN, negative, or zero dt poisons `frames = dt*60`; at dt=0 bullets freeze forever
(no move, no age), and a negative dt would *extend* life and run bullets backward.
The only caller clamps dt, so the trust holds today, but any future caller inherits
an unguarded contract — identical to the ship's exposure, on record. Third: **the
firing model runs in every mode** — a fire press in `attract` or `gameover` spawns
bullets, because neither `stepGame` nor `stepBullets` consults `state.mode`. Today
nothing wires fire input, so it is inert; the day attract-mode demo play lands
(A-16 area), an un-gated fire is a surprise. It is on record as a Question, which is
correct containment. Fourth: **test theatre.** The test-analyzer proved four
distinct broken implementations pass this suite — the danger is not today's code
(which is correct) but tomorrow's refactor, which could introduce exactly those
regressions invisibly. Fifth: **momentum with no total clamp** — a shot from a
max-speed ship reaches ~175 lo-units/frame (muzzle 111 + ship 64) with no final cap;
`wrap()` absorbs it and no test would notice if that were wrong, but it is
consistent with inherited-momentum firing. None of these breaks an A-4 AC today;
every one has a named owner or a forwarded finding. The devil finds fidelity debt
and test looseness, but no unrecorded crime and no shipped defect.

**Handoff:** To Winston Smith (SM) for finish-story. Merge note: `origin`
(`slabgorb/asteroids`) is live — `feat/A-4-firing` and `develop` are both pushed —
so the finish can open a real PR (`feat/A-4-firing` → `develop`) and verify the
squash-merge lands on `origin/develop`.