# Story uf1-3 Context

## Title
star-wars Status.C_AH is always false — squadmates never react to a nearby kill

## Metadata
- **Story ID:** uf1-3
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** star-wars
- **Epic:** Unwired features — ported-but-unconsumed mechanics found by the 2026-07-28 fleet sweep

## Problem
star-wars/src/core/tie-status.ts:107 carries the gap in its own words: 'C_AH (0x01) — NEARBY ALIEN HAS BEEN HIT (WSCPU.MAC:27,357: CHSET C$AH in the damage handler). TODO: a later task threads the hit resolver's per-step result through state (or a per-step arg) so squadmates react to a nearby kill; for now this always reads false.' The choreography VM this bit feeds is no longer speculative — sw7-11 landed it and sw7/sw8 wired it: sim.ts:131 imports initVm/tickChoreo/program/Status/Twist/Move, sim.ts:388 steps every TIE's VM each game frame against computeStatus, and sim.ts:2082 seats each fighter's program from the sw7-12 TSPWAV plan via choreoPc. So C_AH is a live VM condition input that is permanently pinned to false, which silently prunes every branch the ROM gates on it. Compare the sibling bit C_AG immediately above, which was closed the same way this one must be: a later fire step sets e.firedGun on the frame the TIE fires and computeStatus merely reports it. Mirror that. The hit resolver is the hitscan model swapped in by sw7-17 — see the memory of that story's blast radius (29 suites, 125 tests, 11 vacuous tests surfaced), so expect fixtures to need the new per-step signal and trust mutation over green.

## Technical Approach
_Routing pointers only — TEA owns the test design, Dev owns the implementation._

**Line numbers in the story description have drifted.** Verified against
`develop` @ 9c6f19c on 2026-07-29:

| Story says | Actually at |
|---|---|
| `tie-status.ts:107` (the C_AH TODO) | `src/core/tie-status.ts:106` |
| `sim.ts:131` (VM imports) | `src/core/sim.ts:132-134` |
| `sim.ts:388` (per-frame VM step) | `src/core/sim.ts:397-398` (`computeStatus` → `tickChoreo`) |
| `sim.ts:2082` (program seating via `choreoPc`) | `src/core/sim.ts:2110-2115` |

- The pattern to mirror is the sibling bit **C_AG**, `tie-status.ts:100-104`:
  a later step sets `e.firedGun`, and `computeStatus` merely reports it
  (`if (e.firedGun ?? false) status |= Status.C_AG`). `sim.ts:417` is where
  `firedGun` is written back onto the entity (`{ ...e, vm, firedGun: fired }`),
  and `sim.ts:442` notes the spread exists so optional fields survive the
  rebuild. AC-1 explicitly forbids solving this via mutable module state.
- The hit resolver is the **sw7-17 hitscan** model. That story's blast radius
  was 29 suites / 125 tests and it surfaced 11 vacuous tests — expect fixture
  churn and trust mutation over green (AC-5 makes that a requirement, not a
  suggestion).
- **Prior sessions worth reading before RED** (per the standing rule that the
  preceding related story's archive carries pre-extracted quarry and reviewer
  notes): `sprint/archive/sw7-17-session.md` (hitscan), `sw7-11-session.md`
  (the choreography VM), `sw7-12-session.md` (TSPWAV plan / `choreoPc`),
  `sw7-24-session.md` (C$PV visibility fire gate — the most recent status-bit
  wiring precedent).
- **ROM quarry:** the full 1983 Atari "Warp Speed" source text is checked out at
  `/Users/slabgorb/Projects/star-wars-1983-source-text`. `WSCPU.MAC` holds the
  damage handler and the `CHSET C$AH` site cited at 27,357. AC-2 turns on what
  that file does or does not say about proximity: if WSCPU.MAC defines no
  radius, the chosen rule must be logged as a **deviation with rationale** in
  this session's Design Deviations section, not quietly invented.

## Scope
- **In scope:** threading a per-step "a nearby TIE was destroyed" signal from the
  hit resolver into `computeStatus` so `Status.C_AH` can be true; the proximity
  rule (cited or logged as a deviation); a test proving a C_AH-gated choreography
  arm is reachable; the per-step clear; the mutation proof; and correcting the
  TODO comment at `tie-status.ts:106`.
- **Out of scope:** the other unwired findings in epic uf1 (uf1-4 owns the trench
  wedge grid; the sw8 backlog owns fire-gate coverage). Any C_AH-adjacent gap
  found but not fixed must be **filed as its own story** (`pf sprint story add`)
  before it is called out of scope — an archive note alone is forgetting.

## Acceptance Criteria
- A TIE destroyed this step sets the nearby-alien signal that computeStatus reads, so C_AH can be true — threaded the same way C_AG threads firedGun, not read from mutable module state.
- Nearby is defined by a cited ROM proximity rule rather than an invented radius, or the absence of one in WSCPU.MAC is recorded as a logged deviation with the chosen rule and its rationale.
- A choreography branch gated on C_AH is observably reachable: a test drives a kill beside a live TIE and asserts the squadmate's VM takes the C_AH arm.
- The bit clears on the following step — C_AH reports a per-step event, never a latched flag that stays set for the rest of the wave.
- Mutation-proven: pinning the new signal back to false reddens the C_AH branch test, and the sw7-17 hitscan fixtures still pass.
- The tie-status.ts:107 TODO comment is removed or rewritten to describe what now happens, so the next sweep does not re-report it.

---
_Generated by `pf context create story uf1-3` from the sprint YAML._
