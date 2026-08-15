# Epic df3 Context

## Title
Defender — the ship + the scheduler (phase 4a): the cooperative process kernel, the player ship, and the scrolling wrap-around world — the first epic that steps a clock

## Overview
Third Defender epic and phase 4a of the framebuffer-raster cabinet build (docs/playbooks/next-sprite-game.md), the novel-heavy epic the roadmap flags as 'the one to watch'. Builds the cooperative process scheduler core (SLEEP/KILL/MKPROC/MSPROC dispatched through DISP2, DEFA7.SRC:12-130; PTIME/PADDR/PTYPE/PCOD process records off the FREE list), the player ship (24-bit PLAXV sub-pixel velocity DEFA7.SRC:2360-2371,2480-2499; thrust; REV reverse-facing DEFA7.SRC:3155-3171; vertical clamp DEFA7.SRC:2441-2476), the scrolling wrap-around WORLD + camera, the parallax starfield (STINIT/STOUT DEFA7.SRC:2095-2155, STRCNT), and the laser (LFIRE max-4 DEFA7.SRC:2761-2870). Stands on df1 (dossier + citation gate + src/core purity test) and df2 (the framebuffer render seam, palette, charset, object/terrain tables — pixels, INERT). Every constant df3 introduces re-opens under the df1-1 gate: no src/core value without a claims/*.json entry. THE CORE MODEL (RULED, not a choice — ROM-always-wins): df3 ports the ROM's own world/camera representation into src/core line-for-line and citable, NOT a tidier world-absolute re-derivation. BGL 'TERRAIN LEFT POINTER' (PHR6.SRC:215) is the camera = world-X of the screen's left edge; the world is a 16-BIT HORIZONTAL CYLINDER wrapping at $10000; BGLX (PHR6.SRC:216) is last frame's camera for the scroll delta. Entities live in DISPLAY space (OX16/OY16, integrated by VELO DEFA7.SRC:2480-2499); absolute world X = onscreen + BGL is a PURE HELPER (PLABX PHR6.SRC:335, DEFA7.SRC:2432-2440). The SHIP LEADS THE SCROLL: PLAY1 (DEFA7.SRC:2373-2431) maps velocity to a target screen column (base $20 facing-right / $70 facing-left) and slides BGL by BGDELT (±$40 steps, ±$100 clamp) so the ship is pushed forward — the single riskiest seam, defined in display space (an absolute-space rewrite would silently drift: routing != geometry). Vertical is a CLAMPED STRIP not a cylinder: YMIN=42 / YMAX=240 (PHR6.SRC:20-21, decimal), player Y clamps [YMIN+1,238] (DEFA7.SRC:2450,2461) while object Y wraps [YMIN,YMAX] (DEFA7.SRC:2490-2496) — two rules on one axis. Timebase binds here (df2 read no clock): the nominal 60 Hz / 16-msec nap tick is the scheduler quantum (fixed-timestep 60 Hz, @shared/loop drives shell rAF -> pure stepTick(); core stays clock-free); df1-4 resolved the IRQ model (CB1 video interrupt, COUNT240/CA1 never enabled, VERTCT polled). Scheduler is the jt2 Williams-kernel PATTERN, re-derived and re-cited from THIS tree (plugins/joust/src/core is prose reference only, never imported). No new @shared extraction (scheduler is a pattern reuse; the coordinate model is defender-specific with no second consumer — the 'extract on the second game' bar is not met). Design + full story rationale: docs/superpowers/specs/2026-08-15-defender-df3-ship-scheduler-design.md; roadmap parent: docs/superpowers/specs/2026-08-13-defender-cabinet-roadmap-and-df1-design.md sec 4 df3 (approx 24 pts). Reuse-first: df2 framebuffer.ts + src/shell/render.ts (index blit), @shared/loop (fixed step), df2 transcribed palette (new visuals reach colour by INDEX only, never hex). Traps carried in: routing-!=-geometry (pin COORDINATES of the camera slide, not just scroll direction); the vertical axis has two rules; PLAXV is 24-bit (don't truncate to 16); sim rate is 60 Hz (not a divided sub-rate); STOUT carries self-modifying code (FCB-patched stores, the 'BSO BONER' comments DEFA7.SRC:2151-2153 — transcribe behaviour not opcodes); line numbers from tool output only; RASM radix ($hex vs bare decimal). OUT OF SCOPE: enemies/menagerie/collision-vs-enemies/materialize-explode (df4), waves/scanner/smart-bomb/hyperspace/score/2P (df5), sound (df6), attract->play phase machine/HUD/showcase (df7). ACCESSIBILITY FORWARD-NOTE (binds df4/df5, recorded df1): smart-bomb and hyperspace flash the full screen in the ROM (SBOMB DEFA7.SRC:3199 COM PCRAM; HYPER DEFA7.SRC:3211) — those become freeze/fade in df5 (owner photosensitivity, the one exception to ROM-always-wins); df3 renders NO full-screen flash.

## Metadata
- **Epic ID:** df3
- **Repo:** arcade

## Background

Cross-story constraints and guardrails for every `df3-*` story. The Overview is
the *what*; this is the *how-and-why-not* — the walls each story inherits so none
is re-argued mid-epic. Full rationale:
`docs/superpowers/specs/2026-08-15-defender-df3-ship-scheduler-design.md`.

### The scope wall — the ship on a live world, nothing more

`df3` is the first epic that **steps a clock**. It builds the process kernel, the
player ship, the wrap-around world + camera, the starfield, and the laser — and
stops there. A story is out of scope the moment it needs another actor or a game
rule:

- **IN:** the cooperative scheduler; the player ship (thrust / reverse / vertical,
  sub-pixel velocity); the world-wrap coordinate model + camera; the parallax
  stars; the laser (fire + travel).
- **OUT:** enemies / the menagerie / collision **against enemies** /
  materialize-explode (`df4`); waves / scanner / smart bomb / hyperspace / score /
  extra men / 2P (`df5`); sound (`df6`); the attract→play→death phase machine /
  HUD / lobby showcase (`df7`).

If a story reaches for an enemy process, a wave table, a score, or a game-over
transition, it has crossed into `df4`/`df5`.

### The core/shell boundary (the single most important rule)

`plugins/defender/tests/purity.test.ts` (shipped by `df1-1`) scans `src/core/` and
fails on `fetch`/canvas/`Date`/`Math.random`. `df3` honours it exactly:

- **`src/core/scheduler.ts`** — pure cooperative kernel: a process run-list with
  make / kill / sleep(nap) / `stepTick()`. **Clock-free** — the SHELL calls
  `stepTick()` once per fixed 60 Hz frame; the core never reads wall-clock.
- **`src/core/world.ts`** — pure world/camera model: `bgl` (camera), `bglx` (prev),
  the 16-bit horizontal wrap, the `worldX(entity)` helper, the ship-leads-scroll
  slide (`BGDELT`/`PV1..PV12`).
- **`src/core/ship.ts` / `stars.ts` / `laser.ts`** — pure processes: velocity,
  facing, travel. They composite **indices** into `df2`'s `framebuffer.ts`.
- **`src/shell/render.ts`** — SHELL. index→RGBA + blit (the `df2` seam, unchanged).
- **`src/shell/input.ts`** — SHELL. reads thrust/reverse/up/down/fire (the ROM's
  PIA reads) and hands core a **pure input snapshot** each tick. Core never reads
  hardware; **core hands the shell indices and positions, the shell owns pixels,
  input and the clock.**

### THE core model — RULED from the source, not a design fork

`df3` ports the ROM's own world/camera representation into `src/core` line-for-line
and citable. A tidier "world-absolute" rewrite whose scroll/slide math can't be
cited to a ROM line is the *make-it-up* side and is rejected on sight
(`ROM-always-wins`). The model, read from `DEFA7.SRC`/`PHR6.SRC`:

- **`BGL` is the camera** — "TERRAIN LEFT POINTER" (`defender/PHR6.SRC:215`), the
  world-X of the screen's left edge. The world is a **16-bit horizontal cylinder**
  (`BGL`/world-X wrap at `$10000`, no clamp). `BGLX` "OLD TERRAIN LEFT"
  (`defender/PHR6.SRC:216`) is last frame's camera, for the object/star scroll delta.
- **Entities live in display space** — `OX16`/`OY16`, integrated by `VELO`
  (`defender/DEFA7.SRC:2480-2499`). Absolute world X is **derived, not stored**:
  `worldX = onscreen + BGL`, a pure helper (`PLABX`, `defender/PHR6.SRC:335`;
  `defender/DEFA7.SRC:2432-2440`).
- **The ship leads the scroll** — `PLAY1` (`defender/DEFA7.SRC:2373-2431`) maps
  velocity to a target screen column (base `$20` facing-right / `$70` facing-left)
  and slides `BGL` by `BGDELT` (`±$40` steps, `±$100` clamp) so the ship is pushed
  forward. **This slide is the epic's riskiest seam**, defined in *display* space —
  an absolute-space rewrite drifts silently (`routing != geometry`).
- **Vertical is a clamped strip, not a cylinder** — `YMIN=42` / `YMAX=240`
  (`defender/PHR6.SRC:20-21`, **decimal**). Player Y **clamps** `[YMIN+1,238]`
  (`defender/DEFA7.SRC:2450,2461`); object Y **wraps** `[YMIN,YMAX]`
  (`defender/DEFA7.SRC:2490-2496`). **Two rules on one axis** — pin both.

### Timebase binds here (df2 read no clock)

The nominal 60 Hz / 16-msec nap tick is the scheduler quantum: a fixed-timestep
60 Hz step, `@shared/loop` driving the shell rAF → pure `stepTick()`. Sim rate is
**60 Hz**, not a divided sub-rate the source lacks (millipede's `logic rate is
60Hz` finding). `df1-4` already resolved the IRQ model (CB1 video interrupt,
`COUNT240`/CA1 never enabled, `VERTCT` polled); `df3` models only the *effect* —
one scheduler tick per frame — never the PIA/CB1 wiring.

### Fidelity guardrails (carried in, so no story re-discovers them)

1. **Routing ≠ geometry.** The camera slide is display-space math; a test that only
   checks "the world scrolled when I thrust" passes while the ship-leads offset or
   the slide clamp is wrong. Pin **coordinates** — exact `BGL` after N ticks of a
   known input, the ship's screen column at max velocity each facing.
2. **The vertical axis has two rules** (player-clamp vs object-wrap). One shared
   "wrap Y" helper on both is a fidelity bug.
3. **`PLAXV` is 24-bit** (`defender/PHR6.SRC:332`, three bytes). Truncating to 16
   drops the sub-pixel accumulation and the acceleration feel drifts slowly.
4. **`STOUT` is self-modifying code** (`FCB`-patched indexed stores, the `BSO
   BONER` comments `defender/DEFA7.SRC:2151-2153`). Transcribe the **behaviour**,
   not the opcodes; record an encoding note (streams-are-not-rasters cousin).
5. **Scheduler is a *pattern* reuse, not an import.** Re-derive and re-cite the
   kernel from `defender/DEFA7.SRC:12-130`; `plugins/joust/src/core/` is a prose
   reference only. No new `@shared` extraction this epic (no second consumer —
   the "extract on the second game" bar is not met).
6. **Line numbers from tool output only** (`grep -n`/`awk`), never memory. Cite ROM
   as `` `defender/<FILE>.SRC:<line>` `` in new comments, **not** `file.ts:<line>`
   (the comment-line-ref guard reddens on TS-style refs; `.SRC` exempt).
7. **RASM radix.** `$` hex + bare decimal (`brief.md` §2). `YMAX 240`/`YMIN 42` are
   **decimal**; `$20`/`$70`/`$100`/`$40` are **hex**. A value re-radixed on the way
   in is silent drift.

### Reuse ledger (extend, don't reinvent)

| Need | Reuse |
|------|-------|
| Cooperative scheduler **shape** | jt2's Williams kernel as a *pattern* (`plugins/joust/src/core/`, prose only) — re-derived from `defender/DEFA7.SRC:12-130` |
| Fixed-timestep 60 Hz drive | `@shared/loop` (rAF → fixed step); core stays clock-free |
| Render surface + blit | `df2` `framebuffer.ts` + `src/shell/render.ts` (index→RGBA, `fitIntegerScale`) |
| Colour for new visuals | `df2` transcribed palette — reach colour by **index**, never hex |
| Citation gate + `src/core` purity scan | `plugins/defender/tests/audit/citations.test.ts` + `purity.test.ts` (df1-1) — enroll here |

### Sequencing & sprint

`df3-1` (the kernel) lands **first** — nothing runs without it. `df3-2` (world +
camera, the risky seam) next; `df3-3` (ship) depends on both; `df3-4`/`df3-5`
(stars, laser) parallelise by file surface; `df3-6`'s visual gate runs **last**.
Hardening/mutation follow-ups are Reviewer-filed and grouped by **file surface**
(the jt9 gotcha) — `df3-2`'s slide math is the likeliest to spawn one. The epic is
indexed into active sprint 2634 (24 pts); if PM defers Defender phase-4a, remove
`df3` from `current-sprint.yaml` `epics:` — the shard stays groomed and un-indexes.

### Accessibility forward-note (binds `df4`/`df5`; `df3` renders no strobe)

Smart bomb and hyperspace flash the full screen in the ROM (`SBOMB`
`defender/DEFA7.SRC:3199` `COM PCRAM`; `HYPER` `defender/DEFA7.SRC:3211`). The owner
has photosensitive epilepsy, so those become **freeze/fade/particle** effects in
`df5` — the one standing exception to ROM-always-wins, decided at the roadmap. Both
routines are **out of `df3` scope**, so nothing here strobes; the note is carried
forward so `df4`/`df5` inherit it as a hard constraint, not a rediscovery.

---
_Generated by `pf context create epic df3` from the sprint YAML; Background authored
by Architect (df3 design, `docs/superpowers/specs/2026-08-15-defender-df3-ship-scheduler-design.md`)._
