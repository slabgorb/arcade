// tests/helpers/highscore-contract.ts
//
// Story jt10-7 — the CONTRACT for src/core/highscore.ts, TEA-authored (Tyr). Same
// seam epic jt has used since jt1-2 (loadGame / loadSim / loadFont / loadCabinet /
// loadSelect): TEA states the module shape and pins behaviour + citation gate in
// tests/highscore.test.ts; Dev (Loki) writes the module.
//
// ─── WHAT jt10-7 ADDS: THE HIGH-SCORE-ENTRY SCREEN CONCERN ───────────────────
// jt10-2 pinned the cabinet mode machine (src/core/cabinet.ts): the 'highscore'
// mode and afterGameOver(cab, table) — the VALUE gate that routes gameover →
// 'highscore' iff the best score qualifies, else → 'attract'. jt10-2 pinned only
// the BRANCH; jt10-7 fills in the screen the machine left open, mirroring the
// jt10-5 split (cabinet.ts machine + select.ts screen DATA):
//
//   1. The three ROM strings the screen shows, transcribed VERBATIM from the
//      message-equate tables (the primary source for joust text). Core DATA —
//      exactly like select.ts / pictures.ts / font*.ts — so inside the jt1-7
//      purity boundary and under a citation gate:
//        MSGOD  $67  'ENTER THY NAME MY LORD!'  MESSEQU.SRC:124  (the CHAMPION prompt)
//        MSPEON $68  'ENTER YOUR INITIALS'      MESSEQU.SRC:125  (the LESSER prompt)
//        TXHSP  $0F  'JOUST CHAMPIONS'          MESSEQU2.SRC:88  (the all-time table
//          heading — a CONTINUATION line of the TXHSP $0F equate, whose LABELLED row
//          (:87) is 'DAILY BUZZARDS', the daily table descoped to jt10-9. A
//          label-keyed read returns 'DAILY BUZZARDS'; the citation must target the
//          continuation line, and the gate below proves it does.)
//
//   2. rankForScore / promptForRank — the RANK-CONDITIONAL prompt (user ruling
//      2026-08-08): the CHAMPION (the score that would take rank 1) sees MSGOD;
//      every LESSER qualifier (rank ≥ 2) sees MSPEON. rankForScore returns the
//      1-based rank a score would occupy under insertHighScore's ordering (ties
//      place the newcomer AFTER equals, so a tie with the top is rank 2, NOT the
//      champion), or 0 when the score would not qualify at all.
//
//   3. The initials-entry machine, the cabinet-wide SHARED keyboard verb
//      (SH2-13 / @shared/name-entry — user ruling 2026-08-08: joust adopts the
//      fleet's keyboard flow, exactly as tempest/asteroids/centipede/star-wars/
//      battlezone/pac-man do; the ROM's move-cycle-letter/flap-to-enter cursor
//      (ENTINT, MSENT3 $6B) is DELIBERATELY NOT ported). enterInitial appends A–Z
//      uppercased up to MAX_INITIALS (3) and deletes on Backspace, never past
//      empty; every other key — INCLUDING digits — is inert (the shared reducer's
//      charset is A–Z only, so AC2's "0–9" is dropped, matching the ROM's own
//      entry charset [SPACE, A–Z, back-arrow], which also has no digits).
//
//   4. commitEntry — the pure insert: given the persisted table, the completed
//      initials, the final score and the wave, returns a NEW table with the row
//      inserted in descending-score order and truncated to MAX_HIGH_SCORES (10),
//      via @shared/highscore's insertHighScore. The SHELL owns persistence
//      (makeHighScoreStorage) and the confirm EDGE (main.ts, the prevFlap
//      discipline) — core owns the pure logic. @shared imports are pure in core.

import type { HighScoreEntry, HighScoreEntryBase } from '@shared/highscore'

export type { HighScoreEntry, HighScoreEntryBase }

/** Joust's persisted high-score row: the base shape plus the game's own domain
 *  field `wave` (null only for a migrated cross-origin row — see @shared/highscore). */
export type JoustHighScore = HighScoreEntry<'wave'>

/** The in-flight initials buffer the 'highscore' screen collects. A 3-char
 *  arcade-convention string, held as its own tiny state so the shell can carry it
 *  across frames the way main.ts already carries the CabinetState. Readonly:
 *  enterInitial returns a NEW buffer, never mutates. */
export interface HighScoreEntryBuffer {
  readonly initials: string
  /** jt11-6 — the ticks left on this entry before it auto-commits. Seeded by
   *  beginEntry from ENTRY_TIMEOUT_TICKS and spent by tickEntry; core counts
   *  FRAMES, never milliseconds. */
  readonly ticksLeft: number
}

export interface HighscoreModule {
  /** MSGOD $67 'ENTER THY NAME MY LORD!' — MESSEQU.SRC:124. The CHAMPION prompt. */
  readonly PROMPT_CHAMPION: string
  /** MSPEON $68 'ENTER YOUR INITIALS' — MESSEQU.SRC:125. The LESSER prompt. */
  readonly PROMPT_LESSER: string
  /** TXHSP $0F 'JOUST CHAMPIONS' — MESSEQU2.SRC:88 (continuation of the $0F equate). */
  readonly CHAMPIONS_HEADING: string
  /** The 3-char initials convention — one of joust's per-cabinet NUMBERS; the
   *  entry VERB itself is the cabinet-wide shared reducer (SH2-13). */
  readonly MAX_INITIALS: number

  // ─── jt11-6: the ENTRY TIMEOUT ──────────────────────────────────────────────
  // The screen is escapable now: a budget runs down while it is up, and when it
  // expires the current initials commit anyway, so a walked-away qualifying score
  // persists. The DURATION is transcribed (AMODE's supervisor loop, 256 x
  // `PCNAP 30` = 7680 ticks, TB12REV1.SRC:77-78); the auto-commit on expiry is
  // this port's deliberate deviation — the ROM abandons the entry instead.

  /** 7680 — 256 iterations of `PCNAP 30` (TB12REV1.SRC:77-78), about 2 minutes
   *  8 seconds at core FRAME_HZ. NOT the commented-out 255x20=5100 old law. */
  readonly ENTRY_TIMEOUT_TICKS: number

  /** One video frame of the countdown: `ticksLeft` less one, floored at 0. An
   *  exhausted budget returns the SAME buffer (the enterInitial no-op idiom).
   *  Typing does not reset it. Pure. */
  tickEntry(entry: HighScoreEntryBuffer): HighScoreEntryBuffer

  /** True once the budget has run out — the auto-commit gate. Pure. */
  isEntryExpired(entry: HighScoreEntryBuffer): boolean

  /** The initials an EXPIRED entry commits: the buffer padded to MAX_INITIALS
   *  with spaces — the ROM's own CSPC buffer fill (TB12REV1.SRC:1901-1902) — so
   *  an abandoned entry keeps the SCORE under a blank name instead of losing the
   *  row. Pure. */
  timeoutInitials(entry: HighScoreEntryBuffer): string

  /**
   * The 1-based rank a `score` would occupy in `table` under insertHighScore's
   * ordering: the count of entries with score ≥ `score`, plus one (a tie with the
   * top is rank 2 — ties place the newcomer AFTER equals). Returns 0 when `score`
   * would NOT qualify (non-positive, or a full board it does not strictly beat).
   * Pure; reads only `.score`, so it is domain-agnostic.
   */
  rankForScore(table: readonly HighScoreEntryBase[], score: number): number

  /**
   * The rank-conditional prompt: rank 1 (the champion) → PROMPT_CHAMPION, every
   * other rank → PROMPT_LESSER. Pure and total over the integers.
   */
  promptForRank(rank: number): string

  /** A fresh empty initials buffer with a full entry budget:
   *  `{ initials: '', ticksLeft: ENTRY_TIMEOUT_TICKS }`. Pure. */
  beginEntry(): HighScoreEntryBuffer

  /**
   * One initials keydown (the shared SH2-13 verb, @shared/name-entry): appends
   * `key` uppercased when it is a single A–Z letter and the buffer is short of
   * MAX_INITIALS, deletes the last char on 'Backspace' (never past empty), and is
   * inert for everything else — digits, named keys, junk. A no-op returns an equal
   * buffer. Pure — the argument is never mutated.
   */
  enterInitial(entry: HighScoreEntryBuffer, key: string): HighScoreEntryBuffer

  /** True once the buffer holds exactly MAX_INITIALS chars — the MANUAL-confirm
   *  gate. Since jt11-6 it is no longer the only way a row commits: an expired
   *  entry auto-commits whatever is typed (isEntryExpired + timeoutInitials), and
   *  deliberately does NOT consult this. Pure. */
  isEntryComplete(entry: HighScoreEntryBuffer): boolean

  /**
   * Insert a completed entry into the persisted table: a NEW table with
   * { name: initials, score, wave } placed in descending-score order and truncated
   * to MAX_HIGH_SCORES (10), via @shared/highscore's insertHighScore. Neither the
   * table nor the buffer is mutated. Pure.
   */
  commitEntry(
    table: readonly JoustHighScore[],
    initials: string,
    score: number,
    wave: number,
  ): JoustHighScore[]
}

/**
 * Load the not-yet-built highscore module with a self-describing failure — the
 * loadSelect / loadCabinet pattern. The specifier is assembled at runtime so the
 * bundler cannot resolve it statically and redden the whole FILE at collection
 * (the tp1-8 trap); each test reddens with a clean "feature absent" instead.
 *
 * RED today: src/core/highscore.ts does not exist, so this throws per test.
 */
export async function loadHighscore(): Promise<HighscoreModule> {
  const specifier = ['..', '..', 'src', 'core', 'highscore.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<HighscoreModule>
    const fns = [
      'rankForScore',
      'promptForRank',
      'beginEntry',
      'enterInitial',
      'isEntryComplete',
      'commitEntry',
      // jt11-6 — the entry timeout's verbs. Listed here so the CONTRACT is what
      // fails when the module drifts, rather than a test three files away.
      'tickEntry',
      'isEntryExpired',
      'timeoutInitials',
    ] as const
    for (const fn of fns) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    for (const s of ['PROMPT_CHAMPION', 'PROMPT_LESSER', 'CHAMPIONS_HEADING'] as const) {
      if (typeof mod[s] !== 'string') throw new Error(`module has no \`${s}\` string export`)
    }
    for (const n of ['MAX_INITIALS', 'ENTRY_TIMEOUT_TICKS'] as const) {
      if (typeof mod[n] !== 'number') throw new Error(`module has no \`${n}\` number export`)
    }
    return mod as HighscoreModule
  } catch (e) {
    throw new Error(
      'highscore module not built yet — GREEN (Loki) creates plugins/joust/src/core/highscore.ts ' +
        'satisfying tests/helpers/highscore-contract.ts: PROMPT_CHAMPION / PROMPT_LESSER (MSGOD $67 / ' +
        'MSPEON $68, VERBATIM from MESSEQU.SRC:124/125), CHAMPIONS_HEADING (TXHSP $0F CONTINUATION ' +
        "MESSEQU2.SRC:88 'JOUST CHAMPIONS' — NOT the labelled row's 'DAILY BUZZARDS'), MAX_INITIALS=3, " +
        'rankForScore(table,score) (1-based rank, 0 if non-qualifying), promptForRank(rank) (1 → ' +
        'champion, ≥2 → lesser), beginEntry/enterInitial/isEntryComplete (the SH2-13 keyboard verb via ' +
        '@shared/name-entry stepNameEntry — A–Z + Backspace, no digits) and commitEntry(table,initials,' +
        'score,wave) (insertHighScore, cap 10). Keep highscore.ts inside the jt1-7 purity boundary — it ' +
        `is core DATA + pure logic over @shared (no clock, no browser surface, no shell import). (${(e as Error).message})`,
    )
  }
}
