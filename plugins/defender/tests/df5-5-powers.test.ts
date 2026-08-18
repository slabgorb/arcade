// tests/df5-5-powers.test.ts
//
// Story df5-5 — RED phase (Tyr One-Handed / TEA). The two emergency powers as a PURE,
// clock-free core module: plugins/defender/src/core/powers.ts. Smart-bomb (SBOMB,
// defender/DEFA7.SRC:3175) clears the on-screen enemies via the df4-1 collision seam;
// hyperspace (HYPER, defender/DEFA7.SRC:3213) teleports the ship to a RANDOM position with
// re-entry risk. The ROM trigger + timing are ported and cited (ROM-always-wins); ONLY the
// full-screen strobe PRESENTATION is substituted — the smart bomb's SBMBX0 COM PCRAM
// whole-page invert (:3199) and the hyperspace screen-clear route through the df4-2
// effect-policy as freeze/fade/particle (ADR-0005, the ONE standing exception).
//
// ─── WHY THIS IS RED ────────────────────────────────────────────────────────────────
// src/core/powers.ts does not exist yet → loadPowers() throws a self-describing
// "not built yet" per test (the effects.ts / collision.ts runtime-specifier pattern,
// so neither tsc nor the bundler resolves the absent module statically). The AC-2
// classifier cases (`classify('smart-bomb')` / `classify('hyperspace')`) hit effects.ts's
// assertNever exhaustiveness guard and THROW today — GREEN adds the two members to
// EffectEvent + classify. The AC-4 claims gate is RED because no claim cites the
// SBOMB/HYPER window yet (the nearest existing claims sit at DEFA7.SRC:3157-3160, below it).
//
// ─── THE ROM MODEL THIS SUITE PINS (defender/DEFA7.SRC) ──────────────────────────────
// SMART BOMB (:3175-3209):
//   :3175 SBOMB LDA SBFLG / :3176 BNE SBMBX2   — in-progress flag; a second press bails.
//   :3178 LDA PSBC,X      / :3179 BEQ SBMBX2   — per-player smart-bomb COUNT; zero bails.
//   :3180 INC SBFLG       / :3181 DEC PSBC,X   — on fire: arm + spend one bomb.
//   :3189 LDA OTYP,X / :3190 CMPA #$02 / :3191 BHS SBMB2 — clears objects with OTYP < $02
//                                                (via :3192 JSR [OCVECT,X], the df4-1 seam).
//   :3197 LDA #4 SCREEN FLASHES/2               — the strobe TIMING (cited; presentation
//   :3199 SBMBX0 COM PCRAM                      — SUBSTITUTED per ADR-0005; the whole-page
//                                                invert this suite proves the guard catches).
//   :3209 SBMBX2 JMP SUCIDE                     — SBOMB is a df3 scheduler process.
// HYPERSPACE (:3213-3242):
//   :3213 HYPER LDA STATUS / :3214 BITA #$FD / :3215 LBNE HYPX — NO GO unless (STATUS&$FD)==0.
//   :3216 LDA #$77 / STA STATUS                 — the in-hyperspace STATUS (re-entry marker).
//   :3219 NAP 15,HYP02                          — scheduler nap, not an rAF.
//   :3225 LDD SEED … :3229 LSRB / :3230 BCC HYP0 — RANDOM direction off the SEED low bit:
//   :3231 LDD #$2000 / :3232 LDX #$0300         — carry SET (bit0=1): X=$2000, face RIGHT.
//   :3234 LDX #-$0300 / :3235 LDD #$7000        — carry CLEAR (bit0=0): X=$7000, face LEFT.
//   :3238 LDB HSEED / :3239 LSRB / :3240 ADDB #YMIN — RANDOM Y = (HSEED>>1) + YMIN.
//   (:3242+ CLRD/STA PLAXV) — velocity zeroed: you re-enter still, at a random spot (the risk).
//
// ─── CONTRACT (what GREEN/Dev must build in src/core/powers.ts) ──────────────────────
//   consts  SMART_BOMB_CLEAR_TYPE_MAX=$02, SMART_BOMB_FLASHES=4, SMART_BOMB_PTYPE,
//           HYPER_NOGO_MASK=$FD, HYPER_STATUS=$77, HYPER_NAP=15, HYPER_X_RIGHT=$2000,
//           HYPER_X_LEFT=$7000, HYPER_DIR_MAG=$0300, HYPER_PTYPE
//   fns     clearsType(otyp) · smartBomb(state) · spawnSmartBomb(sched)
//           canHyperspace(status) · hyperspace(rand) · spawnHyperspace(sched, rand)
//   AC-4b   a claims/*.json (18-powers.json) enrolling every constant, byte-verified by
//           brief-dossier.test.ts; purity.test.ts auto-sweeps powers.ts (no Math.random/clock).
// AC-citations + AC-purity are NOT re-asserted here — the armed gates (citations.test.ts,
// brief-dossier.test.ts, purity.test.ts) cover them (the ship.test.ts convention).

import { describe, it, expect } from 'vitest'
import { createScheduler, type Scheduler, type Process } from '../src/core/scheduler.js'
import { YMIN, wrap16, type Facing } from '../src/core/world.js'
import { classify, assertNoFullFrameStrobe } from '../src/core/effects.js'
import { loadClaims } from './audit/dossier-sweep.js'

// ─── The contract this RED pins. Dev implements it in powers.ts (GREEN). ──────────────
interface SmartBombState {
  /** SBFLG: the smart-bomb is already in progress (a second press must no-op). */
  readonly armed: boolean
  /** PSBC,X: how many smart bombs this player still holds. */
  readonly count: number
}
interface SmartBombResult {
  readonly fired: boolean
  readonly armed: boolean
  readonly count: number
}
/** The teleport HYPER computes: a new player X ($2000/$7000), facing, integer Y, and a
 *  zeroed X velocity (STA PLAXV). */
interface Teleport {
  readonly x16: number
  readonly facing: Facing
  readonly y: number
  readonly vx: number
}

interface PowersModule {
  // smart-bomb
  SMART_BOMB_CLEAR_TYPE_MAX: number
  SMART_BOMB_FLASHES: number
  SMART_BOMB_PTYPE: number
  clearsType(otyp: number): boolean
  smartBomb(state: SmartBombState): SmartBombResult
  spawnSmartBomb(sched: Scheduler): Process
  // hyperspace
  HYPER_NOGO_MASK: number
  HYPER_STATUS: number
  HYPER_NAP: number
  HYPER_X_RIGHT: number
  HYPER_X_LEFT: number
  HYPER_DIR_MAG: number
  HYPER_PTYPE: number
  canHyperspace(status: number): boolean
  hyperspace(rand: () => number): Teleport
  spawnHyperspace(sched: Scheduler, rand: () => number): Process
}

/**
 * Load the not-yet-built module with a self-describing failure. A runtime-assembled
 * specifier so neither tsc nor the bundler resolves it statically; a missing module reads
 * as "not built yet", never a collect crash (the effects.ts / collision.ts pattern).
 */
async function loadPowers(): Promise<PowersModule> {
  const spec = ['..', 'src', 'core', 'powers.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ spec)) as Partial<PowersModule>
    for (const fn of ['clearsType', 'smartBomb', 'spawnSmartBomb', 'canHyperspace', 'hyperspace', 'spawnHyperspace'] as const) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    for (const k of [
      'SMART_BOMB_CLEAR_TYPE_MAX',
      'SMART_BOMB_FLASHES',
      'SMART_BOMB_PTYPE',
      'HYPER_NOGO_MASK',
      'HYPER_STATUS',
      'HYPER_NAP',
      'HYPER_X_RIGHT',
      'HYPER_X_LEFT',
      'HYPER_DIR_MAG',
      'HYPER_PTYPE',
    ] as const) {
      if (typeof mod[k] !== 'number') throw new Error(`module has no \`${k}\` constant`)
    }
    return mod as PowersModule
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e)
    throw new Error(
      'src/core/powers.ts not built yet — GREEN (Dev) ports the two emergency powers as a PURE ' +
        'module: smartBomb (SBOMB trigger DEFA7.SRC:3175, arm+spend :3180-3181, clearsType otyp<$02 ' +
        ':3190) / hyperspace (HYPER gate DEFA7.SRC:3213-3215, random teleport off the injected rng ' +
        'seam :3229-3240, velocity zeroed) / spawnSmartBomb + spawnHyperspace (df3 scheduler ' +
        'processes, SUCIDE :3209); the presentation routes through the df4-2 classify()/guard ' +
        `(ADR-0005), and every constant is enrolled in claims/18-powers.json. (${why})`,
    )
  }
}

// A deterministic injected rng: successive bytes 0..255 (the shell's seeded seam, never
// Math.random — purity.test.ts holds the line). Wraps so a bounds sweep can over-draw.
const seq = (bytes: readonly number[]): (() => number) => {
  let i = 0
  return () => bytes[i++ % bytes.length]
}

/** A varied 8×8 index surface: cell i = i mod 16, so an every-cell inversion (0xF ^ cell)
 *  differs from the original in every position — the smart-bomb COM PCRAM strobe shape. */
const variedFrame = (): Uint8Array => Uint8Array.from({ length: 64 }, (_, i) => i % 16)

// ══════════════════════════════════════════════════════════════════════════════════════
// AC1 — SMART BOMB: the SBOMB trigger, the spend, and the clear gate (DEFA7.SRC:3175-3199)
// ══════════════════════════════════════════════════════════════════════════════════════
describe('df5-5 AC-1 — smart-bomb: the SBOMB trigger + spend + clear gate, ported and cited', () => {
  it('SMART_BOMB_CLEAR_TYPE_MAX === 0x02: the OTYP clear threshold (CMPA #$02, DEFA7.SRC:3190)', async () => {
    const { SMART_BOMB_CLEAR_TYPE_MAX } = await loadPowers()
    expect(SMART_BOMB_CLEAR_TYPE_MAX).toBe(0x02)
  })

  it('SMART_BOMB_FLASHES === 4: the ROM strobe count (LDA #4 SCREEN FLASHES/2, DEFA7.SRC:3197)', async () => {
    const { SMART_BOMB_FLASHES } = await loadPowers()
    expect(SMART_BOMB_FLASHES).toBe(4)
  })

  it('clearsType: objects with OTYP < $02 are cleared, OTYP >= $02 are spared (BHS SBMB2, :3191)', async () => {
    const { clearsType } = await loadPowers()
    expect(clearsType(0x00), 'type 0 is below the threshold — cleared').toBe(true)
    expect(clearsType(0x01), 'type 1 is below the threshold — cleared').toBe(true)
    expect(clearsType(0x02), 'type $02 is at the BHS boundary — spared').toBe(false)
    expect(clearsType(0x05), 'a higher type is spared').toBe(false)
  })

  it('smartBomb fires with a bomb in hand: arms (INC SBFLG :3180) and spends one (DEC PSBC :3181)', async () => {
    const { smartBomb } = await loadPowers()
    expect(smartBomb({ armed: false, count: 3 })).toEqual({ fired: true, armed: true, count: 2 })
  })

  it('smartBomb bails while already in progress (SBFLG set → BNE SBMBX2, :3175-3176): no fire, no spend', async () => {
    const { smartBomb } = await loadPowers()
    expect(smartBomb({ armed: true, count: 3 })).toEqual({ fired: false, armed: true, count: 3 })
  })

  it('smartBomb bails with an empty stock (PSBC == 0 → BEQ SBMBX2, :3178-3179): no fire, count stays 0', async () => {
    const { smartBomb } = await loadPowers()
    expect(smartBomb({ armed: false, count: 0 })).toEqual({ fired: false, armed: false, count: 0 })
  })
})

// ══════════════════════════════════════════════════════════════════════════════════════
// AC1/AC3 — HYPERSPACE: the HYPER gate + the RANDOM teleport (DEFA7.SRC:3213-3242)
// ══════════════════════════════════════════════════════════════════════════════════════
describe('df5-5 AC-1/AC-3 — hyperspace: the HYPER gate + random teleport, ported and cited', () => {
  it('the hyperspace constants are the ROM values at the right radix', async () => {
    const p = await loadPowers()
    expect(p.HYPER_NOGO_MASK, 'BITA #$FD (DEFA7.SRC:3214)').toBe(0xfd)
    expect(p.HYPER_STATUS, 'LDA #$77 (DEFA7.SRC:3216)').toBe(0x77)
    expect(p.HYPER_NAP, 'NAP 15 (DEFA7.SRC:3219)').toBe(15)
    expect(p.HYPER_X_RIGHT, 'LDD #$2000 (DEFA7.SRC:3231)').toBe(0x2000)
    expect(p.HYPER_X_LEFT, 'LDD #$7000 (DEFA7.SRC:3235)').toBe(0x7000)
    expect(p.HYPER_DIR_MAG, 'LDX #$0300 / #-$0300 (DEFA7.SRC:3232,3234)').toBe(0x0300)
  })

  it('canHyperspace: NO GO unless (STATUS & $FD) == 0 (BITA #$FD / LBNE HYPX, :3214-3215)', async () => {
    const { canHyperspace } = await loadPowers()
    expect(canHyperspace(0x00), 'a clear STATUS is GO').toBe(true)
    expect(canHyperspace(0x02), 'only bit 1 set — masked out by $FD, still GO').toBe(true)
    expect(canHyperspace(0x01), 'bit 0 set — NO GO').toBe(false)
    expect(canHyperspace(0x77), 'the in-hyperspace STATUS — NO GO').toBe(false)
  })

  it('teleport DIRECTION off the SEED low bit: bit0=1 → X=$2000 facing RIGHT (LSRB/BCC fall-through, :3229-3232)', async () => {
    const { hyperspace, HYPER_X_RIGHT } = await loadPowers()
    const t = hyperspace(seq([0b0000_0001, 100]))
    expect(t.x16).toBe(HYPER_X_RIGHT)
    expect(t.facing).toBe('right')
  })

  it('teleport DIRECTION off the SEED low bit: bit0=0 → X=$7000 facing LEFT (BCC HYP0, :3230,3234-3235)', async () => {
    const { hyperspace, HYPER_X_LEFT } = await loadPowers()
    const t = hyperspace(seq([0b0000_0000, 0]))
    expect(t.x16).toBe(HYPER_X_LEFT)
    expect(t.facing).toBe('left')
  })

  it('teleport Y is (HSEED >> 1) + YMIN (LDB HSEED / LSRB / ADDB #YMIN, :3238-3240)', async () => {
    const { hyperspace } = await loadPowers()
    // second draw = 100 → (100 >> 1) + 42 = 50 + 42 = 92
    expect(hyperspace(seq([1, 100])).y).toBe((100 >> 1) + YMIN)
    // second draw = 0 → 0 + 42 = YMIN (the low edge of the band)
    expect(hyperspace(seq([0, 0])).y).toBe(YMIN)
  })

  it('re-entry risk: the ship re-appears STILL — the X velocity is zeroed (CLRD/STA PLAXV, :3242+)', async () => {
    const { hyperspace } = await loadPowers()
    expect(hyperspace(seq([1, 200])).vx).toBe(0)
  })

  it('AC-3 bounded: across the FULL byte domain the teleport never leaves the ship invalid', async () => {
    const { hyperspace, HYPER_X_LEFT, HYPER_X_RIGHT } = await loadPowers()
    for (let dir = 0; dir < 256; dir++) {
      for (const yb of [0, 1, 127, 200, 255]) {
        const t = hyperspace(seq([dir, yb]))
        // X is one of the two cited columns, and a legal point on the 16-bit cylinder.
        expect([HYPER_X_LEFT, HYPER_X_RIGHT]).toContain(t.x16)
        expect(wrap16(t.x16), 'X is a legal 16-bit world column').toBe(t.x16)
        // Y lands inside the player strip [YMIN, 238] — never above the roof or below the floor.
        expect(t.y).toBeGreaterThanOrEqual(YMIN)
        expect(t.y).toBeLessThanOrEqual(238)
        // facing is paired with the X branch, never left dangling.
        expect(t.facing).toBe(t.x16 === HYPER_X_RIGHT ? 'right' : 'left')
      }
    }
  })
})

// ══════════════════════════════════════════════════════════════════════════════════════
// AC3 — the teleport draws from the INJECTED seeded rng seam (not Math.random)
// ══════════════════════════════════════════════════════════════════════════════════════
describe('df5-5 AC-3 — hyperspace draws from the injected seeded rng seam, deterministically', () => {
  it('is a pure function of the injected rand: the SAME byte sequence gives the SAME teleport', async () => {
    const { hyperspace } = await loadPowers()
    const bytes = [0b1011_0101, 173]
    expect(hyperspace(seq(bytes))).toEqual(hyperspace(seq(bytes)))
  })

  it('consumes TWO distinct draws — direction first (SEED), then Y (HSEED) — not one shared byte', async () => {
    const { hyperspace, HYPER_X_RIGHT, HYPER_X_LEFT } = await loadPowers()
    // Same direction byte, different Y byte → same X/facing, different Y (proves 2 draws).
    const a = hyperspace(seq([1, 10]))
    const b = hyperspace(seq([1, 250]))
    expect(a.x16).toBe(HYPER_X_RIGHT)
    expect(b.x16).toBe(HYPER_X_RIGHT)
    expect(a.y).not.toBe(b.y)
    // Same Y byte, different direction byte → same Y, different X (the draws are independent).
    const c = hyperspace(seq([1, 10]))
    const d = hyperspace(seq([0, 10]))
    expect(c.y).toBe(d.y)
    expect(c.x16).toBe(HYPER_X_RIGHT)
    expect(d.x16).toBe(HYPER_X_LEFT)
  })
})

// ══════════════════════════════════════════════════════════════════════════════════════
// AC2 — the PRESENTATION routes through the df4-2 effect-policy; neither power strobes.
// The df4-2 guard must stay GREEN with both powers live (ADR-0005 — the substitution the
// smart-bomb COM PCRAM invert :3199 and the hyperspace screen-clear require).
// ══════════════════════════════════════════════════════════════════════════════════════
describe('df5-5 AC-2 — the powers present through the df4-2 policy as seizure-safe variants (ADR-0005)', () => {
  it('classify("smart-bomb") is a FULL-FRAME-STROBE rendered SAFE — the COM PCRAM invert (:3199) substituted', () => {
    const p = classify('smart-bomb')
    expect(p.class).toBe('full-frame-strobe')
    expect(['freeze', 'fade', 'particle'], 'a safe variant, never a raster strobe').toContain(p.presentation)
    expect(p.presentation).not.toBe('raster')
  })

  it('classify("hyperspace") is a FULL-FRAME-STROBE rendered SAFE — the screen-clear substituted', () => {
    const p = classify('hyperspace')
    expect(p.class).toBe('full-frame-strobe')
    expect(['freeze', 'fade', 'particle']).toContain(p.presentation)
    expect(p.presentation).not.toBe('raster')
  })

  it('the df4-2 render guard has TEETH on a power path: a planted whole-frame inversion reddens it', () => {
    const before = variedFrame()
    const inverted = before.map((c) => 0xf ^ c) // the ROM smart-bomb COM PCRAM whole-page invert
    expect(
      () => assertNoFullFrameStrobe(before, inverted),
      'the ROM COM PCRAM invert is exactly what ADR-0005 forbids — the guard must throw',
    ).toThrow(/strobe|inversion/i)
    // …while a seizure-safe presentation (a freeze — the frame held) passes.
    expect(() => assertNoFullFrameStrobe(before, before.slice()), 'a freeze holds the frame — safe').not.toThrow()
  })
})

// ══════════════════════════════════════════════════════════════════════════════════════
// AC4 — the powers are df3 scheduler-driven player actions (NEWP/STYPE … JMP SUCIDE
// :3209), not per-power rAF ticks; and every constant is cited (claims/*.json).
// ══════════════════════════════════════════════════════════════════════════════════════
describe('df5-5 AC-4 — the powers run on the df3 scheduler (NEWP/STYPE), never a per-power rAF', () => {
  it('spawnSmartBomb enqueues EXACTLY one scheduler process (one power = one process)', async () => {
    const { spawnSmartBomb, SMART_BOMB_PTYPE } = await loadPowers()
    const sched = createScheduler()
    expect(sched.processes.length).toBe(0)
    const p = spawnSmartBomb(sched)
    expect(sched.processes.length, 'one press = one process, never a per-frame loop').toBe(1)
    expect(p.ptype).toBe(SMART_BOMB_PTYPE)
    expect(p.alive).toBe(true)
  })

  it('spawnHyperspace enqueues EXACTLY one scheduler process', async () => {
    const { spawnHyperspace, HYPER_PTYPE } = await loadPowers()
    const sched = createScheduler()
    const p = spawnHyperspace(sched, seq([1, 100]))
    expect(sched.processes.length).toBe(1)
    expect(p.ptype).toBe(HYPER_PTYPE)
    expect(p.alive).toBe(true)
  })

  it('the two powers register DISTINCT scheduler PTYPEs', async () => {
    const { SMART_BOMB_PTYPE, HYPER_PTYPE } = await loadPowers()
    expect(SMART_BOMB_PTYPE).not.toBe(HYPER_PTYPE)
  })

  it('a power process advances by the scheduler tick and never multiplies itself (SUCIDE, :3209)', async () => {
    const { spawnHyperspace } = await loadPowers()
    const sched = createScheduler()
    spawnHyperspace(sched, seq([1, 100]))
    const before = sched.processes.length
    sched.stepTick() // cooperative dispatch — the power sleeps or expires, it does not fork
    expect(sched.processes.length).toBeLessThanOrEqual(before)
  })
})

describe('df5-5 AC-4 — every powers constant is cited: a claim in the SBOMB/HYPER window (DEFA7.SRC:3173-3242)', () => {
  it('GREEN enrols a claim citing the smart-bomb / hyperspace region', () => {
    const claims = loadClaims()
    // Match on the citation LOCATION, in the powers-SPECIFIC window no existing claim touches
    // (the nearest DEFA7 claims are SHIP-21/22/23 at :3157-3160, verified below the window) —
    // so this cannot false-green.
    const powerClaim = claims.find((c) => {
      const s = c.source as { file?: string; line?: unknown }
      if (typeof s.line !== 'number') return false // byte-only citations carry no line
      return s.file === 'DEFA7.SRC' && s.line >= 3173 && s.line <= 3242
    })
    expect(
      powerClaim,
      'no powers claim yet — GREEN adds docs/rom-study/claims/18-powers.json enrolling the SBOMB ' +
        'trigger (DEFA7.SRC:3175), the clear threshold (:3190), the flash count (:3197), the HYPER ' +
        'gate (:3214), STATUS $77 (:3216), the nap (:3219), the two X columns (:3231,3235) and the ' +
        'dir magnitude (:3232); brief-dossier.test.ts then byte-verifies each verbatim',
    ).toBeDefined()
  })
})
