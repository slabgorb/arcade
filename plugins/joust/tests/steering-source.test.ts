// tests/steering-source.test.ts
//
// Story jt8-3 — RED phase (Mr. Praline / TEA). The PROVENANCE companion to
// tests/steering.test.ts — the jt1-10/jt8-2 double-entry pattern: the behaviour
// suite encodes the laws, this file proves the laws are REAL in the vendored
// 1982 source and that each cited range is pinned by a committed claim.
//
// ─── WHICH HALF IS WHICH (the jt5-10 split, stated up front) ─────────────────
//   • The vendored-line ORACLE groups pass wherever the source is present —
//     the ROM already says what it says; they are the evidence base and they
//     skip on CI (the tree is gitignored — the jt1-3 degradation pattern).
//   • The CLAIMS-coverage groups are the RED: they demand the committed
//     JT83-* steering claims that do not exist yet, and they run everywhere.
//
// ─── THE tp1-8 COLLECTION TRAP ───────────────────────────────────────────────
// `describe.skipIf` still executes the describe callback BODY at collection, so
// every vendored read below happens INSIDE an `it()`.

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'
import { loadClaims, claimCovers } from './helpers/claims.js'

/** The one authoritative line of the vendored source. */
const line = (file: string, n: number): string => sourceLines(file)[n - 1] ?? ''

// Each law jt8-3 codes to, mapped to the vendored line that carries it and the
// substrings that MUST be there. If the ROM ever changes under us, this block
// fails before any implementation test can pass on a lie.
const LAWS: ReadonlyArray<{ name: string; file: string; n: number; must: readonly string[] }> = [
  // ── the two look-ahead lengths ──────────────────────────────────────────────
  { name: 'B2XLEN is 27+4', file: 'JOUSTRV4.SRC', n: 3969, must: ['B2XLEN', 'EQU', '27+4'] },
  { name: 'SHXLEN is 27+4 too', file: 'JOUSTRV4.SRC', n: 4228, must: ['SHXLEN', 'EQU', '27+4'] },
  // ── B2DIR: travel direction, projection, sample, turn ───────────────────────
  { name: 'B2DIR keys on the FLYX sign', file: 'JOUSTRV4.SRC', n: 4104, must: ['B2DIR', 'LDA', 'PVELX,U', 'WHICH DIRECTION GOING?'] },
  { name: 'not moving ⇒ no look-ahead', file: 'JOUSTRV4.SRC', n: 4105, must: ['BEQ', 'B2DIRA'] },
  { name: 'moving right ⇒ the +B2XLEN branch', file: 'JOUSTRV4.SRC', n: 4106, must: ['BPL', 'B2DILR'] },
  { name: 'the projection loads PVELY', file: 'JOUSTRV4.SRC', n: 4108, must: ['LDD', 'PVELY,U', 'SEEKING DESTINATION CLIFF'] },
  { name: 'the sample line is offset by its high byte', file: 'JOUSTRV4.SRC', n: 4118, must: ['LEAY', 'A,Y'] },
  { name: 'the left sample is the BACKGROUND X map', file: 'JOUSTRV4.SRC', n: 4119, must: ['LDA', 'BCKXTB-B2XLEN,X'] },
  { name: 'ANDed with the BACKGROUND Y map', file: 'JOUSTRV4.SRC', n: 4120, must: ['ANDA', 'BCKYTB,Y'] },
  { name: 'open air ⇒ nothing happens', file: 'JOUSTRV4.SRC', n: 4121, must: ['BEQ', 'B2DIRA'] },
  { name: 'cliff to the LEFT ⇒ face RIGHT', file: 'JOUSTRV4.SRC', n: 4122, must: ['CLR', 'PFACE,U', 'FACE RIGHT'] },
  { name: 'the right sample mirrors it', file: 'JOUSTRV4.SRC', n: 4137, must: ['LDA', 'BCKXTB+B2XLEN,X'] },
  { name: 'cliff to the RIGHT ⇒ face LEFT', file: 'JOUSTRV4.SRC', n: 4141, must: ['STA', 'PFACE,U', 'FACE LEFT'] },
  // ── B2DICL: the slow-down install + the turn-wake flap ──────────────────────
  { name: 'the turn installs the SLOW episode', file: 'JOUSTRV4.SRC', n: 4142, must: ['B2DICL', 'LDD', '#B2AV', 'SLOW DOWN!!! GOING INTO A CLIFF'] },
  { name: 'for 8 wakes', file: 'JOUSTRV4.SRC', n: 4144, must: ['LDA', '#8'] },
  { name: 'and the turn wake FLAPS', file: 'JOUSTRV4.SRC', n: 4146, must: ['LDB', '#1'] },
  { name: 'B2AV: wings up, thrust on the NEW facing', file: 'JOUSTRV4.SRC', n: 4190, must: ['B2AV', 'CLRB'] },
  { name: 'B2AV re-decides when the hold expires', file: 'JOUSTRV4.SRC', n: 4193, must: ['JMP', 'B2UNDR'] },
  // ── B2DIRL: the hunter's $D3 lava gate on the episode exits ─────────────────
  { name: 'the episode exits ask BELOW CLIF5?', file: 'JOUSTRV4.SRC', n: 4097, must: ['B2DIRL', 'LDA', 'PPOSY+1,U', 'BELOW CLIF5?'] },
  { name: 'against $D3', file: 'JOUSTRV4.SRC', n: 4098, must: ['CMPA', '#$D3'] },
  { name: 'above it ⇒ B2DIR', file: 'JOUSTRV4.SRC', n: 4099, must: ['BLO', 'B2DIR'] },
  { name: 'below + falling ⇒ BOLAVA instead', file: 'JOUSTRV4.SRC', n: 4102, must: ['JMP', 'BOLAVA', 'STANDARD WAY TO AVOID THE LAVA'] },
  // ── SHDIR: the shadow's copy, with its OWN $D0 pre-check ────────────────────
  { name: 'SHDIR asks BELOW CLIF5? too', file: 'JOUSTRV4.SRC', n: 4330, must: ['SHDIR', 'LDA', 'PPOSY+1,U', 'BELOW CLIF5?'] },
  { name: 'but against $D0 — three scanlines earlier', file: 'JOUSTRV4.SRC', n: 4331, must: ['CMPA', '#$D0'] },
  { name: 'below + falling ⇒ BOLAVA, long branch', file: 'JOUSTRV4.SRC', n: 4334, must: ['LBPL', 'BOLAVA'] },
  { name: 'the shadow samples with SHXLEN (left)', file: 'JOUSTRV4.SRC', n: 4350, must: ['LDA', 'BCKXTB-SHXLEN,X'] },
  { name: 'the shadow samples with SHXLEN (right)', file: 'JOUSTRV4.SRC', n: 4368, must: ['LDA', 'BCKXTB+SHXLEN,X'] },
  { name: "the shadow's turn: FACE RIGHT", file: 'JOUSTRV4.SRC', n: 4353, must: ['CLR', 'PFACE,U', 'FACE RIGHT'] },
  { name: "the shadow's turn: FACE LEFT", file: 'JOUSTRV4.SRC', n: 4372, must: ['STA', 'PFACE,U', 'FACE LEFT'] },
  { name: 'SHDICL installs SHAV', file: 'JOUSTRV4.SRC', n: 4373, must: ['SHDICL', 'LDD', '#SHAV', 'SLOW DOWN!!! GOING INTO A CLIFF'] },
  { name: "the shadow's turn wake flaps too", file: 'JOUSTRV4.SRC', n: 4377, must: ['LDB', '#1'] },
  { name: 'SHAV mirrors B2AV', file: 'JOUSTRV4.SRC', n: 4406, must: ['SHAV', 'CLRB'] },
  // ── SHDN: the free-fall and its velX-gated escape ───────────────────────────
  { name: 'SHDN — the ROM’s own words: NO FLAPING WINGS', file: 'JOUSTRV4.SRC', n: 4246, must: ['SHDN', 'LDD', '#SHDN2', 'NO FLAPING WINGS'] },
  { name: 'wings up', file: 'JOUSTRV4.SRC', n: 4248, must: ['CLRB', 'WINGS UP'] },
  { name: 'the escape line is $D3, inclusive', file: 'JOUSTRV4.SRC', n: 4250, must: ['CMPA', '#$D3'] },
  { name: 'the escape gate reads PVELX (the comment says FALLING? — the CODE wins)', file: 'JOUSTRV4.SRC', n: 4252, must: ['LDA', 'PVELX,U', 'FALLING?'] },
  { name: 'negative X velocity skips the escape', file: 'JOUSTRV4.SRC', n: 4253, must: ['BMI', '3$'] },
  { name: 'otherwise FLAP — HOT LAVA BELOW', file: 'JOUSTRV4.SRC', n: 4254, must: ['INCB', 'FLAP YOUR WINGS!!!, HOT LAVA BELOW'] },
  // ── SHLEP: the player-line track ────────────────────────────────────────────
  { name: 'SHLEP enters level flight', file: 'JOUSTRV4.SRC', n: 4277, must: ['SHLEP', 'LDD', '#SHLEP1', 'LEVEL FLIGHT'] },
  { name: 'and STORES the player’s line', file: 'JOUSTRV4.SRC', n: 4279, must: ['LDB', 'PPOSY+1,X', 'PLAYERS LINE TO TRACK'] },
  { name: 'into PDIST+1', file: 'JOUSTRV4.SRC', n: 4280, must: ['STB', 'PDIST+1,U'] },
  { name: 'and the player’s velocity', file: 'JOUSTRV4.SRC', n: 4281, must: ['LDA', 'PVELX,X', 'PLAYERS VELOCITY'] },
  { name: 'into PPVELX — the throttle’s snapshot', file: 'JOUSTRV4.SRC', n: 4282, must: ['STA', 'PPVELX,U'] },
  { name: 'on the SHUPTM decision timer (uf1-9’s family)', file: 'JOUSTRV4.SRC', n: 4283, must: ['LDA', 'SHUPTM', 'TIME UNTIL NEXT DECISION'] },
  { name: 'SHLEP1’s lava ask', file: 'JOUSTRV4.SRC', n: 4289, must: ['CMPB', '#$D3', 'GETTING TOO CLOSE TO THE LAVA?'] },
  { name: 'SHLEP1’s gate reads PVELY — NOT PVELX (contrast :4252)', file: 'JOUSTRV4.SRC', n: 4291, must: ['LDA', 'PVELY,U', 'ALREADY GOING UP?'] },
  { name: 'the line comparison', file: 'JOUSTRV4.SRC', n: 4293, must: ['CMPB', 'PDIST+1,U', 'ABOVE TRACKING LINE'] },
  { name: 'at/above the line ⇒ wings up', file: 'JOUSTRV4.SRC', n: 4294, must: ['BLS', 'SHLEPA'] },
  // ── the routes that do NOT look ahead (the negatives' provenance) ──────────
  { name: 'SHLEP exits through the throttle to SHDIRA', file: 'JOUSTRV4.SRC', n: 4310, must: ['JMP', 'SHDIRA'] },
  { name: 'SHDIRB: the long-range seeks COAST while moving', file: 'JOUSTRV4.SRC', n: 4388, must: ['SHDIRB', 'LDA', 'PVELX,U'] },
  { name: 'SHDN exits through SHDIRB', file: 'JOUSTRV4.SRC', n: 4255, must: ['JMP', 'SHDIRB'] },
  // ── jt9-20: the coast reaches SHDIRB from ALL THREE moving seeks, and a
  //    PARKED seek falls THROUGH SHDIRB to the SHDIRA aim-writer ────────────────
  { name: 'SHUP0 (wings up) exits through SHDIRB too', file: 'JOUSTRV4.SRC', n: 4267, must: ['JMP', 'SHDIRB'] },
  { name: 'SHUP1 (flap wings) exits through SHDIRB', file: 'JOUSTRV4.SRC', n: 4275, must: ['JMP', 'SHDIRB'] },
  { name: 'SHDIRB coasts ONLY while moving — CLRA then STD CURJOY', file: 'JOUSTRV4.SRC', n: 4390, must: ['CLRA'] },
  { name: 'SHDIRB writes CURJOY (the coast, dir 0)', file: 'JOUSTRV4.SRC', n: 4391, must: ['STD', 'CURJOY'] },
  { name: 'a PARKED seek (PVELX==0) falls through SHDIRB to the SHDIRA aim-writer', file: 'JOUSTRV4.SRC', n: 4389, must: ['BEQ', 'SHDIRA'] },
  { name: 'SHDIRA aims: facing right ⇒ CURJOY dir +1', file: 'JOUSTRV4.SRC', n: 4384, must: ['LDA', '#1'] },
  { name: 'SHDIRA aims: facing left ⇒ SHDN1C writes −1', file: 'JOUSTRV4.SRC', n: 4394, must: ['SHDN1C', 'LDA', '#-1'] },
  { name: 'SHLEV re-arms and falls INTO SHDIR — the one shadow route that steers', file: 'JOUSTRV4.SRC', n: 4328, must: ['LDB', '#$01', 'FLAP WINGS'] },
  { name: 'SHLEVA jumps to SHDIR as well', file: 'JOUSTRV4.SRC', n: 4402, must: ['JMP', 'SHDIR'] },
  // ── the range gate SHDN/SHLEP hang off (fixture staging reads these rows) ──
  { name: 'SHUNDN gates on SHDNRG', file: 'JOUSTRV4.SRC', n: 4243, must: ['SHUNDN', 'SUBD', 'SHDNRG'] },
  { name: 'SHUNUP gates on SHUPRG', file: 'JOUSTRV4.SRC', n: 4257, must: ['SHUNUP', 'CMPD', 'SHUPRG'] },
  // ── the landing pair, for contrast: what the look-ahead does NOT read ──────
  { name: 'CKGND reads the LANDING X map', file: 'JOUSTRV4.SRC', n: 6705, must: ['LDA', 'LNDXTB,X'] },
  { name: 'CKGND ANDs the LANDING Y map', file: 'JOUSTRV4.SRC', n: 6706, must: ['ANDA', 'LNDYTB,Y'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// THE LAWS RE-DERIVE FROM THE VENDORED SOURCE (byte-gated, skips on CI).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the steering laws are really in the 1982 source', () => {
  it.each(LAWS)('$file:$n carries "$name"', ({ file, n, must }) => {
    const text = line(file, n)
    for (const token of must) {
      expect(text, `${file}:${n} must carry ${JSON.stringify(token)} — got: ${JSON.stringify(text)}`).toContain(
        token,
      )
    }
  })

  it('B2DIR’s PFACE writes are the two turns plus the PBUMPX bump — nothing else (:4104-4159)', () => {
    // The complete write set (the jt8-6 lesson: enumerate, don't count). :4122
    // and :4141 are this story's aiming writes; :4150 is `B2DIRA`'s bump-facing
    // (`LDA PBUMPX,U / BEQ B2FDIR / STA PFACE,U`), the collision-face mechanism
    // this port does not model — recorded as a Delivery Finding, not scope.
    const writes = sourceLines('JOUSTRV4.SRC')
      .slice(4103, 4159) // :4104-4159
      .map((l, i) => ({ l, n: 4104 + i }))
      .filter(({ l }) => /^\s*(CLR|COM|STA|STB|STD)\s+PFACE/.test(l))
    expect(writes.map((w) => w.n)).toEqual([4122, 4141, 4150])
    expect(line('JOUSTRV4.SRC', 4148), 'and :4150’s write is the PBUMPX path').toContain('PBUMPX,U')
  })

  it('SHDIR’s write set mirrors it (:4330-4387): two turns plus SHDIRA’s bump', () => {
    const writes = sourceLines('JOUSTRV4.SRC')
      .slice(4329, 4387) // :4330-4387
      .map((l, i) => ({ l, n: 4330 + i }))
      .filter(({ l }) => /^\s*(CLR|COM|STA|STB|STD)\s+PFACE/.test(l))
    expect(writes.map((w) => w.n)).toEqual([4353, 4372, 4381])
    expect(line('JOUSTRV4.SRC', 4379), ':4381’s write is the PBUMPX path').toContain('PBUMPX,U')
  })

  it('the SHLEPB → SHDIRA block consults NO background mask — a hunting shadow never looks ahead', () => {
    // The provenance for steering.test.ts's negative. The throttle block's own
    // shape is already pinned by homing-source; what THIS test adds is that the
    // whole SHLEP exit path (:4286-4310) reaches SHDIRA without one BCKXTB read.
    const block = sourceLines('JOUSTRV4.SRC').slice(4285, 4310).join('\n') // :4286-4310
    expect(block).toMatch(/SHLEPB[\s\S]*JMP\s+SHDIRA/)
    expect(block, 'no mask sample anywhere on the SHLEP exit').not.toContain('BCKXTB')
  })

  it('the :4252 PVELX read is IDENTICAL in all four vendored revisions — shipped behaviour, not a slip', () => {
    // The SM handed this over as a claim to verify: the SHDN escape gate reads
    // the X velocity under a comment that says "FALLING?". Both shipped label
    // families carry the same instruction, so the port follows the CODE and the
    // claims entry must record the comment as wrong (the jt8-6 precedent:
    // pin the machine, not the prose — even the ROM's own prose).
    const at: ReadonlyArray<{ file: string; n: number }> = [
      { file: 'JOUSTRV1.SRC', n: 4178 },
      { file: 'JOUSTRV2.SRC', n: 4213 },
      { file: 'JOUSTRV3.SRC', n: 4230 },
      { file: 'JOUSTRV4.SRC', n: 4252 },
    ]
    for (const { file, n } of at) {
      expect(line(file, n), `${file}:${n}`).toMatch(/LDA\s+PVELX,U\s+FALLING\?/)
    }
  })

  it('PPVELX is written at exactly THREE brain sites — :3908 (BOLEV), :4059 (B2LEV), :4282 (SHLEP)', () => {
    // The complete write set across the smart-brain region. jt8-2's HomingState
    // doc claimed "written in exactly one place — BOLEV" — a false universal
    // (true of the BOUNDER brain alone); jt8-3's GREEN reworded it to the three
    // enumerated sites. This enumeration is the evidence that rewording holds.
    const writes = sourceLines('JOUSTRV4.SRC')
      .slice(3786, 4320) // :3787-4320, the three smart brains
      .map((l, i) => ({ l, n: 3787 + i }))
      .filter(({ l }) => /^\s*STA\s+PPVELX,U/.test(l))
    expect(writes.map((w) => w.n)).toEqual([3908, 4059, 4282])
  })

  it('the look-ahead reads the BACKGROUND pair while CKGND reads the LANDING pair — two different maps', () => {
    // The story description says "our arena.groundMaskAt is that BCKXTB/BCKYTB
    // analog". It is not: groundMaskAt is the CKGND (LNDXTB/LNDYTB) analog by
    // its own docstring, and the BCK pair is transcribed separately
    // (BCK_X_TABLE flight.ts:176 ← :7617+, BCK_Y_TABLE arena.ts:198 ← :7549+).
    // Deviated in the session file; the fixtures sit where the pairs disagree.
    expect(line('JOUSTRV4.SRC', 4119)).toContain('BCKXTB')
    expect(line('JOUSTRV4.SRC', 6705)).toContain('LNDXTB')
    expect(line('JOUSTRV4.SRC', 6705), 'CKGND does not read the background map').not.toContain('BCKXTB')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EVERY CITED RANGE IS PINNED BY A COMMITTED CLAIM (runs everywhere).
// RED until Dev commits the JT83-* steering claims.
// ─────────────────────────────────────────────────────────────────────────────
const CITED_RANGES: ReadonlyArray<{ law: string; file: string; start: number; end: number }> = [
  { law: 'B2XLEN — the 31 px look-ahead', file: 'JOUSTRV4.SRC', start: 3969, end: 3969 },
  { law: 'SHXLEN — the shadow’s copy', file: 'JOUSTRV4.SRC', start: 4228, end: 4228 },
  { law: 'B2DIRL — the hunter’s $D3 gate', file: 'JOUSTRV4.SRC', start: 4097, end: 4102 },
  { law: 'B2DIR — the hunter look-ahead', file: 'JOUSTRV4.SRC', start: 4104, end: 4141 },
  { law: 'the PVELY×8 sample projection', file: 'JOUSTRV4.SRC', start: 4108, end: 4118 },
  { law: 'B2DICL — turn, slow install, flap', file: 'JOUSTRV4.SRC', start: 4142, end: 4146 },
  { law: 'B2AV — the slow episode body', file: 'JOUSTRV4.SRC', start: 4190, end: 4193 },
  { law: 'SHDN — free-fall + the velX-gated escape', file: 'JOUSTRV4.SRC', start: 4246, end: 4255 },
  { law: 'SHLEP — store the line and the velocity', file: 'JOUSTRV4.SRC', start: 4277, end: 4284 },
  { law: 'SHLEP1 — the tracking law', file: 'JOUSTRV4.SRC', start: 4286, end: 4298 },
  { law: 'SHLEV — the one steering route', file: 'JOUSTRV4.SRC', start: 4326, end: 4330 },
  { law: 'SHDIR — the $D0 pre-check', file: 'JOUSTRV4.SRC', start: 4330, end: 4334 },
  { law: 'SHDIR — the shadow look-ahead', file: 'JOUSTRV4.SRC', start: 4350, end: 4372 },
  { law: 'SHDICL/SHAV — the shadow’s slow', file: 'JOUSTRV4.SRC', start: 4373, end: 4377 },
  { law: 'SHDIRB — the seeks coast (filed finding)', file: 'JOUSTRV4.SRC', start: 4388, end: 4392 },
]

describe('each steering law is pinned by a claims/*.json entry', () => {
  it.each(CITED_RANGES)('$law ($file:$start-$end) is covered by a claim', ({ file, start, end }) => {
    expect(
      claimCovers(loadClaims(), file, start, end),
      `no committed claim pins ${file}:${start}-${end} — jt8-3 requires each steering law to be cited`,
    ).toBe(true)
  })

  it('jt8-3 added its own steering claims (JT83-*)', () => {
    const jt83 = loadClaims().filter((c) => /^JT83-\d+$/.test(c.id ?? ''))
    expect(jt83.length, 'the new transcription claims are committed').toBeGreaterThan(0)
  })

  it('a claim OWNS the :4252 comment/code mismatch — PVELX read, comment wrong, consistent across revisions', () => {
    // The one place in this story where the ROM's own prose lies about its
    // code. A claims entry that quoted the line without saying so would launder
    // the comment's misreading into the record.
    const owns = loadClaims().filter(
      (c) =>
        /^JT83-\d+$/.test(c.id ?? '') &&
        /PVELX/.test(c.claim ?? '') &&
        /FALLING/i.test(c.claim ?? '') &&
        /comment/i.test(c.claim ?? '') &&
        (c.source?.line ?? 0) >= 4249 &&
        (c.source?.line ?? 0) <= 4254,
    )
    expect(
      owns.length,
      'a JT83-* claim anchored on the SHDN escape must state the code reads PVELX and the FALLING? comment is wrong',
    ).toBeGreaterThan(0)
  })

  it('a claim states B2XLEN’s value as the ROM writes it — 27+4, DECIMAL radix, = 31', () => {
    const stated = loadClaims().filter(
      (c) =>
        /^JT83-\d+$/.test(c.id ?? '') &&
        /27\s*\+\s*4/.test(c.claim ?? '') &&
        /\b31\b/.test(c.claim ?? '') &&
        c.source?.line === 3969,
    )
    expect(stated.length, 'the equate’s own arithmetic, anchored on :3969').toBeGreaterThan(0)
  })

  it('a claim owns the projection as DERIVED — the high byte of PVELY×8, not a transcribed constant', () => {
    const derived = loadClaims().filter(
      (c) =>
        /^JT83-\d+$/.test(c.id ?? '') &&
        /derive/i.test(c.claim ?? '') &&
        /(high byte|>>\s*8|×\s*8|x\s*8|\*\s*8|<<\s*3)/i.test(c.claim ?? '') &&
        (c.source?.line ?? 0) >= 4108 &&
        (c.source?.line ?? 0) <= 4118,
    )
    expect(
      derived.length,
      'a JT83-* claim must own the (PVELY×8)>>8 sample offset as derived from the ASLB/ROLA×3 + LEAY chain',
    ).toBeGreaterThan(0)
  })

  it('a claim distinguishes the $D0 shadow gate from the $D3 hunter gate', () => {
    const both = loadClaims().filter(
      (c) =>
        /^JT83-\d+$/.test(c.id ?? '') &&
        /\$D0/.test(c.claim ?? '') &&
        /\$D3/.test(c.claim ?? '') &&
        ((c.source?.line ?? 0) >= 4330 && (c.source?.line ?? 0) <= 4334),
    )
    expect(both.length, 'the two lava thresholds must be stated TOGETHER so nobody conflates them').toBeGreaterThan(0)
  })

  it('every claim id is still unique across the whole registry', () => {
    const ids = loadClaims().map((c) => c.id)
    const dupes = [...new Set(ids.filter((id, i) => id !== undefined && ids.indexOf(id) !== i))]
    expect(dupes, 'duplicate claim ids').toEqual([])
  })
})
