// src/shell/audio.ts
//
// Story jt5-1 (GREEN, Bicycle Repair Man / Dev) — the SHELL half of the joust
// audio seam: joust's own NUMBERS handed to the shared engine's VERB.
//
// The WebAudio engine itself — lazy AudioContext on a gesture, master gain,
// fetch/decode, POKEY-style channel voice-stealing, silent degrade at every
// failure path — is `@shared/audio`, in-tree since the 2026-07-30 monorepo
// collapse and reached through the `@shared/*` alias declared in
// `vite.config.ts`, `vitest.config.ts` and `tsconfig.json`. There is nothing to
// pin: no npm dependency, no git URL, no version to bump. joust's plugin
// `package.json` stays the three-field stub every plugin is. That is the whole
// of AC1 — the shared-versus-standalone question the epic was written to rule on
// was dissolved by the migration rather than decided here.
//
// This module is IO (shell), never simulation. The pure core emits `GameEvent`
// DATA and never imports this file; `audio-dispatch.ts` is what turns one into
// the other.
//
// ─── THIS STORY SHIPS NO .wav ────────────────────────────────────────────────
// The manifest below is a promise about an R2 key prefix, not about this repo.
// jt5-1 commits no binary, runs no `just deploy-assets`, and checked no live
// 200. joust stays SILENT when this story closes; a later jt5 story records or
// synthesises the seventeen files and uploads them. Read a green suite accordingly:
// `@shared/audio` degrades silently on a 404, so passing tests here prove the
// wiring and say nothing whatever about whether a knight makes a noise.
//
// ─── ONE VOICE BY PRIORITY (jt5-5 — the mechanism, not the fence) ────────────
// The machine has ONE sound voice arbitrated by a PRIORITY byte. `SND`
// (SYSTEM.SRC:761-773) compares an incoming table's priority against the
// sounding one and refuses a strictly lower one:
//
//     CMPA SPRI   OK TO INTERUPT THIS PIRORITY SOUND?
//     BLO  NOSND                        (SYSTEM.SRC:767-768)
//
// Two details decide everything else. The comparison happens ONLY while `STMR`
// is non-zero (:765-766) — with nothing sounding, any priority is accepted with
// no comparison at all — and `STMR` is a countdown of FRAMES seeded from the
// sound table's own duration, decremented once per frame by `EXECST`
// (:173-187). So `PRIORITIES` and `FRAME_DURATIONS` below are the two halves of
// one mechanism, and `playEventSounds` drives the clock.
//
// Until jt5-5 the shared engine had no priority notion and the CHANNELS map was
// a FENCE standing in for one: a channel per distinct ROM priority, so two cues
// could only ever steal from each other where the machine would also have let
// them. That kept the map from inverting the ROM without implementing it — a
// priority-40 enemy death and a priority-80 player death sat on different
// channels and simply both played. The engine now arbitrates across channels, so
// the fence no longer decides anything for these seventeen cues; the map is kept
// because the shared engine still routes every sound by channel, and because a
// channel per priority remains the honest description of which cues share a voice.
//
// The ROM's other branch is deliberately NOT ported. `:762`'s
// `BMI 1$  SOUND PIRORITYS OF 128 TO 255 ARE ALWAYS SENT` skips only the
// end-of-game mute at :763-764; it does not bypass the comparison. Joust's
// highest cue priority is 100 (`extraMan`/`SNREPL`), so nothing in this manifest
// can reach 128 and the branch is unreachable for this cue set. It is absent by
// decision, not by oversight.
import {
  createAudioEngine as createSharedAudioEngine,
  type AudioEngine as SharedAudioEngine,
} from '@shared/audio'

/**
 * The cue names the dispatch speaks in — one per `EVENT_KINDS` entry, and the
 * key of every map below. Not derived from the core's tuple on purpose: the core
 * names MOMENTS and the shell names SOUNDS, and the suite sweeps the two sets
 * against each other rather than making one a projection of the other.
 */
export type SoundName =
  | 'enemyDeath'
  | 'playerDeath'
  | 'eggCollected'
  | 'eggHatched'
  | 'pteroArrives'
  | 'pteroDeath'
  | 'playerMaterialise'
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

/**
 * joust's prefix on the shared assets host — the fleet convention (tempest's is
 * `.../tempest/sfx/`). The bucket behind this hostname is named plain `arcade`,
 * not `arcade-assets`, and only `just deploy-assets` ever writes to it. CI never
 * touches it, and neither does this story.
 */
export const DEFAULT_BASE_URL = 'https://arcade-assets.slabgorb.com/joust/sfx/'

/** Cue -> filename. One `.wav` per cue: seventeen distinct Williams tables. */
export const SOUNDS: Readonly<Record<SoundName, string>> = {
  enemyDeath: 'enemy_death.wav',
  playerDeath: 'player_death.wav',
  eggCollected: 'egg_collected.wav',
  eggHatched: 'egg_hatched.wav',
  pteroArrives: 'ptero_arrives.wav',
  pteroDeath: 'ptero_death.wav',
  playerMaterialise: 'player_materialise.wav',
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

/**
 * Cue -> logical channel, named for the ROM priority that decides it (see the
 * header). Keyed by `SoundName`, so a cue with no channel is a compile error
 * rather than an unroutable sound.
 *
 * The channel no longer decides which cue wins. Until jt5-5 it did: every cue
 * here is arbitrated now, so `PRIORITIES` and the engine's single voice settle
 * every collision and a shared channel can no longer buy or deny a cue anything.
 * What the grouping still says is TRUE and worth keeping — cues on one channel
 * are exactly the cues at one ROM priority — and the engine continues to route
 * by channel, so the map is live wiring, just no longer the arbitration.
 */
export const CHANNELS: Readonly<Record<SoundName, string>> = {
  enemyThud: 'prio-9',
  enemyWingDown: 'prio-6',
  enemyWingUp: 'prio-6',
  playerWingDown: 'prio-10',
  playerWingUp: 'prio-10',
  playerThud: 'prio-20',
  enemyDeath: 'prio-40',
  enemyMaterialise: 'prio-40',
  eggCollected: 'prio-45',
  eggHatched: 'prio-45',
  waveBounty: 'prio-50',
  pteroArrives: 'prio-65',
  pteroDeath: 'prio-66',
  cliffDestroyed: 'prio-67',
  playerMaterialise: 'prio-70',
  playerDeath: 'prio-80',
  extraMan: 'prio-100',
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
 * AC5's "no cue is silently fabricated as authentic" is exactly the confusion a
 * single optional field would permit. An authentic cue carries BOTH sides of its
 * evidence — the FCB row that defines the table (with the machine's own comment
 * on it) and the call site that plays it — because a table alone proves the
 * sound exists and not that it belongs to this moment.
 *
 * `invention` is the honest escape hatch for a later story: a cue with no table
 * behind it. jt5-1 uses none — all seventeen of its moments have one.
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
      /** Where the game plays it. */
      callSite: Citation
    }
  | { kind: 'invention'; note: string }

const SRC = 'JOUSTRV4.SRC'

/**
 * One provenance record per cue. Every line below re-opens byte-for-byte against
 * `reference/williams-source/joust/` — the suite checks both citations, that the
 * quoted row really DEFINES the named table at the cited priority, and that the
 * call site really mentions it. The whole 38-table set sits at :8051-8131 under
 * the format header at :8045-8049 (priority, then (code, duration) pairs).
 */
export const CUE_SOURCES: Readonly<Record<SoundName, CueSource>> = {
  enemyDeath: {
    kind: 'rom',
    table: 'SNEDIE',
    priority: 40,
    romComment: 'ENEMY DIES',
    source: { file: SRC, line: 8104, verbatim: 'SNEDIE\tFCB\t040,!N$16!.$7F,20\tENEMY DIES' },
    callSite: { file: SRC, line: 2960, verbatim: '\tLDX\t#SNEDIE\t\tENEMY DIES' },
  },
  playerDeath: {
    kind: 'rom',
    table: 'SNPDIE',
    priority: 80,
    romComment: 'PLAYER DIES',
    source: { file: SRC, line: 8115, verbatim: 'SNPDIE\tFCB\t080,!N$16!.$7F,20\tPLAYER DIES' },
    callSite: { file: SRC, line: 4744, verbatim: '\tLDX\t#SNPDIE\t\tPLAYER DIES' },
  },
  eggCollected: {
    kind: 'rom',
    table: 'SNEGG',
    priority: 45,
    romComment: 'PLAYER HITS EGG SOUND',
    source: { file: SRC, line: 8098, verbatim: 'SNEGG\tFCB\t045,!N$03!.$7F,30\tPLAYER HITS EGG SOUND' },
    callSite: { file: SRC, line: 3031, verbatim: '\tLDX\t#SNEGG\t\tEGG & PLAYER COLIDE, IF HERE' },
  },
  eggHatched: {
    kind: 'rom',
    table: 'SNEGGH',
    priority: 45,
    romComment: 'EGG HATCHING SOUND',
    source: { file: SRC, line: 8099, verbatim: 'SNEGGH\tFCB\t045,!N$02!.$7F,30\tEGG HATCHING SOUND' },
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
    source: {
      file: SRC,
      line: 8094,
      verbatim: 'SNPTEI\tFCB\t065,!N$24!+$80,30,!N$25!.$7F,30\tPTERODACTYL INTRODUCTION SCREAM',
    },
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
    callSite: { file: SRC, line: 2946, verbatim: '\tLDX\t#SNPTED\t\tPTERODACTYL DYING SOUND' },
  },
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
    // Reached through the DSNCRE field of P1DEC's decision block rather than a
    // direct load — that binding is WHICH creature gets which table. P2 has its
    // own table (SNPCR2, :8119) bound at :5556; both knights map here for now.
    callSite: {
      file: SRC,
      line: 5544,
      verbatim: '\tFDB\tSNPLWU,SNPLWD,SNPLSK,SNPLS2,SNPRU1,SNPRU2,SNPFAL,0,SNPCR1',
    },
  },
  enemyMaterialise: {
    kind: 'rom',
    table: 'SNECRE',
    priority: 40,
    romComment: 'ENEMY RE-CREATED (TRANSPORTER)',
    source: {
      file: SRC,
      line: 8103,
      verbatim: 'SNECRE\tFCB\t040,!N$07!+$80,90,$00,1\tENEMY RE-CREATED (TRANSPORTER)',
    },
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
    callSite: { file: SRC, line: 4711, verbatim: '\tLDX\t#SNBOUN\t\tAWARD BOUNTY SOUND' },
  },
  cliffDestroyed: {
    kind: 'rom',
    table: 'SNCLIF',
    priority: 67,
    romComment: 'CLIFF DESTROYER',
    source: { file: SRC, line: 8090, verbatim: 'SNCLIF\tFCB\t067,!N$19!.$7F,90\tCLIFF DESTROYER' },
    callSite: { file: SRC, line: 2327, verbatim: '12$\tLDX\t#SNCLIF\t\tCLIFF DESTROYING SOUND' },
  },
  // ─── jt5-3: the two-edge FLAP ────────────────────────────────────────────
  // Both call sites are the DECISION-BLOCK bindings (:5544 knights, :5560
  // buzzards), not GOFLIP/GOFLAP themselves: those two lines load through
  // DSNWU/DSNWD (the structure OFFSETS declared at :118-119), never naming
  // SNPLWU/SNPLWD/SNELWU/SNELWD by symbol, so citing them here would fail the
  // "call site really mentions the table" gate. The binding lines say which
  // species gets which table — exactly what `playerMaterialise` and
  // `enemyMaterialise` above already cite at these same two lines.
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
    callSite: {
      file: SRC,
      line: 5544,
      verbatim: '\tFDB\tSNPLWU,SNPLWD,SNPLSK,SNPLS2,SNPRU1,SNPRU2,SNPFAL,0,SNPCR1',
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
    callSite: {
      file: SRC,
      line: 5544,
      verbatim: '\tFDB\tSNPLWU,SNPLWD,SNPLSK,SNPLS2,SNPRU1,SNPRU2,SNPFAL,0,SNPCR1',
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
    callSite: {
      file: SRC,
      line: 5560,
      verbatim: '\tFDB\tSNELWU,SNELWD,SNEMSK,SNEMS2,SNERU1,SNERU2,SNEFAL,0,SNECRE',
    },
  },
  // ─── jt5-4: the THUDS — collisionPass applies the bounce it used to discard ──
  // SNPTHD and SNETHD send the SAME 6-bit code $08 (like SNEDIE/SNPDIE's $16)
  // and differ only in priority, so they are two sounds sharing one waveform
  // intent, never one collapsed cue. jt5-5 owns arbitrating the two priorities;
  // this story only records them truthfully (CHANNELS above keeps them on
  // distinct channels for exactly that reason).
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
    callSite: { file: SRC, line: 5019, verbatim: 'OSTHT2\tLDX\t#SNETHD\t\tENEMIES COLIDE' },
  },
}

// ─── The engine ──────────────────────────────────────────────────────────────

/** joust's shared engine, specialised to its cue union. */
export type AudioEngine = SharedAudioEngine<SoundName>

/**
 * Build joust's audio engine from the manifest above. Inert until `resume()` is
 * called on a user gesture, and inert forever where WebAudio is absent — which
 * is why constructing one in a test environment is safe and `ready()` answers
 * false there. `baseUrl` is overridable for tests; production takes the default.
 */
/**
 * Cue -> the ROM priority `SND` arbitrates on. DERIVED from `CUE_SOURCES` rather
 * than retyped: the priority is already cited there against the `FCB` row that
 * defines the table, and a second transcription is a second thing to get wrong.
 */
const PRIORITIES: Partial<Record<SoundName, number>> = (() => {
  const map: Partial<Record<SoundName, number>> = {}
  for (const name of Object.keys(CUE_SOURCES) as SoundName[]) {
    const source = CUE_SOURCES[name]
    if (source.kind === 'rom') map[name] = source.priority
  }
  return map
})()

/**
 * Cue -> how many frames it holds the voice: the sum of every `(code, duration)`
 * pair in its table.
 *
 * These are NOT derivable from `CUE_SOURCES`, and the reason is the one trap in
 * this file. A `CueSource` cites the single `FCB` row that DEFINES its table, but
 * the format header says a table need not end there:
 *
 *     *	 PIRORITY,SOUND,LENGTH (IF M.S.BIT SET ON SOUND, SOUND,LENGTH)
 *                                              (JOUSTRV4.SRC:8045-8049)
 *
 * A pair whose code carries `+$80` is followed by another, and the assembler is
 * free to put it on the next line. Two of these seventeen do exactly that, and
 * their cited rows parse cleanly to a number that is simply not the table's
 * length:
 *
 *   SNPCR1  :8116-8118   30 + 255 + 165 = 450   (cited row alone: 30)
 *   SNPTED  :8091-8093   15 + 15 + 7 + 7 + 90 = 134   (cited row alone: 30)
 *
 * Both rows are byte-exact, and the citation gate re-opens the quoted line only,
 * so it cannot see that a reading of it is fifteen times short. Every value below
 * therefore names its table's FULL extent, and the totals are pinned by
 * `tests/audio-priority.test.ts`.
 */
const FRAME_DURATIONS: Readonly<Record<SoundName, number>> = {
  enemyDeath: 20, // SNEDIE  :8104
  playerDeath: 20, // SNPDIE  :8115
  eggCollected: 30, // SNEGG   :8098
  eggHatched: 30, // SNEGGH  :8099
  pteroArrives: 60, // SNPTEI  :8094        30 + 30
  pteroDeath: 134, // SNPTED  :8091-8093   15 + 15 + 7 + 7 + 90
  playerMaterialise: 450, // SNPCR1  :8116-8118   30 + 255 + 165
  enemyMaterialise: 91, // SNECRE  :8103        90 + 1
  extraMan: 90, // SNREPL  :8089
  waveBounty: 60, // SNBOUN  :8096
  cliffDestroyed: 90, // SNCLIF  :8090
  playerWingDown: 90, // SNPLWD  :8126
  playerWingUp: 90, // SNPLWU  :8125
  enemyWingDown: 60, // SNELWD  :8108
  enemyWingUp: 60, // SNELWU  :8107
  playerThud: 31, // SNPTHD  :8124        30 + 1
  enemyThud: 31, // SNETHD  :8106        30 + 1
}

export function createAudioEngine(baseUrl: string = DEFAULT_BASE_URL): AudioEngine {
  return createSharedAudioEngine<SoundName>({
    baseUrl,
    sounds: SOUNDS,
    channels: CHANNELS,
    priorities: PRIORITIES,
    frameDurations: FRAME_DURATIONS,
  })
}
