// tests/crumble-jt11-7.test.ts
//
// Story jt11-7 — RED phase (O'Brien / TEA). The BEHAVIOUR of the CLFDES
// cliff-crumble state machine (JOUSTRV4.SRC:4562-4599): the two-phase timeline
// (AC-1), the phase walk to removal (AC-2), and purity + determinism (AC-3),
// plus the false-friend guard that crumble is a NEW module, not the dissolve
// (AC-5, module arm). The independent source re-derivation of the counts/naps
// and the claims coverage live in the companion tests/crumble-source-jt11-7.test.ts;
// the visible drawList wiring in tests/crumble-wiring-jt11-7.test.ts.
//
// ─── WHERE THE EXPECTED NUMBERS COME FROM ────────────────────────────────────
// Every constant below is read straight off CLFDES: FIVE shakes (`LDA #5`,
// :4563), two `PCNAP 10` per shake (:4567/:4572) = 20, FIVE debris frames
// (`LDA #5`, :4579), one `PCNAP 8` per frame (:4594) = 8, tint `#$2A` (:4570).
// The source companion re-derives these from the vendored tree with an
// independent parser and asserts the module agrees (the jt1-3 double-entry): if
// Dev's crumble.ts disagrees with those numbers, one of the two is wrong and a
// human looks — do NOT edit these literals to match a red module.

import { describe, it, expect } from 'vitest'
import { loadCrumble, type CrumbleState } from './helpers/crumble-contract.js'

// The CLFDES constants, read off the routine (mutation-resistant backstop).
const SHAKE_COUNT = 5
const SHAKE_NAPS = 20
const DEBRIS_COUNT = 5
const DEBRIS_NAPS = 8
const FLAVOR = 0x2a
// 5×20 + 5×8 — the whole animation, the erase PCNAP 2 folded into the transition.
const TOTAL_NAPS = SHAKE_COUNT * SHAKE_NAPS + DEBRIS_COUNT * DEBRIS_NAPS

/** Walk a crumble to completion, capturing the full state trace (bounded). */
function playOut(c: Awaited<ReturnType<typeof loadCrumble>>, cliff = 'CLIF2'): CrumbleState[] {
  const trace: CrumbleState[] = []
  let s = c.startCrumble(cliff)
  trace.push(s)
  for (let i = 0; i < 1000 && !s.done; i++) {
    s = c.stepCrumble(s)
    trace.push(s)
  }
  return trace
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — THE CLFDES TWO-PHASE TIMELINE. The module pins the exact ROM counts
// and nap holds as exported constants.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — crumble.ts pins the CLFDES counts and naps', () => {
  it('FIVE shakes, held 20 naps each (two PCNAP 10)', async () => {
    const c = await loadCrumble()
    expect(c.CRUMBLE_SHAKE_COUNT, 'LDA #5 "number of shakes to do" (:4563-4564)').toBe(SHAKE_COUNT)
    // A decoder that read only ONE PCNAP 10 per shake would put 10 here.
    expect(c.CRUMBLE_SHAKE_NAPS, 'two PCNAP 10 per shake (:4567 & :4572)').toBe(SHAKE_NAPS)
  })

  it('FIVE debris frames, held 8 naps each (one PCNAP 8)', async () => {
    const c = await loadCrumble()
    expect(c.CRUMBLE_DEBRIS_FRAME_COUNT, 'LDA #5 "five images" (:4578-4580)').toBe(DEBRIS_COUNT)
    expect(c.CRUMBLE_DEBRIS_FRAME_NAPS, 'one PCNAP 8 per debris frame (:4594)').toBe(DEBRIS_NAPS)
  })

  it('the shaking cliff is tinted with the $2A DMA flavor', async () => {
    const c = await loadCrumble()
    // "by altering the cliffs flavor", LDA #$2A / STA WCDMA,X (:4570-4571).
    expect(c.CRUMBLE_FLAVOR, 'the shake tint byte is $2A').toBe(FLAVOR)
  })

  it('the shake counts differ from the debris counts — not one folded constant', async () => {
    // Mutation guard: a single SHARED count/nap for both phases would pass a
    // laxer suite. CLFDES's two phases have the SAME count (5) but DIFFERENT
    // holds (20 vs 8) — pin that they are independent exports.
    const c = await loadCrumble()
    expect(c.CRUMBLE_SHAKE_NAPS).not.toBe(c.CRUMBLE_DEBRIS_FRAME_NAPS)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — THE PHASE WALK. startCrumble opens the shake phase; stepCrumble holds
// each frame its nap window, walks all five shakes then all five debris frames
// in order, and terminates (the cliff is gone).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — startCrumble → 5 shakes → 5 debris → done', () => {
  it('startCrumble opens on shake frame 0, NOT done, full shake-nap hold', async () => {
    const c = await loadCrumble()
    const s = c.startCrumble('CLIF2')
    expect(s.phase, 'a crumble opens in the SHAKE phase').toBe('shake')
    expect(s.frame, 'on shake frame 0').toBe(0)
    expect(s.done, 'a crumble is a sequence, not an instant removal').toBe(false)
    expect(s.nap, 'the first shake holds a full nap window').toBe(c.CRUMBLE_SHAKE_NAPS)
    expect(s.cliff, 'it carries the cliff it is destroying').toBe('CLIF2')
  })

  it('each SHAKE frame is held CRUMBLE_SHAKE_NAPS wakes before advancing', async () => {
    const c = await loadCrumble()
    let s = c.startCrumble('CLIF2')
    let held = 0
    while (s.phase === 'shake' && s.frame === 0 && !s.done) {
      s = c.stepCrumble(s)
      held++
    }
    expect(held, 'shake frame 0 is held the full 20-nap window').toBe(c.CRUMBLE_SHAKE_NAPS)
    expect(s.frame, 'then it advances to shake frame 1').toBe(1)
    expect(s.phase, 'still shaking').toBe('shake')
  })

  it('it shows exactly five shakes, THEN crosses into the debris phase', async () => {
    const c = await loadCrumble()
    let s = c.startCrumble('CLIF2')
    const shakeFrames: number[] = [s.frame]
    while (s.phase === 'shake' && !s.done) {
      const next = c.stepCrumble(s)
      if (next.phase === 'shake' && next.frame !== s.frame) shakeFrames.push(next.frame)
      s = next
    }
    expect(shakeFrames, 'shakes 0..4 in order (five of them)').toEqual([0, 1, 2, 3, 4])
    expect(s.phase, 'after the fifth shake the erase hands off to debris').toBe('debris')
    expect(s.frame, 'debris opens on frame 0').toBe(0)
    expect(s.nap, 'the first debris frame holds a full debris-nap window').toBe(
      c.CRUMBLE_DEBRIS_FRAME_NAPS,
    )
  })

  it('each DEBRIS frame is held CRUMBLE_DEBRIS_FRAME_NAPS wakes', async () => {
    const c = await loadCrumble()
    // advance into the debris phase first
    let s = c.startCrumble('CLIF2')
    while (s.phase === 'shake' && !s.done) s = c.stepCrumble(s)
    expect(s.phase).toBe('debris')
    let held = 0
    const startFrame = s.frame
    while (s.phase === 'debris' && s.frame === startFrame && !s.done) {
      s = c.stepCrumble(s)
      held++
    }
    expect(held, 'a debris frame holds the full 8-nap window').toBe(c.CRUMBLE_DEBRIS_FRAME_NAPS)
  })

  it('stepCrumble walks all five debris frames in order, then removes the cliff', async () => {
    const c = await loadCrumble()
    let s = c.startCrumble('CLIF2')
    while (s.phase === 'shake' && !s.done) s = c.stepCrumble(s)
    const debrisFrames: number[] = [s.frame]
    for (let i = 0; i < 1000 && !s.done; i++) {
      const next = c.stepCrumble(s)
      if (!next.done && next.frame !== s.frame) debrisFrames.push(next.frame)
      s = next
    }
    expect(s.done, 'the crumble terminates — the cliff is gone').toBe(true)
    expect(debrisFrames, 'debris frames 0..4 in order (five of them)').toEqual([0, 1, 2, 3, 4])
  })

  it('the whole animation runs exactly TOTAL_NAPS wakes (5×20 + 5×8)', async () => {
    const c = await loadCrumble()
    let s = c.startCrumble('CLIF2')
    let wakes = 0
    for (; wakes < 1000 && !s.done; wakes++) s = c.stepCrumble(s)
    // The step that SETS done is the last wake; count it. 140 total.
    expect(wakes, 'the crumble is 140 naps long — the ROM CLFDES budget').toBe(TOTAL_NAPS)
  })

  it('a completed crumble is idempotent (removal is terminal)', async () => {
    const c = await loadCrumble()
    let s = c.startCrumble('CLIF2')
    for (let i = 0; i < 1000 && !s.done; i++) s = c.stepCrumble(s)
    expect(s.done).toBe(true)
    expect(c.stepCrumble(s), 'stepping a done crumble changes nothing').toEqual(s)
  })

  it('debris NEVER precedes shake — the phases are ordered, not interleaved', async () => {
    const c = await loadCrumble()
    let s = c.startCrumble('CLIF2')
    let sawDebris = false
    for (let i = 0; i < 1000 && !s.done; i++) {
      if (s.phase === 'debris') sawDebris = true
      // once we have seen debris, we must never see a shake frame again
      if (sawDebris) expect(s.phase, 'no shake after debris begins').toBe('debris')
      s = c.stepCrumble(s)
    }
    expect(sawDebris, 'the debris phase is actually reached').toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — PURITY + DETERMINISM. A crumble replays bit-for-bit; stepCrumble never
// mutates its argument; the cliff label survives untouched.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 — the crumble is deterministic and pure', () => {
  it('the trajectory replays identically (same phases, frames, naps)', async () => {
    const c = await loadCrumble()
    expect(playOut(c)).toEqual(playOut(c))
    expect(playOut(c, 'CLIF4'), 'a different cliff replays deterministically too').toEqual(
      playOut(c, 'CLIF4'),
    )
  })

  it('stepCrumble is PURE — it never mutates the state handed in', async () => {
    const c = await loadCrumble()
    const s = c.startCrumble('CLIF2')
    const snap = JSON.stringify(s)
    c.stepCrumble(s)
    expect(JSON.stringify(s), 'stepCrumble must return a NEW state, not mutate its argument').toBe(
      snap,
    )
  })

  it('the cliff label rides through the whole animation unchanged', async () => {
    const c = await loadCrumble()
    for (const cliff of ['CLIF1L', 'CLIF1R', 'CLIF2', 'CLIF4']) {
      const trace = playOut(c, cliff)
      expect(
        trace.every((s) => s.cliff === cliff),
        `every state of a ${cliff} crumble names ${cliff}`,
      ).toBe(true)
    }
  })

  it('the nap counter is always within its phase window — never negative or over', async () => {
    const c = await loadCrumble()
    for (const s of playOut(c)) {
      if (s.done) continue
      const ceiling = s.phase === 'shake' ? c.CRUMBLE_SHAKE_NAPS : c.CRUMBLE_DEBRIS_FRAME_NAPS
      expect(s.nap, 'nap in [1, phase window]').toBeGreaterThanOrEqual(1)
      expect(s.nap, 'nap never exceeds its phase window').toBeLessThanOrEqual(ceiling)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-5 (module arm) — NOT THE FALSE FRIEND. crumble.ts is its own module: it
// carries the CLFDES state, not the dissolve's, and does not re-export the
// DISSOLVE_* constants. (The SOURCE arm — CLFDES cited, dissolve not conflated —
// is in crumble-source-jt11-7.test.ts.)
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-5 — crumble is a distinct module, not the ptero dissolve', () => {
  it('crumble exports its OWN constants — no DISSOLVE_* leak', async () => {
    const leaked = Object.keys(await loadCrumble()).filter((k) => /dissolve/i.test(k))
    expect(leaked, 'crumble must not re-export the dissolve (a false-friend tell)').toEqual([])
  })

  it('crumble counts are the CLFDES numbers, not the dissolve numbers', async () => {
    // The dissolve is 3 frames × 8 naps. A copy-paste of dissolve.ts would show
    // 3, not 5 — the story's whole warning. Pin the CLFDES shape.
    const c = await loadCrumble()
    expect(c.CRUMBLE_SHAKE_COUNT, 'five shakes, not three ASH frames').toBe(5)
    expect(c.CRUMBLE_DEBRIS_FRAME_COUNT, 'five debris frames, not three ASH frames').toBe(5)
  })

  it('the CrumbleState carries a phase and a cliff — fields the DissolveState lacks', async () => {
    const c = await loadCrumble()
    const s = c.startCrumble('CLIF2')
    expect(Object.prototype.hasOwnProperty.call(s, 'phase'), 'crumble is two-phase').toBe(true)
    expect(Object.prototype.hasOwnProperty.call(s, 'cliff'), 'crumble is bound to a cliff').toBe(
      true,
    )
    // the dissolve's `baiter` flag has no meaning for a cliff
    expect(Object.prototype.hasOwnProperty.call(s, 'baiter'), 'a cliff is not a baiter').toBe(false)
  })
})
