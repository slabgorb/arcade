// tests/demo-jt3-7-render.test.ts
//
// Story jt3-7 — RED phase (Leeloo / TEA). AC-2, THE HEADLINE: the render/POSOFF
// seam + the ENTITY_RECORDS count floor + provenance for the new menagerie frames.
//
// ─── THE SILENT-NO-LIFT SEAM (jt2-9 HIGH, epic seed 4) ───────────────────────
// posOffset(name) (demo.ts) does ENTITY_RECORDS.find(r => r.name === name) and
// returns {0,0} when the frame is NOT recorded — a SILENT no-lift. A render fix
// keyed on ENTITY_RECORDS no-lifts frames MISSING from the table. jt2-9 round 2
// already added the P2 STORK mount records (SRUNSR/SRUN1-4R/SFLY1R), so the stork
// gap is DATA-resolved — but nothing ENUMERATES the frames a player/menagerie
// entity can draw, so a future frame added without a record would silently no-lift
// again (exactly what happened to the stork, and what WILL happen to the ptero +
// troll frames this story lands). This file makes the missing-record case LOUD:
//   • BOTH MOUNTS are enumerated through the REAL render selection (playerDrawList),
//     so a dropped mount record reddens (a regression guard — green today).
//   • Every NEW menagerie frame (the 6 ptero PT*, the 6 troll GRAB*) must have an
//     ENTITY_RECORDS entry carrying its ROM POSOFF word — RED today (PT1R..PT3L and
//     GRAB2..GRAB6 have no record, so the render would draw them at raw feet Y).
//
// ─── ROM GROUND TRUTH (POSOFF macro, JOUSTI.SRC:12-13, DECIMAL fields) ────────
//   POSOFF COLISN,XOFF,YOFF,SRC → FDB COLISN, XOFF*256+256-YOFF, SRC
// so the stored `position` word decodes: xoff = position >> 8, yoff = 256 - (low).
//   PTERO — IPTERO (JOUSTI.SRC:2601-2606), the POSOFF macro form:
//     PT1R 1,11→501  PT1L 1,11→501  PT2R 1,07→505  PT2L 0,07→249
//     PT3R 0,10→246  PT3L 0,10→246
//   TROLL HAND — ILAVAT (JOUSTI.SRC:2376-2381), FDB raw position words:
//     GRAB1 $00FB→251  GRAB2 $00F8→248  GRAB3 $00F8→248
//     GRAB4 $00F2→242  GRAB5 $00F0→240  GRAB6 $00EF→239
// GRAB1 is ALREADY recorded (as ILAVAT, source 'GRAB1', position 251); the render
// selecting the other five hands would silently no-lift. Every position below is
// re-derived from the vendored source in the skipIf(!vendoredAvailable) block, so
// a wrong hand-typed constant here reddens against the ROM rather than passing.
//
// Node env on purpose (this file reads src/ off disk); the render-source scan
// hazard from render.test.ts (never spell the env pragma) applies here too.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  vendoredAvailable,
  sourceLines,
  parseStatement,
  evalNumber,
} from './helpers/joust-source.js'
import { loadPictures } from './helpers/pictures-contract.js'
import {
  loadDemoRender,
  type DemoProcess,
  type EntityState,
} from './helpers/demo-contract.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─── The ROM POSOFF words for the frames this story consumes (source-cited) ──
// Each is XOFF*256+256-YOFF (POSOFF, JOUSTI.SRC:12-13) or the raw FDB word. The
// skipIf(!vendoredAvailable) suite below re-derives every one of these from the
// vendored tree — this table is the committed fixture, that block is its gate.

/** IPTERO — the 6 pterodactyl flight frames (JOUSTI.SRC:2601-2606). */
const PTERO_FRAMES: ReadonlyArray<{ source: string; position: number; yoff: number }> = [
  { source: 'PT1R', position: 501, yoff: 11 },
  { source: 'PT1L', position: 501, yoff: 11 },
  { source: 'PT2R', position: 505, yoff: 7 },
  { source: 'PT2L', position: 249, yoff: 7 },
  { source: 'PT3R', position: 246, yoff: 10 },
  { source: 'PT3L', position: 246, yoff: 10 },
]

/** ILAVAT — the 6 lava-troll hand frames (JOUSTI.SRC:2376-2381). */
const TROLL_FRAMES: ReadonlyArray<{ source: string; position: number; yoff: number }> = [
  { source: 'GRAB1', position: 251, yoff: 5 },
  { source: 'GRAB2', position: 248, yoff: 8 },
  { source: 'GRAB3', position: 248, yoff: 8 },
  { source: 'GRAB4', position: 242, yoff: 14 },
  { source: 'GRAB5', position: 240, yoff: 16 },
  { source: 'GRAB6', position: 239, yoff: 17 },
]

const MENAGERIE_FRAMES = [...PTERO_FRAMES, ...TROLL_FRAMES]

/**
 * The count floor: jt1-3 shipped 26 records, jt2-9 added the 6 stork mount records
 * (→32), and jt3-7 consumes the menagerie frames — the 6 ptero PT* (all new) and
 * the 6 troll hands GRAB1..GRAB6 (Dev named GRAB1 as its OWN record too, sharing
 * ILAVAT's pixel source, so the hand animates GRAB1→GRAB6 by name). 32 + 6 + 6 = 44.
 * A `>=` floor (the jt1-3 discipline) so ADDING more reads green while DROPPING one
 * reddens. The floor EQUALS the real count — the jt3-7 review (N5) closed the former
 * 1-unit slack (floor 43 vs count 44), which let a dropped un-enumerated legacy
 * record stay green; the truncation guard below proves the floor bites.
 *
 * jt8-7 raised it 44 → 50. The six added records are EGGI's continuation rows
 * (JOUSTI.SRC:2256-2261), which had never been transcribed. Note this bump is
 * REQUIRED by the guard rather than tolerated by it: the truncation test asserts
 * `ENTITY_RECORD_FLOOR >= realCount`, so leaving the floor at 44 reddens with
 * "the floor must EQUAL the real record count — no 1-unit slack (N5)". Adding
 * records to a transcription is exactly the event that puts slack in a floor.
 */
const ENTITY_RECORD_FLOOR = 50

function entity(posX: number, pixelY: number, airborne: boolean, animPhase = 0): EntityState {
  return {
    posX,
    posY: pixelY << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 1,
    groundState: airborne ? null : 'PLYBR',
    plantZ: 0,
    airborne,
    animPhase,
  }
}

function player(mount: 'ostrich' | 'stork', airborne: boolean, animPhase: number): DemoProcess {
  return {
    id: mount === 'stork' ? 2 : 1,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    facing: 1,
    mount,
    collisionEnabled: true,
    entity: entity(146, 160, airborne, animPhase),
  }
}

/** Every mount frame `playerDrawList` can emit for a mount, via the REAL selection. */
async function emittedMountFrames(mount: 'ostrich' | 'stork'): Promise<string[]> {
  const r = await loadDemoRender()
  const states: DemoProcess[] = [
    player(mount, true, 0), //   airborne  → SFLY1R / ORFLAP
    player(mount, false, 0), //  standing  → SRUNSR / ORSTND
    player(mount, false, 1), //  run 1..4  → SRUN1R.. / ORRUN1..
    player(mount, false, 2),
    player(mount, false, 3),
    player(mount, false, 4),
  ]
  const frames = new Set<string>()
  for (const p of states) {
    // playerDrawList returns [mountFrame, rider]; the mount is the first layer.
    frames.add(r.playerDrawList(p)[0])
  }
  return [...frames]
}

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 (a) — BOTH MOUNTS ENUMERATED: no mount frame silently no-lifts.
//   REGRESSION GUARD — green today (the stork records exist). It reddens the day a
//   mount frame is emitted with no ENTITY_RECORDS entry, which is exactly how the
//   P2 stork shipped a 17px gap before jt2-9 round 2. The item-4b rail that shipped
//   the gap only ever built a P1 ostrich; this enumerates BOTH.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-2 — every frame BOTH mounts emit resolves to a POSOFF record (no silent no-lift)', () => {
  for (const mount of ['ostrich', 'stork'] as const) {
    it(`the ${mount} mount: every playerDrawList frame is POSOFF-lifted (has a record, yoff > 0)`, async () => {
      const pics = await loadPictures()
      const byName = new Map(pics.ENTITY_RECORDS.map((r) => [r.name, r]))
      const frames = await emittedMountFrames(mount)
      // A mount emits six distinct frames — the enumeration must actually reach them.
      expect(frames.length, `${mount} emits 6 distinct mount frames`).toBe(6)
      const noLift: string[] = []
      for (const f of frames) {
        const rec = byName.get(f)
        // {0,0} == no record == silent no-lift == the ledge-clip bug.
        if (!rec || 256 - (rec.position & 0xff) <= 0) noLift.push(f)
      }
      expect(
        noLift,
        `these ${mount} frames would draw at raw feet Y (no POSOFF record) — the seed-4 no-lift`,
      ).toEqual([])
    })
  }

  it('the stork frames specifically carry their ROM POSOFF (SRUNSR→18, SRUN1-4R/SFLY1R→19)', async () => {
    // The exact seed-4 debt, pinned by value so a wrong re-transcription reddens.
    const pics = await loadPictures()
    const byName = new Map(pics.ENTITY_RECORDS.map((r) => [r.name, r]))
    const expected: Record<string, number> = {
      SRUNSR: 18,
      SRUN1R: 19,
      SRUN2R: 19,
      SRUN3R: 19,
      SRUN4R: 19,
      SFLY1R: 19,
    }
    for (const [name, yoff] of Object.entries(expected)) {
      const rec = byName.get(name)
      expect(rec, `the stork frame ${name} must have an ENTITY_RECORDS entry (JOUSTI.SRC:782-796)`).toBeDefined()
      expect(256 - (rec!.position & 0xff), `${name} POSOFF yoff`).toBe(yoff)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 (b) — THE NEW MENAGERIE FRAMES: ptero + troll hands each get a POSOFF record.
//   RED today: the render will select PT1R..PT3L and GRAB1..GRAB6, but only GRAB1
//   (as ILAVAT) has a record — the other eleven would draw at raw feet Y.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-2 — the new ptero/troll frames each carry their ROM POSOFF record (RED)', () => {
  it('every pterodactyl flight frame (PT1R..PT3L) has an ENTITY_RECORDS entry with its IPTERO POSOFF', async () => {
    const pics = await loadPictures()
    const bySource = new Map(pics.ENTITY_RECORDS.map((r) => [r.source, r]))
    const missing: string[] = []
    const wrong: string[] = []
    for (const f of PTERO_FRAMES) {
      const rec = bySource.get(f.source)
      if (!rec) {
        missing.push(f.source)
        continue
      }
      if (rec.position !== f.position) wrong.push(`${f.source}: ${rec.position} != ${f.position}`)
    }
    expect(missing, 'ptero frames with no ENTITY_RECORDS entry — they would silently no-lift').toEqual([])
    expect(wrong, 'ptero frames whose POSOFF word disagrees with IPTERO (JOUSTI.SRC:2601-2606)').toEqual([])
  })

  it('every lava-troll hand frame (GRAB1..GRAB6) has an ENTITY_RECORDS entry with its ILAVAT POSOFF', async () => {
    const pics = await loadPictures()
    const bySource = new Map(pics.ENTITY_RECORDS.map((r) => [r.source, r]))
    const missing: string[] = []
    const wrong: string[] = []
    for (const f of TROLL_FRAMES) {
      const rec = bySource.get(f.source)
      if (!rec) {
        missing.push(f.source)
        continue
      }
      if (rec.position !== f.position) wrong.push(`${f.source}: ${rec.position} != ${f.position}`)
    }
    // GRAB1 exists today (as ILAVAT); GRAB2..GRAB6 are the RED — the hand animation
    // would freeze the render at frame 1's offset for every later grab frame.
    expect(missing, 'troll hand frames with no ENTITY_RECORDS entry — grabbing off CLIF5 would clip').toEqual([])
    expect(wrong, 'troll hand frames whose POSOFF word disagrees with ILAVAT (JOUSTI.SRC:2376-2381)').toEqual([])
  })

  it('each new frame renders from a TRANSCRIBED pixel source (provenance — no invented pixels)', async () => {
    // The record must point at a byte-gated PIXEL_BLOCKS entry (pictures-gate
    // re-derives those from JOUSTI.SRC). A record naming a source that is not a
    // transcribed block is an invented frame, however plausible it reads.
    const pics = await loadPictures()
    const blocks = new Set(pics.PIXEL_BLOCKS.flatMap((b) => [b.name, ...b.aliases]))
    const notTranscribed = MENAGERIE_FRAMES.filter((f) => !blocks.has(f.source)).map((f) => f.source)
    expect(
      notTranscribed,
      'these source blocks are not in the gated PIXEL_BLOCKS — the pixels must be transcribed, not invented',
    ).toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 (c) — THE COUNT FLOOR (epic seed 5, jt1-3 discipline).
//   RED today (32 < 43). Proven-by-truncation below: the per-frame enumeration
//   above reddens if any specific menagerie/mount record is dropped, and the bare
//   length floor here reddens on any net truncation.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-2 — ENTITY_RECORDS count floor (dropping a record reddens)', () => {
  it(`the record count is floored at ${ENTITY_RECORD_FLOOR} (32 mounts+riders + 6 ptero + 6 troll hands + 6 EGGI)`, async () => {
    const pics = await loadPictures()
    expect(
      pics.ENTITY_RECORDS.length,
      'jt2-9 left 32 records; jt3-7 consumes the ptero (6) and troll hands (GRAB1-6, +6) → 44; ' +
        'jt8-7 adds EGGI rows 1-6 (JOUSTI.SRC:2256-2261) → floor 50',
    ).toBeGreaterThanOrEqual(ENTITY_RECORD_FLOOR)
  })

  it('the floor is a TRUE truncation guard: a real slice(0,-1) drops below the floor (N5 — no slack)', async () => {
    // jt3-7 review N5: the prior version sliced to a FIXED length 42 and asserted
    // `42 < 43` — true by construction, never re-running the floor against a real
    // truncated array, and with the floor (43) sitting one BELOW the real count (44)
    // a dropped un-enumerated record stayed green. Now: truncate the ACTUAL list by
    // one and re-run the ACTUAL floor predicate, and require the floor to track the
    // real count so removing ANY single record reddens.
    const pics = await loadPictures()
    const realCount = pics.ENTITY_RECORDS.length
    const truncated = pics.ENTITY_RECORDS.slice(0, -1)
    expect(truncated.length, 'slice(0,-1) removes exactly one real record').toBe(realCount - 1)
    expect(
      truncated.length >= ENTITY_RECORD_FLOOR,
      'a build with any one record removed must FAIL the >= floor (not vacuously pass)',
    ).toBe(false)
    // Close the slack for good: the committed floor must not sit below the real count,
    // or a dropped record that no per-name test enumerates would stay green.
    expect(
      ENTITY_RECORD_FLOOR,
      'the floor must EQUAL the real record count — no 1-unit slack (N5)',
    ).toBeGreaterThanOrEqual(realCount)
  })

  it('no record is structurally truncated (a name, a real source, an anchor)', async () => {
    const pics = await loadPictures()
    const blocks = new Set(pics.PIXEL_BLOCKS.flatMap((b) => [b.name, ...b.aliases]))
    const broken = pics.ENTITY_RECORDS.filter(
      (r) => !r.name || !blocks.has(r.source) || !r.anchor?.file,
    ).map((r) => r.name || '(unnamed)')
    expect(broken, 'a record with no name / a dangling source / no anchor is truncation').toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 (d) — NO INVENTED COLOURS: the render shell stays a palette-only paint path.
//   The new frames flow through the SAME atlas (buildAtlas over PIXEL_BLOCKS with
//   COLOR1), so no new colour literal should appear. This re-runs the cp2-1 denylist
//   scan as a regression guard now that the story adds paint.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-2 — the paint path invents no colours (denylist stays clean)', () => {
  const renderPath = join(repoRoot, 'src', 'shell', 'render.ts')
  const mainPath = join(repoRoot, 'src', 'main.ts')

  it('render.ts + main.ts carry no hard-coded colour literals', () => {
    for (const p of [renderPath, mainPath]) {
      if (!existsSync(p)) throw new Error(`the paint path source is missing: ${p}`)
      const src = readFileSync(p, 'utf8')
      expect(src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [], `hex colour literals in ${p}`).toEqual([])
      expect(src.match(/\brgba?\s*\(\s*\d/g) ?? [], `rgb()/rgba() literal args in ${p}`).toEqual([])
      expect(
        src.match(/fillStyle\s*=\s*['"](?!#)[a-z]+['"]/gi) ?? [],
        `CSS named colours in ${p}`,
      ).toEqual([])
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// THE FIXTURE GATE — re-derive every expected POSOFF word from the vendored source,
//   so the committed constants above cannot drift from the ROM (jt1-3 pattern). This
//   is the byte-grounding for the new render records: pictures-gate.test.ts gates
//   PIXEL_BLOCKS but NOT the ENTITY_RECORDS POSOFF words, so THIS block is what keeps
//   the fixture honest. (The record ANCHORS Dev adds are per the jt1-8 discipline —
//   fully-qualified JOUSTI.SRC:2376-2381 / 2601-2606; see the Delivery Finding.)
// ═════════════════════════════════════════════════════════════════════════════
describe.skipIf(!vendoredAvailable)('the expected POSOFF words re-derive from JOUSTI.SRC', () => {
  const jousti = () => sourceLines('JOUSTI.SRC')

  it('IPTERO (JOUSTI.SRC:2601-2606) re-derives the 6 ptero POSOFF words', () => {
    // POSOFF COLISN,XOFF,YOFF,SRC → word = XOFF*256+256-YOFF (JOUSTI.SRC:12-13).
    // parseStatement only handles FCB/FDB, so the POSOFF macro is parsed by hand:
    // grab the (comma-joined, space-free) operand token after the POSOFF mnemonic.
    const lines = jousti()
    const derived: Record<string, number> = {}
    for (let n = 2601; n <= 2606; n++) {
      const m = lines[n - 1].match(/\bPOSOFF\s+([^\s;]+)/)
      expect(m, `line ${n} is a POSOFF macro`).toBeTruthy()
      const [, xoff, yoff, src] = m![1].split(',')
      derived[src] = evalNumber(xoff) * 256 + 256 - evalNumber(yoff)
    }
    for (const f of PTERO_FRAMES) {
      expect(derived[f.source], `${f.source} POSOFF word from source`).toBe(f.position)
    }
  })

  it('ILAVAT (JOUSTI.SRC:2376-2381) re-derives the 6 troll-hand POSOFF words', () => {
    // FDB COLISN,POSITION,SRC — the middle operand is the raw position word.
    const lines = jousti()
    const derived: Record<string, number> = {}
    for (let n = 2376; n <= 2381; n++) {
      const st = parseStatement(lines[n - 1], n)
      expect(st?.op, `line ${n} is an FDB record`).toBe('FDB')
      const [, position, src] = st!.operands
      derived[src] = evalNumber(position)
    }
    for (const f of TROLL_FRAMES) {
      expect(derived[f.source], `${f.source} POSOFF word from source`).toBe(f.position)
    }
  })
})
