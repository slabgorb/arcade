// Ambient type for Vite's `?raw` imports (file content as a string).
//
// Story jt1-6 — the render source-wiring tests (the tempest tp1-39 / centipede
// cp1-6 idiom, reviewer-blessed) read shell source as TEXT because a node
// vitest env cannot execute the lines that matter: canvas creation, 2D context
// configuration, requestAnimationFrame. Declaring the module here keeps
// `tsc --noEmit` green without pulling node's `fs` types into the browser-pure
// type posture.
declare module '*?raw' {
  const content: string
  export default content
}
