# Red Baron — epic roadmap design brief

**Date:** 2026-07-08
**Author:** Architect (The History Men)
**Status:** Approved (roadmap epic set; one epic per game state)
**Epics:** `rb1`–`rb5` — Red Baron (1980), full faithful vector clone
**Canonical source:** https://github.com/historicalsource/red-baron (Rich Moore's `RBARON.MAC` et al.)

---

## 1. Why Red Baron, why now

The seventh subrepo in the arcade cabinet (after tempest, lobby, star-wars,
asteroids, battlezone, and the `arcade-shared` library). *Red Baron* (Atari,
1980) is a **first-person WWI biplane dogfight** over a green vector landscape —
mountains, a mountain pass, balloons, ground targets. It is **Battlezone's
hardware twin**: the same Math Box 3D coprocessor and Analog Vector Generator
(the source ships `MBUCOD.MAC` math-box microcode and the `VGxx.MAC` vector
utilities). It adds the one thing no prior arcade game had: **you leave the
ground.** Full flight — bank, climb, dive — and the signature **tilting horizon**
that rolls as you bank. Battlezone's camera is yaw-only on a flat plain; Red
Baron's is true pitch + roll + yaw.

**Why now:** the shared-library epic (`SH`) is complete. `@arcade/shared` is
mature and battle-tested (math3d/rng/highscore/loop, consumed by every existing
game). Red Baron is the **first arcade game built as a native `@arcade/shared`
consumer from day one** rather than a retrofit — a greenfield validation of the
SH investment. This is a **roadmap epic set**, not current-sprint work; no
dependencies on other open epics (SH's are all `done`).

## 2. Scope & fidelity

Faithful clone anchored to the `historicalsource/red-baron` disassembly (our
"ROM is canonical" rule). The authoritative game design spec is `rb1`'s
deliverable, quarried from the source and authored inside the `red-baron/`
subrepo — mirroring how `bz1-2` produced Battlezone's source-findings doc.

**In scope (the full game, across `rb1`–`rb5`):**
- First-person 3D vector world: **horizon that tilts with bank**, mountains, a
  fly-through mountain pass, ground plane/terrain, balloons, ground objects.
- Flight model: **bank-to-turn** (roll induces yaw), pitch (climb/dive),
  altitude. (Forward motion is implicit/constant — the ROM has **no throttle**;
  corrected per the rb1-2 fidelity spec.)
- Aerial combat: enemy biplanes (including the Red Baron), dogfight AI,
  machine-gun fire, hit/collision, explosions, scoring, waves, lives.
- Ground sequence (`GRMODE`, `D7=GROUND`): dive to strafe ground objects (5
  ground shells), ground collision, mountain-pass run.
- Attract mode: self-running demo flight, banner, cycling high-score table.
- High-score entry + display — **via `@arcade/shared/highscore`** (§3).
- POKEY sound from `RBSOUN.MAC`: engine, machine gun, explosions, etc.

**Descoped (standing arcade rules):**
- **Coin-op mechanics** — no "insert coin," no attract-mode quarter pressure.
  (No money model.) Score-based progression stays; that's real, not
  quarter-extraction.
- **Difficulty-ceiling gold-plating** — ratchet aggression **up to** the ROM
  ceiling, never past it; don't over-invest in deep waves nobody reaches.
- **Known ROM bugs** — per-story judgment; lean toward NOT replicating a defect
  that degrades play.

## 3. Architecture

Mirrors every arcade game: `src/core` (deterministic sim) / `src/shell`
(render · input · audio · loop). Canvas 2D glowing vectors, no backend, no 3D
engine.

- **New gitignored subrepo `red-baron/`** — own git history, gitflow (`develop`
  default), TypeScript + Vite 8 + Vitest 4 + ESM. Pinned dev port **5277**
  (`strictPort`; 5276 = battlezone is the current top pin), base `/red-baron/`,
  registered in `.pennyfarthing/repos.yaml`, added to `just serve`, routed in
  `cloudflared` (`^/red-baron → :5277`, ahead of the lobby catch-all), given a
  lobby tile.

### Reuse spine — *consume `@arcade/shared`, don't port*

This is the deliberate departure from Battlezone's "port and defer." When `bz1`
was designed, `@arcade/shared` did not exist, so it ported `math3d` from
star-wars. It exists now, and `SH` is done — so Red Baron **consumes** it,
pinned to `github:slabgorb/arcade-shared#v0.5.0`:

| Shared module | Red Baron uses it for | Payoff |
|---|---|---|
| `/math3d` | roll/pitch/yaw camera + tilting horizon: `rotationZ(roll) ∘ rotationX(pitch) ∘ rotationY(yaw) → viewMatrix` | **The single hardest new piece is already-debugged shared code.** Battlezone needed only yaw; the extracted module is true 3D (`rotationX/Y/Z`, `viewMatrix`, `lookRotation`, `perspective`). The horizon tilt falls out of `rotationZ` in the view matrix. |
| `/loop` | fixed-timestep accumulator | no bespoke loop (carries asteroids' `last===0` fix) |
| `/rng` | seeded PRNG (mulberry32) | determinism / replay for free |
| `/highscore` | `{gameId}-high-scores` contract, generic domain field, row validator | `rb5` is thin wiring; **battlezone's `SH-6` is the exact template**; the lobby already reads `red-baron-high-scores` by the shared key-builder |

**Stays local** (per SH's eligibility bar — *game-specific code is never shared*):
the flight sim (`src/core`), the render pipeline (`src/shell/render`), the input
map, enemy AI, the ground sequence, and POKEY sound.

**Pin note:** this local `arcade-shared/` checkout is stale (shows `v0.2.0`,
math3d-only). The real exports live in the **published remote tags** (latest
`v0.5.0`); the git-URL dependency resolves against the remote, not the local
tree. `rb1` confirms the exact latest tag via `git ls-remote --tags`.

## 4. Epic roadmap — one epic per game state

Grounded in `RBARON.MAC`'s `GAMODE` dispatch (the `.SBTTL STATES` section). The
ROM's top-level states are attract / play / high-score-display / high-score-entry;
`play` is split by the ROM's own `GRMODE` aerial↔ground sub-mode.

| Epic | Game state (`GAMODE`) | Scope | First-playable |
|---|---|---|---|
| **`rb1`** | *(foundation)* | Quarry & Foundation — extraction + runnable shell | — |
| **`rb2`** | PLAY / aerial | flight model, tilting horizon, enemy planes, dogfight AI, firing, collision, explosions, scoring, waves, lives | ✅ fly + dogfight one plane |
| **`rb3`** | PLAY / ground (`GRMODE D7`) | dive-and-strafe mode, ground objects/shells, ground collision, mountain-pass run | |
| **`rb4`** | ATTRACT (`0`) | demo flight, banner, high-score-table cycle, RTP/timeout (needs PLAY to demo) | |
| **`rb5`** | HIGH-SCORE (`3` display / `7` entry) | consume `@arcade/shared/highscore`; entry + table display; lobby reads `red-baron-high-scores` | |

Each epic's detailed story map is materialized separately through the pf epic
flow. The overall game is **playable by `rb2`** (fly, bank, dogfight one enemy);
the rest layers ground combat, attract, and the score table.

### `rb1` — Quarry & Foundation (the first epic), in detail

- **Quarry:** copy `historicalsource/red-baron` into `reference/` (gitignored);
  produce fidelity specs for:
  - **mechanics** — flight model, bank-to-turn coupling, enemy plane/balloon
    behavior, ground-sequence rules;
  - **timing** — authentic frame cadence (⚠ *watch for a ÷N ROM tick like the
    Asteroids ÷4 cadence* — ports that tick every frame run too fast);
  - **sound** — `RBSOUN.MAC` POKEY tables + routines;
  - **object data** — `PLANE POINTS DB`, the `036xxx/037xxx` picture-ROM vector
    tables, `RBGRND.MAC` ground objects.
- **Foundation:** scaffold the subrepo; wire `@arcade/shared@v0.5.0`; build the
  flight camera (roll/pitch/yaw → `viewMatrix`) on shared `math3d`; register
  everywhere (repos.yaml / justfile / cloudflared / lobby tile / port 5277).
- **Exit criterion:** a **runnable banking cockpit flying over vector terrain**,
  plus the fidelity spec that seeds `rb2`–`rb5`.

## 5. Naming decision (why `rb1`, not `rb-1`)

`pf` derives story IDs as `{epic}-{n}` and several non-fallback workflow paths
recover the epic via `story_id.split("-")[0]`. Epic `rb-1` → stories `rb-1-N` →
`split("-")[0]` = `"rb"`, which `find_epic` will not match. Using `rb1` (single
dash) makes `split("-")[0]` = `"rb1"` = the epic id, so every path works
(`pf sprint story field`, the handoff context gate, `pf context generate`).
Future Red Baron epics are `rb2`, `rb3`, … — the numbered-epic namespace,
tooling-safe. (The subrepo *directory* and dependency name stay `red-baron/`,
hyphen and all, exactly like `star-wars`.)

## 6. Key decisions (alternatives considered)

| Decision | Chosen | Alternative rejected because |
|---|---|---|
| Math Box source | **Consume `@arcade/shared/math3d`** | Porting from battlezone would reintroduce the exact duplication `SH` just eliminated; the shared module is mature and already true-3D. |
| `rb1` scope | **Extraction + runnable foundation** | Extraction-only leaves `rb2` with no home; folding scaffold + quarry into one foundation epic mirrors `bz1-1` + `bz1-2`. |
| PLAY decomposition | **Split aerial + ground (2 epics)** | One mega-epic makes `rb2` huge and slow to first-playable; the ROM's own `GRMODE` sub-mode is a natural, balanced seam. |
