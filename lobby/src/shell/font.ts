// src/shell/font.ts
//
// Loads the "Vector Battle" arcade vector font the lobby paints its title and
// tile labels in — the same face tempest and star-wars use, so the cabinet's
// front door shares the games' typography. Render/shell-only; the pure core never
// touches fonts. The pattern is mirrored from the games, not shared: per the
// orchestrator CLAUDE.md the arcade shares a visual *language*, not a library.
//
//   Font:    Vector Battle (VectorBattle-e9XO.ttf)
//   Author:  ck! / Freaky Fonts, 1999
//   License: Freeware, Non-Commercial (see public/fonts/Readme.txt, shipped
//            unmodified alongside the face per the designer's terms). A
//            commercial license must be purchased if this project ever goes
//            commercial.
//
// The face is a CAPS-ONLY monoline vector ROM font; the lobby's CSS uppercases
// text (text-transform) so labels render in the ROM caps.

export const UI_FONT_FAMILY = 'Vector Battle'

// Static asset served from public/fonts/. Resolve against Vite's BASE_URL so the
// '/lobby/' deploy base is honoured in both dev and build instead of being
// hardcoded.
const FONT_URL = `${import.meta.env.BASE_URL}fonts/VectorBattle-e9XO.ttf`

// Best-effort load: on any failure (missing API, blocked/absent file) the page
// keeps rendering with the 'Orbitron', monospace fallback in the CSS font-family
// chain, so the lobby is never blocked by the font. Resolves to whether the face
// is now available (the caller can ignore it — CSS swaps the font in on load).
export async function loadVectorFont(): Promise<boolean> {
  // FontFace / document.fonts are absent in non-DOM contexts and very old
  // browsers; degrade to the fallback rather than throwing at boot.
  if (typeof FontFace === 'undefined' || typeof document === 'undefined' || !document.fonts) {
    return false
  }
  try {
    const face = new FontFace(UI_FONT_FAMILY, `url(${FONT_URL})`)
    await face.load()
    document.fonts.add(face)
    return true
  } catch (err) {
    console.warn('[lobby] Vector Battle font failed to load; using fallback font.', err)
    return false
  }
}
