# Story Context: jt5-8

**The DUMB brain's wingbeat — linet recomputes every wake, and LNTOFP's forced glide is missing**

Epic: jt5 · Points: 5 · Priority: p3 · Workflow: tdd

---

## Problem

`linet` is joust's shared DUMB brain — the one every enemy runs before it is promoted, and
(measured by uf1-9, three seeds x 6000 frames of real `createGame` + `stepGame`) one of only
**two** brains that ever appear in end-to-end play. Its port is a pure function:

```ts
// plugins/joust/src/core/enemy.ts:358-363
export function linet(enemy: EnemyState): Decision {
  const pixelY = enemy.entity.posY >> 8
  const target = linetTarget(pixelY)
  const rising = enemy.entity.velY < 0
  return { dir: enemy.facing, flap: pixelY > target && !rising }
}
```

It recomputes its flap from position and velocity **every wake and latches nothing**, and
`withWingCadence` explicitly denies it a workspace (`enemy.ts:1227`; the comment at `:1040`
lists "short-range, null-target, shadow and linet wakes carry NO workspace").

The machine does not work that way. `LINET`'s wingbeat is a **two-state alternation with no
timer at all**:

```asm
; JOUSTRV4.SRC:3746-3748 — the flapping wake
LNTUP   LDD  #LNTOFP      GET OFF GROUND OR JUST FLAP
        STD  PJOY,U
        LDB  #1

; JOUSTRV4.SRC:3759-3762 — the NEXT wake, entered directly
LNTOFP  LDD  #LINET
        STD  PJOY,U
        CLRB
        BRA  LNTFLP
```

`LNTUP` parks `LNTOFP` in `PJOY,U`, so the next wake enters at `LNTOFP`, which **unconditionally**
clears the flap bit and hands control back to `LINET`. It never re-runs the lane decision. So the
machine **cannot flap on two consecutive wakes** — a forced glide wake follows every flap. Our port
has neither half and will flap again immediately whenever the condition still holds.

## What is already faithful — do not "fix" it

The lane DECISION is correct and was verified line-by-line at setup:

| ROM | Port |
|---|---|
| `:3733-3740` `CMPB #AOFFLn+AOFFUD / BLO` band, exclusive edge | `linetTarget`, `enemy.ts:346-350` |
| `:3741-3743` `SUBA PPOSY+1,U / BPL` — sunk BELOW the lane | `pixelY > target` |
| `:3744-3745` `LDA PVELY,U / BMI` — not already rising | `!rising` |
| `:3749-3757` `TST PFACE,U` — move in the facing direction | `dir: enemy.facing` |

Only the **alternation state around** the decision is missing.

## Technical approach — measured pointers, not design

- **The seam.** `stepEnemyDetailed` (`enemy.ts:1119-1168`) is the one wake pipeline:
  `homingWake` -> `steerWake` -> `seekWake` -> `withWingCadence` -> `runBrain` -> input/edge.
  `withWingCadence` is uf1-9's, and `enemy.ts:1227` is the exact line that clears `pjoy` for a
  linet enemy — that line is the current statement of "the dumb brain has no workspace".
- **The workspace already exists.** `PjoyState` (`enemy.ts:219`) is a discriminated union of
  `wing` / `interval` / `dwell`, carried at `enemy.pjoy` (`:197`). uf1-9 built it. Whether the
  dumb wingbeat is a fourth variant, a reuse of `wing`, or a separate field is **Dev's call** —
  this story does not prescribe it.
- **Flap level vs edge is already split** (uf1-9): `enemy.ts:1154-1165` derives `held` from the
  decision and `pressed` as its rising edge against `prevFlapHeld`. A forced-glide wake makes
  `held` false, which is what produces the `up` wing edge at `flight.ts:456`.
- **Promotion discards it.** `LNTSMT` (`:3764-3775`) does `LDX DSMART,X / STX PJOY,U / JMP ,X` —
  it overwrites the routine pointer wholesale, so no glide obligation survives promotion (AC3).

## Determinism — read this before writing a single pin

Landing this **will** move the jt2 seeded-replay digests: the wing-down hold selects the gravity
of the pair (`flight.ts:292`, `GRAVITY_WINGS_DOWN` vs `GRAVITY_WINGS_UP`), so halving the dumb
brain's flap rate changes flight paths.

Expect a blast radius **at least uf1-9's, and probably larger** — uf1-9 moved **21** pins for a
change to the SMART brains, and this story changes `linet`, the more heavily exercised of the two
brains that appear in real play. `sprint/archive/uf1-9-session.md` is required reading; the method
that worked there is in AC5: re-find each pin by sweeping for **its own precondition**, never by
nudging a number toward the new output. Two of uf1-9's pins had to change SEED because their
precondition had an empty solution set on the old one — expect the same shape.

## Scope

**In scope:** the dumb brain's `LNTUP`/`LNTOFP` alternation, its interaction with promotion, and
the determinism + audio-cue re-baseline that follows.

**Out of scope, and CLOSED — do not rebuild, do not re-derive:**

> ### The player-side `flapHeld` — measured at setup, already correct
>
> The story originally asked whether the player needs the enemy's level/edge treatment "or is
> already correct by a different route". **It is already correct, and has been since jt1-6.**
>
> - `shell/input.ts:44-45` — `flapHeld` is the LEVEL (`held.has(binding.flap)`), `flap` is its
>   rising edge (`flapHeld && !prevFlap`). `main.ts:193-200` threads `prevFlap` per player.
> - Faithful to the ROM: `P2SAM`/`P2NJMP` `:7256-7264` builds `CURJOY` as A=direction : B=raw
>   button LEVEL (`IS JUMP BUTTON PRESSED` / `INCB`).
> - Spent correctly: `flight.ts:292` selects gravity from `flapHeld`; `flight.ts:258` gates the
>   `ADDFLP` impulse on `flap`.
> - **Guarded** at `tests/shell-input.test.ts:74-91` ("flap is an EDGE, not a level"), and the
>   guard is **non-vacuous**: mutating `input.ts:45` to `flapHeld: flapHeld && !prevFlap` — the
>   old title's claim, verbatim — reddens exactly **2** tests (run at setup on a clean tree,
>   source restored, `git status` empty before and after).
> - The only producers of a non-neutral `PlayerInput` are `input.ts:45` (human) and
>   `enemy.ts:1162` (enemy, fixed by uf1-9). `frame.ts:315` and `demo.ts:325` supply
>   `NEUTRAL_INPUT` as a **fallback only**, and joust has no autopilot.
>
> Two claims in the story as filed were therefore **FALSE** and have been removed from the board:
> the title's "flapHeld still takes the press edge", and the description's "frame.ts's player path
> still builds its own input" (it *receives* the input from its caller).

## Acceptance Criteria

1. A dumb (linet) enemy cannot flap on two consecutive wakes: on the wake following any linet wake that flapped, its decision is flap=false — the ROM's LNTOFP forced glide (JOUSTRV4.SRC:3759-3762), reached because LNTUP (:3746-3748) parks LNTOFP in PJOY,U on the flapping wake.

2. That glide wake is UNCONDITIONAL — it does not re-run LINET's lane decision. A linet enemy still sunk below its lane and still not rising nevertheless yields flap=false on the glide wake, and control returns to the lane decision on the wake after (LDD #LINET / STD PJOY,U, :3759-3760). There is NO timer anywhere in this alternation.

3. The alternation is enemy STATE carried across wakes, and it does NOT survive promotion to a smart brain: LNTSMT (:3764-3775) overwrites PJOY,U wholesale with the smart routine, so a newly-promoted enemy begins its smart cadence carrying no leftover glide obligation.

4. The lane DECISION that already shipped is behaviourally unchanged: the sunk-below-lane and already-rising tests (:3741-3745) and the facing-direction move (:3749-3757) keep their current results, and linetTarget's exclusive band edge (:3733-3740) is untouched. Only the alternation state around the decision is new.

5. The jt2 seeded-replay determinism pins are DELIBERATELY re-baselined and recorded as intended: every moved pin is re-found by sweeping for its own precondition, NEVER by nudging a number toward the new output, and the bound is stated explicitly — which digests moved, which did not, and any pin that had to change seed because its precondition has an empty solution set on the old one (uf1-9 moved 21 pins this way; two changed seed).

6. The change to the enemy wing-flap CUE cadence is measured and stated, not discovered: the cue derives from the flapHeld transition (enemy.ts:1163), so forcing a glide wake after every dumb flap changes how often dumb enemies emit a wing sound. Whatever moves in the audio suite is explained as intended or shown to be untouched.

7. The player-side flapHeld is OUT OF SCOPE and stays green: shell/input.ts, main.ts's prevFlap threading and tests/shell-input.test.ts:74-91 are untouched, and the non-vacuity of that guard is preserved (mutating input.ts:45 to flapHeld := flapHeld && !prevFlap must still redden it). A regression there is a failure of this story, not a re-baseline.

---

_Hand-authored by SM at setup (the Agent tool is barred by this session's instructions, so
`sm-setup` was not spawned). The ACs above are reproduced **byte-exact** from
`sprint/epic-jt5.yaml` and have not been edited — verified by parsing, not by grep._

_Do not regenerate this file with `pf context create`; it would overwrite measured findings with
the raw epic description._
