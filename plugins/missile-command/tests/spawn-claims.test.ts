// plugins/missile-command/tests/spawn-claims.test.ts
//
// Story mc3-1 — TEA (Han Solo). AC5: the spawner's three game constants are
// REV-01 ground truth, each carried by a committed claim with a BYTE-EXACT
// verbatim:
//   MC-NICBMS  NICBMS = 8   W3COMN.MAC:35  ("NICBMS\t=8\t\t\t;MAX # OF ICBMS")
//   MC-MXICON  MXICON = 7   W3COMN.MAC:193 ("MXICON\t=7\t\t\t;MAX # OF ICBMS ON SCREEN")
//   MC-LAUHGT  LAUHGT = 202 W3COMN.MAC:171 ("LAUHGT\t=0CA\t\t\t;HEIGHT OF HIGHEST ICBM < THIS LAUNCHES MORE")
// (0xCA = 202 decimal; W3COMN is `.RADIX 16`, so the bare `0CA` is hex — the
// decoded value 202 is re-derived from source in citations-source.test.ts.)
//
// ─── STALE-PREMISE CORRECTION (measured 2026-08-07, TEA) ─────────────────────
// The story/plan call these "NEW claims MC-NICBMS/MC-MXICON/MC-LAUHGT" to be
// created in a new `docs/rom-study/claims/spawn.json`. THEY ARE NOT NEW — all
// three are ALREADY committed in `docs/rom-study/claims/config.json` (mc2), with
// exactly these byte-exact verbatims. So this file is a STANDING GUARD on AC5's
// substance, not a RED-until-built test: it passes today. Dev must REUSE the
// existing claims — creating a spawn.json that re-declares any of these ids makes
// check-citations fail with `duplicate id`. The claim assertions here are
// file-agnostic (loadClaims() reads every claims/*.json), so they hold wherever
// the constants live.
//
// ─── WHY THIS FILE STILL EARNS ITS PLACE ─────────────────────────────────────
// citations.test.ts §4 (the AC3 no-uncited-literal guard) is VALUE-based: it only
// checks that SOME committed claim carries the value 8/7/202. citations.test.ts §3
// exercises the checker CLI on THROWAWAY probes — never the committed set. Nothing
// in the suite byte-verifies the COMMITTED claims. Section 3 below is the first to
// do so: it runs the real checker over the committed config.json (+ any spawn.json
// Dev adds), so a mistyped verbatim on any of these constants reddens — AC5's
// "byte-exact verbatim from W3COMN.MAC", finally enforced.

import { describe, it, expect } from 'vitest'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadClaims, claimCovers } from './helpers/claims.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const vendoredRoot = join(root, 'reference', 'source')
const sourceAvailable = existsSync(join(vendoredRoot, 'W3COMN.MAC'))
// The byte-verifying checker CLI (mc2-1). Shelled out — like citations.test.ts §3
// — so no untyped `.mjs` import touches the tsc release gate. Run with no
// MC_CLAIMS_DIR override so it reads the COMMITTED docs/rom-study/claims set,
// including spawn.json once GREEN adds it.
const checkerCli = join(root, 'tools', 'audit', 'check-citations.mjs')
const runChecker = (claimsDir?: string) =>
  spawnSync('node', [checkerCli], {
    encoding: 'utf8',
    env: {
      ...process.env,
      MC_SOURCE_DIR: vendoredRoot,
      ...(claimsDir ? { MC_CLAIMS_DIR: claimsDir } : {}),
    },
  })

/** The three spawn constants and their PHYSICAL W3COMN.MAC lines (measured, grep -an). */
const EXPECTED: ReadonlyArray<{ id: string; symbol: string; value: number; line: number }> = [
  { id: 'MC-NICBMS', symbol: 'NICBMS', value: 8, line: 35 },
  { id: 'MC-MXICON', symbol: 'MXICON', value: 7, line: 193 },
  { id: 'MC-LAUHGT', symbol: 'LAUHGT', value: 202, line: 171 },
]

// ─────────────────────────────────────────────────────────────────────────────
// 1. A committed claim carries each constant with the right id, symbol and value.
// ─────────────────────────────────────────────────────────────────────────────
describe('mc3-1 AC5 — the spawner constants are each pinned by a committed claim', () => {
  it('the committed claims set is non-empty (the guard must have teeth)', () => {
    expect(loadClaims().length, 'docs/rom-study/claims/*.json must hold claims').toBeGreaterThan(0)
  })

  it.each(EXPECTED)('$id names $symbol with the decoded value $value', ({ id, symbol, value }) => {
    const claims = loadClaims()
    const match = claims.filter((c) => c.id === id)
    expect(
      match.length,
      `no committed claim has id ${id} — GREEN authors docs/rom-study/claims/spawn.json`,
    ).toBe(1)
    expect(match[0].symbol, `${id} must name symbol ${symbol}`).toBe(symbol)
    expect(Number(match[0].value), `${id} must carry the decoded value ${value}`).toBe(value)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. Each claim pins the PHYSICAL line where its symbol lives in W3COMN.MAC.
//    (Mirrors citations.test.ts's RETROFIT coverage pattern for the skeleton.)
// ─────────────────────────────────────────────────────────────────────────────
describe('mc3-1 AC5 — each spawn claim cites its physical W3COMN.MAC line', () => {
  it.each(EXPECTED)('$symbol (W3COMN.MAC:$line) is covered by a claim', ({ symbol, line }) => {
    expect(
      claimCovers(loadClaims(), 'W3COMN.MAC', line, line),
      `no committed claim pins W3COMN.MAC:${line} (${symbol}) — AC5 requires each spawn constant cited at its physical line`,
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. BYTE-EXACT forward guard: every committed claim re-opens byte-for-byte
//    against the vendored source. Green on the current set; the moment spawn.json
//    lands with a mistyped verbatim, this reddens (AC5's "byte-exact verbatim").
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!sourceAvailable)('mc3-1 AC5 — the committed claims verify byte-for-byte against W3COMN.MAC', () => {
  it('the checker exits ZERO over the whole committed set (incl. spawn.json once it lands)', () => {
    const r = runChecker()
    expect(
      r.status,
      `committed claims failed byte-verification.\nstdout:${r.stdout}\nstderr:${r.stderr}`,
    ).toBe(0)
  })

  it('a spawn claim with a tampered verbatim is REJECTED (the byte check has teeth)', () => {
    // Proof the byte check bites on a SPAWN constant specifically: an MC-NICBMS
    // claim whose verbatim is NOT the real W3COMN.MAC:35 line must exit non-zero.
    // Runs against a throwaway claims dir, never the committed set, so it holds in
    // RED and GREEN alike.
    const dir = mkdtempSync(join(tmpdir(), 'mc-spawn-claims-'))
    writeFileSync(
      join(dir, 'probe.json'),
      JSON.stringify([
        {
          id: 'PROBE-NICBMS-BAD',
          symbol: 'NICBMS',
          value: 8,
          meaning: 'max ICBMs',
          source: { file: 'W3COMN.MAC', line: 35, verbatim: 'NICBMS\t=999\t\t\t;TAMPERED' },
        },
      ]),
    )
    const r = runChecker(dir)
    expect(r.status, 'a mismatched spawn verbatim must be rejected').not.toBe(0)
    expect(`${r.stdout}${r.stderr}`, 'and say WHY').toMatch(/verbatim|does not match|citation/i)
  })
})
