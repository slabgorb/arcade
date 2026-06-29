# Epic 9 Context

## Title
ROM-accurate TIE fighter flight AI

## Overview
Make Wave-1 TIE fighters move, attack, and present like the 1983 cabinet instead of the current straight-line ram-the-cockpit model. Today TIEs spawn at z=-1200 and fly dead-straight at the origin until they ram or are shot, ballooning to fill the screen with no swoop, weave, formation spread, or peel-away (the side-by-side: ours is a wall of overlapping wireframe; the cabinet shows distinct ships swooping in on banking arcs). Source of truth is the uncommented 6809 main-program disassembly in the gitignored `reference/disasm/` quarry, so recovery is genuine reverse engineering. Sequenced spike-first: a bounded RE spike (9-1) decodes the flight model and gates the rest; if RE stalls at the timebox, fall back to a feel-faithful approximation informed by what was learned.

## Metadata
- **Epic ID:** 9
- **Repo:** star-wars

## Architecture & Reuse
**Reuse-first. This epic adds no new framework and ideally no new module.** The
flight AI is *simulation state* and lives entirely in the existing enemy
machinery of `src/core/`. The work extends what is already there rather than
standing up anything new:

- `src/core/state.ts` — the `Enemy` interface and the Wave-1 constant block
  (`SPAWN_DISTANCE`, `SPAWN_SPREAD`, `ENEMY_SPEED`, `WAVE_SIZE = 3`, the fireball
  slots, hit radii). The RE'd numbers re-express as named constants here.
- `src/core/sim.ts` — `spawnTie()` (today: random lateral spawn at `z = -SPAWN_DISTANCE`,
  velocity aimed straight at the cockpit), `moveEnemy()` (today: `pos += vel·dt`,
  `orient = lookRotation(toCockpit(pos))` each frame), and `toCockpit()`. These
  three functions ARE the current flight model; 9-2/9-3 replace their bodies.
- `src/core/gameRules.ts` — `waveParams(wave)` already returns the per-wave knobs
  (`spawnInterval`, `enemySpeed`, `enemyFireInterval`, ramped by `RAMP_PER_WAVE`).
  Story 9-5 extends this table; do not invent a parallel difficulty mechanism.
- `src/core/math3d.ts` — **the one true Math Box.** Any curve/rotation/lerp the
  swoop needs is added here *with tests*, never inlined as ad-hoc trig in `sim.ts`
  or `render.ts`. Right-handed, looking down −Z.

**The hard boundary is sacred (same rule that governed epic 8).** `core/` is a
pure deterministic sim: no DOM/`window`/`canvas`, no `Date.now()`/`performance.now()`/
`Math.random()`/`requestAnimationFrame`. All time enters as `dt`; all randomness
comes from the seeded RNG carried in `GameState`. A swooping, weaving, peeling
flight path MUST therefore be a deterministic function of `(spawn seed, dt)` —
identical inputs yield identical trajectories, or the unit tests cannot pin it.

**The orient ↔ render boundary must be preserved (carried from 8-4/8-13).**
`core` computes both the motion AND the per-frame `orient` (`Mat4`); `shell/render.ts`
then applies a *fixed display correction* (`TIE_ORIENT`) so the authentic upright
model banks at the player. 9-2/9-3 change the **core** motion+orient; they must
NOT move banking math into the render layer, and must keep render's fixed
correction intact. Guarded by `tests/shell/render.tie-orient.test.ts` (asserts the
orient is *applied*) and `tests/core/tie-orientation.test.ts` (the core facing math).

**The `Enemy` interface will need to grow — this is the central type decision.**
Today an `Enemy` is `{pos, vel, kind, orient}` — i.e. a point sliding down a
straight line. A swoop/weave/peel model cannot be expressed through `vel` alone;
it needs explicit per-enemy **flight state**, seeded at spawn. At minimum a
maneuver **phase** (`'approach' | 'strafe' | 'peel'`) plus whatever parameters the
path reads (e.g. a path clock, an entry side / target lane offset, a curve seed).
Represent this as typed fields on `Enemy` (or a nested `flight` record) — do **not**
smuggle it through `vel` or stringly-typed flags. Lock the shape in 9-1's model
doc and the first 9-2 test; every later story reads it.

## Reference Material
> The cabinet disassembly is the authoritative source for this epic. It lives in
> the **gitignored `star-wars/reference/disasm/` quarry** — a derivative of
> Atari's copyrighted ROM, kept only as a local learning resource. We *read* it to
> recover real numbers and re-express them as our own TypeScript; we never
> redistribute or commit it. (A duplicate copy was accidentally committed under
> `docs/references/` and removed in the `chore/untrack-reference-disassembly`
> branch; `docs/references/` is now gitignored too. Use `reference/disasm/`.)

### Disassembly → story map (main board, Motorola 6809E)
| Reference file | Contents | Consumed by |
|----------------|----------|-------------|
| `reference/disasm/StarWars.asm` (386 KB) | Full game program — the **TIE spawn / per-frame motion / attack-pattern / peel-away / wave-ramp logic** lives here. Uncommented IDA auto-labels (`sub_XXXX`, `loc_XXXX`). | **9-1** (decode the flight model), then 9-2…9-5 (port the recovered numbers) |
| `reference/disasm/SW_M_Hi.asm` | Math Box routines | **9-1** (decode the curve/rotation math the motion drives through the Math Box) |
| `reference/disasm/Memory_Locations.asm` | RAM / variable map | **9-1** cross-reference — name the object position/velocity/state slots the update loop reads & writes (the 3-TIE slot array) |
| `reference/disasm/Direct_Page.asm` | 6809 direct-page (zero-page) variable map | **9-1** cross-reference when decoding the per-frame variables |
| `reference/disasm/Object_3D_Data.asm` | 3D vertex tables (TIE/Darth models) | **Not this epic** — models were ported in 8-2; behavior, not geometry, is the subject here |

### Out of scope (separate epic — do not pursue here)
The user also provided **AVG vector-RAM dumps** (`swspace.bin`, `swstrench2.bin`,
`swscore.bin`, `swinten.bin`) plus the **DAVGAD** disassembler and the AVG
instruction-set spec, in `~/Downloads/DAVGAD/`. Those decode to authentic vector
*connectivity* (model **edges**) and unblock the long-standing
**authentic-vector-edges** task (`star-wars/docs/HANDOFF-authentic-vector-edges.md`).
That is a *drawing/geometry* concern, not flight behavior — it is a different
epic. Keep it out of epic 9.

### In-repo references (patterns to mirror)
- Seeded PRNG carried in state: `star-wars/src/core/rng.ts` (`nextFloat`) — the
  only sanctioned randomness for spawn lanes / curve variation.
- Existing Wave-1 behavior & its tests: `tests/core/space-combat.test.ts`,
  `tests/core/combat-kill-loop.test.ts`, `tests/core/shootable-fireballs.test.ts`,
  `tests/core/tie-orientation.test.ts`, `tests/core/difficulty.test.ts`.
- Game-level conventions / boundary rule: `star-wars/CLAUDE.md`.

## Reverse-Engineering Approach (story 9-1, the gating spike)
The disassembly is unannotated, so 9-1 is real RE, not a table lift. Suggested
attack (the Dev/Architect doing 9-1 should record what actually worked):

1. **Anchor on the draw, trace back to the motion.** 3D objects are streamed
   vertex-by-vertex through the Math Box (`Math_XT2/YT2` at `$5040`) and drawn via
   `EVGGO` (`$4600`) — established in the authentic-edges handoff. The code that
   *writes each TIE's world position* runs **before** that draw, in the per-frame
   object-update loop. Find the loop that iterates the active-object/TIE slots and
   updates their coordinates.
2. **Name the RAM.** Cross-reference `Memory_Locations.asm` / `Direct_Page.asm` to
   label the position / velocity / phase / timer bytes the loop touches. The
   authentic "3 TIE slots / 6 fireball slots" caps are known — expect a small
   fixed slot array.
3. **Decode the curve.** Follow the Math Box calls (`SW_M_Hi.asm`) to recover how
   heading/curve/banking is computed each frame — this is the swoop/weave math to
   re-express in `math3d.ts`.
4. **MAME is behavioral ground truth.** Where the asm is ambiguous about
   timing/feel, the `starwars` MAME driver running the ROM is the oracle.
5. **Deliverable:** `star-wars/docs/tie-flight-ai-model.md` — a *written model*
   (spawn distribution, per-frame update, curve/bank, fire timing, peel/exit
   condition, per-wave knobs), **no production code**, with the decision gate
   recorded.

**Decision gate (bounded spike):** one focused session. If the model is
recoverable → 9-2…9-5 port it faithfully. If RE stalls at the timebox → fall back
to a *feel-faithful approximation* informed by whatever partial findings the spike
captured. Either outcome unblocks 9-2; record which path was taken and why.

## Cross-Story Constraints & Guardrails
1. **Determinism is non-negotiable.** Trajectories are pure functions of seed + `dt`.
   No wall-clock, no `Math.random()`; seed every lane/curve choice through the RNG.
2. **One math source.** Curve/rotation/projection math goes through `math3d.ts`
   (extend it with tests); never inline trig in `sim.ts`/`render.ts`.
3. **Port data, don't vendor it.** Re-express recovered numbers as typed TS
   constants in `state.ts`/`gameRules.ts`. **Never** move `reference/` (or
   `docs/references/`) content into `src/`, and never commit it — the public
   `github.com/slabgorb/star-wars` repo must stay clean of the disassembly.
4. **Don't regress the Wave-1 contract.** The 8-x suites above must stay green, or
   change deliberately with a logged deviation. Preserve the authentic **3-TIE /
   6-fireball slot caps** and the existing kill/score/collision behavior.
5. **Preserve the orient ↔ render boundary** (see Architecture): core owns
   motion+orient; render owns the fixed `TIE_ORIENT` display correction.
6. **Bound on-screen scale in the sim, not the render (9-3).** The "full-frame
   wall" is a *behavior* defect — TIEs that never peel away. Fix it via the
   peel-away/exit lifecycle in `core`, not a render-side scale clamp that would
   mask the behavior.
7. **Tests catch trajectories, not feel.** Unit tests pin determinism and shape,
   but banking/scale/aggression must be **eyeballed in actual Wave-1 play** before
   any behavioral story is called done (the `/models.html` sheet shows *models*,
   not flight — watch the game).

## Story Sequencing
```
9-1 (RE spike — GATES everything) ──▶ 9-2 (port flight model to core)
                                          │
                                          ├──▶ 9-3 (peel-away / fly-past lifecycle)   [MVP]
                                          ├──▶ 9-4 (strafe-and-fire timing)           [stretch]
                                          └──▶ 9-5 (per-wave AI difficulty ramp)      [stretch]
```
- **Critical path to closing the Image-1 → Image-2 gap:** `9-1 → 9-2 → 9-3`.
  9-2 gives TIEs real approach paths; 9-3 stops them ballooning into the cockpit.
- 9-4 and 9-5 deepen fidelity once the core motion model from 9-2 exists; both
  read the flight-state shape locked in 9-2.

## Open Decisions (resolve in-story, log as deviations)
- **`Enemy` flight-state shape** — phase enum + path params vs. a richer maneuver
  record. Lock in 9-1's model doc and the first 9-2 test (see Architecture).
- **Fidelity vs. fallback** — resolved by 9-1's decision gate; record the path taken.
- **Lateral formation spread** — the cabinet's readable left/right pairing. Fold
  into 9-2's spawn (seeded lanes) unless the RE shows it belongs elsewhere.
- **Peel-away re-entry** — does an exited TIE loop back for another pass or free
  its slot for a fresh spawn? Decide in 9-3 per the RE'd model.

---
_Generated by `pf context create epic 9` from the sprint YAML; enriched with architectural references by The Dark Side (architect)._
