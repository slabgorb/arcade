---
story_id: tp1-15
jira_key: tp1-15
epic: tp1
workflow: tdd
---
# Story tp1-15: THE SPIKE MODEL — a charge burrows into a spike, cutting it to the bullet's own position over two hit-frames

## Story Details
- **ID:** tp1-15
- **Jira Key:** tp1-15
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 3
- **Priority:** p1

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-16T06:26:04Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-16T04:45:16Z | 2026-07-16T04:46:49Z | 1m 33s |
| red | 2026-07-16T04:46:49Z | 2026-07-16T05:10:10Z | 23m 21s |
| green | 2026-07-16T05:10:10Z | 2026-07-16T05:29:33Z | 19m 23s |
| review | 2026-07-16T05:29:33Z | 2026-07-16T05:56:02Z | 26m 29s |
| red | 2026-07-16T05:56:02Z | 2026-07-16T06:04:26Z | 8m 24s |
| green | 2026-07-16T06:04:26Z | 2026-07-16T06:14:08Z | 9m 42s |
| review | 2026-07-16T06:14:08Z | 2026-07-16T06:26:04Z | 11m 56s |
| finish | 2026-07-16T06:26:04Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Improvement** (blocking): fixing W-047, V-020, DB-014 makes their `ours` quotes false and
  shifts cited line numbers in the files you edit. Affects `docs/audit/findings/pair-1/2/4-*.json`
  (mark each `"remediated_by": "tp1-15"`, then run `node tools/audit/reanchor-citations.mjs --write`;
  AC-4 `npm test -- citations` must stay green). W-047's `ours` still names the exact divergent line
  `src/core/sim.ts:500`.
- **Improvement** (non-blocking): W-047's SCORING sub-part is ALREADY faithful — `SCORE_SPIKE_SEGMENT = 1`
  (rules.ts:126) cites LIFECT's `TEMP0=1` (ALWELG.MAC:2606). Only the MECHANISM (flash-kill + flat
  `SPIKE_SHORTEN = 0.08`) is still divergent. Affects `src/core/sim.ts` (resolveSpikeHits is the whole fix).
- **Gap** (non-blocking): the far-base edge — when a charge burrows to depth 0 (ROM `CHARY >= ILINDDY`,
  `CMP I,ILINDDY / IFCS / LDA I,0`, ALWELG.MAC:2598-2601) LIFECT sets the tip to 0 (clears the line),
  not to the charge's position. Affects `src/core/sim.ts` (resolveSpikeHits should clear the spike to 0
  at the base). NOT pinned here (immaterial to the H=0.6 scenario per the audit's own refutation).
- **Gap** (non-blocking): the exact SPARK1/SPARK2 tip geometry — four YELLOW dots at ±0x10 (=16) on the
  AXES (SPARK1) / DIAGONALS (SPARK2), alternated to twinkle (ALVROM.MAC:672-697; picked at random,
  ALDISP.MAC:3193-3197). Affects `src/shell/render.ts` drawSpikes (and possibly `src/shell/glyphs.ts`).
  The render test pins colour + dot-count only; transcribe the ±16 positions from the cited lines.

No blocking upstream findings beyond the citation-gate reminder above.

### Dev (implementation)
- **Improvement** (non-blocking): the mechanism change rippled to two sibling suites RED did not
  name — `tests/core/sim.audio-events.test.ts` (its flat-`SPIKE_SHORTEN` "it really hit" check) and
  `tests/core/tp1-3.cheap-wins.test.ts` (its "1 point per bullet" B-016 guard). Both re-seated to the
  burrow (cut-to-depth / two-bite score = 2), intent preserved. Reviewer should confirm the re-seats.
- **Gap** (non-blocking): the ROM's far-base clear (`CHARY >= ILINDDY → LINEY = 0`, ALWELG.MAC:2598-2601)
  is not explicitly branched. Affects `src/core/sim.ts` (resolveSpikeHits). In our inverted coords the
  base is depth 0 and `stepBullets` culls a charge at depth <= 0 before its next bite, so a spike within
  ~1 frame of the base is left as a sub-pixel stub instead of clearing to 0. Immaterial (per TEA); a
  future story wanting exactness would clear the spike when the cut position reaches the base.

### Reviewer (code review)
- **Conflict** (blocking): the far-base clear omission is a spike-CLEARABILITY REGRESSION, not immaterial —
  a spike can never be shot to 0 (probe: 0.05 → 0.0134 floor), the ROM's `LINEY<-0` (ALWELG.MAC:2598-2602)
  is dropped, and `resolveWarpSpikeHit` crashes for any height>0, so a shot-at warp lane can never be made
  safe. Affects `src/core/sim.ts` (`resolveSpikeHits` at :512 + the `stepBullets` cull order at :112) —
  clear the spike to 0 when the burrowing bite crosses the base; add a TEA clearability test. *Found by
  Reviewer (Independent ROM Auditor) during code review.*
- **Improvement** (non-blocking): reset `spikeShattered` alongside `spikes` in `startGameAtLevel`/
  `loadNextWave`/`replayWave` (and/or clear it in `dying`/`flyIn` frames). Affects `src/core/sim.ts` —
  avoids a one-lane sparkle painted through a death pause and a `spikeShattered.length` drift across
  open↔closed tube transitions (currently harmless — initial length 16 ≥ every tube — but latent).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `SPIKE_SHORTEN` is now production-dead. Consider inlining `0.08` in the
  burrow test and deleting the export in a cleanup. Affects `src/core/rules.ts`. *Found by Reviewer.*
- **Improvement** (non-blocking, re-review round 1): the base-clear frame is fully side-effect-free — it
  awards no point and emits no `spike-shot` cue (the ROM's base-crossing bite does both, ALWELG.MAC:2602-2615).
  A spike shot fully clean scores 1 point fewer + misses one sound cue. Affects `src/core/sim.ts` (a faithful
  fix reorders move→bite→cull so a depth<=0 charge registers a real base bite). Non-blocking. *Found by
  Reviewer during re-review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **Re-seated sim.spikes.test.ts's flash-kill assertion**
  - Spec source: context-story-tp1-15.md, AC-1 (finding W-047)
  - Spec text: "A player charge BURROWS into a spike ... over two hit-frames, scoring 1 point per frame."
  - Implementation: removed `expect(out.bullets).toHaveLength(0)` from the existing "a bullet shortens
    the spike in its lane and scores" test; the charge's burrow lifecycle now lives in
    tp1-15.spike-burrow.test.ts. The kept "shortens + scores" assertions pass under BOTH the old and
    new mechanic.
  - Rationale: that assertion encodes the DELETED instant-kill contract — it would flip RED at GREEN and
    Dev cannot move goalposts (TEA owns test maintenance). Re-seated to its orthogonal intent only.
  - Severity: minor
  - Forward impact: none
- **Far-base clear (LINEY=0) edge left unpinned**
  - Spec source: W-047 refutation; ALWELG.MAC:2598-2601
  - Spec text: "a narrow edge case at CHARY>=ILINDDY zeroes it instead, immaterial here"
  - Implementation: the suite pins the general cut-to-position path (spike at 0.6, charge stays ~0.53);
    it does not exercise a charge burrowing all the way to depth 0 (the far base), where the tip clears to 0.
  - Rationale: the audit itself calls this edge "immaterial here", and staging a full burrow-to-base costs
    many frames for a narrow case. Routed to a cited Delivery Finding for Dev.
  - Severity: minor
  - Forward impact: Dev implements clear-to-0 at the base; Reviewer diff-traces it against the citation.
- **Shattered visual pinned as colour + dot-count, not pixel-exact geometry**
  - Spec source: context-story-tp1-15.md, AC-2 (V-020/DB-014); ALVROM.MAC:672-697
  - Spec text: "The shattered-spike visual matches the ROM."
  - Implementation: the render test asserts the tip becomes >=4 YELLOW dots with no white cap; it does NOT
    pin the exact SPARK1/SPARK2 vertex positions (±0x10 axes/diagonals) or the twinkle alternation.
  - Rationale: repo convention is "colour-family + topology, not pixels" (sw3-9) — projected screen pixels
    would reject a faithful port over a scale/rotation choice. The exact geometry is routed to Dev with a
    citation and lands byte-exact via the citation gate.
  - Severity: minor
  - Forward impact: Reviewer verifies the ±16 dot geometry against ALVROM.MAC:672-697.

### Dev (implementation)
- **Added a decoy enemy to the burrow test fixture**
  - Spec source: tests/core/tp1-15.spike-burrow.test.ts (TEA's `spikeAndCharge()` helper)
  - Spec text: fixture staged `s.enemies = []` with a spike + charge
  - Implementation: added `makeEnemy('flipper', 10, 0.05, levelParams(1))` so the board is never empty.
  - Rationale: an empty board makes `checkLevelClear` warp the level out on frame 1 (which clears the
    charge on warp entry), so the two-frame burrow, slow-down, and transient-clear could never play out
    in 'playing' mode. The decoy is parked deep on a distant lane, fires nothing, and touches neither the
    charge, the spike, nor the score — every assertion is unchanged (the exact `enemies = []` trap TEA's
    own sidecar documents).
  - Severity: minor
  - Forward impact: none
- **Re-seated tp1-3.cheap-wins.test.ts's per-bullet score from 1 to 2**
  - Spec source: tests/core/tp1-3.cheap-wins.test.ts, AC3 / B-016
  - Spec text: "a single bullet-vs-spike hit awards exactly 1 point end-to-end"
  - Implementation: changed `expect(s.score).toBe(1)` to `toBe(2 * SCORE_SPIKE_SEGMENT)`.
  - Rationale: W-047 turns one flash-kill into a two-frame burrow, so a charge now bites twice (+1 each)
    = 2 points. B-016's real guard — the award is `SCORE_SPIKE_SEGMENT` PER BITE, never a multiplied 3 —
    is preserved (2, never 6). The constant B-016 pins (SCORE_SPIKE_SEGMENT = 1) is unchanged; only the
    emergent per-bullet total moved, by design.
  - Severity: minor
  - Forward impact: tp1-3's "1 point per bullet" pin is superseded by tp1-15's two-bite economy.
- **Re-seated sim.audio-events.test.ts's flat-trim "it really hit" check**
  - Spec source: tests/core/sim.audio-events.test.ts, AC2 (spike-shot cue wiring)
  - Spec text: `expect(out.spikes[4]).toBeCloseTo(SPIKE_MAX_DEPTH - SPIKE_SHORTEN, 5) // it really hit`
  - Implementation: changed to `expect(out.spikes[4]).toBeLessThan(SPIKE_MAX_DEPTH)`; dropped the now
    unused `SPIKE_SHORTEN` import.
  - Rationale: the burrow cuts the tip to the charge's OWN depth, not a flat `SPIKE_SHORTEN`. The suite's
    intent (one `spike-shot` cue per bite) is unchanged — one bite this frame → one event.
  - Severity: minor
  - Forward impact: none
- **Rework round 1: the base-clear does not score its final bite**
  - Spec source: Reviewer [HIGH]; W-047 / ALWELG.MAC:2598-2615
  - Spec text: LIFECT's base-crossing bite goes through `INC CHARCO` + `+1 score` before `LINEY<-0`.
  - Implementation: the base-clear lives in `stepBullets` (a charge crossing depth 0 on a spiked lane
    zeroes the line). The charge is then culled WITHOUT a final bite, so the clearing frame does not
    award the +1 the ROM's base-crossing bite would (the earlier above-base bites DO score normally).
    Net: a spike shot fully clean scores ~1 point fewer than the arcade.
  - Rationale: the minimal fix for the blocking clearability regression. Scoring the base-crossing bite
    faithfully needs the movement/cull moved AFTER `resolveSpikeHits` (so a depth<=0 charge can register
    a bite), which risks the enemy-collision passes (`resolveBulletHits`) false-hitting far-end enemies —
    disproportionate to a 1-point edge. Routed as a non-blocking Delivery Finding.
  - Severity: minor
  - Forward impact: a future story wanting exact clear-frame scoring reorders move→bite→cull.

### Reviewer (audit)
- **TEA "Re-seated sim.spikes.test.ts's flash-kill assertion"** → ✓ ACCEPTED: the dropped
  `toHaveLength(0)` encoded the deleted instant-kill contract; the burrow lifecycle is fully re-covered.
  Auditor B confirmed the remaining assertions still bite.
- **TEA "Far-base clear (LINEY=0) edge left unpinned"** → ✗ FLAGGED: this deviation's rationale
  ("immaterial per the audit") is UNSOUND. The audit's "immaterial here" applies to the 2-bite ECONOMY,
  not to spike CLEARABILITY. Leaving the base-clear unpinned let a real regression ship — a spike can
  never be shot to 0 (probe-confirmed 0.0134 floor), and the warp crash fires for any height>0. This is
  the [HIGH] finding; it must be pinned and fixed, not deviated away. See Reviewer Assessment.
- **TEA "Shattered visual pinned as colour + dot-count, not pixel-exact geometry"** → ✓ ACCEPTED: matches
  the repo's colour-family + topology convention; the ROM auditor independently confirmed yellow + 4 dots
  + axes/diagonals match SPARK1/SPARK2 (ALVROM.MAC:672-697). The ±0x10 radius is a legitimate render tunable.
- **Dev "Added a decoy enemy to the burrow test fixture"** → ✓ ACCEPTED: the documented `enemies=[]`
  warp trap; Auditor B confirmed the decoy never fires/moves-onto-lane/scores and — since every score
  assertion is exact-equality — can only cause a false failure, never a false pass. Not masking.
- **Dev "Re-seated tp1-3.cheap-wins per-bullet score 1→2"** → ✓ ACCEPTED: correctly reflects the two-bite
  economy; STRENGTHENS the B-016 "never a multiplied 3/6" intent; the pinned constant (SCORE_SPIKE_SEGMENT=1)
  is unchanged.
- **Dev "Re-seated sim.audio-events flat-trim check"** → ✓ ACCEPTED: the event-per-bite intent is preserved;
  `toBeLessThan(MAX)` still distinguishes hit from no-hit.
- **Dev "far-base clear-to-0 edge left unpinned" (Delivery Finding)** → ✗ FLAGGED (same as the TEA deviation):
  the "immaterial" framing understates it — it is the [HIGH] regression, in scope for THIS story (it is the
  spike model), not a future story. **→ RESOLVED in rework round 1 (fix `fa94c37`, verified).**
- **Dev "Rework round 1: the base-clear does not score its final bite"** → ✓ ACCEPTED (with a broader note):
  the base-clear frame is fully SIDE-EFFECT-FREE, not just point-free — it also emits no `spike-shot` sound
  cue (the ROM's SELICO on the base-crossing bite). The deviation undersold the scope. The impact is still
  minor and bounded (1 point + 1 sound cue per fully-cleared spike; the "missing sparkle" is moot as the
  spike is height 0 that frame). Accepted as non-blocking; the faithful alternative (reorder move→bite→cull)
  is disproportionate and risks the enemy-collision passes. Recorded as a fuller Delivery Finding.

## Sm Assessment

**Setup complete — routing to O'Brien (TEA) for the RED phase.**

Story tp1-15 "THE SPIKE MODEL": a player charge that BURROWS into a spike cuts
the spike back to the bullet's own position over two hit-frames, scoring 1 point
per frame; the shattered-spike visual must match the ROM.

**Setup verification:**
- Session file + validated context created (`sprint/context/context-story-tp1-15.md`).
- Branch `feat/tp1-15-spike-model` cut fresh off `origin/develop` (tempest is
  GITFLOW — targets `develop`, PRs squash-merge; NOT trunk-based).
- No sibling-checkout race: clean fetch, no branch/commit/PR anywhere mentions
  tp1-15. Merge gate clear (no open tempest PRs).
- Previous branch `feat/tp1-14-superzapper-cadence` was a stale done-branch
  (#131, already merged); deliberately branched off develop instead.

**Flags for TEA (RED phase) — tempest gotchas:**
- **Purity scanner reads COMMENTS.** `events.test.ts` scans sim.ts/events.ts/
  state.ts SOURCE TEXT (comments included) for forbidden globals; a comment
  sentence ending in "window." trips `/\bwindow\s*\./`. Watch spike/burrow prose.
- **Citation gate:** AC requires `npm test -- citations` stays green. A
  comment-only edit in a cited file shifts pinned lines and breaks it — re-anchor
  after ANY edit. `remediated_by` is only for defects actually removed.
- **Scope guards (in the ACs):** does NOT touch SPIKE_MAX_DEPTH (tp1-11) and does
  NOT touch spiker lane-hop polarity (tp1-3). Prior related work: tp1-11 (#129).
- ROM quarry for the spike/charge model lives in tempest's own reference source —
  pull each behavioral claim from the primary source before pinning the RED test.

## TEA Assessment

**Phase:** finish
**Tests Required:** Yes
**Reason:** ROM-fidelity behaviour change to core sim + a shell visual — both unit-testable.

**Status:** RED — 7 failing, 5 keep-behaviour guards green. Full suite: 7 failed / 1490 passed.
Ready for Dev (Julia). Committed as `545abfa` on `feat/tp1-15-spike-model`.

**Test files:**
- `tests/core/tp1-15.spike-burrow.test.ts` — the burrow mechanic (W-047) + the transient shattered
  flag (DB-014 core part). 10 tests (6 RED, 4 guards).
- `tests/shell/tp1-15.spike-shatter.test.ts` — the yellow SPARK1/SPARK2 tip render (V-020/DB-014
  shell part), driven through a recording ctx like render.tube-glow.test.ts. 2 tests (1 RED, 1 guard).
- `tests/core/sim.spikes.test.ts` — RE-SEATED: dropped the flash-kill assertion (see Design Deviations).

**What the ROM says (verified verbatim in ~/Projects/tempest-source-text):**
- `LIFECT` (ALWELG.MAC:2589-2626): a charge at/past a spike tip cuts `LINEY <- CHARY` (tip to the
  charge's OWN position), `INC CHARCO`, sets `LINSTA = 0xC0` (D7 recalc + D6 SHATTERED), awards
  `TEMP0=1` (one point), and deactivates once `CHARCO` reaches 2 → **two bites, +1 each, then spent**.
- `MOVCHA` (ALWELG.MAC:2530-2554): advances the charge `PCVELO=9`, but once it has bitten
  (`CHARCO != 0`) subtracts 4 → **slowed to 5/frame**. Our coords are inverted (depth 1=rim→0=far),
  so `LINEY<-CHARY` == `s.spikes[lane] = bullet.depth`, and one stepGame(SIM_STEP) == one ROM frame
  (a free charge advances PCVELO/224, a burrowing one 5/224).
- `SPARK1/SPARK2` (ALVROM.MAC:672-697): four YELLOW dots each (axes / diagonals at ±0x10), spliced
  in place of the white `WHITIP` dot when `LINSTA` bit 6 is set (`TIPACT`, ALDISP.MAC:3188-3210).

### Rule Coverage (ACs + project rules → tests)

| AC / rule | Test(s) | Status |
|-----------|---------|--------|
| AC-1 charge survives first contact | `SURVIVES the first spike contact` | RED |
| AC-1 cut to charge's own position (not flat) | `cuts the tip to the charge's OWN position` | RED |
| AC-1 two hit-frames, 1 pt each, then spent | `burrows over exactly TWO bites`, `scores exactly ONE point` | RED / guard |
| AC-1 slow after first bite (PCVELO-4) | `slows the charge after its first bite` | RED |
| AC-2 shattered flag set on hit (core, DB-014) | `flags the struck lane SHATTERED on the bite` | RED |
| AC-2 flag is transient (cleared next step) | `is TRANSIENT: clears on the next step` | RED |
| AC-2 yellow sparkle replaces white dot (V-020) | `replaces the white cap with a YELLOW four-dot sparkle` | RED |
| AC-3 other lanes / other spikes untouched | `leaves spikes in OTHER lanes untouched`, `intact tip stays white` | guard |
| AC-4 citations stay green | (no cited source file edited in RED) | green |
| Pure-core boundary (CLAUDE.md) | no new globals/DOM in tests; `spikeShattered` is plain data | n/a |

**Self-check:** no vacuous tests — every RED asserts a discriminating value (0-vs-1 bullets,
cut-to-position vs flat 0.08, +2-vs-+1 score, 5/224-vs-9/224 recession, boolean flag, yellow-vs-white
dots). The four "green now" tests are keep-behaviour guards (frame-model anchor, per-bite score,
other-lanes, intact white cap), not filler.

**For Dev (Julia) — the whole fix is `resolveSpikeHits` + a new state field:**
1. Add a per-charge hit counter (CHARCO) to `Bullet`; on a spike hit set `s.spikes[lane] = bullet.depth`,
   `+1` score, DON'T kill — deactivate only when the counter reaches 2. Slow the charge (×5/9, i.e.
   PCVELO-4) once it has bitten (see MOVCHA). Clear the tip to 0 at the far base (Delivery Finding).
2. Add `spikeShattered: boolean[]` to `GameState` (state.ts) + `initialState` + `cloneState` (sim.ts);
   set true for a lane on its bite, reset (all false) at the top of each step so it is transient.
3. Render the SPARK1/SPARK2 yellow sparkle in `drawSpikes` when `spikeShattered[lane]` — transcribe the
   ±0x10 dot geometry from ALVROM.MAC:672-697 (Delivery Finding).
4. Mark W-047/V-020/DB-014 `remediated_by: tp1-15` and re-anchor citations (Delivery Finding) — AC-4.

**Handoff:** To Julia (Dev) for the GREEN phase.

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 1497/1497 passing (GREEN) — full suite. Build clean (`tsc --noEmit` + `vite build`).
Citations green (reanchored, 0 lost). **Branch:** `feat/tp1-15-spike-model` (pushed).

**Files changed:**
- `src/core/rules.ts` — `SPIKE_BURROW_SPEED` (5/224, MOVCHA PCVELO-4) + `SPIKE_BURROW_HITS` (2, CHARCO);
  `SPIKE_SHORTEN` retired (kept as the value the burrow test refutes).
- `src/core/state.ts` — `Bullet.spikeHits?` (CHARCO, optional so bullet literals stay tsc-valid) +
  required `GameState.spikeShattered: boolean[]` (transient LINSTA D6), initialised in `initialState`.
- `src/core/sim.ts` — `resolveSpikeHits` rewritten as the burrow (cut tip to `b.depth`, flag shattered,
  +1, spend at 2 bites); `stepBullets` slows a charge once it has bitten; `cloneState` copies the flag.
- `src/shell/render.ts` — `drawSpikes` draws the yellow `SPARK1`/`SPARK2` four-dot sparkle (twinkling,
  ±0x10 axes/diagonals, ALVROM.MAC:672-697) at a shattered tip instead of the white JADOT dot.
- Tests — re-seated `sim.audio-events`, `tp1-3.cheap-wins`, and `tp1-15.spike-burrow` (decoy enemy);
  see Design Deviations.
- Audit — `W-047`/`V-020`/`DB-014` marked `remediated_by: tp1-15`; every shifted citation reanchored
  (`reanchor-citations.mjs`, 0 lost — incl. re-spelling V-003's white-dot verbatim into the else branch).

**ACs:** AC-1 burrow (survive → cut-to-position → two 1-pt bites → spent, slowed after bite 1) ✅;
AC-2 shattered flag + yellow sparkle ✅; AC-3 SPIKE_MAX_DEPTH (tp1-11) and spiker lane-hop (tp1-3)
untouched ✅; AC-4 citations green ✅.

**Verification note:** the core burrow is driven end-to-end through the real `stepGame` loop (the 12
tp1-15 tests + siblings). The shattered sparkle is a 1-2 frame transient flash on a bite — impractical
to eyeball live (and the pinned dev port may be a sibling checkout), so it is verified structurally via
the recording-ctx render test (yellow four-dot sparkle, no white cap).

**Handoff:** To the Thought Police (Reviewer) for the REVIEW phase.

## Subagent Results

The pf reviewer subagents are all toggled OFF except `preflight` (`workflow.reviewer_subagents`).
Because this story was self-authored (TEA+Dev+Reviewer, one session → ZERO independence), I spawned
TWO INDEPENDENT general-purpose auditors (per the self-authored-review sidecar) to supply the missing
independence, and ran a 7-case mutation battery + a clearability probe myself.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | 1497 tests / 25 citations / build all GREEN, tree clean, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Covered by Independent Auditor B (edge cases) + ROM Auditor (far-base edge = the HIGH) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Covered by Auditor B; the silent stub-cap is the HIGH finding |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Covered by Auditor B + my mutation battery (M1-M7 all RED-on-revert) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Checked myself — ROM citations accurate; the "immaterial" deviation prose is misleading (flagged) |
| 6 | reviewer-type-design | No | Skipped | disabled | Checked myself — `spikeHits?`/`spikeShattered` sound; test casts are RED-scaffolding (LOW) |
| 7 | reviewer-security | No | Skipped | disabled | N/A — client-only game, no user input / auth / tenant surface |
| 8 | reviewer-simplifier | No | Skipped | disabled | Checked myself — `SPIKE_SHORTEN` dead-but-intentional; no over-engineering |
| 9 | reviewer-rule-checker | No | Skipped | disabled | Did Rule Compliance myself (TS lang-review + pure-core boundary + citation gate) |
| — | Independent Auditor A (ROM re-decode) | Yes | findings | 1 HIGH + 1 LOW | HIGH confirmed (far-base clear); rest VERIFIED faithful |
| — | Independent Auditor B (code/test correctness) | Yes | findings | 2 LOW | Both confirmed non-blocking; no correctness defect, no vacuous/masking test |

**All received:** Yes (preflight + 2 independent auditors returned; 8 pf subagents disabled via settings)
**Total findings:** 1 HIGH confirmed, 2 LOW confirmed, 0 dismissed

## Reviewer Assessment

**Verdict:** REJECTED

The burrow economy, slow-down, per-bite scoring, and the shattered-sparkle visual are faithfully
transcribed and genuinely tested (my 7-case mutation battery M1-M7 each went RED on revert — no scenery
guards). The audit record is clean (no laundering — the only findings-prose change is V-003's white-dot
verbatim re-spell). BUT the independent ROM auditor caught a real regression I wrongly dismissed as TEA.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | **A spike can never be shot to 0** — the ROM's far-base clear (`CHARY>=ILINDDY → LINEY=0`, ALWELG.MAC:2598-2602) is omitted; `stepBullets` culls the charge at `depth<=0` BEFORE `resolveSpikeHits`, so `s.spikes[lane] = b.depth` is always strictly positive. The pre-tp1-15 `Math.max(0, h - SPIKE_SHORTEN)` DID reach 0 → this is a REGRESSION. `resolveWarpSpikeHit` (sim.ts:896) crashes for ANY `height>0`, so a spiked warp lane can never be made safe by shooting — a survival mechanic the ROM (and prior code) had. **Probe-confirmed:** a 0.05 spike shot repeatedly bottoms out at **0.0134, never 0**. | `src/core/sim.ts:512` (resolveSpikeHits) / `:112` (stepBullets cull order) | Clear the spike to 0 when the burrowing bite crosses the base (ROM `LINEY<-0`). Needs a TEA test: shoot a near-base spike → `spikes[lane]` reaches exactly 0, and the warp no longer crashes on a shot-clear lane. |

### Observations (5+ required)

- [EDGE][HIGH] far-base clear omission — the regression above. Independent ROM auditor high-confidence on mechanism; I probe-confirmed the clearability failure and read `resolveWarpSpikeHit` (sim.ts:896, crashes for any h>0).
- [EDGE][LOW] `spikeShattered` is not reset alongside `spikes` in `startGameAtLevel`/`loadNextWave`/`replayWave`, and is only cleared inside `resolveSpikeHits` (skipped in `dying`/warp-`warning`/`flyIn`). Consequence: a bite on the exact grab/last-descent frame leaves a one-lane sparkle painted through the death pause. Shell-only, no gameplay/determinism/crash effect (drawSpikes treats an out-of-range/undefined index as un-shattered). Non-blocking; recommend resetting it with `spikes`.
- [TEST][VERIFIED] every implemented guard bites — mutation battery M1 (cut-to-position), M2 (spend-at-2), M3 (slow-down), M4 (shattered-set), M5 (transient-clear), M6 (sparkle-render), M7 (survives-first-contact) ALL went RED on revert. The decoy flipper does NOT mask (every score assertion is exact-equality → can only cause a false failure, never a false pass — Auditor B). The COVERAGE HOLE that let the HIGH through: no test pins spike-clearability (the burrow suite uses H=0.6, never near the base).
- [DOC][MEDIUM→note] the TEA "far-base clear immaterial" deviation and the finding's "immaterial here" both mischaracterise the impact: the audit's "immaterial here" was about the 2-bite ECONOMY, not clearability. Flagged in the deviation audit.
- [TYPE][VERIFIED] `Bullet.spikeHits?` correctly optional (bullet literals stay tsc-valid), `(b.spikeHits ?? 0)` uses `??` not `||` (correct for the 0-is-valid case, TS checklist #4); `GameState.spikeShattered: boolean[]` required, seeded in `initialState`, deep-copied in `cloneState` (purity intact). The test-file `as unknown as GameState` / `Partial<WithShatter>` casts follow the house render-test pattern (render.tube-glow.test.ts) — RED-scaffolding, now that the field exists they could be dropped (LOW, non-blocking).
- [SEC][VERIFIED] N/A — client-only deterministic sim, no user input, auth, secrets, or tenant surface. No injection/XSS vectors in the diff.
- [SIMPLE][LOW] `SPIKE_SHORTEN` is now production-dead (only the burrow test imports it to refute); intentional per the rules.ts comment. No over-engineering; the `drawSpikeSparkle` twinkle off `renderTime` (not Math.random) is the correct deterministic-shell pattern.
- [RULE][VERIFIED] pure-core boundary respected — no DOM/window/Date.now/Math.random in sim.ts/state.ts/rules.ts, comments included (events.test.ts purity scan green); the render twinkle uses the shell clock, not core RNG. Citation gate green (remediated_by freeze correct, 0 lost after reanchor).

### Rule Compliance (TS lang-review + project rules)

| Rule | Applies to | Verdict |
|------|-----------|---------|
| Pure-core boundary (CLAUDE.md) | sim.ts/state.ts/rules.ts changes | ✓ compliant — no forbidden globals, comments clean, purity test green |
| `??` not `||` for 0/'' (TS #4) | `(b.spikeHits ?? 0)` | ✓ compliant |
| No `as any` / double-cast in prod (TS #1) | src/* diff | ✓ none in production; test casts follow house pattern (LOW) |
| `readonly` on immutable arrays (TS #2) | `SPIKE_SPARK_AXES/DIAGONALS` | ✓ `ReadonlyArray<readonly [number, number]>` |
| Citation gate must stay green (CLAUDE.md) | docs/audit/findings | ✓ green, no laundering (diff = reanchors + remediated_by + V-003 re-spell only) |
| New state field survives clone (repo invariant) | `spikeShattered`, `spikeHits` | ✓ cloneState `.slice()` + `{...b}` spread |

### Data flow traced

Player fire → `stepFiring` pushes `{lane, depth:1}` → `stepBullets` descends it (slowed once `spikeHits>0`) → `resolveSpikeHits` cuts `s.spikes[lane]=b.depth`, sets `spikeShattered[lane]`, scores, spends at 2 bites → shell `drawSpikes` reads `spikeShattered[lane]` → yellow sparkle vs white dot. The flow is correct EXCEPT the terminal state: `s.spikes[lane]` can approach but never reach 0, so `resolveWarpSpikeHit` (which reads the same `s.spikes[lane]`) crashes forever on a shot-at lane. That cross-consumer coupling (spike height feeds BOTH the render and the warp-crash gate) is why the missing base-clear is HIGH, not cosmetic.

### Devil's Advocate

Argue the code is broken: A player reaches wave 4+, where `initialSpikeHeightForLevel` pre-seeds spikes on the TELIHI-nonzero lanes. They dutifully shoot a spike on their lane to "clear" it for the upcoming warp — in the 1981 cabinet and in this game's own prior build, enough shots zero it. Here, they empty their volley into it, watch it shrink to a 0.0134 stub, then warp — and crash anyway, losing a life, replaying the wave, and shooting it again to the SAME stub, and crashing again. If a wave's geometry leaves them no TELIHI-zero lane and spikers have spiked the rest, that is an unwinnable loop — a soft-lock — because the one escape the ROM offers (shoot the lane clean) has been silently removed. Even absent a hard soft-lock, every "I cleared it but still died" is a fidelity break in a fidelity epic. A confused player reads it as "shooting spikes does nothing useful near the base." A stressed reviewer (me, as author) read the audit's "immaterial here" and pattern-matched it to "skip the base-clear" — the exact trap the ROM auditor's independence existed to catch. The counter-argument ("there's usually a safe lane") is unproven and, even if true, does not excuse a regression from the prior build. The burrow's OTHER behaviours are provably correct and well-tested, so the fix is narrow — but it IS required: a fidelity story that makes the game LESS faithful (and less winnable) than the code it replaced is not done.

**Handoff:** Back to O'Brien (TEA) — a testable logic regression: pin spike-clearability (RED), then Julia implements the base-clear.

## TEA Assessment (Rework — Round 1)

**Phase:** finish (rework) **Status:** RED — 3 new failing tests, full suite 3 failed / 1497 passed.
Committed `1cd376f` on `feat/tp1-15-spike-model`.

**Test file:** `tests/core/tp1-15.spike-clear.test.ts` — pins the Reviewer's [HIGH] finding:
- `persistent fire clears a spike to EXACTLY 0` — a 0.3 spike shot down must reach 0 (RED: floors at 0.0134).
- `clears a SHORT spike … to 0` — a 0.04 spike (within one charge's base-reach) must reach 0.
- `a spiked lane, once shot clean, no longer crashes the warp` — the WD-014 consumer: after clearing the
  spike by shooting, warping on that lane must COMPLETE, not crash (RED: the 0.0134 stub crashes).

All three floor at the same 0.0134 stub — confirming the regression is the pre-cull minimum depth, not
height-dependent. The board is held in 'playing' by pending nymphs (never hatch, no live enemy to
interfere) so the long shoot isn't warped out from under the test (tp1-3 `isolated` trick).

**Rework scope note:** I pinned ONLY the blocking [HIGH] (clearability). The Reviewer's two LOW findings
(reset `spikeShattered` on level transitions / clear it in dying-flyIn; `SPIKE_SHORTEN` now dead) are
non-blocking and NOT gated here — Dev may address them opportunistically. No new spec deviations.

**For Dev (Julia):** the ROM zeroes the line when the biting charge reaches the base (`CHARY>=ILINDDY →
LINEY=0`, ALWELG.MAC:2598-2602). Our base is depth 0 and `stepBullets` (sim.ts:112) culls the charge at
`depth<=0` BEFORE `resolveSpikeHits` (sim.ts, the `s.spikes[b.lane] = b.depth` line) can bite there — so
add the base-clear: when the burrowing charge's descent reaches/crosses the base, set `s.spikes[lane]=0`
(and spend the charge). Keep the existing burrow tests green (H=0.6 path unchanged).

**Handoff:** To Julia (Dev) for the GREEN rework.

## Dev Assessment (Rework — Round 1)

**Implementation Complete:** Yes **Tests:** 1500/1500 passing (GREEN, full suite). Build clean.
Citations green (reanchored, 0 lost). **Branch:** `feat/tp1-15-spike-model` (commit `fa94c37`, pushed below).

**Fix (the Reviewer's [HIGH]):** `src/core/sim.ts` `stepBullets` — when a charge crosses the far base
(`depth <= 0`) on a lane that still has a spike, clear that spike to 0 (the ROM's `LINEY<-0` at
`CHARY >= ILINDDY`, ALWELG.MAC:2598-2602). Gated on `s.spikes[b.lane] > 0`, NOT `spikeHits`, so a fast
free charge that jumps clean over a short spike in one 9/224 step (from above-tip to past-base, culled
before it can register a bite) still clears it — which is what the ROM does (LIFECT bites on `CHARY >=
LINEY`, and past-base is past-tip). This was the bug in my first attempt (`spikeHits > 0` missed the
jump-over charge, so short spikes still floored at 0.0134).

**Now GREEN:** the 3 rework tests (`persistent fire clears to 0`, `short spike clears to 0`, `a
shot-clean lane no longer crashes the warp`). The H=0.6 burrow tests are unaffected — a 0.6 spike's
charge is spent (CHARCO 2) at depth ~0.54, never reaching the base, so the clear never fires.

**Known minor edge (logged as a deviation + below):** the clearing frame does not award the +1 the
ROM's base-crossing bite would (the above-base bites score normally); a spike shot fully clean scores
~1 point fewer than the arcade. The faithful alternative (reorder move→bite→cull) risks the
enemy-collision passes and is disproportionate to a 1-point edge — non-blocking follow-up.

**LOW findings from review** (spikeShattered reset on transitions; SPIKE_SHORTEN dead) — left as
non-blocking follow-ups per the Reviewer's own rating; not addressed in this focused rework.

**Handoff:** To the Thought Police (Reviewer) for re-review.

## Subagent Results (Re-review — Round 1)

pf reviewer subagents still all OFF except `preflight`. Self-authored, so I spawned one INDEPENDENT
fix-auditor and mutation-proved the fix myself.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | 1500 tests / 25 citations / build GREEN, tree clean, 0 smells |
| 2-9 | (pf diff subagents) | No | Skipped | disabled | Covered by the Independent Fix-Auditor + my mutation proof |
| — | Independent Fix-Auditor | Yes | findings | 1 LOW | Fix correct + ROM-faithful, no over-clear, tests non-vacuous → recommends APPROVE |

**All received:** Yes (preflight + independent auditor returned; pf diff subagents disabled via settings)
**Total findings:** 0 blocking, 1 LOW (base-clear frame is side-effect-free), 0 dismissed

## Reviewer Assessment (Re-review — Round 1)

**Verdict:** APPROVED

The [HIGH] regression is resolved. `stepBullets` now clears a spike to 0 when a charge crosses the far
base on a spiked lane (ROM `LINEY<-0` at `CHARY>=ILINDDY`, ALWELG.MAC:2598-2602). Both the independent
auditor and my own mutation proof confirm it.

- [EDGE][VERIFIED] **No over-clear.** Auditor traced all four cases: a TALL spike (0.6) is spent at
  CHARCO=2 (~0.5375) before the base, so the clear never fires (burrow tests still pass); a spiker-raised
  spike under a base-crossing charge clears in one frame but that is ROM-faithful (LIFECT zeroes any line
  at the base); the warp descent clear is the intended WD-014 "shoot it clean on the way down" and an
  UNCLEARED spike still crashes (no free pass — the ordering mirrors MOVCHA→MOVCUD).
- [TEST][VERIFIED] **The fix is load-bearing, tests non-vacuous.** My mutation (revert line `if (b.depth
  <= 0 && s.spikes[b.lane] > 0) …`) turns all 3 clearability tests RED. The `.toBe(0)` assertions are
  exact; the warp-safe test pins the real consequence (uncleared → `mode==='dying'`). The pending-nymph
  harness is sound (never hatches in the frame budget, `checkLevelClear` needs enemies AND queue empty).
- [SILENT][LOW] **The base-clear frame is side-effect-free.** Living in `stepBullets` (outside the
  LIFECT-equivalent `resolveSpikeHits`), the clearing frame awards no `SCORE_SPIKE_SEGMENT` and emits no
  `spike-shot` cue, where the ROM's base-crossing bite does both (ALWELG.MAC:2602-2615). Net: a spike shot
  fully clean scores 1 point fewer and misses one sound cue per clear. (The "missing sparkle" the auditor
  noted is MOOT — the spike is height 0 that frame, so `drawSpikes` draws no tip to sparkle.) Bounded to
  one frame per clear; cosmetic + 1 point. Non-blocking follow-up.
- [DOC][note] the Dev deviation undersold this (score-only); corrected in the deviation audit + a fuller
  Delivery Finding.
- [TYPE][VERIFIED] the fix is a single boolean guard on `s.spikes[b.lane] > 0`; no type concerns. Gating
  on the lane's spike (not `spikeHits`) is ROM-correct — LIFECT has no bite-history dependency, so a fast
  free charge that jumps clean over a short spike still clears it.
- [SEC][VERIFIED] N/A — no security surface.
- [SIMPLE][VERIFIED] minimal 1-line fix; the faithful alternative (reorder move→bite→cull so the
  base-crossing registers a real bite) risks the enemy-collision passes false-hitting far-end enemies —
  rightly deferred as disproportionate to a 1-point/1-cue edge.
- [RULE][VERIFIED] pure-core boundary intact (no globals/DOM in the new line or comment); citation gate
  green (11 reanchored, 0 lost); findings diff is line-reanchors only (no laundering).

**Data flow:** the fix reads/writes the same `s.spikes[lane]` that feeds both `drawSpikes` and
`resolveWarpSpikeHit` — so clearing to 0 correctly makes a shot-clean lane render tip-less AND safe to
warp. That cross-consumer coupling (the root of the original HIGH) is now consistent.

### Devil's Advocate (re-review)

Could the `> 0` gate over-clear in real play? The worry: a charge fired down a lane clears a spike the
player wanted only shortened. Refuted — the clear fires only at `depth<=0`, which a charge reaches only
on a short/already-burrowed spike (a tall one is spent at CHARCO=2 far above the base), so "shoot to
shorten but not clear" still works for tall spikes; a short spike being fully cleared is the desired
outcome. Could it break the warp? Refuted — an uncleared spike still crashes; only a genuinely-cleared
(0-height) lane is safe, which is exactly the ROM's rule. The honest residual is the silent clear-frame
(no point, no cue) — a real but sub-1% economy/audio detail, logged and deferred, not a correctness bug.
No new HIGH/CRITICAL surfaced.

**Handoff:** To Winston Smith (SM) for finish-story.