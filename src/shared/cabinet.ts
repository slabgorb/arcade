// @arcade/shared/cabinet — the shared DISPLAY CHROME (the "cabinet surround").
//
// Story sa1-1 (epic sa1, "Polish and QOL"). Every game fits its world into the
// viewport at a uniform scale (letterbox/pillarbox via @shared/view `letterbox`,
// or a whole-number raster fit via `fitIntegerScale`), which leaves BARS of dead
// screen around the fitted rect. asteroids already computes exactly these bars in
// `plugins/asteroids/src/shell/margin.ts` (`marginRects`, derived from
// `letterbox`); this module folds that one idea out for the whole cabinet floor so
// every game frames its non-game margins identically instead of each inventing —
// or skipping — its own.
//
// Two halves, matching the split @shared/view already uses (pure `letterbox` +
// surface-touching `resizeToDisplay`):
//
//   chromeRegions(container, game)          — PURE aspect-complement math. The
//     non-game regions as non-overlapping rectangles that exactly tile the
//     complement of the fitted `game` rect inside `container`. No globals, no
//     state, no time — unit-tested in node.
//
//   drawCabinetChrome(ctx, container, game, opts) — paints every region from
//     chromeRegions with ONE uniform fill; that uniformity IS the consistency the
//     story asks for. It writes only through the injected `ctx` (a structural
//     ChromeCtx, satisfied by a real 2d context) and references no DOM global, so
//     the purity guard scans it clean like any other module here — it needs no
//     browser-subpath exemption.

/** A container size in the same space (device or CSS px) as the fitted rect. */
export interface Size {
  readonly width: number
  readonly height: number
}

/** A screen-space rectangle, origin top-left, same space as `Size`. */
export interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** The minimal fill surface drawCabinetChrome needs — a real 2d context satisfies
 *  it structurally, so callers pass their context directly and tests pass a stub. */
export interface ChromeCtx {
  fillStyle: string | CanvasGradient | CanvasPattern
  fillRect(x: number, y: number, w: number, h: number): void
}

/** Style for the surround. Only a flat colour today (YAGNI); an object leaves room
 *  for a sibling story to add e.g. a gradient without changing the call sites. */
export interface ChromeStyle {
  readonly color: string
}

/**
 * The ONE surround look the whole cabinet floor shares — the point of sa1-1 is that
 * the non-game margins read identically from game to game, so every adoption passes
 * this rather than its own colour. A near-black slate: distinct from the pure-black
 * play area (so the dead margin is legible as "not the game") without competing with
 * the glowing vector/sprite content.
 */
export const CABINET_CHROME: ChromeStyle = Object.freeze({ color: '#0a0a12' })

/**
 * The non-game surround of `game` inside `container`, as non-overlapping rectangles
 * that EXACTLY tile the complement (their areas sum to container − game, and none
 * touches the game rect on a positive area). Returns a fresh array each call.
 *
 * The decomposition is the canonical picture-frame one: full-width strips ABOVE and
 * BELOW the game, then the game's own vertical span split into strips LEFT and RIGHT.
 * Empty strips (a game edge flush with the container edge) are dropped, so:
 *   - game flush left+right, shorter → top+bottom bars (letterbox)
 *   - game flush top+bottom, narrower → left+right bars (pillarbox)
 *   - game smaller in both axes → all four
 *   - game fills the container → [] (no dead space to frame)
 */
export function chromeRegions(container: Size, game: Rect): Rect[] {
  const regions: Rect[] = []
  const push = (x: number, y: number, width: number, height: number): void => {
    if (width > 0 && height > 0) regions.push({ x, y, width, height })
  }

  const gameBottom = game.y + game.height
  const gameRight = game.x + game.width

  // Full-width strips above and below the game.
  push(0, 0, container.width, game.y)
  push(0, gameBottom, container.width, container.height - gameBottom)
  // The game's own vertical band, split left and right of the game.
  push(0, game.y, game.x, game.height)
  push(gameRight, game.y, container.width - gameRight, game.height)

  return regions
}

/**
 * Fill the non-game surround of `game` with one uniform colour. Paints every region
 * from chromeRegions and nothing inside the game rect; a full-bleed game (no dead
 * space) draws nothing at all.
 */
export function drawCabinetChrome(
  ctx: ChromeCtx,
  container: Size,
  game: Rect,
  opts: ChromeStyle,
): void {
  const regions = chromeRegions(container, game)
  if (regions.length === 0) return
  ctx.fillStyle = opts.color
  for (const r of regions) ctx.fillRect(r.x, r.y, r.width, r.height)
}
