---
story_id: "mc10-3"
jira_key: "mc10-3"
epic: "mc10"
workflow: "tdd"
---
# Story mc10-3: Rebuild the HUD to authentic layout

## Story Details
- **ID:** mc10-3
- **Jira Key:** mc10-3
- **Workflow:** tdd
- **Branch:** feat/mc10-3-authentic-hud-layout
- **PR:** https://github.com/slabgorb/arcade/pull/206 (merged)
- **Stack Parent:** none
- **Points:** 3
- **Priority:** p2

## Story Summary

Rebuild the HUD to authentic layout: centered numeric score + high score, delete the top-left SCORE/AMMO/WAVE labels and X1 text, move multiplier to bottom-center as 'nX', fix oversized scale (gp=height/120). Keep the byte-exact ROM font (glyphs.ts) UNCHANGED; ammo already shown by base stacks.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-10T17:07:43Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T16:29:51Z | 2026-08-10T16:31:30Z | 1m 39s |
| red | 2026-08-10T16:31:30Z | 2026-08-10T16:44:52Z | 13m 22s |
| green | 2026-08-10T16:44:52Z | 2026-08-10T16:51:57Z | 7m 5s |
| review | 2026-08-10T16:51:57Z | 2026-08-10T17:04:34Z | 12m 37s |
| green | 2026-08-10T17:04:34Z | 2026-08-10T17:05:51Z | 1m 17s |
| review | 2026-08-10T17:05:51Z | 2026-08-10T17:07:43Z | 1m 52s |
| finish | 2026-08-10T17:07:43Z | - | - |

## Delivery Findings

No upstream findings.

### Reviewer (code review)
- **Improvement** (blocking): `hiScore` re-derives the ladder BEST via `reduce(max)` instead of the verbatim `state.highScores[0].score`. Affects `plugins/missile-command/src/shell/render.ts:282` (read the BEST verbatim; behaviour-preserving under the sorted-descending ladder invariant). *Found by Reviewer during code review.*
- **Gap** (blocking): stale file-header summary claims the ammo/wave readouts are "content-driven" after this story deleted those tests. Affects `plugins/missile-command/tests/render-hud.test.ts:38-40` (reword item D). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the high-score line's own horizontal centering has no test; consider a centroid-invariance check for it. Affects `plugins/missile-command/tests/render-hud-layout.test.ts` (block B). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the HUD mock (`hudCtx`/`X_ARG`/`Y_ARG`/`HudMark`) is duplicated across the two HUD test files; a shared `tests/support/hud-mock.ts` is the second-consumer extraction. Affects `plugins/missile-command/tests/render-hud*.test.ts`. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 3 findings (1 Gap, 0 Conflict, 0 Question, 2 Improvement)
**Blocking:** 2 BLOCKING items — see below

**BLOCKING:**
- **Improvement:** `hiScore` re-derives the ladder BEST via `reduce(max)` instead of the verbatim `state.highScores[0].score`. Affects `plugins/missile-command/src/shell/render.ts:282`.
- **Gap:** stale file-header summary claims the ammo/wave readouts are "content-driven" after this story deleted those tests. Affects `plugins/missile-command/tests/render-hud.test.ts:38-40`.

- **Improvement:** the high-score line's own horizontal centering has no test; consider a centroid-invariance check for it. Affects `plugins/missile-command/tests/render-hud-layout.test.ts`.

### Downstream Effects

Cross-module impact: 3 findings across 2 modules

- **`plugins/missile-command/tests`** — 2 findings
- **`plugins/missile-command/src/shell`** — 1 finding

## Design Deviations

No deviations at this time.

### Reviewer (audit)
- Dev logged no formal deviations, only "design decisions." Audited all three (stacking order = score-over-hi; scale divisor `/240`; shell layout literals uncited): all sound, within the story's latitude, no spec conflict → **✓ ACCEPTED**. The score-centered layout assumption TEA flagged is implemented as centered and verified against real render output — no cabinet-layout counter-evidence surfaced, so it stands unless the owner's screenshot says otherwise.

## Sm Assessment

Story setup complete; routing to TEA for the RED phase.

**Scope (from epic mc10 item 3, Architect diagnosis):** The HUD glyphs are byte-exact to the ROM (`glyphs.ts` == W3DSUP.MAC NUMBER :3552 / LETTER :3574, verified) — **do NOT touch the font**. What's wrong is the *layout/wiring*:
- Invented `SCORE` / `AMMO` / `WAVE` text labels in the top-LEFT — delete.
- `X1` multiplier text — delete from top-left; the multiplier belongs bottom-center rendered as `nX`.
- Oversized scale `gp = height/120` — fix (too large).
- `AMMO` text is redundant — base stacks already display ammo (shipped mc9-1).
- Target authentic layout: **centered numeric score + high score** (no labels), multiplier bottom-center as `nX`.

**Boundary (contract 2):** This is all SHELL — `render.ts` (and any shell HUD helper). No core/sim changes expected. TEA writes the failing tests against the HUD render/layout.

**Verify in the BUILD, not just green vitest** — the recurring mc9/mc10 failure mode is green-tests/wrong-pixels. A screenshot or DOM/canvas check at `/missile-command/` matters here.

**Related:** ammo-via-base-stacks = mc9-1; per-wave palette wiring is a *separate* story (mc10-4), out of scope here.

## Tea Assessment

RED phase complete. 7 failing behavioural drivers committed (06d9f466); full mc suite 7 failed / 1213 passed, lint clean. All red for the RIGHT reason (each assertion names the missing behaviour), isolated to the new file.

**All work is SHELL — the fix lives in `plugins/missile-command/src/shell/render.ts`, in the HUD block (render.ts:238-268).** No core change. `glyphs.ts` must stay byte-for-byte UNCHANGED (font-byte lock enforces it).

**New tests — `plugins/missile-command/tests/render-hud-layout.test.ts`:**
| Test | What GREEN requires |
|------|---------------------|
| AMMO readout inert | Delete the `AMMO {a b c}` line — varying ammo must change NO HUD pixel (ammo shown by base stacks, mc9-1) |
| WAVE readout inert | Delete the `WAVE {w}` readout — varying `state.wave` must change NO HUD pixel |
| high-score present + top band | Draw a high-score readout from `state.highScores[0].score` (BEST), in the top band; longer BEST → more glyphs |
| score centroid invariant | Center the numeric score (no `SCORE` label) — its pixel centroid must NOT shift as digit count grows |
| multiplier bottom band | Move the multiplier to the BOTTOM band (`> 0.6·H`), still drawn from `state.multiplier` |
| glyph pitch reduced | Shrink `gp` below the legacy `round(height/120)` (any reduction passes; exact size = reviewer's call) |
| ROM font byte lock | `glyphRows('0'/'1'/'8'/'X')` unchanged — do not reshape `glyphs.ts` |

**Guards that already pass (keep them green):** multiplier "roughly horizontally centered" (bottom-CENTER), and the 4 font-byte locks.

**Test philosophy — pixels are the reviewer's job.** Every geometric assertion DISCOVERS the layout from recorded marks (centroid, band, inferred glyph pitch); none hard-codes an x/y/gp, so any faithful layout passes. Exact placement/appearance is the owner screenshot at `/missile-command/`.

**⚠ Layout assumption to confirm (flagged for Dev/Reviewer):** "centered numeric score + high score" is read as *the score is horizontally centered*. Only the score-centroid test has teeth here (deliberately gross, ±3% of width). If the cabinet actually places the score elsewhere (e.g. score-left / hi-center), raise it as a **Design Deviation** — do not silently fight the test.

**Retired in `render-hud.test.ts`:** mc9-4's per-base AMMO and WAVE readout tests (they asserted behaviour mc10-3 deletes). The still-valid multiplier value-driven test was kept.

**Verify in the BUILD.** After GREEN, `node scripts/build-app.mjs missile-command` and eyeball `/missile-command/` — the recurring mc9/mc10 miss is green-tests / wrong-pixels.

## Dev Assessment

GREEN. Full mc suite 1220/1220, lint clean, `build-app.mjs missile-command` builds. Implementation is **shell-only**: the HUD block of `plugins/missile-command/src/shell/render.ts` (~render.ts:238-274). `glyphs.ts`, core, and everything else untouched. Commit `feat(mc10-3)`; branch pushed.

**What changed in the HUD block:**
- Deleted the `AMMO {a b c}` and `WAVE {w}` readouts and the top-left `SCORE`/`X{mult}` layout.
- Score → `String(state.score)` (HUD-figure rule, verbatim), **centered** on the top line via a `drawCentered` helper (`x = (width - textWidth)/2`).
- High score → the ladder BEST (`state.highScores.reduce(max)`), centered on the line beneath the score.
- Multiplier → `` `${state.multiplier}X` `` (the `nX` order), **centered** at the bottom (`y = height - lineH - pad`).
- Scale → `gp = max(1, round(height/240))` (was `/120`).

**Real-pixel verification (beyond green vitest).** The Chrome extension wasn't connected, so I rasterized the ACTUAL `drawFrame` output — filtered to the white HUD ink (`fillStyle === '#fff'`) — into an ASCII dump (throwaway test, since removed). It confirmed, glyph-by-glyph: `90210` centered top, `7500` (default BEST) centered beneath, `3X` centered at the bottom; no label letters; smaller scale. So this is not a green-tests/wrong-pixels case — the layout is correct in real render output. The owner should still confirm exact placement/appearance at `/missile-command/` against the cabinet.

**Design decisions (no spec conflict — noted for the Reviewer):**
- **Stacking order:** score on the top line, high score on the line below it. The story says "centered numeric score + high score" without fixing vertical order; both are centered and in the top band. If the cabinet stacks them the other way (HI above), it's a trivial swap.
- **Scale divisor `/240`:** the story says only "fix oversized (`/120`)" without a target; `/240` halves it (glyph ≈ 3.3% of height). Any reduction satisfies the test; the exact authentic size is the reviewer/owner's call.
- **`/240` and the multiplier `y` are display-scale/layout literals in the SHELL** — the un-cited-literal gate scans `src/core` only (citations.test.ts), so no citation is required; noted here for transparency.

**Layout assumption TEA flagged (score is horizontally centered):** implemented as centered. If the cabinet places the score elsewhere, that's a design-deviation conversation, not a bug.

### Dev Assessment — rework round 1 (review findings addressed)

Both blocking findings fixed in commit `fix(mc10-3)` (`1d8d2f50`); suite 1220/1220 green, lint clean, glyphs.ts still unchanged. Both changes behaviour-preserving (the suite passed unchanged).

- **[RULE] render.ts:282** — `hiScore` now reads `state.highScores[0]?.score ?? 0` (verbatim ladder BEST; the ladder is sorted descending) instead of `reduce((best,h)=>Math.max(...))`. Honors the HUD-figure rule; also removes the silent-0 mask on a broken-ladder invariant that the Reviewer flagged. Value is identical under the maintained sort, so all high-score tests stay green.
- **[DOC] render-hud.test.ts:38** — header summary item D reworded: it no longer claims the ammo/wave readouts are "content-driven" (those tests were deleted by mc10-3); it now points to render-hud-layout.test.ts for their inertness.

**Non-blocking findings — deliberately NOT actioned this round** (Reviewer marked them non-blocking / Dev's discretion; keeping the rework minimal):
- Hi-score line centering test (block B): the high score IS centered in code (drawCentered) and verified via the ASCII dump; an extra centering assertion is a nice-to-have, deferred.
- HUD-mock dedup into `tests/support/`: a test-infra refactor touching two files; out of this story's minimal scope. If wanted, worth a small follow-up chore.

**Handoff:** back to Reviewer for re-review of the two fixes.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1220/1220 green, lint clean, glyphs.ts unchanged, core untouched, no smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — compensated: manual boundary review (empty/degenerate inputs) below |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — N/A, drawFrame is a pure paint fn with no error paths |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | confirmed 1 (Low, non-blocking), dismissed 1 (headline REFUTED by reproduction) |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (Low, [DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled — compensated by rule-checker #1-2 (type-safety, generics) + manual |
| 7 | reviewer-security | No | Skipped | disabled | Disabled — N/A, no input/network/secrets; internal GameState only (rule-checker #10 concurs) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled — compensated: manual (see rule-checker #18 mock-dedup note) |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 (both Low): #30 required-fix, #18 optional-note |

**All received:** Yes (4 enabled returned; 5 disabled via settings, each compensated by manual review + mutation)
**Total findings:** 2 confirmed required-fix (both Low), 2 confirmed non-blocking notes, 1 dismissed (refuted with evidence)

### Rule Compliance

Enumerated the changed declarations against the TypeScript lang-review checklist (rule-checker did the exhaustive 31-rule/58-instance pass; I spot-verified the load-bearing ones) and the CLAUDE.md project rules:

- **Core/shell boundary (contract 2):** COMPLIANT — diff touches only `src/shell/render.ts` + `tests/*`; no `src/core` hunk; `purity.test.ts` green.
- **glyphs.ts UNCHANGED:** COMPLIANT — no diff hunk; block F byte-locks 4 sampled glyphs (verified green + mutation-proven: editing a glyph byte reddens the lock).
- **HUD-figure rule (verbatim, never re-derived):** `String(state.score)` render.ts:283 COMPLIANT; `${state.multiplier}X` :287 COMPLIANT; **`hiScore` :282 VIOLATION** — `highScores.reduce(max)` re-derives a value the sorted-descending ladder already exposes as `highScores[0].score` (see finding [RULE-30]).
- **Un-cited-literal gate (src/core only):** COMPLIANT — `height/240` is a shell literal; `citations.test.ts` builds its population from `src/core` only (verified :234-235).
- **No premature src/shared extraction:** COMPLIANT — no new @shared module; render-hud.test.ts block G unaffected.
- **Type safety / null-handling / imports (checklist #1-#5):** COMPLIANT — `as unknown as CanvasRenderingContext2D` is the idiomatic partial-mock cast (matches the pre-existing render-hud.test.ts:140); `??` used correctly for legitimately-0 fields; `.js` extensions and `import type` correct.
- **Test-apparatus rules (#18, #26):** block F/C compare against real imports/output (compliant); **#18 mock duplication** flagged (see [RULE-18], non-blocking).

### Devil's Advocate

Assume this HUD is broken. First attack: `state.highScores` empty or unsorted. If a future refactor let the ladder arrive empty, `reduce(max, 0)` yields 0 — a silent "0" high score — while the "verbatim" `highScores[0].score` would throw/undefined and surface the bug. So the reduce actually MASKS a broken-invariant path with a plausible-looking zero; that is precisely why the HUD-figure rule wants the verbatim read (finding RULE-30). Second: `textWidth('')` — an empty score string. `String(state.score)` is never empty (numbers stringify to at least "0"), and `textWidth` guards length 0 → 0, so `drawCentered` centers a zero-width string harmlessly; no divide-by-zero (width is the canvas width, always > 0 in practice). Third: a huge score (e.g. 8-digit) at a narrow canvas — the centered text could overflow the edges. That is a visual/reviewer concern, not a crash, and the cabinet's real scores are bounded; not a defect. Fourth: could the multiplier `${n}X` collide with the ground fill at the bottom? The multiplier draws in white `#fff` ON TOP of the ground (draw order: ground early, HUD last), so it stays legible; my ASCII dump confirmed "3X" renders as distinct white ink. Fifth: the tests — could a confused future dev "fix" a failing centroid test by loosening the threshold? The threshold `W*0.03` is documented and the mutation evidence (left/right-align both redden it by ~170) gives wide margin, so accidental loosening would be conspicuous. Sixth: does removing the mc9-4 ammo/wave tests hide a regression where ammo/wave silently reappear? No — block A asserts full-frame pixel identity under ammo/wave variation, which reddens if either readout returns. Net: no correctness break found; the real residue is the re-derivation mask (RULE-30) and a stale comment.

## Reviewer Assessment

**Verdict:** APPROVED (round 2) — round 1 was REJECTED; both blocking findings fixed in `1d8d2f50` and re-verified.

**Round-2 re-review:** Focused re-review of the two-fix diff (`466f2143..HEAD`), not a full subagent re-run — the round-1 battery already covered these files and the fixes are minimal + behaviour-preserving. Confirmed: (1) `render.ts:282` now reads `state.highScores[0]?.score ?? 0` — the verbatim ladder BEST, resolving [RULE-30] and removing the silent-0 mask; (2) `render-hud.test.ts:38` header reworded, no longer claiming ammo/wave content-linkage, resolving [DOC]. Re-verified on the current tree: **1220/1220 green, lint clean, glyphs.ts unchanged vs develop, src/core untouched**. No new issues introduced (a one-line verbatim read + a comment). Real-render correctness stands from round 1 (ASCII HUD dump: centered score `90210` / high score `7500` / bottom `3X`).

**Dispatch-tag coverage:** `[TEST]` 1 confirmed (Low) + 1 dismissed · `[DOC]` 1 confirmed (Low) · `[RULE]` 2 confirmed (Low) · `[EDGE]` disabled — compensated (Devil's Advocate boundary sweep: empty/degenerate/huge inputs, no crash) · `[SILENT]` disabled — N/A (pure paint fn, no error paths) · `[TYPE]` disabled — compensated (rule-checker #1-2 clean; idiomatic mock cast) · `[SEC]` disabled — N/A (no input/network/secrets; internal GameState) · `[SIMPLE]` disabled — compensated (rule-checker #18 mock-dedup noted, non-blocking).

Implementation is functionally correct and well-verified (green suite, real-pixel ASCII confirmation, mutation-proven test teeth). No Critical/High issues. Sending back two trivial, confirmed Low fixes rather than shipping them — one is a project-rule violation I am not permitted to dismiss, the other a misleading comment introduced this session.

| Severity | Issue | Location | Fix Required | Status |
|----------|-------|----------|--------------|--------|
| [RULE][LOW] | `hiScore` re-derived the ladder BEST via `reduce(max)` instead of reading it verbatim — violated the HUD-figure rule; also masked a broken-ladder invariant as a silent 0. | `plugins/missile-command/src/shell/render.ts:282` | Read the BEST verbatim: `state.highScores[0]?.score ?? 0`. | ✅ FIXED (`1d8d2f50`) — verified verbatim read; suite green. |
| [DOC][LOW] | File-header summary item D claimed "the ammo and wave readouts are each content-driven" after this story deleted those tests. Misrepresented the file's coverage. | `plugins/missile-command/tests/render-hud.test.ts:38-40` | Reword item D; point AMMO/WAVE inertness to render-hud-layout.test.ts. | ✅ FIXED (`1d8d2f50`) — reworded; verified. |

**Dismissed (with evidence):**
- **[TEST] block C is a false-green (test-analyzer headline)** — REFUTED. I reproduced the exact mutation it described (`drawGlyphs(String(state.score), pad, pad)`, left-aligning the score) on a clean tree AFTER all subagents finished; the centroid test **FAILS** (`expected 170.07 to be less than 28.8`). The subagent's passing result was a concurrent-tree-mutation race (its in-place `render.ts` mutation and my parallel mutation checks collided). Block C correctly catches both left- and right-alignment.

**Confirmed non-blocking (Dev's discretion — not required for this story):**
- **[TEST][LOW] hi-score line centering unverified** (`render-hud-layout.test.ts` block B) — the high-score readout's own horizontal centering has no test (only existence + growth + top-band). Impl IS centered (verified by ASCII dump). Optional: add a centroid-invariance check for the hi-score row.
- **[RULE][LOW] test-mock duplication (#18)** — `HudMark`/`X_ARG`/`Y_ARG`/`hudCtx` are near-verbatim between render-hud.test.ts and render-hud-layout.test.ts; a shared `tests/support/hud-mock.ts` would be the "second consumer" extraction. Judgment call for test infra; not blocking.

**Handoff:** ~~Back to Dev for the two required fixes~~ → **round 2: both fixed and re-verified → APPROVED. To SM for finish-story.**