---
story_id: "jt11-2"
jira_key: "jt11-2"
epic: "jt11"
workflow: "tdd"
---
# Story jt11-2: Authentic HUD (shell-only)

## Story Details
- **ID:** jt11-2
- **Jira Key:** jt11-2
- **Workflow:** tdd
- **Stack Parent:** none

## Branch Details
**Branch Strategy:** gitflow (feat/jt11-2-authentic-hud)
**Branch:** feat/jt11-2-authentic-hud
**PR:** https://github.com/slabgorb/arcade/pull/275

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-12T11:53:33Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-12T11:17:49.298067Z | 2026-08-12T11:19:17Z | 1m 27s |
| red | 2026-08-12T11:19:17Z | 2026-08-12T11:35:34Z | 16m 17s |
| green | 2026-08-12T11:35:34Z | 2026-08-12T11:38:37Z | 3m 3s |
| review | 2026-08-12T11:38:37Z | 2026-08-12T11:50:54Z | 12m 17s |
| green | 2026-08-12T11:50:54Z | 2026-08-12T11:53:23Z | 2m 29s |
| review | 2026-08-12T11:53:23Z | 2026-08-12T11:53:33Z | 10s |
| finish | 2026-08-12T11:53:33Z | - | - |

## Sm Assessment

Setup complete for jt11-2 (Authentic HUD, shell-only). Session file created, branch `feat/jt11-2-authentic-hud` cut from develop, story claimed in_progress, context at `sprint/context/context-story-jt11-2.md`. Workflow tdd (phased) — routing to TEA for the RED phase. Scope guard from the story: NO core sim changes; work is confined to the joust shell (main.ts HUD rendering) plus, optionally, extending the `overlayReadout` selector to surface `scoreBcd` (game.ts:664-690) if BCD-exact digits are wanted.

## Tea Assessment

RED committed (553fe421): `plugins/joust/tests/hud-jt11-2.test.ts` — 18 intended reds in 2 files (16 new + 2 extended jt4-5 readout pins), all controls green, lint + orchestrator green, 171 other joust files green (README census bumped 172→173).

**Measured corrections to the story title (the title-only premise was measured against the quarry first):**
1. **The score font is FONT57, not FONT35.** SCODSP (JOUSTRV4.SRC:7444-7487) draws digits through BCDMSN/BCDLSN from `[FONT5]`, initialised from the MESSAGE ROM vector `FDB FONT57` (MESSAGE.SRC:37) — 6×7 cells (DMA `$0307`), 6px column pitch. FONT35's 4px digits cannot fill either. The font35 header prose ("used for scores") describes the 3×5 BCD output ROUTINES, not the in-game HUD.
2. **PLY1R decodes 14×7, not 7×7** — the ROM header XSIZE is 7 *bytes* (JOUSTI.SRC:2054). At the ROM's 6px icon stride the stand-in riders overlap into a fan; accepted for this story, exact fix filed (jt11-9).

**The spec the tests pin (all ROM-measured):** BCD-derived digits (synthetic-divergence test proves the register, not the number, is the source) with SCODSP leading-zero blanking (zero score → lone units '0'); units columns P1 x=108 / P2 x=186, row y=217; six-digit start columns 78/156; colours palette[5]/palette[7] by identity (PL1/PL2 EQU, JOUSTRV4.SRC:52-54); lives icons PLY1R (P1) / **PLY2R (P2 — the green rider, the title names only P1's)** at anchors 114/192, 6px stride, hard cap of 5 painted (INCLIV `CMPA #5`); no wave number in the authentic HUD; selector `overlayReadout` grows per-line `scoreBcd` (identity, no copy — the story's blessed non-sim core touch); main.ts wiring by comment-stripped source with two-way stripper controls.

**Seam for Dev (spelled in each failure message):** new `src/shell/hudScreen.ts` exporting `layoutHud(readout, palette)` → `{ players: [{ score: LaidOutText, scoreX, scoreY, lives: {name,x,y}[] }] }`; main.ts imports it, removes drawOverlay/fillText/WAVE, paints per frame after paintSim (keep an `overlayReadout(` call inside the frame fn — the render-jt4-5 per-frame pin stays in force).

**Rule coverage (typescript lang-review):** vacuous-assertion self-check done (every test asserts identity/exact values; controls prove resolution both ways); purity/no-mutation pinned; edge cases: zero score, 6-digit max, lives 0/8, 1P readout; derived-vs-transcribed synthetic input; no `.ts:NN` comment refs (jt9-30 guard) and census bump done at RED so Dev inherits only intended reds.

**Deviation from the phase script:** RED verified by direct vitest/lint/orchestrator runs (tallies above) rather than a testing-runner spawn — evidence captured inline.

## Dev Assessment

GREEN committed (ef1eb650) on top of RED (553fe421). Three files: new `plugins/joust/src/shell/hudScreen.ts` (pure layout — BCD blanking, FONT57 digits at the ROM units columns, per-player PL1/PL2 palette colours, up to five PLY1R/PLY2R icon ops from the ROM anchors at 6px stride, all constants ROM-cited in the header), `game.ts` selector extension (`OverlayPlayerReadout.scoreBcd` threads the ledger array by identity — no sim change; the purity boundary is untouched), and `main.ts` (dev bar deleted with its `OVERLAY_COLOUR_INDEX` and WAVE line; `drawHud(overlayReadout(cabinet.game))` painted in the playing branch after `paintSim`, keeping the render-jt4-5 per-frame `overlayReadout(` pin satisfied; stale dev-bar comment prose truth-fixed at all five mention sites).

Evidence: joust 173 files / 3418 tests green (was 18 red in 2 files), `npm run lint` green, `node scripts/build-app.mjs joust` green. Implementation is minimal — nothing beyond what the tests demand; no new abstractions.

Note for verify/review: the visible result deserves the standing human smoke test (`just serve` → /joust/ → coin up) — the fanned overlap of the 14px riders at the 6px stride is DELIBERATE this story (jt11-9 swaps in the exact 6px SCOPL sprites).

## Subagent Results

| Subagent | Status | Result |
|----------|--------|--------|
| reviewer-preflight | Received | All mechanical gates green: lint, joust 173 files / 3418 tests, orchestrator 478/478, build, README census 173 = discovered 173. One uncommitted file (sprint/epic-jt11.yaml — pf's in_review stamp). |
| reviewer-test-analyzer | Received | 7 probes clean (BCD divergence, units anchoring, icon identity, stripper control, colour identity, purity, AC-4 identity). 2 medium: the extended game-jt4-5 scoreBcd pins can't distinguish a hardcoded [0,0,0]. 3 low: lives=5 boundary missing; frame-slice-to-EOF coupling; WAVE regex narrowness. |
| reviewer-comment-analyzer | Received | 1 high: game.ts dev-overlay banner/docs stale (contradicted by this diff's own scoreBcd doc). All hudScreen ROM cites verified accurate against the quarry. Minor: BCDMSN cite range should be :7492-7515. main.ts sweep complete; README census correct. |
| reviewer-rule-checker | Received | 26 rules / 71 instances checked. 2 violations, both mechanically confirmed: dead RED-phase as-unknown cast + false comment (test file); the same stale game.ts banner (rule #24). Everything else compliant (readonly discipline, import hygiene, source-pin anchoring, comment-mechanism checks). |
| reviewer-edge-hunter | Skipped / disabled | Covered by hand: malformed-readout indexing (player>2 → undefined geometry — unreachable from the selector), non-BCD nibbles (degrade-not-crash, matches fontRender stance), lives<0, empty players. Mutation battery M1-M7. |
| reviewer-silent-failure-hunter | Skipped / disabled | Covered by hand: blit's silent missing-slot return is guarded by the atlas-block existence test; glyphFor miss degrades by design (pinned repo-wide). M7 proves a dropped HUD call reddens two files. |
| reviewer-type-design | Skipped / disabled | Covered by rule-checker's #1/#2 sweep (readonly discipline, no escapes in src) + M6 (copy-vs-projection). |
| reviewer-security | Skipped / disabled | No external input, no persistence, no DOM strings — canvas pixels from internal state only; denylist colour scan re-verified green. |
| reviewer-simplifier | Skipped / disabled | Covered by hand: hudScreen is 5 constants + 2 pure functions; no abstraction beyond the tests' demand; main.ts net −15 lines. |

All received: Yes (4 enabled subagents returned; 5 disabled rows carry their explicit hand-coverage notation).

## Reviewer Assessment

**Verdict: APPROVED** (round 2). All five round-1 findings fixed in 2666e030 and re-verified:

1. **[RULE]** The dead `as unknown as` cast and its false comment are gone; the test asserts on the typed readout and `npm run lint` stays green.
2. **[DOC][RULE]** The game.ts readout banner + interface/function docs now state the true consumer (the jt11-2 authentic HUD via shell/hudScreen, scoreBcd + lives; wave projected but never painted). Claims re-checked against drawHud/layoutHud — accurate.
3. **[TEST]** The extended jt4-5 pins now carry distinct per-player BCD fixtures ([0x01,0x23,0x45] / [0x00,0x67,0x89] / solo [0x00,0x09,0x99]). Mutation-verified post-fix: hardcoding `scoreBcd: [0,0,0]` in the selector reddens 3 tests across 2 files (previously only the AC-4 identity pin); tree restored, suite green.
4. **[TEST]** lives=5 exact-boundary case added — 5 lives paints exactly 5 icons.
5. **[DOC]** BCDMSN/BCDLSN cite corrected to JOUSTRV4.SRC:7492-7515 (the comment-analyzer's measurement).

Round-2 delta is comments + test fixtures only — no production behavior change (game.ts edits are comment-only; verified by diff). Full suite 173 files / 3418 tests green, lint green, orchestrator green (preflight), build green. Round-1 evidence stands: 7/7 serial mutants killed, 7 adversarial probes clean, all ROM citations quarry-verified. Descoped items filed: jt11-9 (SCOPL sprites), jt11-10 (naming sweep + pin hardening). Human smoke test of the rendered HUD (`just serve` → /joust/) remains the standing visual check — the rider-icon fan is deliberate this story.

## Reviewer Assessment — Round 1

**Verdict: REJECTED** — no behavioral defect (mechanics all green, 7/7 mutants killed: blanking, font, P2 column, cap, icon identity, selector copy, frame wiring — the last caught by two independent files), but four confirmed in-diff defects must be fixed before approval, all small:

| # | Sev | File | Finding | Required fix |
|---|-----|------|---------|--------------|
| 1 | MEDIUM [RULE] | tests/hud-jt11-2.test.ts:302 | Dead RED-phase `as unknown as` double-cast; its comment ("the selector type has no scoreBcd yet") is now FALSE — rule #1/#13, mechanically confirmed removable | Delete the cast + stale comment; assert on the typed readout directly |
| 2 | MEDIUM [DOC][RULE] | src/core/game.ts:655-691 | Section banner "THE DEV-OVERLAY READOUT… the shell draws a dev-overlay of score + lives and the wave… this is the dev bar only" + interface/function docs — all three claims retired BY THIS DIFF (drawOverlay deleted, wave dropped, jt11-2 IS the authentic display); contradicts the scoreBcd doc three lines below | Truth-fix the banner + the OverlayReadout/overlayReadout doc comments (comment-only; no joust guard pins game.ts line numbers) |
| 3 | MEDIUM [TEST] | tests/game-jt4-5.test.ts:517,545 | Extended pins assert scoreBcd [0,0,0] against ledgers defaulting [0,0,0] — a selector hardcoding [0,0,0] passes both | Vary the fixtures (scoreToBcd of the scores, or distinct literals) so the pins carry signal |
| 4 | LOW [TEST] | tests/hud-jt11-2.test.ts (AC-3) | lives=5 exact boundary untested (cap proven only from 8 above and 3 below) | Add lives:5 → exactly 5 icons |
| 5 | LOW [DOC] | tests/hud-jt11-2.test.ts:12 | BCDMSN/BCDLSN cite range :7495-7519 measured off — label at :7492, routine ends :7515 | Correct the range |

**Dispositions of remaining specialist notes:** frame-slice-to-EOF coupling + untouched-file dev-overlay prose → FILED as jt11-10 (chore, p3). WAVE-regex narrowness → no change needed (covered by the sibling fillText/drawOverlay absence pins in the same block). SCOPL authenticity → already filed (jt11-9).

Round-1 evidence: preflight green across all gates; serial mutation battery M1-M7 all killed with tree-restore verified between mutants; specialists' claims spot-verified (the rule-checker's cast-removal claim and the comment-analyzer's BCDMSN line measurement both re-confirmed by the reporting agents' own command output).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **Gap (non-blocking, FILED → jt11-9):** the ROM's actual lives icon is SCOPL1/SCOPL2 ("PLAYER n IMAGES LEFT", JOUSTRV4.SRC:7521-7537), a dedicated 6×7 sitting-player sprite pair — untranscribed in pictures.ts. The story prescribes the 14×7 PLY1R/PLY2R riders as stand-ins; at the ROM's 6px stride they overlap into a fan. jt11-9 transcribes SCOPL and swaps it in.
- **Gap (non-blocking, owner: Dev this story):** the story title says FONT35 is the score font; measurement says FONT57 (see Tea Assessment). The tests pin FONT57 — Dev should not "fix" them back toward the title.
- **Improvement (non-blocking, owner: Reviewer):** font35.ts header prose "used for scores, BCD displays and the CREDITS row" is misleading for the in-game HUD (it describes the BCD35/OUTB35 routines' uses); a one-line clarification would stop the next story tripping on it. Prose is the unguarded surface — no test reddens on it.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No deviations.