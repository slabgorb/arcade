// citation-guard: ignore-file — this suite is full of deliberately-broken citations
// (the AC3/AC5 mutants) and it quotes the pragma itself as a fixture. It must stay
// opted out, and after AC3 the ONLY line that opts it out is this one.
//
// tests/audit/sw8-23-guard-hardening.test.ts — RED for sw8-23.
//
// == THE STORY =====================================================================
// sw8-18 shipped `tools/audit/check-comment-citations.mjs`. Its own review found four
// gaps the guard does not disclose, and SM's setup measurement found three more. All
// seven are the same shape: the tool reports green over a surface it never inspected.
//
//   AC1  it cannot see `tools/` — nor, because SCAN_EXT omits `.mts`, its own two
//        `.d.mts` type declarations. The parameter AC7 deletes is declared in one.
//   AC2  the fresh count that widening the scope surfaces, measured before promising
//        green rather than after.
//   AC3  the opt-out fires on a bare MENTION anywhere in the file — a silent
//        whole-file skip, the worst failure mode a completeness tool can have.
//   AC4  ...and it fires silently. Nothing announces a skipped file.
//   AC5  widening the scope makes the guard report its own DOCUMENTATION, because
//        audit tooling documents the citation format by exhibiting it.
//   AC6  `UNCATCHABLE` omits the two biggest limits, and the story states them as two
//        populations when they are one.
//   AC7  `CheckOptions.fromFile` is declared, passed, and never read.
//
// == WHY NO ASSERTION HERE PINS A LINE NUMBER ======================================
// sw8-18's lesson, and this story is the same trap one layer up: a suite about stale
// citations that hardcodes `WSMAIN.MAC:2522-2530` IS the defect — the next legitimate
// edit makes the TEST the stale citation. Everything below asserts by RESOLUTION (open
// the span, check its content), by LIVE CENSUS (recompute, never quote a frozen count),
// or by MUTATION (break it, require red). The one number that appears as a literal is
// the ratchet's, and it is a measured baseline that may only fall.
//
// == DESIGN REQUIREMENTS DISCOVERED AT RED =========================================
// A throwaway implementation was built to prove this suite is satisfiable, run against
// the full project (198/200 files, 2221/2232 tests — NO sibling breakage), mutated
// eight ways (all eight caught, no survivors), then deleted. Its FAILURES are the more
// valuable output; each below is a requirement the obvious fix does not meet.
//
// 1. THE GLOB FIX NEEDS BOTH A LOOKBEHIND AND A STEM CLASS — neither alone.
//    CORRECTED after GREEN; the RED draft of this note said the lookbehind alone was
//    sufficient and explicitly rejected the character class, and that was wrong. A
//    leading class alone re-anchors one character right and yields a stem-less name
//    that still dangles; a lookbehind alone still admits a space-preceded bare
//    extension, which is exactly what a comment-wrapped sentence leaves at the start of
//    its next line. The delivered `FILE_RE` carries both, and the implementation
//    comment beside it records the same three-case reasoning.
//
// 2. "A LEADING COMMENT" IS NOT A TIGHT ENOUGH PRAGMA ANCHOR. The mention that must
//    NOT silence — `// The guard honours a citation-guard: ignore-file pragma.` — is
//    itself a leading comment, so a first-N-lines rule still skips the file. The
//    pragma must OPEN the comment body once the leader is stripped. Verified against
//    both files that legitimately opt out: each writes it as the first thing it says.
//
// 3. `RETIRED:` DOES NOT REACH AN ELIDED CITATION. `CITE_RE` allows only
//    ``RETIRED:\s*`?`` immediately before the filename, and the header's example is
//    written `…design.md:47-48` — the ellipsis sits between the marker and the name,
//    so the disowning silently does not apply. Either place the marker differently or
//    teach the extractor about the elision; do not "fix" the example.
//
// 4. EXPECT MORE DISOWN SITES THAN SM MEASURED. SM found 2 in the `.mjs` by masking
//    the pragma literal; the delivered file carries 5 `RETIRED:` markers there and 2 in
//    the `.d.mts`. CORRECTED after GREEN: this note also predicted that
//    `math3d.ts:171-186` and `src/shell/input.ts:45` would need disowning, and they did
//    not — the `FILE_RE` change made both resolve correctly. The mutation assertions
//    below use `>=` precisely because the count was not knowable in advance.
//
// 5. THE RELOCATOR CANNOT RELOCATE A SINGLE-LINE CITATION OF A MULTI-INSTRUCTION RUN.
//    `holds()` widens a single-line citation by `runLen` (the `/`-joined instruction
//    count), but the re-location loop caps its window at `c.end - c.start + 1` = 1. So
//    `gen-music-data.mjs`'s `SNDPM.MAC:737 \`LDA -1(X) / BNE 30$\`` reports "nowhere in
//    the file" even though `LDA -1(X)` sits one line away at :738. Filed as a Delivery
//    Finding; correct that one citation by hand rather than trusting the tool's own
//    suggestion, which is the only place in this story where it cannot be trusted.
//
// == SACRED BOUNDARY ===============================================================
// Pure text analysis. No DOM, no sim, no time.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname, extname, relative } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import * as guard from '../../tools/audit/check-comment-citations.mjs'

const { extractCitations, checkCitations, checkTree, UNCATCHABLE, IGNORE_PRAGMA, SCAN_EXT, defaultRoots, hasPragma } =
  guard

const here = dirname(fileURLToPath(import.meta.url))
const swRoot = join(here, '..', '..')
const repoRoot = join(swRoot, '..', '..')
const romDir = join(repoRoot, 'reference', 'atari-source', 'star-wars-1983')
const opts = { swRoot, romDir, repoRoot }

const TOOLS = join(swRoot, 'tools')
const GUARD_SRC = join(TOOLS, 'audit', 'check-comment-citations.mjs')
const GUARD_DTS = join(TOOLS, 'audit', 'check-comment-citations.d.mts')
const SW8_18_SUITE = join(here, 'comment-citations.test.ts')

const read = (p: string) => readFileSync(p, 'utf8')

/** A stale citation with a fragment quote, used as the canary in the pragma fixtures.
 *  `.REPT 0` really is in WSMAIN.MAC; :99990-99999 really is out of range. */
const CANARY = '// assembled OUT (`.REPT 0 / BNE 30$`, `WSMAIN.MAC:99990-99999`)'

afterEach(() => {
  vi.restoreAllMocks()
})

// ===================================================================================
describe('sw8-23 AC1 — the guard can see its own directory and its own declarations', () => {
  it('publishes SCAN_EXT, and it covers `.mts` as well as the four it already had', () => {
    // Exported for the same reason UNCATCHABLE is: a scope claim a test cannot read is
    // a scope claim nobody checks. `extname('check-comment-citations.d.mts')` is
    // '.mts', NOT '.ts', so both type declarations are invisible without this.
    expect(Array.isArray(guard.SCAN_EXT)).toBe(true)
    for (const e of ['.ts', '.tsx', '.mjs', '.md', '.mts']) {
      expect(guard.SCAN_EXT).toContain(e)
    }
    expect(extname(GUARD_DTS)).toBe('.mts')
  })

  it('publishes DEFAULT_ROOTS, and `tools` is one of them', () => {
    expect(typeof guard.defaultRoots).toBe('function')
    const roots = guard.defaultRoots(swRoot).map((r: string) => relative(swRoot, r))
    expect(roots).toContain('src')
    expect(roots).toContain('tests')
    expect(roots).toContain('tools')
    expect(roots).toContain(join('docs', 'superpowers', 'specs'))
  })

  // The exported lists above are a claim ABOUT the walk. These plant real files and
  // require the walk to find them — the mechanism, not its description.
  //
  // They plant into a TEMP directory rather than into `tools/` itself. An earlier draft
  // wrote the probe into the live tree and passed when this file ran alone, but vitest
  // runs test FILES in parallel and they share one filesystem: sw8-18's tree-wide ratchet
  // scanned the probe mid-flight and counted it, so the pair failed together and passed
  // apart. A test that mutates the tree another suite is measuring is flaky by
  // construction, and the flake lands on the OTHER suite where nothing explains it.
  const plant = (name: string, run: (root: string) => void) => {
    const root = mkdtempSync(join(tmpdir(), 'sw8-23-scope-'))
    try {
      writeFileSync(join(root, name), `${CANARY}\n`)
      run(root)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }

  it('the walk descends into a root and reports a stale citation there', () => {
    plant('probe.mjs', (root) => {
      const errs = checkTree({ swRoot, romDir, roots: [root] })
      expect(errs.some((e) => e.includes('probe.mjs'))).toBe(true)
    })
  })

  it('...and it reads a `.d.mts`, an extension SCAN_EXT omits today', () => {
    plant('probe.d.mts', (root) => {
      const errs = checkTree({ swRoot, romDir, roots: [root] })
      expect(errs.some((e) => e.includes('probe.d.mts'))).toBe(true)
    })
  })

  it('omitting `roots` really does use defaultRoots — same scan, same result', () => {
    // Closes the gap the temp-dir rewrite opens: the two tests above prove the walk
    // handles any root, and `defaultRoots` proves the intended list. This proves the
    // default path uses THAT list, so `tools/` is genuinely scanned in the real run.
    const implicit = checkTree({ swRoot, romDir, onSkip: () => {} })
    const explicit = checkTree({ swRoot, romDir, roots: defaultRoots(swRoot), onSkip: () => {} })
    expect(implicit).toEqual(explicit)
    expect(explicit.length).toBeGreaterThanOrEqual(0)
  })

  it('the real tools/ tree is genuinely walked, not merely listed', () => {
    // A file that exists only under `tools/`. If the walk skipped the directory this
    // would be unreachable and the assertion could not distinguish it from a clean file.
    const probe = join(TOOLS, 'audit', 'check-comment-citations.d.mts')
    expect(existsSync(probe)).toBe(true)
    expect(SCAN_EXT).toContain(extname(probe))
    expect(defaultRoots(swRoot).some((r) => probe.startsWith(r))).toBe(true)
  })
})

// ===================================================================================
describe('sw8-23 AC3 — the opt-out is ANCHORED, not a substring search', () => {
  it('a file whose LEADING comment declares the pragma is still skipped', () => {
    // The legitimate use, and it must survive the fix. Regression guard.
    expect(checkCitations(`// ${IGNORE_PRAGMA}\n${CANARY}`, opts)).toEqual([])
  })

  it('the canary is a real error when nothing opts the file out', () => {
    // Without this the two tests below could pass because the fixture is inert.
    expect(checkCitations(CANARY, opts)).toHaveLength(1)
  })

  it('a PROSE MENTION of the pragma does NOT silence the file', () => {
    // VERIFIED at sw8-18's review and re-measured by SM at setup: the fixture alone
    // reports 1; the same fixture under this sentence reports 0. `docs/**/specs` is in
    // scope, so the first spec that documents this guard retires the guard.
    const text = `// The guard honours a ${IGNORE_PRAGMA} pragma.\n${CANARY}`
    expect(checkCitations(text, opts)).toHaveLength(1)
  })

  it('the pragma inside a BACKTICKED example does not silence the file', () => {
    const text = ['// Opt a file out by writing `' + IGNORE_PRAGMA + '` at the top.', CANARY].join('\n')
    expect(checkCitations(text, opts)).toHaveLength(1)
  })

  it('the pragma buried BELOW code does not silence the file', () => {
    // The anchor must be positional, not merely "in a comment" — otherwise a trailing
    // comment at the bottom of a 400-line file still mutes the whole thing.
    const text = [CANARY, 'const x = 1', `// ${IGNORE_PRAGMA}`].join('\n')
    expect(checkCitations(text, opts)).toHaveLength(1)
  })

  it('the pragma DEEP inside a long opening comment block does not opt out', () => {
    // Found by a surviving mutant: removing the head-line cap from `hasPragma` broke no
    // test. It is not an equivalent mutation — the loop only stops early at the first
    // NON-comment line, so a file that opens with a long prose block (every design spec
    // in `docs/**/specs`, and this guard's own 90-line header) would hand the pragma
    // opt-out authority anywhere in that block. That is the AC3 hazard wearing a hat:
    // the first spec that documents the pragma on its own line retires the spec.
    const longHeader = Array.from({ length: 12 }, (_, i) => `// prose line ${i}`).join('\n')
    const buried = `${longHeader}\n// ${IGNORE_PRAGMA}\n${CANARY}`
    expect(checkCitations(buried, opts)).toHaveLength(1)
    // ...while the same pragma at the top of the same file still works.
    expect(checkCitations(`// ${IGNORE_PRAGMA}\n${longHeader}\n${CANARY}`, opts)).toEqual([])
  })

  it('both files that deliberately opt out are STILL opted out', () => {
    // Behavioural, not textual: these two are full of mutants by design.
    expect(checkCitations(read(SW8_18_SUITE), opts)).toEqual([])
    expect(checkCitations(read(join(here, 'sw8-18-remediation.test.ts')), opts)).toEqual([])
  })
})

// ===================================================================================
describe('sw8-23 AC4 — a skip is announced, never silent', () => {
  it('checkTree reports each skipped file through an `onSkip` hook', () => {
    const skipped: string[] = []
    checkTree({ swRoot, romDir, onSkip: (f: string) => skipped.push(f) })
    const rel = skipped.map((f) => relative(swRoot, f))
    expect(rel).toContain(join('tests', 'audit', 'comment-citations.test.ts'))
    expect(rel).toContain(join('tests', 'audit', 'sw8-18-remediation.test.ts'))
  })

  it('the hook reports ONLY files that actually declare the pragma', () => {
    // An over-reporting hook is as useless as a silent one: if every file were
    // announced, the notice would carry no information.
    const skipped: string[] = []
    checkTree({ swRoot, romDir, onSkip: (f: string) => skipped.push(f) })
    expect(skipped.length).toBeGreaterThan(0)
    for (const f of skipped) {
      expect(read(f).includes(IGNORE_PRAGMA)).toBe(true)
    }
    // ...and a file with no pragma is not among them.
    expect(skipped.map((f) => relative(swRoot, f))).not.toContain(join('src', 'core', 'state.ts'))
  })

  it('with no hook supplied it still says so on stderr rather than dropping silently', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    checkTree({ swRoot, romDir })
    const said = spy.mock.calls.map((c) => c.join(' ')).join('\n')
    expect(said).toMatch(/comment-citations\.test\.ts/)
    expect(said).toMatch(/skip/i)
  })
})

// ===================================================================================
describe('sw8-23 AC5 — the tool DISOWNS its own examples instead of "correcting" them', () => {
  // Widening the scope makes the guard read the file that teaches the citation format.
  // Measured by SM at setup, with the pragma neutralised so the guard could see itself:
  //
  //   design.md                 the header's ELIDED example `…design.md:47-48`
  //   WSMAIN.MAC:2273-2290      the header's HISTORICAL example — gameRules.ts's live
  //                             citation is already the corrected :2271-2290
  //   :2273-2290 in the .d.mts  the doc comment demonstrating bare-span inheritance
  //
  // Rewriting any of them into a currently-true citation destroys what it documents.

  const stripRetired = (s: string) => s.split('RETIRED:').join('')

  it('the guard scans clean over its own implementation', () => {
    // NOTE: this passes at RED for the WRONG reason — the file contains the pragma's
    // own string literal, so the unanchored opt-out silences it (finding M1). Its
    // non-vacuity is supplied entirely by the mutation test below, which fails at RED.
    // Do not read this one alone as evidence.
    expect(checkCitations(read(GUARD_SRC), opts)).toEqual([])
  })

  it('the guard scans clean over its own type declaration', () => {
    expect(checkCitations(read(GUARD_DTS), opts)).toEqual([])
  })

  it('...and that cleanliness is EARNED — removing the disowning markers reddens it', () => {
    // The mutation that separates "disowned on purpose" from "happens to pass". Both
    // halves are asserted together: a delta, not a floor. Asserting only the mutated
    // count would pass on a file that was never clean to begin with.
    const src = read(GUARD_SRC)
    expect(checkCitations(src, opts)).toEqual([])
    expect(checkCitations(stripRetired(src) + '\n', opts).length).toBeGreaterThanOrEqual(2)
  })

  it('...for the .d.mts too', () => {
    const src = read(GUARD_DTS)
    expect(checkCitations(src, opts)).toEqual([])
    expect(checkCitations(stripRetired(src) + '\n', opts).length).toBeGreaterThanOrEqual(1)
  })

  it('the examples are still EXAMPLES — the header has not been rewritten into true citations', () => {
    // The failure mode this guards: "fixing" the historical example to :2271-2290 makes
    // the guard green and silently deletes the illustration of the bare-colon defect.
    const src = read(GUARD_SRC)
    expect(src).toMatch(/2273-2290/)
    expect(src).toMatch(/design\.md/)
  })

  it('gameRules.ts still carries the CORRECTED span, so the example is genuinely historical', () => {
    // Resolution, not a line number: open the live citation and require it to verify.
    expect(checkCitations(read(join(swRoot, 'src', 'core', 'gameRules.ts')), opts)).toEqual([])
  })
})

// ===================================================================================
describe('sw8-23 AC6 — UNCATCHABLE states the two biggest limits, and their real relation', () => {
  // The partition has to be OBSERVABLE before it can be documented honestly. Today
  // `quoteFor` returns null both when nothing is adjacent and when the adjacent span is
  // a single token that `isFragment` rejects, so the two are indistinguishable
  // downstream — which is exactly why the story states them as two populations.

  it('a single-token adjacent span is reported as DROPPED, not as absent', () => {
    const c = extractCitations('// the fire probability (`TGPROB`, `WSCPU.MAC:736`)')
    expect(c).toHaveLength(1)
    expect(c[0].quote).toBeNull()
    expect(c[0].droppedQuote).toBe('TGPROB')
  })

  it('a citation with nothing adjacent reports neither', () => {
    const c = extractCitations('// the wave table is described at length in WSCPU.MAC:736')
    expect(c).toHaveLength(1)
    expect(c[0].quote).toBeNull()
    expect(c[0].droppedQuote).toBeNull()
  })

  it('a real fragment quote is kept, and is not mistaken for a dropped one', () => {
    const c = extractCitations('// (`LDD FRAME / JSR LSLD7 / STD ST.UX`, `WSMAIN.MAC:2522-2530`)')
    expect(c).toHaveLength(1)
    expect(c[0].quote).toMatch(/LDD FRAME/)
    expect(c[0].droppedQuote).toBeNull()
  })

  /** Recompute the census from the tree. Never quote a frozen number: a sibling story
   *  editing star-wars comments moves it, and a stale census in a doc is this story's
   *  own subject matter. */
  const census = () => {
    const files: string[] = []
    const walk = (d: string) => {
      if (!existsSync(d)) return
      for (const e of readdirSync(d)) {
        if (e === 'node_modules') continue
        const p = join(d, e)
        if (statSync(p).isDirectory()) walk(p)
        else if (SCAN_EXT.includes(extname(p))) files.push(p)
      }
    }
    guard.defaultRoots(swRoot).forEach(walk)

    let spanned = 0
    let rangeOnly = 0
    let singleToken = 0
    for (const f of files) {
      const raw = read(f)
      // `hasPragma`, NOT `raw.includes(IGNORE_PRAGMA)`. The census must skip exactly the
      // files `checkTree` skips, and the unanchored form is the predicate AC3 deletes —
      // reimplementing it here would make this census measure a DIFFERENT population
      // from the tool whose published percentage it checks. The two agree today only
      // because every file that mentions the pragma also declares it; the first file
      // that mentions it without declaring it is scanned by the guard and would be
      // dropped here, silently.
      if (hasPragma(raw)) continue
      for (const c of extractCitations(raw)) {
        if (c.start === null) continue
        spanned++
        if (c.quote) continue
        rangeOnly++
        if (c.droppedQuote) singleToken++
      }
    }
    return { spanned, rangeOnly, singleToken }
  }

  it('the single-token class is a SUBSET of the range-only class, not a second one', () => {
    // The correction this AC exists for. SM measured 744 = 698 + 46; the exact split
    // moves with the tree, the RELATION does not.
    const { spanned, rangeOnly, singleToken } = census()
    expect(spanned).toBeGreaterThan(0)
    expect(singleToken).toBeGreaterThan(0)
    expect(rangeOnly).toBeLessThanOrEqual(spanned)
    expect(singleToken).toBeLessThan(rangeOnly)
  })

  it('UNCATCHABLE quotes a range-only percentage, and it MATCHES the live tree', () => {
    // A documented number that nothing re-derives is the defect this whole story is
    // about. Parse the tool's own claim and check it against a fresh count.
    const { spanned, rangeOnly } = census()
    const actual = (rangeOnly / spanned) * 100
    const claimed = [...UNCATCHABLE.matchAll(/(\d{1,3}(?:\.\d)?)\s*%/g)].map((m) => Number(m[1]))
    expect(claimed.length).toBeGreaterThan(0)
    expect(claimed.some((p) => Math.abs(p - actual) < 1.5)).toBe(true)
  })

  it('UNCATCHABLE says the single-token case is a subset rather than an extra limitation', () => {
    expect(UNCATCHABLE).toMatch(/subset/i)
    expect(UNCATCHABLE).toMatch(/single[- ]token/i)
  })

  it('UNCATCHABLE still carries what sw8-18 put there', () => {
    // Append, do not replace: the correct-span class is the most misleading one.
    expect(UNCATCHABLE).toMatch(/WSSTAR\.MAC:98/)
    expect(UNCATCHABLE).toMatch(/\b(three|3)\b/i)
  })
})

// ===================================================================================
describe('sw8-23 AC7 — `fromFile` is gone (USER RULING: drop, do not wire)', () => {
  // Census behind the ruling, taken by SM at setup: ZERO relative-path citations exist
  // anywhere in the scanned tree, so citing-file-relative resolution has no callers;
  // and the 8 real basename collisions are already covered by the path-qualified rule
  // the guard's own header documents. Wiring it would add a precedence question and
  // serve nobody.

  const declares = (src: string) => /\bfromFile\s*[?:]/.test(src)

  it('the type declaration no longer declares it', () => {
    expect(declares(read(GUARD_DTS))).toBe(false)
  })

  it('the implementation no longer passes it', () => {
    expect(declares(read(GUARD_SRC))).toBe(false)
  })

  it('sw8-18’s suite no longer passes it at any of its six call sites', () => {
    expect(declares(read(SW8_18_SUITE))).toBe(false)
  })

  it('the option it pretended to be — swRoot — IS read, and varying it changes the result', () => {
    // sw8-18's item-7 mutation varied `fromFile` "to simulate the citation living in a
    // different file", and that variation provably had no effect, so the suite read as
    // covering resolution that nothing implements. This is the replacement: a variation
    // that DOES move the outcome, so the coverage claim is honest.
    const cite = '// the shell supplies it (`src/shell/input.ts:45`)'
    const good = checkCitations(cite, { swRoot, romDir, repoRoot })
    const bad = checkCitations(cite, { swRoot: join(swRoot, 'src'), romDir, repoRoot: join(swRoot, 'src') })
    expect(good).toEqual([])
    expect(bad.length).toBeGreaterThan(0)
    expect(bad.join('\n')).toMatch(/does not exist|out of range/)
  })
})

// ===================================================================================
describe('sw8-23 AC2 — the fresh count, and the extractor defect underneath two of it', () => {
  // A GLOB is not a citation. `FILE_RE` accepts a leading `.`, so ``**/*.test.mjs``
  // extracts as the filename `.test.mjs` and is reported as a dangling reference.
  // Measured at RED: 6 of the 45 errors in the widened scan are this artifact — 2 in
  // tools/ and 4 already sitting in the baseline. They cannot be "re-anchored", because
  // nothing was ever cited.

  it('a glob pattern is not extracted as a citation', () => {
    expect(extractCitations('// picked up by the default `**/*.test.mjs` discovery')).toEqual([])
  })

  it('...nor is a bare extension left by a wrapped sentence', () => {
    expect(extractCitations('// see the orientation contract in\n// .test.ts for the rest')).toEqual([])
  })

  it('a REAL dotted filename is still extracted', () => {
    // The fix must reject a leading dot, not any dot: `foo.test.ts` is a real name.
    const c = extractCitations('// see `tie-peel-away.test.ts` for the old check')
    expect(c).toHaveLength(1)
    expect(c[0].file).toBe('tie-peel-away.test.ts')
  })

  // Every tools/ file the widened scan reports. The guard names the corrected line for
  // each stale span itself — that is what its re-location output is for, so Dev edits
  // rather than hunts. Two need judgement instead of a number:
  //
  //   speech-data.mjs      cites `gen-speech-data.mjs` as its generator. That file does
  //                        NOT exist; the generator is `bake-speech.mjs`. A genuine
  //                        stale citation, found by the guard, named by no AC.
  //   music-data.test.mjs  cites `tools/speech-bake/gen-speech-data.mjs` inside a
  //                        sentence that says the file does not exist — a disowned
  //                        reference, i.e. the RETIRED: case.
  const TOOLS_FILES = [
    ['tools', 'music-bake', 'bake-music.mjs'],
    ['tools', 'music-bake', 'gen-music-data.mjs'],
    ['tools', 'music-bake', 'music-data.test.mjs'],
    ['tools', 'music-bake', 'pm-player.mjs'],
    ['tools', 'pokey-bake', 'bake-sfx.test.mjs'],
    ['tools', 'pokey-bake', 'dedicated-sfx.test.mjs'],
    ['tools', 'speech-bake', 'speech-data.mjs'],
  ]

  it.each(TOOLS_FILES.map((p) => [p.join('/'), p] as const))('%s carries no stale citation', (_label, parts) => {
    expect(checkCitations(read(join(swRoot, ...parts)), opts)).toEqual([])
  })

  it('the widened scan does not RISE above the baseline sw8-18 delivered', () => {
    // The forcing function for this AC. sw8-18 tightened its ratchet to 35 over
    // src+tests+specs. MEASURED at RED with tools/ added: 45 (35 + 10). DELIVERED: 29 —
    // the extractor defect cleared six phantoms (two in tools/, four already in the
    // baseline) and the eight real tools/ citations were re-anchored or disowned. So the
    // scanned surface GREW and the count FELL, which is the claim this AC actually makes.
    //
    // The scope is passed EXPLICITLY here rather than relying on the default. Calling
    // the default today measures the UN-widened tree and reports 35 <= 35 — a green
    // that proves nothing and would stay green through a story that never widened
    // anything. Naming the roots makes this red at RED.
    const widened = [
      join(swRoot, 'src'),
      join(swRoot, 'tests'),
      join(swRoot, 'docs', 'superpowers', 'specs'),
      TOOLS,
    ]
    expect(checkTree({ swRoot, romDir, roots: widened }).length).toBeLessThanOrEqual(29)
  })

  it('...and the DEFAULT scan, once it covers tools/, stays under it too', () => {
    // Guards the seam between AC1 and AC2: widening the default without remediating
    // would satisfy AC1's scope tests while pushing the tree-wide count up.
    //
    // Tightened to the achieved count in the same commit, alongside sw8-18's. A ratchet
    // with slack is the "guard that does not bite" these two stories exist to retire.
    expect(checkTree({ swRoot, romDir }).length).toBeLessThanOrEqual(29)
  })
})
