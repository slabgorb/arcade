---
story_id: "sw8-5"
jira_key: "sw8-5"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-5: Surface HUD + tower render

## Story Details
- **ID:** sw8-5
- **Jira Key:** sw8-5
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-26T04:01:42Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-25T20:48:37Z | 2026-07-25T20:51:33Z | 2m 56s |
| red | 2026-07-25T20:51:33Z | 2026-07-26T03:29:13Z | 6h 37m |
| green | 2026-07-26T03:29:13Z | 2026-07-26T03:48:42Z | 19m 29s |
| review | 2026-07-26T03:48:42Z | 2026-07-26T04:01:42Z | 13m |
| finish | 2026-07-26T04:01:42Z | - | - |

## SM Assessment

**Setup complete — routing to TEA (RED phase).**

- **Story shape:** 3pt, TDD (phased), star-wars subrepo, epic sw8 (cabinet-feel /
  render-fidelity axis). Scope: draw the **TOWERS-remaining counter** and
  **POINTS-NEXT-TOWER readout** on the surface-phase HUD (the `towerCount` helper
  exists in core but is never rendered), then verify the tower field vs the wave 2/3
  longplay.
- **Branch:** `feat/sw8-5-surface-hud-tower-render` cut in `star-wars/` (targets
  `develop` per repo topology). Working tree clean.
- **"Jira":** No Jira in this project — the story id **is** the key. Claim step
  intentionally skipped.
- **Core/shell purity guard:** `towerCount` + points tracking stay in `src/core`;
  all new drawing lives in `src/shell/render.ts`. No new `GameState` fields.

**⚠ Caution for TEA (Han Solo):** The story carries **no stored acceptance_criteria**
— the title is the only recorded spec. The 14 ACs and the specific identifier names
in `sprint/context/context-story-sw8-5.md` (`POINTS_PER_TOWER`, `pointsThisPhase`,
`drawSurfaceHUD`, `drawTowerCounter`) were **inferred by setup from the title**, not
read from a record or from the code. **Ground them before writing tests:** read the
real design spec `star-wars/docs/superpowers/specs/2026-07-20-cabinet-feel-render-fidelity-design.md`
(§8.5) and the actual `src/core/state.ts` / `src/shell/render.ts` for the true field
and function names. Acceptance here is ultimately **VISUAL** (our frame beside the
cabinet frame at the same phase) — the video is ground truth; treat any divergence as
a mechanism question, not a constant to copy.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): Give the tower worth ONE source of truth — a pure
  `nextTowerWorth(state) = (state.phaseKills + 1) * 200` in core — consumed by BOTH
  the sim's tower-kill scoring AND the shell HUD readout, so the on-screen figure and
  the banked points cannot drift. Affects `src/core/sim.ts` (tower-kill branch, ~:918)
  and `src/shell/render.ts` (the new readout). *Found by TEA during test design.*
- **Gap** (non-blocking): The cabinet BLINKS "POINTS NEXT TOWER", alternating it with
  "50,000 FOR SHOOTING ALL TOWERS" (MS.RWD) on `FRAMEL & 0x30` (WSMAIN.MAC:3489) while
  towers remain. Our render draws that teaser only as a POST-award banner
  (`render.ts:1083`, keyed on `towerBonusAwardedAt`) — a different trigger. The blink
  cadence + while-towers-remain teaser are deferred; RED pins only that the readout
  appears while towers remain. Affects `src/shell/render.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): "Verify tower/bunker render (shape, spacing, ground grid)
  vs the wave-2/3 longplay" (§8.5) is a VISUAL acceptance item, not a unit test — needs a
  manual serve-beside-longplay pass in verify/review. Note our waves 1-2 are `BUNK`
  (0 towers) per sw4-3; confirm that matches the longplay's early-wave tower field or log a
  divergence. Affects visual QA / `src/shell/render.ts` + `src/core/surfaceMazes.ts`.
  *Found by TEA during test design.*
- **Gap** (non-blocking): The cabinet's "TOWERS" counter (MS.TWR) persists into the
  TRENCH ("MESSAGES STILL SEEN IN TRENCH", VWMTWZ, WSMAIN.MAC:3517). This story scopes the
  counter to the SURFACE HUD; trench persistence is a follow-up. Affects `src/shell/render.ts`.
  *Found by TEA during test design.*
- **Improvement** (non-blocking): After GREEN, run the FULL suite and watch for any other
  tower-kill-score sibling staged at `phaseKills > 0` that expects a flat 200 — the blast-radius
  sweep found only `surface-tower-quota.test.ts:196` (re-seated); `surface.test.ts:247` kills
  tower #1 (phaseKills 0) and stays green. Affects `tests/core/`. *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): This story PARTIALLY remediates audit finding **H-022**
  ("in-flight HUD messages absent") — POINTS NEXT TOWER and TOWERS (NXT/TWR) are now shown.
  The others it lists (SFB/STF/ACW/BON/BRE/BSE/SHIELD GONE) remain absent. The audit maintainer
  should narrow H-022's claim. Affects `docs/audit/findings/pair-hud.json` (H-022).
  *Found by Dev during implementation.*
- **Question** (non-blocking): The §8.5 VISUAL acceptance is still owed — serve beside the wave-2/3
  longplay and confirm the readout seats/colours/blink and the tower field read right (the readouts
  first appear on wave 3, since waves 1-2 are BUNK / 0 towers). Affects `src/shell/render.ts`.
  *Found by Dev during implementation.* (echoes TEA finding on the visual pass)
- **Improvement** (non-blocking): TEA's full-suite-sweep finding was confirmed — the ONLY sibling
  re-seat needed was `surface-tower-quota.test.ts:196` (already done in RED). No other tower-kill-score
  fixture broke on the full GREEN run; the single collateral was the audit citation drift (handled via
  reanchor). Affects `tests/`. *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): Bishop kills now ESCALATE with towers — verified byte-faithful to the
  ROM's binary `SCRBNK`-vs-`SCRTWR` dispatch (WSGRND.MAC:1163-1174; `BISHOP` increments `.TWRS` at :125) —
  but the escalation suite only exercises kind='tower'/'bunker'. A TEA follow-up could add a `kind:'bishop'`
  escalation test to pin this faithful-but-untested path. Affects
  `tests/core/surface-tower-escalation.test.ts`. *Found by Reviewer during code review.*
- **Note** (non-blocking): The `else` branch in the sim tower-kill dispatch (sim.ts:923) treats every
  non-bunker kind as an escalating tower. Correct today (kinds are tower/bunker/bishop, matching the ROM's
  binary split), but a future ground-object kind must revisit this branch or it will silently escalate +
  count toward the tower quota. Affects `src/core/sim.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Story scope expanded to the CORE tower score (escalation), not render-only**
  - Spec source: context-story-sw8-5.md ("Out-of-scope: score/bonus point allocation rules"; "AC13 — No core state changes")
  - Spec text: the inferred context deferred all scoring changes and forbade core changes.
  - Implementation: RED pins the ROM's ESCALATING tower score in core — the Nth tower killed is worth N×200 (`SCRTWR`, WSGAS.MAC:342-360; `TSCTWR = .BYTE 00,02,00 = 200`, :520). No new GameState field (derived from existing `phaseKills`).
  - Rationale: the design spec §8.5 (higher fidelity authority) calls the readout "escalating", and in the ROM `TWRMULT` is BOTH the number shown AND the points banked — a flat score under an escalating readout is an on-screen lie ("the video IS the game"). User ruled "Escalate score + full HUD" (recommended option) when asked.
  - Severity: major
  - Forward impact: Dev changes `sim.ts:918` tower branch from flat `+= TURRET_SCORE` to `+= (phaseKills+1)×200`; bunkers stay flat 200 (TSCBNK). One sibling assertion re-seated (below).

- **Re-seated surface-tower-quota.test.ts:196 (the clearing-tower score)**
  - Spec source: surface-tower-quota.test.ts (sw3-3/sw7-18), "clearing tower kill scores BOTH its tower and the 50,000 bonus"
  - Spec text: `expect(s1.score).toBe(TURRET_SCORE + SURFACE_CLEAR_BONUS)` — a flat 200 + 50,000.
  - Implementation: the fixture's `phaseKills = towersForWave(3)-1 = 15`, so the killed tower is the 16th; under escalation it is worth 16×200 = 3,200. Re-seated to `16*TURRET_SCORE + SURFACE_CLEAR_BONUS` (53,200), preserving the test's intent (clearing kill scores its worth + the bonus).
  - Rationale: green-now-doomed sibling — TEA owns test maintenance; Dev cannot move goalposts. Full-suite run confirms this is the ONLY tower-kill-score assertion affected (surface.test.ts:247 kills tower #1 at phaseKills 0 → 200, stays green).
  - Severity: minor
  - Forward impact: none beyond the one line; import of `TURRET_SCORE` kept (used as the 200 step).

- **Blink cadence NOT pinned; readout gating pinned seam-agnostically**
  - Spec source: WSMAIN.MAC:3489 (`LDA FRAMEL / ANDA #30 / IFNE ;?SHOW NEXT TOWERS WORTH?`)
  - Spec text: the cabinet ALTERNATES "POINTS NEXT TOWER" with "50,000 FOR SHOOTING ALL TOWERS" on a `FRAMEL & 0x30` blink.
  - Implementation: RED pins only that the readout APPEARS while towers remain and is absent otherwise (bunkers-only wave / all-cleared / space) — silent on whether Dev draws it every frame or on a blink.
  - Rationale: our render already draws the 50k teaser as a POST-award banner (render.ts:1083, keyed on `towerBonusAwardedAt`) — a different trigger; pinning the exact blink would over-couple and risk conflicting with it. Routed to a Delivery Finding.
  - Severity: minor
  - Forward impact: a blink/teaser polish pass is a follow-up; this story's readout may render continuously.

- **"Verify tower render vs longplay" left as a VISUAL acceptance item, not a unit test**
  - Spec source: design spec §8.5 ("Verify tower/bunker render (shape, spacing, ground grid) against the wave-2/3 longplay")
  - Spec text: confirm the tower field reads correctly per wave against the cabinet video.
  - Implementation: not encoded as a vitest — routed to a manual serve-beside-longplay pass (Delivery Finding) for the verify/review phase.
  - Rationale: acceptance here is VISUAL (green vitest is necessary, not sufficient); the tower models already exist (sw3-11/sw8-4). A structural test would pin geometry the story only asks to CONFIRM.
  - Severity: minor
  - Forward impact: Reviewer/verify must do the visual pass; note waves 1-2 are BUNK (0 towers) per sw4-3 — confirm vs longplay or log a divergence.

### Dev (implementation)

- **Corrected two audit findings (S-004, S-005) my scoring change made stale; repointed S-005**
  - Spec source: `tests/audit/citations.test.ts` + `docs/audit/findings/pair-score-shields.json` (S-004 "Tower top = 200", S-005 "Laser bunker = 200")
  - Spec text: S-005 reasoning "Ours does not distinguish score by kind — 'score += TURRET_SCORE' runs for every surface object"; S-004 reasoning "Ours scores every surface object at TURRET_SCORE=200".
  - Implementation: escalating towers means ours NOW distinguishes score by kind, falsifying both sentences. Repointed S-005's `ours` from the retired flat line (`sim.ts:918`) to the new bunker branch (`sim.ts:922`, `        score += TURRET_SCORE`) and rewrote S-004/S-005 claim+reasoning to describe the split (bunker flat 200 = TSCBNK; tower escalates = TWRMULT). Both stay CONFIRMED — bunker=200 and tower-base=200 still match the ROM. The other 9 `pair-*.json` files carry line-number-only reanchors (citations drifted under my inserts); verified as `line:`-only diffs.
  - Rationale: leaving "ours scores every object at 200 / does not distinguish by kind" beside code that escalates is a false record (the stale-record anti-pattern). NOT `remediated_by` — nothing was a bug; these are matches that stay matches. Star-wars runs a LIVE audit (reanchor is sanctioned, sw7-21), unlike red-baron's frozen model.
  - Severity: minor
  - Forward impact: audit stays green + accurate. Reviewer should confirm no laundering — the diff is `line:`-only across 9 files plus two honest reasoning fixes in pair-score-shields.

- **Surface HUD readout drawn continuously (no blink); positions provisional**
  - Spec source: sw8-5 TEA deviation "Blink cadence NOT pinned"; design spec §8.5
  - Spec text: the cabinet BLINKS the readout with the 50k teaser (FRAMEL&0x30); acceptance is visual.
  - Implementation: `drawSurfaceTowerHud` draws the readout every surface frame while towers remain (no blink), at provisional bottom seats (`y = h - 30`). Worth green, labels red (cabinet colours).
  - Rationale: TEA pinned the readout seam-agnostically (appears while towers remain); the blink + exact seats (VGRW6/VGRW7) are eyeball-tuning for the deferred visual pass. Minimalist: simplest that passes + faithful colours.
  - Severity: minor
  - Forward impact: the visual pass (verify/review) tunes the blink + positions vs the longplay.

### Reviewer (audit)

Every logged deviation reviewed; all ACCEPTED (none flagged, none undocumented found):

- **TEA #1 (scope → core escalation)** → ✓ ACCEPTED: user-ratified, and byte-faithful to the ROM
  (`SCRTWR`/`TWRMULT`, WSGAS.MAC:342-360). An escalating readout over a flat score would be an
  on-screen lie; escalating the score is the only coherent path.
- **TEA #2 (re-seat surface-tower-quota:196)** → ✓ ACCEPTED: the fixture's 16th tower is worth
  16×200; independently confirmed it is the ONLY tower-kill-score sibling affected; intent preserved.
- **TEA #3 (blink cadence not pinned)** → ✓ ACCEPTED: seam-agnostic pin (readout appears while towers
  remain); the FRAMEL&0x30 blink is visual-pass tuning.
- **TEA #4 (visual verification not a unit test)** → ✓ ACCEPTED: acceptance is VISUAL per §8.5; correctly
  routed to the verify/review pass, not fabricated as a structural test.
- **Dev #1 (audit findings corrected + reanchor)** → ✓ ACCEPTED: independently verified — 9 findings files
  are `line:`-only reanchors (per-file grep: 0 reasoning/claim/verbatim edits), `pair-score-shields`
  S-004/S-005 edits are honest (bunker still =200=TSCBNK, tower now escalates — matches the code), S-005's
  `ours` resolves byte-for-byte at sim.ts:922, `reanchor-citations.mjs` reports 0 lost. NO laundering.
- **Dev #2 (readout continuous, positions provisional)** → ✓ ACCEPTED: colours are faithful (green worth,
  red label); blink + exact seats are the deferred visual pass.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (9 failing across 3 files — all intended; 0 collateral) · tsc --noEmit clean

**Ground truth first.** The story carried no stored ACs (title only); I grounded the
mechanic against the 1983 source before pinning:
- Tower score ESCALATES — Nth tower worth N×200 (`SCRTWR`, WSGAS.MAC:342-360; init
  `TWRMULT = TSCTWR` in `IGRND`, WSGRND.MAC:697; `TSCTWR = .BYTE 00,02,00 = 200`, :520).
  Our clone paid a FLAT 200 (`TURRET_SCORE`) — 200 is exactly tower #1's worth.
- HUD "XXXXX POINTS NEXT TOWER" (MS.NXT, TCMES.MAC:606) shows `TWRMULT` = the NEXT tower's
  worth = `(phaseKills+1)×200`; a "TOWERS" counter (MS.TWR) shows `GD.TWL` = towers left.
  Both gated on towers remaining (`GD.TWL / IFNE`, WSMAIN.MAC:3485).
- In the ROM the displayed number IS the banked value → **scoring and HUD are one law**.
  User ruled "Escalate score + full HUD" (see AskUserQuestion / deviation #1).

**Test Files:**
- `tests/core/surface-tower-escalation.test.ts` (NEW) — the escalating tower score. 4 RED
  (2nd=400, 3rd=600, 10th=2,000, step=200), 2 green guards (1st tower=200 unchanged; bunker
  stays flat 200, quota-neutral — guards against escalating bunkers).
- `tests/shell/render.surface-tower-hud.test.ts` (NEW) — the surface HUD, via the `layoutText`
  string seam (SH2-5). 4 RED (readout label; escalating worth 200→400; "TOWERS" counter 16→15;
  worth=800 at phaseKills 3 = the no-lie coherence pin), 3 green gating guards (bunkers-only
  wave / all-cleared / space → NO readout). Fixture digits (0/3/9) can't collide with the
  readout digits (200/400/16/15), so a plain substring check isolates the readout.
- `tests/core/surface-tower-quota.test.ts` (RE-SEAT) — 1 line: the clearing (16th) tower now
  scores 16×200 + 50,000 = 53,200 (was flat 200 + 50,000).

**Tests Written:** 13 new + 1 re-seat, covering the escalation law, the two HUD readouts,
their gating, and HUD↔score coherence. Full suite: **9 failed / 1822 passed** — the 3 failing
files are exactly the ones I touched (no collateral; verified by a full `vitest run`, not a
scoped runner — the rb4-15 lesson).

### Rule Coverage

| Rule (typescript.md + project) | Test(s) | Status |
|--------------------------------|---------|--------|
| #4 `??` vs `||` on falsy-valid **0** (`phaseKills` can be 0) | escalation "first tower=200"; HUD "worth 200 / counter 16 at phaseKills 0" | green guards — bite a `phaseKills \|\| X` bug |
| #8 test quality — no vacuous, no `as any`, mocks match impl | all (concrete value/string asserts; font mock matches real signature; gating paired with positive presence) | pass (self-checked) |
| #1 type-safety escapes (no `as any`/`@ts-ignore`) | both new files (no casts; `{pos,kind}` type-checks) | pass |
| Core/shell purity (project rule) | escalation = pure core (deterministic, no DOM/time/RNG); HUD = shell-only via mocked font/ctx | pass — no new core→shell coupling |
| Font safety (GLYPH_CHARS) | readout strings "POINTS NEXT TOWER"/"TOWERS" are caps+space only — no apostrophe/period | safe by inspection (no test needed) |

**Rules checked:** 5 applicable of the TS/project set have coverage.
**Self-check:** 0 vacuous tests — gating/absence tests are paired with the positive-presence
test (HUD-1) and the bunker/first-tower guards bite a wrong fix.

**Handoff:** To Dev (Yoda) for GREEN — implement the escalating tower score in `sim.ts`
(tower branch `+= (phaseKills+1)×200`, bunkers stay flat) and draw the two surface HUD
readouts in `render.ts`. A shared `nextTowerWorth` helper (Delivery Finding #1) keeps the
figure and the points honest. Then the visual longplay pass (Finding #3).

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 1831/1831 passing (GREEN) · `tsc --noEmit` clean
**Branch:** `feat/sw8-5-surface-hud-tower-render` (pushed)

**Files Changed:**
- `src/core/state.ts` — `TOWER_SCORE_STEP = 200` (ROM `TSCTWR`) + pure `nextTowerWorth(phaseKills) =
  (phaseKills+1) × 200`. ONE source of truth for the sim and the HUD (Finding #1), so the figure on
  screen can never lie about the points banked.
- `src/core/sim.ts` — the tower-kill branch now banks `nextTowerWorth(state.phaseKills)` (Nth tower
  worth N×200 — the ROM `TWRMULT`/`SCRTWR`). Bunkers keep a flat `TURRET_SCORE` (`TSCBNK`=200),
  quota-neutral. Only one turret is hit per frame, so `state.phaseKills` (pre-increment) is the index.
- `src/shell/render.ts` — `drawSurfaceTowerHud` draws "XXXXX POINTS NEXT TOWER" (green worth + red
  label, measured-gap idiom) and a "TOWERS <n>" counter, gated on the surface phase with towers
  remaining (ROM `VWMTWR` / `GD.TWL IFNE`). Wired in the playing-HUD branch of `render()`.
- `docs/audit/findings/*.json` — reanchored ours-line citations that drifted under the edits
  (line-number only, 9 files); S-004/S-005 repointed + reasoning corrected (see Dev deviation #1).

**Verification (per the Dev "changed a shared mechanism" gotcha):** ran the FULL `vitest run`, not the
story's files alone. The escalation's only ripple was the audit citation drift (1 file RED), resolved
via reanchor + honest finding updates; no sibling scoring/fixture broke (TEA's single re-seat held).

**Self-review:**
- Wired to front end ✓ — no new `main.ts` seam was needed (render already receives full `GameState`,
  `stepGame` already runs); the HUD tests call the real `render()`, proving `drawSurfaceTowerHud` is
  reached, and the escalation runs in the live sim step. No producer-gap like rb4-16.
- Follows project patterns ✓ — `nextTowerWorth` mirrors `towersForWave`; the readout uses
  `drawHudHeader`'s glowText + measured-gap layout.
- ACs met ✓ — escalation + both readouts + gating (surface / towers-remaining). The §8.5 VISUAL
  acceptance (seats/colours/blink vs longplay) is the deferred visual pass (Finding, Dev deviation #2).
- Error handling ✓ — pure functions; the gating (`remaining <= 0`, phase check) covers the 0-tower /
  cleared / non-surface edges.

**Handoff:** To Reviewer (Obi-Wan) for review — with specific eyes on the audit-finding maintenance
(Dev deviation #1: confirm line-only reanchors + no laundering) and the deferred §8.5 visual pass.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | success | 0 smells; 1831/1831 green; tsc clean | N/A (mechanical) — but its PROSE claim that pair-hud/pair-guns/pair-tie-ai carry reasoning/claim edits is DISMISSED as a confabulation (grep + rule-checker prove those 9 files are line-only) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations (16 rules / 26 instances) | confirmed 0, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled returned; 7 disabled via `workflow.reviewer_subagents`)
**Total findings:** 0 confirmed blocking, 1 dismissed (preflight audit-prose confabulation, grep-refuted), 1 non-blocking improvement (bishop escalation untested — see Delivery Findings)

## Reviewer Assessment

**Verdict:** APPROVED

**Dispatch tags:** `[RULE]` clean (rule-checker, enabled — 0 violations). `[EDGE]` `[SILENT]` `[TEST]`
`[DOC]` `[TYPE]` `[SEC]` `[SIMPLE]` — subagents disabled via settings (N/A this run); their domains
assessed by me directly below where relevant.

**Data flow traced:** player laser → `stepGame` surface branch → a tower kill at `phaseKills=K` banks
`nextTowerWorth(K) = (K+1)×200` (sim.ts:928, pure core) → `state.phaseKills`, `state.score` → the shell
`render()` reads the SAME `nextTowerWorth(state.phaseKills)` for the "POINTS NEXT TOWER" figure
(render.ts:1046) and `towersForWave(wave)−phaseKills` for the "TOWERS n" counter. Safe: one shared pure
function feeds both the banked points and the on-screen figure, so they cannot diverge.

**Pattern observed:** `drawSurfaceTowerHud` (render.ts:1021-1051) reuses `drawHudHeader`'s measured-gap
`layoutText(...).width * (HUD_TEXT_PX/CELL_H)` idiom for the green-worth + red-label layout — consistent
with the WAVE readout. Good pattern reuse.

**Error handling:** the HUD fn early-returns for `phase !== 'surface'` and for `remaining <= 0` (covers
the bunkers-only wave and the all-cleared field); no division, no NaN path. `nextTowerWorth` is total
over `phaseKills: number` (non-optional).

### Observations (adversarial — verified, not rubber-stamped)

- `[VERIFIED]` **Escalation is byte-faithful, INCLUDING bishops.** The `kind === 'bunker' ? flat :
  escalate` split (sim.ts:919-930) exactly mirrors the ROM's binary dispatch `CMPA #PC$BNK / IFEQ →
  JSR SCRBNK (flat) / ELSE ;MUST BE TOWER TOP → JSR SCRTWR (escalating)` (WSGRND.MAC:1163-1174). Bishops
  fall in the ELSE branch and increment `.TWRS` like towers (`BISHOP` macro, WSGRND.MAC:125), so
  bishop→escalate + `towerKills++` is correct, not a bug. Evidence: sim.ts:919-930 vs WSGRND.MAC.
- `[VERIFIED]` **No off-by-one / double-count.** `nextTowerWorth(state.phaseKills)` reads the
  PRE-increment `phaseKills`; `phaseKills = state.phaseKills + towerKills` is computed later (sim.ts:948).
  Only one turret is hit per frame (single `bestRange`/`hit` index, `killed.add(hit)` once, sim.ts:908-918),
  so two-kills-in-one-frame cannot happen. `[RULE]` concurs.
- `[VERIFIED]` **HUD cannot lie about the score.** sim.ts:928 and render.ts:1046 call the SAME exported
  `nextTowerWorth` (state.ts:859) — no duplicated formula. `[RULE]` concurs.
- `[VERIFIED]` **`??`/`||` on falsy-0.** `phaseKills` can be 0; `nextTowerWorth(0) = 200` (not a fallback),
  no `phaseKills || X` anywhere (grep clean). state.ts:859, sim.ts:928.
- `[VERIFIED]` **Core/shell purity holds.** `TOWER_SCORE_STEP`/`nextTowerWorth` and the sim tower branch
  are pure (no DOM/time/RNG); `drawSurfaceTowerHud` is shell-only; no `../shell` import appears in
  state.ts/sim.ts (grep clean). `[RULE]` #14 concurs.
- `[VERIFIED]` **ROM constant sourced.** `TOWER_SCORE_STEP = 200` cites `TSCTWR` (WSGAS.MAC:520), matching
  audit S-004's own verbatim. `[RULE]` #15 concurs.
- `[VERIFIED]` **Audit integrity — no laundering.** 9 findings files are line-number-only reanchors
  (per-file grep: 0 reasoning/claim/verbatim additions); `pair-score-shields.json` has 4 honest S-004/S-005
  edits; S-005's `ours` verbatim (`        score += TURRET_SCORE`, 8-space) resolves exactly at sim.ts:922;
  `reanchor-citations.mjs` → 99 correct, 0 lost. Both my grep and `[RULE]` #16 refute the preflight's
  contrary prose.
- `[VERIFIED]` **Tests are honest.** Escalation pins literals (200/400/600/2000), not the constant under
  test (tp1-27 lesson); the re-seat (surface-tower-quota:196 → `16×TURRET_SCORE + SURFACE_CLEAR_BONUS`)
  preserves intent; the HUD gating tests are paired with the positive presence test (non-vacuous).
- `[MEDIUM→LOW]` **Bishop escalation is faithful but UNTESTED.** The escalation suite covers
  kind='tower'/'bunker' but not 'bishop'. Downgraded to LOW: the behavior is verified-correct against the
  ROM above and the dispatch is a single binary branch (bishop rides the tower path); a follow-up test is a
  nice-to-have, not a defect. Logged as a non-blocking Delivery Finding.

### Rule Compliance

Mapped to `.pennyfarthing/gates/lang-review/typescript.md` (rule-checker exhaustive, 16 rules / 26
instances, 0 violations) plus the CLAUDE.md core/shell-purity rule:

| Rule | Instances | Verdict |
|------|-----------|---------|
| #1 type-safety escapes | 2 (Proxy-mock `as unknown as` cast — established repo idiom; `?? 0`) | compliant |
| #2 generic/interface (`Partial<GameState>`) | 2 (override-over-full-base, returns full GameState) | compliant |
| #4 `??` vs `||` on falsy-0 | 3 (`nextTowerWorth(0)=200`; no `phaseKills\|\|`) | compliant |
| #5 module/`.js` ext | 2 (own-src relative imports — no `.js` per repo convention) | compliant |
| #8 test quality | 3 (src not dist; no `as any`; literal oracles) | compliant |
| #12 perf/hot-path | 1 (once-per-frame `layoutText` measure — same as WAVE) | compliant |
| purity (CLAUDE.md) | 4 (state/sim pure core; render shell; no core→shell import) | compliant |
| ROM constants (CLAUDE.md) | 1 (`TOWER_SCORE_STEP` cites TSCTWR) | compliant |
| audit integrity (hard ask) | 10 (9 line-only, 1 honest) | compliant |
| #3/#6/#7/#9/#10/#11/#13 | 0 relevant instances | N/A |

### Devil's Advocate

Assume this is broken. Where would it bite? First: the `else` branch catches everything that is not a
bunker — what if a future ground-object kind (say a moving "walker") is added? It would silently escalate
and increment the tower quota, possibly soft-locking a wave whose `.TWRS` count doesn't include it. Today
only tower/bunker/bishop exist and the ROM dispatch is genuinely binary (bunker vs. tower-top), so this is
correct now, but the `else` is a latent trap for a new kind — a future story adding a kind must revisit
this branch. Second: the HUD reads `towersForWave(state.wave) − state.phaseKills`; if some path let
`phaseKills` exceed the quota (e.g. a bishop killed after the quota was met on a bunker-heavy maze),
`remaining` goes negative and the readout hides — but the "TOWERS n" counter would already have hit 0, so
the hide is correct, not a glitch. Third: a confused player sees "3200 POINTS NEXT TOWER" then clears the
wave and the figure vanishes mid-flight — but that matches the cabinet (the 50k teaser takes over), and is
the deferred visual-pass concern. Fourth: could two towers die on one frame and the second reuse a stale
`phaseKills`? No — the beam kills exactly one nearest turret per frame; I re-read the loop to confirm a
single `hit`. Fifth: does the escalation feed an extra-life ladder that now triggers early? sw7-4 removed
the score→life ladder, so higher tower scores grant no bonus lives — no difficulty side-effect. The one
real residue is the untested bishop path (logged LOW). Nothing rises to Critical/High.

**Verdict rationale:** 0 Critical, 0 High. Faithful to the ROM (bishop dispatch verified byte-for-byte),
purity intact, HUD/score coherent, audit maintained honestly (independently verified, not trusted from the
summary), full suite 1831/1831 green, tsc clean, `[RULE]` clean. Proportionate to a 3pt render/scoring
story. The single non-blocking improvement (bishop test) is a follow-up.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.