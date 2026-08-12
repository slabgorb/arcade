// tests/highscore-entry-jt11-6-wiring.test.ts
//
// Story jt11-6 — RED (O'Brien / TEA). The two things a player actually sees: the
// INSTRUCTION line on the initials screen, and the entry timeout wired into the
// shell's frame pump so a walked-away qualifying score commits instead of
// evaporating. The timeout's NUMBER and its pure verbs are pinned next door in
// highscore-entry-jt11-6.test.ts; this file pins the SEAM.
//
// ─── WHAT IS ALREADY VERIFIED, AND THEREFORE NOT RE-LITIGATED HERE ───────────
// The persistence chain is correct today and was re-measured for this story: the
// game writes and the lobby reads the same `joust-high-scores` key through the
// shared highScoreKey, and the qualify gate feeds afterGameOver the PERSISTED
// table (pinned by highscore-wiring.test.ts). Nothing saves only because the
// commit gate is "exactly three initials AND a FLAP rising edge" — abandon the
// screen and the row is never written. So this story adds an instruction line
// (so the gate is discoverable) and a timeout (so it is escapable), and touches
// nothing about the storage seam.
//
// ─── THE INSTRUCTION LINE IS A PRESENTATION STRING, AND IT LIVES IN THE SHELL ─
// The ROM does put an instruction line on this screen — MSENT3 $6B, 'USE -MOVE-
// TO SELECT LETTER    -FLAP- TO ENTER LETTER' (MESSEQU.SRC:128), written by AMODE
// at TB12REV1.SRC:70. It cannot be transcribed verbatim: it names a MOVE/FLAP
// cursor cycler this port deliberately did not build (jt10-7's ruling — joust
// adopts the fleet's @shared/name-entry keyboard verb, so letters are TYPED). A
// verbatim MSENT3 would instruct a control the browser cabinet does not have.
// The precedent for that exact situation is jt11-1's START_PROMPT: a presentation
// string, in the SHELL beside the layout that uses it, naming the real browser
// keys. ENTRY_INSTRUCTIONS follows it — same home, same house style, and it keeps
// core/highscore.ts's ROM-string citation gate untouched.
//
// (No `<file>.ts:<line>` refs in these comments — the comment-line-refs guard bans
// them, and symbol names outlive line numbers anyway.)

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FONT35 } from '../src/core/font35.js'
import { LOGICAL_WIDTH } from '../src/shell/render.js'
import type { LaidOutText } from '../src/shell/fontRender.js'
import type { Rgba } from '../src/shell/render.js'

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const mainPath = join(srcDir, 'main.ts')
const GREEN: Rgba = { r: 0, g: 255, b: 0, a: 255 }

interface JoustRow {
  readonly name: string
  readonly score: number
  readonly wave: number
}

const TABLE: JoustRow[] = [
  { name: 'KEA', score: 4200, wave: 7 },
  { name: 'BOB', score: 3100, wave: 5 },
]

// The jt11-6 shape of the overlay: the existing lines plus the instruction line.
// Declared locally (not imported) so `tsc --noEmit` stays green while the member
// does not exist, and loaded through a runtime-assembled specifier so a missing
// export reddens each test with a self-describing message (the tp1-8 trap).
interface Jt11_6Layout {
  readonly heading: LaidOutText
  readonly rows: readonly LaidOutText[]
  readonly prompt: LaidOutText | null
  readonly instructions: LaidOutText | null
}

interface HighscoreScreenModule {
  readonly ENTRY_INSTRUCTIONS: string
  layoutHighscoreScreen(colour: Rgba, table: readonly JoustRow[], prompt?: string | null): Jt11_6Layout
}

async function loadScreen(): Promise<HighscoreScreenModule> {
  const specifier = ['..', '..', 'src', 'shell', 'highscoreScreen.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<HighscoreScreenModule>
    if (typeof mod.ENTRY_INSTRUCTIONS !== 'string') throw new Error('module has no `ENTRY_INSTRUCTIONS` string export')
    if (typeof mod.layoutHighscoreScreen !== 'function') throw new Error('module has no `layoutHighscoreScreen`')
    const probe = mod.layoutHighscoreScreen(GREEN, TABLE, 'ENTER YOUR INITIALS')
    if (probe.instructions === undefined) throw new Error('the layout has no `instructions` line')
    return mod as HighscoreScreenModule
  } catch (e) {
    throw new Error(
      'the jt11-6 entry INSTRUCTION line is not in src/shell/highscoreScreen.ts yet — GREEN adds an ' +
        'exported ENTRY_INSTRUCTIONS presentation string (the jt11-1 START_PROMPT precedent: name the real ' +
        'browser keys — the A-Z letter keys and SPACE, joust\'s FLAP) and returns it as an `instructions` ' +
        `LaidOutText in FONT35, non-null exactly while an entry prompt is showing. (${(e as Error).message})`,
    )
  }
}

function readMain(): string {
  if (!existsSync(mainPath)) throw new Error('src/main.ts is missing')
  return readFileSync(mainPath, 'utf8')
}

/** One import statement's specifier + brace-list, so an assertion can prove a
 *  symbol is imported FROM a module rather than merely mentioned in a comment
 *  (the highscore-wiring / select-wiring idiom). */
function importsFrom(src: string, moduleMatch: RegExp, symbol: string): boolean {
  const importRe = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]/g
  for (const m of src.matchAll(importRe)) {
    const [, names, spec] = m
    if (moduleMatch.test(spec) && names.split(',').some((n) => n.trim().replace(/\s+as\s+.*/, '') === symbol)) {
      return true
    }
  }
  return false
}

/**
 * The PUMP's 'highscore' branch — not the keydown handler's mode guard and not the
 * render else-if, both of which also test the same mode. Identified by the confirm
 * edge it owns (prevHsFlap), so the slice cannot silently become the wrong block.
 * Returns the branch body text.
 */
function highscorePumpBranch(src: string): string {
  const needle = "if (cabinet.mode === 'highscore') {"
  let from = 0
  for (;;) {
    const at = src.indexOf(needle, from)
    if (at < 0) throw new Error("main.ts has no pump branch `if (cabinet.mode === 'highscore') {`")
    const end = src.indexOf('\n      }', at)
    const body = src.slice(at, end < 0 ? src.length : end)
    if (body.includes('prevHsFlap')) return body
    from = at + needle.length
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-A — the instruction line. The felt bug is that the commit gate is invisible:
// a player who does not know that SPACE confirms has no way to learn it on screen.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-A the entry screen carries an on-screen instruction line', () => {
  it('the layout returns an instructions line in FONT35 carrying ENTRY_INSTRUCTIONS', async () => {
    const { layoutHighscoreScreen, ENTRY_INSTRUCTIONS } = await loadScreen()
    const screen = layoutHighscoreScreen(GREEN, TABLE, 'ENTER YOUR INITIALS')
    expect(screen.instructions, 'the instruction line is laid out while entering').not.toBeNull()
    const laid = screen.instructions as LaidOutText
    // FONT35 is the tight score font the rows and the prompt use; FONT57 would be
    // the wide banner font, and a banner-width instruction line runs off the screen.
    expect(laid.height, 'FONT35 cell height').toBe(FONT35.cellHeight)
    expect(laid.width, 'the advance of ENTRY_INSTRUCTIONS in FONT35').toBe(
      ENTRY_INSTRUCTIONS.length * FONT35.cellWidth,
    )
    expect(laid.colour, 'painted in the screen colour, like every other line').toEqual(GREEN)
  })

  it('every character of ENTRY_INSTRUCTIONS has a glyph — no invisible characters', async () => {
    const { ENTRY_INSTRUCTIONS, layoutHighscoreScreen } = await loadScreen()
    // layoutText ADVANCES the cursor for a character it cannot draw, so a lowercase
    // letter or a `/` or a `:` costs its full cell and paints nothing. The line would
    // render with holes and nobody would see it in a test that only checks the string.
    const missing = [...ENTRY_INSTRUCTIONS].filter((ch) => FONT35.glyphFor(ch) === undefined)
    expect(missing, `FONT35 has no glyph for: ${missing.join(' ')}`).toEqual([])
    const laid = layoutHighscoreScreen(GREEN, TABLE, 'ENTER YOUR INITIALS').instructions as LaidOutText
    expect(laid.ops.length, 'one painted glyph per character').toBe(ENTRY_INSTRUCTIONS.length)
  })

  it('it fits across the logical screen, so it cannot be laid out off the edge', async () => {
    const { layoutHighscoreScreen } = await loadScreen()
    const laid = layoutHighscoreScreen(GREEN, TABLE, 'ENTER YOUR INITIALS').instructions as LaidOutText
    // The caller centres each line, so a line wider than the backbuffer is clipped at
    // BOTH ends — the exact failure a "just add more words" edit produces.
    expect(laid.width, `${LOGICAL_WIDTH}px of logical screen`).toBeLessThanOrEqual(LOGICAL_WIDTH)
  })

  it('it names the keys a player must press: the A-Z letters and SPACE, the FLAP button', async () => {
    const { ENTRY_INSTRUCTIONS } = await loadScreen()
    // Kills a decorative line ('ENTER YOUR NAME') that repeats the prompt and teaches
    // nothing. The three facts a stuck player needs are the letter keys, the confirm
    // key by its REAL browser name, and joust's own word for it.
    expect(ENTRY_INSTRUCTIONS, 'names the A-Z letter keys').toMatch(/A-Z/)
    expect(ENTRY_INSTRUCTIONS, 'names SPACE, the key that actually confirms').toMatch(/\bSPACE\b/)
    expect(ENTRY_INSTRUCTIONS, "names FLAP, the cabinet's own verb (MSENT3's idiom)").toMatch(/\bFLAP\b/)
    expect(ENTRY_INSTRUCTIONS, 'and it is upper case, the only case joust has glyphs for').toBe(
      ENTRY_INSTRUCTIONS.toUpperCase(),
    )
  })

  it('it is shown while entering and NOT while the board is merely on display', async () => {
    const { layoutHighscoreScreen } = await loadScreen()
    // The overlay doubles as the plain JOUST CHAMPIONS board (prompt null). Telling a
    // spectator which keys to press would be noise, and it is the one placement rule
    // a node test can hold: instructions track the prompt.
    expect(layoutHighscoreScreen(GREEN, TABLE, null).instructions, 'no prompt → no instructions').toBeNull()
    expect(layoutHighscoreScreen(GREEN, TABLE).instructions, 'the default is the board, not the entry').toBeNull()
    expect(layoutHighscoreScreen(GREEN, TABLE, 'ENTER YOUR INITIALS').instructions, 'entering → shown').not.toBeNull()
  })

  it('the heading and rows still lay out as before — the line is added, not swapped in', async () => {
    const { layoutHighscoreScreen } = await loadScreen()
    const screen = layoutHighscoreScreen(GREEN, TABLE, 'ENTER YOUR INITIALS')
    expect(screen.rows.length, 'one row per table entry').toBe(TABLE.length)
    expect(screen.prompt, 'the rank-conditional prompt survives').not.toBeNull()
    expect(screen.heading.height, 'the heading is still the FONT57 banner').toBeGreaterThan(FONT35.cellHeight)
  })

  it('main.ts paints the instruction line', () => {
    const src = readMain()
    // Kills "laid out but never painted" — the layout is data; only a paint call puts
    // it on the screen. Its Y is a human smoke test, as with every other line here.
    expect(src, 'renderHighscoreScreen paints screen.instructions').toMatch(
      /paintText\(\s*screen\.instructions/,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-B — the timeout, wired. The countdown is spent by the FRAME PUMP (the shell
// owns the clock; core counts ticks), and expiry commits through the SAME path as
// the manual confirm.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-B main.ts spends the entry timeout and auto-commits on expiry', () => {
  it('imports the timeout verbs from core/highscore', () => {
    const src = readMain()
    for (const sym of ['ENTRY_TIMEOUT_TICKS', 'tickEntry', 'isEntryExpired', 'timeoutInitials']) {
      // ENTRY_TIMEOUT_TICKS may legitimately be unused by the shell (beginEntry seeds
      // it), so only the three verbs are required imports.
      if (sym === 'ENTRY_TIMEOUT_TICKS') continue
      expect(importsFrom(src, /core\/highscore(\.js)?$/, sym), `${sym} from core/highscore`).toBe(true)
    }
  })

  it('spends one tick per pumped frame, inside the highscore branch', () => {
    const branch = highscorePumpBranch(readMain())
    // The pump is the only place a frame is owed, so this is where the budget is
    // spent. Kills "ticked in the render path" (which runs at the display's rate, not
    // the ROM's, so the timeout would drift with the monitor) and "ticked in keydown"
    // (which would make the countdown depend on typing).
    expect(branch, 'entry = tickEntry(entry) in the pump branch').toMatch(/entry\s*=\s*tickEntry\(\s*entry\s*\)/)
  })

  it('auto-commits the space-padded initials when the budget runs out', () => {
    const branch = highscorePumpBranch(readMain())
    expect(branch, 'the expiry is tested with isEntryExpired').toMatch(/isEntryExpired\(\s*entry\s*\)/)
    // The whole point of the story: what commits is the CURRENT buffer, padded — not
    // a completeness check that drops a 0- or 2-letter walk-away on the floor.
    expect(branch, 'the expired commit uses timeoutInitials(entry)').toMatch(/timeoutInitials\(\s*entry\s*\)/)
  })

  it('persistence still happens at exactly ONE call site — the auto-commit reuses the manual path', () => {
    const src = readMain()
    // Two save sites drift: one gains a table cap, a rank recompute or a reset and the
    // other does not, and which row you get depends on how you left the screen. The AC
    // says the timeout commits through the same gate; this is that gate, measured.
    const saves = [...src.matchAll(/highScores\.save\(/g)].length
    expect(saves, 'one and only one highScores.save( call site').toBe(1)
    const commits = [...src.matchAll(/commitEntry\(/g)].length
    expect(commits, 'one and only one commitEntry( call site').toBe(1)
  })

  it('the manual FLAP confirm keeps its rising-edge + completeness guard', () => {
    const branch = highscorePumpBranch(readMain())
    // Regression fence: the timeout must not be implemented by loosening the manual
    // gate. A held flap must still not re-commit every frame, and a manual confirm
    // must still require all three letters (the auto-commit is the ONLY partial one).
    expect(branch, 'the confirm still rides !prevHsFlap').toMatch(/!prevHsFlap/)
    expect(branch, 'and still requires a complete buffer').toMatch(/isEntryComplete\(\s*entry\s*\)/)
    expect(branch, 'the edge level is still recorded for the next frame').toMatch(/prevHsFlap\s*=\s*flapHeld/)
  })

  it('the timeout is counted in frames — main.ts adds no wall-clock timer for it', () => {
    const src = readMain()
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    // main.ts legitimately owns requestAnimationFrame (the pump). A setTimeout or a
    // Date.now would be a SECOND clock for this one screen, running while the tab is
    // backgrounded and diverging from every other cadence in the cabinet.
    for (const banned of ['setTimeout', 'setInterval', 'Date.now', 'performance.now']) {
      expect(code, `main.ts must not add ${banned} — the entry timeout is pumped frames`).not.toContain(banned)
    }
  })

  it('an expired entry leaves the screen — the cabinet returns to attract', () => {
    const branch = highscorePumpBranch(readMain())
    // The ROM's expiry falls through to VATTRT, and so must ours: committing without
    // leaving would re-commit the same row on every subsequent frame.
    expect(branch, 'the branch routes back to attract').toMatch(/toAttract\(/)
  })
})
