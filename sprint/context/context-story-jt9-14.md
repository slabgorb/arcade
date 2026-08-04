# Story jt9-14 Context

## Title
Player-vs-ptero attack is box-only too — the third pass that stops at broadPhase, and the narrowPhase X-blindness question it forces

## Metadata
- **Story ID:** jt9-14
- **Type:** bug
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust — the remainder, re-ordered: apparatus, gameplay, geometry, brains, dossier

> ⚠ **CORRECTION — read before the Problem text below (SM, verified against the live tree 2026-08-04).**
> The line cites in the epic description below are **STALE** (the file grew since filing) and it implies the
> wrong directory. Do not chase `~:982` / `~:1073` / `~:734`. Current, verified locations — all in
> `plugins/joust/src/core/demo.ts` (**core**, not shell):
> - **player-vs-ptero attack pass (THE defect):** `:1491` `broadPhase(collisionBox(playerJoust), entityBox(pt.entity!))` → `resolvePteroAttack` at `:1493`, no narrowPhase between them.
> - **egg-catch pass (jt8-7's fixed reference):** broadPhase THEN narrowPhase at `:1544`/`:1552`.
> - **joust pass (correct reference):** `:1379`/`:1385`.
> - **`collisionMaskFor`:** `:1181`, returns `'PT1RC'` for a ptero at `:1184`.
> - **PT1RC:** live COLLISION_TABLES entry in `core/pictures.ts:1829`, **13 span rows** (4 blank + 6 real + 3 blank).
> - **`narrowPhase` / `MaskRef`:** `core/joust.ts:177` / `:56`.
>
> The **premises** in the description are all TRUE in shape — only the line numbers drifted. The full measured
> block, the ROM-verification research obligation, and the audio-events re-baseline watch-for live in
> `.session/jt9-14-session.md` → *Story Background*. **ACs are `null` in the YAML → derive them during RED
> against the CURRENT lines above.**

## Problem
Filed by jt8-7, which wired narrowPhase into the player-vs-EGG catch pass and left this one alone by an explicit user ruling at setup ("Same defect family, deliberately a separate story. Do NOT widen jt8-7 to cover it.").

THE DEFECT. `collisionPass` has THREE overlap passes and only two of them consult a mask:
  - the joust pass (demo.ts:887-897) — broadPhase THEN narrowPhase. Correct.
  - the player-vs-egg catch (demo.ts ~:1073) — broadPhase THEN narrowPhase as of jt8-7. Correct.
  - the player-vs-ptero attack (demo.ts ~:982) — `broadPhase(collisionBox(playerJoust), entityBox(pt.entity!))` and NOTHING ELSE.

The third one is not blocked on a missing asset the way the egg was: `collisionMaskFor` (demo.ts ~:734) ALREADY returns the real transcribed mask 'PT1RC' for a ptero, and PT1RC is a live COLLISION_TABLES entry with 13 span rows. So the mask exists, is transcribed, is claimed, is reachable through the existing helper — and the pass that most needs it (a lance-height duel resolved by `resolvePteroAttack`) never asks for it. Effect: the player's reach against a pterodactyl is the flat 16px ENTITY_BOX_H box, exactly the bug jt8-7 fixed for eggs.

MEASURED SHAPE OF THE FIX (jt8-7's, for reference — this pass will differ in the details): the catch now does
    if (catcher.collision === null) continue
    if (!narrowPhase({name: catcher.collision, top: catcher.posY >> 8},
                     {name: <the other party's mask>, top: <its top>}, MASKS)) continue
Note the null guard is load-bearing for the TYPE checker even where it is unreachable at runtime — removing it fails `npm run lint` with TS2322, not a test.

SETTLE THIS FIRST — the question jt8-7's Reviewer raised and could not close. `narrowPhase` (joust.ts:166-183) takes `MaskRef = {name, top}`: it aligns rows by SCREEN Y and then compares COFF-unbiased SPRITE-LOCAL columns. It never sees screen X at all — `broadPhase` carries every bit of the horizontal truth. So the mask test is really "do these two shapes overlap if their origins are superimposed", and the column half still does real work (jt8-7 measured a rejection at dy=12 that is a COLUMN miss, not a row miss). Whether that matches the ROM's own collision comparison has never been established; it dates to jt2-3 and has been inherited unexamined ever since. This story makes it govern a THIRD pass, so it is the right moment to read the ROM's comparison and either confirm the port or file the correction. Do not port a third consumer onto an unverified premise without saying so.

WHY THIS IS NOT jt5-17 (now jt9-15). jt5-17 (now jt9-15) ("Measure PTEBRD and route the ptero-vs-buzzard pair") is about the PAIR LOOP's mixed-pair skip — replacing `if ((pa.kind === 'ptero') !== (pb.kind === 'ptero')) continue` with the measured PTEBRD routing so a ptero and a BUZZARD resolve at all. That is a routing question about a pair that currently resolves NOTHING. This story is about a pair that already resolves — player vs ptero, through `resolvePteroAttack` — and does so with the wrong GEOMETRY. Different loop, different routine, different failure. They are adjacent enough to be merged by a groomer who reads only the titles; they should not be.

WATCH FOR: jt8-7's fix moved four frame-exact seeded pins in tests/audio-events.test.ts because a tighter collision changes what happens when in a deterministic replay. Expect the same here, and re-baseline by SCANNING for each test's own precondition rather than nudging numbers — the method is written up in the jt8-7 session and the Dev sidecar.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
_No acceptance criteria recorded in the sprint YAML — TEA to define during the RED phase._

---
_Generated by `pf context create story jt9-14` from the sprint YAML._
