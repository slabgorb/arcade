---
story_id: "pm4-8"
jira_key: "pm4-8"
epic: "pm4"
workflow: "tdd"
---
# Story pm4-8: Self-playing attract demo (core)

## Story Details
- **ID:** pm4-8
- **Jira Key:** pm4-8
- **Workflow:** tdd
- **Stack Parent:** pm4-5 (done)
- **Branch:** feat/pm4-8-attract-self-play-driver
- **PR:** https://github.com/slabgorb/arcade/pull/224

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-11T07:16:56Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-11T06:39:14Z | 2026-08-11T06:42:02Z | 2m 48s |
| red | 2026-08-11T06:42:02Z | 2026-08-11T06:55:29Z | 13m 27s |
| green | 2026-08-11T06:55:29Z | 2026-08-11T07:06:10Z | 10m 41s |
| review | 2026-08-11T07:06:10Z | 2026-08-11T07:16:56Z | 10m 46s |
| finish | 2026-08-11T07:16:56Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Conflict, non-blocking — RESOLVED by ROM ruling] (TEA/Leeloo, red):** The derived
  **AC-4 "any input → ready" over-reaches.** In the ROM the attract demo exits ONLY on a
  coin/START (gated on the credit count — `pacman.asm:061e` reads `(#4e6e)` Credits, the
  credit/PUSH-START table `:36a7`; cited at `game.ts:242-247`). The joystick is INERT
  during attract — pm4-6's shipped green guard "a non-start frame in attract holds"
  (`lifecycle.test.ts:100-105`) is ROM-faithful and I kept it. Per **ROM-always-wins**, I
  encoded the ROM reading, NOT the literal "any input": the auto-player drives Pac
  regardless of `input.dir`, and only `start` exits + reseeds (`startCabinet`). **Dev:**
  do NOT make a bare direction press leave attract; that would redden `lifecycle.test.ts:100-105`.

- **[Question, non-blocking — flagged fragility] (TEA/Leeloo, red):** the different-seed
  determinism test (`attract-demo.test.ts`, "different seeds diverge…") is the ONE test
  with an implementation-quality dependency. The seed's ONLY consumer during the demo is
  the frightened-ghost random turn (`mode.ts:75` `rng: createRng(seed)`; every scatter/
  chase duration is ROM-fixed and seed-independent). So two seeds run byte-identical UNTIL
  the auto-player eats an energizer and a frightened ghost turns. The test therefore
  REQUIRES the demo to reach an energizer within 8000 frames (a legitimate "the maze plays
  itself" quality bar). **Dev/Reviewer:** if the intended auto-player deliberately avoids
  energizers, this test needs renegotiation rather than weakening — the same-seed
  reproducibility test is the load-bearing determinism guarantee.

- **[Improvement, non-blocking] (TEA/Leeloo, red):** the "demo never self-exits attract"
  test (2400 frames, phase pinned) is a **green guard** — it passes today (frozen) and must
  STAY green after GREEN. mc6-4 pins the phase back to `attract` after running the sim
  (`missile-command/src/core/game.ts:428`); pm4-8's running sim can drive Pac into a ghost
  (collision → dying/game-over in `playing`, `game.ts:718-736`), so Dev must pin the phase
  back the same way or the demo will self-exit on the first death.

### Dev (implementation)
- **Question** (non-blocking): Leeloo's flagged different-seed test is now robust and GREEN — the
  energizer-first router reaches a power pellet and the seeds diverge as predicted. No renegotiation
  needed. Affects nothing (`plugins/pac-man/tests/core/attract-demo.test.ts` passes as written).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): pm4-9 should know the attract demo maze **reseeds to a full board
  whenever the demo Pac is caught** (the loop mechanism). Affects `plugins/pac-man/src/core/game.ts`
  (attract branch) — the shell attract renderer must not assume one continuous demo run.
  *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the attract demo loops on Pac's DEATH but not on a board CLEAR —
  the level-clear edge is gated on `phase === 'playing'` (`game.ts:748`), which is `attract` during
  the demo, so if the auto-player ever ate all 240 dots the router would return 'none' and Pac would
  idle while ghosts move. Affects `plugins/pac-man/src/core/game.ts` (attract branch). Unlikely
  (deaths reseed the board long before a full clear) and cosmetic (attract is unrendered until pm4-9),
  but a follow-up could reseed on board-clear too. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

3 deviations

- **Extracted the playing sim into `stepPlayingSim(state, input)` (game.ts)**
  - Rationale: reuse the IDENTICAL sim so the demo can never drift from real play; no duplication.
  - Severity: minor (pure refactor — all 354 pac-man tests stay green, `playing` behaviour identical)
  - Forward impact: none — internal seam; the public surface (`stepGame`/`createGameState`) is unchanged.
- **The attract demo LOOPS by reseeding a fresh board when the auto-player's Pac is caught**
  - Rationale: cleanest loop — deterministic per seed, no negative-lives / stray name-entry residue.
  - Severity: minor
  - Forward impact: **pm4-9 (shell attract presentation)** — the attract maze visibly resets to a
- **Auto-player routes to the nearest ENERGIZER first (then nearest dot), via BFS**
  - Rationale: makes Leeloo's flagged different-seed test robust by construction (it reached an
  - Severity: minor
  - Forward impact: none — routing policy is internal; can be tuned later without an API change.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **(TEA/Leeloo, red) Overturned pm4-6 AC4 in `lifecycle.test.ts:79-90`.** The spec: pm4-6
  asserted "the whole sim is frozen during attract — Blinky must not move." pm4-8 deliberately
  makes the attract demo play itself, so that assertion is now false BY DESIGN. Replaced it
  in-place with "the sim is LIVE during attract" (Blinky moves over 60 no-input frames) and
  annotated the file header. Every other pm4-6 guard (READY freeze, start-reseed, inert-start,
  joystick-holds-attract) is untouched and still green. Anticipated by the epic
  (`freeze-pauses.test.ts:12-13`); this is an expected overturn, not a regression.

### Dev (implementation)
- **Extracted the playing sim into `stepPlayingSim(state, input)` (game.ts)**
  - Spec source: context-story-pm4-8.md, Background §2 ("reuse `stepGhost`, run the same sim")
  - Spec text: mc6-4 runs the SAME combat sim in attract (`stepCombat(attractDriver(state), …)`)
  - Implementation: pulled `stepGame`'s former inline playing body (Pac move/eat, fruit, mode,
    ghost loop, collision, level-clear) into a private `stepPlayingSim`; `stepGame`'s playing
    path now calls it, and the attract branch calls it with the auto-player's dir.
  - Rationale: reuse the IDENTICAL sim so the demo can never drift from real play; no duplication.
  - Severity: minor (pure refactor — all 354 pac-man tests stay green, `playing` behaviour identical)
  - Forward impact: none — internal seam; the public surface (`stepGame`/`createGameState`) is unchanged.
- **The attract demo LOOPS by reseeding a fresh board when the auto-player's Pac is caught**
  - Spec source: TEA Delivery Finding (Improvement) above; mc6-4 parity
  - Spec text: "the demo NEVER leaves 'attract' on its own; … pin the phase back … or it will
    self-exit on the first death"
  - Implementation: after `stepPlayingSim` in attract, if the collision path flipped the phase
    off `attract`, `Object.assign(state, createGameState(state.seed, state.highScoreTable))` —
    a fresh, same-seed demo board — instead of pinning a corrupted (life-decremented / name-entry)
    state. mc6-4 pins the phase directly because a lost city doesn't end its combat sim; Pac's
    death DOES flip the phase, so the pac-man adaptation reseeds.
  - Rationale: cleanest loop — deterministic per seed, no negative-lives / stray name-entry residue.
  - Severity: minor
  - Forward impact: **pm4-9 (shell attract presentation)** — the attract maze visibly resets to a
    full board each time the demo Pac dies; the presentation layer should expect that, not assume a
    single continuous demo run.
- **Auto-player routes to the nearest ENERGIZER first (then nearest dot), via BFS**
  - Spec source: context-story-pm4-8.md AC-7 + TEA Delivery Finding (Question, different-seed)
  - Spec text: "different seed → different"; the seed's only consumer is the frightened-turn rng
  - Implementation: `attract.ts` `autoPlayDir` BFS-targets remaining energizers before dots, so the
    demo reliably eats a power pellet and enters frightened mode — which is what makes two seeds
    diverge. A pure deterministic router (no seed/clock), mc6-4's "no entropy of its own".
  - Rationale: makes Leeloo's flagged different-seed test robust by construction (it reached an
    energizer and diverged), and shows the classic power-pellet chase in the demo.
  - Severity: minor
  - Forward impact: none — routing policy is internal; can be tuned later without an API change.

### Reviewer (audit)
- **TEA: Overturned pm4-6 AC4 (attract frozen → live)** → ✓ ACCEPTED: the epic explicitly
  anticipated it (`freeze-pauses.test.ts:12-13`); every other pm4-6 guard stays green. Sound.
- **Dev: Extracted `stepPlayingSim`** → ✓ ACCEPTED: behaviour-preserving reuse (all 354 pac-man
  tests green, `playing` path identical); the single-sim seam is the correct mc6-4 shape.
- **Dev: Demo loops by reseeding on a demo death** → ✓ ACCEPTED: the ROM-faithful pin-to-attract
  adaptation for a game whose death flips the phase; deterministic per seed, no life/name-entry
  residue. Verified by the 2400-frame never-self-exit test.
- **Dev: Auto-player targets energizers first** → ✓ ACCEPTED: makes the flagged different-seed
  determinism test robust by construction (it reached an energizer and diverged), and is a
  faithful demo (power-pellet chase). Pure/deterministic — no entropy of its own.
- **UNDOCUMENTED (found by Reviewer, FIXED forward):** `game.ts:494-495` (the pm4-6 MAINLINE
  overview) still listed `attract` among the frozen phases ("freeze it: nothing moves") directly
  above the pm4-8 demo code — a stale, factually-false comment. The rule-checker's "attract
  freezes" string sweep (rule 24) missed this phrasing ("`attract` … freeze it"). Corrected in a
  doc-only commit (`a7ef0d5c`); re-verified lint + pac-man 354/354 green. Comment-only, zero
  behaviour change — hence fixed in place rather than bounced for a full round.

## Tea Assessment

**RED (Leeloo / TEA), 2026-08-11.** Tests-first suite for the seeded self-playing attract
demo. All tests drive only the public surface (`createGameState` + `stepGame`), never the
driver's internal shape — Dev owns the auto-player's implementation.

**Files:**
- NEW `plugins/pac-man/tests/core/attract-demo.test.ts` — the pm4-8 suite (6 tests).
- EDIT `plugins/pac-man/tests/core/lifecycle.test.ts` — flipped the pm4-6 frozen-attract
  assertion (see Design Deviation) + header note.

**RED verified DIRECTLY** (not via testing-runner — it confabulates test names): full
`--project pac-man` run = **5 failed / 348 passed**, and the 5 failures are exactly the
pm4-8 tests, each failing because attract is frozen today (Pac/Blinky don't move, no
energizer reached). `npm run lint` (tsc, repo-wide) is **GREEN** — the tests are type-clean.
No collateral regressions. The 2 non-RED pm4-8 tests are intentional green guards
(never-self-exit; joystick-inert).

**AC coverage:**
- AC-1 (seeded Pac drive) → liveness test + same-seed determinism (non-vacuous).
- AC-2 (reused `stepGhost` runs) → liveness asserts Blinky moves.
- AC-3 (dots consumed) → liveness asserts `dotsEaten > baseline`; start-reseed asserts
  `dotsEaten > fresh` before the coin.
- AC-4 (input → ready) → RULED ROM-faithful (see Delivery Finding): only coin/START exits +
  reseeds; joystick inert. Tested both directions.
- AC-5 (purity) → covered by the existing `tests/purity.test.ts` core-boundary scanner,
  which auto-scans Dev's new src/core file. No duplicate test added.
- AC-6 (reconcile lifecycle.test.ts) → done (Design Deviation).
- AC-7 (three test classes) → seeded-demo, ordinary-input, determinism control (same +
  different seed) all present.

**Rule Coverage:**
- **Core purity** (project rule, machine-enforced): `tests/purity.test.ts` scanner covers the
  new driver file automatically — the driver must be clock-free and seeded (no `Date`/
  `performance`). No new test needed; this is the strongest guard for AC-5.
- **Citations gate** (`tests/audit/citations.test.ts`): any NEW cited constant Dev adds for the
  auto-player (a demo cadence / step size, mirroring mc6-4's `AUTSPD`) must carry a ROM
  citation — Dev's obligation at GREEN. My tests add no constants.
- **TS lang-review** (Dev pre-handoff): flagging for Dev — no `as any`/double-cast in the
  driver; use `??` not `||` for frame counts (0 is valid); no non-null assertions on the
  nullable `returning[id]`; exhaustiveness on any `Dir`/mode switch.

**Handing to Dev (Korben Dallas) for GREEN.** The mc6-4 driver
(`missile-command/src/core/game.ts:279-334`, `:422-429`) is the design reference: an
`attractDriver(state)` run inside `stepGame`'s attract branch, the SAME sim running with the
phase pinned back to `attract`.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/pac-man/src/core/attract.ts` (NEW) — `autoPlayDir(pac)`: pure, deterministic BFS
  router. Targets the nearest remaining energizer first, then the nearest dot; returns the
  first-step `Dir`, decides only at tile centres. No seed, no clock (mc6-4's "no entropy of its own").
- `plugins/pac-man/src/core/game.ts` — (1) extracted the playing sim into `stepPlayingSim(state,
  input)`; (2) the `attract` branch now runs the demo (`stepPlayingSim` with the auto-player's
  dir) and reseeds a fresh same-seed board if a demo death flips the phase, so the demo loops and
  never self-exits; (3) START still exits attract → ready + reseed, the joystick stays inert.

**Approach:** the demo reuses the IDENTICAL playing sim (including `stepGhost`) — the only new
code is the router. Determinism is structural: `autoPlayDir` is a pure function of the board, so
same-seed replays byte-for-byte, and the sole seed-consumer (the frightened-turn rng, `mode.ts:75`)
is what makes different seeds diverge — exactly the model TEA's tests encode.

**Tests:** pac-man **354/354** GREEN (the 5 pm4-8 REDs now pass). `npm run lint` (tsc, repo-wide)
GREEN. `npm run test:orchestrator` **457/457** GREEN. No regressions in the `playing` path (the
extraction is behaviour-preserving). The previously-fragile different-seed test reached an
energizer and diverged as designed.

**AC status:** AC-1 ✓ · AC-2 ✓ · AC-3 ✓ · AC-4 (ROM-faithful) ✓ · AC-5 purity ✓ · AC-6 lifecycle
reconciled ✓ · AC-7 three determinism classes ✓.

**Branch:** feat/pm4-8-attract-self-play-driver (pushed)
**Handoff:** To review (Reviewer / Jean-Baptiste Emanuel Zorg)

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — lint clean, pac-man 354/354, orch 457/457, 0 debug residue |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (BFS bounds, mid-tile, board-clear edge) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (no swallowed errors; reseed is explicit) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (tests non-vacuous; different-seed truly diverged) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered; FOUND stale comment game.ts:494-495 (fixed) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered (no as-any; guarded shape-cast; typed router) |
| 7 | reviewer-security | Yes | clean | none | N/A — pure client core; BFS bounded; determinism intact |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered (no dead code; extraction removed duplication) |
| 9 | reviewer-rule-checker | Yes | clean | none (31 rules, 0 violations) | N/A — confirmed clean; corroborates purity/scope/determinism |

**All received:** Yes (3 enabled returned — all clean; 6 disabled pre-filled and hand-covered)
**Total findings:** 0 confirmed blocking; 1 LOW [DOC] found by Reviewer and FIXED forward; 1 LOW [EDGE] deferred to pm4-9 (non-blocking)

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `GameInput` in attract → `game.ts:501-519`. A `start` press feeds the pure
`advancePhase('attract', {startRequested})` (phase.ts) → `startCabinet` reseed → `ready`. With no
start, `input.dir` is DISCARDED and `autoPlayDir(state.pac)` supplies Pac's direction into
`stepPlayingSim`; a demo death that flips the phase triggers a same-seed reseed. Safe: no external
input reaches numeric/geometric code (positions are internal sim state), and the joystick cannot
desync the phase machine (only the ROM-cited `start` edge leaves attract).

**Pattern observed:** single-sim reuse — `stepPlayingSim` (game.ts) is the one body driven by both
the real player (`playing`) and the auto-player (`attract`), so the demo can never drift from real
play. Mirrors mc6-4 (`missile-command/src/core/game.ts:428`). Good pattern.

**Error handling:** the router never throws and always returns a walkable `Dir` or 'none' (BFS
gated by `isWalkable`); the demo-death path is handled explicitly by reseed, not swallowed.

**Observations (8):**
- [VERIFIED] Determinism is structural — `autoPlayDir` (attract.ts:88-105) reads only its `pac`
  param + static, never-mutated maze tables; same-seed replay is byte-identical (attract-demo.test.ts
  determinism test green). Complies with the core determinism/purity rule.
- [VERIFIED] BFS terminates and is DoS-safe — `firstStepToward` (attract.ts:46-78) is iterative,
  bounded by a `seen` set ≤ `MAZE.cols*rows` (1008), no recursion. Corroborated by [SEC].
- [VERIFIED] Core purity — attract.ts imports only ./maze, ./actor, ./pacman; no Date/performance/
  Math.random/DOM (tests/purity.test.ts green over the new file). Corroborated by [SEC] and [RULE].
- [VERIFIED] Extraction is behaviour-preserving — `stepPlayingSim` is called from both the playing
  and attract paths; pac-man 354/354 green, the `playing` path is byte-identical (evidence: game.ts
  the body moved verbatim, `state.events=[]` still cleared once at stepGame top).
- [VERIFIED] ROM-faithful exit — only `start` leaves attract; the joystick is inert (game.ts:501-519),
  and the pm4-6 guard `lifecycle.test.ts:100-105` ("a non-start frame in attract holds") stays green.
- [SEC] reviewer-security: clean — no network/auth/secrets; input cannot corrupt state; BFS bounded.
- [RULE] reviewer-rule-checker: clean — 31 rules (26 TS lang-review + 5 pac-man) across 22 instances,
  0 violations; purity/citations/core-shell-boundary/scope all confirmed. The `queue.shift() as {…}`
  (attract.ts:65) judged compliant [TYPE] (guarded shape-cast, not as-any). Tests non-vacuous [TEST]
  (rules 18/26). pm4-8 comments verified by re-run [DOC] (rule 17). No hidden-branch edge [EDGE]
  (rule 14) — the reseed is deliberately attract-exclusive. No complexity [SIMPLE].
- [LOW][DOC] STALE COMMENT — game.ts:494-495 listed `attract` among frozen phases ("freeze it:
  nothing moves") directly above the pm4-8 demo. The rule-checker's "attract freezes" string sweep
  missed this phrasing. FIXED forward (doc-only commit a7ef0d5c), re-verified 354/354 + lint green.
- [LOW][EDGE] the demo loops on death but not on a board-clear (game.ts:748 gated on `playing`);
  if the demo ate all 240 dots Pac would idle. Non-blocking, unlikely, deferred to pm4-9 (Delivery Finding).

**Dispatch tags present:** [SEC] clean · [RULE] clean · [DOC] one found+fixed · [EDGE] hand-covered
(board-clear idle, LOW) · [SILENT] hand-covered (none — reseed explicit) · [TEST] hand-covered
(non-vacuous, different-seed diverged) · [TYPE] hand-covered (guarded cast, typed router) ·
[SIMPLE] hand-covered (no dead code; extraction removed duplication).

### Rule Compliance
- **Core purity** (no Date/performance/Math.random/DOM/shell): attract.ts + game.ts changes — COMPLIANT
  (purity.test.ts green over new file; [SEC]+[RULE] confirm).
- **Citations gate**: attract.ts introduces no ROM-cited numeric constant (SEARCH_DIRS is an algorithmic
  tie-break, not a ROM figure) — citations.test.ts green — COMPLIANT.
- **Core/shell boundary**: attract.ts imports only core modules — COMPLIANT.
- **Determinism (seeded only)**: router is a pure fn of the board; the sole seed-consumer is the
  pre-existing frightened-turn rng — COMPLIANT.
- **Scope (core-only)**: diff touches only src/core + tests/core; no shell/plugin.ts/registry.ts /
  showcase flip — COMPLIANT (pm4-9 owns those).
- **TS lang-review (26 checks)**: no as-any / `||`-fallback-on-falsy / bad imports / vacuous tests —
  COMPLIANT (rule_checker 0 violations).
- **Accessibility (no full-screen flash, pm4-1/epilepsy)**: pm4-8 adds no rendering and no strobe;
  the level-clear "freeze, NO flash" path is untouched — COMPLIANT.

### Devil's Advocate
Suppose this code is broken. The auto-player is a greedy BFS with no ghost-awareness — a malicious
premise would be that Pac walks straight into a ghost and the demo dies constantly, and on every
death we `Object.assign(state, createGameState(...))`. Could that thrash? No: reseed happens at most
once per frame, is O(board), and the demo simply restarts — bounded work, no unbounded growth, no
stack use. Could the reseed corrupt tracking? It reuses `state.seed` and `state.highScoreTable`, so
the persisted board survives and determinism holds (the same-seed test would have caught a divergence
— it is green). What about a confused maintainer? The biggest trap was the stale MAINLINE comment
claiming attract freezes — that WOULD mislead the pm4-9 author into thinking nothing runs in attract;
I fixed it. What if the demo eats every dot? Then the router returns 'none' and Pac idles while ghosts
roam, because level-clear is gated on `playing` — a genuine (if unreachable-in-practice) rough edge,
logged as a non-blocking Delivery Finding for pm4-9 rather than papered over. What about the tunnel?
`neighbour` wraps x on the tunnel row exactly like `wrapThroughTunnel`, and off-row out-of-bounds
neighbours resolve to walls via `tileAt`, so BFS never escapes the board. What about a stressed input
stream — spamming `start`? Each start is the pure `advancePhase` edge; it reseeds to `ready` and the
demo is gone, which is correct. What about non-determinism sneaking in? The only entropy is the seeded
rng, verified by both the same-seed (identical) and different-seed (diverges only post-energizer) tests;
`autoPlayDir` touches no clock and no `Math.random`, confirmed by the purity scanner and two specialists.
I tried to make this code fail and it held. The one real defect was documentation, now fixed; the one
rough edge is unreachable and logged. Nothing rises to Critical or High.

**Handoff:** To SM for finish-story.

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

3 deviations

- **Extracted the playing sim into `stepPlayingSim(state, input)` (game.ts)**
  - Rationale: reuse the IDENTICAL sim so the demo can never drift from real play; no duplication.
  - Severity: minor (pure refactor — all 354 pac-man tests stay green, `playing` behaviour identical)
  - Forward impact: none — internal seam; the public surface (`stepGame`/`createGameState`) is unchanged.
- **The attract demo LOOPS by reseeding a fresh board when the auto-player's Pac is caught**
  - Rationale: cleanest loop — deterministic per seed, no negative-lives / stray name-entry residue.
  - Severity: minor
  - Forward impact: **pm4-9 (shell attract presentation)** — the attract maze visibly resets to a full board each time the demo Pac dies; the presentation layer should expect that, not assume a single continuous demo run.
- **Auto-player routes to the nearest ENERGIZER first (then nearest dot), via BFS**
  - Rationale: makes Leeloo's flagged different-seed test robust by construction (it reached an energizer and diverged), and is a faithful demo (power-pellet chase).
  - Severity: minor
  - Forward impact: none — routing policy is internal; can be tuned later without an API change.

## Sm Assessment

**Setup (Ruby Rhod / SM), 2026-08-11.** Board probed clean before setup: no
`origin/*pm4-8*` branch, sibling a-1 on mc10-6 (unrelated), no open arcade PRs.
Dependency **pm4-5 is `done`** (phase machine + `advancePhase`).

**Premise refutation (recorded because the epic YAML still asserts the old phrasing).**
The epic title says the maze plays itself "(ghost AI already runs)". That is imprecise
against the tree: during `attract` the sim is **frozen** — `plugins/pac-man/src/core/game.ts:493-504`
returns early after only checking start/coin ("nothing moves — not Pac, not the ghosts").
"ghost AI already runs" = the ghost AI **code** (`ghost.ts` `stepGhost`) exists and is to
be **reused**, NOT that it executes during attract today. pm4-8 must un-freeze/step the
sim in attract. Facts encoded in the context Background; ACs were **derived** (epic
`acceptance_criteria: null`) and banner-marked as such.

**Blast radius (expected RED, not a regression).** pm4-8 deliberately overturns
`plugins/pac-man/tests/core/lifecycle.test.ts:79-88` — `pm4-6 AC4: the whole sim is
frozen during attract — Blinky must not move`. Anticipated by the epic authors
(`freeze-pauses.test.ts:12-13`). TEA reconciles/replaces that assertion.

**Scope: CORE-ONLY.** Seeded pure driver in `plugins/pac-man/src/core/`, no clock,
`purity.test.ts` stays green. Shell attract presentation + high-score ladder is **pm4-9**;
the `showcase: false -> true` flip (`plugins/pac-man/plugin.ts:12`, `src/host/registry.ts`)
is OUT OF SCOPE here. Handing to TEA for RED.