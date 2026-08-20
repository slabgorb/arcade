# ADR-0007: Defender live render pipeline — per-frame palette and the effect-presentation wiring

**Status:** Accepted
**Date:** 2026-08-20
**Author:** Architect (Mimir)
**Story:** pt1 playtest sweep — the 2026-08-20 Defender gameplay audit (`plugins/defender/docs/2026-08-20-defender-gameplay-render-audit.md`) found the shell render pipeline still built to df2's *static-frame* assumptions. This ADR rules the architecture the fix stories (pt1-22, pt1-25) build on. df4/df5/df7 shipped the effect and colour data; nothing wired it to a moving screen.

## Context

Defender's render pipeline was authored in **df2** to paint **one static gallery frame**:
the palette is decoded once, the effect-presentation policy is a pure classifier with no
call site, and `composeFrame` draws only the entities df3 happened to add. When the live
sim (df3–df7) landed, the *simulation* was wired frame-by-frame but the *shell* was never
upgraded past that static assumption. The 2026-08-20 audit found two systemic consequences,
each generating a family of player-visible defects:

### R1 — the palette is frozen at boot defaults

`plugins/defender/src/shell/render.ts:41` resolves the colour RAM **once at module load**:

```ts
const CRAM = resolveCram(DEFAULT_PCRAM)   // computed once; read every frame by indexToRgba
```

The comment admits its origin — *"df2 renders a static frame, so it is resolved once here."*
Williams Defender does not have a static palette: the frame IRQ copies a 16-byte RAM shadow
(`PCRAM`) into hardware colour RAM every frame (`DEFA7.SRC:1968-1980`), and the game **mutates
that shadow at runtime** to animate colour registers. Three whole classes of effect ride on
this and are therefore invisible in our clone:

- **The laser** is drawn in palette index 1 (`scene.ts:114` `LASER_COLOUR = 1`), whose boot
  byte is `0x00` — identical to index 0 (SPACE/background). The ROM colour-cycles register 1
  to make the laser a shimmering streak; we seed `0x00` and never touch it, so the laser is
  **drawn correctly every frame in pure black on black**.
- **Indices A–F (10–15)** are all seeded `0x00` and are documented in `core/palette.ts` as
  *"recoloured at runtime by the bomb/monochrome cyclers and the TIE appearances."* The bomb
  sprite (`BMBP1`) is 100% index-10; TIE (`TIEP1`) and pod (`PRBP1`) are mostly A–F. All three
  render **black** even once drawn.
- **The mutant shimmer** (`SCZP1` cycles its registers) is absent.

Nothing in `core/` ever writes a colour register — there is no PCRAM shadow in sim state and
no cycler. So even the existing `resolveCram` copy has nothing to copy from.

### R2 — the ADR-0005 effect-presentation policy is dead code

ADR-0005 mandated that Defender's three full-screen strobes (player-death/terrain-explosion,
smart-bomb, hyperspace) be replaced by seizure-safe variants, and that the substitution live
in a **pure effect-policy module** in `core/`. That module exists — `core/effects.ts`
`classify()` with its `fade`/`freeze`/`particle` presentations and the `assertNoFullFrameStrobe`
guard. **It has zero call sites outside comments.** Consequently:

- **Player death** draws no explosion or blink — `killPlayer` (`sim.ts:478`) only plays a
  sound and decrements the men count; its own comment calls it *"a df6-1 placeholder."*
- **Smart bomb** clears the field and each enemy explodes, but there is **no screen-level
  flash/wash** — the safe variant of `SBOMB`'s `COM PCRAM` (`DEFA7.SRC:3199`) never renders.
- **Hyperspace** teleports instantly with no vanish/reappear.

The ADR-0005 policy was built to spec and left unwired. Reviving it is **compliance with an
existing decision**, not a new one — but it shares R1's root (a render pipeline frozen at the
static-frame stage), so it is ruled here alongside the palette.

## Decision

**Upgrade the Defender render pipeline from a static-frame decode to a live, per-frame one.
Two coordinated changes, both keeping the core/shell purity boundary and ADR-0005 intact.**

### 1. A live palette carried on `SimState`, decoded per frame

- The 16-byte `PCRAM` shadow becomes **live sim state** (`core/palette.ts` owns the model;
  `SimState` exposes it as a read-only `readonly pcram: readonly number[]`). It is pure data —
  4-bit-packed BBGGGRRR bytes, never RGBA — so the purity gate is undisturbed.
- **Colour cyclers are pure core steps** that mutate the shadow each tick: the laser register
  (index 1), the A–F bomb/monochrome/TIE cyclers, and the mutant shimmer. Each cycler's timing
  and colour table is ported from the ROM and enrolled in the citation gate like any other
  constant — `CRTAB`/`TCTAB` and the cycle tables are real source data.
- **The shell decodes through the live shadow every frame.** `render.ts` stops caching `CRAM`
  at module load; `indexToRgba` reads the `pcram` the sim hands it that frame (resolved via the
  existing `resolveCram` → `@shared/palette-decoder` path — unchanged decoder, live input).

### 2. Wire the ADR-0005 effect-presentation policy into the live path

- `killPlayer`, the hyperspace branch, and the smart-bomb fire each **spawn an effect through
  the existing `effects.ts` bank** (as enemy explosions already do), and `classify()` selects
  the seizure-safe presentation. `scene.ts` surfaces and blits these effects.
- **The one full-screen palette effect — the smart-bomb `COM PCRAM` whole-page invert — is
  rendered as its ADR-0005 safe variant (a bounded, non-strobing wash), NOT as a real palette
  inversion.** This is the single point where the live palette meets ADR-0005, and ADR-0005
  wins: the shadow is not inverted frame-to-frame.

### ADR-0005 boundary for the cyclers (binding)

The laser and A–F/mutant cyclers are **localized** (a few pixels; one sprite) — they are *not*
full-screen strobes and are permitted. But they are still luminance flicker, so they inherit
the cabinet photosensitivity rule (ADR-0005; `pacman` epilepsy note): **no cycler may drive a
>3 Hz luminance strobe over a large screen area.** The laser/mutant cases are small-area and
safe; the constraint is named so a future "faithful" full-frame cycler cannot be added without
re-reading this. `assertNoFullFrameStrobe` continues to pin the whole-framebuffer case.

## Consequences

- **`SimState` gains a `pcram` field** and the sim gains pure cycler steps; `render.ts` loses
  its module-load `CRAM` cache. The core/shell contract is unchanged in shape — core still
  hands the shell indices *and now the palette that colours them*; the shell still invents no
  colour.
- **pt1-22** (live palette + cyclers) is the **prerequisite** for the black-sprite half of
  pt1-23 (bombs/TIEs/pods) and for pt1-25's smart-bomb wash. It lands first, like a timebase
  rebase — every later colour fix re-bakes onto it.
- **pt1-25** (player/effect visuals) is ADR-0005 compliance; each consuming story logs the
  strobe substitution as a Design Deviation citing ADR-0005, exactly as that ADR requires.
- **Fidelity is increased, not overridden.** R1's fix makes the clone match the ROM's live
  palette for the first time; the only deliberate divergence remains the ADR-0005 strobe
  substitution, now actually rendered instead of silently absent.
- **The static path is retained** where it is correct: `composeStaticFrame` (the title/attract
  gallery) may still resolve once — only the live in-game decode moves per-frame.
