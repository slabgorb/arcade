---
story_id: "tp1-29"
jira_key: "tp1-29"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-29: Give an enemy a STABLE slot id — the port has none, and at least one ROM rule (MAYBLR's parity gate) cannot be ported faithfully without it

## Story Details
- **ID:** tp1-29
- **Jira Key:** tp1-29
- **Workflow:** tdd
- **Stack Parent:** none
- **Type:** refactor
- **Priority:** p3
- **Points:** 3

## Workflow Tracking
**Workflow:** tdd
**Phase:** approved
**Phase Started:** 2026-07-18T13:32:53Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| red | 2026-07-18T13:32:53Z | - | - |

## Acceptance Criteria

1. An enemy carries a stable slot id, assigned at spawn and unchanged for its lifetime — it must NOT be its index in s.enemies, and it must survive the death of any other enemy. A test kills an earlier enemy and proves a later one's id did not move.

2. MAYBLR's gate is implemented on that id and chases on an ODD index, per ALWELG.MAC:2157-2160 (`TXA / LSR / BCC LEFRIT / JSR FUCHPL`) — NOT the EVEN one the ROM's own comment claims. Cite the branch, not the comment.

3. tp1-25's deviation D2 is retired. Its behavioural tests (tests/core/tp1-25.fuseball-chase.test.ts) must be re-examined, NOT weakened: they pin a lone fuseball chasing at waves 18/49/100, which under a parity gate depends on that fuseball's slot. Make the test's fixture explicit about the slot rather than deleting the assertion.

4. npm test -- citations stays green and `node tools/audit/reanchor-citations.mjs` reports 0 lost.

## Key Context

**Problem:** The ROM indexes invaders by a stable slot in the fixed INVAY array. The port uses a spliced array (s.enemies.filter((_, i) => !deadEnemies.has(i))), so an enemy's index shifts whenever an earlier enemy dies. Any ROM rule keyed on invader index cannot be ported faithfully. MAYBLR's parity gate (chases only on ODD index) is blocked without a stable slot id.

**Files to touch:**
- src/core/sim.ts (enemy spawn, deadEnemies handling)
- src/core/enemies/interpreter.ts (jfuseup / FUCHPL / LEFRIT — parity gate goes here)
- Enemy type definition (add stable slot id field)
- tests/core/tp1-25.fuseball-chase.test.ts (re-seat test fixture to explicit slot)
- tests/core/tp1-25.source-rules.test.ts (may need updates)

**Design notes:**
- Slot id must be assigned deterministically (counter in GameState, not Math.random)
- Slot id must NOT be the index in s.enemies
- Slot id must survive the death of any other enemy
- src/core is pure/deterministic; stepGame must stay reproducible

**Dependencies:**
- tp1-28 (just merged): corrected the audit doc's MAYBLR claim to ODD
- tp1-25 (shipped with deviation D2): fuseball chase with unfixed parity gate

**ROM references:**
- ~/Projects/tempest-source-text/ALWELG.MAC (LF copy, never CRLF)
- INIINV: lines 345-350 (slot allocation)
- MAYBLR: lines 2157-2160 (parity gate: TXA / LSR / BCC LEFRIT / JSR FUCHPL)

## Delivery Findings

No upstream findings at setup.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

**ROM citations (byte-verified against ~/Projects/tempest-source-text, the 3569-line CITABLE copy):**
- **INIINV — the fixed-slot model** — `ALWELG.MAC:345-350`:
  `INIINV: LDX I,NINVAD-1 / LDA I,0 / BEGIN ;LOOP FOR EACH INVADER / STA X,INVAY ;DEACTIVATE / DEX / MIEND`.
  X is the invader's slot; INVAY is indexed by X; a slot belongs to an invader for its whole life.
  This is the identity our spliced `s.enemies` array lacks.
- **MAYBLR — the parity gate (ODD chases; cite the BRANCH, not the comment)** — `ALWELG.MAC:2157-2160`:
  `TXA ;YES. ONLY IF INDEX IS EVEN / LSR / BCC LEFRIT / JSR FUCHPL ;YES. CHASE`.
  LSR shifts index bit0 into carry; `BCC LEFRIT` takes the coin on carry CLEAR (index EVEN); FUCHPL
  (chase) falls through only on carry SET (index ODD). The 2157 comment ("EVEN") is intent; the code
  is behaviour and chases on ODD (corroborated by audit finding W-023, pair-1). Gate is downstream of
  `BIT WFUSCH / IFVS` (bit6, on-tube) at `2155-2156`, so it is inert while WFUSCH=0 (waves 1-17).

**Gap** (blocking — this is the implementation): Dev's map to GREEN.
- **`slotId` field** — add `slotId: number` to `EnemyBase` (`src/core/state.ts` ~L48).
- **Counter** — add `nextSlotId: number` to `GameState`, initialise `nextSlotId: 0` in `initialState`
  (state.ts). Keep it MONOTONIC — do NOT reset it on respawn/level (all other paths mutate `s` in place,
  so it naturally persists; only `initialState` sets it). Id reuse would be harmless but keep it simple.
- **Assign at spawn (two sites)** — stamp `e.slotId = s.nextSlotId++` (a `spawnEnemy(s, …)` helper reads
  cleanest) at BOTH: (1) the hatch push in `stepNymphs` (`s.enemies.push(makeEnemy(...))`, sim.ts ~L222);
  (2) the tanker split — `splitTanker`/`activateInvaders` (sim.ts ~L332/L511), reached from both
  `resolveBulletHits` (~L500) and `resolveTankerArrivals` (~L553). `splitTanker` has no `s`, so thread the
  counter or stamp the children before `activateInvaders`. AC-1 test 3 pins that split children get ids.
- **`makeEnemy` default** — the field is non-optional, and `makeEnemy` has no counter, so give it a fixed
  default (e.g. `slotId: 0`). Directly-built test enemies keep the default; the tp1-25/AC-2 fixtures set
  it explicitly. Safe because the ONLY wave-18+ fuseball-chase test is tp1-25 (now seats slotId=1); every
  other fuseball test builds at wave 1/12 where WFUSCH=0 and the gate never reads the parity.
- **Parity gate lives in `interpreter.ts` `jfuseup`** (~L510). Change the FUCHPL branch condition from
  `if (wfuschForLevel(ctx.level) & FUSE_CHASE_ON_TUBE)` to additionally require an ODD slot:
  `if ((wfuschForLevel(ctx.level) & FUSE_CHASE_ON_TUBE) && (e.slotId & 1) === 1)` → jchpla/jchrot (FUCHPL);
  else the existing LEFRIT coin. `e` is already narrowed to the fuseball; slotId is on `e`, so CamContext
  needs no change.

**Improvement** (non-blocking — fidelity nuance for Reviewer): the ROM has TWO fuse decision points —
JFUSEUP's DIRECT branches (near-top bit7 `2122-2127`; at-bottom-of-range bit6 `2135-2140`) with NO parity
gate, and MAYBLR (`2148-2166`, invoked at `2129`/`2142`) WITH it. Our port collapses fuse decisions into
one point in `jfuseup`, so applying the parity gate there gates the DIRECT case too. This is the story's
accepted approach (AC-2/AC-3) and consistent with tp1-6/tp1-25's ratified envelope-not-trace simplification
— intentional, not a bug.

**Gotchas for Dev:**
- **Determinism:** the counter MUST live in GameState (carried by `cloneState`'s `{ ...s }`), NEVER a
  module-global or Math.random — a module counter isn't snapshotted, so replay from a saved state would
  mint different ids and break stepGame reproducibility.
- **`cloneState` needs NO change:** the counter (primitive) rides `{ ...s }` and `slotId` rides
  `enemies.map((e) => ({ ...e }))` automatically — verified in cloneState (sim.ts:25-50). Confirm, don't add.
- **The death-splice already preserves the id:** `s.enemies.filter(...)` (resolveBulletHits ~L499,
  zapKillAt ~L713) keeps surviving OBJECTS, so their slotId is carried for free. That preservation IS the
  invariant AC-1 headline pins — the id must NOT be recomputed from the (shifted) index on reindex.

*Found by TEA during test design.*

### Dev (implementation)

**GREEN. All of TEA's map landed as specced; no divergence.** Files changed:

- `src/core/state.ts` — added `slotId: number` to `EnemyBase` (~L52, non-optional) and
  `nextSlotId: number` to `GameState` (~L247, doc comment explains why it must live here and
  never reset), initialised `nextSlotId: 0` in `initialState` (~L284, the only writer of the
  zero value).
- `src/core/sim.ts`:
  - `makeEnemy` (~L139-144): folded `slotId: 0` into the shared `cam` object (spread into all
    five `Enemy` variant branches) rather than `made.slotId = 0` after the switch — TEA's
    map suggested the latter, but each switch branch's object literal is itself checked
    against `Enemy` (which now requires `slotId`), so `tsc` rejects a post-hoc assignment.
    Folding it into `cam` (already spread everywhere) was the one-line fix; behaviour is
    identical (every kind still gets the fixed placeholder 0).
  - **Stamp site 1 — hatch** (~L228-230, `stepNymphs`): `hatchling.slotId = s.nextSlotId++`
    right after `makeEnemy`, before the `s.enemies.push`.
  - **Stamp site 2 — tanker split** (~L501-506 in `resolveBulletHits`, ~L562-566 in
    `resolveTankerArrivals`): rather than threading the counter into `splitTanker` itself
    (which would have forced a 4th parameter and broken three existing direct-call test
    files — `sim.enemy-authentic.test.ts`, `tp1-24.split-child-depth.test.ts`,
    `tp1-27.player-rim-depth.test.ts` — all call `splitTanker(t, tube, params)` with 3 args),
    each of the two call sites now does `const kids = splitTanker(...); for (const k of kids)
    k.slotId = s.nextSlotId++; spawned.push(...kids)`. `splitTanker`'s own signature is
    untouched. This is exactly TEA's "thread the counter or stamp the children before
    activateInvaders" alternative.
- `src/core/enemies/interpreter.ts` (~L510-516, `jfuseup`'s FUCHPL branch): changed
  `if (wfuschForLevel(ctx.level) & FUSE_CHASE_ON_TUBE)` to additionally require
  `(e.slotId & 1) === 1`; the `else` (LEFRIT coin) is unchanged. Comment cites
  ALWELG.MAC:2157-2160 and spells out the LSR/carry mechanics inline. No `CamContext` change
  needed — `e` was already narrowed to the fuseball, and `slotId` is on `EnemyBase`.
- `src/tools/contactSheet.ts` (~L82-85) — unplanned ripple, not in TEA's map: this dev tool
  (contact-sheet model viewer, outside `src/core/`) builds `Enemy` literals directly via a
  shared `regs()` helper spread into each cell, the same pattern as `makeEnemy`'s `cam`
  object. Adding `slotId` to `EnemyBase` made `tsc --noEmit` fail here too (5 errors, one per
  enemy kind) until `regs()` got the same `slotId: 0` placeholder. No behavioural effect —
  the contact sheet hand-animates models and never runs the interpreter, so the parity gate
  never reads this value.

**`cloneState`/death-splice verification (TEA's note, confirmed not just assumed):** read
`cloneState` (sim.ts:25-50) — `enemies: s.enemies.map((e) => ({ ...e }))` carries `slotId` as
an ordinary field of the spread object, and the bare `...s` at the top carries `nextSlotId` as
a primitive. Neither needed a code change. The death-splice (`s.enemies.filter((_, i) =>
!deadEnemies.has(i))` in `resolveBulletHits`, and the equivalent in `zapKillAt`) filters
*objects*, not indices-then-rebuild, so a surviving enemy's object — and its `slotId` — passes
through untouched. Confirmed directly by AC-1's headline test (kills an earlier enemy, asserts
the survivor's `slotId` is unchanged while its array index shifted) — green.

**Determinism:** TEA's tests already exercise this implicitly (fixed seeds, exact numeric
`slotId` assertions), but I additionally ran an ad hoc double-run check (temporary scratch
test, removed after use, not committed): `initialState(42)` stepped 400 frames twice,
independently, collecting `{ enemies.map(e => e.slotId), nextSlotId }` per frame — the two
runs produced byte-identical sequences (`expect(a).toEqual(b)` passed) with `nextSlotId > 0`
by the end (ids were actually being minted). Holds because the counter lives on `GameState`
(carried by `cloneState`'s `{ ...s }`) and is advanced only by ordinary integer increments —
no clock, no module state, no `Math.random`.

**Gate numbers:**
- `npm test -- tp1-29`: 2 files, 10 tests, all green.
- `npm test -- tp1-25`: 2 files, 30 tests, all green (D2-retirement guard unchanged/untouched).
- Full suite `npm test`: **144 files, 1684 tests, all green** — exactly TEA's predicted
  "~1684 all-green" (1680 baseline + 4 formerly-RED, now GREEN).
- `npm run build` (`tsc --noEmit && vite build`): clean, after the `contactSheet.ts` fix above.
- `npm test -- citations`: 4 files, 25 tests, green.
- `node tools/audit/reanchor-citations.mjs`: `103 present in 4232ed4, 0 lost, 0 skipped`.

**For the Reviewer to scrutinize:**
1. **Collapsed-decision fidelity nuance** (TEA's flagged Improvement, non-blocking): the port
   gates fuse decisions at one point in `jfuseup`, so the parity gate applies to both the
   DIRECT near-top/at-bottom branches (which the ROM does NOT gate) and MAYBLR proper (which
   it does). This is the story's accepted scope (AC-2/AC-3), not something I tried to
   re-split — flagging per TEA's note so it's not mistaken for an oversight.
2. **`contactSheet.ts` touch** — outside TEA's file list, purely a type-checker ripple from
   making `slotId` non-optional on `EnemyBase`. Confirm it's inert (it is — the tool never
   runs `runCam`/`jfuseup`).
3. **`splitTanker` signature left unchanged** — I diverged from TEA's literal phrasing
   ("thread the counter... splitTanker has no `s`") by choosing the "stamp the children"
   alternative explicitly, to avoid breaking the 3 existing test files that call `splitTanker`
   directly with 3 args. TEA's map offered both options; this is not a deviation from AC-1/
   AC-3, just a choice between the two paths TEA already named.

*Found by Dev during implementation.*

### Reviewer (code review)

**VERDICT: APPROVED.** All four ACs met; all gates green (full 144 files/1684 tests,
build clean, tp1-29 10/10, tp1-25 30/30, citations 25/25, reanchor 103 present / 0 lost /
0 skipped). Both cruxes hold:
- **Stability (AC-1):** `slotId` is stamped once at spawn from `s.nextSlotId++` and NEVER
  recomputed from array position. All three spawn paths stamp (hatch sim.ts:229; both split
  sites sim.ts:505/565); `makeEnemy` is only ever called at those sites (grep-confirmed:
  228/343/344) and the only `s.enemies.push` is the stamped hatch. The death-splice `filter`
  preserves survivor OBJECTS, so an earlier death shifts the index but not the id — the gate
  reads `e.slotId`, and no code anywhere reads the array index as the slot.
- **Determinism:** counter lives on `GameState`, advanced only by integer `++`, never reset
  (grep-confirmed — only `initialState` sets 0). `cloneState` carries `nextSlotId` via `...s`
  and each `slotId` via `enemies.map((e) => ({ ...e }))`. Replay from a seed mints identical
  id sequences; no reset ⇒ no cross-level id collision at all.
- **Parity gate (AC-2):** `(e.slotId & 1) === 1` chases (ODD), downstream of the WFUSCH
  on-tube check; EVEN falls to the LEFRIT coin. Verified directly against ALWELG.MAC:2157-2160
  (`TXA / LSR / BCC LEFRIT / JSR FUCHPL` — carry-clear=EVEN→coin, carry-set=ODD→chase). The
  ROM's 2157 "EVEN" comment is intent; the code chases ODD. Correct.
- **AC-3:** tp1-25.fuseball-chase.test.ts change is fixture-only (comment + `slotId = 1` on
  the lone fuse); no chase assertion weakened or deleted; low-wave "ignores the player" tests
  still hold (WFUSCH=0 ⇒ gate inert).

**Ruling on the collapsed-decision nuance (TEA+Dev flagged):** ACCEPTED, non-blocking. The
port collapsed JFUSEUP's DIRECT branches and MAYBLR into one decision point in tp1-5/tp1-25
(ratified envelope-not-trace), so applying the parity gate there is the only place it can
live and is the faithful continuation. It does introduce a reciprocal divergence (EVEN-slot
fuseballs the ROM would DIRECT-chase now roll the coin), which is smaller than the D2
divergence it retires and honestly recorded.

- **Improvement** (non-blocking): the reciprocal collapsed-gate divergence above replaces
  tp1-25's D2 but is recorded only here in Delivery Findings, not in the `## Design Deviations`
  ledger. tp1-25 logged D2 as a formal deviation; tp1-29 should log its successor so the
  fidelity audit sees what replaced it. Affects the session's Deviations section (add a
  one-line entry). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): AC-1's headline test proves id-stability via a manual
  `s.enemies = s.enemies.slice(1)` proxy rather than a real bullet kill. The property is sound
  (filter preserves object identity; nothing mutates a survivor's `slotId`) and the real
  filter path is exercised by the split-child test, so this is not a gap — but a real-kill
  variant of the headline would close the last inch. Affects
  `tests/core/tp1-29.stable-slot-id.test.ts`. *Found by Reviewer during code review.*

*Found by Reviewer during code review.*

## Design Deviations

No deviations at setup.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **AC-2 chase-wave boundary (17 → 18):** The AC says the chase bits are set at "wave 17+". Per
  tp1-25's established finding (TWFUSC's TR record ALTERNATES bytes 3 & 4, so wave 17 = offset 0 =
  byte 3 = 0), `wfuschForLevel(17) === 0` — the on-tube chase bit ($40) first lights at wave **18**,
  not 17. The AC-2 parity tests therefore use wave **49** (flat $C0) for the ODD/EVEN chase pair and
  wave **16** for the below-table guard, and never treat wave 17 as a chase wave. Reason: pinning the
  gate at wave 17 would pin a wave where the parity is never consulted (green-vacuous).

### SM / conductor (successor to tp1-25 D2 — logged per Reviewer LOW)

- **Collapsed-gate reciprocal divergence — the successor to tp1-25's retired deviation D2.** Recorded here in the Design Deviations ledger (not only in Delivery Findings) so the fidelity audit keeps an unbroken trail of what replaced D2. The port collapses the ROM's TWO fuse decision points — JFUSEUP's DIRECT branches (bit7 near-top `ALWELG.MAC:2122-2127`, bit6 at-bottom `2135-2140`, NO parity) and MAYBLR (`2148-2166`, WITH parity) — into a single `jfuseup` decision (a tp1-5/tp1-25-ratified envelope-not-trace simplification). tp1-29 attaches MAYBLR's ODD-slot parity gate at that single point, so an EVEN-slot fuseball the ROM would DIRECT-chase now rolls the LEFRIT coin instead. This reciprocal divergence is DELIBERATE and is materially SMALLER than the D2 divergence it retires (D2 omitted the parity gate entirely, so deep-wave fuseball chase was wrong for every slot). Reviewer ruled it ACCEPTED and non-blocking (round 1). Not re-filed as a new audit finding — W-023's envelope simplification already covers the single-decision-point model.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Strict-TDD refactor — RED tests must pin the new `slotId` invariant and MAYBLR's parity gate before Dev implements.

**Test Files:**
- `tempest/tests/core/tp1-29.stable-slot-id.test.ts` — AC-1 (stable id: assigned at spawn, not the
  array index, survives an earlier death, fixed for life, stamped at hatch AND split) + AC-2 (MAYBLR
  chases on ODD slot / coins on EVEN, reading the id not the array position).
- `tempest/tests/core/tp1-29.source-rules.test.ts` — source anchors: INIINV fixed-slot model
  (ALWELG.MAC:345-350) + MAYBLR ODD branch (2157-2160), fingerprinted against the citable source.
- `tempest/tests/core/tp1-25.fuseball-chase.test.ts` — **edited** (AC-3): lone-fuseball fixture now
  seats an ODD slot (slotId=1) so it still chases under the new gate; deviation D2 retired. No
  assertion weakened; low-wave "ignores the player" tests are unaffected (WFUSCH=0 → gate inert).

**Tests Written:** 6 new (3 AC-1 behavioural + 3 AC-2 behavioural) + 3 source anchors; 1 fixture edit.
**RED proof:** full suite `4 failed | 1680 passed`. The 4 failures are exactly the intended ones —
3 AC-1 tests "expected 'undefined' to be 'number'" (no `slotId` yet at hatch/lifetime/split) and the
AC-2 EVEN test "expected [Array(60)] to deeply equal […]" (today's gateless fuse chases even-slot).
The AC-2 ODD test + wave-16 guard + all source anchors PASS today (liveness partner; no-regression
guard; immutable source). AC-4: `citations` 25/25 green; `reanchor-citations.mjs` → 0 lost.
**Status:** RED (failing — ready for Dev)

**Handoff:** To Dev for implementation. Commit `67db341` on `refactor/tp1-29-stable-slot-id`.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/state.ts` - added `slotId: number` to `EnemyBase`, `nextSlotId: number` to `GameState`, initialised to 0 in `initialState`.
- `src/core/sim.ts` - `makeEnemy`'s shared `cam` object now includes `slotId: 0` (fixed default); stamped `s.nextSlotId++` at the hatch (`stepNymphs`) and at both tanker-split call sites (`resolveBulletHits`, `resolveTankerArrivals`), immediately after `splitTanker(...)` and before the children reach `activateInvaders`.
- `src/core/enemies/interpreter.ts` - `jfuseup`'s FUCHPL branch condition now additionally requires `(e.slotId & 1) === 1` (MAYBLR's parity gate, ALWELG.MAC:2157-2160).
- `src/tools/contactSheet.ts` - unplanned ripple: added `slotId: 0` to the shared `regs()` placeholder so `tsc` accepts the now-required field on this dev-only model-viewer tool (inert; never runs the interpreter).

**Tests:** 1684/1684 passing (GREEN) — tp1-29 (10/10), tp1-25 (30/30, unmodified), citations (25/25), reanchor 0 lost.
**Branch:** refactor/tp1-29-stable-slot-id (not pushed, per instructions)

**Handoff:** To next phase (review)
