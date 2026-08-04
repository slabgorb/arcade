// tests/target-source.test.ts
//
// Story jt8-1 — RED phase (Leeloo / TEA). The PROVENANCE companion to
// tests/target.test.ts. The behaviour suite encodes the aggro laws; this file
// proves those laws are REAL in the vendored 1982 source and that each cited
// range is pinned by a committed claim — the jt1-10/jt2-1 double-entry pattern.
//
// The vendored tree is gitignored, so the byte-reads SKIP on CI (the jt1-3
// degradation pattern); the claim-coverage checks read the committed claims/ and
// run everywhere.
//
// RED today: no docs/rom-study/claims/*.json entry pins the SELPLY/TARPLY/TARTM
// ranges yet, so the claim-coverage block below fails until Dev (Korben) commits
// the JT81-* target claims. The vendored-line block passes wherever the source is
// present — it is the independent second entry, not a red signal.

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'
// jt9-2 swept this suite's local pre-hardening claims plumbing onto the shared
// loader jt8-3 extracted. Behaviour-preserving.
import { loadClaims, claimCovers } from './helpers/claims.js'

/** The one authoritative line of the vendored source. */
const line = (file: string, n: number): string => sourceLines(file)[n - 1] ?? ''

// The aggro laws jt8-1 codes to, each mapped to the vendored line that carries it
// and the substrings that MUST be there. If the ROM ever changes under us, this
// block fails before any implementation test can pass on a lie.
const LAWS: ReadonlyArray<{ name: string; file: string; n: number; must: readonly string[] }> = [
  // ── SELPLY: the targeting decision ──────────────────────────────────────────
  { name: 'SELPLY reads the primary target', file: 'JOUSTRV4.SRC', n: 4462, must: ['SELPLY', 'LDX', 'TARPLY'] },
  { name: 'no primary → no target', file: 'JOUSTRV4.SRC', n: 4463, must: ['BEQ', 'SPNONE'] },
  { name: 'the grace gate is TARTM1 == 0', file: 'JOUSTRV4.SRC', n: 4464, must: ['LDA', 'TARTM1', 'DELAY TIMER'] },
  { name: 'fall through to the secondary', file: 'JOUSTRV4.SRC', n: 4466, must: ['LDX', 'TARPL2'] },
  { name: 'the secondary grace gate', file: 'JOUSTRV4.SRC', n: 4468, must: ['LDA', 'TARTM2'] },
  { name: 'nearest tiebreak — the Y coordinate', file: 'JOUSTRV4.SRC', n: 4477, must: ['SUBB', 'PPOSY+1,U', 'FIND CLOSEST'] },
  { name: 'nearest tiebreak — the X coordinate', file: 'JOUSTRV4.SRC', n: 4482, must: ['SUBD', 'PPOSX,U'] },
  // ── jt9-24: the decode-critical instructions of the nearest-of-two metric ────
  { name: 'the Y-metric negate (abs via NEGB)', file: 'JOUSTRV4.SRC', n: 4479, must: ['NEGB'] },
  { name: 'the X-metric negate carries a −2 bias (ADDD #-1, not a plain NEG)', file: 'JOUSTRV4.SRC', n: 4486, must: ['ADDD', '#-1'] },
  { name: 'the overflow guard tests the X-metric HIGH byte', file: 'JOUSTRV4.SRC', n: 4487, must: ['SPRXX', 'TSTA'] },
  { name: 'a non-zero high byte SKIPS the X store (the X axis is dead)', file: 'JOUSTRV4.SRC', n: 4488, must: ['BNE', 'SPRLOX'] },
  { name: 'the final compare — register B (secondary X low byte) vs the primary slot', file: 'JOUSTRV4.SRC', n: 4512, must: ['CMPB', '1,S'] },
  { name: 'the tiebreak is a STRICT less-than', file: 'JOUSTRV4.SRC', n: 4514, must: ['BLO', 'SPN3PL'] },
  { name: 'the fall-through favours the SECONDARY (tie → TARPL2)', file: 'JOUSTRV4.SRC', n: 4515, must: ['SPN2PL', 'LDX', 'TARPL2'] },
  // ── STPLY: register a player into a slot, arm its grace timer ────────────────
  { name: 'register asks if the slot is empty', file: 'JOUSTRV4.SRC', n: 4656, must: ['STPLY2', 'LDD', 'TARPLY'] },
  { name: 'claim the primary slot', file: 'JOUSTRV4.SRC', n: 4658, must: ['STU', 'TARPLY', 'IN USE'] },
  { name: 'the grace reload is TARTIM', file: 'JOUSTRV4.SRC', n: 4659, must: ['LDA', 'TARTIM', 'TIME DELAY'] },
  { name: 'arm the primary grace timer', file: 'JOUSTRV4.SRC', n: 4660, must: ['STA', 'TARTM1'] },
  { name: 'claim the secondary slot', file: 'JOUSTRV4.SRC', n: 4662, must: ['STU', 'TARPL2', 'SECOND AREA'] },
  { name: 'arm the secondary grace timer', file: 'JOUSTRV4.SRC', n: 4664, must: ['STA', 'TARTM2'] },
  // ── death: shift the secondary up into the primary slot ─────────────────────
  { name: 'death checks the primary slot', file: 'JOUSTRV4.SRC', n: 4746, must: ['CMPU', 'TARPLY', 'REMOVE PLAYER FROM TARGET'] },
  { name: 'shift TARPL2 into TARPLY', file: 'JOUSTRV4.SRC', n: 4749, must: ['STD', 'TARPLY'] },
  { name: 'shift TARTM2 into TARTM1', file: 'JOUSTRV4.SRC', n: 4751, must: ['STA', 'TARTM1'] },
  { name: 'clear the secondary slot', file: 'JOUSTRV4.SRC', n: 4753, must: ['STD', 'TARPL2'] },
  // ── the per-frame grace decrement (BEQ-guarded floor at 0) ──────────────────
  { name: 'decrement the primary timer', file: 'JOUSTRV4.SRC', n: 4857, must: ['LDA', 'TARTM1', 'DECREMENT'] },
  { name: 'the primary floor guard', file: 'JOUSTRV4.SRC', n: 4859, must: ['DEC', 'TARTM1'] },
  { name: 'decrement the secondary timer', file: 'JOUSTRV4.SRC', n: 4860, must: ['LDA', 'TARTM2'] },
  { name: 'the secondary floor guard', file: 'JOUSTRV4.SRC', n: 4862, must: ['DEC', 'TARTM2'] },
  // ── TARTIM = 90: the master spawn-grace value the timers reload from ─────────
  { name: 'TARTIM is initialised to 90 frames', file: 'JOUSTRV4.SRC', n: 959, must: ['LDA', '#90', 'DELAY BEFORE TARGETING'] },
  { name: 'store the 90 into TARTIM', file: 'JOUSTRV4.SRC', n: 960, must: ['STA', 'TARTIM'] },
  // ── wave/game reset ─────────────────────────────────────────────────────────
  { name: 'reset the primary slot', file: 'JOUSTRV4.SRC', n: 969, must: ['STD', 'TARPLY', 'RESET TARGETED'] },
  { name: 'reset the secondary slot', file: 'JOUSTRV4.SRC', n: 970, must: ['STD', 'TARPL2'] },
  // ── RAM declarations: the aggro variables + their semantics ─────────────────
  { name: 'TARPLY is the targeted-player workspace', file: 'RAMDEF.SRC', n: 289, must: ['TARPLY', 'RMB', 'TARGETED PLAYERS WORKSPACE'] },
  { name: 'TARPL2 is the second workspace', file: 'RAMDEF.SRC', n: 290, must: ['TARPL2', 'RMB'] },
  { name: 'TARTIM is the master targeting delay', file: 'RAMDEF.SRC', n: 328, must: ['TARTIM', 'RMB', 'MASTER DELAY BEFORE TARGETING'] },
  { name: 'TARTM1 is time left until finding P1', file: 'RAMDEF.SRC', n: 329, must: ['TARTM1', 'RMB', 'UNTIL FINDING PLAYER'] },
  { name: 'TARTM2 is time left until finding P2', file: 'RAMDEF.SRC', n: 330, must: ['TARTM2', 'RMB'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// THE LAWS RE-DERIVE FROM THE VENDORED SOURCE (byte-gated, skips on CI).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the aggro laws are really in the 1982 source', () => {
  it.each(LAWS)('$file:$n carries "$name"', ({ file, n, must }) => {
    const text = line(file, n)
    for (const token of must) {
      expect(text, `${file}:${n} must carry ${JSON.stringify(token)} — got: ${JSON.stringify(text)}`).toContain(
        token,
      )
    }
  })

  it('a player is targetable ONLY when its timer is ZERO — the SELPLY BEQ, not a >0 test', () => {
    // LDA TARTM1 / BEQ 20$ — the grace gate branches on the timer being ZERO.
    // A transcription that treated "targetable" as timer>0 would invert the grace.
    const block = sourceLines('JOUSTRV4.SRC').slice(4463, 4466).join('\n') // 4464-4466
    expect(block).toMatch(/LDA\s+TARTM1[\s\S]*BEQ/)
  })

  it('the grace decrement is BEQ-guarded so it floors at 0, never underflows', () => {
    // LDA TARTM1 / BEQ 10$ / DEC TARTM1 — the DEC is skipped when the timer is
    // already 0. A blind DEC would wrap 0 -> 255 and re-protect the player forever.
    const block = sourceLines('JOUSTRV4.SRC').slice(4856, 4862).join('\n') // 4857-4862
    expect(block).toMatch(/LDA\s+TARTM1[\s\S]*BEQ[\s\S]*DEC\s+TARTM1/)
  })

  it('register arms the grace timer from TARTIM (the protection is not born at 0)', () => {
    const block = sourceLines('JOUSTRV4.SRC').slice(4655, 4661).join('\n') // 4656-4661
    expect(block).toMatch(/STU\s+TARPLY[\s\S]*LDA\s+TARTIM[\s\S]*STA\s+TARTM1/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EVERY CITED RANGE IS PINNED BY A COMMITTED CLAIM (runs everywhere).
// RED until Dev commits the JT81-* target claims.
// ─────────────────────────────────────────────────────────────────────────────
const CITED_RANGES: ReadonlyArray<{ law: string; file: string; start: number; end: number }> = [
  { law: 'SELPLY selection', file: 'JOUSTRV4.SRC', start: 4462, end: 4520 },
  { law: 'STPLY register + grace arm', file: 'JOUSTRV4.SRC', start: 4655, end: 4665 },
  { law: 'TARTIM master-delay init (=90)', file: 'JOUSTRV4.SRC', start: 959, end: 960 },
  { law: 'death slot-shift', file: 'JOUSTRV4.SRC', start: 4746, end: 4753 },
  { law: 'per-frame grace decrement', file: 'JOUSTRV4.SRC', start: 4857, end: 4862 },
  { law: 'wave/game reset', file: 'JOUSTRV4.SRC', start: 969, end: 970 },
  { law: 'TARPLY/TARPL2 RAM decls', file: 'RAMDEF.SRC', start: 289, end: 290 },
  { law: 'TARTIM/TARTM RAM decls', file: 'RAMDEF.SRC', start: 328, end: 330 },
]

describe('each aggro law is pinned by a claims/*.json entry', () => {
  it('loads a non-empty claims set (the guard must have teeth)', () => {
    expect(loadClaims().length, 'docs/rom-study/claims/*.json must exist').toBeGreaterThan(0)
  })

  it.each(CITED_RANGES)('$law ($file:$start-$end) is covered by a claim', ({ file, start, end }) => {
    const claims = loadClaims()
    expect(
      claimCovers(claims, file, start, end),
      `no committed claim pins ${file}:${start}-${end} — jt8-1 requires each aggro law to be cited`,
    ).toBe(true)
  })

  it('jt8-1 added its own aggro claims (JT81-*)', () => {
    const jt81 = loadClaims().filter((c) => /^JT81-\d+$/.test(c.id ?? ''))
    expect(jt81.length, 'the new transcription claims are committed').toBeGreaterThan(0)
  })

  it('every claim id is still unique', () => {
    const ids = loadClaims().map((c) => c.id)
    const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
    expect(dupes, 'duplicate claim ids').toEqual([])
  })

  it('jt9-24 — JT81-003 no longer asserts the REFUTED min-of-axes metric', () => {
    // The :4476-4514 decode (jt9-24) refutes "the smaller of the per-axis gaps":
    // the ROM reads ONLY the primary's Y and the secondary's X (a cross-axis
    // compare), never min(|dx|,|dy|). JT81-003 must be rewritten to the decoded
    // rule — Dev owns the exact replacement text; this only pins that the retired
    // claim is gone. RED until it is corrected.
    const c = loadClaims().find((claim) => claim.id === 'JT81-003')
    expect(c, 'JT81-003 (the SELPLY nearest-of-two claim) must exist').toBeDefined()
    expect(c?.claim, 'JT81-003 still states the retired min-of-axes metric').not.toContain(
      'smaller of the per-axis gaps',
    )
  })
})
