# cp3-3 — the complete ecosystem (AC-4 demo)

Two frozen frames captured from THIS checkout (served on a spare port `:5288` to
avoid the shared-pin port-ownership trap), via the shell-only `?demo=` seed
(`src/shell/demo.ts`, a Design Deviation in the class of cp2-13's `?wave=N`).
The frames are deterministic (fixed seed `0x3303`, a fixed warm-up count) — the
scorpion's poison and the head's dive are written by REAL sim steps during
warm-up, then the frame is frozen for capture.

The flea and the scorpion **share motion-object slot 12** (`ANTP =MOBJP+12.`), so
no single frame can show both; the two shots together are the ecosystem.

## `cp3-3-demo-ecosystem.png` — the scorpion, live poison, and a dive
`?demo=ecosystem`. On screen:
- **the train** — the connected wave-1 centipede marching down from the top;
- **the walking spider** (`BUG0`, picture 0x14) weaving in the lower half;
- **the scorpion** (`SCORP1`, picture 0x31) crossing an upper-mid row (ANTV 0x88);
- **the poison trail** — the bright `POISON_MUSHROOM` cells the scorpion has
  written into row 17 behind it (0x3F → 0x3B), against the normal red mushrooms
  still ahead of it;
- **a poison dive** — a centipede head carrying the poison bit (picture 0x23)
  plunging straight down through cp2-3's dive code, caught mid-fall;
- **the gun** at the bottom.

## `cp3-3-demo-flea.png` — slot 12's other tenant
`?demo=flea`. The descending **flea** (`ANT0`, picture 0x1C, cp3-4's render) mid-
fall, with the walking spider and the gun — the same slot the scorpion claims in
the ecosystem frame, shown hosting the flea instead.
