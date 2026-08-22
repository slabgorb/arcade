// tests/pause-adoption.test.ts
//
// Story SH2-14 (epic SH2) — RED phase (Furiosa / TEA). tempest GAINS a pause:
// today only battlezone pauses, and SH2-12 published the shared mechanism as two
// shared-library subpaths — PURE `/pause` (INITIAL_PAUSED / isPauseKey /
// togglePaused / the generic `stepUnlessPaused<S>(step, prev, paused)` thunk gate)
// and BROWSER `/esc-overlay` (drawEscOverlay: dim + centred keybind card via the
// shared font). This story wired tempest onto them: an Escape keydown EDGE
// toggled pause, the frozen-frame gate held the sim, and drawEscOverlay drew
// over the held world — with tempest supplying its OWN keybind card + colour
// (per-cabinet NUMBERS), per the epic's share-the-VERB-not-the-NUMBERS rule.
//
// sa1-5 (Option A) supersedes AC-2: the rebindable @shared/controls-overlay now
// OWNS pause chrome outright — Escape opens it, and it draws the dim+card itself
// (drawControlsOverlay, not drawEscOverlay). tempest drops its drawEscOverlay
// import entirely; @shared/pause's VERB (isPauseKey + stepUnlessPaused) is
// unchanged and still gates the frozen frame, so AC-1's contract still holds.
//
// The live pause BEHAVIOUR (keydown edge → freeze → overlay in the rAF loop) is
// AC-5, a MANUAL run — the keydown+rAF wiring has no unit seam (the standing
// "shell IO is verified by running the game" convention; see bz2-5). So the
// automated RED drivers pin the WIRING + the resolution CONTRACT:
//   1. adoption   — some src module imports @shared/pause.
//   2. overlay    — some src module imports @shared/controls-overlay (sa1-5:
//                   the pause-owning chrome, replacing esc-overlay).
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
const CONTROLS_OVERLAY_IMPORT = /['"]@shared\/controls-overlay['"]/

// Runtime-only resolution: keep the specifiers out of Vite's static analysis so an
// unresolvable subpath surfaces as ONE failing test, not a module-graph crash.
const PAUSE_SUBPATH = '@shared/pause'
const CONTROLS_OVERLAY_SUBPATH = '@shared/controls-overlay'

interface SharedPauseModule {
  INITIAL_PAUSED: boolean
  isPauseKey: (key: string) => boolean
  togglePaused: (paused: boolean) => boolean
  stepUnlessPaused: <S>(step: () => S, prev: S, paused: boolean) => S
}
interface SharedControlsOverlayModule {
  createControlsOverlay: (args: unknown) => unknown
}

describe('SH2-14 — tempest adopts @shared/pause + /esc-overlay (AC-1, AC-2)', () => {
  it('a src module imports the shared pause gate', () => {
    expect(
      importersOf(PAUSE_IMPORT),
      'no src file imports @shared/pause — tempest has not wired the pause gate',
    ).not.toHaveLength(0)
  })

  it('a src module imports the shared controls overlay (sa1-5: owns pause chrome)', () => {
    expect(
      importersOf(CONTROLS_OVERLAY_IMPORT),
      'no src file imports @shared/controls-overlay — tempest draws no pause overlay',
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

  it('@shared/controls-overlay resolves with createControlsOverlay', async () => {
    const overlay = (await import(
      /* @vite-ignore */ CONTROLS_OVERLAY_SUBPATH
    )) as unknown as SharedControlsOverlayModule
    expect(
      typeof overlay.createControlsOverlay,
      'createControlsOverlay must be exported by @shared/controls-overlay',
    ).toBe('function')
  })
})
