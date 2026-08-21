# ADR-0005: Photosensitivity accessibility — the one standing exception to ROM-always-wins

**Status:** Accepted — **Amended 2026-08-21** (see [the amendment](#amendment--2026-08-21-the-owner-is-not-photosensitive) at the end: the medical premise was wrong, and the chrome built on it was removed in df8-2)
**Date:** 2026-08-16
**Author:** Architect
**Story:** df4 (decided at the menagerie epic's kickoff, per the roadmap ruling; binds df4/df5/df7)

## Context

Every game in this cabinet is built to a single overriding fidelity rule — **ROM-always-wins**:
when the vendored original source and any secondary reference disagree, the source is ported
line-for-line and cited; nothing "improves" the original. That rule is the spine of the whole
`df*` program: `df1`'s citation gate exists to enforce it, and `df3`'s design spec calls it
"RULED, not a choice."

Defender breaks a specific class of that rule against the owner's body. Three of the ROM's
effects are **full-screen white/inverse strobes**, single-frame or multi-frame inversions of
the entire palette:

- **Player death / terrain explosion** — the death effect blows up the screen (the `TERBLO`
  "BLOW UP TERRAIN" process, `defender/DEFB6.SRC:434,437`; the `SAMEXAP7` explosion path,
  `defender/SAMEXAP7.SRC:17` `EXST`).
- **Smart bomb** — `SBOMB` inverts colour RAM across the whole frame (`COM PCRAM`,
  `defender/DEFA7.SRC:3199`). *(consumed in df5)*
- **Hyperspace** — `HYPER` flashes on re-entry (`defender/DEFA7.SRC:3211`). *(consumed in df5)*

**The owner has photosensitive epilepsy.** A faithful full-screen strobe is not a fidelity
nicety here; it is a seizure trigger the owner cannot safely playtest, let alone ship. The
roadmap recorded this as a standing note at `df1` and ruled that the decision is made **here,
at `df4`, not retrofitted** later under time pressure — because `df4` is the first epic that
draws an explosion at all, and `df5`/`df7` will each reach for the same effect.

This is the single point where "ROM-always-wins" is knowingly overridden. It needs one
authoritative home so that each later epic cites the rule instead of re-litigating it.

## Decision

**Full-screen strobe/inversion effects are replaced by seizure-safe equivalents — freeze,
fade, or localized particle — cabinet-wide. This is the one deliberate, permanent exception
to ROM-always-wins.** The exception is *scoped to the strobe*, not to the event: the death,
the smart bomb and the hyperspace re-entry all still happen, still at the ROM's timing, still
cited — only the *rendering* of the flash changes.

Concretely:

1. **The effect boundary is a `df4` core seam.** The materialize/explode work (`df4-2`) writes
   one pure effect policy in `plugins/defender/src/core/` that classifies an effect as
   *localized* (rastered normally) or *full-frame-strobe* (rendered as the safe variant). The
   ROM's *trigger* and *duration* are ported and cited as usual; the strobe *presentation* is
   the substitution.
2. **Safe variants:** a full-frame strobe becomes a brief **freeze + fade** of the existing
   frame (death) or a **non-strobing wash/particle** bounded in area and contrast (smart bomb,
   hyperspace). No effect inverts or white-fills the whole framebuffer for any frame.
3. **The citation gate still applies to everything else.** The substitution is logged as a
   **Design Deviation** in each consuming story's session file (the 6-field format), citing
   this ADR as the spec source. The effect's timing/trigger constants remain gated by
   `citations.test.ts`; only the pixel presentation is exempt, and that exemption is named.
4. **A guard pins the absence of the strobe.** `df4` adds a render-side assertion that no
   effect path writes a whole-framebuffer inversion/white-fill in a single frame (the
   mechanical form is the story's to design), so a later refactor cannot silently reintroduce
   the ROM behaviour.

## Consequences

- **df4** owns the effect policy module and this ADR's guard; `df4-2` is where death/explosion
  first render the safe variant.
- **df5** (smart bomb, hyperspace) consumes the same policy — no new decision, cite this ADR.
- **df7** (attract, phase machine, HUD, visual playtest) asserts "no full-screen strobe
  anywhere" against this ADR.
- **The deviation is auditable, not hidden.** Because it is logged per story and pinned by a
  guard, the boss can see exactly where and why the ROM was overridden — which is the whole
  point of doing it once, in writing, instead of ad hoc in each epic.
- **Fidelity elsewhere is undiminished.** This ADR narrows the exception to a single visual
  class defined by a medical constraint; it grants no general licence to "improve" the ROM.

## Amendment — 2026-08-21: the owner is not photosensitive

The medical premise above was wrong. **The owner has epilepsy but is NOT photosensitive** —
flashing/strobing is not a personal seizure trigger (owner correction, 2026-08-21). The
statement "the owner has photosensitive epilepsy" in the Context, and everything reasoned
from it, is preserved above as history but no longer holds.

Consequences of the correction:

- **The anti-strobe chrome built on this premise was removed in df8-2**: defender's
  full-field screen wash (the pt1-25 dim stride-3 lattice substituted for the ROM's
  death/smart-bomb/hyperspace strobes) and the spawn/death spark ring (the df4-6 diamond
  outline drawn around materialize/explode). Neither was in the ROM; both existed only as
  ADR-0005 substitutes. The sim-side wiring (tagged screen effects, `classify()`'s
  presentation taxonomy) remains, but a SCREEN event now paints nothing full-field and a
  localized effect rasters its sprite only.
- **Going forward, ROM fidelity is not gated on owner photosensitivity.** This ADR's
  "one standing exception to ROM-always-wins" no longer applies on medical grounds.
  (df8-2 itself did not port the ROM's white/inverse strobes — it only removed the
  invented substitutes; whether to port the strobes is a separate fidelity decision.)
