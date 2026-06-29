# Epic 8 Context

## Title
Star Wars: vector cockpit shooter (Waves 0-5)

## Overview
Faithful browser clone of Atari's 1983 vector Star Wars — first-person cockpit shooter escalating through three phases per wave: space (TIE fighters + fireballs) -> Death Star surface (towers, turrets) -> trench run (exhaust port). Glowing 3D vectors on Canvas 2D, no engine, no backend. Deterministic pure core with a software 'Math Box' (math3d) wrapped by a thin render/input/audio shell, mirroring tempest. Authentic vector models and speech ported from the cabinet disassembly under star-wars/reference (gitignored).

## Metadata
- **Epic ID:** 8
- **Repo:** star-wars

## Architecture & Reuse
**Reuse-first.** This epic introduces no new framework. It mirrors the proven
tempest architecture and *reuses its patterns* (not its code — there is no shared
library yet; extract one only once a second game proves the duplication is real,
per the orchestrator CLAUDE.md).

- **The hard boundary (sacred):** pure deterministic `src/core/` + thin IO
  `src/shell/`. `core/` never imports `shell/`, never touches DOM/`window`/`canvas`,
  never calls `Date.now()`/`performance.now()`/`Math.random()`/`requestAnimationFrame`.
  All time enters as `dt`; all randomness comes from the seeded RNG in `GameState`.
  `stepGame(state, input, dt)` is referentially transparent.
- **The Math Box** (`star-wars/src/core/math3d.ts`) — already built in Wave 0
  (story 8-1). This is the one true source of 3D math: `Vec3`/`Mat4` (row-major),
  `multiply`, `rotationX/Y/Z`, `translation`, `perspective`, and `transform`
  (with perspective divide). **All projection and collision math goes through it.**
  Where tempest's hardest core module was `geometry.ts` (2.5D tube), here it is
  `math3d.ts` (true 3D). Right-handed, looking down −Z (OpenGL convention).
- **Render contract:** `core` produces 3D/world-space data; `shell/render.ts`
  runs it through the Math Box and strokes glowing vectors (`shadowBlur`). The
  shell does **no** game math. Collision/hit-tests are computed in 3D in the
  core, never in screen pixels.
- **Phase model:** `GameState.phase: 'space' | 'surface' | 'trench'` is already
  defined (`src/core/state.ts`). Each wave runs the three phases in order.

## Reference Material
> The cabinet disassembly is the authoritative data source for this epic. It
> lives under `star-wars/reference/` — **gitignored, never committed or pushed**
> (it is a derivative of Atari's copyrighted code, kept only as a local learning
> quarry). We *read* it to recover real numbers and re-express them as our own
> TypeScript; we do not redistribute it. See `star-wars/reference/README.md`.

### Disassembly → story map (main board, Motorola 6809E)
| Reference file | Contents | Consumed by |
|----------------|----------|-------------|
| `reference/disasm/Object_3D_Data.asm` | **3D vector models** — TIE fighters, Death Star surface, towers, the trench (vertex + line-segment tables) | **8-2** (port → `src/core/models.ts`), then 8-3/8-4/8-5 |
| `reference/disasm/StarWars.asm` (386 KB) | Full game program — spawn cadence, wave/phase structure, scoring, difficulty | 8-3, 8-4, 8-5, 8-6 (behaviour constants) |
| `reference/disasm/SW_M_Hi.asm` | Math Box routines + high-score handling | 8-1 (math validation), 8-6 (high scores) |
| `reference/disasm/Memory_Locations.asm` | RAM / variable map | cross-reference when decoding constants |
| `reference/disasm/Direct_Page.asm` | 6809 direct-page (zero-page) variable map | cross-reference when decoding constants |

### Disassembly → story map (sound board, POKEY + TMS5220)
| Reference file | Contents | Consumed by |
|----------------|----------|-------------|
| `reference/disasm/sound/SW_Sound.asm` | Sound CPU main program | **8-7** |
| `reference/disasm/sound/FX_Functions.asm`, `FX_Tables.asm` | POKEY SFX routines + tables | 8-7 |
| `reference/disasm/sound/Music_Functions.asm`, `Music_Tables.asm` | Music sequencer + data | 8-7 |
| `reference/disasm/sound/Speech_Functions.asm`, `Speech1.asm`…`Speech23.asm` | TMS5220 LPC speech, line by line ("Use the Force, Luke," "Red 5 standing by") | 8-7 |

### External references (links only — not vendored)
- **nmikstas/star-wars-arcade-audio** — <https://github.com/nmikstas/star-wars-arcade-audio>
  Disassembled audio firmware (`Star_Wars_Sound_ROM.asm`) + MATLAB speech analysis
  (`StarWarsSpeech.m`). Cross-check for POKEY/TMS5220 decoding in 8-7.
- **wardclan** (`www.wardclan.f9.co.uk`, offline) — origin of the AVG vector
  disassembler/assembler tooling this material traces back to.
- **MAME Star Wars driver** — behavioural ground truth for timing/feel when the
  disassembly is ambiguous.

### In-repo references (patterns to mirror, from tempest)
- Fixed-timestep loop: `tempest/src/shell/loop.ts` (mirrored at `star-wars/src/shell/loop.ts`)
- Seeded PRNG carried in state: `tempest/src/core/rng.ts`
- High-score table + localStorage: `tempest/src/core/highscore.ts`, `tempest/src/shell/storage.ts` → reuse pattern for 8-6
- Vector glow render + attract/title framing: `tempest/src/shell/render.ts`, `tempest/src/shell/fx.ts`
- WebAudio SFX + POKEY bake tooling: `tempest/src/shell/audio.ts`, `tempest/tools/` → reuse approach for 8-7
- Game-level conventions: `star-wars/CLAUDE.md` (roadmap, boundary rule, ports)

## Geometry connectivity (read before 8-4/8-5)
> Architect note, recorded during the 8-3 follow-up after the TIE fighters
> rendered as tangled wireframes in-game.

**The model EDGES in `src/core/models.ts` are reconstructed, not authentic.**
`reference/disasm/Object_3D_Data.asm` holds **vertex tables only** — the
line-segment connectivity lived in the AVG vector-draw routines and is **not
recoverable** by object from the disassembly we have (confirmed: no draw-list
refs in `StarWars.asm` either). The 8-2 port therefore auto-generated edges with
a **nearest-neighbour heuristic**, which is well-formed (valid indices, no
orphans) but **visually tangled** — polygon rims never close, spokes jump to
arbitrary vertices.

**Reconstruction debt — now fully cleared, but NOT in 8-3.** Every model's edges
were eventually rebuilt from the vertices' own structure and guarded by a
topology test, but one wave at a time: `DEATH_STAR_SURFACE` and `SURFACE_TOWER`
in **8-4**, `TRENCH` + the new `EXHAUST_PORT` in **8-5**, and finally
`TIE_FIGHTER` and `DARTH_TIE` in **8-10**. The first four are guarded by
`inducedSingleCycle` (every derived ring closes). The two TIEs are guarded by
`isSingleComponent` (connectivity) instead: their `deriveRings()` rings are
cross-panel / cross-body quads whose closure would *box* the ship, so 8-10
re-authored them by structure (solar panels + pylons + cockpit ball) and pins
single-component connectivity rather than ring-closure (see 8-10's deviation
log). ⚠️ **Correction:** an earlier version of this note claimed the TIEs were
"fixed for the TIEs (8-3 follow-up)… now guarded by a topology test." That was
false — `TIE_FIGHTER` and `DARTH_TIE` carried the unguarded 8-2 heuristic edges
(9 and 38 derived rings, none/almost none closing, no topology test) all the way
until **8-10**, which is when the mistake surfaced (during 8-5) and was finally
paid down. No model ships heuristic edges any more.

**The reconstruction pattern (apply per model in 8-4/8-5):**
1. **Group vertices into rings** — coplanar / equal-radius vertex sets are the
   real structure (hex panels, octagonal pods, square trench tiles).
2. **Close each ring into a loop**, ordered around its centroid (no self-cross).
3. **Add radial spokes** (rim→hub) and **struts** between stacked rings.
4. **Guard with a topology test** — reuse `inducedSingleCycle(edges, ringIndices)`
   in `tests/core/models.test.ts`; assert each rim/ring closes. Derive the ring
   indices from the geometry, never hardcode specific edges (mirrors the 8-2
   "assert well-formedness, never specific edges" contract).
5. **Eyeball on first render.** Structural tests catch tangles but **not
   orientation or scale** — every model must be viewed in-game once.

**Display orientation is a render concern, kept out of core.** Authentic
object-space axes do **not** match the in-game view: the TIE's solar panels
stack along the model's Y axis, so `shell/render.ts` applies a fixed
`TIE_ORIENT` (a `rotationX`/`rotationZ` from the Math Box) to face them at the
player. The authentic vertex data in `core/models.ts` stays untouched. Expect
the surface/trench models to need their own display orientation (floor in y=0,
towers on +y). Per-enemy facing (turrets tracking, etc.) is sim state and stays
in `core`.

## Cross-Story Constraints & Guardrails
1. **Determinism is non-negotiable.** Any new core module obeys the boundary
   above. If a test needs randomness, seed the RNG; if it needs time, pass `dt`.
2. **One math source.** No ad-hoc trig in `render.ts` or enemies — everything
   projective/spatial calls `math3d.ts`. Extend `math3d.ts` (with tests) rather
   than inlining matrix math elsewhere.
3. **Port data, don't vendor it.** Re-express disassembly tables as typed TS in
   `src/core/models.ts` / rules. **Never** move `reference/` content into `src/`
   or commit it. The public repo (github.com/slabgorb/star-wars) must stay clean —
   verified at scaffold time that no `.asm`/`reference/` is tracked.
4. **Serving:** Vite `base: '/star-wars/'`, dev/preview port **5274** (tempest is
   5273). The lobby tile + launch wiring for star-wars belongs to **epic 7**
   (story 7-3 registry / 7-7 canonical server), not here — coordinate, don't
   duplicate the serve path.
5. **Wireframe vector aesthetic.** Glowing lines on black, matching the arcade
   visual language. Cockpit HUD elements are vectors too.

## Story Sequencing
```
8-1 (Wave 0, DONE) ──▶ 8-2 (models) ──▶ 8-3 (Wave 1: space) ──▶ 8-4 (Wave 2: surface) ──▶ 8-5 (Wave 3: trench)
                                              │
                                              ├──▶ 8-6 (Wave 4: framing/HUD/high scores)
                                              └──▶ 8-7 (Wave 5: audio)
```
- **Critical path to a playable slice:** `8-2 → 8-3`. 8-2 (porting real models)
  has no dependency and unblocks everything visual; start there.
- 8-6 and 8-7 (framing, audio) can proceed once Wave 1 (8-3) gives them a game
  to frame and score.

## Open Decisions (resolve in-story, log as deviations)
- **Speech (8-7):** synthesise LPC directly from the `Speech*.asm` tables vs.
  bake to audio assets — decide in 8-7; keep assets out of git (`sfx/` ignored).
- **Input:** mouse-as-yoke is confirmed for v1 (`src/shell/input.ts`); gamepad
  is a future consideration, not in scope.
- **Filled vs. wireframe:** the original mixed wireframe with a filled cockpit
  frame — default to wireframe everywhere unless a story argues otherwise.

---
_Generated by `pf context create epic 8` from the sprint YAML; enriched with architectural references by The History Men (architect)._
