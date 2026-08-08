// plugins/missile-command/tests/score-multiplier.test.ts
//
// Story mc4-3 — RED phase (Tyr One-Handed / TEA). The per-wave SCORE MULTIPLIER.
// mc3-3 pinned the wave-1 per-ICBM value (25, MC-ICBPTS); this generalises it so
// the kill value scales by the wave multiplier, capped at MAXMUL (=6, MC-MAXMUL).
//
// ─── GROUND TRUTH (REV-01 W3MAIN.MAC, PHYSICAL lines; the file is double-spaced) ─
// The multiplier SMULTI is derived from the wave number, then the kill loop adds
// 25 to the per-ICBM bucket SMULTI times (`;ICBM PTS X WAVE NUMBER`, phys 4083):
//
//     LDA WAVENO      (phys 4063)   ; A = wave number (WAVENO is 1-based:
//     CLC             (phys 4065)   ;   `LDA I,1 / STA WAVENO`, "START WITH
//     ADC I,1         (phys 4067)   ;   WAVE 1", W3MAIN.MAC:3863)
//     LSR             (phys 4069)   ; A = (wave + 1) >> 1  — integer, so the
//     CMP I,MAXMUL    (phys 4071)   ;   multiplier STEPS UP EVERY TWO WAVES
//     IFCS            (phys 4073)   ; if A >= MAXMUL …
//     LDA I,MAXMUL    (phys 4075)   ;   … clamp to MAXMUL (=6, W3COMN.MAC:201)
//     STA SMULTI      (phys 4079)
//       … BEGIN / ADC I,25 / DEX / EQEND  (adds 25 per SMULTI, phys 4083-4095)
//
//   SMULTI(wave) = min( (wave + 1) >> 1 , 6 ),  wave 1-based.
//   Per downed ICBM = 25 × SMULTI(wave).
//
//   The curve steps every two waves and caps at 6× (150 pts/ICBM):
//     waves 1-2 → ×1 (25)   3-4 → ×2 (50)   5-6 → ×3 (75)
//     waves 7-8 → ×4 (100)  9-10 → ×5 (125) 11+  → ×6 (150, capped)
//
//   This is DELIBERATELY not "25 × wave": the story AC's "25 x wave up to the cap"
//   was a mis-paraphrase of the ROM (it diverges from wave 2 on — ROM wave 3 = 50,
//   "25×wave" = 75). Ruled ROM-faithful at RED (see the session Design Deviations);
//   these tests pin the ROM, and `wave 2 = 25` / `wave 3 = 50` are the assertions
//   that kill the "25 × min(wave,6)" reading and the linear-per-wave reading.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `src/core/score.ts` today has `scoreKills(score, killed)` with no wave and no
// `scoreMultiplier` export, so (1) the contract loader throws (no scoreMultiplier)
// and (2) even reached, `scoreKills(0, 1, 3)` returns 25, not the ROM's 50.
//
// GREEN (Loki / Dev) adds a PURE `scoreMultiplier(wave)` = min((wave+1)>>1, 6)
// (wave clamped to ≥1 — a real wave is never < 1, and a 0 multiplier would be a
// silent scoring hole), threads an optional `wave = 1` through `scoreKills`
// (default 1 keeps game.ts's 2-arg call and the mc3-3 suite green; mc4-4 wires the
// real GameState.wave), and cites the new literals so citations.test.ts stays
// green. Purity is guarded automatically by the src/core sweep.

import { describe, it, expect } from 'vitest'
import { loadClaims } from './helpers/claims.js'

// ─── The contract GREEN implements, EXTENDED from mc3-3's ScoreModule ─────────
interface ScoreModule {
  readonly ICBM_KILL_POINTS: number
  scoreKills: (score: number, killed: number, wave?: number) => number
  scoreMultiplier: (wave: number) => number
}

// Dynamic import + variable specifier so `tsc --noEmit` (the release/citation gate)
// stays GREEN while `scoreMultiplier` is still absent — the fleet idiom (mc3-3).
const SCORE_SPECIFIER = '../src/core/score.js'

async function loadScore(): Promise<ScoreModule> {
  try {
    const mod = (await import(/* @vite-ignore */ SCORE_SPECIFIER)) as Partial<ScoreModule>
    if (
      typeof mod.ICBM_KILL_POINTS !== 'number' ||
      typeof mod.scoreKills !== 'function' ||
      typeof mod.scoreMultiplier !== 'function'
    ) {
      throw new Error('score.ts lacks the mc4-3 multiplier contract (ICBM_KILL_POINTS/scoreKills/scoreMultiplier)')
    }
    return mod as ScoreModule
  } catch (e) {
    throw new Error(
      'score.ts is missing the mc4-3 per-wave multiplier — GREEN (Loki) adds a PURE ' +
        '`scoreMultiplier(wave) = min((wave + 1) >> 1, 6)` (wave clamped to ≥ 1) and threads an ' +
        'optional `wave = 1` through `scoreKills` so the per-ICBM value is 25 × scoreMultiplier(wave). ' +
        'The multiplier steps every two waves and caps at 6× (150 pts/ICBM), citing MC-ICBPTS(25) and ' +
        `MC-MAXMUL(6). Default wave = 1 keeps game.ts and the mc3-3 suite green. (${(e as Error).message})`,
    )
  }
}

// Independent-literal truth table: [wave, expected multiplier]. Kept as bare
// literals (never derived from the module) so a wrong formula in the code cannot
// also move the expectation (TS review checks #18/#26).
const MULT_BY_WAVE: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [2, 1],   // ×1
  [3, 2], [4, 2],   // ×2
  [5, 3], [6, 3],   // ×3
  [7, 4], [8, 4],   // ×4
  [9, 5], [10, 5],  // ×5
  [11, 6], [12, 6], // ×6 — reached
  [13, 6], [20, 6], [100, 6], // ×6 — clamped ((wave+1)>>1 would be 7, 10, 50)
]

// ═════════════════════════════════════════════════════════════════════════════
// AC1a — scoreMultiplier: the every-two-waves ramp, capped at MAXMUL
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-3 AC1 — scoreMultiplier(wave) = min((wave+1)>>1, 6)', () => {
  it.each(MULT_BY_WAVE)('wave %i → multiplier %i', async (wave, expected) => {
    const { scoreMultiplier } = await loadScore()
    expect(scoreMultiplier(wave)).toBe(expected)
  })

  it('steps every TWO waves, not every wave (wave 2 = ×1, wave 3 = ×2) — kills the "25×wave" reading', async () => {
    const { scoreMultiplier } = await loadScore()
    expect(scoreMultiplier(2)).toBe(1) // "25 × min(wave,6)" would say 2 here
    expect(scoreMultiplier(3)).toBe(2) // and 3 here
  })

  it('never exceeds MAXMUL(6) once the cap is reached — clamps, does not keep climbing', async () => {
    const { scoreMultiplier } = await loadScore()
    for (const wave of [11, 12, 13, 25, 100, 1000]) {
      expect(scoreMultiplier(wave), `wave ${wave} clamps to 6`).toBe(6)
    }
  })

  it('never returns a multiplier below the wave-1 floor of 1 (a degenerate wave ≤ 1 is not a 0-point scoring hole)', async () => {
    const { scoreMultiplier } = await loadScore()
    // A real wave is 1-based and never < 1, but an unclamped (wave+1)>>1 yields 0
    // at wave 0 and negatives below — which would silently zero out scoring.
    for (const wave of [1, 0, -1, -50]) {
      expect(scoreMultiplier(wave), `wave ${wave} must not drop below ×1`).toBe(1)
    }
  })

  it('is pure — same wave in, same multiplier out, no accumulation between calls', async () => {
    const { scoreMultiplier } = await loadScore()
    expect(scoreMultiplier(7)).toBe(scoreMultiplier(7))
    expect(scoreMultiplier(7)).toBe(4)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1b — scoreKills applies 25 × scoreMultiplier(wave) per kill, onto the score
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-3 AC1 — scoreKills(score, killed, wave) = score + killed × 25 × multiplier', () => {
  // Independent-literal per-ICBM values (25 × the multiplier above).
  it.each([
    [1, 25], [2, 25], [3, 50], [6, 75], [7, 100], [10, 125], [11, 150], [13, 150], [100, 150],
  ] as ReadonlyArray<readonly [number, number]>)(
    'one kill on wave %i adds %i to a zero score',
    async (wave, points) => {
      const { scoreKills } = await loadScore()
      expect(scoreKills(0, 1, wave)).toBe(points)
    },
  )

  it('multiplies PER kill — 4 kills on wave 3 add 4 × 50 = 200', async () => {
    const { scoreKills } = await loadScore()
    expect(scoreKills(0, 4, 3)).toBe(200)
  })

  it('ADDS onto the running score, never replaces it (wave 5: 1000 + 2 × 75 = 1150)', async () => {
    const { scoreKills } = await loadScore()
    expect(scoreKills(1000, 2, 5)).toBe(1150)
  })

  it('zero kills leave the score unchanged regardless of wave', async () => {
    const { scoreKills } = await loadScore()
    expect(scoreKills(340, 0, 9)).toBe(340)
  })

  it('a wave-13 kill is capped at 150, not 175 — proves the MAXMUL clamp reaches scoreKills', async () => {
    const { scoreKills } = await loadScore()
    // (13 + 1) >> 1 = 7; unclamped that is 7 × 25 = 175. The cap makes it 150.
    expect(scoreKills(0, 1, 13)).toBe(150)
  })

  it('defaults wave to 1 when omitted — keeps game.ts (2-arg) and the mc3-3 suite green', async () => {
    const { scoreKills } = await loadScore()
    expect(scoreKills(0, 1)).toBe(25)
    expect(scoreKills(0, 1)).toBe(scoreKills(0, 1, 1))
    expect(scoreKills(500, 3)).toBe(scoreKills(500, 3, 1))
  })

  it('is internally consistent: scoreKills == score + killed × ICBM_KILL_POINTS × scoreMultiplier(wave)', async () => {
    const { scoreKills, scoreMultiplier, ICBM_KILL_POINTS } = await loadScore()
    for (const [score, killed, wave] of [[0, 0, 1], [0, 1, 4], [25, 4, 6], [999, 7, 11], [10, 3, 13]] as const) {
      expect(scoreKills(score, killed, wave)).toBe(score + killed * ICBM_KILL_POINTS * scoreMultiplier(wave))
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — the generalised multiplier is pinned to its claims (MC-ICBPTS/MC-MAXMUL).
// Byte-exactness of each claim is guarded globally by citations(-source).test.ts;
// here we tie the RUNTIME behaviour to the claim VALUES so a drift in either reddens.
// ═════════════════════════════════════════════════════════════════════════════
describe('mc4-3 AC2 — the multiplier cites MC-ICBPTS(25) and MC-MAXMUL(6)', () => {
  it('a committed claim MC-MAXMUL carries the decoded cap value 6 at W3COMN.MAC:201', () => {
    const [c] = loadClaims().filter((cl) => cl.id === 'MC-MAXMUL')
    expect(c, 'docs/rom-study/claims/config.json must carry MC-MAXMUL').toBeDefined()
    expect(Number(c.value), 'MC-MAXMUL is the max score multiplier').toBe(6)
    expect(c.source.file).toBe('W3COMN.MAC')
    expect(c.source.line).toBe(201)
  })

  it('a committed claim MC-ICBPTS carries the decoded per-ICBM base value 25', () => {
    const [c] = loadClaims().filter((cl) => cl.id === 'MC-ICBPTS')
    expect(c, 'docs/rom-study/claims/score.json must carry MC-ICBPTS').toBeDefined()
    expect(Number(c.value)).toBe(25)
  })

  it('the code honours the claims: ICBM_KILL_POINTS == MC-ICBPTS and the multiplier caps at MC-MAXMUL', async () => {
    const { ICBM_KILL_POINTS, scoreMultiplier } = await loadScore()
    const [icbpts] = loadClaims().filter((cl) => cl.id === 'MC-ICBPTS')
    const [maxmul] = loadClaims().filter((cl) => cl.id === 'MC-MAXMUL')
    expect(ICBM_KILL_POINTS, 'the base points must equal the MC-ICBPTS claim').toBe(Number(icbpts.value))
    // A wave well past the cap must land exactly on the claimed maximum — not 5, not 7.
    expect(scoreMultiplier(100), 'the cap must equal the MC-MAXMUL claim').toBe(Number(maxmul.value))
  })
})
