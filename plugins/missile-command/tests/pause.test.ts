// plugins/missile-command/tests/pause.test.ts
//
// Story mc6-3 — RED phase (Tyr One-Handed / TEA). PAUSE toggle: the play <-> pause
// transition, the stepGame FREEZE while paused ("no-op but the clock"), the shell
// key binding, and the shared pause overlay. Builds on mc6-1's MAINLINE dispatch
// (state.ts: the 'pause' phase, S_PAUS=0x80, mainline('pause')==='pause') and mc6-2's
// shell reducer seam (input.ts).
//
// ─── GROUND TRUTH (REV-01) ───────────────────────────────────────────────────
// STATE is the one-byte GAME STATE (PLAY,PAUSE,OR SETUP) (W3MAIN.MAC:131). MAINLINE
// dispatches on its sign: STATE < 0 (high bit, S.PAUS=0x80) takes IFMI -> JSR PAUSE
// (W3MAIN.MAC:517). The PAUSE handler is its OWN routine (.SBTTL PAUSE STATE,
// W3MAIN.MAC:615; PAUSE: label, :617) — it does NOT run PLAY. Its body reads FRAME,
// AND I,03, "UPDATE EVERY 4/60 SEC" (:619-623), i.e. it only advances a display
// timer (PAUST) every 4th video frame; the battle simulation (spawn, flight, damage,
// score) is not stepped. That IS the fidelity contract mc6-3 pins: while STATE is
// S.PAUS the clock runs but the game is frozen.
//
// ─── DESIGN (mc6-1 O-6a phase-model precedent) ───────────────────────────────
// MC models pause as a first-class PHASE ('pause'), not battlezone's shell boolean —
// state.ts already committed to that (Phase includes 'pause', S_PAUS, mainline). So:
//   • CORE: a pure `togglePause(phase): Phase` (state.ts) flips 'play' <-> 'pause'
//     and is a NO-OP for every other phase (you cannot pause attract/over/between/
//     setup). And `stepGame` gains a 'pause' branch mirroring the 'over' freeze:
//     only `frame` advances, `soundEvents` is emptied, every other field is held.
//   • SHELL: a pure `pauseFromKey(key, state): GameState` (input.ts) that, when the
//     key is the pause key, returns the state with `togglePause`d phase; else the
//     state unchanged. It REUSES `isPauseKey` from @shared/pause (the shared VERB) —
//     lowercasing the raw DOM key first, as fireKeyToBase does (event.key is
//     'Escape', capital). This is the pause-key binding.
//   • OVERLAY: `drawFrame` draws the shared pause overlay when `state.phase` is
//     'pause', via a `drawPauseOverlay(ctx, w, h)` that REUSES `drawEscOverlay` from
//     @shared/esc-overlay (the battlezone drawPauseOverlay precedent) — a full-
//     viewport dim + centred keybind card over the frozen scene.
//
//   NOTE (Delivery Finding D-1, mc6-3): the story says "reuses @shared/pause for the
//   overlay". The shared OVERLAY drawer is @shared/esc-overlay (`drawEscOverlay`);
//   @shared/pause supplies the key VERB (`isPauseKey`). mc6-3 reuses BOTH shared
//   modules — pause for the key, esc-overlay for the overlay — exactly as battlezone
//   does. The ACs below are written to that (faithful) reading.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `togglePause` (core/state.ts), `pauseFromKey` (shell/input.ts) and
// `drawPauseOverlay` (shell/render.ts) do not exist yet — self-describing dynamic
// loaders redden for the FEATURE's absence, not a raw resolution stack (the mc6-2
// idiom). `stepGame` has no 'pause' branch, so today it runs the full combat step on
// a paused state AND flips it to 'play' (nextPhase('pause', liveCities) === 'play'),
// so the freeze assertions fail hard. `drawFrame` ignores `state.phase`, so it paints
// no overlay when paused.
//
// AC5 is the EXCEPTION — GREEN on arrival, by design. mc6-3 introduces NO new numeric
// constant (S.PAUS is already cited by mc6-1's MC-STATE-PAUS), so it files NO new claim,
// exactly as mc3's state.ts "carries no claim". The PAUSE STATE anchor
// (MC-ANCH-W3MAIN-615, `.SBTTL PAUSE STATE`) is already committed by the rom-study
// bootstrap. AC5 GUARDS that citation (it reddens only if the anchor is deleted); it
// drives no Dev work. Dev writes NO claim for mc6-3.

import { describe, it, expect } from 'vitest'
import { createPlayGame, stepGame, type GameState } from '../src/core/game.js'
import { S_PLAY, S_PAUS, stateCode, mainline, type Phase } from '../src/core/state.js'
import { drawFrame } from '../src/shell/render.js'
import { isPauseKey } from '@shared/pause'
import type { Icbm } from '../src/core/icbm.js'
import type { Abm } from '../src/core/abm.js'
import type { Explosion } from '../src/core/explosion.js'
import { loadClaims, claimCovers } from './helpers/claims.js'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// ─── the contracts GREEN (Loki / Dev) implements ─────────────────────────────
// Variable specifier + /* @vite-ignore */ so `tsc --noEmit` stays green while the
// new surface is still absent (the mc6-1/mc6-2 state/input loader idiom).
const STATE_SPECIFIER = '../src/core/state.js'
const INPUT_SPECIFIER = '../src/shell/input.js'
const RENDER_SPECIFIER = '../src/shell/render.js'

type TogglePause = (phase: Phase) => Phase
type PauseFromKey = (key: string, state: GameState) => GameState
type DrawPauseOverlay = (ctx: CanvasRenderingContext2D, w: number, h: number) => void

async function loadTogglePause(): Promise<TogglePause> {
  const mod = (await import(/* @vite-ignore */ STATE_SPECIFIER)) as Record<string, unknown>
  if (typeof mod.togglePause !== 'function') {
    throw new Error(
      'togglePause not built yet — GREEN (Loki) adds a PURE `togglePause(phase): Phase` to ' +
        "src/core/state.ts: 'play' -> 'pause', 'pause' -> 'play', and EVERY other phase " +
        '(attract/setup/between/over) returned UNCHANGED — you cannot pause a non-playing state. ' +
        'No clock, no entropy; the PAUSE STATE, W3MAIN.MAC:615/:617.',
    )
  }
  return mod.togglePause as TogglePause
}

async function loadPauseFromKey(): Promise<PauseFromKey> {
  const mod = (await import(/* @vite-ignore */ INPUT_SPECIFIER)) as Record<string, unknown>
  if (typeof mod.pauseFromKey !== 'function') {
    throw new Error(
      'pauseFromKey not built yet — GREEN (Loki) adds `pauseFromKey(key, state): GameState` to ' +
        'src/shell/input.ts: when `isPauseKey(key.toLowerCase())` (REUSE @shared/pause — event.key ' +
        "is 'Escape', capital, so lowercase first as fireKeyToBase does), return " +
        '{ ...state, phase: togglePause(state.phase) }; otherwise return `state` unchanged. It only ' +
        'flips the phase — it launches no ABM and spends no ammo.',
    )
  }
  return mod.pauseFromKey as PauseFromKey
}

async function loadDrawPauseOverlay(): Promise<DrawPauseOverlay> {
  const mod = (await import(/* @vite-ignore */ RENDER_SPECIFIER)) as Record<string, unknown>
  if (typeof mod.drawPauseOverlay !== 'function') {
    throw new Error(
      'drawPauseOverlay not built yet — GREEN (Loki) adds `drawPauseOverlay(ctx, w, h)` to ' +
        'src/shell/render.ts REUSING `drawEscOverlay` from @shared/esc-overlay (the battlezone ' +
        'precedent): a full-viewport dim panel + a centred keybind card over the frozen scene, with ' +
        "MC's own card copy/colour/opacity. drawFrame must call it when state.phase === 'pause'.",
    )
  }
  return mod.drawPauseOverlay as DrawPauseOverlay
}

// ─── fixtures ────────────────────────────────────────────────────────────────

/** A single ballistic ICBM mid-descent (well above the ground), so it visibly MOVES
 *  under a live `stepGame` — the synthetic input that makes the freeze test real
 *  rather than an inert board. RNG-free literal. */
const anIcbm = (): Icbm => ({
  origin: { h: 100, v: 231 },
  target: { h: 100, v: 0 },
  pos: { h: 100, v: 150 },
  arrived: false,
})

/** A player ABM in flight (pos != target), so it advances under a live step. */
const anAbm = (): Abm => ({
  origin: { h: 50, v: 0 },
  target: { h: 120, v: 180 },
  pos: { h: 60, v: 26 },
  arrived: false,
})

/** A young blast (t=0), so it ages under a live step. */
const anExplosion = (): Explosion => ({ h: 120, v: 180, t: 0 })

/** A rich mid-battle game in `phase`: a live descending ICBM, an ABM in flight, an
 *  aging blast, a partial score, and an unspent ICBM budget over live targets — so a
 *  LIVE `stepGame` (phase 'play') would move enemies, fly missiles, age blasts, and
 *  spawn. `soundEvents` is [] so a correct paused step differs from the input ONLY in
 *  `frame`. All derive from createPlayGame(1), so the rng word is fixed. */
const midBattle = (phase: Phase): GameState => ({
  ...createPlayGame(1),
  phase,
  score: 500,
  icbms: [anIcbm()],
  abms: [anAbm()],
  explosions: [anExplosion()],
  remaining: 5,
  frame: 42,
  soundEvents: [],
})

/** A recording canvas ctx: every method is a no-op except `fillRect`, which counts
 *  FULL-VIEWPORT fills (x=0,y=0,w=W,h=H). render/overlay use only void ctx ops (no
 *  value-returning methods), so this Proxy survives both drawFrame and drawEscOverlay.
 *  clearField paints exactly one full-viewport fill (the sky); the shared pause
 *  overlay's dim panel adds a second — so the count distinguishes paused from live. */
function recordingCtx(width: number, height: number): {
  ctx: CanvasRenderingContext2D
  fullViewportFills: () => number
} {
  let n = 0
  const target: Record<string, unknown> = {
    fillRect: (x: number, y: number, w: number, h: number): void => {
      if (x === 0 && y === 0 && w === width && h === height) n += 1
    },
    canvas: { width, height },
  }
  const noop = (): void => {}
  const ctx = new Proxy(target, {
    get(t, prop): unknown {
      return prop in t ? t[prop as string] : noop
    },
    set(t, prop, value): boolean {
      t[prop as string] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, fullViewportFills: () => n }
}

const NON_TOGGLE_PHASES: readonly Phase[] = ['attract', 'setup', 'between', 'over']

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — togglePause: the pure play <-> pause flip, a no-op everywhere else, and it
//        lands on the REAL PAUSE state (S_PAUS / the PAUSE handler), not a lookalike.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-3 AC1 — togglePause flips play <-> pause (pure, total over Phase)', () => {
  it("'play' toggles to 'pause'", async () => {
    const togglePause = await loadTogglePause()
    expect(togglePause('play')).toBe('pause')
  })

  it("'pause' toggles back to 'play'", async () => {
    const togglePause = await loadTogglePause()
    expect(togglePause('pause')).toBe('play')
  })

  it('is an involution on the play/pause pair (toggle twice returns the start)', async () => {
    const togglePause = await loadTogglePause()
    expect(togglePause(togglePause('play'))).toBe('play')
    expect(togglePause(togglePause('pause'))).toBe('pause')
  })

  it.each(NON_TOGGLE_PHASES)("'%s' is NOT pausable — togglePause returns it unchanged", async (phase) => {
    const togglePause = await loadTogglePause()
    // You cannot pause the attract demo, a between-wave beat, a setup step, or a
    // finished game — only a live 'play' game pauses.
    expect(togglePause(phase)).toBe(phase)
  })

  it('the toggle lands on the ROM PAUSE state — its STATE code is S_PAUS and it dispatches to PAUSE', async () => {
    const togglePause = await loadTogglePause()
    // Independent literals (mc6-1's exported S_PLAY/S_PAUS + mainline), NOT re-derived
    // from togglePause — so a toggle that returned some other phase with a lookalike
    // code cannot pass by matching a copy of itself (Heimdall rule #18).
    expect(stateCode(togglePause('play'))).toBe(S_PAUS)
    expect(mainline(togglePause('play'))).toBe('pause')
    expect(stateCode(togglePause('pause'))).toBe(S_PLAY)
    expect(mainline(togglePause('pause'))).toBe('play')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — stepGame FREEZES the battle while paused: only `frame` advances (the clock),
//        every simulation field is held, and the sound channel is quiet. The ROM's
//        MAINLINE JSRs PAUSE (not PLAY) while STATE is S.PAUS (W3MAIN.MAC:517/:615).
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-3 AC2 — stepGame is a no-op but the clock while phase is pause', () => {
  it('advances only the frame counter — every other field is byte-identical', async () => {
    const paused = midBattle('pause')
    const after = stepGame(paused)
    // The clock ticks…
    expect(after.frame).toBe(paused.frame + 1)
    expect(after.phase).toBe('pause')
    // …and NOTHING else moved: the whole state minus the frame equals the input.
    expect({ ...after, frame: paused.frame }).toEqual(paused)
  })

  it('holds each simulation field explicitly (readable failures)', async () => {
    const paused = midBattle('pause')
    const after = stepGame(paused)
    expect(after.icbms).toEqual(paused.icbms) // enemy motion frozen
    expect(after.abms).toEqual(paused.abms) // ABM flight frozen
    expect(after.explosions).toEqual(paused.explosions) // blasts do not age
    expect(after.score).toBe(paused.score) // scoring frozen
    expect(after.remaining).toBe(paused.remaining) // spawn budget frozen (no spawn)
    expect(after.cities).toEqual(paused.cities)
    expect(after.bases).toEqual(paused.bases)
    expect(after.sputniks).toEqual(paused.sputniks)
    expect(after.wave).toBe(paused.wave)
    expect(after.soundEvents).toEqual([]) // quiet while paused
  })

  it('stays frozen across many paused frames (only the clock accumulates)', async () => {
    const paused = midBattle('pause')
    let s = paused
    for (let i = 1; i <= 3; i++) {
      s = stepGame(s)
      expect(s.phase).toBe('pause')
      expect(s.frame).toBe(paused.frame + i)
      // sim state unchanged from the original throughout — the pause banks time, not motion.
      expect({ ...s, frame: paused.frame }).toEqual(paused)
    }
  })

  it('CONTROL: the SAME board in phase play DOES advance — the freeze is real, not an inert input', () => {
    // Identical fixture, only the phase differs. A live step must move the ICBM down
    // (and generally change the board); the paused step above left it exactly put.
    const paused = midBattle('pause')
    const playing = midBattle('play')
    const pausedIcbmV = stepGame(paused).icbms[0].pos.v
    const playedIcbmV = stepGame(playing).icbms[0].pos.v
    expect(pausedIcbmV).toBe(paused.icbms[0].pos.v) // paused: unmoved
    expect(playedIcbmV).toBeLessThan(playing.icbms[0].pos.v) // playing: descended
    // And more broadly, a live step is NOT merely the input with frame+1.
    expect({ ...stepGame(playing), frame: playing.frame }).not.toEqual(playing)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — pauseFromKey: the shell binds the pause key by REUSING @shared/pause's
//        isPauseKey, toggling the phase and touching nothing else.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-3 AC3 — pauseFromKey binds the pause key (reuses @shared/pause)', () => {
  it("the raw DOM key 'Escape' (capital) pauses a live game", async () => {
    const pauseFromKey = await loadPauseFromKey()
    // event.key is 'Escape' — the reducer must lowercase before isPauseKey, or the
    // real keydown never pauses.
    expect(pauseFromKey('Escape', createPlayGame(1)).phase).toBe('pause')
  })

  it("lowercase 'escape' pauses too, and toggles a paused game back to play", async () => {
    const pauseFromKey = await loadPauseFromKey()
    expect(pauseFromKey('escape', createPlayGame(1)).phase).toBe('pause')
    expect(pauseFromKey('Escape', midBattle('pause')).phase).toBe('play')
  })

  it('toggles the phase for EXACTLY the keys @shared/pause calls pause keys, and no others', async () => {
    const pauseFromKey = await loadPauseFromKey()
    const play = createPlayGame(1)
    for (const key of ['Escape', 'escape', 'z', 'x', 'c', 'q', ' ', 'Enter']) {
      const expectedToggles = isPauseKey(key.toLowerCase()) // the reuse point
      const changed = pauseFromKey(key, play).phase !== play.phase
      expect(changed, `pauseFromKey('${key}') toggle should match isPauseKey`).toBe(expectedToggles)
    }
  })

  it('a pause keypress flips ONLY the phase — no other field changes', async () => {
    const pauseFromKey = await loadPauseFromKey()
    const play = createPlayGame(1)
    const after = pauseFromKey('Escape', play)
    expect({ ...after, phase: play.phase }).toEqual(play)
  })

  it('launches no ABM and spends no ammo (it is not a fire key)', async () => {
    const pauseFromKey = await loadPauseFromKey()
    const play = createPlayGame(1)
    const after = pauseFromKey('Escape', play)
    expect(after.abms).toEqual([]) // no missile launched
    expect(after.bases).toEqual(play.bases) // no ammo spent
  })

  // Every non-pausable phase, not just attract/over: a pauseFromKey that re-rolled
  // its own phase check (instead of delegating to togglePause) could force
  // 'setup'/'between' into 'play' and stay invisible to a two-phase list. Mirror
  // AC1's NON_TOGGLE_PHASES coverage. (Heimdall round-1 test-gap finding.)
  it.each(NON_TOGGLE_PHASES)("the pause key is a no-op in '%s' (only a live or paused game toggles)", async (phase) => {
    const pauseFromKey = await loadPauseFromKey()
    const s: GameState = { ...createPlayGame(1), phase }
    expect(pauseFromKey('Escape', s)).toEqual(s)
  })

  it('a non-pause key returns the state unchanged (no accidental toggle)', async () => {
    const pauseFromKey = await loadPauseFromKey()
    const play = createPlayGame(1)
    expect(pauseFromKey('q', play)).toEqual(play)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC4 — the shared pause overlay: drawPauseOverlay reuses @shared/esc-overlay's dim
//        panel, and drawFrame draws it ONLY when the phase is 'pause'. Behavioural
//        via a recording ctx — no source-text grep (render is node-importable).
// ═════════════════════════════════════════════════════════════════════════════
const W = 640
const H = 480

describe('mc6-3 AC4 — the frozen scene is dimmed by the shared pause overlay', () => {
  it('drawPauseOverlay dims the FULL viewport (reuses drawEscOverlay: fillRect(0,0,w,h))', async () => {
    const drawPauseOverlay = await loadDrawPauseOverlay()
    const { ctx, fullViewportFills } = recordingCtx(W, H)
    drawPauseOverlay(ctx, W, H)
    // drawEscOverlay's first act is a full-viewport dim panel — so at least one
    // fillRect(0,0,W,H) must have been issued.
    expect(fullViewportFills()).toBeGreaterThanOrEqual(1)
  })

  it('drawFrame paints the overlay when paused and NOT when playing', async () => {
    // A live frame: clearField's sky is the ONLY full-viewport fill.
    const live = recordingCtx(W, H)
    drawFrame(live.ctx, midBattle('play'), W, H)
    const playFills = live.fullViewportFills()

    // A paused frame: same scene PLUS the overlay's dim panel — strictly more.
    const held = recordingCtx(W, H)
    drawFrame(held.ctx, midBattle('pause'), W, H)
    const pauseFills = held.fullViewportFills()

    expect(playFills).toBeGreaterThanOrEqual(1) // the sky clear
    expect(pauseFills).toBeGreaterThan(playFills) // the added overlay dim
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC5 — CITATION DISCIPLINE (GREEN GUARD, not a driver). mc6-3 introduces no new
//        constant, so it files no new claim. But its freeze fidelity rests on the
//        PAUSE STATE being its own ROM handler (W3MAIN.MAC:615 `.SBTTL PAUSE STATE`),
//        already committed as MC-ANCH-W3MAIN-615 by the rom-study bootstrap. These
//        tests GUARD that anchor stays filed and byte-true — they redden only if it
//        is deleted or corrupted. Dev writes NO claim for this story.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-3 AC5 — the PAUSE STATE anchor W3MAIN.MAC:615 stays committed (guard)', () => {
  it('a committed claim covers W3MAIN.MAC:615 (the PAUSE STATE anchor)', () => {
    const claims = loadClaims()
    expect(
      claimCovers(claims, 'W3MAIN.MAC', 615, 615),
      'the PAUSE STATE anchor at W3MAIN.MAC:615 (MC-ANCH-W3MAIN-615) has gone missing — mc6-3 relies on it',
    ).toBe(true)
  })

  it('that claim carries the mc {symbol,meaning,source} shape at W3MAIN.MAC:615', () => {
    const claims = loadClaims()
    const c = claims.find((x) => x.source.file === 'W3MAIN.MAC' && x.source.line === 615)
    expect(c, 'the W3MAIN.MAC:615 PAUSE anchor is not committed').toBeDefined()
    expect(typeof c!.symbol).toBe('string')
    expect(c!.symbol.length).toBeGreaterThan(0)
    expect(c!.meaning.length).toBeGreaterThan(0)
    expect(c!.source.verbatim.length).toBeGreaterThan(0)
  })
})

// ─── AC5 (double-entry): the cited line really is the PAUSE STATE section, and the
//     committed verbatim matches it byte-for-byte. Byte-gated — the reference tree is
//     gitignored, so this skips on CI (the mc6-1 AC8 / jt1-3 pattern). ─────────────
const W3MAIN = join(dirname(fileURLToPath(import.meta.url)), '..', 'reference', 'source', 'W3MAIN.MAC')
const sourceAvailable = existsSync(W3MAIN)
const lineAt = (n: number): string => (readFileSync(W3MAIN, 'utf8').split('\n')[n - 1] ?? '').replace(/\r$/, '')

describe.skipIf(!sourceAvailable)('mc6-3 AC5 — W3MAIN.MAC:615 is the PAUSE STATE section, matching the claim', () => {
  it('W3MAIN.MAC:615 is the .SBTTL PAUSE STATE header', () => {
    expect(lineAt(615)).toMatch(/\.SBTTL\s+PAUSE STATE/)
  })

  it("the committed W3MAIN.MAC:615 claim's verbatim equals the source line byte-for-byte", () => {
    const claims = loadClaims()
    const c = claims.find((x) => x.source.file === 'W3MAIN.MAC' && x.source.line === 615)
    expect(c, 'the W3MAIN.MAC:615 PAUSE claim is not committed').toBeDefined()
    expect(c!.source.verbatim).toBe(lineAt(615))
  })
})
