---
story_id: "mc5-7"
jira_key: "mc5-7"
epic: "mc5"
workflow: "tdd"
---
# Story mc5-7: Wave-1 ICBM budget fidelity

## Story Details
- **ID:** mc5-7
- **Jira Key:** mc5-7
- **Epic:** mc5
- **Workflow:** tdd
- **Type:** bug
- **Points:** 2
- **Stack Parent:** none

## Story Summary
Wave-1 ICBM budget fidelity: createGame seeds remaining=NICBMS(8) but the ROM wave-1 budget is ICBWAV[0]=12 (W3MAIN.MAC:5713; loaded LDA AY,ICBWAV-1 / STA ICBTOL :3937). Seed wave 1 from waveSchedule(INITIAL_WAVE).count and re-pin game.test.ts:67; also sweep stale 'max ICBMs on screen' MXICON prose in docs/rom-study/glossary.md + brief.md. REV-01

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-09T19:27:06Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-09T18:48:16Z | 2026-08-09T18:50:00Z | 1m 44s |
| red | 2026-08-09T18:50:00Z | 2026-08-09T19:11:29Z | 21m 29s |
| green | 2026-08-09T19:11:29Z | 2026-08-09T19:21:41Z | 10m 12s |
| review | 2026-08-09T19:21:41Z | 2026-08-09T19:27:06Z | 5m 25s |
| finish | 2026-08-09T19:27:06Z | - | - |

## Branch Information
**Branch Strategy:** gitflow (feat/mc5-7-wave-1-icbm-budget-fidelity)

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings.

### Dev (implementation)
- No upstream findings.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No design deviations.

### Dev (implementation)
- No deviations from spec. Implemented exactly as TEA's "For Dev (GREEN)" section
  specified: seeded `remaining` from `waveSchedule(INITIAL_WAVE).count`, reworded the
  JSDoc, and corrected the MXICON docs prose. On-screen cap logic untouched.

## Sm Assessment

**Story:** mc5-7 — Wave-1 ICBM budget fidelity (REV-01 bug, 2 pts, tdd).

**Scope (from the title — the spec):** `createGame` seeds the wave-1 remaining ICBM
budget as `NICBMS(8)`, but the ROM wave-1 launch budget is `ICBWAV[0]=12`
(W3MAIN.MAC:5713; loaded `LDA AY,ICBWAV-1` / `STA ICBTOL` :3937). Three deliverables:
1. Seed wave 1's remaining budget from `waveSchedule(INITIAL_WAVE).count` (12), not `NICBMS(8)`.
2. Re-pin the affected assertion at `game.test.ts:67`.
3. Sweep stale "max ICBMs on screen" `MXICON` prose in `docs/rom-study/glossary.md`
   and `docs/rom-study/brief.md`.

**Key distinction (do not conflate):** `ICBWAV` is the per-wave *budget* — total ICBMs
launched across the whole wave. `MXICON`/`NICBMS` is the *max on screen at once* — a
different constant governed by the count-1 convention established in mc5-6 (MXICON=7,
NICBMS=8, true ceiling 8). This story touches the budget only; do not disturb the
on-screen cap.

**Fidelity rule:** ROM is canonical. If `waveSchedule(INITIAL_WAVE).count` does not
already equal 12, that is part of what this bug fixes — pin against the ROM value, not
the current shipped seed.

**Routing:** Phased tdd → TEA owns the RED phase next: write the failing test pinning
the wave-1 budget to `ICBWAV[0]=12` sourced via `waveSchedule(INITIAL_WAVE).count`.

## TEA Assessment

**Tests Required:** Yes
**Reason:** REV-01 fidelity bug — a wrong constant is seeded. Behavior is unit-testable.

**Status:** RED (failing — ready for Dev)

**Test Files:**
- `plugins/missile-command/tests/game.test.ts` — re-pinned the fresh-game budget and the
  AC2 budget-conservation assertions from `NICBMS(8)` to the wave-1 launch budget
  `waveSchedule(INITIAL_WAVE).count` = `ICBWAV[0]` = **12**. Added an explicit
  `expect(g.remaining).not.toBe(NICBMS)` guard so the budget can never silently collapse
  back onto the on-screen cap.
- `plugins/missile-command/tests/mc3-playthrough.test.ts` — collateral re-pin: the
  drawdown check + message moved from the stale "NICBMS budget" to the wave-1 ICBWAV
  budget (`< waveSchedule(INITIAL_WAVE).count`). This suite stays GREEN before and after
  the fix (I verified the trajectory ends at `remaining=4` for seeds 1/2/5/11 @ 400
  frames, well under both 8 and 12) — it is a semantics-only re-pin, not part of the RED.

**Tests Written/Changed:** 3 assertions re-pinned + 1 new distinction guard across 2 files.

**RED evidence (direct run, not via testing-runner):**
```
npx vitest run --project missile-command \
  plugins/missile-command/tests/game.test.ts \
  plugins/missile-command/tests/mc3-playthrough.test.ts
→ 2 failed | 22 passed (24)
  game.test.ts AC1 budget seed:  expected 8 to be 12   (createGame seeds NICBMS, ROM wants ICBWAV[0])
  game.test.ts AC2 conservation: expected 4 to be 8    (12−4 conservation vs shipped 8−4)
```
Both failures are for the intended reason — the wrong seed constant — and nothing else.

### Rule Coverage

| Rule (TS lang-review) | Applies? | Coverage |
|---|---|---|
| Non-null assertion on nullable | No | n/a — no `!` introduced |
| Exhaustiveness / `assertNever` | No | n/a — no switch/enum touched |
| Test quality — meaningful assertions | Yes | Every assertion pins a concrete value (12, budget−4, ≠ NICBMS); no `let _ =`, no `assert(true)`, no always-None |
| Magic numbers sourced from core, not hardcoded | Yes | Budget referenced via `waveSchedule(INITIAL_WAVE).count`; the lone literal `12` is a deliberate independent ROM anchor (ICBWAV[0]) documented inline |

**Rules checked:** all applicable TS lang-review checks covered; the rest are not reachable by this diff.
**Self-check:** 0 vacuous assertions found.

### For Dev (GREEN)

Minimal source change:
- `plugins/missile-command/src/core/game.ts:132` — change `remaining: NICBMS,` to
  `remaining: waveSchedule(INITIAL_WAVE).count,` (both `waveSchedule` and `INITIAL_WAVE`
  are already imported at game.ts:58–59). Do **not** touch the on-screen cap logic
  (`headroom = NICBMS − …` in spawn.ts) — that is the correct, separate constant.
- `plugins/missile-command/src/core/game.ts:95` — the JSDoc "the NICBMS budget" is now
  wrong; reword to the wave/ICBWAV budget while you're there.
- Docs sweep (deliverable 3), real paths: `plugins/missile-command/docs/rom-study/glossary.md:33`
  and `plugins/missile-command/docs/rom-study/brief.md:101` — `MXICON=7` is described as
  "max ICBMs on screen at once". Per mc5-6 the true on-screen ceiling is `NICBMS(8)`
  (MXICON is one below via the count−1 convention). Correct that prose so it no longer
  implies 7 is the on-screen ceiling. `NICBMS=8` ("Max enemy ICBMs tracked",
  glossary.md:28 / brief.md:98) is the actual ceiling and is the slot-table size.
- After the change, the two RED failures flip green and the full `missile-command`
  vitest project must stay green.
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/missile-command/src/core/game.ts` — `createGame` now seeds `remaining` from
  `waveSchedule(INITIAL_WAVE).count` (ICBWAV[0]=12) instead of `NICBMS`(8); reworded the
  `remaining` JSDoc to name the ICBWAV launch budget vs the NICBMS on-screen cap. On-screen
  cap logic in `spawn.ts` untouched.
- `plugins/missile-command/docs/rom-study/glossary.md` — corrected stale MXICON prose
  ("Max ICBMs on screen at once" → count−1 loop bound, one below the NICBMS(8) ceiling).
- `plugins/missile-command/docs/rom-study/brief.md` — same MXICON correction.

**Tests:** full `missile-command` project 1009/1009 passing (GREEN). The two RED assertions
in `game.test.ts` (AC1 budget seed → 12, AC2 conservation → 12−4) now pass; `mc3-playthrough.test.ts`
stayed green. Repo-wide `tsc --noEmit` clean.

**Branch:** feat/mc5-7-wave-1-icbm-budget-fidelity (pushed)

**Handoff:** To next phase (verify/review)
## Reviewer Assessment

**Verdict:** APPROVED

mc5-7 is a minimal, correct, ROM-faithful bug fix. `createGame` seeded the wave-1 ICBM
budget `remaining` from `NICBMS` (8, the max-ICBMs-ON-SCREEN cap) when the ROM wave-1
launch budget is `ICBWAV[0]` = 12 (W3MAIN.MAC:5713; `LDA AY,ICBWAV-1 / STA ICBTOL`). The
fix seeds it from `waveSchedule(INITIAL_WAVE).count`. Crucially this is not just
green-passing — it makes wave-1 CONSISTENT with every other wave: the wave-advance path
already seeded `remaining: nextWaveBudget(state.wave)` (= `waveSchedule(wave+1).count`,
game.ts:183), so `createGame` was the lone outlier reading the on-screen cap. The
NICBMS/ICBWAV distinction is preserved everywhere else (game.ts:206/230/245/280/282/285
all remain the genuine on-screen concurrency ceiling; `NICBMS` import not orphaned). The
JSDoc rewording and the glossary/brief MXICON prose corrections are accurate (count−1
convention, true ceiling NICBMS(8), per mc5-6). Tests carry an independent literal anchor
(`.toBe(12)`) plus a `.not.toBe(NICBMS)` distinction guard — non-vacuous and
mutation-resistant.

**Specialist coverage:** [PRE] preflight GREEN (missile-command 1009/1009, tsc clean,
orchestrator 455/455, zero smells); [SEC] security clean (pure core, no I/O, no
wall-clock/entropy, no casts); [RULE] rule-checker clean (26 TS lang-review rules, 0
violations; core purity + magic-number conventions PASS).

**Independent reviewer sweep (beyond subagents):** grepped for any other prose conflating
the wave BUDGET with NICBMS, for stale "max ICBMs on screen" MXICON prose outside the two
swept docs, and for tests outside the two re-pinned files that assume a wave-1 total of 8.
Only game.ts:245 mentions both "NICBMS ceiling" and "budget" — verified it refers to the
on-screen spawn-slot budget (plane-reduced headroom), a legitimately different quantity,
correctly out of scope. No missed sweep; the full-suite green run is the proof no other
test assumed wave-1 == 8.

### Rule Compliance

| # | Check (TS lang-review) | Result |
|---|---|---|
| 1 | Type-safety escapes (`as any`, `!`, ts-ignore) | PASS — none in diff |
| 5 | `.js` extension on relative ESM imports | PASS — new `wave.js` import compliant |
| 8 / 18 / 26 | Test quality — meaningful, non-self-referential assertions | PASS — independent `12` anchor + `.not.toBe(NICBMS)` guard |
| 17 | Comments/docs assert only verified mechanisms | PASS — JSDoc + MXICON prose match ICBWAV/mc5-6 citations |
| 24 | Retirement applied at every site the AC names | PASS — createGame was the only survivor; no conflated NICBMS use left |
| — | Core purity (CLAUDE.md) | PASS — pure table lookup, no clock/entropy, no shell import |
| — | Magic numbers from named core consts | PASS — production sources value from `waveSchedule`; `12` is a test-only cited anchor |

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | Clean | 0 (missile-command 1009/1009, tsc 0, orchestrator 455/455) | Confirmed |
| 2 | reviewer-security | Yes | Clean | 0 | Confirmed |
| 3 | reviewer-rule-checker | Yes | Clean | 0 / 26 rules | Confirmed |
| 4 | reviewer-edge-hunter | N/A | disabled | N/A | Disabled via settings |
| 5 | reviewer-silent-failure-hunter | N/A | disabled | N/A | Disabled via settings |
| 6 | reviewer-test-analyzer | N/A | disabled | N/A | Disabled via settings |
| 7 | reviewer-comment-analyzer | N/A | disabled | N/A | Disabled via settings |
| 8 | reviewer-type-design | N/A | disabled | N/A | Disabled via settings |
| 9 | reviewer-simplifier | N/A | disabled | N/A | Disabled via settings |

**All received: Yes** (3 enabled subagents returned; 6 disabled via `workflow.reviewer_subagents`).

**Decision:** APPROVED — ready for SM finish (PR creation + merge + archive).