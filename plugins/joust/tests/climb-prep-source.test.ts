// tests/climb-prep-source.test.ts
//
// Story jt9-23 — RED phase (Tyr One-Handed / TEA). The PROVENANCE companion to
// tests/climb-prep-wiring.test.ts. This file re-derives, from the vendored 1982
// source, the exact ROM shape of the two climb-preparation states this port does
// not yet have — B2UP3 (JOUSTRV4.SRC:4195-4200) and SHUP3 (:4411-4416), both
// labelled "LEVEL FLIGHT, READY TO GO UP".
//
// ─── WHICH GROUPS START GREEN, AND WHY (the jt5-10 / cadence-source split) ────
//   • ORACLE groups re-derive a fact from JOUSTRV4.SRC. The source already says
//     what it says, so they PASS ON ARRIVAL. They are the precise spec Dev must
//     implement in climb-prep-wiring.test.ts, and the regression guard the day
//     someone tidies the states back into the wrong shape. A joust story has
//     died three review rounds on a MISREAD ROM claim (jt8-6); these groups make
//     the mechanism a measurement rather than a paraphrase.
//   • the PORT guard at the bottom (AC2) reads src/core/enemy.ts and is GREEN on
//     arrival too — it pins the three ALREADY-MODELLED frozen constants so this
//     story does not re-derive them. It runs everywhere (no vendored tree).
//
// The FROZEN oracle group in cadence-source.test.ts already pins that B2UP3/SHUP3
// ARM `#20+1` and were never migrated to a DYTBL row. THIS file is not that: it
// pins the ENTRY CONDITION (a cliff above at the up-seek decide) and the BODY
// GRAPH (commit / re-decide / flap), neither of which is guarded anywhere and
// both of which are the mechanic Dev must build.
//
// ─── THE DOUBLE-ENTRY RULE (jt1-3) ───────────────────────────────────────────
// The reader below is INDEPENDENT of any production decoder: it re-reads the raw
// text of JOUSTRV4.SRC. Every vendored read lives inside an it() and the source
// groups are skipIf(!vendoredAvailable) — CI clones without the reference tree
// skip, they do not fail.

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'
import { loadEnemy } from './helpers/enemy-contract.js'

const SRC = 'JOUSTRV4.SRC'

/** The raw source, CR-stripped, 0-indexed. `line N` in a comment is `lines[N-1]`. */
function src(): string[] {
  return sourceLines(SRC).map((l) => (l ?? '').replace(/\r$/, ''))
}

/** Index of the first line whose LABEL field is exactly `label`. A `\b` after
 *  the label keeps `B2UP3` from matching `B2UP3A`/`B2UP3B` (both word chars). */
function labelIdx(lines: readonly string[], label: string): number {
  return lines.findIndex((l) => new RegExp(`^${label}\\b`).test(l))
}

/** The block of source from `label` up to (not including) `until`, joined. */
function blockBetween(lines: readonly string[], label: string, until: string): string {
  const a = labelIdx(lines, label)
  const b = labelIdx(lines, until)
  expect(a, `label ${label} present`).toBeGreaterThanOrEqual(0)
  expect(b, `label ${until} present`).toBeGreaterThan(a)
  return lines.slice(a, b).join('\n')
}

// ═════════════════════════════════════════════════════════════════════════════
// ORACLE — GREEN ON ARRIVAL. The up-seek DECIDE forks on a cliff ABOVE: a solid
// background sample sends the brain to the climb-prep hold (B2UP3/SHUP3); open
// air commits it to the climb (B2UPST/SHUPST). This is the vertical mask sample
// (`BCKYTB-YLEN`), a DIFFERENT read from steerWake's horizontal look-ahead
// (`BCKXTB[x+len]`), and the port's brain performs it NOWHERE today.
// ═════════════════════════════════════════════════════════════════════════════
describe.skipIf(!vendoredAvailable)('ORACLE — the up-seek decide forks to the climb-prep hold on a cliff above', () => {
  it('the HUNTER decide (B2UP) branches to B2UP3 on a solid vertical sample, else B2UPST', () => {
    const lines = src()
    const br = lines.findIndex((l) => /^\s*LBNE\s+B2UP3\b/.test(l))
    expect(br, 'the LBNE B2UP3 branch exists').toBeGreaterThan(0)
    // The two instructions above the branch are the vertical cliff sample.
    const sample = lines.slice(br - 2, br).join('\n')
    expect(sample, 'the sample reads the background X column').toMatch(/LDA\s+BCKXTB,X/)
    expect(sample, 'and ANDs the Y row offset UP by the height (B2YLEN)').toMatch(
      /ANDA\s+BCKYTB-B2YLEN,Y/,
    )
    // Solid sample (LBNE, non-zero) → B2UP3; the fall-through is the clear branch.
    expect(lines[br], 'a non-zero sample is BR=YES → B2UP3').toContain('BR=YES')
    expect(lines[br + 1], 'the clear branch is B2UPST').toMatch(/^B2UPST\b/)
  })

  it('the SHADOW decide (SHUNUP) branches to SHUP3 on a solid vertical sample, else SHUPST', () => {
    const lines = src()
    const br = lines.findIndex((l) => /^\s*LBNE\s+SHUP3\b/.test(l))
    expect(br, 'the LBNE SHUP3 branch exists').toBeGreaterThan(0)
    const sample = lines.slice(br - 2, br).join('\n')
    expect(sample, 'the sample reads the background X column').toMatch(/LDA\s+BCKXTB,X/)
    expect(sample, 'and ANDs the Y row offset UP by the height (SHYLEN)').toMatch(
      /ANDA\s+BCKYTB-SHYLEN,Y/,
    )
    expect(lines[br], 'a non-zero sample is BR=YES → SHUP3').toContain('BR=YES')
    expect(lines[br + 1], 'the clear branch is SHUPST').toMatch(/^SHUPST\b/)
  })

  it('B2YLEN and SHYLEN are the same height offset ($14-6 = 14 pixels)', () => {
    const lines = src()
    for (const name of ['B2YLEN', 'SHYLEN']) {
      const eq = lines.find((l) => new RegExp(`^${name}\\s+EQU`).test(l))
      expect(eq, `${name} EQU present`).toBeDefined()
      expect(eq, `${name} is $14-6`).toMatch(/EQU\s+\$14-6\b/)
    }
    expect(0x14 - 6, 'the height look-up both brains sample above the bird').toBe(14)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// ORACLE — GREEN ON ARRIVAL. On entry the state REMEMBERS THE LINE TO TRACK into
// PDIST and arms a 21-wake "TIME UNTIL NEXT DECISION" interval. The per-brain
// PDIST WIDTH differs and it is not an accident: the hunter stores the full
// 16-bit PPOSY (`LDD/STD`), the shadow only the low byte (`LDB/STB PDIST+1`).
// ═════════════════════════════════════════════════════════════════════════════
describe.skipIf(!vendoredAvailable)('ORACLE — the climb-prep state remembers the tracking line and arms 21 wakes', () => {
  it('B2UP3 stores the FULL 16-bit line (LDD PPOSY / STD PDIST) and arms #20+1', () => {
    const lines = src()
    const body = blockBetween(lines, 'B2UP3', 'B2UP3A')
    expect(body, "the ROM's own label for the state").toContain('LEVEL FLIGHT, READY TO GO UP')
    expect(body, 'reads the full 16-bit current line').toMatch(/LDD\s+PPOSY,U/)
    expect(body, 'and stores it as the tracking line (16-bit)').toMatch(/STD\s+PDIST,U/)
    expect(body, "the ROM's own words for the store").toContain('REMEMBER LINE TO TRACK')
    expect(body, 'arms the decision immediate').toMatch(/LDA\s+#20\+1/)
    expect(body, 'into the decision timer').toMatch(/STA\s+PJOYT,U/)
    expect(body, "the ROM's own words for the timer").toContain('TIME UNTIL NEXT DECISION')
  })

  it('SHUP3 stores only the LOW BYTE of the line (LDB PPOSY+1 / STB PDIST+1) and arms #20+1', () => {
    const lines = src()
    const body = blockBetween(lines, 'SHUP3', 'SHUP3A')
    expect(body, "the ROM's own label for the state").toContain('LEVEL FLIGHT, READY TO GO UP')
    expect(body, 'reads only the low byte of the current line').toMatch(/LDB\s+PPOSY\+1,U/)
    expect(body, 'and stores it as the tracking line (low byte)').toMatch(/STB\s+PDIST\+1,U/)
    // The distinction that a port must NOT flatten: hunter LDD/STD, shadow LDB/STB.
    expect(body, 'the shadow never stores the full 16-bit PDIST here').not.toMatch(/STD\s+PDIST,U/)
    expect(body, 'arms the decision immediate').toMatch(/LDA\s+#20\+1/)
    expect(body, 'into the decision timer').toMatch(/STA\s+PJOYT,U/)
  })

  it('#20+1 is a 21-wake interval — the same value the FROZEN oracle pins', () => {
    // Bare digits are DECIMAL (the joust-source radix rule); `+` adds.
    expect(20 + 1).toBe(21)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// ORACLE — GREEN ON ARRIVAL. Each wake the body (B2UP3A/SHUP3A) re-checks three
// things IN ORDER: (1) the cliff cleared → COMMIT to the climb (LBEQ *UPST);
// (2) the decision timer expired → RE-DECIDE (DEC PJOYT / LBLE B2UNDR|SHADOW);
// (3) falling fast enough past the tracking line → FLAP (the PVELY gate + line
// compare → B2UP4/SHUP4 / *UP3B). The wings stay UP for the level hold otherwise.
// ═════════════════════════════════════════════════════════════════════════════
describe.skipIf(!vendoredAvailable)('ORACLE — the climb-prep body commits, re-decides, or flaps', () => {
  it('B2UP3A: clear→B2UPST, timer-expiry→B2UNDR, and a PVELY fall gate', () => {
    const lines = src()
    const body = blockBetween(lines, 'B2UP3A', 'B2UP4')
    expect(body, 'a cleared cliff commits to the climb').toMatch(/LBEQ\s+B2UPST/)
    expect(body, 'the decision timer counts down').toMatch(/DEC\s+PJOYT,U/)
    expect(body, 'and re-decides when it expires').toMatch(/LBLE\s+B2UNDR/)
    expect(body, 'the fall gate reads velocity-Y').toMatch(/LDD\s+PVELY,U/)
    expect(body, 'against the -$0040 threshold').toMatch(/ADDD\s+#-\$0040/)
    expect(body, "the ROM's own words for the gate").toContain('FALLING FAST ENOUGH?')
    expect(body, 'a not-falling-fast wake glides (B2UP3B)').toMatch(/B2UP3B/)
  })

  it('SHUP3A: clear→SHUPST, timer-expiry→SHADOW, and the same PVELY fall gate', () => {
    const lines = src()
    const body = blockBetween(lines, 'SHUP3A', 'SHUP4')
    expect(body, 'a cleared cliff commits to the climb').toMatch(/LBEQ\s+SHUPST/)
    expect(body, 'the decision timer counts down').toMatch(/DEC\s+PJOYT,U/)
    expect(body, 'and re-decides (SHADOW) when it expires').toMatch(/LBLE\s+SHADOW/)
    expect(body, 'the fall gate reads velocity-Y').toMatch(/LDD\s+PVELY,U/)
    expect(body, 'against the -$0040 threshold').toMatch(/ADDD\s+#-\$0040/)
    expect(body, 'a not-falling-fast wake glides (SHUP3B)').toMatch(/SHUP3B/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// PORT GUARD (AC2) — GREEN ON ARRIVAL, runs everywhere. The THREE frozen sites
// this story must NOT re-derive are already modelled as un-wave-scaled constants
// in src/core/enemy.ts. Wiring the climb-prep states must leave them at their
// hardcoded ROM values; a story that "unifies the decision timers" would drag
// these into a DYTBL row and diverge from wave 3. cadence-source's FROZEN group
// pins the ROM side; this pins the PORT side.
// ═════════════════════════════════════════════════════════════════════════════
describe('PORT GUARD (AC2) — the three already-modelled frozen sites are not re-derived', () => {
  it('DOWN_SEEK_WING_HOLD stays 2 and HUNTER_CLIFF_DWELL stays 8', async () => {
    const e = await loadEnemy()
    // LDA #2 at :3823 and :4008 (down-seek wing hold) — NOT BOUPWD/HUUPWD.
    expect(e.DOWN_SEEK_WING_HOLD, 'the down-seek 2-wake wing hold').toBe(2)
    // LDA #8 at :4144 (hunter cliff dwell) — NOT the shadow's SHCLTM row.
    expect(e.HUNTER_CLIFF_DWELL, "the hunter's cliff dwell").toBe(8)
  })
})
