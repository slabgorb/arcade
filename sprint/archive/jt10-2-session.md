---
story_id: "jt10-2"
jira_key: "jt10-2"
epic: "jt10"
workflow: "tdd"
---
# Story jt10-2: Cabinet state machine: new core cabinet.ts (attract/title/select/playing/gameover/highscore) wrapping the session, hinged on GOVER

## Story Details
- **ID:** jt10-2
- **Jira Key:** jt10-2
- **Workflow:** tdd
- **Stack Parent:** jt10-1 (DONE — fonts ported & merged, PR #65)
- **Repos:** arcade
- **Branch Strategy:** gitflow (feat/jt10-2-cabinet-state-machine)
- **Branch:** feat/jt10-2-cabinet-state-machine
- **PR:** https://github.com/slabgorb/arcade/pull/68

## Background

Joust's shell (`plugins/joust/src/main.ts`) boots straight into a seeded wave-1 game and steps it forever. The cabinet lifecycle a real machine cycles through — attract/title, coin-up 1P/2P select, game over, high-score entry — is absent.

This story adds the **third core tier**: a new pure module `plugins/joust/src/core/cabinet.ts` holding a `CabinetState { mode, ... }` mode machine that WRAPS the existing session (`createGame`/`stepGame` in `plugins/joust/src/core/game.ts`), exactly as tempest layers its `Mode` (`plugins/tempest/src/core/state.ts`) above its sim:

```
sim (frame.ts) ⊂ session (game.ts) ⊂ cabinet (cabinet.ts)   ← new tier
```

**Scope of THIS story:** pin the machine's states and transitions ONLY. No screens, no rendering, no font wiring — those are jt10-3..jt10-7 (all `depends_on: jt10-2`). `main.ts` stays untouched or minimally touched.

**The hinge is the EXISTING `GOVER` tri-state** already modelled in `game.ts` (shipped jt4-4). Verified against source `plugins/joust/src/core/game.ts:183-185`:

| Symbol | Value | Meaning | line |
|--------|-------|---------|------|
| `GOVER_OVER` | `0` | all players out → game over | 183 |
| `GOVER_RUNNING` | `-1` | game in progress (a lone survivor keeps it running) | 184 |
| `GOVER_ATTRACT` | `0x7f` | attract / game-SIMULATION mode | 185 |

Reuse points, exact signatures (verified in source):
- `createGame(seed: number, playerCount = DEFAULT_PLAYER_COUNT): GameState` — game.ts:317; boots `gover: GOVER_RUNNING` (:335).
- `stepGame(game: GameState, inputs?: Record<number, PlayerInput>): GameState` — game.ts:399; pure/deterministic; re-settles GOVER each frame.
- `settleGameOver(players: readonly PlayerLedger[]): { players: PlayerLedger[]; gover: number }` — game.ts:359; returns `GOVER_OVER` iff EVERY player is `out`, else `GOVER_RUNNING` (:361).

Design authority: [docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md](../../docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md) (§Architecture, §"The mode set", §Testing strategy). Full technical context: [sprint/context/context-story-jt10-2.md](../sprint/context/context-story-jt10-2.md).

**Purity constraint (BLOCKING):** every new `src/core/` module is swept by the jt1-7 boundary scanner — no clock, no ambient entropy, no browser surface, no shell/`@shared/font` import. The scanner reads **comment text**, so the literal strings `window.` / `document.` must not appear even in comments.

## Acceptance Criteria

Derived from the design spec; CANONICAL for RED/Review.

1. **Pure cabinet.ts module** — new `plugins/joust/src/core/cabinet.ts` with `CabinetState` and transition functions; passes the jt1-7 purity scanner (no clock/DOM/shell import; no `window.`/`document.` in comments).

2. **CabinetState wraps session** — `CabinetState { mode: CabinetMode, game: GameState, ... }` where `GameState` is the existing session type; `mode` is the ONLY new top-level concern — all session state (players, gover, wave, sim, events) lives in the wrapped `game`.

3. **Mode set pinned** — `type CabinetMode = 'attract' | 'title' | 'select' | 'playing' | 'gameover' | 'highscore'`; tests assert every mode is reachable via at least one transition path.

4. **GOVER hinge transitions pinned as pure transforms** —
   - `GOVER_ATTRACT (0x7f)` → `'attract'`
   - `GOVER_RUNNING (-1)` → `'playing'`
   - `GOVER_OVER (0)` (from `settleGameOver()`) → `'gameover'`
   - `gameover` → `highscore` IFF the score qualifies (VALUE check via the highscore-qualifies predicate, not a lexical/string check)
   - `highscore` → `attract` (transition planted; jt10-7 owns the actual entry trigger)
   - all transitions DETERMINISTIC (same input → same output).

5. **Session wrapping unchanged** — `createGame()`/`stepGame()` signatures, return values, and pure semantics untouched; cabinet transitions READ GOVER / `settleGameOver()` output and do not mutate the session.

6. **Vitest core suite covers mode transitions** — seed-replay fixtures at each GOVER boundary; a mutation test that toggles GOVER at the game-over boundary and asserts the mode flips (mutation must point at a WRONG value, not just ban the old spelling); coverage of attract→playing (via select), playing→gameover, gameover→highscore (qualifies), gameover→attract (non-qualifying). All tests run on pure cabinet functions; no shell mocking.

## Out of Scope (owned by later jt10 stories)
- Title screen / JOUST logo (jt10-3), attract self-play + banner pages (jt10-4), 1P/2P select overlay (jt10-5), GAME OVER overlay (jt10-6), high-score initials ENTRY + JOUST CHAMPIONS table (jt10-7).
- Any rendering, font layout, or `main.ts` screen wiring. This story pins the pure machine only.

## Quarry / gotchas for TEA
- **Verify, don't trust:** GOVER values above were re-read from source at setup, but re-confirm before RED — memory warns SM pre-measured corrections can be wrong ([[sm-premeasured-corrections-can-be-wrong]]).
- **Mirror tempest's shape:** read `plugins/tempest/src/core/state.ts` for the Mode-machine shape (mode enum + wrap-the-sim transition fn) before designing the contract.
- **The qualifies branch:** the `gameover → highscore` gate is a VALUE check against the high-score table. `@shared/highscore` holds `qualifies()`; per the fleet rule + [[highscore-initials-live-in-core]] the qualifies/initials logic belongs in core — but jt10-7 owns the ENTRY. For jt10-2, pin the BRANCH (qualifies → highscore, else → attract) as a pure decision; do not build the entry UI.
- **Mutation direction:** memory [[mutate-with-a-wrong-value-not-the-old-one]] and [[mutation-direction-must-be-restrictive]] — a guard that only bans the stale spelling passes on a permissive mutant. Point GOVER-boundary mutations at a value matching nothing correct.
- **Purity scanner reads comments** ([[tempest-purity-scanner-reads-comments]]).

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-07T16:45:26Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-07T16:23:05Z | 2026-08-07T16:24:30Z | 1m 25s |
| red | 2026-08-07T16:24:30Z | 2026-08-07T16:39:09Z | 14m 39s |
| green | 2026-08-07T16:39:09Z | 2026-08-07T16:42:02Z | 2m 53s |
| review | 2026-08-07T16:42:02Z | 2026-08-07T16:45:26Z | 3m 24s |
| finish | 2026-08-07T16:45:26Z | - | - |

## Sm Assessment

**Story is ready for RED.** Dependency jt10-1 (fonts) is merged; the GOVER hinge this story pivots on already exists in `game.ts` (values `0` / `-1` / `0x7f` re-verified against source at :183-185). No `cabinet.ts` exists yet — building from zero. The design spec and real `game.ts` agree on every reuse point; sm-setup found no discrepancies and I confirmed the three constant values and the `createGame`/`stepGame`/`settleGameOver` signatures independently.

Scope is tight and correctly bounded: this story pins the PURE mode machine and its GOVER-driven transitions only — no screens, no rendering, no `main.ts` wiring (those are jt10-3..jt10-7, all gated on this). TEA should mirror the tempest `core/state.ts` Mode shape, pin each GOVER→mode transition as a pure transform, and use restrictive/wrong-value mutations at the game-over boundary (not stale-spelling bans). Watch the jt1-7 purity scanner (reads comments) and treat the `gameover→highscore` gate as a VALUE (qualifies) branch, deferring the entry UI to jt10-7.

## TEA Assessment

**RED landed clean.** 23 behaviour tests fail on the absent module (`cabinet not built yet`), 2 controls pass by design, the rest of the joust suite is green (3083 pass), and `npm run lint` is clean.

**The module surface I pinned** (Dev implements to match — `tests/helpers/cabinet-contract.ts`):
- `CabinetMode = 'attract'|'title'|'select'|'playing'|'gameover'|'highscore'` (union, not enum).
- `CabinetState { readonly mode, readonly game }` — `game` is the REAL jt4 `GameState` (the contract imports the live types from `../../src/core/game.js` + `flight.js`, not `game-contract.ts`'s jt4-1-era narrower shapes; that mismatch is a lint error, now avoided).
- `createCabinet(seed, playerCount?)` → boots `attract` over `createGame(...)`.
- `modeForGover(gover)` → the hinge: `$7F→attract`, `-1→playing`, `0→gameover`.
- `toTitle` / `toSelect` / `startPlaying(cab, seed, playerCount?)` / `toAttract(cab, seed, playerCount?)` — the cabinet-tier edges.
- `stepPlaying(cab, inputs?)` → delegates to `stepGame`, re-derives mode from the settled gover.
- `afterGameOver(cab, table)` → `highscore` iff `qualifiesForHighScore(table, bestPlayerScore)`, else `attract`. Import `qualifiesForHighScore` from `@shared/highscore` (pure in core — tempest's `state.ts` does the same).
- Re-export game.ts's `GOVER_OVER/RUNNING/ATTRACT` through the module (tests pin they equal game.ts's, not a private redefinition).

**Traps handled at RED (evidence, not assertion):**
- Verified the three GOVER values (`0/-1/0x7f`) and the `createGame/stepGame/settleGameOver` signatures against `game.ts:183-185,317,359,399` — matched.
- The `gameover→highscore` gate is pinned as a VALUE check on the BEST player score with asymmetric co-op fixtures (`[4000,6000]` vs full-board lowest `5000` → highscore), so a P1-only / min / lexical mis-derivation reddens ([[derived-vs-transcribed-needs-synthetic-input]]).
- `modeForGover` mutation coverage is restrictive: three DISTINCT modes + `GOVER_OVER` is explicitly `not` `'playing'`/`'attract'` ([[mutation-direction-must-be-restrictive]]).
- Purity pinned per-module AND via the existing `it.each` sweep in `purity.test.ts` (auto-bites `cabinet.ts` on landing); the `window.`/`document.`-in-comments trap is guarded ([[tempest-purity-scanner-reads-comments]]).
- Bumped `plugins/joust/README.md` test-file count 153→154 — adding a `tests/*.test.ts` reddens `audio-seam-scope`'s derived count ([[joust-test-file-count-census]]). Re-confirmed the guard green.

### Rule Coverage (lang-review/typescript.md)
- **Union over string enum (§33):** `CabinetMode` is a union; pinned by a compile-time `Record<CabinetMode, true>` drift guard (adding/removing a member fails to typecheck).
- **`readonly` on non-mutated params/fields (§26):** `CabinetState` fields and `afterGameOver`'s `table` typed `readonly`; purity tests assert `afterGameOver` mutates neither state nor table.
- **No bare-keyword source assertions (§132):** avoided — behaviour is pinned by output/mode, not `toContain('readonly')`-style text scans (the one source read is the semantic purity scanner + the justified `window.`/`document.` literal ban).
- **No `as any` in tests (§69):** none used.

**For Dev (GREEN):** implement `plugins/joust/src/core/cabinet.ts` to the contract above; keep it inside the jt1-7 boundary (no clock/DOM/shell import; `@shared/highscore` is allowed). No new claim/citation dossier is needed — the mode machine is a port-architecture decision mirroring tempest, not a ROM transcription; the GOVER citations already live in `game.ts` / `game-loop-source.test.ts`.

**Handoff:** To Dev (Julia) for GREEN.

## Dev Assessment

**GREEN — all 25 cabinet tests pass, full joust suite green (3107), lint clean.**

Implemented `plugins/joust/src/core/cabinet.ts` (121 lines, one new file — no `main.ts`/render/registry changes) exactly to the contract, minimalist:
- `CabinetMode` union + `CabinetState { readonly mode, readonly game }`.
- `createCabinet` boots `attract` over `createGame`; `startPlaying`/`toAttract` wrap a fresh `createGame(seed, playerCount)`; `toTitle`/`toSelect` are pure `{ ...cab, mode }` edges.
- `modeForGover` is three `if`-returns over the re-exported `GOVER_*` constants, throwing on an out-of-range rung (the three are the only values GOVER holds; defensive, not test-reached).
- `stepPlaying` = `stepGame` then `modeForGover(game.gover)` — one stepping path.
- `afterGameOver` reduces players to the best score and routes via `qualifiesForHighScore`.

Notes:
- Kept `cabinet.ts` inside the jt1-7 boundary: imports only `./game.js`, `./flight.js`, and `@shared/highscore` (the last is pure and allowed in core, as tempest's `state.ts` shows); comments avoid the `window.`/`document.` literals. The `purity.test.ts` `it.each` sweep now includes `cabinet.ts` and passes (that is the +1 test: 3106→3107).
- `startPlaying`/`toAttract` ignore their `cab` arg (a fresh game); `noUnusedParameters` is off so this lints clean.
- No claim/citation dossier added — this is a port-architecture tier mirroring tempest, not a ROM transcription (TEA's note); the GOVER citations already live in `game.ts`/`game-loop-source.test.ts`.

**Handoff:** To TEA (verify phase — simplify + quality pass).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Question / non-blocking] `title` vs the attract sub-cycle.** The design spec lists `title` as a top-level mode AND describes attract as a sub-cycle that steps *through* title → high-score table → demo → banners (`ATT.SRC`). jt10-2 pins `title` as a reachable mode via `toTitle` and defers the attract-page SCHEDULER (page order + colour cadence) to **jt10-4**, which owns `ATT.SRC`. jt10-3 (title screen) and jt10-4 (attract cycle) should reconcile whether the title page is entered as the `title` mode or rendered as an attract sub-page — the machine supports either. No code owner needed beyond the existing jt10-3/jt10-4 stories.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (3107 joust green, 408 orchestrator green, tsc clean, check-citations 988 verified/0 errors, tree clean, zero code smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via config.local.yaml |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via config.local.yaml |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via config.local.yaml |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via config.local.yaml |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via config.local.yaml |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via config.local.yaml |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via config.local.yaml |
| 9 | reviewer-rule-checker | No | Skipped | disabled | Disabled via config.local.yaml |

**All received: Yes** — 1 of 1 enabled subagents (`reviewer-preflight`) returned; the other 8 are disabled in `reviewer_subagents`. Because self-re-reading finds nothing when the specialists are off ([[reviewer-subagents-disabled-use-mutation]]), I ran a MUTATION BATTERY over cabinet.ts's load-bearing logic instead — the domains those specialists cover (correctness, test quality) were exercised directly.

## Reviewer Assessment

**Verdict: APPROVED** (Thought Police, opus).

**What was verified, not trusted:**
- **Mutation battery** on `plugins/joust/src/core/cabinet.ts`, each mutation applied → suite run → reverted (tree confirmed clean after):
  - M1 `modeForGover` collapses `GOVER_OVER → 'playing'` → **4 fail** (caught).
  - M2 `afterGameOver` best `Math.max → Math.min` → **4 fail** (the asymmetric co-op `[4000,6000]` fixture catches it).
  - M3 `afterGameOver` qualifies branch flipped → **7 fail** (caught).
  - M4 `stepPlaying` caches mode instead of re-deriving from the settled gover → **2 fail** (caught).
  - M5 `createCabinet` boots `'playing'` not `'attract'` → **1 fail** (caught).
  - Every mutation reddened; the baseline restores to 25/25. The suite is not vacuous.
- **Purity:** the `purity.test.ts` `it.each` sweep now includes `cabinet.ts` and passes; `cabinet.ts` imports only `./game.js`, `./flight.js`, `@shared/highscore` (the last is pure and allowed in core, per tempest's own `state.ts`), and names no `window.`/`document.` even in comments.
- **Session untouched (AC-5):** the diff adds `cabinet.ts` only — `game.ts`/`main.ts` are not modified, so the wrapping cannot have changed the session; the delegation test compares the wrapped game byte-for-byte to a raw `createGame`/`stepGame`.
- Preflight: joust 3107 green, orchestrator 408 green, lint clean, citations 988/0, no code smells, tree clean.

**Findings (all NON-BLOCKING, explicitly scoped — no code owner beyond existing stories):**
- **[Low] No legal-predecessor guards.** `startPlaying`/`toAttract` ignore their `cab` arg and mint a fresh `createGame`; the machine does not enforce which mode may precede a transition. This is correct for a pure transition machine — flow control (which edge is legal when) is a screen/input concern owned by jt10-5/jt10-6. Not a defect.
- **[Nit] `afterGameOver` non-qualifying branch keeps the over-game.** Going to `'attract'` on a non-qualifying gameover preserves the dead wrapped game (mode `attract`, game over); the fresh attract-cycle reset is `toAttract` / jt10-4. Documented in the contract; jt10-4 owns the reset when it wires self-play.

**Decision:** Clean to finish. No Critical/High/Medium. Transitions independently mutation-verified; all gates green; the one open design Question (title vs attract sub-cycle) is filed for jt10-3/jt10-4.