// tests/audio-rom-citations.test.ts
//
// Story jt5-1 — RED phase (Mr. Praline / TEA). AC5: "Each cue in the manifest
// either cites JOUSTRV4.SRC or the sound board, or is explicitly marked an
// invention pending source — no cue is silently fabricated as authentic."
//
// ─── THE SOUND BOARD'S OWN SOURCE IS NOT IN THIS TREE ────────────────────────
// AC5 offers "the sound board" as an alternative quarry. It is not available:
// `reference/williams-source/joust/JOUSTSND.DOC` is three lines long and its
// entire content is the pointer
//
//     SEE [LIBRARY.SOUND]VSNDRM4.SRC
//
// to a file no vendored revision carries. So the board's firmware — what the
// 6-bit codes actually SOUND like — cannot be cited from here, and every cue's
// citation must come from the GAME side: the sound TABLE that names the code
// and its priority, and the CALL SITE that plays it. That is a real limit on
// what a citation can claim, and it is why nothing below asserts a waveform.
//
// ─── WHAT THE GAME SIDE DOES GIVE, WHICH IS A LOT ────────────────────────────
// JOUSTRV4.SRC:8045-8131 is a complete, commented sound table — 38 entries in
// the format its own header states:
//
//     *   SOUND TABLE
//     *    PIRORITY,SOUND,LENGTH (IF M.S.BIT SET ON SOUND, SOUND,LENGTH)
//     *       SOUND !N$00 DOES NOT DISTURBE THE SOUND, BUT EXTENDS TIMER
//     *       SOUND !N$FF TURNS OFF (KILLS) THE SOUND
//     *       SOUND !N$xx (RANGE 01-3E) SENDS THE CORRESPONDING SOUND
//
// and each entry carries Williams's own description of the moment ("ENEMY
// DIES", "EGG HATCHING SOUND", "CAPTURED BY LAVA TROLL SOUND"). That comment is
// the strongest available evidence that a cue is the right cue, so it is part
// of the citation and is byte-checked, not paraphrased.
//
// ─── THE tp1-8 COLLECTION TRAP (inherited from tests/audit/citations.test.ts) ─
// `describe.skipIf` still executes the describe callback BODY at collection, so
// a file-reading const hoisted there throws on CI, where the gitignored
// reference/ tree is absent — killing the file before any test runs and
// reddening the deploy while local runs stay green. Every vendored read below
// therefore happens INSIDE an `it()`. The only module-scope filesystem call is
// `existsSync`, which cannot throw.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { load } from './helpers/dynamic-load'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// The vendored 1982 Williams source sits at the MONOREPO root, two levels above
// plugins/joust. Never committed: copyright. Same resolution as
// tests/audit/citations.test.ts, including the env override.
const vendoredRoot =
  process.env.JOUST_SOURCE_DIR ?? join(root, '..', '..', 'reference', 'williams-source', 'joust')
const vendoredAvailable = existsSync(vendoredRoot)

/** Read a line (1-based) from the vendored tree. Only ever called in an `it()`. */
function vendoredLine(file: string, n: number): string {
  const p = join(vendoredRoot, file)
  if (!existsSync(p)) throw new Error(`citation wants ${file} but it is not in the vendored tree`)
  const lines = readFileSync(p, 'latin1').split('\n')
  const line = lines[n - 1]
  if (line === undefined) throw new Error(`${file} has no line ${n} (file has ${lines.length})`)
  return line
}

// ─── the not-yet-existing module ─────────────────────────────────────────────

/** A byte-exact pointer into a vendored file — the shape the repo's citation
 *  gate already uses (`{file, line, verbatim}`), so one idea, one spelling. */
interface Citation {
  file: string
  line: number
  verbatim: string
}

/**
 * Where a cue comes from. A discriminated union so "authentic" and "invented"
 * are structurally different things a reader cannot confuse — AC5's "no cue is
 * silently fabricated as authentic" is exactly the failure a single optional
 * `rom?: string` field would allow.
 */
type CueSource =
  | {
      kind: 'rom'
      /** The Williams table label, e.g. `SNEDIE`. */
      table: string
      /** The table's priority byte — SND's arbitration key (SYSTEM.SRC:761-773). */
      priority: number
      /** Williams's own trailing comment on the table row, byte-exact. */
      romComment: string
      /** The `FCB` row that DEFINES the table. */
      source: Citation
      /** Where the game plays it. */
      callSite: Citation
    }
  | { kind: 'invention'; note: string }

async function cueSources(): Promise<Readonly<Record<string, CueSource>>> {
  const value = (
    await load<{ CUE_SOURCES: Readonly<Record<string, CueSource>> }>(import.meta.url, ['..', 'src', 'shell', 'audio'])
  ).CUE_SOURCES
  if (value === undefined) {
    throw new Error(
      'jt5-1 not implemented yet: src/shell/audio.ts must export `CUE_SOURCES` — one entry per ' +
        "SOUNDS cue, each either {kind:'rom', table, priority, romComment, source, callSite} or " +
        "{kind:'invention', note}.",
    )
  }
  return value
}

async function sounds(): Promise<Readonly<Record<string, string>>> {
  const value = (
    await load<{ SOUNDS: Readonly<Record<string, string>> }>(import.meta.url, ['..', 'src', 'shell', 'audio'])
  ).SOUNDS
  if (value === undefined) {
    throw new Error('jt5-1 not implemented yet: src/shell/audio.ts must export `SOUNDS`.')
  }
  return value
}

// ═════════════════════════════════════════════════════════════════════════════
// SCHEMA — runs everywhere, tree or no tree (the AC-3 degradation path)
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-1 AC5 — every cue declares a provenance, and the two kinds are distinguishable', () => {
  it('CUE_SOURCES covers exactly the SOUNDS manifest', async () => {
    const [manifest, sources] = await Promise.all([sounds(), cueSources()])
    expect(Object.keys(manifest).length, 'precondition: the manifest is not empty').toBeGreaterThan(0)
    expect(
      Object.keys(sources).sort(),
      'a cue with no CUE_SOURCES entry is a cue with no provenance — exactly what AC5 forbids',
    ).toEqual(Object.keys(manifest).sort())
  })

  it('every entry is either a ROM citation or an EXPLICIT invention — never neither', async () => {
    const sources = await cueSources()
    const bad = Object.entries(sources)
      .filter(([, s]) => s.kind !== 'rom' && s.kind !== 'invention')
      .map(([name, s]) => `${name}: kind=${JSON.stringify((s as { kind: unknown }).kind)}`)
    expect(bad, "every cue must declare kind 'rom' or kind 'invention'").toEqual([])
  })

  it('a ROM citation is WHOLE — a partial one is not something a reader could re-open', async () => {
    const sources = await cueSources()
    const bad: string[] = []
    for (const [name, s] of Object.entries(sources)) {
      if (s.kind !== 'rom') continue
      if (!s.table || !/^SN[A-Z0-9]+$/.test(s.table)) bad.push(`${name}: table=${s.table}`)
      if (!Number.isInteger(s.priority) || s.priority < 0 || s.priority > 255)
        bad.push(`${name}: priority=${s.priority}`)
      if (!s.romComment) bad.push(`${name}: empty romComment`)
      for (const [which, c] of [
        ['source', s.source],
        ['callSite', s.callSite],
      ] as const) {
        if (!c || !c.file || !Number.isInteger(c.line) || c.line < 1 || !c.verbatim)
          bad.push(`${name}.${which}: ${JSON.stringify(c)}`)
      }
    }
    expect(bad, 'a ROM citation needs table, priority, romComment, source and callSite').toEqual([])
  })

  it('an INVENTION says what it is, in words a later story can act on', async () => {
    const sources = await cueSources()
    const bad = Object.entries(sources)
      .filter(([, s]) => s.kind === 'invention')
      .filter(([, s]) => !(s as { note: string }).note || (s as { note: string }).note.length < 20)
      .map(([name]) => name)
    expect(bad, 'an invention must carry a note saying what is missing and why').toEqual([])
  })

  it('every cue this story ships is ROM-cited — none of the eleven is an invention', async () => {
    // Not a rule for the epic (AC5 explicitly allows inventions, and later
    // stories will need them); a fact about THIS story's set. All eleven
    // moments were chosen because a Williams table names them, so an invention
    // appearing here means the set drifted off the quarry it was scoped from.
    const sources = await cueSources()
    const invented = Object.entries(sources)
      .filter(([, s]) => s.kind === 'invention')
      .map(([name]) => name)
    expect(invented, 'jt5-1 wires only cues the machine itself has a table for').toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// BYTES — only where the vendored tree is actually present
// ═════════════════════════════════════════════════════════════════════════════

describe.skipIf(!vendoredAvailable)('jt5-1 AC5 — every citation RE-OPENS, byte for byte', () => {
  it('the vendored tree really is here (so the skips below are not silent)', () => {
    expect(existsSync(join(vendoredRoot, 'JOUSTRV4.SRC'))).toBe(true)
  })

  it('the sound-table format header is where the citations assume it is', () => {
    // The one claim every other citation leans on: that these FCB rows are
    // priority-then-(code,duration) at all. If the header moves, the decode of
    // `priority` below is unanchored and the whole file is quoting numbers it
    // cannot interpret.
    expect(vendoredLine('JOUSTRV4.SRC', 8046)).toBe(
      '*\t PIRORITY,SOUND,LENGTH (IF M.S.BIT SET ON SOUND, SOUND,LENGTH)',
    )
    expect(vendoredLine('JOUSTRV4.SRC', 8049)).toBe(
      '*\t\tSOUND !N$xx (RANGE 01-3E) SENDS THE CORRESPONDING SOUND',
    )
  })

  it('the sound board’s own source is ABSENT — JOUSTSND.DOC is a pointer, not a listing', () => {
    // Pinned so a later story cannot cite "the sound board" from this tree
    // without noticing it is not here. If a vendoring run ever lands
    // VSNDRM4.SRC, this test fails and the header above needs rewriting — which
    // is the correct signal, not a nuisance.
    const doc = readFileSync(join(vendoredRoot, 'JOUSTSND.DOC'), 'latin1')
    expect(doc).toMatch(/SEE \[LIBRARY\.SOUND\]VSNDRM4\.SRC/)
    expect(
      existsSync(join(vendoredRoot, 'VSNDRM4.SRC')),
      'if the board firmware is ever vendored, this file’s header is out of date',
    ).toBe(false)
  })

  it('each cue’s table row re-opens at its cited line', async () => {
    const sources = await cueSources()
    const drifted: string[] = []
    for (const [name, s] of Object.entries(sources)) {
      if (s.kind !== 'rom') continue
      const actual = vendoredLine(s.source.file, s.source.line)
      if (actual !== s.source.verbatim) {
        drifted.push(`${name}\n    cited: ${JSON.stringify(s.source.verbatim)}\n    actual: ${JSON.stringify(actual)}`)
      }
    }
    expect(drifted.join('\n'), 'a citation that cannot be re-opened is not evidence').toBe('')
  })

  it('each cue’s call site re-opens at its cited line', async () => {
    const sources = await cueSources()
    const drifted: string[] = []
    for (const [name, s] of Object.entries(sources)) {
      if (s.kind !== 'rom') continue
      const actual = vendoredLine(s.callSite.file, s.callSite.line)
      if (actual !== s.callSite.verbatim) {
        drifted.push(`${name}\n    cited: ${JSON.stringify(s.callSite.verbatim)}\n    actual: ${JSON.stringify(actual)}`)
      }
    }
    expect(drifted.join('\n'), 'the call site is what proves the cue plays at this moment').toBe('')
  })

  it('the quoted table row REALLY defines the named table, at the cited priority', async () => {
    // The re-open above proves the quote is honest; this proves it is the RIGHT
    // quote. A verbatim can be byte-perfect and still be the wrong line — the
    // cp4-6 lesson, where a byte-perfect quote carried a 12x-wrong reading.
    const sources = await cueSources()
    const wrong: string[] = []
    for (const [name, s] of Object.entries(sources)) {
      if (s.kind !== 'rom') continue
      const row = vendoredLine(s.source.file, s.source.line)
      if (!row.startsWith(`${s.table}\tFCB\t`)) {
        wrong.push(`${name}: line ${s.source.line} does not define ${s.table} — ${JSON.stringify(row)}`)
        continue
      }
      // `SNEDIE\tFCB\t040,!N$16!.$7F,20\tENEMY DIES` — the priority is the first
      // operand, and Williams writes it zero-padded decimal.
      const operands = row.slice(`${s.table}\tFCB\t`.length)
      const priority = Number.parseInt(operands.split(',')[0], 10)
      if (priority !== s.priority) {
        wrong.push(`${name}: cited priority ${s.priority}, table says ${priority}`)
      }
      if (!row.endsWith(s.romComment)) {
        wrong.push(`${name}: romComment ${JSON.stringify(s.romComment)} is not this row's comment`)
      }
    }
    expect(wrong.join('\n')).toBe('')
  })

  it('the call site REALLY names the table it claims to play', async () => {
    // Two shapes are legitimate, and both name the label:
    //   • a direct load  — `\tLDX\t#SNEDIE\t\tENEMY DIES`
    //   • a decision-block binding for the sounds reached through DSNxx fields
    //     (`\tFDB\tSNPLWU,…,SNPCR1`), which is what says WHICH creature gets
    //     which table (JOUSTRV4.SRC:5542-5577).
    // A call site that mentions neither is pointing at the wrong line.
    const sources = await cueSources()
    const wrong: string[] = []
    for (const [name, s] of Object.entries(sources)) {
      if (s.kind !== 'rom') continue
      if (!s.callSite.verbatim.includes(s.table)) {
        wrong.push(`${name}: call site does not mention ${s.table} — ${JSON.stringify(s.callSite.verbatim)}`)
      }
    }
    expect(wrong.join('\n')).toBe('')
  })

  it('no two cues cite the SAME table — that would be one sound wearing two names', async () => {
    const sources = await cueSources()
    const seen = new Map<string, string>()
    const clashes: string[] = []
    for (const [name, s] of Object.entries(sources)) {
      if (s.kind !== 'rom') continue
      const already = seen.get(s.table)
      if (already) clashes.push(`${s.table} cited by both ${already} and ${name}`)
      seen.set(s.table, name)
    }
    expect(clashes).toEqual([])
  })

  it('the byte-checks are DISCRIMINATING — a drifted quote is rejected', () => {
    // The control for the four re-open tests above: without it, a vendoredLine
    // that silently returned the cited string would make all of them vacuous.
    const real = vendoredLine('JOUSTRV4.SRC', 8104)
    expect(real, 'the fixture line is the one this file was written against').toBe(
      'SNEDIE\tFCB\t040,!N$16!.$7F,20\tENEMY DIES',
    )
    expect(vendoredLine('JOUSTRV4.SRC', 8105), 'a neighbouring line must differ').not.toBe(real)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// The dossier's own gate — claims/ is where an authentic cue registers
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-1 AC5 — the cues register in the machine-checked dossier', () => {
  it('a claims file for the audio seam exists', () => {
    // joust runs a live citation gate over docs/rom-study/claims/*.json and
    // refuses to report success over an empty set. A cue asserting ROM
    // authenticity belongs there, where `npx vitest run --project joust
    // citations` re-opens it, and not only in a comment.
    const claimsDir = join(root, 'docs', 'rom-study', 'claims')
    expect(existsSync(claimsDir), 'precondition: the dossier exists').toBe(true)
    expect(
      existsSync(join(claimsDir, 'audio.json')),
      'jt5-1 must add docs/rom-study/claims/audio.json so its ROM citations ride the gate',
    ).toBe(true)
  })

  it('its claims are well-formed and cite the sound tables', () => {
    const file = join(root, 'docs', 'rom-study', 'claims', 'audio.json')
    if (!existsSync(file)) throw new Error('jt5-1 must add docs/rom-study/claims/audio.json')
    const claims = JSON.parse(readFileSync(file, 'utf8')) as {
      id?: string
      claim?: string
      source?: { file?: string; line?: number; verbatim?: string }
    }[]
    expect(Array.isArray(claims), 'a claims file is a JSON array').toBe(true)
    expect(claims.length, 'an empty claims file registers nothing').toBeGreaterThan(0)
    for (const c of claims) {
      expect(c.id, `claim ${JSON.stringify(c)} needs an id`).toBeTruthy()
      expect(c.claim, `${c.id} needs a claim string`).toBeTruthy()
      expect(c.source?.file, `${c.id} needs a source file`).toBeTruthy()
      expect(c.source?.verbatim, `${c.id} needs a verbatim`).toBeTruthy()
    }
    expect(
      claims.some((c) => /JOUSTRV4\.SRC/.test(c.source?.file ?? '')),
      'the audio claims must cite the game ROM source',
    ).toBe(true)
  })
})
