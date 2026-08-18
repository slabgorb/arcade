// tests/title-boot-jt11-16-wiring.test.ts
//
// Story jt11-16 — RED (Han Solo / TEA). The cabinet boots into the attract self-play
// demo and never shows the MARQUE/logo title first. The title machinery is complete
// across all three tiers (core `title.ts`, shell `titleScreen.ts`, the render switch's
// `renderTitleScreen`) but reachable only from tests: the cabinet `toTitle` edge had
// no production caller and the boot hardwired `mode: 'attract'`. This story wires the
// present-but-unreachable title MODE so boot shows MARQUE first, dwells, and hands off
// to attract. (jt13-8 then retired the still-uncalled `toTitle` edge itself — boot now
// sets `mode: 'title'` inline, which is what the AC-D assertions below pin.)
//
// ─── A1: WHAT THE MACHINE DOES (ROM research, read for this story) ────────────
// Joust's attract mode has TWO presentations (rom-study/subsystems.md §6): the MARQUE
// logo page (ATT.SRC) and the ATMST instructional demo sequence (live self-play behind
// captions). The dossier's frozen claim JT104-002 (docs/rom-study/claims/attract.json)
// pins the MARQUE dwell verbatim — ATT.SRC:121: `LDA #111  111 * 10 = 1,110 = 18.5 SEC`
// — at 1110 VIDEO FRAMES, after which MARQUE does `JMP VSIM` into the demo. So the
// authentic order is MARQUE (title) FIRST → demo. That constant is already transcribed
// in core/attract-scheduler.ts as MARQUE_DWELL_FRAMES; the title dwell reuses it.
//
//   (Note: the story's setup context quoted a "256 × PCNAP 30 = 7680 ticks" dwell from
//   TB12REV1 — that is not the MARQUE dwell and not in frames. The ROM value is 1110
//   frames, pinned below so the wrong figure cannot reach GREEN.)
//
// ─── THE APPROACH THIS SUITE PINS (ROM-determined, not a free choice) ─────────
// The render switch already dispatches renderTitleScreen on `cabinet.mode === 'title'`
// — the title is a cabinet MODE. Showing it at boot with NO new render code (the story's
// constraint) therefore means: boot `mode: 'title'`, spend the MARQUE dwell in the frame
// pump, then `toAttract`; a start press during the title goes to the coin-up `select`
// (the same `attract/title -> select` edge cabinet.ts documents, edge-debounced like the
// attract branch). The alternative — a title page inside the attract PAGE_ORDER — would
// need a NEW renderTitleScreen call in renderAttract and would edit the CORE scheduler,
// so it is ruled out here.
//
// ─── WHY SOURCE-SCAN ──────────────────────────────────────────────────────────
// main.ts is a SHELL file that touches the canvas/DOM; a node test cannot run its frame
// loop. This file pins the WIRING as source text (the highscore-entry / select-wiring
// idiom): comments are stripped before every code assertion, branches are sliced by a
// marker they own, and each test names the mutant it kills. The pure mode transitions
// (toSelect/toAttract) are already pinned in cabinet.test.ts and not re-litigated (the
// title edge is now the inline boot literal, not a `toTitle` call — retired at jt13-8).
//
// (No `<file>.ts:<line>` refs in these comments — the comment-line-refs guard bans them,
// and symbol names outlive line numbers anyway. ROM `.SRC` cites are exempt.)

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MARQUE_DWELL_FRAMES } from '../src/core/attract-scheduler.js'

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const mainPath = join(srcDir, 'main.ts')

function readMain(): string {
  if (!existsSync(mainPath)) throw new Error('src/main.ts is missing')
  return readFileSync(mainPath, 'utf8')
}

/** main.ts with line comments stripped, so a wiring assertion cannot be satisfied by
 *  comment prose (the ?raw-grep trap). Block comments in main.ts are line-led (// …),
 *  so stripping line comments suffices — the start-experience.test.ts idiom. */
function mainCode(): string {
  return readMain()
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n')
}

/** One import statement's specifier + brace-list, so an assertion proves a symbol is
 *  imported FROM a module rather than merely mentioned (the select-wiring idiom). */
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

/** The boot cabinet initializer's object body: `let cabinet: CabinetState = { … }`.
 *  Comments stripped first, so the match is code. Throws self-describingly if the
 *  declaration is gone (it should never be — the boot must construct a cabinet). */
function bootCabinetBody(): string {
  const code = mainCode()
  const m = code.match(/let\s+cabinet\s*:\s*CabinetState\s*=\s*\{([^}]*)\}/)
  if (m === null) throw new Error('main.ts has no `let cabinet: CabinetState = { … }` boot declaration')
  return m[1]
}

/**
 * The PUMP's title branch — the frame-pump block that spends the dwell and routes the
 * start press — NOT the render switch's `else if (cabinet.mode === 'title')`, which
 * paints. Identified by a TRANSITION it owns (toAttract/toSelect); the render branch
 * calls renderTitleScreen and owns no transition. Throws self-describingly when no such
 * branch exists yet — the RED state — so the failure names what GREEN must add.
 */
function titlePumpBranch(src: string): string {
  const needle = "if (cabinet.mode === 'title') {"
  let from = 0
  for (;;) {
    const at = src.indexOf(needle, from)
    if (at < 0) {
      throw new Error(
        "main.ts has no title FRAME-PUMP branch yet — GREEN adds `if (cabinet.mode === 'title') { … }` " +
          'in the pump (before the generic non-playing coin-up door) that spends MARQUE_DWELL_FRAMES of ' +
          'pumped frames then calls toAttract(cabinet, SEED), and routes a rising-edge start press to ' +
          'toSelect(cabinet). (The render switch `else if (cabinet.mode === \'title\')` is the paint, not ' +
          'this branch.)',
      )
    }
    // jt11-6 idiom: the branch closes at the pump's 6-space indentation.
    const end = src.indexOf('\n      }', at)
    const body = src.slice(at, end < 0 ? src.length : end)
    if (/toAttract\(|toSelect\(/.test(body)) return body
    from = at + needle.length
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-A — the boot shows the MARQUE (title) first, not the demo. This is the whole
// player-reported bug: `mode: 'attract'` at boot drops straight into self-play.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-A boot enters the title mode, not attract', () => {
  it("the boot cabinet initializer sets mode 'title', not 'attract'", () => {
    const body = bootCabinetBody()
    // Kills the pre-jt11-16 state: `{ mode: 'attract', game: createGame(SEED) }`, which
    // renders the self-play demo on the first frame and never shows the logo.
    const mode = body.match(/mode\s*:\s*'([a-z]+)'/)?.[1]
    expect(mode, "the boot cabinet's mode literal").toBe('title')
    expect(body, 'the boot no longer opens in attract').not.toMatch(/mode\s*:\s*'attract'/)
  })

  it('the boot still wraps a bare createGame(SEED) — the co-op demo seed is unchanged', () => {
    // Regression fence for the start-experience contract: main.ts boots the cabinet with
    // a bare createGame(SEED) (default 2 knights). The mode changes; the wrapped session
    // and its seed must not. A `createGame(SEED, 1)` here would silently flip the demo to
    // one knight and redden start-experience.test.ts instead of this file.
    expect(bootCabinetBody(), 'game: createGame(SEED) survives the mode change').toMatch(
      /game\s*:\s*createGame\(\s*SEED\s*\)/,
    )
  })

  it('the fix overrides the mode at the boot line — core createCabinet still boots attract', () => {
    // Steers away from the tempting-but-wrong fix: editing createCabinet to return
    // 'title'. createCabinet is the general constructor and cabinet.test.ts /
    // attract-scheduler.test.ts pin it booting 'attract'. The override belongs at the
    // main.ts boot line only. (createCabinet lives in core/cabinet.ts, untouched by
    // this story.)
    const cabinetSrc = readFileSync(join(srcDir, 'core', 'cabinet.ts'), 'utf8')
    const body = cabinetSrc.match(/export function createCabinet\([^)]*\)\s*:\s*CabinetState\s*\{([\s\S]*?)\n\}/)?.[1]
    expect(body, 'createCabinet exists in core/cabinet.ts').toBeDefined()
    expect(body!, 'createCabinet still returns mode attract — do not move the override into the constructor').toMatch(
      /mode\s*:\s*'attract'/,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-B — the title dwells the ROM MARQUE dwell (1110 frames), then hands to attract.
// The shell owns the clock: the dwell is spent in the frame pump, not a wall timer.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-B the title dwells the ROM MARQUE dwell then transitions to attract', () => {
  it('MARQUE_DWELL_FRAMES is the ROM 1110 frames — the dwell value the title reuses', () => {
    // Pins the authentic dwell (ATT.SRC:121, dossier claim JT104-002) at the source, so
    // the setup context's stray "7680 ticks" cannot reach GREEN and so a future
    // re-baseline of the constant reddens here, next to its ROM citation.
    expect(MARQUE_DWELL_FRAMES, 'ATT.SRC:121 — 111 * 10 = 1110 frames = 18.5 s').toBe(1110)
  })

  it('main.ts imports MARQUE_DWELL_FRAMES from core/attract-scheduler', () => {
    // The dwell is the ROM constant, not a hand-typed magic number. Imported FROM the
    // core module (the select-wiring import idiom), so a stray `1110` or a re-typed
    // number cannot satisfy the wiring.
    expect(
      importsFrom(readMain(), /core\/attract-scheduler(\.js)?$/, 'MARQUE_DWELL_FRAMES'),
      'MARQUE_DWELL_FRAMES from core/attract-scheduler',
    ).toBe(true)
  })

  it('the title pump branch spends MARQUE_DWELL_FRAMES of frames then routes to attract', () => {
    const branch = titlePumpBranch(mainCode())
    // The dwell is measured against the ROM constant (comments stripped, so the constant
    // must appear in live code)…
    expect(branch, 'the title branch measures the dwell against MARQUE_DWELL_FRAMES').toMatch(
      /MARQUE_DWELL_FRAMES/,
    )
    // …and when it elapses the cabinet leaves the title for attract (MARQUE → VSIM).
    expect(branch, 'the elapsed dwell hands off to attract').toMatch(/toAttract\(/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-C — a start press during the title goes to the coin-up `select` screen, on the
// RISING edge only (the shared prevStartHeld rising-edge discipline; jt11-17 made the
// ATTRACT start-press direct-start, but the title still routes to select).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-C a start press on the title routes to select, edge-debounced', () => {
  it('the title pump branch routes a start press to toSelect (title -> select)', () => {
    const branch = titlePumpBranch(mainCode())
    // Without a title branch, the generic non-playing door would take a title start
    // press straight into a game (enterPlaying), skipping the coin-up. The title must go
    // to `select` first. (jt11-17 made ATTRACT direct-start; the title coin-up is kept.)
    expect(branch, 'a start press on the title enters select').toMatch(/toSelect\(/)
  })

  it('the start press is edge-debounced so a HELD key cannot skip the title', () => {
    const branch = titlePumpBranch(mainCode())
    // Mirrors the attract branch / coin-up door: a held start button read every frame
    // must not blow through the title. The GUARD must sit ON the toSelect transition,
    // not merely appear somewhere in the branch — a bare `prevStartHeld` presence regex
    // (jt11-16 review, lang-review #15/#18) is satisfied by the branch's own trailing
    // `prevStartHeld = startHeld` bookkeeping line even when the transition is UNGATED.
    // Anchor to the statement that fires the transition and require the rising-edge
    // condition on it. Mutation-verified: stripping `&& !prevStartHeld` from main.ts
    // reddens this test.
    const toSelectStmt = branch.split('\n').find((line) => /toSelect\(/.test(line))
    expect(toSelectStmt, 'the title branch has a toSelect( transition statement').toBeDefined()
    expect(toSelectStmt!, 'the toSelect transition is gated by the rising edge (!prevStartHeld)').toMatch(
      /!\s*prevStartHeld/,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-D — the deferral is retired. The comment that says the title mode is unreached
// must go, AND the mode must actually be reached in live code (not just a deleted line).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-D the "title is deferred / unreached" comment is retired', () => {
  it('main.ts no longer says the title mode is unreached or that toTitle has no caller', () => {
    const raw = readMain()
    // The stale deferral, anchored on single-line phrases (a wrapped-comment match would
    // false-green): the story itself completes the deferral, so the claim must not remain.
    expect(raw, 'the "this mode is not yet reached" deferral is gone').not.toMatch(/not yet reached/)
    expect(raw, 'the "toTitle has no caller" claim is gone').not.toMatch(/has no caller/)
  })

  it('the title mode is genuinely reached in live code — not just a deleted comment', () => {
    // A1/A4 tie-off: with comments stripped, main.ts must set cabinet.mode to 'title'
    // (the boot). Deleting the deferral prose while leaving the mode unreachable would
    // pass the test above and re-earn the comment.
    const code = mainCode()
    expect(code, "main.ts sets a cabinet mode to 'title' in live code").toMatch(/mode\s*:\s*'title'/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-E — NO new render code. The render switch already dispatches renderTitleScreen on
// the title mode (this test passes on arrival — it is the green guard that A5 holds).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-E the existing title render dispatch is reused, no render code added', () => {
  it('the render switch dispatches renderTitleScreen for the title mode', () => {
    const code = mainCode()
    // Green on arrival, and stays green: the render seam existed before this story. It is
    // pinned so a GREEN that "wires the title" by adding a SECOND render path (in
    // renderAttract, say) is caught — the title paints through this one branch only.
    const switchBranch = code.match(/else if \(cabinet\.mode === 'title'\)\s*\{([\s\S]*?)\n\s*\}/)?.[1]
    expect(switchBranch, "the render switch has an `else if (cabinet.mode === 'title')` arm").toBeDefined()
    expect(switchBranch!, 'that arm paints via renderTitleScreen()').toMatch(/renderTitleScreen\(\)/)
    // And renderAttract must NOT grow a title paint — that would be the Approach-(2)
    // render code this story rules out.
    const attractBody = code.match(/function renderAttract\(\): void \{([\s\S]*?)\n\}/)?.[1]
    expect(attractBody, 'renderAttract exists').toBeDefined()
    expect(attractBody!, 'renderAttract does not paint the title (no new render path)').not.toMatch(
      /renderTitleScreen\(/,
    )
  })
})
