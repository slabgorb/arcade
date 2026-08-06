---
story_id: "sw8-22"
jira_key: "sw8-22"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-22: trench PMRRP/voice death gate

## Story Details
- **ID:** sw8-22
- **Jira Key:** sw8-22
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** gitflow (repo switched trunk-based → gitflow mid-story via owner commit 07b37db; sw8-22 rebased onto origin/develop and shipped as a PR)
- **Branch:** feat/sw8-22-trench-death-gate
- **PR:** https://github.com/slabgorb/arcade/pull/19 (base: develop) — awaiting owner merge

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T18:57:17Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T18:18:59Z | 2026-08-06T18:20:55Z | 1m 56s |
| red | 2026-08-06T18:20:55Z | 2026-08-06T18:30:07Z | 9m 12s |
| green | 2026-08-06T18:30:07Z | 2026-08-06T18:47:17Z | 17m 10s |
| review | 2026-08-06T18:47:17Z | 2026-08-06T18:57:17Z | 10m |
| finish | 2026-08-06T18:57:17Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- (Dev, Gap, non-blocking) Line-shift blast radius, for the Reviewer's diff read: relocating the cue push added a net +17 lines inside `stepTrench`, moving the `gameOver:`/`mode: 'gameover'` death sites below it. That reddened line-number fixtures/citations that pin `sim.ts` lines. Re-anchored, all mechanical +17 (or the true post-shift line): `sw8-27-remediation.test.ts` fixture lists (mode sites, `deathSites().fields`/`.pairing`, branches), `coaching.ts`'s bare-colon citation `(sim.ts:761, :1265, :1533, :1706)`, `tie-waves-past-plan.test.ts` (`sim.ts:1768`), `tie-waves-rom.test.ts` (`sim.ts:2280`), and the surface-gunnery design doc (`sim.ts:2307`, NOT the checker's suggested `:333`, which is a duplicate-quote comment match — false positive). Verified: `check-comment-citations.mjs` → 0 stale; full star-wars suite 2351 passed; lint clean.
- (TEA, Improvement, non-blocking) The ROM ruling this story asked for is unambiguous once PHEBS is read whole: the top guard `LDA S.GAS / LBMI PHIB0D` gates the PH.TIM cue walk (`PMRRP`, `SPKTRU`/`SPKYAU`/`SPKLET`/`SPKSTR`); the wall-gun hit (`DOBASE`) runs ABOVE the walk under that guard, the exhaust-port crash (end-wall bash) runs BELOW it under its own guard `LBLE PHIB0D` that gates only `SPKR2N`. So the voice/theme cue is silenced by the GUN death and is NOT silenced by the port-crash death. Encoded as tests; no open question remains for Dev.

### Reviewer (code review)
- **Improvement** (non-blocking): the trench voice-cue gate lacks two edge tests the surface analog (sw8-21) carries — a gun hit DROPPED by the S-016 redraw window (damage, no death → cue still fires) and a gun-survives-AND-port-crash-kills-same-frame combo. Affects `plugins/star-wars/tests/core/trench-voice-timer.test.ts` (add two cases). The gate reads `gunHit.lives` (the `loseShield` result), which already handles both correctly, so this is coverage completeness, not a defect — safe to fold into a later trench story.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## Sm Assessment

Setup complete for sw8-22 — the trench (PHEBS) death-gate, third and last of the family after sw8-13 (space/PHESP1) and sw8-21 (surface/PHEGD). Session and context files written and verified on disk; story is `in_progress`; trunk-based so no branch. Context carries the ROM anchors (PHEBS guard at WSMAIN.MAC:1842-1843 above the PH.TIM cue walk, PMRRP :1865, SPKTRU :1874) and the OURS seam (stepTrench sim.ts:1210, TRENCH_VOICE_CUES push :1247-1252, loseShield :1421, exhaust-port hit :1571).

Key routing note for TEA/Dev: this is **not** a copy of sw8-21's single-relocation fix. The trench has TWO shield resolutions, so it needs a ruling on which cues each gates. Cue crossing is TIMER-driven (trenchTimer, word_4B0E), not speed-driven, so the fixture differs from sw8-21's. Carry forward sw8-21's three-round lesson: no line-number or count censuses in test comments — anchor on mechanism names and the invariant that loseShield is where damage becomes death.

Handing off to Leeloo (TEA) for the RED phase.
## Tea Assessment

RED landed for sw8-22 (commit 38ef86a1). One failing test drives the fix; the guards and the ruling discriminator pass. Tests live in `plugins/star-wars/tests/core/trench-voice-timer.test.ts`, new block `sw8-22 — a voice cue on the GUN-death frame is silenced (PHEBS exits before the walk)`.

**Verified state (direct run, `npx vitest run --project star-wars trench-voice-timer`): 1 failed | 28 passed.** Lint clean (`npm run lint`).

### The ruling Dev must implement
`stepTrench` resolves TWO shield hits and the ROM puts them on opposite sides of the PH.TIM cue walk:
- **Wall-gun hit** (`gunHit` = `loseShield`, our analog of `DOBASE 'FIRES BASES SHOTS'`) runs ABOVE the cue walk under the top guard → **it silences the voice/theme cue.** The `TRENCH_VOICE_CUES` push (currently at the TOP of `stepTrench`) must move BELOW `gunHit` and gate on the post-hit lives (`gunHit.lives > 0`). This is sw8-21's shape (re-order below the resolution, gate on post-`loseShield` lives), NOT sw8-21's exact placement.
- **Exhaust-port crash** (`portHit`, the `reachedCockpit` branch) runs BELOW the cue walk under its own guard → **it must NOT silence the voice cue.** `r2Scream` is already correctly gated on its post-hit lives; leave the voice cue alone on this path. Do NOT gate the cue on the frame's *final* lives — that would wrongly silence it on a port crash (the discriminator test refutes exactly that).

The invariant to anchor on (per the story's carry-forward lesson): `loseShield` is the one place damage becomes death; the gate reads its result, not any earlier `damage`/`gunDamage` proxy. Reading `gunDamage` at the cue site would miss the S-016 drop case.

### Test roster (6)
1. `the fixture really crosses the @16 cue on step one` — reachability guard (green); makes #2 non-vacuous.
2. `the last shield falling to a WALL-GUN bolt on the cue frame silences the voice cue` — **the RED test.** Fails now (cue fires alongside the farewell); Dev's re-order makes it green.
3. `control: the SAME cue frame with shields to spare still speaks` — a gun hit that does NOT kill still cues; refutes a "gate on the hit" fix.
4. `boundary control: the bolt that leaves ONE shield still speaks` — gate is lives→0, not "a hit landed".
5. `THE RULING: a last shield falling to the EXHAUST-PORT crash does NOT silence the voice cue` — the discriminator; refutes a "gate on final lives" over-fix. Must stay green.
6. `a frame ENTERED dead never reaches stepTrench` — the dispatcher's gameover branch; the other half of the ROM exit.

### Rule Coverage (star-wars core)
- **Core purity / determinism:** tests drive `stepGame` on the pure core with fixed seed + `NO_INPUT` + fixed `DT`; no DOM/time/random. The existing `AC8 — pure core` determinism test in this file already guards replay-identity for the trench cues.
- **No line-number/count censuses in comments (sw8-21's three-round lesson):** comments anchor on mechanism names (`stepTrench`, `gunHit`/`loseShield`, `portHit`, `TRENCH_VOICE_CUES`, `reachedCockpit`) and the ROM label ordering (guard above walk, bash below), NOT working-tree line numbers. ROM citations name labels (PHEBS, DOBASE, PMRRP, SPKTRU, SPKR2N, PHIB0D), not our file lines.
- **Meaningful assertions / no vacuous tests:** every test asserts on the specific spoken line (`spokenLines(...).toContain/not.toContain('lukeTrustMe')`), not "any speech" — the death frame emits the farewell trio, so a coarse "no speech" assertion would be wrong. The reachability guard (#1) prevents #2 from passing vacuously.

Handing off to Korben Dallas (Dev) for GREEN.
## Dev Assessment

GREEN for sw8-22 (commit 87bf118a). Minimal change: the `TRENCH_VOICE_CUES` push moved from the top of `stepTrench` to just below the wall-gun shield resolution (`gunHit`), gated on `gunHit.lives > 0`. Crossing condition and parity logic are byte-identical to before — only the placement and the death gate changed.

**Why gunHit and not final lives:** `loseShield` is where damage becomes death, and `DOBASE` (wall guns) runs ABOVE the PH.TIM cue walk in PHEBS while the end-wall bash runs BELOW it under its own `SPKR2N`-only guard. So the gun death silences the line and the port crash does not. Reading `gunHit.lives` (not `gunDamage`, not `state.lives`) is the faithful reading — it folds away an S-016-dropped hit.

**Verification (all green):**
- Story block `trench-voice-timer` — 29/29 (the RED test #2 now passes; the port-crash discriminator #5 and controls stay green).
- Full `star-wars` project — 2351 passed / 209 files.
- `npm run lint` (tsc --noEmit) — clean.
- `tools/audit/check-comment-citations.mjs` — 0 stale citations.
- Tree sweep for stale bare-colon `sim.ts:N` refs past the insertion — clean (the two `:1516` hits are `WSMAIN.MAC:1516` ROM cites, untouched).

Blast radius (line-shift re-anchors) is logged as a Dev Delivery Finding above. No behavior change outside the trench voice gate.

Handing off for review.
## Design Deviations

### Reviewer (audit)
- No `## Design Deviations` entries were logged by TEA or Dev. Independent audit of the diff found no undocumented spec deviations: the fix ports the ROM's PHEBS structure faithfully (gun death above the cue walk silences it; the exhaust-port crash below the walk does not), and the citation/fixture re-anchors are mechanical consequences of the +17 line shift, recorded as a Dev delivery finding. Nothing slips through undocumented.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — tests 2351/2351, lint clean, 0 stale citations, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — domain hand-covered by Reviewer (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — domain hand-covered by Reviewer (see [SILENT]) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — domain hand-covered by Reviewer + rule-checker #8 (see [TEST]) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — domain hand-covered by Reviewer (see [DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — domain hand-covered by Reviewer (see [TYPE]) |
| 7 | reviewer-security | Yes | clean | none | N/A — core purity preserved, no new impurity/non-determinism |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — domain hand-covered by Reviewer (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations | N/A — 27 rules / 33 instances checked, 0 violations |

**All received:** Yes (3 enabled returned clean; 6 disabled pre-filled and hand-covered)
**Total findings:** 0 confirmed, 0 dismissed, 2 non-blocking coverage observations noted (LOW)

## Reviewer Assessment

**Verdict:** APPROVED

sw8-22 completes the death-gate family (sw8-13 space / sw8-21 surface / sw8-22 trench). The fix relocates the `TRENCH_VOICE_CUES` push from the top of `stepTrench` to below the wall-gun shield resolution (`gunHit`), gated on `gunHit.lives > 0`. The crossing computation and parity math are byte-identical to the removed top block (verified: same expression at old line 1329, new line 1518) — only the emission site and the death gate changed.

**ROM fidelity — independently verified against the 1983 source (`WSMAIN.MAC` PHEBS):** the top guard `LDA S.GAS / LBMI PHIB0D` (:1842-1843) precedes the PH.TIM cue walk `PMRRP` (:1865) → `SPKTRU`/`SPKYAU`/`SPKLET`/`SPKSTR` (:1874-1889); the end-wall bash (`BS.EFL` :1896 → `SUBD #0800` :1900) with its own guard `LBLE PHIB0D` (:1910) gating only `SPKR2N` (:1914) sits entirely BELOW the walk. So the gun death silences the cue and the port crash does not — the code matches the machine exactly. Reading `gunHit.lives` (post-`loseShield`), not `gunDamage` or the frame's final lives, is the faithful gate.

### Observations
- [PRE] Preflight GREEN — full star-wars suite 2351/2351, `tsc --noEmit` clean, comment-citation guard 0 stale, 0 code smells. Corroborated by my own runs.
- [SEC] Security clean — core purity preserved: no `shell/` import, no `Date.now`/`new Date`/`performance.now`/`Math.random`/`requestAnimationFrame`/DOM in the touched code; the added push is a pure function of existing deterministic state. (The lone `window` token in-region is the `// S-016 window` comment, not the DOM object.)
- [RULE] Rule-checker clean — 27 rules, 33 instances, 0 violations; it independently classified the `gunHit.lives > 0` gate as a correctly-scoped Rule-#14 exception, not a violation, and verified every re-anchored citation against the post-diff file.
- [EDGE] (edge-hunter disabled — hand-covered) Enumerated every frame-ending path after the gate: (a) gun death → `afterObstacles` forces `gameOver:true`/`mode:'gameover'` and every return path (safe-hold, port-crash, detonation, fall-through) carries `gunHit.lives`, so a gun death is terminal — the skipped cue is correctly LOST, matching the ROM; (b) exhaust-port crash resolves AFTER the push, under its own guard — cue rides out; (c) port detonation (win) → `clearRun`, cue rides (existing test pins it). The only path that skips the cue is terminal. [VERIFIED] terminal gate — evidence: sim.ts `afterObstacles.gameOver = gunHit.lives <= 0 ? true : base.gameOver`, and all four returns spread `afterObstacles`/carry `gunHit.lives`.
- [SILENT] (silent-failure-hunter disabled — hand-covered) No swallowed errors or silent fallbacks: `stepTrench` is a pure synchronous function, no try/catch; the cue is pushed onto the shared `events` array reference that `base`→`afterObstacles` spread by reference, so it reaches every return path.
- [TEST] (test-analyzer disabled — hand-covered; corroborated by rule-checker #8) The RED test has teeth — it failed 1/29 pre-fix (observed in the RED phase) and passes post-fix. The discriminator test (`THE RULING: … EXHAUST-PORT crash does NOT silence …`) asserts BOTH the death (lives 0, gameOver, exhaust-port-missed, r2Scream absent) AND cue presence, so it goes red under a naive "gate on final lives" over-fix. A reachability canary (`the fixture really crosses …`) guards the negative from vacuity. Assertions target the specific spoken line, not "any speech" (correct, since the death frame emits the farewell trio).
- [DOC] (comment-analyzer disabled — hand-covered) New comments match the ROM and the code (gunHit.lives, not gunDamage/state.lives); comment-citation guard reports 0 stale; the four re-anchored `sim.ts:N` citations verified against the current file — `1768` (SPACE_PHASE_END_S), `2280` (SPAWN_LATERALS), `2307` (surfaceShip — NOT the checker's suggested `:333`, which is a duplicate-quote comment false-positive), and `coaching.ts` bare-colon `:1533, :1706`.
- [TYPE] (type-design disabled — hand-covered) No casts or `any`; `parity` typed `'even' | 'odd'`; `gunHit.lives` is a numeric `loseShield` return (never null/NaN); tsc clean.
- [SIMPLE] (simplifier disabled — hand-covered) Minimal change — the relocated loop is identical logic wrapped in one `if`; no dead code, no over-engineering, no simpler faithful alternative (the gate cannot be written at the top because `gunHit.lives` is not yet bound there — the same constraint sw8-21 hit).
- [LOW] Coverage note (non-blocking): the trench has no explicit test for a gun hit DROPPED by the S-016 redraw window (damage, no death → cue should still fire), nor for the gun-survives-AND-port-kills-same-frame combo. The gate reads `gunHit.lives` (the `loseShield` result), which handles both correctly, and sw8-21 carries the surface S-016 analog — so this is a coverage gap, not a defect.

### Rule Compliance (typescript lang-review checklist)
- #1 Type-safety escapes: none introduced (no `as any`/`as unknown`/`@ts-ignore`/unsafe `!`). Compliant.
- #4 Null/undefined: `gunHit.lives > 0` is a numeric comparison, not a `||`/`??` site; `gunHit.lives` is always a number. Compliant.
- #8 Test quality: assertions are specific and non-vacuous, canary-guarded, mutation-style discriminators. Compliant (rule-checker enumerated 9 instances, 0 vacuous).
- #14 Derived edges in one branch: the crossing is still computed unconditionally at the top; only the emission is gated, and the sole skipped path is terminal. Correctly-scoped exception. Compliant.
- #20/#24 Quantities/retirements measured from same-diff artifacts: all shifted death-site line numbers and the branch site (1868→1885) were re-anchored together and verified against the post-diff file. Compliant.
- Core purity (plugins/star-wars/CLAUDE.md): stepTrench remains pure — no shell import, no clock/random/DOM. Compliant.

### Devil's Advocate
Argue this is broken. First attack: event ordering. The cue push moved from FIRST to after the obstacle-destruction, force-field-graze, and enemy-fire pushes. If any shell consumer assumed the voice line was always the first event of a trench frame, this silently reorders it. Rebuttal: the shell dispatches events by `type`, and no speech-before-sfx ordering contract exists; every "rides every return path" test uses order-independent `toContain`, and the full suite is green — so the reorder is inert. Second attack: the gate could silence a cue the pilot should hear. If `gunHit.lives` went to 0 via an S-016-dropped hit, the cue would wrongly vanish. Rebuttal: `loseShield` FOLDS the dropped hit and returns the unchanged lives (> 0), so the gate fires the cue — that is exactly why the gate reads the `loseShield` result and not `gunDamage`. Third attack: a port-crash death on the exact cue frame might now be gated off if a future refactor moved the push below the port logic. Rebuttal: today the push is above the port logic and rides `events` unconditionally once `gunHit.lives > 0`; the discriminator test would go red the moment that ordering broke. Fourth attack: the +17 line shift could have left a stale line citation somewhere a content-less test can't see. Rebuttal: the comment-citation guard (verbatim) reports 0 stale; the numeric-fixture test (sw8-27) is green; a repo-wide sweep of the old numbers found only genuine `WSMAIN.MAC` ROM cites (a coincidental `:1516`), untouched. Fifth attack: is a gun death actually terminal, or could `gunHit.lives <= 0` coexist with continued play? `afterObstacles` sets `gameOver`/`mode:'gameover'` and every return carries it — the run ends, so the one-shot cue is correctly lost, not deferred. No attack survives; the change is faithful and well-fenced.

**Data flow traced:** wall-gun enemy shot → `gunDamage` (collision with `trenchView`) → `gunHit = loseShield(...)` → `if (gunHit.lives > 0)` gate → `events.push({type:'speech', line})` → rides `afterObstacles` out to the shell (safe because a gun death makes the frame terminal and the port crash resolves below the push).
**Pattern observed:** ported ROM guard-above-cue-walk as a post-`loseShield` lives gate — `plugins/star-wars/src/core/sim.ts` `stepTrench`, the gated push after `gunHit`. Same shape as sw8-13/sw8-21.
**Error handling:** pure deterministic core, no failure modes; null/NaN impossible on `gunHit.lives`.
**Handoff:** To SM for finish-story.
## Impact Summary

**Scope:** Trench voice cue death gate (stepTrench, PHEBS ROM structure).

**Change:** Relocated `TRENCH_VOICE_CUES` push from top of `stepTrench` to below wall-gun shield resolution (`gunHit`), gated on `gunHit.lives > 0`. Crossing computation and parity logic unchanged; only emission site and death gate repositioned. The exhaust-port crash path remains unaffected.

**ROM Fidelity:** Faithful port of WSMAIN.MAC PHEBS structure — top guard (`LDA S.GAS / LBMI PHIB0D`) precedes the PH.TIM cue walk; wall-gun death (`DOBASE`) runs above the walk and silences the cue; exhaust-port crash (`BS.EFL`/`SPKR2N` guard) runs below the walk and does NOT silence the cue.

**Test Coverage:** 29/29 passing (1 RED test now green; 5 controls/discriminators stay green). Full star-wars suite 2351/2351 passed. Comment-citation guard 0 stale. Lint clean. Blast radius: +17 line-number re-anchors across fixture lists and citations (verified sweep).

**Findings:**
- Dev (Gap, non-blocking): Line-shift blast radius documented; re-anchored citations verified against post-diff file. Zero stale cites.
- TEA (Improvement, non-blocking): Coverage gap noted — no explicit test for S-016 dropped-hit case or gun-survives-AND-port-kills combo. Gate (`gunHit.lives > 0`) handles both correctly; deferred to successor story.

**Blocking Issues:** None. **Ready to finish:** Yes.
