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
