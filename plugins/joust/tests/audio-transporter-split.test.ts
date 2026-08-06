// tests/audio-transporter-split.test.ts
//
// Story jt5-6 — RED phase (Mr. Praline / TEA). Three workstreams, one story,
// per the user's 2026-08-02 full-scope ruling (context-story-jt5-6.md → Scope):
//
//   (i)   SNPCR2 — player 2 gets its own transporter cue, end to end  (AC3-AC5)
//   (ii)  `CueSource` gains a table's full EXTENT, and the frame total is
//         DERIVED from it rather than hand-transcribed beside it  (AC1, AC2)
//   (iii) the bake CLI's symlink no-op  (AC6)
//
// ─── READ THIS BEFORE JUDGING THE RED ────────────────────────────────────────
// The file is split, and the split is deliberate:
//
//   • ORACLE groups re-derive the facts from the vendored 1982 tree. They PASS
//     ON ARRIVAL — the ROM already says what it says. They are the evidence
//     base, not the deliverable, and they exist so that every number the RED
//     groups demand is checked against the machine rather than against my
//     transcription of it. A reader who finds them green has found them
//     working.
//   • RED groups demand the port record what the oracle derived. They are the
//     story, and they are the only thing that legitimately starts red.
//
// ─── WHY AN ORACLE AT ALL, AND NOT JUST THE NUMBERS ──────────────────────────
// jt5-5 shipped `FRAME_DURATIONS` by HAND-TRANSCRIBING each table's extent into
// a comment, because `CueSource` holds exactly one `Citation` and cannot express
// a span. Its own Dev, TEA and Reviewer all filed the same finding against this
// story. The trap they were avoiding is worth restating, because it is the whole
// reason AC1 and AC2 exist:
//
//     SNPCR1	FCB	070,!N$12!+$80,30	PLAYER 1 RE-CREATED (TRANSPORTER)
//
// is byte-exact, and reading it as the whole table gives 30 frames. The table is
// really :8116-8118 and runs 450. The format header says so —
//
//     *	 PIRORITY,SOUND,LENGTH (IF M.S.BIT SET ON SOUND, SOUND,LENGTH)
//                                                (JOUSTRV4.SRC:8045-8049)
//
// — a pair whose code carries `+$80` is followed by another, and the assembler
// is free to put it on the next line. The citation gate cannot catch this: it
// re-opens the QUOTED LINE and has no view of what a reading of that line
// claims. So a 15x error ships green. The oracle below implements the header's
// rule directly and derives every extent from the file, which is the only way
// the RED groups' numbers are evidence rather than assertion.
//
// ─── THE CONTRACT THIS FILE PINS, AND WHY THIS SHAPE ─────────────────────────
// AC1 says "a line span or a second citation" and AC2 says the total must be
// DERIVED — both leave the shape open, and TEA must settle it or the RED is
// unwritable. Settled here (logged as a Design Deviation in the session):
//
//   `CueSource`'s `rom` variant gains `continuation: readonly Citation[]` —
//   empty for a single-row table, one entry per continuation row otherwise.
//
// Chosen over a bare `lines: [from, to]` pair for one reason that matters: a
// line span states an extent but leaves the continuation rows UNQUOTED, so the
// citation gate still cannot re-open them and the 15x error can still ship
// inside the span. An array of full `Citation`s makes every row of every table
// byte-checkable by the machinery that already exists. The extent is then
// `[source.line, source.line + continuation.length]`, contiguous by
// construction — see `the continuation rows are contiguous` below, which is
// what stops `continuation` degenerating into a bag of unrelated lines.
//
// AC2's derivation is pinned as an EXPORTED function rather than inferred from
// the numbers matching, because a hand-transcribed map agrees with itself
// forever. `framesFor(source)` is called with SYNTHETIC citations below — a
// derivation that is only ever applied to the eighteen real records could be a
// lookup table wearing a function's clothes.
//
// ─── THE ONE HARD CONSTRAINT ON WHERE THIS DATA MAY LIVE ─────────────────────
// `src/shell/audio-manifest.ts` is dependency-free BY DESIGN — its own header
// says "Nothing here may gain an import — that would break the deploy-time bake
// while every vitest stayed green", because `tools/sample-bake/bake-samples.mjs`
// reaches it under PLAIN `node` via type stripping. AC2 requires the bake to get
// its frame counts from the citation, so `CUE_SOURCES` and `framesFor` must land
// in THAT module, not in `audio.ts` (which imports `@shared/audio`). `audio.ts`
// re-exporting them by identity is what keeps every existing consumer working —
// pinned below, because a COPY would agree with itself while the real manifest
// drifted, which is the exact failure `bake-samples.test.mjs` already guards for
// `SOUNDS`.
//
// ─── TYPING: MIRRORS, NOT IMPORTS ────────────────────────────────────────────
// Every module surface this story ADDS is reached through the `load()` helper
// with a locally-declared mirror type, the same idiom as
// audio-rom-citations.test.ts. A literal `import { framesFor } from ...` would
// fail `npm run lint` (tsc --noEmit) today and redden the whole repo's type
// check rather than this story's tests — a RED must fail in the suite, not in
// the toolchain.
//
// ─── THE tp1-8 COLLECTION TRAP ───────────────────────────────────────────────
// `describe.skipIf` still executes the describe callback BODY at collection, so
// a file-reading const hoisted there throws on CI, where the gitignored
// reference/ tree is absent. Every vendored read below therefore happens INSIDE
// an `it()`. The only module-scope filesystem call is `existsSync`.

import { describe, it, expect } from 'vitest'
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { load } from './helpers/dynamic-load'

import { createGame, stepGame } from '../src/core/game.js'
import type { GameState } from '../src/core/game.js'
import type { PlayerInput } from '../src/core/flight.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const vendoredRoot =
  process.env.JOUST_SOURCE_DIR ?? join(root, '..', '..', 'reference', 'williams-source', 'joust')
const vendoredAvailable = existsSync(vendoredRoot)

const SRC = 'JOUSTRV4.SRC'

/** Read the vendored file as lines. Only ever called inside an `it()`. */
function vendoredLines(file: string): string[] {
  const p = join(vendoredRoot, file)
  if (!existsSync(p)) throw new Error(`the vendored tree has no ${file}`)
  // latin1 + strip CR: the tree is CRLF, and a naive utf8 read leaves \r glued
  // to the last token of every line, which silently breaks operand parsing.
  return readFileSync(p, 'latin1').split('\n').map((l) => l.replace(/\r$/, ''))
}

// ═════════════════════════════════════════════════════════════════════════════
// THE ORACLE — the sound-table format header, implemented
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Evaluate an assembler duration operand. The ROM writes these as EXPRESSIONS,
 * not digits — `30+13`, `165-13`, `2*60`, `4*60` all appear in the sound table,
 * and SNPCR2's two are exactly why AC2 names this. Deliberately NOT `eval`, and
 * deliberately not a regex that grabs the first integer: `165-13` read as "165"
 * is the same class of error as reading a table's first row as the whole table.
 */
function evalOperand(expr: string): number {
  const t = expr.trim()
  if (!/^[0-9]+(\s*[-+*]\s*[0-9]+)*$/.test(t)) {
    throw new Error(`unparseable duration operand: '${expr}'`)
  }
  // * binds tighter than + / -, so fold products first, then sum left to right.
  const terms = t.split(/(?<=[0-9\s])([+-])(?=[\s0-9])/)
  let total = 0
  let sign = 1
  for (const piece of terms) {
    if (piece === '+') { sign = 1; continue }
    if (piece === '-') { sign = -1; continue }
    const product = piece.split('*').reduce((a, b) => a * Number(b.trim()), 1)
    total += sign * product
  }
  return total
}

/** The operand field of an `FCB` row — index 2 of the tab split, for both a
 *  labelled defining row and an indented continuation row. Returns null if the
 *  line is not an FCB row at all. */
function fcbOperands(line: string): string | null {
  const cols = line.split('\t')
  if (cols[1] !== 'FCB') return null
  return cols[2] ?? ''
}

interface Pair {
  /** True iff the code carries the M.S. bit (`+$80`) — "another pair follows". */
  continues: boolean
  frames: number
}

/** Split an operand field into (code, duration) pairs. `skipPriority` is set
 *  for a table's DEFINING row, whose first token is the priority byte. */
function pairsIn(operands: string, skipPriority: boolean): Pair[] {
  const tokens = operands.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
  const rest = skipPriority ? tokens.slice(1) : tokens
  const out: Pair[] = []
  for (let i = 0; i + 1 < rest.length; i += 2) {
    // The header names the bit, not the spelling: `+$80` SETS it, `.$7F` masks
    // it off, and a bare code like `$00` never had it. Only `+$80` continues.
    out.push({ continues: /\+\$80\b/.test(rest[i]!), frames: evalOperand(rest[i + 1]!) })
  }
  return out
}

interface TableExtent {
  label: string
  priority: number
  startLine: number
  endLine: number
  frames: number
  /** The `.length` of a correct `continuation` array. */
  continuationLines: number
}

/**
 * Walk a sound table from its defining row, following the format header's
 * continuation rule: a row whose LAST pair carries the M.S. bit is followed by
 * another row. `!N$00` counts toward the total — the header says it "DOES NOT
 * DISTURBE THE SOUND, BUT EXTENDS TIMER", which is what makes SNPCR1 450 and
 * not 285.
 */
function readTable(lines: string[], startLine: number): TableExtent {
  const first = lines[startLine - 1] ?? ''
  const label = first.split('\t')[0] ?? ''
  const ops = fcbOperands(first)
  if (ops === null) throw new Error(`${SRC}:${startLine} is not an FCB row`)
  const priority = evalOperand(ops.split(',')[0]!)

  let n = startLine
  let frames = 0
  let pairs = pairsIn(ops, true)
  for (;;) {
    for (const p of pairs) frames += p.frames
    const last = pairs[pairs.length - 1]
    // No pairs on this row (a bare priority byte) also continues — the table's
    // data simply starts on the next line.
    if (last !== undefined && !last.continues) break
    n += 1
    const nextOps = fcbOperands(lines[n - 1] ?? '')
    if (nextOps === null) throw new Error(`${SRC}:${n} should continue ${label} but is not an FCB row`)
    pairs = pairsIn(nextOps, false)
  }
  return { label, priority, startLine, endLine: n, frames, continuationLines: n - startLine }
}

/** The nearest label at or above `line` — which decision block a `FDB` row is
 *  part of. This is what AC5 turns on: :5544 and :5552 both name SNPCR1 and
 *  they belong to DIFFERENT blocks. */
function owningLabel(lines: string[], line: number): string {
  for (let n = line; n > 0; n--) {
    const label = (lines[n - 1] ?? '').split('\t')[0] ?? ''
    if (/^[A-Z][A-Z0-9]*$/.test(label)) return label
  }
  throw new Error(`no label at or above ${SRC}:${line}`)
}

// ═════════════════════════════════════════════════════════════════════════════
// The module surfaces this story adds — mirrors, never imports (see header)
// ═════════════════════════════════════════════════════════════════════════════

interface Citation {
  file: string
  line: number
  verbatim: string
}

type RomCueSource = {
  kind: 'rom'
  table: string
  priority: number
  romComment: string
  source: Citation
  /** NEW in jt5-6 — the rows that continue the table. `[]` when there are none. */
  continuation?: readonly Citation[]
  callSite: Citation
}

type CueSource = RomCueSource | { kind: 'invention'; note: string }

interface ManifestSurface {
  SOUNDS: Readonly<Record<string, string>>
  FRAME_DURATIONS: Readonly<Record<string, number>>
  CUE_SOURCES: Readonly<Record<string, CueSource>>
  framesFor: (source: CueSource) => number
}

const manifest = () => load<ManifestSurface>(import.meta.url, ['..', 'src', 'shell', 'audio-manifest'])
const shell = () => load<ManifestSurface>(import.meta.url, ['..', 'src', 'shell', 'audio'])

async function need<K extends keyof ManifestSurface>(key: K): Promise<ManifestSurface[K]> {
  const value = (await manifest())[key]
  if (value === undefined) {
    throw new Error(
      `jt5-6 not implemented yet: src/shell/audio-manifest.ts must export \`${String(key)}\`.`,
    )
  }
  return value as ManifestSurface[K]
}

/** Only the `rom` entries, which is all seventeen-plus-one of them today. */
async function romSources(): Promise<[string, RomCueSource][]> {
  const sources = await need('CUE_SOURCES')
  return Object.entries(sources).filter((e): e is [string, RomCueSource] => e[1].kind === 'rom')
}

/**
 * The bake, reached through the computed-specifier `load()` rather than a
 * literal import. `bake-samples.mjs` ships no declarations, so a literal
 * `import ... from '../tools/sample-bake/bake-samples.mjs'` is a TS7016 under
 * `npm run lint` — and a RED must fail in the SUITE, not in the toolchain.
 * (bake-samples.test.mjs may import it literally: it is `.mjs`, so tsc never
 * looks at it.)
 */
async function bakeFn(): Promise<(outDir: string) => Promise<void>> {
  const fn = (
    await load<{ bakeSamples: (outDir: string) => Promise<void> }>(import.meta.url, [
      '..', 'tools', 'sample-bake', 'bake-samples.mjs',
    ])
  ).bakeSamples
  if (typeof fn !== 'function') {
    throw new Error('tools/sample-bake/bake-samples.mjs must export `bakeSamples(outDir)`.')
  }
  return fn
}

type PlayEventSounds = (
  audio: { play: (s: string) => void; tick: () => void },
  events: readonly Record<string, unknown>[],
) => void

async function dispatchFn(): Promise<PlayEventSounds> {
  const fn = (await load<{ playEventSounds: PlayEventSounds }>(import.meta.url, ['..', 'src', 'shell', 'audio-dispatch']))
    .playEventSounds
  if (typeof fn !== 'function') {
    throw new Error('src/shell/audio-dispatch.ts must export `playEventSounds(audio, events)`.')
  }
  return fn
}

/** Dispatch one event and return the cue names the engine was asked to play. */
async function cuesFor(event: Record<string, unknown>): Promise<string[]> {
  const play = await dispatchFn()
  const played: string[] = []
  play({ play: (s) => void played.push(s), tick: () => {} }, [event])
  return played
}

// ─── staging the sim ─────────────────────────────────────────────────────────
// The same deterministic input script audio-events.test.ts uses, so a frame
// number means the same thing in both files. Copied rather than shared: that
// file keeps it module-private, and a cross-test import would couple this
// story's fixtures to another story's helper layout.

const IDLE: PlayerInput = { dir: 0, flap: false, flapHeld: false }
const DIRS: readonly (-1 | 0 | 1)[] = [-1, -1, 0, 1, 1]
const scripted = (frame: number): PlayerInput => {
  const flap = frame % 13 === 0
  return { dir: DIRS[frame % 5]!, flap, flapHeld: flap }
}
const inputsAt = (frame: number): Record<number, PlayerInput> => ({ 1: scripted(frame), 2: IDLE })

const playerIds = (g: GameState): number[] =>
  g.sim.sim.processes.filter((p) => p.kind === 'player').map((p) => (p as { id?: number }).id ?? -1)

/** Step to `frame` (exclusive), then take that frame. Returns both states. */
function frameAt(seed: number, frame: number): { before: GameState; after: GameState } {
  let g = createGame(seed)
  for (let i = 0; i < frame; i++) g = stepGame(g, inputsAt(i))
  return { before: g, after: stepGame(g, inputsAt(frame)) }
}

/** Which knights RE-ENTERED on `frame` — read off the processes, never the
 *  event stream, so this is usable as a precondition before the payload lands. */
function materialisedIdsAt(seed: number, frame: number): number[] {
  const { before, after } = frameAt(seed, frame)
  const had = playerIds(before)
  return playerIds(after).filter((id) => !had.includes(id))
}

interface MaterialiseEvent {
  readonly type: string
  readonly player?: number
}

/** The `player-materialise` events emitted on `frame`. */
function materialiseEventsAt(seed: number, frame: number): MaterialiseEvent[] {
  const events = (frameAt(seed, frame).after as GameState & { events?: readonly MaterialiseEvent[] })
    .events
  expect(Array.isArray(events), 'stepGame must return an `events` array').toBe(true)
  return (events ?? []).filter((e) => e.type === 'player-materialise')
}

// ═════════════════════════════════════════════════════════════════════════════
// ORACLE — green on arrival. The evidence base for every number below.
// ═════════════════════════════════════════════════════════════════════════════

describe.skipIf(!vendoredAvailable)('jt5-6 ORACLE — the ROM, re-derived (these PASS on arrival)', () => {
  it('the format header states the continuation rule this file implements', () => {
    const lines = vendoredLines(SRC)
    expect(lines[8045], `${SRC}:8046 is the rule the whole story turns on`).toBe(
      '*\t PIRORITY,SOUND,LENGTH (IF M.S.BIT SET ON SOUND, SOUND,LENGTH)',
    )
    expect(lines[8046], `${SRC}:8047 is why !N$00 rows COUNT toward the total`).toBe(
      '*\t\tSOUND !N$00 DOES NOT DISTURBE THE SOUND, BUT EXTENDS TIMER',
    )
  })

  it('SNPCR1 runs :8116-8118 and totals 450 frames — not the 30 its cited row alone gives', () => {
    const lines = vendoredLines(SRC)
    const t = readTable(lines, 8116)
    expect(t.label).toBe('SNPCR1')
    expect(t.priority).toBe(70)
    expect(t.endLine, 'the table continues past its defining row').toBe(8118)
    expect(t.continuationLines).toBe(2)
    expect(t.frames, '30 + 255 + 165').toBe(450)
    // The control that makes the number mean something: the cited row ALONE.
    const citedRowOnly = pairsIn(fcbOperands(lines[8115]!)!, true).reduce((a, p) => a + p.frames, 0)
    expect(citedRowOnly, 'reading only the cited row is the 15x error').toBe(30)
    expect(t.frames / citedRowOnly, 'fifteen times short').toBe(15)
  })

  it('SNPCR2 runs :8119-8121 and ALSO totals 450 — its operands are expressions', () => {
    const lines = vendoredLines(SRC)
    const t = readTable(lines, 8119)
    expect(t.label).toBe('SNPCR2')
    expect(t.priority, 'the same priority byte as SNPCR1 — they arbitrate alike').toBe(70)
    expect(t.endLine).toBe(8121)
    expect(t.continuationLines).toBe(2)
    expect(t.frames, '(30+13) + 255 + (165-13)').toBe(450)
    // The 13 frames are MOVED, not added: P2's transporter opens later and its
    // silent tail is shorter by exactly the same amount. A parser that read the
    // digits instead of the expressions would get 30 and 165 and still total
    // 450 by luck, so assert the SHIFTED halves, not just the sum.
    const rows = [8119, 8120, 8121].map((n) => pairsIn(fcbOperands(lines[n - 1]!)!, n === 8119)[0]!)
    expect(rows[0]!.frames, "SNPCR2's opener is 30+13").toBe(43)
    expect(rows[2]!.frames, "SNPCR2's tail is 165-13").toBe(152)
  })

  it('exactly THREE of the cues cite a multi-row table — SNPTED, SNPCR1, SNPCR2', () => {
    const lines = vendoredLines(SRC)
    // Every table the port cites, plus SNPCR2 which it is about to.
    const cited: Record<string, number> = {
      SNEDIE: 8104, SNPDIE: 8115, SNEGG: 8098, SNEGGH: 8099, SNPTEI: 8094, SNPTED: 8091,
      SNPCR1: 8116, SNPCR2: 8119, SNECRE: 8103, SNREPL: 8089, SNBOUN: 8096, SNCLIF: 8090,
      SNPLWD: 8126, SNPLWU: 8125, SNELWD: 8108, SNELWU: 8107, SNPTHD: 8124, SNETHD: 8106,
    }
    const multi: string[] = []
    for (const [label, line] of Object.entries(cited)) {
      const t = readTable(lines, line)
      expect(t.label, `${SRC}:${line} must really define ${label}`).toBe(label)
      if (t.continuationLines > 0) multi.push(label)
    }
    expect(multi.sort(), 'AC1 names these three, and only these three').toEqual(
      ['SNPCR1', 'SNPCR2', 'SNPTED'],
    )
  })

  it('SNPTED is 134 and SNECRE is 91 — the two shapes a naive parser gets wrong', () => {
    const lines = vendoredLines(SRC)
    // SNPTED puts TWO pairs on its defining row and continues anyway.
    expect(readTable(lines, 8091).frames, '15+15+7+7+90').toBe(134)
    expect(readTable(lines, 8091).endLine).toBe(8093)
    // SNECRE's second code is a BARE `$00`, not `!N$00!` — the M.S. bit is
    // clear, so the table STOPS there. A parser keyed on the `!N$` spelling
    // rather than on the bit would run off the end of it into SNEDIE.
    expect(readTable(lines, 8103).frames, '90 + 1').toBe(91)
    expect(readTable(lines, 8103).endLine, 'SNECRE does NOT continue').toBe(8103)
  })

  it('the two tables are bound to DIFFERENT decision blocks, and each is bound TWICE', () => {
    const lines = vendoredLines(SRC)
    // This is AC5's whole content. :5544 and :5552 both end in SNPCR1 and they
    // are not interchangeable — the G-blocks and P-blocks differ in their
    // joystick source and in the 8th sound slot (`0` vs SNPTREF).
    expect(owningLabel(lines, 5544)).toBe('G1DEC')
    expect(owningLabel(lines, 5548)).toBe('G2DEC')
    expect(owningLabel(lines, 5552)).toBe('P1DEC')
    expect(owningLabel(lines, 5556)).toBe('P2DEC')
    expect(lines[5543], ':5544 really is the SNPCR1 row').toContain('SNPCR1')
    expect(lines[5551], ':5552 really is the SNPCR1 row').toContain('SNPCR1')
    expect(lines[5547], ':5548 really is the SNPCR2 row').toContain('SNPCR2')
    expect(lines[5555], ':5556 really is the SNPCR2 row').toContain('SNPCR2')
    // The discriminator, so "nearest label above" is not doing the work alone.
    expect(lines[5551], "P1DEC's row carries SNPTREF in slot 8").toContain('SNPFAL,SNPTREF,SNPCR1')
    expect(lines[5543], "G1DEC's row carries a bare 0 there").toContain('SNPFAL,0,SNPCR1')
  })

  it('the operand evaluator handles every expression the sound table actually uses', () => {
    // Guards the oracle itself — a broken evaluator would make every extent
    // above agree with a wrong number just as confidently.
    expect(evalOperand('30')).toBe(30)
    expect(evalOperand('30+13')).toBe(43)
    expect(evalOperand('165-13')).toBe(152)
    expect(evalOperand('2*60')).toBe(120)
    expect(evalOperand('4*60')).toBe(240)
    expect(() => evalOperand('$80')).toThrow()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — a CueSource carries its table's FULL EXTENT
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-6 AC1 — every CueSource states its table extent, not just the defining row', () => {
  it('every rom cue exposes a `continuation` array — present even when empty', async () => {
    const entries = await romSources()
    expect(entries.length, 'precondition: there are rom cues at all').toBeGreaterThan(0)
    const missing = entries.filter(([, s]) => !Array.isArray(s.continuation)).map(([n]) => n)
    expect(
      missing,
      'AC1: "the other fourteen are single-row and must SAY SO rather than being silently ' +
        'ambiguous" — an absent field is exactly the ambiguity, so `continuation: []` is required',
    ).toEqual([])
  })

  it('the continuation rows are contiguous with the defining row', async () => {
    // Without this, `continuation` degenerates into a bag of unrelated citations
    // and "the extent is [source.line, source.line + continuation.length]" stops
    // being true — which is the property every frame total below rests on.
    const entries = await romSources()
    const broken: string[] = []
    for (const [name, s] of entries) {
      const want = (s.continuation ?? []).map((_, i) => s.source.line + i + 1)
      const got = (s.continuation ?? []).map((c) => c.line)
      if (JSON.stringify(want) !== JSON.stringify(got)) broken.push(`${name}: ${got} != ${want}`)
    }
    expect(broken, 'a table occupies consecutive lines').toEqual([])
  })

  it('every continuation row cites the same file as its defining row', async () => {
    const entries = await romSources()
    const wrong = entries.flatMap(([name, s]) =>
      (s.continuation ?? []).filter((c) => c.file !== s.source.file).map((c) => `${name}: ${c.file}`),
    )
    expect(wrong, 'a table cannot span two files').toEqual([])
  })

  it.skipIf(!vendoredAvailable)('every continuation row re-opens BYTE-EXACT against the vendored tree', async () => {
    // This is the clause the existing citation gate cannot provide: it re-opens
    // `source.verbatim` only, so a continuation row could say anything. With
    // these quoted, the whole table is checkable by the machinery that exists.
    const entries = await romSources()
    const lines = vendoredLines(SRC)
    const wrong: string[] = []
    for (const [name, s] of entries) {
      for (const c of s.continuation ?? []) {
        const actual = lines[c.line - 1]
        if (actual !== c.verbatim) wrong.push(`${name} @ ${c.file}:${c.line}\n  want: ${actual}\n  got:  ${c.verbatim}`)
      }
    }
    expect(wrong.join('\n'), 'every quoted continuation row must match the file').toBe('')
  })

  it.skipIf(!vendoredAvailable)('the declared extent MATCHES the extent the ROM actually has', async () => {
    // The strong one. Not "the port says 2 continuation rows" but "the ROM,
    // walked by the header's own rule, has exactly 2". A transcription that
    // drifts from the machine reddens here and nowhere else.
    const entries = await romSources()
    const lines = vendoredLines(SRC)
    const wrong: string[] = []
    for (const [name, s] of entries) {
      const t = readTable(lines, s.source.line)
      if (t.continuationLines !== (s.continuation ?? []).length) {
        wrong.push(`${name} (${s.table}): declares ${(s.continuation ?? []).length} continuation ` +
          `rows, ROM has ${t.continuationLines} (:${t.startLine}-${t.endLine})`)
      }
    }
    expect(wrong.join('\n')).toBe('')
  })

  it.skipIf(!vendoredAvailable)('the three multi-row tables are the ones carrying continuation rows', async () => {
    const entries = await romSources()
    const multi = entries.filter(([, s]) => (s.continuation ?? []).length > 0).map(([, s]) => s.table)
    expect(multi.sort(), 'SNPTED, SNPCR1 and SNPCR2 — no more, no fewer').toEqual(
      ['SNPCR1', 'SNPCR2', 'SNPTED'],
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — the frame total is DERIVED from the citation, and the module still
//       imports nothing
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-6 AC2 — the window is computed from the cited rows, not transcribed beside them', () => {
  it('audio-manifest.ts exports `framesFor`', async () => {
    const fn = (await manifest()).framesFor
    expect(
      typeof fn,
      'AC2 needs the derivation to be a callable seam — a total that is only ever ' +
        'applied to the eighteen real records cannot be told from a lookup table',
    ).toBe('function')
  })

  it('framesFor sums a SYNTHETIC multi-row table — expressions and all', async () => {
    // Synthetic on purpose. Run only against the shipped records, this function
    // could `return FRAME_DURATIONS[name]` and pass everything.
    const framesFor = await need('framesFor')
    const synthetic: CueSource = {
      kind: 'rom',
      table: 'FAKE',
      priority: 70,
      romComment: 'NOT A REAL TABLE',
      source: { file: SRC, line: 1, verbatim: 'FAKE\tFCB\t070,!N$12!+$80,30+13\tNOT A REAL TABLE' },
      continuation: [
        { file: SRC, line: 2, verbatim: '\tFCB\t    !N$15!+$80,255\tSTILL FAKE' },
        { file: SRC, line: 3, verbatim: '\tFCB\t    !N$00!.$7F,165-13' },
      ],
      callSite: { file: SRC, line: 4, verbatim: '\tFDB\tFAKE' },
    }
    expect(framesFor(synthetic), '(30+13) + 255 + (165-13)').toBe(450)
  })

  it('framesFor reads the EXPRESSION, not the first integer in it', async () => {
    const framesFor = await need('framesFor')
    const one = (verbatim: string): CueSource => ({
      kind: 'rom', table: 'FAKE', priority: 1, romComment: '',
      source: { file: SRC, line: 1, verbatim },
      continuation: [],
      callSite: { file: SRC, line: 2, verbatim: '\tFDB\tFAKE' },
    })
    // `165-13` read as "165" is the same family of error as reading a cited row
    // as a whole table, and it is the one AC2 calls out by name.
    expect(framesFor(one('FAKE\tFCB\t070,!N$12!.$7F,165-13')), '165-13 is 152').toBe(152)
    expect(framesFor(one('FAKE\tFCB\t070,!N$12!.$7F,2*60')), '2*60 is 120').toBe(120)
  })

  it('framesFor counts a !N$00 row — it extends the timer', async () => {
    const framesFor = await need('framesFor')
    const withTail: CueSource = {
      kind: 'rom', table: 'FAKE', priority: 1, romComment: '',
      source: { file: SRC, line: 1, verbatim: 'FAKE\tFCB\t070,!N$12!+$80,30' },
      continuation: [{ file: SRC, line: 2, verbatim: '\tFCB\t    !N$00!.$7F,165' }],
      callSite: { file: SRC, line: 3, verbatim: '\tFDB\tFAKE' },
    }
    // Dropping the !N$00 row would give 30 and still look like a plausible
    // "duration", which is why the header's own sentence is quoted in the
    // oracle above.
    expect(framesFor(withTail), '30 + 165 — the silent tail counts').toBe(195)
  })

  it('every shipped FRAME_DURATIONS value IS framesFor of that cue’s citation', async () => {
    // The clause that makes the two unable to drift. If Dev hand-writes the map
    // and the citation later moves, this reddens — which is the entire point of
    // folding one into the other.
    const [durations, framesFor, sources] = await Promise.all([
      need('FRAME_DURATIONS'), need('framesFor'), need('CUE_SOURCES'),
    ])
    const wrong: string[] = []
    for (const [name, source] of Object.entries(sources)) {
      if (source.kind !== 'rom') continue
      const derived = framesFor(source)
      if (durations[name] !== derived) wrong.push(`${name}: map says ${durations[name]}, citation gives ${derived}`)
    }
    expect(wrong.join('\n')).toBe('')
    expect(Object.keys(durations).length, 'precondition: the map is populated').toBeGreaterThan(0)
  })

  it('the transporter windows survive the fold: both knights get 450 frames', async () => {
    const durations = await need('FRAME_DURATIONS')
    expect(durations.playerMaterialise, 'SNPCR1 :8116-8118').toBe(450)
    expect(durations.player2Materialise, 'SNPCR2 :8119-8121').toBe(450)
    expect(durations.pteroDeath, 'SNPTED :8091-8093 — the other multi-row table').toBe(134)
  })

  it('audio-manifest.ts still imports NOTHING — the bake reaches it under plain node', async () => {
    // Its own header: "Nothing here may gain an import — that would break the
    // deploy-time bake while every vitest stayed green." Moving CUE_SOURCES in
    // is exactly the edit that could violate this, and vitest resolves the
    // @shared alias so nothing else here would notice.
    const text = readFileSync(join(root, 'src', 'shell', 'audio-manifest.ts'), 'utf8')
    const imports = text.match(/^\s*import\s.+$/gm) ?? []
    expect(imports, 'the manifest module must stay dependency-free').toEqual([])
  })

  it('CUE_SOURCES lives in the manifest and audio.ts re-exports it BY IDENTITY', async () => {
    // A copy would agree with itself forever while the real manifest drifted —
    // the same failure bake-samples.test.mjs already guards for SOUNDS.
    const [fromManifest, fromShell] = await Promise.all([need('CUE_SOURCES'), shell()])
    expect(fromShell.CUE_SOURCES, 'audio.ts must keep exporting CUE_SOURCES').toBeTruthy()
    expect(fromShell.CUE_SOURCES, 'same object, not a copy').toBe(fromManifest)
  })

  // NOTE — a third test lived here and was DELETED before handoff, deliberately.
  // It asserted `bake-samples.mjs` imports from `audio-manifest.ts`, which is
  // already true (:39) and stays true whatever Dev does, so it was green on
  // arrival and could never fail for this story: vacuous. `every shipped
  // FRAME_DURATIONS value IS framesFor of that cue's citation` above is the
  // clause that actually forbids a second hand-written transcription, and it
  // reds today. Recorded here so it is not re-added as "missing coverage".
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — the two knights get DIFFERENT cues
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-6 AC3 — player 2 sounds SNPCR2, not player 1’s table', () => {
  it('the manifest names a second transporter cue', async () => {
    const sounds = await need('SOUNDS')
    expect(
      sounds.player2Materialise,
      'jt5-1 collapsed the two knights onto one cue; AC3 splits them',
    ).toBeTruthy()
  })

  it('the two cues are DIFFERENT files — not one table wearing two names', async () => {
    const sounds = await need('SOUNDS')
    expect(sounds.player2Materialise).not.toBe(sounds.playerMaterialise)
    expect(sounds.player2Materialise, 'a .wav of its own').toMatch(/^[a-z0-9_]+\.wav$/)
  })

  it('player2Materialise cites SNPCR2 at :8119, bound at P2DEC :5556', async () => {
    const sources = await need('CUE_SOURCES')
    const s = sources.player2Materialise
    expect(s, 'a cue with no provenance is what AC5 of jt5-1 forbids').toBeTruthy()
    expect(s!.kind).toBe('rom')
    const rom = s as RomCueSource
    expect(rom.table).toBe('SNPCR2')
    expect(rom.priority, 'the same 070 as SNPCR1 — they arbitrate alike').toBe(70)
    expect(rom.romComment).toBe('PLAYER 2 RE-CREATED (TRANSPORTER)')
    expect(rom.source.line).toBe(8119)
    expect(rom.callSite.line, "P2DEC's decision block, not G2DEC's").toBe(5556)
  })

  it('the sim really re-enters BOTH knights — the fixtures below are measured, not guessed', () => {
    // Precondition for the two payload tests. Green today: it reads only
    // process ids, never the event stream, so it proves the staging is real
    // before the payload exists to carry it.
    // jt5-8 RE-BASELINE. The dumb brain's LNTUP/LNTOFP alternation re-flies every
    // unpromoted buzzard, so the knights meet them elsewhere and the re-entry
    // frames move with the deaths that cause them. Re-found by sweeping 2600
    // frames of each seed for THIS test's own precondition — a player id
    // appearing in the process list that was not there the frame before — never
    // by nudging a number:
    //   0xbeef re-entries: 214→2, 340→1, 540→2, 820→2, 1122→2, 1784→1
    //   0xface re-entries: 622→1, 950→1, 1395→1, 2063→2, 2233→2, 2245→1, 2535→2
    // 214 is UNMOVED. 372 → 340, the same knight (1) and still this seed's first
    // player-1 re-entry. 1889 → 2063, chosen from 0xface's list because the
    // coupling below requires knight TWO and it is the earliest that re-enters
    // knight 2; audio-events.test.ts stages the same frame, as it did before.
    //
    // jt9-9 RE-BASELINE, and only 0xface moved. Re-swept both seeds the same
    // way — a player id appearing in the process list that was not there the
    // frame before:
    //   0xbeef re-entries: 214→2, 340→1, 540→2, 820→2, 1122→2, 1784→1  (IDENTICAL)
    //   0xface re-entries: 622→1, 950→1, 1196→1, 2489→1, 2579→2
    //
    // jt9-25 RE-BASELINE, and again only 0xface moved. The EGGMAN hatch cutscene
    // (and the committed-egg no-catch fix that lets a hatch actually reach its
    // remount on this seed) reshapes the timeline from the first hatch on. Re-swept
    // both seeds the same way, never by nudging:
    //   0xbeef re-entries: 214→2, 340→1, 540→2, 820→2, 1122→2, 1784→1  (STILL IDENTICAL)
    //   0xface re-entries: 622→1, 950→1, 1391→1, 1894→2, 1922→1
    // Both 0xbeef fixtures are therefore untouched again — its window holds no
    // settling kill-egg that reaches the cutscene. 0xface's only knight-TWO re-entry
    // is now 1894, so that is the fixture — chosen by the same rule as every prior
    // move, the earliest that re-enters knight 2. audio-events.test.ts stages the
    // same frame, as it has through all three moves.
    //
    // jt9-24 RE-BASELINE, and this time 0xbeef moved while 0xface did NOT. The
    // decoded SELPLY nearest-of-two metric re-routes which knight each buzzard
    // homes on, so the deaths — and the transporter re-entries downstream of them
    // — shift for 0xbeef. Re-swept both seeds by THIS test's own precondition (a
    // player id in the process list that was not there the frame before), never
    // by nudging:
    //   0xbeef re-entries: 350→1, 516→2, 1646→1, 1870→1, 2563→2
    //   0xface re-entries: 622→1, 950→1, 1391→1, 1894→2, 2137→1  (IDENTICAL)
    // By the same rule as every prior move: 0xbeef's earliest knight-TWO re-entry
    // is now 516 and its first knight-1 re-entry is 350. 0xface/1894 is untouched,
    // so audio-events.test.ts still stages the same frame.
    //
    // jt9-8 RE-BASELINE: 0xbeef 516 -> 1803 (knight 2), 0xbeef 350 -> 1884
    // (knight 1), 0xface 1894 -> 1403 (knight 2). BOTH seeds moved this time, and
    // they moved far. `runBehaviour` now RE-INITs a PLAYER's `timeUp` to 0 on every
    // wing transition (`CLR PTIMUP,U`), so the scripted knight's flap-lift budget
    // restarts at each GOFLAP/GOFLIP/STFLY edge and its whole trajectory diverges
    // from frame 0 onward. Every death that feeds a transporter re-entry therefore
    // happens somewhere else, which is why no earlier fixture survived. Buzzard
    // flight is untouched (AC3), but the knight is half of every collision that
    // kills it. Re-swept 2600 frames of each seed for THIS test's own precondition
    // — a player id appearing in the process list that was not there the frame
    // before — never by nudging a number:
    //   0xbeef re-entries: 1803->2, 1884->1, 2114->1
    //   0xface re-entries:  252->1,  822->1, 1403->2
    //
    // jt9-43 RE-BASELINE: folding BPCOL's COLDX makes every collision screen-precise,
    // reshaping both seeds' death/re-entry timelines again. Re-swept 2600 frames of each
    // seed for THIS test's precondition (a player id appearing that was not there the
    // frame before):
    //   0xbeef re-entries: 2110->2   (its ONLY re-entry in the window — knight 1 no
    //                                 longer re-enters here at all)
    //   0xface re-entries:  259->1, 2370->2
    // 0xbeef can no longer supply BOTH knights, so the DISAGREEING pair the clauses
    // below need moves to 0xface, which still has an earliest knight-1 (259) and an
    // earliest knight-2 (2370). Same "earliest that re-enters knight N" rule as every
    // prior move; the sibling audio-events fixture is re-baselined independently.
    expect(materialisedIdsAt(0xface, 259), 'seed 0xface frame 259 re-enters knight 1').toEqual([1])
    expect(materialisedIdsAt(0xface, 2370), 'seed 0xface frame 2370 re-enters knight 2').toEqual([2])
    expect(materialisedIdsAt(0xbeef, 2110), 'seed 0xbeef frame 2110 re-enters knight 2').toEqual([2])
  })

  it('the emitted moment carries the knight it belongs to', async () => {
    // The payload is the mechanism. Without it the dispatch has nothing to
    // branch on and "both knights map onto SNPCR1" is unavoidable — which is
    // the defect this story exists to remove. Asserted BEHAVIOURALLY at two
    // measured frames rather than by reading events.ts, because a type can
    // declare a field the emitter never fills.
    // jt9-8 RE-BASELINE: 516 -> 1803 (knight 2) and 350 -> 1884 (knight 1).
    // jt9-43 RE-BASELINE: moved to 0xface — knight 2 at 2370, knight 1 at 259 —
    // because 0xbeef no longer re-enters knight 1 under screen-precise collision.
    expect(materialiseEventsAt(0xface, 2370).map((e) => e.player)).toEqual([2])
    expect(materialiseEventsAt(0xface, 259).map((e) => e.player)).toEqual([1])
  })

  it('the payload is the LOOP’s id, not a constant — the two frames disagree', async () => {
    // The control that kills the cheapest green: `player: 1` hardcoded at the
    // emit site satisfies the player-1 frame and every dispatch test below.
    // jt9-8 RE-BASELINE: 516 -> 1803, 350 -> 1884.
    // jt9-43 RE-BASELINE: on 0xface — knight-2 re-entry (2370) and knight-1 re-entry
    // (259), so the two frames still DISAGREE and a hardcoded `player: 1` cannot pass
    // both (0xbeef no longer offers both knights under screen-precise collision).
    const two = materialiseEventsAt(0xface, 2370).map((e) => e.player)
    const one = materialiseEventsAt(0xface, 259).map((e) => e.player)
    expect(two, 'precondition: both frames emit').toHaveLength(1)
    expect(one).toHaveLength(1)
    expect(two[0], 'a constant would make these equal').not.toBe(one[0])
  })

  it('the frame the suite already stages sounds SNPCR2 — today it sounds SNPCR1', async () => {
    // The headline defect, end to end, at a fixture that predates this story.
    // jt9-9 RE-BASELINE: 2063 -> 2579, riding the precondition above.
    // jt9-25 RE-BASELINE: 2579 -> 1894, riding the precondition above.
    // jt9-8 RE-BASELINE: 1894 -> 1403.
    // jt9-43 RE-BASELINE: 1403 -> 2370 — 0xface's knight-TWO re-entry under screen-
    // precise collision, so the SNPCR2 assertion is kept, not weakened, at the frame
    // where it now holds.
    const events = materialiseEventsAt(0xface, 2370)
    expect(events, 'precondition: frame 2370 still emits the moment').toHaveLength(1)
    expect(await cuesFor({ ...events[0]! })).toEqual(['player2Materialise'])
  })

  it('the dispatch routes player 1 to SNPCR1’s cue and player 2 to SNPCR2’s', async () => {
    expect(await cuesFor({ type: 'player-materialise', player: 1 })).toEqual(['playerMaterialise'])
    expect(await cuesFor({ type: 'player-materialise', player: 2 })).toEqual(['player2Materialise'])
  })

  it('the routing is the PAYLOAD’s doing — every other kind ignores it', async () => {
    // The control. Without it, a dispatch that returned 'player2Materialise'
    // for every event carrying `player: 2` would pass the test above.
    expect(await cuesFor({ type: 'enemy-death', player: 2 })).toEqual(['enemyDeath'])
    expect(await cuesFor({ type: 'player-death', player: 2 })).toEqual(['playerDeath'])
  })

  it('every cue in the manifest is reachable from some event — none is dead weight in the bake', async () => {
    // THE RE-SEAT. audio-manifest.test.ts used to assert
    // `Object.keys(SOUNDS).length === EVENT_KINDS.length`, which this story
    // breaks honestly: one kind now reaches two cues, so the manifest is 18
    // against a 17-entry tuple. A count was never the real property — a cue
    // with no kind and a kind with no cue cancel out in it perfectly. This is
    // the property that was meant, swept against the REAL dispatch: every cue
    // the bake ships must be something the game can actually play, and every
    // kind must play something.
    //
    // GREEN ON ARRIVAL, deliberately — say so rather than let it read as a
    // failed RED. Today there are 18 cues and 17 kinds and every one is
    // reachable, so it passes. It is a guard for the HALF-DONE state this
    // story can land in: the moment `player2Materialise` enters SOUNDS (and
    // the bake starts shipping its .wav) without the dispatch learning to
    // reach it, this reds. That is the failure the old count assertion could
    // NOT see, because a cue with no kind and a kind with no cue cancel in a
    // count. Non-vacuity proven by mutation, not asserted — see the TEA
    // Assessment's mutation table (M7).
    const [kinds, sounds] = await Promise.all([
      load<{ EVENT_KINDS: readonly string[] }>(import.meta.url, ['..', 'src', 'core', 'events']).then(
        (m) => m.EVENT_KINDS ?? [],
      ),
      need('SOUNDS'),
    ])
    expect(kinds.length, 'precondition: the union is not empty').toBeGreaterThan(0)

    const reached = new Set<string>()
    const silent: string[] = []
    for (const kind of kinds) {
      // Every payload a knight-bearing moment can carry. A kind that ignores
      // `player` simply yields the same cue three times, which is harmless.
      const cues = [
        ...(await cuesFor({ type: kind })),
        ...(await cuesFor({ type: kind, player: 1 })),
        ...(await cuesFor({ type: kind, player: 2 })),
      ]
      if (cues.length === 0) silent.push(kind)
      for (const c of cues) reached.add(c)
    }
    expect(silent, 'a kind that plays nothing is a silent moment').toEqual([])
    expect(
      [...reached].sort(),
      'the cues the game can play must be EXACTLY the cues the bake ships — a manifest entry ' +
        'nothing can reach is dead weight in the bucket, and a cue played but unmanifested is ' +
        'a 404 the engine degrades through silently',
    ).toEqual(Object.keys(sounds).sort())
  })

  it('a materialise with no player still sounds SOMETHING — the frame loop never dies', async () => {
    // The house answer, measured across the fleet: no game's audio dispatch
    // throws at runtime for an unmapped input (all five end in a bare
    // `const _exhaustive: never`). The TYPE is what forbids the omission; the
    // runtime keeps a malformed event from freezing the loop.
    expect(await cuesFor({ type: 'player-materialise' })).toEqual(['playerMaterialise'])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC4 — the cue ships end to end (the bake half; the live 200 is a deploy
//       artifact, see the session's Design Deviations)
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-6 AC4 — the new cue is baked, and it is a genuinely different sound', () => {
  it('the new cue has a synth spec — proven by the bake completing, not by grepping for one', async () => {
    // jt5-2 built the gate this leans on: `bakeSamples` throws
    // `no synth spec for manifest cue '<name>'` for any manifest entry without
    // a SPECS row, and `just deploy-assets` runs under `set -euo pipefail`, so
    // a manifest row added without a sound aborts the WHOLE recipe — star-wars'
    // staging included. Running the bake to completion is therefore a stronger
    // statement than any source-text match: a `player2Materialise:` grep would
    // pass on the identifier appearing in a COMMENT (bake-samples.mjs already
    // names this story twice in comments, at :27 and :142), which is exactly
    // the token-not-claim trap. SPECS is module-private, so behaviour is also
    // the only honest reach.
    //
    // GREEN ON ARRIVAL, and say so: today's eighteen cues all have specs, so
    // the bake completes. It bites the moment `player2Materialise` enters
    // SOUNDS without a SPECS row — which is the half-done state, and the one
    // that would abort `just deploy-assets` in front of a human rather than in
    // front of a test. `the manifest names a second transporter cue` (red
    // today) is what forces the manifest entry that arms this. Non-vacuity by
    // mutation, M10.
    const bakeSamples = await bakeFn()
    const dir = mkdtempSync(join(tmpdir(), 'jt5-6-spec-'))
    try {
      await expect(
        bakeSamples(dir),
        "the bake must not throw `no synth spec for manifest cue 'player2Materialise'`",
      ).resolves.toBeUndefined()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('baking writes exactly the manifest’s filenames, including the new one', async () => {
    const bakeSamples = await bakeFn()
    const sounds = await need('SOUNDS')
    const dir = mkdtempSync(join(tmpdir(), 'jt5-6-bake-'))
    try {
      await bakeSamples(dir)
      // The set-equality alone is VACUOUS for this story: both sides are read
      // from the same manifest, so they move together and it can never fail
      // here (bake-samples.test.mjs already owns it as the bake's own guard).
      // The clause that bites is the named file — it is `undefined` today.
      expect(readdirSync(dir).sort()).toEqual(Object.values(sounds).sort())
      expect(readdirSync(dir), 'the eighteenth sample must actually be written').toContain(
        sounds.player2Materialise,
      )
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('the two transporter samples are DIFFERENT audio — not the same bytes twice', async () => {
    // "Splitting them needs a player id on the event, a second manifest row AND
    // a second SAMPLE — not just a second row, which is the trap." (the story's
    // own words). A copied waveform satisfies every other test in this file.
    const bakeSamples = await bakeFn()
    const sounds = await need('SOUNDS')
    const dir = mkdtempSync(join(tmpdir(), 'jt5-6-bake-'))
    try {
      await bakeSamples(dir)
      const p1 = readFileSync(join(dir, sounds.playerMaterialise!))
      const p2 = readFileSync(join(dir, sounds.player2Materialise!))
      expect(p1.length, 'precondition: both were baked').toBeGreaterThan(44)
      expect(p2.length).toBeGreaterThan(44)
      expect(p2.equals(p1), 'player 2 must sound like its own table').toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('both transporter samples are sized by the same 450-frame window', async () => {
    // They differ in TIMBRE, not in length: the ROM gives both tables 450
    // frames. A p2 sample that came out a different length would mean the
    // derivation read SNPCR2's expressions wrong — 30 and 165 instead of the
    // shifted pair — and this is where that shows up as audio.
    const bakeSamples = await bakeFn()
    const sounds = await need('SOUNDS')
    const dir = mkdtempSync(join(tmpdir(), 'jt5-6-bake-'))
    try {
      await bakeSamples(dir)
      const p1 = readFileSync(join(dir, sounds.playerMaterialise!))
      const p2 = readFileSync(join(dir, sounds.player2Materialise!))
      expect(p2.length).toBe(p1.length)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC5 — the call site stops naming the wrong decision block
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-6 AC5 — playerMaterialise cites P1DEC, the block its comment already claims', () => {
  it('the cited call site is :5552, not G1DEC’s :5544', async () => {
    const sources = await need('CUE_SOURCES')
    const s = sources.playerMaterialise as RomCueSource
    expect(s, 'precondition: the cue still has a source').toBeTruthy()
    expect(
      s.callSite.line,
      'the shipped citation says :5544, which is G1DEC — while the comment above it asserts ' +
        "P1DEC. Byte-exact verbatim, so the citation gate is green on a misattribution.",
    ).toBe(5552)
  })

  it.skipIf(!vendoredAvailable)('the cited line really is inside the block the comment names', async () => {
    // Derived, not asserted: scan UP from the citation to the nearest label. A
    // future edit that re-points the citation to another SNPCR1 row reddens
    // here even though the verbatim would still re-open cleanly.
    const sources = await need('CUE_SOURCES')
    const lines = vendoredLines(SRC)
    const p1 = sources.playerMaterialise as RomCueSource
    expect(owningLabel(lines, p1.callSite.line)).toBe('P1DEC')
    const p2 = sources.player2Materialise as RomCueSource
    expect(p2, 'precondition: AC3 landed').toBeTruthy()
    expect(owningLabel(lines, p2.callSite.line)).toBe('P2DEC')
  })

  it('the two call sites are the MATCHING family — both P-blocks, not one of each', async () => {
    // The hazard the setup measurement called out by name: adding SNPCR2 at
    // :5556 (P2DEC) beside a SNPCR1 left at :5544 (G1DEC) reads as a matched
    // pair and is not one.
    const sources = await need('CUE_SOURCES')
    const p1 = sources.playerMaterialise as RomCueSource
    const p2 = sources.player2Materialise as RomCueSource
    expect(p2, 'precondition: AC3 landed').toBeTruthy()
    expect(
      p2.callSite.line - p1.callSite.line,
      'P1DEC:5552 and P2DEC:5556 are four lines apart; G1DEC:5544 and P2DEC:5556 are twelve',
    ).toBe(4)
  })

  it('the "both knights map here" scope comment is gone — they no longer do', async () => {
    // Deliberately broader than the exact sentence. The two files phrase the
    // same claim differently — audio.ts "both knights map here for now",
    // game.ts "both knights map onto SNPCR1 here" — so an exact-phrase
    // match would let a reword survive while the claim stayed false. The
    // alternation covers the claim, not one spelling of it.
    const stale = /both knights map|both knights onto|map onto SNPCR1/i
    const text = readFileSync(join(root, 'src', 'shell', 'audio.ts'), 'utf8')
    expect(
      text,
      'AC5: the sentence must go once it stops being true. A stale SCOPE comment is worse ' +
        'than none — it tells the next reader the split has not happened.',
    ).not.toMatch(stale)
  })

  it('the core’s emit-site comment stops saying the same thing', async () => {
    const stale = /both knights map|both knights onto|map onto SNPCR1/i
    const text = readFileSync(join(root, 'src', 'core', 'game.ts'), 'utf8')
    expect(text, 'game.ts carries its own copy of the claim').not.toMatch(stale)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC6 — the bake CLI survives a symlinked checkout
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-6 AC6 — the bake CLI is not a silent no-op behind a symlink', () => {
  it('running it through a symlinked path actually bakes', () => {
    // `process.argv[1] === fileURLToPath(import.meta.url)` compares the CALLER's
    // spelling against a realpath'd module URL. Through a symlink they differ,
    // the guard goes false, and the script exits 0 having done nothing — the
    // worst possible failure for a deploy step, because `set -euo pipefail`
    // cannot see it and the bucket keeps serving last-good while the recipe
    // reports success.
    const dir = mkdtempSync(join(tmpdir(), 'jt5-6-symlink-'))
    try {
      const linkedTools = join(dir, 'linked-tools')
      symlinkSync(join(root, 'tools', 'sample-bake'), linkedTools, 'dir')
      const out = join(dir, 'out')
      mkdirSync(out)
      const r = spawnSync(process.execPath, [join(linkedTools, 'bake-samples.mjs'), out], {
        encoding: 'utf8',
      })
      expect(r.status, `the CLI must run: ${r.stderr}`).toBe(0)
      expect(
        readdirSync(out).length,
        'exit 0 with an EMPTY output directory is the silent no-op AC6 names',
      ).toBeGreaterThan(0)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('the direct path still works — the fix must not break the normal call', () => {
    // The control. Comparing realpaths on both sides is one line; comparing
    // nothing at all would pass the test above and turn the module into a
    // script that bakes on every import.
    const dir = mkdtempSync(join(tmpdir(), 'jt5-6-direct-'))
    try {
      const r = spawnSync(
        process.execPath,
        [join(root, 'tools', 'sample-bake', 'bake-samples.mjs'), dir],
        { encoding: 'utf8' },
      )
      expect(r.status, `the CLI must run: ${r.stderr}`).toBe(0)
      expect(readdirSync(dir).length).toBeGreaterThan(0)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('importing the module does NOT bake — the guard still guards', async () => {
    // The other direction of the same fix: a guard loosened into `true` would
    // make every `import` of this module write files as a side effect, which
    // bake-samples.test.mjs's own "no default output directory" rule forbids.
    const before = readdirSync(join(root, 'tools', 'sample-bake')).sort()
    await bakeFn()
    expect(readdirSync(join(root, 'tools', 'sample-bake')).sort()).toEqual(before)
  })
})
