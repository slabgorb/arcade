# Subsystem map — Centipede rev 4

Generated 2026-07-18 directly from `grep -n "\.SBTTL"` over the rev-4 modules
(`arcade/reference/atari-source/centipede/revision.v4/` + shared `COIN65.MAC`)
— every line number below is tool output, not transcription. Read `brief.md`
first for the shipped-set, radix, and timebase ground truth.

## Game logic — `CENTI4.MAC`

| Line | Section | Subsystem |
|---|---|---|
| 7 | `MAINLOOP` | one pass per video frame; call order is the spec |
| 46 | `ANTMV-MOVE ANT DOWN SCREEN` | flea ("ANT") |
| 128 | `ANTPC-INITIALIZE ANT` | flea |
| 158 | `ATTRACT-MODE GAMEPLAY` | attract mode |
| 225 | `BONUS - DISPLAY "BONUS LIFE EVERY XXXX" MESSAGE` | UI |
| 250 | `BUGOFF-INITIALIZE BUG PICTURE` | spider ("BUG") |
| 285 | `BUGMV-MOVE BUG` | spider |
| 456 | `CENTPC-INITIALIZE CENTIPEDE PICTURE` | centipede |
| 557 | `CHKEND-CHECK FOR DELAYS AND END OF GAME` | game flow |
| 755 | `CHKST-CHECK FOR START IF GAME` | game flow |
| 879 | `CLRCH-COLOR RAM INITIALIZATION` | video/color |
| 905 | `COPYHS-COPY HIGH CORES TO EA ROM BUFFER` | high scores |
| 920 | `DLIVES-DISPLAY LIVES` | UI |
| 961 | `EXPLOD-EXPLODE CENTIPEDE SEGMENTS AND PLAYER` | explosions |
| 1001 | `GETINT-GET PLAYERS INITIALS FOR HIGH CORE` | high scores |
| 1162 | `INIT-INITIALIZE EVERYTHING` | game flow |
| 1277 | `MOTION-MOTION UPDATE` | centipede movement |
| 1477 | `MOVE-MOVE PLAYER` | player |
| 1643 | `NEWHD-PUT IN NEW HEAD` | centipede |
| 1689 | `OBSTAC-OBSTACLE` | centipede vs mushrooms |
| 1741 | `OVRLAP-CHECK FOR OVERLAP` | collision |
| 1769 | `PLAY-CHECK FOR PLAYER COLLISION` | player collision |
| 1826 | `RESTOR-RESTORE MUSHROOMS` | playfield |
| 1934 | `SCORNG-SCORING` | scoring (BCD, `SED`/`CLD`) |
| 2000 | `SCORP-MOVE AND START SCORPION` | scorpion |
| 2099 | `CHECK FIRE SWITCH` | player fire |
| 2322 | `SOUNDS-SOUND ROUTINE` | audio (POKEY) |
| 2467 | `SWAP-SWAPSCREENS` | two-player flip |
| 2514 | `TBLMT-LIMIT TRACKBALL MOVEMENT` | input |
| 2534 | `UPDATE-UPDATE HIGH SCORE TABLE` | high scores |
| 2629 | `UPSCRE-UPDATE SCORES ON SCREEN` | UI |

## IRQ / input / text — `CENIR4.MAC`

| Line | Section | Subsystem |
|---|---|---|
| 111 | `MESS-MESSAGE ROUTINE` | text output |
| 177 | `ABS/COMP` | math helpers |
| 192 | `PRINT CHARACTER` | text output |
| 220 | `DIGITS` | score digits |
| 251 | `IRQ-IRQ PROCESSING` | timebase, joystick/trackball, coin hook, watchdog trap |
| 449 | `JOYS - READ AND RESPOND TO JOYSTICKS` | input |

## Self-test + EAROM — `CENTS4.MAC`

| Line | Section |
|---|---|
| 11 | `CKSUM-CHECKSUM EAROM` |
| 29 | `CHKEA-CHECK EAROM INTEGRITY` |
| 85 | `INITEA-INITIALIZE FROM EAROM` |
| 99 | `READEA-READ EA ROM` |
| 121 | `WRITEA-WRITE DATA TO EAROM` |
| 166 | `RESET-POWER-ON RESET` |
| 199 | `ZERO-PAGE TEST` |
| 305 | `TV MONITOR ADJUSTMENT TEST` |
| 372 | `PATTERN SCREEN` |
| 401 | `ROM TEST` |
| 444 | `EAROM ACCOUNTING COMPUTATIONS` |
| 478 | `MAIN LOOP OF SELF TEST` |
| 638 | `SWITCH TEST CALCULATIONS` |
| 792 | `VECTORS` |

## Coin handling — `COIN65.MAC` (shared, byte-identical across all revisions)

| Line | Section |
|---|---|
| 1 | `COIN65 - 650X "UNIVERSAL" COIN ROUTINE` (Downend & Albaugh) |
| 304 | `DETECT COIN` |
| 428 | `MECH-MULTIPLIERS` |
| 563 | `BONUS-ADDER` |
| 583 | `COINS TO CREDITS` |
| 612 | `ELECTRO-MECH. CTRS` |

Called once per frame from the VBLANK IRQ slice (`JSR MOOLAH`, `CENIR4.MAC:398`).

## Data ROMs (outside the CPU link)

- `CENPIC.MAC` — picture/character bitmaps → picture ROMs (rev-2 artifacts are
  what rev 4 shipped with; see `brief.md` §0).
- `SYNC.MAC` / `revision.v2/SYNC2.MAC` — video sync PROM contents.
