# Missile Command — Glossary

Companion to [`brief.md`](brief.md) and [`subsystems.md`](subsystems.md). The
per-symbol decoded dictionary: every constant the skeleton and later stories cite,
with its **as-written** source token, its **decoded** value, the radix that governs
the decode, its meaning, and its physical line in the vendored **REV-01** source.
Every mechanically-checkable row is backed by an mc2-1 claim (`claims/*.json`), so a
value here cannot silently drift from the source it cites.

## Radix discipline

`.RADIX 16` is set **once**, at `W3COMN.MAC:1`, and inherited by `W3MAIN`, `W3DSUP`
and `W3INT` via `.INCLUDE W3COMN`. **No module sets its own radix.** Therefore:

- A **bare number is HEX** — `NCITY =6` is 6, `CITY2H =0B4` is 180, `LAUHGT =0CA` is 202.
- A **trailing period is a DECIMAL override** — `MAXMIS =10.` is decimal 10 (hex would
  be 16), `TOPSCR =222.` is decimal 222.

Read every `Decoded` value below through that rule; the `As-written` column preserves
the source token verbatim (including the trailing period) so the radix is auditable.

## W3COMN constants

| Symbol | As-written | Decoded | Radix | Meaning | Line | Claim |
|---|---|---|---|---|---|---|
| `MAXMIS` | `10.` | 10 | dec | ABMs loaded per base | `W3COMN.MAC:29` | `MC-MAXMIS` |
| `NABMS` | `8` | 8 | hex | Max friendly ABMs in flight | `W3COMN.MAC:33` | `MC-NABMS` |
| `NICBMS` | `8` | 8 | hex | Max enemy ICBMs tracked | `W3COMN.MAC:35` | `MC-NICBMS` |
| `NCITY` | `6` | 6 | hex | Max cities (hardware default 6) — see **O-4** | `W3COMN.MAC:39` | `MC-NCITY` |
| `NMISBA` | `3` | 3 | hex | Missile bases | `W3COMN.MAC:41` | `MC-NMISBA` |
| `TOPSCR` | `222.` | 222 | dec | Top-of-screen vertical coord | `W3COMN.MAC:107` | `MC-TOPSCR` |
| `LAUHGT` | `0CA` | 202 | hex | ICBM height gate: an ICBM below this launches more | `W3COMN.MAC:171` | `MC-LAUHGT` |
| `MXICON` | `7` | 7 | hex | Max ICBMs on screen at once | `W3COMN.MAC:193` | `MC-MXICON` |
| `SCITYM` | `03` | 3 | hex (mask) | Option-2 mask: "5 cities at start" — see **O-4** | `W3COMN.MAC:195` | `MC-SCITYM` |
| `MAXMUL` | `6` | 6 | hex | Max score multiplier (rises by wave) | `W3COMN.MAC:201` | `MC-MAXMUL` |
| `SPUTWV` | `2` | 2 | hex | First wave with a Sputnik (satellite) | `W3COMN.MAC:203` | `MC-SPUTWV` |
| `MIRVWV` | `1` | 1 | hex | First wave with a MIRV | `W3COMN.MAC:205` | `MC-MIRVWV` |
| `STUPID` | `9` | 9 | hex | Wave at which cruise missiles may fly up | `W3COMN.MAC:231` | `MC-STUPID` |

### City coordinates (`W3COMN.MAC:123–145`, all hex)

The six cities' fixed cabinet H/V positions. Bare hex throughout — no decimal overrides.

| Symbol | As-written | Decoded | Radix | Meaning | Line | Claim |
|---|---|---|---|---|---|---|
| `CITY1H` | `5F` | 95 | hex | City 1 horizontal coord | `W3COMN.MAC:123` | `MC-CITY1H` |
| `CITY1V` | `10` | 16 | hex | City 1 vertical coord | `W3COMN.MAC:125` | `MC-CITY1V` |
| `CITY2H` | `0B4` | 180 | hex | City 2 horizontal coord | `W3COMN.MAC:127` | `MC-CITY2H` |
| `CITY2V` | `15` | 21 | hex | City 2 vertical coord | `W3COMN.MAC:129` | `MC-CITY2V` |
| `CITY3H` | `94` | 148 | hex | City 3 horizontal coord | `W3COMN.MAC:131` | `MC-CITY3H` |
| `CITY3V` | `12` | 18 | hex | City 3 vertical coord | `W3COMN.MAC:133` | `MC-CITY3V` |
| `CITY4H` | `2C` | 44 | hex | City 4 horizontal coord | `W3COMN.MAC:135` | `MC-CITY4H` |
| `CITY4V` | `12` | 18 | hex | City 4 vertical coord | `W3COMN.MAC:137` | `MC-CITY4V` |
| `CITY5H` | `47` | 71 | hex | City 5 horizontal coord | `W3COMN.MAC:139` | `MC-CITY5H` |
| `CITY5V` | `11` | 17 | hex | City 5 vertical coord | `W3COMN.MAC:141` | `MC-CITY5V` |
| `CITY6H` | `0D0` | 208 | hex | City 6 horizontal coord | `W3COMN.MAC:143` | `MC-CITY6H` |
| `CITY6V` | `11` | 17 | hex | City 6 vertical coord | `W3COMN.MAC:145` | `MC-CITY6V` |

## Open-question symbols (O-2 / O-4)

These are surfaced by the brief's open questions and are **not** yet mechanically
pinned by a claim — they are documented here so later stories know where to look, not
asserted as ground truth.

| Symbol | Meaning | Where | Open question |
|---|---|---|---|
| `FRAME` | Per-frame counter the mainline reads to pace the sim; global in `W3DSUP.MAC:19`, read by `W3MAIN.MAC:2039`. Sizing the game tick from it against MAME's 61.0076 Hz / 4-IRQ-per-frame model is unresolved. | `W3DSUP` / `W3MAIN` | **O-2** |
| `SCITYM` vs `NCITY` | `NCITY` is the *max* city count (6); `SCITYM` is the option-2 "5 cities at start" mask. The *actual* starting-city count, and where the option is read, is unpinned. | `W3COMN` | **O-4** |
