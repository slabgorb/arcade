---
story_id: "sw3-4"
jira_key: ""
epic: "sw3"
workflow: "tdd"
---
# Story sw3-4: Trench voice-line timer — Luke trust me @16 / Yahoo you're all clear @24 / Force is strong @22 (Sound_18/1A/16), reachable now without new mechanics

## Story Details
- **ID:** sw3-4
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Points:** 3
- **Priority:** p2
- **Repo:** star-wars
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-11T15:00:25Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T14:01:35+00:00 | 2026-07-11T14:04:59Z | 3m 24s |
| red | 2026-07-11T14:04:59Z | 2026-07-11T14:25:42Z | 20m 43s |
| green | 2026-07-11T14:25:42Z | 2026-07-11T14:30:27Z | 4m 45s |
| review | 2026-07-11T14:30:27Z | 2026-07-11T14:44:07Z | 13m 40s |
| green | 2026-07-11T14:44:07Z | 2026-07-11T14:50:12Z | 6m 5s |
| review | 2026-07-11T14:50:12Z | 2026-07-11T15:00:25Z | 10m 13s |
| finish | 2026-07-11T15:00:25Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): The per-step tick cadence fires a run's whole
  parity set in a tight 8-tick cluster near trench entry (~0.27–0.40s at 60fps),
  which may overlap the "Use the Force, Luke" entry cue. If playtest wants the
  cluster later or spread across the run, tune the tick cadence or add a start
  offset. Affects `src/core/sim.ts` (the `trenchTimer` advance in `stepTrench`).
  *Found by TEA during test design.*
- **Question** (non-blocking): Parity is sourced from `wave`, not the authentic
  ROM `byte_4B12` (the trench section-chain index), which lands in sw3-7. When
  sw3-7 introduces `byte_4B12`, re-point the voice-timer parity to it for full
  fidelity. Affects `src/core/sim.ts` + sw3-7. *Found by TEA during test design.*
- **Gap** (non-blocking): The ROM table also fires `Sound_C` @16 on odd runs — a
  non-voice cue outside this story's scope; if it maps to an existing SFX it
  could be wired in a follow-on. Affects audio wiring (sw3-5). *Found by TEA
  during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): `TRENCH_VOICE_CUES` in `src/core/sim.ts` is the
  single data-driven seam for the timer cues — sw3-7 re-points parity to
  `byte_4B12` by changing the `parity` source, and sw3-5 can add rows (e.g. the
  odd-run `Sound_C` @16) without touching `stepTrench`. Affects `src/core/sim.ts`.
  *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (non-blocking): `trenchTimer` is the only non-dt-scaled clock in the
  core; safe today because the sole `stepGame` driver
  (`@arcade/shared/loop.createLoop`) is a fixed-timestep accumulator at constant
  `dt = 1/60`, but if a variable-timestep or replay-at-different-hz mode is ever
  introduced the ROM thresholds (16/22/24) would silently target a different
  real-world duration with no compile/runtime signal. Affects `src/core/sim.ts`
  (would need re-deriving as dt-scaled ticks). *Found by Reviewer during code
  review.*
- The test-quality defects that drove the Round-1 rejection are itemized in the
  `## Round 1 Reviewer Assessment` severity table (not repeated here); both were
  fixed in the green rework and mutation-verified in Round 2.
- No new upstream findings during Round-2 re-review. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

2 deviations

- **Per-step integer tick timer, not dt-scaled**
  - Rationale: a seconds timer can never reach 24 in the ~4.8s trench
  - Severity: minor
  - Forward impact: the cue cadence is frame-count based, not wall-clock — logged
- **Parity sourced from `wave`, not ROM `byte_4B12`**
  - Rationale: `byte_4B12` (trench per-run section variation) is sw3-7, not yet in
  - Severity: minor
  - Forward impact: differs from ROM only in WHICH runs get which set, not in the

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Per-step integer tick timer, not dt-scaled**
  - Spec source: docs/star-wars-1983-source-findings.md, "Voice-line triggers by
    trench timer" (`word_4B0E`); project convention (src/core/sim.ts timers
    accumulate/decrement by `dt`).
  - Spec text: ROM thresholds are `word_4B0E` = 16/22/24 (integer ticks); other
    sim timers count in seconds via `dt` (e.g. `fireCooldown - dt`).
  - Implementation: `trenchTimer` is a per-step integer counter (+1 each trench
    `stepGame`), NOT dt-scaled; lines fire when it equals 16/22/24.
  - Rationale: a seconds timer can never reach 24 in the ~4.8s trench
    (EXHAUST_PORT_DISTANCE 2400 / TRENCH_SCROLL_SPEED 500); a per-step integer
    preserves the authentic 16/22/24 values under the fixed-timestep loop,
    mirroring the ROM's per-frame `word_4B0E`.
  - Severity: minor
  - Forward impact: the cue cadence is frame-count based, not wall-clock — logged
    as a tuning candidate in Delivery Findings.
- **Parity sourced from `wave`, not ROM `byte_4B12`**
  - Spec source: docs/star-wars-1983-source-findings.md, voice timer gated by
    `byte_4B12` parity.
  - Spec text: the voice lines are gated by `byte_4B12` parity (the trench
    section-chain index).
  - Implementation: parity is derived from `wave` — wave even → {lukeTrustMe@16,
    youreAllClearKid@24}; wave odd → {theForceIsStrongInThisOne@22}.
  - Rationale: `byte_4B12` (trench per-run section variation) is sw3-7, not yet in
    the sim; the user chose (sw3-4 RED scope decision) to implement the parity
    gate now via `wave`. Re-point to `byte_4B12` when sw3-7 lands.
  - Severity: minor
  - Forward impact: differs from ROM only in WHICH runs get which set, not in the
    sets themselves; sw3-7 should re-source the parity.

### Dev (implementation)
- No deviations from spec. Implemented exactly to TEA's tests: `trenchTimer` as a
  per-step integer counter (0 in `initialState`, reset in `enterPhase`, +1 in
  `stepTrench`), the three `SpeechLine` ids, and the `wave`-parity-gated
  `TRENCH_VOICE_CUES` firing at 16/22/24. The two design deviations that shape
  this feature (per-step tick, parity-from-wave) were TEA's, logged above.

### Reviewer (audit)
- **Per-step integer tick timer, not dt-scaled** → ✓ ACCEPTED by Reviewer. The
  rule-checker traced the sole production driver (`@arcade/shared/loop.createLoop`)
  and confirmed it is a fixed-timestep accumulator invoking `stepGame` at a
  constant `dt = 1/60` — so "one step" and "one dt-slice" coincide in the real
  system. Deterministic (AC8), calls no forbidden wall-clock API, and the ROM
  values 16/22/24 are literally inexpressible as seconds in a ~4.8s trench. Sound
  as implemented; the latent fragility (a future variable-timestep / different-hz
  caller would silently shift the cue timing with no signal) is recorded as a
  non-blocking Reviewer delivery finding.
- **Parity sourced from `wave`, not ROM `byte_4B12`** → ✓ ACCEPTED by Reviewer.
  Explicit user scope decision (sw3-4 RED); `byte_4B12` (the trench section-chain)
  is sw3-7 and not yet in the sim. Documented at the cue table and slated for
  re-pointing when sw3-7 lands. Agrees with author reasoning.
- No UNDOCUMENTED deviations found: the code matches the tests and the logged
  deviations; the ROM thresholds (16/22/24) and parity sets match
  docs/star-wars-1983-source-findings.md lines 349-352.

## Sm Assessment

**Setup complete — routing to TEA (Imperator Furiosa) for the RED phase.**

- **Story:** sw3-4 — trench voice-line timer. Fire three deferred TMS5220 lines
  off a trench timer: Sound_18 "Luke, trust me" @≈16, Sound_1A "Yahoo! You're all
  clear, kid" @≈24, Sound_16 "The Force is strong with this one" @≈22.
- **Workflow:** tdd (phased) — RED (tea) → GREEN (dev) → REVIEW (reviewer) →
  FINISH (sm). Repo: `star-wars`, branch `feat/sw3-4-trench-voice-line-timer`
  off `develop`. No Jira (local sprint tracking).
- **Key constraint / scope:** "reachable now **without new mechanics**." These
  three lines were among the 19 deferred in sw2-5, which already built the
  `speech` GameEvent path. TEA should drive the tests through that existing
  event path on a trench timer — do NOT introduce R2-damage / Vader-tail /
  wingman mechanics to reach them. See the SM background pointer in
  `sprint/context/context-story-sw3-4.md`.
- **ACs:** none recorded in YAML — TEA to define during RED. Suggested spine:
  each line fires exactly once, at its timer beat, in trench phase, via a
  `speech` GameEvent, deterministically (seeded sim).

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** New observable core behavior — a trench voice-line timer emitting
`speech` GameEvents. Pure-sim, deterministic, TDD-appropriate.

**Test Files:**
- `tests/core/trench-voice-timer.test.ts` (new) — the RED driver; pins the
  `trenchTimer` counter + parity-gated firing contract.
- `tests/shell/audio.test.ts` (extended) — adds the three new core-cued lines to
  `REQUIRED_SPEECH` so the catalogue-coverage assertion includes them (the
  event→speak pump is generic, so no pump change was needed).

**Tests Written:** 19 tests in the new suite, covering 9 authored ACs.
**Status:** RED — 14 failing + 13 tsc type errors. The 5 passing are the negative
parity-exclusion guards (`[] === []`, valid now and in GREEN) and the runtime
type-array checks (which DO fail under tsc). Verified by `testing-runner`
(RUN_ID sw3-4-tea-red): no regressions — `speech-cues.test.ts`, `audio.test.ts`,
and all 59 other suites stay GREEN.

**Authored Acceptance Criteria** (derived from the story title + the ROM table in
docs/star-wars-1983-source-findings.md, "Voice-line triggers by trench timer"):
- **AC1** — `GameState.trenchTimer` (integer) is 0 on trench entry and advances by
  exactly 1 per trench `stepGame` (per-step tick; does not advance outside the
  trench).
- **AC2** — On an EVEN-wave run: `lukeTrustMe` fires once at timer 16;
  `youreAllClearKid` fires once at timer 24.
- **AC3** — On an ODD-wave run: `theForceIsStrongInThisOne` fires once at timer 22.
- **AC4** — Parity gate: even-set lines never fire on odd runs, and vice-versa.
- **AC5** — Each line fires exactly once per run (not re-emitted every later frame).
- **AC6** — Timer + cues reset per run: a fresh trench re-zeros and re-arms.
- **AC7** — Silence off-threshold (complements the existing trench-silence test).
- **AC8** — Deterministic: identical seed + wave replays identical cues.
- **AC9** — The three ids are DISTINCT members of `SpeechLine` and valid `speech`
  payloads (they map to existing shell `SPEECH` catalogue keys).

**Contract for Dev (GREEN):**
- Add `trenchTimer: number` to `GameState` (0 in `initialState`; reset to 0 in
  `enterPhase` for the trench).
- Advance it by 1 in `stepTrench`; when it equals a threshold and `wave` parity
  matches, push a `{ type: 'speech', line }` event: even → 16 lukeTrustMe / 24
  youreAllClearKid; odd → 22 theForceIsStrongInThisOne.
- Add the three ids to the `SpeechLine` union in `src/core/events.ts`.
- No new gameplay mechanics (R2/Vader/wingmen) and no `byte_4B12` section chain
  (that is sw3-7) — parity comes from `wave`.

### Rule Coverage

| Rule (TS lang-review) | Test(s) | Status |
|------------------------|---------|--------|
| #3 union/enum exhaustiveness | `NEW_TRENCH_LINES: SpeechLine[]` typed array (+ tsc) | failing (tsc TS2322 ×3) |
| #4 null/arith correctness (parity) | high EVEN/ODD wave stability tests | failing |
| #8 test quality (meaningful assertions) | self-check pass | pass (0 vacuous) |
| determinism (pure core) | deterministic-replay test | failing |

**Rules checked:** the applicable TypeScript lang-review checks for a pure-sim
numeric/union feature — #3 (union membership/exhaustiveness), #4 (parity
arithmetic), #8 (test quality), plus determinism. Checklist items for React/JSX
(#6), async/Promise (#7), input validation (#10), and error handling (#11) are
N/A — no DOM, no async, no external input, no error paths in this feature.
**Self-check:** 0 vacuous assertions; every test asserts a concrete value or a
negative guard on specific lines.

**Handoff:** To Dev (The Word Burgers) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/state.ts` — add `trenchTimer: number` to `GameState`; initialise it to
  0 in `initialState`.
- `src/core/events.ts` — add `lukeTrustMe` / `youreAllClearKid` /
  `theForceIsStrongInThisOne` to the `SpeechLine` union.
- `src/core/sim.ts` — reset `trenchTimer` to 0 in `enterPhase`; add the
  `TRENCH_VOICE_CUES` table; advance the timer and cue the matching parity-gated
  line each step in `stepTrench` (rides `base`, so it carries every return path).

**Tests:** 637/637 passing (GREEN) — new `tests/core/trench-voice-timer.test.ts`
19/19; `tests/shell/audio.test.ts` catalogue coverage green; `npm run build`
(tsc --noEmit && vite build) clean, zero type errors. Verified by `testing-runner`
(RUN_ID sw3-4-dev-green). No regressions.

**AC coverage:** all nine authored ACs green — timer reset/advance (AC1), even set
@16/@24 (AC2), odd line @22 (AC3), parity exclusion (AC4), once-per-run (AC5),
per-run reset (AC6), off-threshold silence (AC7), determinism (AC8), union
membership (AC9).

**Branch:** `feat/sw3-4-trench-voice-line-timer` (pushed to origin). No PR created
— SM opens it in the finish phase.

**Self-review:**
- Wired: the cue is a first-class `speech` GameEvent on the existing event→speak
  pump — the shell already speaks it (no shell change needed; catalogue coverage
  pinned in audio.test.ts).
- Patterns: `trenchTimer` mirrors the existing per-run trench counters
  (`trenchScrollZ`, `trenchShotsFired`) — reset in `enterPhase`, advanced in
  `stepTrench`, carried on `base`. `TRENCH_VOICE_CUES` mirrors `ENTER_PHASE_SPEECH`.
- Scope held: no new gameplay mechanics; parity from `wave` (not `byte_4B12`, which
  is sw3-7); minimal code to pass the tests.
- Error handling: N/A — pure numeric/union sim, no external input or error paths.

**Handoff:** To Reviewer (Immortan Joe) for code review.

## Round 1 Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — GREEN 637/637, build clean, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — edge cases covered by me + test-analyzer |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no error/failure paths in a pure numeric sim |
| 4 | reviewer-test-analyzer | Yes | findings | 4 (2 high-conf, 1 med, LOW notes) | confirmed 3 (1 HIGH, 1 MED, 1 LOW), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — comments reviewed by me (accurate, ROM-cited) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — type design covered by rule-checker #1-#3 (clean) |
| 7 | reviewer-security | Yes | clean | none | N/A — no unsafe casts, purity intact, no unbounded growth |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — TRENCH_VOICE_CUES table is appropriately simple, no over-engineering |
| 9 | reviewer-rule-checker | Yes | findings | 0 violations, 1 note (rule #17) | confirmed 0 violations; note (per-step tick) ACCEPTED via deviation audit |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled as Skipped)
**Total findings:** 1 confirmed HIGH + 1 MEDIUM + 1 LOW (all test-quality), 0 dismissed, 0 deferred; 0 rule violations; 1 accepted deviation-note.

## Round 1 Rule Compliance

Rubric = the TypeScript lang-review checklist (`.pennyfarthing/gates/lang-review/typescript.md`, #1-#13) + the star-wars CLAUDE.md core-purity law (#14-#19). Verified exhaustively by reviewer-rule-checker (41 instances across the diff) and cross-checked by me:

- **#1 type-safety escapes** — COMPLIANT: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, or non-null `!` in the diff. `trenchTimer`/`parity`/`TRENCH_VOICE_CUES` are all non-nullable.
- **#2 generic/interface** — COMPLIANT: `TRENCH_VOICE_CUES` is `ReadonlyArray<{...}>` (immutable, never mutated); `trenchTimer` is a plain `number` — no `Record<string,any>`/`object`/`Function`.
- **#3 enum/union exhaustiveness** — COMPLIANT: `SpeechLine` and `parity: 'even'|'odd'` are string-literal unions (project convention). `main.ts` GameEvent switch is unaffected (SpeechLine grows under the single `'speech'` case; tsc confirms no exhaustiveness break).
- **#4 null/undefined (`??` vs `||`)** — N/A: no nullable handling added.
- **#5 module/declaration** — COMPLIANT: `import type` used for type-only imports; `moduleResolution: bundler` (no `.js` extension needed); no ambient decls.
- **#6 React/JSX** — N/A (no .tsx).
- **#7 async** — N/A (all synchronous, per the pure-core contract).
- **#8 test quality** — rule-checker COMPLIANT for its lens (no `as any`, no mocks, imports from `src/` not `dist/`, real compile-time union assertion). BUT test-analyzer surfaced vacuousness the mechanical lens missed — see severity table (no contradiction; different lenses).
- **#10 input validation / #11 error handling / #12 perf / #13 fix-regression** — N/A or COMPLIANT (O(3) per-frame loop; no user input, no error paths).
- **#14 no shell import** — COMPLIANT: core imports only `./state`, `./input`, `./events`, `@arcade/shared/*`, sibling core modules.
- **#15 no DOM/window/document/canvas** — COMPLIANT (grep clean).
- **#16 no Date.now/new Date/performance.now/Math.random/requestAnimationFrame** — COMPLIANT (grep clean); parity from `state.wave`, timer from `state.trenchTimer` — pure functions of state.
- **#17 all time enters as dt (SPECIAL SCRUTINY: trenchTimer)** — per-step tick, NOT a violation (deterministic, forbidden-API-clean, fixed-timestep driver) → ACCEPTED via deviation audit; latent-fragility note recorded as a delivery finding.
- **#18 randomness from seeded RNG** — COMPLIANT (no RNG involved).
- **#19 stepGame deterministic** — COMPLIANT (AC8 replay test + clean build).

**Violations: 0.**

## Round 1 Reviewer Assessment (REJECTED — superseded by Round 2 below)

**Verdict:** REJECTED

The production code is clean — 0 rule violations, security clean, build green, and my own trace confirms the parity gate, the return-path cue propagation, and the reset are all *correct*. The rejection is on **test quality**: a named acceptance criterion (AC6, per-run reset) is guarded by a vacuous test, and a claimed behavior (cue rides every return path) is unverified. A pipeline exists to stop exactly this — a test that passes even when the feature is deleted is false confidence, not coverage.

**Observations** (tagged by source; plain-text tags):

1. [TEST] **[HIGH]** Vacuous AC6 reset test at `tests/core/trench-voice-timer.test.ts:99-101` and `:173-183`. Both build from `initialState` (where `trenchTimer` is already 0) and `freshTrench` is *always* constructed from `initialState`, never from an in-progress run. Since `enterPhase` sets `trenchTimer: 0` unconditionally (`sim.ts:746`), these assertions pass identically **even if that reset line were deleted**. I confirmed the regression is observable: delete the reset and a *second* trench run in the same game opens with `trenchTimer` already > 24 → **no cue ever fires** (the trench goes silent) — and the suite stays green. The correct dirty-fixture pattern already exists next door at `tests/core/trench-channel.test.ts:342`.
2. [TEST] **[MEDIUM]** No test exercises a cue coinciding with a crash / port-hit / port-miss frame. The impl comment (`sim.ts:492-496`) claims the cue "rides every return path (safe-hold, obstacle crash, or port hit)," but every fixture neutralizes those paths (`trenchObstacles: []`, port kept out of range). I traced the code — the claim **holds** — but a claimed behavior with no test is a coverage gap.
3. [TEST] **[LOW]** Tautological AC9 runtime assertions at `:224-234` — they assert properties of the test's own literal array, never calling production code. The real guard is the compile-time `NEW_TRENCH_LINES: SpeechLine[]` typing (which *did* fail in RED via tsc TS2322). Matches a pre-existing pattern in `speech-cues.test.ts`; non-blocking, optional cleanup.
4. [RULE] **[VERIFIED]** 0 violations across 19 rules / 41 instances — evidence: rule-checker inventory + my cross-check. `SpeechLine` string-literal union (events.ts:124-132), `TRENCH_VOICE_CUES` ReadonlyArray (sim.ts:689), core-purity boundary intact.
5. [SEC] **[VERIFIED]** Security clean — no unsafe casts; `events` is a fresh per-frame array (sim.ts:140); `trenchTimer` overflow is ~4.7M years away; determinism intact.
6. [VERIFIED] Parity gate correct for all reachable waves — `state.wave % 2 === 0` (sim.ts:498); `wave` is initialised to 1 and only ever increments (clearRun `wave+1`), so always ≥1. even→{luke@16, yahoo@24}, odd→{force@22} matches the ROM table (source-findings.md:349-352) and the user's chosen mapping.
7. [VERIFIED] Cue propagation correct — the `events.push` (sim.ts:499-503) precedes the crash/port-hit/miss branches; `afterObstacles` spreads `base`, and `clearRun`→`enterPhase` spreads `...s`, so the cue rides all four return paths. Correct (though untested — obs #2).
8. [TYPE] **[VERIFIED — disabled subagent covered]** reviewer-type-design was disabled; I checked its domain via rule-checker #1-#3: no stringly-typed escape, `parity` is a literal union not a bare string, `SpeechLine` extension is type-safe. Clean.
9. [SIMPLE] **[VERIFIED — disabled subagent covered]** reviewer-simplifier disabled; the data-driven `TRENCH_VOICE_CUES` table is the *simplest* faithful shape (extensible for sw3-5/sw3-7 without touching `stepTrench`), no over-engineering, no dead code.
10. [EDGE] / [SILENT] / [DOC] **[disabled subagents]** edge-hunter, silent-failure-hunter, comment-analyzer disabled via `workflow.reviewer_subagents`. Edge cases: covered by my trace + test-analyzer (obs #2). Silent failures: N/A — no error/catch/fallback paths in a pure numeric sim. Docs: comments reviewed by me — accurate and ROM-cited (source-findings.md references correct).

**Severity table (blocking = Critical/High):**

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | Vacuous AC6 reset test — passes even if the `enterPhase` reset is deleted; would miss an observable "silent second trench run" regression | `tests/core/trench-voice-timer.test.ts:99-101, 173-183` | Add a dirty fixture: `const dirty = { ...initialState(1), trenchTimer: 30 }; expect(enterPhase(dirty, 'trench').trenchTimer).toBe(0)` (pattern at `trench-channel.test.ts:342`). Then prove re-arm from a genuinely non-zero prior run. |
| [MEDIUM] | Claimed "cue rides every return path" is untested | `tests/core/trench-voice-timer.test.ts` (fixtures neutralize crash/kill/miss) | Add a test that a cue firing on the SAME frame as a port-hit and/or a catwalk crash coexists in that frame's `events`. |
| [LOW] | Tautological AC9 runtime assertions | `tests/core/trench-voice-timer.test.ts:224-234` | Optional — drop the runtime asserts, keep the compile-time `SpeechLine[]` guard. Non-blocking. |

### Devil's Advocate

Assume this code is broken. Where does it bite? First, the reset: a future contributor "tidies up" `enterPhase`, sees `initialState` already zeroes `trenchTimer`, and deletes the `trenchTimer: 0` line thinking it redundant. Every test stays green — including the two that claim to cover AC6 — yet the game now ships a bug where the second trench run of any session is stone silent, because the timer entered that run already past 24. The most iconic payoff of this very story (the voice lines) vanishes on run two and nobody's test screams. That is not hypothetical; I verified the mechanism. Second, the per-step timer: today's loop is a fixed-timestep accumulator at 1/60, so it's safe — but the day someone adds a "fast-forward" replay, a 120Hz mode, or a variable-dt debug stepper, the ROM thresholds silently retarget to a different real duration, and again there is no compile or runtime signal; the only clock in the core that behaves this way is this one. Third, a stressed edge: kill the exhaust port on exactly step 16 of an even wave and "Luke, trust me" fires in the same frame the Death Star explodes and you warp to space — the mid-trench cue plays as a victory line. Rare, unverified, cosmetically wrong. Fourth, a product trap of the accepted parity choice: a first-time player who only reaches wave 1 (odd) hears *only* "The Force is strong in this one" and never the two most famous lines — "Luke, trust me" and "Yahoo!" — until they clear a full run into wave 2. That's a deliberate, user-approved consequence, but it means the story's headline lines are hidden on the first playthrough. Fifth, the determinism test is shallow: it exercises no RNG-consuming branch, so if cue selection ever gained a random element the AC8 guard wouldn't catch the non-determinism. None of these is a rule violation, and the code is correct today — but the first is a live, observable regression that the test suite fails to guard, which is why this is a rejection and not an approval.

**Handoff:** Back to TEA (Imperator Furiosa) for test hardening (red rework) — fix the vacuous AC6 reset test (HIGH, blocking) and add the return-path coincidence test (MEDIUM). The LOW tautology is optional. Production code (`src/core/*`) is correct and rule-clean — no `src/` changes required; the reset itself works, only its test is weak.

## Dev Assessment (Rework — Round 1)

**Implementation Complete:** Yes (test hardening only — no `src/` changes; the
tdd workflow routes review-rework to `green`, so Dev owns the fix).

**Reviewer findings addressed:**
- **[HIGH] Vacuous AC6 reset test** → FIXED. Replaced the `initialState`-based
  assertion with a dirty-fixture test (`{ ...initialState(1), trenchTimer: 47 }` →
  `enterPhase(...,'trench')` asserts 0) plus a climbed-re-arm test that drives a
  full run (timer > 24), then re-enters the trench from a state STILL carrying the
  climbed timer and asserts the cue fires again. This now fails if the `enterPhase`
  reset is deleted (the exact silent-second-run regression the Reviewer flagged).
- **[MEDIUM] Untested "rides every return path" claim** → FIXED. Added two
  coincidence tests: a cue landing on the same frame as a port kill (clearRun
  return path) and as a catwalk crash (obstacle-crash return path). Both assert the
  cue coexists with the path's own events (`greatShotKidThatWasOneInAMillion` /
  `terrain-crash`).
- **[LOW] Tautological AC9 runtime asserts** → left as-is (Reviewer marked optional;
  matches the pre-existing pattern in `speech-cues.test.ts`; the real guard is the
  compile-time `SpeechLine[]` typing, which is retained).

**Files Changed (rework):** `tests/core/trench-voice-timer.test.ts` only (+4 tests;
suite now 22/22). No `src/` change — production code was confirmed correct by the
Reviewer.

**Tests:** 640/640 passing (GREEN); `npm run build` clean, zero type errors.
Verified by `testing-runner` (RUN_ID sw3-4-dev-green-rework).

**No new design deviations** and **no new upstream findings** in this rework.

**Branch:** `feat/sw3-4-trench-voice-line-timer` (pushed, commit `e8115fb`).

**Handoff:** Back to Reviewer (Immortan Joe) for re-review.

## Subagent Results

_Round 2 re-review (after the test-only hardening rework, commit `e8115fb`). `src/`
is byte-identical to Round 1 — where all specialists were clean and rule-checker
found 0 violations — so the delta under review is `tests/core/trench-voice-timer.test.ts` (+61/-5)._

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — GREEN 640/640, build clean, tree clean |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | clean | none | all 4 fix tests SOUND (independently mutation-verified); no pre-existing test weakened |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A — no casts, no non-determinism in the test delta |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | 0 violations across 14 rules on the test delta; `exhaustPort!` is a verified invariant |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled as Skipped)
**Total findings:** 0. Both Round-1 blocking/medium findings are FIXED and independently mutation-verified (by me and by reviewer-test-analyzer). No new findings.

## Rule Compliance

Production `src/` is unchanged from Round 1, so its exhaustive rule verification (0 violations / 19 rules / 41 instances) still stands. The Round-2 test-only delta was re-checked by reviewer-rule-checker: 0 violations across 14 applicable rules. The one item flagged for scrutiny — the `trench.exhaustPort!.pos` non-null assertion (`trench-voice-timer.test.ts:262`) — is COMPLIANT: `enterPhase(s, 'trench')` unconditionally assigns `exhaustPort: spawnPort()`, so the invariant is real, and the idiom matches 5 other test files in the suite. **Violations: 0.**

## Reviewer Assessment

**Verdict:** APPROVED

Round 1 rejected on test quality (a vacuous AC6 reset test and an untested "rides every return path" claim). The green rework (commit `e8115fb`) addressed both with test-only changes — no `src/` change, because the production code was already correct. I re-reviewed the delta, and I did not take the fix on faith: I **mutation-tested** it myself (deleted the `enterPhase` reset → both hardened AC6 tests now FAIL, `expected 47/30 to be +0`), and reviewer-test-analyzer independently mutation-tested all four fix tests (including stripping `speech` events from the `clearRun` and catwalk-crash return paths) and confirmed each is SOUND and precisely targeted. The named AC6 criterion is now genuinely guarded.

**Data flow traced:** `trenchTimer` (state) → `stepTrench` `+1`/step → parity-gated cue push into the shared `events` array → rides every return path (safe-hold / obstacle-crash / port-kill `clearRun` / port-miss) → shell `speak(event.line)`. Now covered by tests on the two most complex paths (clearRun, crash).

**Pattern observed:** the hardening follows the established dirty-fixture idiom (`{ ...initialState, <field>: <dirty> }`) from `trench-channel.test.ts:342`, and the coincidence tests reuse the proven port-kill fixture from `speech-cues.test.ts`. `trench-voice-timer.test.ts:174-290`.

**Error handling:** N/A — pure numeric/union sim, no error paths.

**Observations** (tagged; plain-text):
1. [TEST] [VERIFIED] AC6 reset test is now non-vacuous — mutation-verified: deleting `enterPhase`'s `trenchTimer: 0` (sim.ts:746) fails `trench-voice-timer.test.ts:174-181` (`expected 47 to be +0`) and `:183-200` (`expected 30 to be +0`). The exact silent-second-run regression is now guarded.
2. [TEST] [VERIFIED] Return-path coincidence now tested — port-kill (`clearRun`) at `:256-274` and catwalk-crash at `:276-290`; test-analyzer mutation-confirmed each fails only when its specific path drops the cue.
3. [RULE] [VERIFIED] Test delta rule-clean — 0 violations; `exhaustPort!` is a real invariant (`enterPhase('trench')` always sets it), matching 5 sibling test files.
4. [SEC] [VERIFIED] No casts, no non-determinism, deterministic seeds only in the delta.
5. [VERIFIED] No pre-existing test weakened — the only removed test was the vacuous AC6 one, replaced by two stronger tests; suite grew 19→22, full suite 640/640.
6. [TYPE] [disabled subagent — covered] typed fixtures (`const dirty: GameState = {...}`), `PROJECTILE_TTL` imported (not a magic number); no stringly-typed escape.
7. [SIMPLE] [disabled subagent — covered] the tests are direct and fixture-based; no over-engineered helpers introduced.
8. [EDGE] / [SILENT] / [DOC] [disabled subagents] edge/silent-failure/comment analyzers disabled via settings; edge coverage is exactly what this rework ADDED (coincidence frames), no silent-failure surface in a pure sim, and the new test comments are accurate (I read them).

### Devil's Advocate

Assume the fix is theater. Could the hardened tests be green for the wrong reason? I checked the obvious traps. The dirty-fixture reset test could be laundering the field through a helper that re-zeros it — but it builds `{ ...initialState(1), trenchTimer: 47 }` inline and calls `enterPhase` directly, and the mutation test proves it fails without the reset, so it is not laundered. The climbed re-arm test could be silently starting from 0 (via `freshTrench`) — but it deliberately bypasses that helper and constructs `{ ...initialState(1), wave: 2, trenchTimer: 30 }` by hand, and again the mutation test fails it without the reset. The port-kill coincidence test could be asserting a cue that fires anyway even without a kill — but it asserts BOTH `lukeTrustMe` AND `greatShotKidThatWasOneInAMillion` on the same frame, and the geometry (bolt parked on the port, `PORT_HIT_RADIUS 120`, port advancing only ~8.33 units) genuinely triggers the kill; test-analyzer confirmed stripping the clearRun speech events fails only this test. The catwalk test could pass because the crash never fires (making it a silent no-op) — but it independently asserts a `terrain-crash` event fired, and the synthetic catwalk at `[0,0,-1]` scrolls into `CATWALK_HIT_RADIUS 240` this frame. The one honest caveat, raised by test-analyzer: "rides every return path" is currently guaranteed by `stepTrench` threading a single mutable `events` array, so tests 3–4 pin the coexistence behavior rather than a defensive guard — but that is exactly the regression class (a future refactor that filters/forks/resets `events` on one path) the rework set out to protect, and the tests catch it. Everything else — the per-step-tick and wave-parity deviations — was already adjudicated and ACCEPTED in Round 1 (the rework introduced no new `src/` behavior). Nothing here rises to a finding.

**Deviation audit:** unchanged from Round 1 — both TEA deviations (per-step tick; parity-from-`wave`) remain ✓ ACCEPTED; the rework introduced no new deviations (Dev confirmed, and the `src/` is byte-identical). See `### Reviewer (audit)` above.

**Handoff:** To SM (The Organic Mechanic) for finish-story.