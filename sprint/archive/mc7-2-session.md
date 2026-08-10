---
story_id: "mc7-2"
jira_key: "mc7-2"
epic: "mc7"
workflow: "tdd"
---
# Story mc7-2: Name-entry 'entry' phase + initials buffer in core, reusing @shared/name-entry: a qualifying score on phase over routes to entry; stepNameEntry drives the 3-char initials buffer over the ROM charset; commit inserts into the table then returns to attract/over. Slots into mc6-1's phase machine. REV-01 W3DSUP.MAC:4064 TAKE INITIALS

## Story Details
- **ID:** mc7-2
- **Jira Key:** mc7-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** none
- **PR:** none

<!-- Code PR #199 (feat/mc7-2-name-entry-phase-initials-buffer → develop) was created
     and MERGED by SM (state: MERGED, 2026-08-10T13:01:03Z) after resolving the
     origin/develop drift (mc6-4 attract refactor). Branch/PR set to 'none' to affirm
     the code landing is already handled; this finish does bookkeeping only. -->


## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-10T12:52:34Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T10:25:41Z | 2026-08-10T10:29:02Z | 3m 21s |
| red | 2026-08-10T10:29:02Z | 2026-08-10T10:43:55Z | 14m 53s |
| green | 2026-08-10T10:43:55Z | 2026-08-10T10:57:32Z | 13m 37s |
| review | 2026-08-10T10:57:32Z | 2026-08-10T11:14:23Z | 16m 51s |
| green | 2026-08-10T11:14:23Z | 2026-08-10T11:20:19Z | 5m 56s |
| review | 2026-08-10T11:20:19Z | 2026-08-10T12:52:34Z | 1h 32m |
| finish | 2026-08-10T12:52:34Z | - | - |

## SM Assessment

**Setup — mc7-2 (5pt, tdd, missile-command / mc7 epic).** Board was clear on arrival:
no `mc7-2` remote branch (only the merged `mc7-1`), no sibling session held it
(`a-1`=mc6-4, `a-2`=pm4-4). Story is genuinely free.

Story YAML carried `description: null` and `acceptance_criteria: null`, so ACs were
derived from the title and recorded in the context file. Before accepting the spec I
verified its three load-bearing dependencies against the current tree — all hold, so
they are stated as fact (not risks) in the context:
- **mc6-1 DONE** — phase machine in `plugins/missile-command/src/core/state.ts`,
  `Phase = play|between|over|attract|setup|pause`, pure `nextPhase` MAINLINE dispatch.
  This story adds `entry` on the `over -> attract` seam, qualify-gated.
- **`@shared/name-entry.stepNameEntry`** exists at `src/shared/name-entry.ts:22` — reuse.
- **mc7-1 DONE** — `plugins/missile-command/src/core/highscore.ts` exports
  `qualifiesForHighScore` + `insertHighScore` (commit target).

`sm-setup` produced a bare stub context (`pf context create`) and omitted `**Repos:**`
from the session — both corrected by SM: `**Repos:** arcade` added, context rewritten
with verified deps + ROM ground truth (`W3DSUP.MAC:4064 TAKE INITIALS`) + derived ACs.
Story stamped `in_progress` (sm-setup left it `backlog`). Claim committed + pushed on
`feat/mc7-2-name-entry-phase-initials-buffer` so the sibling branch probe lights up.

**Routing:** tdd is phased → hand off to TEA (Han Solo) for RED. No blockers.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 5pt TDD feature — new `'entry'` phase + pure initials buffer in core.

**Test Files:**
- `plugins/missile-command/tests/mc7-2-name-entry.test.ts` — 39 tests over 6 AC groups
  (buffer length, over→entry routing, `stepNameEntry` buffer, commit-insert, abort/timeout,
  citation discipline). Uses the fleet variable-specifier dynamic-import loader (cf.
  `start-of-game.test.ts`) so it reddens on FEATURE absence and `tsc --noEmit` stays green.

**Tests Written:** 39 tests covering 6 AC groups (AC-A..AC-F).
**Status:** RED — verified via testing-runner: mc7-2-name-entry.test.ts **39 failed / 0 passed**;
rest of missile-command **1119 passed / 0 failed** (no regressions). tsc green.

**RED contract handed to Dev (Yoda):**
- `state.ts`: add `'entry'` to the `Phase` union.
- `game.ts` / `GameState`: `highScores: readonly MissileCommandHighScore[]` (seed `DEFAULT_HIGH_SCORES`)
  + `initials: string` (seed `''`); seed both in `createGame`.
- `MC_INITIALS_LEN = 3` (`// claim MC-INITIALS-LEN`, W3DSUP.MAC:4060).
- `enterNameEntry` (over+qualify→entry), `stepInitials` (`stepNameEntry` over A–Z, cap 3),
  `commitNameEntry` (insert→attract), `abortNameEntry` (attract, no insert).
- Claims to file: **MC-INITIALS-LEN** (:4060), **MC-INITIALS-CHARSET** (:4128–:4158),
  **MC-ENTRY-ABORT** (:4076 start-switch / :4086–:4088 timeout).

### Rule Coverage

Rubric = `.pennyfarthing/gates/lang-review/typescript.md` (+ project core/shell purity & citation gates).

| Rule | Test(s) | Status |
|------|---------|--------|
| Purity: core stays clock/entropy/DOM-free | reused `purity.test.ts` src/core sweep (bites new game.ts on GREEN) + AC-B/-D "is pure, no mutate" | pending GREEN |
| Reuse-first: no re-implemented buffer | AC-C "is exactly the @shared/name-entry reducer" (parity vs `stepNameEntry`) | failing |
| Citation discipline: new constants carry claims | AC-F (3 claims committed + `{id,symbol,value,meaning,source}` shape) | failing |
| `?? ` vs `||` on 0/'' (buffer length / score) | AC-A (len 3), AC-C cap-at-3, AC-B non-qualifying score 100 (falsy-adjacent boundary) | failing |
| `readonly` on table params not mutated | AC-D/-E "does not mutate the input table" | failing |
| No `as unknown as T` double-cast bypass | loader uses single casts after `typeof` guards; `stateWith` single `as St` | n/a (self-applied) |
| Exhaustive phase handling (no leak outside 'entry') | AC-B/-C/-D/-E each assert non-target phases → UNCHANGED | failing |

**Rules checked:** the applicable TS/purity/citation rules above have test coverage; input-mapping rules (O-7b) are deferred shell scope.
**Self-check:** 0 vacuous tests — every test asserts a concrete value/transition; no `let _ =`, no `assert(true)`, no always-None checks. Removed both `as unknown as` double-casts flagged by the TS checklist.

**Handoff:** To Dev (Yoda) for GREEN implementation.

## Dev Assessment

**Status:** GREEN — full missile-command suite **1159/1159 passing** (65 files), `tsc --noEmit` clean.
mc7-2-name-entry.test.ts: all **39** story tests green.

**Files Changed:**
- `plugins/missile-command/src/core/state.ts` — added `'entry'` to the `Phase` union (SETUP-family via the existing `stateCode` default).
- `plugins/missile-command/src/core/game.ts` — `GameState` gains `highScores` (mc7-1 ladder, seeded to `DEFAULT_HIGH_SCORES` in `createGame`, carried across restart) + `initials`; `MC_INITIALS_LEN = 3`; the four pure transitions `enterNameEntry` / `stepInitials` / `commitNameEntry` / `abortNameEntry` (reuse `@shared/name-entry.stepNameEntry`).
- `plugins/missile-command/docs/rom-study/claims/name-entry.json` — the 3 claims (LEN :4060 value 3, CHARSET :4128 value 26, ABORT :4076 kind-tag `cite`), verbatim generated byte-exact from source; `check-citations.mjs` verifies all 216.
- `plugins/missile-command/tests/citations-source.test.ts` — registered `INTLHS`/`INITCSET` in DERIVED + a mc7-2 consistency block (see Dev deviation #2).

**Approach:** minimal transitions mirroring mc6-2's `startGame` (GameState→GameState) and joust's pure name-entry verbs. Kept every digit-bearing citation in `//` line comments (the `[[mc-citations-jsdoc-leak]]` rule) — one slip in a state.ts JSDoc (`:4064`) was caught by the AC3 guard and moved out.

**Gates:** purity (core clock/entropy-free) green; citations byte-check + value re-derivation green; un-cited-literal guard green. No `as any` / no double-casts in source.

**Handoff:** To Reviewer (Obi-Wan) for code review.

### Dev Rework — round 1 (Reviewer REJECTED, doc/claim integrity)

Addressed all 4 blocking findings; no logic change, suite stays 1159/1159, tsc clean, 216 citations verified.
- **[MEDIUM] MC-INITIALS-CHARSET meaning corrected** (`name-entry.json`): fixed the reversed GETINI wrap direction — `LDA I,26.` fires on the IFMI (branch-on-minus) UNDERFLOW arm and wraps UP to 26; the `CMP I,27./IFCS/LDA I,0` ELSE arm wraps ≥27 back down to 0 — and the 26-vs-27 code count (27 codes: 0-25 = A-Z, 26 = blank slot). `value` (26), `verbatim`, `line` unchanged, so the byte-checker and the mc7-2 consistency block stay green.
- **[MEDIUM] 4 JSDoc digit-leaks reworded** (`game.ts`): dropped the hyphenated story-ids/`depth-5` that leaked into the AC3 scanner (mc3-3, depth-5, mc7-3, mc6-6). Verified via the scanner regex that all four mc7-2 leaks are gone (the two remaining leaks at game.ts:91,114 are PRE-EXISTING mc4-3/mc5-3 JSDocs, out of scope).
- **[LOW-MED] stateCode enumeration** (`state.ts`): added `'entry'` to the JSDoc SETUP-family list + the `default:`-case comment.
- **[LOW-MED] stale stateWith comment** (`mc7-2-name-entry.test.ts`): rewritten to describe the actual single `as St` cast (St widens `phase` to string).

Non-blocking forward findings (stepGame `'entry'` freeze guard → mc7-3; NaN-score hardening) left as Delivery Findings per the Reviewer, not fixed this round.

**Handoff:** To Reviewer (Obi-Wan) for re-review (round 2).

## Subagent Results — Round 1 (REJECTED, superseded by Round 2 below)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1159/1159 green, tsc clean, 216 citations verified, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | findings | 1 | confirmed 1 (downgraded to non-blocking), dismissed 0, deferred 1 |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 3 | confirmed 3 (1 downgraded to non-blocking), dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 5 confirmed blocking (doc/claim integrity), 2 confirmed non-blocking (forward), 0 dismissed

Disabled specialists' domains assessed by the Reviewer directly (see dispatch tags in the assessment): boundary/edge conditions, silent failures, test quality, type design, and simplification were all checked by hand against the diff.

## Reviewer Assessment — Round 1 (REJECTED, superseded by Round 2 below)

**Verdict:** REJECTED

The code is behaviorally correct — all 1159 tests green, tsc clean, 216 citations byte-verified, the four transitions pure/guarded, and the reuse of `@shared/name-entry` is genuine. But this is a ROM-fidelity clone whose **claim database is the deliverable**, and the review surfaced a verified-**false** fidelity claim plus a cluster of citation-discipline and stale-comment defects — all cheap to fix, all in the permanent record. Per this project's standard (claim-prose errors are rework, jt8-6) and citation discipline, these are corrected before landing, not filed as follow-up.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] | `[DOC]` MC-INITIALS-CHARSET claim `meaning` reverses the GETINI wrap direction (`LDA I,26.` fires on the NEGATIVE/underflow case → wraps UP to 26; the wrap-to-0 is the `ELSE`/`CMP I,27.`/`LDA I,0` arm) and says "26 codes" while acknowledging a "27th slot" (range is 0–26 = 27 codes). Verified against W3DSUP.MAC:4116-4136 + the repo's own IFMI=branch-on-minus convention. | `docs/rom-study/claims/name-entry.json` (MC-INITIALS-CHARSET `meaning`) | Reword the meaning: `LDA I,26.` wraps a negative index UP to 26; `CMP I,27./IFCS/LDA I,0` wraps ≥27 back to 0; the ROM cursor cycles 27 codes (0–25 = A–Z, 26 = blank). Value 26 (= letters A–Z) and verbatim are correct and stay. |
| [MEDIUM] | `[RULE]` Four NEW multi-line `/** */` JSDoc blocks leak non-trivial digits into the AC3 un-cited-literal scanner (`3` from "mc3-3", `5`+`3` from "mc7-1 depth-5"/"mc7-3", `6` from "mc6-6", `5` from "depth-5 insert") — passing ONLY because those digits happen to be claimed elsewhere. This is the exact trap the diff's own comment (game.ts:198-199) warns against. | `plugins/missile-command/src/core/game.ts:101-102, 104-105, 209, 226 | Move the story-id/`depth-N` digit references out of the `/** */` blocks (into `//` line comments beside the code, or reword digit-free), so the pass is by-design not by-coincidence. |
| [LOW-MED] | `[DOC]` `stateCode`'s JSDoc list and its `default:`-case comment (`'setup' \| 'attract' \| 'between' \| 'over'`) were not updated to include `'entry'`, even though `'entry'` now falls into that arm and the new Phase docstring points readers there. | `plugins/missile-command/src/core/state.ts:75-76, 83` | Add `'entry'` to both the `stateCode` JSDoc SETUP-family list and the `default:` inline comment. |
| [LOW-MED] | `[RULE]`/`[TEST]` The `stateWith` fixture comment claims a "Cast through unknown … `as unknown as St`" mechanism, but the code below uses a single `as St` (updated in the RED cleanup); the comment describes a mechanism that no longer exists. | `plugins/missile-command/tests/mc7-2-name-entry.test.ts` (stateWith comment) | Update the comment to describe the single `as St` cast. |

**Dispatch tags (all specialist domains covered):**
- `[DOC]` — comment-analyzer (enabled): confirmed the false MC-INITIALS-CHARSET meaning (I independently verified it against W3DSUP.MAC:4116-4136) and the stale `stateCode` enumeration. Both confirmed.
- `[RULE]` — rule-checker (enabled): 29 rules / 61 instances checked; confirmed the JSDoc digit-leak (MEDIUM) and the stale test comment (LOW-MED); flagged the stepGame `'entry'` gap (downgraded — see below). All other 26 rules compliant.
- `[SEC]` — security (enabled): no injection/bounds/throw path; one LOW NaN-score defense-in-depth note (not reachable today) → non-blocking Delivery Finding.
- `[EDGE]` — edge-hunter DISABLED; I checked boundaries myself: every transition guards its non-target phase (`!== 'entry'`/`'over'`), `stepInitials` reference-equal no-op, `commitNameEntry` incomplete-buffer guard, `abortNameEntry` discards even a full buffer. No unhandled boundary in the four functions.
- `[SILENT]` — silent-failure-hunter DISABLED; I checked: no swallowed errors, no empty catch, no silent fallback — the transitions return the input state unchanged on a guard miss, which is the intended, tested behavior (not a silent failure).
- `[TEST]` — test-analyzer DISABLED; I checked: 39 tests use real oracles (`stepNameEntry`, `insertHighScore`, `qualifiesForHighScore`), no vacuous assertions, abort-discards-full-buffer covered. Test quality is strong (rule-checker #8/#18 also confirmed).
- `[TYPE]` — type-design DISABLED; I checked: `highScores`/`initials` both `readonly`; `Omit<GameState,'phase'>` uses a literal key (valid); no `as unknown as` double-casts; `Partial` applied over a complete base. No type-design defect.
- `[SIMPLE]` — simplifier DISABLED; I checked: the four transitions are minimal (guard + spread), no dead code, no over-engineering. `startGame`'s `highScores` carry-forward is one justified line.

**Data flow traced:** a keydown → `stepInitials` → `@shared/name-entry.stepNameEntry` (A–Z, cap 3) → `state.initials` → `commitNameEntry` → `insertHighScore` (depth-5 truncation) → `state.highScores`. Safe: the buffer can only ever hold 0–3 uppercase A–Z; the table is bounded at 5. No injection/overflow path.

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` (26 checks) + CLAUDE.md project rules (core/shell purity, citation discipline, reuse-first). Enumerated over the diff:

- **#1 type escapes** — 3 sites (test loader single-casts after `typeof` guards; `!` in citations-source after `toBeTruthy`; no double-casts in src). COMPLIANT.
- **#2 generics/readonly** — `highScores`/`initials` both `readonly`; `Omit<GameState,'phase'>` literal key. COMPLIANT.
- **#3 exhaustiveness** — `stateCode` switch `default:` covers `'entry'` → `S_SETU` (correct); stepGame if-chain does NOT freeze `'entry'` (see forward finding). Comment staleness = LOW finding above.
- **#4 `??` vs `||`** — all new `||`/`!==` are boolean guards, not nullish-defaults; `?? ''` in the derivation is correct. COMPLIANT.
- **#8/#18 test quality** — oracle-based, mutation-resistant; abort-discards-full-buffer covered. COMPLIANT.
- **#14 derived edges in one branch** — the stepGame `'entry'` freeze gap is the one instance (forward finding, downgraded).
- **core/shell purity** — no clock/entropy/DOM/shell import in the new core code; `@shared/name-entry` is pure. COMPLIANT (purity.test.ts green).
- **citation discipline** — new numeric constant `MC_INITIALS_LEN` cited via `//`; 3 claims byte-verified. VIOLATION: 4 JSDoc digit-leaks (MEDIUM above).
- **reuse-first** — `stepInitials` delegates to `stepNameEntry`, threads `MC_INITIALS_LEN` as a param. COMPLIANT.

### Devil's Advocate

Argue this code is broken. First: the state machine is a trap waiting to spring. `stepGame` freezes `'over'` and `'pause'` explicitly, but `'entry'` — a phase where the battle must be frozen while the player types — falls straight through into the combat simulation, and `nextPhase` then flips `'entry'` back to `'over'` because every city is dead. The moment mc7-3 wires `enterNameEntry` into the frame loop, the name-entry screen will vanish on the first frame and the buffer will be silently abandoned. Two independent specialists flagged this; it is only "safe" because nothing calls it yet. Second: the citation apparatus, the project's whole reason for existing, is being quietly undermined. Four new JSDoc comments smuggle digits past the un-cited-literal scanner, and they pass by pure luck — the day someone removes the unrelated claim that happens to carry value `6`, "mc6-6" reddens a test in a file nobody touched. Third, and worst for a fidelity clone: a claim that a future author will treat as ground truth describes the ROM's cursor wraparound *backwards* — it says `LDA I,26.` wraps at zero when it wraps at the underflow, and miscounts the charset as 26 when its own sentence admits a 27th slot. The byte-checker cannot catch this; a human trusting the claim inherits a false mental model of the machine. A confused reader, a stressed maintainer, and the next story's Dev are all misled. None of it crashes today — but "doesn't crash today" is exactly how latent defects describe themselves. (est. 250 words)

**Handoff:** Back to Dev (Yoda) for a focused doc/claim-integrity rework (green rework — all blocking items are documentation/claim/comment corrections; no logic change).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): mc7-2 adds `highScores` + `initials` to `GameState`, so `createGame` must seed them (`highScores: DEFAULT_HIGH_SCORES`, `initials: ''`).
  Affects `plugins/missile-command/src/core/game.ts` (add + seed the two fields) and any test that does a FULL `.toEqual` snapshot of a `createGame()` state — expect fixture blast radius in `tests/game.test.ts` and siblings (the hitscan-migration blast-radius pattern). *Found by TEA during test design.*
- **Question** (non-blocking): the per-frame 30-sec timeout countdown (UCVTAB=0x84, `W3DSUP.MAC:4180`) and the shell start-switch/timeout *triggers* are the deferred O-7b input-mapping items, resolved with the MC pointer-lock/trackball human smoke test.
  Affects `plugins/missile-command/src/shell/input.ts` + `stepGame` wiring (out of scope for mc7-2 core, which delivers the pure `abortNameEntry` transition only). *Found by TEA during test design.*
- **Improvement** (non-blocking): the `MC-INITIALS-CHARSET` claim should record that the ROM's 27-slot trackball cycler + blank slot are deliberately NOT ported (A–Z via `@shared/name-entry`), mirroring joust's `highscore.ts` deviation note, so the A–Z port charset reads as intentional.
  Affects `plugins/missile-command/docs/rom-study/claims/*.json` (the new charset claim's `meaning`). *Found by TEA during test design.*

### Reviewer (code review)

- **Gap** (non-blocking, forward): `stepGame` has explicit freeze branches for `'over'` and `'pause'` but NONE for the new `'entry'` phase; once mc7-3 wires `enterNameEntry` into the frame loop, a `stepGame` call during `'entry'` falls through to full combat simulation and `nextPhase` flips `'entry'`→`'over'`, silently dropping the name-entry screen and buffer.
  Affects `plugins/missile-command/src/core/game.ts` (add `if (state.phase === 'entry') return { ...state, frame: state.frame + 1, soundEvents: [] }` plus a freeze test, matching the over/pause precedent — do it WHEN wiring 'entry'). Unreachable today (nothing calls enterNameEntry in the stepped loop; verified src/main.ts), and consistent with how 'attract'/'setup' shipped unguarded — hence non-blocking now. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `qualifiesForHighScore` admits a NaN score on a non-full board (`NaN <= 0` is false → falls through to the open-rung branch), so a future non-finite `GameState.score` could reach `insertHighScore` and, via mc7-3's `JSON.stringify`, serialize as `null` in localStorage. Not reachable today (all scoring adds finite integers).
  Affects `plugins/missile-command/src/core/highscore.ts` (add `Number.isFinite(score)` to the qualify guard, matching asteroids' hardening) — a mc7-1/mc7-3 hardening follow-up. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Added abort/timeout coverage (AC-E) beyond the SM-derived ACs**
  - Spec source: context-story-mc7-2.md (SM-derived AC1–AC5) vs. mc7 Architect design §2 + "Testability notes for TEA"
  - Spec text: "The abort/timeout path is not optional coverage … pin start-switch-during-entry → abort (no insert) and timeout → abort, alongside the happy commit."
  - Implementation: added an AC-E group (`abortNameEntry`) — the SM context enumerated only routing/buffer/commit; the design doc mandates the abort branch.
  - Rationale: the design doc (epic authority) + the roadmap fidelity contract bind the abort path; the SM ACs were incomplete, not conflicting, so I broadened rather than deviated downward.
  - Severity: minor
  - Forward impact: Dev MUST implement `abortNameEntry` and file the MC-ENTRY-ABORT claim; a happy-path-only implementation fails AC-E.

- **Port charset is A–Z; the ROM's 27-slot trackball cycler + blank slot are not ported**
  - Spec source: mc7 Architect design §3; sibling ruling (joust jt10-7, asteroids)
  - Spec text: "reuse `stepNameEntry` for the pure 3-char buffer … rather than re-implementing a buffer or forcing a keyboard. Charset … pinned from `INTLHS`/`TAKE INITIALS`."
  - Implementation: AC-C asserts A–Z only (via `@shared/name-entry`); the ROM's letter-cursor cycler over 27 codes (A–Z + a blank slot, `LDA I,26.`/`CMP I,27.`/`ADC I,41`) is captured as the MC-INITIALS-CHARSET *claim* (ROM fact), not ported code.
  - Rationale: fleet-wide reuse-first ruling; the fidelity is in the claim, the input mechanism is a deferred shell choice (O-7b).
  - Severity: minor
  - Forward impact: MC-INITIALS-CHARSET's `meaning` should note the un-ported cycler/blank slot (mirroring joust's deviation note), so a later reader knows A–Z is deliberate.

- **Abort modeled as ONE pure transition for BOTH triggers; the per-frame 30-sec countdown is deferred**
  - Spec source: mc7 Architect design §2 ("'entry' holds … an abort/timeout countdown"); O-7b
  - Spec text: "aborts on a start-switch press or a timeout (`W3DSUP.MAC:4064-4075`)."
  - Implementation: `abortNameEntry(state)` is the shared result of both triggers (return to attract, no insert). The exact UCVTAB=0x84 ("30 SEC", :4180) per-frame countdown wiring into `stepGame`, and the shell's start-switch/timeout *triggering*, are NOT pinned here.
  - Rationale: O-7b explicitly defers the input-mapping/timeout to "the human smoke test the MC pointer-lock/trackball path already needs"; the pure, deterministic core contract is the abort *transition*, testable without a fragile clock field.
  - Severity: minor
  - Forward impact: if the epic wants the countdown IN core state, that is a follow-up (or a Dev design choice in GREEN) over the transition contract; the timeout VALUE (0x84 → 30 s) is available at W3DSUP.MAC:4180 if Dev files it.

- **`enterNameEntry` on a non-qualifying game-over leaves the state UNCHANGED (stays `over`), not `attract`**
  - Spec source: mc7 Architect design §2; epic scope (mc6-6 owns over→attract)
  - Spec text: "if `qualifiesForHighScore(table, score)` the machine routes to `'entry'`; otherwise straight to the game-over→attract timeout (mc6-6)."
  - Implementation: AC-B asserts non-qualifying → unchanged (`over`); this story's transition ONLY adds the `over→entry` edge.
  - Rationale: the `over→attract` timeout is mc6-6's edge; having mc7-2 also drive it would double-own a seam and risk conflicting with mc6-6.
  - Severity: minor
  - Forward impact: commit/abort DO return to `attract` (the post-entry state); the non-qualifying-over→attract edge remains mc6-6's to add.

No further deviations.

### Dev (implementation)

- **`startGame` now CARRIES the high-score ladder across a restart (added behavior no test required)**
  - Spec source: the mc7-2 RED tests (`start-of-game.test.ts` AC1–AC5 do NOT assert `highScores`)
  - Spec text: (n/a — no test pins startGame's ladder behavior; `createGame` seeds `DEFAULT_HIGH_SCORES`)
  - Implementation: `startGame` returns `{ ...createGame(seed), highScores: state.highScores }` instead of a bare `createGame(seed)`, so a restart from `'over'`/`'attract'` preserves the in-memory ladder rather than resetting it to the ROM defaults.
  - Rationale: the ladder is cabinet-persistent, not per-game — a restart wiping a just-entered high score would be a latent bug. All `start-of-game.test.ts` fixtures spread `createGame(1)` (ladder = defaults), so both branches stay equal and every existing assertion holds.
  - Severity: minor
  - Forward impact: mc7-3's shell reload overwrites `highScores` on boot anyway, so this is belt-and-suspenders; if a later story wants a hard reset-on-restart it must override this line.

- **The two numeric name-entry claims are registered in `citations-source.test.ts`'s DERIVED allowlist + a new consistency block (apparatus maintenance, per convention)**
  - Spec source: `citations-source.test.ts` (the shared claim-value gate) + memory [[mc-instruction-site-claim-derived-ci-gap]]
  - Spec text: "every non-EQU claim carries a kind-tag string value, never a number … (DERIVED constants … are exempt)"
  - Implementation: added `'INTLHS'`, `'INITCSET'` to `DERIVED` and a `mc7-2:` consistency `it(...)` that re-derives 3 (INTLHS coord count) and 26 (`LDA I,26.` immediate) from source; `MC-ENTRY-ABORT` stays a `'cite'` kind-tag (no numeric operand).
  - Rationale: instruction-site / `.BYTE`-count claims carry real numerics and MUST join DERIVED with a consistency proof — the established pattern every prior mc citation story followed (mc4-1, mc5-*, mc7-1). Not a spec deviation; the citation gate requires it.
  - Severity: minor
  - Forward impact: none — the block re-derives from the cited verbatim, so a fabricated value still reddens.

### Reviewer (audit)

- **TEA #1 (added abort/timeout coverage AC-E)** → ✓ ACCEPTED: correct — the design doc §2 makes abort mandatory; broadening the SM-derived ACs upward is the right move, not a downgrade.
- **TEA #2 (A–Z port charset; ROM 27-slot cycler not ported)** → ✓ ACCEPTED (deviation sound). The A–Z port decision is correct and fleet-consistent. NOTE: the *claim meaning* that documents the un-ported cycler got the ROM wrap direction wrong — that is a code-review finding on the claim prose (MEDIUM above), not a flaw in this deviation.
- **TEA #3 (abort modeled as one transition; per-frame timeout deferred to O-7b)** → ✓ ACCEPTED: reasonable scoping; both ROM triggers share the abort result, and the countdown wiring belongs with the shell input mapping.
- **TEA #4 (`enterNameEntry` non-qualifying → unchanged, not attract)** → ✓ ACCEPTED: correct — the `over→attract` edge is mc6-6's; mc7-2 rightly owns only the `over→entry` edge.
- **Dev #1 (`startGame` carries the ladder across restart)** → ✓ ACCEPTED: the added behavior is correct (the ladder is cabinet-persistent), keeps every existing test green, and is one justified line. Sound.
- **Dev #2 (INTLHS/INITCSET registered in citations-source DERIVED + consistency block)** → ✓ ACCEPTED: required by the citation gate and matches the established per-story pattern; the consistency block re-derives from the verbatim, so it has teeth.

**Undocumented deviation spotted:** none beyond the logged set. The stepGame `'entry'` freeze gap (forward finding) is an omission, not an undocumented spec deviation — no spec required the guard in this story.

### Reviewer (audit) — Round 2

All Round-1 deviations remain ✓ ACCEPTED (no changes to logic or deviations in the rework). No new deviations were logged or spotted in the doc-only Round-2 rework.

## Subagent Results

Round 2 (re-review of the doc-only rework `ec73e715`). Same enabled set as Round 1.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1159/1159 green, tsc clean, 216 citations verified, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | clean | none — the corrected MC-INITIALS-CHARSET meaning verified accurate line-by-line vs W3DSUP.MAC:4116-4140; all 4 game.ts rewordings honest | N/A (Round-1 finding resolved) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none (doc-only; no executable change; round-1 posture unchanged) | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none — all 4 mc7-2 JSDoc leaks confirmed GONE (scanner-simulated); stateCode enum updated; no new violation | N/A (Round-1 findings resolved) |

**All received:** Yes (4 enabled returned clean, 5 disabled pre-filled)
**Total findings:** 0 new. All Round-1 blocking findings verified RESOLVED.

## Reviewer Assessment

**Verdict:** APPROVED

Round-2 re-review of the doc/claim-integrity rework. Every Round-1 blocking finding is verified resolved, no new issue introduced, and the behavior/tests are untouched (1159/1159, tsc clean, 216 citations byte-verified). The false ROM claim that anchored the rejection is now accurate.

**Round-1 findings — resolution verified:**
- `[DOC]` **MC-INITIALS-CHARSET meaning** — CORRECTED. I re-verified the reworded meaning against `W3DSUP.MAC:4116-4140`: `LDA I,26.` fires on the IFMI (branch-on-minus) underflow arm → wraps UP to 26; `CMP I,27./IFCS/LDA I,0` wraps ≥27 down to 0; 27 codes (0-25 = A-Z, 26 = blank); value 26 correctly glossed as the letter count. comment-analyzer independently confirmed (high confidence). RESOLVED.
- `[RULE]` **4 JSDoc digit-leaks** — RESOLVED. rule-checker scanner-simulated the current game.ts: all four mc7-2 leaks (mc3-3, depth-5, mc7-3, mc6-6, depth-5-insert) are gone; the only surviving leaks (game.ts:91,113,114,116,119,133) are PRE-EXISTING mc4-*/mc5-* JSDocs that predate this story — out of scope.
- `[DOC]` **stateCode enumeration** — RESOLVED. `'entry'` added to both the JSDoc SETUP-family list and the `default:`-case comment; closes a pre-existing code-vs-comment gap.
- `[RULE]`/`[TEST]` **stale stateWith comment** — RESOLVED. Now describes the single `as St` cast accurately.

**Dispatch tags (all specialist domains covered):**
- `[DOC]` — comment-analyzer (enabled): correction accurate, no new inaccuracy. Clean.
- `[RULE]` — rule-checker (enabled): both findings resolved, no new leak/violation. Clean.
- `[SEC]` — security (enabled): doc-only, no new surface. Clean.
- `[EDGE]` — edge-hunter DISABLED; the rework changed no control flow, so no boundary condition changed — I confirmed via `git show` that every hunk is inside a comment/JSON-string.
- `[SILENT]` — silent-failure-hunter DISABLED; no error-handling code touched.
- `[TEST]` — test-analyzer DISABLED; the only test change is a comment; all 1159 tests green, assertions unchanged.
- `[TYPE]` — type-design DISABLED; no type/signature changed (`St`, `GameState`, function sigs byte-identical).
- `[SIMPLE]` — simplifier DISABLED; prose-only, no code complexity change.

**Data flow traced:** unchanged from Round 1 (keydown → `stepInitials` → `stepNameEntry` → `initials` → `commitNameEntry` → `insertHighScore` → `highScores`); the rework touched no executable line.

**Pattern observed:** the corrected claim now matches the ROM and the repo's IFMI convention (`claims/state.json`) — citation discipline restored.

**Error handling:** unchanged; the four transitions guard their non-target phase and return the input state unchanged — verified byte-identical to Round 1.

### Rule Compliance — Round 2

All Round-1 compliant items stand (logic untouched). The two Round-1 VIOLATIONS are now COMPLIANT: citation discipline (JSDoc digit-leaks resolved) and comment accuracy (claim meaning + stateCode enumeration corrected). No rule regressed.

### Devil's Advocate — Round 2

Argue the rework is broken. Did the reword introduce a *new* false statement? I checked: the corrected claim's every clause maps to a real source line (`:4126` IFMI, `:4128` LDA I,26., `:4132-4136` ELSE wrap, `:4158/:4172` ADC I,41) — no invented mechanism. Did dropping "depth-5" from a JSDoc lose load-bearing truth? No — the depth-5 fact lives in `highscore.ts`'s own claim (MC-HISCORE-DEPTH) and the consistency block; the comment was descriptive, not the source of truth. Did generalizing "mc6-6" → "mc6" mislead? mc6-6 is still `backlog`; citing the epic is *more* honest than an unlanded story number. Did the stateCode enum edit change dispatch? No — the `default: return S_SETU` line is byte-identical; only the comment enumerates `'entry'` now, matching the always-correct runtime behavior. Could the doc-only change mask a real regression? The full suite (1159/1159), tsc, and the citation byte-checker (216) all re-ran green, and security confirmed zero executable hunks. The one thing I will NOT pretend is fixed: the stepGame `'entry'` freeze gap and the NaN-score hardening remain open — but both are correctly recorded as non-blocking forward Delivery Findings for mc7-3, consistent with how `'attract'`/`'setup'` shipped unguarded. Nothing new is broken. (est. 210 words)

**No new Delivery Findings** in Round 2 (the Round-1 forward findings — stepGame `'entry'` guard, NaN-score hardening — still stand under `### Reviewer (code review)`).

**Handoff:** To SM (Thrawn) for finish-story.