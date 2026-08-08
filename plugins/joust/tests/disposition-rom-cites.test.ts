// tests/disposition-rom-cites.test.ts
//
// Story jt9-57 — RED-first guard (refactor/guard). Filed by jt9-39's finish:
// `difficulty-wiring.test.ts`'s AC-6 proves each wired ROW_DISPOSITION entry
// carries a non-empty consumer PROSE string, and jt9-39's `auditDispositions`
// proves a consumer LITERAL exists in core — but NEITHER re-opens the prose's
// `JOUSTRV4.SRC:NNNN` citation against the vendored ROM. A wired entry can name
// the wrong ROM line and ship green. This gate closes that: for every wired
// disposition whose consumer cites a line, it re-opens that line in JOUSTRV4.SRC
// and asserts the read there names the row this port thinks it wires.
//
// ─── THE MECHANISM: ROM-SOURCE RESOLUTION, NOT THE CLAIMS CORPUS ──────────────
// The story text SUGGESTED pinning each cite against docs/rom-study/claims/. That
// mechanism does NOT fit the data: the claims corpus covers only a handful of the
// disposition lines (6395/3224/2761 have a claim; 3727/3801/3803/3844/4243/1611
// and most others do not), so a `claimCovers` gate would RED on correct cites for
// lack of a claim. The faithful mechanism is the jt5-7 RESOLUTION idiom — open the
// vendored source at the cited line and prove the right code is there.
//
// ─── THE ANCHOR RULE (non-vacuous by construction) ───────────────────────────
// The 6809 reads a DYWORD row by its assembler label: `LDA BOUPWD`, `CMPD BODNRG`,
// `SUBD HUDNRG`. So at a wired row's cited line the row's own NAME (the object key
// in ROW_DISPOSITION) is literally present as the read's operand. That is the
// DEFAULT anchor, and — measured 2026-08-08 against JOUSTRV4.SRC — it holds for 25
// of the 26 cited rows, exactly at the cited line (label and operand share one
// 6809 source line, so the window is ZERO: a wrong cite has nowhere to hide).
//
// The ONE exception is curated honestly, not reverse-engineered to pass:
//   • LAVLAV → LNTLAV. The DYWORD label is LAVLAV, but the row is read under its
//     RAM alias LNTLAV — "LINE TRACKING LAVA TROLL LOOKER" — at :3727 (and :3789/
//     :3973/:4232, the four brains). difficulty.ts's own comment documents this
//     ("One row, two spellings"), and the consumer prose names "LINET's lava-troll
//     looker", i.e. LNTLAV. So the anchor for LAVLAV is LNTLAV, a real ROM symbol
//     the sentence cites — never a token invented to make the row pass.
//
// The anchor token is matched with a WORD BOUNDARY, so `BODNRG` is not satisfied
// by `BODNDI`/`BODNVY`, and `EGGWT` is not satisfied by `EGGWT2`.
//
// ─── THE LINE NUMBER IS READ FROM THE PROSE, NEVER HARDCODED ──────────────────
// `resolveCite` parses `JOUSTRV4.SRC:(\d+)(?:-(\d+))?` out of each consumer string
// at test time. Change a prose cite to a wrong line and the read lands on the
// wrong code and the anchor is absent → RED. That is the whole point; it is proven
// two ways below: a pure discriminator (the resolver rejects a synthetic wrong
// line) and a live one (shifting a real cite off its line makes the real file miss).
//
// ─── THE tp1-8 COLLECTION TRAP (inherited from audio-rom-citations.test.ts) ────
// `describe.skipIf` still runs the describe BODY at collection, so a file-reading
// const hoisted there throws on CI where the gitignored reference/ tree is absent.
// Every vendored read below therefore happens INSIDE an `it()`; the only
// module-scope filesystem call is `existsSync`, which cannot throw.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { loadDifficulty, type DyRowName, type RowDisposition } from './helpers/difficulty-contract.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Same vendored-tree resolution (and env override) as audio-rom-citations.test.ts
// / audit/citations.test.ts: the 1982 Williams source sits at the MONOREPO root,
// two levels above plugins/joust. Never committed (copyright).
const vendoredRoot =
  process.env.JOUST_SOURCE_DIR ?? join(root, '..', '..', 'reference', 'williams-source', 'joust')
const vendoredAvailable = existsSync(vendoredRoot)

/**
 * Read a 1-based line from the vendored JOUSTRV4.SRC. This vendored copy is
 * LF-terminated (measured: zero CR bytes), so it is split on `\n` — the same
 * resolution audio-rom-citations.test.ts uses. (The task brief guessed CR; the
 * bytes on disk say LF. The neighbouring-lines control test below would catch a
 * wrong split, which returns the whole file as one line.) Only ever called inside
 * an `it()`.
 */
function vendoredLine(file: string, n: number): string {
  const p = join(vendoredRoot, file)
  if (!existsSync(p)) throw new Error(`citation wants ${file} but it is not in the vendored tree`)
  const lines = readFileSync(p, 'latin1').split('\n')
  const line = lines[n - 1]
  if (line === undefined) throw new Error(`${file} has no line ${n} (file has ${lines.length})`)
  return line
}

// ─── the resolver, PURE over its inputs (so the discriminator drives it dry) ───

interface CitedDisposition {
  readonly row: DyRowName
  /** The ROM symbol whose presence at the cited line proves the cite. */
  readonly anchor: string
  readonly start: number
  readonly end: number
}

/**
 * The single curated anchor override. Every OTHER wired row is read by its own
 * DYWORD label, so its anchor is its own name (see the header). Keep this map
 * SMALL and honest — an entry here is a row read under a different real ROM
 * symbol, documented in difficulty.ts, never a token chosen to force a pass.
 */
const ANCHOR_OVERRIDE: Partial<Record<DyRowName, string>> = {
  LAVLAV: 'LNTLAV', // read under its RAM alias at :3727 — difficulty.ts: "one row, two spellings"
}

/** The `JOUSTRV4.SRC:NNNN` (or `NNNN-MMMM`) a consumer prose string carries, or null. */
function resolveCite(consumer: string): { start: number; end: number } | null {
  const m = /JOUSTRV4\.SRC:(\d+)(?:-(\d+))?/.exec(consumer)
  if (!m) return null
  const start = Number(m[1])
  const end = m[2] === undefined ? start : Number(m[2])
  return { start, end }
}

/** Does any line in [start,end] contain `token` as a whole word? */
function windowContains(read: (n: number) => string, start: number, end: number, token: string): boolean {
  const re = new RegExp(`\\b${token}\\b`)
  for (let n = start; n <= end; n++) if (re.test(read(n))) return true
  return false
}

/** Every wired disposition whose consumer carries a ROM cite, with its anchor. */
function citedDispositions(disp: Readonly<Record<DyRowName, RowDisposition>>): CitedDisposition[] {
  const out: CitedDisposition[] = []
  for (const [row, d] of Object.entries(disp) as [DyRowName, RowDisposition][]) {
    if (d.kind !== 'wired') continue
    const cite = resolveCite(d.consumer)
    if (!cite) continue
    out.push({ row, anchor: ANCHOR_OVERRIDE[row] ?? row, start: cite.start, end: cite.end })
  }
  return out
}

// The 26 wired rows whose consumer prose cites a ROM line. BODNVY and HUDNVY are
// wired but cite named enemy.ts constants, not a line, so they are NOT here — the
// count is a floor the SCHEMA block asserts, so a cite silently dropped reddens.
const EXPECTED_CITED_COUNT = 26

// ═════════════════════════════════════════════════════════════════════════════
// SCHEMA — runs everywhere, tree or no tree. Proves the gate iterates all 26.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt9-57 — every wired ROW_DISPOSITION cite is enumerated', () => {
  it('collects exactly the 26 wired rows that cite a ROM line', async () => {
    const d = await loadDifficulty()
    const cited = citedDispositions(d.ROW_DISPOSITION)
    // A count FLOOR (jt9-57's non-vacuity requirement): the resolution block below
    // is only evidence if it actually walks every cited row. If a cite is dropped
    // from the prose, or a wired row stops citing a line, this reddens here.
    expect(cited.length, 'the wired-with-a-ROM-cite set').toBe(EXPECTED_CITED_COUNT)
    // Each carries a real, positive line number and a non-empty anchor.
    for (const c of cited) {
      expect(Number.isInteger(c.start) && c.start > 0, `${c.row}: start line`).toBe(true)
      expect(c.end >= c.start, `${c.row}: end >= start`).toBe(true)
      expect(c.anchor, `${c.row}: anchor token`).toBeTruthy()
    }
  })

  it('rejects a wrong line WITHOUT touching disk — the resolver is discriminating', () => {
    // The pure control for the byte block below. A synthetic two-line "file": the
    // anchor sits on line 10 only. Reading it at 10 hits; reading the neighbour at
    // 11 misses. Without this, a `windowContains` that always returned true would
    // make every resolution below vacuous.
    const fake = (n: number): string => (n === 10 ? '\tCMPD\tBODNRG\t\tLONG OR SHORT RANGE SEEK' : '\tNOP')
    expect(windowContains(fake, 10, 10, 'BODNRG'), 'the cited line names the row').toBe(true)
    expect(windowContains(fake, 11, 11, 'BODNRG'), 'a wrong line does NOT').toBe(false)
    // Word boundary: BODNRG is not satisfied by the sibling rows BODNDI / BODNVY.
    const sibling = (): string => '\tSUBD\tBODNVY\t\t#$0100\tFALLING NOT TOO FAST?'
    expect(windowContains(sibling, 1, 1, 'BODNRG'), 'BODNVY must not satisfy BODNRG').toBe(false)
    // …and EGGWT is not satisfied by EGGWT2 (the digit-suffixed sibling row).
    const egg = (): string => '\tLDB\tEGGWT2\t\tINITIAL EGG WAITING TIME'
    expect(windowContains(egg, 1, 1, 'EGGWT'), 'EGGWT2 must not satisfy EGGWT').toBe(false)
  })

  it('parses the line number OUT of the prose, and both range shapes', () => {
    // Pinned so nobody "simplifies" resolveCite into a hardcoded table: the gate's
    // teeth are that the number comes from the string it is checking.
    expect(resolveCite("x (…, JOUSTRV4.SRC:3801)")).toEqual({ start: 3801, end: 3801 })
    expect(resolveCite("x (…, JOUSTRV4.SRC:3801-3809)")).toEqual({ start: 3801, end: 3809 })
    expect(resolveCite('enemy.boundr (the bounder down-seek brake)'), 'no cite → null').toBeNull()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// BYTES — only where the vendored tree is present (the AC-3 degradation path).
// ═════════════════════════════════════════════════════════════════════════════
describe.skipIf(!vendoredAvailable)('jt9-57 — every disposition cite RE-OPENS at its ROM line', () => {
  it('the vendored tree really is here (so the skips are not silent)', () => {
    expect(existsSync(join(vendoredRoot, 'JOUSTRV4.SRC'))).toBe(true)
  })

  it('each wired row is NAMED by the code at its cited line (default: the row label; LAVLAV: LNTLAV)', async () => {
    const d = await loadDifficulty()
    const read = (n: number): string => vendoredLine('JOUSTRV4.SRC', n)
    const drifted: string[] = []
    for (const c of citedDispositions(d.ROW_DISPOSITION)) {
      // Window ZERO: measured, every anchor sits exactly on its cited line (the
      // 6809 puts the DYWORD label and its read on one source line). No offset to
      // tolerate; the exact line must name the row.
      if (!windowContains(read, c.start, c.end, c.anchor)) {
        drifted.push(
          `${c.row}: JOUSTRV4.SRC:${c.start}${c.end !== c.start ? `-${c.end}` : ''} does not name ${c.anchor}\n` +
            `    line ${c.start}: ${JSON.stringify(read(c.start))}`,
        )
      }
    }
    expect(drifted.join('\n'), 'a disposition cite that cannot be re-opened is not evidence').toBe('')
  })

  it('the LAVLAV curated anchor is honest — :3727 really loads LNTLAV, the RAM alias', async () => {
    // The one override, pinned directly so it cannot rot into a tautology. The line
    // must load LNTLAV (not the DYWORD label LAVLAV, which is a COMMENT, never read).
    const line = vendoredLine('JOUSTRV4.SRC', 3727)
    expect(line, ':3727 is the lava-troll looker reload').toMatch(/\bLNTLAV\b/)
    expect(line, 'the DYWORD label LAVLAV is NOT what the read names').not.toMatch(/\bLAVLAV\b/)
  })

  it('a WRONG prose cite would redden — the same read shifted 10 lines misses its anchor', async () => {
    // The live teeth proof (complements the pure discriminator above, and stands in
    // for the temporary prose mutation done by hand during development). Take a real
    // cited row, resolve it, and confirm that the SAME anchor lookup at line+10 —
    // the exact effect of typoing the prose number — fails. If this ever passes,
    // the ROM shifted the anchor under a neighbouring line and window-0 needs review.
    const d = await loadDifficulty()
    const read = (n: number): string => vendoredLine('JOUSTRV4.SRC', n)
    const sample = citedDispositions(d.ROW_DISPOSITION).find((c) => c.row === 'BODNRG')
    if (!sample) throw new Error('BODNRG must be a cited wired row')
    expect(windowContains(read, sample.start, sample.end, sample.anchor), 'the real cite hits').toBe(true)
    expect(
      windowContains(read, sample.start + 10, sample.end + 10, sample.anchor),
      'a cite 10 lines off must MISS — proving a wrong number reddens',
    ).toBe(false)
  })

  it('the byte reader is DISCRIMINATING — neighbouring lines differ', () => {
    // The control for vendoredLine itself: without it, a reader that returned the
    // same string for every line would make the whole block vacuous.
    const a = vendoredLine('JOUSTRV4.SRC', 3801)
    expect(a, 'the fixture line this file was written against').toMatch(/\bBODNRG\b/)
    expect(vendoredLine('JOUSTRV4.SRC', 3802), 'a neighbouring line must differ').not.toBe(a)
  })
})
