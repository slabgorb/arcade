// tests/shell/pause-esc-overlay-repoint.test.ts
//
// Story SH2-14 (epic SH2) — RED phase (Furiosa / TEA), battlezone's half of the
// consumption story. SH2-12 extracted battlezone's Escape-to-pause into two
// @shared subpaths — PURE `/pause` (INITIAL_PAUSED / isPauseKey /
// togglePaused / the generic `stepUnlessPaused<S>(step, prev, paused)` thunk gate)
// and BROWSER `/esc-overlay` (drawEscOverlay: dim + centred keybind card via the
// shared font). This story RE-POINTS battlezone onto them, behaviour-identical:
// its shell/pause.ts must consume the shared gate rather than hand-roll it, and
// its overlay must route through drawEscOverlay — while the dual-tread card
// (`E / D`, `I / K`) and the cabinet colour (#33ff66) stay LOCAL, per the epic's
// share-the-VERB-not-the-NUMBERS rule.
//
// The RED drivers are cross-repo-contract altitude, not a dictation of HOW Dev
// refactors pause.ts / render.ts (the surviving bz2-5 pause-gate.test.ts +
// pause-overlay.test.ts keep the behaviour honest, and MUST stay green):
//   1. re-point   — shell/pause.ts imports @shared/pause (fails: it still
//                   hand-rolls the gate off ../core/sim).
//   2. overlay    — some src module imports @shared/esc-overlay (fails:
//                   none does yet; drawPauseOverlay is still fully local).
//   3. guardrail  — the dual-tread card lines + #33ff66 stay battlezone-local
//                   (per-cabinet NUMBERS are not swept into shared code).
//   4. resolution — battlezone's pin resolves /pause + /esc-overlay with the
//                   expected exports (already satisfied at the current pin; pins
//                   this as the contract so a regression pin surfaces here).
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
const ESC_OVERLAY_IMPORT = /['"]@shared\/esc-overlay['"]/

// Runtime-only resolution: keep the specifiers out of Vite's static analysis so
// an (unexpectedly) unresolvable subpath surfaces as ONE failing test, not a
// module-graph crash that would silence the sibling drivers.
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

describe('SH2-14 — battlezone re-points onto @shared/pause + /esc-overlay (AC-3)', () => {
  it('shell/pause.ts consumes the shared pause gate (no longer hand-rolls it)', () => {
    const src = readFileSync(pausePath, 'utf8')
    expect(
      PAUSE_IMPORT.test(src),
      'src/shell/pause.ts must import @shared/pause — the gate is no longer hand-rolled off ../core/sim',
    ).toBe(true)
  })

  it('some src module strokes the overlay through the shared drawEscOverlay', () => {
    const importers = walkTs(srcDir)
      .filter((f) => ESC_OVERLAY_IMPORT.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(srcDir.length + 1))
    expect(
      importers,
      'no src file imports @shared/esc-overlay — the pause overlay is still fully local',
    ).not.toHaveLength(0)
  })

  it('keeps the dual-tread card + cabinet colour as battlezone-local NUMBERS (verbatim)', () => {
    const render = readFileSync(renderPath, 'utf8')
    // The per-cabinet card lines survive the re-point verbatim…
    expect(render, "the 'E / D' left-tread card line must be preserved verbatim").toContain('E / D')
    expect(render, "the 'I / K' right-tread card line must be preserved verbatim").toContain('I / K')
    // …and so does the cabinet's signature green (never swept into shared code).
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

  it('battlezone pin resolves /esc-overlay with drawEscOverlay', async () => {
    const overlay = (await import(/* @vite-ignore */ ESC_OVERLAY_SUBPATH)) as unknown as SharedEscOverlayModule
    expect(typeof overlay.drawEscOverlay, 'drawEscOverlay must be exported by @shared/esc-overlay').toBe('function')
  })
})
