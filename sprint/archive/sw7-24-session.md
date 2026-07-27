---
story_id: "sw7-24"
jira_key: "sw7-24"
epic: "sw7"
workflow: "tdd"
---
# Story sw7-24: Fidelity/playtest: tune VM-flight aggression + close deferred fire nuances (PR #110 follow-ups)

## Story Details
- **ID:** sw7-24
- **Jira Key:** sw7-24
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 3
- **Priority:** p3

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-27T11:40:05Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-27T11:02:28Z | 2026-07-27T11:04:01Z | 1m 33s |
| red | 2026-07-27T11:04:01Z | 2026-07-27T11:23:10Z | 19m 9s |
| green | 2026-07-27T11:23:10Z | 2026-07-27T11:33:31Z | 10m 21s |
| review | 2026-07-27T11:33:31Z | 2026-07-27T11:40:05Z | 6m 34s |
| finish | 2026-07-27T11:40:05Z | - | - |

## Story Context

Four deferred fidelity/tuning items from PR #110 (sw7-23 cleanup follow-up), prioritised by playtest:

### T4a: Unshot TIE approach feel (VM position clamp)
ROM flies unshot TIEs toward the cockpit at ~frame 93 before choreography weave engages.
Current: all TIEs beeline after spawn.
**Mechanism:** §5.3 play-cube position clamp (each axis [$8300,$7CFF]).
**Tuning:** adjust min/max bounds to match feel (reference ROM via MAME playtest).
**Note:** §7 cockpit-collision-drop already exists (sim.ts:484-491), so this is feel-tuning, not missing logic.

### T4d: AIM_PLAYER/AIM_AHEAD homing vs ROM $67 law
Current: both maneuvers use `moveEnemy` snap-homing (full re-point).
**Mechanism:** ROM applies exact Math Box program $67 law (model §5).
**Design election:** current snap-homing is deliberate; combined aim+roll maneuvers won't visibly spin until landing.
**Revisit:** whether a smoother rotation (via the exact law) changes feel.
**Context:** reference WSCPU.MAC:XXX for ROM $67 law logic.

### T5a: TGPROB fire threshold rows 8-15 (high waves 9-11)
Current: TGPROB ported rows 0-7 only.
**Gap:** waves 9-11 hold threshold 0x80 (~50%) vs ROM deeper 03,60 / 03,40 / 03,30 (~62/75/81%).
**Action:** transcribe rows 8-15 from WSCPU.MAC:736.
**Warning:** verify radix (WS*.MAC constants can be .RADIX 16 hex — check the source before transcribing).

### T5b: Fire condition gate (C_AS vs C$PV)
Current: §6 fire cond-1 uses `C_AS` (alien-aims-at-player, in-core-geometry bit).
**ROM alternative:** C$PV (player-can-see-us, first gate WSCPU.MAC:624).
**Design election:** C_AS was deliberately chosen in PR #110's fire work for consistency with core-geometry checks.
**Revisit:** whether C$PV semantics (line-of-sight culling) change feel.

**Test priority:** playtest to prioritise items before implementation. Each item can be its own commit.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Conflict** (non-blocking): sprint tracking never recorded that done story sw8-2 (title: "…absorbs backlog sw7-24", completed 2026-07-21, approved) closed most of this story — sw7-24 sat in the epic-sw7 backlog and was picked up again today with 3 of its 4 items already shipped or owned elsewhere.
  Affects `sprint/epic-sw7.yaml` (SM: when finishing this story, note in its completion record that T4d/T5a shipped in sw8-2, T4a is owned by sw8-9, and only T5b was delivered here — so a future grep doesn't re-open the closed items).
  *Found by TEA during test design.*
- **Question** (non-blocking): the C_AS election — the ROM's §6 fire gate tests ONLY C$PV (WSCPU.MAC:624-626: "NO SHOOTING GUNS IF PLAYER CANT SEE US"); it has NO aim-cone condition. The clone's C_AS 12° cone (a deliberate sw7 election, reaffirmed sw8-2 AC8) is stricter than the cabinet, so keeping it as C_PV∧C_AS leaves the effective fire rate below the ROM's even after T5b lands. The RED suite is deliberately neutral (green under C_PV-alone or the conjunction); whether to drop C_AS is a feel/design call.
  Affects `star-wars/src/core/sim.ts` + `star-wars/docs/tie-flight-ai-model.md` §6 (route to the playtest/design pass; interacts with sw8-8's "homing always arrives" fairness story — a cabinet-rate fire volume changes that calculus).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): landing the C_PV gate removes the off-screen-shooter component of the behind-the-eye loiter defect (TIEs converging behind the eye today fire from there — 30 fires/160 frames in the RED fixture), which softens the player-facing sting of the not-yet-done loiter story.
  Affects `sprint/epic-sw8.yaml` sw8-9 (its description can note the fire-unfairness half is closed by sw7-24; the geometry half — loiter/no-ram + play-cube clamp — remains its scope).
  *Found by TEA during test design.*

### Dev (implementation)

- No upstream findings during implementation.

### Reviewer (code review)

- **Gap** (non-blocking): the visibility suite does not pin the exact-equality pyramid boundary — mutation `<` → `<=` on the ratio axes survives (tests pin 3999-in/4001-out, not 4000-out; the ROM's BHS excludes equality). One assertion closes it: `computeStatus(aimedTie([4000, 0, -4000]), …) & Status.C_PV === 0`.
  Affects `star-wars/tests/core/tie-fire-visibility.test.ts` (add the equality-boundary assertion). Owned by sw8-8 — its fire-fairness verification is the next story to open this suite; fold the one-liner in there.
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): `computeStatus`'s docstring still opens "OR together the 6 status bits this task owns" — with C_PV the count is seven (the file header was updated; this docstring was missed).
  Affects `star-wars/src/core/tie-status.ts` (one-word comment fix). Owned by sw8-8 — same file, same touch.
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **T4a descoped — mechanism owned by filed story sw8-9**
  - Spec source: session Story Context, item T4a
  - Spec text: "tune approach feel, likely via the §5 play-cube clamp (position clamp each axis [$8300,$7CFF], model §5.3)"
  - Implementation: no tests written for T4a in this story
  - Rationale: sw8-2 AC3 formally deferred the play-cube clamp, sw8-6's Dev finding confirmed the loiter defect, and sw8-9 (epic-sw8.yaml, backlog, 3pt) now owns "port the deferred §5 play-cube clamp (sub_8DE3) + loiter/no-ram" — writing T4a tests here would trample a filed sibling's scope; sim.ts's own TODO(playtest) marks it as sw8-2 AC3's deferral
  - Severity: minor
  - Forward impact: sw8-9 delivers T4a; see Delivery Finding on its updated sting
- **T4d descoped — already shipped by sw8-2 AC4**
  - Spec source: session Story Context, item T4d
  - Spec text: "AIM_PLAYER/AIM_AHEAD reuse the moveEnemy snap-homing (full re-point) rather than the exact Math Box program $67 law"
  - Implementation: no new tests; verified on the current tree that `aimOrient` (sim.ts) is the rate-limited $67 steer (~4.48°/frame via TIE_YAW_RATE/TIE_PITCH_RATE, "NOT the one-tick lookRotation re-point"), landed in sw8-2 (#119) with its own suite
  - Rationale: the item's premise describes the pre-sw8-2 tree; duplicating sw8-2's coverage would add noise, not protection
  - Severity: minor
  - Forward impact: none
- **T5a descoped — already shipped by sw8-2 AC7**
  - Spec source: session Story Context, item T5a
  - Spec text: "transcribe rows 8-15 from WSCPU.MAC:736" (waves 9-11 held 0x80 vs ROM 03,60/03,40/03,30)
  - Implementation: no new tests; re-verified this session against the primary source (WSCPU.MAC:736-748: rows 8/9/10 = 060/040/030, table ends at TGPROZ row 10, ROM clamps deeper indices to row 10) that state.ts FIRE_THRESHOLD/FIRE_MASK/FIRE_CONCURRENCY match verbatim including the saturation; pinned by tests/core/late-wave-fire-cadence.test.ts
  - Rationale: the story's "rows 8-15" framing was itself imprecise (the ROM defines 11 rows, 0-10, then clamps — the shipped port and its suite encode exactly that); nothing left to transcribe
  - Severity: minor
  - Forward impact: none
- **T5b test strategy — visibility gate pinned, C_AS election left undecided**
  - Spec source: session Story Context, item T5b
  - Spec text: "§6 fire cond-1 uses C_AS … vs the ROM literal first gate C$PV … revisit whether C$PV semantics change feel"
  - Implementation: tests/core/tie-fire-visibility.test.ts pins (a) a new C_PV status bit implementing the WSMAIN.MAC:3824-3846 view-pyramid law (±45° ratio, near 0x10 / far 0x7F00, measured from the moving spaceEye) and (b) the §6 gate's cond-1 (an out-of-view TIE never fires), with an in-view keep-behavior guard; every firing fixture aims its nose at the cockpit so the suite is green whether Dev ships C_PV-alone (full ROM) or C_PV∧C_AS (election kept)
  - Rationale: the ROM's cond-1 is unambiguous and portable now; the drop-C_AS-or-keep-it question is a feel/design decision the story text explicitly leaves open ("revisit") — manufacturing a direction in RED would be the rb4-16 mistake. Routed to Dev/design via Delivery Finding
  - Severity: minor
  - Forward impact: Dev decides the conjunction; the fire-rate consequence is logged for sw8-8

### Dev (implementation)

- **spaceEye moved from sim.ts to gameRules.ts (re-exported from sim.ts)**
  - Spec source: session Story Context, item T5b (implies computeStatus reads the eye)
  - Spec text: "C$PV (player-can-see-us, first gate WSCPU.MAC:624)" — no module layout specified
  - Implementation: `spaceEye`/`SPACE_EYE_SHIFT_PER_FRAME`/`EYE_WRAP` now live in gameRules.ts; sim.ts re-exports them so render.ts and all existing importers keep their path
  - Rationale: tie-status.ts needed the eye and already imports from gameRules (toCockpit precedent — gameRules is the established home for shared view/aim geometry, cf. FOV_Y); importing from sim.ts would create a tie-status ↔ sim core cycle
  - Severity: minor
  - Forward impact: none — public API unchanged via re-export; citation pins re-anchored (24 moved, 0 lost)
- **C_AS kept alongside C_PV (conjunction), not the ROM's C_PV-only gate**
  - Spec source: session Story Context item T5b + TEA Assessment ("KEEPING the existing C_AS check alongside is permitted by the suite; DROPPING it … is design-owned")
  - Spec text: "the design deliberately elected the in-core-geometry bit; revisit whether C$PV semantics change feel"
  - Implementation: §6 gate is now `inView && inSights && …` — C$PV added as cond-1 in ROM order, C_AS retained
  - Rationale: minimal change that closes the off-screen-shooter divergence while preserving the standing sw8-2 AC8 election; the drop-C_AS question is a feel decision routed to design/playtest via TEA's Delivery Finding
  - Severity: minor
  - Forward impact: effective fire rate remains below the cabinet's (cone ∧ window ∧ roll); interacts with sw8-8's fairness scope as logged

### Reviewer (audit)

- **TEA: T4a descoped (owned by sw8-9)** → ✓ ACCEPTED by Reviewer: verified sw8-9 exists in epic-sw8.yaml (backlog, 3pt) with exactly the §5 play-cube-clamp + loiter scope, and sim.ts's own TODO(playtest) marks the deferral — testing it here would collide with a filed story.
- **TEA: T4d descoped (shipped by sw8-2 AC4)** → ✓ ACCEPTED by Reviewer: read `aimOrient` myself — a clamped per-frame steer multiplied onto the current orientation, the property a snap cannot fake; sw8-2's suite owns the coverage.
- **TEA: T5a descoped (shipped by sw8-2 AC7)** → ✓ ACCEPTED by Reviewer: FIRE_THRESHOLD/FIRE_MASK rows 8-10 + row-10 saturation match the primary source (TEA re-checked WSCPU.MAC:736-748 this session); late-wave-fire-cadence.test.ts pins it. Nothing left to transcribe.
- **TEA: T5b visibility-only, C_AS election left open** → ✓ ACCEPTED by Reviewer: verified the neutrality in the test file — every firing fixture aims its nose at the cockpit, so the suite passes under C_PV-alone or C_PV∧C_AS; the election question is properly routed as a Delivery Finding rather than a manufactured test direction (the rb4-16 rule applied correctly).
- **Dev: spaceEye moved to gameRules.ts (re-exported from sim.ts)** → ✓ ACCEPTED by Reviewer: the cycle argument is real (sim imports computeStatus; tie-status needs the eye), gameRules is the established shared-geometry home (FOV_Y/toCockpit), the function body moved byte-identical, and the re-export keeps render.ts's import path — suite 1907/1907 + build green prove the seam held.
- **Dev: C_AS retained alongside C_PV** → ✓ ACCEPTED by Reviewer: minimal change consistent with the standing sw8-2 AC8 election; the gate comment now documents that the ROM itself has no aim-cone test, and the drop-or-keep decision is routed to design/playtest via TEA's finding. Suite-neutral by construction.

## Sm Assessment

Setup complete and verified; routing to TEA for the RED phase.

- **Story validated against epic YAML** (sprint/epic-sw7.yaml:302): title, repos (star-wars), points (3), workflow (tdd) all match the `pf sprint story field` output — no misreporting this time.
- **Sibling-race check clean:** fetched star-wars origin/develop and arcade origin/main; no commit mentions sw7-24. No sibling checkout has started or landed this story.
- **Merge gate clear:** zero open PRs on slabgorb/star-wars.
- **Branch:** `feat/sw7-24-vm-flight-fire-tuning` created in star-wars off origin/develop (fetched first — local develop refs go stale).
- **Context:** sprint/context/context-story-sw7-24.md written fresh (no pre-existing hand-authored file, so no clobber risk). Parent story's archived session is sprint/archive/sw7-23-session.md (the PR #110 story) — TEA should read its Delivery Findings before RED.
- **Scope note for TEA:** four independent items (T4a feel-tune via §5.3 play-cube clamp, T4d $67 aim law, T5a TGPROB rows 8-15, T5b C$PV gate). T5a is the most mechanical (transcription from WSCPU.MAC:736 — verify .RADIX 16 before reading the rows). T4a/T4d/T5b are playtest-prioritised feel items; the story description says playtest decides priority, so a playtest pass belongs early in the phase. Reference source lives at /Users/slabgorb/Projects/star-wars-1983-source-text.
- **Dev-server caveat:** port 5274 may be owned by a sibling checkout — verify server cwd via lsof or serve this tree on a spare port (e.g. 5284) before trusting any visual playtest.

## TEA Assessment

**Tests Required:** Yes — for the story's one surviving item (T5b). T4a/T4d/T5a are descoped with owners/evidence (see Design Deviations).

**Live-scope ruling (the load-bearing finding):** this story was filed against the PR #110 tree, but epic sw8 landed six stories on the same subsystem since — sw8-2's title literally says "absorbs backlog sw7-24" (done, approved, 2026-07-21). Verified item-by-item on today's origin/develop:
- **T4d** ($67 aim law): SHIPPED — `aimOrient` is the rate-limited $67 steer (sw8-2 AC4, own suite).
- **T5a** (deep TGPROB rows): SHIPPED — FIRE_MASK/FIRE_THRESHOLD/FIRE_CONCURRENCY match WSCPU.MAC:736-748 verbatim incl. the row-10 clamp (re-checked against the primary source this session; pinned by late-wave-fire-cadence.test.ts).
- **T4a** (play-cube clamp / approach feel): OPEN but owned by filed story **sw8-9** (backlog) — not this story's to test.
- **T5b** (C$PV fire gate): OPEN and unowned elsewhere — sw8-2 AC8 ruled it "not revisited", but sw8-6/sw8-7 then changed the choreography so TIEs routinely sit BEHIND the eye, where the current C_AS-only gate lets them fire from off-screen (the ROM's literal first gate forbids it). This is the story's delivered scope.

**Test Files:**
- `star-wars/tests/core/tie-fire-visibility.test.ts` — C_PV status bit (WSMAIN.MAC:3824-3846 view-pyramid law: ±45° ratio test, near 0x10/far 0x7F00, measured from the moving `spaceEye`) + §6 fire-gate cond-1 (WSCPU.MAC:624-626 "NO SHOOTING GUNS IF PLAYER CANT SEE US") + in-view keep-behavior guard.

**Tests Written:** 6 tests (5 RED + 1 guard) covering the T5b contract
**Status:** RED (verified by testing-runner, RUN_ID sw7-24-tea-red): 1907 tests total, exactly my 5 new ones failing, guard green, all 181 other files green, tsc clean. Empirical sting on today's tree: the behind-the-eye TIE fired 30×/160 frames, the far-lateral one 23×.

**Dev notes (Bicycle Repair Man):**
- Implement `C_PV` in `computeStatus` (tie-status.ts) from the WSMAIN.MAC:3824-3846 law relative to `spaceEye(state)`: view-depth `eye[2] − pos[2]` must be in (0x10, 0x7F00], and lateral²/vertical² (eye-relative) strictly < depth². `Status.C_PV = 0x1000` already exists in tie-vm.ts.
- Gate §6 fire on it (sim.ts decision tick) as cond-1. KEEPING the existing C_AS check alongside is permitted by the suite; DROPPING it for full ROM parity is too — that choice is design-owned (see Delivery Findings; the ROM fires on C$PV alone).
- Sibling surface is pre-swept: strafe/homing suites inject `enemyShots` directly; tie-fire-cadence/space-combat fixtures all stage in-view TIEs; tie-status.test.ts asserts bit-masks, never full-word equality; determinism suites compare run-to-run. No re-seats were needed.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| TS #1 type-safety escapes | no `as any`/`@ts-ignore`/double-casts in the new suite (only the fleet's `[...pos] as Vec3` tuple idiom) | clean |
| TS #4 null/undefined | fixtures build complete `Enemy`s via `makeTie` — no optional-field traps | clean |
| Core purity (repo sacred boundary) | new suite: no DOM, no wall clock, RNG only via seeded `rngSeed`/state — same discipline `core-purity` enforces | passing |
| Test quality (vacuous-assertion self-check) | every `it` asserts concrete values; in-view SET asserted FIRST in each status test so nothing passes on the unfixed bit-never-set code; fire tests carry the discriminability guard | self-checked |

**Rules checked:** 4 of 4 applicable (test-only change; no `.claude/rules/` or `SOUL.md` exist in star-wars)
**Self-check:** 0 vacuous tests found

**Handoff:** To Dev for implementation (GREEN): make the 5 RED tests pass without disturbing the 1902 green ones.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `star-wars/src/core/tie-status.ts` — `computeStatus` derives `C_PV` from the WSMAIN.MAC:3824-3846 view-pyramid law (new `VIEW_NEAR = 0x10` / `VIEW_FAR = 0x7f00` consts; ±45° strict-ratio test, eye-relative on all three axes); header comment updated to stop claiming the module is unwired
- `star-wars/src/core/sim.ts` — §6 fire gate gains cond-1 `inView` (C$PV, ROM order first; C_AS election retained per the routed design question); `spaceEye`/`SPACE_EYE_SHIFT_PER_FRAME`/`EYE_WRAP` moved out, re-exported from `./gameRules` so every import path survives
- `star-wars/src/core/gameRules.ts` — receives `spaceEye` + constants verbatim (doc block preserved, move note appended); the established shared view/aim-geometry home (FOV_Y/toCockpit precedent)
- `star-wars/docs/audit/findings/*.json` — citation pins re-anchored (`tools/audit/reanchor-citations.mjs --write`: 24 moved by the +5-line gate edit, 75 already correct, 0 lost)

**Tests:** 1907/1907 passing (GREEN; testing-runner RUN_ID sw7-24-dev-green). tie-fire-visibility 6/6, citations 12/12, tsc + vite build clean. No sibling re-seats were needed — TEA's pre-sweep held.
**Branch:** feat/sw7-24-vm-flight-fire-tuning (pushed, commit 21c34de)

**Handoff:** To review. The headline for the Argument Professional: the only behavioural change is that a TIE outside the player's view pyramid no longer fires (ROM WSCPU.MAC:624-626); in-view fire, cadence, thresholds, choreography, and collision are untouched, and the eye function moved modules without changing a byte of its body.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1907/1907 green, tsc clean, diff scope exact, 0 smells, citations 12/12 isolated |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (boundary semantics + M2 mutation below) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (no throwing/fallback paths added; NaN pos fails safe to C_PV-clear) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed directly via 4-mutation battery (1 survivor, logged LOW) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (1 stale count found, logged LOW) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (no escapes; inline `type` import correct; value re-export correct) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (no input surface, no tenancy, client-only sim arithmetic) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (per-enemy spaceEye call noted, negligible; no abstraction added) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — full typescript lang-review checklist walked by hand (see Rule Compliance) |

**All received:** Yes (1 enabled returned; 8 disabled per settings, domains covered directly)
**Total findings:** 2 confirmed (both LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Observations (evidence-cited):**

1. `[VERIFIED]` §6 gate consumes C_PV in ROM order — `src/core/sim.ts:378` computes `inView` from the status word and the gate at `:382` tests it first, matching WSCPU.MAC:624-626's `BITA #C$PV/100 / BEQ` as cond-1. Mutation M1 (drop `inView &&`) reddens exactly the two never-fires tests — the gate is load-bearing, not decorative. Complies with the core-purity rule (no new globals/time/randomness).
2. `[VERIFIED]` The C_PV law matches the ROM byte-for-byte in semantics — `src/core/tie-status.ts` pyramid block: strict `<` on both ratio axes (ROM `LBHS` puts equality OUT), `depth > 0x10` (LBLE: 16 is out), `depth <= 0x7f00` (LBHI: the far edge is in). Mutations M3 (origin-anchored lateral) and M4 (depth sign flip) are each caught by the suite (1 and 5 failures respectively).
3. `[VERIFIED]` The one-frame-stale eye is ROM-faithful, not a bug — `computeStatus` reads `spaceEye(state)` (step-start frame) while the fire gate uses the incremented local `frame`; the ROM does the same: C$PV is set by the PREVIOUS frame's view pass and PRESERVED through the rebuild (`ANDA #C$PV/100 ;SAVE IF IN VIEW FOR GUNS`, WSCPU.MAC:532-536). Our pipeline lag reproduces the cabinet's.
4. `[VERIFIED]` Determinism/RNG stream intact — the C_PV computation draws no RNG (pure arithmetic on frame + pos), so the seeded stream order is unchanged; space-determinism suites pass untouched. `[TYPE]` no type escapes added; `FIRE_THRESHOLD, type GameState` inline type import and the value re-export `export { spaceEye, … } from './gameRules'` are both isolatedModules-correct forms.
5. `[VERIFIED]` Citation re-anchors preserved their instances — the two "took nearest" pins (G-009 → sim.ts:565, S-016 → :558) both equal old-line+5, i.e. the same statement instance; preflight's isolated citations run (12/12) confirms every verbatim still resolves.
6. `[TEST]` `[LOW]` (confirmed) Exact-equality pyramid boundary unpinned — mutation M2 (`<` → `<=` on both ratio axes) survives the full visibility suite: the tests pin 3999-in/4001-out but not 4000-out (`lat² === depth²`, which the ROM's BHS excludes). Code is correct; the guard has a one-assertion hole at exactly ±45°. Owner: fold into sw8-8 (fire-fairness verification) — see Delivery Findings.
7. `[DOC]` `[LOW]` (confirmed) Stale count in docstring — `tie-status.ts` `computeStatus` doc still opens "OR together the 6 status bits this task owns"; with C_PV it is now seven. One-word staleness (the file header was updated, this docstring was missed). Owner: same sw8-8 touch — see Delivery Findings.
8. `[DOC]` (observation, not a defect) The new C_PV comment's "the bit cannot lie about what is on screen" mildly overstates: the pyramid is ±45° while the render's FOV_Y is 60° (±30° vertical), so a TIE 30-45° off-axis vertically is in C_PV but outside the drawn frame. This is the ROM's OWN law (the cabinet had the identical property), so the port is faithful; the sentence means "measured from the correct, moving eye," which is true.
9. `[EDGE]` Behind-the-eye loiterers can still stall a wave by being unshootable — pre-existing (they were unshootable before this change too; this change only stops them shooting the player) and owned by sw8-9's loiter/play-cube scope. Not a regression.
10. `[SEC]` `[SILENT]` `[SIMPLE]` No security surface (no user input parsing, no tenancy — client-only deterministic sim), no swallowed errors (no throwing paths added; degenerate NaN positions fail safe to C_PV-clear → no fire), no unnecessary abstraction (the per-enemy `spaceEye` recomputation is ~10 arithmetic ops × ≤6 enemies × TICK_HZ — not worth hoisting churn).

**Data flow traced:** `state.enemies[i].pos` → `computeStatus` (C_PV from `spaceEye(state)`, C_AS from orient) → status word → both `tickChoreo` (VM) and the §6 fire gate → `enemyShots.push` + `enemy-fire` event → `homeShots` → cockpit collision/shield loss. The new bit can only REMOVE fire events (a strictly narrowing conjunct); it adds no new state, no new events, and cannot affect motion, scoring, or spawning.

**Pattern observed:** shared view/aim geometry consolidated in gameRules.ts (FOV_Y, toCockpit, now spaceEye) with sim.ts re-exporting for the shell — the established one-eye-one-gun seam (sw7-16) survives the move at `src/core/sim.ts:2059-2064`.

**Error handling:** no failure paths added; `computeStatus` retains the IDENTITY-orient fallback for minimal fixtures; total arithmetic (no division — the ROM's ratio law is ported as squared-compare, division-free like the original).

### Rule Compliance

Walked the full `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) against every changed `.ts` file (no `.claude/rules/` or `SOUL.md` exist in star-wars; CLAUDE.md's hard core/shell boundary applied):

| Check | Result |
|-------|--------|
| 1 type-safety escapes | PASS — no `as any`/`@ts-ignore`/`!`/double-casts in diff (test file uses only the fleet's `[...pos] as Vec3` tuple idiom) |
| 2 generic/interface | PASS — new consts are plain `number`; no `Record<string, any>`/`Function`/`Partial` introduced |
| 3 enums | PASS — `Status` is a frozen `as const` object (no TS enum), untouched |
| 4 null/undefined | PASS — no optional-field handling added; pre-existing `vm?.twist ?? 0` untouched |
| 5 module/declaration | PASS — `type GameState` inline import and value re-export are the correct isolatedModules forms; extensionless imports match repo convention (Vite bundler resolution) |
| 6 React/JSX | N/A — no .tsx |
| 7 async/promise | PASS — no async code in diff |
| 8 test quality | PASS with one LOW — assertions all concrete with message strings; in-view SET asserted first (no vacuous pass on unfixed code); the M2 equality-boundary gap is finding #6 |
| 9 build/config | PASS — untouched |
| 10 security/type-level validation | N/A — no external input typed or parsed |
| 11 error handling | PASS — no catch blocks; total functions |
| 12 performance/bundle | PASS — no new imports from barrels; pure arithmetic in the hot path |
| 13 fix-introduced regressions | PASS — no `as any` silencing, no `||`-for-`??` |

CLAUDE.md hard boundary: PASS — core gained no DOM/time/randomness; `spaceEye` moved core→core; the shell still imports through sim.ts. `core-purity` suite green.

Tenant isolation: N/A by architecture — client-only game, no tenant data, no trait methods handling external data; checked all three changed core files for any input-bearing signature: none.

### Devil's Advocate

Suppose this change is broken. The strongest attack: the gate now silences fire from any TIE the pyramid excludes — what if the pyramid excludes somewhere the game NEEDS fire from? Walk the geometry: spawns seat at depth 0x7C00 dead ahead with ±2048 lateral corners — inside the pyramid by construction (0x7C00 < 0x7F00 far edge, corner ratio 2048/31744 ≈ 0.06). Approaching TIEs converge toward the crosshair, staying inside. The only excluded population is behind-the-eye loiterers and extreme flankers — precisely the fire the ROM forbids, and the player-facing complaint sw8-8 exists for. Could a wave soft-lock? Only via an unshootable loiterer that ALREADY could not be killed before this change — the change removes its gun, not its body; no new lock. Could the ±45°-vs-render-FOV mismatch make an off-screen-but-in-pyramid TIE feel unfair? It could fire from ~35° above the nose unseen — but the cabinet had the same property (same law, same constants), and vertically-extreme TIEs are transient (choreography pitches toward the crosshair). Could the one-frame-stale eye misjudge the pyramid at the sawtooth wrap? At the wrap the eye jumps 4096 units; a TIE within ±~4096 of a pyramid edge could be misclassified for exactly one frame — the ROM's preserved-bit pipeline has the identical single-frame lag at its own wrap, and one frame cannot open a fire window that matters (windows repeat every 4-16 frames). Could the module move break a consumer? Only three importers exist (render.ts, two test files) — all resolve through the re-export, proven by tsc + 1907 green. Could the re-anchored citations now lie? Both nearest-picks resolve to old-line+5 — the same statements. What survives this interrogation is the M2 equality hole and the stale "6 bits" docstring — both logged as LOW findings with a named owner. Nothing here rises to a defect in the shipped behaviour.

**Handoff:** To SM (The Announcer) for finish-story.

## Impact Summary

**Delivered scope:** T5b only — the C$PV "player has alien in view" fire gate (WSCPU.MAC:624-626 cond-1): `computeStatus` now derives `C_PV` from the WSMAIN.MAC:3824-3846 view-pyramid law measured from the moving `spaceEye`, and the §6 fire gate requires it, so no TIE fires from off the player's screen. C_AS in-arc election retained alongside (design-owned question, routed). `spaceEye` relocated to gameRules.ts (re-exported from sim.ts; body byte-identical). 6 new tests (5 RED→GREEN + 1 guard); suite 1907/1907; citations re-anchored (24 pins, 0 lost).

**The other three story items were NOT delivered here, by verified design:**
- **T4d** ($67 aim law) and **T5a** (deep TGPROB rows): already SHIPPED by sw8-2 (#119, done 2026-07-21, whose title says "absorbs backlog sw7-24") — both re-verified against the current tree and the primary source this session.
- **T4a** (§5 play-cube clamp / approach feel): open, owned by filed story **sw8-9** (epic-sw8.yaml, backlog).

**Follow-up routing (all owners are filed stories):**
- C_AS-vs-C$PV election (drop the cone for full ROM parity?) → design/playtest pass; interacts with **sw8-8**.
- Reviewer LOWs (equality-boundary test assertion + "6 bits" docstring word) → **sw8-8**, same files it will touch.
- sw8-9 may note its fire-unfairness half is closed by this story; its loiter/no-ram geometry scope is unchanged.

**Tracking correction (for the record):** sw8-2's "absorbs backlog sw7-24" never closed the epic-sw7 backlog entry, which is why this story was picked up a second time; this session verified the residue item-by-item and delivered exactly the surviving one. Future greps: do not re-open T4a/T4d/T5a from this story's text — see the owners above.

**Blocking:** 0 blocking items. Review verdict APPROVED (round 1); merge-base equals origin/develop tip (trial-merge no-op; suite green on the exact merged tree).