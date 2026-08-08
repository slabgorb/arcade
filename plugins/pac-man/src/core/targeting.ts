// src/core/targeting.ts
//
// Story pm1-6 (Julia) — the crown jewel: the four distinct ghost brains. Each
// personality PRODUCES the `target` tile that src/core/ghost.ts's `stepGhost`
// consumes; this file owns WHERE a ghost aims, ghost.ts owns HOW it walks there.
// glossary.md §Ghost AI. PURE: no DOM, no clock, no Math.random, no shell import
// — the purity sweep (tests/purity.test.ts) scans this file's source text.
//
// ─── WHAT IS BYTE-CITED AND WHAT IS NOT (brief.md citation discipline) ───────
// The four routines live at pacman.asm 2758 / 278e / 27cb / 2813. Their offset
// arithmetic (Pinky's ×4, Inky's ×2 + doubling) is realised by shift-add
// instructions (`add hl,hl`), NOT by stored `#nn` literals — so those routines
// are cited by ROUTINE ADDRESS, and the "4"/"2"/doubling are documented as
// emergent code arithmetic, not invented literal anchors. The ONE genuine
// numeric literal is Clyde's distance threshold `#0040` = 64 = 8² tiles at
// `pacman.asm:281e` (claims/targeting.json TARGET-CLYDE-RADIUS). The Pinky/Inky
// up-overflow is likewise emergent (a real 8-bit bug), cited by routine address
// and documented honestly in glossary.md — see that file's §Ghost AI.
//
// ─── GPL FIREWALL ───────────────────────────────────────────────────────────
// Decoded from the vendored pacman.asm + the Pac-Man Dossier only. shaunlebron/
// pacman (GPL v3) was consulted for disambiguation of the up-overflow mechanism;
// not one line, table, or structure was copied (brief.md firewall clause).

import type { Tile } from './maze'
import { type Dir, DIR_DELTA } from './actor'
import type { GhostId } from './ghost'

/**
 * Each ghost's fixed scatter-mode home target — the classic "just outside the
 * maze" corner tile it makes for during scatter (and, for Clyde, the corner it
 * bolts to when Pac-Man is close). Dossier ch.4 "Meet The Ghosts" / scatter
 * targets, expressed in THIS port's reconstructed 28×36 (x,y) grid:
 *   Blinky top-right, Pinky top-left, Inky bottom-right, Clyde bottom-left.
 *
 * CITATION STATUS (honest): the ROM stores per-ghost scatter targets as the
 * immediate words loaded just before `call #2966` in each routine's scatter
 * branch (Pinky `ld de,#391d` @ 2781, Inky `ld de,#2040` @ 27be, Clyde
 * `ld de,#3b40` @ 2806). Those immediates are packed in the ROM's internal
 * ROTATED tile-coordinate frame, which this maze — a faithful-style
 * RECONSTRUCTION of the arcade shape (src/core/maze.ts), not a byte-identical
 * tile-RAM transcription — deliberately does not replicate. Mapping them onto
 * this grid would be inventing a coordinate transform, so the corner tiles below
 * are Dossier-DECODED and left uncited, exactly the policy maze.ts already
 * applies to the wall/dot layout. glossary.md §Ghost AI states this in full.
 */
export const SCATTER_CORNER: Readonly<Record<GhostId, Tile>> = {
  blinky: { x: 25, y: 0 },
  pinky: { x: 2, y: 0 },
  inky: { x: 27, y: 35 },
  clyde: { x: 0, y: 35 },
}

/**
 * Clyde's chase/scatter flip distance, SQUARED, in tiles: the real ROM literal
 * `#0040` = 64 = 8² at `pacman.asm:281e`. The routine (2813) computes the
 * squared Euclidean distance Pac↔Clyde (via #29ea: dx²+dy²) and does
 * `sbc hl,#0040 ; jp c` — the carry (→ scatter) fires ONLY when the distance is
 * strictly LESS than 64, so a distance of exactly 8 tiles (dist²==64) CHASES.
 * That strict boundary is the ROM's, transcribed exactly rather than rounded to
 * the Dossier's prose "eight tiles". claims/targeting.json TARGET-CLYDE-RADIUS.
 */
export const CLYDE_CHASE_MIN_DISTSQ = 64

/** The caller's snapshot the four brains read. Pac-Man's tile + facing feed the
 *  look-ahead ghosts; each ghost's own current tile feeds Inky (needs Blinky's)
 *  and Clyde (needs its own, for the distance flip). */
export interface TargetingState {
  readonly pacTile: Tile
  readonly pacDir: Dir
  readonly ghostTiles: Readonly<Record<GhostId, Tile>>
}

/**
 * The tile `n` ahead of Pac-Man in his facing direction, REPRODUCING the 8-bit
 * up-overflow bug (pacman.asm:278e for n=4, 27cb for n=2): when Pac-Man faces
 * UP, the look-ahead lands `n` up AND `n` left. In the ROM the y-offset bleeds
 * into the x byte during the shift-add — here it is reproduced directly, never
 * "fixed" (glossary.md §Ghost AI). Any other facing is the plain `n`·direction.
 */
function aheadOfPac(pac: Tile, dir: Dir, n: number): Tile {
  if (dir === 'up') return { x: pac.x - n, y: pac.y - n } // the overflow: n up AND n left
  const { dx, dy } = DIR_DELTA[dir]
  return { x: pac.x + dx * n, y: pac.y + dy * n }
}

function squaredDistance(a: Tile, b: Tile): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy
}

/**
 * The target tile ghost `id` aims for this frame, per its personality:
 *  • Blinky (pacman.asm:2758) — Pac-Man's current tile.
 *  • Pinky  (pacman.asm:278e) — 4 tiles ahead of Pac (up-overflow applies).
 *  • Inky   (pacman.asm:27cb) — take the tile 2 ahead of Pac (SAME up-overflow),
 *      draw the vector from Blinky's tile to it and DOUBLE it:
 *      target = intermediate + (intermediate − Blinky) = 2·intermediate − Blinky.
 *  • Clyde  (pacman.asm:2813) — Pac-Man's tile when ≥8 tiles away (dist²≥64),
 *      else his own scatter corner (bottom-left).
 * The returned tile may lie outside the maze / inside a wall — that is faithful:
 * the ROM's targets are ideal points, and ghost.ts steers toward them along
 * walkable tiles only.
 */
export function targetTile(id: GhostId, state: TargetingState): Tile {
  const { pacTile, pacDir, ghostTiles } = state
  switch (id) {
    case 'blinky':
      return { x: pacTile.x, y: pacTile.y }
    case 'pinky':
      return aheadOfPac(pacTile, pacDir, 4)
    case 'inky': {
      const intermediate = aheadOfPac(pacTile, pacDir, 2)
      const blinky = ghostTiles.blinky
      return { x: 2 * intermediate.x - blinky.x, y: 2 * intermediate.y - blinky.y }
    }
    case 'clyde':
      return squaredDistance(ghostTiles.clyde, pacTile) >= CLYDE_CHASE_MIN_DISTSQ
        ? { x: pacTile.x, y: pacTile.y }
        : SCATTER_CORNER.clyde
  }
}
