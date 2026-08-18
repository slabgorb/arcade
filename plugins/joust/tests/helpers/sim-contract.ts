// tests/helpers/sim-contract.ts
//
// Story jt2-7 — the CONTRACT for the wave-1 DEMO wiring, TEA-authored (Leeloo).
// Same split the epic has used since jt1-2: TEA states the module shape and the
// laws that pin it; Dev (Julia) writes the module. The behaviour lives in
// tests/demo.test.ts; the source-wiring + count floors in tests/demo-source.test.ts.
//
// ─── THIS IS THE INTEGRATION STORY, NOT A NEW ROM LAW ────────────────────────
// jt2-1..jt2-6 landed the pure cores: the scheduler (frame.ts), the enemy brain +
// budget (enemy.ts), the joust resolution (joust.ts), the egg laws (egg.ts), the
// wave machine (wave.ts) and the transporter/spawn service (transporter.ts). This
// story WIRES them into a playable wave-1 slice the shell can draw. The red suite
// pins the WIRING — that the demo loop and the sim are ONE thing that cannot
// diverge — not new transcribed constants. Every constant it leans on is already
// gated by an earlier story's citations suite; nothing here adds a claim.
//
// ─── THE SEAM: src/core/sim.ts (PURE) ───────────────────────────────────────
// The wiring assembles wave 1 and drives it deterministically, with NO browser
// surface, NO clock and NO ambient entropy — it is CORE (the jt1-7 purity scanner
// sweeps it the moment it lands). main.ts becomes a thin shell: it seeds the demo
// with a shell-owned seed, steps it once per video frame through the shell
// timebase, and RENDERS the resulting process list through the atlas path. Because
// the demo IS the sim, "the demo and the sim must not diverge" (the jt2-1 carried
// seam) is structural rather than a discipline someone must remember.
//
// The routing≠geometry lesson (MEMORY): a source-wiring test that only proves
// `stepFrame` is IMPORTED lets a demo that assembles the wrong sim ship green.
// tests/demo.test.ts pins ACTUAL sim DATA — the player's own coordinates coming
// out of the demo must equal a solo scheduler run of the identical process — so a
// forked/divergent stepping path fails loudly.

import type { PlayerInput, EntityState } from './flight-contract.js'
import type { TrollGrip } from './troll-contract.js'
import type { ProcessClass } from './scheduler-contract.js'
import type { IntelBudget, EnemyState } from './enemy-contract.js'
import type { EggState, EggVictim, RemountEntry } from './egg-contract.js'
import type { JoustEntity, JoustOutcome, EnemyType, Facing } from './joust-collision-contract.js'
import type { ArenaState } from './arena-state-contract.js'

export type {
  PlayerInput,
  EntityState,
  IntelBudget,
  EnemyState,
  EggState,
  EggVictim,
  RemountEntry,
  JoustEntity,
  JoustOutcome,
  EnemyType,
  Facing,
  ArenaState,
  TrollGrip,
}

// ─── The sim, as the demo carries it ─────────────────────────────────────────
//
// A superset of the jt2-1 scheduler `Process`: the same tagged-union list, now
// with the egg variant this story lands (`kind: 'egg'`, carrying an `EggState`)
// and the enemy's TYPE (a wave-1 complement is three bounders — the type the
// joust's `killScore` reads). Every field is data; behaviour dispatches on `kind`.

export interface SimProcess {
  /** `PID` — unique, non-zero. */
  id: number
  /** `PPRI` — primary steps before secondary. */
  cls: ProcessClass
  /** `PNAP` — frames until the next wake (>= 1). */
  nap: number
  /** Re-nap applied on each wake. For an enemy this is the EMYTIM divider. */
  period: number
  /** Tagged-union discriminant. */
  kind: 'player' | 'enemy' | 'egg' | string
  /** A `kind: 'player'` process carries its flight/ground state here. */
  entity?: EntityState
  /** A `kind: 'enemy'` process carries its mind + flight state here (jt2-2). */
  enemy?: EnemyState
  /** A `kind: 'egg'` process carries its egg state here (this story's variant). */
  egg?: EggState
  /**
   * The enemy's DVALUE type — a wave row's bounders/hunters/lords. The joust's
   * `killScore` reads it; without it a killed bounder scores 0.
   */
  enemyType?: EnemyType
  /**
   * The PID $80 collision bit: false while a materialisation window is active
   * (the transporter's ABORT law, jt2-6), true once it exits. A materialising
   * enemy cannot be jousted.
   */
  collisionEnabled?: boolean
  /**
   * jt13-2 — the TREFF warp-in animation, while the arrival grows in on its pad.
   * Seeded on both spawn paths, surfaced by drawList as a `kind:'warpin'` op until
   * `done`. The mirror of `src/core/warpin.ts`'s WarpInState.
   */
  warpIn?: { frame: number; nap: number; done: boolean }
  /**
   * jt13-9 — the TREFF phase-2 idle colour-cycle. Opened when `warpIn.done` fires
   * (the grow-in ends) and advanced each frame until the arrival flaps or the phase
   * times out (PFEET → 0). The mirror of the IdleCycleState in `src/core/warpin.ts`.
   */
  idleCycle?: { owner: 'player' | 'enemy'; colourIndex: number; step: number; speed: number; windowNaps: number; end: 'active' | 'moved' | 'timed-out' }
  /** `PFACE` for a player — the demo's home for player facing (Finding #2). */
  facing?: Facing
  /**
   * A player's MOUNT (round 2): P1 rides an ostrich, P2 a stork — from
   * `PLAYER1_SPAWN.mount`/`PLAYER2_SPAWN.mount`. The render draws the mount UNDER
   * the rider; without this the player sprite is a rider with no bird.
   */
  mount?: 'ostrich' | 'stork'
  /**
   * jt4-5 — a WAVEGG egg-wave complement egg (a settled pad egg, not a DEATH3
   * kill-egg). The egg-wave SELF-CLEAR hatch→remount keys on this, so only wave
   * eggs mature into remount buzzards. Mirrored into the contract by jt8-4, whose
   * catch pass must NOT let a collected wave egg also hatch (the AUTOFF branch,
   * JOUSTRV4.SRC:3078-3087).
   */
  waveEgg?: boolean
  /**
   * `DEGGS` — the catching player's egg-hit count, which indexes the EGGVAL ladder
   * (jt8-4). It rides the PLAYER because that is where the ROM keeps it: EGGSCR
   * reaches it through `PDECSN,U` (the catcher's decision area) and writes the
   * bumped value back with `EGGSMN STB ,Y` (JOUSTRV4.SRC:3033-3053, declared :113).
   * Absent === rung 1, exactly as `collisionPass` reads it (`self.eggHits ?? 0`).
   *
   * LIFETIME (jt8-6) — the count climbs only WITHIN one life of one wave. `DEGGS`
   * is a POINTER (`LDY DEGGS,Y` then `LDB ,Y`) into the fixed per-player cells
   * EGGS1/EGGS2 that P1DEC/P2DEC bind it to (:5551, :5555), and those cells are
   * cleared in exactly three places: game start (:907, :912), EVERY wave start
   * (`WNRM`, :1979-1980) and the player's own death-wish routine (`DEATH1`/`DEATH2`,
   * :4669/:4675, dispatched on the LOSER's decision at :5074 and :6564). EGGSCR
   * itself never resets it, which is a fact about EGGSCR and NOT about the
   * counter — reasoning from the one to the other is what misfiled jt8-6.
   */
  eggHits?: number
  /**
   * jt9-11 — a `kind: 'troll'` lava troll's VICTIM BINDING: the `id` of the bird it
   * is grabbing. This is PJOY's third meaning (the "FINGER PRINT THIS PROCESS FOR
   * THE LAVA TROLL" — `STU PJOY,Y`, JOUSTRV4.SRC:6781, read back at `LAVVI2 CMPY
   * PJOY,U` :1712), the address LNDB7 stamps on the troll from the bird that landed
   * in its zone. Absent until a troll is spawned; the whole grip has nowhere to
   * attach without it.
   */
  victimId?: number
  /**
   * jt9-11 — a `kind: 'troll'` troll's escalating GRIP, seeded by `troll.beginGrip`
   * (PATCH1: CLVGRA = the wave's LAVGRA, LAVKLL = 30*60) the frame the hand reaches
   * the victim and the grab COMMITS. Absent while the hand is still rising/tracking;
   * present === the victim's gravity is now ADDLAV (`troll.stepGrip`), not normal.
   */
  grip?: TrollGrip
  /**
   * jt9-11 — set on the VICTIM (a player OR enemy `SimProcess`) to the grabbing
   * troll's `id` once the grab commits (PADGRA→ADDLAV, JOUSTRV4.SRC:1651). While it
   * is present the flight/looker core skips the bird (`runBehaviour`'s short-circuit)
   * so its fall is the troll's single `stepGrip` integration, never grip + GRAV.
   * jt9-42 pins that skip; mirrored here from the production `SimProcess`.
   */
  grippedBy?: number
}

/** The demo's simulation state — the jt2-1 GameState, egg variant live. */
export interface SimCore {
  readonly frame: number
  readonly processes: readonly SimProcess[]
  readonly woke: readonly number[]
  readonly rng: number
  readonly budget: IntelBudget
}

/**
 * A console/dev-overlay event. The epic's SCORING SEAM and TEXT SEAM: the core
 * EMITS score values (DVALUE/EGGVAL) and wave-message beats; BCD accumulation,
 * the score display and font rendering are jt4. So an event carries a value or a
 * message and NOTHING is drawn.
 */
export type SimEvent =
  // `player` attributes the award to the scoring player's id (jt4-1's game.ts
  // drain credits the matching ledger — the co-op independence). Optional so
  // pre-jt4 event literals still typecheck. jt8-4 REQUIRES the catch pass to set
  // it: an egg award with no `player` silently defaults to P1 in the drain
  // (game.ts's `?? PLAYER1_ID`), paying the wrong pilot in co-op.
  | { kind: 'score'; value: number; reason: 'kill' | 'egg'; player?: number }
  | { kind: 'beat'; message: string }

/** The whole demo: the sim, the 1-based wave, and the console/overlay event log. */
export interface SimState {
  sim: SimCore
  /** The 1-based wave number (wave 1 at creation). */
  wave: number
  /** Console/dev-overlay events accumulated so far (kills, egg catches, beats). */
  events: readonly SimEvent[]
  /**
   * jt8-7: the frame's AUDIO cue stream — `stepSim` has returned this since
   * jt5-1 (`sim.ts:274`, built at `:1184` from the frame's and the collision
   * pass's cues) but the contract never mirrored it, so no demo-level test
   * could read a cue without an `any`. Mirrored STRUCTURALLY rather than by
   * importing `GameEvent` from `src/core/events.ts`, to keep the contract an
   * independent second entry (pictures-gate.test.ts).
   */
  cues: readonly { readonly type: string }[]
  /**
   * The mutable per-run arena (jt3-2): which cliffs/bridge are currently gone.
   * `createWaveSim` seeds it from wave 1 and `stepSim` re-applies it on every wave
   * advance (the applyWaveDestruction call-site), so the wave-3 bridge burn flows
   * through here. jt3-3's troll spawn gate READS `arena.bridgeBurned` — the reason
   * this field is no longer write-only (the carried jt3-2 obligation).
   */
  arena: ArenaState
  /**
   * jt11-4: the wave's ground enemies AWAITING SERVICE by the transporter. A wave's
   * complement is no longer spliced into `sim.processes` on one frame — each enemy
   * takes a number (CREEM, JOUSTRV4.SRC:5663-5666) and waits in CRELP (:5667-5676)
   * until it is served, so an unserved enemy sits HERE and is neither drawn nor
   * collidable. Mirrored STRUCTURALLY (`arrival` opaque), on the same second-entry
   * discipline as `cues` above; tests/helpers/wave-entry.ts is the seam that reads it.
   * Optional, so a hand-built contract state need not carry one.
   */
  pendingEnemies?: readonly { arrival: unknown }[]
  /**
   * jt3-3/jt11-18: this wave's lava troll is owed but not yet risen — armed on the
   * wave advance (`trollSpawnable`) and spent on the first frame there is a bird to
   * grab. A LATCH, not a live predicate. Optional, so a hand-built contract state
   * need not carry one (defaults false); a test sets it to isolate the per-contact
   * LNDB7 grab from the once-per-wave CLIF5 pick.
   */
  trollArmed?: boolean
}

/**
 * The result of resolving ONE overlapping pair (the wiring layer over the jt2-3
 * `resolveJoust` law): who remains, the egg a dying enemy leaves, and the score
 * event. This is the wiring the demo runs in its collision pass — it is NOT a new
 * joust rule (that stays in joust.ts), it is what the loop DOES with the outcome.
 */
export interface ContactResult {
  /** The underlying jt2-3 outcome — tied to `resolveJoust`, never re-derived. */
  outcome: JoustOutcome
  /**
   * Which of the two entities survive the contact. A `kill` leaves exactly the
   * WINNER (the loser is removed — not both, not the winner). A `bounce` leaves
   * BOTH. Enemies never kill each other, so an enemy-vs-enemy pair always bounces.
   */
  survivors: readonly ('a' | 'b')[]
  /**
   * The egg a dying ENEMY becomes (DEATH3 → spawnEgg, carrying the victim's
   * velocities). `null` for a bounce or for a player victim (players do not lay
   * eggs). It is a spawned `EggState`, not the raw victim descriptor.
   */
  egg: EggState | null
  /** The score event value (killScore of the victim; 0 on a bounce). */
  score: number
}

/**
 * ONE ordered render operation (round 2). The shell iterates a `drawList` and
 * blits each op; making the ordered list a PURE function is what lets the z-order
 * be pinned by data (routing≠geometry) rather than trusted by eye. `arena` ops are
 * cliff/platform/foreground tiles; `entity` ops are the sprites.
 */
export interface DrawOp {
  /**
   * jt11-5 adds `'fill'`: a SOLID-COLOUR rectangle with no pixel source — the
   * BRIDGE/BRIDG2 lava-shore planks are `$12`-mode DMA fills (`FDB
   * $1200+LIB*$11,0,…` — source word 0, JOUSTRV4.SRC:1126-1127), not pictures,
   * so no atlas block can carry them. The shell paints a `fill` op with
   * `fillRect`, not a blit.
   */
  kind: 'arena' | 'entity' | 'fill' | 'crumble' | 'warpin'
  /** The atlas block (or a foreground tag) this op blits. */
  name: string
  x: number
  y: number
  height?: number
  /** jt11-5 — a `fill` op's width in CRT pixels (the DMA length high byte × 2). */
  width?: number
  /** jt11-5 — a `fill` op's colour PROM nibble (LIB = $8; the byte is LIB*$11). */
  colour?: number
  /**
   * jt11-7 — a `kind:'crumble'` overlay's destructible cliff and CLFDES phase; the
   * shell's `paintCrumble` reads `phase` + the shared `frame` to pick shake vs
   * debris. Undefined on non-crumble ops.
   */
  cliff?: string
  phase?: 'shake' | 'debris'
  /**
   * jt2-9 — the entity's `PFACE` on this op, so the shell can flip the
   * right-facing atlas frame horizontally for a left-facer. The render's
   * SELECTION (including which way the sprite faces) stays pure DATA the shell
   * blits from (routing≠geometry) — a left-moving sprite that draws facing right
   * is a data bug, catchable without a canvas. Absent/undefined on `arena` ops.
   */
  facing?: Facing
  /**
   * jt3-7 — the dissolve op's `DissolveState.frame`; jt11-7 — the crumble op's
   * CLFDES frame index. Shared by both animated op kinds; undefined otherwise.
   */
  frame?: number
  /**
   * jt13-2 — a `kind:'warpin'` op's owner, selecting the DCONST transporter colour
   * (`'p1'` yellow, `'p2'` green, `'enemy'` white). Undefined on non-warpin ops.
   */
  owner?: 'p1' | 'p2' | 'enemy'
}

export interface SimModule {
  /**
   * Assemble wave 1, deterministically under the SHELL's seed:
   *   • the first `playerCount` mounts (default 2) from the transporter spawn
   *     constants (P1 x=100 facing right on an ostrich, P2 x=200 facing left
   *     on a stork) — passing 1 spawns P1 alone (jt11-1); the bare call keeps
   *     the 2P contract;
   *   • the wave-1 enemy complement (the three bounders of WAVE_TABLE row 1)
   *     entered via pads (enterViaPads(count, seed)), each an enemy
   *     process whose `period` is the EMYTIM divider for the wave
   *     (emytimForWave(1) = 2);
   *   • the intelligence budget seeded from wave 1's pursuit nibble
   *     (seedWaveBudget(waveRowAt(1)) → wsmart = 1, nsmart = 0);
   *   • the wave-1 message beats surfaced as `beat` events (the intro).
   * Pure — same seed and count, same SimState.
   */
  createWaveSim(seed: number, playerCount?: number): SimState

  /**
   * Advance the demo exactly one video frame: drive the scheduler (players +
   * enemies + eggs) through `stepFrame`, run the collision pass between entities,
   * fire the 15 s growth cadence (growthDue → growWanted while enemies live),
   * and append any score/beat events. Pure — the argument is never mutated; the
   * returned SimState is new. `inputs` supplies this frame's PlayerInput per
   * process id.
   */
  stepSim(demo: SimState, inputs?: Record<number, PlayerInput>): SimState

  /**
   * One frame of a FALLING egg process (the STEGG/EGGLPA fall loop this story
   * lands): integrate the fall, and on reaching a ledge BOUNCE — but call the
   * jt2-4 `bounceEgg` law ONLY when `velY >= 0` (the `BMI EGGBCK` precondition
   * documented in egg.ts). A still-ASCENDING egg (velY < 0) at a ledge is NOT
   * bounced and NOT settled — the guard the ROM keeps and the pure law cannot.
   * Pure.
   *
   * jt11-5 — the optional `arena` makes the ledge test destruction-aware: the
   * feet-below outcome is `groundOutcomeInState` over the CONDITIONAL mask, so
   * an egg falling onto a burned bridge plank or a destroyed cliff finds no
   * footing and keeps falling. Absent arena = pristine (pre-jt11-5 callers).
   */
  stepEgg(egg: EggState, arena?: ArenaState): EggState

  /**
   * jt9-9 — `12`, the `PCNAP 12` a settled egg's wait loop costs per tick, in
   * display frames (JOUSTRV4.SRC:3227). The wait EGGLND loads is in NAPS, and
   * one nap is spent per `DEC PJOYT,U` (:3236), so a wait of `n` runs `n × 12`
   * frames. This is the unit, and getting it wrong hatches every egg in the game
   * twelve times too early.
   */
  EGG_WAIT_NAP_FRAMES: number

  /**
   * jt9-25 — the display frames the EGGMAN hatch cutscene runs before the remount
   * buzzard flies in: the sum of EGGTBL's per-row naps (7+3+7+67+7+7+7+7 = 112). A
   * matured egg enters the cutscene at its wait-expiry frame and the buzzard appears
   * this many frames later, so any test that observed the old instant remount steps
   * this far past the wait to see it.
   */
  EGG_HATCH_ANIM_FRAMES: number

  /**
   * jt9-9 — a settled egg's hatch wait in DISPLAY FRAMES for a 1-based wave:
   * the DYTBL row times `EGG_WAIT_NAP_FRAMES`. `EGGWT2` is the wait an EGG
   * WAVE's eggs enter holding (:2761); `EGGWT` the one an egg takes when it
   * LANDS (:3224). RAMDEF.SRC:393/:395 is what splits them.
   */
  eggWaitFrames(row: 'EGGWT' | 'EGGWT2', wave: number): number

  /**
   * jt9-9 — the EGGSCR award for an enemy's LAST egg, paid at the moment of the
   * kill (`JSR EGGSCR  SCORE EGG`, JOUSTRV4.SRC:3006 — NOT the :3021 catch site
   * jt8-4 wired). Returns 0 for a null victor: `LDU ,S / BEQ 1$` (:3004-3005)
   * skips the award when nothing killed the enemy, which is the lava death.
   */
  lastEggAward(victor: number | null, hits: number): number

  /**
   * Resolve ONE overlapping pair in the demo's collision pass — the wiring over
   * the jt2-3 `resolveJoust` law. Removes the LOSER (never the winner, never
   * both), leaves an egg where a dying enemy stood, and surfaces the kill score.
   * Enemies never kill each other. Pure.
   */
  resolveContacts(a: JoustEntity, b: JoustEntity): ContactResult

  // ─── Round 2: pure render-SELECTION seams (routing≠geometry) ────────────────
  // The user's live playtest surfaced three render bugs main.ts cannot be unit-
  // tested for (it boots a canvas). So the SELECTION — which transcribed frame,
  // which sprite layers, which draw order — is extracted here as PURE functions
  // that return DATA, and the shell just blits what they return. Pinning the
  // OUTPUT (frame names, layer order) is the routing≠geometry discipline: a
  // render that draws the wrong frame or z-order fails on data, not by eye.

  /**
   * The buzzard-rider frame for an enemy process, from its MOTION:
   *   • airborne (flying) → a WING-FLAP frame (BRFLAP/BRFLOP/BRFLIP);
   *   • on the ground and RUNNING (animPhase 1..4, `PFRAME`) → the RUN frames
   *     BRRUN1..BRRUN4, cycling by the phase — the running animation the user
   *     reported missing;
   *   • on the ground and still (animPhase 0) → BRSTND.
   * Facing is applied at the blit (a horizontal flip), not by a different record.
   * Pure.
   */
  enemyFrame(p: SimProcess): string

  /**
   * The ordered draw layers for a PLAYER: `[mount, rider]` — the MOUNT drawn
   * first (under), the rider on top. The mount is the player's bird from
   * `p.mount` (an ostrich block for P1, a stork block for P2); the rider is the
   * PLY* knight sprite. The user reported the mount missing entirely. Pure.
   */
  playerDrawList(p: SimProcess): string[]

  /**
   * jt9-46 — the ordered draw layers for a kind:'enemy' process: `[mount, rider]`,
   * mirroring `playerDrawList`. The mount is the buzzard body frame (unchanged from
   * `enemyFrame`), the rider is the species' own DPLYR knight — PLYR3 (bounder) /
   * PLYR4 (hunter) / PLYR5 (shadowLord), read from each PxDEC block's DPLYR field
   * (JOUSTRV4.SRC:109, field 6/offset 10). The enemy used to render riderless (one
   * mount op). `drawList` loops this for EVERY enemy — the hatched remount buzzard
   * (`remountEnemyProcess`, a kind:'enemy' process) gets its rider with no special
   * case. Pure DATA; the shell blits and mirrors a left-facer from the op's facing.
   */
  enemyDrawList(p: SimProcess): string[]

  /**
   * The transcribed POSOFF offset for an entity frame name (jt2-9): each
   * ENTITY_RECORDS `position` word decodes to `{ xoff, yoff }` so a sprite draws
   * lifted off its feet rather than clipping through a ledge. PLYR3/4/5 all carry
   * position word 751. Unknown names take a zero offset. Pure.
   */
  posOffset(name: string): { xoff: number; yoff: number }

  /**
   * The whole frame's ordered render ops (round 2): background/platform tiles,
   * the entity sprites, and the FOREGROUND (lower) cliff/island tiles that occlude
   * entities standing behind them. The user reported the lower-platform z-order
   * wrong — a monolithic "all arena, then all entities" leaves foreground cliffs
   * BEHIND the sprites. A correct list draws back tiles → entities → foreground
   * tiles, so some `arena` op follows some `entity` op. Pure.
   */
  drawList(demo: SimState): DrawOp[]
}

/**
 * Load the round-2 render-selection seams with a self-describing failure. Kept
 * SEPARATE from `loadSim` so the round-1 suite (which loads only the five wiring
 * exports) stays green while these new seams are still absent — the new rails red
 * cleanly here instead of reddening the whole module.
 */
export async function loadSimRender(): Promise<
  Pick<SimModule, 'enemyFrame' | 'playerDrawList' | 'drawList'>
> {
  const specifier = ['..', '..', 'src', 'core', 'sim.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<SimModule>
    for (const fn of ['enemyFrame', 'playerDrawList', 'drawList'] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    return mod as SimModule
  } catch (e) {
    throw new Error(
      'demo render-selection not built yet — GREEN (Julia) adds enemyFrame / ' +
        'playerDrawList / drawList to joust/src/core/sim.ts: the buzzard RUN frames ' +
        '(BRRUN1-4), the [mount, rider] player composition (ostrich/stork under PLY*), ' +
        `and the back→entity→foreground draw order. (${(e as Error).message})`,
    )
  }
}

/**
 * Load the jt9-46 enemy rider seam with a self-describing failure. Kept SEPARATE
 * from `loadSimRender` so the pre-existing render suite stays green while only
 * `enemyDrawList` is still absent — my new rails red cleanly here, and the rest of
 * the suite (which still asks loadSimRender for the three built seams) does not.
 * `drawList`/`enemyFrame`/`posOffset` already exist; `enemyDrawList` is the RED.
 */
export async function loadEnemyDrawList(): Promise<
  Pick<SimModule, 'enemyDrawList' | 'drawList' | 'enemyFrame' | 'posOffset'>
> {
  const specifier = ['..', '..', 'src', 'core', 'sim.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<SimModule>
    for (const fn of ['enemyDrawList', 'drawList', 'enemyFrame', 'posOffset'] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    return mod as SimModule
  } catch (e) {
    throw new Error(
      'enemy rider seam not built yet — GREEN (Julia) adds a pure `enemyDrawList(p)` ' +
        'to joust/src/core/sim.ts returning [enemyFrame(p), <species DPLYR rider>] ' +
        '(bounder→PLYR3, hunter→PLYR4, shadowLord→PLYR5) and has drawList emit both ops ' +
        `for every kind:'enemy' process, tagged with the enemy's facing. (${(e as Error).message})`,
    )
  }
}

/**
 * Load the not-yet-built demo wiring with a self-describing failure — the
 * loadFlight/loadScheduler pattern. The specifier is assembled at runtime so the
 * bundler cannot resolve it statically and fail the whole FILE at collection.
 *
 * RED today: `src/core/sim.ts` does not exist, so this throws "demo wiring not
 * built yet" per test — a clean "feature absent" red, never a module-resolution
 * trace.
 */
export async function loadSim(): Promise<SimModule> {
  const specifier = ['..', '..', 'src', 'core', 'sim.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<SimModule>
    for (const fn of ['createWaveSim', 'stepSim', 'stepEgg', 'resolveContacts'] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    return mod as SimModule
  } catch (e) {
    throw new Error(
      'demo wiring not built yet — GREEN (Julia) creates joust/src/core/sim.ts ' +
        'satisfying tests/helpers/sim-contract.ts: createWaveSim/stepSim drive the ' +
        'scheduler, collision and wave cadence; stepEgg wires the egg fall + ' +
        `remount; resolveContacts is the collision-pass layer over resolveJoust. (${(e as Error).message})`,
    )
  }
}
