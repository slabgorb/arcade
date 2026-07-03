# Story bz1-12 Context

## Title
HUD/framing fidelity + live playtest capstone

## Metadata
- **Story ID:** bz1-12
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** superpowers
- **Repo:** battlezone
- **Epic:** Battlezone (1980) — full faithful vector clone

## Problem
This is the epic's capstone and depends on every prior bz1 story. Two halves:
first, true up the cabinet framing that earlier stories shipped with the
sibling games' default glow — the cracked-glass viewport overlay, the final
gunsight reticle, score/high-score/lives rendered in the vector font, the
bz1-6 radar scope's placement, and the bichromatic presentation the epic
calls for (green wireframe world plus a green-tinted horizon overlay band
and red score/HUD text) — against footage/references from the bz1-2
findings/quarry, not invented here. In-game message strings ("ENEMY IN
RANGE", "MOTION BLOCKED BY OBJECT," and the rest of the roster) must match
the ROM text-string dump bz1-2 produces — inventory and wire them from that
source, don't paraphrase. Second, run the live playtest capstone end-to-end:
attract → play through the full enemy roster past the missile score
threshold → game over → high score, verified on BOTH the dev server (:5276)
and the live tunnel (arcade.slabgorb.com/battlezone/). Feel calibration
against MAME/footage is authority level 3 — feel only, and it never overrides
a quarry-sourced constant; any tuning actually applied must be logged as a
design deviation. Per the sibling capstone convention (epic 14's 14-6/14-7
pattern — the capstone absorbs verification, new defects become new
stories), bugs discovered during this playtest are filed as follow-up
stories, not fixed inline; the story cannot close with unfiled known
defects.

## Technical Approach
- HUD/framing render pass: cracked-glass viewport overlay, gunsight reticle,
  and vector-font score/high-score/lives text, plus final placement of the
  bz1-6 radar scope, laid out per the bz1-2 findings/quarry's display
  references — this replaces the default single-color glow placeholder
  earlier stories used.
- Bichromatic pass: apply the green-tinted horizon overlay band and red
  score/HUD text called out in the epic's rendering guardrail, on top of the
  green wireframe world used everywhere else — a render-only change, no core
  logic touched.
- Message-string wiring: pull the exact ROM text strings from bz1-2's
  text-string dump into a typed core module (e.g. `core/text.ts`) cited to
  that source, and render them at the trigger conditions earlier stories
  already implemented — this story only supplies correct strings/placement,
  not new trigger logic.
- Live playtest checklist: a documented run-through (recorded in the session
  file) — attract mode entry, slow tank engagement, missile appearance past
  the score threshold, super tank, saucer bonus, game over, and high-score
  persistence (localStorage) — executed once on the dev server (:5276) and
  once through the live tunnel (arcade.slabgorb.com/battlezone/).
- Deviation logging: any feel-based tuning adjusted during playtest (pacing,
  blip timing, reaction windows, etc.) is logged as a Design Deviation entry
  citing MAME/footage as the source; it must not contradict a bz1-2-sourced
  ROM constant — if it would, the constant wins and the deviation is
  rejected instead of applied.
- Defect triage: every bug surfaced during the playtest gets filed as a new
  sprint story (not patched inside this one), with the new story ID
  cross-referenced from this story's delivery findings/session file — so
  "zero unfiled known defects" is auditable rather than asserted.
- Comparison documentation: capture and record (screenshot or written
  comparison in the session file) how the cracked-glass overlay, reticle,
  and HUD placement compare against the bz1-2 quarry's references/footage.

## Scope
- In scope: final HUD/framing chrome (cracked glass, reticle, vector-font
  score/lives/high-score, radar scope placement); the bichromatic color pass
  (green world + green overlay band + red text); message-string wiring from
  bz1-2's text dump; the full attract → game-over → high-score playtest on
  both :5276 and the live tunnel; deviation-log entries for any feel-tuning;
  filing new stories for any defects the playtest surfaces.
- Out of scope: fixing any gameplay bug discovered during the playtest —
  file it as a follow-up story instead; introducing new gameplay mechanics;
  re-deriving or overriding ROM constants bz1-2 already pinned (only
  feel-level tuning within the ROM ceiling, and only when logged as a
  deviation).

## Acceptance Criteria
- Cracked-glass viewport overlay, gunsight reticle, and HUD (vector-font
  score/high-score/lives, radar scope placement) render per the bz1-2
  findings/quarry's references/footage, with the comparison documented
  (what was compared, verdict) in the session file.
- In-game message strings ("ENEMY IN RANGE," "MOTION BLOCKED BY OBJECT," and
  the rest) match the ROM text-string dump from the bz1-2 findings/quarry,
  spot-checked string-for-string rather than paraphrased.
- Bichromatic framing is applied: green wireframe world/HUD with a
  green-tinted horizon overlay band and red score/HUD text, replacing the
  placeholder single-color glow earlier stories used.
- The full playtest checklist — attract → slow tank → missile (past the
  score threshold) → super tank → saucer → game over → high score recorded —
  is executed and its results recorded in the session file for BOTH the dev
  server (:5276) and the live tunnel (arcade.slabgorb.com/battlezone/).
- Every feel-based tuning applied during playtest is logged as a Design
  Deviation citing MAME/footage as its source, and none contradicts a
  bz1-2-sourced ROM constant.
- Zero unfiled known defects at story close: every bug found during the
  playtest is filed as a new sprint story (not fixed here) and
  cross-referenced from the delivery findings/session file.
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test` is
  green.

---
_Generated by `pf context create story bz1-12` from the sprint YAML._
_Enriched by Architect (Maude) via story-context subagent._
