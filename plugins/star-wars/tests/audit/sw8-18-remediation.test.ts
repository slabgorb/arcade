// citation-guard: ignore-file — quotes the retired citations as historical record.
// tests/audit/sw8-18-remediation.test.ts — RED for sw8-18 AC1-AC4.
//
// The nine of twelve items the comment-citation guard structurally CANNOT catch
// (see `comment-citations.test.ts` for the three it can). These are prose defects
// whose spans are correct or absent, so only a content assertion reaches them.
//
// == HOW THESE ASSERTIONS ARE WRITTEN, AND WHY IT MATTERS HERE ======================
//
// This story exists because citations rot. A suite that pins "the comment must say
// :2522-2530" rots the same way and re-creates the defect one layer up. So wherever
// a claim can be checked by RESOLVING it, it is: the span the comment cites is opened
// against the vendored ROM and its CONTENT asserted. Those tests stay true when the
// numbers legitimately move, and fail when the comment stops pointing at the routine.
//
// Line numbers appear in this file only inside `RETIRED:` markers — the historical
// record of what a comment used to say — never as a live assertion target.
//
// Every positive token was verified ABSENT from the target file at RED (`S1MVHP`,
// `MOVE THE PLAYER`, `SMVBNR`, `SMVHIS` all had count 0 in gameRules.ts), so none can
// be satisfied by the stale text it replaces. Every negative token was verified
// PRESENT (count 1), so none of the `.not` assertions is vacuous.
//
// == SACRED BOUNDARY ================================================================
// Pure text + the vendored 1983 source. No DOM, no sim, no time.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const swRoot = join(here, '..', '..')
const romDir = join(swRoot, '..', '..', 'reference', 'atari-source', 'star-wars-1983')

const read = (...p: string[]) => readFileSync(join(swRoot, ...p), 'utf8')
const rom = (f: string) => readFileSync(join(romDir, f), 'utf8').split('\n')

/** Join comment/blockquote continuations so a claim wrapped across lines is matchable.
 *  Without this, a regex written against the sentence as READ never matches the file
 *  as STORED, `.not.toMatch` passes trivially, and the stale claim survives (cp5-1). */
const flat = (s: string) => s.replace(/\n\s*(?:\/\/+|\*|>)\s?/g, ' ').replace(/\s+/g, ' ')

/** Open every `<FILE>.MAC:<span>` in `text` and return the ROM lines it covers. */
const citedSpans = (text: string, file: string): string[] => {
  const lines = rom(file)
  const out: string[] = []
  for (const m of flat(text).matchAll(new RegExp(`${file.replace('.', '\\.')}:(\\d+)(?:-(\\d+))?`, 'g'))) {
    out.push(lines.slice(Number(m[1]) - 1, Number(m[2] ?? m[1])).join('\n'))
  }
  return out
}

const gameRules = () => read('src', 'core', 'gameRules.ts')

describe('sw8-18 AC1 — the gameRules ST.UX tombstone, corrected as one edit', () => {
  it('no longer claims EVERY ST.UX writer sits under `MOVE STARS IN SOME DIRECTION`', () => {
    // FALSE as filed: that SBTTL runs WSMAIN.MAC:2243-2291, but the space-wave writer
    // is at :2522, under `.SBTTL MOVE THE PLAYER` (:2292).  RETIRED:`gameRules.ts:305-306`
    //
    // NOTE: this assertion was INERT on its first draft. It used `[^.]*` as the gap,
    // and the real sentence has `` `WSMAIN.MAC` `` between the two halves — a dotted
    // token the class cannot cross — so it passed against the very text it targets.
    // Caught by auditing the pass list rather than the fail list.
    const t = flat(gameRules())
    expect(t).not.toMatch(/Every writer sits under[\s\S]{0,60}MOVE STARS IN SOME DIRECTION/)
  })

  it('names `MOVE THE PLAYER` as the SBTTL the space-wave writer actually sits under', () => {
    // Paired with the negative above: deleting the sentence must not satisfy the AC.
    expect(gameRules()).toMatch(/MOVE THE PLAYER/)
  })

  it('no longer claims every writer is an `SMV*` routine — `S1MV` is not one', () => {
    expect(flat(gameRules())).not.toMatch(/is an\s+`?SMV\*`?\s+routine/)
  })

  it('cites a space-wave span that OPENS on the routine label', () => {
    // Resolved, not numeric: the cited span must contain SMVSP1: — the filed
    // RETIRED:`WSMAIN.MAC:2523-2531` starts one line late and misses it.
    const spans = citedSpans(gameRules(), 'WSMAIN.MAC').filter((s) => s.includes('STD ST.UX'))
    expect(spans.length).toBeGreaterThan(0)
    expect(spans.some((s) => s.includes('SMVSP1:'))).toBe(true)
  })

  it('cites a space-wave span that stops BEFORE the next routine', () => {
    // The filed span overran into S1MVHP:, a different routine.
    const spans = citedSpans(gameRules(), 'WSMAIN.MAC').filter((s) => s.includes('JSR LSLD7'))
    expect(spans.length).toBeGreaterThan(0)
    expect(spans.every((s) => !s.includes('S1MVHP:'))).toBe(true)
  })

  it('enumerates the SECOND MOVE-THE-PLAYER writer, `S1MVHP`', () => {
    // Omitted entirely from the filing's enumeration (item 3). It is a real ST.UX
    // writer: `;MOVE DURING HYPER`, JSR LSLD8, STD ST.UX.
    expect(gameRules()).toMatch(/S1MVHP/)
    expect(flat(gameRules())).toMatch(/LSLD8/)
  })

  it('cites a `.REPT 0` span that actually opens on the `.REPT` directive', () => {
    // Item 8: the filing cites RETIRED:`:2273-2290`; :2273 is the routine BODY and
    // `.REPT 0` is at :2271. Resolved rather than pinned to a number.
    const spans = citedSpans(gameRules(), 'WSMAIN.MAC').filter((s) => s.includes('.ENDR'))
    expect(spans.length).toBeGreaterThan(0)
    expect(spans.some((s) => /\.REPT\s+0/.test(s))).toBe(true)
  })

  it('does not present the assembled-out `.REPT 0` reads as live readers', () => {
    // The over-count SM measured: of the five `LDD ST.UX` sites, :2273/:2279/:2285 are
    // INSIDE the .REPT 0 block this same comment says is assembled out. Only :2245
    // (SMVBNR) and :2266 (SMVHIS) are live. Naming the dead three as live readers
    // would reintroduce the defect class inside the correction.
    const t = flat(gameRules())
    const namesDead = /2273|2279|2285/.test(t)
    if (namesDead) expect(t).toMatch(/assembled[- ]out|\.REPT|never assembled/i)
    // and the two live ones must be identified by their routines, not left anonymous
    expect(t).toMatch(/SMVBNR/)
    expect(t).toMatch(/SMVHIS/)
  })

  it('proves the ROM premises this correction rests on (oracle — green on arrival)', () => {
    const w = rom('WSMAIN.MAC')
    expect(w[2242]).toMatch(/\.SBTTL\s+MOVE STARS IN SOME DIRECTION/)
    expect(w[2291]).toMatch(/\.SBTTL\s+MOVE THE PLAYER/)
    expect(w[2521]).toMatch(/^SMVSP1:/)
    expect(w[2524]).toMatch(/^S1MV:/)
    expect(w[2530]).toMatch(/^S1MVHP:/)
    expect(w[2270]).toMatch(/\.REPT\s+0/)
    expect(w[2289]).toMatch(/\.ENDR/)
    // the two live readers, and three dead ones inside the REPT
    expect(w[2244]).toMatch(/LDD ST\.UX/)
    expect(w[2265]).toMatch(/LDD ST\.UX/)
    for (const i of [2272, 2278, 2284]) expect(w[i]).toMatch(/LDD ST\.UX/)
  })
})

describe('sw8-18 AC2 — the sole-readership condensation, all ten locations', () => {
  const SITES = [
    ['src', 'core', 'gameRules.ts'],
    ['src', 'core', 'tie-status.ts'],
    ['src', 'shell', 'render.ts'],
    ['tests', 'core', 'tie-sights-status.test.ts'],
    ['tests', 'core', 'space-eye-is-cockpit.test.ts'],
    ['tests', 'core', 'incoming-fire-reaction-window.test.ts'],
    ['tests', 'core', 'tie-fire-visibility.test.ts'],
    ['tests', 'shell', 'render.space-camera.test.ts'],
    ['docs', 'superpowers', 'specs', '2026-07-20-cabinet-feel-render-fidelity-design.md'],
  ]

  // EIGHT of these nine files carry the sole-readership claim today and start RED.
  // `src/core/tie-status.ts` is the exception: it carries the OTHER half of item 10
  // (one claim in two phrasings, "never a viewer" / "never a camera") and never says
  // "only reader", so its row is a green REGRESSION guard — the rewrite must not
  // introduce the condensation while removing the double phrasing. Its non-vacuity is
  // proven by mutation at RED, not asserted.
  it.each(SITES.map((p) => [p.join('/'), p] as const))(
    '%s no longer claims WSSTAR.MAC:98 is the only reader',
    (_label, parts) => {
      // Case-INSENSITIVE on purpose: one site writes "ONLY reader" and a
      // case-sensitive sweep reports the story complete while it survives.
      expect(flat(read(...parts))).not.toMatch(/\b(only|sole)\s+reader\b/i)
    },
  )

  it('discloses the WSMAIN read-modify-write sites that refute sole readership', () => {
    // The positive half of the pair: deleting the sentences must not satisfy AC2.
    expect(flat(gameRules())).toMatch(/2245|SMVBNR/)
  })

  it('keeps tie-status.ts to ONE phrasing of the claim, reconciled with the ROM', () => {
    // Filed item 10: :14 said "never a viewer" and a second site said "never a camera".
    // WSGLOB.MAC:465 literally reads `;VIEWER X POSITION`, so the viewer phrasing must
    // either go or carry the tombstone's own reconciliation.
    const t = flat(read('src', 'core', 'tie-status.ts'))
    const viewer = /never a viewer/i.test(t)
    if (viewer) expect(t).toMatch(/QUANTITY, not a consumer|VIEWER X POSITION/)
  })

  it('proves WSGLOB.MAC:465 says VIEWER (oracle — green on arrival)', () => {
    expect(rom('WSGLOB.MAC')[464]).toMatch(/ST\.UX::\s+\.BLKB 2\s+;VIEWER X POSITION/)
  })
})

describe('sw8-18 AC3 — the remaining prose defects', () => {
  it('deletes the stale re-export paragraph in sim.ts rather than appending to it', () => {
    // Five lines of present-tense prose introducing a re-export, sitting directly
    // above the line saying it was retired: assert and un-assert in five lines.
    const t = read('src', 'core', 'sim.ts')
    expect(t).not.toMatch(/Re-exported here so the shell's camera/)
    // the retirement note itself must survive — deleting both is not the fix
    expect(flat(t)).toMatch(/retired the `?spaceEye`? re-export/)
  })

  it('stops referring to the deleted bounded-eye-combat.test.ts in the present tense', () => {
    const t = read('tests', 'core', 'incoming-fire-reaction-window.test.ts')
    expect(t).not.toMatch(/`bounded-eye-combat\.test\.ts` \(sw8-2 AC9\) checks/)
  })

  it('stops offering "seat the pilot at spaceEye" as a live option the story ruled out', () => {
    expect(flat(read('tests', 'core', 'incoming-fire-reaction-window.test.ts')))
      .not.toMatch(/Dev may close the eye\/cockpit split from either side/)
  })

  it('stops describing the shipped design as a fenced-off failure mode', () => {
    // ":47-48 describes the re-seated control as fencing off 'parking the eye'",
    // which IS the shipped design.
    const t = flat(read('tests', 'core', 'incoming-fire-reaction-window.test.ts'))
    expect(t).not.toMatch(/fence off the two fixes[^.]*parking the eye/)
  })

  it('corrects the space-eye fixture value to the trench seat its own doc gives', () => {
    const t = read('tests', 'core', 'space-eye-is-cockpit.test.ts')
    expect(t).toMatch(/\[0,\s*768,\s*0\]/)
    // and the contradiction must be gone, not merely outnumbered
    expect(flat(t)).not.toMatch(/is `?\[0,0,0\]`? in EVERY fixture here/)
  })

  it('imports ../core/gameRules exactly once in render.ts', () => {
    const n = read('src', 'shell', 'render.ts').match(/from '\.\.\/core\/gameRules'/g) ?? []
    expect(n).toHaveLength(1)
  })

  it('stops claiming neither consumer can read sim.ts while render.ts imports it', () => {
    expect(flat(gameRules())).not.toMatch(/Neither can read\s+`?sim\.ts shipPoint`?/)
  })

  it('proves render.ts really does import sim.ts (oracle — green on arrival)', () => {
    expect(read('src', 'shell', 'render.ts')).toMatch(/from '\.\.\/core\/sim'/)
  })
})

describe('sw8-18 AC4 — item 7 and the twelfth item sw8-17 created', () => {
  const spec = () =>
    read('docs', 'superpowers', 'specs', '2026-07-20-cabinet-feel-render-fidelity-design.md')
  const camera = () => read('tests', 'shell', 'render.space-camera.test.ts')

  it('cites a spec span that actually CONTAINS the longplay observation', () => {
    // Item 7, the sharpest: the citation was correct when written and was invalidated
    // by its own commit, because sw8-8's 31-line amendment pushed the observation down.
    // Asserted by resolution — pinning RETIRED:`:45-46` would rot exactly the same way.
    const specLines = spec().split('\n')
    const cites = [...flat(camera()).matchAll(/2026-07-20-cabinet-feel-render-fidelity-design\.md:(\d+)(?:-(\d+))?/g)]
    expect(cites.length).toBeGreaterThan(0)
    const hit = cites.some((m) => {
      const span = flat(specLines.slice(Number(m[1]) - 1, Number(m[2] ?? m[1])).join('\n'))
      return /Death Star is entirely out\s*of frame/.test(span)
    })
    expect(hit).toBe(true)
  })

  it('does not land the reader on the amendment instead of the observation', () => {
    // The failure mode is specific: a reader who follows the citation reaches the
    // paragraph that REINTERPRETS the observation and never reaches the observation.
    const specLines = spec().split('\n')
    const cites = [...flat(camera()).matchAll(/design\.md:(\d+)(?:-(\d+))?/g)]
    for (const m of cites) {
      const span = flat(specLines.slice(Number(m[1]) - 1, Number(m[2] ?? m[1])).join('\n'))
      if (/AMENDED 2026-07-29/.test(span)) expect(span).toMatch(/entirely out\s*of frame/)
    }
  })

  it('stops saying the port cannot reproduce the off-axis station — sw8-17 shipped it', () => {
    expect(flat(camera())).not.toMatch(/Our port cannot reproduce it today/)
  })

  it('stops saying deathStarPlacement seats the station at x = 0 and moves it only in depth', () => {
    const t = flat(camera())
    expect(t).not.toMatch(/seats the station at x = 0 and moves it only in DEPTH/)
    expect(t).not.toMatch(/the x = 0 the station has today/)
  })

  it('stops describing sw8-17 as outstanding work, in the test and in the spec', () => {
    expect(flat(camera())).not.toMatch(/closing that gap is sw8-17, which must port/)
    expect(flat(spec())).not.toMatch(/must\s+be re-derived from its own ROM mechanism into `?deathStarPlacement`?/)
  })

  it('proves the station really does move laterally now (oracle — green on arrival)', () => {
    // The fact that makes the prose above stale: sw8-17's deathStarOffAxis.
    const r = read('src', 'shell', 'render.ts')
    expect(r).toMatch(/export function deathStarOffAxis/)
    expect(r).toMatch(/Math\.tan\(deathStarOffAxis\(t\)\)/)
  })

  it('keeps the assertion sw8-8 won — no camera-side lateral offset', () => {
    // The correction must not quietly reopen the retired ST.UX camera. This guards the
    // ruling itself while the prose around it is rewritten. GREEN on arrival by design;
    // non-vacuity proven at RED by deleting the sentence, which reddens it.
    expect(flat(camera())).toMatch(/camera contributes\s+no lateral offset/)
    // …and the EXECUTABLE assertion that actually enforces it must survive too, so a
    // rewrite cannot satisfy this row by keeping the prose and gutting the test.
    expect(camera()).toMatch(/deathStarViewX\(s\)/)
    expect(camera()).toMatch(/toBeCloseTo\(deathStarPlacement\(s\)\.pos\[0\]/)
  })
})
