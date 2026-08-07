// tests/helpers/gameover-contract.ts
//
// Story jt10-6 — the CONTRACT for the game-over overlay's ROM string, TEA-authored
// (Tyr). Same seam epic jt has used since jt1-2 (loadGame / loadSelect / loadCabinet):
// TEA states the constant's value + citation and pins it; Dev (Loki) adds the export.
//
// ─── THE STRING JOUST ACTUALLY PUTS UP AT GAME OVER ──────────────────────────
// jt10-2 pinned the cabinet mode machine (src/core/cabinet.ts): the 'gameover' mode,
// modeForGover(GOVER_OVER) → 'gameover', and afterGameOver (the game-over → high-score
// value gate). jt10-6 adds the SCREEN that mode shows and wires the exit. This story's
// one new piece of core DATA is the message string.
//
// The design spec's table row named the overlay 'GAME OVER' and cited GAMEND
// (EQU.SRC:237). BOTH are wrong, and the ROM is unambiguous (ruled by the user at RED):
//
//   • GAMEND (EQU.SRC:237) is `RMB 3` — a RAM variable for the game-over / high-score
//     "H.S.T.D. CHECK AND ENTER ROUTINE", NOT a message string.
//   • The whole-cabinet game-over overlay Joust actually displays is MSGOVR — put up
//     by the routine literally labelled "GAME OVER MESSAGE":
//        GOVERM  LDX #$3090
//                LDD #256*MSGOVR+WHI*$11   PUT UP GAME OVER MESSAGE   (JOUSTRV4.SRC:674)
//                JMP OUTPHR
//        GOVWAT  LDA #11   8*11 OR 88 TICK WAIT ... JMP GAMEND        (JOUSTRV4.SRC:678-688)
//     and MSGOVR is:
//        MSGOVR  EQU  $00  'THY GAME IS OVER'   MESSEQU.SRC:18
//   • 'GAME OVER' (MSGAMO $6D, MESSEQU.SRC:130) is a DIFFERENT string — the PER-PLAYER
//     banner GAMOV1 ("GAME OVER FOR PLAYER 1 OR 2", a 3-second message), not the
//     whole-game overlay. Not this story's string.
//
// So the faithful overlay text is 'THY GAME IS OVER', shown ~88 ticks (~1.47s) before
// the machine routes on via afterGameOver. It is core DATA, exactly like the SEL_*
// strings jt10-5 put in core/select.ts and the pictures/font tables — under the jt1-7
// purity boundary and cited to its primary source.

/** MSGOVR $00 'THY GAME IS OVER' — MESSEQU.SRC:18. The message GOVERM puts up at
 *  game over (JOUSTRV4.SRC:674), verbatim. This is the whole-cabinet overlay text,
 *  NOT the per-player 'GAME OVER' banner (MSGAMO $6D, MESSEQU.SRC:130). */
export const GAME_OVER_TEXT_EXPECTED = 'THY GAME IS OVER'

export interface GameOverTextModule {
  /** MSGOVR $00 'THY GAME IS OVER' — MESSEQU.SRC:18. Verbatim. */
  readonly GAME_OVER_TEXT: string
}

/**
 * Load the game-over string constant, expected on the cabinet tier
 * (src/core/cabinet.ts) — the module that already owns the 'gameover' mode and
 * afterGameOver, so the game-over concern (mode + routing + its message) lives in
 * one core place, mirroring how core/select.ts owns SEL_* + selectPlayerCount.
 *
 * The specifier is assembled at runtime so the bundler cannot resolve it statically
 * and redden the whole FILE at collection (the tp1-8 trap). cabinet.ts already
 * EXISTS; RED today is the MISSING `GAME_OVER_TEXT` export, reported per test.
 */
export async function loadGameOverText(): Promise<GameOverTextModule> {
  const specifier = ['..', '..', 'src', 'core', 'cabinet.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<GameOverTextModule>
    if (typeof mod.GAME_OVER_TEXT !== 'string') throw new Error('cabinet has no `GAME_OVER_TEXT` string export')
    return mod as GameOverTextModule
  } catch (e) {
    throw new Error(
      'GAME_OVER_TEXT not added yet — GREEN (Loki) exports `GAME_OVER_TEXT` from ' +
        "plugins/joust/src/core/cabinet.ts, the string 'THY GAME IS OVER' transcribed VERBATIM " +
        'from MSGOVR $00 (MESSEQU.SRC:18) — the message GOVERM puts up at game over ' +
        '(JOUSTRV4.SRC:674), NOT the per-player banner MSGAMO $6D. Keep it inside the jt1-7 ' +
        `purity boundary (it is core DATA — no clock, no browser surface). (${(e as Error).message})`,
    )
  }
}
