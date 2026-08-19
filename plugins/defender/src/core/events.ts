// plugins/defender/src/core/events.ts
//
// Story df6-1 (GREEN — the audio EVENT SEAM's core half). A discriminated union of the
// gameplay moments the integrated sim resolves, carried as DATA on the state stepSim
// returns (`SimState.cues`), never as callbacks — so the core stays pure (tests/purity.
// test.ts scans this file) and df3's seeded-RNG determinism replays reproduce bit-for-bit
// with the event channel live: the channel adds no RNG draw and no ordering change.
// This mirrors jt5-1's core/events.ts and the SH4-5 dispatch convention.
//
// ─── WHY DATA, NOT A CALLBACK ────────────────────────────────────────────────────
// A sink handed down from the shell would put a function inside the sim, and a seeded
// replay would then depend on what the shell passed in. `stepSim` rebuilds this list
// every tick and the shell reads it off the returned state; `shell/audio-dispatch.ts`
// is what turns one into the other.
//
// ─── THE MOMENTS, AND WHY EXACTLY THESE ──────────────────────────────────────────
// Each kind is a REAL entry in Defender's main-CPU SOUND TABLE (DEFA7.SRC:665-691, under
// the format header `SNDPRI,N*(REPCNT,SNDTMR,SND#)` at :660) whose moment THIS integrated
// port actually reaches. The byte-exact table row, priority byte and call site of every
// cue live in `src/shell/audio.ts`'s CUE_SOURCES and in docs/rom-study/claims/19-sound.json,
// where the df1-1 citation gate re-opens both sides against the vendored 1981 tree.
//
// ─── WHAT IS DELIBERATELY NOT HERE (a Delivery Finding, not an oversight) ─────────
//   • LGSND "LANDER GRAB" (:687) — has NO call site anywhere in the vendored ROM; the grab
//     moment plays LPKSND (:683, DEFB6.SRC:790). Wiring LGSND would be a CONFABULATED cite,
//     so the grab moment maps to `lander-pickup` (LPKSND) and LGSND stays unwired.
//   • CNSND "COIN" (:665) — attract/coin insertion, df7 (Decision A).
//   • TBSND "TERRAIN BLOW" (:670) — the panic/planet-blow cue; not in df6-1's cue list.
//   • LSKSND "LANDER SUCK" (:684) — a STATEFUL repeat cue (the lander drawing a humanoid
//     inside), deferred to df6-2 (the two stateful cues: thrust held-loop + lander-suck).

/**
 * Every event kind, as a runtime TUPLE. A VALUE on purpose: the shell's manifest and
 * dispatch are swept against it, so "every kind has a cue" is mechanically true rather
 * than merely maintained. The union below is DERIVED from it, so the tuple and the type
 * cannot drift apart (the jt5-1 shape).
 */
export const EVENT_KINDS = [
  'laser-fire', //     the player fired a laser that actually spawned — LASSND (:686)
  'lander-hit', //     a lander was destroyed — LHSND (:682)
  'mutant-hit', //     a mutant/schizoid was destroyed — SCHSND "SCHITZ HIT" (:679)
  'baiter-hit', //     a baiter (ufo) was destroyed — UFHSND "UFO HIT" (:680)
  'pod-hit', //        a pod (probe) was destroyed — PRHSND "PROBE HIT" (:678)
  'bomber-hit', //     a bomber (tie) was destroyed — TIHSND "TIE HIT" (:681)
  'swarmer-hit', //    a swarmer was destroyed — SWHSND "SWARM HIT" (:685)
  'lander-shoot', //   a lander fired at the player — LSHSND (:688)
  'mutant-shoot', //   a mutant/schizoid fired — SSHSND "SCHITZO SHOOT" (:689)
  'baiter-shoot', //   a baiter fired — USHSND "UFO SHOOT" (:690)
  'swarmer-shoot', //  a swarmer fired — SWSSND "SWARM SHOOT" (:691, call site DEFB6.SRC:269)
  'lander-pickup', //  a lander grabbed a humanoid — LPKSND "LANDER PICK UP" (:683)
  'enemy-appear', //   an enemy materialized — APSND "APPEAR SOUND" (:677)
  'smart-bomb', //     a smart bomb detonated — SBSND (:672, call site SBOMB DEFA7.SRC:3183)
  'player-death', //   the player ship was destroyed — PDSND (:667)
  'extra-man', //      a free ship / replay threshold was crossed — RPSND "FREE SHIP" (:666)
  'wave-start', //     a new wave (field) began — ST1SND "START 1" (:668)
  'astro-catch', //    the player caught a falling humanoid — ACSND "ASTRO CATCH" (:673)
  'astro-land', //     a caught humanoid was deposited on the ground — ALSND "ASTRO LAND" (:674)
  'astro-hit', //      a walking humanoid was killed by hostile fire — AHSND "ASTRO HIT" (:675)
  'astro-scream', //   a carried humanoid was dropped and falls — ASCSND "ASTRO SCREAM" (:676)
] as const

/** The discriminant of every event — derived from the tuple, never re-typed. */
export type GameEventKind = (typeof EVENT_KINDS)[number]

/**
 * One gameplay moment worth a sound. A discriminated union (one member per EVENT_KINDS
 * entry) rather than `{ type: GameEventKind }`, so the shell's dispatch can narrow its
 * default branch to `never` — which is what makes adding a kind without a cue a COMPILE
 * error instead of a silent drop.
 *
 * Every df6-1 cue is a payload-free ONE-SHOT: each moment maps to exactly one SOUND TABLE
 * entry, so no member carries data. (A field nothing reads would be a promise the seam
 * does not keep — the jt5-1 rule.)
 */
export type GameEvent = { readonly [K in GameEventKind]: { readonly type: K } }[GameEventKind]
