// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

describe('lobby mounts an always-visible volume control', () => {
  it('renders a visible master-volume slider on boot', async () => {
    document.body.innerHTML =
      '<div id="games"></div><div id="showcase"></div>'
    await import('../src/main')
    const input = document.body.querySelector('input[type="range"][aria-label="Master volume"]')
    expect(input).not.toBeNull()
    const container = input!.closest('.arcade-volume') as HTMLElement
    expect(container.hidden).toBe(false)
  })
})
