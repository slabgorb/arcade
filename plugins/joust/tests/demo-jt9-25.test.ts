// tests/demo-jt9-25.test.ts
//
// Story jt9-25 — RED phase (TEA). COMMIT 2: EGGTBL is the egg's hatch-animation
// driver. The port swaps a settled egg STRAIGHT into a remount buzzard on one frame
// (demo.ts, `return [remountEnemyProcess(...)]`) and draws a hardcoded 'EGGI' its
// whole life. The ROM plays an EGGMAN cutscene first: after the wait, the egg walks
// EGGTBL — wiggle L/up/R/pause, then HATCH 1-4 — revealing the standing knight, THEN
// the buzzard arrives (JOUSTRV4.SRC:3290-3319).
//
// ─── SCOPE DECISION (user, 2026-08-04): FULL EGGMAN CUTSCENE ─────────────────
// The egg HOLDS for the EGGTBL sequence before the buzzard spawns. This CHANGES the
// frame the egg process ends on and the frame the egg-hatched cue fires, so it MOVES
// the jt2 seeded-replay fingerprints AND jt9-9's hatch-timing pins ("hatches after
// EGGWT2 naps -> 1 enemy" now sees the cutscene first). Those are DELIBERATE
// re-baselines for Dev (sweep each moved pin for its OWN precondition, per
// sprint/archive/jt5-8-session.md) — NOT touched here. This commit must NOT share a
// commit with the decoder fix (commit 1), which moves nothing. The standing-knight
// vulnerability (EGGLLP "killed by player", :3316) is a FOLLOW-UP, not this story.
//
// ─── THE COLUMN TRAP (SM setup measurement) ─────────────────────────────────
// EGGTBL sits beside EGF_LEFT/EGF_RIGHT and shares their 3-byte row width, but its
// columns mean DIFFERENT things. In EGF_*, all three columns are EGGI byte offsets
// (velocity-selected). In EGGTBL: col0 = EGGI byte offset (row x 6), col1 = the
// collision HEIGHT (PCOLY2 = feet - col1, :3302-3305), col2 = the nap duration AND
// the zero terminator (:3306-3307). A Dev who reuses eggMaskFor's `slot /
// EGGI_ROW_BYTES` on col1/col2 reads a height (11) or a nap as a row index. col0 is
// divided by 6; col1 and col2 are NOT.
//
// Node env on purpose (dynamic import of demo.js off disk). This header never spells
// the vitest env directive as a token.

import { describe, it, expect } from 'vitest'
import {
  loadDemo,
  loadDemoRender,
  type DemoProcess,
  type DemoState,
  type DrawOp,
  type EggState,
} from './helpers/demo-contract.js'

const SEED = 0x1234_5678
const PLAYER1_ID = 1

// EGGI is 7 rows (JOUSTI.SRC:2255-2261), 6 bytes each. An EGGTBL col-0 offset of
// `row * 6` selects the frame at that row, in this table order. This is the ROM's
// egg-stills order, NOT the ENTITY_RECORDS array order.
const EGG_ROW_NAMES = ['EGGI', 'EGGLF', 'EGGRT', 'EGGB1', 'EGGB2', 'EGGB3', 'PLY4S'] as const
const EGG_FRAME_SET = new Set<string>(EGG_ROW_NAMES)
const EGGI_ROW_BYTES = 6

// EGGTBL, JOUSTRV4.SRC:3537-3544 — 8 rows [col0 EGGI-offset, col1 height, col2 nap].
// `7+60` = 67 on WIGGLE UP & PAUSE. Byte-gated against the vendored file in
// demo-jt9-25-source.test.ts; this is the value Dev must transcribe.
const EGGTBL_EXPECTED: ReadonlyArray<readonly [number, number, number]> = [
  [6, 6, 7], //  WIGGLE LEFT    -> row 1 EGGLF
  [0, 6, 3], //  WIGGLE UP      -> row 0 EGGI
  [12, 6, 7], // WIGGLE RIGHT   -> row 2 EGGRT
  [0, 6, 67], // WIGGLE UP&PAUSE-> row 0 EGGI  (long pause)
  [18, 6, 7], // HATCH 1        -> row 3 EGGB1
  [24, 11, 7], //HATCH 2        -> row 4 EGGB2  (taller: col1 11, not 6)
  [30, 11, 7], //HATCH 3        -> row 5 EGGB3
  [36, 11, 0], //HATCH 4        -> row 6 PLY4S  (col2 0 terminates)
]

// The frame-NAME sequence the cutscene draws, derived from EGGTBL col0 alone.
const EXPECTED_FRAME_SEQUENCE = EGGTBL_EXPECTED.map((row) => EGG_ROW_NAMES[row[0] / EGGI_ROW_BYTES])
//  = ['EGGLF','EGGI','EGGRT','EGGI','EGGB1','EGGB2','EGGB3','PLY4S']

/** jt9-25's new demo.ts exports, with a self-describing RED failure (local loader). */
interface EggAnimModule {
  EGGTBL: ReadonlyArray<readonly number[]>
  eggFrame(p: DemoProcess): string
}
async function loadEggAnim(): Promise<EggAnimModule> {
  const specifier = ['..', '..', 'src', 'core', 'demo.js'].join('/')
  const mod = (await import(/* @vite-ignore */ specifier)) as Record<string, unknown>
  const missing = (['EGGTBL', 'eggFrame'] as const).filter((k) => mod[k] === undefined)
  if (missing.length) {
    throw new Error(
      `jt9-25 commit 2 not built — demo.ts must export ${missing.join(', ')}. GREEN ` +
        'transcribes EGGTBL (JOUSTRV4.SRC:3537-3544, beside EGF_LEFT/EGF_RIGHT) and adds ' +
        'an eggFrame(p) selector (the enemyFrame/pteroFrame/trollFrame idiom) that walks ' +
        'EGGTBL for a hatching egg; drawList calls it instead of the hardcoded EGGI.',
    )
  }
  return mod as unknown as EggAnimModule
}

// ─── Staging (the demo.test.ts / jt9-9 local-factory idiom) ─────────────────────

function eggOf(over: Partial<EggState>): EggState {
  return {
    posX: 100,
    posY: 40 << 8,
    velX: 0,
    velY: 0,
    bumpX: 0,
    bumpY: 0,
    eggsLeft: 2,
    hitCount: 0,
    pfeet: 1,
    settled: true,
    ...over,
  }
}
/** A SETTLED kill-egg, primed to hatch on the next frame (waitFrames 1). */
function hatchingEggProc(over: Partial<EggState> = {}): DemoProcess {
  return { id: 0x1_0000 + 1, cls: 'secondary', nap: 1, period: 1, kind: 'egg', egg: eggOf({ waitFrames: 1, ...over }) }
}
function playerAt(id: number, posX: number, pixelY: number): DemoProcess {
  return {
    id,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    facing: 1,
    mount: 'ostrich',
    entity: {
      posX,
      posY: pixelY << 8,
      velXIndex: 0,
      velXFrac: 0,
      velY: 0,
      timeUp: 1,
      groundState: null,
      plantZ: 0,
      airborne: true,
      animPhase: 0,
    },
  }
}
async function stagedDemo(processes: DemoProcess[], wave = 1): Promise<DemoState> {
  const dmod = await loadDemo()
  const base = dmod.createWaveDemo(SEED)
  return { ...base, wave, sim: { ...base.sim, processes } }
}
const enemiesIn = (d: DemoState): DemoProcess[] => d.sim.processes.filter((p) => p.kind === 'enemy')
const eggOp = (ops: DrawOp[]): DrawOp | undefined =>
  ops.find((o) => o.kind === 'entity' && EGG_FRAME_SET.has(o.name))

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 / AC-3 — EGGTBL transcribed exactly, and its columns are NOT all offsets
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-25 AC-2 — EGGTBL is transcribed byte-exact (JOUSTRV4.SRC:3537-3544)', () => {
  it('exports the 8 rows in order, including 7+60 = 67 on WIGGLE UP & PAUSE', async () => {
    const { EGGTBL } = await loadEggAnim()
    expect(EGGTBL.map((r) => [...r])).toEqual(EGGTBL_EXPECTED.map((r) => [...r]))
  })
})

describe('jt9-25 AC-3 — the three columns carry their MEASURED meanings (not all EGGI offsets)', () => {
  it('col 0 is an EGGI byte offset: row x 6 selects the frame name in EGGI-table order', async () => {
    const { EGGTBL } = await loadEggAnim()
    // Every col-0 must be a clean multiple of 6 within the 7-row table (0..36).
    const cols0 = EGGTBL.map((r) => r[0])
    expect(cols0).toEqual([6, 0, 12, 0, 18, 24, 30, 36])
    for (const off of cols0) {
      expect(off % EGGI_ROW_BYTES, `col-0 offset ${off} must index a whole EGGI row`).toBe(0)
      expect(EGG_ROW_NAMES[off / EGGI_ROW_BYTES], `col-0 ${off} names a real egg row`).toBeDefined()
    }
  })

  it('col 1 is a collision HEIGHT, carried RAW — the hatch rows are 11, NOT 11/6', async () => {
    const { EGGTBL } = await loadEggAnim()
    // THE TRAP: if a Dev runs col1 through eggMaskFor's `/ EGGI_ROW_BYTES`, 11 -> 1.
    // The HATCH rows (4,5,6) are 11 pixels tall; the wiggle rows are 6.
    expect(EGGTBL.map((r) => r[1])).toEqual([6, 6, 6, 6, 6, 11, 11, 11])
    // 11 is not a multiple of 6 — a decoder that treated col1 as a row offset would
    // corrupt exactly these rows. Pin that the raw value survives.
    expect(EGGTBL[5][1] % EGGI_ROW_BYTES, 'col-1 11 is a height, not a row index').not.toBe(0)
  })

  it('col 2 is the nap duration and the zero TERMINATOR — only HATCH 4 is 0', async () => {
    const { EGGTBL } = await loadEggAnim()
    const cols2 = EGGTBL.map((r) => r[2])
    expect(cols2).toEqual([7, 3, 7, 67, 7, 7, 7, 0])
    expect(cols2[cols2.length - 1], 'the last row (HATCH 4) terminates the walk with 0').toBe(0)
    expect(cols2.slice(0, -1).every((n) => n > 0), 'every earlier row has a positive nap').toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-5 — EGGTBL corroborates the seven-row EGGI extent from a DIFFERENT table
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-25 AC-5 — EGGTBL max offset 36 -> row 6 requires EGGI to have 7 rows', async () => {
  it('the highest col-0 (36) names the seventh egg row (PLY4S)', async () => {
    const { EGGTBL } = await loadEggAnim()
    const maxOff = Math.max(...EGGTBL.map((r) => r[0]))
    expect(maxOff, 'HATCH 4 offset').toBe(36)
    expect(maxOff / EGGI_ROW_BYTES, 'is EGGI row 6, the 7th row — jt8-7 corroborated').toBe(6)
    expect(EGG_ROW_NAMES[maxOff / EGGI_ROW_BYTES]).toBe('PLY4S')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — the egg's hatch is an EGGTBL-driven cutscene, not an instant buzzard
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-25 AC-4 — a hatching egg walks EGGTBL before it becomes a buzzard', () => {
  it('does NOT become a buzzard on the frame its wait expires — the cutscene holds it', async () => {
    const dmod = await loadDemo()
    // waitFrames 1 -> next step expires the wait. TODAY that step returns a
    // remountEnemyProcess (1 enemy, 0 eggs). The cutscene must instead keep the egg
    // alive playing EGGTBL frames.
    let d = await stagedDemo([playerAt(PLAYER1_ID, 20, 40), hatchingEggProc()])
    d = dmod.stepDemo(d)
    expect(enemiesIn(d).length, 'no buzzard yet — the hatch animation is playing').toBe(0)
    const { drawList } = await loadDemoRender()
    expect(eggOp(drawList(d)), 'an egg frame is still being drawn').toBeDefined()
  })

  it('draws the EGGTBL frame sequence in order, then spawns the buzzard after PLY4S', async () => {
    const dmod = await loadDemo()
    const { drawList } = await loadDemoRender()
    let d = await stagedDemo([playerAt(PLAYER1_ID, 20, 40), hatchingEggProc()])

    const drawn: string[] = []
    let buzzardAppearedAfter: string | null = null
    for (let f = 0; f < 600; f++) {
      d = dmod.stepDemo(d)
      const op = eggOp(drawList(d))
      if (op) {
        if (drawn[drawn.length - 1] !== op.name) drawn.push(op.name) // dedup consecutive holds
      }
      if (enemiesIn(d).length > 0) {
        buzzardAppearedAfter = drawn[drawn.length - 1] ?? null
        break
      }
    }
    // The eight EGGTBL frames, in walk order.
    expect(drawn, 'the egg cycled the EGGTBL frames in order').toEqual([...EXPECTED_FRAME_SEQUENCE])
    // The buzzard arrives only after the terminal frame — the cutscene runs to end.
    expect(buzzardAppearedAfter, 'the buzzard spawns only after HATCH 4 / PLY4S').toBe('PLY4S')
  })

  it('draws EGGB2 at xoff -1 and EGGB3 at xoff -2 — the cutscene proves the decoder fix', async () => {
    const dmod = await loadDemo()
    const { drawList } = await loadDemoRender()
    const EGG_X = 100 // the staged egg's posX; a settled egg does not move.
    let d = await stagedDemo([playerAt(PLAYER1_ID, 20, 40), hatchingEggProc({ posX: EGG_X })])

    const xByName = new Map<string, number>()
    for (let f = 0; f < 600 && enemiesIn(d).length === 0; f++) {
      d = dmod.stepDemo(d)
      const op = eggOp(drawList(d))
      if (op && !xByName.has(op.name)) xByName.set(op.name, op.x)
    }
    // op.x = posX + xoff. With the signed decoder, EGGB2 -> 100 + (-1), EGGB3 ->
    // 100 + (-2). With today's unsigned bug they would land at 355 / 354 — off-screen.
    expect(xByName.get('EGGB2'), 'EGGB2 hangs 1px left of the hot spot').toBe(EGG_X - 1)
    expect(xByName.get('EGGB3'), 'EGGB3 hangs 2px left').toBe(EGG_X - 2)
  })

  it('jt9-41 correction — a hatching egg IS collectible, and collecting it cancels the remount', async () => {
    // SUPERSEDES jt9-25's original "a committed-hatching egg cannot be collected" pin.
    // jt9-25 made a hatchRow-set egg non-collectible ONLY to hold the seed-0xface
    // fingerprints still — a simplification the ROM contradicts. jt9-41 (user ruling
    // 2026-08-06) restored the faithful PLYEGG/EGGSCR mechanism: a player touching the
    // egg mid-cutscene collects it via the egg ladder AND sends the inbound remount
    // buzzard off-screen (AUTOFF, JOUSTRV4.SRC:3078-3087). Full coverage of the
    // interaction lives in demo-jt9-41.test.ts; this asserts the direct inversion so
    // the jt9-25 suite stays honest about the egg's fate.
    const dmod = await loadDemo()
    const EGG_X = 100
    // A hatching egg (hatchRow set) with a player sitting ON it (same posX/feet).
    let d = await stagedDemo([
      playerAt(PLAYER1_ID, EGG_X, 40),
      hatchingEggProc({ posX: EGG_X, posY: 40 << 8, pfeet: 0, hatchRow: 0, hatchNap: 7 }),
    ])
    let collected = false
    // Bounded (no `while enemiesIn === 0` — the remount is cancelled, so it never
    // arrives). 150 > EGG_HATCH_ANIM_FRAMES (112): well past when a remount could fly in.
    for (let f = 0; f < 150; f++) {
      d = dmod.stepDemo(d)
      if (d.cues.some((c) => c.type === 'egg-collected')) collected = true
    }
    expect(collected, 'the hatching egg was collected mid-crack').toBe(true)
    // The remount buzzard rides id >= 0x40_0000 (remountEnemyProcess); scoping to it
    // ignores the wave-advance enemies that spawn once the arena clears after the collect.
    expect(
      d.sim.processes.some((p) => p.kind === 'enemy' && p.id >= 0x40_0000),
      'no remount buzzard — collecting the hatching egg cancelled it',
    ).toBe(false)
  })
})
