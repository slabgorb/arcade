// Ambient type for Vite's `?raw` imports (file content as a string). The render /
// main-loop source-wiring tests (cp1-6, the tempest tp1-39 idiom) read shell source
// as TEXT via `?raw` to pin the wiring lines that a node vitest env cannot execute
// (canvas creation, requestAnimationFrame). Declaring the module here keeps `tsc
// --noEmit` (the lint script) green without pulling node's `fs` types into the
// browser-pure type posture.
declare module '*?raw' {
  const content: string
  export default content
}
