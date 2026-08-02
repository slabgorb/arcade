// src/shell/glow.ts
//
// The tempest-local glow kernel (story tp1-40, THE GLOW TAX) — now a DE-GLOWED
// kernel. Two rewrites have passed through here:
//
//   1. tp1-40 replaced every live canvas shadow-blur (a per-primitive GPU
//      Gaussian pass at device resolution, ~100+ per gameplay frame, which
//      saturated the GPU process and dropped production to 8-34 fps) with
//      layered unblurred halo passes and a cached additive dot sprite.
//   2. This change removes the halo ITSELF, by owner request (2026-08-02,
//      out of band): tempest's vectors are now drawn crisp — one stroke pass
//      per line, one hard-edged fill per dot, no bloom of any kind. The
//      phosphor afterglow went with it (render.ts PHOSPHOR_DECAY = 0).
//
// The module keeps its seams rather than being deleted, because they are what
// makes the glow restorable in one place:
//
//   • glowStrokePasses — still the single door every stroke's pass list comes
//     from, and still takes a `blur` radius from the ~30 call sites in
//     render.ts. It now IGNORES that radius and returns the crisp core alone.
//     Restoring the neon look is a change to this function and nothing else.
//   • blitGlowDot — still the one door every dot goes through. Now always the
//     plain colour-carrying arc fill that was previously the node-only
//     fallback, on every platform. It MUST keep setting fillStyle to the dot
//     colour: the tp1-15/tp1-30 fidelity suites identify dots by the fillStyle
//     recorded at fill().
//   • RENDER_DPR_CAP / cappedDpr — the scene-buffer resolution cap, untouched.
//     Still load-bearing for the phosphor scene buffers, where the production
//     trace showed the GPU saturating at dpr 1.75.
//
// Still deliberately NOT @shared/glow: that envelope's whole contract is
// "set the shadow blur, draw, reset" — the tax tp1-40 removed. Importing it
// here would smuggle live blur past tp1-40.glow-tax-sources.test.ts.

/**
 * Ceiling for the dpr the SCENE (phosphor) buffers render at. The main canvas
 * keeps the display's full dpr for HUD/text crispness; the vector scene — where
 * all the per-pixel compositing work lives — is capped here.
 *
 * 1.5 cuts the user-trace case (dpr 1.75) to ~73% of the pixels and a Retina 2.0
 * to ~56%, while staying visually sharp under the phosphor's own softness.
 * AC-4: this default is provisional until the verify phase's DevTools trace
 * confirms GPU headroom; tune HERE and nowhere else.
 */
export const RENDER_DPR_CAP = 1.5

/**
 * Clamp a device-pixel-ratio to RENDER_DPR_CAP. Degenerate input (0, negative,
 * NaN) comes out as a usable 1 — the cabinet's `devicePixelRatio || 1`
 * convention — because a 0-dpr scene buffer is a crash, not a policy.
 */
export function cappedDpr(dpr: number): number {
  if (!Number.isFinite(dpr) || dpr <= 0) return 1
  return Math.min(dpr, RENDER_DPR_CAP)
}

export interface GlowPass {
  /** Stroke width for this pass, in the caller's coordinate space. */
  readonly width: number
  /** Alpha to MULTIPLY into the caller's ambient globalAlpha for this pass. */
  readonly alpha: number
}

/**
 * The stroke passes for a vector line: the crisp core, alone.
 *
 * `blur` is the halo reach every call site still asks for, and is deliberately
 * IGNORED — tempest's vectors are drawn without bloom (see the header). The
 * radius stays in the signature because it is the tuning surface: putting the
 * glow back means returning wider, dimmer passes ahead of the core again, here
 * and nowhere else.
 *
 * The core is always last, always full alpha, always the caller's line width;
 * withGlow strokes the same path once per returned pass, and blends every pass
 * but the last under 'lighter'. Returning exactly one pass is therefore also
 * what keeps a stroke off the additive path.
 */
export function glowStrokePasses(_blur: number, lineWidth: number): readonly GlowPass[] {
  return [{ width: lineWidth, alpha: 1 }]
}

/**
 * Draw one dot: a hard-edged fill of radius `size` at (x, y) in `color`, no
 * halo. Honours the ambient globalAlpha/composite mode.
 *
 * fillStyle carries the colour because the tp1-15 spike-sparkle and tp1-30
 * starfield-palette suites identify dots by the fillStyle recorded at fill() —
 * "what colour, how many". This was the node-only fallback under tp1-40's
 * sprite cache; it is now the only path, so what those suites observe in node
 * is what the browser draws.
 */
export function blitGlowDot(
  ctx: CanvasRenderingContext2D, color: string, x: number, y: number, size: number,
): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, size, 0, Math.PI * 2)
  ctx.fill()
}
