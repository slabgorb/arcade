// tests/jt13-8-retire-dead-twins.test.ts
//
// Story jt13-8 — RED (O'Brien / TEA). Joust's core exports a family of DEAD
// TWINS: functions with zero production callers, because a later story
// reimplemented the same behaviour INLINE on the real path and never unhooked the
// original. This suite retires them, following the mc11-4 / pm5 precedent — and,
// as that precedent insists, it is NOT a uniform delete-all. Every candidate was
// VERIFIED against its current referencing tests (the story's own "do not trust
// this list blind" mandate); the split below is the result of that measurement,
// not of the audit's guess.
//
// ─── THE PER-SYMBOL RULE (from the epic) ─────────────────────────────────────
//   • BEHAVIOURAL-ONLY twin, and a LIVE inline twin exists → DELETE the export,
//     retire it everywhere under src/, and Dev RE-POINTS its behavioural tests
//     onto the live symbol so the ROM coverage is preserved, never dropped.
//   • CLAIM-PINNED, or NO live twin exists → KEEP. Deleting a symbol whose ROM
//     behaviour is tested but has nowhere to re-point would DELETE coverage, which
//     the story forbids. Such a symbol's only "dead role" is that nothing calls it.
//
// ─── WHY AN AST SCAN, NOT A RAW-TEXT GREP ────────────────────────────────────
// "No production caller" is a statement about CODE, not about prose. A comment
// that says "retired stepPlaying (jt13-8)" is not a caller, and a scan that
// reddened on it would force the author to scrub every explanatory comment — which
// is exactly what cost mc11-4 three review rounds. So this suite counts
// ts.Identifier nodes: comments and string/template literals are not identifiers,
// so only real references are ever counted. It reuses joust's own standing
// principle (purity-scanner: parse, do not regex) and the `typescript` devDep the
// purity gate already leans on.
//
// (No `<file>.ts:<line>` refs in these comments — the comment-line-refs guard bans
// them and symbol names outlive line numbers. ROM `.SRC` cites are exempt.)

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')

/** Every `.ts` file under the plugin's own src/ (core + shell + main). */
function srcFiles(): string[] {
  return readdirSync(srcRoot, { recursive: true, encoding: 'utf8' })
    .filter((f) => typeof f === 'string' && f.endsWith('.ts'))
    .map((f) => join(srcRoot, f))
}

function parse(file: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.ESNext,
    /* setParentNodes */ true,
    ts.ScriptKind.TS,
  )
}

/**
 * How many times `name` occurs as a real code identifier anywhere under src/.
 * A live-but-only-declared symbol scores 1 (its declaration name); a fully
 * retired one scores 0. Comments and literals never count.
 */
function codeRefs(name: string): number {
  let n = 0
  for (const file of srcFiles()) {
    const sf = parse(file)
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && node.text === name) n++
      ts.forEachChild(node, visit)
    }
    ts.forEachChild(sf, visit)
  }
  return n
}

function isExported(node: ts.FunctionDeclaration | ts.VariableStatement): boolean {
  return (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
}

/**
 * The src-relative path of the module that EXPORTS `name` as a function or a
 * const, or null when nothing under src/ exports it. Used both to pin a
 * retirement (expect null) and to guard a keep (expect the home module).
 */
function exportedFrom(name: string): string | null {
  for (const file of srcFiles()) {
    const sf = parse(file)
    for (const stmt of sf.statements) {
      if (ts.isFunctionDeclaration(stmt) && stmt.name?.text === name && isExported(stmt)) {
        return relative(srcRoot, file)
      }
      if (ts.isVariableStatement(stmt) && isExported(stmt)) {
        for (const d of stmt.declarationList.declarations) {
          if (ts.isIdentifier(d.name) && d.name.text === name) return relative(srcRoot, file)
        }
      }
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — behavioural-only twins with a live inline twin. RED now (each is still
// declared and thus still referenced once); Dev turns each green by deleting the
// export, pruning it from the module's tests/helpers contract surface, and
// RE-POINTING its behavioural tests onto the named live symbol.
// ─────────────────────────────────────────────────────────────────────────────
const RETIRED: ReadonlyArray<{
  sym: string
  home: string
  liveTwin: string
}> = [
  // cabinet.ts wraps the session in a mode machine; main.ts uses toSelect /
  // startPlaying / toAttract / afterGameOver / modeForGover but INLINES these two,
  // so they alone in the tier are dead.
  { sym: 'stepPlaying', home: 'core/cabinet.ts', liveTwin: "main.ts's inline stepGame + modeForGover pump" },
  { sym: 'toTitle', home: 'core/cabinet.ts', liveTwin: "main.ts's inline { mode: 'title' } boot" },
  // the live sim calls egg.ts's willHatch + remountEntryEdge directly (the wave-egg
  // and collision-pass hatch); hatchEgg is the unhooked composition of the two.
  { sym: 'hatchEgg', home: 'core/sim.ts', liveTwin: "egg.ts's willHatch + remountEntryEdge (called inline)" },
  // the live pad complement is enemyTypesForWave / spawnWaveEnemies (verified during
  // GREEN — NOT wenemyFor, which computes the hatch-at-a-time nibble); the transporter
  // row→count copy is unhooked, and counted pterodactyls the live path excludes.
  { sym: 'waveEnemyComplement', home: 'core/transporter.ts', liveTwin: 'enemyTypesForWave / spawnWaveEnemies count' },
  // the live service loop decides turns via nextServed(q) === 'player'; the
  // per-ticket playerTurn(q, ticket) predicate is never consulted.
  { sym: 'playerTurn', home: 'core/transporter.ts', liveTwin: "nextServed(q) === 'player' in the session serve loop" },
  // flight.ts's stepGround is the live ground stepper (verified during GREEN — NOT
  // frame.ts); groundStep is the unhooked joust.ts copy of the same skid transition.
  { sym: 'groundStep', home: 'core/joust.ts', liveTwin: "flight.ts's stepGround (same skid → plantZ transition)" },
  // arena-state.ts burns the bridge with a LATCHING wave >= BRIDGE_WAVE; the bare
  // arena predicate recomputes it from scratch and nothing calls it.
  { sym: 'bridgeDestroyedOnWave', home: 'core/arena.ts', liveTwin: 'applyWaveDestruction(...).bridgeBurned (latching)' },
]

describe('jt13-8 — dead twins are retired from production', () => {
  for (const { sym, home, liveTwin } of RETIRED) {
    describe(sym, () => {
      it(`is no longer exported from ${home}`, () => {
        expect(
          exportedFrom(sym),
          `${sym} is a dead twin (live path: ${liveTwin}) — delete its export from ${home}`,
        ).toBeNull()
      })

      it('has zero code references anywhere under src/ (retired everywhere, not just at home)', () => {
        expect(
          codeRefs(sym),
          `${sym} must be gone from all of src/ — re-point its behavioural tests onto ${liveTwin}, ` +
            'do not delete the coverage',
        ).toBe(0)
      })
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// KEEP — the guard rails against the "uniform delete-all" failure mode. Green now;
// each REDDENS if Dev over-deletes. These are NOT dead twins by this story's rule.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt13-8 — claim-pinned / no-live-twin symbols are KEPT', () => {
  // wrapEggX is the EGGWR narrow [4,288] egg wrap (JOUSTRV4.SRC:3141-3146). Unlike
  // every symbol above it has NO live twin: the live sim never wraps an egg's X
  // (settled eggs do not move in X, and entity motion uses arena.wrapX, not this
  // narrower band). Its ROM values are pinned by the egg behavioural suite, which
  // has nowhere to re-point — so deleting it would shed ROM coverage. It stays; its
  // only dead role is that nothing calls it. (That EGGWR is unwired at all is a
  // separate finding, out of this story's scope.)
  it('wrapEggX stays exported from core/egg.ts (no live re-point target)', () => {
    expect(exportedFrom('wrapEggX'), 'wrapEggX is KEPT — EGGWR has no live inline twin').toBe('core/egg.ts')
  })

  // The tests-only CONSTANTS the story flags as "classify, don't delete": each is
  // pinned by a ROM-citation / *-source claim test and reimplements no live path.
  const KEPT_CONSTANTS: ReadonlyArray<{ sym: string; home: string }> = [
    { sym: 'cliffBits', home: 'core/wave.ts' },
    { sym: 'EGG_VALUE_CAP', home: 'core/egg.ts' },
    { sym: 'PTERO_FLYX_MAX', home: 'core/ptero.ts' },
    { sym: 'GRIP_ROUTINE', home: 'core/troll.ts' },
    { sym: 'waveTypeBehaviour', home: 'core/game.ts' },
  ]
  for (const { sym, home } of KEPT_CONSTANTS) {
    it(`${sym} stays exported from ${home} (claim-pinned, not a twin)`, () => {
      expect(exportedFrom(sym), `${sym} is a ROM claim-pin — it must not be deleted`).toBe(home)
    })
  }
})
