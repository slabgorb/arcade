# Story df3-6 Context

> **⚠ RESCOPE (owner ruling 2026-08-16):** df3-6 was originally scoped as a visual playtest only (3 pts), but SM measured that the df3 core modules (scheduler/ship/world/stars/laser, df3-1..5, all shipped as pure sim) were never wired into the running shell — `plugins/defender/src/main.ts` is still the df2 STATIC still (calls `composeStaticFrame()` once, blits the same framebuffer every rAF; no `stepTick()`, no input, no dynamic scene composer). The story is now re-pointed 3→8 and includes the shell-integration BUILD as well as the playtest: drive the scheduler off `@shared/loop`, wire a shell input adapter, and compose the live framebuffer from sim state before playtesting visually.

## Title
VISUAL playtest — the ship flying a scrolling, wrapping world: screenshot http://127.0.0.1:5270/defender/ showing the ship over the moving starfield, thrust scrolling the world, reverse flipping facing + slide, a laser in flight — compared against a nonsense control path (must DIFFER, not just 200 — the canonical-serve lesson). Confirm scroll direction, ship-leads offset, vertical clamp and colour BEFORE enemies (playbook sec 4).

## Metadata
- **Story ID:** df3-6
- **Type:** story
- **Points:** 8 (rescoped from 3)
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender — the ship + the scheduler (phase 4a)

## Problem

df3-1..df3-5 (scheduler, world, ship, stars, laser) are all complete and shipped as pure sim modules. However, the shell was never wired to drive them:

- `plugins/defender/src/main.ts` is the df2 STATIC still: it calls `composeStaticFrame()` once at startup and blits the same framebuffer every rAF.
- There is no scheduler `stepTick()` call; the sim never advances.
- There is no input adapter; the ship receives no commands.
- There is no dynamic scene composer in `src/core`; only `composeStaticFrame()` exists, which renders the palette-transcribed static world.

The game cannot currently show a flying ship or scrolling world. This story wires the core into the shell **and then visually playtests** the result.

## Technical Approach

### BUILD Half (the Missing Wiring)

1. **Drive the scheduler off `@shared/loop`:**
   - The scheduler (df3-1) exports `stepTick()`, which must be called once per fixed 60 Hz tick.
   - `@shared/loop` (already in the codebase) provides a fixed-timestep loop with a callback.
   - Update `plugins/defender/src/main.ts` to call `stepTick()` inside the loop callback, not once at startup.
   - The shell owns the rAF gate; the pure sim is clock-free and steps on command.
   - Confirm the loop runs at 60 Hz; df3-1 contract binds here.

2. **Wire a shell input adapter:**
   - The ship (df3-3) is a scheduler process, driven by a pure input snapshot: `{ thrust, reverse, up, down, fire }`.
   - The shell owns the PIA read (browser keyboard or gamepad).
   - Create an input adapter in `plugins/defender/src/shell/` that samples the DOM/input per tick and produces the pure snapshot.
   - The core `ship.ts` imports nothing except the snapshot type; it reads no DOM, no clock.
   - Pass the snapshot to `stepTick()` or the ship process each frame.

3. **Compose the live framebuffer:**
   - The df3-1..5 modules export live data: ship position, laser positions, star array, world camera.
   - Create a dynamic scene composer in `src/core/scene.ts` (or extend it) that renders the live framebuffer by composing:
     - Starfield (df3-4, `stars.ts`)
     - Ship at its display column/row (df3-3, `ship.ts`)
     - Lasers in flight (df3-5, `laser.ts`)
     - Over the scrolling world/camera (df3-2, `world.ts`)
   - Compose by palette **INDEX only**; the df2 transcribed palette is authoritative.
   - Update `plugins/defender/src/main.ts` to call the dynamic composer instead of `composeStaticFrame()`.
   - Confirm `purity.test.ts` stays green — the composer logic must remain pure.

### PLAYTEST Half (Original Scope, Now Verified Against Live)

- **Serve this checkout.** `just serve` (or `npx vite --port 5290 --strictPort` if 5270 is held by another checkout — verify whose tree answers, per `CLAUDE.md` "prove whose server answers"). Defender is at `/defender/`.
- **Drive and capture.** Screenshot the ship over the moving starfield; capture frames showing: **thrust scrolls the world**, **reverse flips facing and the ship-leads slide**, **a laser in flight**, and the **vertical clamp** (ship can't leave the strip).
- **DIFFER, not 200.** Compare `/defender/` against a **nonsense control path** (e.g. `/defender-xyzzy/`) and assert the rendered output **differs** — an all-200 sweep proves nothing because the lobby SPA fallback answers 200 to everything (`CLAUDE.md`; the mechanical DIFFER check already runs in `tests/canonical-serve.test.mjs`).
- **Confirm the orientation facts** from df3-2 by eye: scroll direction matches thrust, the ship sits *ahead* in its facing direction (the `$20`/`$70` lead), vertical is clamped `[YMIN+1,238]`, colours resolve through the palette (no invented hex).
- **Carry the accessibility note forward:** record that `df4`/`df5` must render smart-bomb/hyperspace as freeze/fade, **no full-screen strobe** — `df3` itself shows none.

## Scope

- **In scope:**
  - BUILD: drive scheduler via `@shared/loop`; wire a shell input adapter; compose the dynamic framebuffer by index; keep src/core pure.
  - PLAYTEST: visual proof of ship + scroll + wrap + laser + vertical clamp; the DIFFER-vs-control check; the accessibility forward-note.
- **Out of scope:** enemies/HUD/attract (df4+); any code fix beyond trivial orientation tweaks surfaced by the playtest (file a follow-up if a real bug appears).

## Acceptance Criteria

**BUILD Half:**
- [ ] `main.ts` drives the sim — the scheduler is stepped once per fixed 60 Hz tick via `@shared/loop` (not a static still; not a divided sub-rate).
- [ ] A shell input adapter feeds the ship a pure per-tick input snapshot (`thrust/reverse/up/down/fire`); core reads no DOM/clock.
- [ ] A pure `src/core` dynamic scene composer renders the live framebuffer (ship + starfield + lasers over the scrolling world) by palette INDEX only; `purity.test.ts` stays green.

**PLAYTEST Half (Original Scope):**
- [ ] A screenshot of `http://127.0.0.1:5270/defender/` (or the verified alt port) shows the ship over the **moving** starfield, captured across thrust (world scrolls), reverse (facing + slide flip), and a laser in flight.
- [ ] The vertical **clamp** is visible: the ship cannot leave `[YMIN+1,238]`.
- [ ] `/defender/` output is compared against a **nonsense control path** and **DIFFERS** (not merely both 200 — the canonical-serve lesson).
- [ ] Scroll direction, ship-leads offset (base 0x20 fwd / 0x70 rev, df3-2) and colour (palette-resolved, no invented hex) are confirmed by eye and recorded.
- [ ] The `df4`/`df5` accessibility ruling is carried forward as a note (freeze/fade, no full-screen strobe); `df3` shows no strobe.

## Scope dependencies

Runs **last** in df3, after df3-1..5 land. Pure verification + final wiring story.

## Traps Carried In (from df3 epic)

- **Routing ≠ geometry:** Pin the COORDINATES of the camera slide and ship-leads offset, not just scroll direction.
- **Vertical axis has TWO rules:** Player Y CLAMPS `[YMIN+1,238]` while object Y WRAPS `[YMIN,YMAX]`.
- **PLAXV is 24-bit** — do not truncate to 16.
- **Sim rate is 60 Hz fixed** — not a divided sub-rate.
- **STOUT self-modifying code:** Transcribe behaviour, not opcodes (df3-4 already resolved this).

## Reuse-First Pointers

- `@shared/loop` — fixed-step driver.
- `plugins/defender/src/shell/render.ts` — index blit (already exists).
- `plugins/defender/src/core/framebuffer.ts` + df2 transcribed palette — reach colour by INDEX only.
- Existing df3 core modules: `scheduler.ts`, `world.ts`, `ship.ts`, `stars.ts`, `laser.ts` — import, do not re-derive.
- No new `@shared` extraction (scheduler is a pattern reuse; the coordinate model is defender-specific with no second consumer).

## References

- **Epic context:** `sprint/context/context-epic-df3.md` — sequencing (last), accessibility forward-note.
- **Design spec:** `docs/superpowers/specs/2026-08-15-defender-df3-ship-scheduler-design.md` (BUILD + PLAYTEST rationale).
- **Playbook:** `docs/playbooks/next-sprite-game.md` §4 — visual gate sequencing (confirm world/ship BEFORE enemies).
- **Serve + DIFFER:** `CLAUDE.md` (Serving the arcade; "prove whose server answers"), `tests/canonical-serve.test.mjs` (the mechanical DIFFER check).

---

> **Architect note:** df3-1..5 are complete and pure (all green tests). The BUILD work to wire them into the running shell was never storied. By owner ruling 2026-08-16, that build work is now folded into df3-6 (re-pointed 3→8). The playtest is the original scope, now verified against live animation instead of green unit tests.

_Context updated 2026-08-16 per owner rescope ruling._
