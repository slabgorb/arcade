// src/core/sound-events.ts
//
// Story mc8-2 (GREEN, Julia) — the pure-core sound-event channel. `stepGame`
// (and the fire reducer) emit a fresh list of these on `GameState.soundEvents`
// each step, describing the gameplay moments the audio shell reacts to. Mirrors
// the house pattern (battlezone/star-wars core/events.ts): events are DATA,
// never callbacks, so the core stays pure and deterministic — a fixed seed +
// input stream yields an identical event stream.
//
// Narrow with the `type` discriminant (`switch (e.type)` / `e.type === '…'`).
// The shell's src/shell/audio-dispatch.ts maps each kind to its POKEY cue
// (spike §5). This module holds NO numeric game constant — the lifted W3SOUN
// byte tables live in src/core/sound-tables.ts (cited); keeping this file
// literal-free keeps the citation guard's business with the tables, not the union.
//
// FIDELITY (mc8-1 spike §5): Missile Command has NO incoming-ICBM / whistle /
// threat cue — regular ICBM flight and spawning are silent. There is therefore
// deliberately no such kind here; the only continuous threat audio (the
// cruise/Sputnik drones) is a shell-side sustained voice, not a core event.

// (Comments are `//` lines, not `/** */` JSDoc: the citation scanner strips `//`
// per line but not multi-line JSDoc, so a spike section number in a doc block
// would leak past it as an un-cited literal — see sound-tables.ts and abm.ts.)

// A player ABM left a base this frame — the LAUNCH cue (LA, SABLAU).
export interface LaunchedEvent {
  readonly type: 'launched'
}

// An ABM reached its target and detonated a blast — the EXPLOSION cue (EX,
// EXSNON "BANG ON"). This is the sound moment; the ICBM kills the blast then
// scores are silent consequences (see `icbmKilled`).
export interface DetonatedEvent {
  readonly type: 'detonated'
}

// A descending ICBM was destroyed inside a blast this frame. Scored, but SILENT
// at the shell — the detonation that opened the fireball already banged; the ROM
// plays no per-catch cue (spike event map). Carried as data for non-audio consumers.
export interface IcbmKilledEvent {
  readonly type: 'icbmKilled'
}

// A city or missile base was destroyed by an arrived enemy warhead — reuses the
// EXPLOSION cue (SOHNO is an alias of SEXPLO, spike event map).
export interface StructureDestroyedEvent {
  readonly type: 'structureDestroyed'
}

// A fire input hit a base that could not fire (destroyed or empty magazine) —
// the CAN'T-FIRE cue (NS, SNSHOT, spike event map).
export interface AmmoEmptyEvent {
  readonly type: 'ammoEmpty'
}

// One unit of the end-of-wave bonus count-up was tallied — the BONUS-TICK cue
// (TK, SUNABM, spike event map). (Emitter is a filed follow-up; the map is wired.)
export interface BonusTickEvent {
  readonly type: 'bonusTick'
}

/** Everything the core narrates to the audio shell in one frame. */
export type SoundEvent =
  | LaunchedEvent
  | DetonatedEvent
  | IcbmKilledEvent
  | StructureDestroyedEvent
  | AmmoEmptyEvent
  | BonusTickEvent
