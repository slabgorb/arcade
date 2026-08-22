// tests/pause-adoption.test.ts
//
// Story sa1-2 (epic sa1) — GREEN phase. millipede GAINED a pause via the shared
// @shared/pause verb + @shared/esc-overlay card. A 1980 coin-op has no player
// pause (the vendored tree has zero 'pause' hits), so this carries NO fidelity
// claim (AC8) — it is a shell feature, and every assertion here is about
// millipede's own `src/`, not about the ROM.
//
// sa1-5 (Option A) supersedes the esc-overlay half: the rebindable
// @shared/controls-overlay now OWNS pause chrome outright — Escape opens it,
// and it draws the dim+card itself (drawControlsOverlay, not drawEscOverlay).
// millipede drops its drawEscOverlay AND installPauseToggle imports entirely —
// the keydown listener is hand-rolled in main.ts (capture-phase, guarded by
// `!e.repeat`, folding `key.toLowerCase()` itself), matching centipede's sibling
// adoption (commit a5aec2e9). @shared/pause's VERB (isPauseKey + stepUnlessPaused)
// is UNCHANGED and still available for a game that gates a step with it — AC6's
// core-half contract still holds, pinned below — even though millipede's own
// freeze gate now reads `overlay.isOpen()` directly rather than a separate
// pause.isPaused() built by installPauseToggle.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  INITIAL_PAUSED,
  isPauseKey,
  togglePaused,
  stepUnlessPaused,
} from '@shared/pause'

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

/** Source with block and line comments removed, so a specifier quoted in a
 *  COMMENT cannot satisfy an import guard (lang-review #15). */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')

/** src files (path relative to src/) whose CODE (comments stripped) contains `pattern`. */
function importersOf(pattern: RegExp): string[] {
  return walkTs(srcDir)
    .filter((f) => pattern.test(stripComments(readFileSync(f, 'utf8'))))
    .map((f) => f.slice(srcDir.length + 1))
}

const PAUSE_IMPORT = /['"]@shared\/pause['"]/
const CONTROLS_OVERLAY_IMPORT = /['"]@shared\/controls-overlay['"]/

describe('sa1-2/sa1-5 — millipede adopts the shared pause gate + controls overlay', () => {
  it('a src module imports the shared pause gate', () => {
    expect(
      importersOf(PAUSE_IMPORT),
      'no src file imports @shared/pause — millipede has not wired the pause gate',
    ).not.toHaveLength(0)
  })

  it('a src module imports the shared controls overlay (sa1-5: owns pause chrome)', () => {
    expect(
      importersOf(CONTROLS_OVERLAY_IMPORT),
      'no src file imports @shared/controls-overlay — millipede draws no pause overlay',
    ).not.toHaveLength(0)
  })
})

describe('sa1-2 — the shared pause API millipede depends on (contract pins)', () => {
  it('@shared/pause exposes the full gate, boots into play, and freezes by reference', () => {
    expect(INITIAL_PAUSED, 'the cabinet boots into play, not frozen').toBe(false)
    expect(togglePaused(INITIAL_PAUSED), 'first Escape pauses').toBe(true)
    expect(togglePaused(true), 'a second Escape resumes — a toggle, not a latch').toBe(false)

    // The thunk gate: paused ⇒ SAME reference, step never called.
    const prev = { seg: 'held' }
    let stepCalls = 0
    const held = stepUnlessPaused(
      () => {
        stepCalls++
        return { seg: 'advanced' }
      },
      prev,
      true,
    )
    expect(held, 'a paused frame must return the prior state reference untouched').toBe(prev)
    expect(stepCalls, 'a paused frame must not call the step thunk').toBe(0)

    // …and active is exactly the thunk.
    let activeCalls = 0
    const advanced = stepUnlessPaused(
      () => {
        activeCalls++
        return { seg: 'advanced' }
      },
      prev,
      false,
    )
    expect(activeCalls, 'an active frame must call the step thunk exactly once').toBe(1)
    expect(advanced, 'an active frame returns the stepped state').toStrictEqual({ seg: 'advanced' })
  })

  it('isPauseKey answers ONLY the lowercased Escape — never a movement/fire key (AC7)', () => {
    expect(isPauseKey('escape'), "'escape' is the pause key").toBe(true)
    for (const key of ['e', 'esc', '', 'w', 'a', 's', 'd', ' ', 'enter', 'arrowleft']) {
      expect(isPauseKey(key), `"${key}" must NOT pause the game`).toBe(false)
    }
  })

  it('@shared/controls-overlay resolves with createControlsOverlay', async () => {
    const overlay = (await import('@shared/controls-overlay')) as unknown as {
      createControlsOverlay: (args: unknown) => unknown
    }
    expect(
      typeof overlay.createControlsOverlay,
      'createControlsOverlay must be exported by @shared/controls-overlay',
    ).toBe('function')
  })
})
