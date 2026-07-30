// tests/flea.test.ts
//
// Story cp3-2 — RED phase (O'Brien / TEA). THE FLEA (the author's "ANT",
// motion-object slot 12): ANTPC (CENTI4.MAC:132) initializes it, ANTMV
// (CENTI4.MAC:50) drops it down the screen and seeds mushrooms behind it,
// PLAY (CENTI4.MAC:1775) kills the player on contact through the SAME routine
// cp2-5 built, and SHOOT's ant branch (CENTI4.MAC:2188) takes TWO hits to kill
// it. Transcribed from rev-4 and pinned by FL-* claims in
// docs/rom-study/claims/11-flea.json.
//
// ─── RADIX ───────────────────────────────────────────────────────────────────
// CENTI4.MAC inherits .RADIX 16 from CENDE4 — every bare literal below is HEX
// unless a trailing period marks it DECIMAL. This story turns on that
// distinction at its single most important gate:
//   :65  "CMP I,12."  → DECIMAL 12 (the CENTIN spawn gate)
//   :72  "CMP I,12"   → HEX 0x12 = 18 (the 120,000-point score band)
// Two `12`s, eleven lines apart, meaning 12 and 18. Reading either as the other
// silently breaks the spawn rule — the gate would open on the wrong wave, or
// the mushroom threshold would jump six waves early.
//
// ─── ORIENTATION / SIGN CONVENTIONS ──────────────────────────────────────────
// Upright cabinet: CLEAR (:737-751) zeroes CKF8/CKC0/CKFF, so every "EOR CKxx"
// is identity and every "LDY CKC0 / BEQ" takes the non-cocktail branch (cp2-12's
// cited orientation scope). V=0xF8 is the TOP of the screen, V=8 the bottom
// player row — V DECREASES downward, as in cp2-3.
//
// The flea DESCENDS by SUBTRACTION: ":101-102 SEC / SBC ANTDV" (the upright
// branch), the same inverted convention BUGMV uses for the spider and the
// opposite of MOTION's "ADC MOBJH" for a segment. ANTDH is hard 0 (:153-154) —
// the flea never moves horizontally.
//
// ─── TRAP: SLOT 12 IS SHARED WITH THE SCORPION ───────────────────────────────
// ANTP/ANTV/ANTH/ANTDV are ONE motion-object slot (ANTP =MOBJP+12.,
// CENDE4.MAC:138) that hosts the flea AND the scorpion. Which creature it is
// reads off the PICTURE band, and every routine that touches slot 12 gates on
// it: ANTMV moves it only while ANTP < 0x20 (:53-56), SCORP claims it from 0x30
// (:2007-2008), and SHOOT scores it as a flea only below 0x20 (:2190-2193).
// The flea's pictures are 0x1C-0x1F; the scorpion's are 0x30-0x33.
//
// ─── TRAP: THE MAINLOOP ORDER IS THE OPPOSITE OF THE SPIDER'S ────────────────
// The ROM's mainloop (:30-39) runs BUGMV at :33 but ANTMV at :37 — with SHOOT
// between them at :34. So:
//   • the SPIDER moves BEFORE SHOOT — a shot meets it where it just moved TO
//   • the FLEA moves AFTER SHOOT   — a shot meets it where it moved FROM
// cp3-1 pinned the spider's half of this. A port that steps the flea before
// resolving the shot is off by one descent step, which is 2-4 pixels into a
// V window only 5-7 wide — big enough to flip hits into misses at the edge.
//
// ─── TRAP: A KILLED FLEA IS REVIVED BY *SCORP*, NOT BY ANTMV ─────────────────
// EXPLOD (:963-970) counts the explosion 0xFF down to 0xF9 and then STOPS — its
// points-sprite tail is guarded by ":972 CPX I,13." and belongs to the spider
// alone. Nothing in ANTMV can restart the slot either, because ANTMV returns
// immediately on any picture >= 0x20 (:53-56). The ONLY path back is SCORP's
// ":2072-2075  55$: EOR CKC0 / CMP I,0FA / BCS 90$ / 58$: JMP ANTPC ;RESET
// ENTRY TO ALLOW ANTS" — a routine this story does not otherwise own. Ported
// without that branch, the first flea you kill is the last flea of the game.
// This suite pins the revival as part of the flea's lifecycle; cp3-3 adds
// SCORP's *scorpion-start* half on top of it.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// src/core/flea.ts does not exist; centipede.ts's checkPlayerContact takes no
// flea; spider.ts's OVRLAP scan still excludes slot 12 (its own comment at
// :253-255 says cp3-2 widens it); SimState carries no flea. loadCp32()
// dynamic-imports the new surface and throws a self-describing "not built yet",
// so every assertion reddens for the FEATURE's absence rather than a
// module-resolution stack trace.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRng, nextInt, type Rng } from '@shared/rng'
import {
  createPlayfield,
  obstacleCellFor,
  PLYFLD_STRIDE,
  PLYFLD_WIDTH,
  PLYFLD_HEIGHT,
  MUSHROOM_FULL,
  MUSH_LOWER_BOUND,
  type Playfield,
} from '../src/core/playfield'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─── ROM constants this story transcribes (hand-mirrored from the source so the
//     expectations are self-checking, not echoes of the module under test) ─────

// ANTPC (:132-156) — the parked-flea initializer.
const FLEA_PARK_PIC = 0x1c // :132-134 "LDA I,1C / EOR CKC0 / STA ANTP ;PICTURE"
const FLEA_PARK_V = 0xf8 // :135-137 "LDA I,0F8 / EOR CKF8 / STA ANTV ;VPOS"
const FLEA_H_MASK = 0xf8 // :139 "AND I,0F8" — the column-aligned draw
const FLEA_H_MIN_DRAW = 0x10 // :141-142 "CMP I,10 / BCC 10$ ;OFF SCREEN"
const FLEA_H_BIAS = 0x04 // :143-144 "SEC / SBC I,04 ;WE WANT"
const FLEA_DV_SLOW = 2 // :151 "LDY I,2" (hex 2)
const FLEA_DV_FAST = 3 // :146 "LDY I,3" (hex 3)
const FLEA_SPEED_SCORE2 = 0x06 // :149-150 "CMP I,6 / BCS ;ANT GOES FASTER A 60K" (BCD)

// ANTMV (:50-126) — the per-frame drop.
const FLEA_PIC_GATE = 0x20 // :55-56 "CMP I,20 / BCC 4$ ;MOVE ANT" — below this it is a flea
const FLEA_CENTIN_GATE = 12 // :65 "CMP I,12." DECIMAL — at/above this, "NO ANTS EARLY IN GAME"
const FLEA_SCORE2_MID = 0x02 // :68 "CMP I,2" (hex) — the 20,000-point band
const FLEA_SCORE2_HIGH = 0x12 // :72 "CMP I,12" HEX 18 — the 120,000-point band
const FLEA_MUSH_LOW = 0x05 // :69 "LDY I,05" — the threshold below 20,000
const FLEA_MUSH_MID = 0x09 // :71 "LDY I,09" — the threshold from 20,000
const FLEA_MUSH_BIAS = 6 // :76 "ADC I,6 ;INCREASE MINIMUM NUMBER OF MUSHROOMS"
const FLEA_FRAME_MASK = 0x03 // :82 / :111 "AND I,03" — picture change AND seeding cadence
const FLEA_PIC_STEP = 2 // :84-88 INC ANTP *then* ADC I,01 — the picture advances by TWO
const FLEA_PIC_BASE = 0x1c // :89 "ORA I,1C ;FROM 1C TO 1F"
const FLEA_PIC_WRAP = 0x03 // :88 "AND I,03"
const FLEA_BOTTOM_V = 4 // :105-106 "CMP I,4 / BCC 40$ ;IF BOTTOM OF SCREEN"
const FLEA_SEED_RNG_MASK = 0x03 // :114-115 "AND I,03 / BNE ;DO NOT PUT UP MUSHROOM"
const FLEA_SEED_V_LEAD = 4 // :116 "LDA I,4 ;MAKE MUSHROOM APPEAR AFTER ANT"
const FLEA_PLAY_SLOT = 12 // :107 "LDX I,12." DECIMAL — the slot PLAY is called with

// PLAY (:1775-1823) — the flea takes the SEGMENT windows, not the spider's.
const SEG_PLAY_H_WINDOW = 7 // :1785 "CMP I,07" (hex) — hit needs |dH| < 7
const SEG_PLAY_V_WINDOW = 7 // :1792 "CMP I,7" (hex) — hit needs |dV| < 7
const SEG_PLAY_SUM_WINDOW = 0x0c // :1798 "CMP I,0C" (hex) — the Manhattan-diamond bound
const SPIDER_PLAY_H_WINDOW = 10 // :1781 "CMP I,10." DECIMAL — the spider's WIDER window

// SHOOT's ant branch (:2188-2224).
const FLEA_HIT_V_WINDOW = 5 // :2202 "CPY I,5" (hex) — the SLOW flea's V window
const FLEA_HIT_V_WINDOW_FAST = 7 // :2198 "CPY I,7 ;SHOT GOES UP 6, FAST ANT DOWN 4"
const FLEA_FAST_DV = 4 // :2196 "CMP I,4" / :2220 "LDA I,4" — the post-hit speed
const FLEA_HIT_H_WINDOW = 6 // :2217 "CPY I,6 ;CHECK ANT"
const FLEA_SCORE = 200 // :2219 "LDY I,2 ;200 POINTS FOR ANT" -> SCORN1 MSB (BCD 0200)
const SHOT_TOP_SKIP = 0xf8 // :2181-2182 "CMP I,0F8 / BCS ;IF OFF TOP OF SCREEN"

// EXPLOD (:963-970) + SCORP's revival branch (:2072-2075).
const FLEA_EXPLODE_PIC = 0xff // :2301-2302 "LDA I,0FF / STA X,MOBJP ;EXPLOSION PICTURE"
const FLEA_EXPLODE_DONE = 0xf9 // :965-968 — EXPLOD's rest picture (shared, CT-44)
const FLEA_REVIVE_BELOW = 0xfa // :2073-2074 "CMP I,0FA / BCS 90$ ;KEEP EXPLOSION GOING"

// MUSHER (:1616-1641) — the seeding write the flea shares with cp2-3's CT-46.
const MUSHER_RESERVED_ROWS = [0, 1, 0x1f] // :1620-1623 / :1632-1633

// CENTIN (:1167-1169 "LDA I,12. / STA CENTIN ;SET CENTIPEDE SIZE") — DECIMAL 12.
const CENTIN_INIT = 12

// ─── the contract GREEN (Julia) builds ──────────────────────────────────────

interface Flea {
  h: number // ANTH pixel — column-aligned, (RNGEN & 0xF8) - 4
  v: number // ANTV pixel (0xF8 parked/top -> 4 bottom)
  dv: number // ANTDV descent speed, SUBTRACTED from v each frame
  dh: number // ANTDH — hard 0 (:153-154); the flea never moves sideways
  pic: number // ANTP picture/state byte (0x1C-0x1F alive, 0xFF-0xF9 exploding)
}

interface Segment {
  h: number
  v: number
  dh: number
  dv: number
  pic: number
}

interface Shot {
  h: number
  v: number
  live: boolean
}

interface FleaStepCtx {
  frame: number
  score: number
  rng: Rng
  /** CENTIN (:64-66) — the wave's centipede LENGTH. Wave progression is cp4, so
   *  per the epic's wave-gating ruling this input is PARAMETERIZED here rather
   *  than derived. INIT seeds it to DECIMAL 12 (:1167-1169). */
  centin: number
}

interface FleaStep {
  flea: Flea
  /** A mushroom was actually written to the field this frame (:116-122). */
  seeded: boolean
}

interface Cp32Module {
  /** ANTPC (:132-156): park the flea off the top, pick its column off the rng
   *  (with the ROM's rejection loop) and its descent speed off the score. */
  createFlea: (rng: Rng, score: number) => Flea
  /** ANTMV (:50-126): one frame — the spawn gate, the drop, the picture cycle,
   *  the mushroom seeding, and the re-park at the bottom. */
  stepFlea: (flea: Flea, field: Playfield, ctx: FleaStepCtx) => FleaStep
  /** :67-78 — the MUSH ceiling at or below which a parked flea may launch. */
  fleaSpawnThreshold: (score: number) => number
  /** SHOOT's ant branch (:2188-2224): TWO hits — the first only speeds it up. */
  resolveFleaShotHit: (shot: Shot, flea: Flea) => { flea: Flea; shot: Shot; scored: number; hit: boolean }
  /** EXPLOD (:963-970) + SCORP's revival (:2072-2075): count the explosion down
   *  and, once it is spent, re-park the slot through ANTPC. */
  stepFleaExplosion: (flea: Flea, rng: Rng, score: number) => Flea
  /** PLAY (:1775-1823) — cp2-5's routine, now also fed the flea. The flea takes
   *  the SEGMENT windows (it is not slot 13). Earlier arities MUST keep working. */
  checkPlayerContact: (
    segs: Segment[],
    player: { h: number; v: number },
    spider?: unknown,
    flea?: Flea | null,
  ) => boolean
}

async function loadCp32(): Promise<Cp32Module> {
  try {
    // The specifier is COMPUTED, not literal: src/core/flea.ts does not exist
    // yet, and a literal import would fail `tsc --noEmit` (a broken build, not a
    // RED test). At runtime this resolves normally once Julia creates the module.
    const fleaModule = ['..', 'src', 'core', 'flea'].join('/')
    const flea = (await import(/* @vite-ignore */ fleaModule)) as Record<string, unknown>
    const cent = (await import('../src/core/centipede')) as Record<string, unknown>
    for (const name of [
      'createFlea',
      'stepFlea',
      'fleaSpawnThreshold',
      'resolveFleaShotHit',
      'stepFleaExplosion',
    ]) {
      if (typeof flea[name] !== 'function') throw new Error(`flea.ts has no ${name}`)
    }
    if (typeof cent.checkPlayerContact !== 'function') throw new Error('centipede.ts has no checkPlayerContact')
    // Probe BEHAVIOURALLY, not by Function.length: an optional parameter written
    // with a default reports a shorter length, so an arity check would reject a
    // perfectly correct implementation. A flea sitting exactly on the gun must
    // register as contact once the 4th parameter is honoured.
    const probe = cent.checkPlayerContact as Cp32Module['checkPlayerContact']
    if (probe([], { h: 0x80, v: 0x10 }, null, stage({ h: 0x80, v: 0x10 })) !== true) {
      throw new Error('checkPlayerContact does not yet honour the flea (4th parameter)')
    }
    return {
      createFlea: flea.createFlea as Cp32Module['createFlea'],
      stepFlea: flea.stepFlea as Cp32Module['stepFlea'],
      fleaSpawnThreshold: flea.fleaSpawnThreshold as Cp32Module['fleaSpawnThreshold'],
      resolveFleaShotHit: flea.resolveFleaShotHit as Cp32Module['resolveFleaShotHit'],
      stepFleaExplosion: flea.stepFleaExplosion as Cp32Module['stepFleaExplosion'],
      checkPlayerContact: cent.checkPlayerContact as Cp32Module['checkPlayerContact'],
    }
  } catch (e) {
    throw new Error(
      'cp3-2 flea surface not built yet — GREEN (Julia) adds src/core/flea.ts ' +
        '(createFlea/stepFlea/fleaSpawnThreshold/resolveFleaShotHit/stepFleaExplosion), ' +
        'widens centipede.ts checkPlayerContact to take the flea as an OPTIONAL 4th ' +
        'parameter AFTER the spider (so cp2-5\'s 2-arg and cp3-1\'s 3-arg suites stay ' +
        'green), widens spider.ts\'s OVRLAP scan to include the flea slot, and wires a ' +
        `\`flea\` field into SimState. (${e instanceof Error ? e.message : String(e)})`,
    )
  }
}

// ─── test helpers ───────────────────────────────────────────────────────────

/** A flea staged directly, bypassing ANTPC, so a test can pin ONE behaviour. */
const stage = (over: Partial<Flea> = {}): Flea => ({
  h: 0x84,
  v: 0x80,
  dv: FLEA_DV_SLOW,
  dh: 0,
  pic: FLEA_PARK_PIC,
  ...over,
})

/** A step context whose gates are WIDE OPEN unless a test closes one: the
 *  centipede is short enough to allow fleas and the frame is off the seeding
 *  cadence, so the flea just falls. */
const ctx = (over: Partial<FleaStepCtx> = {}): FleaStepCtx => ({
  frame: 1,
  score: 0,
  rng: createRng(1),
  centin: FLEA_CENTIN_GATE - 1,
  ...over,
})

function fieldWith(cells: ReadonlyArray<{ h: number; v: number; code: number }> = []): Playfield {
  const field = createPlayfield()
  for (const c of cells) field.cells[c.h * PLYFLD_STRIDE + c.v] = c.code
  return field
}

/** The cell ANTMV's seeding targets: TEMP1 holds ANTH (stashed at :92-93,
 *  BEFORE the move, though ANTDH=0 makes that moot) and the row is the
 *  POST-move ANTV plus 4 (:116-119). Direction 0 (:120 "LDY I,0"). */
const seedCellOf = (flea: Flea): { h: number; v: number } =>
  obstacleCellFor(flea.h, flea.v + FLEA_SEED_V_LEAD, 0)

const cellAt = (field: Playfield, cell: { h: number; v: number }): number =>
  field.cells[cell.h * PLYFLD_STRIDE + cell.v]

/** Pack a 0-99 decimal pair into the BCD byte SCORE2 holds. */
const bcdByte = (pair: number): number => Math.floor(pair / 10) * 0x10 + (pair % 10)
/** SCORE2 — the BCD byte holding the 10,000s and 100,000s digits. NOTE the
 *  `% 100`: a score at or past 1,000,000 WRAPS, exactly as the two-digit ROM
 *  byte does. */
const score2Of = (score: number): number => bcdByte(Math.floor(score / 10000) % 100)

/** The expected MUSH threshold, recomputed from the ROM's arithmetic (:67-78)
 *  independently of the module: below 20,000 it is 5; below 120,000 it is 9;
 *  above that it is a BINARY halving of the BCD SCORE2 byte, plus 6. */
function expectedThreshold(score: number): number {
  const score2 = score2Of(score)
  if (score2 < FLEA_SCORE2_MID) return FLEA_MUSH_LOW
  if (score2 < FLEA_SCORE2_HIGH) return FLEA_MUSH_MID
  return (score2 >> 1) + FLEA_MUSH_BIAS // :74-77 LSR / CLC / ADC I,6
}

/** Run N frames of ANTMV, collecting each frame's result. */
function fall(
  mod: Cp32Module,
  start: Flea,
  field: Playfield,
  frames: number,
  over: Partial<FleaStepCtx> = {},
): { flea: Flea; seeded: number; trace: Flea[] } {
  const rng = over.rng ?? createRng(7)
  let flea = start
  let seeded = 0
  const trace: Flea[] = []
  for (let frame = 0; frame < frames; frame++) {
    const step = mod.stepFlea(flea, field, ctx({ ...over, frame, rng }))
    flea = step.flea
    if (step.seeded) seeded++
    trace.push(flea)
  }
  return { flea, seeded, trace }
}

// ════════════════════════════════════════════════════════════════════════════
// AC-1 — ANTPC: the parked flea
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-2 AC-1 ANTPC — the flea is parked off the top with a score-picked speed', () => {
  it('parks at the ROM coords with the first flea picture and NO horizontal motion (:132-137/:153-154)', async () => {
    const mod = await loadCp32()
    const flea = mod.createFlea(createRng(1), 0)
    expect(flea.v, 'ANTV parks at 0xF8 (:135-137)').toBe(FLEA_PARK_V)
    expect(flea.pic, 'ANTP is the first flea picture (:132-134)').toBe(FLEA_PARK_PIC)
    expect(flea.dh, 'ANTDH is hard 0 — the flea never moves sideways (:153-154)').toBe(0)
  })

  it('draws a COLUMN-ALIGNED h of (RNGEN & 0xF8) - 4, never below 0x0C (:138-145)', async () => {
    const mod = await loadCp32()
    // Sweep many seeds: every accepted column must satisfy the ROM's arithmetic.
    for (let seed = 1; seed <= 64; seed++) {
      const flea = mod.createFlea(createRng(seed), 0)
      expect(flea.h & 0x07, `seed ${seed}: h must be a multiple of 8 minus 4`).toBe(
        (FLEA_H_MASK - FLEA_H_BIAS) & 0x07,
      )
      expect(flea.h, `seed ${seed}: the 0x10 floor puts h at 0x0C or above`).toBeGreaterThanOrEqual(
        FLEA_H_MIN_DRAW - FLEA_H_BIAS,
      )
      expect(flea.h, `seed ${seed}: h stays inside a byte`).toBeLessThanOrEqual(0xff - FLEA_H_BIAS)
    }
  })

  it('REJECTS a draw below 0x10 and rolls again rather than clamping it in (:138-142)', async () => {
    const mod = await loadCp32()
    // The ROM's ";WILL HANG IF POKEY IS GONE AND D0-D7=0'S OR 1'S" loop is
    // rejection sampling: an RNGEN byte whose top 5 bits are 0x00 or 0x08 is
    // thrown away and re-read. The two plausible wrong ports are a CLAMP (take
    // the rejected value up to the floor) and a SINGLE draw with no retry —
    // both mint columns the hardware can never produce.
    //
    // Membership alone CANNOT separate them, and the first version of this test
    // wrongly assumed it could: it forbade h = -4 and h = 4, on the theory that
    // a clamp would carry the rejected candidate through. A real clamp does not
    // — it lifts the candidate to the 0x10 floor and yields h = 0x0C, a
    // perfectly legal column that passes both the forbidden-set check and the
    // ">= 0x0C" floor. Substituting a clamp left the suite green (Reviewer,
    // round 1).
    //
    // What separates them is the DISTRIBUTION. Rejection sampling spreads the
    // 30 legal columns evenly; a clamp folds BOTH rejected draws (top-5 bits
    // 0x00 and 0x08) onto the floor column, so 0x0C alone absorbs 3/32 of the
    // draws instead of ~1/30 — measured at 9.09% vs 3.28% over 20,000 seeds.
    const FLOOR_COLUMN = FLEA_H_MIN_DRAW - FLEA_H_BIAS // 0x0C
    const N = 4000
    const hist = new Map<number, number>()
    for (let seed = 1; seed <= N; seed++) {
      const h = mod.createFlea(createRng(seed), 0).h
      hist.set(h, (hist.get(h) ?? 0) + 1)
      expect(h, `seed ${seed}: a rejected draw must never be carried through`).toBeGreaterThanOrEqual(FLOOR_COLUMN)
      expect((h + FLEA_H_BIAS) & 0x07, `seed ${seed}: h must stay column-aligned`).toBe(0)
    }

    // Liveness: the floor column must be REACHED, or "not over-represented"
    // would be satisfied by never producing it at all.
    const floorCount = hist.get(FLOOR_COLUMN) ?? 0
    expect(floorCount, 'the floor column must actually occur').toBeGreaterThan(0)
    expect(hist.size, 'the sweep must exercise many columns, not one').toBeGreaterThan(20)

    // The discriminator: under rejection sampling the floor column is an
    // ordinary column; under a clamp it is ~3x the mean.
    const mean = N / hist.size
    expect(
      floorCount / mean,
      `the floor column 0x${FLOOR_COLUMN.toString(16)} is over-represented — the rejected draws ` +
        'are being CLAMPED onto it rather than re-rolled',
    ).toBeLessThan(2)
  })

  it('reaches MORE than one column across seeds — the draw is live, not a constant', async () => {
    const mod = await loadCp32()
    const columns = new Set<number>()
    for (let seed = 1; seed <= 200; seed++) columns.add(mod.createFlea(createRng(seed), 0).h)
    // Liveness guard: a stub returning a fixed h would satisfy every arithmetic
    // assertion above. 30 columns are reachable: RNGEN & 0xF8 yields 32
    // candidates (0x00..0xF8 step 8) and the loop rejects exactly two of them,
    // 0x00 and 0x08 — so the accepted set is 0x10..0xF8 step 8, biased down 4.
    expect(columns.size, 'createFlea must actually consume the rng').toBeGreaterThan(4)
  })

  it('descends at 2 below 60,000 points and 3 at or above it (:146-152)', async () => {
    const mod = await loadCp32()
    // ":149-150 CMP I,6 / BCS 20$ ;ANT GOES FASTER A 60K" — SCORE2 is the BCD
    // byte of the 10,000s digits, so the datum is 60,000 exactly.
    expect(score2Of(60_000), 'premise: 60,000 is exactly where SCORE2 reaches the gate byte').toBe(
      FLEA_SPEED_SCORE2,
    )
    expect(score2Of(59_999), 'and one point short does not').toBeLessThan(FLEA_SPEED_SCORE2)
    expect(mod.createFlea(createRng(1), 0).dv).toBe(FLEA_DV_SLOW)
    expect(mod.createFlea(createRng(1), 59_999).dv, 'one point short of the gate').toBe(FLEA_DV_SLOW)
    expect(mod.createFlea(createRng(1), 60_000).dv, 'the gate itself is inclusive (BCS)').toBe(FLEA_DV_FAST)
    expect(mod.createFlea(createRng(1), 990_000).dv).toBe(FLEA_DV_FAST)
  })

  it('reproduces the ROM\'s SCORE2 WRAP at 1,000,000 — the flea goes SLOW again (:148)', async () => {
    const mod = await loadCp32()
    // SCORE2 is two BCD digits. At 1,000,000 the 10,000s pair wraps to 00, so
    // the 60K compare fails and the flea reverts to its slow speed. This is the
    // table-END case: every value the tests above sample lies inside the byte's
    // range, and the walk-off is invisible from there. Faithful, not a bug.
    expect(score2Of(1_000_000), 'premise: the BCD byte wraps').toBe(0x00)
    expect(mod.createFlea(createRng(1), 1_000_000).dv).toBe(FLEA_DV_SLOW)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-1 — ANTMV: the spawn gate
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-2 AC-1 ANTMV — the CENTIN spawn gate, "NO ANTS EARLY IN GAME" (:63-66)', () => {
  it('holds a parked flea while CENTIN is at or above DECIMAL 12', async () => {
    const mod = await loadCp32()
    const parked = stage({ v: FLEA_PARK_V })
    const step = mod.stepFlea(parked, fieldWith(), ctx({ centin: FLEA_CENTIN_GATE }))
    expect(step.flea.v, 'CENTIN=12 must keep the flea parked').toBe(FLEA_PARK_V)
    expect(step.seeded, 'a parked flea seeds nothing').toBe(false)
  })

  it('releases the flea once CENTIN drops BELOW 12 — and it actually moves', async () => {
    const mod = await loadCp32()
    const parked = stage({ v: FLEA_PARK_V })
    const step = mod.stepFlea(parked, fieldWith(), ctx({ centin: FLEA_CENTIN_GATE - 1 }))
    // Liveness: the gate opening is only meaningful if the flea leaves the park.
    expect(step.flea.v, 'the released flea descends on the very frame the gate opens').toBeLessThan(FLEA_PARK_V)
    expect(FLEA_PARK_V - step.flea.v, 'it descends by exactly ANTDV').toBe(FLEA_DV_SLOW)
  })

  it('reads the gate as DECIMAL 12, not HEX 0x12 — the radix trap (:65 vs :72)', async () => {
    const mod = await loadCp32()
    const field = fieldWith()
    const parked = stage({ v: FLEA_PARK_V })
    // If a port read ":65 CMP I,12." as hex 0x12 (=18), CENTIN values 12..17
    // would WRONGLY release the flea. Pin the whole disputed band closed.
    for (let centin = FLEA_CENTIN_GATE; centin <= 0x12; centin++) {
      const step = mod.stepFlea(parked, field, ctx({ centin }))
      expect(step.flea.v, `CENTIN=${centin} must NOT release the flea (decimal-12 gate)`).toBe(FLEA_PARK_V)
    }
    // ...and the value one below it open, so the test cannot pass by refusing
    // every release.
    expect(mod.stepFlea(parked, field, ctx({ centin: FLEA_CENTIN_GATE - 1 })).flea.v).toBeLessThan(FLEA_PARK_V)
  })

  it('INIT seeds CENTIN to DECIMAL 12, so WAVE ONE has no fleas at all (:1167-1169)', async () => {
    const mod = await loadCp32()
    expect(CENTIN_INIT, 'premise: "LDA I,12." is decimal').toBe(FLEA_CENTIN_GATE)
    const step = mod.stepFlea(stage({ v: FLEA_PARK_V }), fieldWith(), ctx({ centin: CENTIN_INIT }))
    expect(step.flea.v, 'the boot value sits exactly ON the closed side of the gate').toBe(FLEA_PARK_V)
  })
})

describe('cp3-2 AC-1 ANTMV — the MUSH threshold, "IF THERE ARE MANY MUSHROOMS NEAR BOTTOM" (:67-80)', () => {
  it('is 5 below 20,000, 9 from 20,000, and (SCORE2>>1)+6 from 120,000', async () => {
    const mod = await loadCp32()
    expect(mod.fleaSpawnThreshold(0)).toBe(FLEA_MUSH_LOW)
    expect(mod.fleaSpawnThreshold(19_999), 'one point short of the 20K band').toBe(FLEA_MUSH_LOW)
    expect(mod.fleaSpawnThreshold(20_000)).toBe(FLEA_MUSH_MID)
    expect(mod.fleaSpawnThreshold(119_999), 'one point short of the 120K band').toBe(FLEA_MUSH_MID)
    // ":74-77 LSR / CLC / ADC I,6" — a BINARY halving of a BCD byte.
    // SCORE2 at 120,000 is 0x12; 0x12>>1 = 0x09; +6 = 0x0F = 15.
    expect(mod.fleaSpawnThreshold(120_000)).toBe(15)
    expect(mod.fleaSpawnThreshold(200_000), 'SCORE2 0x20 -> 0x10 + 6 = 22').toBe(22)
  })

  it('matches the independently recomputed ROM arithmetic across the whole range', async () => {
    const mod = await loadCp32()
    for (let score = 0; score <= 999_000; score += 7_000) {
      expect(mod.fleaSpawnThreshold(score), `score ${score}`).toBe(expectedThreshold(score))
    }
  })

  it('halves the BCD byte in BINARY, which is NOT the same as halving the decimal score', async () => {
    const mod = await loadCp32()
    // 190,000 -> SCORE2 = 0x19. A DECIMAL halving would give 9 (+6 = 15); the
    // ROM's binary LSR gives 0x0C = 12 (+6 = 18). The two differ, so this test
    // separates a faithful transcription from a "tidied" decimal one.
    expect(score2Of(190_000)).toBe(0x19)
    expect(mod.fleaSpawnThreshold(190_000)).toBe((0x19 >> 1) + FLEA_MUSH_BIAS)
    expect(mod.fleaSpawnThreshold(190_000), 'a decimal halving would yield 15').not.toBe(15)
  })

  it('holds the flea while MUSH EXCEEDS the threshold and releases it at exactly the threshold', async () => {
    const mod = await loadCp32()
    const parked = stage({ v: FLEA_PARK_V })
    const threshold = mod.fleaSpawnThreshold(0)

    const tooMany = fieldWith()
    tooMany.mush = threshold + 1
    expect(mod.stepFlea(parked, tooMany, ctx()).flea.v, 'MUSH above the threshold holds the flea').toBe(FLEA_PARK_V)

    // ":78-80 TYA / CMP X,MUSH-1 / BCC 30$" — the branch is taken (no flea)
    // only when the threshold is STRICTLY BELOW MUSH, so equality RELEASES.
    const exactly = fieldWith()
    exactly.mush = threshold
    expect(mod.stepFlea(parked, exactly, ctx()).flea.v, 'MUSH equal to the threshold RELEASES').toBeLessThan(
      FLEA_PARK_V,
    )
  })

  it('lets a HIGHER score tolerate a mushroom count that a low score would not', async () => {
    const mod = await loadCp32()
    const parked = stage({ v: FLEA_PARK_V })
    const field = fieldWith()
    field.mush = 7 // above the 5 of the low band, below the 9 of the mid band

    expect(mod.stepFlea(parked, field, ctx({ score: 0 })).flea.v, 'at 0 points, 7 mushrooms suppress it').toBe(
      FLEA_PARK_V,
    )
    expect(
      mod.stepFlea(parked, field, ctx({ score: 20_000 })).flea.v,
      'at 20,000 points the same board releases it ("MORE ANTS AT HIGHER SCORES")',
    ).toBeLessThan(FLEA_PARK_V)
  })

  it('gates on the LOWER-SCREEN court only — MUSH is not the whole board (:1634-1637)', async () => {
    const mod = await loadCp32()
    // MUSHER increments MUSH only for rows below 0x0C, and the flea's gate reads
    // that same byte. A board dense with UPPER-screen mushrooms must still
    // release the flea, or the trigger is reading the wrong population.
    const field = createPlayfield()
    for (let h = 0; h < 20; h++) field.cells[h * PLYFLD_STRIDE + 0x1a] = MUSHROOM_FULL
    expect(field.mush, 'premise: upper-screen stamps never touch the court count').toBe(0)
    expect(mod.stepFlea(stage({ v: FLEA_PARK_V }), field, ctx()).flea.v).toBeLessThan(FLEA_PARK_V)
  })
})

describe('cp3-2 AC-1 ANTMV — the picture gate keeps ANTMV off the SCORPION (:53-56)', () => {
  it('refuses to move a slot whose picture is at or above 0x20', async () => {
    const mod = await loadCp32()
    const field = fieldWith()
    // 0x30-0x33 are the scorpion's pictures; 0xFF-0xF9 the explosion pool.
    // ANTMV must leave every one of them exactly as it found it.
    for (const pic of [FLEA_PIC_GATE, 0x30, 0x33, FLEA_EXPLODE_DONE, FLEA_EXPLODE_PIC]) {
      const held = stage({ pic, v: 0x80 })
      const step = mod.stepFlea(held, field, ctx())
      expect(step.flea.v, `picture 0x${pic.toString(16)} must not be moved by ANTMV`).toBe(0x80)
      expect(step.flea.pic, `picture 0x${pic.toString(16)} must not be re-animated`).toBe(pic)
    }
  })

  it('DOES move every picture below 0x20 — the gate is not simply "never move"', async () => {
    const mod = await loadCp32()
    const field = fieldWith()
    for (const pic of [0x1c, 0x1d, 0x1e, 0x1f]) {
      const step = mod.stepFlea(stage({ pic, v: 0x80 }), field, ctx())
      expect(step.flea.v, `picture 0x${pic.toString(16)} is a live flea and must fall`).toBeLessThan(0x80)
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-1 — ANTMV: the descent
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-2 AC-1 ANTMV — the drop (:92-106)', () => {
  it('SUBTRACTS ANTDV from v every frame, and never moves h (:101-103/:153-154)', async () => {
    const mod = await loadCp32()
    const start = stage({ v: 0x80, h: 0x84, dv: FLEA_DV_SLOW })
    const { trace } = fall(mod, start, fieldWith(), 5, { frame: 1 })
    let expected = 0x80
    for (const [i, f] of trace.entries()) {
      expected -= FLEA_DV_SLOW
      expect(f.v, `frame ${i}: v descends by ANTDV`).toBe(expected)
      expect(f.h, `frame ${i}: h never changes`).toBe(0x84)
    }
  })

  it('descends FASTER when ANTDV is 3, and the two rates are genuinely apart', async () => {
    const mod = await loadCp32()
    const field = fieldWith()
    const slow = mod.stepFlea(stage({ v: 0x80, dv: FLEA_DV_SLOW }), field, ctx()).flea
    const fast = mod.stepFlea(stage({ v: 0x80, dv: FLEA_DV_FAST }), field, ctx()).flea
    expect(0x80 - slow.v).toBe(FLEA_DV_SLOW)
    expect(0x80 - fast.v).toBe(FLEA_DV_FAST)
    expect(fast.v, 'the rates must be discriminable, or every rate test is noise').toBeLessThan(slow.v)
  })

  it('re-parks through ANTPC once it falls below v=4 (:104-106/:125)', async () => {
    const mod = await loadCp32()
    const landed = mod.stepFlea(stage({ v: FLEA_BOTTOM_V + 1, dv: FLEA_DV_SLOW }), fieldWith(), ctx()).flea
    expect(landed.v, 'reaching the bottom sends the flea back to the park').toBe(FLEA_PARK_V)
    expect(landed.pic, 'ANTPC restores the first flea picture').toBe(FLEA_PARK_PIC)
    expect(landed.h & 0x07, 'ANTPC re-draws a column-aligned h').toBe((FLEA_H_MASK - FLEA_H_BIAS) & 0x07)
  })

  it('does NOT re-park while it is still above the bottom bound', async () => {
    const mod = await loadCp32()
    const still = mod.stepFlea(stage({ v: 0x20, dv: FLEA_DV_SLOW }), fieldWith(), ctx()).flea
    expect(still.v).toBe(0x20 - FLEA_DV_SLOW)
    expect(still.v, 'a mid-screen flea is not at the bottom').not.toBe(FLEA_PARK_V)
  })

  it('falls the whole screen and re-parks, without ever leaving the byte', async () => {
    const mod = await loadCp32()
    const { trace } = fall(mod, stage({ v: FLEA_PARK_V - FLEA_DV_SLOW }), fieldWith(), 200)
    for (const [i, f] of trace.entries()) {
      expect(f.v, `frame ${i}: v stays a byte`).toBeGreaterThanOrEqual(0)
      expect(f.v, `frame ${i}: v stays a byte`).toBeLessThanOrEqual(0xff)
    }
    // Liveness: over 200 frames a 2-per-frame descent must have re-parked at
    // least once, or the "falls the whole screen" claim is untested.
    expect(trace.some((f) => f.v === FLEA_PARK_V), 'the flea must complete at least one full fall').toBe(true)
  })
})

describe('cp3-2 AC-1 ANTMV — the picture cycle (:81-91)', () => {
  it('changes picture only on frames where FRAME & 3 == 0 (:81-83)', async () => {
    const mod = await loadCp32()
    const field = fieldWith()
    const start = stage({ v: 0x80, pic: FLEA_PARK_PIC })
    for (const frame of [1, 2, 3, 5, 6, 7]) {
      expect(mod.stepFlea(start, field, ctx({ frame })).flea.pic, `frame ${frame} must NOT re-picture`).toBe(
        FLEA_PARK_PIC,
      )
    }
    expect(mod.stepFlea(start, field, ctx({ frame: 4 })).flea.pic, 'frame 4 DOES re-picture').not.toBe(
      FLEA_PARK_PIC,
    )
  })

  it('advances the picture by TWO, not one — "INC ANTP" *and* "ADC I,01" (:84-88)', async () => {
    const mod = await loadCp32()
    const field = fieldWith()
    // The routine increments ANTP in memory and then adds 1 again to the value
    // it read back, so the step is +2. Starting from 0x1C the cycle is
    // 0x1C -> 0x1E -> 0x1C, and pictures 0x1D/0x1F are NEVER reached — the
    // ";FROM 1C TO 1F" comment at :89 describes the ORA mask's range, not the
    // set of pictures the flea actually shows. Code wins (open question 4's
    // discipline); the divergence is recorded in open-questions.md.
    const first = mod.stepFlea(stage({ v: 0x80, pic: FLEA_PARK_PIC }), field, ctx({ frame: 4 })).flea
    expect(first.pic).toBe(((FLEA_PARK_PIC + FLEA_PIC_STEP) & FLEA_PIC_WRAP) | FLEA_PIC_BASE)
    expect(first.pic, 'the +2 step lands on 0x1E, not the 0x1D a +1 step would give').toBe(0x1e)

    const second = mod.stepFlea(first, field, ctx({ frame: 8 })).flea
    expect(second.pic, 'and back to 0x1C — a two-picture alternation').toBe(FLEA_PARK_PIC)
  })

  it('never leaves the 0x1C-0x1F picture band over a long fall', async () => {
    const mod = await loadCp32()
    const { trace } = fall(mod, stage({ v: FLEA_PARK_V - FLEA_DV_SLOW }), fieldWith(), 120)
    for (const [i, f] of trace.entries()) {
      expect(f.pic, `frame ${i}: picture stays in the flea band`).toBeGreaterThanOrEqual(FLEA_PIC_BASE)
      expect(f.pic, `frame ${i}: picture stays below the scorpion band`).toBeLessThan(FLEA_PIC_GATE)
    }
    expect(new Set(trace.map((f) => f.pic)).size, 'the picture must actually animate').toBeGreaterThan(1)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-2 — the mushroom seeding
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-2 AC-2 ANTMV — mushroom seeding cadence (:110-115)', () => {
  it('seeds NOTHING on a frame that is off the 4-frame cadence, whatever the rng says', async () => {
    const mod = await loadCp32()
    const offCadence = [1, 2, 3, 5, 6, 7, 9]
    for (const f of offCadence) {
      expect(f & FLEA_FRAME_MASK, `premise: frame ${f} is off ":111 AND I,03"`).not.toBe(0)
    }
    for (const frame of offCadence) {
      const field = fieldWith()
      const before = field.cells.slice()
      const step = mod.stepFlea(stage({ v: 0x80 }), field, ctx({ frame }))
      expect(step.seeded, `frame ${frame} is off the cadence`).toBe(false)
      expect(field.cells, `frame ${frame} must not touch the field`).toEqual(before)
    }
  })

  it('seeds only when the rng draw ALSO passes "AND I,03" — roughly one cadence frame in four', async () => {
    const mod = await loadCp32()
    let seeded = 0
    let cadence = 0
    for (let seed = 1; seed <= 240; seed++) {
      const field = fieldWith()
      const step = mod.stepFlea(stage({ v: 0x80 }), field, ctx({ frame: 4, rng: createRng(seed) }))
      cadence++
      if (step.seeded) seeded++
    }
    expect(cadence).toBe(240)
    // ":113-115 LDA RNGEN / AND I,03 / BNE 30$" — one value in four passes.
    expect(FLEA_SEED_RNG_MASK + 1, 'premise: the mask admits 1 draw in 4').toBe(4)
    // Assert a band rather than an exact count so a different-but-faithful rng
    // cursor order stays green, while a port that seeds ALWAYS (240) or NEVER
    // (0) fails hard.
    expect(seeded, 'the rng gate must actually reject some frames').toBeGreaterThan(10)
    expect(seeded, 'the rng gate must actually pass some frames').toBeLessThan(180)
  })

  it('consumes NO rng at all on an off-cadence frame — the FRAME test comes first (:110-113)', async () => {
    const mod = await loadCp32()
    // ":110-112 LDA FRAME / AND I,03 / BNE 30$" returns BEFORE ":113 LDA RNGEN".
    // If a port drew first and tested after, every off-cadence frame would burn
    // a draw and shift the whole replay cursor. Prove it by showing an
    // off-cadence step leaves the cursor able to produce the same next value.
    const rngA = createRng(99)
    mod.stepFlea(stage({ v: 0x80 }), fieldWith(), ctx({ frame: 1, rng: rngA }))
    const afterOffCadence = nextInt(rngA, 0x100)

    const rngB = createRng(99)
    const untouched = nextInt(rngB, 0x100)

    expect(afterOffCadence, 'an off-cadence frame must not consume a draw').toBe(untouched)
  })
})

describe('cp3-2 AC-2 ANTMV — where the mushroom lands (:116-122)', () => {
  it('stamps a FULL mushroom 4 pixels BEHIND the flea — "MAKE MUSHROOM APPEAR AFTER ANT"', async () => {
    const mod = await loadCp32()
    // The row is the POST-move v PLUS 4, so the mushroom appears where the flea
    // just WAS, not where it is going.
    //
    // This staging is chosen to DISCRIMINATE the lead, and the expected cell is
    // written as a LITERAL. The first version of this test did neither: it
    // derived the expected cell from the test file's own copy of
    // FLEA_SEED_V_LEAD (so it moved in lockstep with any change to it) AND it
    // staged at a post-move v of 0x7E, where lead 4 and lead 0 both land in
    // cell row 16. Zeroing the production lead left the suite green (Reviewer,
    // round 1).
    //
    // Here the flea starts at v=0x7C and steps to 0x7A, where the two candidate
    // leads separate — independently computed from OBSTAC's mapping
    // (h' = ((0xF7 - h) & 0xF8) >> 3, v' = (v + 4) >> 3):
    //   lead 4 -> row (0x7A + 4 + 4) >> 3 = 16   <- the ROM's cell
    //   lead 0 -> row (0x7A + 0 + 4) >> 3 = 15   <- one row nearer the bottom
    const EXPECTED_CELL = { h: 14, v: 16 } // hand-computed, NOT via seedCellOf
    const WRONG_CELL_IF_LEAD_ZERO = { h: 14, v: 15 }

    let placed: { field: Playfield; after: Flea } | null = null
    for (let seed = 1; seed <= 400 && !placed; seed++) {
      const field = fieldWith()
      const step = mod.stepFlea(stage({ v: 0x7c, h: 0x84 }), field, ctx({ frame: 4, rng: createRng(seed) }))
      if (step.seeded) placed = { field, after: step.flea }
    }
    expect(placed, 'no seed in 400 produced a seeding frame — the gate cannot be this tight').not.toBeNull()
    const { field, after } = placed!

    expect(after.v, 'premise: the flea stepped to the row where the two leads separate').toBe(0x7a)
    expect(cellAt(field, EXPECTED_CELL), 'the mushroom lands BEHIND the flea (lead 4)').toBe(MUSHROOM_FULL)
    expect(
      cellAt(field, WRONG_CELL_IF_LEAD_ZERO),
      'and NOT in the cell a zero lead would have stamped — this is the assertion that ' +
        'makes the 4-pixel offset observable at all',
    ).toBe(0)
    // Belt and braces: the shared helper must agree with the literal, so a
    // future change to OBSTAC's mapping cannot silently desync the two.
    expect(seedCellOf(after)).toEqual(EXPECTED_CELL)
  })

  it('bumps the lower-screen court only for a LOWER-screen cell (MUSHER :1634-1637)', async () => {
    const mod = await loadCp32()
    let lower: Playfield | null = null
    let upper: Playfield | null = null
    for (let seed = 1; seed <= 400 && !(lower && upper); seed++) {
      // A flea low on the screen seeds into the court; one high up does not.
      const lowField = fieldWith()
      const lowStep = mod.stepFlea(stage({ v: 0x30, h: 0x84 }), lowField, ctx({ frame: 4, rng: createRng(seed) }))
      if (lowStep.seeded && !lower && seedCellOf(lowStep.flea).v < MUSH_LOWER_BOUND) lower = lowField

      const highField = fieldWith()
      const highStep = mod.stepFlea(stage({ v: 0xd0, h: 0x84 }), highField, ctx({ frame: 4, rng: createRng(seed) }))
      if (highStep.seeded && !upper && seedCellOf(highStep.flea).v >= MUSH_LOWER_BOUND) upper = highField
    }
    expect(lower, 'no lower-screen seeding frame found').not.toBeNull()
    expect(upper, 'no upper-screen seeding frame found').not.toBeNull()
    expect(lower!.mush, 'a lower-screen mushroom bumps the court').toBe(1)
    expect(upper!.mush, 'an upper-screen mushroom does NOT').toBe(0)
  })

  it('refuses to overwrite an OCCUPIED cell, and does not double-count it (:1617-1618)', async () => {
    const mod = await loadCp32()
    for (let seed = 1; seed <= 400; seed++) {
      const probe = fieldWith()
      const step = mod.stepFlea(stage({ v: 0x30, h: 0x84 }), probe, ctx({ frame: 4, rng: createRng(seed) }))
      if (!step.seeded) continue

      // Re-run the identical frame against a board that already holds a
      // DAMAGED mushroom in the target cell. MUSHER returns early, so the cell
      // must keep its damage and the court must not move.
      const cell = seedCellOf(step.flea)
      const occupied = fieldWith([{ h: cell.h, v: cell.v, code: MUSHROOM_FULL - 1 }])
      occupied.mush = 3
      const again = mod.stepFlea(stage({ v: 0x30, h: 0x84 }), occupied, ctx({ frame: 4, rng: createRng(seed) }))
      expect(cellAt(occupied, cell), 'an occupied cell is left alone, not healed to full').toBe(MUSHROOM_FULL - 1)
      expect(occupied.mush, 'and the court is not double-counted').toBe(3)
      expect(again.seeded, 'a blocked write is not a seeding').toBe(false)
      return
    }
    throw new Error('no seeding frame found to test the occupied-cell guard')
  })

  it('never stamps a mushroom on MUSHER\'s reserved rows 0, 1 or 0x1F (:1620-1633)', async () => {
    const mod = await loadCp32()
    // The flea descends all the way to v=4, so unlike cp1-4's seeding walk it
    // genuinely REACHES the player's own row. Sweep a long fall and assert no
    // reserved row was ever stamped.
    const field = fieldWith()
    for (let seed = 1; seed <= 40; seed++) {
      let flea = stage({ v: FLEA_PARK_V - FLEA_DV_SLOW, h: 0x84 })
      const rng = createRng(seed)
      for (let frame = 0; frame < 200; frame++) {
        flea = mod.stepFlea(flea, field, ctx({ frame, rng })).flea
      }
    }
    for (const row of MUSHER_RESERVED_ROWS) {
      for (let h = 0; h < PLYFLD_WIDTH; h++) {
        expect(field.cells[h * PLYFLD_STRIDE + row], `reserved row ${row}, column ${h} must stay empty`).toBe(0)
      }
    }
  })

  it('keeps every stamped cell inside the grid', async () => {
    const mod = await loadCp32()
    const field = fieldWith()
    let flea = stage({ v: FLEA_PARK_V - FLEA_DV_SLOW, h: 0x84 })
    const rng = createRng(5)
    for (let frame = 0; frame < 400; frame++) flea = mod.stepFlea(flea, field, ctx({ frame, rng })).flea
    expect(field.cells.length).toBe(PLYFLD_WIDTH * PLYFLD_HEIGHT)
    // A stray write outside the grid would either throw or silently corrupt a
    // neighbouring column; assert the shape survived and something landed.
    expect(field.cells.some((c) => c === MUSHROOM_FULL), 'the long fall must have seeded something').toBe(true)
  })
})

describe('cp3-2 AC-2 — determinism: the seeded rng is the ONLY entropy', () => {
  it('replays an identical fall from the same seed — cells, court and path all match', async () => {
    const mod = await loadCp32()
    const run = (seed: number) => {
      const field = fieldWith()
      let flea = stage({ v: FLEA_PARK_V - FLEA_DV_SLOW, h: 0x84 })
      const rng = createRng(seed)
      const path: number[] = []
      for (let frame = 0; frame < 300; frame++) {
        flea = mod.stepFlea(flea, field, ctx({ frame, rng })).flea
        path.push(flea.v, flea.h, flea.pic)
      }
      return { cells: Array.from(field.cells), mush: field.mush, path }
    }
    const a = run(1234)
    const b = run(1234)
    expect(b.cells).toEqual(a.cells)
    expect(b.mush).toBe(a.mush)
    expect(b.path).toEqual(a.path)

    // LIVENESS — without this the test passes against a flea that seeds nothing
    // and never moves, which is the whole failure mode "it's deterministic" is
    // famous for hiding.
    expect(a.cells.some((c) => c === MUSHROOM_FULL), 'the replayed fall must actually seed mushrooms').toBe(true)
    expect(new Set(a.path).size, 'the replayed fall must actually move').toBeGreaterThan(3)
  })

  it('DIVERGES on a different seed — proving the replay is not just a constant', async () => {
    const mod = await loadCp32()
    const run = (seed: number) => {
      const field = fieldWith()
      let flea = stage({ v: FLEA_PARK_V - FLEA_DV_SLOW, h: 0x84 })
      const rng = createRng(seed)
      for (let frame = 0; frame < 300; frame++) flea = mod.stepFlea(flea, field, ctx({ frame, rng })).flea
      return Array.from(field.cells).join(',')
    }
    // A hard-coded seeding pattern would satisfy the replay test above; only a
    // real rng consumer can differ here.
    const seeds = [1, 2, 3, 4, 5, 6].map(run)
    expect(new Set(seeds).size, 'different seeds must produce different boards').toBeGreaterThan(1)
  })

  it('draws its column through the shared seeded rng, never an ambient source', async () => {
    const mod = await loadCp32()
    // Two fleas built from equal-seeded cursors must agree; the purity sweep in
    // tests/purity.test.ts separately bans Math.random from src/core.
    expect(mod.createFlea(createRng(42), 0)).toEqual(mod.createFlea(createRng(42), 0))
    const columns = new Set([7, 8, 9, 10].map((s) => mod.createFlea(createRng(s), 0).h))
    expect(columns.size, 'different cursors must reach different columns').toBeGreaterThan(1)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-3 — SHOOT: two hits, with a speed-up between them
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-2 AC-3 SHOOT — the flea takes TWO hits (:2217-2224)', () => {
  const onTarget = (flea: Flea): Shot => ({ h: flea.h, v: flea.v, live: true })

  it('the FIRST hit does not kill: it speeds the flea to 4, scores nothing, and eats the shot', async () => {
    const mod = await loadCp32()
    const flea = stage({ v: 0x60, dv: FLEA_DV_SLOW })
    const res = mod.resolveFleaShotHit(onTarget(flea), flea)

    expect(res.hit, 'the shot connects').toBe(true)
    expect(res.scored, 'a first hit awards NOTHING — 108$ jumps past SCORN1 (:2224/:2169)').toBe(0)
    expect(res.flea.dv, '":2223 STA ANTDV ;SPEED UP ON FIRST HIT"').toBe(FLEA_FAST_DV)
    expect(res.flea.pic, 'the flea is not exploding yet').toBeLessThan(FLEA_PIC_GATE)
    expect(res.shot.live, 'the shot is consumed either way (:2303 RSHOT)').toBe(false)
  })

  it('the SECOND hit kills: 200 points and the explosion picture (:2219/:2296-2302)', async () => {
    const mod = await loadCp32()
    const fast = stage({ v: 0x60, dv: FLEA_FAST_DV }) // already hit once
    const res = mod.resolveFleaShotHit(onTarget(fast), fast)

    expect(res.hit).toBe(true)
    expect(res.scored, '":2219 LDY I,2 ;200 POINTS FOR ANT" — rev-4 CONFIRMS CENTIP.DOC:115').toBe(FLEA_SCORE)
    expect(res.flea.pic, 'the slot flips to the explosion picture').toBe(FLEA_EXPLODE_PIC)
    expect(res.shot.live).toBe(false)
  })

  it('takes exactly two shots end to end — not one, and not three', async () => {
    const mod = await loadCp32()
    let flea = stage({ v: 0x60, dv: FLEA_DV_SLOW })
    let total = 0

    const first = mod.resolveFleaShotHit(onTarget(flea), flea)
    flea = first.flea
    total += first.scored
    expect(flea.pic, 'still alive after one hit').toBeLessThan(FLEA_PIC_GATE)

    const second = mod.resolveFleaShotHit(onTarget(flea), flea)
    flea = second.flea
    total += second.scored

    expect(flea.pic, 'dead after two').toBe(FLEA_EXPLODE_PIC)
    expect(total, 'and the whole kill is worth 200, awarded once').toBe(FLEA_SCORE)
  })

  it('a flea that starts FAST from the 60K speed-up still needs two hits', async () => {
    const mod = await loadCp32()
    // ANTPC's 60K speed is 3, and the kill test compares against 4 (":2220-2222
    // LDA I,4 / CMP ANTDV / BEQ"). A port that treated "fast" as "already hit"
    // would kill a fresh 60K flea in ONE shot.
    const flea = stage({ v: 0x60, dv: FLEA_DV_FAST })
    const res = mod.resolveFleaShotHit(onTarget(flea), flea)
    expect(res.scored, 'a fresh 60K flea scores nothing on the first hit').toBe(0)
    expect(res.flea.pic, 'and does not explode').toBeLessThan(FLEA_PIC_GATE)
    expect(res.flea.dv, 'it is promoted from 3 to 4').toBe(FLEA_FAST_DV)
  })
})

describe('cp3-2 AC-3 SHOOT — the V window WIDENS once the flea is fast (:2194-2202)', () => {
  it('misses a SLOW flea at a distance that HITS a fast one — the dual-rate probe', async () => {
    const mod = await loadCp32()
    // ":2196 CMP I,4 / BCC 12$ ;NOT FAST ANT" selects the window:
    //   ANTDV <  4 -> ":2202 CPY I,5" -> |dV| < 5
    //   ANTDV >= 4 -> ":2198 CPY I,7" -> |dV| < 7
    // Probe at a distance INSIDE the wide window and OUTSIDE the narrow one.
    const gap = FLEA_HIT_V_WINDOW // 5: outside "< 5", inside "< 7"
    expect(gap, 'premise: the probe distance must discriminate the two windows').toBeGreaterThanOrEqual(
      FLEA_HIT_V_WINDOW,
    )
    expect(gap).toBeLessThan(FLEA_HIT_V_WINDOW_FAST)

    const slow = stage({ v: 0x60, dv: FLEA_DV_SLOW })
    const fast = stage({ v: 0x60, dv: FLEA_FAST_DV })
    const shotAt = (f: Flea): Shot => ({ h: f.h, v: f.v - gap, live: true })

    expect(mod.resolveFleaShotHit(shotAt(slow), slow).hit, `a SLOW flea is missed at dV=${gap}`).toBe(false)
    expect(mod.resolveFleaShotHit(shotAt(fast), fast).hit, `a FAST flea is HIT at dV=${gap}`).toBe(true)
  })

  it('both windows still reject a shot beyond the WIDE bound', async () => {
    const mod = await loadCp32()
    const gap = FLEA_HIT_V_WINDOW_FAST // 7 — outside both
    for (const dv of [FLEA_DV_SLOW, FLEA_DV_FAST, FLEA_FAST_DV]) {
      const flea = stage({ v: 0x60, dv })
      const shot: Shot = { h: flea.h, v: flea.v - gap, live: true }
      expect(mod.resolveFleaShotHit(shot, flea).hit, `dv=${dv} must miss at dV=${gap}`).toBe(false)
    }
  })

  it('both windows accept a dead-centre shot — the widening is not a blanket miss', async () => {
    const mod = await loadCp32()
    for (const dv of [FLEA_DV_SLOW, FLEA_DV_FAST, FLEA_FAST_DV]) {
      const flea = stage({ v: 0x60, dv })
      expect(mod.resolveFleaShotHit({ h: flea.h, v: flea.v, live: true }, flea).hit, `dv=${dv} centre hit`).toBe(
        true,
      )
    }
  })

  it('the widening keys on ANTDV, NOT on the score — a 60K flea keeps the NARROW window', async () => {
    const mod = await loadCp32()
    // dv=3 is ANTPC's 60K speed. It is fast on the screen but still below the
    // ":2196 CMP I,4" gate, so its hitbox must stay narrow.
    const sixtyK = stage({ v: 0x60, dv: FLEA_DV_FAST })
    const shot: Shot = { h: sixtyK.h, v: sixtyK.v - FLEA_HIT_V_WINDOW, live: true }
    expect(mod.resolveFleaShotHit(shot, sixtyK).hit, 'dv=3 must use the narrow window').toBe(false)
  })
})

describe('cp3-2 AC-3 SHOOT — the H window and the guards (:2180-2218)', () => {
  it('uses an H window of 6, and rejects one pixel past it (:2217)', async () => {
    const mod = await loadCp32()
    const flea = stage({ v: 0x60, dv: FLEA_DV_SLOW })
    const inside: Shot = { h: flea.h + FLEA_HIT_H_WINDOW - 1, v: flea.v, live: true }
    const outside: Shot = { h: flea.h + FLEA_HIT_H_WINDOW, v: flea.v, live: true }
    expect(mod.resolveFleaShotHit(inside, flea).hit, `|dH| = ${FLEA_HIT_H_WINDOW - 1} hits`).toBe(true)
    expect(mod.resolveFleaShotHit(outside, flea).hit, `|dH| = ${FLEA_HIT_H_WINDOW} misses`).toBe(false)
  })

  it('is symmetric about the flea — the window is an absolute value (:2204-2207 ABS)', async () => {
    const mod = await loadCp32()
    const flea = stage({ v: 0x60, dv: FLEA_DV_SLOW })
    for (const d of [-(FLEA_HIT_H_WINDOW - 1), FLEA_HIT_H_WINDOW - 1]) {
      expect(mod.resolveFleaShotHit({ h: flea.h + d, v: flea.v, live: true }, flea).hit, `dH=${d}`).toBe(true)
    }
    for (const d of [-FLEA_HIT_H_WINDOW, FLEA_HIT_H_WINDOW]) {
      expect(mod.resolveFleaShotHit({ h: flea.h + d, v: flea.v, live: true }, flea).hit, `dH=${d}`).toBe(false)
    }
  })

  it('cannot hit a PARKED flea sitting off the top of the screen (:2180-2182)', async () => {
    const mod = await loadCp32()
    const parked = stage({ v: FLEA_PARK_V })
    expect(SHOT_TOP_SKIP, 'premise: the park sits exactly on the off-top guard').toBe(FLEA_PARK_V)
    expect(mod.resolveFleaShotHit({ h: parked.h, v: parked.v, live: true }, parked).hit).toBe(false)
  })

  it('cannot hit an EXPLODING flea, nor a slot holding a scorpion picture (:2190-2193)', async () => {
    const mod = await loadCp32()
    for (const pic of [FLEA_EXPLODE_PIC, FLEA_EXPLODE_DONE, 0x30, FLEA_PIC_GATE]) {
      const flea = stage({ v: 0x60, pic })
      expect(
        mod.resolveFleaShotHit({ h: flea.h, v: flea.v, live: true }, flea).hit,
        `picture 0x${pic.toString(16)} is not a shootable flea`,
      ).toBe(false)
    }
  })

  it('a resting shot never hits, and scores nothing', async () => {
    const mod = await loadCp32()
    const flea = stage({ v: 0x60 })
    const res = mod.resolveFleaShotHit({ h: flea.h, v: flea.v, live: false }, flea)
    expect(res.hit).toBe(false)
    expect(res.scored).toBe(0)
    expect(res.flea.dv, 'a dead shot must not speed the flea up either').toBe(flea.dv)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-3 — the explosion and the SCORP revival
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-2 AC-3 EXPLOD — the flea explosion counts down, then SCORP re-parks it', () => {
  it('counts the explosion picture down one per frame (:963-970)', async () => {
    const mod = await loadCp32()
    let flea = stage({ v: 0x60, pic: FLEA_EXPLODE_PIC })
    for (let expected = FLEA_EXPLODE_PIC - 1; expected >= FLEA_EXPLODE_DONE; expected--) {
      flea = mod.stepFleaExplosion(flea, createRng(1), 0)
      expect(flea.pic, 'each frame steps one picture down').toBe(expected)
      if (flea.pic === FLEA_EXPLODE_DONE) break
    }
    expect(flea.pic).toBe(FLEA_EXPLODE_DONE)
  })

  it('re-parks the flea through ANTPC once the explosion is SPENT (:2072-2075)', async () => {
    const mod = await loadCp32()
    // ":2073-2074 CMP I,0FA / BCS 90$ ;KEEP EXPLOSION GOING" — at 0xF9 the
    // explosion is below 0xFA, so SCORP falls through to ":2075 JMP ANTPC".
    const spent = stage({ v: 0x60, pic: FLEA_EXPLODE_DONE })
    const revived = mod.stepFleaExplosion(spent, createRng(3), 0)
    expect(revived.pic, 'the slot comes back as a fresh parked flea').toBe(FLEA_PARK_PIC)
    expect(revived.v, 'parked at the top again').toBe(FLEA_PARK_V)
    expect(revived.dv, 'with a freshly picked descent speed').toBe(FLEA_DV_SLOW)
  })

  it('a killed flea COMES BACK — without the SCORP branch it would be gone for the game', async () => {
    const mod = await loadCp32()
    // The regression this guards is total: EXPLOD stops at 0xF9 and ANTMV
    // refuses any picture >= 0x20, so a missing revival strands slot 12 forever.
    let flea = stage({ v: 0x60, dv: FLEA_DV_SLOW })
    flea = mod.resolveFleaShotHit({ h: flea.h, v: flea.v, live: true }, flea).flea // hit 1
    flea = mod.resolveFleaShotHit({ h: flea.h, v: flea.v, live: true }, flea).flea // hit 2 -> boom
    expect(flea.pic).toBe(FLEA_EXPLODE_PIC)

    for (let i = 0; i < 32 && flea.pic !== FLEA_PARK_PIC; i++) {
      flea = mod.stepFleaExplosion(flea, createRng(1), 0)
    }
    expect(flea.pic, 'the flea must be alive again within the explosion window').toBe(FLEA_PARK_PIC)
    expect(flea.dv, 'and its post-hit speed-up must be cleared by ANTPC').toBe(FLEA_DV_SLOW)
  })

  it('leaves a LIVE flea completely alone (:965-966)', async () => {
    const mod = await loadCp32()
    const alive = stage({ v: 0x60, pic: FLEA_PARK_PIC })
    expect(mod.stepFleaExplosion(alive, createRng(1), 0)).toEqual(alive)
  })

  it('keeps the explosion going while the picture is still at or above 0xFA (:2073-2074)', async () => {
    const mod = await loadCp32()
    const mid = stage({ v: 0x60, pic: FLEA_REVIVE_BELOW })
    const next = mod.stepFleaExplosion(mid, createRng(1), 0)
    expect(next.pic, '0xFA still counts down rather than reviving').toBe(FLEA_REVIVE_BELOW - 1)
    expect(next.v, 'and the slot is not re-parked yet').toBe(0x60)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-4 — PLAY: the flea kills the player through the SHARED chain
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-2 AC-4 PLAY — the flea uses the SEGMENT windows, not the spider\'s (:1779-1799)', () => {
  const gun = { h: 0x80, v: 0x10 }

  it('kills the player on contact', async () => {
    const mod = await loadCp32()
    expect(mod.checkPlayerContact([], gun, null, stage({ h: gun.h, v: gun.v }))).toBe(true)
  })

  it('collides out to |dH| < 7 — and NOT to the spider\'s 10 (:1785 vs :1781)', async () => {
    const mod = await loadCp32()
    const inside = stage({ h: gun.h + SEG_PLAY_H_WINDOW - 1, v: gun.v })
    const outside = stage({ h: gun.h + SEG_PLAY_H_WINDOW, v: gun.v })
    expect(mod.checkPlayerContact([], gun, null, inside), '|dH| = 6 hits').toBe(true)
    expect(mod.checkPlayerContact([], gun, null, outside), '|dH| = 7 misses').toBe(false)

    // The discriminating case: a distance the SPIDER would collide at but a
    // flea must not. PLAY branches on the SLOT (":1779 CPX I,13."), and ANTMV
    // calls it with slot 12 (":107 LDX I,12."), so the flea takes the default
    // segment window. A port that routed the flea through slot 13's window
    // would return true here.
    expect(FLEA_PLAY_SLOT, 'premise: ANTMV calls PLAY with DECIMAL slot 12').toBe(12)
    const spiderOnly = stage({ h: gun.h + SPIDER_PLAY_H_WINDOW - 1, v: gun.v })
    expect(
      mod.checkPlayerContact([], gun, null, spiderOnly),
      'the flea is slot 12 and must NOT get the spider\'s wider box',
    ).toBe(false)
  })

  it('shares the V window of 7 (:1792)', async () => {
    const mod = await loadCp32()
    expect(mod.checkPlayerContact([], gun, null, stage({ h: gun.h, v: gun.v + SEG_PLAY_V_WINDOW - 1 }))).toBe(true)
    expect(mod.checkPlayerContact([], gun, null, stage({ h: gun.h, v: gun.v + SEG_PLAY_V_WINDOW }))).toBe(false)
  })

  it('uses the segment DIAMOND bound of 0x0C, not the spider\'s 14 (:1798 vs :1822)', async () => {
    const mod = await loadCp32()
    // Pick a diagonal inside both axis windows whose SUM crosses the bound:
    // dH=6, dV=6 -> sum 12 == 0x0C, which the ROM rejects (BCS).
    const corner = stage({ h: gun.h + 6, v: gun.v + 6 })
    expect(6 + 6, 'premise: the corner sits exactly on the segment bound').toBe(SEG_PLAY_SUM_WINDOW)
    expect(mod.checkPlayerContact([], gun, null, corner), 'sum == 0x0C is NOT a hit').toBe(false)

    const justInside = stage({ h: gun.h + 6, v: gun.v + 5 })
    expect(mod.checkPlayerContact([], gun, null, justInside), 'sum == 11 IS a hit').toBe(true)
  })

  it('ignores an exploding or parked flea', async () => {
    const mod = await loadCp32()
    for (const pic of [FLEA_EXPLODE_PIC, FLEA_EXPLODE_DONE]) {
      expect(
        mod.checkPlayerContact([], gun, null, stage({ h: gun.h, v: gun.v, pic })),
        `picture 0x${pic.toString(16)} must not kill the player`,
      ).toBe(false)
    }
    expect(
      mod.checkPlayerContact([], gun, null, stage({ h: gun.h, v: FLEA_PARK_V })),
      'a parked flea is nowhere near the gun',
    ).toBe(false)
  })

  it('leaves the earlier arities EXACTLY as cp2-5 and cp3-1 pinned them (regression guard)', async () => {
    const mod = await loadCp32()
    const seg: Segment = { h: gun.h, v: gun.v, dh: 2, dv: 2, pic: 0x03 }
    expect(mod.checkPlayerContact([seg], gun), 'the 2-arg segment form still works').toBe(true)
    expect(mod.checkPlayerContact([], gun), 'an empty board is still safe').toBe(false)
    expect(mod.checkPlayerContact([], gun, null), 'the 3-arg spider form still works').toBe(false)
    expect(mod.checkPlayerContact([], gun, null, null), 'an absent flea is safe').toBe(false)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-5 — OVRLAP: the spider's scan must now include the flea slot
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-2 AC-5 OVRLAP — the spider bounces off the FLEA (:1749 "LDY I,12.")', () => {
  it('spider.ts no longer declares the flea slot out of scope', async () => {
    // cp3-1 shipped with an explicit comment saying the scan covers only the 12
    // centipede segments "until cp3-2". This story is cp3-2: the source must no
    // longer say the flea is excluded. A source-text check is the honest probe
    // here because the exclusion was documented, not encoded as a constant.
    const src = readFileSync(join(repoRoot, 'src', 'core', 'spider.ts'), 'utf8')
    expect(
      /flea does not exist until cp3-2/.test(src),
      'spider.ts still carries cp3-1\'s "the flea does not exist until cp3-2" note',
    ).toBe(false)
  })

  it('reverses the spider\'s dv when a LIVE flea shares its exact row', async () => {
    await loadCp32()
    const spiderMod = (await import('../src/core/spider')) as Record<string, unknown>
    const stepSpider = spiderMod.stepSpider as (
      spider: Record<string, number>,
      field: Playfield,
      segs: Segment[],
      c: Record<string, unknown>,
    ) => { spider: { dv: number } }

    const spider = { h: 0x80, v: 0x40, dh: 2, dv: 2, pic: 0x14, count2: 0x30, count: 0, oldDh: 2, pts: 0xb6 }
    // The step happens BEFORE OVRLAP (cp3-1's ordering), so the flea must sit on
    // the row the spider MOVES TO: v - dv.
    const row = spider.v - spider.dv
    const flea = stage({ h: spider.h + 4, v: row })

    const withFlea = stepSpider(spider, fieldWith(), [], {
      frame: 1,
      score: 0,
      rng: createRng(1),
      flea,
    })
    const withoutFlea = stepSpider(spider, fieldWith(), [], { frame: 1, score: 0, rng: createRng(1) })

    expect(withoutFlea.spider.dv, 'premise: with no flea the spider keeps its dv').toBe(spider.dv)
    expect(withFlea.spider.dv, 'a flea on the row must turn the spider around').toBe(-spider.dv)
  })

  it('ignores a flea on a DIFFERENT row, and an EXPLODING one (:1750-1755)', async () => {
    await loadCp32()
    const spiderMod = (await import('../src/core/spider')) as Record<string, unknown>
    const stepSpider = spiderMod.stepSpider as (
      spider: Record<string, number>,
      field: Playfield,
      segs: Segment[],
      c: Record<string, unknown>,
    ) => { spider: { dv: number } }

    const spider = { h: 0x80, v: 0x40, dh: 2, dv: 2, pic: 0x14, count2: 0x30, count: 0, oldDh: 2, pts: 0xb6 }
    const row = spider.v - spider.dv

    const offRow = stepSpider(spider, fieldWith(), [], {
      frame: 1,
      score: 0,
      rng: createRng(1),
      flea: stage({ h: spider.h + 4, v: row + 8 }),
    })
    expect(offRow.spider.dv, 'OVRLAP needs an EXACT row match').toBe(spider.dv)

    const exploding = stepSpider(spider, fieldWith(), [], {
      frame: 1,
      score: 0,
      rng: createRng(1),
      flea: stage({ h: spider.h + 4, v: row, pic: FLEA_EXPLODE_PIC }),
    })
    expect(exploding.spider.dv, 'a dead/exploding flea is not an obstacle').toBe(spider.dv)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-1/AC-4 — the sim wiring and the mainloop ORDER
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-2 — the sim carries the flea and runs it in the ROM\'s mainloop slot', () => {
  it('createSim seeds a parked flea, as INIT does at :1200', async () => {
    await loadCp32()
    const sim = (await import('../src/core/sim')) as Record<string, unknown>
    const createSim = sim.createSim as (seed: number) => Record<string, unknown>
    const state = createSim(1)
    const flea = state.flea as Flea | undefined
    expect(flea, 'SimState must carry a flea — INIT calls ANTPC (:1200)').toBeDefined()
    expect(flea!.v, 'and it starts parked').toBe(FLEA_PARK_V)
    expect(flea!.pic).toBe(FLEA_PARK_PIC)
  })

  it('cloneState deep-copies the flea — an aliased slot would couple a replay', async () => {
    await loadCp32()
    const sim = (await import('../src/core/sim')) as Record<string, unknown>
    const createSim = sim.createSim as (seed: number) => Record<string, unknown>
    const cloneState = sim.cloneState as (s: Record<string, unknown>) => Record<string, unknown>
    const state = createSim(1)
    const copy = cloneState(state)
    expect(copy.flea, 'the clone carries the same values').toEqual(state.flea)
    expect(copy.flea, 'but is a DISTINCT object').not.toBe(state.flea)
  })

  it('SHOOT runs BEFORE ANTMV, so a shot meets the flea at its PRE-move position (:34 vs :37)', async () => {
    await loadCp32()
    const sim = (await import('../src/core/sim')) as Record<string, unknown>
    const createSim = sim.createSim as (seed: number) => Record<string, unknown>
    const stepSim = sim.stepSim as (s: Record<string, unknown>, i: unknown) => Record<string, unknown>

    // BEHAVIOURAL, not source-text. The first version of this test compared
    // `src.indexOf('resolveFleaShotHit')` against `src.indexOf('stepFlea(')`,
    // but the first of those matched the IMPORT statement near the top of
    // sim.ts rather than the call site — so it compared "import < call" and
    // could never fail. Inverting the real frame order left the whole suite
    // green (Reviewer, round 1). This version drives the sim instead.
    //
    // Staging: the shot advances +7 in stepShot (:2137-2142) BEFORE the flea
    // branch runs, so a shot placed 3 BELOW the flea arrives 4 ABOVE it — a
    // distance of 4, inside the slow flea's V window of 5. Stepping the flea
    // FIRST would move it 2 further away, to 6, which is outside. So:
    //   SHOOT then ANTMV (the ROM)  -> distance 4 -> HIT  (dv promoted to 4)
    //   ANTMV then SHOOT (inverted) -> distance 6 -> MISS (dv stays 2)
    // Verified against both orderings before being written.
    const base = createSim(1)
    const staged = {
      ...base,
      playfield: createPlayfield(), // empty: nothing else may consume the shot
      segs: (base.segs as Segment[]).map((s) => ({ ...s, pic: 0x80 })), // all vacant
      spider: { ...(base.spider as Record<string, unknown>), pic: 0xf8 }, // parked, unshootable
      flea: stage({ h: 0x84, v: 0x60, dv: FLEA_DV_SLOW }),
      shot: { h: 0x84, v: 0x60 - 3, live: true },
      centin: FLEA_CENTIN_GATE - 1,
    }
    // cp2-15 repair: this used to pass `{ left, right }` — not InputCounts —
    // so movePlayer produced a NaN-positioned gun, and NaN & 0xff = 0 made
    // byteDistance read EVERY object as touching the player. Once cp2-15 moved
    // PLAY ahead of SHOOT, that phantom contact blanked the shot before the
    // flea could take its hit. The real input shape keeps the gun at its boot
    // position, far from this staging, which is what the test always intended.
    const next = stepSim(staged, { dh: 0, dv: 0, fire: false })
    const after = next.flea as Flea

    expect(
      after.dv,
      'the shot must meet the flea where it moved FROM (:34 SHOOT precedes :37 ANTMV) — ' +
        'a flea stepped before the shot is resolved is 2px further away and survives',
    ).toBe(FLEA_FAST_DV)

    // A second, independent consequence of the same ordering: SHOOT stores
    // ANTDV=4 at :2223 and ANTMV subtracts ANTDV at :102 three mainloop calls
    // later, so the speed-up applies on the SAME frame as the hit — the flea
    // drops 4 that frame, not the 2 it entered with. (Asserting 2 here fails,
    // which is how this was discovered; the ROM order was checked before the
    // expectation was changed.)
    expect(
      after.v,
      'the hit frame ALSO descends at the new speed — :2223 writes ANTDV before :102 reads it',
    ).toBe(0x60 - FLEA_FAST_DV)
  })

  it('the spider keeps the OPPOSITE order — this is a per-creature fact, not a global one', async () => {
    await loadCp32()
    const src = readFileSync(join(repoRoot, 'src', 'core', 'sim.ts'), 'utf8')
    // A cheap companion to the behavioural test above: the two creatures must
    // NOT share an ordering. BUGMV (:33) precedes SHOOT (:34); ANTMV (:37)
    // follows it. Anchored to the CALL sites (trailing paren), never to the
    // bare symbol — the bare symbol also appears in the import block.
    const spiderStep = src.indexOf('stepSpider(')
    const spiderShot = src.indexOf('resolveSpiderShotHit(')
    const fleaShot = src.indexOf('resolveFleaShotHit(')
    const fleaStep = src.indexOf('stepFlea(')
    for (const [name, idx] of [
      ['stepSpider(', spiderStep],
      ['resolveSpiderShotHit(', spiderShot],
      ['resolveFleaShotHit(', fleaShot],
      ['stepFlea(', fleaStep],
    ] as const) {
      expect(idx, `sim.ts must contain a call to ${name}`).toBeGreaterThan(-1)
    }
    expect(spiderStep, 'the spider MOVES before its shot is resolved (:33 before :34)').toBeLessThan(spiderShot)
    expect(fleaShot, 'the flea is SHOT before it moves (:34 before :37)').toBeLessThan(fleaStep)
  })

  it('a flea reaching the gun runs the SAME death transition a segment does', async () => {
    await loadCp32()
    const sim = (await import('../src/core/sim')) as Record<string, unknown>
    const createSim = sim.createSim as (seed: number) => Record<string, unknown>
    const stepSim = sim.stepSim as (s: Record<string, unknown>, i: unknown) => Record<string, unknown>
    const DEATH_DELAY = sim.DEATH_DELAY as number
    const PLAYER_EXPLODE_START = sim.PLAYER_EXPLODE_START as number

    const base = createSim(1)
    const player = base.player as { h: number; v: number }
    // Park the centipede out of the way and drop the flea onto the gun.
    const staged = {
      ...base,
      segs: (base.segs as Segment[]).map((s) => ({ ...s, pic: 0x80 })),
      flea: stage({ h: player.h, v: player.v }),
    }
    // cp2-15 repair: same `{ left, right }` malformed-input fix as above — the
    // NaN gun used to make this pass for ANY flea position; with the real
    // input shape the pass is earned by the flea actually sitting on the gun.
    const next = stepSim(staged, { dh: 0, dv: 0, fire: false })

    expect(next.delay, 'the flea death arms the SAME DEATH_DELAY pause').toBe(DEATH_DELAY)
    expect(next.playerExplode, 'and the SAME player-explosion picture').toBe(PLAYER_EXPLODE_START)
  })
})
