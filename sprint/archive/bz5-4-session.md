---
story_id: "bz5-4"
jira_key: "bz5-4"
epic: "bz5"
workflow: "tdd"
---
# Story bz5-4: Enemy AI cross-check against MAME + BZONE.MAC together

## Story Details
- **ID:** bz5-4
- **Jira Key:** bz5-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** none
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T00:21:07Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-05T22:55:45Z | 2026-08-05T22:57:41Z | 1m 56s |
| red | 2026-08-05T22:57:41Z | 2026-08-05T23:28:43Z | 31m 2s |
| green | 2026-08-05T23:28:43Z | 2026-08-05T23:47:42Z | 18m 59s |
| review | 2026-08-05T23:47:42Z | 2026-08-06T00:21:07Z | 33m 25s |
| finish | 2026-08-06T00:21:07Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **Gap (non-blocking):** MAME's driver source cannot second-source the enemy-AI *logic* (turn rate, standoff, flank/charge, fire-on-sweep, GetTankType) — that logic is the ROM MAME executes, not reimplemented C. A literal AC1 "executed-behaviour" cross-check would need a running-MAME telemetry capture. Recorded in findings §11.2 as an open item for a human ruling; recommended non-blocking (bz1–bz4 already fixed the logic against the disassembly and this pass found no contradicting evidence).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **RED phase produced PASSING pins, not a failing test**
  - Spec source: context-story-bz5-4.md, AC3
  - Spec text: "Any behavior change lands only where both sources agree the clone diverged, with the existing enemy suites … staying green."
  - Implementation: The MAME cross-check found FULL agreement (4 CONFIRMEDs) and no divergence, so no failing test was written — the new `enemies-mame-crosscheck.test.ts` pins the confirmed second-source agreements (green regression guards) rather than a RED.
  - Rationale: AC3's precondition (both sources agree the clone is wrong) is unmet; fabricating a failing test to force a "RED" would manufacture a divergence the sources do not support, violating the story's verification-first mandate.
  - Severity: minor
  - Forward impact: Dev's green phase is a confirm-green no-op — no source change is warranted; the deliverable is the findings §11.2 + the pins, both committed.
- **AI *logic* axes are not second-sourced (structural limitation on AC1)**
  - Spec source: context-story-bz5-4.md, AC1
  - Spec text: "cross-checked against MAME's executed behavior and the disassembly together"
  - Implementation: MAME's driver source contains no AI logic (it executes the ROM); the state machine / GetTankType stay pinned to the bz1–bz4 disassembly audit. Only what MAME's driver documents (DIP thresholds, sound-gating) was cross-checked.
  - Rationale: A literal "executed behaviour" diff of the AI logic would require running MAME and capturing telemetry — out of scope for a source-diff / headless unit suite; recorded as an open item for a human ruling in §11.2 (recommended non-blocking).
  - Severity: minor
  - Forward impact: possible bz5 follow-up (live-MAME behavioural capture) if the human rules it worth doing.

### Dev (implementation)
- No deviations from spec. Green phase confirmed the verification outcome (no source change warranted); added one docs note (§11.2 trap-avoided) and no code change.

### Reviewer (audit)
- **TEA: "RED phase produced PASSING pins, not a failing test"** → ✓ ACCEPTED by Reviewer: correct call. The MAME cross-check found full agreement; AC3's precondition (both sources agree the clone diverged) is genuinely unmet. I re-verified all four CONFIRMEDs byte-for-byte against `~/Projects/mame` and mutation-tested the pins (flipping `MISSILE_INTRO_THRESHOLD` and the `player-hit` cue both redden the suite) — the pins are non-vacuous and fabricating a RED would have manufactured a divergence the sources don't support.
- **TEA: "AI logic axes are not second-sourced (structural limitation on AC1)"** → ✓ ACCEPTED by Reviewer: independently confirmed — `grep` of `bzone.cpp`/`bzone_a.cpp` for tank/enemy/aim/turn/flank/charge/aggress returns only DIP comments and analog-sound circuitry; MAME executes the ROM but its driver reimplements no AI. Consistent with the §11/bz5-1 precedent already in the doc. The open-item-for-human-ruling framing (live-MAME capture, non-blocking) is the honest disposition.
- **Dev: "No deviations; added §11.2 trap-avoided note"** → ✓ ACCEPTED by Reviewer: the Red-Baron-DIP trap is real and correctly attributed — `bzone.cpp:122` is the `RED BARON DIP SWITCH SETTINGS` header and the self-adjusting-difficulty block (`:151-164`) sits under it, not under Battlezone's block (`:42-90`). Recording it prevents a future false CONFIRMED.
- No undocumented deviations found.

## Sm Assessment

Setup complete for bz5-4 — enemy AI cross-check against MAME + BZONE.MAC. This is a
verification-first audit: the deliverable is recorded findings with MAME citations, and
behavior changes ONLY where both sources (MAME driver + BZONE.MAC disassembly) agree the
clone diverged. Existing enemy suites (enemies, enemies-aggression, enemies-maneuver,
firing) must stay green (AC3).

Both sources verified on disk. MAME is EXTERNAL, not vendored:
/Users/slabgorb/Projects/mame/src/mame/atari/{bzone.cpp,bzone.h,bzone_a.cpp} and
layout/bzone.lay. The `bzone_a.cpp:1-20` sound-enable-bit citation is confirmed accurate
(D7 motor, D5 sound, D4 rev, D2 shell, D0 explosion). Vendored disassembly:
reference/atari-source/battlezone/BZONE.MAC + reference/va-battlezone/Battlezone.dis65.
Clone code under audit is the pure sim under plugins/battlezone/src/core/ (enemies.ts,
movement.ts, firing.ts, saucer.ts, difficulty.ts). Full source paths and suite list are
in sprint/context/context-story-bz5-4.md.

Trunk-based: no branch cut (Branch/PR = none). Handing to TEA for the RED phase.
## TEA Assessment

**Tests Required:** Yes (verification pins — see status note)
**Reason:** Verification-first audit story. bz1–bz4 already audited+fixed the enemy AI against the BZONE.MAC disassembly; bz5-4 re-checks it against MAME as a second source. The cross-check found FULL agreement, so the tests pin the CONFIRMED second-source agreements rather than fail.

**Test Files:**
- `plugins/battlezone/tests/core/enemies-mame-crosscheck.test.ts` — 5 tests: missile-intro threshold === 10000 (MAME DIP $-default, bzone.cpp:75); BONUS_TANK_SCORES === [15000,100000] (bzone.cpp:79); enemy-action sound-gating maps to the single explosion (D0) / shell (D2) generators per bzone_a.cpp:1-20.

**Findings recorded:** `plugins/battlezone/docs/battlezone-1980-source-findings.md` §11.2 (+ changelog) — the deliverable of AC1/AC2: the structural fact (MAME's driver has no AI logic), 4 CONFIRMEDs, the engine-bit premise correction, the timebase note, and the AC3 ruling.

**Tests Written:** 5 tests. **Status:** GREEN — CONFIRMED, not RED.
This is the honest audit outcome, not a bypass: the second source AGREES with the clone on every axis MAME can document. Per AC3, behaviour changes only where both sources agree the clone diverged — no such divergence exists, so no source change is warranted. Full battlezone suite green (76 files, 1062 tests); the four named suites (enemies, enemies-aggression, enemies-maneuver, firing) stay green (AC3). Lint clean.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| core purity (no DOM/time/rng in src/core) | existing `enemies-purity` / `firing-purity` (unchanged) | passing |
| second-source citation on every cross-check claim | `enemies-mame-crosscheck.test.ts` (MAME line cites in comments; findings §11.2) | passing |
| no vacuous assertions | all 5 assert concrete values/call-sequences | passing |

**Rules checked:** cross-check assertions all carry a MAME citation; no vacuous/`assert(true)` tests.
**Self-check:** 0 vacuous tests.

### AC Coverage
- **AC1** (tank AI cross-checked vs MAME + disassembly; findings w/ MAME citations): findings §11.2 — CONFIRMED where MAME can document; the AI *logic* axes flagged as a structural limitation (open item, non-blocking).
- **AC2** (saucer/missile/supertank cadence + sound-gating hook): missile/bonus thresholds pinned to MAME DIP defaults; sound-gating (D2/D0) CONFIRMED against `audio-dispatch.ts`.
- **AC3** (change only where both agree; enemy suites green): no divergence → no change; all suites green.

**Handoff:** To Dev — confirm-green + pass-through (NO implementation warranted; the pins already pass and the findings deliverable is committed). Dev should NOT invent a source change; if Dev believes a divergence exists, it must be filed as a finding with a MAME citation first (AC3), not coded speculatively.
## Dev Assessment

**Implementation Required:** No — verification-confirms outcome (independently re-checked TEA's conclusion; agreed).
**Tests:** 1062/1062 passing (GREEN) across the full battlezone project; the 4 named suites (enemies, enemies-aggression, enemies-maneuver, firing) + `enemies-mame-crosscheck` (5) all green. Lint clean.

**What Dev did (green phase = independent confirmation, not rubber-stamp):**
- Re-verified the tests genuinely pass and are non-vacuous (concrete value/call-sequence assertions, MAME citations).
- Independently re-ran the MAME search for AI-cadence documentation (saucer/supertank/spawn/aggression) — MAME's driver documents NONE of Battlezone's AI cadences, confirming TEA's structural finding.
- **Caught and correctly attributed a trap:** `bzone.cpp:151` "Self-adjusting game difficulty" is Red Baron's DIP (shared `bzone.cpp`, RED BARON block :122), not Battlezone's. Recorded in findings §11.2 as a trap-avoided note so it is never filed as a false Battlezone finding. Battlezone's adaptive difficulty stays the §5 score-differential aggression ramp, single-sourced to the disassembly (MAME does not document it).
- No source change: AC3's precondition (both sources agree the clone diverged) is unmet. Making the clone "match" something the sources don't disagree with would be fabrication.

**Deliverable:** the findings §11.2 cross-check (AC1/AC2) + the 5 regression pins locking the two MAME-confirmed DIP defaults and the sound-gating hook. Both committed (422d8c67 test+findings, plus the green-phase trap note commit).

**Handoff:** To Reviewer.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | GREEN: 1063 battlezone tests, lint ✓, orchestrator 392 ✓, no smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings (Reviewer assessed test quality personally — mutation-confirmed non-vacuous) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings (Reviewer verified all citations byte-for-byte personally) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (type nit found personally — see F1) |
| 7 | reviewer-security | Yes | clean | none | N/A (also confirmed no copyrighted MAME source copied in) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 rule / 3 instances | confirmed 1 (F1, LOW), dismissed 0, deferred 0 |

**All received:** Yes (3 of 3 enabled returned; 6 disabled via settings)
**Total findings:** 2 confirmed (both LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

Persona: Jean-Baptiste Emanuel Zorg. I went in assuming the audit had manufactured agreement — a false CONFIRMED is the one failure mode that this kind of story ships silently — and tried to break it. It held.

**What I did independently (two most-relevant specialists, comment-analyzer and test-analyzer, are disabled via settings, so I covered them myself):**
- **Verified every MAME citation byte-for-byte** against `~/Projects/mame/src/mame/atari/{bzone.cpp,bzone_a.cpp,bzone.h}`. The two load-bearing CONFIRMEDs are genuine: `bzone.cpp:75` = "Missile appears after 10,000 points  $" and `bzone.cpp:79` = "Bonus tanks at 15,000 and 100,000 points  $" — both exact, both $-marked factory defaults. Sound bits (`bzone_a.cpp:7/11/16/18` = D7/D4/D2/D0) exact. Clock chain (`:611`/`:613`, `bzone.h:20-21`) exact; math checks: 12096000/8 = 1.512 MHz, /4096/12 = 246.09 Hz, /16 ≈ 15.38 Hz.
- **Independently confirmed the structural claim** ("MAME's driver has no AI logic") by grepping `bzone.cpp`/`bzone_a.cpp` — only DIP comments + analog sound; no state machine. Matches the §11/bz5-1 precedent.
- **Mutation-cross-checked** (with rule-checker): flipping `MISSILE_INTRO_THRESHOLD` and the `player-hit` cue each redden the new suite — the pins are not vacuous.

**Data flow traced:** new test imports `MISSILE_INTRO_THRESHOLD`/`BONUS_TANK_SCORES` (core constants) and `playEventSounds` (shell) → asserts values + recorded cue calls. Safe: test-only, no production path touched, no I/O in the fake.
**Pattern observed:** verification-pin + findings-doc cross-check, mirroring §11/§11.1; sound fake mirrors `tests/shell/audio-dispatch.test.ts:35`.
**Error handling:** N/A — no error paths introduced (test + doc only).

### Rule Compliance (TypeScript lang-review, exhaustive over the one .ts file)

| Rule | Applies? | Result |
|------|----------|--------|
| #1 Type-safety escapes (`as any`/`as never`/double-cast) | Yes | **VIOLATION** — `surface as never` ×3 (F1). Provably unnecessary. |
| #8 Test quality (no cast to force type-match; non-vacuous) | Yes | **VIOLATION (same instances)** for the cast; otherwise compliant — assertions mutation-proven non-vacuous. |
| #15 Source-text token-not-claim assertions | No | Value/behavior pins, not `toMatch` on source text. |
| #17 Comment asserts a mechanism nobody re-ran | Yes | Compliant — all MAME citations re-verified against the external tree. |
| #18 Vacuous fixture / self-measuring test | Yes | Compliant — constants imported from `src/core/`, not hardcoded twice; mutation-reddens. |
| #5 Module/import (`import type`) | Yes | Compliant — `import type { GameEvent }` correct. |
| #2,#3,#4,#6,#7,#9–#14,#19–#26 | No | N/A — no enums/async/JSX/arithmetic/retirements/loops in the diff. |
| Core/shell purity boundary (CLAUDE.md) | Yes | Compliant — purity sweep scans `src/core/` source only, never `tests/`; a test importing `src/shell` is fine. |
| ROM-fidelity citation discipline (audit skill) | Yes | Compliant — cite-by-line only; no copyrighted MAME source copied in (security confirmed). |

### Findings

| # | Sev | Tag | Location | Issue | Fix |
|---|-----|-----|----------|-------|-----|
| F1 | LOW | [RULE][TYPE][TEST] | `enemies-mame-crosscheck.test.ts` — the three `playEventSounds(surface as never, events)` calls | Unjustified bottom-type cast (`as never`), stricter than `as any`, no comment/TODO. Rule-checker proved it is unnecessary — TS bivariance accepts the fake with **zero** cast, and the sibling `audio-dispatch.test.ts` uses none. Defeats future signature-mismatch detection on the fake. | Delete the three `as never` casts: `playEventSounds(surface, events)`. |
| F2 | LOW | [DOC] | findings §11.2, the maincpu-ROM parenthetical | Chip-range label reads "036409-01…**036415**-02"; the top program ROM at `bzone.cpp:712` is **036414**-02, and 036415 is a comment ref (`:699`) to a different (vector-PROM) region. The `bzone.cpp:711-717` citation and the structural claim are correct — only the illustrative label is off. | Change to "036409-01…036414-02" (or drop the top-chip number). |

Both are LOW (Style / minor). Per the severity table LOW does not block, and there are **no Critical/High/Medium** findings. F1 is a confirmed rule violation (not dismissed — recorded, severity downgraded with rationale: test-only, behavior mutation-proven correct). Recommend both be stripped in a trivial pre-finish touch, but neither warrants a rework cycle.

### Devil's Advocate

Argue this is broken. The nightmare for a "cross-check" story is a **false CONFIRMED** — a citation that reads as agreement but points at the wrong line, so the audit ships "we match the arcade" as proof when it doesn't, and refutation never revisits a CONFIRMED. So I attacked the citations first, not the prose: I opened every cited MAME line myself. `bzone.cpp:75`/`:79` carry the exact `$`-marked defaults; `bzone_a.cpp:16`/`:18` are D2 shell / D0 explosion verbatim. No false CONFIRMED. Second nightmare: the tests are **tautologies** that pass no matter what the clone does — a pinning test that reads a constant and asserts the same constant. But the constants are imported from `src/core/`, not re-declared, and mutation (10000→20000; explosion→cannon) reddens them, so a real regression is caught. Third: the whole premise could be **wrong** — maybe MAME *does* encode the AI and TEA/Dev missed it, making "no divergence" a failure to look. I grepped the driver for every AI verb; it genuinely holds only hardware + DIP text. The AI is the ROM, and MAME running the ROM is byte-identical to the disassembly bz1–bz4 already audited — so "no divergence from MAME source" is the honest, if narrow, truth, and §11.2 says so plainly rather than overclaiming an "executed-behaviour" diff it did not perform. Fourth: a **confused reader** could take §11.2's "engine bits" table row as claiming the enemy has its own engine cue; the note explicitly corrects that (D7/D4 = the player's tank). Fifth: a **stressed maintainer** copies the `as never` pattern into the next test as if it were the idiom — that is exactly why F1 should be stripped even though it is LOW. Nothing here rises to Medium; the audit is honest about its own limits, which is the hardest thing for this story type to get right.

### Delivery Findings Capture

(see below)

**Dispatch tags:** [EDGE] (disabled) [SILENT] (disabled) [TEST] (F1, assessed personally) [DOC] (F2, assessed personally) [TYPE] (F1, assessed personally) [SEC] (clean) [SIMPLE] (disabled) [RULE] (F1 confirmed)

**Handoff:** To SM for finish-story.