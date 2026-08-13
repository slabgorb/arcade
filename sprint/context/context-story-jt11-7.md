# Story jt11-7 Context

## Title
CLFDES cliff-crumble animation (deferred polish from jt11-5): the ROM crumble CLFDES (JOUSTRV4.SRC:4562-4599) is wholly absent - dissolve.ts is a false friend (it is the ptero/baiter death ASH animation, dissolve.ts:3-13; grep CLFDES hits only the arena-state.ts:62-63 comment 'both jt3-later'). After jt11-5 makes destroyed cliffs vanish from physics and render, this story adds the visible crumble transition between intact and gone. Requires jt11-5.

## Metadata
- **Story ID:** jt11-7
- **Type:** story
- **Points:** 3
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Joust — cabinet experience: start flow, HUD, landing physics, transporter cadence, lava shore, high-score UX

## Problem
The ROM crumble routine **CLFDES** (`JOUSTRV4.SRC:4562-4599`) — the animation a
destructible cliff plays when a wave destroys it — is wholly absent from the port.
`dissolve.ts` is a **false friend**: it is the ptero/baiter DEATH ash animation
(PTEKLL → three ASH frames), a separate ROM routine that shares only the CLIFER
blitter. jt11-5 made a destroyed cliff vanish from physics and render (drawList
filters `BACKGROUND_RECORDS` by `arena.destroyedCliffs`), so today a destroyed
cliff blinks out on the advance frame. This story inserts the visible CLFDES
crumble in that gap — the cliff SHAKES then throws DEBRIS before it disappears.

## CLFDES, read off the ROM (JOUSTRV4.SRC:4562-4599)
A two-phase nap-driven sequence, `INPUT PFRAME-2,U = CLIFF TO DESTROY`, ending
`JMP VSUCIDE`:
- **SHAKE** — `LDA #5` five shakes (:4563-4564). Each shake: BCKYUP, `PCNAP 10`
  (:4567), BCKYUP, `LDA #$2A / STA WCDMA,X` tint (:4570-4571), `PCNAP 10` (:4572)
  → two PCNAP 10 = **20 naps/shake** (the pair folded into one hold, dissolve-style).
- **ERASE** — `JSR LOCCLR / PCNAP 2` (:4575-4576): the cliff image is cleared,
  replaced with debris. The 2-nap blip folds into the shake→debris transition.
- **DEBRIS** — `LDA #5` five debris frames (:4578-4580, the FIRSTI image area).
  Each frame: `BSR CLIFER` draw, `PCNAP 8` (:4594) → **8 naps/frame**. Final
  `LOCCLR` (:4598), then `JMP VSUCIDE` (:4599) — the cliff is gone (jt11-5 end-state).
- Total held: 5×20 + 5×8 = **140 naps**.

## Technical Approach
Mirror the **dissolve precedent** (`dissolve.ts` = pure-core state machine;
`drawList`/`paintDissolve` render it):
1. **New pure-core module `src/core/crumble.ts`** — a nap-driven CLFDES state
   machine (`startCrumble`/`stepCrumble`, `CRUMBLE_SHAKE_COUNT=5`,
   `CRUMBLE_SHAKE_NAPS=20`, `CRUMBLE_DEBRIS_FRAME_COUNT=5`,
   `CRUMBLE_DEBRIS_FRAME_NAPS=8`, `CRUMBLE_FLAVOR=0x2A`). NOT the dissolve — its
   own module, importing no `DissolveState`. The jt1-7 purity scanner sweeps it.
2. **Wire it through `drawList`** as an ADDITIVE overlay of a new op kind
   `kind:'crumble'` (carrying `cliff`/`phase`/`frame`). It does NOT re-add the
   cliff's `kind:'arena'` records — WCLFEW clears those at once (jt11-5's
   `destroyedCliffs` filter stays intact); CLFDES animates over the vacated space.
   The sim spawns a crumble when a cliff newly enters `destroyedCliffs` and steps
   it each frame; once `done`, the overlay stops.
3. **Commit `docs/rom-study/claims/crumble.json`** with JT117-* claims covering
   the CLFDES laws (the citation gate).

## Scope
- **In scope:** the CLFDES state machine, its source/claims provenance, and the
  visible drawList overlay (shake → debris → gone).
- **Out of scope (documented deviations):** pixel-accurate debris art (decoding
  the five FIRSTI images through CLIFER) — the story pins the crumble TIMELINE
  and PRESENCE, not the debris pixels; the exact sim carrier for crumble state
  and the precise render geometry are Dev's design within the drawList contract.

## Acceptance Criteria
- **AC-1 — CLFDES timeline (core).** `crumble.ts` pins the ROM counts/naps as
  exported constants: 5 shakes @ 20 naps, 5 debris frames @ 8 naps, tint `$2A`.
- **AC-2 — phase walk (core).** `startCrumble` opens on shake frame 0 (not done);
  `stepCrumble` holds each frame its nap window, walks 5 shakes then 5 debris
  frames in order, then sets `done` (idempotent); total = 140 naps.
- **AC-3 — purity + determinism (core).** No shell/clock/entropy import;
  `stepCrumble` never mutates its argument; a full run replays bit-for-bit; the
  cliff label rides through unchanged.
- **AC-4 — the visible transition (wiring).** A newly-destroyed cliff surfaces a
  `kind:'crumble'` overlay through `drawList` (shake, then debris) instead of an
  empty space, for the CLFDES duration, then settles to gone — WITHOUT re-adding
  the cliff's arena records (jt11-5 stays green). CLIF5 (indestructible) never
  crumbles.
- **AC-5 — not the false friend + cited.** crumble is a NEW module distinct from
  `dissolve.ts` (no `DissolveState` import, CLFDES counts not the dissolve's);
  the CLFDES range is independently re-derived from the vendored source and each
  law pinned by a committed JT117-* claim in `crumble.json`.

_ACs authored by TEA (O'Brien) during the RED phase from the CLFDES ground truth._

---
_Generated by `pf context create story jt11-7` from the sprint YAML._
