// tests/shell/pause-esc-overlay-repoint.test.ts
//
// Story SH2-14 (epic SH2) — battlezone GAINED its pause via the shared
// @shared/pause VERB (INITIAL_PAUSED / isPauseKey / togglePaused / the generic
// `stepUnlessPaused<S>(step, prev, paused)` thunk gate) plus the original
// @shared/esc-overlay BROWSER card (drawEscOverlay: dim + centred keybind card
// via the shared font) — while its dual-tread card copy and cabinet colour
// (#33ff66) stayed LOCAL, per the epic's share-the-VERB-not-the-NUMBERS rule.
//
// sa1-5 (Option A) supersedes that overlay half: the rebindable
// @shared/controls-overlay now OWNS pause chrome outright — Escape opens it,
// and it draws its own dim panel + menu/rebind rows (drawControlsOverlay via
// overlay.draw(), not drawEscOverlay). battlezone drops drawPauseOverlay,
// PAUSE_LINES and PAUSE_DIM from src/shell/render.ts entirely, and its
// installPauseToggle import/call from src/main.ts; @shared/pause's VERB
// (isPauseKey, re-exported verbatim by shell/pause.ts) is still what gates the
// Escape edge in main.ts's capture-phase listener — only the overlay half
// moved. The static 'E / D' / 'I / K' dual-tread card lines this suite used to
// pin verbatim in render.ts are GONE with that card: the shared overlay
// instead renders one row per CONTROL_MANIFEST action (shell/controls.ts),
// each showing its LIVE bound code(s), which is a strictly more complete
// picture (every rebindable control, not just the two hard-coded tread pairs)
// but is no longer a fixed string this file can match against. GLOW_GREEN
// (render.ts) survives verbatim — it is still the per-cabinet colour NUMBER
// main.ts feeds the shared overlay's opts (controls.ts's
// CONTROLS_OVERLAY_OPTS), unchanged by this story.
//
// The RED drivers are cross-repo-contract altitude, not a dictation of HOW Dev
// refactors pause.ts / render.ts (the surviving bz2-5 pause-gate.test.ts +
// pause-overlay.test.ts keep the behaviour honest, and MUST stay green):
//   1. re-point   — shell/pause.ts imports @shared/pause.
//   2. overlay    — some src module imports @shared/controls-overlay (sa1-5:
//                   the pause-owning chrome, replacing esc-overlay).
//   3. retired    — no src module imports @shared/esc-overlay any more.
//   4. guardrail  — GLOW_GREEN stays battlezone-local (per-cabinet NUMBERS are
//                   not swept into shared code).
//   5. resolution — battlezone's pin resolves /pause + /controls-overlay with
//                   the expected exports (already satisfied at the current
//                   pin; pins this as the contract so a regression surfaces
//                   here).
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const srcDir = fileURLToPath(new URL('../../src', import.meta.url))
const pausePath = fileURLToPath(new URL('../../src/shell/pause.ts', import.meta.url))
const renderPath = fileURLToPath(new URL('../../src/shell/render.ts', import.meta.url))

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

const PAUSE_IMPORT = /['"]@shared\/pause['"]/
const CONTROLS_OVERLAY_IMPORT = /['"]@shared\/controls-overlay['"]/
const ESC_OVERLAY_IMPORT = /['"]@shared\/esc-overlay['"]/

// Runtime-only resolution: keep the specifiers out of Vite's static analysis so
// an (unexpectedly) unresolvable subpath surfaces as ONE failing test, not a
// module-graph crash that would silence the sibling drivers.
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

describe('SH2-14/sa1-5 — battlezone adopts @shared/pause + /controls-overlay (AC-3)', () => {
  it('shell/pause.ts consumes the shared pause gate (no longer hand-rolls it)', () => {
    const src = readFileSync(pausePath, 'utf8')
    expect(
      PAUSE_IMPORT.test(src),
      'src/shell/pause.ts must import @shared/pause — the gate is no longer hand-rolled off ../core/sim',
    ).toBe(true)
  })

  it('some src module imports the shared controls overlay (sa1-5: owns pause chrome)', () => {
    const importers = walkTs(srcDir)
      .filter((f) => CONTROLS_OVERLAY_IMPORT.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(srcDir.length + 1))
    expect(
      importers,
      'no src file imports @shared/controls-overlay — the pause overlay is still fully local',
    ).not.toHaveLength(0)
  })

  it('no src module imports the retired @shared/esc-overlay any more', () => {
    const importers = walkTs(srcDir)
      .filter((f) => ESC_OVERLAY_IMPORT.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(srcDir.length + 1))
    expect(
      importers,
      'sa1-5 replaces the bare esc-overlay card with the rebindable controls overlay',
    ).toHaveLength(0)
  })

  it('keeps the cabinet colour as battlezone-local NUMBERS (verbatim)', () => {
    const render = readFileSync(renderPath, 'utf8')
    // The signature green survives the sa1-5 pause-chrome retirement — never
    // swept into shared code, and still fed to the shared overlay's opts from
    // shell/controls.ts's CONTROLS_OVERLAY_OPTS.
    expect(render, 'GLOW_GREEN must remain a battlezone-local constant').toMatch(/GLOW_GREEN\s*=\s*'#33ff66'/)
  })

  it('battlezone pin resolves /pause with the full gate API', async () => {
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
