// src/shell/glyph-data.ts
//
// Story pm3-6 — the fruit and ghost-chain score-value sprite index MAPS.
//
// Unlike sprite-data.ts (pm3-5, baked byte-for-byte from pacman.5f — that
// part IS ROM data, re-derivation-checked by tests/shell/sprites.test.ts),
// this file holds no re-baked pixel data at all: it is a small, hand-AUTHORED
// pair of classification records over the 64 sprites SPRITES already
// decodes, the same honest-uncited status as render.ts's PAC_FRAMES /
// GHOST_BODY_FRAMES / FRIGHTENED_BODY_FRAMES (pm3-5) and MAZE_TILEMAP
// (pm3-4): identified by rendering every candidate sprite to a scaled RGBA
// PNG (a throwaway dump script, not committed — same method pm3-5's header
// describes) and inspecting shape, never lifted from another codebase, a
// screenshot, or a published ROM-map table.
//
// ─── FRUIT_SPRITE: sprites 0-7, matched by shape ──────────────────────────
// Rendered at 20x scale with a placeholder 4-colour palette (pixel value 0
// transparent, 1/2/3 arbitrary hues just to make edges legible), sprites 0-7
// resolve unambiguously to the 8 real Pac-Man bonus fruit/item silhouettes:
//   0: two round lobes joined by a curved stem            -> cherry
//   1: wide top with a cleft notch, seed-dot texture       -> strawberry
//   2: single plain round fruit, small leaf/stem           -> orange
//   3: trapezoid tapering to a point, flat rim + clapper   -> bell
//   4: round fruit, cleft ("heart") top with a stem notch  -> apple
//   5: round fruit, mottled/speckled (netted-rind) texture -> melon
//   6: swept-wing diamond silhouette (a flagship hull)     -> galaxian
//   7: bow/loop head + a long toothed shaft                -> key
// (3) and (7) are the least ambiguous of the eight — a bell and a key have
// no other plausible reading among sprites 0-63. (0), (4) and (6) are next:
// a twin-lobe-plus-stem cherry, a cleft-top apple and a Galaxian-hull
// silhouette are each distinctive shapes with no competing candidate in the
// 64-sprite sheet. (1), (2) and (5) are the softest calls: three of the
// eight fruits are all "one round body," and orange/melon/strawberry are
// told apart mainly by surface texture (plain vs. seed-dot vs. mottled) —
// plausible, not certain. Final visual confirmation (in the running app, not
// this decode) is the controller's, per this story's brief.
export const FRUIT_SPRITE: Readonly<Record<import('../core/level').FruitType, number>> = {
  cherry: 0,
  strawberry: 1,
  orange: 2,
  bell: 3,
  apple: 4,
  melon: 5,
  galaxian: 6,
  key: 7,
}

// ─── SCORE_SPRITE: sprites 40-43, matched by shape ────────────────────────
// Sprites 40-43 decode to literal 3-glyph digit patterns (a "2"/"4"/"8"/"1"
// shape followed by one or two "0" ovals, plus a "6" in the fourth) that
// read, unambiguously, as the four ghost-chain bonus values Pac-Man awards
// for eating a frightened ghost in sequence (200/400/800/1600 — mode.ts's
// own scoring, not re-derived here). No other sprite in 0-63 contains a
// digit-shaped glyph, so this mapping has no competing candidate.
export const SCORE_SPRITE: Readonly<Record<number, number>> = {
  200: 40,
  400: 41,
  800: 42,
  1600: 43,
}
