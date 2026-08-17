// tests/train-entry-gate.test.ts
//
// Story ml12-1 — RED phase (Leeloo / TEA). "The train enters one row too high
// and runs over the score/HUD" (owner playtest 2026-08-17).
//
// ─── THE STORY'S PRESCRIBED FIX IS REFUTED — THE DEFECT IS IN THE RENDER ─────────
// The story hypothesised the bug is core ENTER_V, fixed by moving the enter row
// "one row down". That is WRONG, and these tests encode why. ENTER_V = 0xF8
// (src/core/millipede.ts:78) is byte-cited to MILLI.MAC:537 ("LDA I,0F8 / EOR
// CKF8 / STA MOBJV ;VPOS") and is CORRECT: the ROM lays the whole wave-start
// train along the top row v=0xF8 and holds it there. There is NO "one row below"
// ROM value to cite, and changing ENTER_V would be a fidelity regression against
// :537. (See the session Design Deviations for the full refutation.)
//
// The ROM instead treats a motion object at MOBJV (EOR CKF8) >= 0xF4 as OFF THE
// TOP OF THE SCREEN — MILLI.MAC:1865-1872 in the shot/object sweep:
//     115$: LDA X,MOBJV
//           EOR CKF8
//           CMP I,0F4
//           BCS 16$          ;IF OFF TOP OF SCREEN
// So the wave-start train (v=0xF8 >= 0xF4) is, by the ROM's own rule, off the top
// of the visible field. This is the SAME ruling the centipede family already
// settled in cp7-2 (plugins/centipede/tests/train-entry-gate.test.ts): the fix is
// a RENDER DRAW-GATE that declines to paint a segment in the off-top band — NOT a
// core value change, and NOT a vertical offset (an offset would still blit the
// wave-start train one pixel down, still on the HUD score row; a gate removes it).
//
// ─── THE LIVE BUG ───────────────────────────────────────────────────────────────
// main.ts's in-game render loop blits EVERY non-vacant segment ungated
// (main.ts:260 `for (const s of state.segments) ... drawSprite(s.h, s.v, ...)`),
// through px(h,v) = [0xf7-h, 0xf8-v]. At wave start every segment sits at v=0xF8,
// so each paints at y=0 — exactly the reserved HUD score row, where hudPlacements
// also draws (row 0x1F -> y=(0x1F-0x1F)*8 = 0, main.ts:286). That shared top row
// is the owner's "the train runs over the score."
//
// ─── WHAT GREEN (Dev) MUST SHIP ─────────────────────────────────────────────────
//   src/core/millipede.ts — a PURE, exported off-top predicate:
//       segmentOnScreen(v: number): boolean
//     true when a motion object at MOBJV `v` is on the visible field, false in
//     the ROM's off-top score-margin band (MILLI.MAC:1872). Every new constant it
//     introduces carries a docs/rom-study/claims/*.json entry and passes
//     tests/citations.test.ts (epic guardrail).
//   src/main.ts — the segment draw loop skips off-top segments
//     (`if (!segmentOnScreen(s.v)) continue`, or an equivalent filter), so the
//     entering train is not painted onto the HUD score row.
//
// ─── SCOPE OF THESE TESTS ───────────────────────────────────────────────────────
// They pin the LOAD-BEARING invariants that hold for ANY sane off-top boundary in
// (0xE0, 0xF8]: the wave-start enter row is gated, a descended field row is not,
// and the core ENTER_V value is untouched. The EXACT boundary pixel (the ROM's
// 0xF4, or the field-top v=0xF0) and that the score line reads FULLY CLEAR are
// settled by Dev's derivation + the mandatory /millipede/ VISUAL PLAYTEST (AC3) —
// deliberately NOT frozen here with false precision.
//
// RED because src/core/millipede.ts has no segmentOnScreen export yet, and
// main.ts blits the wave-start train ungated.

import { describe, it, expect } from 'vitest'
import mainSrc from '../src/main.ts?raw'
import { createMillipede, ENTER_V, NCENT, VACANT_COLOR, type Segment } from '../src/core/millipede'

// ── Self-describing loader (the ml1-1 / hud-render pattern): RED proves the
//    feature ABSENT with a readable message instead of a static-import type error.
const MILLIPEDE_SPECIFIER = ['..', 'src', 'core', 'millipede'].join('/')

async function loadSegmentOnScreen(): Promise<(v: number) => boolean> {
  const mod = (await import(/* @vite-ignore */ MILLIPEDE_SPECIFIER)) as {
    segmentOnScreen?: (v: number) => boolean
  }
  if (typeof mod.segmentOnScreen !== 'function') {
    throw new Error(
      'src/core/millipede.ts has no segmentOnScreen(v) export yet — GREEN (Dev) ships the ' +
        'off-top render draw-gate (MILLI.MAC:1872), NOT a change to ENTER_V.',
    )
  }
  return mod.segmentOnScreen
}

// Strip // and block comments so a hex/name in prose can't satisfy a source scan.
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

describe('ml12-1 — the render gates the wave-start train off the ROM off-top band (it is not on the score row)', () => {
  it('does NOT count the enter row v=0xF8 as on-screen, but DOES count a descended field row', async () => {
    const segmentOnScreen = await loadSegmentOnScreen()
    // The wave-start enter row (ENTER_V = 0xF8) is >= 0xF4 -> off the top of the
    // screen by the ROM's own gate (MILLI.MAC:1872): it must NOT paint.
    expect(segmentOnScreen(ENTER_V), 'the wave-start enter row v=0xF8 is off the top (MILLI.MAC:1872)').toBe(false)
    // A segment that has descended well into the field draws normally.
    expect(segmentOnScreen(0xe0), 'a descended field row (v=0xE0) is on-screen and draws').toBe(true)
  })

  it('gates the ENTIRE wave-start train — createMillipede() lays all NCENT segments at v=0xF8, none on-screen', async () => {
    const segmentOnScreen = await loadSegmentOnScreen()
    const boot = createMillipede() // the full boot train: head + 11 bodies, all at ENTER_V
    expect(boot.length, 'the boot train is NCENT segments').toBe(NCENT)
    expect(
      boot.every((s: Segment) => s.v === ENTER_V),
      'every wave-start segment sits on the enter row (this IS the playtest report)',
    ).toBe(true)
    // Post-gate: not one wave-start segment is on-screen — the whole train is held
    // off the top, so no head/body sprite lands on the HUD score row at wave start.
    expect(
      boot.some((s: Segment) => segmentOnScreen(s.v)),
      'no wave-start segment paints on the score row (the fix)',
    ).toBe(false)
  })

  it('a descended copy of that same train IS on-screen (the gate does not hide the visible field)', async () => {
    const segmentOnScreen = await loadSegmentOnScreen()
    // Drop the whole boot train two full rows (0xF8 -> 0xE8): well clear of the
    // off-top band, so every live segment must now be on-screen — proves the gate
    // is an off-top band, not a blanket "train never draws".
    const descended = createMillipede().map((s: Segment) => ({ ...s, v: 0xe8 }))
    expect(
      descended.every((s: Segment) => s.color === VACANT_COLOR || segmentOnScreen(s.v)),
      'a train that has descended onto the field draws in full',
    ).toBe(true)
  })

  it('GUARD: the core enter value ENTER_V is UNCHANGED at 0xF8 — the fix is the render, not the sim (MILLI.MAC:537)', () => {
    // The story's prescribed "move the enter row one row down" is refuted: :537 is
    // LDA I,0F8. A fix that mutates ENTER_V to clear the score is a fidelity
    // regression and this guard reddens it.
    expect(ENTER_V, 'ENTER_V stays byte-faithful to MILLI.MAC:537 "LDA I,0F8"').toBe(0xf8)
  })

  it('WIRING: main.ts consults the off-top gate in its segment draw path (comment-stripped source)', () => {
    // main.ts is the page script (no exports), so — as with the ml7-2 wiring test
    // — the render wiring is pinned on comment-stripped source. The behavioural
    // weight is on segmentOnScreen's unit tests above; this asserts the page
    // actually routes the train through the gate rather than blitting it ungated.
    const code = stripComments(mainSrc)
    expect(code, 'main.ts references the segmentOnScreen off-top gate').toMatch(/segmentOnScreen\s*\(/)
  })
})
