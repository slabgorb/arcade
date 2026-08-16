// tests/enemies/roster.test.ts
//
// Story ml7-2 — the enemy roster aggregate: one step + one shot-resolve over the
// whole cast. Per-creature behaviour is covered in each module's own test; this
// pins the aggregation (init all vacant, a shot kills the first creature it hits,
// a step threads them without throwing).

import { describe, it, expect } from 'vitest'
import { createRng } from '@shared/rng'
import { initRoster, stepRoster, shootRoster } from '../../src/core/enemies/roster'
import type { EnemyView } from '../../src/core/enemies/contract'
import { PLYFLD_SIZE } from '../../src/core/conway'
import type { SpiderSlot } from '../../src/core/spider'

const view = (over?: Partial<EnemyView>): EnemyView => ({
  frame: 0,
  score2: 0,
  player: { h: 0x80, v: 0x08, alive: true },
  centin: 1,
  hard: false,
  score1: 0,
  dead: 0,
  slow: 0,
  mushTop: 0,
  mush: 0,
  beetles: 0,
  rng: createRng(1),
  field: new Uint8Array(PLYFLD_SIZE),
  ...over,
})

// A genuinely-live spider per isSpider(): SPIDER_COLOR + pic in [SPIDER_PIC,0x1c).
const liveSpider = (h: number, v: number): SpiderSlot => ({
  color: 0xb9,
  pic: 0x14,
  v,
  h,
  dv: 0,
  dh: 0,
  oldDh: 0,
  count2: 0,
  pts: 0,
})

describe('ml7-2 enemies/roster — aggregate', () => {
  it('initRoster builds all seven creature slot arrays, none live', () => {
    const r = initRoster()
    for (const key of ['spiders', 'bees', 'beetles', 'dragonflies', 'mosquitoes', 'earwigs', 'inchworms'] as const) {
      expect(Array.isArray(r[key])).toBe(true)
    }
    const anyLive = [...r.spiders, ...r.bees, ...r.beetles, ...r.dragonflies, ...r.mosquitoes, ...r.earwigs, ...r.inchworms].some(
      (s) => (s as { color: number }).color !== 0,
    )
    expect(anyLive).toBe(false)
  })

  it('shootRoster kills the first creature the shot overlaps and reports points', () => {
    const r = { ...initRoster(), spiders: [liveSpider(0x80, 0x40)] }
    const res = shootRoster(r, { h: 0x80, v: 0x40 })
    expect(res.killed).toBe(true)
    expect(res.scoreDelta).toBeGreaterThan(0)
    expect(res.roster.spiders[0].color).toBe(0) // that spider vacated
  })

  it('shootRoster reports no kill when the shot misses everything', () => {
    const res = shootRoster(initRoster(), { h: 0x10, v: 0x10 })
    expect(res.killed).toBe(false)
    expect(res.scoreDelta).toBe(0)
  })

  it('stepRoster threads all creatures and returns a playerHit flag', () => {
    const res = stepRoster(initRoster(), view())
    expect(typeof res.playerHit).toBe('boolean')
    for (const key of ['spiders', 'bees', 'beetles', 'dragonflies', 'mosquitoes', 'earwigs', 'inchworms'] as const) {
      expect(Array.isArray(res.roster[key])).toBe(true)
    }
  })

  it('a live creature standing on the player yields playerHit', () => {
    const r = { ...initRoster(), spiders: [liveSpider(0x80, 0x08)] }
    // freeze the spider under the player: score2 high enough that it does not
    // wander off in one frame is not guaranteed, so assert the module-level truth
    // via a direct step with the player at the spider.
    const res = stepRoster(r, view({ player: { h: 0x80, v: 0x08, alive: true } }))
    expect(res.playerHit).toBe(true)
  })
})
