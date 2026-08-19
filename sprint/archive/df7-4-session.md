---
story_id: "df7-4"
jira_key: "df7-4"
epic: "df7"
workflow: "tdd"
---
# Story df7-4: Hall-of-fame wiring + name entry

## Story Details
- **ID:** df7-4
- **Jira Key:** df7-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df7-4-hall-of-fame-name-entry-wiring
- **PR:** (none yet — recorded when the PR is created)

## Story Summary

Wire df5-6's pure hall-of-fame board and localStorage persistence through the `@shared/name-entry` module into the game-over → name-entry → hall-of-fame → attract flow, and render the hall-of-fame display screen. Consumes `@shared/name-entry` and `@shared/highscore` (CONSUMED, not re-built — Decision C).

## Technical Approach

**Decision C: Reuse the shared hall-of-fame infrastructure, consume don't rebuild.**

df5-6 already shipped:
- The pure hall-of-fame board (`plugins/defender/src/core/highscore.ts`)
- One-origin localStorage persistence (`plugins/defender/src/shell/highscore.ts`) via `@shared/highscore`

df7-4 wires the qualifying-score name-entry flow:
1. On game-over with a qualifying score, transition to name-entry phase (via `@shared/name-entry`)
2. The player enters initials using the stick (ROM HOFUD :325 maps to shared input)
3. Commit the entry to the hall-of-fame board (df5-6's pure `@shared/highscore`)
4. Return to attract phase via the mainline loop

**Rendering:** Shell draws the hall-of-fame display (HOFIN :244) reading the board from `@shared/highscore`. Colour by df2 palette index only. No bespoke high-score UI; no new persistence code.

**ROM citations:**
- HALLOF defender/AMODE1.SRC:119 (hall-of-fame entry block)
- HOFIN :244 (initials display)
- HOFUD :325 (up/down stick handler for entry)
- add-score :270 (score/initials commit)

**Constraints:**
- No full-frame strobe in hall-of-fame/name-entry presentation (Decision B, ADR-0005)
- Non-qualifying game-overs skip name-entry and return to attract directly
- The phase machine (df7-1) gates the flow; no re-implementation of game-over logic

## Acceptance Criteria

- **AC1:** On game-over, a qualifying score enters the name-entry flow via `@shared/name-entry` (CONSUMED — no bespoke entry UI) and is committed to df5-6's hall-of-fame board (`@shared/highscore`, one-origin localStorage); a test asserts the flow game-over → name-entry → board → attract and that no new persistence code is introduced.
- **AC2:** The hall-of-fame DISPLAY is rendered in the shell (HOFIN initials display, defender/AMODE1.SRC:244; add-score/initials :270) reading the df5-6 board; the ROM entry/underline/stick citations (HALLOF :119, HOFUL :185, HOFUD :325) carry claims/*.json entries under the df1-1 gate.
- **AC3:** A non-qualifying game-over skips name-entry and returns to attract (the mainline loop closes); a test pins both the qualifying and non-qualifying paths.
- **AC4:** No full-frame strobe in the hall-of-fame/name-entry presentation (Decision B); colour by df2 palette index only; the df4-2 guard stays green.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-19T17:13:36Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-19T16:03:30Z | 2026-08-19T16:05:42Z | 2m 12s |
| red | 2026-08-19T16:05:42Z | 2026-08-19T16:24:20Z | 18m 38s |
| green | 2026-08-19T16:24:20Z | 2026-08-19T16:46:38Z | 22m 18s |
| review | 2026-08-19T16:46:38Z | 2026-08-19T16:57:51Z | 11m 13s |
| green | 2026-08-19T16:57:51Z | 2026-08-19T17:06:35Z | 8m 44s |
| review | 2026-08-19T17:06:35Z | 2026-08-19T17:13:36Z | 7m 1s |
| finish | 2026-08-19T17:13:36Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
- **[Dev, non-blocking → @shared story] Untrusted high-score board is loaded unsorted and unbounded (Reviewer F6, LOW).** `@shared` `makeHighScoreStorage.load()` filters via `isHighScoreRow` but never re-sorts, and `isHighScoreRow` accepts a negative `score` (only `Number.isFinite`). `qualifiesForHighScore`/`insertHighScore` assume a descending-sorted table, so a tampered/out-of-order board (devtools or a same-origin XSS writing `defender-high-scores`) can give a wrong qualify answer — no crash, untrusted-data only. Root is `@shared` and affects all 11 games; fix there (sort after filter + `score > 0` in `isHighScoreRow`) with cross-game tests, rather than a Defender-local patch. df7-4's reachable render-DoS is already closed (F3).

- **[TEA, non-blocking] Scope boundary — df7-4 does NOT wire `playerDied`.** The play→death/game-over shell edge is deferred (start.ts:47-58, a df7-2 finding); df7-7's capstone playtest owns end-to-end runtime reachability. df7-4's core flow is driven purely through `advanceStart` signals in the tests, so this does not block GREEN — but Dev should NOT add a start-vs-respawn reseed discriminant here (that is the death-beat story's).
- **[Dev, non-blocking → df7-7] An ABANDONED name-entry has no timeout — it will hang the cabinet once df7-7 makes game-over reachable.** The core gate (`start.ts` advanceStart) holds `game-over` while `nameEntry !== null`, and `confirmSessionInitials` (Enter) is the ONLY thing that closes an open entry; the shell's `gameOverDwell` counts only while the entry is closed. So a player who walks away mid-initials never presses Enter → the attract loop never resumes. NOT reachable today (main.ts supplies no `playerDied`/`gameOver`, so game-over is unreachable — start.ts:47-58), so no test drives it and I did not build speculative robustness (Dev minimalist discipline). df7-7 wires game-over live and MUST add an abandoned-entry timeout (the sibling precedent: missile-command's `NAME_ENTRY_TIMEOUT_FRAMES` → `abortNameEntry`, pac-man's `entryOpen`/`!confirmed` dwell). Fix shape: a shell entry-dwell that auto-aborts/commits after N frames, tested. (Found by the df7-4 lang-review rule-checker, #27.)
- **[TEA, non-blocking] Citation lines for GREEN (verified against the vendored source, tabs are literal):** `AMODE1.SRC:244` = `HOFIN\tLDX\t#$46AC\tTOP LEFT OF INITIALS`; `:185` = `\tJSR\tHOFUL\tUNDERLINE INITIALS`; `:325` = `HOFUD\tCLR\tINIDIR\tZERO INITIALS DIRECTION`; `:273` = `HOFAS\tSTU\tXTEMP$\tSAVE TOP OF LIST ADDRESS` (or the `:270` header `*HALL OF FAME -\tADD SCORE AND INITIALS\tX=BOTTOM OF LIST`). Add a claims/*.json entry + a glossary row for each; `citations.test.ts` byte-verifies the verbatim.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **The hall-of-fame screen shows the board + in-progress initials, not a standalone GAME OVER / final-score banner**
  - Spec source: context-story-df7-4.md, AC2
  - Spec text: "the hall-of-fame DISPLAY is rendered in the shell (HOFIN initials display ...) reading the df5-6 board"
  - Implementation: `drawHallOfFame` (core/scene.ts) draws "HALL OF FAME" + the board rows + the underlined in-progress initials. df5-6's GAME OVER + final-score screen is preserved only for the 3-arg `composeFrame` path (no `hof`); once the shell passes the board, the HOFIN screen replaces it. The player's final score is captured in `nameEntry.score` and committed, but is not drawn as its own line.
  - Rationale: AC2 asks for the HOFIN board display; the ROM's block-1 hall-of-fame screen is the board + initials entry, not a "GAME OVER" banner. Kept the render minimal (Dev minimalist discipline) — no test requires the final score on-screen.
  - Severity: minor
  - Forward impact: minor — df7-7's full-lifecycle visual playtest may want the player's own final score shown on the entry screen; if so it is a one-line `writeCentered` in `drawHallOfFame`.

### TEA design rulings (df7-4 contract the RED tests pin) — Atia of the Julii, 2026-08-19

Ruled from source + fleet precedent (pac-man pm4 / missile-command mc7 are the direct siblings), not asked — `advancePhase`'s reserved `overTimeout` and the frozen 6-member `PHASES` union settle the shape:

1. **No new `Phase` member.** Name-entry is a **sub-state gated within `game-over`**, not a phase. `core/phase.ts` already froze `PHASES = [attract,setup,play,pause,death,game-over]` (df7-1-identity pins it) and reserved `overTimeout` with the comment "df7-4 owns the constant". The `game-over → attract` edge already exists; df7-4 supplies `overTimeout` and the **core gates it on name-entry being closed** — pac-man's `entryOpen` model exactly.

2. **`Session` (core/start.ts) threads the board + entry.** New readonly fields: `board: readonly DefenderHighScore[]` and `nameEntry: NameEntry | null` where `NameEntry = { readonly buffer: string; readonly score: number }`.

3. **Core verbs (start.ts, immutable — the missile-command shape), building on df5-6's existing `stepInitials`/`commitHighScore`:**
   - `bootSession(rand, board?)` — board defaults to `[]`.
   - `advanceStart(session, signals, rand)` opens `nameEntry` at the `play→game-over` edge **iff `qualifiesForHighScore(board, sim.score)`**, REFUSES `game-over→attract` while `nameEntry !== null`, and on the real loop-back reseeds a fresh attract sim while **preserving the board**.
   - `stepSessionInitials(session, key): Session` and `confirmSessionInitials(session): Session` (commits via `commitHighScore`, clears entry).

4. **Render in CORE `scene.ts` `composeFrame`, NOT the shell** (defender draws every screen in core; `shell/render.ts` is a bare blitter). Signature grows an **optional 4th arg** `hof?: { board, nameEntry }` — 3-arg call sites (df3-6/df7-5) keep the plain GAME OVER screen; with `hof`, the game-over branch draws the hall-of-fame table + in-progress initials (HOFIN). df5-6's `game-over` screen is preserved for the 3-arg path.

5. **Shell (main.ts) wires:** load board via `makeDefenderHighScoreStorage().load()` → `bootSession`; route name-entry keys (Enter→confirm, letters→step); `.save()` the board on commit; supply `overTimeout` from a game-over dwell counter (shell owns the clock, core owns the gate); pass `{ board, nameEntry }` into `composeFrame`.

**Scope boundary (Delivery Finding for the Reviewer):** df7-4 does NOT wire `playerDied` (the play→death/game-over shell edge) — start.ts:47-58 defers that to the death-beat/respawn story, and df7-4's core flow is fully driven through `advanceStart` signals. End-to-end runtime reachability of game-over is the df7-7 capstone playtest's job (blocked on df7-4 + df7-5).

## Dev Assessment

**Implementation Complete:** Yes (Lucius Vorenus, 2026-08-19)

**Files Changed:**
- `plugins/defender/src/core/start.ts` — `Session` now threads `board` + a `NameEntry | null` sub-state; `advanceStart` opens the entry on the qualifying `play→game-over` edge, gates the `game-over→attract` timeout while it is open, and reseeds a fresh attract sim (board preserved) on the loop-back; new `stepSessionInitials`/`confirmSessionInitials` verbs build on df5-6's `stepInitials`/`commitHighScore`. No new `Phase` member.
- `plugins/defender/src/core/scene.ts` — `composeFrame` grows an optional 4th `hof` arg; new `drawHallOfFame` renders the df5-6 board + underlined in-progress initials in the game-over branch. 3-arg callers unchanged (df5-6 GAME OVER screen).
- `plugins/defender/src/main.ts` — loads/persists the board via the df5-6 `@shared` seam (`makeDefenderHighScoreStorage`), routes name-entry keydowns (Enter→confirm+save, letters→step), supplies `overTimeout` from a game-over dwell counter, and feeds `{ board, nameEntry }` into `composeFrame`.
- `plugins/defender/docs/rom-study/glossary.md` + `docs/rom-study/claims/20-hall-of-fame.json` — HOFIN/HOFUL/HOFUD/HOFAS glossary rows + byte-verified claims (df1-1 gate).

**Tests:** 992/992 defender vitest green (32 df7-4 tests, all four suites); `citations.test.ts` byte-verifies all 318 claims incl. the 4 new; `purity.test.ts` green (core boundary held); `tsc --noEmit` clean repo-wide. Zero regressions.

**Followed TEA's design rulings exactly** — no new `Phase` member (name-entry gated inside `game-over`), `Session`-threaded board+entry, render in core `scene.ts`, shell wires load/route/save/render. The df5-6 src-wide "consumed, not re-implemented / no bespoke persistence" scan stays green (AC1's standing guard). The `playerDied` shell edge remains deferred per TEA's Delivery Finding (df7-7's job).

**Branch:** feat/df7-4-hall-of-fame-name-entry-wiring (pushed, commit 2f8cbb3d)

**Lang-review pass (dev-exit extension gate):** an independent rule-checker over the diff found the PRODUCTION code (start.ts/scene.ts/main.ts) clean against all 30 TS checks (the advanceStart edge is a correct instance of #14). It found four of MY OWN test guards fail-by-passing (#15/#18/#25) — three regex anchors in df7-4-main-wiring and one self-comparison tautology in df7-4-hall-of-fame-render — each mutation-defeatable for the exact regression it guarded. All four hardened (commit 2f8cbb3d, mutation-tested, 992/992 still green). It also surfaced a real-but-unreachable-today design gap (#27, abandoned-entry hang) recorded as a df7-7 Delivery Finding above. All findings map to EXISTING checklist checks — no new lang-review check needed (review-correlation).

**Handoff:** To review (Reviewer / Marcus Tullius Cicero).

## Tea Assessment

**RED complete — routed to Dev for GREEN.** (Atia of the Julii, 2026-08-19)

**Four suites, 23 RED, zero pre-existing regressions** (969 defender tests still green — `npx vitest run --project defender`). Each file reddens for its intended reason, verified by the testing-runner:
- `df7-4-name-entry.test.ts` (AC1+AC3) — the pure core flow through the `Session` seam: qualifying game-over opens the entry, step ABC → confirm commits via df5-6's `commitHighScore`, `overTimeout` closes to a fresh attract with the board preserved; the open-entry timeout GATE; and the non-qualifying skip. RED via missing `Session.board`/`nameEntry` + the two new verbs.
- `df7-4-hall-of-fame-render.test.ts` (AC2+AC4) — black-box over `composeFrame`'s new optional 4th arg: the board content and the in-progress initials reach the frame (digest-differs), palette-index safety, and the ADR-0005 no-strobe triad. RED via `composeFrame` ignoring the payload (identical digests).
- `df7-4-main-wiring.test.ts` — the shell half as a `?raw` scan: board load via the df5-6 seam, `bootSession(rand, board)`, the gated name-entry keydown path, `.save()` on commit, and `composeFrame` fed `{board, nameEntry}`.
- `df7-4-identity.test.ts` — the df1-1 gate: glossary rows + byte-verified claims for HOFIN/HOFUL/HOFUD/HOFAS. Mirrors `df5-6-identity.test.ts`.

**The contract Dev implements is the "TEA design rulings" block above** (no new Phase member; `Session` threads board+entry; render in core `scene.ts`; shell wires load/route/save/render). The df5-6 src-wide source scan (import @shared / no re-declare / only `makeHighScoreStorage`) already runs over all `src/**` — it stays green as the standing "no new persistence" guard for AC1.

**Non-RED-driver tests that pass now are intentional guards**, not vacuous RED: the non-vacuity strobe companion (`fill(0x0f)` throws), the 3-arg back-compat pin, the palette-index ceiling, the population floors, and the "source non-trivial" strip check. Self-checked for vacuity (lang-review #8/#18/#26): no `let _ =`, no `assert(true)`, every assertion traces a term to code under test.

### Rule Coverage (typescript.md lang-review)
- **#15 / #25 (source-text guards anchor the claim, not a token):** every `?raw` scan in `df7-4-main-wiring` keys on a call SHAPE (`bootSession\s*\(\s*[\w.]+\s*,`, `composeFrame\s*\([^;]*board[^;]*nameEntry`) after stripping comments; the identity suite uses row-scoped `rowCites`/`rowWindows`, not whole-file regex.
- **#18 / #26 (apparatus that fails by passing / all-local assertions):** the render suite uses TWO distinct boards (BOARD_A vs BOARD_B) so a hardcoded banner cannot satisfy it; every digest term comes from `composeFrame` output, not test-local arithmetic.
- **#14 (edge computed at the single exit):** the flow tests drive the play→game-over edge through `advanceStart`'s one exit and assert the entry opens there — pinning the derived edge at the common exit, not in a branch.
- **#4 / #21 (nullish vs degenerate):** the non-qualifying path uses a real below-lowest score (500) and score 0, exercising the `qualifiesForHighScore` `score <= 0` / full-board boundaries, not just null.
- Population non-vacuity floors precede every data-driven loop (`expectPopulated`), per #15/#18/#19.

## Sm Assessment

**Setup complete — routed to TEA for RED.** (Titus Pullo, 2026-08-19)

**Board check before setup (clean):**
- `git fetch --prune` then `git branch -r | grep -Ei df7-4` → no remote branch existed; no sibling owns this story.
- Sibling `.session/` sweep across `a-*` checkouts → no live sessions.
- `origin/develop` had moved 2 commits ahead of local; the feature branch was cut from the **fresh** `origin/develop` tip, so it is not based on a stale tree.

**Setup actions:**
- Branch `feat/df7-4-hall-of-fame-name-entry-wiring` created off `origin/develop` and pushed (claim now visible to the sibling probe).
- Story stamped `in_progress` (sm-setup left it at `backlog`, as always — verified and corrected).
- Context + epic stamp committed and pushed.

**Scope for TEA — this is a WIRING story, not a rebuild (Decision C).** df5-6 already shipped the pure board (`plugins/defender/src/core/highscore.ts`) and one-origin persistence (`plugins/defender/src/shell/highscore.ts`). df7-4 consumes `@shared/name-entry` + `@shared/highscore` — no bespoke entry UI, no new persistence. The RED tests should pin: (1) the game-over → name-entry → board → attract flow for a qualifying score, (2) the non-qualifying path skips name-entry, (3) the hall-of-fame display renders reading the df5-6 board, (4) no new persistence code is introduced and the df4-2 no-strobe guard stays green.

**Citation note for the df1-1 gate:** AC2 names `HOFUL :185` (underline) in addition to the title's HALLOF :119 / HOFIN :244 / HOFUD :325 / add-score :270. Anchor each `claims/*.json` verbatim to the byte that ENCODES the value, per the citation rule — read each routine to its RTS, don't stop at the diff window.

**No open questions.** ROM is canonical and the epic's ACs are current; the shared-module shape is the same as asteroids/missile-command/pac-man already in-tree.
## Reviewer working notes (pre-verdict — Cicero)

**Independent finding R-INDEP-1 (leading, likely HIGH):** `main.ts` feeds the `hof` payload to `composeFrame` UNCONDITIONALLY, and `composeFrame` keys its game-over branch on `sim.gameOver` (not the phase). `stepSim` sets `sim.gameOver = true` on men<0 during LIVE play (`sim.ts:450,485`), while `session.phase` stays `'play'` (main.ts never feeds `playerDied` to `advanceStart`). So a normal live game-over (lose all ships) now renders `drawHallOfFame(board, nameEntry=null)` — the non-interactive hall-of-fame board with NO entry and NO final score — replacing df5-6's working `GAME OVER + score`. The name-entry it implies is unreachable live. Reachable, user-visible, untested (no test pins the live 4-arg men<0 path). Fix: gate the `hof` payload on `session.phase === 'game-over'` so the live men<0 falls to the 3-arg `drawGameOverScreen` (df5-6 preserved) until df7-7 wires the phase edge.

**Corroborating comment defect (lang-review #17):** the main.ts render comment "In play/attract the game-over branch is not taken, so it is inert" is FALSE — `sim.gameOver` is reachable in play, so the branch IS taken. Fix the comment with the gate.

Awaiting: comment_analyzer, security, rule_checker.

**SEC-1 (security subagent, MEDIUM):** drawHallOfFame renders every untrusted board `name` char-by-char every frame; `isHighScoreRow` (@shared) caps no length → a 2M-char name in localStorage (shared-origin XSS / devtools) stalls the main thread on the game-over screen. df7-4 is the first to render board content. Fix: defensive `row.name.slice(0, N)` in drawHallOfFame (+ ideally a name-length cap in @shared isHighScoreRow). Reachable via R-INDEP-1's live path.
**SEC-2 (security subagent, LOW):** load() never re-sorts the untrusted board; advanceStart calls qualifiesForHighScore (which assumes descending-sorted) on it → wrong qualify answer; isHighScoreRow also accepts negative scores. Fix: defensive sort/clone before qualify, or sort in @shared load().
**Security verified CLEAN:** no OOB framebuffer write (blitGlyph clips), name-entry keydown safe, ADR-0005 upheld + non-vacuous strobe tests, no purity violation, persistence via @shared seam only.

**CMT-1 (comment subagent, HIGH):** HOFUD claim (20-hall-of-fame.json:14) + glossary:94 say "advancing the initials cursor" — but AMODE1.SRC:325-369 shows HOFUD CYCLES the active letter's value (A-Z); the cursor/slot advances via a separate FIRE-switch routine (:186-211). Verbatim byte-verifies (right line) but the PROSE mischaracterizes the routine. Fix the claim + glossary prose.
**CMT-2 (comment subagent, MEDIUM):** HOFIN claim (:4) + glossary:92 + main.ts comments overreach — HOFIN draws only the 3-char in-progress buffer (AMODE1.SRC:242-249), NOT the persisted multi-row table (df7-4's own un-ported layout). Narrow the prose to the entry line.
**CMT-3 (comment subagent, LOW):** main.ts:130 "the HOFIN display" repeats the overreach for the whole screen.
**Comment subagent VERIFIED accurate:** start.ts's four mechanism comments (entryOpen gate, single-exit edge, reseed-preserve-board), the pac-man citation, scene.ts JSDoc, HOFUL/HOFAS claims.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | tests/lint/citations/orchestrator all GREEN, tree clean, no debug code |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — Reviewer covered edges personally (found R-INDEP-1) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — rule_checker mutation-tested the guards instead |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 (1 high, 1 med, 1 low) | confirmed 3 (CMT-1/2/3); verified start.ts mechanism comments accurate |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | findings | 2 (1 med, 1 low) | confirmed 2 (SEC-1/2); verified OOB-safe, ADR-0005, purity, persistence |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | 30-check lang-review clean; all 4 hardened test guards mutation-tested & bite |

**All received:** Yes (4 enabled all returned; 5 disabled pre-filled)
**Working-tree audit:** `pf reviewer audit-tree` flagged only `sprint/epic-df7.yaml` (pf status stamp in_progress→in_review, EXIT=0 — the documented false-DIRTY-on-status-stamp; NO source mutation leaked). Tree verified clean of code changes.
**Total findings:** 6 confirmed (2 high, 2 medium, 2 low) + 1 recommended-defensive, 0 dismissed, 0 deferred

## Reviewer Assessment

**Round 1 — Marcus Tullius Cicero (Reviewer)**
**Verdict:** REJECTED
**Round-Trip Count:** 1

The implementation is well-structured and the pipeline is green (992 defender + 503 orchestrator tests, tsc clean, 318 citations byte-verified). The core state-machine logic in `start.ts` is correct — **[RULE]** the 30-check lang-review pass found no violations, the entry-open/loop-back edges are computed at `advanceStart`'s single exit (#14 compliant), the entryOpen gate faithfully mirrors pac-man pm4, and the four previously-hardened test guards were independently mutation-tested by the rule-checker and all bite. Security-critical properties hold: no out-of-bounds framebuffer write is reachable (`blitGlyph` clips), ADR-0005 (no full-frame strobe) is upheld by construction with non-vacuous tests, and the purity boundary is intact.

But the story is **not shippable as-is**: the render half of the flow is wired into the live cabinet while the flow half that gives it meaning is deferred, producing a reachable regression; a ROM-citation prose claim mischaracterizes the routine it cites (a fidelity defect in a citation-gated project); and the new render path opens an untrusted-input DoS. All fixes are small and localized.

### CONFIRMED findings — must fix

**[HIGH] F1 — Live game-over renders the non-interactive hall-of-fame screen instead of df5-6's GAME OVER + score.**
`main.ts:134` passes the `hof` payload to `composeFrame` **unconditionally**, and `composeFrame` (`scene.ts:343`) keys its game-over branch on `sim.gameOver` — which `stepSim` sets to `true` on men<0 during **live play** (`sim.ts:450,485`), while `session.phase` stays `'play'` because `main.ts` never feeds `playerDied` to `advanceStart` (deferred to df7-7). So a normal game-over (lose all ships) renders `drawHallOfFame(board, nameEntry=null)` — the high-score table with **no entry line and no final score** — replacing the working df5-6 GAME OVER + score screen. The name-entry (the story's headline feature) is untriggerable by actually playing. Failure scenario: play Defender, lose all ships → the score/GAME-OVER screen is gone, an un-fillable hall-of-fame board is shown, sim frozen, no way forward. The `main.ts:130` comment "In play/attract the game-over branch is not taken, so it is inert" is provably FALSE (sim.gameOver is reachable in play) and is the root of the unconditional pass (lang-review #17).
**Fix:** gate the `hof` payload on `session.phase === 'game-over'` (e.g. `composeFrame(session.sim, W, H, session.phase === 'game-over' ? { board, nameEntry } : undefined)`), so the live men<0 falls through to the 3-arg `drawGameOverScreen` (df5-6 preserved) and the HOF screen renders only once df7-7 wires the phase edge — the render stays proven by tests. Fix the false comment. Add a test pinning that a `sim.gameOver` sim in phase `play` does NOT render the HOF screen (or that main's render is phase-gated).

**[DOC] [HIGH] F2 — HOFUD citation prose mischaracterizes the routine (ROM-fidelity defect).**
`claims/20-hall-of-fame.json:14` (HOF-HOFUD) and `glossary.md:94` say HOFUD is "advancing the initials cursor." Reading `AMODE1.SRC:325-369`, HOFUD **cycles the value of the currently-active letter** (`ADDA INIDIR`, A–Z wrap), then redraws; it never touches the slot index `INITN` — the cursor is advanced by a *separate* FIRE-switch routine (`AMODE1.SRC:186-211`, `HALL5: INC INITN`). The byte-verbatim is correct (right line), but the claim is a confabulated mechanism (the class the project's own memory warns about). `citations.test.ts` cannot catch a wrong *prose* claim beside a right verbatim.
**Fix:** reword the claim + glossary to "HOFUD cycles the selected initial's letter (A–Z, wraps) via the up/down stick; the cursor/slot advances via the ROM's separate FIRE-switch handler (uncited) — mapped in df7-4 onto @shared/name-entry's letter-append keyboard input."

**[SEC] [MEDIUM] F3 — Untrusted `localStorage` board name → unbounded per-frame render cost (client DoS).**
`drawHallOfFame` (`scene.ts:300-304`) draws every board row's `name` character-by-character every frame, and `@shared` `isHighScoreRow` caps no `name.length`. A row like `{"name":"A".repeat(2_000_000),"score":1}` written to the `defender-high-scores` key (shared-origin XSS on `arcade.slabgorb.com`, or devtools self-poison) passes validation, loads into `session.board`, and stalls the main thread on the game-over screen (~tens of millions of clipped blit ops/frame). df7-4 is the first code to render board content. (Reachable via F1's live path; even after F1 is fixed, it is reachable once df7-7 makes game-over live.)
**Fix:** defensively bound the drawn name in `drawHallOfFame` (`row.name.slice(0, N)` before formatting). Optionally also cap `name.length` in `@shared` `isHighScoreRow`.

**[DOC] [MEDIUM] F4 — HOFIN citation prose overreaches (entry buffer vs. the whole table).**
`claims/20-hall-of-fame.json:4` (HOF-HOFIN) + `glossary.md:92` + `main.ts:63,130` say HOFIN "renders the board's initials ... the table"/"the HOFIN display." HOFIN (`AMODE1.SRC:242-249`) only (re)draws the 3-char in-progress initials buffer during entry; the persisted multi-row table is df7-4's own un-ported layout (the `drawHallOfFame` block comment already says the layout is "ours"). The prose conflates the two.
**Fix:** narrow the HOFIN claim/glossary to the in-progress-entry line, and reword `main.ts:63,130` to "the hall-of-fame screen (title + board + in-progress HOFIN entry line)."

**[DOC] [LOW] F5 — `main.ts:130` "the HOFIN display" for the whole screen.** Same overreach as F4; fix together.

### Recommended (defensive, Dev's discretion — root is @shared, may be filed separately)

**[SEC] [LOW] F6 — Untrusted board is not re-sorted; `qualifiesForHighScore` assumes descending order.**
`@shared` `makeHighScoreStorage.load()` filters but never sorts, and `advanceStart` calls `qualifiesForHighScore(session.board, score)` on the raw loaded board; an out-of-order/tampered board (also negative scores, which `isHighScoreRow` accepts) can give a wrong qualify answer (no crash). Cheap Defender-side fix: sort/clone before qualify. Better long-term: sort + `score > 0` in `@shared` `load()`/`isHighScoreRow` (benefits every game) — reasonable to file as a separate @shared story rather than block df7-4.

### Scope note (accepted, not a finding)
The deferral of the `playerDied` shell edge to df7-7 is legitimate (documented by TEA + Dev; matches the epic's pure-first/wired-after model). F1 is NOT a request to wire playerDied here — it is that the LIVE render must not regress while that edge is deferred. The abandoned-entry-timeout Delivery Finding (Dev's, for df7-7) is correctly out of df7-4 scope.

**Rework summary:** fix F1–F5 (F1 + F2 are the blockers); F6 recommended. Re-request review when done.
## Dev Assessment — rework round 1 (Lucius Vorenus)

**Addressed Reviewer round 1 (F1–F5 fixed; F6 deferred per the reviewer's "may be filed separately").** Commit 3549a8e5. 994 defender + 503 orchestrator green, tsc clean, 318 citations verified.

- **F1 [HIGH] — fixed.** `main.ts` now gates the `hof` payload on `session.phase === 'game-over'` (inlined in the `composeFrame` call). A live men<0 (`sim.gameOver` true in phase `play`, the edge unwired until df7-7) now keeps df5-6's GAME OVER + final-score screen; the hall-of-fame screen renders only once the phase reaches game-over. Fixed the false "inert in play" comment. The main-wiring anchor now requires the phase gate (`composeFrame(session.sim … session.phase === 'game-over' … board … nameEntry …)`), verified to match and to redden if the gate is removed.
- **F2 [HIGH] — fixed.** HOFUD claim + glossary reworded: the up/down stick CYCLES the selected initial's letter (A–Z), not the cursor slot (a separate FIRE-switch handler advances that). Verbatim unchanged — `citations.test.ts` still byte-verifies.
- **F3 [MEDIUM] — fixed.** `drawHallOfFame` truncates each untrusted board `name` to `HOF_MAX_NAME_CHARS = 8` (exported) before drawing, bounding the per-frame render cost of a poisoned localStorage board. Pinned by a truncation test + a non-vacuity companion.
- **F4/F5 [MEDIUM/LOW] — fixed.** HOFIN prose (claim + glossary + `main.ts:63,130`) narrowed to the in-progress entry line; the persisted table is df7-4's own un-ported layout, not HOFIN.

**F6 [LOW] — deferred to a separate @shared story (Delivery Finding below).** The root is `@shared` `makeHighScoreStorage.load()`/`isHighScoreRow` (unsorted untrusted board + negative scores accepted), which affects all 11 games and their tests; the reviewer explicitly allowed filing it separately. df7-4's render DoS (the reachable-from-here risk) is closed by F3.

**Handoff:** back to review (Marcus Tullius Cicero).

## Review Correlation (rework round 1 → lang-review typescript.md)

All six findings were caught by the INTERNAL review pipeline (this session's Reviewer + the comment/security/rule subagents) — none is an external or CI blind spot — so each maps to an EXISTING checklist check (source: internal; classification: process/knowledge already in the checklist). No NEW_CHECK required; the project-local `.pennyfarthing/gates/lang-review/typescript.md` is left unchanged (it is framework-regenerated and every finding already has a governing check).

| Finding | Source | Maps to (existing check) | Class |
|---|---|---|---|
| F1 false "inert in play" comment | Reviewer | #17 (comment asserts a mechanism nobody re-ran) | EXISTING_CHECK |
| F1 render keyed on `sim.gameOver` vs authoritative phase | Reviewer | #14/#27 (derived state/gate reachable in an unexpected mode) | EXISTING_CHECK |
| F2 HOFUD citation prose wrong | comment-analyzer | #17 (doc asserts a mechanism nobody re-ran) | EXISTING_CHECK |
| F3 untrusted board name → unbounded render | security | #21 (degenerate/unvalidated external input reaching per-frame code) | EXISTING_CHECK |
| F4/F5 HOFIN prose overreach | comment-analyzer | #17 | EXISTING_CHECK |
| F6 unsorted/negative untrusted board | security | #21/#4 (degenerate input; nullish/validation) | EXISTING_CHECK (deferred to @shared) |

### Rule Compliance (rework diff — lang-review typescript.md)
The rework touched `main.ts` (a phase-gate ternary), `scene.ts` (`String(row.name).slice(...)` + an `export const`), and two test files (`satisfies`, one new import). Self-reviewed against all 30 checks: no `as any`/`@ts-ignore`/non-null assertions (#1), correct nullish handling (#4 — `String()` coerces defensively, no `||`), no enum/async/JSX concerns, `.js` extensions intact (#5), tests use `satisfies` not `as` (#8), and the new F3 truncation guard carries a non-vacuity companion (#15/#18). tsc clean; 994 defender + 503 orchestrator green.
## Subagent Results

**Cycle: 1**

_Verification method: re-ran all four enabled subagents (preflight, comment-analyzer, security, rule-checker) on the rework diff this cycle._


| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | 994 defender + 503 orchestrator green, lint, 318 citations, no debug, clean tree |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | clean | 0 new | F2/F4 citation fixes VERIFIED accurate vs the ROM; F1/F3 comments TRUE; verbatims unchanged |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | 0 new | F3/F1 FIXED, F6 correctly deferred (no false-fix), no new vulns |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | 30-check clean; F1 anchor + F3 truncation guards mutation-tested & bite (incl. off-by-one) |

**All received:** Yes (4 enabled all returned; 5 disabled pre-filled)
**Working-tree audit:** `pf reviewer audit-tree` flagged only `sprint/epic-df7.yaml` (pf status stamp, EXIT=0 — the documented false-DIRTY; no source mutation). Tree verified clean of code changes.
**Total findings:** 0 new; all 6 round-1 findings resolved (F1–F5 fixed & verified, F6 correctly deferred)

## Reviewer Assessment

**Round 2 — Marcus Tullius Cicero (Reviewer)**
**Verdict:** APPROVED
**Round-Trip Count:** 2

The round-1 rework is complete and every finding is resolved, each independently re-verified this cycle by the specialist that raised it:

- **[HIGH] F1 — FIXED.** `main.ts` now gates the hall-of-fame payload on `session.phase === 'game-over'`, so a live men<0 (`sim.gameOver` raised in phase `play`, the edge unwired until df7-7) falls to df5-6's `drawGameOverScreen` (GAME OVER + score) — the regression is gone, and the HOF render stays exercised by tests and comes alive at df7-7. **[SEC]** confirmed the fallback path draws no untrusted board and no interaction; **[RULE]** mutation-tested the new phase-gate anchor (reddens for both the ungated and the bare-3-arg regressions); the false "inert in play" comment is corrected and **[DOC]** verified the new comment's mechanism claims TRUE against `sim.ts`/`phase.ts`.
- **[DOC] [HIGH] F2 — FIXED.** HOFUD prose reworded; comment-analyzer traced `AMODE1.SRC:325-369` and confirmed HOFUD cycles the letter value (never writes `INITN`; the FIRE-switch handler at :207 does). Verbatim unchanged, still byte-verifies.
- **[SEC] [MEDIUM] F3 — FIXED.** `drawHallOfFame` truncates each untrusted name to `HOF_MAX_NAME_CHARS=8`; security confirmed every untrusted quantity (name, rows, score) is now bounded and no residual DoS; **[RULE]** mutation-tested the truncation guard (reddens on removed-slice and off-by-one) with a real non-vacuity companion.
- **[DOC] [MEDIUM/LOW] F4/F5 — FIXED.** HOFIN prose narrowed to the in-progress entry line; comment-analyzer traced `INIT$V → INITS` and confirmed HOFIN does not touch the persisted table. No conflation remains.
- **[SEC] [LOW] F6 — correctly deferred** to a separate `@shared` hardening story (Delivery Finding filed). `src/shared/highscore.ts` is untouched, no false-fix claim, and the rework does not depend on or worsen the sort-order gap.

No new findings in any dimension; production code is clean against all 30 lang-review checks, the two new/changed test guards bite, and the pipeline is green (994 defender + 503 orchestrator, tsc clean, 318 citations byte-verified). The story meets all four ACs: the pure flow (AC1/AC3), the HOFIN render (AC2) with byte-verified citations, and the ADR-0005 no-strobe guard (AC4). The `playerDied`/game-over-reachability deferral to df7-7 and the abandoned-entry-timeout Delivery Finding are correct scope boundaries, not defects.

**Approved for merge.**