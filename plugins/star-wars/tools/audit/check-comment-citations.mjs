// Re-open the `<file>:<line-span>` citations written into ORDINARY SOURCE COMMENTS.
//
// `check-citations.mjs` (beside this file) already re-opens citations, but only the
// structured ones in `docs/audit/findings/*.json`, where each carries an explicit
// `{file, line, verbatim}`. Nothing re-opened a span embedded in a hand-written
// comment, which is why the twelve sw8-18 defects survived two green review rounds
// and one of them was invalidated by its own commit.
//
// == WHAT THIS CATCHES, AND WHAT IT CANNOT ==========================================
// See `UNCATCHABLE` at the bottom — it is exported so a test can assert the honest
// scope rather than let a green run be read as "the citations are all true".
//
// == THE ASSOCIATION RULE ===========================================================
// A verbatim check needs to know WHICH quote belongs to a citation. Measured over
// star-wars before this was written:
//
//   nearest quoted string within 240 chars   ->  267 candidates, 184 mismatches
//   nearest backticked fragment within 200   ->  265 candidates, 116 mismatches
//   IMMEDIATELY adjacent (<= 4 punctuation)  ->  129 candidates,  17 mismatches
//
// The loose rules overwhelmingly capture the AUTHOR'S OWN PROSE rather than a quote
// from the cited file, so a guard built on them can never go green. Only immediate
// adjacency is tractable — and it is the shape the codebase already writes:
//
//     (`LDD FRAME / JSR LSLD7 / STD ST.UX`, RETIRED:WSMAIN.MAC:2525-2528)
//     "…the Death Star is entirely out of frame" (RETIRED:design.md:47-48)
//
// Both examples above are DISOWNED with the `RETIRED:` marker, and every other citation
// in this file is too. That is deliberate and it must stay: a file that teaches the
// citation format by exhibiting it is full of citation-SHAPED text that asserts nothing.
// Now that `tools/` is in scope this file is scanned like any other, and re-anchoring
// those exhibits to whatever currently happens to be true would delete the very thing
// they illustrate. Note the marker must sit IMMEDIATELY before the filename: writing an
// elision between the two puts an ellipsis where the parser expects the name, and the
// disowning silently fails, so the full name is spelled out above.
//
// Usage:  node tools/audit/check-comment-citations.mjs [rootDir]
// Exits non-zero and prints every stale citation, each with the line it moved to.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, extname, basename, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

/** A file may opt out entirely. Required, not a convenience: this checker's own test
 *  suite is full of deliberately-broken citations (the mutation fixtures), and it sits
 *  inside the scanned tree, so without an opt-out the guard reports its own fixtures
 *  and can never be green. */
export const IGNORE_PRAGMA = 'citation-guard: ignore-file'

/**
 * Does `raw` opt itself out? The pragma must OPEN a leading comment.
 *
 * This used to be a bare `raw.includes(IGNORE_PRAGMA)`, which fired on any MENTION —
 * inside a backticked example, or in prose describing the pragma — and silently dropped
 * the whole file from the scan. `docs/**\/specs` is in scope, so the first spec that
 * documented this guard would have retired it. A silent whole-file skip is the worst
 * failure mode a completeness tool has.
 *
 * "In a leading comment" is NOT tight enough, and the counter-example is the exact
 * sentence above: `// The guard honours a citation-guard: ignore-file pragma.` is itself
 * a leading comment. So the pragma must be the first thing the comment SAYS, once the
 * leader is stripped — which is how both files that legitimately opt out already write
 * it. Scanning only the head also means a trailing comment cannot mute a whole file.
 */
export function hasPragma(raw) {
  for (const line of raw.split('\n').slice(0, PRAGMA_HEAD_LINES)) {
    const t = line.trim()
    if (t === '') continue
    const body = t.replace(/^(?:\/\/+|\/\*+|\*|#|>)\s*/, '')
    // A non-comment line ends the header: code above the pragma means it is not leading.
    if (body === t) return false
    if (body.startsWith(IGNORE_PRAGMA)) return true
  }
  return false
}

/** How far into a file the opt-out may sit. Enough for a shebang or a title line to
 *  precede it, far too few for the pragma to hide at the bottom of a module.
 *
 *  Two edges worth knowing, both measured rather than reasoned:
 *
 *  - It counts LINES, not comment lines, and blanks are counted. A file whose first five
 *    lines are blank cannot opt out at all. Deliberate — the window is meant to be the
 *    top of the file, not the top of its first comment block, so that a long opening
 *    prose block cannot carry opt-out authority throughout (see the test named "the
 *    pragma DEEP inside a long opening comment block does not opt out").
 *  - `>` counts as a comment leader, so a markdown BLOCKQUOTE within the window opts a
 *    `.md` file out. `docs/**\/specs` is scanned, so a spec that exhibits the pragma as a
 *    blockquote example in its first five lines retires itself — a much narrower survival
 *    of the defect this anchoring exists to kill, but not zero. A fenced code block is
 *    safe: the fence line carries no leader, so the scan stops there. If a spec ever
 *    needs to show the pragma near its top, indent it or fence it. */
const PRAGMA_HEAD_LINES = 5

/** Prose sometimes quotes a citation in order to DISOWN it ("this used to say X, and X
 *  was wrong"). Re-opening those would redden the very edit that retires them. */
const RETIRED_MARK = 'RETIRED:'

/** Exported so a test can assert the scanned surface rather than assume it. `.mts` is
 *  here because `extname('check-comment-citations.d.mts')` is `.mts`, not `.ts` — without
 *  it this tool's own type declarations stay invisible even once `tools/` is in scope,
 *  and one of them is where the dead `fromFile` option was declared. */
export const SCAN_EXT = ['.ts', '.tsx', '.mjs', '.md', '.mts']

/** Comment leaders and blockquote markers break a quote across lines. Matching the
 *  stored bytes therefore misses the sentence a human reads, the assertion silently
 *  passes, and the stale claim survives. Rejoin before doing anything else. */
const unwrap = (s) => s.replace(/\n[ \t]*(?:\/\/+|\*|>)[ \t]?/g, ' ')

/** Markdown emphasis sits INSIDE quoted prose in the design specs — the observation
 *  reads `the **Death Star is entirely out of frame**` on disk but is quoted without
 *  the asterisks — so it has to come out before comparing against a MARKDOWN target.
 *
 *  It must NOT come out for a ROM target: `*` is the assembler's multiply operator, and
 *  stripping it turns `SUBD #6*120.*2` into `6120.2`, so a correct citation stops
 *  matching its own quote. Emphasis-stripping is therefore keyed on the cited file. */
const norm = (s, stripEmphasis = false) =>
  (stripEmphasis ? s.replace(/[*_]{1,3}/g, '') : s).replace(/\s+/g, ' ').trim().toUpperCase()

/**
 * Delimited spans are found by SCANNING PAIRS from the start of the text, never by a
 * regex anchored at the citation. A naive /`([^`]+)`/ pairs the CLOSING backtick of one
 * identifier with the OPENING of the next, so "`ST.UX` is the STARFIELD's register"
 * reads as a quote — which produced most of the false positives measured above.
 */
function delimitedSpans(text) {
  const out = []
  for (const d of ['`', '"']) {
    let i = 0
    for (;;) {
      const a = text.indexOf(d, i)
      if (a < 0) break
      const b = text.indexOf(d, a + 1)
      if (b < 0) break
      if (b - a > 4) out.push({ start: a, end: b + 1, text: text.slice(a + 1, b) })
      i = b + 1
    }
  }
  return out
}

const isRomFile = (f) => /\.(MAC|XXX)$/i.test(f)

// A filename needs a non-empty STEM, and it may not begin mid-token. Both halves are
// required and neither works alone — this cost two attempts, so the reasoning is kept:
//
//   without the leading class   a GLOB is a citation: `**/*.test.mjs` yields the
//                               stem-less name `.test.mjs`, which resolves to nothing
//                               and is reported as a dangling reference
//   without the lookbehind      the class just re-anchors one character right and
//                               yields the same name minus its dot — still a phantom,
//                               only the error message changes
//   with only the lookbehind    a SPACE-preceded bare extension survives, which is what
//                               a comment-wrapped sentence leaves at its next line start
//
// Six such phantoms existed across the tree, none of them a citation anybody wrote.
const FILE_RE = String.raw`(?<![.*\w])[A-Za-z0-9_-][A-Za-z0-9_./-]*[A-Za-z0-9_-]\.(?:MAC|XXX|ts|tsx|mjs|md)`
const CITE_RE = new RegExp(
  String.raw`(${RETIRED_MARK}\s*\`?)?(${FILE_RE})(?::(\d+)(?:-(\d+))?)?` +
    String.raw`|(${RETIRED_MARK}\s*\`?):?(\d+)-(\d+)`,
  'g',
)

/**
 * Pull every citation out of a block of source text.
 *
 * Three forms, because the sw8-18 defects used all three: a qualified `<file>:<span>`,
 * a BARE `:<span>` that inherits the nearest preceding filename (gameRules.ts wrote
 * "`.REPT 0`, RETIRED::2273-2290" with `WSMAIN.MAC` on the line above), and a bare `<file>`
 * with no line at all (a reference to a test file that had been deleted).
 */
export function extractCitations(raw) {
  const text = unwrap(raw)
  const spans = delimitedSpans(text)
  const out = []
  let lastFile = null

  // A bare `:N-M` is only a citation if some filename precedes it; otherwise every
  // ":123" in ordinary prose would become one.
  const bareRe = new RegExp(String.raw`(${RETIRED_MARK}\s*\`?)?:(\d+)-(\d+)`, 'g')
  const qualified = []
  for (const m of text.matchAll(CITE_RE)) {
    if (!m[2]) continue
    qualified.push({ index: m.index, len: m[0].length, retired: Boolean(m[1]), file: m[2], start: m[3], end: m[4] })
  }
  const bare = []
  for (const m of text.matchAll(bareRe)) {
    // skip the ":N" that is part of a qualified citation we already took
    if (qualified.some((q) => m.index >= q.index && m.index < q.index + q.len)) continue
    bare.push({ index: m.index, len: m[0].length, retired: Boolean(m[1]), start: m[2], end: m[3] })
  }

  const gapOk = (t) => /^[\s,()`"';:-]*$/.test(t)
  // A quote is a FRAGMENT of the cited file, so it contains whitespace. A single bare
  // token adjacent to a citation is almost always one of OUR identifiers naming the
  // thing the citation explains — `state.ts \`FIRE_MASK\`, WSCPU.MAC:736` — and
  // checking it against the ROM reports a correct citation as stale. Measured: this
  // one filter is the difference between 4 reported defects in gameRules.ts and 2.
  // `?.text` yields undefined, not null, when no span is adjacent — so this guards on
  // presence rather than on `!== null`.
  const isFragment = (s) => typeof s === 'string' && /\s/.test(s.trim())
  // Returns BOTH the usable quote and the one that was rejected. Reporting only the
  // former collapses two different situations — "nothing was adjacent" and "something
  // was adjacent and we declined to check it" — into an identical `null`, so nothing
  // downstream can tell them apart. That is why the single-token blind spot reads as a
  // separate limitation from the range-only class when it is a SUBSET of it (see
  // UNCATCHABLE), and why no census could measure the two independently.
  const quoteFor = (index, len) => {
    const before = spans.find((sp) => sp.end <= index && index - sp.end <= 4 && gapOk(text.slice(sp.end, index)))?.text
    if (isFragment(before)) return { quote: before, dropped: null }
    const after = spans.find(
      (sp) => sp.start >= index + len && sp.start - (index + len) <= 4 && gapOk(text.slice(index + len, sp.start)),
    )?.text
    if (isFragment(after)) return { quote: after, dropped: null }
    const adjacent = typeof before === 'string' ? before : typeof after === 'string' ? after : null
    return { quote: null, dropped: adjacent }
  }

  let lastRom = null
  const romsSeen = []
  for (const c of [...qualified, ...bare].sort((a, b) => a.index - b.index)) {
    let file, isBare = false
    const { quote, dropped } = quoteFor(c.index, c.len)
    if (c.file) {
      file = c.file
      lastFile = file
      if (/\.(MAC|XXX)$/i.test(file)) {
        lastRom = file
        if (!romsSeen.includes(file)) romsSeen.unshift(file)
      }
    } else {
      // "Nearest preceding filename" is wrong the moment prose names a second file in
      // between. tie-status.ts cites `math3d.ts:171-186` and then lists bare
      // `:607-608` spans that belong to the WSCPU.MAC named three lines earlier — the
      // nearest-name rule attributes them to math3d and reports them out of range.
      // An ASSEMBLER quote therefore inherits the nearest preceding ROM file.
      const asm = typeof quote === 'string' && tokensOf(quote).length > 0
      file = (asm ? (lastRom ?? lastFile) : lastFile)
      if (!file) continue
      isBare = true
    }
    out.push({
      file,
      start: c.start ? Number(c.start) : null,
      end: c.start ? Number(c.end ?? c.start) : null,
      quote,
      droppedQuote: dropped,
      bare: isBare,
      retired: c.retired,
      index: c.index,
      // Every ROM file named before this point, most recent first. The nearest name is
      // only a guess: a parenthetical aside ("…and identically WSGUNS.MAC:925-948 for
      // the guns") sits between an anchor and the bare spans that belong to it, so the
      // checker re-picks from these by which one the span actually fits.
      candidates: isBare ? [...romsSeen] : [],
    })
  }
  return out
}

const treeIndex = new Map()
function indexOf(root) {
  if (treeIndex.has(root)) return treeIndex.get(root)
  const idx = new Map()
  const walk = (d) => {
    if (!existsSync(d)) return
    for (const e of readdirSync(d)) {
      if (e === 'node_modules' || e === '.git') continue
      const p = join(d, e)
      if (statSync(p).isDirectory()) walk(p)
      else if (!idx.has(basename(p))) idx.set(basename(p), p)
    }
  }
  walk(root)
  treeIndex.set(root, idx)
  return idx
}

/**
 * Resolve a cited filename to a real path.
 *
 * A PATH-qualified citation resolves by its path before any basename lookup: both
 * `src/shell/input.ts` (51 lines) and a shorter `input.ts` exist, and a basename-only
 * resolver reports `src/shell/input.ts:45` out of range against the wrong file.
 *
 * Several modules a star-wars comment cites do not live in the plugin at all —
 * `math3d.ts`, `rng.ts` and `loop.ts` are `@shared/*` under `src/shared/` at the
 * monorepo root, and `vite.config.ts` and `sprint/**` sit at the root too. Searching
 * only the plugin reports all of them as dangling.
 */
function resolve(file, { swRoot, romDir, repoRoot }) {
  if (/\.(MAC|XXX)$/i.test(file)) {
    const p = join(romDir, basename(file))
    return existsSync(p) ? p : null
  }
  const roots = [swRoot, repoRoot ?? join(swRoot, '..', '..')]
  if (file.includes('/')) {
    for (const r of roots) {
      const p = join(r, file)
      if (existsSync(p) && statSync(p).isFile()) return p
    }
  }
  for (const r of roots) {
    const hit = indexOf(r).get(basename(file))
    if (hit) return hit
  }
  return null
}

/** Assembler directives start with `.` and operands with `#`/`$`; a token filter
 *  anchored on [A-Z] silently drops `.REPT`, leaving too few tokens to compare. Prose
 *  is excluded by requiring the token to be upper-case in the ORIGINAL text — after
 *  upper-casing, "the" and "LDD" are indistinguishable. */
const tokensOf = (q) =>
  q
    .split(/[\s/]+/)
    .filter((t) => /^[.#$]?[A-Z0-9][A-Za-z0-9$.#,()+*_-]*$/.test(t) && t === t.toUpperCase() && t.length > 1)
    // `$3F00` in our prose is `#3F00` in the source — the sigil marks "hex" for a
    // reader and "immediate" for the assembler. Comparing them literally reports a
    // correct citation as stale, so the leading sigil comes off both sides.
    .map((t) => t.toUpperCase().replace(/^[#$]/, ''))

/**
 * Re-open every citation in `raw` and return human-readable errors (empty when clean).
 *
 * Two failure modes: a cited file that does not exist, and a cited span that no longer
 * contains the verbatim quoted next to it. A stale span is reported WITH THE LINE IT
 * MOVED TO — a gate that only says "wrong" buys one clean round, while one that says
 * where makes re-anchoring a mechanical edit.
 */
export function checkCitations(raw, opts) {
  const errs = []
  if (hasPragma(raw)) return errs

  for (const c of extractCitations(raw)) {
    if (c.retired) continue
    if (c.bare && c.start !== null && c.candidates.length > 1) {
      // The nearest ROM name is only a guess — a parenthetical aside ("…and identically
      // WSGUNS.MAC:925-948 for the guns") can sit between an anchor and the bare spans
      // that belong to it. Prefer the candidate whose span actually CONTAINS the quote,
      // which verifies rather than guesses; fall back to the nearest one the span fits.
      const linesOf = (f) => {
        const p = resolve(f, opts)
        return p ? readFileSync(p, 'utf8').split('\n') : null
      }
      const verifies = c.candidates.find((f) => {
        const ls = linesOf(f)
        if (!ls || ls.length < c.end || !c.quote) return false
        const t = norm(ls.slice(c.start - 1, c.end).join(' '), !isRomFile(f))
        const tk = tokensOf(c.quote)
        return tk.length > 0 && tk.filter((x) => t.includes(x)).length / tk.length >= 0.75
      })
      const fits = c.candidates.find((f) => (linesOf(f)?.length ?? 0) >= c.end)
      c.file = verifies ?? fits ?? c.file
    }
    const target = resolve(c.file, opts)
    if (!target) {
      errs.push(`${c.file}: cited file does not exist`)
      continue
    }
    if (c.start === null) continue

    const lines = readFileSync(target, 'utf8').split('\n')
    const label = `${c.file}:${c.start}${c.end !== c.start ? `-${c.end}` : ''}`
    if (c.start < 1 || c.end > lines.length) {
      errs.push(`${label}: span out of range — ${basename(target)} has ${lines.length} lines`)
      continue
    }
    if (!c.quote) continue

    const md = !isRomFile(c.file)
    const needle = norm(c.quote, md)
    const toks = tokensOf(c.quote)

    // A ROM citation's verbatim is ASSEMBLER. When the adjacent quote carries no
    // upper-case source token it is our own paraphrase of what the ROM does — the
    // comments are full of them (`gdSeq >= seq` beside a WSGRND span, `M$AX ≥ $3F00`
    // beside a WSMAIN one) — and checking those against the source reports correct
    // citations as stale. Prose quotes ARE legitimate against markdown and TS targets,
    // which is how item 7's longplay observation is caught, so the rule splits on the
    // cited file rather than on the quote alone.
    const isRom = !md
    // …and it must be PREDOMINANTLY assembler. `gdSeq >= .C` contains one source-shaped
    // token among three words and is plainly our own paraphrase of the ROM's test;
    // checking it against WSGRND reports a correct citation as stale.
    const words = c.quote.trim().split(/[\s/]+/).filter(Boolean).length
    if (isRom && (toks.length < 1 || toks.length / words < 0.5)) continue
    if (!isRom && toks.length < 1 && needle.length < 6) continue
    // Substring first; the token ratio is the fallback that tolerates the ROM's column
    // whitespace and the `/` separators comments use to join consecutive instructions.
    const holds = (t) =>
      t.includes(needle) || (toks.length >= 1 && toks.filter((x) => t.includes(x)).length / toks.length >= 0.75)

    // A SINGLE-LINE citation conventionally anchors the START of a quoted run: this
    // codebase writes `LDA BS.WAV / LSRA / IFCC`, WSMAIN.MAC:1868 for three
    // consecutive instructions. Demanding the whole run inside one line reports those
    // as stale. A range citation is taken exactly as written.
    const runLen = c.quote.split('/').length
    const hi = c.end === c.start ? Math.min(lines.length, c.start + runLen - 1) : c.end
    if (holds(norm(lines.slice(c.start - 1, hi).join(' '), md))) continue

    // Re-locate. WIDTH is the outer loop so the tightest window wins: scanning `i`
    // first matches a wide window whose START sits above the real anchor and reports
    // that start — off by the window width, which is the very defect this prevents.
    let at = null
    const width = Math.max(1, c.end - c.start + 1)
    for (let w = 1; w <= width && at === null; w++) {
      for (let i = 0; i + w <= lines.length; i++) {
        if (holds(norm(lines.slice(i, i + w).join(' '), md))) {
          at = i + 1
          break
        }
      }
    }
    errs.push(
      `${label}: quoted verbatim is not in the cited span` +
        (at ? ` — it is now at ${c.file}:${at}; re-anchor the citation to that.` : ' (and is nowhere in the file)'),
    )
  }
  return errs
}

/**
 * The scanned surface, exported so it can be asserted rather than assumed.
 *
 * `tools` is here because this checker could not see its OWN directory: not its own
 * citations, nor those of `check-citations.mjs`, `reanchor-citations.mjs` or
 * `linked-modules.mjs`. That was not hypothetical — at sw8-18's review the module header
 * cited a design spec two lines off, i.e. the exact defect class the tool exists to
 * catch, sitting inside the tool, invisible by construction.
 */
export function defaultRoots(swRoot) {
  return [
    join(swRoot, 'src'),
    join(swRoot, 'tests'),
    join(swRoot, 'docs', 'superpowers', 'specs'),
    join(swRoot, 'tools'),
  ]
}

/**
 * Scan the plugin's sources, tests, design specs and tooling.
 *
 * `onSkip` is called with every file the opt-out pragma drops. It defaults to writing to
 * stderr rather than to nothing: a file that silently vanishes from a completeness check
 * is indistinguishable from a file that passed it.
 */
export function checkTree({ swRoot, romDir, repoRoot, roots, onSkip }) {
  const dirs = roots ?? defaultRoots(swRoot)
  const files = []
  const walk = (d) => {
    if (!existsSync(d)) return
    for (const e of readdirSync(d)) {
      if (e === 'node_modules') continue
      const p = join(d, e)
      if (statSync(p).isDirectory()) walk(p)
      else if (SCAN_EXT.includes(extname(p))) files.push(p)
    }
  }
  dirs.forEach(walk)

  const notify = onSkip ?? ((f) => console.error(`citation-guard: skipping ${relative(swRoot, f)} (opt-out pragma)`))
  const errs = []
  for (const f of files) {
    const raw = readFileSync(f, 'utf8')
    // Hoisted out of checkCitations so the skip can be ANNOUNCED. Left inside, the only
    // caller that knows a filename never learns the file was dropped.
    if (hasPragma(raw)) {
      notify(f)
      continue
    }
    for (const e of checkCitations(raw, { swRoot, romDir, repoRoot })) {
      errs.push(`${relative(swRoot, f)}: ${e}`)
    }
  }
  return errs
}

/**
 * The honest scope, exported so it can be asserted rather than assumed.
 *
 * A green run from this checker means "cited spans resolve and their adjacent quotes
 * are still inside them". It does NOT mean the citations are true, and the difference
 * is not academic: the largest single class of sw8-18's defects had a CORRECT span.
 */
export const UNCATCHABLE = [
  'This guard catches three of the twelve sw8-18 items: a dangling file reference (item 4),',
  'a span whose immediately-adjacent verbatim moved out of it (item 7), and the bare-colon',
  'span form (item 8). It is BLIND to the other nine, which are prose defects whose spans are',
  'correct or absent: a false .SBTTL attribution, an omitted routine, a duplicate import, a',
  'wrong fixture value, a stale paragraph, a stale forward reference, and the sole-readership',
  'condensation — whose span, WSSTAR.MAC:98, is itself correct, so this guard passes it while',
  'the sentence wrapped around it is false. It also cannot see a span that brackets the right',
  'text for the wrong reason. Read a green run as "cited spans resolve and their adjacent',
  'quotes are still inside them", never as "the citations are true".',
  'THE TWO BIGGEST LIMITS ARE NOT ON THAT LIST, and they are much larger than it.',
  'Measured over the scanned tree, 73.4% of line-span citations get existence and range',
  'checking ONLY — no verbatim is ever compared, because no usable quote sits adjacent to',
  'them. So three quarters of a green run means "the file exists and the number is inside',
  'it", nothing more. The single-token case is a SUBSET of that same population rather',
  'than an additional limitation: an adjacent quote of one bare token (`TGPROB`) is',
  'rejected as one of OUR identifiers rather than a fragment of the cited file, and the',
  'citation then falls into the range-only class. Counting the two separately overstates',
  'what is blind. Both follow from rules that are individually correct — a quote must',
  'contain whitespace or our own symbol names get checked against the ROM — which is why',
  'they are limits to disclose rather than bugs to fix.',
].join(' ')

// CLI: `node tools/audit/check-comment-citations.mjs`
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const swRoot = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const repoRoot = join(swRoot, '..', '..')
  const errors = checkTree({ swRoot, romDir: join(repoRoot, 'reference', 'atari-source', 'star-wars-1983'), repoRoot })
  for (const e of errors) console.error(e)
  console.error(`\n${errors.length} stale citation(s).`)
  process.exit(errors.length ? 1 : 0)
}
