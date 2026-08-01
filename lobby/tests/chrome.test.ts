import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
// Shared with showcase-dom.test.ts. Note this file runs in the `node` environment and
// builds its documents from the imported JSDOM above, so its nodes carry no global
// `Element` to be an instance of — the helper keys on `nodeType` for exactly that
// reason. See its header.
import { accessibleName } from './accessible-name'

// The cabinet furniture: the vector grid floor and its mirrored ceiling, the four
// L-shaped bezel brackets, the marquee, the curvature vignette, and the footer.
//
// This is STATIC markup — it lives in index.html, not in a module — so it is tested
// by parsing index.html itself rather than by importing anything. We build a real
// JSDOM document from the file so the <style> cascade is live and getComputedStyle
// tells the truth about pointer-events.
//
// The single behavioural claim worth defending here is that NONE of this beautiful
// junk gets between the player and the games. A full-bleed decorative layer with a
// z-index and no `pointer-events: none` is the classic way to build a screen where
// every tile is unclickable — and it looks perfect in a screenshot.
//
// MIGRATION RECORD (Task 15) — 0 cases and 0 assertions removed, and no rewrites. This
// file imports nothing from the registry: it parses index.html and asserts on the STATIC
// shell, whose one registry reference (line ~129, "the tiles are built from the registry
// at runtime") is prose that stayed true when the registry moved to src/host/. The
// `#games` container it checks is empty by design in the markup, so nothing here depends
// on which games exist or where they link.

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')

// Load index.html and inline any LOCAL stylesheet it links, so the cascade is
// complete whether the CSS stays in a <style> block or moves out to a .css file.
// Remote hrefs (the Google Fonts link) are left alone — the test must not hit the
// network, and a missing webfont changes nothing we assert here.
function loadIndex(): Document {
  let html = readFileSync(join(ROOT, 'index.html'), 'utf8')

  html = html.replace(
    /<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi,
    (tag) => {
      const href = /href=["']([^"']+)["']/i.exec(tag)?.[1]
      if (!href || /^(https?:)?\/\//i.test(href)) return tag // remote — leave it
      const file = join(ROOT, href.replace(/^\//, ''))
      return existsSync(file) ? `<style>${readFileSync(file, 'utf8')}</style>` : tag
    },
  )

  // Scripts are never executed: this asserts the static shell only. The tile grid
  // is main.ts's job and is covered by tiles.test.ts / main.test.ts.
  return new JSDOM(html).window.document
}

let doc: Document

beforeAll(() => {
  doc = loadIndex()
})


describe('cabinet furniture is present', () => {
  it('has the receding vector grid floor and its mirrored ceiling', () => {
    expect(doc.querySelector('[data-chrome="grid-floor"]')).not.toBeNull()
    expect(doc.querySelector('[data-chrome="grid-ceiling"]')).not.toBeNull()
  })

  it('frames the screen with four L-shaped bezel brackets', () => {
    expect(doc.querySelectorAll('[data-chrome="bezel"]').length).toBe(4)
  })

  it('has the screen-curvature vignette (the design ships curvature on)', () => {
    expect(doc.querySelector('[data-chrome="vignette"]')).not.toBeNull()
  })

  // The design's own prop defaults are authoritative: curvature true, scanlines
  // false. Scanlines are therefore NOT shipped — the designer turned them off.
  it('does not ship the scanline overlay, which the design defaults to off', () => {
    expect(doc.querySelector('[data-chrome="scanlines"]')).toBeNull()
  })
})

describe('cabinet furniture never gets between the player and the games', () => {
  it('marks every decorative layer pointer-events: none', () => {
    const chrome = [...doc.querySelectorAll('[data-chrome]')]
    expect(chrome.length).toBeGreaterThan(0)

    for (const el of chrome) {
      const pointerEvents = doc.defaultView!.getComputedStyle(el).pointerEvents
      expect(
        pointerEvents,
        `[data-chrome="${el.getAttribute('data-chrome')}"] would swallow clicks`,
      ).toBe('none')
    }
  })

  it('keeps every decorative layer out of the tab order', () => {
    const chrome = [...doc.querySelectorAll('[data-chrome]')]
    // Without this guard the loop below iterates nothing and the test passes while
    // asserting precisely zero things.
    expect(chrome.length).toBeGreaterThan(0)

    for (const el of chrome) {
      expect(el.getAttribute('tabindex')).not.toBe('0')
      // Decoration must not contain anything natively focusable either.
      expect(el.querySelector('a, button, input, select, textarea')).toBeNull()
    }
  })
})

describe('marquee', () => {
  // The design spells the wordmark one letter per <span> (S·L·A·B·C·A·D·E) to
  // spread it across the marquee. That is a purely visual trick, and it leaves
  // the h1 announcing "SLABCADE" — or, worse, spelling it out letter by letter.
  // However it is built, the heading must expose the real name.
  it('exposes the wordmark as the accessible name SLABCADE', () => {
    const h1 = doc.querySelector('h1')
    expect(h1).not.toBeNull()
    expect(accessibleName(h1 as Element)).toBe('SLABCADE')
  })
})

describe('footer', () => {
  it('carries the fan-tribute disclaimer', () => {
    const text = (doc.body.textContent ?? '').replace(/\s+/g, ' ').toUpperCase()
    expect(text).toContain('NOT AFFILIATED')
  })
})

describe('the grid the tiles render into survives the restyle', () => {
  it('still has the #games container main.ts builds into', () => {
    const games = doc.getElementById('games')
    expect(games).not.toBeNull()
    // Empty in the static shell — the tiles are built from the registry at runtime,
    // never hardcoded into index.html.
    expect(games?.querySelector('a')).toBeNull()
  })
})

// The showcase pane is CONTENT, not cabinet furniture. If it ever picks up
// `.chrome` — or anything else that sets pointer-events: none — its launch link
// goes dead while the page still looks perfect in a screenshot. That is the exact
// bug this file exists to prevent, and the pane is the newest way to reintroduce it.
describe('showcase pane', () => {
  it('is present as an empty section for main.ts to fill', () => {
    const doc = loadIndex()
    const pane = doc.getElementById('showcase')
    expect(pane).not.toBeNull()
    expect(pane?.children.length).toBe(0)
  })

  it('is not decoration — it accepts the pointer', () => {
    const doc = loadIndex()
    const pane = doc.getElementById('showcase') as HTMLElement
    expect(pane.classList.contains('chrome')).toBe(false)
    expect(doc.defaultView?.getComputedStyle(pane).pointerEvents).not.toBe('none')
  })

  // Focus order is wordmark -> showcase link -> tiles, and it is guaranteed
  // structurally rather than by tabindex: the pane lives inside .content, in
  // document order between the marquee and the grid. A pane moved out to a fixed
  // layer would still LOOK right and would land in the wrong place in the tab order.
  it('sits inside the content column, between the marquee and the games', () => {
    const doc = loadIndex()
    const pane = doc.getElementById('showcase') as HTMLElement
    const games = doc.getElementById('games') as HTMLElement
    const marquee = doc.querySelector('.marquee') as HTMLElement

    expect(pane.closest('.content')).not.toBeNull()
    // DOCUMENT_POSITION_FOLLOWING === 4: the argument comes after the subject.
    expect(marquee.compareDocumentPosition(pane) & 4).toBe(4)
    expect(pane.compareDocumentPosition(games) & 4).toBe(4)
  })
})

// CSS guards for rules the shell module depends on structurally, not just
// cosmetically. This file never executes src/shell/showcase.ts, so these
// synthesize the elements it would produce directly into a loadIndex()
// document and check the cascade behaves the way the shell assumes.
describe('showcase pane CSS contracts', () => {
  it('keeps the launch link accessible name present but visually clipped', () => {
    // Mirrors slideFor()'s <span class="visually-hidden">Play …</span>. Delete
    // .visually-hidden and "Play TEMPEST" renders as literal text over the frame
    // — the exact bug the spec calls out. display:none would hide the text AND
    // destroy the anchor's only accessible name, so both halves must hold.
    const doc = loadIndex()
    const span = doc.createElement('span')
    span.className = 'visually-hidden'
    span.textContent = 'Play TEMPEST'
    doc.body.append(span)

    const style = doc.defaultView!.getComputedStyle(span)
    expect(style.width).toBe('1px')
    expect(style.display).not.toBe('none')
  })

  it('fades the frame in only once it has loaded', () => {
    // Mirrors slideFor()'s <iframe class="showcase-frame">, before and after
    // frame.addEventListener('load', …) adds is-loaded. Delete the .is-loaded rule
    // and the frame stays at opacity 0 forever — a glowing bordered box around an
    // invisible game — and every other test in this suite stays green, because
    // nothing else asserts opacity actually changes.
    const doc = loadIndex()
    const pane = doc.getElementById('showcase') as HTMLElement
    const frame = doc.createElement('iframe')
    frame.className = 'showcase-frame'
    pane.append(frame)

    expect(doc.defaultView?.getComputedStyle(frame).opacity).toBe('0')
    frame.classList.add('is-loaded')
    expect(doc.defaultView?.getComputedStyle(frame).opacity).toBe('1')
  })

  it('keeps the launch overlay above the frame so it catches the pointer, not the game', () => {
    // Mirrors slideFor()'s <a class="showcase-launch">. Equal-layer positioned
    // elements hit-test in tree order, so without z-index:2 the iframe — painted
    // after the anchor in the DOM — would swallow every click.
    const doc = loadIndex()
    const pane = doc.getElementById('showcase') as HTMLElement
    const link = doc.createElement('a')
    link.className = 'showcase-launch'
    pane.append(link)

    expect(doc.defaultView?.getComputedStyle(link).zIndex).toBe('2')
  })

  it('hides the pane while it is an empty bordered box — no game has mounted yet', () => {
    // Before main.ts runs, or forever if the bundle fails to boot, the static
    // shell would otherwise ship exactly the "indistinguishable from a game that
    // happens to be dark" box shell/showcase.ts's own header comment warns
    // against. :empty is what keeps that off-screen.
    const doc = loadIndex()
    const pane = doc.getElementById('showcase') as HTMLElement
    expect(pane.children.length).toBe(0)
    expect(doc.defaultView?.getComputedStyle(pane).display).toBe('none')
  })

  it('reappears the instant anything mounts into it', () => {
    const doc = loadIndex()
    const pane = doc.getElementById('showcase') as HTMLElement
    pane.append(doc.createElement('span'))
    expect(doc.defaultView?.getComputedStyle(pane).display).not.toBe('none')
  })
})
