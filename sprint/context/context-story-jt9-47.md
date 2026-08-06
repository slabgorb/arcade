# Story jt9-47 Context

## Title
The hatched remount buzzard HARDCODES type 'bounder' — a hunter/shadow-lord loses its species on remount (ROM keeps PID/PEGG, JOUSTRV4.SRC:3251-3252)

## Metadata
- **Story ID:** jt9-47
- **Type:** bug
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust — the remainder, re-ordered: apparatus, gameplay, geometry, brains, dossier

## Problem
Filed by the Architect, 2026-08-05, split out of jt9-46 (the enemy-rider render fix) as the
user directed. jt9-46 makes this VISIBLE — once enemies draw their DPLYR rider, a remounted
hunter or shadow-lord will re-ride as a bounder — but the defect is in the SIM, not the render,
so it is its own story.

WHAT THE PORT DOES NOW. remountEnemyProcess (demo.ts:1056-1082) — the buzzard a SETTLED egg
hatches into — builds its EnemyState with `const type: EnemyType = 'bounder'` hardcoded
(:1058), then `decision: brainFor(type)` and `enemyType: type`. So EVERY hatched bird is a
bounder regardless of the species that laid the egg. The one species-carrying field it DOES
preserve is eggsLeft (:1076-1080, cited :3251-3252) — which the docblock there already frames
as "what makes permadeath reachable" — so the omission of the TYPE is a visible inconsistency
in the same function: it copies PEGG forward but not the species PEGG belongs to.

WHAT THE ROM DOES. The remount (EGGLND/MOUNRI) carries the bird's identity across the hatch.
PEGG is maintained (`LDA PEGG,U / STA PEGG,Y`, :3251-3252, already ported). The species PID and
its decision pointer come from the same egg/parent record — a hunter's egg remounts a hunter,
a shadow lord's a shadow lord — not a fixed bounder. Read the exact fields at RED from the
vendored EGGLND/MOUNRI block (:3239-3279); the vendored tree is not in this checkout (sibling
a-2, like red-baron) and these suites degrade to committed fixtures on CI (vendoredAvailable).

WHERE THE TYPE MUST COME FROM. EggState must carry the laying enemy's species so the remount
can restore it. Check egg.ts — the egg is created at DEATH3 from the dying enemy (egg.ts:157
region); if it does not already record the parent's EnemyType, adding that field is part of
this story, threaded from the enemy that dropped it through to remountEnemyProcess. Do NOT
infer the species from any other signal; carry it explicitly.

WHY IT MATTERS BEYOND LOOKS. decision: brainFor(type) means the remounted bird also gets the
BOUNDER brain (boundr), so a hatched hunter loses its hunter pursuit (b2undr) and a shadow lord
its SHADOW brain — a behaviour regression, not only a colour one. And killScore(enemyType)
(joust.ts:243) scores every remount as a bounder, so the 750/1500-point kills are unreachable
on any bird that has hatched at least once.

WATCH THE DETERMINISM BAR. Changing the remounted bird's brain changes its flight, so a seeded
replay that lets an egg hatch and then steps the bird will move. Expect a re-baseline on those
fixtures; land it as its own commit per this epic's standing rule and RE-FIND the moved frames
by re-running the seeded sweeps, not by nudging them to whatever the new code prints.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
- AC-1 A REMOUNT PRESERVES THE LAYING SPECIES. A hunter's settled egg hatches into a hunter and a shadow-lord's into a shadow-lord — remountEnemyProcess takes the species from the egg, not the hardcoded 'bounder' (demo.ts:1058). Guard all THREE species through a full drop→settle→hatch cycle and assert the remount's enemyType matches the parent. MUTATION: restoring the `= 'bounder'` hardcode must redden a named test.
- AC-2 EGGSTATE CARRIES THE PARENT SPECIES, SET EXPLICITLY AT DEATH. The egg records the dropping enemy's EnemyType at creation (egg.ts, the DEATH3/egg-spawn site) and remountEnemyProcess reads it — the species is THREADED, never inferred from position, brain, or colour. Guard that an egg dropped by each species carries that species. MUTATION: dropping the field (defaulting to bounder) must redden.
- AC-3 THE REMOUNT KEEPS ITS BRAIN AND ITS SCORE. decision resolves via brainFor(remountType) so a remounted hunter carries the b2undr brain and a shadow-lord SHADOW (enemy.ts:531-539), and killScore(enemyType) (joust.ts:243) pays the species' real value on a bird that has hatched. Guard a hatched hunter's decision brain is b2undr (not boundr) and its kill scores as a hunter. This is the behaviour half — pin it distinctly from AC-1's identity.
- AC-4 PEGG IS STILL PRESERVED, AND THE 4-EGG PERMADEATH STILL TERMINATES. The existing eggsLeft carry-forward (demo.ts:1076-1080, JOUSTRV4.SRC:3251-3252) is untouched and the complement still walks to permadeath at 0 — adding the species must not perturb the egg-count ladder. Guard a full 4-egg depletion of a non-bounder species reaches permadeath (no regeneration), so the type thread did not reopen the count-to-zero the eggsLeft comment guards.
- AC-5 DETERMINISM RE-BASELINE LANDS AS ITS OWN COMMIT, RE-FOUND NOT NUDGED. Per this epic's standing rule: any seeded fixture that hatches a non-bounder and then steps it will move because the brain changed; re-run the seeded sweeps, take the moved frames from that run, and name in the commit message which seeds moved and why. Event-searching tests should survive; frame-pinned ones will not.

---
_Generated by `pf context create story jt9-47` from the sprint YAML._
