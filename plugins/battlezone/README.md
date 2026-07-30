# Battlezone

A faithful, browser-based clone of Atari's 1980 vector arcade game *Battlezone*
— the first-person 3D wireframe tank duel on a flat plain.

**▶ Play it live: [battlezone.slabgorb.com](https://battlezone.slabgorb.com)**

![Battlezone gameplay — first-person wireframe view across the plain, obstacles under the mountain horizon and the green radar scanner](https://arcade-assets.slabgorb.com/battlezone/screenshot.png)

You steer a tank with two independent treads, aim through a fixed gunsight,
and watch a green radar scanner for the next hostile. Glowing wireframe
vectors on black, rendered with HTML5 Canvas 2D — no 3D engine, no physics
engine, no backend. The game is a **deterministic pure simulation core** (its
own ported "Math Box") wrapped by a thin input/render shell — the same
architecture as its siblings, [tempest](../tempest) and
[star-wars](../star-wars).

> **Status:** In active development. 3D render foundation, dual-tread tank
> movement, player firing, the radar scanner, and the enemy roster (slow tank,
> guided missile, super tank) are in place (bz1-1–bz1-8). The bonus saucer,
> difficulty ratchet, lives/attract mode, and audio are landing next
> (bz1-9–bz1-12).

---

## Quick start

```bash
npm install
npm run dev
```

Then open **http://localhost:5276**.

---

## Controls

Two mappings drive the same tread axes — use whichever feels natural.

| Action | Arcade (dual-stick) | Friendly (arrows) |
|--------|----------------------|--------------------|
| Left tread forward / back | **E / D** | — |
| Right tread forward / back | **I / K** | — |
| Drive forward / back | — | **↑ / ↓** |
| Pivot left / right | — | **← / →** |
| Fire | **Space** or **F** | **Space** or **F** |

Both treads forward drives straight; opposed treads pivot in place — the
authentic Battlezone differential-drive feel.

---

## Gameplay

- **Dual-tread steering.** Forward speed comes from the sum of both treads,
  turn rate from their difference — a real differential drive, not an
  arcade-generic tank control scheme.
- **Always one hostile.** The moment one enemy is destroyed, the next spawns
  immediately — there is no gap in the fight.
- **Enemy roster.** The slow tank (1000 pts) is joined by the guided missile
  (2000 pts) and the super tank (3000 pts) as your score climbs.
- **Radar scanner.** A green sweep shows hostile bearing and range within its
  cone; the 21 static obstacles never appear on it.
- **The plain.** 21 ROM-positioned obstacles — pyramids and boxes — dot a flat
  plain under a mountain horizon, volcano, and moon.

---

## Architecture

Split into a **pure simulation core** and a thin **IO shell**. This boundary is
the most important rule in the codebase.

```
src/
├── core/              # PURE, deterministic, unit-tested — no DOM/canvas
│   ├── math3d.ts      # the ported "Math Box": vec3 / mat4 / perspective
│   ├── camera.ts      # TankPose, view/projection setup
│   ├── scene.ts       # world → NDC wireframe projector
│   ├── models.ts      # ROM-decoded 3D wireframe models
│   ├── movement.ts    # dual-tread differential-drive kinematics
│   ├── obstacles.ts   # the 21 ROM-positioned obstacles
│   ├── horizon.ts     # skyline / mountains / volcano / moon
│   ├── firing.ts      # player shell projectile + line-of-sight
│   ├── enemies.ts     # roster spawn/AI/hit/explosion/scoring
│   ├── radar.ts       # radar contacts + sweep
│   ├── scoring.ts     # point values
│   ├── input.ts       # Input type (tread axes)
│   └── rng.ts         # seeded PRNG (deterministic)
├── shell/             # IO: input.ts (KeyboardTreads), render.ts
└── main.ts            # bootstrap: canvas + wire shell ↔ core
```

**The core is pure and deterministic.** It never imports from `shell/`, never
touches the DOM/`window`/`canvas`, and never calls `Date.now()`,
`performance.now()`, `Math.random()`, or `requestAnimationFrame`. All time
enters as `dt`; all randomness comes from a seeded RNG carried in the state.
The render camera *is* the tank's own pose (turret forward-locked), so the
world projection follows the tank for free.

---

## Reference material

Authentic data — the entity roster and scoring, the obstacle table, 3D vertex
specs, the difficulty curve, and radar rules — is ported from the commented
disassembly of the original cabinet, distilled in
[`docs/battlezone-1980-source-findings.md`](docs/battlezone-1980-source-findings.md).
The disassembly quarry itself is kept locally under `reference/` (gitignored)
— never committed.

---

## Tech stack

- **Language:** TypeScript (ES modules, strict mode)
- **Build tool:** [Vite](https://vitejs.dev/)
- **Tests:** [Vitest](https://vitest.dev/) — TDD on the pure core
- **Rendering:** HTML5 Canvas 2D (`shadowBlur` for the vector-CRT glow)

---

## Development

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the Vite dev server on port 5276 |
| `npm run build` | Type-check (`tsc --noEmit`) and build to `dist/` |
| `npm run preview` | Serve the production build locally on port 5276 |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |

---

## License

Private project, for personal/educational use. *Battlezone* and *Atari* are
trademarks of their respective owners; this is an educational clone built to
learn how the original worked.

## Releasing

This repo ships from the [arcade orchestrator](https://github.com/slabgorb/arcade):
`just release battlezone` gates on tests + build, merges `develop` → `main`, tags
`vX.Y.Z`, and pushes. Every push to `main` auto-deploys to Cloudflare R2 via
GitHub Actions (`.github/workflows/deploy.yml`) — **`main` is production; never
push it by hand.** A red CI run deploys nothing.
