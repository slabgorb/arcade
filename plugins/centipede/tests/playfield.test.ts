// tests/playfield.test.ts
//
// Story cp1-4 — RED phase (O'Brien / TEA). The playfield + mushroom model: the
// 30x32 PLYFLD grid, deterministic seeding, per-hit damage states, the RESTOR
// repair sweep, and the score/status-row exclusions — every number transcribed
// from rev-4 code and pinned by a claim in docs/rom-study/claims/06-playfield-
// mushrooms.json (the citation gate re-opens each against the vendored 1981 tree).
//
// ─── ROM FACT vs ADAPTER POLICY (kept explicit) ─────────────────────────────────
// ROM-CITED (must not drift): grid dims (PLYFLD=0x400, 30 wide x 32 high, 0x400-
// 0x7BF; CENDE4.MAC:61), 46 seed attempts (LDX I,45. decimal + DEX/BPL;
// CENTI4.MAC:1222,1259), the DETERMINISTIC column walk 0x1B..0x02
// (CENTI4.MAC:1220,1253,1255), full-mushroom 0x3F, the 0x38-0x3F picture band,
// the per-shot decrement + destroy thresholds 0x3B/0x37, mushroom HP 4, the
// lower-screen count boundary 0x0C, scoring (destroy 1, restore 5), and the
// RESTOR 8-frame cadence.  ADAPTER POLICY (deterministic, documented, NOT a ROM
// fact): the ROM reads the POKEY hardware RNG (RNGEN, CENTI4.MAC:1223) for each
// placement's ROW; the sim substitutes the seeded @shared/rng (mulberry32).
// Only the COLUMN walk and the counts/exclusions are ROM — WHICH row a mushroom
// lands on is adapter entropy, so these tests pin determinism + the ROM-cited
// invariants, never a specific rng-chosen row.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// src/core/playfield.ts does not exist yet.  loadPlayfield() dynamic-imports it and
// throws a self-describing "not built yet" (not a module-resolution stack trace), so
// every feature test reddens for the FEATURE's absence — the harness-error trap the
// citations suite avoids the same way.  @shared/rng is pinned + installed, so
// its import resolves; the ONLY missing piece is the core module GREEN (Julia) writes.
//
// The two provenance tests at the bottom are legitimately GREEN from day one (the
// claims file is TEA-authored data, and it must byte-verify NOW even though the impl
// is absent — claims are data, feature tests fail on missing code).

import { describe, it, expect } from 'vitest'
import { createRng, type Rng } from '@shared/rng'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─── The contract GREEN implements (src/core/playfield.ts) ───────────────────────
interface Playfield {
  // 30*32 = 960 cells, indexed by offset (addr - 0x400) = h*0x20 + v.  A cell is 0
  // (empty) or a mushroom picture code (0x38-0x3F).  vIndex(i) = i & 0x1F.
  cells: Uint8Array
  // Count of mushrooms on the LOWER part of the screen (vertical index < 0x0C) —
  // the ROM's MUSH counter that governs flea spawning.
  mush: number
}
interface PlayfieldModule {
  // geometry (CENDE4.MAC:61)
  PLYFLD_BASE: number // 0x400
  PLYFLD_WIDTH: number // 30 (horizontal cells, h)
  PLYFLD_HEIGHT: number // 32 (vertical cells, v)
  PLYFLD_END: number // 0x7BF
  PLYFLD_STRIDE: number // 0x20 (address step per horizontal cell)
  // mushroom picture codes
  MUSHROOM_FULL: number // 0x3F
  MUSHROOM_MIN: number // 0x38
  NORMAL_DESTROY: number // 0x3B
  POISON_DESTROY: number // 0x37
  MUSHROOM_HP: number // 4
  // seeding
  SEED_COUNT: number // 46
  SEED_COLUMN_START: number // 0x1B
  SEED_COLUMN_MIN: number // 0x02
  MUSH_LOWER_BOUND: number // 0x0C
  // scoring (BCD; hex == decimal for these)
  SCORE_DESTROY: number // 1
  SCORE_RESTORE: number // 5
  // RESTOR
  RESTOR_FRAME_MASK: number // 0x07 (active every 8 frames)
  RESTOR_START: number // 0x400 (MEM armed to PLYFLD base at death)
  // state + ops
  createPlayfield: () => Playfield
  seedPlayfield: (rng: Rng) => Playfield
  isMushroom: (cell: number) => boolean
  damageMushroom: (cell: number) => { cell: number; scored: number; destroyed: boolean }
  restoreMushroom: (cell: number) => { cell: number; scored: number }
}

async function loadPlayfield(): Promise<PlayfieldModule> {
  try {
    const mod = (await import('../src/core/playfield')) as Partial<PlayfieldModule>
    if (typeof mod.seedPlayfield !== 'function') throw new Error('module has no `seedPlayfield` export')
    return mod as PlayfieldModule
  } catch (e) {
    throw new Error(
      'playfield core module not built yet — GREEN (Julia) creates src/core/playfield.ts ' +
        'exporting the geometry/mushroom/seeding/scoring/RESTOR constants and ' +
        'createPlayfield / seedPlayfield(rng) / isMushroom / damageMushroom / restoreMushroom. ' +
        'Every constant is transcribed from rev-4 code and cited in ' +
        'docs/rom-study/claims/06-playfield-mushrooms.json. ' +
        `(${(e as Error).message})`,
    )
  }
}

// vertical index of a cell offset: v = offset & 0x1F (stride 0x20).  v=0x1F is the
// top/score row, v=0,1 the bottom/player rows.
const vOf = (offset: number): number => offset & 0x1f

// ───────────────────────────────────────────────────────────────────────────────
// GEOMETRY — CENDE4.MAC:61 (PM-1). PLYFLD = 0x400 (hex), 30 wide x 32 high, 0x400-0x7BF.
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-4 playfield — grid geometry (CENDE4.MAC:61)', () => {
  it('PLYFLD base is 0x400 (hex, not decimal 400)', async () => {
    const pf = await loadPlayfield()
    expect(pf.PLYFLD_BASE).toBe(0x400)
  })

  it('is 30 wide by 32 high', async () => {
    const pf = await loadPlayfield()
    expect(pf.PLYFLD_WIDTH).toBe(30)
    expect(pf.PLYFLD_HEIGHT).toBe(32)
  })

  it('spans 0x400-0x7BF (960 = 30*32 bytes) with a 0x20 address stride', async () => {
    const pf = await loadPlayfield()
    expect(pf.PLYFLD_STRIDE).toBe(0x20)
    expect(pf.PLYFLD_END).toBe(0x7bf)
    // last cell: base + (width-1)*stride + (height-1) = 0x400 + 29*0x20 + 31 = 0x7BF
    expect(pf.PLYFLD_BASE + (pf.PLYFLD_WIDTH - 1) * pf.PLYFLD_STRIDE + (pf.PLYFLD_HEIGHT - 1)).toBe(0x7bf)
  })

  it('createPlayfield yields 960 empty cells and mush 0', async () => {
    const pf = await loadPlayfield()
    const field = pf.createPlayfield()
    expect(field.cells.length).toBe(pf.PLYFLD_WIDTH * pf.PLYFLD_HEIGHT)
    expect(field.cells.length).toBe(960)
    expect([...field.cells].every((c) => c === 0)).toBe(true)
    expect(field.mush).toBe(0)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// MUSHROOM PICTURE CODES — the 0x38-0x3F band (PM-15/16/18/19).
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-4 playfield — mushroom picture codes', () => {
  it('constants are the rev-4 hex values', async () => {
    const pf = await loadPlayfield()
    expect(pf.MUSHROOM_FULL).toBe(0x3f)
    expect(pf.MUSHROOM_MIN).toBe(0x38)
    expect(pf.NORMAL_DESTROY).toBe(0x3b)
    expect(pf.POISON_DESTROY).toBe(0x37)
    expect(pf.MUSHROOM_HP).toBe(4)
  })

  it('isMushroom is true for the whole 0x38-0x3F band and false outside it', async () => {
    const pf = await loadPlayfield()
    for (let v = 0x38; v <= 0x3f; v++) expect(pf.isMushroom(v), `0x${v.toString(16)} is a mushroom`).toBe(true)
    for (const v of [0x00, 0x10, 0x37, 0x40]) expect(pf.isMushroom(v), `0x${v.toString(16)} is not`).toBe(false)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// DAMAGE — SHOOT decrements by 1; destroy at 0x3B (normal) / 0x37 (poison); +1 pt
// on the destroying hit only (PM-17/18/19/20).
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-4 playfield — damage states (SHOOT decrement, CENTI4.MAC:2151-2168)', () => {
  it('a shot decrements the picture code by 1 without scoring, until destroyed', async () => {
    const pf = await loadPlayfield()
    expect(pf.damageMushroom(0x3f)).toEqual({ cell: 0x3e, scored: 0, destroyed: false })
    expect(pf.damageMushroom(0x3e)).toEqual({ cell: 0x3d, scored: 0, destroyed: false })
    expect(pf.damageMushroom(0x3d)).toEqual({ cell: 0x3c, scored: 0, destroyed: false })
  })

  it('the 4th hit on a full normal mushroom (0x3C -> 0x3B) destroys it and awards 1 point', async () => {
    const pf = await loadPlayfield()
    expect(pf.damageMushroom(0x3c)).toEqual({ cell: 0x00, scored: 1, destroyed: true })
  })

  it('a full normal mushroom takes exactly MUSHROOM_HP (4) shots to destroy', async () => {
    const pf = await loadPlayfield()
    let cell = pf.MUSHROOM_FULL
    let hits = 0
    let scored = 0
    for (let i = 0; i < 10 && cell !== 0; i++) {
      const r = pf.damageMushroom(cell)
      cell = r.cell
      scored += r.scored
      hits++
    }
    expect(hits).toBe(pf.MUSHROOM_HP)
    expect(hits).toBe(4)
    expect(scored).toBe(pf.SCORE_DESTROY)
  })

  it('a poisoned mushroom (band 0x38-0x3B) is destroyed when the decrement reaches 0x37', async () => {
    const pf = await loadPlayfield()
    // full poison 0x3B decrements without destroying until 0x38 -> 0x37 = destroyed
    expect(pf.damageMushroom(0x3b)).toEqual({ cell: 0x3a, scored: 0, destroyed: false })
    expect(pf.damageMushroom(0x38)).toEqual({ cell: 0x00, scored: 1, destroyed: true })
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// RESTOR — restore a partial/poison mushroom (0x38-0x3E) to full 0x3F, +5 pts;
// full + empty + non-mushroom cells untouched (PM-25/26). Cadence 8 frames (PM-23).
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-4 playfield — RESTOR repair sweep (CENTI4.MAC:1826, after death)', () => {
  it('restores any partial or poisoned mushroom to full 0x3F and awards 5 points', async () => {
    const pf = await loadPlayfield()
    for (const partial of [0x38, 0x39, 0x3a, 0x3b, 0x3c, 0x3d, 0x3e]) {
      expect(pf.restoreMushroom(partial), `0x${partial.toString(16)} restores to full`).toEqual({
        cell: 0x3f,
        scored: 5,
      })
    }
  })

  it('leaves a full mushroom, an empty cell, and a non-mushroom cell untouched (no score)', async () => {
    const pf = await loadPlayfield()
    expect(pf.restoreMushroom(0x3f)).toEqual({ cell: 0x3f, scored: 0 })
    expect(pf.restoreMushroom(0x00)).toEqual({ cell: 0x00, scored: 0 })
    expect(pf.restoreMushroom(0x10)).toEqual({ cell: 0x10, scored: 0 })
  })

  it('is armed at the playfield base and paces every 8 frames', async () => {
    const pf = await loadPlayfield()
    expect(pf.RESTOR_FRAME_MASK).toBe(0x07) // AND I,07 => active when frame & 7 == 0 (every 8), NOT 16
    expect(pf.RESTOR_START).toBe(0x400) // MEM armed to PLYFLD base (0x0400) at player death
    expect(pf.RESTOR_START).toBe(pf.PLYFLD_BASE)
  })

  it('restore is the inverse-ish of damage: a damaged full mushroom restores to full', async () => {
    const pf = await loadPlayfield()
    const oneHit = pf.damageMushroom(pf.MUSHROOM_FULL).cell // 0x3E
    expect(oneHit).toBe(0x3e)
    expect(pf.restoreMushroom(oneHit)).toEqual({ cell: pf.MUSHROOM_FULL, scored: pf.SCORE_RESTORE })
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// SCORING — destroy 1, restore 5 (PM-20/26/31/32/33). BCD, hex == decimal here.
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-4 playfield — scoring constants', () => {
  it('SCORE_DESTROY is 1 and SCORE_RESTORE is 5', async () => {
    const pf = await loadPlayfield()
    expect(pf.SCORE_DESTROY).toBe(1)
    expect(pf.SCORE_RESTORE).toBe(5)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// SEEDING — INIT "PUT UP OBSTACLES": 46 attempts, deterministic column walk, all
// 0x3F, reserved rows respected, MUSH = lower-screen count (PM-4..PM-14, PM-8).
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-4 playfield — initial mushroom seeding (INIT, CENTI4.MAC:1220-1259)', () => {
  it('seeding constants are the rev-4 values (45. is DECIMAL -> 46 attempts)', async () => {
    const pf = await loadPlayfield()
    expect(pf.SEED_COUNT).toBe(46) // LDX I,45. (decimal 45) + DEX/BPL => 46 iterations
    expect(pf.SEED_COLUMN_START).toBe(0x1b)
    expect(pf.SEED_COLUMN_MIN).toBe(0x02)
    expect(pf.MUSH_LOWER_BOUND).toBe(0x0c)
  })

  it('every seeded mushroom is a FULL mushroom (0x3F)', async () => {
    const pf = await loadPlayfield()
    const field = pf.seedPlayfield(createRng(0x1234))
    for (let i = 0; i < field.cells.length; i++) {
      if (field.cells[i] !== 0) expect(field.cells[i], `cell ${i}`).toBe(pf.MUSHROOM_FULL)
    }
  })

  it('places at most SEED_COUNT (46) distinct mushrooms (collisions/off-grid reduce it)', async () => {
    const pf = await loadPlayfield()
    for (const seed of [1, 0x1234, 987654]) {
      const field = pf.seedPlayfield(createRng(seed))
      const count = [...field.cells].filter((c) => c !== 0).length
      expect(count, `seed ${seed}: <= 46`).toBeLessThanOrEqual(pf.SEED_COUNT)
      expect(count, `seed ${seed}: a real field was seeded`).toBeGreaterThan(20)
    }
  })

  it('reserves the bottom rows (v=0,1) and the top score row (v=0x1F): seeded v in [0x02, 0x1B]', async () => {
    const pf = await loadPlayfield()
    for (const seed of [1, 0x1234, 987654]) {
      const field = pf.seedPlayfield(createRng(seed))
      for (let i = 0; i < field.cells.length; i++) {
        if (field.cells[i] === 0) continue
        const v = vOf(i)
        expect(v, `seed ${seed}: cell ${i} vertical index in walk range`).toBeGreaterThanOrEqual(pf.SEED_COLUMN_MIN)
        expect(v, `seed ${seed}: cell ${i} vertical index in walk range`).toBeLessThanOrEqual(pf.SEED_COLUMN_START)
        // the specific reserved rows must never hold a seeded mushroom
        expect([0, 1, 0x1f]).not.toContain(v)
      }
    }
  })

  it('MUSH counts exactly the seeded mushrooms on the lower part of the screen (v < 0x0C)', async () => {
    const pf = await loadPlayfield()
    for (const seed of [1, 0x1234, 987654]) {
      const field = pf.seedPlayfield(createRng(seed))
      let lower = 0
      for (let i = 0; i < field.cells.length; i++) {
        if (field.cells[i] !== 0 && vOf(i) < pf.MUSH_LOWER_BOUND) lower++
      }
      expect(field.mush, `seed ${seed}: MUSH == lower-screen mushroom count`).toBe(lower)
    }
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// DETERMINISM — AC-3. Same seed reproduces the identical field through seeding,
// damage, and RESTOR.  The adapter's mulberry32 is seed-pure, so two fresh cursors
// with the same seed must produce byte-identical results.
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-4 playfield — determinism (AC-3)', () => {
  it('identical seeds seed identical fields (same cells, same MUSH)', async () => {
    const pf = await loadPlayfield()
    const a = pf.seedPlayfield(createRng(0xc0ffee))
    const b = pf.seedPlayfield(createRng(0xc0ffee))
    expect([...a.cells]).toEqual([...b.cells])
    expect(a.mush).toBe(b.mush)
  })

  it('different seeds seed different fields (the rng is actually consumed, not ignored)', async () => {
    const pf = await loadPlayfield()
    const a = pf.seedPlayfield(createRng(1))
    const b = pf.seedPlayfield(createRng(0x7fffffff))
    expect([...a.cells]).not.toEqual([...b.cells])
  })

  it('the same seed + the same scripted damage/RESTOR sequence yields identical fields and scores', async () => {
    const pf = await loadPlayfield()
    // A deterministic mutation script applied to two same-seed fields.  Walk every
    // cell: shoot a mushroom once, then run a RESTOR pass over it.  Accumulate score.
    const run = (): { cells: number[]; score: number } => {
      const field = pf.seedPlayfield(createRng(0xabcdef))
      let score = 0
      for (let i = 0; i < field.cells.length; i++) {
        if (pf.isMushroom(field.cells[i])) {
          const hit = pf.damageMushroom(field.cells[i])
          field.cells[i] = hit.cell
          score += hit.scored
        }
      }
      for (let i = 0; i < field.cells.length; i++) {
        if (pf.isMushroom(field.cells[i])) {
          const rest = pf.restoreMushroom(field.cells[i])
          field.cells[i] = rest.cell
          score += rest.scored
        }
      }
      return { cells: [...field.cells], score }
    }
    const first = run()
    const second = run()
    expect(first.cells).toEqual(second.cells)
    expect(first.score).toBe(second.score)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-2 — CENTIP.DOC (rev-1) vs rev-4 code, recorded in open-questions.md.  GREEN
// records the diff outcome: scoring 1/5 CONFIRMED (agree, safe to bake), and the
// code-wins divergences — the RESTOR "EVERY 16 FRAMES" comment is wrong (AND I,07
// => every 8 frames), and CENTIP.DOC's single "bottom line" understates the rows
// rev-4 actually reserves.  RED until the cp1-4 entry lands.
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-4 playfield — AC-2: rev-1 prose vs rev-4 code recorded in open-questions.md', () => {
  const oqPath = join(root, 'docs', 'rom-study', 'open-questions.md')

  it('open-questions.md exists (fixture sanity)', () => {
    expect(existsSync(oqPath)).toBe(true)
  })

  it('records the cp1-4 diff: the RESTOR 8-frame cadence (code wins over the "16 frames" comment)', () => {
    const md = readFileSync(oqPath, 'utf8')
    expect(md, 'a cp1-4-tagged divergence entry must be added').toMatch(/cp1-4/i)
    expect(md, 'must name the RESTOR sweep whose comment diverges from its code').toMatch(/RESTOR/)
    expect(
      md,
      'must record the code-wins cadence: AND I,07 => active every 8 frames, not the "EVERY 16 FRAMES" comment',
    ).toMatch(/every 8|8 frames|8-frame|AND I,07|AND #0?7/i)
  })

  it('records that CENTIP.DOC mushroom scoring (1 / 5) was diffed against rev-4 code', () => {
    const md = readFileSync(oqPath, 'utf8')
    expect(md, 'the entry must reference CENTIP.DOC and the mushroom scoring diff').toMatch(/CENTIP\.DOC/)
    expect(md).toMatch(/mushroom/i)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-1 provenance — GREEN from day one.  Every constant baked above is backed by a
// claim in docs/rom-study/claims/06-playfield-mushrooms.json, byte-verified by the
// citation gate against the vendored tree.  This ties the test's numbers to source.
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-4 playfield — AC-1: constants are transcribed with claims (provenance)', () => {
  const claimsPath = join(root, 'docs', 'rom-study', 'claims', '06-playfield-mushrooms.json')

  it('the cp1-4 claims file exists and is a non-trivial set', () => {
    expect(existsSync(claimsPath)).toBe(true)
    const claims = JSON.parse(readFileSync(claimsPath, 'utf8')) as unknown[]
    expect(Array.isArray(claims)).toBe(true)
    expect(claims.length).toBeGreaterThan(25)
  })

  it('every claim cites CENTI4.MAC / CENDE4.MAC / CENTIP.DOC with a line and verbatim', () => {
    const claims = JSON.parse(readFileSync(claimsPath, 'utf8')) as {
      id: string
      claim: string
      source: { file: string; line: number; verbatim: string }
    }[]
    for (const c of claims) {
      expect(c.id, 'claim has an id').toBeTruthy()
      expect(c.claim, `${c.id} has a claim string`).toBeTruthy()
      expect(['CENTI4.MAC', 'CENDE4.MAC', 'CENTIP.DOC'], `${c.id} cites a known file`).toContain(c.source.file)
      expect(c.source.line, `${c.id} has a positive line`).toBeGreaterThan(0)
      expect(typeof c.source.verbatim, `${c.id} has a verbatim`).toBe('string')
    }
  })

  it('the key transcribed constants each appear in a claim verbatim (radix-correct hex tokens)', () => {
    const claims = JSON.parse(readFileSync(claimsPath, 'utf8')) as { source: { verbatim: string } }[]
    const verbatims = claims.map((c) => c.source.verbatim)
    const hasToken = (tok: string): boolean => verbatims.some((v) => v.includes(tok))
    // grid base, seed loop count, full-mushroom, destroy thresholds, RESTOR mask, lower bound
    for (const tok of ['=400', 'I,45.', 'I,3F', 'I,3B', 'I,37', 'I,07', 'I,0C', 'I,1B']) {
      expect(hasToken(tok), `a claim verbatim contains "${tok}"`).toBe(true)
    }
  })
})
