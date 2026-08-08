// tests/highscore.test.ts
//
// Story jt10-7 — RED (Tyr / TEA). The BEHAVIOUR + CITATION + PURITY suite for the
// new core screen-DATA-and-logic module plugins/joust/src/core/highscore.ts: the
// three ROM strings (the two rank-conditional prompts + the JOUST CHAMPIONS
// heading), rankForScore/promptForRank (the rank → prompt map), the SH2-13
// keyboard initials verb, and commitEntry (the pure insert).
//
// The module surface is stated in tests/helpers/highscore-contract.ts and loaded
// lazily per-test via loadHighscore (the tp1-8 collection trap): RED reddens with
// a clean "highscore module not built yet" per test until Loki ships the module.
// Each test NAMES the mutant it kills (lang-review #15).
//
// SCOPE RULINGS baked in (user 2026-08-08): rank-conditional prompt = BOTH (MSGOD
// champion / MSPEON lesser); table = JOUST CHAMPIONS all-time ONLY (DAILY BUZZARDS
// → jt10-9); entry = the SHARED keyboard verb (@shared/name-entry), NOT the ROM's
// move/flap cursor cycler — so the charset is A–Z (no digits). See the session
// Design Deviations for the ROM evidence (ENTINT / MSENT3 / the CSPC..CZ+1 range).

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadHighscore, type JoustHighScore } from './helpers/highscore-contract.js'
import { loadCabinet, type CabinetState } from './helpers/cabinet-contract.js'
import { qualifiesForHighScore, insertHighScore, MAX_HIGH_SCORES } from '@shared/highscore'
import { violations } from './helpers/purity-scanner.js'

const SEED = 0x1234
const coreDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'core')

// The vendored 1982 Williams source sits at the monorepo root, two levels above
// plugins/joust — same resolution as select.test.ts / audio-rom-citations.test.ts.
// MESSEQU.SRC and MESSEQU2.SRC are message-equate tables: label / message-number /
// quoted text, one per line (MESSEQU2 carries multi-line equates whose extra
// strings sit on `*`-comment CONTINUATION lines).
const vendoredRoot =
  process.env.JOUST_SOURCE_DIR ?? join(coreDir, '..', '..', '..', '..', 'reference', 'williams-source', 'joust')
const messEqu = join(vendoredRoot, 'MESSEQU.SRC')
const messEqu2 = join(vendoredRoot, 'MESSEQU2.SRC')
const vendoredAvailable = existsSync(messEqu) && existsSync(messEqu2)

/** A fresh 10-deep board, scores 10000 down to 1000 — a FULL JOUST CHAMPIONS table.
 *  Descending by score (the order insertHighScore maintains). */
function fullTable(): JoustHighScore[] {
  return Array.from({ length: MAX_HIGH_SCORES }, (_, i) => ({
    name: 'AAA',
    score: 10000 - i * 1000, // 10000, 9000, …, 1000
    wave: 1,
  }))
}

/** Read the not-yet-built highscore source for the purity assertions (RED: absent → throws). */
function readHighscoreSource(): string {
  const p = join(coreDir, 'highscore.ts')
  if (!existsSync(p)) {
    throw new Error('GREEN (Loki) must create src/core/highscore.ts — jt10-7 (the prompts + rank map + entry verb + commit)')
  }
  return readFileSync(p, 'utf8')
}

/** The text inside the ONE pair of single quotes on an equate/continuation line. */
function quotedText(line: string): string {
  const first = line.indexOf("'")
  const last = line.lastIndexOf("'")
  if (first < 0 || last <= first) throw new Error(`no quoted text on: ${line}`)
  return line.slice(first + 1, last)
}

/** MESSEQU.SRC line whose label + message-number are `label`/`num`, located by
 *  LABEL (not a bare line number) so a citation cannot silently drift onto the
 *  wrong row. Returns its quoted text. */
function equText(label: string, num: string): string {
  const lines = readFileSync(messEqu, 'latin1').split('\n')
  const re = new RegExp(`^${label}\\s+EQU\\s+\\${num}\\b`)
  const hit = lines.find((l) => re.test(l))
  if (hit === undefined) throw new Error(`MESSEQU.SRC has no \`${label} EQU ${num}\` row`)
  return quotedText(hit)
}

/** The quoted text on the labelled TXHSP $0F row of MESSEQU2.SRC, AND the quoted
 *  text on the CONTINUATION line directly below it. TXHSP is a multi-line equate:
 *  the label row carries 'DAILY BUZZARDS' and the next `*`-comment line carries
 *  'JOUST CHAMPIONS'. Returning both lets the gate assert the citation targets the
 *  CONTINUATION, not the label (the ROM-table-continuation trap). */
function txhspRows(): { labelled: string; continuation: string } {
  const lines = readFileSync(messEqu2, 'latin1').split('\n')
  const i = lines.findIndex((l) => /^TXHSP\s+EQU\s+\$0F\b/.test(l))
  if (i < 0) throw new Error('MESSEQU2.SRC has no `TXHSP EQU $0F` row')
  return { labelled: quotedText(lines[i]), continuation: quotedText(lines[i + 1]) }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC1 — gameover → 'highscore' iff the best score qualifies against a POPULATED
// table, else → 'attract'. jt10-2 wired afterGameOver with an EMPTY table; jt10-7
// populates it, so the qualify branch is only now MEANINGFUL. Full-board case: a
// score must STRICTLY beat the lowest (1000) to enter.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC1 afterGameOver routes on a POPULATED JOUST CHAMPIONS table', () => {
  async function goverWith(score: number): Promise<CabinetState> {
    const c = await loadCabinet()
    const base = c.createCabinet(SEED, 1)
    // afterGameOver reads only players[].score; force the best score deterministically.
    return { mode: 'gameover', game: { ...base.game, players: base.game.players.map((p) => ({ ...p, score })) } }
  }

  it('a score that BEATS the full board routes to highscore', async () => {
    const c = await loadCabinet()
    const cab = await goverWith(50000) // beats 10000
    // Kills "afterGameOver ignores the table / always attracts".
    expect(c.afterGameOver(cab, fullTable()).mode, 'qualifying score → highscore').toBe('highscore')
  })

  it('a score BELOW the full board’s floor routes to attract (not highscore)', async () => {
    const c = await loadCabinet()
    const cab = await goverWith(500) // below the 1000 floor
    // Kills "a full board still admits any score" — the value gate must reject it.
    expect(c.afterGameOver(cab, fullTable()).mode, 'non-qualifying score → attract').toBe('attract')
  })

  it('the routing agrees with @shared qualifiesForHighScore on the same table (not an independent guess)', async () => {
    const c = await loadCabinet()
    const table = fullTable()
    for (const score of [50000, 1000 /* tie floor, NOT a strict beat */, 500, 1500]) {
      const want = qualifiesForHighScore(table, score) ? 'highscore' : 'attract'
      expect((c.afterGameOver(await goverWith(score), table)).mode, `score ${score}`).toBe(want)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC3 — the RANK-CONDITIONAL prompt (user ruling): rank 1 → champion (MSGOD),
// rank ≥ 2 → lesser (MSPEON). rankForScore feeds it; ties place the newcomer AFTER
// equals, so a tie with the top is rank 2 (NOT the champion). Degenerate scores
// (0, negative) do not qualify → rank 0 (lang-review #21: a present-but-unusable
// value must not slip through as a champion).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC3 rankForScore + promptForRank — the rank-conditional prompt', () => {
  it('an empty board makes any positive score the CHAMPION (rank 1)', async () => {
    const h = await loadHighscore()
    expect(h.rankForScore([], 10), 'first score onto an empty board is rank 1').toBe(1)
  })

  it('a score that beats the whole full board is rank 1; a tie with the top is rank 2', async () => {
    const h = await loadHighscore()
    const table = fullTable() // top = 10000
    expect(h.rankForScore(table, 50000), 'beats everything → champion').toBe(1)
    // Kills "a tie counts as the champion" — insertHighScore places a tie AFTER the
    // equal entry, so the tying player is rank 2 and must see the LESSER prompt.
    expect(h.rankForScore(table, 10000), 'tie with the top → rank 2, not 1').toBe(2)
  })

  it('rankForScore matches where insertHighScore actually places the row (derived, not transcribed)', async () => {
    const h = await loadHighscore()
    const table = fullTable() // 10000,9000,…,1000
    // A synthetic score between the 3rd (8000) and 4th (7000) entries lands at index 3 → rank 4.
    const placed = insertHighScore(table, { name: 'ZZZ', score: 7500, wave: 1 })
    const idx = placed.findIndex((r) => r.name === 'ZZZ')
    expect(h.rankForScore(table, 7500), 'rank is the 1-based insert index').toBe(idx + 1)
    expect(h.rankForScore(table, 7500), 'and that is 4 here').toBe(4)
  })

  it('a non-qualifying score is rank 0 — 0 and a negative are not nullish, and must not qualify (#21)', async () => {
    const h = await loadHighscore()
    const table = fullTable()
    expect(h.rankForScore(table, 0), 'a zero score never qualifies').toBe(0)
    expect(h.rankForScore(table, -5), 'a negative score never qualifies').toBe(0)
    expect(h.rankForScore(table, 500), 'below a full board’s floor → 0').toBe(0)
  })

  it('promptForRank: rank 1 → champion, ranks 2/5/10 → lesser, and the two DIFFER', async () => {
    const h = await loadHighscore()
    expect(h.promptForRank(1), 'rank 1 is the champion prompt').toBe(h.PROMPT_CHAMPION)
    for (const rank of [2, 5, 10]) {
      expect(h.promptForRank(rank), `rank ${rank} is the lesser prompt`).toBe(h.PROMPT_LESSER)
    }
    // Kills "both prompts collapse to one string".
    expect(h.PROMPT_CHAMPION, 'the champion and lesser prompts are distinct strings').not.toBe(h.PROMPT_LESSER)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC2 — the initials-entry machine: the SHARED SH2-13 keyboard verb
// (@shared/name-entry), NOT the ROM cursor cycler (user ruling). A–Z appends
// uppercased up to MAX_INITIALS; Backspace deletes, never past empty; every other
// key — INCLUDING digits — is inert (the '0–9' of the derived AC is dropped).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC2 the initials keyboard verb (enterInitial / isEntryComplete)', () => {
  it('beginEntry starts empty and MAX_INITIALS is the 3-char arcade convention', async () => {
    const h = await loadHighscore()
    expect(h.beginEntry().initials, 'fresh buffer is empty').toBe('')
    expect(h.MAX_INITIALS, 'three initials').toBe(3)
  })

  it('A–Z appends UPPERCASED up to three, and the fourth key is a no-op at the cap', async () => {
    const h = await loadHighscore()
    let e = h.beginEntry()
    e = h.enterInitial(e, 'k') // lowercase in
    expect(e.initials, 'lowercase is uppercased').toBe('K')
    e = h.enterInitial(e, 'e')
    e = h.enterInitial(e, 'a')
    expect(e.initials, 'three letters accumulate').toBe('KEA')
    // Kills "the buffer grows past MAX_INITIALS" — the 4th letter must be ignored.
    const capped = h.enterInitial(e, 'z')
    expect(capped.initials, 'the cap holds at three').toBe('KEA')
  })

  it('Backspace deletes the last char and never deletes past empty', async () => {
    const h = await loadHighscore()
    let e = h.beginEntry()
    e = h.enterInitial(e, 'a')
    e = h.enterInitial(e, 'b')
    e = h.enterInitial(e, 'Backspace')
    expect(e.initials, 'one delete → one char left').toBe('A')
    e = h.enterInitial(e, 'Backspace')
    e = h.enterInitial(e, 'Backspace') // already empty
    // Kills "Backspace on empty throws / underflows".
    expect(e.initials, 'delete past empty stays empty').toBe('')
  })

  it('DIGITS and other keys are inert — the shared charset is A–Z (AC2’s "0–9" is dropped, per the ruling)', async () => {
    const h = await loadHighscore()
    let e = h.beginEntry()
    for (const key of ['5', '0', '9', ' ', 'Enter', 'ArrowLeft', 'ß', '-']) {
      e = h.enterInitial(e, key)
    }
    // Kills "digits/space/junk are accepted into the initials" — if any were, the
    // buffer would be non-empty. This is the RULING made mechanical: no digits.
    expect(e.initials, 'no non-letter key enters the buffer').toBe('')
  })

  it('a no-op keystroke returns the SAME buffer OBJECT (so the shell can skip state churn)', async () => {
    const h = await loadHighscore()
    const buf = h.beginEntry()
    const after = h.enterInitial(buf, '5') // inert
    // Reference identity, not just value: the doc contract is "returns the SAME buffer"
    // so a caller can `===`-compare to skip a re-render. Dropping the early-return in
    // enterInitial (always allocating a fresh { initials }) reddens THIS, not a value check.
    expect(after, 'inert key → the identical object, not a fresh allocation').toBe(buf)
    expect(after.initials, 'and still empty').toBe('')
  })

  it('isEntryComplete is false below three chars and true at exactly three', async () => {
    const h = await loadHighscore()
    let e = h.beginEntry()
    expect(h.isEntryComplete(e), 'empty is not complete').toBe(false)
    e = h.enterInitial(e, 'a')
    e = h.enterInitial(e, 'b')
    expect(h.isEntryComplete(e), 'two is not complete').toBe(false)
    e = h.enterInitial(e, 'c')
    expect(h.isEntryComplete(e), 'three is complete — the commit gate opens').toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC4 — commitEntry is the pure insert into the persisted table: descending-score
// order, capped at MAX_HIGH_SCORES (10), carrying name/score/wave. Delegates to
// @shared/highscore's insertHighScore (one ordering rule for the whole cabinet).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC4 commitEntry — insert into the JOUST CHAMPIONS table', () => {
  it('an empty board takes the first row verbatim (name/score/wave)', async () => {
    const h = await loadHighscore()
    const out = h.commitEntry([], 'KEA', 4200, 7)
    expect(out.length, 'one row').toBe(1)
    expect(out[0], 'the committed row carries initials, score and wave').toEqual({ name: 'KEA', score: 4200, wave: 7 })
  })

  it('inserts in descending-score order (derived — agrees with insertHighScore)', async () => {
    const h = await loadHighscore()
    const table = fullTable() // 10000..1000
    const out = h.commitEntry(table, 'ZZZ', 7500, 3)
    const want = insertHighScore(table, { name: 'ZZZ', score: 7500, wave: 3 })
    // Kills "commitEntry appends without sorting" and "it builds a different row shape".
    expect(out, 'commitEntry matches the shared insert exactly').toEqual(want)
    expect(out[3], 'the row lands at rank 4 (between 8000 and 7000)').toEqual({ name: 'ZZZ', score: 7500, wave: 3 })
  })

  it('never grows past MAX_HIGH_SCORES — a qualifying score displaces the floor', async () => {
    const h = await loadHighscore()
    const out = h.commitEntry(fullTable(), 'NEW', 5500, 2)
    // Kills "the table grows to 11" — insertHighScore truncates to ten.
    expect(out.length, 'ten rows, always').toBe(MAX_HIGH_SCORES)
    expect(out.some((r) => r.name === 'NEW'), 'the qualifying row is present').toBe(true)
    expect(out[out.length - 1].score, 'the old 1000 floor was pushed off').toBe(2000)
  })

  it('does not mutate the input table (pure) — full rows, not just scores', async () => {
    const h = await loadHighscore()
    const table = fullTable()
    // Deep snapshot: a mutation of any field (name/wave, not only score) must be caught.
    const before = JSON.parse(JSON.stringify(table))
    h.commitEntry(table, 'AAA', 12345, 1)
    expect(table, 'the caller’s table is untouched, row for row').toEqual(before)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC6 — the three ROM strings are transcribed VERBATIM. Direct literal pins (an
// always-on regression) PLUS the citation gate below.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC6 the ROM strings — verbatim transcription', () => {
  it('the two prompts are the MSGOD / MSPEON message strings', async () => {
    const h = await loadHighscore()
    expect(h.PROMPT_CHAMPION, 'MSGOD $67').toBe('ENTER THY NAME MY LORD!')
    expect(h.PROMPT_LESSER, 'MSPEON $68').toBe('ENTER YOUR INITIALS')
  })

  it('the heading is JOUST CHAMPIONS — NOT the daily table’s DAILY BUZZARDS (jt10-9)', async () => {
    const h = await loadHighscore()
    expect(h.CHAMPIONS_HEADING, 'TXHSP $0F continuation').toBe('JOUST CHAMPIONS')
    // Kills "the heading was transcribed from the LABELLED $0F row" — that row is
    // the daily table, descoped to jt10-9. The all-time heading is the continuation.
    expect(h.CHAMPIONS_HEADING, 'not the daily-table heading').not.toBe('DAILY BUZZARDS')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC6 — the CITATION GATE: each constant RE-OPENS at its message-equate row, byte
// for byte, located by label. The heading gate proves the citation targets the
// CONTINUATION line, not the labelled TXHSP row. Skips (never silently) if the
// vendored tree is absent; includes DISCRIMINATING controls so it is not vacuous.
// ─────────────────────────────────────────────────────────────────────────────
describe.skipIf(!vendoredAvailable)('AC6 citation gate — the strings re-open in the message-equate tables', () => {
  it('the vendored MESSEQU.SRC + MESSEQU2.SRC really are here (so the checks below are not silent skips)', () => {
    expect(existsSync(messEqu), 'reference/williams-source/joust/MESSEQU.SRC').toBe(true)
    expect(existsSync(messEqu2), 'reference/williams-source/joust/MESSEQU2.SRC').toBe(true)
  })

  it('PROMPT_CHAMPION re-opens at MSGOD $67 (MESSEQU.SRC:124)', async () => {
    const h = await loadHighscore()
    expect(h.PROMPT_CHAMPION, 'the transcription equals the primary source').toBe(equText('MSGOD', '$67'))
  })

  it('PROMPT_LESSER re-opens at MSPEON $68 (MESSEQU.SRC:125)', async () => {
    const h = await loadHighscore()
    expect(h.PROMPT_LESSER).toBe(equText('MSPEON', '$68'))
  })

  it('CHAMPIONS_HEADING re-opens at the TXHSP $0F CONTINUATION line (MESSEQU2.SRC:88), NOT the labelled row', async () => {
    const h = await loadHighscore()
    const { labelled, continuation } = txhspRows()
    // The trap made explicit: the labelled row is the DAILY table; the continuation
    // is the all-time heading. A label-keyed read would return the wrong string.
    expect(labelled, 'the labelled TXHSP $0F row is the daily table').toBe('DAILY BUZZARDS')
    expect(continuation, 'the continuation line is the all-time heading').toBe('JOUST CHAMPIONS')
    expect(h.CHAMPIONS_HEADING, 'the constant equals the continuation, not the label').toBe(continuation)
    expect(h.CHAMPIONS_HEADING, 'and is NOT the labelled-row string').not.toBe(labelled)
  })

  it('the gate DISCRIMINATES — a drifted quote is rejected (not a vacuous re-open)', () => {
    // Control: a near-miss must NOT match the source. Guards against a gate that
    // passes regardless of the transcribed value.
    expect('ENTER YOUR NAME').not.toBe(equText('MSGOD', '$67'))
    expect(quotedText("X EQU $99 'AB '"), 'the extractor keeps interior/trailing spaces').toBe('AB ')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// highscore.ts is pure core (the jt1-7 boundary scanner), imports no shell.
// ─────────────────────────────────────────────────────────────────────────────
describe('highscore.ts is pure core', () => {
  it('passes the jt1-7 boundary scanner (no clock, entropy, browser surface, shell import)', () => {
    const hits = violations(readHighscoreSource(), 'highscore.ts')
    expect(hits, `highscore.ts tripped the purity scanner: ${hits.join(', ')}`).toEqual([])
  })

  it('names neither "window." nor "document." anywhere (the scanner reads comments)', () => {
    const src = readHighscoreSource()
    expect(src.includes('window.'), 'highscore.ts must not name window.').toBe(false)
    expect(src.includes('document.'), 'highscore.ts must not name document.').toBe(false)
  })

  it('imports no shell module, and reuses @shared rather than re-implementing the entry/insert logic', () => {
    const src = readHighscoreSource()
    expect(src, 'highscore.ts must not import from shell/').not.toMatch(/\bfrom\s+['"][^'"]*shell/i)
    expect(src, 'highscore.ts must not require()').not.toMatch(/\brequire\s*\(/)
    // The entry verb + insert are the CABINET-WIDE shared logic, not re-invented here.
    expect(src, 'uses the shared name-entry verb').toMatch(/from\s+['"]@shared\/name-entry['"]/)
    expect(src, 'uses the shared highscore insert').toMatch(/from\s+['"]@shared\/highscore['"]/)
  })

  it('the scanner is not vacuous — a live Date.now() is still caught', () => {
    expect(violations('export const x = Date.now()', 'probe.ts').length).toBeGreaterThan(0)
  })
})
