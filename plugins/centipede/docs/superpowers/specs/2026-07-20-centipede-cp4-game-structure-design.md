# Centipede cp4 — Game Structure (design)

**Date:** 2026-07-20
**Epic:** cp4 (roadmap row: "Game structure: waves, scoring/BCD thresholds,
bonus lives, high scores + initials, attract mode")
**Parent spec:** `2026-07-18-centipede-clone-design.md`
**Ground truth:** rev-4 `CENTI4.MAC` in the vendored tree
(`reference/atari-source/centipede/revision.v4/`) — the only numbering the
citation gate accepts. `docs/rom-study/` dossier + claims; cite, never
re-derive.

## Why this epic exists

Playtest observation (2026-07-20, user): every wave runs at the same pace. That
is correct detection of a **logged scope fence**, not a bug. cp3-4 wired
`SimState.centis` (the wave's centipede SPEED) and `SimState.centin` (its
LENGTH) far enough to open the flea's spawn gate, but **nothing consumes them as
actual train behaviour**. The march reads a module-private `CENT_SPEED = 2`
(`src/core/centipede.ts:72`) — which happens to equal CENTIS's boot value, so it
looks right on wave 1 and never changes. `createCentipede()` always lays a full
12-segment train. The fence is documented at `centipede.ts:162-168`
("SCOPE FENCE (deviation, logged)") and in cp3-4's `review_findings`
carry-forward. cp4 closes it and builds the rest of the game's outer loop.

## Scope correction (measured against the code, not the roadmap prose)

Three roadmap items are already delivered and are NOT re-filed:

- **Scoring/BCD table.** Each creature's value was transcribed in the story that
  built it: body 10 / head 100 (CT-35/36), spider 300/600/900 by proximity
  (SP-18), flea 200, mushroom destroy 1 / restore 5. `score2Of` / `bcdByte`
  exist (`src/core/score.ts`). What is missing is not the scoring *table* but the
  *bonus-life* consumer of the score — cp4-4.
- **High-score display.** `main.ts:49-50` loads from `@arcade/shared/highscore`;
  `render.ts:231` draws six raw BCD digits. Missing: anything that ever *writes*
  a new high score, and initials entry — cp4-6.
- **The "cap 6" has two faces, both real.** DLIVES caps the HUD at six gun icons
  (`render.ts:217-224`, CENTI4.MAC:920-932). Independently, the bonus-life award
  is hard-capped at six lives (`:1990` `CMP I,6 / BEQ 25$ ;NO MORE LIVES 6 IS
  MAX`). cp4-4 owns the award cap; the display cap already ships.

Genuine gaps: CENTIS speed, CENTIN fragmentation, bonus lives, the
start→game-over→restart loop, high-score persistence + initials, attract mode.
(NOTE 2026-07-21: the **LCOLOR walk** listed here at authoring time was already
shipped end-to-end by **cp2-13** — merged 2026-07-19, the evening before this
spec — so cp4-3 was closed as subsumed, no code. See the Colour finding below.)

## Constant-source findings (read at design time; each story re-verifies)

**Wave progression — CENTPC `:456-554`.** Read in full at design time; three
distinct per-wave effects live in the all-dead-guarded opening block, all keyed
off `CENTIS`:

- **Speed.** `:479-482` — `MOBJDV = CENTIS`; `MOBJDH = ±CENTIS`, sign from
  `FRAME AND 2`. So CENTIS drives BOTH axes. The current hardcoded
  `CENT_SPEED = 2` is exactly CENTIS's boot value for both dh and dv — which is
  why wave 1 looks right and nothing after it changes.
- **Fragmentation, NOT shortening.** `:549-551` sets `DEAD = NCENT`
  unconditionally, so a "short" train still puts 12 objects on screen: `CENTIN`
  connected segments (`:498-524`), then slots `CENTIN..11` filled with **loose
  independent heads** at random columns (`:527-546`). Each loose head costs TWO
  `RNGEN` reads — one for direction sign (`BIT RNGEN` → `COMP`), one for
  `HPOS = RNGEN AND 0F8`. Wave 2 is eleven segments **plus one free-roaming
  head**, not "a shorter train". This is the real difficulty curve and is
  sharper than the carry-forward note's "shorter" framing implied.
- **Colour.** `:461-463` — `LDA LCOLOR / ORA I,80 / STA LCOLOR ;TIME TO CHANGE
  COLORS`, inside the same all-dead guard. A per-wave visual signal. **Already
  shipped by cp2-13** (2026-07-19, "pulled forward from cp4"): `ORA 0x80` sets a
  dirty flag that the IRQ consumes (`CENIR4.MAC:308-323` — `BMI / AND 3F / ADC 3 /
  wrap 42`), walking the `99$` colour table `+3` per cleared wave. The clone models
  this as a pure function of `SimState.wave` (`palette.ts colorIndexForWave =
  ((wave-1)*3) % 42`, claims CL-17..CL-27); `atlas.ts buildAtlas(wave)` +
  `main.ts` rebake apply it. `sim.wave` advances only on the wave-clear re-lay
  (`sim.ts:512`), never on death (`sim.ts:462`) — the ROM's all-dead guard. So the
  cp4-3 story that would have built this was closed as **subsumed** (2026-07-21).

The cadence that walks CENTIS/CENTIN across waves (`stepWaveCadence`) already
ships from cp3-4 and is NOT re-derived here — cp4 makes the train *read* the
values it already computes.

**Bonus lives — `:1968-1995`, `BONUSV :248`.** Award test compares the running
score (`SCORE1:SCORE2`) against the next threshold (`BONUSL:BONUSM`); on crossing
it adds the DIP-selected increment to compute the next threshold, then awards a
life unless already at 6. `BONUSV: .WORD 100,120,150,200 ;*100 PER BONUS LIFE`
selected by `OPTNS` D4-D5 (`:243-250`) → 10,000 / 12,000 / 15,000 / 20,000.
Bonus-life sound `CHAN4` (deferred to cp5). `SimState.lives` already exists.

**Attract mode — ATTRT `:158`.** Real self-playing gameplay, not a static
screen: it steers `PLAYH`, reverses direction at `0x1C`/`0xE4`, fires via
`RSHOT1`, and even reads a tile off the screen (`LDX PLYFLD+200 ;READ A 1 ("A"
IN "ATARI")`). Also draws the copyright message (`CPYRHT` via `MESSAG`) and the
"BONUS LIFE EVERY XXXX" panel (`BONUS :225`), and clears "GAME OVER" every 4
seconds. A story of its own, sequenced last.

**Initials entry — GETINT `:1001`, UPDATE `:2534`.** In the cabinet this is a
trackball-driven initials picker. For a keyboard clone it is a UX *port*, not a
transcription — the one place cp4 legitimately diverges from silicon. Flagged in
the story; the divergence is logged as a deviation.

## Story breakdown (~16 pts)

Sequencing: cp4-1 → cp4-2 → cp4-3 are the wave triad (cp4-1 first — it alone
fixes the flat-pace playtest). cp4-4/5/6 are the game-loop spine, with cp4-5
(game-over) before cp4-6 (save-on-game-over). cp4-7 (attract) last — it replays
gameplay and wants the loop closed. **All parallel-safe against cp3-3
(scorpion):** none of these paths touch SCORP, poison, or the dive, so wave
progression need not wait on the scorpion.

| # | Story | Pts | ROM anchor |
|---|---|---|---|
| cp4-1 | Centipede speed goes live — thread `centis` into the march step + entry direction; retire hardcoded `CENT_SPEED=2` | 2 | CENTPC `:479-482` |
| cp4-2 | Fragmented train — `CENTIN` connected segments + loose extra heads from `RNGEN` | 3 | CENTPC `:527-551` |
| cp4-3 | Per-wave colour walk — `LCOLOR \|= 0x80` on the all-dead re-lay — ~~2~~ **CLOSED subsumed by cp2-13** (2026-07-21) | 0 | CENTPC `:461-463` + `CLRCH` |
| cp4-4 | Bonus lives — threshold crossing, `BONUSV` increment, 6-life cap | 3 | `:1968-1993`, `BONUSV :248` |
| cp4-5 | Game loop — start → game-over → restart; `INIT`/`RESET` reseed | 3 | `INIT :1162`, `:610-624` |
| cp4-6 | High-score persistence + initials entry | 3 | `GETINT :1001`, `UPDATE :2534` |
| cp4-7 | Attract mode — self-playing `ATTRT` demo + copyright / bonus panel | ~2 | `ATTRT :158` |

## Cross-cutting rulings

**DIP options are not modelled.** `OPTNS`/`OPTSW2` (bonus increment, starting
lives `NLIVES` 2-5, unlimited-time bit) have no representation in the sim. Per
cp3's wave-gating ruling, each story hardcodes the ROM default and parameterizes
the input so a future options story can go live without re-transcription.
Defaults: bonus increment = 10,000 (`BONUSV[0]`); starting lives = 3
(the current `STARTING_LIVES`). Filed as an `open-questions.md` entry.

**Core/shell boundary holds.** Speed, fragmentation, bonus lives, and the game
loop are `src/core` (pure, seeded RNG only — no `Date.now`/`Math.random`).
Colour cycling (cp4-3) and initials UI (cp4-6) reach into `src/shell`; those
stories keep the sim change and the render change in clearly separated commits,
matching the rest of the project.

**Citation discipline.** Every transcribed constant carries a radix-cited
comment (CENTI4.MAC inherits `.RADIX 16` — bare literals are hex unless
trailing-period decimal) and a claims entry; `npm test -- citations` stays green.
Line numbers cite the vendored tree only.

**Determinism.** cp4-2's loose-head placement draws from `@arcade/shared/rng`
(seeded by the shell) — two reads per head, in ROM order (direction sign, then
HPOS). A determinism test replays an identical wave from a fixed seed; the purity
guard stays green.

## Demo at epic end

Full loop on 5278, captured from THIS checkout (lsof the port's cwd first, or
serve a spare port — the port-ownership trap applies): attract mode → insert →
wave 1 → visibly faster wave 2 with a loose head and a colour shift → death →
game-over → high-score initials entry → attract mode again.
