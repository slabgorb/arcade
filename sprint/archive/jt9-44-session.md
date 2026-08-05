---
story_id: "jt9-44"
jira_key: "jt9-44"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-44: Suppress the wave-entry cue-spam from spawnWavePteros stacking pteros at one coordinate

## Story Details
- **ID:** jt9-44
- **Jira Key:** jt9-44
- **Title:** Suppress the wave-entry cue-spam from spawnWavePteros stacking pteros at one coordinate
- **Points:** 3
- **Priority:** p3
- **Type:** refactor
- **Workflow:** tdd
- **Stack Parent:** none (not stacked)
- **Branch:** main (trunk-based — committed directly)
- **PR:** none (trunk-based, no PR)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-05T14:24:13Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-05T13:58:11+00:00 | 2026-08-05T14:00:29Z | 2m 18s |
| red | 2026-08-05T14:00:29Z | 2026-08-05T14:09:49Z | 9m 20s |
| green | 2026-08-05T14:09:49Z | 2026-08-05T14:16:16Z | 6m 27s |
| review | 2026-08-05T14:16:16Z | 2026-08-05T14:24:13Z | 7m 57s |
| finish | 2026-08-05T14:24:13Z | - | - |

## Sm Assessment

**Decision (user, 2026-08-05):** Build the guard now — NOT WONTFIX. The wave-entry cue burst is to be treated as a real defect and fixed via TDD.

Story is well-scoped for RED. The one live design choice is spread-the-spawn-coordinate vs suppress-duplicate-cues; TEA should pin the observable (the cue burst on an *advancing* wave) and leave the mechanism open for Dev/Architect. No ACs in YAML — TEA defines them at RED. Routing to TEA.

## Story Context

### Root Cause
`spawnWavePteros` in plugins/joust/src/core/demo.ts stacks a wave's whole ptero complement at ONE coordinate.

### Problem
Now that ptero/ptero (jt5-16) and ptero/buzzard (jt9-15 PTEBRD) pairs both resolve collisions, a multi-ptero wave entry landing pteros on buzzards or each other fires a **BURST of enemy-thud cues + hard/ordinary bumps on the entry frame**. The physics is ROM-lawful; the cue timing is un-ROM-like (a real machine spreads spawns).

### Key Dependencies
- **jt9-15:** PTEBRD (ptero-vs-buzzard collision) — now that mixed pairs resolve, the cue-spam becomes observable
- **jt5-16:** ptero/ptero collision pair (referenced context; already done)

### Fixture Constraint
Both jt5-16 and jt9-15 test suites **anchor the wave open**, which stops `spawnWavePteros` advancing. A test here must **let the wave advance** so `spawnWavePteros` actually stacks the pteros and the burst is observable.

### Scope Decision
**TDD story:** Build the guard now (NOT WONTFIX). The wave-entry cue burst is a real defect, to be fixed via TDD. Decide whether to:
1. Spread the wave-stack spawn coordinate (spawnWavePteros), OR
2. Suppress duplicate wave-entry cues

Then guard it.

### Related Memory
- Joust collision port is vertical-only: `toJoustEntity` hardwires `velX:0`; `withBounced` carries only posY/velY
- Horizontal/facing arm (PBUMPX, PFACE) is inert until jt9-17
- Do not assert horizontal arm behavior (would be vacuous in current entity model)

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **[Improvement, non-blocking] TEA RED handoff for Dev.** New failing suite: `plugins/joust/tests/demo-jt9-44.test.ts`.
  - **What's RED:** `maxThudsInOneFrame` is 3 (expected ≤1). Fixture parks a demo at wave 42, strips to players → the next `stepDemo` clears-and-advances into wave 43 (a WPTERO row, `WAVE_TABLE[42]`, status `0xbb` → `(0xbb & 0x0e)>>1 = 5` = WPTERO, 3 pterodactyls). `spawnWavePteros` stacks all 3 at one coordinate (posX 8, identical `pteroFlightEntity`), and on the first collision frame the pass fires **3 `enemy-thud` cues on one frame** — the burst. Non-ptero enemies (lords) hushed each frame so the only thud source is the ptero stack.
  - **The bound is fix-agnostic:** assert only "no frame carries ≥2 enemy-thud cues." **Either** mechanism greens it — SPREAD the spawn coordinate in `spawnWavePteros` (demo.ts:841) so the pteros don't overlap on entry (→ 0 stack thuds), **or** SUPPRESS the duplicate wave-entry enemy-thud cues in the collision/step path (→ ≤1). The suite pins the observable, NOT the mechanism — pick whichever reads better.
  - **Non-vacuity guard:** `pterosOf(d).length === 3` — the ptero COUNT is preserved by both fixes (spread changes coordinates, suppress changes cues; neither drops a ptero), so a regression that stops the spawn reddens the guard instead of masking the burst. Second test pins no kills/deaths (the fix must not cull pteros).
  - **Incidental census bump (already done at RED):** the new test file moved the `audio-seam-scope` derived file count 128→129; `plugins/joust/README.md:48` bumped to match. Not part of the story's RED.
  - **Do NOT assert the horizontal/facing arm** (velX hardwired 0; inert until jt9-17) — vacuous today.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

- **[Dev GREEN, implementation choice] Chose SPREAD over SUPPRESS — grounded in the ROM.**
  - **Mechanism:** `spawnWavePteros` (demo.ts) now enters each ptero on a DISTINCT cliff-appear lane, cycling the ROM's three PTERST clear-areas by index: CLIF5 `$D3-2`=209, CLIF3 `$8A-10`=128, CLIF1 `$51-20`=61 (`PTERO_APPEAR_Y`, cited JOUSTRV4.SRC:1457-1463). Lanes are ≥60px apart → no entry-frame overlap → 0 stack thuds. `pteroProcess` gained an optional `posY` (default = shared `pteroFlightEntity`, so the baiter's single ptero is unchanged).
  - **Why spread, not suppress:** the ROM never stacks a wave's pteros — PTERWV creates them ONE AT A TIME (`PCNAP 65` between each, :2618) and PTERST picks a clear cliff AREA per bird. So the single-coordinate spawn was the port ARTIFACT; suppressing cues would leave the pteros physically triple-bumping every entry, which the machine never does. Spread is both more faithful and lower blast-radius (localized to ptero spawn) than a shared-cue-stream dedup.
  - **Why not the time-stagger PTERWV literally does:** deferring creation would leave <3 pteros present on the entry frame, failing TEA's `pterosOf(d).length === 3` non-vacuity guard. A spatial spread keeps all three present (guard holds) while removing the overlap.
  - **Verification:** `demo-jt9-44` 2/2 green; full joust suite 2781/2781; `npm run lint` clean. No fixtures re-baselined (jt5-16/jt9-15 build their own pteros, untouched).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | 2781/2781 green, lint clean, 0 smells — N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes (1 enabled returned clean; 8 disabled via `workflow.reviewer_subagents`)
**Total findings:** 2 confirmed (1 fixed in place, 1 filed jt9-45), 0 dismissed, 0 deferred. With 8 specialists disabled, findings came from a **mutation battery**, not re-reading the diff.

## Reviewer Assessment

**Verdict: APPROVED**

Small, faithful, well-cited spread fix. The one defect I found (a detached doc-comment) I fixed in place; the one fidelity gap (X-side + time stagger) I filed as jt9-45. Full suite 2781/2781, lint clean after both.

### Observations

1. **[VERIFIED] The spread eliminates the burst.** `spawnWavePteros` assigns `PTERO_APPEAR_Y[i % 3] << 8` per ptero (demo.ts) → lanes 209/128/61, ≥60px apart, far exceeding the 16px broadPhase box, so a stacked-wave entry produces 0 overlapping pairs. `demo-jt9-44` green (was `expected 3 ≤ 1`).
2. **[VERIFIED] The test is non-vacuous AND magnitude-sensitive** — mutation battery: revert to one lane `[209,209,209]` → RED; insufficient spread `[90,91,92]` (inside the collision box) → RED; restored → green. A lazy 1px spread would not fool it.
3. **[LOW][DOC] FIXED IN PLACE:** GREEN inserted `PTERO_APPEAR_Y`'s const+doc *between* `spawnWavePteros`'s existing doc-comment and the function, detaching that doc from its function. Reordered so the const precedes the function's own doc-comment. Re-verified green + lint.
4. **[VERIFIED] Citations accurate** — grepped the vendored `JOUSTRV4.SRC`: PTERST clear-areas `#$D3-2` (:1457), `#$8A-10` (:1460), `#$51-20` (:1463) = 209/128/61; PTERWV `PCNAP 65` between creates (:2618). Decimal conversions correct.
5. **[VERIFIED] No re-stacking edge case** — max pterodactyls in any wave row is 3 (`wave.ts`: 10 rows carry 3, none >3), and exactly 3 lanes are cycled, so every real wave gets three distinct lanes. `i % length` is defensive for an unreachable >3.
6. **[VERIFIED] Baiter untouched** — `baiterProcess` builds its own entity and never calls `pteroProcess`; the new optional `posY` defaults to the shared `pteroFlightEntity` Y, so the single baiter-ptero path is byte-identical.
7. **[VERIFIED] Test self-guards against wave-table drift** — the `pterosOf(d).length === 3` precondition reddens loudly if wave 43 ever stops being a 3-ptero WPTERO row, so the burst bound can never pass vacuously on an empty stack.
8. **[MEDIUM → non-blocking, FILED jt9-45] Partial fidelity.** The fix ports only the spatial (Y) spread. The ROM also (a) randomizes entry SIDE per bird (PTERST `JSR VRAND / BCC` → ELEFT/ERIGHT, :1421-1489) and (b) staggers the complement in TIME (PTERWV `PCNAP 65` between each create, :2618). Pteros still all enter at `posX 8` in horizontal lockstep. Not a defect of the burst fix (the story asked to spread OR suppress; spread is delivered), but the remaining PTERST/PTERWV fidelity is now owned by **jt9-45**.

### Rule Compliance

- **Core purity boundary** (the single most important project rule — `src/core/` must be pure, scanned by a source-text guard): the change is entirely integer arithmetic over frozen constants; no `window`/`document`/`Date.now`/`Math.random`, no shell import. `npx vitest run --project joust` (which runs the purity/core-boundary guard) is green. **Compliant.**
- **Extract-into-shared only on a second consumer:** N/A — no shared extraction; `PTERO_APPEAR_Y` is joust-local, correctly placed in `plugins/joust/src/core/demo.ts`.
- **ROM citations verbatim + accurate:** every JOUSTRV4.SRC line cited was grep-verified against the vendored source (obs. 4). The joust citation gate / claims suite is green. **Compliant.**
- **README derived counts:** the audio-seam-scope file-count census was bumped 128→129 at RED. **Compliant.**

### Devil's Advocate

Suppose this is broken. The most likely break is that the "spread" does not actually spread far enough for some wave — but the largest complement is three and the three lanes are 209/128/61 (gaps 81 and 67), each an order of magnitude past the 16px collision box, and the mutation battery proved an in-box spread still reddens, so an insufficient-spread regression cannot ship green. Could a later ptero drift back onto a neighbour's lane and re-burst mid-wave? No — pteros are gravity-exempt with `velY 0`, so each holds its lane Y forever; they translate in X in parallel and never converge in Y. Could the fix have moved the burst rather than removed it — e.g., to a frame outside my 6-frame window? The window starts at the advance frame and the pteros are collision-eligible immediately (`nap 1`, `collisionEnabled true`); with distinct Ys they never overlap on ANY frame, so there is no later frame to hide in. Could a confused maintainer break it by adding a fourth ptero to a wave? Then `i % 3` re-stacks index 3 onto lane 0 — but that is two pteros sharing a lane, which yields at most one thud/frame (not a burst), and the story is about the burst; still, jt9-45 will supersede the modulo. Could the Y change break rendering or the lance-height duel? Pteros now appear at genuine ROM cliff heights (the ROM's own appear-areas), a player can still reach one on its lane, and the full 2781-test suite — including render/frame source tests — is green. What about a single-ptero wave landing at CLIF5 (209)? One ptero cannot burst, and 209 is a valid ROM appear-area. Nothing here rises to blocking.

### Deviation Audit

- **[Dev GREEN] Chose SPREAD over SUPPRESS (Y-lane spread, ROM-cited)** → ✓ **ACCEPTED by Reviewer.** Agrees with author reasoning and is the more faithful of the two sanctioned options: the ROM never stacks a wave's pteros, so the single-coordinate spawn was the artifact; suppressing cues would have left the pteros physically triple-bumping, which the machine never does. Lower blast-radius than a shared-cue-stream dedup. The remaining time/side fidelity is filed as jt9-45.

## Branch Strategy

**Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

This is a trunk-based repository. Feature branches are not created; work happens directly on the main branch.