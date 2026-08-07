// tests/select.test.ts
//
// Story jt10-5 — RED (Tyr / TEA). The BEHAVIOUR + CITATION + PURITY suite for the
// new core data-and-map module plugins/joust/src/core/select.ts: the three coin-up
// strings (ONE PLAYER START / TWO PLAYER START / CREDITS), transcribed VERBATIM
// from MESSEQU.SRC, and selectPlayerCount(input) — the pure map from a start-button
// intent to the player count startPlaying wants.
//
// The module surface is stated in tests/helpers/select-contract.ts and loaded
// lazily per-test via loadSelect (the tp1-8 collection trap): RED reddens with a
// clean "select module not built yet" per test until Loki ships src/core/select.ts.
// Each test NAMES the mutant it kills.
//
// Purity (AC-6) is proven twice: tests/purity.test.ts already sweeps EVERY
// src/core module via readdirSync — so select.ts is caught the moment it lands —
// and the FOCUSED per-module assertions below pin the criterion by name.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSelect, type SelectInput } from './helpers/select-contract.js'
import { loadCabinet } from './helpers/cabinet-contract.js'
import { createGame } from '../src/core/game.js'
import { violations } from './helpers/purity-scanner.js'

const SEED = 0x1234
const coreDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'core')

// The vendored 1982 Williams source sits at the monorepo root, two levels above
// plugins/joust — same resolution as audio-rom-citations.test.ts, incl. the env
// override. MESSEQU.SRC is the message-equate table: label / message-number /
// quoted text, one per line.
const vendoredRoot =
  process.env.JOUST_SOURCE_DIR ?? join(coreDir, '..', '..', '..', '..', 'reference', 'williams-source', 'joust')
const messEqu = join(vendoredRoot, 'MESSEQU.SRC')
const vendoredAvailable = existsSync(messEqu)

/** Read the not-yet-built select source for the purity assertions (RED: absent → throws). */
function readSelectSource(): string {
  const p = join(coreDir, 'select.ts')
  if (!existsSync(p)) {
    throw new Error('GREEN (Loki) must create src/core/select.ts — the coin-up strings + selectPlayerCount (jt10-5)')
  }
  return readFileSync(p, 'utf8')
}

/** The text inside the ONE pair of single quotes on a MESSEQU.SRC equate line,
 *  trailing space and all — the primary-source spelling of a message string. */
function quotedText(line: string): string {
  const first = line.indexOf("'")
  const last = line.lastIndexOf("'")
  if (first < 0 || last <= first) throw new Error(`no quoted text on: ${line}`)
  return line.slice(first + 1, last)
}

/** Find the MESSEQU.SRC line whose label + message-number are `label` / `num`,
 *  and return its quoted text. Located by LABEL (not by a bare line number) so a
 *  citation cannot silently drift onto the wrong row. */
function equText(label: string, num: string): string {
  const lines = readFileSync(messEqu, 'latin1').split('\n')
  const re = new RegExp(`^${label}\\s+EQU\\s+\\${num}\\b`)
  const hit = lines.find((l) => re.test(l))
  if (hit === undefined) throw new Error(`MESSEQU.SRC has no \`${label} EQU ${num}\` row`)
  return quotedText(hit)
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — selectPlayerCount is the pure start-select map. Restrictive mutation
// coverage: 1P → 1 and NOT 2, 2P → 2 and NOT 1, null → null and NOT a count.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 selectPlayerCount — the start-button → player-count map', () => {
  it('one-player → 1, two-player → 2', async () => {
    const s = await loadSelect()
    // Kills "both buttons start the same count" / "the two labels are swapped".
    expect(s.selectPlayerCount('one-player'), 'ONE PLAYER START → a 1-player game').toBe(1)
    expect(s.selectPlayerCount('two-player'), 'TWO PLAYER START → a 2-player game').toBe(2)
  })

  it('the two buttons map to DISTINCT counts (kills a collapse-to-one mutant)', async () => {
    const s = await loadSelect()
    expect(s.selectPlayerCount('one-player'), '1P is NOT 2').not.toBe(2)
    expect(s.selectPlayerCount('two-player'), '2P is NOT 1').not.toBe(1)
  })

  it('null (no start pressed) → null — NOT a defaulted 1 (lang-review #4: null must not collapse)', async () => {
    const s = await loadSelect()
    // Kills "selectPlayerCount(input) does `return count ?? 1`" — a resting select
    // screen with no press must NOT start a game. If null silently became 1, main.ts
    // would start a 1-player game every idle frame.
    expect(s.selectPlayerCount(null), 'no press → no count → the screen stays up').toBeNull()
  })

  it('is total and deterministic over the whole SelectInput union', async () => {
    const s = await loadSelect()
    // A typed record over the union is a COMPILE-TIME exhaustiveness guard (lang-review
    // #3: prefer a union + total handling over a string enum). Adding a member without
    // handling it fails to typecheck HERE.
    const ALL: Record<Exclude<SelectInput, null>, 1 | 2> = { 'one-player': 1, 'two-player': 2 }
    for (const [input, want] of Object.entries(ALL) as [Exclude<SelectInput, null>, 1 | 2][]) {
      expect(s.selectPlayerCount(input), `${input} is deterministic`).toBe(want)
      expect(s.selectPlayerCount(input), `${input} is stable across calls`).toBe(s.selectPlayerCount(input))
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — the three strings are transcribed VERBATIM. Direct literal pins (an
// always-on regression) PLUS the trailing-space synthetic, which a trim mutant
// fails even though 'CREDITS'.startsWith('CREDITS ') never would.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 the coin-up strings — verbatim MESSEQU.SRC transcription', () => {
  it('SEL_ONE_PLAYER / SEL_TWO_PLAYER are the two START labels (MSPLY1 $1D / MSPLY2 $1E)', async () => {
    const s = await loadSelect()
    expect(s.SEL_ONE_PLAYER, 'MSPLY1 $1D').toBe('ONE PLAYER START')
    expect(s.SEL_TWO_PLAYER, 'MSPLY2 $1E').toBe('TWO PLAYER START')
  })

  it('SEL_CREDITS keeps the ROM string EXACTLY — including its trailing space (MSCRED $50)', async () => {
    const s = await loadSelect()
    // Kills the near-miss trim mutant `'CREDITS'`: MESSEQU.SRC:101 is 'CREDITS ' with
    // a trailing blank cell (the message routine appends the count after it). A clone
    // with no coin economy still renders the ROM string as-is.
    expect(s.SEL_CREDITS, 'MSCRED $50 verbatim').toBe('CREDITS ')
    expect(s.SEL_CREDITS.endsWith(' '), 'the trailing space survives').toBe(true)
    expect(s.SEL_CREDITS.length, "'CREDITS ' is 8 characters, not 7").toBe(8)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — the CITATION GATE: each constant RE-OPENS at its MESSEQU.SRC row, byte
// for byte, located by label. Skips (never silently) if the vendored tree is
// absent. Includes a DISCRIMINATING control so the gate is not vacuous.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('AC-4 citation gate — the strings re-open in MESSEQU.SRC', () => {
  it('the vendored MESSEQU.SRC really is here (so the checks below are not silent skips)', () => {
    expect(existsSync(messEqu), 'reference/williams-source/joust/MESSEQU.SRC').toBe(true)
  })

  it('SEL_ONE_PLAYER re-opens at MSPLY1 $1D (MESSEQU.SRC:48)', async () => {
    const s = await loadSelect()
    expect(s.SEL_ONE_PLAYER, 'the transcription equals the primary source').toBe(equText('MSPLY1', '$1D'))
  })

  it('SEL_TWO_PLAYER re-opens at MSPLY2 $1E (MESSEQU.SRC:49)', async () => {
    const s = await loadSelect()
    expect(s.SEL_TWO_PLAYER).toBe(equText('MSPLY2', '$1E'))
  })

  it('SEL_CREDITS re-opens at MSCRED $50 (MESSEQU.SRC:101), trailing space and all', async () => {
    const s = await loadSelect()
    const fromSource = equText('MSCRED', '$50')
    expect(fromSource, 'the primary source itself carries the trailing space').toBe('CREDITS ')
    expect(s.SEL_CREDITS).toBe(fromSource)
  })

  it('the gate DISCRIMINATES — a drifted quote is rejected (not a vacuous re-open)', () => {
    // Control: a trimmed 'CREDITS' must NOT match the source's 'CREDITS '. Guards
    // against a gate that would pass regardless of the transcribed value.
    expect('CREDITS').not.toBe(equText('MSCRED', '$50'))
    expect(quotedText("X EQU $99 'AB '"), 'the extractor keeps interior/trailing spaces').toBe('AB ')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Story title — attract → select → playing, composed from the jt10-2 cabinet
// edges (toSelect / startPlaying) and this story's selectPlayerCount. No new
// cabinet function: the pieces must FIT.
// ─────────────────────────────────────────────────────────────────────────────
describe('attract → select → playing composes through selectPlayerCount', () => {
  it('a TWO PLAYER START press seeds startPlaying with a 2-player game', async () => {
    const c = await loadCabinet()
    const s = await loadSelect()
    const attract = c.createCabinet(SEED)
    const select = c.toSelect(attract)
    expect(select.mode, 'coin-up → select').toBe('select')

    const count = s.selectPlayerCount('two-player')
    expect(count, 'two-player yields a startable count').toBe(2)
    const playing = c.startPlaying(select, SEED, count!)
    // Kills "the selected count is dropped on the way to startPlaying".
    expect(playing.mode, 'select → playing').toBe('playing')
    expect(playing.game, 'a fresh 2-player game, seeded').toEqual(createGame(SEED, 2))
    expect(playing.game.players.length, 'two ledgers for a 2-player start').toBe(2)
  })

  it('a ONE PLAYER START press seeds a 1-player game (distinct from the 2P path)', async () => {
    const c = await loadCabinet()
    const s = await loadSelect()
    const select = c.toSelect(c.createCabinet(SEED))
    const playing = c.startPlaying(select, SEED, s.selectPlayerCount('one-player')!)
    expect(playing.game, 'a fresh 1-player game').toEqual(createGame(SEED, 1))
  })

  it('no press keeps the machine in select (nothing to start)', async () => {
    const c = await loadCabinet()
    const s = await loadSelect()
    const select = c.toSelect(c.createCabinet(SEED))
    // null count → main.ts does not call startPlaying → the cabinet is unchanged.
    expect(s.selectPlayerCount(null), 'no start this frame').toBeNull()
    expect(select.mode, 'still on the select screen').toBe('select')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-6 — select.ts is pure core (the jt1-7 boundary scanner), imports no shell.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-6 select.ts is pure core', () => {
  it('passes the jt1-7 boundary scanner (no clock, entropy, browser surface, shell import)', () => {
    const hits = violations(readSelectSource(), 'select.ts')
    expect(hits, `select.ts tripped the purity scanner: ${hits.join(', ')}`).toEqual([])
  })

  it('names neither "window." nor "document." anywhere (the scanner reads comments)', () => {
    const src = readSelectSource()
    expect(src.includes('window.'), 'select.ts must not name window.').toBe(false)
    expect(src.includes('document.'), 'select.ts must not name document.').toBe(false)
  })

  it('imports no shell module — it is core DATA + a pure map', () => {
    const src = readSelectSource()
    expect(src, 'select.ts must not import from shell/').not.toMatch(/\bfrom\s+['"][^'"]*shell/i)
    expect(src, 'select.ts must not require()').not.toMatch(/\brequire\s*\(/)
  })

  it('the scanner is not vacuous — a live Date.now() is still caught', () => {
    expect(violations('export const x = Date.now()', 'probe.ts').length).toBeGreaterThan(0)
  })
})
