// src/shell/input.ts
//
// Story mc1-3 (GREEN, Yoda) — the shell input adapter. Turns mouse/trackball
// motion into the per-frame cursor delta and drives the crosshair through the
// core reducer, so the clamp lives in core/cursor.ts and this shell only adapts
// coordinate spaces. Desktop-only (repo rule: no touch/narrow-viewport). mc1-4
// added the three fire keys (Z/X/C) that launch an ABM per base.
//
// ─── THE V-FLIP (the one adaptation this seam owns) ──────────────────────────
// The pointer is top-left origin: movementY > 0 means the pointer moved DOWN the
// screen. The cabinet cursor V is bottom-origin (render.ts flips V to paint it),
// so moving the pointer UP (movementY < 0) must move the crosshair UP the field
// (v increases). Hence dv = -movementY (and dh = movementX), handed straight to
// the core clamp — the literal reading of "feed the motion as the delta".
//
// ─── THE FIRE KEYS (mc1-4) ────────────────────────────────────────────────────
// REV-01 LAUNCH ABMS (ABMLAU, W3MAIN:606) reads three fire switches through the
// mask table FIREMA: .BYTE MFIREL,MFIREC,MFIRER — each switch fires its OWN base,
// left/centre/right (owner ruling: per-key specific base, no nearest-base select).
// So Z→base 0 (left), X→base 1 (centre), C→base 2 (right), matching field.ts BASES
// (source order = ascending H = left→right). The launch itself is core geometry —
// this shell just picks the base and hands its position to core/abm.launchAbm.

import { moveCursor, type Cursor } from '../core/cursor.js'
import { launchAbm } from '../core/abm.js'
import { startGame, stepInitials, commitNameEntry, abortNameEntry, type GameState } from '../core/game.js'
import { togglePause } from '../core/state.js'
import { isPauseKey } from '@shared/pause'

// mc8-4: the base-ammo count at which a launch sounds the "LOW" warning cue (LO) instead
// of the normal launch (LA). ABMLAU: `LDA NMMISB / CMP I,4 / IFEQ` (W3MAIN.MAC:1385) — the
// pre-decrement magazine equals 4. A shell constant: this is the fire→sound seam, and the
// core purity/citation gate scans only src/core.
const LOW_AMMO = 4

/**
 * Map a screen-space pointer movement (a PointerEvent's movementX/movementY,
 * top-left origin) to the next crosshair position: dh = movementX, dv =
 * -movementY (the V-flip), fed through core/cursor.moveCursor so the result can
 * never leave the play area. Pure and deterministic.
 */
export function applyPointerMotion(cursor: Cursor, movementX: number, movementY: number): Cursor {
  return moveCursor(cursor, { dh: movementX, dv: -movementY })
}

/**
 * Map a keyboard key to its missile base index — Z→0 (left), X→1 (centre),
 * C→2 (right), matching the three FIREMA switches (ABMLAU, W3MAIN:606). Returns
 * null for any non-fire key, so a stray keydown launches nothing.
 */
export function fireKeyToBase(key: string): number | null {
  switch (key.toLowerCase()) {
    case 'z':
      return 0
    case 'x':
      return 1
    case 'c':
      return 2
    default:
      return null
  }
}

/**
 * mc3 (mc3-5): ammo-GATED firing over the live game state. The fire `key` picks
 * its base (via fireKeyToBase — the Z/X/C mapping is preserved); a destroyed base
 * or one with `ammo === 0` cannot fire, so the state is returned UNCHANGED. A live
 * base with ammo appends one ABM (from that base to the crosshair, via core/abm)
 * and spends one round. Pure — the input state is never mutated. This is the
 * reducer main.ts drives on each keydown, replacing the mc1-4 unconditional launch.
 */
export function fireFromKey(key: string, state: GameState): GameState {
  const idx = fireKeyToBase(key)
  if (idx === null) return state
  const base = state.bases[idx]
  // A destroyed or empty base cannot fire: the shot is refused and the CAN'T-FIRE
  // klaxon sounds (NS, SNSHOT — W3MAIN:1283 "NO FIRE NOISE"). The launch/ammo
  // moments ride the same GameState.soundEvents channel the sim emits (mc8-2);
  // the shell drains it each frame.
  if (!base.alive || base.ammo === 0) {
    return { ...state, soundEvents: [...state.soundEvents, { type: 'ammoEmpty' }] }
  }
  // mc8-4: a launch taken while the base still holds exactly its LOW count sounds the
  // "LOW" launch variant (LO, SLOABM) rather than the normal launch (LA, SABLAU). ABMLAU
  // does `LDA NMMISB / CMP I,4 / IFEQ → SLOABM` BEFORE the DEC (W3MAIN:1385), so the test
  // is the pre-decrement ammo == the LOW threshold — a one-shot crossing warning, not a
  // sustained "<= LOW" state. Pure data on the launched event; audio-dispatch voices it.
  const abm = launchAbm(base.pos, state.cursor)
  const bases = state.bases.map((b, i) => (i === idx ? { ...b, ammo: b.ammo - 1 } : b))
  const baseLow = base.ammo === LOW_AMMO
  return {
    ...state,
    abms: [...state.abms, abm],
    bases,
    soundEvents: [...state.soundEvents, { type: 'launched', baseLow }],
  }
}

// Ground truth: a start in attract writes S.SETU (W3MAIN.MAC:740-757). ROM line
// numbers live in // comments, never JSDoc — matching the game.ts convention.
/**
 * mc6-4 "any input leaves the demo": when the cabinet is showing the ATTRACT demo,
 * ANY input begins SETUP. Every other phase is returned UNCHANGED (this transition
 * only fires from attract). Pure — the input state is never mutated. Both fireOrStart
 * (keydowns) and main.ts (pointer input) route through here so keyboard and mouse
 * leave the demo alike.
 */
export function beginSetupOnInput(state: GameState): GameState {
  return state.phase === 'attract' ? { ...state, phase: 'setup' } : state
}

/**
 * The keydown reducer main.ts drives. mc6-4: in ATTRACT, ANY key leaves the demo for
 * SETUP (beginSetupOnInput — broadened from mc6-2's fire-keys-only). After GAME OVER
 * a fire key restarts (startGame -> a fresh play game; the mc6-2 reachable edge). In
 * PLAY a fire key launches an ABM and never wipes the board; a non-fire key changes
 * nothing. Pure — the input state is never mutated.
 */
export function fireOrStart(key: string, state: GameState): GameState {
  // mc7-3: while entering initials the fire keys are INERT. Z/X/C double as valid
  // initials letters, so a keystroke that types an initial must not also launch an
  // ABM, spend a round, or sound a launch/klaxon cue under the entry screen. Guarded
  // before every fire path; nameEntryFromKey (below) owns the keystroke during entry.
  if (state.phase === 'entry') return state
  // mc6-7: while PAUSED the fire path is INERT too. The ROM's MAINLINE JSRs the PAUSE
  // handler (its own routine, W3MAIN.MAC:615/:617), never PLAY, so ABMLAU never runs —
  // a fire key under the pause overlay must not spend a round, queue an ABM, or sound a
  // launch. The sim freeze (stepGame's 'pause' branch, mc6-3) only stops the clock's
  // effect; this gates the SHELL input that mc6-3's Heimdall review flagged as ungated.
  if (state.phase === 'pause') return state
  if (state.phase === 'attract') return beginSetupOnInput(state) // any input -> setup
  if (fireKeyToBase(key) !== null && state.phase === 'over') return startGame(state)
  return fireFromKey(key, state)
}

// mc11-3: the START switch during name entry. Ground truth: GETINI aborts TAKE INITIALS
// on either start switch — LDA SWSTAT / EOR I,0FF / AND I,MSTRT1!MSTRT2 / BNE ABORT (W3DSUP.MAC:4076).
// The keyboard port maps the 1-Player START button (MSTRT1) to the '1' key, the fleet
// convention (battlezone `key==='1'`, star-wars `Digit1`, joust/centipede START1 port);
// Enter is unavailable here (nameEntryFromKey already COMMITS on Enter), and '1' is not an
// A-Z initials letter so it never collides with typing.
function isStartKey(key: string): boolean {
  return key === '1'
}

/**
 * mc11-3 the START-switch abort: while entering initials, the '1' start switch aborts the
 * entry via core `abortNameEntry` — back to attract, buffer discarded, ladder UNCHANGED (no
 * insert, even from a full buffer). Outside `'entry'`, and for any non-start key, the state
 * is returned unchanged (so '1' still begins a game from attract via fireOrStart). Pure —
 * the core owns the abort result; this shell only decides WHEN to trigger it.
 */
export function startAbortFromKey(key: string, state: GameState): GameState {
  return state.phase === 'entry' && isStartKey(key) ? abortNameEntry(state) : state
}

/**
 * mc7-3 the KEYBOARD name-entry reducer (fleet-consistent — NOT the ROM trackball).
 * During `'entry'`, ENTER commits the buffer via core `commitNameEntry` (inserts the
 * initials into the ladder and returns to attract when the buffer is full; a partial
 * buffer is inert); every other key feeds core `stepInitials` (A-Z uppercased up to
 * MC_INITIALS_LEN, Backspace deletes, anything else a no-op — the @shared/name-entry
 * verb). Outside `'entry'` the state is returned unchanged. Pure — the core decides
 * what a key MEANS; this shell only decides WHEN to feed it. main.ts drives this on
 * each keydown alongside `pauseFromKey`/`fireOrStart`.
 */
export function nameEntryFromKey(key: string, state: GameState): GameState {
  if (state.phase !== 'entry') return state
  return key === 'Enter' ? commitNameEntry(state) : stepInitials(state, key)
}

/**
 * mc7-3 the composed keydown reducer main.ts drives on EVERY keystroke:
 * `pauseFromKey → nameEntryFromKey → fireOrStart`. The order matters and the last
 * step needs the PRE-keystroke phase, not the running one: a full-buffer Enter makes
 * `nameEntryFromKey` commit and flip `'entry'`→`'attract'`, and an unguarded
 * `fireOrStart` would then read that `'attract'` and `beginSetupOnInput` → `'setup'`,
 * dumping the player who just signed the board into an unrequested new game. So
 * `fireOrStart` is skipped for any keystroke that BEGAN in `'entry'` (its own
 * `phase === 'entry'` guard can't help — the phase has already left `'entry'`).
 * Pure — the input state is never mutated. main.ts owns only the persistence side
 * effect (save on a changed `highScores` reference) around this reducer.
 */
export function keydownReducer(key: string, state: GameState): GameState {
  const wasEntry = state.phase === 'entry'
  let next = pauseFromKey(key, state)
  // mc11-3: the '1' start switch aborts entry (-> attract) BEFORE nameEntryFromKey, which
  // would treat '1' as an inert non-letter keystroke. It is a no-op outside 'entry', so a
  // '1' in attract still falls through to fireOrStart below and begins a game.
  next = startAbortFromKey(key, next)
  next = nameEntryFromKey(key, next)
  if (!wasEntry) next = fireOrStart(key, next)
  return next
}

/**
 * mc6-3 PAUSE toggle: when `key` is the pause key, flip the phase play<->pause via
 * core `togglePause`; otherwise return the state unchanged. The pause key is the
 * shared @shared/pause VERB (`isPauseKey`, which matches lowercased 'escape') — the
 * DOM `event.key` is 'Escape' (capital), so we lowercase first, exactly as
 * `fireKeyToBase` does. This ONLY flips the phase — no ABM launches and no ammo is
 * spent (that is fireFromKey's job), and a non-pausable phase (togglePause's no-op)
 * leaves the state untouched. Pure — the input state is never mutated. main.ts drives
 * this on each keydown alongside `fireOrStart`.
 */
export function pauseFromKey(key: string, state: GameState): GameState {
  return isPauseKey(key.toLowerCase()) ? { ...state, phase: togglePause(state.phase) } : state
}
