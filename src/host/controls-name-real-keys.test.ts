// src/host/controls-name-real-keys.test.ts — pt1-7
//
// The lobby renders one `<span class="tile-control">` per string in a game's
// `controls` manifest field (lobby/src/shell/tiles.ts:80-85), reading them out of
// the GENERATED registry — the single source of truth the tile actually shows. The
// 2026-08-19 playtest surfaced defender's tile reading just "Keyboard": a bare
// device category that tells a player nothing about which keys to press.
//
// contract.test.ts already proves `controls` is a required, non-empty, non-blank
// list, and lobby/tests/registry.test.ts proves each entry has length > 0. Neither
// looks at what the strings SAY. This file adds the quality invariant the playtest
// asked for: a control hint must name real keys/inputs, never only a device noun.
//
// It reads GAMES from the committed registry (not the manifests) on purpose: GAMES
// is exactly what the tile renders, and src/host/registry.test.ts pins GAMES to be
// a field-for-field match of the manifests, so a manifest edit that skips
// `npm run gen:registry` leaves stale data here and this suite stays red — the same
// pressure toward regen that AC3 wants.

import { describe, it, expect } from 'vitest'
import { GAMES } from './registry'

// Device/category nouns that name a piece of hardware but no key or button. A hint
// built from these alone ("Keyboard", "Mouse", "Mouse / Trackball") is the defect;
// a real hint pairs an action or a key token with — or instead of — the device
// ("AIM — Mouse", "FLY — Mouse / Arrows"). "Mouse" and "Trackball" are on the list
// because a raster/trackball game still has to say how you FIRE — naming the device
// alone is the same bug wearing a different word.
const DEVICE_WORDS = [
  'keyboard',
  'trackball',
  'joystick',
  'gamepad',
  'controller',
  'touchscreen',
  'touch',
  'pointer',
  'mouse',
] as const

// Separators and framing punctuation that carry no key information: whitespace, the
// slash/comma/plus/ampersand that list alternatives, the em/en-dash of the
// "ACTION — keys" house format, parentheses. Arrow glyphs (←↑↓→) and letter/word
// keys are deliberately NOT here — they are what must survive.
const NON_KEY_CHARS = /[\s/,+&()—–-]/g

/**
 * True when a single hint is a bare device label — it names hardware but no key.
 * Strip every device noun and every non-key separator; a hint that carries a real
 * binding leaves an action word or a key token behind, a bare device name leaves
 * nothing at all.
 */
function isBareDeviceLabel(hint: string): boolean {
  let residue = hint.toLowerCase()
  // Longest word first so 'touchscreen' is removed whole before 'touch' could leave
  // 'screen' behind. split/join removes every occurrence — replaceAll is ES2021 and
  // this repo targets ES2020 (tsconfig lib), so the shared-tests typecheck gate
  // rejects it.
  for (const word of [...DEVICE_WORDS].sort((a, b) => b.length - a.length)) {
    residue = residue.split(word).join('')
  }
  residue = residue.replace(NON_KEY_CHARS, '')
  return residue.length === 0
}

/** The joined, lowercased control text for one game — the string a spot-pin greps. */
function controlsTextFor(id: string): string {
  const game = GAMES.find((g) => g.id === id)
  expect(game, `no game with id "${id}" in the registry`).toBeDefined()
  return game!.controls.join(' ').toLowerCase()
}

// Direct unit test of the AC1 detector. AC1 below routes EVERY game through
// isBareDeviceLabel and nothing else, so without this the function could be broken
// in either direction and the fleet loop would stay green (a `return false` mutant
// empties every `bare` array; a `return true` mutant is caught only for the three
// games that also have AC2 checks). Pinning both truth values here kills both mutants.
describe('isBareDeviceLabel — the AC1 detector, pinned directly', () => {
  it.each(['Keyboard', 'Mouse', 'Mouse / Trackball', 'Joystick', '  ', '—'])(
    'flags %j as a bare device label (no keys)',
    (hint) => {
      expect(isBareDeviceLabel(hint)).toBe(true)
    },
  )

  it.each([
    'MOVE — WASD / Arrows',
    'FIRE — Space',
    'SMART BOMB — B',
    'AIM — Mouse',
    'FLY — Mouse / Arrows',
    'Joystick — ←↑↓→ / WASD',
    'FIRE — Click / Space',
  ])('accepts %j — it names a real key or action', (hint) => {
    expect(isBareDeviceLabel(hint)).toBe(false)
  })
})

describe('pt1-7: lobby control hints name real keys, not bare devices', () => {
  // Non-vacuity floor first (lang-review #15): a filtered-empty GAMES would make
  // every it.each below silently pass zero cases. Pin the fleet is present.
  it('has the full fleet of games to check', () => {
    expect(GAMES.length).toBeGreaterThanOrEqual(11)
  })

  // AC1 — the general invariant over EVERY game. No hint may be a bare device label.
  // Red today on defender ['Keyboard'], centipede ['Mouse'], millipede
  // ['Mouse / Trackball']; every other manifest already pairs an action with keys.
  it.each(GAMES)('$id names keys in every control hint, not a bare device', (game) => {
    const bare = game.controls.filter(isBareDeviceLabel)
    expect(
      bare,
      `${game.id} has device-only control hint(s) with no keys: ${JSON.stringify(bare)}`,
    ).toEqual([])
  })

  // AC2 — spot-pin the three offenders against their real shell bindings. Loose on
  // phrasing (Dev picks the exact words), tight on the ground truth every playable
  // game must convey: how you MOVE and how you FIRE.

  it('defender names how to move (WASD/arrows) and fire (Space)', () => {
    // plugins/defender/src/shell/input.ts:17-24 — thrust D/→, reverse A/←, up W/↑,
    // down S/↓; fire Space/Enter (:22). Not the bare 'Keyboard' it ships today.
    const text = controlsTextFor('defender')
    expect(text, 'defender control hint should name the fire key').toContain('space')
    expect(text, 'defender control hint should name the movement keys').toMatch(
      /wasd|arrow|[←↑↓→]/,
    )
  })

  it('centipede names the pointer and how to fire (Click/Space)', () => {
    // plugins/centipede/src/shell/input.ts: keyboard move/fire at :96-100 (Arrows/WASD
    // move, Space fire); pointer-lock mouse + left-button fire at :43-75 (FIRE_BUTTON=0,
    // onMouseDown). Not the bare 'Mouse' it ships today.
    const text = controlsTextFor('centipede')
    expect(text, 'centipede control hint should still name the mouse').toContain('mouse')
    expect(text, 'centipede control hint should name a fire input').toMatch(/click|space/)
  })

  it('millipede names the pointer and how to fire (Click/Space)', () => {
    // plugins/millipede/src/main.ts: fire keys at :97 (Space/Enter/Ctrl/Z/X/↑); the
    // pointerdown handler at :116-119 locks the pointer (trackball) and sets fireHeld
    // (:119 — click fires). Not the bare 'Mouse / Trackball' today.
    const text = controlsTextFor('millipede')
    expect(text, 'millipede control hint should still name the mouse/trackball').toContain('mouse')
    expect(text, 'millipede control hint should name a fire input').toMatch(/click|space/)
  })
})
