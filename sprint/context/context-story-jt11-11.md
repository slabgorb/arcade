# Story jt11-11 Context

## Title
Enemy facing for ground velXIndex: enemy.ts stepEntity calls the 2-arg stepGround (no facing), so since jt11-3 a grounded enemy velXIndex is always +flyVel and a left-moving enemy takes off with a rightward airspeed. Thread the enemy own facing into its stepGround call (verify against the ROM enemy ground loop, which signs PVELX by PFACE like UPDNO2). Filed from jt11-3 review routing; the facing-less sign is deliberately unpinned in ground-momentum.test.ts pending this story.

## Metadata
- **Story ID:** jt11-11
- **Type:** story
- **Points:** 2
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** jt11 — Joust cabinet experience: start flow, HUD, landing physics, transporter cadence, lava shore, high-score UX
- **Filed from:** jt11-3 review routing

## Problem
`stepGround` (`plugins/joust/src/core/flight.ts:349`) takes an optional third
argument, `facing: -1 | 1`. jt11-3 made that argument the source of the sign on
the ground-momentum write (`velXIndex := flyVel`, negated when facing left — the
ROM's UPDNO2 `LDA 6,X / STA PVELX` followed by `NEG PVELX`). The player path
threads its facing in.

The enemy path does not. `stepEntity` (`plugins/joust/src/core/enemy.ts:1300`)
calls the **2-arg** form at `enemy.ts:1319`:

```ts
s = stepGround(s, input)
```

With `facing` undefined, `stepGround` takes the legacy branch — every non-zero
`dir` reads as forward (`onPlus`), and the maintained `velXIndex` is always
`+flyVel`. Two consequences for a grounded enemy:

1. A left-moving enemy accumulates a **rightward** `velXIndex`, so when it flaps
   it **takes off with an airspeed pointed the wrong way**.
2. The facing-relative reversal/skid chain (`onMinus` → SKIDR → PLANTZ 2) is
   **unreachable** for enemies, because a reversal is never recognised as one.

The enemy already carries the field the fix needs: `EnemyState.facing`
(`enemy.ts:177`, `PFACE` — +1 right, −1 left, written by the brain, e.g. BODIR).
`stepEntity` currently receives only `EntityState`, which has no facing field, so
the value must be threaded down from the caller (`enemy.ts:1670`) rather than
read off the entity.

## Ground truth to verify (do not skip)
The AC must be pinned to the **enemy** ground loop in `JOUSTRV4.SRC`, not
assumed by analogy. Confirm that the enemy's grounded update signs `PVELX` by
`PFACE` the same way `UPDNO2` does for the player, and cite it. If the ROM shows
the enemy path differs, the story's premise changes and that belongs in Delivery
Findings before any code moves.

## Technical Approach
_Routing-level only — TEA defines the RED tests, Dev picks the implementation._

- The change belongs in **`plugins/joust/src/core/enemy.ts`**: thread the
  enemy's own `facing` from the `stepEntity` call site (`enemy.ts:1670`) into
  `stepEntity`, and on to `stepGround` at `enemy.ts:1319`.
- **`flight.ts` is GENERATED — do not hand-edit it.** Its header and the epic's
  standing constraint both say so. `stepGround` already accepts the optional
  `facing`; no signature change is needed there.
- Core purity holds: `plugins/joust/src/core/` stays pure and clock-free
  (enforced by joust's own core-boundary test).
- `ground-momentum.test.ts:194-195` explicitly leaves the facing-less enemy sign
  **unpinned**, deferring to this story. That comment is now stale and should be
  replaced by the real assertion — leaving it is a documented lie about coverage.

## Acceptance Criteria
- **AC-1 — Sign follows facing.** A grounded enemy with `facing: -1` stepping
  under a non-zero `dir` maintains `velXIndex` as the new ground state row's
  `flyVel` **negated**; with `facing: +1`, the same magnitude positive.
  Magnitudes are unchanged from today for right-facing enemies (no regression).
- **AC-2 — Takeoff inherits the correct direction.** A left-facing grounded
  enemy that flaps takes off with a **leftward** airspeed, not a rightward one.
  This is the user-visible bug in the story title.
- **AC-3 — Reversal/skid reachable for enemies.** With facing threaded, a
  grounded enemy pushed **against** its facing takes the `onMinus` transition
  (the skid chain), as the player already does.
- **AC-4 — ROM citation.** The sign rule is cited to the **enemy** ground loop in
  `JOUSTRV4.SRC` by line, per the joust citation convention, not inferred from
  the player's UPDNO2 alone.
- **AC-5 — No `-0`.** Follow the existing precedent in `ground-momentum.test.ts`
  (see the note at :176-177): `flyVel * facing` leaks an `Object.is`-visible
  `-0` into standing left-facing frames and serialized replay fixtures. Whatever
  form the sign takes must not reintroduce it.
- **AC-6 — Stale deferral removed.** The "NOT pinned to a sign here" comment at
  `ground-momentum.test.ts:194-195` is replaced by the real assertion.
- **AC-7 — Green fleet.** `npx vitest run --project joust` and `npm run lint`
  pass; no other game's project is touched.

## Scope
- **In scope:** threading `facing` through `stepEntity` → `stepGround` in
  `enemy.ts`; the tests that pin the sign, the takeoff direction and the skid
  reachability; retiring the stale deferral comment.
- **Out of scope:** editing generated `flight.ts`; changing the player path
  (jt11-3 shipped it); the `ORRUN`/`PFRAME` animation-phase limitation
  documented at `flight.ts:340-347` (a separate, already-recorded finding);
  any change to enemy brain/facing-selection logic.

## Key Files
| File | Why |
|------|-----|
| `plugins/joust/src/core/enemy.ts:1300,1319,1670` | `stepEntity` + the 2-arg call + its caller |
| `plugins/joust/src/core/enemy.ts:177` | `EnemyState.facing` (`PFACE`) — the value to thread |
| `plugins/joust/src/core/flight.ts:349` | `stepGround` signature — READ ONLY, generated |
| `plugins/joust/tests/ground-momentum.test.ts:143-200` | AC-2 sweeps + the stale deferral at :194 |

---
_Written by SM (jt11-11 setup) from the sprint YAML plus context discovery. Line
numbers were accurate at setup time — re-anchor before citing._
