// @vitest-environment jsdom
//
// tests/highscore.dom.test.ts — the ONE-TIME cross-origin migration (Task 21).
//
// Before the monorepo collapse each game sat on its own subdomain with its own,
// origin-partitioned localStorage. The cabinet now serves everything from one
// origin, so those player tables are unreachable: the key is the same, the
// origin is not. The ADR-0004 summary cookie is scoped to the REGISTRABLE
// DOMAIN, so it — and only it — crosses that boundary. `makeHighScoreStorage`
// seeds same-origin storage from it once, and the publish side is retired.
//
// ── WHY THIS FILE OPTS INTO jsdom, AND WHY IT IS ITS OWN FILE ────────────────
// The `shared` vitest project is `environment: 'node'`. The rest of the
// high-score suite runs there happily because it stubs `document`/`localStorage`
// with hand-rolled fakes. This file cannot: the property under test is that a
// row written by ONE storage instance is read back by ANOTHER, through a REAL
// localStorage and a REAL cookie jar. A fake that both sides share would model
// the round-trip instead of exercising it. So this one file opts into jsdom with
// the docblock above — the idiom lobby/tests/{tiles,showcase-dom,refresh,main}
// already use — rather than adding a second vitest project plus an `exclude`
// rule that has to stay in sync with a filename pattern.
//
// ── THE ASSERTION THAT MATTERS ──────────────────────────────────────────────
// Survival across a RELOAD. A seed-then-read test in a single pass would certify
// a feature that erases itself: seeding into a shape the row guard rejects looks
// perfect on the pass that seeds it (the rows are returned from memory) and
// silently vanishes on the next load — with localStorage now non-empty, so the
// seed never runs again and the scores are gone for good. Every "seeds ..." test
// below therefore has a reload half.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  makeHighScoreStorage,
  makeHighScoreRowGuard,
  isHighScoreRow,
  highScoreKey,
  PUBLISHED_SUMMARY_DEPTH,
  type HighScoreEntryBase,
} from '../highscore'

// ── jsdom does NOT hand us a working `localStorage`, and the failure is silent ──
// vitest's `populateGlobal` copies jsdom's window keys onto globalThis but skips
// any key that already exists there and is not in its own KEYS list
// (`if (k in global) return keysArray.includes(k)`) — and `localStorage` is not in
// that list. Node 25 ships a global `localStorage` of its own, which here is an
// inert `{}` (it warns "`--localstorage-file` was provided without a valid path").
// So the ambient `localStorage` under jsdom has no getItem/setItem at all. The
// module under test would throw on every storage call, swallow it in its own
// fail-soft catch, and report an empty board — which reads exactly like "the seed
// did not run" and would make half this file pass for the wrong reason. Reach past
// the stub to jsdom's real Storage, which vitest does expose as `globalThis.jsdom`.
const jsdomWindow = (globalThis as unknown as { jsdom: { window: Window } }).jsdom.window
vi.stubGlobal('localStorage', jsdomWindow.localStorage)

const TEMPEST_COOKIE = 'arcade-hi-tempest'

/** A fresh tempest storage — the exact call plugins/tempest/src/main.ts makes. */
const tempest = () => makeHighScoreStorage('tempest', makeHighScoreRowGuard('level'), 'level')

/** battlezone's call: the domain-AGNOSTIC base guard and no domain field at all. */
const battlezone = () =>
  makeHighScoreStorage<HighScoreEntryBase>('battlezone', isHighScoreRow, '')

/** Expire every cookie in the jar, so no test inherits another's ladder. */
function clearCookies(): void {
  for (const pair of document.cookie.split(';')) {
    const name = pair.slice(0, pair.indexOf('=')).trim()
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`
  }
}

/** The raw value of a cookie in the jar, or undefined when it is not there. */
function cookieValue(wanted: string): string | undefined {
  for (const pair of document.cookie.split(';')) {
    const eq = pair.indexOf('=')
    if (eq === -1) continue
    if (pair.slice(0, eq).trim() === wanted) return pair.slice(eq + 1).trim()
  }
  return undefined
}

beforeEach(() => {
  localStorage.clear()
  clearCookies()
})

// Guards the guard. Both seams below are ambient globals this file does not
// control; if either were inert, "the seed wrote nothing" and "the seed was never
// reached" would be indistinguishable and the negative tests would pass vacuously.
describe('preconditions — the DOM seams this file leans on are real', () => {
  it('localStorage round-trips, so an empty board means an empty board', () => {
    localStorage.setItem('probe', 'x')
    expect(localStorage.getItem('probe')).toBe('x')
    localStorage.removeItem('probe')
    expect(localStorage.getItem('probe')).toBeNull()
  })

  it('document.cookie round-trips a `name:score` ladder without mangling it', () => {
    // Commas and colons are legal in a cookie VALUE but are the summary's own
    // delimiters; a jar that split or dropped them would silently starve the seed.
    document.cookie = 'arcade-hi-probe=JPX:149830,AAA:98000; Path=/'
    expect(cookieValue('arcade-hi-probe')).toBe('JPX:149830,AAA:98000')
  })
})

describe('one-time migration from the cross-origin cookie', () => {
  it('seeds an empty same-origin table from the cookie ladder', () => {
    document.cookie = 'arcade-hi-tempest=JPX:149830,AAA:98000; Path=/'

    expect(tempest().load()).toEqual([
      { name: 'JPX', score: 149830, level: null },
      { name: 'AAA', score: 98000, level: null },
    ])
  })

  it('SURVIVES a reload — the seeded rows pass the guard on the next load', () => {
    document.cookie = 'arcade-hi-tempest=JPX:149830; Path=/'
    tempest().load()

    // A brand-new storage instance, as if the page had been reloaded. This is the
    // assertion that matters: seeding into a shape the guard rejects would look
    // correct in a single pass and silently erase itself here.
    const reloaded = tempest()
    expect(reloaded.load()).toEqual([{ name: 'JPX', score: 149830, level: null }])
  })

  it('does not seed when same-origin storage already has rows', () => {
    localStorage.setItem(
      highScoreKey('tempest'),
      JSON.stringify([{ name: 'ZZZ', score: 10, level: 1 }]),
    )
    document.cookie = 'arcade-hi-tempest=JPX:149830; Path=/'

    expect(tempest().load()).toEqual([{ name: 'ZZZ', score: 10, level: 1 }])
  })

  it('seeds nothing from a legacy bare-number cookie', () => {
    // Pre-lb2-8 format: a score with no name. Inventing initials for it would be
    // the cabinet lying, so the game honestly starts empty.
    document.cookie = 'arcade-hi-tempest=149830; Path=/'

    expect(tempest().load()).toEqual([])
  })

  it('seeds nothing when there is no cookie at all', () => {
    expect(tempest().load()).toEqual([])
  })

  it('leaves storage untouched when it seeds nothing, so a later cookie still seeds', () => {
    // The seed must not write an empty table as a "migration done" marker: that
    // would make localStorage non-empty and permanently disarm the seed. A player
    // who opens the game before their cookie is readable would lose their board.
    expect(tempest().load()).toEqual([])
    expect(localStorage.getItem(highScoreKey('tempest'))).toBeNull()

    document.cookie = 'arcade-hi-tempest=JPX:149830; Path=/'
    expect(tempest().load()).toEqual([{ name: 'JPX', score: 149830, level: null }])
  })

  it('seeds at most the published depth — rows six through ten are genuinely lost', () => {
    // The cookie carries PUBLISHED_SUMMARY_DEPTH rows, so a 10-deep board comes
    // across five deep. That is the documented cost of the bridge, not a bug, and
    // it is pinned here so a widened cookie cannot quietly change the promise.
    document.cookie =
      'arcade-hi-tempest=R1:700,R2:600,R3:500,R4:400,R5:300,R6:200,R7:100; Path=/'

    const seeded = tempest().load()
    expect(PUBLISHED_SUMMARY_DEPTH).toBe(5)
    expect(seeded).toHaveLength(PUBLISHED_SUMMARY_DEPTH)
    expect(seeded.map((r) => r.score)).toEqual([700, 600, 500, 400, 300])
    expect(tempest().load(), 'and all five survive the reload').toEqual(seeded)
  })

  it('seeds a DESCENDING table even from an out-of-order cookie', () => {
    // The seed writes the rows in the order it receives them, and the table logic downstream
    // is not order-agnostic: `qualifiesForHighScore` states a sorted-descending precondition
    // and reads the LAST row as the lowest. A cookie is untrusted and can be hand-edited out
    // of order, so if the decode ever stopped sorting, a migrated player's very next score
    // would be ranked against the wrong row — silently, and only for migrated boards.
    document.cookie = 'arcade-hi-tempest=LOW:100,TOP:99999,MID:5000; Path=/'

    const seeded = tempest().load()
    expect(seeded.map((r) => r.score)).toEqual([99999, 5000, 100])

    const stored: Array<{ score: number }> = JSON.parse(
      localStorage.getItem(highScoreKey('tempest')) ?? '[]',
    )
    expect(stored.map((r) => r.score), 'and it is PERSISTED in that order').toEqual([
      99999, 5000, 100,
    ])
  })

  it('writes NOTHING when the game’s own guard would reject a migrated row', () => {
    // The seed BUILDS rows rather than merely validating them, so it is the one place
    // that can persist something the game will not read back. A guard that rejects a null
    // domain — a game that has not taken the Task 20 widening — must get an empty board,
    // not a table that looks right on this pass and evaporates on the next. Writing the
    // rows anyway would ALSO disarm the seed forever, because storage would no longer be
    // empty: one bad pass, scores gone for good.
    type Strict = HighScoreEntryBase & { level: number }
    const strictGuard = (value: unknown): value is Strict =>
      isHighScoreRow(value) && typeof (value as { level?: unknown }).level === 'number'

    document.cookie = 'arcade-hi-tempest=JPX:149830; Path=/'
    const strict = makeHighScoreStorage<Strict>('tempest', strictGuard, 'level')

    expect(strict.load()).toEqual([])
    expect(
      localStorage.getItem(highScoreKey('tempest')),
      'nothing was persisted, so the cookie can still seed a game that accepts null',
    ).toBeNull()
  })

  it('never runs twice: a board the player has since cleared stays cleared', () => {
    document.cookie = 'arcade-hi-tempest=JPX:149830; Path=/'
    expect(tempest().load()).toHaveLength(1)

    // The player resets the board. `save([])` writes an EMPTY table, which is not
    // the same as no table — the seed must read that as "already migrated" and
    // stay out of the way, or the cookie would resurrect the ladder forever.
    tempest().save([])

    expect(tempest().load()).toEqual([])
  })
})

describe('a game with no domain field at all (battlezone) migrates too', () => {
  it('seeds rows carrying name + score only — no fabricated field name', () => {
    document.cookie = 'arcade-hi-battlezone=BZZ:61000; Path=/'

    expect(battlezone().load()).toEqual([{ name: 'BZZ', score: 61000 }])
  })

  it('SURVIVES a reload, and stores no empty-string key', () => {
    document.cookie = 'arcade-hi-battlezone=BZZ:61000; Path=/'
    battlezone().load()

    expect(battlezone().load()).toEqual([{ name: 'BZZ', score: 61000 }])
    const raw = localStorage.getItem(highScoreKey('battlezone')) ?? '[]'
    const stored: unknown[] = JSON.parse(raw)
    expect(Object.keys(stored[0] as object).sort()).toEqual(['name', 'score'])
  })
})

describe('the publish side is retired — the cookie is read-only legacy', () => {
  it('save() no longer writes the summary cookie', () => {
    tempest().save([{ name: 'AAA', score: 9000, level: 3 }])

    expect(cookieValue(TEMPEST_COOKIE)).toBeUndefined()
  })

  it('load() no longer republishes the summary cookie', () => {
    localStorage.setItem(
      highScoreKey('tempest'),
      JSON.stringify([{ name: 'AAA', score: 9000, level: 3 }]),
    )

    tempest().load()

    expect(cookieValue(TEMPEST_COOKIE)).toBeUndefined()
  })

  it('load() does not CLEAR the legacy cookie — it is the migration source', () => {
    // The retired publish used to clear the cookie whenever the table was empty
    // (the "zombie ladder" fix). Keeping that would destroy the one thing that
    // crosses the origin boundary: a player whose game loads before their table
    // is readable would have their pre-migration board wiped by the very load
    // that was supposed to rescue it.
    document.cookie = 'arcade-hi-tempest=JPX:149830; Path=/'
    localStorage.setItem(highScoreKey('tempest'), '{ not valid json')

    expect(tempest().load(), 'a corrupt table reads as an empty board').toEqual([])
    expect(cookieValue(TEMPEST_COOKIE)).toBe('JPX:149830')
  })
})
