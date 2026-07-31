// src/shell/showcase.ts
//
// The showcase pane: one live game, framed, cycling. Shell, not core — it owns the
// document and the clock. Which game is on screen is core/showcase.ts's decision.
//
// Three things here are load-bearing and easy to destroy by accident:
//
// 1. **Exactly one iframe, ever.** Each slide REPLACES the frame element rather than
//    reassigning its src: that guarantees a clean `load` event with no stale-src race,
//    and it makes "is there a second game sim running?" answerable by counting nodes.
//    A warm second frame would be a second 60 Hz sim on the same main thread, which is
//    the cost that disqualified the per-tile layout in the first place.
//
// 2. **allow="" is a safety property, not a tidiness one, and the origin collapse made
//    it MORE load-bearing, not less.** The autoplay permission's default allowlist is
//    `self` — which used to mean "a cross-origin frame never inherits it", i.e. the
//    subdomains could not have made noise even without this attribute. Every game is now
//    framed from the SAME origin, so `self` matches and the frame would inherit autoplay
//    by default. The empty `allow` is now the only thing keeping the carousel
//    structurally incapable of making noise — no muting logic, no cooperation required
//    from six separate games. Do not delete it as redundant; it stopped being redundant
//    the moment the cabinet became one origin.
//
// 3. **Total failure REMOVES the pane.** It does not hide it and it does not sit on a
//    black rectangle. An empty bordered box is indistinguishable from a game that
//    happens to be dark, which is precisely the silent degrade this feature exists to
//    stop being fooled by.
//
// Known limit, stated rather than papered over: `load` fires for an error page too, so
// a game serving a broken build looks healthy from here. This USED to be undetectable in
// principle — the frames were cross-origin and same-origin policy hid everything inside
// them. Since the origin collapse the parent could in fact read the framed document, so
// the limit is now a choice rather than a wall: liveness is still checked out of band by
// `just check-showcase` (see docs/ops/hosting.md), because a real HTTP status from
// outside the page beats a DOM heuristic from inside it.

import type { GameMeta } from '@host/contract'
import { gamePath } from '@host/registry'
import {
  advance,
  createShowcase,
  currentGame,
  markUnavailable,
  type ShowcaseState,
} from '../core/showcase'

/** How long one game holds the pane. Fast rotation is worse than none — a demo
 *  needs room to become interesting. */
export const SLIDE_MS = 20_000

/** How long to wait for a frame before writing that game off. */
export const LOAD_TIMEOUT_MS = 8_000

/** Whether the visitor has asked the OS to stop motion. Guarded on the function's
 *  existence because jsdom does not implement matchMedia — and a test environment
 *  without it must read as "no preference", not throw. */
function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** The pane's contents for one game: the frame, the launch overlay, the caption. */
function slideFor(game: GameMeta): Node[] {
  // Both the frame and the link below take the SAME derived path. They used to read the
  // same hand-maintained `launchUrl` twice; deriving it twice would reintroduce the same
  // pair-that-must-agree, so it is computed once here.
  const href = gamePath(game.id)

  // No `title` on the frame: it is aria-hidden decoration, and the accessible name
  // that matters belongs to the link laid over it.
  const frame = document.createElement('iframe')
  frame.className = 'showcase-frame'
  frame.src = href
  frame.setAttribute('allow', '')
  frame.setAttribute('aria-hidden', 'true')
  frame.setAttribute('tabindex', '-1')

  // A real anchor, for the same reason tiles are: click, ⌘-click, middle-click and
  // Tab+Enter all work with no JavaScript. It doubles as the click shield, so the
  // pointer never reaches the game and nobody half-plays Tempest through the pane.
  const launch = document.createElement('a')
  launch.className = 'showcase-launch'
  launch.href = href
  const name = document.createElement('span')
  name.className = 'visually-hidden'
  name.textContent = `Play ${game.title}`
  launch.append(name)

  const caption = document.createElement('span')
  caption.className = 'showcase-caption'
  caption.textContent = `NOW SHOWING · ${game.title}`
  // Redundant with the launch link's own accessible name ("Play TEMPEST"): without
  // this, a screen reader announces both "NOW SHOWING · TEMPEST" AND "Play TEMPEST"
  // for what is, to assistive tech, a single control.
  caption.setAttribute('aria-hidden', 'true')

  return [frame, launch, caption]
}

/** The pane's contents when motion is unwelcome: the game named, and a way in. */
function staticCardFor(game: GameMeta, onReveal: () => void): Node[] {
  const caption = document.createElement('span')
  caption.className = 'showcase-caption'
  // Plain title, not the live slide's "NOW SHOWING · …" — nothing is showing here,
  // it's a static card next to a SHOW DEMO button, and the design (§6) only asks
  // for the game's title in its glow colour.
  caption.textContent = game.title

  const reveal = document.createElement('button')
  reveal.className = 'showcase-reveal'
  reveal.type = 'button'
  reveal.append(document.createTextNode('SHOW DEMO '))
  // aria-hidden so "▸" isn't announced as "black right-pointing small triangle" —
  // the button's accessible name is just its text content, "SHOW DEMO".
  const arrow = document.createElement('span')
  arrow.setAttribute('aria-hidden', 'true')
  arrow.textContent = '▸'
  reveal.append(arrow)
  reveal.addEventListener('click', onReveal)

  return [caption, reveal]
}

/**
 * Fill `section` with the carousel and start it. Returns nothing: the pane owns its
 * own lifecycle, and retires itself (removing `section`) when there is nothing left
 * to show.
 */
export function mountShowcase(section: HTMLElement, games: readonly GameMeta[]): void {
  const byId = new Map(games.map((g) => [g.id, g]))
  let state: ShowcaseState = createShowcase(games)
  let slideTimer: ReturnType<typeof setTimeout> | undefined
  let loadTimer: ReturnType<typeof setTimeout> | undefined
  let revealed = !prefersReducedMotion()

  function clearTimers(): void {
    if (slideTimer !== undefined) clearTimeout(slideTimer)
    if (loadTimer !== undefined) clearTimeout(loadTimer)
    slideTimer = undefined
    loadTimer = undefined
  }

  function retire(): void {
    clearTimers()
    section.remove()
  }

  function next(): void {
    // `show()` replaces the anchor wholesale on every slide change — including one
    // forced early by a load failure — which would otherwise yank focus off a
    // visitor mid-Tab and reset it to <body>, restarting their tab order from the
    // top of the page. Holding here instead of advancing is WCAG 2.2.2's "pause
    // moving content" in effect: rearm the same dwell and check again next time.
    // (A BFCache return restores focus to the link too, so the carousel sits
    // still until the visitor tabs away on their own — a benign degrade, not a
    // bug to "fix" by clearing focus on restore.)
    if (section.contains(document.activeElement)) {
      slideTimer = setTimeout(next, SLIDE_MS)
      return
    }

    const before = state
    state = advance(state)
    // `advance` returns the same object both when it wrapped onto the only still-live
    // entry (hold the frame, just re-arm the dwell) AND when every entry is now
    // unavailable (must retire) — object identity alone cannot tell those apart, since
    // scanFrom returns -1 in the second case with no index to compare against. The
    // extra `currentGame(state) !== null` check is what distinguishes "still showing
    // something" from "nothing left", so a fully-dead carousel still falls through to
    // show() -> retire() instead of re-arming a dwell timer forever.
    if (state === before && currentGame(state) !== null) {
      slideTimer = setTimeout(next, SLIDE_MS)
      return
    }
    show()
  }

  function show(): void {
    const id = currentGame(state)
    const game = id === null ? undefined : byId.get(id)
    if (game === undefined) {
      retire()
      return
    }

    if (!revealed) {
      section.style.setProperty('--glow', game.color)
      section.replaceChildren(
        ...staticCardFor(game, () => {
          revealed = true
          show()
        }),
      )
      return
    }

    clearTimers()
    section.style.setProperty('--glow', game.color)
    section.replaceChildren(...slideFor(game))

    const frame = section.querySelector('iframe') as HTMLIFrameElement

    // Silence for LOAD_TIMEOUT_MS is the only failure signal available from outside a
    // cross-origin frame. The dwell restarts on every slide change, including one
    // forced early by a failure, so a dead game never shortens its replacement.
    const timeout = setTimeout(() => {
      loadTimer = undefined
      state = markUnavailable(state, game.id)
      next()
    }, LOAD_TIMEOUT_MS)
    loadTimer = timeout

    // Closes over `timeout`, not the shared `loadTimer` slot: a stale frame's `load`
    // arriving after its slide was replaced must only ever clear ITS OWN timeout,
    // never whatever the current slide has since armed.
    frame.addEventListener('load', () => {
      clearTimeout(timeout)
      if (loadTimer === timeout) loadTimer = undefined
      frame.classList.add('is-loaded')
    })

    slideTimer = setTimeout(next, SLIDE_MS)
  }

  show()
}
