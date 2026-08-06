// plugins/missile-command/tests/timebase-docs.test.ts
//
// Story mc2-3 — RED phase (Han Solo / TEA). The doc-contract + const-contract for
// open question O-2: the game-logic TICK. This is the TIME UNIT every mc3 enemy
// descent speed and missile velocity will be expressed in, so it must be pinned to
// source and to MAME's board model before the threat loop.
//
// RED today because NOTHING is built yet:
//   1. docs/rom-study/timebase.md      — the derivation note (absent)
//   2. src/shell/timebase.ts           — the exact-rate constant (absent)
//   3. docs/rom-study/brief.md         — still frames O-2 as OPEN ("until W3INT is
//                                        read in full")
// GREEN is Dev (Yoda) reading W3INT.MAC in full, deriving the tick, writing the
// note + the shell constant, and marking O-2 resolved in brief.md.
//
// ─── WHAT THIS FILE PROVES (mc2-3 ACs) ───────────────────────────────────────
//  AC1 — timebase.md derives the sim tick: it names the W3INT interrupt/VBLANK
//        path AND how the FRAME counter advances, and it CITES real W3INT/W3MAIN
//        lines plus the MAME missile.cpp anchors the story hands us.
//  AC2 — it records the EXACT rate (VSYNC 61.0076 Hz), the nominal-60 fallback,
//        the ticks/frame relationship, and the scanline-224 CPU half-speed band.
//  AC3 — the tick is encoded as an exported constant in src/shell/timebase.ts,
//        equal to the exact rate, so mc3 can import the time unit. (The shell is
//        the seam the AC names — it also keeps the rate OUT of src/core, where the
//        mc2-1 "no un-cited numeric literal" guard would demand an EQU claim for a
//        value that has none: 61.0076 Hz is a MAME/PCB hardware rate, not a
//        W3COMN assembler constant.)
//  AC4 — brief.md marks O-2 RESOLVED and drops the "open question … until W3INT is
//        read in full" framing.
//
// ─── THE FINDING THIS TEST BAKES IN (measured, not assumed) ───────────────────
// The story's premise — "how the FRAME counter increments" in W3INT — is a trap:
// FRAME is NOT in W3INT at all. It is a W3MAIN construct:
//   • defined   at W3MAIN.MAC:239   `FRAME:  .BLKB 1  ;FRAME COUNTER (1-60)`
//   • advanced  at W3MAIN.MAC:781   `INC FRAME`  (once per game-logic frame)
// W3INT owns the INTERRUPT/VBLANK timebase (`IRQ:` at :175, `.SBTTL HANDLE VBLANK`
// at :269) that the mainline syncs to. The brief's "W3DSUP.MAC:19 / W3MAIN:2039"
// are LOGICAL (non-blank) ordinals — the codebase's recurring double-space trap;
// the physical FRAME lines are 239 / 781. The byte-gated block below forces the
// doc to cite the PHYSICAL increment + definition, so a note that copies brief.md's
// logical numbers (which land in the double-space GAPS) reddens.
//
// ─── SOURCE HAZARD (mc1/mc2-1 measured) ──────────────────────────────────────
// The vendored `.MAC` carry stray non-UTF8/CR bytes: a plain `grep` false-empties
// (use `grep -a`); readFileSync(.., 'utf8') reads them fine. The tree is gitignored,
// so every byte-gated block SKIPS on CI (the jt1-3 degradation pattern) and the
// always-on file-contract tests carry the RED signal there.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const romStudy = join(root, 'docs', 'rom-study')
const timebasePath = join(romStudy, 'timebase.md')
const briefPath = join(romStudy, 'brief.md')
const subsystemsPath = join(romStudy, 'subsystems.md')
const glossaryPath = join(romStudy, 'glossary.md')

const sourceDir = join(root, 'reference', 'source')
const W3INT = join(sourceDir, 'W3INT.MAC')
const W3MAIN = join(sourceDir, 'W3MAIN.MAC')
const sourceAvailable = existsSync(W3INT) && existsSync(W3MAIN)

/** The authoritative exact tick — MAME VSYNC (missile.cpp), given by the story. */
const TICK_HZ_EXACT = 61.0076

/** Read a rom-study doc, or throw a message that names the file Dev must create. */
const readDoc = (path: string, label: string): string => {
  if (!existsSync(path)) {
    throw new Error(`docs/rom-study/${label} does not exist yet — mc2-3 GREEN (Yoda) writes it`)
  }
  return readFileSync(path, 'utf8')
}

// ── the shell timebase module, dynamic-imported so `tsc --noEmit` / collection
// stay green while a fresh checkout has not built it (the citations.test.ts idiom).
// A pure constants module (no DOM at load) imports fine under the mc `node` env. ──
const TIMEBASE_SPECIFIER = '../src/shell/timebase.js'
async function loadTimebase(): Promise<Record<string, unknown>> {
  try {
    return (await import(/* @vite-ignore */ TIMEBASE_SPECIFIER)) as Record<string, unknown>
  } catch (e) {
    throw new Error(
      'src/shell/timebase.ts not built yet — mc2-3 GREEN (Yoda) exports the derived ' +
        `tick (a numeric constant ≈ ${TICK_HZ_EXACT} Hz) so mc3 can import the time unit. ` +
        `(${(e as Error).message})`,
    )
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC1 — the note exists and DERIVES the tick: the W3INT interrupt/VBLANK path and
//   the FRAME-counter advance. Anchored to the vocabulary the derivation must use,
//   not to loose prose, so a note that hand-waves the mechanism reddens.
// ─────────────────────────────────────────────────────────────────────────────
describe('timebase.md derives the sim tick (AC1)', () => {
  it('the file exists', () => {
    expect(existsSync(timebasePath), 'Dev writes docs/rom-study/timebase.md').toBe(true)
  })

  it('names the W3INT interrupt handler and the VBLANK path', () => {
    const doc = readDoc(timebasePath, 'timebase.md')
    expect(/W3INT/.test(doc), 'must name the W3INT interrupt module').toBe(true)
    expect(/\bIRQ\b|interrupt/i.test(doc), 'must describe the IRQ/interrupt handler').toBe(true)
    expect(/VBLANK/i.test(doc), 'must describe the VBLANK path (the frame boundary)').toBe(true)
  })

  it('explains how the FRAME counter advances (the O-2 crux)', () => {
    const doc = readDoc(timebasePath, 'timebase.md')
    expect(/\bFRAME\b/.test(doc), 'must name the FRAME counter').toBe(true)
    // FRAME lives in W3MAIN, not W3INT — the note must cite the mainline, not
    // just the interrupt module, or it has not resolved O-2's actual mechanism.
    expect(/W3MAIN/.test(doc), 'the FRAME counter is a W3MAIN construct — cite it').toBe(true)
  })

  it('records the 4-IRQ-per-frame board model (V = 0, 64, 128, 192)', () => {
    const doc = readDoc(timebasePath, 'timebase.md')
    // The three distinctive V positions the story hands us; together they pin the
    // "4 IRQs/frame" structure a bare "IRQ" mention would not.
    for (const v of ['64', '128', '192']) {
      expect(doc.includes(v), `must record the IRQ scanline position V=${v}`).toBe(true)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC1 — the note CITES the MAME missile.cpp anchors the story names as the
//   authoritative board model. Bare line numbers are not enough on their own, so
//   the filename is required alongside them.
// ─────────────────────────────────────────────────────────────────────────────
describe('timebase.md cites the MAME missile.cpp board model (AC1)', () => {
  it('names missile.cpp and the three anchor ranges (IRQ / VBLANK / half-speed)', () => {
    const doc = readDoc(timebasePath, 'timebase.md')
    expect(/missile\.cpp/.test(doc), 'must cite the MAME driver missile.cpp').toBe(true)
    expect(doc.includes('485'), 'IRQ frame structure: missile.cpp:485-497').toBe(true)
    expect(doc.includes('528'), 'VBLANK window: missile.cpp:528-532').toBe(true)
    expect(doc.includes('542'), 'CPU half-speed band: missile.cpp:542-555').toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC2 — the note records the EXACT rate, the nominal-60 fallback, the ticks/frame
//   relationship, and the scanline-224 half-speed band. The exact figure is the
//   trap: a note that recorded only "60" would have dropped the 61.0076 Hz the
//   PCB actually runs at.
// ─────────────────────────────────────────────────────────────────────────────
describe('timebase.md records the exact rate and its fallback (AC2)', () => {
  it('records the exact VSYNC rate 61.0076 Hz', () => {
    const doc = readDoc(timebasePath, 'timebase.md')
    expect(doc.includes('61.0076'), 'the exact VSYNC rate (missile.cpp) — not just nominal 60').toBe(true)
  })

  it('records the nominal-60 fallback explicitly', () => {
    const doc = readDoc(timebasePath, 'timebase.md')
    expect(/nominal/i.test(doc) && /\b60\b/.test(doc), 'must record the nominal-60 fallback').toBe(true)
  })

  it('states the ticks-per-frame relationship (one sim tick per video frame)', () => {
    const doc = readDoc(timebasePath, 'timebase.md')
    expect(/tick/i.test(doc), 'must speak in ticks').toBe(true)
    expect(/per\s+(video\s+)?frame/i.test(doc), 'must state the ticks-per-frame relationship').toBe(true)
  })

  it('notes the scanline-224 CPU half-speed band', () => {
    const doc = readDoc(timebasePath, 'timebase.md')
    expect(doc.includes('224'), 'must note the scanline-224 half-speed threshold').toBe(true)
    expect(/half[- ]?speed|half the/i.test(doc), 'and describe it as the CPU half-speed band').toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC1 — every W3INT/W3MAIN anchor the note cites is REAL, at the PHYSICAL line,
//   and the load-bearing FRAME lines are correctly located. Byte-gated: re-reads
//   the vendored source. This is the guard with teeth — prose alone cannot satisfy
//   it, and it catches the exact logical-ordinal trap the brief fell into.
// ─────────────────────────────────────────────────────────────────────────────
const ANCHOR_RE = /\b(W3INT|W3MAIN)(?:\.MAC)?:(\d+)/gi

describe.skipIf(!sourceAvailable)('timebase.md source anchors cross-check against the vendored source (AC1)', () => {
  const anchors = (): Array<{ module: string; line: number; raw: string }> => {
    const doc = readDoc(timebasePath, 'timebase.md')
    return [...doc.matchAll(ANCHOR_RE)].map((m) => ({
      module: m[1].toUpperCase(),
      line: Number(m[2]),
      raw: m[0],
    }))
  }

  // Named `physLineOf` (module → physical line) to NOT collide with the
  // differently-typed `lineAt(file, n)` in citations-source.test.ts, which takes a
  // full path — a same-name/different-arg trap (lang-review #18, round-1 F3).
  const physLineOf = (module: string, line: number): string =>
    readFileSync(join(sourceDir, `${module}.MAC`), 'utf8').split('\n')[line - 1] ?? ''

  const citedLines = (module: string): string[] =>
    anchors().filter((a) => a.module === module).map((a) => physLineOf(module, a.line))

  it('cites at least one W3INT anchor and at least one W3MAIN anchor', () => {
    // The floor comes first (check #15): a note that cited zero source lines could
    // pass every prose test above on vocabulary alone — this stops that.
    const byModule = (m: string) => anchors().filter((a) => a.module === m).length
    expect(byModule('W3INT'), 'must cite W3INT — the interrupt/VBLANK timebase O-2 asks about').toBeGreaterThanOrEqual(1)
    expect(byModule('W3MAIN'), 'must cite W3MAIN — where FRAME is defined and advanced').toBeGreaterThanOrEqual(1)
  })

  it('every cited anchor lands on a NON-BLANK source line (not a double-space logical ordinal)', () => {
    const blank = anchors().filter((a) => physLineOf(a.module, a.line).trim() === '')
    expect(
      blank,
      `these anchors land on BLANK lines — W3MAIN is double-spaced, so brief.md's ` +
        `logical ordinals (W3MAIN:2039, W3DSUP:19) fall in the gaps. Cite the PHYSICAL line: ${blank
          .map((a) => a.raw)
          .join(', ')}`,
    ).toEqual([])
  })

  it('cites the physical INC FRAME line (how the counter advances — W3MAIN:781)', () => {
    expect(
      citedLines('W3MAIN').some((l) => /INC\s+FRAME/.test(l)),
      'a cited W3MAIN line must be the physical `INC FRAME` — the per-frame advance O-2 asks for',
    ).toBe(true)
  })

  it('cites the physical FRAME COUNTER definition line (W3MAIN:239, the 1-60 counter)', () => {
    expect(
      citedLines('W3MAIN').some((l) => /FRAME COUNTER/.test(l)),
      'a cited W3MAIN line must be the physical `FRAME: .BLKB 1 ;FRAME COUNTER (1-60)` definition',
    ).toBe(true)
  })

  it('cites a real W3INT interrupt/VBLANK line (the timebase itself)', () => {
    expect(
      citedLines('W3INT').some((l) => /\bIRQ\b|VBLANK|SYNC/i.test(l)),
      'a cited W3INT line must land on the IRQ handler / VBLANK / SYNC path',
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC3 — the tick is encoded as an exported constant equal to the exact rate. The
//   value is READ OUT OF THE MODULE (a real runtime check, not a text token), so a
//   const that drifts from 61.0076 fails. The shell is the seam the AC names.
// ─────────────────────────────────────────────────────────────────────────────
describe('src/shell/timebase.ts encodes the exact tick as a constant (AC3)', () => {
  it('the module file exists', () => {
    expect(existsSync(join(root, 'src', 'shell', 'timebase.ts')), 'Dev writes src/shell/timebase.ts').toBe(true)
  })

  it('exports a numeric constant equal to the exact VSYNC rate (≈ 61.0076 Hz)', async () => {
    const mod = await loadTimebase()
    const numbers = Object.values(mod).filter((v): v is number => typeof v === 'number')
    const match = numbers.find((n) => Math.abs(n - TICK_HZ_EXACT) < 5e-4)
    expect(
      match,
      `no exported number is ≈ ${TICK_HZ_EXACT} Hz — export the derived tick (e.g. ` +
        `\`export const TICK_HZ = ${TICK_HZ_EXACT}\`) so mc3 velocities can be expressed in it. ` +
        `Exported numbers: [${numbers.join(', ')}]`,
    ).toBeDefined()
    // Pin the value (check #24: assert the number, never a loose band).
    expect(match as number).toBeCloseTo(TICK_HZ_EXACT, 3)
  })

  it('records the nominal-60 fallback in the module (so the implicit 60 is now explicit)', () => {
    const src = readFileSync(join(root, 'src', 'shell', 'timebase.ts'), 'utf8')
    expect(/nominal/i.test(src) && /\b60\b/.test(src), 'the module must document the nominal-60 fallback').toBe(true)
  })

  it('carries a source citation for the rate (missile.cpp / brief), not a bare magic number', () => {
    const src = readFileSync(join(root, 'src', 'shell', 'timebase.ts'), 'utf8')
    expect(
      /missile\.cpp|timebase\.md|W3INT/.test(src),
      'the constant must cite where the rate comes from — a bare 61.0076 is un-sourced',
    ).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC4 — brief.md marks O-2 RESOLVED and retires the open-question framing. A
//   positive marker (resolved) plus a targeted retirement of the exact stale
//   clause (check #24: grep the OLD framing, not just add the new).
// ─────────────────────────────────────────────────────────────────────────────
// A negation the guard must NOT read as "resolved" — the exact defeat the round-1
// vacuous guard let through (`/\bO-2\b.*\bresolv/i` matched "O-2 not resolved"). Kept
// narrow so it does not fire on the "## Open questions" section heading or on a mere
// "resolved": it targets the phrases that assert O-2 is STILL open.
const STILL_OPEN = /\b(unresolved|not\s+(?:fully\s+|yet\s+)?resolved|not\s+yet\s+read|to\s+be\s+read)\b/i
/** Lines that mention O-2 (each must be in a resolved framing, none may say it is open). */
const o2LinesOf = (doc: string): string[] => doc.split('\n').filter((l) => /\bO-2\b/.test(l))

describe('brief.md marks O-2 resolved (AC4)', () => {
  it('the brief still references O-2', () => {
    expect(o2LinesOf(readDoc(briefPath, 'brief.md')).length, 'brief.md must still reference O-2').toBeGreaterThan(0)
  })

  it('positively marks O-2 resolved — and a NEGATED "not resolved" does NOT satisfy the guard', () => {
    const lines = o2LinesOf(readDoc(briefPath, 'brief.md'))
    // Teeth (round-1 defect): the marker must be a resolved statement that is NOT negated.
    // "O-2 not resolved" / "unresolved" carry `resolved` as a substring but assert the
    // opposite, so they are excluded here (STILL_OPEN) — reddening the round-1 mutation.
    expect(
      lines.some((l) => /\bresolved\b/i.test(l) && !STILL_OPEN.test(l)),
      'an O-2 mention must positively state it is resolved (a "not resolved" line does not count)',
    ).toBe(true)
  })

  it('no O-2 mention still frames it as OPEN / unresolved / not-yet-read', () => {
    const openish = o2LinesOf(readDoc(briefPath, 'brief.md')).filter((l) => STILL_OPEN.test(l))
    expect(openish, 'every O-2 mention must be updated to the resolved framing').toEqual([])
  })

  // NB: a "brief.md includes 61.0076" test would be vacuous here — the brief's §3
  // ALREADY carries that figure as part of the OPEN-question discussion, so it
  // passes whether or not O-2 is resolved (lang-review #15/#26: a guard that
  // cannot fail for the defect it names). The two tests here carry the real
  // signal — the resolved marker and the retirement of the open-question clause.

  it('drops the stale "open question … until W3INT is read in full" framing', () => {
    const doc = readDoc(briefPath, 'brief.md')
    expect(
      /until\s+W3INT\s+is\s+read\s+in\s+full/i.test(doc),
      'the O-2-is-open clause must be retired now that W3INT has been read',
    ).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC4 coherence (round-1 review, lang-review #24) — a retirement applied only in
//   brief.md leaves the SIBLING source-of-record docs describing O-2 as open. After
//   O-2 is resolved, subsystems.md and glossary.md must not still frame it as unread
//   / unresolved, and glossary.md must drop the stale logical-ordinal FRAME citations
//   (W3DSUP.MAC:19 / W3MAIN.MAC:2039) this story proved wrong. These read committed
//   docs, so they run on CI too. (O-4 may stay open — scoped to O-2 lines only.)
// ─────────────────────────────────────────────────────────────────────────────
describe('the O-2 resolution is coherent across the rom-study source-of-record (review #24)', () => {
  it('subsystems.md no longer frames W3INT / O-2 as "not yet read"', () => {
    const openish = o2LinesOf(readDoc(subsystemsPath, 'subsystems.md')).filter((l) => STILL_OPEN.test(l))
    expect(openish, 'subsystems.md still calls O-2 open / W3INT unread — O-2 is resolved now').toEqual([])
  })

  it('subsystems.md points at the resolved derivation (timebase.md) or marks O-2 resolved', () => {
    const sub = readDoc(subsystemsPath, 'subsystems.md')
    expect(
      /timebase\.md/.test(sub) || o2LinesOf(sub).some((l) => /\bresolved\b/i.test(l) && !STILL_OPEN.test(l)),
      'subsystems.md must reference timebase.md or positively mark O-2 resolved',
    ).toBe(true)
  })

  it('glossary.md drops the stale logical-ordinal FRAME citations (W3DSUP:19 / W3MAIN:2039)', () => {
    const gloss = readDoc(glossaryPath, 'glossary.md')
    expect(/W3DSUP\.MAC:19\b/.test(gloss), 'glossary must drop the stale W3DSUP.MAC:19 FRAME citation').toBe(false)
    expect(/W3MAIN\.MAC:2039\b/.test(gloss), 'glossary must drop the stale W3MAIN.MAC:2039 FRAME citation').toBe(false)
  })

  it('glossary.md cites the correct physical FRAME lines (W3MAIN.MAC:239 def / :781 increment)', () => {
    expect(
      /W3MAIN\.MAC:(239|781)\b/.test(readDoc(glossaryPath, 'glossary.md')),
      'the glossary FRAME entry must cite the physical W3MAIN.MAC:239 / :781',
    ).toBe(true)
  })

  it('glossary.md no longer calls the O-2 sim tick unresolved', () => {
    const openish = o2LinesOf(readDoc(glossaryPath, 'glossary.md')).filter((l) => STILL_OPEN.test(l))
    expect(openish, 'the FRAME/O-2 glossary entry must be updated to resolved (O-4 may remain open)').toEqual([])
  })
})
