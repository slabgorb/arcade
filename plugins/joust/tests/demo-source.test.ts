// tests/demo-source.test.ts
//
// Story jt2-7 — RED phase (Leeloo / TEA). The SOURCE-WIRING companion to
// tests/demo.test.ts, plus the ENTITY_RECORDS / PALETTES count floors this story
// finally owes (the jt1-3 review debt: "ENTITY_RECORDS floors land with jt2-7").
//
// ─── NODE ENV ON PURPOSE (the render.test.ts trap) ──────────────────────────
// This file reads src/ off disk. A node env cannot boot a canvas, so the wiring
// lines a browser shell goes wrong on are pinned as TEXT via the `?raw` idiom
// (tempest tp1-39 / centipede cp1-6 / jt1-6, reviewer-blessed). Every text match
// is written to fail on a PLAUSIBLE wrong module, not merely an empty one.
//
// ─── WHY THESE ARE WIRING PINS, NOT LAW PINS ─────────────────────────────────
// The demo consumes only ALREADY-cited data + laws. So the job here is to prove
// the wiring is PRESENT: main.ts drives the demo from the core scheduler (not its
// own divorced loop), the demo consumes the growth/EMYTIM oracles, the jt2-3
// collision core goes live, the egg laws are wired with their guard, and the
// enemy/egg/transporter frames render from the transcribed tables through the
// EXISTING atlas path — no invented pixels or colours.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadPictures } from './helpers/pictures-contract.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const mainPath = join(repoRoot, 'src', 'main.ts')
const renderPath = join(repoRoot, 'src', 'shell', 'render.ts')
const demoPath = join(repoRoot, 'src', 'core', 'demo.ts')

const mainSource = (): string => readFileSync(mainPath, 'utf8')
const renderSource = (): string => readFileSync(renderPath, 'utf8')

/** Read the demo wiring source as text. Fails self-describingly while it is missing. */
function demoSource(): string {
  if (!existsSync(demoPath)) {
    throw new Error('GREEN creates joust/src/core/demo.ts — the wave-1 demo wiring')
  }
  return readFileSync(demoPath, 'utf8')
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — main.ts DRIVES the demo from the core scheduler (the jt2-1 carried seam:
//        the demo loop and the sim must not diverge — so they are ONE module).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — the demo is driven from the core scheduler, not a divorced loop', () => {
  it('main.ts imports and drives the SESSION layer (createGame / stepGame — jt4-5 migration)', () => {
    // jt4-5 MIGRATION (Reviewer Ruling #2 — the jt2-7 precedent, done again). main.ts no longer
    // steps the RAW sim (createWaveDemo / stepDemo from core/demo) directly: it drives the SESSION
    // layer createGame / stepGame from core/game, which internally WRAPS stepDemo over a
    // createWaveDemo-built sim (the jt2-1 one-sim seam still holds — no divergent second loop).
    // The old createWaveDemo/stepDemo tokens now live ONLY in a main.ts doc-comment, so the prior
    // pins asserted a now-FALSE intent ("main.ts drives the demo directly") and passed on a mere
    // comment token — green scenery. This is WIDENED to the CALL FORM of the new seam
    // (`createGame(` / `stepGame(` — present only in the real wiring, never in the comment), so it
    // REDDENS if main.ts reverts to stepping the demo directly and never falsely reddens on a
    // comment edit. (main.ts still IMPORTS core/demo for `drawList`; that is no longer this pin's
    // point — the driving seam is the session layer.)
    const src = mainSource()
    expect(src, 'main.ts must pull the session layer from core/game').toMatch(
      /from\s+['"]\.\/core\/game(\.js)?['"]/,
    )
    expect(src, 'and build the game session (createGame, not the raw createWaveDemo)').toMatch(/createGame\s*\(/)
    expect(src, 'and step it once per frame through stepGame (not stepDemo directly)').toMatch(/stepGame\s*\(/)
  })

  it('main.ts still advances frames from the shell timebase, never from core', () => {
    // The boundary restated: the shell owns the clock; core is stepped.
    const src = mainSource()
    expect(src, 'the shell owns the clock').toMatch(/requestAnimationFrame|pumpFrames|timebase/)
    const demo = demoSource()
    expect(demo, 'the demo wiring is CORE — it names no browser surface').not.toMatch(
      /requestAnimationFrame|document\.|window\.|localStorage/,
    )
    expect(demo, 'and imports no shell').not.toMatch(/from\s+['"][^'"]*\/shell\//)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — THE CORES GO LIVE. The demo consumes the growth/EMYTIM oracles, the
//        jt2-3 collision core, the wave-1 spawn flow, and the egg laws + guard.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — the demo wiring consumes the landed cores', () => {
  it('drives the wave oracles (growth cadence, EMYTIM divider, beats, spawn)', () => {
    const src = demoSource()
    expect(src, 'the 15 s growth cadence').toMatch(/growthDue/)
    expect(src, 'growing WSMART while enemies live').toMatch(/growWanted/)
    expect(src, 'the EMYTIM divider as the scheduler period').toMatch(/emytimForWave/)
    expect(src, 'the wave-1 complement entering via pads').toMatch(/enterViaPads/)
    expect(src, 'the message beats').toMatch(/waveBeats/)
  })

  it('brings the jt2-3 collision core live (all three phases named)', () => {
    const src = demoSource()
    expect(src, 'the broad-phase box').toMatch(/broadPhase/)
    expect(src, 'the narrow-phase spans').toMatch(/narrowPhase/)
    expect(src, 'and the joust resolution').toMatch(/resolveJoust/)
  })

  it('wires the egg lifecycle with the BMI EGGBCK guard and the remount', () => {
    const src = demoSource()
    expect(src, 'the bounce law').toMatch(/bounceEgg/)
    expect(src, 'the settle law').toMatch(/eggSettles/)
    expect(src, 'the farther-edge remount').toMatch(/remountEntryEdge/)
    expect(src, 'the hatch/permadeath gate').toMatch(/willHatch/)
    // The guard the story names — only bounce a falling egg. Pinned behaviourally
    // in demo.test.ts; here it must be VISIBLE at the call site so the next author
    // does not "simplify" it away.
    expect(src, 'the velY ≥ 0 guard must be documented at the fall loop').toMatch(
      /velY\s*>=\s*0|EGGBCK/,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — THE SHELL RENDERS ENEMIES/EGGS/TRANSPORTERS FROM TRANSCRIBED DATA ONLY,
//        through the EXISTING atlas path — no invented pixels or colours.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — enemy/egg/transporter frames render from the transcribed tables', () => {
  it('main.ts consumes ENTITY_RECORDS — the buzzard-rider + egg frame table', () => {
    // The new render data. main.ts already draws BACKGROUND_RECORDS (cliffs +
    // transporter pads); rendering the buzzards and eggs means consuming the
    // ENTITY_RECORDS table it has not needed until now.
    const src = mainSource()
    expect(src, 'main.ts must import the entity frame records').toMatch(/ENTITY_RECORDS/)
  })

  it('draws through the existing atlas path (buildGameAtlas + a blit), not a new one', () => {
    const src = mainSource()
    expect(src, 'the transcribed atlas').toMatch(/buildGameAtlas|buildAtlas/)
    expect(src, 'blitted, not per-pixel painted').toMatch(/drawImage|blit/)
  })

  it('the paint path invents no colours — the cp2-1 denylist scan, widened', () => {
    // Every colour must derive from COLOR1. A hex literal, an rgb() with literal
    // args, or a CSS colour name on the paint path is a colour nobody
    // transcribed. Mutation-checked in render.test.ts; re-run here so THIS story's
    // new enemy/egg draws are covered. demo.ts is CORE (no colours) but scanned
    // for the same discipline once it lands.
    const sources = [mainSource(), renderSource()]
    if (existsSync(demoPath)) sources.push(demoSource())
    for (const src of sources) {
      const hex = src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []
      expect(hex, 'hex colour literals on the paint path').toEqual([])
      const fn = src.match(/\brgba?\s*\(\s*\d/g) ?? []
      expect(fn, 'rgb()/rgba() with literal args — build colours from the palette').toEqual([])
      const named = src.match(/fillStyle\s*=\s*['"](?!#)[a-z]+['"]/gi) ?? []
      expect(named, 'CSS named colours').toEqual([])
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// COUNT FLOORS on ENTITY_RECORDS (+ PALETTES) — the jt1-3 review debt lands with
// jt2-7, which CONSUMES the tables. Deleting a record OR dropping a table reddens.
// Proven RED once by truncation during the RED phase (see the TEA Assessment).
// The idiom mirrors joust-source.test.ts's COLLISION_TABLES floors (jt2-3).
// ─────────────────────────────────────────────────────────────────────────────
describe('ENTITY_RECORDS count floors (jt2-7 consumes them)', () => {
  it('the record COUNT is floored — dropping an entity record reddens', async () => {
    const pics = await loadPictures()
    expect(
      pics.ENTITY_RECORDS.length,
      'jt1-3 shipped 26 entity records; jt2-7 consumes them and floors the count',
    ).toBeGreaterThanOrEqual(26)
  })

  it('every record keeps a name, a REAL source block, and a source anchor', async () => {
    const pics = await loadPictures()
    const blockNames = new Set<string>()
    for (const b of pics.PIXEL_BLOCKS) {
      blockNames.add(b.name)
      for (const a of b.aliases) blockNames.add(a)
    }
    const broken = pics.ENTITY_RECORDS.filter(
      (r) =>
        !r.name ||
        !r.source ||
        !blockNames.has(r.source) ||
        !r.anchor ||
        !r.anchor.file ||
        !(r.anchor.startLine > 0),
    ).map((r) => `${r.name}→${r.source}`)
    expect(broken, 'a record with no name / a dangling source / no anchor is truncation').toEqual([])
  })

  it('the buzzard-rider and egg frames this story renders are present', async () => {
    // The specific records jt2-7 draws. A truncation that drops the buzzards or
    // the egg while keeping the players would pass a bare length floor; this
    // names them.
    const pics = await loadPictures()
    const names = new Set(pics.ENTITY_RECORDS.map((r) => r.name))
    for (const required of ['BRSTND', 'BRFLAP', 'BRRUN1', 'BRSKID', 'BRFLIP', 'EGGI']) {
      expect(names.has(required), `ENTITY_RECORDS must keep ${required}`).toBe(true)
    }
  })

  it('the render palette is floored — COLOR1 keeps its 16 entries', async () => {
    // The enemy/egg/transporter frames render through COLOR1 (consumed since
    // jt1-6). Floor the palette set and COLOR1's width so a dropped entry reddens.
    const pics = await loadPictures()
    expect(Object.keys(pics.PALETTES).length, 'the transcribed palettes').toBeGreaterThanOrEqual(3)
    expect(pics.PALETTES.COLOR1.bytes.length, 'COLOR1 is 16 entries').toBe(16)
  })
})
