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
