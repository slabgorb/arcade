// plugins/defender/src/shell/audio.ts
//
// Story df6-1 (GREEN — the audio seam's SHELL half). Defender's own NUMBERS —
// the per-cabinet SOUNDS manifest, the CHANNELS fence, and the byte-exact
// provenance of every cue — handed to the shared engine's VERB. The WebAudio
// engine itself (lazy AudioContext on a gesture, master gain, fetch/decode,
// channel voice-stealing, silent-degrade at every failure path) is
// `@shared/audio`, in-tree since the 2026-07-30 collapse and reached through the
// `@shared/*` alias declared in vite/vitest/tsconfig. There is nothing to pin: no
// npm dependency, no git URL, no version. Defender's plugin package.json stays the
// three-field stub. The shared-vs-standalone question the df6 epic exists to rule
// on was dissolved by the migration, exactly as it was for joust (jt5-1 AC1).
//
// This module is IO (shell), never simulation. The pure core emits `GameEvent`
// DATA on `SimState.cues` and never imports this file; `audio-dispatch.ts` is what
// turns one into the other.
//
// ─── THE .wav FILES LIVE IN THE BUCKET, NEVER IN THIS REPO ───────────────────────
// The manifest is a promise about an R2 key prefix, not about this repo. df6-1
// ships the seam SILENT: `SOUNDS` names one file per cue, but no `.wav` is baked or
// committed this story (Defender stays quiet, and a green suite here proves the
// WIRING, not the audio — `@shared/audio` degrades silently on a 404). A later df
// story bakes the samples and deploys them, the way jt5-2 followed jt5-1 for joust.
//
// ─── ONE SOUND VOICE, ARBITRATED BY A PRIORITY BYTE — and why it is a FENCE here ──
// Defender is a Williams machine, so — like joust — it has ONE sound voice
// arbitrated by a priority byte. `SNDLD` (DEFA7.SRC:709-715) refuses an incoming
// table whose first byte (SNDPRI) is strictly BELOW the sounding one:
//
//     LDA  ,X            the incoming table's SNDPRI byte
//     CMPA SNDPRI
//     BLO  SNDLDX   PRIORITY NOT HI ENOUGH   (DEFA7.SRC:713-714)
//
// df6-1 does NOT port that arbitration — it ships the SEAM, mirroring jt5-1, which
// also shipped joust's seam before jt5-5 implemented the priority window. Until a
// later df story sizes each cue's SNDTMR frame window, `CHANNELS` stands in for the
// voice as a FENCE: one logical channel per DISTINCT SNDPRI byte, so two cues can
// only ever steal from each other where the machine's single voice would also have
// let one interrupt the other. A $D0 enemy-hit and a $F0 player-death sit on
// different channels and simply both play; six $C0 cues share one channel because
// the machine gives them one voice. The fence cannot INVERT the ROM (a lower cue
// never cuts a higher one), and it does not yet IMPLEMENT it (equal priorities
// share a voice, but the timed refusal is a later story). `CUE_SOURCES` records the
// SNDPRI byte of every cue so the channel naming stays honest and re-openable.
import {
  createAudioEngine as createSharedAudioEngine,
  type AudioEngine as SharedAudioEngine,
} from '@shared/audio'

/**
 * Every cue Defender can sound — one per gameplay moment the integrated sim
 * resolves (see core/events.ts). A 1:1 mirror of `GameEventKind` in camelCase:
 * every df6-1 cue is a payload-free one-shot mapping to exactly one SOUND TABLE
 * entry, so the sound name and the event kind are the same idea in two casings and
 * `audio-dispatch.ts` maps one to the other by hand (a closed switch, never a
 * string transform — a typo must be a compile error, not a silent miss).
 */
export type SoundName =
  | 'laserFire'
  | 'landerHit'
  | 'mutantHit'
  | 'baiterHit'
  | 'podHit'
  | 'bomberHit'
  | 'swarmerHit'
  | 'landerShoot'
  | 'mutantShoot'
  | 'baiterShoot'
  | 'swarmerShoot'
  | 'landerPickup'
  | 'enemyAppear'
  | 'smartBomb'
  | 'playerDeath'
  | 'extraMan'
  | 'waveStart'
  | 'astroCatch'
  | 'astroLand'
  | 'astroHit'
  | 'astroScream'
  // df6-2 — the two STATEFUL LOOP cues (sounded via startLoop/stopLoop, not play).
  | 'thrust' //     the held thrust loop (THFLG side-path; no SOUND-TABLE row)
  | 'landerSuck' // the abduction repeat (LSKSND, sounded as a held loop — see CUE_SOURCES)

/**
 * Defender's prefix on the shared assets host — the fleet convention (joust's is
 * `.../joust/sfx/`). The bucket behind this hostname is named plain `arcade`, and
 * only `just deploy-assets` ever writes to it. CI never touches it, and neither
 * does this story: no sample is baked here, so every fetch 404s and degrades to
 * silence until a later df story deploys the files.
 */
export const DEFAULT_BASE_URL = 'https://arcade-assets.slabgorb.com/defender/sfx/'

/**
 * Logical name -> filename (the per-cabinet NUMBERS). One file per cue, named for
 * its ROM sound-table symbol so the bucket key and the assembler line agree. No
 * `.wav` is committed to this repo — these are promises about the R2 prefix that a
 * later df story fulfils.
 */
export const SOUNDS: Readonly<Record<SoundName, string>> = {
  laserFire: 'lassnd.wav',
  landerHit: 'lhsnd.wav',
  mutantHit: 'schsnd.wav',
  baiterHit: 'ufhsnd.wav',
  podHit: 'prhsnd.wav',
  bomberHit: 'tihsnd.wav',
  swarmerHit: 'swhsnd.wav',
  landerShoot: 'lshsnd.wav',
  mutantShoot: 'sshsnd.wav',
  baiterShoot: 'ushsnd.wav',
  swarmerShoot: 'swssnd.wav',
  landerPickup: 'lpksnd.wav',
  enemyAppear: 'apsnd.wav',
  smartBomb: 'sbsnd.wav',
  playerDeath: 'pdsnd.wav',
  extraMan: 'rpsnd.wav',
  waveStart: 'st1snd.wav',
  astroCatch: 'acsnd.wav',
  astroLand: 'alsnd.wav',
  astroHit: 'ahsnd.wav',
  astroScream: 'ascsnd.wav',
  // df6-2 loop cues. `thrust` has no ROM sound-table symbol (it is the THFLG $16/$0F
  // side-path), so its file is named for the effect; `landerSuck` keeps the LSKSND symbol.
  thrust: 'thrust.wav',
  landerSuck: 'lsksnd.wav',
}

/**
 * Cue -> logical channel, named for the SNDPRI byte that decides it (Decision E).
 * Keyed by `SoundName`, so a cue with no channel is a compile error rather than an
 * unroutable sound. Channels are `prio-<decimal SNDPRI>`: cues on one channel are
 * exactly the cues at one ROM priority. This is the single-voice FENCE (see the
 * header) — the machine's timed arbitration is a later df story; today two cues on
 * one channel steal, two on different channels both play.
 */
export const CHANNELS: Readonly<Record<SoundName, string>> = {
  extraMan: 'prio-255', //     RPSND  $FF
  playerDeath: 'prio-240', //  PDSND  $F0
  waveStart: 'prio-240', //    ST1SND $F0 (shares the $F0 voice with playerDeath)
  smartBomb: 'prio-232', //    SBSND  $E8
  astroCatch: 'prio-224', //   ACSND  $E0
  astroLand: 'prio-224', //    ALSND  $E0
  astroHit: 'prio-224', //     AHSND  $E0 (the three $E0 astro outcomes share a voice)
  astroScream: 'prio-216', //  ASCSND $D8
  enemyAppear: 'prio-208', //  APSND  $D0
  podHit: 'prio-208', //       PRHSND $D0
  mutantHit: 'prio-208', //    SCHSND $D0
  baiterHit: 'prio-208', //    UFHSND $D0
  bomberHit: 'prio-208', //    TIHSND $D0
  landerHit: 'prio-208', //    LHSND  $D0
  landerPickup: 'prio-208', // LPKSND $D0 (the seven $D0 hit/appear/pickup cues share a voice)
  swarmerHit: 'prio-192', //   SWHSND $C0
  laserFire: 'prio-192', //    LASSND $C0
  landerShoot: 'prio-192', //  LSHSND $C0
  mutantShoot: 'prio-192', //  SSHSND $C0
  baiterShoot: 'prio-192', //  USHSND $C0
  swarmerShoot: 'prio-192', // SWSSND $C0 (the six $C0 shoot/laser/swarm-hit cues share a voice)
  // df6-2 loop cues, each on its OWN voice. LSKSND is SNDPRI $C8 (200) — no other cue is
  // $C8, so it keeps the prio-<SNDPRI> naming and its own channel. `thrust` has no SNDPRI
  // (it is not a SOUND-TABLE row), so it names its own channel plainly.
  landerSuck: 'prio-200', // LSKSND $C8
  thrust: 'thrust', //       THFLG side-path — its own loop voice, no SNDPRI to name it by
}

// ─── Provenance ──────────────────────────────────────────────────────────────────

/** A byte-exact pointer into the vendored 1981 tree — the shape Defender's own
 *  citation gate (tests/audit/citations.test.ts) already uses, so one idea keeps
 *  one spelling. `verbatim` re-opens against reference/original-source/defender/. */
export interface Citation {
  file: string
  line: number
  verbatim: string
}

/**
 * Where a cue comes from. A discriminated union, not an optional `rom?` field, so a
 * cue can never be silently fabricated as authentic: an authentic cue carries BOTH
 * sides of its evidence — the SOUND TABLE `FCB` row that DEFINES it (with the
 * machine's own trailing comment and its SNDPRI byte) and the call site that plays
 * it. A table alone proves the sound exists, not that it belongs to this moment.
 *
 * `invention` is the honest escape hatch: a cue with no ROM behind it. None is used
 * today — the twenty-one one-shots and the df6-2 `landerSuck` loop are real SOUND TABLE
 * rows played at a cited site, and the df6-2 `thrust` loop is a `flag` cue (below), ROM-
 * cited to THFLG and its $16/$0F transitions rather than to a table row.
 */
export type CueSource =
  | {
      kind: 'rom'
      /** The Williams sound-table label, e.g. `LASSND`. */
      table: string
      /** The table's SNDPRI byte (its first FCB byte) — SNDLD's arbitration key
       *  (DEFA7.SRC:713-714). Decimal; the channel above is `prio-<this>`. */
      priority: number
      /** Williams's own trailing comment on the FCB row, byte-exact. */
      romComment: string
      /** The `FCB` row in the SOUND TABLE that DEFINES this cue (DEFA7.SRC:665-691). */
      source: Citation
      /** Where the game plays it — an `LDD #<table>` / `JSR SNDLD` pair, or a
       *  `KILP`/`KILO` kill-macro whose sound argument is this table. */
      callSite: Citation
      /** The vector slot a call site plays THROUGH, when it does not name the table
       *  directly. Only `enemyAppear` uses one: SAMEXAP7.SRC:53 loads APSNDV
       *  ($FFDD, PHR6.SRC:96), whose data slot `FDB APSND` (DEFB6.SRC:2247) is what
       *  resolves the vector to this table. Absent for every other direct cue. */
      via?: Citation
    }
  | {
      // df6-2 — a cue the sound driver keys off a FLAG, not a SOUND-TABLE `FCB` row: it
      // has no `LDD #<table>` / `SNDLD` and no SNDPRI byte. Defender's THRUST is the one
      // such cue — `SNDSEQ` reads the PIA21 thrust bit and writes `THFLG` on the press/
      // release EDGE. It is still fully ROM-cited (not an invention): the flag's RMB
      // declaration DEFINES it, and the two `LDB #$XX` writes are its on/off transitions.
      kind: 'flag'
      /** The driver flag, e.g. `THFLG`. */
      flag: string
      /** Williams's own comment on the flag's RMB declaration. */
      romComment: string
      /** The `RMB` line that DECLARES the flag (e.g. PHR6.SRC:293). */
      source: Citation
      /** The `LDB #$XX` that turns the sound ON (the press edge). */
      soundOn: Citation
      /** The `LDB #$XX` that turns the sound OFF (the release edge). */
      soundOff: Citation
    }
  | {
      kind: 'invention'
      note: string
    }

/**
 * One provenance record per cue. Every citation below re-opens byte-for-byte
 * against reference/original-source/defender/ — the FCB row that DEFINES the table
 * at its SNDPRI, and the call site that plays it — and the same rows are pinned as
 * claims in docs/rom-study/claims/19-sound.json, which the df1-1 citation gate
 * (loadClaims globs the whole claims/ dir) re-verifies on every run, CI included.
 * The whole SOUND TABLE sits at DEFA7.SRC:665-691 under the format header at :660
 * (`SNDPRI,N*(REPCNT,SNDTMR,SND#)`) and is loaded by SNDLD at :709; df6-2's `landerSuck`
 * (LSKSND, :684) is one of its rows, while `thrust` is the one FLAG cue with no row.
 */
export const CUE_SOURCES: Readonly<Record<SoundName, CueSource>> = {
  laserFire: {
    kind: 'rom',
    table: 'LASSND',
    priority: 0xc0,
    romComment: 'LASER',
    source: { file: 'DEFA7.SRC', line: 686, verbatim: 'LASSND\tFCB\t$C0,$01,$30,$14,0 LASER' },
    callSite: { file: 'DEFA7.SRC', line: 2767, verbatim: '\tLDD\t#LASSND' },
  },
  landerHit: {
    kind: 'rom',
    table: 'LHSND',
    priority: 0xd0,
    romComment: 'LANDER HIT',
    source: { file: 'DEFA7.SRC', line: 682, verbatim: 'LHSND\tFCB\t$D0,$01,$0A,$06,0 LANDER HIT' },
    callSite: { file: 'DEFB6.SRC', line: 922, verbatim: '\tKILP\t0115,LHSND' },
  },
  mutantHit: {
    kind: 'rom',
    table: 'SCHSND',
    priority: 0xd0,
    romComment: 'SCHITZ HIT',
    source: { file: 'DEFA7.SRC', line: 679, verbatim: 'SCHSND\tFCB\t$D0,$01,$08,$17,0 SCHITZ HIT' },
    callSite: { file: 'DEFB6.SRC', line: 625, verbatim: '\tKILP\t0115,SCHSND' },
  },
  baiterHit: {
    kind: 'rom',
    table: 'UFHSND',
    priority: 0xd0,
    romComment: 'UFO HIT',
    source: { file: 'DEFA7.SRC', line: 680, verbatim: 'UFHSND\tFCB\t$D0,$01,$08,$07,0 UFO HIT' },
    callSite: { file: 'DEFB6.SRC', line: 82, verbatim: '\tKILP\t0120,UFHSND' },
  },
  podHit: {
    kind: 'rom',
    table: 'PRHSND',
    priority: 0xd0,
    romComment: 'PROBE HIT',
    source: { file: 'DEFA7.SRC', line: 678, verbatim: 'PRHSND\tFCB\t$D0,$01,$10,$05,0 PROBE HIT' },
    callSite: { file: 'DEFB6.SRC', line: 118, verbatim: 'PRBKIL\tKILO\t0210,PRHSND' },
  },
  bomberHit: {
    kind: 'rom',
    table: 'TIHSND',
    priority: 0xd0,
    romComment: 'TIE HIT',
    source: { file: 'DEFA7.SRC', line: 681, verbatim: 'TIHSND\tFCB\t$D0,$01,$0A,$01,0 TIE HIT' },
    callSite: { file: 'DEFB6.SRC', line: 1120, verbatim: 'TIEKIL\tKILO\t0125,TIHSND' },
  },
  swarmerHit: {
    kind: 'rom',
    table: 'SWHSND',
    priority: 0xc0,
    romComment: 'SWARM HIT',
    source: { file: 'DEFA7.SRC', line: 685, verbatim: 'SWHSND\tFCB\t$C0,$01,$08,$07,0 SWARM HIT' },
    callSite: { file: 'DEFB6.SRC', line: 192, verbatim: '\tLDD\t#SWHSND' },
  },
  landerShoot: {
    kind: 'rom',
    table: 'LSHSND',
    priority: 0xc0,
    romComment: 'LANDER SHOOT',
    source: { file: 'DEFA7.SRC', line: 688, verbatim: 'LSHSND\tFCB\t$C0,$01,$08,$03,0 LANDER SHOOT' },
    callSite: { file: 'DEFB6.SRC', line: 581, verbatim: '\tLDD\t#LSHSND' },
  },
  mutantShoot: {
    kind: 'rom',
    table: 'SSHSND',
    priority: 0xc0,
    romComment: 'SCHITZO SHOOT',
    source: { file: 'DEFA7.SRC', line: 689, verbatim: 'SSHSND\tFCB\t$C0,$01,$30,$09,0 SCHITZO SHOOT' },
    callSite: { file: 'DEFB6.SRC', line: 899, verbatim: '\tLDD\t#SSHSND' },
  },
  baiterShoot: {
    kind: 'rom',
    table: 'USHSND',
    priority: 0xc0,
    romComment: 'UFO SHOOT',
    source: { file: 'DEFA7.SRC', line: 690, verbatim: 'USHSND\tFCB\t$C0,$01,$08,$03,0 UFO SHOOT' },
    callSite: { file: 'DEFB6.SRC', line: 37, verbatim: '\tLDD\t#USHSND' },
  },
  swarmerShoot: {
    kind: 'rom',
    table: 'SWSSND',
    priority: 0xc0,
    romComment: 'SWARM SHOOT',
    source: { file: 'DEFA7.SRC', line: 691, verbatim: 'SWSSND\tFCB\t$C0,$01,$18,$0C,0 SWARM SHOOT' },
    callSite: { file: 'DEFB6.SRC', line: 269, verbatim: '\tLDD\t#SWSSND\tSWARMER SOUND' },
  },
  landerPickup: {
    kind: 'rom',
    table: 'LPKSND',
    priority: 0xd0,
    romComment: 'LANDER PICK UP',
    source: { file: 'DEFA7.SRC', line: 683, verbatim: 'LPKSND\tFCB\t$D0,$01,$10,$0B,0 LANDER PICK UP' },
    callSite: { file: 'DEFB6.SRC', line: 790, verbatim: '\tLDD\t#LPKSND' },
  },
  enemyAppear: {
    kind: 'rom',
    table: 'APSND',
    priority: 0xd0,
    romComment: 'APPEAR SOUND',
    source: { file: 'DEFA7.SRC', line: 677, verbatim: 'APSND\tFCB\t$D0,$01,$30,$15,0 APPEAR SOUND' },
    // The appear cue plays THROUGH the APSNDV vector, not by naming APSND directly.
    callSite: { file: 'SAMEXAP7.SRC', line: 53, verbatim: '\tLDD\tAPSNDV\tPLAY APPEAR SOUND' },
    via: { file: 'DEFB6.SRC', line: 2247, verbatim: '\tFDB\tAPSND' },
  },
  smartBomb: {
    kind: 'rom',
    table: 'SBSND',
    priority: 0xe8,
    romComment: 'SMART BOMB',
    source: { file: 'DEFA7.SRC', line: 672, verbatim: 'SBSND\tFCB\t$E8,$06,$04,$11,$01,$10,$17,00 SMART BOMB' },
    callSite: { file: 'DEFA7.SRC', line: 3183, verbatim: '\tLDD\t#SBSND' },
  },
  playerDeath: {
    kind: 'rom',
    table: 'PDSND',
    priority: 0xf0,
    romComment: 'PLAYER DEATH',
    source: { file: 'DEFA7.SRC', line: 667, verbatim: 'PDSND\tFCB\t$F0,$02,$08,$11,$01,$20,$17,0 PLAYER DEATH' },
    callSite: { file: 'DEFA7.SRC', line: 1336, verbatim: '\tLDD\t#PDSND' },
  },
  extraMan: {
    kind: 'rom',
    table: 'RPSND',
    priority: 0xff,
    romComment: 'FREE SHIP',
    source: { file: 'DEFA7.SRC', line: 666, verbatim: 'RPSND\tFCB\t$FF,$01,$20,$1E,0 FREE SHIP' },
    callSite: { file: 'DEFA7.SRC', line: 529, verbatim: '\tLDD\t#RPSND' },
  },
  waveStart: {
    kind: 'rom',
    table: 'ST1SND',
    priority: 0xf0,
    romComment: 'START 1',
    source: { file: 'DEFA7.SRC', line: 668, verbatim: 'ST1SND\tFCB\t$F0,$01,$40,$0A,0 START 1' },
    // DESIGN DEVIATION: ST1SND is the ROM's ONE-PLAYER GAME-START cue (played once at
    // ST09), not a per-wave sound — the machine loads no SNDLD on a new field. df6-1
    // reuses it as the wave-start cue so a new field is audible; the byte-exact ROM
    // moment is game-start. Logged in the session's Design Deviations.
    callSite: { file: 'DEFA7.SRC', line: 1105, verbatim: '\tLDD\t#ST1SND' },
  },
  astroCatch: {
    kind: 'rom',
    table: 'ACSND',
    priority: 0xe0,
    romComment: 'ASTRO CATCH',
    source: { file: 'DEFA7.SRC', line: 673, verbatim: 'ACSND\tFCB\t$E0,$03,$0A,$08,0 ASTRO CATCH' },
    callSite: { file: 'DEFB6.SRC', line: 405, verbatim: '\tLDD\t#ACSND' },
  },
  astroLand: {
    kind: 'rom',
    table: 'ALSND',
    priority: 0xe0,
    romComment: 'ASTRO LAND',
    source: { file: 'DEFA7.SRC', line: 674, verbatim: 'ALSND\tFCB\t$E0,$01,$18,$1F,0 ASTRO LAND' },
    callSite: { file: 'DEFB6.SRC', line: 973, verbatim: '\tLDD\t#ALSND' },
  },
  astroHit: {
    kind: 'rom',
    table: 'AHSND',
    priority: 0xe0,
    romComment: 'ASTRO HIT',
    source: { file: 'DEFA7.SRC', line: 675, verbatim: 'AHSND\tFCB\t$E0,$01,$18,$11,0 ASTRO HIT' },
    callSite: { file: 'DEFB6.SRC', line: 396, verbatim: '\tLDD\t#AHSND' },
  },
  astroScream: {
    kind: 'rom',
    table: 'ASCSND',
    priority: 0xd8,
    romComment: 'ASTRO SCREAM',
    source: { file: 'DEFA7.SRC', line: 676, verbatim: 'ASCSND\tFCB\t$D8,$01,$10,$1A,0 ASTRO SCREAM' },
    callSite: { file: 'DEFB6.SRC', line: 914, verbatim: '\tLDD\t#ASCSND' },
  },
  // ─── df6-2: the two STATEFUL loop cues ─────────────────────────────────────────
  landerSuck: {
    kind: 'rom',
    table: 'LSKSND',
    priority: 0xc8,
    romComment: 'LANDER SUCK',
    source: { file: 'DEFA7.SRC', line: 684, verbatim: 'LSKSND\tFCB\t$C8,$0A,$01,$0E,0 LANDER SUCK' },
    // DESIGN DEVIATION (logged, df6-2 session): the ROM plays LSKSND at LANDFX — the TOP,
    // the instant a carrying lander pulls the humanoid inside to transform it (reached by
    // `CMPA #YMIN+8 / BLS LANDFX`, DEFB6.SRC:798-799). In this port that instant is a
    // single tick, so the REPEAT cue ($0A) is sounded instead as a HELD LOOP across the
    // whole abduction ascent (start at grab-lift, stop at top/drop/carrier-death). The
    // call site recorded here is the TRUE one, so the deviation stays honest.
    callSite: { file: 'DEFB6.SRC', line: 803, verbatim: 'LANDFX\tLDD\t#LSKSND' },
  },
  thrust: {
    kind: 'flag',
    flag: 'THFLG',
    romComment: 'THRUST SOUND FLAG',
    source: { file: 'PHR6.SRC', line: 293, verbatim: 'THFLG\tRMB\t1\tTHRUST SOUND FLAG' },
    // SNDSEQ reads the PIA21 thrust bit (DEFA7.SRC:737-739) and, on the EDGE, writes THFLG:
    soundOn: { file: 'DEFA7.SRC', line: 750, verbatim: '\tLDB\t#$16\tNO HIT IT' }, // press → $16 (on)
    soundOff: { file: 'DEFA7.SRC', line: 743, verbatim: '\tLDB\t#$0F' }, //           release → $0F (off)
  },
}

// ─── The engine ────────────────────────────────────────────────────────────────

/** Defender's shared engine, specialised to its cue union. */
export type AudioEngine = SharedAudioEngine<SoundName>

/**
 * Build Defender's audio engine from the manifest above. Inert until `resume()` is
 * called on a user gesture, and inert forever where WebAudio is absent — which is
 * why constructing one in a test environment is safe and `ready()` answers false
 * there. `baseUrl` is overridable for tests; production takes the default.
 *
 * Only `{ baseUrl, sounds, channels }` are passed — NOT `priorities`/
 * `frameDurations`. df6-1 ships the seam with the single-voice FENCE (see the
 * header); the machine's timed priority arbitration (SNDLD's SNDTMR window) is a
 * later df story, exactly as jt5-5 followed jt5-1 for joust.
 */
export function createAudioEngine(baseUrl: string = DEFAULT_BASE_URL): AudioEngine {
  return createSharedAudioEngine<SoundName>({
    baseUrl,
    sounds: SOUNDS,
    channels: CHANNELS,
  })
}
