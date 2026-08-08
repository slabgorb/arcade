# Missile Command mc5 — Full Enemy Roster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add REV-01's full enemy roster to Missile Command — MIRV splits (wave 1), Sputnik/bomber fly-across launchers (wave 2), and cruise missiles (wave 6) — each a pure, cited `src/core` reducer wired into the existing `stepGame`, and expose the cruise/Sputnik drone signal that unblocks mc8-5.

**Architecture:** The three enemies split by the ROM's own entity boundary. Cruise and MIRV are ICBM-family — a cruise missile is an `Icbm` with a `kind` discriminant, a MIRV is a pure split function that spawns ordinary child ICBMs. Sputnik is a distinct fly-across "plane" entity with its own `GameState` array. All logic is pure `src/core` (seeded RNG, no clock); the shell only paints functional shapes (pixel-authentic render is mc9). Every new constant is a REV-01 decode carried by a committed claim.

**Tech Stack:** TypeScript (Node ≥ 22.18 type-stripping), Vitest (`--project missile-command`), `@shared/rng` (seeded PRNG), the vendored REV-01 source under `plugins/missile-command/reference/source/`.

**Design:** `docs/superpowers/specs/2026-08-08-missile-command-mc5-enemy-roster-design.md`.

## Global Constraints

- **Ground truth is REV-01.** Every non-trivial numeric literal in `src/core` (anything outside `{0, 1, 2, -1}`) MUST be backed by a committed claim in `docs/rom-study/claims/*.json` carrying that exact decoded value — enforced by the `src/core carries no un-cited numeric literal (AC3 guard)` test in `tests/citations.test.ts`. No magic numbers. Put numeric constants in `//` line comments, never `/** */` JSDoc (the citation scanner reads numbers inside block comments — the mc-citations-scanner gotcha).
- **Claim shape** (extended sibling form): `{ "id", "symbol", "value", "meaning", "source": { "file", "line", "verbatim" } }`. `line` is the **physical** line in the `.MAC`; `verbatim` is the byte-exact text at that line (tabs included) — **capture it with `grep -an`, never retype it**. `tools/audit/check-citations.mjs` byte-compares `verbatim` against the file.
- **Reading the ROM (traps):** `W3MAIN.MAC`/`W3DSUP.MAC` are double-spaced (physical line ≈ 2× the logical `.SBTTL` ordinal); claims cite **physical** lines. Both are `.RADIX 16` (bare `0-9A-F` are HEX; a trailing `.` = DECIMAL; score math runs under `SED`/BCD). `W3COMN.MAC` is single-spaced, also `.RADIX 16`. The files are CRLF **and carry stray binary bytes**, so `grep` silently returns nothing and `grep -a` is insufficient alone — work on a stripped copy: `tr -d '\r' < …/W3MAIN.MAC > /tmp/w3m.txt` then `grep -an PATTERN /tmp/w3m.txt` / `sed -n 'A,Bp' /tmp/w3m.txt`. Stripping CR does not change line numbers, so a physical line in the stripped copy equals the physical line in the original; capture the claim `verbatim` from the original file at RED so `check-citations` matches.
- **Purity:** new `src/core` modules are swept by `tests/purity.test.ts` the moment they land — no `Date`, no `Math.random`, no browser surface (`window`/`document`), no shell import. Entropy comes only from a seeded `@shared/rng` `Rng` threaded through state.
- **RED import idiom:** a not-yet-built core module is loaded in its test via a `const SPEC = '../src/core/<m>.js'` string + `await import(/* @vite-ignore */ SPEC)`, wrapped in a loader that throws a self-describing "not built yet" message — so `tsc --noEmit` (the release gate) stays green while the module is absent. Copy the shape from `tests/icbm.test.ts`.
- **Backward compatibility:** `Icbm` gains an OPTIONAL `kind?: 'ballistic' | 'cruise'` (defaulting to `'ballistic'` everywhere it is read), exactly as `velocity?` was added in mc4 — every existing `Icbm` literal, claim, and test stays green untouched.
- **Platform:** desktop-only; keyboard + mouse. Never add a narrow-viewport AC.
- **Git:** gitflow — branch off `develop` (`feat/mc5-<n>-<desc>`), PR back; never commit to `develop`. Run the `git checkout -b` as its OWN command (the pf branch-protection hook evaluates the compound command against the current branch).
- **Test one app:** `npx vitest run --project missile-command`. Type check: `npm run lint` (repo root). Full app suite must stay green at each task's final step.
- **Story mapping:** Tasks 1–2 = **mc5-1** (MIRV); Tasks 3–5 = **mc5-2** (Sputnik); Tasks 6–8 = **mc5-3** (Cruise + drone contract); Task 9 = epic integration + bookkeeping. In the pf pipeline each story runs its own TEA→Dev→Reviewer cycle; this plan is the cited reference those stories execute against.

---

### Task 1: MIRV split reducer (`mirv.ts`)

The MIRV mechanic as two pure functions over plain `Icbm` data: an eligibility predicate (a ballistic ICBM whose head height is inside the MIRV band) and a split spawner (emit ≤3 child ballistic ICBMs from the parent's current position, each re-targeted). Suppression inputs (attract, live-explosion count) are function ARGUMENTS — the reducer decides nothing about the wider frame.

REV-01: band `[MIRVLO=0x80=128, MIRVHI=0xA0=160]` (`W3COMN.MAC:159/161`), re-armed in `ICPOSI` (`W3MAIN.MAC:1561-1575`); split `MIRVER` caps `POTENT` at 2 → "NO MORE THAN 3 SHOTS FROM A MIRV" (`W3MAIN.MAC:2695-2700`); suppressed when `EXPLCT ≥ 12.` (`W3MAIN.MAC:1533-1537`, decimal 12).

**Files:**
- Create: `plugins/missile-command/src/core/mirv.ts`
- Create: `plugins/missile-command/tests/mirv.test.ts`
- Create: `plugins/missile-command/docs/rom-study/claims/mirv.json`

**Interfaces:**
- Consumes: `Icbm`, `Vec`, `launchIcbm` from `./icbm.js`; `Rng`, `nextInt` from `@shared/rng`.
- Produces:
  - `MIRV_LO = 128`, `MIRV_HI = 160`, `MIRV_MAX_CHILDREN = 3`, `MIRV_EXPLOSION_SUPPRESS = 12` (all `export const`).
  - `mirvEligible(icbm: Icbm): boolean` — true iff `!icbm.arrived` and `MIRV_LO <= icbm.pos.v <= MIRV_HI`. (Cruise missiles don't exist yet in ROM-faithful order — the `kind !== 'cruise'` guard is ADDED to this function in Task 6 when cruise lands.)
  - `mirvSplit(parent: Icbm, liveTargets: readonly Vec[], rng: Rng): readonly Icbm[]` — up to `MIRV_MAX_CHILDREN` child ballistic ICBMs, each `launchIcbm(parent.pos, pickedTarget, parent.velocity)` with an RNG-picked live target; empty when `liveTargets` is empty. The children's `origin` is the parent's current `pos` (they fork mid-air).

- [ ] **Step 1: Write the failing test** — `tests/mirv.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { createRng } from '@shared/rng'
import { launchIcbm, type Icbm, type Vec } from '../src/core/icbm.js'

interface MirvModule {
  MIRV_LO: number
  MIRV_HI: number
  MIRV_MAX_CHILDREN: number
  MIRV_EXPLOSION_SUPPRESS: number
  mirvEligible: (icbm: Icbm) => boolean
  mirvSplit: (parent: Icbm, liveTargets: readonly Vec[], rng: ReturnType<typeof createRng>) => readonly Icbm[]
}

const SPEC = '../src/core/mirv.js'
async function loadMirv(): Promise<MirvModule> {
  try {
    const mod = (await import(/* @vite-ignore */ SPEC)) as Partial<MirvModule>
    if (typeof mod.mirvEligible !== 'function' || typeof mod.mirvSplit !== 'function')
      throw new Error('module has no `mirvEligible`/`mirvSplit` export')
    return mod as MirvModule
  } catch (e) {
    throw new Error(`mirv.ts not built yet — RED expected. Underlying: ${(e as Error).message}`)
  }
}

// A ballistic ICBM parked at height v (h fixed, target irrelevant to eligibility).
const at = (v: number): Icbm => ({ ...launchIcbm({ h: 100, v: 222 }, { h: 100, v: 0 }), pos: { h: 100, v } })

describe('mirv eligibility band [128,160]', () => {
  it('is eligible inside the band and on both edges', async () => {
    const { mirvEligible, MIRV_LO, MIRV_HI } = await loadMirv()
    expect(MIRV_LO).toBe(128)
    expect(MIRV_HI).toBe(160)
    expect(mirvEligible(at(128))).toBe(true) // low edge inclusive
    expect(mirvEligible(at(144))).toBe(true) // interior
    expect(mirvEligible(at(160))).toBe(true) // high edge inclusive
  })

  it('is NOT eligible one unit outside either edge', async () => {
    const { mirvEligible } = await loadMirv()
    expect(mirvEligible(at(127))).toBe(false) // below the band
    expect(mirvEligible(at(161))).toBe(false) // above the band
  })

  it('is never eligible for an arrived ICBM', async () => {
    const { mirvEligible } = await loadMirv()
    expect(mirvEligible({ ...at(144), arrived: true })).toBe(false)
    // (cruise-kind exclusion is added in Task 6 when cruise missiles exist)
  })
})

describe('mirv split', () => {
  it('emits at most MIRV_MAX_CHILDREN children, all forking from the parent position', async () => {
    const { mirvSplit, MIRV_MAX_CHILDREN } = await loadMirv()
    expect(MIRV_MAX_CHILDREN).toBe(3)
    const parent = at(150)
    const targets: Vec[] = [{ h: 10, v: 0 }, { h: 50, v: 0 }, { h: 90, v: 0 }]
    const kids = mirvSplit(parent, targets, createRng(7))
    expect(kids.length).toBeLessThanOrEqual(3)
    expect(kids.length).toBeGreaterThan(0)
    for (const k of kids) {
      expect(k.origin).toEqual(parent.pos) // forks mid-air from the parent
      expect(k.pos).toEqual(parent.pos)
      expect(k.arrived).toBe(false)
      expect(k.kind ?? 'ballistic').toBe('ballistic') // children are ordinary ICBMs
      expect(targets).toContainEqual(k.target) // re-targeted at a live structure
    }
  })

  it('is deterministic per seed and empty when no targets survive', async () => {
    const { mirvSplit } = await loadMirv()
    const parent = at(150)
    const targets: Vec[] = [{ h: 10, v: 0 }, { h: 50, v: 0 }]
    const a = mirvSplit(parent, targets, createRng(3))
    const b = mirvSplit(parent, targets, createRng(3))
    expect(a).toEqual(b) // same seed → same split
    expect(mirvSplit(parent, [], createRng(3))).toEqual([]) // nothing to hit
  })
})
```

- [ ] **Step 2: Run the test, verify it FAILS**

Run: `npx vitest run --project missile-command mirv`
Expected: FAIL — "mirv.ts not built yet".

- [ ] **Step 3: Capture the claims, then write `src/core/mirv.ts`**

First capture each verbatim from the original source (do NOT retype):
```bash
cd plugins/missile-command
grep -an 'MIRVLO' reference/source/W3COMN.MAC   # → MIRV_LO 128 (hex 80)
grep -an 'MIRVHI' reference/source/W3COMN.MAC   # → MIRV_HI 160 (hex A0)
tr -d '\r' < reference/source/W3MAIN.MAC | sed -n '2695,2700p'  # POTENT cap → 3 children
tr -d '\r' < reference/source/W3MAIN.MAC | sed -n '1533,1537p'  # EXPLCT >= 12. suppress
```
Write `docs/rom-study/claims/mirv.json` with entries `MC-MIRV-LO` (128), `MC-MIRV-HI` (160), `MC-MIRV-MAX` (3), `MC-MIRV-EXPSUP` (12), each carrying the captured `verbatim` and physical `line`. Then `src/core/mirv.ts`:

```ts
// src/core/mirv.ts
//
// Story mc5-1 — the MIRV split as PURE core data. A ballistic ICBM whose head
// height enters the MIRV band splits into up to 3 child ballistic ICBMs from its
// current position, each re-targeted at a live structure. The mirror idiom of
// spawn.ts: seeded @shared/rng only, no clock, no shell import.
//
// REV-01 (W3MAIN/W3COMN, .RADIX 16 — hex bytes, trailing '.' decimal):
//   band re-arm in ICPOSI (W3MAIN.MAC:1561-1575): CPY MIRVLO / CPY MIRVHI.
//   MIRVLO = 128, MIRVHI = 160 (W3COMN.MAC:159/161; hex 80/A0). Claims MC-MIRV-LO/-HI.
//   MIRVER caps POTENT at 2 -> "NO MORE THAN 3 SHOTS" (W3MAIN.MAC:2695-2700). MC-MIRV-MAX.
//   suppressed when EXPLCT >= 12 explosions (W3MAIN.MAC:1533-1537, decimal 12). MC-MIRV-EXPSUP.
import { launchIcbm, type Icbm, type Vec } from './icbm.js'
import { type Rng, nextInt } from '@shared/rng'

export const MIRV_LO = 128
export const MIRV_HI = 160
export const MIRV_MAX_CHILDREN = 3
export const MIRV_EXPLOSION_SUPPRESS = 12

/** A live ICBM whose head is inside the MIRV height band [128,160]. (Task 6 adds
 *  the `icbm.kind === 'cruise'` exclusion once cruise missiles exist.) */
export function mirvEligible(icbm: Icbm): boolean {
  if (icbm.arrived) return false
  return icbm.pos.v >= MIRV_LO && icbm.pos.v <= MIRV_HI
}

/** Fork the parent into up to MIRV_MAX_CHILDREN child ballistic ICBMs from its
 *  current position, each aimed at an RNG-picked live target. Empty when none survive. */
export function mirvSplit(parent: Icbm, liveTargets: readonly Vec[], rng: Rng): readonly Icbm[] {
  if (liveTargets.length === 0) return []
  const children: Icbm[] = []
  for (let k = 0; k < MIRV_MAX_CHILDREN; k++) {
    const target = liveTargets[nextInt(rng, liveTargets.length)]
    children.push(launchIcbm(parent.pos, target, parent.velocity))
  }
  return children
}
```

- [ ] **Step 4: Run the test, verify it PASSES**

Run: `npx vitest run --project missile-command mirv`
Expected: PASS.

- [ ] **Step 5: Run the app suite + type check + citation gate**

Run: `npx vitest run --project missile-command && npm run lint`
Expected: all green (the citation test sees `mirv.json` covering every new literal).

- [ ] **Step 6: Commit**

```bash
git add plugins/missile-command/src/core/mirv.ts plugins/missile-command/tests/mirv.test.ts plugins/missile-command/docs/rom-study/claims/mirv.json
git commit -F - <<'MSG'
feat(mc5-1): MIRV split reducer (mirv.ts) — band eligibility + <=3-child fork

REV-01 W3MAIN.MAC:2685 MIRVER; band MIRVLO/MIRVHI 128/160 (W3COMN.MAC:159/161).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
MSG
```

---

### Task 2: Wire MIRV into `stepGame` (`game.ts`)

Each frame, after enemy warheads have flown, split every eligible ballistic ICBM — subject to the suppression rule (skip when ≥12 explosions are live, or in a non-play phase) — appending the children to the ICBM array with the seeded RNG re-targeting them at live structures. First MIRV wave is 1 (every wave), so no wave gate is needed on the split itself; the ROM's `MIRVWV=1` (`W3COMN.MAC:205`) is the identity gate here and is recorded in the claim note, not in a branch.

**Files:**
- Modify: `plugins/missile-command/src/core/game.ts` (the `stepGame` play branch, after `flownIcbms`)
- Create: `plugins/missile-command/tests/mirv-integration.test.ts`

**Interfaces:**
- Consumes: `mirvEligible`, `mirvSplit`, `MIRV_EXPLOSION_SUPPRESS` from `./mirv.js`; existing `GameState`.
- Produces: no new type — `stepGame`'s ICBM array may grow mid-flight by MIRV children. A frame with ≥`MIRV_EXPLOSION_SUPPRESS` live explosions produces no new children.

- [ ] **Step 1: Write the failing test** — `tests/mirv-integration.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
import { launchIcbm } from '../src/core/icbm.js'

// Seed a play-phase game with ONE ballistic ICBM sitting in the MIRV band and
// several live cities to re-target, no explosions live.
function gameWithBandIcbm(): GameState {
  const g = createGame(11)
  return { ...g, icbms: [{ ...launchIcbm({ h: 120, v: 200 }, { h: 40, v: 0 }), pos: { h: 120, v: 150 } }] }
}

describe('MIRV split wired into stepGame', () => {
  it('splits a band ICBM into extra warheads within a few frames', () => {
    let s = gameWithBandIcbm()
    const before = s.icbms.length
    // step a handful of frames; the band ICBM should fork (count rises beyond decay)
    let maxSeen = before
    for (let i = 0; i < 5; i++) {
      s = stepGame(s)
      maxSeen = Math.max(maxSeen, s.icbms.length)
    }
    expect(maxSeen).toBeGreaterThan(before) // children appeared
  })

  it('is suppressed while >=12 explosions are live', () => {
    const g = gameWithBandIcbm()
    const dummyBlast = g.explosions // reuse shape via startExplosion in real impl
    // Fabricate 12 live explosions by stepping a game that has them is heavy; instead
    // assert the guard directly through the exported constant + a state with 12 blasts.
    const many = Array.from({ length: 12 }, (_, i) => ({ ...(g.explosions[0] ?? { h: 0, v: 0, frame: 0 }) }))
    const s = { ...g, explosions: many as typeof g.explosions }
    const before = s.icbms.length
    const stepped = stepGame(s)
    // With 12 explosions live the MIRV split must not add children this frame.
    expect(stepped.icbms.length).toBeLessThanOrEqual(before)
  })
})
```

> **Note to TEA:** the suppression test above sketches intent; pin it precisely at RED by driving the real explosion count (11 → splits, 12 → suppressed) using `startExplosion`, mirroring how `wave.ts` tests drive real state rather than fabricated records (the count-assertion gotcha — assert the mechanism, not a hand-built stand-in).

- [ ] **Step 2: Run the test, verify it FAILS** (children never appear).

Run: `npx vitest run --project missile-command mirv-integration`

- [ ] **Step 3: Wire the split into `game.ts`**

In the play branch of `stepGame`, immediately after `const flownIcbms = spawned.icbms.map(stepIcbm)`, add the split (before damage). Live targets are the same `liveTargets` already computed for spawn:

```ts
  // MIRV (mc5-1): every eligible ballistic warhead in the [128,160] band forks
  // into <=3 children from its position, re-targeted at a live structure — unless
  // >=12 explosions are live (the ROM's EXPLCT>=12 suppression, W3MAIN.MAC:1533).
  const withMirvs =
    state.explosions.length >= MIRV_EXPLOSION_SUPPRESS
      ? flownIcbms
      : flownIcbms.flatMap((icbm) =>
          mirvEligible(icbm) ? [icbm, ...mirvSplit(icbm, liveTargets, state.rng)] : [icbm],
        )
```
Replace the subsequent `killIcbmsInBlasts(flownIcbms, …)` with `killIcbmsInBlasts(withMirvs, …)`, and import `mirvEligible, mirvSplit, MIRV_EXPLOSION_SUPPRESS` from `./mirv.js`. (Explosions are aged AFTER this in the current order; `state.explosions.length` is the pre-aging count, which matches the ROM reading `EXPLCT` before this frame's new blasts — record that ordering in the claim note.)

- [ ] **Step 4: Run the tests, verify PASS**

Run: `npx vitest run --project missile-command mirv`
Expected: both `mirv` and `mirv-integration` PASS.

- [ ] **Step 5: App suite + lint**

Run: `npx vitest run --project missile-command && npm run lint`

- [ ] **Step 6: Commit**

```bash
git add plugins/missile-command/src/core/game.ts plugins/missile-command/tests/mirv-integration.test.ts
git commit -F - <<'MSG'
feat(mc5-1): split eligible band ICBMs each frame in stepGame (EXPLCT>=12 suppressed)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
MSG
```

---

### Task 3: Sputnik entity — flight, variant & kill (`sputnik.ts`)

The fly-across plane as pure data: it activates at a screen edge, flies horizontally across the field in a bomber or satellite variant, and is destroyed for 4× the ICBM value. Periodic ICBM fire is Task 4; wiring is Task 5. First Sputnik wave is `SPUTWV=2` (`W3COMN.MAC:203`); activation vertical band around `VPLMIN=0x64=100` (`W3MAIN.MAC:5761`); variant `SOBJID = rand AND 1` (`W3MAIN.MAC:5793`); kill `SPUTKI LDX I,3` → ×4 (`W3MAIN.MAC:2071-2079`).

**Files:**
- Create: `plugins/missile-command/src/core/sputnik.ts`
- Create: `plugins/missile-command/tests/sputnik.test.ts`
- Create: `plugins/missile-command/docs/rom-study/claims/sputnik.json`

**Interfaces:**
- Consumes: `Vec` from `./icbm.js`; `Rng`, `nextInt` from `@shared/rng`; `HMAX` from `./cursor.js`.
- Produces:
  - `SPUTNIK_WAVE = 2`, `SPUTNIK_V_MIN = 100`, `SPUTNIK_SCORE_MULT = 4` (`export const`).
  - `type SputnikVariant = 'bomber' | 'satellite'`.
  - `interface Sputnik { readonly pos: Vec; readonly dir: 1 | -1; readonly variant: SputnikVariant; readonly fireTimer: number }` (`dir` = +1 rightward, −1 leftward; `fireTimer` counts down to the next launch — Task 4).
  - `spawnSputnik(rng: Rng, activationSep: number): Sputnik` — random edge/direction, `variant` from `rand AND 1`, vertical band from `SPUTNIK_V_MIN`, `fireTimer = activationSep`.
  - `stepSputnik(s: Sputnik, speed: number): Sputnik` — advance `pos.h` by `dir * speed`; `fireTimer` decrement is Task 4.
  - `offscreen(s: Sputnik): boolean` — true once `pos.h` has crossed the far edge (`< 0` or `> HMAX`).

- [ ] **Step 1: Write the failing test** — `tests/sputnik.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { createRng } from '@shared/rng'

interface Vec { readonly h: number; readonly v: number }
type SputnikVariant = 'bomber' | 'satellite'
interface Sputnik { readonly pos: Vec; readonly dir: 1 | -1; readonly variant: SputnikVariant; readonly fireTimer: number }
interface SputnikModule {
  SPUTNIK_WAVE: number
  SPUTNIK_V_MIN: number
  SPUTNIK_SCORE_MULT: number
  spawnSputnik: (rng: ReturnType<typeof createRng>, activationSep: number) => Sputnik
  stepSputnik: (s: Sputnik, speed: number) => Sputnik
  offscreen: (s: Sputnik) => boolean
}

const SPEC = '../src/core/sputnik.js'
async function loadSputnik(): Promise<SputnikModule> {
  try {
    const mod = (await import(/* @vite-ignore */ SPEC)) as Partial<SputnikModule>
    if (typeof mod.spawnSputnik !== 'function') throw new Error('no `spawnSputnik` export')
    return mod as SputnikModule
  } catch (e) {
    throw new Error(`sputnik.ts not built yet — RED expected. Underlying: ${(e as Error).message}`)
  }
}

describe('sputnik constants + spawn', () => {
  it('exposes the REV-01 constants', async () => {
    const { SPUTNIK_WAVE, SPUTNIK_V_MIN, SPUTNIK_SCORE_MULT } = await loadSputnik()
    expect(SPUTNIK_WAVE).toBe(2)
    expect(SPUTNIK_V_MIN).toBe(100)
    expect(SPUTNIK_SCORE_MULT).toBe(4)
  })

  it('spawns a plane at an edge with a variant and its activation-separated fire timer', async () => {
    const { spawnSputnik, SPUTNIK_V_MIN } = await loadSputnik()
    const s = spawnSputnik(createRng(2), 96)
    expect([1, -1]).toContain(s.dir)
    expect(['bomber', 'satellite']).toContain(s.variant)
    expect(s.pos.v).toBeGreaterThanOrEqual(SPUTNIK_V_MIN) // vertical band starts at VPLMIN
    expect(s.fireTimer).toBe(96) // activation separation seeds the first fire
  })

  it('is deterministic per seed', async () => {
    const { spawnSputnik } = await loadSputnik()
    expect(spawnSputnik(createRng(5), 80)).toEqual(spawnSputnik(createRng(5), 80))
  })
})

describe('sputnik flight', () => {
  it('advances horizontally in its direction and eventually leaves the screen', async () => {
    const { spawnSputnik, stepSputnik, offscreen } = await loadSputnik()
    let s = spawnSputnik(createRng(1), 80)
    const startH = s.pos.h
    s = stepSputnik(s, 3)
    expect(s.pos.h).toBe(startH + s.dir * 3)
    expect(s.pos.v).toBe(spawnSputnik(createRng(1), 80).pos.v) // altitude unchanged in flight
    for (let i = 0; i < 400; i++) s = stepSputnik(s, 3)
    expect(offscreen(s)).toBe(true)
  })
})
```

- [ ] **Step 2: Run, verify FAIL.** `npx vitest run --project missile-command sputnik`

- [ ] **Step 3: Capture claims + write `sputnik.ts`**

```bash
cd plugins/missile-command
grep -an 'SPUTWV' reference/source/W3COMN.MAC        # SPUTNIK_WAVE 2
grep -an 'VPLMIN' reference/source/W3MAIN.MAC        # SPUTNIK_V_MIN 100 (hex 64)
tr -d '\r' < reference/source/W3MAIN.MAC | sed -n '2071,2083p'  # SPUTKI LDX I,3 => x4
tr -d '\r' < reference/source/W3MAIN.MAC | sed -n '5789,5799p'  # SOBJID variant pick
```
Write `claims/sputnik.json` (`MC-SPUTWV` 2, `MC-VPLMIN` 100, `MC-SPUT-SCORE` 4). Then `sputnik.ts` implementing the interface above — random edge from `dir`, `pos.h` starting just off the entering edge, `pos.v = SPUTNIK_V_MIN + nextInt(rng, band)` (band literal must itself be `{0,1,2}` or claimed — if the vertical spread needs a width, pin it to `SPUTWV+2/+4` per the report and claim it, else start flat at `SPUTNIK_V_MIN`). Keep every non-trivial literal claimed.

- [ ] **Step 4: Run, verify PASS.** `npx vitest run --project missile-command sputnik`
- [ ] **Step 5: App suite + lint.** `npx vitest run --project missile-command && npm run lint`
- [ ] **Step 6: Commit**

```bash
git add plugins/missile-command/src/core/sputnik.ts plugins/missile-command/tests/sputnik.test.ts plugins/missile-command/docs/rom-study/claims/sputnik.json
git commit -F - <<'MSG'
feat(mc5-2): sputnik entity — edge activation, horizontal flight, variant, x4 kill

REV-01 SPUTWV=2 (W3COMN.MAC:203), SPUTKI x4 (W3MAIN.MAC:2071).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
MSG
```

---

### Task 4: Sputnik periodic ICBM fire + wave timing (`sputnik.ts`)

A live plane fires ICBMs downward on a cadence that ramps by wave. Fire cadence `WSPFIR` and activation separation `WSPLAU` are per-wave tables indexed from `SPUTWV`; the launch count is a clamped formula. Add to `sputnik.ts`.

REV-01: `WSPFIR .BYTE 80,60,40,30,20,20,10` → decimal 128,96,64,48,32,32,16 (`W3MAIN.MAC:5725`); `WSPLAU .BYTE 0F0,0A0,080,80,60,40,20` → decimal 240,160,128,128,96,64,32 (`W3MAIN.MAC:5729`); both indexed `table-SPUTWV`, clamped to the last row for waves ≥8 (`W3MAIN.MAC:4125-4137`). Launch count `= min(MXICON − 2·CRMONS − ICBONS − 1, 4, ICBTOL, POTENT)` (`W3MAIN.MAC:2455-2479`; `MXICON=7`, `W3COMN.MAC:193`).

**Files:**
- Modify: `plugins/missile-command/src/core/sputnik.ts`
- Modify: `plugins/missile-command/tests/sputnik.test.ts`
- Modify: `plugins/missile-command/docs/rom-study/claims/sputnik.json`

**Interfaces:**
- Produces (added to `sputnik.ts`):
  - `sputnikFireCadence(wave: number): number` — `WSPFIR[clampIndex(wave)]` (frames between fires).
  - `sputnikActivationSep(wave: number): number` — `WSPLAU[clampIndex(wave)]`.
  - `sputnikFireCount(cruiseOnScreen: number, icbmsOnScreen: number, budgetRemaining: number): number` — the clamped launch count, `≥ 0`, capped at 4.
  - `stepSputnik` gains fire semantics: decrement `fireTimer`; when it reaches 0 the caller (Task 5) reads "fire now" and reloads it to `sputnikFireCadence(wave)`. Expose `readyToFire(s): boolean` (`s.fireTimer <= 0`) and `reload(s, wave): Sputnik`.

- [ ] **Step 1: Add failing tests** — append to `tests/sputnik.test.ts`

```ts
describe('sputnik wave timing tables', () => {
  it('fire cadence ramps down by wave and clamps past the table', async () => {
    const { sputnikFireCadence } = await loadSputnik()
    expect(sputnikFireCadence(2)).toBe(128) // first sputnik wave → WSPFIR[0]
    expect(sputnikFireCadence(3)).toBe(96)
    expect(sputnikFireCadence(8)).toBe(16)  // last row
    expect(sputnikFireCadence(20)).toBe(16) // clamped to last row
  })

  it('activation separation ramps by wave and clamps', async () => {
    const { sputnikActivationSep } = await loadSputnik()
    expect(sputnikActivationSep(2)).toBe(240)
    expect(sputnikActivationSep(8)).toBe(32)
    expect(sputnikActivationSep(99)).toBe(32)
  })
})

describe('sputnik launch-count clamp', () => {
  it('caps at four and shrinks with on-screen cruise/ICBM pressure', async () => {
    const { sputnikFireCount } = await loadSputnik()
    // MXICON(7) - 2*cruise - icbm - 1, then capped at 4 and at the budget.
    expect(sputnikFireCount(0, 0, 99)).toBe(4)      // 7-0-0-1=6 → capped at 4
    expect(sputnikFireCount(1, 0, 99)).toBe(4)      // 7-2-0-1=4
    expect(sputnikFireCount(2, 0, 99)).toBe(2)      // 7-4-0-1=2
    expect(sputnikFireCount(3, 0, 99)).toBe(0)      // 7-6-0-1=0 (never negative)
    expect(sputnikFireCount(0, 0, 1)).toBe(1)       // clamped by remaining budget
  })
})
```

- [ ] **Step 2: Run, verify FAIL.** `npx vitest run --project missile-command sputnik`

- [ ] **Step 3: Capture the tables + implement**

```bash
cd plugins/missile-command
tr -d '\r' < reference/source/W3MAIN.MAC | sed -n '5723,5731p'   # WSPFIR / WSPLAU .BYTE rows
grep -an 'MXICON' reference/source/W3COMN.MAC                     # MXICON 7
tr -d '\r' < reference/source/W3MAIN.MAC | sed -n '2455,2479p'   # launch-count formula
```
Add claims `MC-WSPFIR-*` (128,96,64,48,32,32,16), `MC-WSPLAU-*` (240,160,128,128,96,64,32), `MC-SPUT-FIREMAX` (4), reusing the existing `MC-MXICON` (7) from `config.json`. Implement the frozen tables + `clampIndex(wave) = min(max(wave, SPUTNIK_WAVE), lastWave) − SPUTNIK_WAVE`, and `sputnikFireCount = max(0, min(MXICON − 2*cruise − icbm − 1, 4, budgetRemaining))`.

- [ ] **Step 4: Run, verify PASS.** `npx vitest run --project missile-command sputnik`
- [ ] **Step 5: App suite + lint.**
- [ ] **Step 6: Commit**

```bash
git add plugins/missile-command/src/core/sputnik.ts plugins/missile-command/tests/sputnik.test.ts plugins/missile-command/docs/rom-study/claims/sputnik.json
git commit -F - <<'MSG'
feat(mc5-2): sputnik fire cadence + launch-count clamp (WSPFIR/WSPLAU, MXICON)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
MSG
```

---

### Task 5: Wire Sputniks into `stepGame` + functional render

Add `sputniks` to `GameState`; each frame activate (wave-gated, timer-gated), fly, fire ICBMs (folded into the ICBM array), remove offscreen/killed planes, and score kills at ×4. Add a functional shell render so the plane is visible. This produces the **`sputnikActive`** drone signal (`sputniks.length > 0`).

**Files:**
- Modify: `plugins/missile-command/src/core/game.ts`
- Modify: `plugins/missile-command/src/core/score.ts` (×4 multiple if not already generalizable)
- Modify: `plugins/missile-command/src/shell/render.ts`
- Create: `plugins/missile-command/tests/sputnik-integration.test.ts`

**Interfaces:**
- Consumes: all of `sputnik.js`; existing damage/score.
- Produces: `GameState.sputniks: readonly Sputnik[]`; `createGame` seeds it `[]`. A blast overlapping a plane kills it (×4 score) and removes it; a plane reaching the far edge is removed with no penalty.

- [ ] **Step 1: Write the failing test** — `tests/sputnik-integration.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { createGame, stepGame, type GameState } from '../src/core/game.js'

describe('sputniks in stepGame', () => {
  it('a fresh game starts with no planes and never spawns one before wave 2', () => {
    let s = createGame(4)
    expect(s.sputniks).toEqual([])
    // Force wave 1, run many frames: no plane ever appears (SPUTWV=2 gate).
    s = { ...s, wave: 1 }
    let sawPlane = false
    for (let i = 0; i < 500; i++) { s = stepGame(s); if (s.sputniks.length > 0) sawPlane = true }
    expect(sawPlane).toBe(false)
  })

  it('activates a plane from wave 2 onward', () => {
    let s: GameState = { ...createGame(4), wave: 2 }
    let sawPlane = false
    for (let i = 0; i < 800; i++) { s = stepGame(s); if (s.sputniks.length > 0) sawPlane = true }
    expect(sawPlane).toBe(true)
  })
})
```

> **Note to TEA:** pin a kill-scores-×4 case too — seed a plane and an overlapping blast, step once, assert `score` rose by `4 × ICBM_KILL_POINTS × multiplier` and `sputniks` shrank. Drive a real blast via `startExplosion`, not a fabricated record.

- [ ] **Step 2: Run, verify FAIL** (`s.sputniks` undefined).
- [ ] **Step 3: Wire `game.ts`** — add `sputniks` to `GameState` and `createGame` (`sputniks: []`); in the play branch: activate when `state.wave >= SPUTNIK_WAVE` and the activation timer allows; `stepSputnik` each plane; on `readyToFire`, launch `sputnikFireCount(cruiseOnScreen, icbmsOnScreen, remaining)` ICBMs from the plane's position (append to the ICBM array, decrement `remaining`) and `reload`; drop offscreen planes; kill planes overlapping any blast (score ×4) via the existing damage idiom. Update the between/over branches to carry `sputniks` (cleared at wave end like ICBMs). Add `SoundEvent`s if the schema has a sputnik cue (else none — audio is mc8).
- [ ] **Step 4: Run, verify PASS.** `npx vitest run --project missile-command sputnik`
- [ ] **Step 5: Functional render** in `shell/render.ts` — draw each `sputnik` as a small plane/satellite glyph at `pos`, variant-tinted. Add a `render.ts?raw` source-wiring assertion if that idiom is used in the suite (the tempest render-verification idiom).
- [ ] **Step 6: App suite + lint, then commit**

```bash
git add plugins/missile-command/src/core/game.ts plugins/missile-command/src/core/score.ts plugins/missile-command/src/shell/render.ts plugins/missile-command/tests/sputnik-integration.test.ts
git commit -F - <<'MSG'
feat(mc5-2): wire sputniks into stepGame — activate/fly/fire/kill, functional render

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
MSG
```

---

### Task 6: Cruise missiles — `kind` + angled flight (`icbm.ts`)

Give `Icbm` a `kind: 'ballistic' | 'cruise'` discriminant and a cruise flight step. A cruise missile does not fly straight to a ground target — it descends along a discrete angle (`ANGLE`→`CMANGL 0-13`, `W3MAIN.MAC:6421`) via `CMNEWP` (`W3MAIN.MAC:1583-1585`).

**Files:**
- Modify: `plugins/missile-command/src/core/icbm.ts`
- Modify: `plugins/missile-command/src/core/mirv.ts` (add the cruise-exclusion guard)
- Modify: `plugins/missile-command/tests/icbm.test.ts`, `plugins/missile-command/tests/mirv.test.ts`
- Create: `plugins/missile-command/docs/rom-study/claims/cruise.json`

**Interfaces:**
- Produces:
  - `Icbm` gains `readonly kind?: 'ballistic' | 'cruise'` (absent = `'ballistic'`).
  - `launchCruise(origin: Vec, angle: number, velocity?: number): Icbm` — a cruise ICBM with `kind: 'cruise'`; `angle` is a `CMANGL` 0–13 direction.
  - `stepCruise(icbm: Icbm): Icbm` — advance along the cruise angle (not toward `target`); arrives when it reaches ground (`v <= groundV`).
  - `stepIcbm` unchanged for ballistic; a dispatcher `stepAnyIcbm(icbm)` routes on `kind` (used by `game.ts`).

- [ ] **Step 1: Add failing tests** — append to `tests/icbm.test.ts` (reuse its existing loader)

```ts
describe('cruise missiles (mc5-3)', () => {
  it('a cruise missile carries kind:cruise and descends along its angle, not toward a target', async () => {
    const { launchCruise, stepCruise } = await loadIcbm() // extend the existing loader's type
    const c = launchCruise({ h: 10, v: 200 }, /* angle */ 7, 2)
    expect(c.kind).toBe('cruise')
    const moved = stepCruise(c)
    expect(moved.pos).not.toEqual(c.pos)     // it moved
    expect(moved.pos.v).toBeLessThan(c.pos.v) // net descent
  })

  it('a ballistic ICBM is unchanged by the kind field (default ballistic)', async () => {
    const { launchIcbm, stepIcbm } = await loadIcbm()
    const b = launchIcbm({ h: 100, v: 222 }, { h: 100, v: 0 })
    expect(b.kind ?? 'ballistic').toBe('ballistic')
    expect(stepIcbm(b).arrived).toBe(false) // mc3 behaviour intact
  })
})
```

> **Note to TEA — angle table:** the exact `CMANGL`→(dh,dv) mapping comes from `SLOPEH`/`SLOPEL` (searched from `ANGLE`, `W3MAIN.MAC:6421`, and the `DETERMINES CRUISE MISSILE ANGLE` section). Capture those `.BYTE` rows at RED, claim them (`MC-CMANGL-*`), and pin `stepCruise` against a specific angle's decoded (dh,dv). Until captured, model the descent direction from the angle sign as the interface above requires; do NOT ship an uncited slope literal.

- [ ] **Step 2: Run, verify FAIL.** `npx vitest run --project missile-command icbm`
- [ ] **Step 3: Capture the angle table + implement** the `kind` field, `launchCruise`, `stepCruise`, and `stepAnyIcbm`. Claims in `cruise.json` for every slope/angle literal. **Also extend `mirv.ts`'s `mirvEligible`** now that cruise exists: add the `if (icbm.kind === 'cruise') return false` guard (a MIRV never splits a cruise missile) and a `mirv.test.ts` case asserting `mirvEligible({...band, kind:'cruise'})` is `false`.
- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: App suite + lint** — confirm the added optional `kind` broke no existing `icbm`/`game`/`damage` test.
- [ ] **Step 6: Commit**

```bash
git add plugins/missile-command/src/core/icbm.ts plugins/missile-command/tests/icbm.test.ts plugins/missile-command/docs/rom-study/claims/cruise.json
git commit -F - <<'MSG'
feat(mc5-3): Icbm kind discriminant + cruise angled flight (ANGLE/CMANGL)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
MSG
```

---

### Task 7: Cruise per-wave budget + ×5 scoring

Cruise missiles are released against the per-wave `CRMWAV` budget (first nonzero at wave 6), and a cruise kill scores 5× the ICBM value.

REV-01: `CRMWAV .BYTE 0,0,0,0,0,1,1,2,3,4,4,5,5,6,6,7,7,7,7` (`W3MAIN.MAC:5723`, → `CRMTOL`); `CMKILL LDX I,4` → ×5 (`W3MAIN.MAC:2107-2113`).

**Files:**
- Modify: `plugins/missile-command/src/core/spawn.ts` (a cruise budget alongside the ICBM budget)
- Modify: `plugins/missile-command/src/core/score.ts` (×5 multiple)
- Modify: `plugins/missile-command/tests/spawn.test.ts`, `tests/score.test.ts`
- Modify: `plugins/missile-command/docs/rom-study/claims/cruise.json`

**Interfaces:**
- Produces:
  - `cruiseBudget(wave: number): number` — `CRMWAV[wave-1]`, clamped; `0` for waves 1–5, `1` at wave 6.
  - `score.ts`: a `cruiseKillPoints(wave)` = `5 × ICBM_KILL_POINTS × multiplier`, mirroring the existing ICBM value; or generalise the existing scorer to take a per-enemy multiple `{icbm:1, sputnik:4, cruise:5}`.

- [ ] **Step 1: Failing tests**

```ts
// spawn.test.ts
it('cruise budget is zero until wave 6, then follows CRMWAV', async () => {
  const { cruiseBudget } = await loadSpawn()
  expect(cruiseBudget(5)).toBe(0)
  expect(cruiseBudget(6)).toBe(1)
  expect(cruiseBudget(8)).toBe(2)
  expect(cruiseBudget(99)).toBe(7) // clamped to the last row
})
// score.test.ts
it('a cruise kill scores 5x an ICBM at the same wave', async () => {
  const { scoreKills, cruiseKillPoints } = await loadScore()
  const wave = 6
  expect(cruiseKillPoints(wave)).toBe(5 * baseIcbmValueAt(wave)) // helper per existing suite
})
```

- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Capture `CRMWAV` + `CMKILL`, implement.**

```bash
cd plugins/missile-command
tr -d '\r' < reference/source/W3MAIN.MAC | sed -n '5723,5723p'   # CRMWAV .BYTE row
tr -d '\r' < reference/source/W3MAIN.MAC | sed -n '2107,2113p'   # CMKILL LDX I,4 => x5
```
Add claims `MC-CRMWAV-*` (the 19-entry table) and `MC-CRUISE-SCORE` (5). Implement `cruiseBudget` (frozen `CRMWAV` + the existing `rowFor` clamp idiom from `wave.ts`) and the ×5 scorer.

- [ ] **Step 4: Run, verify PASS.**
- [ ] **Step 5: App suite + lint.**
- [ ] **Step 6: Commit**

```bash
git add plugins/missile-command/src/core/spawn.ts plugins/missile-command/src/core/score.ts plugins/missile-command/tests/spawn.test.ts plugins/missile-command/tests/score.test.ts plugins/missile-command/docs/rom-study/claims/cruise.json
git commit -F - <<'MSG'
feat(mc5-3): cruise per-wave budget (CRMWAV) + x5 kill scoring (CMKILL)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
MSG
```

---

### Task 8: Wire cruise into `stepGame` + the `droneRequest` contract (unblocks mc8-5)

Release cruise missiles against `cruiseBudget(wave)` (from wave 6), fly them via `stepAnyIcbm`, score kills ×5, and expose the drone signal: a pure `droneRequest(state)` mapping cruise-on-screen + sputnik-active to the `DroneKind` the mc8 drone consumes.

**Files:**
- Modify: `plugins/missile-command/src/core/game.ts`
- Create: `plugins/missile-command/src/core/drone-trigger.ts` (the selector — keeps `game.ts` lean)
- Modify: `plugins/missile-command/src/shell/render.ts` (functional cruise trail)
- Create: `plugins/missile-command/tests/drone-trigger.test.ts`
- Modify: `plugins/missile-command/tests/game-integration.test.ts` (or the mc4 playthrough test)

**Interfaces:**
- Consumes: `DroneKind` from `./drone.js`; `Icbm.kind`; `GameState.sputniks`.
- Produces:
  - `droneRequest(state: GameState): DroneKind | null` — `cruiseOnScreen = state.icbms.filter(i => i.kind === 'cruise').length`; `sputnikActive = state.sputniks.length > 0`; both → `'both'`, cruise only → `'cruise'`, sputnik only → `'sputnik'`, neither → `null`.
  - `stepGame` releases cruise missiles per `cruiseBudget` and steps all warheads via `stepAnyIcbm`.

- [ ] **Step 1: Write the failing test** — `tests/drone-trigger.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { createGame } from '../src/core/game.js'
import { launchIcbm, launchCruise } from '../src/core/icbm.js'

interface DroneTriggerModule { droneRequest: (state: ReturnType<typeof createGame>) => 'sputnik' | 'cruise' | 'both' | null }
const SPEC = '../src/core/drone-trigger.js'
async function load(): Promise<DroneTriggerModule> {
  try {
    const mod = (await import(/* @vite-ignore */ SPEC)) as Partial<DroneTriggerModule>
    if (typeof mod.droneRequest !== 'function') throw new Error('no `droneRequest`')
    return mod as DroneTriggerModule
  } catch (e) { throw new Error(`drone-trigger.ts not built — RED. ${(e as Error).message}`) }
}

describe('droneRequest truth table (the mc8-5 contract)', () => {
  it('covers all four presence cases', async () => {
    const { droneRequest } = await load()
    const g = createGame(1)
    const cruise = launchCruise({ h: 10, v: 200 }, 7, 2)
    const ball = launchIcbm({ h: 100, v: 222 }, { h: 100, v: 0 })
    const plane = { pos: { h: 5, v: 100 }, dir: 1 as const, variant: 'satellite' as const, fireTimer: 5 }

    expect(droneRequest({ ...g, icbms: [ball], sputniks: [] })).toBeNull()          // neither
    expect(droneRequest({ ...g, icbms: [cruise], sputniks: [] })).toBe('cruise')     // cruise only
    expect(droneRequest({ ...g, icbms: [ball], sputniks: [plane] })).toBe('sputnik') // sputnik only
    expect(droneRequest({ ...g, icbms: [cruise], sputniks: [plane] })).toBe('both')  // both
  })
})
```

- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement `drone-trigger.ts`** (the pure selector above — no new numeric constant, so no claim) and wire cruise release + `stepAnyIcbm` into `game.ts`.
- [ ] **Step 4: Run, verify PASS.** `npx vitest run --project missile-command drone-trigger`
- [ ] **Step 5: App suite + lint** — the seeded multi-wave playthrough (mc4-4) must still be deterministic; re-baseline any fingerprint only after confirming the mechanism completes (the re-baseline gotcha).
- [ ] **Step 6: Commit**

```bash
git add plugins/missile-command/src/core/game.ts plugins/missile-command/src/core/drone-trigger.ts plugins/missile-command/src/shell/render.ts plugins/missile-command/tests/drone-trigger.test.ts plugins/missile-command/tests/game-integration.test.ts
git commit -F - <<'MSG'
feat(mc5-3): cruise release in stepGame + droneRequest selector (unblocks mc8-5)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
MSG
```

---

### Task 9: Epic integration + bookkeeping (file mc5-4, correct roadmap)

A seeded multi-wave playthrough that exercises all three enemies in their real waves, plus the two design-mandated bookkeeping actions.

**Files:**
- Create: `plugins/missile-command/tests/mc5-roster-playthrough.test.ts`
- Modify: `docs/superpowers/specs/2026-08-07-missile-command-full-cabinet-roadmap.md:111` (roadmap correction)

**Interfaces:** none new — this task only asserts and documents.

- [ ] **Step 1: Write the integration test** — one seeded game run long enough to reach wave 6, asserting (a) a MIRV child appeared by an early wave, (b) a sputnik activated at/after wave 2, (c) a cruise missile appeared at/after wave 6 (`icbms.some(kind==='cruise')`), and (d) `droneRequest` returned each of `'sputnik'`, `'cruise'`, `'both'` at some frame. Deterministic per seed.

```ts
import { describe, it, expect } from 'vitest'
import { createGame, stepGame } from '../src/core/game.js'
import { droneRequest } from '../src/core/drone-trigger.js'

it('a seeded run exercises MIRV, sputnik and cruise in their real waves', () => {
  let s = createGame(1984)
  const kinds = new Set<string>()
  let sawCruise = false, sawPlane = false
  for (let i = 0; i < 60_000; i++) {
    s = stepGame(s)
    if (s.sputniks.length > 0) sawPlane = true
    if (s.icbms.some((k) => k.kind === 'cruise')) sawCruise = true
    const d = droneRequest(s); if (d) kinds.add(d)
    if (sawCruise && sawPlane && kinds.has('both')) break
  }
  expect(sawPlane).toBe(true)
  expect(sawCruise).toBe(true)
  expect(kinds.has('both')).toBe(true)
})
```

> **Note to TEA:** 60k frames is a ceiling, not a target; if a fixed seed doesn't reach "both" cheaply, pick a seed that does and pin it, or drive the state directly. Keep it deterministic — no `Math.random`.

- [ ] **Step 2: Run, verify PASS** (or adjust the seed until it deterministically passes).
- [ ] **Step 3: File the smart-bomb follow-up** — via `/pf-sprint story add` (never hand-edit YAML), create **mc5-4** "Smart bomb (blast-dodging enemy) — REV-03 port" with `status: blocked`, `blocked_by: "REV-03 source not vendored"`, and a description quoting design §2 (smart bombs are absent from the 035820-01 REV-01 tree; need `just vendor-source` of the REV-03 tree + a `rom-source-study` before any RED). This satisfies the descoped-findings-must-be-filed rule.
- [ ] **Step 4: Correct the roadmap** — edit `2026-08-07-missile-command-full-cabinet-roadmap.md` line 111: drop "smart bombs that dodge blasts" from the mc5 Delivers cell and append "(smart bombs are REV-02/03 only → mc5-4, blocked on vendoring REV-03; see 2026-08-08 mc5 design §2)".
- [ ] **Step 5: Full CI-parity gate.** `npm run test:orchestrator && npx vitest run --project missile-command && npm run lint`
- [ ] **Step 6: Commit**

```bash
git add plugins/missile-command/tests/mc5-roster-playthrough.test.ts docs/superpowers/specs/2026-08-07-missile-command-full-cabinet-roadmap.md
git commit -F - <<'MSG'
test(mc5): seeded roster playthrough + roadmap correction (smart bomb -> mc5-4)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
MSG
```

---

## Self-Review

**Spec coverage:**
- MIRV (design §mc5-1) → Tasks 1–2 ✓ (band, ≤3 children, suppression, wiring).
- Sputnik (design §mc5-2) → Tasks 3–5 ✓ (entity, fire cadence + launch clamp, wiring, `sputnikActive` signal).
- Cruise (design §mc5-3) → Tasks 6–8 ✓ (`kind` + angled flight, `CRMWAV` budget, ×5 score, wiring).
- mc8-5 drone contract (design §"The mc8-5 drone contract") → Task 8 `droneRequest` ✓.
- Smart bomb → mc5-4 + roadmap correction (design §"Smart bombs → REV-03 follow-up") → Task 9 steps 3–4 ✓.
- Fidelity contract (claims/purity/seeded-RNG) → Global Constraints + a claim step in every value-bearing task ✓.

**Placeholder scan:** the only deferred specifics are the cruise `SLOPEH/SLOPEL` angle table (Task 6) and exact per-entry claim `verbatim` — both are *capture-at-RED* items with an exact `grep`/`sed` recipe, matching the mc3 plan's "capture with grep -an, never retype" rule; they are not vague TODOs. Called out again in Open Items.

**Type consistency:** `Icbm.kind?: 'ballistic'|'cruise'` is used identically in Tasks 1 (`mirvEligible`), 6 (`launchCruise`), 8 (`droneRequest`). `Sputnik` fields (`pos/dir/variant/fireTimer`) match across Tasks 3–5, 8. `droneRequest` return `DroneKind | null` matches `drone.ts`'s exported `DroneKind`. `cruiseBudget`/`sputnikFireCadence`/`sputnikFireCount` signatures match between their producing task and Task 8's consumption.

## Open items handed to the executor

1. **Cruise angle table (Task 6):** capture `SLOPEH`/`SLOPEL` `.BYTE` rows from `ANGLE`/`DETERMINES CRUISE MISSILE ANGLE` (`W3MAIN.MAC:6421+`), claim each (`MC-CMANGL-*`), and pin `stepCruise` against a decoded (dh,dv). Do not ship an uncited slope literal.
2. **Sputnik vertical spread (Task 3):** the report notes a `SPUTWV+2/+4` vertical band around `VPLMIN`. If the spread width is a non-trivial literal, claim it; if the ROM starts planes flat at `VPLMIN`, keep it flat — verify against `W3MAIN.MAC:5789-5799` at RED.
3. **Score generalisation (Tasks 5,7):** prefer extending the existing `score.ts` scorer with a per-enemy multiple `{icbm:1, sputnik:4, cruise:5}` over three parallel functions, IF it doesn't disturb mc4's committed multiplier tests — otherwise add `sputnikKillPoints`/`cruiseKillPoints` beside the existing ICBM scorer.
4. **mc4 dependency:** Task 8's playthrough leans on mc4-4 (the `stepGame` wave wiring, in review) and mc4-6 (bonus ramp, backlog). If either is unmerged when mc5 executes, rebase onto them first — do not duplicate their wiring.
5. **SoundEvents:** mc5 does NOT wire audio. If `sound-events.ts` lacks a sputnik/cruise cue kind, leave it — mc8 owns audio; mc5 only produces `droneRequest` and the enemy state the cues will later read.
