// tests/bee-family.test.ts
//
// Story ml4-6 — RED phase (Han Solo / TEA). The ml4-1 "one standalone subsystem
// per file" rule reaches its extraction trigger: the BEE-family helpers now sit
// as byte-identical module-local copies across the four named critter reducers
// (dragonfly / mosquito / bee / earwig, MILLI.MAC:166-171 BEEOFF, :179-194
// BEEMV1, :228-234 BEEMV2), and the four suites already pin their behaviour. This
// story pulls them into ONE core helper module, `src/core/bee-family.ts`, as a
// pure refactor under that existing net.
//
// ─── WHAT THIS SUITE PROVES (and why each part is RED today) ──────────────────
// A. BEHAVIOUR — the shared module exists and each helper computes what the ROM
//    says. RED now: `src/core/bee-family.ts` does not exist, so loadBeeFamily()
//    throws a self-describing "not built yet" (the ml1-1 loader pattern), never a
//    cryptic module-resolution collect error. The computed specifier keeps the
//    RED tree lint-clean (tsc cannot resolve it; vitest resolves it at runtime).
// B. DEDUP — the extraction is REAL, not a parallel copy. An AST walk (the
//    codebase's chosen tool over flat text — see tests/helpers/purity-scanner.ts)
//    proves the duplicated *definitions* are gone from the four named consumers
//    and now live once, in bee-family.ts. A re-export (`export { spawnH } from
//    './bee-family'`) or an alias (`export const beeOff = beeFamilyBeeOff`) is
//    NOT a definition, so Dev keeps every consumer's public name working while
//    the logic moves. RED now: each consumer still declares its own copy.
//
// ─── SCOPE: exactly the four NAMED consumers ─────────────────────────────────
// The story names dragonfly / mosquito / bee / earwig. The census below is wider
// than the story text — the BEEOFF body is duplicated under FIVE per-critter
// names (…Off), and `comp` (COMP two's-complement) lives in SIX files — because
// spider ALSO carries `spiderOff`, and beetle / inchworm / spider ALSO carry
// `comp`. Folding spider / beetle / inchworm is the SM's OPEN decision (routed to
// Dev in the story context's ⚠ scope note); this suite deliberately asserts
// NOTHING about those three so Dev may fold them or leave them without fighting a
// test. See the ml4-6 Delivery Finding for the full census.

import { describe, it, expect } from 'vitest'
import * as ts from 'typescript'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// tests/bee-family.test.ts → the plugin root is one level up.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const coreDir = join(root, 'src', 'core')

// ─── A. BEHAVIOUR — the extracted module's contract ──────────────────────────

/** The runtime shape of the module Dev (GREEN) creates. */
interface BeeFamilyModule {
  /** BEEMV1 (MILLI.MAC:179-194): the mushrooms-needed curve. */
  mushroomsNeeded: (score2: number) => number
  /** BEEMV2 (MILLI.MAC:228-234): the spawn column, null on the reroll bytes. */
  spawnH: (rnd0: number) => number | null
  /** BEEOFF (MILLI.MAC:166-171): free the slot — clear PTS, colour and H; V untouched. */
  beeOff: (slot: { pts: number; color: number; h: number; v?: number }) => void
  /** COMP: the ROM's two's-complement of a byte. */
  comp: (b: number) => number
}

// COMPUTED specifier (the conway/bee.test.ts pattern): tsc cannot resolve it, so
// the RED tree stays lint-clean while the module does not exist; vitest resolves
// it at runtime, relative to this file.
const BEE_FAMILY_SPECIFIER = ['..', 'src', 'core', 'bee-family'].join('/')

/** Self-describing loader (the ml1-1 pattern): a RED failure proves the FEATURE absent. */
async function loadBeeFamily(): Promise<BeeFamilyModule> {
  try {
    const mod = (await import(/* @vite-ignore */ BEE_FAMILY_SPECIFIER)) as Partial<BeeFamilyModule>
    for (const fn of ['mushroomsNeeded', 'spawnH', 'beeOff', 'comp'] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no ${fn} export`)
    }
    return mod as BeeFamilyModule
  } catch (e) {
    throw new Error(
      'BEE-family helpers not extracted yet — GREEN (Dev) creates ' +
        'src/core/bee-family.ts exporting mushroomsNeeded (BEEMV1), spawnH (BEEMV2), ' +
        'beeOff (BEEOFF) and comp (COMP), then rewires dragonfly/mosquito/bee/earwig ' +
        'to it (re-export or alias — keep each public name). ' +
        `(${e instanceof Error ? e.message : String(e)})`,
    )
  }
}

describe('bee-family module — the extracted helpers compute the ROM curves', () => {
  it('mushroomsNeeded (BEEMV1): 5 below 20k, 9 to 120k, halved SCORE2 + 6, capped 0x2F', async () => {
    const { mushroomsNeeded } = await loadBeeFamily()
    expect(mushroomsNeeded(0x00), 'below 20,000 → 5 (BE-29)').toBe(0x05)
    expect(mushroomsNeeded(0x01)).toBe(0x05)
    expect(mushroomsNeeded(0x02), 'the 9 band (BE-30/31)').toBe(0x09)
    expect(mushroomsNeeded(0x11)).toBe(0x09)
    expect(mushroomsNeeded(0x12), '(0x12>>1)+6 = 0x0F (BE-32)').toBe(0x0f)
    expect(mushroomsNeeded(0x50), '(0x50>>1)+6 = 0x2E, still below the cap').toBe(0x2e)
    expect(mushroomsNeeded(0xff), 'saturated at 0x2F (BE-33)').toBe(0x2f)
  })

  it('spawnH (BEEMV2): RND0 & 0xF8, reroll (null) below 0x10, else minus 4', async () => {
    const { spawnH } = await loadBeeFamily()
    expect(spawnH(0x00), 'masks to 0 → reroll (BE-40)').toBeNull()
    expect(spawnH(0x0f), '0x0F & 0xF8 = 0x08 < 0x10 → reroll').toBeNull()
    expect(spawnH(0x10), '0x10 - 4 (BE-41)').toBe(0x0c)
    expect(spawnH(0x1f), '0x1F & 0xF8 = 0x18, minus 4 → 0x14').toBe(0x14)
    expect(spawnH(0xff), '0xF8 - 4 → 0xF4').toBe(0xf4)
  })

  it('beeOff (BEEOFF): clears pts, colour and h; leaves v untouched', async () => {
    const { beeOff } = await loadBeeFamily()
    const slot = { pts: 7, color: 0x79, h: 0x40, v: 0x80 }
    beeOff(slot)
    expect(slot.pts, 'PTS freed (:166-167)').toBe(0)
    expect(slot.color, 'colour freed (:168)').toBe(0)
    expect(slot.h, 'H zeroed so it does not blank other motion objects (:169)').toBe(0)
    expect(slot.v, 'V is NOT touched by BEEOFF').toBe(0x80)
  })

  it('comp (COMP): two’s-complement of a byte, (0x100 - b) & 0xFF', async () => {
    const { comp } = await loadBeeFamily()
    expect(comp(0x00), '-0 wraps to 0').toBe(0x00)
    expect(comp(0x01)).toBe(0xff)
    expect(comp(0x10)).toBe(0xf0)
    expect(comp(0x80), '0x80 is its own two’s-complement').toBe(0x80)
    expect(comp(0xff)).toBe(0x01)
  })
})

// ─── B. DEDUP — the extraction is real (AST, not flat text) ───────────────────

/**
 * The set of function names DEFINED (not merely re-exported or aliased) by a
 * source. A FunctionDeclaration counts; so does `const f = () => …` / `const f =
 * function …`. An `export { f } from …` re-export or an `export const g = f`
 * alias-to-identifier does NOT — which is exactly how Dev preserves each
 * consumer's public name while the body moves to bee-family.ts.
 */
function definedFns(src: string): Set<string> {
  const sf = ts.createSourceFile('scan.ts', src, ts.ScriptTarget.Latest, /*setParentNodes*/ true)
  const names = new Set<string>()
  const walk = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name) names.add(node.name.text)
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      names.add(node.name.text)
    }
    ts.forEachChild(node, walk)
  }
  walk(sf)
  return names
}

const coreFiles = readdirSync(coreDir).filter((f) => f.endsWith('.ts'))
const read = (file: string): string => readFileSync(join(coreDir, file), 'utf8')
/** Files (of the whole core tree) that DEFINE a function of the given name. */
const definersOf = (name: string): string[] => coreFiles.filter((f) => definedFns(read(f)).has(name))

describe('bee-family extraction — the duplicated definitions collapse to one home', () => {
  // The uniquely-named movement helpers have NO consumers outside the bee family,
  // so the strongest possible guard applies: each must be defined exactly once,
  // in bee-family.ts. (Today: mushroomsNeeded in bee+dragonfly, spawnH in
  // bee+dragonfly+mosquito — so this is RED until the extraction lands.)
  it.each(['mushroomsNeeded', 'spawnH'])(
    '%s is defined exactly once across src/core, and that home is bee-family.ts',
    (name) => {
      const definers = definersOf(name)
      expect(
        definers,
        `${name} should live in exactly one core module (bee-family.ts) — found in: ${definers.join(', ') || '(none)'}`,
      ).toEqual(['bee-family.ts'])
    },
  )

  // bee-family.ts is the single home for all four helpers (comp and the BEEOFF
  // body share names/logic with out-of-scope critters, so they get the
  // per-consumer guards below rather than a global exactly-once count).
  it('bee-family.ts defines all four extracted helpers', () => {
    const defined = definedFns(read('bee-family.ts'))
    for (const fn of ['mushroomsNeeded', 'spawnH', 'beeOff', 'comp']) {
      expect(defined.has(fn), `bee-family.ts must define ${fn}`).toBe(true)
    }
  })

  // Each NAMED consumer must stop re-implementing what it now imports. The
  // per-critter BEEOFF name (beeOff / dragonflyOff / …) and `comp` are listed
  // per file; a surviving local definition of any of them is a failed extraction.
  const consumers: Array<{ file: string; forbidden: string[] }> = [
    { file: 'bee.ts', forbidden: ['mushroomsNeeded', 'spawnH', 'beeOff'] },
    { file: 'dragonfly.ts', forbidden: ['mushroomsNeeded', 'spawnH', 'dragonflyOff', 'comp'] },
    { file: 'mosquito.ts', forbidden: ['spawnH', 'mosquitoOff', 'comp'] },
    { file: 'earwig.ts', forbidden: ['earwigOff', 'comp'] },
  ]

  it.each(consumers)('$file no longer defines its own copy of the extracted helpers', ({ file, forbidden }) => {
    const defined = definedFns(read(file))
    const survivors = forbidden.filter((fn) => defined.has(fn))
    expect(
      survivors,
      `${file} still defines ${survivors.join(', ')} locally — import from bee-family.ts and re-export/alias the public name instead`,
    ).toEqual([])
  })
})
