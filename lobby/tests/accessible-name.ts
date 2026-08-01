// lobby/tests/accessible-name.ts
//
// One definition of "what would a screen reader call this?", for the whole lobby
// suite. It exists because there were briefly two: `chrome.test.ts` had a version
// that returned `aria-label ?? textContent`, and `showcase-dom.test.ts` grew a second
// that also skipped `aria-hidden` children. Same name, same signature, different
// answers — and the axis they disagreed on (aria-hidden) is exactly the property the
// showcase's reveal button is built around. Two disagreeing definitions of the thing
// under test is worse than none.
//
// Two details are load-bearing, and both were found by getting them wrong first:
//
// 1. **`aria-hidden` hides the node AND its whole subtree, at any depth.** So this
//    recurses instead of reading `.textContent`, which would walk straight back into a
//    hidden subtree and report text no assistive technology will ever announce.
//    Concretely: burying the game's title inside an `aria-hidden` span nested in a
//    non-hidden wrapper makes a real browser compute the reveal button's name as just
//    "SHOW DEMO" — the game name gone. A shallow, direct-children-only check calls that
//    healthy.
//
// 2. **Node kind is tested with `nodeType`, never `instanceof Element`.** The two
//    consumers do not share a realm: `showcase-dom.test.ts` runs under
//    `@vitest-environment jsdom` and has the globals, while `chrome.test.ts` runs in the
//    `node` environment and builds its documents from an imported `JSDOM`. There is no
//    global `Element` to compare against in the second case, and even where there is,
//    nodes from another realm are not instances of it. `nodeType` is a plain property
//    and answers the same in both.
//
// This is a TEST helper and deliberately not the full accname algorithm — no
// `aria-labelledby`, no `<label for>`, no alt/title fallbacks, no CSS `display`
// awareness. It covers the shapes this suite actually builds; anything else should
// extend it here rather than grow a third copy.

const ELEMENT_NODE = 1

function isElement(node: Node): node is Element {
  return node.nodeType === ELEMENT_NODE
}

/** Collapse runs of whitespace the way name computation does, so a name broken across
 *  source lines compares equal to the one a reader would say out loud. */
function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * The accessible name a browser would compute for `el`: an `aria-label` REPLACES the
 * content entirely — that replacement is the whole hazard WCAG 2.5.3 Label in Name
 * names — and otherwise the name is the element's content with every `aria-hidden`
 * subtree left out.
 */
export function accessibleName(el: Element): string {
  const label = el.getAttribute('aria-label')
  if (label !== null) return collapse(label)

  const parts: string[] = []
  for (const node of el.childNodes) {
    if (isElement(node)) {
      if (node.getAttribute('aria-hidden') === 'true') continue
      const inner = accessibleName(node)
      if (inner !== '') parts.push(inner)
    } else {
      const text = collapse(node.textContent ?? '')
      if (text !== '') parts.push(text)
    }
  }
  return parts.join(' ')
}
