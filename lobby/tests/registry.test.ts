import { describe, it, expect } from 'vitest'
import { GAMES, getGame, type Game } from '../src/core/registry'

// The registry is the lobby's source of truth for "what games exist on the
// cabinet": the data 7-3's tile grid renders and 7-4's launch will dispatch on.
// These tests pin the shape and the invariants every entry must satisfy, so a
// malformed game (blank title, bad colour, duplicate id) fails loudly here
// rather than silently rendering a broken tile.

const HEX = /^#[0-9a-fA-F]{3,8}$/

describe('GAMES registry', () => {
  it('lists at least one game', () => {
    expect(GAMES.length).toBeGreaterThan(0)
  })

  it('includes tempest, launching at its subdomain', () => {
    const tempest = GAMES.find((g) => g.id === 'tempest')
    expect(tempest).toBeDefined()
    // Tempest is served on its own subdomain (R2 static hosting); the tile
    // must launch there.
    expect(tempest?.launchUrl).toBe('https://tempest.slabgorb.com/')
  })

  it('has unique ids across every entry', () => {
    const ids = GAMES.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every game a non-empty title', () => {
    for (const g of GAMES) {
      expect(g.title.length).toBeGreaterThan(0)
    }
  })

  it('points every launchUrl at an absolute subdomain URL', () => {
    for (const g of GAMES) {
      expect(g.launchUrl.startsWith('https://')).toBe(true)
    }
  })

  it('gives every game a valid hex glow colour', () => {
    for (const g of GAMES) {
      expect(g.color).toMatch(HEX)
    }
  })

  it('gives every game at least one non-empty control hint', () => {
    for (const g of GAMES) {
      expect(g.controls.length).toBeGreaterThan(0)
      for (const line of g.controls) {
        expect(line.length).toBeGreaterThan(0)
      }
    }
  })

  it('gives every game a non-empty version string', () => {
    for (const g of GAMES) {
      expect(g.version.length).toBeGreaterThan(0)
    }
  })

  // Shape only — NOT which games are true. Which game's demo is ready is a
  // product decision that changes as each demo lands; pinning it here would turn
  // "centipede's demo shipped" into a test edit.
  it('gives every game an explicit boolean showcase flag', () => {
    for (const g of GAMES) {
      expect(typeof g.showcase).toBe('boolean')
    }
  })
})

describe('getGame', () => {
  it('returns the matching game by id', () => {
    const g = getGame('tempest')
    expect(g).toBeDefined()
    expect(g?.id).toBe('tempest')
    // Returns the actual registry entry, not a lookalike.
    expect(g).toBe(GAMES.find((x) => x.id === 'tempest'))
  })

  it('returns undefined for an unknown id', () => {
    expect(getGame('does-not-exist')).toBeUndefined()
  })

  it('returns undefined for an empty id rather than a spurious match', () => {
    expect(getGame('')).toBeUndefined()
  })
})

// Compile-time guard: a Game literal must satisfy the full interface. If a
// required field is dropped from the type this stops type-checking, and if the
// field set drifts this test documents the contract the renderer relies on.
describe('Game shape', () => {
  it('requires id, title, launchUrl, color, controls, version, and showcase', () => {
    const sample: Game = {
      id: 'sample',
      title: 'SAMPLE',
      launchUrl: '/sample/',
      color: '#00eaff',
      controls: ['FIRE — Space'],
      version: '1.0.0',
      showcase: false,
    }
    expect(Object.keys(sample).sort()).toEqual([
      'color',
      'controls',
      'id',
      'launchUrl',
      'showcase',
      'title',
      'version',
    ])
  })
})
