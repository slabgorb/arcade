import { describe, it, expect } from 'vitest'
import { GAMES, LISTED_GAMES, getGame, gamePath } from '@host/registry'

// What the lobby reads out of the registry.
//
// The subject moved in Task 15. This used to test `lobby/src/core/registry.ts`, a
// hand-maintained list of six games with a hardcoded absolute `launchUrl` and a
// hardcoded `version` apiece, which nothing generated and nothing checked. That file is
// deleted; the list is now GENERATED into `src/host/registry.ts` from each
// `plugins/<id>/plugin.ts`, and `src/host/registry.test.ts` re-derives it from the
// manifests on every run.
//
// So the invariants below are deliberately narrower than that file's. They are the
// LOBBY's stake in the data: every field `buildTile` actually paints, asserted over
// exactly the list the lobby renders (`LISTED_GAMES`) rather than over all seven
// manifests. A blank title or a dead colour here is a blank or invisible tile.
//
// MIGRATION RECORD (Task 15) — 1 case / 1 assertion removed from this file:
//
//   - `Game shape > requires id, title, launchUrl, color, controls, version, and
//     showcase` — REMOVED. It pinned the key set of the `Game` interface, which no
//     longer exists. Its surviving intent (the manifest field set is pinned, and a
//     dropped field fails loudly) is already owned upstream by
//     `src/host/contract.test.ts` → "declares exactly the fields GameMeta declares, in
//     the same order", which reads KNOWN_KEYS out of the contract's source text. It is
//     not re-created here; re-stating it would be a second copy of a rule that already
//     has an owner.
//
// Two assertions were REWRITTEN rather than removed — see the cases marked `[rewritten]`.
// Nothing else changed but the import.

const HEX = /^#[0-9a-fA-F]{3,8}$/

describe('the games the lobby lists', () => {
  it('lists at least one game', () => {
    expect(LISTED_GAMES.length).toBeGreaterThan(0)
  })

  // [rewritten] Was: "includes tempest, launching at its subdomain", asserting
  // `tempest.launchUrl === 'https://tempest.slabgorb.com/'`. The subdomain half is false
  // by design now — the cabinet is one origin — but the claim underneath it is not:
  // tempest is on the cabinet and its tile has to go somewhere specific.
  it('includes tempest, launching at its own path on the single origin', () => {
    const tempest = LISTED_GAMES.find((g) => g.id === 'tempest')
    expect(tempest).toBeDefined()
    expect(gamePath('tempest')).toBe('/tempest/')
  })

  it('has unique ids across every entry', () => {
    // Across ALL seven, not just the listed six: `refreshScores` finds a tile by its
    // `data-game` id, so two games sharing one would cross-write each other's score.
    const ids = GAMES.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every game a non-empty title', () => {
    for (const g of LISTED_GAMES) {
      expect(g.title.length).toBeGreaterThan(0)
    }
  })

  // [rewritten] Was: "points every launchUrl at an absolute subdomain URL", asserting
  // `g.launchUrl.startsWith('https://')`. `launchUrl` is gone and the direction of the
  // claim is now inverted — but "every listed game has a well-formed launch target" is
  // exactly as load-bearing as it was, so it is restated against the derived path. A
  // scheme or a host reappearing here means someone put an absolute URL back.
  it('launches every listed game at a root-relative /<id>/ path, never an absolute URL', () => {
    for (const g of LISTED_GAMES) {
      expect(gamePath(g.id)).toBe(`/${g.id}/`)
      expect(gamePath(g.id)).not.toMatch(/^[a-z]+:|^\/\//)
      expect(gamePath(g.id)).not.toContain('slabgorb.com')
    }
  })

  it('gives every game a valid hex glow colour', () => {
    for (const g of LISTED_GAMES) {
      expect(g.color).toMatch(HEX)
    }
  })

  it('gives every game at least one non-empty control hint', () => {
    for (const g of LISTED_GAMES) {
      expect(g.controls.length).toBeGreaterThan(0)
      for (const line of g.controls) {
        expect(line.length).toBeGreaterThan(0)
      }
    }
  })

  it('gives every game a non-empty version string', () => {
    for (const g of LISTED_GAMES) {
      expect(g.version.length).toBeGreaterThan(0)
    }
  })

  // Shape only — NOT which games are true. Which game's demo is ready is a
  // product decision that changes as each demo lands; pinning it here would turn
  // "centipede's demo shipped" into a test edit.
  it('gives every game an explicit boolean showcase flag', () => {
    for (const g of LISTED_GAMES) {
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
