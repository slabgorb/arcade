# Story Context: jt9-38

**The egg wave deals TWELVE eggs and hatches WENEMY at a time — port the ROM's egg density (:2778-2822) and the NENEMY/WENEMY hatch gate (:3238-3242)**

Epic: jt9 · Points: 5 · Priority: p3 · Workflow: tdd

---

> ### RE-SCOPED AT SETUP — 2026-08-03, on the user's ruling
>
> This story was filed by jt9-9's Reviewer as a 3-point "model NENEMY, gate the hatch".
> Its ROM citations all verified. Three of its framing claims did not, and a fourth
> measurement showed the gate **as filed would have shipped dormant**. The user ruled to
> fold in the egg-wave density that makes the gate observable; points 3 -> 5, and the
> title was rewritten to name both halves.
>
> The story `description` in `sprint/epic-jt9.yaml` IS the corrected text — it was
> rewritten before this file was written, and this file is generated from it. The
> ORIGINAL filing text survives verbatim in `sprint/archive/jt9-9-session.md`
> (the "Filed, with story ids" section) and in this story's SM Assessment.
>
> **Nothing below restates the filing's uncorrected claims.** If you find a sentence
> anywhere that says the port "matures every settled egg however crowded the arena is",
> read CORRECTION 1.

---

## Problem

The ROM's settled-egg hatch has two coupled halves, and the port has neither.

**(1) Density.** An egg wave deals **twelve** eggs, hardcoded, independent of the wave
row. `WAVEGG` places six one-per-ledge over the six `EGLEDG` entries
(`LDA #6 / STA PWREGA,U` "6 EGGS ON EACH LEDGE", `JOUSTRV4.SRC:2778-2779`; the `5$` loop
`:2780-2804`; `EGLEDG`'s six `FCB` rows LEVEL0..LEVEL5 at `:2910-2915`), then re-primes
the counter (`LDA #6 / STA PWREGA,U` "6 MORE EGGS TO GO", `:2805-2806`) and scatters six
more across the 69-slot `EGPTBL` (the `6$` loop `:2807-2822`). Neither `6` is derived from
anything — both are literal immediates.

**(2) The gate.** After the wait expires (`DEC PJOYT,U / BNE EGGLN2`, `:3236-3237`)
`EGGLND` does not hatch unconditionally. It re-primes the timer to 1
(`INC PJOYT,U` "SET = 1,", `:3238`), reads `LDA NENEMY / CMPA WENEMY / BHS EGGLN2`
(`:3239-3241`) — "ENOUGH ENEMIES IN THIS WAVE?" — and goes back round the loop if the wave
already holds its quota, incrementing `NENEMY` (`:3242` "1 MORE ENEMY COMMING UP") only on
the pass that actually hatches. `WENEMY`'s own comment says what it is: **"NUMBER OF
ENEMIES TO HATCH AT A TIME"** (`:2759`).

### Why the two halves are ONE story, and this is the measurement that re-scoped it

`WENEMY` is meaningless unless more eggs exist than `WENEMY`. Measured across **all
eighteen** egg waves (`status: 0x08`, every fifth wave from 5), the port's `spawnWaveEggs`
deals `bounders + hunters + lords` eggs and the ROM's `WENEMY` equals that same number in
every one of them — because every egg row carries exactly one non-zero ground nibble:

| egg waves | row | port eggs dealt | ROM WENEMY |
|---|---|---|---|
| 5 | 6 bounders | 6 | 6 |
| 10 | 8 bounders | 8 | 8 |
| 15, 20, 25, 30 | 6 hunters | 6 | 6 |
| 35, 40, 45, 50, 55 | 8 hunters | 8 | 8 |
| 60, 65, 70, 75 | 6 lords | 6 | 6 |
| 80, 85, 90 | 8 lords | 8 | 8 |

Population is conserved across the port's cycle — a death removes one enemy and that egg's
hatch restores one — so `NENEMY` tops out at the number of eggs dealt, and the last egg
hatches at `NENEMY = WENEMY - 1`. **`NENEMY >= WENEMY` is unreachable in the port as it
stands.** Building the gate alone would ship a correct guard that no seeded run can ever
exercise: the `guard-must-be-mutation-tested` / "ships as scenery" shape, and worse than
sw8-19's, because it would be unobservable in the *game*, not merely in the tests.
**Twelve eggs against a quota of six is what makes it bite.**

---

## ⚠ CORRECTIONS to the filing — all measured at setup, all load-bearing

**CORRECTION 1 — `WENEMY` is 255 in every NON-egg wave, so the gate is inert outside an
egg wave.** `WNRM` does `LDA #255 / STA WENEMY` **"MAXIMIM ENEMIES FOR A NORMAL WAVE"**
(`:1991-1992`), and `WNRM` is reached on every wave advance — all four routes converge on
it (`:1937`, `:1952`, `:1955`, `:1957`). Only the egg-wave setup at `:2759` overwrites it.
So the filing's headline sentence — "this port matures every settled egg the instant its
timer runs out however crowded the arena is" — describes **faithful** behaviour for every
normal wave, which is exactly where jt9-9's kill-eggs live. **Do not gate a normal wave.**
The resolver must return 255 there (AC-1).

**CORRECTION 2 — "WENEMY is already modelled in the port" is FALSE.**
`grep -rn "WENEMY\|wenemy" plugins/joust/src` returns **zero** hits. What is modelled is
the four decoded WAVTBL nibbles on `WaveRow` (`wave.ts:36-42`). The ROM *derives* `WENEMY`
from them by a three-way branch at `:2744-2759`: if `WBOUND` (byte0) is non-zero take its
LOW nibble when that is non-zero (hunters), else its HIGH nibble (bounders); if byte0 is
zero take `WLORD`'s (byte1's) HIGH nibble (lords). That derivation is **unwritten work**,
not a lookup.

**CORRECTION 3 — the filing's cited span `:3239-3242` starts one line too late.**
`:3238 INC PJOYT,U` **"SET = 1,"** is the line that makes the deferral a **one-nap
re-poll**: `PJOYT` is set to 1 before the population test, so the branch back to `EGGLN2`
costs exactly one `PCNAP 12` (`:3227`) — twelve display frames, which is the port's own
`EGG_WAIT_NAP_FRAMES` (`demo.ts:620`). Without `:3238` the branch would `DEC` a zero timer
to `$FF` and wait 255 more naps. The deferral is **neither** a fresh `EGGWT` wait **nor** a
per-frame spin. This is what AC-5 pins.

### What verified EXACTLY as filed — do not re-check these

Every ROM line and comment the filing quoted: `:3236-3237`, `:3239`, `:3240`, `:3241`,
`:3242`, `:2759`, `:2761`. Also "NENEMY has no port equivalent yet" — the only occurrence
anywhere in `plugins/joust/src` is `assertWaveEndClean`'s `activeEnemies` **parameter**
(`wave.ts:389`), which is a wave-boundary oracle, not a running count. And "NOT A
REGRESSION, and jt9-9 did not make it worse" holds: before jt9-9 kill-eggs never matured
at all.

---

## Technical Approach — measured pointers, not design

**`NENEMY`'s real semantics, and why a DERIVED count is the right model.** Six writers in
the ROM: `INC` at `:460` (`ATTEMY`, attract mode only), `INC` at `:2193` (`WCREATE`, "1
MORE ENEMY ON THE SCREEN"), `INC` at `:3242` (the hatch commit — taken **before**
`VCUPROC` creates the bird at `:3248`, so it is a reservation), `DEC` at `:2965` (`DEATH3`,
"DECREMENT NBR OF ENEMIES ON THE SCREEN"), `DEC` at `:3080` (the player collected the egg
while a remount bird was already inbound — conditional on `LDY PDIST,X / BEQ EGGWAK`), and
`CLR` at `:975` ("NO ENEMIES ARE ON THE SCREEN"). A count derived from the live process
list satisfies all six **by construction**; the port hatches atomically (one `flatMap`), so
the `:3242` reservation window is zero frames. A stored counter would have to reproduce
`:3080` by hand.

**Baiters are already excluded, for free.** Baiter creation `INC`s `NBAIT` (`:2111`) and
never `NENEMY`. In the port, baiters and pterodactyls are `kind: 'ptero'` processes
(`demo.ts:1331` — `p.kind === 'ptero' && p.baiter === true`), not `kind: 'enemy'`. So the
ROM's population and a `kind === 'enemy'` filter agree without any extra work. AC-3 pins
that as a property that must **stay** free.

**The sites.**

| what | where |
|---|---|
| the hatch loop this story gates | `plugins/joust/src/core/demo.ts:1443-1457` (the `processes.flatMap` self-clear) |
| the nap quantum | `EGG_WAIT_NAP_FRAMES = 12`, `demo.ts:620` |
| the egg-wave complement to replace | `spawnWaveEggs`, `demo.ts:669-679` |
| the wave-type predicate (precedent, already used here) | `dispatchWaveType(row.status, {p1,p2}) === 'egg'`, `demo.ts:732-733` |
| the decoded row | `WaveRow` / `waveRowAt`, `wave.ts:32-48`, `:182-190` |
| placement pads | `PADS` (four), `transporter.ts:127-132` |
| the wave-clear gate AC-7 warns about | `demo.ts:1481-1484` |

**Placement is a DECISION, not a transcription.** The ROM spreads its twelve over six
ledges plus a 69-slot `EGPTBL`; the port has **four** pads and `spawnWaveEggs` places at
`PADS[i % PADS.length]`, so twelve eggs stack three per pad. Record what the port does and
why in a comment at the site (AC-2). Do not ship the stacking as if it were the ROM's
layout.

---

## Scope

**In scope:** a `WENEMY` resolver (AC-1); the twelve-egg density (AC-2); a `NENEMY`
population model (AC-3); the hatch gate with identity-asserted deferral and its positive
control (AC-4); the one-nap re-poll cadence (AC-5); the `PWHCH` disposition in writing
(AC-6); the re-baseline as its own commit plus an egg-wave termination check (AC-7).

**Out of scope:** the `EGGWT`/`EGGWT2` wait itself (jt9-9 shipped it — do not re-derive
it); anything about normal-wave kill-egg maturation, which CORRECTION 1 shows is already
faithful; `ROW_DISPOSITION` guard generality (that is **jt9-39**, filed by the same
Reviewer).

---

## Open question handed over, NOT resolved at setup

`LDA #2 / STA PWHCH,U` **"NUMBER OF PRE-MATURE EGG HATCHINGS"** (`:2776-2777`), consumed in
`CREGG` at `:2888-2894` (`DEC PWHCH / BMI / VRAND / MUL / NEGA / ADDA PJOYT,Y`), gives two
of the twelve eggs a randomly-shortened hatch time. It is the **third** unmodelled piece of
the same block, it sits between the two halves this story builds, and **SM did not decide
it.** The check is named and cheap: read `:2888-2894` and see whether the shortened time is
computable without disturbing the wave's RNG stream. The recommendation is OUT — it
consumes the RNG, so folding it in moves the re-baseline a second time — but AC-6 requires
the decision be stated either way, and a descope must end with a filed story id.

## Environment note

The dev port **5270 is held by THIS checkout** (`a-1`), verified at setup with
`lsof -nP -iTCP:5270 -sTCP:LISTEN -t` then `lsof -a -p <pid> -d cwd`. Nothing in this story
needs a browser — it is pure `src/core` — but if you serve, that server is yours.

Baseline at setup: `npx vitest run --project joust` → **2577 passed / 2577**, 108 files.

---

## Acceptance Criteria

Reproduced verbatim from `sprint/epic-jt9.yaml` — this section is GENERATED from
`yaml.safe_load(...)['acceptance_criteria']`, so it is byte-identical to the YAML by
construction and has not been hand-edited.

1. AC-1 WENEMY IS DERIVED, AND IT IS 255 OUTSIDE AN EGG WAVE. A pure helper resolves a wave's WENEMY exactly as the ROM does: 255 for any NON-egg wave (LDA #255 / STA WENEMY "MAXIMIM ENEMIES FOR A NORMAL WAVE", WNRM JOUSTRV4.SRC:1991-1992, reached on every wave advance via :1937/:1952/:1955/:1957), and for an EGG wave the three-way nibble select of :2744-2759 - WBOUND's LOW nibble when non-zero, else WBOUND's HIGH nibble, else WLORD's HIGH nibble. Guarded on one wave per branch (wave 5 bounders, wave 15 hunters, wave 60 lords) AND on at least one non-egg wave returning 255. MUTATION: making the non-egg path return the egg-wave value must redden a named test.

2. AC-2 THE EGG WAVE DEALS TWELVE EGGS, INDEPENDENT OF THE WAVE ROW. spawnWaveEggs deals the ROM's twelve - six one-per-ledge over EGLEDG's six entries (LDA #6 / STA PWREGA,U, JOUSTRV4.SRC:2778-2779, the 5$ loop :2780-2804, EGLEDG LEVEL0..LEVEL5 :2910-2915) then six more scattered over the 69-slot EGPTBL (LDA #6 / STA PWREGA,U "6 MORE EGGS TO GO", :2805-2822) - rather than the wave's ground complement. Pinned on BOTH a 6-nibble egg wave and an 8-nibble one (waves 15 and 10) so a complement-shaped regression reddens on each. The port's placement across four PADS (transporter.ts:127-132) against the ROM's six ledges plus 69 slots is a PORT DECISION and is stated as one in a comment at the site, not shipped as if it were the ROM's layout.

3. AC-3 NENEMY IS THE LIVE ENEMY POPULATION, AND IT EXCLUDES BAITERS AND PTERODACTYLS. Modelled from the live process list rather than as a stored counter, which satisfies all six ROM writers by construction (INC :460 attract-only, INC :2193 WCREATE, INC :3242 the hatch commit, DEC :2965 DEATH3, DEC :3080 egg collected with a remount bird already inbound, CLR :975). A guard asserts a live baiter or pterodactyl does NOT count toward the population - the ROM keeps them on a separate NBAIT (INC NBAIT :2111, never NENEMY) and the port matches for free because both are kind ptero processes (demo.ts:1331), so the guard pins a property that is currently free and must stay free.

4. AC-4 A WAVE AT QUOTA DEFERS A MATURED EGG, AND IT IS THE SAME EGG AFTERWARDS. At the exact frame the gate fires, assert by PROCESS IDENTITY that the egg is still there - that id, still a settled egg - and never by a count: jt9-9's Reviewer found a count assertion passing on a REGENERATED egg (a permadeath egg hatched, its bird died, and the NEW egg satisfied length === 1). Ship the POSITIVE CONTROL in the same test: the same fixture one enemy BELOW quota does hatch on that same frame, so a gate that defers everything cannot pass.

5. AC-5 THE DEFERRAL RE-POLLS ONCE PER NAP - TWELVE FRAMES - NOT ONCE PER WAIT AND NOT EVERY FRAME. INC PJOYT,U "SET = 1," (JOUSTRV4.SRC:3238) re-primes the timer to 1 BEFORE the population test, so the branch back to EGGLN2 costs exactly one PCNAP 12 (:3227) - twelve display frames, the port's own EGG_WAIT_NAP_FRAMES (demo.ts:620). Without it the branch would DEC a zero timer to $FF and wait 255 more naps. Assert the gap between two consecutive re-checks is 12 frames, and redden TWO mutants by name: one that re-primes the full EGGWT wait, and one that re-checks on the next frame.

6. AC-6 THE PWHCH DISPOSITION IS RECORDED IN WRITING, AND IF DESCOPED IT IS FILED. LDA #2 / STA PWHCH,U "NUMBER OF PRE-MATURE EGG HATCHINGS" (JOUSTRV4.SRC:2776-2777), consumed in CREGG at :2888-2894 (DEC PWHCH / BMI / VRAND / MUL / NEGA / ADDA PJOYT,Y), gives two of the twelve eggs a randomly-shortened hatch time. It is the third unmodelled piece of the same block and SM did not decide it. TEA states explicitly whether it is in scope; the recommendation is OUT (it consumes the RNG, so folding it in moves the re-baseline a second time). If out, it ends with a filed story id - SM owns that at finish, before pf sprint story finish archives the session.

7. AC-7 THE DETERMINISM RE-BASELINE LANDS AS ITS OWN COMMIT AND ITS NUMBERS ARE RE-FOUND, NOT NUDGED. Per this epic's standing rule. Re-run the seeded sweeps and take the moved fixtures from that run rather than pasting whatever the new code prints; name in the commit message which seeds moved and why. Separately, confirm a seeded EGG WAVE still CLEARS with twelve eggs against a quota of six - the wave-clear gate wants no enemies AND no eggs (demo.ts:1481-1484) and now has twice as many eggs to get through. That is a termination property, nothing currently asserts it, and a stall would look like a hung demo rather than a failing test.

---

_Hand-authored by SM at setup (2026-08-03) after measuring the filing's claims. **Do not
regenerate or overwrite this file** — `pf context create` would render the epic
`description` and drop every correction above._
