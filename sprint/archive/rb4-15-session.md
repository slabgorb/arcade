---
story_id: "rb4-15"
jira_key: "rb4-15"
epic: "rb4"
workflow: "tdd"
---
# Story rb4-15: THE BLIMP IS THE WRONG MACHINE — an APPROACHING airship (Z-closing, N.PLNZ-gated, ÷4 fire, GMLEVL>=2), not a lateral drifter

## Story Details
- **ID:** rb4-15
- **Jira Key:** rb4-15
- **Workflow:** tdd
- **Stack Parent:** rb4-1
- **Branch:** feat/rb4-15-blimp-approaching-airship

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T00:11:21Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T22:37:43Z | 2026-07-18T22:40:46Z | 3m 3s |
| red | 2026-07-18T22:40:46Z | 2026-07-18T23:16:11Z | 35m 25s |
| green | 2026-07-18T23:16:11Z | 2026-07-19T00:00:50Z | 44m 39s |
| review | 2026-07-19T00:00:50Z | 2026-07-19T00:11:21Z | 10m 31s |
| finish | 2026-07-19T00:11:21Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): The ROM blimp ALSO carries a lateral X velocity — BLMOTN adds `BLOBJ+0C` to X each calc-frame and world-wraps via WRAPIT with UNIV4X pan compensation (RBARON.MAC:4235-4250), and INITBP picks the entry side off `PLDELX` (:1427-1430). rb4-15's surface models only the Z machine, so this stays unmodelled AND unpinned (no test asserts x is frozen).
  Affects `red-baron/src/core/blimp.ts` (successor story to port the lateral component).
  *Found by TEA during test design.*
- **Gap** (non-blocking): While a blimp is active the wave machine spawns only ONE plane — `BIT BLOBJ+18 / BMI 35$ ;IF BLIMP ONLY 1 PLANE` (RBARON.MAC:2335-2336). Unmodelled in the clone's wave wiring.
  Affects `red-baron/src/core/waves.ts` (and main.ts's wave call).
  *Found by TEA during test design.*
- **Question** (non-blocking): N.PLNZ's reset — the game-over/attract path sets it to DECIMAL 10 (`LDA I,10. / STA N.PLNZ`, RBARON.MAC:2056-2058), making the attract demo blimp-eligible immediately, while in-game counting is gated on GAMODE D7 (PLNZD, :2396-2398). Dev's plane counter should start at 0 per game and count in-game plane spawns only.
  Affects `red-baron/src/main.ts` (the counter's reset seam).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): `blimpFires(frame, level)` reverses `planeFires(level, frame, roll)`'s argument order. Story-specified surface — kept exactly as written; flag for a later API-consistency tidy only.
  Affects `red-baron/src/core/blimp.ts` (naming/ordering only).
  *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): screen-scale's REGISTERED map still describes ENTRY_NDC_MIN/ENTRY_NDC_RANGE as "where the airship enters... it enters from an EDGE" — the constants survive but are now spent AT THE DESPAWN LINE (the approach's watchability envelope), so the prose is stale.
  Affects `red-baron/tests/core/screen-scale.test.ts` (registry description strings only — verify phase should reword).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): the FEATHERED-trigger staging (6 display frames on / 6 off) is now the only way a pilotless booted cockpit clears the opening run — a held trigger overheats permanently (GUN.ST locks at ~f31 and only a death cools it, and the ROM-faithful sky no longer kills the idle pilot early). Future boot stagings should copy the feather, not the hold.
  Affects `red-baron/tests/helpers/boot-cockpit.ts` consumers (pattern documented in the three re-staged suites).
  *Found by Dev during implementation.*
- **Question** (non-blocking): after game over the clone parks the sky (wave decisions gate on `!gameOver`), while the ROM's attract mode keeps the war running and even sets N.PLNZ = 10 so the attract demo is blimp-eligible immediately (:2050-2059). Pre-existing divergence surfaced by this story's archaeology; an attract-mode story would revisit.
  Affects `red-baron/src/main.ts` (the post-game-over wave gate).
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): blimp.test.ts's purity block (the "pure & deterministic" describe) compares only xs/deltas across runs — constant arrays under the new model; the axis that actually moves (depth) is proven deterministic only by AC-3's neighbours. Add `depths` to the run-comparison so the block proves its own header claim.
  Affects `red-baron/tests/core/blimp.test.ts` (add depths to the two purity comparisons).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): blimp-approach.test.ts's comment "an arg-swapped implementation fails both too" is true by reasoning but not literally executed — add one self-proving case (e.g. gate(0.1, BLIMP_PLANE_GATE) === false) or drop the claim from the comment.
  Affects `red-baron/tests/core/blimp-approach.test.ts` (one assertion or one comment line).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): with the spawn gate held open at the cockpit seams, in-cockpit roll OBEDIENCE has a narrow residual hole — the 2,000-frame window holds exactly one wave decision, so a wiring that calls shouldSpawnBlimp but ignores its verdict is indistinguishable there (the pre-rb4-15 suite had the same single-decision exposure; not a regression). A cross-count of recorded gateCalls versus spawns against the seed's known winning draws would close it.
  Affects `red-baron/tests/cockpit-loop.test.ts` (a gateCalls-vs-spawns cross-count).
  *Found by Reviewer during code review.*
- **Question** (non-blocking): the gate-count ordering nuance recorded in the deviation audit (count-includes-current-wave vs the ROM's PLNZD/:2325 interleave) — a successor tracing PLNZD's call site settles whether the gate opens one decision earlier than the ROM's strictest reading.
  Affects `red-baron/src/main.ts` (the wave-decision block, one-line reorder at most).
  *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 11 non-blocking findings, all routed (none blocking; the auto-compiled
"No upstream effects noted" was the known word-wrap bug — rebuilt by hand):
- **Successor ROM-fidelity gaps (3):** the blimp's lateral X machine (BLOBJ+0C + PLDELX entry
  side, RBARON.MAC:4235-4250/:1427-1430); "IF BLIMP ONLY 1 PLANE" wave-size coupling
  (:2335-2336); the attract-mode war (post-game-over sky parked vs the ROM's N.PLNZ=10
  attract blimps).
- **Wiring seams for a successor (2):** N.PLNZ reset semantics per game (counter starts 0,
  counts in-game spawns only); the gate-count ordering vs PLNZD's interleave (at most one
  decision of skew — trace PLNZD's call site to settle).
- **Test cleanups (5):** stale ENTRY_NDC registry prose in screen-scale; depths added to
  blimp.test.ts's purity comparisons; a self-proving arg-swap case in blimp-approach;
  a gateCalls-vs-spawns cross-count to close the in-cockpit roll-obedience residual;
  boot stagings must FEATHER the trigger, never hold it (documented in the three
  re-staged suites).
- **API tidy (1):** blimpFires(frame, level) vs planeFires(level, frame, roll) argument
  order (story-specified; cosmetic).

**Blocking:** None

### Deviation Justifications

9 deviations

- **reapBlimp narrowed to one argument (the aspect is retired)**
  - Rationale: the ROM despawn is a depth question; a parameter the decision ignores is the poisoned-input pattern rb4-1 spent four rounds killing. The screen-scale DECISION-PATH guard is arity-agnostic, so it survives unchanged
  - Severity: minor
  - Forward impact: Dev updates main.ts's reap call to one argument
- **The story's "~32 frames entry-to-gone" is pinned as EXACTLY 31 calc-frames**
  - Rationale: the two transcribed constants plus the threshold make the count derivable; "~32" was a prose estimate. Pin the derivation, not the estimate
  - Severity: minor
- **The ROM's lateral X velocity is left UNPINNED (drift asserts removed, not inverted)**
  - Rationale: the ROM blimp genuinely has lateral motion (BLOBJ+0C — see Delivery Findings), outside this story's named surface. Pinning "x never moves" would be counterfactual; pinning the drift would be scope creep
  - Severity: minor
  - Forward impact: a successor porting BLOBJ+0C meets no contradicting test
- **Entry X/Y placement stays Dev's screen-denominated choice**
  - Rationale: not in the story's surface; the screen-scale sweep still forces any kept constant to stay NDC-denominated, and ROM-cited replacements self-classify
  - Severity: minor
  - Forward impact: a successor may transcribe INITBP's placement; the registry absorbs either path
- **The cockpit seed-finder is re-derived contract-agnostic**
  - Rationale: the accepted roll's draw index now depends on wave decisions before the gate opens (and on Dev's draw-per-decision choice); a dense-rolling seed works for any reasonable wiring, identically on both sides of the migration
  - Severity: minor
  - Forward impact: if GREEN wiring consumes more than ~6 pre-gate draws from blimpRng, widen the density bound (noted in the helper comment)
- **Three ground-wiring boot stagings re-staged: seed 444 → 3, held trigger → FEATHERED trigger**
  - Rationale: measured, not guessed — the old held-trigger clear existed ONLY because the drifter-era airship spawned on the opening decision (25 % of seeds; old code reaches ground on 5,746/30,000 seeds ≈ that rate) and SHOT the pilot, whose death sequence cools GUN.ST; a held gun otherwise locks out permanently at ~f31, and under the new gate ZERO of 30,000 seeds reach a ground slot. Feathered, the +1/shot heat never outruns the ×3 release cooling and most seeds clear (~f95 ground, exactly 2 deploys at 280)
  - Severity: moderate (test-staging change by Dev — flagged for verify-phase audit)
  - Forward impact: boot stagings must feather, not hold; the derivation is commented in each file
- **cockpit-draw-path: the N.PLNZ gate held open at the vi.mock seam; TOTAL_LIVE_SHELLS re-pinned 51 → 84**
  - Rationale: a 24-frame sky cannot have shown four planes, so the REAL gate would empty the suite of the airship it exists to measure; and the old pinned sky's mid-run death (the drifter blimp's every-level fire) no longer happens — the ROM's level-0 airship is a target, not a threat, so the gun runs its whole magazine
  - Severity: moderate (test change by Dev — flagged for verify-phase audit)
  - Forward impact: none beyond the documented pin
- **cockpit-loop: TEA's flown-four-planes gate test replaced with the recorded-count gate test; gate held open at the seam**
  - Rationale: the flown version is structurally impossible, measured twice over — a pilotless wave takes ~1,000 calc-frames to clear, the first fly-past arms the returning ace, and the ace's 4-calc-frame 50/50 passes kill an idle pilot into game over (which freezes the schedule) minutes before a fourth plane can appear
  - Severity: moderate (replaces a TEA-authored RED test — flagged for verify-phase audit)
  - Forward impact: the recorded-count pin discriminates simFrame/kills/constant wirings on the first decision
- **The airship's lateral state: deltaX = 0, placement denominated at the despawn line**
  - Rationale: x/y are frozen for the life (BLOBJ+0C is the routed successor) while the visible window shrinks 16× as Z closes — any placement denominated at the ENTRY depth leaves the frame long before the reap
  - Severity: minor
  - Forward impact: the successor porting BLOBJ+0C re-derives placement; ENTRY_NDC registry prose needs a reword (Delivery Finding)

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No design deviations recorded at setup.

### TEA (test design)
- **reapBlimp narrowed to one argument (the aspect is retired)**
  - Spec source: context-story-rb4-15.md, "NEW blimp.ts surface"
  - Spec text: "exports BLIMP_Z_START=0x1000, BLIMP_CLOSE_SPEED=0x80, BLIMP_PLANE_GATE=4; signatures blimpFires(frame,level) and shouldSpawnBlimp(planeCount,roll)" — silent on the despawn seam
  - Implementation: RED pins `reapBlimp(blimp): Blimp | null` — null once depth < 0x100 (RBARON.MAC:4266-4270); the drifter's `aspect` parameter is dropped
  - Rationale: the ROM despawn is a depth question; a parameter the decision ignores is the poisoned-input pattern rb4-1 spent four rounds killing. The screen-scale DECISION-PATH guard is arity-agnostic, so it survives unchanged
  - Severity: minor
  - Forward impact: Dev updates main.ts's reap call to one argument
- **The story's "~32 frames entry-to-gone" is pinned as EXACTLY 31 calc-frames**
  - Spec source: context-story-rb4-15.md, ROM MACHINE (1)
  - Spec text: ":4266-4270 clears BLOBJ when Z<0x100 -> ~32 frames entry-to-gone"
  - Implementation: THE LIFE test asserts 31 steps (4096 − 128·30 = 256 = last alive state, exactly on the line; step 31 → 128 < 0x100 → cleared) and that the last alive depth is exactly 0x100
  - Rationale: the two transcribed constants plus the threshold make the count derivable; "~32" was a prose estimate. Pin the derivation, not the estimate
  - Severity: minor
  - Forward impact: none
- **The ROM's lateral X velocity is left UNPINNED (drift asserts removed, not inverted)**
  - Spec source: context-story-rb4-15.md, sibling re-seat map
  - Spec text: "blimp.test.ts L250/262/274/291/326 (drift model)" — marked for re-seat
  - Implementation: re-seated tests pin the Z machine only; no assertion that x is frozen OR that it drifts
  - Rationale: the ROM blimp genuinely has lateral motion (BLOBJ+0C — see Delivery Findings), outside this story's named surface. Pinning "x never moves" would be counterfactual; pinning the drift would be scope creep
  - Severity: minor
  - Forward impact: a successor porting BLOBJ+0C meets no contradicting test
- **Entry X/Y placement stays Dev's screen-denominated choice**
  - Spec source: context-story-rb4-15.md, "NEW blimp.ts surface"
  - Spec text: names only the three Z/gate constants and two signatures
  - Implementation: spawn tests pin depth === BLIMP_Z_START plus finite/visible-on-arrival; INITBP's X-side selection (PLDELX) and Y MSB = 2 are not pinned; the ENTRY_NDC_* / SPAWN_NDC_Y_RANGE registry entries are retained
  - Rationale: not in the story's surface; the screen-scale sweep still forces any kept constant to stay NDC-denominated, and ROM-cited replacements self-classify
  - Severity: minor
  - Forward impact: a successor may transcribe INITBP's placement; the registry absorbs either path
- **The cockpit seed-finder is re-derived contract-agnostic**
  - Spec source: context-story-rb4-15.md, re-seat map (cockpit-loop WARN)
  - Spec text: "[WARN: destructures shouldSpawnBlimp/BLIMP_SPAWN_CHANCE/blimpOffScreen L90/92]"
  - Implementation: `seedThatSpawnsABlimp` reads RAW Rng floats against BLIMP_SPAWN_CHANCE (first draw wins + ≥3 winners in the first 6) instead of calling shouldSpawnBlimp
  - Rationale: the accepted roll's draw index now depends on wave decisions before the gate opens (and on Dev's draw-per-decision choice); a dense-rolling seed works for any reasonable wiring, identically on both sides of the migration
  - Severity: minor
  - Forward impact: if GREEN wiring consumes more than ~6 pre-gate draws from blimpRng, widen the density bound (noted in the helper comment)

### Dev (implementation)
- **Three ground-wiring boot stagings re-staged: seed 444 → 3, held trigger → FEATHERED trigger**
  - Spec source: tests/mountain-scroll-wiring.test.ts, tests/ground-collision-wiring.test.ts, tests/ground-target-wiring.test.ts (the rb4-7/rb4-8/rb4-11 shared seed-444 staging)
  - Spec text: "seed whose opening plane RUN the held trigger clears, reaching a ground slot"
  - Implementation: SEED_MS = 3 and a 6-on/6-off trigger feather in each staging loop; assertions untouched
  - Rationale: measured, not guessed — the old held-trigger clear existed ONLY because the drifter-era airship spawned on the opening decision (25 % of seeds; old code reaches ground on 5,746/30,000 seeds ≈ that rate) and SHOT the pilot, whose death sequence cools GUN.ST; a held gun otherwise locks out permanently at ~f31, and under the new gate ZERO of 30,000 seeds reach a ground slot. Feathered, the +1/shot heat never outruns the ×3 release cooling and most seeds clear (~f95 ground, exactly 2 deploys at 280)
  - Severity: moderate (test-staging change by Dev — flagged for verify-phase audit)
  - Forward impact: boot stagings must feather, not hold; the derivation is commented in each file
- **cockpit-draw-path: the N.PLNZ gate held open at the vi.mock seam; TOTAL_LIVE_SHELLS re-pinned 51 → 84**
  - Spec source: tests/shell/cockpit-draw-path.test.ts (TARGET TRUTH: "every plane and the airship")
  - Spec text: "checked > 5" + the pin's own instruction: "if a future change moves them, this fails and someone re-reads the numbers on purpose"
  - Implementation: a delegating shouldSpawnBlimp lifts the count past the gate (the roll still decides); the pin's history log gains the rb4-15 paragraph explaining the 33-frame delta
  - Rationale: a 24-frame sky cannot have shown four planes, so the REAL gate would empty the suite of the airship it exists to measure; and the old pinned sky's mid-run death (the drifter blimp's every-level fire) no longer happens — the ROM's level-0 airship is a target, not a threat, so the gun runs its whole magazine
  - Severity: moderate (test change by Dev — flagged for verify-phase audit)
  - Forward impact: none beyond the documented pin
- **cockpit-loop: TEA's flown-four-planes gate test replaced with the recorded-count gate test; gate held open at the seam**
  - Spec source: this session file, TEA Assessment ("the flown N.PLNZ gate is provable — planes shown at first blimp spawn ≥ 4")
  - Spec text: "the FIRST airship waits for the sky to show FOUR planes — the N.PLNZ gate, flown"
  - Implementation: the mock lifts the count and RECORDS what main.ts really passed; the gate test asserts every recorded planeCount equals the wave tap's own running sum (two independent recorders agreeing), non-vacuity via the opening wave
  - Rationale: the flown version is structurally impossible, measured twice over — a pilotless wave takes ~1,000 calc-frames to clear, the first fly-past arms the returning ace, and the ace's 4-calc-frame 50/50 passes kill an idle pilot into game over (which freezes the schedule) minutes before a fourth plane can appear
  - Severity: moderate (replaces a TEA-authored RED test — flagged for verify-phase audit)
  - Forward impact: the recorded-count pin discriminates simFrame/kills/constant wirings on the first decision
- **The airship's lateral state: deltaX = 0, placement denominated at the despawn line**
  - Spec source: context-story-rb4-15.md ("NEW blimp.ts surface") + TEA deviations 3-4 above
  - Spec text: the story names no lateral surface; TEA left X/Y "Dev's screen-denominated choice"
  - Implementation: spawn keeps its three Rng draws (side, lateral, y) and spends the NDC fractions at Z = 0x100 — the airship sits framed at the moment it flies past, a whisker off the boresight at entry; deltaX is 0 (step closes depth only)
  - Rationale: x/y are frozen for the life (BLOBJ+0C is the routed successor) while the visible window shrinks 16× as Z closes — any placement denominated at the ENTRY depth leaves the frame long before the reap
  - Severity: minor
  - Forward impact: the successor porting BLOBJ+0C re-derives placement; ENTRY_NDC registry prose needs a reword (Delivery Finding)

### Reviewer (audit)

Every deviation above is stamped; nothing rides unexamined:

- **reapBlimp narrowed to one argument** → ✓ ACCEPTED by Reviewer: the ROM despawn is a depth compare (re-read firsthand: CMP I,1 / BPL at :4266-4267); a dead aspect param is the rb4-1 poison pattern, and I verified the DECISION-PATH AST guard is arity-agnostic (bare-call shape check — screen-scale, rule-checker instance D confirms all three `blimp` writes comply).
- **"~32 frames" pinned as exactly 31** → ✓ ACCEPTED by Reviewer: derivation independently checked — 4096 − 128·30 = 256 (MSB 1, alive), step 31 → 128 < 0x100 cleared; the prose "~32" was an estimate and the pin is the machine's own arithmetic.
- **Lateral X velocity left unpinned** → ✓ ACCEPTED by Reviewer: BLMOTN :4235-4250 genuinely carries BLOBJ+0C; pinning "x frozen" would contradict the ROM, pinning the drift would exceed the story surface. Routed as a Delivery Finding — correct disposal.
- **Entry X/Y placement Dev's choice** → ✓ ACCEPTED by Reviewer: not in the story's named surface; the registry sweep still polices denomination. The stale registry prose is captured as a Dev Delivery Finding.
- **Seed-finder contract-agnostic** → ✓ ACCEPTED by Reviewer: reading RAW Rng floats decouples the harness from the migrating function — the right direction of coupling.
- **Three ground stagings re-staged (444→3, held→feathered)** → ✓ ACCEPTED by Reviewer: I independently diffed all three files — the ONLY code changes are the seed constant and the 6-on/6-off key script; zero `expect(` lines touched (test-analyzer confirms line-by-line). The forensics (0/30,000 seeds clear under a hold; the old blimp as executioner-coolant) are measurement, and the feather removes the staging's dependence on any entity's existence — a class fix.
- **cockpit-draw-path gate-open seam + TOTAL_LIVE_SHELLS 51→84** → ✓ ACCEPTED by Reviewer: the pin's ledger has re-measured five times by design ("re-reads the numbers on purpose"); test-analyzer MUTATION-PROVED the new 84 is causal — deleting the level gate moves it to 69, so the pin still bites. The seam mock delegates with the real signature (rule-checker #8) and the checked>5 floor still forces the airship's presence.
- **cockpit-loop gate test re-scoped to recorded counts** → ✓ ACCEPTED by Reviewer: the flown-4-planes version is impossible by measurement (the ace's 4-calc-frame 50/50 passes kill an idle pilot into schedule-freezing game over long before four planes). The recorded-count pin cross-checks two independent recorders and discriminates simFrame/kills/constant wirings on the first decision. Residual narrowness noted as a finding (see assessment observation 6) — non-blocking.
- **deltaX = 0, placement at the despawn line** → ✓ ACCEPTED by Reviewer: the watchability envelope derivation is sound (fixed x against a 16× shrinking window) and the screen-visible GROWTH property pins the consequence.

UNDOCUMENTED deviation found and recorded:
- **Gate-count ordering vs the ROM's interleave:** main.ts counts the CURRENT wave's planes before rolling in the same decision block, so the gate can open on the decision that shows the 4th plane; the ROM's N.PLNZ increment site (PLNZD :2396-2398) vs the gate read (:2325) interleave is not resolved by this story's citations, so the port may open the gate one wave-decision earlier than the strictest ROM reading. Not documented by TEA/Dev. Severity: LOW — at most one decision of skew, gated behind a 25 % roll, unobservable in normal play; a successor tracing PLNZD's call site can settle it.

## Sm Assessment

Setup triage complete; the story lives. Verified on disk, not by subagent claim:

- **Merge gate:** clear — zero open PRs in slabgorb/red-baron.
- **Dependencies:** rb4-1 (hex constants) and rb4-6 (enemy stepper, shared main.ts/test files) both `done` — the SEQUENCE AFTER constraint is satisfied.
- **Session + context:** context-story-rb4-15.md (7193 bytes) carries the ROM machine citations (INITBP :1425-1426, BLMOTN :4259-4270, spawn gate :2325-2331, SHLAUN :4027-4041) and the full 5-file sibling re-seat map VERBATIM from the sprint YAML description — spot-checked against source. context-epic-rb4.md untouched (md5 5f7f90d0 before and after).
- **Branch:** feat/rb4-15-blimp-approaching-airship cut from origin/develop, active in red-baron.
- **Story status:** in_progress via pf tooling.
- **Jira:** skipped by design — no Jira integration; jira_key is the story id.

Coordination notes for Imperator Furiosa (tea, red):

1. The RED suite must be RE-DERIVED from the ROM citations in the context file. A drafted blimp-approach.test.ts exists from rb4-6's red round — treat it as untrusted; do not copy it.
2. Mind the two WARN module-import collection risks in the re-seat map (screen-scale.test.ts L71, cockpit-loop.test.ts L90/92) — deleting drifter exports without a shim crashes whole unrelated files.
3. The 25% roll SURVIVES as the second ROM gate (AND 0C) — update those assertions, do not delete them.
4. Per epic convention (rb4-11 lesson in the TEA sidecar): a 3-arg ROM macro can emit 2 bytes — keep authentic duplicate points when transcribing.

## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `red-baron/tests/core/blimp-approach.test.ts` — NEW. The ROM machine, re-derived firsthand from the citable quarry this session (fingerprint verified: md5 497db93e…, :74/:621/:6217/:6281): the three hex constants, the two-gate spawn matrix (with arg-order discriminators in BOTH directions), the ÷4 + GMLEVL≥2 fire matrix, spawn/step/reap boundaries, and the exact 31-calc-frame life. The drafted rb4-6 file was NOT copied, per the story.
- `red-baron/tests/core/blimp.test.ts` — re-seated: the roll block becomes the surviving 25 % behind an OPEN gate; the drift-model block becomes the approach model; the ÷2/no-level-gate fire block becomes the SHLAUN gates (with the planeFires contrast INVERTED to level 2, where the blimp opens up and the plane still holds). Geometry, scoring, collision, explosion, spawn-integration and purity blocks untouched (SURVIVE list).
- `red-baron/tests/core/screen-scale.test.ts` — re-seated: import trimmed (blimpOffScreen / blimpDriftPerFrame retire with the drifter — the WARN'd collection crash cannot happen), flyCrossing → flyApproach through a dynamic reap mirror, the GROWTH property replaces edge-entry/crossing, the ROM-line reap DELIBERATELY INVERTS "never deleted while visible" (that was the crossing's contract), rb4-1's depth-sweep property is tombstoned with its rationale, registry entries re-worded (DRIFT_CROSSING_SECONDS tombstone, BLIMP_HULL_RADIUS despawn-role retirement).
- `red-baron/tests/cockpit-loop.test.ts` — re-seated: target-shape mirror over the migrating module, contract-agnostic dense-roll seed finder, states split into per-airship LIVES (a second spawn is legal under the gate), a second delegating tap on core/waves so the flown N.PLNZ gate is provable ("planes shown at first blimp spawn ≥ 4"), and the entry/step/approach/reap premises re-anchored. Run length 3000 display frames with scoped 30s timeouts (the first-release CI-timeout lesson).
- `red-baron/tests/core/depth-scale.test.ts` — re-seated: registry 5/7 re-pointed from the retired CRUISE_DEPTH to BLIMP_Z_START (ROM depth, deep-on-axis inversion of the mid-field premise, hex-spelling pins both ways); CRUISE_DEPTH tombstoned in the REGISTERED set alongside SHELL_DRAW_FAR/LOD_DISTANCE.
- `red-baron/tests/blimp-wiring.test.ts` — re-seated: AC-1 pins the TWO-argument shouldSpawnBlimp call (count first), AC-4 pins the TWO-argument blimpFires, AC-6 accepts the reap vocabulary; header scope updated.

**Tests Written:** 21 new (blimp-approach) + re-seats across 5 sibling files
**Status:** RED (failing — ready for Dev)

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| TS #1 type-safety escapes | every `as unknown as` cast carries a WHY comment (mid-signature-migration bridging, the rb4-7 contravariance lesson); no `as any`, no ts-ignore | enforced |
| TS #4 numeric-zero / NaN totality (house rule #4) | `x = 0 still closes`, `depth 0x100 exactly is ALIVE`, NaN/∞/negative matrices on gate, fire and reap | failing (RED) |
| TS #8 test quality — no vacuous tests | every universally-quantified cockpit guard paired with a same-file existence assert (`spawns ≥ 1`, `lives ≥ 1`); empty-fireFrames asserts backed by `need()` | self-checked |
| Epic citation discipline | every pinned number carries its RBARON.MAC line, read firsthand against the fingerprinted quarry — never copied from the story prose (the "depth gate can invert" lesson) | in test comments |

**Rules checked:** spec-vs-ROM conflicts: none found — every story citation verified EXACT (gate polarity CMP I,4/BCC, fire gates AND I,3 + DEX/DEX/BMI, despawn CMP I,1/BPL, all confirmed at the cited lines)
**Self-check:** 1 vacuous-guard risk found and fixed (the cockpit step-identity loop now asserts `lives ≥ 1` first)

**RED-state verification:** testing-runner reported only the six named files (its 120-test total is exactly their sum — see the new TEA sidecar lesson); independently confirmed with a FULL suite run: 81 files / 1362 tests — 42 failed, ALL 42 inside the six intended files, 1319 passed, 1 todo, zero collateral. `tsc --noEmit` clean. Committed as red-baron `09cfe48` on `feat/rb4-15-blimp-approaching-airship`.

**Handoff:** To The Word Burgers (Dev) for GREEN — the contract is the header of `tests/core/blimp-approach.test.ts`; the wiring notes are in the re-seat map of `context-story-rb4-15.md`.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `red-baron/src/core/blimp.ts` — the machine, re-built to the RED contract: BLIMP_Z_START/BLIMP_CLOSE_SPEED/BLIMP_PLANE_GATE (hex, cited), two-gate `shouldSpawnBlimp(planeCount, roll)`, SHLAUN-gated `blimpFires(frame, level)`, depth-closing `step`, one-argument `reapBlimp` at the Z < 0x100 line; drifter apparatus (CRUISE_DEPTH, DRIFT_CROSSING_SECONDS, blimpDriftPerFrame, blimpOffScreen) deleted; placement denominated at the despawn line (watchability envelope, commented derivation)
- `red-baron/src/main.ts` — `planesShown` (the N.PLNZ analog, +1 per spawnWave plane, cited), the two-argument gate call with the draw pattern preserved (no rng stream shift), the level threaded into both `blimpFires` call sites, the one-argument reap (the `drifted` local kept — it is load-bearing for screen-scale's taint guard), comments re-pointed from the drifter story
- `red-baron/tests/core/depth-scale.test.ts` — the three axis constants added to the arithmetic-sweep registry with DRINZ-precedent justifications (the sweep's own sanctioned path)
- `red-baron/tests/{mountain-scroll,ground-collision,ground-target}-wiring.test.ts` — re-staged (seed 3, feathered trigger); see the Design Deviations entry for the full forensics
- `red-baron/tests/shell/cockpit-draw-path.test.ts` — gate-open seam mock + TOTAL_LIVE_SHELLS 51 → 84 with its ledger paragraph
- `red-baron/tests/cockpit-loop.test.ts` — gate-open seam mock recording the real count; the flown-gate test re-scoped to the recorded-count pin (measured impossibility, see deviations); harness back to 2,000 frames

**Tests:** 1361/1361 passing + 1 todo, 81/81 files — full suite, verified twice locally (stable) and independently by testing-runner with matching grand totals. `tsc --noEmit` clean; `npm run build` clean.
**Branch:** feat/rb4-15-blimp-approaching-airship (pushed; commits 09cfe48 RED, cc19c4f GREEN)

**Test-side changes by Dev, called out for the verify phase:** the three re-staged ground suites, the two gate-open seam mocks, the TOTAL_LIVE_SHELLS re-pin, the cockpit-loop gate-test re-scope, and the depth-registry additions. Every one is measurement-backed (the forensics are in the Design Deviations) and none weakens an assertion on the blimp machine itself — but they are exactly the kind of Dev-touches-tests work the verify phase exists to audit adversarially.

**Handoff:** To Immortan Joe (reviewer) for code review — the Dev-touches-tests audit above is the first thing to sharpen the knives on.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (tests 1361/1361, tsc clean, build clean, hygiene clean, tree clean) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 2 (both low) | confirmed 2 as LOW (non-blocking, recorded as Delivery Findings) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A (3 rules, 6 instances verified — totality, purity, seed coercion) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A (15 rules, 47 instances, 0 violations; every mirror cast commented + fully used; every vi.mock wrapper signature matches the real one) |

**All received:** Yes (4 enabled returned — 2 with findings-status, both assessed; 5 disabled via settings)
**Total findings:** 2 confirmed (LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Same-session caveat, stated up front:** this session authored the RED and the GREEN. Per the sidecar rule, the adversarial subagents are the independence here, and they were weighted accordingly — the decisive evidence below is theirs (mutation-proven), not my own "it looks right".

**Data flow traced:** boot seed → `blimpRng` (sub-seeded, `^0x5eed`, coerced `>>>0`) → one roll draw per wave decision (short-circuit shape unchanged, stream not shifted) → shouldSpawnBlimp(planesShown, roll) with planesShown fed only by spawnWave output (+= enemies.length, the N.PLNZ analog) → spawn(rng, aspect) at depth 0x1000 → step closes 0x80/calc-frame → blimpFires(simFrame, level) gates the enemy-fire cue AND the hit roll (drawn unconditionally on fire-frames, effect gated on the pilot being alive) → beginEol('shells') → loseLife — safe end to end because every function in the chain is total on degenerate numerics (security subagent verified all four, instance by instance) and the reap bounds the object's life at the ROM line.

**Pattern observed:** the reap stays ONE bare call with no operator (`blimp = reapBlimp(drifted)` at src/main.ts:752), preserving rb4-1's hard-won decision-path shape under a signature change — and the load-bearing local name `drifted` was deliberately kept for the taint guard's non-vacuity check, with a comment saying so.

**Error handling:** degenerate inputs fail safe at every new seam — NaN planeCount is not four planes, a NaN roll conjures nothing, a non-finite airship is reaped not left firing (src/core/blimp.ts:154, :203-206, :300-302); a NaN produced by step cannot outlive the same frame's reap (composition verified by the security pass).

**Observations (tagged, plain text):**
1. [VERIFIED] The six ROM constants match the quarry, re-read firsthand THIS review at the three polarity-critical sites: CMP I,1 / BPL at :4266-4267 (Z >= 0x100 lives — port `depth < 0x100 → null`, boundary exact), DEX/DEX/BMI at :4038-4041 (fires at GMLEVL >= 2), CMP I,4 / BCC + AND I,0C at :2325-2330 (two-gate spawn). Complies with rule B (hex spelling + citations — rule-checker verified all six declarations).
2. [TEST] Mutation evidence from the analyzer: reap `<`→`<=` caught in three files; gate `&&`→`||` caught; deleting the level gate moves TOTAL_LIVE_SHELLS 84→69 — the re-pin BITES, it is not a rubber stamp; Math.random noise in step caught by the constant-rate pin. The two LOW findings it raised are confirmed and recorded as Delivery Findings.
3. [SEC] Clean — totality on all four signatures verified instance-by-instance; core purity intact (only injected Rng randomness); the ?seed= path untouched with its >>>0 coercion in place.
4. [RULE] Clean across 15 rules / 47 instances — every as-unknown-as cast is commented AND its mirror fully consumed; every vi.mock wrapper's parameter list matches the real signature (the rb4-6 silent-argument-drop trap explicitly checked, instance by instance); all three `blimp` writes are bare producer calls.
5. [VERIFIED] The three re-staged ground suites changed ONLY {SEED_MS, key script} — I diffed the code lines myself and the analyzer confirmed line-by-line: zero assertion changes. The re-stage forensics (the drifter blimp as executioner-coolant; 0/30,000 hold vs 5,746/30,000 old ≈ the 25 % spawn rate) are measurement, not narrative.
6. [LOW] In-cockpit roll obedience has a narrow residual (single wave decision in the 2,000-frame window — a call-but-ignore wiring is indistinguishable there); pre-existing exposure, not a regression, recorded as a Delivery Finding with the closing cross-count sketched.
7. [LOW] Gate-count ordering vs the ROM's PLNZD interleave — recorded as an UNDOCUMENTED deviation in the audit; at most one decision of skew behind a 25 % roll.

### Rule Compliance

Mapped to the TypeScript lang-review checklist via the rule-checker's exhaustive sweep (its per-instance table stands as the record): #1 type-safety escapes — 4 casts, all justified/commented, none in src; #2 generics — clean; #3 enums — none; #4 null/undefined — clean (no ||-for-?? on zero-valid values); #5 modules — import type used correctly at 6 sites; #7 async — clean; #8 test quality — every mock wrapper signature matches the real implementation; #11 error handling — the catch{} + need() RED-friendly house pattern, not a swallow. Institutional rules: A core purity — clean; B hex + citations — all six constants; C no geometry constants in main.ts — clean; D blimp-write shape — all three writes comply.

### Devil's Advocate

Argue it is broken. First target: the seam mocks. Two cockpit suites now hold the spawn gate open, so no booted test ever watches the gate CLOSE — a regression that made shouldSpawnBlimp return true below four planes would sail through both cockpits. What stops it is the pure matrix in blimp-approach.test.ts (below-four-always-false, mutation-proven against `&&`→`||`) plus the recorded-count pin proving main.ts feeds the real count. The composition — pure gate correct, real count delivered, call shape pinned — covers the gate the flown test cannot, and the impossibility of the flown version is measured, not asserted. Second target: the feathered stagings. Did re-staging LAUNDER a behavioural regression — did the old suites' held-trigger sky test something the feathered sky no longer does? The old sky's distinguishing content was the drifter blimp's mid-run kill of the pilot — a mechanic this story deletes ON PURPOSE, with the ROM's own lines saying the level-0 blimp cannot fire. Nothing else in those suites' assertions referenced the trigger pattern. Third: the 84 re-pin could be masking a shell-pool regression that coincidentally lands on 84 — but the analyzer's gate-deletion mutation moved it to 69, so the number is causally coupled to exactly the mechanic this story shipped. Fourth: what would a stressed browser do? A long rAF stall feeds the accumulator's existing 250 ms cap (untouched); the blimp cannot double-step past the reap line unseen because the reap is depth-based and runs every calc frame. Fifth: a confused future Dev could re-order `planesShown +=` after the roll and silently shift the gate by one wave — the recorded-count pin would catch the mismatch on the first decision (counts would no longer equal the wave-tap sum at the recorded display frame — actually it would still match if both moved together; this is exactly observation 7's residual, LOW, logged). Nothing here rises above LOW; the devil concedes.

**Handoff:** To The Organic Mechanic (SM) for finish-story — PR creation and merge are the finish phase's business.