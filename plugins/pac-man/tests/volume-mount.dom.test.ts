// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

// jsdom does not implement 2D canvas rendering (the `canvas` npm package is not a
// project dependency), so a bare <canvas> returns null from getContext('2d') and
// mountCanvas's checked guard throws before main.ts gets anywhere near the volume
// wiring this test exercises. main.ts never actually draws a frame during this
// test (no requestAnimationFrame tick is driven synchronously by the import), so
// the stub needs no drawing methods — only enough to satisfy `ctx !== null`.
HTMLCanvasElement.prototype.getContext = ((): unknown => ({})) as typeof HTMLCanvasElement.prototype.getContext

describe('pac-man mounts a pause-gated volume control', () => {
  it('mounts the master-volume slider, hidden until paused', async () => {
    document.body.innerHTML = '<canvas id="game" width="224" height="288"></canvas>'
    await import('../src/main')
    const input = document.body.querySelector('input[type="range"][aria-label="Master volume"]')
    expect(input).not.toBeNull()
    const container = input!.closest('.arcade-volume') as HTMLElement
    // Not yet paused → hidden. (The frame loop flips it once Escape pauses; that
    // interaction is covered by volume-ui's own setVisible test.)
    expect(container.hidden).toBe(true)
  })
})
