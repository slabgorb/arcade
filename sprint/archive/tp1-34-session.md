---
story_id: "tp1-34"
jira_key: "tp1-34"
epic: "tp1"
workflow: "trivial"
---
# Story tp1-34: Harden the warp double-pay guard — assert the advanced-start bonus never pays twice after a crash-replay

## Story Details
- **ID:** tp1-34
- **Jira Key:** tp1-34
- **Workflow:** trivial
- **Type:** chore
- **Points:** 1
- **Priority:** p3
- **Repos:** tempest
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** trivial
**Phase:** approved
**Phase Started:** 2026-07-18T14:22:44Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| implement | 2026-07-18T14:22:44Z | - | - |

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `tempest/tests/core/tp1-34.warp-double-pay-guard.test.ts` - new: drives real crash-replay sequences through `stepGame`, asserting the advanced-start bonus pays exactly once (both crash-before-pay and crash-after-pay orderings), plus a determinism pin. No production code changed — the guard was already sound (see Delivery Findings for the trace).

**Tests:** 1687/1687 passing (GREEN) — full suite; new file 3/3
**Branch:** chore/tp1-34-warp-double-pay-guard (commit be13e05, not pushed)

**Handoff:** To review phase

## Acceptance Criteria

1. A test drives a real crash-replay sequence (advanced start with a pending `s.startBonus` > 0 → spike crash → `replayWave` → subsequent wave arrival/ENDWAV) and asserts the advanced-start bonus is paid EXACTLY ONCE across the whole sequence — never twice, and never dropped. Assert on the actual score delta and/or the count of `wave-bonus` events, driven out of the running sim (not by re-deriving the arithmetic).

2. If the test shows the guard can double-pay or drop the bonus after a crash-replay, harden the guard (sim.ts around the ENDWAV payment / replayWave) so it pays exactly once. If the guard is already sound, the test hardens coverage — record explicitly that no production change was needed and why.

3. npm test -- citations stays green (and `node tools/audit/reanchor-citations.mjs` reports 0 lost if any cited file is touched).

## Background

**The Guard:** The advanced-start "skill-step" bonus is `s.startBonus` (set by `startWaveBonus(level)` at sim.ts:707). It is paid EXACTLY ONCE at ENDWAV (sim.ts:878-882: `if (s.startBonus > 0) { push wave-bonus event; awardScore } ; s.startBonus = 0`), cited to the ROM's "CLEAR BONUS on arrival, paid exactly once" (ALWELG.MAC:114-117) + tp1-13/S-015.

**The Crash-Replay Path:** A warp SPIKE CRASH replays the same wave via `replayWave(s)` (sim.ts:892, from tp1-10/WD-015); its comment says the pending advanced-start bonus is NOT paid on replay (no arrival). This story HARDENS that guarantee with a test.

**Key Files:**
- `src/core/sim.ts`: startBonus set at :707, paid at :878-882, replayWave at :892, crash/replay path at :998-1009
- ROM: `~/Projects/tempest-source-text/ALWELG.MAC` (LF copy — NEVER CRLF sibling): CLEAR BONUS 114-117

## Delivery Findings

No upstream findings.

### Dev (implementation)
- **Verdict — guard already sound, no production change** (non-blocking): Added
  `tests/core/tp1-34.warp-double-pay-guard.test.ts` driving the real sim
  (`stepGame`) through two crash-replay sequences at an advanced start (wave 3,
  ROM skill-step bonus 6,000 points — BONPTM[1], ALWELG.MAC:266-277):
  (1) crash onto a spike BEFORE the bonus is ever paid (via `crashOntoSpike`,
  which drives `stepGame` through `checkLevelClear` → warp descent →
  `resolveWarpSpikeHit` crash → `dying` → `replayWave` → back to `playing` on
  the SAME wave), then a clean second dive (`diveSuccessfully`) that reaches
  ENDWAV/`beginFlyIn` and pays the bonus — asserts exactly one `wave-bonus`
  event and `score === 6,000` across the whole sequence; (2) a clean dive that
  pays the bonus first, THEN a crash-replay on the NEXT wave (bonus already
  cleared) followed by another clean dive — asserts still exactly one
  `wave-bonus` total and the score never moves past 6,000. A third test pins
  determinism (`toEqual` on two identical seeded runs).
  Traced why no hardening was needed: `startWaveBonus(level)` (rules.ts:171,
  called from sim.ts:707) is invoked in exactly ONE place —
  `startGameAtLevel`, i.e. only at a fresh game's level select. Neither
  `replayWave` (sim.ts:892-906, the crash path) nor `loadNextWave` (sim.ts:842-854,
  the normal wave-advance path) ever writes a positive value to `s.startBonus`.
  The only other write is `beginFlyIn`'s `s.startBonus = 0` (sim.ts:882) after
  the guarded payment. So once cleared, `s.startBonus` can never become
  positive again short of starting an entirely new game — a double-pay or a
  drop is structurally unreachable, not merely untested. ROM citation:
  "CLEAR BONUS" on arrival, ALWELG.MAC:114-117 (tp1-13/S-015).
  **Gate numbers:** new file 3/3 passing; full suite 145 files / 1687 tests
  (was 144/1684) all green; `npm run build` clean; `npm test -- citations`
  4 files / 25 tests green; `node tools/audit/reanchor-citations.mjs` → 103
  present, 0 lost, 0 skipped (no cited file was touched). Commit `be13e05`
  on `chore/tp1-34-warp-double-pay-guard`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Verdict confirmed — guard is genuinely double-pay-proof; tests non-vacuous**
  (non-blocking): Independently traced every write to `s.startBonus` in
  `src/core` — the only positive write is `s.startBonus = startWaveBonus(level)`
  at sim.ts:707, reachable ONLY through `startGameAtLevel`, which is called from
  exactly two sites: the select-commit (sim.ts:1150, a fresh real game) and
  `seedDemo` (sim.ts:1100, the attract demo). Neither is on the crash/replay or
  wave-advance path. The crash path is fully closed: `resolveWarpSpikeHit`
  (sim.ts:934-948) pushes `warp-spike-crash` and returns true, so stepWarp
  early-returns at :1003 and `beginFlyIn` is NEVER reached on a crash — the crash
  pays nothing; then `killPlayer`→`dying`→`respawn` (warp.progress>0)→`replayWave`
  (sim.ts:892-906) re-seats geometry/spikes/spawn but never touches `s.startBonus`.
  `beginFlyIn`'s `s.startBonus = 0` (sim.ts:882) is unconditional, so even a
  re-entry cannot re-pay. Conclusion: once cleared, `s.startBonus` is unreachable-
  positive short of a new game. The "already sound, no production change" verdict
  is CORRECT.
- **Tests non-vacuous — but the re-arm guard lives in TEST 2, not test 1**
  (non-blocking, coverage nuance): Both tests drive a REAL crash through
  `stepGame` and assert `warp-spike-crash` fired exactly once (staging assert,
  lines 124-125) — no hand-poked state, the crash genuinely happens. Test 2
  (crash AFTER pay) is the load-bearing double-pay guard: the bonus is cleared to
  0 by the first dive, so if `replayWave` re-armed `s.startBonus` to any positive
  value, the second dive's `beginFlyIn` would emit a SECOND `wave-bonus` and push
  score past 6,000 — the `toHaveLength(1)` (line 184) and `.toBe(WAVE_3_BONUS)`
  (line 186) assertions go red. CONFIRMED it fails on a re-arm. Note for whoever
  maintains this suite: test 1 (crash BEFORE pay) is INSENSITIVE to a `replayWave`
  re-arm — the bonus is still 6,000 when the crash hits, so re-arming to
  `startWaveBonus(3)`=6,000 is a no-op and the single later payment still totals
  6,000. Test 1 instead pins the *drop* case and the *crash-pays* case (its
  `score === 0` after-crash assert, line 141). Do not delete test 2 assuming
  test 1 covers the re-arm — it does not. *Found by Reviewer during code review.*
- **Gate numbers (re-run by Reviewer):** `npm test` → 145 files / 1687 tests, all
  green (matches Dev). `npm run build` → clean (exit 0). `npm test -- tp1-34` →
  3/3. `npm test -- citations` → 4 files / 25 tests green.
  `node tools/audit/reanchor-citations.mjs` → 103 present, 0 lost, 0 skipped.
  Diff is test-only: `git diff origin/develop...HEAD` = one added file
  (`tests/core/tp1-34.warp-double-pay-guard.test.ts`, +198), zero `src/` changes.
  *Found by Reviewer during code review.*

## Design Deviations

### Dev (implementation)
- **No production change made:** AC-2 conditionally calls for hardening the
  guard only if the test reveals a double-pay/drop. It does not — see
  Delivery Findings above for the trace proving `s.startBonus` cannot be
  re-armed after being cleared. The deliverable is the new characterization
  test alone.
