# Story rb4-16 Context

> ## ✅ RE-CUT 2026-07-17 (user-approved brainstorm) — this is the live scope
>
> The full design + rationale lives in **`red-baron/docs/2026-07-17-rb4-16-plonsn-recut-design.md`**
> (the authority). This file is the actionable summary TEA/Dev work from. The PARKED banner and the
> original body that used to live here encoded a coordinate premise now known wrong (servo on
> pre-divide `displayPos`); they are removed. Provenance survives in
> `sprint/archive/rb4-16-session.md`.
>
> **Two blockers that parked the first attempt have dissolved:**
> 1. rb4-17 (merged `644ad58`) shipped the growing **COLLD gun window** (`guns.ts:136-167`), **dual-Z**
>    (`positionZ` in `enemy.ts:314-326`), and the re-anchored **scene NDC scale**. The old
>    "AC-R3 = 0.0 frames at L4" measurement was taken through the ±32 gun rb4-17 **deleted** — it is
>    stale, not a proven wall.
> 2. The **SINE table is not missing.** It is `037007.XXX:48` (`SINE:`, `.RADIX 16`, origin
>    `.=^H03800`, 65 words 0→`0x4000`, then `QUADSN:` at `SINE+0x82` — matches RBARON.MAC:397). The
>    parked story grepped only `*.MAC`. **PLONSN's rotation + window are fully byte-pinnable.**
>
> **So it is one story on standard TDD. No spike, no throwaway rig** — the reachability measurement is
> just AC-R3.

## Metadata
- **Story ID:** rb4-16 · **Type:** refactor · **Points:** 8 · **Priority:** p1 · **Workflow:** tdd
- **Repo:** red-baron · **Epic:** Red Baron — ROM fidelity against the 1980 Atari source

## Problem

The enemy window servo (rb4-6) decides its zone from the plane's **stored world** position, held
on-screen by an **ad-hoc ±olim world clamp** the code labels a stand-in for the ROM's real bound
(`src/core/enemy.ts:453-456`). The ROM's servo instead runs in **post-divide SCREEN space** (PLNDEL
reads PLSTAT+8/+A) bounded by **PLONSN** (RBARON.MAC :2877-2937). This story builds the ROM's real
machine now that every input exists (dual-Z, the growing gun, the scene scale, and the sine table).

## Design decisions (fidelity-first)

- **Build the ROM's actual machine; retire the ad-hoc clamp.** Fidelity is the deliverable, not a
  tuned outcome.
- **PLONSN byte-pinned end to end** — window `0x1A0 × depth` via Math Box `>>16` (MBUCOD.V05:494-516)
  *and* the real PFROTN rotation from the 037007.XXX sine table + QUADSN (readers T.SINE/TRIG,
  RBARON.MAC:6019-6053).
- **Servo → post-divide screen space** (the PLNDEL space), not our pre-divide `displayPos`.
- **AC-R3 is a regression guard, not the goal.** Bar = the current shipped baseline measured through
  the current (rb4-17) gun, captured honestly — never the stale 10.8, never re-tuned.
- **If the faithful machine still regresses reachability, that is a green-phase finding to investigate
  honestly** (likely axis: PLONSN's window scale/unit, not a pre-named culprit; the growing gun makes
  a regression unlikely) — not a bar to lower, not a reason to keep the clamp.

## Acceptance Criteria

**AC-1 — Servo runs in post-divide SCREEN space.** Zone detection (inner/outer) and delta selection
operate on the plane's post-divide screen position (PLNDEL's space: `:2749-2752` Y pass with `ZX` X=2
→ PLSTAT+0A + `SBC I,HORIZN`; `:2867` X pass with `ZX` X=0 → PLSTAT+8 raw; `:2755` `;OFFSET FOR Y
DELTA`; block naming `:3157/:3162`, `:266-297`). **No HORIZN term is added in this module** — our
display Y is horizon-relative by construction (rb4-6, settled). Find the `LDX` before reading any `ZX,`
operand; cross-check `enemy.ts:103-128`, which is already correct.

**AC-2 — PLONSN ported and byte-pinned** (RBARON.MAC :2877-2937). The bound clamps the plane each
frame so its projected picture stays inside the depth-scaled, PFROTN-rotated window. Window magnitude
(`0x1A0`, :2886/:2893-2896), depth scale (Math Box `>>16`), and rotation (037007.XXX `SINE:`/`QUADSN:`)
are each transcribed from cited bytes. Any factor that genuinely cannot be byte-pinned is a declared
seam with its derivation shown (`scene.ts:43` precedent) — none is expected.

**AC-3 — The ad-hoc ±olim world clamp is retired.** PLONSN replaces it; the `enemy.ts:453-456`
stand-in comment goes with the code.

**AC-4 — Outer-zone depth gate** (:2776-2781). "Return to centre" is depth-gated: when
`POSITION Z < 4` the plane flies past off-screen instead of turning back. Fold into the servo's outer
arm, reading the `positionZ` field (rb4-17). Today's servo returns unconditionally.

**AC-R3 — Reachability regression guard.** Drive a stepping eye through `step(e,lvl,eye)` /
`stepWave(enemies,lvl,eye)` with the real `guns.collides`; assert a plane stays reachable through
rb4-17's growing gun at every level. The bar is the captured current baseline (see decisions). A drop
is a finding, never a re-tune. This is the story's central trap: an eye-aware servo without this
coverage re-creates the GMLEVL-4 soft-lock.

**AC-5 — rb4-6 comment cleanups** (ride along): NaN-clamp totality overclaim; one disclosing line on
AC-R3's z-gate; name the regex the ace-wiring comment indicts.

## Deferred to successors (document at the port site, do not build here)

- **N.PLNZ / GMEND0 gate** (:2877-2881) — needs both counters modelled + the coin-up reset traced.
  **Standing user ruling: port PLONSN's clamp _ungated_, comment the divergence citing :2877-2881.**
- **STPLNE MAXDEL entry-delta seeding** (:2298-2309) — seeded 0 today.

## Dependencies
- **rb4-6** (servo is eye-free, world-coord, ad-hoc clamp) — this story completes the display-space seam.
- **rb4-17** (DONE, `644ad58`) — provides dual-Z, the growing COLLD gun, the scene NDC scale.

---
_Re-cut 2026-07-17 from the user-approved brainstorm. Full design:
`red-baron/docs/2026-07-17-rb4-16-plonsn-recut-design.md`._
