// tests/fragmented-train.test.ts
//
// Story cp4-2 — RED phase (O'Brien / TEA). "Fragmented train — CENTIN connected
// segments plus loose extra heads from RNGEN". This closes the LENGTH /
// fragmentation half of the cp3-4 scope fence (centipede.ts:20-32 and :158-168);
// cp4-1 already closed the SPEED half. SimState.centin has driven only the flea
// gate so far — createCentipede() still lays a full 12-segment connected train
// regardless of centin. This story makes it read centin and place the loose heads.
//
// ─── GROUND TRUTH ────────────────────────────────────────────────────────────────
// CENTPC, CENTI4.MAC:456-554 (vendored revision.v4). The lay always fills all
// NCENT (12) motion-object slots and sets DEAD=NCENT unconditionally (:549-551),
// so a "short" train still puts 12 objects on screen — CENTIN connected segments
// then (NCENT - CENTIN) LOOSE INDEPENDENT HEADS. Wave 2 (centin=11) is 11
// connected segments PLUS one free-roaming head, NOT a shorter train.
//
//   Connected block (:477-522): head (pic 0x03) + CENTIN-1 alternating bodies,
//     all marching at CENTIS on both axes (cp4-1's contract, unchanged).
//   Skip check (:523-526): CENTIN == NCENT (12) => no loose heads, no RNGEN reads.
//   Loose-head fill (:527-548, indices CENTIN..NCENT-1), PER HEAD, in ROM order:
//     :531  LDA I,0        pic = 0x00  (plain head — the NEWHD_HEAD_PIC idiom,
//                          NOT CENTPC's connected head 0x03; CT-80 corroborates)
//     :527-528 F8 EOR CKF8 v = CENT_ENTER_V (0xF8, non-cocktail)
//     :533  LDA I,2        dv magnitude = 2 (non-cocktail; CKFE is cocktail, OOS)
//     :538  BIT RNGEN      read #1 — A (=2) untouched, N = bit 7 of the byte
//     :539-540 BPL/COMP    bit 7 CLEAR => dh = +2 ; SET => COMP-negate => dh = -2
//                          (the mask is bit 7 / 0x80 — NOT spider's 0x04)
//     :542-543 LDA RNGEN / AND I,0F8   read #2 — h = a SECOND, independent byte,
//                          masked to a multiple of 8; no rejection loop, min 0.
//   So a loose head has |dh| === |dv| === 2 (both axes the same magnitude), and
//   costs exactly TWO seeded RNGEN reads, sign FIRST then HPOS.
//
// ─── THE CONTRACT THIS SUITE DRIVES ──────────────────────────────────────────────
// createCentipede gains centin + rng. To keep cp4-1's ~20 zero-/two-arg call
// sites green (AC-4: full suite green from baseline) the new params are APPENDED
// with ROM-boot defaults, exactly the convention cp4-1 established:
//
//     createCentipede(centis = CENTIS_INIT, frame = 0, centin = NCENT, rng?: Rng)
//
// centin defaults to NCENT so an omitted-arg call lays today's full connected
// train and draws ZERO entropy; rng is required only when centin < NCENT (loose
// heads to place). This suite drives that surface directly and through the three
// real sim lay sites.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// createCentipede currently ignores centin and rng (2-arg signature) and always
// lays 12 connected segments. So:
//   • centin < NCENT still yields 12 connected segs, no pic-0x00 loose heads.
//   • the two-RNGEN-read placement is not modelled — recomputed columns/signs miss.
//   • a real wave-2 clear / death respawns a full connected train, not 11 + 1 loose.

import { describe, it, expect } from 'vitest'
import {
  createCentipede,
  NCENT,
  CENT_ENTER_V,
  CENT_HEAD_PIC,
  NEWHD_HEAD_PIC,
  BODY_BIT,
  CENTIS_INIT,
  CENTIS_SLOW,
  type Segment,
} from '../src/core/centipede'
import { createSim, stepSim, WAVE_DELAY, STARTING_LIVES, type SimState } from '../src/core/sim'
import { createSpider } from '../src/core/spider'
import { createFlea } from '../src/core/flea'
import { createRng, nextInt, type Rng } from '@shared/rng'

const NO_INPUT = { dh: 0, dv: 0, fire: false } as const
const DEAD_BIT = 0x80
const isVacant = (pic: number): boolean => (pic & DEAD_BIT) !== 0
const isHead = (pic: number): boolean => (pic & BODY_BIT) === 0
const liveSegs = (segs: Segment[]): Segment[] => segs.filter((s) => !isVacant(s.pic))

// The loose-head magnitude is a hardcoded 2 (:533 "LDA I,2"), NOT centis — Dev
// should export this as a CT-98 constant; the tests pin the literal ROM value so
// they stay honest whichever way that lands.
const LOOSE_HEAD_DV = 2 // CENTI4.MAC:533 "LDA I,2" (non-cocktail default)
const LOOSE_HEAD_SIGN_BIT = 0x80 // :538 "BIT RNGEN" tests bit 7, NOT spider's 0x04
const LOOSE_HEAD_H_MASK = 0xf8 // :543 "AND I,0F8" — column-aligned HPOS

/** Recompute a loose head's {h, dh} independently from the two RNGEN reads in
 *  ROM order — sign FIRST (:538), HPOS SECOND (:542-543). Self-checking: this is
 *  hand-derived from nextInt, never an echo of the module under test. */
const expectedLooseHeads = (seed: number, count: number): { h: number; dh: number }[] => {
  const rng = createRng(seed)
  const out: { h: number; dh: number }[] = []
  for (let k = 0; k < count; k++) {
    const signByte = nextInt(rng, 0x100) // read #1 (:538 BIT RNGEN)
    const dh = (signByte & LOOSE_HEAD_SIGN_BIT) === 0 ? LOOSE_HEAD_DV : -LOOSE_HEAD_DV // :539-540
    const h = nextInt(rng, 0x100) & LOOSE_HEAD_H_MASK // read #2 (:542-543)
    out.push({ h, dh })
  }
  return out
}

const looseHeadsOf = (segs: Segment[], centin: number): Segment[] => segs.slice(centin)
const connectedOf = (segs: Segment[], centin: number): Segment[] => segs.slice(0, centin)

// ─── AC-1: the pure createCentipede(centis, frame, centin, rng) fragmentation contract
describe('cp4-2 createCentipede lays CENTIN connected segments then loose heads (AC-1, CENTPC :477-548)', () => {
  it('a short train is 12 objects: CENTIN connected + (NCENT-CENTIN) loose heads, all alive (DEAD=NCENT :549-551)', () => {
    for (const centin of [1, 6, 11]) {
      const segs = createCentipede(CENTIS_INIT, 0, centin, createRng(0xc0ffee))
      expect(segs, `centin=${centin}: DEAD=NCENT so all ${NCENT} slots are laid`).toHaveLength(NCENT)
      expect(liveSegs(segs).length, `centin=${centin}: every slot is a LIVE object (none vacant)`).toBe(NCENT)

      const connected = connectedOf(segs, centin)
      expect(connected, `centin=${centin}: exactly CENTIN connected segments`).toHaveLength(centin)
      expect(connected[0].pic, `centin=${centin}: the connected HEAD is 0x03 (:477)`).toBe(CENT_HEAD_PIC)
      for (let i = 1; i < connected.length; i++) {
        expect(isHead(connected[i].pic), `centin=${centin}: connected body ${i} carries the BODY bit (:498/519)`).toBe(
          false,
        )
      }

      const loose = looseHeadsOf(segs, centin)
      expect(loose, `centin=${centin}: exactly NCENT-CENTIN loose heads`).toHaveLength(NCENT - centin)
      for (const h of loose) {
        expect(h.pic, `centin=${centin}: loose head pic = 0x00 (:531 LDA I,0), NOT CENTPC's 0x03`).toBe(NEWHD_HEAD_PIC)
        expect(h.v, `centin=${centin}: loose head enters at CENT_ENTER_V 0xF8 (:527-528)`).toBe(CENT_ENTER_V)
        expect(h.dv, `centin=${centin}: loose head dv = 2 (:533), a hardcoded magnitude`).toBe(LOOSE_HEAD_DV)
        expect(Math.abs(h.dh), `centin=${centin}: |loose head dh| = |dv| = 2 (:537-541)`).toBe(LOOSE_HEAD_DV)
      }
    }
  })

  it('each loose head is placed by TWO RNGEN reads in ROM order — sign (:538) then HPOS (:542-543)', () => {
    // The determinism CORE: hand-recompute every loose head's {h, dh} from
    // nextInt in the ROM's read order and demand a byte-identical match.
    for (const seed of [1, 7, 0x2a, 0xbeef]) {
      for (const centin of [1, 8, 11]) {
        const segs = createCentipede(CENTIS_SLOW, 0, centin, createRng(seed))
        const got = looseHeadsOf(segs, centin).map((s) => ({ h: s.h, dh: s.dh }))
        expect(got, `seed=${seed} centin=${centin}: loose columns+signs match the two-read recompute`).toEqual(
          expectedLooseHeads(seed, NCENT - centin),
        )
      }
    }
  })

  it('the loose-head HPOS is masked to a multiple of 8 and both entry directions occur across seeds', () => {
    const signs = new Set<number>()
    for (let seed = 1; seed <= 80; seed++) {
      const loose = looseHeadsOf(createCentipede(CENTIS_INIT, 0, 6, createRng(seed)), 6)
      for (const h of loose) {
        expect(h.h & 0x07, `seed ${seed}: HPOS is column-aligned (AND 0F8 :543)`).toBe(0)
        signs.add(Math.sign(h.dh))
      }
    }
    expect(signs, 'both +2 and -2 loose-head directions must be reachable (:538-540 sign bit)').toEqual(new Set([-1, 1]))
  })

  it('the direction sign follows bit 7 (0x80), NOT the spider routine’s bit 2 (0x04)', () => {
    // The easiest wrong transcription: copying spider.ts’s SPIDER_SIDE_BIT=0x04.
    // Find a seed whose FIRST sign byte has bit 7 and bit 2 DIFFERING, so the two
    // masks predict OPPOSITE directions, then prove the ROM bit (7) wins.
    let proven = false
    for (let seed = 1; seed <= 2000 && !proven; seed++) {
      const b = nextInt(createRng(seed), 0x100) // the first sign byte this seed yields
      const bit7 = (b & 0x80) !== 0
      const bit2 = (b & 0x04) !== 0
      if (bit7 === bit2) continue // masks would agree — not a discriminating seed
      const firstLoose = looseHeadsOf(createCentipede(CENTIS_INIT, 0, NCENT - 1, createRng(seed)), NCENT - 1)[0]
      const expectedByBit7 = bit7 ? -LOOSE_HEAD_DV : LOOSE_HEAD_DV
      expect(firstLoose.dh, `seed ${seed}: byte 0x${b.toString(16)} — dh must follow bit 7, not bit 2`).toBe(
        expectedByBit7,
      )
      proven = true
    }
    expect(proven, 'a discriminating seed (bit7 != bit2) must exist in range').toBe(true)
  })

  it('loose-head dv is a fixed 2 regardless of CENTIS — it is NOT the connected train’s per-frame speed', () => {
    // The context’s explicit warning: do not conflate the connected dh=±CENTIS
    // with the loose head’s dh=±2. A faster wave’s loose heads still march at 2.
    for (const centis of [1, 2, 3]) {
      const loose = looseHeadsOf(createCentipede(centis, 2, 4, createRng(9)), 4)
      for (const h of loose) {
        expect(h.dv, `centis=${centis}: loose dv stays 2, not centis`).toBe(LOOSE_HEAD_DV)
        expect(Math.abs(h.dh), `centis=${centis}: |loose dh| stays 2, not centis`).toBe(LOOSE_HEAD_DV)
      }
      // Meanwhile the connected head DID take centis (cp4-1) — proves they diverge.
      const head = createCentipede(centis, 2, 4, createRng(9))[0]
      expect(head.dv, `centis=${centis}: the connected head still marches at centis`).toBe(centis)
    }
  })
})

// ─── AC-1 boundaries: the two skip branches ──────────────────────────────────────
describe('cp4-2 createCentipede edge cases (CENTPC skip branches)', () => {
  it('centin === NCENT (the boot value) lays a full connected train and draws ZERO entropy (:523-526 BEQ 90$)', () => {
    // Pin the no-draw invariant directly on the cursor, not just "12 look right".
    const rng: Rng = createRng(0x1234)
    const before = rng.seed
    const segs = createCentipede(CENTIS_INIT, 0, NCENT, rng)
    expect(segs).toHaveLength(NCENT)
    expect(looseHeadsOf(segs, NCENT), 'centin=NCENT: no loose heads at all').toHaveLength(0)
    expect(segs.some((s) => s.pic === NEWHD_HEAD_PIC), 'centin=NCENT: no pic-0x00 loose head present').toBe(false)
    expect(rng.seed, 'centin=NCENT reads RNGEN zero times — the cursor is untouched').toBe(before)
  })

  it('centin === 1 skips the body loop entirely (:496-497 BEQ 60$): one head, then NCENT-1 loose heads, NO bodies', () => {
    const segs = createCentipede(CENTIS_INIT, 0, 1, createRng(0x55))
    expect(segs).toHaveLength(NCENT)
    expect(isHead(segs[0].pic), 'slot 0 is the lone connected head').toBe(true)
    expect(segs[0].pic, 'and it is CENTPC’s 0x03 head, not a loose 0x00').toBe(CENT_HEAD_PIC)
    // Every remaining slot is a loose head (0x00) — a body pic here would mean the
    // 60$ skip did not fire and the body loop laid segments it should not have.
    for (let i = 1; i < NCENT; i++) {
      expect(segs[i].pic, `slot ${i} must be a loose head (0x00), never a body`).toBe(NEWHD_HEAD_PIC)
    }
  })
})

// ─── AC-2: determinism ───────────────────────────────────────────────────────────
describe('cp4-2 the fragmented field is deterministic in the seed (AC-2)', () => {
  it('same seed + same centin => byte-identical loose-head columns and directions on independent calls', () => {
    const a = looseHeadsOf(createCentipede(CENTIS_SLOW, 0, 5, createRng(0xabcd)), 5)
    const b = looseHeadsOf(createCentipede(CENTIS_SLOW, 0, 5, createRng(0xabcd)), 5)
    expect(a.length, 'there really are loose heads to compare (NCENT-centin)').toBe(NCENT - 5)
    expect(a.every((s) => s.pic === NEWHD_HEAD_PIC), 'and they are genuine 0x00 loose heads').toBe(true)
    expect(a).toEqual(b)
  })

  it('a DIFFERENT seed produces a different — but still deterministic — field', () => {
    const field = (seed: number): { h: number; dh: number }[] =>
      looseHeadsOf(createCentipede(CENTIS_SLOW, 0, 3, createRng(seed)), 3).map((s) => ({ h: s.h, dh: s.dh }))
    // Two seeds chosen to diverge once the two RNGEN reads are actually consumed;
    // in RED (rng ignored) both fields are identical, so this not.toEqual reddens.
    expect(field(0x1111), 'seed 0x1111 vs 0x9999 must differ once RNGEN is read').not.toEqual(field(0x9999))
    // Replaying the SECOND seed twice is still identical — different, not random.
    expect(field(0x9999)).toEqual(field(0x9999))
  })
})

// ─── AC-3: a real wave clear drives the fragmentation ────────────────────────────
describe('cp4-2 a real wave clear to centin=11 lays 11 connected + 1 loose head (AC-3)', () => {
  it('clearing wave 1 re-lays a fragmented wave-2 train: connected march at CENTIS, the loose head at its own dv=2', () => {
    const boot = createSim(0xf7a6)
    // Stage a wave clear the only legitimate way: every segment killed. centin is
    // NOT hand-poked — it flows through SHOOT’s wave-clear tail and CENTPC’s cadence.
    let s: SimState = { ...boot, segs: boot.segs.map((seg) => ({ ...seg, pic: seg.pic | DEAD_BIT })) }
    s = stepSim(s, NO_INPUT)
    expect(s.delay, 'the all-dead frame arms the between-wave pause').toBe(WAVE_DELAY)
    for (let i = 0; i < WAVE_DELAY + 8 && s.wave === 1; i++) s = stepSim(s, NO_INPUT)
    expect(s.wave, 'the pause ends on a wave-2 re-lay').toBe(2)
    expect(s.centin, 'wave 2 decremented CENTIN to 11 (cp3-4 cadence)').toBe(11)
    expect(s.centis, 'below 40,000 wave-2 CENTIS reset to 1').toBe(CENTIS_SLOW)

    // DEAD=NCENT: all 12 slots alive — 11 connected + exactly ONE loose head.
    expect(liveSegs(s.segs).length, '12 live objects: 11 connected + 1 loose').toBe(NCENT)
    const connected = connectedOf(s.segs, s.centin)
    const loose = looseHeadsOf(s.segs, s.centin)

    expect(connected, 'exactly 11 connected segments').toHaveLength(11)
    for (const seg of connected) {
      expect(seg.dv, 'connected vertical step = cadence CENTIS (1)').toBe(CENTIS_SLOW)
      expect(Math.abs(seg.dh), 'connected |horizontal step| = cadence CENTIS (1)').toBe(CENTIS_SLOW)
    }

    expect(loose, 'exactly one loose head').toHaveLength(1)
    expect(loose[0].pic, 'the loose head is a plain 0x00 head').toBe(NEWHD_HEAD_PIC)
    expect(loose[0].v, 'the loose head entered at the top row 0xF8').toBe(CENT_ENTER_V)
    expect(loose[0].dv, 'the loose head marches at its OWN dv=2, not the cadence CENTIS').toBe(LOOSE_HEAD_DV)
    expect(Math.abs(loose[0].dh), 'and |dh| = 2 to match').toBe(LOOSE_HEAD_DV)
    expect(isVacant(loose[0].pic), 'the loose head is alive').toBe(false)
  })
})

// ─── ordering regression: the rng-cursor hazard at the death re-lay ──────────────
describe('cp4-2 a wave-2 death draws spider & flea BEFORE the loose heads (ROM order, sim.ts hazard)', () => {
  it('the respawned spider/flea match a spider-then-flea reconstruction, and the train re-lays fragmented', () => {
    // The hazard: at the death-respawn site sim.ts lists `segs: createCentipede`
    // BEFORE `spider:`/`flea:` in the object literal. JS evaluates in source order,
    // so once createCentipede draws loose-head entropy it would steal the spider’s
    // and flea’s bytes unless `segs:` moves below them. A death on wave 1
    // (centin=12, zero loose reads) cannot catch this — the death MUST land after
    // at least one wave clear so centin < NCENT.
    let s: SimState = createSim(0x0d1e)
    // Reach wave 2 (centin=11) legitimately.
    s = { ...s, segs: s.segs.map((seg) => ({ ...seg, pic: seg.pic | DEAD_BIT })) }
    for (let i = 0; i < WAVE_DELAY + 12 && s.wave === 1; i++) s = stepSim(s, NO_INPUT)
    expect(s.wave, 'reached wave 2').toBe(2)
    expect(s.centin, 'centin is 11 — loose heads will be drawn on the death re-lay').toBe(11)

    // Force a player death: one live head sitting on the gun (cp4-1’s idiom).
    const onGun: Segment = { h: s.player.h, v: s.player.v, dh: 2, dv: 2, pic: 0x03 }
    s = { ...s, segs: [onGun] }
    for (let i = 0; i < 4000 && s.delay === 0; i++) s = stepSim(s, NO_INPUT) // step until the death pause arms
    expect(s.delay, 'the death pause is armed').toBeGreaterThan(0)
    expect(s.playerExplode, 'and it is a player death, not a wave clear').toBeGreaterThan(0)

    // The rng cursor does NOT advance during the death pause (stepDeathFrame draws
    // no entropy until the respawn), so snapshot the seed word now — it is exactly
    // the cursor the respawn re-lay will start from.
    const cursorSeed = s.rng.seed

    let after: SimState | null = null
    for (let i = 0; i < 4000 && after === null; i++) {
      s = stepSim(s, NO_INPUT)
      if (s.lives === STARTING_LIVES - 1 && s.delay === 0 && !s.gameOver) after = s
    }
    expect(after, 'the death pause ends in a respawn').not.toBeNull()
    const respawn = after as SimState

    // ROM order on a death is spider (:641/732 BUGOFF) THEN flea (:733 ANTPC) THEN
    // CENTPC’s loose heads. Reconstruct spider-then-flea from the SAME entering
    // cursor and demand the sim matches — if createCentipede drew first, the
    // spider/flea bytes would be shifted by the loose-head reads and diverge.
    const c: Rng = createRng(cursorSeed)
    const expectedSpider = createSpider(c, respawn.score)
    const expectedFlea = createFlea(c, respawn.score)
    expect(respawn.spider, 'respawn spider is drawn from the pre-loose-head cursor (spider drawn first)').toEqual(
      expectedSpider,
    )
    expect(respawn.flea, 'respawn flea is drawn right after the spider, still before the loose heads').toEqual(
      expectedFlea,
    )

    // And the respawn really is the fragmented train (this is what reddens in RED).
    expect(respawn.centin, 'a death does not advance the cadence — still centin 11').toBe(11)
    const loose = looseHeadsOf(respawn.segs, respawn.centin)
    expect(loose, 'the wave-2 respawn has exactly one loose head').toHaveLength(1)
    expect(loose[0].pic, 'and it is a 0x00 loose head').toBe(NEWHD_HEAD_PIC)
    expect(loose[0].dv, 'marching at its own dv=2').toBe(LOOSE_HEAD_DV)
  })
})
