// src/shell/audio-manifest.ts
//
// Story jt5-2 (GREEN, Bicycle Repair Man / Dev) — the cue manifest alone,
// extracted from audio.ts so it is DEPENDENCY-FREE. audio.ts re-exports every
// name, so every existing consumer (and the suite's identity assertions) sees
// the same module instance; the extraction exists for the one consumer that
// cannot resolve the `@shared` alias in audio.ts's import chain: the sample
// bake, which the justfile runs under PLAIN node (`node tools/sample-bake/
// bake-samples.mjs <staging>`), reaching this file via Node's type stripping
// with an explicit `.ts` specifier. Nothing here may gain an import — that
// would break the deploy-time bake while every vitest stayed green.
//
// Story jt5-6 (GREEN) MOVED `CUE_SOURCES` here from audio.ts, and that move was
// forced rather than chosen. jt5-6 requires every cue's frame window to be
// DERIVED from its ROM citation instead of hand-transcribed beside it; the bake
// needs that window to size each .wav; and the bake cannot import audio.ts,
// which pulls in `@shared/audio` and dies under plain node. So the citations
// have to live in the module the bake can actually reach. `FRAME_DURATIONS` is
// now computed by `framesFor` below and is no longer a hand-written table.

/**
 * The cue names the dispatch speaks in, and the key of every map in audio.ts.
 * Not derived from the core's tuple on purpose: the core names MOMENTS and the
 * shell names SOUNDS, and the suite sweeps the two sets against each other
 * rather than making one a projection of the other.
 *
 * It is NOT one-per-`EVENT_KINDS`-entry any more. jt5-6 gave the
 * `player-materialise` moment a player id, and the two knights have SEPARATE
 * tables in the ROM (SNPCR1 :8116-8118 for player 1, SNPCR2 :8119-8121 for
 * player 2), so one moment reaches two cues and this union is one longer than
 * the tuple. What still holds — and what `tests/audio-transporter-split.test.ts`
 * sweeps against the real dispatch — is REACHABILITY: every cue here must be
 * playable by some event, and every event must play something.
 */
export type SoundName =
  | 'enemyDeath'
  | 'playerDeath'
  | 'eggCollected'
  | 'eggHatched'
  | 'pteroArrives'
  | 'pteroDeath'
  | 'playerMaterialise'
  | 'player2Materialise'
  | 'enemyMaterialise'
  | 'extraMan'
  | 'waveBounty'
  | 'cliffDestroyed'
  | 'playerWingDown'
  | 'playerWingUp'
  | 'enemyWingDown'
  | 'enemyWingUp'
  | 'playerThud'
  | 'enemyThud'

/** Cue -> filename. One `.wav` per cue: one distinct Williams table each. */
export const SOUNDS: Readonly<Record<SoundName, string>> = {
  enemyDeath: 'enemy_death.wav',
  playerDeath: 'player_death.wav',
  eggCollected: 'egg_collected.wav',
  eggHatched: 'egg_hatched.wav',
  pteroArrives: 'ptero_arrives.wav',
  pteroDeath: 'ptero_death.wav',
  playerMaterialise: 'player_materialise.wav',
  player2Materialise: 'player2_materialise.wav',
  enemyMaterialise: 'enemy_materialise.wav',
  extraMan: 'extra_man.wav',
  waveBounty: 'wave_bounty.wav',
  cliffDestroyed: 'cliff_destroyed.wav',
  playerWingDown: 'player_wing_down.wav',
  playerWingUp: 'player_wing_up.wav',
  enemyWingDown: 'enemy_wing_down.wav',
  enemyWingUp: 'enemy_wing_up.wav',
  playerThud: 'player_thud.wav',
  enemyThud: 'enemy_thud.wav',
}

// ─── Provenance ──────────────────────────────────────────────────────────────

/** A byte-exact pointer into the vendored 1982 tree — the shape joust's own
 *  citation gate already uses, so one idea keeps one spelling. */
export interface Citation {
  file: string
  line: number
  verbatim: string
}

/**
 * Where a cue comes from. A discriminated union, not an optional `rom?` field:
 * jt5-1's AC5 "no cue is silently fabricated as authentic" is exactly the
 * confusion a single optional field would permit. An authentic cue carries BOTH
 * sides of its evidence — the FCB row that defines the table (with the machine's
 * own comment on it) and the call site that plays it — because a table alone
 * proves the sound exists and not that it belongs to this moment.
 *
 * `invention` is the honest escape hatch for a later story: a cue with no table
 * behind it. None is used today — all eighteen have one.
 *
 * The sound BOARD's firmware would say what a 6-bit code actually sounds like.
 * It was never vendored: `JOUSTSND.DOC` is three lines whose whole content is
 * the pointer `SEE [LIBRARY.SOUND]VSNDRM4.SRC`, and no revision carries that
 * file. So a citation here names the moment and its priority, never a waveform.
 */
export type CueSource =
  | {
      kind: 'rom'
      /** The Williams table label, e.g. `SNEDIE`. */
      table: string
      /** The table's priority byte — SND's arbitration key (SYSTEM.SRC:761-773). */
      priority: number
      /** Williams's own trailing comment on the table row, byte-exact. */
      romComment: string
      /** The `FCB` row that DEFINES the table. */
      source: Citation
      /**
       * The rows that CONTINUE the table past its defining row — empty for the
       * fifteen that stop there. See `framesFor` for why this exists and why it
       * is a list of full citations rather than a line span.
       */
      continuation: readonly Citation[]
      /** Where the game plays it. */
      callSite: Citation
    }
  | { kind: 'invention'; note: string }

const SRC = 'JOUSTRV4.SRC'

/**
 * One provenance record per cue. Every line below re-opens byte-for-byte against
 * `reference/williams-source/joust/` — the suite checks every citation, that the
 * quoted row really DEFINES the named table at the cited priority, that each
 * continuation row is the one the ROM actually has, and that the call site
 * really mentions the table. The whole 38-table set sits at :8051-8131 under the
 * format header at :8045-8049 (priority, then (code, duration) pairs).
 */
export const CUE_SOURCES: Readonly<Record<SoundName, CueSource>> = {
  enemyDeath: {
    kind: 'rom',
    table: 'SNEDIE',
    priority: 40,
    romComment: 'ENEMY DIES',
    source: { file: SRC, line: 8104, verbatim: 'SNEDIE\tFCB\t040,!N$16!.$7F,20\tENEMY DIES' },
    continuation: [],
    callSite: { file: SRC, line: 2960, verbatim: '\tLDX\t#SNEDIE\t\tENEMY DIES' },
  },
  playerDeath: {
    kind: 'rom',
    table: 'SNPDIE',
    priority: 80,
    romComment: 'PLAYER DIES',
    source: { file: SRC, line: 8115, verbatim: 'SNPDIE\tFCB\t080,!N$16!.$7F,20\tPLAYER DIES' },
    continuation: [],
    callSite: { file: SRC, line: 4744, verbatim: '\tLDX\t#SNPDIE\t\tPLAYER DIES' },
  },
  eggCollected: {
    kind: 'rom',
    table: 'SNEGG',
    priority: 45,
    romComment: 'PLAYER HITS EGG SOUND',
    source: { file: SRC, line: 8098, verbatim: 'SNEGG\tFCB\t045,!N$03!.$7F,30\tPLAYER HITS EGG SOUND' },
    continuation: [],
    callSite: { file: SRC, line: 3031, verbatim: '\tLDX\t#SNEGG\t\tEGG & PLAYER COLIDE, IF HERE' },
  },
  eggHatched: {
    kind: 'rom',
    table: 'SNEGGH',
    priority: 45,
    romComment: 'EGG HATCHING SOUND',
    source: { file: SRC, line: 8099, verbatim: 'SNEGGH\tFCB\t045,!N$02!.$7F,30\tEGG HATCHING SOUND' },
    continuation: [],
    callSite: {
      file: SRC,
      line: 3243,
      verbatim: '\tLDX\t#SNEGGH\t\tMAKE THE SOUND OF AN EGG HATCHING',
    },
  },
  pteroArrives: {
    kind: 'rom',
    table: 'SNPTEI',
    priority: 65,
    romComment: 'PTERODACTYL INTRODUCTION SCREAM',
    // Two pairs on ONE row, and it still stops there: the last code carries
    // `.$7F`, which masks the continuation bit off. A table's shape is decided
    // by that bit, never by how many pairs the assembler fitted on a line.
    source: {
      file: SRC,
      line: 8094,
      verbatim: 'SNPTEI\tFCB\t065,!N$24!+$80,30,!N$25!.$7F,30\tPTERODACTYL INTRODUCTION SCREAM',
    },
    continuation: [],
    callSite: {
      file: SRC,
      line: 1467,
      verbatim: '\tLDX\t#SNPTEI\t\tPTERODACTYL INTRODUCTION CALL',
    },
  },
  pteroDeath: {
    kind: 'rom',
    table: 'SNPTED',
    priority: 66,
    romComment: 'PTERODACTYL DYING SOUND',
    source: {
      file: SRC,
      line: 8091,
      verbatim: 'SNPTED\tFCB\t066,!N$16!+$80,15,!N$16!+$80,15\tPTERODACTYL DYING SOUND',
    },
    continuation: [
      { file: SRC, line: 8092, verbatim: '\tFCB\t    !N$16!+$80,07,!N$16!+$80,7' },
      { file: SRC, line: 8093, verbatim: '\tFCB\t    !N$16!.$7F,90' },
    ],
    callSite: { file: SRC, line: 2946, verbatim: '\tLDX\t#SNPTED\t\tPTERODACTYL DYING SOUND' },
  },
  // ─── jt5-6: the two knights' SEPARATE transporter tables ──────────────────
  // The ROM gives each knight its own re-create table, and they are not the same
  // sound: SNPCR2 opens 13 frames later (`30+13`) and gives those 13 back off
  // its silent tail (`165-13`), and its fade code is `!N$15!` where SNPCR1 uses
  // `!N$14!`. Same priority, same 450-frame window, different audio.
  //
  // Both cite their P-block binding (P1DEC :5552, P2DEC :5556). The ROM also
  // binds each table in a G-block (G1DEC :5544, G2DEC :5548) whose rows differ
  // in the joystick source and in the 8th sound slot (`0` vs `SNPTREF`); jt5-1
  // cited :5544 here while the comment claimed P1DEC, which is the
  // misattribution jt5-6 corrects. What the two families ARE was unrecorded
  // until jt5-23 — the model is with the wing cues below, and it is why the
  // 8th slot differs at all.
  playerMaterialise: {
    kind: 'rom',
    table: 'SNPCR1',
    priority: 70,
    romComment: 'PLAYER 1 RE-CREATED (TRANSPORTER)',
    source: {
      file: SRC,
      line: 8116,
      verbatim: 'SNPCR1\tFCB\t070,!N$12!+$80,30\tPLAYER 1 RE-CREATED (TRANSPORTER)',
    },
    continuation: [
      { file: SRC, line: 8117, verbatim: '\tFCB\t    !N$14!+$80,255\tPLAYER FADING IN  (TRANSPORTER)' },
      { file: SRC, line: 8118, verbatim: '\tFCB\t    !N$00!.$7F,165' },
    ],
    // Reached through the DSNCRE field of P1DEC's decision block rather than a
    // direct load — that binding is WHICH creature gets which table.
    callSite: {
      file: SRC,
      line: 5552,
      verbatim: '\tFDB\tSNPLWU,SNPLWD,SNPLSK,SNPLS2,SNPRU1,SNPRU2,SNPFAL,SNPTREF,SNPCR1',
    },
  },
  player2Materialise: {
    kind: 'rom',
    table: 'SNPCR2',
    priority: 70,
    romComment: 'PLAYER 2 RE-CREATED (TRANSPORTER)',
    source: {
      file: SRC,
      line: 8119,
      verbatim: 'SNPCR2\tFCB\t070,!N$12!+$80,30+13\tPLAYER 2 RE-CREATED (TRANSPORTER)',
    },
    continuation: [
      { file: SRC, line: 8120, verbatim: '\tFCB\t    !N$15!+$80,255\tPLAYER FADING IN  (TRANSPORTER)' },
      { file: SRC, line: 8121, verbatim: '\tFCB\t    !N$00!.$7F,165-13' },
    ],
    callSite: {
      file: SRC,
      line: 5556,
      verbatim: '\tFDB\tSNPLWU,SNPLWD,SNPLSK,SNPLS2,SNPRU1,SNPRU2,SNPFAL,SNPTREF,SNPCR2',
    },
  },
  enemyMaterialise: {
    kind: 'rom',
    table: 'SNECRE',
    priority: 40,
    romComment: 'ENEMY RE-CREATED (TRANSPORTER)',
    // The second code is a BARE `$00`, not `!N$00!` — the M.S. bit is clear, so
    // the table STOPS here. A reader keyed on the `!N$` spelling rather than on
    // the bit would run off the end of it into SNEDIE.
    source: {
      file: SRC,
      line: 8103,
      verbatim: 'SNECRE\tFCB\t040,!N$07!+$80,90,$00,1\tENEMY RE-CREATED (TRANSPORTER)',
    },
    continuation: [],
    callSite: {
      file: SRC,
      line: 5560,
      verbatim: '\tFDB\tSNELWU,SNELWD,SNEMSK,SNEMS2,SNERU1,SNERU2,SNEFAL,0,SNECRE',
    },
  },
  extraMan: {
    kind: 'rom',
    table: 'SNREPL',
    priority: 100,
    romComment: 'EXTRA MAN',
    source: { file: SRC, line: 8089, verbatim: 'SNREPL\tFCB\t100,!N$0B!.$7F,90\tEXTRA MAN' },
    continuation: [],
    callSite: { file: SRC, line: 7406, verbatim: '\tLDX\t#SNREPL\t\tMAKE REPLAY SOUND' },
  },
  waveBounty: {
    kind: 'rom',
    table: 'SNBOUN',
    priority: 50,
    romComment: 'COLLECT BOUNTY',
    // SCOPE — :4711 is SNBOUN's ONLY call site in the ROM, and it sits inside
    // SPDGLA, the gladiator claim. The co-op and survival bonuses award the
    // same 3,000 and sound nothing. `game.ts` emits `wave-bounty` for the
    // gladiator award alone; widening it would put this citation behind
    // firings it does not cover.
    source: { file: SRC, line: 8096, verbatim: 'SNBOUN\tFCB\t050,!N$1C!.$7F,60\tCOLLECT BOUNTY' },
    continuation: [],
    callSite: { file: SRC, line: 4711, verbatim: '\tLDX\t#SNBOUN\t\tAWARD BOUNTY SOUND' },
  },
  cliffDestroyed: {
    kind: 'rom',
    table: 'SNCLIF',
    priority: 67,
    romComment: 'CLIFF DESTROYER',
    source: { file: SRC, line: 8090, verbatim: 'SNCLIF\tFCB\t067,!N$19!.$7F,90\tCLIFF DESTROYER' },
    continuation: [],
    callSite: { file: SRC, line: 2327, verbatim: '12$\tLDX\t#SNCLIF\t\tCLIFF DESTROYING SOUND' },
  },
  // ─── jt5-3: the two-edge FLAP ────────────────────────────────────────────
  // Both call sites are the DECISION-BLOCK bindings (:5544 knights, :5560
  // buzzards), not GOFLIP/GOFLAP themselves: those two lines load through
  // DSNWU/DSNWD (the structure OFFSETS declared at :118-119), never naming
  // SNPLWU/SNPLWD/SNELWU/SNELWD by symbol, so citing them here would fail the
  // "call site really mentions the table" gate. The binding lines say which
  // species gets which table.
  //
  // ─── jt5-23: WHAT THE TWO DECISION-BLOCK FAMILIES ARE ────────────────────
  // The ROM binds each knight's sound tables TWICE, and until jt5-23 this file
  // cited both families without saying what either one is. It is not a
  // duplicate: JOUSTRV4.SRC:1025-1029 chooses between them when the player
  // process is created, mirrored for the second knight at :1041-1045.
  //
  //     LDX  #G1DEC       ASSUME GAME SIMULATION
  //     LDA  GOVER        GAME SIMULATION?
  //     BGT  30$           BR=YES              <- keeps G1DEC
  //     LDX  #P1DEC                            <- else swaps to P1DEC
  // 30$ STX  PDECSN,Y     PLAYER 1'S JOYSTICK
  //
  // `GOVER` above zero selects the G-block, so **G1DEC/G2DEC are the
  // attract-mode self-playing demo and P1DEC/P2DEC are real play**, and the
  // chosen block becomes the knight's `PDECSN` — its joystick. Two independent
  // corroborations, because the ROM's own "GAME SIMULATION" comment is one
  // witness: `P1JOY` (:7247) opens `LDA WCPIAB` "SELECT HALF OF MUX", the
  // hardware panel read, while `G1JOY`/`G2JOY` (:615-626) compute the knight's
  // commands in software — `STD CURJOY` at :625, and no panel read anywhere in
  // the routine. The ROM files them under its own header at :613,
  // `* GAME SIMULATION PLAYER COMMANDS`, which states the point outright.
  //
  // That one fact explains BOTH ways the rows differ. The joystick source is
  // the obvious one. The 8th sound slot is the other: it is `SNPTREF` (:8122),
  // whose ROM comment marks it the player-aborted-fading-in transporter sound,
  // in the P rows and a bare `0` in the G rows — nobody can abort a demo's
  // transporter, so the demo has no sound to play there. For the same knight,
  // that slot is the ONLY sound the two families disagree on.
  //
  // KNIGHTS ONLY, and this is the part a summary gets wrong. The ROM defines
  // exactly two G-blocks against seven P-blocks (P1DEC :5550 through P7DEC
  // :5574), so the `P` prefix on P3DEC-P7DEC — the buzzards and the
  // pterodactyl — does NOT mean "real play". Those five have no G-variant at
  // all, and the reason is NOT that the decision field is empty for them: a
  // buzzard's field holds an AI routine — `AUTOFF` at P3DEC (:5558),
  // `LINET`/`BOUNDR` at P4DEC (:5562) — sitting in the same slots where P1DEC
  // carries `P1JOY,P1JOY`. What a creature lacks is a PANEL read, so there is
  // no human input for an attract variant to substitute. The ROM's comment at
  // :644 calls what lives there the creature's INTELLIGENCE.
  //
  // Which is why these two cues MOVED in jt5-23. They cited the G row :5544,
  // and that citation was TRUE — `SNPLWU,SNPLWD` open all four knight rows
  // (:5544, :5548, :5552, :5556) identically — but it named the DEMO's binding
  // for a sound a human fires, so they now cite P1DEC :5552 and this file
  // cites one family throughout. A precision gain, not a correction: :5544
  // still says what audio-flap.test.ts quotes it as saying. Only these two
  // knight cues were ever G-cited; `enemyWingDown`/`enemyWingUp` cite :5560,
  // which is P3DEC's row and has no G-variant to choose between.
  playerWingDown: {
    kind: 'rom',
    table: 'SNPLWD',
    priority: 10,
    romComment: 'PLAYERS WING DOWN SOUND',
    source: {
      file: SRC,
      line: 8126,
      verbatim: 'SNPLWD\tFCB\t010,!N$20!.$7F,90\tPLAYERS WING DOWN SOUND',
    },
    continuation: [],
    callSite: {
      file: SRC,
      line: 5552,
      verbatim: '\tFDB\tSNPLWU,SNPLWD,SNPLSK,SNPLS2,SNPRU1,SNPRU2,SNPFAL,SNPTREF,SNPCR1',
    },
  },
  playerWingUp: {
    kind: 'rom',
    table: 'SNPLWU',
    priority: 10,
    romComment: 'PLAYERS WING UP SOUND',
    source: {
      file: SRC,
      line: 8125,
      verbatim: 'SNPLWU\tFCB\t010,!N$21!.$7F,90\tPLAYERS WING UP SOUND',
    },
    continuation: [],
    callSite: {
      file: SRC,
      line: 5552,
      verbatim: '\tFDB\tSNPLWU,SNPLWD,SNPLSK,SNPLS2,SNPRU1,SNPRU2,SNPFAL,SNPTREF,SNPCR1',
    },
  },
  enemyWingDown: {
    kind: 'rom',
    table: 'SNELWD',
    priority: 6,
    romComment: 'ENEMIES WING DOWN SOUND',
    source: {
      file: SRC,
      line: 8108,
      verbatim: 'SNELWD\tFCB\t006,!N$20!.$7F,60\tENEMIES WING DOWN SOUND',
    },
    continuation: [],
    callSite: {
      file: SRC,
      line: 5560,
      verbatim: '\tFDB\tSNELWU,SNELWD,SNEMSK,SNEMS2,SNERU1,SNERU2,SNEFAL,0,SNECRE',
    },
  },
  enemyWingUp: {
    kind: 'rom',
    table: 'SNELWU',
    priority: 6,
    romComment: 'ENEMIES WING UP SOUND',
    source: {
      file: SRC,
      line: 8107,
      verbatim: 'SNELWU\tFCB\t006,!N$21!.$7F,60\tENEMIES WING UP SOUND',
    },
    continuation: [],
    callSite: {
      file: SRC,
      line: 5560,
      verbatim: '\tFDB\tSNELWU,SNELWD,SNEMSK,SNEMS2,SNERU1,SNERU2,SNEFAL,0,SNECRE',
    },
  },
  // ─── jt5-4: the THUDS — collisionPass applies the bounce it used to discard ──
  // SNPTHD and SNETHD send the SAME 6-bit code $08 (like SNEDIE/SNPDIE's $16)
  // and differ only in priority, so they are two sounds sharing one waveform
  // intent, never one collapsed cue.
  playerThud: {
    kind: 'rom',
    table: 'SNPTHD',
    priority: 20,
    romComment: "AT LEAST 1 PERSON THUD'ED",
    source: {
      file: SRC,
      line: 8124,
      verbatim: "SNPTHD\tFCB\t020,!N$08!+$80,30,$00,1\tAT LEAST 1 PERSON THUD'ED",
    },
    continuation: [],
    // The call site NAMES the table (`#SNPTHD`), unlike the two wing pairs
    // above whose bindings are FDB tables — a direct load, same shape as
    // enemyDeath/playerDeath's call sites.
    callSite: { file: SRC, line: 5014, verbatim: '1$\tLDX\t#SNPTHD\t\tPLAYERS COLIDE' },
  },
  enemyThud: {
    kind: 'rom',
    table: 'SNETHD',
    priority: 9,
    romComment: 'ENEMIES THUD',
    source: {
      file: SRC,
      line: 8106,
      verbatim: 'SNETHD\tFCB\t009,!N$08!+$80,30,$00,1\tENEMIES THUD',
    },
    continuation: [],
    callSite: { file: SRC, line: 5019, verbatim: 'OSTHT2\tLDX\t#SNETHD\t\tENEMIES COLIDE' },
  },
}

// ─── The window, DERIVED ─────────────────────────────────────────────────────

/**
 * Evaluate one assembler duration operand.
 *
 * The ROM writes these as EXPRESSIONS, not digits — `30+13`, `165-13`, `2*60`
 * and `4*60` all appear in the sound table, and SNPCR2's pair is why this
 * function cannot be `parseInt`. Reading `165-13` as `165` is the same family of
 * error as reading a table's first row as the whole table: plausible, silent,
 * and wrong by exactly the amount that matters.
 *
 * Deliberately not `eval`: this parses a closed grammar of integers, `+`, `-`
 * and `*`, and throws on anything else rather than executing it.
 */
function evaluateOperand(expr: string): number {
  const text = expr.trim()
  if (!/^[0-9]+(\s*[-+*]\s*[0-9]+)*$/.test(text)) {
    throw new Error(`unparseable sound-table duration operand: '${expr}'`)
  }
  // `*` binds tighter than `+`/`-`, so fold each product first, then sum the
  // terms left to right. The table only ever uses these three operators.
  let total = 0
  let sign = 1
  for (const piece of text.split(/(?<=[0-9\s])([+-])(?=[\s0-9])/)) {
    if (piece === '+') {
      sign = 1
    } else if (piece === '-') {
      sign = -1
    } else {
      total += sign * piece.split('*').reduce((a, b) => a * Number(b.trim()), 1)
    }
  }
  return total
}

/** The operand field of an `FCB` row — column 2 of the tab split, for both a
 *  labelled defining row and an indented continuation row. */
function operandsOf(verbatim: string): string {
  const columns = verbatim.split('\t')
  if (columns[1] !== 'FCB') {
    throw new Error(`not an FCB row: '${verbatim}'`)
  }
  return columns[2] ?? ''
}

/** Sum the durations of every `(code, duration)` pair in one row. `skipPriority`
 *  is set for a table's DEFINING row, whose first token is the priority byte. */
function framesInRow(verbatim: string, skipPriority: boolean): number {
  const tokens = operandsOf(verbatim)
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
  const pairs = skipPriority ? tokens.slice(1) : tokens
  let frames = 0
  for (let i = 0; i + 1 < pairs.length; i += 2) frames += evaluateOperand(pairs[i + 1]!)
  return frames
}

/**
 * How many frames a cue holds the voice: the sum of every `(code, duration)`
 * pair across its table's WHOLE extent.
 *
 * This is the jt5-6 structural fix, and the trap it removes is worth stating.
 * A `CueSource` cites the `FCB` row that DEFINES its table, but the format
 * header says a table need not end there:
 *
 *     *	 PIRORITY,SOUND,LENGTH (IF M.S.BIT SET ON SOUND, SOUND,LENGTH)
 *                                              (JOUSTRV4.SRC:8045-8049)
 *
 * A pair whose code carries `+$80` is followed by another, and the assembler is
 * free to put it on the next line. Three of these eighteen do exactly that, and
 * their cited rows parse cleanly to a number that is simply not the table's
 * length:
 *
 *   SNPCR1  :8116-8118   30 + 255 + 165        = 450   (cited row alone: 30)
 *   SNPCR2  :8119-8121   (30+13) + 255 + (165-13) = 450   (cited row alone: 43)
 *   SNPTED  :8091-8093   15 + 15 + 7 + 7 + 90  = 134   (cited row alone: 30)
 *
 * Every row is byte-exact and the citation gate re-opens the QUOTED LINE only,
 * so before jt5-6 a reading fifteen times short shipped green. jt5-5 worked
 * around it by hand-transcribing the totals into a parallel map with each
 * extent in a comment. That map is gone: `FRAME_DURATIONS` below is this
 * function applied to the citations, so the window and the evidence for it
 * cannot drift apart.
 *
 * `!N$00` rows COUNT — the header says the code "DOES NOT DISTURBE THE SOUND,
 * BUT EXTENDS TIMER", which is what makes SNPCR1 450 rather than 285.
 */
export function framesFor(source: CueSource): number {
  if (source.kind !== 'rom') return 0
  let frames = framesInRow(source.source.verbatim, true)
  for (const row of source.continuation) frames += framesInRow(row.verbatim, false)
  return frames
}

/**
 * Cue -> how many frames it holds the voice, DERIVED from each cue's citation.
 * Never hand-written: see `framesFor`. The totals are pinned by
 * `tests/audio-priority.test.ts` and cross-checked against a ROM re-derivation
 * in `tests/audio-transporter-split.test.ts`.
 */
export const FRAME_DURATIONS: Readonly<Record<SoundName, number>> = Object.freeze(
  Object.fromEntries(
    (Object.keys(SOUNDS) as SoundName[]).map((name) => [name, framesFor(CUE_SOURCES[name])]),
  ) as Record<SoundName, number>,
)
