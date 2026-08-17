// tests/df4-5-pods.test.ts
//
// Story df4-5 — RED phase (O'Brien / TEA). The POD (the PROBE process, DEFB6.SRC:85) as a
// pure, scheduler-driven reducer in src/core/probes.ts. The PROBE is the arcade POD: a
// drifting blob that BURSTS INTO SWARMERS when shot — it is the POD precisely because
// PRBKIL releases mini-swarmers (DEFB6.SRC:118-122 `LDA #6 / JSR RMAX / JSR MMSW`). This
// is the correction to the story's AC1 guess of "PROBE → Probe" (not even an arcade name).
//
// Re-derived from reference/original-source/defender/DEFB6.SRC:
//   *PROBE START  :85   PRBST — spawns probes with a random drift velocity (APVCT)
//   PRBKIL        :118  the kill handler: LDA #6 / JSR RMAX / JSR MMSW — release 1..6 swarmers,
//                       then DEC PRBCNT (:123). The swarmers materialize at the pod's position.
//
// SCOPE FENCE: IN — spawn as a scheduler process, and the SIGNATURE behavior: killPod
//   releases 1..POD_SWARMER_MAX swarmers through the injected sink, at the pod's position,
//   then removes the pod. OUT — the pod's random drift path (wave RAM, df5), the swarmer
//   ENTITY (core/swarmers.ts owns it; the pod calls a release SINK), live sim wiring
//   (synthetic only this story), the probe-vs-laser collision (df4-1's COLIDE, later).
//
// The swarmer-release count is RMAX(#6) → 1..6 (MMSW loops A≥1 times), so a killed pod ALWAYS
// bursts into at least one swarmer. `rand` (the RMAX count) and the release sink are INJECTED.

import { describe, it, expect } from 'vitest'
import { createScheduler } from '../src/core/scheduler.js'
import { loadPod, type PodBank, type PodDeps } from './helpers/df4-5-enemies-contract.js'

/** One recorded swarmer release from the injected MMSW sink. */
interface Release {
  x: number
  y: number
}

interface Rig {
  sched: ReturnType<typeof createScheduler>
  bank: PodBank
  released: Release[]
}

/** Spin up a fresh scheduler + pod bank with an injectable rand + a recording release sink. */
function makeBank(rand: () => number = () => 0xff): Rig {
  const sched = createScheduler()
  const released: Release[] = []
  const deps: PodDeps = { rand, releaseSwarmer: (x, y) => released.push({ x, y }) }
  const bank = loadPod().createPodBank(sched, deps)
  return { sched, bank, released }
}

describe('df4-5 — the POD (PROBE) exists as a cited process (DEFB6.SRC:85)', () => {
  it('exposes POD_SWARMER_MAX at its byte-verified magnitude (LDA #6, DEFB6.SRC:119)', () => {
    expect(loadPod().POD_SWARMER_MAX, 'LDA #6 fed to RMAX before MMSW').toBe(6)
  })

  it('a spawned pod starts alive at its coords and is a scheduler process', () => {
    const { sched, bank } = makeBank()
    const before = sched.processes.length
    const pod = bank.spawnPod(2000, 100)
    expect(pod, 'spawnPod(finite coords) must return a live pod').not.toBeNull()
    expect(pod?.x).toBe(2000)
    expect(pod?.y).toBe(100)
    expect(pod?.alive).toBe(true)
    expect(bank.pods.length).toBe(1)
    expect(sched.processes.length, 'the pod runs as a process on the shared run-list').toBeGreaterThan(before)
  })

  it('a non-finite spawn coordinate is rejected and leaks no process (lang-review #21)', () => {
    const { sched, bank } = makeBank()
    const before = sched.processes.length
    expect(bank.spawnPod(Number.NaN, 100), 'spawnPod(NaN, y) spawns nothing').toBeNull()
    expect(bank.spawnPod(2000, Number.NEGATIVE_INFINITY), 'spawnPod(x, -Infinity) spawns nothing').toBeNull()
    expect(bank.pods.length, 'no pod was created from a bad coord').toBe(0)
    expect(sched.processes.length, 'a rejected spawn leaks no scheduler process').toBe(before)
  })
})

describe('df4-5 — the POD BURSTS into swarmers when killed: the identity proof (PRBKIL, DEFB6.SRC:118-122)', () => {
  it('killPod releases between 1 and POD_SWARMER_MAX swarmers (this is why it is the Pod)', () => {
    const { sched, bank, released } = makeBank(() => 0xff)
    const pod = bank.spawnPod(2000, 100)
    expect(pod, 'precondition: spawn returns a live pod').not.toBeNull()
    if (!pod) return
    bank.killPod(pod)
    sched.stepTick()
    // The arcade Pod bursts into swarmers — RMAX(#6) → 1..6 (MMSW loops A≥1 times, :146-172).
    expect(
      released.length,
      'a killed pod must release at least one swarmer — a pod that bursts into nothing is not ' +
        'the arcade Pod (JSR MMSW, DEFB6.SRC:122); this is the PROBE→Pod identity',
    ).toBeGreaterThanOrEqual(1)
    expect(
      released.length,
      'a killed pod releases at most POD_SWARMER_MAX swarmers (LDA #6 / RMAX, DEFB6.SRC:119)',
    ).toBeLessThanOrEqual(6)
  })

  it('the released swarmers materialize at the pod position (MMSW LEAY ,X — the pod is the center)', () => {
    const { sched, bank, released } = makeBank(() => 0xff)
    const pod = bank.spawnPod(2000, 100)
    if (!pod) throw new Error('precondition: pod spawned')
    bank.killPod(pod)
    sched.stepTick()
    expect(released.length, 'precondition: at least one swarmer released').toBeGreaterThanOrEqual(1)
    for (const r of released) {
      expect({ x: r.x, y: r.y }, 'each released swarmer starts at the killed pod position').toEqual({
        x: 2000,
        y: 100,
      })
    }
  })

  it('killPod removes the pod from the live bank (DEC PRBCNT, DEFB6.SRC:123)', () => {
    const { sched, bank } = makeBank()
    const pod = bank.spawnPod(2000, 100)
    if (!pod) throw new Error('precondition: pod spawned')
    expect(bank.pods.length).toBe(1)
    bank.killPod(pod)
    sched.stepTick()
    expect(bank.pods.some((p) => p === pod), 'a killed pod leaves the live bank').toBe(false)
  })

  it('killing an already-dead pod releases no further swarmers (idempotent — no double burst)', () => {
    const { sched, bank, released } = makeBank(() => 0xff)
    const pod = bank.spawnPod(2000, 100)
    if (!pod) throw new Error('precondition: pod spawned')
    bank.killPod(pod)
    sched.stepTick()
    const afterFirst = released.length
    expect(afterFirst, 'precondition: the first kill released swarmers').toBeGreaterThanOrEqual(1)
    bank.killPod(pod) // a second hit on the same (now dead) handle
    sched.stepTick()
    expect(
      released.length,
      'a pod bursts exactly once — a second kill on a dead handle must release nothing more',
    ).toBe(afterFirst)
  })
})
