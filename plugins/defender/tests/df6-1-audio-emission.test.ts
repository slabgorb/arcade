// tests/df6-1-audio-emission.test.ts
//
// Story df6-1 (AC4) — THE MUTATION BATTERY. Each of the 21 SOUND-TABLE cues is
// emitted from the INTEGRATED sim at a REAL, reachable call site (the whole point of
// the df6-1 menagerie-wiring pass); this suite drives the sim into each moment and
// asserts the cue appears on `SimState.cues`. Deleting any single `rt.cues.push(...)`
// from sim.ts reddens exactly the test that reaches its moment — measured by removing
// them one at a time.
//
// It also pins the three AC4 negatives: a surviving HYPERSPACE emits NO cue (its only
// possible cue, player-death, fires only on the death roll); Defender ships SILENT
// (no `.wav` is committed); and controls prove non-vacuity (a quiet run emits neither
// smart-bomb nor extra-man nor a hit).
//
// STAGING. The cues split by reachability: some arrive from ordinary play (the
// opening wave, a held fire, the lander weapon), the rest are staged by placing the
// enemy the running wave never spawns (baiter/pod/bomber/swarmer are absent from
// wave 1) at the ship's laser row and holding fire, or by mutating a record into the
// exact state the moment needs (a carried humanoid dropped, a faller on the floor).
// Every placement uses the sim's OWN bank spawners and kill paths — never a
// re-implemented collision — so a wiring regression in the real emit path is what
// reddens.

import { describe, it, expect } from 'vitest'
import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSim, stepSim, type Input, type SimState } from '../src/core/sim.js'

const NEUTRAL: Input = { thrust: false, reverse: false, up: false, down: false, fire: false }
const withInput = (over: Partial<Input>): Input => ({ ...NEUTRAL, ...over })

/** Deterministic byte source (LCG) — the df3-6/df5-8 shape; no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

// The internal surface these stagings touch: the sim's bank spawners/kill paths and
// the runtime the collision reads. A focused cast (not `any`) so the staging stays
// typed and a rename of a real internal reddens here too.
interface RigEnemy {
  x: number
  y: number
  alive: boolean
}
interface RigLander extends RigEnemy {
  carrying: boolean
  reachedTop: boolean
}
interface RigHumanoid extends RigEnemy {
  state: string
}
interface RigShot {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}
interface Rig {
  _enemyBank: {
    landers: RigLander[]
    humanoids: RigHumanoid[]
    killLander: (l: RigLander) => void
    spawnLander: (x: number) => RigLander | null
  }
  _mutantBank: { spawnMutant: (x: number, y: number) => unknown }
  _ufoBank: { spawnUfo: (x: number, y: number) => unknown }
  _bomberBank: { spawnBomber: (x: number, y: number) => unknown }
  _swarmerBank: { spawnSwarmer: (x: number, y: number) => unknown }
  _podBank: { spawnPod: (x: number, y: number) => unknown }
  _rt: {
    player: { x: number; y: number }
    shots: RigShot[]
    landerShootTimers: WeakMap<object, number>
  }
  _plax16: number
}
// Cast to Rig ALONE, never `SimState & Rig`: intersecting re-merges SimState's
// readonly record views (Lander, Humanoid) back over Rig's mutable ones, so the
// staging could not assign `l.carrying`. Rig's own fields are the writable surface.
const rig = (s: SimState): Rig => s as unknown as Rig

/** Collect every cue KIND emitted over a run. `setup` mutates the fresh, once-stepped sim. */
function collect(
  seed: number,
  ticks: number,
  input: (i: number) => Input,
  setup?: (r: Rig) => void,
): Set<string> {
  let s = createSim(makeRand(seed))
  s = stepSim(s, NEUTRAL) // the opening tick: spawn wave 1 + the ground population
  const seen = new Set<string>(s.cues.map((c) => c.type))
  if (setup) setup(rig(s))
  for (let i = 0; i < ticks; i++) {
    s = stepSim(s, input(i))
    for (const c of s.cues) seen.add(c.type)
  }
  return seen
}

/**
 * Place a wall of one enemy type across the ship's laser row (a small vertical spread
 * absorbs each sprite's box height) and hold FIRE — the laser sweeps rightward and
 * strikes the wall, so the type's HIT cue fires. The running wave is left populated
 * (no field-clear → no wave respawn to add noise cues).
 */
function fireWall(seed: number, placeAt: (r: Rig, x: number, y: number) => void): Set<string> {
  return collect(seed, 50, () => withInput({ fire: true }), (r) => {
    for (let col = 40; col <= 150; col += 5) {
      for (let row = 116; row <= 122; row += 2) placeAt(r, col << 8, row)
    }
  })
}

describe('df6-1 AC4 — the opening field announces itself', () => {
  it('the first tick emits wave-start (ST1SND) and enemy-appear (APSND)', () => {
    const s = stepSim(createSim(makeRand(3)), NEUTRAL)
    const kinds = s.cues.map((c) => c.type)
    expect(kinds, 'a new field must sound ST1SND').toContain('wave-start')
    expect(kinds, 'each spawned lander materialises with APSND').toContain('enemy-appear')
  })
})

describe('df6-1 AC4 — the ship weapons', () => {
  it('firing a laser emits laser-fire (LASSND) — and a no-fire run never does', () => {
    const firing = collect(3, 5, (i) => withInput({ fire: i === 0 }))
    expect(firing, 'a fired laser must sound LASSND').toContain('laser-fire')
    const quiet = collect(3, 30, () => NEUTRAL)
    expect(quiet, 'a run that never fires must never sound LASSND (the control)').not.toContain('laser-fire')
  })

  it('a smart bomb emits smart-bomb (SBSND) once — a run that never presses it is silent', () => {
    const bombed = collect(3, 3, (i) => withInput({ smartBomb: i === 0 }))
    expect(bombed, 'a smart bomb must sound SBSND').toContain('smart-bomb')
    const none = collect(3, 30, () => NEUTRAL)
    expect(none, 'a run that never smart-bombs must be silent of SBSND (the control)').not.toContain('smart-bomb')
  })

  it('a smart bomb clearing a pod field crosses the replay threshold — extra-man (RPSND)', () => {
    // 15 pods × 1000 = 15,000 points cleared in one sweep — past EXTRA_MAN_EVERY
    // (10,000). A quiet opening run is nowhere near it: the control.
    const seen = collect(3, 3, (i) => withInput({ smartBomb: i === 0 }), (r) => {
      for (let k = 0; k < 15; k++) r._podBank.spawnPod((k * 0x1000) & 0xffff, 120)
    })
    expect(seen, 'crossing 10,000 points must sound RPSND').toContain('extra-man')
    const control = collect(3, 30, () => NEUTRAL)
    expect(control, 'an opening run scores nowhere near 10,000 — no RPSND (the control)').not.toContain('extra-man')
  })
})

describe('df6-1 AC4 — the lander life-cycle cues', () => {
  it('a lander grabbing a humanoid emits lander-pickup (LPKSND) — a non-carrier does not', () => {
    const grab = collect(3, 1, () => NEUTRAL, (r) => {
      const l = r._enemyBank.spawnLander(0x4000)
      if (l) l.carrying = true // the grab moment (LGSND is a dead ROM cue — LPKSND sounds it)
    })
    expect(grab, 'a lander that grabbed a humanoid must sound LPKSND').toContain('lander-pickup')
  })

  it('a live lander fires on its LSHOT cadence — lander-shoot (LSHSND)', () => {
    // The wave-1 landers shoot on the modeled cadence (≤72 ticks each); a short run
    // over the cadence window reaches it.
    const seen = collect(3, 90, () => NEUTRAL)
    expect(seen, 'a live lander must sound LSHSND within its shot cadence').toContain('lander-shoot')
  })

  it('shooting a CARRYING lander drops its passenger — lander-hit (LHSND) AND astro-scream (ASCSND)', () => {
    // A wall of carrying landers on the laser row: each hit sounds LHSND, and because
    // it was carrying (and had not reached the top), its dropped passenger screams.
    const seen = collect(3, 40, () => withInput({ fire: true }), (r) => {
      for (const l of r._enemyBank.landers.slice()) r._enemyBank.killLander(l)
      for (let col = 40; col <= 150; col += 5) {
        const l = r._enemyBank.spawnLander(col << 8)
        if (l) {
          l.carrying = true
          l.reachedTop = false
          l.x = col << 8
          l.y = 118 // the lander sprite's hit row against the ship-row laser
        }
      }
    })
    expect(seen, 'a shot lander must sound LHSND').toContain('lander-hit')
    expect(seen, 'a shot CARRYING lander must scream its dropped passenger (ASCSND)').toContain('astro-scream')
  })
})

describe('df6-1 AC4 — each enemy species sounds its own HIT cue', () => {
  it('a baiter (UFO) hit emits baiter-hit (UFHSND)', () => {
    expect(fireWall(3, (r, x, y) => r._ufoBank.spawnUfo(x, y))).toContain('baiter-hit')
  })
  it('a mutant (schizoid) hit emits mutant-hit (SCHSND)', () => {
    expect(fireWall(3, (r, x, y) => r._mutantBank.spawnMutant(x, y))).toContain('mutant-hit')
  })
  it('a bomber (TIE) hit emits bomber-hit (TIHSND)', () => {
    expect(fireWall(3, (r, x, y) => r._bomberBank.spawnBomber(x, y))).toContain('bomber-hit')
  })
  it('a pod (probe) hit emits pod-hit (PRHSND)', () => {
    expect(fireWall(3, (r, x, y) => r._podBank.spawnPod(x, y))).toContain('pod-hit')
  })
  it('a swarmer hit emits swarmer-hit (SWHSND)', () => {
    expect(fireWall(3, (r, x, y) => r._swarmerBank.spawnSwarmer(x, y))).toContain('swarmer-hit')
  })
})

describe('df6-1 AC4 — each shooting enemy sounds its own SHOOT cue', () => {
  it('mutants fire — mutant-shoot (SSHSND)', () => {
    const seen = collect(3, 60, () => NEUTRAL, (r) => {
      for (let col = 40; col <= 150; col += 15) r._mutantBank.spawnMutant(col << 8, 120)
    })
    expect(seen).toContain('mutant-shoot')
  })
  it('baiters fire — baiter-shoot (USHSND)', () => {
    const seen = collect(3, 200, () => NEUTRAL, (r) => {
      for (let col = 40; col <= 150; col += 20) r._ufoBank.spawnUfo(col << 8, 120)
    })
    expect(seen).toContain('baiter-shoot')
  })
  it('swarmers fire — swarmer-shoot (SWSSND)', () => {
    const seen = collect(3, 200, () => NEUTRAL, (r) => {
      for (let col = 40; col <= 150; col += 20) r._swarmerBank.spawnSwarmer(col << 8, 120)
    })
    expect(seen).toContain('swarmer-shoot')
  })
})

describe('df6-1 AC4 — the humanoid outcome cues', () => {
  it('catching a falling humanoid emits astro-catch (ACSND)', () => {
    const seen = collect(3, 1, () => NEUTRAL, (r) => {
      const h = r._enemyBank.humanoids[0]
      h.state = 'falling'
      h.x = r._rt.player.x // drop it right onto the ship so catchFalling catches it
      h.y = r._rt.player.y
    })
    expect(seen).toContain('astro-catch')
  })

  it('an uncaught faller reaching the ground safely emits astro-land (ALSND)', () => {
    const seen = collect(3, 1, () => NEUTRAL, (r) => {
      const h = r._enemyBank.humanoids[0]
      h.state = 'falling'
      h.x = 200 << 8 // a whole screen from the ship — NOT caught
      h.y = 240 // on the floor (SC-P250 safe landing)
    })
    expect(seen).toContain('astro-land')
  })

  it('hostile fire killing a walking humanoid emits astro-hit (AHSND)', () => {
    const seen = collect(3, 2, () => NEUTRAL, (r) => {
      const h = r._enemyBank.humanoids.find((x) => x.alive && x.state === 'walking')!
      h.x = 200 << 8 // away from the ship, so the shot below hits the WALKER, not the player
      h.y = 180
      r._rt.shots.push({ x: h.x, y: h.y, vx: 0, vy: 0, life: 30 }) // a shot sitting on the walker
    })
    expect(seen).toContain('astro-hit')
  })
})

describe('df6-1 AC4 — player death, and hyperspace which is silent when it survives', () => {
  it('an enemy body on the ship kills the player — player-death (PDSND)', () => {
    const seen = collect(3, 1, () => NEUTRAL, (r) => {
      r._ufoBank.spawnUfo(r._rt.player.x, r._rt.player.y) // a baiter materialised on the ship
    })
    expect(seen).toContain('player-death')
  })

  it('a SURVIVING hyperspace teleports the ship but emits NO cue', () => {
    // A rand masked to [0,192] never trips the death roll (rand > 192), so hyperspace
    // always survives. Keep the field populated (no wave respawn) and push the lander
    // shot timers out, so the ONLY thing that could sound this tick is the power.
    function surviveRand(seed: number): () => number {
      let s = seed >>> 0
      return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0
        return ((s >>> 16) & 0xff) % 193
      }
    }
    let s = createSim(surviveRand(5))
    s = stepSim(s, NEUTRAL)
    const r = rig(s)
    for (const l of r._enemyBank.landers) {
      l.y = 44
      r._rt.landerShootTimers.set(l, 99999)
    }
    s = stepSim(s, withInput({ hyperspace: true }))
    expect(s.cues.map((c) => c.type), 'a surviving hyperspace must emit no cue — the teleport branch sounds nothing').toEqual([])
    // …and it really TELEPORTED: hyperspace lands the ship on one of its two fixed
    // columns ($2000 / $7000), which no ordinary drift ever reaches exactly.
    expect([0x2000, 0x7000], 'the ship did not land on a hyperspace target column — the power did not run').toContain(
      rig(s)._plax16,
    )
  })
})

describe('df6-1 AC4 — Defender ships SILENT this story', () => {
  it('no .wav sample is committed under the plugin (the seam is wired, the audio is not)', () => {
    const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
    const wavs: string[] = []
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules') continue
        const full = join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (entry.name.toLowerCase().endsWith('.wav')) wavs.push(full)
      }
    }
    walk(pluginRoot)
    expect(wavs, `df6-1 ships the seam silent, but found committed .wav files:\n  ${wavs.join('\n  ')}`).toEqual([])
  })
})
