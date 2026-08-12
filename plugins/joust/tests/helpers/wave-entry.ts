// tests/helpers/wave-entry.ts
//
// Story jt11-4 — the fixture seam for the transporter's waiting room.
//
// Before jt11-4, a wave's ground enemies were spliced into `sim.processes` on ONE
// frame: `createWaveDemo(seed)` handed back an arena with the whole complement
// already standing on the pads, and so did the frame a wave advanced. Dozens of
// suites lean on that — an egg test needs a bird to kill, an audio test needs a
// wing to beat, a ptero test needs the wave held open.
//
// jt11-4 made arrival a QUEUE: each enemy takes a number (CREEM,
// JOUSTRV4.SRC:5663-5666) and waits in CRELP (:5667-5676) until the transporter
// serves it, so an unserved enemy is in `demo.pendingEnemies`, NOT in
// `sim.processes` — it has not materialised yet, and is therefore neither drawn nor
// collidable.
//
// These helpers let a suite say which of those two things it actually meant, rather
// than silently re-testing the arrival cadence it does not care about. Suites that
// are ABOUT the cadence (demo-jt11-4) use none of this — they watch `sim.processes`
// change frame by frame, which is the real observable.

// Typed STRUCTURALLY, against the least a caller must have, rather than by importing
// `DemoState`. tests/helpers/demo-contract.ts deliberately keeps its own independent
// mirror of the demo types (the second-entry discipline pictures-gate.test.ts pins), so
// a helper nominally bound to `src/core/demo.ts` would be unusable from every suite that
// goes through `loadDemo()`. The generic parameter carries the caller's own state type
// straight back out, so nothing widens.

/** The least a demo state must expose for these helpers: an arena and a waiting room. */
export interface WaveEntryView {
  sim: { processes: readonly { kind: string }[] }
  pendingEnemies?: readonly { arrival: unknown }[]
}

/** `stepDemo`, however the suite got hold of it (static import or `loadDemo()`). */
export type StepDemo<T> = (demo: T, inputs?: Record<number, never>) => T

/** How many enemies are still holding a number, unserved. */
export function pendingEnemyCount(demo: WaveEntryView): number {
  return demo.pendingEnemies?.length ?? 0
}

/**
 * The wave's WHOLE complement: the enemies on the pads plus the ones still queued.
 * Use this where a test means "this wave fields N enemies" — a fact about the wave
 * row, independent of how far through the arrival cadence the sim happens to be.
 */
export function waveComplement(demo: WaveEntryView): number {
  return demo.sim.processes.filter((p) => p.kind === 'enemy').length + pendingEnemyCount(demo)
}

/**
 * Seat the whole waiting room AT ONCE, without stepping a frame — the exact frame-0
 * arrangement every suite saw before jt11-4.
 *
 * This is the right migration for a fixture that is about something else entirely
 * (eggs, audio, pteros, trolls, scoring) and merely needs birds in the arena. It
 * changes no other state, spends no RNG and advances no clock, so the test goes on
 * measuring precisely what it measured before — it just stops depending on the
 * insertion timing this story deliberately moved.
 *
 * Do NOT use it to assert anything about arrival cadence; it defeats the very
 * behaviour jt11-4 introduced. Use `seatWaveByStepping` if the frames matter.
 */
export function seatWaveInstantly<T extends WaveEntryView>(demo: T): T {
  const pending = demo.pendingEnemies ?? []
  if (pending.length === 0) return demo
  return {
    ...demo,
    sim: { ...demo.sim, processes: [...demo.sim.processes, ...pending.map((p) => p.arrival)] },
    pendingEnemies: [],
  } as T
}

/**
 * Seat the waiting room the way the sim really does it: step frames until the
 * transporter has served everyone. Costs real frames — the arena moves — so prefer
 * `seatWaveInstantly` unless the test wants the enemies to have actually flown.
 */
export function seatWaveByStepping<T extends WaveEntryView>(demo: T, step: StepDemo<T>, limit = 240): T {
  let d = demo
  for (let i = 0; i < limit && pendingEnemyCount(d) > 0; i++) d = step(d, {})
  if (pendingEnemyCount(d) > 0) {
    throw new Error(`the transporter still had ${pendingEnemyCount(d)} enemy(s) queued after ${limit} frames`)
  }
  return d
}

/**
 * Empty the waiting room — nobody is coming.
 *
 * The long-standing idiom for forcing a wave clear is to strip `sim.processes` down
 * to the players and step. Since jt11-4 an enemy still holding a number counts as
 * alive (it does in the ROM too: its process is running CRELP), so that strip alone
 * no longer clears the wave. Pair it with this.
 */
export function withNoPendingEnemies<T extends WaveEntryView>(demo: T): T {
  return { ...demo, pendingEnemies: [] }
}

/** Strip to the live players AND empty the waiting room: the whole "force a clear" idiom. */
export function strippedToPlayers<T extends WaveEntryView>(demo: T): T {
  return {
    ...withNoPendingEnemies(demo),
    sim: { ...demo.sim, processes: demo.sim.processes.filter((p) => p.kind === 'player') },
  } as T
}
