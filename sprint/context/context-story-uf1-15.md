# Story uf1-15 Context

## Title
star-wars C_AS's fire cone is INVENTED — the ROM's own gate is a squared screen radius (WSCPU.MAC:615-618)

## Metadata
- **Story ID:** uf1-15
- **Type:** bug
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Unwired features — ported-but-unconsumed mechanics found by the 2026-07-28 fleet sweep

## Problem
Found by TEA during uf1-12's RED phase while answering that story's own open question ("does WSMAIN.MAC:3930's gate give a portable threshold that could retire the C_AS guess too?" — it does NOT; the two bits are set by different machines on different sides of the fight). tie-status.ts's FIRE_CONE_COS = Math.cos(12°) is INVENTED and says so: 'TODO(playtest): this 12° is INFERRED (the design spec's §6 gives only "bit $10 set", not the angle)'. But the ROM does carry a literal. WSCPU.MAC:615-618 is the whole C$AS gate: 'LDD M.YPS / ADDD M.ZPS / CMPD #20 ;?AIMING NEAR SHIP? / BHI 140$' — set C$AS when (Y² + Z²) <= 0x20 = 32. The 'S' suffix means SQUARED, proven in the sibling view pass where the same operands carry the author's own annotation: 'LDD M.YPS / SUBD M.XPS ;X SQUARED' (WSMAIN.MAC:3835 and again :3841). So the cabinet's aiming test is a CIRCLE of radius sqrt(32) ~= 5.66 in math-box projected screen units, taken after the M$PSB2 view transform — i.e. a fixed screen radius, which IS an angular cone and therefore DOES convert to a cosine once the math box's screen-units-per-radian scale is pinned. That scale is the only missing piece; the existing comment's claim that 'there is no direct unit conversion to a cosine threshold' is true only while the scale is unpinned, not in principle. Two things bound the blast radius, both verified: (1) sw8-9 removed C_AS from the §6 fire gate entirely (sim.ts: 'NO AIM CONE (sw8-9) … C$AS is computed just above it (:619-621) for the CHOREOGRAPHY to branch on and is never read by the gate'), so a retune moves FLIGHT behaviour — the '.CUNTIL C$AS' release conditions scattered through the scripts — and not fire rate; (2) uf1-12 deliberately did NOT touch it: C_PS's port sidesteps the projected-unit problem by riding on the clone's existing world-space kill radius (the ROM expresses C$PS as 3xTMPSIZ against the laser hit's 1.5xTMPSIZ, a unit-free doubling), so it sets no precedent for C_AS and leaves this genuinely open. Deliverable: pin the math-box projected scale from the source, convert 0x20 to a half-angle, replace the invented 12° or log a reasoned deviation if the scale proves unrecoverable — and either way retire the TODO(playtest) with an answer instead of a guess.

## CORRECTED 2026-08-02 BY uf1-15 — the premise above is REFUTED by primary source

The Problem statement and AC-1/AC-2 are preserved as the record of why this story was filed.
They are **wrong**, and the story shipped against the corrected law. Do not carry the original
framing forward into a sibling story.

**What is wrong.** "A CIRCLE of radius sqrt(32) ~= 5.66 in math-box projected **screen** units …
which IS an angular cone and therefore DOES convert to a cosine" is false twice over:

1. **No perspective divide runs on this path.** M$PSB2 is math box PC $67 (WSGLOB.MAC:177), and
   SWMP.DOC:140-158 documents it as translate-and-halve → rotate → **square**. The perspective
   multiply is a different program — PERS, PC $86, SWMP.DOC:180-187. So `M.YPS`/`M.ZPS` are
   squares of VIEW-space offsets, not screen coordinates.
2. **The gate carries no depth term.** `M.YPS + M.ZPS` is compared to a bare constant. The sibling
   ratio tests that ARE ±45° cones subtract depth explicitly (`LDD M.YPS / SUBD M.XPS`,
   WSMAIN.MAC:3834-3835 and :3840-3841; WSSTAR.MAC:135-139). C$AS is not one of them.

A lateral+vertical bound with no depth term is a **cylinder about the alien's nose axis**, and a
cylinder has no half-angle at any scale. `FIRE_CONE_COS` had the wrong SHAPE, not merely an
unmeasured number, so it was deleted rather than retuned. The `~5.66` figure is wrong
independently: it omits both the multiplier's `/$4000` (SWMP.DOC:17) and PRE2's ×2 halving.

**What was right.** The story's other half — that the scale is pinnable — holds, and pinning it was
the real deliverable. `world = 2·√(S · $4000)`, exported as `psb2SquaredToWorld`, cross-validated on
the ROM's two other thresholds, which it lands on exact round hex ($900 → $3000, $100 → $1000).

**What shipped:** `AIM_AXIS_RADIUS = psb2SquaredToWorld(0x20)` = 1024·√2 = 1448.15 world units,
plus the ROM's two enclosing gates — `?PLAYER IN FRONT?` (WSCPU.MAC:607-608) and the `$8000`
range bound (:610-611) — without which an infinite nose axis would put the player in the sights of
a fighter pointed directly away.

**Superseded ACs:** AC-1 and AC-2 as written are unsatisfiable — there is no half-angle to convert
to, and no cosine can satisfy the tests (a fighter 8.53° off-nose must CLEAR while one 18.43° off
must SET, which inverts what any angle gives). AC-3, AC-4 and AC-5 stand and were met.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria

1. **ROM source analysis:** Locate and document the math-box projected scale from the source (likely in `@shared/math3d` or ROM reference materials), establishing the screen-units-per-radian conversion that links the squared radius 0x20 = 32 (radius ~5.66 screen units) to an angular half-angle.

2. **Replace or log:** Either replace the invented `FIRE_CONE_COS = Math.cos(12°)` constant in `plugins/star-wars/src/core/tie-status.ts` with the derived ROM-grounded value, OR log a reasoned deviation explaining why the projected scale is unrecoverable and justify the retained 12° as the best available approximation.

3. **Retire the guess:** Remove or rewrite the `TODO(playtest): this 12° is INFERRED` comment in tie-status.ts so it documents the answer (ROM source + derivation, or the logged deviation) instead of the guess.

4. **Verify scope boundaries:** Confirm that C_AS tuning affects only choreography release conditions (`.CUNTIL C$AS` in tie-waves.ts and similar) and not fire rate, as per sw8-9's removal of C_AS from the §6 fire gate. Mutation-prove the change non-vacuous: adjusting the cone angle should affect choreography transitions, not the gate itself.

5. **Citation trail:** Record where the ROM reference sources live (docs/references/SW/ and the gitignored disasm), and note that edits to cited src files (sim.ts, tie-status.ts) require running `tools/audit/reanchor-citations.mjs --write` to update line-number citations in audit findings.

---
_Generated by `pf context create story uf1-15` from the sprint YAML._
