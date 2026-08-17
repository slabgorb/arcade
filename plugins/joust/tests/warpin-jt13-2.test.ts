// tests/warpin-jt13-2.test.ts
//
// Story jt13-2 — RED phase (Tyr / TEA). The BEHAVIOUR of src/core/warpin.ts: the
// pure TREFF warp-in state machine a player or enemy plays while it materialises
// on its transporter pad. The ROM provenance (the 30 / 1 / 20 constants
// re-derived from the vendored source) lives in warpin-source-jt13-2.test.ts; the
// visible render + drawList wiring in render-warpin / warpin-wiring.
//
// These are pure state functions, exercised directly (not through stepFrame) —
// the dissolve/crumble precedent. Every constant is imported from the built
// module and compared to the ROM literal, so a module that re-bakes a misreading
// (e.g. a 60-frame or one-shot warp-in) reddens here, and the source suite proves
// the literal itself is the ROM's.

import { describe, it, expect } from 'vitest'
import { loadWarpIn } from './helpers/warpin-contract.js'

describe('jt13-2 — warpin constants pin the TREFF window', () => {
  it('WARPIN_FRAME_COUNT is the 30-frame PFRAME window (LDA #30, :5726-5727 / STAND_FRAMES)', async () => {
    const w = await loadWarpIn()
    expect(w.WARPIN_FRAME_COUNT, 'thirty PFRAME frames').toBe(30)
  })

  it('WARPIN_FRAME_NAPS is one nap per frame (TREFF2 PCNAP 1, :5792)', async () => {
    const w = await loadWarpIn()
    expect(w.WARPIN_FRAME_NAPS, 'one nap per PFRAME decrement').toBe(1)
  })

  it('WARPIN_BIRD_VISIBLE_PFRAME is the CMPA #20 split (:5742)', async () => {
    const w = await loadWarpIn()
    expect(w.WARPIN_BIRD_VISIBLE_PFRAME, 'the bird is drawn only for PFRAME <= 20').toBe(20)
  })
})

describe('jt13-2 — startWarpIn opens the effect', () => {
  it('starts on frame 0, a full nap hold, not done', async () => {
    const w = await loadWarpIn()
    const s = w.startWarpIn()
    expect(s.frame, 'frame 0 (PFRAME 30, shortest silhouette)').toBe(0)
    expect(s.nap, 'a full nap hold').toBe(w.WARPIN_FRAME_NAPS)
    expect(s.done, 'not done at birth').toBe(false)
  })
})

describe('jt13-2 — stepWarpIn walks the thirty frames then ends', () => {
  it('visits every frame 0..COUNT-1 in order, then sets done', async () => {
    const w = await loadWarpIn()
    let s = w.startWarpIn()
    const framesSeen: number[] = [s.frame]
    for (let i = 0; i < 2000 && !s.done; i++) {
      const next = w.stepWarpIn(s)
      if (next.frame !== s.frame) framesSeen.push(next.frame)
      s = next
    }
    expect(s.done, 'the warp-in terminates (PLYINT enables collisions)').toBe(true)
    const expected = Array.from({ length: w.WARPIN_FRAME_COUNT }, (_, i) => i)
    expect(framesSeen, 'it walks 0,1,2,…,COUNT-1 in order — the silhouette grows monotonically').toEqual(
      expected,
    )
  })

  it('holds each frame exactly WARPIN_FRAME_NAPS wakes before advancing', async () => {
    const w = await loadWarpIn()
    let s = w.startWarpIn()
    let held = 0
    while (s.frame === 0 && !s.done) {
      s = w.stepWarpIn(s)
      held++
    }
    expect(held, 'frame 0 is held the full nap window (PCNAP 1)').toBe(w.WARPIN_FRAME_NAPS)
    expect(s.frame, 'then it advances to frame 1').toBe(1)
  })

  it('the whole effect lasts exactly WARPIN_FRAME_COUNT * WARPIN_FRAME_NAPS naps (= STAND_FRAMES = 30)', async () => {
    const w = await loadWarpIn()
    let s = w.startWarpIn()
    let naps = 0
    while (!s.done && naps < 2000) {
      s = w.stepWarpIn(s)
      naps++
    }
    // The last step is the one that flips `done`; the ROM's DEC PFRAME/LBNE loop
    // runs the body 30 times (PFRAME 30→0). Pin the magnitude, not just "it ends".
    expect(naps, 'thirty naps of PCNAP 1 — the TREFF window (a too-fast warp-in reddens here)').toBe(
      w.WARPIN_FRAME_COUNT * w.WARPIN_FRAME_NAPS,
    )
  })
})

describe('jt13-2 — the bird-visibility threshold is derivable from the frame', () => {
  it('the bird is hidden for the first (COUNT - VISIBLE_PFRAME) frames, then shown', async () => {
    const w = await loadWarpIn()
    // pframe(frame) = COUNT - frame. Bird visible ⟺ pframe <= VISIBLE_PFRAME
    //             ⟺ frame >= COUNT - VISIBLE_PFRAME.
    const firstVisibleFrame = w.WARPIN_FRAME_COUNT - w.WARPIN_BIRD_VISIBLE_PFRAME
    // For the ROM literals 30 and 20 this is frame 10 — the first ten frames are
    // pad-only. Tie it to the imported constants so drift in either reddens.
    expect(firstVisibleFrame, 'ten pad-only frames precede the bird (PFRAME 30→21)').toBe(10)
    // Sanity: the window is longer than the pad-only prelude — the bird DOES appear.
    expect(firstVisibleFrame, 'the bird appears before the effect ends').toBeLessThan(
      w.WARPIN_FRAME_COUNT,
    )
    expect(firstVisibleFrame, 'and it is not visible from frame 0').toBeGreaterThan(0)
  })
})

describe('jt13-2 — the warp-in is deterministic, pure, and terminal', () => {
  it('two runs from startWarpIn produce identical (frame,nap,done) traces', async () => {
    const w = await loadWarpIn()
    const trace = (): string => {
      let s = w.startWarpIn()
      const out: string[] = []
      for (let i = 0; i < 2000 && !s.done; i++) {
        s = w.stepWarpIn(s)
        out.push(`${s.frame},${s.nap},${s.done}`)
      }
      return out.join('|')
    }
    expect(trace(), 'no clock, no entropy — replays identically').toBe(trace())
  })

  it('stepWarpIn never mutates its argument (pure)', async () => {
    const w = await loadWarpIn()
    const s = w.startWarpIn()
    const before = JSON.stringify(s)
    w.stepWarpIn(s)
    expect(JSON.stringify(s), 'the input state is untouched').toBe(before)
  })

  it('done is idempotent — stepping a finished warp-in returns it unchanged', async () => {
    const w = await loadWarpIn()
    let s = w.startWarpIn()
    for (let i = 0; i < 2000 && !s.done; i++) s = w.stepWarpIn(s)
    expect(s.done, 'reached the terminal state').toBe(true)
    expect(w.stepWarpIn(s), 'a done warp-in is a fixed point').toEqual(s)
  })
})
