# O-5 — the per-wave 8-colour palette (colour source, resolved)

Story mc9-2. Open question **O-5** asked two things: *which* is the colour source
the render should reproduce, and how REV-01 maps a pixel's palette index to the 8
hardware colours. This note resolves both. Measured against the vendored REV-01
source (`reference/source`), pinned by the claims in
[`claims/color.json`](./claims/color.json) (all byte-verified against the ROM).

## The colour source

A pixel carries a **3-bit colour index**. Those 3 bits select one of eight colour
**registers** `COL000 … COL111` (`W3INT.MAC:93-107`) — the register names *are* their
binary index. Each register holds a colour **CODE**, one of eight named hues at even
values (`W3COMN.MAC:491-505`):

| Code | Hex | Hue |
|------|-----|-----|
| `CWHITE` | 0 | white |
| `CYELLO` | 2 | yellow |
| `CPURPL` | 4 | purple |
| `CRED`   | 6 | red |
| `CBLUGR` | 8 | blue-green |
| `CGREEN` | 0A | green |
| `CBLUE`  | 0C | blue |
| `CBLACK` | 0E | black |

There are **no RGB values in the ROM** — a code became a colour through a resistor
DAC on the PCB. Our `colorCodeToRgb` (`src/shell/palette.ts`) is that decode, keyed
by each code's own name; it is **labelled adapter policy, not a ROM constant**.

## How the palette is chosen per wave

`SETCOL` — SET UP COLORS FOR NEXT WAVE (`W3DSUP.MAC:1583`) — fills the 8 registers
each wave from one of **ten** per-wave rows. The row is chosen by

```
index = ((WAVENO - 1) >> 1) mod 10        ; W3DSUP.MAC:1593-1615
```

through a 10-entry dispatch table (`W3DSUP.MAC:1655-1673`, order `WV1, WV5, WV6, WVD,
WV7, WV9, WVA, WVB, WVC, WV8`). So **the palette changes every two waves and repeats
every 20**. Each row is packed by the `DBLCOL` macro (`W3DSUP.MAC:1677-1679`) as
`A*10+B` — and `W3DSUP.MAC` inherits `.RADIX 16` from `W3COMN.MAC:1`, so `10` is `0x10`
and every arg is a nibble. `SETCOL` distributes the 8 args so the **`DBLCOL` argument
order is the `COL000 … COL111` order**. The slot legend (`W3DSUP.MAC:1706`):

| Slot | Register | Draws |
|------|----------|-------|
| 0 | `COL000` | SKY (background) |
| 1 | `COL001` | GROUND |
| 2 | `COL010` | ICBMs |
| 3 | `COL011` | CITY (bottom) |
| 4 | `COL100` | UNUSED (FLASH) |
| 5 | `COL101` | UNUSED (FLASH) |
| 6 | `COL110` | ABMs |
| 7 | `COL111` | CITY (top) & ABMs |

## Colour cycling (the flash)

During play `FLSHCO = GAMEFL = 0x30` (`W3COMN.MAC:489`) flags registers **4 & 5**
(`COL100`, `COL101`); the VBLANK handler `INC`s each flagged register and copies it to
hardware every frame (`W3INT.MAC:291-313`). That per-frame `INC` is the cabinet's
colour cycling. The dominant, player-visible cycling, though, is the **whole-field
recolour** the per-wave palette produces; the flash is a subtle effect on the two
"unused" registers used for explosion pops. This clone reproduces the per-wave palette
and exposes the flash mask/slots (`FLASH_MASK` / `FLASH_SLOTS`); a full per-frame flash
animation is a later refinement.

## The deliberate non-goal

O-5's other half — the hardware **address scramble** (`get_bit3_addr`,
`missile.cpp:617-625`; the 3rd-colour-bit video-RAM scatter `$0200–$05FF`,
MISSIL.MAP) — is a memory-layout detail of the real PCB, invisible on a modern canvas.
We do **not** reproduce it; that stays a non-goal, as mc3 already recorded.
