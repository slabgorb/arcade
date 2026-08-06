---
story_id: "sw8-20"
jira_key: "sw8-20"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-20: star-wars: the ten ROM default high scores should carry wave null, not the fabricated wave 0

## Story Details
- **ID:** sw8-20
- **Jira Key:** sw8-20
- **Repos:** arcade
- **Workflow:** tdd
- **Branch:** feat/sw8-20-default-highscores-wave-null
- **PR:** none
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T17:46:40Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T17:24:54Z | 2026-08-06T17:29:03Z | 4m 9s |
| red | 2026-08-06T17:29:03Z | 2026-08-06T17:35:28Z | 6m 25s |
| green | 2026-08-06T17:35:28Z | 2026-08-06T17:38:58Z | 3m 30s |
| review | 2026-08-06T17:38:58Z | 2026-08-06T17:46:40Z | 7m 42s |
| finish | 2026-08-06T17:46:40Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings

### Reviewer (code review)

- **Improvement** (non-blocking): the `highScores.ts` header comment extends the ROM claim to "the ROM's board DISPLAY draws initials + score only — there is no wave column" without an inline line citation. Affects `plugins/star-wars/src/core/highScores.ts` (a `TCHSCR.MAC` display-routine line cite could be added to anchor the display-format claim the way the BCD/initials decode is anchored to `:718-738`). The claim is TRUE — measured against the ROM's DISPLAY routine at setup — and the `comment-citations` gate passes, so this is a thoroughness nicety, not a defect. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No deviations

## SM Assessment

> **⚠ RULING:** User ruling 2026-08-06, settled before setup.
>
> **Display:** Null rows show no WAVE.
>
> Concretely:
> - Change the ten DEFAULT_HIGH_SCORES rows (plugins/star-wars/src/core/highScores.ts:21-30) from `wave: 0` to `wave: null`.
> - Fix drawHighScoreBoard so a null-wave row drops the "WAVE" label ENTIRELY (truly blank column — no "WAVE", no value), matching the ROM defaults which carry no level info.
> - Real player runs (a finite wave number) still render "WAVE N" exactly as today. Only null rows change.
> - Also update the highScores.ts comment (:14-16) so it states the value is `null` and why (no real run → honest null encoding, per Task 20's `number | null` widening), replacing the "wave: 0 clone artifact" note.

**MEASURED ROM FACTS (2026-08-06):**

The ROM defaults carry ONLY initials + score. There is NO per-entry wave/level field in the ROM defaults (INTINT initials + INTSCR scores, ~/Projects/star-wars-1983-source-text/TCHSCR.MAC:718-738, copied by DOINTS). The ROM high-score DISPLAY routine (TCHSCR.MAC, "DISPLAY THE HIGH SCORE TABLE") draws initials (INITLS) + score (HSCORS) ONLY. The ROM board has NO wave/level column at all. The entire "WAVE" column in our clone is an invention of the shared HighScoreEntry<'wave'> schema.

The current render code (plugins/star-wars/src/shell/render.ts, function drawHighScoreBoard ~line 1652) builds the row as `${rank}  ${e.name}  ${pts}  WAVE ${wave}`.trimEnd(). For a null wave the VALUE blanks but the literal label "WAVE" REMAINS, so a null row currently renders a dangling "WAVE" with no number — NOT a clean blank. A render change IS required; it is not "no further change."

Type support already exists: src/shared/highscore.ts:66 defines the domain field as `number | null`.

**FILES IN SCOPE:**
- plugins/star-wars/src/core/highScores.ts (the 10 default rows + the comment)
- plugins/star-wars/src/shell/render.ts → drawHighScoreBoard (~line 1652), the null-wave render fix
- plugins/star-wars/tests/core/default-high-scores.test.ts (existing DATA test — UPDATE, do not duplicate)
- plugins/star-wars/tests/shell/render.rebel-force-board.test.ts (existing RENDER test — UPDATE, do not duplicate)

**KEY REQUIREMENT (AC3):** The render test must distinguish a blank column from the string '0' AND from the string 'null' (String(null) === 'null', a truthy non-empty string), and be proven non-vacuous by mutation.

**Branch:** feat/sw8-20-default-highscores-wave-null (reuse existing remote branch)
## TEA Assessment

**Phase outcome:** RED landed. Commit `1f14b53b`, pushed to `feat/sw8-20-default-highscores-wave-null`.

**What I wrote (updated the two EXISTING files — no duplication, AC4):**

1. `plugins/star-wars/tests/core/default-high-scores.test.ts` — new `describe('sw8-20 …')` block:
   - `toBeNull()` on every `DEFAULT_HIGH_SCORES[i].wave` — exact: reddens on `0` and on any numeric placeholder (AC1).
   - explicit `not.toBe(0)` — the named mutation ("restoring wave: 0 must redden").
   - Fixed the now-stale comment in the row-guard test that claimed the wave value is "a numeric placeholder, deliberately NOT pinned" — it IS pinned (null) as of this story.

2. `plugins/star-wars/tests/shell/render.rebel-force-board.test.ts` — rewrote the wave-null block to the ruling (null → NO WAVE label). Three-way discrimination (AC3):
   - `not /WAVE\s*NULL/` — the `String(null)` trap.
   - `not /WAVE\s*0/` — the fabricated-0 trap.
   - `not /WAVE/` on a null-only board — the pre-sw8-20 dangling-label trap (this + the exact-string test are what redden the current source).
   - `toContain(' 1  JPX  149,830')` on the `texts()` ARRAY (exact-element, not substring) — the old `'…  WAVE'` element does NOT satisfy it.
   - Kept the invariants: null row still draws name + score; a real (finite) wave row on a mixed board still shows `WAVE 4`.

**RED evidence (direct run, ground truth — not testing-runner):** full star-wars project `4 failed | 2341 passed`. The 4 reds are exactly: core `wave === null`, core `not 0`, render `no bare WAVE`, render exact-blank-string. Non-vacuity is proven: all four fail against the current source, which is precisely the old-behavior mutant.

**Rule Coverage:**
- **No-vacuous-assertion rule:** every added assertion is exact — `toBeNull`, `not.toBe(0)`, array-`toContain` (exact element), anchored regexes. No `is_some`/`assert(true)`/`let _ =` equivalents.
- **ROM-fidelity rule (SOUL / project):** the tests encode the measured ROM fact (no wave column in the ROM display) via the "no WAVE label for a no-real-run row" assertions, not a preference.
- **Core/shell boundary:** untouched — data test hits `src/core/highScores.ts` (pure), render test hits the shell via the existing `layoutText` seam mock.

**For Dev (GREEN) — the mechanics only, ruling is final, do NOT re-open the display question:**
1. `highScores.ts:21-30` — change all ten `wave: 0` → `wave: null`.
2. `highScores.ts:14-16` — update the comment: value is `null`, meaning "no real run" (honest null per Task 20's `number | null` widening), replacing the "wave: 0 clone artifact" note. (AC2.)
3. `render.ts` `drawHighScoreBoard` (~1652) — when `e.wave === null`, emit NO wave column at all (drop the literal `WAVE` label, not just the value). Real/finite waves keep `WAVE ${wave}`. The exact target row for the null case is `` `${rank}  ${e.name}  ${pts}` `` (nothing trailing).

**Delivery Findings:** No upstream findings. The story's own description contained one stale claim ("render already blanks null / no further change") — corrected by the SM before setup and confirmed false here (current null row emits a dangling `WAVE`); a render change is required and is in scope.
## Dev Assessment (GREEN)

Commit `95dd9341`, pushed. Three minimal edits, exactly the mechanics TEA handed off:
1. `highScores.ts:21-30` — all ten `wave: 0` → `wave: null`.
2. `highScores.ts:14-16` — comment rewritten to explain the null encoding + that render draws it blank (AC2).
3. `render.ts` `drawHighScoreBoard` — `waveCol = e.wave === null ? '' : \`  WAVE ${e.wave}\``; row = `${rank}  ${e.name}  ${pts}${waveCol}`. A null row emits ` 1  JPX  149,830` (nothing trailing); a finite wave still emits `  WAVE N`.

No scope creep: the ruling was settled at setup, so no re-derivation. `trimEnd()` was removed because the null branch no longer appends anything to trim — the finite branch prepends its own two-space separator.

**Evidence:** full star-wars suite `2345 passed` (the 4 RED tests now green, no regressions); `tsc --noEmit` clean. **Delivery Findings:** No upstream findings.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — GREEN 2345/2345, lint clean, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-assessed (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-assessed (see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-assessed (see [TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-assessed (see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-assessed (see [TYPE]) |
| 7 | reviewer-security | Yes | clean | none | N/A — no injection surface (canvas, not innerHTML) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-assessed (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 30 checks / 46 instances | N/A — all compliant |

**All received:** Yes (3 enabled subagents ran — preflight, security, rule-checker; 6 disabled via `workflow.reviewer_subagents`, hand-assessed below)
**Total findings:** 0 confirmed blocking, 1 non-blocking (comment citation nicety, deferred to Delivery Findings), 0 dismissed

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** a seeded default's `wave: null` → `seedDefaultHighScores` (main.ts:65, pass-through) → `render(…, highScores)` → `drawHighScoreBoard` → the strict `e.wave === null` ternary at render.ts:1681 (safe because it is the ONLY consumer of an entry's `.wave`; every other `wave` reference in render.ts is `state.wave`, always numeric — grep-verified. `null` never reaches arithmetic or a numeric format).

**Pattern observed:** strict `=== null` branching (render.ts:1681) rather than `??`/`||` — correct, and deliberately so: a real `wave: 0` run must still render `WAVE 0`, which `||`/`??` would swallow as falsy.

**Error handling:** no failure paths introduced; the change is static data + one pure string-formatting branch.

### Dispatch tags (all 8 — 3 ran, 6 hand-assessed)

- [PRE] preflight GREEN — 2345/2345 star-wars tests, `tsc --noEmit` clean, 0 code smells. Confirmed by an independent full-suite run.
- [SEC] security clean — `row` is drawn via `glowText` to a Canvas 2D context, never `innerHTML`; no injection sink; the only new value (`e.wave`) is null-guarded before interpolation.
- [RULE] rule-checker clean — 30 checks / 46 instances / 0 violations, including core/shell purity (#27), ROM fidelity (#28), test anti-vacuity (#8/#15/#18/#19/#26/#29), and the citation freeze (#30).
- [EDGE] (hand-assessed) boundary cases: a null-only board, a mixed real+null board, and the empty board ("NO SCORES YET", unchanged) — all covered by the render tests; the `wave: 0` boundary (a legit wave-0 run) is preserved by the strict `=== null` check.
- [SILENT] (hand-assessed) no swallowed errors — no try/catch, no fallback; the ternary is total over `number | null`.
- [TEST] (hand-assessed) the render test pins the exact-element string ` 1  JPX  149,830` via array-`toContain` (not substring on a joined blob), so the old dangling-`WAVE` output — a longer, distinct element — cannot satisfy it; three-way discrimination against `WAVE 0` / `WAVE null` / bare `WAVE`. Non-vacuity was proven RED (4 fail against the old source) before GREEN.
- [DOC] (hand-assessed) both edited comments (highScores.ts, render.ts) agree on the same premise and match the story; one prose citation nicety recorded non-blocking in Delivery Findings. `comment-citations` gate green.
- [TYPE] (hand-assessed) `HighScoreTable<'wave'>`'s domain field is already `number | null` (shared/highscore.ts:66); `wave: null` is exactly the documented contract for "no real run", no type loosened, no `as`/`!`.
- [SIMPLE] (hand-assessed) the fix is minimal — `waveCol` computed once per row; the removed `trimEnd()` is no longer needed because the null branch appends nothing and the finite branch owns its leading separator. No dead code, no over-engineering.

### Rule Compliance

- **Core/shell purity (root + star-wars CLAUDE.md):** `highScores.ts` (in `src/core/`) imports only `import type { HighScoreTable }` — erased at compile time; no DOM/window/canvas/`Date.now`/`Math.random`. The plugin's own purity/core-boundary test (14 tests) is green. COMPLIANT.
- **ROM fidelity (ROM outranks shipped):** the ten name/score pairs are byte-identical; only the fabricated `wave: 0` → honest `null`, which encodes the measured ROM fact (the ROM default table and its display carry no per-entry wave). COMPLIANT — this is the ROM winning, exactly the standing rule.
- **Test quality / anti-vacuity:** every added assertion is exact (`toBeNull`, `not.toBe(0)`, anchored regexes, exact-element `toContain`); distinguishes blank from `'0'` and `'null'` (AC3). COMPLIANT.
- **Citation gate freeze:** `citations` + `comment-citations` suites (53 tests) green; the gate reads the frozen audit commit, and no cited verbatim was disturbed. COMPLIANT.

### Devil's Advocate

Suppose this is broken. The most dangerous move in the diff is widening a value's domain from a concrete `0` to `null` and trusting every downstream reader to cope. Where could a `null` wave detonate? A reader that does `entry.wave + 1`, `entry.wave.toLocaleString()`, `formatWave(entry.wave)`, or a `entry.wave > n` comparison would silently produce `NaN`, `"WAVE null"`, or `true`/`false` from a coerced null — and none of that would throw, so a broken board could ship looking fine. I chased that directly: the only site in the codebase that touches an *entry's* `.wave` is render.ts:1681, and it is null-guarded before any use; `formatWave`/`towersForWave`/`forceBonusForWave` all take `state.wave` (the live game wave, structurally always a number), not a table entry. `insertHighScore` (main.ts:249) builds new entries from `state.wave`, so a real run still carries a number — the `null` is confined to the ten seeded defaults and to migrated rows, both of which only ever flow to the guarded render branch. A confused user angle: could a player mistake a blank wave column for a rendering bug ("why is that column empty?")? Possibly — but that is the *ruled* behavior (the ROM shows nothing there because there is no column), and a fabricated `0` or `?` would be the actual lie. A stressed-filesystem/localStorage angle: a corrupted stored row with a non-null/non-number wave would be rejected by `makeHighScoreRowGuard('wave')` on load before it ever reaches render, so the seam is defended upstream too. The exact-string test is the one place a lazy fix could sneak through — but it pins the array element exactly, so `e.wave ?? 0` (→ `WAVE 0`) or `e.wave ?? '?'` (→ `WAVE ?`) both fail it by name. I could not construct an input that renders wrong yet passes the suite. The change is as small and as guarded as it looks.

**Observations (≥5):**
1. [VERIFIED] null-wave has exactly one consumer, null-guarded — evidence: render.ts:1681; all other `wave` refs are `state.wave`.
2. [VERIFIED] core purity intact — evidence: highScores.ts imports only a type; boundary test 14/14 green.
3. [VERIFIED] citation + comment-citation freeze green (53 tests) despite comment edits.
4. [VERIFIED] `insertHighScore` sources new entries from `state.wave` (numeric) — null stays confined to seeded/migrated rows.
5. [RULE] strict `=== null` preserves a legitimate `wave: 0` run rendering `WAVE 0` (checks #4/#21).
6. [TEST] exact-element array `toContain` defeats the dangling-`WAVE` and fabricated-stand-in traps; RED-proven non-vacuous.
7. [LOW] comment display-column claim lacks an inline line cite — non-blocking, recorded as a Delivery Finding.

**Handoff:** To SM for finish-story.