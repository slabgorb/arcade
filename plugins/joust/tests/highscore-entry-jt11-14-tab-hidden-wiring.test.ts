// tests/highscore-entry-jt11-14-tab-hidden-wiring.test.ts
//
// Story jt11-14 — RED (O'Brien / TEA). jt11-6 gave the initials screen a tick
// budget that auto-commits a walked-away qualifying row when it runs out. But that
// budget is spent inside the FRAME PUMP (requestAnimationFrame), and the pump's
// catch-up is clamped to MAX_CATCHUP_SECONDS — so the countdown FREEZES the moment
// the tab is hidden and never advances at all if the tab is closed. The one reading
// of "walked away" that a browser cabinet must serve — HIDE the tab, or CLOSE it —
// is therefore the exact case the frame-pumped timeout cannot reach. jt11-14 wires
// the document-lifecycle escape hatch: commit the in-flight entry on `pagehide`
// (the close / navigate / discard signal) AND on `visibilitychange` to hidden (the
// tab-switch signal), while cabinet.mode === 'highscore', through the SAME
// commitHighScore helper the manual confirm and the timeout already use.
//
// WHY BOTH EVENTS, not "and/or": pagehide does not fire on a plain desktop tab
// switch (the tab stays alive), so a player who switches away and never returns is
// caught ONLY by visibilitychange→hidden; and visibilitychange is not the reliable
// terminal signal for a close/navigation, which is pagehide's job. The story names
// BOTH failure modes (hide AND close), so serving both takes both listeners.
//
// ─── HOW THIS FILE TESTS THE SEAM ────────────────────────────────────────────
// The story asks for the jt11-6 treatment: a SOURCE-SCAN on the shell wiring plus a
// MUTATION that proves the guard bites. main.ts installs the whole cabinet on import
// (canvas, RAF loop, keydown) so it is not a unit-importable module; jt11-6 pinned
// its pump seam by reading main.ts as text, and this file pins the listener seam the
// same way. The load-bearing discipline (TS review checklist #25): the guard match
// is BOUNDED to the effective handler body, never run over the whole file — the pump
// branch already contains `cabinet.mode === 'highscore'`, so a whole-file positive
// anchor would stay GREEN under the exact mutant this file exists to catch (delete
// the guard from the pagehide handler; the pump's copy still satisfies the match).
//
// The listener is SHELL-ONLY. Core counts ticks and must never learn about the
// document — a fence at the bottom holds that boundary (checklist #14: the "become
// hidden" edge lives in the shell, where every path that can move it is visible).
//
// (No `<file>.ts:<line>` refs in these comments — the comment-line-refs guard bans
// them, and symbol names outlive line numbers anyway.)

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const mainPath = join(srcDir, 'main.ts')
const coreDir = join(srcDir, 'core')

function readMain(): string {
  if (!existsSync(mainPath)) throw new Error('src/main.ts is missing')
  return readFileSync(mainPath, 'utf8')
}

/**
 * Comments removed, string literals kept verbatim. A source-text guard that runs
 * over raw text passes on a keyword sitting in a COMMENT (checklist #15), and a
 * `// window.addEventListener('pagehide', …)` note would satisfy every match in
 * this file with no listener installed. Everything below scans this, not the raw
 * text — so the event-name STRINGS survive while comment prose cannot spoof a match.
 */
function stripComments(src: string): string {
  let out = ''
  let str: string | null = null
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    const c2 = src[i + 1]
    if (str !== null) {
      out += c
      if (c === '\\') {
        out += c2 ?? ''
        i++
        continue
      }
      if (c === str) str = null
      continue
    }
    if (c === '/' && c2 === '/') {
      while (i < src.length && src[i] !== '\n') i++
      out += '\n'
      continue
    }
    if (c === '/' && c2 === '*') {
      i += 2
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++
      i++ // land on the '/' of '*/'; the loop's i++ steps past it
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      str = c
      out += c
      continue
    }
    out += c
  }
  return out
}

/**
 * Index just past the delimiter matching the opener at `open`, respecting nested
 * (), {}, [] and skipping string/comment interiors. Used to carve a callback or a
 * function body out of `code` without a brittle "find the next `}`" heuristic.
 */
function matchBalanced(code: string, open: number): number {
  const close: Record<string, string> = { '(': ')', '{': '}', '[': ']' }
  const stack: string[] = []
  let str: string | null = null
  for (let i = open; i < code.length; i++) {
    const c = code[i]
    if (str !== null) {
      if (c === '\\') {
        i++
        continue
      }
      if (c === str) str = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      str = c
      continue
    }
    if (c === '(' || c === '{' || c === '[') {
      stack.push(close[c])
      continue
    }
    if (c === ')' || c === '}' || c === ']') {
      stack.pop()
      if (stack.length === 0) return i + 1
    }
  }
  return code.length
}

function topLevelArgs(argList: string): string[] {
  // argList includes the outer parens. Split the interior on depth-0 commas.
  const inner = argList.slice(1, -1)
  const out: string[] = []
  let depth = 0
  let str: string | null = null
  let start = 0
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i]
    if (str !== null) {
      if (c === '\\') {
        i++
        continue
      }
      if (c === str) str = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') {
      str = c
      continue
    }
    if (c === '(' || c === '{' || c === '[') depth++
    else if (c === ')' || c === '}' || c === ']') depth--
    else if (c === ',' && depth === 0) {
      out.push(inner.slice(start, i).trim())
      start = i + 1
    }
  }
  out.push(inner.slice(start).trim())
  return out
}

/** The body `{ … }` of a locally-declared `function id` / `const id = (…) =>` /
 *  `const id = function`, or '' when `id` names no local definition (an import, a
 *  built-in). Lets the handler resolver follow ONE hop of delegation. */
function localDefBody(code: string, id: string): string {
  const patterns = [
    new RegExp(`function\\s+${id}\\s*\\(`),
    new RegExp(`const\\s+${id}\\s*=\\s*(?:async\\s*)?(?:function\\b|\\([^)]*\\)\\s*=>|[A-Za-z_$][\\w$]*\\s*=>)`),
  ]
  for (const re of patterns) {
    const m = re.exec(code)
    if (!m) continue
    const brace = code.indexOf('{', m.index)
    if (brace < 0) continue
    return code.slice(brace, matchBalanced(code, brace))
  }
  return ''
}

/**
 * The EFFECTIVE handler for a lifecycle event: the callback body passed to
 * `addEventListener('<event>', …)`, PLUS one hop — the bodies of any locally-defined
 * helpers that callback calls (so `('pagehide', commitOnExit)` and
 * `('visibilitychange', () => { if (hidden) commitOnExit() })` both fold the guard
 * and the commit into the returned text). Deliberately bounded: it never includes
 * the `frame` pump, so the pump's own `cabinet.mode === 'highscore'` cannot satisfy a
 * guard assertion here (checklist #25). Throws a GREEN-guiding message when the
 * listener is absent, which is the RED state on arrival (the tp1-8 self-describing trap).
 */
function effectiveHandler(code: string, event: string): string {
  const re = new RegExp(`addEventListener\\s*\\(\\s*['"]${event}['"]`, 'g')
  const m = re.exec(code)
  if (!m) {
    throw new Error(
      `main.ts installs no ${event} listener yet — jt11-14 (GREEN) adds ` +
        `window.addEventListener('${event}', …) whose handler, while cabinet.mode === 'highscore', ` +
        `commits the in-flight entry through commitHighScore(timeoutInitials(entry)) and routes to attract, ` +
        `so a hidden or closed tab keeps the walked-away qualifying row instead of freezing the countdown.`,
    )
  }
  const paren = code.indexOf('(', m.index + 'addEventListener'.length)
  const args = code.slice(paren, matchBalanced(code, paren))
  const parts = topLevelArgs(args)
  const callback = (parts[1] ?? '').trim()

  let body: string
  if (/^[A-Za-z_$][\w$]*$/.test(callback)) {
    // ('event', namedHandler) — resolve the named handler's body.
    body = localDefBody(code, callback)
    if (body === '') {
      throw new Error(`the ${event} listener delegates to '${callback}', which is not a local function in main.ts`)
    }
  } else {
    const brace = callback.indexOf('{')
    // A brace-less concise arrow — `() => commitOnExit()` — has no block body; keep
    // the whole expression so a delegated call is still visible to the hop below.
    body = brace >= 0 ? callback.slice(brace, matchBalanced(callback, brace)) : callback
  }

  // One hop: fold in the bodies of local helpers the handler calls, so a guard or a
  // commit factored into `commitOnExit()` is still in view — EXCEPT commitHighScore
  // itself, the terminal single-save helper. Folding its body would pull `highScores.save(`
  // into the handler text and defeat the "does not persist directly" negative check below
  // (checklist #18 — apparatus contaminating its own assertion). The handler must still
  // CALL commitHighScore; that token lives at the call site, which is already in `body`. A
  // save written DIRECTLY in the handler body is still caught, and AC-4 pins the one save site.
  const FOLD_EXCLUDE = new Set(['commitHighScore'])
  let folded = body
  const seen = new Set<string>()
  for (const call of body.matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)) {
    const id = call[1]
    if (seen.has(id) || FOLD_EXCLUDE.has(id)) continue
    seen.add(id)
    folded += '\n' + localDefBody(code, id)
  }
  return folded
}

const LIFECYCLE_EVENTS = ['pagehide', 'visibilitychange'] as const

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 / AC-2 — the two lifecycle listeners exist and commit the in-flight entry.
// pagehide serves the CLOSE / navigate case; visibilitychange serves the tab is
// HIDDEN case. Each must route the commit through the one commitHighScore path.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1/AC-2 main.ts commits the in-flight entry on tab hide and tab close', () => {
  it('installs BOTH a pagehide and a visibilitychange listener', () => {
    const code = stripComments(readMain())
    // A frozen countdown is served by neither event alone: pagehide misses a plain
    // desktop tab-switch (tab stays alive), visibilitychange is not the terminal
    // close signal. The story names both failure modes, so both listeners are required.
    expect(code, "a pagehide listener (the close / navigate / discard signal)").toMatch(
      /addEventListener\s*\(\s*['"]pagehide['"]/,
    )
    expect(code, "a visibilitychange listener (the tab-hidden signal)").toMatch(
      /addEventListener\s*\(\s*['"]visibilitychange['"]/,
    )
  })

  it.each(LIFECYCLE_EVENTS)('the %s handler commits through the single commitHighScore helper', (event) => {
    const handler = effectiveHandler(stripComments(readMain()), event)
    // The AC keeps ONE persistence path: the auto-commit reuses commitHighScore, not
    // a second highScores.save. If this handler saved directly it would drift from the
    // manual/timeout gate (a cap or a reset added to one and not the other).
    expect(handler, `the ${event} handler calls commitHighScore`).toMatch(/commitHighScore\s*\(/)
    expect(handler, `the ${event} handler must NOT persist directly — reuse the helper`).not.toMatch(
      /highScores\.save\s*\(/,
    )
  })

  it.each(LIFECYCLE_EVENTS)('the %s handler pads the CURRENT buffer (timeoutInitials), not a completed one', (event) => {
    const handler = effectiveHandler(stripComments(readMain()), event)
    // The whole point: a player who walked away with 0 or 2 letters still keeps the
    // row, space-padded — exactly what the timeout branch does. Committing
    // `entry.initials` raw would drop a partial walk-away, re-opening jt11-6's bug.
    expect(handler, `the ${event} handler commits timeoutInitials(entry)`).toMatch(/timeoutInitials\s*\(/)
  })

  it.each(LIFECYCLE_EVENTS)('the %s handler leaves the entry screen so a returning tab cannot re-commit', (event) => {
    const handler = effectiveHandler(stripComments(readMain()), event)
    // A visibilitychange→hidden tab may come BACK; without routing to attract after the
    // commit, the next hidden edge (or the pump) would commit the same row again. The
    // timeout branch routes to attract for the same reason.
    expect(handler, `the ${event} handler routes to attract after committing`).toMatch(/toAttract\s*\(/)
  })

  it('the visibilitychange handler commits only when the document is HIDDEN, not on every change', () => {
    const handler = effectiveHandler(stripComments(readMain()), 'visibilitychange')
    // visibilitychange fires on BOTH hidden and visible. Committing on the visible
    // edge would persist a row when the player tabs BACK — the wrong edge (checklist
    // #14: the transition that matters is "became hidden"). Pin the hidden test.
    expect(handler, "guards on document hidden (visibilityState === 'hidden' or document.hidden)").toMatch(
      /visibilityState[\s\S]*?['"]hidden['"]|document\.hidden|['"]hidden['"]/,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — the mode guard BITES. This is the mutation test the story asks for. Each
// handler commits ONLY while the cabinet is on the highscore screen; drop that guard
// and the tab-close commit fires in attract / title / playing too, persisting a
// space-padded ghost row against a stale entryScore/entryWave on every exit.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 the cabinet.mode === \'highscore\' guard bites (mutation)', () => {
  it.each(LIFECYCLE_EVENTS)('the %s commit is guarded by cabinet.mode === \'highscore\'', (event) => {
    // The match runs over the EFFECTIVE HANDLER ONLY — not main.ts as a whole. The
    // pump branch carries its own `cabinet.mode === 'highscore'`, so a whole-file
    // anchor would survive deleting THIS guard (checklist #25). Bounded here, the
    // mutant "remove the mode check from the exit handler" reddens exactly this test.
    const handler = effectiveHandler(stripComments(readMain()), event)
    expect(handler, `the ${event} handler checks cabinet.mode === 'highscore' before committing`).toMatch(
      /cabinet\.mode\s*===\s*['"]highscore['"]/,
    )
  })

  it.each(LIFECYCLE_EVENTS)('the %s commit is UNCONDITIONAL on completeness — no isEntryComplete gate', (event) => {
    // The mirror of jt11-6's surviving mutant: ANDing `isEntryComplete(entry)` onto the
    // exit commit restores the walked-away-partial-entry-evaporates bug while every
    // "mentions timeoutInitials" test stays green. Padding is pointless if the commit
    // is gated on already having three letters. Scoped to the handler body so the
    // manual confirm's legitimate isEntryComplete in the pump branch is out of view.
    const handler = effectiveHandler(stripComments(readMain()), event)
    expect(handler, `the ${event} handler must not gate the commit on completeness`).not.toMatch(/isEntryComplete/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — the single-persistence invariant survives. jt11-6 pinned this too; jt11-14
// must not add a second save/commit site. Green now, and it stays green: the two new
// listeners route through commitHighScore, which is the one save site.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 persistence stays at exactly one call site after the listeners land', () => {
  it('main.ts calls highScores.save( and commitEntry( exactly once each', () => {
    const code = stripComments(readMain())
    const saves = [...code.matchAll(/highScores\.save\s*\(/g)].length
    const commits = [...code.matchAll(/commitEntry\s*\(/g)].length
    expect(saves, 'one and only one highScores.save( call site — the shared commit path').toBe(1)
    expect(commits, 'one and only one commitEntry( call site — the shared commit path').toBe(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-5 — the listener is SHELL-ONLY. Core keeps counting ticks and never learns
// about the document. This fence is green now and must stay green: a document/window
// reference appearing under src/core/ would mean the escape hatch leaked across the
// core/shell boundary (the single most important rule in every game).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-5 core never learns about the document (shell-only listener)', () => {
  function coreFiles(dir: string): string[] {
    const out: string[] = []
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name)
      if (ent.isDirectory()) out.push(...coreFiles(p))
      else if (ent.name.endsWith('.ts')) out.push(p)
    }
    return out
  }

  it('no core/ source references document, visibility, pagehide, window, or localStorage', () => {
    const banned = /\bdocument\s*\.|\bwindow\s*\.|visibilitychange|pagehide|visibilityState|localStorage|\bnavigator\b/
    const offenders: string[] = []
    for (const file of coreFiles(coreDir)) {
      // Comment-stripped: the English word "document" appears in core prose ("the
      // documented domain"); only a real `document.` member access is the boundary breach.
      const code = stripComments(readFileSync(file, 'utf8'))
      if (banned.test(code)) offenders.push(file.slice(file.indexOf('/core/')))
    }
    expect(offenders, `core must stay document-free; offenders: ${offenders.join(', ')}`).toEqual([])
  })
})
