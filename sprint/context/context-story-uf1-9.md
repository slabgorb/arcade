# Story Context: uf1-9

**Title:** joust DYTBL cadence rows — wire the wing-flap timer, the decision timer and the up-flight VY gates (11 rows)
**Epic:** uf1 — Unwired features (2026-07-28 fleet sweep)
**Points:** 5 · **Priority:** p3 · **Workflow:** tdd · **Repos:** arcade

> **Authored by SM, not generated.** `pf context create` renders the epic YAML `description`
> verbatim into `## Problem`, and that description carries five measured defects (below).
> DO NOT REGENERATE OR OVERWRITE THIS FILE.

---

## ⚠ CORRECTIONS — the description was measured on 2026-08-02, and five claims are wrong

The epic YAML description is reproduced in full under *Original description* below, unedited, so
you can see what was filed. These five corrections outrank it. Everything **not** listed here
verified — see *What verified* — so do not re-run that sweep.

**C1 — `smartDecision` no longer exists.** The description names it four times as the function
that "returns a fresh boolean flap every step". `uf1-8` (commit `2346bed`, GREEN) removed it and
split it into `boundr()`, `b2undr()` and `shadow()` behind a `runBrain()` dispatcher
(`plugins/joust/src/core/enemy.ts:478`, `:488`, `:514`, `:722`). Verified: `grep -rn smartDecision
plugins/joust/src/` returns **nothing** — the name survives only in test comments, docs and other
stories' prose. The description's staging advice ("smartDecision tests seek-up FIRST and the brake
only fires at velY >= $0100 >= 0") therefore describes a function that is gone; **re-verify that
branch order against `pursue()` before relying on it.** The underlying hazard is real and
`tests/difficulty-wiring.test.ts` still carries the fix (see *What verified*), but the mechanism
sentence around it is stale.

**C2 — SHCLTM is NOT a "TIME UNTIL NEXT DECISION" row.** The description groups five rows as "the
DECISION timer BOLETM :3909, HULETM :4060, SHLETM :4316, SHUPTM :4283, SHCLTM :4375 (each 'TIME
UNTIL NEXT DECISION')". Measured: **four** carry that exact ROM comment. SHCLTM's comment at
`:4375` is a bare `#8`, and its context is a different mechanism entirely:

```
:4373| SHDICL	LDD	#SHAV		SLOW DOWN!!! GOING INTO A CLIFF
:4374| 	STD	PJOY,U
:4375| 	LDA	SHCLTM		#8
:4376| 	STA	PJOYT,U
:4377| 	LDB	#1
```

It is the shadow lord's **cliff-avoidance brake dwell**. The misgrouping has already propagated
into the shipped inventory — `ROW_DISPOSITION` in `src/core/difficulty.ts:340` labels SHCLTM
`missing: DECISION`. AC4 corrects both.

**C3 — the "free check" fails for 2 of the 11 rows.** The description promises "Each row's GA1
column 1 equals the pre-DYTBL immediate in its own ROM comment … so a correct port reproduces the
old constant at wave 1 — the same free check uf1-2 used". True for **nine**. The two exceptions:

| Row    | DYTBL `starts[1]` (GA1 col 1) | ROM comment immediate | Match |
|--------|-------------------------------|-----------------------|-------|
| SHLETM | `$0015` = 21                  | `#8+1` = 9            | ✗     |
| SHUPTM | `$000A` = 10                  | `#8+1` = 9            | ✗     |

Both measured twice — from `JOUSTRV4.SRC:7330`/`:7329` and from the already-shipped decoded table
at `difficulty.ts:123`/`:122`, which agree. **A blanket eleven-row sweep will redden on two
correctly-ported rows.** AC6 requires the exclusion be asserted by name, not silently skipped.
(The description's two worked examples, BOUPWD start 2 and BOUPWU start 8, are both correct.)

**C4 — HUUPVY and SHUPVY are not a matched pair.** The description calls them "the up-flight VY
gates" as one item. They are gated completely differently:

```
:4174| B2UP11	DEC	PJOYT,U		TIME TO FLAP WINGS      ← hunter: timer-expiry gated
:4175| 	BGT	B2UP1B
:4176| 	INC	PJOYT,U                                 ← RE-ARMS when the VY test fails
:4177| 	LDD	PVELY,U
:4178| 	CMPD	HUUPVY		#-$0100

:4269| SHUP1	LDD	#SHADOW		FLAP WINGS              ← shadow: no timer guard at all
:4270| 	STD	PJOY,U
:4271| 	LDD	PVELY,U
:4272| 	CMPD	SHUPVY		#-$0200
```

That `INC PJOYT,U` at `:4176` is load-bearing: when the hunter's timer expires but it is rising too
fast, the timer is restored to 1 so it retries on the **next wake** instead of waiting a full
cadence. A port that drops the INC gets a full re-wait. AC5 pins the difference.

**C5 — stale path.** `joust/src/core/enemy.ts` → `plugins/joust/src/core/enemy.ts`. The epic
description already notes this applies to every story in the epic.

---

## 🔨 USER RULING (2026-08-02) — uf1-9 owns the PJOYT latch

`uf1-9` and **`jt5-8`** ("The enemy's wing-down LATCH — our brains recompute each wake and latch
nothing", jt5, 5pt, p3, tdd, `backlog`) both propose to build the same `PJOYT` wing latch. jt5-8's
description cites `BOUPWD :3864-3865`, `BOUPWU :3894` and `DYTBL :7314-7315` by line, and names the
same risk this story does (it "MOVES EVERY jt2 SEEDED-REPLAY FINGERPRINT").

**Why it could not be split:** all **nine** of this story's timer rows write `PJOYT` — the four
wing rows *and* all five decision timers (`STA PJOYT,U` at `:3910`, `:4061`, `:4284`, `:4317`,
`:4376`). uf1-9 needs the latch regardless of who "owns" it.

**Ruling:** uf1-9 builds `PJOYT` and wires all 11 rows. At finish, SM re-scopes jt5-8 to what
actually remains — the **dumb** brain's wingbeat (`LNTUP :3746-3748` / `LNTOFP :3759-3762`, "one
wake down, next wake up", which is not a DYTBL row) and the `flapHeld: decision.flap` edge-vs-level
fix at `enemy.ts:540`. **jt5-8 is not yours to edit** — do not touch it; SM owns that at finish.

---

## What VERIFIED — do not re-run this sweep

Measured 2026-08-02 against `reference/williams-source/joust/JOUSTRV4.SRC` (8139 lines):

- **All 12 cited ROM line numbers are byte-exact**, including `:3800 LBLT BOUNUP`.
- **"single ROM consumers" holds for all 11 rows.** Each label appears exactly twice in the whole
  file — its `DYWORD` definition at `:73xx` and one consumer. No continuation rows, no second
  reader. (This was checked deliberately: the `rom-table-continuation-bit` trap does not apply.)
- **All four wing rows really are `LDA <row>` / `STA PJOYT,U`** on consecutive lines
  (`:3864-3865`, `:3894-3895`, `:4047-4048`, `:4182-4183`). All five decision rows store to
  `PJOYT` too (`:3909-3910`, `:4060-4061`, `:4283-4284`, `:4316-4317`, `:4375-4376`).
- **`ROW_DISPOSITION` lists all 11 with `owner: 'uf1-9'`** (`difficulty.ts:331-342`) and every ROM
  line in it matches the source.
- **The seam and the column semantics.** `DYWORD MACRO START1,START2,START3,INCRE,ENDV,TIM1,TIM2,
  TIM3` (`:210`); GA1 buckets 0-3/4-6/7+ → start column 0/1/2 (`:930-939`), **GA1 default 5 → column
  1**; wave 1 reads the start unwalked (`difficulty.ts` header, CIA→IWAVE2 at `:1883`). So "GA1
  column 1" == `starts[1]` == the wave-1 value.
- **`knightsBelowTheBuzzards` and `brakeDecidingFrames` exist** in
  `plugins/joust/tests/difficulty-wiring.test.ts` (`:202`, `:237`) — the staging fix to copy is
  genuinely there, notwithstanding C1.
- **Prerequisites all `done`:** `jt8-1` (aggro/SELPLY), `uf1-2` (the seam), `uf1-8` (the ten seek
  rows).

## Open question SM could not settle — hand it forward as a claim, not a fact

The bounder's wing latch (`BOUP1`/`BOUP2`, `:3855-3899`) has **no VY gate**; the hunter's
(`B2UP1`, `:4174-4185`) gates the same flap on `HUUPVY`. SM did **not** determine whether that
asymmetry is deliberate 1982 design or an artifact of the hunter being the later-written brain.
It matters only if TEA is tempted to unify the two latches behind one helper — if it is
deliberate, unifying them would silently give the bounder a gate the machine never had. **Identify
which before sharing code between them.** SM asserts nothing here.

## Environment note

**Dev port 5270 is held by the `a-2` checkout** (`node` pid 11580, cwd `/Users/slabgorb/Projects/a-2`),
not this one. This story is pure-core sim work with no visual AC, so it should not matter — but if
you do need to serve, use `npx vite --port 5290 --strictPort` and **do not kill a-2's server**.

## Acceptance Criteria

Reproduced verbatim from `sprint/epic-uf1.yaml`. These were authored by SM from the measurements
above (the story arrived with `acceptance_criteria: null`), and they have not been edited since.

1. The bounder and hunter hold a WING-CADENCE LATCH on a PJOYT-equivalent countdown (JOUSTRV4.SRC:3860-3899 bounder, :4174-4185 hunter): wings stay DOWN for the wing-down hold and UP for the wing-up hold, alternating via the PJOY state pointer, instead of being recomputed each wake. The held LEVEL (not the press edge) reaches the flight pipeline, so a wing-down hold selects its gravity for the whole duration.
2. All four wing-cadence values are resolved per-wave through the uf1-2 seam (difficulty.waveValue): BOUPWD :3864 and BOUPWU :3894 (bounder), HUUPWD :4182 and HUUPWU :4047 (hunter). Each is an LDA <row> / STA PJOYT,U pair in the ROM.
3. The four level-flight DECISION timers reload the same countdown at their decide points and force a re-decide on expiry: BOLETM :3909, HULETM :4060, SHUPTM :4283, SHLETM :4316 — these four, and only these four, carry the ROM comment TIME UNTIL NEXT DECISION.
4. SHCLTM :4375 is wired as what the ROM makes it — the cliff-avoidance brake dwell at SHDICL (:4373-4377, LDD #SHAV / SLOW DOWN!!! GOING INTO A CLIFF) — and NOT as a decision timer. Its ROW_DISPOSITION entry in src/core/difficulty.ts, which currently mislabels it missing: DECISION, is corrected in the same change.
5. The two up-flight VY gates are ported as the DIFFERENT shapes they are, and a test pins the difference: HUUPVY :4178 is consulted only at timer expiry and RE-ARMS the timer via INC PJOYT,U (:4176) when the comparison fails, so the hunter retries next wake rather than waiting a full cadence; SHUPVY :4272 is consulted on every entry to SHUP1 (:4269-4275) with no timer guard at all.
6. The wave-1 free check is asserted for the NINE rows where it actually holds (GA1 column 1 == the pre-DYTBL immediate in that row own ROM comment), and SHLETM and SHUPTM are EXCLUDED BY NAME with their measured divergence recorded: SHLETM starts[1] is $0015 (21) against a comment of 8+1 (9), SHUPTM starts[1] is $000A (10) against 8+1 (9). A blanket all-eleven sweep is a defect, not a stronger test.
7. All 11 rows flip from no-consumer-yet to wired in ROW_DISPOSITION with owner uf1-9, the independent byte gate in tests/difficulty-source.test.ts stays green, and the jt2 seeded-replay determinism digests are DELIBERATELY re-baselined with the re-baseline recorded as intended — the wing hold changes the shape of enemy flight, so the jt2 bar is expected to move.

## Technical pointers (measured locations, not design)

Design is TEA's and Dev's. These are the files the measurements landed in:

| What | Where |
|---|---|
| The three smart brains + dispatcher | `plugins/joust/src/core/enemy.ts:478` `boundr`, `:488` `b2undr`, `:514` `shadow`, `:722` `runBrain` |
| `flapHeld: decision.flap` (the edge-vs-level line jt5-8 names) | `plugins/joust/src/core/enemy.ts:540` region |
| The per-wave seam | `plugins/joust/src/core/difficulty.ts` — `waveValue` |
| The decoded 28-row table | `plugins/joust/src/core/difficulty.ts:107-124` |
| `ROW_DISPOSITION`, the 11 uf1-9 rows | `plugins/joust/src/core/difficulty.ts:331-342` |
| Independent byte gate (re-derives the rows from source) | `plugins/joust/tests/difficulty-source.test.ts` |
| Staging helpers to copy | `plugins/joust/tests/difficulty-wiring.test.ts:202`, `:237` |
| Gravity split the wing hold selects | `plugins/joust/src/core/flight.ts:292` region — `GRAVITY_WINGS_DOWN` / `GRAVITY_WINGS_UP` |
| ROM source | `reference/williams-source/joust/JOUSTRV4.SRC` |

**Purity:** `src/core/` is the pure deterministic sim — no clock, no ambient entropy, no browser
surface. The jt1-7 purity scanner sweeps these files **including comments**, so avoid writing
`window.` or `document.` even in prose.

---

## Original description (unedited, as filed — see the corrections above)

Eleven DYTBL rows drive per-wave TIMING that joust/src/core/enemy.ts does not model: the buzzard has no wing-flap cadence timer and no 'time until next decision' timer at all — smartDecision returns a fresh boolean flap every step, where the ROM gates flapping on PJOYT. The rows and their single ROM consumers: the WING cadence BOUPWD :3864 ('#2'), BOUPWU :3894 ('#8'), HUUPWD :4182 ('#2'), HUUPWU :4047 ('#8') — each 'LDA <row> / STA PJOYT,U', wing-down and wing-up hold times; the DECISION timer BOLETM :3909, HULETM :4060, SHLETM :4316, SHUPTM :4283, SHCLTM :4375 (each 'TIME UNTIL NEXT DECISION'); and the up-flight VY gates HUUPVY :4178 ('CMPD HUUPVY  #-$0100') and SHUPVY :4272 ('CMPD SHUPVY  #-$0200'). Each row's GA1 column 1 equals the pre-DYTBL immediate in its own ROM comment (BOUPWD start 2, BOUPWU start 8), so a correct port reproduces the old constant at wave 1 — the same free check uf1-2 used. The wing timer is the substantial build here: it changes the shape of enemy flight, so expect a real determinism blast radius on the demo replays, and budget for re-baselining rather than assuming the jt2 bar holds. uf1-2 shipped the seam (difficulty.waveValue), the wave threading, and the ROW_DISPOSITION inventory that lists these eleven as owned here. jt8-1 (the aggro subsystem, joust#39) CUTS BOTH WAYS FOR THIS STORY, and the split is by branch. YOUR UP-GATES ARE ENABLED BY IT: HUUPVY (:4178) and SHUPVY (:4272) sit on the B2UNUP/SHUP up-seek path, reached only when SELPLY finds a targetable player ABOVE the buzzard (:3800 'LBLT BOUNUP'). Before jt8-1 frame.ts stepped every enemy with NO player, so that whole branch was unreachable in production and these two rows would have had nowhere to land; jt8-1 is a prerequisite, not an obstacle. YOUR CADENCE ROWS ARE NOT: BOUPWD/BOUPWU/HUUPWD/HUUPWU and the BOLETM/HULETM/SHLETM/SHUPTM/SHCLTM decision timers sit on both paths, so a full-cabinet probe of a DOWN-path row (or of anything gated behind the down-seek brake) must stage the region where the brake decides — smartDecision tests seek-up FIRST and the brake only fires at velY >= $0100 >= 0, so a quarry above pre-empts it unconditionally. This broke uf1-2's two end-to-end tests on the jt8-1 merge; tests/difficulty-wiring.test.ts carries the fix to copy (knightsBelowTheBuzzards + brakeDecidingFrames).
