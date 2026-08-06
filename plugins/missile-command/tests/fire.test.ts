// plugins/missile-command/tests/fire.test.ts
//
// Story mc1-4 — RED phase (Han Solo / TEA). AC2 (the shell seam): the three fire
// keys. `src/shell/input.ts` (already home to the mc1-3 pointer adapter) binds
// Z / X / C to the LEFT / CENTRE / RIGHT missile base and, on a fire, launches an
// ABM from THAT base's position to the current crosshair via core/abm.launchAbm.
// Core owns the flight (abm.test.ts) and the blast (explosion.test.ts); this shell
// only chooses the base and hands its position in — it re-implements neither.
//
// ─── SCOPE RULING (owner, 2026-08-06): per-key specific base, source-faithful ──
// REV-01 `LAUNCH ABMS` (ABMLAU, W3MAIN:606) reads three fire switches through the
// mask table `FIREMA: .BYTE MFIREL,MFIREC,MFIRER` — each switch fires its OWN base,
// left/centre/right, and an empty base gives the "no fire" noise (NO nearest-base
// auto-select). So Z→base 0 (left), X→base 1 (centre), C→base 2 (right), matching
// AC2 and field.ts BASES (source order = ascending H = left→right). The three keys
// are also named in plugin.ts controls ("FIRE — Z X C (left / centre / right base)").
//
// ─── WHAT A NODE TEST PINS (and what it leaves to the reviewer) ───────────────
// AC2's on-screen acceptance — a fire drawing a trail to the crosshair and an
// expanding/collapsing blast at /missile-command/ — is a SCREENSHOT the owner /
// Reviewer checks; the vitest env here is `node`, with no canvas and no key
// surface. What a node test CAN pin is the deterministic seam under the keydown
// listener: key→base selection and the launch that feeds core/abm. render.ts
// drawing the trail+blast and main.ts wiring the frame loop are the screenshot's
// job (see the Delivery Finding).
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `fireKeyToBase` / `launchFromKey` do not exist on shell/input.ts yet, and
// core/abm.ts is unbuilt. Both loaders throw a self-describing "not built yet", so
// every test reddens for the FEATURE's absence, not a bare resolution stack trace.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─── The contracts GREEN (Yoda / Dev) implements ─────────────────────────────

interface Vec {
  readonly h: number
  readonly v: number
}

interface Abm {
  readonly origin: Vec
  readonly target: Vec
  readonly pos: Vec
  readonly arrived: boolean
}

interface FireModule {
  /** Map a key to its base index — Z→0 (left), X→1 (centre), C→2 (right); else null. */
  fireKeyToBase: (key: string) => number | null
  /**
   * Launch an ABM from the base `key` selects (via `bases`) to `target`, using
   * core/abm.launchAbm. Returns null for a non-fire key. Pure — the caller (the
   * keydown listener) supplies `bases` (field.ts BASES) and the current cursor.
   */
  launchFromKey: (key: string, bases: readonly Vec[], target: Vec) => Abm | null
}

interface AbmModule {
  launchAbm: (origin: Vec, target: Vec) => Abm
  stepAbm: (abm: Abm) => Abm
}

interface ExplosionModule {
  MAX_BLAST_RADIUS: number
  startExplosion: (h: number, v: number) => { readonly h: number; readonly v: number; readonly t: number }
  stepExplosion: (exp: { readonly t: number }) => { readonly h: number; readonly v: number; readonly t: number }
  blastRadius: (exp: { readonly t: number }) => number
  isExplosionDone: (exp: { readonly t: number }) => boolean
}

// Variable specifiers + `/* @vite-ignore */` so `tsc --noEmit` stays green while
// the fire seam and core/abm are still absent — the fleet RED-import idiom.
const INPUT_SPECIFIER = '../src/shell/input.js'
const ABM_SPECIFIER = '../src/core/abm.js'
const EXPLOSION_SPECIFIER = '../src/core/explosion.js'
const FIELD_SPECIFIER = '../src/core/field.js'

async function loadFire(): Promise<FireModule> {
  try {
    const mod = (await import(/* @vite-ignore */ INPUT_SPECIFIER)) as Partial<FireModule>
    if (typeof mod.fireKeyToBase !== 'function' || typeof mod.launchFromKey !== 'function') {
      throw new Error('shell/input.ts has no `fireKeyToBase`/`launchFromKey` export')
    }
    return mod as FireModule
  } catch (e) {
    throw new Error(
      'fire seam not built yet — Dev adds to src/shell/input.ts: fireKeyToBase(key) mapping ' +
        "'z'/'Z'→0 (left), 'x'/'X'→1 (centre), 'c'/'C'→2 (right) and null otherwise (FIREMA/ABMLAU, " +
        'W3MAIN:606), and launchFromKey(key, bases, target) that returns ' +
        'core/abm.launchAbm(bases[fireKeyToBase(key)], target) for a fire key, null otherwise — the ' +
        `three switches each fire their OWN base. (${(e as Error).message})`,
    )
  }
}

async function loadAbm(): Promise<AbmModule> {
  try {
    const mod = (await import(/* @vite-ignore */ ABM_SPECIFIER)) as Partial<AbmModule>
    if (typeof mod.launchAbm !== 'function') throw new Error('no `launchAbm` export')
    return mod as AbmModule
  } catch (e) {
    throw new Error(`core/abm.ts not built yet (see abm.test.ts). (${(e as Error).message})`)
  }
}

async function loadExplosion(): Promise<ExplosionModule> {
  try {
    const mod = (await import(/* @vite-ignore */ EXPLOSION_SPECIFIER)) as Partial<ExplosionModule>
    if (typeof mod.startExplosion !== 'function') throw new Error('no `startExplosion` export')
    return mod as ExplosionModule
  } catch (e) {
    throw new Error(`core/explosion.ts not built yet (see explosion.test.ts). (${(e as Error).message})`)
  }
}

// field.ts EXISTS (mc1-2), so this import is GREEN — used to prove the key→base
// mapping lines up with the real left→right layout.
async function loadBases(): Promise<readonly Vec[]> {
  const mod = (await import(/* @vite-ignore */ FIELD_SPECIFIER)) as { BASES?: readonly Vec[] }
  if (!Array.isArray(mod.BASES)) throw new Error('core/field.ts has no BASES export')
  return mod.BASES
}

// A controlled bases array with unmistakable left→centre→right H ordering.
const BASES: readonly Vec[] = [
  { h: 20, v: 22 }, // left
  { h: 123, v: 22 }, // centre
  { h: 240, v: 22 }, // right
]
const CURSOR: Vec = { h: 150, v: 150 }

describe('AC2 — the three fire keys map to left / centre / right base', () => {
  it('Z→0 (left), X→1 (centre), C→2 (right)', async () => {
    const { fireKeyToBase } = await loadFire()
    expect(fireKeyToBase('z')).toBe(0)
    expect(fireKeyToBase('x')).toBe(1)
    expect(fireKeyToBase('c')).toBe(2)
  })

  it('accepts the upper-case forms of the keys too', async () => {
    const { fireKeyToBase } = await loadFire()
    expect(fireKeyToBase('Z')).toBe(0)
    expect(fireKeyToBase('X')).toBe(1)
    expect(fireKeyToBase('C')).toBe(2)
  })

  it('returns null for any non-fire key (no accidental launch)', async () => {
    const { fireKeyToBase } = await loadFire()
    for (const k of ['a', 'q', ' ', 'Enter', 'ArrowUp', '1', 'v', 'b']) {
      expect(fireKeyToBase(k), `"${k}" must not select a base`).toBeNull()
    }
  })

  it('the three keys select three DISTINCT bases (no collision)', async () => {
    const { fireKeyToBase } = await loadFire()
    const picks = [fireKeyToBase('z'), fireKeyToBase('x'), fireKeyToBase('c')]
    expect(new Set(picks).size).toBe(3)
  })
})

describe('AC2 — a fire launches an ABM from THAT base to the crosshair, via core', () => {
  it("Z launches from bases[0], X from bases[1], C from bases[2] — to the target", async () => {
    const { launchFromKey } = await loadFire()
    const { launchAbm } = await loadAbm()
    expect(launchFromKey('z', BASES, CURSOR)).toEqual(launchAbm(BASES[0], CURSOR))
    expect(launchFromKey('x', BASES, CURSOR)).toEqual(launchAbm(BASES[1], CURSOR))
    expect(launchFromKey('c', BASES, CURSOR)).toEqual(launchAbm(BASES[2], CURSOR))
  })

  it('the launched ABM starts at the chosen base and aims at the crosshair', async () => {
    const { launchFromKey } = await loadFire()
    const abm = launchFromKey('x', BASES, CURSOR)
    expect(abm, 'X is a fire key — it must launch').not.toBeNull()
    expect(abm!.origin).toEqual(BASES[1])
    expect(abm!.pos).toEqual(BASES[1])
    expect(abm!.target).toEqual(CURSOR)
    expect(abm!.arrived).toBe(false)
  })

  it('a non-fire key launches nothing (null)', async () => {
    const { launchFromKey } = await loadFire()
    expect(launchFromKey(' ', BASES, CURSOR)).toBeNull()
    expect(launchFromKey('a', BASES, CURSOR)).toBeNull()
  })

  it('left key fires the leftmost real base, right key the rightmost (field.ts layout)', async () => {
    const { fireKeyToBase, launchFromKey } = await loadFire()
    const realBases = await loadBases()
    const hs = realBases.map((b) => b.h)
    const leftmost = hs.indexOf(Math.min(...hs))
    const rightmost = hs.indexOf(Math.max(...hs))
    // The index mapping must agree with the spatial left/centre/right meaning.
    expect(fireKeyToBase('z'), 'Z must select the leftmost base').toBe(leftmost)
    expect(fireKeyToBase('c'), 'C must select the rightmost base').toBe(rightmost)
    const zAbm = launchFromKey('z', realBases, CURSOR)!
    const cAbm = launchFromKey('c', realBases, CURSOR)!
    expect(zAbm.origin.h).toBeLessThan(cAbm.origin.h)
  })
})

describe('AC2 — the fire seam consumes core/abm, it does not re-implement the flight', () => {
  const inputSrc = (): string => readFileSync(join(root, 'src', 'shell', 'input.ts'), 'utf8')

  it('imports launchAbm from core/abm', () => {
    const src = inputSrc()
    expect(
      src,
      'input.ts must import the launcher from core/abm — the flight is core geometry, not a shell literal',
    ).toMatch(/from\s+['"][^'"]*core\/abm(\.js)?['"]/)
    expect(src).toMatch(/\blaunchAbm\b/)
  })

  it('cites the REV-01 fire routine it faithfully binds (ABMLAU / FIREMA)', () => {
    const src = inputSrc()
    expect(src, 'the three-switch binding must cite its source').toMatch(
      /ABMLAU|LAUNCH ABMS|FIREMA/,
    )
  })
})

describe('proof-of-life — fire → straight flight → arrival → expanding/collapsing blast', () => {
  // The skeleton's whole reason to exist, composed from the shell seam + both core
  // reducers with no wall clock in sight: press a key, the missile flies from the
  // right base to the crosshair, and on arrival a blast blooms at the target and
  // collapses to nothing. This keeps the sneaky Dev honest that the pieces COMPOSE,
  // not merely pass in isolation.
  it('a centre-key fire flies to the cursor and detonates a full blast there', async () => {
    const { launchFromKey } = await loadFire()
    const { stepAbm } = await loadAbm()
    const { startExplosion, stepExplosion, blastRadius, isExplosionDone, MAX_BLAST_RADIUS } =
      await loadExplosion()

    // Fire from the centre base at the crosshair.
    let abm = launchFromKey('x', BASES, CURSOR)!
    expect(abm.origin).toEqual(BASES[1])

    // Fly it straight to the target.
    let ticks = 0
    while (!abm.arrived && ticks < 2000) {
      abm = stepAbm(abm)
      ticks++
    }
    expect(abm.arrived, 'the ABM never reached the crosshair').toBe(true)
    expect(abm.pos).toEqual(CURSOR)

    // Detonate at the arrival point and run the blast to completion.
    let exp = startExplosion(abm.pos.h, abm.pos.v)
    expect(exp.h).toBe(CURSOR.h)
    expect(exp.v).toBe(CURSOR.v)
    let peak = 0
    let blastTicks = 0
    while (!isExplosionDone(exp) && blastTicks < 200) {
      peak = Math.max(peak, blastRadius(exp))
      exp = stepExplosion(exp)
      blastTicks++
    }
    expect(peak, 'the blast never reached full radius at the target').toBe(MAX_BLAST_RADIUS)
    expect(isExplosionDone(exp), 'the blast never collapsed').toBe(true)
    expect(blastRadius(exp)).toBe(0)
  })
})
