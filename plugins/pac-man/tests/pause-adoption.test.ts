// tests/pause-adoption.test.ts
//
// Story sa1-2 (epic sa1) — RED phase (Leeloo / TEA). pac-man GAINS a pause.
//
// The premise "every game shows the battlezone pause art" is STALE: the shared
// mechanism published by SH2-12 bakes in NO battlezone constant — @shared/pause
// is the pure VERB (INITIAL_PAUSED / isPauseKey / togglePaused / the generic
// stepUnlessPaused<S> thunk gate) and @shared/esc-overlay is the BROWSER card
// (drawEscOverlay: dim + centred keybind card via the shared font), whose LINES,
// COLOUR and OPACITY are per-cabinet NUMBERS the caller supplies. Seven games
// (tempest, star-wars, asteroids, battlezone, red-baron, centipede,
// missile-command) already adopt it, each with its OWN card + colour. pac-man
// is one of the four that adopt NOTHING today — so it has no pause at all, which
// is the real gap this story closes.
//
// The live pause BEHAVIOUR (keydown edge → freeze → overlay in the rAF loop) and
// the "card matches this cabinet's aesthetic, not battlezone's" look are AC-5, a
// MANUAL run — the keydown+rAF wiring has no unit seam (the standing "shell IO is
// verified by running the game" convention; see bz2-5, and the identical asteroids
// SH2-14 adoption driver). So the automated RED drivers pin the WIRING + the
// resolution CONTRACT:
//   1. adoption   — some src module imports @shared/pause (fails today: none does).
//   2. overlay    — some src module imports @shared/esc-overlay (fails today: none).
//   3. resolution — both subpaths resolve with the expected exports.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const srcDir = fileURLToPath(new URL('../src', import.meta.url))

/** Every .ts file under src/. */
function walkTs(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const p = `${dir}/${entry}`
    if (statSync(p).isDirectory()) out.push(...walkTs(p))
    else if (p.endsWith('.ts')) out.push(p)
  }
  return out
}

function importersOf(pattern: RegExp): string[] {
  return walkTs(srcDir)
    .filter((f) => pattern.test(readFileSync(f, 'utf8')))
    .map((f) => f.slice(srcDir.length + 1))
}

const PAUSE_IMPORT = /['"]@shared\/pause['"]/
const ESC_OVERLAY_IMPORT = /['"]@shared\/esc-overlay['"]/

// Runtime-only resolution: keep the specifiers out of Vite's static analysis so an
// unresolvable subpath surfaces as ONE failing test, not a module-graph crash.
const PAUSE_SUBPATH = '@shared/pause'
const ESC_OVERLAY_SUBPATH = '@shared/esc-overlay'

interface SharedPauseModule {
  INITIAL_PAUSED: boolean
  isPauseKey: (key: string) => boolean
  togglePaused: (paused: boolean) => boolean
  stepUnlessPaused: <S>(step: () => S, prev: S, paused: boolean) => S
}
interface SharedEscOverlayModule {
  drawEscOverlay: (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    opts: { lines: readonly string[]; color: string; opacity: number },
  ) => void
}

describe('sa1-2 — pac-man adopts @shared/pause + /esc-overlay (AC-1, AC-2)', () => {
  it('a src module imports the shared pause gate', () => {
    expect(
      importersOf(PAUSE_IMPORT),
      'no src file imports @shared/pause — pac-man has not wired the pause gate',
    ).not.toHaveLength(0)
  })

  it('a src module imports the shared esc-overlay', () => {
    expect(
      importersOf(ESC_OVERLAY_IMPORT),
      'no src file imports @shared/esc-overlay — pac-man draws no pause overlay',
    ).not.toHaveLength(0)
  })

  it('@shared/pause resolves with the full gate API', async () => {
    const pause = (await import(/* @vite-ignore */ PAUSE_SUBPATH)) as unknown as SharedPauseModule
    expect(pause.INITIAL_PAUSED, 'the cabinet boots into play, not frozen').toBe(false)
    expect(typeof pause.isPauseKey, 'isPauseKey must be exported').toBe('function')
    expect(typeof pause.togglePaused, 'togglePaused must be exported').toBe('function')
    expect(typeof pause.stepUnlessPaused, 'stepUnlessPaused thunk gate must be exported').toBe('function')
    // The shared thunk gate: paused ⇒ same reference, step never called.
    const prev = { tag: 'held' }
    let stepCalls = 0
    const held = pause.stepUnlessPaused(() => { stepCalls++; return { tag: 'advanced' } }, prev, true)
    expect(held, 'a paused frame must return the prior state reference untouched').toBe(prev)
    expect(stepCalls, 'a paused frame must not call the step thunk').toBe(0)
  })

  it('@shared/esc-overlay resolves with drawEscOverlay', async () => {
    const overlay = (await import(/* @vite-ignore */ ESC_OVERLAY_SUBPATH)) as unknown as SharedEscOverlayModule
    expect(typeof overlay.drawEscOverlay, 'drawEscOverlay must be exported by @shared/esc-overlay').toBe('function')
  })
})
