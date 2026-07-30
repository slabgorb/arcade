# Changelog

All notable changes to **Battlezone** — a faithful browser clone of Atari's 1980 vector classic.

Play it at **[battlezone.slabgorb.com](https://battlezone.slabgorb.com)**.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). Entries describe what changed
for the player. Purely internal work is summarised under *Internal*.

## [0.0.12] - 2026-07-13

Version bump only.

## [0.0.11] - 2026-07-13

### Fixed
- **The game could freeze rather than merely fall silent.** A browser is allowed to close
  the audio device out from under a page — iOS reclaiming it, or a tab left in the
  background long enough. The next sound Battlezone tried to make would then throw, and
  because sound is made inside the frame loop, it took **rendering and input down with
  it**: a silent tank became a frozen one. Audio now fails quietly and the game plays on.

### Internal
- The audio engine moved onto the arcade's shared synth. No sound changes — the engine hum,
  the saucer, the treads and the cannon keep exactly their old tunings.

## [0.0.10] - 2026-07-12

No player-visible changes. Documentation only.

## [0.0.9] - 2026-07-12

### Added
- **Your best score now shows on Battlezone's tile in the arcade lobby.** The game
  publishes its top score where the lobby can read it, across subdomains (ADR-0004).

## [0.0.8] - 2026-07-12

No player-visible changes. Documentation only — this changelog was added.

## [0.0.7] - 2026-07-12

### Changed
- Pause now behaves the same as every other cabinet in the arcade: **Esc** pauses and
  brings up the overlay.

## [0.0.6] - 2026-07-11

No player-visible changes. Version bump only, published as part of a fleet-wide release.

## [0.0.5] - 2026-07-11

### Internal
- Canvas scaling and letterboxing now come from the arcade's shared rendering code.

## [0.0.4] - 2026-07-10

### Internal
- The wireframe and text are stroked through the arcade's shared glow renderer.
  Same phosphor look, one implementation.

## [0.0.3] - 2026-07-10

### Added
- **Type your initials on the high-score table.** The game no longer auto-tags every
  entry "AAA".

## [0.0.2] - 2026-07-10

### Internal
- HUD text moved onto the arcade's shared stroke-vector font.

## [0.0.1] - 2026-07-10

**Initial release** — the complete game. Everything below shipped in this first version.

### Added

**Driving the tank**
- Authentic dual-tread controls: each stick drives one tread, so you steer by
  differential drive exactly as the cabinet did.
- A fine-aim modifier for precise turret work.
- Obstacles you collide with rather than drive through, positioned from the original
  ROM's own tables.

**The battlefield**
- First-person green wireframe 3D on a flat plain, with the distant mountain skyline
  and erupting volcano.
- The **radar scanner**, sweeping for enemies around you.

**The enemy**
- Enemy tanks that approach, aim and fire — with the rule the cabinet enforced:
  there is always one hostile out there. Worth 1,000 points.
- **Guided missiles** (2,000 points) that steer toward you.
- **Super tanks** (3,000 points), introduced once your score is high enough.
- The **saucer** bonus, drifting past and invisible to radar, worth 5,000 points.
- Enemy tanks maneuver on the ROM's authentic goal-heading AI, and spawn fairly —
  in front of you, with a brief grace period before they can fire.

**Shooting and surviving**
- Cannon fire with a gunsight, and shots blocked by obstacles.
- Lives, extra tanks, and a difficulty ratchet that tightens as you score.
- High-score table that persists between sessions.

**Presentation**
- The cabinet's bichromatic HUD, its real on-screen strings, and the cracked-glass
  overlay when you're hit.
- 4:3 letterboxed picture — the image is pinned to the original aspect rather than
  stretched across the window.
- Pause overlay and an always-on control indicator.

**Sound**
- Synthesised WebAudio recreations of the cabinet's voices: engine hum, cannon,
  explosion, track rattle, and the saucer's warble.
