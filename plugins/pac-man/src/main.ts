// src/main.ts
//
// Story pm1-1 (scaffold) — minimal boot only: mount the canvas and paint it
// black. No sim, no render, no input — those land in later pm1 tasks (maze
// and render in Task 3, wired thereafter). This exists so the cabinet has a
// real served route and a non-blank-error page before any game logic lands.

const canvas = document.querySelector<HTMLCanvasElement>('#game')
if (!canvas) throw new Error('index.html must host a <canvas id="game">')
const ctx = canvas.getContext('2d')
if (!ctx) throw new Error('2d canvas context unavailable')

const resize = (): void => {
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}
window.addEventListener('resize', resize)
resize()
