---
story_id: "9-4"
jira_key: "9-4"
epic: "9"
workflow: "tdd"
---
# Story 9-4: Strafe-and-fire: TIE fireball cadence/source driven by the pass, per the RE'd timing

## Story Details
- **ID:** 9-4
- **Jira Key:** 9-4
- **Workflow:** tdd
- **Stack Parent:** 9-1 (RE spike complete — timing model available at star-wars/docs/tie-flight-ai-model.md)

## Acceptance Criteria

1. **Cadence driven by pass:** Enemy fireballs are spawned at the timing specified in the RE'd TIE flight-AI model (`tie_fire_trigger_frame` per pass phase), not at a whole-formation fixed interval.
2. **Fireball origin:** Fireball origin position is computed per the RE'd timing (TIE position during the trigger frame), not a fixed origin.
3. **Aim at cockpit:** Fireballs are aimed at the cockpit (player ship center + vertical offset) during the strafe window per the RE'd model.
4. **Per-TIE independence:** Each TIE fires independently during its strafe window; no global formation logic suppresses individual fire.

## Technical Approach

### Source Materials
- RE'd TIE flight-AI model: `star-wars/docs/tie-flight-ai-model.md` (gate-recovered; notes the strafe window and `tie_fire_trigger_frame` offset)
- TIE flight model: `src/core/sim.ts` (ported in 9-2/9-3, governs TIE position + pass timing)
- State shape: `src/core/state.ts` (track enemy fireballs per TIE, not per formation)

### Implementation Steps
1. Parse the RE'd timing model to extract `tie_fire_trigger_frame` and strafe window boundaries for each formation pass phase.
2. Refactor enemy fireball state from a global formation-wide cadence to a per-TIE fire-trigger system.
3. In the sim update loop: for each alive TIE, check if the current frame matches its assigned fire trigger within the strafe window.
4. When triggered, spawn a fireball at the TIE's current position, aimed at the cockpit (center + y-offset).
5. Replace the old fixed-interval lob logic entirely.
6. Unit tests cover: TIE fire frame timing matches RE model, fireball origin tracks TIE position, aiming vector points to cockpit during strafe.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T15:43:47Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T15:09:27.476334Z | 2026-06-29T15:10:51Z | 1m 23s |
| red | 2026-06-29T15:10:51Z | 2026-06-29T15:22:42Z | 11m 51s |
| green | 2026-06-29T15:22:42Z | 2026-06-29T15:34:43Z | 12m 1s |
| review | 2026-06-29T15:34:43Z | 2026-06-29T15:43:47Z | 9m 4s |
| finish | 2026-06-29T15:43:47Z | - | - |

## Delivery Findings

No upstream findings.

### TEA (test design)
- **Conflict** (non-blocking): session AC#3 says fireballs aim at "player ship center + vertical offset",
  but the sim models the ship at the origin `[0,0,0]` with no offset entity, and the RE'd launch vector is
  `TIE − ship` (no offset, model §6). Affects `src/core/sim.ts` (the enemy-fire aim) — Dev should aim at the
  cockpit origin (as the existing space-combat aim contract already requires); the "+ vertical offset" gloss
  has nothing to attach to in the current state shape. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the per-TIE cadence uses a fixed cooldown (`waveParams().enemyFireInterval`),
  not the RE'd §8 fire table (cadence-mask + PRNG threshold + per-wave concurrency cap). Affects
  `src/core/sim.ts` (enemy fire) + `src/core/gameRules.ts` (`waveParams`) — story 9-5 (difficulty ramp) is the
  natural home for porting the two-axis fire table; the new per-TIE `fireCooldown` clock is the seam it plugs
  into. *Found by Dev during implementation.*

### Reviewer (code review)
- No upstream findings. (The 9-5 forward pointer is already captured by Dev above; the one LOW style note —
  side-effecting `.map` — is in-scope for this story, not upstream, and recorded in the Reviewer Assessment.)

## Design Deviations

None yet.

### TEA (test design)
- **Aim at the cockpit origin, no vertical offset**
  - Spec source: .session/9-4-session.md, AC#3 (highest authority per spec-authority hierarchy)
  - Spec text: "Fireballs are aimed at the cockpit (player ship center + vertical offset)"
  - Implementation: tests assert the fireball velocity points at the origin `[0,0,0]` (`dot(vel, −pos) > 0`), no offset
  - Rationale: the ship is modelled at the origin; there is no "ship center + offset" entity in the sim, the RE
    launch vector is `TIE − ship` (no offset, §6), and the existing space-combat aim test already asserts origin-aim
  - Severity: minor
  - Forward impact: none — Dev keeps origin aim; story 8-18 shoot-down and the 8-3 aim contract stay intact
- **Strafe-window near edge anchored to the existing TIE_NEAR_BOUND constant**
  - Spec source: context-story-9-4.md, AC2 / model §6 ("range > $800 — not too close")
  - Spec text: "Fire timing/cadence matches the RE'd values (or documented fallback)"
  - Implementation: the "too close" gate is tested at range ≈ 0.4·TIE_NEAR_BOUND (well inside the pass-end near
    edge) rather than pinning the RE `$800` threshold; no new range constant is forced on Dev
  - Rationale: `$4000 = 1.0` fixed-point maps fuzzily to our un-normalised world, and the AC explicitly permits a
    "documented fallback"; reusing TIE_NEAR_BOUND keeps the near edge single-sourced and gives Dev slack
  - Severity: minor
  - Forward impact: Dev may introduce a dedicated strafe-window constant; the tests do not require it
- **"In firing arc" gate mapped onto the existing peel latch**
  - Spec source: context-story-9-4.md, AC1 / model §6 gate #1 ("in firing arc" — marked INFERRED in the model)
  - Spec text: "Fireballs originate from a TIE during its strafe/pass window"
  - Implementation: a TIE with `peeling = true` (pass complete, facing outward) must originate no fire
  - Rationale: our clone has no separate arc flag; the §6 "in arc" gate is INFERRED, and the peel latch already
    marks "pass over / facing outward" — the natural analogue for the gate
  - Severity: minor
  - Forward impact: Dev gates fire on `!peeling` (and the range gate), consistent with the §6 arc+range gates

### Dev (implementation)
- **Squad clock kept as a per-TIE seed, not deleted**
  - Spec source: .session/9-4-session.md, TEA Assessment "Guidance to Yoda"
  - Spec text: "Fully remove the whole-formation timer from the space branch; do not leave it as a silent fallback"
  - Implementation: `GameState.enemyFireCooldown` is no longer a fire GATE in the space branch — each TIE fires on
    its own `Enemy.fireCooldown`. The squad clock is repurposed: it SEEDS a fighter's first per-TIE cooldown the
    first time the fighter is seen (`e.fireCooldown ?? state.enemyFireCooldown`) and keeps ticking for the surface phase
  - Rationale: three existing suites (`combat-kill-loop` parks it at 999, `tie-peel-away` at 1e9, `targeting` at 999)
    suppress enemy fire by parking the squad clock; seeding per-TIE cooldowns from it preserves that contract exactly,
    and `events.test.ts` sets it to 0 to *trigger* fire. Deleting the field would break those tests and the surface
    turret fire, which still runs on the formation timer (`stepSurface`, unchanged)
  - Severity: minor
  - Forward impact: none — fire is genuinely per-TIE and pass-gated as the story requires; the field's only roles now
    are seeding new fighters and pacing surface turrets
- **Per-TIE cadence is a fixed interval, not the RE'd frame-mask + PRNG**
  - Spec source: context-story-9-4.md, AC2 / model §6, §8
  - Spec text: "Fire timing/cadence matches the RE'd values (or documented fallback)"
  - Implementation: per-TIE fire fires when its cooldown reaches 0 and resets to `waveParams().enemyFireInterval`;
    no PRNG probability roll or per-wave frame-mask
  - Rationale: AC2 explicitly permits a documented fallback; the §8 fire table is indexed by ROM frame-ticks not yet
    pinned to our `dt` (model §5.3 caveat), and `enemyFireInterval` is the existing single-sourced clone cadence. A
    PRNG roll would add randomness without a pinned cadence and is required by no test
  - Severity: minor
  - Forward impact: story 9-5 may replace the scalar `enemyFireInterval` with the two-axis §8 fire table
    (cadence-mask + PRNG + concurrency); the per-TIE `fireCooldown` clock is the seam for it (see Delivery Findings)

### Reviewer (audit)
All five logged deviations were reviewed against the spec hierarchy and the code:
- **TEA — Aim at the cockpit origin, no vertical offset** → ✓ ACCEPTED by Reviewer: matches RE §6 (launch =
  TIE − ship, ship at origin) and the pre-existing space-combat aim contract; the session "+ vertical offset"
  gloss has no entity to attach to in the sim. Code confirms origin aim (`scale(toCockpit(e.pos), …)`).
- **TEA — Strafe-window near edge anchored to TIE_NEAR_BOUND** → ✓ ACCEPTED by Reviewer: AC2 explicitly permits a
  documented fallback; reusing the single-sourced pass-end constant beats inventing a new range. No magic number.
- **TEA — "In firing arc" gate mapped onto the peel latch** → ✓ ACCEPTED by Reviewer: the §6 in-arc flag is
  INFERRED and the clone has no arc flag; `!e.peeling` is the faithful analogue (verified at sim.ts fire gate).
- **Dev — Squad clock kept as a per-TIE seed, not deleted** → ✓ ACCEPTED by Reviewer: a sounder call than literal
  deletion — it preserves the parked-cooldown suppression that `combat-kill-loop`/`tie-peel-away`/`targeting`
  rely on AND the surface turret timer, while fire is genuinely per-TIE. rule-checker rule 13 confirmed no
  surface-phase regression (clock floors; `enterPhase` resets to `ENEMY_FIRE_INTERVAL`).
- **Dev — Fixed-interval cadence, not the §8 frame-mask + PRNG** → ✓ ACCEPTED by Reviewer: AC2 allows a documented
  fallback; the §8 table is unpinned to our `dt` (model §5.3); cleanly deferred to 9-5 with a delivery finding
  pointing at the `fireCooldown` seam. No undocumented deviations found.

## Sm Assessment

I have anticipated this engagement. The pieces are in place for a clean strike.

**Readiness:** Setup is complete — session file written, branch `feat/9-4-strafe-and-fire`
cut from `develop` per repos.yaml, merge gate clear (no blocking PRs in star-wars).

**Dependency posture:** 9-1 (RE spike) is DONE; the timing model lives at
`star-wars/docs/tie-flight-ai-model.md`. The TIE flight model it feeds was ported in
9-2/9-3 into `src/core/sim.ts` + `src/core/state.ts`. So this story has both its timing
source and its host code already on the field — no upstream blockers.

**Nature of the work:** This is a 2-pt behavioral replacement, not new subsystem work.
We are swapping a whole-formation fixed-interval lob for per-TIE, strafe-window-driven
fire whose origin tracks the firing TIE and whose aim points at the cockpit. The risk is
not difficulty but *fidelity* — the cadence/origin/aim must match the RE'd model, and the
old global cadence must be fully removed (not left as a fallback that silently re-fires).

**Why TDD:** The four ACs are all observable, deterministic predicates (fire frame, origin
position, aim vector, per-TIE independence). That is exactly what RED-phase failing tests
should pin down before Yoda touches the sim. Han Solo: author tests that read the RE'd
`tie_fire_trigger_frame` / strafe-window values from `docs/tie-flight-ai-model.md` and
assert against them — do not hardcode magic frame numbers divorced from the model.

**Watch for:** STRETCH scope. Keep it to cadence + origin + aim + per-TIE independence.
Do not expand into new fireball *visuals* or difficulty tuning — those are not in the ACs.

Handing off to Han Solo (TEA) for the RED phase.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Behavioural replacement of enemy fire — all four ACs are observable, deterministic
predicates on `stepGame`, exactly what TDD should pin before Dev touches the sim.

The Admiral was right about the shape of the target. The thing to break is `sim.ts` lines ~146–157:
a single global `enemyFireCooldown` that, when it ticks, fires **one uniformly-random TIE** — any
TIE, regardless of where it is in its pass — then parks the whole formation for `enemyFireInterval`.
The cabinet does the opposite (`docs/tie-flight-ai-model.md` §6): each fighter fires independently
while it is **in its strafe/pass window** (in-arc AND beyond the near edge — "not too close").

**Test Files:**
- `tests/core/tie-strafe-fire.test.ts` — 8 tests. Fixture idioms mirror `tie-peel-away.test.ts`
  (`tieToward`, a `fireReady` state with the spawner parked and the fire clock ready). No magic frame
  numbers: everything is expressed against named constants (`ENEMY_FIRE_INTERVAL`, `TIE_NEAR_BOUND`,
  `MAX_FIREBALL_SLOTS`, `FIREBALL_SCORE`) so the suite stays correct whatever cadence Dev ports.

**Tests Written:** 8 tests covering 4 ACs
**Status:** RED (verified by Chewbacca / testing-runner)

| # | Test | AC | Result |
|---|------|----|--------|
| 1 | multiple in-window TIEs out-fire the single formation timer (≥3 in a 2-interval window; old model caps at 2) | AC1 | **RED** (`2 ≥ 3` fails) |
| 2 | a peeled-away fighter (pass complete, out of arc) never originates fire | AC1 | **RED** (old timer fires it) |
| 3 | a fighter bored past the strafe window (too close, range ≈ 0.4·near-bound) never fires | AC1/AC2 | **RED** (old timer fires it) |
| 4 | per-TIE fire still respects the 6-fireball slot cap | AC2 | guard (green) |
| 5 | a fireball launches from a firing TIE's position, aimed at the cockpit | AC1/AC3 | guard (green) |
| 6 | replays enemy fire bit-identically from a fixed seed (deterministic & pure) | AC4 | guard (green) |
| 7 | a player bolt still shoots a fireball out of the air (story 8-18 intact) | AC3 | guard (green) |
| 8 | firing does not mutate the input `enemyShots` array in place | AC4 | guard (green) |

The 3 RED tests are the story; the 5 guards lock the contract we must not regress (slot cap, shoot-down,
determinism, purity, source/aim). Full suite: **355/358 pass, the 3 failures are the intended RED, no
compile errors, no pre-existing regressions** (26 other files green).

### Rule Coverage

| Rule (lang-review/typescript.md) | Test(s) | Status |
|---|---|---|
| #4 null/undefined — `??` vs `||` on falsy-but-valid (`bank = 0`, `peeling = false`) | #2 (peeling latch), #3 (dead-centre bank 0) | failing |
| #8 test quality — every test has a meaningful, non-vacuous assertion | self-check (Phase C) — all 8 reviewed | pass |
| #1 type-safety escapes — no `as any` in fixtures/assertions | whole suite (typed `Enemy`/`Vec3`/`Mat4` literals) | pass |
| Core purity / determinism (star-wars CLAUDE.md hard boundary — no time but `dt`, no RNG but seed) | #6 (seed replay), #8 (no in-place mutation) | guard |

**Rules checked:** 4 of the applicable TS lang-review checks have explicit coverage (the rest — React/JSX,
async/promises, build-config, input-validation — do not apply to a pure deterministic sim change).
**Self-check:** 0 vacuous tests found (no `let _ =`, no `assert(true)`, no `is_none`-on-always-None;
every assertion would fail if the behaviour were wrong).

**Guidance to Yoda (Dev):**
- Gate space-phase fire per fighter: fire only while a TIE is **making its pass** — `!peeling` AND
  `range > TIE_NEAR_BOUND` (the pass-end near edge) — not on the global `enemyFireCooldown`.
- **Fully remove** the whole-formation timer from the space branch; do not leave it as a silent fallback
  (the Admiral's warning). Note `enemyFireCooldown` **must stay on `GameState`** — `stepSurface` (turrets)
  still uses it; only the space branch changes.
- Keep aim at the cockpit **origin** (no vertical offset — see the deviation + delivery finding).
- Keep determinism: all randomness through `state.rng`; respect `MAX_FIREBALL_SLOTS`.

**Handoff:** To Yoda (Dev) for the GREEN phase.

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 358/358 passing (GREEN) — all 8 strafe-fire tests green (the 3 RED now pass), zero regressions across
the 27 files. `tsc --noEmit` + `vite build` clean.
**Branch:** `feat/9-4-strafe-and-fire` (pushed to origin)

Made the tests green I have. The whole-formation lob — one random TIE per shared timer — gone it is. In its
place: each fighter fires on its own clock while it strafes its pass.

**Files Changed:**
- `src/core/sim.ts` — replaced the single-`enemyFireCooldown` / `nextInt`-random-shooter block with a per-TIE
  `.map` over the moved fighters: a TIE fires when it is **in its pass window** (`!peeling && range > TIE_NEAR_BOUND`)
  AND its own `fireCooldown ≤ 0` AND a fireball slot is free. The bolt launches from the firing TIE's own position,
  aimed at the cockpit origin (`toCockpit`). No RNG draws the shooter anymore — fire is a pure function of each
  fighter's pass. The squad `enemyFireCooldown` is kept ticking (floored at 0) only to seed new fighters and pace
  the surface phase.
- `src/core/state.ts` — added optional `Enemy.fireCooldown` (per-TIE fire cadence countdown), documented.

**How each AC is met:**
- **AC1 (per-TIE, not a formation timer):** each TIE owns its `fireCooldown`; several in-window fighters fire within
  one interval (test #1), peeled-away and too-close fighters never originate fire (tests #2, #3).
- **AC2 (cadence + 6-slot cap):** per-TIE cadence = `waveParams().enemyFireInterval` (the documented fallback — see
  deviation); the cap is enforced per shot so concurrent strafers never exceed `MAX_FIREBALL_SLOTS` (test #4).
- **AC3 (8-18 intact):** the player-bolt-vs-fireball shoot-down path is untouched (test #7, plus the whole
  `shootable-fireballs` suite green).
- **AC4 (deterministic & unit-tested):** no RNG in the fire decision; identical seed replays bit-identically
  (test #6), no input mutation (test #8), full suite green.

**Self-Review:**
- [x] Wired into the live sim path (`stepGame` space branch) — the shell renders `enemyShots` unchanged.
- [x] Follows project patterns — pure core, no DOM/time/RNG beyond `dt` + `state.rng`; constants single-sourced.
- [x] All ACs met (table above).
- [x] No error handling needed (pure deterministic sim; no IO, no fallible ops).
- [x] Working tree clean, on the correct branch, no debug code.

**The key compatibility insight:** three suites suppress enemy fire by parking the squad clock high
(`combat-kill-loop` 999, `tie-peel-away` 1e9, `targeting` 999) and `events.test.ts` sets it to 0 to *trigger*
fire. Seeding each fighter's first `fireCooldown` from that squad clock preserved every one of those contracts
while still making fire genuinely per-TIE — which is why the 355 pre-existing tests stayed green.

**Handoff:** To Obi-Wan Kenobi (Reviewer) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (358/358 green, tsc+vite clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — Reviewer covered edges directly |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — Reviewer covered (pure sim, no error paths) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — Reviewer + rule-checker covered test quality |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — Reviewer covered comments directly |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — Reviewer + rule-checker covered types |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — Reviewer covered (no inputs/secrets/auth) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — Reviewer covered (1 LOW noted) |
| 9 | reviewer-rule-checker | Yes | clean | none (17 rules, 31 instances, 0 violations) | N/A |

**All received:** Yes (2 enabled subagents returned clean; 7 disabled via `workflow.reviewer_subagents` and covered by Reviewer directly)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred from subagents. Reviewer adds 2 LOW observations of his own (below).

## Reviewer Assessment

**Verdict:** APPROVED

This is a clean, tightly-scoped change, and I went looking hard for the flaw. The diff replaces a
whole-formation random-shooter lob with per-TIE pass-gated fire. Both enabled specialists came back clean and
their findings match my own patient read of the code.

### Observations (≥5)

- `[VERIFIED]` **The `??`-not-`||` falsy-but-valid trap is handled correctly** — `sim.ts` fire gate:
  `(e.fireCooldown ?? state.enemyFireCooldown) - dt`. `fireCooldown` is legitimately `0` for a ready TIE; `??`
  preserves it (→ fires now), whereas `||` would bump it to the squad clock and suppress a ready fighter. Both my
  trace and `[RULE]` rule-checker (rule 4 + A2) confirm the correct operator. Evidence: the gate fires the
  `tieToward` fixtures (whose `fireCooldown` is `undefined` → inherits the fixture's `enemyFireCooldown: 0`).
- `[VERIFIED]` **Purity / no input mutation** — `state.enemies` flows through `.map().filter()` (new arrays),
  the spawn `.push` hits only the local `movedEnemies`, fire pushes only to the local `enemyShots`
  (a fresh `advance()` array), and `state.rng` is cloned at `sim.ts:96`. `[RULE]` rule-checker A3 traced all five
  sinks and test #8 (`s.enemyShots === before`) proves it at runtime. No `Date.now`/`Math.random`/DOM — the
  sacred core boundary holds. The change is *more* deterministic than before (the random shooter draw is gone).
- `[VERIFIED]` **6-fireball slot cap holds under concurrent strafers** — `enemyShots.length < MAX_FIREBALL_SLOTS`
  is re-checked before every push inside the `.map`, so as the array grows mid-iteration the cap is never
  exceeded. Test #4 loops 120 frames with 3 strafers asserting `≤ MAX_FIREBALL_SLOTS` each frame. `[EDGE]`
  boundary verified.
- `[VERIFIED]` **Surface phase untouched** — the per-TIE block lives only in the space branch; `stepSurface`
  returns early (`sim.ts:124`) and still runs its formation turret timer on `enemyFireCooldown`, which the space
  step floors at 0 and `enterPhase` resets to `ENEMY_FIRE_INTERVAL` on transition. `[RULE]` rule-checker rule 13
  independently confirmed no surface regression.
- `[LOW]` `[SIMPLE]` **Side-effecting `.map` callback** — `enemies = movedEnemies.map(...)` pushes to
  `enemyShots`/`events` as a side effect while computing the new enemy array. It is deterministic and order-stable
  (and near the cap the lower-indexed fighters win the last slot — a harmless, deterministic priority), but a
  `forEach`/explicit loop would state the dual purpose (update fireCooldown *and* emit fire) more plainly. Not
  blocking — a style nit.
- `[LOW]` `[EDGE]` **A freshly spawned TIE can fire on its spawn frame** once the squad clock has floored to 0
  (every new TIE then inherits cooldown 0). Mildly aggressive gameplay, but within AC2's documented-fallback
  latitude and covered by the green suite. Not a correctness issue.
- `[VERIFIED]` `[DOC]` **Comments are accurate and the test header convention is intact** — the new `sim.ts`
  block comment and the `state.ts` `fireCooldown` doc match the behaviour. The test file header still reads
  "RED phase / EXPECTED TO FAIL", but that is the *established project convention* — the merged
  `tie-peel-away.test.ts` header does exactly the same — so it is not stale-by-this-codebase's-standard.
- `[VERIFIED]` `[TYPE]` **Type design sound** — `fireCooldown?: number` is a plain optional primitive consistent
  with the sibling `peeling?` / `bank?` optionals; `[...e.pos] as Vec3` recovers tuple arity from a spread
  (`Vec3 = readonly [number,number,number]`) and matches the pre-existing pattern at `sim.ts:189/209`. No
  `as any`, no unsafe casts.
- `[VERIFIED]` `[SEC]` **No security surface** — pure deterministic sim: no user input, no I/O, no secrets, no
  auth, no deserialization, no tenant data. `[SILENT]` no swallowed errors (there are no error paths — no
  try/catch, no fallible ops).
- `[VERIFIED]` `[TEST]` **Test quality is high** — meaningful thresholds (≥3 tied to 3 in-window TIEs, ≤6 cap,
  deep-equal determinism, reference-equality immutability), source (not `dist/`) imports, no mocks, no `as any`,
  no vacuous assertions. The `shot!` non-null assertions are guarded by a preceding `expect(shot).toBeDefined()`.

### Rule Compliance

Rubric: the TypeScript lang-review checklist (`.pennyfarthing/gates/lang-review/typescript.md`) + the star-wars
CLAUDE.md hard core boundary. (No SOUL.md / `.claude/rules/` in this repo.)

| Rule | Applies? | Enumerated instances | Verdict |
|------|----------|----------------------|---------|
| #1 Type-safety escapes | Yes | `[...e.pos] as Vec3` ×2 (sim), `shot!` ×2 (test) | COMPLIANT — tuple-arity recovery / guarded narrowing, no `as any` |
| #2 Generic/interface pitfalls | Yes | `fireCooldown?: number`, the `(e: Enemy) => Enemy` map | COMPLIANT — primitive optional, no `Record<string,any>`/`Function` |
| #3 Enum anti-patterns | No | none (string unions only) | N/A |
| #4 Null/undefined (`??` vs `||`) | Yes | `fireCooldown ?? …`, `!e.peeling` | COMPLIANT — correct `??` on falsy-but-valid `0`; `undefined→false` latch |
| #5 Module/declaration | Yes | `fireCooldown` on already-exported `Enemy`; no new imports | COMPLIANT |
| #6 React/JSX | No | no `.tsx` | N/A |
| #7 Async/Promise | No | no async | N/A |
| #8 Test quality | Yes | 8 tests | COMPLIANT — meaningful, source imports, no mocks/`as any` |
| #9 Build/config | No | no config changes | N/A |
| #10 Input validation | No | no external input | N/A |
| #11 Error handling | No | no error paths | N/A |
| #12 Performance | Yes | `.map` over ≤ WAVE_SIZE(3) enemies | COMPLIANT — O(N≤3) |
| #13 Fix-introduced regressions | Yes | surface clock, RNG stream, stale fireCooldown leak | COMPLIANT — surface reset by `enterPhase`; no leak |
| CORE A1 Purity boundary | Yes | whole fire block | COMPLIANT — no DOM/time/RNG beyond `dt`/`state.rng` |
| CORE A3 No input mutation | Yes | enemies, enemyShots, rng | COMPLIANT — all new arrays / cloned rng |
| CORE A4 Single-sourced constants | Yes | all identifiers from state.ts; only literal is the `0` floor | COMPLIANT |

### Devil's Advocate

Let me argue this code is broken. The fire decision now lives *inside* a `.map` that mutates `enemyShots` as a
side effect — surely an order-dependent landmine? If two fighters are eligible and only one slot remains, the
outcome depends on array order. But array order here is deterministic (spawn order, stable through `.map`), and
the cap is a hard `< MAX_FIREBALL_SLOTS` re-checked per push, so "lower index wins the last slot" is a stable,
reproducible rule — not a bug. Next: the squad clock. I deleted nothing but *repurposed* it — could a parked
clock fail to suppress fire? A fixture sets `enemyFireCooldown: 1e9`; every fighter with no `fireCooldown`
inherits `1e9`, decrements by `dt` each frame, and never reaches `≤ 0` within any test horizon — `combat-kill-loop`,
`tie-peel-away`, and `targeting` stay green, proving suppression survives. Could a stale per-TIE `fireCooldown`
leak across phases and make a surface turret misfire? No — `enterPhase` wipes `enemies: []` on every transition,
so no Enemy carries a cooldown into surface/trench, and surface fire uses the squad clock which `enterPhase`
resets. What about an confused player or a stressed engine? There is no I/O, no parsing, no allocation cliff
(N ≤ 3), no async, no NaN source (no division; `dt` only subtracts). The nastiest real risk was a `||`/`??`
inversion silently delaying every ready fighter by a full interval — and the code uses `??`, confirmed by trace
and by the rule-checker. The one thing I *can* hold against it is taste: a side-effecting `.map` reads less
plainly than a loop, and a freshly spawned fighter can shoot on frame one. Neither is a defect. I tried to break
it and could not. My bad feeling has passed.

**Data flow traced:** a TIE's `pos` (sim state) → `inPassWindow` gate (`!peeling && |pos| > TIE_NEAR_BOUND`) →
on fire, `enemyShots.push({pos: [...e.pos], vel: scale(toCockpit(e.pos), ENEMY_SHOT_SPEED)})` → rendered by the
shell unchanged → collision pass damages the cockpit. Safe: the origin is copied (`[...e.pos]`, no aliasing) and
the aim is the cockpit at the origin.
**Pattern observed:** per-TIE state carried on the `Enemy` record (mirrors `peeling?`/`bank?`), gated on the
existing peel latch — consistent with the 9-2/9-3 flight model at `src/core/sim.ts` and `src/core/state.ts`.
**Error handling:** none required — pure deterministic sim, no fallible operations or external inputs.

Subagent coverage tags present: `[EDGE]` `[SILENT]` `[TEST]` `[DOC]` `[TYPE]` `[SEC]` `[SIMPLE]` `[RULE]`
(preflight + rule-checker ran; the other six domains were covered by Reviewer directly, as those subagents are
disabled via settings).

**Handoff:** To Grand Admiral Thrawn (SM) for finish-story.