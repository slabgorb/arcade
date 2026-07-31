// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { LOAD_TIMEOUT_MS, SLIDE_MS, mountShowcase } from '../src/shell/showcase'
import type { GameMeta } from '@host/contract'
import { gamePath } from '@host/registry'

// Synthetic games only. jsdom does not fetch iframe subresources, so a frame here
// never loads on its own — which is exactly right: the success path is a dispatched
// `load` event and the timeout path is the honest default. The timeout is the branch
// most likely to be wrong, so it gets the most attention.
//
// MIGRATION RECORD (Task 15) — 0 cases and 0 assertions removed. Two rewrites:
//
//   1. The synthetic factory builds a `GameMeta`; `launchUrl` is gone, and each game's
//      frame/link target is now the derived `gamePath(id)`.
//   2. Every `frame()?.src` read became `frameSrc()` — see below. `.src` is a reflected
//      URL property: jsdom RESOLVES it against the document, so a `/alpha/` attribute
//      reads back as 'http://localhost:3000/alpha/'. Comparing the resolved form would
//      pass just as well for an absolute URL that happened to resolve the same way,
//      which is the very thing this migration is trying to make impossible. The
//      attribute is what the code wrote, so the attribute is what is asserted.
function game(id: string, showcase: boolean): GameMeta {
  return {
    id,
    title: id.toUpperCase(),
    year: 1980,
    color: '#00eaff',
    controls: ['FIRE — Space'],
    order: 1,
    listed: true,
    showcase,
    version: '1.0.0',
  }
}

const ALPHA = game('alpha', true)
const BRAVO = game('bravo', true)
const OPTED_OUT = game('delta', false)

/** Where a game's slide points: the same path the tiles use. */
const pathTo = (g: GameMeta): string => gamePath(g.id)

let section: HTMLElement

function frame(): HTMLIFrameElement | null {
  return section.querySelector('iframe')
}

/** The frame's `src` ATTRIBUTE — the literal string the shell wrote, unresolved. */
function frameSrc(): string | null {
  return frame()?.getAttribute('src') ?? null
}

// jsdom 29 does not implement matchMedia, so the shell must tolerate its absence
// AND honour it when present. This stubs a specific answer for the reduce query.
function stubReducedMotion(reduce: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

beforeEach(() => {
  vi.useFakeTimers()
  document.body.innerHTML = '<section id="showcase" class="showcase"></section>'
  section = document.getElementById('showcase') as HTMLElement
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('showcase pane', () => {
  it('mounts exactly one iframe, on the first opted-in game', () => {
    mountShowcase(section, [ALPHA, OPTED_OUT, BRAVO])
    expect(section.querySelectorAll('iframe')).toHaveLength(1)
    expect(frameSrc()).toBe(pathTo(ALPHA))
  })

  // The pane must be structurally incapable of making noise. The autoplay
  // permission's default allowlist is `self` — which used to do the work for us,
  // because the frames were cross-origin and could never inherit it. Task 15 put
  // every game on the SAME origin, so `self` now matches and the frame WOULD
  // inherit autoplay by default: this attribute went from belt-and-braces to the
  // only thing holding the line, and this assertion with it. (allow="" does not
  // delegate any feature at all — it is not a blanket "denies everything" property
  // for features whose default allowlist is `*`. Autoplay is the one this pane
  // structurally depends on, so that's the claim under test here.)
  it('keeps the frame from ever inheriting autoplay, and out of the tab order', () => {
    mountShowcase(section, [ALPHA])
    const f = frame() as HTMLIFrameElement
    expect(f.getAttribute('allow')).toBe('')
    expect(f.getAttribute('aria-hidden')).toBe('true')
    expect(f.getAttribute('tabindex')).toBe('-1')
    // The accessible name belongs to the launch link laid over the frame, not the
    // frame itself — a `title` here would be redundant decoration on an aria-hidden
    // element.
    expect(f.hasAttribute('title')).toBe(false)
  })

  it('lays a real link over the frame, named for the game', () => {
    mountShowcase(section, [ALPHA])
    const link = section.querySelector('a.showcase-launch') as HTMLAnchorElement
    expect(link).not.toBeNull()
    expect(link.getAttribute('href')).toBe(pathTo(ALPHA))
    expect(link.textContent).toContain('Play ALPHA')
  })

  it('captions the pane with the game on screen', () => {
    mountShowcase(section, [ALPHA])
    const caption = section.querySelector('.showcase-caption')
    expect(caption?.textContent).toBe('NOW SHOWING · ALPHA')
    // Redundant with the launch link's own "Play ALPHA" accessible name — hidden so
    // a screen reader doesn't announce the same slide twice.
    expect(caption?.getAttribute('aria-hidden')).toBe('true')
  })

  it('takes the glow colour from the registry entry', () => {
    mountShowcase(section, [{ ...ALPHA, color: '#7d3cff' }])
    expect(section.style.getPropertyValue('--glow')).toBe('#7d3cff')
  })

  it('rotates to the next game after the dwell, still with exactly one iframe', () => {
    mountShowcase(section, [ALPHA, BRAVO])
    const before = frame()
    vi.advanceTimersByTime(SLIDE_MS)
    expect(section.querySelectorAll('iframe')).toHaveLength(1)
    // Not just the same src on the same node — an actual new element. A `frame.src =
    // ...` reassignment would satisfy every other assertion here too.
    expect(frame()).not.toBe(before)
    expect(frameSrc()).toBe(pathTo(BRAVO))
    const link = section.querySelector('a.showcase-launch') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe(pathTo(BRAVO))
  })

  it('marks the frame loaded when it actually loads', () => {
    mountShowcase(section, [ALPHA])
    const f = frame() as HTMLIFrameElement
    expect(f.classList.contains('is-loaded')).toBe(false)
    f.dispatchEvent(new Event('load'))
    expect(f.classList.contains('is-loaded')).toBe(true)
  })

  // Regression test for the reload loop: a one-live-game carousel wraps onto its
  // only entry every dwell. If that were treated as a normal slide change, the frame
  // would be torn down and rebuilt from scratch every SLIDE_MS — visibly restarting a
  // working game, and losing `is-loaded`. It should instead hold the exact same
  // frame and leave `is-loaded` alone.
  it('holds the frame across the dwell when it is the only live game, without reloading it', () => {
    mountShowcase(section, [ALPHA])
    const f = frame() as HTMLIFrameElement
    f.dispatchEvent(new Event('load'))
    vi.advanceTimersByTime(SLIDE_MS)
    expect(frame()).toBe(f)
    expect(f.classList.contains('is-loaded')).toBe(true)
  })

  // A rotation forced early by a failure must cancel the abandoned slide's own
  // dwell timer, not leave it ticking alongside bravo's own pair — a dead game
  // must never shorten its replacement's time on screen. Advancing by exactly one
  // LOAD_TIMEOUT_MS is deliberate: alpha's SLIDE_MS dwell has not elapsed yet, so
  // it is still armed at the moment of rotation if `clearTimers()` failed to
  // cancel it. (A dropped `clearTimers()` in `show()` measures 3 timers here —
  // bravo's own pair plus alpha's leaked dwell — instead of 2.)
  it('cancels the abandoned dwell timer when a failure forces an early rotation', () => {
    mountShowcase(section, [ALPHA, BRAVO])
    vi.advanceTimersByTime(LOAD_TIMEOUT_MS)
    expect(frameSrc()).toBe(pathTo(BRAVO))
    // Exactly bravo's own pair — its load timeout and its dwell. Not alpha's
    // abandoned dwell timer too.
    expect(vi.getTimerCount()).toBe(2)
  })

  // `show()` replaces the anchor wholesale on every slide change, which would
  // otherwise yank focus off a visitor mid-Tab and reset it to <body> — their next
  // Tab would restart from the top of the page instead of continuing into the
  // tiles. A focused launch link must hold the pane still instead.
  it('holds the current slide instead of rotating while the launch link has focus', () => {
    mountShowcase(section, [ALPHA, BRAVO])
    const f = frame() as HTMLIFrameElement
    f.dispatchEvent(new Event('load'))
    const link = section.querySelector('a.showcase-launch') as HTMLAnchorElement
    link.focus()
    expect(document.activeElement).toBe(link)

    vi.advanceTimersByTime(SLIDE_MS)

    // Not just "a link with the same href" — the SAME node, still attached, still
    // focused. A rebuild-and-refocus would satisfy a weaker assertion here too.
    expect(frame()).toBe(f)
    expect(section.contains(link)).toBe(true)
    expect(document.activeElement).toBe(link)
  })

  // The other half: holding is not the same as stopping. Once the visitor tabs (or
  // clicks) away, the dwell timer that was re-armed while focused fires normally
  // and the carousel picks back up. (A BFCache return restores focus to the link
  // too, so in that case the carousel sits still until the visitor tabs away again
  // on their own — a benign degrade, not a bug to chase.)
  it('resumes rotating the moment focus moves off the launch link', () => {
    mountShowcase(section, [ALPHA, BRAVO])
    ;(frame() as HTMLIFrameElement).dispatchEvent(new Event('load'))
    const link = section.querySelector('a.showcase-launch') as HTMLAnchorElement
    link.focus()
    vi.advanceTimersByTime(SLIDE_MS) // held — covered by the case above
    const before = frame()

    link.blur()
    vi.advanceTimersByTime(SLIDE_MS)

    expect(frame()).not.toBe(before)
    expect(frameSrc()).toBe(pathTo(BRAVO))
  })
})

describe('showcase failure model', () => {
  it('gives up on a frame that never loads and moves on', () => {
    mountShowcase(section, [ALPHA, BRAVO])
    vi.advanceTimersByTime(LOAD_TIMEOUT_MS)
    expect(frameSrc()).toBe(pathTo(BRAVO))
  })

  it('does not return to a game that failed', () => {
    mountShowcase(section, [ALPHA, BRAVO])
    vi.advanceTimersByTime(LOAD_TIMEOUT_MS) // alpha written off -> bravo
    ;(frame() as HTMLIFrameElement).dispatchEvent(new Event('load'))
    vi.advanceTimersByTime(SLIDE_MS) // bravo's dwell expires; alpha is dead
    expect(frameSrc()).toBe(pathTo(BRAVO))
  })

  it('a loaded frame is not written off when the load timeout would have fired', () => {
    mountShowcase(section, [ALPHA, BRAVO])
    ;(frame() as HTMLIFrameElement).dispatchEvent(new Event('load'))
    vi.advanceTimersByTime(LOAD_TIMEOUT_MS)
    expect(frameSrc()).toBe(pathTo(ALPHA))
  })

  // The whole point of the design. Not a black box, not an empty bordered
  // rectangle — gone, so the lobby looks exactly like it did before.
  it('removes the section entirely once every game has failed', () => {
    mountShowcase(section, [ALPHA, BRAVO])
    vi.advanceTimersByTime(LOAD_TIMEOUT_MS)
    vi.advanceTimersByTime(LOAD_TIMEOUT_MS)
    expect(document.getElementById('showcase')).toBeNull()
  })

  it('removes the section when no game opted in', () => {
    mountShowcase(section, [OPTED_OUT])
    expect(document.getElementById('showcase')).toBeNull()
  })

  it('stops all timers once retired', () => {
    mountShowcase(section, [ALPHA])
    vi.advanceTimersByTime(LOAD_TIMEOUT_MS)
    expect(document.getElementById('showcase')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('reduced motion', () => {
  it('mounts no frame and starts no rotation', () => {
    stubReducedMotion(true)
    mountShowcase(section, [ALPHA, BRAVO])
    expect(frame()).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('still names the game and offers a way in', () => {
    stubReducedMotion(true)
    mountShowcase(section, [ALPHA])
    // Plain title, not the live slide's "NOW SHOWING · …" — nothing is showing yet,
    // this is a static card next to a SHOW DEMO button.
    expect(section.querySelector('.showcase-caption')?.textContent).toBe('ALPHA')
    const reveal = section.querySelector('button.showcase-reveal') as HTMLButtonElement
    expect(reveal).not.toBeNull()
    expect(reveal.type).toBe('button')
  })

  // `show()` checks `game === undefined` before `!revealed`, so retirement already
  // beats the static card today — but only because of that ordering. A future
  // reorder would silently render a "SHOW DEMO" card for a game that isn't there,
  // and nothing here would fail without this case.
  it('retires instead of showing a static card when nobody opted in', () => {
    stubReducedMotion(true)
    mountShowcase(section, [OPTED_OUT])
    expect(document.getElementById('showcase')).toBeNull()
  })

  // The choice belongs to the person who set the preference, not to us.
  it('mounts the frame and starts rotating once the visitor asks for it', () => {
    stubReducedMotion(true)
    mountShowcase(section, [ALPHA, BRAVO])
    ;(section.querySelector('button.showcase-reveal') as HTMLButtonElement).click()

    expect(frameSrc()).toBe(pathTo(ALPHA))
    ;(frame() as HTMLIFrameElement).dispatchEvent(new Event('load'))
    vi.advanceTimersByTime(SLIDE_MS)
    expect(frameSrc()).toBe(pathTo(BRAVO))
  })

  it('runs normally when the visitor has not asked for reduced motion', () => {
    stubReducedMotion(false)
    mountShowcase(section, [ALPHA])
    expect(frameSrc()).toBe(pathTo(ALPHA))
  })
})
