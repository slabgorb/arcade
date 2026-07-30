// src/core/events.ts
//
// The pure-core game-event channel (story bz1-11). `stepGame` emits a fresh
// list of these on `GameState.events` each step, describing the gameplay
// moments the shell reacts to — the sound engine consumes them via the
// event→cue dispatch in shell/audio-dispatch.ts. Mirrors star-wars's
// core/events.ts (the house pattern): events are DATA, never callbacks, so
// the core stays pure and deterministic — a fixed seed + input stream yields
// an identical event stream (story AC).
//
// Narrow with the `type` discriminant (`switch (e.type)` / `e.type === '…'`).
// Kinds are added only when the story that produces them lands (context
// rule: never invent payload shapes ahead of their producers). bz1-5 gives
// the cannon slot, bz1-7/8 the hostile lifecycle, bz1-9 the saucer visit.
// `shell-impact` is deliberately absent: no consumer exists yet (deviation
// logged in the bz1-11 session).

// `import type` ⇒ compile-time only, so no runtime import cycle with
// enemies.ts, and state.ts can import `GameEvent` back for the channel.
import type { HostileKind } from './enemies'

/**
 * What an `enemy-destroyed` kill destroyed: one of the hostile roster, or the
 * bonus saucer. A literal union (not `string`) keeps downstream `switch`
 * exhaustive and rejects misspelled kinds. The saucer is included here even
 * though it is not a `Hostile` — the blast cue is the same discrete circuit.
 */
export type DestroyedKind = HostileKind | 'saucer'

/** The cannon fired — the player's one shell left the barrel this step. */
export interface ShotFiredEvent {
  readonly type: 'shot-fired'
}

/** A unit died to the player's shell: the hostile (bz1-7/8) or the saucer (bz1-9). */
export interface EnemyDestroyedEvent {
  readonly type: 'enemy-destroyed'
  readonly kind: DestroyedKind
}

/** The enemy's shell (or a homing missile) reached the player — a tank is lost. */
export interface PlayerHitEvent {
  readonly type: 'player-hit'
}

/** The replacement hostile went live — the "always one hostile" rule (findings §2). */
export interface HostileSpawnEvent {
  readonly type: 'hostile-spawn'
  readonly kind: HostileKind
}

/** The bonus visitor drifted in (score ≥ 2000, bz1-9) — the warble starts. */
export interface SaucerPresentEvent {
  readonly type: 'saucer-present'
}

/** The visitor stopped being alive — killed or departed; the warble stops. */
export interface SaucerGoneEvent {
  readonly type: 'saucer-gone'
}

// bz3-10 — cluster C10 (U-008/009/010/012): four rising-EDGE moments. Each
// ROM counterpart latches (EIRNGE/OBJCOL) so the cue fires once on entry, not
// every frame the condition holds — sim.ts owns the edge detection; these are
// plain one-shot data, same as every event above.

/** A live hostile just became gunsight-aligned and within ENEMY_ALERT_RANGE —
 *  the WARNG alarm's trigger (BZONE.MAC:4050-4054, the EIRNGE latch). */
export interface EnemyInRangeEvent {
  readonly type: 'enemy-in-range'
}

/** The radar sweep just re-lit a contact to peak brightness — RBEEP's trigger
 *  (BZONE.MAC:3993-3996, BLIP re-lit to 0xF0). */
export interface RadarBlipEvent {
  readonly type: 'radar-blip'
}

/** A translate intent produced zero displacement — BOING's trigger
 *  (BZONE.MAC:2677-2680, the OBJCOL latch). */
export interface MotionBlockedEvent {
  readonly type: 'motion-blocked'
}

/** A bonus-tank score threshold was just crossed — BONER's trigger
 *  (BZONE.MAC:2560-2564, INC LIVES). */
export interface BonusTankEvent {
  readonly type: 'bonus-tank'
}

export type GameEvent =
  | ShotFiredEvent
  | EnemyDestroyedEvent
  | PlayerHitEvent
  | HostileSpawnEvent
  | SaucerPresentEvent
  | SaucerGoneEvent
  | EnemyInRangeEvent
  | RadarBlipEvent
  | MotionBlockedEvent
  | BonusTankEvent
