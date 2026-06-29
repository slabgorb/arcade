---
story_id: "10-9"
jira_key: ""
epic: "10"
workflow: "tdd"
---
# Story 10-9: Missing on-screen banners (SUPERZAPPER RECHARGE, RATE YOURSELF/rank, bonus)

## Story Details
- **ID:** 10-9
- **Jira Key:** N/A (Jira not configured)
- **Workflow:** tdd
- **Branch:** feat/10-9-missing-banners (tempest subrepo, gitflow)
- **Points:** 3
- **Priority:** p3

## Technical Approach

This story adds three missing on-screen banners not currently rendered in the shell render layer:

1. **SUPERZAPPER RECHARGE banner**: Display when a superzapper becomes available (s.playerHasSuperzap transitions to true after a kill or on level entry). Position and color from the Messages table in context-epic-10.md.

2. **RATE YOURSELF / RANK ladder**: Replace or supplement the numeric level select at render.ts:540 with an authentic skill-select ladder (NOVICE / EXPERT text banners). This appears when transitioning to the skill/difficulty select screen, using documented positions/colors.

3. **Between-wave bonus banners**: Render the BONUS / TIME / HOLE / APPROACH banners that appear between waves, following the Messages table for positions and colors.

All banners use authentic colors from the ROM source study and are rendered in the shell layer (render.ts). No core/sim changes required.

## Acceptance Criteria
- SUPERZAPPER RECHARGE banner shows at the documented moment with the documented color
- A RATE YOURSELF / rank ladder (NOVICE/EXPERT) is presented
- Between-wave bonus/time banners render where applicable
- Colors/positions follow the Messages table

## Sm Assessment

**Routing decision:** TDD (phased) → handoff to TEA for the RED phase.

**Reasoning:**
- 3-point feature touching render/shell behavior — warrants test-first, not the trivial path.
- Scope is purely presentational (shell `render.ts`); the technical approach states no core/sim changes are required. TEA should pin the three banner behaviors (SUPERZAPPER RECHARGE, RATE YOURSELF/rank ladder, between-wave bonus/time) with failing tests, sourcing authentic positions/colors from the epic-10 Messages table.
- Single repo (tempest), gitflow branch `feat/10-9-missing-banners` already cut off `develop`. No cross-repo coordination.

**Watch-outs for downstream agents:**
- Authentic colors/positions come from the ROM-study Messages table in `context-epic-10.md` — don't invent values.
- Item 2 may *replace or supplement* the existing numeric level select at `render.ts:540`; TEA/Dev should confirm intended behavior before tearing out the current select.
- No blocking PRs; merge gate clear at setup.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** 3-pt presentational feature; three new banners with authentic-color contracts. The shell is canvas-drawn, so tests use the repo's `?raw` source-scan seam (see Design Deviations) — but each test pins a real contract: string present, drawn via the shared glow-text helper, gated on the correct game state, and the authentic Messages-table color family.

**Test Files:**
- `tempest/tests/shell/render.banners.test.ts` — 15 tests over the three banners (SUPERZAPPER RECHARGE, RATE YOURSELF/RANK/NOVICE/EXPERT ladder, BONUS/TIME), plus a classifier self-check and a TS-escape guard.

**Tests Written:** 15 tests covering 4 ACs.
**Status:** RED (13 failing — feature absent; 2 passing are intentional guards, see below). Verified via `testing-runner` (RUN_ID 10-9-tea-red): no compile/import errors; failures are all assertion failures on the missing feature.

**Intentionally-green guards (must STAY green):**
- `color classifier self-check` — validates the test's own color-family helper against render.ts's known palette hexes (#39ff14 green, #ff2f4f red, #1f8fff blue, CLAW_COLOR yellow). Proves a failing banner test is failing on the FEATURE, not a broken helper.
- `TS lang-review #1 no type-safety escapes` — render.ts has no `as any`/`@ts-ignore` today; Dev must not introduce any while adding banners.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| TS #1 type-safety escapes | `introduces no \`as any\` or @ts-ignore alongside the new banners` | passing (guard — render.ts clean today) |
| TS #8 test quality (no vacuous asserts) | classifier self-check + every banner test asserts a classified family / presence | passing/failing as designed |

**Rules checked:** TS lang-review #1 and #8 are the applicable checks for a pure presentational `.ts` change (no enums/async/JSX/null-handling/API-input surface introduced).
**Self-check:** 0 vacuous tests — every test has a meaningful assertion (string presence, helper-wiring boolean, gating-regex match, or color-family equality); no `let _ =`, `assert(true)`, or always-None checks.

**Test contract per banner (what GREEN requires of Dev):**
- SUPERZAPPER RECHARGE → string present · drawn via `drawGlowText`/`glowText` · source near it references `superzapper` · color family **blue** (BLULET).
- RATE YOURSELF / RANK / NOVICE / EXPERT → all four strings present · RATE YOURSELF + NOVICE + EXPERT rendered inside `drawSelect` · RATE YOURSELF family **green**, NOVICE/EXPERT family **red**.
- BONUS / TIME → both present · BONUS drawn via the glow-text helper · source near BONUS references `warp` · BONUS family **green**.
- No `as any` / `@ts-ignore` added.

**Handoff:** To Dev (Julia) for GREEN — implement the three banners in `tempest/src/shell/render.ts` per the contract above; authentic rows are mirrored in the test header and sourced from `docs/tempest-1981-source-findings.md` §4 (Delivery Findings note the branch).

### Red Phase — Rework (response to Reviewer REJECT)

The Reviewer was right: two assertions were vacuous (could never fail). Fixed the **test file only** — `render.ts` is correct and untouched.

**What changed in `tests/shell/render.banners.test.ts`:**
- **[HIGH fix] SUPERZAPPER gate** — replaced `windowAround(... 'SUPERZAPPER RECHARGE').toMatch(/superzapper/i)` (tautological — banner literal contains 'SUPERZAPPER', and it centred on the comment) with a new `guardBefore(banner)` helper that anchors on the actual **draw call** and asserts the real guard code `/\.superzapper\s*===\s*['"]full['"]/`. Removing the gate now fails the test.
- **[HIGH fix] TIME** — was a single comment-satisfiable `toContain('TIME')`. Now gets the same four-way contract as BONUS: `drawnViaGlowHelper`, `guardBefore` ⇒ `.mode === 'warp'`, color ⇒ green, plus AC4 inclusion. (Also discovered the BONUS gate had the same latent comment-satisfiability — "warp dive" in the comment — so BONUS now uses `guardBefore` too.)
- **[LOW fix] RANK** — now asserts red color and is included in the `drawSelect`-body placement loop + AC4 omnibus.
- **[LOW fix] classify() cyan boundary** — pure cyan `#00ffff` (g === b) misclassified as green; tightened the green branch to require **strict** `g > b`, so a green/blue tie falls through to blue. Added a `#00ffff ⇒ blue` self-check case.
- Removed the now-unused `windowAround` helper (would trip `noUnusedLocals`).

**Verification (RUN_ID 10-9-tea-rework):** banner file **14/14 pass**, full suite **638/638**, build clean (tsc + vite). The strengthened gate assertions match guard CODE, not the banner string or comment — they fail if the gate is removed, but pass against the correct implementation.

**Handoff:** To Dev (Julia) for GREEN re-confirm — no implementation change is needed (the existing `render.ts` already satisfies the strengthened tests); Dev verifies green and hands back to the Reviewer.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `tempest/src/shell/render.ts` — three authentic banners + a render-only latch:
  - `drawSelect`: GREEN `RATE YOURSELF` + RED `RANK` header and RED `NOVICE`/`EXPERT` ladder flanking the kept numeric chooser.
  - `render` warp overlay: GREEN `BONUS` / `TIME` between-wave banners (gated on `s.mode === 'warp'`).
  - `render` play overlay: BLUE `SUPERZAPPER RECHARGE` flash, latched on level change (`superzapBannerLevel`/`superzapBannerUntil`, render-only — no core/sim change), shown ~2 s while the zapper is `'full'`.

**Tests:** 15/15 banner tests passing; **639/639** full suite passing (no regressions); `npm run build` clean (tsc --noEmit + vite). Verified via `testing-runner` (RUN_ID 10-9-dev-green).

**Branch:** `feat/10-9-missing-banners` (pushed, tracks `origin/feat/10-9-missing-banners`). No PR created — that is SM's finish step.

**AC coverage:**
- AC1 SUPERZAPPER RECHARGE (blue, on recharge) → ✅ level-entry flash, `#1f8fff`.
- AC2 RATE YOURSELF / rank ladder (NOVICE/EXPERT) → ✅ in `drawSelect`; RATE YOURSELF green, RANK/NOVICE/EXPERT red.
- AC3 between-wave bonus/time banners → ✅ BONUS/TIME on warp, green.
- AC4 colors follow the Messages table → ✅ family-correct hexes (green `#39ff14`, red `#ff2f4f`, blue `#1f8fff`).

**Self-review:** wired into the live `render()` path (no dead code); reuses the shared `drawGlowText` helper and existing palette hexes (matches GAME OVER/HIGH SCORES patterns); no `as any`/`@ts-ignore`; no core/sim edits (hard architectural boundary respected). Banner *pixels* (placement/blink/legibility) are best confirmed by running the game — flagged for the verify/review phase.

**Handoff:** To next phase (verify / review).

### Green Re-confirm (after TEA test rework)

The Reviewer's REJECT was about test quality, not the implementation. TEA strengthened the banner tests; `render.ts` needed **no change**.

**Implementation change:** None — `src/shell/render.ts` is unchanged since `8e9a3a6` (tempest tree clean on `feat/10-9-missing-banners`).
**Verification (RUN_ID 10-9-dev-green-reconfirm):** the existing implementation satisfies all 14 strengthened banner tests — banner file **14/14**, full suite **638/638**, build clean (tsc + vite). The draw-call-anchored gate assertions (`.superzapper === 'full'`, `.mode === 'warp'`) pass against the real gates, confirming the banners are correctly state-gated.
**Handoff:** Back to the Reviewer (The Thought Police) to re-review the strengthened test suite.

## Subagent Results

> **Review history:** Round 1 (this story's first review) **REJECTED** for two vacuous tests (SUPERZAPPER gate + TIME, both `[HIGH]`) plus two `[LOW]` items (RANK color, `classify` cyan bug). TEA reworked the test file (commit `5932525`); Dev re-confirmed green (no `render.ts` change). The table below is **Round 2 (re-review)**. The round-1 findings, fixes, and the FLAGged deviation are preserved in the TEA "Red Phase — Rework" assessment and the `### Reviewer (audit)` deviation stamps.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (638/638 green, build clean, 0 smells; `render.ts` diff empty) | N/A — confirms impl unchanged + green |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 2 (both LOW); all 6 round-1 findings verified RESOLVED via gate-deletion simulation | confirmed 2 (non-blocking), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations (13 lang-review rules, 31 instances); `g > b` fix + `guardBefore` null-guard sound | N/A — confirms type safety + no unused locals |

**All received:** Yes (3 enabled returned; 6 disabled via `workflow.reviewer_subagents`)
**Total findings:** 2 confirmed (both `[LOW]`, non-blocking), 0 dismissed, 0 deferred. Round-1 blocking findings: all RESOLVED.

### Rule Compliance

Rules surface: TS lang-review checklist (`.pennyfarthing/gates/lang-review/typescript.md`, #1–#13) + tempest CLAUDE.md hard core/shell boundary. Re-checked by reviewer-rule-checker (31 instances, round 2) and me:

- **#1 Type-safety escapes** — COMPLIANT. No `as any`/`@ts-ignore`/`!` in the strengthened test helpers or the unchanged render.ts. `[VERIFIED]`
- **#4 Null/undefined** — COMPLIANT. The new `guardBefore` guards `re.exec(src)` with `if (!m) return ''` before `m.index`; `classify`/`bannerColorArg` guard their `exec` results. No `||`-vs-`??` misuse. `[VERIFIED]`
- **#8 Test quality** — COMPLIANT (now fully). The round-1 vacuousness is resolved: gate tests anchor on the draw call via `guardBefore` and match guard CODE (`.superzapper === 'full'`, `.mode === 'warp'`), proven falsifiable by gate-deletion simulation. No `as any`; imports from `src/…?raw`. `[VERIFIED]`
- **#9 noUnusedLocals** — COMPLIANT. `windowAround` removed; all six remaining helpers + `Family` are referenced.
- **#3 Enums / #2,#5–#7,#10–#13** — N/A or COMPLIANT (union type not enum; no new imports/JSX/async/config/user-input/try-catch; meta re-scan clean).
- **Architectural boundary (CLAUDE.md)** — COMPLIANT. `render.ts` unchanged since `8e9a3a6`; the render-only latch never writes to `GameState`. `[VERIFIED]`

### Devil's Advocate

Assume the reworked code is still broken. Where? The strengthening lives entirely in a `?raw` source-scan, so it still cannot catch a single RUNTIME defect: the banners could draw off-screen, at the wrong size, blink at the wrong rate, or collide with other overlays, and every test would stay green — the suite proves the banner string is wired through `drawGlowText` behind the right guard, not that a human sees anything legible. The `guardBefore` helper hard-codes a 400-char look-back; if a future refactor inserts ~300 chars of code between the `s.mode === 'warp'` guard and the `BONUS` draw, the gate assertion silently stops finding the guard and the test false-fails — annoying, though it fails safe (toward red, not green). The `classify` `g > b` fix is correct for pure cyan, but near-ties like `#00ffee` (g=255, b=238) still resolve green by one channel — defensible by dominance, but the "robust within family" contract is fuzzy at the teal boundary and no test pins it. The render behaviors I flagged in round 1 remain unverified by ANY test and were accepted as verify-by-running: the recharge flash won't re-fire on a same-level new-game restart (latch persists across game-over), and BONUS/TIME overlap the AVOID SPIKES warning during `warp.warning > 0` while NOVICE/EXPERT at W*0.17/0.83 could crowd the 64px START LEVEL on a narrow viewport. AC2's ladder is verified by `fnBody` containment rather than a `mode === 'select'` guard — a deliberate, correct choice (the select-mode gate lives in the `drawFrame` dispatcher, not inside `drawSelect`), but one indirection weaker than AC3. None of this is security- or correctness-critical: this is a pure presentational shell with no input, I/O, auth, or core/sim reach. The two remaining findings are LOW and the round-1 holes are genuinely closed (proven by simulated gate deletion). The safety net is now honest about what it covers. Nothing here rises to blocking.

## Reviewer Assessment

**Verdict:** APPROVED

Round 1 was correctly **REJECTED** for two vacuous tests; the rework genuinely fixed them. reviewer-test-analyzer verified **all six round-1 findings RESOLVED** by simulating gate deletion — each strengthened gate assertion now flips pass→fail if its guard (`s.player.superzapper === 'full'`, `s.mode === 'warp'`) is removed from `render.ts`. The implementation is unchanged and was already clean; preflight is green (638/638, build clean) and rule-checker is clean (0/31). Only two **non-blocking `[LOW]`** findings remain — no Critical/High.

| Severity | Issue | Location | Disposition |
|----------|-------|----------|-------------|
| [LOW] `[TEST]` | `toContain('SUPERZAPPER RECHARGE')` is comment-satisfiable and made strictly redundant by the `drawnViaGlowHelper` assertion two lines below it. Not vacuous (fails if the string is wholly absent), just a redundant fast-fail diagnostic. | `tests/shell/render.banners.test.ts:135` | Accept — harmless; optional future cleanup noted in Delivery Findings. |
| [LOW] `[TEST]` | AC2 verifies the RATE YOURSELF/RANK/NOVICE/EXPERT ladder via `fnBody('drawSelect')` containment, not a `guardBefore` mode gate like AC3. | `tests/shell/render.banners.test.ts:165` | Accept — the select-mode gate is enforced by the `drawFrame` dispatcher, NOT inside `drawSelect`, so `fnBody` containment is the correct seam (the analyst confirms this is informational, per project convention). |

**Subagent dispatch tags:** `[TEST]` — 2 LOW non-blocking findings from reviewer-test-analyzer; 6 round-1 findings verified RESOLVED. `[RULE]` — reviewer-rule-checker clean (0 violations / 31 instances; `guardBefore` null-guard + `g > b` fix + no unused locals confirmed). `[EDGE]`, `[SILENT]`, `[DOC]`, `[TYPE]`, `[SEC]`, `[SIMPLE]` — subagents disabled via `workflow.reviewer_subagents`; assessed directly: no boundary/error-handling/security surface (pure presentational shell, `render.ts` unchanged), no silent failures (no try/catch/fallbacks), comments updated with the code (header now documents the draw-call-anchored seam), types sound, change minimal (dead `windowAround` removed).

**Independent observations (≥5):**
- `[VERIFIED]` Round-1 SUPERZAPPER gate vacuousness fixed — `guardBefore` slices `[m.index−400, m.index)` (exclusive of the draw call), so the banner literal can't satisfy the gate regex; `/\.superzapper\s*===\s*['"]full['"]/` matches code at render.ts:1011, not the comment. Falsifiable.
- `[VERIFIED]` TIME now has the full helper/warp-gate/green contract; BONUS gate also hardened to `guardBefore` (its comment "warp dive" no longer satisfies the gate).
- `[VERIFIED]` `classify` cyan fix correct — `#00ffff` ⇒ blue; real banner colors (`#39ff14`/`#ff2f4f`/`#1f8fff`/`#23e8a6`) still classify correctly (rule-checker + analyst confirmed).
- `[VERIFIED]` Implementation untouched — `git diff 8e9a3a6..HEAD -- src/shell/render.ts` empty; full suite 638/638; build clean.
- `[LOW]` Two remaining test items (redundant presence check; AC2 fnBody-vs-gate) — accepted, non-blocking.
- `[LOW]` Render pixels (placement/overlap/blink) and the same-level-restart latch edge remain verify-by-running — flagged for SM finish.

**Data flow traced:** `s.level`/`s.mode`/`s.player.superzapper` (core sim state) → read-only in `render()` → gate the banner draws; no path writes back to `GameState` (boundary safe). **Pattern observed:** banners reuse the shared `drawGlowText` helper + existing palette hexes (render.ts:693,997-998,1014), consistent with GAME OVER/HIGH SCORES. **Error handling:** N/A (pure presentational; no failure surface).

**Handoff:** To SM (Winston Smith) for finish-story. Suggest a quick verify-by-running of the three banners at finish (pixel placement is outside the source-scan seam).

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T18:29:37Z
**Round-Trip Count:** 1
**Branch Strategy:** gitflow (feat/10-9-missing-banners)

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T17:39:46Z | 2026-06-29T17:41:18Z | 1m 32s |
| red | 2026-06-29T17:41:18Z | 2026-06-29T17:50:44Z | 9m 26s |
| green | 2026-06-29T17:50:44Z | 2026-06-29T17:57:08Z | 6m 24s |
| review | 2026-06-29T17:57:08Z | 2026-06-29T18:07:39Z | 10m 31s |
| red | 2026-06-29T18:07:39Z | 2026-06-29T18:15:56Z | 8m 17s |
| green | 2026-06-29T18:15:56Z | 2026-06-29T18:18:04Z | 2m 8s |
| review | 2026-06-29T18:18:04Z | 2026-06-29T18:29:37Z | 11m 33s |
| finish | 2026-06-29T18:29:37Z | - | - |

## Delivery Findings

No upstream findings at setup time.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): The authentic Messages table lives only on the unmerged `chore/tempest-1981-source-findings` branch (`docs/tempest-1981-source-findings.md` §4), not on `develop`. Affects `sprint/context/context-epic-10.md` (it references the table but does not inline it). Dev should read the table via `git show chore/tempest-1981-source-findings:docs/tempest-1981-source-findings.md`; the relevant rows (color/text) are mirrored in the header of `tests/shell/render.banners.test.ts`.
- **Improvement** (non-blocking): `render.ts` has no named BLUE message-color and `GLYPH_HEX` lacks a blue entry, yet two banners (SUPERZAPPER RECHARGE, APPROACH) are BLULET. Affects `tempest/src/shell/render.ts` (Dev may add a blue palette hex, e.g. reuse `#1f8fff`/`#7fc3ff`, for consistency).
- No upstream findings during rework — addressed the Reviewer's test-quality findings in `tests/shell/render.banners.test.ts`; implementation unchanged. *Found by TEA during test design (rework).*

### Dev (implementation)
- **Improvement** (non-blocking): The APPROACH and HOLE banners (also in the Messages table, blue/green) are NOT in this story's ACs and were left for a follow-up. Affects `tempest/src/shell/render.ts` (a future 10-x story can add them to the warp/level-clear sequence alongside BONUS/TIME).
- **Improvement** (non-blocking): Banner colors are inline hex literals (`#39ff14`/`#ff2f4f`/`#1f8fff`) reused from existing draws rather than named message-color constants. Affects `tempest/src/shell/render.ts` (a small `MSG_*` palette or a blue entry in `GLYPH_HEX` would DRY the message colors if more banners land — deferred per minimalist scope).
- No upstream findings during green re-confirm — implementation unchanged; the existing `render.ts` satisfies TEA's strengthened tests. *Found by Dev during implementation (rework re-confirm).*

### Reviewer (code review)
- **Gap** (blocking): The SUPERZAPPER gate test and the TIME presence test are vacuous (can never fail). Affects `tempest/tests/shell/render.banners.test.ts:208,249` (anchor the gate test to `player.superzapper === 'full'`; add `drawnViaGlowHelper`/`warp`-gate/`green`-color checks for TIME). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): RANK color is unasserted and the `classify` helper misclassifies pure cyan `#00ffff` as green. Affects `tempest/tests/shell/render.banners.test.ts` (add RANK color + AC4 entry; tighten classify's green-branch guard and add a `#00ffff`⇒blue self-check). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Banner placement/overlap (BONUS/TIME vs AVOID SPIKES during warp; NOVICE/EXPERT vs the 64px START LEVEL on narrow viewports) should be eyeballed in-game. Affects `tempest/src/shell/render.ts` (a verify-by-running pass at finish). *Found by Reviewer during code review.*

### Reviewer (code review — round 2)
- **Improvement** (non-blocking): `toContain('SUPERZAPPER RECHARGE')` at `render.banners.test.ts:135` is redundant with the stronger `drawnViaGlowHelper` assertion just below it. Affects `tempest/tests/shell/render.banners.test.ts` (optional: drop the redundant line or keep as a fast-fail diagnostic). *Found by Reviewer during code review.*
- **Verify-by-running** (non-blocking): The three banners' pixel placement/legibility/blink are outside the `?raw` source-scan seam. Affects `tempest/src/shell/render.ts` (eyeball SUPERZAPPER RECHARGE, the RATE YOURSELF ladder, and BONUS/TIME in-game at finish). *Found by Reviewer during code review.*

## Design Deviations

No deviations from spec at setup time.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Source-text (`?raw`) wiring tests, not behavioral canvas tests**
  - Spec source: context-story-10-9.md, AC-1/2/3 ("banner shows at the documented moment")
  - Spec text: "SUPERZAPPER RECHARGE banner shows at the documented moment with the documented color"
  - Implementation: `render.ts` draws to a live canvas and there is no canvas in the node test env, so tests scan the render source via Vite's `?raw` — asserting the banner string, its glow-text helper call, the state-gate it sits behind, and its color family — rather than driving `render()` and observing pixels. This matches the established repo convention (`render.enemy-scale.test.ts`, the 6-8 glyph scans; CLAUDE.md: "the shell is verified by running the game").
  - Rationale: it is the only stable seam for the canvas-drawn shell; behavioral rendering is verified by playing the game during review.
  - Severity: minor
  - Forward impact: Dev must wire banners through the shared `drawGlowText`/`glowText` helper (not ad-hoc `ctx.fillText`) for the wiring assertions to pass.
- **Color asserted by FAMILY, not exact ROM hex; ROM Y-coordinates not pinned**
  - Spec source: context-story-10-9.md, AC-4 ("Colors/positions follow the Messages table")
  - Spec text: "Colors/positions follow the Messages table"
  - Implementation: tests classify each banner's color into the table's family (RED / GREEN / BLUE/BLULET) by channel dominance — tolerating any valid hue within the family — and do NOT assert the ROM's vector-generator Y values ($A0, $5A, -70…), which live in a different coordinate space than our screen-fraction (`H * fraction`) layout. Centered placement is guaranteed implicitly by `drawGlowText` (which sets `textAlign='center'`).
  - Rationale: pinning exact hex/ROM-Y would couple to one implementation and to an incompatible coordinate system; the authentic CONTRACT is the color family + readable centered placement.
  - Severity: minor
  - Forward impact: exact Y placement and the bonus-summary layout are a Dev/Reviewer visual-polish call, verified by running the game.
- **SUPERZAPPER RECHARGE gated on `superzapper === 'full'`; bonus banners gated on `warp` transition**
  - Spec source: context-story-10-9.md, AC-1/AC-3 + SM note ("on zap availability … after a kill or on level entry"; "between-wave bonus/time")
  - Spec text: "SUPERZAPPER RECHARGE banner shows at the documented moment"; "Between-wave bonus/time banners render where applicable"
  - Implementation: the RECHARGE test only requires the banner's draw to reference the `superzapper` state (our model's recharge signal is `player.superzapper` returning to `'full'` at level start); the BONUS test only requires the draw to reference the `warp` (level-clear) transition — neither pins an exact frame/duration.
  - Rationale: our deterministic core has no explicit "recharge event" or "end-wave summary screen"; `superzapper==='full'` and `mode==='warp'` are the faithful equivalents, and exact display duration is a Dev presentation choice.
  - Severity: minor
  - Forward impact: Dev chooses the display window/duration; if a dedicated recharge event or bonus-summary state is added to core later, the gate references can tighten.
- **SUPERSEDES the proximity-gate test strategy (review rework)**
  - Spec source: Reviewer Assessment [HIGH] findings at `render.banners.test.ts:208,249` + this session's `### Reviewer (audit)` FLAG
  - Spec text: "the RECHARGE test only requires the banner's draw to reference the `superzapper` state" (the now-removed proximity approach)
  - Implementation: gate tests now anchor on the draw call (`guardBefore`) and match the real guard CODE (`.superzapper === 'full'`, `.mode === 'warp'`), not a proximity window a substring of the banner/comment could satisfy. The earlier `windowAround`-based deviation is withdrawn.
  - Rationale: a proximity-to-banner-substring check is tautological; the Reviewer correctly flagged it. The CODE-anchored assertion is the meaningful version of the same intent.
  - Severity: minor
  - Forward impact: none — strictly strengthens coverage; implementation unchanged.

### Dev (implementation)
- **RATE YOURSELF ladder SUPPLEMENTS the numeric level select (does not replace it)**
  - Spec source: context-story-10-9.md, AC-2 + SM watch-out ("replace or supplement the numeric level select at render.ts:540")
  - Spec text: "A RATE YOURSELF / rank ladder (NOVICE/EXPERT) is presented"
  - Implementation: `drawSelect` now leads with a GREEN `RATE YOURSELF` + RED `RANK` header and flanks the existing `START LEVEL NN` chooser with RED `NOVICE` / `EXPERT` rank labels — the numeric chooser is KEPT, not torn out.
  - Rationale: the numeric chooser is the working input mechanism (spinner/arrows drive `select.selectedLevel`); replacing it would mean re-engineering select input, which is out of scope for a presentational banner story. SM flagged this as a confirm-before-removing call.
  - Severity: minor
  - Forward impact: a future story could bind the NOVICE→EXPERT ladder to actual difficulty tiers; today they are authentic framing around the existing 1–16 chooser.
- **BONUS / TIME render as banner LABELS, without computed numeric tallies**
  - Spec source: context-story-10-9.md, AC-3 ("Between-wave bonus/time banners render where applicable")
  - Spec text: "Between-wave bonus/time banners render where applicable"
  - Implementation: during the `warp` (level-clear) dive, the GREEN `BONUS` and `TIME` banners flash; no bonus-point or time-remaining VALUE is computed or shown.
  - Rationale: the core sim emits no end-wave bonus/time figures, and the AC asks for the banners specifically; computing an authentic bonus tally would need new core state (out of scope, no-core-changes constraint).
  - Severity: minor
  - Forward impact: a follow-up can add a `bonus`/`time` figure to core and render it beside these labels.
- **SUPERZAPPER RECHARGE flashes for ~2 s on level entry via a render-only latch**
  - Spec source: context-story-10-9.md, AC-1 + SM note ("on zap availability … after a kill or on level entry")
  - Spec text: "SUPERZAPPER RECHARGE banner shows at the documented moment with the documented color"
  - Implementation: two render-only module vars (`superzapBannerLevel`, `superzapBannerUntil`) latch a ~2 s blinking BLUE flash when `s.level` changes while playing and the zapper is `'full'`. No new core/sim field.
  - Rationale: our once-per-level model rearms the zapper only at level start, so "level entry" is the faithful recharge moment; a transient flash (vs a persistent label) reads as the ROM's recharge notice and keeps the play field clean. Kept in render to honor the no-core-changes constraint.
  - Severity: minor
  - Forward impact: if core later emits an explicit recharge event (e.g. mid-level), the draw can key off that event instead of the level-change latch.

### Reviewer (audit)
- **TEA — Source-text (`?raw`) wiring tests, not behavioral canvas tests** → ✓ ACCEPTED by Reviewer: correct seam for the canvas-drawn shell; matches the established `render.enemy-scale` / 6-8 glyph convention and CLAUDE.md ("shell is verified by running the game"). Behavioral pixels deferred to verify-by-running.
- **TEA — Color asserted by FAMILY, not exact ROM hex; ROM Y not pinned** → ✓ ACCEPTED by Reviewer: family-by-channel-dominance is the right anti-brittleness call, and ROM vector-generator Y is a genuinely different coordinate space than our `H*fraction` layout. (Caveat: the `classify` helper has a cyan-boundary bug — see [LOW] finding — but the *approach* is sound.)
- **TEA — SUPERZAPPER gated on `superzapper === 'full'`; bonus gated on `warp`** → ✗ FLAGGED by Reviewer: the *implementation* gating is correct and faithful, but the *test strategy this deviation describes* — "the RECHARGE test only requires the banner's draw to reference the `superzapper` state" via a proximity window — is what produced the tautological test (the banner string contains 'SUPERZAPPER', so `/superzapper/i` can never fail). Proximity-to-a-substring-of-the-banner is not a gate assertion. See [HIGH] finding at `render.banners.test.ts:208`. Fix in rework: anchor the gate test to `player.superzapper === 'full'`, not a substring of the banner. (Same shape afflicts the TIME presence test.)
- **Dev — RATE YOURSELF ladder SUPPLEMENTS the numeric select (not replaces)** → ✓ ACCEPTED by Reviewer: within AC-2 ("a ladder is presented"); SM explicitly flagged confirm-before-removing, and re-engineering select input is out of scope for a presentational story.
- **Dev — BONUS / TIME render as LABELS without numeric tallies** → ✓ ACCEPTED by Reviewer: AC-3 asks for the banners; the core emits no bonus/time figures and adding them would violate the no-core-changes constraint. Follow-up captured in Delivery Findings.
- **Dev — SUPERZAPPER RECHARGE flashes ~2 s on level entry via render-only latch** → ✓ ACCEPTED by Reviewer: faithful recharge moment for our once-per-level model; latch is render-only (boundary verified). Noted minor edge — no re-flash on same-level new-game restart — is cosmetic and acceptable; documented by Dev.
- **TEA — SUPERSEDES the proximity-gate test strategy (review rework)** → ✓ ACCEPTED by Reviewer (Round 2): this withdraws the round-1 proximity approach the Reviewer FLAGGED and replaces it with the CODE-anchored `guardBefore` assertions. Verified non-vacuous by gate-deletion simulation. **The round-1 FLAG on the original "SUPERZAPPER gated on `superzapper === 'full'`" deviation is hereby CLEARED** — the test strategy it described has been corrected; the implementation gating it described was always sound.