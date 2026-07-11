---
story_id: "rb3-2"
jira_key: ""
epic: "rb3"
workflow: "tdd"
---
# Story rb3-2: Ground-wave mode entry + forced-slow control — INITGR sets GRMODE=0C0 (D7 ground + D6 plane-disable) so the main loop skips new-plane generation; DISCHK forced to the slow-air band in ground mode; extend waves.ts so the MODECT LSB selects INITGR (ground) vs STPLNE (plane), MCOUNT 4,2,3,2,1,3,4,2 inter-wave counts already present from rb2-7

## Story Details
- **ID:** rb3-2
- **Jira Key:** (none — kanban tracking)
- **Workflow:** tdd
- **Stack Parent:** none (foundation for rb3-3..rb3-6)
- **Repo:** red-baron
- **Points:** 3 (p2 priority)

## Technical Approach

### Primary Scope

This story wires the ground-wave MODECT LSB to branch between INITGR (ground) and STPLNE (plane) wave initiation, and introduces GRMODE state (0xC0: D7 GROUND + D6 plane-disable bits) so plane-generation is skipped while a ground wave runs.

**Files to modify:**
- **red-baron/src/core/waves.ts** — extend existing MODECT/NEWCT/MCOUNT logic from rb2-7 to branch INITGR vs STPLNE based on the MODECT LSB.
- **red-baron/src/core/flight.ts** — reuse existing `ProximityBand` plumbing (`FlightInput.proximity`) for forced-slow control; ground mode pins it to slow feel regardless of nearest-object distance. Do NOT invent a new control path.

### Load-Bearing Precondition

**CRITICAL:** rb3-8 (Fix flight.ts altitude-clamp radix) is listed as a **p1 blocker** in the epic and MUST land before rb3-2 RED begins. The findings §2/§3 cite RBARON.MAC equates under `.RADIX 16` (hex), and rb3-1 Dev found that `flight.ts:52` currently misreads `PLYMAX=180*4` as DECIMAL (720) when the ROM specifies HEX (0x180*4=1536). rb3-2's ground-mode altitude logic and rb3-3's mountain render both depend on correct altitude bounds.

- **Evidence:** rb3-1 Delivery Findings + Reviewer audit independently confirmed the `.RADIX 16` block (RBARON.MAC:74 governs through :6209; sibling `.STAR0=1B` hex digit; `P.MAXZ=1001`=HORZ+1).
- **Verify:** rb3-8 is already DONE in this sprint (shows `status: done`, merged). TEA/Dev should confirm the `flight.ts` altitude clamp has been corrected before proceeding with rb3-2 RED.

### ROM Quarry (Absent from a-1; lives in a-2 checkout)

Relevant findings/equates cited by the story:

1. **R2BRON.MAC:2254-2269** (findings §4) — MODECT LSB branch logic (INITGR vs STPLNE).
2. **Findings §2** — "ground mode is forced to slow" (DISCHK control band forced-slow in GRMODE).
3. **Findings §3** — `.LEVLS=5 is the difficulty ceiling (§3), not a stage count` (scope clarification: difficulty levels 0-4 map to 5 LEVLS entries, not a stage count).
4. **GRMODE state** — D7 GROUND + D6 plane-disable bits (0xC0 in hex).

These files are **NOT in this checkout (a-1)** — reference/ RBARON.MAC/R2BRON.MAC/RBGRND are gitignored and live only in a-2. Prior archive `sprint/archive/rb2-7-session.md` and `sprint/archive/rb3-1-session.md` may contain pre-extracted quarry.

### Hex Radix Reminder

**CRITICAL:** RBARON/RBGRND constant equates are `.RADIX 16` (HEX).
- `GRMODE=0C0` means `0xC0` = 0x80 (D7 GROUND) + 0x40 (D6 plane-disable) bits set.
- Do NOT misread as decimal (0C0 = 12 decimal is wrong).
- See rb3-1 deviations §3 for the proof (`.RADIX 16` at RBARON.MAC:74 through :6209).

### Acceptance Criteria (TEA to formalize in RED tests)

The story description names eight ACs; TEA should distill them into a test matrix:

1. **MODECT LSB branches wave type:** waves.ts examines MODECT LSB to pick INITGR (ground, bit=1) vs STPLNE (plane, bit=0). MCOUNT 4,2,3,2,1,3,4,2 inter-wave counts already landed in rb2-7.
2. **GRMODE introduced:** GRMODE state (D7 GROUND=0x80 + D6 plane-disable=0x40, total 0xC0) gates plane-generation in main.ts — new planes skip spawn when GRMODE D7 is set.
3. **DISCHK forced slow in ground mode:** ground mode pins `FlightInput.proximity` to the slow-air control band (`ProximityBand.SLOW`) regardless of nearest-object distance.
4. **.LEVLS=5 ceiling:** difficulty constant cap is 5, not a stage count. Affects level-gated behavior downstream (rb3-5/rb3-6).
5. **Reuse ProximityBand plumbing:** the forced-slow mechanism must reuse existing `flight.ts` ProximityBand/FlightInput infrastructure, not invent a new control path.
6. **Ground wave transitions:** entering a ground wave (INITGR spawn) correctly sets GRMODE; exiting (next STPLNE) clears it.
7. **Interleave alternation:** MODECT/NEWCT + MCOUNT from rb2-7 ensure waves alternate (lead→ground→lead→…, guided by MODECT LSB).
8. **Calc-frame cadence:** all wave/mode logic ticks on calc-frame (~10.42 Hz), not display frame.

## Dependencies & Unblocks

- **Precondition:** rb3-8 (altitude-clamp radix fix) — DONE.
- **Foundation for:** rb3-3 (landscape render), rb3-4 (ground targets), rb3-5 (ground fire), rb3-6 (terrain-crash death).
- **Builds on:** rb2-7 (MODECT/NEWCT/MCOUNT wave table already landed), rb2-5/rb2-6 (flight sim + level ramp).

## Prior Session Archives (For Context)

Before RED begins, TEA should read:
- `sprint/archive/rb2-7-session.md` (Delivery Findings, deviations, wave table + object budget)
- `sprint/archive/rb3-1-session.md` (Delivery Findings, esp. the flight.ts altitude radix conflict; deviations; ground topology + hex-radix proof)

These may contain pre-extracted ROM quarry or insights on the MODECT/MCOUNT/LEVLS/GRMODE/DISCHK logic.

## Sm Assessment

**Routing decision:** rb3-2 is a 3-pt `tdd` (phased) story in `red-baron`. Per the fallback rule (3+ pts → tdd) and the explicit `workflow: tdd` tag, this goes through the full phased pipeline: setup → **RED (TEA)** → GREEN (Dev) → review (Reviewer) → finish (SM). Handing off to **TEA/O'Brien** for the RED phase.

**Merge gate:** GREEN. No open PRs in red-baron; no blocking in-review stories. Clear to start new work.

**Setup verification:** Session file, story context, and feat branch `feat/rb3-2-ground-wave-mode-entry` (off `origin/develop`, gitflow) all confirmed present. Sprint YAML marked `in_progress`.

**What TEA needs to know (already captured above, flagged here):**
- Precondition rb3-8 (altitude radix fix) is DONE/merged — the load-bearing dependency is satisfied.
- ROM quarry (RBARON/R2BRON/RBGRND) is **absent from this a-1 checkout** — it lives only in a-2. TEA must lean on the prior archives (`rb2-7-session.md`, `rb3-1-session.md`) for pre-extracted quarry, or coordinate to read from a-2.
- **Hex-radix trap:** `GRMODE=0C0` is `0xC0` (D7+D6), not decimal. RBARON equates are `.RADIX 16`. This is a recurring red-baron footgun — RED tests must assert the bit semantics, not a decimal value.
- Reuse `flight.ts` `ProximityBand`/`FlightInput.proximity` for forced-slow — do NOT introduce a parallel control path.

**Not my call:** The exact test matrix, the AC boundaries, and any ROM re-measurement are TEA's to own. I've routed the problem; I am not solving it.

## TEA Assessment

**Tests Required:** Yes
**Reason:** rb3-2 introduces new deterministic core logic (GRMODE mode byte, the INITGR/STPLNE MODECT branch, forced-slow DISCHK band) — squarely testable pure functions. Not a chore bypass.

**Test Files:**
- `red-baron/tests/core/ground-mode.test.ts` — GRMODE byte + predicates + grmodeForWave branch + forced-slow band + `.LEVLS` guard (imports from `src/core/waves.ts`, `src/core/flight.ts`, `src/core/scoring.ts`)
- `red-baron/tests/ground-mode-wiring.test.ts` — main.ts structural wiring (GRMODE branch reached, plane-gen skip gated, forced-slow proximity fed), text-regex since main.ts can't run under `environment:'node'`

**Tests Written:** 24 tests covering 6 ACs.
**Status:** RED confirmed — 21 failing, 3 passing. The 21 fail for the RIGHT reason (missing contract exports + absent main.ts wiring); the 3 passing are the 2 `.LEVLS` regression guards (AC-6) + the "main.ts exists" wiring precondition. Verified by the testing-runner (Room 101): full red-baron suite 391 tests, 370 pre-existing still green — no source touched.

**AC → test map:**
| AC | Behavior | RED? |
|----|----------|------|
| AC-1 | GRMODE=0C0 is hex 0xC0 (D7\|D6), not decimal 12 — the `.RADIX 16` trap | failing |
| AC-2 | planeGenDisabled/isGroundMode read INDEPENDENT bits (D6 vs D7), total on 0 | failing |
| AC-3 | grmodeForWave: MODECT LSB → INITGR/STPLNE; agrees with isPlaneWave + stepWaveClock; total on negative | failing |
| AC-4 | GROUND_CONTROL_BAND='far' (min DISCHK scale); ground forces slow regardless of live band; pass-through otherwise | failing |
| AC-5 | forced-slow reuses REAL flight.step DISCHK plumbing (== proximity:far, < proximity:near) | failing |
| AC-6 | `.LEVLS`=5 is a ceiling (MAX_GMLEVL), not a stage count | passing (guard) |
| wiring | main.ts enters GRMODE, skips plane-gen, feeds controlBand | failing |

### Rule Coverage

| Rule (lang-review/typescript.md) | Test(s) | Status |
|------|---------|--------|
| #3 enum anti-patterns — explicit-valued mode bytes (no fragile numeric enums); exhaustiveness over bands | AC-1 exact-value pins; AC-4 `controlBand` over ALL_BANDS | failing |
| #4 null/undefined totality — no NaN/undefined leaks | AC-2 predicates false on 0; AC-3 `grmodeForWave(-1)` total, never NaN | failing |
| #8 test quality — meaningful assertions, imports from `src/` not `dist/`, no `as any` | all tests import `../../src/core/*`; self-checked | pass (self-check) |
| red-baron project footgun — `.RADIX 16` hex constants | AC-1 asserts `GRMODE_INITGR !== 12` (decimal misread guard) | failing |

**Rules checked:** 3 of 9 lang-review rules apply to this pure-logic change (enum/const, null-safety, test-quality); #6 React/#7 async/#9 build config are N/A. Plus the repo-specific hex-radix guard.
**Self-check:** 0 vacuous tests. Every `it` has ≥1 meaningful `expect`; no `let _ =`, no `assert(true)`, no `is-None`-on-always-None. The integration tests (AC-5) assert VALUE relationships against real `flight.step`, not existence.

**Handoff:** To Dev (Julia) for GREEN — implement the named exports in `src/core/waves.ts` (GRMODE_* + planeGenDisabled/isGroundMode/grmodeForWave) and `src/core/flight.ts` (GROUND_CONTROL_BAND/controlBand), then wire `src/main.ts` per the Delivery Findings (assign `grmode` each scheduler decision; gate spawnWave on `!planeGenDisabled`; feed `controlBand(isGroundMode(grmode), proximityBand(...))` into FlightInput.proximity).

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-11T10:00:05Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T09:32:20Z | 2026-07-11T09:35:27Z | 3m 7s |
| red | 2026-07-11T09:35:27Z | 2026-07-11T09:48:08Z | 12m 41s |
| green | 2026-07-11T09:48:08Z | 2026-07-11T09:54:25Z | 6m 17s |
| review | 2026-07-11T09:54:25Z | 2026-07-11T10:00:05Z | 5m 40s |
| finish | 2026-07-11T10:00:05Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): the main loop must assign `grmode = grmodeForWave(clock.modect)` on EVERY scheduler decision, not only on ground slots — a plane slot must CLEAR the plane-disable bit (GRMODE_PLANE) or the first ground wave leaves new-plane generation disabled forever. Affects `src/main.ts` (the `stepWaveClock` decision branch at ~:275; add a persistent `grmode` state var alongside `waveClock` and re-derive it each decision). *Found by TEA during test design.*
- **Improvement** (non-blocking): main.ts can't run under vitest's `environment:'node'` (it touches `window`/`Date.now`/`requestAnimationFrame`), so the GRMODE lifecycle wiring is only STRUCTURALLY guarded (text-regex in `tests/ground-mode-wiring.test.ts`, mirroring rb2-7). Correctness of the set-on-ground / clear-on-plane transition rests on Dev + Reviewer tracing the loop, not a unit test. Affects `src/main.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): rb3-2 is MODE ENTRY only — during a ground slot the sky is empty (no planes) with forced-slow control for the MCOUNT gap; the scrolling landscape + ground targets are rb3-3..rb3-6. Confirm an empty-sky + sluggish-control interval is the intended VISIBLE behavior for this story. Affects `epic-rb3` sequencing (no code change). *Found by TEA during test design.*

### Dev (implementation)
- **Resolved** (non-blocking): TEA's clear-on-plane Gap is closed — `grmode` updates only on a wave DECISION (`waveClock.countdown === 0` pre-step) using the pre-increment modect, and HOLDS between decisions. A plane slot therefore clears INITGR back to `GRMODE_PLANE` (no permanent plane-disable); a ground interval self-terminates because the scheduler keeps ticking on the empty sky and advances MODECT to the next plane slot. Affects `src/main.ts` (no further change needed). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the pilot's `FlightInput` (including the forced-slow proximity) is computed once per display `frame()` before the fixed-step accumulator loop — the pre-existing pattern — so a `grmode` transition that happens inside the sim loop applies to control feel on the NEXT display frame (~16 ms lag). Consistent with how the live `proximity` band already works; flagged only if sub-frame precision is ever wanted. Affects `src/main.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (non-blocking): the forced-slow control band is correct but LATENT in rb3-2 — during a ground slot the sky is empty, so `proximityBand(nearestDepth([]))` already returns `'far'` and `controlBand(true,'far')` equals the empty-sky default, giving no visible difference. Its differentiating effect only appears once ground objects feed proximity: rb3-3/rb3-4 must route landscape/ground-target depth into `nearestDepth` (or an equivalent) so the forced-slow actually overrides a near ground object. Affects `src/main.ts` `nearestDepth`/`readInput` + rb3-4 ground-target wiring. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): confirms Dev's one-display-frame input-lag note — if a future story needs the ground-mode control transition to be sub-frame-precise, recompute `readInput` inside the accumulator loop rather than once per `frame()`. Not needed for rb3-2 (imperceptible against a multi-calc-frame ground interval). Affects `src/main.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Authored the rb3-2 acceptance-criteria contract (ACs were unspecified in the sprint YAML)**
  - Spec source: context-story-rb3-2.md, Acceptance Criteria
  - Spec text: "No acceptance criteria recorded in the sprint YAML — TEA to define during the RED phase."
  - Implementation: authored 6 ACs and a concrete pure-function contract — GRMODE_GROUND/PLANE_DISABLE/INITGR/PLANE constants + planeGenDisabled/isGroundMode/grmodeForWave in waves.ts, and GROUND_CONTROL_BAND/controlBand in flight.ts
  - Rationale: the story describes behavior (INITGR/GRMODE/forced-slow) but prescribes no API; a concrete testable surface is required to write RED tests
  - Severity: minor
  - Forward impact: minor — rb3-3..rb3-6 build on the GRMODE byte + isGroundMode predicate this contract fixes
- **Carried forward rb2-7's even=plane / odd=ground parity convention**
  - Spec source: context-story-rb3-2.md, Problem (findings §4, R2BRON.MAC:2254-2269)
  - Spec text: "wires the MODECT LSB to actually branch INITGR (ground) vs STPLNE (plane)"
  - Implementation: grmodeForWave keys off rb2-7's isPlaneWave convention (even MODECT → GRMODE_PLANE, odd → GRMODE_INITGR) rather than re-deriving which parity is the plane
  - Rationale: the ROM fixes the LSB gate but NOT which parity value is the plane (rb2-7 logged this as a Conflict); its convention isPlaneWave(0)=true is already shipped + test-gated
  - Severity: minor
  - Forward impact: none
- **Added grmodeForWave as a standalone primitive instead of extending stepWaveClock's return shape**
  - Spec source: context-story-rb3-2.md, Problem
  - Spec text: "extend waves.ts so the MODECT LSB selects INITGR (ground) vs STPLNE (plane)"
  - Implementation: added a pure grmodeForWave(modect) function; a consistency test ties it to the existing stepWaveClock decision rather than adding a grmode field to its `{clock, spawnPlaneWave}` return
  - Rationale: preserves the rb2-7 stepWaveClock contract (and its 6 passing scheduler tests) while exposing the new branch as a primitive main.ts can call directly
  - Severity: minor
  - Forward impact: none
- **AC-6 (.LEVLS=5) is a passing regression guard, not a failing RED test**
  - Spec source: context-story-rb3-2.md, Problem (§3); findings §4
  - Spec text: ".LEVLS=5 is the difficulty ceiling (§3), not a stage count"
  - Implementation: covered as a regression guard over the existing scoring.MAX_GMLEVL (===5, and PLNLVL.length>5) that PASSES now, rather than a failing RED test
  - Rationale: .LEVLS is an existing constant; the story's requirement is a guardrail — rb3-2 must NOT reinterpret it as a count of ground stages — so there is no new behavior to drive RED
  - Severity: minor
  - Forward impact: none

### Dev (implementation)
- No deviations from spec. Implemented exactly to the TEA RED contract — the named exports in `waves.ts`/`flight.ts` and the `main.ts` wiring (grmode threaded through the loop, set per decision, gating `spawnWave` on `!planeGenDisabled`, forcing the slow band via `controlBand`). The decision-gated `grmode` hold is the literal implementation of TEA's Gap finding, not a departure from it.

### Reviewer (audit)
- **TEA: Authored the rb3-2 acceptance-criteria contract** → ✓ ACCEPTED by Reviewer: the sprint YAML recorded no ACs and explicitly delegated them to TEA; the authored contract (GRMODE bytes + predicates + `grmodeForWave`; `GROUND_CONTROL_BAND`/`controlBand`) faithfully implements findings §2/§4 and R2BRON.MAC:1401-1407/2254-2269. Sound.
- **TEA: Carried forward rb2-7's even=plane / odd=ground parity convention** → ✓ ACCEPTED by Reviewer: the ROM pins the LSB gate but not which parity is the plane (rb2-7 logged this as a Conflict). Reusing the already-shipped `isPlaneWave(0)=true` convention keeps the two stories consistent rather than introducing a rival parity. Correct.
- **TEA: Added `grmodeForWave` as a standalone primitive instead of extending `stepWaveClock`'s return** → ✓ ACCEPTED by Reviewer: preserves the rb2-7 `stepWaveClock` contract (6 passing scheduler tests untouched) and the AC-3 consistency test still ties the new branch to the scheduler decision. Lower-risk than mutating a shared return shape.
- **TEA: AC-6 (.LEVLS=5) is a passing regression guard, not a failing RED test** → ✓ ACCEPTED by Reviewer: `.LEVLS` is the existing `scoring.MAX_GMLEVL`; the story's requirement is a guardrail against reinterpreting it as ground stages, so a passing guard (MAX_GMLEVL===5, PLNLVL.length>5) is the right expression — there is no new behavior to drive RED.
- **Dev: No deviations from spec** → ✓ ACCEPTED by Reviewer: I diffed the implementation against the RED contract line-by-line — every named export matches, and the `main.ts` decision-gated `grmode` hold is the literal implementation of TEA's clear-on-plane Gap, not a departure. No undocumented deviations found in the diff.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `red-baron/src/core/waves.ts` — GRMODE bytes (`GRMODE_GROUND` 0x80 / `GRMODE_PLANE_DISABLE` 0x40 / `GRMODE_INITGR` 0xC0 / `GRMODE_PLANE` 0x00) + `planeGenDisabled`/`isGroundMode` bit predicates + `grmodeForWave` (MODECT LSB → INITGR/STPLNE, delegates to `isPlaneWave`).
- `red-baron/src/core/flight.ts` — `GROUND_CONTROL_BAND` ('far', the slow band) + `controlBand(groundMode, liveBand)`, reusing the existing DISCHK/ProximityBand plumbing.
- `red-baron/src/main.ts` — threads a persistent `grmode` state var through the loop: set to `grmodeForWave(decisionModect)` on each wave decision (holds between decisions), gates `spawnWave` on `!planeGenDisabled(grmode)`, and feeds `controlBand(isGroundMode(grmode), proximityBand(nearestDepth(enemies)))` into the pilot's `FlightInput.proximity`.

**Tests:** 391/391 passing (GREEN) — the 21 rb3-2 tests now pass, all 370 pre-existing tests still green (no regressions). Verified by the testing-runner (The Golden Country).
**Build gate:** `tsc --noEmit` clean, `vite build` clean (11.59 kB → 4.99 kB gzip).
**Branch:** `feat/rb3-2-ground-wave-mode-entry` (pushed to origin, commit `46644cb`).

**Self-review (judgment checks):**
- Wired to the front end: yes — `main.ts` reads `grmode` for both the spawn gate and the forced-slow proximity; the wiring guard passes.
- Follows project patterns: yes — pure `src/core` functions, `.RADIX 16` hex constants, findings citations, computed-once-per-frame input (matches existing `proximity`).
- All ACs met: yes (AC-1..AC-6 + wiring, per the RED contract).
- Error handling: the predicates + `grmodeForWave` are total (no NaN/undefined leaks); no new failure modes introduced.

**Handoff:** To Reviewer (The Thought Police) for code review.

## Subagent Results

Only `reviewer-preflight` is enabled; the other 8 specialists are disabled via `workflow.reviewer_subagents` settings — their rows are pre-filled `Skipped / disabled` and I assessed each domain myself (tagged in the assessment).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells; 391/391 GREEN; build clean; no lint script | N/A — nothing to confirm/dismiss |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — boundary paths traced by Reviewer ([EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — silent-failure surface assessed by Reviewer ([SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — test quality assessed by Reviewer ([TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — comment accuracy assessed by Reviewer ([DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — type design assessed by Reviewer ([TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — security surface assessed by Reviewer ([SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — complexity assessed by Reviewer ([SIMPLE]) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — rules enumerated by Reviewer ([RULE]) |

**All received:** Yes (1 enabled subagent returned; 8 disabled via settings)
**Total findings:** 0 confirmed blocking, 0 dismissed, 2 non-blocking forward-looking findings (logged in Delivery Findings)

## Reviewer Assessment

**Verdict:** APPROVED

**Scope:** 5 files, +472/-7 vs `origin/develop` (fetched fresh — local develop goes stale). Pure deterministic game logic: GRMODE mode byte + INITGR/STPLNE branch (waves.ts), forced-slow control band (flight.ts), and the frame-loop wiring (main.ts). No backend, no auth, no I/O, no user data.

### Observations (adversarial — subagent domains assessed by Reviewer since 8 are disabled)

- `[VERIFIED]` `[EDGE]` **Full plane→ground→plane cycle traced, no stall.** From `INITIAL_WAVE_CLOCK {0,0}`: frame 1 is a decision → `grmodeForWave(0)=GRMODE_PLANE`, spawns the opening plane wave. After the sky clears, the odd (ground) MODECT decision sets `grmode=GRMODE_INITGR` (0xC0), spawns nothing. Because the scheduler ticks only when `enemies.length===0 && wrecks.length===0` — which is exactly the empty-sky ground-wave state — it keeps advancing MODECT and self-terminates the ground interval at the next even (plane) slot, which re-clears `grmode` to `GRMODE_PLANE`. Evidence: `src/main.ts:283-296` + `waves.ts` `stepWaveClock`/`grmodeForWave`. No stuck-in-ground state is reachable.
- `[VERIFIED]` `[EDGE]` **`decisionModect` is captured pre-increment — correctly aligned with `spawnPlaneWave`.** `src/main.ts:283` reads `waveClock.modect` BEFORE `stepWaveClock` advances it, so `grmodeForWave(decisionModect)` keys off the same modect as `sched.spawnPlaneWave = isPlaneWave(clock.modect)`. AC-3's consistency test pins this exact equivalence (`stepWaveClock({m,0}).spawnPlaneWave === !planeGenDisabled(grmodeForWave(m))`).
- `[VERIFIED]` `[TYPE]` `[RULE]` **GRMODE is explicit-valued `const`, not a fragile numeric enum (lang-review TS #3).** `GRMODE_GROUND=0x80`, `GRMODE_PLANE_DISABLE=0x40`, `GRMODE_INITGR = GRMODE_GROUND | GRMODE_PLANE_DISABLE` (=0xC0), `GRMODE_PLANE=0x00` — `waves.ts:150-162`. The recurring red-baron `.RADIX 16` footgun is handled correctly: `0C0` is read as `0xC0` (=192), NOT decimal 12, and AC-1 explicitly guards `GRMODE_INITGR !== 12`. Predicates are total on any number (`NaN & x = 0` → false), so no NaN/undefined leak (lang-review TS #4).
- `[VERIFIED]` `[TEST]` **Test quality is genuine, not vacuous.** 40 meaningful `expect`s across 20 `it`s in `ground-mode.test.ts` + 4 wiring assertions; no `.only`/`.skip`, no `assert(true)`, no `is-None`-on-always-None. The AC-5 integration tests assert real VALUE relationships against `flight.step` (`grounded.heading === far.heading` and `< near.heading`), so a wrong `controlBand` would fail them — not existence checks.
- `[VERIFIED]` `[DOC]` **Comments match code.** The `.RADIX 16` warning (`waves.ts:146-147`), the `grmode` lifecycle comment (`main.ts:240`), and the `readInput`/scheduler comments accurately describe the decision-gated transition. No stale or misleading documentation.
- `[VERIFIED]` `[SIMPLE]` **The `!planeGenDisabled(grmode)` spawn gate is redundant-but-intentional, not dead code.** On a decision frame it equals `sched.spawnPlaneWave` (both are `isPlaneWave(decisionModect)`), so it never changes the rb3-2 outcome. It is NOT removable: findings §4 makes GRMODE D6 the authoritative plane-generation gate, the wiring test requires it, and it future-proofs rb3-3+ where a ground path could set `grmode` outside the decision or spawn objects mid-ground-wave. Keeping it is the ROM-faithful, spec-mandated choice.
- `[VERIFIED]` `[SILENT]` **No swallowed errors or silent fallbacks.** No `try/catch`, no `??`/`||` default masking, no empty branches. The one intentional "does nothing" path (ground slot spawns no planes) is documented at `main.ts:291-293` and is the story's whole point.
- `[VERIFIED]` `[SEC]` **No security surface.** Pure deterministic sim — no auth, secrets, tenant data, injection, or deserialization. Keyboard input is unchanged from rb2-x. N/A by domain.
- `[MEDIUM]` `[EDGE]` **Forced-slow is correct but LATENT in rb3-2 (foundation, not yet observable).** During a ground slot the sky is empty, so `proximityBand(nearestDepth([]))` already returns `'far'`, and `controlBand(true,'far') === 'far'` — identical to the empty-sky default. The forced-slow only produces a DIFFERENT band once a near ground object exists (rb3-4 targets / rb3-3 landscape feeding `nearestDepth`). This is correct forward-looking foundation per "Foundation for rb3-3..rb3-6," fully unit-proven (AC-4/AC-5 force `'far'` even against a `'near'` object), but has no visible effect this story. Logged as a non-blocking Delivery Finding for rb3-4. Not a defect.
- `[LOW]` `[EDGE]` **One-display-frame lag on the control-feel transition.** `input` is computed once per `frame()` before the fixed-step accumulator loop (`main.ts:251`), so a `grmode` change inside the sim loop applies to control feel on the next display frame (~16 ms). Consistent with how the pre-existing `proximity` band already works; imperceptible against a multi-calc-frame ground interval. Dev logged it; accepted.

### Rule Compliance (lang-review/typescript.md — the rubric; no `.claude/rules`/`SOUL.md`/`CLAUDE.md` exist in red-baron)

- **#1 Type-safety escapes** — none. No `as any`, `as unknown as T`, `@ts-ignore`, or non-null `!`. Compliant.
- **#2 Generics/interface pitfalls** — none. `DISCHK` stays `Readonly<Record<ProximityBand, number>>`; new signatures use concrete types (`number`, `boolean`, `ProximityBand`). No `Record<string, any>`/`object`/`Function`. Compliant.
- **#3 Enum anti-patterns** — GRMODE uses explicit-valued `const` numbers (not a TS numeric enum), avoiding reorder fragility; `ProximityBand` is a string union; `controlBand` is a total ternary (no unhandled case). Compliant.
- **#4 Null/undefined** — every new function is total: `planeGenDisabled`/`isGroundMode` are bitwise (NaN→false), `grmodeForWave` delegates to `isPlaneWave` (returns one of two bytes, never NaN), `controlBand` returns a `ProximityBand` on both branches. Compliant.
- **#5 Module/declaration** — value exports (constants/functions) exported normally; type-only (`ProximityBand`) reused via existing `type` import in enemy.ts. No missing extensions (bundler resolution). Compliant.
- **#6 React/JSX**, **#7 Async/Promise** — N/A (no JSX, no async in the diff).
- **#8 Test quality** — all tests import from `../../src/core/*` (source, not `dist/`), no `as any` in assertions, meaningful `expect`s, no mocks. Compliant.
- **#9 Build/config** — no tsconfig/strict changes; `tsc --noEmit` clean. Compliant.
- **red-baron `.RADIX 16` footgun** — `GRMODE_INITGR = 0xC0` (hex), guarded `!== 12`. Compliant.

### Devil's Advocate

Let me argue this code is broken. **First attack — the game traps itself in ground mode forever.** If entering `GRMODE_INITGR` disabled plane generation but nothing ever cleared it, the sky would stay empty permanently. Rebuttal: the scheduler runs precisely when the sky and wreck list are empty — the ground-wave state — so it never stalls; it advances MODECT every calc-frame and the next even slot re-derives `grmode=GRMODE_PLANE`, re-enabling spawns. I traced `{0,0}→plane→…→ground(1)→…→plane(2)` and the mode flips back. Closed. **Second attack — the mode flips one wave too early or too late.** If `grmode` were derived from the POST-increment modect, it would enter the NEXT wave's mode prematurely during the gap. Rebuttal: `decisionModect` is captured before `stepWaveClock`, and `grmode` updates ONLY on a decision (`countdown===0`), holding between decisions — so a ground wave's slow control persists across its whole MCOUNT gap and flips exactly at the next decision. AC-3's `stepWaveClock`-consistency test gates this. Closed. **Third attack — a hex/decimal radix slip.** If `GRMODE=0C0` were read as decimal 12, `planeGenDisabled(12)=(12 & 0x40)!==0=false` — planes would spawn during a ground wave. Rebuttal: `GRMODE_INITGR` is `0x80|0x40=0xC0`, AC-1 asserts `=== 0xc0`, `=== 192`, and `!== 12`. Closed — this is the exact footgun rb3-1/rb3-8 flagged, and it's handled. **Fourth attack — a regression to the normal dogfight.** The proximity line changed for every frame, ground or not. Rebuttal: in plane mode `isGroundMode(GRMODE_PLANE)=false` → `controlBand(false, x)=x`, so the live band passes through unchanged; the spawn gate `!planeGenDisabled(GRMODE_PLANE)=true` is a no-op. 370 pre-existing tests confirm zero behavior change. Closed. **Fifth attack — the forced-slow is a no-op and the story shipped nothing.** Partly conceded: during rb3-2's empty-sky ground interval the forced-slow band equals the empty-sky default `'far'`, so it has no VISIBLE effect yet. But it is correct, unit-proven foundation (the tests force `'far'` even against a `'near'` object) and the story explicitly scopes itself as "Foundation for rb3-3..rb3-6" — mode entry, not ground content. I logged the latency as a forward finding for rb3-4 rather than a defect. None of these attacks reveals a blocking flaw: the mode logic is total, self-terminating, radix-correct, and regression-free.

**Data flow traced:** keyboard yoke + `grmode` → `readInput` → `FlightInput.proximity` (via `controlBand(isGroundMode(grmode), …)`) → `step(flight, input)` → `DISCHK[proximity]` scale. Safe: `grmode` is only ever `GRMODE_PLANE` or `GRMODE_INITGR` (from `grmodeForWave`), both drive valid, total paths.
**Pattern observed:** decision-gated persistent state threaded through the fixed-step loop, mirroring the existing `waveClock`/`flight` accumulators — `src/main.ts:240,283-296`. Good pattern.
**Error handling:** all new functions total; no new failure modes. No Critical/High issues found.

**Handoff:** To SM for finish-story.