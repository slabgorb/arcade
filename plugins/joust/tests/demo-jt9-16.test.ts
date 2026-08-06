// tests/demo-jt9-16.test.ts
//
// Story jt9-16 — RED phase (Leeloo / TEA). THE TWO THUD PATHS RETURN OPPOSITE
// CARRY: the ROM's collision scan CONTINUES after an enemy thud (SNETHD) and
// ABORTS the current object's whole remaining scan after a person tie (SNPTHD).
// The port's inner pair loop (demo.ts) `continue`s for BOTH cues, so it
// models neither.
//
// ─── WHAT THE MACHINE DOES (verified against the ROM, not assumed) ────────────
// The scan driver walks an OUTER pointer U over the process list (:4874
// `LDU PLINK,U`) and, for each U, an INNER pointer X over the elements AFTER it
// (:4880 `LEAX ,U` / :4881 `LDX PLINK,X`) — exactly this port's
// `for (i) for (j = i + 1)` (U = the earlier element `a`/`pa`, X = the later
// `b`/`pb`). Each pair goes through HITEM, and the driver reads HITEM's CARRY:
//
//   • SNETHD (enemies collide, :5019) → OSTH11 `JMP HITEM2` (:5029) →
//     HITEM1 `ANDCC #$FE` (:4947) CLEARS carry. Driver `BCS 20$` at :4886 is
//     NOT taken → falls to :4897 `45$ LDX PLINK,X` → the INNER scan CONTINUES.
//
//   • SNPTHD (persons collide, "BOTH ON SAME LEVEL", :5014) → OSTXTT `JSR OSTXTP`
//     `BRA OSTX12` (:5054) → OSTX12 `ORCC #$01` (:5059) SETS carry. Driver
//     `BCS 20$` at :4886 IS taken → `20$`/`25$ LDU PLINK,U` ADVANCES the OUTER
//     walk to the next U, abandoning the current U's remaining inner partners.
//
// The surprising part (and why jt5-4 filed this rather than dismissing it): the
// tie consumes the object's WHOLE remaining scan even though NOBODY DIED —
// OSTX12's comment even reads "REG.U GUY IS DEAD" though OSTXTP only restored the
// pair. The provenance companion demo-jt9-16-source.test.ts pins those ROM lines.
//
// ─── OBSERVABILITY: THREE bodies, one shared object (the story's own spec) ─────
// With exactly two eligible entities the inner loop has nothing left to visit
// after the first pair either way — continue and abort are indistinguishable
// (this is why jt5-4's two-body fixtures could not see it and it was descoped).
// The minimum discriminator is a pile-up: an object A that ties one partner AND
// still overlaps a THIRD body on the same frame, with the tie visited FIRST.
//
// Staging (all frozen at one plantHeight so a person pair is an exact tie →
// bounce; B and C sit 20px apart so broadPhase keeps them from pairing, while
// each is 10px from A and so overlaps A):
//
//        A @ x=100     B @ x=110     C @ x=90      (array order [A, B, C])
//        A–B: overlap (10<16)   A–C: overlap (10<16)   B–C: gap 20 → apart
//
// A is the outer object U; the inner scan visits A–B (a same-level PLAYERS-COLIDE
// tie, SNPTHD) before A–C. ROM-faithful: A–B's SET carry aborts A's scan, so A–C
// never resolves this frame. RED today: the loop `continue`s and resolves A–C
// too, emitting a SECOND player-thud from an object whose scan the machine had
// already abandoned.

import { describe, it, expect } from 'vitest'
import { createWaveDemo, stepDemo, type DemoProcess, type DemoState } from '../src/core/demo.js'
import type { EntityState } from '../src/core/flight.js'

const SEED = 0x1234
// One shared top for the whole pile-up. plantHeight = plantZ + (posY>>8), so an
// identical top + plantZ 0 makes any person pair an EXACT tie → bounce (SNPTHD),
// never a kill (joust.ts). Staged at the x=100/top=110 spot jt9-14 proved the
// wave anchor never reaches.
const LEVEL = 110

/** Gravity-exempt hover (jt9-14's idiom): velY 0 / timeUp 1 so a frozen process
 *  holds its staged altitude; airborne true so collisionMaskFor yields a real
 *  span mask (CWNG3R for a knight, PT1RC for a ptero) rather than null. */
function entity(over: Partial<EntityState> = {}): EntityState {
  return {
    posX: 100, posY: LEVEL << 8, velXIndex: 0, velXFrac: 0, velY: 0, timeUp: 1,
    groundState: null, plantZ: 0, airborne: true, animPhase: 0, ...over,
  }
}

function player(id: number, x: number): DemoProcess {
  return {
    id, cls: 'primary', nap: 1, period: 1, kind: 'player', facing: 1, mount: 'ostrich',
    collisionEnabled: true, entity: entity({ posX: x }),
  }
}

function ptero(id: number, x: number): DemoProcess {
  return {
    id, cls: 'secondary', nap: 1, period: 1, kind: 'ptero', facing: 1,
    collisionEnabled: true, entity: entity({ posX: x }),
  }
}

/**
 * Stage `procs` plus a wave-1 ground enemy (the jt5-16 anchor — it holds the wave
 * open so stepDemo does not advance/spawn; a ptero-only fixture has no live enemy
 * of its own). FREEZE every process by napping it far past this frame so nothing
 * drifts before collisionPass reads the staged positions, then run ONE frame and
 * return that frame's cue types. Napping does not gate collision eligibility —
 * collisionPass scans every player/enemy/ptero with collisionEnabled — so the
 * frozen pile-up is resolved exactly as staged.
 */
function frameCues(procs: DemoProcess[]): string[] {
  const base = createWaveDemo(SEED)
  const anchor = base.sim.processes.find((p) => p.kind === 'enemy')
  if (!anchor) throw new Error('wave 1 must supply a ground enemy to hold the wave open')
  const frozen = [...procs, anchor].map((p) => ({ ...p, nap: 100_000 }))
  const state: DemoState = {
    ...base,
    sim: { ...base.sim, processes: frozen, budget: { nsmart: 0, wsmart: 0 } },
    events: [],
    cues: [],
  }
  const d = stepDemo(state, {})
  return d.cues.map((c) => c.type as string)
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — THE HEADLINE: a person tie (SNPTHD) aborts the object's remaining scan.
// RED today: the inner loop `continue`s and resolves A–C too.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt9-16 AC-1 — SNPTHD (person tie) consumes the object\'s whole remaining scan', () => {
  it('a knight ties one body while a THIRD still overlaps it — only the tie resolves', () => {
    // A–B is a same-level PLAYERS-COLIDE tie (SNPTHD, :5014); C still overlaps A
    // but is visited AFTER B. On the machine A–B's SET carry (:5059 ORCC) is read
    // at :4886 `BCS 20$` and advances the OUTER walk — A's scan is over, A–C is
    // never tested. So exactly ONE player-thud fires for object A this frame.
    const thuds = frameCues([player(1, 100), player(2, 110), player(3, 90)])
      .filter((c) => c === 'player-thud')
    expect(
      thuds.length,
      'A–B ties and aborts A\'s scan (ROM :4886 BCS 20$ on SNPTHD\'s :5059 set carry); A–C must NOT resolve — RED gets 2',
    ).toBe(1)
  })

  it('the aborted tie kills no one — no death cue leaks from a mis-resolved A–C', () => {
    // Non-vacuity guard: the abort is about scan CONTINUATION, not deaths — a tie
    // removes nobody. If a fix wrongly turned the abort into a kill, or a stray
    // fourth contact resolved, a *-death cue would appear here.
    const deaths = frameCues([player(1, 100), player(2, 110), player(3, 90)])
      .filter((c) => /-death$/.test(c))
    expect(deaths, 'a same-level tie is a bounce — nobody dies').toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — THE CONTROL: an enemy thud (SNETHD) still CONTINUES the scan.
// Passes today AND must keep passing — guards against a fix that aborts on BOTH
// cues (making the whole loop stop after the first contact). Only SNPTHD aborts.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt9-16 AC-2 — SNETHD (enemy thud) leaves the scan running', () => {
  it('an enemy that thuds one body, with a THIRD overlapping it, resolves BOTH contacts', () => {
    // Identical geometry to AC-1 but all three are pteros — a ptero pairs with a
    // ptero through the joust pass, both sides side with the enemies (:4961), so
    // each pair is SNETHD (enemy-thud). SNETHD clears carry (:4947 ANDCC) → the
    // inner scan continues → A–B AND A–C both resolve → TWO enemy-thuds. A fix
    // that aborts enemy thuds too would drop this to 1.
    const thuds = frameCues([ptero(0xb31, 100), ptero(0xb32, 110), ptero(0xb33, 90)])
      .filter((c) => c === 'enemy-thud')
    expect(
      thuds.length,
      'SNETHD continues (:4886 BCS not taken); A visits both B and C → two enemy-thuds',
    ).toBe(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — THE DISCRIMINATOR IS REAL: with only TWO bodies the two paths agree.
// Pins WHY jt5-4 could not see this (and why the fixtures above need a third
// body): after the first pair the inner loop is empty regardless, so continue and
// abort are indistinguishable. This passes today and after — it certifies the
// harness isolates the third-body effect, not some two-body artefact.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt9-16 AC-3 — two bodies cannot tell continue from abort', () => {
  it('a lone person tie emits exactly one player-thud either way', () => {
    const thuds = frameCues([player(1, 100), player(2, 110)])
      .filter((c) => c === 'player-thud')
    expect(thuds.length, 'one pair, one tie — no remaining scan to abort or continue').toBe(1)
  })
})
