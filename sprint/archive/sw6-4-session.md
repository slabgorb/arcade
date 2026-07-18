---
story_id: "sw6-4"
jira_key: "sw6-4"
epic: "sw6"
workflow: "tdd"
---
# Story sw6-4: Every shipped Star Wars sound effect is baked at DOUBLE SPEED — the FX driver runs on the 8ms boundary, not the 4ms sound IRQ, and AUDDO's own header comment ("EVERY 16 MILS") is stale

## Story Details
- **ID:** sw6-4
- **Jira Key:** sw6-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** star-wars
- **Branch:** fix/sw6-4-sfx-double-speed
- **Branch Strategy:** gitflow (feat/fix/{STORY_ID}-{SLUG})

## Workflow Tracking
**Workflow:** tdd
**Phase:** red
**Phase Started:** 2026-07-18T11:15:02Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T11:12:34Z | 2026-07-18T11:15:02Z | 2m 28s |
| red | 2026-07-18T11:15:02Z | - | - |

## SM Assessment

**Setup complete — routing to TEA for the RED phase.**

**Story shape.** sw6-4 (3pt, p1, TDD) is a ROM-fidelity timing fix in the star-wars
SFX bake pipeline. `tools/pokey-bake/bake-sfx.mjs:111` hard-codes `SW_BEAT = 0.004096`
(labeled "sound-IRQ period"). The 4.096 ms IRQ is real, but the FX driver is not walked
by it: `SNDAUX.MAC:165-168` gates `JSR AUDDO` behind `LDA $INTCT / LSRA / IFCC`
(";?8 MILL BOUNDARY?"). `$INTCT` increments once per 4 ms interrupt, `LSRA` shifts
exactly ONE bit into carry, so AUDDO fires on every OTHER interrupt. The true FX tick is
**8.192 ms** → `SW_BEAT` should be `0.008192`. Because `SW_BEAT` scales only the TIME
axis (`stepDur = duration * SW_BEAT`, `bake-sfx.mjs:122`) and never touches AUDF values,
the fix doubles each effect's *duration* without transposing pitch — which is exactly why
it survived an ear check (effects sounded shorter, not wrong).

**The trap for TEA.** The source contradicts itself: AUDDO's own header
(`SNDAUD.MAC:1084-1085`) says "UPDATE AUDIO EVERY 16 MILS". That comment is STALE — 16 ms
would require a two-bit gate (`ANDA #03`), but the caller gates on ONE bit, and AUDDO's
body has no internal divider (one `DEC AU$TMR(X)` per call per channel), so its tick IS
its call rate. This is the sw6-1 lesson: **the call site wins over the label comment.**
The RED test must pin the derivation to the CALLER's one-bit gate (8.192 ms), not the
header's 16 ms and not the raw 4.096 ms IRQ.

**Scope note for TEA/Dev.** Changing `SW_BEAT` re-bakes the seven shipped effects (the
description reports they were re-baked and ear-confirmed 2026-07-14). Watch for baked
asset outputs / golden fixtures that encode the old durations — those are the behavioral
surface the test should assert against.

**Workflow decision.** Story YAML tags `tdd` (3pt) — honored, no override. Phased
workflow → exit protocol → TEA (Han Solo) owns RED.

## SM Close-Out — already-shipped (2026-07-18)

**Outcome: closed as ALREADY-DONE. No new red/green/review cycle was run —
the entire scope had already shipped hot, outside the workflow.**

TEA (Han Solo) entered the RED phase and found there was nothing left to make
fail: the story's whole implementation had already been merged in
**PR #87 (`89a6a30` — "fix(sw6-4): the FX driver ticks at 8.192ms, not the
4.096ms sound IRQ")**, dated 2026-07-14, present on **both `develop` and
`origin/main`**. Every AC is satisfied:

| AC | State | Evidence |
|----|-------|----------|
| Timing tests that fail against shipped `SW_BEAT` | Done (they pass now — source already correct) | `tools/pokey-bake/bake-sfx.test.mjs`: `FX_TICK = 0.008192`, refutes IRQ 4.096 & header 16.384, asserts the ×2 factor. 18/18 green. |
| Pin tick to call site, refute BOTH rivals | Done | Same test block cites `$INTCT`/`LSRA/IFCC`/one-bit gate. |
| Pure time scale — no pitch moves | Done | `EXPECTED_SECONDS` duration table matches the AC's before→after numbers (player_fire 0.446, player_explosion 1.069, …). |
| Fix the lying comment | Done | `bake-sfx.mjs:111-136` fully rewritten — names `SNDAUX.MAC:165-168`, flags AUDDO's 16-mil header as stale. |
| Re-bake + upload 7 `.wav` to R2 | Done | All 7 live at `arcade-assets.slabgorb.com/star-wars/sfx/`, HTTP 206, `last-modified 2026-07-16`. |
| Browser ear-check | Claimed done (2026-07-14, per story narrative) | Not re-verified this session — user (Jedi) chose to close without re-driving the browser. |
| Don't touch Tempest's `BEAT = 1/250` | Held | `bake-sfx.mjs:66` `BEAT` untouched by PR #87; it is Tempest's ALSOUN format on a different sound board. |

**Root cause of the tracking gap:** PR #87 implemented and merged the fix "hot"
(it even names `sw6-4` in its commit message) before the story was ever run
through the pf workflow, so `sprint/epic-sw6.yaml` was left at `status: backlog`.
This is the "code done outside the workflow, tracking stale" pattern.

**Close-out actions:** empty setup branch `fix/sw6-4-sfx-double-speed` (0 commits)
deleted; no PR to merge (#87 already merged); story marked done; session archived.
`started`/`completed` set to 2026-07-14 to match PR #87, not the bookkeeping date.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

None.