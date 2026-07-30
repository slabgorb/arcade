import { describe, it, expect } from 'vitest'
import { advance, createShowcase, currentGame, markUnavailable } from '../src/core/showcase'
import type { Game } from '../src/core/registry'

// Driven entirely by SYNTHETIC games, never by the real registry — the same
// discipline tests/tiles.test.ts uses. Which real game carries `showcase: true`
// changes as each demo lands, and a test that pins it turns shipping a demo into
// a test edit.
function game(id: string, showcase: boolean): Game {
  return {
    id,
    title: id.toUpperCase(),
    launchUrl: `https://${id}.example.test/`,
    color: '#00eaff',
    controls: ['FIRE — Space'],
    version: '1.0.0',
    showcase,
  }
}

const ALPHA = game('alpha', true)
const BRAVO = game('bravo', true)
const CHARLIE = game('charlie', true)
const OPTED_OUT = game('delta', false)

describe('createShowcase', () => {
  it('keeps only games that opted in, in registry order', () => {
    const s = createShowcase([ALPHA, OPTED_OUT, BRAVO])
    expect(s.order).toEqual(['alpha', 'bravo'])
  })

  it('starts on the first entry', () => {
    expect(currentGame(createShowcase([ALPHA, BRAVO]))).toBe('alpha')
  })

  it('yields null when no game opted in', () => {
    const s = createShowcase([OPTED_OUT])
    expect(s.order).toEqual([])
    expect(currentGame(s)).toBeNull()
  })
})

describe('advance', () => {
  it('moves to the next entry', () => {
    const s = advance(createShowcase([ALPHA, BRAVO]))
    expect(currentGame(s)).toBe('bravo')
  })

  it('wraps at the end', () => {
    const s = advance(advance(createShowcase([ALPHA, BRAVO])))
    expect(currentGame(s)).toBe('alpha')
  })

  it('lands past an entry marked unavailable', () => {
    let s = createShowcase([ALPHA, BRAVO, CHARLIE])
    s = markUnavailable(s, 'bravo')
    expect(currentGame(advance(s))).toBe('charlie')
  })

  // THE case that fails if the skip is implemented in only one of the two
  // functions. Skip in advance() alone strands the cursor on a dead entry and
  // blanks the pane; skip in currentGame() alone shows charlie twice in a row.
  it('never shows the same game twice running when its predecessor is dead', () => {
    let s = createShowcase([ALPHA, BRAVO, CHARLIE])
    s = markUnavailable(s, 'bravo')

    const seen: (string | null)[] = []
    seen.push(currentGame(s))
    s = advance(s)
    seen.push(currentGame(s))
    s = advance(s)
    seen.push(currentGame(s))

    expect(seen).toEqual(['alpha', 'charlie', 'alpha'])
  })

  it('advances a single-entry carousel to itself without spinning', () => {
    const s = advance(createShowcase([ALPHA]))
    expect(currentGame(s)).toBe('alpha')
  })

  // The identity half of the contract above: wrapping onto the only entry left to
  // show must return the SAME object, not a fresh one with an unchanged cursor. The
  // shell tells "held" from "moved on" by object identity alone, so a new object
  // here would read as a real slide change and drive an unwanted rebuild.
  it('returns the same object when a single-entry carousel wraps onto itself', () => {
    const s = createShowcase([ALPHA])
    expect(advance(s)).toBe(s)
  })

  it('returns the same object when it wraps onto the only surviving entry', () => {
    let s = createShowcase([ALPHA, BRAVO])
    s = markUnavailable(s, 'bravo')
    // Still on alpha; advancing wraps past dead bravo and lands back on alpha itself.
    expect(advance(s)).toBe(s)
  })

  it('is a no-op once every entry is unavailable', () => {
    let s = createShowcase([ALPHA, BRAVO])
    s = markUnavailable(s, 'alpha')
    s = markUnavailable(s, 'bravo')
    expect(advance(s)).toBe(s)
    expect(currentGame(s)).toBeNull()
  })

  it('is a no-op on an empty carousel', () => {
    const s = createShowcase([OPTED_OUT])
    expect(advance(s)).toBe(s)
  })
})

describe('markUnavailable', () => {
  it('makes currentGame report the next live entry', () => {
    let s = createShowcase([ALPHA, BRAVO])
    s = markUnavailable(s, 'alpha')
    expect(currentGame(s)).toBe('bravo')
  })

  it('is idempotent — remarking returns the same state object', () => {
    const s = markUnavailable(createShowcase([ALPHA, BRAVO]), 'alpha')
    expect(markUnavailable(s, 'alpha')).toBe(s)
  })

  it('does not mutate the state it was given', () => {
    const before = createShowcase([ALPHA, BRAVO])
    markUnavailable(before, 'alpha')
    expect(before.unavailable.size).toBe(0)
  })
})
