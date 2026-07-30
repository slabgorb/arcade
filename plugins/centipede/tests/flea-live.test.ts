// tests/flea-live.test.ts
//
// Story cp3-4 — RED. cp3-2 transcribed the flea correctly and then shipped a
// creature that never appears. Two integration links were never made, and this
// suite is RED on BOTH of them:
//
//   1. NOTHING RENDERS SLOT 12. src/shell/render.ts knows about the gun, the
//      mushrooms, the train and the spider (cp3-1's spiderStamp + slot-13 blit)
//      but has never heard of the flea. It descends, seeds mushrooms and kills
//      the player INVISIBLY.
//   2. THE SPAWN GATE IS WELDED SHUT. SimState.centin is pinned at CENTIN_INIT
//      (12) for the whole game, and ANTMV's gate (:64-66 "CMP I,12." DECIMAL,
//      ";NO ANTS EARLY IN GAME") refuses a parked flea whenever centin >= 12.
//      Only a unit test poking state could ever open it.
//
// The fix for (2) is the ROM's real mechanism, not a debug hook: CENTPC's
// two-counter cadence (:458-476) driven by SHOOT's wave-clear tail (:2317).
//
// RADIX: CENTI4.MAC inherits .RADIX 16 from CENDE4 — bare literals below are
// hex unless a trailing period marks them decimal. The two 12s in this file are
// NOT the same number: ANTMV's gate (:65 "CMP I,12.") and INIT's seed (:1167
// "LDA I,12.") are DECIMAL twelve; CENTPC's reload (:469 "LDA I,0C") is hex 0C,
// which is also twelve, and NCENT (CENDE4.MAC:119 "NCENT =12.") is decimal.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, fleaStamp } from '../src/shell/render'
import type { Atlas } from '../src/shell/atlas'
import { gunScreenX, gunScreenY } from '../src/shell/layout'
import { createSim, stepSim, cloneState, WAVE_DELAY, type SimState } from '../src/core/sim'
import type { InputCounts } from '../src/core/player'
import { DEAD_BIT } from '../src/core/centipede'
import {
  createFlea,
  stepFlea,
  isFleaAlive,
  FLEA_PARK_PIC,
  FLEA_PARK_V,
  FLEA_PIC_GATE,
  FLEA_CENTIN_GATE,
  CENTIN_INIT,
  FLEA_EXPLODE_PIC,
  FLEA_EXPLODE_DONE,
  fleaSpawnThreshold,
  type Flea,
} from '../src/core/flea'
import { createPlayfield } from '../src/core/playfield'
import { createRng } from '@shared/rng'
import { STAMPS, SPRITE_W, SPRITE_H } from '../src/core/pictures'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/** The neutral frame: no trackball motion, no trigger. TYPED — an untyped
 *  literal here silently produced NaN player coords during RED. */
const IDLE: InputCounts = { dh: 0, dv: 0, fire: false }

// ── a recording ctx + atlas that keeps the stamp NAME next to its draw args ──
interface Draw {
  stamp: string
  x: number
  y: number
  w: number
  h: number
}
function makeRecorder() {
  const draws: Draw[] = []
  let pending = ''
  const atlas = {
    image: {} as CanvasImageSource,
    rect(name: string) {
      pending = name
      return { sx: 0, sy: 0, sw: 8, sh: 8 }
    },
  }
  const ctx = {
    imageSmoothingEnabled: true,
    fillStyle: '',
    fillRect() {},
    clearRect() {},
    save() {},
    restore() {},
    drawImage(_img: unknown, _sx: number, _sy: number, _sw: number, _sh: number, x: number, y: number, w: number, h: number) {
      draws.push({ stamp: pending, x, y, w, h })
    },
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, atlas: atlas as Atlas, draws }
}

/** Every ANT* stamp drawn by one render() of `state`. */
function antDraws(state: SimState): Draw[] {
  const r = makeRecorder()
  render(r.ctx, r.atlas, state)
  return r.draws.filter((d) => d.stamp.startsWith('ANT'))
}

/** A sim with a flea placed exactly where the test wants it. */
function simWithFlea(flea: Partial<Flea>): SimState {
  const state = createSim(1)
  return { ...state, flea: { ...state.flea, ...flea } }
}

// ════════════════════════════════════════════════════════════════════════════
// AC-1 — the renderer draws slot 12
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-4 AC-1 — render.ts finally knows the flea exists', () => {
  it('exports fleaStamp, mapping the live band 0x1C-0x1F onto ANT0-ANT3', async () => {
    const mod = (await import('../src/shell/render')) as Record<string, unknown>
    const fleaStamp = mod.fleaStamp as ((pic: number) => string) | undefined
    expect(typeof fleaStamp, 'render.ts must export fleaStamp(pic), as it exports spiderStamp').toBe('function')
    if (typeof fleaStamp !== 'function') return
    // ANT0 is picture 0x1C (FLEA_PARK_PIC) — the same +offset relation cp3-1's
    // spiderStamp uses for BUG0 at 0x14.
    expect(fleaStamp(0x1c)).toBe('ANT0')
    expect(fleaStamp(0x1d)).toBe('ANT1')
    expect(fleaStamp(0x1e)).toBe('ANT2')
    expect(fleaStamp(0x1f)).toBe('ANT3')
  })

  it('every ANT stamp it can emit is a real cp1-3 picture-ROM sprite (no new art)', () => {
    const known = new Map(STAMPS.map((s) => [s.name, s]))
    for (let pic = FLEA_PARK_PIC; pic < FLEA_PIC_GATE; pic++) {
      const name = `ANT${pic - FLEA_PARK_PIC}`
      expect(known.has(name), `${name} must already exist in the baked atlas`).toBe(true)
      expect(known.get(name)?.kind, `${name} is an 8x16 motion-object sprite`).toBe('sprite')
    }
  })

  it('draws a DESCENDING flea at the sprite position the spider/segments use', () => {
    const state = simWithFlea({ v: 0x80, h: 0x54, pic: FLEA_PARK_PIC })
    const drawn = antDraws(state)
    expect(drawn.length, 'a flea on screen must be blitted exactly once').toBe(1)
    expect(drawn[0].stamp).toBe('ANT0')
    // cp2-1: sprites are rotated at the atlas bake, so the footprint is
    // SPRITE_H wide x SPRITE_W tall — the same blit shape every other motion
    // object uses. Position comes from the shared gun* helpers, never bespoke.
    expect(drawn[0].x, 'screen-x via gunScreenX, like every motion object').toBe(gunScreenX(0x54))
    expect(drawn[0].y, 'screen-y via gunScreenY, like every motion object').toBe(gunScreenY(0x80))
    // The FOOTPRINT is half the contract and the axis swap is silent if you
    // only check position — a W/H transposition survived the first mutation
    // battery on exactly this blit.
    expect([drawn[0].w, drawn[0].h], 'blitted SPRITE_H wide x SPRITE_W tall, not the decoded order').toEqual([
      SPRITE_H,
      SPRITE_W,
    ])
  })

  it('fleaStamp refuses a picture that is not a flea, rather than inventing a stamp', () => {
    // The exported contract, mirroring spiderStamp's throw. render() only ever
    // calls it below the gate, so this guard is unreachable from the draw path
    // — which is precisely why it needs a test of its own to stay honest.
    for (const pic of [FLEA_PIC_GATE, 0x30, FLEA_EXPLODE_DONE, FLEA_EXPLODE_PIC]) {
      expect(() => fleaStamp(pic), `0x${pic.toString(16)} is not a flea picture`).toThrow()
    }
    expect(() => fleaStamp(FLEA_PARK_PIC), 'but the live band is accepted').not.toThrow()
  })

  it('draws NOTHING for a flea parked off the top — the ROM calls that "removed from screen"', () => {
    // ":125 40$: JSR ANTPC ;REMOVE ANT FROM SCREEN" and ":59-62 LDA ANTV / EOR
    // CKF8 / CMP I,0F8 / BCC 5$ ;IF ON SCREEN, KEEP MOVING". The ROM's own
    // predicate for "on screen" is v < 0xF8, so the parked flea — which holds a
    // perfectly LIVE picture (0x1C), unlike the spider's 0xF8 "no spider" code
    // — must be gated on POSITION, not on picture.
    const state = simWithFlea({ v: FLEA_PARK_V, pic: FLEA_PARK_PIC })
    expect(antDraws(state), 'a parked flea must not be painted over the HUD row').toEqual([])
  })

  it('a freshly booted sim paints no flea at all (createSim parks it — cp3-2)', () => {
    const state = createSim(7)
    expect(state.flea.v, 'ANTPC parks at 0xF8').toBe(FLEA_PARK_V)
    expect(antDraws(state)).toEqual([])
  })

  it('falls through to the SHARED explosion pool while the flea is blowing up', () => {
    // FL-19: the flea's explosion is the segments' own 0xFF..0xFA pool (CT-41/44),
    // so it must reach segmentStamp exactly as cp3-1 routed the spider's — not a
    // bespoke ANT explosion.
    const r = makeRecorder()
    render(r.ctx, r.atlas, simWithFlea({ v: 0x80, h: 0x54, pic: FLEA_EXPLODE_PIC }))
    const stamps = r.draws.map((d) => d.stamp)
    expect(stamps, 'pic 0xFF is HEADF from the shared pool').toContain('HEADF')
    expect(stamps.filter((s) => s.startsWith('ANT')), 'and no ANT sprite').toEqual([])
  })

  it('draws nothing on the explosion REST picture (0xF9), exactly as a rested segment does', () => {
    const state = simWithFlea({ v: 0x80, h: 0x54, pic: FLEA_EXPLODE_DONE })
    const r = makeRecorder()
    render(r.ctx, r.atlas, state)
    const at = r.draws.filter((d) => d.x === gunScreenX(0x54) && d.y === gunScreenY(0x80))
    expect(at, '0xF9 is EXPLOD’s rest picture — nothing is painted').toEqual([])
  })

  it('a REAL descent only ever reaches ANT0 and ANT2 — the by-two cycle stays faithful', () => {
    // FL-9 / open-questions.md item 9: ":84 INC ANTP" bumps the byte and
    // ":85-87 LDA ANTP / CLC / ADC I,01" adds one AGAIN, so from 0x1C the cycle
    // is 0x1C -> 0x1E -> 0x1C. ANT1 and ANT3 are dead art. This test exists so
    // that a future reader who notices "we never draw ANT1" cannot repair the
    // cycle without turning this red first.
    const rng = createRng(99)
    const field = createPlayfield()
    let flea = createFlea(rng, 0)
    flea = { ...flea, v: 0xf0 } // already launched, mid-fall
    const seen = new Set<string>()
    for (let frame = 1; frame <= 400; frame += 1) {
      flea = stepFlea(flea, field, { frame, score: 0, rng, centin: 0 }).flea
      if (!isFleaAlive(flea.pic) || flea.v >= FLEA_PARK_V) continue
      seen.add(`ANT${flea.pic - FLEA_PARK_PIC}`)
    }
    expect([...seen].sort()).toEqual(['ANT0', 'ANT2'])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-2 — CENTPC's per-wave CENTIN/CENTIS cadence
// ════════════════════════════════════════════════════════════════════════════

/** Drive `state` until the wave-clear pause has fully expired and the next
 *  wave's train is on the field. Kills the train outright rather than shooting
 *  it, which is what the ROM's DEAD==0 condition actually observes. */
function clearOneWave(state: SimState): SimState {
  let s: SimState = { ...state, segs: state.segs.map((seg) => ({ ...seg, pic: seg.pic | DEAD_BIT })) }
  // One playing frame notices DEAD==0 and arms the pause...
  s = stepSim(s, IDLE)
  expect(s.delay, 'the all-dead frame must arm the wave pause').toBe(WAVE_DELAY)
  // ...then the pause runs itself out and CENTPC re-lays.
  let guard = 0
  while (s.delay > 0 && guard < 1000) {
    s = stepSim(s, IDLE)
    guard += 1
  }
  expect(guard, 'the wave pause must actually expire').toBeLessThan(1000)
  return s
}

describe('cp3-4 AC-2 — CENTPC/SHOOT drive CENTIN, so the flea gate can open', () => {
  it('boots at the ROM INIT values: CENTIN=12. and CENTIS=2', () => {
    const state = createSim(1) as SimState & { centis?: number }
    expect(state.centin, 'INIT :1167-1169 "LDA I,12. / STA CENTIN"').toBe(CENTIN_INIT)
    expect(state.centis, 'INIT :1174-1176 "LDA I,02 ;FAST TO START WITH"').toBe(2)
  })

  it('SHOOT\'s wave-clear tail bumps CENTIS on the same frame it arms the pause', () => {
    // ":2317 50$: INC X,CENTIS-1 ;FASTER" sits immediately above ":2318-2319
    // LDA I,40 / STA DELAY", so the increment and WAVE_DELAY are one event.
    const before = createSim(3) as SimState & { centis: number }
      const cleared = stepSim({ ...before, segs: before.segs.map((s) => ({ ...s, pic: s.pic | DEAD_BIT })) }, IDLE) as SimState & {
      centis: number
    }
    expect(cleared.delay).toBe(WAVE_DELAY)
    expect(cleared.centis, 'CENTIS goes 2 -> 3 on the first wave clear').toBe(before.centis + 1)
    expect(cleared.centin, 'CENTPC has not run yet — CENTIN is untouched this frame').toBe(before.centin)
  })

  it('the WAVE-2 re-lay decrements CENTIN to 11, which OPENS the ANTMV gate', () => {
    // This is the whole defect in one assertion: after exactly one cleared wave
    // the ROM's gate (":64-66 LDA CENTIN-1 / CMP I,12. / BCS 30$") stops
    // refusing, and a parked flea can launch in ordinary play.
    const wave2 = clearOneWave(createSim(11))
    expect(wave2.wave).toBe(2)
    expect(wave2.centin, 'CENTIS was 3 -> :467 DEC X,CENTIN-1').toBe(11)
    expect(wave2.centin < FLEA_CENTIN_GATE, 'the flea gate is now OPEN').toBe(true)
  })

  it('resets CENTIS to 1 below 40,000 — so the decrement lands every SECOND wave', () => {
    // ":471-476 3$: LDA I,02 / LDY X,SCORE2-1 / CPY I,4 / BCS 4$ / LDA I,01 /
    // 4$: STA X,CENTIS-1" — the reset lives INSIDE the CENTIS>=3 branch, so a
    // wave that does not decrement does not reset either.
    let s = createSim(5) as SimState & { centis: number }
    const seen: Array<[number, number]> = []
    for (let wave = 0; wave < 6; wave += 1) {
      s = clearOneWave(s) as SimState & { centis: number }
      seen.push([s.centin, s.centis])
    }
    expect(seen).toEqual([
      [11, 1], // CENTIS 2->3 on clear, >=3 so decrement, reset to 1 (score < 40000)
      [11, 2], // CENTIS 1->2 on clear, <3 so NO decrement and NO reset
      [10, 1], // CENTIS 2->3 on clear, decrement again
      [10, 2],
      [9, 1],
      [9, 2],
    ])
  })

  it('resets CENTIS to 2 at 40,000 — so the decrement lands EVERY wave', () => {
    // SCORE2 is the BCD byte of the 10,000s digits; ":473 CPY I,4" is therefore
    // 40,000 exactly, and the ROM's own comment says ";ONLY FAST CENTIPEDES
    // AFTER 40000".
    let s = { ...createSim(5), score: 40000 } as SimState & { centis: number }
    const centins: number[] = []
    for (let wave = 0; wave < 3; wave += 1) {
      s = clearOneWave(s) as SimState & { centis: number }
      centins.push(s.centin)
      expect(s.centis, 'CENTIS resets to 2, so the NEXT clear takes it to 3 again').toBe(2)
    }
    expect(centins).toEqual([11, 10, 9])
  })

  it('reloads CENTIN to 0x0C when the decrement reaches zero — never to 0 or below', () => {
    // ":467-470 DEC X,CENTIN-1 / BNE 3$ / LDA I,0C / STA X,CENTIN-1 ;LONG CENTI
    // AGAIN". Note the reload is HEX 0C (=12), a different literal from the
    // DECIMAL 12. of INIT and of ANTMV's gate.
    let s = { ...createSim(5), centin: 1, centis: 3, score: 40000 } as SimState & { centis: number }
    s = clearOneWave(s) as SimState & { centis: number }
    expect(s.centin, 'CENTIN 1 -> 0 -> reloaded 0x0C').toBe(0x0c)
  })

  it('does NOT reload when the decrement lands on 1 — only zero triggers it', () => {
    // The reload test above starts at CENTIN=1 and so only exercises the zero
    // case; a "<= 1" reload passes it identically. Pin the neighbour: CENTIN 2
    // must fall to 1 and STAY there for a wave.
    let s = { ...createSim(5), centin: 2, centis: 3, score: 40000 } as SimState & { centis: number }
    s = clearOneWave(s) as SimState & { centis: number }
    expect(s.centin, ':468 BNE 3$ skips the reload for any non-zero result').toBe(1)
  })

  it('reads the 40,000 gate off SCORE2 (BCD), not off the raw score', () => {
    // The trap score.ts warns about. A raw `score >= 4` comparison agrees with
    // the ROM at 0 and at 40,000 — the two values the tests above use — and is
    // wrong for every score in between. 100 points is FOUR raw, but SCORE2 is
    // 0x00, so CENTIS must reset SLOW.
    let s = { ...createSim(5), centin: 9, centis: 3, score: 100 } as SimState & { centis: number }
    s = clearOneWave(s) as SimState & { centis: number }
    expect(s.centis, '100 points is nowhere near 40,000 — CENTIS resets to 1').toBe(1)
  })

  it('never runs the cadence on a DEATH re-lay — CENTPC gates it on all-dead', () => {
    // ":458-460 LDX PLAYER / LDA X,DEAD-1 / BNE 5$ ;NO CHANGE IN COLOR OR SPEED
    // UNTIL ALL DEAD". A player death re-lays the train with segments still
    // alive, so CENTIN and CENTIS must both survive it untouched.
      // Park a live segment straight on top of the gun to force PLAY's contact.
    const boot = createSim(4)
    const victim = { ...boot.segs[0], h: boot.player.h, v: boot.player.v, pic: 0x03 }
    let s = { ...boot, centin: 9, centis: 3, segs: [victim, ...boot.segs.slice(1)] } as SimState & { centis: number }
    s = stepSim(s, IDLE) as SimState & { centis: number }
    expect(s.playerExplode, 'the gun must actually have died').toBeGreaterThan(0)
    let guard = 0
    while (s.delay > 0 && guard < 2000) {
      s = stepSim(s, IDLE) as SimState & { centis: number }
      guard += 1
    }
    expect(s.lives, 'a life was spent — this really was the death path').toBe(boot.lives - 1)
    expect(s.centin, 'a death must not advance the wave cadence').toBe(9)
    expect(s.centis, 'nor CENTIS').toBe(3)
  })

  it('cloneState carries CENTIS, so a replay cannot silently diverge on it', () => {
    const s = { ...createSim(2), centin: 7, centis: 3 } as SimState & { centis: number }
    const c = cloneState(s) as SimState & { centis: number }
    expect(c.centin).toBe(7)
    expect(c.centis).toBe(3)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-3 — the creature is genuinely reachable in ordinary play
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-4 AC-3 — a flea actually leaves its park in a real game', () => {
  it('launches and descends in wave 2 with no debug hook and no hand-poked flea', () => {
    // The ONLY hand-set piece is the mushroom population, which is the ROM's own
    // spawn condition (":79-80 CMP X,MUSH-1 / BCC 30$ ;IF THERE ARE MANY
    // MUSHROOMS NEAR BOTTOM") and is ordinary gameplay state, not a hook.
    const wave2 = clearOneWave(createSim(21))
    expect(wave2.centin).toBe(11)
    const threshold = fleaSpawnThreshold(wave2.score)
    let s: SimState = { ...wave2, playfield: { ...wave2.playfield, mush: threshold } }
    expect(s.flea.v, 'the flea starts parked').toBe(FLEA_PARK_V)

      let launched = false
    for (let i = 0; i < 240 && !launched; i += 1) {
      s = stepSim(s, IDLE)
      if (s.flea.v < FLEA_PARK_V) launched = true
    }
    expect(launched, 'the flea must leave 0xF8 in ordinary play once CENTIN < 12').toBe(true)
    expect(isFleaAlive(s.flea.pic), 'and it is a live, drawable flea').toBe(true)
    expect(antDraws(s).length, 'and the renderer paints it').toBe(1)
  })

  it('is still refused in WAVE 1 — the ROM really does say ";NO ANTS EARLY IN GAME"', () => {
    // The mirror of the test above. If this ever passes with the gate removed
    // instead of driven, the fix was a cheat.
    const boot = createSim(21)
    expect(boot.centin).toBe(CENTIN_INIT)
    let s: SimState = { ...boot, playfield: { ...boot.playfield, mush: fleaSpawnThreshold(0) } }
      for (let i = 0; i < 240; i += 1) s = stepSim(s, IDLE)
    expect(s.flea.v, 'wave 1 keeps the flea parked').toBe(FLEA_PARK_V)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-5 — the cp3-2 review carry-forward
// ════════════════════════════════════════════════════════════════════════════

describe('cp3-4 AC-5 — the flea column count is stated correctly', () => {
  it('tests/flea.test.ts no longer claims 31 legal columns (there are 30)', () => {
    // ANTPC masks RNGEN with 0xF8 (32 candidates, 0x00..0xF8 step 8) and rejects
    // BOTH 0x00 and anything below 0x10 — which is only 0x08. 32 - 2 = 30.
    const src = readFileSync(join(repoRoot, 'tests/flea.test.ts'), 'utf8')
    expect(src.includes('31 legal columns'), 'the stale count must be corrected').toBe(false)
  })

  it('and the real accept-set really does have 30 members', () => {
    const accepted = new Set<number>()
    for (let byte = 0; byte < 0x100; byte += 1) {
      const masked = byte & 0xf8
      if (masked === 0 || masked < 0x10) continue
      accepted.add(masked)
    }
    expect(accepted.size).toBe(30)
  })
})
