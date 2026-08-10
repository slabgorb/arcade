---
story_id: "pm4-6"
jira_key: "pm4-6"
epic: "pm4"
workflow: "tdd"
---
# Story pm4-6: START/coin -> READY -> PLAY (core+shell)

## Story Details
- **ID:** pm4-6
- **Jira Key:** pm4-6
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** pm4-5 (completed)
- **Type:** Feature
- **Points:** 3
- **Priority:** p2
- **Branch:** feat/pm4-6-start-coin-ready-play
- **PR:** https://github.com/slabgorb/arcade/pull/219

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-10T21:53:08Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T21:02:19Z | 2026-08-10T21:04:34Z | 2m 15s |
| red | 2026-08-10T21:04:34Z | 2026-08-10T21:19:20Z | 14m 46s |
| green | 2026-08-10T21:19:20Z | 2026-08-10T21:36:47Z | 17m 27s |
| review | 2026-08-10T21:36:47Z | 2026-08-10T21:53:08Z | 16m 21s |
| finish | 2026-08-10T21:53:08Z | - | - |

## Background

The pm4-5 story (parent, completed) shipped the pure UNWIRED phase machine: `advancePhase(phase, signals)` in `plugins/pac-man/src/core/phase.ts` (boolean-fed, no cadences, no runtime wiring). The GamePhase type in `plugins/pac-man/src/core/game.ts:143` is already `'attract' | 'ready' | 'playing' | 'dying' | 'level-clear' | 'game-over'`.

**Current Verified State (frame 0):** `plugins/pac-man/src/core/house.ts:69` seeds `released: { blinky: true, pinky: false, inky: false, clyde: false }` from a fresh HouseState — Blinky IS released. This story ensures Blinky does NOT move during attract/ready phases.

**Accessibility Override (Permanent):** The user has photosensitive epilepsy — no full-screen flashing/strobe. The READY! freeze must not introduce any strobe. This overrides ROM fidelity where they conflict.

## Acceptance Criteria

1. **START/coin action advances state machine:** A start/coin action from attract or game-over phase advances the state to ready, then to playing (via the READY freeze timer).
2. **Game state is reseeded on start/coin:** A start/coin action calls createGameState to reset all game variables (pacman position, ghosts, dots, etc.).
3. **READY freeze timer gates sim:** The READY phase runs for a specified timer duration before advancing to playing. During this freeze, the simulation does not advance (packed dot counter, ghost state, Pac position remain static), only the intro animation plays.
4. **Blinky constraint during attract/ready:** Blinky must NOT move or animate during attract or ready phases (released state is true, but sim is frozen or gated). Ghost motion is inhibited.
5. **Shell start-key binding:** The shell (main.ts) binds the start key to trigger the coin/start action, advancing from attract → ready → playing.
6. **ROM citations:** Cite pacman.asm:061e (start/player-select) and pacman.asm:36a7 (READY?/PUSH START text). All new core constants are citations.test.ts-gated.
7. **Purity maintained:** purity.test.ts remains green. READY timer and intro freeze are frame-count cadences, seeded, no clock dependencies.

## Delivery Findings

- **Follow-up** (pm4-7, low): the `createAudioDriver` siren self-heal (`src/shell/audio.ts`) re-arms specifically on the `game-over -> playing` edge — the same assumption I fixed in `overlays.ts`. Since a restart now boots to `attract` and reaches `playing` FROM `ready` (not from `game-over`), the ambient siren will not re-arm after a restart. No test covers it and audio wiring for the new phases is pm4-7's scope, so I left it — flagged here so pm4-7 broadens it the same way (fire on leaving `game-over`, or key on entering `ready`/`playing`).
- **Watch-item** (pm4-8, low): while in `attract`/`ready` the overlay driver now paints the `READY!` banner (its `!readyCleared` fallback) because no dot has been eaten. That is harmless today but the attract SCREEN presentation is pm4-8's — it should show attract content, not `READY!`, so pm4-8 will want to gate the banner on `phase === 'ready'`.

### Reviewer (code review)

- **Improvement** (non-blocking): the `overlays.ts` `readyCleared` latch clears only on a `dot-eaten` event (playing-only), so the `READY!` banner now latches through the WHOLE attract screen (indefinitely, no start pressed) plus the 256-frame ready hold — not just ready. Presentation-only, no strobe (accessibility-safe). Affects `plugins/pac-man/src/shell/overlays.ts` (gate the banner on `phase === 'ready'`). Scope: pm4-8 (attract-screen presentation); confirms Dev's watch-item above. *Found by Reviewer during code review (rule-checker #14).*
- **Improvement** (non-blocking): `READY_HOLD_FRAMES` (=256, game.ts:103) is documented to match `src/shell/tune.ts`'s `THEME_FRAMES` (=256) but no test enforces the coupling — core/shell purity forbids `game.ts` importing `tune.ts`, so the two literals agree by construction, not by an enforced check; a future edit to the baked intro streams would silently desync the comment's claim. Value is correct today (verified vs glossary §Music + `tune.test.ts`). Affects `plugins/pac-man/src/core/game.ts` (soften the comment to "informed by, not locked to" the intro length, or add a cross-import assertion in the SHELL test layer where both constants are importable). *Found by Reviewer during code review (rule-checker #26).*

## Design Deviations

### Dev (implementation)

- **Broadened `overlays.ts` GAME-OVER/READY self-heal beyond the core+shell-key scope**
  - Spec source: context-story-pm4-6.md, AC5 (shell) + the core lifecycle ACs
  - Spec text: pm4-6 wires the core lifecycle + the shell start key; the overlay (pm3-7) is not named in scope.
  - Implementation: changed `src/shell/overlays.ts` self-heal from `prevPhase === 'game-over' && game.phase === 'playing'` to `&& game.phase !== 'game-over'`, and updated its now-false "only ever game-over->playing" comment.
  - Rationale: the attract boot (an in-scope core change) made a restart flip `game-over -> attract`, not `-> playing`, which broke the EXISTING `overlays.test.ts` restart test. The one-line broadening is the minimal correct fix; the alternative (leaving it) ships a latched GAME OVER banner forever after a restart.
  - Severity: minor
  - Forward impact: minor — pm4-8 (attract screen) and pm4-7 (audio analog, see Delivery Findings) build on this; the audio driver still needs the same broadening.

- **READY_HOLD_FRAMES is honest-uncited (256), and :061e/:36a7 are cited in source comments, not dossier claims**
  - Spec source: context-story-pm4-6.md, AC6; epic context "every new src/core constant carries a citations.test.ts-gated claim"
  - Spec text: "Cite pacman.asm:061e (start/player-select) and pacman.asm:36a7 (READY?/PUSH START text). All new core constants are citations.test.ts-gated."
  - Implementation: `READY_HOLD_FRAMES = 256` carries an honest-uncited comment (no isolable ROM duration literal; it matches the §Music-cited start-intro length, same policy as `FRUIT_VISIBLE_FRAMES`). `:061e`/`:36a7` are cited in the `GameInput.start` comment with ACCURATE roles verified against the vendored source (`:061e` = `ld a,(#4e6e)` Credits read, physical line 950; `:36a7` = the "1 CREDIT" attract message-table entry, physical line 7768) — NOT added to dossier prose, so `citations.test.ts` requires no new claim.
  - Rationale: the story's own descriptions were loose (`:36a7` is the credit/message table, not literally "READY?/PUSH START"); citing the true roles avoids a fabricated citation. The READY duration has no clean ROM literal, so the established honest-uncited policy applies rather than inventing an address. Keeping the two pointers out of dossier prose avoids the byte-drift risk of a hand-typed verbatim claim for a mechanism (not a value) reference.
  - Severity: minor
  - Forward impact: minor — if the Reviewer requires `:061e`/`:36a7` promoted to byte-verified dossier claims (matching the `:0195` master-state precedent in glossary.md §Cabinet state machine), that is a follow-up; the source-comment citations are accurate as written.

### Reviewer (audit)

- **Broadened `overlays.ts` self-heal (Dev deviation 1)** → ✓ ACCEPTED by Reviewer: the attract boot is an in-scope core change, and `game-over -> attract` (not `-> playing`) is the correct new restart edge; `!== 'game-over'` is the minimal correct fix and cannot fire spuriously (game-over is terminal within a GameState). The residual READY!-through-attract behavior is filed as a non-blocking pm4-8 Improvement, not a reason to reverse this fix.
- **READY_HOLD_FRAMES honest-uncited + `:061e`/`:36a7` source-comment citations (Dev deviation 2)** → ✓ ACCEPTED by Reviewer: both citations verified byte-for-byte against the vendored source (lines 950/7768) with accurate roles — correctly NOT parroting the story's loose "READY?/PUSH START" wording; the honest-uncited cadence follows the established `FRUIT_VISIBLE_FRAMES` policy and the value matches glossary §Music. The unenforced 256/256 coupling is the separate LOW #26 Improvement (soften the comment), not a flaw in the deviation itself. Promotion to dossier claims is optional, not required.
- No UNDOCUMENTED deviations found: every spec divergence (attract boot, sim gate, reseed, citation policy, the test blast-radius) was logged by TEA/Dev; the `#24` retirement sweep is complete.

## Sm Assessment

Setup complete; routing to TEA for the RED phase.

**Board state at setup (verified, not assumed):** `git fetch --prune` then `git branch -r | grep -i pm4-6` returned no branches; the only live sibling session across `a-*` checkouts was a-1 on mc10-6 (unrelated). Board clean — no contention on pm4-6 or its pac-man files.

**Dependency:** parent pm4-5 is `done`. It shipped the pure UNWIRED phase machine — `advancePhase(phase, signals)` in `plugins/pac-man/src/core/phase.ts` (boolean-fed, no cadences) — and the extended `GamePhase` type at `plugins/pac-man/src/core/game.ts:143`. pm4-6 is the runtime-wiring successor: bind START/coin -> READY -> PLAY into game.ts's mainline, add the READY! freeze timer, reseed `createGameState`, and add the shell start-key binding.

**Falsifiable premise — MEASURED TRUE, not copied blind:** the story asserts "today house.released.blinky=true from frame 0." Verified against the current tree: `plugins/pac-man/src/core/house.ts:69` seeds `released: { blinky: true, pinky: false, inky: false, clyde: false }` in a fresh HouseState. The bug is live. AC work must keep Blinky stationary during attract/ready.

**ACs are DERIVED, not verbatim:** `sprint/epic-pm4.yaml` carries `acceptance_criteria: null` for pm4-6, so sm-setup derived the criteria from the story title/description (same shape as jt8-6). They rest on the verified-true premise above, so no correction banner was warranted — but TEA should treat them as derived and cross-check against the ROM citations (`pacman.asm:061e` start/player-select, `pacman.asm:36a7` READY?/PUSH START) rather than as boss-blessed spec.

**Standing constraints for TEA/Dev:**
- **Accessibility (permanent, overrides ROM fidelity):** user has photosensitive epilepsy — the READY!/intro freeze must introduce no full-screen strobe.
- **Core/shell purity:** new state-machine logic is core (`src/core/`), seeded/clock-free; the start-key binding is shell (`src/shell/`). The purity test scans core source text.
- **Citations:** any new core constant is `citations.test.ts`-gated; cite from the vendored ROM source, no fabricated line/verbatim pairs.

Fixed the `sm-setup` gaps found on disk: added the missing `**Repos:** arcade` field; single `**Phase:**` pointer confirmed. Claim branch `feat/pm4-6-start-coin-ready-play` pushed empty (tip == develop) so the sibling probe lights up.
## Tea Assessment

RED landed and verified. Two new files, committed `6756a62f`:
- `plugins/pac-man/tests/core/lifecycle.test.ts` — the core wiring (AC1-4, AC7-adjacent).
- `plugins/pac-man/tests/shell/main-lifecycle.test.ts` — the shell start-key seam (AC5), a `?raw` source scan (the SH3-4 pattern; the observable half is the review playtest).

**RED evidence (verified directly, not via testing-runner):**
- `npx vitest run --project pac-man` → **7 failed | 332 passed (339)**. The 7 failures are exactly the 2 new files; all 26 other files stay green — no collateral, because `createGameState` still returns `'playing'` today.
- `npm run lint` (tsc) → the only new errors are 6× **TS2353 `'start' does not exist in type 'GameInput'`** — the deliberate type-extension RED (pm4-5's technique). Zero TS2367; I routed every manual phase-set through a `forcePhase` helper so the suite goes **fully green (vitest + lint)** once Dev wires it, with no permanent red left behind.
- 4 tests pass today by design — the green guards (start inert during play, start inert at game-over, the `currentDir()` seam untouched, and "a non-start frame holds attract").

**The contract this RED pins (names Dev must satisfy):**
1. `GameInput` gains `start?: boolean` (the only new public-type surface).
2. `createGameState(...).phase === 'attract'` — the boot flip the game.ts:141 comment already promises.
3. `stepGame` gates the WHOLE sim in `attract` and `ready` (Pac, ghosts incl. released Blinky, dot count all frozen), wires `advancePhase`, runs a READY hold, and on the attract→ready edge reseeds via `createGameState` **preserving `highScoreTable`**.
4. Shell `main.ts` feeds a `start` field into the sim-input object `pumpFrame` builds.

I deliberately did **not** pin the READY frame count, the hold-counter field name, or any citation line — the freeze test MEASURES the hold, and `citations.test.ts` is the gate for the new constant. Dev/Architect pick the cited cadence.

**⚠ Blast radius Dev owns during GREEN (not yet done):** flipping `createGameState` to boot `'attract'` will redden every existing `game.test.ts` test that does `createGameState(N)` then `stepGame(...)` expecting immediate play (e.g. `:392` asserts `phase === 'playing'`; ~15 call sites). Those tests must be updated to **begin play first** (press start, run the READY hold out — the `beginPlay` shape in lifecycle.test.ts is the template). This is expected, in-scope GREEN churn — the pm4-5 scope fence explicitly deferred it here. It is invisible in today's RED because the flip hasn't happened yet.

**⚠ Implementation hazard (lang-review TS #14 — derived edge in one branch):** the attract/ready gate must be ONE uniform check (mirror the existing `if (state.phase === 'game-over') return` at game.ts:430), not per-subsystem guards. A partial gate that freezes Pac but not the ghosts ships the exact reported bug (Blinky moving in attract) — my AC4 + AC3 freeze tests observe the whole `worldPose`, so a partial gate reddens them. Likewise `readyExpired` must be computed at the step's single exit.

**⚠ Derived-AC correction (carried from SM, now pinned as a guard):** AC1's "from attract **or game-over**" over-reaches the shipped, ROM-cited pm4-5 machine — `advancePhase('game-over', {startRequested})` stays `game-over` (only `overExpired`→attract, which is pm4-10). A start press must NOT add a game-over→ready edge; doing so would also redden pm4-5's `phase.test.ts`. Guarded by `start does NOT advance game-over`.

### Rule Coverage (lang-review/typescript.md)
- **#15 / #25 (token-vs-claim, whole-file search scope):** the shell assertion anchors `start` INSIDE the matched `({ dir: currentDir() … })` factory literal (code-bounded on both sides), not a bare file-wide `/start/`; verified RED (mechanism absent) and it goes green only when the field is added to that object.
- **#18 / #26 (fixture value IS the expectation / all-local terms):** the reseed test compares to a real `createGameState(SEED)` baseline and imported `DEFAULT_LIVES` — every asserted term comes from the code under test, none are test-local literals.
- **#14 (derived edge in one branch):** flagged to Dev above; the freeze tests observe the full world pose so a one-branch gate is caught.
- **#1 / #8 (type-safety escapes / test quality):** no `as any`, no `@ts-ignore`; the single `as PacHighScoreTable` cast is on a well-formed `{name,score,level}` literal matching the exported row shape.
- **#4 (`||` vs `??`):** none introduced.
- **Purity (AC7):** covered by the standing `purity.test.ts` core sweep — it auto-arms on the new game.ts code; a READY frame counter is a plain number (no clock/entropy), so it stays green. Not re-tested redundantly here.

Handing off to Dev (Korben) for GREEN.
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/pac-man/src/core/game.ts` — `GameInput.start` field; `GameState.readyFrames` field; `READY_HOLD_FRAMES = 256` (honest-uncited, = the §Music start-intro length); `createGameState` boots `phase: 'attract'` (was `'playing'`) + seeds `readyFrames: 0`; `startCabinet` (the AC2 reseed, preserving `highScoreTable`); and the mainline guards at the top of `stepGame` — `attract`/`ready` freeze the whole sim and drive the pure `advancePhase` machine (attract --start--> ready, ready --READY_HOLD--> playing).
- `plugins/pac-man/src/main.ts` — a start/coin latch (Space / `1` / `5`) set on keydown and folded into the sim input as `({ dir: currentDir(), start: consumeStart() })` (AC5).
- `plugins/pac-man/src/shell/overlays.ts` — self-heal broadened to un-latch on `game-over -> any` (a restart now boots to `attract`); stale comment corrected. See Design Deviation.
- `plugins/pac-man/tests/core/game.test.ts` — 17 sim-mechanic tests routed through a new local `playingGame(seed, table?)` helper (createGameState now boots `attract`); the two createGameState-specific tests (spawn carry, ghost-house geometry) keep `createGameState`.
- `plugins/pac-man/tests/core/ghost-eyes.test.ts`, `plugins/pac-man/tests/shell/eyes-render.test.ts` — `phase = 'playing'` added to the `eatGhost`/`eatBlinky` setup helpers (same blast radius).
- `plugins/pac-man/tests/shell/overlays.test.ts` — restart-test comments updated to the new attract-boot lifecycle (assertions unchanged, still green).

**How the ACs are met:**
- AC1 attract --start--> ready; AC2 reseed via `startCabinet`/`createGameState` keeping the high-score table; AC3 the READY! freeze holds `READY_HOLD_FRAMES` with the sim frozen then advances to playing; AC4 Blinky (and all actors) frozen in attract/ready via the top-of-`stepGame` gate; AC5 the shell start key feeds `start` into the sim input; AC6 `:061e`/`:36a7` cited accurately (see deviation); AC7 purity green — `readyFrames`/`READY_HOLD_FRAMES` are plain frame counts, no clock/entropy.

**Tests:** pac-man project **339/339 passing (GREEN)**; full fleet **14370 passing / 1 todo**; orchestrator **457/457**; `npm run lint` clean. (Verified by direct runs, not testing-runner.)

**Branch:** feat/pm4-6-start-coin-ready-play (pushed)

**Handoff:** To review.
## Reviewer Assessment

**Verdict:** APPROVED

pm4-6 wires the START/coin -> READY -> PLAY cabinet mainline cleanly. Enabled specialists preflight + security returned clean; the rule-checker backstop returned 2 non-blocking findings (1 MEDIUM presentation regression scoped to pm4-8, 1 LOW constant-drift doc gap). No Critical or High. Six specialists were disabled via settings — I hand-covered their domains and tagged each below.

**Data flow traced:** a start-key press (Space/1/5, main.ts keydown) -> `startPressed` latch -> `consumeStart()` folds it into the sim input `({ dir, start })` -> `stepGame` in `attract` -> `advancePhase('attract',{startRequested})` -> `startCabinet` reseeds + enters `ready` -> after 256 frozen frames `advancePhase('ready',{readyExpired})` -> `playing`. Safe: `start` is `!!`-coerced, inert outside attract (mutation-confirmed), and the reseed preserves the high-score table by reference.

Tagged observations (disabled specialists hand-covered):

[PRE] Preflight clean — pac-man 339/339, orchestrator 457/457, lint clean, zero code smells (no console.log/innerHTML/.skip/TODO).

[SEC] Security clean — no clock/entropy/DOM in src/core/ (verified by grep); `startCabinet` reseeds deterministically from the existing seed; keydown does a Set membership check only, no injection sink. Confirms my own purity read.

[RULE] Rule-checker (backstop) — 2 findings, both CONFIRMED non-blocking:
  - [MEDIUM] overlays.ts:94 (#14) — the `readyCleared` latch clears only on 'dot-eaten' (playing-only), so READY! now paints through the whole attract screen + the 256-frame ready hold. Presentation-only, no strobe (accessibility-safe); attract-screen presentation is pm4-8's scope. Re-filed as a non-blocking Improvement. Not a correctness regression.
  - [LOW] game.ts:103 (#26) — READY_HOLD_FRAMES=256 is documented to match tune.ts THEME_FRAMES=256 but no test enforces the coupling (purity forbids the import). Value correct today (verified vs glossary §Music + tune.test.ts); risk is silent future drift. Recommend softening the comment or a shell-layer cross-import test. Non-blocking.

[EDGE] Boundary conditions verified — the READY hold flips on exactly the 256th ready frame (readyFrames 0->256, `>=`); a start press is inert during ready (advancePhase ignores startRequested there) and during play/game-over (mutation-confirmed guards); `!!input.start` handles undefined. Evidence: game.ts:475-488.

[SILENT] No swallowed errors — no try/catch added; `Object.assign` reseed cannot throw here; `consumeStart` always returns a bool. Evidence: game.ts startCabinet, main.ts consumeStart.

[TEST] Test quality strong — the reseed test compares to a real `createGameState(SEED)` baseline (not test-local literals; #18/#26 clean), the freeze test MEASURES the hold rather than hardcoding it, the AC5 regex anchors to the input-factory literal (#15/#25 clean). Rule-checker mutation-tested 4 guards live — all reddened correctly. `forcePhase` avoids the TS2367 narrowing trap so the type-RED was only the intended `start` extension.

[DOC] Comments verified accurate — READY_HOLD_FRAMES "256 frames / bass 256 / melody 248" matches glossary §Music (lines 633/640) and tune.test.ts; `:061e`/`:36a7` match the vendored source byte-for-byte (lines 950/7768, accurate roles — NOT the story's loose "READY?/PUSH START" wording); the stale overlays "only ever game-over->playing" comment was correctly replaced. Only DOC nit is the #26 coupling over-claim (LOW).

[TYPE] Type design clean — `start?: boolean`; `readyFrames: number`; `START_KEYS: ReadonlySet<string>`; `Object.assign(state, createGameState(...))` returns GameState with no escape. No `as any`/`@ts-ignore`; the single `as PacHighScoreTable` is on a well-formed {name,score,level} literal.

[SIMPLE] No over-engineering — `startCabinet`/`consumeStart` are small single-purpose helpers; the three sequential phase guards mirror the existing `if (game-over) return` idiom. `START_KEYS` includes legacy 'spacebar' (harmless). No dead code.

**Accessibility (epilepsy override):** the READY freeze is a STATIC hold — the sim is frozen, nothing animates or strobes during ready. AC-compliant, verified.

**Minor watch-item (LOW, non-blocking):** a stray start-key press during game-over sets the latch; after an Enter-restart the first sub-step can consume it and skip attract straight to ready. Benign and self-correcting (the player pressed coin+Enter to play). Noted.

**#24 retirement sweep:** the createGameState 'playing'->'attract' flip was applied everywhere it steps (game.test.ts playingGame, ghost-eyes eatGhost, eyes-render eatBlinky); phase/purity/main-lifecycle don't step from fresh. Independently confirmed by grep + the green suite.

**Handoff:** To SM for finish-story.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (hand-covered — see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings (hand-covered — see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings (hand-covered — see [TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings (hand-covered — see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (hand-covered — see [TYPE]) |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings (hand-covered — see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 (both non-blocking: 1 MEDIUM deferred to pm4-8, 1 LOW doc), dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned, 6 disabled pre-filled)
**Total findings:** 2 confirmed (0 blocking), 0 dismissed, 0 deferred