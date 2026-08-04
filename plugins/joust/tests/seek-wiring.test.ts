// tests/seek-wiring.test.ts
//
// Story uf1-8 — RED phase (Leeloo / TEA). The DYTBL flight-control rows: the
// long/short RANGE SEEK gates and the PDIST "distance to go" budgets, wired
// through their real consumers on the uf1-2 seam (difficulty.waveValue).
//
// THE TEN ROWS AND THEIR SINGLE ROM CONSUMERS (each recovered by grepping the
// label in JOUSTRV4.SRC; the DYTBL source lines are :7304-7331):
//
//   BODNRG :3801  `CMPD BODNRG  #DYLEN         LONG OR SHORT RANGE SEEK`
//   BODNDI :3803  `LDD BODNDI   -DYLEN*256     SET DISTANCE TO GO DOWN`
//   BOUPRG :3844  `CMPD BOUPRG  #-DYLEN        LONG OR SHORT RANGE SEEK`
//   BOUPDI :3851  `LDD BOUPDI   #DYLEN*256     NO, SET DISTANCE TO GO UP`
//   HUDNRG :3984  `SUBD HUDNRG  #B2YLEN        LONG OR SHORT RANGE SEEK`
//   HUDNDI :3988  (B2DNST) — the hunter's down budget
//   HUUPRG :4028  `CMPD HUUPRG  #-B2YLEN       LONG/SHORT RANGE SEEK`
//   HUUPDI :4035  (B2UPST) — the hunter's up budget
//   SHDNRG :4243  `SUBD SHDNRG  #SHYLEN        LONG OR SHORT RANGE SEEK`
//   SHUPRG :4257  `CMPD SHUPRG  #-SHYLEN       LONG OR SHORT RANGE SEEK`
//
// THE NAMING TRAP (uf1-2 hit it): RG is RanGe, NOT eneRGy — `DYLEN EQU $14-6`
// = 14, BODNRG's GA1-5 start is $000E = 14, and the ROM comment says RANGE
// SEEK outright. The RG rows are whole-PIXEL Y-deltas; the DI rows are the
// same lengths in posY SUBPIXELS (−$0E00 = 14 px of travel) — one DYLEN, two
// radixes.
//
// THE BOLEV ROUTING (jt8-1's handoff #1): the ROM reaches BODNRG only after
// `JSR SELPLY / BEQ BOLEVV  BR=NO PLAYERS HERE` (:3796-3797) and the down/up
// split (:3800). A no-target bounder flies BOLEV, the level seek (:3903), and
// NEVER consults BODNVY — while the shipped smartDecision falls through to the
// down-seek brake. Fixing that routing is this story's, not a separate one.
//
// THE STAGING TRAP (jt8-1's handoff #2): the seek-up clause pre-empts every
// down-seek row for a quarry ABOVE the buzzard, so end-to-end probes stage the
// knights BELOW (the knightsBelowTheBuzzards fix from
// tests/difficulty-wiring.test.ts) and GUARD that the run reached the region
// where the new rows decide, count-first (lang-review #15).
//
// Every test NAMES the mutant it kills.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadDifficulty, type DyRowName } from './helpers/difficulty-contract.js'
import {
  loadEnemy,
  type EnemyState,
  type PlayerView,
  type SeekState,
} from './helpers/enemy-contract.js'
import { loadDemo, type DemoState } from './helpers/demo-contract.js'

const coreDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'core')
const readCore = (f: string): string => readFileSync(join(coreDir, f), 'utf8')

// ─────────────────────────────────────────────────────────────────────────────
// THE TEN-ROW SPEC — derived BY HAND from the committed DYWORD rows and
// re-derived independently by the engine (the double-entry the epic has used
// since jt1-2). These literals are the SPEC — if the module disagrees, the
// module is wrong.
//
// At GA1 = 5 (the shipped default): tier column 1, cadence nibble = LOW nibble
// of timeBytes[2]. Every RG row and the two HU DI rows carry nibble 15 (steps
// at waves 3, 18, 33…); the two BO DI rows carry nibble 2 (steps at 3, 5, 7…)
// — which is exactly what makes wave 5 the twin-teller below.
//
// The wave-1 column-1 values of the BOUNDER and HUNTER rows reproduce the
// pre-DYTBL immediates the ROM's trailing comments still record (#DYLEN = 14,
// #-DYLEN*256 = −3584…). The SHADOW's do NOT — SHYLEN is also 14, but Williams
// retuned the shadow's gates when DYTBL replaced the immediates (SHDNRG GA1-5
// starts at 16, SHUPRG at −32). The table is the truth; the trailing comment
// is history.
// ─────────────────────────────────────────────────────────────────────────────
const ROWS = {
  BODNRG: { wave1: 14, wave3: 13, rom: 'JOUSTRV4.SRC:3801' },
  BODNDI: { wave1: -3584, wave3: -3552, wave5: -3520, rom: 'JOUSTRV4.SRC:3803' },
  BOUPRG: { wave1: -14, wave3: -13, rom: 'JOUSTRV4.SRC:3844' },
  BOUPDI: { wave1: 3584, wave3: 3552, wave5: 3520, rom: 'JOUSTRV4.SRC:3851' },
  HUDNRG: { wave1: 14, wave3: 13, rom: 'JOUSTRV4.SRC:3984' },
  HUDNDI: { wave1: -3584, wave3: -3552, wave5: -3552, rom: 'JOUSTRV4.SRC:3988' },
  HUUPRG: { wave1: -14, wave3: -13, rom: 'JOUSTRV4.SRC:4028' },
  HUUPDI: { wave1: 3584, wave3: 3552, wave5: 3552, rom: 'JOUSTRV4.SRC:4035' },
  SHDNRG: { wave1: 16, wave3: 15, rom: 'JOUSTRV4.SRC:4243' },
  SHUPRG: { wave1: -32, wave3: -31, rom: 'JOUSTRV4.SRC:4257' },
} as const

const TEN = Object.keys(ROWS) as readonly (keyof typeof ROWS)[]

/** The staged enemy's whole-pixel Y — mid-air, above the lava, below the ceiling. */
const ENEMY_PIXEL_Y = 0x60

/**
 * A smart enemy staged at a chosen Y-velocity, optionally mid-episode.
 * `velXIndex` 0 with every staged player at index 2 keeps the jt8-2 homing
 * throttle out of the frame — a mismatched wake never ticks, so no facing flip
 * can contaminate a decision or an entity assertion.
 */
const smartEnemy = (
  brain: 'boundr' | 'b2undr' | 'shadow',
  over: { velY?: number; pixelY?: number; seek?: SeekState; airborne?: boolean } = {},
): EnemyState => ({
  entity: {
    posX: 100,
    posY: (over.pixelY ?? ENEMY_PIXEL_Y) << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: over.velY ?? 0,
    timeUp: 0,
    groundState: null,
    plantZ: 0,
    airborne: over.airborne ?? true,
  },
  brain,
  decision: brain,
  pchase: 1,
  facing: 1,
  ...(over.seek !== undefined ? { seek: over.seek } : {}),
})

/** A player parked `delta` whole pixels below (+) or above (−) the staged enemy. */
const at = (delta: number): PlayerView => ({ pixelY: ENEMY_PIXEL_Y + delta, velXIndex: 2 })

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — the ten rows anchor to the table: wave-1 immediates, wave-3
//        escalation, and the wave-5 twin-teller. (These pass before the wiring
//        lands — they are the double entry every literal below leans on.)
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-1 — the ten-row spec anchors to the committed table', () => {
  it('reads each pre-DYTBL immediate on wave 1 at the shipped GA1', async () => {
    const d = await loadDifficulty()
    // Kills the mutant "spec drift": a hand-typed literal below that disagrees
    // with the engine's own decode dies HERE, not in a wiring test's staging.
    for (const name of TEN) {
      expect(d.waveValue(name as DyRowName, 1), `${name} wave 1 — ${ROWS[name].rom}`).toBe(
        ROWS[name].wave1,
      )
    }
  })

  it('escalates every row by wave 3 — and waves 1-2 hold the start', async () => {
    const d = await loadDifficulty()
    for (const name of TEN) {
      // Kills "return the start forever" per row, and pins the direction of
      // every walk (down gates and budgets SHRINK toward the player, up gates
      // rise toward zero) without a single re-derived value.
      expect(d.waveValue(name as DyRowName, 3), `${name} must step on wave 3`).toBe(ROWS[name].wave3)
      expect(d.waveValue(name as DyRowName, 2), `${name} wave 2 still reads the start`).toBe(
        ROWS[name].wave1,
      )
    }
  })

  it('tells the bounder/hunter DI twins apart on wave 5 — the nibble is the witness', async () => {
    const d = await loadDifficulty()
    // BODNDI/HUDNDI (and BOUPDI/HUUPDI) share every column; only their cadence
    // nibbles differ (2 vs 15). Wave 5 is the first wave they disagree, which is
    // what makes the "wire one row into both brains" mutant killable at all.
    expect(d.waveValue('BODNDI', 5), 'BODNDI steps again on wave 5 (nibble 2)').toBe(
      ROWS.BODNDI.wave5,
    )
    expect(d.waveValue('HUDNDI', 5), 'HUDNDI holds until wave 18 (nibble 15)').toBe(
      ROWS.HUDNDI.wave5,
    )
    expect(d.waveValue('BODNDI', 5)).not.toBe(d.waveValue('HUDNDI', 5))
    expect(d.waveValue('BOUPDI', 5), 'BOUPDI steps again on wave 5').toBe(ROWS.BOUPDI.wave5)
    expect(d.waveValue('HUUPDI', 5), 'HUUPDI holds until wave 18').toBe(ROWS.HUUPDI.wave5)
    expect(d.waveValue('BOUPDI', 5)).not.toBe(d.waveValue('HUUPDI', 5))
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — the RANGE GATE: long vs short on the whole-pixel Y-delta, strict-
//        inclusive on the long side, per brain, per direction, per WAVE.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-2 — the range gate routes long vs short seek', () => {
  it('bounder DOWN: one pixel decides seek vs level (CMPD BODNRG / BLT, :3801-3802)', async () => {
    const e = await loadEnemy()
    // velY $80: falling, under EVERY brake rung — so a flap can only come from
    // the LEVEL law (flap iff falling), never from the brake. The two halves
    // differ by ONE pixel of geometry; a brain with no gate gives the same
    // answer twice and fails whichever half it does not match.
    const falling = smartEnemy('boundr', { velY: 0x80 })
    expect(
      e.boundr(falling, at(14), 1).flap,
      'delta 14 = BODNRG(1) → LONG range: the arm wake runs the brake law, $80 < $100 → wings up',
    ).toBe(false)
    expect(
      e.boundr(falling, at(13), 1).flap,
      'delta 13 < BODNRG(1) → SHORT range: BOLEV flaps a falling buzzard',
    ).toBe(true)
    // The split itself (:3800) is signed on the delta: a quarry on the SAME
    // line (delta 0) is the down branch's shortest case → level, not a seek.
    expect(e.boundr(falling, at(0), 1).flap, 'delta 0 → level flight → flap the fall').toBe(true)
  })

  it('bounder DOWN gate MIRRORS the wave: delta 13 is short on wave 1 and LONG on wave 3', async () => {
    const e = await loadEnemy()
    const falling = smartEnemy('boundr', { velY: 0x80 })
    // Same geometry, same fall — only the wave differs. Kills "hardcode 14":
    // BODNRG walks 14 → 13 on wave 3, so the same quarry flips from short
    // (level flaps the fall) to long (the brake holds its wings).
    expect(e.boundr(falling, at(13), 1).flap, 'wave 1: 13 < 14 → short → BOLEV flaps').toBe(true)
    expect(e.boundr(falling, at(13), 3).flap, 'wave 3: 13 ≥ 13 → LONG → brake law, $80 < $120').toBe(
      false,
    )
  })

  it('hunter DOWN routes through a gate of its own (SUBD HUDNRG / BLT, :3984-3985)', async () => {
    const e = await loadEnemy()
    const falling = smartEnemy('b2undr', { velY: 0x80 })
    // The same one-pixel discriminator through b2undr. (HUDNRG's GA1-5 curve is
    // IDENTICAL to BODNRG's — see the source anchor below for why that is the
    // only way to tell the twins apart.)
    expect(e.b2undr(falling, at(14), 1).flap, 'delta 14 → LONG → brake law, wings up').toBe(false)
    expect(e.b2undr(falling, at(13), 1).flap, 'delta 13 → SHORT → B2LEV flaps the fall').toBe(true)
  })

  it('bounder UP: the gate is invisible in flap-space and VISIBLE in the workspace', async () => {
    const e = await loadEnemy()
    // Short-range up (level: flap iff falling) and long-range up (climb: flap
    // iff not rising) collapse to the SAME per-wake flap — deliberately, since
    // the BOUPWD/BOUPWU wing cadences are uf1-9's. What tells them apart is the
    // committed episode: only the LONG decide arms BOUPDI (:3851-3852).
    const still = smartEnemy('boundr', { velY: 0 })
    const long = e.stepEnemy(still, { player: at(-14), wave: 1 })
    expect(long.seek, 'delta −14 = BOUPRG(1) → LONG up: BOUPDI armed, unspent').toEqual({
      mode: 'up',
      pdist: ROWS.BOUPDI.wave1,
    })
    const short = e.stepEnemy(still, { player: at(-13), wave: 1 })
    expect(short.seek, 'delta −13 > BOUPRG(1) → SHORT: level flight carries NO workspace').toBe(
      undefined,
    )
  })

  it('shadow SHORT band flaps even mid-RISE — and the gate mirrors the wave (SHLEP, :4277-4291)', async () => {
    const e = await loadEnemy()
    // SHLEP tracks the PLAYER'S line with NO velY gate (`CMPB PDIST+1,U / BLS`)
    // — a shadow below its quarry flaps whether or not it is already rising.
    // The long-range up-seek DOES gate on the rise, so the range boundary is
    // visible exactly there, and it moves with the wave (SHUPRG −32 → −31).
    // uf1-9 re-staged this rise, and did NOT touch an expectation. The four
    // assertions and their meanings are unchanged; only the fixture's speed
    // moved, because the long-range branch's gate did. When this was written the
    // shadow's up-seek was approximated as `flap: velY >= 0`, so ANY rise
    // suppressed the flap and −$50 was enough. uf1-9 wired the row the ROM
    // actually compares (`CMPD SHUPVY / BLT SHUP0`, :4271-4273): the gate is
    // −$200 at wave 1 and −$400 at wave 3, so a −$50 rise is INSIDE it and flaps
    // on both sides of the range boundary — which would leave this test unable to
    // see the SHUPRG boundary at all. −$600 clears the gate at both waves, so the
    // long branch stays wings-up and the boundary is visible exactly where it was.
    const rising = smartEnemy('shadow', { velY: -0x600 })
    expect(
      e.shadow(rising, at(-31), 1).flap,
      'wave 1: −31 > SHUPRG(1) = −32 → SHORT → SHLEP flaps below the player, even rising',
    ).toBe(true)
    expect(
      e.shadow(rising, at(-33), 1).flap,
      'wave 1: −33 < −32 → LONG up-seek → already rising → wings up',
    ).toBe(false)
    expect(
      e.shadow(rising, at(-32), 1).flap,
      'wave 1: −32 = SHUPRG(1) exactly → LONG (BGT is strict) → wings up',
    ).toBe(false)
    expect(
      e.shadow(rising, at(-31), 3).flap,
      'wave 3: SHUPRG has walked to −31 → the same quarry is now LONG → wings up',
    ).toBe(false)
  })

  it('shadow DOWN stays a wings-up drop on BOTH sides of SHDNRG — pinned by anchor, said out loud', async () => {
    const e = await loadEnemy()
    // SHDN (long, :4246-4248) drops with no flap; SHLEP with the player BELOW
    // (short) sits at-or-above the tracked line → wings up too. The SHDNRG
    // routing is extensionally invisible above the lava — asserting both sides
    // here documents that, and the source anchor below is what actually guards
    // the row. (Below $D3 the lava escape flaps in every branch — unchanged.)
    const falling = smartEnemy('shadow', { velY: 0x180 })
    expect(e.shadow(falling, at(20), 1).flap, 'delta 20 ≥ 16 → SHDN: the no-flap drop').toBe(false)
    expect(e.shadow(falling, at(8), 1).flap, 'delta 8 < 16 → SHLEP above the line: wings up').toBe(
      false,
    )
  })

  it('anchors the rows no behavior can reach: the twins and the shadow down-gate', () => {
    const src = readCore('enemy.ts')
    // HUDNRG/HUUPRG duplicate BODNRG/BOUPRG at every GA1-5 wave, and SHDNRG's
    // routing is flap-invisible — so "wire the bounder's row into the hunter"
    // and "never read SHDNRG at all" survive every extensional test above.
    // Anchor the consuming CALL, not the word (lang-review #15): swapping the
    // row name or deleting the call flips the regex. Mutation-tested by
    // construction — enemy.ts contains no such call today, so these are RED.
    expect(src, 'the hunter must read ITS down gate').toMatch(/waveValue\(\s*'HUDNRG'/)
    expect(src, 'the hunter must read ITS up gate').toMatch(/waveValue\(\s*'HUUPRG'/)
    expect(src, 'the shadow must read its down gate').toMatch(/waveValue\(\s*'SHDNRG'/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — the BOLEV routing: a no-target smart buzzard flies LEVEL and the
//        wired dial goes dark (`JSR SELPLY / BEQ BOLEVV`, :3796-3797).
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-3 — no players here: BOLEV, and never the brake', () => {
  it('a no-target bounder flaps ANY fall — BODNVY has nothing to say (:3797 → :3903)', async () => {
    const e = await loadEnemy()
    // The shipped smartDecision falls through to the brake when the target is
    // null, so it reads the wired dial in a state the 1982 machine does not.
    // BOLEV's per-wake law is "flap iff falling" — at EVERY fall speed, on
    // EVERY wave.
    expect(
      e.boundr(smartEnemy('boundr', { velY: 0x80 }), null, 1).flap,
      'falling at $80 — under the wave-1 brake, but BOLEV flaps any fall',
    ).toBe(true)
    expect(
      e.boundr(smartEnemy('boundr', { velY: -0x50 }), null, 1).flap,
      'already rising → wings up',
    ).toBe(false)
    // Wave-invariance is the "dial goes dark" proof: $110 sits INSIDE the
    // wave-1/wave-3 brake window, so a brain still consulting BODNVY answers
    // differently across these waves; BOLEV answers the same.
    const fall = smartEnemy('boundr', { velY: 0x110 })
    for (const wave of [1, 3, 11]) {
      expect(e.boundr(fall, null, wave).flap, `wave ${wave}: no target → BOLEV → flap`).toBe(true)
    }
  })

  it('a no-target hunter likewise flies B2LEV (:3979-3980 → :4054)', async () => {
    const e = await loadEnemy()
    expect(
      e.b2undr(smartEnemy('b2undr', { velY: 0x180 }), null, 1).flap,
      'falling at $180 — under HUDNVY(1) = $200, but B2LEV flaps any fall',
    ).toBe(true)
    expect(
      e.b2undr(smartEnemy('b2undr', { velY: -0x50 }), null, 1).flap,
      'rising → wings up',
    ).toBe(false)
  })

  it('the no-target shadow lord is UNCHANGED — SHLEV wings up above the lava, escapes below', async () => {
    const e = await loadEnemy()
    // SHLEV tracks its own line at-or-above → wings up: exactly the shipped
    // behavior. This is the guard that the BOLEV fix does not leak a
    // flap-when-falling law into the one brain whose level seek has the
    // OPPOSITE polarity (`CMPB PDIST+1,U / BLS SHLEPA`).
    expect(
      e.shadow(smartEnemy('shadow', { velY: 0x400 }), null, 1).flap,
      'plummeting at $400 with no target, above $D3 → still a wings-up drop',
    ).toBe(false)
    expect(
      e.shadow(smartEnemy('shadow', { velY: 0x180, pixelY: 0xe0 }), null, 1).flap,
      'below $D3 → the lava escape flaps, target or none',
    ).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — the PDIST budget: armed unspent, spent by entry velY in the episode's
//        direction only, committed until it crosses zero, re-decided the same
//        wake, never re-seeded mid-flight.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-4 — the PDIST distance-to-go budget', () => {
  it('ARMS the wave\'s row on a long-range down decide, unspent (:3803-3804), at the LIVE wave', async () => {
    const e = await loadEnemy()
    const falling = smartEnemy('boundr', { velY: 0x80 })
    // The arm wake performs no ADDD — pdist is the row value EXACTLY. Wave 3
    // arms the walked value, killing "hardcode −3584" and "arm then spend the
    // same wake" in one pair.
    expect(e.stepEnemy(falling, { player: at(40), wave: 1 }).seek, 'wave 1 arms BODNDI(1)').toEqual(
      { mode: 'down', pdist: ROWS.BODNDI.wave1 },
    )
    expect(e.stepEnemy(falling, { player: at(40), wave: 3 }).seek, 'wave 3 arms BODNDI(3)').toEqual(
      { mode: 'down', pdist: ROWS.BODNDI.wave3 },
    )
  })

  it('SPENDS the wake\'s ENTRY velY, only while moving with the episode (:3813-3817)', async () => {
    const e = await loadEnemy()
    const spending = smartEnemy('boundr', {
      velY: 0x100,
      seek: { mode: 'down', pdist: ROWS.BODNDI.wave1 },
    })
    const snap = structuredClone(spending)
    const after = e.stepEnemy(spending, { player: at(40), wave: 1 })
    // Entry velY, not the post-integration one: the brain runs before the move,
    // exactly as the PJOY routine writes CURJOY before the mover consumes it.
    expect(after.seek, '−3584 + $100 → −3328, still committed').toEqual({
      mode: 'down',
      pdist: ROWS.BODNDI.wave1 + 0x100,
    })
    expect(spending, 'stepEnemy did not mutate its input (purity)').toEqual(snap)

    const rebounding = smartEnemy('boundr', {
      velY: -0x40,
      seek: { mode: 'down', pdist: -1000 },
    })
    const held = e.stepEnemy(rebounding, { player: at(40), wave: 1 })
    expect(held.seek, 'a RISING wake in a down episode spends nothing (`BMI`, :3814)').toEqual({
      mode: 'down',
      pdist: -1000,
    })
  })

  it('COMMITS: a quarry above cannot pre-empt an unspent down-seek (BODN1 never re-runs SELPLY)', async () => {
    const e = await loadEnemy()
    // THE story headline. Mid-episode the ROM's brain is BODN1/BODN2 — there is
    // no SELPLY there, so the player moving ABOVE the buzzard changes nothing
    // until the budget is spent. The shipped per-wake brain re-decides every
    // wake and flaps for the altitude instead.
    const committed = smartEnemy('boundr', {
      velY: 0x80,
      seek: { mode: 'down', pdist: ROWS.BODNDI.wave1 },
    })
    expect(
      e.boundr(committed, at(-60), 1).flap,
      'bounder: in-episode the brake law decides — $80 < $100 → wings up, NOT the seek-up flap',
    ).toBe(false)
    const hunterCommitted = smartEnemy('b2undr', {
      velY: 0x80,
      seek: { mode: 'down', pdist: ROWS.HUDNDI.wave1 },
    })
    expect(e.b2undr(hunterCommitted, at(-60), 1).flap, 'hunter: same commitment').toBe(false)
    // The control that keeps this pair honest: the SAME geometry with NO
    // episode is a long-range up decide, and its arm wake flaps.
    expect(
      e.boundr(smartEnemy('boundr', { velY: 0x80 }), at(-60), 1).flap,
      'uncommitted at the same geometry → long-range up → flap',
    ).toBe(true)
  })

  it('EXHAUSTS and re-decides THE SAME WAKE (`BPL BOBRAIN` :3816, `JMP BOUNDR` :3842)', async () => {
    const e = await loadEnemy()
    // −$40 remaining + $80 of fall crosses zero → the episode dies and the
    // decide runs NOW, not next wake: quarry 60 px above at long range → the
    // fresh decide arms the UP budget at its FULL wave value. The transition is
    // computed at the step's one exit, whatever branch moved it — the
    // lang-review #14 shape.
    const exhausting = smartEnemy('boundr', {
      velY: 0x80,
      seek: { mode: 'down', pdist: -0x40 },
    })
    const after = e.stepEnemy(exhausting, { player: at(-60), wave: 1 })
    expect(after.seek, 'down died, up armed fresh — the same wake').toEqual({
      mode: 'up',
      pdist: ROWS.BOUPDI.wave1,
    })
  })

  it('the UP budget spends only while RISING and re-arms fresh on exhaust (:3855-3860)', async () => {
    const e = await loadEnemy()
    const climbing = smartEnemy('boundr', {
      velY: -0x100,
      seek: { mode: 'up', pdist: ROWS.BOUPDI.wave1 },
    })
    expect(
      e.stepEnemy(climbing, { player: at(-60), wave: 1 }).seek,
      '3584 − $100 → 3328, still climbing',
    ).toEqual({ mode: 'up', pdist: ROWS.BOUPDI.wave1 - 0x100 })

    const stalled = smartEnemy('boundr', {
      velY: 0x40,
      seek: { mode: 'up', pdist: 1000 },
    })
    expect(
      e.stepEnemy(stalled, { player: at(-60), wave: 1 }).seek,
      'a FALLING wake in an up episode spends nothing (`BPL`, :3856)',
    ).toEqual({ mode: 'up', pdist: 1000 })

    const spent = smartEnemy('boundr', {
      velY: -0x80,
      seek: { mode: 'up', pdist: 0x40 },
    })
    expect(
      e.stepEnemy(spent, { player: at(-60), wave: 1 }).seek,
      '$40 − $80 crosses zero → re-decide → the quarry is still long-range above → re-arm FULL',
    ).toEqual({ mode: 'up', pdist: ROWS.BOUPDI.wave1 })
  })

  it('the hunter arms ITS OWN rows — wave 5 tells the twins apart', async () => {
    const e = await loadEnemy()
    const falling = smartEnemy('b2undr', { velY: 0x80 })
    // BODNDI(5) = −3520, HUDNDI(5) = −3552: the one place "wire the bounder's
    // budget into the hunter" (or vice versa) shows up in a number.
    expect(
      e.stepEnemy(falling, { player: at(40), wave: 5 }).seek,
      'hunter wave 5 arms HUDNDI(5) = −3552',
    ).toEqual({ mode: 'down', pdist: ROWS.HUDNDI.wave5 })
    expect(
      e.stepEnemy(smartEnemy('boundr', { velY: 0x80 }), { player: at(40), wave: 5 }).seek,
      'bounder wave 5 arms BODNDI(5) = −3520',
    ).toEqual({ mode: 'down', pdist: ROWS.BODNDI.wave5 })
  })

  it('carries NO workspace where the ROM has none: short range, no target, the shadow, the episodeless null', async () => {
    const e = await loadEnemy()
    // Level flight is uf1-9's episode (the BOLETM family) — arming one here
    // would pre-empt that seam with an invented exit cadence.
    expect(
      e.stepEnemy(smartEnemy('boundr', { velY: 0x80 }), { player: at(8), wave: 1 }).seek,
      'short range → level → no workspace',
    ).toBe(undefined)
    expect(
      e.stepEnemy(smartEnemy('boundr', { velY: 0x80 }), { wave: 1 }).seek,
      'no target, no episode → BOLEV → no workspace',
    ).toBe(undefined)
    expect(
      e.stepEnemy(smartEnemy('shadow', { velY: 0x180 }), { player: at(40), wave: 1 }).seek,
      'the shadow has no DI rows — SHDN re-decides per wake, stateless',
    ).toBe(undefined)
    // But a LIVE episode outlives its target: BODN1 never asks SELPLY, so the
    // budget keeps spending with nobody there, and only the exhaust decide
    // routes to BOLEV.
    const orphaned = smartEnemy('boundr', {
      velY: 0x100,
      seek: { mode: 'down', pdist: ROWS.BODNDI.wave1 },
    })
    expect(
      e.stepEnemy(orphaned, { wave: 1 }).seek,
      'the committed episode spends on, target or none',
    ).toEqual({ mode: 'down', pdist: ROWS.BODNDI.wave1 + 0x100 })
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-5 — the inventory: ten dispositions flip to wired; the other eighteen
//        stand exactly where uf1-2 left them.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-5 — ROW_DISPOSITION records the wiring', () => {
  it('marks exactly the ten uf1-8 rows wired, each naming its consumer', async () => {
    const d = await loadDifficulty()
    for (const name of TEN) {
      const row = d.ROW_DISPOSITION[name as DyRowName]
      expect(row.kind, `${name} is this story's to wire (${ROWS[name].rom})`).toBe('wired')
      if (row.kind === 'wired') {
        expect(row.consumer.length, `${name} must NAME its consumer, not just claim one`).toBeGreaterThan(0)
      }
    }
  })

  it('leaves the remaining dispositions untouched — no overreach into uf1-10', async () => {
    const d = await loadDifficulty()
    expect(d.ROW_DISPOSITION.BODNVY.kind, 'uf1-2 wiring stands').toBe('wired')
    expect(d.ROW_DISPOSITION.HUDNVY.kind, 'uf1-2 wiring stands').toBe('wired')
    // jt9-1: was `dead-in-rom` on a label-keyed reading of the source. The row is
    // read four times under its RAM name (LNTLAV); this guard's job — stopping a
    // seek story reaching into rows it does not own — is unchanged.
    expect(d.ROW_DISPOSITION.LAVLAV.kind, "jt9-1's looker owns this row").toBe('wired')
    // uf1-9 HAS NOW LANDED, so these eleven are wired rather than pending. The
    // guard's job is unchanged — it stops a seek story reaching into rows it does
    // not own — so it still names them, and now requires the wiring to be REAL
    // (a named consumer) rather than merely re-labelled.
    const uf19 = [
      'BOUPWD', 'BOUPWU', 'HUUPWD', 'HUUPWU', 'BOLETM', 'HULETM', 'SHUPTM', 'SHLETM', 'SHCLTM',
      'HUUPVY', 'SHUPVY',
    ] as const
    for (const name of uf19) {
      const row = d.ROW_DISPOSITION[name]
      expect(row.kind, `${name} was wired by uf1-9`).toBe('wired')
      if (row.kind === 'wired') {
        expect(row.consumer, `${name} must NAME its consumer`).toMatch(/\S/)
      }
    }
    // uf1-10's four rows were the egg waits and the lava-troll pair. jt9-9 took
    // the egg half — the epic renumbered uf1-10 to jt9-12 and then split it, the
    // egg waits folding into jt9-9 and the troll half going on to jt9-11 — so
    // the two egg rows are now WIRED and only the troll pair is still waiting.
    // The point of this block is unchanged: this story must not overreach into
    // rows it does not own, and a row that says "wired" must name where.
    for (const name of ['EGGWT', 'EGGWT2'] as const) {
      const row = d.ROW_DISPOSITION[name]
      expect(row.kind, `${name} is the settled-egg hatch wait, wired by jt9-9`).toBe('wired')
      if (row.kind === 'wired') {
        expect(row.consumer, `${name} must NAME its consumer`).toMatch(/eggWaitFrames/)
      }
    }
    // jt9-11 wired the troll pair — `demo.stepTrolls` gives the grip a live grab, so
    // LAVTIM (the hand-animation cadence) and LAVGRA (the grip's pull) now have a
    // consumer. No DYTBL row is left waiting.
    for (const name of ['LAVTIM', 'LAVGRA'] as const) {
      const row = d.ROW_DISPOSITION[name]
      expect(row.kind, `${name} is wired by jt9-11's live lava-troll grab`).toBe('wired')
      if (row.kind === 'wired') expect(row.consumer, `${name} must NAME its consumer`).toMatch(/stepTrolls/)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-6 — the RUNNING GAME arms wave-true budgets: stepDemo, real complement,
//        knights parked below (the uf1-2 staging fix), count-first guard.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-6 — the budgets reach the cabinet', () => {
  const KNIGHTS_ON_THE_BOTTOM_ISLAND = 211

  const knightsBelowTheBuzzards = (base: DemoState): DemoState => ({
    ...base,
    sim: {
      ...base.sim,
      processes: base.sim.processes.map((p) =>
        p.kind === 'player' && p.entity
          ? { ...p, entity: { ...p.entity, posY: KNIGHTS_ON_THE_BOTTOM_ISLAND << 8 } }
          : p,
      ),
    },
  })

  /**
   * (frames-with-a-committed-down-episode, most-negative pdist observed) for
   * one frame — counted ONLY while a live knight sits at-or-below every smart
   * buzzard, so the tally certifies the regime where the new rows decide (the
   * brakeDecidingFrames discipline; the empty-knight early return is what keeps
   * a wiped-out wave from counting vacuously — `[].every` is TRUE).
   */
  const downEpisodes = (d: DemoState): { frames: number; minPdist: number | null } => {
    const knightY: number[] = []
    for (const p of d.sim.processes) {
      if (p.kind === 'player' && p.entity) knightY.push(p.entity.posY >> 8)
    }
    if (knightY.length === 0) return { frames: 0, minPdist: null }
    let frames = 0
    let minPdist: number | null = null
    for (const p of d.sim.processes) {
      if (p.kind !== 'enemy' || !p.enemy) continue
      const seek = p.enemy.seek
      if (seek === undefined || seek.mode !== 'down') continue
      const enemyY = p.enemy.entity.posY >> 8
      if (!knightY.every((y) => y >= enemyY)) continue
      frames++
      if (minPdist === null || seek.pdist < minPdist) minPdist = seek.pdist
    }
    return { frames, minPdist }
  }

  const run240 = async (counter: number): Promise<{ frames: number; minPdist: number | null }> => {
    const demo = await loadDemo()
    let s: DemoState = { ...knightsBelowTheBuzzards(demo.createWaveDemo(0x1234)), wave: counter }
    let frames = 0
    let minPdist: number | null = null
    for (let i = 0; i < 240; i++) {
      s = demo.stepDemo(s)
      const seen = downEpisodes(s)
      frames += seen.frames
      if (seen.minPdist !== null && (minPdist === null || seen.minPdist < minPdist))
        minPdist = seen.minPdist
    }
    return { frames, minPdist }
  }

  it('a wave-1 cabinet runs committed down-seeks whose floor IS the armed row', async () => {
    const d = await loadDifficulty()
    // Count FIRST (lang-review #15): with zero counted frames the floor check
    // below would compare nothing and the test would certify a cabinet that
    // never arms an episode at all — the exact regime this story retires.
    const { frames, minPdist } = await run240(1)
    expect(
      frames,
      'the run must put a smart buzzard in a committed down-seek WITH a live knight below — ' +
        'or it never exercised the new rows at all',
    ).toBeGreaterThan(0)
    // Down budgets arm at the row and only ever spend UPWARD toward zero, so
    // the most negative pdist any frame can show is the arm value itself.
    expect(minPdist, 'the deepest budget seen is BODNDI(1) — armed, never overdrawn').toBe(
      d.waveValue('BODNDI', 1),
    )
  })

  it('a wave-5 cabinet arms the WALKED budget — the seam feeds the live wave, not a literal', async () => {
    const d = await loadDifficulty()
    // Counter $05 = wave 5 (BCD and decimal agree below 10 — this test stays
    // clear of the R2-2 decode on purpose). Wave 1's complement promotes only
    // `boundr` on this seed, so every armed budget is BODNDI's: −3520 here,
    // −3584 on wave 1. A hardcoded arm value fails exactly one of the two runs.
    const { frames, minPdist } = await run240(0x05)
    expect(frames, 'the wave-5 run must reach the deciding regime too').toBeGreaterThan(0)
    expect(minPdist, 'the deepest budget seen is BODNDI(5) = −3520').toBe(d.waveValue('BODNDI', 5))
    expect(d.waveValue('BODNDI', 5), 'the two runs must disagree or this proves nothing').not.toBe(
      d.waveValue('BODNDI', 1),
    )
  })
})
