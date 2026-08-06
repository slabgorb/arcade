// tests/bolava-source.test.ts
//
// Story jt9-22 — RED phase (O'Brien / TEA). The PROVENANCE companion to
// tests/bolava.test.ts — the jt8-3 double-entry pattern: the behaviour suite
// encodes BOLAVA's laws, this file proves those laws are REAL in the vendored
// 1982 source and that each cited range is pinned by a committed JT922-* claim.
//
// WHICH HALF IS WHICH (the jt5-10 split):
//   • The vendored-line ORACLE passes wherever the source is present — the ROM
//     already says what it says; it skips on CI (the tree is gitignored).
//   • The CLAIMS-coverage group is the RED: it demands the committed JT922-*
//     BOLAVA claims that do not exist yet, and it runs everywhere.
//
// THE tp1-8 COLLECTION TRAP: `describe.skipIf` still executes the describe body
// at collection, so every vendored read below happens INSIDE an `it()`.

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'
import { loadClaims, claimCovers } from './helpers/claims.js'

/** The one authoritative line of the vendored source. */
const line = (file: string, n: number): string => sourceLines(file)[n - 1] ?? ''

// Each BOLAVA law, mapped to the vendored line that carries it and the
// substrings that MUST be there. If the ROM ever changes under us, this block
// fails before any implementation test can pass on a lie.
const LAWS: ReadonlyArray<{ name: string; file: string; n: number; must: readonly string[] }> = [
  // ── BOLAV1: the re-check, at $D3 (NOT the shadow's $D0 entry gate) ───────────
  { name: 'BOLAV1 re-checks the whole-pixel Y', file: 'JOUSTRV4.SRC', n: 3948, must: ['BOLAV1', 'LDA', 'PPOSY+1,U'] },
  { name: 'the re-check threshold is $D3 — same as B2DIRL, NOT $D0', file: 'JOUSTRV4.SRC', n: 3949, must: ['CMPA', '#$D3', 'BELOW CLIF5?'] },
  { name: 'above $D3 ⇒ BOLAV4 (back to the brains)', file: 'JOUSTRV4.SRC', n: 3950, must: ['BLO', 'BOLAV4'] },
  { name: 'rising ⇒ ignore the lava, exit to BOLAV4', file: 'JOUSTRV4.SRC', n: 3951, must: ['LDA', 'PVELY,U'] },
  { name: 'BMI BOLAV4 — a climbing bird leaves the episode', file: 'JOUSTRV4.SRC', n: 3952, must: ['BMI', 'BOLAV4', 'IGNORE LAVA'] },
  // ── BOLAVA / BOLAV2: the flap↔coast PJOY ping-pong ──────────────────────────
  { name: 'BOLAVA arms the NEXT wake at BOLAV2', file: 'JOUSTRV4.SRC', n: 3953, must: ['BOLAVA', 'LDD', '#BOLAV2'] },
  { name: 'BOLAVA writes PJOY,U (the entry address)', file: 'JOUSTRV4.SRC', n: 3954, must: ['STD', 'PJOY,U'] },
  { name: 'BOLAVA FLAPS — LDB #1', file: 'JOUSTRV4.SRC', n: 3955, must: ['LDB', '#1'] },
  { name: 'and falls into BODIR3', file: 'JOUSTRV4.SRC', n: 3956, must: ['BRA', 'BODIR3'] },
  { name: 'BOLAV2 arms the NEXT wake at BOLAV1 (the re-check)', file: 'JOUSTRV4.SRC', n: 3958, must: ['BOLAV2', 'LDD', '#BOLAV1'] },
  { name: 'BOLAV2 COASTS — CLRB', file: 'JOUSTRV4.SRC', n: 3960, must: ['CLRB'] },
  // ── BOLAV4 / BODIR3: exit to the brains; the shared, target-blind homing ─────
  { name: 'BOLAV4 returns through the decision block', file: 'JOUSTRV4.SRC', n: 3963, must: ['BOLAV4', 'LDX', 'PDECSN,U', 'BACK TO THE BRAINS'] },
  { name: 'BOLAV4 jumps the smart-brain vector', file: 'JOUSTRV4.SRC', n: 3964, must: ['JMP', '[DSMART,X]'] },
  { name: 'the whole episode steers via BODIR — the BOUNDER homing, target-blind', file: 'JOUSTRV4.SRC', n: 3946, must: ['BODIR3', 'JMP', 'BODIR'] },
]

describe.skipIf(!vendoredAvailable)('BOLAVA is really the lava-avoid episode in the 1982 source', () => {
  it.each(LAWS)('$name ($file:$n)', ({ file, n, must }) => {
    const src = line(file, n)
    for (const token of must) {
      expect(src, `JOUSTRV4.SRC:${n} must carry "${token}" — got: ${src.trim()}`).toContain(token)
    }
  })

  it('the two gate thresholds are NOT the same value — $D0 for the shadow, $D3 for the hunter and the re-check', () => {
    // The story's central "do not conflate them" warning, proven in the source:
    // SHDIR compares $D0 (:4331), B2DIRL and BOLAV1 both compare $D3 (:4098/:3949).
    expect(line('JOUSTRV4.SRC', 4331), 'SHDIR entry gate').toContain('#$D0')
    expect(line('JOUSTRV4.SRC', 4098), 'B2DIRL entry gate').toContain('#$D3')
    expect(line('JOUSTRV4.SRC', 3949), 'BOLAV1 re-check').toContain('#$D3')
    expect(line('JOUSTRV4.SRC', 3949), 'the re-check is NOT the shadow gate').not.toContain('#$D0')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EVERY CITED BOLAVA RANGE IS PINNED BY A COMMITTED CLAIM (runs everywhere).
// RED until Dev commits the JT922-* BOLAVA claims. The gate lines themselves
// (4097-4102, 4330-4334) are already owned by jt8-3's JT83-* claims — this
// story cites the EPISODE BODY it adds.
// ─────────────────────────────────────────────────────────────────────────────
const CITED_RANGES: ReadonlyArray<{ law: string; file: string; start: number; end: number }> = [
  { law: 'BODIR3 — the shared target-blind homing', file: 'JOUSTRV4.SRC', start: 3946, end: 3946 },
  { law: 'BOLAV1 — the $D3 re-check and the rising-ignore', file: 'JOUSTRV4.SRC', start: 3948, end: 3952 },
  { law: 'BOLAVA — flap, arm BOLAV2', file: 'JOUSTRV4.SRC', start: 3953, end: 3956 },
  { law: 'BOLAV2 — coast, arm BOLAV1', file: 'JOUSTRV4.SRC', start: 3958, end: 3961 },
  { law: 'BOLAV4 — exit to the brains', file: 'JOUSTRV4.SRC', start: 3963, end: 3964 },
]

describe('each BOLAVA law is pinned by a claims/*.json entry', () => {
  it.each(CITED_RANGES)('$law ($file:$start-$end) is covered by a claim', ({ file, start, end }) => {
    expect(
      claimCovers(loadClaims(), file, start, end),
      `no committed claim pins ${file}:${start}-${end} — jt9-22 requires each BOLAVA law to be cited (radix, AC1)`,
    ).toBe(true)
  })

  it('jt9-22 added its own BOLAVA claims (JT922-*)', () => {
    const jt922 = loadClaims().filter((c) => /^JT922-\d+$/.test(c.id ?? ''))
    expect(jt922.length, 'the new transcription claims are committed').toBeGreaterThan(0)
  })

  it('a claim OWNS the re-check-threshold distinction — BOLAV1 compares $D3, not the shadow entry $D0', () => {
    // The trap this story is written around: the shadow ENTERS BOLAVA at $D0 but
    // the episode RE-CHECKS at $D3. A claim that pinned BOLAV1 without saying so
    // would let a Dev reuse SHDIR_LAVA_Y for the exit and never redden.
    const owns = loadClaims().filter(
      (c) =>
        /^JT922-\d+$/.test(c.id ?? '') &&
        /\$D3/.test(c.claim ?? '') &&
        (c.source?.line ?? 0) >= 3948 &&
        (c.source?.line ?? 0) <= 3952,
    )
    expect(
      owns.length,
      "a JT922-* claim on BOLAV1 (:3948-3952) must state the re-check is $D3 — the hunter's gate, not the shadow's $D0",
    ).toBeGreaterThan(0)
  })
})
