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

**Extra life (Dossier default; honest-uncited).** A free life at 10 000
points is the Dossier's documented DIP-switch default. The vendored
disassembly has no plain stored literal for it — only the DIP-driven message
TEMPLATE `"BONUS PAC-MAN FOR   000 Pts"` at `pacman.asm:36b9` (the `000` is a
placeholder the ROM fills in from the DIP-selected value at draw time, not a
constant this dump captures). `game.ts`'s `EXTRA_LIFE_SCORE = 10_000` carries
the Dossier default with that honest status, matching `claims/lives.json`'s
existing treatment of `LIVES_PER_GAME`'s RAM-default (not a ROM literal
either).
