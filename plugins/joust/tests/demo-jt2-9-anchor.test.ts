// tests/demo-jt2-9-anchor.test.ts
//
// Story jt2-9 — RED phase (Leeloo / TEA). Items (1) LEDGE SEAT and (4b) MOUNT+RIDER
// ALIGNMENT. Both are the SAME root cause: the render ignores each entity frame's
// transcribed POSOFF position word, so every sprite draws with its top-left at the
// FEET line instead of POSOFF-lifted above it.
//
// ROM ground truth (archaeology, cited):
//   • POSOFF macro (JOUSTI.SRC:12-13, DECIMAL fields): FDB COLISN,XOFF*256+256-YOFF,SRC.
//     So the stored `position` word decodes: XOFF = position >> 8, and the low byte
//     is 256-YOFF, which the ROM adds to CLSY as a SIGNED −YOFF.
//   • WRHOR2 (JOUSTRV4.SRC:6092-6098): LDD 2,Y / ADDA CLSX / ADDB CLSY / STD WCDEST,X
//     — the blit destination is destX = CLSX + XOFF, destY = CLSY − YOFF.
//   • CLSY (SYSTEM.SRC:444-445/:480-481) = PPOSY+1 = the whole-pixel Y = posY>>8, the
//     entity's FEET reference. So a standing sprite draws its body YOFF px ABOVE its feet.
//
//   YOFF per frame (decoded from pictures.ts ENTITY_RECORDS.position — DERIVED here,
//   never hand-typed, so a re-transcription that changes the word moves the expectation):
//     BRSTND 243→13   ORSTND 237→19   PLYR1 751→17 (XOFF 2)
//
// Current bug: drawList (demo.ts:642-654) emits every entity op as { x: posX,
// y: posY>>8 } — POSOFF NEVER applied. So (1) the whole sprite hangs a full YOFF
// (13–19px) below the platform on ALL ledges (feet clip through), and (4b) the
// mount and rider — which carry DIFFERENT POSOFF words — draw at the SAME origin
// instead of the ROM's relative offset. The fix (pure, routing≠geometry): drawList
// applies each frame's POSOFF so the op carries the FINAL blit coords as DATA.

import { describe, it, expect } from 'vitest'
import { loadDemo, loadDemoRender, type DemoState, type DemoProcess, type EntityState, type EnemyState } from './helpers/demo-contract.js'
import { loadPictures } from './helpers/pictures-contract.js'

const SEED = 0x1234_5678

/** The ROM's POSOFF Y-offset for a frame, from its transcribed position word. */
async function yoffOf(frame: string): Promise<number> {
  const pics = await loadPictures()
  const rec = pics.ENTITY_RECORDS.find((r) => r.name === frame)
  if (!rec) throw new Error(`no ENTITY_RECORDS entry for ${frame}`)
  return 256 - (rec.position & 0xff) // POSOFF low byte = 256 − YOFF
}

function entityAt(posX: number, pixelY: number, airborne: boolean, over: Partial<EntityState> = {}): EntityState {
  return { posX, posY: pixelY << 8, velXIndex: 0, velXFrac: 0, velY: 0, timeUp: 1, groundState: airborne ? null : 'PLYBR', plantZ: 0, airborne, animPhase: 0, ...over }
}

function groundedEnemy(id: number, posX: number, feetY: number): DemoProcess {
  const enemy: EnemyState = { entity: entityAt(posX, feetY, false), facing: 1, pchase: 0, brain: 'linet', decision: 'boundr' }
  return { id, cls: 'secondary', nap: 1, period: 1, kind: 'enemy', enemyType: 'bounder', collisionEnabled: true, enemy }
}

function groundedPlayer(id: number, posX: number, feetY: number, mount: 'ostrich' | 'stork' = 'ostrich'): DemoProcess {
  return { id, cls: 'primary', nap: 1, period: 1, kind: 'player', facing: 1, mount, collisionEnabled: true, entity: entityAt(posX, feetY, false) }
}

const only = (d: DemoState, procs: DemoProcess[]): DemoState => ({ ...d, sim: { ...d.sim, processes: procs }, events: [] })

// ═════════════════════════════════════════════════════════════════════════════
// ITEM 1 — LEDGE SEAT: a grounded sprite is POSOFF-LIFTED so its feet sit on the ledge
// ═════════════════════════════════════════════════════════════════════════════
describe('jt2-9 item 1 — the render applies each frame’s POSOFF Y-offset (feet on the ledge)', () => {
  it('a grounded buzzard’s draw op is lifted by its POSOFF YOFF above the feet line (BRSTND: 13px)', async () => {
    const dmod = await loadDemo()
    const r = await loadDemoRender()
    const FEET = 210 // CLIF5 snapY (LNDB5)
    const demo = only(dmod.createWaveDemo(SEED), [groundedEnemy(0x40, 146, FEET)])

    const op = r.drawList(demo).find((o) => o.kind === 'entity')
    expect(op, 'the grounded enemy must produce an entity op').toBeTruthy()
    expect(op!.name, 'a grounded, still buzzard selects BRSTND').toBe('BRSTND')

    const yoff = await yoffOf('BRSTND')
    expect(yoff, 'BRSTND POSOFF decodes to 13').toBe(13)
    expect(
      op!.y,
      `the sprite must draw YOFF (${yoff}) px ABOVE the feet, not at the feet — destY = CLSY − YOFF`,
    ).toBe(FEET - yoff)
    // Direction guard: whatever the exact math, the sprite is LIFTED, never hung below.
    expect(op!.y, 'the sprite top is above the feet line, so the feet do not clip through the ledge').toBeLessThan(FEET)
  })

  it('the lift is per-FRAME, not a global constant — a taller-offset frame lifts more', async () => {
    // A grounded ostrich mount (ORSTND, YOFF 19) lifts MORE than a buzzard (BRSTND, 13).
    // A single global seat-Y fix would move both by the same amount and fail this.
    const dmod = await loadDemo()
    const r = await loadDemoRender()
    const FEET = 162 // CLIF4 (LNDB4)
    const demo = only(dmod.createWaveDemo(SEED), [groundedPlayer(1, 146, FEET)])
    const ops = r.drawList(demo).filter((o) => o.kind === 'entity')
    const mount = ops.find((o) => o.name === 'ORSTND')
    expect(mount, 'the grounded player draws its ostrich mount ORSTND').toBeTruthy()
    expect(mount!.y, 'ORSTND lifts by its own POSOFF (19), not the buzzard’s 13').toBe(FEET - (await yoffOf('ORSTND')))
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// ITEM 4b — MOUNT + RIDER ALIGNMENT: they carry DIFFERENT POSOFF words
// ═════════════════════════════════════════════════════════════════════════════
describe('jt2-9 item 4b — mount and rider are POSOFF-aligned, not stacked at one origin', () => {
  it('the ostrich mount and PLYR1 rider draw at their OWN POSOFF offsets (different y), not the same point', async () => {
    const dmod = await loadDemo()
    const r = await loadDemoRender()
    const FEET = 162
    const demo = only(dmod.createWaveDemo(SEED), [groundedPlayer(1, 146, FEET)])
    const ops = r.drawList(demo).filter((o) => o.kind === 'entity')

    const mount = ops.find((o) => o.name === 'ORSTND')
    const rider = ops.find((o) => o.name === 'PLYR1')
    expect(mount && rider, 'a player draws [mount, rider]').toBeTruthy()

    const mountYoff = await yoffOf('ORSTND') // 19
    const riderYoff = await yoffOf('PLYR1') // 17
    expect(mount!.y, 'the ostrich is lifted by its POSOFF (19)').toBe(FEET - mountYoff)
    expect(rider!.y, 'the rider is lifted by ITS POSOFF (17)').toBe(FEET - riderYoff)
    // The two POSOFFs differ by 2, so the rider sits 2px lower than the mount top —
    // the ROM’s composition. Stacking both at one origin (the current bug) fails this.
    expect(
      mount!.y === rider!.y,
      'the mount and rider must NOT draw at the same y — they carry different POSOFF words',
    ).toBe(false)
    expect(rider!.y - mount!.y, 'the rider is exactly the POSOFF delta (2px) below the mount').toBe(mountYoff - riderYoff)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// ITEM 1/4b — P2's STORK MOUNT (Reviewer round-2 REJECT): the POSOFF fix silently
//   no-lifted P2's mount because the stork mount frames (SFLY1R / SRUN1R..SRUN4R /
//   SRUNSR) had no ENTITY_RECORDS entry — posOffset returned {0,0}, so the mount
//   drew at raw feet Y while the PLYR2 rider lifted 17px (a 17px gap + clipped
//   stork feet). The ROM HAS these POSOFFs (JOUSTI.SRC:782-796: SFLY1R $00ED→19,
//   SRUNSR $00EE→18, SRUN1-4R $00ED→19). The item-4b rail above only exercised the
//   OSTRICH, so this shipped green. This rail applies the same alignment PROPERTY
//   to the STORK — derived from the RIDER's own record (no dependence on the not-
//   yet-added stork records), so it reds now and greens once Dev transcribes them.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt2-9 item 1/4b — P2 STORK: the mount is POSOFF-lifted and the rider sits ON it', () => {
  /** The mount/rider alignment property: the rider sits AT or just below the mount
   * top (rider.y >= mount.y, a small gap), and the mount is lifted off the feet.
   * P1 already satisfies it; P2 (stork) must too. */
  async function alignmentOf(mount: 'ostrich' | 'stork', mountName: string, riderName: string, feetY: number) {
    const dmod = await loadDemo()
    const r = await loadDemoRender()
    const demo = only(dmod.createWaveDemo(SEED), [groundedPlayer(1, 146, feetY, mount)])
    const ops = r.drawList(demo).filter((o) => o.kind === 'entity')
    const m = ops.find((o) => o.name === mountName)
    const rd = ops.find((o) => o.name === riderName)
    expect(m && rd, `the ${mount} player draws [${mountName}, ${riderName}]`).toBeTruthy()
    return { mountY: m!.y, riderY: rd!.y }
  }

  it('CONTROL — P1 ostrich already aligns: rider sits ON the mount, mount lifted off the feet', async () => {
    const FEET = 162
    const { mountY, riderY } = await alignmentOf('ostrich', 'ORSTND', 'PLYR1', FEET)
    expect(mountY, 'the ostrich mount is lifted off the feet').toBeLessThan(FEET)
    expect(riderY >= mountY, 'the rider sits AT or below the mount top (on the bird)').toBe(true)
    expect(riderY - mountY, 'and close to it — a small POSOFF delta, not a big gap').toBeLessThanOrEqual(4)
  })

  it('P2 STORK — the mount must be POSOFF-lifted and the PLYR2 rider must sit ON it (RED until the stork records land)', async () => {
    const FEET = 162
    const { mountY, riderY } = await alignmentOf('stork', 'SRUNSR', 'PLYR2', FEET)
    // (1) feet-on-ledge: the stork mount is lifted off the feet (currently drawn AT
    // feetY because SRUNSR has no ENTITY_RECORDS POSOFF → posOffset {0,0}).
    expect(mountY, 'the STORK mount must be POSOFF-lifted off the feet, not clipping the ledge').toBeLessThan(FEET)
    // (2) alignment: the rider sits AT/just below the mount top — NOT floating 17px
    // above an un-lifted mount. Derived from the observable, no hardcoded stork YOFF.
    expect(riderY >= mountY, 'the PLYR2 rider must sit ON the stork (at/below the mount top), not float above it').toBe(true)
    expect(riderY - mountY, 'the rider sits close to the mount top (a small POSOFF delta)').toBeLessThanOrEqual(4)
  })
})
