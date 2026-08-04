# Story jt9-40 Context

## Title
The egg wave's TWO pre-mature hatchings — PWHCH shortens two of the twelve eggs' waits by a VRAND draw

## Metadata
- **Story ID:** jt9-40
- **Type:** story
- **Points:** 3
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust — the remainder, re-ordered: apparatus, gameplay, geometry, brains, dossier

## Problem
Descoped out of jt9-38 on 2026-08-03 by TEA, with the reasoning read from the ROM rather than asserted, and confirmed by the Reviewer. jt9-38 ported the egg wave's DENSITY (twelve eggs) and the NENEMY/WENEMY population gate. PWHCH is the third unmodelled piece of the same WAVEGG block and it was deliberately left out.

WHAT THE ROM DOES. The egg-wave setup loads LDA #2 / STA PWHCH,U "NUMBER OF PRE-MATURE EGG HATCHINGS" (JOUSTRV4.SRC:2776-2777), immediately before the two placement loops jt9-38 transcribed. PWHCH is then consumed inside CREGG, the routine that creates each egg (JOUSTRV4.SRC:2888-2894):

  2886   LDB  PEGGTM,U      HATCHING TIME
  2887   STB  PJOYT,Y
  2888   DEC  PWHCH,U       ANYMORE EGGS TO HATCH PREMATURLY?
  2889   BMI  20$
  2890   JSR  VRAND         A RANDOM NUMBER 0-127
  2891   MUL                GET A RANDOM TIME 1/2 OF THE RANGE
  2892   NEGA
  2893   ADDA PJOYT,Y
  2894   STA  PJOYT,Y       NEW HATCHING TIME

So each created egg first takes the wave's PEGGTM (the EGGWT2-derived wait jt9-9 ported), and then the first TWO eggs created have that wait SHORTENED by a random amount up to half its range. The count is TWO and the ROM's own comment is right: PWHCH starts at 2, and DEC-then-BMI shortens on the DEC to 1 and the DEC to 0 (BMI branches only on NEGATIVE), then skips from the DEC to -1 onward.

A NOTE ON THAT COUNT, because the first draft of this filing got it wrong. SM initially wrote "three, despite the comment saying two", reasoning that the DEC/BMI pair fires on 2, 1 and 0. It does not: the egg whose DEC lands on 0 is shortened, and the NEXT egg's DEC lands on -1 and is skipped, giving two. The lesson is the inverse of the usual one in this repo — here the 1982 comment was accurate and the re-derivation was not. Distrusting a ROM comment is right; replacing it with an unchecked count is not. Re-run the three-line trace before building on either number.

WHY IT WAS DESCOPED, and it is a real reason rather than a scoping shrug. The shortening draws from VRAND, i.e. it CONSUMES THE WAVE'S RNG STREAM once per affected egg. jt9-38 already carried a determinism question, and folding this in would have moved the seeded fixtures a second time inside one story while its own AC-7 fixtures were still being measured.

WHAT THE PORT LOOKS LIKE TODAY. plugins/joust/src/core/demo.ts's spawnWaveEggs deals twelve eggs (6 + 6, JOUSTRV4.SRC:2778-2779 and :2805-2806) and seeds NO waitFrames on any of them; the hatch pass in stepDemo lazily resolves each egg's wait via eggWaitFrames('EGGWT2', waveOrdinal). Measured on the real seeded demo at wave 5, seeds 0x1234/0xbeef/0x2468: all twelve mature on the SAME frame, f=624. That simultaneity is exactly what PWHCH exists to break up, and it is also why jt9-38's population gate is so visible — six hatch and six defer on one frame. With PWHCH the first three would arrive earlier and the pile-up would soften.

ACCEPTANCE, and the traps.
 - Model the shortened wait for the first N eggs an egg wave deals (N derived from the DEC/BMI, not from the ROM's comment — see above), drawn from the run's seeded RNG so it stays deterministic.
 - EXPECT A DETERMINISM RE-BASELINE and land it as its own commit per this epic's standing rule. Unlike jt9-38 this one probably DOES move pins: it perturbs egg timing on every egg wave, and it consumes RNG, which shifts every subsequent draw. But MEASURE it rather than budgeting for it — jt9-38 predicted a re-baseline and had none, because natural seeded play reaches only wave 1-2 in 3000 frames while the first egg wave is wave 5. Check whether any fixture reaches an egg wave at all before assuming.
 - The gate jt9-38 shipped reads the population at the moment each egg's wait expires. Staggering the maturities changes WHICH eggs are deferred and when, so re-read plugins/joust/tests/demo-jt9-38.test.ts's AC-2/4 block before changing anything: its twelve-at-once fixture stages waitFrames explicitly and should be unaffected, but the seeded observations in the session's assessments will move.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

**CAUTION FOR TEA — the count N is contested in this filing's own history.**
SM's first draft said THREE; the corrected reading is TWO (DEC-then-BMI: the
DEC to 1 and the DEC to 0 both shorten, since BMI branches only on NEGATIVE;
the DEC to -1 skips). The Problem section above still carries one stale
sentence — "With PWHCH the first three would arrive earlier" — which
contradicts the TWO in this story's own title and body. **Re-run the
three-line DEC/BMI trace against JOUSTRV4.SRC directly (:2888-2894 above) and
derive N yourself rather than transcribing either number.**

**Prior-story handoff.** `sprint/archive/jt9-38-session.md` is the
immediately preceding story and it descoped this work; its assessment
section records the measured baseline that matters here — all twelve eggs
of the wave-5 egg wave mature on the SAME frame, f=624, at seeds
0x1234/0xbeef/0x2468. Read that file before staging fixtures.

**Determinism.** The shortening draws from VRAND, i.e. it consumes the run's
seeded RNG. Per this epic's standing rule, land any re-baseline as its own
commit — but MEASURE whether any fixture reaches an egg wave at all before
assuming one is needed (jt9-38 predicted a re-baseline and had none: natural
seeded play reaches only wave 1-2 in 3000 frames while the first egg wave is
wave 5).

**Touch points:**
- `plugins/joust/src/core/demo.ts` — `spawnWaveEggs`, the hatch pass in
  `stepDemo`, `eggWaitFrames`.
- `plugins/joust/tests/demo-jt9-38.test.ts` — its AC-2/AC-4 block: the
  twelve-at-once fixture stages `waitFrames` explicitly and should be
  unaffected, but seeded observations will move.

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
_No acceptance criteria recorded in the sprint YAML — TEA to define during the RED phase._

---
_Generated by `pf context create story jt9-40` from the sprint YAML._
