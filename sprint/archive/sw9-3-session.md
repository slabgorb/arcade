---
story_id: "sw9-3"
jira_key: "sw9-3"
epic: "sw9"
workflow: "tdd"
---
# Story sw9-3: Attract-mode parity pass — hold the rotating banner/instructions/scoring/hi-score machine (sw7-10) beside the longplay attract loop and close ordering/timing/text gaps

## Story Details
- **ID:** sw9-3
- **Jira Key:** sw9-3
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-26T17:39:53Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-26T17:04:57Z | 2026-07-26T17:06:51Z | 1m 54s |
| red | 2026-07-26T17:06:51Z | 2026-07-26T17:23:14Z | 16m 23s |
| green | 2026-07-26T17:23:14Z | 2026-07-26T17:30:07Z | 6m 53s |
| review | 2026-07-26T17:30:07Z | 2026-07-26T17:39:53Z | 9m 46s |
| finish | 2026-07-26T17:39:53Z | - | - |

## Sm Assessment

**Setup complete — sw9-3 cleared for RED. Final story of epic sw9.**

- **Merge gate:** PASS — sw9-1 (#125) and sw9-2 (#126) merged + finished; zero open PRs.
- **Race check:** PASS — no sw9-3 work upstream; re-check at review.
- **Branch:** `feat/sw9-3-attract-parity` cut from origin/develop at 4be3388 — the tree ALREADY CONTAINS sw9-1's canopy frame and sw9-2's select screen; the attract flow changed THIS SESSION (attract+start now opens `mode:'select'`, run-start cues moved to the select→play edge). Parity work must account for that fresh geometry.
- **Context:** stub — TEA defines ACs in RED. The attract machine under audit is sw7-10's rotating banner/instructions/scoring/hi-score rotation; its archive is `sprint/archive/sw7-10-session.md` (read it — prior TEA may have pre-extracted quarry).
- **Inherited decision (routed here by sw9-1):** does the attract demo draw the cockpit canopy frame? The cabinet's attract shows gameplay (and thus the frame); our frame is live-run gated. sw9-1's Reviewer logged this as the sw9-3 decision — TEA must rule it as part of parity.
- **Reference:** the cabinet longplay attract loop (per design spec §; locate the longplay reference the repo already cites). Parity dimensions per the story title: ORDERING / TIMING / TEXT of the rotation.
- **Execution mode:** peloton sw9-3, inline unnamed subagents (tea/reviewer=opus, dev=sonnet), SM orchestrates, no TeamCreate.

## Tea Assessment

**Phase:** finish
**Tests Required:** Yes
**Reason:** the attract machine is already faithful on ORDERING, TIMING and all page
TEXT (all pinned by the sw7-10 suites — held beside the ROM and found matching). The
parity pass surfaced exactly ONE genuine gap worth closing at 2 points, plus a test
whose sentinel choice was falsified by the parity finding.

### The genuine gap (RED driver)
**The start invitation does not persist across attract pages.** The cabinet draws
`MS.STR` = "PULL TRIGGER TO START" (TCMES.MAC:549) via `VWCOIN`, which runs on ALL FOUR
idle phases — PHEBNR (WSMAIN.MAC:1268), PHEINS (:702), PHESCR (:733), PHEHIS (:904) — so
the invitation shows on the banner, the flight brief, the scoring table AND the hi-score
board alike. Our clone draws it only on the banner (`drawBannerPage` render.ts:1506); it
is absent on the other three pages. Fix is shell-only (mirror `VWCOIN` — one persistent
line — NOT render the whole banner everywhere).

### Canopy-frame ruling (inherited decision, routed by sw9-1's Reviewer)
**The canopy frame does NOT draw during attract — keep sw9-1's absent-on-attract guards
unchanged (no flip).** The cabinet's attract loop is the four idle info pages only. The
TPHASE table (WSMAIN.MAC:329-368) places every gameplay phase behind `CN1 ;FIRST COIN`
→ `SG1`/`SG2 ;START GAME` → `BGN`; there is no self-play/demo phase reachable from the
idle loop, and no `DEMO`/`SELF-PLAY` symbol anywhere in the 1983 source. The
`PLAYER'S GUN SITE` set is drawn only during those coin-gated gameplay phases, so there
is nothing for the frame to overlay on attract. The design spec's "gameplay in the
longplay" (§1, wave-4 combat) is a human PLAYING, not the attract loop. sw9-1's
`render.cockpit-frame.test.ts` AC-6 guards stay correct.

**Test Files:**
- `star-wars/tests/shell/render.attract-start-prompt.test.ts` (new) — AC-1: the
  invitation on all four pages; paired guard that the banner-only "STAR WARS" title stays
  banner-only (the fix must be additive, mirroring `VWCOIN`); exact-text guard (MS.STR,
  never "PRESS START").
- `star-wars/tests/shell/render.attract-pages.test.ts` (re-seated) — AC-2: the sw7-10
  "F5" fallthrough guard's sentinel moved from "PULL TRIGGER TO START" (wrong — it is now
  a cross-page element) to "STAR WARS" (genuinely banner-only). F5's intent preserved.

**Tests Written:** 11 new (7 green guards + 4 RED drivers) + 2 re-seated (unchanged count).
**Status:** RED — full star-wars suite **4 failed / 1893 passed (1897), 180 files**;
`tsc --noEmit` exit 0. The 4 failures are ALL in `render.attract-start-prompt.test.ts`
(instructions/scoring/hiscore missing the invitation). **Zero collateral:** 1886 baseline
(all green) + 11 new = 1897; the re-seated F5 guard (6 tests) stays green; no pre-existing
test touched, weakened or re-baselined except the deliberately re-seated F5 sentinel.
**Every ROM anchor verified firsthand** against `~/Projects/star-wars-1983-source-text`.

**Commit:** `ac44f14` (star-wars, feat/sw9-3-attract-parity) — tests only, no `src/`.
**Handoff:** To Dev (Julia) for GREEN — draw the persistent invitation on all four
attract pages (shell-only; mirror `VWCOIN`, do not render the marquee everywhere).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `star-wars/src/shell/render.ts` — `drawAttract` now draws the persistent
  "PULL TRIGGER TO START" invitation once, after the per-page switch, so it
  applies additively to all four attract pages (mirrors `VWCOIN`, WSMAIN.MAC
  PHEBNR:1268/PHEINS:702/PHESCR:733/PHEHIS:904). `drawBannerPage` no longer
  draws the invitation itself — it keeps only the "STAR WARS" marquee and the
  intro crawl, so the paired banner-only guard and the exact-text guard both
  hold. Placed at `h * 0.94` (a persistent bottom line) so it never collides
  with the instructions/scoring body text or the hi-score board's 10 entries.
- `star-wars/docs/audit/findings/pair-hud.json` — re-anchored 3 citations
  (H-007, H-008, H-012) whose `ours.line` shifted from the `render.ts` edit;
  `reanchor-citations.mjs --write` confirmed all verbatim quotes unchanged,
  only line numbers moved (1584→1588, 1503→1510, 1594→1598).

**Tests:** 1897/1897 passing (GREEN) — 180 files. Targeted files
(`render.attract-start-prompt.test.ts` 11/11, `render.attract-pages.test.ts`
6/6) verified directly; full suite + build + citation gate verified via
testing-runner subagent.
**Build:** `npm run build` (`tsc --noEmit && vite build`) clean, exit 0.
**Citation gate:** `tests/audit/citations.test.ts` 12/12 passing.
**Branch:** `feat/sw9-3-attract-parity` (pushed, commit `c842ff1`)

**Handoff:** To Reviewer

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `state.mode` → `render()` dispatch (render.ts:600-604) →
`drawAttract` is entered **only** when `mode === 'attract'`; `select`/`gameover`/
`playing` take other branches. Inside `drawAttract` the per-page switch draws the
page, then the invitation is drawn **once**, after the switch, at `h*0.94`. The
invitation therefore appears on all four idle pages and nowhere else — it does NOT
leak onto the sw9-2 select screen, the game-over screen, or a live run. Safe.

**Pattern observed:** the fix mirrors `VWCOIN`'s ROM call pattern (one persistent
bottom line invoked by every idle phase) with a single draw after the page switch,
rather than four duplicated `glowText` calls — render.ts:1502.

**Error handling:** N/A (pure render path, no I/O/null-deref surface; the string is
a literal, `highScores` is only consumed by the board path unchanged).

### Charge-by-charge

1. **ROM grounding — VERIFIED.** Against `~/Projects/star-wars-1983-source-text`:
   `VWCOIN` (WSMAIN.MAC:802) with credit present loads `#MS.STR`; `JSR VWCOIN` is
   called at **:702 (PHEINS), :733 (PHESCR), :904 (PHEHIS), :1268 (PHEBNR)** — all
   four idle phases, exactly as cited. `MS.STR` = `.MESS …<PULL TRIGGER TO START>,STR`
   (TCMES.MAC:549) — verbatim match. (Note: the VWCOIN inline comment says
   "PRESS FIRE TO START"; the actual *string* is "PULL TRIGGER TO START" — Dev/TEA
   correctly followed the string, not the stale comment.) A 5th `JSR VWCOIN` at :1173
   is in **PHEENT (ENTER INITIALS)**, not an idle attract page — correctly excluded.
2. **Canopy TPHASE ruling — VERIFIED, NOT a Critical.** TPHASE (WSMAIN.MAC:307-368)
   lists idle phases BNR/INS/SCR/HIS only; every gameplay phase (SP1/SP2/GD/BS/trench
   transitions) sits **after** `CN1 ;FIRST COIN` → `SG1`/`SG2 ;START GAME` → `BGN`.
   No `DEMO`/`SELF-PLAY` symbol exists anywhere in the source (only operator
   "MUSIC IN ATTRACT" options + STRTCK). The attract loop has no gameplay demo, so
   nothing overlays the canopy frame on attract — sw9-1's absent-on-attract guards
   are correct and correctly kept unchanged.
3. **F5 sentinel re-seat — SOUND.** "STAR WARS" is drawn exactly once, in
   `drawBannerPage` (render.ts:1510) — genuinely banner-only. The re-seated guard
   still catches a whole-banner fallthrough (proven by mutation B below). Intent
   preserved; not weakened.
4. **Additive fix — CONFIRMED.** Marquee/crawl stay inside `drawBannerPage` (banner
   only); invitation drawn exactly once per attract frame (grep: the only other
   "PULL TRIGGER TO START" is in `drawGameOver`, a different mode, itself ROM-faithful
   via the PHEENT VWCOIN call). Layout: at H=600 the `h*0.94` baseline (glyph box
   [546,564]) abuts the 10th hi-score entry baseline (546) with 0px overlap and 36px
   bottom margin — clear at H≥600. See LOW note in Delivery Findings for sub-600.
5. **Citations — VERIFIED.** H-007/H-008/H-012 re-anchors are line-number-only
   (1584→1588, 1503→1510, 1594→1598); the three `verbatim` quotes byte-match the
   current render.ts lines 1588/1510/1598. Gate `citations.test.ts` 12/12.
6. **Mutation battery (specialists disabled — probed directly, committed at c842ff1,
   restored, tree clean):**
   - **A** remove the invitation draw → **5 tests failed** (all 4 pages + non-banner
     block in render.attract-start-prompt) — KILLED.
   - **B** draw the marquee on all pages → **2 tests failed** (re-seated F5 guard +
     AC-1 paired banner-only guard) — KILLED.
   - **C** change text to "PRESS START" → **9 tests failed** (MS.STR presence ×5 +
     exact-text "never PRESS START" ×4) — KILLED.
   The suite is genuinely load-bearing; no vacuous guards.

**Independent verification:** full suite **1897/1897, 180 files, exit 0**;
`tsc --noEmit` exit 0; `npm run build` clean; citation gate 12/12. Matches Dev's
claims exactly. **Race check:** origin/develop still at base 4be3388; only
`feat/sw9-3-attract-parity` carries sw9-3 — no sibling work.

### Deviation Audit

- **TEA — F5 sentinel re-seat → ACCEPTED.** The old sentinel ("PULL TRIGGER TO
  START") became a cross-page element after AC-1; re-seating to the banner-only
  "STAR WARS" preserves the anti-fallthrough intent. Proven by mutation B.
- **TEA — ordering/timing/text held-not-repinned → ACCEPTED.** Cross-checked the
  context gap table's ROM anchors against the existing green sw7-10 suites
  (attract-rotation, attract-dwell-magnitude, render.attract-pages, intro-crawl,
  render.rebel-force-board). Correct parity-pass discipline; no re-pinning needed.
- **Dev — single draw after the switch + `h*0.94` placement → ACCEPTED.** Cleaner
  than four duplicate calls and mirrors VWCOIN's single-routine pattern; placement
  verified clear at test/production canvas sizes.

## Subagent Results

Reviewer specialist subagents are DISABLED for this project (settings.json — only
`reviewer-preflight`'s domain applies, and under peloton relay the same session did
the verification). Their domains were therefore assessed directly by the Reviewer:
the mutation battery (A/B/C above) plus the independent full suite/tsc/build/citation
gate stand in for the automated specialists.

| Subagent | Domain | Handled by | Result |
|----------|--------|-----------|--------|
| reviewer-preflight | tests / lint / build | Reviewer (direct) | 1897/1897, tsc 0, build clean |
| reviewer-edge-hunter | boundary conditions | Reviewer (direct) | h*0.94 layout bounds checked; LOW logged |
| reviewer-silent-failure-hunter | swallowed errors | Reviewer (direct) | none (pure render literal) |
| reviewer-test-analyzer | test quality | Reviewer (mutation A/B/C) | all guards bite; no vacuous asserts |
| reviewer-comment-analyzer | stale docs | Reviewer (direct) | comment/docstring updated correctly |
| reviewer-type-design | type invariants | Reviewer (direct) | no type surface change |
| reviewer-security | vulns | Reviewer (direct) | none (client render, no I/O) |
| reviewer-simplifier | complexity | Reviewer (direct) | single-draw is the simpler form |

**All received: Yes**

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Question** (non-blocking): the copyright block `CPYRGHT` — "STAR WARS / © 1983
  LUCASFILM LTD. AND ATARI,INC. / ALL RIGHTS RESERVED. / LUCASFILM TRADEMARKS USED UNDER
  LICENSE." (TCMES.MAC:536-540, drawn on the HI-SCORE page, WSMAIN.MAC:900) — is present
  in the ROM but has NO analog in our clone. **Deliberately NOT scoped in and NOT pinned:**
  reproducing a real Lucasfilm/Atari copyright claim verbatim in a fan clone is legally
  inadvisable. Recorded so no future "parity" story mistakes its absence for a bug. Affects
  `src/shell/render.ts` (leave as-is). *Found by TEA during test design.*
- **Gap** (non-blocking): the ROM draws the SCORE line via `VWMES` ("SCORE AND STUFF") on
  all four attract phases (PHEBNR/PHEINS/PHESCR/PHEHIS); our attract pages show no running
  score. Lower value than the start invitation (the clone resets score, and the hi-score
  board already shows the top scores), so descoped from this 2-pt pass. Affects
  `src/shell/render.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking, MOTION axis — sw7-10 F10 carry-forward): the attract starfield
  runs one uniform drift on all four pages; the cabinet drives FOUR per-page directions
  `SMVBNR`/`SMVINS`/`SMVSCR`/`SMVHIS` (WSMAIN.MAC:2244-2269), each called from its phase
  handler. Out of this story's ordering/timing/text scope; a motion-parity successor.
  Affects `src/core/starfield.ts`, `src/core/sim.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): the banner title is drawn as static "STAR WARS" text;
  the cabinet's `VWBNNR` (TCMES.MAC:302-360) is an animated VJ-font logo that zooms/
  brightens then vanishes at `BN.CNT >= 0xF8` (248 frames) while the page holds to 0x200
  (512). Render-fidelity animation, not ordering/timing/text — candidate follow-up.
  Affects `src/shell/render.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking, ALREADY LOGGED by sw7-10): `VWCOIN`'s full coin/credit behaviour
  (INSERT COINS / FREE PLAY / CREDITS / GAME OVER, TCMES.MAC:546-551) and the interactive
  `STRTCK` page-jump (yoke hard-left→INS, hard-right→HIS, WSMAIN.MAC:573-591) need a
  coin/operator model the clone does not have. Restated here for the attract-parity record.
  Affects `src/core`, `src/shell/render.ts`. *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings.

### Reviewer (code review)
- **Improvement** (non-blocking): the hi-score board (`drawHighScoreBoard`) lays its
  entries out on a **fixed 24px step** from `h*0.5`, so a full 10-entry board reaches
  `h*0.5 + 246`. At the H=600 test size that baseline (546) exactly abuts the new
  `h*0.94` invitation's glyph top (546) — 0px overlap, clear — and stays clear for all
  H≥600. Below ~600px internal canvas height the board's fixed-pixel layout already
  overflows the bottom independently of this change, and the invitation would begin to
  graze the last entry. Not introduced by sw9-3 and not blocking (DPR-scaled production
  `h` is typically well above 600), but a future layout pass could make the board
  height-fraction-based like the rest of the page. Affects `src/shell/render.ts`
  (`drawHighScoreBoard`). *Found by Reviewer during code review.*

## Impact Summary

**Shipped:** star-wars PR #127 (squash 20bcf43 on develop) — attract-mode parity, closing epic sw9. The one true gap closed: the ROM's `VWCOIN` invitation ("PULL TRIGGER TO START", MS.STR — the string, not VWCOIN's lying "PRESS FIRE" comment) now draws on all four attract pages, additively; marquee/crawl stay banner-only (guarded). Ordering/timing/page-texts audited faithful as-is. Inherited sw9-1 decision RULED: no canopy frame on attract — TPHASE's idle loop has no demo phase; every gameplay phase is coin-gated; sw9-1's guards stand. 11 new tests + F5 sentinel re-seat; suite 1897/1897; mutation probes 3/3 killed; tsc/build clean; citations 12/12. Reviewer verdict: **APPROVED**, no Critical/High/Medium.

**Blocking:** none.

**Carried forward (non-blocking, from TEA's parity audit + review):**
- [Finding → future] Attract score line (`VWMES`) divergence — out of 2pt scope.
- [Finding → future] Animated STAR WARS logo; per-page starfield drift (sw7-10 F10); coin/credit + STRTCK page-jump.
- [Descope, deliberate] The ROM's copyright block — legal text not reproduced.
- [LOW, pre-existing] `drawHighScoreBoard` fixed 24px step abuts the h*0.94 invitation below ~600px canvas height — future height-fraction layout pass.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Re-seated the sw7-10 "F5" fallthrough-guard sentinel**
  - Spec source: `tests/shell/render.attract-pages.test.ts:115-130` (sw7-10 rework F5)
  - Spec text: the guard asserted "PULL TRIGGER TO START" is ABSENT on the non-banner
    pages, as a proxy for "the banner did not silently fall through the `drawAttract`
    switch to `default: drawBannerPage`".
  - Implementation: sentinel changed to "STAR WARS" (the marquee title, drawn only by the
    banner phase). AC-1 now draws the invitation on all four pages, so the old sentinel
    would false-positive.
  - Rationale: the ROM draws `MS.STR` via `VWCOIN` on ALL FOUR attract phases
    (PHEBNR:1268 / PHEINS:702 / PHESCR:733 / PHEHIS:904), so "PULL TRIGGER TO START" is a
    persistent cross-page element, not a banner-only one — the wrong sentinel for a
    "banner leaked" guard. "STAR WARS" (`VWBNNR`, banner phase only) is banner-only, so it
    preserves F5's real intent (no page silently renders the whole banner) without the
    false coupling. The two other-page "is NOT" assertions (instructions↔scoring headers)
    are unchanged.
  - Severity: minor (the guard's INTENT is preserved; only its sentinel string changed).
  - Forward impact: whoever implements AC-1 must add ONLY the persistent invitation (like
    `VWCOIN`), not render the marquee everywhere — the re-seated F5 + AC-1's paired
    STAR-WARS-stays-banner-only guard both bite if they do.

- **Ordering/timing/text found already faithful → held beside the ROM, not re-pinned**
  - Spec source: the story title's parity dimensions (ORDERING / TIMING / TEXT)
  - Spec text: "close any ordering/timing/text gaps".
  - Implementation: no new tests for ordering (BNR→INS→SCR→HIS→BNR), timing (0x200×3 /
    0x100) or page text (INS/SCR/crawl/board headers) — each already matches the ROM and
    is pinned by the sw7-10 suites (`attract-rotation`, `attract-dwell-magnitude`,
    `render.attract-pages`, `intro-crawl`, `render.rebel-force-board`). Cross-referenced in
    `sprint/context/context-story-sw9-3.md`, not duplicated.
  - Rationale: a parity pass verifies; re-pinning already-pinned, already-faithful
    behaviour adds brittleness without value. Only the ONE genuine gap gets a RED test.
  - Severity: minor.
  - Forward impact: Reviewer can confirm parity by diffing the context gap-table's ROM
    anchors against the existing green suites.

### Dev (implementation)
- No deviations from spec. Drew the persistent invitation once in `drawAttract`
  after the per-page switch (mirroring `VWCOIN`'s call pattern on all four
  `PHE*` handlers) rather than adding a duplicate `glowText` call inside each
  of the four page-drawing functions — same behaviour the GREEN contract and
  AC-1 called for, chosen only to avoid repeating the same three-line call
  four times. Placed at `h * 0.94` (not pinned by any test) as a genuine
  bottom line clear of the instructions/scoring body text and the hi-score
  board's 10 entries at any canvas size the existing fraction-based layout
  already assumes.