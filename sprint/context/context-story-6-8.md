# Story 6-8 Context

## Title
Authentic enemy + bolt shapes (render fidelity)

## Metadata
- **Story ID:** 6-8
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** tempest
- **Epic:** Wave 6 — Playtest feel & balance

## Problem
Our enemy shapes are go/nogo simplifications; replace with authentic vector glyphs from the rev-3 ROM (enemy-recon). SHELL/RENDER fidelity - no core change. FLIPPER draw_flipper 13035 (RED), point-vector graphic 0 at 14348-14366 = 8-segment closed bowtie/butterfly (2 outer V-wings + central crossing); flip/rotate at runtime. TANKER draw_tanker 13065, body L39b4 4874 = elongated X-diamond (color idx 2) with cargo emblem variants (4628/4711/4798) showing split type. SPIKER draw_spiker 13083, vg_sub_image_spiker_1..4 4261-4554 = outward spiral/pinwheel, 4 spin frames on timectr&3; the SPIKE is a dynamic line Lc6c7 15827 with length proportional to spike_ht and a single white tip dot (one zero-length white point, no flicker). FUSEBALL draw_fuzzball 13180, vg_sub_image_fuzzball_1..4 5592-5881 = chaotic multi-color (red/yellow/cyan) ball-of-legs, legs fully redrawn each frame (writhe/flicker), 4 frames; rides/interpolates between lane endpoints on the rim. PULSAR draw_pulsar 13257, two pulse animations off 'pulsing': color strobes cyan<->white, jaggedness (pulsing+0x40)>>4 selects graphics 0x0d..0x09 = zig-zag bar _pv_offset_9..13 14465-14509 (variant1 sharpest +/-6 -> variant5 flat line). ENEMY BOLT vg_sub_image_enemy_shot_1..4 5012-5245 = white pinwheel + red central cross, 4 frames. PLAYER CLAW rotatable point-vectors graphics 1-8 _pv_t3 14368, draw_player 12954, YELLOW. PLAYER BULLET vg_sub_image_player_shot 3609 = two concentric dotted octagon rings. Reproduce as canvas vector paths matching the glow aesthetic; preserve animation frames (spin/pulse/writhe). May split per-enemy. Full notes in design ref (Enemy roster).

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
- Each enemy + bolt renders as an authentic vector glyph WITH its animation frames: Flipper bowtie/butterfly (RED), Tanker X-diamond + cargo emblem, Spiker spinning pinwheel + dynamic spike, Fuseball writhing multi-color ball-of-legs, Pulsar strobing zig-zag bar (5 jaggedness variants), enemy bolt white-pinwheel/red-cross.
- Player claw (yellow, rotatable) and player bullet (two concentric dotted octagons) match the authentic glyphs.
- Shell/render-only: src/core/ untouched; shapes match the glowing-vector aesthetic.

## Reference Notes — *Tempest vs Tempest* (Hogan, 2026)

> Independent second source: Rob Hogan, *Tempest vs Tempest: The Making and Remaking
> of Atari's Iconic Videogame* (2026), a chapter-by-chapter walk of the 6502 source of
> the **1981 arcade** and the **1994 Tempest 2000 (T2000)**. Page cites are the book's
> printed page numbers. This **corroborates and occasionally refines** the primary ROM
> extract in `docs/ux/2026-06-27-enemy-roster-rom-extract.md`; where they disagree, the
> conflict is flagged — resolve against the rev-3 ROM before coding.

**Vector format (for faithful reproduction).** 1981 shapes are relative-draw `CALVEC/VEC`
lists for Atari's Analogue Vector Generator (AVG): each vertex is a 32-bit word holding
**13-bit one's-complement signed X and Y deltas + a 3-bit intensity** (`000Y…IIIX…`), e.g.
`CALVEC -1,-3` → `1FFD1FFF`. Beam moves by accumulating deltas from the prior point; brightness
is per-segment. (p.246–248) Our `pv_draw`/`vsdraw`/`vldraw` deltas map directly onto this.

**Flipper glyph — CORROBORATED exactly.** Book label `INVA1S…INVA1E`, **RED**, 8 relative
vectors that sum to (0,0): `4,1 / 4,-1 / -2,1 / 1,1 / -3,-1 / -3,1 / 1,-1 / -2,-1` — a closed
**X / bowtie ("claw")**, two outward wings crossing centrally; first two entries carry a 3rd
intensity arg. (p.195–197) This is **byte-for-byte identical** to our `_pv_t3` graphic-0 extract
— strong independent confirmation of RED + 8-segment closed bowtie.

**Player Claw — REFINEMENT (animation model).** The 1981 source calls the player ship a
`CURSOR`. Its 8 orientations are **8 separate pre-baked static vector tables** `NCRS1S…NCRS8S`
(yellow), **not** a single runtime-rotated shape. (p.167–171) This refines the story-16 phrasing
"rotatable point-vectors graphics 1-8 … flip/rotate at runtime": the player claw frames are
**hand-authored per angle** — render them as 8 discrete frames, do not derive them by rotating
one path. Exact deltas per frame are catalogued (p.169–171); **`NCRS8S` is structurally different**
(9 entries incl. a leading 3-arg vector) — do not assume all 8 frames share vertex count/format.

**Tanker glyph — CORROBORATED + detail.** Body = a **PURPLE** four-pointed star / concave
X-diamond drawn by shared routine `GENTNK`; outer points at ±32, inner concave vertices at ±12.
(p.233) Cargo "rubrics" (emblems) confirm our extract: the **flipper tanker is anonymous (NO
emblem)** in 1981; only the **pulsar tanker** (a **turquoise zig-zag "M/W"**, `-5,-2 / -3,6 / 0,-6 /
3,6 / 5,-2`) and the **fuse/fuseball tanker** (a small **multi-colored cross** in blue/red/green/
yellow) carry an emblem. (p.233–235)

**Spike tip — RESOLVED → single white dot.** The spike is a **dynamic green line** built per-frame
from VG opcodes (`DSPENL`), drawn far-point→near-point (green color byte `05`), length ∝ growth — its
**tip is a single white dot**: arcade routine `WHITIP` → `JADOT: VCTR 0,0,CB` (one zero-length white
point, no flicker/randomness), quoted as literal code at p.288. This **supersedes** the earlier
"flickering 4-dot sparkle" gloss, which was an unsourced description (no backing code block) and has
been corrected in the canonical ROM extract too. **Render: green line + one white tip dot.**

**Enemy explosion (death effect) — NEW, bonus render detail.** Enemy death = a 4-frame
`EXPL1…EXPL4` sequence, all the **same 16-spoked white star** (`SPOK16`) redrawn at growing scale
**1× → 2× → 4× → 8×**, brightness 7 (frame 1) then 14 (frames 2–4); "almost subliminal." Exact
`SPOK16` spoke deltas on p.206. (p.205–207) Useful if death/explosion glyphs are in scope.

**Player bullet ("charge") — NEW color behavior.** 1981 calls bullets **"charges,"** drawn by a
dot-cluster glyph `DIARA2` (yellow with a red center) via `SCAPIC` (scaled by depth). The 8 charges
are **color-coded as an ammo gauge**: yellow = plenty, **blue when 5–7 are in play**, **red when all
8 are out**. (p.255–259) This is a render cue absent from the ROM extract's "two concentric dotted
octagon rings" note — confirm which glyph rev-3 actually emits, and consider the ammo coloring.

**T2000 contrast (NOT our target).** In the 1994 remake, the flipper/claws are **shaded SOLID
polygons** (red/orange or yellow, 4–6 triangles, GPU-rotated by an explicit `angle`) and the player
bullet is a **sprite** ("beasty3.cry"), not vectors. (p.190–193, 199–204, 239–243) Confirms our 1981
target is **flat hollow wireframe vectors**, not filled solids.

**Coverage gap (honest).** The chapters surveyed did **not** depict the Spiker pinwheel glyph,
the Fuseball ball-of-legs, the Pulsar zig-zag bar, or the enemy-bolt pinwheel/cross. For those four,
the ROM extract (`enemy-roster-rom-extract.md` §C/D/E/F) remains the sole authority.

---
_Generated by `pf context create story 6-8` from the sprint YAML._
_Reference Notes added 2026-06-27 by Architect from_ Tempest vs Tempest _(Hogan, 2026)._
