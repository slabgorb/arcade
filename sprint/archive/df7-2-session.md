---
story_id: "df7-2"
jira_key: "df7-2"
epic: "df7"
workflow: "tdd"
---
# Story df7-2: Setup->play start-of-game wiring

## Story Details
- **ID:** df7-2
- **Jira Key:** df7-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df7-2-setup-play-start-of-game-wiring
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-19T12:46:58Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-19T11:48:28Z | 2026-08-19T11:52:59Z | 4m 31s |
| red | 2026-08-19T11:52:59Z | 2026-08-19T12:08:36Z | 15m 37s |
| green | 2026-08-19T12:08:36Z | 2026-08-19T12:23:26Z | 14m 50s |
| review | 2026-08-19T12:23:26Z | 2026-08-19T12:35:58Z | 12m 32s |
| green | 2026-08-19T12:35:58Z | 2026-08-19T12:42:05Z | 6m 7s |
| review | 2026-08-19T12:42:05Z | 2026-08-19T12:46:58Z | 4m 53s |
| finish | 2026-08-19T12:46:58Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
- **Improvement (non-blocking, tooling):** The `sm-setup-exit` gate instructs "extract the
  epic number {N}" and derives `7` from story id `df7-2`, then validates
  `context-epic-7.md` and FALSE-FAILS. The real epic context is present and valid at
  `context-epic-df7.md` (9789 bytes) — `pf validate context-epic df7` → `[OK] present`.
  Game-prefixed epic ids (`df7`, `pm6`, `mg1`) are not bare numbers; the gate's `{N}` should
  be the full epic id. Verified against the tree; setup exit proceeded on the sourced green.

### TEA (test design)
- **Gap** (non-blocking): AC1 and the story title both read "attract|**game-over** -> setup -> play",
  but df7-1's `advancePhase` has no `game-over -> setup` edge — game-over exits only to `attract`
  via `overTimeout`, and that timeout is **df7-4**'s (`phase.ts:60`). So the game-over leg is not
  wireable in df7-2; it reaches the same start once df7-4 lands `game-over -> attract`.
  Affects `plugins/defender/src/core/phase.ts` (no change here — this is a df7-4 forward dependency;
  the RED tests pin the **attract -> setup -> play** path the Scope section actually scopes).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): the df7-2 reseed at the setup->play edge is exactly a fresh
  `createSim`, so its "fresh-game invariants" (humanoids placed, men=3, wave-0-then-1) are already
  guaranteed by df5-8/df5-10/df5-3. df7-2's own value is the WIRING (the edge triggers the reseed;
  main.ts boots attract). The RED tests assert the wiring + the reseed identity, not a re-proof of
  createSim's internals. Affects nothing (design note for Dev/Reviewer). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): df7-2 introduced the START/COIN control that the fleet lacked — a new
  pure `startPressed(held)` in `shell/input.ts` bound to `['Enter', 'Digit1']` (Enter = intuitive start;
  Digit1 = arcade 1-PLAYER-START, MAME convention). It is inert during play (advancePhase reads
  startRequested only in attract/game-over), so the Enter/fire overlap is harmless. Affects
  `plugins/defender/src/shell/input.ts` (a later story may add a distinct COIN key or a coin-count
  gate — ST1's `LDA CREDIT`/`BEQ ST1X`, now claimed at DEFA7.SRC:1103 — if credits are ever modelled).
  *Found by Dev during implementation.*
- **Gap** (non-blocking): `core/start.advanceStart` reseeds unconditionally on the `setup -> play`
  edge, which is correct only because `setup` is reachable today ONLY from `attract` (start-of-game) —
  `main.ts` never supplies `playerDied`, so df7-1's `death -> setup` RESPAWN edge is unreachable. When
  a later story wires `playerDied`, that same edge fires on a respawn, where a full `createSim` reseed
  would WRONGLY wipe score/wave/men/humanoids mid-game. Affects `plugins/defender/src/core/start.ts`
  (the respawn story must add a start-vs-respawn discriminant to `Session`/`PhaseSignals` and gate the
  reseed on it — likely df7-6 or a dedicated respawn story; no backlog story owns it yet). Documented
  inline at `advanceStart`'s doc comment. *Found by Dev during implementation (TS lang-review gate).*

### Reviewer (code review)
- **Conflict** (blocking, this story): a byte-inaccurate ROM citation in a test comment —
  `df7-2-identity.test.ts:14` cites `DEFA7.SRC:1106  BSR START`, but `DEFA7.SRC:1106` is
  `ST09  JSR  SNDLD`; `BSR START` is line **1107**. The comment also skipped 1105 (`LDD #ST1SND`)
  and 1106. Affects `plugins/defender/tests/df7-2-identity.test.ts` (correct the excerpt: 1105 `LDD
  #ST1SND`, 1106 `ST09 JSR SNDLD`, 1107 `BSR START`). The df1-1 gate can't catch it — it's prose,
  not a claims entry (the claims at :1100/:1103 are correct). *Found by Reviewer during code review
  (rule_checker #17/#32; comment_analyzer is disabled on this project, so citation prose has no
  automated specialist).*
- **Improvement** (blocking, this story): a weak source-text assertion —
  `df7-2-main-wiring.test.ts:52` `toMatch(/['"]play['"]/)` matches a bare quoted token over the whole
  file, not the `session.phase === 'play'` step-gate it claims to verify; it would false-green if the
  gate were removed and a `'play'` literal appeared elsewhere. Affects
  `plugins/defender/tests/df7-2-main-wiring.test.ts` (anchor to the gate expression, e.g.
  `/phase\s*===\s*['"]play['"]/`). *Found by Reviewer during code review (rule_checker #15/#25).*
- **Round 2:** both findings above verified FIXED against source; no new upstream findings during re-review. *Reviewer, code review round 2.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC1's "game-over -> setup" leg is not covered — attract -> setup -> play only**
  - Spec source: context-story-df7-2.md, AC1 (and the story title)
  - Spec text: "a start/coin action advances attract|game-over -> setup -> play and reseeds a fresh game"
  - Implementation: The RED tests pin the **attract -> setup -> play** start path only; no test asserts a `game-over -> setup` transition.
  - Rationale: df7-1's `advancePhase` (the machine this story wires, higher authority than the AC prose) routes game-over only to `attract` via `overTimeout`, which the epic assigns to **df7-4** ("Out of scope: df7-4"). Asserting a `game-over -> setup` edge would force Dev to contradict df7-1 and pull df7-4's timeout forward. The Scope section itself scopes this to "starts a single-player game from attract."
  - Severity: minor
  - Forward impact: The story title still asserts the refuted "game-over" leg; df7-4 completes it by adding `game-over -> attract`, after which the SAME start path serves the post-game restart with no df7-2 change. Reviewer should not read the missing game-over->setup test as a coverage gap.
- **The setup->play cadence (frame count for `setupComplete`) is not pinned by a count**
  - Spec source: context-epic-df7.md; core/phase.ts:47 ("df7-2 owns the cadence")
  - Spec text: "the start-of-game / respawn setup has elapsed (df7-2 owns the cadence)"
  - Implementation: The RED tests drive the `setupComplete` SIGNAL directly and assert the edge behaviour (reseed on setup->play); they do NOT assert how many frames setup lasts.
  - Rationale: The story fixes no frame number, and a literal count guard is busywork that couples the test to an arbitrary constant. The observable contract is the edge, not the duration.
  - Severity: minor
  - Forward impact: Dev picks the setup duration; a later story may tune it without reddening these tests.

### Dev (implementation)
- **Updated two sibling df3-6 tests to df7-2's boot-into-attract behaviour**
  - Spec source: context-story-df7-2.md, AC2; df3-6-boot-shell.test.ts + df3-6-shell-wiring.test.ts
  - Spec text (AC2): "main.ts boots into the df7-1 attract phase (not a bare running sim) and starts play only on the start/coin input"
  - Implementation: `df3-6-shell-wiring.test.ts` asserted `main.ts` matches `/createSim\(/`; rewrote it to assert `/bootSession\(/` (the reseed moved behind core/start.ts). `df3-6-boot-shell.test.ts` asserted the booted sim advances "at rest"; it now presses start (Enter) to reach play before measuring, since the sim is stepped only in play. Both keep their original GUARD intent (createSim is still wired; the live loop still steps in play).
  - Rationale: AC2 (current story) deliberately supersedes the df3-6 boot behaviour those two tests pinned; they were the only tests the change reddened (verified by full-suite run). Leaving them would directly contradict df7-2's own load-bearing negative (`main.ts` calls createSim nowhere). No assertion was weakened — each was re-pointed at the new seam.
  - Severity: minor
  - Forward impact: none — df3-6's guards remain live under the new wiring; a future regression to a frozen/ungated boot still reddens them.
- **Setup cadence: immediate auto-advance (setupComplete always true), a single-frame get-ready**
  - Spec source: core/phase.ts:47 ("df7-2 owns the cadence"); TEA deviation above
  - Spec text: "the start-of-game / respawn setup has elapsed (df7-2 owns the cadence)"
  - Implementation: main.ts sets `setupComplete: true` every frame, so setup is a single-frame beat that auto-advances to play (the MC mc6-4 "setup auto-advances to play a frame later" model). No frame constant is introduced.
  - Rationale: setup has no distinct render yet (the get-ready HUD/ship-materialise is df7-5), so a visible multi-frame hold would look like a stall; the minimal cadence starts play snappily and introduces no un-cited constant.
  - Severity: minor
  - Forward impact: df7-5 (HUD) or a later polish story can give setup a real duration by computing setupComplete from a frame counter, with no change to core/start.ts.

### Reviewer (audit)
- **TEA: "game-over -> setup leg not covered — attract -> setup -> play only"** → ✓ ACCEPTED by Reviewer: verified against `phase.ts` — `case 'game-over'` returns only `'attract'`/`'game-over'`; there is no `game-over -> setup` edge, and df7-4 owns the `game-over -> attract` timeout. Scoping to attract->setup->play is correct, not a coverage gap.
- **TEA: "setup->play cadence not pinned by a count"** → ✓ ACCEPTED by Reviewer: no numeric constant is introduced; pinning the edge behaviour (via the `setupComplete` signal) rather than a frame count is the right call and matches the no-count-guard project norm.
- **Dev: "updated two sibling df3-6 tests to boot-into-attract"** → ✓ ACCEPTED by Reviewer: diffed both — `df3-6-shell-wiring` re-pointed `createSim(`→`bootSession(` (the seed still asserted, now via the seam); `df3-6-boot-shell` presses start before measuring, preserving the frozen-sim guard. No assertion weakened; these were the only tests the boot change reddened. AC2 (current story) legitimately supersedes df3-6's bare-boot behaviour.
- **Dev: "setup cadence — immediate auto-advance (setupComplete always true)"** → ✓ ACCEPTED by Reviewer: minimal and sound for df7-2; setup has no distinct render yet, so a 1-frame beat is appropriate and introduces no un-cited constant. df7-5 can lengthen it later with no core change.
- No undocumented spec deviations found — the diff matches every logged deviation.

## Sm Assessment

**Story:** df7-2 — Setup->play start-of-game wiring (3pt, p2, tdd). The mc6-2 analog for
Defender: a coin/start input advances the df7-1 phase machine `attract|game-over → setup →
play` and RESEEDS a fresh game.

**Premise re-verified against the CURRENT tree (both falsifiable claims measured, not
assumed):**
- `plugins/defender/src/main.ts:28` boots straight into `createSim(() => (Math.random()*256)|0)`
  — no phase machine, no attract screen. The story's central premise ("main.ts stops booting
  into a bare sim") is CURRENT, not stale, and not already done.
- The df7-1 dependency IS present: `plugins/defender/src/core/phase.ts` exports
  `PHASES = ['attract','setup','play','pause','death','game-over']`, `type Phase`,
  `interface PhaseSignals`, and `advancePhase(phase, signals): Phase`. Wire against that.

**Scope ruling:** unambiguous — single deliverable, no either/or, no parked banner. A
start/coin action advances the phase and reseeds via `createSim` with the df5-10 humanoid
ground population, the df5-8 wave-1 `WVTAB` spawn, and `men=STARTING_MEN=3` (df5-3). The
reseed logic stays PURE (core); only the input binding is shell (`main.ts`). The defender
purity/core-boundary test guards this and must stay green. No backlog-shape question was owed
to the user (contrast jt8-6/mg1-2) — the story is a clean wiring gap with specific ROM cites.

**ROM citations for the ACs (Dev/TEA to verify verbatim, not SM):** ST1 *ONE PLAYER START at
`defender/DEFA7.SRC:1100` (credit check `:1103`); STARTING_MEN / NSHIP at `ROMC8.SRC:802`.

**Sibling probes (New Work Flow reflex):** clean. `git branch -r | grep df7-2` empty before
setup; a-1's only live session is df6-1 (unrelated). Local `develop` was 5 commits behind
`origin/develop` (pm6-1 landed) — fast-forwarded before cutting the branch. Claim now pushed:
`in_progress` stamp committed on `feat/df7-2-setup-play-start-of-game-wiring` and pushed, so
the sibling branch probe lights up.

**Handoff:** TEA (RED) — write failing tests for the fresh-game invariants (attract on boot,
start input advances to play, reseed populates humanoids + wave-1 attackers + men=3) and keep
the purity test green.

---

## TEA Assessment

**Tests Required:** Yes
**Reason:** 3pt wiring story with observable behaviour (a start transition + a reseed + a boot rewire + a citation) — squarely test-driven.

**Test Files:**
- `plugins/defender/tests/df7-2-start-transition.test.ts` — the PURE start seam (AC1, AC3, AC4). Pins `bootSession`/`advanceStart` (a new `core/start.ts`): boots into attract, attract+startRequested→setup (no reseed), setup+setupComplete→play RESEEDS a fresh `createSim` (humanoids placed, men=STARTING_MEN=3, score 0, not over; wave-0-then-first-play-tick→wave-1 df5-8 landers), determinism under seed, and no full-frame strobe across the transition frames (ADR-0005).
- `plugins/defender/tests/df7-2-main-wiring.test.ts` — the shell boot rewire (AC2), `main.ts?raw` scan (df3-6 idiom). Positive: imports `./core/start`, calls `bootSession()`/`advanceStart()`, references the `'play'` phase to gate the step. **Load-bearing NEGATIVE:** `createSim(` appears NOWHERE in main.ts (the reseed moved into the pure seam) — proves adoption, not a dead import beside the old bare-sim boot.
- `plugins/defender/tests/df7-2-identity.test.ts` — the ST1 citation (AC2), df1-1 gate. Asserts a `claims/19-phase.json` entry covers `DEFA7.SRC:1103` (`LDA CREDIT`, the ST1 coin gate). :1100 already passes (df7-1); :1103 is the RED.

**Tests Written:** 12 tests across 3 files, covering all 4 ACs.
**Status:** RED (verified via testing-runner, `npx vitest run --project defender`):
- `df7-2-start-transition.test.ts` — clean `Cannot find module '../src/core/start.js'` (absent-feature RED).
- `df7-2-main-wiring.test.ts` — 5/5 assertions fail (main.ts still boots a bare `createSim`).
- `df7-2-identity.test.ts` — :1103 credit-gate claim absent (1 fail); :1100 passes.
- Rest of the defender suite GREEN: **6 failed / 823 passed** (3 df7-2 files the only reds; 55 other files pass). No pre-existing test reddened.

### Rule Coverage (TypeScript lang-review + project rules)

| Rule / project constraint | Test(s) | Status |
|---------------------------|---------|--------|
| Purity / core-boundary (src/core stays clock-/entropy-free; reseed is pure) | `advanceStart is pure: identical inputs give identical output`; purity.test.ts covers `core/start.ts` once Dev adds it | failing (module absent) |
| Determinism under injected RNG (df3 seeded RNG; no ambient entropy) | `the same seed yields the same fresh game`; seed actually flows (stars differ by seed) | failing |
| ADR-0005 no full-frame strobe (accessibility outranks fidelity) | `the last-setup and first-play frames are not a whole-screen luminance flip` (`assertNoFullFrameStrobe`, fails closed) | failing |
| Citation gate df1-1 (every wired ROM line byte-pinned by a claim) | `the ST1 CREDIT gate (DEFA7.SRC:1103) is claimed` | failing |
| Wiring proof, not dead-import (load-bearing negative) | `main.ts no longer calls createSim directly` | failing |
| Non-vacuity (every assertion meaningful; >0 not just is-defined) | humanoids `.toBeGreaterThan(0)`, landers count, seed-sensitivity `not.toEqual` | n/a (self-check) |

**Rules checked:** all applicable TS lang-review + defender-specific rules (purity, determinism, ADR-0005, citation gate, non-vacuity) have test coverage.
**Self-check:** 0 vacuous tests — every test carries a value/edge assertion (no `let _ =`, no `assert(true)`, no is-defined-only). The AC4 guard fails CLOSED on a malformed frame pair, so it cannot pass vacuously.

**Note for Dev (GREEN):**
1. Add `plugins/defender/src/core/start.ts` — `interface Session { readonly phase: Phase; readonly sim: SimState }`, `bootSession(rand)` → `{ phase: 'attract', sim: createSim(rand) }`, `advanceStart(session, signals, rand)` → phase via df7-1 `advancePhase` (CONSUME, don't re-decide), reseed `createSim(rand)` only on the `setup→play` edge. Keep it pure.
2. Rewire `plugins/defender/src/main.ts` — boot `let session = bootSession(rand)`; each frame compute signals (`startRequested` from a start key, `setupComplete` from a setup-frame counter Dev owns), `session = advanceStart(session, signals, rand)`, and step the sim only in `'play'`. Remove the direct `createSim(` call.
3. Add the `DEFA7.SRC:1103` (`LDA CREDIT`) claim to `plugins/defender/docs/rom-study/claims/19-phase.json` (df1-1 gate re-verifies the verbatim).
4. Deviations above: game-over→setup is out of scope (df7-4); the setup cadence is deliberately un-count-pinned.

**Handoff:** To Dev (Korben Dallas) for GREEN.

---

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/defender/src/core/start.ts` (NEW) — the pure start seam. `interface Session { readonly phase: Phase; readonly sim: SimState }`, `bootSession(rand)` → `{ phase: 'attract', sim: createSim(rand) }`, `advanceStart(session, signals, rand)` → phase via df7-1 `advancePhase` (CONSUMED, not re-decided) and a `createSim(rand)` reseed ONLY on the `setup→play` edge. Entropy injected, no clock — purity.test.ts green.
- `plugins/defender/src/main.ts` — rewired: boots `let session = bootSession(rand)` into attract; each frame builds `PhaseSignals { startRequested: startPressed(held), setupComplete: true }`, calls `advanceStart`, and steps the sim ONLY when `session.phase === 'play'`. No direct `createSim(` call remains (reseed lives in the seam). Renders `composeFrame(session.sim, ...)`.
- `plugins/defender/src/shell/input.ts` — added pure `startPressed(held)` bound to `START_KEYS = ['Enter','Digit1']` (the START/COIN control, ST1 *ONE PLAYER START).
- `plugins/defender/docs/rom-study/claims/19-phase.json` — added `PH-ST1-CREDIT` pinning `DEFA7.SRC:1103` `\tLDA\tCREDIT` (verbatim byte-verified against `reference/original-source/defender/DEFA7.SRC:1103`; df1-1 gate green).
- `plugins/defender/tests/df3-6-shell-wiring.test.ts`, `plugins/defender/tests/df3-6-boot-shell.test.ts` — updated to df7-2's boot-into-attract (see Dev deviations). Guard intent preserved.
- `plugins/defender/tests/df7-2-start-transition.test.ts` — dropped an unused `createSim` import (`tsc` TS6133); no assertion changed.

**Tests:** 838/838 defender tests passing (GREEN). `npm run lint` (repo-wide tsc) clean. purity.test.ts + citations/audit green.
**Branch:** feat/df7-2-setup-play-start-of-game-wiring (to be pushed)

**AC coverage:** AC1 (reseed fresh game at setup→play edge) ✓; AC2 (main.ts boots attract via the seam + ST1 :1103 citation) ✓; AC3 (deterministic reseed under seed; purity green) ✓; AC4 (no full-frame strobe on the transition; df4-2 guard green) ✓.

**Self-review:** wired end-to-end (main.ts drives it — the attract→start→play path runs in the live loop, verified behaviourally by df3-6-boot-shell); follows the fleet phase-wiring pattern (mc6/pm4 analog, df7-1 consumed not re-decided); reseed stays pure/core, only input binding is shell. No debug code.

**Handoff:** To Reviewer (Jean-Baptiste Emanuel Zorg) for code review.

---

## Subagent Results

**Cycle: 1**
**All received:** Yes

| # | Subagent | Status | Received | Findings | Notes |
|---|----------|--------|----------|----------|-------|
| 1 | reviewer-preflight | Enabled | Yes | 0 | 838/838 green, lint clean, no debug code/smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — **citation prose has NO specialist; Reviewer audited comments manually** |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Enabled | Yes | 0 | Clean — client-only game, no trust boundary; confirmed AC4 strobe guard reinforced |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Enabled | Yes | 2 | 33 rules checked; 2 distinct violations (both in TEST files): weak `'play'` assertion (#15/#25), byte-wrong ROM cite in a comment (#17/#32). Production code clean on all rules. |

Working-tree audit (`pf reviewer audit-tree`): initially flagged `sprint/epic-df7.yaml` — verified NOT subagent corruption (pf's own `in_progress→in_review` status stamp from the green→review transition; no source dirty; reviewer subagents are read-only). Restored the tracking file; re-audit **CLEAN**.

## Reviewer Assessment

**Verdict:** REJECTED — 2 findings, both in test files; production code (start.ts/main.ts/input.ts) is clean.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] | Byte-inaccurate ROM citation in a comment: cites `DEFA7.SRC:1106 BSR START`, but :1106 is `ST09 JSR SNDLD` and `BSR START` is :1107 (skips 1105 `LDD #ST1SND`, 1106). Matches the project citation-accuracy rule; not caught by df1-1 (prose, not a claim). | `plugins/defender/tests/df7-2-identity.test.ts:14` | Correct the excerpt: 1105 `LDD #ST1SND`, 1106 `ST09 JSR SNDLD`, 1107 `BSR START` (or trim to only the cited-and-verified lines). |
| [MEDIUM] | Weak source-text assertion: `toMatch(/['"]play['"]/)` matches a bare token over the whole file, not the `session.phase === 'play'` step-gate it claims to verify — would false-green if the gate were removed and a `'play'` literal appeared elsewhere. | `plugins/defender/tests/df7-2-main-wiring.test.ts:52` | Anchor to the gate expression, e.g. `/phase\s*===\s*['"]play['"]/`. |

**Why REJECT on two MEDIUMs (no Critical/High):** the citation finding matches a stated project rule (byte-accurate ROM citations) — per the reviewer contract a rule-matching finding may be downgraded but **not dismissed**, and in a citation-disciplined project a known-wrong ROM line must not ship when the fix is one line. The weak assertion is a real false-green risk. Both fixes are trivial and both live in TEST files, so this is a fast test-refinement round-trip, not a re-implementation.

### Dispatch tags
- `[EDGE]` — skipped (edge_hunter disabled). Reviewer manual check: the only real branch is `advanceStart`'s reseed edge and main.ts's `phase === 'play'` gate — both traced, correct; the death→setup respawn edge is unreachable today (documented Delivery Finding).
- `[SILENT]` — skipped (silent_failure_hunter disabled). No error-swallowing surface in the diff (pure reducer + shell wiring; no try/catch, no fallbacks).
- `[TEST]` — skipped (test_analyzer disabled). Reviewer manual check surfaced the weak `'play'` assertion (also caught by rule_checker #15/#25) — see severity table.
- `[DOC]` — **skipped (comment_analyzer disabled)** — Reviewer audited citation prose manually and found the `DEFA7.SRC:1106` error (also rule_checker #17/#32). All other comments (start.ts header/scope, main.ts) verified byte-accurate against source (DEFA7:1100/1103, ROMC8:802).
- `[TYPE]` — skipped (type_design disabled). `Session` is a proper readonly interface; `Phase` is a union (no enum); no `as any`/non-null. (rule_checker #2/#33 confirm.)
- `[SEC]` — reviewer-security: clean, no findings (client-only, no trust boundary).
- `[SIMPLE]` — skipped (simplifier disabled). `advanceStart` is minimal (composes `advancePhase` + a one-line reseed guard); no over-engineering.
- `[RULE]` — reviewer-rule-checker: 33 rules, 2 violations (the two findings above); production code clean.

**VERIFIED (independent, with evidence):**
- [VERIFIED] Purity of the reseed seam — `purity.test.ts:200,228` recursively globs every `src/core/*.ts` (incl. the new `start.ts`) and the sweep is green: no clock/entropy/browser-global/shell-import.
- [VERIFIED] ROM citations in the CLAIM + production comments are byte-accurate — `DEFA7.SRC:1100`=`ST1 LDA STATUS`, `:1103`=`\tLDA\tCREDIT`, `ROMC8.SRC:802`=`FCB $03 NSHIP` (=STARTING_MEN=3), checked against `reference/original-source/defender/`. (The ONLY citation error is the test-comment one flagged above.)
- [VERIFIED] `main.ts` gates `stepSim` on play and calls `createSim` nowhere (main.ts:54 `if (session.phase === 'play')`; the reseed lives in `bootSession`/`advanceStart`).

**Handoff:** Back to TEA for the two test-file fixes (test-assertion + citation prose), then re-review.

---

### Dev rework (round 1 — Reviewer findings addressed)

Both round-1 MEDIUM findings fixed (test files only; no production code touched):

1. **ROM citation comment corrected** — `tests/df7-2-identity.test.ts` excerpt now reads the real
   lines: `1105 LDD #ST1SND`, `1106 ST09 JSR SNDLD`, `1107 BSR START` (was mislabelling `BSR START`
   as `:1106`). Byte-checked against `reference/original-source/defender/DEFA7.SRC:1105-1107`. The
   claim entries at :1100/:1103 were already correct and are unchanged.
2. **Assertion re-anchored** — `tests/df7-2-main-wiring.test.ts:52` now matches
   `/===\s*['"]play['"]/` (the `phase === 'play'` gate expression) instead of a bare `['"]play['"]`
   token over the whole file. It still passes against `main.ts:54` `session.phase === 'play'`, and
   would now redden if the gate were removed.

Re-verified: `npm run lint` clean; `npx vitest run --project defender` = 838/838 green (both fixed
files pass). No new deviations.

**Handoff:** To Reviewer (Zorg) for re-review (round 2).

## Review Correlation

**Cycle:** round 1 → round 2 rework

| # | Source | Finding | Classification | Checklist check | Fix | Verified? |
|---|--------|---------|----------------|-----------------|-----|-----------|
| 1 | reviewer (internal) | Byte-inaccurate ROM citation: `df7-2-identity.test.ts:14` cited `DEFA7.SRC:1106 BSR START`, but :1106 is `ST09 JSR SNDLD` and `BSR START` is :1107 | EXISTING_CHECK | typescript.md #17 / #32 | Corrected the excerpt to `1105 LDD #ST1SND`, `1106 ST09 JSR SNDLD`, `1107 BSR START`; byte-matched to `reference/original-source/defender/DEFA7.SRC:1105-1107` | ✅ verified (source-exact; claims at :1100/:1103 unchanged & correct) |
| 2 | reviewer (internal) | Weak source-text assertion: `df7-2-main-wiring.test.ts:52` `toMatch(/['"]play['"]/)` matched a bare token over the whole file, not the `phase === 'play'` gate | EXISTING_CHECK | typescript.md #15 / #25 | Re-anchored to `toMatch(/===\s*['"]play['"]/)` — bound to the `session.phase === 'play'` comparison (main.ts:54, the sole `=== 'play'` in the file) | ✅ verified (mutation-sound: removing the gate reddens it; the old bare-token form would not) |

### Signal Summary
- Internal (Reviewer) findings: **2** — both addressed.
- External findings: 0.
- CI findings: 0.
- NEW_CHECK owed: **0** — both findings map to existing lang-review checks (#15/#25, #17/#32); no checklist update required.

**Handoff:** To Reviewer (Zorg) for re-review (round 2).

---

## Subagent Results

**Cycle: 2**
**All received:** Yes
**Method:** targeted re-verification of the two round-1 findings (per the re-review evidence rule — for a 2-line, test-only diff, targeted re-verification of the characterized findings is stronger than a fresh generalist sweep). The diff since round-1 green (`307ff869...HEAD`) is exactly the two flagged test files; no production code changed, so round-1's clean subagent results for start.ts/main.ts/input.ts still hold.

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — citation prose re-verified by Reviewer first-hand |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A (round-1's 2 violations #15/#25 & #17/#32 re-verified RESOLVED against source) |

Working-tree audit (`pf reviewer audit-tree`): flagged `sprint/epic-df7.yaml` again — same false positive (pf's `in_progress→in_review` status stamp from the green→review transition; no source dirty). Restored; re-audit **CLEAN**.

## Reviewer Assessment

**Verdict:** APPROVED — both round-1 findings verified fixed against source; production code unchanged since round-1 green and re-confirmed clean.

**Data flow traced:** start/coin key (`startPressed(held)`) → `PhaseSignals.startRequested` → `advanceStart` (df7-1 `advancePhase`) → `setup→play` edge → `createSim(rand)` reseed → `session.sim` → stepped only in `play` → `composeFrame` → `render`. Safe: entropy is the injected `rand` (shell-owned); the reseed is pure/core; no clock in core.

**Round-2 re-verification (targeted):**
- [VERIFIED] Finding 1 (citation) FIXED — `df7-2-identity.test.ts` excerpt lines now match `DEFA7.SRC:1100-1107` byte-for-byte (1105 `LDD #ST1SND`, 1106 `ST09 JSR SNDLD`, 1107 `BSR START`), checked directly against `reference/original-source/defender/DEFA7.SRC`. Rule compatibility: satisfies lang-review #17/#32 (byte-accurate ROM citation) — no rule contradicts.
- [VERIFIED] Finding 2 (weak assertion) FIXED — `df7-2-main-wiring.test.ts` now `toMatch(/===\s*['"]play['"]/)`, anchored to the sole `=== 'play'` at `main.ts:54`; mutation-sound (removing the gate reddens it; the old bare-token form would not). Rule compatibility: satisfies lang-review #15/#25 (source-text guard anchors the claim, not a bare token) — no rule contradicts.
- [VERIFIED] Purity — `purity.test.ts:200,228` recursively globs every `src/core/*.ts` incl. `start.ts`; sweep green. Rule compatibility: satisfies project rule #31 (src/core clock-free / entropy-injected) — no rule contradicts.
- [VERIFIED] Scope — `git diff 307ff869...HEAD` touches only the two test files; no production code changed, so round-1's VERIFIEDs (`main.ts` gates `stepSim` on play & calls `createSim` nowhere; production/claim citations byte-accurate; security clean) all still hold. Rule compatibility: satisfies #14 (derived edge computed at single exit), #24 (retirement enforced by load-bearing negative), #33 (readonly DTO) — no rule contradicts.

### Rule Compliance

Lang-review checklist (`.pennyfarthing/gates/lang-review/typescript.md`) — rule-by-rule, from reviewer-rule-checker's 33-rule sweep (cycle 1) with cycle-2 resolution of the two flagged rules:

| Rule | Title | Instances | Verdict |
|------|-------|-----------|---------|
| #1 | Type-safety escapes (`as any`/`ts-ignore`/non-null) | 8 | ✓ pass — none present |
| #2 | Generic/interface pitfalls (`Record<string,any>`, missing `readonly`) | 2 | ✓ pass — `Session` is proper readonly interface |
| #3 | Enum anti-patterns | 1 | ✓ pass — `Phase` is a union, not an enum |
| #5 | Module/.js extension + `import type` | 7 | ✓ pass — all relative imports carry `.js`; `PhaseSignals` is type-only |
| #7 | Async/Promise | 2 | ✓ pass — `bootSession`/`advanceStart` sync |
| #8 | Test quality (`as any`, fixture=Input mismatch) | 3 | ✓ pass — NEUTRAL/PhaseSignals literals match real interfaces |
| #14 | Derived edge in one branch | 2 | ✓ pass — reseed edge computed at single exit; play-gate a single top-level `if` |
| #15/#25 | Source-text guard anchors the claim | 5 | ✓ pass (cycle 2) — the one weak `'play'` token match re-anchored to `=== 'play'` |
| #17/#32 | Byte-accurate ROM citation | 4 | ✓ pass (cycle 2) — the one comment error (`:1106 BSR START`) corrected to :1105/1106/1107; claims at :1100/:1103 byte-verified |
| #24 | Retirement applied where AC named it | 1 | ✓ pass — bare-`createSim` boot retired, enforced by load-bearing negative test |
| #26 | Assertion terms all local to test | 1 | ✓ pass — `men===STARTING_MEN` compares runtime output to imported production constant + independent literal anchor |
| #31 | src/core purity boundary | 1 | ✓ pass — `start.ts` clock-free/entropy-injected; purity sweep green |
| #33 | `readonly` on DTO fields | 2 | ✓ pass — `Session` + `PhaseSignals` all readonly |

Rules #4/#6/#9/#10/#11/#13/#16/#19-23/#27-30 — not triggered by this diff (no such construct present). All applicable rules PASS after cycle-2 fixes; 0 outstanding violations.

### Dispatch tags (cycle 2)
- `[EDGE]` — disabled; the reseed edge + play-gate re-traced, correct; respawn edge unreachable (documented Delivery Finding).
- `[SILENT]` — disabled; no error-handling surface in the diff.
- `[TEST]` — disabled; the weak assertion (round-1 [TEST]-domain finding) is now resolved and mutation-sound.
- `[DOC]` — disabled; Reviewer manually re-verified the corrected citation prose — now byte-accurate.
- `[TYPE]` — disabled; no type changes in the rework diff.
- `[SEC]` — reviewer-security: clean.
- `[SIMPLE]` — disabled; no complexity change.
- `[RULE]` — reviewer-rule-checker (round-1) findings both resolved; no new violations.

**Deviation audit:** unchanged from cycle 1 — all four logged deviations remain ✓ ACCEPTED (see `### Reviewer (audit)`); no new deviations introduced by the rework.

**Handoff:** To SM for finish-story.