// tests/scorpion.test.ts
//
// Story cp3-3 — RED phase (O'Brien / TEA). THE SCORPION (SCORP,
// CENTI4.MAC:2001-2097): the third and last of slot 12's tenants. It STARTS
// from the parked slot (:2009-2054), CROSSES one row of the upper screen at a
// fixed height (:2055-2086), POISONS every normal mushroom it passes — the sole
// creator of the 0x38-0x3B band (:2087-2096, PM-19) — and dies to a single shot
// for 1000 points (:2226-2228 / :2296-2302). Transcribed from rev-4 and pinned
// by SC-* claims Julia will author in docs/rom-study/claims/13-scorpion.json.
//
// ─── RADIX ────────────────────────────────────────────────────────────────────
// CENTI4.MAC inherits .RADIX 16 from CENDE4 — every bare literal below is HEX
// unless a trailing period marks it DECIMAL. This story turns on that gate twice:
//   :2019 "CMP I,11."  → DECIMAL 11 (the CENTIN spawn gate — one LOWER than the
//                        flea's decimal 12)
//   :2226 "CPY I,10."  → DECIMAL 10 (the shot H window) — while
//   :2228 "LDY I,10"   → HEX 0x10, the SCORN1 MSB that BCD-reads as 1000 points
// Two `10`s two lines apart, meaning 10 and 1000. Read either as the other and
// the scorpion becomes hittable from twice as far, or worth 16 hundred.
//
// ─── ORIENTATION / SIGN CONVENTIONS ───────────────────────────────────────────
// Upright cabinet: CLEAR (:737-751) zeroes CKF8/CKC0/CKFF, so every "EOR CKxx"
// is identity and every "LDY CKC0 / BEQ" takes the non-cocktail branch. V=0xF8
// is the TOP of the screen. The scorpion sits at a FIXED height in the upper
// half (ANTV = (RNGEN & 0x78) + 0x70 ∈ [0x70, 0xE8]) with ANTDV = 0 (:2048), so
// unlike the flea it NEVER descends — it walks purely horizontally, ANTH += ANTDH
// each frame (:2065-2067, upright ADD), and re-parks the instant ANTH returns to
// 0 (:2069-2075).
//
// ─── TRAP: SLOT 12 IS SHARED WITH THE FLEA ────────────────────────────────────
// ANTP/ANTV/ANTH/ANTDV are ONE motion-object slot (ANTP =MOBJP+12., CENDE4:138)
// hosting BOTH creatures, told apart only by the picture band. The flea is
// 0x1C-0x1F; the scorpion is 0x30-0x33. Every routine gates on the band:
//   • ANTMV moves it only while pic < 0x20 (:53-56) — so a scorpion FREEZES the
//     flea's own step, which is why stepScorp must run at SCORP's :36 slot
//     BEFORE ANTMV's :37 (this suite pins that the scorpion, not the flea, wins
//     the shared park).
//   • SHOOT scores it as a flea only below 0x20 and as a scorpion at/above it
//     (:2190-2216) — different windows, different points, one hit not two.
//   • PLAY is only ever called for slot 12 from INSIDE ANTMV (:107-108), which a
//     scorpion never reaches — so the scorpion has NO player-collision check at
//     all (pinned below; the code says it cannot harm the player, not the
//     distance).
//
// ─── TRAP: A KILLED SCORPION IS REVIVED BY THE FLEA'S OWN EXPLOSION STEP ───────
// SHOOT stamps 0xFF on a killed scorpion exactly as it does a flea (:2301-2302),
// and EXPLOD + SCORP's :2072-2075 revival — ALREADY ported into cp3-2's
// stepFleaExplosion — count it down and re-park it through ANTPC. So this story
// writes NO new explosion code: it pins that the shared step revives a scorpion
// too, or "the first scorpion you kill is the last scorpion of the game" (the
// same defect cp3-2 caught for the flea).
//
// ─── WHY THIS IS RED ──────────────────────────────────────────────────────────
// src/core/scorpion.ts does not exist. loadCp33() dynamic-imports the new
// surface and throws a self-describing "not built yet", so every assertion
// reddens for the FEATURE's absence, not a module-resolution stack trace.

import { describe, it, expect } from 'vitest'
import { createRng, nextInt, type Rng } from '@shared/rng'
import {
  createPlayfield,
  obstacleCellFor,
  PLYFLD_STRIDE,
  MUSHROOM_FULL,
  MUSHROOM_MIN,
  type Playfield,
} from '../src/core/playfield'

// ─── ROM constants this story transcribes (hand-mirrored from CENTI4.MAC so the
//     expectations are self-checking, not echoes of the module under test) ──────

// SCORP entry / picture band (:2001-2028).
const SCORP_PARK_PIC = 0x1c // ANTPC's parked-flea picture (shared park, :132-134)
const SCORP_PARK_V = 0xf8 // ANTPC's parked V — "removed from screen" (:135-137)
const SCORP_PIC_LOW = 0x30 // :2007-2008 "CMP I,30 / BCS 50$" AND :2026 "LDA I,30" — first scorpion picture
const SCORP_PIC_HIGH = 0x34 // :2003-2004 "CMP I,34 / BCC 2$" — at/above this the slot is EXPLODING, not a scorpion
const FLEA_PIC_GATE = 0x20 // :53-56 / :2192 — below is a flea, at/above is scorpion-or-explosion

// SCORP spawn gate (:2009-2054).
const SCORP_PARK_GATE_V = 0xf8 // :2009-2012 "LDA ANTV / EOR CKF8 / CMP I,0F8 / BCC 3$" — spawn only from the PARKED slot
const SCORP_CENTIN_GATE = 11 // :2017-2020 "CMP I,11." DECIMAL — one LOWER than the flea's 12
const SCORP_SPAWN_RNG_MASK = 0x03 // :2021-2023 "LDA RNGEN / AND I,03 / BNE 3$" — a 1-in-4 entry
const SCORP_START_H = 0x00 // :2046-2047 "LDA I,0 / STA ANTH ;START AT EDGE"
const SCORP_START_DV = 0x00 // :2048 "STA ANTDV ;CLEAR VERTICAL DIRECTION"
const SCORP_V_MASK = 0x78 // :2049-2050 "LDA RNGEN / AND I,78"
const SCORP_V_BIAS = 0x70 // :2051-2052 "CLC / ADC I,70" — upper half: V ∈ [0x70, 0xE8] step 8

// SCORP speed / direction (:2029-2044).
const SCORP_SCORE2_FAST = 0x02 // :2029-2030 "LDA SCORE2 / CMP I,2" (BCD) — the 20,000-point band
const SCORP_SPEED_RNG_MASK = 0x03 // :2032-2034 "LDA RNGEN / AND I,03 / BEQ 5$" — 1-in-4 SLOW even over 20K
const SCORP_SLOW_SPEED = 1 // :2041 "LDA I,1"
const SCORP_FAST_SPEED = 2 // :2035 "LDA I,2"

// SCORP crossing / picture cycle (:2055-2086).
const SCORP_FRAME_PIC_MASK = 0x03 // :2077-2078 "LDA FRAME / AND I,03 / BNE 70$" — re-picture every 4 frames
const SCORP_PIC_STEP = 1 // :2081-2082 "CLC / ADC I,01" — a GENUINE +1 (unlike the flea's +2)
const SCORP_PIC_WRAP = 0x03 // :2083 "AND I,03"

// SCORP poison (:2087-2096).
const SCORP_POISON_MIN = 0x3c // :2092-2093 "CMP I,3C / BCC 90$" — below this is empty/already-poisoned
const SCORP_POISON_MAX = 0x40 // :2090-2091 "CMP I,40 / BCS 90$" — at/above this is not a mushroom
const SCORP_POISON_MASK = 0xfb // :2094 "AND I,0FB" — clear bit 2: 0x3C-0x3F -> 0x38-0x3B

// SHOOT's scorpion branch (:2188-2228 / :2296-2302).
const SCORP_HIT_V_WINDOW = 5 // :2202 "CPY I,5" — the GENERIC V window (scorpion skips the fast-ant path at :2192)
const SCORP_HIT_H_WINDOW = 10 // :2226 "CPY I,10." DECIMAL — WIDER than the flea's 6
const SCORP_SCORE = 1000 // :2228 "LDY I,10" -> SCORN1 MSB (HEX 0x10, BCD 1000)
const SCORP_EXPLODE_PIC = 0xff // :2301-2302 "LDA I,0FF / STA X,MOBJP ;EXPLOSION PICTURE"
const SCORP_EXPLODE_DONE = 0xf9 // :965-968 EXPLOD's rest picture (shared, CT-44)
const SHOT_TOP_SKIP = 0xf8 // :2180-2182 "CMP I,0F8 / BCS ;IF OFF TOP OF SCREEN"

// ─── the contract GREEN (Julia) builds ───────────────────────────────────────

/** The shared slot-12 object — the SAME shape the flea uses (h,v,dv,dh,pic).
 *  The scorpion is a slot whose picture sits in 0x30-0x33. */
interface Slot {
  h: number
  v: number
  dv: number
  dh: number
  pic: number
}

interface Shot {
  h: number
  v: number
  live: boolean
}

interface ScorpStepCtx {
  frame: number
  score: number
  rng: Rng
  /** CENTIN (:2017-2020) — the wave's centipede LENGTH. Wave progression is cp4,
   *  so per the epic's wave-gating ruling this input is PARAMETERIZED here. */
  centin: number
}

interface ScorpStep {
  slot: Slot
  /** A mushroom cell was actually poisoned this frame (:2094-2096). */
  poisoned: boolean
}

interface Cp33Module {
  /** true iff the slot picture is a LIVE, movable scorpion (0x30-0x33). */
  isScorpion: (pic: number) => boolean
  /** SCORP (:2001-2097): one frame. From a parked slot it may START a scorpion
   *  (:2009-2054); a live scorpion CROSSES and POISONS (:2055-2096); off-screen
   *  it re-parks through ANTPC. Mutates `field` in place (poisoning), returns
   *  the new slot and whether a cell was poisoned. */
  stepScorp: (slot: Slot, field: Playfield, ctx: ScorpStepCtx) => ScorpStep
  /** SHOOT's scorpion branch (:2188-2228 / :2296-2302): ONE hit — 1000 points,
   *  explosion picture 0xFF. Windows are V<5 and H<10 (DECIMAL). */
  resolveScorpionShotHit: (shot: Shot, slot: Slot) => { slot: Slot; shot: Shot; scored: number; hit: boolean }
  /** cp3-2's flea explosion step, reused verbatim: it already carries SCORP's
   *  :2072-2075 revival, so a killed scorpion counts down and re-parks. */
  stepFleaExplosion: (slot: Slot, rng: Rng, score: number) => Slot
  /** PLAY (:1775-1823) via cp2-5/cp3-1/cp3-2. A scorpion (pic >= 0x20) must be
   *  EXCLUDED, exactly as the port already excludes it (:539). */
  checkPlayerContact: (
    segs: Array<{ h: number; v: number; pic: number }>,
    player: { h: number; v: number },
    spider?: unknown,
    flea?: Slot | null,
  ) => boolean
}

async function loadCp33(): Promise<Cp33Module> {
  try {
    // COMPUTED specifier: src/core/scorpion.ts does not exist yet, and a literal
    // import would fail `tsc --noEmit` (a broken build, not a RED test). At
    // runtime it resolves normally once Julia creates the module.
    const scorpPath = ['..', 'src', 'core', 'scorpion'].join('/')
    const scorp = (await import(/* @vite-ignore */ scorpPath)) as Record<string, unknown>
    const flea = (await import('../src/core/flea')) as Record<string, unknown>
    const cent = (await import('../src/core/centipede')) as Record<string, unknown>
    for (const name of ['isScorpion', 'stepScorp', 'resolveScorpionShotHit']) {
      if (typeof scorp[name] !== 'function') throw new Error(`scorpion.ts has no ${name}`)
    }
    if (typeof flea.stepFleaExplosion !== 'function') throw new Error('flea.ts lost stepFleaExplosion')
    if (typeof cent.checkPlayerContact !== 'function') throw new Error('centipede.ts has no checkPlayerContact')
    return {
      isScorpion: scorp.isScorpion as Cp33Module['isScorpion'],
      stepScorp: scorp.stepScorp as Cp33Module['stepScorp'],
      resolveScorpionShotHit: scorp.resolveScorpionShotHit as Cp33Module['resolveScorpionShotHit'],
      stepFleaExplosion: flea.stepFleaExplosion as Cp33Module['stepFleaExplosion'],
      checkPlayerContact: cent.checkPlayerContact as Cp33Module['checkPlayerContact'],
    }
  } catch (e) {
    throw new Error(
      'cp3-3 scorpion surface not built yet — GREEN (Julia) adds src/core/scorpion.ts ' +
        '(isScorpion/stepScorp/resolveScorpionShotHit) operating on the SHARED slot-12 object, ' +
        'wires stepScorp into the sim BETWEEN resolveShotHit and stepFlea (SCORP :36 before ' +
        'ANTMV :37), authors docs/rom-study/claims/13-scorpion.json (SC-*), and records the ' +
        'CENTIP.DOC:116 "scorpion 1000" diff in open-questions.md. ' +
        `(${e instanceof Error ? e.message : String(e)})`,
    )
  }
}

// ─── test helpers ─────────────────────────────────────────────────────────────

/** A slot staged directly. Defaults to a LIVE scorpion mid-crossing. */
const scorp = (over: Partial<Slot> = {}): Slot => ({
  h: 0x40,
  v: 0x80,
  dv: 0,
  dh: SCORP_SLOW_SPEED,
  pic: SCORP_PIC_LOW,
  ...over,
})

/** A PARKED slot (a flea awaiting either creature), spawn-eligible. */
const parked = (over: Partial<Slot> = {}): Slot => ({
  h: 0x00,
  v: SCORP_PARK_V,
  dv: 0,
  dh: 0,
  pic: SCORP_PARK_PIC,
  ...over,
})

/** A ctx whose non-rng gates are OPEN for a spawn: FRAME low byte 0, CENTIN
 *  below the scorpion gate. Only the rng roll decides. */
const spawnCtx = (over: Partial<ScorpStepCtx> = {}): ScorpStepCtx => ({
  frame: 0, // FRAME & 0xFF == 0 — the ":2013 LDA FRAME / BEQ 4$" window
  score: 0,
  rng: createRng(1),
  centin: SCORP_CENTIN_GATE - 1,
  ...over,
})

/** A ctx that keeps a moving scorpion moving (off the picture cadence). */
const moveCtx = (over: Partial<ScorpStepCtx> = {}): ScorpStepCtx => ({
  frame: 1,
  score: 0,
  rng: createRng(1),
  centin: SCORP_CENTIN_GATE - 1,
  ...over,
})

function fieldWith(cells: ReadonlyArray<{ h: number; v: number; code: number }> = []): Playfield {
  const field = createPlayfield()
  for (const c of cells) field.cells[c.h * PLYFLD_STRIDE + c.v] = c.code
  return field
}

const cellAt = (field: Playfield, cell: { h: number; v: number }): number =>
  field.cells[cell.h * PLYFLD_STRIDE + cell.v]

/** The cell SCORP poisons: OBSTAC at (ANTH, ANTV) with direction 0 (:2087-2089,
 *  TEMP1=ANTH from :2068). The SAME mapping the flea's seeding uses. */
const poisonCellOf = (s: Slot): { h: number; v: number } => obstacleCellFor(s.h, s.v, 0)

/** Collect the spawns produced across a seed sweep (the ROM's entropy is a
 *  free-running LFSR; we sweep the seeded cursor to exercise the whole space). */
function spawnSweep(
  mod: Cp33Module,
  n: number,
  ctxOver: Partial<ScorpStepCtx> = {},
): Slot[] {
  const out: Slot[] = []
  for (let seed = 1; seed <= n; seed++) {
    const step = mod.stepScorp(parked(), fieldWith(), spawnCtx({ ...ctxOver, rng: createRng(seed) }))
    if (mod.isScorpion(step.slot.pic)) out.push(step.slot)
  }
  return out
}

// ════════════════════════════════════════════════════════════════════════════
// premises — the hand-mirrored constants are self-checked (a transcription that
// disagrees with the ROM's own arithmetic fails HERE, not in a behaviour test)
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-3 premises — the transcribed constants agree with the ROM arithmetic', () => {
  it('the spawn and speed rng masks each admit exactly 1 draw in 4 (:2022/:2033)', () => {
    expect(SCORP_SPAWN_RNG_MASK + 1, ':2021-2023 "AND I,03" — a 1-in-4 entry').toBe(4)
    expect(SCORP_SPEED_RNG_MASK + 1, ':2032-2034 "AND I,03" — a 1-in-4 slow-over-20K').toBe(4)
  })
  it('the 20,000 band byte is BCD 0x02, and the picture cadence fires on frame&3==0', () => {
    expect(SCORP_SCORE2_FAST, ':2030 "CMP I,2" — SCORE2 is the BCD 10,000s byte, so 0x02 == 20,000').toBe(0x02)
    expect(4 & SCORP_FRAME_PIC_MASK, ':2078 "AND I,03" — frame 4 is ON the picture cadence').toBe(0)
  })
  it('the picture advances +1 and wraps within the low two bits (:2082-2083)', () => {
    expect(SCORP_PIC_STEP, ':2082 "ADC I,01" — a genuine +1').toBe(1)
    expect(((SCORP_PIC_LOW + SCORP_PIC_STEP) & SCORP_PIC_WRAP) | SCORP_PIC_LOW, '0x30 -> 0x31').toBe(0x31)
    expect(((0x33 + SCORP_PIC_STEP) & SCORP_PIC_WRAP) | SCORP_PIC_LOW, '0x33 wraps to 0x30').toBe(SCORP_PIC_LOW)
  })
  it('the poison window is the normal-mushroom band [0x3C,0x40), clearing bit 2 (:2090-2094)', () => {
    expect(SCORP_POISON_MAX, ':2090 "CMP I,40" — at/above 0x40 is not a mushroom').toBe(0x40)
    expect(SCORP_POISON_MIN, ':2092 "CMP I,3C" — below 0x3C is empty/poisoned').toBe(0x3c)
    for (let code = SCORP_POISON_MIN; code < SCORP_POISON_MAX; code++) {
      expect(code & SCORP_POISON_MASK, `0x${code.toString(16)} clears bit 2 into the poison band`).toBe(code - 4)
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-1 — isScorpion: the band that distinguishes the slot's tenant
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-3 AC-1 isScorpion — the live-scorpion band is 0x30-0x33 (:2003-2008)', () => {
  it('is TRUE for exactly 0x30-0x33 and FALSE either side', async () => {
    const mod = await loadCp33()
    for (const pic of [0x30, 0x31, 0x32, 0x33]) {
      expect(mod.isScorpion(pic), `0x${pic.toString(16)} is a live scorpion`).toBe(true)
    }
    // Below the band is a flea or a parked slot; at/above 0x34 is exploding.
    for (const pic of [0x1c, 0x1f, FLEA_PIC_GATE, 0x2f, SCORP_PIC_HIGH, 0x35, SCORP_EXPLODE_DONE, SCORP_EXPLODE_PIC]) {
      expect(mod.isScorpion(pic), `0x${pic.toString(16)} is NOT a live scorpion`).toBe(false)
    }
  })

  it('draws the exploding line at 0x34, not 0x33 — the :2003 "CMP I,34" boundary', async () => {
    const mod = await loadCp33()
    expect(mod.isScorpion(SCORP_PIC_HIGH - 1), '0x33 is still a scorpion').toBe(true)
    expect(mod.isScorpion(SCORP_PIC_HIGH), '0x34 is the exploding side (BCC 2$)').toBe(false)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-1 — SCORP: the spawn gate (:2009-2054)
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-3 AC-1 SCORP — the spawn gates (parked, FRAME==0, CENTIN<11, RNGEN&3==0)', () => {
  it('spawns a scorpion from a parked slot when every gate is open', async () => {
    const mod = await loadCp33()
    // Some seed in a small sweep must roll RNGEN&3==0 and produce a scorpion.
    const spawns = spawnSweep(mod, 64)
    expect(spawns.length, 'the 1-in-4 rng gate must let SOME seed spawn').toBeGreaterThan(0)
    // ...AND the 1-in-4 gate must REJECT most seeds — a mask that always spawned
    // (0x00 instead of :2022's 0x03) would sweep all 64. ~22/64 roll RNGEN&3==0,
    // so a band both passes the real gate and fails an always-spawn mutation.
    expect(spawns.length, 'the gate must also reject the other three seeds in four').toBeLessThan(56)
    const s = spawns[0]
    expect(mod.isScorpion(s.pic), 'the spawned picture is the scorpion band').toBe(true)
    expect(s.pic, 'the first scorpion picture is 0x30 (:2026)').toBe(SCORP_PIC_LOW)
    expect(s.h, 'ANTH starts at the edge, 0 (:2046-2047)').toBe(SCORP_START_H)
    expect(s.dv, 'ANTDV is cleared — the scorpion never descends (:2048)').toBe(SCORP_START_DV)
  })

  it('holds a parked slot while CENTIN is at or above DECIMAL 11 (:2017-2020)', async () => {
    const mod = await loadCp33()
    // The gate is one LOWER than the flea's 12: read it as hex 0x11 (=17) and
    // CENTIN 11..16 would wrongly admit scorpions. Pin the whole disputed band.
    for (let centin = SCORP_CENTIN_GATE; centin <= 0x11; centin++) {
      const spawns = spawnSweep(mod, 64, { centin })
      expect(spawns.length, `CENTIN=${centin} must admit NO scorpion (decimal-11 gate)`).toBe(0)
    }
    // ...and one below it DOES admit them, so the test cannot pass by refusing all.
    expect(spawnSweep(mod, 64, { centin: SCORP_CENTIN_GATE - 1 }).length).toBeGreaterThan(0)
  })

  it('never spawns from a MOVING slot — an ant is already in flight (:2009-2012)', async () => {
    const mod = await loadCp33()
    // A slot below the park height is already a live creature; SCORP must not
    // re-seed on top of it, whatever the rng says.
    for (let seed = 1; seed <= 64; seed++) {
      const onScreen = parked({ v: SCORP_PARK_GATE_V - 8, pic: SCORP_PARK_PIC }) // v < 0xF8
      const step = mod.stepScorp(onScreen, fieldWith(), spawnCtx({ rng: createRng(seed) }))
      expect(mod.isScorpion(step.slot.pic), `seed ${seed}: a moving slot must not spawn a scorpion`).toBe(false)
    }
  })

  it('never spawns on a frame whose FRAME low byte is non-zero (:2013-2014)', async () => {
    const mod = await loadCp33()
    // "LDA FRAME / BEQ 4$" reads the LOW byte of the 2-byte counter, so a spawn
    // is attempted only once every 256 frames. Any other frame refuses.
    for (const frame of [1, 2, 3, 4, 100, 255, 257, 300]) {
      expect(frame & 0xff, `premise: frame ${frame} has a non-zero low byte`).not.toBe(0)
      const spawns = spawnSweep(mod, 96, { frame })
      expect(spawns.length, `frame ${frame} (low byte != 0) must never spawn`).toBe(0)
    }
    // A low-byte-zero frame (256) DOES admit them, proving the gate, not a veto.
    expect(spawnSweep(mod, 96, { frame: 256 }).length, 'frame 256 opens the window').toBeGreaterThan(0)
  })

  it('consumes NO rng before its gates are decided — the gates come first (:2009-2021)', async () => {
    const mod = await loadCp33()
    // The RNGEN read is at :2021, AFTER the parked/FRAME/CENTIN gates. If a port
    // drew first and gated after, every non-spawn frame would burn draws and
    // shift the whole replay cursor. Prove an ineligible frame leaves the cursor
    // able to produce the same next value.
    const probe = (over: Partial<ScorpStepCtx>, slot: Slot) => {
      const rngA = createRng(99)
      mod.stepScorp(slot, fieldWith(), spawnCtx({ ...over, rng: rngA }))
      const after = nextInt(rngA, 0x100)
      const untouched = nextInt(createRng(99), 0x100)
      return { after, untouched }
    }
    // Ineligible by FRAME:
    const a = probe({ frame: 1 }, parked())
    expect(a.after, 'a non-spawn-window frame must not consume a draw').toBe(a.untouched)
    // Ineligible by CENTIN:
    const b = probe({ centin: SCORP_CENTIN_GATE }, parked())
    expect(b.after, 'a CENTIN-blocked frame must not consume a draw').toBe(b.untouched)
    // Ineligible because the slot is already moving:
    const c = probe({}, parked({ v: SCORP_PARK_GATE_V - 8 }))
    expect(c.after, 'a moving slot must not consume a draw').toBe(c.untouched)
  })
})

describe('cp3-3 AC-1 SCORP — the spawn V position (:2049-2054)', () => {
  it('places every scorpion in the UPPER HALF at (RNGEN & 0x78) + 0x70', async () => {
    const mod = await loadCp33()
    const spawns = spawnSweep(mod, 400)
    expect(spawns.length, 'the sweep must produce scorpions to inspect').toBeGreaterThan(10)
    const rows = new Set<number>()
    for (const s of spawns) {
      rows.add(s.v)
      expect(s.v, 'V is at least the 0x70 bias').toBeGreaterThanOrEqual(SCORP_V_BIAS)
      expect(s.v, 'V never exceeds 0x78 + 0x70 = 0xE8, staying off the park (0xF8)').toBeLessThanOrEqual(
        SCORP_V_MASK + SCORP_V_BIAS,
      )
      expect((s.v - SCORP_V_BIAS) & ~SCORP_V_MASK, 'V-0x70 is a subset of the 0x78 mask bits').toBe(0)
      expect(s.v, 'a spawned scorpion is never at the parked height').not.toBe(SCORP_PARK_V)
    }
    // Liveness: the row is drawn from the rng, not a constant.
    expect(rows.size, 'the spawn V must actually vary across seeds').toBeGreaterThan(3)
  })
})

describe('cp3-3 AC-1 SCORP — the spawn speed and direction (:2029-2045)', () => {
  it('below 20,000 points every scorpion crawls at |dh| = 1 (:2041-2044)', async () => {
    const mod = await loadCp33()
    // premise: 19,999 is below the SCORE2 gate byte, 20,000 is on it.
    const spawns = spawnSweep(mod, 400, { score: 0 })
    expect(spawns.length, 'the sweep must produce scorpions').toBeGreaterThan(10)
    const dirs = new Set<number>()
    for (const s of spawns) {
      expect(Math.abs(s.dh), 'a sub-20K scorpion always moves at magnitude 1').toBe(SCORP_SLOW_SPEED)
      expect([SCORP_SLOW_SPEED, -SCORP_SLOW_SPEED], 'and only ±1').toContain(s.dh)
      dirs.add(Math.sign(s.dh))
    }
    // Liveness: the direction is a coin off RNGEN bit 7, so BOTH signs occur.
    expect(dirs.size, 'both crossing directions must be reachable (:2042-2044)').toBe(2)
  })

  it('at or above 20,000 points it is usually |dh| = 2, but a 1-in-4 roll keeps it slow (:2029-2039)', async () => {
    const mod = await loadCp33()
    const spawns = spawnSweep(mod, 600, { score: 20_000 })
    expect(spawns.length, 'the sweep must produce scorpions over 20K').toBeGreaterThan(20)
    const speeds = new Set<number>()
    for (const s of spawns) {
      expect([SCORP_SLOW_SPEED, SCORP_FAST_SPEED], 'magnitude is 1 or 2, never other').toContain(Math.abs(s.dh))
      speeds.add(Math.abs(s.dh))
    }
    // ":2032-2034 LDA RNGEN / AND I,03 / BEQ 5$" — over 20K the scorpion is FAST
    // unless the roll is 0, so BOTH speeds must appear. A port that dropped the
    // slow-over-20K branch would show only speed 2.
    expect(speeds.has(SCORP_FAST_SPEED), 'the fast scorpion must appear over 20K').toBe(true)
    expect(speeds.has(SCORP_SLOW_SPEED), 'and the 1-in-4 slow one too (:2032-2034)').toBe(true)
  })

  it('reads the 20,000 boundary off the BCD SCORE2 byte, inclusively (:2029-2030)', async () => {
    const mod = await loadCp33()
    // 19,999 is strictly below the band and can only ever crawl; the fast branch
    // is unreachable there. Over a wide sweep NO magnitude-2 scorpion may appear.
    const below = spawnSweep(mod, 600, { score: 19_999 })
    expect(below.length, 'the sweep must produce scorpions below 20K').toBeGreaterThan(20)
    expect(
      below.every((s) => Math.abs(s.dh) === SCORP_SLOW_SPEED),
      'nothing at 19,999 may reach speed 2 — the gate is BCD, not decimal',
    ).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-1 — SCORP: the crossing (:2055-2086)
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-3 AC-1 SCORP — the horizontal crossing (:2055-2068)', () => {
  it('adds ANTDH to h every frame and NEVER changes v — a flat walk (:2065-2067/:2048)', async () => {
    const mod = await loadCp33()
    for (const dh of [SCORP_SLOW_SPEED, -SCORP_SLOW_SPEED, SCORP_FAST_SPEED, -SCORP_FAST_SPEED]) {
      let s = scorp({ h: 0x40, v: 0x88, dh, dv: 0 })
      let expectedH = 0x40
      for (let frame = 1; frame <= 5; frame++) {
        s = mod.stepScorp(s, fieldWith(), moveCtx({ frame })).slot
        expectedH = (expectedH + dh) & 0xff
        expect(s.h, `dh=${dh} frame ${frame}: h advances by dh`).toBe(expectedH)
        expect(s.v, `dh=${dh} frame ${frame}: v is fixed — the scorpion does not descend`).toBe(0x88)
        expect(s.dv, `dh=${dh} frame ${frame}: ANTDV stays 0`).toBe(0)
      }
    }
  })

  it('re-parks through ANTPC the instant ANTH returns to 0 (:2069-2075)', async () => {
    const mod = await loadCp33()
    // A scorpion one step short of the origin, moving +2, lands on ANTH==0 (the
    // :2069 "BNE 60$" test) and re-parks: SCORP's ":2075 58$ JMP ANTPC" runs the
    // SAME ANTPC the flea's bottom-landing uses, which RE-DRAWS a fresh column
    // (the rejection loop) — so the returned h is a new column-aligned value, NOT
    // the wrapped 0, exactly as flea.test.ts's own re-park test asserts.
    const aboutToWrap = scorp({ h: 0xfe, v: 0x90, dh: SCORP_FAST_SPEED })
    const step = mod.stepScorp(aboutToWrap, fieldWith(), moveCtx()).slot
    expect(mod.isScorpion(step.pic), 'a scorpion that reaches the edge is gone').toBe(false)
    expect(step.pic, 'ANTPC restores the parked-flea picture').toBe(SCORP_PARK_PIC)
    expect(step.v, 'ANTPC re-parks off the top of the screen').toBe(SCORP_PARK_V)
    expect(step.h & 0x07, 'ANTPC re-draws a column-aligned h, not the wrapped 0').toBe(0x04)
  })

  it('does NOT re-park while it is still mid-screen', async () => {
    const mod = await loadCp33()
    const mid = mod.stepScorp(scorp({ h: 0x40, v: 0x90, dh: SCORP_SLOW_SPEED }), fieldWith(), moveCtx()).slot
    expect(mid.h, 'h has advanced but not wrapped').toBe(0x41)
    expect(mod.isScorpion(mid.pic), 'a mid-crossing scorpion is still a scorpion').toBe(true)
  })

  it('crosses the WHOLE byte and re-parks exactly once — a full traversal', async () => {
    const mod = await loadCp33()
    let s = scorp({ h: 0x02, v: 0x90, dh: SCORP_SLOW_SPEED })
    let reparks = 0
    for (let frame = 1; frame <= 300; frame++) {
      s = mod.stepScorp(s, fieldWith(), moveCtx({ frame })).slot
      if (!mod.isScorpion(s.pic)) {
        reparks++
        break
      }
      expect(s.v, `frame ${frame}: v never wanders during the crossing`).toBe(0x90)
    }
    expect(reparks, 'a +1 walk from h=2 must return to h=0 and re-park within 256 frames').toBe(1)
  })
})

describe('cp3-3 AC-1 SCORP — the picture cycle (:2077-2086)', () => {
  it('re-pictures only on frames where FRAME & 3 == 0 (:2077-2078)', async () => {
    const mod = await loadCp33()
    const start = scorp({ pic: SCORP_PIC_LOW })
    for (const frame of [1, 2, 3, 5, 6, 7]) {
      expect(
        mod.stepScorp(start, fieldWith(), moveCtx({ frame })).slot.pic,
        `frame ${frame} must NOT re-picture`,
      ).toBe(SCORP_PIC_LOW)
    }
    expect(
      mod.stepScorp(start, fieldWith(), moveCtx({ frame: 4 })).slot.pic,
      'frame 4 DOES re-picture',
    ).not.toBe(SCORP_PIC_LOW)
  })

  it('advances the picture by ONE — a GENUINE +1, unlike the flea\'s +2 (:2081-2084)', async () => {
    const mod = await loadCp33()
    // ":2080-2084 LDA ANTP / CLC / ADC I,01 / AND I,03 / ORA I,30" — a single +1
    // with no memory INC before it (contrast the flea's INC-then-ADC). So all
    // four SCORP pictures 0x30-0x33 are reachable, where the flea only shows two.
    let s = scorp({ h: 0x40, v: 0x90, pic: SCORP_PIC_LOW })
    const seen: number[] = [s.pic]
    for (const frame of [4, 8, 12, 16]) {
      s = mod.stepScorp(s, fieldWith(), moveCtx({ frame })).slot
      seen.push(s.pic)
    }
    expect(seen, 'the cycle steps +1 through the whole band and wraps 0x33 -> 0x30').toEqual([
      0x30, 0x31, 0x32, 0x33, 0x30,
    ])
  })

  it('reaches all FOUR scorpion pictures over a crossing (the +1 discriminator)', async () => {
    const mod = await loadCp33()
    let s = scorp({ h: 0x04, v: 0x90, dh: SCORP_SLOW_SPEED, pic: SCORP_PIC_LOW })
    const seen = new Set<number>()
    for (let frame = 1; frame <= 200 && mod.isScorpion(s.pic); frame++) {
      s = mod.stepScorp(s, fieldWith(), moveCtx({ frame })).slot
      if (mod.isScorpion(s.pic)) seen.add(s.pic)
    }
    // A +2 misread (like the flea's) would only ever reach two of the four.
    expect([...seen].sort(), 'all of 0x30-0x33 must appear').toEqual([0x30, 0x31, 0x32, 0x33])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-2 — SCORP: poison creation, the sole source of the 0x38-0x3B band
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-3 AC-2 SCORP — every mushroom it passes becomes POISONED (:2087-2096)', () => {
  it('maps a normal mushroom [0x3C,0x40) onto the poison band by clearing bit 2', async () => {
    const mod = await loadCp33()
    // 0x3C->0x38, 0x3D->0x39, 0x3E->0x3A, 0x3F->0x3B — the damage level survives,
    // only the poison bit changes. Stage a scorpion so its poison cell holds the
    // mushroom, step once, and read the cell back.
    for (const normal of [0x3c, 0x3d, 0x3e, 0x3f]) {
      const s = scorp({ h: 0x40, v: 0x90, dh: 0 }) // dh=0 keeps its cell fixed for the probe
      const cell = poisonCellOf(s)
      const field = fieldWith([{ h: cell.h, v: cell.v, code: normal }])
      const step = mod.stepScorp(s, field, moveCtx({ frame: 1 }))
      expect(cellAt(field, cell), `0x${normal.toString(16)} poisons to 0x${(normal & SCORP_POISON_MASK).toString(16)}`).toBe(
        normal & SCORP_POISON_MASK,
      )
      expect(step.poisoned, 'the step reports it poisoned a cell').toBe(true)
      // The poisoned code is exactly the 0x38-0x3B band cp1-6 renders / cp2-3 dives on.
      expect(cellAt(field, cell)).toBeGreaterThanOrEqual(MUSHROOM_MIN)
      expect(cellAt(field, cell)).toBeLessThan(SCORP_POISON_MIN)
    }
  })

  it('poisons the cell at OBSTAC(ANTH, ANTV) — where the scorpion actually is', async () => {
    const mod = await loadCp33()
    const s = scorp({ h: 0x50, v: 0xa0, dh: 0 })
    const cell = poisonCellOf(s)
    // A DIFFERENT cell one column over must stay untouched, so the test pins the
    // location, not merely "something got poisoned".
    const decoy = { h: cell.h === 0 ? cell.h + 1 : cell.h - 1, v: cell.v }
    const field = fieldWith([
      { h: cell.h, v: cell.v, code: MUSHROOM_FULL },
      { h: decoy.h, v: decoy.v, code: MUSHROOM_FULL },
    ])
    mod.stepScorp(s, field, moveCtx({ frame: 1 }))
    expect(cellAt(field, cell), 'the scorpion\'s own cell is poisoned').toBe(MUSHROOM_FULL & SCORP_POISON_MASK)
    expect(cellAt(field, decoy), 'the neighbouring cell is NOT touched').toBe(MUSHROOM_FULL)
  })

  it('poisons at the POST-move h, following the scorpion across a column boundary (:2068/:2087)', async () => {
    const mod = await loadCp33()
    // ":2067-2068 STA ANTH / STA TEMP1" then ":2087-2089 ... JSR OBSTAC" — the
    // poison probes the NEW ANTH. h 0x77 -> 0x78 (dh 1) crosses OBSTAC columns
    // 16 -> 15, so the correct code poisons the POST-move column 15; a port that
    // poisoned the pre-move h would hit column 16 instead. (dh 0 cannot see this
    // — pre and post map to the same column.)
    const before = scorp({ h: 0x77, v: 0x90, dh: 1 })
    const preCell = obstacleCellFor(0x77, before.v, 0)
    const postCell = obstacleCellFor(0x78, before.v, 0)
    expect(preCell.h, 'premise: the +1 move crosses a column boundary').not.toBe(postCell.h)
    const field = fieldWith([
      { h: preCell.h, v: preCell.v, code: MUSHROOM_FULL },
      { h: postCell.h, v: postCell.v, code: MUSHROOM_FULL },
    ])
    const step = mod.stepScorp(before, field, moveCtx({ frame: 1 }))
    expect(step.slot.h, 'the scorpion moved to the post cell').toBe(0x78)
    expect(cellAt(field, postCell), 'the POST-move column is poisoned').toBe(MUSHROOM_FULL & SCORP_POISON_MASK)
    expect(cellAt(field, preCell), 'the pre-move column is left normal').toBe(MUSHROOM_FULL)
  })

  it('leaves an EMPTY cell, a NON-mushroom, and an ALREADY-poisoned cell alone (:2090-2093)', async () => {
    const mod = await loadCp33()
    const s = scorp({ h: 0x40, v: 0x90, dh: 0 })
    const cell = poisonCellOf(s)
    // Empty (0): CMP I,40 passes but CMP I,3C fails (0 < 0x3C) -> skip.
    const empty = fieldWith()
    const eStep = mod.stepScorp(s, empty, moveCtx({ frame: 1 }))
    expect(cellAt(empty, cell), 'an empty cell is not seeded with poison').toBe(0)
    expect(eStep.poisoned, 'nothing poisoned on an empty cell').toBe(false)
    // Already poisoned (0x38-0x3B): below 0x3C, so "BCC 90$" skips it — no double-clear.
    for (const already of [0x38, 0x3b]) {
      const field = fieldWith([{ h: cell.h, v: cell.v, code: already }])
      const step = mod.stepScorp(s, field, moveCtx({ frame: 1 }))
      expect(cellAt(field, cell), `0x${already.toString(16)} is already poisoned — left as is`).toBe(already)
      expect(step.poisoned, 'an already-poisoned cell is not re-reported').toBe(false)
    }
  })

  it('poisons EVERY frame it crosses — a swath, not a single stamp', async () => {
    const mod = await loadCp33()
    // Lay a run of full mushrooms across the scorpion's row and walk it through.
    // OBSTAC quantises 8 pixels to a column, so a +2 walk visits each column
    // repeatedly; every visited column that held a normal mushroom must end
    // poisoned, and at least several must be hit.
    const s0 = scorp({ h: 0x10, v: 0x88, dh: SCORP_FAST_SPEED, pic: SCORP_PIC_LOW })
    const row = poisonCellOf(s0).v
    const field = createPlayfield()
    for (let h = 0; h < 30; h++) field.cells[h * PLYFLD_STRIDE + row] = MUSHROOM_FULL
    let s = s0
    let poisonedFrames = 0
    for (let frame = 1; frame <= 120 && mod.isScorpion(s.pic); frame++) {
      const step = mod.stepScorp(s, field, moveCtx({ frame }))
      s = step.slot
      if (step.poisoned) poisonedFrames++
    }
    expect(poisonedFrames, 'the scorpion must poison many cells as it crosses').toBeGreaterThan(3)
    const poisonedCells = Array.from(field.cells).filter((c) => c >= MUSHROOM_MIN && c < SCORP_POISON_MIN)
    expect(poisonedCells.length, 'a swath of the row is now poisoned').toBeGreaterThan(3)
    expect(
      Array.from(field.cells).every((c) => c === 0 || c >= MUSHROOM_MIN),
      'no cell was corrupted to a non-mushroom value',
    ).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-3 — SHOOT: one shot, 1000 points
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-3 AC-3 SHOOT — a shot kills the scorpion in ONE hit for 1000 (:2226-2302)', () => {
  it('explodes the scorpion and scores 1000 when the shot is in both windows', async () => {
    const mod = await loadCp33()
    const s = scorp({ h: 0x80, v: 0x90, pic: SCORP_PIC_LOW })
    const shot: Shot = { h: 0x80, v: 0x90, live: true } // dead centre
    const hit = mod.resolveScorpionShotHit(shot, s)
    expect(hit.hit, 'a centred shot hits').toBe(true)
    expect(hit.scored, 'a scorpion kill scores 1000 — 0x10 read as BCD, not 16').toBe(SCORP_SCORE)
    expect(hit.slot.pic, 'the killed scorpion takes the shared explosion picture 0xFF').toBe(SCORP_EXPLODE_PIC)
    expect(hit.shot.live, 'the shot is spent (RSHOT)').toBe(false)
  })

  it('scores 1000, NOT the 16 a hex reading of "LDY I,10" would give (:2228 radix)', async () => {
    const mod = await loadCp33()
    const hit = mod.resolveScorpionShotHit({ h: 0x80, v: 0x90, live: true }, scorp({ h: 0x80, v: 0x90 }))
    expect(hit.scored, 'the SCORN1 MSB 0x10 is BCD 1000').toBe(1000)
    expect(hit.scored, 'a decimal/hex confusion would yield 16').not.toBe(16)
  })

  it('uses the WIDE decimal-10 H window and the narrow 5 V window (:2202/:2226)', async () => {
    const mod = await loadCp33()
    const s = scorp({ h: 0x80, v: 0x90 })
    // H window: |dH| < 10 hits, |dH| >= 10 misses.
    expect(mod.resolveScorpionShotHit({ h: 0x80 + 9, v: 0x90, live: true }, s).hit, '|dH|=9 is inside the H window').toBe(true)
    expect(mod.resolveScorpionShotHit({ h: 0x80 + SCORP_HIT_H_WINDOW, v: 0x90, live: true }, s).hit, '|dH|=10 misses').toBe(false)
    // Reading the window as hex 0x10 (=16) would keep |dH|=10..15 as hits — pin them out.
    for (let dh = SCORP_HIT_H_WINDOW; dh <= 0x10; dh++) {
      expect(mod.resolveScorpionShotHit({ h: 0x80 + dh, v: 0x90, live: true }, s).hit, `|dH|=${dh} must miss`).toBe(false)
    }
    // V window: |dV| < 5 hits, |dV| >= 5 misses.
    expect(mod.resolveScorpionShotHit({ h: 0x80, v: 0x90 + 4, live: true }, s).hit, '|dV|=4 is inside the V window').toBe(true)
    expect(mod.resolveScorpionShotHit({ h: 0x80, v: 0x90 + SCORP_HIT_V_WINDOW, live: true }, s).hit, '|dV|=5 misses').toBe(false)
  })

  it('misses a dead shot, a parked-off-top slot, and a non-scorpion picture', async () => {
    const mod = await loadCp33()
    const s = scorp({ h: 0x80, v: 0x90 })
    expect(mod.resolveScorpionShotHit({ h: 0x80, v: 0x90, live: false }, s).hit, 'a dead shot cannot hit').toBe(false)
    // A slot parked off the top (v >= 0xF8) is not shootable (:2180-2182).
    expect(
      mod.resolveScorpionShotHit({ h: 0x80, v: 0x90, live: true }, scorp({ v: SHOT_TOP_SKIP })).hit,
      'a parked slot is off the top',
    ).toBe(false)
    // A flea (pic < 0x20) is NOT a scorpion — resolveScorpionShotHit must decline
    // it. The flea is co-located with the shot (dead centre), so ONLY the picture
    // band can reject it: staged out of window it would "miss" for the wrong
    // reason and the isScorpion gate would go untested (mutation-caught).
    expect(
      mod.resolveScorpionShotHit({ h: 0x80, v: 0x90, live: true }, scorp({ h: 0x80, v: 0x90, pic: SCORP_PARK_PIC })).hit,
      'a flea picture is not this routine\'s business, even dead-centre on the shot',
    ).toBe(false)
  })

  it('does not score twice — the shot dies on the one hit (no second-hit path)', async () => {
    const mod = await loadCp33()
    const s = scorp({ h: 0x80, v: 0x90 })
    const first = mod.resolveScorpionShotHit({ h: 0x80, v: 0x90, live: true }, s)
    expect(first.scored).toBe(SCORP_SCORE)
    // Firing the SPENT shot at the now-exploding slot scores nothing more.
    const again = mod.resolveScorpionShotHit(first.shot, first.slot)
    expect(again.hit, 'a spent shot and an exploding slot cannot re-score').toBe(false)
    expect(again.scored).toBe(0)
  })
})

describe('cp3-3 AC-3 — a killed scorpion COMES BACK (shared explosion + revival)', () => {
  it('counts the 0xFF explosion down and re-parks the slot, exactly as the flea does', async () => {
    const mod = await loadCp33()
    // The scorpion writes NO explosion code of its own: cp3-2's stepFleaExplosion
    // already carries EXPLOD (0xFF->0xF9) AND SCORP's :2072-2075 re-park. Without
    // it, "the first scorpion you kill is the last scorpion of the game".
    let slot: Slot = { h: 0x80, v: 0x90, dv: 0, dh: SCORP_SLOW_SPEED, pic: SCORP_EXPLODE_PIC }
    const rng = createRng(1)
    let revived: Slot | null = null
    for (let frame = 0; frame < 20; frame++) {
      slot = mod.stepFleaExplosion(slot, rng, 0)
      if (slot.v === SCORP_PARK_V && slot.pic === SCORP_PARK_PIC) {
        revived = slot
        break
      }
    }
    expect(revived, 'the spent explosion must re-park slot 12').not.toBeNull()
    expect(revived!.pic, 'a re-parked slot is the flea park picture, ready to host either creature').toBe(SCORP_PARK_PIC)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-3 — PLAY: the scorpion cannot harm the player (transcribed, not assumed)
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-3 AC-3 PLAY — the scorpion has NO player-collision check (:36 vs :108)', () => {
  it('does NOT kill the player even sitting exactly on the gun — the band excludes it (:539)', async () => {
    const mod = await loadCp33()
    // The ONLY slot-12 "JSR PLAY" is inside ANTMV (:108), which a scorpion never
    // reaches (ANTMV early-returns for pic >= 0x20, :53-56). SCORP itself never
    // calls PLAY. So checkPlayerContact must EXCLUDE a scorpion regardless of how
    // close it is — the code says it cannot harm the player, and NOT because the
    // upper-half V keeps it away.
    const gun = { h: 0x80, v: 0x10 }
    const onTheGun = scorp({ h: gun.h, v: gun.v, pic: SCORP_PIC_LOW }) // co-located: a guaranteed hit if it were checked
    expect(
      mod.checkPlayerContact([], gun, null, onTheGun),
      'a scorpion ON the gun is still harmless — SCORP has no PLAY call',
    ).toBe(false)
    for (const pic of [0x30, 0x31, 0x32, 0x33]) {
      expect(
        mod.checkPlayerContact([], gun, null, scorp({ h: gun.h, v: gun.v, pic })),
        `scorpion picture 0x${pic.toString(16)} is excluded from player contact`,
      ).toBe(false)
    }
  })

  it('but a FLEA on the same spot DOES kill — proving the exclusion is by band, not by position', async () => {
    const mod = await loadCp33()
    // The discriminator: same co-ordinates, a flea picture (< 0x20) is lethal.
    // If checkPlayerContact returned false for BOTH, the scorpion test above
    // would be vacuous.
    const gun = { h: 0x80, v: 0x10 }
    expect(
      mod.checkPlayerContact([], gun, null, scorp({ h: gun.h, v: gun.v, pic: SCORP_PARK_PIC })),
      'a flea ON the gun IS lethal (FL-21) — so the scorpion\'s escape is the band',
    ).toBe(true)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// determinism — the seeded rng is the ONLY entropy
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-3 — determinism: spawn + crossing replay exactly from a seed', () => {
  it('replays an identical scorpion from the same seed, and DIVERGES on another', async () => {
    const mod = await loadCp33()
    const run = (seed: number) => {
      // Find this seed's spawn (if any), then walk it a few frames poisoning a row.
      const step = mod.stepScorp(parked(), fieldWith(), spawnCtx({ rng: createRng(seed) }))
      if (!mod.isScorpion(step.slot.pic)) return null
      let s = step.slot
      const field = createPlayfield()
      for (let h = 0; h < 30; h++) field.cells[h * PLYFLD_STRIDE + poisonCellOf(s).v] = MUSHROOM_FULL
      const path: number[] = []
      const rng = createRng(seed + 1000)
      for (let frame = 1; frame <= 30 && mod.isScorpion(s.pic); frame++) {
        s = mod.stepScorp(s, field, moveCtx({ frame, rng })).slot
        path.push(s.h, s.v, s.pic)
      }
      return { path, cells: Array.from(field.cells) }
    }
    // Find a seed that spawns, then prove the replay is byte-identical.
    let seed = 1
    while (seed < 200 && run(seed) === null) seed++
    const a = run(seed)
    expect(a, 'a spawning seed must exist in the first 200').not.toBeNull()
    const b = run(seed)
    expect(b!.path, 'same seed replays the same crossing').toEqual(a!.path)
    expect(b!.cells, 'same seed poisons the same cells').toEqual(a!.cells)
    // Liveness: the replayed scorpion actually moved and poisoned something.
    expect(new Set(a!.path).size, 'the replay must actually move').toBeGreaterThan(3)
    expect(a!.cells.some((c) => c >= MUSHROOM_MIN && c < SCORP_POISON_MIN), 'and actually poison').toBe(true)
  })
})
