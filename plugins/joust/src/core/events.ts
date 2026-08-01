// src/core/events.ts
//
// Story jt5-1 (GREEN, Bicycle Repair Man / Dev) — the CORE half of the joust
// audio seam: a discriminated union of the gameplay moments the sim already
// resolves, carried as DATA on the state the shell already steps.
//
// CORE: pure data. No DOM, no clock, no ambient entropy, no shell import — the
// jt1-7 purity scanner sweeps this file like every other `src/core` module. The
// channel is deliberately DATA and never a callback: a sink handed down from the
// shell would put a function inside the sim, and a seeded replay would then
// depend on what the shell passed in. `stepGame` rebuilds this list every frame
// and the shell reads it off the returned state (`GameState.events`).
//
// ─── SEVENTEEN MOMENTS, AND WHY EXACTLY THESE ────────────────────────────────
// Each kind below is a REAL Williams sound table (JOUSTRV4.SRC:8051-8131, under
// the format header at :8045-8049) whose moment THIS port can actually reach.
// The byte-exact citations — table row, priority byte and call site — live in
// `src/shell/audio.ts`'s CUE_SOURCES, where the suite re-opens both sides of
// every one of them against the vendored 1982 tree.
//
// jt5-3 wires the FLAP (SNPLWD/SNPLWU, SNELWD/SNELWU) — a TWO-EDGE cue that
// jt5-1 deliberately left out: the press plays wing-DOWN (GOFLAP -> FLAST2,
// :6212-6218), the release plays wing-UP (GOFLIP, :6182-6184), and a flap
// TAKE-OFF (STFLY, :6123-6135) jumps straight onto the wing-down cue too. Four
// kinds, not one, because the press and release are DISTINCT sounds for EACH
// species — collapsing wing-down/wing-up into one name would lose the edge the
// whole mechanic turns on. See `src/core/flight.ts`'s `wingEdge` for the law.
//
// jt5-4 wires the THUDS (SNPTHD :8124, SNETHD :8106) — jt5-1 deliberately left
// them out because `collisionPass` COMPUTED the bounce and threw it away
// (`if (contact.outcome.kind !== 'kill') continue`, demo.ts:867 — the line jt5-1
// cited as :837 before jt5-3 shifted it): a thud would have announced a
// collision the sim did not resolve. jt5-4 APPLIES the bounce and cues it —
// SNETHD for an enemy-vs-enemy contact (:4961, "NO KILL (ENEMY VS. ENEMY,
// PTERO VS. PTERO)") and SNPTHD for any tie involving a person (:5010 "BOTH ON
// SAME LEVEL", :8124 "AT LEAST 1 PERSON THUD'ED" — NOT "two players": a buzzard
// tying a standing knight takes this path too). Two kinds, never a bare
// `thud`: the two tables send the same 6-bit code $08 at different priorities
// (020 vs 009), and a collapsed kind cannot be arbitrated by the priority
// jt5-5 owns.
//
// The machine has 38 tables. One family is still left out, for a measured
// reason, not an oversight — a Delivery Finding on the jt5-1 session with its
// ROM lines: the LAVA TROLL grab (SNTROL :8097) cannot fire — `troll.beginGrip`
// has zero production callers, which difficulty.ts:362-367 already records by
// name under owner `uf1-10`.
// A kind declared here but never emitted would sail through the manifest and
// dispatch sweeps — they read this same tuple — and ship a cue that can never
// sound. So the tuple names only what an emitter exists for.

/**
 * Every event kind, as a runtime TUPLE. This is a VALUE on purpose: the shell's
 * manifest and dispatch are swept against it, so "every kind has a cue" is
 * mechanically true rather than merely maintained. The union below is DERIVED
 * from it, so the tuple and the type cannot drift apart.
 */
export const EVENT_KINDS = [
  'enemy-death', //        an enemy lost the joust and became an egg — SNEDIE
  'player-death', //       a knight was unhorsed — SNPDIE
  'egg-collected', //      a knight caught an egg — SNEGG
  'egg-hatched', //        a settled wave egg matured into a remount buzzard — SNEGGH
  'ptero-arrives', //      a pterodactyl (or an anti-stall baiter) entered — SNPTEI
  'ptero-death', //        a pterodactyl took a lance and dissolved — SNPTED
  'player-materialise', // a spent knight re-entered by transporter — SNPCR1
  'enemy-materialise', //  a wave's complement materialised on the pads — SNECRE
  'extra-man', //          a REPLAY threshold was crossed — SNREPL
  'wave-bounty', //        an end-of-wave team bounty was collected — SNBOUN
  'cliff-destroyed', //    a wave's status nibble took a cliff out — SNCLIF
  'player-wing-down', //   a knight pressed the flap (or flap-took-off) — SNPLWD
  'player-wing-up', //     a knight released the flap — SNPLWU
  'enemy-wing-down', //    a buzzard's wings went down on its wake — SNELWD
  'enemy-wing-up', //      a buzzard's wings went up on its wake — SNELWU
  'player-thud', //        a tie involving a person — SNPTHD (priority 020)
  'enemy-thud', //         an enemy-vs-enemy (or ptero-vs-ptero) tie — SNETHD (priority 009)
] as const

/** The discriminant of every event — derived from the tuple, never re-typed. */
export type GameEventKind = (typeof EVENT_KINDS)[number]

/**
 * One gameplay moment worth a sound. A discriminated union (one member per
 * `EVENT_KINDS` entry) rather than `{ type: GameEventKind }`, so the shell's
 * dispatch can narrow its default branch to `never` — which is what makes
 * adding a kind without a cue a COMPILE error instead of a silent drop.
 *
 * The members carry no payload today: every one of the seventeen cues is a bare
 * one-shot, and a field nothing reads would be a promise the seam does not keep.
 */
export type GameEvent = { readonly [K in GameEventKind]: { readonly type: K } }[GameEventKind]
