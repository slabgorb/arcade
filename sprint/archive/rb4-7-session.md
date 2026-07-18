---
story_id: "rb4-7"
jira_key: "rb4-7"
epic: "rb4"
workflow: "tdd"
---
# Story rb4-7: THE MISSION CLOCK — difficulty ramps twice as fast, and waves come in RUNS not alternation

## Story Details
- **ID:** rb4-7
- **Jira Key:** rb4-7
- **Workflow:** tdd
- **Stack Parent:** rb4-1 (completed)
- **Branch:** fix/rb4-7-mission-clock-wave-runs
- **Points:** 8
- **Priority:** p1
- **Type:** bug

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-18T06:48:26Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T03:07:04Z | 2026-07-18T03:09:55Z | 2m 51s |
| red | 2026-07-18T03:09:55Z | 2026-07-18T03:38:51Z | 28m 56s |
| green | 2026-07-18T03:38:51Z | 2026-07-18T06:25:26Z | 2h 46m |
| review | 2026-07-18T06:25:26Z | 2026-07-18T06:48:26Z | 23m |
| finish | 2026-07-18T06:48:26Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings at setup.

### TEA (test design)
- **Conflict** (blocking): The wave clock interface changes — `WaveClock` is now `{modect, newct}` (NEWCT counts WAVES) and `stepWaveClock` is called ONCE PER COMPLETED WAVE, not every clear-sky calc frame. Affects `src/main.ts` (the `stepWaveClock(waveClock)` call at ~:686 must move from the per-frame `enemies.length===0 && wrecks.length===0` tick to a wave-COMPLETION edge, and `waveClock.countdown` reads become `newct`) and `src/core/waves.ts` (`INITIAL_WAVE_CLOCK` → `{modect:0, newct:4}`, `interWaveDelay` retires, `stepWaveClock` rewritten). *Found by TEA during test design.*
- **Improvement** (non-blocking): AC-3's exact "0.48–3.07 s" inter-wave gap is NOT pinned as a hard number — it is EMERGENT from PLSTAT+7, the per-plane "^20 FRAMES TO CROSS CENTER" flight timer (RBARON.MAC:2361, 0x20=32 calc frames ≈ 3.07 s), which is set per plane and gates NWPLNE's DEC NEWCT. There is no single settable clock constant for it, so I pinned the MECHANISM (NEWCT counts waves; the clock does not expire on a 1–4 frame countdown) and left the observable seconds to fall out of the wave-clear duration. Affects `src/core/waves.ts` (do NOT re-introduce a per-frame delay to "hit" a seconds figure). *Found by TEA during test design.*
- **Gap** (non-blocking): AC-4's ground-mode-END condition is fully pinned as a predicate `groundModeEnds(grndct, visibleGroundObjects) === (grndct===0 && visibleGroundObjects===0)`, but its VISIBLE-object input and the GRNDCT-decrement trigger (GTIMER time-out / object cross, RBARON.MAC:3426-3432) are supplied by the PFOBJ ground objects that **rb4-11** adds — they do not exist yet. Until rb4-11, `visibleGroundObjects` is 0 and the condition reduces to "GRNDCT spent". Affects `src/core/waves.ts` (wire the real visible-count + GRNDCT decrement when rb4-11 lands). *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): Enemy planes do NOT despawn on their own within a bounded window — a probe booted the cockpit with NO fire and the opening lone plane was still alive after 800 calc frames (≈76 s); the only way the sky clears is an aimed kill. Real play is fine (the pilot aims), but any HANDS-OFF / no-aim automated staging can stall the wave clock (a multi-plane wave whose drone the fixed-forward trigger never hits). Affects `src/core/enemy.ts` (rb4-6's "fly past P.MNDP and be destroyed" apparently does not fire for a level-0 plane in a bounded time — worth a look in the enemy epic). *Found by Dev during implementation.*
- **Gap** (non-blocking): main.ts's ground-mode duration is a placeholder — GRNDCT decrements once per ground-mode frame instead of on the ROM's GTIMER mountain-object time-out (RBARON.MAC:3426-3432), and `visibleGroundObjects` is hard-coded 0. Affects `src/main.ts` + `src/core/waves.ts` (rb4-8 GTIMER pacing + rb4-11 ground objects should replace both so the ground wave lasts its authentic duration). *Found by Dev during implementation.*

### Reviewer (code review)
- No new upstream findings — every issue raised in review (RED-era double-casts, blimp over-roll, gmlevlForKills int32 wrap, stale/undercounted comments) was FIXED in-branch (commit `ecf605f`) and re-verified. The two Dev Gap findings above (enemy despawn under no-aim; placeholder ground-mode duration) are confirmed and stand for the enemy epic / rb4-8 / rb4-11. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC-3 exact "0.48–3.07 s" gap pinned as MECHANISM, not seconds**
  - Spec source: context-story-rb4-7.md, AC-3
  - Spec text: "NEWCT counts WAVES, not frames — the inter-wave gap is 0.48-3.07 s, not 96-384 ms."
  - Implementation: mission-clock.test.ts pins that NEWCT counts waves (one `stepWaveClock` call = one completed wave; the clock never expires on a 1–4 frame countdown) and the run structure; it does NOT assert the literal seconds range.
  - Rationale: the seconds are emergent from PLSTAT+7 (per-plane cross-center flight time, RBARON.MAC:2361), not a settable clock constant — pinning the literal would be a fabricated constant (the tp1-13 / rb4-4 "pin the mechanism, route the derived value" lesson). Routed to a Delivery Finding.
  - Severity: minor
  - Forward impact: none — Dev must NOT add a per-frame delay to hit a seconds figure.
- **Re-seated the shipped tests that pinned the BUGGY behavior (inverted, not deleted)**
  - Spec source: context-story-rb4-7.md, AC-1 / AC-2 / AC-3
  - Spec text: "the kill count is HALVED before the lookup" / "MCOUNT is indexed by MODECT>>1" / "NEWCT counts WAVES, not frames."
  - Implementation: scoring.test.ts (3 ramp assertions flipped from `PLNLVL[k]` to `PLNLVL[k>>1]`), waves.test.ts (the frame-countdown `stepWaveClock scheduler` block + `interWaveDelay` sub-tests retired, MCOUNT re-scoped to a run-length table), ground-mode.test.ts (the scheduler-agreement test re-driven on the new per-completion clock). Kept-behavior assertions (monotonicity, MCOUNT bytes, isPlaneWave parity, the [32,33,…]→max saturation) preserved and verified green under both old and new source.
  - Rationale: the shipped suites encode the difficulty-2× and 1:1-alternation defects; left un-touched they would flip RED the moment Dev implements the fix and trap him (Dev makes tests pass, not moves goalposts). TEA owns test maintenance.
  - Severity: minor
  - Forward impact: none — the re-seats are the RED target; Dev's fix turns them green.
- **AC-4 pinned as a CONDITION predicate; the ground-object half parameterized**
  - Spec source: context-story-rb4-7.md, AC-4
  - Spec text: "Ground mode ends when GRNDCT is spent AND no ground objects remain visible, not on a timer."
  - Implementation: pinned `GRNDCT_INITIAL === 2` and `groundModeEnds(grndct, visibleGroundObjects) === (grndct===0 && visibleGroundObjects===0)`, exercised across a full (grndct × visible) grid to prove it is NOT a timer. The visible-object COUNT is a parameter (0 until rb4-11 supplies PFOBJ ground objects).
  - Rationale: ground objects don't exist in the clone (rb4-11's scope) — pin the mechanism now, route the content (the tp1-13 "AC on a phase that doesn't fully exist" pattern). Composes cleanly when rb4-11 lands.
  - Severity: minor
  - Forward impact: rb4-11 wires the real visible-count + GRNDCT decrement (Delivery Finding filed).

### Dev (implementation)
- **Wired groundModeEnds into main.ts with a placeholder GRNDCT pacing (AC-4 integration)**
  - Spec source: context-story-rb4-7.md, AC-4 + TEA Delivery Finding (Gap)
  - Spec text: "Ground mode ends when GRNDCT is spent AND no ground objects remain visible, not on a timer."
  - Implementation: main.ts's ground slot arms `grndct = GRNDCT_INITIAL` (2) and holds ground mode until `groundModeEnds(grndct, 0)`. The ROM paces GRNDCT off GTIMER (mountain-object time-out, RBARON.MAC:3426-3432); GTIMER + the visible ground objects are rb4-11/rb4-8, so I decrement grndct once per ground-mode frame and pass `visibleGroundObjects = 0`. The mode lasts ~3 calc frames (grndct 2→0) — enough for the ground-collision drive to run with mountains up — and cannot soft-lock.
  - Rationale: the AC-4 predicate needed a real consumer in the loop (not just a unit-pinned function); the placeholder pacing keeps the game playable until rb4-11 supplies the GTIMER + ground objects that make the duration authentic.
  - Severity: minor
  - Forward impact: rb4-11 replaces the per-frame decrement with GTIMER pacing and the real visible-object count.
- **Re-baselined the cockpit determinism snapshot (52 → 51)**
  - Spec source: tests/shell/cockpit-draw-path.test.ts (TOTAL_LIVE_SHELLS)
  - Spec text: "If a future change moves them, this fails and someone re-reads the numbers on purpose."
  - Implementation: the NEWCT-counts-waves schedule changes the seeded sequence of planes, so one shell is consumed a frame sooner across the run; updated the pinned count 52→51 with a cited comment.
  - Rationale: exactly the deliberate re-read the guard exists to force — the count is a property of the (still deterministic) code, not a threshold sliding to zero.
  - Severity: minor
  - Forward impact: none.
- **Re-staged the rb4-4 ground-collision-wiring test (seed 12345→444, window 150→220) — USER-APPROVED**
  - Spec source: tests/ground-collision-wiring.test.ts (rb4-4 sibling), + user ruling (full re-stage)
  - Spec text: the suite boots the cockpit, holds fire, and asserts ground-collision is consulted while mountains are up during a ground wave.
  - Implementation: under the run-schedule the first ground wave now follows the opening MODECT-0 run of 4 plane waves, not the old 1:1 alternation — seed 12345's run stalls under fixed-forward (un-aimed) fire (a multi-plane wave the trigger can't finish), so it never reaches a ground slot. Seed 444 (probe-selected) fields a run the held trigger clears, entering the ground slot at ~calc frame 107; the window is extended to 220 frames. The four assertions and their intent are UNCHANGED.
  - Rationale: the suite's staging was coupled to the buggy 1:1 alternation; the fix legitimately moved the first ground wave later. The user chose a full re-stage over routing so the ground-collision DRIVE stays covered.
  - Severity: minor
  - Forward impact: none — the DRIVE remains pinned end-to-end; a future aim-capable harness could revert to seed 12345.

### Reviewer (audit)
Every TEA and Dev deviation was audited against the ROM (RBARON.MAC, byte-verified) and the diff:
- **TEA — AC-3 gap pinned as MECHANISM, not seconds** → ✓ ACCEPTED. The "0.48–3.07 s" is emergent from PLSTAT+7 (:2361), not a settable clock constant; pinning the mechanism (NEWCT counts waves) and routing the derived seconds is the correct tp1-13/rb4-4 discipline. Dev correctly did NOT re-introduce a per-frame delay.
- **TEA — re-seated the shipped tests that pinned the buggy behavior** → ✓ ACCEPTED. Mutation-confirmed by reviewer-test-analyzer (MCOUNT %8↔>>1 and &&↔|| both go red); kept-behavior guards preserved, coverage not weakened.
- **TEA — AC-4 pinned as a CONDITION predicate; object-visibility parameterized** → ✓ ACCEPTED. The predicate matches PFOBMN (:3269-3293); the rb4-11 dependency is honestly parameterized (visibleGroundObjects=0 until then).
- **Dev — wired groundModeEnds into main.ts with a placeholder GRNDCT pacing** → ✓ ACCEPTED. The AC-4 predicate has a real consumer; reviewer-security confirmed no soft-lock/spin. Placeholder GTIMER pacing + the caller-handled GRMODE/GREND gates are now documented (reviewer fix).
- **Dev — re-baselined the determinism snapshot 52→51** → ✓ ACCEPTED. reviewer-test-analyzer proved it causal (reverting the source restores 52); the guard's own "re-read on purpose" path.
- **Dev — re-staged ground-collision-wiring to seed 444 / 220 frames** → ✓ ACCEPTED. reviewer-test-analyzer confirmed ground mode is genuinely entered at frames 107–109 with real mountains (>0) — not a coincidental pass; user-approved full re-stage.

No undocumented spec deviations found.

---

## Sm Assessment

**Setup complete — routing to RED (TEA).**

- **Story:** rb4-7 — THE MISSION CLOCK: difficulty ramps twice as fast, and waves come in RUNS not alternation (8 pts, p1, bug).
- **Scope (from epic-rb4.yaml):** Cluster C6 subsumes MI-003/MI-004/MI-005/MI-007/MI-008/MI-009/CB-001/CD-009. Three major bugs:
  1. GMLEVL indexes PLNLVL by OBJKLD>>1 — the ROM HALVES the kill count before the table lookup (RBARON.MAC:2399-2408), so our difficulty ramps exactly TWICE AS FAST as the arcade's.
  2. MCOUNT is indexed by MODECT>>1; a ground MODECT reloads NEWCT=1; MODECT wraps modulo 16 — we run 1:1 air/ground alternation instead of RUNS of plane waves; our inter-wave gap is ~10x too short.
  3. Ground mode ends on a CONDITION (GRNDCT spent AND no live ground objects), not a countdown; ours lasts ~0.4 s.
- **Acceptance criteria (5 ACs):** difficulty ramp halved, wave runs gated by MODECT/NEWCT, ground mode ends on exhaustion, inter-wave gap ~0.48–3.07 s, depends on rb4-1.
- **Dependencies:** Blocks every wave/difficulty story downstream. Depends on rb4-1 (COMPLETED — the radix sweep). No blocking PRs.
- **Critical citation discipline:** Every ROM citation must be verified against ~/Projects/red-baron-source-text (LF-only, RBARON.MAC = 6294 lines, .RADIX 16 from :74). The CRLF sibling reference/red-baron/ is NOT citable (staircase line mismatch). The ONLY citation the story description supplies is **RBARON.MAC:2399-2408** (AC-1, GMLEVL/OBJKLD>>1 lookup) — TEA must independently derive the wave-run (MCOUNT/MODECT/NEWCT — AC-2/AC-3) and ground-mode-exit (GRNDCT + live-object condition — AC-4) citations from the citable source. Do NOT trust any line number not verified against the LF copy; sm-setup has a documented history of stapling real quotes onto wrong lines in this repo.
- **Technical approach (from description):**
  - AC-1: GMLEVL = PLNLVL[min(OBJKLD >> 1, 0x10)] — the kill count is HALVED before the lookup, and the clamp is 0x10 = 16.
  - AC-2: MCOUNT is indexed by MODECT>>1; a ground wave reloads NEWCT=1; MODECT wraps modulo 16 (AND I,0F).
  - AC-3: NEWCT counts WAVES, not frames — the inter-wave gap is 0.48–3.07 s, not 96–384 ms.
  - AC-4: Ground mode ends when GRNDCT is spent AND no ground objects remain visible, not on a timer.
  - AC-5: Depends on rb4-1.
- **Red-baron branch strategy:** gitflow (default branch develop). Branch created: `fix/rb4-7-mission-clock-wave-runs` off current `develop`.
- **No Jira** (local tracking only). No blocking PRs. Merge gate clear.

Handing the wheel to TEA for the RED phase.

---

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (21 failing, ready for Dev) — full suite 21 failed / 1111 passed / 1 todo, `tsc --noEmit` clean.

Every ROM citation below was verified against the CITABLE byte-of-record `~/Projects/red-baron-source-text/RBARON.MAC` (md5 497db93e…, 6294 lines, `:74 = .RADIX 16`, `:621 = CALCNT =18`). The CRLF sibling `reference/red-baron/` was NOT used.

**Test Files:**
- `tests/core/mission-clock.test.ts` (NEW) — 18 tests, all four ACs. **18/18 RED.**
- `tests/core/scoring.test.ts` (re-seat) — AC-1 ramp block flipped from the direct index to `>>1`. 2 RED (the value-changing pins), rest green.
- `tests/core/waves.test.ts` (re-seat) — retired the frame-countdown `stepWaveClock` scheduler + `interWaveDelay`; MCOUNT re-scoped to a run-length table. 0 RED (kept-valid tests stay green).
- `tests/core/ground-mode.test.ts` (re-seat) — scheduler-agreement test re-driven on the new per-completion clock. 1 RED.

**What the RED pins (the ROM machine, not the story's prose):**
- **AC-1** (RBARON.MAC:2399-2408 + PLNLVL :2478): `gmlevlForKills(k) === PLNLVL[min(k>>1, 16)]`. Headline invariant `gmlevlForKills(2k) === PLNLVL[k]` (a level now takes TWICE the kills). Clamp bites at 32 kills (`k>>1 === 16`), 31 is one below. The `LSR` collapses 2k/2k+1 to one level.
- **AC-2** (RBARON.MAC:2258-2273 + MCOUNT :1298 + GMINIT :1220-1222): a plane MODE runs `MCOUNT[MODECT>>1]` waves (MODECT 2 → MCOUNT[1]=2, NOT the shipped `MCOUNT[2]=3`); a ground MODE reloads `NEWCT=1`; MODECT wraps mod 16 (`AND I,0F`) — the run structure repeats after 16 modes.
- **AC-3** (RBARON.MAC:2258, three gates :2242/:2244/:2253): NEWCT counts WAVES — the game opens with a RUN of 4 plane waves before the first ground wave (impossible under the shipped 1:1 alternation); one `stepWaveClock` call = one completed wave, never a per-frame countdown. Run sequence `4,2,3,2,1,3,4,2`.
- **AC-4** (RBARON.MAC:3269-3293 + INITGR :1403): `GRNDCT_INITIAL === 2`; `groundModeEnds(grndct, visibleGroundObjects) === (grndct===0 && visibleGroundObjects===0)`, proven across a full grid to be a CONDITION, never a timer.

**Rule Coverage (TypeScript / lang-review):** totality pinned on every new function (a non-finite/negative kill count → level 0; `groundModeEnds` returns a boolean on any state; MODECT stays in 0..15 across 200 steps). No vacuous assertions — each RED value is a literal (`0`, `1`, `2`, `4`, `PLNLVL[k]`), never re-derived from the constant under audit. Self-check: 0 vacuous tests found.

**Deviations logged:** 3 (AC-3 seconds → mechanism; shipped-test re-seats; AC-4 predicate + parameterized object-visibility). **Delivery Findings:** 3 (blocking wave-clock interface migration for main.ts; AC-3 timing routed; AC-4 object-visibility → rb4-11).

**Contract for Dev (GREEN):**
- `scoring.ts`: `gmlevlForKills` → `PLNLVL[min(objkld >> 1, PLNLVL.length-1)]`.
- `waves.ts`: `WaveClock = {modect, newct}`; `INITIAL_WAVE_CLOCK = {modect:0, newct:4}`; `stepWaveClock` called per completed wave (DEC newct; on 0 → `modect=(modect+1)&0x0F`, `newct = isPlaneWave(modect) ? MCOUNT[modect>>1] : 1`); `interWaveDelay` retires; add `GRNDCT_INITIAL=2` + `groundModeEnds`.
- `main.ts`: rewire the `stepWaveClock` call from the per-frame clear-sky tick to a wave-COMPLETION edge; `waveClock.countdown` → `newct`.

**Handoff:** To The Word Burgers (Dev) for GREEN.

---

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 1132/1132 passing (GREEN) + 1 todo — `tsc --noEmit` clean, `vite build` clean.
**Branch:** `fix/rb4-7-mission-clock-wave-runs` (pushed to origin)
**Commit:** `3d268b6`

**Files Changed:**
- `src/core/scoring.ts` — AC-1: `gmlevlForKills` = `PLNLVL[min(Math.max(0, floor(objkld)) >> 1, 16)]`. The ROM's `LSR` (RBARON.MAC:2403) halves the kill count before the lookup; we indexed by OBJKLD directly and ramped twice as fast.
- `src/core/waves.ts` — AC-2/AC-3: `WaveClock` is now `{modect, newct}` (NEWCT = waves remaining in the MODE's run); `INITIAL_WAVE_CLOCK = {modect:0, newct:MCOUNT[0]=4}`; `stepWaveClock` steps per COMPLETED wave (DEC newct; on 0 → `modect=(modect+1)&0x0F`, `newct = isPlaneWave(modect) ? MCOUNT[modect>>1] : 1`); `interWaveDelay` retired. AC-4: added `GRNDCT_INITIAL=2` + `groundModeEnds(grndct, visibleGroundObjects)`.
- `src/main.ts` — the wave loop is a small state machine: the opening wave comes off the initial clock (no step); a plane wave's completion advances the schedule; a ground slot arms GRNDCT and holds ground mode until `groundModeEnds` (never a timer), then resumes the run. `stepWaveClock` moved off the per-frame clear-sky tick onto the wave-COMPLETION edge (TEA's blocking finding).
- `tests/shell/cockpit-draw-path.test.ts` — determinism snapshot re-baseline 52→51 (the guard's intended "re-read on purpose").
- `tests/ground-collision-wiring.test.ts` — re-staged to seed 444 + a 220-frame window (USER-APPROVED full re-stage): the first ground wave now follows the opening 4-plane RUN, not the old 1:1 alternation.

**How GREEN was reached & verified:** all four ACs implemented to the ROM machine TEA pinned; the two sibling booted-cockpit tests that broke on the (correct) schedule change were re-baselined/re-staged per the user's ruling, preserving their intent. Verified end-to-end via the booted-cockpit suites (they drive the REAL main.ts loop + render path), a scratch probe confirming the 4-plane-run→ground-slot structure, tsc, and the production build.

**Two non-blocking Delivery Findings filed for Dev:** (1) planes don't self-despawn under no-aim within a bounded window — an rb4-6/enemy observation the re-stage surfaced; (2) the ground-mode duration is a placeholder pending rb4-8 GTIMER + rb4-11 ground objects.

**Handoff:** To Immortan Joe (Reviewer) for code review.

---

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1132 pass, tsc + build clean, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — Reviewer covered edges (int32, NaN, bounds, soft-lock) directly |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no new swallowed errors (test try/catch is the house pattern) |
| 4 | reviewer-test-analyzer | Yes | findings | 6 | confirmed 4 (3× as-unknown-as → FIXED; NaN gap → noted), dismissed 0, deferred 2 (372/357 low-value) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — Reviewer + rule-checker covered docs (stale header, citation gates) → FIXED |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — Reviewer covered types (WaveClock readonly, cast) → FIXED |
| 7 | reviewer-security | Yes | findings | 1 | confirmed 1 (int32 wrap → FIXED); verified stepWaveClock/state-machine/purity clean |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — Reviewer judged complexity (blimp `decided` flag warranted, no dead code) |
| 9 | reviewer-rule-checker | Yes | findings | 7 | confirmed 7 (casts×3, readonly, stale header, citation gate, line-count) → all FIXED; 11 citations byte-verified |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`, domains covered by Reviewer directly)
**Total findings:** 8 confirmed (6 fixed in-branch, 2 low-value deferred), 0 dismissed

## Reviewer Assessment

**Verdict:** APPROVED

All confirmed findings were non-blocking (no Critical/High) and the clean ones were fixed in-branch (`ecf605f`) and re-verified. Findings, tagged by source:

- [SEC] gmlevlForKills used `>> 1` → int32-wraps a ≥2³¹ kill count negative → PLNLVL off-table (undefined). Unreachable (~2 billion kills) and self-healed by `level=0` defaults, but a diff-introduced totality regression. **FIXED** → `Math.floor(.../2)` (scoring.ts:130). Severity LOW.
- [RULE][TYPE] `as unknown as WavesModule` double-cast (mission-clock/waves/ground-mode tests) — RED-era scaffolding, unwarranted now that GREEN ships `WaveClock {modect,newct}`. Independently tsc-verified by test-analyzer AND rule-checker that a single `as WavesModule` compiles. **FIXED** (3 files) + stale "during RED" comments corrected. Severity MEDIUM (disabled compiler drift protection).
- [DOC] main.ts header still said stepWaveClock brings a wave "after its inter-wave gap" — stale after the NEWCT rewrite. **FIXED**. And groundModeEnds' PFOBMN citation undercounted two caller-handled gates (`BIT GRMODE`/`BIT GREND`, :3286-3289) — **FIXED** (documented as isGroundMode + `dying===null` covered). RBARON.MAC line count 6294→6293 (independently re-counted). **FIXED**. Severity LOW.
- [RULE] ground-mode.test.ts inline WaveClock lacked `readonly` vs its siblings. **FIXED**. Severity LOW.
- [Reviewer own] main.ts blimp BLMOTN roll fired on ground-deploy frames too, over-rolling the shared blimpRng during a multi-frame ground wave. **FIXED** → gated to once per wave DECISION (old `wasDecision` semantics). Severity MEDIUM (unintended determinism shift). [SIMPLE] the `decided` flag it adds is minimal and warranted.
- [TEST] test-analyzer flagged mission-clock.test.ts:372 (typeof-only) and :357 (restates the AC-4 formula) as low-value, and :606 (no `stepWaveClock(NaN)` totality test). DEFERRED — 372/357 are harmless redundancy over the exhaustive truth-table; the NaN state is unreachable via the module's own API (callers only pass module-produced clocks). Noted, not blocking.
- [EDGE] (no subagent) Reviewer-checked: `MCOUNT[modect>>1]` in-bounds for all modect∈0..15; `(modect+1)&0x0f` self-heals any input; the ground-mode state machine advances ≤1 slot/frame with no soft-lock (grndct monotonically →0) and no spin. VERIFIED.
- [SILENT] (no subagent) No swallowed errors or silent fallbacks introduced; the tests' `try{import}catch{={}}` is the established RED-friendly house pattern with a `need()` runtime guard. VERIFIED.

### Rule Compliance (TypeScript lang-review, 13 checks + src/core purity + citation accuracy)
- #1 type-safety-escapes: the three `as unknown as` were the only violations — **FIXED** to single casts. No `as any`, `@ts-ignore`, or unsafe `!`.
- #3 exhaustiveness: scoreKill's `switch(kind)` retains `default: assertNever(kind)`. Compliant.
- #4 null/undefined: grepped the diff — zero added `||`/`??`; gmlevlForKills, stepWaveClock, groundModeEnds, and the main.ts block all use explicit comparisons. Compliant.
- #8 test-quality: covered above (casts fixed; two low-value tests noted).
- #14 src/core purity: waves.ts + scoring.ts have no DOM/Date.now/Math.random — VERIFIED by grep and independently by rule-checker. Compliant.
- #15 citations: all 11 distinct RBARON.MAC citations byte-verified against the LF copy by rule-checker; the two comment gaps FIXED.

### Data flow traced
`kills` (OBJKLD, incremented per real in-game kill, main.ts:652/664) → `gmlevlForKills(kills)` → `PLNLVL[min(kills>>1,16)]` → the GMLEVL that widens the enemy weave (enemy.ts) and sizes spawns. No external input reaches it (no URL param, no JSON, no network); a non-finite/negative value clamps to level 0. Safe.

### Pattern observed
The main.ts wave loop (main.ts:686-729) is a clean 3-branch state machine (opening / plane-completion / ground-hold) driven by the pure `stepWaveClock` reducer — mirrors the ROM's NWPLNE dispatch. Good pattern.

### Devil's Advocate
Assume this is broken. **The wave clock is a state machine driven by mutable module-scope `waveClock`/`grndct`/`waveOpened` — could it desync?** A malicious/confused sequence: game-over mid-ground-wave. Traced it: the `!gameOver` guard freezes the whole block, and there is no in-place restart path (game-over → attract seat, main.ts:506), so `waveOpened`/`grndct` never go stale — but if a restart is EVER added (rb-future), whoever adds it MUST reset all three, and nothing enforces that today. A latent trap, not a current bug. **What if a plane wave never clears?** The probe proved it: under no-aim fire the sky never empties, so the schedule stalls at ~3 waves — but that is pre-existing enemy-despawn behavior (filed as a Dev finding), and real aimed play advances normally; my fix did not cause it, it EXPOSED it. **Could the blimp gate drop a legitimate roll?** `decided` defaults true and is cleared only on the pure grndct-deploy tick, so opening/completion/ground-end all still roll — the exhaustive suite (1132) stays green, and a blimp still spawns in the lull. **Could gmlevlForKills return undefined for a stressed input?** Only above 2³¹ kills, now hardened to floor-divide; every finite input maps to a real rung. **Could the NaN-freeze in stepWaveClock strand a real game?** Only if a caller fabricates `{newct:NaN}` — no code does; the clock is always produced by the module. **Could a re-baselined snapshot hide a regression?** test-analyzer proved the 52→51 causal and the seed-444 ground wave real (frames 107-109, mountains>0), so neither re-baseline is a masked failure. Nothing survived as a blocking defect.

**Error handling:** non-finite/negative kills → level 0 (scoring.ts:129); grndct clamped ≥0; MCOUNT index always in range; state machine cannot soft-lock or spin. Verified at scoring.ts:129, waves.ts:199-207, main.ts:686-729.

**Handoff:** To SM for finish-story.

---