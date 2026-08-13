// tests/ddt.test.ts
//
// Story ml4-4 — RED phase (TEA). THE DDT BOMB — the signature Millipede
// subsystem: DDTS places the four-bomb DDTADD bank at wave start
// (`MLSUB.MAC:420`), SHOOT1's bomb branch starts an explosion
// (`MILLI.MAC:2014-2063`), a FRAME&7-gated state machine walks ten parallel
// offset/stamp lists to animate the cloud (`MILLI.MAC:841-989`), DDTEXP
// classifies a stamp as inside-a-cloud (`MILLI.MAC:1942`), BOMBS enters
// bee/mosquito/dragonfly during bomb mode (`MILLI.MAC:446`), and the
// SCROLD/SCROLU DDT halves (`MLSUB.MAC:1231-1295`/`:1379-1400`) — the ml3-5
// Delivery-Finding ROUTED to this story (SC-49/SC-50) — move, cull and re-seed
// the table when the playfield scrolls. Every rule below carries a DD-* claim
// in docs/rom-study/claims/13-ddt.json, GENERATED from the vendored lines and
// byte-verified by the ml1-1 gate (tests/audit/brief-dossier.test.ts sweeps
// loadClaims(), so 13-ddt.json enrolled itself).
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MILLI.MAC, MLSUB.MAC and MLDEF.MAC are `.RADIX 16`: ROM literals quoted here
// are hex unless suffixed with `.` (decimal — NDDT*2-1 aside, note `ADC I,20.`
// and `LDX I,12.` are DECIMAL 20 and 12).
//
// ─── SCOPE ──────────────────────────────────────────────────────────────────
// Upright cabinet only (CKIND clear — cocktail is ml8-3, fleet precedent) and
// the PLAYER-1 bank only (DDTS1's PLAYR<<3 bank select is ml7 wiring, DD-10).
// Caller-side seams, all documented in claims and NOT modelled here:
//   - DDTS2 standalone restore callers (DD-33/34/35 — game start + messages);
//   - CHAN2 sounds $24 (hit, DD-147) and $14 (cloud kill), SCORNG BCD wiring;
//   - BEEMV3/FLYMV3/MOSQT3 spawns (ml4-2/ml4-3 reducers — BOMBS returns a
//     DECISION; ml7 calls the critter's spawn and applies nocentDelta);
//   - DDTEX1 -> SHOOT2 kill dispatch (the per-critter reducers own scores);
//   - HITDDT reset at new wave (CENTPC, `MILLI.MAC:508` — wave story).
//
// ─── WHAT GREEN (Dev) MUST SHIP ─────────────────────────────────────────────
//   src/core/ddt.ts — pure, cited, byte semantics, conway.ts house style
//   (in-place mutation over the ml3-4 field: offset = col*0x20 + row). Exports:
//
//     NDDT = 4                        // MLDEF.MAC:191 (DD-2)
//     CLOUD_STAMP = 0x2e              // MLDEF.MAC:202 (DD-3)
//     DDT_STAMP = 0x6e                // MLDEF.MAC:203 (DD-4)
//     ROCK_STAMP = 0x70               // MLDEF.MAC:204 (DD-5)
//     PLYFLD_PAGE = 0x10              // MLDEF.MAC:103 (DD-1) — hi-byte base
//     DDT_EXPLODING_MIN = 0x14        // MLSUB.MAC:446 (DD-19) — hi >= this
//     DDT_EXPLOSION_START = 0xb4      // MILLI.MAC:2053 (DD-...) — hi OR at hit
//     DDT_EXPLOSION_STEP = 0x10       // MILLI.MAC:851 — SBC per update
//     DDT_FRAME_MASK = 7              // MILLI.MAC:842 — update every 8 frames
//     DDT_HIT_POINTS = 80             // MILLI.MAC:2058
//     DDT_ANCHOR_BACKSTEP = 0x61      // MILLI.MAC:2049 — anchor = base - $61
//     DDT_CLOUD_KILL_FLAG = 0x80      // MILLI.MAC:1947 — DDTEX1's SHOOT2 arg
//     DDTST = [0x10cd, 0x1119, 0x1233, 0x12f7]        // MLSUB.MAC:491-494
//     DDTST_ATTRACT = [0x10a3, 0x1084, 0x1086, 0]     // MLSUB.MAC:499-502
//     DDT_CLOUD_FRAMES: readonly (readonly (readonly [number, number])[])[]
//       // Ten frames indexed by the ROM's (oldHi>>4)-2 (MILLI.MAC:907-916):
//       // frame k = the RESOLVED [offset, stamp] pairs of its 90$-97$ list in
//       // ROM order, 91$/92$/93$ including their fall-through tails, stamps
//       // from the PARALLEL 99$ table (MILLI.MAC:917-989).
//     BOMBS_DELAY = 0x80              // MILLI.MAC:456-457
//     BOMBS_RND_MASK = 7              // MILLI.MAC:454
//     BOMBS_SLOTS = 13                // MILLI.MAC:458 (LDX I,12. — decimal)
//     BOMBS_CREATURES = [0x83, 0x81, 0xc0, 0x80, 0x80, 0x00] // MILLI.MAC:490-491
//     BOMBSL = [1, 3, 5, 7, 0x0b]     // MILLI.MAC:492-493
//     BOMB_MODE_NOCENT_BASE = 20      // MILLI.MAC:1921 (ADC I,20. — DECIMAL)
//     BOMB_MODE_DELAY = 0x40          // MILLI.MAC:1924-1925
//
//     interface DdtEntry { lo: number; hi: number }
//       // The DDTADD byte pair VERBATIM: hi 0 = vacant; hi $10|page = intact
//       // (offset = ((hi&3)<<8)|lo); hi >= $14 = exploding, hi nibble = state.
//     type DdtTable = DdtEntry[]      // length NDDT; table[i] <-> DDTST word i.
//       // ROM sweep order is X = 7,5,3,1 descending (DDTS1, DD-28): every
//       // reducer here visits table[3] FIRST, then 2, 1, 0.
//
//     newDdtTable(): DdtTable                     // four vacant entries
//     ddtVacant(e: Readonly<DdtEntry>): boolean   // hi === 0
//     ddtExploding(e: Readonly<DdtEntry>): boolean // hi >= DDT_EXPLODING_MIN
//     anyDdtExploding(t: readonly DdtEntry[]): boolean // MLSUB.MAC:1122 —
//       // feeds scroll.ts ScrollGate.ddtExploding (SC-7)
//     ddtOffset(e: Readonly<DdtEntry>): number    // ((hi & 3) << 8) | lo
//
//     ddtPlace(table: DdtTable, specialAttract: boolean): void
//       // DDTS placement (MLSUB.MAC:421-442 upright): copies DDTST words 0..3
//       // (or 8..11 when MODE === $FF, the special attract placements) into
//       // the table. Attract word 11 is 0 -> a vacant fourth entry.
//     ddtRestore(table: readonly DdtEntry[], field: Uint8Array): void
//       // DDTS2 (MLSUB.MAC:443-476): for every intact entry write DDT+1 at
//       // base+$20 then DDT at base — each cell only if its masked stamp is 0
//       // or >= ROCK ($01..$6F block the write). RAW stores: the grey bit is
//       // NOT preserved by the restore (unlike explosion writes).
//     ddtShoot(table: DdtTable, field: Uint8Array, offset: number,
//              stamp: number): DdtShot
//       // SHOOT1's bomb branch (MILLI.MAC:1983-1985, 2014-2063), upright.
//       // stamp is the masked stamp the shot hit (DDT_STAMP or DDT_STAMP+1 —
//       // a DDT+1 hit normalizes base = offset-$20 first). Matches the table
//       // byte-for-byte; no intact match -> { kind: 'none' } (the bomb "must
//       // be starting to explode") and NOTHING mutates. A match clears both
//       // stamp cells to the BASE cell's grey bit (the +$20 cell inherits it,
//       // MILLI.MAC:2046), rewrites the entry to the exploding anchor
//       // { lo: (base-$61)&$ff, hi: $b4 | ((base-$61)>>8) } and returns
//       // { kind: 'exploded', points: 80, hitDdt: true }.
//     type DdtShot = { kind: 'none' }
//                  | { kind: 'exploded'; points: number; hitDdt: true }
//     ddtExplosionStep(table: DdtTable, field: Uint8Array, frame: number):
//         { mush: number; mushTop: number }
//       // One MILLI.MAC:841-905 pass, upright. frame & 7 !== 0 -> no-op.
//       // Per exploding entry (sweep 3->0): oldHi = hi; hi -= $10; anchor =
//       // ((hi&3)<<8)|lo; idx = (oldHi>>4)-2; idx 0 ALSO clears the entry;
//       // then for each [off, stamp] of DDT_CLOUD_FRAMES[idx], at cell
//       // anchor+off: masked 0 -> write; < CLOUD -> preserve (letters);
//       // < DDT -> write (clouds erasable); < DDT+2 -> preserve (bombs);
//       // >= $70 -> destroy AND count via MUSHD1 rows (MLSUB.MAC:711-729:
//       // row < $0c -> mush--, $0c..$13 -> uncounted, >= $14 -> mushTop--).
//       // Every write preserves bit 7: field[c] = (field[c] & $80) | stamp.
//     inDdtCloud(stamp: number): boolean
//       // DDTEXP classifier (MILLI.MAC:1942-1945): masked stamp in
//       // [CLOUD_STAMP, DDT_STAMP).
//     interface BombsEnv {
//       nocent: number            // MLDEF.MAC:391
//       specialAttract: boolean   // MODE bit 7 (MILLI.MAC:451-452)
//       rnd0: number              // the GATE read (MILLI.MAC:453)
//       rndPick: number           // the SECOND read (MILLI.MAC:478) — the
//                                 // gate read has bits 0-2 clear; reusing it
//                                 // degenerates the dispatch to always-bee
//       centin: number            // 0..11 (index = centin>>1)
//       beec: readonly number[]   // 13 slot colour bytes; 0 = free
//     }
//     type BombCritter = 'bee' | 'dragonfly' | 'mosquito'
//     type BombsDecision = { kind: 'none'; delaySet: boolean }
//                        | { kind: 'enter'; critter: BombCritter;
//                            delaySet: true }
//       // BOMBS (MILLI.MAC:449-488). delaySet mirrors DELAY=$80: set the
//       // moment the three gates pass, EVEN when no slot is free. On 'enter'
//       // ml7 calls the critter's spawn and decrements NOCENT by one.
//     bombs(env: Readonly<BombsEnv>): BombsDecision
//     bombModeStart(centin: number, score2: number): number | null
//       // MILLI.MAC:1916-1925: centin in BOMBSL arms bomb mode and returns
//       // NOCENT = ((score2>>1) + 20 + (score2 & 1)) & $ff — LSR feeds carry
//       // into ADC with NO CLC (the BEEMV1-style trap); else null. Caller
//       // also does INC BOMBV and DELAY = $40 (claims DD, wiring).
//     ddtScrollDown(table: DdtTable, field: Uint8Array, rnd0: number,
//                   rnd1: number): { mushTop: number }
//       // The SCROLD DDT half (MLSUB.MAC:1231-1295, SC-49). One pass 3->0:
//       // exploding -> untouched; occupied -> lo-- (one row down), then
//       // lo & $1e === 0 (rows 0/1) clears the entry AND FALLS THROUGH to
//       // the seed branch — a just-culled entry can re-seed the same pass.
//       // Vacant -> seed at most ONCE per call: page = rnd1 & 3 (3 rejected —
//       // right edge), lo = (rnd0 & $e0) | $1e (top row), lo < $80 on page 0
//       // rejected (left edge); writes DDT+1 at seed+$20 and DDT at seed
//       // (each cell: any nonzero byte first counts mushTop--), no grey
//       // preservation concerns on the top row.
//     ddtScrollUp(table: DdtTable): void
//       // The SCROLU DDT half (MLSUB.MAC:1379-1400, SC-50): exploding/vacant
//       // untouched; occupied -> lo++ (one row up); (lo & $1f) === $1f (off
//       // the top) clears. NO seeding on up-scroll — the signature takes no
//       // randomness at all. Tails into SCROL0 (ml3-3 seam, not here).
//
// The story's own bar (the ml3-5 convention): pin thresholds AT the boundary
// — $14/$13, $2e/$2d, $6e/$6d, $70/$6f, rows 2/3 and $1e/$1f — or a >=/>
// mutant survives; and pin table DATA with toEqual in ROM order.

import { describe, it, expect } from 'vitest'

// ─── Local type shims (the bee.test.ts pattern) ─────────────────────────────
interface DdtEntry {
  lo: number
  hi: number
}
type DdtTable = DdtEntry[]
type DdtShot = { kind: 'none' } | { kind: 'exploded'; points: number; hitDdt: true }
interface BombsEnv {
  nocent: number
  specialAttract: boolean
  rnd0: number
  rndPick: number
  centin: number
  beec: readonly number[]
}
type BombCritter = 'bee' | 'dragonfly' | 'mosquito'
type BombsDecision =
  | { kind: 'none'; delaySet: boolean }
  | { kind: 'enter'; critter: BombCritter; delaySet: true }

interface DdtModule {
  NDDT: number
  CLOUD_STAMP: number
  DDT_STAMP: number
  ROCK_STAMP: number
  PLYFLD_PAGE: number
  DDT_EXPLODING_MIN: number
  DDT_EXPLOSION_START: number
  DDT_EXPLOSION_STEP: number
  DDT_FRAME_MASK: number
  DDT_HIT_POINTS: number
  DDT_ANCHOR_BACKSTEP: number
  DDT_CLOUD_KILL_FLAG: number
  DDTST: readonly number[]
  DDTST_ATTRACT: readonly number[]
  DDT_CLOUD_FRAMES: readonly (readonly (readonly [number, number])[])[]
  BOMBS_DELAY: number
  BOMBS_RND_MASK: number
  BOMBS_SLOTS: number
  BOMBS_CREATURES: readonly number[]
  BOMBSL: readonly number[]
  BOMB_MODE_NOCENT_BASE: number
  BOMB_MODE_DELAY: number
  newDdtTable: () => DdtTable
  ddtVacant: (e: Readonly<DdtEntry>) => boolean
  ddtExploding: (e: Readonly<DdtEntry>) => boolean
  anyDdtExploding: (t: readonly DdtEntry[]) => boolean
  ddtOffset: (e: Readonly<DdtEntry>) => number
  ddtPlace: (table: DdtTable, specialAttract: boolean) => void
  ddtRestore: (table: readonly DdtEntry[], field: Uint8Array) => void
  ddtShoot: (table: DdtTable, field: Uint8Array, offset: number, stamp: number) => DdtShot
  ddtExplosionStep: (table: DdtTable, field: Uint8Array, frame: number) => { mush: number; mushTop: number }
  inDdtCloud: (stamp: number) => boolean
  bombs: (env: Readonly<BombsEnv>) => BombsDecision
  bombModeStart: (centin: number, score2: number) => number | null
  ddtScrollDown: (table: DdtTable, field: Uint8Array, rnd0: number, rnd1: number) => { mushTop: number }
  ddtScrollUp: (table: DdtTable) => void
}

// COMPUTED specifier (the conway.test.ts pattern): tsc cannot resolve it, so
// the RED tree stays lint-clean while the module does not exist; vitest
// resolves it at runtime, relative to this file.
const DDT_SPECIFIER = ['..', 'src', 'core', 'ddt'].join('/')

/** Self-describing loader (the ml1-1 pattern): RED proves the feature absent. */
async function loadDdt(): Promise<DdtModule> {
  try {
    const mod = (await import(/* @vite-ignore */ DDT_SPECIFIER)) as Partial<DdtModule>
    if (typeof mod.ddtShoot !== 'function') throw new Error('module has no ddtShoot export')
    if (typeof mod.ddtExplosionStep !== 'function') throw new Error('module has no ddtExplosionStep export')
    if (typeof mod.ddtScrollDown !== 'function') throw new Error('module has no ddtScrollDown export')
    return mod as DdtModule
  } catch (e) {
    throw new Error(
      'DDT reducer not built yet — GREEN (Dev) ships src/core/ddt.ts per the ' +
        'contract at the top of tests/ddt.test.ts (pure, cited, byte semantics). ' +
        `(${e instanceof Error ? e.message : String(e)})`,
    )
  }
}

// ─── Fixtures ────────────────────────────────────────────────────────────────
const STRIDE = 0x20
const SIZE = 30 * STRIDE // $3C0 — the ml3-4 field shape
const emptyField = () => new Uint8Array(SIZE)

const DDT = 0x6e
const CLOUD = 0x2e
const ROCK = 0x70
const MUSHROOM = 0x7c

/** An intact entry at field offset `off` (hi = $10 | page, the ROM way). */
const intact = (off: number): DdtEntry => ({ lo: off & 0xff, hi: 0x10 | (off >> 8) })

/** A table of four entries; overrides land by index (3 is swept FIRST). */
function table(over: Record<number, DdtEntry> = {}): DdtTable {
  const t: DdtTable = [
    { lo: 0, hi: 0 },
    { lo: 0, hi: 0 },
    { lo: 0, hi: 0 },
    { lo: 0, hi: 0 },
  ]
  for (const [i, e] of Object.entries(over)) t[Number(i)] = { ...e }
  return t
}

/** The resolved ten cloud frames (offsets/stamps read off MILLI.MAC:917-989). */
const F97: ReadonlyArray<readonly [number, number]> = [
  [0x41, 0x30],
  [0x60, 0x34],
  [0x61, 0x31],
  [0x62, 0x2e],
  [0x80, 0x35],
  [0x81, 0x32],
  [0x82, 0x2f],
  [0xa1, 0x33],
]
const F96: ReadonlyArray<readonly [number, number]> = [
  [0x40, 0x3f],
  [0x41, 0x3a],
  [0x42, 0x36],
  [0x60, 0x40],
  [0x61, 0x3b],
  [0x62, 0x37],
  [0x80, 0x4a],
  [0x81, 0x3c],
  [0x82, 0x38],
  [0xa0, 0x42],
  [0xa1, 0x3d],
  [0xa2, 0x39],
  [0xc1, 0x3e],
]
const F95: ReadonlyArray<readonly [number, number]> = [
  [0x20, 0x4e],
  [0x21, 0x48],
  [0x40, 0x4f],
  [0x41, 0x49],
  [0x42, 0x43],
  [0x60, 0x50],
  [0x61, 0x4a],
  [0x62, 0x44],
  [0x80, 0x51],
  [0x81, 0x4b],
  [0x82, 0x45],
  [0xa0, 0x52],
  [0xa1, 0x4c],
  [0xa2, 0x46],
  [0xc1, 0x4d],
  [0xc2, 0x47],
]
const F94: ReadonlyArray<readonly [number, number]> = [
  [0x00, 0x63],
  [0x01, 0x5b],
  [0x02, 0x53],
  [0x20, 0x64],
  [0x21, 0x5c],
  [0x22, 0x54],
  [0x40, 0x65],
  [0x41, 0x5d],
  [0x42, 0x55],
  [0x60, 0x66],
  [0x61, 0x5e],
  [0x62, 0x56],
  [0x80, 0x67],
  [0x81, 0x5f],
  [0x82, 0x57],
  [0xa0, 0x68],
  [0xa1, 0x60],
  [0xa2, 0x58],
  [0xc0, 0x69],
  [0xc1, 0x61],
  [0xc2, 0x59],
  [0xe0, 0x42],
  [0xe1, 0x62],
  [0xe2, 0x5a],
]
const F93: ReadonlyArray<readonly [number, number]> = [
  [0x00, 0],
  [0x01, 0],
  [0x02, 0],
  [0x22, 0],
  [0xc0, 0],
  [0xe0, 0],
  [0xe1, 0],
  [0xe2, 0],
  ...F95,
]
const F92: ReadonlyArray<readonly [number, number]> = [
  [0x20, 0],
  [0x21, 0],
  [0xc2, 0],
  ...F96,
]
const F91: ReadonlyArray<readonly [number, number]> = [
  [0x40, 0],
  [0x42, 0],
  [0xa0, 0],
  [0xa2, 0],
  [0xc1, 0],
  ...F97,
]
const F90: ReadonlyArray<readonly [number, number]> = [
  [0x41, 0],
  [0x60, 0],
  [0x61, 0],
  [0x62, 0],
  [0x80, 0],
  [0x81, 0],
  [0x82, 0],
  [0xa1, 0],
]
const EXPECTED_FRAMES = [F90, F91, F92, F93, F94, F93, F94, F95, F96, F97]

// ─────────────────────────────────────────────────────────────────────────────
describe('cited constants (DD claims in docs/rom-study/claims/13-ddt.json)', () => {
  it('stamp and bank constants match the MLDEF.MAC equates (DD-1..5)', async () => {
    const m = await loadDdt()
    expect(m.NDDT).toBe(4)
    expect(m.CLOUD_STAMP).toBe(0x2e)
    expect(m.DDT_STAMP).toBe(0x6e)
    expect(m.ROCK_STAMP).toBe(0x70)
    expect(m.PLYFLD_PAGE).toBe(0x10)
  })

  it('explosion machine constants match MILLI.MAC/MLSUB.MAC', async () => {
    const m = await loadDdt()
    expect(m.DDT_EXPLODING_MIN).toBe(0x14) // CMP I,PLYFLD+400/100
    expect(m.DDT_EXPLOSION_START).toBe(0xb4) // ORA I,PLYFLD+400/100+0A0
    expect(m.DDT_EXPLOSION_STEP).toBe(0x10) // SBC I,10
    expect(m.DDT_FRAME_MASK).toBe(7) // FRAME AND I,7
    expect(m.DDT_HIT_POINTS).toBe(80) // "80 POINTS FOR HITTING DDT"
    expect(m.DDT_ANCHOR_BACKSTEP).toBe(0x61) // SBC I,61
    expect(m.DDT_CLOUD_KILL_FLAG).toBe(0x80) // DDTEX1 LDA I,80
  })

  it('DDTST placement words in ROM order — upright then special attract', async () => {
    const m = await loadDdt()
    expect(m.DDTST).toEqual([0x10cd, 0x1119, 0x1233, 0x12f7])
    expect(m.DDTST_ATTRACT).toEqual([0x10a3, 0x1084, 0x1086, 0x0000])
  })

  it('BOMBS constants: gates, slots, creature table, arming levels', async () => {
    const m = await loadDdt()
    expect(m.BOMBS_DELAY).toBe(0x80)
    expect(m.BOMBS_RND_MASK).toBe(7)
    expect(m.BOMBS_SLOTS).toBe(13) // LDX I,12. is DECIMAL
    expect(m.BOMBS_CREATURES).toEqual([0x83, 0x81, 0xc0, 0x80, 0x80, 0x00])
    expect(m.BOMBSL).toEqual([1, 3, 5, 7, 0x0b])
    expect(m.BOMB_MODE_NOCENT_BASE).toBe(20) // ADC I,20. is DECIMAL 20, not $20
    expect(m.BOMB_MODE_DELAY).toBe(0x40)
  })
})

describe('the ten cloud frames — 90$-97$ offset lists + the parallel 99$ stamps', () => {
  it('there are exactly ten frames (98$ has ten rows)', async () => {
    const m = await loadDdt()
    expect(m.DDT_CLOUD_FRAMES).toHaveLength(10)
  })

  it('every frame resolves to its ROM pairs, in ROM order (fall-throughs included)', async () => {
    const m = await loadDdt()
    // toEqual on the WHOLE array pins content AND order (the ml3-4 convention).
    expect(m.DDT_CLOUD_FRAMES.map((f) => f.map((p) => [p[0], p[1]]))).toEqual(
      EXPECTED_FRAMES.map((f) => f.map((p) => [p[0], p[1]])),
    )
  })

  it('the pulse: 98$ maps indexes 3/5 both to 93$ and 4/6 both to 94$', async () => {
    const m = await loadDdt()
    expect(m.DDT_CLOUD_FRAMES[5]).toEqual(m.DDT_CLOUD_FRAMES[3])
    expect(m.DDT_CLOUD_FRAMES[6]).toEqual(m.DDT_CLOUD_FRAMES[4])
    expect(m.DDT_CLOUD_FRAMES[3]).not.toEqual(m.DDT_CLOUD_FRAMES[4])
  })
})

describe('table helpers', () => {
  it('newDdtTable is four vacant entries; vacancy is hi === 0 exactly', async () => {
    const m = await loadDdt()
    const t = m.newDdtTable()
    expect(t).toHaveLength(4)
    for (const e of t) expect(m.ddtVacant(e)).toBe(true)
    expect(m.ddtVacant({ lo: 0xcd, hi: 0x10 })).toBe(false)
    // A nonzero lo alone does not make an entry occupied — the ROM tests the hi byte.
    expect(m.ddtVacant({ lo: 0xcd, hi: 0 })).toBe(true)
  })

  it('ddtExploding sits exactly at hi >= $14 (DD: CMP I,PLYFLD+400/100)', async () => {
    const m = await loadDdt()
    expect(m.ddtExploding({ lo: 0, hi: 0x13 })).toBe(false)
    expect(m.ddtExploding({ lo: 0, hi: 0x14 })).toBe(true)
    expect(m.ddtExploding({ lo: 0, hi: 0xb4 })).toBe(true)
  })

  it('anyDdtExploding: false over intact pages $10..$12, true with one exploding', async () => {
    const m = await loadDdt()
    const calm = table({ 3: { lo: 0xf7, hi: 0x12 }, 2: { lo: 0x33, hi: 0x12 }, 1: { lo: 0xcd, hi: 0x10 } })
    expect(m.anyDdtExploding(calm)).toBe(false)
    const hot = table({ 3: { lo: 0x6c, hi: 0xb4 } })
    expect(m.anyDdtExploding(hot)).toBe(true)
    // The ROM ORs the four hi bytes against $14 — sound ONLY because the seed
    // rejects column-page 3 (DD: intact hi never exceeds $12). Pin the boundary.
    expect(m.anyDdtExploding(table({ 0: { lo: 0, hi: 0x13 } }))).toBe(false)
    expect(m.anyDdtExploding(table({ 0: { lo: 0, hi: 0x14 } }))).toBe(true)
  })

  it('ddtOffset recombines ((hi & 3) << 8) | lo, exploding bits masked out', async () => {
    const m = await loadDdt()
    expect(m.ddtOffset({ lo: 0xcd, hi: 0x10 })).toBe(0x0cd)
    expect(m.ddtOffset({ lo: 0xf7, hi: 0x12 })).toBe(0x2f7)
    expect(m.ddtOffset({ lo: 0x6c, hi: 0xb4 })).toBe(0x06c)
  })
})

describe('ddtPlace — DDTS placement (MLSUB.MAC:421-442)', () => {
  it('normal play copies DDTST words 0..3 into the bank', async () => {
    const m = await loadDdt()
    const t = m.newDdtTable()
    m.ddtPlace(t, false)
    expect(t).toEqual([
      { lo: 0xcd, hi: 0x10 },
      { lo: 0x19, hi: 0x11 },
      { lo: 0x33, hi: 0x12 },
      { lo: 0xf7, hi: 0x12 },
    ])
  })

  it('special attract uses words 8..11 — and word 11 is a VACANT fourth entry', async () => {
    const m = await loadDdt()
    const t = m.newDdtTable()
    m.ddtPlace(t, true)
    expect(t).toEqual([
      { lo: 0xa3, hi: 0x10 },
      { lo: 0x84, hi: 0x10 },
      { lo: 0x86, hi: 0x10 },
      { lo: 0x00, hi: 0x00 },
    ])
    expect(m.ddtVacant(t[3])).toBe(true)
  })

  it('placement overwrites whatever the table held (wave restart)', async () => {
    const m = await loadDdt()
    const t = table({ 0: { lo: 0x6c, hi: 0xb4 }, 3: { lo: 0x11, hi: 0x11 } })
    m.ddtPlace(t, false)
    expect(t[0]).toEqual({ lo: 0xcd, hi: 0x10 })
    expect(t[3]).toEqual({ lo: 0xf7, hi: 0x12 })
  })
})

describe('ddtRestore — DDTS2 stamp restore (MLSUB.MAC:443-476)', () => {
  it('writes DDT at the base and DDT+1 at base+$20 on blank cells', async () => {
    const m = await loadDdt()
    const t = table({ 0: intact(0x0cd) })
    const f = emptyField()
    m.ddtRestore(t, f)
    expect(f[0x0cd]).toBe(DDT)
    expect(f[0x0ed]).toBe(DDT + 1)
  })

  it('a letter ($01..$2D) blocks ONLY its own cell', async () => {
    const m = await loadDdt()
    const t = table({ 0: intact(0x0cd) })
    const f = emptyField()
    f[0x0ed] = 0x01
    m.ddtRestore(t, f)
    expect(f[0x0cd]).toBe(DDT)
    expect(f[0x0ed]).toBe(0x01)
  })

  it('a cloud stamp blocks the restore too (clouds are < ROCK)', async () => {
    const m = await loadDdt()
    const t = table({ 0: intact(0x0cd) })
    const f = emptyField()
    f[0x0cd] = CLOUD
    m.ddtRestore(t, f)
    expect(f[0x0cd]).toBe(CLOUD)
  })

  it('the boundary is AT ROCK: $6F blocks, $70 and mushrooms are overwritten', async () => {
    const m = await loadDdt()
    const t = table({ 0: intact(0x0cd) })
    const f = emptyField()
    f[0x0cd] = ROCK // exactly the CMP I,ROCK threshold
    f[0x0ed] = 0x6f // DDT+1 remnant — blocks ("something is there")
    m.ddtRestore(t, f)
    expect(f[0x0cd]).toBe(DDT)
    expect(f[0x0ed]).toBe(0x6f)
    const f2 = emptyField()
    f2[0x0cd] = MUSHROOM
    m.ddtRestore(t, f2)
    expect(f2[0x0cd]).toBe(DDT) // "WE CAN OVERWRITE A MUSHROOM IN ATTRACT"
  })

  it('restore stores are RAW — a grey-blank cell loses its grey bit', async () => {
    const m = await loadDdt()
    const t = table({ 0: intact(0x0cd) })
    const f = emptyField()
    f[0x0cd] = 0x80 // masked stamp 0 -> writable; ROM stores LDA I,DDT raw
    m.ddtRestore(t, f)
    expect(f[0x0cd]).toBe(DDT)
  })

  it('vacant and exploding entries restore nothing', async () => {
    const m = await loadDdt()
    const t = table({ 0: { lo: 0x6c, hi: 0xb4 } })
    const f = emptyField()
    m.ddtRestore(t, f)
    expect(Array.from(f).every((b) => b === 0)).toBe(true)
  })
})

describe('ddtShoot — SHOOT1 bomb branch (MILLI.MAC:1983-1985, 2014-2063)', () => {
  it('hitting the base stamp starts the explosion: anchor -$61, hi $B4|page, 80 points', async () => {
    const m = await loadDdt()
    const t = table({ 0: intact(0x0cd) })
    const f = emptyField()
    f[0x0cd] = DDT
    f[0x0ed] = DDT + 1
    const r = m.ddtShoot(t, f, 0x0cd, DDT)
    expect(r).toEqual({ kind: 'exploded', points: 80, hitDdt: true })
    expect(t[0]).toEqual({ lo: 0x6c, hi: 0xb4 }) // $0CD - $61 = $06C, page 0
    expect(f[0x0cd]).toBe(0)
    expect(f[0x0ed]).toBe(0)
  })

  it('hitting the +$20 stamp (DDT+1) normalizes to the same entry', async () => {
    const m = await loadDdt()
    const t = table({ 0: intact(0x0cd) })
    const f = emptyField()
    f[0x0cd] = DDT
    f[0x0ed] = DDT + 1
    const r = m.ddtShoot(t, f, 0x0ed, DDT + 1)
    expect(r.kind).toBe('exploded')
    expect(t[0]).toEqual({ lo: 0x6c, hi: 0xb4 })
  })

  it('a grey-carrying stamp read still normalizes — the $7F mask is live (review F5)', async () => {
    const m = await loadDdt()
    const t = table({ 0: intact(0x0cd) })
    const f = emptyField()
    f[0x0cd] = DDT
    f[0x0ed] = 0x80 | (DDT + 1) // the raw field byte a player-area hit reads
    const r = m.ddtShoot(t, f, 0x0ed, 0x80 | (DDT + 1))
    expect(r.kind).toBe('exploded')
    expect(t[0]).toEqual({ lo: 0x6c, hi: 0xb4 })
  })

  it("both cleared cells take the BASE cell's grey bit (MILLI.MAC:2046)", async () => {
    const m = await loadDdt()
    // Base grey, +$20 not: BOTH end $80.
    const t = table({ 0: intact(0x0cd) })
    const f = emptyField()
    f[0x0cd] = 0x80 | DDT
    f[0x0ed] = DDT + 1
    m.ddtShoot(t, f, 0x0cd, DDT)
    expect(f[0x0cd]).toBe(0x80)
    expect(f[0x0ed]).toBe(0x80)
    // Base NOT grey, +$20 grey: the +$20 cell LOSES its own grey — the ROM
    // stores the base A register at both addresses.
    const t2 = table({ 0: intact(0x0cd) })
    const f2 = emptyField()
    f2[0x0cd] = DDT
    f2[0x0ed] = 0x80 | (DDT + 1)
    m.ddtShoot(t2, f2, 0x0cd, DDT)
    expect(f2[0x0cd]).toBe(0)
    expect(f2[0x0ed]).toBe(0)
  })

  it('page-2 bombs match on the hi byte: word 3 at $2F7 -> anchor $296, hi $B6', async () => {
    const m = await loadDdt()
    const t = table({ 3: intact(0x2f7) })
    const f = emptyField()
    f[0x2f7] = DDT
    const r = m.ddtShoot(t, f, 0x2f7, DDT)
    expect(r.kind).toBe('exploded')
    expect(t[3]).toEqual({ lo: 0x96, hi: 0xb6 }) // $2F7-$61=$296; $B4|2
  })

  it("no intact match returns { kind: 'none' } and mutates NOTHING", async () => {
    const m = await loadDdt()
    // Vacant table: the stamp exists on the field but no entry claims it.
    const t = m.newDdtTable()
    const f = emptyField()
    f[0x0cd] = DDT
    expect(m.ddtShoot(t, f, 0x0cd, DDT)).toEqual({ kind: 'none' })
    expect(f[0x0cd]).toBe(DDT)
    expect(t).toEqual(m.newDdtTable())
  })

  it('an already-exploding entry at the same position does not match', async () => {
    const m = await loadDdt()
    const t = table({ 0: { lo: 0xcd, hi: 0xb4 } }) // exploding — hi is not $10|page
    const f = emptyField()
    f[0x0cd] = DDT
    expect(m.ddtShoot(t, f, 0x0cd, DDT).kind).toBe('none')
    expect(t[0]).toEqual({ lo: 0xcd, hi: 0xb4 })
  })
})

describe('ddtExplosionStep — the FRAME&7 cloud machine (MILLI.MAC:841-905)', () => {
  it('frames with FRAME & 7 !== 0 are a strict no-op — including EVEN frames', async () => {
    const m = await loadDdt()
    // 1, 2 and 4 all skip: an & 1 or & 3 mutant fires on 2 or 4 and dies here.
    for (const frame of [1, 2, 4, 6, 7]) {
      const t = table({ 0: { lo: 0x6c, hi: 0xb4 } })
      const f = emptyField()
      const d = m.ddtExplosionStep(t, f, frame)
      expect(t[0], `frame ${frame}`).toEqual({ lo: 0x6c, hi: 0xb4 })
      expect(Array.from(f).every((b) => b === 0), `frame ${frame}`).toBe(true)
      expect(d).toEqual({ mush: 0, mushTop: 0 })
    }
  })

  it('the first step: hi $B4 -> $A4, frame 9 (97$) stamps around the anchor', async () => {
    const m = await loadDdt()
    const t = table({ 0: { lo: 0x6c, hi: 0xb4 } })
    const f = emptyField()
    m.ddtExplosionStep(t, f, 8)
    expect(t[0]).toEqual({ lo: 0x6c, hi: 0xa4 })
    for (const [off, stamp] of F97) expect(f[0x6c + off], `offset $${off.toString(16)}`).toBe(stamp)
    // A cell OUTSIDE the 97$ list is untouched on the first frame.
    expect(f[0x6c + 0x40]).toBe(0)
    expect(f[0x6c + 0xc1]).toBe(0)
  })

  it('write rules: letters and bombs preserved, clouds and blanks overwritten', async () => {
    const m = await loadDdt()
    const t = table({ 0: { lo: 0x6c, hi: 0xb4 } })
    const f = emptyField()
    f[0x6c + 0x41] = 0x05 // a letter (< CLOUD) — preserved
    f[0x6c + 0x60] = CLOUD // an old cloud — erasable
    f[0x6c + 0x61] = DDT // another bomb's base stamp — preserved
    f[0x6c + 0x62] = DDT + 1 // another bomb's second stamp — preserved
    f[0x6c + 0x80] = 0x2d // CLOUD-1: still a letter — preserved (F1)
    f[0x6c + 0x81] = 0x6d // DDT-1: still an erasable cloud — overwritten (F1)
    m.ddtExplosionStep(t, f, 0)
    expect(f[0x6c + 0x41]).toBe(0x05)
    expect(f[0x6c + 0x60]).toBe(0x34) // 97$ stamp overwrote the cloud
    expect(f[0x6c + 0x61]).toBe(DDT)
    expect(f[0x6c + 0x62]).toBe(DDT + 1)
    // The classifier's own boundaries, pinned INSIDE the machine (review F1):
    // $2D sits one below CLOUD (letter side), $6D one below DDT (cloud side).
    expect(f[0x6c + 0x80]).toBe(0x2d)
    expect(f[0x6c + 0x81]).toBe(0x32) // 97$ stamp overwrote the $6D cloud
  })

  it('MUSHD1 band edges sit AT $0B/$0C and $13/$14 (review F2, DD-47/48/49)', async () => {
    const m = await loadDdt()
    // Each case: a fresh exploding entry whose anchor puts offset $41 exactly
    // on the target row ((lo + $41) & $1F), a mushroom there, one step.
    const cases: Array<{ lo: number; row: number; mush: number; mushTop: number }> = [
      { lo: 0x0a, row: 0x0b, mush: -1, mushTop: 0 }, // last bottom-region row
      { lo: 0x0b, row: 0x0c, mush: 0, mushTop: 0 }, // first uncounted row
      { lo: 0x12, row: 0x13, mush: 0, mushTop: 0 }, // last uncounted row
      { lo: 0x13, row: 0x14, mush: 0, mushTop: -1 }, // first top-region row
    ]
    for (const c of cases) {
      const t = table({ 0: { lo: c.lo, hi: 0xb4 } })
      const f = emptyField()
      const cell = c.lo + 0x41
      expect(cell & 0x1f, `fixture row for lo $${c.lo.toString(16)}`).toBe(c.row)
      f[cell] = MUSHROOM
      const d = m.ddtExplosionStep(t, f, 0)
      expect(d, `row $${c.row.toString(16)}`).toEqual({ mush: c.mush, mushTop: c.mushTop })
    }
  })

  it('the boundary is AT DDT+2: $70 (a rock) is destroyed, $6F is not', async () => {
    const m = await loadDdt()
    const t = table({ 0: { lo: 0x6c, hi: 0xb4 } })
    const f = emptyField()
    f[0x6c + 0x80] = ROCK // $70 — destroyed AND counted
    f[0x6c + 0x81] = 0x6f // DDT+1 — preserved
    m.ddtExplosionStep(t, f, 0)
    expect(f[0x6c + 0x80]).toBe(0x35)
    expect(f[0x6c + 0x81]).toBe(0x6f)
  })

  it('a mushroom in the MIDDLE band ($0C..$13) is destroyed but counted NOWHERE', async () => {
    const m = await loadDdt()
    const t = table({ 0: { lo: 0x6c, hi: 0xb4 } })
    const f = emptyField()
    f[0x6c + 0x61] = MUSHROOM // $0CD: row $0D — the uncounted middle
    const d = m.ddtExplosionStep(t, f, 0)
    expect(f[0x6c + 0x61]).toBe(0x31)
    expect(d).toEqual({ mush: 0, mushTop: 0 })
  })

  it('MUSHD1 regions: top rows decrement mushTop (rocks included), bottom rows mush', async () => {
    const m = await loadDdt()
    // Anchor $03D — cloud rows $1D..$1F, all in the top region (>= $14).
    const top = table({ 0: { lo: 0x3d, hi: 0xb4 } })
    const ftop = emptyField()
    ftop[0x3d + 0x41] = MUSHROOM
    ftop[0x3d + 0x60] = ROCK
    const dtop = m.ddtExplosionStep(top, ftop, 0)
    expect(dtop).toEqual({ mush: 0, mushTop: -2 })
    // Anchor $005 — cloud rows 5..7, bottom region (< $0C).
    const bot = table({ 0: { lo: 0x05, hi: 0xb4 } })
    const fbot = emptyField()
    fbot[0x05 + 0x41] = MUSHROOM
    const dbot = m.ddtExplosionStep(bot, fbot, 0)
    expect(dbot).toEqual({ mush: -1, mushTop: 0 })
  })

  it('explosion writes preserve the grey bit (MILLI.MAC:894)', async () => {
    const m = await loadDdt()
    const t = table({ 0: { lo: 0x6c, hi: 0xb4 } })
    const f = emptyField()
    f[0x6c + 0x41] = 0x80 // grey blank
    m.ddtExplosionStep(t, f, 0)
    expect(f[0x6c + 0x41]).toBe(0x80 | 0x30)
  })

  it('a full run: ten steps grow, pulse, shrink, erase — and the entry clears', async () => {
    const m = await loadDdt()
    const t = table({ 0: { lo: 0x6c, hi: 0xb4 } })
    const f = emptyField()
    const his: number[] = []
    for (let k = 0; k < 10; k++) {
      m.ddtExplosionStep(t, f, 0)
      his.push(t[0].hi)
    }
    expect(his).toEqual([0xa4, 0x94, 0x84, 0x74, 0x64, 0x54, 0x44, 0x34, 0x24, 0x00])
    // The animation is self-cleaning: after the 90$ erase every cloud cell is
    // masked-blank again.
    for (const [off] of F94) expect(f[0x6c + off] & 0x7f, `offset $${off.toString(16)}`).toBe(0)
    // A further step is a no-op on the cleared entry.
    m.ddtExplosionStep(t, f, 0)
    expect(t[0]).toEqual({ lo: 0x6c, hi: 0x00 })
  })

  it('intact and vacant entries are untouched while another explodes', async () => {
    const m = await loadDdt()
    const t = table({ 3: { lo: 0x6c, hi: 0xb4 }, 1: intact(0x119) })
    const f = emptyField()
    m.ddtExplosionStep(t, f, 0)
    expect(t[3].hi).toBe(0xa4)
    expect(t[1]).toEqual({ lo: 0x19, hi: 0x11 })
    expect(t[0]).toEqual({ lo: 0, hi: 0 })
  })
})

describe('inDdtCloud — the DDTEXP classifier (MILLI.MAC:1942-1945)', () => {
  it('the band is exactly [CLOUD, DDT): $2D no, $2E yes, $6D yes, $6E no', async () => {
    const m = await loadDdt()
    expect(m.inDdtCloud(0x2d)).toBe(false)
    expect(m.inDdtCloud(0x2e)).toBe(true)
    expect(m.inDdtCloud(0x6d)).toBe(true)
    expect(m.inDdtCloud(0x6e)).toBe(false)
    expect(m.inDdtCloud(0)).toBe(false)
  })
})

describe('bombs — the bomb-mode entry dispatcher (MILLI.MAC:449-488)', () => {
  const FREE = Object.freeze(new Array(13).fill(0) as number[])
  const FULL = Object.freeze(new Array(13).fill(0x39) as number[])
  const env = (over: Partial<BombsEnv> = {}): BombsEnv => ({
    nocent: 5,
    specialAttract: false,
    rnd0: 0,
    rndPick: 0,
    centin: 10,
    beec: FREE,
    ...over,
  })

  it('NOCENT 0 exits with NO delay', async () => {
    const m = await loadDdt()
    expect(m.bombs(env({ nocent: 0 }))).toEqual({ kind: 'none', delaySet: false })
  })

  it('special attract mode never bombs (no delay)', async () => {
    const m = await loadDdt()
    expect(m.bombs(env({ specialAttract: true }))).toEqual({ kind: 'none', delaySet: false })
  })

  it('the gate is rnd0 & 7 === 0 — $08 passes, $01 does not', async () => {
    const m = await loadDdt()
    expect(m.bombs(env({ rnd0: 1 }))).toEqual({ kind: 'none', delaySet: false })
    expect(m.bombs(env({ rnd0: 8 })).kind).toBe('enter') // a rnd0 !== 0 mutant dies here
  })

  it('DELAY is set the moment the gates pass — EVEN when every slot is taken', async () => {
    const m = await loadDdt()
    expect(m.bombs(env({ beec: FULL }))).toEqual({ kind: 'none', delaySet: true })
  })

  it('one free BEEC slot anywhere in 12..0 is enough', async () => {
    const m = await loadDdt()
    const oneFree = FULL.slice()
    oneFree[12] = 0
    expect(m.bombs(env({ beec: oneFree })).kind).toBe('enter')
  })

  it('CENTIN 10-11 (code $00): always a bee, whatever rndPick says', async () => {
    const m = await loadDdt()
    for (const rndPick of [0, 2, 6, 0xff]) {
      const r = m.bombs(env({ centin: 10, rndPick }))
      expect(r).toEqual({ kind: 'enter', critter: 'bee', delaySet: true })
    }
    expect(m.bombs(env({ centin: 11 })).kind).toBe('enter')
  })

  it('CENTIN 4-5 (code $C0): mosquitoes only', async () => {
    const m = await loadDdt()
    for (const rndPick of [0, 2, 6]) {
      expect(m.bombs(env({ centin: 4, rndPick }))).toEqual({ kind: 'enter', critter: 'mosquito', delaySet: true })
    }
  })

  it('CENTIN 6-9 (codes $80): dragonflies only', async () => {
    const m = await loadDdt()
    for (const centin of [6, 8]) {
      expect(m.bombs(env({ centin, rndPick: 6 }))).toEqual({ kind: 'enter', critter: 'dragonfly', delaySet: true })
    }
  })

  it('CENTIN 0-1 (code $83, mask 6): 0 -> bee, 6 -> mosquito, 2/4 -> dragonfly', async () => {
    const m = await loadDdt()
    expect(m.bombs(env({ centin: 0, rndPick: 0 }))).toEqual({ kind: 'enter', critter: 'bee', delaySet: true })
    expect(m.bombs(env({ centin: 0, rndPick: 6 }))).toEqual({ kind: 'enter', critter: 'mosquito', delaySet: true })
    expect(m.bombs(env({ centin: 0, rndPick: 2 }))).toEqual({ kind: 'enter', critter: 'dragonfly', delaySet: true })
    expect(m.bombs(env({ centin: 0, rndPick: 4 }))).toEqual({ kind: 'enter', critter: 'dragonfly', delaySet: true })
    // Only bits 1-2 participate: $F9 & 6 === 0 is still a bee.
    expect(m.bombs(env({ centin: 0, rndPick: 0xf9 }))).toEqual({ kind: 'enter', critter: 'bee', delaySet: true })
  })

  it('CENTIN 2-3 (code $81, mask 2): a mosquito is UNREACHABLE', async () => {
    const m = await loadDdt()
    expect(m.bombs(env({ centin: 2, rndPick: 0 }))).toEqual({ kind: 'enter', critter: 'bee', delaySet: true })
    expect(m.bombs(env({ centin: 2, rndPick: 2 }))).toEqual({ kind: 'enter', critter: 'dragonfly', delaySet: true })
    // rndPick 6: mask 2 keeps only bit 1 -> 2 -> dragonfly, NEVER mosquito.
    expect(m.bombs(env({ centin: 2, rndPick: 6 }))).toEqual({ kind: 'enter', critter: 'dragonfly', delaySet: true })
  })

  it('odd CENTIN values land in the SAME pair as their even sibling (review F6)', async () => {
    const m = await loadDdt()
    // rndPick 4 discriminates the adjacent codes: $83 (mask 6) -> 4 ->
    // dragonfly, $81 (mask 2) -> 0 -> bee, $C0 -> mosquito, $80 -> dragonfly,
    // $00 -> bee. A (centin+1)>>1 mis-shift lands in the NEXT pair and dies.
    expect(m.bombs(env({ centin: 1, rndPick: 4 }))).toEqual({ kind: 'enter', critter: 'dragonfly', delaySet: true })
    expect(m.bombs(env({ centin: 3, rndPick: 4 }))).toEqual({ kind: 'enter', critter: 'bee', delaySet: true })
    expect(m.bombs(env({ centin: 5, rndPick: 4 }))).toEqual({ kind: 'enter', critter: 'mosquito', delaySet: true })
    expect(m.bombs(env({ centin: 7, rndPick: 4 }))).toEqual({ kind: 'enter', critter: 'dragonfly', delaySet: true })
    expect(m.bombs(env({ centin: 9, rndPick: 4 }))).toEqual({ kind: 'enter', critter: 'dragonfly', delaySet: true })
  })

  it('the dispatch uses the SECOND rnd read — reusing the gate byte degenerates to always-bee', async () => {
    const m = await loadDdt()
    // The gate read passed with rnd0 = 0 (bits 0-2 clear by construction).
    // An implementation that ANDs the mask against rnd0 instead of rndPick
    // would return bee here; the ROM makes a fresh RND0 read (DD: MILLI.MAC:478).
    expect(m.bombs(env({ centin: 0, rnd0: 0, rndPick: 6 }))).toEqual({
      kind: 'enter',
      critter: 'mosquito',
      delaySet: true,
    })
  })
})

describe('bombModeStart — BOMBSL arming (MILLI.MAC:1916-1925)', () => {
  it('arms at CENTIN 1, 3, 5, 7 and $0B only', async () => {
    const m = await loadDdt()
    for (const centin of [1, 3, 5, 7, 0x0b]) {
      expect(m.bombModeStart(centin, 0), `centin ${centin}`).toBe(20)
    }
    for (const centin of [0, 2, 4, 6, 8, 9, 10]) {
      expect(m.bombModeStart(centin, 0), `centin ${centin}`).toBeNull()
    }
  })

  it('NOCENT = (score2 >> 1) + 20 decimal + the LSR carry — no CLC', async () => {
    const m = await loadDdt()
    expect(m.bombModeStart(1, 0)).toBe(20)
    expect(m.bombModeStart(1, 4)).toBe(22)
    // The trap: an ODD score2 pushes the shifted-out bit through ADC.
    expect(m.bombModeStart(1, 5)).toBe(23) // 2 + 20 + 1, NOT 22
    expect(m.bombModeStart(1, 0x10)).toBe(28)
    expect(m.bombModeStart(1, 0x11)).toBe(29)
  })

  it('the result is a BYTE — the & $FF mask is live (review F4)', async () => {
    const m = await loadDdt()
    // In-domain byte score2 never reaches the wrap ((0xff>>1)+20+1 = 148), so
    // this pins the mask DEFENSIVELY with an out-of-domain word: $1E0 >> 1 =
    // $F0, + 20 + 0 = $104 -> the stored NOCENT byte is $04.
    expect(m.bombModeStart(1, 0x1e0)).toBe(0x04)
  })
})

describe('ddtScrollDown — the SCROLD DDT half (MLSUB.MAC:1231-1295, SC-49)', () => {
  // rnd1 & 3 === 3 everywhere below when a test wants NO seeding noise.
  const NOSEED = 0x03

  it('an occupied bomb moves one row down (lo--)', async () => {
    const m = await loadDdt()
    const t = table({ 3: { lo: 0x9e, hi: 0x10 } })
    m.ddtScrollDown(t, emptyField(), 0, NOSEED)
    expect(t[3]).toEqual({ lo: 0x9d, hi: 0x10 })
  })

  it('the cull boundary: row 3 survives (as row 2), row 2 is cleared', async () => {
    const m = await loadDdt()
    const survives = table({ 3: { lo: (5 << 5) | 3, hi: 0x10 } })
    m.ddtScrollDown(survives, emptyField(), 0, NOSEED)
    expect(survives[3]).toEqual({ lo: (5 << 5) | 2, hi: 0x10 })
    const culled = table({ 3: { lo: (5 << 5) | 2, hi: 0x10 } })
    m.ddtScrollDown(culled, emptyField(), 0, NOSEED)
    expect(culled[3].hi).toBe(0)
  })

  it('an exploding entry neither moves nor clears', async () => {
    const m = await loadDdt()
    const t = table({ 3: { lo: 0x6c, hi: 0xb4 } })
    m.ddtScrollDown(t, emptyField(), 0, NOSEED)
    expect(t[3]).toEqual({ lo: 0x6c, hi: 0xb4 })
  })

  it('a vacant entry seeds on the top row: page from rnd1&3, column bits from rnd0&$E0', async () => {
    const m = await loadDdt()
    const t = table({ 3: intact(0x2f7), 2: intact(0x233), 1: intact(0x119) })
    const f = emptyField()
    const d = m.ddtScrollDown(t, f, 0x40, 0x02)
    expect(t[0]).toEqual({ lo: 0x5e, hi: 0x12 }) // ($40&$E0)|$1E, page 2
    expect(f[0x25e]).toBe(DDT)
    expect(f[0x27e]).toBe(DDT + 1)
    expect(d.mushTop).toBe(0)
  })

  it('seeding over occupied cells counts mushTop for EVERY nonzero byte', async () => {
    const m = await loadDdt()
    const t = table({ 3: intact(0x2f7), 2: intact(0x233), 1: intact(0x119) })
    const f = emptyField()
    f[0x25e] = MUSHROOM
    f[0x27e] = ROCK
    const d = m.ddtScrollDown(t, f, 0x40, 0x02)
    expect(d.mushTop).toBe(-2)
    expect(f[0x25e]).toBe(DDT)
    expect(f[0x27e]).toBe(DDT + 1)
  })

  it('asymmetric seed overwrites count independently per cell (review F3)', async () => {
    const m = await loadDdt()
    // Only the BASE cell occupied -> exactly -1.
    const t1 = table({ 3: intact(0x2f7), 2: intact(0x233), 1: intact(0x119) })
    const f1 = emptyField()
    f1[0x25e] = MUSHROOM
    expect(m.ddtScrollDown(t1, f1, 0x40, 0x02).mushTop).toBe(-1)
    // Only the +$20 cell occupied -> exactly -1.
    const t2 = table({ 3: intact(0x2f7), 2: intact(0x233), 1: intact(0x119) })
    const f2 = emptyField()
    f2[0x27e] = MUSHROOM
    expect(m.ddtScrollDown(t2, f2, 0x40, 0x02).mushTop).toBe(-1)
  })

  it('rnd1 & 3 === 3 rejects the seed — the right-edge page never hosts a bomb', async () => {
    const m = await loadDdt()
    for (const rnd1 of [0x03, 0x07, 0xff]) {
      const t = m.newDdtTable()
      const f = emptyField()
      m.ddtScrollDown(t, f, 0x40, rnd1)
      expect(t, `rnd1 $${rnd1.toString(16)}`).toEqual(m.newDdtTable())
      expect(Array.from(f).every((b) => b === 0)).toBe(true)
    }
  })

  it('the left-edge guard bites only on page $10: lo < $80 there rejects, elsewhere seeds', async () => {
    const m = await loadDdt()
    // Page 0, lo $1E < $80: rejected.
    const t0 = m.newDdtTable()
    m.ddtScrollDown(t0, emptyField(), 0x00, 0x00)
    expect(t0).toEqual(m.newDdtTable())
    // Page 0, lo $9E >= $80: seeded.
    const t1 = m.newDdtTable()
    m.ddtScrollDown(t1, emptyField(), 0x80, 0x00)
    expect(t1[3]).toEqual({ lo: 0x9e, hi: 0x10 })
    // Page 1, lo $1E < $80: seeded — the guard is page-0 only.
    const t2 = m.newDdtTable()
    m.ddtScrollDown(t2, emptyField(), 0x00, 0x01)
    expect(t2[3]).toEqual({ lo: 0x1e, hi: 0x11 })
  })

  it('at most ONE seed per scroll, and it lands in the HIGHEST vacant index (sweep 3->0)', async () => {
    const m = await loadDdt()
    const t = table({ 2: intact(0x233), 1: intact(0x119) }) // [3] and [0] vacant
    m.ddtScrollDown(t, emptyField(), 0x80, 0x00)
    expect(t[3]).toEqual({ lo: 0x9e, hi: 0x10 })
    expect(t[0]).toEqual({ lo: 0, hi: 0 }) // still vacant — one per line
  })

  it('a bomb culled this pass falls THROUGH into the seed branch (MLSUB.MAC:1248-1249)', async () => {
    const m = await loadDdt()
    const t = table({
      3: { lo: (5 << 5) | 2, hi: 0x10 }, // will cull -> re-seed same pass
      2: intact(0x233),
      1: intact(0x119),
      0: intact(0x0cd),
    })
    m.ddtScrollDown(t, emptyField(), 0x80, 0x00)
    expect(t[3]).toEqual({ lo: 0x9e, hi: 0x10 })
  })
})

describe('ddtScrollUp — the SCROLU DDT half (MLSUB.MAC:1379-1400, SC-50)', () => {
  it('an occupied bomb moves one row up (lo++)', async () => {
    const m = await loadDdt()
    const t = table({ 3: { lo: (3 << 5) | 0x1d, hi: 0x10 } })
    m.ddtScrollUp(t)
    expect(t[3]).toEqual({ lo: (3 << 5) | 0x1e, hi: 0x10 })
  })

  it('the off-top boundary: row $1E moves to $1F and is cleared', async () => {
    const m = await loadDdt()
    const t = table({ 3: { lo: (3 << 5) | 0x1e, hi: 0x10 } })
    m.ddtScrollUp(t)
    expect(t[3].hi).toBe(0)
  })

  it('exploding and vacant entries are untouched — and up-scroll NEVER seeds', async () => {
    const m = await loadDdt()
    const t = table({ 2: { lo: 0x6c, hi: 0xb4 } })
    m.ddtScrollUp(t)
    expect(t[2]).toEqual({ lo: 0x6c, hi: 0xb4 })
    expect(t[3]).toEqual({ lo: 0, hi: 0 })
    expect(t[0]).toEqual({ lo: 0, hi: 0 })
  })
})
