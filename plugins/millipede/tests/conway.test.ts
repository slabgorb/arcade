// tests/conway.test.ts
//
// Story ml3-4 — RED phase (TEA). The CONWAY Life field: Mark Cerny's MASTER
// control program (`CONWAY.MAC:24`) grows and kills mushrooms over the playfield
// by a Game-of-Life variant, and INICON (`CONWAY.MAC:11`, declared as a CONWAY
// entry point at `MLDEF.MAC:73`) initialises the process. The epic's schedule
// risk: NO sibling code (centipede has nothing like it) and NO design-doc prose
// (MILLI.DOC absent, ml1 OQ-2) — this suite is ported purely from Cerny's 6502.
// Every rule asserted below carries a CW-* claim in
// docs/rom-study/claims/08-conway.json, byte-verified against
// reference/original-source/millipede/ by the ml1-1 citation gate.
//
// ─── WHAT GREEN (Dev) MUST SHIP ───────────────────────────────────────────────
//   src/core/conway.ts — the FIRST real core sim module (the ml1-1 purity sweep
//   auto-activates on it). Pure and deterministic: no clock, no entropy, no
//   browser surface. Exports:
//     PLYFLD_WIDTH = 30, PLYFLD_HEIGHT = 32, PLYFLD_STRIDE = 0x20,
//     PLYFLD_SIZE = 0x3c0            // geometry (MLDEF.MAC:103, CW-11)
//     DDT = 0x6e                     // MLDEF.MAC:203 (CW-12)
//     DEATHS = 0x71                  // MLDEF.MAC:205 (CW-13)
//     GROWTH = 0x75                  // MLDEF.MAC:206 (CW-14)
//     POISON = 0x78                  // MLDEF.MAC:207 (CW-15)
//     NORMAL = 0x7c                  // MLDEF.MAC:208 (CW-16)
//     MAXPH = 8                      // MLDEF.MAC:192 (CW-9)
//     EDGE = 2                       // MLDEF.MAC:193 (CW-10)
//     interface ConwayState { phase: number; active: boolean; addr: number;
//                             ngrown: number }
//     initConway(): ConwayState      // INICON, CONWAY.MAC:11-22 (CW-3/4/5/6)
//     masterStep(field: Uint8Array, state: ConwayState): ConwayState
//         One MASTER call (CONWAY.MAC:25-114): sweeps 16 cells in phase 0 /
//         32 cells in later phases, MUTATES `field` in place (the ROM has no
//         double buffer — that in-place order is load-bearing, see AC-3), and
//         returns the NEXT state without mutating the input state.
//
//   The field is the ROM's video-RAM shape (CW-11): a Uint8Array of
//   PLYFLD_SIZE cells indexed by offset = col*PLYFLD_STRIDE + row (col 0..29,
//   row 0..31, row = the address's low 5 bits). Cell values are picture codes;
//   bit 7 is the grey-background bit MSKORA re-imposes (MLDEF.MAC:411, CW-17).
//
// ─── SCOPE (recorded in .session/ml3-4-session.md) ────────────────────────────
//   • Upright cabinet only: CKIND (cocktail, player 2 up) is modelled clear, so
//     the player area is rows < 7 (CONWAY.MAC:46-48, CW-20).
//   • The MUSH count seam (MUSHE1 increment at birth / MUSHDC decrement at
//     total death, MLSUB.MAC:742/707, CW-61/63) is DEFERRED to the ml3-3
//     mushroom-field reducers — this story pins the field bytes and lifecycle.
//
// ─── FIXTURE DERIVATION ──────────────────────────────────────────────────────
//   Every expected byte below was hand-derived from the cited 6502 lines this
//   session (TEA), then cross-checked against an uncommitted line-by-line
//   transcription of CONWAY.MAC. No committed helper reimplements the
//   algorithm (lang-review: a helper that reimplements the algorithm under
//   test is untested code) — the literals stand alone.

import { describe, it, expect } from 'vitest'

interface ConwayState {
  phase: number
  active: boolean
  addr: number
  ngrown: number
}

interface ConwayModule {
  PLYFLD_WIDTH: number
  PLYFLD_HEIGHT: number
  PLYFLD_STRIDE: number
  PLYFLD_SIZE: number
  DDT: number
  DEATHS: number
  GROWTH: number
  POISON: number
  NORMAL: number
  MAXPH: number
  EDGE: number
  initConway: () => ConwayState
  masterStep: (field: Uint8Array, state: ConwayState) => ConwayState
}

// COMPUTED specifier (the centipede bonus-lives.test.ts pattern): tsc cannot
// resolve it, so the RED tree stays lint-clean while the module does not
// exist; vitest resolves it at runtime, relative to this file.
const CONWAY_SPECIFIER = ['..', 'src', 'core', 'conway'].join('/')

/** Self-describing loader (the ml1-1 pattern): RED proves the feature absent. */
async function loadConway(): Promise<ConwayModule> {
  try {
    const mod = (await import(/* @vite-ignore */ CONWAY_SPECIFIER)) as Partial<ConwayModule>
    if (typeof mod.initConway !== 'function') throw new Error('module has no initConway export')
    if (typeof mod.masterStep !== 'function') throw new Error('module has no masterStep export')
    return mod as ConwayModule
  } catch (e) {
    throw new Error(
      'src/core/conway.ts not built yet — GREEN (Dev) ports INICON + MASTER ' +
        '(STARTGR/GROWDIE/CLEANUP) from CONWAY.MAC as a pure core reducer: ' +
        `${e instanceof Error ? e.message : String(e)}`,
    )
  }
}

// ─── field helpers (geometry per CW-11; no game logic reimplemented here) ────
const STRIDE = 0x20
const SIZE = 0x3c0
const idx = (col: number, row: number) => col * STRIDE + row
const emptyField = () => new Uint8Array(SIZE)

/** Run masterStep until the phase changes (one full-screen sweep) or idle. */
function runSweep(mod: ConwayModule, field: Uint8Array, state: ConwayState): ConwayState {
  const from = state.phase
  let st = state
  let guard = 0
  while (st.active && st.phase === from) {
    st = mod.masterStep(field, st)
    if (++guard > 200) throw new Error('sweep did not complete in 200 calls')
  }
  return st
}

/** Run the whole phase-0 setup sweep from a fresh INICON. */
function runPhase0(mod: ConwayModule, field: Uint8Array): ConwayState {
  return runSweep(mod, field, mod.initConway())
}

/** Run masterStep to idle (CDONE=0); returns the final state and call count. */
function runToIdle(
  mod: ConwayModule,
  field: Uint8Array,
  state: ConwayState,
): { state: ConwayState; calls: number } {
  let st = state
  let calls = 0
  while (st.active) {
    st = mod.masterStep(field, st)
    if (++calls > 1000) throw new Error('process did not terminate in 1000 calls')
  }
  return { state: st, calls }
}

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — the module exists, exporting the cited constants and the INICON state.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml3-4 AC-1 — cited constants + INICON init', () => {
  it('exports the cited picture-code bands and phase constants', async () => {
    const m = await loadConway()
    expect(m.PLYFLD_WIDTH).toBe(30) // MLDEF.MAC:103 (CW-11)
    expect(m.PLYFLD_HEIGHT).toBe(32)
    expect(m.PLYFLD_STRIDE).toBe(0x20)
    expect(m.PLYFLD_SIZE).toBe(0x3c0)
    expect(m.DDT).toBe(0x6e) // MLDEF.MAC:203 (CW-12)
    expect(m.DEATHS).toBe(0x71) // MLDEF.MAC:205 (CW-13)
    expect(m.GROWTH).toBe(0x75) // MLDEF.MAC:206 (CW-14)
    expect(m.POISON).toBe(0x78) // MLDEF.MAC:207 (CW-15)
    expect(m.NORMAL).toBe(0x7c) // MLDEF.MAC:208 (CW-16)
    expect(m.MAXPH).toBe(8) // MLDEF.MAC:192 (CW-9)
    expect(m.EDGE).toBe(2) // MLDEF.MAC:193 (CW-10)
  })

  it('initConway() is the INICON state: phase 0, active, at the field base (CW-3/4/5)', async () => {
    const m = await loadConway()
    const st = m.initConway()
    expect(st.phase).toBe(0) // CONWAY.MAC:11-12 (CW-3)
    expect(st.active).toBe(true) // CONWAY.MAC:14-15 (CW-4)
    expect(st.addr).toBe(0) // OBST = PLYFLD (CONWAY.MAC:13,16-17, CW-5)
  })

  it('initConway() does not touch the field (INICON writes registers only)', async () => {
    const m = await loadConway()
    m.initConway()
    // INICON (CONWAY.MAC:11-22) stores PHASE/CDONE/CTEMP only — no field
    // access exists in those 12 instructions. Guarded by API shape: initConway
    // takes no field at all.
    expect(m.initConway.length).toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — MASTER sweep mechanics: batch sizes, row gates, phase advance, CDONE.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml3-4 AC-2 — MASTER sweep mechanics', () => {
  it('phase 0 sweeps HALF a column per call — AND #0F (CW-21)', async () => {
    const m = await loadConway()
    const f = emptyField()
    let st = m.initConway()
    st = m.masterStep(f, st)
    expect(st.addr).toBe(0x10)
    expect(st.phase).toBe(0)
    st = m.masterStep(f, st)
    expect(st.addr).toBe(0x20)
  })

  it('the phase-0 sweep is 60 calls, then PHASE increments and the pointer resets (CW-23)', async () => {
    const m = await loadConway()
    const f = emptyField()
    let st = m.initConway()
    for (let i = 0; i < 60; i++) st = m.masterStep(f, st)
    expect(st.phase).toBe(1)
    expect(st.addr).toBe(0)
    expect(st.active).toBe(true)
  })

  it('non-zero phases sweep a FULL column per call — AND #1F (CW-22)', async () => {
    const m = await loadConway()
    const f = emptyField()
    let st = runPhase0(m, f)
    st = m.masterStep(f, st)
    expect(st.addr).toBe(0x20)
  })

  it('a static field ends after ONE growdie sweep: NGROWN=0 jumps to the end (CW-24/25)', async () => {
    const m = await loadConway()
    const f = emptyField()
    const { state, calls } = runToIdle(m, f, m.initConway())
    // 60 phase-0 calls + 30 phase-1 calls; NGROWN stayed 0 so PHASE jumps to
    // MAXPH then increments past it and CDONE clears (CONWAY.MAC:85-104).
    expect(calls).toBe(90)
    expect(state.active).toBe(false)
    expect(state.phase).toBe(m.MAXPH + 1)
  })

  it('masterStep is a no-op once the process is idle (CDONE=0)', async () => {
    const m = await loadConway()
    const f = emptyField()
    f[idx(10, 10)] = 0x7f
    const idle: ConwayState = { phase: 9, active: false, addr: 0, ngrown: 0 }
    const before = Uint8Array.from(f)
    const st = m.masterStep(f, idle)
    expect(st.active).toBe(false)
    expect(Array.from(f)).toEqual(Array.from(before))
  })

  it('masterStep does not mutate the input state (pure reducer discipline)', async () => {
    const m = await loadConway()
    const f = emptyField()
    const st0 = m.initConway()
    const snapshot = { ...st0 }
    m.masterStep(f, st0)
    expect(st0).toEqual(snapshot)
  })

  it('rows 0, 0x1E and 0x1F are never touched — score and message rows (CW-18/19)', async () => {
    const m = await loadConway()
    const f = emptyField()
    // Content in the gated rows: score digits + a mushroom that would die if
    // the sweep reached it.
    f[idx(9, 0x1e)] = 0x30
    f[idx(9, 0x1f)] = 0x31
    f[idx(9, 0)] = 0x7f
    const { state } = runToIdle(m, f, m.initConway())
    expect(state.active).toBe(false)
    expect(f[idx(9, 0x1e)]).toBe(0x30)
    expect(f[idx(9, 0x1f)]).toBe(0x31)
    expect(f[idx(9, 0)]).toBe(0x7f)
  })

  it('the sweep re-imposes the player-area background bit: rows 2-6 end as 0x80 (CW-17/20)', async () => {
    const m = await loadConway()
    const f = emptyField()
    runToIdle(m, f, m.initConway())
    // STARTGR rewrites every visited blank as 0 | MSKORA; MSKORA is 0x80 for
    // rows < 7 upright (CONWAY.MAC:46-48). STARTGR's own row gate starts at
    // row 2, so row 1 keeps its raw 0 — and rows >= 7 stay 0.
    for (let col = 0; col < 30; col++) {
      for (let row = 0; row < 32; row++) {
        const want = row >= 2 && row < 7 ? 0x80 : 0
        expect(f[idx(col, row)], `cell (${col},${row})`).toBe(want)
      }
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — STARTGR sets up one Life generation IN PLACE. The picture-code scheme
// preserves previous-generation semantics without a double buffer: a fresh
// birth is GROWTH ($75) which never counts as a neighbour (CW-38), while
// conversions of existing mushrooms (growth stages $76/$77, death stages
// $71-$74) still count. The expected bytes below encode that order.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml3-4 AC-3 — STARTGR: births, survival, death, poison, DDT, edges', () => {
  it('a lone mushroom dies: 0 neighbours converts $7F to death stage $74 (CW-47/52)', async () => {
    const m = await loadConway()
    const f = emptyField()
    f[idx(10, 10)] = 0x7f
    runPhase0(m, f)
    expect(f[idx(10, 10)]).toBe(0x74) // $7F - (NORMAL-DEATHS)
  })

  it('birth on exactly 3: an L-tromino births its corner as GROWTH (CW-41/42)', async () => {
    const m = await loadConway()
    const f = emptyField()
    f[idx(10, 10)] = 0x7f
    f[idx(10, 11)] = 0x7f
    f[idx(11, 10)] = 0x7f
    runPhase0(m, f)
    expect(f[idx(11, 11)]).toBe(0x75) // fresh birth, planted via MUSHE1
    // the three originals each have 2 neighbours -> survive; fully grown stays $7F (CW-49)
    expect(f[idx(10, 10)]).toBe(0x7f)
    expect(f[idx(10, 11)]).toBe(0x7f)
    expect(f[idx(11, 10)]).toBe(0x7f)
  })

  it('survival is 1..3, NOT classic Conway 2..3: a vertical trio survives whole and births both flanks (CW-48)', async () => {
    const m = await loadConway()
    const f = emptyField()
    f[idx(10, 10)] = 0x7f
    f[idx(10, 11)] = 0x7f
    f[idx(10, 12)] = 0x7f
    runPhase0(m, f)
    // Classic Life kills the ends (1 neighbour); Cerny's rule keeps them.
    expect(f[idx(10, 10)]).toBe(0x7f)
    expect(f[idx(10, 11)]).toBe(0x7f)
    expect(f[idx(10, 12)]).toBe(0x7f)
    // The flanking blanks see exactly 3 -> births.
    expect(f[idx(9, 11)]).toBe(0x75)
    expect(f[idx(11, 11)]).toBe(0x75)
    // The diagonals see 2 -> no birth.
    expect(f[idx(9, 10)]).toBe(0)
    expect(f[idx(11, 12)]).toBe(0)
  })

  it('4+ neighbours die: the centre of a plus-cross dies while its arms survive (CW-48)', async () => {
    const m = await loadConway()
    const f = emptyField()
    for (const [c, r] of [[10, 10], [9, 10], [11, 10], [10, 9], [10, 11]] as const) f[idx(c, r)] = 0x7f
    runPhase0(m, f)
    expect(f[idx(10, 10)]).toBe(0x74) // 4 neighbours -> dies
    for (const [c, r] of [[9, 10], [11, 10], [10, 9], [10, 11]] as const) {
      expect(f[idx(c, r)], `arm (${c},${r})`).toBe(0x7f)
    }
  })

  it('damaged mushrooms regrow: $7C/$7D map to GROWTH+1, $7E to GROWTH+2 (CW-50/51)', async () => {
    const m = await loadConway()
    const f = emptyField()
    f[idx(10, 10)] = 0x7c
    f[idx(10, 11)] = 0x7d
    f[idx(10, 12)] = 0x7e
    runPhase0(m, f)
    expect(f[idx(10, 10)]).toBe(0x76) // GROWTH+1
    expect(f[idx(10, 11)]).toBe(0x76) // GROWTH+1
    expect(f[idx(10, 12)]).toBe(0x77) // GROWTH+2
  })

  it('poison in the inner ring kills neighbours and blocks a 3-count birth (CW-37/40/45)', async () => {
    const m = await loadConway()
    const f = emptyField()
    f[idx(10, 10)] = 0x78 // poison mushroom
    f[idx(10, 11)] = 0x7f
    f[idx(11, 10)] = 0x7f
    f[idx(11, 12)] = 0x7f
    runPhase0(m, f)
    expect(f[idx(10, 10)]).toBe(0x78) // poison itself untouched (CW-43)
    expect(f[idx(10, 11)]).toBe(0x74) // adjacent normals die
    expect(f[idx(11, 10)]).toBe(0x74)
    expect(f[idx(11, 11)]).toBe(0) // blank beside poison never grows (CW-40)
  })

  it('poison two cells away — the fairy-ring code-1 cells — FORCES growth (CW-34/39/46)', async () => {
    const m = await loadConway()
    const f = emptyField()
    f[idx(8, 10)] = 0x78
    runPhase0(m, f)
    // Blanks at the four cardinal distance-2 template cells grow with zero
    // neighbours (MSHTTL |= $10 -> "GROW ON 3 OR 10", CW-41).
    expect(f[idx(6, 10)]).toBe(0x75)
    expect(f[idx(10, 10)]).toBe(0x75)
    expect(f[idx(8, 8)]).toBe(0x75)
    expect(f[idx(8, 12)]).toBe(0x75)
    // Inner-ring blanks are BLOCKED instead (poison flag $20 wins, CW-40).
    expect(f[idx(9, 10)]).toBe(0)
    expect(f[idx(7, 9)]).toBe(0)
  })

  it('a DDT bomb stamp poisons an adjacent normal mushroom to POISON+3 (CW-36/44)', async () => {
    const m = await loadConway()
    const f = emptyField()
    f[idx(10, 10)] = 0x6e // DDT stamp 1
    f[idx(11, 10)] = 0x6f // DDT stamp 2
    f[idx(11, 11)] = 0x7f // adjacent normal
    f[idx(9, 12)] = 0x7f // NOT adjacent to any stamp — plain lone death
    runPhase0(m, f)
    expect(f[idx(11, 11)]).toBe(0x7b) // POISON+3
    expect(f[idx(10, 10)]).toBe(0x6e) // the bomb itself is left alone (CW-43)
    expect(f[idx(11, 10)]).toBe(0x6f)
    expect(f[idx(9, 12)]).toBe(0x74) // control: normal lone death, not poisoning
  })

  it('"NO POISON MUSHROOM IN PLAYER AREA": the $FB store is suppressed (CW-53)', async () => {
    const m = await loadConway()
    const f = emptyField()
    f[idx(10, 3)] = 0x6e // DDT in the player area
    f[idx(11, 4)] = 0xff // player-area mushroom ($7F | background bit)
    runPhase0(m, f)
    // POISON+3 | MSKORA would be $FB — skipped, cell keeps its old value.
    expect(f[idx(11, 4)]).toBe(0xff)
    // The bomb stamp is rewritten with the background bit ($6E | $80).
    expect(f[idx(10, 3)]).toBe(0xee)
  })

  it('player-area conversions carry the background bit (CW-17/20)', async () => {
    const m = await loadConway()
    const f = emptyField()
    f[idx(10, 5)] = 0xff // lone player-area mushroom
    const st = runPhase0(m, f)
    expect(f[idx(10, 5)]).toBe(0xf4) // death stage $74 | $80
    runToIdle(m, f, st)
    expect(f[idx(10, 5)]).toBe(0x80) // dies to bare background
  })

  it('an attract letter mid-field is left alone (CW-43)', async () => {
    const m = await loadConway()
    const f = emptyField()
    f[idx(18, 8)] = 0x41
    runPhase0(m, f)
    expect(f[idx(18, 8)]).toBe(0x41)
  })

  it('edge columns seed the count with EDGE=2: a lone edge mushroom SURVIVES and births its flanks (CW-29/30/32)', async () => {
    const m = await loadConway()
    const f = emptyField()
    f[idx(0, 10)] = 0x7f // column 0 (left screen edge)
    f[idx(29, 20)] = 0x7f // column 29 (right screen edge)
    f[idx(15, 10)] = 0x7f // interior control: a lone mushroom dies
    runPhase0(m, f)
    // EDGE seeds MSHTTL=2, so the lone edge mushroom counts 2 -> survives, and
    // each blank flanking it counts 2+1=3 -> births.
    expect(f[idx(0, 10)]).toBe(0x7f)
    expect(f[idx(0, 9)]).toBe(0x75)
    expect(f[idx(0, 11)]).toBe(0x75)
    expect(f[idx(29, 20)]).toBe(0x7f)
    expect(f[idx(29, 19)]).toBe(0x75)
    expect(f[idx(29, 21)]).toBe(0x75)
    // Column 1 gets NO seed (CW-31): the interior control dies.
    expect(f[idx(15, 10)]).toBe(0x74)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — GROWDIE animates the stages one step per sweep; NGROWN=0 ends the
// process; CLEANUP (phase MAXPH) converts unfinished growth.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml3-4 AC-4 — GROWDIE stage animation + NGROWN termination + CLEANUP', () => {
  it('a birth animates GROWTH -> +1 -> +2 -> NORMAL+3 across sweeps, then the process ends (CW-55/56)', async () => {
    const m = await loadConway()
    const f = emptyField()
    f[idx(10, 10)] = 0x7f
    f[idx(10, 11)] = 0x7f
    f[idx(11, 10)] = 0x7f
    let st = runPhase0(m, f)
    expect(f[idx(11, 11)]).toBe(0x75)
    st = runSweep(m, f, st) // phase 1
    expect(f[idx(11, 11)]).toBe(0x76)
    st = runSweep(m, f, st) // phase 2
    expect(f[idx(11, 11)]).toBe(0x77)
    st = runSweep(m, f, st) // phase 3: completes WITHOUT setting NGROWN (CW-55)
    expect(f[idx(11, 11)]).toBe(0x7f)
    // completion set no NGROWN, so that same sweep ended the process (CW-24/25)
    expect(st.active).toBe(false)
    expect(st.phase).toBe(m.MAXPH + 1)
  })

  it('a death animates $74 -> $73 -> $72 -> $71 -> gone in 4 sweeps (CW-57/58)', async () => {
    const m = await loadConway()
    const f = emptyField()
    f[idx(10, 10)] = 0x7f
    const st = runPhase0(m, f)
    expect(f[idx(10, 10)]).toBe(0x74)
    const { state, calls } = runToIdle(m, f, st)
    expect(f[idx(10, 10)]).toBe(0)
    // 4 GROWDIE sweeps x 30 calls: the last ($71 -> gone) sets no NGROWN and
    // ends the process (CW-57).
    expect(calls).toBe(120)
    expect(state.active).toBe(false)
  })

  it('GROWDIE processes row 1 even though STARTGR skips it (CW-19/27)', async () => {
    const m = await loadConway()
    const f = emptyField()
    f[idx(7, 1)] = 0x76 // a growth stage already sitting on the message row
    const st = runPhase0(m, f)
    expect(f[idx(7, 1)]).toBe(0x76) // STARTGR's own gate left it alone
    const { state } = runToIdle(m, f, st)
    // GROWDIE advanced it: $76 -> $77|$80 -> NORMAL+3|$80 (row 1 < 7 is the
    // player area, so MASTER's MSKORA applies even on the row STARTGR skips).
    expect(f[idx(7, 1)]).toBe(0xff)
    expect(state.active).toBe(false)
  })

  it('CLEANUP (phase MAXPH) converts unfinished growth to shot-away normals and freezes death stages (CW-59/60)', async () => {
    const m = await loadConway()
    const f = emptyField()
    // Reach phase MAXPH the way the ROM does: the player "prolongs" the
    // process — external damage re-seeds a dying stage between sweeps, keeping
    // NGROWN nonzero for all 7 GROWDIE sweeps (the shell's shots do exactly
    // this to the shared field).
    f[idx(10, 10)] = 0x7f
    f[idx(10, 11)] = 0x7f
    f[idx(11, 10)] = 0x7f
    let st = runPhase0(m, f)
    let guard = 0
    while (st.active && st.phase < m.MAXPH) {
      st = runSweep(m, f, st)
      if (st.active && st.phase >= 1 && st.phase < m.MAXPH) f[idx(20, 20)] = 0x74
      if (++guard > 20) throw new Error('never reached CLEANUP')
    }
    expect(st.active).toBe(true)
    expect(st.phase).toBe(m.MAXPH)
    // Plant an unfinished growth stage for CLEANUP to convert.
    f[idx(21, 20)] = 0x76
    const { state } = runToIdle(m, f, st)
    expect(f[idx(21, 20)]).toBe(0x7d) // $76 + (NORMAL-GROWTH) (CW-60)
    expect(f[idx(20, 20)]).toBe(0x73) // death stages are NOT cleanup's business — frozen
    expect(f[idx(11, 11)]).toBe(0x7f) // the natural birth completed long before
    expect(state.active).toBe(false)
    expect(state.phase).toBe(m.MAXPH + 1)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-5 — THE SEEDED-FIELD GOLDEN. One committed seed exercising every rule at
// once; the full final field must match byte-for-byte. Expected rows were
// derived per the FIXTURE DERIVATION note in the header. Row 0 is the field's
// bottom (the address low-5-bits row), printed one row per line, col 0 first.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml3-4 AC-5 — the seeded-field golden generation', () => {
  const GOLDEN_FINAL_ROWS = [
    '000000000000000000000000000000000000000000000000000000000000', // row 0
    '00000000000000ff00000000000000000000000000000000000000000000', // row 1
    '808080808080808080808080808080808080808080808080808080808080', // row 2
    '808080808080808080808080808080808080808080808080808080808080', // row 3
    '808080808080808080808080808080808080808080808080808080808080', // row 4
    '808080808080808080808080808080808080808080808080808080808080', // row 5
    '808080808080808080808080808080808080808080808080808080808080', // row 6
    '000000000000000000000000000000000000000000000000000000000000', // row 7
    '00000000000000000000000000000000000041000000000000000000007f', // row 8
    '00000000000000000000000000000000000000000000000000000000007f', // row 9
    '000000000000000000007f7f00000000000000000000007f7f7f0000007f', // row 10
    '000000000000000000007f7f000000000000000000007f0000007f000000', // row 11
    '000000000000000000000000000000000000000000007f007b007f000000', // row 12
    '00000000007f00000000000000007f7f7f00000000007f0000007f000000', // row 13
    '0000006e6f007f0000000000007f0000007f00000000007f7f7f00000000', // row 14
    '000000007b007f0000000000007f0078007f000000000000000000000000', // row 15
    '0000000000007f0000000000007f0000007f000000000000000000000000', // row 16
    '000000007f7f00000000000000007f7f7f00000000000000000000000000', // row 17
    '000000000000000000000000000000000000000000000000000000000000', // row 18
    '7f0000000000000000000000000000000000000000000000000000000000', // row 19
    '7f000000007f000000000000000000000000000000000000000000000000', // row 20
    '7f0000007f7f7f0000000000000000000000000000000000000000000000', // row 21
    '00000000007f000000000000000000000000000000000000000000000000', // row 22
    '000000000000000000000000000000000000000000000000000000000000', // row 23
    '000000000000000000000000000000000000000000000000000000000000', // row 24
    '000000000000000000000000000000000000000000000000000000000000', // row 25
    '000000000000000000000000000000000000000000000000000000000000', // row 26
    '000000000000000000000000000000000000000000000000000000000000', // row 27
    '000000000000000000000000000000000000000000000000000000000000', // row 28
    '000000000000000000000000000000000000000000000000000000000000', // row 29
    '000000000000000000300000000000000000000000000000000000000000', // row 30
    '000000000000000000310000000000000000000000000000000000000000', // row 31
  ]

  function seededField(): Uint8Array {
    const f = emptyField()
    const put = (c: number, r: number, v: number) => {
      f[idx(c, r)] = v
    }
    put(10, 10, 0x7f) // ┐
    put(10, 11, 0x7f) // ├ L-tromino -> stable block (birth + survival)
    put(11, 10, 0x7f) // ┘
    put(20, 24, 0x7f) // lone interior mushroom -> full death chain
    put(5, 20, 0x7c) // ┐
    put(5, 21, 0x7d) // ├ damaged mushrooms -> regrow (plus flank births)
    put(5, 22, 0x7e) // ┘
    put(15, 15, 0x78) // poison + two normals: kills + blocks + fairy-ring forces
    put(15, 16, 0x7f)
    put(16, 15, 0x7f)
    put(24, 12, 0x7b) // lone poison: pure fairy-ring forced growth diamond
    put(3, 14, 0x6e) // ┐ DDT bomb pair
    put(4, 14, 0x6f) // ┘
    put(4, 15, 0x7f) // the bomb's victim -> POISON+3, which then acts as poison
    put(18, 8, 0x41) // attract letter mid-field: untouched
    put(0, 20, 0x7f) // left-edge mushroom: EDGE-seeded survival + flank births
    put(29, 9, 0x7f) // right-edge mushroom: same on column 29
    put(12, 4, 0xff) // player-area mushroom: dies to bare background bit
    put(7, 1, 0x76) // growth stage on the message row: GROWDIE-only progress
    put(9, 0x1e, 0x30) // ┐ score rows: never touched
    put(9, 0x1f, 0x31) // ┘
    return f
  }

  it('runs the seed to idle in 180 calls and matches the committed final field byte-for-byte', async () => {
    const m = await loadConway()
    const f = seededField()
    const { state, calls } = runToIdle(m, f, m.initConway())
    expect(state.active).toBe(false)
    expect(state.phase).toBe(m.MAXPH + 1)
    expect(calls).toBe(180) // 60 setup + 4 GROWDIE sweeps x 30

    const rows: string[] = []
    for (let r = 0; r < 32; r++) {
      let s = ''
      for (let c = 0; c < 30; c++) s += f[idx(c, r)].toString(16).padStart(2, '0')
      rows.push(s)
    }
    expect(rows).toEqual(GOLDEN_FINAL_ROWS)
  })

  it('the golden seed is what this suite says it is (fixture self-check)', () => {
    // Guard the guard: 21 placements, nothing else — a stray edit to
    // seededField() must fail HERE, not as an inscrutable golden diff.
    const f = seededField()
    let nonZero = 0
    for (let i = 0; i < SIZE; i++) if (f[i] !== 0) nonZero++
    expect(nonZero).toBe(21)
  })
})
