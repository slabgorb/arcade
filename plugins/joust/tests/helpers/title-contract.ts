// tests/helpers/title-contract.ts
//
// Story jt10-3 — the CONTRACT for the TITLE SCREEN (the ROM's MARQUE routine),
// TEA-authored (Tyr). Same seam epic jt has used since jt1-2 (loadGame /
// loadSelect / loadCabinet / loadGameOverText): TEA states each transcription's
// value + primary-source citation and pins it; Dev (Loki) adds the exports.
//
// ─── THE QUARRY (resolved before RED — see the session Delivery Findings) ─────
// The title screen is the MARQUE routine (ATT.SRC:50): a stripe background, the
// JOUST wordmark, and up to two FONT57 phrase lines, its palette flashing on a
// colour cycle. Three things the design spec left open were resolved from source,
// and two of its guesses were WRONG:
//
//   • Q1 LOGO — NOT a bitmap/.PIC. The wordmark is a VECTOR line-drawing: the
//     polyline table LIST (ATT.SRC:423-531), drawn by LINE (ATT.SRC:340) through
//     the GO interpreter (ATT.SRC:85-118). Five letter-groups placed left→right
//     into J-O-U-S-T by their stored x-offset (XPOS=4, ATT.SRC:47, folded in):
//        J = 1+XPOS = 5     O = $40+XPOS = 68    U = $6A+XPOS = 110
//        S = 166+XPOS = 170  T = 218+XPOS = 222
//     Colours CL1..CL4 = $11,$22,$33,$44 (ATT.SRC:43-46); fill NOFILL=0 / FILL=$80.
//   • Q2 PHRASING — the three MARQUE strings, output via OUTPHR (5×7 = FONT57;
//     the "35"-suffixed routines are the 3×5 ones, MESSAGE.SRC:33-36):
//        MSCOPY $6C '(C) 1982 WILLIAMS ELECTRONICS INC.'  MESSEQU.SRC:129
//        MSW17  $F7 'EXTRA MOUNT EVERY '                  MESSEQU.SRC:158
//        MSW18  $F8 ',000 POINTS'                         MESSEQU.SRC:157
//     "PRESENTED BY" exists in NO revision (zero hits across every .SRC); it was
//     dropped from scope and the story retitled (user ruling at RED, jt8-6 shape).
//   • Q3 CYCLE — cadence is ((((2*60+30)/16)+1)*8)+7 = 87 (ATT.SRC:173, "CHANGE
//     COLORS EVERY 2 1/2 SECONDS"), NOT the spec's ~88. Cycler = FLASH
//     (ATT.SRC:142-184) stepping palette MARCOL (ATT.SRC:288-294; 6 rows × 8),
//     cycling the 5 rows MARCOL+8..MAREND and wrapping (ATT.SRC:159-163).
//
// The whole screen lives in ATT.SRC, shared across JOUSTRV1..4 → no revision
// ambiguity. All of this is core DATA (no clock, no browser surface), under the
// jt1-7 purity boundary, exactly like SEL_* (core/select.ts) and GAME_OVER_TEXT
// (core/cabinet.ts). The shell overlay reuses the strings; it never re-types them.

// ─── EXPECTED VALUES (the faithful-transcription guard) ──────────────────────

/** MSCOPY $6C — MESSEQU.SRC:129 (bytes PHRASE.SRC:599). Verbatim; note the space
 *  after "(C)". */
export const TITLE_COPYRIGHT_EXPECTED = '(C) 1982 WILLIAMS ELECTRONICS INC.'
/** MSW17 $F7 — MESSEQU.SRC:158. Verbatim; note the TRAILING space (the BCD replay
 *  level is printed after it, then MSW18). */
export const TITLE_EXTRA_MOUNT_EXPECTED = 'EXTRA MOUNT EVERY '
/** MSW18 $F8 — MESSEQU.SRC:157. Verbatim; leading comma, no leading space. */
export const TITLE_POINTS_SUFFIX_EXPECTED = ',000 POINTS'

/** The five letter x-offsets from LIST (ATT.SRC:423-531), XPOS=4 folded in,
 *  sorted left→right: J,O,U,S,T. */
export const LOGO_XOFFSETS_EXPECTED = [5, 68, 110, 170, 222] as const
/** CL1..CL4 (ATT.SRC:43-46) — the only colours the LIST strokes may carry. */
export const LOGO_COLOURS = [0x11, 0x22, 0x33, 0x44] as const

/** ((((2*60+30)/16)+1)*8)+7 (ATT.SRC:173). The value the spec guessed as ~88. */
export const TITLE_COLOR_CADENCE_EXPECTED = 87
/** MARCOL (ATT.SRC:288-294): 6 rows × 8 bytes. */
export const TITLE_PALETTE_ROWS = 6
export const TITLE_PALETTE_COLS = 8
/** MARCOL row 0 verbatim (ATT.SRC:288): $00,$00,$07,$3F,$05,@377,$E8,@350 — the
 *  initial/static row, mixing $ hex and @ octal. @377=255, @350=232. */
export const TITLE_PALETTE_ROW0_EXPECTED = [0x00, 0x00, 0x07, 0x3f, 0x05, 0xff, 0xe8, 0xe8] as const
/** RADIX-trap anchors elsewhere in MARCOL: the @ octal literals whose DECIMAL
 *  value is not their digits (@300≠300, @100≠100, @050≠50, @377≠377). A wrong-
 *  radix transcription reddens on these. [row, col, value]. */
export const TITLE_PALETTE_OCTAL_ANCHORS = [
  [3, 4, 192], // ATT.SRC:291 @300 → 192, NOT 300
  [3, 2, 64], //  ATT.SRC:291 @100 → 64
  [2, 3, 40], //  ATT.SRC:290 @050 → 40
  [5, 4, 255], // ATT.SRC:293 @377 → 255
] as const

/** The number of palette rows FLASH cycles through: MARCOL+8..MAREND (rows 1-5). */
export const TITLE_CYCLE_ROWS = 5

// ─── SHELL / CORE SHAPES ─────────────────────────────────────────────────────

/** One polyline stroke of a logo letter (a LIST FCB group). */
export interface LogoStroke {
  readonly fill: boolean
  readonly colorLeft: number
  readonly colorRight: number
  readonly points: readonly (readonly [number, number])[]
}
/** One letter of the JOUST wordmark, keyed by its LIST x-offset. */
export interface LogoLetter {
  readonly xOffset: number
  readonly strokes: readonly LogoStroke[]
}
/** The vector JOUST wordmark transcribed from LIST (ATT.SRC:423-531). */
export interface JoustLogo {
  readonly letters: readonly LogoLetter[]
}

/** The core title-data module (src/core/title.ts) — pure DATA + one pure fn. */
export interface TitleCoreModule {
  readonly TITLE_COPYRIGHT: string
  readonly TITLE_EXTRA_MOUNT: string
  readonly TITLE_POINTS_SUFFIX: string
  readonly JOUST_LOGO: JoustLogo
  readonly TITLE_PALETTE: readonly (readonly number[])[]
  readonly TITLE_COLOR_CADENCE: number
  /** Which cycling row (0..TITLE_CYCLE_ROWS-1) is active at frame `tick`.
   *  Deterministic — no clock. Advances every TITLE_COLOR_CADENCE, wraps. */
  titleColorRow(tick: number): number
}

/**
 * Load the core title module. cabinet/select established the pattern: a new pure
 * core module owns this screen's DATA. The specifier is assembled at runtime so
 * the bundler cannot resolve it statically and redden the whole FILE at
 * collection (the tp1-8 trap). RED today: the file does not exist yet.
 */
export async function loadTitleCore(): Promise<TitleCoreModule> {
  const specifier = ['..', '..', 'src', 'core', 'title.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<TitleCoreModule>
    if (typeof mod.TITLE_COPYRIGHT !== 'string') throw new Error('no `TITLE_COPYRIGHT` string export')
    if (typeof mod.titleColorRow !== 'function') throw new Error('no `titleColorRow` function export')
    return mod as TitleCoreModule
  } catch (e) {
    throw new Error(
      'core title data not built yet — GREEN (Loki) creates plugins/joust/src/core/title.ts, a PURE ' +
        'DATA module (under the jt1-7 boundary: no clock, no window./document.) exporting the MARQUE ' +
        "transcriptions: TITLE_COPYRIGHT '(C) 1982 WILLIAMS ELECTRONICS INC.' (MSCOPY, MESSEQU.SRC:129), " +
        "TITLE_EXTRA_MOUNT 'EXTRA MOUNT EVERY ' (MSW17, MESSEQU.SRC:158), TITLE_POINTS_SUFFIX ',000 POINTS' " +
        '(MSW18, MESSEQU.SRC:157); JOUST_LOGO (the LIST vector wordmark, ATT.SRC:423-531); TITLE_PALETTE ' +
        '(MARCOL, ATT.SRC:288-294); TITLE_COLOR_CADENCE=87 (ATT.SRC:173); and titleColorRow(tick). ' +
        `(${(e as Error).message})`,
    )
  }
}

/** The laid-out title overlay (shell/titleScreen.ts). */
export interface TitleScreenLayout {
  readonly copyright: unknown // LaidOutText — cast at the call site
  readonly extraMount: unknown
  readonly pointsSuffix: unknown
  readonly logo: JoustLogo
}

/**
 * Load the shell title overlay (src/shell/titleScreen.ts), mirroring
 * loadGameOverScreen. RED today: the file does not exist yet.
 */
export async function loadTitleScreen<T = TitleScreenLayout>(): Promise<{
  layoutTitleScreen(colour: unknown): T
}> {
  const specifier = ['..', '..', 'src', 'shell', 'titleScreen.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as {
      layoutTitleScreen?: (c: unknown) => T
    }
    if (typeof mod.layoutTitleScreen !== 'function') throw new Error('no `layoutTitleScreen` export')
    return mod as { layoutTitleScreen(colour: unknown): T }
  } catch (e) {
    throw new Error(
      'title overlay not built yet — GREEN (Loki) creates plugins/joust/src/shell/titleScreen.ts ' +
        'exporting layoutTitleScreen(colour): { copyright, extraMount, pointsSuffix, logo } — the copyright + ' +
        'extra-mount phrase lines laid out in FONT57 via fontRender.layoutText, REUSING the core title ' +
        `strings (never re-hardcoding the ROM text), plus the JOUST_LOGO geometry. (${(e as Error).message})`,
    )
  }
}
