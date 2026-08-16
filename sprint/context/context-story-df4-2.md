# Story df4-2 Context

## Title
Materialize/explode effects + the ADR-0005 accessibility policy (the ONE exception to ROM-always-wins, decided HERE): plugins/defender/src/core/effects.ts — the SAMEXAP7 APST 'APPEAR START' / EXST 'EXPLOSION START' lifecycle (defender/SAMEXAP7.SRC:16-17) animating the df2-4 INERT image tables; PLUS the effect-policy classifier that renders full-frame strobes (player death/terrain explosion TERBLO defender/DEFB6.SRC:434,437) as freeze/fade/particle, and a render-side guard that no effect writes a whole-framebuffer inversion in a single frame. ROM trigger+timing ported and cited; only the strobe PRESENTATION is substituted, logged as a Design Deviation citing docs/adr/0005-photosensitivity-accessibility-exception.md.

## Metadata
- **Story ID:** df4-2
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender — the menagerie (phase 4b): one cited reducer per enemy, the shared collision seam, and the first effects that kill — with the photosensitivity accessibility exception decided here

## Problem
The accessibility exception is DECIDED and BUILT here, not retrofitted (roadmap ruling; ADR-0005 authored 2026-08-16 at this epic kickoff). df4-2 is the first story that renders a death, so the no-full-frame-strobe guard MUST land with it, before any enemy explosion draws. df5 (smart-bomb SBOMB defender/DEFA7.SRC:3199, hyperspace HYPER defender/DEFA7.SRC:3211) CONSUMES this policy — it does not re-decide. Consumes df4-1 (collision produces the death), df2-4 (the SAMEXAP7 INERT tables), df2 framebuffer (composite by index).

**Medical constraint:** the owner has photosensitive epilepsy. Three ROM effects are full-screen white/inverse strobes — the death/terrain explosion (here), and df5's smart-bomb and hyperspace. A faithful strobe is a seizure trigger the owner cannot safely playtest, let alone ship. This is the single, permanent, deliberate exception to ROM-always-wins (ADR-0005).

## Technical Approach
Two pieces in `plugins/defender/src/core/effects.ts`, both pure:

1. **The SAMEXAP7 appear/explode lifecycle.** Model the `APST` "APPEAR START" (`defender/SAMEXAP7.SRC:16`) and `EXST` "EXPLOSION START" (`defender/SAMEXAP7.SRC:17`) lifecycle as a reducer stepping over the **df2-4 INERT image tables** — no re-transcription of the pictures; those are already byte-verified under the gate. Each effect timing/duration constant gets a `claims/*.json` entry.

2. **The ADR-0005 effect policy + guard.** A pure classifier tags each effect:
   - **LOCALIZED** → rastered normally (the appear animation, a localized enemy pop).
   - **FULL-FRAME-STROBE** → rendered as a **safe variant**: brief freeze + fade of the existing frame (death), or a non-strobing wash/particle bounded in area and contrast.
   - The player-death / terrain explosion (`TERBLO` "BLOW UP TERRAIN", `defender/DEFB6.SRC:434,437`; `SAMEXAP7` `EXST` path) is classified FULL-FRAME-STROBE and renders the safe variant.
   - The ROM's **trigger and timing** are ported and cited exactly as usual (covered by `citations.test.ts`); **only the strobe presentation** is substituted. The substitution is logged as a **6-field Design Deviation** in the session file citing `docs/adr/0005-photosensitivity-accessibility-exception.md` as the spec source.

3. **Render-side guard.** A render-side assertion that **no effect path writes a whole-framebuffer inversion/white-fill in a single frame**, mutation-proven: a planted full-frame inversion must redden it. This guard is the mechanism ADR-0005 requires so a later refactor cannot silently reintroduce the ROM strobe. (Mechanical form is the story's to design — e.g. asserting no single frame flips more than a bounded fraction of the 292×240 surface.)

Consumes: df4-1 (collision produces the death that triggers `EXST`), df2-4 (SAMEXAP7 INERT tables), df2 `framebuffer.ts`/`render.ts` (composite by index only, never hex).

## Scope
- **In scope:** `effects.ts` appear/explode lifecycle over the INERT tables; the LOCALIZED-vs-FULL-FRAME-STROBE classifier; the safe-variant rendering of death/terrain explosion; the 6-field Design Deviation log citing ADR-0005; the mutation-proven no-full-frame-strobe render guard; `claims/*.json` for every effect constant; `citations.test.ts` covering the timing constants; purity stays green.
- **Out of scope:** smart-bomb and hyperspace effects (df5 — they CONSUME this policy, cite ADR-0005, do not re-decide); enemy reducers (df4-3/4/5); scoring; the attract-mode / phase-machine assertion of "no strobe anywhere" (df7).

## Acceptance Criteria
- AC1: plugins/defender/src/core/effects.ts exists (PURE) modelling the SAMEXAP7 appear (APST, defender/SAMEXAP7.SRC:16) and explode (EXST, defender/SAMEXAP7.SRC:17) lifecycle over the df2-4 INERT image tables — no re-transcription of the pictures; each effect constant gated by a claims/*.json entry.
- AC2: an effect-policy classifier distinguishes LOCALIZED effects (rastered normally) from FULL-FRAME-STROBE effects (rendered as freeze/fade/particle) per ADR-0005; the player-death/terrain explosion (TERBLO, defender/DEFB6.SRC:434,437) renders as the SAFE variant, and the substitution is logged as a 6-field Design Deviation in the session file citing docs/adr/0005-photosensitivity-accessibility-exception.md.
- AC3: a render-side guard asserts NO effect path writes a whole-framebuffer inversion/white-fill in a single frame, mutation-proven (a planted full-frame inversion reddens it); the guard is the mechanism ADR-0005 requires so a later refactor cannot silently reintroduce the ROM strobe.
- AC4: the ROM trigger and timing of each effect are ported and cited (only the strobe presentation is exempt, and the exemption is NAMED); citations.test.ts covers the timing constants.

## Dependencies
- **df4-1** — collision produces the death that triggers the explosion.
- **df2-4** — the SAMEXAP7 / DEFB6 INERT image tables (already byte-verified).
- **df2** — framebuffer + render seam (composite by index).
- **Blocks:** df4-3/4/5 (enemies draw their death through this policy); df5 (smart-bomb/hyperspace cite ADR-0005); df7 (asserts no strobe anywhere).

## Design Notes
- **Decision B (RULED):** design spec §3 + ADR-0005 (`docs/adr/0005-photosensitivity-accessibility-exception.md`). The exception is scoped to the **strobe**, not the event — the death still happens, at the ROM's timing, still cited; only the flash's rendering changes.
- **Not retrofitted:** the guard lands with THIS story, before any enemy explosion draws.

---
_Generated by `pf context create story df4-2` from the sprint YAML._
