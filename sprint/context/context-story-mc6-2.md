# Context: mc6-2 — SETUP -> PLAY start-of-game

## Background

This story wires the **start-of-game edge** — the transition from `attract` or `over` states into `setup` -> `play`, seeding a fresh game via `createGame`. It builds directly on **mc6-1** (PR #160), which shipped the pure MAINLINE dispatch boundary in `plugins/missile-command/src/core/state.ts`:

- `type Phase = 'attract' | 'setup' | 'play' | 'pause' | 'between' | 'over'`
- `S_PLAY=0x00`, `S_PAUS=0x80`, `S_SETU=0x40` (ROM STATE codes, cited W3COMN.MAC:61/59/57)
- `stateCode(phase): number`, `mainline(phase): 'play'|'pause'|'setup'` (high-bit sign dispatch)
- `INITIAL_PHASE: Phase = 'attract'`, `INITIAL_ATTRACT = true`

mc6-1 **deliberately deferred** the edge transitions to mc6-2 — it is the dispatch boundary only.

### ROM Citation Ground Truth

REV-01 (035820-01) is the source of record:
- `W3MAIN.MAC:561 SETUP` — the SETUP state label (rom-study reference at `plugins/missile-command/reference/source/W3MAIN.MAC`, CRLF format)
- `W3MAIN.MAC:491 LDA I,S.SETU` — cabinet boot to SETUP/attract state (to be filed in claims)
- `W3MAIN.MAC:135 ATRACT` — attract state routine
- `W3COMN.MAC:61/59/57` — state codes S_PLAY, S_PAUS, S_SETU

## Technical Approach

**Pure core only.** This story implements phase transitions and game reseed logic in `src/core/` (state.ts and game.ts), with no shell imports, no clock, seeded RNG. The `purity.test.ts` suite must remain green.

### Transition Mechanism

A **start/coin action** (caller: shell, to be wired later) advances the phase:
- From `attract` or `over` → `setup` → `play`
- Reseed via `createGame(seed=1)` to produce: 6 live cities, 3 bases at full ammo, wave 1 schedule, score 0, full NICBMS budget
- Currently `createGame` hardcodes `phase: 'play'`; this story determines whether to introduce an explicit `setup` phase-step or reseed directly to play

### Reducer Integration

`stepGame(state, action)` (`game.ts:149`) currently imports only `nextPhase, nextWavePhase, resumePlay` from state.ts. It does **not** consume `mainline`, `stateCode`, or `INITIAL_PHASE`. There is **no attract/setup handling** in the reducer yet. This story extends the dispatch integration at that seam.

### Regression Constraints

- Keep all mc3/mc4 tests green (`nextPhase`, `nextWavePhase`, `resumePlay`, `allCitiesDead`, and 10+ combat/wave suites)
- Citations discipline: any new numeric literal in `src/core` needs a claim gated by `citations.test.ts`
- ROM line-number references go in `//` line comments, NOT JSDoc `/** */` (the mc-citations-scanner-jsdoc-leak trap)

## Target Files

- `plugins/missile-command/src/core/state.ts` — state dispatch and phase transitions
- `plugins/missile-command/src/core/game.ts` — createGame reseed logic and stepGame reducer integration
- `plugins/missile-command/docs/rom-study/claims/state.json` — add `MC-STATE-INIT` claim (cabinet boots to SETUP/attract, citing W3MAIN.MAC:491 + :135)
- `plugins/missile-command/tests/` — new/extended test suite (TEA's RED file to be created during implementation phase)

## Open Questions for Architecture/User (Surface at RED)

The title's transition ends at `play`, but critical design decisions remain:

1. **Intermediate setup phase:** Should mc6-2 introduce an explicit intermediate `setup` phase-step (attract/over → setup → play as two transitions) or a single start-action reducer that reseeds straight to play? The ROM SETUP state (W3MAIN.MAC:561) is a real distinct state, but whether it materializes on `GameState` at all is open.

2. **Boot-to-attract timing:** Does mc6-2 wire `createGame` to boot to `attract` (INITIAL_PHASE) now, or is boot-to-attract (attract driver) left to mc6-4?

These are RED-phase design decisions — surface both for user/Architect decision before coding.

## Acceptance Criteria (Derived)

Given the title and mc6-1 forward-pointers, the story succeeds when:

1. **Transition implemented:** A start/coin action advances phase from `attract` or `over` to `setup` and/or `play` (per architecture decision).

2. **createGame reseeding:** The start action triggers `createGame(seed=1)` which produces:
   - 6 live cities (verified via assertion)
   - 3 bases at full ammo (verified via assertion)
   - Wave 1 schedule (verified against INITIAL_WAVE)
   - Score: 0
   - Full NICBMS budget

3. **Regression:** All existing combat, wave, and phase-transition tests remain green.

4. **Citations:** Any new numeric literal has a claim; ROM references use `//` line comments, not JSDoc.

5. **MC-STATE-INIT filed:** The claim for cabinet boot (W3MAIN.MAC:491 LDA I,S.SETU + :135 ATRACT) is added to `state.json`.

6. **Purity:** `purity.test.ts` passes; no shell imports or clock in state.ts or game.ts.
