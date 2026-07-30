// tests/core/collision-tables.test.ts
//
// Story bz3-4 — RED phase (O'Brien / TEA). PER-TYPE COLLISION TABLES
// (Cluster C4: F-006 tank-vs-obstacle, F-007 shell-vs-obstacle).
//
// The clone flattens the ROM's TWO distinct per-type proximity tables into one
// reused Euclidean "tank footprint" circle (movement.OBSTACLE_RADIUS), then:
//   * tank-vs-obstacle  SUMS player radius + footprint (~1876-2283 units), where
//     the ROM compares raw centre distance to a single per-type PROXTB value.
//   * shell-vs-obstacle  REUSES that same tank footprint (724-1131 units), where
//     the ROM has a SEPARATE, much smaller PRXTBL table applied AFTER a >>2 shift
//     of the range (so a projectile clips near an obstacle's surface, not out at
//     the hull footprint).
//
// These tests pin the ROM tables BEHAVIOURALLY against the public collision
// predicates (movement.isBlocked / firing.shellBlocked). They are
// implementation-agnostic: any GREEN that reproduces the per-type thresholds —
// whether it stores PROXTB/PRXTBL verbatim or the pre-scaled effective radii —
// satisfies them. Each ROM magnitude carries its BZONE.MAC citation.
//
// PRIMARY SOURCE — ~/Projects/battlezone-source-text/BZONE.MAC (the citable,
// LF sibling; the CRLF ~/Projects/battlezone-source is NOT citable). Mind the
// radix: PROXTB is `.WORD` in a `.RADIX 16` region (340 = $340 = 832 decimal);
// PRXTBL uses trailing-period DECIMAL bytes inside that hex region (56. = 56).
//
//   TANK-vs-obstacle  OBJOBJ (BZONE.MAC:3600-3689):
//     :3632-3634  LDA AY,PTBLO1 / ASL / TAX   — object TYPE CODE, doubled, is the
//                                               PROXTB *word* index (type→word[type])
//     :3652-3656  LDA AX,PROXTB / CMP TEMP3 / LDA AX,PROXTB+1 / SBC TEMP3+1
//                                             — raw centre distance vs PROXTB[type]
//     :3690       PROXTB: .WORD 340,340       — word[0]=$340=832, word[1]=$340=832
//     :3694              .WORD 400,0,0,3C0    — word[12]=$400=1024, word[15]=$3C0=960
//
//   SHELL-vs-obstacle  COLCHK (BZONE.MAC:2408-2444):
//     :2420-2428  LDA MOUTLO..ROR TEMP3 (×2)  — range shifted RIGHT TWICE (>>2)
//     :2432-2433  LDX AY,PTBLO1 / LDA AX,PRXTBL — type CODE is the PRXTBL *byte* index
//     :2435-2436  CMP TEMP3 / BCC 40$          — hit iff PRXTBL[type] >= (dist>>2),
//                                                i.e. effective radius = PRXTBL[type] << 2
//     :2510       PRXTBL: .BYTE 56.,88.        — byte[0]=56, byte[1]=88 (DECIMAL)
//     :2514              .BYTE 86.,0,0,0       — byte[12]=86, byte[15]=0
//
// TYPE CODE → ObstacleType (src/core/obstacles.ts:30-31, byte-decoded from
// obstacle_t_f $3fcc): $00 narrow-pyramid, $01 tall-box, $0c wide-pyramid,
// $0f short-box. Both ROM tables are indexed by this same code, so:
//
//     type            code   PROXTB (tank)     PRXTBL (shell, <<2 → effective)
//     narrow-pyramid  $00    832               56  →  224
//     tall-box        $01    832               88  →  352
//     wide-pyramid    $0c    1024              86  →  344
//     short-box       $0f    960                0  →    0  (shells PASS THROUGH!)
//
// NOTE — the short-box asymmetry is real and citable: PROXTB[15]=$3C0 blocks a
// TANK at 960, but PRXTBL[15]=0 means SHELLS are never stopped by a short box
// (BZONE.MAC:3694 vs :2514). The finding's "56/88/86" lists only the three
// NON-ZERO shell entries; the fourth indexed slot (short-box) is 0. See the
// bz3-4 session Delivery Findings.
//
// Units are the ROM Math-Box world units at the 15.625 Hz game frame (bz3-1);
// obstacle positions are the byte-exact ROM table (src/core/obstacles.ts).

import { describe, it, expect } from 'vitest'
import { isBlocked } from '../../src/core/movement'
import { shellBlocked } from '../../src/core/firing'
import { OBSTACLES, type Obstacle, type ObstacleType } from '../../src/core/obstacles'

// --- ROM tables, per obstacle type (see the header citations) ----------------

/** PROXTB[type] — tank-vs-obstacle collide distance, Math-Box units. */
const PROXTB: Readonly<Record<ObstacleType, number>> = {
  'narrow-pyramid': 832, // BZONE.MAC:3690 PROXTB word[0] = $340 (type $00)
  'tall-box': 832, //       BZONE.MAC:3690 PROXTB word[1] = $340 (type $01)
  'wide-pyramid': 1024, //  BZONE.MAC:3694 PROXTB word[12] = $400 (type $0c)
  'short-box': 960, //      BZONE.MAC:3694 PROXTB word[15] = $3C0 (type $0f)
}

/** PRXTBL[type] — RAW shell-vs-obstacle byte; effective radius = value << 2. */
const PRXTBL_RAW: Readonly<Record<ObstacleType, number>> = {
  'narrow-pyramid': 56, // BZONE.MAC:2510 PRXTBL byte[0] = 56. (type $00)
  'tall-box': 88, //       BZONE.MAC:2510 PRXTBL byte[1] = 88. (type $01)
  'wide-pyramid': 86, //   BZONE.MAC:2514 PRXTBL byte[12] = 86. (type $0c)
  'short-box': 0, //       BZONE.MAC:2514 PRXTBL byte[15] = 0  (type $0f)
}

/** Effective shell radius = PRXTBL[type] << 2 (BZONE.MAC:2420-2428, the >>2 on range). */
const SHELL_EFF: Readonly<Record<ObstacleType, number>> = {
  'narrow-pyramid': 56 << 2, // 224
  'tall-box': 88 << 2, //      352
  'wide-pyramid': 86 << 2, //  344
  'short-box': 0 << 2, //        0
}

const TANK_TYPES: ObstacleType[] = ['narrow-pyramid', 'tall-box', 'wide-pyramid', 'short-box']

// --- Choosing an isolated probe obstacle -------------------------------------
//
// isBlocked / shellBlocked scan ALL 21 obstacles, so a probe point must lie
// within collision range of exactly ONE. For each type we pick the obstacle
// whose nearest neighbour is farthest away, then guard that isolation: with the
// nearest OTHER obstacle >5000 units off and every probe within ~1500 of the
// chosen centre, no other footprint can perturb the result (the largest table
// value is 1024, the largest CURRENT clone threshold ~2283).

function mostIsolated(type: ObstacleType): { o: Obstacle; nn: number } {
  let best: Obstacle | null = null
  let bestNN = -1
  for (const o of OBSTACLES) {
    if (o.type !== type) continue
    let nn = Infinity
    for (const p of OBSTACLES) {
      if (p === o) continue
      const d = Math.hypot(o.x - p.x, o.z - p.z)
      if (d < nn) nn = d
    }
    if (nn > bestNN) {
      bestNN = nn
      best = o
    }
  }
  if (!best) throw new Error(`no obstacle of type ${type}`)
  return { o: best, nn: bestNN }
}

describe('probe obstacles are isolated (test precondition)', () => {
  it.each(TANK_TYPES)('a %s obstacle exists whose neighbourhood is clear', (type) => {
    const { nn } = mostIsolated(type)
    // Comfortably clear of the largest current clone threshold (~2283) plus the
    // ~1500-unit probe reach, so only the chosen footprint is ever in range.
    expect(nn).toBeGreaterThan(5000)
  })
})

// =============================================================================
// AC-1 — Tank-vs-obstacle uses the per-type PROXTB radii, not the summed-radii
//        (~1876-2283) approximation.  (F-006)
// =============================================================================

describe('AC-1 tank-vs-obstacle: per-type PROXTB radius (F-006)', () => {
  // Per type: blocked just INSIDE the ROM radius, open just OUTSIDE it. The
  // "open just outside" assertion is the RED one — today's clone still blocks
  // out at PLAYER_RADIUS+footprint (~1876-2283), roughly 2x too far. The "inside"
  // assertion is a GREEN pin that guards against a too-small radius.
  it.each(TANK_TYPES)('%s blocks a tank inside PROXTB and clears it just outside', (type) => {
    const { o } = mostIsolated(type)
    const r = PROXTB[type]

    // Just inside the ROM collide distance → blocked (ROM and current agree here).
    expect(isBlocked(o.x + (r - 1), o.z), `${type}: tank must be blocked at ${r - 1} < PROXTB ${r}`).toBe(
      true,
    )
    // Just OUTSIDE the ROM collide distance → open ground. Current clone still
    // blocks here (its threshold is ~2x r), so this FAILS pre-fix. Pins r from above.
    expect(
      isBlocked(o.x + (r + 1), o.z),
      `${type}: tank must be CLEAR at ${r + 1} > PROXTB ${r} (clone still blocks ~${type === 'wide-pyramid' ? 2283 : 1876})`,
    ).toBe(false)
    // Symmetric on the -Z axis — the radius is direction-independent.
    expect(isBlocked(o.x, o.z - (r + 1)), `${type}: clear just outside PROXTB on -Z too`).toBe(false)
  })

  it('the ~2x-too-far summed-radii block is gone (narrow-pyramid at 1500)', () => {
    // 1500 is inside the CURRENT clone block (PLAYER_RADIUS 1152 + 724 ≈ 1876)
    // but well outside PROXTB 832 → ROM leaves it open ground. RED today.
    const { o } = mostIsolated('narrow-pyramid')
    expect(isBlocked(o.x + 1500, o.z), 'PROXTB 832: a tank at 1500 must NOT be blocked').toBe(false)
  })

  it('the four PROXTB thresholds are DISTINCT per type — not one flat circle', () => {
    // A wide-pyramid (PROXTB 1024) blocks a tank at 900; a narrow-pyramid
    // (PROXTB 832) does NOT. A single reused radius could not do both → this
    // pins the per-type distinction the story is about. The narrow assertion is RED.
    const wide = mostIsolated('wide-pyramid').o
    const narrow = mostIsolated('narrow-pyramid').o
    expect(isBlocked(wide.x + 900, wide.z), 'wide-pyramid (PROXTB 1024) blocks at 900').toBe(true)
    expect(isBlocked(narrow.x + 900, narrow.z), 'narrow-pyramid (PROXTB 832) is CLEAR at 900').toBe(
      false,
    )
  })
})

// =============================================================================
// AC-2 — Shell-vs-obstacle uses the distinct PRXTBL table (56/88/86) with the
//        ROM's >>2 range scaling, not the tank-footprint radius.  (F-007)
// =============================================================================

describe('AC-2 shell-vs-obstacle: per-type PRXTBL radius with >>2 scaling (F-007)', () => {
  // narrow/tall/wide have non-zero PRXTBL entries → effective radius = raw<<2.
  // The "inside" assertion (eff-1 blocked) forces the <<2 to be applied: without
  // it a Dev using the raw byte (56/88/86) directly would leave eff-1 unblocked.
  // The "outside" assertion (eff+1 clear) is RED today — the clone still uses the
  // big tank footprint (724-1131), far beyond the shell's true clip radius.
  it.each(['narrow-pyramid', 'tall-box', 'wide-pyramid'] as ObstacleType[])(
    '%s stops a shell at PRXTBL<<2 and passes it just beyond',
    (type) => {
      const { o } = mostIsolated(type)
      const eff = SHELL_EFF[type]
      const raw = PRXTBL_RAW[type]

      // Inside the >>2-scaled radius → shell blocked. Guards the <<2: at eff-1
      // (e.g. 223) a raw-only radius of `raw` (e.g. 56) would NOT block.
      expect(
        shellBlocked(o.x + (eff - 1), o.z),
        `${type}: shell must stop at ${eff - 1} < PRXTBL ${raw}<<2 = ${eff}`,
      ).toBe(true)
      // Just beyond → shell flies on. Clone still blocks here (tank footprint
      // 724-1131), so this FAILS pre-fix. Pins the effective radius from above.
      expect(
        shellBlocked(o.x + (eff + 1), o.z),
        `${type}: shell must PASS at ${eff + 1} > ${eff} (clone still stops it at the tank footprint)`,
      ).toBe(false)
    },
  )

  it('short-box is TRANSPARENT to shells — PRXTBL[15]=0 (ROM asymmetry)', () => {
    // PROXTB[15]=$3C0 blocks a TANK at 960, but PRXTBL[15]=0 means a SHELL is
    // never stopped by a short box (BZONE.MAC:2514). The clone wrongly stops
    // shells at the tank footprint (~905), so every point here FAILS pre-fix.
    const { o } = mostIsolated('short-box')
    for (const d of [50, 100, 300, 600, 900]) {
      expect(shellBlocked(o.x + d, o.z), `short-box must NOT stop a shell at ${d} (PRXTBL[15]=0)`).toBe(
        false,
      )
    }
    // …while a TANK is still blocked by that same short box (PROXTB 960) — the
    // two tables genuinely diverge for this type.
    expect(isBlocked(o.x + 800, o.z), 'the same short box still blocks a TANK at 800 (PROXTB 960)').toBe(
      true,
    )
  })

  it('the shell table is a DISTINCT, smaller table than the tank table', () => {
    // At 500 units from a narrow-pyramid: inside PROXTB 832 (tank blocked) but
    // outside the shell eff-radius 224 (shell passes). One reused radius cannot
    // do both. The shell assertion is RED today (clone shell radius 724 > 500).
    const { o } = mostIsolated('narrow-pyramid')
    expect(isBlocked(o.x + 500, o.z), 'narrow-pyramid blocks a TANK at 500 (< PROXTB 832)').toBe(true)
    expect(shellBlocked(o.x + 500, o.z), 'narrow-pyramid PASSES a SHELL at 500 (> eff 224)').toBe(false)
  })
})
