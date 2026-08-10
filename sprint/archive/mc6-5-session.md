---
story_id: mc6-5
jira_key: mc6-5
epic: mc6
workflow: tdd
---
# Story mc6-5: Attract presentation: scrolling attract messages + THE END screen, rendered in shell, plus the high-score display slot mc7 fills with the ladder. Pin the ROM message strings + cadence at RED. REV-01 W3MAIN.MAC:891 / 5277 / 5331 attract

## Story Details
- **ID:** mc6-5
- **Jira Key:** mc6-5
- **Epic:** mc6
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** feat/mc6-5-attract-presentation-messages-highscore-slot
- **Points:** 3
- **Priority:** p3

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-10T21:43:05Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T21:00:12Z | 2026-08-10T21:03:52Z | 3m 40s |
| red | 2026-08-10T21:03:52Z | 2026-08-10T21:17:29Z | 13m 37s |
| green | 2026-08-10T21:17:29Z | 2026-08-10T21:26:50Z | 9m 21s |
| review | 2026-08-10T21:26:50Z | 2026-08-10T21:43:05Z | 16m 15s |
| finish | 2026-08-10T21:43:05Z | - | - |

## Sm Assessment

**Routing note — pivoted here from mc7-4.** The user invoked `/pf-work mc7-4`. Reconnaissance showed mc7-4 was half-done and half-blocked: its "seed defaults + pin at RED" half was already delivered by mc7-1 (`DEFAULT_HIGH_SCORES` in core/highscore.ts, pinned in tests/highscore.test.ts), and its render half depends on "the mc6-5 slot" — which does not exist, because mc6-5 was still backlog. Per the user's ruling (2026-08-10), we honor the designed dependency mc6-5→mc7-4 and build mc6-5 first. (Recorded for the later mc7-4 pickup.)

**Story premise verified against the current tree (REV-01, 035820-01).** Citations resolve against `plugins/missile-command/reference/source/W3MAIN.MAC` (physical line numbers):
- `:5277` = `.SBTTL REFRESH ATTRACT MODE MESSAGES` (REFRESH) — dead-on for message cadence.
- `:5331` = `.SBTTL SCROLL ATTRACT MESSAGES ACROSS SCREEN` (SCROLL) — dead-on for scrolling.
- `:891` = `.SBTTL SMART CURSOR MOVER (ATTRACT)` — mc6-4's self-playing-demo routine; an attract-CONTEXT cite, NOT the messages. Anchor message strings/cadence to 5277/5331.

**Dependencies clear.** The `'attract'` phase exists (core/state.ts:17); mc6-1/6-2/6-3/6-4/6-6 are done (phase machine, setup→play, pause, self-playing attract demo, game-over→attract timeout). mc6-5 is the shell-side PRESENTATION layer on top of that.

**Scope guardrail for TEA/Dev.** The high-score display slot this story creates is the *container* mc7-4 later fills. Do NOT render the full 5-rung ladder here and do NOT re-pin the default ladder values (mc7-1 owns those). The epic YAML had no `acceptance_criteria`; the ACs in the context are DERIVED — treat them as the working spec but flag any refinement as a Delivery Finding.

**For TEA (RED):** locate the actual `.ASCII`/`.ASCIN` message-string data tables referenced by REFRESH (they were not in the immediate 5277–5340 span), and locate the exact "THE END" string in the ROM source before pinning it at RED. Keep purity.test.ts / the core-boundary scan green — rendering is shell-side; any new cited core constant carries a citations-gated claim.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA][Gap][non-blocking] The message STRINGS are not in W3MAIN.MAC — the story's citation is the display LOGIC only.** `ATRMSG`/`PRSCRO` are `.GLOBL` externals (W3MAIN.MAC:63) defined in **W3DSUP.MAC**; the attract message text is the English-literal table at W3DSUP.MAC:3324–3390 (EPRESS 'PRESS START' :3328, ETHEEND 'THE END' :3338, EMISIL 'MISSILE' :3384, ECOMAN 'COMMAND' :3386, EHISCR 'HIGH SCORES' :3368, EGAMOV 'GAME OVER' :3326). W3MAIN.MAC:5277 (REFRESH) / :5331 (SCROLL) is the display/scroll LOGIC. Dev must cite the STRINGS to W3DSUP.MAC and the cadence to W3MAIN.MAC. Recorded so the archived story's citations don't all point at W3MAIN.
- **[TEA][Improvement][non-blocking] "THE END" display point located.** ETHEEND renders in the game-over explosion — W3MAIN.MAC:4719 `LDA I,MTHEEND ;DISPLAY "THE END" IN EXPLOSION` — i.e. during phase `'over'`. RED pins THE END to render on `'over'`, not as a separate attract screen.
- **[TEA][Question][non-blocking] Scroll cadence pinned as SCROLL_FRAMES_PER_STEP=2.** The REFRESH gate `LDA FRAME / LSR / IFCC / JSR SCROLL` (W3MAIN.MAC:5313–5319) fires SCROLL when FRAME bit 0 is clear = every 2nd frame. RED pins the cadence as 2 frames/step and drives the scroll off `state.frame` (the sim's only clock — GameState.frame). The sub-character pixel-shift math (SCROLL's per-column bit rotate) is out of scope, per the mc10-3 "discover from marks, don't pin pixel math" precedent.

### Reviewer (code review)

- **[Improvement][non-blocking] Glyph-helper duplication.** The new module-level `drawGlyphText`/`glyphTextWidth`/`drawCenteredGlyphs` (render.ts) partially duplicate `drawFrame`'s local `drawGlyphs`/`drawCentered`/`textWidth`. A future render-cleanup story could fold `drawFrame`'s HUD onto the module helpers (they add canvas-bounds clipping the locals lack). Left as-is here — proportional to a 3pt story; unifying touches working HUD code.
- **[Gap][non-blocking] Header-render coverage.** `drawAttract` paints the MISSILE/COMMAND title and HIGH SCORES header, but no test asserts they appear (the mid-band is unasserted; AC3 is satisfied by the `highScoreSlot()` function + the container guard). The visual is an owner screenshot at `/missile-command/` — a node test cannot read the drawn stamp glyphs (mc10-3 precedent).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[TEA] Free-play attract message set (vs the coin-op MESDAT table).** The ROM scroll table (W3DSUP.MAC MESDAT) is coin-centric: YESCRE = PRESS START / CREDITS: / #credits / copyright; NOCRED = GAME OVER / INSERT COINS / coin-mode / copyright. **What the spec (title) said:** "pin the ROM message strings." **What RED does:** pins the individual ROM string CONSTANTS as ground truth and requires the shell to render the FREE-PLAY subset (PRESS START + MISSILE COMMAND title + HIGH SCORES slot). **Why:** the arcade fleet is free-play / browser — no coins, no backend (CLAUDE.md) — so INSERT COINS / CREDITS: / #credits are inapplicable. The exact scroll ORDER is deliberately NOT over-specified (AC1 asserts the message list CONTAINS 'PRESS START', not an exact array), leaving Dev room. If the owner wants the coin-op strings shown verbatim in attract, that is a Reviewer/owner call.
  - **[Reviewer: ACCEPTED]** Free-play is the correct reading — the fleet is browser-based with no coin mechanism (CLAUDE.md: no backend), so the coin-op MESDAT scroll (INSERT COINS/CREDITS) is inapplicable. Pinning the individual ROM string constants as cited ground truth while rendering the free-play subset is faithful and leaves the exact scroll order to good judgment. The residual "owner may want coin-op strings verbatim" is a genuine-but-cosmetic owner preference, not a fidelity defect. Accepted.

## Tea Assessment

**RED is committed (`b7519283`): 11 failing / 6 passing in `tests/mc6-5-attract-presentation.test.ts`.** Full missile-command project 11 failed / 1275 passed (only mc6-5 new-red, no regressions); orchestrator 457/457; `tsc --noEmit` green. `src/shell/attract.ts` is an empty `export {}` stub reached via a dynamic-import namespace cast, so tsc stays green while every unimplemented export fails its assertion as "not implemented".

**The seam Dev must fill (GREEN):**
- `src/shell/attract.ts` exports:
  - `MSG_PRESS_START='PRESS START'` (W3DSUP.MAC:3328), `MSG_THE_END='THE END'` (:3338), `TITLE_LINE_1='MISSILE'` (:3384), `TITLE_LINE_2='COMMAND'` (:3386), `MSG_HIGH_SCORES='HIGH SCORES'` (:3368).
  - `ATTRACT_SCROLL_MESSAGES: readonly string[]` — must CONTAIN `MSG_PRESS_START`.
  - `SCROLL_FRAMES_PER_STEP=2` (W3MAIN.MAC:5313–5319).
  - `scrollStepsAt(frame)` — pure/deterministic; `Math.floor(frame / SCROLL_FRAMES_PER_STEP)`.
  - `highScoreSlot(width,height): {x,y,w,h,rows}` — `rows===MC_HIGH_SCORE_DEPTH` (5), region within canvas bounds.
- `src/shell/render.ts` `drawFrame`: during `phase==='attract'` paint the title + scrolling messages (offset by `scrollStepsAt(state.frame)` so the bottom band's x-signature CHANGES frame-to-frame) + reserve the hi-score slot WITHOUT painting rungs 1–4; during `phase==='over'` paint a centre-band THE END overlay (marks the frozen `'play'` field does not have).
- File `docs/rom-study/claims/attract.json` with `MC-ATTRACT-*` claims covering W3DSUP.MAC lines 3328/3338/3368/3384/3386 and the W3MAIN.MAC:5313–5319 cadence gate (the AC6 `claimCovers` assertions). String `value`s are allowed (see MC-HISCORE-DEFAULT-* precedent). `check-citations.mjs` byte-verifies the `verbatim` against source — copy each line verbatim (they contain tabs).

**Scope guards already GREEN (locks, keep them green):** AC4 — `DEFAULT_HIGH_SCORES` untouched (DFT 7500…MJP 6950); AC3 container-guard — mutating ladder rungs 1–4 must not change any painted mark (do NOT render the ladder here; that's mc7-4); AC5 — `attract.ts` must stay clock/entropy-free (no `Date`/`performance.now`/`requestAnimationFrame`/`Math.random`).

**Rule Coverage (TS lang-review checklist → mc6-5 tests):**
- *Meaningful assertions / no vacuous tests (JS #8, TS tests):* every test asserts a concrete value; the two green-on-arrival guards (AC4 lock, AC3 container) assert equality/inequality on real marks, not `is*` truthiness.
- *`Map.get()`/optional-chaining without undefined check (TS):* n/a to this render path; the mock ctx coerces missing coord args to `NaN` and the band filter drops non-finite `y`.
- *Determinism / no hidden clock (project boundary rule):* AC5 pins `attract.ts` clock-free (source scan, comments stripped first) AND that the same `state.frame` renders an identical mark signature twice.
- *Source-file hazard (mc1):* `.MAC` read as utf8 (`grep` false-empties) and the source double-entry tests are `skipIf(!sourceAvailable)` so they degrade on CI where the vendored tree is gitignored.

**Handoff:** Dev (Yoda) — implement the seam above and file `attract.json`; run `npx vitest run --project missile-command` to GREEN (target 1286/1286) plus `npm run lint`. Verify the render behaviour at `/missile-command/` (a node test can't read drawn glyphs — the scroll/THE END LOOK is an owner/reviewer screenshot).
## Dev Assessment

**GREEN committed (`12601f37`) and pushed.** `npx vitest run --project missile-command` → **1286/1286** (my 17 mc6-5 tests + citations/citations-source/render-field all pass); `npm run test:orchestrator` 457/457; `npm run lint` (tsc) clean; `node tools/audit/check-citations.mjs` → 224 claims, all verified.

**What shipped (exactly the TEA seam, no more):**
- `src/shell/attract.ts` (was the RED stub): cited ROM string constants `MSG_PRESS_START`/`MSG_THE_END`/`MSG_GAME_OVER`/`TITLE_LINE_1`/`TITLE_LINE_2`/`MSG_HIGH_SCORES`, `ATTRACT_SCROLL_MESSAGES=[MSG_PRESS_START]`, `SCROLL_FRAMES_PER_STEP=2`, pure `scrollStepsAt(frame)=floor(frame/2)`, and `highScoreSlot(w,h)` returning a centred in-bounds box with `rows=MC_HIGH_SCORE_DEPTH`. Imports only `MC_HIGH_SCORE_DEPTH` from core — no clock, no RNG.
- `src/shell/render.ts`: `drawAttract` (MISSILE/COMMAND title + HIGH SCORES header over the reserved slot + a bottom-band PRESS START marquee driven by `scrollStepsAt(state.frame)`) on `phase==='attract'`; `drawTheEnd` (centred THE END) on `phase==='over'`; both painted before the pause overlay. New module-level glyph helpers reuse the existing stamp font (`glyphRows`/`stampPixels`).
- `docs/rom-study/claims/attract.json`: 7 `MC-ATTRACT-*` claims (strings→W3DSUP.MAC, cadence→W3MAIN.MAC:5313).

**Two review-mechanic corrections made during GREEN (worth the Reviewer knowing):**
1. **Non-EQU claim value = kind-tag.** `citations-source.test.ts` (mc2-6 M6) requires a non-EQU claim (verbatim has no `=RHS`) to carry `value ∈ {'anchor','cite','external'}`, never a number/string literal — a numeric value would pollute the un-cited-literal guard's `claimedValues`. All 7 attract claims cite `.ASCIN`/instruction lines (non-EQU), so `value:"cite"`; the human string lives in `meaning` and is re-derived from source by the AC6 double-entry test.
2. **Marquee clipped to canvas.** `render-field.test.ts` asserts every bottom-band mark's x ∈ [0,W]; the scroll enters from the right, so `drawGlyphText` now clips each glyph pixel to `[0,width)` — a marquee slides in/out at the edges and never paints off-canvas. `createGame()` (frame 0) → scroll fully off-right → fully clipped → in bounds.

**Scope honoured:** ladder VALUES untouched (AC4 lock green); the slot is a container only — no rung data painted, so mutating rungs 1-4 leaves the render identical (AC3 guard green); attract render is clock/entropy-free (AC5).

**Outstanding for Reviewer/owner (per mc10-3 precedent):** a node test cannot read the drawn stamp glyphs, so the *appearance* (title placement, marquee legibility, THE END position, slot sizing) is an owner screenshot at `/missile-command/`. The behaviour is pinned green; the LOOK is not machine-checkable here.

**Handoff:** Reviewer (Obi-Wan Kenobi).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all gates green (1286 mc / 457 orch / tsc clean / 224 claims) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — self-assessed (see Devil's Advocate): marquee `% total` safe (banner non-empty → total>0); glyphRows covers A-Z/space/unknown (blank, no throw); no crash paths |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — self-assessed: no try/catch, no swallowed errors, no fallbacks in the render path |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — SELF-ASSESSED (key domain for this test-heavy story): every guard mutation-meaningful; cross-confirmed clean by rule-checker #15/#18/#25/#26 |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 (all LOW) | confirmed 3, dismissed 0, deferred 0 — all 3 FIXED in `8bb33a06` |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — self-assessed: `highScoreSlot` inline return type acceptable for a shell layout helper; no stringly-typed/unsafe-cast issues (mock cast is the fleet idiom) |
| 7 | reviewer-security | Yes | clean | none | N/A — pure canvas render, no trust boundary; degenerate inputs suppress drawing, never crash/inject |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — self-assessed: mild duplication (module-level glyph helpers vs drawFrame's locals) — LOW, non-blocking follow-up, not fixed (would touch working HUD code) |
| 9 | reviewer-rule-checker | Yes | clean | 0/32 | N/A — 0 violations across 26 lang-review + 6 project rules; live mutation-tested the AC6 claim guard |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled and self-assessed)
**Total findings:** 3 confirmed (all LOW, all fixed), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Subagent dispatch tags:**
- `[EDGE]` (disabled, self-assessed): no crash/unbounded paths — marquee `% total` safe (banner non-empty), `glyphRows` blanks unknown chars, no throw.
- `[SILENT]` (disabled, self-assessed): no try/catch, no swallowed errors or silent fallbacks in the render path.
- `[TEST]` (disabled, self-assessed): every guard mutation-meaningful; cross-confirmed by `[RULE]` #15/#18/#25/#26 = 0.
- `[DOC]` (comment-analyzer): 3 LOW findings — false CLAUDE.md attribution (×2) + dead `MSG_GAME_OVER` export — all FIXED in `8bb33a06`.
- `[TYPE]` (disabled, self-assessed): `highScoreSlot` inline return type fine for a shell helper; mock cast is the fleet idiom; no stringly-typed issues.
- `[SEC]` (security): clean — pure canvas render, no trust boundary; degenerate inputs suppress drawing, never crash/inject.
- `[SIMPLE]` (disabled, self-assessed): mild glyph-helper duplication — LOW, non-blocking follow-up (would touch working HUD code).
- `[RULE]` (rule-checker): 0 violations across 32 checks (26 lang-review + 6 project); live mutation-tested the AC6 claim guard.

**Context:** This whole pipeline (SM→TEA→Dev→Reviewer) ran in ONE session, so I leaned hard on independent subagents rather than self-review, and self-assessed the disabled domains explicitly. Sibling re-probe at review start: no concurrent checkout owns mc6-5 (only my branch; mc6-6's branch is a merged leftover) — not superseded. Branch 3 (now 4) commits ahead of `origin/develop`, clean.

**Findings (comment-analyzer, all LOW, all FIXED in `8bb33a06` — non-behavioral):**
1. **[LOW→fixed] False source attribution** at `attract.ts:17` + `test:25`: the free-play/no-coins fact was cited to CLAUDE.md, but CLAUDE.md says "no backend," not "no coins" (this project's whole citation apparatus exists to catch exactly this). Reworded to cite what CLAUDE.md actually states and derive the no-coin-mechanism conclusion.
2. **[LOW→fixed] Dead cited export** `MSG_GAME_OVER` (`attract.ts:29`): exported with a ROM docstring but consumed nowhere — read as wired but was scope-creep. Dropped the export and its orphan `MC-ATTRACT-MSG-GAME-OVER` claim (free-play shows THE END at game end, not the coin-op GAME OVER scroll message). Claims 224→223, still all verified; AC6 unaffected (it never cited line 3326).

**VERIFIED (own inspection + subagent cross-confirmation):**
- [VERIFIED] Every ROM citation byte-matches the vendored source — comment-analyzer independently byte-verified EPRESS/ETHEEND/EMISIL/ECOMAN/EHISCR/cadence and traced the MTHEEND→EMTBL[8]→ETHEEND chain for W3MAIN.MAC:4719. Evidence: `check-citations.mjs` 223/223.
- [VERIFIED] Tests are non-vacuous — the scroll observable isolates the ONLY frame-dependent render (render.ts:375 is the sole `state.frame` reader), the container guard mutates real `state.highScores`, AC6/source tests read the real vendored source, AC4 locks the real `DEFAULT_HIGH_SCORES`. Cross-confirmed by rule-checker #15/#18/#25/#26 = 0 violations (it live-mutation-tested the claim guard).
- [VERIFIED] Core boundary intact — `src/core/` untouched (`git diff --stat` empty); all new logic in `src/shell/`; `attract.ts` imports only `MC_HIGH_SCORE_DEPTH` from core, one direction; purity.test.ts green. No new `src/core` constants, so the un-cited-literal sweep doesn't apply.
- [VERIFIED] No degenerate-input crash — `glyphScale` floors height to ≥1; the marquee `% total` is safe because `ATTRACT_SCROLL_MESSAGES` is non-empty (`total ≥ bannerW > 0`); `drawGlyphText`'s `px>=0 && px+gp<=width` bound suppresses drawing on any NaN. Cross-confirmed by security (clean) and rule-checker #21.
- [VERIFIED] Non-EQU claims carry the kind-tag value `'cite'` (mc2-6 M6) — all 6 remaining claims comply; cross-confirmed by rule-checker #32.

### Devil's Advocate

Assume this is broken. First attack: the marquee. On a fresh boot `state.frame === 0`, so `scrollStepsAt(0) === 0` and `scrollX === width` — the banner is entirely off the right edge and fully clipped, so for the first ~2 frames the attract screen shows the title and HIGH SCORES header but NO scroll text. Is that a bug? No — it is a marquee entering from the right one pixel per two frames; by design the text slides in. A confused observer sees a title screen that grows a scroll, which is authentic. Second attack: does anything read `state.highScores` in attract such that a future ladder-render leaks in early and steals mc7-4's job? The HUD reads `highScores[0]` (the BEST figure, mc10-3) — that is rung 0 only, and the AC3 container guard mutates rungs 1–4 and asserts the render is byte-identical, so a stray lower-rung read would redden. Third attack: the "WHY THIS IS RED" test header now lies — attract.ts is a full implementation, not a stub. But git log shows three staged commits (chore→test(RED)→feat(GREEN)) and the header narrates the RED commit it was authored in; this is the repo-wide TDD convention (citations.test.ts, purity.test.ts keep identical "RED phase" language post-GREEN). Not a same-diff contradiction. Fourth attack: a stressed canvas with width/height 0. `glyphScale` floors to 1, `highScoreSlot` returns a zero-size but finite rect, the marquee modulo stays finite (banner non-empty), and NaN paths suppress drawing — no throw, no infinite loop. Fifth attack: could a letter in my strings be missing from the ROM font and render blank or throw? `glyphRows` covers A–Z + digits and returns a blank for space/unknown — every character in PRESS START / MISSILE / COMMAND / HIGH SCORES / THE END is uppercase or space, all covered. Nothing here rises above LOW.

### Rule Compliance (TS lang-review checklist)
All 26 lang-review checks + 6 project rules verified 0 violations by rule-checker (32 total). Spot-relevant: #15/#18/#25/#26 (test-vacuity) clean; #21 (degenerate numeric) clean; #17 (unverified comment mechanism) — the one real instance (the CLAUDE.md attribution) is now fixed; boundary rules (core purity, shell-side render, cited constants) clean.

### Non-blocking follow-up (not filed, noted only)
- **[LOW] Glyph-helper duplication:** the new module-level `drawGlyphText`/`glyphTextWidth`/`drawCenteredGlyphs` partially duplicate `drawFrame`'s local `drawGlyphs`/`drawCentered`/`textWidth`. Proportional to a 3pt story to leave as-is (unifying would touch working HUD code); a future render-cleanup could fold them.
- **[LOW] Header-render coverage gap:** the "HIGH SCORES" header and MISSILE/COMMAND title are drawn by `drawAttract` but no test asserts they paint (the mid-band is unasserted). AC3 is satisfied by the `highScoreSlot()` function + container guard; the visual is an owner screenshot at `/missile-command/`.

**Outstanding for owner:** the LOOK (title placement, marquee legibility, THE END position, slot sizing) is an owner screenshot at `/missile-command/` — a node test cannot read the drawn stamp glyphs (mc10-3 precedent).

**Handoff:** SM (Grand Admiral Thrawn) — finish.
## Impact Summary (SM finish preflight)

**Blocking: 0.** Ready to finish. Verified: `npm run lint` clean; `npx vitest run --project missile-command` 1286/1286; `npm run test:orchestrator` 457/457; `check-citations.mjs` 223 claims verified; session `## Reviewer Assessment` verdict APPROVED. Single review round, no Critical/High ever.

**Non-blocking findings (5, all informational):**
- [TEA/Gap] Message STRINGS live in W3DSUP.MAC:3324–3390; W3MAIN.MAC:5277/5331 is display LOGIC only — citations split accordingly (strings→W3DSUP, cadence→W3MAIN). Recorded so the archived citations aren't misread as all-W3MAIN.
- [TEA/Improvement] THE END renders during phase 'over' (W3MAIN.MAC:4719), not a separate screen.
- [TEA/Question] Scroll cadence = 2 frames/step (W3MAIN.MAC:5313–5319), driven off `state.frame`; sub-character pixel math out of scope (mc10-3 precedent).
- [Reviewer/Improvement] Glyph-helper duplication (module-level vs drawFrame locals) — future render-cleanup; not fixed (touches working HUD).
- [Reviewer/Gap] Title/HIGH SCORES header rendered but unasserted (node can't read glyphs) — owner screenshot at `/missile-command/`.

Three LOW comment-analyzer findings (false CLAUDE.md attribution ×2, dead MSG_GAME_OVER export) were FIXED in `8bb33a06`; claims 224→223, all verified.
