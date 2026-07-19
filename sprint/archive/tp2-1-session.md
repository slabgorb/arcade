---
story_id: "tp2-1"
jira_key: "tp2-1"
epic: "tp2"
workflow: "tdd"
---
# Story tp2-1: PULPOT is one ROM byte — the pulsar CLIMB/REVERSE tier also widens to $C0 at wave 65, but tp1-26 fixed only the kill gate

## Story Details
- **ID:** tp2-1
- **Jira Key:** tp2-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 2
- **Type:** bug
- **Repos:** tempest
- **Branch:** fix/tp2-1-pulpot-pulsar-tier-c0

## Acceptance Criteria
1. DECIDE FIRST, then build (a fidelity ruling, not a pure transcription): EITHER (a) adopt the ROM — the climb-speed reader (interpreter.ts:183) and reverse reader (:321) read the SAME wave-parameterised PULPOT the kill gate uses (a shared PULPOT-wave lookup, $A0 waves 1-64 / $C0 65-99, routed through contourWave), so all three JPULMO readers widen together at wave 65; OR (b) formally ratify the $A0-only climb/reverse deferral as a deliberate, cited divergence recorded in docs/audit/findings, not only in a code comment. Record the decision and its reasoning in the story.

2. If (a): the wave-1 pulsar-motion behaviour must NOT regress — the tp1-5 / tp1-6 / sim.enemy-motion-fidelity pulsar suites stay green (they pin $A0 at wave 1, which is unchanged). Add a test that derives the climb/reverse boundary OUT OF the running sim (not re-derived arithmetic) and pins its widening to $C0 at a wave on each side of 65.

3. If (a): PULSAR_NEAR_FAR_DEPTH (the frozen $A0 climb constant) is unified with / retired in favour of the wave-parameterised PULPOT — no two constants that merely coincide below wave 65 left drifting (the tp1-26 name-split hazard).

4. Cite ALWELG.MAC:1783-1786 (climb), 1795 (reverse), 1804-1806 (kill), and WPULPOT 606-609. npm test -- citations stays green and node tools/audit/reanchor-citations.mjs reports 0 lost.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T04:46:43Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T04:09:14Z | 2026-07-19T04:12:35Z | 3m 21s |
| red | 2026-07-19T04:12:35Z | 2026-07-19T04:29:27Z | 16m 52s |
| green | 2026-07-19T04:29:27Z | 2026-07-19T04:34:20Z | 4m 53s |
| review | 2026-07-19T04:34:20Z | 2026-07-19T04:46:43Z | 12m 23s |
| finish | 2026-07-19T04:46:43Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)

- **Gap** (non-blocking): The ROM's "GO FASTER" speed switch is CLIMB-ONLY — `LDY I,ZABPUL`
  (ALWELG.MAC:1780) stands for the whole descend branch and the `ZABFLI` swap sits inside the
  `IFPL ;GOING UP?` block (1782-1787) — but our port applies the near/far switch in BOTH
  directions (`moveAlong` → `speedFor`, no direction test). Invisible at wave 1 (the two rates
  share a byte) and organically unreachable at 17+ (a descending pulsar starts near the rim, so
  it is in-zone — slow, matching the ROM — until the reversal line; only a synthetic fixture can
  stage a fast descend). Affects `src/core/enemies/interpreter.ts` (an optional direction gate,
  if a future fidelity story wants it — NOT this story's scope; Dev should not "fix" it in GREEN).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): No audit finding records the motion-tier deferral — W-028
  covers the pulsar speed VALUES (remediated tp1-1) and explicitly calls the $A0 threshold
  correct; the $C0 deferral lived only in the rules.ts comment and the tp1-26 review note. So
  option (a) requires NO findings-JSON edit and no `remediated_by` stamp; AC4's gates are
  untouched by design (verified at RED: citations 25/25, reanchor 103 present / 0 lost).
  Affects `docs/audit/findings/` (nothing to change — recorded so the Reviewer doesn't hunt for
  a missing remediation). *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): tp1-26.pulse-potency-wave.test.ts's header prose (lines
  ~40-53) still narrates the motion-tier deferral as CURRENT ("Current kill gate reads the
  frozen PULSAR_NEAR_FAR_DEPTH…", "Our port already DEFERS the climb-tier $C0…", and a pointer
  to "PULSAR_NEAR_FAR_DEPTH's comment" which no longer exists) — comment-only staleness in a
  sibling suite outside this story's diff; the assertions are all still correct and green.
  Affects `tests/core/tp1-26.pulse-potency-wave.test.ts` (comment-only re-scope: mark the
  NOTE-FOR-DEV paragraph as the tp1-26-era record, superseded by tp2-1 — TEA owns test files).
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): `pulsarKillsAt` and `base()` are now duplicated
  near-verbatim across four pulsar suites (tp1-5, tp1-6, tp1-26, tp2-1) — deliberate
  test-isolation per repo convention, but a fifth copy should trigger extraction.
  Affects `tests/core/` (optional shared `pulsar-helpers.ts` if the fixture shape ever
  needs lockstep change). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the continuous-depth port treats `depth == boundary`
  as in-zone at the climb/kill sites where the ROM's byte-quantized `CMP`/`IFCS` puts the
  single exact-boundary byte on the other side. Pre-existing house convention shared by
  every along-byte gate in rules.ts (e.g. SPIKER_TURNAROUND_DEPTH), measure-zero under
  float staging, NOT introduced by this diff — recorded so a future byte-quantization
  story knows the class exists. Affects `src/core/` (nothing to change now).
  *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 5 findings (all non-blocking) — no blocking issues

### Delivery Findings Summary

**TEA (2 findings):**
1. ROM's "GO FASTER" speed switch is CLIMB-ONLY (not modeled in both directions) — organically unreachable in reachable play; optional future direction gate deferred
2. Motion-tier $C0 deferral has no audit-findings entry — design choice recorded; no findings-JSON edit required

**Dev (1 finding):**
1. tp1-26 test header prose contains era-bound stale references to PULSAR_NEAR_FAR_DEPTH — comment-only staleness; assertions green

**Reviewer (2 findings):**
1. `pulsarKillsAt` and `base()` fixture duplication across 4 pulsar suites — deliberate test isolation; extraction trigger for 5th copy
2. Continuous-depth `depth == boundary` boundary-equality convention pre-existing across rules.ts gates — measure-zero under float staging; recorded for future byte-quantization work

**Status:** All findings non-blocking; no action required for merge gate

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)

- **Sibling premises re-seated off the retiring export onto the ROM-byte literal**
  - Spec source: context-story-tp2-1.md, AC-2 ("the tp1-5 / tp1-6 / sim.enemy-motion-fidelity
    pulsar suites stay green")
  - Spec text: "the wave-1 pulsar-motion behaviour must NOT regress — the suites stay green"
  - Implementation: tp1-5.pulsar-fuse-split.test.ts and tp1-6.pulsar-yoyo.test.ts no longer
    import `PULSAR_NEAR_FAR_DEPTH` (which AC-3 retires); their premises/tolerances now use a
    local spelled literal `PULSAR_A0_DEPTH = (0xf0 - 0xa0) / 224` with a comment naming the
    WPULPOT byte. sim.enemy-motion-fidelity already used its own local constant — untouched.
  - Rationale: the suites would break at IMPORT the moment Dev deletes the export — Dev cannot
    re-seat tests. Both files stage only wave 1, where $A0 stands under both codes, so the
    re-point is behaviour-neutral: verified 15/15 green on the UNFIXED code, and the literal is
    wave-independent so they stay green post-GREEN (the tp1-27 "passes under both" check).
  - Severity: minor
  - Forward impact: none — premises now pin the ROM byte, not the constant under audit
- **AC-3's "one lookup" textual property routed to the Reviewer's diff trace**
  - Spec source: session AC-3
  - Spec text: "PULSAR_NEAR_FAR_DEPTH … unified with / retired in favour of the
    wave-parameterised PULPOT — no two constants that merely coincide below wave 65 left drifting"
  - Implementation: the suite enforces retirement STRUCTURALLY (rules.ts must no longer export
    the constant) and unification BEHAVIOURALLY (motion and kill agree at the band depth on both
    sides of 65, measured out of the sim). It does NOT pin, via source-text scan, that the three
    readers call one named function.
  - Rationale: a source-text pin on call shape is brittle (the bannerColorArg lesson) and
    over-constrains Dev's naming; a second lookup that decodes the same WPULPOT records would
    pass behaviourally and is a style question for the Reviewer, who diff-traces AC-3 anyway.
  - Severity: minor
  - Forward impact: Reviewer should confirm ONE exported lookup serves all three JPULMO readers

### Dev (implementation)

- No deviations from spec.

### Reviewer (audit)

- **Sibling premises re-seated off the retiring export onto the ROM-byte literal** →
  ✓ ACCEPTED by Reviewer: value-identity verified independently (`224 === WARP_ALONG_SPAN`,
  bit-for-bit per test-analyzer), both suites stage only wave 1, and mutation M5 (kill
  gate stripped + reverse made unconditional) proved the re-seated assertions still fail
  hard — 5 failures across tp1-5/tp1-6. The re-seat did not defang anything.
- **AC-3's "one lookup" textual property routed to the Reviewer's diff trace** →
  ✓ ACCEPTED by Reviewer: I performed the routed check. All three JPULMO sites call the
  single `pulpotDepthForLevel` (interpreter.ts:184, interpreter.ts:322, sim.ts:646);
  `pulpotKillDepthForLevel` has zero remaining references repo-wide; the only live
  $A0/$C0 spelling in core is the WPULPOT table itself (rules.ts:635-636 — every other
  hex hit is an unrelated ROM table: well geometry, TWFUSC, TELIHI). AC-3 satisfied.
- No undocumented deviations found: the diff matches the ruled option-(a) scope exactly —
  the ROM's climb-only speed-switch direction gate was correctly NOT smuggled in (it is
  TEA's recorded non-blocking finding, out of scope).

## Sm Assessment

Setup complete and verified on disk: session file present, branch
`fix/tp2-1-pulpot-pulsar-tier-c0` cut from latest develop in the tempest
subrepo, story moved to in_progress, story + epic context files written from
the sprint YAML (no fabricated additions — context body matches the YAML).

Routing note for the DECIDE-FIRST ruling in AC1: standing project guidance
says deep-level fidelity nobody reaches (L17-33+) is not to be gold-plated —
the ROM is a ceiling, and "current level is enough." Wave 65 is deep in that
territory, which weighs toward option (b) (formally ratify the $A0-only
deferral as a cited divergence in docs/audit/findings). Counterweight: the
tp1-26 name-split hazard in AC3 is a real drift risk regardless of which
option is chosen, and option (a) is only a 2-point unification through the
existing contourWave fold. The ruling belongs to TEA/Dev — record it and its
reasoning in the story per AC1, do not inherit it from this note.

Merge gate was clear at setup (no open tempest PRs). Next phase: red
(Imperator Furiosa / TEA).

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a

**Test Files:**
- `tests/core/tp2-1.pulpot-motion-tier.test.ts` — NEW: derives the climb-speed boundary and
  the descend-reverse line OUT OF the running sim (bisection on stepGame's own one-frame
  climb deltas; descend traces with NYMCOU held up by dormant nymphs) and pins the $A0→$C0
  widening at waves 64/65, the contourWave fold at 100/150, the retirement of
  `PULSAR_NEAR_FAR_DEPTH`, and motion/kill zone agreement.
- `tests/core/tp1-5.pulsar-fuse-split.test.ts` — re-seat only: premises off the retiring
  export onto the spelled wave-1 byte literal (see Design Deviations).
- `tests/core/tp1-6.pulsar-yoyo.test.ts` — re-seat only: staging tolerances, same re-point.

**Tests Written:** 12 tests covering 4 ACs — 7 failing (all new-contract), 5 passing
(all intended keep-behavior/premise guards: literal premises, wave-17/64 boundary,
wave-64 reverse, empty-queue NYMCOU clause, kill-probe liveness)
**Status:** RED (failing — ready for Dev). Commit `421430b` on
`fix/tp2-1-pulpot-pulsar-tier-c0`. Full suite 1697/1704 green — zero collateral
(testing-runner verified, cross-checked against my own full run: 147 files / 1704 tests /
tsc exit 0). AC-4 gates at RED: `npm test -- citations` 25/25; reanchor 103 present, 0 lost.

### Fidelity Ruling (AC-1): option (a) — ADOPT THE ROM

All three JPULMO readers widen to $C0 at wave 65 through one wave-parameterised PULPOT.
Reasoning, recorded per AC-1:

1. **The tier is already half-shipped.** tp1-26 modelled $C0 for the kill gate. At wave 65+
   the current sim electrocutes from depth 0.28 while climbing that same pulsar at the fast
   flipper rate and reversing it at the $A0 line — the potency zone disagrees with itself
   about where it is. The cabinet cannot do that: JPULMO reads ONE `PULPOT` byte at all
   three sites (ALWELG.MAC:1784/1795/1805). A half-adopted tier is a state the ROM never
   exhibits — strictly worse than either full adoption or the original full deferral, and
   full deferral would mean reverting tp1-26 (out of scope, and backwards).
2. **The deep-level ratchet guidance was weighed and does not decide this.** The SM routing
   note (and the standing "don't gold-plate L17-33+ fidelity" rule) points at option (b).
   But the original deferral's rationale (feat 6-15's rules.ts comment) was superseded for
   this byte the day tp1-26 shipped; declining the motion half now doesn't avoid
   gold-plating — it preserves an internal inconsistency. The ratchet rule's ceiling is the
   ROM; option (a) matches the ROM, exceeds nothing, and changes NOTHING in reachable play
   (waves 1-64 are byte-identical; the wave-1 suites stay green, verified).
3. **AC-3's name-split hazard is live today.** rules.ts spells the same $A0 twice —
   `PULSAR_NEAR_FAR_DEPTH` (:472) and `WPULPOT[0].v` (:639) — the exact defect class that
   shipped the wrong grab line in tp1-27 (RIM_DEPTH vs PLAYER_RIM_DEPTH).
4. **The cost is 2-point-shaped.** `CamContext` already carries `level`; the change is one
   shared lookup threaded to two reader sites plus the constant's deletion.

### Rule Coverage

Test-only change (no `src/` files touched in RED). Applicable lang-review (typescript.md)
checks and the repo's own hard rules:

| Rule | Test(s) / evidence | Status |
|------|--------------------|--------|
| #1 type-safety escapes | no `as any`/`as unknown as`/`!` in new+edited test code; narrowing via `Record<string, unknown>` index + `(q as Pulsar)` only after an explicit `expect(q).toBeDefined()` guard | clean |
| #4 null/undefined | `?? 0` (not `\|\|`) on optional depth read; `thePulsar` returns typed `undefined` | clean |
| #8 test quality (vacuous assertions) | self-checked: every test asserts values; probes carry liveness guards (`rose`, `sawPulse`-style, kill-probe liveness test) and the boundary probe guards its own discriminability (`fastRef > slowRef * 1.5`) so a degenerate wave fails loudly | clean |
| Core purity (tempest CLAUDE.md) | tests drive `stepGame` only; no clock, no RNG bypass; fixtures replace the whole `spawn` object (tp1-6 lesson) so no legacy mechanism counterfeits observables | clean |
| Citation gate (CLAUDE.md) | cited lines byte-verified against the LF copy (~/Projects/tempest-source-text); WPULPOT is THREE records (606-609) — quoted as such in the test header; gates green at RED | clean |

**Rules checked:** 5 of 5 applicable · **Self-check:** 0 vacuous tests found

### Handoff notes for Dev (The Word Burgers)

- Seam: `CamContext.level` already exists — read the wave-parameterised depth at
  `interpreter.ts:183` (climb) and `:321` (reverse); `sim.ts`'s kill gate must read the SAME
  exported lookup. Naming is yours (keep `pulpotKillDepthForLevel` or rename it — the suite
  pins the constant's retirement and the behaviour, not the name), but ONE lookup, per AC-3.
- Retire `PULSAR_NEAR_FAR_DEPTH` (rules.ts:472) and rewrite the now-false "intentionally not
  modelled" comment block above it (rules.ts:458-471); WPULPOT's "feeds ONLY the kill gate"
  comment (:635-637) also goes stale.
- Do NOT direction-gate the speed switch (the ROM's climb-only `ZABPUL` down branch) — that
  is a recorded non-blocking Delivery Finding, not this story.
- Expected GREEN: the 7 failing tests flip; the 5 guards and the full suite stay green;
  `npm test -- citations` and `node tools/audit/reanchor-citations.mjs` stay at 25/25 and
  0 lost (no findings edit needed — see Delivery Findings).

**Handoff:** To Dev for implementation (GREEN)

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/rules.ts` — `pulpotKillDepthForLevel` renamed `pulpotDepthForLevel` (it no
  longer feeds only the kill gate); its comment now names all three JPULMO consumers with
  their ALWELG.MAC lines and states the one-exported-number rule. `PULSAR_NEAR_FAR_DEPTH`
  deleted; a two-line tombstone comment records the retirement and why.
- `src/core/enemies/interpreter.ts` — climb switch (`speedFor`) and descend reverse
  (`jpulmo`) read `pulpotDepthForLevel(ctx.level)`; `CamContext` already carried `level`,
  so no interface change.
- `src/core/sim.ts` — kill gate reads the renamed lookup; its comment block updated (the
  "only the kill tier is wave-parameterised" paragraph was made false by this story).

Net diff +31/−35 — no new abstractions; the TEA-recorded out-of-scope items (the ROM's
climb-only speed switch) were deliberately NOT touched.

**Tests:** 1704/1704 passing (GREEN) — the 7 RED tests flipped, the 5 guards held, zero
collateral (testing-runner verified full run: 147 files, tsc exit 0). AC-4 gates after the
edit that deleted a once-cited line: `npm test -- citations` 25/25 and reanchor 103
present / 0 LOST — the audit gate is frozen at 4232ed4, so no `ours` re-pointing was
needed and no finding claims this fix (per TEA's finding, W-028 never recorded the
motion-tier deferral; nothing to mark `remediated_by`).
**Branch:** fix/tp2-1-pulpot-pulsar-tier-c0 (pushed, commits `421430b` RED + `3a0d86b` GREEN)

**Handoff:** To next phase (verify/review)

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly (level-0 walk-off edge traced: unreachable, state.ts:259 seeds level 1, no zero-assignment repo-wide; fold mutation M4 proves the >99 edge is guarded) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly (pure lookup, no error paths; contourValue's TE-0 silent fallback unreachable: fold above 99, level ≥ 1 below record 1) |
| 4 | reviewer-test-analyzer | Yes | findings | 2 (low) | confirmed 1 (helper duplication, folded into one non-blocking Delivery Finding), dismissed 1 (base() duplication — same note, same disposition; explicitly low-priority per the analyzer itself) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by rule-checker check #16 (7 comment instances verified current) + Dev's recorded finding on the tp1-26 header (outside this diff) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain covered by rule-checker checks #1/#2 (4 cast/predicate instances + 3 interface instances, all compliant) |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain covered by test-analyzer's duplication notes (the only simplification surface in a net −4-line core diff) |
| 9 | reviewer-rule-checker | Yes | clean | none (17 rules, 36 instances, 0 violations) | N/A |

**All received:** Yes (4 returned, 5 disabled)
**Total findings:** 2 confirmed (both non-blocking, recorded as Delivery Findings), 1 dismissed (with rationale), 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** s.level (internal state, seeded 1 at state.ts:259, only ever
incremented) → stepEnemies builds ctx.level = s.level (sim.ts:263) and resolvePlayerHits
reads s.level directly (sim.ts:646) → pulpotDepthForLevel (rules.ts) → contourWave fold
(caps the walk at the wave-99 row) → two-record WPULPOT walk → depth compares at the
three JPULMO sites. Safe because the input is internal, bounded below by 1 and above by
the fold — no user-controlled value reaches the lookup, and no walk-off is reachable.

**Pattern observed:** "one ROM byte, one exported name" — the same defence the RIM_DEPTH
consolidation established after tp1-27 (interpreter.ts:59's comment tells that story) now
applied to PULPOT: the table (rules.ts:635-636) is the single live spelling and all three
readers share one exported lookup. Good pattern, correctly extended.

**Error handling:** pure function, no error paths to mishandle. Degenerate input classes
checked directly: level 0/negative unreachable (state.ts:259 + no zero-assignment
repo-wide); level > 99 folds to the $C0 row (mutation M4 broke the fold and both fold
tests failed — the guard is real, not scenery); float boundary-equality is a pre-existing,
measure-zero house convention (recorded as a non-blocking Delivery Finding).

**Observations (adversarially verified):**

1. [VERIFIED] AC-3 unification — interpreter.ts:184 (climb), interpreter.ts:322 (reverse)
   and sim.ts:646 (kill) all call the single pulpotDepthForLevel; zero references to the
   old name repo-wide; the only live $A0/$C0 spelling in core is the WPULPOT table itself.
   Complies with AC-3's no-two-constants rule and with [RULE] check #17 (rule-checker, 4
   instances).
2. [VERIFIED] ROM polarity independently re-derived against ALWELG.MAC 1780-1806 (the LF
   copy, ~/Projects/tempest-source-text): climb IFCS ("IN POWER ZONE? NO. GO FASTER") ⇔
   depth < boundary → flipperSpeed; reverse IFCS ("TIME TO REVERSE?") ⇔ depth ≤ boundary
   → direction 1; kill IFCC ("PULSAR IN RANGE?") ⇔ depth ≥ boundary. All three match the
   shipped compares. WPULPOT is THREE ROM records ($A0 1-32 / $A0 33-64 / $C0 65-99);
   the port's two-record collapse is value-identical at every wave.
3. [VERIFIED] Mutation battery, run serially after all subagents returned, tree restored
   and control-run green (1704/1704) after each: M1 climb frozen at $A0 → 6 tp2-1 tests
   fail; M2 reverse frozen → exactly the 2 reverse pins fail; M3 kill frozen → 3 fail
   across tp2-1 AND tp1-26 (cross-suite pin); M4 fold removed → both fold tests fail via
   the probe's own discriminability guard; M5 kill-depth stripped + reverse made
   unconditional → 5 failures across the re-seated tp1-5/tp1-6 (the re-seat defanged
   nothing). Every load-bearing assertion demonstrated to bite.
4. [VERIFIED] [TEST] the new suite derives both boundaries OUT of the running sim per
   AC-2 (bisection over stepGame's one-frame deltas with a fastRef>1.5×slowRef premise
   guard; descend traces with NYMCOU held up) — tolerances independently checked against
   the measured rates (0.01 band ≫ 0.0061/frame overshoot, ≪ 0.143 tier gap), so a
   wrong-tier reversal cannot pass as "close enough" (test-analyzer, corroborated).
5. [VERIFIED] [SEC] core purity holds — no DOM/clock/Math.random/shell imports in the
   changed core files; the new lookup is deterministic; no new input surface
   (reviewer-security, 3 rules × 6 files, 0 violations).
6. [VERIFIED] [DOC] every comment the diff touches was updated to the unified-lookup
   reality (rule-checker check #16, 7 instances) — including the tombstone at the old
   constant's site explaining WHY it is gone. The one stale header OUTSIDE the diff
   (tp1-26's era-bound NOTE FOR DEV) is recorded as a Dev Delivery Finding for TEA.
7. [SIMPLE] [LOW] pulsarKillsAt/base() fixture duplication across four suites — real,
   deliberate (test isolation), non-blocking; extraction trigger recorded as a Delivery
   Finding.
8. [EDGE] [SILENT] [TYPE] — disabled specialists' domains swept directly: the level-0
   TE walk-off is unreachable (edge), contourValue's silent 0 fallback cannot fire in
   any reachable state (silent-failure), and the two test-file casts are runtime-guarded
   with Record<string, unknown> used over any (type-design, via rule-checker #1/#2).

### Rule Compliance

Mapped to the lang-review typescript.md checks (rule-checker ran all 13 + 4 additional;
I spot-verified its clean claims against the diff rather than accepting them):

| Check | Instances | Result |
|-------|-----------|--------|
| #1 type-safety escapes | 4 (2 guarded `as Pulsar`, 1 `Record<string, unknown>` probe, 1 validated type predicate) | compliant |
| #2 generic/interface | 3 | compliant |
| #4 null/undefined (`??` vs `\|\|`) | 2 | compliant (`?? 0` on a legitimately-zeroable depth) |
| #5 module/declarations | 8 import-list changes | compliant (type-only imports marked; no orphaned names) |
| #8 test quality | 3 files | compliant (no `as any`, no mocks, src imports) |
| #13 fix-regressions meta | full diff re-scan | compliant |
| core purity (CLAUDE.md) | 3 core files | compliant |
| citation gate (CLAUDE.md) | no findings-JSON touched; citations 25/25, reanchor 103/0 lost | compliant |
| AC-3 single-lookup | 4 sites | compliant |

Checks #3/#6/#7/#9/#10/#11/#12 have no instances in this diff (no enums, JSX, async,
config, external input, error paths, or bundle-relevant code).

### Devil's Advocate

Assume this diff is broken. Where would it hide? First suspicion: the ruling itself —
option (a) models a tier no human reaches, and the SM's routing note leaned (b). If the
ruling were wrong, we would have added risk for nothing. But the risk surface is empty:
waves 1-64 are byte-identical (the $A0 record covers them under both codes), the wave-1
suites are untouched and green, and the mutation battery shows the only behavioural
changes live at 65+, exactly where tp1-26 already moved the kill gate. Rejecting (a)
would preserve a sim state the cabinet cannot produce — the potency zone disagreeing
with itself — which is strictly worse than either faithful choice. Second suspicion: the
new level-dependence of the motion sites. Before this diff a pulsar's climb switch could
not care what level it was; now a wrong level in ctx would silently change motion. Could
ctx.level drift from s.level? No — it is copied one line above the dispatch (sim.ts:263)
from the same field the kill gate reads, and the agreement test pins motion and kill to
the SAME zone answer at both 64 and 65, so a divergence between the two readers cannot
ship green. Third: the descend-speed coupling. Our speedFor applies the zone switch in
both directions where the ROM's GO-FASTER is climb-only — did widening the zone at 65+
make that divergence worse? The opposite: a descending band pulsar at 65+ used to move
at the fast flipper rate (diverging from the ROM's always-slow descend) and now moves
slow, matching the cabinet; the residual divergence band (17-64, below $A0 while
descending) is organically unreachable because the reversal line sits exactly at its top
and the queue-empty flip is immediate. TEA's finding records the gate for a future
story. Fourth: the probes could be self-deceiving — a bisection always "converges". But
the discriminability guard failed loudly under M4 rather than minting a number, and the
M1/M2 mutations prove each boundary pin red under the exact regression it exists to
catch. Fifth: green-by-modulo — descendTrace could catch a wrapped oscillation as a
"reversal". The CAM trace shows a flipped direction cannot legitimately flip back within
the window (jpulmo's up branch is jsmove, which only converts at the rim), and the
400-frame cap gives 6× headroom, so the first-reversal read is sound. I could not make
the code break. The two real blemishes found — fixture duplication and the
boundary-equality convention — are non-blocking and recorded.

**Handoff:** To SM for finish-story