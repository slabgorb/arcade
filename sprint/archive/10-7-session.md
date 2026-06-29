---
story_id: "10-7"
jira_key: ""
epic: "10"
workflow: "trivial"
---
# Story 10-7: Fix authentic colors: spikes green, tankers purple, banner colors

## Story Details
- **ID:** 10-7
- **Type:** bug
- **Points:** 1
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** trivial
- **Repo:** tempest
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-06-29T15:30:12Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T15:17:20+00:00 | 2026-06-29T15:18:24Z | 1m 4s |
| implement | 2026-06-29T15:18:24Z | 2026-06-29T15:24:15Z | 5m 51s |
| review | 2026-06-29T15:24:15Z | 2026-06-29T15:30:12Z | 5m 57s |
| finish | 2026-06-29T15:30:12Z | - | - |

## Story Context

### Problem
Correct swapped/incorrect colors from the comparison. Spikes render purple (render.ts:183-184) but the ROM draws them GREEN; tankers render green (glyphs.ts:90) but GENTNK is PURPLE — the two appear swapped. Banners mismatch: GAME OVER should be green (render.ts:661), AVOID SPIKES white (render.ts:827), HIGH SCORES red (render.ts:472), PRESS START red (render.ts:529). Render-layer only.

### Technical Approach
This is a trivial bug fix in the tempest render layer. The changes are localized to color constants and render calls in:
- `render.ts:183-184` (spikes color)
- `render.ts:661` (GAME OVER banner)
- `render.ts:827` (AVOID SPIKES banner)
- `render.ts:472` (HIGH SCORES banner)
- `render.ts:529` (PRESS START banner)
- `glyphs.ts:90` (tanker color)

No simulation or core logic changes required.

### Acceptance Criteria
1. Spikes render GREEN (currently purple at render.ts:183-184)
2. Tankers render PURPLE (GENTNK; currently green at glyphs.ts:90)
3. GAME OVER banner is green (render.ts:661)
4. AVOID SPIKES banner is white (render.ts:827)
5. HIGH SCORES banner is red (render.ts:472)
6. PRESS START banner is red (render.ts:529)
7. Render-layer only — no sim/core changes

## Branch Information
**Branch Strategy:** gitflow (feat/fix → develop)
**Branch Name:** fix/10-7-authentic-colors
**Base Branch:** develop

## SM Assessment

Setup complete for a 1-point render-layer color-correction bug in `tempest`. Scope is
narrow and well-specified: each fix has a named file and line, and the story explicitly
forbids sim/core changes. No Jira (local sprint tracking), no stack parent, clean work
branch `fix/10-7-authentic-colors` off `develop` (gitflow).

Routing to **Dev (Julia)** for the `implement` phase (trivial workflow). Dev should:
- Treat the line numbers as starting hints, not gospel — verify against current source.
- Confirm the spike/tanker swap is genuinely a swap (green↔purple) per the ROM colors.
- Keep all edits in `src/shell` (render.ts / glyphs.ts); no `src/core` touches.
- Run `npm run build` and `npm test` from `tempest/` before review handoff.

No blockers. Ready for implementation.

## Delivery Findings

No upstream findings.

### Dev (implementation)
- **Improvement** (non-blocking): Story line-number hints were stale — spikes are
  colored in `drawSpikes` (render.ts:243), not render.ts:183-184 (tube spokes), and
  the banners live at 605/662/794/965, not 472/529/661/827. Affects future story
  authoring (`sprint/` descriptions) — line numbers drift; treat as hints, grep for
  the symbol instead. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): Stale block comment at `tests/shell/glyphs.test.ts:213`
  still reads `(color idx 2)` — the old green palette index — above the now-PURPLE
  tanker test. The `it()` description and `glyphs.ts` source comments were updated, but
  this one block comment was missed; it now misleads anyone cross-referencing the ROM
  palette. One-line truthfulness fix. *Found by Reviewer during code review.*

## Design Deviations

### Dev (implementation)
- No deviations from spec. All target colors implemented exactly as the ACs specify.
  Note: "HIGH SCORES red" was applied to the header banner only; the top-rank row
  highlight in `drawHighScoreTable` still uses the level-cycling `color` (the AC
  governs the banner, not the score-row accent). Updated `tests/shell/glyphs.test.ts`
  tanker-body assertion from `green` → `purple` to match the corrected (ROM-authentic)
  color — this is implementing the AC, not deviating from it.

### Reviewer (audit)
- **Dev "No deviations from spec" + HIGH SCORES partial-application note** → ✓ ACCEPTED by
  Reviewer: the AC says "HIGH SCORES banner red"; scoping the red to the header literal
  while leaving the level-cycling `color` on the top-rank row accent is a faithful reading,
  not a deviation. The test update (`green`→`purple`) is the AC made executable. No
  undocumented deviations found — the diff is shell-only and every hex matches the
  canonical `GLYPH_HEX` palette.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `tempest/src/shell/glyphs.ts` — tanker body `green` → `purple` (GENTNK); spike line `purple` → `green` (+ comments)
- `tempest/src/shell/render.ts` — live spike render `#9b30ff` → `#39ff14` (green); GAME OVER `#ff3b5c` → `#39ff14` (green); AVOID SPIKES `#ff5a3c` → `#ffffff` (white); HIGH SCORES header `color` → `#ff2f4f` (red); PRESS START `CLAW_COLOR` → `#ff2f4f` (red)
- `tempest/tests/shell/glyphs.test.ts` — tanker-body assertion `green` → `purple`

**Acceptance Criteria:** All 7 met.
1. Spikes GREEN — ✅ (drawSpikes + spikeGlyph)
2. Tankers PURPLE (GENTNK) — ✅ (tankerGlyph body)
3. GAME OVER green — ✅
4. AVOID SPIKES white — ✅
5. HIGH SCORES red — ✅
6. PRESS START red — ✅
7. Render-layer only — ✅ (no `src/core` touches)

**Tests:** 607/607 passing (GREEN). `tsc --noEmit` + `vite build` pass.
**Branch:** `fix/10-7-authentic-colors` (pushed)

**Handoff:** To review phase (Reviewer / The Thought Police).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (tests green 607/607, build pass, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | confirmed 1 (LOW [DOC] stale comment), dismissed 1 (untested spike color — policy-permitted) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 15 rules / 24 instances | N/A |

**All received:** Yes (3 enabled returned, 6 disabled pre-filled)
**Total findings:** 1 confirmed (LOW, non-blocking), 1 dismissed (with rationale), 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

A 1-point, shell-only color correction against the authentic 1981 ROM. Three enabled
subagents (preflight, test-analyzer, rule-checker) all came back clean or non-blocking;
the six disabled specialists are pre-filled above. No Critical/High issues.

### Rule Compliance (TypeScript lang-review + tempest CLAUDE.md)
Exhaustive enumeration of every changed line against every applicable rule (corroborated
by [RULE] reviewer-rule-checker: 15 rules / 24 instances / 0 violations):
- **Hard architectural boundary (CLAUDE.md):** diff touches `src/shell/glyphs.ts`,
  `src/shell/render.ts`, `tests/shell/glyphs.test.ts` only — **zero `src/core/` files**.
  `[VERIFIED] git diff --name-only develop...HEAD` lists only shell/test paths. Compliant.
- **Closed `GlyphColor` union (glyphs.ts:17):** both new named colors (`'purple'`,
  `'green'`) are union members. Compliant.
- **Canonical `GLYPH_HEX` palette (render.ts:27-35):** all 5 introduced hex literals are
  byte-exact matches — `#39ff14`=green (×2: render.ts:246-247, 798), `#ff2f4f`=red (×2:
  609, 666), `#ffffff`=white (969). `[VERIFIED]` each against the `GLYPH_HEX` map. The diff
  also *removes* two pre-existing OFF-palette hexes (`#ff3b5c`, `#ff5a3c`) → net palette
  hygiene improvement.
- **Type-safety escapes (#1):** no `as any`, `@ts-ignore`, or new non-null assertions
  introduced. The pre-existing `body!` (test:221) is guarded by `toBeDefined()` above it.
- **Checks #2-#13:** N/A — no generics, enums, null-handling, modules, async, build-config,
  security-input, or error-handling code introduced (pure paint changes).

### Observations (≥5, tagged by source)
- `[VERIFIED]` shell/core boundary intact — evidence: diff name-only is shell+tests only,
  complies with CLAUDE.md "core must never be touched by render work".
- `[VERIFIED]` every banner/enemy hex matches its canonical `GLYPH_HEX` entry — evidence:
  render.ts:246-247/609/666/798/969 vs render.ts:27-35. No off-palette literals introduced.
- `[VERIFIED]` spike white tip dot preserved — evidence: render.ts `fillStyle='#ffffff'`
  for the JADOT cap (drawSpikes) is untouched; only the line stroke went green.
- `[VERIFIED]` the spike↔tanker swap genuinely de-collides them — spikes were rendered
  purple AND the tanker should be purple; now spikes are green, tanker purple, so the two
  no longer share a color. Matches the story's "appear swapped" diagnosis.
- `[RULE]` reviewer-rule-checker: clean — 0 violations across 15 rules / 24 instances.
- `[TEST]` reviewer-test-analyzer: the changed assertion is meaningful, not vacuous — if
  the tanker body reverts to green, `find(color==='purple')` → `undefined` → `toBeDefined()`
  fails. CONFIRMED sound.
- `[DOC]` `[LOW]` stale `(color idx 2)` block comment at tests/shell/glyphs.test.ts:213 —
  CONFIRMED, non-blocking. Recorded as a Delivery Finding for a follow-up one-line fix.
- `[TEST]` `[DISMISSED]` spike-green color is not pinned by an assertion (test uses the
  color-agnostic `!== 'white'` predicate) — dismissed: tempest CLAUDE.md explicitly states
  "the shell is verified by running the game"; untested render color literals are policy,
  and the agnostic predicate is the deliberate existing design (Story 6-8).
- `[EDGE]` (subagent disabled) reviewer assessment: no boundary/path logic exists in a
  color-literal diff — N/A.
- `[SILENT]` (subagent disabled) reviewer assessment: no error handling, catch, or fallback
  paths introduced — N/A.
- `[TYPE]` (subagent disabled) reviewer assessment: no type/interface/invariant changes;
  named colors stay within the closed `GlyphColor` union — N/A.
- `[SEC]` (subagent disabled) reviewer assessment: no input handling, auth, secrets, or
  injection surface in render color constants — N/A.
- `[SIMPLE]` (subagent disabled) reviewer assessment: changes are minimal literal swaps;
  no dead code or over-engineering introduced; `CLAW_COLOR` remains referenced elsewhere
  so no orphaned constant — N/A.

### Devil's Advocate
Let me argue this code is broken. First attack: did Dev fix the *render path actually used
in gameplay*, or just a dead glyph? Spikes are drawn two ways — `spikeGlyph` (glyphs.ts,
used only by tests) and the live `drawSpikes` (render.ts, called from `render()` at ~925).
A lazy fix touching only the glyph would leave on-screen spikes purple. But the diff changes
BOTH: glyphs.ts:132 `purple→green` and render.ts:246-247 `#9b30ff→#39ff14`. The live path is
covered. Second attack: a color swap could silently break a sibling that depends on the old
value — e.g. an explosion or HUD element keyed to the spike's purple. Grep history shows the
removed `#9b30ff` is the canonical purple still mapped in `GLYPH_HEX` (untouched) and still
used by the tanker glyph, so nothing that reads the *palette* breaks; only the two literal
call-sites changed. Third attack: the "AVOID SPIKES" warning went from attention-grabbing
orange-red to white — could that hurt readability or collide with other white UI on the warp
screen? It's a render-fidelity AC call, not a correctness bug; the blink animation and
positioning are unchanged, and white-on-black vector text is the game's default high-contrast
treatment. Fourth attack: did anything in `src/core` change, eroding determinism? No — the
boundary check confirms zero core files. Fifth attack: could the test be passing vacuously?
No — the predicate now pins `purple`, so a regression to green fails the assertion. Sixth:
GAME OVER is now green, which a player might read as "you won." That is a deliberate
ROM-faithfulness choice (the AC explicitly calls for green), documented in the story; it is
intentional, not a bug. The only residue the devil surfaces is the stale `(color idx 2)`
comment — cosmetic, already logged LOW. Nothing rises to High/Critical.

**Data flow traced:** `GameState.spikes[lane]` (core) → `drawSpikes` projects + strokes in
green (render-only) → canvas. Color is purely presentational; no sim/core value flows from
the changed literals. Safe.
**Pattern observed:** literal hexes now sourced from the canonical `GLYPH_HEX` values at
render.ts:27-35 — consistent with the house style of inline hex in `ctx`-draw helpers.
**Error handling:** N/A — no failure paths in color constants; null/empty inputs unaffected.
**Handoff:** To SM (Winston Smith) for finish-story.