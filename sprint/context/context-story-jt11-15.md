# Story jt11-15: A bird standing still on the ground takes off at REST — velXIndex must track actual ground motion, not the run rung it froze on

## Story Details
- **Story ID:** jt11-15
- **Epic:** jt11 (Joust — cabinet experience)
- **Type:** bug
- **Points:** 3
- **Priority:** p1
- **Repos:** arcade (`plugins/joust/src/core/flight.ts` only)
- **Workflow:** tdd
- **Sequencing:** `flight.ts`-only; disjoint from the `main.ts` start-flow pair jt11-16/jt11-17 — safe to run in parallel with those. Kin to jt11-3 (which built the velXIndex→takeoff model) and jt11-11 (which signed it by facing); this closes the case they left open.

## The felt bug (player report)

> "If I hover, land, stand still, and then take off, I have a large horizontal delta-v that
> immediately takes effect and yanks me to the side. It doesn't matter what was happening
> BEFORE I landed — that's how friction works."

The owner's rule, which is the **spec authority** for this story (it outranks ROM fidelity where they
conflict — see Design Deviation below):

1. **Running on the ground → takeoff conserves that momentum.** (This already works; keep it.)
2. **Stopped on the ground → takeoff hovers** — zero horizontal drift.
3. **What happened before landing is irrelevant.** Once you are stopped on the ground, friction has
   zeroed your horizontal momentum; the next flap lifts straight up.

## Problem / Root Cause — measured

Since jt11-3, `velXIndex` (PVELX, the FLYX ladder index) is the launch airspeed a takeoff inherits:
`takeOff()` (`flight.ts:410`) never writes it, and `stepGround()` maintains it every grounded frame
as the current state row's `flyVel`, signed by facing — the UPDNO2 write (`flight.ts:392`,
`JOUSTRV4.SRC:5997-6008`). The ROM confirms takeoff inherits it: `STFLY` (`JOUSTRV4.SRC:6123-6135`)
sets only PVELY and never touches PVELX, and flight reads `FLYX[PVELX]` for horizontal motion
(`:3133-3137`). So far, correct.

**The gap is the *neutral-input* path.** `stepGround` advances horizontal position as
`posX + delta * input.dir` (`flight.ts:398`), so a centered stick (`dir === 0`) freezes the bird's
position — it *looks* stopped. But `velXIndex` is set from the `onZero` transition's `flyVel`, and
the four RUN rows self-loop on `onZero`:

```
PLYCR onZero=PLYCR flyVel=2   PLYDR onZero=PLYDR flyVel=4     (flight.ts:121-124,
PLYER onZero=PLYER flyVel=6   PLYFR onZero=PLYFR flyVel=8      = ROM STATE rows :7165-7168)
```

So a bird that ran and then centered the stick is **visually stationary yet still carries
`velXIndex` 2–8**, and `takeOff()` launches it sideways.

**Measured** against the real `flight.ts` core functions (run right 8f, center 20f, take off, fly 10f):

| step | input | groundState | velXIndex | posX | note |
|------|-------|-------------|-----------|------|------|
| RAN | dir=1 ×8 | PLYFR | 8 | 116 | ran to top speed |
| CENTER | dir=0 ×20 | **PLYFR** | **8** | **116** | moved 0px in 20 frames — *visually stopped* |
| FLY | takeoff + dir=0 ×10 | — | 8 | — | **drifts 20px (2px/frame = FLYX[8]=$200) — THE YANK** |

Two controls prove the surrounding behaviour is already correct, which is why jt11-3's suite is green
and this still ships broken:

| control | result | meaning |
|---------|--------|---------|
| skid to a stop (reverse `dir=-1` from PLYFR) | reaches **PLYBR, velXIndex 0** | the ROM SKID chain *does* clear it |
| hover-land with velXIndex 0, then stand | **PLYBR, velXIndex 0**, stays 0 | a *true* zero-airspeed landing is clean |

jt11-3 tested exactly those two paths ("landed-and-stopped bird launches at REST" via skid, and a
rest landing). The one it never exercised is **center-the-stick-after-running**, where position is
frozen but `velXIndex` is not — the impossible state the player feels as a yank.

## The invariant to establish

**`velXIndex` must agree with the bird's actual horizontal ground motion.** If the ground step is not
advancing `posX` (neutral stick, `dir === 0`), the bird is stationary and `velXIndex` must be `0`, so
a subsequent takeoff hovers. When the bird is moving (`dir !== 0`), `velXIndex` stays the signed
`flyVel` of its state row, exactly as jt11-3/jt11-11 established — so running conserves and skids
decelerate as they do today.

## Technical Approach (recommended — Dev/TEA refine)

Localise the fix to the `stepGround` velXIndex write (`flight.ts:392`). The horizontal delta is
already `delta * input.dir`, so the honest expression of the invariant is: velXIndex reflects the
*motion this frame*, which is zero when `input.dir === 0`.

```
// today (flight.ts:392):
const velXIndex = (facing === -1 ? -next.flyVel : next.flyVel) | 0
// invariant: a stationary bird (no horizontal advance) carries no launch airspeed
const velXIndex = input.dir === 0 ? 0 : (facing === -1 ? -next.flyVel : next.flyVel) | 0
```

- **Do NOT edit the GROUND_STATES table.** The `onZero` self-loops are ROM-accurate
  (`PLYCR onZero=PLYCR`, verified `:7165-7168`); rewriting them to decay toward PLYBR would diverge
  from the ROM's collision/bump semantics with a much wider blast radius. The targeted write is the
  right seam.
- **`land()` stays as is** — a rest landing already yields PLYBR/velXIndex 0 (control above); a fast
  landing that immediately holds a direction still conserves through the first `stepGround`.
- Confirm the takeoff-frame ordering holds: `frame.ts:280` runs `stepGround(input)` **before**
  `frame.ts:282` `takeOff()`, so a flap-with-neutral-stick zeroes velXIndex on the same frame it
  launches → hover; a flap-with-direction conserves. This is the mechanism that makes rule 3 true.

## Test Design

Read velXIndex/posX off the pure `flight.ts` functions (the jt11-3 discipline — `ground-momentum.test.ts`
already loads them via `flight-contract.js`). Every expected value is DERIVED from `GROUND_STATES`/`FLYX`
at runtime so the tests pin WIRING, not a hand-copied number.

### AC-1 — center-the-stick after running launches at REST
Run to a nonzero rung (dir=1 until PLYFR, velXIndex 8), then feed `dir=0` for ≥1 frame, then
`takeOff()` + `stepFlight(dir=0)`. Assert the post-takeoff horizontal drift is **0**.
- **RED today:** drifts 2px/frame (the measured 20px/10f).
- **Non-vacuity control:** the SAME bird taking off while *still holding* `dir=1` must drift at
  FLYX[8] — otherwise a fix that zeroes velXIndex unconditionally (breaking rule 1) would pass.

### AC-2 — running conserves (rule 1 unchanged)
A bird holding a direction at each rung PLYCR/D/E/F takes off at exactly `FLYX[signed flyVel]`.
Guards against an over-broad fix. Pin both facings (jt11-11): left-facing launches negative.

### AC-3 — pre-landing airspeed does not survive a stop (rule 3)
Land at full incoming speed (velXIndex 8 → FRCONV rung), feed `dir=0` for a few frames (stand), then
take off: drift is 0. The landed rung's flyVel must not leak through a neutral stand.
- **RED today:** the fast-landing rung retains its flyVel across neutral frames.

### AC-4 — the skid path and the clean hover-land are unchanged (regression guard)
The two controls above (reverse-to-PLYBR; hover-land velXIndex 0) still reach velXIndex 0. These are
already green; pin them so the fix cannot regress jt11-3.

### Seeded replays WILL re-baseline
Neutral-stick grounded frames followed by takeoff occur in attract self-play and normal play, so
player flight trajectories change. Expect the jt11-3/jt11-4 seeded fixtures to move and re-baseline
them deliberately (same warning jt11-3 and jt11-11 carried). Check the `rng` law is untouched first
(see the joust seeded-replay re-baseline protocol) — this changes trajectories, not the RNG.

### Rule coverage
| Rule | Test |
|------|------|
| core/shell boundary — no clock/DOM/entropy | `purity` scan (change is `src/core/flight.ts`) |
| no `<file>.ts:<line>` refs in test comments (jt9-30) | cite ROM lines only |
| test-file count anchor | bump `plugins/joust/README.md` `--project joust # N files` if a test file is added |
| ROM citations resolve | `flight-source.test.ts` if any anchor is added |

## Acceptance Criteria
1. A bird that runs and then centers the stick (`dir=0`) takes off at **rest** — zero horizontal
   drift — regardless of the run speed it reached.
2. A bird holding a direction takes off conserving that rung's speed (`FLYX[signed flyVel]`), both
   facings — jt11-3/jt11-11 behaviour unchanged.
3. Airspeed carried in before landing does not survive a neutral stand: land fast, stand, take off →
   hover.
4. The skid-to-stop path and the clean hover-land still reach velXIndex 0 (no jt11-3 regression).
5. Core-only, pure, `flight.ts` only; the GROUND_STATES table is not modified.
6. Seeded replays re-baselined with the `rng` law verified untouched.

## Design Deviation (log at reconcile)
- **Spec source:** ROM `PLYRLP` STATE table, `JOUSTRV4.SRC:7163-7175` — run rows self-loop on a
  centered stick (`PLYCR onZero=PLYCR`); the machine keeps you running until you actively reverse
  (skid), and its `posX` delta is animation-driven, not joystick-gated.
- **Implementation:** this port already gates the ground delta by `input.dir` (`flight.ts:398`), so a
  centered stick *freezes* the bird — a deliberate friction feel the owner wants ("that's how friction
  works"). This story completes that divergence by zeroing `velXIndex` when the bird is not advancing,
  so the visible state (stopped) and the launch airspeed (rest) agree.
- **Forward impact:** none downstream; the divergence is confined to the neutral-stick ground frame.
  Enemies reach `stepGround` via the 2-arg path and jt11-11's facing thread — confirm their neutral
  frames behave (an enemy that pauses should not launch sideways either).

## Out of scope
- The GROUND_STATES transition table (ROM-accurate; do not touch).
- Any change to `land()` selection or the FRCONV ladder.
- The run-animation phase gap (ORRUN `PFRAME`) noted at `flight.ts:342-347` — a separate fidelity story.

---
_Authored by Architect (spec-check/design). Root cause measured against `plugins/joust/src/core/flight.ts` on 2026-08-13; ROM citations verified against `reference/williams-source/joust/JOUSTRV4.SRC`._
