# mc1 — Missile Command plugin: skeleton design

**Architect design doc.** Target: a new `missile-command` plugin that boots in the
cabinet, faithful to **REV-01** source. Kickoff = **skeleton-first** (owner decision):
stand up the plugin + a minimal deterministic core, back-fill the full citation
dossier later. Ground truth: `../rom-study/brief.md`.

## Reuse-first: this is the joust/centipede shape, not a new pattern

Missile Command is a **raster** game (6502 + POKEY, framebuffer video, trackball + 3
buttons). It maps 1:1 onto the established raster-game structure — **no new
infrastructure is warranted.** Copy `plugins/joust/` (the newest raster game) as the
template and specialise. Specifically reuse, unchanged:

- The plugin four-file shape (`index.html`, `plugin.ts`, `package.json`,
  `tsconfig.json`) — copy from joust, do not hand-type (a missing file fails late).
- The `core/` (pure deterministic sim) ↔ `shell/` (render/audio/input/timebase/
  storage) split — **the single most important rule**; enforced by a `purity`/
  `core-boundary` test that scans `src/core/` source text. Copy joust's
  `tests/helpers/purity-scanner.ts`.
- `@shared` modules: `rng`, `loop`, `highscore`, `name-entry`, `font`, `pause`,
  `view`, `audio`, `synth`. Missile Command needs `highscore`+`name-entry` (it has a
  ladder + initials, `W3DSUP:1862/2032`) and `font` (stroke text) — all already
  in-tree. **Do not** re-implement these.
- The rom-study layout (`docs/rom-study/`, `tools/audit/check-citations.mjs`,
  `tests/helpers/claims.ts`) — copy the shapes when the dossier back-fill epic runs.

New extraction into `src/shared` is **out of scope**: nothing here is proven-duplicate
against a second game yet (the repo's extraction bar).

## Core/shell decomposition (deterministic sim)

`src/core/` (pure — no `Date`, no `Math.random`, no canvas, seeded RNG only):

| File            | Responsibility (source anchor)                                |
|-----------------|---------------------------------------------------------------|
| `game.ts`       | Top-level state machine: ATTRACT / SETUP / PLAY / PAUSE / END-WAVE / END-GAME (`W3MAIN:238,270,281,308,1916,2074,2308`) |
| `cursor.ts`     | Trackball → crosshair integrate + clamp (`W3MAIN:424,546,587`) |
| `abm.ts`        | Player ABM launch from nearest live base, flight, detonation (`W3MAIN:606,665,860`) |
| `enemy.ts`      | ICBM/CM/MIRV spawn, descent, MIRV split, targeting (`W3MAIN:722,1137,1342,1412`) |
| `explosion.ts`  | Expanding/collapsing blast circle + kill radius (`W3MAIN:906,2503`) |
| `damage.ts`     | Blast vs missile/city/base collision + destroy (`W3MAIN:963,1084`) |
| `wave.ts`       | Per-wave ICBM count/speed, score multiplier, colours, bonus (`W3MAIN:1951,2025,2162`; `W3COMN` consts) |
| `score.ts`      | Points, multiplier (`MAXMUL=6`), bonus city interval, high-score feed |
| `field.ts`      | Fixed layout: 6 city + 3 base positions (`W3COMN CITY1..6H/V`), screen coords |
| `frame.ts`      | The sim step: advances one tick; `game.ts` is the reducer over input+tick |

`src/shell/`:

| File          | Responsibility                                                  |
|---------------|-----------------------------------------------------------------|
| `render.ts`   | Canvas 2D: framebuffer-style raster, 8-colour palette (3-bit), per-wave colour cycle. Draws cities/bases/trails/blasts/HUD. |
| `input.ts`    | Mouse/trackball → cursor delta; 3 fire keys → base-left/center/right (`Z`/`X`/`C` or `,`/`.`/`/`). Desktop-only (repo rule). |
| `audio.ts`    | `@shared/audio` + `synth` POKEY-style sfx (launch, explosion, siren, low-missile alarm). Assets are a later story; silent-degrade is fine. |
| `timebase.ts` | 61.0076 Hz field → sim ticks via `@shared/loop`. Nominal-60 fallback documented. |
| `storage.ts`  | High-score persistence via `@shared/highscore` (shared-origin localStorage). |

`main.ts` wires shell → core → `@shared/loop`, mounts on `#game`.

## Skeleton acceptance (what "boots" means for mc1)

A screenshot at `http://127.0.0.1:5270/missile-command/` shows: black field, 6 cities
+ 3 bases along the bottom at their cited coords, a trackball-driven crosshair, and a
fire that launches an ABM which detonates into an expanding blast. No enemies/scoring/
waves required for the skeleton — those are mc2+. The `purity` test passes (core is
clean). This deliberately keeps un-cited surface minimal while proving the wiring.

## Registrations (the three, per CLAUDE.md "Adding a game")

1. `justfile` `games :=` — append `missile-command`.
2. `vitest.config.ts` `GAMES` — add `'missile-command'`.
3. `npm run gen:registry` — regenerate committed `src/host/registry.ts` (do not hand-edit).

`plugin.ts` meta (fill `order`/`version` from package.json):
```ts
export const meta: GameMeta = {
  id: 'missile-command',
  title: 'MISSILE COMMAND',
  year: 1980,
  color: '#d8d020',              // provisional; reconcile to palette in a render story
  controls: ['AIM — Mouse / Trackball', 'FIRE — Z X C  (left / centre / right base)'],
  order: 8,                       // corrected from 7 at scaffold time — red-baron owns order 7
  listed: true,
  showcase: false,
  version,
}
```

## Guardrails carried from the fleet's scars

- **Radix**: every constant ported from source is hex unless it ends in `.` — bake the
  brief's decoded values, cite the `W3COMN` line in the test/`claims`.
- **Skeleton-first risk**: any constant the skeleton hardcodes MUST cite `brief.md`
  (which cites source). No "magic number faithful to nothing."
- **Assets ≠ green test**: audio/render assets prove out with a live 200, not a passing
  vitest (architect gotcha). Skeleton ships silent; file the asset-bake story, don't
  let a Delivery Finding die in the archive.
- **REV-01 discipline**: if a behaviour matches MAME but not our source, it's REV-03
  drift → open question, not a silent copy.

## Handoff

To **Yoda (Dev)**: copy `plugins/joust/` → `plugins/missile-command/`, strip joust's
core/shell to the tables above, implement the skeleton acceptance, add the three
registrations, `npm run gen:registry`, verify at `/missile-command/`. Cite `brief.md`
for every constant. The dossier back-fill (citation checker TDD, `subsystems.md`,
`glossary.md`, `claims/*.json`, O-1/O-2 resolution) is the follow-on epic.
