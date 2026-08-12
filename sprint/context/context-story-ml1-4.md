# Story ml1-4 Context

## Title
Secondary source MAME milliped.cpp board facts as claims: master clock, EXACT refresh (resolve OQ-1 vs centipede 59.88593 Hz and record any /263-vs-/262 hedge verbatim), screen geometry, cabinet rotation, COLOR-RAM/palette wiring, picture-ROM part numbers 136013-106/107. MAME cited in prose only, never copied into the repo (GPL). Locate the milliped driver dir first (atari/).

## Metadata
- **Story ID:** ml1-4
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Millipede — ROM source study + scaffold + fidelity harness (phase 1): the ground-truth dossier every later ml* story cites

## Problem

This story resolves board-level questions (OQ-1, geometry, wiring, ROM part numbers) by citing MAME's Millipede driver implementation as a secondary source. The MAME Millipede implementation is *not* in a standalone `milliped.cpp` file; instead, **Millipede is defined inside the Centipede driver family** in `/Users/slabgorb/Projects/mame/src/mame/atari/`:

- `centiped.cpp` — machine config, memory maps (`milliped_map` :798), DIP tables, `milliped()` machine_config (:1884), `ROM_START(milliped)` (:2218)
- `centiped_v.cpp` — video/palette (`screen_update_milliped`, `milliped_paletteram_w`)
- `centiped.h` — state class declarations

The critical constraint: **MAME is GPL — cite in prose (file:line), never copy source into the repo.**

### Key Background: OQ-1 Hedge (Exact Refresh Rate)

OQ-1 asks whether Millipede shares Centipede's exact refresh rate of 59.88593 Hz or diverges. MAME's `centiped.cpp:25-26` addresses this with an explicit hedge preserved *verbatim*:

```
Video frequency: VSYNC = HSYNC/263 ?? = 59.88593 Hz (not sure, could be /262)
```

This hedge **MUST be recorded exactly** in the claims file — not resolved on faith to one divisor. There is also a tension: `m_screen->set_refresh_hz(60)` at line 1798 rounds to 60 Hz, while the comment states 59.88593 Hz. Both values must be recorded.

## Technical Approach

TEA/Dev will produce a **claims dossier section** (or claims/*.json entry, per the citation-audit test convention) containing six propositions, each citing MAME:

1. **Master Clock**: Extract and cite the CPU clock frequency from the machine config (`milliped()` machine_config at `centiped.cpp:1884`).
2. **Exact Refresh (OQ-1)**: Record the verbatim hedge from `centiped.cpp:25-26`; cite both the 59.88593 Hz comment AND the `set_refresh_hz(60)` call with line numbers.
3. **Screen Geometry**: Extract vertical/horizontal screen dimensions and cite the memory maps or screen configuration in `centiped.cpp`.
4. **Cabinet Rotation**: Check the machine config and video setup for rotation declarations (e.g., `ORIENTATION_ROTATE_90` or similar).
5. **COLOR-RAM/Palette Wiring**: Cite palette RAM initialization and color-bank configuration from `centiped_v.cpp` (video functions like `milliped_paletteram_w`).
6. **Picture-ROM Part Numbers**: Confirm and cite the picture EPROM part numbers `136013-106/107` from `ROM_START(milliped)` at `centiped.cpp:2226-2227`.

Each claim should reference the citation-audit test (if one exists in `tests/audit/` for Millipede) so it can be gated and mutation-tested.

## Scope

**In scope:**
- Locate the MAME Millipede driver in `atari/centiped.cpp` (and related files).
- Extract and cite (with file:line) all six board facts.
- Record OQ-1 hedge verbatim — do NOT smooth over the uncertainty.
- Verify picture-ROM part numbers against the ROM_START macro.
- Structure claims in a format compatible with the citation-audit test (match centipede/pac-man shape).
- Cite only in prose — no source copying (GPL constraint).

**Out of scope:**
- Graphics-ROM decode (ml2).
- Core simulation / Game-of-Life mechanics (ml3).
- Sound/audio (ml4).
- Phase machine / wiring / HUD (ml5).
- Hardening (ml6+).
- Resolving the /263 vs /262 hedge (record it; do not guess).

## Acceptance Criteria

TEA/Dev must ensure:

1. **Master Clock cited**: CPU clock frequency extracted and cited from `centiped.cpp` machine config (line number required).
2. **OQ-1 refresh verbatim**: The exact hedge text `"Video frequency: VSYNC = HSYNC/263 ?? = 59.88593 Hz (not sure, could be /262)"` appears in the claims file with citation `centiped.cpp:25-26`.
3. **Refresh tension recorded**: Both values noted: 59.88593 Hz (comment) and 60 Hz (set_refresh_hz call at :1798).
4. **Screen geometry cited**: Vertical and horizontal dimensions extracted and cited with line numbers from the machine config or screen setup.
5. **Cabinet rotation cited**: Rotation declaration (if present) extracted and cited from the machine config.
6. **COLOR-RAM/Palette wiring cited**: Palette initialization and color-bank logic extracted from `centiped_v.cpp` with line numbers (e.g., `milliped_paletteram_w` function).
7. **Picture-ROM part numbers confirmed**: Part numbers `136013-106` (at `p5`) and `136013-107` (at `r5`) cited from `ROM_START(milliped)` at `centiped.cpp:2226-2227`.
8. **Citation-audit gate passes**: All six claims pass the citation-audit test (if one exists; align with `plugins/centipede/docs/rom-study/` layout).
9. **No GPL source copied**: All citations are in prose (file:line); no MAME source code is committed to the arcade repo.
10. **Dossier section ready**: Claims formatted and ready for downstream ml1 stories to reference (e.g., ml3 can cite these facts when wiring the core).

---

_Generated by `pf context create story ml1-4` from the sprint YAML._
