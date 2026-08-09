---
story_id: "mc8-5"
jira_key: "mc8-5"
epic: "mc8"
workflow: "tdd"
---
# Story mc8-5: Wire the cruise/Sputnik parametric drone LIVE TRIGGER

## Story Details
- **ID:** mc8-5
- **Jira Key:** mc8-5
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/mc8-5-wire-cruise-sputnik-drone-live-trigger
- **PR:** https://github.com/slabgorb/arcade/pull/177

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-09T22:27:05Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-09T21:48:15Z | 2026-08-09T21:58:37Z | 10m 22s |
| red | 2026-08-09T21:58:37Z | 2026-08-09T22:07:23Z | 8m 46s |
| green | 2026-08-09T22:07:23Z | 2026-08-09T22:10:09Z | 2m 46s |
| review | 2026-08-09T22:10:09Z | 2026-08-09T22:19:57Z | 9m 48s |
| green | 2026-08-09T22:19:57Z | 2026-08-09T22:22:46Z | 2m 49s |
| review | 2026-08-09T22:22:46Z | 2026-08-09T22:27:05Z | 4m 19s |
| finish | 2026-08-09T22:27:05Z | - | - |

## Delivery Findings

No upstream findings.

### Reviewer (code review)
- No upstream (cross-story) findings. The three rejection items are in-story rework
  (tracked in the Reviewer Assessment severity table), not deliveries for other stories.

## Design Deviations

### TEA (test design)
- **Re-baselined mc8-2's "during PLAY does NOT stop the drone" test**
  - Spec source: plugins/missile-command/tests/audio-dispatch.test.ts (mc8-2 block, "updateSustainedSounds — the drone does not ring through game over")
  - Spec text: "during PLAY it does NOT stop the drone — the silence is EDGE-conditional, not unconditional" (asserted with a fresh no-threat `createGame(1)`)
  - Implementation: repointed the test at a threat-present play frame (`icbms:[cruise]`) so its surviving invariant (an unconditional stop would silence the drone every frame) still holds; the no-threat play frame now STOPS the drone and is pinned as a new mc8-5 case.
  - Rationale: mc8-2 had no live trigger, so "play never stops the drone" was a placeholder; mc8-5's trigger makes an empty play frame correctly silence the drone, which contradicts the old assertion verbatim.
  - Severity: minor
  - Forward impact: none
  - → ✓ ACCEPTED by Reviewer: sound re-baseline. Verified no stale survivor of the retired "play never stops" model in sibling suites (cruise-integration/audio-engine/drone-trigger — none call `updateSustainedSounds` under the old no-threat assumption; rule-checker #24). The surviving invariant is still mutation-catchable (an unconditional `stopLoop` fails the re-pointed test).

### Reviewer (audit)
- No UNDOCUMENTED spec deviations found. The scope decision to include `feedDrone` (sweep
  drive) beyond the title's literal "starts/stops" was disclosed by TEA and Dev and is
  sound — a start-only trigger produces no sound, so it does not satisfy "wire the
  parametric drone." Accepted.

## Sm Assessment

**Routing decision:** TDD (phased) → handoff to TEA for the RED phase.

**Blocker cleared (measured, not inferred):** The title says "BLOCKED until mc5 adds
those enemies to core." That precondition is now satisfied — verified in the tree:
- Sputnik enemy in core (mc5-2): `core/sputnik.ts`, `state.sputniks`.
- Cruise missiles in core (mc5-3): `icbm.kind === 'cruise'` on `state.icbms`.
- Pure CRMONS-gated selector already exists and is tested: `core/drone-trigger.ts::droneRequest(state)`
  → `'both' | 'cruise' | 'sputnik' | null` (mc5-3, GREEN).
- Drone voice + parametric sweep shipped in mc8-4: `core/drone.ts` (`droneSweep`,
  `DroneKind`) and shell `audio.ts` (`startLoop`/`stopLoop`/`feedDrone`).

**The work (well-scoped shell wiring):** `shell/audio-dispatch.ts::updateSustainedSounds`
(called per frame from `main.ts:65`) currently ONLY stops the drone on `phase==='over'`.
mc8-5 makes it START/STOP the drone from `droneRequest(state)` presence and drive the
per-frame sweep. Title is the spec — no ACs in YAML; TEA authors them in RED.

**Watch-outs for downstream agents:**
- Title-only story: the TITLE is the spec (no description/ACs in the sprint YAML).
  TEA must derive ACs from the title + the SM-verified seam in the context file.
- The terminal-edge guard must survive: a threat still on screen at game-over must be
  silenced (the `'over'` `stopLoop` stays). See the "edge-driven-voices gotcha" comment
  in `audio-dispatch.ts` — a stop keyed only on a "drone-gone" event would leak the
  continuous voice across the terminal edge.
- Do NOT re-implement the pure selector — `droneRequest` already exists and is tested
  in `tests/drone-trigger.test.ts`. This story is the shell trigger, not the projection.
- Full seam, key files, and existing tests to extend are in
  `sprint/context/context-story-mc8-5.md`.

## TEA Assessment

**RED complete.** 9 new failing tests in `tests/audio-dispatch.test.ts`; full MC suite
`9 failed | 1041 passed`, `tsc --noEmit` green. Failures are isolated to the mc8-5
live-trigger cases.

**The contract Dev must satisfy (GREEN):** extend the shell seam
`updateSustainedSounds(audio, state)` (called per frame from `main.ts:65`) to drive the
drone from the pure `droneRequest(state)` selector:
- **Start on presence, during play:** `phase === 'play'` and `droneRequest(state) != null`
  → `startLoop('drone')`.
- **Drive the sweep while running:** call `feedDrone(frame, kind)` each running frame with
  `kind === droneRequest(state)` and an ADVANCING frame (sim clock `state.frame` or an
  internal counter — tests accept either, only that consecutive frames differ). This makes
  mc8-4's `droneSweep`/`feedDrone` reachable (they are dead code until this story).
- **Stop when clear:** `droneRequest(state) === null` → `stopLoop('drone')`.
- **Phase gate wins over presence:** at `'over'` (and `'pause'`) the rosters are frozen so
  `droneRequest` is still non-null — the drone must be SILENCED, not restarted. Gate the
  trigger on `phase === 'play'` (a bare `droneRequest ? start : stop` reopens the mc8-2
  game-over leak — pinned by the regression guard).
- Dev will need to WIDEN `SoundSurface` (audio-dispatch.ts) to include `feedDrone` so the
  seam can drive it; `main.ts` already passes the full engine.

**Scope decision (flagged for Reviewer/owner):** the title says "starts/stops it", but I
scoped mc8-5 to ALSO drive the parametric sweep (`feedDrone`). Rationale: `startLoop` only
tracks a running flag — the drone produces NO sound without the per-frame `feedDrone`
register writes, so a start-only trigger would leave mc8-4's voice dead and the cabinet
silent. "Wire the PARAMETRIC drone live trigger" reads as making it actually sound. One-line
descope if overruled (drop the three `feedDrone:*` tests + the advance test).

### Rule Coverage (typescript.md)
- **Exhaustiveness / no vacuous asserts:** every new test asserts an observable
  (`droneRunning` net state, `startsWith('feedDrone:<kind>:')`, `stopLoop` presence) — no
  `let _ =`, no always-true/always-None assertions.
- **Kind-tracking anti-mutation:** the sputnik-only test asserts `feedDrone:sputnik:` AND
  `not feedDrone:cruise:` — a hardcoded-'cruise' mutant dies (their sweep bounds differ).
- **Presence-source anti-mutation:** the ballistic-only test guards a mutant keying off
  `icbms.length` instead of the cruise `kind`.
- **Purity:** no core files touched; `purity.test.ts` continues to guard `src/core/`.

**Rework note:** the one existing-test change is logged as a Design Deviation (TEA
subsection) — re-baselining mc8-2's placeholder "play never stops the drone".

## Dev Assessment

**GREEN complete.** Full MC suite `1050 passed | 0 failed`, `tsc --noEmit` green. One
source file changed (`shell/audio-dispatch.ts`, +28/−9); no core touched.

**What I built:** `updateSustainedSounds` now consumes the pure `droneRequest(state)`
selector. Per frame:
- `kind = state.phase === 'play' ? droneRequest(state) : null` — the phase gate is
  applied FIRST so a non-null selector at `'over'`/`'pause'` (frozen rosters) cannot
  restart the drone.
- `kind === null` → `stopLoop('drone')` and return (threat cleared, or non-play phase).
- otherwise → `startLoop('drone')` (idempotent) + `feedDrone(state.frame, kind)`, driving
  mc8-4's sweep with the sim frame as a pure monotonic clock.

**Type-design note (kept the sibling dispatchers decoupled):** widening the shared
`SoundSurface` to require `feedDrone` broke the mc8-4 test fakes passed to
`playEventSounds`/`playEdgeCues` (which don't need it). Rather than bolt a no-op
`feedDrone` onto unrelated fakes, I gave the sustained-voice update its own narrower
slice `DroneSurface` (`startLoop | stopLoop | feedDrone`); the one-shot/edge functions
keep `SoundSurface`. No sibling test was modified.

**Minimalism:** no new abstractions beyond the one narrow type; the sweep clock is the
existing `state.frame`, so the shell holds no new mutable counter.

**Reachability:** this wiring makes mc8-4's `droneSweep`/`feedDrone` reachable — they had
zero callers before this story.

**Scope decision inherited from TEA (feedDrone in scope):** I implemented the sweep feed,
per the TEA Assessment's flagged reasoning (a start-only trigger leaves the cabinet
silent). Left standing for Reviewer/owner; one-line descope if overruled.

**Not verifiable in vitest (node):** the drone is only audible in a real browser build
(the POKEY worklet is a silent no-op under node and under `@fs` dev-serve — see project
memory "MC audio is SILENT under just serve"). The wiring/contract is fully unit-proven
here; any end-to-end audio check must be a build + Playwright AnalyserNode probe.

### Dev Assessment (rework — round-trip 1)

All three Reviewer findings fixed. Full MC suite `1051 passed` (+1 test), `tsc` green.
- **[TEST] denylist gap:** added a loop test over `'between'`/`'attract'`/`'setup'` with a
  cruise+plane present, asserting the drone stays silent and feeds nothing — locks the
  `'play'`-only allowlist. Verified the fix by applying the exact denylist mutant
  (`over||pause ? null : droneRequest`) and confirming it now reddens the suite (1 fail).
- **[DOC] pause lying-docstring:** reworded both the impl comment (audio-dispatch.ts) and
  the pause test comment — the freeze claim is now scoped to `'over'` (cited game.ts:178);
  `'pause'` is described as a pre-emptive guard for future mc6 wiring, not a current
  mechanism.
- **[TYPE] mock fidelity:** typed the recorder fake's `feedDrone` `kind` as `DroneKind`.
- Non-blocking suggestions (sweep-test rename, held-threat-across-frames, no-stop assertion
  on START tests) left as-is per the Reviewer noting them optional.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — lint clean, 1050 tests pass, purity intact, no smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer's own edge analysis + mutation battery |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (no try/catch or fallbacks in diff) |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 1 (denylist-phase gap), deferred 3 (low nits, non-blocking) |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 | confirmed 1 (pause lying-docstring), noted 1 low (monotonic), dismissed 1 (forward-refs still accurate) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (DroneSurface Pick is clean; kind narrowing type-safe) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — N/A (client-side audio, no input/auth/secrets) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (6-line function, no dead code) |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 (pause lying-docstring corroborated; feedDrone mock `string`→`DroneKind`) |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 3 confirmed, 1 dismissed (with rationale), 4 deferred (low, non-blocking)

**Cross-reference:** the pause "frozen rosters" lying-docstring was flagged INDEPENDENTLY by
both reviewer-comment-analyzer (high) and reviewer-rule-checker (rule #17, high) → strongly
confirmed, not a single-specialist artifact.

**Reviewer's own coverage of disabled lenses (mutation battery, isolated git worktree):**
| Mutant | Result |
|--------|--------|
| Drop the phase gate (`kind = droneRequest(state)`) | KILLED — 2 fail (over-leak + pause guards) |
| Hardcode kind `'cruise'` in feedDrone | KILLED — 2 fail (sputnik/both feed-kind tests) |
| Constant sweep frame (`feedDrone(0, kind)`) | KILLED — 1 fail (sweep-advances test) |
| Drop the feedDrone call | KILLED — feed-kind tests fail |
| Swap start/stop | KILLED — 10 fail |
All meaningful mutants killed; the existing suite is robust for the paths it covers. The
ONE surviving-mutant class is the enumerated-denylist phase gate (test-analyzer finding
below), which no current test excludes.

## Rule Compliance (typescript.md + project rules)

Exhaustively checked the diff against the 26-item TS lang-review checklist + purity/citations/
exhaustiveness (30 rules, 33 instances). Compliant except the two confirmed findings.
- **Type safety (rule 1):** no `any`, no `!`, no `@ts-ignore`. The one cast
  `{} as GameState['sputniks'][number]` (test) is a concrete-shape cast with a rationale
  comment (droneRequest reads only `.length`) — not an escape pattern. COMPLIANT.
- **Generics/Pick (rule 2):** `DroneSurface = Pick<AudioEngine,'startLoop'|'stopLoop'|'feedDrone'>`
  mirrors the existing `SoundSurface` idiom. COMPLIANT.
- **Exhaustiveness (rule 3/29):** `playEventSounds`'s `never`-guard default is byte-for-byte
  unchanged. COMPLIANT.
- **Null handling (rule 4):** explicit `=== null` on the `DroneKind | null`, no `||`/`??`
  masking. COMPLIANT.
- **Module imports (rule 5):** `droneRequest` is a value import (runtime), correctly NOT
  `import type`; `Icbm` is type-only. Both carry `.js`. COMPLIANT.
- **Purity (rule 27):** no `src/core/` file touched; imports the pre-existing pure
  `droneRequest`. purity.test.ts passes. COMPLIANT.
- **Citations (rule 28):** no new core file / magic number; the `0`/`5` frame literals are
  shell-test-local, outside the core scanner scope. COMPLIANT.
- **Test mock fidelity (rule 8):** `feedDrone(frame, kind: string)` widens the real
  `kind: DroneKind` → VIOLATION (confirmed finding [TYPE], low).
- **Comment mechanism (rule 17):** pause "frozen rosters" present-tense dual-phase claim →
  VIOLATION (confirmed finding [DOC], low).

### Devil's Advocate

Assume this is broken. The whole feature hangs on `droneRequest` being phase-agnostic while
the shell alone decides WHEN to trust it — a split-brain design where the truth of "should
the drone sound" lives in two files. What breaks it? First, a well-meaning refactor: someone
"tidies" the gate into `phase === 'over' || phase === 'pause' ? null : droneRequest(state)`,
reading the comment that says over/pause are the silence phases — and now the drone hums
through `'attract'`, `'setup'`, and `'between'`, none of which any test forbids. The green
suite would bless it. That is not hypothetical paranoia; it is the exact shape the comment
now invites, because the comment enumerates over/pause as "the" frozen phases and omits that
`'play'` is the ONLY sounding one. So the doc defect and the coverage gap are the same wound
from two sides. Second, the drone's audibility: `startLoop` only flips a `Set` flag — the
sound is entirely `feedDrone`'s register writes. If a future edit to `audio.ts` makes
`feedDrone` early-return on a stale `running` check, the drone goes silent with every unit
test still green (they record the CALL, not the POKEY output). The Dev Assessment already
concedes this: audibility is unprovable in node. Third, a confused reader: the comment calls
`state.frame` "monotonic," but it resets on a new game; someone could build a sweep-phase
assumption on global monotonicity and be wrong across a restart (harmless today only because
the gate silences the drone at 'over' first — an invariant nothing tests). None of these are
shipped bugs. But two of them (the denylist refactor, the pause comment) are live traps for
the next editor, and this project's own history is a catalogue of exactly such traps shipping
green. That tips me to REJECT for the cheap fixes rather than approve on "the code is correct
today."

## Reviewer Assessment

**Verdict:** REJECTED

The shipped logic is correct, fully typed, purity-intact, and passes 1050 tests — and my
mutation battery killed every mutant the current suite targets. I am NOT rejecting for a
bug. I am rejecting for three confirmed, cheap fixes that this project's standards
(comment truth; restrictive mutation-catching tests) treat as load-bearing, two of them
independently corroborated by two specialists.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] `[TEST]` | The phase gate's allowlist (`'play'`-only) is not locked: only `'over'`/`'pause'` are tested as silence phases, so an enumerated-denylist mutant (`phase === 'over'\|\|'pause' ? null : droneRequest`) survives green while droning through `'attract'`/`'setup'`/`'between'`. | `plugins/missile-command/tests/audio-dispatch.test.ts` (new mc8-5 describe block) | Add a test: a NON-`'play'` phase that is NOT over/pause (e.g. `'between'` or `'attract'`) WITH a threat present (`icbms:[cruise]`), pre-started drone → assert `droneRunning === false` and no `feedDrone`. Kills the denylist mutant. |
| [LOW] `[DOC]` `[RULE]` | Comment states rosters are "frozen" at `'over'` **and** `'pause'` in present tense; only `'over'` has a freeze branch (`game.ts:178`). `'pause'` is not wired into `stepGame`/`nextPhase` anywhere — the claim is aspirational, stated as fact. Confirmed by comment-analyzer **and** rule-checker (#17), both high. | `plugins/missile-command/src/shell/audio-dispatch.ts:80` and `tests/audio-dispatch.test.ts:356` | Scope the freeze claim to `'over'` (cite `game.ts:178`); describe `'pause'` as a pre-emptive guard for when mc6 wires pause, not a current freeze mechanism. |
| [LOW] `[TYPE]` `[RULE]` | `recorder()` fake's new `feedDrone(frame: number, kind: string)` widens the real `AudioEngine.feedDrone(kind: DroneKind)` to `string`, so a mistyped kind at a call site would not be type-caught by the fixture. (New line — could use `DroneKind` for free.) | `plugins/missile-command/tests/audio-dispatch.test.ts:63` | Type the fake's `kind` param as `DroneKind` (import the type from `../src/core/drone.js`). |

**Non-blocking (optional, TEA's discretion):** (a) the "sweep ADVANCES" test proves frame
forwarding, not `droneSweep` math — consider renaming to match; (b) no test drives
`updateSustainedSounds` twice on ONE recorder with a held threat (proves no spurious
stop→restart glitch + monotonic feed) — nice-to-have; (c) START tests could add
`.not.toContain('stopLoop:drone')` to kill a per-frame stop→restart click mutant. None
block.

**Data flow traced:** `state.icbms`/`state.sputniks` → `droneRequest(state)` (pure, phase-
agnostic) → `updateSustainedSounds` phase gate (`'play'`-only) → `audio.startLoop`/`stopLoop`/
`feedDrone(state.frame, kind)`. Correct end to end; the game-over/pause leak cannot reopen
(verified `game.ts:178` freezes rosters at `'over'`, and the allowlist silences it anyway).

**Handoff:** Back to TEA (red rework) — the primary fix is a missing-edge-case test; the two
comment/type fixes ride the same cycle (TEA fixes the test-file comment + mock type; the
impl-file comment reword lands in green).
---

## Subagent Results (round 2 — rework re-review)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — lint pass, 1051 tests pass, purity pass, no smells; logic unchanged |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — Reviewer re-verified (allowlist covers all 6 phases) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no error paths in diff |
| 4 | reviewer-test-analyzer | Yes | clean | none | N/A — confirmed the new test closes the denylist gap, non-vacuous, exhaustive over Phase |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — reworded comments now accurate, no new inaccuracy |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — DroneKind narrowing is a clean type-only tighten |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — comment/test-only rework |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — both prior violations RESOLVED, no new violations |

**All received:** Yes (4 enabled returned clean, 5 disabled pre-filled)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred — all three round-1 findings verified fixed.

**Reviewer's independent re-verification (isolated worktree):** re-ran the denylist mutant
(`phase === 'over' || 'pause' ? null : droneRequest`) against the reworked suite → KILLED
(1 fail, the new allowlist test); the round-1 hardcode-kind mutant still KILLED (2 fail).

## Reviewer Assessment (round 2)

**Verdict:** APPROVED

All three round-1 findings are fixed and independently re-verified; the shell logic body is
byte-identical to the version whose correctness I already cleared (only a comment changed
there). No new issues.

- **[TEST] denylist gap → CLOSED.** The new `['between','attract','setup']` allowlist test
  makes the suite exhaustive over the `Phase` union (only `'play'` sounds). Mutation-proven:
  the enumerated-denylist mutant now reddens the suite (my worktree run + test-analyzer's
  hand-trace agree). Not vacuous — `droneRequest` is phase-agnostic, so the observed silence
  is attributable only to the gate under test.
- **[DOC] pause lying-docstring → FIXED.** Freeze claim scoped to `'over'` (cited game.ts:178,
  verified verbatim); `'pause'` correctly described as not-yet-wired / forward guard.
  Corroborated clean by comment-analyzer AND rule-checker.
- **[TYPE] mock fidelity → FIXED.** `feedDrone(kind: DroneKind)` now matches the real
  `AudioEngine.feedDrone` signature (audio.ts:177).
- **[RULE] rule-checker → CLEAN.** Exhaustive re-check confirmed both prior violations
  (rule 8 mock fidelity, rule 17 comment mechanism) RESOLVED and no new violations; `as const`
  phase loop is type-safe against the `Phase` union, `never`-guard intact, no core touched.
- **[TEST] test-analyzer → CLEAN** and **[DOC] comment-analyzer → CLEAN** this round (see
  the round-2 Subagent Results table); no findings survived.

**Data flow (unchanged, re-confirmed):** `state.icbms`/`state.sputniks` → `droneRequest` (pure)
→ `updateSustainedSounds` `'play'`-only gate → `startLoop`/`stopLoop`/`feedDrone(state.frame, kind)`.
Game-over/pause leak cannot reopen (allowlist + game.ts:178 freeze).

**Handoff:** To SM for finish-story.