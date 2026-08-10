# Story mc6-6: Game-over -> attract timeout

## Background

The MAINLINE dispatch (REV-01 W3MAIN.MAC:475) orchestrates the full cabinet state machine. The loop currently is **open** at the game-over -> attract transition:

- `plugins/missile-command/src/core/state.ts:27` — `advancePhase` makes `'over'` **terminal**: `if (phase === 'over') return 'over'`. Comment (:24-25): "'over' is terminal and never returns to 'play'."
- `plugins/missile-command/src/core/game.ts:27` — "Once `phase === 'over'` the loop only advances the frame counter." So today, game-over is a dead end; nothing returns to attract.
- INITIAL_PHASE is `'attract'` (state.ts:118). mc6-1 shipped the MAINLINE dispatch (state.ts:50-118), mc6-2 SETUP→PLAY, mc6-3 pause toggle, mc6-4 self-playing attract. **mc6-6 CLOSES the loop:** over → (timeout) → attract.

### Purity / Clock (Core Boundary)

The core must stay clock-free (the boundary rule):
- `game.ts:74-75` — `readonly frame: number` — "The sim's only clock is this counter. Video frames advanced since boot." The frame counter **already advances** while phase==='over'.
- **Solution:** The timeout is a **pure reducer/threshold** — return `'attract'` once the number of frames spent in `'over'` reaches a cited constant. No Date, no wall clock. Model it exactly as mc6-1..4 modeled their transitions (pure, seeded, no clock). The shell/game.ts already provides the frame tick; the constant lives in core.

### ROM Ground Truth

**Relevant constants and routines (REV-01, W3MAIN.MAC):**

- **MAINLINE dispatch:** W3MAIN.MAC:475 (.SBTTL MAINLINE), sign-of-STATE dispatch at :507-525.
- **End-of-game routines:**
  - `ENDGM1:` (W3MAIN.MAC:4617) — sets `STY ATRACT` with Y=0 (ATRACT polarity 0=attract/-1=game, per :135), i.e. it drops the machine back into ATTRACT mode, and hands off to ENDGM2 (STX SETUPC = CENDG2).
  - `ENDGM2:` (W3MAIN.MAC:4683) — runs the "THE END" death-explosion animation: `ENDMAX=6` (max radius), `ENDUPD=1` (dots/update), "THE END" displayed at radius 62. **THIS ANIMATION IS THE HOLD/CADENCE** before the machine is fully back in attract demo.
  - `.WORD ENDGM1-1  ;END OF GAME (PHASE 1)` — W3MAIN.MAC:589
  - `.WORD ENDGM2-1  ;END OF GAME (PHASE 2)` — W3MAIN.MAC:601
- **General hold timer:** `PAUST` ("PAUSE TIMER (IN FRAMES)", W3MAIN.MAC:187) — the ROM's general self-timed frame countdown used for scripted holds (pre-game, end-of-wave tally, post-game-over hold).

## Design Question for TEA/Architect (CRITICAL)

**The title says "pin the timeout constant," but the ROM's return-to-attract is NOT a single bare `PAUST` literal.** ENDGM1 sets ATRACT=attract immediately, then ENDGM2's growing/holding "THE END" explosion (ENDMAX=6 / ENDUPD=1, "THE END" at radius 62) is what occupies the hold.

**TEA/Architect must decide at RED whether to:**
1. Model this faithfully (animation/explosion-duration driven) — tie the return-to-attract to ENDGM2's cadence and the expansion of the "THE END" sprite.
2. Pin a single representative fixed-frame constant derived from ENDGM2 cadence — simpler, but less faithful.

**Either way:** The derived constant must carry a ROM citation (ENDGM1/ENDGM2 lines above) and be pinned by the RED test. This is a citation-gated project (tests/audit/citations.test.ts) — the constant needs a real `source.line` + `verbatim`, and **ROM line numbers go in `//` comments, never JSDoc** (the citation scanner strips `//` not `/** */`).

## Acceptance Criteria

**AC1: Pure timeout transition**
After phase `'over'`, once a cited-ROM frame constant of over-frames elapses, the pure phase reducer returns `'attract'` (the MAINLINE loop closes). Currently `'over'` is terminal (state.ts:27) — RED must show this transition does NOT happen today.

**AC2: Constant definition and ROM citation**
The timeout constant is defined in `src/core` with a ROM citation (ENDGM1 :4617 / ENDGM2 :4683, PAUST :187) in a `//` comment (not JSDoc). Pinned by the RED test with a WRONG-value mutation guard — mutate the constant, assert the test reddens.

**AC3: Purity and clock-freedom**
The transition is pure and clock-free — driven only by the existing `frame` counter (game.ts:75), no Date/wall-clock. Purity scanner (core boundary) stays green. Comment must avoid `window.` / `document.`.

**AC4: Before timeout, phase stays 'over'**
Before the constant elapses, phase stays `'over'` (the hold is real, not instantaneous). mc3/mc4/mc6-1..4 suites stay green — `'over'` is still terminal until the timeout fires.

**AC5: Shell integration**
game.ts `stepGame` wiring feeds the over-frame count / start so the timeout actually fires in the assembled game (not just an unwired pure fn). The transition is testable end-to-end, from attract → over → (timeout) → attract.

## Notes for TEA

- This story has no prior description/ACs in the sprint YAML — they're derived here from the title and measured facts.
- The story **closes the MAINLINE loop** — it is the final piece of mc6's state machine.
- The constant must be **verifiable at RED** via mutation — a bare literal fails citation.test.ts without a proper ROM source line.
- Expected phase: RED (TEA writes failing tests, Dev makes them pass).
