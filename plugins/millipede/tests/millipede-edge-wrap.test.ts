// tests/millipede-edge-wrap.test.ts
//
// Story ml12-2 — RED phase (O'Brien / TEA). A millipede segment reaching a
// horizontal play-area edge must TURN and drop a row; it must never coast its
// MOBJH past the byte boundary and re-enter the far side (the mod-256 "wrap"),
// running dead-horizontal across the screen. Owner playtest finding 2026-08-17.
//
// ─── THE BUG, GROUNDED (not the story's in-code hypothesis) ────────────────────
// The story filed a HYPOTHESIS: "wrapH (h & 0xff) races the head screen-edge turn
// (atEdge)". That hypothesis is REFUTED against the ROM + live code:
//
//   • The HEAD edge-turn is already correct. Driven into either edge, a head
//     reverses dh and drops a row well before its h reaches the 0x00/0xFF
//     boundary — verified over the full boot train, 400+ frames, and the full
//     stepGame across many seeds: ZERO head wraps. (Group A pins this so it stays
//     true — and closes a VACUOUS bound in the existing edge test, see below.)
//   • wrapH is ROM-faithful: MILLI.MAC:1626-1628 "20$: LDA MOBJDH / CLC / ADC
//     MOBJH" is a plain 8-bit add — real hardware wraps H mod 256 too. The wrap
//     itself is not the defect.
//
// The REAL mechanism (reproduced deterministically below): the port kills a
// segment by SPLICING it out of the array (sim.ts:176 "segments.filter((_, i) =>
// i !== hit)") with NO head-promotion — the ROM instead turns the segment behind
// a dead head into a head ("STA Y,MOBJC ;TURN ON COLOR FOR EYES", MILLI.MAC:164$).
// Shoot the head and the train goes HEADLESS: every remaining segment is a BODY
// (colour BODY_COLOR). A body has NO edge-turn — it only follows its leader down
// (MT-20). The front body (slot 0) has NO leader, so stepMillipede runs it through
// move(seg, false) every frame: a pure horizontal march that wrapHs 0xFE -> 0x00
// at the edge and never drops. The whole headless train, all at one V, marches in
// lockstep and re-enters the far side REPEATEDLY — exactly the owner's "runs
// perfectly horizontally across the screen several times".
//
// ─── WHAT GREEN (Dev) MUST SHIP ───────────────────────────────────────────────
// A segment that reaches a horizontal edge must TURN + drop rather than wrap —
// even when the train has lost its head. Two ROM-faithful shapes satisfy the
// observable pinned here (Dev's choice; these tests pin the OBSERVABLE, not the
// mechanism): (a) promote the front-most live segment to a head when no head
// remains (the ROM's head-on-kill), so it edge-turns; or (b) give the leaderless
// front segment the edge-turn directly. Either way: no live segment may cross the
// 0x00/0xFF boundary during play, and a train marching into an edge must descend.
//
// ─── WHY THIS IS RED ──────────────────────────────────────────────────────────
// Group B drives a headless BODY train into the edge through the REAL producer
// (stepMillipede) and asserts (1) no live segment wraps across the byte boundary
// and (2) the train DESCENDS (a turn subtracts dv; a dead-horizontal wrap holds V
// constant). Today the front body coasts + wraps and V never changes, so both
// fail. Group C proves the state is REACHABLE: it removes the head exactly as the
// kill-splice does and steps the full stepGame, asserting the same no-wrap
// invariant. After the fix, the front turns + drops and both go green; revert the
// fix and they revert to a wrap.
//
// ─── SCOPE ────────────────────────────────────────────────────────────────────
// The horizontal edge / no-wrap behaviour only. The mushroom-turn (ml3-6), the
// overlap-turn (ml10-1) and the head edge-turn are untouched and guarded here as
// controls (Group A). No new core constant is introduced by the RED spec; the
// edge constants LEFT_EDGE / RIGHT_EDGE already exist and are cited MT-21/22, so
// no citations.test.ts change is required unless Dev adds a constant.

import { describe, it, expect } from 'vitest'
import { stepGame, type GameInput } from '../src/core/sim'
import { createGame, type GameState } from '../src/core/game-state'

// ─── ROM constants, hand-mirrored (lang-review #26: an assertion whose terms are
//     all read back from the module under test proves nothing) ─────────────────
const HEAD_COLOR = 0x39 // MT-5  (MILLI.MAC:542 "LDA I,39")
const BODY_COLOR = 0x3d // MT-6  (MILLI.MAC:600 "LDA I,3D")
const VACANT_COLOR = 0x00 // MT-2 (MILLI.MAC:1455)
const HEAD_PIC = 0x03 // MT-4   (MILLI.MAC:520 "LDA I,03")
// The horizontal turn thresholds this story is about — LEFT_EDGE = 0xF0 (MT-21,
// MILLI.MAC:1511) marching right, RIGHT_EDGE = 0x10 (MT-22, :1519) marching left.
// The no-wrap check below uses a wider band (0xE0 / 0x20) around the 0x00/0xFF
// byte boundary so it catches the mod-256 re-entry itself, not the turn point.

interface Segment {
  h: number
  v: number
  dh: number
  dv: number
  pic: number
  color: number
}

interface MillipedeModule {
  stepMillipede: (segs: Segment[], frame: number, field?: Uint8Array) => Segment[]
}

// Computed specifier (the obstac.test.ts / millipede-overlap-turn.test.ts house
// pattern): keeps the tree lint-clean, defers resolution to vitest at runtime.
const MILLIPEDE_SPECIFIER = ['..', 'src', 'core', 'millipede'].join('/')
async function loadMillipede(): Promise<MillipedeModule> {
  const mod = (await import(/* @vite-ignore */ MILLIPEDE_SPECIFIER)) as Partial<MillipedeModule>
  if (typeof mod.stepMillipede !== 'function') throw new Error('millipede.ts has no stepMillipede')
  return mod as MillipedeModule
}

// A "wrap" is the exact signature of a segment re-entering the far side: its h
// jumps ACROSS the 0x00/0xFF byte boundary in a single step. On a correctly
// turning train, h stays inside the play band [~RIGHT_EDGE, ~LEFT_EDGE] and never
// makes this jump — so this is non-vacuous (a wrapped h=0x00 would trip it, which
// the existing test's `h <= LEFT_EDGE + SEG_SPACING` bound does NOT).
const isWrapStep = (prevH: number, nextH: number): boolean =>
  (prevH >= 0xe0 && nextH <= 0x20) || (prevH <= 0x20 && nextH >= 0xe0)

const isLive = (s: Segment): boolean => s.color !== VACANT_COLOR

/** Step stepMillipede n frames; report every wrap event and the deepest descent. */
function march(
  m: MillipedeModule,
  segs: Segment[],
  n: number,
): { wraps: string[]; minV: number[]; segs: readonly Segment[] } {
  let cur: readonly Segment[] = segs
  const minV = segs.map((s) => s.v)
  const wraps: string[] = []
  for (let f = 0; f < n; f++) {
    const next = m.stepMillipede(cur as Segment[], f)
    next.forEach((s, i) => {
      if (isLive(s)) {
        if (isWrapStep(cur[i].h, s.h)) {
          wraps.push(`f${f} seg${i} c=${s.color.toString(16)}: h ${cur[i].h.toString(16)}->${s.h.toString(16)} v=${s.v.toString(16)}`)
        }
        if (s.v < minV[i]) minV[i] = s.v
      }
    })
    cur = next
  }
  return { wraps, minV, segs: cur }
}

const head = (o: Partial<Segment> = {}): Segment => ({
  h: 0x80,
  v: 0xf8,
  dh: 2,
  dv: 2,
  pic: HEAD_PIC,
  color: HEAD_COLOR,
  ...o,
})

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP A — the HEAD edge-turn stays correct, with a NON-VACUOUS anti-wrap bound
// (AC1). These are controls: the head turn already works, and they must keep
// working. They also supersede the vacuous `h <= LEFT_EDGE + SEG_SPACING` bound in
// millipede.test.ts, which a wrapped head (h=0x00) trivially satisfies.
// ═══════════════════════════════════════════════════════════════════════════════
describe('ml12-2 head edge-turn — turns + drops, never wraps (AC1 control)', () => {
  it('a head marching into the LEFT edge reverses, descends, and never crosses the byte boundary', async () => {
    const m = await loadMillipede()
    // Start just inside the right-hand edge marching right at dv 2.
    const { wraps, minV } = march(m, [head({ h: 0xe8, v: 0xf8, dh: 2, dv: 2 })], 40)
    expect(wraps, 'a head must NOT wrap across 0x00/0xFF at the edge').toEqual([])
    expect(minV[0], 'the head dropped at least one row at the edge (MT-23)').toBeLessThan(0xf8)
  })

  it('a head marching into the RIGHT edge reverses, descends, and never crosses the byte boundary', async () => {
    const m = await loadMillipede()
    const { wraps, minV } = march(m, [head({ h: 0x18, v: 0xf8, dh: -2, dv: 2 })], 40)
    expect(wraps, 'a head must NOT wrap across 0x00/0xFF at the edge').toEqual([])
    expect(minV[0], 'the head dropped at least one row at the edge (MT-23)').toBeLessThan(0xf8)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP B — the RED heart: a HEADLESS train (all bodies) must not run
// dead-horizontal and wrap. Reproduces the owner's finding deterministically
// through the real producer (AC2). RED today: the leaderless front body coasts,
// wraps 0xFE->0x00, and never drops.
// ═══════════════════════════════════════════════════════════════════════════════
describe('ml12-2 headless train — no dead-horizontal wrap (AC2)', () => {
  // A train of BODY segments only — the state the kill-splice produces when the
  // head is shot (sim.ts removes the head; no promotion). All on one cell row
  // (v & 7 == 0), spaced 8 apart, the front just inside the right-hand edge
  // marching right. Body colour ⇒ no edge-turn in the current code.
  const headlessTrain = (): Segment[] =>
    [0xe8, 0xe0, 0xd8, 0xd0, 0xc8, 0xc0, 0xb8, 0xb0].map((h) => ({
      h,
      v: 0x80,
      dh: 2,
      dv: 2,
      pic: 0,
      color: BODY_COLOR,
    }))

  it('the front of a headless train marching into the edge must NEVER re-enter the far side', async () => {
    const m = await loadMillipede()
    const { wraps } = march(m, headlessTrain(), 80)
    expect(
      wraps,
      `a headless train ran off the edge and re-entered the far side — the owner's bug. Wrap events:\n${wraps.join('\n')}`,
    ).toEqual([])
  })

  it('a headless train reaching the edge DESCENDS (turns + drops) instead of running dead-horizontal', async () => {
    const m = await loadMillipede()
    const startV = 0x80
    const { minV } = march(m, headlessTrain(), 80)
    // A turn subtracts dv from V; a dead-horizontal wrap holds V constant forever.
    expect(minV[0], 'the front segment must drop a row at the edge, not march horizontally through it').toBeLessThan(startV)
  })

  it('a headless train marching LEFT into the right-hand edge also turns, never wraps', async () => {
    const m = await loadMillipede()
    const leftbound: Segment[] = [0x18, 0x20, 0x28, 0x30, 0x38, 0x40].map((h) => ({
      h,
      v: 0x80,
      dh: -2,
      dv: 2,
      pic: 0,
      color: BODY_COLOR,
    }))
    const { wraps, minV } = march(m, leftbound, 80)
    expect(wraps, `headless train wrapped at the RIGHT edge:\n${wraps.join('\n')}`).toEqual([])
    expect(minV[0], 'the front segment dropped a row at the right edge').toBeLessThan(0x80)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP C — reachability: the headless state arises in real play. Remove the head
// exactly as the kill-splice does (sim.ts:176 filters the hit segment out), then
// step the FULL stepGame. No live segment may ever cross the byte boundary.
// ═══════════════════════════════════════════════════════════════════════════════
describe('ml12-2 headless train is reachable via stepGame — no wrap in play (AC2)', () => {
  const idle: GameInput = { dh: 0, dv: 0, fire: false, start: false }

  it('a train that has lost its head does not wrap horizontally across the screen', () => {
    // Build a real play state, then splice out the head — the same array shape the
    // shot-kill leaves behind (sim.ts: segments.filter((_, i) => i !== hit)).
    const g = createGame(0x1982, { phase: 'play' })
    const headless: GameState = {
      ...g,
      segments: g.segments.filter((s) => s.color !== HEAD_COLOR),
    }
    expect(headless.segments.some((s) => s.color === HEAD_COLOR), 'precondition: the train is headless').toBe(false)
    expect(headless.segments.some(isLive), 'precondition: bodies remain').toBe(true)

    let st = headless
    const wraps: string[] = []
    for (let f = 0; f < 400; f++) {
      const prev = st.segments.map((s) => s.h)
      st = stepGame(st, idle)
      st.segments.forEach((s, i) => {
        if (isLive(s) && prev[i] !== undefined && isWrapStep(prev[i], s.h)) {
          wraps.push(`f${f} seg${i} c=${s.color.toString(16)}: h ${prev[i].toString(16)}->${s.h.toString(16)} v=${s.v.toString(16)}`)
        }
      })
      if (st.phase !== 'play') break
    }
    expect(wraps, `a headless train wrapped across the screen edge in real play:\n${wraps.slice(0, 10).join('\n')}`).toEqual([])
  })
})
