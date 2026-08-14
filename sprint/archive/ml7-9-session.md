---
story_id: "ml7-9"
jira_key: "ml7-9"
epic: "ml7"
workflow: "tdd"
---
# Story ml7-9: Wire core/scroll.ts field scroll

## Story Details
- **ID:** ml7-9
- **Jira Key:** ml7-9
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-14T21:50:47Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-14T20:20:51Z | 2026-08-14T20:23:20Z | 2m 29s |
| red | 2026-08-14T20:23:20Z | 2026-08-14T21:06:24Z | 43m 4s |
| green | 2026-08-14T21:06:24Z | 2026-08-14T21:24:42Z | 18m 18s |
| review | 2026-08-14T21:24:42Z | 2026-08-14T21:50:47Z | 26m 5s |
| finish | 2026-08-14T21:50:47Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)

- **Improvement** (non-blocking): `core/scroll.ts`'s header comment is STALE — lines 19-21 say the DDT halves of SCROLD/SCROLU "are ml4-4's — the DDTADD table has no core owner yet," but ml4-4 SHIPPED them as `ddtScrollDown`/`ddtScrollUp` (`core/ddt.ts:366/408`). A comment asserting a mechanism nobody re-ran (lang-review #17). Affects `plugins/millipede/src/core/scroll.ts:19-21` (update the scope note now that this story wires the DDT halves). *Found by TEA during test design.*
- **Gap** (non-blocking, IN SCOPE): the MUSH-count sink Dev must add absorbs the pre-existing `TODO(ml7-2 fidelity)` at `sim.ts:169` — `ddtExplosionStep` returns mush deltas that are currently dropped. Full-threading (AC7) means those deltas, plus the scroll + `ddtScrollDown` deltas, all feed `GameState.mushCounts`. Affects `plugins/millipede/src/core/sim.ts:166-169` (thread the returned deltas). *Found by TEA during test design.*
- **Improvement** (non-blocking): reading MILLI.MAC surfaced two SCROLC writers the TS comments did not name — `:503` CENTPC train-relay (DEC, down) and `:1812` player-death (STA 0, cancel). Both are in ml7-9 scope by owner ruling. Recorded so the wiring is known to be complete against the ROM, not against the TS. *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking, DONE): fixed the stale `core/scroll.ts:17-22` scope comment TEA flagged — it now records that the DDT halves shipped in ml4-4 (`ddtScrollDown`/`ddtScrollUp`) and are threaded by ml7-9, rather than "no core owner yet". Affects `plugins/millipede/src/core/scroll.ts` (done in this commit). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the `EnemyShootResult.scroll` field added here surfaces the SHOOT2 SCROLC delta only for beetle (-1) and mosquito (+1); the other five enemies leave it absent (→ 0). If a later story finds another creature whose kill scrolls the field, that adapter must set it too. Affects `plugins/millipede/src/core/enemies/contract.ts` and the per-enemy `shoot*` adapters. *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)

- **Acceptance criteria were DERIVED, not copied**
  - Spec source: sprint/epic-ml7.yaml (ml7-9 `acceptance_criteria: null`)
  - Spec text: the story title + the MILLI.MAC mainline order (JSR SCROLL :46)
  - Implementation: 9 ACs derived from the ROM (AC1 scrolc+mushCounts on GameState; AC2 per-frame consume; AC3 continuous arm; AC4 gate preserves-then-applies; AC5 the five SCROLC sources; AC6 death-cancel :1812; AC7 MUSH sink; AC8 DDT halves; AC9 no-strobe)
  - Rationale: no ACs existed; the ROM mainline is the authority for a wiring story
  - Severity: minor
  - Forward impact: Dev/Reviewer read the ACs from this session + the test docstrings, not the (empty) epic YAML field

- **The continuous-arm test assumes gate.centin derives from the live-segment count**
  - Spec source: MLSUB.MAC:1133-1135 (LDA X,CENTIN / CMP I,04)
  - Spec text: the arm needs CENTIN==4 — the ROM's connected-length register
  - Implementation: AC3 builds a 4-LIVE-segment train (`segments.slice(0,4)`) and expects the arm to fire; sim.ts today derives EnemyView.centin from `segments.filter(isLive).length`
  - Rationale: GameState has no separate CENTIN register; live-count is the natural, already-present derivation
  - Severity: minor
  - Forward impact: if Dev introduces a distinct CENTIN register, AC3's fixture must set it — flagged so a red AC3 is read as a contract choice, not a bug

- **Field geometry is asserted via the grey-re-entry fingerprint + scalars, not full byte-column pins**
  - Spec source: scroll.test.ts (the exhaustive SC-* byte-column geometry)
  - Spec text: the pure reducers' exact post-scroll bytes
  - Implementation: the wiring tests assert the SC-29 row-6 grey fingerprint across all columns + roster-immune scrolc/mushCounts, not whole-column `toEqual`
  - Rationale: the pure geometry is already pinned; a live roster can plant single cells, so a whole-field pin would be flaky. Fingerprint + scalars are roster-immune (enemy plants use a throwaway MushCounts)
  - Severity: minor
  - Forward impact: none — geometry regressions still fail scroll.test.ts

### Dev (implementation)

- **The scroll gate's `hitDdt` input is hardcoded `false`**
  - Spec source: MLSUB.MAC:1128-1130 (SC-9) — HITDDT skips the continuous arm
  - Spec text: a DDT that hit the player disarms the continuous scroll
  - Implementation: `scrollGate.hitDdt = false` in sim.ts; the HITDDT flag (set at :1805 when a DDT explosion kills the player) is not modelled on GameState
  - Rationale: no test exercises it, and the player-death path already zeroes SCROLC via the :1812 cancel (AC6), which is the observable effect that matters; a HITDDT register is scope beyond "wire the scroll"
  - Severity: minor
  - Forward impact: if a future story adds a HITDDT/auto-scroll-stop register, feed it into this gate; the arm would otherwise keep queuing a down-scroll during a DDT-death animation frame that the death-cancel already neutralises

- **The gate's `centin`/`segmentsRemaining` derive from the live-segment count**
  - Spec source: MLSUB.MAC:1131-1135 (SC-2/3/10/11) — DEAD and CENTIN registers
  - Spec text: the arm needs CENTIN==4 and DEAD != 0
  - Implementation: both are `segments.filter(isLive).length` (matching TEA's AC3 assumption); GameState has no separate CENTIN/DEAD register
  - Rationale: the live-count is already computed for the EnemyView and is the natural derivation; introducing dedicated registers is unrequired scope
  - Severity: minor
  - Forward impact: none for this story; a later story modelling the CENTIN reload cadence would supply a distinct value here

- **Two TEA test fixtures were corrected during GREEN, and one CENTPC test added**
  - Spec source: this session's tests (scroll-wiring.test.ts, TEA authored)
  - Spec text: AC4 asserted a marker cell survived a CONWAY-active frame; AC5 placed the killed enemy at the player position; AC5 had no CENTPC :503 test though the owner scoped it in
  - Implementation: AC4 now asserts the grey-re-entry fingerprint (a lone marker is killed by Conway underpopulation in the gated frame); AC5 seats the enemy mid-field under a pre-seeded shot (an enemy at the player both gets shot AND contacts → player death → :1812 cancels the scroll, masking the source); added a mutation-verified CENTPC re-lay test + control; removed an over-strict `rosterVacant` self-check (a deterministic reserved-slot spider spawn writes no field/count, and the cell-specific assertions already catch corruption)
  - Rationale: the fixtures measured the wrong thing or were masked by correct ROM behaviour; the CENTPC gap left owner-scoped code unpinned
  - Severity: minor
  - Forward impact: none — coverage is now complete against the five SCROLC writers

### Reviewer (audit)

- **TEA: ACs derived (epic YAML null)** → ✓ ACCEPTED: the ROM mainline is the correct authority for a wiring story; 9 derived ACs each map to a cited ROM mechanism.
- **TEA: gate.centin from live-segment count** → ✓ ACCEPTED: matches the already-present EnemyView derivation; no CENTIN register exists. Rule-checker #14 concurs the value is read at a single exit.
- **TEA: fingerprint + scalars over full byte-pins** → ✓ ACCEPTED: geometry is pinned in scroll.test.ts; roster-immune scalars are the right wiring observable.
- **Dev: hitDdt hardcoded false** → ✗ FLAGGED (round 1, now resolved): the comment overclaimed coverage — HITDDT has a second write site (:2060) unmodelled. Comment corrected to "unmodelled, not covered"; the register wiring is filed as **ml7-12**. The residual behavioural gap (the continuous arm can fire during a period the ROM suppresses) is MEDIUM and non-blocking — routed, not shipped silently.
- **Dev: gate.centin/segmentsRemaining from live count** → ✓ ACCEPTED: same as TEA's, faithful.
- **Dev: two TEA fixtures corrected + CENTPC test added in GREEN** → ✓ ACCEPTED: the corrections fixed real measurement bugs (conway-clobber, death-cancel-masking) and the CENTPC test is mutation-verified.

**Reviewer-found undocumented deviation (now resolved):**
- **conwayActive read POST-masterStep:** Spec (MILLI.MAC:46 before :49) reads CDONE before MASTER; the code read `conway.active` after `masterStep`, which can clear it mid-call — a one-frame-early scroll on the metamorphosis-completion frame. Not logged by Dev (the "immaterial" comment asserted the opposite). Severity: HIGH (fidelity). **Fixed** (snapshot pre-masterStep) + mutation-verified regression guard added.

## Sm Assessment

**Story:** ml7-9 — Wire `core/scroll.ts` field scroll into `stepGame`. 5pt, p3, epic ml7, tdd (phased). Assignee: Keith Avery.

**Premise verified against the current tree (not stale — no correction banner needed).** I measured every falsifiable claim in the description before setup:

- `plugins/millipede/src/core/scroll.ts` EXISTS (shipped by ml3-5). It exports the pure, byte-cited functions `scrollDispatch(scrolc, gate)`, `scrollDown(field, scrolc, rng)`, `scrollUp(field, scrolc)` plus the gate/timer constants (`SCROLL_TOP_ROW`, `SCROLL_BOTTOM_ROW`, `CONTINUOUS_SCROLL_*`, `GREY_*`), with a full unit suite at `tests/scroll.test.ts`.
- The subsystem is genuinely UNWIRED: `core/sim.ts` (the `stepGame` home) does not import scroll.ts and has zero scroll references. `scrollDispatch/scrollDown/scrollUp` are called by nothing outside scroll.ts's own tests. The `scrollDown:true`/`scrollUp:true` returns in `beetle.ts`/`mosquito.ts` are kill-result FLAGS, not calls to these functions.
- Integration point: `export function stepGame(state: GameState, input: GameInput): GameState` at `core/sim.ts:59`.
- Provenance confirmed: `sprint/epic-ml7.yaml:29` — ml6-2 (the stepGame orchestrator, merged PR #355) explicitly carved out "ml7-9 (scroll)" as remaining fidelity. "ml6-2 deferred the SCROLL half" is accurate. (`pf sprint story show ml6-2` returns "not found" because ml6-2 is completed/renumbered, not because the reference is wrong.)
- Accessibility AC has a precedent: ml6-2 baked "freeze-not-strobe", guarded by `tests/accessibility.test.ts` (epic-ml7.yaml:51). The "no full-screen strobe on scroll" AC should EXTEND that established pattern, not invent a new one.
- ROM cites (from scroll.ts): SCROLL @ MLSUB.MAC:1105, SCROLD @ :1149, SCROLU @ :1309; SCROLC counter @ MLDEF.MAC:372 (1=UP, -1=DOWN). The DDT halves of SCROLD/SCROLU (:1231-1295 / :1379-1399, SC-49/50) are noted in scroll.ts's header as ml4-4's work — the wiring must account for them.

**ACs were `null` in the epic YAML** — sm-setup DERIVED them into the context file (jt8-6/cp5-1 pattern). TEA owns finalizing/redlining them in RED; the derivation is grounded in the verified facts above.

**Sibling probes clean at setup:** no remote branch for ml7-9, no sibling `.session/` files. `origin/develop` had advanced (`70007d27..a79d58d4`) — the branch was cut from current develop. Merge gate clear (no open PRs). Claim pushed: commit `a4d299a1` (in_progress stamp + context) on `feat/ml7-9-wire-scroll-into-stepgame`, branch pushed to origin.

**This is core wiring — hold the pure core/shell boundary. No DOM in core.**

**Handoff → TEA (Tyr One-Handed):** write the failing RED tests that prove `stepGame` threads the scroll dispatch, consumes SCROLD/SCROLU deltas (including the DDT halves), keeps mushroom/MUSH counts consistent across an in-place byte scroll, and does not full-screen-strobe (extend `tests/accessibility.test.ts`).

## TEA Assessment

**Tests Required:** Yes
**Reason:** 5-pt wiring story; the ROM mainline defines exact behavior to pin.

**Test Files:**
- `plugins/millipede/tests/scroll-wiring.test.ts` — 18 wiring tests over the 9 derived ACs (RED-driving positives + differential controls). Pure geometry stays in `tests/scroll.test.ts`.

**Tests Written:** 18 tests covering 9 derived ACs. **Status:** RED — 13 failing (feature-absent), 5 passing (differential controls / standing guards).

**Scope (owner-ruled, expanded twice during setup):** Full threading — add `scrolc` + `mushCounts` to `GameState`; thread `scrollDispatch` → `scrollDown`+`ddtScrollDown` / `scrollUp`+`ddtScrollUp` into `stepPlay` (ROM mainline order: after kills/motion/restore, before the CDONE-gated `masterStep` at `sim.ts:203`); wire all FIVE ROM SCROLC writers — arm `:1140`, beetle kill `:2090`, mosquito kill `:2127`, CENTPC re-lay `:503` (at the `createMillipede` wave-start seam `sim.ts:214`), death-cancel `:1812`; feed `mushCounts` from scroll + `ddtScrollDown` + `ddtExplosionStep` deltas (absorbs the `sim.ts:169` ml7-2 TODO); `createGame` keeps its scatter count; accessibility no-strobe.

**Ground truth:** all expectations derived from `reference/original-source/millipede/` (MILLI.MAC mainline :26-49; MLSUB.MAC SCROLL :1113-1146; the SCROLC-writer sites), NOT from observing the current TS.

### Rule Coverage (lang-review/typescript.md)

| Check | Test(s) | Status |
|------|---------|--------|
| #14 derived edge at single exit | AC6 death-cancel; AC4 gate preserve-then-apply | failing |
| #18 self-checking fixtures | `rosterVacant` guards; kill tests assert `score` (kill landed) | driving |
| #26 no all-local-terms assertions | AC5 kill-vs-no-kill differential; removed a vacuous cadence-arithmetic test | driving |
| #27 gate waits in a mode the thing never appears | AC4 conway pause + open; AC3 arm phase/off-phase | failing |
| #29 magnitude not just ordering | AC3 armed@$1E vs off-phase; AC9 no per-frame cue | failing |

**Rules checked:** 5 of 5 applicable lang-review checks have coverage.
**Self-check:** 1 vacuous test found and removed (an AC9 test asserting `armFrames===1`, pure test-local arithmetic — lang-review #26); AC4's dead-player claim removed (ROM-contradicted AC6's death-cancel).

**RED verified:** `scroll-wiring.test.ts` 13 fail / 5 pass; full millipede project 13 fail / 1161 pass (no collateral redness); orchestrator suite 498/498; `npm run lint` clean.

**Handoff → Dev (Loki Silvertongue):** GREEN by adding the two `GameState` fields and threading the scroll subsystem per the scope above. The tests' docstrings carry the ROM cites; read `## Design Deviations → TEA` for the gate.centin assumption (AC3) and `## Delivery Findings → TEA` for the stale `scroll.ts:19-21` comment to fix and the `sim.ts:169` delta-threading. Hold the pure core/shell boundary — no DOM.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/millipede/src/core/game-state.ts` — `GameState` gains `scrolc` (SCROLC, MLDEF.MAC:372) + `mushCounts` (MUSH/MUSH+2); `createGame` keeps its previously-discarded scatter count and seeds `scrolc: 0`.
- `plugins/millipede/src/core/sim.ts` — the SCROLL wiring in `stepPlay`: `scrollQueued` accumulates the kill (`rs.scroll`) and CENTPC re-lay (`:503`) sources; the scroll block builds the `ScrollGate` from live state, runs `scrollDispatch` (the continuous arm `:1140` fires inside it), then `scrollDown`+`ddtScrollDown` / `scrollUp`+`ddtScrollUp`; every mush delta (scroll + DDT half + the now-threaded `ddtExplosionStep`) folds into `mushCounts`; `playerDied` zeroes `scrolc` (`:1812`). Placed after the wave logic, before bonus — mutually exclusive with `masterStep` via the CDONE gate, so ordering vs `masterStep` is immaterial.
- `plugins/millipede/src/core/enemies/contract.ts` — `EnemyShootResult.scroll?` (the SHOOT2 SCROLC delta).
- `plugins/millipede/src/core/enemies/beetle.ts`, `mosquito.ts` — the shoot adapters now surface the dropped `beetleKill.scrollDown` (-1) / `mosquitoKill.scrollUp` (+1) flags.
- `plugins/millipede/src/core/enemies/roster.ts` — `shootRoster` aggregates the winning branch's `scroll`.
- `plugins/millipede/src/core/scroll.ts` — corrected the stale DDT-halves scope comment (Delivery Finding, done).
- `plugins/millipede/tests/scroll-wiring.test.ts` — TEA's file; two fixtures corrected + a mutation-verified CENTPC test added (see Design Deviations → Dev).

**Tests:** 20/20 scroll-wiring green. Full millipede 1176/1176; all projects 16308/16308 (+1 todo, other games unaffected by the `EnemyShootResult`/`shootRoster` contract change); orchestrator 498/498; `npm run lint` clean; `node scripts/build-app.mjs millipede` builds. CENTPC relay mutation-verified (removing `scrollQueued -= 1` reddens exactly the CENTPC test, not its control).

**All five ROM SCROLC writers wired:** arm `:1140`, beetle `:2090`, mosquito `:2127`, CENTPC `:503`, death-cancel `:1812`.

**Branch:** feat/ml7-9-wire-scroll-into-stepgame
**PR:** 395

**Handoff:** To Reviewer (Heimdall) for code review.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (all suites green, 3 pre-existing TODOs, no debug code) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — compensated with a Reviewer mutation battery over the scroll wiring (7/9 caught; 2 survivors equivalent/redundant) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no try/catch or swallowed errors in the diff; Reviewer-verified the scroll block propagates nothing silently |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 4 (T1 high, T2/T3 med, T4 low), dismissed 0, deferred 0 — all fixed |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 | confirmed 3 (F1/F2 high, F3 med), dismissed 0 — all fixed |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — Reviewer checked: `EnemyShootResult.scroll?` readonly+optional, `shootRoster` `?? 0` aggregation sound (rule-checker #2/#4 concur) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — pure deterministic core, no I/O, no untrusted input, no secrets; N/A to this diff |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — Reviewer checked: the scroll block is single-exit, no dead code (rule-checker #14 concurs); the vacuous test ternary (T1) is the only over-complexity, fixed |
| 9 | reviewer-rule-checker | Yes | findings | 4 | confirmed 4 (2 = F1/F2 #17, 1 = T1 #26, 1 = R1 unguarded `mc!` #1), dismissed 0 — all fixed |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 8 confirmed (F1, F2, F3/T2, T1, T3, T4, R1, plus my own ddtExplosionStep-delta coverage note), 0 dismissed, 0 deferred — ALL resolved in-phase (round-1 rework committed).

## Reviewer Assessment

**Verdict:** APPROVED

Round-1 review found real issues (2 HIGH, several MED/LOW). ALL were confirmed by
independent subagents + my own verification, FIXED in-phase, and re-verified. No
Critical/High remains. This APPROVED verdict covers the fixed tree (commits
`7587d49b`, `0e632dc6`).

**Data flow traced:** a beetle/mosquito kill → `shootRoster` surfaces
`EnemyShootResult.scroll` (−1/+1) → `scrollQueued` in `stepPlay` → `scrolc =
state.scrolc + scrollQueued` (death-cancelled if `playerDied`) → `scrollDispatch`
gate (built from live state, `conwayActive` snapshotted pre-`masterStep`) →
`scrollDown`/`scrollUp` + the DDT halves mutate `state.field` and return deltas →
folded into `mushCounts` → returned on `GameState`. Every phase branch carries
`scrolc`/`mushCounts` via spread — no lang-review #14 leak (verified all 5 return
sites). Safe: pure, deterministic (seeded `@shared/rng` only), no I/O.

**Observations (round-1 findings, all resolved + standing VERIFIEDs):**

- `[DOC][RULE][HIGH→FIXED]` conwayActive was read POST-`masterStep`, which clears
  it mid-call — a one-frame-early scroll on the metamorphosis-completion frame vs
  the ROM (SCROLL :46 before MASTER :49). The "immaterial" comment was false.
  **Fixed** at `sim.ts:216` (pre-`masterStep` snapshot) with a mutation-verified
  regression guard (`scroll-wiring.test.ts` "CONWAY completing THIS frame").
- `[DOC][RULE][HIGH→FIXED]` `hitDdt: false` comment claimed the death-cancel
  "covers :1805/:1812", ignoring the second HITDDT write site :2060 (shot detonates
  a bomb). **Fixed** at `sim.ts:250` — comment now honest ("unmodelled"), register
  wiring filed as **ml7-12** (MEDIUM residual, routed not shipped silently).
- `[TEST][RULE][HIGH→FIXED]` the AC8 DDT-bank assertion had a vacuous
  `stillOn ? … : loBefore-1` branch (identity when false, lang-review #26).
  **Fixed** — split to pin the on-screen assumption + the step, no tautology.
- `[TEST][MED→FIXED]` the `ddtExploding` preserving gate (SC-7) was wired but
  untested. **Fixed** — added an AC4-style two-frame ddtExploding preserve test.
- `[TEST][MED→FIXED]` AC7 `top===3` was seed-incidental (a down-scroll plants top
  mushrooms on a 1-in-16 draw). **Fixed** — dropped the coupled assertion, kept the
  deterministic lower-region check.
- `[TEST][LOW→FIXED]` stale RED-phase optional-casts (`scrolcOf`/`mushCountsOf`) and
  an unguarded `mc!` (:363). **Fixed** — read `g.scrolc`/`g.mushCounts` directly now
  the fields are required.
- `[VERIFIED]` all five ROM SCROLC writers wired and mutation-caught — evidence:
  battery over `sim.ts` reddens a dedicated test for each of arm/beetle/mosquito/
  CENTPC/death-cancel (7/9 mutants caught; the 2 survivors are a redundant-but-ROM-
  faithful `playerDead` gate and an equivalent `?? 0`→`1` mosquito mutant).
- `[VERIFIED]` core purity boundary intact — evidence: `purity.test.ts` 49/49 green
  with the `sim.ts`/`game-state.ts` changes; no `Date.now`/`Math.random`/DOM.
- `[VERIFIED]` `mushCounts` threading is band-correct — evidence: `mushDelta`
  (`ddt.ts:232`) splits `row<0x0c`→lower / `row>=0x14`→top, identical to
  `MushCounts` (LOWER_MAX/TOP_MIN), so `ddtBoom`/scroll/ddt deltas fold correctly.

### Rule Compliance (lang-review/typescript.md)

Rule-checker enumerated all 30 checks across 56 instances. Post-fix state:
- **#1 type-safety escapes** — the flagged unguarded `mc!` and stale optional-casts
  are removed (T4/R1). No `as unknown as`, no `@ts-ignore`. COMPLIANT.
- **#4 `??` vs `||`** — `roster.ts` `x.scroll ?? 0` correct (scroll can be a valid 0
  or −1). COMPLIANT.
- **#14 derived edge at single exit** — scrolc/mushCounts/conwayActive all resolved
  at the single 9b SCROLL block. COMPLIANT.
- **#17 comments assert a re-run mechanism** — the two false comments (F1/F2) are
  corrected against MILLI.MAC/conway.ts; the other 7 citations verified verbatim.
  COMPLIANT.
- **#26 all-local assertion terms** — the vacuous DDT-bank branch (T1) is fixed.
  COMPLIANT.
- **#29 magnitude not ordering** — AC3 pins the exact 128-frame phase boundary
  (`0x1e` fires, `0x1d` does not). COMPLIANT.
- #2/#5/#12/#15/#18/#19/#21/#24 checked applicable-and-compliant; #3/#6/#7/#9/#10/
  #11/#13/#16/#20/#22/#23/#25/#27/#28/#30 not applicable to this diff.

### Devil's Advocate

Assume this is broken. The scroll wiring adds two entropy draws (`nextInt` ×2 for
`ddtScrollDown`) only on a down-scroll frame — a hostile reading is that this
desynchronises the shared RNG stream and silently changes every downstream
subsystem's randomness. Rebuttal: the ROM itself samples RND0/RND1 at SCROLD's DDT
half, so the draws are faithful, and the full 16,310-test cross-project suite plus
1178 millipede tests are green — no seed-replay fixture reddened, so nothing
depends on the pre-wiring stream in a way this breaks. Next: a confused maintainer
sees `hitDdt: false` and assumes the SC-9 arm-suppressor is intentionally disabled
forever; the corrected comment now says "unmodelled … follow-up ml7-12", so the gap
is documented, not silent. Next: the continuous arm can fire during a
DDT-bomb-hit window the ROM would suppress — real, but MEDIUM and routed to ml7-12,
and the arm requires a CENTIN==4 train at a 128-frame phase, so the window is
narrow. Next: `mushCounts` could underflow negative if more mushrooms are counted
off than exist — but the counter mirrors the ROM's own DEC/INC and is display/gate
state, not an index; no array access derives from it, so a transient wrong count
cannot corrupt memory. Next: a stressed input — an empty roster still spawns a
reserved-slot spider, which I confirmed writes nothing to the field the spawn frame
(spider.ts:104), so the cell-specific assertions hold. Next: `createGame`'s
`mushCounts` seed is the scatter count — if `musher` and the AC1 cross-check
disagreed, the count would be wrong at boot; AC1 recomputes it independently from
LOWER_MAX/TOP_MIN over the real field and asserts equality, so a seeding bug fails
loudly. Nothing survived as a blocking defect.

**Handoff:** To SM (Baldur) for finish-story.