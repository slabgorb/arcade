---
story_id: "rb4-8"
jira_key: "rb4-8"
epic: "rb4"
workflow: "tdd"
---
# Story rb4-8: THE MOUNTAINS — placement is AUTHORED, they scroll laterally, and 'on horizon' is a latched bit

## Story Details
- **ID:** rb4-8
- **Jira Key:** rb4-8
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-18T10:50:33Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T09:00:58Z | 2026-07-18T09:03:39Z | 2m 41s |
| red | 2026-07-18T09:03:39Z | 2026-07-18T09:40:10Z | 36m 31s |
| green | 2026-07-18T09:40:10Z | 2026-07-18T10:10:42Z | 30m 32s |
| review | 2026-07-18T10:10:42Z | 2026-07-18T10:26:12Z | 15m 30s |
| red | 2026-07-18T10:26:12Z | 2026-07-18T10:35:59Z | 9m 47s |
| green | 2026-07-18T10:35:59Z | 2026-07-18T10:37:37Z | 1m 38s |
| review | 2026-07-18T10:37:37Z | 2026-07-18T10:50:33Z | 12m 56s |
| finish | 2026-07-18T10:50:33Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): the ROM re-seats a FALLING mountain's X from the accumulated PF
  scroll centre PFXSCR (`LDY PFXSCR / JSR D.COMP / STA PFOBJ`, RBARON.MAC:3403-3409), not from
  its authored lane; rb4-8 does not model PFXSCR, so a newly-fallen mountain keeps its lane.
  Affects `src/core/landscape.ts` (a successor may track PFXSCR to seat fallen X at the scroll
  centre). Not pinned by these tests — the continuous pass is faithful without it. *Found by TEA during test design.*
- **Question** (non-blocking): the PFOBJ record-layout comment labels +6 D7 as "A ACTIVE"
  (RBARON.MAC:362), but PFOBMN's USAGE treats D7 as the on-horizon latch (`BPL`→free/fallen,
  else on-horizon; `ORA I,80` sets it on recycle :3358, `AND I,0F` clears it on fall :3400). The
  story's "on-horizon latch" reading matches the code path, not the stale layout label — a
  callee-comment-vs-usage drift. Affects `src/core/landscape.ts` (latch on the on-horizon code
  path, not the "ACTIVE" label). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): rb4-8 HEALED a pre-existing lateral reference-frame seam.
  `ground-collision.ts` reads `m.x` (world center = player at 0) while the render read
  `m.x − eye[0]` — they disagreed once the pilot panned (eye[0]≠0). Relocating the mountain pan
  into `m.x` (and dropping the lateral eye from `mountainSegments`) makes both read `m.x`, so the
  collision window now tracks where the mountain is actually drawn. No further action — recorded
  so Reviewer knows the seam closed, not by accident. *Found by Dev during implementation (Architect consult).*
- **Question** (non-blocking): TEA's PFXSCR seed-on-fall finding still stands — a mountain that
  falls off the horizon keeps its lane rather than re-seating X from the scroll centre
  (RBARON.MAC:3403-3409). Unchanged by this story. Affects `src/core/landscape.ts` (a successor).
  *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking): the mountain render's eye component is unguarded — swapping `eye[1]`→`eye[0]`
  at `src/main.ts:181` passes the entire 1151-test suite, silently reintroducing the double-count
  this story exists to prevent. Affects `src/main.ts:181` + `tests/` (add a render-seam guard that
  distinguishes altitude `eye[1]` from lateral `eye[0]`). *Found by Reviewer during code review.*
- **Gap** (non-blocking): `wrapLateral`'s "modular / large pan in one step" contract is untested —
  a single-fold impostor passes all 15 AC-3 tests. Affects `src/core/landscape.ts:200` + `tests/`
  (add a several-periods-wide single-step delta + exact-boundary case). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): reference-frame seam type-safety — narrowing a consumer to a
  scalar (`eyeHeight: number`) prevents passing the wrong VECTOR but not the wrong SCALAR component;
  a branded height type or a render-invariance test is the real lock. Affects `mountainSegments`
  consumers and any future world-object split. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, round 2): the F1 render-seam guard asserts only `eyeHeight > 1` —
  it reds the realistic `eye[1]→eye[0]` swap and every zero-valued mis-index, but not a contrived
  hardcoded constant. Value-correlating the recorded height to `flight.altitude * ALT_TO_Y` (or its
  change across the climb) would make it airtight. Affects `tests/mountain-scroll-wiring.test.ts`.
  *Found by Reviewer during re-review (round 2).*
- **Improvement** (non-blocking, round 2): the F1 guard's added CLIMB is redundant —
  `INITIAL_FLIGHT.altitude` already makes `eye[1]≠0` at spawn, so the guard reds the swap without it;
  its comment overcredits the climb. Simplify (drop the climb) or re-aim the comment at exercising
  altitude-CHANGE through the seam. Affects `tests/mountain-scroll-wiring.test.ts`.
  *Found by Reviewer during re-review (round 2).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Mountain/stepMountain CONTRACT change — sibling suites re-seated**
  - Spec source: context-story-rb4-8.md, AC-2 and AC-3
  - Spec text: "the on-horizon state is a latched bit with hysteresis — not a depth test" / "Mountains scroll laterally with the player's delta and wrap."
  - Implementation: Mountain gains a stored `onHorizon` latched bit and stepMountain gains a REQUIRED `playerDX` arg; rb4-1's `onHorizon(m)=depth>=HORZ` predicate is superseded. Re-seated rb3-3's `tests/core/landscape.test.ts` (dropped the depth-predicate `onHorizon` block, 2-arg stepMountain, `onHorizon` on literals), the `tests/core/ground-collision.test.ts` factory, and the `tests/ground-collision-wiring.test.ts` mock. The new contract lives in `tests/core/mountain-scroll.test.ts`.
  - Rationale: a live depth predicate cannot express hysteresis, and stepMountain must receive the per-frame player delta — both are interface changes that necessarily redden the sibling suites, so TEA re-seats them (Dev never edits tests).
  - Severity: minor
  - Forward impact: Dev adds `readonly onHorizon: boolean` to Mountain, makes `stepMountain(m, playerDX)`, exports `P_MAXZ=0x1001`/`WRAP_LIMIT=0x0C01`, and wires one global delta at main.ts:566. The `as unknown as` RED shims in mountain-scroll.test.ts then collapse to plain typed access — remove them.
- **AC-3 wiring pinned via a global-delta invariant, not an end-to-end scroll observation**
  - Spec source: context-story-rb4-8.md, AC-3
  - Spec text: "Mountains scroll laterally with the player ... ours never do, which is a large part of why the world feels static."
  - Implementation: the booted wiring test asserts every mountain stepped in a ground frame receives ONE global delta (the bare `.map(stepMountain)` hands each the map index 0,1,2,3), plus a structural check the bare map is gone — instead of watching a mountain's X move under a sustained turn.
  - Rationale: seed-444's ground wave is only ~3 calc frames (RBARON's brief ground slot post-rb4-7) and turning from the start prevents the opening run from clearing, so a turn cannot build observable lateral inertia in-window. The global-delta invariant is a deterministic discriminator that reds on the bare map today and greens after correct wiring; the scroll magnitude itself is fully pinned in mountain-scroll.test.ts.
  - Severity: minor
  - Forward impact: none.
- **PFXSCR seed-on-fall not pinned (partial AC-3 coverage)**
  - Spec source: context-story-rb4-8.md, AC-3 (PFOBMN, implied)
  - Spec text: mountains scroll and recycle through a continuous pass.
  - Implementation: tests pin the per-frame X subtract, the WRAPIT wrap, and the on-horizon gating, but NOT the ROM's re-seat of a falling mountain's X from PFXSCR (RBARON.MAC:3403-3409).
  - Rationale: modelling PFXSCR (the accumulated PF scroll centre) is a larger mechanic than this cluster; a fallen mountain keeping its authored lane is a faithful-enough continuous pass. Logged as a Delivery Finding for a successor.
  - Severity: minor
  - Forward impact: a successor may seat fallen-mountain X at the scroll centre.

### Dev (implementation)
- **Lateral pan relocated from the world eye to `m.x`; `mountainSegments` narrowed to `eyeHeight`**
  - Spec source: context-story-rb4-8.md, AC-3; TEA's mountain-scroll.test.ts
  - Spec text: "the ROM subtracts PLYRDL from every free object's X each calc frame and wraps."
  - Implementation: `stepMountain(m, playerDX)` decrements + wraps `m.x` (ROM-literal), AND `mountainSegments` now takes the eye's ALTITUDE only — it no longer applies `eye[0]`. Root cause: rb4-5 centralised the UNIV4X lateral pan in the world eye, and the port already panned mountains through it (empirically: eye0 0→3000 shifts the projected x). Implementing the ROM's stored-X decrement ON TOP of that would DOUBLE-count the pilot's turn. A wrapping free object needs bounded per-object lateral state, so the pan belongs in `m.x`, and the eye must drop its lateral share for mountains. Confirmed by an Architect design consult (high confidence).
  - Rationale: the double-count is dissolved by RELOCATING the pan, not adding one. Narrowing the signature (mirroring `groundCollision(eyeHeight)`) forbids passing the lateral eye VECTOR — but NOT a wrong scalar (`eye[0]` is a valid `number`), so it is not "type-impossible" as first written; the render seam is now LOCKED by the F1 wiring guard added in the review rework (`mountain-scroll-wiring.test.ts` render-seam test, mutation-verified). It also heals the pre-existing collision/render lateral-frame seam. `camera.ts`/`scene.ts` comments were scoped to match. **[rb4-8 review rework: corrected the earlier "type-impossible" overclaim per Reviewer FLAG.]**
  - Severity: minor (pan RATE is unchanged from today — the change adds the wrap and removes a latent double-count; at heading 0 the render is byte-identical).
  - Forward impact: `mountainSegments` public signature changed (`eye: Vec3` → `eyeHeight: number`); re-seated its 5 rb3-3 render-test call sites + `main.ts:179`. Any future world object must choose eye-pan (non-wrapping, e.g. horizon) vs stored-X pan (wrapping, e.g. mountains).
- **WRAPIT implemented as a MODULAR fold rather than the ROM's literal set-to-∓limit**
  - Spec source: WRAPIT, RBARON.MAC:4341-4348
  - Spec text: at the limit, "CHANGE SIDES" — load `-0C01` (snap to the far edge).
  - Implementation: `wrapLateral` folds `x` modulo `2·WRAP_LIMIT` into `[−WRAP_LIMIT, WRAP_LIMIT)`.
  - Rationale: a faithful equivalent — both keep `|x| ≤ WRAP_LIMIT` and change sides — chosen for totality (a single large pan lands in-band in one step, which the 40-frame band test demands) and smoother recycling than a snap-to-edge. TEA's wrap tests accept either (they assert `|x| ≤ WRAP_LIMIT` and the sign flip).
  - Severity: trivial
  - Forward impact: none.
- **Removed the RED-phase `as unknown as` shims from mountain-scroll.test.ts**
  - Spec source: TEA deviation (rb4-8 contract change) + lang-review §1
  - Spec text: "these casts collapse to plain typed access — remove them then."
  - Implementation: now that `Mountain.onHorizon`, `P_MAXZ`, `WRAP_LIMIT`, and 2-arg `stepMountain` exist, the `as unknown as` casts are replaced with plain typed imports/access.
  - Rationale: the shims existed only to keep the RED file tsc-clean before the interface landed; they trip lang-review §1 and are now unnecessary.
  - Severity: trivial
  - Forward impact: none.

### Reviewer (audit)
- **TEA — Mountain/stepMountain CONTRACT change / sibling re-seat** → ✓ ACCEPTED: the latch demands a stored bit and stepMountain demands the delta; re-seating the sibling suites (not editing them under Dev) is the right discipline. Signatures propagated to all call sites (rule-checker + tsc confirm).
- **TEA — AC-3 wiring via global-delta invariant, not end-to-end scroll** → ✓ ACCEPTED: the discriminator is real — reverting main.ts to the bare `.map(stepMountain)` reds exactly the [0,1,2,3] map-index symptom at calc frame 107 (test-analyzer + my own mutation confirm), and the ≥2-mountain non-vacuity guard is sound.
- **TEA — PFXSCR seed-on-fall not pinned** → ✓ ACCEPTED: a reasonable descope, logged as a Delivery Finding for a successor; the continuous pass is faithful without it.
- **Dev — Lateral pan relocated to `m.x`; `mountainSegments` narrowed to `eyeHeight`** → ✗ FLAGGED by Reviewer: the DESIGN (relocate the pan; the eye carries altitude) is correct and Architect-validated — but the stated rationale "**makes the double-count type-impossible**" is FALSE. Narrowing to `eyeHeight: number` forbids passing the whole `eye` Vec3, but `eye[0]` and `eye[1]` are both `number`, so a wrong-scalar swap is type-legal and untested (I mutated `eye[1]`→`eye[0]` @ main.ts:181 → 1151/1151 green). This is finding F1. The wording must be corrected to "prevents passing the lateral eye VECTOR, but a render-seam guard test is still required" AND the guard added.
- **Dev — WRAPIT as MODULAR fold vs ROM set-to-∓limit** → ✓ ACCEPTED with note: a faithful equivalent (both bound to ±limit and change sides), and the impl is CORRECT (stronger than a single-fold). But the "handles a large pan in one step" claim is untested (finding F2) — add the large-delta discriminator.
- **Dev — Removed RED `as unknown as` shims** → ✓ ACCEPTED: correct cleanup; rule-checker + my own grep confirm 0 casts remain in the diff.

**Round-2 re-review update:** the FLAG on the "Lateral pan relocated…" deviation is now RESOLVED —
Dev corrected the "type-impossible" wording, and TEA added the mutation-verified F1 render-seam guard
that locks the property. All deviations (incl. the two new TEA/Dev rework entries) are ACCEPTED. No
new deviations from the rework beyond the guards themselves.

## Sm Assessment

**Triage — this one survives.** rb4-8 (8pt, red-baron, tdd) is set up and verified on disk:
session file present, story `in_progress`, context faithful to the authored YAML, epic context
untouched (md5 unchanged), branch `chore/rb4-8-mountains-authored-lateral-scroll` cut off current
develop (HEAD at rb4-7 #34). Merge gate clear — no open PRs anywhere. Dependency rb4-1 (THE RADIX
SWEEP) is `done`, so the hex-constant foundation is in place.

**Cluster C7** — subsumes MI-014/015/016/018/019. Five authored ACs, all copied verbatim from
the YAML (none fabricated by setup):
1. Mountain initial depths + X positions read from PFOBIZ as HEX.
2. Two closing rates (on-horizon 0x180=384 vs fallen 0x20=32); on-horizon is a LATCHED status bit
   with hysteresis (PFOBJ+6 D7), not a depth comparison.
3. Mountains scroll laterally with the player's delta and wrap (ROM subtracts PLYRDL each calc frame).
4. Recycle to P.OBZI = 0x7F00, recycle threshold is 16-bit 0x01C0=448, NOT 8-bit 0xC0=192.
5. Depends on rb4-1 (satisfied).

**Caveat for Furiosa / the derivation — DO NOT rubber-stamp the cited line numbers.** The story cites
RBARON.MAC:1305-1306 (PFOBIZ initial depths/X) and RBARON.MAC:3298-3306 (PLYRDL subtract/wrap). The
red-baron source exists in THREE copies whose line numbers form a staircase, not a constant offset —
cited line numbers must be re-verified against the shipped RBARON source copy before any golden value
is pinned. This is a transcription story: verify constants against the primary source, and mutation-
test every guard (a `toContain('7')` that matches a token, not the claim, is scenery). The whole
"world feels static" symptom hinges on the PLYRDL lateral-subtract loop actually running each calc
frame (~10.4Hz calc-frame, NOT display rate).

**Routing:** phased tdd → RED phase → TEA (Imperator Furiosa) writes the failing acceptance coverage.

## TEA Assessment

**Tests Required:** Yes
**Reason:** rb4-8 adds two behavioural MACHINES on top of rb4-1's already-shipped mountain
constants — AC-2 (a latched on-horizon bit with hysteresis) and AC-3 (per-frame lateral scroll
+ wrap). Both are pure-sim testable, plus one wiring seam (does main.ts actually hand the
mountains the player delta?). AC-1 (authored PFOBIZ) and AC-4 (recycle depth + 16-bit 0x01C0
threshold) are the NUMBERS rb4-1 already shipped and pinned in tests/audit/radix-transcription —
they stay green; rb4-8 lands the machines those numbers feed.

**Primary source verified, not trusted:** citations resolved at the SYMBOL definition in the
CITABLE copy `~/Projects/red-baron-source-text/RBARON.MAC` (LF-only, md5 497db9…, fingerprint
`:621 = CALCNT\t=18`, `:6217 = .RADIX 10`). PFOBMN sits at :3269 (story said :3264), the PLYRDL
subtract at :3299-3306 (story said :3298-3306), PFOBIZ at :1305-1306 (exact) — the staircase, so
every line was derived, none copied. The mechanism was traced through the CODE: +6 D7 set → the
on-horizon branch (P.OBDZ=0x180, no scroll); D7 clear → the free/fallen branch (X -= PLYRDL +
WRAPIT, delta 0x20); flip on→fallen at P.MAXZ=0x1001 (`AND I,0F`), fallen→on ONLY at recycle
(`ORA I,80` + reset to P.OBZI). Lateral scroll is GATED to fallen objects.

**Test Files:**
- `tests/core/mountain-scroll.test.ts` — NEW. AC-2 latch/hysteresis (8) + AC-3 scroll/wrap (7), pure.
- `tests/mountain-scroll-wiring.test.ts` — NEW. AC-3 wiring: main.ts hands ONE global PLYRDL to
  every mountain (structural regex + booted seed-444 harness).
- `tests/core/landscape.test.ts` — RE-SEATED to the new Mountain/stepMountain contract (rb3-3 suite; 14 green).
- `tests/core/ground-collision.test.ts`, `tests/ground-collision-wiring.test.ts` — factory/mock re-seated.

**Tests Written:** 20 new (15 core + 5 wiring) across AC-2/AC-3.
**Status:** RED — 14 failing (11 core discriminators + 3 wiring), 6 green guards. Whole red-baron
suite: **14 failed / 1137 passed / 1 todo**, and every red is in the two rb4-8 files — no collateral
from the interface change (all 63 other suites green, siblings re-seated).

### Rule Coverage (lang-review/typescript.md)

| Rule | Test(s) / handling | Status |
|------|--------------------|--------|
| §1 type-safety escapes (`as unknown as`) | RED shims for the not-yet-existing `onHorizon` field, `P_MAXZ`/`WRAP_LIMIT`, and 2-arg stepMountain — commented + flagged as a deviation; DEV removes them in GREEN | intentional, documented |
| §2 `readonly` on shared data | Mountain fields stay `readonly`; new `onHorizon` must be `readonly` too | pinned by contract note |
| §4 `??` vs `||` for 0/"" | wiring test uses `byFrame.get(f) ?? []` (Map.get undefined) — never `||` | clean |
| §8 test quality — meaningful assertions | every test asserts a value (no `assert(true)`, no `let _ =`); totality pinned (`inactive returned untouched`, no NaN); mock signature matches real `(m, playerDX)` | clean |
| §8 no vacuous/index-fooled wiring | the booted wiring discriminates one-global-delta vs the map-index [0,1,2,3]; non-vacuity guard requires a ≥2-mountain ground frame | clean |

**Self-check:** 0 vacuous tests. The 6 green guards (inactive-totality, on-horizon-no-scroll,
zero-delta, P.MAXZ-stay-above, wiring non-vacuity, main non-empty) protect the contract and are
green-by-design; the 14 reds are behavioural/constant discriminators, never compile noise.

**Handoff:** To Dev (The Word Burgers) for GREEN — implement the latch + scroll/wrap in
`src/core/landscape.ts` and wire one global delta at `src/main.ts:566`.

### TEA Rework (round 1 — Reviewer F1/F2)

Added three mutation-verified regression guards. The shipped code was already CORRECT, so these
LOCK the behaviour the Reviewer proved unguarded — they pass now, and each reds its target mutation:
- **F1 (render seam, blocking):** `tests/mountain-scroll-wiring.test.ts` — the booted cockpit now
  CLIMBS (no turn), so `eye[1]`≠0 while `eye[0]`=0 at the ground frames; it asserts `mountainSegments`
  receives a NONZERO eye height (the altitude). Mutation `eye[1]→eye[0]` @ `main.ts:181` reds ONLY
  this test (5 pass, 1 fail) — confirmed. The one-global-delta test still holds (a climb doesn't turn).
- **F2 (modular wrap):** `tests/core/mountain-scroll.test.ts` — a many-periods-wide single-step fold
  + an exact-limit crossing (`x−playerDX == ±WRAP_LIMIT`). A single-fold impostor reds both — confirmed.
Full suite **1154 green** (+3), tsc clean, tree clean (mutations reverted, control run green).

**NOTE for Dev (green):** the Reviewer FLAGGED the Dev deviation's "makes the double-count
**type-impossible**" wording. It is superseded by the F1 guard — please correct it to: "the narrowing
forbids passing the lateral eye VECTOR; the render seam is now LOCKED by the F1 wiring guard." (TEA
cannot edit the Dev deviation subsection.) The two Low findings (dying-freeze coverage, P_MAXZ
triple-assert) were left as-is per the Reviewer's non-blocking classification.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/landscape.ts` — Mountain gains the `onHorizon` latched bit; exports `P_MAXZ=0x1001`
  + `WRAP_LIMIT=0x0C01`; spawn/initial set the latch (GMINIT MSB≥0x11 ⇒ [T,F,T,F]);
  `stepMountain(m, playerDX)` is the latch machine + fallen-branch lateral fold (WRAPIT);
  retired the `onHorizon()` depth-predicate function; `mountainSegments` narrowed to `eyeHeight`
  (drops the lateral eye — the pan lives in `m.x`).
- `src/main.ts` — wires ONE global per-frame pan delta (Δ eye[0]) to every mountain (:566);
  passes `eye[1]` (altitude only) to `mountainSegments` (:179).
- `src/core/camera.ts`, `src/core/scene.ts` — scoped the rb4-5 "UNIV4X → eye alone" comments.
- `tests/core/landscape.test.ts` — re-seated the 5 `mountainSegments` calls to the `eyeHeight` sig.
- `tests/core/mountain-scroll.test.ts` — collapsed the RED `as unknown as` shims to typed access.
- `tests/core/depth-scale.test.ts` — registered `P_MAXZ` in the depth-axis registry (cited Z threshold).

**Tests:** 1151/1151 passing (65 files, 1 todo) — GREEN. `tsc --noEmit` + `vite build` clean.
The FULL suite was the gate: adding `P_MAXZ` tripped the `depth-scale` registry sweep — a sibling
suite RED never touched — which I registered. No other collateral (all 64 other files unchanged-green).

**The design call (Architect consult, high confidence):** AC-3's ROM stored-X decrement would
DOUBLE-count against rb4-5's eye pan (the port already pans mountains through `toEye`; empirically
eye0 0→3000 shifts the projected x). Resolved by RELOCATING the pan into `m.x` and dropping the
lateral eye from `mountainSegments` — a wrapping free object needs bounded per-object lateral state.
This also heals a pre-existing collision/render lateral-frame seam (both now read `m.x`). See the
Dev Design Deviations for the full rationale.

**Verification:** core (latch/hysteresis + scroll/wrap, pure) + booted wiring (one global PLYRDL
reaches every mountain through the REAL loop) + full suite + build. Pan RATE is unchanged from today
(only the wrap is new + the double-count removed), so at heading 0 the render is byte-identical; a
final in-cockpit playtest of the continuous lateral band as the pilot turns is advisable but the
mechanism is verified end-to-end.

**Branch:** chore/rb4-8-mountains-authored-lateral-scroll (pushed)

**Handoff:** To Reviewer (Immortan Joe) for code review.

### Dev Rework (round 1 — Reviewer F1/F2)

No code changes required — TEA's rework guards (F1 render-seam, F2 modular-wrap) pass because the
implementation was already correct; each mutation they target reds exactly them (verified). This
round: corrected the "type-impossible" deviation overclaim per the Reviewer FLAG (the narrowing
forbids the lateral VECTOR, not a wrong scalar; the seam is now LOCKED by the F1 guard). Pushed the
guard commit `324f665`. Full suite **1154 green**, tsc + vite build clean, tree clean.

**Handoff:** To Reviewer (Immortan Joe) for re-review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
_(Table reflects the ROUND-2 re-review re-run on the test-only rework diff; round-1 outcomes are recorded in the assessment history below.)_

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 | N/A — round 2: 1154 pass, tsc + vite build clean, rework confirmed test-only |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer's own edge analysis (wrapLateral boundaries incl. the new large-delta + exact-limit cases) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled — covered by Reviewer (no swallowed errors in the test additions) |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | round 2: confirmed all 3 new guards NON-VACUOUS by mutation; 2 non-blocking notes deferred (Medium coarse-threshold, Low redundant-climb) — logged as Delivery Findings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled — covered by Reviewer (climb comment overcredit noted as Low, logged) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled — covered by Reviewer + rule-checker §1/§2 (mock signature matches, import type correct) |
| 7 | reviewer-security | Yes | clean | 0 | N/A — round 2: test-only, no attack surface |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled — covered by Reviewer (guards are minimal; the redundant climb is the one simplify note, logged) |
| 9 | reviewer-rule-checker | Yes | clean | 0 | N/A — round 2: 0 violations across 17 rules, all 3 guards independently mutation-verified |

**All received:** Yes (round 2: 4 enabled re-run and returned; 5 disabled via settings, each domain covered by Reviewer's own analysis)
**Total findings:** round 1 = 2 confirmed (both now RESOLVED); round 2 = 0 blocking, 2 non-blocking deferred (logged as Delivery Findings)

## Reviewer Assessment

**Verdict:** APPROVED (round 2, after rework — the round-1 REJECTED record is preserved below)

### Re-review (round 2) — the round-1 blocking findings are CLOSED

The rework (commit `324f665`, test-only) added three regression guards, all confirmed non-vacuous by
THREE independent mutation tests (Reviewer's own during rework, reviewer-rule-checker, reviewer-test-analyzer):
- [TEST] **F1 (was blocking) — CLOSED:** the `mountain-scroll-wiring.test.ts` render-seam guard reds
  the `eye[1]→eye[0]` swap at `main.ts:181` (the exact silent mutation round 1 flagged). Verified 3×.
- [TEST] **F2 — CLOSED:** the two `mountain-scroll.test.ts` wrap tests red a single-fold `wrapLateral`,
  and the exact-limit case is non-redundant with the many-periods case (a boundary-exclusive modular
  impostor reds only the exact-limit one). Verified 3×.
- **Deviation FLAG — RESOLVED:** Dev corrected the "type-impossible" overclaim (the narrowing forbids
  the lateral VECTOR, not a wrong scalar; the seam is now LOCKED by the F1 guard).

Round-2 specialists (on the test-only rework diff): [preflight] GREEN (1154 pass, tsc+build clean),
[SEC] clean, [RULE] clean (0 violations, guards independently mutation-verified), [TEST] all 3 guards
confirmed non-vacuous with two NON-BLOCKING refinement notes (logged as Delivery Findings):
- [MEDIUM] the F1 guard is a coarse `>1` threshold — it reds the realistic `eye[1]→eye[0]` swap and
  every zero-valued mis-index, but not a contrived hardcoded constant; a value-correlation to
  `altitude*ALT_TO_Y` would make it airtight.
- [LOW] the climb is redundant (`INITIAL_FLIGHT.altitude` already makes `eye[1]≠0` at spawn), so its
  comment overcredits it — simplify or re-aim the comment at altitude-CHANGE.

Neither is Critical/High; the blocking finding is resolved. Per the Blocking Rule, **APPROVED**. The
[EDGE]/[TYPE]/[DOC]/[SIMPLE]/[SILENT] domains (disabled subagents) were unaffected — the rework is
test-only and the round-1 source review stands.

**Data flow (unchanged from round 1):** ArrowRight → flight.heading → toEye()[0] → main.ts playerPanDX
→ stepMountain → m.x = wrapLateral(m.x − playerDX) → mountainSegments draws at m.x (altitude eye[1]
only). Single pan, wrapped, and now the render-seam leg is guarded.

**Handoff:** To SM (The Organic Mechanic) for finish-story.

---

### Round 1 (rework record — the findings below are now RESOLVED by commit 324f665)

**Verdict (round 1):** REJECTED

The implementation is CORRECT and thorough — the ROM transcription is faithful (I verified P_MAXZ=0x1001 @ RBARON.MAC:445, WRAP_LIMIT=0x0C01 @ :4341-4348, GMINIT MSB≥0x11 @ :1258-1262 against the citable copy myself), the latch machine and lateral fold behave as specified, and the double-count design (Architect-validated) is sound. **But the story's HEADLINE correctness property — that the mountain render takes altitude only, never the lateral pan (no double-count) — is guarded by ZERO tests, and a shipped deviation claims that gap is "type-impossible" when it is trivially reversible.** A fidelity story whose central fix has no regression lock is not done. *(Round 2: both gaps now guarded + mutation-verified; deviation corrected.)*

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | [TEST] No test guards which eye component reaches the mountain render. I mutated `eye[1]`→`eye[0]` at `src/main.ts:181` and the FULL suite stayed green (1151/1151). This is the exact double-count the story exists to prevent. The Dev deviation claims narrowing the signature makes it "type-impossible" — FALSE: the narrowing forbids passing the Vec3, but a wrong SCALAR (`eye[0]`) is still a valid `number`. | `src/main.ts:181`, `tests/` | Add a guard (booted or unit) that distinguishes `eye[1]` from `eye[0]` at the render seam — e.g. a nonzero `eyeHeight` shifts projected Y, and/or a booted tap asserting the render's height tracks `toEye(flight)[1]` while the pilot banks (eye[0]≠eye[1]). Correct the "type-impossible" wording in the deviation. |
| [MEDIUM] | [TEST] `wrapLateral`'s docstring claims "Modular … even a large pan lands in-band in one step," but no test exercises a delta > one period (2·WRAP_LIMIT). I replaced the modulo with a single-fold `if (x>W) x-=period` (WRONG for `|x|>period`) and all 15 mountain-scroll tests passed. | `src/core/landscape.ts:200` | Add a several-periods-wide single-step delta test (e.g. `stepMountain({x:0,…}, -50000)` ⇒ `|x|≤WRAP_LIMIT`) plus an exact-boundary case (`x-playerDX == ±WRAP_LIMIT`). |
| [LOW] | [TEST] The dying-freeze × ground-scroll interaction (`playerPanDX=0` while dying, `main.ts:559-561`) has no explicit test — only indirectly via the zero-delta unit test. | `src/main.ts:559` | Optional: a booted ground-death test, or annotate the zero-delta test as standing in for it. |
| [LOW] | [TEST] `P_MAXZ` is asserted three equivalent ways in immediate succession (`0x1001`, `4097`, `HORZ+1`) — redundant, not harmful. | `tests/core/mountain-scroll.test.ts:95` | Optional: keep `HORZ+1` (most semantic), drop the other two. |
| [LOW] | [SEC] `wrapLateral` has no `Number.isFinite` guard; a non-finite `playerDX` would propagate NaN into `m.x`. Non-exploitable (no attacker path; `playerDX` is always finite) — defense-in-depth only. | `src/core/landscape.ts:200` | Optional: not required for this diff. |

### Rule Compliance (lang-review/typescript.md)

Cross-checked the rule-checker's exhaustive pass (15 rules / 46 instances, 0 violations) against my own read — all confirmed:
- **§1 type-safety escapes** — [RULE] [TYPE] VERIFIED: 0 `as any` / `as unknown as` / `@ts-ignore` remain; the 3 RED-phase `as unknown as` shims were removed in GREEN (`git diff 0a1aec1 5c6e63c -- tests/core/mountain-scroll.test.ts` shows the collapse). My own grep of added lines confirms none remain.
- **§2 readonly on shared data** — [TYPE] VERIFIED: `Mountain.onHorizon` is `readonly` (landscape.ts:140); `mountainSegments` keeps `readonly Mountain[]`.
- **§4 `??` vs `||`** — [RULE] VERIFIED: wiring test uses `byFrame.get(f) ?? []` (mountain-scroll-wiring.test.ts) — correct Map.get guard; no `||`-on-nullable introduced.
- **§8 test quality** — [TEST] mock signatures match `stepMountain(m, playerDX)` in both wiring taps; no vacuous `let _ =` / `assert(true)`. The AC-2 latch tests and AC-3 wrap-exists + global-delta wiring tests are genuinely discriminating (test-analyzer + my own mutations confirm reverting to the pre-rb4-8 bugs reds them). BUT §8 is where F1/F2 land — the render-eye seam and the modular-wrap totality are unguarded.
- **§14 core purity** — [RULE] VERIFIED: no `Date.`/`Math.random`/`document`/`window` in landscape.ts added lines; `main.ts` is the wiring layer (purity rule does not bind it).
- **§15 ROM citations** — [RULE] VERIFIED: P_MAXZ, WRAP_LIMIT, GMINIT threshold all carry RBARON.MAC citations, independently confirmed against the citable source.

### Observations (tagged)

- [VERIFIED] ROM transcription faithful — P_MAXZ=0x1001 (:445), WRAP_LIMIT=0x0C01 (:4341-4348 compare + wrap target), GMINIT MSB≥0x11 (:1258-1262) all match the citable copy (md5 497db9…). Evidence: I read the source lines directly.
- [VERIFIED] Latch is stored, not recomputed — `stepMountain` (landscape.ts:181-192) branches on `m.onHorizon` for the RATE; the `depth >= P_MAXZ` fall test is the TRANSITION (ROM `CPY I,P.MAXZ` :3397), not a rate-selection depth test. AC-2 satisfied.
- [VERIFIED] [SIMPLE] `wrapLateral` (landscape.ts:200-203) is a closed-form O(1) modular fold — no loop, total, correct for all magnitudes (my single-fold mutation proves the impl is stronger than a naive one). Correct code; only the TEST is missing (F2).
- [VERIFIED] Pan relocation scoped correctly — `eye[0]` still used for motion objects (blimp, `main.ts:362`); only mountains drop it (`main.ts:181` `eye[1]`). Collision (`main.ts:512`) reads altitude + `m.x`, matching the render — the seam is genuinely healed.
- [HIGH TEST] The render-eye guard gap (F1) — the one place the double-count can silently return.
- [MEDIUM TEST] The modular-wrap totality gap (F2).
- [SEC] [SILENT] No security/silent-failure issues — pure client sim, the one `try/catch` (wiring test) is observable via a downstream assertion; the NaN note is non-exploitable Low.
- [DOC] Comments accurate — camera.ts/scene.ts scoping notes and landscape.ts citations audited, no stale/misleading text (the "type-impossible" claim lives in the session DEVIATION, not a code comment — flagged in the audit below).
- [EDGE] [VERIFIED] Boundary paths sound — `wrapLateral` folds `x=WRAP_LIMIT`→`-WRAP_LIMIT`, `x=-WRAP_LIMIT`→`-WRAP_LIMIT` (in-band), huge magnitudes bounded; the fall threshold is exact (`depth >= P_MAXZ`, tested at 0x1000 and 0x1001); a fallen mountain with underflowing depth recycles at `<= MIN_DEPTH` rather than sticking negative; an inactive mountain returns untouched. No unhandled edge in the state machine — the only edge GAP is the untested huge-delta path (F2).

### Devil's Advocate

Argue the code is broken. First, the double-count: I claimed the narrowed `eyeHeight: number` signature makes the double-count "type-impossible." A hostile reading — and my own mutation — shows that is a lie of convenience. `eye[0]` and `eye[1]` are both `number`; the type system cannot tell altitude from lateral pan. A distracted future dev refactoring `toEye` field order, or a bad merge, swaps them and every one of 1151 tests still passes while the pilot's turn now bobs the mountains vertically and their altitude reads as pan. The story's ENTIRE reason to exist — "the world feels static," resolved by a single, un-double-counted pan — rides on one array index that nothing tests. That is the definition of an unlocked fix. Second, the wrap: `wrapLateral`'s contract says it survives a large pan in one step, but the tests only ever nudge x across the boundary by ≤0x400. A single-fold impostor passes the suite. If a later story ever feeds a big per-frame delta (a teleport, a wind gust, a fast-forward), the untested branch decides whether mountains scatter off-screen or recycle — and no test would have objected to the broken version. Third, a confused maintainer reading the deviation log will TRUST "type-impossible" and not add the guard, propagating the false confidence. Fourth, the dying-freeze interaction is asserted only in a comment; if `preMotionFrame` or the EOL path changes, a fallen mountain could scroll during a death with nothing red. None of these are live bugs today — the shipped code is correct — but three of them are one small change away from silent breakage on the exact mechanism this story delivers, and the review's job is to lock the mechanism, not just observe that it currently works.

**Data flow traced:** ArrowRight → FlightInput.turn → flight.heading → toEye()[0] → main.ts playerPanDX (Δeye[0]) → stepMountain(m, playerPanDX) → m.x = wrapLateral(m.x − playerDX) → mountainSegments draws at m.x (no eye[0]) → screen. Single pan, wrapped. Collision reads the same m.x. Correct — but the render-eye leg (eye[1] vs eye[0]) is untested.

**Handoff:** Back to TEA (Imperator Furiosa) — the two blocking/notable gaps are testable (add the render-eye guard + the large-delta wrap test), so this is a RED rework, not a code-logic fix.