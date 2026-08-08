// tests/attract-scheduler.test.ts
//
// Story jt10-4 — RED phase (Han Solo / TEA). The BEHAVIOUR suite for the attract
// SUB-CYCLE: a new pure core module plugins/joust/src/core/attract-scheduler.ts
// that cycles the self-play demo and the two title-named banner pages and REPEATS,
// carrying the ROM's marquee colour cadence. jt10-2 shipped the cabinet mode
// machine with an `attract` mode + a `toAttract` reset stubbed as this story's job;
// jt10-5 left main.ts's 'attract' render hook a PLACEHOLDER "not reached until
// jt10-4 wires the attract cycle". This suite drives that wiring.
//
// The module surface is stated in tests/helpers/attract-contract.ts and loaded
// lazily per-test via loadAttract (the tp1-8 collection trap): RED reddens with a
// clean "attract-scheduler module not built yet" per test until Julia ships
// src/core/attract-scheduler.ts. Each test NAMES the behaviour it pins.
//
// ─── QUARRY RESOLUTION (TEA, 2026-08-08) — pins the fidelity target ───────────
// The citation quarry the SM handed over is RESOLVED against the vendored RV4 tree:
//   • Colour cadence: ATT.SRC:173 `... CHANGE COLORS EVERY 2 1/2 SECONDS` → 2.5s →
//     150 frames @ 60Hz  (COLOUR_CYCLE_FRAMES).
//   • MARQUE dwell:   ATT.SRC:121 `#111 ... 111 * 10 = 1,110 = 18.5 SEC` → 1110
//     frames  (MARQUE_DWELL_FRAMES, provenance for the demo rhythm).
//   • Pterodactyl banner: JOUSTRV4.SRC:80 `ATX11 EQU $1B 'PTERODACTYL BEWARE'`
//     — the RV4 revision label (user ruling: RV4, not MESSEQU2's fuller
//     'BEWARE OF THE "UNBEATABLE?" PTERADACTYL').
//   • Lava-troll banner: MSW19 'HOME OF THE' (MESSEQU.SRC:156) + MSW20 'LAVA TROLL'
//     (MESSEQU.SRC:155), rendered by LAVLES (JOUSTRV4.SRC:516/519).
// Scope (user ruling): the TWO title-named banners + the self-play demo page; the
// remaining six ATMST lessions are a follow-up. See the session Delivery Findings.
//
// ─── THE tp1-8 COLLECTION TRAP ───────────────────────────────────────────────
// `describe.skipIf` still executes the describe callback BODY at collection, and
// the vendored 1982 Williams tree is gitignored (absent on CI). So every vendored
// read happens INSIDE an `it()` body; the only module-scope filesystem call is
// `existsSync`, which cannot throw. Absent vendored tree → the byte-checks SKIP and
// the suite is green (the citations.test.ts AC-3 rule).

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadAttract, type AttractState, type AttractPage } from './helpers/attract-contract.js'
import { createCabinet, toSelect } from '../src/core/cabinet.js'
import { violations } from './helpers/purity-scanner.js'

const here = dirname(fileURLToPath(import.meta.url))
const coreDir = join(here, '..', 'src', 'core')
const shellDir = join(here, '..', 'src', 'shell')
const mainPath = join(here, '..', 'src', 'main.ts')

// The vendored 1982 Williams source lives at the MONOREPO root — TWO levels above
// plugins/joust (the monorepo migration moved it). Never committed: copyright. A
// checkout without it (CI) → the byte-checks skip, green (AC-3). Same resolution as
// tests/audit/citations.test.ts.
const repoRoot = join(here, '..')
const vendoredRoot =
  process.env.JOUST_SOURCE_DIR ?? join(repoRoot, '..', '..', 'reference', 'williams-source', 'joust')
const vendoredAvailable = existsSync(vendoredRoot)

/** Read a line from the vendored tree. MUST be called only inside an `it()` body. */
function vendoredLine(file: string, n: number): string {
  const p = join(vendoredRoot, file)
  if (!existsSync(p)) throw new Error(`fixture wants ${file} but it is not in the vendored tree`)
  const line = readFileSync(p, 'utf8').split('\n')[n - 1]
  if (line === undefined) throw new Error(`fixture wants ${file}:${n} but the file is shorter`)
  return line
}

/** Read the not-yet-built scheduler source for the purity assertions (RED: absent → throws). */
function readSchedulerSource(): string {
  const p = join(coreDir, 'attract-scheduler.ts')
  if (!existsSync(p)) {
    throw new Error(
      'GREEN (Julia) must create src/core/attract-scheduler.ts — the pure attract sub-cycle (jt10-4)',
    )
  }
  return readFileSync(p, 'utf8')
}

/** Step the scheduler exactly enough frames to leave the current page, whatever its
 *  dwell — robust to Dev's chosen per-page dwell values while still forcing an advance. */
async function advancePastPage(state: AttractState): Promise<AttractState> {
  const mod = await loadAttract()
  const dwell = mod.dwellFor(state.page)
  return mod.stepAttract(state, dwell - state.framesOnPage)
}

// ─────────────────────────────────────────────────────────────────────────────

describe('jt10-4 attract-scheduler — module seam', () => {
  it('loadAttract resolves the built module with its full surface (the RED seam is closed)', async () => {
    const mod = await loadAttract()
    expect(typeof mod.createAttract).toBe('function')
    expect(typeof mod.stepAttract).toBe('function')
    expect(typeof mod.dwellFor).toBe('function')
    expect(Array.isArray(mod.PAGE_ORDER)).toBe(true)
  })
})

describe('jt10-4 attract scheduler as a pure transform (AC-1)', () => {
  it('createAttract boots on the first page in PAGE_ORDER, zeroed', async () => {
    const mod = await loadAttract()
    const s = mod.createAttract()
    expect(s.page).toBe(mod.PAGE_ORDER[0])
    expect(s.framesOnPage).toBe(0)
    expect(s.colourPhase).toBe(0)
  })

  it('stepAttract accumulates framesOnPage below the dwell (no advance yet)', async () => {
    const mod = await loadAttract()
    const s0 = mod.createAttract()
    const dwell = mod.dwellFor(s0.page)
    // one frame short of the dwell — must still be on the same page
    const s1 = mod.stepAttract(s0, dwell - 1)
    expect(s1.page).toBe(s0.page)
    expect(s1.framesOnPage).toBe(dwell - 1)
  })

  it('at the dwell boundary it advances to the NEXT page in PAGE_ORDER and resets framesOnPage', async () => {
    const mod = await loadAttract()
    const s0 = mod.createAttract()
    const s1 = await advancePastPage(s0)
    expect(s1.page).toBe(mod.PAGE_ORDER[1])
    expect(s1.framesOnPage).toBe(0)
  })

  it('WRAPS to PAGE_ORDER[0] after the last page — the attract loop never ends (AC-6)', async () => {
    const mod = await loadAttract()
    let s = mod.createAttract()
    // walk one full cycle: PAGE_ORDER.length advances land back on page 0
    for (let i = 0; i < mod.PAGE_ORDER.length; i++) s = await advancePastPage(s)
    expect(s.page).toBe(mod.PAGE_ORDER[0])
  })

  it('a full cycle VISITS every page exactly once before wrapping', async () => {
    const mod = await loadAttract()
    let s = mod.createAttract()
    const visited: AttractPage[] = [s.page]
    for (let i = 0; i < mod.PAGE_ORDER.length - 1; i++) {
      s = await advancePastPage(s)
      visited.push(s.page)
    }
    expect([...visited].sort()).toEqual([...mod.PAGE_ORDER].sort())
    expect(new Set(visited).size).toBe(mod.PAGE_ORDER.length)
  })

  it('is a PURE transform — same (state, frames) → deep-equal result, and the input is not mutated', async () => {
    const mod = await loadAttract()
    const s0 = mod.createAttract()
    const frozen = JSON.stringify(s0)
    const a = mod.stepAttract(s0, 7)
    const b = mod.stepAttract(s0, 7)
    expect(a).toEqual(b) // deterministic — no wall-clock, no ambient entropy
    expect(JSON.stringify(s0)).toBe(frozen) // argument untouched
    expect(a).not.toBe(s0)
  })

  it('colourPhase ticks exactly once per COLOUR_CYCLE_FRAMES elapsed', async () => {
    const mod = await loadAttract()
    const s0 = mod.createAttract()
    const oneCycle = mod.stepAttract(s0, mod.COLOUR_CYCLE_FRAMES)
    expect(oneCycle.colourPhase).toBe(1)
    const halfCycle = mod.stepAttract(s0, mod.COLOUR_CYCLE_FRAMES - 1)
    expect(halfCycle.colourPhase).toBe(0) // not yet a full cycle
    const threeCycles = mod.stepAttract(s0, mod.COLOUR_CYCLE_FRAMES * 3)
    expect(threeCycles.colourPhase).toBe(3)
  })
})

describe('jt10-4 banner text is transcribed verbatim from the ROM (AC-2)', () => {
  it('PAGE_ORDER contains the demo page and BOTH title-named banner pages', async () => {
    const mod = await loadAttract()
    expect(mod.PAGE_ORDER).toContain('demo')
    expect(mod.PAGE_ORDER).toContain('pteroBanner')
    expect(mod.PAGE_ORDER).toContain('lavaBanner')
  })

  it("pteroBanner text is 'PTERODACTYL BEWARE' (RV4 revision, user ruling)", async () => {
    const mod = await loadAttract()
    expect(mod.BANNERS.pteroBanner.text).toBe('PTERODACTYL BEWARE')
    expect(mod.BANNERS.pteroBanner.source.file).toBe('JOUSTRV4.SRC')
    expect(mod.BANNERS.pteroBanner.source.line).toBe(80)
  })

  it("lavaBanner text is 'HOME OF THE LAVA TROLL' (MSW19 + MSW20)", async () => {
    const mod = await loadAttract()
    expect(mod.BANNERS.lavaBanner.text).toBe('HOME OF THE LAVA TROLL')
    expect(mod.BANNERS.lavaBanner.source.file).toBe('MESSEQU.SRC')
  })

  describe.skipIf(!vendoredAvailable)('byte-checked against the vendored RV4 source', () => {
    it("JOUSTRV4.SRC:80 verbatim carries 'PTERODACTYL BEWARE' — the pteroBanner claim", () => {
      const line = vendoredLine('JOUSTRV4.SRC', 80)
      expect(line).toContain("'PTERODACTYL BEWARE'")
      expect(line).toContain('ATX11')
    })

    it("MESSEQU.SRC:156/:155 verbatim carry 'HOME OF THE' + 'LAVA TROLL' — the lavaBanner claim", () => {
      expect(vendoredLine('MESSEQU.SRC', 156)).toContain("'HOME OF THE'")
      expect(vendoredLine('MESSEQU.SRC', 155)).toContain("'LAVA TROLL'")
    })

    it('the scheduler banner text equals the ROM concatenation, not a paraphrase', async () => {
      const mod = await loadAttract()
      const home = vendoredLine('MESSEQU.SRC', 156).match(/'([^']*)'/)?.[1]
      const troll = vendoredLine('MESSEQU.SRC', 155).match(/'([^']*)'/)?.[1]
      expect(mod.BANNERS.lavaBanner.text).toBe(`${home} ${troll}`)
      const ptero = vendoredLine('JOUSTRV4.SRC', 80).match(/'([^']*)'/)?.[1]
      expect(mod.BANNERS.pteroBanner.text).toBe(ptero)
    })
  })
})

describe('jt10-4 ROM timing is cited, not invented (AC-1/AC-2)', () => {
  it('COLOUR_CYCLE_FRAMES is 150 — 2.5 s at the 60 Hz video rate', async () => {
    const mod = await loadAttract()
    expect(mod.COLOUR_CYCLE_FRAMES).toBe(150)
  })

  it('MARQUE_DWELL_FRAMES is 1110 — 18.5 s at 60 Hz', async () => {
    const mod = await loadAttract()
    expect(mod.MARQUE_DWELL_FRAMES).toBe(1110)
  })

  describe.skipIf(!vendoredAvailable)('byte-checked against the vendored ATT.SRC', () => {
    it('ATT.SRC:173 states the 2.5-second colour cadence COLOUR_CYCLE_FRAMES transcribes', () => {
      expect(vendoredLine('ATT.SRC', 173)).toContain('2 1/2 SECONDS')
    })

    it('ATT.SRC:121 states the 18.5-second MARQUE dwell MARQUE_DWELL_FRAMES transcribes', () => {
      expect(vendoredLine('ATT.SRC', 121)).toContain('18.5 SEC')
    })
  })
})

describe('jt10-4 the scheduler stays inside the jt1-7 purity boundary (AC-5)', () => {
  it('src/core/attract-scheduler.ts has ZERO purity violations', () => {
    // RED until the module lands; then the scanner sweeps it (and purity.test.ts's
    // it.each over src/core catches it forever too).
    expect(violations(readSchedulerSource())).toEqual([])
  })

  it('names no browser global even in comments, and imports nothing from ../shell', () => {
    const src = readSchedulerSource()
    expect(src).not.toMatch(/\bwindow\b|\bdocument\b/)
    expect(src).not.toMatch(/from ['"][^'"]*shell/)
  })
})

describe('jt10-4 the attract sub-cycle wires into the cabinet tier (AC-6)', () => {
  it('a cabinet booted by createCabinet is in attract mode — the scheduler drives that mode', () => {
    const cab = createCabinet(0x1234)
    expect(cab.mode).toBe('attract')
  })

  it('across a full scheduler cycle every attract page (demo + both banners) is shown, then it loops', async () => {
    const mod = await loadAttract()
    let s = mod.createAttract()
    const seen = new Set<AttractPage>([s.page])
    for (let i = 0; i < mod.PAGE_ORDER.length; i++) {
      s = await advancePastPage(s)
      seen.add(s.page)
    }
    expect(seen).toContain('demo')
    expect(seen).toContain('pteroBanner')
    expect(seen).toContain('lavaBanner')
    expect(s.page).toBe(mod.PAGE_ORDER[0]) // wrapped — the loop is endless
  })

  it('a START press leaves attract for select (the coin-up exit, cabinet.toSelect)', () => {
    const cab = createCabinet(0x1234)
    expect(cab.mode).toBe('attract')
    expect(toSelect(cab).mode).toBe('select')
  })
})

describe('jt10-4 the shell wires the scheduler under attract (AC-3/AC-4, source idiom)', () => {
  // A live canvas can't be asserted here (design-spec strategy); the source-wiring
  // idiom proves the render path is CONNECTED. RED until Julia wires main.ts's
  // 'attract' placeholder (jt10-5 left it explicitly waiting on jt10-4).
  it('the shell imports the attract-scheduler module (it drives the attract mode)', () => {
    const main = readFileSync(mainPath, 'utf8')
    const shellSrcs = existsSync(shellDir)
      ? readFileSync(join(shellDir, 'render.ts'), 'utf8')
      : ''
    const anyShellRefs = /attract-scheduler/.test(main) || /attract-scheduler/.test(shellSrcs)
    expect(anyShellRefs).toBe(true)
  })

  // AC-4 (the self-play demo actually RUNS under attract) is a runtime/canvas
  // behaviour the design spec assigns to a HUMAN smoke test; its mechanical RED
  // driver is the scheduler-import test above (the shell cannot show a demo page it
  // does not drive). A source scan for "stepDemo/pumpFrames somewhere in main.ts"
  // was DELETED here as vacuous — it went green on jt10-5's attract PLACEHOLDER,
  // proving nothing about the demo running under attract. Recorded in the session.

  it('a banner page lays its text out in FONT57 (AC-3) — a shell attract/banner layout exists', () => {
    // like gameOverScreen.ts / selectScreen.ts: a layout<Screen> using
    // layoutText('FONT57', <banner text>, colour). RED until that shell module lands.
    const candidates = ['attractScreen.ts', 'bannerScreen.ts', 'attract.ts']
    const found = candidates.some((f) => existsSync(join(shellDir, f)))
    expect(found).toBe(true)
  })
})
