// src/core/sim.ts
//
// Story ml7-2 — stepGame, the ORCHESTRATOR. One pure function threads the owning
// GameState through the pure subsystems each frame, reusing the done pieces
// (phase.ts advancePhase, input.ts stepPlayer, millipede.ts) and building the
// per-frame event stream the shell audio/render read. Mirrors centipede's stepSim.
//
// TWO LAWS (centipede's): the event array is rebuilt every frame, and ATTRACT IS
// SILENT (its branch returns events: []). Collisions resolve against the
// pre-march segment positions so a shot hits where the segment currently is.
//
// This increment wires the player↔millipede vertical + phase dispatch. The enemy
// roster, DDT, mushroom regen and waves are layered on in follow-up increments,
// each adding its own event emission at the sites marked below.

import { createGame, type GameState, type Shot } from './game-state'
import { stepPlayer, createPlayer } from './input'
import {
  stepMillipede,
  createMillipede,
  checkPlayerCollision,
  stepWaveCadence,
  VACANT_COLOR,
  BODY_COLOR,
  NCENT,
  type Segment,
} from './millipede'
import { WAVE_DELAY, stepWaveDelay } from './waves'
import { advancePhase, type PhaseSignals } from './phase'
import { event, type GameEvent, type GameEventKind } from './events'
import { score1Of, score2Of } from './score'
import { awardBonus } from './bonus'
import { qualifiesForHighScore } from './highscore'
import { stepRoster, shootRoster, initRoster, type Roster } from './enemies/roster'
import { resolveShot } from './shot'
import {
  ddtExplosionStep,
  ddtPlace,
  ddtRestore,
  ddtScrollDown,
  ddtScrollUp,
  anyDdtExploding,
  inDdtCloud,
  bombs,
  bombModeStart,
  BOMBS_SLOTS,
  DDT_KILL_BODY_PTS,
  DDT_KILL_HEAD_PTS,
} from './ddt'
import { startBee } from './bee'
import { startDragonfly } from './dragonfly'
import { startMosquito } from './mosquito'
import { obstacOffset, obstacleAt, FULL_MUSHROOM, TOP_MIN, musher, type MushCounts } from './mushroom'
import { initConway, masterStep } from './conway'
import { scrollDispatch, scrollDown, scrollUp, type ScrollGate } from './scroll'
import { recolourField } from './field-recolour'
import { INCHWORM_SLOW } from './inchworm'
import { nextInt } from '@shared/rng'
import type { EnemyView } from './enemies/contract'

/** One frame of input: the trackball bytes, fire, and the start/coin button. */
export interface GameInput {
  dh: number
  dv: number
  fire: boolean
  start: boolean
}

/** Pixels the shot climbs per frame (higher V = up). */
const SHOT_SPEED = 8
/** The shot expires past the top of the field. */
const SHOT_MAX_V = 0xf8
/** Player-death animation hold (PLAYER_EXPLODE_TIMER, millipede.ts). */
const DEATH_HOLD = 0x60
/** The "GAME OVER" message hold before attract returns (MLSUB.MAC:161-162
 *  "LDA I,80 / STA DELAY" — the ROM reuses DELAY for the end-of-game pause). */
const GAME_OVER_DELAY = 0x80
/** Shot-kill scores — the ROM head/body split (SHOOT2 142$, MILLI.MAC:2162-2175).
 *  A body scores BCD 10 (LDA I,10, DD-225); a head (colour < BODY_COLOR) LSR×4's
 *  that base byte into the hundreds digit → 100 (DD-226). The DDT-cloud premium
 *  (30/300, step 8b) is exactly this base tripled. */
const SEGMENT_BODY_PTS = 10 // MILLI.MAC:2162 "LDA I,10 ;BODY=10 POINTS" (DD-225)
const SEGMENT_HEAD_PTS = 100 // MILLI.MAC:2171-2175 LSR×4 of 0x10 → 100s digit (DD-226)

const isLive = (s: Segment): boolean => s.color !== VACANT_COLOR

/** The bomb context the BOMBS dispatcher needs to build a forced flier spawn. */
interface BombFlierCtx {
  frame: number
  score2: number
  playerAlive: boolean
  slow: number
  dead: number
  beetles: number
  mush: number
  mushTop: number
  centin: number
  rnd0: number
  rnd1: number
}

/**
 * BOMBS enters the chosen critter into its (free) flier slot — the BEEMV3 / FLYMV3 /
 * MOSQT3 forced spawn the dispatcher jumps to (MILLI.MAC:471/482/486). Returns true
 * only when a critter was actually placed (start* no-ops on an invalid RND0 column, and
 * an occupied slot is skipped) — the ROM DECs NOCENT after a successful entry (:472).
 * `nocent: 1` in the flier envs marks bomb mode for dragonflySpeed (DF-31).
 */
function enterBombFlier(critter: 'bee' | 'dragonfly' | 'mosquito', roster: Roster, ctx: Readonly<BombFlierCtx>): boolean {
  if (critter === 'bee') {
    const slot = roster.bees[0]
    if (slot.color !== 0) return false
    startBee(slot, {
      frame: ctx.frame, score2: ctx.score2, attract: false, nocent: 1, playerAlive: ctx.playerAlive,
      rnd0: ctx.rnd0, rnd1: ctx.rnd1, centin: ctx.centin, dead: ctx.dead, beetles: ctx.beetles, mush: ctx.mush,
    })
    return slot.color !== 0
  }
  if (critter === 'dragonfly') {
    const slot = roster.dragonflies[0]
    if (slot.color !== 0) return false
    startDragonfly(slot, {
      frame: ctx.frame, score2: ctx.score2, attract: false, slow: ctx.slow, nocent: 1,
      playerAlive: ctx.playerAlive, rnd0: ctx.rnd0, rnd1: ctx.rnd1, dead: ctx.dead, beetles: ctx.beetles,
      mushTop: ctx.mushTop, centin: ctx.centin,
    })
    return slot.color !== 0
  }
  const slot = roster.mosquitoes[0]
  if (slot.color !== 0) return false
  startMosquito(slot, {
    frame: ctx.frame, score2: ctx.score2, slow: ctx.slow, playerAlive: ctx.playerAlive,
    rnd0: ctx.rnd0, rnd1: ctx.rnd1, centin: ctx.centin,
  })
  return slot.color !== 0
}

/** Live slots (colour ≠ 0) in a creature's slot band. */
const liveSlots = (slots: ReadonlyArray<{ color: number }>): number =>
  slots.reduce((n, s) => (s.color !== 0 ? n + 1 : n), 0)

/** MUSH+2 — the count of full mushrooms near the TOP of the field (rows ≥
 *  TOP_MIN). The ROM keeps a running MUSH register (musher INC / mushdc DEC);
 *  this port recomputes the same quantity from the field each frame (ml7-8). */
function countTopMushrooms(field: Uint8Array): number {
  let n = 0
  for (let addr = 0; addr < field.length; addr++) {
    if ((field[addr] & 0x7f) === FULL_MUSHROOM && (addr & 0x1f) >= TOP_MIN) n++
  }
  return n
}

/** Each creature's roster band and its PRESENCE-voice root (ml7-8): the sim
 *  edge-signals `${root}-start` on the vacant→live edge and `${root}-stop` on
 *  the live→vacant edge, one sustained voice per creature on its own CHAN slot. */
const PRESENCE_VOICES: ReadonlyArray<readonly [keyof Roster, string]> = [
  ['spiders', 'spider'],
  ['bees', 'bee'],
  ['beetles', 'beetle'],
  ['dragonflies', 'dragonfly'],
  ['mosquitoes', 'mosquito'],
  ['earwigs', 'earwig'],
  ['inchworms', 'inchworm'],
]

export function stepGame(state: GameState, input: GameInput): GameState {
  switch (state.phase) {
    case 'attract':
      return stepAttract(state, input)
    case 'play':
      return stepPlay(state, input)
    case 'death':
      return stepDeath(state)
    case 'game-over':
      return stepGameOver(state)
    case 'entry':
      return { ...state, frame: state.frame + 1, events: [] }
  }
}

/** Attract: the train self-plays over the field, silent, until start. */
function stepAttract(state: GameState, input: GameInput): GameState {
  const phase = advancePhase('attract', { startRequested: input.start })
  let segments = stepMillipede(state.segments, state.frame, state.field)
  if (segments.some((s) => isLive(s) && s.v < 0x08)) {
    segments = state.segments // (respawn handled by createMillipede in a later pass)
  }
  if (phase === 'play') {
    // Begin a NEW game: rebuild a clean starting world from the seed — the
    // millipede enters from the top, the player spawns at the bottom, a fresh
    // field. (Keeping the sunk attract train would kill the player instantly.)
    // The live ladder (a persisted board loaded on boot) is PRESERVED across the
    // rebuild — createGame reseeds DEFAULT (ml10-2, the mc highScores carry-over).
    return { ...createGame(state.seed, { phase: 'play' }), highScores: state.highScores, events: [] }
  }
  return { ...state, phase, frame: state.frame + 1, segments, events: [] }
}

function stepPlay(state: GameState, input: GameInput): GameState {
  const events: GameEvent[] = []

  // 1. Player move. MOVE consults OBSTAC with LDY I,0 at each candidate cell
  //    (MILLI.MAC:1662-1668 horizontal, :1694-1700 vertical): any nonzero stamp
  //    there blocks the step, so the ship cannot walk through a mushroom/rock.
  const blocked = (h: number, v: number): boolean =>
    obstacleAt(state.field, obstacOffset(h, v, 0)) !== 0
  const player = stepPlayer(state.player, { dh: input.dh, dv: input.dv, fire: input.fire }, blocked)

  // 2. Shot: spawn on fire (single shot at a time).
  let shot: Shot = state.shot
  if (!shot.active && input.fire) {
    shot = { active: true, h: player.h, v: player.v }
    events.push(event('shot-fired'))
  }

  // 3. Shot hits at its CURRENT position (before climbing). SHOOT1 resolves the
  //    PLAYFIELD first — a DDT bomb or a mushroom in the shot's cell (shot.ts) —
  //    then, if the shot passed through, the millipede segments.
  let segments = state.segments
  let score = state.score
  // MUSH bumps from mushrooms a kill plants this frame (MUSHER INC MUSH); folded into
  // the running tally below alongside the DDT-explosion deltas (ml13-1).
  const killMush: MushCounts = { lower: 0, top: 0 }
  // HITDDT (MLDEF.MAC:373) — a persistent flag; carry the prior value forward and
  // set/clear it at the ROM's sites this frame (SC-9, suppresses the scroll arm below).
  let hitDdt = state.hitDdt
  if (shot.active) {
    const field = resolveShot(state.ddt, state.field, shot.h, shot.v)
    if (field.kind === 'ddt') {
      score += field.points // +80 (DDT_HIT_POINTS)
      shot = { active: false, h: 0, v: 0 }
      hitDdt = true // INC HITDDT — the shot detonated a bomb (MILLI.MAC:2060, DD-213)
      events.push(event('ddt-exploded'))
    } else if (field.kind === 'mushroom') {
      score += field.points // +1 only on a destroying chip
      shot = { active: false, h: 0, v: 0 }
      events.push(event('mushroom-hit'))
    } else if (field.kind === 'stop') {
      shot = { active: false, h: 0, v: 0 } // a letter/ROCK stops the shot, no score
    }
  }
  if (shot.active) {
    const hit = segments.findIndex((s) => isLive(s) && checkPlayerCollision(s, { h: shot.h, v: shot.v }))
    if (hit >= 0) {
      const dead = segments[hit]
      segments = segments.filter((_, i) => i !== hit)
      // Head vs body: a body is colour >= $3D (MILLI.MAC:2167-2170 CMP I,3D / BCS
      // 145$); a head (0x39) or poisoned head (0x1B) is below it and LSR×4's to the
      // 100s (:2171-2175). Same split as the DDT-kill path (step 8b), base not tripled.
      score += dead.color >= BODY_COLOR ? SEGMENT_BODY_PTS : SEGMENT_HEAD_PTS
      // MUSHER — a kill leaves a mushroom at OBSTA0's cell (SHOOT2 142$ :2155-2157
      // JSR OBSTA0/JSR MUSHER). OBSTA0 (MLSUB.MAC:834-839) derives dir from the
      // segment's own MOBJDH sign and OBSTAC adds 8*dir (:860-863 TYA/ASL×3), so the
      // target is the cell 8px AHEAD in travel — same derivation as obstac() (mushroom.ts:186).
      // musher() no-ops on a non-empty/excluded cell, else stamps a full mushroom +
      // bumps MUSH. (The DDT path shares this tail — see step 8b.)
      musher(state.field, obstacOffset(dead.h, dead.v, dead.dh < 0 ? -1 : 1), killMush)
      shot = { active: false, h: 0, v: 0 }
      events.push(event('segment-killed'))
    }
  }

  // 4. Step the enemy roster (spawn/move/plant/player-contact), then resolve the
  //    shot against it. The view shares state.field/state.rng so the pure
  //    subsystems plant mushrooms and draw randomness deterministically.
  //    The secondary ROM inputs (ml7-8) ride on the view: SCORE1, DEAD (=
  //    remaining segments), the SLOW critter-freeze timer, the MUSH+2 top tally
  //    and the active-beetle count, all from real state instead of ml7-2 zeros.
  const liveSegments = state.segments.filter(isLive).length
  const view: EnemyView = {
    frame: state.frame,
    score2: score2Of(state.score),
    player: { h: player.h, v: player.v, alive: player.alive },
    // CENTIN — the walked WAVE-LENGTH register (state.centin), NOT the live count.
    // The ROM creature gates read `X,CENTIN`: the beetle's "NO BEETLES WHEN CENTIPEDE
    // IS FULL" gate is `CMP I,12.` / `BCS` (CENTIN>=12, MILLI.MAC:265-266, BT-12); the
    // bee (BE-7), dragonfly (DF-9) and mosquito (MQ-7) gates read it too. DEAD (the
    // live count, `LDA X,DEAD`/`BEQ` :262-263) is a SEPARATE gate, threaded below.
    centin: state.centin,
    hard: false,
    score1: score1Of(state.score),
    dead: liveSegments, // DEAD = remaining live centipede segments (MLDEF.MAC:295)
    slow: state.slow,
    mushTop: countTopMushrooms(state.field),
    mush: state.mushCounts.lower, // MUSH[0] — near-bottom tally the bee gate reads (BE-8/9)
    beetles: liveSlots(state.roster.beetles),
    rng: state.rng,
    field: state.field,
  }
  // Snapshot each creature's live-state BEFORE stepRoster — the reducers mutate
  // the slot arrays IN PLACE and return the same references, so state.roster and
  // the stepped roster alias; the presence edges must compare against this.
  const presenceBefore = PRESENCE_VOICES.map(([key]) => liveSlots(state.roster[key]) > 0)
  const stepped = stepRoster(state.roster, view)
  let roster = stepped.roster
  // SCROLC sources accumulate here through the frame; SCROLL consumes them below.
  let scrollQueued = 0
  // A live inchworm count BEFORE the shot resolves — a drop across shootRoster
  // is a SHOT kill (an offscreen exit already happened in stepRoster), which is
  // what arms SLOW (IW-34/37); an exit does not.
  const inchwormsAfterStep = liveSlots(roster.inchworms)
  if (shot.active) {
    const rs = shootRoster(roster, { h: shot.h, v: shot.v })
    if (rs.killed) {
      roster = rs.roster
      score += rs.scoreDelta
      shot = { active: false, h: 0, v: 0 }
      scrollQueued += rs.scroll // beetle DEC / mosquito INC (MILLI.MAC:2090/:2127)
      events.push(event('enemy-killed'))
    }
  }
  const inchwormShotKilled = liveSlots(roster.inchworms) < inchwormsAfterStep

  // Presence voices (ml7-8): edge-signal every creature that appeared or left
  // the field this frame — comparing the pre-step snapshot to the final roster
  // (post-step, post-shot).
  PRESENCE_VOICES.forEach(([key, root], i) => {
    const now = liveSlots(roster[key]) > 0
    if (!presenceBefore[i] && now) events.push(event(`${root}-start` as GameEventKind))
    if (presenceBefore[i] && !now) events.push(event(`${root}-stop` as GameEventKind))
  })

  // SLOW: an inchworm kill sets the critter-freeze timer to 0xE0; otherwise it
  // counts down one per frame (0 = not slowed).
  const slow = inchwormShotKilled ? INCHWORM_SLOW : Math.max(0, state.slow - 1)

  // 5. Surviving shot climbs; expire past the top of the field.
  if (shot.active) {
    const v = shot.v + SHOT_SPEED
    shot = v >= SHOT_MAX_V ? { active: false, h: 0, v: 0 } : { ...shot, v }
  }

  // 6. DDT — animate any exploding bombs' clouds (FRAME & 7 gated inside).
  //    Mutates state.field in place, as the ROM draws into playfield RAM. Its mush
  //    deltas feed the MushCounts threading, folded into the scroll block below.
  const ddtBoom = ddtExplosionStep(state.ddt, state.field, state.frame)

  // 7. Player death — a segment or any enemy touching the player this frame.
  let lives = state.lives
  let alive = player.alive
  let playerDied = false
  const touchedBySegment = segments.some((s) => isLive(s) && checkPlayerCollision(s, player))
  if (alive && (touchedBySegment || stepped.playerHit)) {
    alive = false
    playerDied = true
    lives -= 1
    hitDdt = true // INC HITDDT — a player-collision death (MILLI.MAC:1805, PLAY routine)
    events.push(event('player-died'))
  }

  // 8. March the surviving segments.
  segments = stepMillipede(segments, state.frame, state.field)

  // 8b. DDT cloud kill (MOTION, MILLI.MAC:1611-1614). After a segment has moved,
  //     the ROM reads the cell it now OCCUPIES — OBSTAC with Y=0 (DD-219), NOT the
  //     cell-ahead the turn check reads (:1527 OBSTA0) — and DDTEXP destroys it
  //     when that stamp is a cloud in [CLOUD, DDT) (DD-220/221). A destroyed
  //     segment neither turns nor hurts the player (:1614 BCS 30$ skips both).
  //     Removal + segment-killed cue mirror a shot kill, but the SCORE does NOT:
  //     DDTEX1's $80 flag (DD-217) is always set for a cloud kill, so SHOOT2 142$
  //     scores the premium — body 30, head 300 (DD-223/224), tripled from the
  //     base 10/100. Read post-march, before the wave-clear check below.
  if (segments.some(isLive)) {
    const survivors: Segment[] = []
    for (const s of segments) {
      if (isLive(s) && inDdtCloud(obstacleAt(state.field, obstacOffset(s.h, s.v, 0)))) {
        // Head vs body: a body is colour >= $3D (MILLI.MAC:2168 CMP I,3D / BCS 145$);
        // a head (0x39) or poisoned head (0x1B) is below it and scores in the 100s.
        score += s.color >= BODY_COLOR ? DDT_KILL_BODY_PTS : DDT_KILL_HEAD_PTS
        // MUSHER — a DDT kill runs the SAME SHOOT2 142$ tail as a shot kill (DDTEX1
        // :1946 → JSR SHOOT2 :1949), so it also plants at OBSTA0's cell: the cell 8px
        // AHEAD in travel (dir = sign(dh)), NOT the occupied cloud cell the kill read above.
        // If that ahead-cell is empty, a mushroom is left there (musher no-ops otherwise).
        musher(state.field, obstacOffset(s.h, s.v, s.dh < 0 ? -1 : 1), killMush)
        events.push(event('segment-killed'))
        continue // OBJECT DESTROYED — dropped from the roster
      }
      survivors.push(s)
    }
    segments = survivors
  }

  // 9. Wave loop (MILLI.MAC:1912-1915 clear→arm, CHKEND countdown, next wave).
  //    A cleared millipede with no DELAY pending WINS the wave: arm WAVE_DELAY.
  //    CHKEND then counts it down, holding while beetles are still present
  //    (MLSUB.MAC:56) or while the conway mushroom-restoration is still running
  //    (MLSUB.MAC:54, wired below from conway.active — ml10-3). When DELAY
  //    reaches 0 a fresh train marches in.
  let wave = state.wave
  let delay = state.delay
  let conway = state.conway
  let centis = state.centis // CENTIS — the speed register (walked at restart below)
  let centin = state.centin // CENTIN — the wave-length register (walked at restart below)
  let nocent = state.nocent
  let bombv = state.bombv
  const millipedeCleared = !segments.some(isLive)
  let justArmed = false
  if (millipedeCleared && delay === 0) {
    delay = WAVE_DELAY // arm the inter-wave pause (edge: DELAY was idle)
    justArmed = true // don't count down the frame we armed it (the arm and CHKEND share a frame)
    centis += 1 // INC CENTIS — "FASTER" (MILLI.MAC:1906, WP-2)
    // The wave-event gates fire ONLY on the clear where CENTIS has just reached 3
    // (MILLI.MAC:1908, WP-3), and read the CURRENT wave-length register (before the
    // next CENTPC walk decrements it).
    if (centis === 3) {
      if (centin === 9) {
        conway = initConway() // CENTIN==9 → INICON: start CONWAY (MILLI.MAC:1911-1914, WP-4/5/6)
      } else {
        const budget = bombModeStart(centin, score2Of(score)) // CENTIN∈BOMBSL arms bomb mode (DD-97/98)
        if (budget !== null) {
          nocent = budget // NOCENT budget (MILLI.MAC:1922, DD-99)
          bombv += 1 // INC BOMBV — begin scoring the bomb wave (MILLI.MAC:1923, DD-100)
        }
      }
    }
  }
  // SCROLL (MILLI.MAC:46) reads CDONE *before* MASTER (:49) runs, and masterStep
  // can complete the metamorphosis and clear `active` within one call (conway.ts,
  // "TIMER RAN OUT, END CONWAY"). So the scroll gate must see CDONE as it stood
  // BEFORE this frame's MASTER — snapshot it here, or a scroll would unlock one
  // frame early on the completion frame (SC-6).
  const conwayActiveForScroll = conway.active
  // MASTER runs every frame while CONWAY is active (MILLI.MAC:47-49), a background
  // process that grows/kills mushrooms in place; a no-op while idle. CONWAY is now
  // started only on the CENTIN==9 wave clear (the arm branch above, WP-4/5/6), matching
  // the ROM (MILLI.MAC:1911-1914) — no longer seeded on every clear.
  conway = masterStep(state.field, conway)
  const beetlesPresent = roster.beetles.some((b) => b.color !== 0)
  // The frame that arms WAVE_DELAY does not also count it down — CHKEND begins on the
  // next frame. (Before pt1-2 the conway-every-clear hold masked this; with CONWAY now
  // gated to CENTIN==9 the guard is explicit so a plain clear still reads WAVE_DELAY.)
  const chkend = justArmed
    ? { delay, waveReady: false }
    : stepWaveDelay(delay, {
    // mushroomsRestoring — CHKEND's first blocker (MLSUB.MAC:54 is `LDA MEM+1`,
    // the RESTOR sweep pointer, MLDEF.MAC:344), NOT the conway CDONE flag. The
    // real MEM+1/RESTOR sweep is unwired in this sim (restor() in mushroom.ts has
    // no caller), so we APPROXIMATE "mushrooms still restoring" with conway.active
    // — the between-wave growth/death process (CDONE, CW-8) — per the story's
    // directive to compute the blocker from the real conway state. Caveat: the ROM
    // windows differ — RESTOR runs only once CDONE goes idle (restor() gates on
    // cdone===0), so this proxy holds the wave DURING conway rather than after it.
    // Read post-masterStep, so a conway that completed THIS frame no longer holds.
    mushroomsRestoring: conway.active,
    playerExploding: playerDied || state.deathTimer > 0,
    beetlesPresent,
  })
  delay = chkend.delay
  if (chkend.waveReady) {
    // CENTPC (MILLI.MAC:504-519): the per-wave length/speed walk. Once CENTIS has
    // reached 3 it DECs the wave-length register (reloading 0x0C at 0) and resets
    // CENTIS to SLOW(1) below 20,000 or FAST(2) at/after (MT-14/15/16); below 3 it is
    // a no-op. The re-laid train marches at the walked length and speed — this is the
    // difficulty ramp (pt1-2), which used to re-lay a constant full-length FAST train.
    const walk = stepWaveCadence(centin, centis, score2Of(score))
    centin = walk.centin
    centis = walk.centis
    // looseHeads:false — a flat connected train (the ROM's loose-head refill rides with
    // the deferred split, ml3-2), matching the death re-lay; a shortened train needs it.
    segments = createMillipede({ headingSign: 1, centin, centis, looseHeads: false })
    scrollQueued -= 1 // CENTPC re-lays the train and scrolls DOWN (MILLI.MAC:503)
    ddtPlace(state.ddt, false)
    ddtRestore(state.ddt, state.field)
    hitDdt = false // CLEAR HITDDT when the new wave starts (CENTPC, MILLI.MAC:508)
    wave += 1
  }

  // 9b. SCROLL (MILLI.MAC:46) — consume SCROLC and dispatch the field scroll.
  //     Runs after every SCROLC source this frame (the continuous arm inside
  //     scrollDispatch, the beetle/mosquito kills, the CENTPC re-lay). The
  //     conwayActive gate is snapshotted PRE-masterStep above (see there for the
  //     one-frame ordering hazard); the field ordering vs masterStep IS immaterial
  //     because SCROLL gates OFF exactly when CONWAY is active, and masterStep is a
  //     no-op otherwise.
  let scrolc = state.scrolc + scrollQueued
  // Death STAs SCROLC before SCROLL would run (MILLI.MAC:1812 "STOP ANY EXISTING
  // SCROLLING") — a pending scroll is cancelled, not carried into the animation.
  if (playerDied) scrolc = 0
  let mushLower = state.mushCounts.lower + ddtBoom.mush + killMush.lower
  let mushTop = state.mushCounts.top + ddtBoom.mushTop + killMush.top
  const liveSegs = segments.filter(isLive).length
  const scrollGate: ScrollGate = {
    attract: false, // MODE bit 7 is clear in play (SC-5)
    conwayActive: conwayActiveForScroll, // CDONE, pre-masterStep — waits for metamorphosis (SC-6)
    ddtExploding: anyDdtExploding(state.ddt), // OR of the bomb hi bytes (SC-7)
    playerDead: !alive, // PLAYP/PEXPLD (SC-8)
    // HITDDT (SC-9) suppresses the continuous arm. The ROM sets it at TWO sites —
    // a shot detonating a bomb (:2060) and a player-collision death (:1805) — and
    // clears it at wave start (:508); all three are wired above (ml7-12), so this
    // reads the register as it stands AFTER this frame's set/clear, matching the
    // ROM's INC-before-SCROLL order (:29/:1805 then :46). The death path's SCROLC=0
    // cancel (:1812) is still reproduced above and is orthogonal to this flag.
    hitDdt,
    segmentsRemaining: liveSegs, // DEAD (SC-2/10)
    centin, // CENTIN (SC-3/11) — the walked wave-length register the continuous arm's ==4 gate reads
    frame: state.frame, // the arm's 128-frame phase input (SC-13)
  }
  const disp = scrollDispatch(scrolc, scrollGate)
  scrolc = disp.scrolc // post-arm counter
  if (disp.action === 'down') {
    const d = scrollDown(state.field, scrolc, state.rng)
    scrolc = d.scrolc
    mushLower += d.mush
    mushTop += d.mushTop
    // The SCROLD DDT half (SC-49): step the bomb bank down and seed a top-row bomb.
    const dd = ddtScrollDown(state.ddt, state.field, nextInt(state.rng, 0x100), nextInt(state.rng, 0x100))
    mushTop += dd.mushTop
  } else if (disp.action === 'up') {
    const u = scrollUp(state.field, scrolc)
    scrolc = u.scrolc
    mushLower += u.mush
    mushTop += u.mushTop
    ddtScrollUp(state.ddt) // the SCROLU DDT half (SC-50): step the bank up, no seeding
  }

  // 9c. BOMBS (MILLI.MAC:28, WP-7) — the per-frame dive-bomb dispatcher. A no-op unless
  //     a bomb wave is armed (NOCENT>0). On the RND0&7 gate (DD-77) it picks a
  //     bee/dragonfly/mosquito by the wave-length register (the 90$ table, DD-82..92),
  //     enters it into a free flier slot (BEEMV3/FLYMV3/MOSQT3) and DECs the budget.
  if (nocent > 0) {
    const anyFlierFree =
      roster.bees[0].color === 0 ||
      roster.dragonflies[0].color === 0 ||
      roster.mosquitoes[0].color === 0
    const beec = new Array<number>(BOMBS_SLOTS).fill(anyFlierFree ? 0 : 1) // ≥1 free slot ⇔ has a 0
    const decision = bombs({
      nocent,
      specialAttract: false, // MODE bit 7 clear in play (DD-76)
      rnd0: nextInt(state.rng, 0x100), // the RND0&7 entry gate (DD-77)
      rndPick: nextInt(state.rng, 0x100), // the second RND0 read, the creature pick (DD-88)
      centin,
      beec,
    })
    if (decision.kind === 'enter') {
      const entered = enterBombFlier(decision.critter, roster, {
        frame: state.frame,
        score2: score2Of(score),
        playerAlive: alive,
        slow,
        dead: liveSegs,
        beetles: roster.beetles.filter((b) => b.color !== 0).length,
        mush: mushLower,
        mushTop,
        centin,
        rnd0: nextInt(state.rng, 0x100),
        rnd1: nextInt(state.rng, 0x100),
      })
      if (entered) nocent -= 1 // DEC NOCENT after a successful entry (MILLI.MAC:472/483/487)
    }
  }

  // 10. Bonus life — the SCORNG tail (bonus.ts awardBonus), run once per frame
  //     the score advanced (the ROM runs it after every award). The band
  //     comparator fires inside the [threshold, +9,999] window, adds a life
  //     (capped at 6) and advances the threshold so it never re-fires.
  let { bonusL, bonusM } = state
  if (score > state.score) {
    const b = awardBonus({
      score1: score1Of(score),
      score2: score2Of(score),
      bonusL,
      bonusM,
      lives,
      optns1: state.optns1,
    })
    bonusL = b.bonusL
    bonusM = b.bonusM
    if (b.awarded) {
      lives = b.lives
      events.push(event('bonus-life'))
    }
  }

  // 11. Phase transition. Losing the last life goes straight to game-over; arm
  //     the "GAME OVER" hold (MLSUB.MAC:161-162) so it times out to attract.
  const signals: PhaseSignals = { playerDied, livesRemaining: lives }
  const phase = advancePhase('play', signals)
  if (phase === 'game-over') delay = GAME_OVER_DELAY

  // 12. March loop edges — start/stop the feet voice on the audible transition.
  //     A fresh wave's train marching in is a start edge, so this also voices
  //     the wave transition (no separate wave-clear cue in the ROM's CHAN set).
  const wasMarching = state.phase === 'play' && state.segments.some(isLive)
  const nowMarching = phase === 'play' && segments.some(isLive)
  if (nowMarching && !wasMarching) events.push(event('march-start'))
  if (!nowMarching && wasMarching) events.push(event('march-stop'))

  // LCOLOR gate (MLIRQ.MAC:248-256): a change in the connected length arms the
  // recolour; recolourField latches the field colour index to the new CENTIN and
  // clears the flag. A steady length holds the previous colour (ml7-4 no-strobe).
  // The colour latch follows the LIVE connected length (the millipede shortening as
  // segments die), independent of the CENTIN wave-length register (which now walks
  // across waves, pt1-2). Arm when the live length differs from the currently-coloured
  // band and latch to it — idempotent once caught up (ml11-1 no-strobe).
  const liveLen = liveSegs === 0 ? NCENT : liveSegs
  const armed = state.lcolor || liveLen !== state.fieldColourIndex
  const recol = recolourField(state.fieldColourIndex, liveLen, armed)

  return {
    ...state,
    phase,
    frame: state.frame + 1,
    player: { ...player, alive },
    shot,
    segments,
    roster,
    score,
    lives,
    wave,
    delay,
    conway,
    centis, // CENTIS speed register — INC on clear, reset by the CENTPC walk (pt1-2)
    nocent, // NOCENT bomb-mode budget — armed on a BOMBSL clear, drained by BOMBS
    bombv, // BOMBV bomb-mode scoring flag
    bonusL,
    bonusM,
    scrolc,
    hitDdt,
    mushCounts: { lower: mushLower, top: mushTop },
    slow,
    centin, // CENTIN wave-length register — walked by CENTPC, never per-death (pt1-2)
    fieldColourIndex: recol.fieldColourIndex,
    lcolor: recol.lcolor,
    deathTimer: playerDied ? DEATH_HOLD : state.deathTimer,
    events,
  }
}

/**
 * Game-over: hold the "GAME OVER" message (the ROM's DELAY countdown). A score
 * that earns a rung on the ladder routes to name entry ('entry'); otherwise the
 * attract-return timeout returns to a fresh attract world (ml10-2 wires the route
 * the ml5 highscore module was built for). scoreQualifies takes precedence over the
 * timeout on the same frame (advancePhase), so a qualifying player is never skipped.
 */
function stepGameOver(state: GameState): GameState {
  const delay = Math.max(0, state.delay - 1)
  const scoreQualifies = qualifiesForHighScore(state.highScores, state.score)
  const phase = advancePhase('game-over', { scoreQualifies, overExpired: delay === 0 })
  if (phase === 'attract') {
    // Rebuild a clean attract world from the seed (fresh score/lives/field), but
    // PRESERVE the live ladder across the rebuild (ml10-2 — createGame reseeds DEFAULT).
    return { ...createGame(state.seed), highScores: state.highScores, events: [] }
  }
  // 'game-over' (still holding) or 'entry' (qualifying): freeze with the clock. The
  // entry buffer is already empty (nothing types during play), ready for name entry.
  return { ...state, phase, frame: state.frame + 1, delay, events: [] }
}

/**
 * Death: hold the explosion animation, then respawn to play. Silent hold.
 *
 * On respawn the screen is RESET, matching the ROM's CHKEND death branch
 * (MLSUB.MAC:157-234): INIT1 puts the gun and shot back at spawn, then CENTPC
 * re-lays the millipede from the entry row. Without this the creature that
 * killed the gun stays frozen on the spawn cell through the hold and kills the
 * next life the instant play resumes, burning every life to game-over. The
 * roster is parked too (the sibling centipede re-runs BUGOFF/ANTPC on respawn).
 * The field, score, lives and wave carry through untouched — a death is not a
 * new wave.
 */
function stepDeath(state: GameState): GameState {
  const deathTimer = Math.max(0, state.deathTimer - 1)
  const phase = advancePhase('death', { deathExpired: deathTimer === 0 })
  if (phase !== 'play') {
    return { ...state, phase, frame: state.frame + 1, deathTimer, events: [] }
  }
  return {
    ...state,
    phase,
    frame: state.frame + 1,
    deathTimer,
    player: createPlayer(), // INIT1 — gun back at spawn, alive
    shot: { active: false, h: 0, v: 0 }, // INIT1 — no shot in flight
    // CENTPC — re-lay from the entry row at the PRESERVED connected length
    // (MILLI.MAC:549 "LDY X,CENTIN"), not a fresh full train. looseHeads:false:
    // the ROM's loose-head refill rides with the deferred split (ml3-2), so the
    // re-lay stays a flat connected train like the rest of the sim.
    segments: createMillipede({ headingSign: 1, centin: state.centin, looseHeads: false }),
    roster: initRoster(), // creatures parked (BUGOFF/ANTPC)
    events: [],
  }
}
