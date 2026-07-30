# Picture-ROM naming table (cp1-3, AC-2)

The two rev-2 picture chips — `136001.201` (LOWER bitplane, region `0x000-0x7FF`)
and `136001.202` (UPPER bitplane, region `0x800-0xFFF`, the same stamp layout
mirrored `+0x800`) — are transcribed verbatim into `src/core/pictures.ts` as
`PLANE_LOWER`/`PLANE_UPPER`, and named by `STAMPS`. This table traces every name
back to `revision.v2/CENPIC.MAC` (`.RADIX 16`, ground truth — see
`docs/rom-study/claims/05-pictures.json`).

Motion objects (8x16 sprites) carry a real CENPIC label; playfield tiles (8x8)
are **unlabelled** in CENPIC (`.BYTE` rows with only a trailing `;comment`) and
are named here by convention (`CHAR_*`, `DIGIT_*`, `MUSHROOM_*`).

## Centipede head/body — `HEAD0`..`HEADF`

The centipede (head and every body segment, healthy or poisoned) shares **one**
sprite pool of 16 frames — `CENDEF.MAC:129-137` documents motion-object picture
numbers 0-7 indexing this pool for head vs body vs poisoned variants
(`CENTI4.MAC:478` picks the HEAD picture, `:500` the BODY picture by number).
There is no separate body sprite set.

| Name | Lower-plane offset | CENPIC.MAC label line |
|------|---------------------|------------------------|
| `HEAD0` | `0x000` | `:13` |
| `HEAD1` | `0x400` | `:114` |
| `HEAD2` | `0x010` | `:14` |
| `HEAD3` | `0x410` | `:115` |
| `HEAD4` | `0x020` | `:15` |
| `HEAD5` | `0x420` | `:116` |
| `HEAD6` | `0x030` | `:16` |
| `HEAD7` | `0x430` | `:117` |
| `HEAD8` | `0x040` | `:17` |
| `HEAD9` | `0x440` | `:118` |
| `HEADA` | `0x050` | `:18` |
| `HEADB` | `0x450` | `:119` |
| `HEADC` | `0x060` | `:19` |
| `HEADD` | `0x460` | `:120` |
| `HEADE` | `0x070` | `:20` |
| `HEADF` | `0x470` | `:121` |

## Spider — `BUG0`..`BUG7`

| Name | Lower-plane offset | CENPIC.MAC label line |
|------|---------------------|------------------------|
| `BUG0` | `0x0A0` | `:26` |
| `BUG1` | `0x4A0` | `:126` |
| `BUG2` | `0x0B0` | `:27` |
| `BUG3` | `0x4B0` | `:127` |
| `BUG4` | `0x0C0` | `:28` |
| `BUG5` | `0x4C0` | `:128` |
| `BUG6` | `0x0D0` | `:29` |
| `BUG7` | `0x4D0` | `:129` |

## Flea — `ANT0`..`ANT3`

| Name | Lower-plane offset | CENPIC.MAC label line |
|------|---------------------|------------------------|
| `ANT0` | `0x0E0` | `:30` |
| `ANT1` | `0x4E0` | `:130` — **never drawn** |
| `ANT2` | `0x0F0` | `:31` |
| `ANT3` | `0x4F0` | `:131` — **never drawn** |

**Two of these four are dead art, and that is faithful.** `ANTMV` advances the
flea's picture by **two**, not one — `CENTI4.MAC:84 INC ANTP` bumps the byte in
memory and `:85-87 LDA ANTP / CLC / ADC I,01` adds one again to the value read
back — so from `ANTPC`'s `0x1C` the cycle is `0x1C → 0x1E → 0x1C` and pictures
`0x1D`/`0x1F` are unreachable. The `;FROM 1C TO 1F` comment at `:89` describes
the `ORA` mask's range, not the reachable set. The renderer (cp3-4) maps all four
so it is total over the band it documents, but only `ANT0` and `ANT2` can ever
reach the screen; a test in `tests/flea-live.test.ts` goes red if anyone
"repairs" the cycle. See open question 9.

## Scorpion — `SCORP0`..`SCORP3`

| Name | Lower-plane offset | CENPIC.MAC label line |
|------|---------------------|------------------------|
| `SCORP0` | `0x180` | `:42` |
| `SCORP1` | `0x580` | `:141` |
| `SCORP2` | `0x190` | `:43` |
| `SCORP3` | `0x590` | `:142` |

## Points display — `THREE` / `SIX` / `NINE`

The three values a spider kill can award, drawn in the spider's own slot once
its explosion finishes (`CENTI4.MAC:977-979`). Added by cp3-1; cp1-3's original
table did not name them.

| Name | Lower-plane offset | CENPIC.MAC label line | Picture code | Points |
|------|---------------------|------------------------|--------------|--------|
| `THREE` | `0x1B0` | `:47` | `0xB6` | 300 |
| `NINE` | `0x5B0` | `:146` | `0xB7` | 900 |
| `SIX` | `0x1C0` | `:48` | `0xB8` | 600 |

The picture code is the `PTS` byte (`CENDE4.MAC:221`) that `BUGP` takes, and it
decodes to the offset above by the motion-object rule
`offset = ((pic & 1) << 10) | (((pic >> 1) & 0x3F) << 4)`. Note the ROM's sprite
ORDER is THREE, NINE, SIX — so SHOOT's `LDY I,0B6` followed by one or two
`INC PTS` walks **300 → 900 → 600**, not ascending by score. See claims
SP-19/SP-22.

## Player gun and shot

| Name | Lower-plane offset | CENPIC.MAC label line | Entity |
|------|---------------------|------------------------|--------|
| `GUN` | `0x080` | `:21` | player gun (motion object) |
| `SHOT` | `0x480` | `:122` | player's fired shot |

## Character tiles — `CHAR_A`..`CHAR_Z`

Unlabelled in CENPIC — the `.=200` block runs `.BYTE 0,0,0,0,0,0,0,0` per
letter with a trailing `;A`..`;Z` comment (`CENPIC.MAC:55-80`); named here by
the `CHAR_<letter>` convention. All 26 letters are present, offsets `0x208`
through `0x2D0`, 8 bytes apart.

## Digit tiles — `DIGIT_0`..`DIGIT_9`

Unlabelled in CENPIC — `.BYTE` rows commented `;0`..`;9` (`CENPIC.MAC:86-95`);
named here by the `DIGIT_<n>` convention. Offsets `0x300` through `0x348`.

## Mushroom growth stages

Unlabelled in CENPIC — `.BYTE` rows commented `;n/4 [POISON] MUSHROOM`
(`CENPIC.MAC:104-111`); named here by the `MUSHROOM_*`/`POISON_MUSHROOM_*`
convention (plain mushroom tiles use colours 1 and 2; poison uses 1 and 3).

| Name | Lower-plane offset | CENPIC.MAC comment line |
|------|---------------------|---------------------------|
| `POISON_MUSHROOM_1_4` | `0x3C0` | `:104` |
| `POISON_MUSHROOM_1_2` | `0x3C8` | `:105` |
| `POISON_MUSHROOM_3_4` | `0x3D0` | `:106` |
| `POISON_MUSHROOM_FULL` | `0x3D8` | `:107` |
| `MUSHROOM_1_4` | `0x3E0` | `:108` |
| `MUSHROOM_1_2` | `0x3E8` | `:109` |
| `MUSHROOM_3_4` | `0x3F0` | `:110` |
| `MUSHROOM_FULL` | `0x3F8` | `:111` |

## Decode

`colour = (upperBit << 1) | lowerBit`, pixel `x=0` is the MSB (`0x80`); row
`r` of a stamp at offset `X` is `PLANE_LOWER[X+r]` / `PLANE_UPPER[X+r]`.
Sprites (motion objects — centipede, spider, flea, scorpion, gun, shot) are
8x16; tiles (characters, digits, mushrooms) are 8x8. See
`docs/rom-study/claims/05-pictures.json` for the radix-cited decode-layout
claims and `docs/rom-study/pictures-contact-sheet.svg` for the baked,
human-reviewable render of every stamp above.
