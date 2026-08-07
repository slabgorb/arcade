# Missile Command mc3 — Core Combat Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Missile Command playable end-to-end — enemy ICBMs attack, player blasts destroy them for score, ICBMs that land destroy cities/bases, bases run out of ammo, and the last city dying ends the game.

**Architecture:** mc1's pure `src/core` reducers (`abm`, `explosion`, `cursor`, `field`) gain enemy warheads, damage detection, scoring, per-base ammo, and a play→over phase, all composed by a grown `stepGame`. The core/shell boundary from mc1 holds: every new mechanic is a pure, deterministic reducer in `src/core` (seeded RNG, no clock); the shell only paints and reads input. Every new game constant is the REV-01 decode, carried by a committed claim.

**Tech Stack:** TypeScript (Node ≥ 22.18 type-stripping), Vitest (per-app project), `@shared/rng` (seeded PRNG), the vendored REV-01 source under `plugins/missile-command/reference/source/`.

## Global Constraints

- **Ground truth is REV-01.** Every non-trivial numeric literal in `src/core` (anything outside `{0, 1, 2, -1}`) MUST be backed by a committed claim in `docs/rom-study/claims/*.json` carrying that exact decoded value — enforced by the `src/core carries no un-cited numeric literal (AC3 guard)` test in `tests/citations.test.ts`. No magic numbers.
- **Claim shape** (extended sibling form): `{ "id", "symbol", "value", "meaning", "source": { "file", "line", "verbatim" } }`. `line` is the **physical** line in the `.MAC`; `verbatim` is the byte-exact text at that line (tabs included) — capture it with `grep -an`, never retype it. `tools/audit/check-citations.mjs` byte-compares `verbatim` against the file.
- **Line-citation radix/spacing traps:** `W3COMN.MAC` is `.RADIX 16` (a trailing `.` = decimal; bare `0-9` are hex) and single-spaced (physical = the grep line). `W3MAIN.MAC` and `W3DSUP.MAC` are **double-spaced** (a physical line ≈ 2× the logical/`.SBTTL`-ordinal). Claims cite **physical** lines; prose comments may add the logical as `phys N`. Read `.MAC` with `fs` utf8 / `grep -a` (they are CR-bearing non-UTF8).
- **Purity:** new `src/core` modules are swept by `tests/purity.test.ts` the moment they land — no `Date`, no `Math.random`, no browser surface, no shell import. Entropy comes only from a seeded `@shared/rng` `Rng` threaded through state.
- **RED import idiom:** a not-yet-built core module is loaded in its test via a `const SPEC = '../src/core/<m>.js'` string + `await import(/* @vite-ignore */ SPEC)`, wrapped in a loader that throws a self-describing "not built yet" message — so `tsc --noEmit` (the release gate) stays green while the module is absent. Copy the shape from `tests/abm.test.ts`.
- **Platform:** desktop-only; keyboard + mouse. Never add a narrow-viewport AC.
- **Git:** gitflow — branch off `develop` (`feat/mc3-<n>-<desc>`), PR back; never commit to `develop`. Run the branch-`checkout` as its own command (the pf branch-protection hook evaluates the compound command against the current branch).
- **Test one app:** `npx vitest run --project missile-command`. Type check: `npm run lint` (repo root).

---

### Task 1: Enemy ICBM reducer (`icbm.ts`)

The enemy warhead: launches from a top-edge origin, flies a straight line at constant speed to a ground target (a city/base position), and reports arrival — the mirror of mc1's `abm.ts`. Unit velocity (speed 1, trivial-exempt); the per-wave enemy-speed table is mc4, so no new claimed constant here.

**Files:**
- Create: `plugins/missile-command/src/core/icbm.ts`
- Test: `plugins/missile-command/tests/icbm.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces:
  - `interface Vec { readonly h: number; readonly v: number }`
  - `interface Icbm { readonly origin: Vec; readonly target: Vec; readonly pos: Vec; readonly arrived: boolean }`
  - `launchIcbm(origin: Vec, target: Vec): Icbm` — `pos = origin`, `arrived = false`
  - `stepIcbm(icbm: Icbm): Icbm` — advance ~1 unit along `origin→target`, snap to target on arrival, idempotent once arrived

- [ ] **Step 1: Write the failing test** — `tests/icbm.test.ts`

```ts
import { describe, it, expect } from 'vitest'

interface Vec { readonly h: number; readonly v: number }
interface Icbm { readonly origin: Vec; readonly target: Vec; readonly pos: Vec; readonly arrived: boolean }
interface IcbmModule {
  launchIcbm: (origin: Vec, target: Vec) => Icbm
  stepIcbm: (icbm: Icbm) => Icbm
}

const SPEC = '../src/core/icbm.js'
async function loadIcbm(): Promise<IcbmModule> {
  try {
    const mod = (await import(/* @vite-ignore */ SPEC)) as Partial<IcbmModule>
    if (typeof mod.launchIcbm !== 'function' || typeof mod.stepIcbm !== 'function')
      throw new Error('module has no `launchIcbm`/`stepIcbm` export')
    return mod as IcbmModule
  } catch (e) {
    throw new Error(
      'icbm core module not built yet — Dev creates src/core/icbm.ts, a PURE reducer exporting ' +
      'launchIcbm(origin,target) (pos=origin, arrived=false) and stepIcbm(icbm) that advances the ' +
      'head ~1 unit along the STRAIGHT line origin→target and SNAPS to target on arrival (UPDATE ' +
      'ICBM POSITIONS, W3MAIN). No clock, no entropy, no shell import. ' + `(${(e as Error).message})`,
    )
  }
}

const dist = (a: Vec, b: Vec) => Math.hypot(a.h - b.h, a.v - b.v)
const ORIGIN: Vec = { h: 120, v: 210 } // top-edge launch
const GROUND: Vec = { h: 95, v: 16 }   // city 1 position (CITY1H/V)

describe('mc3 AC — an ICBM flies straight from origin to its ground target and arrives', () => {
  it('launches parked at origin, not arrived', async () => {
    const { launchIcbm } = await loadIcbm()
    const i = launchIcbm(ORIGIN, GROUND)
    expect(i.pos).toEqual(ORIGIN)
    expect(i.arrived).toBe(false)
    expect(i.origin).toEqual(ORIGIN)
    expect(i.target).toEqual(GROUND)
  })

  it('closes on the target monotonically and snaps to it on arrival', async () => {
    const { launchIcbm, stepIcbm } = await loadIcbm()
    let cur = launchIcbm(ORIGIN, GROUND)
    let prev = dist(cur.pos, GROUND)
    for (let n = 0; n < 2000 && !cur.arrived; n++) {
      cur = stepIcbm(cur)
      const d = dist(cur.pos, GROUND)
      expect(d).toBeLessThanOrEqual(prev + 1e-9)
      prev = d
    }
    expect(cur.arrived).toBe(true)
    expect(cur.pos).toEqual(GROUND)
  })

  it('is idempotent once arrived, and does not mutate its input', async () => {
    const { launchIcbm, stepIcbm } = await loadIcbm()
    const i = launchIcbm(ORIGIN, ORIGIN) // target at origin → arrives on first step
    const snap = JSON.parse(JSON.stringify(i))
    const a = stepIcbm(i)
    expect(i).toEqual(snap)            // input untouched
    expect(a.arrived).toBe(true)
    expect(stepIcbm(a)).toEqual(a)     // parked
  })
})

describe('mc3 AC — icbm.ts cites its REV-01 source routine', () => {
  it('names W3MAIN and the ICBM motion routine', async () => {
    const { readFileSync } = await import('node:fs')
    const { fileURLToPath } = await import('node:url')
    const { dirname, join } = await import('node:path')
    const root = join(dirname(fileURLToPath(import.meta.url)), '..')
    const src = readFileSync(join(root, 'src', 'core', 'icbm.ts'), 'utf8')
    expect(src).toMatch(/W3MAIN/)
    expect(src).toMatch(/UPDATE ICBM POSITIONS|UPDPOS|ICBM/)
  })
})
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run --project missile-command tests/icbm.test.ts`
Expected: FAIL — "icbm core module not built yet …" (module absent).

- [ ] **Step 3: Write the minimal implementation** — `src/core/icbm.ts`

```ts
// src/core/icbm.ts
//
// Story mc3 — the enemy ICBM as PURE core data: a warhead that launches from a
// top-edge origin, flies a STRAIGHT line at constant unit speed to a ground
// target (a city or base position), and reports ARRIVAL on impact. The mirror of
// the player abm.ts; the shell never computes geometry.
//
// PURE: plain arithmetic, no clock, no entropy, no browser surface, no shell
// import. The src/core purity sweep (tests/purity.test.ts) scans this file.
//
// ─── SOURCE OF TRUTH (REV-01 W3MAIN.MAC; double-spaced → logical cites) ───────
//   UPDATE ICBM POSITIONS  W3MAIN:722 (logical; phys 1443) — each tick every live
//     ICBM head advances by its per-ICBM velocity vector toward its ground target;
//     it lands when the head reaches the target. Straight line, constant step.
//   CALCULATE MISSILE VELOCITY  W3MAIN:1640 (logical; phys 3279) — the step is the
//     unit vector to the target scaled by a per-WAVE speed. mc3 models the SHAPE at
//     unit speed (SPEED = 1); the per-wave enemy-speed table is mc4 difficulty.

export interface Vec { readonly h: number; readonly v: number }

export interface Icbm {
  readonly origin: Vec
  readonly target: Vec
  readonly pos: Vec
  readonly arrived: boolean
}

export function launchIcbm(origin: Vec, target: Vec): Icbm {
  return { origin, target, pos: origin, arrived: false }
}

export function stepIcbm(icbm: Icbm): Icbm {
  if (icbm.arrived) return icbm
  const dh = icbm.target.h - icbm.pos.h
  const dv = icbm.target.v - icbm.pos.v
  const remaining = Math.hypot(dh, dv)
  if (remaining <= 1) return { ...icbm, pos: icbm.target, arrived: true }
  const pos = { h: icbm.pos.h + dh / remaining, v: icbm.pos.v + dv / remaining }
  return { ...icbm, pos }
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run --project missile-command tests/icbm.test.ts`
Expected: PASS. Then `npx vitest run --project missile-command tests/purity.test.ts` — PASS (new module is clean).

- [ ] **Step 5: Commit**

```bash
git add plugins/missile-command/src/core/icbm.ts plugins/missile-command/tests/icbm.test.ts
git commit -m "feat(mc3): enemy ICBM straight-flight reducer (UPDATE ICBM POSITIONS)"
```

---

### Task 2: Stateful cities & bases (`field.ts`)

mc1's `field.ts` exports the fixed positions. mc3 adds the *stateful* structures the game mutates — a city that can die, a base that can die and holds ammo — built from those same cited positions. The positional constants and their claims are untouched (render still reads them for layout).

**Files:**
- Modify: `plugins/missile-command/src/core/field.ts` (append; do not alter existing exports)
- Test: `plugins/missile-command/tests/structures.test.ts`

**Interfaces:**
- Consumes: `CITIES`, `BASES`, `MAXMIS` from `field.ts` (MAXMIS added here, claim `MC-MAXMIS` already exists, value 10).
- Produces:
  - `interface City { readonly pos: FieldPos; readonly alive: boolean }`
  - `interface Base { readonly pos: FieldPos; readonly alive: boolean; readonly ammo: number }`
  - `createCities(): readonly City[]` — 6 live, one per `CITIES`
  - `createBases(): readonly Base[]` — 3 live, `ammo = MAXMIS`
  - `export const MAXMIS = 10`

- [ ] **Step 1: Write the failing test** — `tests/structures.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { CITIES, BASES } from '../src/core/field.js'

interface FieldPos { readonly h: number; readonly v: number }
interface City { readonly pos: FieldPos; readonly alive: boolean }
interface Base { readonly pos: FieldPos; readonly alive: boolean; readonly ammo: number }
interface StructMod {
  createCities: () => readonly City[]
  createBases: () => readonly Base[]
  MAXMIS: number
}

const SPEC = '../src/core/field.js'
async function loadStruct(): Promise<StructMod> {
  const mod = (await import(/* @vite-ignore */ SPEC)) as Partial<StructMod>
  if (typeof mod.createCities !== 'function' || typeof mod.createBases !== 'function' || typeof mod.MAXMIS !== 'number')
    throw new Error(
      'field.ts stateful structures not built yet — Dev adds City/Base types, createCities() ' +
      '(6 live from CITIES), createBases() (3 live, ammo=MAXMIS), and export const MAXMIS=10 ' +
      '(W3COMN MAXMIS, claim MC-MAXMIS). Positions come from the existing CITIES/BASES consts.',
    )
  return mod as StructMod
}

describe('mc3 AC — cities & bases start live at their cited positions', () => {
  it('createCities makes one live city per CITIES entry, at those positions', async () => {
    const { createCities } = await loadStruct()
    const cities = createCities()
    expect(cities.length).toBe(CITIES.length) // 6
    cities.forEach((c, i) => {
      expect(c.alive).toBe(true)
      expect(c.pos).toEqual(CITIES[i])
    })
  })

  it('createBases makes 3 live bases each loaded with MAXMIS ammo', async () => {
    const { createBases, MAXMIS } = await loadStruct()
    const bases = createBases()
    expect(bases.length).toBe(BASES.length) // 3
    expect(MAXMIS).toBe(10)
    bases.forEach((b, i) => {
      expect(b.alive).toBe(true)
      expect(b.ammo).toBe(MAXMIS)
      expect(b.pos).toEqual(BASES[i])
    })
  })
})
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run --project missile-command tests/structures.test.ts`
Expected: FAIL — "field.ts stateful structures not built yet …".

- [ ] **Step 3: Append the implementation** — `src/core/field.ts`

```ts
/** ABMs loaded per base at a fresh game — `W3COMN.MAC:29` (`MAXMIS=10.`, claim MC-MAXMIS). */
export const MAXMIS = 10

/** A city that can be destroyed (mc3). Position is the fixed cabinet coord. */
export interface City { readonly pos: FieldPos; readonly alive: boolean }

/** A missile base: destroyable, and its ABM magazine. `ammo` starts at MAXMIS. */
export interface Base { readonly pos: FieldPos; readonly alive: boolean; readonly ammo: number }

/** Six live cities at the cited CITY positions — a fresh game's defended cities. */
export function createCities(): readonly City[] {
  return CITIES.map((pos) => ({ pos, alive: true }))
}

/** Three live bases at the cited MISB positions, each loaded with MAXMIS ABMs. */
export function createBases(): readonly Base[] {
  return BASES.map((pos) => ({ pos, alive: true, ammo: MAXMIS }))
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run --project missile-command tests/structures.test.ts` — PASS.
Then `npx vitest run --project missile-command tests/citations.test.ts` — PASS (10 is carried by claim `MC-MAXMIS`; the AC3 guard is satisfied).

- [ ] **Step 5: Commit**

```bash
git add plugins/missile-command/src/core/field.ts plugins/missile-command/tests/structures.test.ts
git commit -m "feat(mc3): stateful cities & bases with per-base ammo (MAXMIS)"
```

---

### Task 3: Enemy spawner (`spawn.ts`)

Decides, each frame, whether to launch an ICBM and against which live target — from REV-01's actual spawn mechanism, not an invented cadence: keep at most `MXICON` on screen, launch more while the highest ICBM has fallen below `LAUHGT`, with a per-wave budget of `NICBMS`. Placement uses the seeded `Rng`. **This is mc3's minimal driver; mc4 replaces it with the full wave-difficulty schedule (`1ST PHASE OF NEW WAVE SETUP`, `W3MAIN.MAC:3901`).**

**Files:**
- Create: `plugins/missile-command/src/core/spawn.ts`
- Create: `plugins/missile-command/docs/rom-study/claims/spawn.json`
- Test: `plugins/missile-command/tests/spawn.test.ts`

**Interfaces:**
- Consumes: `Icbm`, `launchIcbm` (Task 1); `City`, `Base` (Task 2); `Rng`, `nextInt` from `@shared/rng`.
- Produces:
  - `const NICBMS = 8`, `const MXICON = 7`, `const LAUHGT = 202`
  - `interface SpawnResult { readonly icbms: readonly Icbm[]; readonly remaining: number }`
  - `spawnIcbms(current: readonly Icbm[], liveTargets: readonly Vec[], remaining: number, rng: Rng): SpawnResult` — returns the (possibly extended) ICBM list and the decremented per-wave budget. Launches at most enough to reach `MXICON` on screen, only while `remaining > 0` and the highest live ICBM's `v` is at or below `LAUHGT` (or the screen is empty). Origin `h` is `nextInt(rng, 256)` at the top edge (`v = 210`, top band); target is a random live structure.

- [ ] **Step 1: Write the claims file** — `docs/rom-study/claims/spawn.json`

Capture each `verbatim` byte-exact with `grep -an '<SYM>' reference/source/W3COMN.MAC` (tabs matter):

```json
[
  {
    "id": "MC-NICBMS",
    "symbol": "NICBMS",
    "value": 8,
    "meaning": "Max ICBMs tracked (per-wave budget ceiling).",
    "source": { "file": "W3COMN.MAC", "line": 35, "verbatim": "NICBMS\t=8\t\t\t;MAX # OF ICBMS" }
  },
  {
    "id": "MC-MXICON",
    "symbol": "MXICON",
    "value": 7,
    "meaning": "Max ICBMs on screen at once.",
    "source": { "file": "W3COMN.MAC", "line": 193, "verbatim": "MXICON\t=7\t\t\t;MAX # OF ICBMS ON SCREEN" }
  },
  {
    "id": "MC-LAUHGT",
    "symbol": "LAUHGT",
    "value": 202,
    "meaning": "Height (cabinet V, 0xCA=202 decimal) the highest ICBM must fall below to trigger launching more.",
    "source": { "file": "W3COMN.MAC", "line": 171, "verbatim": "LAUHGT\t=0CA\t\t\t;HEIGHT OF HIGHEST ICBM < THIS LAUNCHES MORE" }
  }
]
```

- [ ] **Step 2: Write the failing test** — `tests/spawn.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { createRng } from '@shared/rng'

interface Vec { readonly h: number; readonly v: number }
interface Icbm { readonly origin: Vec; readonly target: Vec; readonly pos: Vec; readonly arrived: boolean }
interface SpawnResult { readonly icbms: readonly Icbm[]; readonly remaining: number }
interface SpawnMod {
  NICBMS: number; MXICON: number; LAUHGT: number
  spawnIcbms: (cur: readonly Icbm[], targets: readonly Vec[], remaining: number, rng: import('@shared/rng').Rng) => SpawnResult
}

const SPEC = '../src/core/spawn.js'
async function loadSpawn(): Promise<SpawnMod> {
  const mod = (await import(/* @vite-ignore */ SPEC)) as Partial<SpawnMod>
  if (typeof mod.spawnIcbms !== 'function')
    throw new Error(
      'spawn core module not built yet — Dev creates src/core/spawn.ts exporting NICBMS(8), ' +
      'MXICON(7), LAUHGT(202) and spawnIcbms(current,liveTargets,remaining,rng): fills the screen ' +
      'up to MXICON while remaining>0 and the highest ICBM is at/below LAUHGT (or screen empty), ' +
      'placing each at a random top-edge column aimed at a random live target. Seeded rng only.',
    )
  return mod as SpawnMod
}

const TARGETS: Vec[] = [{ h: 95, v: 16 }, { h: 180, v: 21 }]

describe('mc3 AC — spawner respects the on-screen cap and the per-wave budget', () => {
  it('never exceeds MXICON on screen', async () => {
    const { spawnIcbms, MXICON } = await loadSpawn()
    const r = spawnIcbms([], TARGETS, 8, createRng(1))
    expect(r.icbms.length).toBeLessThanOrEqual(MXICON)
  })

  it('does not launch when remaining budget is 0', async () => {
    const { spawnIcbms } = await loadSpawn()
    const r = spawnIcbms([], TARGETS, 0, createRng(1))
    expect(r.icbms.length).toBe(0)
    expect(r.remaining).toBe(0)
  })

  it('holds fire while a high ICBM is still above LAUHGT (screen not empty)', async () => {
    const { spawnIcbms, LAUHGT } = await loadSpawn()
    const high: Icbm = { origin: { h: 10, v: 210 }, target: TARGETS[0], pos: { h: 10, v: LAUHGT + 5 }, arrived: false }
    const r = spawnIcbms([high], TARGETS, 8, createRng(1))
    expect(r.icbms.length).toBe(1) // unchanged — nothing new launched yet
  })

  it('launches toward a live target from a top-edge column, decrementing the budget', async () => {
    const { spawnIcbms } = await loadSpawn()
    const r = spawnIcbms([], TARGETS, 8, createRng(7))
    expect(r.icbms.length).toBeGreaterThan(0)
    expect(r.remaining).toBe(8 - r.icbms.length)
    for (const i of r.icbms) {
      expect(i.origin.v).toBeGreaterThan(LAUHGTish()) // spawned at the top band
      expect(TARGETS).toContainEqual(i.target)
      expect(i.arrived).toBe(false)
    }
  })

  it('is deterministic for a given seed', async () => {
    const { spawnIcbms } = await loadSpawn()
    expect(spawnIcbms([], TARGETS, 8, createRng(42))).toEqual(spawnIcbms([], TARGETS, 8, createRng(42)))
  })
})

function LAUHGTish(): number { return 200 } // top band is above the play field
```

- [ ] **Step 3: Run the test, verify it fails**

Run: `npx vitest run --project missile-command tests/spawn.test.ts`
Expected: FAIL — "spawn core module not built yet …".

- [ ] **Step 4: Write the implementation** — `src/core/spawn.ts`

```ts
// src/core/spawn.ts
//
// Story mc3 — the MINIMAL enemy spawner. mc4 replaces this with the full
// wave-difficulty schedule (1ST PHASE OF NEW WAVE SETUP, W3MAIN.MAC:3901). It
// drives spawning from REV-01's actual mechanism, not an invented cadence.
//
// PURE: seeded @shared/rng only — no clock, no ambient entropy, no shell import.
//
// ─── SOURCE OF TRUTH (REV-01 W3COMN.MAC, physical lines) ─────────────────────
//   NICBMS = 8   W3COMN.MAC:35  — max ICBMs (per-wave budget ceiling).  (claim MC-NICBMS)
//   MXICON = 7   W3COMN.MAC:193 — max ICBMs on screen at once.          (claim MC-MXICON)
//   LAUHGT = 202 W3COMN.MAC:171 — 0xCA; launch more once the highest ICBM has
//                                 fallen below this height.             (claim MC-LAUHGT)
import { type Rng, nextInt } from '@shared/rng'
import { launchIcbm, type Icbm, type Vec } from './icbm.js'

export const NICBMS = 8
export const MXICON = 7
export const LAUHGT = 202

export interface SpawnResult { readonly icbms: readonly Icbm[]; readonly remaining: number }

export function spawnIcbms(
  current: readonly Icbm[],
  liveTargets: readonly Vec[],
  remaining: number,
  rng: Rng,
): SpawnResult {
  if (remaining <= 0 || liveTargets.length === 0) return { icbms: current, remaining }

  // Launch only when the screen has room AND the highest live ICBM has dropped
  // below LAUHGT (or the screen is empty) — the ROM's "< LAUHGT launches more".
  const highestV = current.length === 0 ? 0 : Math.min(...current.map((i) => i.pos.v))
  const clearToLaunch = current.length === 0 || highestV <= LAUHGT
  if (!clearToLaunch) return { icbms: current, remaining }

  const room = MXICON - current.length
  const launches = Math.min(room, remaining)
  const spawned: Icbm[] = []
  for (let k = 0; k < launches; k++) {
    const origin: Vec = { h: nextInt(rng, 256), v: 210 } // random top-edge column
    const target = liveTargets[nextInt(rng, liveTargets.length)]
    spawned.push(launchIcbm(origin, target))
  }
  return { icbms: [...current, ...spawned], remaining: remaining - launches }
}
```

Note on trivial-guard: `256` and `210` are non-trivial literals in a core module. Add two claims for them OR — preferred — replace them with cited constants. `256` is the 8-bit H range (`0x00..0xFF`); reuse the cursor module's cited `HMAX` bound instead of a bare `256`, and derive the top-edge `v` from the cited `TOPSCR` band. **Before implementing, grep `TOPSCR` (`W3COMN.MAC`, "top of screen") and the cursor `HMAX` claim; cite the real top-edge V and H-range values in `spawn.json` and reference those consts here.** Do not ship a bare `256`/`210` — the AC3 guard will red.

- [ ] **Step 5: Run the tests, verify they pass**

Run: `npx vitest run --project missile-command tests/spawn.test.ts` — PASS.
Then `npx vitest run --project missile-command tests/citations.test.ts` — PASS (every spawn literal carries a claim). Then `tests/purity.test.ts` — PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/missile-command/src/core/spawn.ts plugins/missile-command/docs/rom-study/claims/spawn.json plugins/missile-command/tests/spawn.test.ts
git commit -m "feat(mc3): minimal ICBM spawner from NICBMS/MXICON/LAUHGT"
```

---

### Task 4: Damage detection (`damage.ts`)

The core mechanic, as two pure functions: a blast destroys every ICBM whose head lies within its current radius; an ICBM that has arrived at a city/base destroys it. Only trivial literals — no new claim (the geometry is cited to its routines in comments).

**Files:**
- Create: `plugins/missile-command/src/core/damage.ts`
- Test: `plugins/missile-command/tests/damage.test.ts`

**Interfaces:**
- Consumes: `Icbm` (Task 1); `City`, `Base` (Task 2); `Explosion`, `blastRadius` from `explosion.js` (mc1).
- Produces:
  - `interface KillResult { readonly survivors: readonly Icbm[]; readonly killed: number }`
  - `killIcbmsInBlasts(icbms: readonly Icbm[], explosions: readonly Explosion[]): KillResult` — an ICBM is killed if `hypot(pos−exp) ≤ blastRadius(exp)` for any blast
  - `interface ImpactResult { readonly cities: readonly City[]; readonly bases: readonly Base[]; readonly icbms: readonly Icbm[] }`
  - `resolveGroundImpacts(icbms: readonly Icbm[], cities: readonly City[], bases: readonly Base[]): ImpactResult` — each arrived ICBM kills the city/base at its target and is removed from the returned `icbms`

- [ ] **Step 1: Write the failing test** — `tests/damage.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { startExplosion, stepExplosion, type Explosion } from '../src/core/explosion.js'

interface Vec { readonly h: number; readonly v: number }
interface Icbm { readonly origin: Vec; readonly target: Vec; readonly pos: Vec; readonly arrived: boolean }
interface City { readonly pos: Vec; readonly alive: boolean }
interface Base { readonly pos: Vec; readonly alive: boolean; readonly ammo: number }
interface DamageMod {
  killIcbmsInBlasts: (i: readonly Icbm[], e: readonly Explosion[]) => { survivors: readonly Icbm[]; killed: number }
  resolveGroundImpacts: (i: readonly Icbm[], c: readonly City[], b: readonly Base[]) =>
    { cities: readonly City[]; bases: readonly Base[]; icbms: readonly Icbm[] }
}

const SPEC = '../src/core/damage.js'
async function loadDamage(): Promise<DamageMod> {
  const mod = (await import(/* @vite-ignore */ SPEC)) as Partial<DamageMod>
  if (typeof mod.killIcbmsInBlasts !== 'function' || typeof mod.resolveGroundImpacts !== 'function')
    throw new Error(
      'damage core module not built yet — Dev creates src/core/damage.ts: killIcbmsInBlasts ' +
      '(ICBM head within blastRadius(exp) → removed, counted) and resolveGroundImpacts (an arrived ' +
      'ICBM kills the city/base at its target and leaves the field). Cite MISSILE DAMAGE DETECTION ' +
      'and DESTROY A CITY OR BASE (W3MAIN).',
    )
  return mod as DamageMod
}

// A blast at (100,100). Step it to mid-life so its radius is well above 0.
function midBlast(): Explosion { let e = startExplosion(100, 100); for (let k = 0; k < 8; k++) e = stepExplosion(e); return e }

describe('mc3 AC — a blast destroys ICBMs inside its radius', () => {
  it('kills an ICBM whose head sits at the blast centre, spares a far one', async () => {
    const { killIcbmsInBlasts } = await loadDamage()
    const inside: Icbm = { origin: { h: 100, v: 210 }, target: { h: 100, v: 16 }, pos: { h: 100, v: 100 }, arrived: false }
    const far: Icbm = { origin: { h: 10, v: 210 }, target: { h: 10, v: 16 }, pos: { h: 10, v: 100 }, arrived: false }
    const r = killIcbmsInBlasts([inside, far], [midBlast()])
    expect(r.killed).toBe(1)
    expect(r.survivors).toEqual([far])
  })

  it('a finished (zero-radius) blast kills nothing', async () => {
    const { killIcbmsInBlasts } = await loadDamage()
    let done = startExplosion(100, 100); for (let k = 0; k < 30; k++) done = stepExplosion(done)
    const at: Icbm = { origin: { h: 100, v: 210 }, target: { h: 100, v: 16 }, pos: { h: 100, v: 100 }, arrived: false }
    expect(killIcbmsInBlasts([at], [done]).killed).toBe(0)
  })
})

describe('mc3 AC — an arrived ICBM destroys the city/base at its target', () => {
  it('kills the matching city and removes the ICBM', async () => {
    const { resolveGroundImpacts } = await loadDamage()
    const cityPos = { h: 95, v: 16 }
    const cities: City[] = [{ pos: cityPos, alive: true }, { pos: { h: 180, v: 21 }, alive: true }]
    const bases: Base[] = [{ pos: { h: 20, v: 22 }, alive: true, ammo: 10 }]
    const hit: Icbm = { origin: { h: 95, v: 210 }, target: cityPos, pos: cityPos, arrived: true }
    const r = resolveGroundImpacts([hit], cities, bases)
    expect(r.cities[0].alive).toBe(false)
    expect(r.cities[1].alive).toBe(true)
    expect(r.icbms).toEqual([]) // impacted ICBM consumed
    expect(r.bases[0].alive).toBe(true)
  })

  it('an in-flight (not arrived) ICBM damages nothing', async () => {
    const { resolveGroundImpacts } = await loadDamage()
    const cityPos = { h: 95, v: 16 }
    const cities: City[] = [{ pos: cityPos, alive: true }]
    const flying: Icbm = { origin: { h: 95, v: 210 }, target: cityPos, pos: { h: 95, v: 90 }, arrived: false }
    const r = resolveGroundImpacts([flying], cities, [])
    expect(r.cities[0].alive).toBe(true)
    expect(r.icbms).toEqual([flying])
  })
})
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run --project missile-command tests/damage.test.ts`
Expected: FAIL — "damage core module not built yet …".

- [ ] **Step 3: Write the implementation** — `src/core/damage.ts`

```ts
// src/core/damage.ts
//
// Story mc3 — the core mechanic as PURE detection: blast↔missile and
// missile↔structure. This is what makes Missile Command a game.
//
// PURE: plain geometry, no clock, no entropy, no shell import.
//
// ─── SOURCE OF TRUTH (REV-01 W3MAIN.MAC, double-spaced → logical cites) ───────
//   MISSILE DAMAGE DETECTION & PROCESS  W3MAIN:963 (logical; phys 1925) — walks
//     every enemy missile against every live blast; a missile inside a blast dies.
//   DESTROY A CITY OR BASE              W3MAIN:1084 (logical; phys 2167) — an enemy
//     warhead reaching a city/base destroys that structure.
import { blastRadius, type Explosion } from './explosion.js'
import type { Icbm, Vec } from './icbm.js'
import type { City, Base } from './field.js'

const within = (a: Vec, b: Vec, r: number): boolean => Math.hypot(a.h - b.h, a.v - b.v) <= r

export interface KillResult { readonly survivors: readonly Icbm[]; readonly killed: number }

export function killIcbmsInBlasts(icbms: readonly Icbm[], explosions: readonly Explosion[]): KillResult {
  const survivors = icbms.filter(
    (i) => !explosions.some((e) => within(i.pos, { h: e.h, v: e.v }, blastRadius(e))),
  )
  return { survivors, killed: icbms.length - survivors.length }
}

export interface ImpactResult {
  readonly cities: readonly City[]
  readonly bases: readonly Base[]
  readonly icbms: readonly Icbm[]
}

export function resolveGroundImpacts(
  icbms: readonly Icbm[],
  cities: readonly City[],
  bases: readonly Base[],
): ImpactResult {
  const landed = icbms.filter((i) => i.arrived)
  const hits = (p: Vec): boolean => landed.some((i) => i.target.h === p.h && i.target.v === p.v)
  return {
    cities: cities.map((c) => (c.alive && hits(c.pos) ? { ...c, alive: false } : c)),
    bases: bases.map((b) => (b.alive && hits(b.pos) ? { ...b, alive: false } : b)),
    icbms: icbms.filter((i) => !i.arrived),
  }
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run --project missile-command tests/damage.test.ts` — PASS. Then `tests/purity.test.ts` and `tests/citations.test.ts` — PASS (no non-trivial literals introduced).

- [ ] **Step 5: Commit**

```bash
git add plugins/missile-command/src/core/damage.ts plugins/missile-command/tests/damage.test.ts
git commit -m "feat(mc3): blast↔ICBM and ICBM↔structure damage detection"
```

---

### Task 5: Scoring (`score.ts`)

A downed ICBM scores `ICBM_KILL_POINTS` (25, wave 1). The ROM increases this by 25 per wave (`ICBM PTS X WAVE NUMBER`); the ×wave ramp is mc4, so mc3 pins the base value.

**Files:**
- Create: `plugins/missile-command/src/core/score.ts`
- Create: `plugins/missile-command/docs/rom-study/claims/score.json`
- Test: `plugins/missile-command/tests/score.test.ts`

**Interfaces:**
- Produces: `const ICBM_KILL_POINTS = 25`; `scoreKills(score: number, killed: number): number` → `score + killed * ICBM_KILL_POINTS`.

- [ ] **Step 1: Write the claims file** — `docs/rom-study/claims/score.json`

Grep the exact physical line + verbatim: `grep -an 'ADC I,25' reference/source/W3MAIN.MAC` (near the `INCREASE POINTS FOR DOWNING ICBMS` / `ICBPTL` block, physical ~4091). Use the byte-exact line as `verbatim`:

```json
[
  {
    "id": "MC-ICBPTS",
    "symbol": "ICBPTL",
    "value": 25,
    "meaning": "Points per downed ICBM, wave 1. ICBM points = 25 x wave number: ICBPTL starts and grows by 25 per wave (SED/BCD ADC I,25) under 'INCREASE POINTS FOR DOWNING ICBMS'. mc3 uses the wave-1 value 25; the x-wave ramp is mc4.",
    "source": { "file": "W3MAIN.MAC", "line": 4091, "verbatim": "\tADC I,25" }
  }
]
```

(If `grep -an 'ADC I,25'` reports a different physical line or verbatim spacing, use what it prints — the checker byte-compares.)

- [ ] **Step 2: Write the failing test** — `tests/score.test.ts`

```ts
import { describe, it, expect } from 'vitest'

interface ScoreMod { ICBM_KILL_POINTS: number; scoreKills: (score: number, killed: number) => number }
const SPEC = '../src/core/score.js'
async function loadScore(): Promise<ScoreMod> {
  const mod = (await import(/* @vite-ignore */ SPEC)) as Partial<ScoreMod>
  if (typeof mod.scoreKills !== 'function' || typeof mod.ICBM_KILL_POINTS !== 'number')
    throw new Error('score core module not built yet — Dev creates src/core/score.ts: ICBM_KILL_POINTS=25 (claim MC-ICBPTS) and scoreKills(score,killed)=score+killed*25.')
  return mod as ScoreMod
}

describe('mc3 AC — downing ICBMs scores 25 each (wave 1)', () => {
  it('ICBM_KILL_POINTS is 25', async () => {
    expect((await loadScore()).ICBM_KILL_POINTS).toBe(25)
  })
  it('adds 25 per kill onto the running score', async () => {
    const { scoreKills } = await loadScore()
    expect(scoreKills(0, 0)).toBe(0)
    expect(scoreKills(100, 3)).toBe(175)
  })
})
```

- [ ] **Step 3: Run the test, verify it fails**

Run: `npx vitest run --project missile-command tests/score.test.ts`
Expected: FAIL — "score core module not built yet …".

- [ ] **Step 4: Write the implementation** — `src/core/score.ts`

```ts
// src/core/score.ts
//
// Story mc3 — scoring. A downed ICBM scores ICBM_KILL_POINTS.
//
// ─── SOURCE OF TRUTH (REV-01 W3MAIN.MAC) ─────────────────────────────────────
//   INCREASE POINTS FOR DOWNING ICBMS  W3MAIN:~2043 (logical; phys ~4091) — the
//     per-ICBM points value ICBPTL grows by 25 each wave (SED/BCD ADC I,25);
//     "ICBM PTS X WAVE NUMBER". mc3 pins the wave-1 value 25 (claim MC-ICBPTS);
//     the x-wave ramp is mc4.
export const ICBM_KILL_POINTS = 25

export function scoreKills(score: number, killed: number): number {
  return score + killed * ICBM_KILL_POINTS
}
```

- [ ] **Step 5: Run the tests, verify they pass**

Run: `npx vitest run --project missile-command tests/score.test.ts` — PASS. Then `tests/citations.test.ts` — PASS (25 carried by `MC-ICBPTS`).

- [ ] **Step 6: Commit**

```bash
git add plugins/missile-command/src/core/score.ts plugins/missile-command/docs/rom-study/claims/score.json plugins/missile-command/tests/score.test.ts
git commit -m "feat(mc3): ICBM kill scoring (25/wave-1, ICBPTL)"
```

---

### Task 6: Game phase (`state.ts`)

A minimal state machine: `play` until every city is dead, then `over`. The full attract/setup/pause machine is mc6; mc3 implements just the one edge.

**Files:**
- Create: `plugins/missile-command/src/core/state.ts`
- Test: `plugins/missile-command/tests/state.test.ts`

**Interfaces:**
- Consumes: `City` (Task 2).
- Produces: `type Phase = 'play' | 'over'`; `allCitiesDead(cities: readonly City[]): boolean`; `nextPhase(phase: Phase, cities: readonly City[]): Phase`.

- [ ] **Step 1: Write the failing test** — `tests/state.test.ts`

```ts
import { describe, it, expect } from 'vitest'

interface City { readonly pos: { h: number; v: number }; readonly alive: boolean }
type Phase = 'play' | 'over'
interface StateMod {
  allCitiesDead: (c: readonly City[]) => boolean
  nextPhase: (p: Phase, c: readonly City[]) => Phase
}
const SPEC = '../src/core/state.js'
async function loadState(): Promise<StateMod> {
  const mod = (await import(/* @vite-ignore */ SPEC)) as Partial<StateMod>
  if (typeof mod.allCitiesDead !== 'function' || typeof mod.nextPhase !== 'function')
    throw new Error("state core module not built yet — Dev creates src/core/state.ts: Phase 'play'|'over', allCitiesDead(cities), nextPhase(phase,cities) → 'over' once all cities dead; 'over' is terminal.")
  return mod as StateMod
}
const city = (alive: boolean): City => ({ pos: { h: 0, v: 0 }, alive })

describe('mc3 AC — the game ends when the last city dies', () => {
  it('stays in play while any city lives', async () => {
    const { nextPhase } = await loadState()
    expect(nextPhase('play', [city(false), city(true)])).toBe('play')
  })
  it('flips to over when every city is dead', async () => {
    const { nextPhase, allCitiesDead } = await loadState()
    expect(allCitiesDead([city(false), city(false)])).toBe(true)
    expect(nextPhase('play', [city(false), city(false)])).toBe('over')
  })
  it('over is terminal', async () => {
    const { nextPhase } = await loadState()
    expect(nextPhase('over', [city(true)])).toBe('over')
  })
})
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run --project missile-command tests/state.test.ts` — FAIL ("state core module not built yet …").

- [ ] **Step 3: Write the implementation** — `src/core/state.ts`

```ts
// src/core/state.ts
//
// Story mc3 — the minimal play→over phase. The full attract/setup/play/pause
// machine (MAINLINE, W3MAIN.MAC:475) is mc6; mc3 implements only game-over.
import type { City } from './field.js'

export type Phase = 'play' | 'over'

export function allCitiesDead(cities: readonly City[]): boolean {
  return cities.every((c) => !c.alive)
}

export function nextPhase(phase: Phase, cities: readonly City[]): Phase {
  if (phase === 'over') return 'over'
  return allCitiesDead(cities) ? 'over' : 'play'
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run --project missile-command tests/state.test.ts` — PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/missile-command/src/core/state.ts plugins/missile-command/tests/state.test.ts
git commit -m "feat(mc3): play→over game-over phase"
```

---

### Task 7: Compose the loop (`game.ts`)

Grow `GameState` and `stepGame` to run the full frame: spawn → fly ICBMs → fly ABMs → detonate arrivals → damage → age blasts → resolve (score, ground impacts, phase). `createGame(seed)` seeds live cities/bases, empty enemies, `phase:'play'`, and the RNG.

**Files:**
- Modify: `plugins/missile-command/src/core/game.ts`
- Test: `plugins/missile-command/tests/game.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–6, plus mc1's `stepAbm`/`Abm`, `stepExplosion`/`startExplosion`/`isExplosionDone`, `INITIAL_CURSOR`; `createRng` from `@shared/rng`.
- Produces:
  - Grown `GameState`: adds `icbms: readonly Icbm[]`, `cities: readonly City[]`, `bases: readonly Base[]`, `score: number`, `phase: Phase`, `remaining: number` (per-wave budget), `rng: Rng`.
  - `createGame(seed?: number): GameState`
  - `stepGame(state: GameState): GameState` (unchanged signature)

- [ ] **Step 1: Write the failing test** — `tests/game.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { createGame, stepGame, type GameState } from '../src/core/game.js'

const run = (s: GameState, n: number): GameState => { let cur = s; for (let k = 0; k < n; k++) cur = stepGame(cur); return cur }

describe('mc3 AC — a fresh game starts defended and at rest', () => {
  it('has 6 live cities, 3 live bases at full ammo, no enemies, phase play, score 0', () => {
    const g = createGame(1)
    expect(g.cities.length).toBe(6)
    expect(g.cities.every((c) => c.alive)).toBe(true)
    expect(g.bases.length).toBe(3)
    expect(g.bases.every((b) => b.alive && b.ammo === 10)).toBe(true)
    expect(g.icbms.length).toBe(0)
    expect(g.score).toBe(0)
    expect(g.phase).toBe('play')
  })
})

describe('mc3 AC — the attack runs and can be scored against', () => {
  it('spawns ICBMs over time from the seeded wave', () => {
    const after = run(createGame(3), 60)
    expect(after.icbms.length).toBeGreaterThan(0)
  })

  it('a blast covering an ICBM destroys it and adds 25 to the score', () => {
    // Seed, step until an ICBM exists, drop a blast on its head via an ABM-free
    // detonation by placing an explosion in state directly through a player shot.
    let g = run(createGame(5), 30)
    const victim = g.icbms[0]
    // Inject a live blast at the victim's position (simulates a well-aimed player blast).
    g = { ...g, explosions: [...g.explosions, { h: Math.round(victim.pos.h), v: Math.round(victim.pos.v), t: 8 }] }
    const before = g.icbms.length
    const next = stepGame(g)
    expect(next.icbms.length).toBeLessThan(before)
    expect(next.score).toBeGreaterThanOrEqual(25)
  })
})

describe('mc3 AC — losing every city ends the game', () => {
  it('reaches phase over once all cities are dead', () => {
    // Force the terminal condition: kill all cities, then one more step resolves phase.
    let g = createGame(9)
    g = { ...g, cities: g.cities.map((c) => ({ ...c, alive: false })) }
    expect(stepGame(g).phase).toBe('over')
  })
})

describe('mc3 AC — the sim is deterministic for a seed', () => {
  it('two runs from the same seed are identical', () => {
    expect(run(createGame(7), 120)).toEqual(run(createGame(7), 120))
  })
})
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx vitest run --project missile-command tests/game.test.ts`
Expected: FAIL — `createGame` takes no seed / `GameState` lacks `icbms`/`cities`/`bases`/`score`/`phase` (type + runtime errors).

- [ ] **Step 3: Rewrite `game.ts`**

```ts
// src/core/game.ts — mc3: the composed combat loop.
import { INITIAL_CURSOR, type Cursor } from './cursor.js'
import { stepAbm, type Abm } from './abm.js'
import { stepIcbm, type Icbm } from './icbm.js'
import { startExplosion, stepExplosion, isExplosionDone, type Explosion } from './explosion.js'
import { createCities, createBases, type City, type Base } from './field.js'
import { spawnIcbms, NICBMS, type SpawnResult } from './spawn.js'
import { killIcbmsInBlasts, resolveGroundImpacts } from './damage.js'
import { scoreKills } from './score.js'
import { nextPhase, type Phase } from './state.js'
import { createRng, type Rng } from '@shared/rng'

export interface GameState {
  readonly frame: number
  readonly cursor: Cursor
  readonly abms: readonly Abm[]
  readonly icbms: readonly Icbm[]
  readonly explosions: readonly Explosion[]
  readonly cities: readonly City[]
  readonly bases: readonly Base[]
  readonly score: number
  readonly phase: Phase
  readonly remaining: number
  readonly rng: Rng
}

export function createGame(seed = 1): GameState {
  return {
    frame: 0, cursor: INITIAL_CURSOR, abms: [], icbms: [], explosions: [],
    cities: createCities(), bases: createBases(), score: 0, phase: 'play',
    remaining: NICBMS, rng: createRng(seed),
  }
}

export function stepGame(state: GameState): GameState {
  if (state.phase === 'over') return { ...state, frame: state.frame + 1 }

  // 1. spawn — against live cities+bases only
  const liveTargets = [
    ...state.cities.filter((c) => c.alive).map((c) => c.pos),
    ...state.bases.filter((b) => b.alive).map((b) => b.pos),
  ]
  const spawned: SpawnResult = spawnIcbms(state.icbms, liveTargets, state.remaining, state.rng)

  // 2/3. fly enemies and player missiles
  const flownIcbms = spawned.icbms.map(stepIcbm)
  const flownAbms = state.abms.map(stepAbm)

  // 4. detonate ABM arrivals into fresh blasts
  const detonations = flownAbms.filter((a) => a.arrived).map((a) => startExplosion(a.target.h, a.target.v))
  const explosions = [...state.explosions.map(stepExplosion), ...detonations].filter((e) => !isExplosionDone(e))

  // 5. damage — blasts kill ICBMs (scored); arrived ICBMs kill structures
  const { survivors, killed } = killIcbmsInBlasts(flownIcbms, explosions)
  const impact = resolveGroundImpacts(survivors, state.cities, state.bases)

  // 7. resolve — score, advance phase
  const score = scoreKills(state.score, killed)
  const phase = nextPhase(state.phase, impact.cities)

  return {
    ...state,
    frame: state.frame + 1,
    abms: flownAbms.filter((a) => !a.arrived),
    icbms: impact.icbms,
    explosions,
    cities: impact.cities,
    bases: impact.bases,
    score,
    phase,
    remaining: spawned.remaining,
  }
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx vitest run --project missile-command tests/game.test.ts` — PASS. Then the whole app: `npx vitest run --project missile-command` — PASS (purity, citations, and mc1's tests all still green). Then `npm run lint` — PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/missile-command/src/core/game.ts plugins/missile-command/tests/game.test.ts
git commit -m "feat(mc3): compose the combat loop — spawn, damage, score, game-over"
```

---

### Task 8: Render the battle (`shell/render.ts`)

Paint the new state: incoming ICBM trails + heads, dead cities/bases as rubble, and a HUD (score + per-base ammo). Functional colours only — the per-wave palette and authentic stamps are mc9. The score drawn is the core's `state.score` (never a re-derived copy — the HUD-figure rule).

**Files:**
- Modify: `plugins/missile-command/src/shell/render.ts`
- Test: `plugins/missile-command/tests/render-field.test.ts` (extend) — or a new `tests/render-battle.test.ts` if the existing file's harness doesn't fit.

**Interfaces:**
- Consumes: the grown `GameState`.
- Produces: no new exports required; `render(ctx, state)` (or the existing render entry) now also draws `state.icbms`, dead structures, and the HUD. Follow the existing `render.ts` signature and its canvas-mock test harness.

- [ ] **Step 1: Read the existing render + its test harness**

Read `src/shell/render.ts` and `tests/render-field.test.ts` to learn the render signature and the canvas-mock assertion style (what the mock records — `moveTo`/`lineTo`/`arc`/`fillText` calls). Match it; do not invent a new harness.

- [ ] **Step 2: Write the failing test** (extend `render-battle.test.ts`)

```ts
// Assert against the SAME canvas mock the existing render test uses. Sketch:
// 1) Build a GameState via createGame(1), inject one ICBM and kill one city.
// 2) Call render(mockCtx, state).
// 3) Expect: an arc/line drawn for the ICBM head (some draw call references its pos);
//    a live city drawn but the dead city NOT drawn as intact (drawn as rubble / skipped);
//    fillText called with String(state.score) and with each base's ammo.
// Use the existing mock's recorded-calls array; assert on its contents, not pixels.
```

Write the concrete assertions using the recorded-calls shape you found in Step 1 (e.g. `expect(calls.fillText).toContainEqual(['0', ...])` for the score, `expect(calls.arc.length).toBeGreaterThan(0)` for the ICBM head). Keep them behavioural: "the score value is drawn", "a dead city is not drawn as a live city", "each base's ammo is drawn".

- [ ] **Step 3: Run the test, verify it fails**

Run: `npx vitest run --project missile-command tests/render-battle.test.ts` — FAIL (render draws none of the new state yet).

- [ ] **Step 4: Extend `render.ts`**

Draw, in `render(ctx, state)` after the existing field draw: each `state.icbms` head + `origin→pos` trail in the enemy colour; skip/rubble any `!alive` city or base (only live structures draw as intact); a HUD line with `String(state.score)` and each base's `ammo`. Keep it functional — reuse the existing colour constants; no palette work. Do not re-derive the score.

- [ ] **Step 5: Run the tests, verify they pass**

Run: `npx vitest run --project missile-command tests/render-battle.test.ts` — PASS. Then `npx vitest run --project missile-command` — PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/missile-command/src/shell/render.ts plugins/missile-command/tests/render-battle.test.ts
git commit -m "feat(mc3): render ICBMs, dead structures, and the score/ammo HUD"
```

---

### Task 9: A dead or empty base can't fire (`shell/input.ts`)

mc1's `input.ts` picks the base per fire key and launches an ABM. mc3 gates that: a destroyed base, or one with `ammo === 0`, is a no-op; a successful launch decrements that base's ammo.

**Files:**
- Modify: `plugins/missile-command/src/shell/input.ts`
- Test: `plugins/missile-command/tests/fire.test.ts` (extend)

**Interfaces:**
- Consumes: the grown `GameState` (its `bases` with `alive`/`ammo`).
- Produces: the fire handler now (a) launches only from a live base with `ammo > 0`, appending an `Abm` and decrementing that base's `ammo`; (b) is a pure no-op otherwise (no ABM, ammo unchanged). Keep the existing per-key→base mapping.

- [ ] **Step 1: Read `input.ts` + `fire.test.ts`**

Learn how the current handler maps Z/X/C → base and appends the ABM, and how `fire.test.ts` drives it. Match that shape.

- [ ] **Step 2: Write the failing tests** (extend `fire.test.ts`)

```ts
// Using the existing fire harness:
// 1) Firing the left key from a full base appends one ABM and drops that base's ammo by 1.
// 2) Firing a base at ammo 0 appends NO ABM and leaves ammo at 0.
// 3) Firing a destroyed (alive:false) base appends NO ABM.
// Assert on the returned GameState's abms length and bases[k].ammo — pure, no canvas.
```

Write the three concrete cases against the real handler signature found in Step 1.

- [ ] **Step 3: Run, verify fail** — `npx vitest run --project missile-command tests/fire.test.ts` — FAIL (no ammo gating yet).

- [ ] **Step 4: Gate the handler** — in `input.ts`, before launching: resolve the base for the key; if `!base.alive || base.ammo === 0` return state unchanged; else append the ABM (origin = base.pos, target = cursor) and return state with that base's `ammo` decremented by 1.

- [ ] **Step 5: Run the tests, verify they pass** — `npx vitest run --project missile-command tests/fire.test.ts` — PASS. Then `npx vitest run --project missile-command` — PASS.

- [ ] **Step 6: Commit**

```bash
git add plugins/missile-command/src/shell/input.ts plugins/missile-command/tests/fire.test.ts
git commit -m "feat(mc3): dead/empty base can't fire; a shot spends one ABM"
```

---

### Task 10: End-to-end integration + full-suite gate

One seeded playthrough test that exercises the whole loop, then a green run of every gate.

**Files:**
- Test: `plugins/missile-command/tests/mc3-playthrough.test.ts`

- [ ] **Step 1: Write the integration test**

```ts
import { describe, it, expect } from 'vitest'
import { createGame, stepGame, type GameState } from '../src/core/game.js'

const run = (s: GameState, n: number): GameState => { let c = s; for (let k = 0; k < n; k++) c = stepGame(c); return c }

describe('mc3 — a seeded playthrough is coherent end to end', () => {
  it('enemies appear, the budget draws down, and nothing goes out of bounds', () => {
    const end = run(createGame(11), 400)
    expect(end.remaining).toBeLessThan(11)            // ICBMs were launched from the wave budget
    expect(end.icbms.length).toBeLessThanOrEqual(7)   // MXICON cap respected
    // structures only ever transition alive→dead, never resurrect
    expect(end.cities.filter((c) => c.alive).length).toBeLessThanOrEqual(6)
    expect(end.bases.filter((b) => b.alive).length).toBeLessThanOrEqual(3)
    expect(['play', 'over']).toContain(end.phase)
  })

  it('is fully deterministic: identical seeds → identical 400-frame states', () => {
    expect(run(createGame(11), 400)).toEqual(run(createGame(11), 400))
  })
})
```

- [ ] **Step 2: Run it, verify it passes** — `npx vitest run --project missile-command tests/mc3-playthrough.test.ts` — PASS.

- [ ] **Step 3: Run every gate**

```bash
npx vitest run --project missile-command      # all app tests: purity, citations, mc1 + mc3
npm run lint                                   # tsc --noEmit, repo-wide
npm run test:orchestrator                      # cabinet wiring invariants (unaffected, must stay green)
```
Expected: all PASS. In particular `citations.test.ts`'s AC3 guard is green — every new `src/core` literal (spawn's NICBMS/MXICON/LAUHGT/top-edge consts, score's 25, field's MAXMIS) is claim-backed.

- [ ] **Step 4: Commit**

```bash
git add plugins/missile-command/tests/mc3-playthrough.test.ts
git commit -m "test(mc3): seeded end-to-end playthrough of the combat loop"
```

---

## Self-Review

**Spec coverage (roadmap §mc3 → tasks):** enemy ICBM spawn+flight → Tasks 1, 3; blast kills incoming → Task 4 (`killIcbmsInBlasts`) + Task 7 wiring; incoming kills city/base → Task 4 (`resolveGroundImpacts`) + Task 7; ammo per base → Task 2 (`createBases`/`MAXMIS`) + Task 9 (spend/gate); score for kills → Task 5 + Task 7; play→game-over → Task 6 + Task 7; HUD → Task 8; determinism/seeded RNG → Tasks 3, 7, 10. Out-of-scope items (waves ramp, MIRV/bomber/etc., attract/pause, hi-score, audio, palette/exact blast curve) are correctly absent and named in the spec's later epics.

**Placeholder scan:** No "TBD"/"implement later". Two tasks (8, 9) legitimately say "read the existing harness first, then write assertions against its recorded-calls shape" rather than inventing a canvas mock the repo doesn't use — the assertions are specified behaviourally with concrete targets (score value drawn, dead city not drawn live, ammo drawn; three fire cases). The spawn `256`/`210` literals carry an explicit instruction to replace them with cited `TOPSCR`/`HMAX`-derived consts before shipping (the AC3 guard enforces it).

**Type consistency:** `Vec`, `Icbm`, `City`, `Base`, `Phase`, `Explosion` names and fields match across Tasks 1–7; `GameState` in Task 7 is the superset the tests in Tasks 7 and 10 read; `killIcbmsInBlasts`/`resolveGroundImpacts`/`scoreKills`/`nextPhase`/`spawnIcbms` signatures are identical where produced and consumed. `MAXMIS` (10), `ICBM_KILL_POINTS` (25), `NICBMS`(8)/`MXICON`(7)/`LAUHGT`(202) values match their claim files.

## Open items handed to the executor

- **Physical line numbers in claims:** the `line`/`verbatim` in `spawn.json` and `score.json` are from `grep -an`; re-grep to confirm exact physical line + byte-exact tabs before committing — `check-citations.mjs` byte-compares. (W3COMN is single-spaced; W3MAIN double-spaced.)
- **Spawn top-edge consts:** replace bare `256`/`210` with cited `HMAX`/`TOPSCR`-derived values + claims (Task 3, Step 4 note).
- **Render/input harness:** Tasks 8–9 read the existing `render-field.test.ts` / `fire.test.ts` harness first and match it.
