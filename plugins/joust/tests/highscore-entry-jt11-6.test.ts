// tests/highscore-entry-jt11-6.test.ts
//
// Story jt11-6 — RED (O'Brien / TEA). The high-score ENTRY-SCREEN timeout: the
// core countdown that lets a walked-away qualifying score persist instead of
// evaporating, plus the citation gate that pins its NUMBER to the 1982 source.
//
// ─── THE RESEARCH THE STORY BLOCKED ON, AND WHAT IT FOUND ────────────────────
// The story says "verify the ROM entry-timeout behavior in JOUSTRV4.SRC before
// choosing the timeout law — cite it". JOUSTRV4.SRC does not contain it, and the
// reason is structural rather than an absence: joust's game code only JUMPS to the
// high-score routine (`JMP GAMEND  CHECK FOR H.S.T.D.`, JOUSTRV4.SRC:688), and
// GAMEND is a 3-byte vector into the shared Williams system ROM (EQU.SRC:237,
// `GAMEND RMB 3  GAME OVER H.S.T.D. CHECK AND ENTER ROUTINE`). That system ROM IS
// vendored here: TB12REV1.SRC / TB12REV3.SRC, the same file core/highscore.ts
// already cites for the ENTINT cursor cycler. So the law is measurable, and it was
// measured — searching only JOUSTRV4.SRC is what makes it look absent.
//
// ─── THE LAW, AS SHIPPED (TB12REV1.SRC:75-88, byte-identical in TB12REV3.SRC) ──
// The supervisor is AMODE (TB12REV1.SRC:49, `AMODE TST ANYONE` — "did anyone make
// the table?"). It puts up the congrats (MSBZB $69 'NICE JOUSTING!', MESSEQU.SRC:126)
// and the entry instruction line (MSENT3 $6B, MESSEQU.SRC:128), then supervises the
// entry with a plain nap loop:
//
//     ********  LDA  #$FF   (OLD TIME 255*20=5100TICKS = 1MIN 25 SEC)   :75
//     ********  STA  .SAVEA,U                                          :76
//               CLR  .SAVEA,U (PFUTZ ALTERATION, WAIT FOR 2 MIN 9 SEC)  :77
//     1$        PCNAP 30      (OLD DATA 20)                            :78
//               DEC  .SAVEA,U                                          :79
//               BEQ  2$                                                :80
//
// `CLR` seeds the counter at 0, so the first `DEC` wraps to $FF and the loop runs
// 256 iterations of PCNAP 30 → 256*30 = 7680 ticks. The commented-out OLD law gives
// the tick↔seconds scale for free (5100 ticks = 1 min 25 sec ⇒ 60 ticks/sec), and
// 7680 ticks at that scale is 128 s — the "2 MIN 9 SEC" the shipped line claims.
// A tick is one video frame, which is joust's core FRAME_HZ.
//
// THE TRAP THIS SUITE EXISTS TO KILL: the `********` lines are COMMENTED OUT. A
// reader who takes the first `LDA #$FF` it sees ships 255*20 = 5100 ticks — the
// law Williams replaced. The gate below asserts the constant is 7680 and NOT 5100.
//
// ─── ONE DELIBERATE DEVIATION, STATED UP FRONT ───────────────────────────────
// On expiry the ROM does NOT commit: `2$ PKILL $42,$FF` kills the entry process and
// falls into `JMP VATTRT` (TB12REV1.SRC:87-89), and the initials only reach CMOS
// AFTER ENTINT returns carry-set (the CMOSMV stores at TB12REV1.SRC:1650-1660). So
// the 1982 cabinet drops a walked-away score exactly as this port does today — the
// felt bug is FAITHFUL. jt11-6's ruling is to keep the ROM's DURATION and change the
// EXPIRY ACTION to an auto-commit, because a browser cabinet has no attendant and a
// lost score is the whole complaint. The unentered letters take the ROM's own buffer
// convention: CSPC spaces (TB12REV1.SRC:1901-1905, the `LDB #20 / LDA #CSPC` fill
// that pre-loads the initials buffer). Recorded in the session Design Deviations.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FRAME_HZ } from '../src/core/frame.js'

const coreDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'core')

// The vendored 1982 Williams source sits at the monorepo root, two levels above
// plugins/joust — the same resolution highscore.test.ts / select.test.ts use.
const vendoredRoot =
  process.env.JOUST_SOURCE_DIR ?? join(coreDir, '..', '..', '..', '..', 'reference', 'williams-source', 'joust')
const tb12rev1 = join(vendoredRoot, 'TB12REV1.SRC')
const tb12rev3 = join(vendoredRoot, 'TB12REV3.SRC')
const vendoredAvailable = existsSync(tb12rev1) && existsSync(tb12rev3)

/** The 6809 nap unit is one video frame, so ticks convert at joust's own core rate
 *  (FRAME_HZ ≈ 60.096 Hz) — never at a rounded 60 invented here. */
const secondsForTicks = (ticks: number): number => ticks / FRAME_HZ

/** The law this story ships: 256 iterations (CLR seeds 0 → the first DEC wraps to
 *  $FF) of `PCNAP 30`. Re-derived from the operands below, never pasted. */
const ITERATIONS = 256
const NAP_TICKS = 30

/** The SUPERSEDED law on the `********` lines — 255 iterations of `PCNAP 20`. Named
 *  so the gate can assert the shipped constant is not this one. */
const OLD_LAW_TICKS = 255 * 20

/** Latin-1: the 1982 listings carry high-bit bytes; utf8 would mangle them. */
const romLines = (path: string): string[] => readFileSync(path, 'latin1').split('\n')

// ─────────────────────────────────────────────────────────────────────────────
// The module surface jt11-6 adds to src/core/highscore.ts. Declared locally (not
// imported) so `tsc --noEmit` stays green while the members do not exist yet, and
// loaded through a runtime-assembled specifier so a missing module reddens each
// test with a self-describing message instead of the whole FILE at collection
// (the tp1-8 trap). This mirrors tests/helpers/highscore-contract.ts's loader.
// ─────────────────────────────────────────────────────────────────────────────

/** The in-flight buffer, jt11-6 shape: the initials PLUS the entry countdown. */
interface TimedEntryBuffer {
  readonly initials: string
  readonly ticksLeft: number
}

interface EntryTimeoutModule {
  /** 7680 — 256 × `PCNAP 30`, the AMODE supervisor loop (TB12REV1.SRC:77-79). */
  readonly ENTRY_TIMEOUT_TICKS: number
  readonly MAX_INITIALS: number
  beginEntry(): TimedEntryBuffer
  enterInitial(entry: TimedEntryBuffer, key: string): TimedEntryBuffer
  isEntryComplete(entry: TimedEntryBuffer): boolean
  /** One video frame of the countdown: ticksLeft − 1, floored at 0. Pure; returns
   *  the SAME object once expired (the enterInitial no-op idiom). */
  tickEntry(entry: TimedEntryBuffer): TimedEntryBuffer
  /** True once the countdown has run out. Pure. */
  isEntryExpired(entry: TimedEntryBuffer): boolean
  /** The initials an EXPIRED entry commits: the buffer padded to MAX_INITIALS with
   *  the ROM's own CSPC space fill. Pure. */
  timeoutInitials(entry: TimedEntryBuffer): string
}

const NEW_MEMBERS = ['ENTRY_TIMEOUT_TICKS', 'tickEntry', 'isEntryExpired', 'timeoutInitials'] as const

async function loadEntry(): Promise<EntryTimeoutModule> {
  const specifier = ['..', '..', 'src', 'core', 'highscore.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<EntryTimeoutModule>
    for (const m of NEW_MEMBERS) {
      if (mod[m] === undefined) throw new Error(`module has no \`${m}\` export`)
    }
    return mod as EntryTimeoutModule
  } catch (e) {
    throw new Error(
      'the jt11-6 entry TIMEOUT is not in src/core/highscore.ts yet — GREEN adds ENTRY_TIMEOUT_TICKS ' +
        '(7680 = 256 × `PCNAP 30`, TB12REV1.SRC:77-79 — NOT the commented-out 255×20=5100 old law), a ' +
        '`ticksLeft` field on the entry buffer seeded by beginEntry, tickEntry (one frame of countdown, ' +
        'floored at 0), isEntryExpired, and timeoutInitials (the buffer space-padded to MAX_INITIALS, ' +
        `the ROM's CSPC fill). Keep it pure core — the countdown is TICKS, never a clock. (${(e as Error).message})`,
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-B1 — the NUMBER, re-derived from the vendored system ROM rather than pasted.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('AC-B1 citation gate — the timeout re-opens in the Williams system ROM', () => {
  it('the vendored TB12REV1.SRC + TB12REV3.SRC really are here (so the checks below are not silent skips)', () => {
    expect(existsSync(tb12rev1), 'reference/williams-source/joust/TB12REV1.SRC').toBe(true)
    expect(existsSync(tb12rev3), 'reference/williams-source/joust/TB12REV3.SRC').toBe(true)
  })

  it('AMODE seeds the counter with CLR (not the commented-out LDA #$FF) and naps 30 ticks per iteration', () => {
    // Located by LABEL, not by a bare line number, so the gate cannot drift onto
    // unrelated code. Kills "cited a line that happens to sit near AMODE".
    const lines = romLines(tb12rev1)
    const amode = lines.findIndex((l) => /^AMODE\s+TST\s+ANYONE/.test(l))
    expect(amode, 'TB12REV1.SRC has an `AMODE TST ANYONE` row').toBeGreaterThan(-1)

    const block = lines.slice(amode, amode + 40)
    const seed = block.find((l) => /^\s*CLR\s+\.SAVEA,U/.test(l))
    const nap = block.find((l) => /^1\$\s+PCNAP\s+30\b/.test(l))
    expect(seed, 'the LIVE seed line `CLR .SAVEA,U` is in the AMODE block').toBeDefined()
    expect(nap, 'the LIVE loop line `1$ PCNAP 30` is in the AMODE block').toBeDefined()
    // The shipped seed is CLR, and the line says so in its own words.
    expect(seed, "the CLR line carries the shipped duration in its comment").toMatch(/2 MIN 9 SEC/)

    // The superseded law is present but COMMENTED OUT — the `********` prefix is the
    // whole trap. Proving it is commented is what makes "not 5100" a measurement.
    const old = block.find((l) => /LDA\s+#\$FF/.test(l))
    expect(old, 'the OLD `LDA #$FF` law line is present').toBeDefined()
    expect(old, 'and it is commented out with the `********` prefix').toMatch(/^\*{4,}/)
    expect(old, 'and it states its own arithmetic: 255*20=5100 ticks').toMatch(/255\*20=5100TICKS/)
  })

  it('ENTRY_TIMEOUT_TICKS is the SHIPPED 256×30 = 7680, not the superseded 255×20 = 5100', async () => {
    const { ENTRY_TIMEOUT_TICKS } = await loadEntry()
    // Kills the two mutants the source invites: pasting the commented-out old law,
    // and reading `CLR` as 0 iterations (a loop that exits immediately).
    expect(ENTRY_TIMEOUT_TICKS, '256 × PCNAP 30').toBe(ITERATIONS * NAP_TICKS)
    expect(ENTRY_TIMEOUT_TICKS, 'the shipped law').toBe(7680)
    expect(ENTRY_TIMEOUT_TICKS, 'NOT the commented-out 255×20 old law').not.toBe(OLD_LAW_TICKS)
  })

  it('the constant lands where the ROM comment says it does — about two minutes, not twelve seconds', async () => {
    const { ENTRY_TIMEOUT_TICKS } = await loadEntry()
    // The ROM's own "2 MIN 9 SEC" ignores the PCNAP-3/PKILL overhead, so this is a
    // RANGE, not an equality — but it is tight enough to kill an order-of-magnitude
    // slip (768 → 12.8 s, 76800 → 21 min), which a bare `.toBe(7680)` above cannot
    // catch if someone changes both the constant and the derivation together.
    const seconds = secondsForTicks(ENTRY_TIMEOUT_TICKS)
    expect(seconds, 'at least 2:00').toBeGreaterThanOrEqual(120)
    expect(seconds, 'at most 2:12').toBeLessThanOrEqual(132)
    // And the OLD law's own comment gives the tick scale a control: 5100 ticks is
    // the 1 min 25 sec the listing claims, which proves the conversion is right.
    expect(Math.round(secondsForTicks(OLD_LAW_TICKS)), '5100 ticks ≈ 1 min 25 sec').toBe(85)
  })

  it('both vendored system-ROM revisions carry the SAME loop, so the citation is not revision-specific', () => {
    // Kills "cited REV1 but REV3 shipped a different duration" — the port cites REV1
    // (as core/highscore.ts already does for ENTINT); this proves REV3 agrees.
    const pick = (path: string): string[] => {
      const lines = romLines(path)
      const amode = lines.findIndex((l) => /^AMODE\s+TST\s+ANYONE/.test(l))
      return lines.slice(amode, amode + 40).filter((l) => /\.SAVEA,U|PCNAP\s+\d+/.test(l))
    }
    expect(pick(tb12rev3), 'REV3 AMODE supervisor lines match REV1').toEqual(pick(tb12rev1))
  })

  it("the module's own citation RESOLVES — the cited TB12REV1 lines really carry the loop", () => {
    // The jt5-7/jt9-57 resolution idiom: parse the line number out of the shipped
    // comment and re-open it, so a stale or invented cite reddens. A cite is only
    // accepted if the line it names is one of the two LIVE loop instructions.
    const src = readFileSync(join(coreDir, 'highscore.ts'), 'utf8')
    const cites = [...src.matchAll(/TB12REV1\.SRC:(\d+)(?:-(\d+))?/g)]
    expect(cites.length, 'core/highscore.ts cites TB12REV1.SRC for the timeout').toBeGreaterThan(0)

    const lines = romLines(tb12rev1)
    const isLoopLine = (n: number): boolean => /^\s*CLR\s+\.SAVEA,U|^1\$\s+PCNAP\s+30\b/.test(lines[n - 1] ?? '')
    // At least one cite must resolve ONTO the loop (the timeout's own citation);
    // the ENTINT cite core/highscore.ts already carries names a different line, so
    // this is an "any", not an "every".
    const resolved = cites.some(([, from, to]) => {
      const start = Number(from)
      const end = to === undefined ? start : Number(to)
      for (let n = start; n <= end; n++) if (isLoopLine(n)) return true
      return false
    })
    expect(resolved, 'a TB12REV1.SRC cite in core/highscore.ts lands on `CLR .SAVEA,U` or `1$ PCNAP 30`').toBe(true)

    // DISCRIMINATOR — the resolver is not a rubber stamp: a synthetic wrong line
    // (the file's first line) does not satisfy it.
    expect(isLoopLine(1), 'the resolver rejects a wrong line').toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-B2 — the countdown itself: pure, tick-based, and it does NOT restart when the
// player types. The ROM's AMODE counter is decremented by the supervisor and never
// touched by ENTINT, so a slow typist is on the same 2-minute leash as a walk-away.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-B2 the entry countdown is a pure TICK budget on the buffer', () => {
  it('beginEntry seeds a full budget on an empty buffer', async () => {
    const { beginEntry, ENTRY_TIMEOUT_TICKS } = await loadEntry()
    const e = beginEntry()
    expect(e.initials, 'a fresh buffer is empty').toBe('')
    expect(e.ticksLeft, 'and carries the full timeout').toBe(ENTRY_TIMEOUT_TICKS)
  })

  it('tickEntry spends exactly one tick per call and never mutates its argument', async () => {
    const { beginEntry, tickEntry, ENTRY_TIMEOUT_TICKS } = await loadEntry()
    const e0 = beginEntry()
    const e1 = tickEntry(e0)
    // Kills "spends 2 ticks" / "spends a frame's worth of milliseconds" and the
    // in-place mutation that would make the shell's carried state unpredictable.
    expect(e1.ticksLeft, 'one tick spent').toBe(ENTRY_TIMEOUT_TICKS - 1)
    expect(e0.ticksLeft, 'the argument is untouched').toBe(ENTRY_TIMEOUT_TICKS)
    expect(e1.initials, 'ticking does not disturb the initials').toBe(e0.initials)
  })

  it('the budget floors at 0 — it never runs negative however long the screen sits', async () => {
    const { tickEntry, isEntryExpired } = await loadEntry()
    let e: TimedEntryBuffer = { initials: 'AB', ticksLeft: 2 }
    e = tickEntry(e)
    e = tickEntry(e)
    expect(e.ticksLeft, 'exhausted').toBe(0)
    const after = tickEntry(e)
    // Kills "ticksLeft goes negative", which would make an `=== 0` expiry test in the
    // shell fire once and then never again.
    expect(after.ticksLeft, 'still 0 after an extra tick').toBe(0)
    expect(after, 'an expired buffer is returned unchanged (no state churn)').toBe(e)
    expect(isEntryExpired(after), 'and stays expired').toBe(true)
  })

  it('isEntryExpired is false for the whole budget and true only at the end', async () => {
    const { beginEntry, tickEntry, isEntryExpired, ENTRY_TIMEOUT_TICKS } = await loadEntry()
    let e = beginEntry()
    expect(isEntryExpired(e), 'not expired at the start').toBe(false)
    expect(isEntryExpired({ initials: '', ticksLeft: 1 }), 'not expired with one tick left').toBe(false)
    for (let i = 0; i < ENTRY_TIMEOUT_TICKS; i++) e = tickEntry(e)
    // Kills an off-by-one that would fire the auto-commit a frame early or a frame
    // late — and, at the wrong end, one frame after the screen was already left.
    expect(e.ticksLeft, 'the whole budget is spendable').toBe(0)
    expect(isEntryExpired(e), 'expired exactly when the budget runs out').toBe(true)
  })

  it('typing does NOT restart the countdown, and enterInitial keeps the remaining budget', async () => {
    const { enterInitial } = await loadEntry()
    const mid: TimedEntryBuffer = { initials: 'A', ticksLeft: 500 }
    const typed = enterInitial(mid, 'b')
    // Two mutants, both silent: a "reset on activity" timeout (not what AMODE does —
    // its counter is untouched by ENTINT), and an enterInitial that rebuilds the
    // buffer as `{ initials }` and drops ticksLeft to undefined, which would make
    // every later tick NaN and the screen immortal.
    expect(typed.initials, 'the letter still lands, uppercased').toBe('AB')
    expect(typed.ticksLeft, 'and the budget is carried, not reset').toBe(500)
    const inert = enterInitial(mid, '7')
    expect(inert.ticksLeft, 'an inert key does not disturb the budget either').toBe(500)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-B3 — what an expired entry COMMITS. The story's whole point: a walked-away
// qualifying score persists. The unentered letters take the ROM's CSPC space fill
// (TB12REV1.SRC:1901-1905), so a blank entry is a blank NAME, not a dropped ROW.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-B3 timeoutInitials — the buffer an expired entry commits', () => {
  it('pads a partial buffer to MAX_INITIALS with spaces, the ROM CSPC fill', async () => {
    const { timeoutInitials, MAX_INITIALS } = await loadEntry()
    expect(MAX_INITIALS, 'joust enters three initials').toBe(3)
    // Kills "commit only when complete" (the bug being fixed: a 2-letter walk-away
    // still evaporates) and "pad with a placeholder letter" (an invented row name).
    expect(timeoutInitials({ initials: 'AB', ticksLeft: 0 }), 'two letters + one space').toBe('AB ')
    expect(timeoutInitials({ initials: '', ticksLeft: 0 }), 'nothing typed → three spaces').toBe('   ')
    expect(timeoutInitials({ initials: 'ABC', ticksLeft: 0 }), 'a complete buffer is unchanged').toBe('ABC')
  })

  it('the padded name is a string the persisted-row guard still accepts', async () => {
    const { timeoutInitials } = await loadEntry()
    const { isHighScoreRow } = await import('@shared/highscore')
    // The point of padding rather than dropping: the row must survive the round trip
    // through storage, or the walked-away score is lost anyway and the story's fix
    // is decorative. isHighScoreRow is exactly what the lobby re-reads it with.
    const row = { name: timeoutInitials({ initials: '', ticksLeft: 0 }), score: 4200, wave: 7 }
    expect(isHighScoreRow(row), 'a space-named row is a valid persisted row').toBe(true)
  })

  it('a timed-out commit really lands in the table, ahead of the scores it beats', async () => {
    const { timeoutInitials, ...mod } = await loadEntry()
    const { commitEntry } = mod as unknown as {
      commitEntry(
        table: readonly { name: string; score: number; wave: number }[],
        initials: string,
        score: number,
        wave: number,
      ): { name: string; score: number; wave: number }[]
    }
    const table = [
      { name: 'AAA', score: 5000, wave: 9 },
      { name: 'BBB', score: 1000, wave: 3 },
    ]
    const after = commitEntry(table, timeoutInitials({ initials: 'K', ticksLeft: 0 }), 4200, 7)
    // The auto-commit rides the SAME insert as the manual confirm — one ordering, one
    // truncation, one row shape. Kills "the timeout appends to the end of the table".
    expect(after.map((r) => r.score), 'inserted in descending-score order').toEqual([5000, 4200, 1000])
    expect(after[1].name, 'carrying the space-padded initials').toBe('K  ')
    expect(after[1].wave, 'and the session wave').toBe(7)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-B4 — the countdown stays in CORE, counted in FRAMES. The jt1-7 purity boundary
// is the hardest rule in this repo, and a timeout is the classic place it breaks:
// the obvious implementation reads a wall clock.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-B4 the timeout is a tick budget, not a clock', () => {
  it('core/highscore.ts reads no clock and sets no timer', () => {
    const src = readFileSync(join(coreDir, 'highscore.ts'), 'utf8')
    // Comments are stripped first: the module header discusses the ROM's timing in
    // prose, and a scan that reads comments would be defeated by (or trip over) it.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    for (const banned of ['Date.now', 'performance.now', 'setTimeout', 'setInterval', 'requestAnimationFrame']) {
      expect(code, `core/highscore.ts must not use ${banned} — the countdown is ticks`).not.toContain(banned)
    }
  })
})
