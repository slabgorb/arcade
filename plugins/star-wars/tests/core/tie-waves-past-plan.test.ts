// tests/core/tie-waves-past-plan.test.ts
//
// Story sw8-10 — past-plan TIE supply loops the set's LAST group (TWV2Z), RED phase.
//
// THE DEFECT. When the wave's TSPWAV plan runs out, the cabinet does not invent a
// fighter — ADASHP re-arms the supply from the plan's own tail. WSCPU.MAC:1058-1090
// (`ADASHP::`): at end-of-group it does `INC WV.LVL`, selects the wave's set, then
// `LDB WV.LVL / CMPB 0(X)+ / IFHI / LDB -1(X) / ENDIF / STB WV.LVL` (:1082-1087 —
// CLAMPS the group index to the set's LAST group) and `LDD B(X) / STD WV.LP`
// (:1089-1090 — RESTARTS that group's loop pointer at its first entry). Every TSPWAV set
// ends with TWV2Z (WSCPU.MAC:1230-1235), so the endless tail of every space wave is
// the full 18-entry TWV2Z mix — 9 of its rows the ±2048 D-corner begin-locs —
// looped entry-by-entry, forever. Our `spawnTie` (sim.ts:2196-2212) instead falls
// back past the plan's end to `entry?.shape ?? 'TIE'` / `choreoPc(entry?.
// choreography ?? '1A1')`: a single invented mook, repeated, off-table.
//
// REACHABILITY (measured in RED — the story's "latent under the 6-kill quota"
// framing is STALE): the space phase is TIME-boxed now, not quota'd — phaseCleared
// reads `s.phaseTime >= SPACE_PHASE_END_S` (sim.ts:1770, state.ts:929 = 21s,
// sw8-11/12) — and a killed TIE frees a slot that refills on the NEXT step
// (sw8-7, sim.ts:504-517), so spawnCount = 3 + kills. 25+ kills inside 21s walks
// spawnIndex past SET A1's 27 entries in a legitimately played game.
//
// GROUND TRUTH is WSCPU.MAC in the 1983 Atari source (in-repo copy:
// reference/atari-source/star-wars-1983/WSCPU.MAC; greppable original:
// ~/Projects/star-wars-1983-source-text, historicalsource/star-wars @ 5355b76).
// The full TSPWAV/TWV/TBG transcription gate lives in tie-waves-rom.test.ts
// (sw7-12) — this suite does not re-pin the tables; it pins what happens where
// the table ENDS. (TEA sidecar: "the bug lives where the table ends" — the test
// set is the boundary PLUS the first value past it.)
//
// SEAM. `spawnTie` is the wired supply (sim.ts:509 passes the per-wave spawnCount
// and `state.wave - 1`), and it seats the choreography as `initVm(choreoPc(...))`,
// so a spawned fighter's `vm.pc` IS its observable choreography identity, and
// `kind` its shape. The tests below never reach into the implementation's choice
// of resolver — any fix that makes the wired seam produce the ROM's supply passes.
//
// EXPECTED RED: every test asserting a past-plan pc fails today (the fallback
// parks every one at choreoPc('1A1')). The premise/guard tests marked GREEN-ON-
// ARRIVAL pass today and exist to (a) keep the index arithmetic honest and (b)
// kill the two tempting WRONG fixes — `plan[i % plan.length]` (re-spawns Darth in
// the tail and hands SET A1's index 27 straight back to '1A1') and
// `plan[min(i, len-1)]` (freezes the tail on one row, '2D3').

import { describe, it, expect } from 'vitest'
import { createRng } from '@shared/rng'
import { spawnTie } from '../../src/core/sim'
import { TWV_GROUPS, TSPWAV, waveSpawnPlan, choreoPc } from '../../src/core/tie-waves'

const TWV2Z = TWV_GROUPS.TWV2Z
const MOOK_PC = choreoPc('1A1') // where the invented fallback parks every past-plan VM today

/** The observable choreography of the fighter the wired supply produces for a slot:
 * spawnTie seats initVm(choreoPc(choreography)), so vm.pc is the program identity. */
const pcOf = (spawnIndex: number, spaceWave: number): number | undefined =>
  spawnTie(createRng(0x5eed), spawnIndex, spaceWave).vm?.pc

const kindOf = (spawnIndex: number, spaceWave: number): string =>
  spawnTie(createRng(0x5eed), spawnIndex, spaceWave).kind

describe('sw8-10 premises — the data ADASHP\'s clamp lands on (GREEN ON ARRIVAL)', () => {
  it('every TSPWAV set ends with TWV2Z — the clamp target is the same group everywhere (WSCPU.MAC:1230-1235)', () => {
    // AC4's rule is "the SELECTED set's last group"; that it is always TWV2Z is a
    // fact of the data, and the set-relative tests below lean on it. If a set is
    // ever reordered, this failure re-scopes the story rather than letting the
    // tail tests assert the wrong group.
    for (const set of TSPWAV) expect(set[set.length - 1]).toBe('TWV2Z')
  })

  it('the probe can tell the tail from the mook: no TWV2Z entry\'s pc equals choreoPc(\'1A1\'), and the tail is a real mix', () => {
    // Discriminability guard (TEA sidecar tp2-1): every "is TWV2Z[k], not the
    // mook" assertion below is only meaningful if the pcs actually differ. TCH2
    // entries are distinct assembled labels from TCH1's, but assert it rather
    // than know it — a refactor that collapses them would turn this whole suite
    // into noise, and this test makes that loud instead.
    const tailPcs = TWV2Z.map((e) => choreoPc(e.choreography))
    for (const pc of tailPcs) expect(pc).not.toBe(MOOK_PC)
    expect(new Set(tailPcs).size).toBeGreaterThan(1)
  })

  it('the plan lengths the index math below relies on: SET A1 = 27, SET A2 = 30, SETA5/SETA6 = 33, TWV2Z = 18', () => {
    expect(waveSpawnPlan(0).length).toBe(27)
    expect(waveSpawnPlan(1).length).toBe(30)
    expect(waveSpawnPlan(6).length).toBe(33) // recycled even → SETA5 (NWNSHP)
    expect(waveSpawnPlan(7).length).toBe(33) // recycled odd → SETA6
    expect(TWV2Z.length).toBe(18)
  })
})

describe('sw8-10 AC1/AC3 — the boundary, and the first slot past it (SET A1, spaceWave 0)', () => {
  it('the LAST in-plan slot (index 26) is TWV2Z[17] — in-plan supply is untouched (GREEN ON ARRIVAL)', () => {
    // The in-plan half of the boundary pair. Also kills the `plan[min(i, len-1)]`
    // clamp-to-last-ENTRY fix by contrast with the test below: 26 and 27 must
    // yield DIFFERENT rows ('2D3' then '2A1'), not the same frozen one.
    expect(pcOf(26, 0)).toBe(choreoPc(TWV2Z[17].choreography))
  })

  it('index 27 — the first past-plan slot — is TWV2Z[0] (\'2A1\'), NOT an invented \'1A1\' mook', () => {
    // The story's headline. Today this parks at MOOK_PC. Note this same assertion
    // also kills `plan[i % plan.length]`: SET A1's plan[27 % 27] is plan[0] =
    // '1A1' — the modulo fix reproduces the exact defect at the exact boundary.
    expect(pcOf(27, 0)).toBe(choreoPc(TWV2Z[0].choreography))
    expect(pcOf(27, 0)).not.toBe(MOOK_PC)
  })
})

describe('sw8-10 AC2/AC3 — the endless tail walks TWV2Z entry-by-entry, in ROM order, and wraps', () => {
  it('indices 27..44 are the 18 TWV2Z entries in order — including all nine ±2048 D-corner rows', () => {
    for (let k = 0; k < 18; k++) {
      expect(pcOf(27 + k, 0)).toBe(choreoPc(TWV2Z[k].choreography))
    }
  })

  it('index 45 wraps to TWV2Z[0] — the restart is at the group\'s START (STD WV.LP, :1090), not mid-group', () => {
    expect(pcOf(45, 0)).toBe(choreoPc(TWV2Z[0].choreography))
    expect(pcOf(45 + 5, 0)).toBe(choreoPc(TWV2Z[5].choreography))
  })

  it('the cycle is stable arbitrarily deep: index 27 + 18×100 + 7 is TWV2Z[7]', () => {
    expect(pcOf(27 + 18 * 100 + 7, 0)).toBe(choreoPc(TWV2Z[7].choreography))
  })

  it('every past-plan spawn takes its SHAPE from the entry too: a full tail cycle is all plain TIEs', () => {
    // TWV2Z schedules no RTH, so 18/18 kinds are 'tie'. (GREEN ON ARRIVAL — the
    // fallback also says 'TIE' — kept because with the pc tests above it pins
    // that shape and choreography travel TOGETHER from the same entry, AC3.)
    for (let k = 0; k < 18; k++) {
      expect(kindOf(27 + k, 0)).toBe('tie')
    }
  })
})

describe('sw8-10 AC4 — ADASHP\'s rule is SET-relative: clamp to the SELECTED set\'s last group', () => {
  it('SET A2 (spaceWave 1, plan = 30): index 30 is TWV2Z[0], index 47 is TWV2Z[17]', () => {
    expect(pcOf(30, 1)).toBe(choreoPc(TWV2Z[0].choreography))
    expect(pcOf(47, 1)).toBe(choreoPc(TWV2Z[17].choreography))
  })

  it('the recycled even wave (spaceWave 6 → SETA5, plan = 33): index 33 is TWV2Z[0]', () => {
    expect(pcOf(33, 6)).toBe(choreoPc(TWV2Z[0].choreography))
  })

  it('the recycled odd wave (spaceWave 7 → SETA6, plan = 33): index 33+19 wraps to TWV2Z[1]', () => {
    expect(pcOf(33 + 19, 7)).toBe(choreoPc(TWV2Z[1].choreography))
  })

  it('a Darth-bearing set NEVER re-spawns Darth past the plan — the loop is the LAST GROUP, not the whole plan (GREEN ON ARRIVAL)', () => {
    // SET A6 (spaceWave 5) schedules Darth FIRST (TRTH1D[2] at index 2). The ROM's
    // tail recycles only TWV2Z, so Darth appears once per wave, never again from
    // the tail. `plan[i % plan.length]` would march him back out at index 33+2 —
    // this is the test that kills that fix on shape grounds. Passes today (the
    // fallback happens to say 'TIE') — its job is to stay green through GREEN.
    const planLen = waveSpawnPlan(5).length
    for (let k = 0; k < planLen; k++) {
      expect(kindOf(planLen + k, 5)).not.toBe('darth')
    }
  })
})
