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
// 2. **allow="autoplay 'none'" is a safety property, not a tidiness one, and it has to
//    NAME the feature.** What keeps the carousel structurally incapable of making noise
//    is a denial written out in full — no muting logic, no cooperation required from six
//    separate games.
//
//    This frame carried `allow=""` for most of its life, on the reasoning that autoplay's
//    default allowlist is `self` and a cross-origin frame therefore never inherits it.
//    The first half was doing all the work: the games lived on their own subdomains, so
//    they were denied BY ORIGIN, and the attribute contributed nothing. Task 15 put every
//    game on the SAME origin, `self` started matching, and that protection evaporated.
//
//    An empty `allow` does NOT replace it. `allow=""` delegates no feature at all, so
//    every feature falls back to its default allowlist — which for autoplay is now a
//    match. Measured in Chrome 150, reading `document.featurePolicy.allowsFeature(
//    'autoplay')` INSIDE the frame: `allow=""` → true; attribute absent → true (byte for
//    byte the same outcome); `allow="autoplay 'none'"` → false. Only the explicit denial
//    denies anything, which is why the string below is the one under test.
//
// 3. **Total failure REMOVES the pane** — as soon as it is safe to. It does not hide it
//    and it does not sit on a black rectangle. An empty bordered box is
//    indistinguishable from a game that happens to be dark, which is precisely the
//    silent degrade this feature exists to stop being fooled by.
//
//    The exception, and it is deliberate: while the pane owns focus, `next()` HOLDS
//    rather than advances (the WCAG note down there has the reasoning), and retirement
//    IN THAT CASE — every game failed while the pane was up — goes through `next()`.
//    (It is not the only route out: mounting with nobody opted in retires straight from
//    `show()` and never enters `next()` at all.) So a carousel whose games have all
//    failed stays on screen until the visitor tabs away, then retires on the next
//    dwell. Removing a section out from under a focused link would drop focus to
//    <body> mid-Tab, which is the worse of the two failures, and the pane self-heals
//    — this is a DELAY in retirement, not a leak of one. Do not "fix" it by retiring
//    unconditionally.
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
  // NOT `allow=''` — that delegates nothing and leaves autoplay on its default `self`
  // allowlist, which a same-origin frame matches. The feature has to be named to be
  // denied. See point 2 in the header for the measurement.
  frame.setAttribute('allow', "autoplay 'none'")
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
  // And NO `aria-hidden`, deliberately — the asymmetry with `slideFor`'s caption is the
  // point, not an oversight. There the caption duplicates the launch link's "Play
  // TEMPEST" and is hidden to stop one control announcing twice; here there is no link
  // to duplicate. This title is the card's VISIBLE label, and hiding it would leave
  // text on the screen with no counterpart in the accessibility tree — the sighted
  // visitor and the listening one would be looking at different cards. (The button
  // below carries the title too, inside its accessible name; that is a second route to
  // the same fact, not a reason to silence the one on screen.) Pinned in
  // showcase-dom.test.ts.

  const reveal = document.createElement('button')
  reveal.className = 'showcase-reveal'
  reveal.type = 'button'
  reveal.append(document.createTextNode('SHOW DEMO '))
  // The arrow is decoration, hidden so it is not announced as "black right-pointing
  // small triangle" — and since this button's accessible name IS its content (there is
  // deliberately no `aria-label`; see below), hiding the glyph is also what keeps it
  // out of the name. Both halves are pinned in showcase-dom.test.ts; collapsing this
  // back to one `textContent = 'SHOW DEMO ▸'` assignment is the regression.
  const arrow = document.createElement('span')
  arrow.setAttribute('aria-hidden', 'true')
  arrow.textContent = '▸'
  reveal.append(arrow)
  // This card emits NO launch anchor — unlike a live slide, where the overlaid link
  // carries "Play TEMPEST". So the caption above is the only thing naming the game,
  // and a visitor who tabs straight here never reaches it: the bare text content
  // announces "SHOW DEMO" for a control that could show any of six games.
  //
  // The title therefore goes ON the control — as a visually-hidden span, the same way
  // `slideFor` names its launch link above, and specifically NOT as an `aria-label`.
  // An aria-label REPLACES the content as the accessible name, so the button would
  // answer to "Show TEMPEST demo" while reading SHOW DEMO on screen, and a speech-input
  // user saying "click show demo" would get nothing: Voice Control and Dragon match the
  // accessible name, not the pixels. That is WCAG 2.5.3 Label in Name, Level A — an
  // accessibility fix that breaks a different assistive technology. Appending composes
  // instead: the name reads "SHOW DEMO — TEMPEST" and still CONTAINS the visible label.
  const named = document.createElement('span')
  named.className = 'visually-hidden'
  named.textContent = `— ${game.title}`
  reveal.append(named)
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

  /** Arm the dwell, cancelling whatever was in the slot first. All three arming sites
   *  go through here, which is the point: assigning over a live handle orphans a timer
   *  that still calls `next`, and the carousel then ticks about twice per dwell. One
   *  site provably did that (the focus-hold, entered from the load-timeout callback
   *  while `show()`'s dwell was still ticking); a second is safe only because of an
   *  invariant that lives in core/showcase.ts, where nothing at the call site can see
   *  it. Cancelling unconditionally makes the distinction stop mattering — and where
   *  the handle has already fired, `clearTimeout` is a no-op. */
  function armSlideTimer(): void {
    if (slideTimer !== undefined) clearTimeout(slideTimer)
    slideTimer = setTimeout(next, SLIDE_MS)
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
      // Re-arm the same dwell and check again next time. The cancel inside
      // `armSlideTimer` is load-bearing at THIS site: entered from the LOAD-TIMEOUT
      // callback the slot is still holding a live dwell — `show()` armed it, and only
      // the load timer has fired — so a bare assignment would orphan a timer that
      // still calls `next`, and the hold would tick about twice per dwell for as long
      // as focus stays. Nothing accumulated (each pass armed exactly one), which is
      // why this was a bookkeeping defect rather than a leak, and why only a direct
      // timer count catches it.
      armSlideTimer()
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
      armSlideTimer()
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

    // `clearTimers()` above already emptied the slot, so the cancel inside is a no-op
    // here — it costs nothing and removes the need for anyone to re-derive that.
    armSlideTimer()
  }

  show()
}
