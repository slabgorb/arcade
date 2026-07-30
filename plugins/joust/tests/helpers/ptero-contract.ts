// tests/helpers/ptero-contract.ts
//
// Story jt3-4 — the CONTRACT for src/core/ptero.ts, TEA-authored (Leeloo). Same
// seam the epic has used since jt1-2: TEA states the module shape and pins the
// behaviour; Dev (Julia) writes the module + its committed JT34-* claims. The
// behaviour lives in tests/ptero.test.ts, the source re-derivation + claim
// coverage + the SCRHUN→1000 derivation in tests/ptero-source.test.ts, and the
// demo call-site pin (the wave type going LIVE) in tests/demo-ptero.test.ts.
//
// ─── WHAT jt3-4 ADDS ─────────────────────────────────────────────────────────
// The pterodactyl as a pure process (no clock, no entropy, no browser surface —
// the jt1-7 purity scanner sweeps src/core/ptero.ts the moment it lands):
//
//   • THE GRAVITY EXEMPTION (AC-1). The ptero enters the position integrator at
//     ADDGRX (JOUSTRV4.SRC:1508), the entry point ONE INSTRUCTION PAST the mount's
//     `ADDB GRAV` (ADDGRA, JOUSTRV4.SRC:6489) — "NO GRAVITY!" (JOUSTRV4.SRC:1506).
//     So a still ptero HOLDS altitude where the mount's stepFlight adds gravity to
//     VY and falls. Its X ladder is FLYXP (±$0300, JOUSTRV4.SRC:1587-1595) — a wider
//     ladder than the mount's FLYX (±$0200).
//
//   • THE LANCE-HEIGHT KILL WINDOW (AC-2, the hard one). A MATCH on lance height,
//     NOT the ostrich-height compare (JOUSTRV4.SRC:4971-5001). The attack frame
//     KILLS the ptero (→ 1000) ONLY when ALL hold:
//       (a) the player's lance is within the frame's band — the ATTACKING frame
//           (FLY3, PIMAGE > FLY2-FLY1) uses offset 8 ± 3 (SUBB #15-7 / CMPB #3
//           "WITHIN 7 PIXELS", :4978-4981); ELSE (FLY1/FLY2, wings up) offset
//           10 ± 2 (SUBB #15-5 / CMPB #2 "WITHIN 5 PIXELS", :4986-4989). The lance
//           offset is B = PLANTZ,U + PPOSY,U − PPOSY,X (:4971-4973, WHOLE pixels);
//       (b) OPPOSITE facings (EORA PFACE / BPL, :4991-4993); AND
//       (c) the player FACING INTO it (COLDX sign vs PFACE, :4994-5001).
//     Failing ANY one drops into the NORMAL joust (OSTBO, :5002) — which the PTERO
//     WINS (the player loses): 'pteroWins'.
//
//   • THE 1000-POINT KILL (AC-2, ruling C). DERIVED, not stated: the ptero's DVALUE
//     is $10 (P7DEC, JOUSTRV4.SRC:5577) decoded through SCRHUN (P7DEC's DVALUR,
//     :5575) — the "THOUSANDS & HUNDREDS BCD DIGIT" routine (:7340-7348), so $10 =
//     1 thousand + 0 hundreds = 1000. The verify-in-emulation caveat rides in the
//     claim; NOTHING here gates on an emulator.
//
//   • THE PTERO WAVE TYPE, LIVE (AC-3). jt2-5 landed the 6-entry WJSRTB skeleton
//     with WPTERO (index 5, JOUSTRV4.SRC:2591) as a routed-but-inert entry; this
//     story makes it spawn pteros. WPTERO reads WPTEN (the wave row's ptero byte,
//     JOUSTRV4.SRC:179,2614-2615) for the count. The spawn count flows THROUGH
//     jt2-5's dispatchWaveType: `= pterodactyls` on a 'ptero' wave, else 0.
//
// ─── UNITS (inherited from flight.ts / joust.ts, do not re-symmetrise) ───────
//   • posY is 8.8 fixed — WHOLE pixel is `posY >> 8` (the lance compare uses whole
//     pixels, PPOSY offset +1 = the pixel byte).
//   • facing is ±1 (PFACE): +1 right, −1 left; opposite = a.facing !== b.facing.
//   • velY is the 6809's 16-bit signed velocity; positive = DOWN.

import type { EntityState, PlayerInput } from './flight-contract.js'
import type { JoustEntity, Facing } from './joust-collision-contract.js'
import type { PlayersAlive } from './wave-contract.js'

export type { EntityState, PlayerInput, JoustEntity, Facing, PlayersAlive }

/**
 * The ptero as a joust participant — position, facing, and its ATTACKING-frame
 * flag. `attackFrame` is true while the ptero shows FLY3 (PIMAGE > FLY2-FLY1),
 * which the kill window reads to select the 8 ± 3 band over the 10 ± 2 band
 * (JOUSTRV4.SRC:4975 "ATTACKING FRAME?"). No `plantZ`: the lance-height compare
 * uses the PLAYER's PLANTZ against the ptero's raw PPOSY.
 */
export interface PteroEntity {
  /** Whole-pixel X (PPOSX pixel) — the COLDX side is sign(ptero.posX − player.posX). */
  posX: number
  /** 8.8 fixed Y — the compare uses the WHOLE pixel `posY >> 8` (PPOSY+1). */
  posY: number
  /** `PFACE` — +1 right, −1 left. */
  facing: Facing
  /** FLY3 attacking frame (PIMAGE > FLY2-FLY1): selects the 8 ± 3 band. */
  attackFrame: boolean
}

/**
 * The lance-height kill window's verdict:
 *   • `kill`  — the player killed the ptero (all three tests held) → score 1000.
 *   • `pteroWins` — any single test failed → the NORMAL joust (OSTBO), which the
 *     ptero wins (the player dies). The story's binding ruling for the fallback.
 */
export type PteroAttackOutcome =
  | { kind: 'kill'; score: number }
  | { kind: 'pteroWins' }

/** The 1000-point kill score EVENT (the epic's scoring seam, ruling C). */
export interface PteroScoreEvent {
  kind: 'score'
  value: number
  /** A ptero kill — the demo's existing 'kill' reason (not a new score reason). */
  reason: 'kill'
}

export interface PteroModule {
  // ── FLYXP horizontal ladder + the gravity exemption (AC-1) ──
  /**
   * The nine FLYXP entries in INDEX order −8..+8 (JOUSTRV4.SRC:1587-1595): the
   * ptero's X-velocity ladder, zero in the MIDDLE (the FLYX house convention).
   * ±$0300 endpoints — WIDER than the mount's FLYX (±$0200).
   */
  PTERO_FLYX: readonly number[]
  /** $0300 — the ptero's top |X velocity| rung (vs the mount's FLYX $0200). */
  PTERO_FLYX_MAX: number

  // ── The lance-height bands (AC-2) ──
  /** 8 — the ATTACKING-frame (FLY3) band centre (SUBB #15-7, JOUSTRV4.SRC:4978). */
  ATTACK_BAND_CENTER: number
  /** 3 — the attacking-frame tolerance (CMPB #3 "WITHIN 7 PIXELS", JOUSTRV4.SRC:4981). */
  ATTACK_BAND_TOL: number
  /** 10 — the glide-frame (FLY1/FLY2) band centre (SUBB #15-5, JOUSTRV4.SRC:4986). */
  GLIDE_BAND_CENTER: number
  /** 2 — the glide-frame tolerance (CMPB #2 "WITHIN 5 PIXELS", JOUSTRV4.SRC:4989). */
  GLIDE_BAND_TOL: number
  /**
   * 12 — FLY2-FLY1 (the RMB-12 frame stride, JOUSTRV4.SRC:140-142). PIMAGE > this
   * is the attacking frame (FLY3 = 24); `CMPA #FLY2-FLY1 / BLS 13$`, JOUSTRV4.SRC:4975.
   */
  ATTACK_FRAME_THRESHOLD: number
  /**
   * 1000 — the ptero kill value. DERIVED, not stated: DVALUE $10 (P7DEC,
   * JOUSTRV4.SRC:5577) through SCRHUN (:5575,:7340-7348) = 1 thousand + 0 hundreds.
   * The verify-in-emulation caveat rides in the claim (ruling C).
   */
  PTERO_SCORE: number

  /**
   * One frame of ptero flight — the ADDGRX entry that SKIPS the mount's `ADDB GRAV`
   * (JOUSTRV4.SRC:1508,6489-6494). posY integrates by VY with NO gravity add, so a
   * still ptero (velY 0, no flap) HOLDS altitude where the mount's stepFlight falls.
   * Horizontal uses PTERO_FLYX. Pure — the argument is never mutated.
   */
  stepPteroFlight(state: EntityState, input: PlayerInput): EntityState

  /**
   * The lance-height delta B = player.plantZ + (player.posY>>8) − (ptero.posY>>8),
   * in WHOLE pixels (LDB PLANTZ,U / ADDB PPOSY+1,U / SUBB PPOSY+1,X,
   * JOUSTRV4.SRC:4971-4973). A skidding player (plantZ 2) shifts the band. Pure.
   */
  lanceOffset(player: JoustEntity, ptero: PteroEntity): number

  /**
   * Resolve a player↔ptero contact (the OSTHIT ptero path, JOUSTRV4.SRC:4971-5002).
   * `kill` (→ PTERO_SCORE) iff ALL of: (a) `lanceOffset` within the frame's band
   * (attackFrame → 8±3, else 10±2), (b) OPPOSITE facings, and (c) the player facing
   * INTO the ptero (facing === sign(ptero.posX − player.posX)). Any single failure →
   * `pteroWins` (the normal joust, which the ptero wins). Pure.
   */
  resolvePteroAttack(player: JoustEntity, ptero: PteroEntity): PteroAttackOutcome

  /** The 1000-point kill score event (reason 'kill'; ruling C caveat in the claim). */
  pteroScoreEvent(): PteroScoreEvent

  /**
   * How many pteros a wave spawns (AC-3): the wave table's ptero nibble (WPTEN =
   * `pterodactyls`) WHEN the wave dispatches to the 'ptero' type through jt2-5's
   * `dispatchWaveType` (JOUSTRV4.SRC:2591 WPTERO, :2614-2615 reads WPTEN), else 0.
   * The ptero type does NOT degrade by player-count, so a player being out does not
   * change the count. Pure.
   */
  pteroWaveSpawnCount(status: number, pterodactyls: number, players: PlayersAlive): number
}

/**
 * Load the not-yet-built ptero module with a self-describing failure — the
 * loadTroll / loadFlight pattern. The specifier is assembled at runtime so the
 * bundler cannot resolve it statically and redden the whole FILE at collection.
 *
 * RED today: src/core/ptero.ts does not exist, so this throws a clean "feature
 * absent" per test, never a module-resolution stack trace.
 */
export async function loadPtero(): Promise<PteroModule> {
  const specifier = ['..', '..', 'src', 'core', 'ptero.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<PteroModule>
    for (const fn of [
      'stepPteroFlight',
      'lanceOffset',
      'resolvePteroAttack',
      'pteroScoreEvent',
      'pteroWaveSpawnCount',
    ] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    for (const c of ['PTERO_FLYX', 'PTERO_SCORE', 'ATTACK_BAND_CENTER', 'GLIDE_BAND_CENTER'] as const) {
      if (mod[c] === undefined) throw new Error(`module has no \`${c}\` export`)
    }
    return mod as PteroModule
  } catch (e) {
    throw new Error(
      'ptero module not built yet — GREEN (Julia) creates joust/src/core/ptero.ts ' +
        'satisfying tests/helpers/ptero-contract.ts: the gravity-EXEMPT stepPteroFlight ' +
        '(ADDGRX skips ADDB GRAV; FLYXP ±$0300), the lance-height resolvePteroAttack ' +
        '(the two-band 8±3 / 10±2 window + opposite facings + facing-into, else ' +
        'pteroWins), the 1000-pt pteroScoreEvent (DVALUE $10 via SCRHUN — DERIVED, ' +
        'caveat), and pteroWaveSpawnCount (the ptero nibble through jt2-5 dispatch). ' +
        `Also commit docs/rom-study/claims/ptero.json (JT34-*). (${(e as Error).message})`,
    )
  }
}
