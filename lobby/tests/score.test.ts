import { describe, it, expect, afterEach, vi } from 'vitest'
import { formatScoreLine } from '../src/core/score'

// The tile's score line, as pure data → string. Pure (core), so it is tested
// without a DOM.
//
// The design (Arcade Lobby.dc.html) renders this line as `HI · JPX · 149,830` —
// rank-holder name included. The lobby CANNOT honour that: getTopScore() returns a
// number or null, and no player NAME is readable across origins (ADR-0004's cookie
// carries a single bare number). So the line carries only what the lobby can
// actually prove — the score, or nothing:
//
//   149830 → 'HI · 149,830'      null → 'NO SCORE'
//
// A fabricated name or a stand-in zero would be the lobby lying about a player's
// record, which is the one thing this line must never do.

describe('formatScoreLine', () => {
  it('renders a readable score in the design HI-dot-SCORE form', () => {
    expect(formatScoreLine(149830)).toBe('HI · 149,830')
  })

  it('says NO SCORE when there is no readable score', () => {
    expect(formatScoreLine(null)).toBe('NO SCORE')
  })

  // The falsy-zero trap (typescript rule #4: `x || fallback` where x can be 0).
  // A real stored score of 0 is DATA — the player scored nothing, but they played.
  // `if (!top) return 'NO SCORE'` collapses it into "no score at all", which is a
  // different claim. null and 0 must not be conflated.
  it('treats a genuine score of 0 as a score, not as an absent one', () => {
    expect(formatScoreLine(0)).toBe('HI · 0')
    expect(formatScoreLine(0)).not.toBe('NO SCORE')
  })

  it('groups thousands, and leaves sub-thousand scores ungrouped', () => {
    expect(formatScoreLine(999)).toBe('HI · 999')
    expect(formatScoreLine(1000)).toBe('HI · 1,000')
    expect(formatScoreLine(1234567)).toBe('HI · 1,234,567')
  })

  // The cabinet must read the same in Berlin as in Boston. An implementation that
  // reaches for `n.toLocaleString()` / `new Intl.NumberFormat()` with NO locale
  // argument inherits the ambient one, and a German visitor sees `149.830` —
  // passing on a US CI runner while being wrong in the wild.
  //
  // We force the ambient default to de-DE. An implementation that PINS its locale
  // (or groups by hand) is unaffected and still emits commas; one that leaves the
  // locale to chance now emits dots and fails here rather than in production.
  describe('with a non-US ambient locale', () => {
    afterEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllGlobals()
    })

    it('still groups with commas (the locale is pinned, not inherited)', () => {
      const realToLocaleString = Number.prototype.toLocaleString
      vi.spyOn(Number.prototype, 'toLocaleString').mockImplementation(function (
        this: number,
        locales?: Intl.LocalesArgument,
        options?: Intl.NumberFormatOptions,
      ) {
        return realToLocaleString.call(this, locales ?? 'de-DE', options)
      })

      const RealNumberFormat = Intl.NumberFormat
      vi.stubGlobal('Intl', {
        ...Intl,
        NumberFormat: (locales?: Intl.LocalesArgument, options?: Intl.NumberFormatOptions) =>
          new RealNumberFormat(locales ?? 'de-DE', options),
      })

      expect(formatScoreLine(149830)).toBe('HI · 149,830')
    })
  })
})
