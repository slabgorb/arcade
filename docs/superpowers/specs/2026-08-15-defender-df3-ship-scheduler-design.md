# Defender — `df3` the ship + the scheduler design (physics on the wrapping world)

**Architect:** Vito Cornelius · **Date:** 2026-08-15 · **Phase:** playbook §4a
(the process kernel + the player ship + the scrolling wrap-around world).
**Epic opened:** `df3` (scheduler core + ship velocity/thrust/reverse + world-wrap
camera + stars + laser).
**Predecessors:** `df1` — DONE (`sprint/epic-df1.yaml`; dossier at
`plugins/defender/docs/rom-study/`, citation gate + `src/core` purity test).
`df2` — the framebuffer render seam (`plugins/defender/src/core/framebuffer.ts`
index surface ↔ `src/shell/render.ts` blit), palette, charset, object tables,
terrain — pixels, INERT. Every constant `df3` introduces re-opens under the
`df1-1` gate — **no `src/core` value without a `claims/*.json` entry.**
**Roadmap parent:** `docs/superpowers/specs/2026-08-13-defender-cabinet-roadmap-and-df1-design.md`
§4 `df3` (≈24 pts) — "the novel-heavy epic", "the one to watch". This document
sharpens that paragraph into the core kernel + coordinate seam and the groomed
story cut, using what `df1`/`df2` actually settled.

> **Scope wall.** `df3` is **the ship moving through a live, scrolling, wrapping
> world** — the first epic that steps a clock. It builds: the cooperative process
> scheduler, the player ship (thrust / reverse / vertical, sub-pixel velocity),
> the world-wrap coordinate system + camera, the parallax starfield, and the
> laser. It does **not** build: enemies / the menagerie / collision-against-enemies
> / materialize-explode (`df4`), waves / scanner / smart bomb / hyperspace / score
> / 2P (`df5`), sound (`df6`), the attract→play phase machine / HUD / showcase
> (`df7`). Smart-bomb and hyperspace flash the full screen in the ROM
> (`SBOMB` `defender/DEFA7.SRC:3199` `COM PCRAM`; `HYPER` `defender/DEFA7.SRC:3211`)
> — those live in `df5`, where the **accessibility ruling** (freeze/fade, not
> strobe — owner photosensitivity, the standing exception to ROM-always-wins)
> binds. **`df3` renders no full-screen flash.**

---

## 1. What `df1`/`df2` settled that this seam stands on

- **Cooperative process kernel, not a frame of straight-line updates.** Defender's
  game logic is a set of **processes** on a linked run-list, each yielding via a
  16-msec **nap**. The kernel is resident in `DEFA7`: `SLEEP`
  (`defender/DEFA7.SRC:12` — sleep the current process for A ticks, wake at X),
  `KILL`/`SUCIDE` (`defender/DEFA7.SRC:19,31`), `MKPROC`/`MSPROC`
  (`defender/DEFA7.SRC:72,56` — make a regular / super process off the `FREE`
  list), dispatched through `DISP2`. Process records carry `PTIME`/`PADDR`/
  `PTYPE`/`PCOD` (`brief.md` §subsystems; `subsystems.md` "Resident control").
  This is the **jt2 pattern** — Joust ran the same Williams cooperative kernel —
  but it is **re-derived and re-cited from *this* tree**, never imported from
  joust (`plugins/joust/src/core/` is a pattern reference in prose only).
- **Timebase binds here.** `df2` rendered a still and read no clock; `df3` is where
  the nominal 60 Hz / 16-msec tick (`brief.md` §3) becomes the scheduler's tick
  quantum. Exact 60.09615 Hz stays a separate recorded number; the sim is a
  fixed-timestep 60 Hz step, mirroring millipede's `logic rate is 60Hz` finding
  and joust's game-frame model. `@shared/loop` drives the shell rAF → fixed step;
  the core kernel never reads wall-clock (purity).
- **The IRQ model is resolved.** `df1-4` closed OQ-1/OQ-2/OQ-4: the video interrupt
  is the CB1 line, `COUNT240`/CA1 is never enabled (the handler polls `VERTCT`),
  and `$C3FC` is the screen-flip write, not a second watchdog. `df3`'s scheduler
  tick is the once-per-frame **sub-128 arm of the IRQ** (`DEFA7.SRC:1931` `IRQ`;
  the tick increments `TIMER`, and `EXEC0` spins on it, `DEFA7.SRC:3048-3050`).
  `df3` models the *effect* (one scheduler tick per frame) in core; the PIA/CB1
  wiring is a shell/board fact, not simulated.
- **The render seam is index-only.** Core emits palette **indices** into
  `framebuffer.ts`; the shell owns RGBA and canvas (`df2` §2). `df3`'s new visible
  output — the moving ship, the stars, the laser — composits **indices** into that
  same surface via pure blitters; colours are never invented (the standing rule).

## 2. THE core decision (RULED, not offered): port the ROM's own world/camera model

Defender's scrolling wrap-around world + camera is the hardest coordinate problem
in the cabinet (roadmap §4, "the one to watch") — and the arcade project's whole
premise is reproducing the cabinet **from the source**. So the model is **not**
an architecture choice to trade against a tidier re-derivation. `df3` ports the
ROM's own representation into `src/core`, line-for-line and citable. A
world-absolute rewrite whose scroll/slide math cannot be cited to a ROM line is
the "make it up" side, and it is rejected on sight (`ROM-always-wins`).

The ROM's model, read from `DEFA7.SRC` (`PLAY1`/`PV1..PV12`, `VELO`) and `PHR6.SRC`
(the data equates):

- **`BGL` is the camera.** `BGL RMB 2` "TERRAIN LEFT POINTER" (`defender/PHR6.SRC:215`)
  holds the **world-X of the screen's left edge**. The world is a **16-bit
  horizontal cylinder** — `BGL` and every world-X are 16-bit and wrap at `$10000`
  with no explicit clamp. `BGLX` "OLD TERRAIN LEFT" (`defender/PHR6.SRC:216`) is
  last frame's camera, used to compute the per-frame scroll delta for objects and
  stars.
- **Entities live in display space.** Objects hold `OX16`/`OY16` (16-bit on-screen
  X/Y, sub-pixel) and `OXV`/`OYV` velocities; `VELO` (`defender/DEFA7.SRC:2480-2499`)
  integrates them each tick. The player holds `PLAX16`/`PLAY16` (on-screen 16-bit),
  `PLAXV` (**24-bit** — 3 bytes, `defender/PHR6.SRC:332` — sub-pixel accumulation),
  `PLAYV`, and `PLADIR`/`NPLAD` (facing + thrust; sign bit = direction).
- **The ship leads the scroll.** The player does not sit centred: `PLAY1`
  (`defender/DEFA7.SRC:2373-2431`) maps the ship's velocity to a target screen
  column (base `$20` facing-right, `$70` facing-left), then slides `BGL` toward it
  by `BGDELT` (`±$40` steps, clamped to a `±$100` window) so the ship is pushed
  forward in the direction it flies. `BGL += PLAXV − BGDELT` (`DEFA7.SRC:2429-2431`).
  **This slide is the single riskiest seam in the epic** and the reason for the
  "port it, don't re-derive it" ruling — it is defined in *display* space, so an
  absolute-space rewrite would silently drift (`renderer-migration-routing-vs-geometry`).
- **Absolute world X is derived, not stored.** `PLABX` "ABSOLUTE X"
  (`defender/PHR6.SRC:335`) = `(PLAX16 >> ~2, masked) + BGL` (`DEFA7.SRC:2432-2440`;
  init `#$2000!>2 + BGL`, `DEFA7.SRC:1274-1276`). In core this is a **pure helper**
  `worldX(entity) = onscreenX + bgl`, unit-testable in isolation — the one clean
  abstraction over the ROM's dual-space model.
- **Vertical is a clamped strip, not a cylinder.** `YMIN EQU 42`, `YMAX EQU 240`
  (`defender/PHR6.SRC:20-21`). The **player** Y clamps to `[YMIN+1, 238]`
  (`PLAUP`/`PLADN`, `DEFA7.SRC:2450,2461`); **objects** wrap Y at `[YMIN,YMAX]`
  (`VELO`, `DEFA7.SRC:2490-2496`). Two different rules on the same axis — a trap
  worth a pinned test.

The seam, honouring the `src/core` (pure sim) / `src/shell` (render/input/clock)
boundary that `purity.test.ts` enforces:

```
src/core/scheduler.ts     pure cooperative kernel: a process run-list with
                          make / kill / sleep(nap) / step-one-tick. No clock read
                          — the SHELL calls stepTick() once per fixed 60Hz frame.
src/core/world.ts         pure world/camera model. bgl (camera), bglx (prev),
                          the 16-bit horizontal wrap, worldX(entity) helper,
                          the ship-leads-scroll slide (BGDELT / PV1..PV12).
src/core/ship.ts          pure player process: PLAXV (24-bit) accumulation,
                          thrust / reverse (PLADIR flip) / vertical clamp,
                          integrated by the VELO step.
src/core/stars.ts         pure parallax starfield: STRCNT active stars, scroll
                          by the BGL delta, wrap at the screen edges, phase mask.
src/core/laser.ts         pure laser: fire (max 4, LASR/LASL by facing), travel.
src/shell/render.ts       SHELL. composits ship/stars/laser INDICES into the df2
                          framebuffer; owns colour + canvas (unchanged seam).
src/shell/input.ts        SHELL. reads thrust/reverse/up/down/fire, hands the core
                          a pure input snapshot each tick (the ROM's PIA reads).
```

Core hands the shell **indices and positions**; the shell owns pixels, input
hardware and the clock, and never reaches back across the boundary.

## 3. Reuse-first ledger (what `df3` consumes vs writes)

**The best code is the code we did not write.** Before any new module, the existing
infrastructure `df3` extends:

| Need | Reuse | New only where |
|------|-------|----------------|
| Cooperative scheduler shape | **jt2's Williams kernel as a *pattern*** (`plugins/joust/src/core/` — prose reference only) | a **defender** `scheduler.ts` re-derived and re-cited from `defender/DEFA7.SRC:12-130`; not imported |
| Fixed-timestep 60 Hz drive | `@shared/loop` (rAF → fixed step; the fleet's loop) | nothing — the core kernel is clock-free; the shell calls `stepTick()` |
| Render surface + blit | `df2` `framebuffer.ts` + `src/shell/render.ts` (index→RGBA, `fitIntegerScale`) | pure index blitters for ship / stars / laser; no new colour path |
| Citation gate + `src/core` purity scan | `plugins/defender/tests/audit/citations.test.ts` + `purity.test.ts` (df1-1) | nothing — every `df3` constant enrols here |
| Palette indices for new sprites | `df2` transcribed palette (source-of-truth entries) | nothing — new visuals reach colour by **index**, never by hex |
| Input snapshot convention | fleet input pattern (`@shared` host-helpers; sibling `src/shell/input`) | a defender input map (thrust/reverse/up/down/fire) → pure snapshot |

There is **no new shared extraction** in `df3`: the scheduler is a *pattern* reuse
(the code is re-cited from defender's own tree, so it is not a shared module), and
the coordinate model is defender-specific (no second consumer). The `CLAUDE.md`
"extract on the second game" bar is **not** met by anything here — do not force a
premature `@shared` scheduler.

## 4. Story cut (≈24 pts, TDD, gate before constants, scheduler first)

Mirrors joust's `jt2` arc (kernel → player → world → effects) bound to *this*
tree's `DEFA7`/`PHR6` map. Each story is single-sided-cited into
`reference/original-source/defender/`; MAME appears in prose only, on board facts
the source never states. Scheduler is first (nothing runs without the kernel); the
world/camera model is designed in core from day one (roadmap §4).

- **`df3-1` — Cooperative process scheduler core (RED first).** `src/core/scheduler.ts`:
  a process run-list with `makeProcess` (`MKPROC`, `defender/DEFA7.SRC:72`), `kill`
  (`KILL`/`SUCIDE`, `defender/DEFA7.SRC:19,31`), `sleep`/`nap`
  (`SLEEP`, `defender/DEFA7.SRC:12` — wake after N 16-msec ticks at a continuation),
  and `stepTick()` (the once-per-frame dispatch; the sub-128 IRQ arm's effect,
  `defender/DEFA7.SRC:3048-3050`). Pure, clock-free; shell calls `stepTick()` off
  `@shared/loop`. `purity.test.ts` stays green. **(5 pts)**
- **`df3-2` — World-wrap coordinate model + camera slide.** `src/core/world.ts`:
  the `BGL` camera (`defender/PHR6.SRC:215`), the **16-bit horizontal wrap**, the
  pure `worldX(entity) = onscreen + bgl` helper (`PLABX`, `defender/DEFA7.SRC:2432-2440`),
  and the **ship-leads-scroll slide** — `BGDELT`/`PV1..PV12` ported line-for-line
  (`defender/DEFA7.SRC:2373-2431`), plus the vertical strip rule (`YMIN=42`/`YMAX=240`,
  player-clamp vs object-wrap, `defender/PHR6.SRC:20-21`, `DEFA7.SRC:2490-2496`).
  This is the epic's riskiest seam — expect a Reviewer mutation battery over the
  slide math. **(5 pts)**
- **`df3-3` — Player ship: velocity, thrust, reverse, vertical.** `src/core/ship.ts`:
  the **24-bit `PLAXV`** accumulation and accel (`defender/DEFA7.SRC:2360-2371`),
  the `VELO` integration step (`defender/DEFA7.SRC:2480-2499`), `REV` reverse
  (facing flip + `REVFLG` debounce, `defender/DEFA7.SRC:3155-3171`), the thrust
  process, and vertical motion (`PLAUP`/`PLADN` clamp, `defender/DEFA7.SRC:2441-2476`).
  The ship is a scheduler process (df3-1); drive it from a pure input snapshot
  (shell owns the PIA read). **(5 pts)**
- **`df3-4` — Parallax starfield.** `src/core/stars.ts`: `STINIT`/`STOUT`
  (`defender/DEFA7.SRC:2095-2155`), `STRCNT` active count (`defender/PHR6.SRC:294`),
  stars scrolled by the `BGL` delta with edge wrap and the phase mask. **Trap:**
  `STOUT` carries self-modifying-code (`FCB`-patched indexed stores, the `BSO
  BONER` comments `DEFA7.SRC:2151-2153`) — transcribe the *behaviour*, not the
  opcodes; record an encoding note (`streams-are-not-rasters` cousin). Composited
  by index into the framebuffer. **(3 pts)**
- **`df3-5` — Laser fire.** `src/core/laser.ts`: `LFIRE` (max 4 concurrent via
  `LFLG<4`, `defender/DEFA7.SRC:2763-2766`), right/left spawn by facing
  (`LASR`/`LASL`, `defender/DEFA7.SRC:2790,2839`), the laser data structure
  (`LFLG`/`LCOLRX`, `defender/PHR6.SRC:301-303`), travel + off-screen death. Each
  laser is a (super)process. Collision **against enemies** is `df4` — `df3` fires
  and travels only. **(3 pts)**
- **`df3-6` — VISUAL playtest: the ship flying a scrolling, wrapping world.**
  Screenshot `http://127.0.0.1:5270/defender/` showing the ship over the moving
  starfield, thrust scrolling the world, reverse flipping facing and slide, a
  laser in flight — compared against a **nonsense control path** (must DIFFER, not
  just 200 — the `canonical-serve` lesson). Confirm scroll direction, ship-leads
  offset, vertical clamp and colour **before** enemies (playbook §4). Carry the
  `df4`/`df5` accessibility ruling forward as a note (no full-screen strobe
  downstream). **(3 pts)**

Total **24 pts**. Hardening/mutation follow-ups are Reviewer-filed and grouped by
**file surface** (the jt9 gotcha), not folded in ahead of time — `df3-2`'s slide
math is the likeliest to spawn one.

## 5. Traps carried into `df3` (so a story does not re-discover them)

- **Routing ≠ geometry.** The camera slide is defined in *display* space; a test
  that only checks "the world scrolled when I thrust" passes while the ship-leads
  offset or the slide clamp is wrong. Pin **coordinates** — the exact `BGL` after
  N ticks of a known input, the ship's screen column at max velocity each facing —
  in a unit test, not just direction (`renderer-migration-routing-vs-geometry`).
- **The vertical axis has two rules.** Player Y clamps; object Y wraps. A single
  "wrap Y" helper applied to both is a fidelity bug. Pin both
  (`defender/DEFA7.SRC:2450,2461` clamp vs `2490-2496` wrap).
- **`PLAXV` is 24-bit.** Truncating the player X velocity to 16 bits drops the
  sub-pixel accumulation and the ship's acceleration feel goes wrong slowly. Keep
  the third byte (`defender/PHR6.SRC:332`, `PLAXV+2`).
- **Sim rate is 60 Hz, not the ~10 Hz some Williams logic runs.** Millipede's
  `logic rate is 60Hz` finding applies: the 16-msec nap tick is the frame; do not
  introduce a divided sub-rate the source does not have.
- **Line numbers from tool output only** (`grep -n`); cite ROM as
  `defender/<FILE>.SRC:<line>`, never TS `file.ts:line`, in new comments (the
  comment-citation guard classes).
- **RASM radix.** `defender/*.SRC` is `$`hex + bare decimal; a threshold read as
  decimal that was hex (or vice-versa) is silent drift (`brief.md` §2). `YMAX EQU
  240` and `YMIN EQU 42` are **decimal**; `$20`/`$70`/`$100` bases are **hex** —
  verify each on transcription.

## 6. Handoff

`df3` is groomed and materialized as `sprint/epic-df3.yaml` (backlog), added to
`sprint/current-sprint.yaml` after `df2`. Ready for **Ruby Rhod** (`/pf-sm`) to
sequence — `df3-1` first (the kernel; nothing runs without it), then `df3-2` (the
world/camera model, the risky seam), then `df3-3` (ship) which depends on both,
then `df3-4`/`df3-5` (stars, laser — parallelisable by file surface), then
`df3-6`'s visual gate last. Points (24) land in whichever sprint SM sequences them;
that is a sprint-planning call, not an architecture one.
