// plugins/missile-command/tests/pt1-12-mouse-buttons-fire-bases.test.ts
//
// Story pt1-12 — RED phase (Tyr One-Handed / TEA). Playtest 2026-08-19: the mouse
// buttons should fire the missile bases, mirroring the Z/X/C keys — LEFT button →
// the left (alpha) base, MIDDLE → the centre (delta) base, RIGHT → the right (omega)
// base — and the browser context menu must be SUPPRESSED on right-click so the right
// button fires omega instead of opening a menu.
//
// ─── GROUND TRUTH (why this is faithful, not an invention) ───────────────────────
// Missile Command is a trackball + THREE-FIRE-BUTTON cabinet. REV-01 LAUNCH ABMS
// (ABMLAU, W3MAIN:606) reads three fire switches through the mask table
// `FIREMA: .BYTE MFIREL,MFIREC,MFIRER` — each switch fires its OWN base, left/centre/
// right. Z/X/C already bind those three switches for the keyboard (fireKeyToBase,
// src/shell/input.ts, mc1-4). Mapping the three MOUSE buttons to the same three
// switches restores the cabinet's real fire input, so the mouse buttons must behave
// EXACTLY like the keys — same base selection, same ammo gate, same phase gates
// (inert while entering initials / paused, per mc7-3 / mc6-7).
//
// ─── WHAT A NODE TEST PINS (and what it leaves to the reviewer) ──────────────────
// The on-screen acceptance — a right-click firing omega with NO browser menu at
// /missile-command/ — is a SCREENSHOT/owner check (vitest env here is `node`, with no
// canvas and no mouse surface). What a node test CAN pin is the deterministic seam
// under the DOM listener: button→base selection and a fire reducer that behaves like
// the Z/X/C key path, plus the main.ts wiring that drives it and suppresses the menu.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// `fireButtonToBase` and `mousedownReducer` do not exist on shell/input.ts yet, so the
// loader throws a self-describing "not built yet" and Groups 1-4 redden for the
// FEATURE's absence, not a bare resolution stack trace. Group 5 reads main.ts as text:
// it has no `mousedown` fire wiring and no `contextmenu` suppression today, so those
// reddens too. Green arrives when Dev adds the two exports to input.ts and wires them
// (+ the contextmenu preventDefault) into main.ts.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createPlayGame, type GameState } from '../src/core/game.js'
// These two are ALREADY built (mc1-4 / mc3-5 / mc6-7) — the key path the mouse mirrors.
import { fireOrStart, fireKeyToBase } from '../src/shell/input.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─── The NEW contracts GREEN (Loki / Dev) implements ─────────────────────────────

interface ButtonModule {
  /**
   * Map a MouseEvent.button index to its missile base — 0 (left) → 0 (alpha/left),
   * 1 (middle) → 1 (delta/centre), 2 (right) → 2 (omega/right); null for any other
   * button (back/forward/etc.) so a stray button launches nothing. The mouse mirror
   * of fireKeyToBase (Z/X/C), binding the same FIREMA switches.
   */
  fireButtonToBase: (button: number) => number | null
  /**
   * The mousedown reducer main.ts drives on each mouse-button press. It must behave
   * like the Z/X/C key path (fireOrStart) for the base its button selects: ammo-gated
   * fire in PLAY, inert while paused / entering initials, and no pause-toggle or
   * initials-typing (it is NOT the composed keydownReducer). A non-fire button returns
   * the state UNCHANGED. Pure — never mutates the input state.
   */
  mousedownReducer: (button: number, state: GameState) => GameState
}

// Variable specifier + `/* @vite-ignore */` so `tsc --noEmit` (the release gate) stays
// green while the two new exports are still absent — the fleet RED-import idiom.
const INPUT_SPECIFIER = '../src/shell/input.js'

async function loadButtons(): Promise<ButtonModule> {
  try {
    const mod = (await import(/* @vite-ignore */ INPUT_SPECIFIER)) as Partial<ButtonModule>
    if (typeof mod.fireButtonToBase !== 'function') {
      throw new Error('shell/input.ts has no `fireButtonToBase` export')
    }
    if (typeof mod.mousedownReducer !== 'function') {
      throw new Error('shell/input.ts has no `mousedownReducer` export')
    }
    return mod as ButtonModule
  } catch (e) {
    throw new Error(
      'mouse-button fire seam not built yet — Dev adds to src/shell/input.ts: (1) ' +
        'fireButtonToBase(button): 0→0 (left/alpha), 1→1 (middle/delta), 2→2 (right/omega), ' +
        'null otherwise — the mouse mirror of fireKeyToBase (FIREMA: MFIREL/MFIREC/MFIRER, ' +
        'ABMLAU W3MAIN:606); and (2) mousedownReducer(button, state): behaves like the Z/X/C ' +
        'key path (fireOrStart) for the mapped base — ammo-gated fire in play, inert in ' +
        'entry/pause, non-fire button returns state unchanged. Pure, no mutation. ' +
        `(${(e as Error).message})`,
    )
  }
}

// MouseEvent.button indices: 0 = left (primary), 1 = middle (auxiliary), 2 = right
// (secondary). Each pairs with the Z/X/C key that fires the SAME base.
const LEFT = 0
const MIDDLE = 1
const RIGHT = 2
const BUTTON_KEY: ReadonlyArray<readonly [number, string]> = [
  [LEFT, 'z'],
  [MIDDLE, 'x'],
  [RIGHT, 'c'],
]

// Aim somewhere unambiguous so a launched ABM has a checkable target.
const AIM = { h: 150, v: 150 }

/** A live, fire-ready mid-battle board: all bases alive with full ammo, cursor set,
 *  no ABMs in flight, quiet sound channel — so ANY fire shows up as an added ABM,
 *  spent ammo, or a `launched` soundEvent. */
const playing = (): GameState => ({ ...createPlayGame(1), phase: 'play', abms: [], soundEvents: [], cursor: AIM })

// ═════════════════════════════════════════════════════════════════════════════════
// Group 1 — fireButtonToBase: left/middle/right → alpha/delta/omega, like Z/X/C.
// ═════════════════════════════════════════════════════════════════════════════════
describe('pt1-12 — the three mouse buttons map to left / centre / right base', () => {
  it('LEFT→0 (alpha/left), MIDDLE→1 (delta/centre), RIGHT→2 (omega/right)', async () => {
    const { fireButtonToBase } = await loadButtons()
    expect(fireButtonToBase(LEFT)).toBe(0)
    expect(fireButtonToBase(MIDDLE)).toBe(1)
    expect(fireButtonToBase(RIGHT)).toBe(2)
  })

  it('returns null for any non-fire button (no accidental launch)', async () => {
    const { fireButtonToBase } = await loadButtons()
    for (const b of [3, 4, 5, -1, 0.5, Number.NaN]) {
      expect(fireButtonToBase(b), `button ${b} must not select a base`).toBeNull()
    }
  })

  it('the three buttons select three DISTINCT bases (no collision)', async () => {
    const { fireButtonToBase } = await loadButtons()
    const picks = [fireButtonToBase(LEFT), fireButtonToBase(MIDDLE), fireButtonToBase(RIGHT)]
    expect(new Set(picks).size).toBe(3)
  })

  it('each button selects the SAME base as its mirror key (button 0≡Z, 1≡X, 2≡C)', async () => {
    // Ties the mouse mapping to the existing key mapping so the two cannot drift: the
    // left button must pick whatever base Z picks, etc. fireKeyToBase is the built,
    // source-faithful reference (fire.test.ts).
    const { fireButtonToBase } = await loadButtons()
    for (const [button, key] of BUTTON_KEY) {
      expect(fireButtonToBase(button), `button ${button} must select the same base as '${key}'`).toBe(
        fireKeyToBase(key),
      )
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════════
// Group 2 — mousedownReducer fires the mapped base in PLAY, ammo-gated.
// ═════════════════════════════════════════════════════════════════════════════════
describe('pt1-12 — a live base fires from its button: one ABM out, one round spent', () => {
  it('each button spends its OWN base and leaves the others untouched', async () => {
    const { mousedownReducer } = await loadButtons()
    const g = playing()
    for (const [button, key] of BUTTON_KEY) {
      const idx = fireKeyToBase(key) as number
      const out = mousedownReducer(button, g)
      expect(out.abms.length, `button ${button} must launch exactly one ABM`).toBe(g.abms.length + 1)
      // The launched ABM flies to the crosshair (AIM) from THIS base — the "checkable
      // target" the AIM fixture exists for.
      const launched = out.abms[out.abms.length - 1]
      expect(launched.target, `button ${button}'s ABM must aim at the crosshair`).toEqual(AIM)
      expect(launched.origin, `button ${button}'s ABM must launch from base ${idx}`).toEqual(g.bases[idx].pos)
      expect(out.bases[idx].ammo, `button ${button} must spend base ${idx}`).toBe(g.bases[idx].ammo - 1)
      expect(
        out.soundEvents.some((e) => e.type === 'launched'),
        `button ${button} must sound the launch cue`,
      ).toBe(true)
      for (const other of [0, 1, 2].filter((i) => i !== idx)) {
        expect(out.bases[other].ammo, `button ${button} must not touch base ${other}`).toBe(
          g.bases[other].ammo,
        )
      }
    }
  })

  it('a base at ammo 0 refuses the shot (no ABM, ammo stays 0, ammoEmpty cue)', async () => {
    const { mousedownReducer } = await loadButtons()
    const base = playing()
    const g: GameState = { ...base, bases: base.bases.map((b, i) => (i === MIDDLE ? { ...b, ammo: 0 } : b)) }
    const out = mousedownReducer(MIDDLE, g)
    expect(out.abms.length, 'an empty base launches no ABM').toBe(g.abms.length)
    expect(out.bases[MIDDLE].ammo, 'ammo must stay 0, never go negative').toBe(0)
    expect(out.soundEvents.some((e) => e.type === 'ammoEmpty'), 'a refused shot sounds the klaxon').toBe(true)
  })

  it('a destroyed base refuses the shot and keeps its ammo', async () => {
    const { mousedownReducer } = await loadButtons()
    const base = playing()
    const g: GameState = { ...base, bases: base.bases.map((b, i) => (i === RIGHT ? { ...b, alive: false } : b)) }
    const ammoBefore = g.bases[RIGHT].ammo
    const out = mousedownReducer(RIGHT, g)
    expect(out.abms.length, 'a dead base launches no ABM').toBe(g.abms.length)
    expect(out.bases[RIGHT].alive).toBe(false)
    expect(out.bases[RIGHT].ammo, 'a dead base does not spend ammo').toBe(ammoBefore)
  })

  it('a non-fire button (3) changes nothing', async () => {
    const { mousedownReducer } = await loadButtons()
    const g = playing()
    const out = mousedownReducer(3, g)
    expect(out, 'a non-fire button is a pure no-op in play').toEqual(g)
  })

  it('does not mutate the state it was given (pure)', async () => {
    const { mousedownReducer } = await loadButtons()
    const g = playing()
    const ammoBefore = g.bases[LEFT].ammo
    const abmsBefore = g.abms.length
    mousedownReducer(LEFT, g)
    expect(g.bases[LEFT].ammo, 'the input base ammo must be untouched').toBe(ammoBefore)
    expect(g.abms.length, 'the input abms array must be untouched').toBe(abmsBefore)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════
// Group 3 — the "like Z/X/C" anchor: mousedownReducer(button) must equal the KEY
// path fireOrStart(key) in EVERY phase. This one comparison pins base selection, the
// ammo gate, AND the phase gates (entry inert, pause inert, attract→setup, over→
// restart) against the real, built key reducer — a mouse button that toggled pause,
// typed an initial, or fired under the pause overlay would diverge and redden here.
// ═════════════════════════════════════════════════════════════════════════════════
describe('pt1-12 — a fire button behaves EXACTLY like its Z/X/C key, in every phase', () => {
  // ALL seven Phase values (src/core/state.ts) — the "EVERY phase" claim above is literal.
  // 'setup'/'between' fire (fireOrStart → fireFromKey), 'play' fires, 'pause'/'entry' are
  // inert, 'attract'→setup, 'over'→restart; the mouse path must match the key path in each.
  const PHASES: ReadonlyArray<GameState['phase']> = [
    'attract',
    'setup',
    'play',
    'pause',
    'between',
    'over',
    'entry',
  ]

  for (const [button, key] of BUTTON_KEY) {
    for (const phase of PHASES) {
      it(`button ${button} in '${phase}' == fireOrStart('${key}') in '${phase}'`, async () => {
        const { mousedownReducer } = await loadButtons()
        const before: GameState = { ...playing(), phase }
        expect(mousedownReducer(button, before)).toEqual(fireOrStart(key, before))
      })
    }
  }

  it("a mouse button does NOT toggle pause or type an initial (it is not keydownReducer)", async () => {
    const { mousedownReducer } = await loadButtons()
    // While entering initials, Z/X/C are inert as fire (mc7-3) — so the mouse button
    // must leave 'entry' UNCHANGED: no fire, and (unlike keydownReducer) no letter typed.
    const entry: GameState = { ...playing(), phase: 'entry' }
    expect(mousedownReducer(LEFT, entry), 'a button in entry must be a pure no-op').toEqual(entry)
    // While paused, the fire path is inert (mc6-7) — the button must not fire OR unpause.
    const paused: GameState = { ...playing(), phase: 'pause' }
    const out = mousedownReducer(RIGHT, paused)
    expect(out.phase, 'a button under the pause overlay must not unpause').toBe('pause')
    expect(out.abms, 'a button under the pause overlay must not fire').toEqual(paused.abms)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════
// Group 4 — CONTROL: the SAME board in PLAY genuinely fires from every button, so the
// inert (entry/pause) assertions above are testing a real suppression, not a board
// that never fires. (the mc6-7 CONTROL idiom.)
// ═════════════════════════════════════════════════════════════════════════════════
describe('pt1-12 CONTROL — every button fires in play (the gates above are real)', () => {
  for (const [button] of BUTTON_KEY) {
    it(`button ${button} in play launches an ABM and sounds the launch cue`, async () => {
      const { mousedownReducer } = await loadButtons()
      const g = playing()
      const out = mousedownReducer(button, g)
      expect(out.abms.length, 'a live fire launches one ABM').toBe(g.abms.length + 1)
      expect(out.soundEvents.some((e) => e.type === 'launched'), 'a live fire sounds the launch cue').toBe(true)
    })
  }
})

// ═════════════════════════════════════════════════════════════════════════════════
// Group 5 — main.ts wiring: the mousedown listener drives mousedownReducer with the
// event's button, and a contextmenu listener suppresses the browser menu so the RIGHT
// button fires omega instead of opening it. main.ts runs top-level DOM side effects on
// import (mountCanvas(document)), so node cannot import it — the wiring is pinned as
// TEXT, the fleet idiom for the shell's DOM seam (input.test.ts / fire.test.ts). The
// on-screen proof (right-click fires, no menu) is the owner/reviewer screenshot.
// ═════════════════════════════════════════════════════════════════════════════════
describe('pt1-12 — main.ts wires the buttons and suppresses the context menu', () => {
  const mainSrc = (): string => readFileSync(join(root, 'src', 'main.ts'), 'utf8')

  it('drives mousedownReducer from a mousedown listener, using the event button', () => {
    const src = mainSrc()
    // Find the mousedown listener, then scope the corroborating checks to ITS handler
    // window (per lang-review #25) — so an unused `mousedownReducer` import or a `.button`
    // read elsewhere in the file cannot satisfy them. The reducer must be CALLED inside
    // the handler (`mousedownReducer(` — not merely named), fed the event's button.
    const at = src.search(/addEventListener\(\s*['"]mousedown['"]/)
    expect(at, "main.ts must register a 'mousedown' listener").toBeGreaterThanOrEqual(0)
    const handler = src.slice(at, at + 300)
    expect(handler, 'the mousedown handler must CALL mousedownReducer').toMatch(/\bmousedownReducer\s*\(/)
    expect(handler, 'the reducer must be fed the mouse button index (event.button)').toMatch(/\.button\b/)
  })

  it("suppresses the browser context menu on the canvas (preventDefault on 'contextmenu')", () => {
    const src = mainSrc()
    // Anchor to the actual `addEventListener('contextmenu'` REGISTRATION (per lang-review
    // #15/#25), not a bare `indexOf('contextmenu')` whole-file scan — the word 'contextmenu'
    // in a comment or string must not redirect the window away from the real listener. Assert
    // the anchor is found BEFORE slicing, then require preventDefault WITHIN the handler slice.
    const at = src.search(/addEventListener\(\s*['"]contextmenu['"]/)
    expect(at, "main.ts must register a 'contextmenu' listener").toBeGreaterThanOrEqual(0)
    const handler = src.slice(at, at + 200)
    expect(handler, "the contextmenu handler must call preventDefault() to suppress the menu").toMatch(
      /preventDefault\s*\(/,
    )
  })
})
