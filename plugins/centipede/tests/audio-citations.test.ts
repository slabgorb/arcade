// tests/audio-citations.test.ts
//
// Story cp5-2 — REWORK (Reviewer round 1). A line-number citation written into
// a comment is a claim, and it goes stale the moment the file it points into
// changes size. cp5-2's own diff invalidated four of its own: wiring the seam
// grew main.ts from 185 lines to 218, and every `main.ts:NNN` the RED phase had
// written now pointed somewhere else. The worst of them, `main.ts:183`, landed
// on `const board = sim.highScoreTable` — a real, plausible, WRONG line, which
// misleads a reader who checks it instead of stopping them.
//
// tempest and red-baron already gate their ROM citations this way
// (`tests/audit/citations.test.ts` re-opens every cited FILE:LINE), and
// centipede runs the same gate over `docs/rom-study/claims/*.json`. What none of
// them covered is a citation into the clone's OWN source, written in prose
// inside a test file. This is that gate, scoped to the files cp5-2 touched.
//
// ─── HOW IT FAILS, AND WHY THAT IS THE USEFUL PART ───────────────────────────
// Each entry below pairs a citation exactly as it is WRITTEN in the prose with a
// pattern the cited line must match. When main.ts moves, the failure message
// does not merely say "wrong" — it re-locates the anchor and reports the line
// number the citation should now read. Re-anchoring is then a mechanical edit,
// which is the only way this stays maintained.
//
// ─── SCOPE, DELIBERATELY NARROW ──────────────────────────────────────────────
// Only the files cp5-2 wrote or changed are scanned. Three OLDER centipede
// suites carry stale main.ts citations of exactly this kind — measured, and
// filed as a Delivery Finding rather than fixed here, because rewriting
// unrelated pins is a story of its own and this one has already declined that
// once (see the note in tests/audio-wiring.test.ts's predecessor).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const testsDir = dirname(fileURLToPath(import.meta.url))
const gameRoot = join(testsDir, '..')
const mainPath = join(gameRoot, 'src', 'main.ts')

/** main.ts, 1-indexed to match the way citations are written. */
const mainLines = (): string[] => ['', ...readFileSync(mainPath, 'utf8').split('\n')]

/** The cp5-2 files whose prose is scanned. Nothing older is in scope.
 *  (Round 2 added audio-seam-scope.test.ts — it carried bare `:91`/`:192`
 *  refs into main.ts that the sweep could not see, which is also why every
 *  citation must be spelled `main.ts:N`: the bare-colon form is invisible
 *  here and goes stale unwatched.) */
const SCANNED = [
  'audio-wiring.test.ts',
  'audio-gesture-gate.test.ts',
  'audio-hot-path.test.ts',
  'audio-dispatch.test.ts',
  'audio-seam-scope.test.ts',
  'helpers/boot-shell.ts',
]

interface Anchor {
  /** The citation exactly as the prose writes it. */
  cite: string
  /** The line the citation opens on. */
  line: number
  /** What that line must say for the citation to be true. */
  must: RegExp
  /** What a reader is being sent there to see. */
  what: string
}

/**
 * Every LIVE `main.ts:N` citation in the scanned files, and what it claims.
 *
 * Adding a citation to one of those files without adding it here fails the
 * completeness sweep at the bottom — which is the point: an unregistered
 * citation is one nothing re-checks.
 */
const ANCHORS: Anchor[] = [
  {
    cite: 'main.ts:36-45',
    line: 36,
    must: /cp2-13: shell-only `\?wave=N` debug seed/,
    what: 'the ?wave= shell-only debug param the ?seed= override is modelled on',
  },
  {
    cite: 'main.ts:117',
    line: 117,
    must: /^window\.addEventListener\('keydown', unlockAudio\)$/,
    what: "the window 'keydown' gesture binding that unlocks the audio engine",
  },
  {
    cite: 'main.ts:119-122',
    line: 119,
    must: /^canvas\.addEventListener\('click', \(\) => \{$/,
    what: "the canvas 'click' listener, which calls unlockAudio() before lock.request()",
  },
  {
    cite: 'main.ts:128-130',
    line: 128,
    must: /^window\.addEventListener\('keydown', \(e\) => \{$/,
    what: 'the initials keydown listener — a second window keydown, NOT a gesture binding',
  },
  {
    cite: 'main.ts:148',
    line: 148,
    must: /createAttract\(/,
    what: 'where attract is seeded — the line the ?seed= override has to reach',
  },
  {
    cite: 'main.ts:227',
    line: 227,
    // Two lines in main.ts read `requestAnimationFrame(frame)`. The TRAILING
    // one — the link in the chain a thrown exception breaks — is the indented
    // one inside `frame()`; the bare one at column 0 is the bootstrap that
    // starts the chain. The indent is load-bearing in this pattern.
    must: /^ {2}requestAnimationFrame\(frame\)$/,
    what: 'the trailing requestAnimationFrame(frame) INSIDE frame() — the rAF chain link',
  },
  // ── round 2: the four refs below entered the sweep when their prose was
  // re-spelled from the bare `:N` form (which this file cannot see) to
  // `main.ts:N`. Their values had gone stale exactly as this file predicts.
  {
    cite: 'main.ts:229',
    line: 229,
    // The column-0 counterpart of :227 — see the indent note there.
    must: /^requestAnimationFrame\(frame\)$/,
    what: 'the bare bootstrap requestAnimationFrame(frame) that starts the chain',
  },
  {
    cite: 'main.ts:20-21',
    line: 20,
    must: /^import \{ createAudio \} from '\.\/shell\/audio'$/,
    what: 'the two imports the wiring adds — createAudio, then playEventSounds',
  },
  {
    cite: 'main.ts:102',
    line: 102,
    must: /^const audio = createAudio\(\)$/,
    what: 'where main.ts builds the one engine, at boot',
  },
  {
    cite: 'main.ts:203',
    line: 203,
    must: /^ {6}playEventSounds\(audio, sim\.events\)$/,
    what: 'the dispatch call inside the pump callback — once per stepped frame',
  },
]

/**
 * Citations that appear in the prose as HISTORY — "this used to say X, and X
 * was wrong". They must not be re-checked as live claims, and the sweep below
 * would otherwise demand an anchor for a line the prose is explicitly
 * disowning.
 */
const RETIRED = new Set(['main.ts:183', 'main.ts:84-86', 'main.ts:92-94'])

/** Where else in main.ts a given anchor pattern matches, for the fix hint. */
const relocate = (must: RegExp): number[] => {
  const lines = mainLines()
  const hits: number[] = []
  for (let n = 1; n < lines.length; n++) if (must.test(lines[n])) hits.push(n)
  return hits
}

describe('cp5-2 — every main.ts citation in the audio suites still says what it claims', () => {
  it.each(ANCHORS)('$cite — $what', ({ cite, line, must, what }) => {
    const lines = mainLines()
    expect(
      line,
      `${cite} points past the end of main.ts (${lines.length - 1} lines)`,
    ).toBeLessThan(lines.length)

    const actual = lines[line]
    const found = relocate(must)
    const hint =
      found.length === 1
        ? `It is now at main.ts:${found[0]} — re-anchor the citation (and this table) to that.`
        : found.length === 0
          ? 'It is nowhere in main.ts any more — the citation describes code that is gone.'
          : `The pattern now matches ${found.length} lines (${found.join(', ')}) — the anchor is ambiguous.`

    expect(
      must.test(actual),
      `${cite} claims to point at ${what}, but main.ts:${line} reads:\n    ${actual}\n  ${hint}`,
    ).toBe(true)
  })

  it('every main.ts citation in the cp5-2 files is registered above', () => {
    // The hole this closes: the table can be right about six citations while a
    // seventh, written next week, drifts unwatched. A citation nothing
    // re-resolves is exactly the defect this file exists for.
    const unregistered: string[] = []
    for (const file of SCANNED) {
      const src = readFileSync(join(testsDir, file), 'utf8')
      for (const m of src.matchAll(/main\.ts:(\d+(?:-\d+)?)/g)) {
        const cite = `main.ts:${m[1]}`
        if (RETIRED.has(cite)) continue
        if (ANCHORS.some((a) => a.cite === cite)) continue
        unregistered.push(`${file} — ${cite}`)
      }
    }
    expect(
      [...new Set(unregistered)],
      'these main.ts citations are checked by nothing. Add an entry to ANCHORS (with the ' +
        'pattern the cited line must match), or to RETIRED if the prose is quoting a citation ' +
        'it is explicitly disowning',
    ).toEqual([])
  })

  it('the RETIRED list holds only citations the prose disowns, not live ones', () => {
    // A retired entry is a licence to skip a check, so it must not be reachable
    // by accident: every one of these has to be genuinely wrong about main.ts
    // as it stands. If a retired citation starts being TRUE again — main.ts
    // shifting back, or someone recycling the number — it should be anchored,
    // not exempted.
    const lines = mainLines()
    const live: string[] = []
    for (const cite of RETIRED) {
      const n = Number(cite.slice('main.ts:'.length).split('-')[0])
      // Retired because the wiring diff moved main.ts past them: :183 landed on
      // a real-but-wrong statement, :84-86 and :92-94 on comment and blank
      // lines. What none of them may be is a listener registration or the rAF
      // chain link — the things they were originally cited FOR.
      const text = lines[n] ?? ''
      if (/addEventListener|requestAnimationFrame\(frame\)/.test(text)) {
        live.push(`${cite} -> ${text.trim()}`)
      }
    }
    expect(
      live,
      'a citation on the RETIRED list points at exactly the kind of line it was retired for ' +
        'being wrong about — anchor it instead of exempting it',
    ).toEqual([])
  })
})
