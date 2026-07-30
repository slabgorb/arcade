// tests/helpers/transporter-contract.ts
//
// Story jt2-6 — the CONTRACT for the transporter + spawn-service core,
// TEA-authored (O'Brien). Same double-entry split the epic has used since
// jt1-2: TEA states the module shape and the laws that pin it; Dev (Julia)
// writes the module + the committed JT26-* claims. The behaviour lives in
// tests/transporter.test.ts; the ROM-law provenance + the small byte gate in
// tests/transporter-source.test.ts; every newly-cited range carries a committed
// claim in docs/rom-study/claims/transporter.json (byte-verified by the
// citations suite — tests/audit/citations.test.ts already re-opens every
// committed claim against the vendored tree, so JT26 verbatims must byte-match).
//
// ─── WHAT jt2-6 MODELS (all cited; see transporter-source.test.ts) ───────────
// Entry into the arena, the spawn service:
//
//   • FOUR TRANSPORTER PADS by tier — TR1ID..TR4ID (JOUSTRV4.SRC:5587-5590).
//     Each is a 4-word FDB record TIMAGE/TPOSX/TPOSY/TCURUSE (the transporter
//     RAM layout, JOUSTRV4.SRC:96-99): image ptr, X pixel, Y pixel, in-use flag.
//     The X/Y are hex±decimal (`$6A+7`, `$51-1`). The pad's TIER is the screen
//     third its Y sits in (SELARE class): TR1 top, TR2/TR3 the two middle pads,
//     TR4 bottom — exactly the AREA1/AREA2(right/left)/AREA3 routing the
//     re-incarnation code walks (JOUSTRV4.SRC:5641-5654).
//   • THE EMPTY-THIRD RULE — SELARE (JOUSTRV4.SRC:6413-6424) classifies a flying
//     object's Y into one of three screen thirds and marks that third occupied
//     (AREA1/2/3, RAMDEF.SRC:302-304). A spawn PROCEEDS only into an EMPTY third;
//     a crowded third DEFERS it (the re-incarnation loop clears the three AREA
//     flags, SELARE-scans every active object, then only picks a transporter in
//     an area whose flag is still 0 — JOUSTRV4.SRC:5622-5654). The boundaries are
//     LOAD-BEARING and hex: middle starts at $51, bottom at $A3+6 = $A9 (the
//     `$8A+6` second column on :6414 is a DEAD comment, the COLOR1 trap — the
//     assembler's operand field ends at the first whitespace).
//   • THE TICKET QUEUE — a deli-counter "take a number" service. Players draw
//     NPSERV numbers, enemies draw NESERV numbers; LPSERV/LESERV are the numbers
//     now in service (RAMDEF.SRC:248-251). A player is served when its number ==
//     LPSERV (JOUSTRV4.SRC:5620-5621); an enemy is served when its number ==
//     LESERV *and* no player still holds an unserved number (NPSERV == LPSERV) —
//     players are served AHEAD of enemies (JOUSTRV4.SRC:5672-5676). Serving a
//     player bumps LPSERV, serving an enemy bumps LESERV (JOUSTRV4.SRC:5722-5724).
//   • TIMED MATERIALISATION SAFETY — an ABORT law, NOT invulnerability. During
//     the materialisation the player's collisions are DISABLED (the PID $80 bit
//     is clear); the window is a per-frame nap (the jt2-1 PNAP pattern — the
//     "wait for 1st move, or time out" loop naps 1 frame per pass, JOUSTRV4.SRC:
//     5828). Left untouched, the window runs to timeout. But ANY control input
//     during it aborts EARLY (`LDD CURJOY / BNE 51$` — the whole joystick word
//     nonzero jumps to "ABORTED EARLY", JOUSTRV4.SRC:5831,5841,5892). On either
//     exit — abort or timeout — PLYINT re-enables collisions (`LDA #$80 / ORA
//     PID,U / STA PID,U`, JOUSTRV4.SRC:5923-5925), which is what makes it safety
//     that ends, not permanent invulnerability. The exact blink cadence of the
//     window (PFEET/PTIMUP) is shell/effect timing (the ruled text/effect seam),
//     so the window length is a caller-supplied nap count; the LAW pinned here is
//     the countdown boundary + the abort.
//   • PLAYER SPAWN CONSTANTS (JOUSTRV4.SRC:1020-1039): P1 materialises at X=100
//     facing right (PFACE=0) on the OSTRICH; P2 at X=200 facing left (PFACE=$FF)
//     on the STORK. PFACE is 0=right / <>0=left (RAMDEF.SRC:186), modelled as the
//     joust-core Facing (+1 right / −1 left).
//   • AC-4 — a full wave-1 enemy complement flows through the pads. jt2-5's
//     WAVE_TABLE row 1 is $30,$01,0,2: 3 bounders (pursuers=1 is the pursuit
//     nibble that seeds the intelligence budget, NOT a spawn count). So the
//     complement is 3 enemies, and they enter via the pads deterministically
//     under seed.
//
// ─── DEGRADATION ─────────────────────────────────────────────────────────────
// This helper carries NO vendored read — it is pure type + loader. The source
// re-derivations live in transporter-source.test.ts, each inside an it() and
// gated by describe.skipIf(!vendoredAvailable) (the tp1-8 collection trap).

import type { PlayerInput } from './flight-contract.js'
import type { Facing } from './joust-collision-contract.js'
import type { WaveRow } from './wave-contract.js'

export type { PlayerInput, Facing, WaveRow }

// ─── Pads by tier ────────────────────────────────────────────────────────────

/** The three screen thirds SELARE sorts a Y position into (AREA1/AREA2/AREA3). */
export type Tier = 'top' | 'middle' | 'bottom'

/** The four transporter pad ids, in TR1ID..TR4ID order (JOUSTRV4.SRC:5587-5590). */
export type PadId = 'TR1' | 'TR2' | 'TR3' | 'TR4'

/**
 * One transporter pad. `x`/`y` are the TPOSX/TPOSY words of the pad's FDB record
 * (JOUSTRV4.SRC:5587-5590), evaluated: TR1 (113,80), TR2 (231,128), TR3 (23,137),
 * TR4 (127,210). `tier` is the screen third `y` falls in (= selectArea(y)).
 */
export interface TransporterPad {
  id: PadId
  x: number
  y: number
  tier: Tier
}

// ─── Empty-third rule ────────────────────────────────────────────────────────

/** Per-third occupant counts (AREA1/AREA2/AREA3), cleared then SELARE-summed. */
export interface AreaOccupancy {
  top: number
  middle: number
  bottom: number
}

// ─── Ticket queue ────────────────────────────────────────────────────────────

/**
 * The deli-counter service state (RAMDEF.SRC:248-251). `npserv`/`neserv` are the
 * next numbers handed out to a player / enemy; `lpserv`/`leserv` are the numbers
 * now being served. A class is "waiting" when its next != its in-service number.
 */
export interface ServiceQueue {
  npserv: number
  lpserv: number
  neserv: number
  leserv: number
}

// ─── Materialisation safety ──────────────────────────────────────────────────

/** Where a materialisation window stopped. */
export type MaterialiseEnd = 'active' | 'timed-out' | 'aborted'

/**
 * A materialisation-in-progress. `napLeft` is the PNAP-style frame countdown of
 * the timed window; `collisionsEnabled` is the PID $80 bit — FALSE (safe) while
 * the window is `active`, TRUE once it ends (timeout or abort) mirroring PLYINT's
 * `ORA PID` re-enable (JOUSTRV4.SRC:5923-5925).
 */
export interface Materialisation {
  napLeft: number
  collisionsEnabled: boolean
  end: MaterialiseEnd
}

// ─── Player spawn constants ──────────────────────────────────────────────────

/** A player's materialisation constants (JOUSTRV4.SRC:1020-1039). */
export interface PlayerSpawn {
  x: number
  facing: Facing
  mount: 'ostrich' | 'stork'
}

// ─── AC-4: the wave complement entering via pads ─────────────────────────────

/** One enemy's pad assignment, in entry order. */
export interface PadEntry {
  index: number
  pad: PadId
}

export interface TransporterModule {
  // Pads by tier ------------------------------------------------------------
  /** The four pads, TR1..TR4, with their evaluated X/Y and derived tier. */
  PADS: readonly TransporterPad[]

  // The empty-third rule ----------------------------------------------------
  /** `$51` — the top/middle boundary: Y < this is the top third (JOUSTRV4.SRC:6419). */
  THIRD_MIDDLE_MIN: number
  /** `$A3+6` = `$A9` — the middle/bottom boundary (JOUSTRV4.SRC:6414). */
  THIRD_BOTTOM_MIN: number
  /**
   * SELARE (JOUSTRV4.SRC:6413-6424): the third a Y position sits in.
   * Y < THIRD_MIDDLE_MIN → 'top'; < THIRD_BOTTOM_MIN → 'middle'; else 'bottom'.
   */
  selectArea(posY: number): Tier
  /**
   * Clear the three AREA flags then SELARE-classify each active occupant's Y,
   * counting occupants per third (JOUSTRV4.SRC:5622-5635).
   */
  scanAreas(occupantYs: readonly number[]): AreaOccupancy
  /**
   * The empty-third rule: a spawn PROCEEDS into `tier` only when that third is
   * empty (its occupancy is 0); a crowded third DEFERS (JOUSTRV4.SRC:5641-5654).
   */
  spawnProceeds(occ: AreaOccupancy, tier: Tier): boolean

  // The ticket queue --------------------------------------------------------
  /** A fresh service state (all counters equal — nobody waiting, nobody served). */
  newServiceQueue(): ServiceQueue
  /** Player draws the next number (NPSERV → ticket, NPSERV++). */
  takePlayerNumber(q: ServiceQueue): { ticket: number; queue: ServiceQueue }
  /** Enemy draws the next number (NESERV → ticket, NESERV++). */
  takeEnemyNumber(q: ServiceQueue): { ticket: number; queue: ServiceQueue }
  /** Is it this player's turn? number === LPSERV (JOUSTRV4.SRC:5620). */
  playerTurn(q: ServiceQueue, ticket: number): boolean
  /**
   * Is it this enemy's turn? number === LESERV AND no player still holds an
   * unserved number (NPSERV == LPSERV) — players first (JOUSTRV4.SRC:5672-5676).
   */
  enemyTurn(q: ServiceQueue, ticket: number): boolean
  /** Advance the player counter after a player materialises (INC LPSERV, :5722). */
  servePlayer(q: ServiceQueue): ServiceQueue
  /** Advance the enemy counter after an enemy materialises (INC LESERV, :5724). */
  serveEnemy(q: ServiceQueue): ServiceQueue
  /**
   * Who the service hands the next transporter to: 'player' while any player
   * holds an unserved number, else 'enemy' while any enemy does, else 'idle'.
   * The single statement of "players ahead of enemies".
   */
  nextServed(q: ServiceQueue): 'player' | 'enemy' | 'idle'

  // Materialisation safety --------------------------------------------------
  /**
   * Is this frame's input a control input? dir !== 0 OR flap OR flapHeld — the
   * whole CURJOY word nonzero (JOUSTRV4.SRC:5831,5841). The neutral glide input
   * is the only non-control input.
   */
  isControlInput(input: PlayerInput): boolean
  /** Begin a materialisation window of `windowFrames` naps — safe, collisions off. */
  beginMaterialise(windowFrames: number): Materialisation
  /**
   * One frame of the window. A control input aborts EARLY (end 'aborted',
   * collisions re-enabled) regardless of napLeft; otherwise napLeft decrements
   * and the window times out (end 'timed-out', collisions re-enabled) when it
   * reaches 0. An already-ended materialisation is returned unchanged (no
   * resurrecting the safety).
   */
  stepMaterialise(m: Materialisation, input: PlayerInput): Materialisation

  // Player spawn constants --------------------------------------------------
  /** P1: X=100, facing right (+1), OSTRICH (JOUSTRV4.SRC:1020-1023). */
  PLAYER1_SPAWN: PlayerSpawn
  /** P2: X=200, facing left (−1), STORK (JOUSTRV4.SRC:1035-1039). */
  PLAYER2_SPAWN: PlayerSpawn

  // AC-4 --------------------------------------------------------------------
  /**
   * The number of enemies a wave row sends in via pads: bounders + hunters +
   * lords + pterodactyls. The PURSUIT nibble is EXCLUDED — it seeds the budget,
   * it is not a spawn count (jt2-5's seam).
   */
  waveEnemyComplement(row: WaveRow): number
  /**
   * Assign each of `count` entering enemies a pad, deterministically under
   * `seed`: same (count, seed) → identical sequence, every pad a real PadId,
   * indices 0..count-1. Pure — no ambient entropy (the seed is the only input).
   */
  enterViaPads(count: number, seed: number): PadEntry[]
}

/**
 * Load the not-yet-built transporter module with a self-describing failure — the
 * loadWave / loadEnemy pattern. The specifier is assembled at runtime so the
 * bundler cannot resolve it statically and fail the whole FILE at collection.
 *
 * RED today: `src/core/transporter.ts` does not exist, so this throws
 * "transporter service not built yet" PER TEST — a clean "feature absent" red,
 * never a module-resolution trace or a type error.
 */
export async function loadTransporter(): Promise<TransporterModule> {
  const specifier = ['..', '..', 'src', 'core', 'transporter.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<TransporterModule>
    for (const fn of [
      'selectArea',
      'scanAreas',
      'spawnProceeds',
      'newServiceQueue',
      'takePlayerNumber',
      'takeEnemyNumber',
      'playerTurn',
      'enemyTurn',
      'servePlayer',
      'serveEnemy',
      'nextServed',
      'isControlInput',
      'beginMaterialise',
      'stepMaterialise',
      'waveEnemyComplement',
      'enterViaPads',
    ] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    for (const c of [
      'PADS',
      'THIRD_MIDDLE_MIN',
      'THIRD_BOTTOM_MIN',
      'PLAYER1_SPAWN',
      'PLAYER2_SPAWN',
    ] as const) {
      if (mod[c] === undefined) throw new Error(`module has no \`${c}\` export`)
    }
    return mod as TransporterModule
  } catch (e) {
    throw new Error(
      'transporter service not built yet — GREEN (Julia) creates ' +
        'joust/src/core/transporter.ts to satisfy tests/helpers/transporter-contract.ts: ' +
        'the four PADS by tier (X/Y byte-gated against JOUSTRV4.SRC:5587-5590), ' +
        'selectArea + the empty-third rule (SELARE, JOUSTRV4.SRC:6413-6424; boundaries ' +
        '$51 and $A3+6), the NPSERV/LPSERV/NESERV/LESERV ticket queue with players ' +
        'served ahead of enemies (JOUSTRV4.SRC:5615-5676), isControlInput + the timed ' +
        'materialisation abort law (JOUSTRV4.SRC:5831-5892,5923-5925), PLAYER1/2_SPAWN ' +
        '(JOUSTRV4.SRC:1020-1039), and waveEnemyComplement + enterViaPads for the ' +
        'wave-1 complement (AC-4). Also commit docs/rom-study/claims/transporter.json ' +
        `(JT26-*). (${(e as Error).message})`,
    )
  }
}
