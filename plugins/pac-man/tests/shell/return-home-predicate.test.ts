// tests/shell/return-home-predicate.test.ts
//
// Story pm5-1 (RED, TEA) — single-source the eyes/return-home predicate.
//
// Two predicates over a ghost's `returning` phase look alike but answer
// DIFFERENT questions, and today each site spells its own inline:
//
//   • "draw this ghost at all?"  →  returning[id] !== null   (eyes IN TRANSIT
//     OR the regenerated body climbing back out).  main.ts:232 inlines this;
//     core already exports the SAME predicate as `isReturningHome` (game.ts:278)
//     but NO production code calls it — only tests do.
//   • "render it AS EYES?"       →  returning[id] === 'eyes'  (the eyes phase
//     ONLY, never the regenerated body).  render.ts's `ghostRenderMode` owns
//     this and it MUST stay distinct — routing it through `isReturningHome`
//     would draw a climbing-out body as eyes, a regression.
//
// SM RULING (pm5-1): ROUTE-THROUGH, not delete. Give `isReturningHome` its
// first production consumer — main.ts:232 calls it in place of the inline
// `!== null`. render.ts's `=== 'eyes'` is LEFT ALONE. Behaviour is unchanged
// (a pure refactor), which is why Part B below is GREEN on arrival.
//
//   Part A (AC1, RED on arrival): main.ts routes the draw gate through
//     `isReturningHome` and no longer inlines the `.returning … !== null`
//     compare. Both assertions FAIL today (main.ts inlines it and never imports
//     the helper) and pass once Dev wires the call.
//   Part B (AC2/AC3, GREEN on arrival — a mutation guard): the draw predicate
//     (`isReturningHome`) is strictly BROADER than the eyes predicate
//     (`=== 'eyes'`); a 'regenerated' ghost is still drawn yet renders as a
//     BODY, not eyes. This goes RED iff someone wrongly single-sources
//     render.ts too (the forbidden half of the ruling) — delete/replace the
//     `=== 'eyes'` check with `isReturningHome` and the regenerated case turns
//     'eaten'. That is the non-vacuity witness for AC2.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import ts from 'typescript'
import { speedPattern, TILE_PX } from '../../src/core/actor'
import type { GhostId } from '../../src/core/ghost'
import { createGameState, stepGame, isReturningHome, type GameState } from '../../src/core/game'
import { ghostRenderMode } from '../../src/shell/render'

// ─── Part A: main.ts routes the draw gate through isReturningHome (AC1) ──────
//
// AST-based, not regex — comments never reach a syntax tree, so the prose that
// mentions "returning" throughout main.ts cannot false-positive (the whole
// class of holes purity-scanner.ts documents). We assert on CODE only.

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '../../src')
const MAIN_TS = 'main.ts'
const mainSource = readFileSync(join(srcDir, MAIN_TS), 'utf8')

function parse(source: string, filename: string): ts.SourceFile {
  const sf = ts.createSourceFile(filename, source, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS)
  const parseErrors = (sf as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics
  expect(parseErrors?.length ?? 0, `${filename} must parse for this scan to mean anything`).toBe(0)
  return sf
}

/** Count CallExpressions whose callee is the bare identifier `name` — e.g. `isReturningHome(game, id)`. */
function callCount(source: string, filename: string, name: string): number {
  const sf = parse(source, filename)
  let n = 0
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === name) {
      n++
    }
    ts.forEachChild(node, visit)
  }
  ts.forEachChild(sf, visit)
  return n
}

/** `<x>.returning` or `<x>.returning[...]` — the property access the inline draw gate uses. */
function accessesReturning(node: ts.Node): boolean {
  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text === 'returning' || accessesReturning(node.expression)
  }
  if (ts.isElementAccessExpression(node)) return accessesReturning(node.expression)
  return false
}

/** Count `X.returning[...] <cmp> null` / `null <cmp> X.returning[...]` comparisons in code. */
function returningNullCompareCount(source: string, filename: string): number {
  const sf = parse(source, filename)
  const COMPARISONS = new Set<ts.SyntaxKind>([
    ts.SyntaxKind.ExclamationEqualsEqualsToken,
    ts.SyntaxKind.ExclamationEqualsToken,
    ts.SyntaxKind.EqualsEqualsEqualsToken,
    ts.SyntaxKind.EqualsEqualsToken,
  ])
  const isNull = (node: ts.Node): boolean => node.kind === ts.SyntaxKind.NullKeyword
  let n = 0
  const visit = (node: ts.Node): void => {
    if (ts.isBinaryExpression(node) && COMPARISONS.has(node.operatorToken.kind)) {
      const left = node.left
      const right = node.right
      if ((isNull(right) && accessesReturning(left)) || (isNull(left) && accessesReturning(right))) {
        n++
      }
    }
    ts.forEachChild(node, visit)
  }
  ts.forEachChild(sf, visit)
  return n
}

describe('pm5-1 Part A (AC1): main.ts single-sources the draw predicate through isReturningHome', () => {
  it('calls isReturningHome() at least once (its first production consumer)', () => {
    expect(
      callCount(mainSource, MAIN_TS, 'isReturningHome'),
      'main.ts must route its draw gate through core `isReturningHome`, not inline `returning !== null`',
    ).toBeGreaterThanOrEqual(1)
  })

  it('no longer inlines a `.returning … !== null` comparison for the draw gate', () => {
    expect(
      returningNullCompareCount(mainSource, MAIN_TS),
      'the inline `game.returning[id] !== null` draw gate must be replaced by isReturningHome(game, id)',
    ).toBe(0)
  })
})

// ─── Part B: the draw predicate is BROADER than the eyes predicate (AC2/AC3) ─
//
// GREEN on arrival — behaviour is unchanged by pm5-1. This is a mutation guard
// against the forbidden half of the ruling (single-sourcing render.ts too).
// Recipe for reaching the 'eyes' and 'regenerated' phases is lifted from
// tests/core/ghost-eyes.test.ts (pm4-3).

function noMoveFrameIndex(pct: number): number {
  const idx = speedPattern(pct).indexOf(false)
  expect(idx, `speedPattern(${pct}) has no held frame to freeze on`).toBeGreaterThanOrEqual(0)
  return idx
}

// Force `id` to be eaten this frame → it enters the 'eyes' returning phase.
function eatGhost(state: GameState, id: GhostId): void {
  state.phase = 'playing' // pm4-6: createGameState boots into `attract`; these tests step the SIM.
  state.mode.frightenedTimer = 600
  const g = state.ghosts[id]
  state.pac.actor.xPx = g.actor.xPx
  state.pac.actor.yPx = g.actor.yPx
  state.pac.actor.dir = 'none'
  state.house.released[id] = true
  state.ghostFrame[id] = noMoveFrameIndex(50) // level-1 frightened ghost speed pct
  stepGame(state, { dir: 'none' })
  expect(
    state.events.some((e) => e.type === 'ghost-eaten'),
    `precondition: ${id} must be eaten this frame`,
  ).toBe(true)
}

// Park Pac-Man far from the house so it neither eats dots nor is reached by the
// regenerating ghost before the assertion window closes.
function parkPacAway(state: GameState): void {
  state.pac.actor.xPx = 9 * TILE_PX
  state.pac.actor.yPx = 23 * TILE_PX
  state.pac.actor.dir = 'none'
  state.pac.actor.pending = 'none'
}

describe('pm5-1 Part B (AC2/AC3): the draw predicate is broader than the eyes predicate', () => {
  it('eyes phase — drawn (isReturningHome true) AND rendered AS EYES ("eaten")', () => {
    const state = createGameState(5210)
    eatGhost(state, 'blinky')
    expect(state.returning.blinky, 'a just-eaten ghost is in the eyes phase').toBe('eyes')
    // Draw predicate: on screen.
    expect(isReturningHome(state, 'blinky'), 'eyes ghost is drawn').toBe(true)
    // Eyes predicate: fires → renders as eyes.
    expect(ghostRenderMode(state, 'blinky'), 'eyes ghost renders as eyes').toBe('eaten')
  })

  it('regenerated phase — STILL drawn (isReturningHome true) but rendered as a BODY, not eyes', () => {
    const state = createGameState(5211)
    eatGhost(state, 'blinky')
    parkPacAway(state)
    state.mode.frightenedTimer = 0 // a non-eyes returning ghost must read as 'chase', not 'frightened'

    let sawRegenerated = false
    for (let f = 0; f < 4000; f++) {
      stepGame(state, { dir: 'none' })
      state.mode.frightenedTimer = 0 // nothing may re-frighten it during the climb
      // 'regenerated' = returning phase with the body already released (forceLeaveHouse ran).
      if (isReturningHome(state, 'blinky') && state.house.released.blinky) {
        sawRegenerated = true
        expect(state.returning.blinky, 'the body-climb phase is "regenerated"').toBe('regenerated')
        // Draw predicate keeps it on screen …
        expect(isReturningHome(state, 'blinky'), 'regenerated body is still drawn').toBe(true)
        // … but the eyes predicate (=== "eyes") does NOT fire, so it renders as a body.
        expect(
          ghostRenderMode(state, 'blinky'),
          'a regenerated body renders as a BODY, not eyes — the two predicates must stay distinct',
        ).toBe('chase')
        break
      }
    }
    // Non-vacuity witness: the sim really reached 'regenerated', or the guard proved nothing.
    expect(sawRegenerated, 'the sim must reach the regenerated body-climb phase for this guard to bite').toBe(true)
  })

  it('not returning — isReturningHome false (draw is governed by release alone)', () => {
    const state = createGameState(5212)
    state.mode.frightenedTimer = 0
    expect(isReturningHome(state, 'blinky'), 'an ordinary ghost is not returning home').toBe(false)
    expect(ghostRenderMode(state, 'blinky'), 'an ordinary ghost renders as a body').toBe('chase')
  })
})
