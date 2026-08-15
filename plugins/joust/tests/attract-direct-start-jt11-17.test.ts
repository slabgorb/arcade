// tests/attract-direct-start-jt11-17.test.ts
//
// Story jt11-17 — RED (Leeloo / TEA). Player-reported: the attract CTA promises
// "PRESS 1 OR 2 TO START", but pressing a digit in attract does NOT start a game —
// it opens a SECOND screen that re-asks the player count. Root cause: the attract
// pump branch reads `want = readSelectInput(held)` (which maps Digit1 -> 'one-player',
// Digit2 -> 'two-player') but then uses only its non-null-ness, calling toSelect and
// DISCARDING the 1-vs-2 choice. The select screen then re-asks. The fix threads the
// pressed count straight into a direct start — `selectPlayerCount(want)` ->
// `enterPlaying(count)` — the exact pattern the select door already uses.
//
// ─── SCOPE (owner ruling v2, 2026-08-14 — "attract only; keep the title coin-up") ──
// jt11-16 (merged AFTER this story was filed) wired the TITLE start-press to toSelect,
// so the select mode keeps a caller after this fix — it is NOT orphaned. This story
// therefore changes ONLY the attract pump branch. jt11-16's title->select coin-up and
// the select mode are PRESERVED and fenced GREEN below (AC-5). Do not retire the select
// mode; do not edit title-boot-jt11-16-wiring's title branch. See the session's Design
// Deviations (TEA) for the falsified "only caller" premise.
//
// ─── WHY SOURCE-SCAN ──────────────────────────────────────────────────────────────
// main.ts is a SHELL file that touches the canvas/DOM; a node test cannot run its frame
// loop. This file pins the WIRING as source text (the select-wiring / title-boot idiom):
// line comments are stripped before every code assertion (so a keyword in a comment or
// string cannot satisfy the guard — typescript lang-review #15), each branch is sliced by
// a marker it OWNS, and each test names the mutant it kills. The pure count map
// (selectPlayerCount one-player->1 / two-player->2 / null->null) and the
// attract->select->playing composition are already covered behaviourally in select.test.ts
// and are not re-litigated here — this file pins only the attract-branch wiring gap.
//
// (No `<file>.ts:<line>` refs in these comments — the comment-line-refs guard bans them,
// and symbol names outlive line numbers anyway.)

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

/** main.ts with line comments stripped, so a wiring assertion matches CODE, not comment
 *  prose or a string literal (the ?raw-grep trap — lang-review #15). main.ts's block
 *  comments are line-led (// …), so stripping line comments suffices. */
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

/**
 * The FRAME-PUMP branch for a cabinet mode — `if (cabinet.mode === '<mode>') { … }` — NOT
 * the render switch's `else if (cabinet.mode === '<mode>')`, which paints. The pump branch
 * is identified by a marker it OWNS (passed in): the attract pump owns `stepAttract(`, the
 * title pump owns `titleDwellFrames`/`MARQUE_DWELL_FRAMES`. The branch closes at the pump's
 * 6-space indentation (`\n      }`), so the slice stops BEFORE the next mode's branch —
 * critical here, because the title branch legitimately KEEPS toSelect and must not leak into
 * the attract slice. Throws self-describingly if no such branch exists.
 */
function pumpBranch(src: string, mode: string, ownedMarker: RegExp): string {
  const needle = `if (cabinet.mode === '${mode}') {`
  let from = 0
  for (;;) {
    const at = src.indexOf(needle, from)
    if (at < 0) {
      throw new Error(
        `main.ts has no '${mode}' FRAME-PUMP branch (if (cabinet.mode === '${mode}') { … } containing ${ownedMarker}).`,
      )
    }
    const end = src.indexOf('\n      }', at)
    const body = src.slice(at, end < 0 ? src.length : end)
    if (ownedMarker.test(body)) return body
    from = at + needle.length
  }
}

const attractPumpBranch = (src: string): string => pumpBranch(src, 'attract', /stepAttract\(/)
const titlePumpBranch = (src: string): string => pumpBranch(src, 'title', /titleDwellFrames|MARQUE_DWELL_FRAMES/)

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 / AC-2 — the attract start-press starts a game DIRECTLY, and no second
// selection screen is interposed. This is the whole player-reported bug.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1/AC-2 attract 1/2 direct-starts — no select re-prompt', () => {
  it('the attract branch no longer routes the start press to the select re-prompt (toSelect)', () => {
    const branch = attractPumpBranch(mainCode())
    // Kills the reported bug: `if (startHeld && !prevStartHeld) cabinet = toSelect(cabinet)`
    // in the attract branch, which throws the count away and opens the re-ask. The slice is
    // bounded to the attract branch, so the TITLE branch's toSelect (jt11-16, kept) is not
    // in scope — proven by the AC-5 fence below.
    expect(branch, 'the attract branch does not open the select re-prompt').not.toMatch(/toSelect\s*\(/)
    // Defensive: the slice really stopped before the title branch (which keeps toSelect).
    expect(branch, 'attract slice is bounded — it does not spill into the title branch').not.toMatch(
      /cabinet\.mode === 'title'/,
    )
  })

  it('the attract branch starts a game directly on the start press (enterPlaying)', () => {
    const branch = attractPumpBranch(mainCode())
    // RED today: the attract branch has no enterPlaying — it only flips to select.
    expect(branch, 'the attract branch begins a game via enterPlaying').toMatch(/enterPlaying\s*\(/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — the PRESSED count is threaded, not assumed. Pressing 1 starts 1 player,
// pressing 2 starts 2 — the choice reaches the game, mapped through selectPlayerCount.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 the pressed count is threaded through selectPlayerCount', () => {
  it('the attract branch maps the pressed intent through selectPlayerCount', () => {
    const branch = attractPumpBranch(mainCode())
    // RED today: selectPlayerCount is called only at the select door, never in attract.
    expect(branch, 'the attract branch maps want -> count via selectPlayerCount').toMatch(/selectPlayerCount\s*\(/)
  })

  it('enterPlaying is called with the mapped count, not hardcoded to 1 or 2', () => {
    const branch = attractPumpBranch(mainCode())
    // Non-vacuity control for AC-1: a fix that always starts one player (`enterPlaying(1)`)
    // would pass "starts directly" while re-breaking the 1-vs-2 choice the CTA advertises.
    expect(branch, 'enterPlaying receives the pressed count, not a literal player count').not.toMatch(
      /enterPlaying\s*\(\s*[12]\s*\)/,
    )
  })

  it('selectPlayerCount is imported from core/select (the wiring symbol, not a comment)', () => {
    expect(
      importsFrom(readMain(), /core\/select(\.js)?$/, 'selectPlayerCount'),
      'selectPlayerCount imported from core/select',
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — the rising-edge discipline is preserved (typescript lang-review #14: an
// enter/exit edge must gate the transition, not merely appear in the branch). A HELD
// digit must start exactly ONE game; the guard is `!prevStartHeld`.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 the direct start is gated by the rising edge (!prevStartHeld)', () => {
  it('the rising-edge guard gates the direct start — it precedes enterPlaying, not just the trailing bookkeeping', () => {
    const branch = attractPumpBranch(mainCode())
    // A bare `/prevStartHeld/` presence regex is satisfied by the branch's own trailing
    // `prevStartHeld = startHeld` bookkeeping even when the start is UNGATED (the jt11-16
    // review lesson). So: require `!prevStartHeld` inside a COMPOUND condition (`&&`), and
    // require it to appear BEFORE the enterPlaying call — i.e. it gates the start.
    // Mutation-verified intent: stripping `&& !prevStartHeld` reddens this test.
    const guardIdx = branch.search(/&&\s*!\s*prevStartHeld|!\s*prevStartHeld\s*&&/)
    const enterIdx = branch.search(/enterPlaying\s*\(/)
    expect(enterIdx, 'the attract branch starts a game (enterPlaying present)').toBeGreaterThanOrEqual(0)
    expect(guardIdx, 'the attract branch has a rising-edge guard (!prevStartHeld in a compound condition)').toBeGreaterThanOrEqual(
      0,
    )
    expect(guardIdx, 'the rising-edge guard PRECEDES the direct start (it gates enterPlaying)').toBeLessThan(enterIdx)
  })

  it('the attract branch still keeps the per-frame prevStartHeld bookkeeping', () => {
    // The edge only works if `prevStartHeld` is updated every frame. Guards a fix that
    // gates on !prevStartHeld but forgets to write it back (start would fire once, then the
    // stale flag would wedge). Green after a correct fix.
    const branch = attractPumpBranch(mainCode())
    expect(branch, 'prevStartHeld is written back each frame').toMatch(/prevStartHeld\s*=\s*startHeld/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-5 — REGRESSION FENCE (owner ruling v2). jt11-16's title->select coin-up and the
// select mode are PRESERVED. These pass on arrival and must STAY green: this story must
// not over-reach into the title branch or retire the select mode. See session Deviations.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-5 jt11-16 title coin-up + select mode are preserved (not retired)', () => {
  it('the TITLE start-press still opens the select coin-up (jt11-16 untouched)', () => {
    const branch = titlePumpBranch(mainCode())
    expect(branch, 'the title branch still routes a start press to toSelect').toMatch(/toSelect\s*\(/)
  })

  it('toSelect retains a production caller — the select mode is not orphaned/removed', () => {
    // The attract fix removes ONE toSelect caller (attract); the title caller must remain,
    // so the select mode still has a live entry point. Kills an over-fix that retires the
    // whole select machine (which would break title-boot-jt11-16-wiring's AC-C).
    expect(mainCode(), 'toSelect still has a caller in live code').toMatch(/toSelect\s*\(/)
  })

  it('the select coin-up door still direct-starts via enterPlaying (unchanged path)', () => {
    // The `cabinet.mode !== 'playing'` coin-up door — the pattern the attract fix mirrors —
    // is not disturbed. enterPlaying is a local main.ts function, so assert its definition
    // survives and the select door still reaches a direct start.
    const code = mainCode()
    expect(code, 'enterPlaying is defined in main.ts').toMatch(/function enterPlaying\s*\(/)
  })
})
