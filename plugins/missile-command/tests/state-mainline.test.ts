// plugins/missile-command/tests/state-mainline.test.ts
//
// Story mc6-1 — RED phase (Tyr One-Handed / TEA). The MAINLINE dispatch: the
// ROM-faithful state machine skeleton that grows mc3's `state.ts` phase seam into
// the full cabinet lifecycle. Contract resolved at RED per design Open Question
// O-6a ("phase-set shape ... Resolve at mc6-1 RED"): the *transitional design
// opener* — adopt the ROM's three-way STATE sign model + the ATRACT boot, KEEP
// the existing play/between/over/nextPhase trio so mc3/mc4 stay green, and defer
// the between/over -> SETUP-task re-home and the game.ts wiring to mc6-2..6.
//
// ─── GROUND TRUTH (REV-01) ───────────────────────────────────────────────────
// MAINLINE dispatches on the SIGN of the one-byte STATE var (W3MAIN.MAC:131
// ";GAME STATE (PLAY,PAUSE,OR SETUP)"), W3MAIN.MAC:507-527:
//     LDA STATE / IFEQ -> JSR PLAY   (STATE == 0        = S.PLAY)
//                IFMI -> JSR PAUSE   (STATE  < 0, hi bit = S.PAUS)
//                ELSE -> JSR SETUP   (STATE  > 0        = S.SETU)
// The three codes are equates in W3COMN.MAC (.RADIX 16 at :1, so bare = HEX):
//     :57  S.SETU =40   -> 0x40 =  64  (positive; hi bit CLEAR)
//     :59  S.PAUS =80   -> 0x80 = 128  (hi bit SET; a SIGNED byte = -128 -> IFMI)
//     :61  S.PLAY =0    ->  0
// The hex reading is FORCED by the dispatch: only 0x80's high bit makes PAUSE the
// IFMI (branch-on-minus) arm. JS has no signed byte, so the dispatch classifies
// by the high bit (== the 6502 N flag), not a naive `< 0` on 128.
//
// 'over' and 'between' are NOT peer states in the ROM — they are SETUP tasks
// (end-of-wave writes S.SETU back to STATE, W3MAIN.MAC:3601/:3663; game-over is
// the ENDGM1/ENDGM2 SETUP entries, W3MAIN.MAC:573/:570). 'attract' is likewise
// SETUP-family: attract runs SETUP->PLAY over a live sim, gated by the orthogonal
// ATRACT flag (W3MAIN.MAC:135 ";ATTRACT (0)/GAME (-1) FLAG"), not a fourth
// dispatch arm. So all three dispatch to the SETUP handler.
//
// Cold start boots to SETUP with attract on (W3MAIN.MAC:491 LDA I,S.SETU / :493
// STA STATE) — the cabinet opens on the demo.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `src/core/state.ts` exports the mc3/mc4 surface but none of the MAINLINE
// surface — `mainline`, `stateCode`, `S_PLAY/S_PAUS/S_SETU`, `INITIAL_PHASE`,
// `INITIAL_ATTRACT` — so loadMainline() throws self-describingly. The citation
// blocks are RED until Dev files the MC-STATE-* claims. Edge transitions
// (attract->setup start, play<->pause, over->attract timeout) are OUT of scope
// here — they are mc6-2/6-3/6-6; this story pins the DISPATCH boundary + INIT.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createCities, type City } from '../src/core/field.js'
import { loadClaims, claimCovers } from './helpers/claims.js'

// ─── the contract GREEN (Loki / Dev) implements in src/core/state.ts ─────────
// Phase grows to the transitional six-way union; the runtime surface this file
// exercises is the dispatch fn, the STATE codes, and the boot constants.
type Phase = 'attract' | 'setup' | 'play' | 'pause' | 'between' | 'over'
type Handler = 'play' | 'pause' | 'setup'
interface MainlineModule {
  S_PLAY: number
  S_PAUS: number
  S_SETU: number
  stateCode: (phase: Phase) => number
  mainline: (phase: Phase) => Handler
  INITIAL_PHASE: Phase
  INITIAL_ATTRACT: boolean
}

// Variable specifier + /* @vite-ignore */ so `tsc --noEmit` stays green while the
// MAINLINE surface is still absent — the fleet idiom (state/field/icbm.test.ts).
const STATE_SPECIFIER = '../src/core/state.js'

async function loadMainline(): Promise<MainlineModule> {
  const surface = ['S_PLAY', 'S_PAUS', 'S_SETU', 'stateCode', 'mainline', 'INITIAL_PHASE', 'INITIAL_ATTRACT']
  try {
    const mod = (await import(/* @vite-ignore */ STATE_SPECIFIER)) as Record<string, unknown>
    const missing = surface.filter((k) => mod[k] === undefined)
    if (missing.length > 0) throw new Error(`state.ts lacks MAINLINE exports: ${missing.join(', ')}`)
    return mod as unknown as MainlineModule
  } catch (e) {
    throw new Error(
      'MAINLINE dispatch not built yet — GREEN (Loki) grows src/core/state.ts, PURE: extend ' +
        "Phase to 'attract'|'setup'|'play'|'pause'|'between'|'over'; export STATE codes " +
        'S_PLAY=0x00, S_PAUS=0x80, S_SETU=0x40 (W3COMN.MAC:61/59/57, cited // not JSDoc); ' +
        'stateCode(phase) -> that byte; mainline(phase) dispatches by the high bit ' +
        '(code===0 -> play, code&0x80 -> pause, else -> setup); INITIAL_PHASE="attract", ' +
        'INITIAL_ATTRACT=true (cold start S.SETU + ATRACT, W3MAIN.MAC:491/:135). No clock, ' +
        `no entropy, no shell import. (${(e as Error).message})`,
    )
  }
}

// ─── the mc3/mc4 trio must survive the union growth (regression, kept green) ──
interface LegacyModule {
  allCitiesDead: (cities: readonly City[]) => boolean
  nextPhase: (phase: 'play' | 'between' | 'over', cities: readonly City[]) => string
  nextWavePhase: (cities: readonly City[]) => string
  resumePlay: (phase: 'play' | 'between' | 'over') => string
}
async function loadLegacy(): Promise<LegacyModule> {
  return (await import(/* @vite-ignore */ STATE_SPECIFIER)) as unknown as LegacyModule
}

const allAlive = (): readonly City[] => createCities()
const allDead = (): readonly City[] => allAlive().map((c) => ({ ...c, alive: false }))
const ALL_PHASES: readonly Phase[] = ['attract', 'setup', 'play', 'pause', 'between', 'over']

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — the Phase union grows to six, and mainline is total over it
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-1 AC1 — Phase union extended (transitional six-way)', () => {
  it('mainline is defined for every one of the six phases (no throw, no undefined)', async () => {
    const { mainline } = await loadMainline()
    for (const p of ALL_PHASES) {
      expect(mainline(p), `mainline(${p}) must return a handler`).toBeDefined()
    }
  })

  it("mainline returns ONLY 'play' | 'pause' | 'setup' — never an out-of-band handler", async () => {
    const { mainline } = await loadMainline()
    for (const p of ALL_PHASES) {
      expect(['play', 'pause', 'setup']).toContain(mainline(p))
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — MAINLINE dispatch by the STATE sign (W3MAIN.MAC:507-527). The three-way
//        split, and the transitions BETWEEN the arms are pinned by mc6-2/3/6.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-1 AC2 — MAINLINE dispatch (three-way sign split)', () => {
  it("'play' dispatches to the PLAY handler (STATE == 0, IFEQ)", async () => {
    const { mainline } = await loadMainline()
    expect(mainline('play')).toBe('play')
  })

  it("'pause' dispatches to the PAUSE handler (STATE high bit set, IFMI)", async () => {
    const { mainline } = await loadMainline()
    expect(mainline('pause')).toBe('pause')
  })

  it("'setup' dispatches to the SETUP handler (STATE > 0, the ELSE arm)", async () => {
    const { mainline } = await loadMainline()
    expect(mainline('setup')).toBe('setup')
  })

  it('the dispatch equals the sign classification of the phase STATE code, for all six phases', async () => {
    const { mainline, stateCode } = await loadMainline()
    // The exact 6502 dispatch: IFEQ (==0) -> play, IFMI (hi bit) -> pause, ELSE -> setup.
    const classify = (code: number): Handler =>
      code === 0 ? 'play' : (code & 0x80) !== 0 ? 'pause' : 'setup'
    for (const p of ALL_PHASES) {
      expect(mainline(p), `mainline(${p}) must match its stateCode sign`).toBe(classify(stateCode(p)))
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — attract / between / over are SETUP-family (not peer states) — they all
//        dispatch to SETUP (positive STATE), the ROM's actual structure.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-1 AC3 — attract/between/over collapse onto the SETUP handler', () => {
  it.each(['attract', 'between', 'over'] as const)(
    "'%s' dispatches to SETUP (a SETUP task in the ROM, positive STATE)",
    async (phase) => {
      const { mainline, stateCode } = await loadMainline()
      expect(mainline(phase)).toBe('setup')
      expect(stateCode(phase), `${phase} is SETUP-family: positive, high bit clear`).toBeGreaterThan(0)
      expect(stateCode(phase) & 0x80, `${phase} must not set the PAUSE high bit`).toBe(0)
    },
  )
})

// ═════════════════════════════════════════════════════════════════════════════
// AC4 — the STATE codes are the radix-correct REV-01 bytes, with the right signs
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-1 AC4 — STATE codes match W3COMN.MAC (S.PLAY/S.PAUS/S.SETU)', () => {
  it('S_PLAY is 0 (S.PLAY, W3COMN.MAC:61) and stateCode(play) is it', async () => {
    const { S_PLAY, stateCode } = await loadMainline()
    expect(S_PLAY).toBe(0)
    expect(stateCode('play')).toBe(0)
  })

  it('S_SETU is 0x40 = 64 (S.SETU, :57), positive with the high bit CLEAR', async () => {
    const { S_SETU, stateCode } = await loadMainline()
    expect(S_SETU).toBe(0x40)
    expect(S_SETU & 0x80).toBe(0) // NOT the PAUSE arm
    expect(stateCode('setup')).toBe(0x40)
  })

  it('S_PAUS is 0x80 = 128 (S.PAUS, :59) — the high bit SET (signed byte -128 -> IFMI)', async () => {
    const { S_PAUS, stateCode } = await loadMainline()
    expect(S_PAUS).toBe(0x80)
    expect(S_PAUS & 0x80).not.toBe(0) // the branch-on-minus selector
    expect(stateCode('pause')).toBe(0x80)
  })

  it('the three codes are DISTINCT — the split is real, not three aliases', async () => {
    const { S_PLAY, S_PAUS, S_SETU } = await loadMainline()
    expect(new Set([S_PLAY, S_PAUS, S_SETU]).size).toBe(3)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC5 — INIT: the cabinet boots to attract, whose STATE is SETUP (cold start
//        S.SETU + ATRACT on). MC-STATE-INIT.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-1 AC5 — boot disposition (attract + SETUP cold start)', () => {
  it("INITIAL_PHASE is 'attract' — the cabinet opens on the demo", async () => {
    const { INITIAL_PHASE } = await loadMainline()
    expect(INITIAL_PHASE).toBe('attract')
  })

  it('the initial phase dispatches to SETUP (cold start LDA I,S.SETU, W3MAIN.MAC:491)', async () => {
    const { mainline, INITIAL_PHASE } = await loadMainline()
    expect(mainline(INITIAL_PHASE)).toBe('setup')
  })

  it('INITIAL_ATTRACT is true — ATRACT boots set (our polarity; ROM ATRACT=0 means attract, :135)', async () => {
    const { INITIAL_ATTRACT } = await loadMainline()
    expect(INITIAL_ATTRACT).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC6 — REGRESSION: the mc3/mc4 trio is UNTOUCHED by the union growth (the whole
//        point of the transitional opener — no re-home, tests stay green).
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-1 AC6 — mc3/mc4 phase trio unchanged', () => {
  it("nextPhase still flips 'play' -> 'over' when the last city dies", async () => {
    const { nextPhase } = await loadLegacy()
    expect(nextPhase('play', allDead())).toBe('over')
    expect(nextPhase('play', allAlive())).toBe('play')
  })

  it("nextPhase keeps 'over' terminal (never resurrects to 'play')", async () => {
    const { nextPhase } = await loadLegacy()
    expect(nextPhase('over', allAlive())).toBe('over')
  })

  it("nextWavePhase still returns 'between' when a city survives, 'over' when none do", async () => {
    const { nextWavePhase } = await loadLegacy()
    expect(nextWavePhase(allAlive())).toBe('between')
    expect(nextWavePhase(allDead())).toBe('over')
  })

  it("resumePlay still leaves 'between' -> 'play' and 'over' terminal", async () => {
    const { resumePlay } = await loadLegacy()
    expect(resumePlay('between')).toBe('play')
    expect(resumePlay('over')).toBe('over')
  })

  it('allCitiesDead keeps its empty-list guard (the centipede `[].every()` trap)', async () => {
    const { allCitiesDead } = await loadLegacy()
    expect(allCitiesDead([])).toBe(false)
    expect(allCitiesDead(allDead())).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC7 — CITATION DISCIPLINE: the three new STATE constants each carry a committed
//        claim pinning their W3COMN.MAC line (the epic fidelity contract).
// ═════════════════════════════════════════════════════════════════════════════
describe('mc6-1 AC7 — MC-STATE-* claims pin S.PLAY/S.PAUS/S.SETU', () => {
  const STATE_EQUATES: ReadonlyArray<{ symbol: string; line: number }> = [
    { symbol: 'S.SETU', line: 57 },
    { symbol: 'S.PAUS', line: 59 },
    { symbol: 'S.PLAY', line: 61 },
  ]

  it.each(STATE_EQUATES)('$symbol (W3COMN.MAC:$line) is covered by a committed claim', ({ symbol, line }) => {
    const claims = loadClaims()
    expect(
      claimCovers(claims, 'W3COMN.MAC', line, line),
      `no committed claim pins W3COMN.MAC:${line} (${symbol}) — the MAINLINE STATE codes must be cited`,
    ).toBe(true)
  })

  it('each STATE claim carries the mc {symbol,value,meaning,source} shape with the right decoded value', () => {
    const wanted: Record<string, number> = { 'S.PLAY': 0, 'S.PAUS': 0x80, 'S.SETU': 0x40 }
    const claims = loadClaims()
    for (const [symbol, value] of Object.entries(wanted)) {
      const hit = claims.filter((c) => c.symbol === symbol)
      expect(hit.length, `a claim must name ${symbol}`).toBeGreaterThan(0)
      expect(
        hit.some((c) => c.value === value),
        `a ${symbol} claim must decode to ${value} (0x${value.toString(16)})`,
      ).toBe(true)
      for (const c of hit) {
        expect(typeof c.meaning, `${symbol} claim needs a meaning`).toBe('string')
        expect(
          c.source && c.source.file === 'W3COMN.MAC' && typeof c.source.line === 'number',
          `${symbol} claim needs source:{file:W3COMN.MAC,line} for the byte check`,
        ).toBe(true)
      }
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC8 — SOURCE RE-DERIVATION (double-entry): the STATE codes ARE the radix-16
//        decode of the vendored REV-01 source at their physical lines, so a claim
//        that agrees with a TYPO in the core still cannot pass. Byte-gated (the
//        reference tree is gitignored -> skips on CI, the jt1-3 pattern).
// ═════════════════════════════════════════════════════════════════════════════
const W3COMN = join(dirname(fileURLToPath(import.meta.url)), '..', 'reference', 'source', 'W3COMN.MAC')
const sourceAvailable = existsSync(W3COMN)
const lineAt = (n: number): string => readFileSync(W3COMN, 'utf8').split('\n')[n - 1] ?? ''
const rhs = (src: string): string => {
  const m = src.match(/=\s*([^;]+?)\s*(;.*)?$/)
  return m ? m[1].trim() : ''
}
const decodeRadix16 = (t: string): number => (t.trim().endsWith('.') ? parseInt(t.trim().slice(0, -1), 10) : parseInt(t.trim(), 16))

describe.skipIf(!sourceAvailable)('mc6-1 AC8 — STATE codes re-derive from W3COMN.MAC at their physical line', () => {
  const CASES: ReadonlyArray<{ symbol: string; line: number; expected: number }> = [
    { symbol: 'S.SETU', line: 57, expected: 0x40 },
    { symbol: 'S.PAUS', line: 59, expected: 0x80 },
    { symbol: 'S.PLAY', line: 61, expected: 0x00 },
  ]

  it.each(CASES)('$symbol at W3COMN.MAC:$line decodes (radix-16) to the STATE constant', async ({ symbol, line, expected }) => {
    const src = lineAt(line)
    // The `.` in S.SETU is a literal dot in the symbol name, escaped for the RegExp.
    expect(src, `W3COMN.MAC:${line} must define ${symbol}`).toMatch(new RegExp(`^${symbol.replace('.', '\\.')}\\s*=`))
    expect(decodeRadix16(rhs(src)), `${symbol} radix-decode must equal the STATE constant`).toBe(expected)
  })

  it('the exported STATE constants equal the source re-derivation (no drift between core and ROM)', async () => {
    const { S_PLAY, S_PAUS, S_SETU } = await loadMainline()
    expect(decodeRadix16(rhs(lineAt(61)))).toBe(S_PLAY)
    expect(decodeRadix16(rhs(lineAt(59)))).toBe(S_PAUS)
    expect(decodeRadix16(rhs(lineAt(57)))).toBe(S_SETU)
  })
})
