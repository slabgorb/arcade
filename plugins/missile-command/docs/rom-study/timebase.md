# Missile Command — the game-logic timebase (open question O-2, RESOLVED)

Source-of-record for the **sim tick**: the time unit every later velocity and descent
speed is expressed in. Assembler facts cite the vendored **REV-01** source
(`reference/source/`); board/hardware facts cite MAME
`src/mame/atari/missile.cpp`. Resolves **O-2** from
[`brief.md`](./brief.md) §3.

Citation convention (mc2-1): a source line is cited by its **physical** line — what
`grep -a` / an editor shows — because `W3MAIN`/`W3INT` are double-spaced and their
*logical* (non-blank) ordinals are ~half the physical number. brief.md's earlier
`FRAME` references (a W3DSUP global line and a W3MAIN read, both quoted by logical
ordinal near 19 and 2039) were approximate; the physical truth is recorded below.

## Answer, in one line

**One game-logic step runs per video frame**, released by the VBLANK interrupt and
counted by `FRAME`. The field runs at the board's **VSYNC ≈ 61.0076 Hz** (nominal
**60**). So the sim tick is **1 tick per video frame = 61.0076 Hz** (use 60 as the
round fallback). There is **not** one tick per IRQ: the board raises **4 IRQs per
frame**, but only the one in VBLANK advances the frame.

## How the interrupt drives the frame (W3INT)

The 6502 takes an IRQ from `/32V`, latched at SYNC — **4 IRQs per frame**, at
V = 0, 64, 128, 192 (unflipped); VBLANK is true when V < 24
(`schedule_next_irq` / `vblank_r`, `missile.cpp:485-497` and `missile.cpp:528-532`).

Every IRQ enters the handler `IRQ:` (`W3INT.MAC:175`), which sanity-checks the stack
and PC and tests the overrun window (`LDA SYNC ;OVERRUN TIME LIMIT?`,
`W3INT.MAC:209`). It then falls into `HANDLE VBLANK` (`W3INT.MAC:269`), which counts
**every** interrupt (`INC INTCNT ;COUNT INTERRUPTS`, `W3INT.MAC:275`) but gates the
per-frame work behind the blank test (`IFMI ;IS THIS BLANK TIME?`, `W3INT.MAC:279`).
Only inside that gate does it run `INC SYNC` (`W3INT.MAC:281`) — plus the blink timer,
the colour flash, and the option/DIP reads. So of the 4 IRQs, exactly **one** — the
VBLANK one — bumps `SYNC`.

## How the mainline consumes it (W3MAIN)

`SYNC` is the I/O↔mainline handshake byte (`SYNC: .BLKB 1 ;I/O AND MAINLINE SYNC`,
`W3MAIN.MAC:159`). Each pass of the main loop blocks on it — `BEGIN ;SYNC UP WITH I/O`
(`W3MAIN.MAC:497`) spins on `LSR SYNC` until the VBLANK interrupt has set it, then
clears it (`STA SYNC`) and runs one frame of game logic. At the end of that frame it
does `INC FRAME` (`W3MAIN.MAC:781`).

`FRAME` is the per-frame counter — `FRAME: .BLKB 1 ;FRAME COUNTER (1-60)`
(`W3MAIN.MAC:239`) — so it wraps once per second at 60 frames. That the game *means*
60 frames = 1 second is proved by its own use as a sub-second timer: the pause state
reads `LDA FRAME / AND I,03 / IFEQ ;UPDATE EVERY 4/60 SEC` (`W3MAIN.MAC:619-623`), i.e.
every 4 frames is 4/60 s. The tick is therefore one logic step per frame, at video
rate.

## The rate to encode

| Quantity            | Value        | Source |
|---------------------|--------------|--------|
| Sim tick            | 1 step/frame | `W3MAIN.MAC:497` sync gate + `W3MAIN.MAC:781` `INC FRAME` |
| Exact frame rate    | **61.0076 Hz** | `missile.cpp:58` VSYNC (PCB note) |
| Nominal fallback    | **60 Hz**    | `FRAME COUNTER (1-60)`, `W3MAIN.MAC:239`; `UPDATE EVERY 4/60 SEC`, `:623` |
| IRQs per frame      | 4 (only VBLANK advances the frame) | `missile.cpp:485-497`; `W3INT.MAC:275`/`:281` |

Encoded as `TICK_HZ` (with the nominal-60 fallback) in
[`../../src/shell/timebase.ts`](../../src/shell/timebase.ts), so mc3's enemy descent
speeds and missile velocities can be expressed in this unit.

## Caveat: CPU half-speed band (does NOT change the tick)

The 6502 runs at 1.25 MHz (10 MHz/8) but drops to **half speed** (10 MHz/16) from
**scanline 224** to the bottom of the visible field (`adjust_cpu_speed`,
`missile.cpp:542-555`). This shrinks the CPU's per-frame instruction budget in the
lower band — it matters for how much work a frame can do — but it does **not** change
the logic cadence: the frame is still released once per VBLANK and `FRAME` still
advances once per frame. Record it as a per-frame *work* caveat, not a second clock.
