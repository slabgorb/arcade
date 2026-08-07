# pac-man — glossary (per-symbol decoded dictionary)

Each entry: the symbol, its byte-level citation `pacman.asm:<addr>`, the decoded
value, and the Pac-Man Dossier reference for meaning. The decoded value of a
scoring entry is the **BCD, little-endian, ×10** rule from `brief.md` (raw word →
little-endian hex digits read as decimal → ×10). Every citation below is
byte-verified by the gate and backed by a claim in `claims/*.json`.

## Scoring table (`pacman.asm:2b17`+)

The `SCORING TABLE` is a run of little-endian BCD ×10 words.

| Symbol            | Citation            | Raw word | Decoded | Meaning (Dossier)                          |
|-------------------|---------------------|----------|---------|--------------------------------------------|
| `SCORE_DOT`       | `pacman.asm:2b17`   | `0100`   | **10**  | Dot. Dossier ch.2 *The Basics*.            |
| `SCORE_ENERGIZER` | `pacman.asm:2b19`   | `0500`   | **50**  | Energizer / power pellet. ch.2 *The Basics*. |
| `SCORE_GHOST_1`   | `pacman.asm:2b1b`   | `2000`   | **200** | 1st ghost in an energizer chain. ch.2.     |
| `SCORE_GHOST_2`   | `pacman.asm:2b1d`   | `4000`   | **400** | 2nd ghost (doubles). ch.2 *The Basics*.    |
| `SCORE_GHOST_3`   | `pacman.asm:2b1f`   | `8000`   | **800** | 3rd ghost. ch.2 *The Basics*.              |
| `SCORE_GHOST_4`   | `pacman.asm:2b21`   | `6001`   | **1600**| 4th ghost (LE `0x0160`). ch.2 *The Basics*.|

The chain resets to 200 with each energizer: 200 → 400 → 800 → 1600 (Dossier
ch.2, "twice as many points as the one before it").

## Ghost name / character table (`pacman.asm:36bf`+)

The `CHARACTER / NICKNAME` table holds pointers to each ghost's name text. The four
canonical nicknames, in table order, with their Dossier characters (ch.4 *Meet The
Ghosts*):

| Symbol   | Citation           | Name      | Character (Dossier ch.4) |
|----------|--------------------|-----------|--------------------------|
| `BLINKY` | `pacman.asm:36bf`  | "BLINKY"  | red — *shadow*           |
| `PINKY`  | `pacman.asm:36c3`  | "PINKY"   | pink — *speedy*          |
| `INKY`   | `pacman.asm:3703`  | "INKY"    | light-blue — *bashful*   |
| `CLYDE`  | `pacman.asm:3707`  | "CLYDE"   | orange — *pokey*         |

## Lives (`pacman.asm:4e6f`)

| Symbol           | Citation          | Value         | Meaning                                                    |
|------------------|-------------------|---------------|------------------------------------------------------------|
| `LIVES_PER_GAME` | `pacman.asm:4e6f` | 3 (default)   | RAM byte holding lives per game, set from the lives DIP switch; shipped default 3. Not a ROM literal — the RAM-map documentation line is the citation. |

The Dossier does not state the starting-lives default in a headed section; the
value is the machine's DIP default (3), and the citation pins the RAM slot the game
reads and writes.

## Speeds (Pac-Man Dossier Table A.1; no clean `pacman.asm:<addr>` literal)

Pac-Man's per-level speed is a PERCENTAGE of a 1px/frame reference rate (the
cabinet runs at 60 Hz, so 100% = 60px/s). The Pac-Man Dossier's Table A.1
gives the level-1 figures used by `src/core/pacman.ts`:

| Symbol                     | Value | Meaning                                              |
|----------------------------|-------|-------------------------------------------------------|
| `PACMAN_SPEED_PCT_LEVEL_1` | 80%   | Pac-Man's normal (non-eating) speed at level 1.       |
| `EAT_PAUSE_DOT`            | 1 frame | Pac-Man freezes for 1 frame eating a regular dot ("stops moving for one frame (1/60th of a second), slowing his progress by roughly ten percent"). |
| `EAT_PAUSE_ENERGIZER`      | 3 frames | Pac-Man freezes for 3 frames eating an energizer ("Eating an energizer dot causes Pac-Man to stop moving for three frames."). |

**Why these have no `pacman.asm:<addr>` citation, stated explicitly rather
than hidden:** the vendored disassembly (`reference/source/pacman.asm`) is
commented only in its boot sequence, RAM-map header, scoring/fruit/text-table
region (`0000`-`2c60`ish) and message-pointer table (`36a5`+) — every other
region, including whatever routine realizes speed percentages as a per-frame
move/skip decision and whatever counter freezes Pac-Man on an eat, is bare,
unlabelled Z80 mnemonics with no symbol names to `grep` for ("speed",
"pause", "elroy", "cruise", "fright", "dot count" all return zero hits
outside the regions above). Per `brief.md`'s citation discipline, a value
with no clean stored literal to point to is recorded here as
Dossier-sourced and left uncited, rather than inventing an address — the
same policy `src/core/maze.ts` already applies to the wall/dot layout table.
`src/core/actor.ts`'s `speedPattern()` (the function that turns a percentage
into a repeating move/skip boolean cycle) is therefore a SELF-DERIVED integer
algorithm, not a transcription of the ROM's actual bit pattern (which is not
recoverable from this vendored source, and was not read from
`shaunlebron/pacman` either — GPL firewall, `brief.md`).

## Movement (glossary-decoded, no ROM-address citation for the same reason)

- **Grid alignment.** An actor occupies a pixel position; it is "at a tile
  centre" only when both pixel coordinates are exact multiples of the 8px
  tile size (`src/core/actor.ts`'s `TILE_PX`). Cornering and eating can only
  happen at a tile centre — mid-tile, Pac-Man is committed to its current
  direction.
- **Cornering (input latching).** The most recently held direction is
  latched as `pending`. At each tile centre, `pending` is tried: if the tile
  it leads to is walkable, it becomes the new `dir`; otherwise it stays
  latched, unconsumed, and is retried at the next tile centre reached — so a
  turn queued early into a wall opens automatically as soon as the corridor
  allows it, with no separate re-press required.
- **Eat-pause.** Landing on a not-yet-eaten dot or energizer tile freezes
  Pac-Man (no movement, no speed-pattern advance) for `EAT_PAUSE_DOT` or
  `EAT_PAUSE_ENERGIZER` frames respectively; re-crossing an already-eaten
  tile never re-triggers it.

## Maze (`pacman.asm:20e6`)

The maze is 28x36 tiles (8px tiles -> the cabinet's 224x288 logical resolution,
Dossier ch.3 "The Maze"). The wall/dot/energizer LAYOUT itself is graphics-ROM
tile-init data, not program-ROM literals — it is not vendored in this
disassembly (0000-3fff is the 16 KB *program* ROM only) and so is not
byte-cited tile-by-tile; `src/core/maze.ts` states that explicitly and encodes
the layout as a row-string table instead (a faithful-style reconstruction of
the well-known arcade shape, not a line-for-line ROM transcription).

One real number anchors the pellet count. The fruit-bonus-threshold routine
loads the literal `#f4` = 244 at `pacman.asm:20e6` (`ld a,#f4`) and subtracts
the running dot-eaten count from it — the Dossier's "first fruit appears after
70 dots eaten, second after 170" logic reads as `244-70=174` and `244-170=74`
against that same constant. 244 is the maze's TOTAL collectible count: 240
regular dots + 4 energizers.

| Symbol           | Citation           | Raw byte | Decoded | Meaning                                            |
|------------------|---------------------|----------|---------|-----------------------------------------------------|
| `TOTAL_PELLETS`  | `pacman.asm:20e6`  | `f4`     | **244** | Total collectible pellets (240 dots + 4 energizers), the fruit-threshold subtrahend. Dossier ch.3 "The Maze" / ch.5 "Fruit". |

`DOT_COUNT` (the regular, non-energizer dot count the maze model exports) is
**derived**, not a second independent literal: `TOTAL_PELLETS - ENERGIZER_TILES.length`
= `244 - 4` = **240**. `src/core/maze.ts` cross-checks this derivation against
its own row table's actual dot count at module load, so the two can never
silently disagree. The 28x36 grid dimensions and the individual wall/dot/
energizer placements have no `pacman.asm:<addr>` citation — they are the
maze's tile-graphics shape, not a program-ROM constant, and are recorded here
as an explicit, deliberate exception to the citation rule rather than a gap.

## Ghost movement (pm1-5)

At each tile centre (`src/core/actor.ts`'s grid-alignment rule, reused
verbatim by `src/core/ghost.ts`) a ghost picks the walkable, non-reversing
candidate direction whose destination tile is closest — straight-line,
squared-Euclidean, no `sqrt` — to its current target tile. This targeting
metric and the "never reverse" rule (a ghost may only reverse when a
mode-change signal — scatter&harr;chase, Task 7 — forces it for exactly one
step) are Pac-Man Dossier ch.4 *Meet The Ghosts* / "Ghost Movement" facts with
no isolable `pacman.asm:<addr>` literal in this vendored disassembly: the
routine that walks the four candidate directions and compares squared
distances is bare, unlabelled Z80 in the actor-update region (the `2000`+
landmark cited in the task brief holds the ghost-house release gates below,
not the targeting arithmetic itself) — `grep`-ing for "target", "distance",
"reverse" returns zero hits outside the commented regions `brief.md` already
enumerates. Recorded here as Dossier-sourced and left uncited, the same
policy `src/core/maze.ts` and this file's own §Speeds section already apply.

**Tie-break order.** When two or more candidate directions tie on squared
distance, the ROM's well-documented tile-preference order — **up, then left,
then down, then right** — decides. Same citation status as above: Dossier-
sourced, no isolable ROM literal, recorded honestly rather than invented.

**Red-zone tiles (no upward turn).** The Dossier documents specific maze
intersections where a ghost may never choose "up" as its turn, even when up
is the closest candidate to its target — the classic anti-shortcut rule that
keeps a ghost from cutting straight up the narrow shafts flanking the ghost
house instead of going around. Because `src/core/maze.ts`'s row table is (per
that file's own header) a faithful-style *reconstruction* of the arcade maze
shape and not a tile-by-tile ROM transcription, this port locates the rule on
the two tiles this reconstruction unambiguously has an analogue for: the feet
of the two vertical shafts immediately flanking the house, `{x:12,y:14}` and
`{x:15,y:14}` (`src/core/ghost.ts`'s `RED_ZONE_TILES`) — at each, 'up' is
genuinely walkable (unlike the tiles directly over the gate itself, which are
walled above), so the rule has real work to do. The Dossier documents
additional red-zone tiles elsewhere in the original maze (near the upper
tunnel corners); this reconstruction has no byte-cited, tile-identical
analogue for those, so implementing them would be inventing coordinates
rather than decoding them, and they are deliberately NOT implemented — an
honest gap, not a silent one.

## Ghost house (pm1-5)

Blinky starts outside the house and is never gated by a release counter —
Dossier ch.4. Pinky, Inky and Clyde are held in the house and released when a
dot-eaten counter reaches a per-ghost threshold. The vendored disassembly's
`2000`+ actor-update region holds three near-identical gate blocks in program
order (addresses 2069-208b, 208c-20ae, 20af-20d6), each guarded
by the "use global counter" flag at `(#4e12)` (set only after a life is lost
mid-level — the Dossier's "global dot counter" mode) and comparing the
running global dot counter `(#4d9f)` against a literal threshold before
setting that block's release flag (`(#4da1)`, `(#4da2)`, `(#4da3)`
respectively — presumed Pinky/Inky/Clyde by block order, since the bare
disassembly carries no ghost-name label at any of these addresses):

| Symbol                    | Citation           | Raw byte | Decoded | Ghost (by Dossier value match) |
|---------------------------|---------------------|----------|---------|---------------------------------|
| `GLOBAL_DOT_LIMIT_PINKY`  | `pacman.asm:2078`  | `07`     | **7**   | Pinky |
| `GLOBAL_DOT_LIMIT_INKY`   | `pacman.asm:209b`  | `11`     | **17**  | Inky |
| `GLOBAL_DOT_LIMIT_CLYDE`  | `pacman.asm:20be`  | `20`     | **32**  | Clyde |

These three raw bytes (7, 17 hex-11, 32 hex-20) are BYTE-VERIFIED ROM
literals — real anchors, not Dossier-only — and their decoded values match
the Pac-Man Dossier's documented global-dot-counter thresholds exactly, which
is the basis for identifying which block belongs to which ghost (the ROM
itself never names them here). See `docs/rom-study/claims/house.json`
(claims `GHOST-HOUSE-GLOBAL-PINKY/INKY/CLYDE`).

**What is NOT byte-cited.** Each gate block also has a "personal counter"
branch (taken when `(#4e12)` is zero, i.e. normal mid-level play, not the
post-death global-counter mode) that compares a per-ghost RAM byte against a
level-indexed table entry (`(#4db8)`/`(#4db9)`/`(#4dba)` read through a
pointer, not a plain `cp #nn` literal) — this is DATA, not a single citable
instruction operand, so the actual per-level personal thresholds (the
Dossier's well-known level-1 figures: Pinky 0, Inky 30, Clyde 60) are
recorded here as Dossier-sourced and left uncited, per this file's existing
policy for values with no isolable literal. `src/core/house.ts`'s
`PERSONAL_DOT_LIMIT` table carries these Dossier figures with that same
honest-uncited status.

## Ghost AI — the four personalities (pm1-6)

Each ghost's per-frame TARGET tile (what `src/core/ghost.ts`'s `stepGhost`
steers toward) is chosen by its own routine. `src/core/targeting.ts`'s
`targetTile(id, state)` reproduces all four. The Pac-Man Dossier ch.4 *Meet The
Ghosts* is the decoder of what each routine *does*; the routine addresses below
are the byte-level anchors.

| Ghost  | Routine            | Target rule (Dossier ch.4)                                        |
|--------|--------------------|------------------------------------------------------------------|
| Blinky | `pacman.asm:2758`  | Pac-Man's current tile (direct chase; loads Pac at `(#4d39)`).    |
| Pinky  | `pacman.asm:278e`  | 4 tiles ahead of Pac in his facing direction (up-overflow below). |
| Inky   | `pacman.asm:27cb`  | `2·intermediate − Blinky`, intermediate = 2 ahead of Pac (up-overflow too). |
| Clyde  | `pacman.asm:2813`  | Pac's tile when ≥8 tiles away, else his own scatter corner.       |

**The offsets are shift-adds, not stored literals.** Pinky's "×4" is two
`add hl,hl` (2795, 2796) on Pac-Man's direction word; Inky's "×2" is one
`add hl,hl` (27d6) and its vector-doubling is per-byte `add a,a ; sub`
(27d8-27df). There is no `#04`/`#02` operand to cite — the routines are anchored
by ADDRESS, and the multipliers are documented here as emergent arithmetic, not
invented literal addresses (`brief.md` citation discipline). Claims
`TARGET-BLINKY-ROUTINE` / `TARGET-PINKY-ROUTINE` / `TARGET-INKY-ROUTINE` /
`TARGET-CLYDE-ROUTINE` in `claims/targeting.json` pin these routine anchors.

**The up-overflow (the mandatory 8-bit bug).** When Pac-Man faces **up**, both
Pinky's 4-ahead and Inky's 2-ahead intermediate land N up **AND** N left — the
original overflow, where the y-offset bleeds into the x byte during the
shift-add on the packed direction word. It is an EMERGENT code behaviour (a
genuine bug), not a stored literal, so it has no isolable `pacman.asm:<addr>`
to cite — it is anchored by the routine addresses (`278e`, `27cb`) above and
documented here honestly. `targeting.ts`'s `aheadOfPac` reproduces it directly
(returns `{x: px − n, y: py − n}` for up) — never "fixed". Cross-checked for
decoding only against the GPL `shaunlebron/pacman` oracle (`brief.md` firewall):
no code, table, or structure was copied.

**Clyde's 8-tile flip — the one real literal.** Clyde's routine computes the
SQUARED Euclidean distance Pac↔Clyde (`#29ea`: `dx²+dy²`) and compares it against
the literal `#0040` = 64 = 8² at `pacman.asm:281e` via `sbc hl,#0040 ; jp c`.
The carry (→ scatter) fires ONLY on a borrow, i.e. distance² **strictly less
than** 64, so a distance of exactly 8 tiles (`dist²==64`) **chases** — the ROM's
strict boundary, transcribed exactly rather than rounded to the prose "eight
tiles". This is the single genuine numeric literal among the four routines;
claim `TARGET-CLYDE-RADIUS` pins it and `CLYDE_CHASE_MIN_DISTSQ` = 64 carries it.

**Scatter corners.** Each ghost's fixed scatter-mode home target (and Clyde's
close-range fallback): Blinky top-right `{25,0}`, Pinky top-left `{2,0}`, Inky
bottom-right `{27,35}`, Clyde bottom-left `{0,35}`, in this port's 28×36 grid.
The ROM stores per-ghost scatter targets as the immediate words loaded before
`call #2966` in each scatter branch (Pinky `ld de,#391d` @ 2781, Inky
`ld de,#2040` @ 27be, Clyde `ld de,#3b40` @ 2806), but those immediates are
packed in the ROM's internal ROTATED tile-coordinate frame — which this maze, a
faithful-style RECONSTRUCTION (`src/core/maze.ts`) rather than a byte-identical
tile-RAM transcription, deliberately does not replicate. Mapping them onto this
grid would be inventing a coordinate transform, so the corner tiles are
Dossier-DECODED and left uncited, exactly the policy the maze layout already
follows. `SCATTER_CORNER` in `targeting.ts` carries them with that honest status.

## Modes — scatter / chase / frightened (pm1-7)

`src/core/mode.ts`'s `stepMode` is the scatter/chase/frightened state machine.
The sim runs at **60 Hz**, so every Dossier "second" below is **× 60 frames**
(documented in `mode.ts` as `SECONDS = 60`).

**Scatter/chase timer table.** A ghost alternates scatter and chase for a
fixed, level-dependent schedule, then chases permanently. The Pac-Man Dossier
ch.4 *Chase, Scatter, and Frightened* gives the level-1 phases used by the
tests:

| Phase | Mode    | Duration | Frames |
|-------|---------|----------|--------|
| 0     | scatter | 7 s      | 420    |
| 1     | chase   | 20 s     | 1200   |
| 2     | scatter | 7 s      | 420    |
| 3     | chase   | 20 s     | 1200   |
| 4     | scatter | 5 s      | 300    |
| 5     | chase   | 20 s     | 1200   |
| 6     | scatter | 5 s      | 300    |
| 7     | chase   | ∞        | —      |

**Frightened.** Eating an energizer drops every ghost into frightened mode for
a level-dependent time (level 1 = **6 s** = 360 frames), during which the
scatter/chase clock is **paused** and resumes untouched afterward. As it wears
off the ghosts **flash** a Dossier-documented number of times (level 1 =
**5**, `FRIGHT_FLASHES`); the exact per-frame flash cadence and start-time are a
rendering detail decoded in the shell (Task 8), not pinned here. From level 19
on, frightened time is zero.

**Reverse-on-mode-change.** A ghost's sole exception to "never reverse"
(§Ghost movement) is a mode change: `reverseSignal` fires on **each
scatter↔chase transition** and on **frightened ENTRY** (the moment an energizer
is eaten), but **not** on frightened exit — Dossier ch.4 ("the only time ghosts
reverse … a mode switch, or Pac-Man eats an energizer"). Task 8 wires this
one-frame signal into every ghost's `GhostStepState.forceReverse` seam.

**Frightened random turn.** A frightened ghost turns at random. `mode.ts`'s
`frightenedTurn` draws from the seeded `@shared/rng` carried in `ModeState`
(`createRng`/`nextInt`), never `Math.random` — deterministic for a fixed seed
(§core purity).

**Citation status.** The scatter/chase durations, the frightened time and the
flash count live in ROM as **bare, unlabelled level-indexed data tables**:
`grep`-ing the vendored disassembly for `scatter`/`chase`/`fright`/`elroy`
returns **zero** hits (the source is commented only in its boot / RAM-map /
scoring-text / message-table regions, as §Speeds already documents). There is
no isolable `pacman.asm:<addr>` literal to point at, so these values are
recorded honestly as **Dossier-decoded and left uncited**, the same policy
§Speeds, §Ghost movement and §Ghost house already apply. Only Cruise Elroy
below has a real, decodable routine to anchor.

## Cruise Elroy (`pacman.asm:20d7`)

When enough dots have been eaten, Blinky speeds up — "Cruise Elroy" — in two
stages. Unlike the mode tables above, this **is** a decodable routine at
`pacman.asm:20d7`. `src/core/mode.ts`'s `elroyStage(dotsRemaining, level)`
reproduces it.

The routine (20d7-2107):

1. Loads the Clyde-released flag at `(#4da3)` and returns if it is zero
   (`pacman.asm:20d7` → `and a; ret z`): **Elroy is suppressed until Clyde has
   left the house** (Dossier ch.4). That house-state gate belongs to the caller
   (Task 8 / the ghost speed logic), not to the pure dots→stage function.
2. Computes **dots remaining** = `244 − dots-eaten`, reusing `TOTAL_PELLETS`
   `#f4` at `pacman.asm:20e6` (§Maze) as the subtrahend.
3. Compares dots-remaining against the **Elroy 1** threshold read from RAM slot
   `(#4dbb)` at `pacman.asm:20ea`, then against the **Elroy 2** threshold from
   `(#4dbc)` at `pacman.asm:20fd`. The compare is `sub b; ret c`, so a stage
   engages when **dots-remaining ≤ threshold** (the borrow does not fire at
   equality) — an inclusive boundary, transcribed exactly.

| Symbol                   | Citation           | Value  | Meaning                                                       |
|--------------------------|--------------------|--------|---------------------------------------------------------------|
| `ELROY_CLYDE_GATE`       | `pacman.asm:20d7`  | `4da3` | Elroy suppressed until Clyde leaves the house (Clyde flag).   |
| `ELROY1_THRESHOLD_SLOT`  | `pacman.asm:20ea`  | `4dbb` | RAM slot the Elroy 1 dots-remaining threshold is read from.   |
| `ELROY2_THRESHOLD_SLOT`  | `pacman.asm:20fd`  | `4dbc` | RAM slot the Elroy 2 dots-remaining threshold is read from.   |

**What is NOT byte-cited.** The threshold VALUES themselves (level 1: Elroy 1 at
**20** dots remaining, Elroy 2 at **10**) are not `cp #nn` operands — `(#4dbb)`
and `(#4dbc)` are loaded per level from an internal data table (the Dossier
Table A.1 Elroy column), exactly like the personal dot limits in §Ghost house.
So the routine ANCHORS are cited above and the per-level values are recorded as
**Dossier-decoded and left uncited**. `mode.ts`'s `elroyThresholds`/`elroyStage`
carry the Dossier progression with that honest status.

## Level table (pm1-8)

`src/core/level.ts`'s `LEVELS` is the per-level table `game.ts`'s round
lifecycle reads: Pac-Man/ghost speeds (honest-uncited, same status as
§Speeds above), frightened seconds/flash count (reused from `mode.ts`, never
a second literal), Elroy 1/2 thresholds (reused from `mode.ts`'s
`elroyThresholds`), and the bonus fruit for that level — the one column with
a real, byte-cited ROM literal.

**The FRUIT TABLE (`pacman.asm:2b23`-`2b31`).** Immediately after the
ghost-chain scoring table (§Scoring), eight more little-endian BCD ×10 words
give the eight bonus-fruit point values, in the ROM's own table order:

| Symbol                   | Citation           | Raw word | Decoded | Fruit (Dossier ch.5) | Levels |
|--------------------------|---------------------|----------|---------|-----------------------|--------|
| `FRUIT_CHERRY_POINTS`    | `pacman.asm:2b23`  | `1000`   | **100**  | Cherry     | 1      |
| `FRUIT_STRAWBERRY_POINTS`| `pacman.asm:2b25`  | `3000`   | **300**  | Strawberry | 2      |
| `FRUIT_ORANGE_POINTS`    | `pacman.asm:2b27`  | `5000`   | **500**  | Orange     | 3-4    |
| `FRUIT_APPLE_POINTS`     | `pacman.asm:2b29`  | `7000`   | **700**  | Apple      | 5-6    |
| `FRUIT_MELON_POINTS`     | `pacman.asm:2b2b`  | `0001`   | **1000** | Melon      | 7-8    |
| `FRUIT_GALAXIAN_POINTS`  | `pacman.asm:2b2d`  | `0002`   | **2000** | Galaxian   | 9-10   |
| `FRUIT_BELL_POINTS`      | `pacman.asm:2b2f`  | `0003`   | **3000** | Bell       | 11-12  |
| `FRUIT_KEY_POINTS`       | `pacman.asm:2b31`  | `0005`   | **5000** | Key        | 13+    |

The level→fruit-kind MAPPING (which level gets which fruit) is the Dossier's
well-known progression, listed above for reference; it has no separate
literal of its own to cite beyond the points table itself, which is real.
`docs/rom-study/claims/level.json` (claims `FRUIT-CHERRY`..`FRUIT-KEY`) pins
these eight, byte-verified and re-derived by the same ×10 BCD decoder the
scoring-table claims use.

**The bonus-fruit spawn thresholds (`pacman.asm:0eba`/`0ebe`) — a real
routine, not Dossier prose alone.** The running dots-eaten counter at
`(#4e0e)` is compared directly against two literals: `cp #46` (70 decimal,
`pacman.asm:0eba`) arms the first fruit; on a miss, `cp #aa` (170 decimal,
`pacman.asm:0ebe`) arms the second, and a miss on THAT `ret nz`s straight out
— so 70 and 170 are the ONLY two thresholds this routine ever checks, not a
sample of a larger table. `level.ts`'s `FRUIT_SPAWN_DOTS = [70, 170]` and
`claims/level.json` (`FRUIT-SPAWN-1`/`FRUIT-SPAWN-2`) pin both, byte-verified.

**Pac-Man/ghost speed progression (honest-uncited, Dossier Table A.1).**
Level 1: Pac-Man 80% / ghost 75%. Levels 2-4: 90%/85%. Levels 5-20: 100%/95%.
Level 21+: 90%/95% (no further change is documented before the level-256 kill
screen, out of this epic's scope). Same citation status as §Speeds: no
isolable `pacman.asm:<addr>` literal, recorded honestly rather than invented.

**Cruise Elroy speeds — `elroy1SpeedPct` / `elroy2SpeedPct` (honest-uncited,
Dossier Table A.1; final-review fix).** The Elroy 1/2 dots-remaining
THRESHOLDS already had a real routine anchor (`pacman.asm:20d7`, §Cruise
Elroy below) — the SPEED PERCENTAGES a stage bumps Blinky to are a separate
Table A.1 column with no isolable ROM literal, same status as the plain
`ghostSpeedPct` progression immediately above. Level 1: Elroy-1 80%,
Elroy-2 85%. Levels 2-4: 90%/95%. Levels 5-20: 100%/105%. Level 21+:
100%/100%. `level.ts`'s `SPEED_TABLE` carries these alongside `pac`/`ghost`;
`game.ts`'s per-ghost movement loop selects `elroy1SpeedPct`/`elroy2SpeedPct`
in place of the plain `ghostSpeedPct` for BLINKY ONLY, gated on
`mode.ts`'s `elroyStage(dotsRemaining, level)` — Pinky/Inky/Clyde always use
the plain `ghostSpeedPct`, matching the Dossier (Cruise Elroy is a Blinky-only
mechanic). The ROM's own further gate — Elroy suppressed until Clyde has left
the house (`pacman.asm:20d7`'s `and a; ret z` on the Clyde-released flag,
already documented in §Cruise Elroy below) — is deliberately NOT wired here;
that nuance is deferred to a later story.

**Frightened ghost speed — `FRIGHTENED_GHOST_SPEED_PCT` (honest-uncited,
Dossier Table A.1; final-review fix).** A frightened ghost moves at 50% —
the Dossier's documented figure (it does vary slightly by level group in the
full table, but only the level-1 value is test-pinned here, the same scope
discipline `frightenedSeconds`/`frightenedFlashes` already apply). Named and
exported from `level.ts` rather than left as a bare literal in `game.ts` —
the bare `50` there was visually indistinguishable from the byte-CITED
`SCORE_ENERGIZER = 50` (`pacman.asm:2b19`) despite the two having nothing to
do with each other and completely different citation status.

**Extra life (Dossier default; honest-uncited).** A free life at 10 000
points is the Dossier's documented DIP-switch default. The vendored
disassembly has no plain stored literal for it — only the DIP-driven message
TEMPLATE `"BONUS PAC-MAN FOR   000 Pts"` at `pacman.asm:36b9` (the `000` is a
placeholder the ROM fills in from the DIP-selected value at draw time, not a
constant this dump captures). `game.ts`'s `EXTRA_LIFE_SCORE = 10_000` carries
the Dossier default with that honest status, matching `claims/lives.json`'s
existing treatment of `LIVES_PER_GAME`'s RAM-default (not a ROM literal
either).

## Sound (Namco WSG) (pm2-1)

The Pac-Man cabinet's audio is the **Namco WSG** (Waveform Sound Generator) — a
3-voice wavetable chip, **not** POKEY (the pm1 "Namco/POKEY" phrasing was loose).
Its eight waveforms live in a **separate 256-byte PROM** the program ROM cannot
supply; that PROM is vendored in `reference/sound/` and byte-verified by the gate.
See `reference/PROVENANCE.md` → *Sound PROMs*. All sound is shell-side; pm2 adds no
`src/core/` code.

**Where the waveforms are (byte source, not the program ROM).** MAME's
`ROM_START(pacman)` `ROM_REGION(0x0200,"namco")` loads two sound PROMs:
`82s126.1m` = the waveforms, `82s126.3m` = a timing PROM MAME labels `// Timing -
not used`. **The waveforms are `82s126.1m`.** The pm2 plan/epic mislabelled the
waveform PROM as `82s126.3m`; ROM wins (`reference/PROVENANCE.md` records the
correction).

### The chip

- **3 voices**, each an independent 20-bit phase accumulator, 4-bit volume, and a
  3-bit **waveform-select** (0–7) that picks one of the eight PROM waveforms.
- **Waveforms:** 8 tables × 32 samples, one 4-bit sample per PROM byte's **low
  nibble** (the high nibble is always 0). A sample is read **signed** as
  `(nibble − 8)`, range −8…+7 (MAME `namco.cpp:241`). The eight are pinned by
  `claims/sound.json` `WSG-WAVEFORM-0…7` (byte-verified against the PROM): 0 sine,
  6 triangle, 7 double-sawtooth, and five buzzier tables between.
- **Pitch.** The chip is clocked at **96 kHz** (`18.432 MHz XTAL ÷ 6 ÷ 32`, MAME
  `pacman.cpp:3745`). A voice's 20-bit frequency word `f` yields output frequency
  **`f_out = f × 96000 / 2²⁰ Hz`** (≈ `f × 0.0916 Hz`): the accumulator adds `f`
  each 96 kHz tick and its top 5 bits index the 32-sample table, so one waveform
  cycle completes every `2²⁰ / f` ticks. This is the mapping Task 2 bakes.

### The WSG register seam (RAM → hardware)

The per-frame interrupt driver copies the RAM sound-register block at `#4e8c`
into the WSG hardware registers at `#5050` (`pacman.asm:009d`), then routes the
three voices' waveform-select bytes to the hardware select registers `#5045` /
`#504a` / `#504f` (`pacman.asm:00b4`, `pacman.asm:00c3`, `pacman.asm:00d2`). The
`#4e8c` block is therefore the seam a sound layer drives; the hardware `#504x`
registers are the WSG itself. Voice N's frequency (5 nibbles) and volume sit in
the copied `#5050`+ block; its waveform index (0–7) selects `WSG_WAVEFORM_<n>`.

### The sound engine and its tables

Sound is generated by a small ROM driver with **two families of voice-definition
tables**, each dispatched to its own handler:

- **Tone / one-shot SFX** — voice definitions at `#3b30` / `#3b40` / `#3b80`
  (`pacman.asm:2d0c`, `pacman.asm:2d1d`, `pacman.asm:2d2e`), rendered by the tone
  handler `pacman.asm:2dee`. The handler resolves a waveform-select (a 3-bit field
  → lookup `#3bb0`, `pacman.asm:2dc2`) and a frequency/duration parameter (a 4-bit
  field → lookup `#3bb8`, `pacman.asm:2dd0`).
- **Note-stream / tunes** — voice definitions at `#3bc8` / `#3bcc` / `#3bd0`
  (`pacman.asm:2cc1`, `pacman.asm:2cda`, `pacman.asm:2cf3`), rendered by the
  note-stream handler `pacman.asm:2d44`, which walks a note pointer and treats a
  byte `≥ #f0` as a command escape. This is the sequencer the start-of-game theme
  (Task 4) rides.

Sound effects are requested by writing an effect number into the RAM sound block
(`#4e8c`/`#4e9c`/`#4ebc` — the "Choose sound N" writes; the test-mode roster is at
`pacman.asm:31a2`+, gameplay triggers write `#4eac`/`#4ebc`).

### The effect roster (what Tasks 3–4 will voice)

The cues pm2 must synthesise, each keyed off the `events.ts` seam pm1 built:
**munch/wakka** (the alternating dot-eat, two-phase toggle), the **frightened /
energizer siren**, **ghost-eaten**, **fruit-eaten**, the **death melody**, the
**extra-life** jingle, the continuous **background siren** whose pitch rises as the
maze empties (tracks dots-remaining / Cruise Elroy), and the **start-of-game
theme**.

**Deliberately deferred to the consuming tasks (the speeds / maze-layout
precedent).** The per-effect frequency and duration *values* are produced by the
tone/note-stream handlers reading the `#3b30`/`#3bc8` tables above, whose bytes the
vendored disassembler renders as bogus Z80 code (an uncommented data region — the
same "bare mnemonics" wall the *Speeds* section documents). pm2-1 pins the eight
waveforms byte-exact and byte-cites every table **anchor and handler** so the byte
source is fixed; decoding a specific effect's frequency/duration bytes into WSG
values is done **by the task that voices that effect** (Task 3 for the SFX/siren,
Task 4 for the theme), transcribed *under* this gate — never audited in afterward.
No effect-frequency constant is invented here.

### Effect decode (pm2-3)

pm2-3 decodes the **tone / one-shot SFX** family — the bytes of the three tone
voice-def tables `#3b30` (voice1), `#3b40` (voice2), `#3b80` (voice3) — into per-cue
WSG parameters, and traces the effect-number→voice-def dispatch. (The note-stream
tune family `#3bc8`/`#3bcc`/`#3bd0` — the start theme — is Task 4, still deferred.)
Every value below is byte-cited in `claims/sound.json` (`SND-*`) and gate-verified.

**The 8-byte voice-def format.** The tone handler `pacman.asm:2dee` copies an 8-byte
entry into its work area `ix+3..ix+A` (`ldir bc=8` @`2e42`). Decoded byte roles
(verified against the handler):

| Byte | Role | Handler |
|------|------|---------|
| 0 | control; **octave** = `(byte0 & #70) >> 4` = left-shift of the frequency word | `2edc`/`2ee0` |
| 1 | **base frequency** (low byte of the running frequency accumulator) | `2e50` |
| 2 | frequency **sweep** delta added per tick (signed) | `2ed0` |
| 3 | **duration** reload = `byte3 & #7f`; **bit7 = vibrato** flag | `2e48`/`2e91` |
| 4 | frequency **step** added to the base per duration-segment (signed) | `2eb0` |
| 5 | **segment / repeat count** | `2e73`/`2e79` |
| 6 | **waveform-select** in the HIGH nibble (`>>4 & #0f`) + **volume** in the LOW nibble | `2e56`/`2f22` |
| 7 | volume / waveform **delta** per segment (signed) | `2ebc` |

**Pitch, per voice.** Frequency word = `byte1 << octave` (16-bit `hl`). The hardware
copy `pacman.asm:009d` (`#4e8c`→`#5050`, 16 bytes) gives **voice1** a 5-nibble
(20-bit, bit0-based) frequency register, but **voices 2 and 3** only a 4-nibble
register (bits 4-19) — so for voices 2/3 the actual 20-bit word is `(byte1 << octave)
<< 4`. Then `Hz = word × 96000 / 2²⁰` (§The chip). The sound then sweeps (byte2) and
steps (byte4) from there, so the Hz below is the **starting** pitch of a moving tone.

**The dispatch (effect number → voice-def).** A sound is requested by writing a
**bitmask** into the voice's RAM request byte — `#4e9c` (voice1), `#4eac` (voice2),
`#4ebc` (voice3) — with `set N,(hl)` / `res N,(hl)` / a plain store. The handler
`pacman.asm:2e1b-2e28` scans the mask high-bit-first; the found **bit position N**
becomes the entry index (`dec b`, then `rlca`×3 → offset `N*8`, `pacman.asm:2e32`),
so **bit N selects the Nth 8-byte voice-def** in that voice's table. The test-mode
roster (`pacman.asm:31a2`+) confirms it: "Choose sound 1/2/4/8/16/32" writes the
single-bit values `#01/#02/#04/#08/#10/#20`.

**Cue → voice-def (byte-cited; Dossier is the behavioural decoder of *which* cue).**

| Cue | Voice·bit | Def | Trigger | Wave | Freq word | Start Hz | Vol | Dur | Notes |
|-----|-----------|-----|---------|------|-----------|----------|-----|-----|-------|
| Munch phase A (even dot) | v3·b0 | `#3b80` | `1a0f` | 0 | 6144 | 562 | 12 | 6 | down-chirp (sweep −3) |
| Munch phase B (odd dot) | v3·b1 | `#3b88` | `1a16` | 0 | 1024 | 94 | 12 | 6 | up-chirp (sweep +3); phases toggle on `#4e0e` parity |
| Ghost eaten | v3·b2 | `#3b90` | `19cb` | 0 | 6144 | 562 | 15 | 12 | vibrato, 2 segments |
| Fruit eaten | v3·b3 | `#3b98` | `1786` | 0 | 0→ | 0→ | 12 | 32 | rises from 0 (sweep +2) |
| Death, part 1 | v3·b4 | `#3ba0` | `12fc` | 0 | 8192 | 750 | 15 | 6 | long descending vibrato, **28 segments**, vol −1/seg |
| Death, part 2 | v3·b5 | `#3ba8` | `1349` | 0 | 0→ | 0→ | 8 | 12 | final octave-7 blip |
| Frightened / energizer siren | v2·b5 | `#3b68` | `1ac4` | 0 | 0→ | 0→ | 10 | 8 | rising sweep +6, set on energizer eaten |
| Background siren st.1 | v2·b0 | `#3b40` | `0e77` | 0 | 4096 | 375 | 6 | 12 | vibrato; lowest, maze full |
| Background siren st.2 | v2·b1 | `#3b48` | `0e77` | 0 | 5120 | 469 | 6 | 11 | dots ≥ `#74` |
| Background siren st.3 | v2·b2 | `#3b50` | `0e77` | 0 | 6144 | 562 | 6 | 10 | dots ≥ `#b4` |
| Background siren st.4 | v2·b3 | `#3b58` | `0e77` | 0 | 7680 | 703 | 6 | 9 | dots ≥ `#d4` |
| Background siren st.5 | v2·b4 | `#3b60` | `0e77` | 0 | 9216 | 844 | 6 | 8 | dots ≥ `#e4`; highest, maze near-empty |
| Extra life / bonus Pac | v1·b0 | `#3b30` | `2b3f` | **1** | 4096 | 375 | 15 | 12 | one-shot, waveform 1; fires with inc-lives `2b44` |

Addresses are `pacman.asm:<addr>`. The **background siren** is one continuous cue whose
pitch rises through five stages as the maze empties — driver `pacman.asm:0e77` selects
the stage from the dots-eaten counter `#4e0e` against thresholds `#74/#b4/#d4/#e4`,
masking with `#e0` so it never disturbs voice2 bits 5-7. The frightened siren (bit5),
"eyes/other" overlay (bits 6-7) ride the same voice on top of it.

**Lookup tables.** `SND_DURATION_TABLE` @`#3bb0` = `01 02 04 08 10 20 40 80` (powers of
two, tempo). `SND_FREQ_TABLE_16` @`#3bb8` = `00 57 5c 61 67 6d 74 7b 82 8a 92 9a a3 ad
b8 c3` (rest + a 15-step rising scale), indexed by a note byte's low-4-bit field. Both
are the **note-stream** family's tables (Task 4), byte-cited here for completeness.

**Undecoded / deferred (honest gaps).**
- **Voice2 bit6** (`#3b70`, set `128e` / cleared `1115`) and **voice2 bit7** (`#3b78`,
  octave-7 high warble, set `0aee` / cleared `13da`/`1ac6`): two additional voice2
  overlays. bit7's very high pitch fits the "ghost eyes returning to house" warble but
  the trigger context was **not** conclusively traced, so the cue label is left open;
  the byte-defs are decodable but their cue identity is **not** asserted.
- **The start-of-game theme** and all note-stream tunes (`#3bc8`+, handler `2d44`):
  Task 4, not decoded here.
- **Per-segment envelope evolution.** The Hz above is the *starting* pitch; the full
  swept/stepped trajectory (byte2/byte4/byte7 over byte5 segments) is described by role
  but not enumerated frame-by-frame — that is the synthesis task's to realise.
