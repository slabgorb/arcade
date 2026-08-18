// tests/click-to-enter-jt13-4.test.ts
//
// Story jt13-4 — RED (O'Brien / TEA). Player-reported (epic jt13): the attract
// screen tells the player to "PRESS 1 OR 2 TO START", but the browser cabinet has
// no physical 1/2 buttons — a new player is stuck watching the demo with nothing to
// press. Replace the 'press 1'/coin-start prompt flow with CLICK-TO-ENTER: a click
// starts the game directly, SINGLE PLAYER only, and the 1-button prompt text is gone.
//
// ─── SCOPE (2-point chore) ────────────────────────────────────────────────────────
// This story changes exactly two things: (1) the presentation string the attract
// pages paint (attractScreen.START_PROMPT), and (2) main.ts wiring — a pointer/click
// listener that begins a single-player game directly. It does NOT tear out the
// keyboard/coin-up state machine (jt11-16 title→select, jt11-17 attract digit-start,
// the select mode); those paths survive dormant and are out of scope for this size.
// The one SUPERSEDED assertion is start-experience.test.ts AC-2's old prompt text,
// retargeted there to this new contract (jt13-4 supersedes jt11-1's prompt wording).
//
// ─── WHY SOURCE-SCAN for the wiring ────────────────────────────────────────────────
// main.ts is a SHELL file that mounts the canvas and runs a rAF frame loop; a node
// test cannot drive that loop. So the WIRING is pinned as source text (the
// select-wiring / attract-direct-start idiom): line comments are stripped before every
// code assertion (a keyword in a comment or string cannot satisfy the guard —
// typescript lang-review #15), and each test names the mutant it kills. The pure
// START_PROMPT constant IS imported and asserted directly (a real value, not source
// text). No `<file>.ts:<line>` refs in these comments (the comment-line-refs guard).

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const mainPath = join(srcDir, 'main.ts')

function readMain(): string {
  if (!existsSync(mainPath)) throw new Error('src/main.ts is missing')
  return readFileSync(mainPath, 'utf8')
}

/** main.ts with BOTH block (`/* … *​/`) and line (`// …`) comments stripped, so a wiring
 *  assertion matches CODE, not comment prose or a string literal (the ?raw-grep trap —
 *  lang-review #15). main.ts carries ~15 JSDoc `/** … *​/` blocks, so stripping only line
 *  comments is NOT enough — a block-comment mention of `addEventListener('pointerdown'`
 *  would satisfy a bare keyword guard with no real listener present (caught in review by
 *  the rule-checker's mutation test). Strip block comments first, then line comments. */
function mainCode(): string {
  return readMain()
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n')
}

/**
 * The inline BODY of the first `addEventListener('<pointer/click>', … => { … })` in
 * `src`, extracted by brace-matching from the arrow's opening `{`. Returns null when
 * no pointer/click listener is registered, or when its handler is not an inline arrow
 * with a block body (the repo idiom — the keydown handler is exactly this shape). The
 * brace scan ignores nothing clever: main.ts's handlers are small and self-contained,
 * so a naive depth counter over `{`/`}` is sufficient and self-evidently correct.
 */
function clickListenerBody(src: string): string | null {
  const open = /addEventListener\(\s*['"](?:pointerdown|mousedown|click)['"]\s*,\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{/
  const m = open.exec(src)
  if (!m) return null
  const start = m.index + m[0].length // first char inside the arrow body
  let depth = 1
  for (let i = start; i < src.length; i++) {
    const c = src[i]
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return src.slice(start, i)
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — the prompt invites a CLICK; the 1-button text is gone.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — START_PROMPT invites a click, not a numbered-button press', () => {
  it('START_PROMPT names a CLICK', async () => {
    const mod = (await import('../src/shell/attractScreen.js')) as Record<string, unknown>
    expect(typeof mod.START_PROMPT, 'START_PROMPT is still an exported string').toBe('string')
    // Kills the unchanged-text mutant: the whole story is that the prompt must tell the
    // player to CLICK. A prompt that omits the word leaves them exactly as stuck.
    expect(mod.START_PROMPT as string, 'the prompt tells the player to CLICK').toMatch(/CLICK/)
  })

  it('START_PROMPT no longer instructs pressing the 1 (or 2) button', async () => {
    const mod = (await import('../src/shell/attractScreen.js')) as Record<string, unknown>
    // Kills the leftover-coin-prompt mutant: the story says REMOVE the 1-button prompt
    // text. None of the press-a-digit phrasings may survive.
    expect(mod.START_PROMPT as string, 'no "PRESS 1"/"1 OR 2"/"PRESS 2" text remains').not.toMatch(
      /PRESS\s*1|1\s*OR\s*2|PRESS\s*2/,
    )
  })

  it('layoutStartPrompt lays every character out — the font carries the new glyphs', async () => {
    const mod = (await import('../src/shell/attractScreen.js')) as Record<string, unknown>
    const layout = mod.layoutStartPrompt as
      | ((colour: { r: number; g: number; b: number; a: number }) => {
          ops: readonly unknown[]
          width: number
        })
      | undefined
    expect(typeof layout, 'layoutStartPrompt is exported').toBe('function')
    const laid = layout!({ r: 255, g: 255, b: 255, a: 255 })
    const prompt = mod.START_PROMPT as string
    // Kills the silent-skip mutant (the jt11-1 lesson): layoutText SKIPS characters
    // missing from FONT57, so a prompt using a glyph the font lacks would render with
    // gaps and still be non-empty. One op per character (space has a glyph) proves
    // every character in the NEW prompt is carried by the font.
    expect(laid.ops.length, 'one glyph op per character — no silently-dropped glyph').toBe(
      prompt.length,
    )
    expect(laid.width, 'a laid-out prompt has width').toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — a click starts a game directly (wiring): main.ts registers a pointer/click
// listener that begins a game.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — main.ts wires a click-to-start listener', () => {
  it('registers a pointer/click event listener', () => {
    const code = mainCode()
    // RED today: main.ts listens for 'keydown' / 'pagehide' / 'visibilitychange' only.
    expect(
      code,
      'a pointerdown/mousedown/click listener is registered',
    ).toMatch(/addEventListener\(\s*['"](?:pointerdown|mousedown|click)['"]/)
  })

  it('the click listener begins a game directly via enterPlaying', () => {
    const body = clickListenerBody(mainCode())
    expect(body, 'an inline pointer/click handler exists (arrow with a block body)').not.toBeNull()
    // RED today: no such handler, so no enterPlaying inside one.
    expect(body!, 'the click handler starts a game directly (enterPlaying)').toMatch(
      /enterPlaying\s*\(/,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — SINGLE PLAYER only: the click starts exactly one player.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 — the click entry is single-player only', () => {
  it('the click handler starts one player — enterPlaying(1)', () => {
    const body = clickListenerBody(mainCode())
    expect(body, 'an inline pointer/click handler exists').not.toBeNull()
    // Single player is the spec here (unlike jt11-17, where a literal count was the
    // anti-pattern): the click must start exactly ONE player.
    expect(body!, 'the click starts a single-player game — literal count 1').toMatch(
      /enterPlaying\s*\(\s*1\s*\)/,
    )
  })

  it('the click handler never starts a two-player game', () => {
    const body = clickListenerBody(mainCode())
    expect(body, 'an inline pointer/click handler exists').not.toBeNull()
    // Kills the wrong-count mutant: "single player only" forbids the click ever
    // seeding a 2P game (enterPlaying(2)) or re-routing to the 1P/2P select coin-up.
    expect(body!, 'the click never starts two players').not.toMatch(/enterPlaying\s*\(\s*2\s*\)/)
    expect(body!, 'the click does not open the 1P/2P select re-prompt').not.toMatch(/toSelect\s*\(/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — the click START is GATED to the IDLE/ENTRY screens only (attract / title /
// select). It must NOT start during 'playing' (re-seeds a live run), 'gameover' (bypasses
// afterGameOver's high-score qualification) or 'highscore' (abandons an in-flight initials
// entry, bypassing commitHighScore). typescript lang-review #14: an event that mutates run
// state must gate on the state — and here the gate must be an ALLOWLIST, not a bare
// `!== 'playing'` (the under-inclusive form the review's rule-checker mutation-caught).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 — the click start is gated to the idle/entry screens', () => {
  it('the click handler starts only from attract / title / select', () => {
    const body = clickListenerBody(mainCode())
    expect(body, 'an inline pointer/click handler exists').not.toBeNull()
    // The allowlist: a game may begin from any of the three entry screens.
    expect(body!, 'the handler starts from attract').toMatch(/mode\s*===\s*'attract'/)
    expect(body!, 'the handler starts from title').toMatch(/mode\s*===\s*'title'/)
    expect(body!, 'the handler starts from select').toMatch(/mode\s*===\s*'select'/)
  })

  it('the click handler never starts during play, game-over, or initials entry', () => {
    const body = clickListenerBody(mainCode())
    expect(body, 'an inline pointer/click handler exists').not.toBeNull()
    // Kills the under-inclusive `!== 'playing'` guard: it also fired during 'highscore'
    // (losing a qualifying row) and 'gameover' (bypassing qualification). An allowlist of
    // entry screens never names 'gameover'/'highscore', so their absence proves the click
    // cannot start from them; the bare not-playing form is likewise forbidden.
    expect(body!, 'the handler does not start from game-over or initials entry').not.toMatch(
      /'gameover'|'highscore'/,
    )
    expect(body!, 'the guard is an allowlist, not a bare not-playing check').not.toMatch(
      /!==\s*'playing'/,
    )
  })
})
