// tests/homing-source.test.ts
//
// Story jt8-2 — RED phase (Leeloo / TEA). The PROVENANCE companion to
// tests/homing.test.ts. The behaviour suite encodes the horizontal-homing laws;
// this file proves those laws are REAL in the vendored 1982 source and that each
// cited range is pinned by a committed claim — the jt1-10/jt2-1/jt8-1
// double-entry pattern.
//
// The vendored tree is gitignored, so the byte-reads SKIP on CI (the jt1-3
// degradation pattern); the claim-coverage checks read the committed claims/ and
// run everywhere.
//
// RED today (ROUND 2): the vendored-line block gains the SEEKFS → MOUNTM chain
// that says a MOUNTED bird enters its brain at PRDIR = 1, and the claim-coverage
// block gains a gate demanding a JT82-* claim that STATES it and anchors on
// :3584-3585. Both are what round 1 was missing: the seed was assumed to be the
// riderless bird's 0, cited :3255, and the shipped feature was therefore inert.
// The vendored-line reads themselves pass wherever the source is present — they
// are the independent second entry, not a red signal.
//
// ─── THE tp1-8 COLLECTION TRAP ───────────────────────────────────────────────
// `describe.skipIf` still executes the describe callback BODY at collection, so
// every vendored read below happens INSIDE an `it()`.

import { describe, it, expect } from 'vitest'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'
// jt8-3 extracted the hardened claims loader (the round-2 [LOW][SEC]/[RULE]
// `asClaim` variant this file introduced) to the shared helper — the jt8-2
// review's own "extract at 3×" instruction. Behaviour-preserving.
import { loadClaims, claimCovers } from './helpers/claims.js'

/** The one authoritative line of the vendored source. */
const line = (file: string, n: number): string => sourceLines(file)[n - 1] ?? ''

// Each law jt8-2 codes to, mapped to the vendored line that carries it and the
// substrings that MUST be there. If the ROM ever changes under us, this block
// fails before any implementation test can pass on a lie.
const LAWS: ReadonlyArray<{ name: string; file: string; n: number; must: readonly string[] }> = [
  // ── BODIR: the horizontal decision IS the facing ────────────────────────────
  { name: 'BODIR reads PFACE', file: 'JOUSTRV4.SRC', n: 3876, must: ['BODIR', 'LDA', 'PFACE,U'] },
  { name: 'a negative facing branches away', file: 'JOUSTRV4.SRC', n: 3877, must: ['BMI', 'BODN1C'] },
  { name: 'facing >= 0 ⇒ dir +1', file: 'JOUSTRV4.SRC', n: 3878, must: ['LDA', '#1'] },
  { name: 'the +1 is stored as the joystick', file: 'JOUSTRV4.SRC', n: 3879, must: ['STD', 'CURJOY'] },
  { name: 'facing < 0 ⇒ dir −1', file: 'JOUSTRV4.SRC', n: 3882, must: ['BODN1C', 'LDA', '#-1'] },
  { name: 'the −1 is stored as the joystick', file: 'JOUSTRV4.SRC', n: 3883, must: ['STD', 'CURJOY'] },
  // ── BOLEV: the target's velocity is SNAPSHOTTED on the level-flight decision ─
  { name: 'entering level flight', file: 'JOUSTRV4.SRC', n: 3903, must: ['BOLEV', 'LEVEL FLIGHT'] },
  { name: 'read the TARGET’s X velocity (,X)', file: 'JOUSTRV4.SRC', n: 3907, must: ['LDA', 'PVELX,X', 'PLAYERS VELOCITY'] },
  { name: 'stash it in the enemy’s workspace (,U)', file: 'JOUSTRV4.SRC', n: 3908, must: ['STA', 'PPVELX,U'] },
  { name: 'the decision timer is BOLETM (uf1-9’s row)', file: 'JOUSTRV4.SRC', n: 3909, must: ['LDA', 'BOLETM', 'TIME UNTIL NEXT DECISION'] },
  // ── BOLEVB: the throttle, the counter, the flip ─────────────────────────────
  { name: 'the throttle’s own words', file: 'JOUSTRV4.SRC', n: 3939, must: ['BOLEVB', 'LDA', 'PPVELX,U', 'DO NOT COPY PLAYERS MOVES TOO OFTEN'] },
  { name: 'compared against the ENEMY’s own velocity (,U)', file: 'JOUSTRV4.SRC', n: 3940, must: ['CMPA', 'PVELX,U'] },
  { name: 'a MISMATCH skips the counter entirely', file: 'JOUSTRV4.SRC', n: 3941, must: ['BNE', 'BODIR3'] },
  { name: 'a match DECREMENTS the reverse counter', file: 'JOUSTRV4.SRC', n: 3942, must: ['DEC', 'PRDIR,U'] },
  { name: 'still negative ⇒ no flip', file: 'JOUSTRV4.SRC', n: 3943, must: ['BMI', 'BODIR3'] },
  { name: 'the flip CLEARS the counter', file: 'JOUSTRV4.SRC', n: 3944, must: ['CLR', 'PRDIR,U'] },
  { name: 'the flip is a COMplement of the facing', file: 'JOUSTRV4.SRC', n: 3945, must: ['COM', 'PFACE,U', 'TRY THE OTHER DIRECTION'] },
  { name: 'and control falls into BODIR the SAME wake', file: 'JOUSTRV4.SRC', n: 3946, must: ['BODIR3', 'JMP', 'BODIR'] },
  // ── the same idiom in the other two smart brains ────────────────────────────
  { name: 'the hunter carries the identical throttle', file: 'JOUSTRV4.SRC', n: 4087, must: ['B2LE11', 'LDA', 'PPVELX,U', 'DO NOT COPY PLAYERS MOVES TOO OFTEN'] },
  { name: 'the hunter’s flip', file: 'JOUSTRV4.SRC', n: 4093, must: ['COM', 'PFACE,U', 'TRY THE OTHER DIRECTION'] },
  { name: 'the shadow lord carries it too', file: 'JOUSTRV4.SRC', n: 4303, must: ['SHLEPB', 'LDA', 'PPVELX,U', 'DO NOT COPY PLAYERS MOVES TOO OFTEN'] },
  { name: 'the shadow lord’s flip', file: 'JOUSTRV4.SRC', n: 4309, must: ['COM', 'PFACE,U', 'TRY THE OTHER DIRECTION'] },
  // ── the RIDERLESS seeker is born at ZERO — and it is not a smart enemy ──────
  { name: 'PRDIR is cleared when the RIDERLESS bird is created', file: 'JOUSTRV4.SRC', n: 3255, must: ['CLR', 'PRDIR,Y'] },
  { name: 'that bird runs SEEKE, not a smart brain', file: 'JOUSTRV4.SRC', n: 3268, must: ['LDD', '#SEEKE', 'FETCH THE LITTLE MAN'] },
  // ── ROUND 2: the counter a MOUNTED bird is born with (SEEKFS → MOUNTM) ──────
  { name: 'SEEKFS loads 1', file: 'JOUSTRV4.SRC', n: 3584, must: ['SEEKFS', 'LDA', '#1'] },
  { name: 'and stores it as the short-range flag', file: 'JOUSTRV4.SRC', n: 3585, must: ['STA', 'PRDIR,U', 'THE BIRD CAME WITHIN SHORT RANGE SENSORS'] },
  { name: 'the mount branch lives inside that block', file: 'JOUSTRV4.SRC', n: 3592, must: ['BEQ', 'MOUNTM', 'GOT THE MAN'] },
  { name: 'MOUNTM is where a bird acquires its rider', file: 'JOUSTRV4.SRC', n: 3654, must: ['MOUNTM', 'PULS'] },
  { name: 'and the mount installs the SMART brain', file: 'JOUSTRV4.SRC', n: 3693, must: ['LDD', 'DSMART,X', 'SELECT PROPER JOYSTICK ROUTINE'] },
  { name: 'writing it as the enemy’s decision routine', file: 'JOUSTRV4.SRC', n: 3694, must: ['STD', 'PJOY,U'] },
  // ── the OTHER promotion path, and what it does NOT write ────────────────────
  { name: 'LNTSMT promotes a dumb LINET enemy', file: 'JOUSTRV4.SRC', n: 3764, must: ['LNTSMT', 'INC', 'NSMART', 'JUST GOT SMARTER'] },
  { name: 'it installs the smart brain too', file: 'JOUSTRV4.SRC', n: 3774, must: ['STX', 'PJOY,U', 'NEW SMARTS'] },
  { name: 'a transporter enemy starts on the DUMB routine', file: 'JOUSTRV4.SRC', n: 5808, must: ['LDD', 'DJOY,X', 'SELECT PROPER JOYSTICK ROUTINE'] },
  { name: 'DJOY is the dumb line-tracker', file: 'JOUSTRV4.SRC', n: 104, must: ['DJOY', 'RMB', 'DUMB LINE TRACKING ENEMY'] },
  { name: 'WCREATE clears PCHASE — and only PCHASE', file: 'JOUSTRV4.SRC', n: 2201, must: ['CLR', 'PCHASE,Y', 'NOT CHASING THE PLAYER'] },
  // ── process creation does not clear the recycled workspace ──────────────────
  { name: 'CUPROC is the process factory', file: 'SYSTEM.SRC', n: 387, must: ['CUPROC', 'PSHS'] },
  { name: 'it writes the nap', file: 'SYSTEM.SRC', n: 399, must: ['STA', 'PNAP,Y'] },
  { name: 'the PC', file: 'SYSTEM.SRC', n: 400, must: ['STX', 'PPC,Y', 'NEW - PC LOCATION'] },
  { name: 'the id', file: 'SYSTEM.SRC', n: 402, must: ['STA', 'PID,Y', 'NEW - PROCESS I.D.'] },
  { name: 'the priority — and then returns', file: 'SYSTEM.SRC', n: 404, must: ['RTS'] },
  // ── the FLYX index the comparison is made on ────────────────────────────────
  { name: 'MAXVX bounds the FLYX index at 8', file: 'JOUSTRV4.SRC', n: 40, must: ['MAXVX', 'EQU', '8', 'MAXIMUM X +- VELOCITY'] },
  { name: 'the joystick direction steps the FLYX index', file: 'JOUSTRV4.SRC', n: 6439, must: ['ADDA', 'PVELX,U', 'TABLE VELOCITY-X SPEED'] },
  // ── RAM declarations: the two homing bytes + the fields they compare ────────
  { name: 'PFACE is a facing flag, 0 = right', file: 'RAMDEF.SRC', n: 186, must: ['PFACE', 'RMB', '0=RIGHT FACED'] },
  { name: 'PVELX is a table LOOK-UP index, not a velocity', file: 'RAMDEF.SRC', n: 190, must: ['PVELX', 'RMB', 'TABLE LOOK-UP FLYING VELOCITY-X'] },
  { name: 'PRDIR is the REVERSE DIRECTION COUNTER', file: 'RAMDEF.SRC', n: 208, must: ['PRDIR', 'RMB', 'REVERSE DIRECTION COUNTER'] },
  { name: 'PPVELX is the OLD PLAYERS X VELOCITY', file: 'RAMDEF.SRC', n: 209, must: ['PPVELX', 'RMB', 'OLD PLAYERS X VELOCITY'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// THE LAWS RE-DERIVE FROM THE VENDORED SOURCE (byte-gated, skips on CI).
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('the homing laws are really in the 1982 source', () => {
  it.each(LAWS)('$file:$n carries "$name"', ({ file, n, must }) => {
    const text = line(file, n)
    for (const token of must) {
      expect(text, `${file}:${n} must carry ${JSON.stringify(token)} — got: ${JSON.stringify(text)}`).toContain(
        token,
      )
    }
  })

  it('the throttle compares the SNAPSHOT against the ENEMY’s own velocity — ,U not ,X', () => {
    // THE MISREADING THIS KILLS: "PFACE is nudged toward the target by copying the
    // player's X-velocity direction". `CMPA PVELX,U` is the ENEMY's index (U = self);
    // the player pointer X is not even guaranteed live at BOLEVB — the :3915 `BLO 3$`
    // path reaches here without having called SELPLY at all, which is exactly WHY the
    // value was snapshotted into PPVELX,U in the first place.
    const block = sourceLines('JOUSTRV4.SRC').slice(3938, 3941).join('\n') // 3939-3941
    expect(block).toMatch(/LDA\s+PPVELX,U[\s\S]*CMPA\s+PVELX,U[\s\S]*BNE/)
    expect(block, 'the comparison operand is NOT the player pointer').not.toMatch(/CMPA\s+PVELX,X/)
  })

  it('the mismatch branch jumps CLEAR of the DEC — an unmatched wake never ticks', () => {
    // `BNE BODIR3` targets :3946, PAST the DEC/BMI/CLR/COM block. If the branch
    // landed on the DEC instead, the counter would tick every wake and the flip
    // would be a plain 129-frame metronome independent of the player.
    const block = sourceLines('JOUSTRV4.SRC').slice(3940, 3946).join('\n') // 3941-3946
    expect(block).toMatch(/BNE\s+BODIR3[\s\S]*DEC\s+PRDIR,U[\s\S]*BMI\s+BODIR3[\s\S]*CLR\s+PRDIR,U[\s\S]*COM\s+PFACE,U/)
    expect(block, 'BODIR3 is the label AFTER the flip block').toMatch(/COM\s+PFACE,U[\s\S]*BODIR3/)
  })

  it('the flip precedes BODIR — the new facing is read the SAME wake', () => {
    // `COM PFACE,U` (:3945) then `BODIR3 JMP BODIR` (:3946), and BODIR's first
    // instruction is `LDA PFACE,U` (:3876). Nothing reads the OLD facing after
    // the complement, so a port that flips after computing dir is one wake late.
    const flipBlock = sourceLines('JOUSTRV4.SRC').slice(3944, 3946).join('\n') // 3945-3946
    expect(flipBlock).toMatch(/COM\s+PFACE,U[\s\S]*JMP\s+BODIR/)
    expect(line('JOUSTRV4.SRC', 3876)).toMatch(/BODIR\s+LDA\s+PFACE,U/)
  })

  it('the counter is 8-bit: PRDIR is ONE byte of RAM', () => {
    // The whole 129-wake cadence hangs on this. `RMB 1`, not `RMB 2`.
    expect(line('RAMDEF.SRC', 208)).toMatch(/PRDIR\s+RMB\s+1\b/)
    expect(line('RAMDEF.SRC', 209)).toMatch(/PPVELX\s+RMB\s+1\b/)
  })

  it('PVELX is one byte too — so LDA/CMPA compare the WHOLE index, not a high half', () => {
    // If PVELX were a 16-bit velocity, `LDA PVELX,U` would read only its high
    // byte and the comparison would be a coarse-speed test rather than an exact
    // FLYX-rung match. `RMB 1` settles it: the index IS the byte.
    expect(line('RAMDEF.SRC', 190)).toMatch(/PVELX\s+RMB\s+1\b/)
  })

  it('the plain bounder has NO toward-the-target horizontal term', () => {
    // The negative claim, and the reason this story's prose is deviated from.
    // Across the whole BOUNDR brain (:3787-3946) the ONLY write to PFACE is the
    // COM at :3945. Steering that aims at the player (`CLR PFACE,U  FACE RIGHT` /
    // `STA PFACE,U  FACE LEFT`) appears first at :4122/:4141 — inside B2DIR, the
    // HUNTER's cliff look-ahead, which the design spec assigns to jt8-3.
    const brain = sourceLines('JOUSTRV4.SRC').slice(3786, 3946) // 3787-3946
    const writes = brain
      .map((l, i) => ({ l, n: 3787 + i }))
      .filter(({ l }) => /^\s*(CLR|COM|STA|STB|STD)\s+PFACE/.test(l))
    expect(
      writes.map((w) => w.n),
      'the bounder brain writes PFACE exactly once, at the COM',
    ).toEqual([3945])
    // …and the aiming writes really do live in the hunter's block, not here.
    expect(line('JOUSTRV4.SRC', 4122)).toMatch(/CLR\s+PFACE,U\s+FACE RIGHT/)
  })

  // ───────────────────────────────────────────────────────────────────────────
  // ROUND 2 — the chain that says a MOUNTED enemy is born at PRDIR = 1.
  //
  // This is the one load-bearing INFERENCE in the story, so it is proven
  // mechanically rather than asserted in prose. Three separate facts, each with
  // its own test so a failure names which link broke.
  // ───────────────────────────────────────────────────────────────────────────

  it('MOUNTM is branched to from exactly ONE place in the whole source', () => {
    // If any other route reached MOUNTM, a bird could acquire a rider without
    // passing through SEEKFS and the "mounted ⇒ 1" seed would be a guess.
    const src = sourceLines('JOUSTRV4.SRC')
    const refs = src
      .map((l, i) => ({ l, n: i + 1 }))
      // the label's own definition is `MOUNTM<tab>PULS ...`; every other mention
      // is a branch/jump operand.
      .filter(({ l }) => /\bMOUNTM\b/.test(l))
    expect(
      refs.map((r) => r.n),
      'MOUNTM: one branch (:3592) and one label (:3654), nothing else',
    ).toEqual([3592, 3654])
    expect(src[3653], 'and :3654 is the label, not another branch').toMatch(/^MOUNTM\b/)
  })

  it('that branch sits in SEEKFS’s straight-line run — no label can jump past the LDA #1', () => {
    // `SEEKFS LDA #1 / STA PRDIR,U` (:3584-3585) then six unlabelled lines to
    // `BEQ MOUNTM` (:3592). No intervening label means no way in that skips the
    // store, so reaching the branch implies PRDIR was just set to 1.
    const src = sourceLines('JOUSTRV4.SRC')
    expect(src[3583], 'the block starts at SEEKFS').toMatch(/^SEEKFS\s+LDA\s+#1/)
    const between = src.slice(3585, 3591).map((l, i) => ({ l, n: 3586 + i })) // :3586-3591
    const labels = between.filter(({ l }) => /^[A-Za-z0-9$]/.test(l) && !l.startsWith('*'))
    expect(
      labels.map((x) => x.n),
      'a label here would be an entry point that bypasses STA PRDIR,U',
    ).toEqual([])
    expect(src[3591], 'and the run ends at the mount branch').toMatch(/BEQ\s+MOUNTM/)
  })

  it('nothing between the store and the DSMART install writes PRDIR again', () => {
    // :3585 sets it; :3693-3694 installs the smart brain. If anything in between
    // cleared or re-wrote PRDIR the value would not survive into the brain.
    const src = sourceLines('JOUSTRV4.SRC')
    const writes = src
      .slice(3585, 3694) // :3586-3694
      .map((l, i) => ({ l, n: 3586 + i }))
      .filter(({ l }) => /^\s*(CLR|COM|INC|DEC|STA|STB|STD|STX|STY)\s+PRDIR/.test(l))
    expect(writes.map((w) => w.n), 'PRDIR survives the mount untouched').toEqual([])
  })

  it('the OTHER promotion path (LINET → smart) never writes PRDIR either', () => {
    // `LNTSMT` :3764-3775 promotes a transporter-entered enemy. It bumps NSMART
    // and PCHASE and swaps PJOY — and leaves PRDIR alone. Combined with the
    // CUPROC test below, that is why the ROM leaves the transporter path's PRDIR
    // UNDEFINED and why this port unifies on the one defined mounted value
    // instead of inventing a second (Design Deviation, session file).
    const block = sourceLines('JOUSTRV4.SRC').slice(3763, 3775) // :3764-3775
    expect(block.join('\n'), 'the promotion really is here').toMatch(/LNTSMT[\s\S]*STX\s+PJOY,U/)
    expect(block.filter((l) => /PRDIR/.test(l)), 'LNTSMT touches PRDIR nowhere').toEqual([])
  })

  it('process creation does NOT clear the recycled workspace', () => {
    // `CUPROC` (SYSTEM.SRC:387-404) writes PLINK, PNAP, PPC, PID and PPRI and
    // nothing else — no CLR, no clearing loop. So a newly created process
    // inherits its predecessor's bytes, which is exactly why the ROM clears the
    // fields it cares about ONE AT A TIME at each creation site (`CLR PCHASE,Y`
    // :2201, `CLR PRDIR,Y` :3255) and why "the transporter enemy starts at 0" is
    // not a fact the source supports.
    const initialises = (block: readonly string[]): string[] => {
      const fields = block
        .map((l) => l.match(/^\s*(?:ST[ABDXY]|CLR)\s+(P[A-Z]+)[,+]/))
        .filter((m): m is RegExpMatchArray => m !== null)
        .map((m) => m[1])
      return [...new Set(fields)].sort()
    }
    const block = sourceLines('SYSTEM.SRC').slice(386, 404) // :387-404
    expect(block.join('\n'), 'the factory is here').toMatch(/CUPROC[\s\S]*STB\s+PPRI,Y[\s\S]*RTS/)
    expect(initialises(block), 'the WHOLE set of fields creation touches — no brain state').toEqual(
      ['PLINK', 'PNAP', 'PPC', 'PID', 'PPRI'].sort(),
    )
    // The discriminator: the SAME scan over the egg-hatch block, which really
    // does initialise a bird's brain state one field at a time. If the scan were
    // blind to `CLR PRDIR,Y`-shaped writes both sets would come back the same and
    // the assertion above would be proving nothing.
    expect(
      initialises(sourceLines('JOUSTRV4.SRC').slice(3252, 3263)), // :3253-3263
      'the hatch site DOES clear brain state, so the scan can see such writes',
    ).toEqual(expect.arrayContaining(['PRDIR', 'PCHASE', 'PFACE']))
  })

  it('the three smart brains carry the SAME throttle block, byte-for-byte in shape', () => {
    // bounder :3939-3945, hunter :4087-4093, shadow :4303-4309. Pinning all three
    // is what stops a port implementing homing for `boundr` alone.
    // `L?B` because the shadow lord's copy uses the LONG branches `LBNE`/`LBMI`
    // (:4305,:4307) where the other two use short ones — same law, further jump.
    const shape = /LDA\s+PPVELX,U[\s\S]*CMPA\s+PVELX,U[\s\S]*\bL?BNE\b[\s\S]*DEC\s+PRDIR,U[\s\S]*\bL?BMI\b[\s\S]*CLR\s+PRDIR,U[\s\S]*COM\s+PFACE,U/
    for (const start of [3939, 4087, 4303]) {
      const block = sourceLines('JOUSTRV4.SRC').slice(start - 1, start + 6).join('\n')
      expect(block, `the throttle block at :${start}`).toMatch(shape)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// EVERY CITED RANGE IS PINNED BY A COMMITTED CLAIM (runs everywhere).
// RED until Dev commits the JT82-* homing claims.
// ─────────────────────────────────────────────────────────────────────────────
const CITED_RANGES: ReadonlyArray<{ law: string; file: string; start: number; end: number }> = [
  { law: 'BODIR — dir follows facing', file: 'JOUSTRV4.SRC', start: 3876, end: 3884 },
  { law: 'BOLEV — snapshot the target’s FLYX index', file: 'JOUSTRV4.SRC', start: 3903, end: 3910 },
  { law: 'BOLEVB — the throttle, counter and flip', file: 'JOUSTRV4.SRC', start: 3939, end: 3946 },
  { law: 'B2LE11 — the hunter’s throttle', file: 'JOUSTRV4.SRC', start: 4087, end: 4094 },
  { law: 'SHLEPB — the shadow lord’s throttle', file: 'JOUSTRV4.SRC', start: 4303, end: 4310 },
  { law: 'the RIDERLESS seeker’s PRDIR is cleared on creation', file: 'JOUSTRV4.SRC', start: 3255, end: 3255 },
  // Split deliberately. As ONE 3584-3585 range a single claim on the STORE satisfied
  // it while the line that STATES the value stayed uncited — and the value is the whole
  // story. Round-2 review [MEDIUM]: mutation-proven, deleting the :3584 claim reddened
  // nothing under the merged range. Each line now needs its own.
  { law: 'SEEKFS — the value 1 itself (LDA #1)', file: 'JOUSTRV4.SRC', start: 3584, end: 3584 },
  { law: 'SEEKFS — the store into PRDIR', file: 'JOUSTRV4.SRC', start: 3585, end: 3585 },
  { law: 'MOUNTM — mounting is reachable only from inside SEEKFS', file: 'JOUSTRV4.SRC', start: 3592, end: 3592 },
  { law: 'MOUNRI — the mount installs the smart brain', file: 'JOUSTRV4.SRC', start: 3693, end: 3694 },
  { law: 'LNTSMT — the promotion that never writes PRDIR', file: 'JOUSTRV4.SRC', start: 3764, end: 3775 },
  { law: 'CUPROC — creation leaves the recycled workspace uncleared', file: 'SYSTEM.SRC', start: 387, end: 404 },
  { law: 'MAXVX — the FLYX index bound', file: 'JOUSTRV4.SRC', start: 40, end: 40 },
  { law: 'PFACE/PVELX RAM decls', file: 'RAMDEF.SRC', start: 186, end: 190 },
  { law: 'PRDIR/PPVELX RAM decls', file: 'RAMDEF.SRC', start: 208, end: 209 },
]

describe('each homing law is pinned by a claims/*.json entry', () => {
  it('loads a non-empty claims set (the guard must have teeth)', () => {
    expect(loadClaims().length, 'docs/rom-study/claims/*.json must exist').toBeGreaterThan(0)
  })

  it.each(CITED_RANGES)('$law ($file:$start-$end) is covered by a claim', ({ file, start, end }) => {
    const claims = loadClaims()
    expect(
      claimCovers(claims, file, start, end),
      `no committed claim pins ${file}:${start}-${end} — jt8-2 requires each homing law to be cited`,
    ).toBe(true)
  })

  it('jt8-2 added its own homing claims (JT82-*)', () => {
    const jt82 = loadClaims().filter((c) => /^JT82-\d+$/.test(c.id ?? ''))
    expect(jt82.length, 'the new transcription claims are committed').toBeGreaterThan(0)
  })

  it('a claim states the DERIVED 129-wake cadence, flagged as derived', () => {
    // The cadence is the one number in this story that is NOT transcribed: it
    // falls out of the 8-bit DEC/BMI walk. A claim that presented 129 as if it
    // were a ROM literal would be a fabricated citation — the claim text must own
    // that it is derived, and must anchor on the DEC/BMI pair that produces it.
    const derived = loadClaims().filter(
      (c) =>
        /^JT82-\d+$/.test(c.id ?? '') &&
        /129/.test(c.claim ?? '') &&
        /derive|DERIVED/i.test(c.claim ?? ''),
    )
    expect(
      derived.length,
      'a JT82-* claim must state 129 AND mark it derived from the 8-bit DEC/BMI, not transcribed',
    ).toBeGreaterThan(0)
    expect(
      derived.every((c) => (c.source?.line ?? 0) >= 3942 && (c.source?.line ?? 0) <= 3944),
      'and anchor it on the DEC/BMI/CLR block (:3942-3944)',
    ).toBe(true)
  })

  it('a claim states the MOUNTED seed value 1, anchored on SEEKFS (:3584-3585)', () => {
    // ROUND 2. The seed is the whole [HIGH], and it is the one value in this
    // story a reader is most likely to assume rather than check — round 1
    // assumed it and shipped an inert feature. So it gets the same treatment as
    // the derived 129: a claim must SAY it, and must anchor on the two lines
    // that carry it, not on `CLR PRDIR,Y` (:3255) which clears a different bird.
    const seeded = loadClaims().filter(
      (c) =>
        /^JT82-\d+$/.test(c.id ?? '') && /SEEKFS/.test(c.claim ?? '') && /\bPRDIR\b/.test(c.claim ?? ''),
    )
    expect(
      seeded.length,
      'a JT82-* claim must state the SEEKFS short-range flag that seeds PRDIR on a mounted bird',
    ).toBeGreaterThan(0)
    expect(
      seeded.every((c) => (c.source?.line ?? 0) >= 3584 && (c.source?.line ?? 0) <= 3585),
      'and anchor it on SEEKFS :3584-3585',
    ).toBe(true)
  })

  it('every claim id is still unique', () => {
    const ids = loadClaims().map((c) => c.id)
    const dupes = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
    expect(dupes, 'duplicate claim ids').toEqual([])
  })
})
