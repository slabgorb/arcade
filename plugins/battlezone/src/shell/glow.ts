// src/shell/glow.ts
//
// SH2-8 (epic SH2): the shell's single entry point for the shared neon-glow
// primitive. Mirrors ./font — re-exports @shared/glow (withGlow,
// glowPolyline, GlowStyle) so the wireframe + HUD text stroke through one shared
// set-draw-reset-blur envelope instead of re-hand-writing it. Per-cabinet NUMBERS
// (the phosphor GLOW_GREEN, blur radius, line width) stay in render.ts.
export * from '@shared/glow'
