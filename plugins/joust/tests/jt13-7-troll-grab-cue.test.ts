// tests/jt13-7-troll-grab-cue.test.ts
//
// Story jt13-7 — RED phase (TEA, Tyr One-Handed). The lava troll's grab is
// SILENT. The ROM's LT1GRP routine loads SNTROL ('MAKE THE SOUND OF THE LAVA
// TROLL / GRIPPING THE PLAYER', JOUSTRV4.SRC:1646-1647; table defined at :8097
// 'CAPTURED BY LAVA TROLL SOUND') and JSR VSND on the frame the troll's hand
// closes on its victim. jt9-11 shipped that grab into production (`beginGrip` is
// called from the grip-commit branch of `stepTrolls` (sim.ts) and from
// `demo.stepTrolls` (difficulty.ts)), but no `'troll-grab'` event kind, cue, or
// manifest entry was ever added — so the grab makes no sound.
//
// ─── WHY 'troll-grab' WAS DEFERRED, AND WHY THAT PREMISE IS NOW DEAD ──────────
// Three existing guard tests still pin `'troll-grab'` as DEFERRED and attribute
// it to owners uf1-10/uf1-11:
//   • audio-events.test.ts  — `const deferred = ['troll-grab']`, asserts it is
//                             NOT in EVENT_KINDS.
//   • audio-flap.test.ts    — reads that array and asserts `.toContain('troll-grab')`.
//   • audio-thud.test.ts    — reads that array and asserts `.toContain('troll-grab')`.
// Their stated premise — "no reachable moment in the sim today" / "zero
// production callers" — is FALSE as of jt9-11 (the grab is live in `stepTrolls`).
// uf1-10/uf1-11 do not exist in the sprint (active or archive); the ownership is
// stale. So wiring `'troll-grab'` here will REDDEN those three guards, and that
// is EXPECTED, not a regression: GREEN requires Dev to UPDATE them (drop
// 'troll-grab' from the deferred set, re-point the ownership to jt13-7), NOT to
// revert the wiring to keep them green. This file does not duplicate those
// guards — adding 'troll-grab' to EVENT_KINDS below forces their update for the
// suite to go green, which is the whole of AC4.
//
// ─── THE CHANNEL ─────────────────────────────────────────────────────────────
// The shell plays `GameState.events` (`pumpFrames` in main.ts calls
// playEventSounds(audio, game.events)), and stepGame lifts the sim's cue stream
// into it verbatim (`events: [...sim.cues, ...]`, game.ts) — a generic lift pinned for
// every other cue. So a cue reaches the shell iff the SIM STEP puts it in
// `sim.cues`; a moment dropped into the sim's score-event LOG instead of its cue
// stream never sounds. The behavioural test drives a real grab through `stepSim`
// (the demo-jt9-11 idiom — the authoritative troll-grip harness) and asserts on
// `sim.cues`, which forces the correct channel. The AC2 dispatch test then closes
// the chain: sim.cues -> game.events -> playEventSounds -> play('trollGrab').
//
// node env (dynamic import of the modules off disk). This header never spells
// the vitest env directive as a token.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { load } from './helpers/dynamic-load'
import { loadSim, type SimState, type SimProcess, type EntityState } from './helpers/sim-contract.js'
import { withNoPendingEnemies } from './helpers/wave-entry.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const eventsPath = join(root, 'src', 'core', 'events.ts')

const SEED = 0x1234_5678
const PLAYER1_ID = 1

// ROM constants for staging the grab (re-derived byte-for-byte in
// demo-jt9-11-source.test.ts; used here only to drive the behaviour).
const EXTENDED_FRAME = 5 * 6 //          :1614 — CMPA #5*6 (the extended grab frame)
const GRIP_Y_OFFSET = 10 - 7 //          :1667 — ADDB #10-7 (proper hand-grip offset, +3)

// ─── staging (the demo-jt9-11 idiom) ─────────────────────────────────────────

function entityAt(posX: number, pixelY: number, over: Partial<EntityState> = {}): EntityState {
  return {
    posX,
    posY: pixelY << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 1,
    groundState: null,
    plantZ: 0,
    airborne: true,
    animPhase: 0,
    ...over,
  }
}

function playerAt(id: number, posX: number, pixelY: number, over: Partial<EntityState> = {}): SimProcess {
  return {
    id,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    facing: 1,
    mount: 'ostrich',
    entity: entityAt(posX, pixelY, over),
  } as SimProcess
}

/** A lava troll already bound to a victim and staged AT the grip point, so the
 *  next few steps commit the grab (LT1GRP → beginGrip). */
function trollAtGrip(victimId: number, posX: number, pixelY: number): SimProcess {
  return {
    id: 0x15_0000 + victimId,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'troll',
    facing: 1,
    collisionEnabled: true,
    victimId,
    entity: entityAt(posX, pixelY, { animPhase: EXTENDED_FRAME / 6 }),
  } as SimProcess
}

/** A wave-4 sim (the troll is only active once the bridge has burned, wave >= 4)
 *  with a player and a troll staged one step short of the grab. */
async function aboutToGrabSim(): Promise<SimState> {
  const smod = await loadSim()
  const base = smod.createWaveSim(SEED, 4)
  // Within the troll's vertical reach (>= FLOOR+7-32 = 198, the LAVVI3 line, pt1-16). A
  // victim staged ABOVE that line would be released the instant the grip commits
  // (outOfTrollReach), resolving the grab in a frame or two — so the "never resolves in
  // this window" invariant this file leans on requires an in-reach, near-the-lava grab.
  const victimY = 205
  const gripY = victimY + GRIP_Y_OFFSET
  return withNoPendingEnemies({
    ...base,
    wave: 4,
    sim: {
      ...base.sim,
      processes: [playerAt(PLAYER1_ID, 100, victimY), trollAtGrip(PLAYER1_ID, 98, gripY)],
    },
    arena: { ...base.arena, bridgeBurned: true },
  })
}

/** The victim carries `grippedBy` (the troll's id) the moment the grab commits.
 *  The sim-contract process type does not surface it, so read it through a narrow
 *  widening — the same idiom this suite uses for `lavaSink`/`grip`. */
const grabCommitted = (d: SimState): boolean =>
  d.sim.processes.some((p) => (p as { grippedBy?: number }).grippedBy !== undefined)

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — the grab emits a 'troll-grab' moment
// ═════════════════════════════════════════════════════════════════════════════
describe('jt13-7 AC1 — the lava-troll grab is a first-class event kind', () => {
  it("EVENT_KINDS includes 'troll-grab'", async () => {
    const kinds = (await load<{ EVENT_KINDS: readonly string[] }>(import.meta.url, ['..', 'src', 'core', 'events']))
      .EVENT_KINDS
    expect(kinds, 'src/core/events.ts must export EVENT_KINDS').toBeDefined()
    expect(
      kinds as readonly string[],
      "'troll-grab' must join EVENT_KINDS — the grab is a real Williams table (SNTROL :8097)",
    ).toContain('troll-grab')
  })

  it('a real production grab emits a single troll-grab cue on the frame the hand closes', async () => {
    const smod = await loadSim()
    let d = await aboutToGrabSim()

    const kinds: string[] = []
    let committed = false
    // A handful of frames covers the LT1HT close + the grab; well inside the
    // 30-second grace, so the outcome (break-free / lava) never resolves here.
    for (let i = 0; i < 12; i++) {
      d = smod.stepSim(d)
      for (const c of d.cues) kinds.push(c.type)
      if (grabCommitted(d)) committed = true
    }

    // Non-vacuity: the scenario must ACTUALLY grab, or the cue assertion proves
    // nothing. If this fails, the fixture drifted — fix it before reading below.
    expect(committed, 'the staged troll must commit the grab within the window').toBe(true)
    expect(
      kinds,
      "the grab is heard as its own SNTROL cue, not silence — emit { type: 'troll-grab' } at beginGrip",
    ).toContain('troll-grab')
    // Fires ONCE — the hand closes on one frame; the grip's later escalation
    // frames must not re-sound it (a corpse does not re-grab).
    expect(
      kinds.filter((k) => k === 'troll-grab').length,
      'the SNTROL cue fires once at the grab onset, not every grip frame',
    ).toBe(1)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — the cue is wired: dispatch maps it, the manifest names it, provenance cites SNTROL
// ═════════════════════════════════════════════════════════════════════════════
type PlayEventSounds = (audio: { play(name: string): void; tick(): void }, events: readonly { type: string }[]) => void

function recordingAudio(): { play(n: string): void; tick(): void; played: string[] } {
  const played: string[] = []
  return { played, play: (n) => void played.push(n), tick: () => {} }
}

describe('jt13-7 AC2 — the SNTROL cue is reachable through the audio seam', () => {
  it("playEventSounds plays the trollGrab cue for a 'troll-grab' event", async () => {
    const play = (
      await load<{ playEventSounds: PlayEventSounds }>(import.meta.url, ['..', 'src', 'shell', 'audio-dispatch'])
    ).playEventSounds
    if (typeof play !== 'function') throw new Error('audio-dispatch.ts must export playEventSounds')
    const audio = recordingAudio()
    play(audio, [{ type: 'troll-grab' }])
    expect(
      audio.played,
      "audio-dispatch's cueFor must map 'troll-grab' -> 'trollGrab' (SNTROL)",
    ).toContain('trollGrab')
  })

  it('SOUNDS names a trollGrab wav', async () => {
    const sounds = (
      await load<{ SOUNDS: Readonly<Record<string, string>> }>(import.meta.url, ['..', 'src', 'shell', 'audio'])
    ).SOUNDS
    if (sounds === undefined) throw new Error('src/shell/audio.ts must export SOUNDS')
    expect(sounds['trollGrab'], 'the manifest must carry a trollGrab cue file').toBeDefined()
    expect(sounds['trollGrab']).toMatch(/\.wav$/)
  })

  it('CUE_SOURCES carries an authentic SNTROL provenance record for trollGrab', async () => {
    const cueSources = (
      await load<{ CUE_SOURCES: Readonly<Record<string, { kind: string; table?: string }>> }>(
        import.meta.url,
        ['..', 'src', 'shell', 'audio-manifest'],
      )
    ).CUE_SOURCES
    if (cueSources === undefined) throw new Error('src/shell/audio-manifest.ts must export CUE_SOURCES')
    const entry = cueSources['trollGrab']
    expect(entry, 'trollGrab must have a CUE_SOURCES provenance record — no cue ships uncited').toBeDefined()
    expect(entry.kind, 'the SNTROL cue is a real ROM table, not an invention').toBe('rom')
    expect(entry.table, 'the cue must cite the SNTROL table').toBe('SNTROL')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — the stale "zero production callers" comment is corrected
// ═════════════════════════════════════════════════════════════════════════════
describe('jt13-7 AC3 — events.ts no longer claims the grab is production-dead', () => {
  it('the "zero production callers" claim is gone from src/core/events.ts', () => {
    expect(existsSync(eventsPath)).toBe(true)
    const src = readFileSync(eventsPath, 'utf8')
    // jt9-11 gave beginGrip a production caller (`stepTrolls` in sim.ts, and
    // `demo.stepTrolls` in difficulty.ts); the comment asserting the opposite is
    // now false and must be corrected.
    expect(
      src.includes('zero production callers'),
      'events.ts still asserts troll.beginGrip has "zero production callers" — false since jt9-11',
    ).toBe(false)
  })
})
