# Story sw7-17 Context

## Title
R11b ROM laser is HITSCAN gun→site — 8-frame LZ.EDG sweep, instant resolve under the site, trench clip $7000 (G-004 re-ruled wont_fix→fix, G-012); BLOCKS sw7-6

## Metadata
- **Story ID:** sw7-17
- **Type:** story
- **Points:** 5
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** star-wars
- **Branch:** `fix/sw7-17-rom-hitscan-laser` (base `develop`, PR targets `develop`)
- **Epic:** Star Wars — primary-source fidelity: the ruling sheet from the 2026-07-15 audit
- **depends_on:** sw7-16 (DONE — merged to develop at `ed90205`)
- **BLOCKS:** sw7-6 and sw7-18 — `depends_on: sw7-17` gets added at *their* setup, not here.

## Design source (authoritative — read this first)
`star-wars/docs/superpowers/specs/2026-07-16-surface-gunnery-and-traversal-design.md`
— **Defect 2** and its **Design (R11b)** section define this story. This story is
R11b of `R11a (sw7-16, done) → R11b (this) → R11c (sw7-18)`.

The design is already ruled by the Jedi (2026-07-16); it is not open for
re-litigation. TEA/Dev implement it — do not redesign the model.

## Problem
The clone flies a 12,000 u/s projectile with a 3 s TTL. While the bolt flies, the
field closes on the cockpit, so bolt and target meet at fraction
`bolt/(bolt+closing)` of the ray — the bolt passes the target's plane at that
fraction of its lateral offset. This is a **constant lead fraction**, so dead-on
aim misses:

| closing speed | lead fraction | dead-on aim misses towers beyond |
|---|---|---|
| 600 u/s (today) | 4.8 % | \|x\| ≈ 4,100 — 24 of SQUARE's 28 objects |
| 5,250 u/s (ROM seed) | 30 % | everything off-centre |
| 21,000 u/s (ROM cap) | 64 % | everything |

The projectile model therefore makes sw7-18's authentic surface speeds and
sw7-6's B-008 trench scroll (~15,750 u/s — which **out-runs** a 12,000 u/s bolt
outright) impossible. That coupling is why G-004's audit-time `wont_fix` was
re-ruled to **fix**.

## Technical approach (per spec Design R11b — ROM model)
The ROM laser is **HITSCAN**: no travelling shot, no lifetime.

- **Beams drawn gun-ports → site each frame** (`VWLAZ`).
- **Collision resolves instantly** against the nearest object under the site
  (within the object's hit radius at its depth):
  - `CLSLZ` — space: `min(CL.GDS, CL.ADS)`
  - `CLGLZ` — ground
  - `CLBLZ` — trench, **clipped to `#7000` = 28,672 forward** (`WSLAZR.MAC:418`)
- **Trigger starts an 8-game-frame sweep:** `LDB #8 / STB LZ.EDG`, decremented
  per frame, **retriggerable** (`WSLAZR.MAC:106-113`; G-012, ≈0.39 s @ 20.508 Hz).
- **Beam origin = the ship point** delivered by sw7-16 (R11a), already on develop.
- Draw the beam gun→site (also more authentic than the current tracer).

ROM cites verified against `~/Projects/star-wars-1983-source-text` (LF-normalized,
greppable copy — use this, not the CR-terminated originals). `.RADIX 16`
throughout: **bare immediates in the source are HEX**. Timebase 20.508 Hz.

## Scope
**In scope**
- Player laser → hitscan, per the R11b design above.
- The 8-frame `LZ.EDG` sweep window, retriggerable.
- Trench beam clip at 28,672 forward.
- Beam rendering gun→site.
- Audit bookkeeping (below).

**Out of scope / explicitly preserved**
- **Enemy fireballs STAY projectiles** — they are real travelling objects in the
  ROM. This is authentic, not an oversight.
- `PROJECTILE_SPEED` / `TTL` **survive** where a real projectile remains
  (fireballs). Do not delete them wholesale.
- The trench torpedo latch is **untouched** by this story.
- Surface pacing / traversal / awakening (D-018, D-019, D-022, D-015) — that is
  R11c (sw7-18), not this story.

## Acceptance criteria
_No ACs were recorded in the sprint YAML; these are transcribed from the ruled
design for TEA to finalize and make executable during RED._

1. Firing resolves **instantly** (same frame) against the nearest hittable object
   under the site — no travelling player bolt, no bolt lifetime.
2. A dead-on shot hits a tower **regardless of its lateral offset and regardless
   of closing speed** — the lead-fraction defect is gone (the table above goes to
   0 % at every closing speed).
3. Trigger opens an **8-game-frame** sweep window; it decrements once per game
   frame and is **retriggerable** (re-firing reloads it to 8).
4. In the trench, the beam/resolution is **clipped to 28,672 units forward**.
5. Beam originates at the **ship point** (sw7-16's `[0, altitude, 0]` surface
   point), not the origin/`COCKPIT`.
6. Enemy fireballs still travel as projectiles with unchanged behavior.
7. Suite stays green.

## Audit bookkeeping (required by the epic's contract)
- Stamp `remediated_by` for **G-004** (and **G-012** if the sweep lands) in
  `docs/audit/findings/pair-guns.json`.
- Reanchor citations; keep the citations suite green.
- **TRAP — frozen evidence:** remediated citations stay **frozen as history**.
  Do NOT launder them onto live lines; that is the reanchor tool's contract and
  the suite enforces it.

## Inherited follow-ups routed here by sw7-16's review (non-blocking)
Obi-Wan's approving round-3 verdict on sw7-16 explicitly routed three items to
this story. They are **non-blocking** — weigh them against a 5-pt budget — but (b)
is a live hazard for exactly this story's change:

- **(a) NaN guard claim is unguarded.** The guard's "don't charge a shield" claim
  is untested: a `= 0` fix passes the whole suite while charging a phantom shield.
  One-line fix — assert no terrain-crash event.
- **(b) `spawnTie`'s `toCockpit` call is untested.** It is safe *only while `dir`
  is vestigial*, and sw7-16's reviewer named **R11b's hitscan beam as the candidate
  to break that**. If this story's beam gives `dir` meaning, that latent hole opens.
  Check it deliberately rather than discovering it in review.
- **(c) `tests/support/aim.ts` pulls `src/shell/render` into three pure-core
  suites** — a core/shell boundary erosion in the test helpers.

## Architectural constraint (star-wars hard rule)
`src/core/` is pure and deterministic: no DOM/canvas, no `Date.now()`/
`performance.now()`/`Math.random()`, no imports from `shell/`. Time enters only as
`dt`; randomness only via the seeded RNG in `GameState`. Collision resolves in 3D
world space, not screen pixels. The hitscan resolve belongs in `core/`; only the
beam stroke belongs in `shell/`.

---
_Context authored by SM (Thrawn) at setup from the ruled design spec; supersedes
the `pf context create` stub, which carried no approach or ACs._
