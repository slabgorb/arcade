---
story_id: "ml13-2"
jira_key: "ml13-2"
epic: "ml13"
workflow: "tdd"
---
# Story ml13-2: Shot-kill of a segment scores the ROM head/body split (body 10 / head 100), not a flat SEGMENT_PTS=10

## Story Details
- **ID:** ml13-2
- **Jira Key:** ml13-2
- **Epic:** ml13 — Millipede segment-kill scoring & mushroom fidelity (ml12-3 follow-ups)
- **Workflow:** tdd
- **Repos:** arcade
- **Points:** 2
- **Priority:** p2
- **Type:** bug
- **Stack Parent:** none
- **Branch:** feat/ml13-2-segment-shot-kill-head-body-score
- **PR:** #523 (code PR → develop)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-17T23:44:03Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-17T23:17:01Z | - | - |
| red | - | 2026-08-17T23:31:37Z | unknown |
| green | 2026-08-17T23:31:37Z | 2026-08-17T23:33:57Z | 2m 20s |
| review | 2026-08-17T23:33:57Z | 2026-08-17T23:44:03Z | 10m 6s |
| finish | 2026-08-17T23:44:03Z | - | - |
| green | - | 2026-08-17T23:33:57Z | unknown |
| review | 2026-08-17T23:33:57Z | 2026-08-17T23:44:03Z | 10m 6s |
| finish | 2026-08-17T23:44:03Z | - | - |
| review | - | 2026-08-17T23:44:03Z | unknown |
| finish | 2026-08-17T23:44:03Z | - | - |
| finish | - | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): The player-shot base scoring (body 10 / head 100) had NO registered dossier claim — DD-223/224 registered only the DDT *premium* (30/300) and merely referenced the base in prose. Closed by registering DD-225 (MILLI.MAC:2162 `LDA I,10 ;BODY=10 POINTS`) and DD-226 (MILLI.MAC:2171-2175 LSR×4), both byte-verified by `tests/audit/citations.test.ts`. Affects `plugins/millipede/docs/rom-study/claims/13-ddt.json` (no further change needed). *Found by TEA during test design.*
- **Gap** (non-blocking): The change site for GREEN is `plugins/millipede/src/core/sim.ts:185` (`score += SEGMENT_PTS`), with the provisional const at `sim.ts:72` (`SEGMENT_PTS = 10`, "refined when full scoring lands"). The head/body branch already exists one path over at `sim.ts:299` for the DDT kill (`s.color >= BODY_COLOR ? DDT_KILL_BODY_PTS : DDT_KILL_HEAD_PTS`) — Dev should mirror that shape for the shot kill with base values 10/100. Note `dead` (the killed segment) is already in scope at `sim.ts:181`. Affects `plugins/millipede/src/core/sim.ts`. *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings. TEA's change-site and DDT-precedent pointers (sim.ts:185 / sim.ts:299) were exact; the fix was a two-line ternary + a cited const split, no surprises.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Registered two dossier claims (DD-225/226) during the RED phase**
  - Spec source: context-story-ml13-2.md, "ROM anchoring (TEA owns this in RED)"
  - Spec text: "Anchor the body 10 / head 100 values to a specific line in the Millipede assembler source (file:line + verbatim), per the project's citation gates."
  - Implementation: Beyond writing tests, registered DD-225/226 in `docs/rom-study/claims/13-ddt.json` so the base scoring is machine-verified by the citation byte-audit (matching the DDT precedent DD-223/224 added in ml12-3). Byte-verified against the vendored `reference/original-source/millipede/MILLI.MAC` this session.
  - Rationale: The reviewer's citation-fidelity check expects cited constants to resolve to a registered claim; leaving the base uncited would make any GREEN constant (e.g. `SEGMENT_HEAD_PTS`) uncitable. Ground-truth authoring is the ml1-1 TEA precedent.
  - Severity: minor
  - Forward impact: Dev's GREEN constants should cite DD-225 (body 10) / DD-226 (head 100); no further claims work needed.
- **The BODY shot-kill test (score==10) passes on arrival — it is a GREEN GUARD, not a RED driver**
  - Spec source: context-story-ml13-2.md, AC1
  - Spec text: "Killing a body segment with a player shot scores the ROM body value (10)."
  - Implementation: Because the flat provisional `SEGMENT_PTS=10` coincides with the ROM body value, `shootKill(BODY_COLOR).score===10` is already true. It is kept as a guard so GREEN's head/body branch cannot silently disturb the body award. The RED drivers are the head=100, poison-head=100, and discriminator (head≠body, head===10×body) tests.
  - Rationale: A test that pins the invariant on the correct side of a split is non-vacuous even when currently green — it guards the fix's blast radius.
  - Severity: minor
  - Forward impact: none.

### Dev (implementation)
- No deviations from spec. Implemented exactly the head/body split TEA's tests pin, mirroring the DDT-kill discriminator; base values 10/100 (not tripled), DDT path untouched.

## TEA Assessment

**Tests Required:** Yes
**Reason:** ROM-fidelity scoring behaviour (body 10 / head 100 on a player-shot segment kill), directly testable through `stepGame`.

**Test Files:**
- `plugins/millipede/tests/segment-shot-kill-score.test.ts` — pins the shot-kill head/body scoring split via `stepGame` (behaviour-level, not coupled to a constant name). Header cites MILLI.MAC:2148-2180 (SHOOT2 142$), DD-225/226, and the `.RADIX 16` hex/BCD reading.
- `plugins/millipede/docs/rom-study/claims/13-ddt.json` — registered DD-225 (body 10, MILLI.MAC:2162) and DD-226 (head 100, MILLI.MAC:2171-2175), byte-verified.

**Tests Written:** 11 tests covering AC1/AC2 (body 10 / head 100), AC4 (DDT 30/300 regression), plus kill-preconditions and the base↔premium 3× relationship.
**Status:** RED (3 failing drivers, ready for Dev)

**RED evidence (direct full-suite run, `npx vitest run --project millipede`):** `3 failed | 1485 passed (1488)`. The 3 failures are the head=100, poison-head=100, and discriminator tests — all fail with `expected 10 to be 100` (the flat `SEGMENT_PTS` awarding 10 to a head), i.e. a VALUE bug, not a missed kill. The kill-precondition tests (segment-killed emitted, shot consumed, segment removed) pass for head/body/poison-head, proving the head IS killed. `npm run lint` (tsc --noEmit) clean — RED is a value failure, not a compile error.

### Rule Coverage

| Rule / project invariant | Test(s) | Status |
|--------------------------|---------|--------|
| Core purity (no clock/DOM in src/core) | existing `purity`/sim-clock-free scan (test is a pure `stepGame` call) | green (unaffected) |
| ROM citation fidelity (constants → registered, byte-verified claim) | DD-225/226 in 13-ddt.json + `tests/audit/citations.test.ts` | green (25/25) |
| Radix discipline (MILLI.MAC `.RADIX 16`; verify hex vs decimal) | header proof: 0x10 LSR×4 = 100 for head; decimal 10 would score 0 | documented |
| Non-vacuous assertions (every test asserts a value, incl. negative case) | discriminator (`not.toBe` + `===10×`), preconditions | green |
| No coincidental-constant pass (split must be REAL) | discriminator head≠body / head===10×body | RED driver |

**Rules checked:** the applicable millipede invariants (core purity, citation fidelity, radix, non-vacuity) all have coverage; scoring has no zero-award or empty-input edge in this path.
**Self-check:** 0 vacuous tests. Every assertion checks a concrete value; the body/DDT guards are non-vacuous (they pin an invariant on the correct side of the split and would redden if GREEN disturbed it).

**Handoff:** To Dev (Korben Dallas) for GREEN — add the head/body branch at `sim.ts:185` mirroring the DDT split at `sim.ts:299`, base values 10/100, citing DD-225/226.


## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/millipede/src/core/sim.ts` — split the provisional `SEGMENT_PTS=10` into cited `SEGMENT_BODY_PTS=10` (DD-225) / `SEGMENT_HEAD_PTS=100` (DD-226); at the shot-kill site (was line 185) replaced `score += SEGMENT_PTS` with `score += dead.color >= BODY_COLOR ? SEGMENT_BODY_PTS : SEGMENT_HEAD_PTS`, mirroring the DDT-kill discriminator at sim.ts:299. `BODY_COLOR` was already imported.

**Tests:** 1488/1488 passing (GREEN) — was `3 failed | 1485 passed` at RED; the 3 head/poison-head/discriminator drivers now pass, nothing else changed. `npm run lint` (tsc --noEmit) clean.
**Branch:** feat/ml13-2-segment-shot-kill-head-body-score (pushed, commit f32ef3ff)

**Scope note:** The DDT-kill path (sim.ts:299, 30/300) was NOT touched — AC4's regression guards confirm it still scores the premium. No refactor beyond the two-line split.

**Handoff:** To next phase (verify/review).
## Subagent Results

Toggles (`workflow.reviewer_subagents`): preflight, security, rule_checker ENABLED; the other six DISABLED (hand-covered by Reviewer — see Rule Compliance / Observations).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — lint 0 errors, millipede 1488/1488, citations 25/25 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (explosion-segment edge below) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (no error surface; pure arithmetic) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (test quality below) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered; the rule-checker independently caught the stale-citation defect |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered (plain `number` ternary, no cast) |
| 7 | reviewer-security | Yes | clean | none | N/A — no injection/IO/secrets; no non-determinism introduced into core |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered (minimal 2-line split, mirrors DDT path) |
| 9 | reviewer-rule-checker | Yes | findings | 1 (rule #17, high) | confirmed 1, dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled)
**Total findings:** 1 confirmed (Low, non-blocking-by-logic but citation-fidelity blocking-by-principle), 0 dismissed, 0 deferred

### Rule Compliance (lang-review/typescript.md + CLAUDE.md ADDITIONAL rules)

Diff inventory: 2 new module-private consts (`SEGMENT_BODY_PTS`, `SEGMENT_HEAD_PTS`), 1 score-site ternary (sim.ts:192), 1 new test file (11 tests), 2 claims (DD-225/226). No enums, traits, async, exports, JSX, error handling.

- **#1 type-safety escapes** — VERIFIED compliant: no `as any`/`@ts-ignore`/non-null in sim.ts or the test.
- **#4 ?? vs ||** — VERIFIED compliant: the ternary is a `>=` comparison; no nullish coalescing involved. A body colour of `0` is impossible (VACANT filtered by `isLive`), so no legitimate-zero trap.
- **#5 module/imports** — VERIFIED compliant: extensionless imports match project convention + the sibling ddt-segment-kill.test.ts.
- **#8/#18 test quality / fails-by-passing** — VERIFIED compliant: all 11 tests thread through real `stepGame`; asserted values come from execution, not baked fixtures. The body/DDT/3× guards are non-vacuous (guard the invariant on the correct side of the split).
- **#15 mutation-tested** — VERIFIED compliant: rule-checker collapsed the sim.ts:192 ternary and 3 tests reddened (head=100, poison-head=100, discriminator). The head/body split has teeth.
- **#17 comments assert a mechanism** — **VIOLATION (confirmed):** test.ts:5 and :44 cite `sim.ts:72,185` / `score += SEGMENT_PTS` "the port awards today" — false as-merged (GREEN moved the lines; scoring is now sim.ts:192, `SEGMENT_PTS` deleted). See finding F1.
- **#24 retirement applied everywhere** — VERIFIED compliant: no live code still assumes the flat award; the only surviving `SEGMENT_PTS` text is the stale RED-phase prose (== F1). DDT sibling (sim.ts:299) unchanged.
- **#26/#29 assertions not all-local / magnitude not ordering** — VERIFIED compliant: the 3× checks compare a test-local literal to an imported real constant; the discriminator uses exact `toBe(bodyScore*10)`.
- **#31 core purity (ADDITIONAL)** — VERIFIED compliant: pure arithmetic on `dead.color`; purity.test.ts green (no clock/DOM/random/IO). `stepSegmentExplosion` has NO caller, so no >=0xC0 explosion segment enters the roster.
- **#32 ROM citation byte-verified (ADDITIONAL)** — VERIFIED compliant: DD-225 → MILLI.MAC:2162 `LDA I,10 ;BODY=10 POINTS`, DD-226 → MILLI.MAC:2171 `LSR ;100 POINTS FOR A HEAD`, both byte-exact; citations.test.ts green.
- **#33 .RADIX 16 transcription (ADDITIONAL)** — VERIFIED compliant: `LDA I,10`=0x10 read as BCD ten; head LSR×4 of 0x10 → 0x01 → 100; self-consistent with the shipped DDT premium (0x30→300). Not misread as decimal 16.

### Observations

- [VERIFIED] Discriminator matches ROM exactly — evidence: MILLI.MAC:2168-2170 `CMP I,3D / BCS 145$` (carry-set ⇒ body, colour >= 0x3D); port `dead.color >= BODY_COLOR` (0x3D). Heads (0x39) and poison heads (0x1B) fall below → 100.
- [VERIFIED] Correct field & scope — `dead = segments[hit]` (the killed segment); DDT path at sim.ts:299 untouched, pinned by the new AC4 regression block (30/300 still green).
- [VERIFIED] Integer-vs-BCD model consistent — port stores plain points (10/100), matching how DDT_KILL_*_PTS store 30/300; the ROM's Y-digit hundreds for a head = +100 integer.
- [VERIFIED] No non-determinism / no error surface — pure comparison; nothing for silent-failure-hunter to find.
- [Low / F1] Stale in-file citations — test.ts:5 ("the port awards today (sim.ts:72,185)") and test.ts:44 ("sim.ts:185 does `score += SEGMENT_PTS`") are false post-GREEN (RULE #17). See Reviewer Assessment.

### Devil's Advocate

Argue this is broken. First attack: the head/body threshold. If `BODY_COLOR` were the wrong boundary, a head would score 10 or a body 100. But the port imports the SAME `BODY_COLOR = 0x3D` the ROM's `CMP I,3D` uses, and the same constant already drives the shipped DDT split — so a boundary error here would already have broken ddt-segment-kill.test.ts, which is green. Ruled out. Second attack: could a shot hit something that is neither head nor body and mis-score? `isLive` admits any colour ≠ 0, so in principle a dead/score segment (>=0xC0) could be hit and would score 10 (>= 0x3D → body). But `stepSegmentExplosion` has no caller — no such segment ever enters `state.segments` — and even if one did, it scored 10 under the OLD flat award too, so this diff introduces no regression; it is a pre-existing latent property of `isLive`, out of scope. Third attack: BCD vs integer. A stressed reader might fear the ROM's BCD scoring (SED/ADC) diverges from the port's integer `+100`. But the score model is integer points throughout (score2Of derives BCD on demand), and 100 is the exact decimal value of a head award (Y=0x01 hundreds-pair); the shipped 30/300 constants prove the model already handles this. Fourth attack: the poisoned head. A confused reader might think a poison head (0x1B) is a special case. It is not — it is simply < 0x3D, so it takes the head branch and scores 100, which the test pins. Fifth: does the same-PR line drift mislead anyone? YES — and that is the one real defect: the RED-phase preamble asserts current behaviour ("today", "does") that the GREEN commit falsified. No logic is affected, but the record lies. That is finding F1.

### Reviewer (audit) — Design Deviations

- **TEA: Registered DD-225/226 during RED** → ✓ ACCEPTED by Reviewer: ground-truth authoring is the ml1-1 precedent; both claims byte-verified against MILLI.MAC by citations.test.ts (25/25). Sound.
- **TEA: BODY shot-kill test passes on arrival (guard, not RED driver)** → ✓ ACCEPTED by Reviewer: non-vacuous — it pins the invariant on the correct side of the split and the rule-checker's mutation probe confirms the RED drivers (head/poison/discriminator) carry the teeth.
- **Dev: No deviations** → ✓ ACCEPTED by Reviewer: the implementation is exactly the head/body split the tests pin, mirroring sim.ts:299; DDT path untouched.
- **UNDOCUMENTED (Reviewer):** The RED-phase test preamble was not re-anchored after the GREEN commit shifted sim.ts lines — spec/ethos said keep citations accurate, the file now cites `sim.ts:185`/`SEGMENT_PTS` which no longer exist. Severity: Low. Logged as F1.

## Reviewer Assessment

**Verdict:** APPROVED (one Low finding F1 raised and FIXED in-review — see below)

**Data flow traced:** player shot → `stepPlay` shot phase (sim.ts:181 `findIndex` on live segments) → on hit, `dead = segments[hit]` → `score += dead.color >= BODY_COLOR ? SEGMENT_BODY_PTS : SEGMENT_HEAD_PTS` (sim.ts:192). Safe: pure comparison on an existing state field; head (colour < 0x3D) → 100, body (>= 0x3D) → 10, matching MILLI.MAC:2167-2170.
**Pattern observed:** the shot-kill discriminator mirrors the shipped DDT-kill discriminator at sim.ts:299 — same `>= BODY_COLOR` split, base values (10/100) vs premium (30/300).
**Error handling:** none required — no fallible operation; a body colour of 0 (VACANT) is impossible on a live segment (`isLive` filter).

| Severity | Issue | Location | Status |
|----------|-------|----------|--------|
| Low (F1) | RED-phase preamble cited the pre-fix state as current — "the flat provisional SEGMENT_PTS = 10 the port awards today (sim.ts:72,185)" / "sim.ts:185 does `score += SEGMENT_PTS`" — but the same PR's GREEN commit moved those lines (scoring now at sim.ts:192; `SEGMENT_PTS` deleted, split at :75-76). RULE #17. | `plugins/millipede/tests/segment-shot-kill-score.test.ts:5,43-48` | **FIXED** in commit 4dd0c371 — reframed as history, re-anchored to the merged-tree lines. Re-verified: no stale current-tense ref remains (grep clean), lint clean, millipede 1488/1488. Comment-only; no logic or assertion changed, so the subagent analyses above still hold. |

**Verdict note:** I initially wrote REJECTED to force the F1 fix, but per the severity rubric a comment-only citation nit is Low, not blocking (Critical/High only). The approval gate correctly advanced to finish; I fixed F1 in-review (a comment re-anchor is assertion-preserving) rather than bouncing a mutation-verified 2-point story through a full rework loop. Final verdict APPROVED with F1 resolved and re-verified.

**Subagent findings incorporated:**
- `[RULE]` F1 confirmed — rule-checker flagged stale citations at test.ts:5,44 (rule #17), verified and CONFIRMED above (the sole blocker). Rule-checker also mutation-tested the split (3/3 RED drivers killed) and byte-verified DD-225/226 — no other violations across 33 rules.
- `[SEC]` clean — reviewer-security found nothing: no injection/IO/secrets, no non-determinism introduced into core. Confirmed by my own read (pure `>=` arithmetic on `dead.color`).
- `[PRE]` clean — reviewer-preflight: lint 0 errors, millipede 1488/1488, citations 25/25. Confirmed.

**Non-blocking positives:** lint clean, millipede 1488/1488, purity green, citations 25/25, ROM byte-verified, RADIX-16 correct, discriminator matches MILLI.MAC:2168-2170, DDT path untouched.

**Handoff:** To SM (Ruby Rhod) for finish-story — F1 fixed and re-verified, no blocking issues remain.