# Defender — `df4` the menagerie design (enemies, collision, and the first effects that kill)

**Date:** 2026-08-16
**Author:** Architect (Mimir)
**Epic:** `df4` — phase 4b of the framebuffer-raster cabinet build
**Roadmap parent:** `docs/superpowers/specs/2026-08-13-defender-cabinet-roadmap-and-df1-design.md` §4 `df4`
**Standing rule cited:** `docs/adr/0005-photosensitivity-accessibility-exception.md`

`df3` gave us a ship flying a scrolling, wrapping world with lasers that fire and travel but
hit nothing. `df4` populates that world: one cited reducer per enemy family, the collision
seam every one of them shares, and the materialize/explode effects that make an enemy appear
and die — the first effects in the cabinet that *end* something. It is also where the
photosensitivity accessibility exception is **decided and built**, not deferred (ADR-0005).

**Pixels-before-physics is already paid.** `df2-4` transcribed the `DEFB6`/`SAMEXAP7` object
image tables INERT — the enemy *pictures* already exist on disk, byte-verified under the gate.
`df4` gives those pictures *behaviour*. No enemy story re-transcribes a sprite; it wires an
already-proven image table to a reducer.

---

## 1. What `df1`/`df2`/`df3` settled that this seam stands on

- **The citation gate + src/core purity test** (`df1-1`): every constant `df4` introduces
  re-opens under the gate — no `src/core` enemy value without a `claims/*.json` entry citing
  `defender/<FILE>.SRC:<line>`.
- **The framebuffer render seam** (`df2-1/2-2`): `framebuffer.ts` (292×240 4-bit index
  surface) + `render.ts` (index→RGBA). New enemies reach colour **by index only, never hex.**
- **The object image tables, INERT** (`df2-4`): `DEFB6` inline object graphics (`OBI` headers,
  UFO picture at `defender/DEFB6.SRC:1953`) and `SAMEXAP7` "SAM EXPLOSIONS AND APPEARANCES"
  (`defender/SAMEXAP7.SRC:6-7`) are transcribed and gated. `df4` blits them from reducers.
- **The process scheduler** (`df3-1`): `scheduler.ts` — `makeProcess`/`kill`/`sleep`/
  `stepTick()`. **Every enemy is a scheduler process** (`NEWP …,STYPE`), exactly as the ROM
  spawns them. No enemy invents its own clock.
- **The world/camera coordinate model** (`df3-2`): `world.ts` — BGL camera, the $10000
  horizontal wrap, `worldX(entity)=onscreen+bgl`. Enemies live in **display space** (OX16/OY16)
  and the pure `worldX` helper places them; collision and the scanner (df5) read the same model.
- **The laser** (`df3-5`): `laser.ts` fires and travels, max-4. `df4` is where a laser finally
  *hits*.

## 2. Decision A (RULED): port `COLIDE`'s own object-list model, not a re-derived collision system

Same discipline as `df3`'s world model — **ROM-always-wins**: `df4` ports the ROM's own
collision representation into `src/core/collision.ts`, cited, rather than importing a tidier
quadtree/AABB library.

`COLIDE` (`defender/DEFA7.SRC:2907`, banner `*COLLISION DETECT` at `:2904`) walks the object
pointer table `OPTR` and tests candidates against a box, returning a collision picture
(`*RET+2=COLLISION PICT`, `defender/DEFA7.SRC:2553`) and a screen collision address
(`CENTMP`, `defender/DEFA7.SRC:3008`). It has three cited call sites, and they are the three
kinds of collision `df4` must produce:

| Call site | ROM line | `df4` meaning |
|-----------|----------|---------------|
| Laser collision | `defender/DEFA7.SRC:2775-2787` (`JSR COLIDE` at 2787) | player laser hits an enemy |
| Bomb collision | `defender/DEFA7.SRC:2699` | an enemy/mine hits the player |
| Collision check (per-process) | `defender/DEFA7.SRC:3130-3142` (`JSR COLIDE` at 3142) | player ship touches an enemy |

**Why port, not re-derive:** the ROM's hit test is an object-pointer-list scan with the ROM's
own box semantics; a re-derived "cleaner" collision would silently change which overlaps count
(routing ≠ geometry, the `df3` lesson). `collision.ts` is pure, takes a snapshot of the object
list + the querying box, returns the hit — the shell owns nothing. Built and unit-tested
against **synthetic** object lists before any enemy exists, so every later enemy story inherits
a ready, gated hit test. **This is `df4-1`, first.**

## 3. Decision B (RULED): the accessibility exception is built here — see ADR-0005

The materialize/explode effects (`SAMEXAP7` `APST` appear / `EXST` explode,
`defender/SAMEXAP7.SRC:16-17`) are the first effects that render a death. Two of them, plus
`df5`'s smart-bomb and hyperspace, are **full-screen strobes** in the ROM — a seizure trigger
for the owner. Per ADR-0005, `df4-2` builds one pure **effect policy** in `src/core`:
localized effects raster normally; full-frame strobes render as **freeze/fade/particle**. The
ROM trigger + timing are ported and cited; only the strobe *presentation* is substituted, and
that substitution is logged as a Design Deviation citing ADR-0005, and pinned by a render-side
guard that no effect writes a whole-framebuffer inversion in a single frame. **`df4` decides
this; `df5`/`df7` cite it.**

## 4. The menagerie, by the ROM's OWN labels (identity mapping is a cited dossier task)

The Williams source names enemies in its **internal** vocabulary, which does **not** map 1:1
to the arcade-marketing names (Lander/Mutant/Baiter/Bomber/Pod/Swarmer). To avoid baking a
wrong identity claim, `df4` stories cite the **process label + the source's own comment**, and
each story's first job is to map `<ROM label>` → arcade enemy in the brief/dossier, **cited**,
before writing the reducer. The processes present in `DEFB6.SRC` (all line numbers from tool
output):

| ROM label | Banner / line | Notes for the mapping |
|-----------|---------------|------------------------|
| `UFOST`/`UFOLP` | `*UFO PROCESS START` `DEFB6.SRC:5,25` | UFO velocity/shoot logic; the timeout pursuer |
| `LANDS0` | `*START LANDERS` `DEFB6.SRC:649,657` | the base ground enemy |
| `*LANDER KIDNAP` | `DEFB6.SRC:688` | grabs a humanoid |
| `*ASTRONAUT PROCESS` | `DEFB6.SRC:290` | the humanoid |
| `*KILL KIDNAPPING LANDER` → `AFALL` | `DEFB6.SRC:903,911` | shot carrier → humanoid falls |
| `SCZS0`/`SCZ0` | `*START SCHITZOS` `DEFB6.SRC:585,592` | the "schizoid" — mutant behaviour |
| `MSWM` / swarm | `*MAKE A MINI SWARMER` `DEFB6.SRC:141,151`; `*MINI SWARM PROCESS` `:195`; `*SWARM BOMB` `:251` | the swarm |
| `*PROBE START` | `DEFB6.SRC:85,116` | probe |
| `*TIE PROCESS` | `DEFB6.SRC:1023-1024` | mine-layer candidate; own colour table `:1206` |
| `*START BOMB` | `DEFB6.SRC:1134` | bomb/mine |
| `TERBLO` | `*…BLOW UP TERRAIN` `DEFB6.SRC:434,437` | player-death terrain explosion (ADR-0005) |
| `P250`/`P500` | `DEFB6.SRC:408,496-503` | rescue/kill scoring hooks — **scoring is df5**, not df4 |

**Scope fence:** `df4` gives enemies *existence, motion, spawning, collision and death*.
**Scoring, waves, rescue bonuses, smart-bomb, hyperspace, the scanner and 2P are `df5`.** The
`P250/P500` scoring processes are named only so `df4` does not accidentally implement them.

## 5. Reuse-first ledger (what `df4` consumes vs writes)

| Consumes (already built + gated) | Writes (new, gated) |
|----------------------------------|---------------------|
| `scheduler.ts` (df3) — enemies are processes | `collision.ts` — the ported `COLIDE` object-list hit test |
| `world.ts` (df3) — display space + `worldX` | `effects.ts` — appear/explode + the ADR-0005 policy |
| `framebuffer.ts` / `render.ts` (df2) — index blit | one reducer per enemy family (`landers.ts`, `mutants.ts`, `swarm.ts`, …) |
| `DEFB6`/`SAMEXAP7` image tables (df2-4, INERT) | the render-side no-full-frame-strobe guard (ADR-0005) |
| `laser.ts` (df3) — the thing that hits | claims/*.json entries for every new constant |

**No new `@shared` extraction.** The enemy reducers are defender-specific; the collision model
is the ROM's, with no second consumer — the "extract on the second game" bar is not met (same
call as `df3`'s coordinate model).

## 6. Story cut (≈21 pts, TDD, gate before constants, collision + effects first)

1. **`df4-1` Collision core (RED first)** — `src/core/collision.ts`: port `COLIDE`'s
   object-pointer-list box test (`DEFA7.SRC:2904-2907`), the collision-picture return
   (`:2553`), and the three cited query shapes (laser `:2775-2787`, bomb `:2699`, ship
   `:3130-3142`). Pure; unit-tested against synthetic object lists; no enemy needed yet. **5 pt.**
2. **`df4-2` Materialize/explode effects + the ADR-0005 policy** — `src/core/effects.ts`:
   `SAMEXAP7` `APST`/`EXST` (`SAMEXAP7.SRC:16-17`) lifecycle over the df2-4 INERT tables; the
   effect-policy classifier + the render-side no-full-frame-strobe guard; log the deviation
   citing ADR-0005. **3 pt.**
3. **`df4-3` Landers + humanoid abduction (the signature loop)** — `LANDS0` (`DEFB6.SRC:657`),
   `*LANDER KIDNAP` (`:688`), `*ASTRONAUT PROCESS` (`:290`), shot-carrier → `AFALL`
   (`:903,911`). Grab → carry-to-top → transform trigger. Consumes df4-1 + df4-2. **5 pt.**
4. **`df4-4` Mutants (`SCZ`) + the UFO/baiter** — `SCZS0`/`SCZ0` (`DEFB6.SRC:585,592`) mutant
   behaviour (a lander that reached the top), and `UFOST`/`UFOLP` (`:5,25`) the timeout
   pursuer. **3 pt.**
5. **`df4-5` Bombers, mines, pods & swarmers, probes** — `*START BOMB` (`DEFB6.SRC:1134`),
   `*TIE PROCESS` (`:1023`), `MSWM`/swarm (`:141,151,195,251`), `*PROBE START` (`:85`). The
   shoot-releases-swarmers mechanic. If the pod→swarm spawn proves heavy, expect it to file a
   follow-up (the roadmap's file-by-surface habit). **3 pt.**
6. **`df4-6` VISUAL playtest** — screenshot `http://127.0.0.1:5270/defender/`: enemies
   materialize, a laser kills one via the **accessibility-safe** explosion, a lander abducts a
   humanoid — compared against a nonsense control path (must DIFFER, not just 200; the
   canonical-serve lesson). Carry the df5 accessibility note (smart-bomb/hyperspace) forward.
   **2 pt.**

Total ≈ **21 pts**. Order is load-bearing: **collision and effects first** (every enemy needs
both), then the abduction loop (the game's heart), then the remaining families, then the eyes.

## 7. Traps carried into `df4` (so a story does not re-discover them)

- **Enemy identity is a cited mapping, not a guess.** The ROM's `UFO`/`PROBE`/`TIE`/`SCZ`
  labels are Williams-internal; map them to arcade names in the dossier, cited, before naming
  a reducer. A wrong identity in prose ships GREEN (the `prose-claims-are-the-unguarded-surface`
  lesson).
- **Enemies are scheduler processes** — spawned via `NEWP …,STYPE`, killed via the df3 kill
  path. Do not give an enemy its own `requestAnimationFrame` or its own tick.
- **Colour by index only.** New visuals reach the df2 palette by INDEX; no enemy introduces a
  hex colour.
- **ADR-0005 is not optional and not retrofitted** — the no-full-frame-strobe guard lands with
  `df4-2`, before any death renders. `df5`'s smart-bomb/hyperspace cite it; do not re-decide.
- **Line numbers from tool output only; RASM radix** ($hex vs bare decimal) — the standing
  `df*` citation traps.
- **Scoring/waves/scanner/smart-bomb are df5.** `P250`/`P500` are named to be avoided, not
  built.

## 8. Handoff

To SM: materialize `sprint/epic-df4.yaml` (done alongside this spec) and add `df4` to the
sprint when df1's residue (`df1-10`) and ml10 clear, or as owner prioritises. `df4-1`
(collision) is the RED-first entry point; it stands only on df1/df2/df3, all shipped.
