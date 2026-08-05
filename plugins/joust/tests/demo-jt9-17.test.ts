// tests/demo-jt9-17.test.ts
//
// Story jt9-17 — RED phase (Pennywise / TEA). The horizontal half of the
// non-killing bounce (`OSTLR`, JOUSTRV4.SRC:5110-5159), WIRED — measured off
// `stepDemo`, the same seam jt5-4 used for the vertical half (audio-thud.test.ts).
//
// jt5-4 applied the vertical arm (`OSTXUP`/`OSTXDN`): a thud inverts/halves velY
// and shoves posY by ±2. The horizontal arm was struck from its AC-1 as
// undeliverable because (1) `toJoustEntity` hard-codes `velX: 0`/`bumpX: 0`
// (demo.ts, both branches), so a bounce sees no horizontal velocity to reverse,
// and (2) `withBounced` writes back only velY/posY. This story closes both.
//
// PVELX *is* the FLYX index (`LDA PVELX,U / LDD A,X`, :7150-7158), so OSTLR
// reverses `velXIndex` itself and the ±2 slowdown is one flap-step on the EVEN
// ladder. `toJoustEntity` must carry `velXIndex` into `JoustEntity.velX`, the
// bounce fork must call the OSTLR law after the vertical arm — GATED on the
// COLDX-equivalent (a superimposed pair gets NO horizontal bounce, `BEQ OSTNLR`
// :5112) — and `withBounced` must carry the reflected index, the parked PBUMPX
// and the PFACE turn back onto the process, with PBUMPX draining ≤3 px/frame
// into posX (`WRAPX`, :7270-7288).
//
// These fail today: `velXIndex` is unchanged by a collision, facing does not
// turn, and no PBUMPX moves posX.

import { describe, it, expect } from 'vitest'
import { createWaveDemo, stepDemo, type DemoProcess, type DemoState } from '../src/core/demo.js'
import type { EntityState } from '../src/core/flight.js'
import type { EnemyState } from '../src/core/enemy.js'

// ─── Fixtures (the audio-thud.test.ts pattern) ──────────────────────────────

/** A nap no window here reaches: the process is FROZEN — it still collides
 *  (`collisionPass` ignores `nap`) but takes no flight step, so the ONLY thing
 *  that can move it is the bounce and its PBUMPX drain. */
const FROZEN = 100_000

const entity = (posXpx: number, posYpx: number, velXIndex = 0, velY = 64): EntityState => ({
  posX: posXpx,
  posY: posYpx << 8,
  velXIndex,
  velXFrac: 0,
  velY,
  timeUp: 10,
  groundState: null,
  plantZ: 0,
  airborne: true,
  animPhase: 0,
})

const enemyProcess = (id: number, e: EntityState, facing: -1 | 1 = 1, nap = FROZEN): DemoProcess => ({
  id,
  cls: 'secondary',
  nap,
  period: nap,
  kind: 'enemy',
  enemyType: 'bounder',
  enemy: { entity: e, facing, pchase: 0, brain: 'linet', decision: 'boundr' } as EnemyState,
})

/** A demo whose process list is exactly the one handed in, with the smart
 *  budget pinned so no buzzard is promoted mid-window. */
function stage(processes: DemoProcess[]): DemoState {
  const base = createWaveDemo(0x1234)
  return { ...base, sim: { ...base.sim, processes, budget: { nsmart: 0, wsmart: 0 } } }
}

const procOf = (d: DemoState, id: number): DemoProcess | undefined =>
  d.sim.processes.find((p) => p.id === id)
const enemyEntityOf = (d: DemoState, id: number): EntityState | undefined => procOf(d, id)?.enemy?.entity
const velXIndexOf = (d: DemoState, id: number): number | undefined => enemyEntityOf(d, id)?.velXIndex
const facingOf = (d: DemoState, id: number): number | undefined => procOf(d, id)?.enemy?.facing
const posXOf = (d: DemoState, id: number): number | undefined => enemyEntityOf(d, id)?.posX

const A = 0xa01 // the LEFT party (smaller posX)
const B = 0xa02 // the RIGHT party

describe('jt9-17 — the horizontal bounce reverses PVELX and turns the birds (OSTLR wired)', () => {
  it('offset pair: the LEFT bird reflects LEFT and the RIGHT bird reflects RIGHT, each slowed by 2', () => {
    // A on the left charging right (velXIndex +6), B on the right charging left
    // (-6). COLDX = 104-100 = +4 != 0, so the horizontal arm fires.
    // Left:  -6+2 = -4.   Right: -(-6)-2 = +4.
    const d = stepDemo(
      stage([
        enemyProcess(A, entity(100, 92, +6), 1),
        enemyProcess(B, entity(104, 94, -6), 1),
      ]),
      {},
    )
    expect(procOf(d, A) && procOf(d, B), 'precondition: both birds survive the bounce').toBeTruthy()
    expect(velXIndexOf(d, A), 'left bird: PVELX +6 reversed & slowed -> -4').toBe(-4)
    expect(velXIndexOf(d, B), 'right bird: PVELX -6 reversed & slowed -> +4').toBe(+4)
  })

  it('offset pair: the bounce TURNS the birds — left faces left, right faces right', () => {
    // PFACE writes (:5123/:5135/:5146/:5156): left -> -1, right -> +1 (ROM CLR = 0 = right).
    const d = stepDemo(
      stage([
        enemyProcess(A, entity(100, 92, +6), 1), // starts facing RIGHT
        enemyProcess(B, entity(104, 94, -6), -1), // starts facing LEFT
      ]),
      {},
    )
    expect(facingOf(d, A), 'the LEFT bird is turned to face LEFT').toBe(-1)
    expect(facingOf(d, B), 'the RIGHT bird is turned to face RIGHT').toBe(1)
  })

  it('SUPERIMPOSED pair (COLDX == 0): NO horizontal bounce — velocity and facing untouched', () => {
    // Identical posX -> COLDX == 0 -> `BEQ OSTNLR` (:5112): the birds still bounce
    // VERTICALLY, but neither PVELX nor PFACE is touched. This guards the gate: a
    // port that reflects an unconditional pair would redden here.
    const d = stepDemo(
      stage([
        enemyProcess(A, entity(100, 92, +6), 1),
        enemyProcess(B, entity(100, 94, -6), -1),
      ]),
      {},
    )
    expect(velXIndexOf(d, A), 'dead-centre: left PVELX unchanged').toBe(+6)
    expect(velXIndexOf(d, B), 'dead-centre: right PVELX unchanged').toBe(-6)
    expect(facingOf(d, A), 'dead-centre: left facing unchanged').toBe(1)
    expect(facingOf(d, B), 'dead-centre: right facing unchanged').toBe(-1)
  })

  it('the PBUMPX shove drains into posX at <=3 px/frame after the bounce', () => {
    // Choose velocities that reflect to index 0 so FLIGHT contributes no X (and
    // the parties are FROZEN anyway): the only thing that can move posX is the
    // parked PBUMPX draining. Left +2 -> 0 (bump on left from right -2 = -2>>1 = -1);
    // right -2 -> 0 (bump on right from left +2 = 2>>1 = +1). |bump| = 1 <= 3, so
    // it drains whole within a frame. After settling, the left bird has slid one
    // pixel LEFT and the right one pixel RIGHT — shoved apart by the bump alone.
    let d = stage([
      enemyProcess(A, entity(100, 92, +2), 1),
      enemyProcess(B, entity(104, 94, -2), 1),
    ])
    const x0A = posXOf(d, A)
    const x0B = posXOf(d, B)
    const perFrameDeltas: number[] = []
    let prevA = x0A ?? 0
    for (let i = 0; i < 3; i++) {
      d = stepDemo(d, {})
      const nowA = posXOf(d, A) ?? 0
      perFrameDeltas.push(Math.abs(nowA - prevA))
      prevA = nowA
    }
    expect(Math.max(...perFrameDeltas), 'PBUMPX drains at most 3 px in any one frame').toBeLessThanOrEqual(3)
    expect(posXOf(d, A), 'left bird shoved one pixel LEFT by its PBUMPX = -1').toBe((x0A ?? 0) - 1)
    expect(posXOf(d, B), 'right bird shoved one pixel RIGHT by its PBUMPX = +1').toBe((x0B ?? 0) + 1)
  })
})
