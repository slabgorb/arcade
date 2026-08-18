// tests/attract-extra-mount-jt13-3.test.ts
//
// Story jt13-3 — RED (Leeloo / TEA). The entry/attract MARQUE screen shows a broken
// "EXTRA MOUNT EVERY" line: it paints only the prefix and drops both the numeric
// replay level AND the ",000 POINTS" suffix, so the line dangles as "EXTRA MOUNT
// EVERY" with no value. The either/or in the story ("read the setting OR remove the
// line") was RULED to READ THE SETTING per the ROM — removing it would regress
// fidelity, because the ROM shows the line by default (a nonzero replay level).
//
// ─── WHAT THE MACHINE DOES (ROM ground truth) ────────────────────────────────
// The MARQUE routine prints the full line and READS the operator replay level
// (ATT.SRC:63-79):
//   TSTA / BEQ 20$        ; ANY EXTRA MEN ALLOWED? skip the message if none
//   LDD #MSW17*256+$33    ; MSW17 = "EXTRA MOUNT EVERY "  (MESSEQU.SRC:158)
//   LDX #REPLAY / RCMSA   ; GET REPLAY LEVEL              (ATT.SRC:72)
//   JSR OUTBCD            ; DISPLAY THOUSANDS OF REPLAY POINTS (ATT.SRC:78)
//   LDA #MSW18 / OUTPHR   ; MSW18 = ",000 POINTS"         (MESSEQU.SRC:157)
// REPLAY holds BCD 20 (EQU.SRC:110, the "thousands"), so OUTBCD prints "20" and the
// authentic default line is "EXTRA MOUNT EVERY 20,000 POINTS". The port's
// REPLAY_INTERVAL is the same operator setting in full points (20_000 = BCD 20 ×
// 1000, TB12REV3.SRC:134 "REPLAY @20,000").
//
// ─── THE SEAM THIS SUITE PINS (core/shell boundary, jt1-7) ───────────────────
// The number SELECTION is core DATA; only pixel PLACEMENT is the shell's job:
//   1. core/game exports REPLAY_INTERVAL (the operator replay setting; today it is
//      an un-exported const).
//   2. core/title adds a pure `extraMountThousands(interval)` — the OUTBCD "thousands
//      of replay points" derivation (interval / 1000) — so the displayed number is
//      READ from the setting, never a hand-typed literal.
//   3. shell/titleScreen's layoutTitleScreen gains a `replayLevel` LaidOutText (the
//      digits, "20" by default) between the existing `extraMount` and `pointsSuffix`
//      slots — which stay exactly as title.test.ts pins them.
//   4. main.ts's renderTitleScreen paints all three parts (prefix, number, suffix)
//      adjacently, so the on-screen line reads "EXTRA MOUNT EVERY 20,000 POINTS".
//
// ─── WHY SOURCE-SCAN FOR main.ts ─────────────────────────────────────────────
// main.ts is a SHELL file that drives the canvas frame loop; a node test cannot run
// it. The wiring assertions below strip comments first (so prose cannot satisfy them)
// and slice the renderTitleScreen body. The core derivation and the shell layout are
// exercised for real. (No `<file>.ts:<line>` refs in these comments — the
// comment-line-refs guard bans them; symbol names outlive line numbers. ROM `.SRC`
// cites are exempt.)

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FONT57 } from '../src/core/font57.js'
import { layoutTitleScreen } from '../src/shell/titleScreen.js'
import type { LaidOutText } from '../src/shell/fontRender.js'
import type { Rgba } from '../src/shell/render.js'
import * as titleCore from '../src/core/title.js'
import * as gameCore from '../src/core/game.js'

const GREEN: Rgba = { r: 0, g: 255, b: 0, a: 255 }
const AMBER: Rgba = { r: 255, g: 191, b: 0, a: 255 }

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const coreTitlePath = join(srcDir, 'core', 'title.ts')
const mainPath = join(srcDir, 'main.ts')

function readMain(): string {
  if (!existsSync(mainPath)) throw new Error('src/main.ts is missing')
  return readFileSync(mainPath, 'utf8')
}

/** main.ts with line comments stripped, so a wiring assertion cannot be satisfied by
 *  comment prose (the ?raw-grep trap). main.ts block comments are line-led (// …). */
function mainCode(): string {
  return readMain()
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n')
}

/** The renderTitleScreen function body (comments stripped). Throws self-describingly
 *  if the function is gone — it must always exist to paint the MARQUE overlay. */
function renderTitleBody(): string {
  const code = mainCode()
  const m = code.match(/function renderTitleScreen\(\)\s*:\s*void\s*\{([\s\S]*?)\n\}/)
  if (m === null) throw new Error('main.ts has no `function renderTitleScreen(): void { … }`')
  return m[1]
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 / AC-4 — the number is READ from the operator replay setting (not hardcoded),
// and the full phrase composes from the EXISTING core strings (no invented text).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2/AC-4 the replay level is derived from the setting', () => {
  it('core/game exports REPLAY_INTERVAL — the operator replay setting (20,000)', () => {
    // The export is enforced at compile time (typed access below); this pins the value.
    expect(gameCore.REPLAY_INTERVAL, 'REPLAY_INTERVAL is the 20,000-point replay interval').toBe(20_000)
  })

  it('extraMountThousands(interval) yields the OUTBCD thousands, derived not hardcoded', () => {
    const fn = titleCore.extraMountThousands
    expect(typeof fn, 'core/title exports a pure extraMountThousands(interval)').toBe('function')
    // OUTBCD prints the thousands of REPLAY: 20,000 -> 20.
    expect(fn(20_000), '20,000 points prints "20" thousands').toBe(20)
    // Genuinely derived from the argument — a body that `return 20` would pass the
    // line above but fails here (kills the hardcoded-constant mutant).
    expect(fn(30_000), 'derived from the setting, not a fixed 20').toBe(30)
    expect(fn(50_000), 'derived from the setting, not a fixed 20').toBe(50)
    // Fed the real setting, it is 20.
    expect(fn(gameCore.REPLAY_INTERVAL), 'the default setting prints 20').toBe(20)
  })

  it('the default line composes to "EXTRA MOUNT EVERY 20,000 POINTS" from the core strings', () => {
    // Reuses TITLE_EXTRA_MOUNT + the derived number + TITLE_POINTS_SUFFIX — no new literal.
    const line =
      titleCore.TITLE_EXTRA_MOUNT +
      String(titleCore.extraMountThousands(gameCore.REPLAY_INTERVAL)) +
      titleCore.TITLE_POINTS_SUFFIX
    expect(line, 'the authentic MARQUE extra-mount line').toBe('EXTRA MOUNT EVERY 20,000 POINTS')
  })

  it('the extraMountThousands derivation cites its ROM OUTBCD source', () => {
    const src = existsSync(coreTitlePath) ? readFileSync(coreTitlePath, 'utf8') : ''
    const at = src.indexOf('export function extraMountThousands')
    expect(at, 'extraMountThousands exists in core/title').toBeGreaterThan(0)
    // Scope the citation check to the function's OWN preceding docstring, so deleting
    // THIS citation reddens — not merely the pre-existing logo/palette ATT.SRC cites
    // elsewhere in the file (which would leave a whole-file toContain green).
    const docstring = src.slice(Math.max(0, at - 500), at)
    expect(docstring, 'the derivation cites its ATT.SRC / OUTBCD ROM anchor').toContain('ATT.SRC')
    expect(docstring, 'the derivation cites the OUTBCD thousands-of-replay anchor').toContain('OUTBCD')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 / AC-3 — the shell lays the number out as FONT57 glyphs. The default replay
// level renders "20"; neither the number nor the suffix may be omitted.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1/AC-3 layoutTitleScreen lays the replay level out', () => {
  it('exposes a replayLevel LaidOutText in FONT57', () => {
    const rl: LaidOutText = layoutTitleScreen(GREEN).replayLevel
    expect(rl, 'layoutTitleScreen must expose a replayLevel line (the BCD thousands)').toBeDefined()
    expect(rl.height, 'replayLevel is FONT57 (cell height 7)').toBe(FONT57.cellHeight)
  })

  it('renders the default thousands "20" — two FONT57 digit glyphs, right width', () => {
    const rl: LaidOutText = layoutTitleScreen(GREEN).replayLevel
    // "20" is two glyphs, advanced by the fixed FONT57 cell.
    expect(rl.ops.length, '"20" is two digit glyphs').toBe(2)
    expect(rl.width, 'two digits × FONT57 cell width').toBe(2 * FONT57.cellWidth)
    expect(rl.ops[0].glyph, "first digit glyph is FONT57 '2'").toBe(FONT57.glyphFor('2'))
    expect(rl.ops[1].glyph, "second digit glyph is FONT57 '0'").toBe(FONT57.glyphFor('0'))
  })

  it("threads the caller's colour onto the replay level (not hard-wired)", () => {
    const rlG: LaidOutText = layoutTitleScreen(GREEN).replayLevel
    const rlA: LaidOutText = layoutTitleScreen(AMBER).replayLevel
    expect(rlG.colour, 'replayLevel carries GREEN').toEqual(GREEN)
    expect(rlA.colour, 'replayLevel carries AMBER').toEqual(AMBER)
    expect(rlA.colour, 'the colour is threaded, not hard-wired').not.toEqual(rlG.colour)
  })

  it('all three parts of the line are non-empty — none is omitted (AC-3)', () => {
    const screen = layoutTitleScreen(GREEN)
    expect(screen.extraMount.ops.length, 'the "EXTRA MOUNT EVERY " prefix renders').toBeGreaterThan(0)
    expect(screen.replayLevel.ops.length, 'the numeric replay level renders').toBeGreaterThan(0)
    expect(screen.pointsSuffix.ops.length, 'the ",000 POINTS" suffix renders').toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 / AC-3 — main.ts wiring: renderTitleScreen must PAINT the number and the
// suffix, not only the prefix. This is the reported bug — today it paints only
// screen.extraMount and drops the rest.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1/AC-3 renderTitleScreen paints prefix + number + suffix', () => {
  it('paints the replay level (screen.replayLevel) — kills the dropped-number bug', () => {
    const body = renderTitleBody()
    expect(body, 'renderTitleScreen paints the numeric replay level').toMatch(/screen\.replayLevel/)
  })

  it('paints the ",000 POINTS" suffix (screen.pointsSuffix) — kills the dropped-suffix bug', () => {
    const body = renderTitleBody()
    expect(body, 'renderTitleScreen paints the points suffix').toMatch(/screen\.pointsSuffix/)
  })

  it('still paints the "EXTRA MOUNT EVERY " prefix (regression fence)', () => {
    const body = renderTitleBody()
    expect(body, 'renderTitleScreen still paints the extra-mount prefix').toMatch(/screen\.extraMount/)
  })
})
