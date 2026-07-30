// src/core/events.ts
//
// The pure-core game-event channel (Story 8-7). `stepGame` emits a fresh list of
// these on `GameState.events` each frame, describing the gameplay moments the
// shell reacts to — the Wave-5 WebAudio SFX engine (shell/audio.ts) consumes
// them, and the event->sound pump in main.ts maps each to a sample.
//
// Events are DATA, never callbacks: they carry only the information a renderer or
// SFX engine needs (which kind died, where), so the core stays pure and
// deterministic. A fixed RNG seed + input stream yields an identical event stream.
//
// Narrow with the `type` discriminant (`switch (e.type)` / `e.type === '...'`).

// `import type` ⇒ a compile-time-only reference, so no runtime import cycle with
// state.ts (which imports `GameEvent` back for the `events` channel) or math3d.ts.
import type { Vec3 } from '@shared/math3d'
import type { Phase } from './state'

// What an `enemy-death` destroyed: a space TIE fighter or a surface laser turret.
// A literal union (not `string`) keeps downstream `switch` exhaustive and rejects
// misspelled kinds. Distinct from `Enemy.kind` because a turret is not an `Enemy`.
export type DeathKind = 'tie' | 'turret'

// The player pulled the trigger and a bolt left the cockpit this frame.
export interface FireEvent {
  type: 'fire'
}

// An enemy (TIE or turret) loosed a fireball. `pos` is the bolt's world-space
// spawn point — carried for future stereo panning; the cue itself is positionless.
export interface EnemyFireEvent {
  type: 'enemy-fire'
  pos: Vec3
}

// An enemy was destroyed by a player bolt. `enemyType` is what died; `pos` marks
// where, for particle/SFX placement.
export interface EnemyDeathEvent {
  type: 'enemy-death'
  enemyType: DeathKind
  pos: Vec3
}

// The player lost a shield to hostile fire or a collision. `cause` distinguishes
// the death channel for cue selection (a surface scrape is `terrain-crash`, not
// this — see the session deviation).
export interface PlayerDeathEvent {
  type: 'player-death'
  cause: 'enemy' | 'turret'
}

// The current phase's kill quota was met; the run advances to `next` this frame.
export interface LevelClearEvent {
  type: 'level-clear'
  next: Phase
}

// A fresh run began from the attract screen — the ship spawns into the cockpit.
export interface PlayerSpawnEvent {
  type: 'player-spawn'
}

// The ship scraped the Death Star surface (dipped below the safe skim altitude),
// costing a shield. Its own audio cue, distinct from `player-death`.
export interface TerrainCrashEvent {
  type: 'terrain-crash'
}

// The ship flew into a standing surface tower/bunker (sw7-5 / D-020) — the
// ROM's BG1GLW + AUDCR crash (WSGRND.MAC:901-912 tower, :937-964 bunker).
// Costs a shield, exactly once per object passed. Its own cue like
// 'terrain-crash' (AUDCR is a distinct sound), and deliberately NOT an
// 'enemy-death': the crash never destroys the building — it flies off behind.
export interface ObjectCrashEvent {
  type: 'object-crash'
  /** What the ship hit; legacy kindless entries crash as towers. */
  kind: 'tower' | 'bunker' | 'bishop'
  /** Where it crossed the cockpit plane, for particle/SFX placement. */
  pos: Vec3
}

// A player bolt shot an enemy fireball out of the air before it reached the
// cockpit (story 8-18). `pos` is where it died, for particle/SFX placement.
// Distinct from `enemy-death` because a fireball is hostile ordnance, not an
// `Enemy` — the same reason `terrain-crash` stays separate from `player-death`.
export interface FireballDestroyedEvent {
  type: 'fireball-destroyed'
  pos: Vec3
}

// A trench wall obstacle (turret or wall square) was shot down. Distinct from
// `enemy-death` because these are wall fixtures, not `Enemy`/`Turret` entities —
// the same reason `fireball-destroyed` and `terrain-crash` stay separate
// (fidelity epic, findings ## Trench catwalks, turrets & wall squares). Catwalks
// never appear here — they are hazards, not shootable, and reuse `terrain-crash`
// on cockpit contact.
export interface TrenchObstacleDestroyedEvent {
  type: 'trench-obstacle-destroyed'
  kind: 'turret' | 'square'
}

// A clean port kill — no trench shots before the killing torpedo — awarded the
// "Use the Force" bonus on top of TRENCH_BONUS (fidelity epic, findings
// ## Exhaust port & run outcome). `amount` carries FORCE_BONUS for the SFX/HUD
// layer, mirroring how the other scoring events carry their own payload.
export interface ForceBonusEvent {
  type: 'force-bonus'
  amount: number
}

// Every tower on the Death Star surface was destroyed — the run banks the 50,000
// "cleared all towers" bonus (ROM byte_9862; on-screen banner
// "50,000 FOR SHOOTING ALL TOWERS", ROM:E039) as it drops into the trench
// (sw3-3). `amount` carries SURFACE_CLEAR_BONUS for the SFX/HUD layer, mirroring
// how ForceBonusEvent and the other scoring events carry their own payload.
export interface TowerBonusEvent {
  type: 'tower-bonus'
  amount: number
}

// The per-surviving-shield wave bonus banked at a won run (sw7-4 / S-013). The ROM
// `SCRSHLD` (WSGAS.MAC:375-391) adds `TSCSHL` = 5,000 once per remaining shield unit,
// unconditionally, in the end-of-wave VEWNXT sequence. `amount` is the total
// (5,000 × shields) for the SFX/HUD layer; `shields` is the surviving count the
// "BONUS FOR REMAINING ENERGY / 5,000 X N" banner (MS.BRE) displays.
export interface ShieldBonusEvent {
  type: 'shield-bonus'
  amount: number
  shields: number
}

// The winning shot — a player torpedo destroyed the exhaust port and the Death
// Star blows (sw2-4). Positioned like `enemy-death` / `fireball-destroyed` so the
// shell can stage the explosion AT the port's world spot; `pos` is the port's
// down-range position on the killing frame. Emitted BEFORE the `level-clear` warp
// so the shell shows the boom before the jump to the next wave's space phase.
export interface DeathStarDestroyedEvent {
  type: 'death-star-destroyed'
  pos: Vec3
}

// The run's failure beat — the exhaust port scrolled past the cockpit un-destroyed
// (sw2-4). Its own cue, distinct from the generic `terrain-crash`, so the shell can
// say "YOU MISSED" rather than read the lost run as a nondescript scrape or as
// nothing. Positionless like `terrain-crash`: the miss is a HUD/audio tell, not a
// world-placed effect.
export interface ExhaustPortMissedEvent {
  type: 'exhaust-port-missed'
}

// A scripted TMS5220 voice line the CORE cues at a gameplay moment (sw2-5). A
// string-literal union — not `string` — so the shell's event->speak pump stays
// exhaustive and a typo is a type error, not a silent miss. Only lines with a
// reachable trigger in the current sim are listed; the shell's SPEECH map holds
// the full 23-line cabinet catalogue, and the un-cued remainder is inventoried
// under DEFERRED below. Each id here is a key in that catalogue, so
// `speak(event.line)` type-checks (SpeechLine ⊆ SpeechName).
export type SpeechLine =
  | 'redFiveStandingBy' // run start — Luke reports in
  | 'lookAtTheSizeOfThatThing' // entering the Death Star surface
  | 'useTheForceLuke' // entering the trench (was shell-derived before sw2-5)
  | 'greatShotKidThatWasOneInAMillion' // the winning port shot, human waves {4,6,8,...} (WSMAIN:1919)
  // sw3-4 — trench voice-line timer (ROM word_4B0E), gated by 0-based BS.WAV parity
  // (WSMAIN:1868; base reconciled by sw7-2 — U-007/U-008):
  | 'lukeTrustMe' // trench timer 16, human ODD wave (Sound_18, SPKTRU)
  | 'youreAllClearKid' // trench timer 24, human ODD wave (Sound_1A, SPKYAU)
  | 'theForceIsStrongInThisOne' // trench timer 22, human EVEN wave (Sound_16, SPKSTR)
  | 'letGoLuke' // trench timer 16, human EVEN wave (SPKLET; restored by sw7-2, U-007)
  // sw7-8 — the R8 speech wirings (audit U-015..U-017):
  | 'redFiveImGoingIn' // entering the surface, before SIZ (SPKTHI, WSMAIN:1515)
  | 'r2Scream' // exhaust port missed AND the run survives (SPKR2N, WSMAIN:1914 — gated on S.GAS)
  | 'remember' // game over, first farewell word (SPKREM, WSMAIN:2143)
  | 'theForceWillBeWithYou' // game over — SPKFOA is the TFOA sequence 15.,16. (SNDSPK:100-103)…
  | 'always' // …so the farewell is REM, FOR, ALW spoken serially (the TMS5220 has one throat)

// DEFERRED — the 10 catalogue lines with no core cue (uf1-5). The union above is
// the cued 13 of 23: ten cued explicitly in sim.ts, three through
// ENTER_PHASE_SPEECH. These ten are the rest. All ten are baked and serve 200
// from R2, so this is dead weight in the catalogue, NOT the sw3-5 silent-404
// class — each waits on a mechanism, named below with the ROM routine that
// speaks it.
// The count is this list's length, and tests/shell/audio.test.ts pins the
// partition against the shell's [wired] markers: wiring a line without moving
// it out of this block fails the suite.
//
//   Darth first sighted — a one-shot latch when Vader enters the player's view
//   (Q.RTHV, WSMAIN.MAC:3849-3865), branching on SP.WAV parity then P.RND1:
//     stayInAttackFormation  SPKSTA — SP.WAV even, random branch (TSTA = 10,14,10)
//     imOnTheLeader          SPKIMO — SP.WAV even, other branch  (TIMO = 10,3,10)
//     iHaveYouNow            SPKHAV — SP.WAV odd                 (THAV = 10,12,10)
//   (This replaces an older "wingmen" note: no deferred line needs wingmen —
//   the ROM speaks all three off Darth becoming visible.)
//
//   Multi-phrase sequences — a SpeechEvent carries ONE phrase, but the cabinet
//   never speaks these two alone; we already emit the other half (SNDSPK.MAC):
//     vaderBreathing  phrase 10 — brackets the three lines above plus SPKSTR
//                     (10,4,10); the standalone TBRE is commented out in the ROM
//     yahoo           phrase 11 — leads SPKYAU (11,8); our trench timer-24 cue
//                     emits only the 8 half, as youreAllClearKid
//
//   Shield-count ladder — DO1GAS (WSGAS.MAC:63) speaks by shields REMAINING
//   after a hit, at :85-94; our loseShield funnel cues no speech at all:
//     r2TryAndIncreaseThePower  S.GAS == 2 (SPKR2T)
//     iveLostR2                 S.GAS == 0 (SPKLOS)
//
//   Un-modelled per-run latches:
//     imHitButNotBadR2SeeWhatYouCanDoWithIt  first gun hit, and only while
//                     S.GAS > 3 (Q.GHIT, WSGUNS.MAC:1167-1173)
//     iCantShakeHim   the TIE we are aimed at keeps firing until a countdown
//                     reaches zero (Q.SHK, WSGUNS.MAC:157-163)
//     tieFighter      phrase 18, spoken by SPKELE on a TIE pass-by (Q.PBB,
//                     WSMAIN.MAC:3793-3797) — audit U-019's fly-by set, which
//                     the R8 ruling deferred

// A voice line was cued this frame. Speech is DATA like every other event: the
// core decides WHEN a line plays (deterministic, testable), the shell decides HOW
// (the R2 LPC bake). Before sw2-5 only "Use the Force, Luke" fired, and it was
// derived in the shell off a phase edge; now every cue is a first-class event.
export interface SpeechEvent {
  type: 'speech'
  line: SpeechLine
}

// The player confirmed their high-score initials on the entry screen
// (SH2-13). The same core-owns-WHEN / shell-owns-HOW split as speech: the
// shell (main.ts owns the table + persistence seam) inserts and saves
// `name` on this cue.
export interface NameEnteredEvent {
  type: 'name-entered'
  name: string
}

// The looping background-music track the cabinet plays for the current phase
// (sw3-5). A string-literal union — not `string` — so the shell's event->startLoop
// pump stays exhaustive and a typo is a type error, not a silent miss. Names follow
// the ROM sound board (docs/star-wars-1983-source-findings.md, "## Sound hooks"):
// the space wave is Sound_24/25, the Death Star surface is Sound_20/21 ("Towers
// music" — hence 'towers', not the phase name 'surface'), the trench is Sound_22,
// and the Imperial March (Sound_1D) replaces the space theme on human waves {4,6,8,...}.
export type MusicTrack =
  | 'space' // space wave — Sound_24/25
  | 'towers' // Death Star surface — Sound_20/21
  | 'trench' // trench run — Sound_22
  | 'imperialMarch' // replaces the space theme on human {4,6,8,...} (WSMAIN:1421, GM.WAV>=3 odd) — Sound_1D

// A phase edge swapped the looping music channel this frame (sw3-5). Like speech,
// the core decides WHICH track and WHEN (deterministic, tested); the shell owns HOW
// (the @shared/audio looping channel). Emitted ONLY on a phase edge — never
// on a frame that merely stays in a phase — so the shell's startLoop is not
// re-triggered 60x a second (which would stutter the loop to silence).
export interface MusicEvent {
  type: 'music'
  track: MusicTrack
}

// The five one-shot POKEY tunes (sw7-8, audit U-010..U-014). A string-literal
// union like MusicTrack, and for the same reason. Names follow the callers in
// the 1983 source, never the entry-point labels (the PMBEN lesson):
export type TuneName =
  | 'deathKnell' // PMSF2 — the proton torpedo is FIRED (WSGUNS.MAC:1220 FRPTGN)
  | 'cantina' // PMCNT — the enter-initials screen opens (WSMAIN.MAC:1164 PHIENT)
  | 'finale' // PMEND — the Death Star detonates (WSMAIN.MAC:2179 PHIDX1)
  | 'bensTheme' // PMBEN — lose with no high score (WSMAIN.MAC:2161), NOT the towers theme
  | 'descent' // PMDES — the space PH.TIM 400 (20s) milestone (WSMAIN.MAC:1439, sw8-12)
  | 'finishGround' // PMREB — "FINISH GROUND WITH REBEL", late in the surface (WSMAIN.MAC:1673, PH.TIM==14)
  | 'themeB' // PMTHB — the space PH.TIM 200 (10s) milestone (WSMAIN.MAC:1435, sw8-12)

// A one-shot tune cue (sw7-8). Same core-owns-WHEN / shell-owns-HOW split as
// speech and music: the shell plays it once on the single shared 'tune'
// channel — one tune player, exactly like the cabinet's PM driver, so a new
// tune voice-steals the last. Unlike MusicEvent this never loops: a knell that
// looped would toll forever. 'cantina' and 'bensTheme' carry no core trigger —
// the high-score fork lives in the shell (main.ts owns the table, SH2-13).
export interface TuneEvent {
  type: 'tune'
  tune: TuneName
}

export type GameEvent =
  | FireEvent
  | EnemyFireEvent
  | EnemyDeathEvent
  | PlayerDeathEvent
  | LevelClearEvent
  | PlayerSpawnEvent
  | TerrainCrashEvent
  | ObjectCrashEvent
  | FireballDestroyedEvent
  | TrenchObstacleDestroyedEvent
  | ForceBonusEvent
  | TowerBonusEvent
  | ShieldBonusEvent
  | DeathStarDestroyedEvent
  | ExhaustPortMissedEvent
  | SpeechEvent
  | MusicEvent
  | TuneEvent
  | NameEnteredEvent
