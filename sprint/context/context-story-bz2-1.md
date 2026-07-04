# Story bz2-1 — Fixed aspect ratio — stop full-width canvas stretch, letterbox to a pinned ratio

**Epic:** bz2 · **Points:** 2 · **Priority:** p2 · **Type:** bug · **Repo:** battlezone · **Workflow:** tdd

## Summary

The canvas currently stretches to fill the entire browser window, destroying the arcade cabinet's intended aspect ratio. This story fixes the canvas sizing and letterboxing so the game pins to a fixed aspect ratio (4:3 standard) and centers the viewport with black letterbox bars filling the unused space on either side (or top/bottom in landscape).

## Technical Approach

**Current behavior (bug):**
- `src/main.ts` `resize()` function (lines 58–67) sets `canvas.width` and `canvas.height` to `window.innerWidth` and `window.innerHeight`
- No aspect ratio constraint; the canvas stretches to fill the full window
- HTML/CSS does not center the canvas, so black background doesn't show as letterbox bars

**Desired behavior (arcade standard):**
- Canvas maintains a pinned aspect ratio (4:3) regardless of browser window aspect
- Maximum canvas dimensions that fit in the viewport while respecting the 4:3 ratio
- Letterbox bars (black, from body background) fill empty space on sides or top/bottom
- HiDPI scaling (`devicePixelRatio`) preserved for crisp rendering
- Resize events update canvas and layout correctly

**Implementation changes:**
1. **`src/main.ts` `resize()` function:** Calculate max width/height that fit in the viewport while maintaining 4:3 aspect ratio, apply those dimensions to canvas, center the canvas element
2. **`index.html` CSS:** Use flexbox or centering (e.g., `body { display: flex; align-items: center; justify-content: center; }`) so the canvas centers and letterbox bars show

**Key calculations:**
- Target aspect ratio: `aspectRatio = 4 / 3 ≈ 1.333`
- Available aspect: `availableAspect = window.innerWidth / window.innerHeight`
- If `availableAspect > targetAspect` (landscape excess): constrain by height
  - `canvasHeight = window.innerHeight`, `canvasWidth = canvasHeight * aspectRatio`
- Else (portrait excess): constrain by width
  - `canvasWidth = window.innerWidth`, `canvasHeight = canvasWidth / aspectRatio`
- Apply `canvas.style.width` and `canvas.style.height` in CSS pixels (not device pixels); canvas bitmap (`canvas.width`/`canvas.height`) scaled by `devicePixelRatio` for HiDPI

## Files to Modify

| File | Changes |
|------|---------|
| `src/main.ts` | Rewrite `resize()` function to calculate aspect-ratio-constrained dimensions and center the canvas |
| `index.html` | Update CSS: use flexbox or text-align center to center the canvas; ensure body fills viewport and has black background |

## Acceptance Criteria

- [ ] Canvas maintains a 4:3 aspect ratio at all window sizes
- [ ] Letterbox bars (black) appear on sides (portrait orientation) or top/bottom (landscape) and fill the unused space
- [ ] Game viewport scales to fit the available space without distortion
- [ ] Text and vector rendering remain crisp on HiDPI displays (devicePixelRatio scaling preserved)
- [ ] Window resize events update the canvas and layout correctly
- [ ] No layout jank or visual glitches on resize
- [ ] Playtest confirms aspect ratio and letterboxing are visually stable and match arcade cabinet expectations

## Test Coverage

- Manual visual verification: resize browser window in all orientations (portrait, landscape, square)
- Verify aspect ratio locks and doesn't stretch
- Verify letterbox bars show and scale correctly
- Verify text/vectors remain crisp at different DPR values (check on HiDPI if available)

## References

- **Current code:** `battlezone/src/main.ts:58–67` (resize function)
- **Current HTML:** `battlezone/index.html` (canvas element and styling)
- **Epic context:** `sprint/context/context-epic-bz2.md`
- **Arcade standard:** 4:3 aspect ratio (common for arcade cabinets; confirm in playtest or design brief)

---
_Generated from sprint/epic-bz2.yaml story bz2-1 metadata._
