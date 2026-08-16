// plugins/missile-command/tests/mc11-4-retire-dead-twins.test.ts
//
// Story mc11-4 — RED phase (Tyr One-Handed / TEA). RETIRE THE REDUNDANT DEAD TWINS.
//
// The unwired-feature audit (mc11 epic) found six symbols that a LATER story
// superseded INLINE, leaving each a "dead twin": exported from src/, unit-tested,
// but with ZERO production caller — the live game reaches the same behaviour
// through a different symbol. This story retires them, with ONE hard rule from the
// title: "Keep any symbol still asserted by a CLAIM test; only its dead runtime
// role goes." A claim test asserts a symbol's SURFACE (that the export exists as
// source text / on the module), as opposed to a behavioural test that only
// exercises what it returns.
//
// ─── THE SIX TWINS, CLASSIFIED (measured against the tree at RED, 2026-08-16) ──
//
//   DELETE — no claim test protects them; only BEHAVIOURAL tests reference them,
//            and the epic says they were "superseded inline", so the live path is
//            NOT routed through them — deletion is the retirement:
//     • launchFromKey    shell/input.ts   — live fire path is fireFromKey (input.ts)
//     • cruiseKillPoints core/score.ts     — live scoring is scoreKills + CRUISE_SCORE_MULT
//     • computeLetterbox shell/viewport.ts — live resize is applyLetterbox (viewport.ts)
//
//   KEEP — a CLAIM test pins each as defined, so the symbol STAYS (its runtime
//          role is already dead; that is its blessed final state):
//     • applyPointerMotion shell/input.ts  — pinned by place-cursor.test.ts:206
//     • mainline           core/state.ts   — pinned by state-mainline.test.ts (surface[])
//     • stateCode          core/state.ts   — pinned by state-mainline.test.ts (surface[])
//     • INITIAL_ATTRACT    core/state.ts   — pinned by state-mainline.test.ts (surface[])
//
// This file therefore asserts BOTH directions — the three deletions (RED now: the
// exports still exist) AND the four retentions (green regression guards: a Dev who
// over-reaches and deletes a claim-pinned symbol reddens these). Source-text scan,
// the fleet idiom (place-cursor.test.ts, state-mainline.test.ts) — no import of the
// dead modules, so the file cannot depend on code the story is removing.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Read one src/ file as text. */
function src(...parts: string[]): string {
  return readFileSync(join(root, 'src', ...parts), 'utf8')
}

/** Concatenate every .ts file under src/ (recursive) — the whole production tree,
 *  so "no dead twin remains" means removed EVERYWHERE, not just at its old home
 *  (a stray re-export or lingering caller would still redden). Excludes tests/. */
function allProdSrc(): string {
  const srcDir = join(root, 'src')
  const files = readdirSync(srcDir, { recursive: true }) as string[]
  return files
    .filter((f) => f.endsWith('.ts'))
    .map((f) => readFileSync(join(srcDir, f), 'utf8'))
    .join('\n')
}

// The three twins whose retirement IS a deletion, with the live symbol that
// superseded each (for the failure message — proves the behaviour is not lost).
const DELETE_TWINS: ReadonlyArray<{ name: string; file: string[]; supersededBy: string }> = [
  { name: 'launchFromKey', file: ['shell', 'input.ts'], supersededBy: 'fireFromKey' },
  { name: 'cruiseKillPoints', file: ['core', 'score.ts'], supersededBy: 'scoreKills + CRUISE_SCORE_MULT' },
  { name: 'computeLetterbox', file: ['shell', 'viewport.ts'], supersededBy: 'applyLetterbox' },
]

// The four symbols a claim test protects — they must SURVIVE the cleanup.
const KEEP_SYMBOLS: ReadonlyArray<{ name: string; file: string[]; decl: RegExp; claimTest: string }> = [
  {
    name: 'applyPointerMotion',
    file: ['shell', 'input.ts'],
    decl: /export function applyPointerMotion\b/,
    claimTest: 'place-cursor.test.ts:206',
  },
  {
    name: 'mainline',
    file: ['core', 'state.ts'],
    decl: /export function mainline\b/,
    claimTest: 'state-mainline.test.ts (surface[])',
  },
  {
    name: 'stateCode',
    file: ['core', 'state.ts'],
    decl: /export function stateCode\b/,
    claimTest: 'state-mainline.test.ts (surface[])',
  },
  {
    name: 'INITIAL_ATTRACT',
    file: ['core', 'state.ts'],
    decl: /export const INITIAL_ATTRACT\b/,
    claimTest: 'state-mainline.test.ts (surface[])',
  },
]

describe('mc11-4 — the three unprotected dead twins are RETIRED (deleted)', () => {
  it.each(DELETE_TWINS)(
    "$name is no longer declared in its home file (superseded inline by $supersededBy)",
    ({ name, file }) => {
      const text = src(...file)
      // The `export function <name>(` declaration must be gone. It exists today
      // (this is the RED assertion); GREEN deletes it.
      const declRe = new RegExp(`export\\s+function\\s+${name}\\b`)
      expect(
        declRe.test(text),
        `${name} is still declared in src/${file.join('/')} — the dead twin was not retired`,
      ).toBe(false)
    },
  )

  it.each(DELETE_TWINS)(
    '$name has no residual reference anywhere in the production tree (retired everywhere)',
    ({ name }) => {
      const wordRe = new RegExp(`\\b${name}\\b`)
      const prod = allProdSrc()
      // Not just the export removed — no call, no re-export, no import lingers in src/.
      expect(
        wordRe.test(prod),
        `${name} still appears somewhere under src/ — deletion was incomplete`,
      ).toBe(false)
    },
  )
})

describe('mc11-4 — the four claim-pinned twins are KEPT (retention rule)', () => {
  it.each(KEEP_SYMBOLS)(
    '$name remains exported in its home file — a claim test ($claimTest) pins it',
    ({ name, file, decl }) => {
      const text = src(...file)
      expect(
        decl.test(text),
        `${name} was deleted from src/${file.join('/')}, but a claim test still asserts it — ` +
          `the story keeps any symbol a claim test protects`,
      ).toBe(true)
    },
  )
})
