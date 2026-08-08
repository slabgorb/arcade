---
story_id: "mc4-3"
jira_key: "mc4-3"
epic: "mc4"
workflow: "tdd"
---
# Story mc4-3: Per-wave score multiplier: generalise the per-ICBM value by wave (capped at MAXMUL)

## Story Details
- **ID:** mc4-3
- **Jira Key:** mc4-3
- **Workflow:** tdd
- **Repos:** arcade
- **Points:** 2
- **Stack Parent:** none
- **Branch:** feat/mc4-3-wave-score-multiplier
- **PR:** https://github.com/slabgorb/arcade/pull/93

## Acceptance Criteria
- scoreKills scales the kill value by the current wave multiplier capped at MAXMUL: a kill on wave 1 adds 25, a later wave adds 25 x wave up to the cited cap, and the cap is never exceeded.
- the generalised multiplier cites its claims (MC-ICBPTS/MC-MAXMUL); citations.test.ts and purity.test.ts stay green.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-08T09:37:29Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-08T07:25:44Z | 2026-08-08T07:29:32Z | 3m 48s |
| red | 2026-08-08T07:29:32Z | 2026-08-08T09:25:17Z | 1h 55m |
| green | 2026-08-08T09:25:17Z | 2026-08-08T09:32:04Z | 6m 47s |
| review | 2026-08-08T09:32:04Z | 2026-08-08T09:37:29Z | 5m 25s |
| finish | 2026-08-08T09:37:29Z | - | - |

## SM Assessment

**Setup for RED — mc4-3 scoped to part (a): the per-wave score multiplier.**

Measured the story's falsifiable premise before setup (per SM discipline) and found part (b) was mis-cited. The story's part (b) named claim MC-SCITYM as the bonus-city score threshold, but MC-SCITYM (=3, W3COMN.MAC:195, `SCITYM =03 ;5 CITIES AT START (OPTIO2 MASK)`) is the OPTIO2 starting-cities option mask — used only as `AND I,SCITYM`, never compared to a score. The real bonus-city mechanic is CHEKBO (W3MAIN.MAC:5621), which divides the running score by an interval from the BONINL table selected by `OPTIO2 & BONMSK`; no claim exists for that interval yet. Per the user's ruling, part (b) was **split out** into new story **mc4-5** (3pt, depends_on mc4-2). mc4-3 was retitled and narrowed to part (a): 2 ACs, 2 points.

**Ground truth for TEA (both claims verified present + decoded against the in-tree source):**
- MC-ICBPTS = 25 — `plugins/missile-command/docs/rom-study/claims/score.json` — W3MAIN.MAC:4091, verbatim `ADC I,25` (wave-1 per-ICBM points).
- MC-MAXMUL = 6 — `plugins/missile-command/docs/rom-study/claims/config.json` — W3COMN.MAC:201, verbatim `MAXMUL =6 ;MAX SCORE MULTIPLIER` (multiplier cap).
- The change lands in `plugins/missile-command/src/core/score.ts` (the `scoreKills` path). Generalise: per-ICBM value = 25 × min(wave, 6). Wave number is provided by mc4-1 (done). Do NOT re-introduce bonus-city behaviour or cite MC-SCITYM — that is mc4-5's scope.

**Board hygiene:** sibling probes clean at setup (no other mc4-3 branch/session); merge gate clean; claim committed + pushed on `feat/mc4-3-wave-score-multiplier`; status stamped in_progress.

**Handoff → Tyr One-Handed (TEA), RED:** write failing tests for the two ACs (multiplier scaling capped at MAXMUL; the multiplier cites MC-ICBPTS/MC-MAXMUL), keeping `citations.test.ts` and `purity.test.ts` green.

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a — a behaviour change to a pure core module (`score.ts`).

**Test Files:**
- `plugins/missile-command/tests/score-multiplier.test.ts` (new) — the per-wave score multiplier: `scoreMultiplier(wave) = min((wave+1)>>1, 6)` and `scoreKills(score, killed, wave=1)` applying `25 × multiplier` per kill.
- `plugins/missile-command/tests/wave-transition.test.ts` (comment only) — corrected a stale mc4-3 forward-reference ("scoreKills × wave" → SMULTI; bonus city → mc4-5). No assertion touched.

**Tests Written:** 37 tests covering AC1 (multiplier ramp + `scoreKills` application) and AC2 (claims MC-ICBPTS/MC-MAXMUL tie-in).
**Status:** RED — 35 failing in the new file (2 AC2 claim-existence assertions pass, being pre-existing infrastructure); 712 passing elsewhere (mc3-3/game/wave-transition intact); `tsc --noEmit` green.

**Ground truth:** W3MAIN.MAC:4063-4095 — `LDA WAVENO / CLC / ADC I,1 / LSR / CMP I,MAXMUL / clamp → SMULTI`, then the kill loop adds 25 per SMULTI. WAVENO is 1-based (`LDA I,1 "START WITH WAVE 1"`, :3863). Ramp: 1-2→×1, 3-4→×2, 5-6→×3, 7-8→×4, 9-10→×5, 11+→×6 (150 pts/ICBM, capped).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #21 degenerate numeric input | `never returns a multiplier below the wave-1 floor of 1` (wave 0/-1/-50) | failing |
| #18/#26 non-vacuous / independent literals | `MULT_BY_WAVE` truth table + separate `expect(ICBM_KILL_POINTS)`/claim-value anchors | failing |
| #15/#25 source-text token match | n/a — tests key on claim `id`+`value`, not bare-keyword source greps | n/a |
| #5 `.js` ESM imports | dynamic `../src/core/score.js` specifier + `./helpers/claims.js` | pass |
| #8 test quality (no `as any`) | assertions are typed; contract cast is `Partial<ScoreModule>` only | pass |

**Rules checked:** 5 of 26 lang-review rules are applicable to a pure numeric core function; the 2 behavioural ones (#21, #18/#26) have dedicated failing tests.
**Self-check:** 0 vacuous tests (every test asserts a concrete value; the internal-consistency test is backed by independent-literal tests so it is not self-referential).

**Handoff:** To Loki Silvertongue (Dev) for GREEN — implement `scoreMultiplier` + thread optional `wave` (default 1) through `scoreKills`, citing the new literals (see Delivery Findings) to keep `citations.test.ts` green.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/missile-command/src/core/score.ts` — added `scoreMultiplier(wave) = min((max(1,wave)+1)>>1, MAXMUL=6)` (the ROM's SMULTI, W3MAIN.MAC:4063-4079) and threaded an optional `wave = 1` through `scoreKills` so each kill is worth `25 × scoreMultiplier(wave)`.

**Tests:** 747/747 passing in the missile-command project (was 35 failing); full suite 13541/13541; `tsc --noEmit` green.
**AC2 gates:** `citations.test.ts` and `purity.test.ts` green — the only new non-trivial literal is `6` (backed by MC-MAXMUL); arithmetic uses trivial `1`/`2`; ROM prose lives in `//` comments (no JSDoc-number leak).
**Minimalism:** `MAX_SCORE_MULTIPLIER` kept module-local (tests read the MC-MAXMUL claim, not an export); `wave` default = 1 preserves `game.ts`'s 2-arg call with no edit to game.ts (that wiring is mc4-4).
**Branch:** feat/mc4-3-wave-score-multiplier (pushed, GREEN commit 8f5fee5c)

**Handoff:** To Heimdall (Reviewer) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells; 747/747 mc tests, tsc green, citations+purity green | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — assessed by Reviewer (mutation + NaN edge) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — assessed by Reviewer |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — replaced by a 6-mutant battery (6/6 killed) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — ROM comment re-verified line-by-line |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — assessed by Reviewer |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — N/A (pure math core) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — assessed by Reviewer |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — TS checklist assessed by Reviewer (see Rule Compliance) |

**All received:** Yes (1 enabled returned; 8 disabled via `workflow.reviewer_subagents`)
**Total findings:** 0 confirmed blocking, 0 dismissed, 1 deferred (Low, unreachable NaN)

## Reviewer Assessment

**Verdict:** APPROVED

Only `preflight` is enabled on this project (8 of 9 specialists off), so per project practice I replaced the disabled test-analyzer with a **mutation battery** and assessed the other domains directly against the diff and the ROM.

**Observations:**
- `[VERIFIED]` **scoreMultiplier matches the ROM SMULTI** — score.ts:38-41 computes `min((max(1,wave)+1)>>1, 6)`; re-derived against `W3MAIN.MAC:4063-4079` (`LDA WAVENO / ADC I,1 / LSR / CMP I,MAXMUL / clamp`) and WAVENO 1-based at `:3863`. Steps every two waves, caps at 6×. Complies with the ROM-fidelity mandate and the mc4-3 RED ruling.
- `[VERIFIED]` `[TEST]` **mutation battery: 6/6 mutants killed** — drop-`+1` (17 failed), over-halve `>>2` (30), drop-wave-floor (1), drop-cap (8), wrong-cap-`5` (11), drop-multiplier (11). Every arm of the formula is pinned; the "internally consistent" test is not vacuous because independent-literal tables sit beside it. File restored clean (score.ts is tracked). No vacuous assertions.
- `[VERIFIED]` `[DOC]` **the ROM-derivation comment is accurate, not merely reasoned** — score.ts:14-30 cites 4063-4069, 4071-4075, 3863, 4083, 201; each checked against the vendored source (addresses TS #17). The `wave-transition.test.ts` comment fix correctly retires the stale "scoreKills × wave" / bonus-city wording. score.ts header updated from "25 × wave" to "25 × wave-multiplier".
- `[VERIFIED]` `[RULE]` **AC2 citation gate green** — the only new non-trivial literal is `6` (backed by MC-MAXMUL); the `(wave+1)>>1` arithmetic uses trivial `1`/`2`; all ROM prose sits in `//` line comments (no JSDoc-number leak). `citations.test.ts`, `citations-source.test.ts`, `purity.test.ts` all pass.
- `[VERIFIED]` `[TYPE]` **type design is consistent** — `wave: number` matches the plain-number wave convention used throughout wave.ts; no stringly-typed API, no `as any`. The `Partial<ScoreModule>` cast in the test loader is the fleet's tsc-green RED idiom (mc3-3), not a type escape.
- `[VERIFIED]` `[SIMPLE]` **minimal implementation** — `MAX_SCORE_MULTIPLIER` kept module-local (no gratuitous export), no dead code, idiomatic `Math.min`/`Math.max`/`>>`. No over-engineering.
- `[VERIFIED]` `[SILENT]` **no swallowed failure** — the default `wave = 1` is an explicit base-rate fallback, not an error swallow; the only silent risk (mc4-4 forgetting to thread the live wave → multiplier stuck at ×1) is already tracked as a TEA Gap finding for mc4-4.
- `[LOW]` `[EDGE]` **`scoreMultiplier(NaN)` returns 0** — `Math.max(1, NaN) = NaN`, `NaN >> 1 = 0`, `min(0,6) = 0`, a degenerate scoring hole. **Deferred, non-blocking:** `wave` originates from the integer wave counter (`GameState.wave`, ≥1), so NaN/Infinity are unreachable; a finite-guard would be defensive scope creep no test requires. Flagged for the day the input becomes externally sourced.
- `[SEC]` **N/A** — pure arithmetic core module: no I/O, no auth, no tenant data, no user-string parsing.

### Rule Compliance (TS lang-review checklist)

| Rule | Applies? | Verdict |
|------|----------|---------|
| #1 type-safety escapes | yes | Compliant — no `as any`/`@ts-ignore`; `Partial<>` cast justified |
| #4 null/undefined (`??` vs `\|\|`) | no | No nullish defaulting; `wave` uses a plain default param |
| #5 `.js` ESM imports | yes | Compliant — `../src/core/score.js`, `./helpers/claims.js` |
| #17 comments assert a re-run mechanism | yes | Compliant — every ROM citation re-verified against source |
| #18/#26 non-vacuous / self-referential tests | yes | Compliant — mutation-proven 6/6; independent-literal tables |
| #21 degenerate numeric input | yes | Compliant for the reachable domain (clamp `Math.max(1,wave)`); NaN residual noted Low/unreachable |
| #6 React, #7 async, #10 input validation | no | N/A — pure sync numeric function |

### Devil's Advocate

Argue this is broken. First, the multiplier could be a lie: if WAVENO were 0-based, `min((wave+1)>>1,6)` would give wave 1 → 0 points, blanking scoring on the opening wave — but `W3MAIN.MAC:3863` (`LDA I,1 ;START WITH WAVE 1`) and wave.ts's `INITIAL_WAVE = 1` both confirm 1-based, and the tests pin wave 1 = 25, so this fails to break. Second, integer overflow: at a colossal score the running total plus `killed × 150` could exceed `Number.MAX_SAFE_INTEGER` — but Missile Command scores top out in the hundreds of thousands (BCD, six digits) long before 2^53, so unreachable. Third, the `>>` operator: for a fractional `wave` (say 3.5) `>>` coerces to Int32 and silently floors — a latent surprise — but `wave` is an integer frame-counter field; no caller passes a float. Fourth, NaN/Infinity: `scoreMultiplier(NaN) = 0` and `scoreMultiplier(Infinity) = 6` (Infinity>>1 = 0 actually → min(0,6)=0) — genuinely wrong outputs, and the ONE real soft spot; I keep it as a deferred Low because the input domain is a controlled positive integer. Fifth, the default `wave = 1` is a trap: a confused mc4-4 author could ship the 2-arg call unchanged and never notice the multiplier is inert, because every existing test stays green — but TEA already filed that exact Gap, and it is out of mc4-3's scope by the deliberate split. Sixth, a malicious/confused reader could mis-cite: the ROM comment could drift on the next edit — but the citation is prose, not gated, and I re-ran it now. Nothing here rises to Critical or High: the formula is ROM-exact, the tests discriminate under mutation, and the only wrong-output cases are provably unreachable given the integer wave source.

**Data flow traced:** `wave` (GameState.wave, mc4-4) → `scoreKills` → `scoreMultiplier` → `score + killed × 25 × multiplier`; pure, deterministic, no side effects.
**Pattern observed:** ROM-primitive-as-pure-function (SMULTI) mirroring wave.ts's `waveSchedule`/`scoreMultiplier` at plugins/missile-command/src/core/score.ts:38.
**Error handling:** degenerate `wave ≤ 1` floored to ×1 (score.ts:39); NaN residual deferred (unreachable).
**Handoff:** To SM for finish-story.

## Impact Summary

**Story:** mc4-3 — Per-wave score multiplier (SMULTI). Verdict APPROVED (single round), blocking_count 0.

**Shipped:** `plugins/missile-command/src/core/score.ts` — a pure `scoreMultiplier(wave) = min((max(1,wave)+1)>>1, 6)` and an optional `wave = 1` on `scoreKills`, so a downed ICBM is worth `25 × SMULTI(wave)`. ROM-faithful (W3MAIN.MAC:4063-4079; WAVENO 1-based at :3863; MAXMUL=6 at W3COMN.MAC:201): the multiplier steps every two waves, capped at 6× (1-2→25 … 11+→150). Mutation battery 6/6 killed; citations.test.ts + purity.test.ts green; full suite 13541/13541.

**Findings — all non-blocking and routed:**
- game.ts:129 still passes 2 args (multiplier inert until wired) → **mc4-4** (GameState.wave).
- end-of-wave bonus (waveEndBonus) also scales by SMULTI in the ROM, shipped at base → **mc4-6** (filed this finish).
- scoreMultiplier(NaN)=0 → deferred Low (unreachable; wave is an integer counter).

**Bookkeeping:** AC1 corrected from the stale "25 × wave" to the ROM-faithful SMULTI (commit d83324bd); mc4-6 filed; the wave-transition.test.ts forward-reference comment retired.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): `game.ts:129` calls `scoreKills(state.score, killed.length)` (2-arg), so with the new default `wave = 1` the multiplier stays ×1 in real play until the wave is threaded. Affects `plugins/missile-command/src/core/game.ts` (mc4-4 must pass `GameState.wave` into this call once `GameState.wave` exists). Deliberate for mc4-3's split; flagged so mc4-4 does not miss it. *Found by TEA during test design.*
- **Gap** (non-blocking): the END-OF-WAVE bonus also scales by SMULTI in the ROM — ABMADD adds `LDA I,5` once per SMULTI, and the city bonus loops per SMULTI — but mc4-2's `waveEndBonus` shipped at the BASE (×1) multiplier and explicitly deferred "the ramp" to mc4-3. mc4-3 was rescoped to `scoreKills` only, so the end-of-wave bonus ramp is now owned by **no** story. Affects `plugins/missile-command/src/core/wave.ts` (`waveEndBonus`). **SM: file a story** (per the descoped-findings rule) for mc4-4 or a follow-up. *Found by TEA during test design.*
- **Improvement** (non-blocking): GREEN adds new numeric literals to `src/core/score.ts` (the `1` in `wave+1`, the `>>1`/`2`, the cap `6`). To keep `citations.test.ts` green (AC2), cite them with `//` LINE comments (the mc un-cited-literal scanner is line-based and leaks `/** */` block numbers) — MAXMUL→W3COMN.MAC:201, the ADC I,1 / LSR derivation→W3MAIN.MAC:4067,4069. Affects `plugins/missile-command/src/core/score.ts`. *Found by TEA during test design.*

### Dev (implementation)
- No new upstream findings. TEA's two Gap findings still stand and are for later stories, not mc4-3: `game.ts:129` needs the live wave threaded (mc4-4), and the end-of-wave bonus SMULTI ramp (`waveEndBonus`) is currently unowned (SM to file). Confirmed both against the tree while implementing. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `scoreMultiplier(NaN)`/`(Infinity)` return `0` (a scoring hole) because the input is only clamped for the `< 1` case, not finiteness-checked. Unreachable today (`wave` is the integer wave counter), so deferred — add a `Number.isFinite` guard only if `wave` ever becomes externally sourced. Affects `plugins/missile-command/src/core/score.ts` (`scoreMultiplier`). *Found by Reviewer during code review.*
- **Gap** (non-blocking): the end-of-wave bonus SMULTI ramp (`waveEndBonus`) is currently owned by no story (corroborating TEA's finding) and still needs an SM-filed follow-up (descoped-findings rule). Confirmed real; not duplicate-filed here. Affects `plugins/missile-command/src/core/wave.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **RED tests target the ROM multiplier `min((wave+1)>>1, 6)`, not the AC's "25 × wave"**
  - Spec source: context-story-mc4-3.md, AC1
  - Spec text: "a kill on wave 1 adds 25, a later wave adds 25 x wave up to the cited cap"
  - Implementation: Tests pin per-ICBM = `25 × min((wave+1)>>1, MAXMUL=6)` — the SMULTI ramp that steps every TWO waves (W3MAIN.MAC:4063-4079, `LDA WAVENO / ADC I,1 / LSR / CMP I,MAXMUL / clamp`). This diverges from the AC's "25 × wave" from wave 2 onward (ROM: wave 2 = 25, wave 3 = 50; AC's reading: 50, 75).
  - Rationale: ROM-fidelity sprint (2632); the AC's own leading clause — "the current wave multiplier capped at MAXMUL" — IS `floor((wave+1)/2)`, and "25 × wave" was a mis-paraphrase of the mechanism. Refuted against the source at RED and **ruled ROM-faithful by the user** before any test was written.
  - Severity: major (changes the entire scoring curve, not one value)
  - Forward impact: AC1's parenthetical ("25 x wave") and the story's original wording are now stale — SM should annotate AC1. Dev implements SMULTI; **Reviewer must verify against W3MAIN.MAC:4063-4079, not the AC prose.** No collateral: mc3-3/game/wave-transition suites stay green because `wave` defaults to 1.

### Dev (implementation)
- No deviations from spec. Implemented exactly the TEA contract: `scoreMultiplier` + optional `wave = 1` on `scoreKills`, per `25 × min((max(1,wave)+1)>>1, 6)`. `MAX_SCORE_MULTIPLIER` kept module-local (no test requires an export) — a minimalism choice, not a spec deviation.

### Reviewer (audit)
- **TEA's "RED tests target the ROM multiplier, not the AC's 25 × wave"** → ✓ ACCEPTED by Reviewer: re-derived the formula against `W3MAIN.MAC:4063-4079` and confirmed WAVENO is 1-based (`:3863`); the user ruled ROM-faithful at RED, and this is a ROM-fidelity sprint. The deviation is correct and well-sourced. Follows that SM should annotate AC1's stale "25 × wave" wording at finish.
- **Dev's "No deviations from spec"** → ✓ ACCEPTED by Reviewer: the implementation is the TEA contract exactly; the module-local `MAX_SCORE_MULTIPLIER` is minimalism, not a divergence. No undocumented deviations found.