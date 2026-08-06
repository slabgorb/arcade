# Battlezone (1980) — source-code findings from the 6502disassembly.com quarry

> **Audited against the primary source (2026-07-17).** This is a *secondary-source*
> distillation. It was checked line-by-line against the original 1981 Atari assembler source
> in [`2026-07-17-battlezone-primary-source-audit.md`](./2026-07-17-battlezone-primary-source-audit.md)
> and held up well — **27 of 30 reconciled claims CONFIRMED**. Two corrections apply to facts on
> this page: (1) the DSW0 **language codes are reversed** — `01`=German, `10`=French, not the other
> way round (finding B-028); (2) an early audit note that called `BATBL` "the mountain-scape table"
> was wrong — `BATBL` is the "BATTLE" **title-logo** object, and the real ridge is `MTNS`/`MTN0–7`
> (finding H-001). The bonus-tank threshold this page gives (15K/25K/50K) is **correct** — a
> contradicting "it's really 14K" finding was investigated and killed (B-026). Prefer the audit for
> any constant that feeds gameplay; this page remains the narrative index of the ROM quarry.

**Source:** [6502disassembly.com/va-battlezone/](https://6502disassembly.com/va-battlezone/) —
the commented, community-maintained 6502 disassembly of Atari's 1980 arcade *Battlezone*
(hub page, `objects.html` 3D-object index, `mathbox.html` Math Box description, `rev1.html`
rev1/rev2 diff notes) — **plus, as of the bz1-2 rework, the real ROM quarry**: the 16KB rev2
ROM binary image, the 6502bench SourceGen disassembly project (`Battlezone.dis65`), and the
SourceGen visualizer plugin source (`VisBattlezone.cs`, the canonical table-decoding
algorithm), supplied locally and copied into checkout-local `reference/rom-quarry/`. Both are
cross-checked against
[arcade-museum.com's Battlezone DIP switch settings](https://www.arcade-museum.com/dipswitch-settings/battlezone)
for the one DIP-selectable constant no source resolves to a single value.

**Scope:** This is bz1-2's authority-chain document — every ROM constant later `bz1` stories
rely on (entity roster + scoring, spawn/threshold rules, the 21-obstacle table, 3D
object/vertex specs, difficulty/aggression curve, radar behavior, sound inventory) is
established here, cited to its quarry location, before any gameplay code exists. As of the
rework, the 21-obstacle placement table and all 10 `src/core/models.ts` model geometries are
**byte-exact ROM decodes**, not authored placeholders — see **§6 · What's ROM-verified vs
authored** for the current, corrected accounting (one narrow exception remains: the debris
model's edge *connectivity*, documented there).

**How this was produced:** the hub page and its four sub-pages
(`objects.html`, `mathbox.html`, `rev1.html`, plus the DIP switch community table) were
fetched and read section-by-section; every fact below quotes or paraphrases the source
narrative and cites which page it came from. **Rework (2026-07-03):** the user supplied the
real quarry locally (`~/Downloads/va-battlezone/`: ROM binary + SourceGen project +
visualizer source); `reference/decode_rom_tables.py` ports `VisBattlezone.cs`'s decoding
algorithm to Python and decodes the raw bytes directly — see
`reference/notes/2026-07-03-rom-byte-decode.md` for the full method and cross-checks. This
document is the **committed** distillation — the gitignored, checkout-local `reference/`
quarry it was pulled from is *not* required to be present for any of this to hold; see
`reference/README.md` for the quarry's own provenance and refresh procedure.

---

## Table of contents

1. [Entity roster & scoring](#1--entity-roster--scoring)
2. [Spawn rule & score-threshold introduction](#2--spawn-rule--score-threshold-introduction)
3. [The 21-obstacle ROM table](#3--the-21-obstacle-rom-table)
4. [3D object/vertex specs](#4--3d-objectvertex-specs)
5. [Difficulty / aggression curve](#5--difficulty--aggression-curve)
6. [What's ROM-verified vs authored (read before consuming `src/core/`)](#6--whats-rom-verified-vs-authored-read-before-consuming-srccore)
7. [Radar behavior](#7--radar-behavior)
8. [Sound inventory](#8--sound-inventory)
9. [DIP switches & the missile-threshold pin](#9--dip-switches--the-missile-threshold-pin)
10. [Verification pass against `context-epic-bz1.md`'s "known ROM facts"](#10--verification-pass-against-context-epic-bz1mds-known-rom-facts)
11. [Windshield crack — the `CRACK` counter & the MAME cross-check (bz5-1)](#11--windshield-crack--the-crack-counter--the-mame-cross-check-bz5-1)
12. [Provenance / changelog](#12--provenance--changelog)

---

## 1 · Entity roster & scoring

**Source:** hub page narrative; `objects.html` object index table.

Battlezone's playable hostiles/bonus visitor and their kill values (exact ROM facts, quoted
verbatim from the hub page):

> "Scoring: 1000 for a 'slow tank', 2000 for a missile, 3000 for a 'super tank', and 5000 for
> a saucer."

| Entity | Kill value | ROM object ID (`objects.html`) | `src/core/` |
|---|---|---|---|
| Slow Tank | **1000** | `$02` "Slow Tank" | `scoring.ts` → `SCORES.slowTank`; `models.ts` → `SLOW_TANK` |
| Missile | **2000** | `$16` (tank/missile chunk range `$10`-`$1d`) | `scoring.ts` → `SCORES.missile`; `models.ts` → `MISSILE` |
| Super Tank | **3000** | `$21` "Super Tank" | `scoring.ts` → `SCORES.superTank`; `models.ts` → `SUPER_TANK` |
| Saucer | **5000** | `$20` "Saucer" | `scoring.ts` → `SCORES.saucer`; `models.ts` → `SAUCER` |

The saucer is a **bonus visitor, not the hostile** — see §2's spawn rule. Its 5000-point kill
value is distinct from its 2000-point *appearance* threshold (easy to cross-wire; both
`scoring.ts` and its tests guard the two constants separately).

The full `objects.html` object index also names the non-scoring supporting cast that
`src/core/models.ts` renders geometry for or documents without modeling (this story ships
geometry only for the objects the AC lists — see §4):

| ROM ID(s) | Name | Notes | Modeled this story? |
|---|---|---|---|
| `$00` | Narrow pyramid | obstacle shape | Yes — `NARROW_PYRAMID` |
| `$01` | Tall box | obstacle shape | Yes — `TALL_BOX` |
| `$02` | Slow Tank | 1000-pt hostile | Yes — `SLOW_TANK` |
| `$03` | Projectile | cannon shell | Yes — `SHELL` |
| `$04`-`$0b` | Rear/front tread #0-#3 | tank tread sub-objects | No — out of scope; the hull carries the silhouette this story needs |
| `$0c` | Wide pyramid | obstacle shape | Yes — `WIDE_PYRAMID` |
| `$0d` | Radar dish | rotates on Slow Tank | No — out of scope (not in the AC's model list) |
| `$0e` | Projectile explosion | single-vertex, special draw command | Rolled into `EXPLOSION_DEBRIS` (see §4) |
| `$0f` | Short box | obstacle shape | Yes — `SHORT_BOX` |
| `$10`-`$1d` | Tank/missile chunks | debris sub-objects | Rolled into `EXPLOSION_DEBRIS` |
| `$1e`-`$1f` | Logo "ttle"/"Zone" | attract-mode logo text | No — out of scope (bz1-12 framing) |
| `$20` | Saucer | 5000-pt bonus visitor | Yes — `SAUCER` |
| `$21` | Super Tank | 3000-pt hostile | Yes — `SUPER_TANK` |
| `$22`-`$23` | (empty slots) | unused | — |
| `$24`-`$2b` | Spatter #0-#7 | missile debris drops | Rolled into `EXPLOSION_DEBRIS` |

---

## 2 · Spawn rule & score-threshold introduction

**Source:** hub page narrative.

**"Always one hostile" rule** (quoted verbatim):

> "There will always be one hostile unit on the battlefield, either alive or exploding. When
> a unit dies, the next one is chosen as follows... There is no delay between one leaving and
> the next appearing."

The saucer is explicitly a bonus visitor **on top of** that one hostile, not a replacement for
it — confirms the epic context's framing (see §10).

**Missile introduction** (quoted verbatim, code label cited):

> "When your score reaches a threshold determined by DIP switch settings (5K, 10K, 20K, or
> 30K), missiles start to appear." — code reference `$69be`.

**Secondary missile threshold** (quoted verbatim, code label cited) — a fact **not** present
in the epic context's placeholder list, newly surfaced by this story:

> "Missiles have a second score threshold equal to the base threshold plus 25K points." — code
> reference `$6679`.

This means a game that starts with the 10K-point base threshold (see §9) sees a *second*
wave of missile introduction at 35K points. Not ported to `src/core/scoring.ts` this story
(out of AC scope — only the base threshold, the four kill values, and the saucer-appearance
score are named as committed constants) but recorded here for whichever future story
(bz1-8/bz1-10) implements the missile spawn/difficulty ramp.

**Saucer appearance** (quoted verbatim):

> "Saucers start appearing at 2000 points."

---

## 3 · The 21-obstacle ROM table

**Source:** hub page narrative; **byte-decoded from the real ROM (rework, 2026-07-03)** — see
`reference/notes/2026-07-03-rom-byte-decode.md`.

> "Obstacles do not appear at random. There are 21 of them, and their types, positions, and
> orientations are specified by tables in ROM."

Cross-referenced against `objects.html`'s object index, the ROM names **four distinct
obstacle shapes** — not a generic "pyramids/blocks" pair as the epic context's placeholder
summary put it, but exactly these four IDs:

| ROM ID | Name | `src/core/obstacles.ts` `ObstacleType` |
|---|---|---|
| `$00` | Narrow pyramid | `'narrow-pyramid'` |
| `$0c` | Wide pyramid | `'wide-pyramid'` |
| `$01` | Tall box | `'tall-box'` |
| `$0f` | Short box | `'short-box'` |

**ROM-VERIFIED (rework):** the individual (position, orientation, type) values for all 21
entries are now a byte-exact decode of three parallel ROM tables, confirmed against
`Battlezone.dis65`'s own labels:

| Table | ROM address | dis65 label | Entry format |
|---|---|---|---|
| `obstacle_z_pos` | `$7681` | `obstacle_z_pos` (label key `"9857"`) | 21 × int16 LE |
| `obstacle_x_pos` | `$76ab` | `obstacle_x_pos` (label key `"9899"`) | 21 × int16 LE |
| `obstacle_t_f` | `$3fcc` | `obstacle_t_f` (label key `"16332"`) | 21 × [type byte, facing byte] |

The `.dis65` comment on `obstacle_t_f`: "Obstacle type and facing data. Each entry is two
bytes. The first is the object type, the second is the facing angle. (All obstacles are
symmetric, so every 90-degree turn effectively returns to zero.)" The disassembly's own inline
per-byte annotations name the type for all 21 entries in order (e.g. `"wide pyramind"` [sic],
`"short box"`, `"wide pyramid"`, ...) — this independently-authored list matches our decoded
type-byte sequence exactly, entry for entry, which is the strongest available cross-check.
Facing byte → radians uses the ROM-wide 8-bit angle wheel (`256` = one full turn):
`orientation = facing_byte * (2*PI/256)`.

**Decode cross-check:** `VisBattlezone.cs`'s minimap renderer (`GenerateMap()`) reads only the
HIGH byte of each 16-bit position word. Every one of our 21 decoded (x, z) values is an exact
multiple of 256 (every LOW byte in the ROM is `0`) — this fell out of the decode rather than
being assumed, and it matches the visualizer's implicit assumption exactly, corroborating the
address/offset math independently of self-consistency.

All 21 are pairwise distinct — a property the predecessor's authored placeholder had to
construct deliberately; here it's just what the ROM contains. Distance from world origin,
computed directly from the decoded table above, ranges **~9441–46341 units** (7 of 21 entries
exceed 31487). See §4 for why this is expected, not a defect: the Math Box's near/far culling
window is a camera-relative render-time clip, not a bound on static world placement, so there
is no reason to expect obstacle distance-from-origin to sit inside it.

---

## 4 · 3D object/vertex specs

**Source:** `mathbox.html`; `objects.html`.

**Coordinate system** (quoted verbatim from `mathbox.html`):

> "+X points to the left, +Y up, +Z into the monitor" ... "When facing angle 0, the player
> looks toward +Z" ... "Increasing angle rotates counter-clockwise toward +X."

**View frustum / culling bounds** (quoted verbatim):

> Near plane `$03ff` (1023 units); far plane `$7aff` (31487 units). "Objects outside these
> distances are culled before vertex processing."

This is a **camera-relative** render-time clip — how far an object is from the player's
current viewpoint before it's culled, each frame — not a bound on static world-placement
distance from the origin. The player's tank moves freely around the plane, so a fixed
obstacle's distance from world origin `(0,0)` has no necessary relationship to its distance
from the camera at any given moment; an obstacle far from `(0,0)` is simply invisible/culled
until the player drives near it, exactly like a close obstacle is culled once the player drives
away.

**Correction (rework):** an earlier draft of this section (before the byte-decode rework)
conflated the two, claiming `src/core/obstacles.ts`'s (then-authored, fabricated) placement was
deliberately sized to keep every obstacle's distance from origin inside this `[1023, 31487]`
window. That was true of the fabricated data (which had no other constraint to satisfy) but was
never a real ROM property to begin with. The byte-decoded `OBSTACLES` table (§3) ranges
**~9441–46341 units from world origin** — 7 of the 21 entries exceed the `31487` far-plane
value — which is correct and expected, not a fidelity gap: real obstacle placement was never
bound by the camera's per-frame culling window.

**Vertex/command table format** (quoted verbatim from `objects.html`):

> "A table of vertex data addresses starts at `$388e`, followed by the vertex data
> itself...The format is straightforward: a data length byte, followed by 16-bit X/Y/Z
> coordinates." ... "The table of shape command addresses starts at `$7472`, and the drawing
> code is at `$5c5c`. Each byte has a 3-bit command and a 5-bit vertex index."

**ROM-VERIFIED (rework):** `reference/decode_rom_tables.py` ports `VisBattlezone.cs`'s
`GenerateWireframe()` (the SourceGen visualizer's own decoding algorithm) to decode the real
vertex/command byte streams at `$388e`/`$7472` for each shape index. Format, confirmed by
successful decode of all 9 non-debris models with zero post-processing: a length byte, then
6-byte vertices (`zc`, `-xc`, `yc*2` as 16-bit LE — the `yc*2` compensates the Math Box's
X/Z-halving so all three axes share one scale); the command stream then reads bytes until
`$ff`, each byte's high 5 bits a vertex index and low 3 bits a draw command (`4` = draw edge
from the current beam position; `0/2/3` move the beam; `0` additionally plots an isolated
point; `1/5/6` don't affect vertices/edges). See §6 and
`reference/notes/2026-07-03-rom-byte-decode.md` for the full method and spot-checks (e.g. the
decoded `wide-pyramid`/`narrow-pyramid` and `tall-box`/`short-box` dimensions independently
reproduce their "wide base, shorter apex" / "tall vs. short" naming, unprompted; `missile`'s
shape ID `$16` is independently confirmed by unrelated game-logic comments in the
disassembly).

`src/core/models.ts` ships **10 `Model3D` entries** — the full roster the AC names (slow
tank, super tank, missile, saucer, the player shell/projectile, explosion debris, and all
four obstacle shapes). **9 of the 10 are byte-exact ROM decodes** (vertices AND edges,
zero authored data); `EXPLOSION_DEBRIS` is a documented hybrid — ROM-exact vertex positions,
authored edge connectivity (see §6 for why). Every model is well-formed (in-range edge
indices, no self-edges, no duplicate undirected edges, no orphan vertices) — asserted by
`tests/core/models.test.ts`, and independently verified against `VisBattlezone.cs`'s own
`VisWireframe.Validate()` well-formedness gate before porting.

| Model | `src/core/models.ts` export | Vertex count | Edge count | ROM status |
|---|---|---|---|---|
| Narrow pyramid | `NARROW_PYRAMID` | 5 | 8 | ROM-exact ($38e6/$74cb) |
| Wide pyramid | `WIDE_PYRAMID` | 5 | 8 | ROM-exact ($3c3b/$74cb) |
| Tall box | `TALL_BOX` | 8 | 12 | ROM-exact ($3905/$74d7) |
| Short box | `SHORT_BOX` | 8 | 12 | ROM-exact ($3c5a/$74d7) |
| Slow Tank | `SLOW_TANK` | 24 | 38 | ROM-exact ($3955/$74e9) |
| Super Tank | `SUPER_TANK` | 25 | 34 | ROM-exact ($3f17/$75ff) |
| Missile | `MISSILE` | 26 | 43 | ROM-exact ($3c8b/$757c, shape `$16`) |
| Saucer | `SAUCER` | 17 | 32 | ROM-exact ($3eb0/$75b5) |
| Shell (projectile) | `SHELL` | 5 | 8 | ROM-exact ($3936/$7519) |
| Explosion Debris | `EXPLOSION_DEBRIS` | 9 | 8 | Vertices ROM-exact (shape `$24` + `$0e`); edges AUTHORED — see §6 |

---

## 5 · Difficulty / aggression curve

**Source:** hub page narrative, code label cited.

> "The enemy has a score value that increases by 1000 points when the player is killed. The
> enemy's level of aggression is based on the difference between the player's score and the
> enemy's score." — code reference `$69fd`.

> "If the enemy is winning, tanks will appear in front of the player, move uncertainly, and
> take bad shots. This changes gradually until the player is out-scoring the enemy by 7000
> points, at which time the enemy spawns in any direction and moves with full aggression."

> "Even when initially mild, the enemy will become more aggressive ~17 seconds after it has
> spawned."

This confirms and **quantifies** the epic context's "ratchet up to the ROM curve" framing
with three concrete numbers new to this story: the **1000-point** per-kill enemy-score
increment, the **7000-point** player/enemy score differential at which the enemy reaches full
aggression, and the **~17-second** per-spawn aggression ramp-up. Not ported to `src/core/`
this story (no `difficulty.ts`/`enemies.ts` AC this story — that's bz1-7/bz1-10's job); recorded
here as the citation those future stories will port from.

---

## 6 · What's ROM-verified vs authored (read before consuming `src/core/`)

This section is the single source of truth for "how much of `src/core/obstacles.ts` and
`src/core/models.ts` is real ROM data vs. authored geometry." **Updated by the bz1-2 rework
(2026-07-03):** the original GREEN pass could only web-fetch 6502disassembly.com's
prose/HTML, which confirms existence/format/address but not raw bytes — this rework was given
the real ROM quarry locally and decoded the actual bytes. Every downstream story should read
this before assuming (or doubting) byte-exact fidelity.

**ROM-VERIFIED (byte-exact decode, cited to a specific ROM address/label above):**
- Exactly 21 obstacles exist, stored in ROM tables of (position, orientation, type) — §3.
- The four obstacle shape IDs/names (narrow pyramid, wide pyramid, tall box, short box) — §3.
- **All 21 `OBSTACLES` (x, z, orientation, type) entries in `src/core/obstacles.ts`** —
  decoded from `obstacle_z_pos`/`obstacle_x_pos`/`obstacle_t_f` ($7681/$76ab/$3fcc) — §3.
- The full 44-entry object index (names, IDs, groupings) — §1.
- The vertex-table and draw-command-table storage FORMAT and ROM ADDRESSES ($388e, $7472) —
  §4.
- **9 of 10 `Model3D` entries in `src/core/models.ts`** (all vertices AND edges): narrow
  pyramid, wide pyramid, tall box, short box, slow tank, super tank, missile, saucer, shell —
  decoded from the shape vertex/command tables at $388e/$7472 — §4.
- All scoring, spawn, threshold, difficulty, radar, and sound facts in §1, §2, §5, §7, §8; the
  four kill-score values (1000/2000/3000/5000) are additionally confirmed via inline
  immediate-value comments in the ROM's own kill-score-add routine — §9.

**HYBRID (ROM-exact data + one documented authored choice) — `EXPLOSION_DEBRIS` only:**
- Its 9 vertices are ROM-exact: 8 from shape `$24` ("Spatter #0"), 1 from shape `$0e`
  ("projectile explosion").
- Its 8 edges are AUTHORED (origin → each spatter point, "radiating shrapnel"). **Why:** the
  ROM does not draw these vertices connected by lines at all — shape `$24`-`$2b` ("Spatter",
  8 near-identical shapes) each decode to 8 vertices and **zero edges**: every one of their
  draw commands is `cmd 0` ("move to vertex, draw **point**"), never `cmd 4` ("draw **edge**
  to vertex"). Shape `$0e` similarly decodes to a single vertex and zero draw commands — per
  `VisBattlezone.cs`'s own comment, it's drawn via a hardware-canned "scaled shape" sprite
  (`cmd 5`, "draw scaled shape from $347A"), not a decodable vertex/edge mesh. **This is a
  genuine structural mismatch, not a decode gap:** the ROM's actual debris rendering is
  point-sprite based; `Model3D` (ported from star-wars) has no point primitive, only
  `edges: [number, number][]`. Connecting real ROM vertex positions with authored edges is the
  closest fit within the existing wireframe-only schema — flagged as a **Design Deviation** in
  the session file (RESOLVED-by-rework tag on the original two deviations; this is a NEW, third
  observation the byte decode surfaced) and a non-blocking Delivery Finding, not silently
  ROM-exact.

**Historical note — the two original Design Deviations are RESOLVED by this rework:** the
predecessor's "obstacle table AUTHORED" and "model geometry AUTHORED" deviations (both logged
2026-07-03, moderate severity) are superseded — see the session file's Design Deviations
section, which marks both RESOLVED rather than deleting them (history matters: they correctly
described the state at the time, under the web-fetch-only constraint that applied then).

---

## 7 · Radar behavior

**Source:** hub page narrative.

> "The units on the battlefield are visible in a cone 45 degrees wide, which is why when you
> spin in a circle the battlefield objects move out of sync with the background."

> "Enemy tanks and missiles appear on radar, obstacles and saucers do not."

Confirms the epic context's radar framing exactly (45° visibility cone; obstacles/saucers
invisible to radar). The epic context's additional "90° FOV" background-horizon claim is
**not confirmed or denied** by anything fetched for this story — it is carried over
unverified pending whichever story (bz1-6, radar rendering) next touches this area.

---

## 8 · Sound inventory

**Source:** hub page narrative.

Four POKEY channels plus discrete circuits (quoted verbatim):

> Channel 1: "collision with object, post-collision 'merp', saucer hit, saucer alive, high
> score / 100K fanfare"
>
> Channel 2: "radar 'ping', extra life (4 beeps), new enemy alert (three boops), high score /
> 100K fanfare"
>
> Channel 3/4: "missile buzz"

> Discrete components provide: "Engine sound, which can rev up and down over the course of
> several frames. Cannon firing sound, which can be loud (player) or soft (enemy). Explosion,
> which can be loud (player hit) or soft."

Sound control write address noted in the memory map: `$1840`. No further code-level detail
(envelope tables, frequencies) was surfaced from the hub-page narrative — bz1-11 (audio) will
need a deeper pull of the disassembly's sound-routine section if POKEY-accurate envelopes are
required, same caveat as §6.

---

## 9 · DIP switches & the missile-threshold pin

**Source:** hub page narrative (`$0A00`/`$0C00` memory-map labels, bit layout); **re-confirmed
against the real ROM's `Battlezone.dis65` disassembly (rework, 2026-07-03)**; cross-checked
against [arcade-museum.com's Battlezone DIP switch settings](https://www.arcade-museum.com/dipswitch-settings/battlezone)
for the factory default.

**Bit layout** (quoted verbatim, `Battlezone.dis65`'s own file-header memory-map comment):

```
DSW0 ($0A00): LLBBMMTT
  LL=language (00=English, 01=French, 10=German, 11=Spanish)
  BB=bonus tank score (00=none, 01=15K/100K, 10=25K/100K, 11=50K/100K)
  MM=missile appears at score (5K, 10K, 20K, 30K)
  TT=number of starting tanks (value + 2)
```

**CORRECTED (bz3-13 / B-028): the `LL` line above is quoted verbatim from the disassembly's own
comment, but that comment has `01`/`10` backwards.** `LNGTBL` (`BZONE.MAC:4102`,
`.WORD ENGLISH-1,GERMAN-1,FRENCH-1,SPANSH-1`) orders English/German/French/Spanish and is indexed
by `2×LL` (`MSGS`, `BZONE.MAC:4103-4110`), so the true mapping is **`01`=German, `10`=French** — the
disassembly's comment had it swapped, and this doc inherited the swap until this correction.

The missile-intro routine's own `.dis65` comment (file offset 5864) reads verbatim:
"Determines when missiles first appear, based on DSW0 setting: after 5000, 10000, 20000, or
30000 points." **ROM-CONFIRMED: this exactly matches the four-option band already pinned by
the original pull — no correction.** As before, the disassembly does not itself resolve to
one factory-default number — it's a physical DIP bank read at runtime (`$0A00`), off-board
from the ROM's own constants, so no amount of ROM byte-decoding can recover "which position
the switches shipped in." Per the story's allowance ("pin one authentic DIP default... using
the disassembly's DIP table, or a published analysis if the table doesn't resolve to a clean
single default"), the pin remains taken from a published community analysis of the physical
DIP bank:

> arcade-museum.com's "BOTTOM 8 SWITCH DIP" table marks the row
> `....10.. Missile appears after 10,000 points` with a `$` — that site's factory-default
> marker.

**Pinned value: `MISSILE_INTRO_THRESHOLD = 10000`** (`src/core/scoring.ts`), citing the
10,000-point factory-default row above. (Note: arcade-museum.com's page itself carries the
caveat that its settings are "contributed by the community" and "has not been tested or
verified" — the best available published source at the time of this story, per the epic's
tier-2 "published analyses of the disassembly" fallback in its fidelity-authority chain.)

**Scoring constants — ROM-CONFIRMED (rework):** `Battlezone.dis65`'s kill-score BCD-add
routine (file offset ~4086-4122) carries inline immediate-value comments naming the literal
score adds directly in the disassembled code: `"1000 points"` (offset 4110), `"2000 points"`
(offset 4097), `"3000 points"` (offset 4106), and (a separate saucer-kill routine)
`"5000 points"` (offset 4388). These match `src/core/scoring.ts`'s `SCORES` exactly — no
correction; the citation is now a ROM code-offset in addition to the original hub-page prose
quote in §1.

---

## 10 · Verification pass against `context-epic-bz1.md`'s "known ROM facts"

Every bullet in the epic context's "Known ROM facts already established" list was checked
against the quarry fetched for this story. **Result: all bullets CONFIRMED accurate — no
factual corrections to `context-epic-bz1.md` were required.** Two bullets are *expanded* with
newly-cited detail (recorded here, not written back into the epic context, per the epic's own
framing that bz1-2 "verifies and expands" into the findings doc):

| Epic bullet | Verification | New detail this story adds |
|---|---|---|
| Scoring 1000/2000/3000/5000 | ✅ Confirmed exactly (§1) | — |
| "Always one hostile" spawn rule | ✅ Confirmed exactly (§2) | Explicit "no delay" wording |
| Missile threshold 5K–30K DIP; saucer at 2000 | ✅ Confirmed exactly (§2, §9) | Secondary missile threshold = base + 25K (§2); factory default pinned at 10K (§9) |
| Difficulty ratchets up to ROM, never past | ✅ Confirmed, framing matches (§5) | 1000-pt enemy-score increment, 7000-pt full-aggression differential, ~17s ramp (§5) |
| 21 fixed obstacles, pyramids/blocks | ✅ Confirmed count; "pyramids/blocks" is a fair paraphrase of the four named shapes (§3) | Exact 4 shape IDs/names (narrow/wide pyramid, tall/short box) |
| Radar 45° cone, obstacles/saucers invisible | ✅ Confirmed exactly (§7) | — |
| Radar 90° FOV horizon | ⚠️ Not confirmed or denied — outside this story's fetched pages | — |
| POKEY + discrete sound | ✅ Confirmed, framing matches (§8) | Exact channel-to-effect assignments (§8) |

No entries required a value change, so `context-epic-bz1.md` is left as-is by this story (per
the SM's finish-ceremony note: any correction edit would stay uncommitted until finish — moot
here since there is no correction to make).

---

## 11 · Windshield crack — the `CRACK` counter & the MAME cross-check (bz5-1)

The cracked-glass windshield is the cabinet's **hit reaction**, not a permanent decal.
The clone drew it every frame from spawn (`src/main.ts`, the old unconditional
`drawCrackedGlass` call) — so the viewport "started cracked". The ROM gates it on a
counter bz4-1 shipped `BOUNCE` **without**:

| ROM (`BZONE.MAC`) | Meaning |
|---|---|
| `CRACK: .BLKB 1  ;CRACKED WINDSHIELD COUNTER` (:256) | The register. 0 = clean. |
| `LDA I,2 / STA CRACK` (:2335-2336) | **Set to 2 on the death / windshield-crack path**, right beside `LDA I,-1 / STA BOUNCE` (:2337-2338), **before** `DEC LIVES` (:2339) — so **every** life lost (game-over included) cracks the glass. The mutual-kill branch writes it too (:3362). |
| `LDA CRACK / BEQ 31$ / JMP WNSHLD` (:506-508) | The render gate: `CRACK == 0` → open the clear window (`BIGWND`); `CRACK != 0` → draw the cracked windshield (`WNSHLD`). So **"cracked" ≡ `CRACK != 0`**. |
| `INC CRACK / INC CRACK` (:697-698) | Advance the counter **+2 per game frame** — the crack progressively spreads (more `CRACKS` sections drawn as it climbs). |
| reset `STA CRACK` = 0 at the `16*2` cap (:656, :660-661), then reposition/respawn or → attract | A **bounded** death sequence (~15 game frames ≈ 1 s at 15.625 Hz), then it clears on its own. |

**What bz5-1 shipped (VISIBILITY only):** `GameState.crack` (`src/core/state.ts`), a pure
core counter — set to 2 on the death step in `stepBattle` (both the respawn and game-over
returns), advanced +2 per 15.625 Hz game frame in `advanceRadar` (beside `bounce >> 1`),
reset to 0 at `16*2`. The shell reads `game.crack` and draws the overlay only when it is
non-zero. `CRACK_PATHS` (the geometry) is unchanged — only the overlay's **visibility** is
now gated. Core purity is preserved (the counter is computed in core, read in the shell).

**AC3 — cross-check against MAME's player-death handling.** MAME has **no** death-specific
C code: the death/crack logic is the ROM the M6502 executes (`bzone_a.cpp` models only the
discrete explosion/shell audio, not the counter). MAME's independent contribution is the
**clock that times the sequence**: the 6502 runs at `BZONE_MASTER_CLOCK/8 = 1.512 MHz`
(`bzone.cpp:611`), the NMI is periodic at `BZONE_CLOCK_3KHZ/12 ≈ 246 Hz`
(`bzone.cpp:613`, `bzone.h:20-21`), and the ROM frame counter divides the NMI by 16
("`AND I,0F` … END OF FRAME (64 MS)", `src/core/timebase.ts`) → a **≈15.38 Hz** game
frame. The clone uses **15.625 Hz** (NMI taken as exactly 250 Hz). Either rate puts the
~15-game-frame crack window at **≈0.96–0.98 s** — the difference does not materially change
the window, and the exact NMI-rate reconcile (246 vs 250 Hz) is **resolved in §11.3**
(bz5-3, the timebase cross-check story: mechanism confirmed, ~1.59% delta documented, 15.625 kept). **Ruling:** the shipped crack timing (2 → +2/frame →
reset at `16*2`, ≈1 s) is faithful to the ROM sequence MAME executes.

**Documented deviation (deferred).** The ROM's full death sequence FREEZES the tank while
the crack spreads ("ALLOW ENDING SEQUENCE TO FINISH", :450), draws **progressively more**
`CRACKS` sections as `CRACK` climbs, and **repositions** the tank on reset (:660-713). The
clone respawns **instantly** and draws the full `CRACK_PATHS` for the whole window (no
tank-freeze, no progressive sections, no reposition). bz5-1 is scoped to visibility only;
the tank-freeze / progressive-sections / reposition port is a candidate **bz5 follow-up**.

---

### 11.1 · MAME colour-overlay geometry & our deliberate deviation (bz5-2)

MAME models the cabinet's physical colour overlay in `layout/bzone.lay` (not in the ROM):
a two-band gel blended **multiply** over the monochrome vector CRT — **RED** from the top
down to **0.2** of viewport height (rgb `1.0,0.125,0.125`) and **GREEN** from `0.2` to
`1.0` (rgb `0.125,1.0,0.125`). `bzone.cpp:855` records a separate **blue**-overlay ROM
variant — out of scope here; the green cabinet is canonical. The `0.2` boundary is pinned
in the clone as `MAME_COLOR_SPLIT` (`src/shell/render.ts`) and guarded by
`tests/shell/periscope-overlay.test.ts`.

**Deliberate deviation (method, not boundary):** we honour MAME's `0.2` split *location* —
the red score/radar band occupies the top ~20% and the field below is green — but we do
**not** lay a full-width translucent red/green multiply gel across the whole viewport.
Instead the clone colours the **HUD elements** in that top band red (`HUD_RED` — score,
high-score, alert text, and the radar scope chrome) and renders the vector world green
(`GLOW_GREEN`). Reason: a multiply gel over the entire green vector field would dim and
muddy the wireframe legibility our render depends on, for no gameplay gain; colouring the
HUD elements reproduces the cabinet's red-band / green-field read while keeping the vectors
crisp. Boundary fidelity is exact (`0.2`); the rendering method is the documented deviation.

**bz5-5 update (playtest correction):** two changes after the bz5-2 pass was played.
(1) The **radar scope is now red** — it lives in the top red band, so bz1-12's original
"radar chrome stays green" choice (which bz5-2 had carried as a deviation) was retired;
`drawRadar` now strokes `HUD_RED`, matching the real cabinet's red radar. Only the vector
WORLD below `0.2` stays green. (2) The **periscope framing is no longer a rectangle box** —
bz5-2 shipped a full green border ("just a box"), which the reference cabinet does not have.
`drawPeriscope` now strokes two vertical **viewport brackets** flanking the aiming centre
(the cabinet's periscope sight frame), leaving the central aperture clear. Framing now comes
from the HUD (red top band + brackets + gunsight), not a drawn border.

### 11.2 · Enemy AI cross-check against MAME (bz5-4)

Re-validation of the enemy AI shipped across bz1–bz4 (the goal-heading tank state
machine — flank/wander/charge, ~22 °/s turn, standoff, fire-on-sweep; plus saucer,
missile and super-tank behaviour) against MAME as an **independent second primary
source**. bz1–bz4 read that behaviour off the `BZONE.MAC` / dis65 **disassembly**;
MAME **executes** the same ROM, so — where MAME's driver documents anything — its
documentation is a second source on the port.

**The structural fact that scopes this cross-check (same as §11/bz5-1).** MAME's
driver source contains **no enemy-AI logic**. The state machine (turn rate,
standoff, flank/charge transitions, fire-on-sweep) and `GetTankType`'s missile-count
super-tank selection live in the `maincpu` ROM region MAME loads and runs
(`bzone.cpp:711-717`, the `maincpu` ROMs `036409-01`…`036414-02`) — byte-identical to what
`BZONE.MAC` disassembles. `bzone.cpp` / `bzone_a.cpp` only wrap the **hardware**
(clock chain, DIP inputs, discrete/POKEY audio). So MAME **cannot independently
transcribe the AI logic** to diff against; a true "executed-behaviour" cross-check
of the AI logic itself would require **running** MAME and observing telemetry, which
a source-diff / headless unit suite cannot do. This is a **limitation on AC1**, not a
gap in the clone: the bz1–bz4 disassembly audit remains the sole *logic* source, and
it is not weakened by MAME. What MAME **does** second-source is below.

**CONFIRMED — spawn/cadence thresholds (AC2), upgraded from one secondary source to two.**
The clone pinned two DIP-selectable values from a **secondary** source
(arcade-museum.com's DIP sheet) because "the ROM cannot name a factory default"
(`src/core/scoring.ts:63-66`, `src/core/difficulty.ts:38-44`). MAME's driver
documents the **same factory defaults** (`$`-marked), so the two sources now agree:

| Value | Clone | MAME (`bzone.cpp`, `$` = factory default) | Verdict |
|---|---|---|---|
| Missile-intro threshold | `MISSILE_INTRO_THRESHOLD = 10000` (`scoring.ts:66`) | `bzone.cpp:75` — "Missile appears after 10,000 points  $" | **CONFIRMED** |
| Bonus-tank thresholds | `BONUS_TANK_SCORES = [15000, 100000]` (`difficulty.ts:44`) | `bzone.cpp:79` — "Bonus tanks at 15,000 and 100,000 points  $" | **CONFIRMED** |

`tests/core/scoring.test.ts` only asserted the missile threshold was **within** the
`{5000, 10000, 20000, 30000}` DIP band; the second source resolves the band to the
single default, so `tests/core/enemies-mame-crosscheck.test.ts` tightens it to
`=== 10000` and pins `BONUS_TANK_SCORES` to the MAME-documented pair.

**CONFIRMED — sound-gating observable hook (AC2).** `bzone_a.cpp:1-20` documents the
cabinet's sound-enable bits — one shared generator per effect, gated as an audible
trace of the AI acting. The clone's core→cue map (`src/shell/audio-dispatch.ts`)
ties enemy actions to exactly these single generators:

| MAME sound-enable bit (`bzone_a.cpp:1-20`) | Enemy action | Clone hook | Verdict |
|---|---|---|---|
| D0 explosion enable — "gates a noise generator" (:18) | a unit is destroyed | `enemy-destroyed` → `play('explosion')` (`audio-dispatch.ts:38`) | **CONFIRMED** |
| D0 explosion enable — one generator, not a per-side pair | the player is destroyed | `player-hit` → `play('explosion')` (`audio-dispatch.ts:48`) | **CONFIRMED** (single generator) |
| D2 shell enable (:16) | a shell leaves a barrel | `shot-fired` → `play('cannon')` (`audio-dispatch.ts:35`) | **CONFIRMED** |
| D7 motor enable / D4 engine rev (:7, :11) | tank driving (engine) | continuous `setEngine(effort)` (`audio-dispatch.ts:107`) | **CONFIRMED** (and see note) |

*Note (premise correction):* the story framed the engine bits (D7/D4) as an "enemy
action" hook. `bzone_a.cpp:7-14` shows the engine/rev sound is a **single continuous
generator** — the **player's own tank** idle-hum + rev, not a per-enemy cue — which
is exactly how the clone models it (`updateContinuousSounds`, tread-effort driven).
The enemy-tied audible actions are D2 (fire) and D0 (die).

**Timebase.** The AI's per-frame cadences (turn °/frame, ramp seconds) convert to
real time via the ROM game frame, which §11 already reconciled against the MAME clock:
6502 at `BZONE_MASTER_CLOCK/8 = 1.512 MHz` (`bzone.cpp:611`), periodic NMI at
`BZONE_CLOCK_3KHZ/12 ≈ 246 Hz` (`bzone.cpp:613`, `bzone.h:20-21`), the ROM frame
counter dividing NMI by 16 → **≈15.38 Hz** vs the clone's 15.625 Hz. The exact
246-vs-250 Hz reconcile is **resolved in §11.3** (bz5-3: mechanism confirmed, ~1.59%
delta documented, 15.625 kept); it does not move any AI constant materially and no AI
value is re-pinned here.

**Trap avoided (green-phase re-check).** `bzone.cpp:151-164` documents a
"Self-adjusting game difficulty" DIP feature with a target-average-game-length table —
tempting to read as a second source on Battlezone's aggression ramp (`difficulty.ts`).
It is **not Battlezone's**: it sits inside the file's `RED BARON DIP SWITCH SETTINGS`
block (`bzone.cpp:122`, "airplanes per game", switch at P10/M10) — Battlezone and Red
Baron share `bzone.cpp`. Battlezone's own DIP block (`bzone.cpp:42-90`) has **no**
self-adjusting-difficulty switch; Battlezone's adaptive difficulty is the ROM's
score-differential aggression ramp (findings §5, `$69fd`), which MAME's driver does
**not** document. Attributing the Red Baron DIP to Battlezone would have been a false
finding; the correct reading leaves the §5 aggression ramp single-sourced to the
disassembly, consistent with the structural fact above.

**Ruling (AC3).** The enemy AI is **CONFIRMED** against the second source on every
axis MAME can document — the two spawn-threshold defaults and the enemy-action
sound-gating all agree; the engine-bit note is a story-premise correction, not a code
divergence. **No divergence was found where both sources agree the clone is wrong, so
no AI behaviour changes** (AC3's precondition is unmet by design). The AI *logic*
axes (turn rate, standoff, flank/charge, fire-on-sweep, super-tank selection) are
outside what MAME's source can second-source and stay pinned to the bz1–bz4
disassembly audit. **Open item for a human ruling:** whether a live-MAME behavioural
capture (running the emulator and logging AI state) is worth a follow-up to
second-source the AI *logic* — the only way to satisfy AC1's "executed behaviour"
literally; recommended **not** blocking, as bz1–bz4 already fixed the logic against
the disassembly and this pass found no contradicting evidence.

### 11.3 · Timebase cross-check against MAME's clock chain (bz5-3)

Closes the exact NMI-rate reconcile that §11 (bz5-1) explicitly **deferred to bz5-3**.
MAME is the independent, executable second source: its `bzone_base` machine config
(`~/Projects/mame/src/mame/atari/bzone.cpp`, off-repo — cited in prose, as with §11.2)
gives the full clock chain, and it **confirms the clone's mechanism** while pinning the
NMI's exact rate — which the ROM's own round "END OF FRAME (64 MS)" comment only
approximates.

**The chain (MAME):**

| Node | MAME derivation | Rate |
|---|---|---|
| Master clock | `XTAL(12'096'000)` (`bzone.h:20`) | 12.096 MHz |
| 6502 core | `BZONE_MASTER_CLOCK / 8` (`bzone.cpp:611`) | 1.512 MHz |
| `BZONE_CLOCK_3KHZ` | `master / 4096` (`bzone.h:21`) | ≈ 2953.125 Hz |
| NMI (periodic int) | `BZONE_CLOCK_3KHZ / 12` (`bzone.cpp:613`), gated by IN0 0x10 self-test (`bzone.cpp:261-266`) | ≈ **246.094 Hz** |
| Vector refresh | `BZONE_CLOCK_3KHZ / 12 / 6` (`bzone.cpp:619`) | ≈ 41.016 Hz |

**Mechanism — CONFIRMED.** The ROM derives the game-logic tick by **counting NMIs**, not
by vector-draw sync: `AND I,0F` + `INC SYNC` bumps the frame counter every **16th** NMI
(`BZONE.MAC:1084-1088`, "END OF FRAME (64 MS)"), and `MAIN: LSR SYNC` (`BZONE.MAC:422`)
blocks the main loop on that tick. MAME's `set_refresh_hz(... / 12 / 6)` independently
corroborates the vector generator as a **separate** NMI/6 divide (≈41 Hz), i.e. the display
refresh is NOT the game-logic rate — the two are distinct nodes off the one NMI. So
`game frame = NMI ÷ 16` is second-sourced.

**Rate — a documented ~1.59% drift, not a clean confirmation.** The clone (bz3-1) took the
NMI as a round **250 Hz** (back-computed from the "64 MS" comment: 64 ms ÷ 16 = 4 ms ⇒
250 Hz) → `GAME_FRAME_HZ = 15.625`. MAME's exact chain gives NMI = **246.094 Hz**, so the
executed hardware frame is `246.094 / 16 =` **≈ 15.381 Hz** (65.02 ms). The clone therefore
runs **≈1.59% fast** (`250 / 246.094 − 1`); the vector node shows the same nominal-vs-exact
gap (clone/audit 41.67 Hz vs MAME 41.016 Hz). The delta is entirely the round-250 vs
exact-246.094 NMI — the ROM's "64 MS" label is itself a ~1.6% rounding of its own hardware's
65.02 ms period.

**Ruling (verification-first, NOT a speculative rewrite).** **KEEP `GAME_FRAME_HZ = 15.625`** —
the ROM designers' *documented* 64 ms game-frame intent — and **document** the ~1.59%
nominal-vs-exact delta here with the MAME citation added in `src/core/timebase.ts`. No
magnitude is rewritten: correcting to 15.381 Hz would re-baseline the entire bz3 magnitude
suite (turn rate, forward speed, shell speed, radar sweep, every cadence-gated counter) for a
sub-2% change the ROM's own comment already rounds away, which the story's mandate forbids.
This matches §11's bz5-1 pre-ruling that "the difference does not materially change the
window." Cross-check pins: `tests/core/timebase-mame-crosscheck.test.ts`.

## 12 · Provenance / changelog

| Date | Change | Source |
|---|---|---|
| 2026-07-03 | Initial findings doc authored (story bz1-2) | 6502disassembly.com/va-battlezone/ (hub, objects.html, mathbox.html, rev1.html); arcade-museum.com DIP switch settings |
| 2026-07-03 | **Rework:** `src/core/obstacles.ts`'s 21 entries and 9 of 10 `src/core/models.ts` model geometries upgraded from AUTHORED placeholders to byte-exact ROM decodes; `EXPLOSION_DEBRIS` upgraded to ROM-exact vertices with documented authored edge connectivity (§3, §4, §6 rewritten). Scoring (§1/§9) and DIP band (§9) re-confirmed against the ROM disassembly — no value changes. | Real ROM quarry supplied locally (`~/Downloads/va-battlezone/`: `Battlezone` ROM binary, `Battlezone.dis65` SourceGen project, `VisBattlezone.cs` visualizer source) — canonical hosted pages [Battlezone.html](https://6502disassembly.com/va-battlezone/Battlezone.html), [objects.html](https://6502disassembly.com/va-battlezone/objects.html) |
| 2026-08-05 | **§11.1 added (bz5-2):** MAME's `layout/bzone.lay` red/green colour-overlay geometry (RED top..0.2, GREEN 0.2..1.0, multiply) pinned as `MAME_COLOR_SPLIT = 0.2`; our HUD-element colouring vs MAME's full-width multiply gel documented as a deliberate method deviation (boundary fidelity exact). Periscope bezel overlay added (cabinet artwork, not in ROM/MAME). | MAME `~/Projects/mame/src/mame/layout/bzone.lay` (verified: red top..0.2 rgb 1.0,0.125,0.125 / green 0.2..1.0 rgb 0.125,1.0,0.125, blend multiply), `~/Projects/mame/src/mame/atari/bzone.cpp:855` (blue Desert Wars variant, out of scope) |
| 2026-08-05 | **§11.2 added (bz5-4):** enemy-AI cross-check vs MAME. Structural fact recorded (MAME's driver has no AI logic — it executes the ROM; same as §11); two DIP-default spawn thresholds (missile 10K, bonus tanks 15K/100K) CONFIRMED against MAME's driver documentation, upgrading them from one secondary source to two; enemy-action sound-gating (D2 shell / D0 explosion) CONFIRMED against `audio-dispatch.ts`; engine-bit premise correction noted. No divergence → no AI behaviour change (AC3 precondition unmet). Pinned by `tests/core/enemies-mame-crosscheck.test.ts`. | MAME `~/Projects/mame/src/mame/atari/bzone.cpp` (DIP block :55-90, ROM region :711-717), `bzone_a.cpp:1-20` (sound-enable bits) |
| 2026-08-05 | **§11 added (bz5-1):** the `CRACK` cracked-windshield counter — the sibling of `BOUNCE` bz4-1 shipped without — is now wired (set on death, advanced per game frame, cleared at `16*2`) and the overlay is gated on it. AC3 cross-check against the MAME driver: MAME executes the same ROM (no death-specific C); its clock chain times the ~1 s window; exact NMI-rate reconcile deferred to bz5-3. Tank-freeze / progressive-sections / reposition deviation documented as a bz5 follow-up. | `~/Projects/battlezone-source-text/BZONE.MAC` (CRACK :256/:506/:697/:2335/:3362); MAME `~/Projects/mame/src/mame/atari/bzone.{cpp,h}`, `bzone_a.cpp` |
| 2026-08-06 | **§11.3 added (bz5-3):** timebase cross-check — MAME's clock chain confirms the ROM mechanism (game frame = NMI÷16, vector = NMI÷6) but pins the exact NMI at **246.094 Hz** (not the nominal 250), so the executed frame is **≈15.381 Hz** and the clone's 15.625 Hz runs **~1.59% fast**. Ruling (verification-first): keep `GAME_FRAME_HZ = 15.625` (the ROM-documented 64 ms intent), document the delta, no magnitude rewrite; MAME second-source citation added to `src/core/timebase.ts`; §11.2/§11 deferral notes updated to "resolved in §11.3". Pinned by `tests/core/timebase-mame-crosscheck.test.ts`. | MAME `~/Projects/mame/src/mame/atari/bzone.cpp` (`:611` CPU master/8, `:613` NMI CLOCK_3KHZ/12, `:619` vector /12/6), `bzone.h:20-21` (master 12.096 MHz, CLOCK_3KHZ master/4096) |

**Refresh procedure:** see `reference/README.md` (gitignored, checkout-local) for how to
re-pull the quarry if 6502disassembly.com's content changes, or how to re-run the byte
decoder (`reference/decode_rom_tables.py`) against a refreshed ROM quarry. This committed
document is the durable citation record; the quarry itself is not required to reproduce any
of the above.
