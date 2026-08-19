---
story_id: df7-1
jira_key: df7-1
epic: df7
workflow: tdd
---
# Story df7-1: Phase machine core (PURE-first, the pm4/mc6 model)

## Story Details
- **ID:** df7-1
- **Jira Key:** df7-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df7-1-phase-machine-core
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-19T11:16:29Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-19T10:33:50Z | 2026-08-19T10:36:53Z | 3m 3s |
| red | 2026-08-19T10:36:53Z | 2026-08-19T10:50:09Z | 13m 16s |
| green | 2026-08-19T10:50:09Z | 2026-08-19T11:02:23Z | 12m 14s |
| review | 2026-08-19T11:02:23Z | 2026-08-19T11:11:39Z | 9m 16s |
| green | 2026-08-19T11:11:39Z | 2026-08-19T11:13:29Z | 1m 50s |
| review | 2026-08-19T11:13:29Z | 2026-08-19T11:16:29Z | 3m |
| finish | 2026-08-19T11:16:29Z | - | - |

## SM Assessment — Handoff → TEA (Leeloo), RED phase

**Verified premise (checked against the current tree at setup — use, don't re-derive):**
- `plugins/defender/src/core/phase.ts` does NOT exist yet — clean new-file story.
- df5-6 is `status: done`. Its `isGameOver(state)` lives at
  `plugins/defender/src/core/endgame.ts:34` and is already consumed by
  `plugins/defender/src/core/sim.ts` (`gameOver: isGameOver(score)` at sim.ts:194,214,299).
  df7-1 CONSUMES this play->death/game-over edge (AC2) — it does NOT re-decide it.
- Model to mirror: mc6-1 `state.ts` and pm4 `GamePhase` (pure-first split, Decision A).

**⚠ Contention flag (a sibling checkout is live):**
- `a-1` is in RED on df6-1 (same game, Defender *audio* epic). df6-1 creates
  `core/events.ts` and edits `core/sim.ts:219-266` (the `stepSim` wiring).
- df7-1's artifact is a NEW file `core/phase.ts` — no direct collision. But do NOT
  reach into the `sim.ts` stepSim wiring in this story; that seam is df6-1-owned.
  df7-1 ships the pure phase machine + its tests only. The shell/sim wiring of the
  phase machine is a later df7 story.

**Gate reminder (AC3):** every `src/core` phase constant (mainline order, timeouts)
must carry a `claims/*.json` entry byte-verified under the df1-1 citation gate — no
un-cited core constant. ROM anchors are in the context ACs (ST1 :1100, ST2 :1112,
HALLOF AMODE1.SRC:119, HALDIS :375, isGameOver DEFA7.SRC:1423).

**Test-first, before shell (AC1/AC4):** the transition fn is tested against synthetic
states before any wiring; `purity.test.ts` stays green; the machine owns no rAF/tick.

## TEA Assessment

**Tests Required:** Yes
**Reason:** df7-1 ships a new pure core module (`phase.ts`) — the spine of epic df7. Pure logic + a
citation-gated deliverable; both need tests before code (Decision A: tested before the shell wires it).

**Test Files:**
- `plugins/defender/tests/df7-1-phase.test.ts` — AC1/AC2/AC4: the `Phase` union + `advancePhase`
  MAINLINE dispatch (attract→setup→play→[pause]→death→game-over→attract), pure/seeded/clock-free.
  AC2 imports the REAL df5-6 `isGameOver` + df5-3 `score` model and pins that the `play` exit
  CONSUMES `isGameOver(men<0)` (game-over at men=-1, the death beat at men=0) — it does not re-decide it.
- `plugins/defender/tests/df7-1-identity.test.ts` — AC3: the mainline-order ROM citations
  (ST1, ST2, HALDIS, GAMEOV) each require a `glossary.md` row + a byte-verified `claims/*.json` entry
  under the df1-1 gate. Mirrors `df5-6-identity.test.ts`.

**Tests Written:** 21 tests (12 phase + 9 identity) covering all 4 ACs.
**Status:** RED (verified) — `df7-1-phase.test.ts` fails to collect with `Cannot find module
'../src/core/phase.js'` (feature absent, the clean RED signal); `df7-1-identity.test.ts` fails 8 / passes 4
(the 4 missing ST1/ST2/HALDIS/GAMEOV rows + claims are RED; the HALLOF anchor, the non-vacuity floor,
and the uncovered-citations sweep pass — proving the guard has teeth and is not vacuous).

### Rule Coverage

| Rule (typescript.md) | Test(s) | Status |
|------|---------|--------|
| #18/#19 population non-vacuity (fixture ≠ expectation) | `expectPopulated(MAPPINGS,5)` first; AC2 fixture-boundary guard pins men=-1/0 & isGameOver | failing (RED)/passing (guard) |
| #26 assertion terms all-local | AC2 asserts on real `isGameOver(createScore→loseMan)`, not test-locals | RED |
| #15/#25/#28 source-text guards anchored to the claim | identity uses `rowCites`(symbol+cite) + exact `file:line` claim membership, never a bare file grep | RED |
| #24 retirement/citation coverage | identity requires BOTH a glossary row AND a claim per mainline line (dossier + claims in step) | RED |
| AC4 mutation-tested transition (concrete next-phase, not a coverage check) | every edge `it` + the full-loop `it` assert `.toBe(<phase>)`; skipping death or not returning from game-over reddens | RED |
| purity (no rAF/clock/entropy in core) | armed `purity.test.ts` sweep auto-covers `phase.ts` on creation + frozen-input/determinism `it`s | armed |

**Rules checked:** 6 of the applicable lang-review rules have explicit test coverage (the rest are C/build/React rules not applicable to a pure logic module).
**Self-check:** 0 vacuous tests. Every `it` asserts a concrete next-phase or a byte/membership fact; the AC2 fixture-boundary test guards against the fixture drifting to always-true (lang-review #18).

**Handoff:** To Dev (Korben Dallas) for GREEN.

**What GREEN must ship:**
1. `plugins/defender/src/core/phase.ts` — the `Phase` union + `PHASES` + `PhaseSignals` + `advancePhase`
   exactly matching the RED contract (see the API deviation logged above). Pure/seeded/clock-free —
   NO numeric cadence constant (constant-free, like pm4-5). Cite the mainline states in `//` comments.
2. `docs/rom-study/glossary.md` rows for ST1, ST2, HALDIS, GAMEOV (HALLOF row already exists).
3. `docs/rom-study/claims/*.json` byte-verified entries: ST1 `DEFA7.SRC:1100`, ST2 `:1112`,
   HALDIS `AMODE1.SRC:375`, GAMEOV `ROMF8.SRC:337` — verbatim must match the vendored source (the
   `citations.test.ts` byte teeth enforce it). Suggested home: a new `19-phase.json` (or extend an
   existing claims file); verbatims to confirm from tool output at RED were e.g. ST1 `ST1\tLDA\tSTATUS`.
4. Do NOT touch `core/sim.ts` (a-1 owns the `stepSim` seam this sprint — see Delivery Findings).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/defender/src/core/phase.ts` (NEW) — the `Phase` union + `PHASES` + `PhaseSignals` +
  `advancePhase` MAINLINE dispatch. Pure, seeded, clock-free, CONSTANT-FREE (mirrors pm4-5; the
  cadences defer to df7-2..4). Consumes df5-6 `isGameOver` as the play→death/game-over edge.
- `plugins/defender/docs/rom-study/glossary.md` — 4 new lifecycle rows (ST1, ST2, HALDIS, GAMEOV)
  citing the mainline-order ROM lines.
- `plugins/defender/docs/rom-study/claims/19-phase.json` (NEW) — 5 byte-verified claims: PH-ST1
  (DEFA7.SRC:1100), PH-ST2 (:1112), PH-HALDIS (AMODE1.SRC:377), PH-HALL13 (:230), PH-GAMEOV
  (ROMF8.SRC:339). Verbatims lifted from the vendored 1981 source via tool output.
- `plugins/defender/tests/df7-1-identity.test.ts` — corrected HALDIS/GAMEOV claim lines to the true
  label lines (375→377, 337→339); see the Dev deviation.

**Tests:** GREEN — full defender project **822/822** passing (incl. the 21 df7-1 tests, the purity
sweep now auto-covering `phase.ts`, and the citations byte-gate over the 5 new claims). Repo-wide
`npm run lint` (tsc --noEmit) clean.
**Branch:** feat/df7-1-phase-machine-core (pushed, commit ddf2c5fe).

**Design decisions (all logged under Design Deviations):**
1. `death → setup` (respawn), not `death → game-over` — the men<0 decision is at the `play` exit
   (mirrors pm4-5), so `death` is the survivable death beat. (TEA-logged, carried into code.)
2. The full `advancePhase`/`PhaseSignals` API is the RED contract, lifted from pm4-5. (TEA-logged.)
3. HALDIS/GAMEOV cited at their LABEL lines (377/339), not the story's section-header comments
   (375/337) — ROM wins; coherent with every other glossary row citing its symbol's definition.

**Note for Reviewer:** `phase.ts` is UNWIRED by design (Decision A — tested before the shell wires
it). It changes no runtime; `core/sim.ts` was deliberately NOT touched (sibling `a-1` owns the
`stepSim` seam this sprint — see Delivery Findings). The comment_analyzer is worth running: this
diff carries ROM citations in both the module header and the claims/glossary.

**Handoff:** To Reviewer (Jean-Baptiste Emanuel Zorg) for review.

### Dev rework — round 1 (review finding [LOW/DOC])
Fixed the single confirmed finding: `df7-1-phase.test.ts:32` header comment now cites the label lines
`AMODE1.SRC:377` / `ROMF8.SRC:339` (was 375/337). Swept the whole df7-1 file set for any other stale
`:375`/`:337` — the only remaining occurrences are the INTENTIONAL explanatory notes in
`df7-1-identity.test.ts:23,25` documenting the story's off-by-2. Re-verified: `df7-1` 34/34 green,
`npm run lint` clean. Commit d4a8e200, pushed. No code/logic changed — comment-only. Handoff back to Reviewer.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | 822/822 defender, lint clean, citations byte-gate green |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (stale citation, phase.test.ts:32) — spawned MANUALLY (disabled in settings) for this citation-heavy diff |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | confirmed 0 — pure fn, no I/O, no injection surface |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | confirmed 0 across 30 checks; live mutation tests + TS2366 exhaustiveness verified |

**All received:** Yes (enabled: preflight, security, rule_checker; + comment_analyzer spawned manually).

**Cycle: 1**

Round-2 re-review method: **targeted re-verification of the single characterized round-1 finding**, not a fresh generalist sweep. The `[DOC]` stale citation at `df7-1-phase.test.ts:32` was probed directly — line 32 now cites `AMODE1.SRC:377` / `ROMF8.SRC:339`, byte-verified against the vendored labels (`HALDIS CLR HSRFLG` @377, `GAMEOV ORCC #$90` @339); the whole df7-1 file set was swept for other stale `:375`/`:337` (none but the intentional explanatory notes); full defender suite 822/822 green; `git diff` on all reviewed source empty. The round-1 `[SEC]`/`[RULE]`/preflight results stand — a 2-character comment correction cannot introduce a new violation in their domains.

**Working-tree audit:** `pf reviewer audit-tree` exited non-zero, flagging `sprint/epic-df7.yaml` DIRTY. Investigated: the sole change is the `status: in_progress → in_review` phase-transition stamp (legitimate workflow state, NOT a mutation-testing artifact). Every reviewed SOURCE file (phase.ts, both tests, glossary.md, claims/19-phase.json) is pristine — `git diff` empty; rule_checker confirmed it reverted its own mutation-test edits to phase.ts/glossary. Review surface clean; the audit tripped on a benign status stamp. Proceeded.

## Reviewer Assessment

**Verdict:** REJECTED — 1 confirmed finding (stale ROM citation; low-severity but a must-fix in this citation-fidelity repo)

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [LOW] | `[DOC]` Stale ROM citation: header comment cites `AMODE1.SRC:375` (HALDIS) and `ROMF8.SRC:337` (GAMEOV) — the section-header comment lines, not the labels. The labels are at 377/339, and every other file in the diff (phase.ts header, glossary rows, claims/19-phase.json, the sibling df7-1-identity.test.ts) was corrected — only this one comment was missed. | `plugins/defender/tests/df7-1-phase.test.ts:32` | Change `(AMODE1.SRC:375)` → `(AMODE1.SRC:377)` and `(ROMF8.SRC:337)` → `(ROMF8.SRC:339)`, matching the corrected citations everywhere else in the diff. |

**Why REJECTED for a LOW finding:** no Critical/High issues exist, so this does not block on the raw severity rubric. But this repo's entire discipline is ROM-citation fidelity (the df1-1 gate, the jt8-6 "reviews land on prose" lesson), and approving would ship a known-false citation that the byte-gate cannot catch (the byte-gate only checks claims, and the claims are all correct). The fix is one line; forcing it via rework is cheaper than a shipped stale citation. Route: doc-only → green rework → Dev.

### Rule Compliance (typescript.md lang-review, 30 checks)

Enumerated every type/function/field/test against every applicable check (backed by rule_checker's independent 30/30 pass with live mutation tests):
- **#1 type-safety:** no `as any`/ts-ignore/non-null anywhere. The one `is` predicate (identity.test.ts:113) has runtime `'line' in s` — compliant.
- **#2 interface:** `PhaseSignals` 8/8 fields `readonly`; no `Record<string,any>`/`Function`/`object`.
- **#3 exhaustiveness:** `advancePhase` switch has no `default`, but the explicit `Phase` return type makes non-exhaustiveness a TS2366 compile error (verified) — matches the pac-man pm4-5 precedent. Compliant, not a violation.
- **#4 null/undefined:** no `??`/`||` in the diff; optional booleans read via direct truthy ternary — correct for `boolean|undefined`.
- **#5 modules:** `.js` extensions on all src-relative imports; `import { type Phase, type PhaseSignals }`.
- **#14 edge-in-one-branch:** the play→death/game-over ternary and death-outranks-pause ordering live in the single `play` branch, at its two returns — mutation-tested (reorder reddens).
- **#15/#18/#19/#25/#26/#27:** the identity guards anchor to unique single glossary rows (`rowWindows` filters to `|`-rows; each symbol matches exactly one row), `expectPopulated` floors precede every `.every` sweep, fixtures use the real `isGameOver`/`loseMan` reducers (not literals), mutation-tested (ST1 line 1100→9999 reddens both rowCites and the sweep).
- **#17 comment-citation accuracy:** all claims + phase.ts-header + identity-test citations byte-verified against the vendored source. **The ONE exception is the finding above (phase.test.ts:32).**
- Checks #6/#7/#9/#10/#11/#12/#13/#16/#20/#21/#22/#23/#24/#28/#29/#30: N/A (no React/async/config/user-input/numeric/retirement/rewrite surface in this pure-core diff).

### Observations (≥5)

- `[VERIFIED]` Purity — `phase.ts` imports nothing and touches no clock/RNG/global; the armed `purity.test.ts` src/core sweep now auto-covers it and is green. Evidence: `phase.ts:1-89` has zero imports; preflight ran the sweep.
- `[VERIFIED]` AC2 consumption not re-decision — `PhaseSignals` carries a boolean `gameOver` (the `isGameOver` result), no `men` field; `advancePhase` never recomputes men<0. Evidence: `phase.ts:55-57,80`; the AC2 test computes `isGameOver(loseMan4(createScore))` and passes the result.
- `[VERIFIED]` death→setup and game-over→attract are ROM-faithful — Evidence: `DEFA7.SRC:1412` `PLE02 ... JMP PLSTRT` (:1208 `*PLAYER START PROCESS`) is the respawn; `PLE2 ... STATUS=$FF ... PLE3 JMP ATTR` (:1085) is the terminal→attract.
- `[VERIFIED]` AC4 mutation-tested transitions — every edge test asserts a concrete `.toBe(<phase>)`, not a coverage check; rule_checker reddened the suite by reordering the play branch. Evidence: `df7-1-phase.test.ts` loop + edge `it`s.
- `[LOW] [DOC]` Stale citation at `df7-1-phase.test.ts:32` (the finding above).
- `[VERIFIED]` No sim.ts contact — the a-1-owned `stepSim` seam is untouched; changed files are phase.ts + tests + glossary + claims only. Evidence: `git diff --name-only develop...HEAD`.
- `[NOTE]` `pause` is an emulator-convenience modal (play⇄pause) with no bespoke ROM citation — consistent with mc6's documented `togglePause` repurpose; acceptable for df7-1 (the story lists "(plus pause)" without a mainline-state citation requirement). Not a finding.

### Devil's Advocate

Suppose this code is broken. The most dangerous surface is the `gameOver` signal: `advancePhase` trusts a caller-supplied boolean to distinguish a survivable death from a terminal one. If a future wiring story (df7-2+) forgets to pass `gameOver: isGameOver(score)` on the death frame, every death — including the men<0 terminal one — routes to `death → setup → play`, and the game becomes UNLOSABLE: the player respawns forever and never reaches game-over or the hall of fame. This is a real forward-risk, but it is not a df7-1 defect: df7-1 is the pure machine, explicitly unwired (Decision A), and the "no gameOver signal ⇒ survivable death" behavior is deliberately pinned by a test as the documented contract. The mitigation belongs in the wiring story, and the Delivery Finding + the JSDoc on `gameOver` flag it. A second worry: the `death → setup` edge reuses `setup` for both game-start and per-ship respawn, so a bug in df7-2's `setup → play` cadence would corrupt BOTH paths at once — a wider blast radius than two separate beats. Accepted as faithful (the ROM's `PLE02 JMP PLSTRT` does exactly this reuse) but worth a note for df7-2's test design. A confused reader worry: the stale `375/337` citation at test:32 could mislead someone into "fixing" the correct 377/339 elsewhere to match — which is precisely why a stale citation in a citation-fidelity repo is not a pure nit and why I reject on it. Filesystem/malicious-input angles are moot: the module is a pure total function over a boolean DTO, security confirmed it cannot throw, mutate, or escape the six-phase domain even under a frozen or prototype-polluted signals object. The switch's missing `default` cannot produce `undefined` at runtime without an upstream `as any`, which does not exist in this diff and would fail lint. Net: one real must-fix comment defect; no correctness, security, or test-integrity flaw.

**Handoff:** Back to Dev for the one-line citation fix (green rework).

## Reviewer Assessment

**Verdict:** APPROVED (re-review round 2; supersedes the round-1 REJECTED verdict)

**Round-1 finding resolved.** `df7-1-phase.test.ts:32` now reads `(AMODE1.SRC:377)` / `(ROMF8.SRC:339)` —
byte-verified against the vendored labels: `HALDIS CLR HSRFLG` @ `AMODE1.SRC:377`, `GAMEOV ORCC #$90` @
`ROMF8.SRC:339`. Swept the whole df7-1 file set for any other stale `:375`/`:337` — the only remaining
occurrences are the INTENTIONAL explanatory notes at `df7-1-identity.test.ts:23,25`, which document the
story's off-by-2 by design (correct, not stale).

**Regression check.** Comment-only change (2 chars, commit d4a8e200). Full defender suite **822/822**
green, df7-1 34/34, `npm run lint` clean. `git diff` on every reviewed SOURCE file is empty — no logic
touched. Working-tree audit: only `sprint/epic-df7.yaml` dirty (review-verdict + status tracking stamps
written by pf commands), not a source mutation — same benign case as round 1; reviewed source pristine.

**Scope of re-review.** Targeted re-verification of the single round-1 `[LOW/DOC]` finding. Round 1's four
specialists (preflight, security, rule_checker, comment_analyzer) cleared the code, tests, and all
citations; a 2-character comment correction cannot introduce a new violation in any of their domains, so
no re-spawn — the round-1 Subagent Results table stands.

**Subagent findings (all enabled specialists, round 1 — re-verified standing for cycle 1):**
- `[SEC]` reviewer-security — CLEAN: `advancePhase` is a total pure function, no I/O/eval/dynamic-import, cannot throw or escape the six-phase domain under a frozen/prototype-polluted `PhaseSignals` (`phase.ts:72`).
- `[RULE]` reviewer-rule-checker — CLEAN: 30/30 lang-review checks pass, live mutation-tested (reordering the play branch reddens the test; corrupting ST1's cited line reddens rowCites + the sweep; TS2366 confirms switch exhaustiveness).
- `[DOC]` reviewer-comment-analyzer — 1 finding (stale citation, `df7-1-phase.test.ts:32`), now FIXED (377/339) and re-verified in cycle 1.
- preflight — 822/822 defender, lint clean, citations byte-gate green.

**Data flow traced:** caller-supplied `gameOver` boolean → `advancePhase` play-exit (game-over vs death) —
unchanged and safe (no `men` re-derivation).
**Pattern observed:** pure switch-dispatch phase machine, pm4-5-idiomatic, at `phase.ts:72`.
**Error handling:** total pure function; a frozen/hostile `PhaseSignals` cannot throw or escape the six-phase domain (security-confirmed).
**Handoff:** To SM for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Improvement** (non-blocking): df7-1 is CONSTANT-FREE by design (mirrors pm4-5) — the
  setup/death/game-over cadences defer to df7-2..4, so AC3's "no un-cited constant" is met by
  introducing none. GREEN adds no numeric literal to `phase.ts`; the only AC3 work is dossier rows
  + `claims/*.json` entries for the mainline ORDER. Affects `plugins/defender/docs/rom-study/glossary.md`
  and `plugins/defender/docs/rom-study/claims/` (add ST1 DEFA7.SRC:1100, ST2 :1112, HALDIS
  AMODE1.SRC:375, GAMEOV ROMF8.SRC:337 — HALLOF AMODE1.SRC:119 is already claimed). *Found by TEA during test design.*
- **Conflict** (non-blocking): sibling checkout `a-1` is in RED on df6-1 and edits `core/sim.ts:219-266`
  (`stepSim` wiring). df7-1 must NOT touch that seam — Decision A ships the pure `phase.ts` + tests only;
  the sim/shell wiring of the phase machine is a later df7 story. Affects `plugins/defender/src/core/sim.ts`
  (leave it alone this story). *Found by TEA during test design.*

### Dev (implementation)
- No new upstream findings during implementation. Confirmed the TEA findings held: `phase.ts` was
  built without touching `core/sim.ts` (the a-1-owned `stepSim` seam) and introduced no numeric
  constant. One ROM-precision correction surfaced (HALDIS/GAMEOV label lines vs the story's
  section-header citations) — handled in-story and logged under Design Deviations, not deferred.
  *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (non-blocking): a stale ROM citation slipped through the Dev citation-correction sweep — the
  `df7-1-phase.test.ts:32` header comment still cites `AMODE1.SRC:375` / `ROMF8.SRC:337` (the section-header
  comments), while the labels are at 377/339 and every other file in the diff was corrected. Affects
  `plugins/defender/tests/df7-1-phase.test.ts` (line 32 → change to 377/339). Caught by comment_analyzer,
  which is DISABLED in `workflow.reviewer_subagents` on this project — I spawned it manually because this
  is a citation-heavy ROM-port diff; consider re-enabling it for df7. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **Death edge routes to `setup` (respawn), not directly to `game-over`**
  - Spec source: context-story-df7-1.md, story title (the spine) + AC2
  - Spec text: the mainline spine reads `attract->setup->play->[pause]->death->game-over->attract`
    (an ordering that lists `death` immediately before `game-over`); AC2 says "the play->death/game-over
    edge CONSUMES df5-6 isGameOver ... enters game-over exactly when men<0 and not otherwise."
  - Implementation: the tests put the game-over DECISION at the `play` exit (mirroring pm4-5's
    `playing -> dying|game-over` split): `play` + `playerDied` + `isGameOver` -> `game-over`, else
    -> `death`; and `death` + `deathComplete` -> `setup` (the surviving-ship respawn, mirroring
    pm4-5's `dying -> ready`). So `death` never routes to `game-over` — the men<0 terminal case
    leaves `play` directly, and `death` is the survivable death beat.
  - Rationale: AC2 explicitly locates the isGameOver decision on the edge OUT of `play`, and the
    epic names "the pm4/mc6 model" whose `phase.ts` decides at the play exit. Treating the spine's
    "death->game-over" as a literal required edge would contradict AC2 (it would move the men<0
    decision to the death exit). The spine is a lifecycle ORDERING (as pm4's own `PHASES` is), not
    an edge list. `death->setup` reuses df7-2's `setup->play` start path for respawn, minimising
    hostages for later stories.
  - Severity: minor
  - Forward impact: df7-2 (setup->play start) owns `setup`'s cadence for BOTH game-start and respawn;
    the death-animation window (df7-x) owns `deathComplete`. If a later story wants a distinct
    respawn beat separate from `setup`, it refines this edge — the loop test in df7-1-phase.test.ts
    pins the current `death->setup` shape and will redden, which is the intended signal.
- **The full `advancePhase`/`PhaseSignals` API surface is fixed by the RED tests**
  - Spec source: context-story-df7-1.md, AC1
  - Spec text: "plugins/defender/src/core/phase.ts defines a Phase union ... and a PURE, seeded,
    clock-free MAINLINE transition function."
  - Implementation: the tests fix the exact contract Dev must implement — `export type Phase`,
    `export const PHASES`, `export interface PhaseSignals` (readonly optional booleans:
    startRequested / setupComplete / pauseRequested / resumeRequested / playerDied / gameOver /
    deathComplete / overTimeout), `export function advancePhase(phase, signals): Phase`.
  - Rationale: TDD RED must name a concrete API for the transition assertions to compile; the shape
    is lifted verbatim from pm4-5's `phase.ts` (the epic-named sibling) so it stays idiomatic across
    the fleet.
  - Severity: minor
  - Forward impact: later df7 stories add fields to `PhaseSignals` (readonly-optional keeps that
    non-breaking) and wire `advancePhase` into the sim; the signature is the stable spine.

### Dev (implementation)
- **HALDIS / GAMEOV cited at their label lines (377 / 339), not the story's :375 / :337**
  - Spec source: context-story-df7-1.md, story title + AC3 (and the RED df7-1-identity.test.ts)
  - Spec text: the story/epic cite "HALDIS attract :375" and "GAMEOV :337"; the RED identity test
    (as TEA authored it) put `claimLines: [375]` / `[337]`.
  - Implementation: the vendored source (tool output) places the `HALDIS` label at `AMODE1.SRC:377`
    (`HALDIS CLR HSRFLG`) and `GAMEOV` at `ROMF8.SRC:339` (`GAMEOV ORCC #$90`); lines 375 and 337 are
    the `*HALL OF FAME DISPLAY` and `* GAME OVER-` **section-header comments** two lines above each
    label. GREEN cites the LABEL lines in the glossary rows, the `claims/*.json` (19-phase.json) and
    the corrected identity test (`claimLines: [377]` / `[339]`), and the `phase.ts` header comment.
  - Rationale: ROM is canonical (the `citations.test.ts` byte teeth re-open the cited line and must
    match the label verbatim). Every other glossary row cites the line where its symbol is DEFINED
    (e.g. `HALLOF` → `AMODE1.SRC:119`); a row keyed `HALDIS`/`GAMEOV` citing a comment that does not
    contain that symbol would be incoherent. The story's :375/:337 were approximate — the author
    pointed at the descriptive section header rather than the label two lines below.
  - Severity: minor
  - Forward impact: none — the concept (attract display / game over) is unchanged; only the cited
    line is 2 lines more precise. df7-4 (game-over→attract) and df7-3 (attract) inherit the accurate
    HALDIS/GAMEOV citations.

### Reviewer (audit)
- **Death edge routes to `setup` (respawn)** → ✓ ACCEPTED by Reviewer: not merely a pm4 mirror — it is
  ROM-faithful. The vendored player-death path routes the survivable-death branch `PLE02` (DEFA7.SRC:1412)
  to `INC PDFLG` / `JMP PLSTRT`, i.e. back through the `*PLAYER START PROCESS` (PLSTRT, DEFA7.SRC:1208) —
  exactly the setup/start sequence `death → setup` models. The terminal branch `PLE2` sets `STATUS=$FF`
  then `PLE3 JMP ATTR` (attract, DEFA7.SRC:1085), corroborating `game-over → attract`.
- **Full `advancePhase`/`PhaseSignals` API is the RED contract** → ✓ ACCEPTED by Reviewer: lifted from
  pm4-5, idiomatic across the fleet; `PhaseSignals` fields are all readonly-optional so later df7 stories
  extend it non-breakingly. rule_checker mutation-tested the play-branch ordering (reorder reddens the test).
- **HALDIS/GAMEOV cited at label lines 377/339, not the story's 375/337** → ✓ ACCEPTED by Reviewer: ROM
  wins; independently byte-verified (375=`*HALL OF FAME DISPLAY` header, label HALDIS=377; 337=`* GAME OVER-`
  header, label GAMEOV=339). Coherent with every other glossary row citing its symbol's definition.
  **Caveat:** the correction was applied everywhere EXCEPT the `df7-1-phase.test.ts:32` header comment —
  see the REJECTED finding below.
## Impact Summary (df7-1 — APPROVED, 2-round review)

**Shipped:** the pure Defender cabinet phase machine — the spine of epic df7.

- `plugins/defender/src/core/phase.ts` (NEW) — `Phase` union (attract|setup|play|pause|death|game-over),
  `PHASES`, `PhaseSignals` (8 readonly-optional boolean signals), `advancePhase(phase,signals): Phase`
  MAINLINE dispatch. Pure/seeded/clock-free, CONSTANT-FREE (cadences defer to df7-2..4). Mirrors pm4-5.
- 21 tests: `df7-1-phase.test.ts` (12 — the lifecycle loop + every edge; AC2 consumes the real df5-6
  `isGameOver(men<0)`, AC4 mutation-resistant `.toBe(<phase>)` edges) and `df7-1-identity.test.ts` (9 —
  ROM citation coverage for ST1/ST2/HALDIS/GAMEOV under the df1-1 gate).
- 4 glossary rows + `claims/19-phase.json` (5 byte-verified claims: PH-ST1 DEFA7.SRC:1100, PH-ST2 :1112,
  PH-HALDIS AMODE1.SRC:377, PH-HALL13 :230, PH-GAMEOV ROMF8.SRC:339).

**Evidence:** full defender suite 822/822, `npm run lint` clean, citations byte-gate 28/28.

**Review:** 2 rounds. Round 1 REJECTED on one [LOW/DOC] finding — a stale citation at
`df7-1-phase.test.ts:32` (375/337 section-headers vs the 377/339 labels), caught by comment_analyzer
(manually spawned; it is DISABLED in `workflow.reviewer_subagents` — recommend re-enabling for df7).
Round 2 APPROVED after the one-line fix (commit d4a8e200), byte-verified, no regression.

**ROM-faithfulness confirmed:** the `death→setup` respawn matches `PLE02 … JMP PLSTRT` (DEFA7.SRC:1412→1208);
`game-over→attract` matches `PLE2 … STATUS=$FF … PLE3 JMP ATTR` (:1085).

**Forward:** df7-2 wires `advancePhase` into `core/sim.ts` (respecting a-1/df6-1's `stepSim` seam) and MUST
pass `gameOver: isGameOver(score)` on death frames — omitting it makes the game unlosable (the machine's
documented no-`gameOver`-signal contract routes every death to the survivable beat).
