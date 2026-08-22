// tests/pause-adoption.test.ts
//
// Story cp7-6 (centipede) — GREEN phase (Han Solo / TEA). Centipede ADOPTED the
// house pause the cabinet's five vector games already carried. A 1980 coin-op
// has no player pause (the vendored tree has zero 'pause' hits), so this
// carries NO fidelity claim (AC8) — it is a shell feature, and every assertion
// here is about centipede's own `src/`, not about the ROM.
//
// sa1-5 (Option A) supersedes AC6's overlay/host-helpers halves: the rebindable
// @shared/controls-overlay now OWNS pause chrome outright — Escape opens it,
// and it draws the dim+card itself (drawControlsOverlay, not drawEscOverlay).
// centipede drops its drawEscOverlay AND installPauseToggle imports entirely —
// the keydown listener is hand-rolled in main.ts (capture-phase, guarded by
// `!e.repeat`, folding `key.toLowerCase()` itself), matching every other
// sa1-5 adopter. @shared/pause's VERB (isPauseKey + stepUnlessPaused) is
// UNCHANGED and still gates the frozen frame, so AC6's core half still holds.
//
// The LIVE pause behaviour — Escape freezes the sim, silences the ringing
// loops, and draws the overlay through the rAF loop — is in
// tests/pause-behaviour.test.ts (booted through the shell). The visible-canvas
// overlay PLACEMENT (drawn after the integer-scale blit so the keybind card is
// not pixel-scaled, AC3) has no unit seam and is an acceptance-by-manual-run,
// per the standing "shell IO is verified by running the game" convention every
// adopter declares.
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
 *  COMMENT cannot satisfy an import guard (lang-review #15). Without this, deleting
 *  a real import but leaving a comment that quotes it keeps the guard green — the
 *  exact failure mode `tests/shell-convergence.test.mjs` strips comments to avoid.
 *  The `//` pattern is anchored to start-of-line-or-whitespace so it cannot eat the
 *  `//` inside a `https://` URL. */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')

/** src files (path relative to src/) whose CODE (comments stripped) contains `pattern`. */
function importersOf(pattern: RegExp): string[] {
  return walkTs(srcDir)
    .filter((f) => pattern.test(stripComments(readFileSync(f, 'utf8'))))
    .map((f) => f.slice(srcDir.length + 1))
}

// Anchor to the QUOTED specifier, not a bare word (lang-review #15): with comments
// stripped above, the string `'@shared/pause'` survives only in an actual import,
// and the two siblings below are prefixes of nothing — `@shared/pause` is NOT a
// prefix of `@shared/pause-x`, and the `['"]` bracket pins both quote styles.
const PAUSE_IMPORT = /['"]@shared\/pause['"]/
const CONTROLS_OVERLAY_IMPORT = /['"]@shared\/controls-overlay['"]/

describe('cp7-6/sa1-5 — centipede adopts the shared pause gate + controls overlay', () => {
  it('a src module imports the shared pause gate', () => {
    expect(
      importersOf(PAUSE_IMPORT),
      'no src file imports @shared/pause — centipede has not wired the pause gate',
    ).not.toHaveLength(0)
  })

  it('a src module imports the shared controls overlay (sa1-5: owns pause chrome)', () => {
    expect(
      importersOf(CONTROLS_OVERLAY_IMPORT),
      'no src file imports @shared/controls-overlay — centipede draws no pause overlay',
    ).not.toHaveLength(0)
  })
})

describe('cp7-6 — the shared pause API centipede adopts (contract pins)', () => {
  it('@shared/pause exposes the full gate, boots into play, and freezes by reference', () => {
    // These PASS today — the shared module already exists. They pin the contract
    // centipede depends on: a later edit to src/shared/pause.ts that drops an
    // export or changes the frozen-reference guarantee reddens HERE too.
    expect(INITIAL_PAUSED, 'the cabinet boots into play, not frozen').toBe(false)
    expect(togglePaused(INITIAL_PAUSED), 'first Escape pauses').toBe(true)
    expect(togglePaused(true), 'a second Escape resumes — a toggle, not a latch').toBe(false)

    // The thunk gate: paused ⇒ SAME reference, step never called (this is what
    // makes a paused centipede frame provably not advance the pure core).
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
    // The shells lowercase every key before game logic, so 'Escape' arrives as
    // 'escape'. The negative set is the paranoid edge the story names explicitly:
    // 'e' is the WASD left key, 'esc' is NOT the DOM key name, '' is the empty
    // string — none may be mistaken for the pause key via a prefix/substring slip,
    // or a fat-fingered movement chord would freeze the game.
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
