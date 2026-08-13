---
story_id: ml7-1
jira_key: ml7-1
epic: ml7
workflow: tdd
---
# Story ml7-1: Pure attract/play/death/game-over phase machine

## Story Details
- **ID:** ml7-1
- **Jira Key:** ml7-1
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** feat/ml7-1-attract-phase-machine
- **PR:** 340
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-13T19:57:58Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T19:29:19Z | 2026-08-13T19:32:45Z | 3m 26s |
| red | 2026-08-13T19:32:45Z | 2026-08-13T19:42:47Z | 10m 2s |
| green | 2026-08-13T19:42:47Z | 2026-08-13T19:45:50Z | 3m 3s |
| review | 2026-08-13T19:45:50Z | 2026-08-13T19:57:58Z | 12m 8s |
| finish | 2026-08-13T19:57:58Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- (TEA, non-blocking, Improvement) The `forcePhase`/TS2367 directive in the story title is a
  TYPE-launder with no observable runtime behavior, so there is deliberately no runtime
  `forcePhase` test (would be vacuous — see Rule Coverage). Its gate is `npm run lint`. Dev is
  free to implement `advancePhase` as a clean switch returning phase literals (the pm4-5 shape,
  which does NOT trip TS2367); `forcePhase` is only needed if Dev's chosen shape narrows a phase
  literal. Either way, the behavior suite is the contract.
- (TEA, non-blocking, Gap) The accessibility gate (no full-screen strobe/flash — the owner's
  photosensitive epilepsy) is a RENDER concern with nothing to assert at this pure, render-free
  core layer. It is ml7-4. Kept the transition seam clean (per-edge, single-exit dispatch) so
  ml7-4 has a natural home, but wrote no accessibility test here (it would be vacuous).

### Reviewer (code review)
- **Improvement** (non-blocking): `phase.ts:17` states "the purity / citation scanners strip // but not /** */" — inherited fleet boilerplate that is inaccurate for millipede. Millipede's purity scanner (`tests/helpers/purity-scanner.ts`, AST-based) ignores ALL comment types alike (`purity.test.ts:111` proves `//`, `/* */`, and `/** */` all yield no violations), and its citation checker (`tools/audit/check-citations.mjs`) verifies JSON claim files against `.MAC` source — it never scans `.ts` comments. The `//`-vs-JSDoc rationale is accurate for missile-command's `core-literals.ts` (which millipede has no equivalent of). Affects `plugins/millipede/src/core/phase.ts` (soften/correct the parenthetical — the cite-in-`//` convention is fine to keep; the stated reason isn't). LOW. Natural to fold into ml7-2, which edits this file to wire the machine. *Found by Reviewer during code review (comment-analyzer, verified).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **No `forcePhase` helper — used the pm4-5 return-based switch, which never trips TS2367**
  - Spec source: story title (epic-ml7.yaml ml7-1) / context-story-ml7-1.md, Technical Approach
  - Spec text: "Phase transitions via a forcePhase helper (bare phase-literal assignment reds tsc TS2367)."
  - Implementation: `advancePhase` is a `switch (phase)` that RETURNS phase literals per case (the pm4-5 model the same story names, twice, as primary). No `state.phase = 'x'` assignment exists, so tsc never narrows a literal and TS2367 never fires — verified by `npm run lint` (exit 0). A `forcePhase(p) => p` helper would therefore be unused dead code (lang-review #26; simplify would flag it).
  - Rationale: the title's `forcePhase` directive is conditional on an assignment-based shape ("bare phase-literal assignment reds tsc"); the return-based pm4-5 model the same story mandates removes the assignment and the error together, so the helper is moot.
  - Severity: minor
  - Forward impact: none — ml7-2 wires this machine into a runtime state; if that wiring assigns `state.phase` and hits TS2367, it can add `forcePhase` there where the assignment actually lives.

### Reviewer (audit)
- **No `forcePhase` helper (Dev deviation)** → ✓ **ACCEPTED by Reviewer.** Independently verified by probe: `let next: GamePhase = phase; next = 'play'; if (next === 'attract') …` reds tsc **TS2367 at the comparison** (scratch probe, line 5) — an assignment-based phase machine genuinely hits TS2367 because the assignment narrows the literal, and `forcePhase(p)=>p` is the type-launder that would widen it back. Dev's return-based switch never assigns-then-compares, so it avoids TS2367 entirely (`npm run lint` exit 0 on the real tree, re-confirmed by rule-checker mutation probes). The deviation's rationale is not just sound but the return shape is strictly simpler; a `forcePhase` here would be dead code (#26). The story-title premise is CORRECT (if loosely worded as "assignment" rather than "assignment-then-comparison"); the parenthetical wording in `phase.test.ts` header is substantively accurate and needs no change.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — lint exit 0, millipede 778 pass, orchestrator 481 pass, no smells, no topology-guard trips |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via workflow.reviewer_subagents |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via workflow.reviewer_subagents |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — coverage picked up by rule-checker #8/#18/#26 |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 1, dismissed 1, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — coverage picked up by rule-checker #2/#3/#5 |
| 7 | reviewer-security | Yes | clean | none | N/A — no I/O/injection/cast surface; purity boundary intact |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 41 instances / 33 rules | N/A — exhaustive pass, 0 violations; mutation-verified #2/#3/#28/purity |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 1 confirmed (LOW, non-blocking), 1 dismissed (with evidence), 0 deferred

### Finding dispositions
- **[DOC] comment-analyzer Finding 1 (TS2367 premise "factually false") → DISMISSED.** Refuted by my own probe: the assignment-then-comparison pattern reds **TS2367 at the comparison** (scratch probe line 5). The subagent tested the bare assignment in isolation and missed the literal-narrowing that makes the following comparison red. The story premise and Dev deviation are correct; confirming this would have "corrected" a correct comment and title. (Challenged per the VERIFIED-vs-subagent gate — evidence: my `tsc --noEmit` probe.)
- **[DOC] comment-analyzer Finding 2 (scanner rationale inaccurate for millipede) → CONFIRMED, LOW, non-blocking.** See Delivery Findings `### Reviewer (code review)`. Millipede's purity scanner ignores all comment types and its citation checker reads JSON claims + `.MAC`, not `.ts` comments. Boilerplate inherited from missile-command; harmless; fold into ml7-2.

## Reviewer Assessment

**Verdict:** APPROVED

**Correlation tags:** [SEC] clean — reviewer-security returned no findings; `advancePhase` has no I/O, injection, dynamic-code, prototype-pollution, or cast surface, and the core purity boundary holds (no clock/RNG/DOM/network/shell import; `purity.test.ts` auto-sweep green). [RULE] clean — reviewer-rule-checker checked 33 rules over 41 instances with **0 violations**, mutation-verifying the readonly DTO (TS2540), switch exhaustiveness (TS2366 both by deleting a case and by widening the union), and that the real purity sweep reaches the new file. [DOC] 1 confirmed LOW + 1 dismissed — comment-analyzer's TS2367 finding was refuted by my own probe; its scanner-rationale finding is a confirmed LOW non-blocking doc nit (see Delivery Findings).

**Data flow traced:** `advancePhase(phase, signals)` — the only inputs are a `GamePhase` literal and a `readonly PhaseSignals` DTO of optional booleans + one number. Traced `signals.livesRemaining` end-to-end: read once at `phase.ts:70` as `(livesRemaining ?? 0) > 0`; a negative or `NaN` value fails CLOSED (`> 0` false → `game-over`), never a stuck death. `signals.scoreQualifies` read once at `phase.ts:75`, checked BEFORE `overExpired`, so a qualifying score can never be skipped past the name-entry route. No input reaches an unsafe sink (safe because the function is a pure transition table with no I/O).

**Observations (≥5):**
- [VERIFIED] Switch exhaustiveness is compile-enforced without `default: assertNever` — `phase.ts:65-77` returns `GamePhase` (excludes `undefined`) from all 5 cases; rule-checker mutation-proved deleting a case OR widening the union both red TS2366. Complies with lang-review #3 via the return-type mechanism (equally valid). Evidence: `phase.ts:66` switch + `strict:true` (tsconfig.json).
- [VERIFIED] `PhaseSignals` all 7 fields `readonly` (`phase.ts:41-55`); writing `signals.x=…` inside the function reds TS2540 (rule-checker probe). Complies with lang-review #2. Purity is a compile-time guarantee, not just the frozen-input runtime test.
- [VERIFIED] `??` (not `||`) on the nullable numeric `livesRemaining` — `phase.ts:70`. Complies with lang-review #4/#21; absent/0/negative/NaN all route safely to `game-over`.
- [VERIFIED] ROM citations accurate — independently re-read `MLATR.MAC:21` (ATTRACT MODE ACTION), `:126` (MODE FE INITIALIZATION), `:313` (MODE FF). Consistent `.SBTTL`-line citation style, routine label named one line below. No dossier claim needed (constant-free — no numeric game constant introduced).
- [TEST] Tests are non-vacuous — `EXPECTED_PHASES` (test-local) compared to `PHASES` (from the module), transitions assert a DIFFERENT phase than input, `Object.freeze` probes for a future mutation regression. rule-checker #8/#18/#26 confirmed 0 vacuous assertions. The `is deterministic` test is weak (repeatability, not correctness) but honest and non-vacuous — acceptable given the purity contract.
- [DOC] LOW: `phase.ts:17` scanner rationale inaccurate for millipede (see Delivery Findings) — non-blocking.
- [VERIFIED] Scope discipline held — no `stepGame`/render/audio/HUD/accessibility code; the module is unwired by design (ml7-2/3/4 own those). `git diff` confirms only `phase.ts` + `phase.test.ts` code files.

**Deviation audit:** 1 Dev deviation (no `forcePhase`), stamped ✓ ACCEPTED (see `### Reviewer (audit)`), verified by independent TS2367 probe. No undocumented deviations found.

### Devil's Advocate
Argue this is broken. First attack: **the missing `default` arm.** In pure JS, `advancePhase('bogus', {})` returns `undefined`, and nothing throws — a classic silent failure. Could a bad value reach it? Only from an untyped boundary: a deserialized save-game, a `JSON.parse` of persisted phase, or a cast at the ml7-2 wiring seam. In THIS story there is no such boundary (the module is unwired and every caller is type-checked), but ml7-2 must not feed it a raw string from storage without validation — I flag this as a forward assumption, not a current defect. Second attack: **the `game-over` precedence.** `scoreQualifies` is checked before `overExpired`; if a caller ever sets `scoreQualifies` true on a frame where the score does NOT actually qualify (a miswired signal), a non-qualifier would be dumped into name entry. But that is a wiring bug in ml7-2, not here — the pure machine faithfully does what the boolean says, and the DTO field is documented as "computed from `qualifiesForHighScore`". Third: **`death → play` always respawns** — is there a path where `deathExpired` fires with 0 lives left, respawning a dead player? No: `play` routes the 0-lives death straight to `game-over` (`phase.ts:70`), so `death` is only ever entered with lives remaining; the respawn is always valid. Fourth: **`livesRemaining` degenerate values** — a negative or NaN count. `(x ?? 0) > 0` is false for both, so they fail safe to `game-over` rather than looping in `death`. Fifth: **a confused future reader** trusting the `phase.ts:17` comment believes millipede has a citation scanner over `.ts` source; it does not — the confirmed LOW finding. None of these five uncovers a Critical/High defect in the shipped pure module; the two real forward risks (untyped phase from storage; a miswired `scoreQualifies`) both live in ml7-2's wiring and are worth a note there.

**Handoff:** To SM for finish-story.

**Yoda (Dev) — GREEN complete.** Implementation committed at `a61cd5b9` and pushed to
`origin/feat/ml7-1-attract-phase-machine`.

**Built:** `plugins/millipede/src/core/phase.ts` (80 lines) — the pure, unwired,
constant-free phase machine exactly to TEA's spec (pm4-5 model):
- `type GamePhase = 'attract' | 'play' | 'death' | 'game-over' | 'entry'`
- `const PHASES: readonly GamePhase[]` (the five phases, `as const`)
- `interface PhaseSignals` — all `readonly` optional (`startRequested`, `playerDied`,
  `livesRemaining?: number`, `deathExpired`, `scoreQualifies`, `overExpired`, `entryComplete`)
- `function advancePhase(phase, signals): GamePhase` — a `switch (phase)` returning phase
  literals per case; the game-over case checks `scoreQualifies` before `overExpired`.

**Verification (evidence, not assertion):**
- `npm run lint` (tsc --noEmit, repo-wide) → **exit 0**. Confirms no TS2367, and the
  `EXPECTED_PHASES: GamePhase[]` type-extension check compiles.
- testing-runner RUN_ID `ml7-1-dev-green`, full `--project millipede`:
  **34 files pass, 778 tests pass, 5 skipped, 0 failures/regressions.** `phase.test.ts`
  all green.
- The `purity.test.ts` auto-sweep (one of the 34 green files) covers the new
  `src/core/phase.ts` — it is clock/DOM/entropy/network/shell-import-free (a pure switch).

**Scope discipline:** no runtime wiring, render, audio, HUD, or accessibility code added —
those are ml7-2/ml7-3/ml7-4. No numeric constant introduced (no dossier claim needed).

**Deviation logged:** did not add a `forcePhase` helper — the return-based pm4-5 switch never
trips TS2367, so the helper would be unused dead code. See `### Dev (implementation)` in Design
Deviations for the full 6-field entry. This is the one place a reviewer should look given the
title names `forcePhase`.

**Handoff:** → Reviewer (Obi-Wan) for review. Diff base is `origin/develop` (gitflow); the two
new files are `plugins/millipede/src/core/phase.ts` and `plugins/millipede/tests/phase.test.ts`.

## Tea Assessment

**Han Solo (TEA) — RED complete.** Failing suite committed at `406137ec`:
`plugins/millipede/tests/phase.test.ts` (169 lines, 18 tests).

**RED verified (testing-runner, RUN_ID ml7-1-tea-red):** full `--project millipede` run —
757 pass / 0 fail across 33 files, and the new `phase.test.ts` fails at import
(`Cannot find module '../src/core/phase'`, line 46). Feature-absent, not a test defect. No
regressions in the pre-existing suite. This is the canonical brand-new-core-module RED (same
shape as `purity.test.ts`'s "not built yet").

### What Dev must build (GREEN)
Create `plugins/millipede/src/core/phase.ts` — a PURE, UNWIRED, CONSTANT-FREE module (the
pm4-5 model: `plugins/pac-man/src/core/phase.ts`). It introduces no numeric game constant, so
it carries no dossier claim (like missile-command's `state.ts`). Exports the tests import:
- `type GamePhase = 'attract' | 'play' | 'death' | 'game-over' | 'entry'`
- `const PHASES: readonly GamePhase[]` — the five phases, single runtime list.
- `interface PhaseSignals` — `readonly` optional booleans + `livesRemaining?: number`:
  `startRequested`, `playerDied`, `livesRemaining`, `deathExpired`, `scoreQualifies`,
  `overExpired`, `entryComplete`.
- `function advancePhase(phase: GamePhase, signals: PhaseSignals): GamePhase` — the MAINLINE
  dispatch, pure (reads only its args, mutates nothing, no clock/RNG).

**The edges the suite pins:**
- `attract` → `play` on `startRequested` (MLATR.MAC:21/126/313 attract mode).
- `play` → `death` if `playerDied` && `(livesRemaining ?? 0) > 0`; else → `game-over`
  (absent `livesRemaining` ⇒ game-over, never a stuck death).
- `death` → `play` on `deathExpired` (respawn; the frame constant is ml7-2's).
- `game-over` → `entry` on `scoreQualifies` (the headline edge; caller derives it from
  `core/highscore.ts` `qualifiesForHighScore(table, score)`). `scoreQualifies` WINS over
  `overExpired` on the same frame (never skip name entry). Non-qualifying holds until
  `overExpired`, then → `attract`.
- `entry` → `attract` on `entryComplete`.
- Every phase holds itself when no relevant signal fires.

**Scope fence (do NOT cross):** no `stepGame`/runtime wiring (ml7-2), no sound (ml6), no
render/HUD (ml7-3), no full accessibility gate (ml7-4). This story changes no runtime.

### Rule Coverage (typescript.md lang-review)
| Check | How covered |
|-------|-------------|
| #3 exhaustive dispatch over the union | "every phase with no signal stays put" loops ALL `PHASES` through `advancePhase` and expects the same phase back — an unhandled phase returns `undefined` and reddens. Runtime exhaustiveness teeth even without `assertNever` (Dev SHOULD still add `default: assertNever(phase)` for compile-time teeth when a 6th phase is added). |
| #4 `??` vs `||` on nullable numeric | "an absent livesRemaining is treated as none left (game-over)" pins `(livesRemaining ?? 0) > 0`; a `livesRemaining: 0` case is distinct from absent — both must reach game-over. |
| #8/#26 test quality — no `as any`, no all-local assertions | No `as any`. `EXPECTED_PHASES` (test-local) is compared to `PHASES` (from the module under test), so one term always comes from production. |
| #18 fixture-is-expectation | Avoided: transitions assert a DIFFERENT phase than the input; the loop test uses the input phase as the expectation only for the HOLD case, which is the behavior under test. |
| #15/#25 source-text token guards | None used — all assertions are behavioral (`.toBe(phase)`). The `forcePhase` directive is intentionally NOT source-text-guarded (see Delivery Findings). |
| type-extension teeth | `const EXPECTED_PHASES: GamePhase[] = [...]` reds `npm run lint` until the union is declared exactly five wide — compile-time RED alongside the runtime RED. |

**Handoff:** → Dev (Yoda) for GREEN. Purity sweep (`purity.test.ts`) auto-covers the new
`src/core/phase.ts` — keep it clock/DOM/entropy-free (the pure dispatch is trivially so).

## Sm Assessment

**Story:** ml7-1 (5pt, p3, tdd) — create the PURE, UNWIRED millipede attract/play/death/
game-over phase machine (pm4-5 model). Runtime wiring is ml7-2, OUT OF SCOPE.

**Board / contention probes (before setup):** clean.
- No `ml7` branches on origin; merge gate clean (no open PRs).
- Only sibling session was `a-2/.session/ml3-6-session.md` — a *different*, now-merged
  story (PR #336), no overlap with ml7-1.
- Claim pushed for visibility: branch `feat/ml7-1-attract-phase-machine` (setup commit
  `eb43570e`); story stamped `in_progress`.

**Premise verification (against HEAD ff0c6fa0 — both facts confirmed true):**
1. The ml5 name-entry route target EXISTS — `plugins/millipede/src/core/highscore.ts:34`
   imports `stepNameEntry` from `@shared/name-entry` (ml5-3 shipped). Game-over routes
   into this existing seam.
2. No game-level phase machine exists yet — the `phase` fields in `src/core/conway.ts`
   are Conway-growth phases, unrelated. This story creates the phase machine.
No stale/falsifiable claim in the description needed correcting; no either/or AC needing
a user ruling.

**Context:** `pf context create` wrote a bare stub (known behavior); I enriched
`sprint/context/context-story-ml7-1.md` with the verified premise facts, the pm4-5 model
pointer, the forcePhase/TS2367 constraint, the ml5 seam location, the accessibility
seam note (full gate = ml7-4, keep transition seam freeze/fade-friendly), and the design
doc reference. **ACs intentionally left for TEA to define in RED** (tdd) — none exist in
the sprint YAML, and the title + enriched approach give TEA a solid basis.

**Handoff:** → TEA (Han Solo) for RED. Watch items: keep `src/core/` purity boundary
green; design the `forcePhase` seam in from the first test; do not pull ml7-2 wiring or
ml7-4's full accessibility scope into this story.

## Impact Summary

**Verdict:** APPROVED (1 review round). **Blocking:** 0.

**Scope:** Pure, unwired Millipede phase machine — `plugins/millipede/src/core/phase.ts` (80
lines) + `plugins/millipede/tests/phase.test.ts` (169 lines). The pm4-5 model: `advancePhase`
over the five-phase `GamePhase` union (attract/play/death/game-over/entry), with a qualifying
game-over routing to the ml5 name-entry `entry` phase. Constant-free → no dossier claim. No
runtime wiring (ml7-2), HUD (ml7-3), or accessibility gate (ml7-4).

**Quality gates (all passed):** lint exit 0; millipede 778 pass / 5 skip; orchestrator 481
pass / 0 fail; trial-merge of `origin/develop` (which moved with ml3-6 bookkeeping) clean and
green on the merged tree. Security clean. Rule-checker: 33 rules / 41 instances / **0
violations**, mutation-verifying the readonly DTO (TS2540), switch exhaustiveness (TS2366),
and purity-sweep coverage.

**Findings:** 1 confirmed **non-blocking LOW** — `phase.ts:17` scanner rationale is fleet
boilerplate inaccurate for millipede (fold into ml7-2). 1 **dismissed** with evidence — the
TS2367 "factually false" claim was refuted by an SM/Reviewer probe (assignment-then-comparison
does red TS2367); the story premise and the no-`forcePhase` deviation are correct.

**Deviation (ACCEPTED):** No `forcePhase` helper — the return-based switch never
assigns-then-compares, so it avoids TS2367; a helper would be dead code (#26).

**Forward notes for ml7-2 (not defects here):** (a) validate/type-check any deserialized phase
string before passing to `advancePhase` (no `default: assertNever` runtime guard); (b) ensure
the `scoreQualifies` signal is computed accurately from `qualifiesForHighScore`.