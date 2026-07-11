---
story_id: "sw3-1"
jira_key: ""
epic: "sw3"
workflow: "tdd"
---
# Story sw3-1: Bake resolved ROM score values — TIE 1,000 (from 100), Darth Vader 2,000, exhaust port 25,000 (from 1,000), fireball 33 (from 50)

## Story Details
- **ID:** sw3-1
- **Jira Key:** N/A
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/sw3-1-bake-rom-score-values
- **Branch Strategy:** gitflow (feat/sw3-1-bake-rom-score-values)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-11T22:19:14Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T21:52:25Z | 2026-07-11T21:55:43Z | 3m 18s |
| red | 2026-07-11T21:55:43Z | 2026-07-11T22:05:31Z | 9m 48s |
| green | 2026-07-11T22:05:31Z | 2026-07-11T22:09:55Z | 4m 24s |
| review | 2026-07-11T22:09:55Z | 2026-07-11T22:19:14Z | 9m 19s |
| finish | 2026-07-11T22:19:14Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): `VADER_SCORE` (2,000, ROM `byte_984D`) is baked as a
  single-sourced constant but is never awarded — the sim has no Darth-Vader
  enemy (`Enemy.kind` is the string union `'tie'` only; Vader exists solely as a
  render model). Affects `src/core/state.ts` / `src/core/sim.ts` (a future
  Vader-enemy story must add a `'vader'` kind and award `VADER_SCORE` on its
  kill, plus the end-to-end kill test). *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): `VADER_SCORE` (2,000) is now exported but has ZERO
  consumers in `src/` — `grep VADER_SCORE src/` matches only its definition;
  nothing in `sim.ts` awards it (the sim has no Vader enemy). Intentional per
  TEA's deferral — the consumer is a future Vader-enemy story. Reviewer: this is
  a deliberately-unwired public constant, not dead code. Affects
  `src/core/state.ts` / `src/core/sim.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (non-blocking): the sw2-6 audit resolved a "Shield bonus — 5,000 ×
  shields (`sub_9775`)" ROM value, but unlike the other resolved scores it has NO
  story in `sprint/epic-sw3.yaml` (grep found none — the epic files TIE/Vader/
  port/fireball → sw3-1, 50k all-towers → sw3-3, extra lives → sw3-6, but the
  shield bonus fell through the cracks). Affects end-of-run HUD scoring (a future
  story must port it). Surfaced while verifying sw3-1's transcription against the
  audit. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

2 deviations

- **Vader score pinned as a constant only — no kill-path behavior test**
  - Rationale: the sim has no Vader enemy to kill (`Enemy.kind` = `'tie'` only); the AC scope is constant VALUES, and wiring a distinct Vader boss enemy is out of scope for a 2-pt chore (the epic defers Vader mechanics). Matches how the other score constants are single-sourced for later use.
  - Severity: minor
  - Forward impact: a future Vader-enemy story must award `VADER_SCORE` on a Vader kill and add the kill test then (logged as a Delivery Finding).
- **New transcription suite instead of editing the existing symbolic scoring tests**
  - Rationale: those suites reference the constants SYMBOLICALLY by design ("value is GREEN's tuning call") — they pin WIRING, not VALUE; rewriting them to literals would erase that separation and over-couple them. A dedicated transcription suite is the repo convention for ROM-value stories and keeps the value contract in one scannable place.
  - Severity: minor
  - Forward impact: none — no existing test lost coverage; the symbolic suites still guard wiring, the new suite guards values.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Vader score pinned as a constant only — no kill-path behavior test**
  - Spec source: context-story-sw3-1.md, AC-1
  - Spec text: "Score constants for TIE (1,000), Darth Vader (2,000), exhaust port (25,000), and fireball (33) match the ROM-resolved values from the sw2-6 audit."
  - Implementation: `VADER_SCORE` is pinned to 2,000 at the constant level and in the ROM-ordering guard; there is NO end-to-end "killing Vader awards 2,000" test.
  - Rationale: the sim has no Vader enemy to kill (`Enemy.kind` = `'tie'` only); the AC scope is constant VALUES, and wiring a distinct Vader boss enemy is out of scope for a 2-pt chore (the epic defers Vader mechanics). Matches how the other score constants are single-sourced for later use.
  - Severity: minor
  - Forward impact: a future Vader-enemy story must award `VADER_SCORE` on a Vader kill and add the kill test then (logged as a Delivery Finding).
- **New transcription suite instead of editing the existing symbolic scoring tests**
  - Spec source: context-story-sw3-1.md, AC-3
  - Spec text: "Existing scoring tests updated to the new values; no other scoring behavior regressed."
  - Implementation: added a dedicated `tests/core/rom-score-values.test.ts` pinning the exact ROM literals; left the pre-existing scoring suites (space-combat, shootable-fireballs, force-bonus, exhaust-port-outcome) untouched.
  - Rationale: those suites reference the constants SYMBOLICALLY by design ("value is GREEN's tuning call") — they pin WIRING, not VALUE; rewriting them to literals would erase that separation and over-couple them. A dedicated transcription suite is the repo convention for ROM-value stories and keeps the value contract in one scannable place.
  - Severity: minor
  - Forward impact: none — no existing test lost coverage; the symbolic suites still guard wiring, the new suite guards values.

### Dev (implementation)
- No deviations from spec — the four constants were set to exactly the values the
  RED tests pin (TIE 1,000, Vader 2,000, exhaust port 25,000, fireball 33); no
  data-structure change, no algorithm change, no wiring beyond what the tests
  require, and `FORCE_BONUS` left untouched. (Doc comments were refreshed to cite
  each ROM symbol — the old "authentic-feel guess" text was now false; that is
  comment maintenance, not a spec deviation.)

### Reviewer (audit)
- TEA #1 (Vader score pinned as a constant only, no kill-path test) → ✓ ACCEPTED
  by Reviewer: the sim has no Vader `Enemy.kind` to kill, so an honest end-to-end
  test is impossible today; the AC scope is constant VALUES and the constant is
  pinned. Sound.
- TEA #2 (new transcription suite instead of editing the symbolic suites) → ✓
  ACCEPTED by Reviewer: independently confirmed the pre-existing suites assert
  scores SYMBOLICALLY (they pass at 100 or 1000), so the new literal-pin suite
  closes a real gap rather than duplicating; the symbolic suites stayed green
  (755/755).
- Dev (no deviations from spec; comments refreshed to cite ROM symbols) → ✓
  ACCEPTED by Reviewer: the four values match the audit exactly and the refreshed
  comments are now accurate (the old "authentic-feel guess" text was stale). No
  undocumented deviations found in the diff.

## Sm Assessment

Story sw3-1 diagnosed and prepped for the RED phase.

**Scope:** Bake four ROM-resolved score values into the star-wars deterministic
core (`src/core`): TIE 1,000 (from 100), Darth Vader 2,000, exhaust port 25,000
(from 1,000), fireball 33 (from 50). 2pt chore, tdd (phased) workflow.

**Source of truth:** `star-wars/docs/sw2-6-disassembly-fidelity-audit.md` — the
audit that resolved these values. TEA must read it to confirm each value and
locate the current score constants in `src/core` before writing tests.

**Setup verified on disk:** session file present; story moved backlog →
in_progress (sm-setup left it at backlog — corrected via `pf sprint story
update`); context file enriched with problem/approach/ACs (sm-setup emitted a
stub); branch `feat/sw3-1-bake-rom-score-values` cut from `develop` in the
star-wars subrepo (uses PRs to develop, has origin remote).

**Constraint:** core owns scoring; shell only reads/displays. Preserve the
existing core/shell split. Update existing scoring tests; don't regress other
scoring.

**Handoff → TEA (Imperator Furiosa), RED phase.** Write failing tests that pin
the four ROM-resolved score values, confirmed against the sw2-6 audit. Witness me.

## TEA Assessment

**Phase:** finish
**Tests Required:** Yes
**Reason:** Transcription chore with a real player-visible contract — the sw2-6
audit flagged wrong score values as "the biggest player-visible gap." Pinning
the exact ROM literals is meaningful (catches the "do NOT ×10" error the audit
explicitly warns about).

**Test Files:**
- `tests/core/rom-score-values.test.ts` — the sw3-1 transcription contract: exact
  literal pins for the four resolved ROM values + end-to-end score-delta pins
  through the real sim.

**Tests Written:** 10 tests covering the 4 ACs.
- 4 exact-literal pins: TIE 1,000 (`byte_984A`), Vader 2,000 (`byte_984D`),
  exhaust port 25,000 (`byte_985F`), fireball 33 (`byte_985C`).
- 1 ROM-ordering guard: fireball < TIE < Vader < port (catches a transposed value).
- 1 unchanged-guard: `FORCE_BONUS` stays 5,000 (this story must not touch it).
- 4 end-to-end sim pins: TIE kill = +1,000, fireball kill = +33, non-clean port
  kill = 25,000, clean port kill = 30,000 (25k + 5k Force). Each score-delta pin
  also asserts the entity actually died, so it can't pass vacuously.

**Status:** RED (verified via testing-runner, RUN_ID sw3-1-tea-red)
- 9 of 10 new tests fail; the 10th (`FORCE_BONUS` unchanged-guard) passes by
  intent. All 68 other suites stay GREEN (no regression). `tsc` flags the missing
  `VADER_SCORE` export (TS2305) — expected RED for the build gate.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| TS #8 Test quality (meaningful assertions, no `as any`, import from `src/`) | whole suite: exact `toBe` literals + score-delta pins that also assert the kill landed; fully-typed fixtures (no casts); imports from `../../src/core/*` | passing (self-check) |
| TS #1 type-safety / #3 enum / #4 null / #10 input-validation | — | N/A (numeric-constant transcription; no new types, enums, IO, or user input) |

**Rules checked:** 1 of 1 applicable lang-review TS rules covered (#8); the rest
(type-safety, enum, null, validation, async) do not apply to a numeric-constant
bake.
**Self-check:** 0 vacuous tests found — every score-delta test pairs the pin with
a death assertion; every constant pin is an exact `toBe`; no `let _ =`,
`assert(true)`, or always-undefined checks.

**Dev implementation (GREEN) — what to change in `src/core/state.ts`:**
- `TIE_SCORE`: 100 → **1000**
- `FIREBALL_SCORE`: 50 → **33**
- `TRENCH_BONUS`: 1000 → **25000**
- add `export const VADER_SCORE = 2000` (ROM `byte_984D`) — a single-sourced
  constant; no kill-path wiring (no Vader enemy exists — see Delivery Finding).
- Do **not** change `FORCE_BONUS` (stays 5000).

**Handoff:** To Dev (The Word Burgers) for GREEN — make the constants match the
ROM literals. We go back. And test again.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/state.ts` — set the four score constants to the sw2-6 ROM-resolved
  values: `TIE_SCORE` 100→**1000** (`byte_984A`), `FIREBALL_SCORE` 50→**33**
  (`byte_985C`), `TRENCH_BONUS` 1000→**25000** (`byte_985F`); added
  `export const VADER_SCORE = 2000` (`byte_984D`). Refreshed the doc comments to
  cite each ROM symbol (the old "authentic-feel guess" text was stale).
  `FORCE_BONUS` (5,000) untouched.

**Tests:** 755/755 passing (GREEN), including all 10 of
`tests/core/rom-score-values.test.ts`. Build/typecheck clean (`npm run build`) —
the earlier TS2305 for the missing `VADER_SCORE` export is resolved. Verified via
testing-runner (RUN_ID sw3-1-dev-green).

**Scope held (minimalist):** four constants only. No Vader-enemy wiring —
`VADER_SCORE` is a single-sourced constant with no `src/` consumer yet (the sim
has no Vader `Enemy.kind`); wiring is deferred to a future story per TEA's
design decision (see Delivery Findings). Confirms the core/shell boundary: only
`src/core/state.ts` changed.

**Branch:** feat/sw3-1-bake-rom-score-values (pushed to origin; no PR — SM opens
it in the finish phase).

**Handoff:** To the next phase (verify / review). The Word Burgers built what
must be built — we code so the next ones don't have to rewrite.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (755/755 tests, clean build, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 1 (low: tautological ordering test) | confirmed 1 (LOW, non-blocking), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (28 rules / 34 instances / 0 violations) | N/A |

**All received:** Yes (4 enabled returned; 5 disabled via settings)
**Total findings:** 1 confirmed (LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

A faithful, minimal transcription: four score constants set to the values the
sw2-6 disassembly fidelity audit resolved from the cabinet's packed-BCD score
table, plus a dedicated literal-pinning test suite. I independently verified
every value against the committed audit source — all four match exactly.

**Independent ROM verification (transcription duty):**
- TIE_SCORE = 1000 — audit byte_984A ✓
- VADER_SCORE = 2000 — audit byte_984D ✓
- TRENCH_BONUS = 25000 — audit byte_985F ✓
- FIREBALL_SCORE = 33 — audit byte_985C ✓
- FORCE_BONUS = 5000 unchanged — audit byte_983B[0], Faithful ✓
- The audit's load-bearing "do NOT ×10" cross-note is honoured (TIE 1,000 not
  10,000; exhaust 25,000 not 250,000). Note: `reference/disasm/` is not present
  in this checkout, so the committed audit doc — the story's designated resolved
  source — was the verification basis.

**Data flow traced:** constant → sim.ts scoring (`score += TIE_SCORE` at
sim.ts:232, `FIREBALL_SCORE` :252, `TRENCH_BONUS + (clean ? FORCE_BONUS : 0)`
:620) → GameState.score → hud.formatScore (toLocaleString, no clamp) /
render.ts padStart(6). Safe: score is a plain JS number accumulator; 25k/30k ≪
MAX_SAFE_INTEGER; no overflow; padStart pads but never truncates.

**Observations (7):**
- [VERIFIED] All four values match the audit exactly — evidence:
  docs/sw2-6-disassembly-fidelity-audit.md:78-81 and the do-not-×10 cross-note
  :71-73.
- [VERIFIED] Values reach the readout — sim.ts:232/:252/:620; hud.ts:24
  formatScore uses toLocaleString (no magnitude clamp). Scoring lives in core,
  shell only displays — core/shell boundary respected.
- [VERIFIED] core/shell boundary preserved — the four constants are pure numeric
  literals in src/core/state.ts; no impurity, no Date.now/Math.random; shell only
  reads. rule-checker ADD#1 confirms.
- [VERIFIED] No downstream score-threshold logic exists — grep found `score` is
  never compared anywhere in src/; the 10× TIE bump trips no extra-life/bonus
  mechanic (extra lives deferred to sw3-6). Devil's-advocate risk closed.
- [VERIFIED] FORCE_BONUS untouched (5000); the clean-port test pins 30000 =
  25000 + 5000, confirming the new port value composes with the Force branch
  rather than replacing it.
- [VERIFIED] VADER_SCORE is a deliberately-unwired public constant (no Vader
  Enemy.kind yet) — documented in its JSDoc, the test header, and the session
  Delivery Findings. Not dead code (no eslint no-unused-vars gate; tsc
  noUnusedLocals ignores unused exports). Acceptable scope boundary for a 2-pt
  bake; wiring deferred to a future Vader-enemy story.
- [LOW] The "ROM hierarchy" ordering test (rom-score-values.test.ts:61) is
  logically implied by the four exact-literal pins above it in the same block, so
  it cannot fail independently — redundant, not vacuous. Non-blocking; acceptable
  to keep as documentation of the ROM ordering (it would still guard a future
  loosening of the exact pins to ranges). Optional cleanup for Dev; not required.

**Subagent dispatch tags:**
- [SEC] reviewer-security — clean; no security surface (client-only game, numeric
  constants), no overflow, no XSS (score renders via Canvas glowText, not innerHTML).
- [RULE] reviewer-rule-checker — clean; 28 rules / 34 instances / 0 violations,
  including the core/shell boundary convention.
- [TEST] reviewer-test-analyzer — 1 LOW finding (redundant ordering test),
  confirmed non-blocking; end-to-end pins verified genuinely meaningful (assert
  the entity died AND the score delta).
- [EDGE] reviewer-edge-hunter — disabled this run (settings).
- [SILENT] reviewer-silent-failure-hunter — disabled this run (settings).
- [DOC] reviewer-comment-analyzer — disabled this run; I verified comments
  myself: the refreshed JSDoc cites the correct ROM symbols and the stale
  "authentic-feel guess" text is gone.
- [TYPE] reviewer-type-design — disabled this run; no type changes (numeric
  consts only); rule-checker TS#1–5 covered type concerns, 0 violations.
- [SIMPLE] reviewer-simplifier — disabled this run; diff is minimal (4 consts +
  one test file), no complexity introduced.

**Deviation audit:** 3 entries (2 TEA, 1 Dev), all ACCEPTED — see the
`### Reviewer (audit)` block under Design Deviations.

**Devil's Advocate:** The strongest attack is that the values are only as
trustworthy as the audit, and raw ROM bytes are not in this checkout to
cross-check. True — but the audit is the story's designated, committed source of
truth; it cites each ROM symbol and carries an explicit load-bearing warning
about the exact ×10 error a careless port would make, and the implementation
matches it to the digit while honouring that warning. The second attack — a 10×
score inflation silently tripping a bonus-life threshold — I chased to ground:
`score` is never compared to any threshold in src/, so nothing keys off its
magnitude, and no extra-life mechanic exists yet. The third — display truncation
at high scores — fails: formatScore uses toLocaleString and the render pads
(never truncates), so a 7-digit score renders fully. A fourth — the new suite
duplicating existing coverage — fails: the pre-existing suites assert scores
symbolically and would pass at either value, so the literal-pin suite closes a
real gap. No attack lands. Approved.

**Handoff:** To SM (The Organic Mechanic) for finish-story. You will ride
eternal, shiny and chrome.