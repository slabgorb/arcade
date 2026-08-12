// tests/start-experience.test.ts
//
// Story jt11-1 — RED phase (Tyr / TEA). The START EXPERIENCE: a one-player game
// must spawn ONE knight, and the attract cycle must SAY how to start.
//
// Root cause (Architect review 2026-08-12, sprint/context/context-story-jt11-1.md):
// the 1P/2P choice threads readSelectInput → selectPlayerCount → startPlaying →
// createGame(seed, count) correctly, but game.ts drops `count` before the sim —
// createWaveSim(seed) hardcodes BOTH player mounts. The orphan P2 mount has no
// ledger behind it: its death is misattributed to P1's ledger (ledgerIndex clamp)
// and respawn iterates ledgers only, so it behaves as a knight with exactly one
// life. Lives-per-ledger (NSHIP = 5) is already correct and is NOT retuned here.
//
// Contract this suite pins (Dev implements):
//   • createWaveSim(seed, playerCount = 2) spawns exactly `playerCount` player
//     processes (ids 1..count from the transporter spawn constants) — enemies
//     unchanged;
//   • createGame(seed, playerCount) threads its count into the sim, so ledgers
//     and mounts can never diverge again;
//   • the default stays 2 — boot/attract self-play (main.ts) deliberately shows
//     the two-knight co-op demo, and the existing game.test.ts pins
//     createGame(SEED).sim toEqual createWaveSim(SEED);
//   • the attract cycle carries a visible start prompt: attractScreen exports
//     START_PROMPT ('PRESS 1 OR 2 TO START' — a PRESENTATION string, not a ROM
//     transcription: the cabinet had physical start buttons, the browser has
//     Digit1/Digit2) and layoutStartPrompt(colour), painted by main.ts on the
//     attract pages.
//
// Every module loads INSIDE its it() (the collection trap — see game.test's header note).
// Each test names the mutant it kills.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGame } from './helpers/game-contract.js'
import { loadSim, type SimState } from './helpers/sim-contract.js'
import { waveComplement } from './helpers/wave-entry.js'

const SEED = 0x1234
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/** The ids of the player processes, in process order — IDENTITY, not a count,
 *  so a regenerated or re-numbered mount cannot satisfy it. */
function playerIds(state: SimState): number[] {
  return state.sim.processes.filter((p) => p.kind === 'player').map((p) => p.id)
}

/** The wave's COMPLEMENT — the birds on the pads plus the ones still holding a
 *  transporter number (jt11-4 made arrival a queue, so at frame 0 they are all still
 *  queued). The assertion below is about how many enemies the wave FIELDS versus the
 *  player count, which is a fact about the wave row, not about arrival timing. */
function enemyCount(state: SimState): number {
  return waveComplement(state)
}

/** main.ts source with line comments stripped, so a wiring assertion cannot be
 *  satisfied by comment prose (the ?raw-grep trap). Block comments in main.ts
 *  are line-led (// …), so stripping line comments suffices. */
function mainCode(): string {
  const raw = readFileSync(join(repoRoot, 'src', 'main.ts'), 'utf8')
  return raw
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — one player selected means ONE knight in the sim
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — createWaveSim/createGame honour the player count', () => {
  it('createWaveSim(seed, 1) spawns exactly player 1 — no orphan P2 mount', async () => {
    const d = await loadSim()
    // Kills the root cause itself: sim.ts hardcoding both PLAYER1_ID and
    // PLAYER2_ID regardless of the coin-up choice.
    expect(
      playerIds(d.createWaveSim(SEED, 1)),
      'a 1P sim holds exactly the P1 mount — [1], by identity',
    ).toEqual([1])
  })

  it('createWaveSim(seed, 2) still spawns both knights, P1 then P2', async () => {
    const d = await loadSim()
    // Kills the over-correction mutant: a count plumbed as "always one".
    expect(playerIds(d.createWaveSim(SEED, 2)), '2P keeps [1, 2]').toEqual([1, 2])
  })

  it('createWaveSim(seed) defaults to two knights — the attract/boot contract', async () => {
    const d = await loadSim()
    // Kills the default-flip mutant: boot/attract self-play (main.ts boots the
    // cabinet with a bare createGame(SEED)) must keep showing the co-op demo.
    expect(playerIds(d.createWaveSim(SEED)), 'bare call keeps [1, 2]').toEqual([1, 2])
  })

  it('a 1P sim keeps the full wave-1 enemy complement (three bounders)', async () => {
    const d = await loadSim()
    // Kills the over-filter mutant: dropping P2 by filtering processes AFTER
    // assembly could eat an enemy; the enemy complement is count-independent.
    expect(enemyCount(d.createWaveSim(SEED, 1)), '3 bounders, count-independent').toBe(3)
    expect(enemyCount(d.createWaveSim(SEED, 2)), '3 bounders in 2P too').toBe(3)
  })

  it('createGame(seed, 1) threads the count into the sim — ledgers and mounts agree', async () => {
    const g = await loadGame()
    const game = g.createGame(SEED, 1)
    expect(game.players.length, 'one ledger (already correct pre-fix)').toBe(1)
    expect(game.players[0].lives, 'NSHIP = 5 lives on the one ledger — NOT retuned').toBe(5)
    // Kills the actual defect: createGame calling createWaveSim(seed) without
    // the count, leaving a ledger-less P2 mount that dies once and never returns.
    expect(
      playerIds(game.sim as unknown as SimState),
      'the sim under a 1P game holds exactly the P1 mount',
    ).toEqual([1])
  })

  it('createGame(seed, 1).sim IS createWaveSim(seed, 1) — no parallel sim for the 1P path', async () => {
    const g = await loadGame()
    const d = await loadSim()
    // The jt4-1 no-second-sim pin, restated for the counted path. (Green while
    // BOTH sides ignore the count; it bites the moment either side diverges.)
    expect(g.createGame(SEED, 1).sim).toEqual(d.createWaveSim(SEED, 1))
  })

  it('no P2 mount ever appears across 240 stepped frames of a 1P game', async () => {
    const g = await loadGame()
    let game = g.createGame(SEED, 1)
    // Kills the deferred-spawn mutant: no later reconcile frame may fabricate
    // a P2 id in a 1P game. SCOPE (measured, review round 1): across 240 idle
    // frames P1 never dies, so the respawn branch itself is NOT exercised here
    // — this pins quiescent stepping only. The respawn path's 1P behavior rests
    // on it iterating the LEDGERS (one ledger → only id 1 can re-enter), which
    // is structural, not proven by this loop.
    for (let f = 0; f < 240; f++) {
      game = g.stepGame(game, {})
      const ids = playerIds(game.sim as unknown as SimState)
      if (ids.some((id) => id === 2)) {
        expect.fail(`frame ${f + 1}: a P2 mount appeared in a 1P game (ids: ${ids.join(',')})`)
      }
    }
    expect(playerIds(game.sim as unknown as SimState)).not.toContain(2)
  })

  it('a 2P game is untouched: both mounts live at assembly and after 240 frames', async () => {
    const g = await loadGame()
    let game = g.createGame(SEED, 2)
    expect(playerIds(game.sim as unknown as SimState)).toEqual([1, 2])
    for (let f = 0; f < 240; f++) game = g.stepGame(game, {})
    // P2 may be dead-and-rematerialising at any instant, but the ledger count
    // never changes; the regression this kills is a count leak into 2P.
    expect(game.players.length, 'two ledgers survive stepping').toBe(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — the attract cycle SAYS how to start
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — the attract start prompt', () => {
  it('attractScreen exports START_PROMPT naming BOTH start keys', async () => {
    const mod = (await import('../src/shell/attractScreen.js')) as Record<string, unknown>
    // Kills the wrong-text mutant: a prompt that does not name the keys
    // ("GET READY", "START") leaves the player exactly as stuck as today.
    expect(typeof mod.START_PROMPT, 'START_PROMPT is exported').toBe('string')
    expect(mod.START_PROMPT as string).toMatch(/PRESS 1 OR 2/)
  })

  it('layoutStartPrompt lays every character out — the chosen font must carry digits', async () => {
    const mod = (await import('../src/shell/attractScreen.js')) as Record<string, unknown>
    const layout = mod.layoutStartPrompt as
      | ((colour: { r: number; g: number; b: number; a: number }) => {
          ops: readonly unknown[]
          width: number
          colour: { r: number; g: number; b: number; a: number }
        })
      | undefined
    expect(typeof layout, 'layoutStartPrompt is exported').toBe('function')
    const colour = { r: 255, g: 255, b: 255, a: 255 }
    const laid = layout!(colour)
    const prompt = mod.START_PROMPT as string
    // Kills the silent-skip mutant: layoutText SKIPS characters missing from the
    // font (fontRender.ts) — a font without '1'/'2' would render "PRESS  OR  TO
    // START" and pass any non-empty check. FONT57 carries a glyph for EVERY
    // character here including the space (LSPC, MESSAGE.SRC:444), so every
    // character must have produced a glyph op; a missing digit means fewer ops.
    expect(laid.ops.length, 'one glyph op per character (space has a glyph)').toBe(prompt.length)
    expect(laid.width, 'a laid-out prompt has width').toBeGreaterThan(0)
    expect(laid.colour, 'colour threads through unchanged').toEqual(colour)
  })

  it('main.ts imports layoutStartPrompt from the attract screen and calls it (wiring)', () => {
    const code = mainCode()
    // The import-statement idiom (gameover-wiring.test.ts): the symbol must be
    // imported FROM shell/attractScreen, not merely mentioned.
    expect(
      code,
      'layoutStartPrompt is imported from ./shell/attractScreen.js',
    ).toMatch(/import\s*\{[^}]*layoutStartPrompt[^}]*\}\s*from\s*'\.\/shell\/attractScreen\.js'/)
    // And CALLED from live code — comments are stripped, so prose cannot satisfy
    // this.
    const calls = code.match(/layoutStartPrompt\(/g) ?? []
    expect(calls.length, 'at least one live call site paints the prompt').toBeGreaterThanOrEqual(1)
  })

  it('renderAttract reaches the prompt paint on EVERY page — no early return (wiring)', () => {
    // Kills the review round-1 SURVIVOR: reverting renderAttract to its pre-fix
    // shape (early `return` inside the demo-page branch, before the prompt
    // paint) passed the call-site test above while un-fixing the story's
    // central bug — a demo page with no visible way to start. The prompt paint
    // is unconditional ONLY while the function body contains no return
    // statement, so pin exactly that: the demo page is where a stuck player
    // sits, and it must fall through to layoutStartPrompt.
    const code = mainCode()
    const body = code.match(/function renderAttract\(\): void \{([\s\S]*?)\n\}/)?.[1]
    expect(body, 'renderAttract exists in main.ts').toBeDefined()
    expect(body!, 'the attract render falls through to the prompt — no early return').not.toMatch(
      /\breturn\b/,
    )
    expect(body!, 'the prompt is laid out inside renderAttract itself').toMatch(
      /layoutStartPrompt\(/,
    )
  })
})
