---
story_id: pm4-11
jira_key: pm4-11
epic: pm4
workflow: tdd
---
# Story pm4-11: Authentic HUD icons (shell)

## Story Details
- **ID:** pm4-11
- **Jira Key:** pm4-11
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** .
- **Branch:** feat/pm4-11-authentic-hud-icons
- **PR:** https://github.com/slabgorb/arcade/pull/246

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-11T15:32:26Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-11T14:56:54+00:00 | 2026-08-11T14:59:38Z | 2m 44s |
| red | 2026-08-11T14:59:38Z | 2026-08-11T15:10:31Z | 10m 53s |
| green | 2026-08-11T15:10:31Z | 2026-08-11T15:15:24Z | 4m 53s |
| review | 2026-08-11T15:15:24Z | 2026-08-11T15:32:26Z | 17m 2s |
| finish | 2026-08-11T15:32:26Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Life/fruit caps CLAMP to the ROM maximum rather than reproducing the ROM's over-cap erase behaviour**
  - Spec source: context-story-pm4-11.md, AC-3 (and AC-4)
  - Spec text: "The number of life icons is capped at the ROM life-icon cap (TEA pins exact value from ROM at RED)."
  - Implementation: RED pins the life row to `min(lives, 5)` and the fruit row to `min(window, 7)`. ROM cap values pinned from `reference/source/pacman.asm`: lives display `2b41`-`2b62` (`ld c,#05`, `cp #06 / jr nc,#2b61`) = 5; fruit display `2bf0`-`2c41` (`ld c,#07`; `>=8` branch `sub #07`) = a 7-wide sliding window ending at the current level.
  - Rationale: the ROM's lives byte is DIP-capped so >5 is unreachable, and its literal >5 path *erases* rather than clamps; a clone whose life config could exceed the arcade DIP is better served by a clamp, so the test pins `lives=8 → 5` and `level=10 → 7` (not `→ 0`).
  - Severity: minor
  - Forward impact: none

## Sm Assessment

Setup complete; the phase pointer read `setup` on arrival and hands off to TEA for RED.

**Premises verified against the current tree (not stale — use as fact):**
- pm4-9's procedural bottom-band text IS live: `plugins/pac-man/src/shell/render.ts` `drawHud()` draws `fillText("LIVES " + lives, 4, BOTTOM)` at line 566 and `fillText("LEVEL " + level, W - 4, BOTTOM)` at line 568. That is exactly what pm4-11 replaces.
- Both reuse targets exist and are exported from the same render module: `drawPacman` at `render.ts:369`, `drawFruit` at `render.ts:413`.
- Fruit sequence ground truth: FRUIT TABLE cited `pacman.asm:2b23-2b31`; the 8 kinds/order already live as `FruitType` in `plugins/pac-man/src/core/level.ts:18-20`. ROM source under `plugins/pac-man/reference/source/`.

**For TEA (RED phase):**
- ACs are DERIVED (epic YAML carried `acceptance_criteria: null`) — verify them, they are not authored ground truth. See context file.
- ACs 3 & 4 name ROM facts the SM did NOT pin: the exact life-icon cap and the fruit-per-level sequence. Pin both at RED from ROM/`reference/source/`, not from the derived AC prose.
- Boundary: SHELL-only story. All edits in `plugins/pac-man/src/shell/`. Do NOT touch `src/core/` — the pac-man purity guard scans core source text.

**Contention (non-blocking):** sibling a-2 holds pm4-10 (game-over→attract timeout) on a zero-commit claim branch. Scope is orthogonal (sim transition vs. bottom HUD `drawHud`), but both could land in `render.ts`; keep the pm4-11 diff tight to `drawHud` + any new sprite-row helper and expect a possible rebase.
## TEA Assessment

**Status:** RED complete — 9 failing tests handed to Dev, 381 passing (pac-man project).

### What the tests pin (ACs)
- **AC1/AC2 (sprite HUD):** `hud-icons.test.ts` proves `drawHud` blits Pac-life sprites bottom-left (via `drawPacman`) and a fruit row bottom-right (via `drawFruit`), and that the old `LIVES n`/`LEVEL n` fillText is gone. Fruit identity is checked by comparing recorded `putImageData` pixel data against a standalone `drawFruit` reference (position-independent), so a wrong fruit fails.
- **AC3 life cap = 5** (`pacman.asm:2b41-2b62`): `lives=3→3`, `lives=5→5`, `lives=8→5`, `lives=0→0`.
- **AC4 fruit sequence + cap 7** (`pacman.asm:2bf0-2c41`, `levelRow().fruit`): `level=1→[cherry]`, `level=3→[cherry,strawberry,orange]`, `level=10→7 icons`, `level=13→7 icons incl. key, excl. cherry` (sliding window drops the oldest).
- **AC5 top band unchanged:** `hud.test.ts` top-band tests (SCORE / HIGH SCORE label+value / real 0) stay green.
- **AC6 no full-screen flash (pm4-1):** guard asserts `drawHud` paints no full-canvas `fillRect`.
- **Bleed guard:** every HUD icon lands in the bottom band (rows 33-35), never the playfield.

### Implementation pointers for Dev (GREEN)
- Edit only `plugins/pac-man/src/shell/render.ts` `drawHud` (shell-only; do NOT touch `src/core/`).
- Lives: loop `i` in `0..min(lives,5)`, `drawPacman(ctx, xPx, yPx, dir, 0)` at bottom-left (x < 112), y in the bottom band. Pick a life-icon dir (arcade reserve icons face left) — tests don't pin dir, only the 16x16 blit + count + region.
- Fruit: window = levels `max(1, level-6)..level`, `drawFruit(ctx, tileX, tileY, levelRow(l).fruit.type)` at bottom-right (x >= 112). `levelRow` is already exported from `core/level` and clamps beyond the table, so no undefined indexing.
- Keep the top band (SCORE, HIGH SCORE) exactly as-is.

### Rule Coverage (typescript.md, 26-check checklist)
- **#8 test quality:** every test carries a meaningful, non-vacuous assertion (self-checked Phase C — no `assert(true)`, no `let _ =`, no always-true guards; the passing guards fail on real regressions).
- **Undefined-safety (#5 Map.get / index):** the fruit-window tests exercise beyond-table levels (10, 13) through `levelRow`, which clamps — steering Dev away from raw-index `undefined`.
- Remaining checks (#1-#7, #9-#26) target implementation code Dev writes in `render.ts`; the Reviewer enforces them against the diff.

### Notes
- One design deviation logged (clamp-to-cap vs ROM's unreachable over-cap erase) — see `### TEA (test design)`.
- Contention: sibling a-2 holds pm4-10 (zero-commit branch, orthogonal scope). Keep the diff tight to `drawHud`; expect a possible `render.ts` rebase.
## Dev Assessment

**Status:** GREEN complete — all pm4-11 tests pass. Suite: 390 pac-man + 463 orchestrator, `npm run lint` clean.

### What changed
- `plugins/pac-man/src/shell/render.ts` `drawHud` only (plus its import of `levelRow` from `core/level`). Shell-only; `src/core/` untouched — purity guard green.
- Bottom band now draws sprites, not text: `Math.min(lives, 5)` left-facing Pac-life icons bottom-left (`drawPacman`), and the last up-to-7 levels' fruits bottom-right (`drawFruit` + `levelRow(l).fruit.type`), newest at the right (tile 27) stepping left — a sliding window.
- Top band (SCORE, HIGH SCORE) byte-for-byte unchanged. No `fillRect` added (no flash).
- Test-only cleanup: removed a now-unused `inBottomBand` helper in `hud.test.ts` that the pm4-9→pm4-11 re-baseline orphaned (lint error TS6133).

### Note for Reviewer (non-blocking, cosmetic)
The fruit row is right-anchored at tile 27 so all 7 icons of a full window sit right of centre (the RED test's bottom-left/right split). Because `drawFruit` centres a 16px sprite on a tile (a −4px offset), the newest fruit's sprite extends ~4px past the 224px canvas right edge (blit x 212 → 228), harmlessly clipped. A clean 7-wide, 2-tile-spaced fruit row cannot fit entirely within x∈[112,208] (7×16px = the full 112px right half, and the centring offset pushes one end out), so this edge clip is inherent to the faithful spacing, not a bug. Tunable later (e.g. 15px spacing) if the epic wants it pixel-perfect; out of scope here.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells; 390→393 tests GREEN, lint clean | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 (2 high, 1 high, 1 low) | confirmed 4, fixed 4 |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 (1 high, 1 med) | confirmed 2, fixed 2 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 (both high) | confirmed 2, fixed 2 |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 8 confirmed, 0 dismissed, 0 deferred — all 8 fixed in review round 1 and mutation-verified.

## Reviewer Assessment

**Verdict: APPROVED.** No Critical/High issues remain. Every subagent finding was confirmed and FIXED within this review round, and each fix was verified by mutation testing (the tests now fail when the behaviour regresses). Final state: pac-man project 393/393, orchestrator 463/463, `npm run lint` clean.

The implementation was correct from GREEN — the ROM caps are right, the sequence is right, and every ROM citation is accurate (independently re-verified against `reference/source/pacman.asm` by me, comment-analyzer, and rule-checker: `ld c,#05` @2b4d, `cp #06`/`jr nc` @2b53/2b55; `ld c,#07` @2bfd, `sub #07` @2c34; fruit table 2b23-2b31; hiscore 36a5). The defects were in the TEST APPARATUS and one robustness asymmetry — exactly the things that ship green.

### Confirmed findings (all FIXED + verified)
- **[TEST] The fruit-cap tests could not detect a missing cap.** Mutation-verified by test-analyzer: deleting the clamp left all 17 tests green, because the `x < 112 / x >= 112` split reclassified uncapped fruit that drifted left as "left icons." **Fix:** classify icons by sprite pixel-data (`fruitTypeOf`), counting every fruit wherever it lands. **Verified:** Mutation A (cap→999) now fails 3 tests.
- **[TEST] Newest-at-right ordering was unpinned.** Reversing the tileX formula left every test green (set-membership `.some(isFruit)` only). **Fix:** `fruitSequence` pins the full left-to-right order with `toEqual`. **Verified:** Mutation B (`15 + 2*k`) now fails 3 tests.
- **[RULE] (#21) `level` was an unbounded, unguarded loop terminator** (`l <= level`), asymmetric with the already-clamped `lives`: Infinity → unbounded loop, NaN → out-of-range table index. **Fix:** count down from the current level bounded to `FRUIT_ROW_CAP` iterations and guard `Number.isFinite(level)`. **Verified:** Mutation C (drop the guard) fails the new non-finite-level test.
- **[TEST] No negative-lives coverage.** **Fix:** added `lives=-1 → 0 icons, no throw`.
- **[DOC] Stale `hud.test.ts` header** described pm4-9's LIVES/LEVEL text, contradicting the re-baselined body. **Fixed.**
- **[DOC] `BOTTOM_BAND_MIN_Y` comment** mislabelled row 33 as the HUD band (true band is rows 34-35, y≥272). **Fixed** in both test files.
- **[RULE] [DOC] (#24) `maze-border.test.ts:60` stale title** ("…for LIVES/LEVEL text") describing the retired model. **Fixed** (mechanism was already correct).

### Rule Compliance (typescript.md, 26 checks)
Rule-checker checked 34 instances across 26 rules; 2 violations (both fixed above). I independently confirm: core/shell boundary satisfied (no `src/core/` edit; purity guard green); `levelRow` clamps its index so `.fruit` is never undefined; import `{ levelRow, type FruitType }` correctly separates value/type; no enums, no `any`, no `??`/`||` nullable pitfalls, no async, no injection surface. Disabled specialists' domains assessed by me for this pure-rendering shell change: **[SEC]** no auth/input/secret/injection surface — clean; **[TYPE]** signature unchanged (primitives + union), no stringly-typed API — clean; **[SIMPLE]** minimal implementation, only a test-only `fruitData` recompute noted (negligible) — clean.

### Devil's Advocate
Could this break? A malicious/confused caller passing a huge `level` (10^9): the loop is now bounded to 7 iterations counting down, `levelRow` clamps, so 7 keys draw — no DoS. `level = Infinity`/`NaN`: guarded to 0 fruit, no throw, no spin (pinned). Negative or NaN `lives`: `Math.min(Math.max(lives,0),5)` → 0..5, `i < NaN` is false → 0 icons, no throw (pinned). The rightmost fruit (tile 27) blits to x=228 vs the 224 canvas — a ~4px clip on the current-level fruit, harmlessly canvas-clipped; Dev disclosed it and it is inherent to a 16px sprite centred at the rightmost tile (a clean 7-wide 2-tile-spaced row cannot fit entirely in x∈[112,208]). Documented, out of scope, LOW — not blocking. Could a life icon be miscounted as a fruit (or vice-versa)? Only if a Pac-life frame's pixels equalled a fruit sprite's — they use distinct sprite indices/colours, and the count tests would have broken under mutation if they collided; they did not. Fruit duplicates (apple×2) sort deterministically by distinct x. No remaining hole found.

### Deviation Audit
- **Life/fruit caps CLAMP to the ROM maximum rather than reproducing the ROM's over-cap erase behaviour** → ✓ ACCEPTED by Reviewer: sound. The ROM's lives byte is DIP-capped so the >5 path is unreachable; `min(lives,5)` / `min(window,7)` is the correct faithful cap for a clone whose config could exceed the arcade DIP. Well-reasoned; forward impact none.