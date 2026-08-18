// tests/wave-announce-jt13-6.test.ts
//
// Story jt13-6 (RED, Han Solo) — WAVE ANNOUNCEMENTS never render. Core HAS the
// seam (wave.ts `waveBeats()` returns ROM WAVMSG labels per resolved type) but
// the wiring is missing in three places, and this suite reds one per group:
//
//   AC-1  The REAL wave-advance path (`stepSim`'s `clearable` block) emits
//         NO `beat` SimEvents. Today only the wave-1 demo SEED (`createWaveSim`)
//         turns beats into events, so every wave after the
//         first announces nothing. Egg and survival waves are the reported
//         symptom and each is a mode a generic "advance to wave 2" never reaches
//         (typescript.md #27: a gate/emit written from a mode that never produces
//         the thing), so they are pinned EXPLICITLY here.
//
//   AC-2  There is NO label -> on-screen-text map. `waveBeats` returns opaque
//         WAVMSG LABELS ('SURV1', 'EGG1', …); nothing maps them to the ROM's
//         display strings. The strings are ground truth, transcribed here from
//         the original source, NOT invented:
//           MESSEQU.SRC:104-153 (the MSW## EQU table) and PHRASE.SRC (the phrase
//           table the game actually renders), reached from the WAVMSG beat labels
//           at JOUSTRV4.SRC:2416-2433.
//         Following the GAME_OVER_TEXT precedent (core/cabinet.ts holds the ROM
//         string, the shell REUSES it — never re-transcribes), the map is a CORE
//         export.
//
//   AC-3  Nothing on the shell consumes `beat` events, so nothing paints them,
//         and no timing governs how long each beat holds. The ROM holds each beat
//         ~1 second (`WPAUSE LDA #180/6  WAIT A SECOND`, JOUSTRV4.SRC:2045; the
//         message loop's #90/6 at :2601) and the SHELL owns that duration. The
//         defect the user reports is "they never show", so the timing assertions
//         are MAGNITUDE, not ordering (typescript.md #29): a beat holds for a
//         real ~1s, and beat 2 does not replace beat 1 until a whole hold elapses.
//
// The three groups fail independently and for three different missing pieces.

import { describe, it, expect } from 'vitest'
import {
  loadSim,
  type SimState,
  type SimProcess,
  type SimEvent,
} from './helpers/sim-contract.js'
import { loadWave, type Beat, type ResolvedWaveType } from './helpers/wave-contract.js'
import { withNoPendingEnemies } from './helpers/wave-entry.js'

const SEED = 0x1234_5678
const PLAYER1_ID = 1
const PLAYER2_ID = 2

// ─── Ground truth: the ROM WAVMSG label -> display string map ──────────────────
// MESSEQU.SRC:104-153 / PHRASE.SRC, via the WAVMSG beat labels JOUSTRV4.SRC:2416-2433.
// Only the labels `waveBeats` actually emits are listed. Transcribed, not invented.
const ROM_WAVMSG_TEXT: Readonly<Record<string, string>> = {
  INTRO1: 'PREPARE TO JOUST', // MSW00 $53 (PHRASE.SRC)
  INTRO2: 'BUZZARD BAIT!', // MSW01 $54
  COOP1: 'TEAM WAVE', // MSW02 $55
  COOP2: 'BONUS AWARDED FOR TEAM PLAY', // MSW03 $56
  SURV1: 'SURVIVAL WAVE', // MSW14 $FD
  GLAD1: 'GLADIATOR WAVE', // MSW08 $5B
  GLAD2: '3000 POINT BOUNTY', // MSW09 $5C
  GLAD3: 'FOR DISMOUNTING FIRST PLAYER', // MS10 $F5 (PHRASE.SRC byte table — MESSEQU's 'OSTRICH' comment is stale)
  EGG1: 'EGG WAVE', // MSW13 $FC
  PTER1: 'BEWARE OF THE "UNBEATABLE?" PTERODACTYL', // MSW07 $5A
}

// ─── Staging helpers (mirrors tests/demo-jt8-6.test.ts) ────────────────────────

/** A live player process at a neutral airborne position, carrying no ladder credit. */
function playerAt(id: number, posX = 100): SimProcess {
  return {
    id,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    facing: 1,
    mount: id === PLAYER2_ID ? 'stork' : 'ostrich',
    entity: {
      posX,
      posY: 40 << 8,
      velXIndex: 0,
      velXFrac: 0,
      velY: 0,
      timeUp: 1,
      groundState: null,
      plantZ: 0,
      airborne: true,
      animPhase: 0,
    },
  }
}

const withProcesses = (d: SimState, procs: readonly SimProcess[]): SimState => ({
  ...d,
  sim: { ...d.sim, processes: procs },
})

/**
 * A sim staged so the NEXT `stepSim` clears the wave and advances: `clearable`
 * (sim.ts) wants no enemy, no egg, and a live player. `overrideWave` re-points the
 * 1-based wave the advance lands ON (advance computes `state.wave + 1`), so a test
 * can force the advance onto a specific wave TYPE. Clearability depends only on the
 * processes, so the wave override does not disturb it.
 */
const clearableAtWave = (
  d: SimState,
  players: readonly SimProcess[],
  overrideWave?: number,
): SimState => {
  const staged = withNoPendingEnemies(withProcesses(d, players))
  return overrideWave === undefined ? staged : { ...staged, wave: overrideWave }
}

/** The `beat` messages the frame that produced `after` NEWLY emitted (identity diff
 *  against `before.events`, exactly as demo-jt8-6's `eggValuesOf`). */
function newBeatsOf(before: SimState, after: SimState): string[] {
  const prior = new Set(before.events)
  return after.events
    .filter((e) => !prior.has(e))
    .filter((e): e is Extract<SimEvent, { kind: 'beat' }> => e.kind === 'beat')
    .map((e) => e.message)
}

/** The 1-based wave number whose row resolves (solo — p2 out) to `type`. Throws if
 *  no such wave exists in the committed table, so a test can never pass vacuously
 *  by testing a mode the table never produces (typescript.md #27 population guard). */
async function firstWaveResolving(type: ResolvedWaveType): Promise<number> {
  const wave = await loadWave()
  const solo = { p1: true, p2: false }
  for (let n = 2; n <= wave.WAVE_TABLE_LEN; n++) {
    if (wave.dispatchWaveType(wave.waveRowAt(n).status, solo) === type) return n
  }
  throw new Error(`no wave in 1..${wave.WAVE_TABLE_LEN} resolves to '${type}' (solo)`)
}

// ─── AC-1: the real wave-advance path emits the resolved type's beats ──────────

describe('jt13-6 AC-1 — a real wave advance emits WAVMSG beats (sim.ts clearable path)', () => {
  it('advancing ONTO an EGG wave emits exactly the egg beat [EGG1]', async () => {
    const demo = await loadSim()
    const wave = await loadWave()
    const eggWave = await firstWaveResolving('egg')
    const expected = wave.waveBeats('egg').map((b: Beat) => b.message)
    expect(expected).toEqual(['EGG1']) // pins the ground-truth beat list, not the impl

    const before = clearableAtWave(demo.createWaveSim(SEED, 1), [playerAt(PLAYER1_ID)], eggWave - 1)
    const after = demo.stepSim(before, {})
    expect(after.wave).toBe(eggWave)
    expect(newBeatsOf(before, after)).toEqual(['EGG1'])
  })

  it('a SOLO advance onto a co-op-status wave degrades to survival and emits [SURV1]', async () => {
    // typescript.md #27: survival is a mode reached ONLY by the coop->survival degrade
    // when a player is out. A single-player sim (p2 absent) is exactly that mode.
    const demo = await loadSim()
    const wave = await loadWave()
    const survWave = await firstWaveResolving('survival')
    expect(wave.waveBeats('survival').map((b: Beat) => b.message)).toEqual(['SURV1'])

    const before = clearableAtWave(demo.createWaveSim(SEED, 1), [playerAt(PLAYER1_ID)], survWave - 1)
    const after = demo.stepSim(before, {})
    expect(after.wave).toBe(survWave)
    // Must be SURV1, NOT COOP1/COOP2 — proves the advance runs dispatchWaveType
    // (the degrade law), not raw rawWaveType.
    expect(newBeatsOf(before, after)).toEqual(['SURV1'])
  })

  it('the wave-1 demo SEED still emits its intro beats (regression guard on createWaveSim)', async () => {
    // The `createWaveSim` seed path already works; wiring the ADVANCE must not
    // break it. A fresh wave-1 sim carries the intro beats in its event log.
    const demo = await loadSim()
    const wave = await loadWave()
    const seeded = demo.createWaveSim(SEED, 1)
    const seedBeats = seeded.events.filter((e) => e.kind === 'beat').map((e) => (e as { message: string }).message)
    expect(seedBeats).toEqual(wave.waveBeats('intro').map((b: Beat) => b.message))
    expect(seedBeats.length).toBeGreaterThan(0) // non-vacuity: the seed really emits
  })
})

// ─── AC-2: the core label -> ROM-text map ──────────────────────────────────────

interface WaveTextMap {
  waveMessageText(label: string): string
}

/** Load the not-yet-built core WAVMSG text map with a self-describing failure
 *  (the loadWave pattern — runtime specifier so the FILE still collects). */
async function loadWaveText(): Promise<WaveTextMap> {
  const specifier = ['..', 'src', 'core', 'wave.js'].join('/')
  const mod = (await import(/* @vite-ignore */ specifier)) as Partial<WaveTextMap>
  if (typeof mod.waveMessageText !== 'function') {
    throw new Error(
      'the WAVMSG label->text map is not built yet — GREEN (Julia) adds ' +
        '`waveMessageText(label)` to src/core/wave.ts, returning the ROM display ' +
        'string for each WAVMSG beat label (MESSEQU.SRC:104-153 / PHRASE.SRC). ' +
        'Core-owned per the GAME_OVER_TEXT precedent; the shell reuses it.',
    )
  }
  return mod as WaveTextMap
}

describe('jt13-6 AC-2 — waveMessageText maps every WAVMSG label to its ROM string', () => {
  it('maps the reported wave types to their exact ROM display text', async () => {
    const { waveMessageText } = await loadWaveText()
    expect(waveMessageText('EGG1')).toBe('EGG WAVE')
    expect(waveMessageText('SURV1')).toBe('SURVIVAL WAVE')
    expect(waveMessageText('COOP1')).toBe('TEAM WAVE')
    expect(waveMessageText('GLAD1')).toBe('GLADIATOR WAVE')
    expect(waveMessageText('INTRO2')).toBe('BUZZARD BAIT!')
    expect(waveMessageText('PTER1')).toBe('BEWARE OF THE "UNBEATABLE?" PTERODACTYL')
  })

  it('every label EMITTED by waveBeats (all resolved types) has a non-empty ROM text', async () => {
    // typescript.md #19/#27: a wave type whose beat has no display text announces a
    // blank. Sweep the FULL set of emitted labels, not the ones I had in mind.
    const { waveMessageText } = await loadWaveText()
    const wave = await loadWave()
    const types: ResolvedWaveType[] = [
      'intro',
      'coop',
      'survival',
      'gladiator',
      'egg',
      'ptero',
      'nop',
    ]
    const labels = new Set<string>()
    for (const t of types) for (const b of wave.waveBeats(t)) labels.add(b.message)
    expect(labels.size).toBeGreaterThan(0) // non-vacuity: there ARE labels to map

    for (const label of labels) {
      const text = waveMessageText(label)
      expect(text, `${label} must map to a ROM string`).toBe(ROM_WAVMSG_TEXT[label])
      expect(text.length, `${label} text must be non-empty`).toBeGreaterThan(0)
    }
  })
})

// ─── AC-3: the shell consumes beats and holds each ~1s (SHELL owns durations) ───

interface WaveAnnouncer {
  /** Frames one beat holds on screen. ROM: `#180/6` "WAIT A SECOND" (JOUSTRV4.SRC:2045). */
  WAVE_BEAT_HOLD_FRAMES: number
  /** The message showing `framesSinceWave` frames after a wave's beats began, and its
   *  ROM display text — or null once every beat's hold has elapsed. Beats play in order. */
  announcementAt(
    beats: readonly Beat[],
    framesSinceWave: number,
  ): { message: string; text: string } | null
}

async function loadWaveAnnouncer(): Promise<WaveAnnouncer> {
  const specifier = ['..', 'src', 'shell', 'waveAnnounce.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<WaveAnnouncer>
    if (typeof mod.announcementAt !== 'function' || typeof mod.WAVE_BEAT_HOLD_FRAMES !== 'number') {
      throw new Error('missing announcementAt / WAVE_BEAT_HOLD_FRAMES')
    }
    return mod as WaveAnnouncer
  } catch (e) {
    throw new Error(
      'the shell wave-announcer is not built yet — GREEN (Julia) adds ' +
        'src/shell/waveAnnounce.ts: `announcementAt(beats, framesSinceWave)` returns the ' +
        'currently-showing beat (in order, each held WAVE_BEAT_HOLD_FRAMES ~ 1s per the ' +
        'ROM #180/6 at JOUSTRV4.SRC:2045), its `text` sourced from core waveMessageText ' +
        `(reuse, do not re-transcribe). (${(e as Error).message})`,
    )
  }
}

describe('jt13-6 AC-3 — the shell renders each beat with the ROM ~1s hold', () => {
  it('holds a beat for a real ~1 second, not a 1-frame flash (magnitude, not ordering)', async () => {
    const ann = await loadWaveAnnouncer()
    // The ROM's own second-count is #180/6 = 30 (JOUSTRV4.SRC:2045). A hold below that
    // is the "too fast, never seen" bug the user reports. Floor cited, not invented.
    expect(ann.WAVE_BEAT_HOLD_FRAMES).toBeGreaterThanOrEqual(30)
  })

  it('shows a single beat, in the ROM text, then clears after its hold', async () => {
    const ann = await loadWaveAnnouncer()
    const beats: Beat[] = [{ message: 'SURV1' }]
    const hold = ann.WAVE_BEAT_HOLD_FRAMES

    expect(ann.announcementAt(beats, 0)).toEqual({ message: 'SURV1', text: 'SURVIVAL WAVE' })
    // Still up one frame before the hold expires…
    expect(ann.announcementAt(beats, hold - 1)?.message).toBe('SURV1')
    // …and gone once the whole run of beats has elapsed (not permanent).
    expect(ann.announcementAt(beats, hold + 1)).toBeNull()
  })

  it('plays multiple beats IN ORDER, each replacing the last only after a full hold', async () => {
    // intro = [INTRO1, INTRO2]. The gap between them is a MAGNITUDE (a whole hold),
    // so a too-fast impl that flips on frame 1 fails here (typescript.md #29).
    const ann = await loadWaveAnnouncer()
    const beats: Beat[] = [{ message: 'INTRO1' }, { message: 'INTRO2' }]
    const hold = ann.WAVE_BEAT_HOLD_FRAMES

    expect(ann.announcementAt(beats, 0)).toEqual({ message: 'INTRO1', text: 'PREPARE TO JOUST' })
    // Beat 2 must NOT be showing yet mid-way through beat 1's hold:
    expect(ann.announcementAt(beats, hold - 1)?.message).toBe('INTRO1')
    // It takes over only once beat 1's full hold has elapsed:
    expect(ann.announcementAt(beats, hold)).toEqual({ message: 'INTRO2', text: 'BUZZARD BAIT!' })
    // Then everything clears:
    expect(ann.announcementAt(beats, hold * 2 + 1)).toBeNull()
  })

  it("the shell REUSES the core map (no re-transcription): its text equals waveMessageText", async () => {
    const ann = await loadWaveAnnouncer()
    const { waveMessageText } = await loadWaveText()
    const shown = ann.announcementAt([{ message: 'EGG1' }], 0)
    expect(shown?.text).toBe(waveMessageText('EGG1'))
  })
})
