---
story_id: "mc3-3"
jira_key: "mc3-3"
epic: "mc3"
workflow: "tdd"
---
# Story mc3-3: Scoring (25/ICBM wave-1) and the play->game-over phase

## Story Details
- **ID:** mc3-3
- **Jira Key:** mc3-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** none
- **PR:** #59 (merged into develop)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-07T14:23:01Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-07T13:49:53Z | 2026-08-07T13:53:28Z | 3m 35s |
| red | 2026-08-07T13:53:28Z | 2026-08-07T14:02:23Z | 8m 55s |
| green | 2026-08-07T14:02:23Z | 2026-08-07T14:09:30Z | 7m 7s |
| review | 2026-08-07T14:09:30Z | 2026-08-07T14:23:01Z | 13m 31s |
| finish | 2026-08-07T14:23:01Z | - | - |

## Sm Assessment

**Story:** mc3-3 — Scoring (25/ICBM wave-1) and the play->game-over phase. 3pt, p1, tdd (phased). Plan tasks 5-6.

**Board checked clean before setup:** no `origin` branch for mc3-3, no live sibling sessions, merge gate clean (zero open PRs). Dependency **mc3-1 (stateful cities) is DONE** — no gate concern (the epic YAML `depends_on` is null; the prose dependency is satisfied).

**Premise measured against the current tree (not trusted from the description):**
- The falsifiable ROM cite is **real**: `ADC I,25` sits at `plugins/missile-command/reference/source/W3MAIN.MAC` **physical line 4091**, under `LDA ICBPTL ;INCREASE POINTS FOR DOWNING ICBMS`, inside the `;ICBM PTS X WAVE NUMBER` block. My first recursive `grep -a` false-emptied on it — verified by direct read. W3MAIN.MAC is double-spaced, so physical 4091 ≈ logical 2045; the story asks for the physical line → cite **4091**.
- **Claims-path correction (the one real defect in the description):** the ACs say "claims/score.json" as shorthand, but missile-command claims live at `docs/rom-study/claims/`. The new MC-ICBPTS(25) claim goes in a NEW `docs/rom-study/claims/score.json` — not a top-level `claims/` (the dup-id trap). AC3 guard is value-based/file-agnostic; no claims move between files.
- Neither `score.ts` nor `state.ts` exists yet — both new, no collision.

**Setup corrections applied (sm-setup returned a bare stub):** filled the context Technical Approach with a `> ⚠` verified-facts banner (ACs left verbatim per the epic YAML), added the missing `**Repos:** arcade` field to this session, and stamped the story `in_progress` (sm-setup left it `backlog`, as it always does). Claim committed (`e691e364`) and the branch pushed to origin to light the sibling probe.

**Handoff:** TEA (Han Solo) — RED phase. Write failing tests for (a) `score.ts` `ICBM_KILL_POINTS=25` + `scoreKills` and the `docs/rom-study/claims/score.json` MC-ICBPTS(25) citation, and (b) `state.ts` `Phase`/`allCitiesDead`/`nextPhase` game-over machine. Keep `purity.test.ts` and `citations.test.ts` green.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Two new pure core modules with concrete behaviour + a new ROM claim — squarely test-first.

**Test Files:**
- `plugins/missile-command/tests/score.test.ts` — AC1: `ICBM_KILL_POINTS=25`, `scoreKills(score,killed)=score+killed*25`, and the MC-ICBPTS(25) claim cited byte-exact at W3MAIN.MAC:4091.
- `plugins/missile-command/tests/state.test.ts` — AC2: `allCitiesDead(cities)` and the `nextPhase` transition table with `'over'` terminal, built on mc3-1's real `field.ts` City model.

**Tests Written:** 22 tests (10 score + 12 state) covering AC1 + AC2. AC3 (purity + no-uncited-literal) is enforced automatically by the existing `src/core` sweeps in `purity.test.ts` / `citations.test.ts` the moment the modules land — this RED does not re-assert them, per the mc3-2 `damage.test.ts` precedent.
**Status:** RED (22 failing — verified by testing-runner, run `mc3-3-tea-red`). Failures are clean feature-absence (self-describing `loadScore`/`loadState` throws + missing-claim assertions), NOT module-resolution stack traces. All 431 other missile-command tests stay green; `tsc --noEmit` (release gate) is green via the variable-specifier dynamic-import idiom.

### Rule Coverage

Applicable checks from `.pennyfarthing/gates/lang-review/typescript.md` (a two-pure-module story; React/#6, async-data/#7, input-validation/#10, error-handling/#11 do not apply):

| Rule | Test(s) | Status |
|------|---------|--------|
| #4/#21 degenerate (not-nullish) input to logic | `allCitiesDead([])` → false; `nextPhase('play', [])` → 'play' | failing |
| #5 `.js` extension on relative imports | all imports use `field.js` / `claims.js` / `score.js` / `state.js` | n/a (in-test, green) |
| #8/#26 test quality — no identity/vacuous assertions | `scoreKills == score+killed*ICBM_KILL_POINTS` PLUS independent literal pins (`toBe(25)`, `toBe(75)`) | failing |
| #15/#25 source-text guard anchored to the real line | MC-ICBPTS byte-check reads physical line 4091 + `toContain('ADC I,25')` fixture-sanity, not a whole-file grep | failing |
| #3 exhaustiveness / terminal transition | `nextPhase` returns only 'play'\|'over'; `'over'` never returns to 'play' (anti-resurrect) | failing |
| #18 real fixtures, not look-alikes | state fixtures built from mc3-1's live `createCities()` / `City`, not hand-rolled | failing |

**Rules checked:** 6 of 6 applicable lang-review rules have test coverage.
**Self-check:** 0 vacuous tests found (every test carries a concrete `expect().toBe/toContain`; the one relational assertion is paired with independent literal pins so it is not an identity).

**Handoff:** To Dev (Yoda) for implementation — GREEN phase.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/missile-command/src/core/score.ts` (NEW) — pure: `ICBM_KILL_POINTS = 25`, `scoreKills(score, killed) = score + killed * ICBM_KILL_POINTS`.
- `plugins/missile-command/src/core/state.ts` (NEW) — pure: `type Phase = 'play'|'over'`, `allCitiesDead(cities)` (non-empty AND all dead), `nextPhase(phase, cities)` with `'over'` terminal. Imports only `type City` from `field.js` (mc3-1).
- `plugins/missile-command/docs/rom-study/claims/score.json` (NEW) — claim `MC-ICBPTS`: value `25`, `W3MAIN.MAC:4091`, verbatim `"\tADC I,25"` (byte-verified by the checker; the vendored line has no CR).
- `plugins/missile-command/tests/citations-source.test.ts` (EDIT) — registered `ICBPTS` in the `DERIVED` symbol set (see deviation below).

**Tests:** 457/457 passing (GREEN — run `mc3-3-dev-green`). New: score 10/10, state 12/12. Guards green: purity, citations (AC3 no-uncited-literal now covers score.ts's `25` via MC-ICBPTS), citations-source. `tsc --noEmit` green. Citation checker CLI: 93 claims verified. Count rose 453→457 because the dynamic `it.each(coreFiles)` sweeps in purity/citations now include the two new modules and pass.

**Fidelity note (measured, not assumed):** `ADC I,25` at W3MAIN.MAC:4091 decodes to **decimal 25** — the file has NO `.RADIX` override (default decimal, unlike W3COMN's `.RADIX 16`) and line 4085 is `SED` (6502 decimal/BCD mode), so the immediate is BCD 25. The famous "25 points/missile" holds; no hex-37 trap.

**Handoff:** To Reviewer (Obi-Wan) for code review.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Question** (non-blocking): The ACs are silent on the DEGENERATE empty-cities
  case, and `[].every(c => !c.alive)` is vacuously `true` — the exact shape that
  burned centipede (`segs:[]` read as a wave-clear). I specced `allCitiesDead([])
  === false` and `nextPhase('play', []) === 'play'` (empty ≠ game-over; a terminal
  state requires cities to have existed and all be dead). Affects `src/core/state.ts`
  (Dev must guard the empty list, not lean on bare `.every()`). If the Reviewer
  prefers the naive reading the fix is one clause; flagging so it is a decision, not
  an accident. *Found by TEA during test design.*
- **Question** (non-blocking): AC/description say `claims/score.json` as shorthand;
  the real path is `docs/rom-study/claims/score.json` (SM already corrected this in
  the context). Affects `docs/rom-study/claims/score.json` (Dev authors it there,
  NOT a top-level `claims/` — the dup-id trap). *Found by TEA during test design.*

### Reviewer (code review)

- **Improvement** (non-blocking): The "25 × wave" scoring formula in three comments
  (`src/core/score.ts` header, `docs/rom-study/claims/score.json` `meaning`, and
  `tests/score.test.ts` GROUND-TRUTH block) is an imprecise gloss. The ROM multiplies
  25 by SMULTI, its SCORE MULTIPLIER (`W3MAIN.MAC:277`) = min(floor((wave+1)/2), MAXMUL),
  which equals `wave` ONLY at wave 1 (exactly what mc3 pins). Code and the pinned value
  25 are correct and faithful. Affects the three comment/`meaning` strings. **mc4 (the
  ×-wave ramp) MUST implement 25 × SMULTI capped at MAXMUL, NOT 25 × wave** — do not
  inherit the gloss. *Found by Reviewer during code review (corroborated by
  comment-analyzer + rule-checker, both against W3MAIN.MAC:277).*
- **Gap** (non-blocking): `ICBPTS` is registered in `citations-source.test.ts`'s
  `DERIVED` set but, unlike siblings STCITY/IVMAX/MAX_BLAST_RADIUS, has no source-
  INDEPENDENT self-consistency check in the "derived values are internally consistent"
  block. Its only verbatim↔real-source tie is score.test.ts's byte-exact check, which is
  `skipIf(!sourceAvailable)`, and the vendored `.MAC` tree is gitignored (verified: `git
  check-ignore` → IGNORED), so it SKIPS on CI. Mutation-proven the gap is narrow: flipping
  the claim value 25→30 still reddens two unconditional tests on CI (the AC3 literal guard
  + the score.test value pin), so accidental drift IS caught — only a coordinated,
  internally-consistent, ROM-wrong 4-file edit escapes, and that is caught locally by the
  byte-check. Affects `tests/citations-source.test.ts` (add one unconditional assertion
  decoding the operand from `ICBPTS`'s verbatim — `verbatim.split(',')[1]` → 25 — and
  comparing to `c.value`, mirroring STCITY's `firstByte` check; this also makes the
  `:190-193` parity comment fully accurate). *Found by Reviewer during code review
  (rule-checker #15).*
- **Improvement** (non-blocking, fleet-wide): `catch (e) { … (e as Error).message }` in
  the new `score.test.ts:64` / `state.test.ts:61` `loadX` helpers matches lang-review #11
  (prefer `catch (e: unknown)` + narrowing). It is the established fleet idiom (identical
  in `damage.test.ts:107`, `icbm.test.ts:78`, `field.test.ts:83`), `e` feeds only a
  message string appended to a thrown Error (never control flow), so severity is LOW and
  the right fix is a fleet-wide convention change, not a mc3-3 carve-out. Affects the RED-
  import helpers across the missile-command test suite. *Found by Reviewer during code
  review (rule-checker #11).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- No design deviations. The RED tests implement the ACs verbatim; the one
  underspecified case (empty city list) is logged as a Question above, not a
  deviation — the spec was silent, so nothing was contradicted.

### Dev (implementation)

- **Registered `ICBPTS` in the `DERIVED` set of `tests/citations-source.test.ts`**
  - Spec source: context-story-mc3-3.md, AC1 ("claims/score.json carries MC-ICBPTS(25)"); tests/score.test.ts (asserts numeric value 25); tests/citations.test.ts §4 AC3 guard (a core literal must be backed by a claim whose `Number(value)` matches).
  - Spec text: AC1 requires a claim `MC-ICBPTS(25)` covering score.ts's literal `25`.
  - Implementation: MC-ICBPTS cites an INSTRUCTION line (`ADC I,25`, no `=` RHS) so it is a non-EQU claim, which `citations-source.test.ts:211` requires to carry a string kind-tag value UNLESS its symbol is in `DERIVED`. To carry the numeric `25` the AC3 guard needs, I added `'ICBPTS'` to `DERIVED` — the exact shape and mechanism STCITY (a numeric `.BYTE` non-EQU claim) already uses.
  - Rationale: a numeric non-EQU claim has no other legal home; the byte checker still verifies its verbatim and `score.test.ts` pins its value 25 — the registration exempts it from the kind-tag rule, it does not weaken any assertion.
  - Severity: minor
  - Forward impact: minor — future instruction-site numeric claims follow the same DERIVED registration; the guard's teeth are unchanged (EQU auto-decode + byte checker + per-claim value tests all still run).

### Reviewer (audit)

- **TEA "No design deviations"** — **ACCEPTED.** The RED tests implement the ACs verbatim; the empty-list interpretation was a gap the spec left open, correctly logged as a Question, not a deviation.
- **Dev "Registered `ICBPTS` in the `DERIVED` set"** — **ACCEPTED.** The registration is necessary and precedented (STCITY is the same numeric non-EQU shape); it exempts ICBPTS from the kind-tag rule without weakening any live assertion — mutation-proven (value 25→30 still reddens the AC3 guard + score.test value pin on CI). One FLAG for a non-blocking follow-up: unlike STCITY, ICBPTS gained no source-independent consistency check in the "derived values" block, and the deviation's "the guard's teeth are unchanged" slightly overstates parity (recorded as the Reviewer Gap finding above). Accepted for this story; parity to be closed as a follow-up.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 457/457 green, tsc clean, 93 claims byte-verified, no smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings; [EDGE] domain assessed by Reviewer (see assessment) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings; [SILENT] domain assessed by Reviewer (see assessment) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings; [TEST] domain assessed by Reviewer (see assessment) |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 (one cluster) | confirmed 1 (non-blocking follow-up), dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings; [TYPE] domain assessed by Reviewer (see assessment) |
| 7 | reviewer-security | Yes | clean | none | N/A — no trust boundary in a pure single-player core module |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings; [SIMPLE] domain assessed by Reviewer (see assessment) |
| 9 | reviewer-rule-checker | Yes | findings | 2 (#15 medium, #11 low ×2) | confirmed 2 (both non-blocking), dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 3 confirmed (all non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

Two pure core modules + one new ROM claim + one guard-test registration. Code, the pinned value 25, and all three ACs are correct and faithful — independently verified three times (Reviewer, comment-analyzer, rule-checker) against `W3MAIN.MAC` (physical line 4091 = `\tADC I,25`; no `.RADIX` override + `SED`/BCD at 4085 ⇒ decimal 25; WAVENO 1-based ⇒ wave-1 yields exactly one `ADC I,25`). 457/457 green, `tsc --noEmit` clean, 93 claims byte-verified.

**Data flow traced:** `scoreKills(score, killed)` → `score + killed * ICBM_KILL_POINTS` (pure, deterministic; no I/O). `nextPhase(phase, cities)` → `'play'|'over'` (terminal `'over'`, guarded empty list). No external input reaches either module (core/shell purity, enforced).

**Dispatch tag coverage** (all 8 tags; disabled specialists' domains assessed by Reviewer directly):
- **[RULE]** rule-checker: 2 findings. **#15 (medium)** ICBPTS lacks a source-independent consistency check → **confirmed, non-blocking** (mutation-proven the value guard still has CI teeth against accidental drift; only a coordinated ROM-wrong 4-file edit escapes, caught locally). **#11 (low ×2)** `(e as Error)` in new loadX helpers → **confirmed, non-blocking** (established fleet idiom, message-only, fleet-wide follow-up). Both recorded as Delivery Findings.
- **[DOC]** comment-analyzer: the "25 × wave" gloss in score.ts / score.json `meaning` / score.test.ts → **confirmed, non-blocking** (real imprecision vs the ROM's × SMULTI, but code + value 25 correct and every instance defers the ramp to mc4; the phrase mirrors the ROM's own comment). Recorded with an explicit mc4 warning.
- **[SEC]** security: clean — no trust boundary; degenerate inputs handled (`allCitiesDead` empty-guard, `nextPhase` terminal).
- **[EDGE]** (self): `allCitiesDead([]) === false` empty-guard present; `nextPhase` transition table complete and terminal; `scoreKills` negative/NaN `killed` unclamped but unreachable (a non-negative kill count) — not a defect for a pure reducer, clamping would be scope creep.
- **[TEST]** (self): real fixtures from mc3-1's live `createCities()`/`City` (not look-alikes); the relational score test is paired with independent literal pins (25/75/150), so it is not a self-referential identity (#26); the byte-exact claim check is bounded to an exact array index with a fixture-sanity pre-check (#15/#25). Non-vacuous.
- **[TYPE]** (self): `Phase` union (no enum cost, exhaustive), `readonly City[]` params, inline `type` import with `.js` extension. Clean.
- **[SILENT]** (self): no swallowed errors, empty catches, or silent fallbacks; the loadX catch re-throws with context.
- **[SIMPLE]** (self): both modules minimal; `nextPhase` reuses `allCitiesDead`; no dead code or over-engineering.

**Error handling:** the loadX RED-import helpers (`score.test.ts:52`, `state.test.ts:48`) catch and re-throw a self-describing Error — good; the `(e as Error)` narrowing nit is the low fleet-idiom follow-up above.

**Why APPROVED despite three confirmed findings:** all three are non-blocking (both specialists said so explicitly), none touches correctness or an AC, and the strongest one (#15) was mutation-proven to be a narrow CI-only gap against a deliberate coordinated edit — the guards demonstrably catch accidental drift on CI. Per proportionality (3pt story), these are follow-ups, not a rework round. Recorded so mc4 corrects the SMULTI formula and the ICBPTS/fleet nits get folded into a cleanup.

**Handoff:** To SM for finish-story.