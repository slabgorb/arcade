// tests/audio-seam-scope.test.ts
//
// Story jt5-1 — RED phase (Mr. Praline / TEA). AC6: "No .wav is committed and
// no R2 upload is claimed by this story; the story states plainly that joust is
// still silent when it closes." Plus the documentation half of AC1 — the prose
// that goes false the moment the seam lands.
//
// ─── WHY AC6 NEEDS TESTS AT ALL ──────────────────────────────────────────────
// Because a green suite is not evidence of sound. `@shared/audio` degrades
// silently at every failure path BY DESIGN — no WebAudio, blocked autoplay,
// failed fetch and undecodable sample all leave the game quiet and never throw
// — so a 404 is indistinguishable from working code in vitest. star-wars music
// was wired and silently absent in production for months for exactly this
// reason. The epic's rule is that a LIVE 200 is the acceptance test for any
// ASSET story; this story is the exception that proves it, because it ships no
// asset. What must therefore be machine-checked is the SCOPE: that nothing
// here pretends otherwise.
//
// ─── MARKDOWN WRAPPING MAKES A NAIVE DOC ASSERTION INERT ─────────────────────
// The README's status block is a blockquote, and its sentences wrap. To a
// reader it says "there is no `src/shell/audio.ts`, no `src/core/events.ts`
// channel and no dispatch." On disk that is `…no\n> `src/core/events.ts`
// channel…` — a newline AND a `> ` in the middle. A regex written against the
// sentence as READ never matches the file as STORED, so `.not.toMatch(...)`
// passes trivially and the stale claim survives untouched. Measured on this
// file: of the six stale claims pinned below, TWO (`no dispatch`, `no audio and
// no storage`) match only after normalisation. Every prose assertion here
// therefore runs through `flatten()` first, and each was checked to MATCH the
// unchanged README before being written as a negative — an assertion that does
// not fire today can never fire.
//
// Symmetrically, every POSITIVE assertion is built from a token verified ABSENT
// from the README today (`audio-dispatch`, `@shared/audio`, `no samples` — all
// grep-count 0). A positive built from a token the stale text already contains
// is satisfied by the very sentence it was meant to replace.

import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'
import { EVENT_KINDS } from '../src/core/events'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const readmePath = join(root, 'README.md')

/** Un-wrap markdown: strip blockquote markers, collapse all whitespace. A
 *  multi-word claim can only be matched honestly against this. */
const flatten = (md: string): string => md.replace(/^\s*>\s?/gm, ' ').replace(/\s+/g, ' ')

const readme = (): string => flatten(readFileSync(readmePath, 'utf8'))

/** Every file under `dir`, recursively, as plugin-relative paths. */
function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) walk(p, acc)
    else acc.push(relative(root, p))
  }
  return acc
}

const load = async <T>(parts: string[]): Promise<Partial<T>> => {
  try {
    return (await import(/* @vite-ignore */ parts.join('/'))) as Partial<T>
  } catch {
    return {}
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// AC6 — the scope fence: a seam, and not one byte of audio
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-1 AC6 — no sample is committed', () => {
  it('the plugin holds no audio binary of any kind', () => {
    const audio = walk(root).filter((f) => /\.(wav|mp3|ogg|m4a|flac|aiff?)$/i.test(f))
    expect(audio, 'jt5-1 ships the seam only — no baked samples').toEqual([])
  })

  it('every filename the manifest names is ABSENT from the tree', () => {
    // The manifest is a promise about an R2 bucket, not about this repo. If a
    // named `.wav` ever appears here, either the scope fence broke or the
    // hosting model did — both need a human, and both are invisible to the test
    // above once a file is added under a name it does not pattern-match.
    return load<{ SOUNDS: Readonly<Record<string, string>> }>(['..', 'src', 'shell', 'audio']).then(
      (mod) => {
        const manifest = mod.SOUNDS
        if (manifest === undefined) {
          throw new Error('jt5-1 not implemented yet: src/shell/audio.ts must export `SOUNDS`.')
        }
        const files = new Set(walk(root).map((f) => f.split('/').pop()))
        const present = Object.values(manifest).filter((f) => files.has(f))
        expect(present, 'the samples live in the assets bucket, never in the plugin').toEqual([])
      },
    )
  })

  it('no source file asserts the samples are hosted — this story never checked a 200', () => {
    // `just deploy-assets` is the only path to the assets bucket, CI never
    // touches it, and this story does not run it. A source line stating the
    // samples ARE there would be the story asserting a live 200 it never made,
    // which is the precise failure the epic's guardrail exists to prevent — and
    // it would be indistinguishable from truth in every test, since the engine
    // degrades silently on a 404.
    //
    // Scoped to `src/` and to COMPLETED-state wording on purpose. A README
    // sentence about what a LATER story will upload is honest, and a guard that
    // vetoed it would be a guard Dev has to weaken to tell the truth.
    const offenders: string[] = []
    for (const f of walk(root)) {
      if (!f.startsWith('src/') || !f.endsWith('.ts')) continue
      const text = flatten(readFileSync(join(root, f), 'utf8'))
      const lie = text.match(
        /\b(samples?|cues?|sounds?)\b[^.]{0,60}\b(are|is|were|was)\b[^.]{0,20}\b(live|hosted|uploaded|deployed|available)\b/i,
      )
      if (lie) offenders.push(`${f}: ${lie[0]}`)
    }
    expect(offenders, 'jt5-1 uploads nothing, so no source file may say the samples are there').toEqual(
      [],
    )
  })
})

// ─── RE-SEATED BY jt5-2 (TEA, RED) ───────────────────────────────────────────
// The describe that stood here — "the story says plainly that joust is still
// silent" — required the README to keep saying `silent` and `no samples`.
// That was jt5-1's AC6 fencing its OWN scope: true only for the period between
// the seam landing and the samples landing, and jt5-2 is the story that ends
// it. Its two tests are superseded by the inverse pins in
// tools/sample-bake/deploy-assets.test.mjs (the stale claims must GO, the live
// joust/sfx prefix must ARRIVE); keeping both suites would leave Dev unable to
// satisfy either. The fences below are NOT retired with it: no audio binary in
// the plugin tree and no stative hosted-claim in src/ are the hosting model,
// not a story scope — samples are baked at deploy time into a staging dir and
// live in the bucket, never the repo.

// ═════════════════════════════════════════════════════════════════════════════
// AC1 / AC6 — the prose this story invalidates
// ═════════════════════════════════════════════════════════════════════════════
//
// Each pair below is a stale claim that must GO and an honest one that must
// ARRIVE. Neither half alone is enough: deleting the sentences satisfies every
// negative while the README goes quiet about a subsystem that now exists, and
// appending a new section satisfies every positive while the contradiction sits
// forty lines above it.

describe('jt5-1 — the README’s "what joust does NOT do" section is brought true', () => {
  it('it no longer says there is no audio module, no event channel and no dispatch', () => {
    const md = readme()
    expect(md, 'src/shell/audio.ts exists now').not.toMatch(/there is no `src\/shell\/audio\.ts`/)
    expect(md, 'the event channel and the dispatch exist now').not.toMatch(
      /no `src\/core\/events\.ts` channel and no dispatch/,
    )
  })

  it('it no longer describes the shell as three modules with no audio', () => {
    expect(readme(), 'the shell is four modules now, and one of them is audio').not.toMatch(
      /\*\*no audio and no storage\*\*/,
    )
  })

  it('it no longer claims joust consumes nothing from @shared', () => {
    const md = readme()
    expect(md, 'joust consumes @shared/audio now').not.toMatch(
      /It consumes nothing from `@shared`/,
    )
    expect(md, 'joust is no longer the zero-consumption outlier').not.toMatch(
      /joust is the fleet's outlier/,
    )
  })

  it('it no longer repeats the refuted "between four and nine subpaths" range', () => {
    // Measured 2026-07-31: battlezone 13, star-wars 11, tempest 10, asteroids
    // 10, red-baron 8, centipede 5. The real range is 5-13, and it was never
    // 4-9. This sentence was false before the story and is doubly false after.
    expect(readme()).not.toMatch(/between four and nine subpaths/)
  })

  it('it no longer says the adoption ruling is open — the migration dissolved it', () => {
    // AC1's "recorded as MOOT, not re-litigated". The 2026-07-30 collapse
    // removed the package boundary, so there is no ruling left to make.
    expect(readme()).not.toMatch(/is an open ruling owned by `sprint\/epic-jt5\.yaml`/)
  })

  it('and it names what actually landed — the three-file seam and the shared engine', () => {
    const md = readme()
    // Both tokens are grep-count 0 in the README today, so neither can be
    // satisfied by the stale text they replace.
    expect(md, 'the README must name the dispatch module').toMatch(/audio-dispatch/)
    expect(md, 'the README must record the shared-engine adoption').toMatch(/@shared\/audio/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Project rules — `.pennyfarthing/gates/lang-review/typescript.md`
// ═════════════════════════════════════════════════════════════════════════════
//
// The checklist is the Reviewer's rubric, so the three modules this story
// creates are held to it here rather than discovered at review. Only the checks
// that actually apply to a data module, a manifest and a switch are pinned;
// check #3's "missing exhaustiveness check in switch/case" is covered in
// audio-dispatch.test.ts, which is where the `never` guard lives.
//
// The scans strip comments first — a checklist that fires on prose describing
// the rule is the trap joust's own purity scanner was rewritten to avoid — but
// the import-extension scan runs with STRINGS INTACT, because an import
// specifier IS a string.

const NEW_MODULES = [
  'src/core/events.ts',
  'src/shell/audio.ts',
  'src/shell/audio-dispatch.ts',
  // jt5-2: the manifest extracted for the plain-node sample bake.
  'src/shell/audio-manifest.ts',
]

/** Source with comments removed. Block comments first, then line comments. */
const codeOnly = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')

const eachNewModule = (): { name: string; src: string }[] =>
  NEW_MODULES.map((name) => {
    const p = join(root, name)
    if (!existsSync(p)) throw new Error(`jt5-1 must create ${name}`)
    return { name, src: readFileSync(p, 'utf8') }
  })

describe('jt5-1 — the new modules satisfy the TypeScript review checklist', () => {
  it('#1 no type-safety escapes — the seam is typed, not cast into place', () => {
    const offenders: string[] = []
    for (const { name, src } of eachNewModule()) {
      const code = codeOnly(src)
      for (const [label, re] of [
        ['as any', /\bas\s+any\b/],
        ['as unknown as', /\bas\s+unknown\s+as\b/],
        ['@ts-ignore', /@ts-ignore/],
        ['@ts-expect-error', /@ts-expect-error/],
        [': any', /:\s*any\b/],
      ] as const) {
        if (re.test(code)) offenders.push(`${name}: ${label}`)
      }
      // `@ts-ignore` lives in a COMMENT, so it must be sought in the raw text.
      if (/@ts-(ignore|nocheck)/.test(src)) offenders.push(`${name}: ts suppression comment`)
    }
    expect(offenders, 'a cue map that needs a cast is a cue map with the wrong types').toEqual([])
  })

  it('#2 no over-broad generics — the manifest is keyed by the union, not by string', () => {
    const offenders: string[] = []
    for (const { name, src } of eachNewModule()) {
      const code = codeOnly(src)
      for (const [label, re] of [
        ['Record<string, any>', /Record<\s*string\s*,\s*any\s*>/],
        ['bare Function type', /:\s*Function\b/],
        ['bare object type', /:\s*object\b/],
      ] as const) {
        if (re.test(code)) offenders.push(`${name}: ${label}`)
      }
    }
    expect(
      offenders,
      'SOUNDS/CHANNELS/CUE_SOURCES keyed by `string` would let a typo add a cue no kind reaches',
    ).toEqual([])
  })

  it('#4 no `||` defaulting where `??` is meant', () => {
    // `x || fallback` swallows 0 and '' — and a ROM priority of 0 and an empty
    // channel name are both values this seam can legitimately hold.
    const offenders: string[] = []
    for (const { name, src } of eachNewModule()) {
      const code = codeOnly(src)
      const hits = code.match(/\|\|\s*(['"`]|[0-9])/g)
      if (hits) offenders.push(`${name}: ${hits.join(', ')}`)
    }
    expect(offenders, 'use ?? — 0 and "" are valid values here, not absences').toEqual([])
  })

  it('#5 every relative import carries the .js extension', () => {
    // joust's ESM convention: 100+ relative imports across src/ carry `.js`
    // (`shell/timebase.ts` is the single pre-existing exception and is out of
    // this story's scope). Bare specifiers like `@shared/audio` take none.
    const offenders: string[] = []
    for (const { name, src } of eachNewModule()) {
      for (const m of src.matchAll(/from\s+'(\.\.?\/[^']*)'/g)) {
        if (!m[1].endsWith('.js')) offenders.push(`${name}: ${m[1]}`)
      }
    }
    expect(offenders, 'a relative import without .js breaks Node16 ESM resolution').toEqual([])
  })
})

describe('jt5-1 — the doc assertions above are not inert', () => {
  it('flatten() actually un-wraps the blockquote the stale claims live in', () => {
    // The guard on the guards. Two of the six negatives above match ONLY after
    // normalisation; if `flatten` ever stopped stripping `> ` or collapsing
    // newlines, those two would go quietly green over untouched stale prose and
    // nothing else in this file would notice.
    const wrapped = '> there is no `src/shell/audio.ts`, no\n> `src/core/events.ts` channel and no dispatch.'
    expect(wrapped, 'precondition: the raw form does NOT match').not.toMatch(
      /no `src\/core\/events\.ts` channel and no dispatch/,
    )
    expect(flatten(wrapped), 'the flattened form MUST match, or the negative is inert').toMatch(
      /no `src\/core\/events\.ts` channel and no dispatch/,
    )
  })

  it('flatten() leaves ordinary prose intact', () => {
    expect(flatten('a  b\n c')).toBe('a b c')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Story jt5-7 — RED phase (Mr. Praline / TEA). AC5, AC6, AC7, AC8.
//
// The README carries measured numbers that nothing guards, plus two paragraphs
// that landed stories refuted. These guards live HERE, beside jt5-1's README
// assertions, so that every "the README's claims are true" check sits in one
// file — and so they inherit `flatten()`, which is what makes a prose assertion
// against this blockquote-heavy, hard-wrapped file honest at all.
//
// ─── WHAT IS DERIVED, WHAT IS ONLY STAMPED, AND WHY ──────────────────────────
// The user's ruling (2026-08-02) was to SPLIT: derive the counts that can be
// derived, mark the rest indicative. Measurement decided which is which, and it
// moved one item out of the "derive" column that the story had put in:
//
//   DERIVABLE, and derived below:
//     · test-FILE count  — `walk()` + the vitest include pattern gives 100,
//       matching `vitest run --project joust` exactly (measured 2026-08-02).
//       Note the two `.mjs` files under tools/sample-bake/ — a bare
//       `tests/*.test.ts` glob gives 96 and a `find` gives 97; only the full
//       pattern reproduces vitest. That mismatch is why this is derived rather
//       than transcribed.
//     · CLAIM count — the claims JSON is the same set `check-citations.mjs`
//       counts; both print 938 today, in normal AND in degraded (schema-only)
//       mode, so one derivation covers both README sites.
//     · EVENT_KINDS — IMPORTED from source, 17 today, against the README's
//       "eleven". Imported rather than scanned on purpose: a regex over the
//       tuple gave 19 during design. Static analysis of source is exactly the
//       transcription error this AC exists to remove, so the guard must not
//       commit it while checking for it.
//
//   NOT DERIVABLE — moved to the indicative column by measurement:
//     · the TEST count. Static analysis cannot reproduce it: 2001 `it(`/`test(`
//       call sites against vitest's 2418, because 32 `it.each` sites each
//       expand to N tests. A guard that cannot go green is not a deliverable,
//       so the README must stop stating a bare test count as fact.
//     · the six-number skipIf block. SELF-REFERENTIAL: a test counting how many
//       times `skipIf(!vendoredAvailable)` occurs under `tests/` is itself a
//       file under `tests/` carrying that literal, so writing the guard changes
//       the number it guards.
// ═════════════════════════════════════════════════════════════════════════════

/** The README exactly as stored — for assertions about numbers, which do not wrap. */
const readmeRaw = (): string => readFileSync(readmePath, 'utf8')

/** Test files as vitest discovers them: its include pattern, over the plugin root. */
const derivedTestFileCount = (): number =>
  walk(root).filter((f) => /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/.test(f)).length

/** Claims across the dossier — the set `check-citations.mjs` reports on. */
function derivedClaimCount(): number {
  const dir = join(root, 'docs/rom-study/claims')
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .reduce((n, f) => {
      const parsed: unknown = JSON.parse(readFileSync(join(dir, f), 'utf8'))
      const list = Array.isArray(parsed)
        ? parsed
        : ((parsed as { claims?: unknown[] }).claims ?? [])
      return n + list.length
    }, 0)
}

describe('jt5-7 AC5 — the README’s counts are DERIVED, not transcribed', () => {
  it('the suite FILE count matches what vitest actually discovers', () => {
    const derived = derivedTestFileCount()
    // Non-vacuity: a derivation that returned 0 would make any README number
    // "wrong" for the wrong reason, and one that returned a constant would
    // never track reality.
    expect(derived, 'the derivation found no test files at all').toBeGreaterThan(50)

    // ANCHORED to the vitest command line, not a bare /(\d+) files/ scan.
    // Measured: the README contains THREE "N files" strings (the quick-start
    // command, the skipIf block's file tally, and the vendored tree's 49). A
    // first-match rule reads whichever comes first, so a later reorder — or a
    // new sentence mentioning a file count above the quick start — would let
    // the real number go stale with this guard green. Proven: with a decoy
    // "102 files" inserted above and the command line reading 999, the
    // unanchored form passed.
    const stated = readmeRaw().match(/--project joust[^\n]*?(\d+)\s+files/)
    expect(
      stated,
      'the README must state the file count on the `--project joust` command line',
    ).not.toBeNull()
    expect(
      Number(stated?.[1]),
      `README says ${stated?.[1]} test files; vitest discovers ${derived}. ` +
        'Update the README — this number is derived and will redden whenever it drifts.',
    ).toBe(derived)
  })

  it('the CLAIM count matches the dossier, at every site that states it', () => {
    const derived = derivedClaimCount()
    expect(derived, 'the claim derivation collapsed to zero').toBeGreaterThan(100)

    const stated = [...readmeRaw().matchAll(/checked\s+(\d+)\s+claim\(s\)/g)].map((m) => Number(m[1]))
    // Measured: the README states this number TWICE (the quick-start command at
    // :52 and the degraded-mode demonstration at :139). Both must be right —
    // the checker prints the same 938 in either mode, so there is no honest
    // reason for them to differ.
    expect(stated.length, 'the README must state the claim count where it quotes the checker').toBe(2)
    for (const n of stated) {
      expect(
        n,
        `README quotes "checked ${n} claim(s)"; the dossier holds ${derived}`,
      ).toBe(derived)
    }
  })

  it('the event-channel count matches EVENT_KINDS in source', () => {
    // Statically imported, not `await import(...) as {...}`: the cast form
    // needed a hand-written shape that would go stale silently if the tuple
    // were renamed, which is the transcription failure this AC exists to
    // remove. A static import makes the derivation compile-checked instead.
    expect(EVENT_KINDS.length, 'EVENT_KINDS collapsed to empty').toBeGreaterThan(0)

    // The stale WORD must go — it is the form the defect shipped in.
    expect(
      readme(),
      'the README called the channel "eleven ROM-cited moments"; that spelling is the stale one',
    ).not.toMatch(/eleven ROM-cited moments/i)

    // …and the NUMBER must actually agree. Banning the word alone is not a
    // derivation: measured during review, writing "3 ROM-cited moments" passed
    // the word-ban cleanly, so AC5's third count was transcribed rather than
    // derived despite this test's name. Compare the digits.
    const stated = readme().match(/\((\d+) ROM-cited moments/)
    expect(
      stated,
      'the README must state the moment count as a digit beside `src/core/events.ts`',
    ).not.toBeNull()
    expect(
      Number(stated?.[1]),
      `README says ${stated?.[1]} ROM-cited moments; EVENT_KINDS holds ${EVENT_KINDS.length}.`,
    ).toBe(EVENT_KINDS.length)
  })

  it('every cue the README calls ROM-cited really is one', () => {
    // The adjective, not just the count. CUE_SOURCES carries an `invention`
    // escape hatch for cues with no ROM table (jt5-1 AC5), and if any shipped
    // cue used it, "ROM-cited" would overstate the dossier. Measured today:
    // 18 `kind: 'rom'` instances and zero inventions — but nothing pinned that,
    // so the README's adjective could silently go false the first time a cue
    // ships without a table.
    const manifest = readFileSync(join(root, 'src/shell/audio-manifest.ts'), 'utf8')
    const inventions = manifest.match(/kind: 'invention',/g) ?? []
    expect(
      inventions,
      'a cue ships as an invention, so the README may not call every moment ROM-cited',
    ).toEqual([])
  })
})

describe('jt5-7 AC6 — what cannot be derived is marked INDICATIVE, with its reason', () => {
  it('the bare stale test count is gone', () => {
    // 1944 was true when written and is not now (2418). It is not statically
    // derivable, so it must not stand as an unqualified fact.
    expect(readmeRaw(), 'the stale test count must not survive').not.toMatch(/1944/)
  })

  it('the skipIf reconciliation block is labelled indicative and dated', () => {
    const md = readme()
    // Both tokens verified grep-count 0 in the README today, so neither
    // assertion can pass on the unchanged file.
    expect(md, 'the unguarded counts must be marked indicative').toMatch(/indicative/i)
    expect(md, 'an indicative count needs the date it was measured').toMatch(
      /measured\s+2026-08-\d\d/i,
    )
  })

  it('the README says WHY that block is not derived', () => {
    // Without the reason, the next reader's obvious improvement is to "fix" it
    // by writing the guard — which changes the number it guards. The reason is
    // the load-bearing half of the decision.
    expect(readme(), 'state the self-reference, or the decision looks like laziness').toMatch(
      /self-referential|counts itself|would change the number it guards/i,
    )
  })
})

describe('jt5-7 AC7 — the quick-start describes the cabinet server that mg1-2 landed', () => {
  it('no longer claims joust cannot be opened in a browser', () => {
    const md = readme()
    // Each negative was verified to MATCH the unchanged README before being
    // written, per this file's standing rule.
    expect(md, 'just serve serves the real plugin at /joust/ since mg1-2').not.toMatch(
      /There is no way to open joust in a browser/i,
    )
    expect(md, 'the do-not-screenshot warning describes the retired SPA fallback').not.toMatch(
      /Do not screenshot/i,
    )
    expect(md, 'the per-plugin port pin is gone, not merely "removed by the migration"').not.toMatch(
      /5279/,
    )
  })

  it('names the cabinet server and the guard that pins it', () => {
    const md = readme()
    // Positives built only from tokens absent today (`just serve`, `5270` and
    // `canonical-serve` are each grep-count 0), so none can pass on the stale
    // text. `banana` is deliberately NOT used: the refuted paragraph already
    // contains it, so an assertion on it would be inert.
    expect(md, 'the README must name the one canonical dev command').toMatch(/just serve/)
    expect(md, 'the cabinet serves joust at its own path').toMatch(/\/joust\//)
    expect(md, 'cite the guard that proves it is not a blanket fallback').toMatch(
      /canonical-serve/,
    )
  })
})

describe('jt5-7 AC8 — liveness is a MEASUREMENT, not an inference from a hostname', () => {
  it('does not assert the game is live without saying how that was checked', () => {
    const md = readme()
    // CLAUDE.md: "do not infer a live game from a live hostname; request it."
    // The stale sentence reads "The shipped game is unaffected and still live
    // at joust.slabgorb.com" — an unmeasured claim in a doc that elsewhere
    // insists on curling.
    expect(md, 'an unqualified liveness claim is exactly what CLAUDE.md forbids').not.toMatch(
      /still live at \[?joust\.slabgorb\.com/i,
    )
  })

  it('records the date and the control the measurement used', () => {
    const md = readme()
    // Measured 2026-08-02: joust.slabgorb.com/ served <title>Joust</title>
    // while /banana-control/ served "Not Found", and arcade.slabgorb.com/joust/
    // behaved identically. A 200 alone proves nothing — the lobby's SPA
    // fallback answers 200 for every path — so the control is the evidence.
    //
    // PROXIMITY, not mere presence. AC6 also requires a "measured 2026-08-.."
    // stamp elsewhere in this README, so a bare /2026-08-\d\d/ here would be
    // satisfied by THAT stamp and assert nothing about liveness. The date must
    // sit in the same neighbourhood as the hostname it dates.
    const near = md.match(/[\s\S]{0,320}slabgorb\.com[\s\S]{0,320}/)
    expect(near, 'the README must still name the host it is making a claim about').not.toBeNull()
    expect(
      near?.[0] ?? '',
      'a liveness measurement needs its date beside the claim, not elsewhere in the file',
    ).toMatch(/2026-08-\d\d/)
    expect(
      md,
      'name the single-origin path — it is the canonical URL after the collapse',
    ).toMatch(/arcade\.slabgorb\.com\/joust/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// Story jt9-28 — RED phase (Tyr One-Handed / TEA). The three README count
// families jt5-7 left untouched, RE-MEASURED against the tree 2026-08-06.
//
// jt5-7 derived the file/claim/event counts and stamped the test-total and the
// skipIf block indicative. It left three families alone, and all three have
// since gone stale — which is the whole point: a hand-maintained count in a
// file nothing guards rots silently behind a green suite.
//
//   AC1  the status-block story tallies (README :13-21)   → DERIVED (joust-only
//        churn, self-contained, low-maintenance to guard live).
//   AC2  the @shared subpath range (README :143)          → INDICATIVE + date.
//        Ruled by the user 2026-08-06: the range rots on FLEET churn (measured
//        6→9 in four days from other cabinets adopting @shared/host-helpers), so
//        a live cross-game derivation would redden joust's suite for work joust
//        never touched. Stamp it like jt5-7's skipIf block instead.
//   AC3  the Task 12 historical measurement (README :96)  → ruled HISTORY with a
//        date bound to the claim (not the block below's borrowed 2026-08-02).
//   AC4  the derived file-count's contributor cost        → documented in one
//        sentence: adding a tests/*.test.ts bumps the derived count.
//
// Every guard runs through `readmeRaw`/`flatten` and carries a positive
// precondition, so deleting the sentence cannot satisfy it — this file's
// standing rule.
// ═════════════════════════════════════════════════════════════════════════════

/** English cardinal for 0..40 — the status block and the range are written as
 *  WORDS ("Thirty-six stories", "between six and thirteen"), so a number guard
 *  must compare against the spelling, not the digit. */
const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
]
const TENS = ['', '', 'twenty', 'thirty', 'forty']
function numToWord(n: number): string {
  if (n < 20) return ONES[n]!
  const o = n % 10
  return o ? `${TENS[Math.floor(n / 10)]}-${ONES[o]}` : TENS[Math.floor(n / 10)]!
}

const repoRoot = join(root, '..', '..')

/** The joust stories archived per status-block epic, straight from the archive
 *  dir — the authority the hand-maintained tally drifts from. Filtered to the
 *  FIVE epics the status block enumerates (jt5/audio and jt9/remainder are not
 *  in that sentence), and to `<epic>-<n>-session.md` so a `-superseded-<co>.md`
 *  archive is not double-counted. */
function derivedJoustEpicCounts(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const f of readdirSync(join(repoRoot, 'sprint', 'archive'))) {
    const m = f.match(/^(jt1|jt2|jt3|jt4|jt8)-\d+-session\.md$/)
    if (m) out[m[1]!] = (out[m[1]!] ?? 0) + 1
  }
  return out
}

describe('jt9-28 AC1 — the status-block story tallies are DERIVED from the archive', () => {
  it('every per-epic count and the total match sprint/archive, not a hand-kept number', () => {
    const counts = derivedJoustEpicCounts()
    const epics = Object.keys(counts)
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    // Non-vacuity: an empty archive read, or a derivation collapsed to a
    // constant, would make the README "wrong" for the wrong reason.
    expect(epics.length, 'the archive scan found none of the five status-block epics').toBe(5)
    expect(total, 'the derivation collapsed to too few stories to be real').toBeGreaterThan(30)

    const md = readmeRaw()
    // Per-epic counts are DIGITS in parens: `(jt1, 11)`. The status block is the
    // FIRST place each id appears, so a first-match read lands in it.
    for (const [epic, n] of Object.entries(counts)) {
      const stated = md.match(new RegExp(`${epic},\\s*(\\d+)`))
      expect(stated, `the status block must state a count for ${epic}`).not.toBeNull()
      expect(
        Number(stated?.[1]),
        `README says ${epic} = ${stated?.[1]}; the archive holds ${n}. ` +
          'This tally is derived and reddens whenever a story in these epics closes.',
      ).toBe(n)
    }
    // The total is a WORD. flatten() first, since the sentence wraps.
    expect(
      flatten(md).toLowerCase(),
      `the status block says a total that is not ${total} (${numToWord(total)}) stories`,
    ).toContain(`${numToWord(total)} stories`)
  })
})

describe('jt9-28 AC2 — the @shared subpath range is INDICATIVE, dated, and not the stale figure', () => {
  it('the refuted "six and thirteen" range is gone and a dated indicative stamp sits beside it', () => {
    const md = flatten(readmeRaw())
    // The @shared sentence names joust's one subpath and then the fleet range.
    // PROXIMITY: pull the window around joust's `@shared/audio` mention so the
    // stamp and the range are checked where the CLAIM is, not anywhere in the
    // file. (jt5-7 already stamps an unrelated 2026-08-.. block near line 100.)
    const anchor = md.indexOf('zero-consumption outlier')
    expect(anchor, 'precondition: the @shared range sentence is still here').toBeGreaterThan(-1)
    const near = md.slice(anchor, anchor + 500)

    // Ratchet: the range rotted to 9–14 (measured 2026-08-06). "six and
    // thirteen" and its endpoint exemplars "centipede 6"/"battlezone 13" were
    // right on 2026-08-02 and are wrong now — they must not survive.
    expect(near, 'the stale range word-pair must go').not.toMatch(/between six and thirteen/i)
    expect(near, 'the stale endpoint exemplar must go').not.toMatch(/centipede 6\b/i)

    // Indicative + date, in the SAME neighbourhood as the range — the user's
    // ruling. A bare `measured 2026-..` elsewhere in the README must NOT satisfy
    // it, which is why this reads the windowed slice, not the whole file.
    expect(near, 'the range must be marked indicative').toMatch(/indicative/i)
    expect(near, 'an indicative count needs the date it was measured, beside the claim').toMatch(
      /measured\s+20\d\d-\d\d-\d\d/i,
    )
  })
})

describe('jt9-28 AC3 — the Task 12 measurement is ruled HISTORY, with a date bound to it', () => {
  it('the "1280 passed | 566 skipped" claim carries its own date, not the indicative block’s', () => {
    const flat = flatten(readmeRaw())
    expect(flat, 'precondition: the Task 12 measurement is still in the README').toContain(
      '1280 passed',
    )

    // Bound the window to the Task 12 SENTENCE, not its paragraph — so neither
    // the 2026-08-02 stamp on the INDICATIVE block below (a DIFFERENT
    // measurement, ~2 lines away and inside 200 chars) NOR a date added to some
    // other sentence of the surrounding "path depth" paragraph can satisfy this.
    // AC3 is that the claim is dated in its OWN sentence.
    const sentence =
      flat.split(/(?<=\.)\s+/).find((s) => s.includes('1280 passed')) ?? ''

    expect(
      sentence,
      'control: the Task 12 sentence must not borrow the indicative block’s date below it',
    ).not.toContain('2026-08-02')
    expect(
      sentence,
      'a bare past-tense count is ambiguous; the Task 12 import must be dated as the ' +
        'historical record it is, in its own sentence',
    ).toMatch(/20\d\d-\d\d-\d\d/)
  })
})

describe('jt9-28 AC4 — the derived file-count’s contributor cost is written down', () => {
  it('a note tells contributors that adding a test file bumps the derived count in the same commit', () => {
    const md = flatten(readmeRaw()).toLowerCase()
    // The `--project joust` file count is DERIVED (jt5-7 AC5) and guarded, so any
    // new tests/*.test.ts reddens it in the same commit. That tax has silently
    // shaped test PLACEMENT (jt9-3) and is nowhere in the README. RESOLUTION: two
    // required tokens, so a vague sentence about files can't pass.
    expect(
      md,
      'the README must warn that a new test file requires bumping the derived file count',
    ).toMatch(/adding a (new )?test file[^.]*\b(bump|update|derived count|derived file count)\b/)
  })
})
