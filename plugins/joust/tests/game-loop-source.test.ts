// tests/game-loop-source.test.ts
//
// Story jt4-4 — RED phase (Leeloo / TEA). The PROVENANCE + SOURCE-RE-DERIVATION
// companion to tests/game-loop.test.ts + tests/demo-jt4-4.test.ts. The behaviour
// suites encode the GOVER tri-state, the loop, DBAIT and the egg-hatch spawn; this
// one RE-DERIVES their constants straight out of the vendored 1982 source with the
// INDEPENDENT reader (tests/helpers/joust-source.ts — nothing under src/ may import
// it: the jt1-3 double-entry), and pins the JT44-* claims.
//
// ─── THE FACTS, RE-DERIVED ───────────────────────────────────────────────────
//   • GOVER the TRI-STATE — `LDA #$7F / STA GOVER` "GAME SIMULATION MODE" (GAMSIM,
//     JOUSTRV4.SRC:232-233); `CLR GOVER` "STATE OF GAME = OVER" (ATTRCT, :712);
//     `DEC GOVER` "STATE OF GAME = STARTING THE GAME (.NE.)" (:1015).
//   • THE BAITER CAP — `CMPA #3-1` "ONLY ALLOW 3 BAITERS ON THE SCREEN" / `BHI`
//     (:2108-2109); `INC NBAIT` (:2111); `LDA #-1 / STA PCHASE,Y` "BAITER TYPE
//     PTERODACTYL'S" (:2112-2113).
//   • THE NBAIT SETTLE-ON-DEATH — `LDA PCHASE,U` "KILLED A BAITER?" / `BEQ PTEKL2`
//     / `DEC NBAIT` (PTEKLL, :1370-1372).
//   • THE EGG WAVE — `WAVEGG LDX #EGG1` "EGG WAVE" (:2737) + the 2 pre-mature
//     hatchings `LDA #2` "NUMBER OF PRE-MATURE EGG HATCHINGS" (:2776).
//   • SPDGLA the DEC-KEEP-POSITIVE — `INC ,Y` (:4685) then `DEC ,Y` "(KEEP THE NBR
//     POSITIVE)" (:4688): the idempotence the $80 claimed marker rides.
//
// ─── DEGRADATION (the CI path) ───────────────────────────────────────────────
// CI clones only the joust subrepo and has no vendored tree, so every source
// re-derivation SKIPS there (describe.skipIf(!vendoredAvailable)); the claim-coverage
// checks read the committed claims/ and run EVERYWHERE. Every vendored read lives
// INSIDE an it() body (the tp1-8 collection trap).
//
// ─── THE JT4x CLAIM NAMESPACES ───────────────────────────────────────────────
// jt1-4 owns "JT4-NNN", jt4-1 "JT41-NNN", jt4-2 "JT42-NNN", jt4-3 "JT43-NNN",
// jt4-4 "JT44-NNN". "JT44-001".startsWith("JT4") is TRUE, so coverage here matches
// the FULL "JT44-" prefix — never a bare "JT4".

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'
import { loadGameLoop } from './helpers/game-contract.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const claimsDir = join(repoRoot, 'docs', 'rom-study', 'claims')

// ─── Claims plumbing (the game-bounty-source.test.ts pattern) ────────────────
interface Claim {
  id?: string
  claim?: string
  source?: { file: string; line: number; verbatim?: string }
}
function loadClaims(): Claim[] {
  if (!existsSync(claimsDir)) return []
  return readdirSync(claimsDir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(join(claimsDir, f), 'utf8')) as Claim | Claim[])
    .flat()
}
const basename = (p: string): string => p.split('/').pop() ?? p
function jt44Claims(claims: Claim[]): Claim[] {
  return claims.filter((c) => (c.id ?? '').startsWith('JT44-'))
}
function covers(claims: Claim[], file: string, start: number, end: number): boolean {
  return claims.some(
    (c) => c.source && basename(c.source.file) === file && c.source.line >= start && c.source.line <= end,
  )
}

// Raw-line reader for INSTRUCTION lines.
const line = (n: number): string => sourceLines('JOUSTRV4.SRC')[n - 1] ?? ''

// ─────────────────────────────────────────────────────────────────────────────
// GOVER — the tri-state, re-derived from the three cited sites.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('GOVER source — the tri-state (JOUSTRV4.SRC:232-233 / 712 / 1015)', () => {
  it('GAMSIM sets the positive $7F attract/simulation rung', () => {
    expect(line(232), 'GAMSIM loads #$7F').toMatch(/GAMSIM\s+LDA\s+#\$7F/)
    expect(line(232), 'labelled the game simulation mode').toContain('GAME SIMULATION MODE')
    expect(line(233), 'and stores it to GOVER').toMatch(/STA\s+GOVER/)
  })

  it('ATTRCT clears GOVER to 0 — the OVER rung', () => {
    expect(line(712), 'ATTRCT clears GOVER').toMatch(/ATTRCT\s+CLR\s+GOVER/)
    expect(line(712), 'the comment names the OVER state').toContain('STATE OF GAME = OVER')
  })

  it('the boot DECrements GOVER to a NEGATIVE (.NE.) running rung', () => {
    expect(line(1015), 'DEC GOVER on game start').toMatch(/DEC\s+GOVER/)
    expect(line(1015), 'the comment names the STARTING/running state (.NE.)').toContain('STATE OF GAME = STARTING THE GAME')
  })

  it('the module exports the three rungs at their source-derived values', async () => {
    const g = await loadGameLoop()
    expect(g.GOVER_OVER, 'over = 0 (ATTRCT CLR)').toBe(0)
    expect(g.GOVER_ATTRACT, 'attract = $7F (GAMSIM LDA #$7F)').toBe(0x7f)
    expect(g.GOVER_RUNNING, 'running = negative (the DEC from 0 → non-zero)').toBeLessThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE BAITER CAP + THE NBAIT SETTLE-ON-DEATH.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('baiter source — the max-3 cap + NBAIT settle (JOUSTRV4.SRC:2108-2113 / 1370-1372)', () => {
  it('the send-off caps the swarm at 3 (CMPA #3-1 / BHI) and tags PCHASE = −1', () => {
    expect(line(2108), 'the cap check compares against 3-1').toMatch(/CMPA\s+#3-1/)
    expect(line(2108), 'the comment names the 3-baiter cap').toContain('ONLY ALLOW 3 BAITERS ON THE SCREEN')
    expect(line(2109), 'BHI refuses a 4th baiter').toMatch(/BHI/)
    expect(line(2111), 'a send-off INCs the on-screen count').toMatch(/INC\s+NBAIT/)
    expect(line(2112), 'the baiter PCHASE arms to −1').toMatch(/LDA\s+#-1/)
    expect(line(2113), 'stored to PCHASE — the baiter type').toMatch(/STA\s+PCHASE,Y/)
    expect(line(2113), 'the comment names the baiter type').toContain('BAITER TYPE PTERODACTYL')
  })

  it('a killed baiter DECrements NBAIT on the death entry (PTEKLL) — the settle', () => {
    expect(line(1370), 'PTEKLL asks whether a baiter was killed').toMatch(/LDA\s+PCHASE,U/)
    expect(line(1370), 'the comment names the baiter kill').toContain('KILLED A BAITER')
    expect(line(1371), 'the plain-ptero branch skips the settle').toMatch(/BEQ\s+PTEKL2/)
    expect(line(1372), 'a baiter death DECrements NBAIT — the settle-on-entry').toMatch(/DEC\s+NBAIT/)
  })

  it('the module caps the baiter count at MAX_BAITERS = 3 with PCHASE = −1', async () => {
    // The baiter constants themselves are baiter.ts's (jt3-5); jt4-4 CONSUMES them for the
    // settle wiring — re-assert them here so the settle test's cap is source-anchored.
    const { loadBaiter } = await import('./helpers/baiter-contract.js')
    const b = await loadBaiter()
    expect(b.MAX_BAITERS, 'the cap is 3 (CMPA #3-1)').toBe(3)
    expect(b.BAITER_PCHASE, 'a baiter is PCHASE = −1').toBe(-1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// THE EGG WAVE — WAVEGG spawns the complement as eggs.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('egg-wave source — WAVEGG spawns eggs (JOUSTRV4.SRC:2737-2776)', () => {
  it('WAVEGG opens the egg wave (LDX #EGG1) and pre-hatches 2 eggs', () => {
    expect(line(2737), 'WAVEGG loads the EGG1 placement table').toMatch(/WAVEGG\s+LDX\s+#EGG1/)
    expect(line(2737), 'labelled the EGG WAVE').toContain('EGG WAVE')
    expect(line(2776), 'and pre-matures 2 egg hatchings').toMatch(/LDA\s+#2/)
    expect(line(2776), 'the comment names the pre-mature hatchings').toContain('NUMBER OF PRE-MATURE EGG HATCHINGS')
  })

  it('the module routes the egg wave to the spawn-eggs behaviour', async () => {
    const g = await loadGameLoop()
    expect(g.waveTypeBehaviour('egg'), 'egg → spawn-eggs').toBe('spawnEggs')
    // The predicate that the demo.ts spawn path now consumes (WAVEGG through the dispatch).
    expect(g.eggWaveSpawnsEggs(0x08, { p1: true, p2: true }), 'status $08 is an egg wave').toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// SPDGLA — the DEC-keep-positive that preserves the $80 claimed marker.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('SPDGLA source — DEC-keep-positive (JOUSTRV4.SRC:4685 / 4688)', () => {
  it('a partner-kill INCs the counter, and an already-claimed re-INC is DECremented back (kept positive)', () => {
    expect(line(4685), 'INC ,Y tracks player-vs-player kills').toMatch(/INC\s+,Y/)
    expect(line(4688), 'DEC ,Y restores the count').toMatch(/DEC\s+,Y/)
    expect(line(4688), 'the comment: keep the number positive (idempotence on re-kill)').toContain(
      'KEEP THE NBR POSITIVE',
    )
  })

  it('the module keeps the gladiator claim across a same-winner re-kill (the branch is live)', async () => {
    const g = await loadGameLoop()
    // The behaviour the DEC-keep-positive protects: a re-kill by the claimed winner does not
    // lose the claim, so awardWaveBounty still pays that winner (see game-loop.test.ts).
    const once = g.recordPartnerKill(g.armWaveGuards('gladiator'), 1)
    const twice = g.recordPartnerKill(once, 1)
    const bounty = g.decodeDvalue('SCRHUN', 0x30)
    const paid = g.awardWaveBounty([{ score: 0, scoreBcd: [0, 0, 0], lives: 5, extraManAt: 20_000, out: false }, { score: 0, scoreBcd: [0, 0, 0], lives: 5, extraManAt: 20_000, out: false }], 'gladiator', {
      alive: [true, true], guards: twice, died: [false, false],
    })
    expect(paid[0].score, 'a same-winner re-kill keeps P1 the 3,000 claim').toBe(bounty)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// JT44 claim coverage — runs EVERYWHERE (no vendored tree needed).
// ─────────────────────────────────────────────────────────────────────────────
describe('JT44 claim coverage — the jt4-4 game-over/baiter/egg constants are committed claims', () => {
  it('jt4-4 commits JT44-* claims covering all of its cited source regions', () => {
    const jt44 = jt44Claims(loadClaims())
    expect(jt44.length, 'jt4-4 commits JT44-* claims (docs/rom-study/claims/game-loop.json)').toBeGreaterThan(0)
    expect(covers(jt44, 'JOUSTRV4.SRC', 232, 233), 'a JT44 claim cites the GAMSIM $7F attract rung').toBe(true)
    expect(covers(jt44, 'JOUSTRV4.SRC', 712, 712), 'a JT44 claim cites the ATTRCT CLR GOVER (over)').toBe(true)
    expect(covers(jt44, 'JOUSTRV4.SRC', 1015, 1015), 'a JT44 claim cites the DEC GOVER (running)').toBe(true)
    expect(covers(jt44, 'JOUSTRV4.SRC', 2108, 2113), 'a JT44 claim cites the baiter max-3 cap + PCHASE −1').toBe(true)
    expect(covers(jt44, 'JOUSTRV4.SRC', 1370, 1372), 'a JT44 claim cites the NBAIT settle-on-death').toBe(true)
    expect(covers(jt44, 'JOUSTRV4.SRC', 2737, 2776), 'a JT44 claim cites the WAVEGG egg wave').toBe(true)
    expect(covers(jt44, 'JOUSTRV4.SRC', 4688, 4688), 'a JT44 claim cites the SPDGLA DEC-keep-positive').toBe(true)
  })

  it('every JT44 id is well-formed and globally unique (no collision with JT4-*/JT41-*/JT42-*/JT43-*)', () => {
    const all = loadClaims()
    for (const c of jt44Claims(all)) expect(c.id, 'JT44 ids match JT44-NNN').toMatch(/^JT44-\d+$/)
    const ids = all.map((c) => c.id).filter(Boolean)
    expect(new Set(ids).size, 'all claim ids are globally unique').toBe(ids.length)
  })

  it.skipIf(!vendoredAvailable)('every JT44 claim verbatim actually appears at its cited source line (byte-gate)', () => {
    for (const c of jt44Claims(loadClaims())) {
      if (!c.source?.verbatim) continue
      const actual = sourceLines(c.source.file)[c.source.line - 1] ?? ''
      expect(actual, `${c.id}: verbatim must match ${c.source.file}:${c.source.line}`).toContain(
        c.source.verbatim.trim(),
      )
    }
  })
})
