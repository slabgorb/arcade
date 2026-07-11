---
story_id: "rb2-8"
jira_key: ""
epic: "rb2"
workflow: "tdd"
---
# Story rb2-8: The returning ace — BEHIND YOU pass + evade-death — P.UPD0 fly-by then return-from-six; EOLSEQ evade check (bank to correct side + hard-enough turn; first pass free, then 50/50). The signature bank-hard-to-shake-him mechanic

## Story Details
- **ID:** rb2-8
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** rb2-7 (multi-plane waves + drones + PLNLVL firing landed; seam: Enemy.kind discriminant now available; enemy fire decision logic in place but damage channel deferred to rb2-8/rb2-9)

## Technical Approach

### ROM Spec & Quarry

Canonical spec: `red-baron/docs/red-baron-1980-source-findings.md` §3 "The 'Red Baron' pass" (authoritative in-repo; ROM source `historicalsource/red-baron` gitignored, may be absent).

**The Returning Ace (P.UPD0) — findings §3, R2BRON.MAC:2723-2738:**

When a plane closes past `P.MNDP=140` it:
1. Enables returning-plane shells (the "BEHIND YOU" mechanic)
2. Fires the **"BEHIND YOU"** message (HUD side indicator)
3. Records `ENSIDE` (which screen side it closed from — left or right)
4. Re-enters as a **returning plane** (`NWENME`) that **intercepts the player** from behind (six o'clock position)
5. Deeper levels close faster (`PLPOSZ` is `GMLEVL`-indexed)

**The Evade Check (EOLSEQ) — the signature mechanic:**

This story implements the evade logic that gates player damage:
- First pass: free (no damage)
- Subsequent passes: **50/50 coin flip** — the player must bank to the correct side AND execute a hard-enough turn to dodge, else take damage
- The damage channel itself (lives/respawn) is rb2-9

### Frame Cadence (Load-Bearing)

- Sim ticks one step per **calc-frame** (~10.42 Hz / 96 ms), **NOT** display frame
- red-baron/src/core/timing.ts (`SIM_HZ`, `SIM_TIMESTEP_S`) encodes it
- All returning-ace re-entry and evade-check logic runs at calc-frame cadence

### Load-Bearing Seam: Enemy State Extensions

rb2-7 added the `Enemy.kind` discriminant and `planeFires` decision logic. rb2-8 MUST extend the Enemy type (or state graph) to track:

1. **Returning status:** is this a plane in its initial pass or a returning interception?
2. **Closed side:** which screen edge did it close from (left/right, necessary to evade correctly)?
3. **Evade counter / pass count:** has the player dodged this ace yet, or is this the first pass (free)?
4. **Evade eligibility:** only planes on a return pass can trigger an evade check; lone passes don't damage

This mirrors rb2-7's `kind` discriminant — a non-optional wiring change that will fail tests without it.

### Dependencies & Seams

- **Builds on:** rb2-7 (multi-plane waves, Enemy.kind, planeFires decision), rb2-6 (level ramp, scoring), rb2-4/rb2-5 (flight AI, guns, hit seam)
- **Blocks:** rb2-9 (lives/respawn consumes the evade-pass counter from the player's damage state)
- **Consume:** `context-epic-rb2.md` §3 (returning-ace mechanics, evade logic), `docs/red-baron-1980-source-findings.md` §3 (P.UPD0, ENSIDE, EOLSEQ, P.MNDP=140 close threshold, PLPOSZ level-indexed close speed)
- **Prior art:** read `sprint/archive/rb2-7-session.md` (seam gap closure, planeFires wiring), `sprint/archive/rb2-6-session.md` (scoring context), and especially `red-baron-1980-source-findings.md` §3 for the full returning-ace loop (the ROM's cycle: pass→close→BEHIND YOU message→re-entry→intercept)

## SM Assessment

**Setup complete — routing to TEA (O'Brien) for RED.**

- **Merge gate:** clear. No open PRs on red-baron; rb2-7 is merged (HEAD `82f5c10`). No blocking work in flight.
- **Dependency (`depends_on`):** rb2-7 (its precursor, now merged). No stack gate.
- **Session / context / branch:** about to be created below.
- **Jira:** local YAML tracking only (no real Jira) — claim step intentionally skipped, consistent with the whole rb2 epic.
- **Scope confirmed:** 5-pt TDD story. Unblocked by rb2-7's seam closure (Enemy.kind + planeFires now available). Technical Approach flags the one load-bearing risk TEA must resolve first — the **returning-plane state graph** (extending Enemy or adding a parallel returning-ace tracker). The evade check logic itself (first pass free, then 50/50) is ROM-pinned; the wiring/mutation model is a design choice.
- **Cadence reminder surfaced:** all re-entry and evade-check routines tick on calc-frame (`SIM_HZ`), not display frame. Flagged so RED tests assert on sim steps.
- **Prior art pointers set:** rb2-7 seam closure (Enemy.kind available), rb2-6 scoring context, findings doc §3 for the full returning-ace loop + PLPOSZ level-indexed close speed + P.MNDP threshold.

No open questions block RED. Handing off.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 5-pt TDD gameplay-logic story — the signature returning-ace mechanic. Pure, deterministic core logic; every branch is testable.

**Test Files:**
- `red-baron/tests/core/returning-ace.test.ts` — 32 tests, 10 AC groups, against a not-yet-existing `src/core/returning-ace.ts`.

**Tests Written:** 32 tests covering the full returning-ace loop:
- **AC-1** ROM thresholds — `P_MNDP`=140, `HARD_TURN`=0x1C=28 (byte-exact).
- **AC-2** `closesPast` — the P.UPD0 fly-by trigger; inclusive boundary at P.MNDP (the enemy floors at MIN_DEPTH=140), total on degenerate depth.
- **AC-3** `PLPOSZ`/`closeSpeed` — level-scaled close speed; 5 entries, positive, non-decreasing, clamped/total (behavioural — bytes not ROM-pinned).
- **AC-4** `beginPass` — records ENSIDE + arms BEFLAG; built from a real enemy's entry `side`.
- **AC-5** first pass free (BEFLAG) — unconditional evade + BEFLAG consumed (even on a skill-dodge first pass); the free ride ends after.
- **AC-6** skill dodge — correct side AND hard turn → guaranteed evade across the whole roll range.
- **AC-7** 50/50 — no skill dodge → roll-driven (`<0.5` evade, `≥0.5` hit); deterministic.
- **AC-8** both conditions required — soft-but-correct and hard-but-wrong both fall to the coin flip; HARD_TURN boundary inclusive (28 evades, 27 doesn't); polarity symmetric per shoulder.
- **AC-9** rule #4 / purity — `turnRate=0` is a real "no turn" (not a falsy default); no input mutation; exhaustive `EvadeResult` union sweep.
- **AC-10** integration — the REAL flight model reaches HARD_TURN at full yoke (dodge is flyable) and stays under it gentle; the REAL enemy weave bores in until `closesPast` fires.

**Status:** RED (32 failing — clean `need()` missing-export failures; 322 other tests green, no regression). RED commit `a047cdc`.

### Rule Coverage

| Rule (lang-review typescript.md) | Test(s) | Status |
|------|---------|--------|
| #4 `||` vs `??` — 0 is falsy-but-valid | `turnRate = 0 is a REAL "no turn"…` (AC-9), `a ΔX/roll drives the flip` | failing |
| #4 totality on degenerate input | `closesPast … TOTAL (NaN, ±Infinity)` (AC-2), `closeSpeed … clamps out-of-range` (AC-3) | failing |
| #3 exhaustive union (no stray enum value) | `ALWAYS returns a valid EvadeResult … (exhaustive sweep)` (AC-9) | failing |
| #8 test quality — meaningful assertions, no vacuous/coupling | self-checked (Phase C) — every test asserts concrete values | failing |
| purity / no mutation of readonly state | `does NOT mutate the input ace` (AC-9), determinism (AC-7) | failing |
| ROM-fidelity discipline (pin bytes, behaviour where unpinned) | AC-1 (bytes) vs AC-3 (behavioural PLPOSZ) | failing |

**Rules checked:** 6 of the applicable TypeScript lang-review checks have coverage (the pure-logic-relevant subset; #6 React, #9 build-config, #10 input-validation, #12 bundle are N/A to a pure core module).
**Self-check:** 0 vacuous tests found — every test has concrete `expect(...)` assertions on real values; no `let _ =`, no `assert(true)`, no always-None checks.

**Handoff:** To Dev (Yoda) for GREEN — implement `src/core/returning-ace.ts` to the contract in the test-file header, wire it into `src/main.ts` (the calc-frame sim step: `closesPast(nearestDepth)` → `beginPass(enemy.side)` → on the ace's attack `evadeCheck(ace, flight.turnRate, roll)`; the `'hit'` verdict feeds rb2-9's damage channel — NOT applied here). Honour the calc-frame cadence (findings §1). See the two design deviations (evade branch order + correct-side polarity are inferred) and the Delivery Findings (re-entry flight path deferred; loop-dedup → SH2-15).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `red-baron/src/core/returning-ace.ts` (new) — the pure returning-ace mechanic: `P_MNDP`/`HARD_TURN`/`PLPOSZ` constants, `closesPast` (P.UPD0 trigger), `closeSpeed` (level-scaled), `beginPass` (ENSIDE + BEFLAG), and `evadeCheck` (EOLSEQ: first free → skill dodge → 50/50). ~110 lines, no dependencies, no DOM/time/ambient randomness.

**Tests:** 354/354 passing (GREEN) — the 32 rb2-8 tests + 322 existing, zero regressions.
**Build:** `tsc --noEmit` clean, `vite build` clean.
**Branch:** feat/rb2-8-returning-ace (pushed)

**Approach:** Minimal code straight to the contract in the test-file header — no abstractions the tests don't demand. The three inference-driven choices (evade branch order, correct-side polarity, PLPOSZ values) match the deviations TEA logged; I implemented to those exactly. `evadeCheck` is pure and deterministic in the caller-supplied `roll` (the enemy.ts `planeFires` pattern).

**Wiring note (see Dev design deviation):** the module is NOT wired into `main.ts` this story — it lands as a pure decision module whose consumer (lives/respawn + the ENSIDE HUD, findings §5) is rb2-9, exactly mirroring how rb2-7 landed `planeFires`. No rb2-8 test requires `main.ts` wiring, and the "BEHIND YOU"/bullet-hole HUD is coupled to the rb2-9 death sequence. The deferred consumer is logged as a blocking-for-rb2-9 Delivery Finding.

**Self-review:**
- [x] Tests green (354/354), build clean, working tree committed, on the feature branch.
- [x] Follows project patterns — house header-comment style, `Object.freeze` tables, `clamp`/`levelIndex` helpers (mirrors enemy.ts), findings-cited.
- [x] All ACs met — every one of the 32 tests passes.
- [x] Error handling / totality — `closesPast` and `closeSpeed` are total on degenerate input (NaN/±Infinity/out-of-range); `turnRate=0` handled as a real value (not a falsy default).
- [~] Wired to a consumer — intentionally deferred to rb2-9 per precedent + coupling (documented deviation, not an oversight).

**Handoff:** To Reviewer (Obi-Wan) for code review. Please weigh the Dev design deviation (pure module, wiring deferred to rb2-9) and the two TEA inference deviations (evade branch order + correct-side polarity) — those are the judgment calls a fresh set of eyes should ratify.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 354/354 green, build clean, 0 smells, no stray files |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings (assessed by Reviewer — see Devil's Advocate) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings (assessed by Reviewer — no swallowed errors; the one `catch {}` is the house RED-import fallback) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (assessed by Reviewer — 32 tests, concrete assertions, no vacuous/`.only`/`.skip`) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings (assessed by Reviewer — header + JSDoc accurate, findings-cited, no stale comments) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings (assessed by Reviewer + rule-checker — readonly unions, no casts) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings (assessed by Reviewer — pure numeric logic, no input/DOM/network/secret surface) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings (assessed by Reviewer — ~110 lines, no over-engineering; unconsumed-module is the logged deferral, not accidental dead code) |
| 9 | reviewer-rule-checker | Yes | findings | 1 (LOW) | confirmed 1, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned, 7 disabled via `workflow.reviewer_subagents` and pre-filled as Skipped)
**Total findings:** 1 confirmed (LOW), 0 dismissed, 0 deferred — plus 2 Reviewer-originated forward findings (blocking for rb2-9)

## Reviewer Assessment

**Verdict:** APPROVED

A clean, focused, byte/behaviour-tested pure module — 354/354 green, `tsc`+`vite` clean, zero code smells, zero type-safety escapes. No Critical or High issues. The one confirmed finding is a LOW house-consistency nit; the two forward findings are integration guidance for rb2-9, not defects in the delivered unit.

### Rule Compliance (TypeScript lang-review + house rules — via reviewer-rule-checker, 18 rules / 47 instances)
- **#1 type-safety escapes** — clean: zero `as any`/`as unknown as`/`@ts-ignore`/non-null `!` in impl or tests (the one test cast `as ReturningAceModule` is the established defensive-import pattern).
- **#3 enum/union** — `EvadeResult` (returning-ace.ts:98) is a string-literal union, not a TS enum; no `switch` consumes it (no exhaustiveness site) — compliant.
- **#4 `||` vs `??`** — VERIFIED not a violation: `levelIndex` (returning-ace.ts:61) `Math.floor(level) || 0` is a deliberate NaN-fold (`0||0===0`, and `??` can't catch NaN); `turnRate=0` handled via `Math.sign`/`Math.abs` (line 121), never a falsy default.
- **#5 module/imports** — extensionless relative imports are correct under `moduleResolution: bundler` (matches every src/core file); `export type EvadeResult`.
- **#8 test quality** — 32 tests, concrete assertions, mirror interface matches the real exports 1:1, imports from `src/` not `dist/`, no `.only`/`.skip`.
- **house: purity/no-DOM/no-time** — clean: no `Date`/`Math.random`/`document`/`window`; only randomness is the injected `roll`.
- **house: ROM fidelity** — pinned values byte-exact (P_MNDP=140, HARD_TURN=0x1C), unpinned PLPOSZ disclosed as behavioural + deviation-logged.
- **house: readonly/fresh-object** — ONE finding (below): two `evadeCheck` branches reuse the input reference.

### Observations
- `[VERIFIED]` evadeCheck branch order is correct — returning-ace.ts:118-126: first-pass consumes BEFLAG into a fresh object (line 119), else skill-dodge = `sign(turnRate)===side && |turnRate|>=HARD_TURN` (line 121), else `roll<0.5` (line 125). Matches the 3-branch contract; tested AC-5/6/7/8.
- `[VERIFIED]` rule #4 / numeric-0 — evidence returning-ace.ts:61 (NaN-fold) + 121 (sign/abs); `Math.sign(0)=0` never equals `side∈{-1,1}`, so a level pass correctly rides the coin flip. Tested AC-9.
- `[VERIFIED]` totality — `closesPast` (line 71-73) and `closeSpeed`/`levelIndex` (61,76) total on NaN/±Infinity/out-of-range/fractional; tested AC-2/AC-3.
- `[VERIFIED]` ROM-fidelity discipline — pinned byte-exact vs behavioural split is honest and disclosed (returning-ace.ts:48-53, 100-111); tested AC-1 (exact) vs AC-3 (behavioural).
- `[RULE]` `[LOW]` object-identity aliasing — returning-ace.ts:123 & 125 return the input `ace` by reference (the first-pass branch returns fresh) — inconsistent with the house step-functions. No mutation (readonly); recommend `{ ...ace }` on all branches. Non-blocking. *(confirmed by reviewer-rule-checker)*
- `[SIMPLE]` (reviewer-assessed; subagent disabled) the module ships unconsumed by the bundle (no `main.ts` import) — this is the logged, precedented (rb2-7 planeFires) deferral to rb2-9, not accidental dead code. Accept.
- `[TYPE]` (reviewer-assessed + rule-checker) `ReturningAce` fields are `readonly`, `EvadeResult` is a closed union, `PLPOSZ` is `readonly` + `Object.freeze` — no stringly-typed API, no unsafe casts.
- `[SEC]` (reviewer-assessed; subagent disabled) no security surface — pure numeric logic, no user input, JSON, network, eval, secrets, or tenant data.
- `[SILENT]` (reviewer-assessed; subagent disabled) no swallowed errors in the impl; the test `catch {}` (RED defensive import) is intentional and house-standard.
- `[TEST]` (reviewer-assessed; subagent disabled) integration tests (AC-10) drive the REAL flight + enemy sims (not mocks), keeping the thresholds honest.
- `[DOC]` (reviewer-assessed; subagent disabled) header + JSDoc are accurate and findings-cited; the inferred choices are marked INFERRED, not stated as ROM fact.

### Data flow traced
Player yoke → `flight.step` → `FlightState.turnRate` (PLDELX); enemy `depth` → `closesPast` → `beginPass(enemy.side)` → `ReturningAce`; then `evadeCheck(ace, turnRate, roll)` → `EvadeResult`, `roll` drawn from a seeded RNG. Safe: fully deterministic, no external I/O, no mutation. The `'hit'` destination (lives/respawn) is rb2-9 — intentionally not wired here.

### Wiring
No UI→backend surface (Canvas game, no backend). `main.ts` wiring is intentionally deferred to rb2-9 (accepted deviation, precedent = planeFires). Type-checked by tsc even while unconsumed.

### Devil's Advocate
Argue this is broken. **(1) The signature mechanic is invisible.** rb2-8 is titled "the signature bank-hard-to-shake-him mechanic," yet it ships with zero player-facing behaviour — no plane ever gets on your six in-game, because nothing imports the module. A cynic says the story delivered a tested abstraction and no gameplay. Rebuttal: staged + precedented (planeFires), and the "BEHIND YOU"/bullet-hole cue is genuinely coupled to rb2-9's death sequence; wiring it now would be speculative UI. Accepted — but flagged loudly so rb2-9 closes the loop. **(2) The BEFLAG re-arm trap.** `beginPass` unconditionally arms `firstPass:true`. A naive rb2-9 that mints a new ace per pass gives the player a free dodge EVERY pass — the freebie never expires, gutting the difficulty. The ROM's BEFLAG is life-scoped. The module's per-ace API quietly invites this bug. → captured as a blocking-for-rb2-9 Delivery Finding. **(3) The trigger spams.** `closesPast` is a level predicate and `enemy.step` floors depth at 140, so once wired the pass re-fires every frame a plane sits at its floor — the pass must be edge-detected on the crossing, and the plane must fly back out (deferred re-entry path). → captured as a blocking-for-rb2-9 finding. **(4) Correct-side polarity is a coin-flip guess.** If the disasm proves the opposite polarity, the "signature" mechanic teaches players to bank the WRONG way. Rebuttal: symmetric, disclosed, one-line-revertible; behavioural invariant still holds. **(5) Aliasing.** If rb2-9 keys aces in a Map by identity, the reference-reuse in evadeCheck could alias — low, but real. None of these are defects in the delivered unit (it is correct and exhaustively tested); they are integration risks, now all documented.

**Handoff:** To SM (Thrawn) for finish-story. No blocking issues; the LOW consistency nit and the two rb2-9 integration findings are recorded and non-blocking for rb2-8.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-11T00:30:15Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-10T22:59:08+00:00 | 2026-07-10T23:01:14Z | 2m 6s |
| red | 2026-07-10T23:01:14Z | 2026-07-11T00:12:28Z | 1h 11m |
| green | 2026-07-11T00:12:28Z | 2026-07-11T00:19:35Z | 7m 7s |
| review | 2026-07-11T00:19:35Z | 2026-07-11T00:30:15Z | 10m 40s |
| finish | 2026-07-11T00:30:15Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): red-baron's shell loop duplicates the already-extracted
  `@arcade/shared/loop` — `src/main.ts:237-288` hand-rolls the same fixed-step accumulator
  (`accumulator += min(dt,0.25)`; `while (acc >= SIM_TIMESTEP_S) step`) as `advanceFixedSteps`.
  Affects `red-baron/src/main.ts` (swap the inline loop for `advanceFixedSteps`/`createLoop`;
  `/loop` is already published and red-baron already pins `@arcade/shared`). **Filed as story
  SH2-15** — out of scope for rb2-8 (loop hygiene, not a returning-ace concern).
  *Found by TEA during test design.*
- **Question** (non-blocking): the returning ace's re-entry FLIGHT PATH (the 3D positioning of
  the plane coming back from six-o'clock, `NWENME`) is NOT pinned by this story's tests — rb2-8
  pins the DECISION mechanic (trigger → ENSIDE → evade verdict), not the interception geometry.
  Affects `red-baron/src/main.ts` + a future render story (where the returning plane is drawn
  boring in from behind). Dev may add positioning state to the `ReturningAce`/`Enemy` beyond
  `{side, firstPass}`; the evade contract does not constrain it. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (blocking for rb2-9, non-blocking now): the evade verdict has no consumer yet — `evadeCheck`
  returns `'hit'`/`'evaded'` but nothing applies it. Affects `red-baron/src/main.ts` (rb2-9 must import
  `./core/returning-ace`, run the pass state machine in the calc-frame step, and route `'hit'` to the
  lives/respawn + ENSIDE bullet-hole channel). The pure module is complete and byte/behaviour-tested;
  only the wiring is deferred (see the Dev design deviation for the precedent + rationale).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): enemy.ts still floors depth at a hardcoded `MIN_DEPTH=140` with a fixed
  `CLOSE_SPEED=8`; rb2-8 now owns `P_MNDP=140` and the level-scaled `PLPOSZ`/`closeSpeed`. When rb2-9 wires
  the pass in, `enemy.step` should source its close speed from `closeSpeed(level)` and its floor from
  `P_MNDP` (single source of truth) rather than the local literals. Affects `red-baron/src/core/enemy.ts`.
  *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking for rb2-9, non-blocking now): BEFLAG re-arm trap. `beginPass(side)` ALWAYS arms
  `firstPass: true`, so if rb2-9 calls `beginPass` on every returning pass, the "FIRST TIME FREE" dodge
  re-arms each pass and never expires — the ROM's BEFLAG is LIFE-scoped (one freebie per life, findings §5),
  not per-pass. rb2-9 must persist "freebie already used this life" ACROSS passes (a life-scoped flag),
  seeding `beginPass`/`evadeCheck` accordingly — do NOT mint a fresh `firstPass:true` ace per pass. The
  delivered unit is correct as a per-ace primitive (tests pin per-ace semantics); this is a consumer
  contract for the wiring. Affects `red-baron/src/main.ts` (rb2-9). *Found by Reviewer during code review.*
- **Gap** (blocking for rb2-9, non-blocking now): `closesPast(depth)` is a LEVEL predicate (true for every
  `depth <= 140`), and `enemy.step` floors depth at exactly 140 — so once wired, the trigger is true on
  EVERY frame a plane sits at its floor, not once per pass. rb2-9 must EDGE-DETECT the P.MNDP crossing
  (fire the pass on the transition, arm the ace once) rather than re-triggering each calc-frame, else the
  "BEHIND YOU" pass spams. Ties to TEA's deferred re-entry-flight-path finding (the plane needs to fly back
  OUT after a pass). Affects `red-baron/src/main.ts` (rb2-9). *Found by Reviewer during code review.*
- **Improvement** (non-blocking, LOW): `evadeCheck`'s skill-dodge (returning-ace.ts:123) and 50/50
  (returning-ace.ts:125) branches return the input `ace` BY REFERENCE, while the first-pass branch (line 119)
  returns a fresh object — an inconsistent return-identity contract, and unlike the house step-functions
  (`enemy.step`, `flight.step`, `waves.stepWaveClock`) which always rebuild a fresh object. No mutation (readonly
  fields), so low risk, but returning `{ ...ace }` on all three branches would make the contract uniform and
  remove an object-identity aliasing edge case the JSON-diff purity test can't see. Affects
  `red-baron/src/core/returning-ace.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Evade-check branch structure is inferred from the finding prose**
  - Spec source: `docs/red-baron-1980-source-findings.md` §5 (EOLSEQ, R2BRON.MAC:1070-1102); `context-epic-rb2.md` §5(a)
  - Spec text: "`ENSIDE EOR PLDELX` must show banking to the correct side AND `|PLDELX| ≥ 0x1C` … to evade, else the player dies. First attack is a free dodge (BEFLAG 'FIRST TIME FREE'); every subsequent one is 50/50 (RANDOM)."
  - Implementation: tests pin a 3-branch order — (1) first pass → evade unconditionally + consume BEFLAG; (2) else correct-side AND hard turn → evade (guaranteed skill dodge); (3) else → `roll < 0.5` ? evade : hit. BEFLAG is consumed on the first *check* (even a skill-dodge first pass spends it), not the first *failure*.
  - Rationale: the finding gives the predicate and the free/50-50 split but not the exact branch nesting. This ordering makes the skill dodge a genuine guarantee (so it is "bank hard to SHAKE him", not a coin flip that ignores skill) while honouring "first free" and "then 50/50". The alternative (pure 50/50 after the first, skill irrelevant) contradicts the story's own "signature bank-hard-to-shake-him" framing.
  - Severity: minor
  - Forward impact: Reviewer/playtest to ratify against the 6809 disasm if/when EOLSEQ is transcribed; rb2-9 (lives/respawn) consumes the `'hit'` verdict but not the branch order.
- **Correct-side polarity chosen as `sign(PLDELX) === ENSIDE`**
  - Spec source: `docs/red-baron-1980-source-findings.md` §5 (EOLSEQ `ENSIDE EOR PLDELX`)
  - Spec text: "`ENSIDE EOR PLDELX` must show banking to the correct side"
  - Implementation: tests treat "correct side" as banking TOWARD the shoulder the ace came from — `Math.sign(turnRate) === ace.side`. Symmetric per shoulder (+1 needs a positive turn, −1 a negative turn).
  - Rationale: the ROM EORs the two sign bits and branches on the result, but the finding does not say WHICH branch (same-sign vs opposite-sign) is the evade. One polarity had to be chosen to write a concrete test; same-sign (turn into the threat) is the pick. The behavioural invariant that matters — one specific side evades, the other does not — is pinned regardless; only the label is inferred.
  - Severity: minor
  - Forward impact: if the disasm shows the opposite polarity, flip one comparison in the Dev impl + swap the sign expectations in AC-8/AC-10; no structural change.
- **PLPOSZ close-speed values tested behaviourally, not byte-exact**
  - Spec source: `docs/red-baron-1980-source-findings.md` §3 ("Deeper levels close faster (PLPOSZ GMLEVL-indexed)")
  - Spec text: "Deeper levels close faster (`PLPOSZ` `GMLEVL`-indexed)"
  - Implementation: `PLPOSZ` is pinned as a 5-entry (.LEVLS) table that is positive and non-decreasing with strictly faster ends, and `closeSpeed(level)` clamps/totals a bad index — but the individual byte values are NOT asserted.
  - Rationale: the finding pins the mechanism (level-indexed, rising) but not the bytes; asserting fabricated numbers would be a false ROM claim (same policy as enemy.ts's ACCEL/window tables where source pins the value, behaviour where it does not).
  - Severity: minor
  - Forward impact: if the PLPOSZ bytes are recovered from source, tighten to exact-value assertions; Dev picks values satisfying the invariants meanwhile.

### Dev (implementation)
- **`returning-ace.ts` lands as a pure decision module — NOT wired into `main.ts` this story**
  - Spec source: session scope ("In scope: … BEHIND YOU detection, evade check logic"); `context-epic-rb2.md` §5(a); `tests/multiplane-wiring.test.ts` scope note
  - Spec text: session scope lists "BEHIND YOU detection" in scope and "player damage application (lives/respawn = rb2-9)" out of scope; the multiplane-wiring guard explicitly defers the enemy-fire/evade/damage channel "to rb2-8 (evade) / rb2-9 (lives)".
  - Implementation: shipped the DETECTION + DECISION logic (`closesPast`, `beginPass`/ENSIDE, `PLPOSZ`/`closeSpeed`, `evadeCheck`) as a pure, fully-tested module. Did NOT add a `main.ts` consumer (no HUD "BEHIND YOU" glyph, no per-frame evade resolution, no returning re-entry flight path). The module is tree-shaken from the vite bundle until rb2-9 imports it (tsc still type-checks it).
  - Rationale: (1) minimalist discipline — the 32 RED tests demand only the pure module and its integration with the real flight/enemy sims; no test asserts `main.ts` wiring. (2) Direct precedent — rb2-7 landed `planeFires` as pure-logic-only with its damage channel deferred, and the reviewer approved it. (3) Coupling — findings §5 ties the rendered "BEHIND YOU" cue + windshield bullet-hole (side = ENSIDE) to the DEATH sequence, which is rb2-9 (lives/respawn); building the HUD now would be speculative UI ahead of its consumer. Forcing premature `main.ts` wiring would add untested shell code (main.ts runs only in the browser — node tests read it as text).
  - Severity: minor
  - Forward impact: rb2-9 imports this module — `closesPast(nearestDepth)` → `beginPass(enemy.side)` → at the attack apex `evadeCheck(ace, flight.turnRate, roll)`; the `'hit'` verdict drives `DEC LIVES`/respawn + the ENSIDE bullet-hole, and the returning re-entry flight path is drawn there (or a dedicated render story). No API change expected.

### Reviewer (audit)
- **TEA — Evade-check branch structure inferred** → ✓ ACCEPTED by Reviewer: the 3-branch order (first-free → skill-dodge → 50/50) is the only reading consistent with the story's own "signature bank-hard-to-SHAKE-him" framing; the alternative (pure 50/50, skill irrelevant) is self-contradictory. Disclosed in-code (returning-ace.ts:104-111), one-branch-revertible if the disasm says otherwise, and fully tested (AC-5/6/7/8). Sound.
- **TEA — Correct-side polarity `sign(PLDELX) === ENSIDE`** → ✓ ACCEPTED by Reviewer: the ROM `ENSIDE EOR PLDELX` branch direction is genuinely unrecoverable from the finding prose, one polarity had to be picked to write a concrete test, and the *behavioural* invariant that matters (one shoulder evades, the other doesn't) is pinned symmetrically (AC-8). Revertible with a single comparison flip + test sign-swap. Reasonable.
- **TEA — PLPOSZ tested behaviourally, not byte-exact** → ✓ ACCEPTED by Reviewer: correct ROM-fidelity discipline — the finding pins the mechanism (level-indexed, rising) but not the bytes; asserting fabricated numbers would be a false ROM claim. Matches the enemy.ts precedent (ACCEL/window tables). The chosen `[8,10,13,16,20]` satisfies every pinned invariant (positive, non-decreasing, faster ends; level-0 = enemy's current CLOSE_SPEED=8).
- **Dev — pure decision module, `main.ts` wiring deferred to rb2-9** → ✓ ACCEPTED by Reviewer: direct precedent — rb2-7 landed `planeFires` as pure-logic-only with its damage channel deferred, and it shipped unconsumed by `main.ts` too (verified: no `planeFires` reference in main.ts). The rendered "BEHIND YOU"/bullet-hole cue is coupled to the rb2-9 death sequence (findings §5), so building it now would be speculative UI ahead of its consumer; no rb2-8 test requires the wiring. The unconsumed module is tree-shaken from the bundle but type-checked by tsc. The deferred consumer + two integration traps are captured as blocking-for-rb2-9 Delivery Findings so nothing is lost.