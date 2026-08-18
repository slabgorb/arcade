# Story ml13-2 Context

## Title
Shot-kill of a segment scores the ROM head/body split (body 10 / head 100), not a flat SEGMENT_PTS=10

## Metadata
- **Story ID:** ml13-2
- **Type:** bug
- **Points:** 2
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Millipede segment-kill scoring & mushroom fidelity (ml12-3 follow-ups)

> ⚠ The sprint YAML has `description: null` and `acceptance_criteria: null` for this
> story. The Problem, Scope, and Acceptance Criteria below were **derived by SM** from
> the story title and facts measured against the current tree (see "Confirmed facts").
> They are a starting point — TEA owns anchoring them to ROM source during RED and may
> refine them. The epic YAML remains the source of truth for the title.

## Problem
When a player shot kills a millipede segment, the current code awards a **flat 10 points
per segment**, with no distinction between a body segment and a head. In the real
Millipede ROM a shot-killed segment scores the head/body split: **body = 10, head = 100**.
So decapitating the millipede (killing the head segment) should be worth 10× a body
segment, and today it is not.

This is the shot-kill sibling of ml12-3, which already made the **DDT-cloud kill** path
ROM-faithful (body 30 / head 300). The epic exists to bring the remaining segment-kill
behaviours into line with MILLI.

## Confirmed facts (measured against the current tree — do not re-measure, but re-verify before relying on any ROM claim)
- `plugins/millipede/src/core/sim.ts:72` — `const SEGMENT_PTS = 10`, commented
  *"Provisional segment score — refined when full scoring lands."* This is the placeholder
  this story retires (for the shot-kill path).
- `plugins/millipede/src/core/sim.ts:185` — `score += SEGMENT_PTS`, the single flat award
  on the player-shot kill path. **This is the change site.**
- `plugins/millipede/src/core/sim.ts:289` — carries the comment distinguishing the
  **DDT-kill** score path (ml12-3, body 30 / head 300). **This is the precedent to mirror**:
  the head/body split already exists in the codebase for one kill path; this story adds it
  to the shot-kill path with the base values body 10 / head 100.
- The head-vs-body distinction on a segment is **already modelled** in the millipede core
  (segment kill / explosion logic in `millipede.ts` and `sim.ts`). The fix is a **scoring
  branch**, not a new head/body concept.

## Technical Approach
Replace the flat `SEGMENT_PTS = 10` award at the shot-kill site with the ROM head/body
split: a body segment scores 10, a head segment scores 100. Mirror how the DDT-kill path
at `sim.ts:289` already discriminates head from body. Touch **only** the player-shot kill
path — leave the DDT-kill path (already ROM-faithful) untouched.

## ROM anchoring (TEA owns this in RED)
- Anchor the **body 10 / head 100** values to a specific line in the Millipede assembler
  source (`file:line` + verbatim quote), per the project's citation gates. **Do not carry
  these numbers on SM's word — SM did not cite them; the title asserts them.**
- **Millipede source uses `.RADIX 16` in places** (project memory: `MLSUB.MAC` is
  `.RADIX 16` — e.g. "CMP I,31" is `0x31 = 49`, not decimal 31). Verify every threshold /
  score value as hex vs decimal before pinning it. Do not assert a hex/decimal reading on
  SM's authority.
- ROM is canonical here (project rule): if a measured ROM value disagrees with the title's
  "10 / 100", follow the ROM and record the deviation — do not offer a ROM-vs-shipped choice.

## Scope
- **In scope:** the score awarded when a **player shot** kills a millipede segment —
  head (100) vs body (10) split, replacing the flat `SEGMENT_PTS = 10` at `sim.ts:185`.
- **Out of scope:** the DDT-cloud kill path (already ROM-faithful via ml12-3); mushroom
  scoring; any non-scoring segment-kill behaviour.

## Acceptance Criteria (derived — TEA to anchor to ROM and refine)
1. Killing a **body** segment with a player shot scores the ROM body value (10), anchored
   to a cited Millipede source line (`file:line` + verbatim), radix verified.
2. Killing a **head** segment with a player shot scores the ROM head value (100), anchored
   to the same cited source, radix verified.
3. The flat `SEGMENT_PTS = 10` shot-kill award at `sim.ts:185` no longer applies a single
   value to both head and body; the placeholder const at `sim.ts:72` is retired or replaced
   for the shot-kill path.
4. The DDT-cloud kill path (body 30 / head 300) is **unchanged** — a regression test proves
   it still scores its own values.
5. The core-boundary / purity test for millipede stays green (no shell/clock leakage into
   `src/core/`).

---
_Authored by SM (Ruby Rhod) from measured facts; supersedes the empty `pf context create` stub._
