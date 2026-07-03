# Battlezone — epic `bz1` design brief

**Date:** 2026-07-03
**Author:** PM (Bunny)
**Status:** Approved (roadmap epic; sequenced after epic A — Asteroids)
**Epic:** `bz1` — Battlezone (1980), full faithful vector clone
**Canonical source:** https://6502disassembly.com/va-battlezone/

---

## 1. Why Battlezone, why now

The fourth game in the arcade cabinet (after tempest, lobby, star-wars).
*Battlezone* (Atari, 1980) is the **first** Atari vector game — a first-person
3D wireframe tank duel on a flat plain. It gives the cabinet real gameplay
diversity: free-roaming tank combat versus Tempest's geometric tube and Star
Wars' on-rails cockpit. Chronologically it predates both, so it's the "original"
of the vector era.

This is a **roadmap epic**, not current-sprint work. Epic 14 (Star Wars trench
fidelity) completed 2026-07-03; the queue ahead is now **epic A (Asteroids,
p1)**, planned the same day in a sibling checkout. Tagged **p2** so Asteroids'
p1 work goes first, then promote to p1 when it's Battlezone's turn. No
dependencies on any other epic.

## 2. Scope & fidelity

Faithful clone anchored to the 6502 disassembly (our "ROM is canonical" rule).

**In scope:**
- First-person 3D wireframe world: horizon, distant mountains, erupting volcano,
  crescent moon, ground plane.
- Dual-tread tank steering (each stick/tread controls one side).
- Green radar scanner (enemy bearings within the visibility cone).
- All 21 fixed obstacles (cubes/pyramids/blocks) at ROM-table positions; they
  block movement and line-of-sight shots.
- Full enemy roster with authentic scoring:
  - slow tank — 1000
  - missile — 2000
  - super tank — 3000
  - saucer — 5000
- "Always one hostile on the field" spawn rule.
- Score-threshold enemy introduction (missiles after a pinned authentic DIP
  default; saucer bonus at 2000).
- Difficulty scaling by score differential (aggression ratchets **up to** the
  ROM ceiling, never past it).
- Extra-tank award; game-over / attract states.
- POKEY-style SFX: engine hum, cannon, explosion, enemy motion, saucer.
- Cracked-glass viewport + gunsight framing, bichromatic overlay.

**Descoped (standing arcade rules):**
- **Coin-op mechanics** — no "insert 2 coins," no attract-mode quarter pressure.
  (No money model.) The missile *score* threshold stays — that's real
  progression, not quarter-extraction.
- **Difficulty ceiling** — don't gold-plate late-game states nobody reaches.
- **Spawn-in-obstacle ROM bug** — a known ROM defect (missing collision check).
  Per-story judgment call; lean toward NOT replicating a bug that degrades play.

## 3. Architecture

Mirrors tempest & star-wars: `src/core` (deterministic sim) / `src/shell`
(render · input · audio · loop). Canvas 2D glowing vectors, no backend, no 3D
engine.

- **New gitignored subrepo `battlezone/`** — own git history, TypeScript + Vite +
  Vitest, pinned dev port **5276** (`strictPort`; 5274 = star-wars, 5275 =
  asteroids/epic A), registered in `.pennyfarthing/repos.yaml`, given a lobby tile.
- **`math3d` ported from star-wars** into `battlezone/src/core` — Battlezone runs
  on the same matrix/vector "Math Box" machinery Star Wars already implements.
  We **port and defer**: keep both games self-contained; extract a shared library
  only later, once we've seen what is truly identical versus game-specific
  (free-roam ground plane + radar projection differ from SW's on-rails cockpit).
  This honors "extract when duplication is *proven*, not *predicted*."

## 4. Story map (`bz1`, ~36 pts)

| ID | Story | Pts |
|----|-------|-----|
| bz1-1 | Subrepo bootstrap: Vite/TS/Vitest scaffold, pinned port 5276, `math3d` port, repos.yaml + lobby tile | 2 |
| bz1-2 | Source findings doc — distill disassembly (entities, scoring, obstacle table, 3D vertex specs, difficulty) | 3 |
| bz1-3 | 3D render foundation — camera/projection, horizon·mountains·volcano·moon, wireframe 21-obstacle field | 5 |
| bz1-4 | Tank movement — dual-tread steering, heading/position, obstacle collision, viewport framing | 3 |
| bz1-5 | Player firing — shell projectile, gunsight, line-of-sight shot blocking | 3 |
| bz1-6 | Radar scanner — green overlay arc, enemy blips within cone, sweep | 2 |
| bz1-7 | Enemy tanks — spawn ("always one hostile"), approach/aim/fire AI, hit + explosion, 1000 pts | 5 |
| bz1-8 | Missiles + super tanks — guided missile (2000), super tank (3000), score-threshold intro | 3 |
| bz1-9 | Saucer bonus — drifts in at 2000 pts, random path, 5000 pts, radar-invisible | 2 |
| bz1-10 | Difficulty ratchet + scoring/lives + game-over/attract (up to ROM ceiling) | 3 |
| bz1-11 | Audio — engine hum, cannon, explosion, enemy motion, saucer | 2 |
| bz1-12 | HUD/framing fidelity + live playtest capstone | 3 |

Playable-ish by **bz1-7** (drive, shoot, fight one tank); the rest layers the
full roster and fidelity. The detailed game design spec is bz1-2's deliverable,
authored inside the `battlezone/` subrepo once bootstrapped.

## 5. Naming decision (why `bz1`, not `bz-1`)

`pf` derives story IDs as `{epic}-{n}` and several non-fallback workflow paths
recover the epic via `story_id.split("-")[0]`. Epic `bz-1` → stories `bz-1-N` →
`split("-")[0]` = `"bz"`, which `find_epic` will not match to `bz-1`. That breaks
`pf sprint story field` (SM setup), the handoff context gate
(`complete_phase`, looks for `context-epic-bz.md`), and `pf context generate`.
Using `bz1` (single dash) makes `split("-")[0]` = `"bz1"` = the epic id, so every
path works. Future Battlezone epics are `bz2`, `bz3`, … — the numbered-epic
namespace, tooling-safe.
