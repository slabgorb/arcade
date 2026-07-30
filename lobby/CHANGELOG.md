# Changelog

All notable changes to the **Arcade Lobby** — the vector front door to the cabinet.

Visit it at **[arcade.slabgorb.com](https://arcade.slabgorb.com)**.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.16] - 2026-07-15

### Added
- **A rotating HIGH SCORES board.** The lobby now shows a live top-five leaderboard that
  cycles through the games one at a time — each game's name in its own glow colour, its five
  best players and scores, and a row of pips marking which game is on screen. A game with no
  saved scores reads an honest **NO SCORES YET** instead of a fabricated name or a zero, and
  the board refreshes the moment you return from beating one of your bests.

## [0.0.15] - 2026-07-15

Version bump only.

## [0.0.14] - 2026-07-13

Version bump only.

## [0.0.13] - 2026-07-13

No player-visible changes. Documentation only.

## [0.0.12] - 2026-07-13

### Added
- **Every tile now shows the game it launches.** Each tile's model bay draws a real glowing
  vector model instead of sitting empty: Tempest's claw, a TIE fighter head-on, an asteroid,
  the Battlezone tank in profile, and the Red Baron biplane. A tile whose model is missing
  still looks exactly as it did before, so nothing breaks if a game has no model yet.

## [0.0.11] - 2026-07-12

No player-visible changes. Documentation only.

## [0.0.10] - 2026-07-12

### Fixed
- **Your scores stay current.** Come back to the lobby after playing and the tile
  re-reads your high score, rather than showing whatever it read when the page first
  loaded.

## [0.0.9] - 2026-07-12

### Fixed
- **High scores appear on the tiles again.** Each game now lives on its own subdomain,
  which had left the lobby unable to see the scores the games were saving. Tiles read
  each game's score from a cookie shared across the arcade (ADR-0004). A tile shows a
  score only when it genuinely has one — a real zero and "no score yet" are no longer
  confused.

## [0.0.8] - 2026-07-12

### Added
- **The lobby is dressed as a cabinet.** A receding vector grid floor and cabinet
  furniture frame the tile grid. The decoration is inert — it can't be clicked or
  tabbed into, so it can't swallow a click meant for a game.

## [0.0.7] - 2026-07-12

No player-visible changes. Documentation only — this changelog was added.

## [0.0.6] - 2026-07-12

No changes. Version bump only, published as part of a fleet-wide release.

## [0.0.5] - 2026-07-11

No changes. Version bump only, published as part of a fleet-wide release.

## [0.0.4] - 2026-07-11

No changes. Version bump only, published as part of a fleet-wide release.

## [0.0.3] - 2026-07-10

No changes. Version bump only, published as part of a fleet-wide release.

## [0.0.2] - 2026-07-10

No player-visible changes. Documentation only.

## [0.0.1] - 2026-07-10

**Initial release** — the arcade's front door.

### Added
- A vector-style menu on black that lists the games as glowing tiles, rendered with the
  same glow primitives the games use.
- **Pick a tile and it launches the game.**
- **Your high score for each game, shown on its tile.**
- Keybinding hints on every tile, so you know the controls before you start.
- Tiles for Tempest, Star Wars, Asteroids, Battlezone and Red Baron — each in its own
  cabinet colour.
- The VECTOR cabinet favicon.
