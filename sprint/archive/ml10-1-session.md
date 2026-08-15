---
story_id: "ml10-1"
jira_key: "ml10-1"
epic: "ml10"
workflow: "tdd"
---
# Story ml10-1: Wire checkOverlap — the millipede segment-vs-segment OVRLAP turn — into stepMillipede

## Story Details
- **Story:** ml10-1
- **Jira Key:** ml10-1
- **Epic:** ml10 (Millipede — unwired-code findings)
- **Workflow:** tdd
- **Type:** bug
- **Points:** 3
- **Repos:** arcade
- **Assignee:** Keith Avery
- **Slug:** wire-checkoverlap-into-stepmillipede
- **Branch:** feat/ml10-1-wire-checkoverlap-into-stepmillipede

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-15T23:03:06Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-15T22:30:17Z | 2026-08-15T22:32:37Z | 2m 20s |
| red | 2026-08-15T22:32:37Z | 2026-08-15T22:40:01Z | 7m 24s |
| green | 2026-08-15T22:40:01Z | 2026-08-15T22:42:52Z | 2m 51s |
| review | 2026-08-15T22:42:52Z | 2026-08-15T22:54:02Z | 11m 10s |
| green | 2026-08-15T22:54:02Z | 2026-08-15T22:57:01Z | 2m 59s |
| review | 2026-08-15T22:57:01Z | 2026-08-15T23:03:06Z | 6m 5s |
| finish | 2026-08-15T23:03:06Z | - | - |

## Acceptance Criteria

1. **stepMillipede consults checkOverlap in the head reaction sequence at the ROM ordering (mushroom/OBSTAC turn, then OVRLAP overlap turn, then edge/free-space):** a marching head that overlaps a live in-front segment turns and drops a row.

2. **The overlap turn is pinned to the ROM** (the 13$/MILLI.MAC:1541 JSR OVRLAP ordering + MLSUB.MAC:896-912) with citations, and a parked score (0xFF) or dead segment (colour ≥ 0xC0) does NOT trigger the turn — checkOverlap's existing semantics are preserved.

3. **A test drives the behaviour through stepMillipede** (the real producer), not a direct checkOverlap call, and fails if the call is removed; no regression to the mushroom-turn, split-on-turn, edge-turn, or player-collision paths.

## Context Notes

**IMPORTANT:** The existing millipede-split-death.test.ts data test on checkOverlap **PASSES TODAY while the turn is dead**. This proves nothing about wiring correctness — the RED test MUST exercise the real stepMillipede head-reaction path to detect when checkOverlap is missing from the wiring. A data test on checkOverlap in isolation stays green as long as the function itself is correct, regardless of whether it's called from production code.

**What is wired:**
- checkOverlap is fully implemented at plugins/millipede/src/core/millipede.ts:405
- It is tested in isolation (millipede-split-death.test.ts)
- Its dead-floor guard (colour ≥ OVRLAP_DEAD_MIN 0xC0) and parked-score guard (0xFF) already exist

**What is NOT wired:**
- checkOverlap has ZERO production callers; the head reaction sequence in stepMillipede never consults it
- The confession comment at plugins/millipede/src/core/millipede.ts:300 describes the gap

**ROM facts (do not invent beyond these):**
- The no-turn branch runs JSR OVRLAP FIRST (13$, MILLI.MAC:1541)
- OVRLAP turn is defined at MLSUB.MAC:896-912
- Ordering: mushroom/OBSTAC turn → OVRLAP overlap turn → edge/free-space handling

**Seam:** plugins/millipede/src/core/millipede.ts (the head reaction sequence in stepMillipede)

## SM Assessment

**Premise verified against the current tree before setup** (the falsifiable claims all held):
- `checkOverlap` is defined at `plugins/millipede/src/core/millipede.ts:405`.
- ZERO production callers — every reference outside the definition sits in `plugins/millipede/tests/millipede-split-death.test.ts`.
- The confession comment at `plugins/millipede/src/core/millipede.ts:300` reads exactly as the story quotes it, including the OBSTAC→OVRLAP→edge/free-space ordering.

No correction block was needed; the epic description is current and honest — a straight wiring story, not a stale-premise trap. My same-day unwired-code audit independently lists `checkOverlap` as tested-but-uncalled, corroborating the gap.

**Sibling probes (both clean):** no `ml10` branch existed on the remote before setup; the only live sibling sessions are `df3-5` (a-1) and `df3-3` (a-2) — neither touches millipede. Claim now pushed on `feat/ml10-1-wire-checkoverlap-into-stepmillipede`, so the story is no longer invisible.

**The load-bearing gate for TEA:** the existing `millipede-split-death.test.ts` data test on `checkOverlap` PASSES today while the turn is dead — it proves nothing about wiring. The RED test MUST drive the head-reaction path through the real `stepMillipede` and fail if the `checkOverlap` call is absent. This is called out in AC3 and the Context Notes.

**Routing:** phased `tdd` workflow → hand off to TEA for the RED phase.

## TEA Assessment (RED — Han Solo)

**RED test:** `plugins/millipede/tests/millipede-overlap-turn.test.ts` (commit `85c119d8`), 11 tests across three ACs (6 red, 5 green regression/guard).

**RED evidence (full millipede project, not just the new file):** `npx vitest run --project millipede` →
`6 failed | 1321 passed | 6 skipped (1333)`. All 6 failures are the positive-turn assertions
(`expected 126 to be 128` — the head coasts at `v` 0x80 where the OVRLAP wiring must make it descend to
0x7E). Every other millipede test is untouched: the RED is caused **solely** by `checkOverlap` having zero
production callers. Lint (`npm run tsc --noEmit`, repo-wide) is clean.

**Why this is a real RED (the load-bearing point):** the existing `millipede-split-death.test.ts` data test
calls `checkOverlap` directly and PASSES today while the turn is dead — it proves the function is correct,
not that anything calls it. Every assertion here drives the behaviour through the real `stepMillipede` and
reads the head's `v`: a turn descends one step (`move(seg, true)` subtracts `dv`), a coast leaves `v`
unchanged. Delete the wired `checkOverlap` call after GREEN and the positive turns revert to a coast and
fail again — the story's "fails if the call is removed" requirement.

**What GREEN (Dev / Yoda) must ship:** wire `checkOverlap` into `stepMillipede`'s head reaction at the ROM
ordering — OBSTAC (mushroom) turn → **OVRLAP (overlap) turn** → edge/free-space — reusing `checkOverlap`
AS-IS. `checkOverlap(segs, headIndex)` needs the whole segment array and the head's index, so the head
reaction (`stepSegment`, `plugins/millipede/src/core/millipede.ts:295-315`) must receive those — thread them
down from `stepMillipede`'s `map((seg, i) => …)`. Cite `MILLI.MAC:1541` (the 13$ JSR OVRLAP ordering) and
`MLSUB.MAC:896-912`. The OVRLAP check must NOT be nested inside the `if (field)` OBSTAC branch — AC-1's
"independent of the field" test guards that. Pure core change; the `purity.test.ts` sweep watches `src/core`.

**Test-shape notes for the reviewer:**
- The turn/coast observable is `v` (0x7E turn vs 0x80 coast) on an 8px-boundary head (v&7==0, so the
  MT-19 mid-drop short-circuit doesn't fire), mid-screen (not at an edge), two live segments (no last-head
  speed-up so `dv` stays 2). Controls hold every variable fixed except the in-front segment's position.
- ROM **ordering** (OVRLAP after OBSTAC, before edge) has no distinct behavioural observable — both branches
  call `move(seg, true)`, producing the same `v` drop. It is enforced by the source citation + reviewer,
  not by a behavioural assertion; AC-2's "independent of field" is the closest behavioural proxy.
- No existing test locks the current no-overlap-turn behaviour, so GREEN reddens nothing that must be
  hand-updated. The mushroom-turn regression is covered by the untouched `obstac.test.ts` (re-run in GREEN's
  verify); AC-3 here pins the edge-turn and free-space-coast branches that sit downstream of the new check.

### Rule Coverage
- **lang-review #26 (self-checking assertions):** all ROM constants (`HEAD_COLOR`, `BODY_COLOR`,
  `SCORE_COLOR` 0xFF, `OVRLAP_DEAD_MIN` 0xC0, `POISON_COLOR`, `LEFT_EDGE`) are hand-mirrored with citations,
  independent of the module under test — expectations are not read back from it.
- **Meaningful assertions (no vacuous):** every test asserts a concrete `v`/`color` value or a
  `toBeLessThan` inequality; each guard-negative is PAIRED with a live-overlap positive in the same block so
  the negative discriminates rather than restating a coincidental coast. No `let _ =`, no `assert(true)`,
  no is-none-on-always-none.
- **Boundary/edge coverage:** dead-floor boundary (0xC0 skipped vs 0xBF collidable), direction reversal
  (marching left flips "ahead"), different-line rejection, parked-score (0xFF) rejection, and the
  field-independence of the OVRLAP branch.

## Delivery Findings

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev Delivery (GREEN — Yoda) — commit `ef233738`

**What shipped:** `checkOverlap` wired into `stepSegment`'s head reaction at the ROM ordering — OBSTAC
(mushroom, 12$) → **OVRLAP (13$, `MILLI.MAC:1541` JSR OVRLAP + `MLSUB.MAC:896-912`)** → edge/free-space.
Three surgical edits to `plugins/millipede/src/core/millipede.ts`:
1. `stepSegment` gains `segs: readonly Segment[]` + `headIndex: number` params (the private helper is called
   only by `stepMillipede`, so the signature change is contained).
2. `if (checkOverlap(segs, headIndex)) return move(s, true)` inserted between the OBSTAC block and the edge
   turn — NOT nested in `if (field)`, so it is independent of the mushroom field (AC-1 guard).
3. `stepMillipede`'s `map((seg, i) => …)` threads `segs, i` down.
The stale confession comment ("…NOT wired by any story yet…") was replaced with a cited wiring comment.
`checkOverlap` itself is UNCHANGED — reused as-is with its 0xC0 dead-floor and 0xFF parked-score guards.

**GREEN evidence:** `npx vitest run --project millipede` → `81 files passed, 1327 passed | 6 skipped`
(the 6 previously-red ml10-1 assertions now pass; zero regressions; `purity.test.ts` green — the core
change is pure). Lint (`tsc --noEmit`, repo-wide) clean.

**Design note (why passing the ORIGINAL `segs` to checkOverlap is correct):** `checkOverlap` reads
`head = segs[headIndex]` (the pre-step segment), so the last-head speed-up applied to the local `s` is not
reflected — this is intentional and harmless: an overlap requires ≥2 live segments, and the speed-up only
fires when exactly 1 segment is live, so the two conditions never co-occur. The direction EOR
(`head.dh & 0xff`) therefore always sees the authentic pre-step `dh`. No behavioural difference exists
between passing `segs` and reconstructing the sped-up head.

**Scope kept minimal:** head reaction only (mirrors the head-only OBSTAC/edge turns); no body/split/EXPLOD
changes; no new exports or helpers.

### Dev Rework (round 1 → GREEN — Yoda) — commit `780ee242` (+ verdict stamp `6b568cbc`)

Addressed both round-1 review findings — **comment-only, zero behaviour change**:
1. **[MEDIUM SCOPE header]** `plugins/millipede/src/core/millipede.ts` lines ~35-39: appended an ml10-1 note to the top-of-file SCOPE block mirroring the ml3-6 mushroom-turn precedent — OVRLAP is now wired as the head overlap-turn (13$, MILLI.MAC:1541). **Self-checked for a fresh #17 lie** (the cp7-6 trap): my first draft said OVRLAP "stays the split's detector too", but `splitOnTurn` does not call `checkOverlap` and the story premise is ZERO prior production callers — so I corrected it to the accurate "checkOverlap was added with the ml3-2 split/death work but sat with no production caller until ml10-1 — this is its first" (verified: checkOverlap lives in the ml3-2 block; grep confirms ml10-1's wiring is its only production caller).
2. **[LOW test header]** `plugins/millipede/tests/millipede-overlap-turn.test.ts` lines ~5-13: softened to past tense and dropped the volatile line anchors (the removed `:300` confession comment and the stale `checkOverlap ... :405` cite), keeping the stable ROM citation.

**Re-verify:** lint (`tsc --noEmit`) clean; `npx vitest run --project millipede` → 81 files, 1327 passed, 6 skipped, 0 failed. `git diff --stat` for the rework: 2 comment-only files (+ the epic-YAML verdict stamp). The code and tests are byte-identical in behaviour to the approved-implementation round.

## Round-1 Subagent Results (SUPERSEDED by round 2)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 (pre-existing develop red) | confirmed 0 blocking, 1 pre-existing (not this story) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (test quality assessed by reviewer + rule-checker) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 1 (SCOPE header), confirmed 1 LOW (test header line-refs) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings (readonly/types assessed by rule-checker) |
| 7 | reviewer-security | Yes | clean | none | N/A — pure sim core, no external surface |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed (same SCOPE header, #17) — corroborates #5 |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 2 confirmed (1 MEDIUM [DOC]/[RULE] convergent, 1 LOW [DOC]), 0 dismissed, 1 pre-existing-non-mine noted

## Round-1 Reviewer Assessment (Obi-Wan Kenobi) — REJECTED, SUPERSEDED by round 2

**Verdict (round 1): REJECTED** — one confirmed MEDIUM documentation defect (a live in-file contradiction) plus one LOW stale line-ref, both trivial comment-only fixes. No Critical/High; the code and tests are correct. The rejection is bounded to two comment edits — do not touch code or tests.

### Findings

1. **[DOC][RULE] MEDIUM — stale top-of-file SCOPE header** at `plugins/millipede/src/core/millipede.ts:28-38`.
   The header still reads "…PLAY (player collision — ml3-2) and OVRLAP (**the split — ml3-2**). **None of those subsystems exist yet**…" and lists the split among the "deferred" items — yet this very diff wires OVRLAP into the head reaction 12 lines below (and correctly updated the inline comment there). The header has an **established precedent** of incremental amendment in this exact block: ml3-6 appended "ml3-6 wired the mushroom-turn: stepMillipede now takes an OPTIONAL `field`…" on line 35. **Flagged independently by BOTH `reviewer-comment-analyzer` (medium) and `reviewer-rule-checker` (#17, high confidence)** and confirmed by my own read. This is the exact lang-review #17 defect (a file shipping a claim its own code contradicts, in the same commit). Cosmetic in behaviour, but this is the founding story of the ml10 "wire dead seams" epic — every later ml10 story updates this same header, so the pattern must be set correctly now.
   **Fix:** append a short clause mirroring the ml3-6 precedent, e.g. note that ml10-1 wired OVRLAP as the head's standalone overlap-turn (13$, `MILLI.MAC:1541`), so it is no longer split-only/deferred.

2. **[DOC] LOW — stale line references in the RED test header** at `plugins/millipede/tests/millipede-overlap-turn.test.ts:11` (and the `:405` anchor in the same paragraph). It says "The confession comment at src/core/millipede.ts:300 spells this out" in the present tense, but GREEN **removed** that comment; `checkOverlap`'s anchor `:405` is now `:411` post-diff. This matches the plugin's RED-header house convention (narrating pre-fix state — cf. `bee.test.ts`, `ddt.test.ts`), which is why it is LOW, but the literal line numbers are now false in a permanent file.
   **Fix:** soften to past tense / drop the literal line numbers (e.g. "the confession comment that stood at `millipede.ts:300` before this story").

### Rule Compliance (TypeScript lang-review checklist)
- **#1 type-safety escapes** — [VERIFIED] no `as any`/`as unknown as T`/`@ts-ignore`/unsafe `!` in the diff (rule-checker grep + my read). The one cast is `as Partial<MillipedeModule>` — legitimate narrowing of a dynamic import.
- **#2 readonly on array params** — [VERIFIED] `segs: readonly Segment[]` at `millipede.ts:259`, matching the sibling `checkOverlap`/`stepMillipede` signatures.
- **#14 derived edge in one branch** — [VERIFIED not-applicable] the `checkOverlap` call at `millipede.ts:314` is on the single shared per-head reaction path (reached only after vacant/pic/mid-drop/body/poison have returned), executed once per `stepSegment`. It mirrors the ROM's own single ordered path (12$ OBSTA0 → 13$ OVRLAP → 15$), not a value split across sibling branches. Confirmed against `MILLI.MAC:1520-1542`.
- **#17 comments asserting a mechanism** — the new inline comment (`:308-313`) is VERIFIED accurate (all four claims checked against ROM by comment-analyzer + rule-checker); the SCOPE header is the VIOLATION above.
- **#18 / #26 test apparatus fails-by-passing / all-local assertions** — [VERIFIED] every `expect` compares a test-local constant against a value the REAL module returns (`out[0].v`, `out[0].color`, `m.checkOverlap(...)`); `TURN_V`=0x7E is hand-derived, never imported. Mutation-proven sensitive (see below).
- **#31 purity** — [VERIFIED] `purity.test.ts` re-run green; the change adds only a readonly param, an index, and a pure boolean call. No clock/RNG/DOM.
- **#32 no invented constants** — [VERIFIED] all six hand-mirrored ROM values (HEAD/BODY/SCORE/POISON colours, OVRLAP_DEAD_MIN 0xC0, LEFT_EDGE) checked byte-for-byte against `MILLI.MAC`/`MLSUB.MAC` by rule-checker.

### Observations
- **[VERIFIED] mutation-sensitive wiring** — `reviewer-rule-checker` deleted the `checkOverlap` guard (`if (false && …)`) and re-ran: exactly the 6 turn-asserting tests reddened, the 5 controls stayed green. The test genuinely proves the wiring, satisfying AC-3's "fails if the call is removed." Evidence: rule-checker probe, file restored, `git diff --stat` clean.
- **[VERIFIED] segs[headIndex] always in bounds** — the only caller is `stepMillipede`'s `segs.map((seg,i)=>…segs, i…)` (`:338`), so `headIndex` is `Array.map`'s own index; `checkOverlap` reads a defined element. Corroborated by `[SEC]` reviewer-security.
- **[VERIFIED] ROM ordering is behaviourally invisible but source-correct** — OVRLAP (13$) sits after OBSTAC (12$, which early-returns on turn/poison) and before the edge turn; both OVRLAP and edge call `move(s,true)`, so ordering can't be asserted behaviourally, but the source order matches `MILLI.MAC` and is cited.
- **[VERIFIED] passing the original `segs` (not the mutated `s`) to checkOverlap is correct** — the only divergence (last-head speed-up) fires solely at `liveCount===1`, where `checkOverlap` is always false (no second live segment), so the pre-step vs post-step `dh` never changes the outcome. ROM-faithful for `liveCount≥2` (no speed-up there either).
- **[SEC] clean** — no external input surface; bitwise arithmetic absorbs degenerate input; no type escapes.
- **[PREFLIGHT] pre-existing develop red (NOT this story)** — the orchestrator suite fails 1 ("no tracked image sits loose at the repo root": census.png, field*.png, milli-*.png, showcase*.png). I verified these 13 PNGs are tracked on `origin/develop` and my branch touches none of them (`git diff develop...HEAD` = 5 files, no images). This is a pre-existing topology violation, not introduced by ml10-1; flag for the finish trial-merge and a possible follow-up, but it does not block this story.

### Devil's Advocate
Suppose this wiring is subtly broken. The first attack: `checkOverlap` reads `segs[headIndex]`, the *pre-step* segment, while the reaction operates on the leg-animated, possibly speed-adjusted local `s`. Could a head that has been sped up look at the wrong direction and turn (or fail to turn) on a phantom overlap? No — the speed-up only fires at `liveCount===1`, and a lone live head has no other live segment for `checkOverlap` to find, so it always returns false there; for `liveCount≥2` the `dh` is untouched, matching what the ROM's OVRLAP sees. Second attack: does the call fire on a segment that isn't really a head — a parked score (0xFF) or a dead segment (≥0xC0) sitting in the array as the *subject*? Those are filtered upstream (vacant/pic guards) exactly as they were before this diff, and `checkOverlap`'s own candidate scan skips ≥0xC0; the AC-2 dead/score tests pin this and passed. Third attack: ordering — could OVRLAP steal a turn the mushroom path should own, or vice-versa? The OBSTAC block early-returns on a turn/poison, so OVRLAP is only reached on OBSTAC fall-through, matching 12$→13$; and both a mushroom turn and an overlap turn produce the same `move(s,true)`, so no observable is lost. Fourth attack: a confused *reader* — and here the code genuinely misleads. The file's own SCOPE header tells a maintainer that OVRLAP is unwired and deferred, directly contradicting the code they're reading; on an epic whose whole job is wiring these seams, the next author will trust that header and mis-scope their story. That is the one real defect, and it is why this is a (bounded) reject rather than an approve. Fifth: does deleting the wiring silently pass? Proven no, by mutation. The behaviour is sound; the record is not yet.

### Correlation tags present: [DOC] [RULE] [SEC]

## Subagent Results

_(Round 2 — the CURRENT/canonical results. Round-1 table above is superseded.)_

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (GREEN, comment-only) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | clean | none (both round-1 findings CLOSED, no fresh lie) | confirmed closed |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none (comment-only, no posture change) | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (#17 CLOSED, no new #17/#20/#24) | confirmed closed |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred — both round-1 findings verified CLOSED

## Reviewer Assessment (Obi-Wan Kenobi) — round 2

**Verdict: APPROVED**

The round-1 rework was comment-only and both findings are verified CLOSED by two independent specialists plus my own read; no fresh inaccuracy was introduced, and no code or test behaviour changed.

### Findings closure (blessed)
1. **[DOC][RULE] SCOPE header (was MEDIUM) — CLOSED.** `plugins/millipede/src/core/millipede.ts` now appends an ml10-1 note mirroring the ml3-6 precedent. Every clause independently verified: the wiring/citation ("via checkOverlap (13$, `MILLI.MAC:1541`)") is exact — `reviewer-rule-checker` confirmed `MILLI.MAC:1541` is `13$: JSR OVRLAP` and `:1528` is `BEQ 13$ ;NO OBSTACLE` (the no-obstacle fallthrough, validating the OBSTAC→OVRLAP ordering); "added with the ml3-2 split/death work" confirmed via `git show 77376b57`; "first production caller" confirmed by exhaustive grep (`checkOverlap`'s only non-test caller is `stepSegment` at `millipede.ts:318`, added in `ef233738`; `splitOnTurn` does not call it). Confirmed by `reviewer-comment-analyzer` AND `reviewer-rule-checker`.
2. **[DOC] test header (was LOW) — CLOSED.** `plugins/millipede/tests/millipede-overlap-turn.test.ts` now reads in past tense, dropped the removed-`:300` confession reference and the stale `:405` anchor, and retains only the verified ROM cites (`MLSUB.MAC:896-912`, `13$/MILLI.MAC:1541`). `grep` confirms no stray non-ROM line number remains.

### FYI (out of scope — NOT a finding, do not rework)
`reviewer-comment-analyzer` noted the ml3-1 baseline sentence still labels OVRLAP as "(the split — ml3-2)", where strictly OVRLAP is the overlap/turn check and the *split* is `splitOnTurn` (`MILLI.MAC:~1560-1591`, still unwired). This loose label predates ml10-1 (unchanged since ml3-1 commit `27afdbd5`) and is untouched by this diff — rejecting on it would be goalpost-moving. Worth a one-line polish in a future ml10 story that touches this header, or a tiny follow-up chore; it does not block ml10-1.

### Verification summary
- **[PREFLIGHT] GREEN** — lint clean; `npx vitest run --project millipede` = 1327 passed / 6 skipped / 0 failed; delta confirmed comment-only (zero non-comment ± lines).
- **[SEC] clean** — comment-only, no posture change from round 1.
- **Round-1 substantive verification still stands** (code unchanged since `ef233738`): mutation-proven wiring (deleting the `checkOverlap` guard reddens exactly the 6 turn-tests), all ROM constants cited byte-for-byte, `readonly` correct, purity green, `segs[headIndex]` in-bounds.
- **Pre-existing (NOT this story):** the orchestrator suite's "no tracked image sits loose at the repo root" failure is a develop-level topology violation (13 root PNGs tracked on `origin/develop`, none touched by this branch). Flag for the finish trial-merge; not a blocker.

### Correlation tags present: [DOC] [RULE] [SEC]

## Design Deviations

No deviations recorded.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->