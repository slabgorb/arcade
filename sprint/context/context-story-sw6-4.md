# Story sw6-4 Context

## Title
Every shipped Star Wars sound effect is baked at DOUBLE SPEED — the FX driver runs on the 8ms boundary, not the 4ms sound IRQ, and AUDDO's own header comment ("EVERY 16 MILS") is stale

## Metadata
- **Story ID:** sw6-4
- **Type:** bug
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** star-wars
- **Epic:** Star Wars — ROM audio fidelity (the music that has never played)

## Problem
`tools/pokey-bake/bake-sfx.mjs:111` sets `SW_BEAT = 0.004096` with the comment 'sound-IRQ period'. The 4.096 ms IRQ is real — but the FX driver is NOT walked by it. `SNDAUX.MAC:165-168` gates the call: `LDA $INTCT / LSRA / IFCC` with the comment ';?8 MILL BOUNDARY?' — `$INTCT` increments once per 4 ms interrupt (`SNDAUX.MAC:102`) and `LSRA` shifts exactly ONE bit into carry, so `JSR AUDDO` fires on every OTHER interrupt. The FX tick is 8.192 ms and every shipped effect is therefore twice as fast as the cabinet's. Re-baked and confirmed by ear (2026-07-14): all seven effects double in length and the longer ones are right. WHY IT SURVIVED AN EAR CHECK: `SW_BEAT` scales the TIME axis only — it sets how long each register value is held (`stepDur = duration * SW_BEAT`, `bake-sfx.mjs:122`) and never touches the AUDF values, so a frequency sweep runs twice as fast through the IDENTICAL pitches. Nothing is transposed; the envelope is merely rushed. The effects sound like SHORTER versions of the right sound, not higher ones — there is no wrongness to hear, only absence, which is exactly what an ear signoff cannot catch. ⚠ THE SOURCE CONTRADICTS ITSELF AND ONE WITNESS IS LYING: AUDDO's own header (`SNDAUD.MAC:1084-1085`) says 'UPDATE AUDIO EVERY 16 MILS'. That comment is STALE. Its caller gates on ONE bit, not two (16 ms would need `ANDA #03`), and AUDDO's body (`SNDAUD.MAC:1086-1126`) contains NO internal divider — one `DEC AU$TMR(X)` per call per channel — so its tick IS its call rate. This is the sw6-1 lesson exactly: a label's comment is not its caller (`PMBEN` said ';BENS THEME (START OF TOWER)' and was the game-over theme). The call site wins.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
- RED FIRST — CORRECTION: `tools/pokey-bake/bake-sfx.test.mjs` DOES exist (I claimed otherwise; I was wrong). The point is sharper than that: it is format-AGNOSTIC by design (story 8-7) — it pins that the effects EXIST, are named, carry data, and that the script is present, but it never IMPORTS the tool and never asserts a DURATION. So the suite was green and blind, and a 2x error in every shipped effect rode through a release. Existence is not correctness. Add the timing tests it should have had; they must FAIL against the shipped `SW_BEAT`.
- PIN THE TICK TO THE CALL SITE, AND REFUTE BOTH RIVALS — the test must refute 4.096 ms (the base IRQ, which is the sound board's clock but NOT the FX driver's) AND 16.384 ms (AUDDO's own stale header). Not merely assert 8.192. Cite the evidence in the test: `$INTCT` increments per 4 ms IRQ; `LSRA/IFCC` consumes ONE bit; 16 ms would require a two-bit gate; AUDDO's body has no internal divider. This project has now been bitten by a stale ROM label twice (PMBEN, AUDDO) and by a radix misread twice — refute, do not assert.
- IT IS A PURE TIME SCALE — NO PITCH MOVES — every effect must come out exactly 2x longer with its AUDF values unchanged. Assert this: the corrected bake's peak/spectral content must match the current one; only the durations change. If a pitch moves, the fix has touched something it should not have. Measured before -> after: player_fire 0.233->0.446, enemy_fire 0.086->0.151, enemy_explosion 0.831->1.620, player_explosion 0.544->1.069, wave_clear 0.233->0.446, spawn 0.249->0.479, terrain_crash 0.454->0.888.
- FIX THE LYING COMMENT TOO — `bake-sfx.mjs:111` currently says 'sound-IRQ period (6532 timer, ~244 Hz)', which is a true statement about the IRQ and a false one about the FX driver. A future reader will 'correct' 8.192 back to 4.096 on the strength of it. State the gate, name `SNDAUX.MAC:165-168`, and say that AUDDO's own 16-mil header is stale.
- RE-BAKE AND UPLOAD — all seven .wav re-baked and live in the arcade-assets R2 bucket under star-wars/sfx/, answering 200 with NEW checksums (unlike sw6-3, this story SHOULD change the assets — that is the point). Use `just deploy-assets` from the orchestrator; CI cannot do it (it only uploads an app's dist/).
- THE ACCEPTANCE TEST IS THE GAME, NOT A GREEN VITEST — fire the lasers, kill a TIE, crash into the terrain, and hear effects that are twice as long as today's. Verify in a real browser with a cold cache and say so in the session. Port trap: a pinned arcade port may be served by a SIBLING CHECKOUT, so confirm the server's cwd with `lsof` first.
- CHECK, DO NOT ASSUME, THE OTHER BEAT — `bake-sfx.mjs:66` also carries `const BEAT = 1/250` for TEMPEST's older `alsoun` record format. That is a different game on a different sound board; do NOT change it as collateral. Say in the session whether it was checked and why it is (or is not) affected.

---
_Generated by `pf context create story sw6-4` from the sprint YAML._
