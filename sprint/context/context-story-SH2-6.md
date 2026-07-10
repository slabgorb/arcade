# Story SH2-6: battlezone font migration

**Status:** setup complete  
**Workflow:** tdd (RED → GREEN → review → finish)  
**First Phase:** red (agent: tea)

## Story Summary

Migrate battlezone's HUD/framing text rendering from the non-commercial Vector Battle TTF to @arcade/shared/font's ROM stroke-vector glyphs. Evolves done story bz2-2 (which adopted the TTF) to the cabinet-wide stroke-vector convergence decided in ADR-0002.

**Points:** 3  
**Priority:** p2  
**Repository:** battlezone (gitflow)  
**Branch:** feat/SH2-6-battlezone-font-migration

## Acceptance Criteria

1. **battlezone renders all HUD/framing text via @arcade/shared/font layoutText + a canvas stroke; loadVectorFont and every ctx.fillText/ctx.font text path are removed.**

2. **The lives counter's up-triangle icon (U+25B2), currently drawn by drawLives via ctx.fillText at src/shell/render.ts ~218, is rendered as a bespoke vector shape (a stroked triangle), NOT via @arcade/shared/font layoutText — the shared font intentionally omits it (SH2-3 audit: icon, not typography). The lives row must not render a blank/placeholder after the TTF is removed.**

3. **public/fonts/*.ttf and the TTF loader in src/shell/font.ts are deleted; no remaining reference to 'Vector Battle' or FontFace.**

4. **vitest + vite build green; a manual run confirms the green-vector HUD reads correctly.**

## Key Dependencies & Precedents

### Required reading (prior archives)
- **SH2-5 session** (sprint/archive/SH2-5-session.md) — star-wars migration, the immediate precedent. Contains the [HIGH] WAVE-gap defect (below) and the full glowText → layoutText mapping.
- **SH2-4 session** (sprint/archive/SH2-4-session.md) — asteroids migration, first per-game precedent + test-surgery playbook.
- **SH2-3 session** (sprint/archive/SH2-3-session.md) — glyph audit; the source of the ▲-is-an-icon ruling.

### Dependency pin (Dev's GREEN step — TEA cannot re-pin)
battlezone currently pins `@arcade/shared@github:slabgorb/arcade-shared#v0.5.0`, whose exports map has **NO `/font` subpath** — nothing font-related resolves until the pin moves. Tag **v0.7.0** is the first tag carrying the `/font` subpath with the full SH2-3 glyph set (incl. `_ , /`); star-wars (SH2-5) and asteroids (SH2-4) already pin v0.7.0. Dev GREEN must re-pin `#v0.5.0` → `#v0.7.0` directly (no provisional-commit debt). If the npm lock goes stale, force with `npm install "@arcade/shared@github:slabgorb/arcade-shared#v0.7.0"`.

### Structure precedent (tempest + asteroids + star-wars — three identical seams)
Local `src/shell/font.ts` becomes `export * from '@arcade/shared/font'` (deleting the FontFace/TTF loader); render.ts imports layoutText/CELL_H from `./font` (the local seam), never the package directly. Tests observe text at the layoutText seam via `vi.mock('../../src/shell/font')`, not via fillText.

### The ▲ lives icon (AC-2, SH2-3 blocking finding)
`drawLives` at `battlezone/src/shell/render.ts:218` draws `ctx.fillText('▲'.repeat(lives), size, size)`. U+25B2 is NOT in the shared font (SH2-3 deliberately omits it as an icon). It MUST become a bespoke stroked triangle vector, NOT a layoutText call, or the lives row renders blank once the TTF is gone.

### Migration sites already located in battlezone (for TEA/Dev, verified this session)
- `src/shell/font.ts` — TTF FontFace loader (UI_FONT_FAMILY='Vector Battle', FONT_URL VectorBattle-e9XO.ttf, loadVectorFont). Delete loader; re-export shared.
- `src/main.ts:40` imports loadVectorFont; `src/main.ts:77` calls `void loadVectorFont()`; comments at ~73-76 name 'Vector Battle'. Remove the font boot + comment refs.
- `src/shell/render.ts` fillText call sites: **113** (score), **196** (multiline framing), **218** (▲ lives — bespoke triangle, see above), **305** (centered text), **370** ('DUAL-TREAD   ESC PAUSE'). Comments at render.ts ~15-17 name 'Vector Battle'.
- `public/fonts/` — VectorBattle-e9XO.ttf + Readme.txt (delete).

### RE-MEASURE every TTF-tuned pixel gap (SH2-5 [HIGH] lesson — do NOT inherit constants)
Stroke caps fill the FULL nominal size, whereas the retired TTF's caps were ~0.7 of nominal, and the ROM stroke face has a fixed layout advance of **24 cells/glyph** (not the 16-unit ink width). SH2-5 shipped a [HIGH] defect because `waveLabelGap` was a TTF-tuned fixed constant (56) that put the wave numeral INSIDE its label; the fix derived the gap from `layoutText('WAVE').width × (px/CELL_H) + pad`. battlezone must re-measure EVERY pixel gap/offset in render.ts against `layoutText(...).width` rather than trusting inherited numbers. The SH2-5 Reviewer explicitly flagged battlezone's render.ts for this eyeball/re-measure pass.

### Tracking / letterSpacing
glowText-style 0.1em tracking is reproduced by a constant cell-space `letterSpacing = 0.1 × CELL_H` on every layoutText run once glyph geometry scales by px/CELL_H (SH2-4/SH2-5 confirmed).

### AC scans are comment-inclusive
The 'Vector Battle' / FontFace / loadVectorFont source scans read raw file text — comments count. Every comment naming the retired face must be reworded too (render.ts ~15-17, main.ts ~73-76, font.ts header).

### Test surgery expectation
Existing battlezone render/HUD suites that observe text via ctx.fillText or count strokes will need TEA surgery (SH2-4 precedent: retire the TTF-loader test, repoint text-observation suites to the layoutText seam; isolate HUD strokes via delta/symmetric-diff). TEA to enumerate which battlezone suites are affected.

### Branch note
The feat branch was created with `git checkout -b feat/SH2-6-battlezone-font-migration origin/develop`, so it currently tracks origin/develop. Dev/Reviewer must push with an explicit `git push -u origin feat/SH2-6-battlezone-font-migration` (not a bare `git push`, which would target develop and be hook-blocked).

## Test Strategy

The tdd workflow expects:
- **RED phase (tea):** Create/enumerate failing tests covering all ACs; establish the test→code seams for DEV.
- **GREEN phase (dev):** Implement layoutText call sites, the bespoke lives triangle, delete TTF/loader, re-pin @arcade/shared@v0.7.0, achieve green tests.
- **REVIEW:** Confirm HUD visual fidelity and pixel-gap re-measurements against the precedent defects (SH2-5 [HIGH] wave-label gap, etc.).

## Related Stories & Context

- **Epic:** SH2 (Shared render surface extraction — ADR-0002/0003)
- **SH2-4** (asteroids migration, first precedent)
- **SH2-5** (star-wars migration, immediate precedent with [HIGH] defect lesson)
- **SH2-3** (glyph audit — the ▲-icon-not-glyph finding)
- **SH2-8** (shared glow primitive — lands later, not a blocker)
- **Previous battlezone work:** bz2-2 (adopted the TTF; SH2-6 evolves it to stroke-vectors)
