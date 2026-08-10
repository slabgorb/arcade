---
story_id: "mc7-3"
jira_key: "mc7-3"
epic: "mc7"
workflow: "tdd"
---
# Story mc7-3: Wire name entry end-to-end (KEYBOARD)

## Story Details
- **ID:** mc7-3
- **Jira Key:** mc7-3
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none
- **Branch:** feat/mc7-3-name-entry-wire-keyboard-persistence

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-10T20:18:13Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T13:43:38Z | 2026-08-10T13:45:14Z | 1m 36s |
| red | 2026-08-10T13:45:14Z | 2026-08-10T16:42:13Z | 2h 56m |
| green | 2026-08-10T16:42:13Z | 2026-08-10T17:17:14Z | 35m 1s |
| review | 2026-08-10T17:17:14Z | 2026-08-10T19:51:39Z | 2h 34m |
| green | 2026-08-10T19:51:39Z | 2026-08-10T20:09:08Z | 17m 29s |
| review | 2026-08-10T20:09:08Z | 2026-08-10T20:18:13Z | 9m 5s |
| finish | 2026-08-10T20:18:13Z | - | - |

## SM Assessment

**Setup — mc7-3 (5pt, tdd, missile-command / mc7 epic).** Story is in the current sprint (TO Sprint 2633). mc7-2 (name-entry core + initials buffer) landed approved; mc7-3 wires that work end-to-end with keyboard input and localStorage persistence, adding the missing stepGame 'entry' freeze guard that mc7-2's reviewer flagged as a non-blocking forward finding.

**Spec scope (user-provided mandate):**

All four items, in TDD order — each becomes a RED test:

1. **FREEZE-GUARD LANDMINE (mc7-2 Reviewer forward finding, non-blocking but #1 must-fix).** stepGame currently has freeze branches for 'over'/'pause'/'setup'/'between'/'attract' but NONE for 'entry'. Once mc7-3 wires enterNameEntry into the frame loop, a stepGame call during 'entry' falls through to stepCombat (runs the battle) and nextPhase flips 'entry'→'over', silently dropping the entry screen + initials buffer. FIX: add `if (state.phase === 'entry') return { ...state, frame: state.frame + 1, soundEvents: [] }` (matching the 'over'/'pause' branches) + a freeze test. This is a src/core change — purity.test.ts and citations.test.ts must stay green.

2. **REACH ENTRY FROM A QUALIFYING GAME-OVER.** Wire enterNameEntry into the frame loop so a qualifying final score routes to 'entry' instead of straight to 'over'. Core already exposes enterNameEntry/stepInitials/commitNameEntry/abortNameEntry (pure, reusing @shared/name-entry) and GameState.highScores (seeded DEFAULT_HIGH_SCORES, carried across restart) + initials + MC_INITIALS_LEN=3. Use qualifiesForHighScore to decide entry-vs-over.

3. **SHELL KEYBOARD INPUT.** The shell feeds the DOM KeyboardEvent.key to the core's stepInitials (which delegates to @shared/name-entry stepNameEntry: A-Z appends uppercased up to maxLength, Backspace deletes), and commits on ENTER via commitNameEntry (asteroids' direct-typing flow is the reference). Match how asteroids/joust/pac-man shells wire keyboard name entry — the implementing agent should read those shells for the exact pattern. Keep core pure: the shell decides WHEN to feed keys, core decides what a key MEANS.

4. **LOCALSTORAGE PERSISTENCE (one origin).** Shell reads the ladder on boot and writes on commit under highScoreKey('missile-command'), reusing the asteroids/joust @shared/highscore consumer pattern (qualifiesForHighScore, insertHighScore, highScoreKey). Core stays pure — it owns the table/qualifies/initials; the shell holds ONLY load-on-boot + save-on-commit. This is the one-origin localStorage the whole cabinet shares.

**Derived Acceptance Criteria (TDD test groups):**

- **AC-A: stepGame freezes 'entry' phase.** stepGame returns `{ ...state, frame: state.frame + 1, soundEvents: [] }` during 'entry'; no combat/nextPhase advance. A test for this guard (+ that it does NOT advance to 'over'/run combat) must pass.
- **AC-B: Qualifying game-over reaches 'entry'.** qualifiesForHighScore returns true → step with phase='over' routes to 'entry'; non-qualifying game-over goes to 'over' unchanged (not 'entry'). 
- **AC-C: Shell keyboard input.** Typing letters fills initials (A-Z uppercase, up to 3 chars), Backspace deletes, Enter commits + inserts into the ladder. No trackball, no ROM 30s timeout, no start-switch abort (all deliberately out for fleet consistency).
- **AC-D: localStorage persistence.** Boot reads the ladder from localStorage under highScoreKey('missile-command'); commit writes it back. The ladder is cabinet-wide (one-origin localStorage).
- **AC-E: purity.test.ts + citations.test.ts stay green.** No clock/entropy/DOM in core; new constants carry claims.

**Dependencies verified:**
- **mc7-1 DONE** — highscore table, qualifiesForHighScore, insertHighScore in plugins/missile-command/src/core/highscore.ts.
- **mc7-2 DONE** — 'entry' phase in state.ts, enterNameEntry/stepInitials/commitNameEntry/abortNameEntry, initials buffer in GameState, @shared/name-entry.stepNameEntry reuse, DEFAULT_HIGH_SCORES.
- **mc6-1 DONE** — phase machine (Phase union, nextPhase dispatch).
- **@shared/highscore** exists (qualifiesForHighScore, insertHighScore, highScoreKey — used by asteroids/joust).
- **@shared/name-entry.stepNameEntry** exists (stepNameEntry for A-Z buffer).

**Key files to wire:**
- `plugins/missile-command/src/core/game.ts` — add stepGame 'entry' freeze; wire enterNameEntry on qualifying game-over; (core pure — no keyboard/storage wiring here).
- `plugins/missile-command/src/shell/` + `main.ts` — keyboard wiring (KeyboardEvent.key → stepInitials), localStorage load/save (reuse asteroids/joust @shared/highscore pattern).
- `plugins/missile-command/tests/` — purity.test.ts, citations.test.ts must stay green; new tests for AC-A through AC-E.

**Reference consumers (read for keyboard+localStorage pattern):**
- `plugins/asteroids/src/main.ts` / `src/shell/` — @shared/highscore + keyboard name entry.
- `plugins/joust/src/main.ts` / `src/shell/` — @shared/highscore + keyboard name entry.
- `plugins/pac-man/src/main.ts` — @shared/highscore consumer.

**Scope note (Reviewer forward findings + dev hardening):**
- stepGame 'entry' freeze guard is mandatory for this story (was flagged by mc7-2 reviewer as blocking mc7-3).
- Optional hardening: qualifiesForHighScore NaN guard (add `Number.isFinite(score)` to qualify guard, matching asteroids' defense-in-depth).

**ROM ground truth:** REV-01 (035820-01); mc7-2 already filed claims MC-INITIALS-LEN/CHARSET/ABORT. Any NEW src/core constant needs a citations.test.ts-gated claim. The ROM's authentic trackball/timeout entry (UCVTAB=0x84 countdown, W3DSUP.MAC:4180) is DELIBERATELY OUT — the user chose fleet-consistent keyboard entry; record this as an intentional deviation.

**Routing:** tdd is phased → hand off to TEA (Han Solo) for RED. No blockers.

## TEA Assessment

**RED landed — `tests/mc7-3-name-entry-wiring.test.ts` (17 tests).** Committed `d068b135`.
Repo lint (`tsc --noEmit`) GREEN; full `missile-command` project = **3 failed | 1197 passed
| 13 skipped**, all failures in the new file, zero collateral. RED lands at RUNTIME
(feature absent), never as a compile error (dynamic-loader idiom, mc7-2 house style).

**What Dev (Yoda) must build to turn it GREEN:**

1. **AC-A — `core/game.ts stepGame`: freeze `'entry'`.** Add, next to the `'over'`/`'pause'`
   branches: `if (state.phase === 'entry') return { ...state, frame: state.frame + 1, soundEvents: [] }`.
   RED proof: `stepGame` on an `'entry'` state currently runs `stepCombat` → `nextPhase('entry',…)`
   → `'play'` and flies the warheads (the mc7-2 landmine, reproduced).
2. **AC-B — `core/game.ts stepGame`: route a qualifying game-over into `'entry'`.** On the
   play→over transition, when `qualifiesForHighScore(highScores, score)`, enter `'entry'`
   (empty buffer) via `enterNameEntry`; a non-qualifying score still lands in `'over'`
   (that control already passes). Carry the score into `'entry'` for the commit.
3. **AC-C — `core/shell/input.ts`: `nameEntryFromKey(key, state): GameState`.** During `'entry'`:
   `Enter` → `commitNameEntry`; any other key → `stepInitials(state, key)` (A–Z/Backspace via
   `@shared/name-entry`); every non-`'entry'` phase returned unchanged. **Also guard the fire
   path:** `fireOrStart` (or `fireFromKey`) must no-op when `phase === 'entry'` — Z/X/C are fire
   keys AND valid initials, so typing one must not launch an ABM / spend ammo / sound a cue.
4. **AC-D — NEW `core/shell/highscore.ts`.** Battlezone base-shape precedent (MC rows are
   `{ name, score }`, no domain field):
   - `makeMcHighScoreStorage()` → `makeHighScoreStorage('missile-command', isHighScoreRow, '')`
   - `loadHighScores(storage)` → persisted board if non-empty, else `DEFAULT_HIGH_SCORES`
     (first boot / unreachable storage must NOT wipe the seeded ROM ladder to empty).
   Then wire `main.ts` the asteroids way: boot state uses `loadHighScores(storage)`; save on
   the commit's NEW-array reference (`if (game.highScores !== prev.highScores) storage.save(...)`).

**AC-E (out-of-band, keep GREEN):** no new `src/core` numeric constant is introduced (the freeze
is `frame + 1` + `[]`; the wiring reuses already-cited fns), so `tests/purity.test.ts` and
`tests/citations*.test.ts` need no new claim and must stay green. All localStorage/keyboard code
lives in `src/shell` (off the core purity/citation sweep).

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

- **#4 `||` vs `??` on 0/''** — `loadHighScores` uses an explicit `saved.length > 0` predicate
  (not `saved || DEFAULT`), pinned by the empty-storage → `DEFAULT_HIGH_SCORES` test.
- **#5 `.js` extensions on relative imports** — all core imports in the test carry `.js`; the new
  shell modules must too (Dev).
- **#8 test quality** — every test asserts a concrete value (no `let _ =`, no `assert(true)`, no
  `is*()` on always-null); the fire-guard test asserts the negative (no ABM/ammo/sound during entry).
  No `as any` in assertions — dynamic-loaded fns are cast from `unknown` to a precise signature.
- **#1 type-predicate runtime validation** — persistence rides `isHighScoreRow` (real runtime guard),
  proven by the round-trip + lobby-read tests.

**Handoff → Dev (Yoda) for GREEN.** No blockers, no design deviations logged.

## Dev Assessment

**GREEN — all four ACs pass. Committed & pushed (`feat/mc7-3-name-entry-wire-keyboard-persistence`).**
`missile-command`: **1213 passed / 0 failed** · orchestrator: **457 passed** · `tsc --noEmit`: **clean**.

**What was built (minimal, fleet-consistent):**
- **AC-A + AC-B — `src/core/game.ts stepGame`.** Added `if (state.phase === 'entry') return { ...state, frame: state.frame + 1, soundEvents: [] }` (the freeze, mirroring `'over'`/`'pause'`). Changed the PLAY tail to `const stepped = stepCombat(state, {}); return stepped.phase === 'over' ? enterNameEntry(stepped) : stepped` — a qualifying game-over routes to `'entry'`, a non-qualifying one stays `'over'` (`enterNameEntry` is the no-op decider). No new numeric constant → purity/citations untouched.
- **AC-C — `src/shell/input.ts`.** New `nameEntryFromKey(key, state)`: Enter → `commitNameEntry`, else → `stepInitials` (imported both from core). Guarded `fireOrStart` with an early `if (state.phase === 'entry') return state` so Z/X/C type initials without firing.
- **AC-D — new `src/shell/highscore.ts`.** `MC_HIGH_SCORE_GAME_ID`, `makeMcHighScoreStorage()` (= `makeHighScoreStorage('missile-command', isHighScoreRow, '')`, battlezone base-shape precedent), `loadHighScores(storage)` (persisted board, else `DEFAULT_HIGH_SCORES`).
- **Wiring — `src/main.ts`.** Boot: `{ ...createGame(), highScores: loadHighScores(highScoreStorage) }`. Keydown: feed `nameEntryFromKey` between `pauseFromKey` and `fireOrStart`, and `highScoreStorage.save(...)` when `game.highScores` reference changes (asteroids pattern).

**Verification of the blast-radius concern I raised at RED:** the three existing play→over transition tests (`game.test.ts`, `sound-events.test.ts`, `mc3-playthrough.test.ts`) all reach game-over with **score 0** (no ABM fire ⇒ no kills), which never qualifies — so the route change leaves them `'over'`. Confirmed green.

### Rework (Round-Trip 1 — reviewer REJECTED, both findings resolved)

**GREEN — full rework verified. `missile-command`: 1244 passed / 0 failed · orchestrator: 457 passed · `tsc --noEmit`: clean · build: clean.**

- **HIGH [EDGE]/[TEST] fixed — the composed keydown seam.** Extracted the three per-keystroke reducers into one pure `keydownReducer(key, state)` in `src/shell/input.ts` that gates `fireOrStart` on the **PRE-keystroke** phase (`const wasEntry = state.phase === 'entry'; … if (!wasEntry) …`). A full-buffer Enter now commits (`entry`→`attract`) and `fireOrStart` is skipped, so it no longer consumes the fresh `attract` into `setup`. `main.ts` now drives `keydownReducer` (the persistence save-on-changed-reference stays in `main.ts`).
- **Regression test added (RED→GREEN, mutation-verified).** New `mc7-3 AC-C (composed)` describe block in the test file drives the actual composition: a full-buffer Enter lands on `attract` (not `setup`), a fire-key initial `z` during entry launches no ABM, and a keystroke in attract still begins setup (composition preserved). Confirmed RED before the reducer existed; reverting the `!wasEntry` gate reddens exactly the full-buffer-Enter test (guard is load-bearing).
- **LOW [DOC] fixed.** `GameState.highScores` JSDoc (`src/core/game.ts`) no longer says "(later story)" — it names mc7-3 (`src/main.ts` + `shell/highscore.ts`, one-origin localStorage).
- **Branch base corrected (see Delivery Findings).** The remote branch was stale (pre-mc10-4 develop); the rework was force-pushed on the correct, current-develop base (up to date with `origin/develop`). Verified NOT regressed: `main.ts` retains mc10-4's `drawFrame(…, game.wave)`.

**Verification:** `just test-one missile-command` → **1244 passed / 0 failed**; `npm run lint` (tsc --noEmit) → clean; `npm run test:orchestrator` → **457 passed**; `node scripts/build-app.mjs missile-command` → clean. Commit `c12ea581`, force-pushed to `feat/mc7-3-name-entry-wire-keyboard-persistence`.

## Subagent Results

> **Round 1 (REJECTED)** found the composed-path HIGH + a LOW JSDoc — see git history + the Dev Rework section above; both are resolved in this round. The table below is **Round 2**.
>
> **Harness note:** no reviewer subagents were dispatched this session (harness constraint — the AgentTool is not to be invoked unless the user requests it). Because the diff is a small, self-contained rework (one 5-line reducer + gate, one composed regression test, one JSDoc line, a branch-base correction), every dimension was assessed **directly and synchronously by the Reviewer** — so nothing is pending and no conclusion is fabricated ahead of a result (the condition `gates/subagent-before-conclusions` guards against does not arise). Each row records the domain verdict from that direct analysis.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Skipped (reviewer ran directly) | clean | none | N/A — ran tests/lint/build/mutation myself: `just test-one missile-command` 1244/1244, `tsc --noEmit` exit 0, build clean, mutation-check reddens exactly the full-buffer-Enter test |
| 2 | reviewer-edge-hunter | Skipped (reviewer ran directly) | clean | none | Traced every keydownReducer path (Enter-full, Enter-partial, Escape-in-entry, fire-key-in-entry, attract keystroke, over-restart, pause/unpause) — all safe ([EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped (reviewer ran directly) | clean | none | No new try/catch or swallowed error; the shared `save()`/`parseTable` catches are pre-existing + intentional ([SILENT]) |
| 4 | reviewer-test-analyzer | Skipped (reviewer ran directly) | clean | none | The composed test asserts concrete values and is mutation-verified non-vacuous; isolated AC-C tests retained ([TEST]) |
| 5 | reviewer-comment-analyzer | Skipped (reviewer ran directly) | findings | 1 | Round-1 LOW (game.ts JSDoc) fixed; 1 NEW trivial: main.ts:74 comment still names `fireOrStart` though the call is now via `keydownReducer` — non-blocking ([DOC]) |
| 6 | reviewer-type-design | Skipped (reviewer ran directly) | clean | none | `keydownReducer(key: string, state: GameState): GameState` matches the sibling reducer signatures; no `as any`, `readonly` preserved ([TYPE]) |
| 7 | reviewer-security | Skipped (reviewer ran directly) | clean | none | No new surface; single-player, no backend; persistence still rides `isHighScoreRow` + bounded buffer ([SEC]) |
| 8 | reviewer-simplifier | Skipped (reviewer ran directly) | clean | none | The extraction is 5 lines and justified by the mandated composed-path test (main.ts DOM handler is undrivable in node); no over-engineering ([SIMPLE]) |
| 9 | reviewer-rule-checker | Skipped (reviewer ran directly) | clean | none | `.js` extensions on all new relative imports; `loadHighScores` uses explicit `saved.length > 0` (not `||`); core/shell purity intact (keydownReducer is shell); no new core numeric constant; no premature src/shared extraction ([RULE]) |

**All received:** Yes (no subagents dispatched — harness constraint; every dimension assessed directly by the Reviewer, nothing pending)
**Total findings:** 1 confirmed (1 trivial [DOC], non-blocking), 0 dismissed, 0 deferred — both Round-1 findings resolved

### Devil's Advocate

Assume this rework is broken. The Round-1 defect was a composition bug — the delivered feature is the *cabinet a player touches*, and that cabinet composes reducers on every keystroke — so the fix must be judged on the composition, not the pieces. Does `keydownReducer` actually close it? Trace the headline flow: type `Z Z Z`, press Enter on a full buffer. `wasEntry = true`; `pauseFromKey('Enter', …)` no-ops (`'enter' ≠ 'escape'`); `nameEntryFromKey('Enter', …)` commits → `'attract'`; the `if (!wasEntry)` gate **skips** `fireOrStart`, so the fresh `'attract'` is never consumed into `'setup'`. Verdict: fixed, and I proved it by reverting just the gate — exactly one test (the full-buffer Enter) goes red, so the guard is load-bearing and the test is not vacuous. Now hunt for a NEW break the fix could have introduced. The nastiest candidate: `pauseFromKey` runs *before* the gate and is *not* itself gated — could Escape during entry corrupt the phase? `togglePause('entry')` returns `'entry'` (state.ts:111-115 only toggles play↔pause), and `stepInitials(state,'Escape')` is a no-op, so Escape in entry stays in entry with the buffer intact — safe. Could persistence over-fire? The save signal is `game.highScores !== prevScores`; every non-commit path (Escape-in-entry, attract→setup, over→startGame which *carries* `highScores` by the same ref) preserves the array reference, so `save()` fires only on a real commit — no spurious writes, no wasted quota. Could a confused user break it by pressing Enter on a *partial* buffer? `commitNameEntry` is a no-op below `MC_INITIALS_LEN`, the gate still skips `fireOrStart`, so nothing starts — they simply keep typing. What about a stressed / private-mode filesystem? `loadHighScores` falls back to the seeded ladder when `load()` returns `[]`, and the shared `save()` is quota-guarded — unchanged from Round 1. The one residual is cosmetic: the comment at main.ts:74 still says "(fireOrStart)" though the call now routes through `keydownReducer`; the description is still behaviorally true and the new inline comment at :78-81 explains the composition, so it is a trivial nit, not a defect. No timeout on entry remains (pre-authorized deviation). I cannot manufacture a functional break. APPROVE.

### Rule Compliance

Checked against `.pennyfarthing/gates/lang-review/typescript.md` + the three project rules over the rework diff:

- **`.js` extension on relative imports** — `input.ts` adds `stepInitials, commitNameEntry` from `'../core/game.js'` ✓; `main.ts` imports `'./shell/input.js'` + `'./shell/highscore.js'` ✓; `highscore.ts` imports `'../core/highscore.js'` ✓.
- **`||` vs `??` on 0/''** — `loadHighScores` uses an explicit `saved.length > 0` predicate, not a falsy `||` ✓.
- **`readonly` / no `as any`** — `keydownReducer`/`nameEntryFromKey` return `GameState` (all-`readonly` fields); no casts in production code ✓.
- **Core/shell purity** — `keydownReducer`, `nameEntryFromKey`, `loadHighScores` all live in `src/shell`; the only `src/core` change (game.ts) is the freeze branch + route + a comment, introducing **no new numeric constant** → purity/citation sweeps stay green ✓ (verified: `purity.test.ts` + `citations*.test.ts` pass in the 1244 run).
- **`//`-only ROM citations** — no new ROM citation added; game.ts route comment cites W3DSUP.MAC:4064 in a `//` line ✓.
- **No premature `src/shared` extraction** — the rework reuses the already-fleet-wide `@shared/highscore`; no new shared library ✓ (render-hud allowlist edit was Round-1, already accepted).

## Reviewer Assessment

**Verdict:** APPROVED

Round-1 REJECTED both findings are resolved and independently re-verified:

- **[EDGE] [TEST] HIGH (Round-1) — FIXED.** The composed keydown path now routes through the pure `keydownReducer` (`shell/input.ts:168`) which captures `wasEntry = state.phase === 'entry'` **before** any reducer runs and skips `fireOrStart` when `wasEntry` — so a full-buffer Enter commits (`entry`→`attract`) and is never consumed into `setup`. `main.ts:82` drives it. A composed-path regression test (`mc7-3 AC-C (composed)`) proves a full-buffer Enter lands on `'attract'`, a fire-key initial during entry launches nothing, and an attract keystroke still begins setup. **Independently mutation-verified:** reverting the `!wasEntry` gate reddens exactly the full-buffer-Enter test.
- **[DOC] LOW (Round-1) — FIXED.** `GameState.highScores` JSDoc (`core/game.ts:104-106`) now names mc7-3 (`src/main.ts` + `shell/highscore.ts`, one-origin localStorage) rather than "(later story)".

**Data flow traced:** DOM `KeyboardEvent.key` → `keydownReducer` (`pauseFromKey → nameEntryFromKey → fireOrStart`, `fireOrStart` gated on pre-keystroke phase) → `GameState`; on a commit, `commitNameEntry` returns a new `highScores` array whose changed reference triggers `highScoreStorage.save(...)` under `highScoreKey('missile-command')` — the one-origin key the lobby reads. Safe: no path spends ammo/launches under the entry screen; save fires only on a real commit.

**Pattern observed:** composing per-keystroke reducers where one mutates the discriminant mid-chain — correctly solved by snapshotting the pre-keystroke phase, not by relying on each reducer's internal guard (`keydownReducer` at `shell/input.ts:168`).

**Error handling:** unchanged and correct — `loadHighScores` falls back to the seeded ROM ladder on empty/unreachable storage; shared `save()` is quota-guarded; `stepInitials`/`commitNameEntry` no-op on non-letter/partial-buffer keys.

**Clean dimensions:** [EDGE] all keydownReducer paths traced safe · [SILENT] no new swallowed errors · [TEST] composed test concrete + mutation-verified · [TYPE] signature matches fleet, no casts · [SEC] no new surface (single-player, validated persistence) · [SIMPLE] 5-line extraction justified by the mandated test · [RULE] `.js`/`??`/purity/citation/no-premature-shared all pass. Only [DOC] carries a residual trivial nit (main.ts:74 names `fireOrStart` though the call is now via `keydownReducer` — behaviorally still accurate; filed non-blocking below).

**Handoff:** To SM for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Dev] Improvement (non-blocking, RESOLVED in this story):** `tests/render-hud.test.ts` "mc9-4 AC2 — no premature src/shared extraction" scans `src/shell/` for `@shared/*` imports against an ALLOWED set that predated any shell use of `@shared/highscore`. My new `shell/highscore.ts` reuses that **already-extracted, fleet-wide** verb (asteroids/battlezone/joust consume it), which the guard's own comment explicitly permits — so I added `'@shared/highscore'` to the allowlist and its two prose phrasings. The guard's teeth (blocking a NEW `src/shared` library, esp. a glyph/HUD one) are unchanged. Flagging for Reviewer awareness since it is a Dev edit to a test file.

### Reviewer (code review)

- **Gap (blocking):** The `main.ts` keydown handler composes `nameEntryFromKey` then `fireOrStart` on the same keystroke; a successful Enter-commit transitions `'entry'`→`'attract'` and `fireOrStart` then consumes that `'attract'` into `'setup'`, starting an unrequested game. Affects `plugins/missile-command/src/main.ts` (gate `fireOrStart` on the pre-keystroke phase) **and** `plugins/missile-command/tests/mc7-3-name-entry-wiring.test.ts` (add a composed-keydown regression test — the AC-C tests exercise the reducer in isolation only). *Found by Reviewer during code review.*
- **Improvement (non-blocking):** `GameState.highScores` JSDoc at `plugins/missile-command/src/core/game.ts:110` still defers persistence to "(later story)" though mc7-3 delivers it. Update the comment during rework. *Found by Reviewer during code review.*
- **Dev test edit ACCEPTED:** the Dev finding above (adding `@shared/highscore` to the render-hud allowlist) is correct — it is a sanctioned pre-existing shared verb, the guard's teeth are intact. Not a concern. *Found by Reviewer during code review.*

### Dev (rework)

- No upstream findings during rework. Both reviewer findings are resolved in the diff: the HIGH composed-path defect (fixed via `keydownReducer`'s pre-keystroke gate + a composed-path regression test) and the LOW stale JSDoc (`game.ts` now names mc7-3). *Found by Dev during rework.*
- **Gap (non-blocking, RESOLVED):** the REMOTE branch `feat/mc7-3-…` was STALE — based on a `develop` from **before** mc10-3/mc10-4/mc6-6/pm4-2/pm4-3 (and the pac-man stories) were merged (~3350 lines of merged content missing, incl. mc10-4's `drawFrame(…, game.wave)` per-wave-palette wiring). This checkout's local branch was correctly rebased onto current `develop` (up to date with `origin/develop`), so cherry-picking the rework onto the stale remote silently dropped mc10-4. Recovered by force-pushing (`--force-with-lease`) the correct-base local branch; the remote's stale mc7-3 commits were content-equivalent (modulo base), so nothing was lost. Reviewer/SM: the branch is now correctly based on current `develop`. *Found by Dev during rework.*

### Reviewer (code review — round 2)

- **Improvement (non-blocking):** `plugins/missile-command/src/main.ts:74` — the fire-keys comment block still names `fireOrStart` ("after GAME OVER a fire key restarts (fireOrStart)") though the handler now calls `keydownReducer` (which invokes `fireOrStart` internally). Behaviorally still accurate and the new inline comment at :78-81 explains the composition, so trivial — fold into a future touch of this file. *Found by Reviewer during code review.*
- **Verified — branch base correction (Dev finding above):** confirmed the branch is now based on current `origin/develop` (`main.ts` retains `drawFrame(context, game, canvas.width, canvas.height, game.wave)`; `git diff origin/develop...HEAD` is the mc7-3 delta only, no reverted siblings). Not a concern. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No deviations logged at setup.

### Dev (implementation)
- No deviations from spec. The rework extracts the three keydown reducers into one pure
  `keydownReducer(key, state)` in `shell/input.ts` — not an unrequested abstraction but the
  testable seam the reviewer's mandated composed-path regression test requires (main.ts's DOM
  handler is undrivable in node). Behaviour is identical to the prior inline composition except
  the fixed defect: `fireOrStart` is now gated on the PRE-keystroke phase.

### Reviewer (audit)

- **Dev (implementation) "No deviations — keydownReducer extraction"** → ✓ ACCEPTED by Reviewer: the extraction is not scope creep; it is the minimal testable seam the Round-1 mandated composed-path regression test requires (main.ts's DOM handler is undrivable in node). Behaviour is identical to the prior inline composition except the fixed pre-keystroke gate — verified by mutation.
- No undocumented deviations found in the diff. The trackball→keyboard entry and dropped ROM 30-sec/UCVTAB timeout remain **pre-authorized by the user** (SM scope) — ACCEPTED.