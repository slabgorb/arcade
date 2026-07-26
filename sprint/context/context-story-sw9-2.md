# Story sw9-2 Context

## Title
SELECT-A-DEATH-STAR difficulty picker — countdown start-wave select EASY/MEDIUM/HARD with the real 200k/400k/600k/800k start bonuses (reinstated in their correct home after sw7-4 removed them from a mis-attributed mechanic); sets starting wave, banks the bonus

## Metadata
- **Story ID:** sw9-2
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** star-wars
- **Epic:** Cabinet front-of-house: attract, cockpit canopy frame, difficulty select

## Problem

The cabinet boots attract → **SELECT-A-DEATH-STAR** → play. The clone jumps
straight from the attract screen into a wave-1 run (`startRun`, sim.ts:649) — the
whole difficulty-picker screen is missing, and with it the authentic start-wave
bonuses. sw7-4 / S-015 correctly REMOVED an invented 400k/800k *extra-shield*
threshold ladder (those numbers are NOT a recurring score mechanic). This story
reinstates the same numbers in their **correct home**: the one-time start bonus
banked when you pick a Death Star.

## Provenance ruling (1983 "Warp Speed" source, `~/Projects/star-wars-1983-source-text`)

Every fact below is from the primary MACRO-11 source. `.MAC` files are `.RADIX 16`,
but the score `.BYTE` tables are packed **BCD digit-pairs** (added by `ADUSCR`,
which `DAA`-adjusts) — read `20,00,00` as decimal **200000**, not hex. This is the
same reading the clone already uses for `TSCFRC` (Force bonus) and for the state.ts
comment sw7-4 left at line 185.

**1. The bonus table — `TSCBN` (WSGAS.MAC:526-530).**
```
                        ;NO BONUS FOR CHOOSING DETH STAR 0
TSCBN1: .BYTE 20,00,00  ;BONUS FOR CHOOSING DETH STAR 1   → 200,000
TSCBN2: .BYTE 40,00,00  ;BONUS FOR CHOOSING DETH STAR 2   → 400,000
TSCBN3: .BYTE 60,00,00  ;BONUS FOR CHOOSING DETH STAR 3   → 600,000
TSCBN4: .BYTE 80,00,00  ;BONUS FOR CHOOSING DETH STAR 4   → 800,000
```
So the FULL table is `[0, 200k, 400k, 600k, 800k]` indexed by the 0-based ROM wave
(`GM.WAV`); wave 0 banks nothing.

**2. How the bonus is banked — `SCRWAV` (WSGAS.MAC:327-343), called WSMAIN.MAC:1982.**
`SCRWAV` fires once (gated by `SC.FWV`, the "still on first wave" flag) and, for a
non-zero `GM.WAV`, adds `TSCBN[GM.WAV]`: `LDB GM.WAV / ASLB / ADDB GM.WAV`
(= 3×GM.WAV, the 3-byte stride) `/ LDX #TSCBN1-3 / ABX`. So the bonus is a pure
function of the STARTING wave the player selected.

**3. Which choices exist, and the four-vs-three resolution — `TDTH` + `PHESDS`
(WSMAIN.MAC:1017-1130), labels `TCMES.MAC:582-587`.** The shipped SELECT screen
draws **THREE** Death Stars (the `TDTH` table has 3 active `.WORD X,Y` rows; **two
rows are commented out** — the design once had five). The cursor→choice math
`TFR X,D / SUBD #TDTH / LSRB` (";CONVERT 0->0,4->2,8->4") maps the three stars to
`GM.WAV` = **0 / 2 / 4**. The on-screen labels are:
```
.MESS <SELECT A DEATH STAR>            ; title  (MS.DS1)
.MESS <FIRE LASER AT DESIRED DEATH STAR>
.MESS <EASY>   .MESS <MEDIUM>   .MESS <HARD>
```
So the reachable choices are **EASY→GM.WAV 0, MEDIUM→GM.WAV 2, HARD→GM.WAV 4**, and
their banked bonuses are `TSCBN[0/2/4]` = **0 / 400,000 / 800,000**.

> **⚠ ROM WINS over the epic's "200k/400k/600k/800k".** Those four numbers ARE the
> full `TSCBN` table (waves 1-4), but the SHIPPED three-star selector cannot reach
> waves 1 or 3 — **200,000 and 600,000 are unreachable** through the picker. The
> shipped EASY/MEDIUM/HARD banks **{0, 400k, 800k}**. Tests pin the ROM truth; the
> discrepancy is logged as a Delivery Finding. (Not a re-introduction of the S-015
> mechanic: S-015 was a recurring *score-threshold extra shield* — refuted; this is
> a one-time *selection* bonus with its own ROM evidence.)

**4. Starting wave — `GM.WAV` is 0-based; the clone's `wave` is 1-based
(`romWave0 = wave - 1`, the `forceBonusForWave` convention).** So EASY→wave **1**,
MEDIUM→wave **3**, HARD→wave **5**. (Corroboration: WSMAIN.MAC:1508/1548 special-case
`SP.WAV == 5-1`, "selected space wave five" — the HARD start.)

**5. The countdown — `PH.TIM` (WSMAIN.MAC:1019, 1046-1054).** Init `LDD #0100`
(0x100 = **256 game frames**); `PHESDS` decrements by 1 each frame; when it goes
negative → *"PLAYER DIDN'T DECIDE, START AT EASY"*: `GM.WAV←0`, start the game
(`PH$SG2`). At 20.508 Hz (`TICK_HZ`) that is ≈ **12.48 s**. The displayed digit is
`(PH.TIM<<3)>>8 = PH.TIM/32` → counts **8→0** (a shell detail; the "convert 0A-10
hex" branch is dead for the 256 start). Firing (`GN.SWE & FIREBT!THMBT`) while the
cursor is on a Death Star commits that choice EARLY.

## Scope
- **In scope (core, pure):** a new `'select'` game mode + state machine — armed on
  attract+start, a decrementing countdown, cursor→choice hover, fire-to-select,
  countdown-expiry default to EASY; sets the starting `wave` and banks the bonus into
  `score`; the run-start cues move to the select→playing edge.
- **In scope (shell):** render the SELECT-A-DEATH-STAR screen — the title, the FIRE
  instruction, the three EASY/MEDIUM/HARD labels.
- **Out of scope:** re-enabling the two commented-out Death Stars (200k/600k, waves
  2/4); the HARD-start "look at the size of that thing" speech (WSMAIN.MAC:1548); the
  exact ROM cursor geometry/countdown-digit glyph; deferring the bonus to first-wave
  completion (see deviation — the clone banks at selection).

## Acceptance Criteria

- **AC-1 — Attract + start opens the SELECT screen.** From `mode:'attract'`, an
  `input.start` step yields `mode:'select'` (NOT `'playing'`), with the countdown armed
  to `SELECT_COUNTDOWN_SECONDS` and the RNG untouched (framing consumes no randomness).
- **AC-2 — The countdown runs and expires to EASY.** In select, stepping decrements
  the countdown by `dt`; a neutral step short of the limit stays in select; once the
  countdown is exhausted with no choice the run begins at **EASY** (`wave 1`, `score`
  unchanged/0) — the ROM's "player didn't decide, start at EASY".
- **AC-3 — Fire over a Death Star selects it, banks the bonus, sets the wave.** With
  the cursor on a choice and `fire` held, the run begins `mode:'playing'`,
  `phase:'space'`, full shields: EASY→`wave 1`,`score += 0`; MEDIUM→`wave 3`,`score += 400000`;
  HARD→`wave 5`,`score += 800000`.
- **AC-4 — The bonus table is the ROM `TSCBN`.** `START_WAVE_BONUS` deep-equals
  `[0, 200000, 400000, 600000, 800000]`; the three `DEATH_STAR_CHOICES` map to indices
  0/2/4 so their reachable bonuses are `{0, 400000, 800000}` — 200,000 and 600,000 are
  present in the table but NOT reachable via any choice.
- **AC-5 — Selection requires a real fire on a real target.** Hovering a choice without
  fire does not select (stays in select, `hover` = that index); firing far off every
  Death Star does not select (`hover` = null, stays in select).
- **AC-6 — A run begun from select fires the run-start cues.** The select→playing edge
  (both fire-select and countdown-expiry) emits `player-spawn`, the `redFiveStandingBy`
  speech, and the space `music` track for the starting wave.
- **AC-7 — Purity / determinism.** The select machine takes time only via `dt` and no
  randomness; identical (state, input, dt) sequences produce deep-equal states, and the
  `core-purity` boundary scan stays clean.

---
_ACs and ruling authored by TEA (O'Brien) during RED, from the 1983 primary source._
