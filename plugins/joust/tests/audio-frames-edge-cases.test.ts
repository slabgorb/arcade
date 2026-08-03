// tests/audio-frames-edge-cases.test.ts
//
// Story jt9-5 (epic jt9) — RED phase (Mr. Praline / TEA). The two edge cases in
// the frame-window derivation, closed directly rather than leaned on.
//
// ─── BOTH DEFECTS ARE UNREACHABLE TODAY, SO EVERY TEST HERE CONSTRUCTS ───────
// Measured at HEAD, and the two measurements are what make these tests honest
// rather than decorative:
//
//   · all EIGHTEEN entries in CUE_SOURCES are `kind: 'rom'`; `kind: 'invention'`
//     appears exactly once in the whole module, at the type declaration
//   · every shipped row is EVEN — 18 defining rows (after the priority byte) and
//     6 continuation rows (two each for SNPTED, SNPCR1 and SNPCR2, the three
//     multi-row tables), operand counts 2 or 4, ZERO odd
//
// So neither defect fires in production, and neither can be reached by running
// the shipped data through anything. Each test below therefore builds its own
// input, and says in its own comment what it built and why that shape is a real
// failure rather than a contrived one. `derived-vs-transcribed-needs-a-synthetic-
// input` is this repo's standing lesson and it applies twice here: a derivation
// exercised only against records that are all well-formed cannot be told from a
// derivation that mishandles the malformed ones.
//
// ─── DEFECT 1: `framesInRow` DROPS AN ODD TAIL, SILENTLY ─────────────────────
// `framesInRow` (audio-manifest.ts, and note the story's own `:525` citation now
// points at `framesInRow` rather than `framesFor` — cite the SYMBOL) loops
//
//     for (let i = 0; i + 1 < pairs.length; i += 2) frames += evaluateOperand(pairs[i + 1]!)
//
// A row whose operand count is ODD — a sound code with no duration after it —
// has that trailing code skipped. No throw, no log; the window simply comes out
// short, and a short window is inaudible as a bug: the cue just stops holding
// the voice sooner than the machine does.
//
// THE INDIRECT DEFENCE IS REAL, AND IT IS A DIFFERENT MECHANISM. Re-checked:
// `audio-rom-citations.test.ts` ("each cue's table row re-opens at its cited
// line") compares every defining row byte-for-byte against the vendored file,
// and `audio-transporter-split.test.ts` ("every continuation row re-opens
// BYTE-EXACT") does the same for continuations. A hand-mangled row cannot match
// the file, so it cannot ARRIVE. That says nothing about `framesInRow`
// MISHANDLING one, which is what this story closes — and the gap is wider than
// the story states, because BOTH of those checks are
// `describe.skipIf(!vendoredAvailable)` / `it.skipIf(!vendoredAvailable)`. On a
// checkout without `reference/williams-source/joust/` (CI's shape) they skip and
// there is no defence at all, direct or indirect.
//
// ─── DEFECT 2: THE INVENTION ARM, AND THE RULING THIS FILE RESTS ON ──────────
// `framesFor` opens `if (source.kind !== 'rom') return 0`, so an `invention` cue
// gets a FRAME_DURATIONS entry of exactly 0, and the bake's `if (!(frames > 0))`
// then reports `no FRAME_DURATIONS entry` — false, there IS one.
//
// TEA's ruling (jt9-5, and it decides the shape of the whole story): the fix
// keys on the cue's KIND, not on the value 0, and it lives in `framesFor`.
// Reasons, in order of weight:
//
//   1. INFORMATION LOCALITY. `bake-samples.mjs` receives a
//      `Record<string, number>` and nothing else. It cannot see `kind`. A
//      message that says "this cue is an invention and has no ROM table behind
//      it" is not writable there without the bake importing CUE_SOURCES and
//      duplicating the manifest's knowledge. Keyed on the value, the bake can
//      only ever say "the window is zero" — never why.
//   2. THE TWO ZEROS MEAN DIFFERENT THINGS. jt9-4's chamber drives its zero by
//      INJECTING one onto `enemyThud`, a shipped `kind: 'rom'` cue. That is a
//      cue that HAS a table whose window went missing — a data fault. An
//      invention cue's zero is a cue that never had a table — a design gap.
//   3. AN ERROR WHOSE REMEDY IS IMPOSSIBLE IS WORSE THAN THE ONE IT REPLACES.
//      Simply throwing for `invention` would leave the first story that wants an
//      invented sound with a clear message and no way forward — it would have to
//      change `framesFor` anyway. The arm's own doc comment calls it "the honest
//      escape hatch for a later story"; an escape hatch that throws is not one.
//      So the invention arm gains a REQUIRED `frames` field and `framesFor`
//      returns it, refusing anything that is not a positive whole number. That
//      is AC-3(b), and refusing a declared 0 is what stops the fix from merely
//      RELOCATING the defect.
//
// CONSEQUENCE FOR jt9-4's LOADED CHAMBER, STATED PLAINLY: keyed on kind,
// `enemyThud` is still `rom`, still gets the old message, and the chamber's
// ASSERTION stays green. jt9-4's delivery mechanism does not fire on jt9-5's
// invention fix. What it does fire on is its own nine-line comment, whose
// premise ("framesFor() returns 0 for any cue whose source kind is `invention`")
// becomes false the moment this lands — and prose is the unguarded surface. Two
// things follow, and both are discharged rather than noted:
//
//   · `an invention cue no longer reports a window of ZERO` below is the guard
//     that machine-checks that premise, so the comment cannot go stale silently
//     a second time.
//   · the chamber goes RED for a DIFFERENT and independently true reason, filed
//     as the second half of this story and pinned next door in
//     `tools/sample-bake/bake-samples.test.mjs`: "no FRAME_DURATIONS entry for
//     'enemyThud'" is a lie about the chamber's OWN probe, which injects an
//     entry of 0. A present-but-zero entry and an absent one are different
//     faults and get different messages there.
//
// ─── THE REGRESSION THIS STORY COULD CAUSE, AND WHAT PINS IT ────────────────
// Defect 1 changes how a window is COUNTED, so a mistake moves real cue
// durations. Contrary to the framing this story arrived with, the eighteen
// windows are NOT unpinned: `audio-priority.test.ts` ("matches the ROM table
// summed across every (code, duration) pair") already asserts all eighteen by
// value against a transcribed ROM table. jt9-32's territory is what the bake
// PRODUCES (the .wav bytes), which is a different thing and still unpinned.
// `all EIGHTEEN shipped windows are unchanged` below asserts the same eighteen
// numbers off the exported record ITSELF rather than through
// `createAudioEngine()`'s captured manifest — that is the surface the new throw
// sits behind, the surface the bake imports, and the surface that stops loading
// at all if either throw is mis-placed.
import { describe, it, expect } from 'vitest'

import {
  CUE_SOURCES,
  FRAME_DURATIONS,
  framesFor,
  type Citation,
  type CueSource,
  type SoundName,
} from '../src/shell/audio-manifest.js'

// ─── The invention arm, reached through a MIRROR type ────────────────────────
// The `frames` field does not exist on `CueSource` yet, so a literal
// `framesFor({ kind: 'invention', note, frames })` is a tsc error TODAY and
// would redden `npm run lint` — the whole repo's type check — instead of this
// story's tests. A RED must fail in the suite, not in the toolchain, which is
// the same reason `audio-transporter-split.test.ts` reaches every surface jt5-6
// ADDED through a locally-declared mirror. Same idiom, ONE deliberate
// difference: no `try/catch`. That file's `load()` swallows an import failure
// and returns `{}`, which would turn a throw raised while `FRAME_DURATIONS` is
// being built at module load — precisely the failure mode this story's two new
// throws introduce — into a misleading "not implemented yet". Here it surfaces.
//
// `frames` is OPTIONAL in the mirror and required in the real type. That is not
// sloppiness: it lets one test below pass an invention cue with no window at
// all, which the type forbids at compile time but which a value crossing a
// JSON or `satisfies`-free boundary can still be.
interface InventionSurface {
  framesFor: (source: { kind: 'invention'; note: string; frames?: number }) => number
}
const inventionSurface = async (): Promise<InventionSurface> =>
  (await import(/* @vite-ignore */ ['..', 'src', 'shell', 'audio-manifest'].join('/'))) as InventionSurface

// ─── Synthetic ROM citations ─────────────────────────────────────────────────
// The same construction `audio-transporter-split.test.ts` uses for its own
// framesFor probes, kept local so this file states its inputs itself.
const SRC = 'JOUSTRV4.SRC'
const cite = (line: number, verbatim: string): Citation => ({ file: SRC, line, verbatim })

/** A rom cue with a caller-chosen defining row and continuation rows. */
const romCue = (defining: string, continuation: string[] = []): CueSource => ({
  kind: 'rom',
  table: 'FAKE',
  priority: 70,
  romComment: 'NOT A REAL TABLE',
  source: cite(1, defining),
  continuation: continuation.map((v, i) => cite(2 + i, v)),
  callSite: cite(9, '\tLDX\t#FAKE\t\tNOT A REAL CALL SITE'),
})

/** The operand tokens of an `FCB` row — the oracle, re-implemented here so the
 *  parity precondition below is measured rather than taken from the code under
 *  test. */
const operandTokens = (verbatim: string): string[] => {
  const columns = verbatim.split('\t')
  expect(columns[1], `not an FCB row: '${verbatim}'`).toBe('FCB')
  return (columns[2] ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — an odd operand count is REFUSED, not silently counted short
// ═════════════════════════════════════════════════════════════════════════════

describe('jt9-5 AC1 — a row with an unpaired sound code throws instead of losing it', () => {
  it('a DEFINING row with five operands after the priority byte is refused', () => {
    // CONSTRUCTED: `070` priority, then (code,30), (code,255), and a THIRD code
    // with nothing after it. Five operands once the priority byte is dropped.
    // This is the ROM's own malformed shape — the format header says
    // `PIRORITY,SOUND,LENGTH`, so a SOUND with no LENGTH is a transcription that
    // lost a token, exactly the error a hand-typed citation makes.
    //
    // TODAY: `i + 1 < pairs.length` stops at i=2, the trailing code is never
    // reached, and this returns 30 + 255 = 285 — a plausible number, silently
    // 285 instead of an error. Measured before writing this test.
    const odd = romCue('FAKE\tFCB\t070,!N$12!+$80,30,!N$14!+$80,255,!N$16!.$7F\tFIVE OPERANDS')
    expect(() => framesFor(odd)).toThrowError(
      "sound-table row has an unpaired sound code — 5 operands after the priority byte " +
        "cannot form (code, duration) pairs: " +
        "'FAKE\tFCB\t070,!N$12!+$80,30,!N$14!+$80,255,!N$16!.$7F\tFIVE OPERANDS'",
    )
  })

  it('a CONTINUATION row with three operands is refused too — not just the defining row', () => {
    // CONSTRUCTED: a WELL-FORMED defining row followed by a continuation row
    // that has lost its last duration. Continuation rows take `skipPriority:
    // false`, a different arm of the same function, and they are the rows the
    // byte-exact defence protects only when the vendored tree is present.
    //
    // A DIFFERENT operand count (3, not 5) and a DIFFERENT verbatim from the
    // test above, on purpose: both assert a message that interpolates both, so
    // probing the same values twice would leave a hardcoded message satisfying
    // both — `mutate-with-a-WRONG-value-not-the-old-one`, applied to the PROBE.
    // The `after the priority byte` clause is absent here for the same reason:
    // a continuation row has no priority byte, and a message that claims it does
    // is telling the reader to look for a token that is not there.
    //
    // TODAY: returns 30 + 255 = 285, the tail code dropped.
    const odd = romCue('FAKE\tFCB\t070,!N$12!+$80,30\tWELL FORMED', [
      '\tFCB\t    !N$15!+$80,255,!N$00!.$7F',
    ])
    expect(() => framesFor(odd)).toThrowError(
      "sound-table row has an unpaired sound code — 3 operands cannot form " +
        "(code, duration) pairs: '\tFCB\t    !N$15!+$80,255,!N$00!.$7F'",
    )
  })

  it('the pairing check runs BEFORE any operand is evaluated', () => {
    // CONSTRUCTED: an odd row whose duration is ALSO unparseable (`$3F` is hex,
    // and `evaluateOperand` accepts only integers, `+`, `-` and `*`). Two faults
    // in one row, and which one is reported says where the new check sits.
    //
    // TODAY this throws `unparseable sound-table duration operand: '$3F'` —
    // the loop runs first and hits the bad operand before anything notices the
    // row cannot be paired at all. AC-1 requires the pairing fault, because it
    // is the one that explains the other: a row that has lost a token puts every
    // subsequent operand in the wrong column, so "that is not a number" is a
    // symptom and "this row is not pairs" is the cause.
    //
    // This is the only test here that a fix appending the check AFTER the loop
    // would fail, which is exactly what it is for.
    const odd = romCue('FAKE\tFCB\t070,!N$12!+$80,$3F,!N$16!.$7F\tBAD OPERAND TOO')
    expect(() => framesFor(odd)).toThrowError(
      "sound-table row has an unpaired sound code — 3 operands after the priority byte " +
        "cannot form (code, duration) pairs: " +
        "'FAKE\tFCB\t070,!N$12!+$80,$3F,!N$16!.$7F\tBAD OPERAND TOO'",
    )
  })

  it('POSITIVE CONTROL: an EVEN synthetic table still sums, across every row', () => {
    // Without this, a "fix" that threw on every row would satisfy all three
    // tests above. The numbers are SNPCR2's shape — the expression pair that
    // makes `parseInt` wrong — so a fix that broke operand evaluation while
    // adding the pairing check reddens here rather than passing quietly.
    const even = romCue('FAKE\tFCB\t070,!N$12!+$80,30+13\tSTILL FINE', [
      '\tFCB\t    !N$15!+$80,255',
      '\tFCB\t    !N$00!.$7F,165-13',
    ])
    expect(framesFor(even), '(30+13) + 255 + (165-13)').toBe(450)
  })

  it('POSITIVE CONTROL: a row with NO pairs at all is zero, not an error', () => {
    // Zero is even. A `pairs.length % 2 !== 0` check passes it; a
    // `pairs.length < 2` check or a truthiness test would not. The distinction
    // is worth pinning because a priority-only row is a legal (if pointless)
    // FCB row and refusing it would be the fix over-reaching.
    expect(framesFor(romCue('FAKE\tFCB\t070\tPRIORITY ONLY'))).toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — the invention arm carries its OWN window, and refuses a bad one
// ═════════════════════════════════════════════════════════════════════════════

describe('jt9-5 AC3 — an invented cue declares its window; it is not derived as zero', () => {
  it('an invention cue no longer reports a window of ZERO', async () => {
    // CONSTRUCTED: the first invention cue this repo has ever had. None ships —
    // `every cue in CUE_SOURCES is kind: rom` below is the measurement — so the
    // only way to reach this arm is to build one.
    //
    // TODAY `framesFor` returns 0 for it, which is the whole of defect 2: that 0
    // lands in FRAME_DURATIONS and the bake reports `no FRAME_DURATIONS entry`
    // about an entry that exists.
    //
    // THIS TEST IS ALSO THE GUARD ON jt9-4's PROSE. `bake-samples.test.mjs`'s
    // zero-window test carries a nine-line comment whose premise is exactly
    // "framesFor() returns 0 for any cue whose source kind is `invention`". That
    // sentence stops being true here, and nothing else in the suite would
    // notice — `prose-claims-are-the-unguarded-surface`.
    const framesForMirror = (await inventionSurface()).framesFor
    expect(
      framesForMirror({ kind: 'invention', note: 'a sound the machine never made', frames: 60 }),
      'the declared window, returned as declared',
    ).toBe(60)
  })

  it('two invention cues get their OWN windows — the number is not a constant', async () => {
    // A second declaration, a different number. Without it, `return 60` and
    // `return source.frames` are indistinguishable, and so are `return 1` and
    // any other fixed non-zero — the defect would read as fixed while the arm
    // still ignored what it was told.
    const framesForMirror = (await inventionSurface()).framesFor
    expect(framesForMirror({ kind: 'invention', note: 'short', frames: 7 })).toBe(7)
    expect(framesForMirror({ kind: 'invention', note: 'long', frames: 451 })).toBe(451)
  })

  it('a declared window of ZERO is REFUSED — the defect is closed, not relocated', async () => {
    // The clause that makes the whole ruling hold. If the invention arm returned
    // `source.frames` without checking it, a later story that typed `frames: 0`
    // would land in precisely the state this story exists to remove: a 0 in
    // FRAME_DURATIONS and a bake message that says the entry is missing. The
    // fix would have moved the defect one field to the left.
    const framesForMirror = (await inventionSurface()).framesFor
    expect(() => framesForMirror({ kind: 'invention', note: 'silent by mistake', frames: 0 })).toThrowError(
      "invented cue 'silent by mistake' declares a frames window of 0 — an invention has " +
        "no ROM table to size it, so it must declare a positive whole number of frames",
    )
  })

  it('a NEGATIVE, FRACTIONAL, non-finite or MISSING window is refused as well', async () => {
    // Four more shapes, each a different interpolated value, so a message that
    // hardcoded one of them is caught by the others.
    //
    //   -1    `> 0` alone catches this; listed so the check is not weakened to
    //         `!== 0` later without a test noticing.
    //   12.5  `Math.round((frames / FRAME_HZ) * RATE)` would accept it and the
    //         window would silently not be the frame count anyone declared.
    //   NaN / Infinity   BOTH pass a bare `frames > 0`? No — NaN fails it and
    //         Infinity PASSES it, and `Buffer.alloc(Infinity * 2)` in the bake
    //         is the obscure crash that follows. `Number.isInteger` is what
    //         refuses Infinity, and that is why the check is not just `> 0`.
    //   undefined   the field is required by the type, so this is unreachable
    //         through TypeScript — and reachable through anything that hands the
    //         manifest a value it did not type-check.
    const framesForMirror = (await inventionSurface()).framesFor
    const refuse = (note: string, frames: number | undefined, shown: string) =>
      expect(() => framesForMirror({ kind: 'invention', note, frames })).toThrowError(
        `invented cue '${note}' declares a frames window of ${shown} — an invention has ` +
          `no ROM table to size it, so it must declare a positive whole number of frames`,
      )
    refuse('negative', -1, '-1')
    refuse('fractional', 12.5, '12.5')
    refuse('not a number', Number.NaN, 'NaN')
    refuse('unbounded', Number.POSITIVE_INFINITY, 'Infinity')
    refuse('undeclared', undefined, 'undefined')
  })

  it('POSITIVE CONTROL: every cue in CUE_SOURCES is kind: rom, so none of this ships', async () => {
    // The measurement every "unreachable today" claim in this file rests on. If
    // a later story lands an invention cue, this reddens and the reader is sent
    // to read the paragraphs above rather than discovering them by surprise.
    const kinds = Object.entries(CUE_SOURCES).map(([name, s]) => `${name}:${s.kind}`)
    expect(kinds.filter((k) => !k.endsWith(':rom'))).toEqual([])
    expect(kinds.length, 'eighteen cues, all of them ROM-cited').toBe(18)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-5 — nothing that ships moves
// ═════════════════════════════════════════════════════════════════════════════

/** Every shipped window, by value, measured at HEAD before a line of this story
 *  was written (`node` over the manifest, 2026-08-03). These are the numbers a
 *  change to how a window is COUNTED can move without any other test noticing,
 *  and a moved one is an audible change to how long a cue holds the voice. */
const WINDOWS_AT_HEAD: Record<SoundName, number> = {
  enemyDeath: 20,
  playerDeath: 20,
  eggCollected: 30,
  eggHatched: 30,
  pteroArrives: 60,
  pteroDeath: 134,
  playerMaterialise: 450,
  player2Materialise: 450,
  enemyMaterialise: 91,
  extraMan: 90,
  waveBounty: 60,
  cliffDestroyed: 90,
  playerWingDown: 90,
  playerWingUp: 90,
  enemyWingDown: 60,
  enemyWingUp: 60,
  playerThud: 31,
  enemyThud: 31,
}

describe('jt9-5 AC5 — the eighteen shipped windows are unchanged, by value', () => {
  it('every cue holds the voice for exactly as many frames as it did before', () => {
    // Key sets BOTH ways first: a per-cue sweep over one side alone goes green
    // when a cue disappears from the other.
    expect(Object.keys(FRAME_DURATIONS).sort()).toEqual(Object.keys(WINDOWS_AT_HEAD).sort())
    expect(Object.keys(FRAME_DURATIONS).length, 'eighteen cues').toBe(18)
    for (const [name, frames] of Object.entries(WINDOWS_AT_HEAD)) {
      expect(FRAME_DURATIONS[name as SoundName], `${name} window`).toBe(frames)
    }
  })

  it('EVERY shipped row is even — the new pairing throw cannot fire on the manifest', () => {
    // The precondition that makes defect 1's fix safe, machine-checked rather
    // than asserted in a comment. Measured at HEAD: 18 defining rows (2 or 4
    // operands after the priority byte) and 6 continuation rows (2 or 4), zero
    // odd — and the 6 is the number my own header comment first got wrong (I
    // wrote 5; three multi-row tables carry TWO continuation rows each, not
    // one). It reddened here, which is the argument for asserting the row total
    // rather than only the odd list: an empty `odd` array is green over a sweep
    // that visited nothing. If a future citation edit lands an odd row, this names the cue and
    // the row — whereas the throw itself fires while FRAME_DURATIONS is being
    // built at module load, which takes down every test that imports the
    // manifest with a failure that points at the importer, not the citation.
    const odd: string[] = []
    let rows = 0
    for (const [name, source] of Object.entries(CUE_SOURCES)) {
      if (source.kind !== 'rom') continue
      const defining = operandTokens(source.source.verbatim).slice(1)
      rows += 1
      if (defining.length % 2 !== 0) odd.push(`${name} defining row: ${defining.length} operands`)
      for (const row of source.continuation) {
        const tokens = operandTokens(row.verbatim)
        rows += 1
        if (tokens.length % 2 !== 0) odd.push(`${name} ${row.file}:${row.line}: ${tokens.length}`)
      }
    }
    expect(odd, 'a shipped row that cannot be paired').toEqual([])
    expect(rows, 'eighteen defining rows plus six continuation rows').toBe(24)
  })
})
