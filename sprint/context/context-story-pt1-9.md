# Story pt1-9 Context

## Title
tempest: difficulty select should preview the board layout per level, and starting higher should pay a bonus

## Metadata
- **Story ID:** pt1-9
- **Type:** bug
- **Points:** 5
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Playtest bug sweep 2026-08-19 (pt1)

## Problem
Playtest 2026-08-19: the level select should preview each board (web) layout and pay
a bonus for starting higher. **Research (2026-08-19): the bonus already PAYS —
`startWaveBonus` shipped in tp1-13 — but nothing ever SHOWS it, and no preview is
drawn. The authentic RATE YOURSELF screen shows a 5-wide scrolling window with
LEVEL # + BONUS + a small well drawing per column.** This story is the remediation
of audit finding **SC-011** (STRUCTURAL, `pair-6-alscor-scoring.json`) — stamp it
`remediated_by: "pt1-9"`.

## Findings

**Current select UI:** core arm `sim.ts:1144-1163` (spin steps ±1, clamp
`[1, MAX_SELECT_LEVEL=16]` no wrap — `rules.ts:123`; start or rising-edge fire →
`startGameAtLevel`); render `render.ts:814-841` `drawSelect` — one level at a time,
no geometry, no bonus value.

**The bonus half already exists (invisible):**
`rules.ts:145-174` — `START_WAVE_BONUS_LADDER = [0, 6000, 16000, 32000, 54000,
74000, 94000, 114000]` (first 8 of the ROM's 28), `startWaveBonus(wave)` with
step = floor((wave-1)/2) clamp 0..7. Set at `sim.ts:706`, paid once in `beginFlyIn`
(`sim.ts:877-881`, single-pay pinned by `tests/core/tp1-34.warp-double-pay-guard.test.ts`).
Event `'wave-bonus'` (`events.ts:163`) + audio cue exist. **Missing: the number at
select (and arguably at pay time — render.ts:1160-1165 defers numeric tallies).**

**The preview half is nearly free:** the 16 web layouts are in core —
`geometry.ts:152-199` (ROM_X/ROM_Y/ROM_OPEN/ROM_REMAP, cited to tempest.a65),
`tubeForLevel(level)` `geometry.ts:292-295` pure/total. `tube.near` is a 16-point
ring spanning ±300; a preview = a scaled `glowPolyline` over `tube.near` (closed
iff `tube.closed`) — EXACTLY what the ROM's `DSPHOL` draws (rim outline only, no
spokes: `ALDISP.MAC:2863`, scale-5 "MAKE WELL REALLY SMALL" `:2869-2870`,
per-cycle colours `SPWECO` `ALDISP.MAC:2457`). `render.ts:5` already imports from
core/geometry. Note `drawTube` is GameState-shaped — draw the mini-ring directly,
don't reuse it.

**The authentic screen (`RQRDSP`, `ALSCOR.MAC:1074-1249`):** 5 columns
(`XPOTAB: .BYTE 0BE,0E3,09,30,58` `:1226`), scrolling window (`LEFSID`/`RITSID`
vs `CURSL1`, bounded `HIRATE`, `:1098-1128`); per column LEVEL# (green), BONUS
(red, `BODSPL` `:1250-1254`), well drawing (`DSPHOL` `:1166-1175`); white
selection box (`BOXTAB` `:1231-1234`); TIME countdown + auto-pick at 0
(`:1180-1189`, `ALWELG.MAC:210-219` — the 3s warning beep is finding S-016,
wont_fix today, would go live if a timer is added).

**The ROM's offered levels are NOT contiguous 1..16** — `LEVEL:` table
`ALWELG.MAC:280-283` = start levels 1,3,5,7,9,11,13,15,17,20,22,24,26,28,31,33,
36,40,44,47,49,52,56,60,63,65,73,81 (28 entries; table stores level−1, `INY` at
`ALSCOR.MAC:1150`). The offered prefix grows: floor of 5 choices (1,3,5,7,9 —
`LDY I,4` `ALWELG.MAC:132`), extended by last game's `HIWAVE` (`:124-131`),
operator options tie it to high score (`:133-146`), sales mode opens all 28
(`:147-151`). Our contiguous 1..16 chooser is a deliberate divergence (finding
SC-011 + SC-006 record it). **No dossier coverage exists for HIRATE/HIWAVE — new
ground if the story adopts the ladder.**

**The full bonus ladder (`BONPTM` `ALWELG.MAC:266-279`, hex/BCD ×100):**
`BONPTM[i]` pairs with `LEVEL[i]+1`, i=0..27: 0, 6k, 16k, 32k, 54k, 74k, 94k,
114k, 134k, 152k, 170k, 188k, 208k, 226k, 248k, 266k, 300k, 340k, 382k, 415k,
439k, 472k, 531k, 581k, 624k, 656k, 766k, 898k. Our ladder is the first 8; the
rules.ts comment's "start wave 2i+1" pairing is only true for i ≤ 7.

## Technical Approach
Decision for TEA/Dev, informed by the above — two coherent shapes:
- **(a) Faithful RATE YOURSELF (recommended):** the 5-column scrolling window with
  level #, bonus value, mini-well per column and the selection box; offered set =
  the ROM `LEVEL` ladder with the floor-of-5 rule (persist HIWAVE next to the high
  scores for the growth rule, or fix the floor — document either way). Extends the
  bonus ladder to all 28 cited entries. Stamps SC-011.
- **(b) Minimal:** keep contiguous 1..16, add the mini-well preview + the
  `startWaveBonus(selectedLevel)` value to `drawSelect`. Smaller, but leaves
  SC-011 open and the 1..16 divergence unremediated.
Citation gate mechanics: cite `ALSCOR.MAC`/`ALDISP.MAC`/`ALWELG.MAC`, NEVER the
`*2` twins (`linked-modules.mjs` rejects ALSCO2/ALDIS2); `ours` frozen at `4232ed4`
so code motion is safe; add a story-scoped `pt1-9.citations.test.ts` (tp1-8
pattern) asserting the SC-011 stamp.

## Scope
- In scope: select-screen preview + bonus display (+ ladder/offered-set per the
  chosen shape); SC-011 stamp.
- Out of scope: the attract pages (pt1-5); warp-screen numeric tallies (separate
  deferred item unless trivially co-landed); perturbing the geometry tables
  (`tests/core/geometry.authentic.test.ts` guards them).

## Tests affected
- `tests/shell/tp1-20.hud-messages.test.ts:324-390` — `drawSelect` body must keep
  `'SPIN KNOB TO CHANGE'` (TURQOI), `'RANKING FROM 1 TO '` + `MAX_SELECT_LEVEL`
  identifier reference, `'PRESS FIRE TO SELECT'` (YELLOW); no bare quoted `'RANK'`.
- `tests/shell/render.banners.test.ts:158-226` — `'RATE YOURSELF'`/`'RANK'`/
  `'NOVICE'`/`'EXPERT'` + colour classes.
- `tests/core/sim.framing.test.ts:108-135` — spin step/clamp/no-wrap and
  select→playing — **breaks directly if the offered set goes sparse** (shape (a)).
- `tests/core/tp1-34.warp-double-pay-guard.test.ts` — single-pay invariant must
  survive any ladder extension.
- `tests/core/geometry.cycle.test.ts:113-120` — chosen level loads its geometry.
- `tests/audit/citations.test.ts` + new `pt1-9.citations.test.ts`.

## Acceptance Criteria
_TEA to define at RED. Suggested: AC1 each selectable level shows its well outline
(from `tubeForLevel`, matching ROM_REMAP) and its bonus value from the cited
ladder; AC2 the bonus shown equals the bonus paid (one source of truth); AC3
SC-011 stamped `remediated_by: pt1-9` and the citation gate green; AC4 no strobe
(Decision B); AC5 the offered-set rule (whichever shape) is pinned + documented as
cited fact or Design Deviation._

---
_Generated by `pf context create story pt1-9`; researched and expanded by Architect 2026-08-19._
