// tests/pause-adoption.test.ts
//
// Story SH2-14 (epic SH2) — red-baron GAINED a pause via the shared @shared/pause
// VERB (isPauseKey / togglePaused / stepUnlessPaused) plus the original
// @shared/esc-overlay BROWSER card (drawEscOverlay), whose LINES, COLOUR and
// OPACITY were per-cabinet NUMBERS the caller supplied (RED_BARON_PAUSE).
//
// sa1-5 (Option A) supersedes that overlay half: the rebindable
// @shared/controls-overlay now OWNS pause chrome outright — Escape opens it, and
// it draws the dim+card itself (drawControlsOverlay via overlay.draw(), not
// drawEscOverlay). red-baron drops its drawEscOverlay import, its
// installPauseToggle import/call, RED_BARON_PAUSE and the `pause` object
// entirely; @shared/pause's VERB (isPauseKey) is still what gates the Escape
// edge in main.ts — only the overlay half moved. (Its own-implementation freeze
// — a loop guard over `overlay.isOpen()` rather than the shared single-state
// stepUnlessPaused thunk — is unchanged by this story and stays out of scope for
// this file, exactly as it was pre-sa1-5: red-baron's state lives across many
// closure vars, not one object.)
//
// The live pause BEHAVIOUR (keydown edge → freeze → overlay in the rAF loop) is
// AC-5, a MANUAL run — the keydown+rAF wiring has no unit seam (the standing
// "shell IO is verified by running the game" convention). So the automated RED
// drivers pin the WIRING and the resolution CONTRACT:
//   1. adoption   — some src module imports @shared/pause.
//   2. overlay    — some src module imports @shared/controls-overlay (sa1-5:
//                   the pause-owning chrome, replacing esc-overlay).
//   3. resolution — both subpaths resolve with the expected exports.
//
// MONOREPO MIGRATION (unchanged by sa1-5): a third driver that read
// package.json's `@arcade/shared` git-URL pin was REMOVED as false — the
// per-plugin package.json is now a three-field stub with no dependencies at
// all, the shared library is in-repo at src/shared, and there is no pin to go
// stale. That removal is recorded here rather than folded in silently, because
// a pinned dependency pipe was a real guard and it is genuinely gone.
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

// Runtime-only resolution: keep the specifiers out of Vite's static analysis so
// an unresolvable subpath surfaces as ONE failing test, not a module-graph crash.
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

describe('SH2-14/sa1-5 — red-baron adopts @shared/pause + /controls-overlay (AC-1, AC-2)', () => {
  it('a src module imports the shared pause gate', () => {
    expect(
      importersOf(PAUSE_IMPORT),
      'no src file imports @shared/pause — red-baron has not wired the pause gate',
    ).not.toHaveLength(0)
  })

  it('a src module imports the shared controls overlay (sa1-5: owns pause chrome)', () => {
    expect(
      importersOf(CONTROLS_OVERLAY_IMPORT),
      'no src file imports @shared/controls-overlay — red-baron draws no pause overlay',
    ).not.toHaveLength(0)
  })

  it('no src module imports the retired @shared/esc-overlay any more', () => {
    expect(
      importersOf(/['"]@shared\/esc-overlay['"]/),
      'sa1-5 replaces the bare esc-overlay card with the rebindable controls overlay',
    ).toHaveLength(0)
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
