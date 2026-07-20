---
story_id: "cp4-1"
jira_key: "cp4-1"
epic: "cp4"
workflow: "tdd"
---
# Story cp4-1: Centipede speed goes live — thread CENTIS into the march step and entry direction

## Story Details
- **ID:** cp4-1
- **Jira Key:** cp4-1
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T19:02:25Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T18:27:00Z | 2026-07-20T18:29:49Z | 2m 49s |
| red | 2026-07-20T18:29:49Z | 2026-07-20T18:50:34Z | 20m 45s |
| green | 2026-07-20T18:50:34Z | 2026-07-20T18:55:37Z | 5m 3s |
| review | 2026-07-20T18:55:37Z | 2026-07-20T19:02:25Z | 6m 48s |
| finish | 2026-07-20T19:02:25Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Question** (non-blocking): Below 40,000 the ROM's wave cadence OSCILLATES, and wave 2 marches SLOWER than wave 1 (CENTIS 2 → 1), not faster — it is not a monotonic ramp. Trace (from cp3-4's `stepWaveCadence` + SHOOT's `INC CENTIS`): train CENTIS runs 2,1,2,1,… across waves 1..n below 40k (CENTIN decrements every OTHER wave). This is faithful (CT-95, CENTI4.MAC:471-476), but it directly reshapes the user's original "every wave same pace" observation: the fix makes waves alternate 2/1, not accelerate. Affects `docs/rom-study/open-questions.md` (record the oscillation so it isn't mistaken for a bug later) and is worth surfacing to the user. *Found by TEA during test design.*
- **Improvement** (non-blocking): This story flips the wave-1 entry DIRECTION. Today `createCentipede()` hardcodes `dh=+2` (rightward); CT-10's `FRAME&2` sign at the boot frame 0 (`0 & 2 == 0` → COMP negate) is `-CENTIS` (LEFTWARD). The boot train will visibly enter from the other side. Faithful, but a visible change — pinned by the boot test. Affects `src/core/centipede.ts` / the observable boot train. *Found by TEA during test design.*
- **Improvement** (non-blocking): The three real lay sites (`createSim` boot :139, wave-clear re-lay :439, death respawn :396) should thread `state.frame` as well as `centis` so the entry sign is frame-accurate at every re-lay — not just at boot. The RED suite pins MAGNITUDE at all three sites and the SIGN on the pure `createCentipede` contract + at boot; it does not pin the exact entry sign at the wave-clear/respawn sites (that sign depends on how many pause frames elapsed, which is impractical to pin). Recommend Dev pass `frame` at all three sites regardless. Affects `src/core/sim.ts`. *Found by TEA during test design.*

### Dev (implementation)

- No upstream findings during implementation. TEA's findings #1 (oscillating cadence) and #2 (leftward boot) are now realised in code and recorded in `docs/rom-study/open-questions.md`; finding #3 (thread `frame` at all lay sites) is implemented — all three sites pass `frame`. *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- No deviations from spec. Implemented exactly the contract the RED suite drives: `createCentipede(centis = CENTIS_INIT, frame = 0)` with `dv = centis` and `dh = (frame & 2) ? +centis : -centis`, threaded at all three sim lay sites (boot `CENTIS_INIT,0`; wave-clear `cadence.centis, frame`; death respawn `state.centis, frame` — Finding #3 honoured). CENTIN-as-length stays cp4-2 (the fence), NEWHD's hardcoded `MOBJDV=2` untouched (out of scope).

### TEA (test design)
- **createCentipede signature: optional params with ROM-boot defaults, not required params**
  - Spec source: context-story-cp4-1.md, AC-1/AC-2 ("the per-frame march magnitude reads SimState.centis"; "both axes derive from CENTIS … sign from FRAME AND 2")
  - Spec text: "CENT_SPEED=2 is removed or demoted to CENTIS's documented boot seed"; "Both axes derive from CENTIS as the ROM does (:479-485)"
  - Implementation: The RED suite drives the contract `createCentipede(centis: number = CENTIS_INIT, frame: number = 0): Segment[]` — parameters OPTIONAL, defaulting to the ROM boot seed (CENTIS_INIT, frame 0). The AC did not specify the signature.
  - Rationale: Required params would force re-seating ~18 existing zero-arg call sites (4 test files) with no behavioural benefit, and each edit risks altering an unrelated test's intent. Optional params keep the whole 668-test baseline compiling and green (AC-4), while the three behavioural wiring tests (boot / wave-clear cadence / death respawn, using centis ≠ 2) still force Dev to thread the live centis at every current call site — so the silent-degradation risk the epic exists to kill is closed by behaviour, not by the type signature.
  - Severity: minor
  - Forward impact: cp4-2 (fragmentation) also lays the train and will consume the same `createCentipede(centis, frame)` surface — the optional-default convention carries forward; a future call site that omits the args would silently get the boot seed, so cp4-2's own tests must likewise pin its lay behaviourally.
- **A magnitude-only assert at the boot site is vacuous (2 == 2); pinned the boot SIGN instead**
  - Spec source: context-story-cp4-1.md, AC-2
  - Spec text: "horizontal = ±CENTIS with the sign from FRAME AND 2; pinned by a test that changes centis and observes the step change on both axes"
  - Implementation: The boot-wiring test cannot distinguish "reads centis" from "hardcodes 2" on magnitude alone, because boot CENTIS (2) equals the old constant (2) — the coincidence-boundary trap. It instead pins the boot ENTRY SIGN (`dh === -CENTIS_INIT`, leftward at frame 0), which reddens on current code. The centis-magnitude change is driven by the wave-clear + death-respawn tests, where the live centis is 1 (≠ 2).
  - Rationale: A test that passes on both the fixed and unfixed code drives nothing; the sign is the discriminating property at the boot site.
  - Severity: trivial
  - Forward impact: none

## Sm Assessment

**Setup complete. Routing to O'Brien (TEA) for the RED phase.**

**What this story is:** The playtest fix for "every wave runs at the same pace."
The centipede's per-frame march reads a module-private `CENT_SPEED = 2`
(`centipede/src/core/centipede.ts:72`, used as both `dh` and `dv` at `:190-191`)
instead of `SimState.centis`. cp3-4 already wired `centis` and the per-wave
cadence (`stepWaveCadence`); this story makes the march CONSUME it. Pure
`src/core`, no rng, no shell.

**Readiness:**
- Session file, story context (`sprint/context/context-story-cp4-1.md`, enriched
  with source pointers), and epic context all created.
- Branch `feat/cp4-1-centis-speed-live` cut off `origin/develop` (centipede is
  gitflow; PR targets `develop`).
- Merge gate clear — no open PRs in centipede.
- Freshly filed epic (cp4, `sprint/epic-cp4.yaml`); this is the p1 next story.

**Key pointers for TEA (in the context file):**
- Design spec: `centipede/docs/superpowers/specs/2026-07-20-centipede-cp4-game-structure-design.md`.
- ROM ground truth: `CENTPC` in `reference/atari-source/centipede/revision.v4/CENTI4.MAC:456-554` (VENDORED tree only — citation gate rejects the `~/Projects/centipede-source` off-by-one copy). CENTIS drives both axes: `MOBJDV = CENTIS` (`:479-480`), `MOBJDH = ±CENTIS`, sign from `FRAME AND 2` (`:481-485`).
- `.RADIX 16` — every transcribed constant needs a radix-cited comment + a claims entry; `npm test -- citations` stays green.

**Scope fence:** cp4-1 is the SPEED half only. Fragmentation/loose heads = cp4-2,
colour walk = cp4-3. The scope-fence comment at `centipede.ts:162-168` gets its
speed half struck, not the whole note. This story is parallel-safe against cp3-3
(scorpion) — nothing here touches SCORP/poison.

**Watch-out (from the story's own SANITY note):** `stepWaveCadence` resets CENTIS
to 1 below 40,000 on the wave-2 re-lay, so wave 2 may march *slower* than boot
(boot CENTIS=2). That is what the ROM does — transcribe and pin it, record any
surprise in `open-questions.md` rather than "fixing" it. TEA should write the
test to the ROM's behavior, not to an intuition that wave 2 must be faster.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Behavioural change to the deterministic core (the centipede march) — pure logic, fully unit-testable.

**Test Files:**
- `tests/centis-speed.test.ts` (new) — 7 tests. No existing tests deleted; no existing call sites re-seated (the `createCentipede(centis, frame)` contract uses ROM-boot defaults, so the 668-test baseline is untouched).

**Tests Written:** 7 tests covering AC-1, AC-2, AC-3 + the three lay-site wirings.
**Status:** RED — 6 driving tests fail, 1 invariant guard green (see below). Full suite otherwise 670 green (39 files, only `centis-speed.test.ts` red).

### AC → test map

| AC | Test(s) | RED? |
|----|---------|------|
| AC-1 (march magnitude reads centis; CENT_SPEED removed/demoted) | "magnitude IS the argument, not the old constant 2" (centis ∈ {1,2,3}); "the step magnitude actually MOVES the train by centis" | RED |
| AC-2 (both axes = ±CENTIS, sign from FRAME&2) | "magnitude … both axes"; "the horizontal ENTRY sign is FRAME&2" (both halves, one test); boot "frame 0 enters LEFTWARD" | RED |
| AC-3 (real wave clear → wave-2 marches at cadence centis, no hand-poked centis) | "clearing wave 1 lays a wave-2 train … cadence CENTIS, not the boot 2" (drives a real all-dead clear through SHOOT's INC + `stepWaveCadence`) | RED |
| AC-4 (full suite green, none deleted) | verified: 670 pass, only the 6 new driving tests red pre-impl | n/a |
| wiring (all 3 lay sites) | boot / wave-clear / death-respawn each pinned with centis distinguishable from the old 2 (wave-clear & respawn use centis=1) | RED |

**The one green test** — "bodies copy the head heading exactly (CT-8)": an invariant guard, already satisfied (bodies always copy the head's dh/dv). It is NOT vacuous — it reddens against a plausible wrong impl that applies the FRAME&2 sign to the head only, or gives bodies a different dv. Kept green on purpose.

### Rule Coverage
No `.pennyfarthing/gates/lang-review/typescript.md` rule maps to new type-design surface here (this story threads an existing numeric field through an existing pure function; no new constructors, enums, or deserialization). Self-check: every test carries a meaningful `expect`; no `let _ =`, no `assert(true)`, no `is*()`-on-always-null. The two potential vacuous spots (bodies-copy guard; boot 2==2) were caught in self-check and addressed — the boot test was rewritten to pin the discriminating SIGN.

**Self-check:** 0 vacuous tests shipped (1 identified and rewritten, 1 kept as a justified invariant guard).

### Notes for Julia (Dev)
- The contract the suite expects: `createCentipede(centis: number = CENTIS_INIT, frame: number = 0): Segment[]` — `dv = centis`, `dh = (frame & 2) !== 0 ? +centis : -centis`. Body offset logic at `centipede.ts:198` already keys off `dh` sign, so it carries through unchanged. Keep the CT-10 citation on the demoted `CENT_SPEED` comment / the new consumption.
- Thread the live value at all THREE lay sites in `sim.ts`: `createSim` :139 (`state.centis`/`0`), wave-clear re-lay :439 (`cadence.centis`, NOT `state.centis` — the transient 3 must not reach the train), death respawn :396 (`state.centis`). Pass `frame` too (Delivery Finding #3).
- Do NOT touch NEWHD's fresh-head speed — it is a hardcoded `MOBJDV=2` ("NEW BUG GOES FAST", :1672), not centis. Out of scope.
- Record the oscillating-cadence surprise (wave 2 slower than wave 1 below 40k) in `docs/rom-study/open-questions.md` per the story's SANITY note (Delivery Finding #1).

**Handoff:** To Julia (Dev) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/centipede.ts` — removed the module-private `CENT_SPEED = 2`; `createCentipede(centis = CENTIS_INIT, frame = 0)` now sets `dv = centis` (`:479-480`) and `dh = (frame & 2) ? +centis : -centis` (`:481-485`, COMP-negate per CENIR4.MAC:184), keeping the CT-10 citation. Body offset logic (`:198`) already keys off `dh` sign, so it carries through unchanged. Updated the scope-fence comment: the SPEED half is now wired; the LENGTH/fragmentation half stays cp4-2.
- `src/core/sim.ts` — threaded the live value at all three lay sites: boot `createCentipede(CENTIS_INIT, 0)` (:139), death respawn `createCentipede(state.centis, frame)` (:396), wave-clear re-lay `createCentipede(cadence.centis, frame)` (:439 — the cadence output, not the transient 3).
- `docs/rom-study/open-questions.md` — recorded the oscillating-cadence finding (wave 2 slower than wave 1 below 40k; pace alternates 2/1, does not ramp), per the story's SANITY note.

**Tests:** 676/676 passing (GREEN — was 6 red + 670; the 6 cp4-1 driving tests now pass, no existing test re-seated or deleted). Lint (`tsc --noEmit`) clean, `vite build` clean, citation gate 26/26 green.

**ACs:** AC-1 (magnitude reads centis, CENT_SPEED removed) ✓ · AC-2 (both axes ±CENTIS, sign from FRAME&2) ✓ · AC-3 (real wave clear → wave-2 marches at the cadence centis) ✓ · AC-4 (full suite green, none deleted; build+lint clean) ✓.

**Notes:**
- The boot train's entry direction flips rightward → LEFTWARD (frame 0 → `0 & 2 == 0` → `-CENTIS`), faithful to CT-10. No existing test broke on it (TEA's sign-agnostic analysis confirmed — 676 green with zero re-seats).
- Behavioural upshot for the user's playtest: waves now ALTERNATE pace (2,1,2,1 below 40k), they do not accelerate — the faithful ROM cadence. Recorded in open-questions.md.

**Handoff:** To O'Brien (TEA) for the verify phase (simplify + quality-pass).

### Delivery Findings (Dev)

- No upstream findings during implementation. TEA's three findings stand as written; the leftward-boot and oscillating-cadence consequences are now realised in code and documented in `docs/rom-study/open-questions.md`.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 4 review-pass notes (0 blocking) | all 4 resolved by reviewer analysis (see below) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — assessed directly |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — assessed directly |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — assessed directly (mutation battery) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — assessed directly (found 1) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — assessed directly |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — N/A (pure core) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — assessed directly |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — assessed directly (13 checks) |

**All received:** Yes (1 enabled subagent returned; 8 disabled via `workflow.reviewer_subagents`, assessed directly)
**Total findings:** 1 confirmed (fixed in review), 0 dismissed, 0 deferred

Preflight's 4 review-pass notes, resolved:
1. *No other caller relies on zero-arg expecting ≠ CENTIS_INIT* — grep + full suite green + mutation M7 confirm; only the 3 sim sites (now explicit) and test sites (boot default = old magnitude) call it. Resolved.
2. *`cadence.centis` is the fresh post-`stepWaveCadence` value, not stale* — `sim.ts:433` computes it, `:439` consumes it; mutation M5 (passing the transient `state.centis` instead) is CAUGHT. Resolved.
3. *`CENIR4.MAC:184` vs `CENTI4.MAC` — typo?* — VERIFIED not a typo: `CENIR4.MAC:184` genuinely holds `COMP =. / EOR I,0FF / CLC / ADC I,01` (the two's-complement negate), a real utility routine in a different module than CENTPC. The citation is correct and precise. Resolved.
4. *SCOPE FENCE comment consistent with scope* — confirmed: speed half done, length/fragmentation deferred to cp4-2. Resolved.

## Reviewer Assessment

**Verdict: APPROVED**

A minimal, faithful, well-guarded change. `createCentipede(centis, frame)` consumes CENTIS as the per-frame step on both axes (CT-10, CENTI4.MAC:479-485), the hardcoded `CENT_SPEED=2` is gone, and all three lay sites thread the live value. 676/676 green, lint + build clean, citation gate 26/26. One minor doc finding, fixed in review.

### Method note
Same-session pf relay (this session did dev + review) and 8 of 9 reviewer specialists are disabled, so per project practice I leaned on a **mutation battery** over self-re-reading. 7 mutations, one per behavioural axis, applied to the committed source and reverted: **all 7 CAUGHT, zero survivors.**

| Mutation | What it breaks | Result |
|----------|----------------|--------|
| M1 `dv = centis` → `dv = 2` | vertical reverts to hardcoded | CAUGHT (3 red) |
| M2 dh sign inverted | entry direction wrong | CAUGHT (3 red) |
| M3 dh magnitude → `2` | horizontal reverts to hardcoded | CAUGHT (4 red) |
| M4 `frame & 0x02` → `& 0x01` | wrong FRAME bit | CAUGHT (2 red) |
| M5 wave-clear passes `state.centis` (transient 3) not `cadence.centis` | re-lay speed wrong | CAUGHT (1 red) |
| M6 death-respawn hardcodes boot centis | respawn speed wrong | CAUGHT (1 red) |
| M7 boot passes wrong frame (rightward) | boot direction wrong | CAUGHT (1 red) |

Each of the three lay sites (M5/M6/M7) is independently guarded, so the "silent site defaults to boot speed" risk O'Brien flagged is genuinely closed by behaviour.

### Observations (tagged by domain; 8/8 domains assessed directly)

1. **[DOC] CONFIRMED (fixed in review):** the `createCentipede` doc-comment claimed a bare call "lays the boot train unchanged" and called the old +2 step "leftward" — but the boot DIRECTION flips rightward → leftward (only the magnitude is unchanged). This contradicted the Delivery Findings and open-questions.md. Corrected in `centipede.ts` (commit on branch); severity minor, comment-only.
2. **[TEST] VERIFIED strong:** mutation battery 7/7 caught, zero survivors — the suite is non-vacuous on every axis. The one green-in-RED test (bodies-copy) is a justified invariant guard (it reddens against a head-only sign application at centis≠2, covered by the all-segments magnitude test).
3. **[EDGE] VERIFIED:** boundary inputs are non-reachable non-defects — `centis=0` would freeze the train but the cadence only ever yields 1 or 2; `frame` bitwise-AND coerces to int32 but the counter never approaches 2^31 (~414 days at 60fps). No reachable edge defect.
4. **[SILENT] VERIFIED (with logged forward-risk):** `createCentipede` is pure arithmetic — no swallowed errors. The optional-default IS a latent silent path (a future caller omitting args gets the boot seed), but all 3 current sites pass explicit args (M5/M6/M7 prove it) and TEA logged the forward-impact for cp4-2. Non-blocking.
5. **[TYPE] VERIFIED:** `(centis: number, frame: number)` matches the module's convention (all ROM quantities are raw `number`). Default-parameter syntax (not `||`) correctly preserves a `centis=0` argument — the right choice under lang-review rule #4.
6. **[SIMPLE] VERIFIED:** minimal — two assignments replace two, dead `CENT_SPEED` removed, no new abstraction. Body offset stays ±8 regardless of centis, faithful to :530-540.
7. **[SEC] N/A:** pure deterministic core — no I/O, auth, secrets, or untrusted input.
8. **[RULE] VERIFIED:** all 13 TypeScript lang-review checks pass (no `as any`/`as unknown`/`@ts-ignore`/non-null-assertion; correct `import type`; correct default-params vs `||`; no enum/async/React concerns). Core purity preserved (no `Date.now`/`Math.random`; `purity.test.ts` green). Every transcribed constant carries a radix-cited ROM comment; citation gate 26/26.
9. **[DOC] VERIFIED:** the `CENIR4.MAC:184` COMP citation is a genuine second source file, not a typo — verified against the vendored tree.

### Rule Compliance (lang-review/typescript.md, exhaustive over the diff)

- **#1 type escapes:** none (`as const` on `NO_INPUT` is not an escape). ✓
- **#2 generics:** `createCentipede(number, number)`; no `Record<string,any>`/`object`/`Function`; return `Segment[]` not a mutated param. ✓
- **#3 enums:** none in diff. N/A
- **#4 null/undefined:** default params (`= CENTIS_INIT`, `= 0`) trigger only on `undefined`, correctly preserving `0`; no `||`-on-falsy. ✓
- **#5 modules:** `import type`/inline `type` used correctly; no `.js`-ext regression (matches repo convention). ✓
- **#6 React:** N/A (no .tsx)
- **#7 async:** N/A (no async)
- **#8 tests:** no `as any` in assertions; imports from `src/` not `dist/`; no `vi.mock`; assertions meaningful (mutation-proven). ✓
- **#9 build/config:** no config change. N/A
- **#10 input validation:** N/A (no external input)
- **#11 error handling:** N/A (no try/catch)
- **#12 perf:** `createCentipede` runs on lay, not per-frame; no hot-path concern. ✓
- **#13 fix regressions:** the review comment-fix added no `as any`/`||`. ✓

### Devil's Advocate

Assume this is broken. **Attack 1 — the wave-2 slowdown is a bug, not a feature.** A player expects levels to get harder; this ships a wave 2 that is *slower* than wave 1 (centis 2→1). Could Julia have inverted the gate? No: `stepWaveCadence` is cp3-4's already-shipped, independently test-pinned function; cp4-1 only makes the train *read* it. The slowdown traces cleanly to the ROM (SHOOT `INC CENTIS`→3, CENTPC resets to 1 below 40k, CT-95) and is recorded in open-questions.md. It is faithful, not inverted — and the mutation battery would redden if the consumption were wrong. **Attack 2 — a confused maintainer calls `createCentipede()` bare in a new cp4-2 site and silently ships boot speed.** Real risk, but it is exactly the forward-impact TEA logged; cp4-2's own tests must pin its lay behaviourally, and the three current sites are explicit and mutation-guarded. **Attack 3 — the boot-direction flip breaks a downstream render/collision assumption.** The full 676-test suite (render, collision, motion, shoot, death-restor) is green with the leftward boot train; TEA's sign-agnostic analysis held with zero re-seats. Nothing reads "the train enters rightward." **Attack 4 — `frame & 0x02` on a huge frame.** JS coerces to int32; the counter never approaches the wrap in any real session. **Attack 5 — `cadence.centis` is stale.** Mutation M5 proves the test reddens if the transient `state.centis` (3) is passed instead. **Attack 6 — the death path leaks the wrong speed.** M6 proves a respawn hardcoding boot centis reddens. Every attack either traces to faithful ROM behaviour or is caught by a live test. No new finding surfaced.

### Verdict rationale
All 4 ACs met and mutation-verified; 676 green; lint/build/citations clean; the sole finding (a misleading comment) fixed in review. No Critical/High/Major issues. **APPROVED.**

**Handoff:** To Winston Smith (SM) for the finish ceremony. PR is created + merged by SM with explicit human merge authorization (AI-authored + AI-reviewed self-approval guardrail).