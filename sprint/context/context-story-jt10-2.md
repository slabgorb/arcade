# Story jt10-2 Context

## Title
Cabinet state machine: new core cabinet.ts (attract/title/select/playing/gameover/highscore) wrapping the session, hinged on GOVER

## Metadata
- **Story ID:** jt10-2
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust cabinet lifecycle — attract/title, 1P·2P select, game over, high-score, and Joust's two fonts
- **Depends on:** jt10-1 (DONE — fonts ported & merged)

## Problem
Joust's session layer (game.ts) already models game-over logic via the GOVER tri-state (shipped jt4-4), but the cabinet lifecycle — the outer shell that cycles through attract → title → select → playing → game over → high-score and back to attract — is absent. The mode machine must be a pure core tier wrapping the session, exactly as tempest layers its Mode above its sim, and pinned by vitest so shell drift cannot regress it.

## Technical Approach

### Architecture: Three-tier core
```
sim (frame.ts)  ⊂  session (game.ts)  ⊂  cabinet (cabinet.ts) ← NEW
```

The new `cabinet.ts` module wraps `createGame`/`stepGame`, transforming GameState into a higher-level CabinetState that carries both the mode and the wrapped session. Pure: no clock, no DOM, no shell import. Parity with tempest's `src/core/state.ts` (lines 1–286), which demonstrates the exact shape: Mode union, GameState interface, initialState function.

### The GOVER hinge

The GOVER tri-state already lives in game.ts (jt4-4) and routes the cabinet transitions:

- **GOVER_ATTRACT** (`0x7F` / 127, line 185 of game.ts) → cabinet mode `'attract'`
  - Self-play simulation under GOVER_ATTRACT; main.ts renders the attract cycle.
- **GOVER_RUNNING** (`-1`, line 184 of game.ts) → cabinet mode `'playing'`
  - Game is in progress; session (game.ts) manages scores/lives/waves.
- **GOVER_OVER** (`0`, line 183 of game.ts) → cabinet mode `'gameover'` → `'highscore'` (iff qualifies) → `'attract'`
  - From `settleGameOver()`: all players out (lives ≤ 0) → GOVER_OVER.
  - gameover → highscore iff the score qualifies for the table (via @shared/highscore `qualifiesForHighScore()`).
  - highscore → attract after initials are saved (jt10-7 wires the transition).

### The mode set

```ts
type CabinetMode = 
  | 'attract'    // self-play + cycling attract pages (title/scores/demo/rules)
  | 'title'      // JOUST logo + PRESENTED BY / EXTRA MOUNT / (C)1982
  | 'select'     // 1P / 2P start
  | 'playing'    // the game (wraps stepGame)
  | 'gameover'   // GAME OVER
  | 'highscore'  // initials entry, then JOUST CHAMPIONS table
```

Transitions are pure transforms of the CabinetState; no side effects, no stateful callbacks.

## Reuse-First Ledger

### From game.ts (jt4-1 / jt4-2 / jt4-4)

| Symbol | Type | Location | Used by | Notes |
|--------|------|----------|---------|-------|
| `GOVER_OVER` | const | game.ts:183 | settleGameOver(), cabinet transitions | `0` — all players out |
| `GOVER_RUNNING` | const | game.ts:184 | createGame(), cabinet transitions | `-1` — game in progress |
| `GOVER_ATTRACT` | const | game.ts:185 | — (ROM demo.ts uses it) | `0x7F` (127) — attract/demo mode |
| `createGame(seed, playerCount?)` | fn | game.ts:317 | Cabinet: init a playing game | `(seed: number, playerCount?: number): GameState` |
| `stepGame(game, inputs?)` | fn | game.ts:399 | Cabinet: step a playing game | `(game: GameState, inputs?: Record<number, PlayerInput>): GameState` |
| `settleGameOver(players)` | fn | game.ts:359 | Cabinet: evaluate game-over logic | `(players: readonly PlayerLedger[]): { players: PlayerLedger[]; gover: number }` — returns GOVER_OVER iff all out |
| `GameState` | interface | game.ts:76 | CabinetState field | `{ players, gover, wave, sim, events, guards? }` |
| `PlayerLedger` | interface | game.ts:55 | GameState field | `{ score, scoreBcd, lives, extraManAt?, out }` |

### From demo.ts (jt2-1)

| Symbol | Type | Location | Used by | Notes |
|--------|------|----------|---------|-------|
| `createWaveDemo(seed)` | fn | demo.ts | Cabinet: init attract demo | Returns DemoState seeded for self-play |
| `stepDemo(sim, inputs?)` | fn | demo.ts | Wrapped by game.ts | The frame-stepping function |
| `DemoState` | interface | demo.ts | Wrapped by GameState | `{ sim: SimState, wave, seed, events, ... }` |

### From @shared/highscore

| Symbol | Type | Location | Used by | Notes |
|--------|------|----------|---------|-------|
| `qualifiesForHighScore(table, score)` | fn | @shared/highscore | gameover→highscore branch | Pure: `score > 0 && (table.length < MAX || score > lowest)` |
| `HighScoreTable` | type | @shared/highscore | CabinetState field (optional) | `HighScoreEntry<'wave'>[]` (or per-game `<'level'>`) |

No @shared imports in cabinet.ts itself — the qualifies check happens in the transition decision, driven by the values the session already carries.

## Tempest Pattern Reference

**File:** `plugins/tempest/src/core/state.ts` (lines 1–286)

| Element | Tempest | Joust cabinet mapping |
|---------|---------|----------------------|
| Mode type (line 8) | `'attract' \| 'select' \| 'playing' \| 'dying' \| 'gameover' \| 'warp' \| 'highscore'` | Joust: `'attract' \| 'title' \| 'select' \| 'playing' \| 'gameover' \| 'highscore'` (no 'dying' / 'warp') |
| GameState interface (lines 205–249) | Carries `mode` + level + tube + player + bullets + enemies + spawn + pulse + warp + select + entry + highScoreTable + events + rng | Joust: Carries `mode` + wrapped GameState (players + gover + wave + sim + events + guards) |
| initialState function (line 251) | Boots with `mode: 'attract'` and initializes sub-fields | Joust: Should boot with `mode: 'attract'` and `game: createGame(seed, playerCount)` |
| Pattern | Mode + wrapped simulation = pure transforms | Cabinet mode + wrapped session (GameState) = pure transforms |

## Acceptance Criteria

Derived from [docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md](../../docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md):

1. **Pure cabinet.ts module**
   - New `plugins/joust/src/core/cabinet.ts` containing `CabinetState` interface and transition functions.
   - No clock, no DOM, no shell import; swept by jt1-7 purity scanner (no `window.` / `document.` even in comments).

2. **CabinetState wraps session**
   - `CabinetState { mode: CabinetMode, game: GameState, ... }` where `GameState` is the existing session type.
   - `mode` is the ONLY new field; all session state (players, gover, wave, sim, events) lives in the wrapped `game`.

3. **Mode set pinned**
   - Type `CabinetMode = 'attract' | 'title' | 'select' | 'playing' | 'gameover' | 'highscore'`.
   - Tests assert that every mode is reachable via at least one transition path.

4. **GOVER hinge transitions pinned as pure transforms**
   - `GOVER_ATTRACT (0x7F)` → mode `'attract'`.
   - `GOVER_RUNNING (-1)` → mode `'playing'`.
   - `GOVER_OVER (0)` from `settleGameOver()` → mode `'gameover'`.
   - `gameover` → `highscore` IFF `qualifiesForHighScore(currentScores)` (value check, not lexical).
   - `highscore` → `attract` (transition planted; jt10-7 owns the trigger).
   - All transitions are DETERMINISTIC from the state (same input = same output).

5. **Session wrapping unchanged**
   - `stepGame()` and `createGame()` signatures, return values, and pure semantics are untouched.
   - Cabinet transitions read GOVER and `settleGameOver()` output; do not mutate the session.

6. **Vitest core suite covers mode transitions**
   - Test fixtures: seed-replay game states at each mode boundary (GOVER transitions).
   - Mutation: toggle GOVER values at game-over boundary; assert mode flips.
   - Coverage: attract → playing (via select), playing → gameover, gameover → highscore (qualifies), gameover → attract (non-qualifying).
   - No shell mocking; all tests run on pure cabinet functions.

## Out of Scope

- **No rendering:** this story pins the machine only. Screens (title/attract/select/game-over/high-score entry) are jt10-3 … jt10-7.
- **No shell wiring:** `main.ts` is untouched; a follow-on story (jt10-3 onwards) will render each mode.
- **No input routing:** input dispatch stays in main.ts; cabinet receives only state mutations.

## Constraints

1. **Purity:** jt1-7 scanner sweeps the module; no ambient entropy, no browser surface, no shell dependency.
   - The literal strings `window.` or `document.` must not appear even in comments.
   - No import from `@shared/` — keep it pure. (Callers in shell can call `qualifiesForHighScore()` to decide the gameover → highscore branch.)

2. **Radix discipline:** Motorola notation — bare decimal, `$` hex (inherited from game.ts).

3. **Tempest parity:** match the shape of `state.ts` — a Mode type, a GameState interface, initialization, and stepwise state transitions.

## Quarry for TEA

### 1. Purity Scanner Constraint
The jt1-7 boundary scanner is LIVE on this story the moment cabinet.ts lands. Every function must pass:
- No `window.`, `document.`, `Date`, `performance`, `Math.random()`, `requestAnimationFrame`.
- Comments are scanned too — the words `window.` or `document.` in a comment FAIL the gate.
- No import from `src/shell/` or any non-pure module.
- Verify by running: `npx vitest run --project joust boundary` (once jt1-7 wiring exists).

### 2. GOVER Hinge Semantics
The tri-state is already live in game.ts (jt4-4). Respect the ROM's three meanings:
- `GOVER_OVER (0)`: the ROM's "STATE OF GAME = OVER" — set ONLY when ALL players out.
- `GOVER_RUNNING (-1)`: the ROM's "STATE OF GAME = STARTING" — a game in progress; a survivor keeps it here.
- `GOVER_ATTRACT (0x7F)`: the ROM's "GAME SIMULATION MODE" — self-play in demo.ts; never seeded by createGame().

Do NOT re-interpret these values; they are direct transcriptions (game.ts lines 173–185).

### 3. Qualifies Branch Logic
The gameover → highscore transition depends on `qualifiesForHighScore(table, score)` from @shared/highscore. This is called by the *shell* (jt10-7 owns the entry), not by cabinet.ts — the cabinet only reaches `gameover` mode. The cabinet's job: transition to the MODE, not to decide the branch. In tests, you can hard-wire the branch (true/false) to cover both paths.

**Per CLAUDE.md fleet rule [[highscore-initials-live-in-core]]:** qualifies logic IS core, but initials entry (the screen) is shell. The cabinet pins the mode; the entry controller pins the transition trigger.

### 4. No Rendering in This Story
Screens are jt10-3 … jt10-7. Cabinet.ts is STATE ONLY — no canvas, no text layout, no blit calls. The _next_ phase (RED/Review) will show you a shell caller that renders the current mode; you are building what it calls, not how it paints.

### 5. Tempest State.ts is the Gold Standard
Read [plugins/tempest/src/core/state.ts](../../plugins/tempest/src/core/state.ts) line-by-line before coding. The shape you build is NOT a copy, but it follows the same pattern:
- Type: Mode union.
- Interface: GameState (ours wraps an existing GameState; tempest's is the whole board).
- Function: initialState / stepCabinet or equivalent.
- Transitions: pure transforms, no callbacks.

### 6. Stale-ness Risk: GOVER Carries Forward
The session (game.ts) RECOMPUTES GOVER every frame (settleGameOver, line 466: "RECOMPUTE, never carry gover forward"). Your cabinet must also RECOMPUTE the mode from gover every frame, not cache it. A stale mode can cause the shell to miss a transition.

### 7. Two-Player Co-op Shape
game.ts.PlayerLedger is an array with 0=P1, 1=P2. Both can be out (lives ≤ 0) at different times. The game-over law: out iff all players are out (a survivor keeps playing). Respect this in your tests.

## Test File Targets

Mirroring jt10-1 structure:

- `plugins/joust/tests/cabinet-state.test.ts` — mode transitions pinned as pure transforms
  - **AC-3:** every mode in the set is reachable
  - **AC-4:** GOVER hinge (attract/playing/gameover/highscore) transitions deterministic
  - **AC-6:** mutation: toggle GOVER; assert mode flips
  
- `plugins/joust/tests/cabinet-wrapping.test.ts` — cabinet wraps session unchanged
  - **AC-2:** CabinetState.game is the untouched GameState
  - **AC-5:** stepGame() results flow through cabinet.step (parity check)
  - Create a game, step it to various states, assert cabinet reflects each game state without drift

- No citation gate on this story (no ROM transcriptions) — cabinet.ts is logic only.

## Acceptance Criteria (Authoritative)

The 6 derived ACs above are CANONICAL for this story's RED/Review phase. If they drift from the session file `.session/jt10-2-session.md`, treat the session file as authority and re-sync them.

---

_Hand-authored by SM at setup (2026-08-07); replaces the `pf context create` stub. Authoritative acceptance criteria live in the session file._
