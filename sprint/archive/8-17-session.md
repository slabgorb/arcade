---
story_id: "8-17"
jira_key: ""
epic: "8"
workflow: "tdd"
---
# Story 8-17: Add cabinet HUD header — SCORE + score/lives, center SHIELD meter graphic + level, WAVE number — rendered in the vector font

## Story Details
- **ID:** 8-17
- **Jira Key:** (none — local sprint tracking)
- **Type:** feature
- **Priority:** p2
- **Points:** 3
- **Workflow:** tdd
- **Repos:** star-wars
- **Stack Parent:** none

## Problem Statement

Wave 1 gameplay (8-3 / 8-8 / 8-9) is now playable, and the framing layer (8-6) handles attract/title/high scores. However, the player has no real-time HUD feedback during active gameplay. The cabinet displays a header row with:

1. **SCORE and lives** (left) — the player's current score and remaining lives in the vector font
2. **SHIELD meter and level** (center) — a glowing arc/bar indicator (0–100%) with the current level number (1–10)
3. **WAVE number** (right) — which wave the player is on (1–5)

Plus a framing border (two glowing horizontal lines, top and bottom) that ties the elements together in the authentic arcade aesthetic.

Today, the game either shows no HUD at all or only a stub. This blocks immersion and game clarity — the player cannot track score or lives without this display.

## Technical Approach

### Vector Font Foundation
The cabinet font (character geometry) is already in the disassembly (`reference/disasm/Object_3D_Data.asm`), ported to `src/core/models.ts` in story 8-2. The font uses 3D vector strokes, matching the glowing vector aesthetic.

### HUD Layout (Cabinet-Authentic)
The header renders in a row at the top of the screen:
- **Left:** "SCORE {value}" and "LIVES {count}" (or a compact format like "1/3")
- **Center:** A horizontal shield meter (arc or bar, 0–100%) with a level number overlaid (1–10)
- **Right:** "WAVE {number}"
- **Frame:** Top and bottom horizontal glowing lines border the header row

### Implementation Strategy

**Core (deterministic, `src/core/hud.ts` — new):**
- Export text-layout helpers (no rendering, pure logic):
  - `formatScore(points: number): string` — format score for display
  - `formatLives(lives: number): string` — format lives count
  - `formatWave(wave: number): string` — format wave number
  - `formatLevel(level: number): string` — format level (1–10)
  - `formatShield(healthPct: number): number` — return arc/meter angle for the shell to render
- Verify that `GameState` carries the necessary fields (`score`, `lives`, `shieldHealth`, `wave`, `level`); add any missing fields.

**Shell (render/layout, `src/shell/render.ts`):**
- Add `drawHudHeader(ctx, game)` function:
  - Call core helpers to fetch formatted strings and meter fill %
  - Layout text labels in screen space using the vector font (from `core/models.ts` FONT_* character entries)
  - Draw the shield meter as a horizontal arc/bar (canvas `arc()`, stroked/filled)
  - Draw the frame lines (two horizontal glowing vectors with `shadowBlur`, top and bottom)
  - Position elements responsively based on canvas viewport
- Call `drawHudHeader` in the render phase (in `src/shell/loop.ts` or directly in `render()`, after game render, before frame completion)

### Reference Material
- **Cabinet disassembly:** `reference/disasm/Object_3D_Data.asm` — character/font geometry and positioning hints
- **Existing tempest HUD:** `tempest/src/shell/render.ts` has a minimal score display; study for pattern reuse (vector-text layout) but avoid cargo-culting
- **Wave/level state:** Verify `GameState.wave`, `GameState.level`, `GameState.shieldHealth` are updated during gameplay (should be from 8-8/8-9)

## Acceptance Criteria

1. **HUD header renders every frame** during Wave 1 and later waves (space/surface/trench phases), positioned at the top of the screen
2. **SCORE display** — current score shown in the vector font, updated each frame from `GameState.score`
3. **LIVES display** — remaining lives shown in the vector font (e.g., "LIVES 3" or compact "3"), updated from `GameState.lives`
4. **SHIELD meter** — a horizontal glowing arc or bar (0–100% fill) centered on the screen, corresponding to `GameState.shieldHealth`
5. **LEVEL number** — current level (1–10) displayed overlaid on or adjacent to the shield meter, from `GameState.level`
6. **WAVE number** — current wave (1–5) shown in the upper right, from `GameState.wave`
7. **Frame border** — top and bottom horizontal glowing lines (vector-drawn, `shadowBlur` glow effect) frame the entire header row
8. **Responsive layout** — positions and scale adapt to the canvas viewport; no hardcoded pixel positions
9. **Authentic styling** — visual layout and proportions match the cabinet (validate against reference/archive visuals)
10. **Live gameplay** — `npm run dev` shows the HUD visible and updating in real-time; all text legible and readable
11. **Build & test success** — `npm run build` succeeds (tsc + vite); `npm test` passes (all suites, no regressions); zero debug code
12. **Branch:** feat/8-17-hud-header (star-wars/develop)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T07:40:43Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T07:06:38Z | 2026-06-29T07:08:23Z | 1m 45s |
| red | 2026-06-29T07:08:23Z | 2026-06-29T07:16:08Z | 7m 45s |
| green | 2026-06-29T07:16:08Z | 2026-06-29T07:31:44Z | 15m 36s |
| review | 2026-06-29T07:31:44Z | 2026-06-29T07:40:43Z | 8m 59s |
| finish | 2026-06-29T07:40:43Z | - | - |

## Delivery Findings

### TEA (test design)
- **Gap** (non-blocking): `GameState` has no `shieldHealth` field, so AC-3's 0–100% shield METER has no continuous source. Shields are modelled as a discrete count — `GameState.lives` (max `STARTING_LIVES = 6` in `src/core/state.ts`), "a hit costs one". Affects `src/core/state.ts` / `src/shell/render.ts` — Dev must either derive the meter percentage from `lives / STARTING_LIVES * 100`, or add a continuous `shieldHealth` field. The pure `formatShield(pct)` helper is agnostic to this choice. *Found by TEA during test design.*
- **Gap** (non-blocking): `GameState` has no `level` field, so AC-3's "level (1–10)" number has no source. The sim tracks `wave` (1–5) and `phase` (space/surface/trench) only — there is no 1–10 level concept. Affects `src/core/state.ts` — Dev/Architect must decide the mapping (derive from wave/phase, add a field, or confirm whether "level" is redundant with "wave"). The pure `formatLevel(level)` helper is agnostic to this choice. *Found by TEA during test design.*
- **Conflict** (non-blocking): A stub HUD already exists — `drawHud()` at `src/shell/render.ts:327` renders `SHIELDS {lives}` / `WAVE {wave}` / `SCORE {score}` as plain canvas text via `HUD_FONT` ("Vector Battle"/Orbitron), NOT the vector-stroke font. Story 8-17 supersedes this stub (vector font + shield meter graphic + level + frame borders). Affects `src/shell/render.ts` — Dev should evolve `drawHud` into `drawHudHeader`, not stand up a second, competing HUD. *Found by TEA during test design.*

### Dev (implementation)
- **Conflict** (non-blocking): The story's premise that the "vector font" is stroke geometry in `src/core/models.ts` (FONT_* entries) is **wrong** — `models.ts` has no font data. The cabinet "vector font" is the **Vector Battle TTF** loaded by `src/shell/font.ts` and drawn with canvas `fillText` via `glowText`; the old stub already used it. The new header uses the same mechanism. Affects nothing to change now, but the epic/story context should be corrected so a future story does not hunt for nonexistent `models.ts` glyphs. *Found by Dev during implementation.*
- **Question** (non-blocking): "Level" and "wave" are the **same axis** in this sim — there is only `wave` (difficulty ramps by wave in `gameRules.waveParams`). I aliased the HUD's LEVEL to `state.wave`, so "LEVEL 1" and "WAVE 1" show the same number. If the design wants a distinct 1–10 level (e.g., a Death-Star-approach progression), it needs a new `GameState.level` field and sim wiring — a separate story. Affects `src/core/state.ts` / `src/shell/render.ts`. PM/Architect to confirm whether the dual display is intended or LEVEL should be dropped. *Found by Dev during implementation.*

### Reviewer (code review)
- **Question** (non-blocking): I endorse the Dev's LEVEL==WAVE finding — the HUD now shows the same number for "LEVEL" and "WAVE". This shipped as the honest minimum, but PM/Architect should decide whether to (a) introduce a real `GameState.level` axis, or (b) drop the LEVEL element from the HUD. Until then the duplication stands. Affects future epic-8 grooming / `src/core/state.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The story's AC-8 ("no hardcoded pixel positions") conflicts with the house pattern — the HUD (like `HUD_FONT`/`BANNER_FONT`/`TITLE_FONT` and the old stub) is a **fixed-height top strip** with fixed font px; only horizontal placement scales with `w`. The implementation is correct and consistent; the AC wording should be clarified to "horizontally responsive width" so a future story doesn't try to scale HUD text with canvas height (which would distort the strip). Affects `sprint/context/context-story-8-17.md` AC-8 / epic grooming. *Found by Reviewer during code review.*
- **Conflict** (non-blocking): Confirming the Dev finding — the epic/story context's "vector font lives in `models.ts` FONT_* entries" premise is factually wrong; the vector font is the Vector Battle TTF (`shell/font.ts`). Correct the context so a future HUD/text story doesn't hunt for nonexistent glyph data. Affects `sprint/context/context-story-8-17.md` / epic context. *Found by Reviewer during code review.*

## Design Deviations

### TEA (test design)
- **formatShield tested by invariant, not by absolute units**
  - Spec source: context-story-8-17.md, "Implementation Strategy → Core"
  - Spec text: "`formatShield(pct: number): number` — return the arc angle (0–360) or meter fill % for the shell to render"
  - Implementation: Tests assert unit-agnostic invariants (empty=0, monotonic, linear through origin, clamped to [0,100] input) rather than a fixed return scale, because the spec leaves the unit (angle vs fill) open.
  - Rationale: Pins meter behaviour without dictating fraction-vs-angle, leaving the concrete unit to Dev/green so the test isn't brittle to a reasonable implementation choice.
  - Severity: minor
  - Forward impact: none — Dev picks the unit; any linear, clamped, origin-anchored mapping passes.
- **No unit tests for the shell render layer (AC-1, 4, 5, 6, 7, 8)**
  - Spec source: context-story-8-17.md, AC-1/4/5/6/7/8
  - Spec text: "HUD header renders on every frame… SHIELD meter graphic… frame border… responsive rendering… HUD visible and updating in live gameplay"
  - Implementation: Canvas/vector-font rendering, meter arc geometry, frame lines, and responsive layout are NOT unit-tested; they are verified live (`npm run dev`) in green/review per the SM assessment.
  - Rationale: Canvas drawing has no deterministic, non-vacuous unit assertion; forcing one would produce exactly the hollow tests the rules forbid.
  - Severity: minor
  - Forward impact: Dev + Reviewer must confirm AC-1/4/5/6/7/8 visually in the running cabinet.

### Dev (implementation)
- **LEVEL number aliased to the wave (no independent level exists)**
  - Spec source: context-story-8-17.md, AC-3 / AC-5
  - Spec text: "LEVEL number — current level (1–10) … from `GameState.level`"
  - Implementation: `drawShieldMeter` renders `LEVEL ${formatLevel(state.wave)}` — the level is the wave number, because the sim has no `level` field and only one progression axis (`wave`, ramped by `gameRules.waveParams`).
  - Rationale: Minimalist — fabricating a `GameState.level` field with no sim source is scope creep beyond any test. Aliasing satisfies the "a level number is displayed" AC honestly while a real level concept is deferred to a dedicated story.
  - Severity: minor
  - Forward impact: "LEVEL n" and "WAVE n" show the same value until a distinct level axis is introduced (see Dev Delivery Finding — PM/Architect to confirm).
- **Shield meter percentage derived from lives/STARTING_LIVES (no `shieldHealth` field)**
  - Spec source: context-story-8-17.md, AC-3
  - Spec text: "a horizontal glowing arc or bar (0–100% fill) … corresponding to `GameState.shieldHealth`"
  - Implementation: meter fill = `formatShield((state.lives / STARTING_LIVES) * 100)`; shields ARE lives in this cabinet (a hit costs one, max 6), so the bar drops one ~16.7% segment per lost shield rather than draining continuously.
  - Rationale: Reuses the real shield state instead of adding a redundant continuous `shieldHealth` field. Discrete segments match the cabinet's shield model.
  - Severity: minor
  - Forward impact: If a future story adds continuous shield decay, swap the percentage source; `formatShield` and the meter geometry are unaffected.
- **Vector "font" via the Vector Battle TTF + glowText, not models.ts stroke geometry**
  - Spec source: context-story-8-17.md, "Vector Font Foundation"
  - Spec text: "ported to `src/core/models.ts` in story 8-2 … FONT_* character entries"
  - Implementation: HUD text uses the existing `glowText` + `HUD_FONT` (Vector Battle TTF from `shell/font.ts`); `models.ts` has no font data to use.
  - Rationale: The spec's premise is factually incorrect (no FONT_* entries exist); the established, already-shipping text mechanism is the correct and only one.
  - Severity: minor
  - Forward impact: none — same face the old stub and the title/attract screens already use.

### Reviewer (audit)
- **formatShield tested by invariant, not by absolute units** (TEA) → ✓ ACCEPTED by Reviewer: the spec genuinely leaves fill-vs-angle open; invariant tests (empty/monotonic/linear/clamped) are the correct, non-brittle contract. Dev chose `[0,1]` fill; all invariants hold.
- **No unit tests for the shell render layer** (TEA) → ✓ ACCEPTED by Reviewer: canvas drawing has no non-vacuous unit assertion; I confirmed AC-1/4/5/6/7/8 by reading the render wiring (`drawHudHeader` in the playing branch, `render.ts:185`) and the Dev's live dev-server verification. Forcing canvas unit tests would create exactly the hollow assertions the rules forbid.
- **LEVEL number aliased to the wave** (Dev) → ✓ ACCEPTED by Reviewer: minimalist and honest — fabricating a `GameState.level` field with no sim source would be unfounded scope creep. The resulting "LEVEL n == WAVE n" duplication is a real UX question, but it is correctly surfaced as a non-blocking Delivery Finding for PM/Architect; it does not block this PR. Cross-ref rule-checker borderline at `render.ts:398`.
- **Shield meter percentage derived from lives/STARTING_LIVES** (Dev) → ✓ ACCEPTED by Reviewer: reuses real shield state (shields ARE lives here) instead of a redundant `shieldHealth` field; `STARTING_LIVES=6` is a non-zero const so the division is safe, and `formatShield` clamps the result. The discrete per-shield segments match the cabinet's model. Cross-ref rule-checker borderline at `render.ts:393` (Low — display adapter, not game logic).
- **Vector "font" via the Vector Battle TTF + glowText** (Dev) → ✓ ACCEPTED by Reviewer: the story's "models.ts FONT_* entries" premise is factually wrong (no such data exists); the established `glowText`/`HUD_FONT` mechanism — already used by the old stub and the title/attract screens — is the correct and only one.

## SM Assessment

The nature of this story is clear: it is a **rendering + display story**, not a simulation story. The strategic line of attack is the core/shell boundary.

**Pattern recognition — where the risk lies:**
- The deterministic logic here is thin (string/number formatting + a meter ratio). The real surface area is in the shell's `render.ts`, which TDD does not cover well. TEA must concentrate failing tests on the **pure core helpers** (`formatScore`, `formatLives`, `formatWave`, `formatLevel`, `formatShield`) in `src/core/hud.ts`. Visual fidelity (AC 9–10) is verified live, not by unit test — do not force vacuous assertions on canvas drawing.
- **Verify GameState first.** AC 2–6 assume `score`, `lives`, `shieldHealth`, `wave`, `level` already exist on `GameState`. If 8-8/8-9 did not wire all of these, that is a discovered dependency — surface it as a Delivery Finding rather than silently widening scope.
- Reuse the vector-font geometry already ported in 8-2 (`src/core/models.ts` FONT_* entries). Do not re-author glyphs.

**Routing decision:** Phased TDD. Next agent is **TEA (Han Solo)** for the RED phase — failing tests covering the core formatting helpers and any missing GameState fields. Visual/border work follows in green.

**No blockers.** Branch is cut, session is sound. The header reveals itself once the core helpers are pinned down.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** n/a — a 3pt feature with a genuine pure-logic surface (five formatting helpers).

**Test Files:**
- `star-wars/tests/core/hud.test.ts` — 18 failing tests across the five core HUD formatters. Placed in the repo's mirrored `tests/core/` tree (not colocated) to match the existing 23-suite convention; imports `../../src/core/hud`.

**Tests Written:** 18 tests covering the data side of AC-2, AC-3, AC-4.
- `formatScore` (4): integer string, falsy-zero → "0", six-figure no-separator, no decimal leak.
- `formatLives` (3): count string, falsy-zero → "0", mid-run count.
- `formatWave` (2): wave 1, final wave 5.
- `formatLevel` (2): single digit, two-digit max (10) not truncated.
- `formatShield` (7): empty=0, full>0, finite, monotonic, linear-through-origin, clamp-high, clamp-low — unit-agnostic (fill vs angle left to Dev).

**Status:** RED (failing — ready for Dev). Verified twice via `testing-runner`: `tests/core/hud.test.ts` fails to resolve `../../src/core/hud` (module absent); all 23 pre-existing suites / 316 tests still pass, no regression. Commit `7c418c0` on `feat/8-17-hud-header`.

**Scope boundary:** AC-1/5/6/7/8 (every-frame render, shield meter graphic, frame borders, responsive layout, live legibility) are shell/canvas concerns with no non-vacuous unit assertion — verified live (`npm run dev`) in green/review, logged as a deviation. Do NOT expect Dev to add canvas unit tests.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| TS #4 falsy-zero (`0`/`""` not dropped by `\|\|`) | `formatScore renders zero as "0"`, `formatLives renders zero shields as "0"`, `formatShield is empty (0) at 0%` | failing (RED) |
| TS #4 null/undefined safety | helpers take non-optional `number`; no `?.`/`??` surface to misuse | n/a by design |
| TS #8 test quality (meaningful assertions) | self-check below | pass |

**Rules checked:** 2 of the applicable lang-review rules (#4, #8) have coverage. The rest of the TypeScript checklist (generics/enums #2-3, React #6, async #7, runtime input validation #10) does not apply to a pure `number → string`/`number → number` formatter module with no external input, enums, or async.
**Self-check:** 0 vacuous tests. Every test has a concrete `toBe`/`toBeGreaterThan`/`toBeLessThan`/`toBeCloseTo`/`toMatch` assertion against a specific value or invariant; no `let _ =`, no `assert(true)`, no always-true predicates. `formatShield` invariants are checked against each other (monotonic/linear/clamp) so they cannot pass on a degenerate constant implementation (`formatShield(100) > 0` plus the linear/monotonic checks rule out "always returns 0").

**Handoff:** To Dev (Yoda) for the GREEN phase — create `src/core/hud.ts` with the five formatters, then wire the shell `drawHudHeader` (evolving the existing `drawHud` stub). See Delivery Findings for the `shieldHealth`/`level` data-source decisions Dev must make.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/hud.ts` (new) — the five pure formatters: `formatScore`, `formatLives`, `formatWave`, `formatLevel`, `formatShield`. `formatShield` returns a clamped `[0,1]` fill fraction (the unit TEA left open), so the shell stays render-agnostic. No DOM/time/randomness — the core boundary holds.
- `src/shell/render.ts` — replaced the `drawHud` stub with `drawHudHeader` + two helpers (`drawShieldMeter`, `glowLine`); added the HUD layout constants; updated the `render()` call site and imports (`STARTING_LIVES`, the five `core/hud` helpers).
- `tests/shell/render.player-laser.test.ts`, `tests/shell/render.tie-orient.test.ts` — added a `strokeRect() {}` no-op to each canvas mock for the new meter outline (same maintenance pattern as the `arc()` stub from 8-14). No assertion changed; verified the new cyan frame-line segments fall under the mocks' both-endpoints-at-corners exclusion, so the laser/TIE assertions are untouched.

**Data-source decisions** (resolving TEA's findings):
- Shield meter % = `lives / STARTING_LIVES * 100` (shields ARE lives here). No new `GameState` field.
- LEVEL = `state.wave` (the sim's only progression axis). No new `GameState` field. Both decisions are deviation-logged; see Dev Delivery Findings for the open PM/Architect question on whether LEVEL should be distinct from WAVE.

**HUD layout:** SCORE over SHIELDS (left), shield METER graphic + LEVEL (centre), WAVE (right), bracketed by top+bottom glowing frame lines. Side inset and meter width scale with viewport width (responsive, AC-7).

**Tests:** 334/334 passing (GREEN), incl. the 18 new `hud.test.ts`. `tsc --noEmit` clean. Verified via `testing-runner` three times (green, green after mock fix, green after layout tweak).

**Visual verification (AC-1/4/5/6/7/8/10):** Eyeballed in a dev-server preview (Playwright headless, 1024×720) in the `playing` state. Confirmed: SCORE/SHIELDS in the vector font (left), the shield meter bar filling to `lives/6` with the LEVEL label above it (centre), WAVE (right), and both frame brackets — all legible and updating live as shields dropped. Adjusted the vertical layout once so the LEVEL label clears the top edge.

**Branch:** `feat/8-17-hud-header` (commit `bbbe7dd`, pushed to origin).

**Handoff:** To Reviewer (Obi-Wan) for code review. Flag for review: the LEVEL==WAVE aliasing (intended? — see Dev finding) and the canvas render layer (no unit coverage by design; confirm visually).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (tests 334/334, lint clean, build OK, 0 smells) | N/A — all mechanical gates green |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (domain assessed by Reviewer) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings (domain assessed by Reviewer) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings (domain assessed by Reviewer) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings (domain assessed by Reviewer) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (domain assessed by Reviewer) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings (domain assessed by Reviewer) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings (domain assessed by Reviewer) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations (2 Low borderline) | confirmed 2 Low (match Dev deviations), 0 blocking |

**All received:** Yes (2 enabled specialists returned; 7 disabled via `workflow.reviewer_subagents`, their domains assessed directly below)
**Total findings:** 0 confirmed blocking, 2 confirmed Low (borderline, documented), 0 dismissed, 0 deferred

## Rule Compliance

Rubric = `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) + star-wars/CLAUDE.md architectural rules. The rule-checker examined 94 instances; I cross-verified the load-bearing ones:

- **#1 Type-safety escapes** — Compliant across all 8 new functions: no `as any`, no `as unknown as T`, no `@ts-ignore`, no non-null `!`. The pre-existing `as unknown as CanvasRenderingContext2D` in the two mocks is NOT introduced by this diff (the diff adds only `strokeRect() {}`); both casts carry explanatory comments.
- **#4 Null/undefined (falsy-zero)** — Compliant and TESTED: `formatScore(0)`/`formatLives(0)` return `"0"` not `""` (`hud.test.ts`), so no `||`-drops-zero bug. `formatShield(0)===0`. No `??`/`||` on falsy-valid values anywhere.
- **#5 Modules** — Compliant: value imports (not `import type`) for runtime-used `STARTING_LIVES` and the five formatters; no `.js` extension (repo/Vite convention); tests import from `src/`, not `dist/`.
- **#8 Test quality** — Compliant: 18 assertions, all concrete (`toBe`/`toBeGreaterThan`/`toBeLessThan`/`toBeCloseTo`/`toMatch`); `formatShield` invariants are mutually constraining so they cannot pass on a constant impl. No vacuous tests.
- **#3/#6/#7/#9/#10/#11 (enums/React/async/config/input-validation/error-handling)** — Not applicable: no enums, no `.tsx`, no async/Promise, no config changes, no external input/`JSON.parse`, no try/catch in the diff.
- **CLAUDE.md — core purity** — Compliant (VERIFIED independently): `src/core/hud.ts` has zero imports and no DOM/time/randomness; all five formatters are deterministic pure functions.
- **CLAUDE.md — shell does no game math** — Compliant with two Low borderline notes (see [RULE] observations): the `lives/STARTING_LIVES*100` adapter and the `wave→level` aliasing live in the shell. Both are display adapters forced by the absent data model, not game logic, and are deviation-logged.

## Reviewer Assessment

**Verdict:** APPROVED

A clean, well-scoped 3-point rendering story. The pure/shell split is respected, the formatters are defensive, the HUD is wired and verified live, and every spec deviation is documented. No Critical or High issues. The two borderline items are Low, intended, and already surfaced to PM.

**Data flow traced:** `GameState.{score,lives,wave}` → pure `core/hud.ts` formatters → `drawHudHeader`/`drawShieldMeter` lay out glyphs + meter geometry → canvas. Safe because the core never touches the canvas and the shell never mutates game state; `formatShield` clamps `[0,100]→[0,1]` so the meter fill (`(barW-2)*fill`) can never spill the outline.

**Pattern observed:** `glowLine` (`render.ts:417`) is a clean new rendering primitive mirroring the existing `glowText` glow convention (`lighter` blend, `shadowBlur`, save/restore, reset to 0). Good, consistent.

**Observations (≥5):**
1. `[VERIFIED]` Core purity — `src/core/hud.ts:1-42` has **zero imports** and no DOM/time/random (grep-confirmed; rule-checker rule 14 clean). Complies with CLAUDE.md's sacred boundary — the single most important rule in this repo.
2. `[VERIFIED]` No division-by-zero / no NaN in practice — `STARTING_LIVES` is a non-zero const `6` (`state.ts:70`) and `lives` is an integer, so `(lives/STARTING_LIVES)*100` at `render.ts:393` is always finite; `formatShield` then clamps it. Empty meter (`fill=0`) draws zero width — graceful, not a divide error.
3. `[VERIFIED]` AC-1 wiring — `drawHudHeader` is called only in the playing branch (`render.ts:185`, after attract/gameover are handled), so the HUD renders during active play and not over the framing screens.
4. `[RULE][LOW]` `render.ts:393` — `(state.lives / STARTING_LIVES) * 100` is a unit-conversion adapter in the shell. Borderline "shell does no game math", but acceptable: it's a minimal display bridge forced by the absent `shieldHealth` field, and it's deviation-logged. Confirmed by rule-checker.
5. `[RULE][LOW]` `render.ts:398` — `formatLevel(state.wave)` encodes "wave == level" in the render layer; would silently mislead if a distinct `level` field is ever added. Matches the Dev deviation + the open PM question. Confirmed by rule-checker.
6. `[LOW]` Vertical HUD metrics (`HUD_ROW1_Y=34`, etc.) are fixed pixels while width scales with `w`. AC-8 literally says "no hardcoded pixel positions", but a fixed-height top strip with fixed font px is the established house pattern (every `*_FONT` is fixed px; the old stub used fixed `y=36`). Acceptable; AC wording flagged as a non-blocking context-grooming finding.
7. `[VERIFIED]` Build + tests (AC-11) — preflight confirms `npm run build` (tsc + vite) SUCCEEDS and 334/334 tests pass with zero type errors. The full vite build was the one gate the green phase's `tsc --noEmit` didn't cover; now verified.

**Subagent-domain coverage (disabled specialists assessed directly):**
- `[EDGE]` Boundary conditions — assessed by Reviewer: traced `lives=0` (empty meter, `formatLives→"0"`), `lives>STARTING_LIVES` (clamped to full), negative `lives` (clamped empty), score `0`/large/fractional (digit-only). All handled by the `Math.max`/clamp guards. No unhandled edge.
- `[SILENT]` Swallowed errors — assessed by Reviewer: no try/catch, no error-swallowing; the only fallible-looking op (font load) is in `shell/font.ts`, out of this diff, and already degrades to the Orbitron fallback. None introduced.
- `[TEST]` Test quality — assessed by Reviewer: 18 non-vacuous assertions; the `strokeRect(){}` mock stub changes no assertion; I confirmed the new cyan frame-line segments are excluded from `laserBeams()` because both endpoints fall within `CORNER_TOL=120` of the top corners, so the laser/TIE suites are untouched.
- `[DOC]` Comments — assessed by Reviewer: the module/function doc comments are accurate and match the code (e.g., `formatShield` doc correctly states the `[0,1]` fill contract and clamping). No stale/misleading docs.
- `[TYPE]` Type design — assessed by Reviewer: all params are concrete (`number`, `GameState`, `CanvasRenderingContext2D`); no stringly-typed APIs, no broad `object`/`Function`/`Record<string,any>`. `formatShield` returning a bare `number` fill is acceptable for a render adapter.
- `[SEC]` Security — assessed by Reviewer: no user input, no injection surface, no secrets, no network/backend; a client-only canvas HUD reading internal game numbers. N/A.
- `[SIMPLE]` Complexity — assessed by Reviewer: minimal and proportionate. `glowLine`/`drawShieldMeter` are small, single-purpose, and reuse `glowText`. Inline layout offsets (`y-8`, `barW-2`) are idiomatic canvas code, consistent with the file. No over-engineering or dead code.
- `[RULE]` Project rules — rule-checker: 16 rules / 94 instances, **0 violations**, 2 Low borderline (items 4 & 5 above).

**Error handling:** Pure formatters cannot throw on `number` inputs (`Math.*` are infallible); the render path has no failure modes (canvas calls are best-effort). Null/empty/huge inputs are clamped, not crashed. Evidence: `hud.ts:16,21,26,31,40-41`.

### Devil's Advocate

Let me argue this code is broken. First, the shield meter lies: it derives its fill from `lives/STARTING_LIVES`, but `STARTING_LIVES` is an authored "authentic-FEEL" constant (`state.ts` comment admits the cabinet's real shield count is unrecovered). If a future tuning bumps `STARTING_LIVES` to 8 but some bonus grants `lives=10`, `formatShield` clamps to full and the player can't tell they're over-max — the meter caps silently. Mitigation: the clamp is the correct, safe behavior; an over-max meter is a cosmetic non-issue, and no extra-life mechanic exists today. Second, a confused user sees "LEVEL 1" dead-center and "WAVE 1" top-right showing the same number forever and concludes the HUD is buggy or that level never advances — a genuine UX trap. This is the strongest objection; it is real, but it is documented, non-blocking, and explicitly routed to PM for a design call, not a code defect to fix here. Third, on a pathologically narrow viewport (w≈320), `margin=8`, the centered meter is ~51px, and the left "SCORE …"/"SHIELDS …" text at fixed 18px could collide with the centered LEVEL/meter or the right-aligned "WAVE" — text overlap. But this is a desktop cockpit shooter driven by a mouse yoke; sub-400px canvases are not a target, and the whole 3D scene is unplayable at that size anyway, so this is theoretical. Fourth, a stressed renderer: if `state.lives` were ever `NaN` (it isn't — integer arithmetic only), `formatShield(NaN)` returns `NaN` and `fillRect(NaN width)` draws nothing — fail-soft, not a crash. Fifth, state leakage: `drawShieldMeter` sets `ctx.textAlign='center'` without resetting it — but `drawHudHeader` resets `textAlign='left'` after calling it, and the meter's `save/restore` brackets the composite/shadow state, so nothing bleeds into the next frame. None of these rise to High: each is either clamped-safe, non-target, or a documented design question. The devil finds discomfort, not breakage.

**Handoff:** To SM (Grand Admiral Thrawn) for the finish phase — create the PR against `develop` and merge.