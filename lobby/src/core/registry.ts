// src/core/registry.ts
// The lobby's source of truth for "what games live on the cabinet". Pure data,
// no DOM — lives in core/ alongside layout.ts. Story 7-3's tile grid renders
// this list; story 7-4's launch will dispatch on `launchUrl`.

/** A game on the arcade cabinet, as listed in the lobby. */
export interface Game {
  /** Unique slug — used in URLs and (later) per-game high-score keys. */
  id: string
  /** Display label shown on the tile. */
  title: string
  /** Absolute URL the tile launches to (e.g. 'https://tempest.slabgorb.com/'). */
  launchUrl: string
  /** Glow colour for the tile outline/label (hex). */
  color: string
  /** Short keybinding hints shown on the tile, one line per control. */
  controls: readonly string[]
  /** The game's current released version, shown on its tile (e.g. '1.0.24'). */
  version: string
  /**
   * Does this game's attract mode earn a slot in the lobby showcase carousel?
   *
   * Required, not optional. An optional flag with a falsy default means a newly
   * added game silently opts out and nobody notices — the same class of invisible
   * absence this whole feature exists to correct. A game flips this to true in its
   * own demo story, once it actually has something worth watching.
   */
  showcase: boolean
}

/**
 * Every game the lobby lists, each launched on its own subdomain
 * (<slug>.slabgorb.com) served from R2: Tempest, Star Wars, Asteroids,
 * Battlezone, Centipede, Joust. More games join here as their subrepos become
 * servable.
 * (Red Baron is provisioned but not yet listed — it isn't finished enough for prod.)
 */
export const GAMES: readonly Game[] = [
  {
    id: 'tempest',
    title: 'TEMPEST',
    launchUrl: 'https://tempest.slabgorb.com/',
    color: '#00eaff',
    controls: ['ROTATE — Wheel / ←→', 'FIRE — Click / Space'],
    version: '1.0.28',
    showcase: true,
  },
  {
    id: 'star-wars',
    title: 'STAR WARS',
    launchUrl: 'https://star-wars.slabgorb.com/',
    color: '#ffe81f',
    controls: ['AIM — Mouse', 'FIRE — Click / Space'],
    version: '0.0.33',
    showcase: false,
  },
  {
    id: 'asteroids',
    title: 'ASTEROIDS',
    launchUrl: 'https://asteroids.slabgorb.com/',
    color: '#ff6a00',
    controls: ['ROTATE/THRUST — ←→↑ / WASD', 'FIRE — Space / K'],
    version: '1.0.14',
    showcase: false,
  },
  {
    id: 'battlezone',
    title: 'BATTLEZONE',
    launchUrl: 'https://battlezone.slabgorb.com/',
    color: '#00ff41',
    controls: ['DRIVE — Arrows / E D I K', 'FIRE — Space / F'],
    version: '1.0.0',
    showcase: false,
  },
  {
    id: 'centipede',
    title: 'CENTIPEDE',
    launchUrl: 'https://centipede.slabgorb.com/',
    color: '#2aa358',
    controls: ['Mouse'],
    version: '0.0.6',
    showcase: true,
  },
  {
    id: 'joust',
    title: 'JOUST',
    launchUrl: 'https://joust.slabgorb.com/',
    color: '#f0a828',
    controls: ['MOVE — ←→ / A D', 'FLAP — Space / Shift'],
    version: '0.0.8',
    showcase: false,
  },
]

/** Look up a game by id; `undefined` when no game matches. */
export function getGame(id: string): Game | undefined {
  return GAMES.find((g) => g.id === id)
}
