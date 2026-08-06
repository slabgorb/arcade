# Starting-city count (O-4, resolved)

The REV-01 derivation note for open question **O-4**: how many cities you begin a
game defending. This is the count mc3's damage/end-game logic counts down from
("all cities gone" ends the game), so it is pinned to source here before the damage
loop is written. Ground truth is the vendored REV-01 source
(`plugins/missile-command/reference/source/`, `.RADIX 16` at `W3COMN.MAC:1`).

## Answer

**The default starting-city count is 6.** It is *not* a bare use of `NCITY`: the game
reads the count from a four-entry table indexed by the option-2 DIP field, and the
default (option bits clear) is the first entry, `6`.

- `NCITY = 6` (`W3COMN.MAC:39`) is the **maximum** number of cities — the hardware
  ceiling, and the source of the six fixed city coordinates. It is *not* the thing the
  game loads at game start.
- `SCITYM = 03` (`W3COMN.MAC:195`) is the option-2 **mask** whose comment reads
  ";5 CITIES AT START". That "5 cities" is one selectable **option** (see the table
  below), **not** the default.

## Where the option is read

The count is loaded in **NEW GAME SETUP** (reached from the **SETUP STATE** dispatch,
`.SBTTL SETUP STATE` at `W3MAIN.MAC:561`). The relevant lines (physical; `W3MAIN` is
double-spaced, so cite the physical line, never brief.md's older logical ordinals):

```
W3MAIN.MAC:3869   LDA OPTIO2        ; the option-2 DIP byte
W3MAIN.MAC:3871   AND I,SCITYM      ; SCITYM=03 → isolate the low two bits → Y (0..3)
W3MAIN.MAC:3873   TAY
W3MAIN.MAC:3877   LDA AY,STCITY     ; # OF CITIES = STCITY[Y]
W3MAIN.MAC:3895   STCITY:  .BYTE 6,4,5,7
W3MAIN.MAC:3897   STCIMA:  .BYTE 0FC,0E8,0F8,0FC   ; matching alive-city bitmasks
```

So the option-2 field (`OPTIO2 & SCITYM`) selects an entry of the `STCITY` table:

| `OPTIO2 & SCITYM` (Y) | `STCITY[Y]` | Cities at start |
|-----------------------|-------------|-----------------|
| 0 (**default**)       | `6`         | **6**           |
| 1                     | `4`         | 4               |
| 2                     | `5`         | 5 ← SCITYM's ";5 CITIES AT START" option |
| 3                     | `7`         | 7               |

The whole table is `STCITY: .BYTE 6,4,5,7`. With the option-2 bits clear (Y=0) — the
REV-01 default, agreeing with MAME's 6-city dip default — the game starts with **6**
cities. The ";5 CITIES AT START" comment on `SCITYM` names the Y=2 **option**
(`STCITY[2] = 5`), not the count you get out of the box.

`STCIMA` (`W3MAIN.MAC:3897`) is the paired alive-city **bitmask** written alongside the
count; only the count is pinned by O-4, but mc3's end-game will want the mask too.

## Not a game-start path

There is a second `AND I,SCITYM` at `W3INT.MAC:1291`, but it sits under
`.SBTTL DISPLAY OPTIONS` (the self-test options screen) and only reads `STCITY` to
*display* the current setting. NEW GAME SETUP is the one authoritative start-count site.

## Consumed by

The pinned count is exported as `START_CITIES` in
[`../../src/core/field.ts`](../../src/core/field.ts) (cited to `STCITY`,
`W3MAIN.MAC:3895`) and backed by the `MC-STCITY-START` claim in
[`claims/field.json`](./claims/field.json), so mc3 can consume it without re-deriving.
