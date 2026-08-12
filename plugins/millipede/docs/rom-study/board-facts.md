# Millipede (1982) — Board Facts (MAME secondary source)

**Primary source:** the vendored 1982 Atari assembler tree
(`reference/original-source/millipede/`, `historicalsource/millipede` @ `29f3e05`).
Citations into it are `` `FILE:LINE` `` and re-open byte-for-byte.

**Secondary source:** MAME's Millipede driver. There is **no `milliped.cpp`** — in MAME,
Millipede is defined inside the **Centipede driver family** under `src/mame/atari/`:
`centiped.cpp` (machine config, memory maps, DIPs, `ROM_START(milliped)`), `centiped_v.cpp`
(video/palette) and `centiped.h` (state class). MAME is **GPL**: it is cited **in prose only**
(`centiped.cpp:N`), **never copied** into this repo and never byte-opened by the citation gate
(the sweep grammar covers `.MAC/.DOC/.MAP/.LNK`, not `.cpp`, by construction).

This doc records the **board-level facts the 1982 source never states** — master clock, exact
refresh, screen geometry, cabinet rotation — plus MAME's corroboration of the two facts the
Atari ledger *does* carry (colour wiring, picture-ROM part numbers). It resolves **OQ-1** by
**recording** MAME's answer verbatim, hedge and all — it does **not** settle the divisor.

**Line-number discipline.** Every `centiped*.cpp:N` below was read this session from numbered
tool output (`grep -n`, `sed -n 'Np'`) against `~/Projects/mame/src/mame/atari/`, never from
memory. MAME line numbers can drift between MAME releases; they anchor a fact, they are not the
fact.

---

## 1. Master clock — 12.096 MHz crystal, ÷8 for the 6502

MAME states the master crystal as **12.096 MHz** (`centiped.cpp:22`, "Main clock: XTAL = 12.096
MHz") and clocks the 6502 at that crystal divided by eight — **1.512 MHz** — in the shared
`centiped_base` machine config: `M6502(config, m_maincpu, 12096000/8)` (`centiped.cpp:1778`,
"1.512 MHz"). The `milliped()` config inherits it via `centiped_base(config)` and adds two
POKEYs, each also at `12096000/8` (`centiped.cpp:1884`+). The crystal itself is a board fact the
1982 source never states — hence MAME as the secondary source here.

## 2. Exact refresh — OQ-1, recorded not resolved

OQ-1 asks whether Millipede's *revised* board still runs at Centipede's 59.88593 Hz. MAME does
not answer cleanly — it **hedges**, and the whole point of ml1-4 is to record that hedge rather
than inherit a rate on faith. Verbatim, from `centiped.cpp:25`:

```
Video frequency: VSYNC = HSYNC/263 ?? = 59.88593 Hz (not sure, could be /262)
```

So MAME gives Millipede the **same 59.88593 Hz as Centipede**, derived as HSYNC (15.75 kHz,
`centiped.cpp:24`) divided by 263 — **but flags the divisor as uncertain**: `/263 ??`, "could be
`/262`". Both divisors survive here on purpose; picking one would settle a question MAME itself
leaves open. The VBlank duration is quoted as `1/VSYNC * (23/263) = 1460 us` (`centiped.cpp:26`).

**Tension to carry forward:** the *comment* says 59.88593 Hz, but the *code* rounds — the shared
screen config calls `m_screen->set_refresh_hz(60)` (`centiped.cpp:1798`), a hard-coded 60 Hz.
MAME's executable rate is therefore 60 Hz while its own documented rate is 59.88593 Hz. A later
sim story should treat 59.88593 Hz as the intended rate and note the 60 Hz rounding, not read
`set_refresh_hz(60)` as ground truth.

## 3. Screen geometry — 32×32 tiles, 256×240 visible

The shared screen config sets a **32×32 tile** field, `set_size(32*8, 32*8)` = 256×256 pixels
(`centiped.cpp:1799`), with the visible area cropped to **256×240** — `set_visarea(0*8, 32*8-1,
0*8, 30*8-1)`, i.e. columns 0–255 and rows 0–239 (`centiped.cpp:1800`). The bottom two tile rows
(240–255) are off-screen. This matches the Atari playfield RAM layout (a 32×30 character grid)
the memory map implies, but the pixel geometry itself is MAME's.

## 4. Cabinet rotation — ROT270 (vertical monitor)

Millipede is a **vertical** cabinet: the `GAME()` registration declares **`ROT270`** —
`GAME( 1982, milliped, 0, milliped, milliped, centiped_state, empty_init, ROT270, "Atari",
"Millipede", MACHINE_SUPPORTS_SAVE )` (`centiped.cpp:2389`) — the monitor rotated 270°, the same
orientation as Centipede. (This is distinct from the cocktail **flip**, wired separately as
`flip_screen_w` in `milliped()`.)

## 5. Colour is RAM-driven — no colour PROM

Millipede has **no colour PROM**; colours are driven from RAM. MAME states it directly in the
video code: the hardware "doesn't have a color PROM — eight RAM locations control the color"
(`centiped_v.cpp:186`), with the paletteram write handler `milliped_paletteram_w`
(`centiped_v.cpp:390`) decoding those RAM writes into pen colours. This corroborates the 1982
primary source: the ROM sign-off ledger lists **no colour or sync PROM** among the shipped parts
(`368X1.DOC:22`–`368X1.DOC:23` are the only PROM-family parts, both *picture* EPROMs), and
`CLRCH` is the **colour-RAM initialisation** routine (`MLIRQ.MAC:242`). Colour being RAM-driven —
no 82S129 sync PROM as on Centipede — is the real board difference the ledger already records;
MAME's video code is the secondary confirmation of *how* that RAM drives the pens.

## 6. Picture-ROM part numbers — 136013-106 / 136013-107

The two picture EPROMs are **136013-106** (PCB N/P5) and **136013-107** (PCB R5), 2716 2Kx8 parts,
established from the vendored ledger `368X1.DOC:22` (106, start address 800) and `368X1.DOC:23`
(107, start address 0). MAME's `ROM_START(milliped)` **corroborates them exactly**: it loads
`136013-107.r5` at offset `0x0000` (`centiped.cpp:2226`) and `136013-106.p5` at offset `0x0800`
(`centiped.cpp:2227`) — same parts, same PCB locations, same address split (107 low, 106 high).
These are the 8×8 stamps `ml2` decodes; the picture *source* file `368XX.SB2` is absent from the
vendored tree, so the pixels come from this MAME set.

---

*Scope: this brief records the MAME secondary-source board facts only. It adds no new claims —
the two vendored-grounded facts cross-reference existing claims (`368X1.DOC:22`–`23` = RS-4/RS-5,
`MLIRQ.MAC:242` = SS-14). Graphics decode is `ml2`; colour render is `ml2`; sim/sound/wiring are
`ml3`+. The `/263`-vs-`/262` divisor stays an open hedge (OQ-1).*
