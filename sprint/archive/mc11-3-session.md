---
story_id: "mc11-3"
jira_key: "mc11-3"
epic: "mc11"
workflow: "tdd"
---
# Story mc11-3: Wire the name-entry timeout + start-abort

## Story Details
- **ID:** mc11-3
- **Jira Key:** mc11-3
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** feat/mc11-3-wire-nameentry-timeout-start-abort
- **PR:** 477
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T20:00:18Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T18:44:22Z | 2026-08-16T18:47:25Z | 3m 3s |
| red | 2026-08-16T18:47:25Z | 2026-08-16T19:03:47Z | 16m 22s |
| green | 2026-08-16T19:03:47Z | 2026-08-16T19:11:40Z | 7m 53s |
| review | 2026-08-16T19:11:40Z | 2026-08-16T19:21:52Z | 10m 12s |
| green | 2026-08-16T19:21:52Z | 2026-08-16T19:27:23Z | 5m 31s |
| review | 2026-08-16T19:27:23Z | 2026-08-16T19:46:17Z | 18m 54s |
| green | 2026-08-16T19:46:17Z | 2026-08-16T19:51:31Z | 5m 14s |
| review | 2026-08-16T19:51:31Z | 2026-08-16T20:00:18Z | 8m 47s |
| finish | 2026-08-16T20:00:18Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **(TEA, Question, non-blocking) The ROM's TAKE-INITIALS has TWO countdown seeds; the port
  models one.** GETINI loads UCVTAB = **0xFF** on first entry ("GIVE EM 60 SECONDS",
  W3DSUP.MAC:4012) and **0x84** after each committed letter ("RESET TIMEOUT TO 30 SEC",
  :4180). The trackball ROM shrinks the window per letter; the KEYBOARD port has no per-letter
  trackball loop, so I pinned the single window to the project's own canonical value — claim
  `MC-ENTRY-ABORT` already names **UCVTAB = 0x84** (:4180) as the port's seed, and the story
  title + epic both say "30 second". So NAME_ENTRY_TIMEOUT_FRAMES = 0x84 × 16 = **2112**, not
  the 0xFF/"60 s" first-window value. Reviewer may revisit if a per-letter reset is later wanted.
- **(TEA, Gap, non-blocking → Dev) The new core constant needs a citation.** The epic requires
  "every new src/core constant carries a citation-gated claim". `NAME_ENTRY_TIMEOUT_FRAMES`
  derives from 0x84 (already in claim `MC-ENTRY-ABORT`) and the 16-frame tick (`AND I,0F`, :4082).
  Pin the derivation in `//` comments (the un-cited-literal scanner strips `//` but not `/** */`),
  and file/extend the claim per `tests/audit/citations` if it lands as a bare literal — same
  drill mc6-6 followed for OVER_TIMEOUT_FRAMES. `purity.test.ts` must stay green (pure frame
  counter, no clock).
- **(TEA, Improvement, non-blocking) The ROM aborts on EITHER start switch (MSTRT1!MSTRT2).**
  I required only the **'1'** key (1-Player START = MSTRT1) because MC's port is single-player
  and Enter already commits. A faithful extension would also abort on **'2'** (MSTRT2); left
  out of the hard test surface to avoid over-constraining Dev. Optional.

### Dev (implementation)
- **Gap** (non-blocking): the constant needed NO new claim JSON — an own-line inline
  `W3DSUP.MAC:NNN` cite satisfies `citations.test.ts` §4 for the two derived literals (0x84,
  0x10), the same route the sound-table/city rows use. TEA's finding suggested a committed
  claim; §4's self-documenting arm made that unnecessary. Affects `src/core/state.ts`
  (own-line cites on `NAME_ENTRY_UCVTAB_SEED` / `NAME_ENTRY_TICK_FRAMES`). *Found by Dev.*
- **Improvement** (non-blocking): the ROM's '2'-key (MSTRT2) abort remains unimplemented — I
  wired only '1' per the tests. `startAbortFromKey`'s `isStartKey` is the one-line seam if a
  later story wants it. Affects `src/shell/input.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking): a now-false confession comment plus a cluster of off-by-one-instruction ROM
  citations in comment prose (2 of them self-contradictory within this same PR) must be corrected
  before merge — this is a citation-integrity codebase. Affects `src/core/game.ts`,
  `src/core/state.ts`, `tests/mc11-3-name-entry-timeout-abort.test.ts` (see the REJECTED severity
  table for the exact line/fix list). *Found by Reviewer during code review.* — **RESOLVED round 1.**
- **Gap** (blocking, round 2): the flip-frame test and the `entryFrames` resets are not mutation-lethal
  (#29/#15) — the story's timeout boundary and held-at-0 invariant are not actually pinned. Affects
  `tests/mc11-3-name-entry-timeout-abort.test.ts` (tighten the flip assertion to `toBe(frames)`; add
  `entryFrames===0` assertions after both aborts and after commit). *Found by Reviewer during round-2 review.*
- **Improvement** (non-blocking): `input.ts:154` comment omits `EOR I,0FF` from its quoted GETINI
  sequence, and the pre-existing "scanner strips // but not /** */" rationale (state.ts:91/139/148,
  game.ts:193/313 + 3 new instances here) is empirically false — both worth a separate cleanup.
  *Found by Reviewer during round-2 review.* — **EOR RESOLVED round 2; the // vs /** */ item remains a follow-up.**
- **Improvement** (non-blocking, round 3): `game.ts:388` — the pre-existing mc7-3 comment above the
  `'entry'` branch says stepGame holds "every game field byte-identical," which mc11-3's `entryFrames`
  advancement now contradicts; reword to match the `'over'` branch ("only the clock and the entry-frame
  counter tick on"). LOW — the mc11-3 comment right below already documents the real behaviour. Affects
  `src/core/game.ts`. *Found by Reviewer during round-3 review; APPROVED with this as a follow-up.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

3 deviations

- **Added a state-threaded `entryFrames` counter to `GameState` to time the entry window**
  - Rationale: mirrors the established over-timeout precedent; a state field is the only
  - Severity: minor
  - Forward impact: minor — any future full-`GameState` literal must include `entryFrames: 0`
- **Timeout constant home + value follow TEA's resolved design (no divergence)**
  - Rationale: exact match to TEA's spec; own-line cite is the §4-sanctioned route for derived
  - Severity: none (faithful implementation)
  - Forward impact: none.
- **(Round 1 rework) `entryFrames` now resets on the EXIT paths too, not only on entry**
  - Rationale: chose the Reviewer's preferred option (reset-on-exit) over softening the doc — it
  - Severity: minor
  - Forward impact: positive — the held-at-0 invariant is now real, so future readers can rely on it.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **(TEA) Timeout value resolved to 2112 frames, not a literal "30 s".** The story/context
  said "30-second expiry". I resolved the fidelity fork from source: the deterministic quantity
  is FRAMES (`UCVTAB seed 0x84 × 16-frame tick = 2112`), cited to W3DSUP.MAC:4180/:4082 and the
  port's `MC-ENTRY-ABORT` claim. Tests pin the frame count and never a wall-clock second, so
  nothing couples to the ~61 Hz refresh. (See Delivery Findings for the 0xFF-vs-0x84 nuance.)
- **(TEA) The "start switch" is mapped to the '1' key.** The story said "map the start switch";
  the ROM switch is MSTRT1/MSTRT2 (physical 1-/2-Player START). Fleet convention for 1-Player
  START is the '1' key (battlezone `key==='1'`, star-wars `Digit1`, joust/centipede START1 port).
  Enter is unavailable (it already commits), and '1' is not an A-Z initials letter, so it never
  collides with entry. The abort is required through the composed `keydownReducer` (the seam
  main.ts drives), leaving Dev free on where the mapping lives.

### Dev (implementation)
- **Added a state-threaded `entryFrames` counter to `GameState` to time the entry window**
  - Spec source: TEA tests (`mc11-3-name-entry-timeout-abort.test.ts`), AC1 hardening group
    ("runs on ENTRY-frames, not boot-frames"; "a SECOND entry gets its own full countdown")
  - Spec text: the countdown must count entry-frames (not the free-running boot `frame`) and
    reset on re-entry; the mechanism was left to Dev.
  - Implementation: added `readonly entryFrames: number` to `GameState` (beside `overFrames`),
    initialised to 0 in `createPlayGame`, reset to 0 in `enterNameEntry`, incremented in
    `stepGame`'s `'entry'` branch — the exact shape mc6-6 used for `overFrames`/`OVER_TIMEOUT_FRAMES`.
  - Rationale: mirrors the established over-timeout precedent; a state field is the only
    clock-free way to count phase-scoped frames in a pure core (purity.test.ts stays green).
  - Severity: minor
  - Forward impact: minor — any future full-`GameState` literal must include `entryFrames: 0`
    (only `createPlayGame` builds one today; `createGame`/`startGame` inherit it via spread).
- **Timeout constant home + value follow TEA's resolved design (no divergence)**
  - Spec source: context-story-mc11-3.md fidelity note + TEA Design Deviations
  - Spec text: `NAME_ENTRY_TIMEOUT_FRAMES = 0x84 * 0x10 = 2112`; state.ts or game.ts.
  - Implementation: exported `NAME_ENTRY_TIMEOUT_FRAMES` from `state.ts` (beside
    `OVER_TIMEOUT_FRAMES`), derived from `NAME_ENTRY_UCVTAB_SEED (0x84)` × `NAME_ENTRY_TICK_FRAMES
    (0x10)`, each literal carrying an own-line `W3DSUP.MAC:4180` / `:4080` cite (measured physical
    lines) so citations.test.ts §4 covers them with no new claim JSON.
  - Rationale: exact match to TEA's spec; own-line cite is the §4-sanctioned route for derived
    constants (same as the sound-table/city rows).
  - Severity: none (faithful implementation)
  - Forward impact: none.
- **(Round 1 rework) `entryFrames` now resets on the EXIT paths too, not only on entry**
  - Spec source: Reviewer round-1 finding R2 (checklist #14/#17) — the JSDoc invariant "held at 0
    in every non-entry phase" was false because `abortNameEntry`/`commitNameEntry` did not reset it.
  - Implementation: `abortNameEntry` and `commitNameEntry` now return `entryFrames: 0`; the field's
    JSDoc is corrected and its ROM cite moved out of the JSDoc into a `//` comment (#33).
  - Rationale: chose the Reviewer's preferred option (reset-on-exit) over softening the doc — it
    makes the invariant genuinely true and removes the latent #14 trap (a future second entry path
    that forgets to zero the counter). No behavioural change today (the value was already reset on
    entry before its only reader); mirrors `overFrames`, which returns to 0 on leaving `'over'`.
  - Severity: minor
  - Forward impact: positive — the held-at-0 invariant is now real, so future readers can rely on it.

### Reviewer (audit)
- **(TEA) Timeout value resolved to 2112 frames** → ✓ ACCEPTED by Reviewer: independently verified
  against the ROM — `LDA I,84` (0x84=132) at physical W3DSUP.MAC:4180 and `AND I,0F` (16-frame tick)
  at :4080; product 2112. Consistent with the committed claim `MC-ENTRY-ABORT`. Sound.
- **(TEA) Start switch mapped to the '1' key** → ✓ ACCEPTED by Reviewer: matches the fleet
  convention (battlezone/star-wars/joust/centipede), does not collide with A-Z initials, and Enter
  is correctly reserved for commit. `BNE ABORT` start-switch cite :4076 verified accurate.
- **(Dev) State-threaded `entryFrames` counter** → ✓ ACCEPTED by Reviewer (design) — mirrors the
  `overFrames`/`OVER_TIMEOUT_FRAMES` precedent and stays clock-free (purity green). BUT the counter's
  reset is asymmetric: it is zeroed on the ENTRY path (`enterNameEntry`) and never on the EXIT paths
  (`abortNameEntry`/`commitNameEntry`), so the field's JSDoc invariant is false — FLAGGED as a
  separate finding below (checklist #14/#17). The design is fine; the doc/reset symmetry is not.
- **(Dev) Timeout constant home + own-line cites** → ✓ ACCEPTED by Reviewer: `state.ts` placement
  beside `OVER_TIMEOUT_FRAMES` and the own-line `//` cites on 0x84/0x10 correctly satisfy
  citations.test.ts §4 (verified: both literal cites are accurate).
- **(Dev round-1 rework) `entryFrames` now resets on the EXIT paths too** → ✓ ACCEPTED by Reviewer
  (round 2): the reset-on-exit is the correct, robust choice — the held-at-0 invariant now holds for
  real (rule-checker traced every transition). NOTE: the resets are correct but currently unpinned by
  tests (round-2 finding #15) — a test-hardening item, not a reason to reverse the deviation.

## Tea Assessment

**RED verdict: WELL-FORMED. Handing off to Yoda (Dev) for GREEN.**

**RED verification (testing-runner, `npx vitest run --project missile-command`):**
- New file `tests/mc11-3-name-entry-timeout-abort.test.ts`: **18 tests, 12 red / 6 green.**
  - **8 error** — `loadTimeoutFrames()` throws: `NAME_ENTRY_TIMEOUT_FRAMES` is not exported yet
    (the fleet loader idiom; `tsc --noEmit` stays green while the surface is absent — confirmed).
  - **4 assertion** — `keydownReducer('1', entry)` does not yet abort (`'entry'` ≠ `'attract'`).
  - **6 green** — precondition (qualifying game-over routes to `'entry'`), the pure-`abortNameEntry`
    reference anchor, and 4 regression guards (attract '1' → setup; play '1' inert; A-Z still types;
    Enter still commits with an insert). These must STAY green.
- **No sibling regressions** — 1389/1401 project tests pass; every failure is in the new file only.
- `npm run lint` (tsc --noEmit) **green**.

**What Dev must build (GREEN):**
1. `export const NAME_ENTRY_TIMEOUT_FRAMES = 0x84 * 0x10` (= 2112) in `src/core` — state.ts beside
   `OVER_TIMEOUT_FRAMES` is the natural home; the loader also accepts game.ts. Cite in `//`
   comments; claim per the un-cited-literal rule (see Delivery Findings).
2. Wire `stepGame`'s `'entry'` branch (game.ts:368) to count ENTRY-frames (state-threaded, reset
   on entry — NOT the free-running boot `frame`) and `return abortNameEntry(state)` at the
   threshold.
3. Map the `'1'` start switch to `abortNameEntry` in the shell `keydownReducer` (input.ts).

**Rule Coverage (lang-review/typescript.md — checks exercised by these tests):**
- **#14 (edge in one branch):** the abort lives in the `'entry'` branch; the "resets on re-entry"
  and "counts entry-frames not boot-frames" tests guard the reset edge and the wrong-counter trap.
- **#29 (ordering vs magnitude):** the timeout is a MAGNITUDE — the flip-frame test carries the
  number (2112 ± 1), not a bare "eventually aborts".
- **#26/#18 (all-local / self-referential assertions):** the value-pin compares the src constant
  against INDEPENDENT ROM literals (0x84, 0x10), not test-local arithmetic about itself.
- **#15 (token vs claim):** no source-text greps — every guard is behavioral through the real
  seams (`stepGame`, `keydownReducer`), each mutation-meaningful (abort ref-identity vs commit's
  new array distinguishes the two paths).
- **Test quality:** no vacuous assertions; the FULL-buffer abort tests prove no insert via array
  reference identity (`toBe`), catching a wrongly-wired `commitNameEntry`.

Handing off to Yoda (Dev).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/missile-command/src/core/state.ts` — added `NAME_ENTRY_TIMEOUT_FRAMES = 0x84 * 0x10`
  (= 2112) beside `OVER_TIMEOUT_FRAMES`, derived from two own-line-cited ROM constants
  (`W3DSUP.MAC:4180` seed, `:4080` tick).
- `plugins/missile-command/src/core/game.ts` — added `entryFrames` to `GameState` (init 0 in
  `createPlayGame`, reset 0 in `enterNameEntry`); wired `stepGame`'s `'entry'` branch to count
  entry-frames and `return abortNameEntry(state)` at the threshold; imported the constant.
- `plugins/missile-command/src/shell/input.ts` — added `startAbortFromKey` (the '1' = MSTRT1
  start switch → `abortNameEntry`) and composed it into `keydownReducer` before `nameEntryFromKey`.

**Tests:** 1401/1401 passing (missile-command project GREEN) — the 18 mc11-3 tests all green;
`citations` / `citations-source` / `purity` guards green (the new `0x84`/`0x10` literals are
own-line cited; core stays clock-free). `npm run lint` (tsc --noEmit) green repo-wide.

**Wiring:** the two seams the tests drive — `stepGame` (via `loop`) and `keydownReducer` (main.ts
line 105) — are exactly what the app runs, so the abort is reachable in production, not just tests.

**ACs:** AC1 (timeout → abort) ✓, AC2 (start-switch → abort) ✓, AC3 (both → attract/cleared/ladder
unchanged, no insert even from a full buffer) ✓, AC4 (both paths asserted) ✓.

**Handoff:** To Reviewer (Obi-Wan) for review.

### Round 1 rework (Dev)
Reviewer REJECTED round 1 on documentation-only findings (1 Medium stale confession + 10 Low
citation/doc). All 11 addressed in commit `cd382360`:
- `game.ts`: rewrote the now-false "deferred O-7b" confession above `abortNameEntry` (mc11-3 wired
  it); moved the `entryFrames` ROM cite out of JSDoc into a `//` comment (#33).
- Made the `entryFrames` "held at 0 in every non-entry phase" invariant TRUE — `abortNameEntry` +
  `commitNameEntry` now reset `entryFrames: 0` (Reviewer's preferred fix for #14/#17); kills the
  latent second-entry-path trap.
- Corrected the off-by-one-instruction ROM citation ranges in `state.ts` + the test file
  (LDA FRAME=4078, AND I,0F=4080, LDA SWSTAT=4070, LDA I,0FF=4010, GETINI=4068), resolving the two
  same-PR contradictions.
- Re-verified: `npm run lint` green; missile-command **1401/1401** green (citations/purity green);
  no regression from the `entryFrames` zero-on-exit.

**Handoff (round 2):** Back to Reviewer for re-review.

### Round 2 rework (Dev)
Reviewer REJECTED round 2 on test-rigor findings (mutation-tested). All addressed in commit
`936be9dc` — no production-code change:
- **#29** (flip test masked the boundary mutation): tightened `Math.abs(flip-frames) <= 1` →
  `expect(flip).toBe(frames)`. The abort fires on EXACTLY frame 2112 (entryFrames starts 0, loop
  from i=1). **Mutation-verified:** `>=`→`>` now reddens the flip test.
- **#15** (the three `entryFrames:0` resets were mutation-survivors): added a dedicated
  `mc11-3 (#15) — every entry/exit transition zeroes the entry countdown` block that steps the
  countdown to a nonzero value first, then exits via `abortNameEntry` / `commitNameEntry` /
  `enterNameEntry` and asserts `entryFrames === 0`. **Mutation-verified:** dropping ANY of the three
  resets now reddens its test (`expected 10 to be 0`). Also added inline `entryFrames===0` checks to
  the existing timeout/start-abort/commit tests.
- **Comment**: dropped the stale `game.ts:274/368` line-refs from the RED narrative (symbol names now).
- **Comment (follow-up)**: added the omitted `EOR I,0FF` to `input.ts`'s quoted GETINI sequence.
- Re-verified: `npm run lint` green; missile-command **1404/1404** green (+3 from the #15 block).

**Non-blocking follow-up left open (per Reviewer):** the pre-existing, codebase-wide "scanner strips
`//` but not `/** */`" rationale is empirically false — flagged for a separate investigation, not
fixed here (out of this story's scope).

**Handoff (round 3):** Back to Reviewer for re-review.

**Setup verdict: READY for TEA (RED phase).**

**Reconnaissance (before setup):**
- Sibling probes clean — no remote branch matched `mc11-3` (mc11-4's branch was
  deleted post-merge), and no `.session` files in any `a-*` checkout. No sibling owns
  this story.
- Merge gate clean — no open PRs on `slabgorb/arcade`.

**Premise verification (measured, not assumed):**
- `abortNameEntry` is defined at `plugins/missile-command/src/core/game.ts:274` (matches
  the story's cite exactly) and is called NOWHERE in `missile-command/src` — a genuinely
  unwired seam. Premise holds; this is a WIRING story, not new sim logic.
- The `'entry'` step branch exists at `game.ts:368` and today only does `frame + 1` —
  that is the seam where the per-frame countdown and the start-switch→abort mapping
  belong. `abortNameEntry`'s own comment (game.ts:267-270) names this as the deferred
  **O-7b** input-mapping item.
- `abortNameEntry` already implements the pure post-abort result (attract, buffer
  cleared, ladder unchanged). Dev wires it; no new abort logic needed.

**Derived ACs (epic YAML `acceptance_criteria` was `null`):** AC1 timeout path, AC2
start-abort path, AC3 post-abort state (attract + cleared buffer + unchanged ladder),
AC4 both paths tested. Derived from the four assertions in the title/description and
recorded in the context file.

**⚠ Fidelity item for TEA:** The "30-second" timeout is a value to CONFIRM from source,
not gospel. Ground truth is REV-01 `W3DSUP.MAC:4076` (start-switch abort) and
`:4086-:4088` (timeout). Do not hard-code 30s into a test as fact — cite the ROM.

Handing off to Han Solo (TEA) for the RED phase.

> **Rounds 1 & 2 (both REJECTED) are preserved in git history + the phase table + `review_findings`.
> The sections below are the CURRENT (round 3) review — APPROVED.**

## Subagent Results

Round 3 re-review — all 4 enabled specialists re-dispatched on the round-2-reworked diff; the
rule-checker independently RE-RAN the round-2 mutants to confirm closure.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (GREEN 1404/1404, tsc green, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings (edge assessed by Reviewer directly) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings (no error paths; assessed directly) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (test quality confirmed by rule-checker live mutation #15/#29) |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 (game.ts:388 stale "byte-identical" comment) | confirmed 1 (Low, non-blocking follow-up) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings (type design via rule-checker #2/#5) |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings (minimal diff) |
| 9 | reviewer-rule-checker | Yes | clean | 0 (32 rules / 61 instances / 0 violations; #29 & #15 CONFIRMED mutation-lethal) | N/A |

**All received:** Yes (round 3: 4 enabled re-run, 5 disabled pre-filled; 1 finding total)
**Total findings:** 1 confirmed (Low, non-blocking follow-up), 0 dismissed — the two round-2 blockers
(#29/#15) are CLOSED, live-mutation-verified by the rule-checker (and by Dev's own probes).

## Rule Compliance

Rubric = `.pennyfarthing/gates/lang-review/typescript.md` + CLAUDE.md purity/citation rules.
All prior-round findings RE-VERIFIED resolved; the two round-2 blockers CONFIRMED closed by live mutation:

- **#29 (magnitude, was the round-2 blocker) — CLOSED, mutation-confirmed:** the flip test now asserts
  `expect(flip).toBe(frames)`. Rule-checker mutated `stepGame`'s `>=` → `>` and it reddens
  (`timed out at frame 2113, expected exactly 2112`). The story's timeout boundary is now pinned exactly.
- **#15 (mutation-lethal resets, was the round-2 blocker) — CLOSED, mutation-confirmed:** the new
  `#15` block pins all three resets — deleting `entryFrames:0` from `enterNameEntry` (reddens "999→0"),
  `abortNameEntry` (reddens two: "10→0" + timeout "2111→0"), or `commitNameEntry` (reddens "10→0").
- **#14 (edge in one branch) — RESOLVED:** rule-checker grep-swept every `phase:` assignment; the sole
  entry path and both exit paths zero `entryFrames`; no fourth path leaves `'entry'` unaccounted.
- **#17 (held-at-0 invariant comment) — RESOLVED:** now true (all three verbs zero the counter).
- **#33 / round-1 citation prose — RESOLVED & re-verified against source** (all W3DSUP.MAC lines accurate;
  the round-1 confession and same-PR contradictions gone).
- **Purity (#31), §4 citation coverage (#32), type/module (#2/#5), test quality (#8/#18/#26) — compliant**
  (rule-checker: 32 rules, 61 instances, 0 violations; security clean).
- **#17 (game.ts:388 "byte-identical" sentence) — NEW, LOW, non-blocking:** the pre-existing mc7-3
  comment above the `'entry'` branch says stepGame holds "every game field byte-identical," which this
  diff's `entryFrames` advancement (documented correctly by the mc11-3 comment immediately below it)
  now contradicts. The analogous `'over'` branch says "only the clock and the over-frame counter tick
  on." Real but LOW: the current behaviour is correctly documented by the adjacent mc11-3 comment, so no
  reader is left without the truth. Recorded as a follow-up reword (see Delivery Findings); not a blocker.
- **#17 (pre-existing "// not /** */" rationale) — non-blocking follow-up carried from round 2** — a
  separate codebase-wide investigation; do not propagate further.

## Devil's Advocate (round 3)

Round 2's attack — "a future regression the suite cannot see" — is now closed: I asked the rule-checker
to RUN the exact mutants, and every one reddens. `>=`→`>` fails the flip test; deleting any of the three
resets fails a `#15` test. So the suite no longer overstates what it guarantees on the two things this
story promises (the exact flip frame and the held-at-0 invariant). Where could it STILL be wrong? The
only surviving thread is comment accuracy in a hot, multi-paragraph branch — the mc7-3 "byte-identical"
sentence now half-contradicted by the mc11-3 paragraph beneath it. Is that a merge blocker? I weighed it
against this codebase's own history of cycling three rounds on prose (jt8-6): the substantive code is
correct and now mutation-locked, the rule-checker is clean, and the stale sentence is immediately
followed by a correct description of the real behaviour — a reader is confused for one line, not misled
into a wrong action (unlike round-1's "deferred" confession, which would have mis-routed an audit). That
is a LOW follow-up, not a fourth reject. Chasing one-more-adjacent-comment each round is itself the
anti-pattern; the right move is to APPROVE the correct, well-tested code and file the reword.

## Reviewer Assessment

**Verdict:** APPROVED

Three rounds in, every substantive finding is resolved and independently mutation-verified. Round 1's
audit-misleading confession and self-contradictory ROM citations are fixed; round 2's two test-rigor
gaps on the story's central mechanism (#29 the exact flip frame, #15 the held-at-0 resets) are CLOSED —
the rule-checker re-ran each mutant and every one now reddens. The rule-checker's full sweep is clean
(32 rules, 61 instances, 0 violations); preflight is GREEN (1404/1404) and security clean. The only
open item is one LOW, non-blocking stale sentence (game.ts:388) whose correct behaviour is already
documented by the adjacent mc11-3 comment — recorded as a follow-up, not a blocker (a fourth reject on
one-more-adjacent-comment would be the over-cycling this codebase's own history warns against).

**Verified good (evidence):**
- `[TEST]` `[RULE]` The two round-2 blockers are mutation-lethal now (rule-checker live-verified):
  `>=`→`>` reddens the flip test (`2113 ≠ 2112`); deleting any of the three `entryFrames:0` resets
  reddens a `#15` test. The suite pins the exact timeout frame and the held-at-0 invariant.
- `[VERIFIED]` Correctness/purity — `entryFrames` is a pure state-threaded counter, no clock/entropy;
  `stepGame`'s `'entry'` branch aborts at exactly 2112 via `abortNameEntry`. purity.test.ts green (#31).
- `[VERIFIED]` `[EDGE]` #14 — all three transitions out of/into `'entry'` zero the counter; grep-swept,
  no fourth path. `[SILENT]` no swallowed error (the RED-loader throws self-describingly by design).
- `[VERIFIED]` `[SEC]` Ladder integrity — both aborts route through `abortNameEntry`, never
  `insertHighScore`; a full buffer is discarded, not committed (mutation-pinned). `[TYPE]` sound.
- `[VERIFIED]` `[SIMPLE]` Minimal diff — reuses the `overFrames`/`OVER_TIMEOUT_FRAMES` precedent; no
  over-engineering. `[DOC]` all ROM citations reconciled to source; §4 own-line `//` cites accurate.

Tags present for gate: `[EDGE]` `[SILENT]` `[TEST]` `[DOC]` `[TYPE]` `[SEC]` `[SIMPLE]` `[RULE]`.

**Data flow traced:** `'1'` keydown → `keydownReducer` → `startAbortFromKey` (phase==='entry') →
`abortNameEntry` → `{phase:'attract', initials:'', entryFrames:0, highScores unchanged}` → `main.ts`
saves only on a changed `highScores` reference (unchanged, so no spurious save). And the timeout path:
`stepGame`'s `'entry'` branch counts to 2112 → `abortNameEntry` → same safe result. Both verified.

**Non-blocking follow-ups (documented, not required for merge):** (1) game.ts:388 reword the mc7-3
"byte-identical" sentence to match the `'over'` branch's "only the clock and the entry-frame counter
tick on"; (2) the pre-existing codebase-wide "// not /** */" scanner rationale is empirically false.

**Handoff:** To SM (Winston Smith / Thrawn) for the finish ceremony.