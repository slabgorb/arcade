// tests/pause-adoption.test.ts
//
// Story SH2-14 (epic SH2) — RED phase (Furiosa / TEA). red-baron GAINS a pause
// AND jumps its @arcade/shared pin forward. It is the odd cabinet: it still pins
// the pre-font `#v0.5.0` (math3d + rng only), which predates BOTH `/font` and the
// SH2-12 `/pause` + `/esc-overlay` subpaths. This story bumps the pin to the
// published tag that carries them and wires red-baron onto the shared mechanism.
//
// Clean AC-4 resolution (documented in the story context): red-baron needs NO
// separate HUD-font migration — the shared drawEscOverlay strokes its keybind
// card through @shared/font INTERNALLY, so adopting the overlay renders
// red-baron's card in the shared face transitively.
//
// The live pause BEHAVIOUR (keydown edge → freeze → overlay in the rAF loop) is
// AC-5, a MANUAL run — the keydown+rAF wiring has no unit seam (the standing
// "shell IO is verified by running the game" convention). So the automated RED
// drivers pin the WIRING, the PIN BUMP, and the dep-pin CONTRACT:
//   1. adoption   — some src module imports @shared/pause (fails: none does).
//   2. overlay    — some src module imports @shared/esc-overlay (fails: none).
//   3. pin bump   — package.json no longer pins the pre-font #v0.5.0 (AC-4).
//   4. resolution — the pin resolves both subpaths (fails HARD today: #v0.5.0's
//                   exports map has neither /pause nor /esc-overlay).
//
// MONOREPO MIGRATION — driver 3 above, `drops the pre-font #v0.5.0 pin (AC-4)`,
// is REMOVED as false BY DESIGN. It read package.json's `@arcade/shared`
// dependency and asserted the git-URL ref was not `#v0.5.0`. The per-plugin
// package.json is now a three-field stub with no dependencies at all: the shared
// library is in-repo at src/shared, reached through the `@shared` alias, so there
// is no pin, no ref, and nothing that CAN be stale. This is the second of two
// git-URL-pin assertions this import deletes (the other is in scaffold.test.ts);
// both are called out rather than folded in silently, because a pinned dependency
// pipe was a real guard and it is genuinely gone, not re-homed.
//
// Drivers 1, 2 and 4 all SURVIVE, rewritten onto the `@shared` specifier: what
// they assert — that red-baron's own src really imports the shared pause gate and
// esc-overlay, and that both really resolve with their full APIs — is a fact
// about red-baron, not about how the library was delivered.
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

// Runtime-only resolution: keep the specifiers out of Vite's static analysis so
// the (currently unresolvable) subpaths surface as ONE failing test each, not a
// module-graph crash that would silence the wiring + pin drivers.
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

describe('SH2-14 — red-baron adopts @shared/pause + /esc-overlay (AC-1, AC-2, AC-4)', () => {
  it('a src module imports the shared pause gate', () => {
    expect(
      importersOf(PAUSE_IMPORT),
      'no src file imports @shared/pause — red-baron has not wired the pause gate',
    ).not.toHaveLength(0)
  })

  it('a src module imports the shared esc-overlay', () => {
    expect(
      importersOf(ESC_OVERLAY_IMPORT),
      'no src file imports @shared/esc-overlay — red-baron draws no pause overlay',
    ).not.toHaveLength(0)
  })

  it('the shared library resolves /pause with the full gate API', async () => {
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

  it('the shared library resolves /esc-overlay with drawEscOverlay', async () => {
    const overlay = (await import(/* @vite-ignore */ ESC_OVERLAY_SUBPATH)) as unknown as SharedEscOverlayModule
    expect(typeof overlay.drawEscOverlay, 'drawEscOverlay must be exported by @shared/esc-overlay').toBe('function')
  })
})
