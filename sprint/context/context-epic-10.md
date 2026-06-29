# Epic 10 — ROM-accurate fidelity gaps (Tempest vs Tempest source study)

**Repo:** `tempest` · **Priority:** p2 · **Status:** backlog · **Goal:** a faithful port.

## What this epic is

A structured backlog of the gaps between our clone and the authentic 1981 arcade
*Tempest*, surfaced by comparing the extracted source findings against our actual code.

- **Findings source:** `tempest/docs/tempest-1981-source-findings.md` — the 1981-only
  facts captured from *"Tempest vs Tempest: Notes on the Source Code of Two Video Games"*
  (Rob Hogan, 2026; `tempest/docs/TempestVsTempest_release.pdf`). Tempest 2000 / Jaguar
  material was deliberately excluded.
- **Comparison method:** seven read-only agents diffed each documented subsystem against
  `src/core` and `src/shell` (and the Vitest suites), classifying every finding
  Match / Divergence / Missing / N-A with `file:line` evidence. This doc is the
  consolidated result; each story below cites it.
- **Cross-refs:** the disassembly-sourced docs in `tempest/docs/ux/` (geometry, enemy
  roster, POKEY map) agree with these findings where they overlap.

## Headline verdict

The **pure-sim core is largely faithful** — geometry is a verbatim ROM port, the game
loop / state machine / charges / enemy behaviour track the source well, and the POKEY
sound *data model* is re-implemented from ROM. The gaps cluster in **(1) a few
gameplay-rule divergences** (superzapper), **(2) missing or impoverished spectacle**
(starfield/warp, explosions, title rainbow, colors, banners), **(3) audio cut-in/sustain
behaviour** (canned one-shots vs live POKEY channels), **(4) two deep-fidelity stretches**
(perspective projection, vector font), and **(5) an entirely missing attract demo AI**.

## Subsystem scorecard

| Subsystem | Verdict | Notes |
|---|---|---|
| Game loop / state machine | ✅ Faithful | 60 Hz fixed step; authentic PLAY order; PAUSE state absent (minor) |
| Level geometry / wells | ✅ Faithful | Verbatim ROM port incl. HEART well at level 12; 16-lane wrap |
| Spikes | ✅ Mostly | Growth/tip/scoring/warp-crash match; **color wrong** (purple, should be green) |
| Player charges / firing | ✅ Mostly | 8-cap, lane/depth, held-fire autofire all authentic; **ammo color missing** |
| Enemies (flipper/tanker/carriers) | ✅ Mostly | Behaviour matches; typed fields vs packed `INVAC2`; **tanker color wrong** (green, should be purple) |
| Superzapper | ⚠️ Partial | 2/level + 1-kill + declaw ✅; **kills tankers, ignores enemy bolts, no timing window** |
| Warp (mechanic) | ✅ Realized | Entry→dive→arrival wired & tested end-to-end |
| Warp (spectacle) | ❌ Thin | No starfield; one-shot audio; FX on arrival not entry |
| Starfield | ❌ Missing | 8-plane blue dive absent (dive is spoke-streaks) |
| Explosions / death splat | ⚠️ Divergent | Random particles vs 16-spoke star; no splat color-cycling |
| Title logo | ❌ Missing | Static title vs 19-pass approaching rainbow |
| AVG vector model / phosphor | ✅ Faithful | Glowing vector chains + EMA afterglow |
| Audio data model | ✅ Faithful | 6-byte envelope + streaming re-implemented; byte-exact table; 6 cues wired |
| Audio runtime | ⚠️ Canned | One-shot `.wav`, no voice-stealing/sustain (see §Audio) |
| Vector font / messages | ⚠️ Approx | TTF webfont vs VGMSGA strokes; wrong banner colors; missing banners |
| Attract demo AI | ❌ Missing | No self-play; attract is a static screen |
| Perspective projection | ⚠️ Affine | Linear depth lerp vs true perspective divide |

## Finding → story map

| Story | Pts | Pri | Cluster | Covers |
|---|---|---|---|---|
| 10-1 | 2 | p1 | Gameplay | Superzapper first press: spare tankers + clear enemy bolts |
| 10-2 | 3 | p2 | Gameplay | Superzapper TIMAX 13/5 timing window + per-frame cadence + web flash |
| 10-3 | 5 | p2 | Gameplay | Attract-mode self-play demo AI (auto-move + anticipatory fire) |
| 10-4 | 3 | p2 | Visuals | Warp spectacle: 8-plane starfield + entry FX + render-dispatch test |
| 10-5 | 3 | p2 | Visuals | 16-spoke enemy explosion + color-cycling player-death splat |
| 10-6 | 3 | p3 | Visuals | Title-logo approaching rainbow (19 passes) |
| 10-7 | 1 | p2 | Visuals | Color fixes: spikes green, tanker purple, banner colors |
| 10-8 | 2 | p3 | Visuals | Ammo-count bullet color (yellow/blue/red) |
| 10-9 | 3 | p3 | Visuals | Missing banners: SUPERZAPPER RECHARGE, RATE YOURSELF/rank, bonus |
| 10-10 | 3 | p2 | Audio | Voice-stealing playback (per-channel cut-in) |
| 10-11 | 3 | p2 | Audio | Sustained/looping sounds + wire unwired bakes + warp-audio duration |
| 10-12 | 5 | p3 | Stretch | True perspective projection |
| 10-13 | 5 | p3 | Stretch | Authentic VGMSGA stroke-vector font |

**Total: 41 points.** Suggested order: 10-1 → 10-7 (quick, high-visibility) → 10-4/10-5
→ 10-2/10-10/10-11 → 10-3 → 10-6/10-8/10-9 → 10-12/10-13 (stretch, sequence last).

---

## Per-subsystem detail

### Game loop & state machine — ✅ faithful (no story)
- 60 Hz fixed step (`shell/loop.ts:7`); pure dt-driven core.
- PLAY order player→fire→superzap→enemies→enemy-fire→collisions→analyze matches
  (`core/sim.ts:575-589`). Bullet-vs-enemy step order inverted vs ROM but provably inert
  (collisions resolve after both move).
- State machine covers the ROUTAD playable subset (`core/state.ts:8`). **PAUSE** state
  (ROUTAD idx 5) absent — noted, not storied (cosmetic for a clone).

### Superzapper — ⚠️ → stories 10-1, 10-2
- ✅ `CSUMAX=2` per-level with rearm (`core/state.ts:13`, `sim.ts:361`); second press = 1
  kill (`sim.ts:464-474`); zap-kill never releases tanker cargo (declaw equivalent,
  `sim.ts:453-462`).
- ⚠️ **First press kills tankers** — should spare them (`sim.ts:455-460`). → 10-1
- ⚠️ **First press never clears `s.enemyBullets`** — in-flight bolts survive the zap and
  can still kill the player (`sim.ts:453-462`). → 10-1
- ❌ **No `TIMAX` timing window** — `stepZap` resolves instantly; ROM runs the first zap
  ~13 frames, second ~5, killing on a per-frame cadence (`sim.ts:444-475`). → 10-2
- ❌ **No web color flash** during the zap (`DSPWEL` flashes `QFRAME&7`). → 10-2

### Attract demo AI — ❌ → story 10-3
- Attract case only waits for `start` (`sim.ts:552-559`); render draws a static title +
  hi-score table. No self-play. ROM: 1 life, random level 1-8, `AUTOCU` lane-seek toward
  the most-advanced enemy, `FIREPC` anticipatory fire within 2 lanes. Also unblocks the
  lobby attract loop.

### Geometry / wells — ✅ faithful (no story)
- Verbatim ROM port: 16-vertex X/Y tables (`core/geometry.ts:94-131`), open/closed pattern
  (`:134-136`), level-remap cycle (`:139-141`), HEART well byte-exact at level 12, 16-lane
  `(i+1)&$0F` wrap (`:36-41`). Asserted by `tests/core/geometry.authentic.test.ts`.

### Spikes — ✅ mostly → color in 10-7
- ✅ Grow from far end (`sim.ts:172`), per-lane height, white tip dot (`render.ts:193-198`),
  far-point midpoint (`geometry.ts:43-47`), shoot-to-shorten + score (`sim.ts:329-340`),
  lethal-on-descent warp crash (`sim.ts:519-547`), spiker oscillation/hop (`spiker.ts`,
  `sim.ts:149-171`).
- ⚠️ **Spikes render purple** `#9b30ff` (`render.ts:183-184`) — ROM is **green** `$6805`. → 10-7
- *(Deliberate: `SPIKE_MAX_DEPTH=0.75` capped below the spiker turnaround per story 6-15.)*

### Enemies — ✅ mostly → color in 10-7
- ✅ Carrier cargo (3 types, `state.ts:36,58`), release-on-death (`tanker.ts:18-24`), rim
  split (`sim.ts:342-355`), spiker→flipper-tanker conversion (`sim.ts:150-156`), flipper
  L1/climb/flip/kill, fuseball never-fires, pulsar L60+.
- ⚠️ Representational: movement/fire/carrier encoded as typed per-kind fields rather than
  the packed `INVAC2` byte + `$03`/`$FC` masks (works; no reusable "declaw" op).
- ⚠️ **Tanker renders green** (`shell/glyphs.ts:90`) — ROM `GENTNK` is **purple**. → 10-7
  - 👉 **Note the swap:** spikes are purple (should be green) and tankers are green (should
    be purple) — the two colors appear transposed. 10-7 fixes both.
- *(Deliberate, excluded: flipper-carrier always fires = rev-3 decision 2026-06-27;
  flip-direction coin-flip = story 6-14.)*

### Player charges / ship — ✅ mostly → 10-8
- ✅ 8-charge cap (`rules.ts` `MAX_BULLETS=8`, `sim.ts:87`), lane/depth travel, same-frame
  collision; **held-fire autofire capped at 8 is authentic** (`shell/input.ts:80`, story 6-2).
- ❌ **Ammo-count bullet color missing** — bullets always white (`render.ts:204-215`,
  `glyphs.ts:262-267`); ROM tints by `CHACOU` (<6 yellow / 6-7 blue / 8 red). → 10-8
- ➖ Live claw is articulated legs (`render.ts:307-383`); the 8-orientation `playerClawGlyph`
  (`glyphs.ts:246-250`) is a single rotated shape and is **dead code** (cosmetic; not storied).
- ⚠️ Minor: no explicit COLCHK at spawn depth — same-frame `resolveBulletHits` covers it
  (`sim.ts:578` vs `:582`). Not storied (negligible).

### Warp — mechanic ✅, spectacle ❌ → story 10-4 (+ audio in 10-11)
- ✅ **Realized end-to-end:** entry (`sim.ts:483`, reachable), `stepWarp` each frame
  (`sim.ts:591-593`), accelerating ramp (`rules.ts:39-46`, ~0.75s L1 → ~0.55s L12+),
  AVOID-SPIKES rim-hold, lethal spikes (`sim.ts:519-547`), `drawWarp` invoked
  (`render.ts:793-795`), completion via `advanceLevel`. Covered by real end-to-end tests.
- ❌ **Spectacle thin** (why it *feels* unrealized): no starfield (dive is spoke-streaks
  `render.ts:682-750`); single one-shot `warp.wav` on entry (no sustained dive cue); the
  white flash fires on *arrival* (`fx.ts:108`) not on warp *entry*. → 10-4 (visual/FX),
  10-11 (audio duration). The one untested seam is the render dispatch to `drawWarp` → 10-4
  adds that test.

### Starfield — ❌ → story 10-4
- No implementation. ROM (`star planes`): `NPLANE=8`, screen-center origin, spawn Z `$F0`,
  step −7/frame, spawn-next `$D5`, retire `$10`, blue dots, 4 reused star pictures.

### Explosions / death splat — ⚠️ → story 10-5
- Enemy death: 12 random particles (`fx.ts:46-77`) vs ROM 4-frame 16-spoke star doubling
  (scale 1→2→4→8, brightness 7 then 14).
- Player death: two fixed-color bursts (`fx.ts:80-89`) vs ROM concentric jagged star that
  grows then shrinks with white/red/yellow `ROTCOL` color-cycling.

### Title logo — ❌ → story 10-6
- Static glow title (`render.ts:515-535`) vs ROM `SCARNG`/`LOGPRO`: ~19 passes far→near,
  per-pass color (White/Yellow/Magenta/Red/Cyan/Green), advancing toward the viewer.

### AVG vector model / phosphor — ✅ faithful (no story)
- Glowing relative-vector chains (`render.ts:40-180`); phosphor EMA afterglow
  (`shell/phosphor.ts`, `PHOSPHOR_DECAY=0.55`). Conceptually faithful to Color-XY.

### Audio — data model ✅, runtime ⚠️ → stories 10-10, 10-11
- ✅ **Data model faithful:** the 6-byte envelope record and multi-note streaming engine
  are re-implemented from ROM (`tools/pokey-bake/`), the SFX table is byte-exact to
  `docs/ux/2026-06-28-pokey-sfx-rom-map.md`, and 6 cues are authentic bakes wired to the
  right events (fire/enemy-fire/enemy-death/player-death/segment-tick/warp, `audio.ts:29-39`).
- ⚠️ **Runtime is canned one-shots.** `play()` spawns a fresh `BufferSource` per call with
  no stop/loop/channel tracking (`audio.ts:111-123`; master gain 0.4 to mask overlap). The
  material differences from live POKEY are about **how sounds cut in and sustain**, not the
  timbre of discrete one-shots:
  - **Voice-stealing / cut-in:** real POKEY has 4 channels; a new sound *replaces* the one
    on its channel. We layer unboundedly → rapid fire and Superzapper mass-death pile up
    into a chord instead of a single channel re-attacking. → **10-10**
  - **Sustain / looping:** sounds like the pulsar hum must play *while a pulsar is alive*;
    a one-shot can't. This is exactly why `pulsar_hum` is baked but **unwired**. → **10-11**
  - **Duration match:** the warp/zoom sound should last the dive; a fixed clip desyncs. → **10-11**
  - *Discrete one-shots (the 6 wired cues) are sonically fine as bakes — only their
    interaction and the sustained cases are wrong.*
- ❌ **Unwired authentic bakes:** `spike_shot` (ROM cc51), `extra_life`, `pulsar_hum` are
  baked to disk but absent from the runtime manifest / have no core event. → 10-11
- ⚠️ Non-authentic community rips: superzapper, claw-grab, warp-spike-crash, player-spawn
  (already commented as such; not storied — no clean ROM record catalogued).

### Vector font / messages — ⚠️ → stories 10-7 (colors), 10-9 (banners)
- ⚠️ Text uses a TTF webfont (`shell/font.ts:16-26`), not the VGMSGA `CHAR.x` stroke
  alphabet. → addressed by the stretch story 10-13.
- ⚠️ **Banner colors wrong:** GAME OVER should be green (`render.ts:661`), AVOID SPIKES
  white (`:827`), HIGH SCORES red (`:472`), PRESS START red (`:529`). → 10-7
- ❌ **Missing banners:** SUPERZAPPER RECHARGE, RATE YOURSELF / RANK / NOVICE / EXPERT,
  BONUS / TIME / HOLE / APPROACH. → 10-9
- ➖ English-only (no EN/FR/DE/ES tables) — acceptable for a clone; not storied.

### Perspective projection — ⚠️ → story 10-12 (stretch)
- `geometry.project` (`:55-59`) is a linear far→near lerp (fixed `FAR_RATIO=0.2`), not a
  true perspective divide; objects track depth at constant screen-velocity instead of
  accelerating toward the rim. Pure-sim unaffected (collision is lane+depth); feel changes.

---

## Explicitly excluded (deliberate prior deviations — NOT bugs)

- **Flipper-carrier tanker always fires** — matches literal rev-3 ROM; user decision
  2026-06-27 (rev-3 wins over the book table). See `docs/ux/2026-06-27-enemy-roster-rom-extract.md`.
- **Flipper flip direction = coin-flip** — deferred per story 6-14.
- **`SPIKE_MAX_DEPTH=0.75`** capped below the spiker turnaround — intentional per story 6-15.
- **Held-fire autofire (cap-gated)** — this *is* the authentic behaviour (story 6-2).
- **Canned community-rip SFX for sounds with no clean ROM record** — pragmatic.
- **PAUSE state, localization, per-bullet collision counter** — out of scope for the clone.
