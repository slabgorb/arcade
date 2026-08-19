---
story_id: "df6-2"
jira_key: "df6-2"
epic: "df6"
workflow: "tdd"
---
# Story df6-2: The two STATEFUL cues the single-shot path can't express: the THRUST held-loop and the LANDER-SUCK repeat

## Story Details
- **ID:** df6-2
- **Jira Key:** df6-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df6-2-thrust-loop-lander-suck-stateful-cues
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-19T14:20:03Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| red | 2026-08-19T13:09:51Z | 2026-08-19T13:35:32Z | 25m 41s |
| green | 2026-08-19T13:35:32Z | 2026-08-19T13:47:24Z | 11m 52s |
| review | 2026-08-19T13:47:24Z | 2026-08-19T14:01:26Z | 14m 2s |
| green | 2026-08-19T14:01:26Z | 2026-08-19T14:09:44Z | 8m 18s |
| review | 2026-08-19T14:09:44Z | 2026-08-19T14:20:03Z | 10m 19s |
| finish | 2026-08-19T14:20:03Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **(TEA, red) Gap / non-blocking — GREEN must update four df6-1 assertions the new
  loop kinds obsolete.** Adding `thrust-start/-stop` + `lander-suck-start/-stop` to
  `EVENT_KINDS` and `thrust`/`landerSuck` to `SOUNDS` breaks four df6-1 tests that were
  green at RED (so they are NOT in my failing set — they break only once Dev adds the
  kinds). Dev fixes them as part of GREEN:
  1. `df6-1-audio-events.test.ts:27-49` — `EXPECTED_KINDS` is a hardcoded 21-list matched
     by `toEqual`. Convert to a **superset/completeness** check (every df6-1 one-shot is
     still present + distinctness), not a literal 21-count (the "no count guards" project
     rule). The df6-1-audio-events cue-stream **fingerprint** (`:163-171`,
     `'cbb7f493cd8d4b40'`) legitimately changes — RE-BASELINE it after implementing (it
     cannot be computed until the cues exist; that is why it is a GREEN step, not RED).
  2. `df6-1-audio.test.ts:55` — `expect(NAMES.length).toBe(21)`. Drop the literal count;
     assert every expected one-shot cue is a `SOUNDS` key + each value ends `.wav`.
  3. `df6-1-audio-dispatch.test.ts:30-44` — "every kind plays exactly one sound" and "21
     DISTINCT cues" assume one-shot semantics. Partition: one-shot kinds → `play`, loop
     kinds → `startLoop`/`stopLoop`. (My df6-2 dispatch tests already pin the loop half.)
  4. `tests/audio-dispatch-convention.test.mjs` (orchestrator) is IDENTITY not count and
     needs no edit — but its `never`-narrowing guard means every new `EVENT_KINDS` entry
     MUST get a dispatch case or `npm run lint` fails. That is the compile fence for the
     router.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **(TEA, red) LANDER-SUCK is sounded as a held loop across the abduction ASCENT, not
  as a one-shot at the ROM's LANDFX trigger.** *Spec/ROM:* the machine plays `LSKSND`
  (DEFA7.SRC:684, REPCNT=$0A) at `LANDFX` (DEFB6.SRC:803), reached by `CMPA #YMIN+8 / BLS
  LANDFX` (:798-799) — i.e. once, at the TOP, when the carrier pulls the humanoid inside
  to transform it. In the core that instant is a single tick (`reachedTop` latches and the
  humanoid is consumed at landers.ts:346-353), which would make LSKSND a one-shot — exactly
  why it was NOT in df6-1. *What df6-2 does (per AC2):* sounds this REPEAT cue as a
  **held loop over `alive && carrying && !reachedTop`** (the only multi-tick "abduction in
  progress" state the core has) — start at grab-lift, stop at top/drop/carrier-death. *Why:*
  AC2 specifies this shape, it is the only way the cue is genuinely stateful, and a tractor
  beam reads as sustained to the ear. Precedent: audio.ts:345 already logs the ST1SND
  wave-start deviation. The tests REQUIRE the cue's `CUE_SOURCES.landerSuck.callSite` to
  record the TRUE site (LANDFX, DEFB6.SRC:803) so the deviation is honest, not a confabulated
  "it plays during the ascent" citation.

## Tea Assessment

**Phase:** finish → green | **Verdict:** RED verified, ready for Dev | **Date:** 2026-08-19

### What shipped (3 new suites, 40 tests: 25 RED feature-absent, 15 green)
- `tests/df6-2-thrust-loop.test.ts` — AC1/AC4 thrust half.
- `tests/df6-2-lander-suck.test.ts` — AC2/AC4 lander-suck half.
- `tests/df6-2-stateful-cues.test.ts` — AC3 determinism + cross-cutting AC4 guards.

RED verification (measured, not asserted): `npx vitest run --project defender df6-2` →
**25 failed / 15 passed**. `npm run lint` (tsc --noEmit) **clean** — the RED tree
type-checks (new kinds/sounds reached through `string` widening, the jt5-3 idiom).
Full defender project: **903 passed / 25 failed (only the 3 df6-2 files)** — no
collateral breakage; df6-1 stays green (a CLEAN red). Every RED failure is
feature-absent (`expected [] to deeply equal ['thrust-start']`, `EVENT_KINDS is
missing ...`, `CUE_SOURCES has no ...`, claims missing) — no staging exceptions.

### The 15 green are intentional, not vacuous
9 byte-exact ROM re-opens (ground truth the Dev must cite: THFLG PHR6.SRC:293; SNDSEQ
DEFA7.SRC:737-751; LSKSND DEFA7.SRC:684; LANDFX DEFB6.SRC:798-804) + 3 benign controls
(no-thrust silent, no-abduction silent, one-shots still play) + same-seed determinism +
no-.wav. None is a df6-2 behavior test passing early.

### What GREEN must build (the contract these tests pin)
1. **Core (`sim.ts`)** — two edge detectors as **pure serializable state** on `SimState`
   (a prev-frame boolean latch each; NO module `let` — the "two sims don't share edge
   memory" test is the guard). Thrust: emit `thrust-start` on `input.thrust` off→on,
   `thrust-stop` on→off; a HELD button re-fires nothing. Lander-suck: an **aggregate**
   held state `landers.some(l => l.alive && l.carrying && !l.reachedTop)` → `lander-suck-
   start` on 0→1, `lander-suck-stop` on 1→0 (ONE voice: a second carrier does not
   re-start; the loop stops only when the LAST carry ends). Rebuild `cues` per tick (already so).
2. **Union (`events.ts`)** — add the 4 kinds to `EVENT_KINDS`/`GameEvent` (payload-free).
3. **Dispatch (`audio-dispatch.ts`)** — becomes a ROUTER: one-shots → `play`; `*-start`
   → `startLoop`, `*-stop` → `stopLoop`. Widen the `SoundPlayer` param to include
   startLoop/stopLoop. The convention test's `never` guard forces a case per new kind.
4. **Manifest (`audio.ts`)** — `SoundName` gains `thrust`,`landerSuck`; `SOUNDS` two
   `.wav` names (NOT committed — df6-3 bakes them); `CHANNELS` a voice each (LSKSND is
   $C8=200 → its own `prio-200`; thrust has no SNDPRI — see below); `CUE_SOURCES`
   entries. **landerSuck**: `kind:'rom'`, table `LSKSND`, priority `0xC8`, source line 684,
   callSite `DEFB6.SRC:803` (the TRUE LANDFX site — the honest half of the design deviation).
   **thrust**: has NO FCB row / SNDPRI — it is a THFLG side-path. The existing df6-1
   `CueSource` union does not fit it; extend the union (a THFLG/flag variant) or model it so
   it is `kind !== 'invention'` and its provenance re-opens THFLG (PHR6.SRC:293) + the
   $16/$0F transitions. Do NOT force it into the FCB-row shape (df6-1-audio.test's
   `startsWith(table)` / `$XX SNDPRI` re-open would then fail it).
5. **Claims (`docs/rom-study/claims/19-sound.json`)** — new entries pinning PHR6.SRC:293,
   DEFA7.SRC:743 ($0F), DEFA7.SRC:750 ($16), DEFA7.SRC:684 (LSKSND $0A). Auto-verified by
   brief-dossier's whole-dir `checkClaims` (no test edit). Verbatim strings are TAB-exact —
   see the byte-verified lines already re-opened green in the two suites. Also correct the
   now-false prose: `19-sound.json:4` and `events.ts:29-30` / `audio-dispatch.ts:20` still
   say LSKSND/loops are deferred.
6. **df6-1 test updates** — see Delivery Finding above (four assertions, incl. the
   fingerprint re-baseline that can only happen post-implementation).

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)
No `.claude/rules/` or `SOUL.md` in this repo; the rubric is the TS lang-review + the ACs.
Applicable checks covered by these tests:
- **Exhaustive discriminated-union handling / no silent fallthrough** — the dispatch
  `never` fence (loop kinds must get cases) + "one-shots still play()" guard.
- **Determinism / no ambient state (clock, entropy, Set/Map order)** — AC3 same-seed
  replay + the "two sims don't share edge memory" module-`let` guard.
- **No vacuous assertions** — every emission group leads with a non-vacuity/`toBeGreaterThan(0)`
  or a positive-first control before any `not.toContain`/`toEqual([])`.
- **Meaningful state-transition assertions (AC4)** — edges asserted on the EXACT tick with
  the tick before clean; a flipped edge condition or a per-frame re-tick reddens (not a
  boolean presence check). The single-voice aggregate test kills a per-lander-startLoop mutant.
- **Byte-cited constants (no un-cited src/core magic)** — claims-coverage + CUE_SOURCES
  provenance tests; the core adds no new numeric constant (thrust is a boolean edge).

### Open question for Dev/Architect (non-blocking)
The thrust `CueSource` shape (extend the union vs a new variant) is a Dev design call — my
tests only require `kind !== 'invention'` and that THFLG/$16/$0F are claimed. Choose the
representation that keeps df6-1-audio.test's FCB-shape re-opens green for the 21 table cues.
## Dev Notes (green)

**Phase:** finish → review | **Date:** 2026-08-19 | commit `913da614`

Implemented exactly the contract in the Tea Assessment:
- `core/events.ts` — 4 loop-edge kinds on EVENT_KINDS (payload-free).
- `core/sim.ts` — `prevThrust`/`prevSucking` on the per-sim runtime; thrust edge after
  ship motion, lander-suck aggregate edge read at end-of-tick (after stepTick + smart-bomb
  clear + laser kills, so all three carry-end paths are seen). One aggregate suck voice.
- `shell/audio-dispatch.ts` — router: one-shot → play, `-start` → startLoop, `-stop` →
  stopLoop; switch/never fence intact (orchestrator convention test green).
- `shell/audio.ts` — SoundName/SOUNDS/CHANNELS +thrust,+landerSuck; new `flag` CueSource
  variant for thrust (THFLG side-path, no table row); landerSuck cites LSKSND $C8 + the
  true LANDFX call site. Stale "twenty-one" prose corrected.
- `claims/19-sound.json` — SND-23..26 (LSKSND, THFLG, $16, $0F); SND-1 exclusion prose fixed.
- df6-1 tests updated per the delivery finding: count guards → completeness, dispatch
  partitioned one-shot/loop (+ a loop-doesn't-reach-play guard), fingerprint re-baselined
  to `b3d6af7fc6d795fc` (289 cues — thrust edges on the every-even-tick script).

**Verification (measured):** `npm run lint` clean · defender vitest **929 passed** ·
`npm run test:orchestrator` **503 passed** · `node scripts/build-app.mjs defender` OK.
No `.wav` committed (df6-3 bakes them).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | 1477 tests green, build OK, no smells — confirmed |
| 2 | reviewer-edge-hunter | out | disabled | none | Domain assessed first-hand: both edge detectors sit unconditionally at fixed points in stepSim (not trapped in the gameOver branch — lang-review #14 ok); the one edge-case I found (thrust/suck not gated on player-alive, ROM :747-749) is recorded as a non-blocking Delivery Finding |
| 3 | reviewer-silent-failure-hunter | out | disabled | none | Domain assessed first-hand: the dispatch's `default→null` and @shared/audio's 404 silent-degrade are intentional+documented; the ONE real silent gap (the verb switch has no never-fence, so a 4th verb no-ops silently) is finding #2 below |
| 4 | reviewer-test-analyzer | Yes | findings | 3 (1 high, 1 med, 1 low) | confirmed 3, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Yes | clean | none | all ROM citations byte-verified, stale prose fixed, deviation accurate, fingerprint confirmed — confirmed |
| 6 | reviewer-type-design | out | disabled | none | Domain assessed first-hand: the new `flag` CueSource variant is handled safely by its sole field-consumer (df6-1-audio.test narrows on `kind==='rom'`); no exhaustive CueSource switch exists to break. The related test-side type-escape (unnecessary `as unknown as` casts) is finding #5 below |
| 7 | reviewer-security | out | disabled | none | Domain assessed first-hand: no auth/injection/secret/PII/network surface in a pure audio-cue diff; nothing to check |
| 8 | reviewer-simplifier | out | disabled | none | Domain assessed first-hand: the `!l.reachedTop` clause looked redundant but is load-bearing on the panic path (finding #3, kept + to be tested, not removed); no other dead code introduced |
| 9 | reviewer-rule-checker | Yes | findings | 9 (2 high, 2 low + 5 casts) | confirmed (folds into findings #1,#2,#5), dismissed 1 (RED-header convention) |

**All received:** Yes (all 4 enabled subagents returned; the 5 disabled domains assessed first-hand)
**Total findings:** 8 confirmed (2 high, 1 med, 5 low), 1 dismissed (with rationale), 1 deferred

Reviewer's own first-hand read (the disabled domains + cross-check): 1 non-blocking fidelity note (thrust/suck not gated on player-alive, ROM DEFA7.SRC:747-749 — cosmetic, cannot stick), otherwise corroborates the subagent findings below.

## Reviewer Assessment

**Round-Trip Count:** 1 | **Phase:** finish → green | **Date:** 2026-08-19

**Verdict:** REJECTED

**Working-tree audit:** CLEAN (after reverting the benign pf status stamp on sprint/epic-df6.yaml — tracking-only, not a mutation; the known false-DIRTY case).

**Subagents:** 4 enabled all returned (preflight clean/1477 green; comment-analyzer clean/all citations byte-verified; test-analyzer 3 findings; rule-checker 9 findings). 5 disabled via settings (covered by the reviewer's own read).

The shipped **behavior is correct** — comment-analyzer byte-verified every ROM citation, purity/determinism/primary-union-exhaustiveness all pass, no un-cited core constant. The findings are guard/coverage/cleanliness gaps the adversarial pass proved with mutations. Confirmed, ranked:

Specialist tags: **[TEST]** = reviewer-test-analyzer, **[RULE]** = reviewer-rule-checker, **[DOC]** = reviewer-comment-analyzer (returned CLEAN — every ROM citation byte-verified, all stale prose fixed, design-deviation accurate, fingerprint 289/b3d6af7fc6d795fc confirmed).

### CONFIRMED — must fix
1. **[TEST][RULE] [HIGH] `CUE_SOURCES.thrust`'s citation fields are byte-verified nowhere** (test-analyzer F1 + rule-checker #15/#19). The new `flag` variant slips past every `if (src.kind !== 'rom') continue` byte-teeth loop in df6-1-audio.test.ts, and df6-2-thrust-loop's provenance test only asserts `toBeTruthy`/`!== 'invention'`. **Mutation-proven:** corrupting `soundOn` to `{line:9999, verbatim:'MUTATED NONSENSE'}` left all 51+28 tests green. In a codebase whose whole ethos is byte-cited provenance, an unguarded citation object is a real gap. **Fix:** add a provenance test mirroring landerSuck's (df6-2-lander-suck.test.ts:305-316) — assert `flag==='THFLG'`, `source.line===293`, `soundOn.line===750`, `soundOff.line===743`, and each `verbatim` re-opens via `vendoredLine()`/`matches()`.
2. **[RULE] [HIGH] `playEventSounds`' `switch(cue.verb)` has no exhaustiveness fence** (rule-checker #3). Adding a 4th `Cue` verb compiles clean and silently no-ops — contradicting the file's own "a new moment cannot ship silently" guarantee that `cueFor`'s switch upholds. **Fix:** add a `default: { const _never: never = cue; void _never }` to the verb switch.
3. **[TEST] [MEDIUM] the `!l.reachedTop` clause in the sucking predicate is untested** (test-analyzer F2). Deleting it left df6-2-lander-suck green (killLander flips `alive` same-tick in the tested path). It IS load-bearing on the panic path (landers.ts:433 sets reachedTop on live carriers without killing them), so it is not dead code — but no test isolates it. **Fix:** add a case with `reachedTop=true, alive=true, carrying=true` (bypassing the auto-kill) asserting NOT sucking.

### CONFIRMED — should fix (low)
4. **[TEST] [LOW] no cross-sim isolation test for `prevSucking`** (test-analyzer F3), asymmetric with the `prevThrust` guard at df6-2-thrust-loop.test.ts:271. **Fix:** mirror it for the suck loop.
5. **[RULE] [LOW×5] unnecessary `as unknown as` double-casts** left from RED scaffolding (rule-checker #1) — the GREEN diff made them obsolete (thrust/landerSuck are real SoundNames; the recorder is directly assignable to SoundPlayer). These are lang-review #1 "type safety escapes" that now hide type errors. **Fix:** remove at df6-2-thrust-loop.test.ts:75,174; df6-2-lander-suck.test.ts:63,187; df6-2-stateful-cues.test.ts:29-30. (Keep the `asEvent`/`rig` casts — rule-checker confirmed both still load-bearing.)

### DISMISSED / NOTED
- **RED-phase headers in the test files** (rule-checker #17, test-analyzer noted): the "RED today..." framing is the codebase's permanent TDD-provenance convention (every defender test keeps it). Not introduced as a defect by this story; **dismissed** — but I will soften the two most literally-false lines while fixing, since they're cheap.
- **thrust/suck not gated on player-alive** (reviewer's own read; ROM DEFA7.SRC:747-749 gates thrust-ON): cosmetic fidelity nuance, cannot cause a stuck loop, outside AC1's literal scope. **Non-blocking** — recorded as a Delivery Finding for df6-4's playtest, not this rework.

**Total:** 8 confirmed (2 high, 1 med, 5 low), 1 dismissed with rationale, 1 deferred. Routing to Dev.
## Dev Notes (green — rework round 1)

**Phase:** finish → review (re-review) | **Date:** 2026-08-19 | commit `3057c0f4`

All 8 reviewer findings resolved:
- **#1 [HIGH]** — added a thrust flag-cue provenance test (df6-2-thrust-loop.test.ts): asserts `flag/source.line/soundOn.line/soundOff.line` + byte-for-byte `verbatim` re-opens. **Mutation-proven fixed:** corrupting `CUE_SOURCES.thrust.soundOn.line` 750→9999 now reddens 2 tests (was fully green before).
- **#2 [HIGH]** — added the exhaustiveness fence to `playEventSounds`' verb switch (audio-dispatch.ts). **Proven:** a 4th `Cue` verb now fails `tsc` (`not assignable to type 'never'` at :132).
- **#3 [MED]** — `!l.reachedTop` documented as defense-in-depth in sim.ts (perTickWiring transforms+kills a reachedTop lander same-tick — verified at sim.ts:627-633 — so `l.alive` already excludes it; the clause keeps the predicate correct-by-construction). Kept, not removed (removing would couple correctness to kill-ordering). This is the test-analyzer's explicit "document as defense-in-depth" alternative — a synthetic test would exercise an unreachable state.
- **#4 [LOW]** — added a `prevSucking` cross-sim isolation test mirroring the thrust guard.
- **#5 [LOW×5]** — removed the 5 obsolete `as unknown as` casts; kept the load-bearing `asEvent`/`rig` casts.
- softened the three false present-tense "RED today" header lines to past tense.

**Verification (measured):** `npm run lint` clean · defender vitest **931 passed** · orchestrator **503 passed** · both HIGH fixes mutation-proven (tree restored clean after each spot-check).
## Subagent Results

**Cycle: 1**

Method: re-ran all 4 enabled subagents against the full diff (`git diff develop...HEAD`, now incl. rework 3057c0f4), each mutation-verifying its round-1 findings in an isolated git worktree.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | 931 defender + 503 orchestrator + lint + build all green — confirmed |
| 2 | reviewer-edge-hunter | Skipped | disabled | none | Domain re-assessed first-hand: both edges unconditional at stepSim's single exit (#14 ok); the player-alive fidelity nuance stays a non-blocking Delivery Finding |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | none | Domain re-assessed first-hand: the round-1 real gap (verb switch silently no-ops) is now fenced (finding #2, verified) |
| 4 | reviewer-test-analyzer | Yes | clean | none | all 3 round-1 findings mutation-verified RESOLVED (5 mutations reddened the new provenance test; dropping !reachedTop → 0/931 regressions confirms it unreachable → doc is correct; module-scoped prevSucking reddened the new cross-sim test, proven non-flaky at 16× margin) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 (low, stale dividers) | both confirmed + FIXED in-branch (commit after 3057c0f4); round-1 comment accuracy re-confirmed |
| 6 | reviewer-type-design | Skipped | disabled | none | Domain re-assessed first-hand: flag variant still safely handled; the 6 obsolete casts removed, 4 load-bearing casts confirmed necessary |
| 7 | reviewer-security | Skipped | disabled | none | Domain re-assessed first-hand: no security surface in a pure audio-cue diff |
| 8 | reviewer-simplifier | Skipped | disabled | none | Domain re-assessed first-hand: !reachedTop kept as documented defense-in-depth (removing couples correctness to kill-ordering); no dead code |
| 9 | reviewer-rule-checker | Yes | clean | none | all 9 round-1 findings verified RESOLVED (verb fence errors tsc on a 4th verb; provenance mutation-tested; 6 casts removed; RED-today softened); fresh pass over the rework diff found NO new violation |

**All received:** Yes (4 enabled re-ran for cycle 1; 5 disabled domains re-assessed first-hand)
**Total findings this cycle:** 2 (both low stale-comment, both fixed in-branch), 0 open

## Reviewer Assessment

**Round-Trip Count:** 1 | **Phase:** finish → done | **Date:** 2026-08-19

**Verdict:** APPROVED

**Working-tree audit:** CLEAN.

Re-review of the round-1 rework (commit `3057c0f4`) plus the in-branch comment fix. **All 8 round-1 findings are mutation-verified RESOLVED by two independent subagents:**
- **[TEST][RULE] #1 [HIGH]** thrust flag-cue citation guard — test-analyzer & rule-checker each corrupted `CUE_SOURCES.thrust` fields and confirmed the new provenance test (df6-2-thrust-loop.test.ts) now reddens (5 distinct mutations caught; was fully silent in round 1).
- **[RULE] #2 [HIGH]** verb-switch exhaustiveness fence — both confirmed a 4th `Cue` verb now fails `tsc` (`not assignable to type 'never'`).
- **[TEST] #3 [MED]** `!l.reachedTop` — test-analyzer dropped the clause and got **0 regressions across 931 tests**, independently confirming the state is unreachable (perTickWiring transforms+kills a reachedTop lander same-tick, panic path included), so the defense-in-depth documentation is the correct resolution, not a synthetic dead-code test.
- **[TEST] #4 [LOW]** `prevSucking` cross-sim test — mutation-verified (module-scoped latch reddens it) and proven non-flaky (natural grabs land deterministically at tick 83, a 16× margin on the 5-tick window).
- **[RULE] #5 [LOW]** 6 obsolete casts removed (one more than the 5 flagged), lint clean, 4 load-bearing casts correctly retained; no assertion strength lost.

**[DOC] This cycle surfaced 2 new low findings** (comment-analyzer): two section-divider comments still read "until they ship"/"not in the shipped union yet" (false post-GREEN). Both **fixed in-branch** and re-verified; audit-tree clean.

**Fresh pass found no new violations** — purity/determinism/exhaustiveness all clean, fingerprint (289 cues) re-verified, no un-cited constant. Deferred (non-blocking, for df6-4's playtest): thrust/suck not gated on player-alive (ROM DEFA7.SRC:747-749) — cosmetic, cannot stick.

**Verification:** lint clean · defender **931** · orchestrator **503** · build OK. Approving to done.