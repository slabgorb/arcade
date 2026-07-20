---
story_id: "jt2-4"
jira_key: "jt2-4"
epic: "jt2"
workflow: "tdd"
---
# Story jt2-4: Eggs — spawn with victim velocity, bounce/settle laws, ledge tables, value ladder + air catch, hatch and remount, 4-egg permadeath

## Story Details
- **ID:** jt2-4
- **Jira Key:** jt2-4
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T14:54:26Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T13:51:29Z | 2026-07-20T13:52:46Z | 1m 17s |
| red | 2026-07-20T13:52:46Z | 2026-07-20T14:19:14Z | 26m 28s |
| green | 2026-07-20T14:19:14Z | 2026-07-20T14:26:17Z | 7m 3s |
| review | 2026-07-20T14:26:17Z | 2026-07-20T14:45:13Z | 18m 56s |
| green | 2026-07-20T14:45:13Z | 2026-07-20T14:54:25Z | 9m 12s |
| review | 2026-07-20T14:54:25Z | 2026-07-20T14:54:26Z | 1s |
| finish | 2026-07-20T14:54:26Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Gap** (non-blocking): jt2-7's per-frame fall loop must honor the `BMI EGGBCK` guard (JOUSTRV4.SRC:3210, inside the cited 3196-3222 range) — only call `bounceEgg` (and `bounceVelY`) with `velY >= 0`, or land the guard there. The ROM skips the quarter-invert transform entirely for a still-ASCENDING egg (negative velY); the pure `bounceEgg`/`bounceVelY` port accepts any number and would sign-flip a negative velY positive and can wrongly report `settled` — a case the machine never reaches. The precondition is now documented on both functions in `src/core/egg.ts` (round-2 JSDoc, this commit). Affects `src/core/egg.ts` callers + the jt2-7 fall-loop wiring. *Found by Dev during round-2 review.*

### TEA (test design)
- **Conflict** (blocking for AC/dossier accuracy; non-blocking for GREEN): AC-3 / epic law #7 say the hatched buzzard flies in from the **NEARER** screen edge. The vendored ROM enters from the **FARTHER (opposite)** edge (JOUSTRV4.SRC:3270-3279): `LDD PPOSX,U / SUBD #(ERIGHT-ELEFT)/2 / BHI EGGMRT` — an egg in the RIGHT half (`BHI` "MAN ON RIGHT SIDE") starts its buzzard at `#ELEFT+1` (the LEFT edge, −9) flying +8; an egg in the LEFT half at `#ERIGHT-1` (the RIGHT edge, 291) flying −8. The bird always enters from the edge OPPOSITE the rider and sweeps across. A jt1-10-class wrong-prose citation, the exact shape of jt2-3's "fraction included" OSTBO correction. TEA pinned the ROM truth (opposite edge) + byte-gated it. Correcting AC-3 in `sprint/epic-jt2.yaml` + epic law #7 is owed (a successor docs chore, like jt2-8). *Found by TEA during test design.*
- **Gap** (non-blocking): the full arena-integrated egg FALL (ADDEGG gravity + FLYX X-integration + LNDXTB/BCKXTB land detection — STEGG/EGGLPA, JOUSTRV4.SRC:3111-3235) is NOT modeled. jt2-4 pins the egg LAWS as pure transforms (spawn/bounce/settle/wrap/score/hatch/permadeath/remount), the same way jt2-3 pinned the joust collision laws without wiring the per-frame loop. The land-detection + scheduler wiring (an `egg?: EggState` process variant on `frame.ts`'s `ProcessSpec`, mirroring `enemy?`) is jt2-7 (rendering + the playable slice). Affects `src/core/egg.ts` + the future jt2-7 wiring. *Found by TEA during test design.*
- **Gap** (non-blocking): the kill-spawned egg path is RNG-FREE (fixed PEGGTM hatch time), so AC-4 determinism is pure-function reproducibility. The WAVE-START ledge eggs (put-an-egg-on-every-ledge, JOUSTRV4.SRC:2888-2894) DO randomize their premature hatch time via `JSR VRAND` — that randomness is jt2-5's wave-machine seam (the jt2-1 per-frame RNG stir already threads through `frame.ts`). Affects the future jt2-5 wave machine. *Found by TEA during test design.*
- **Gap** (non-blocking): the egg's FLYX X index decays by a flat ±2 (`ADDA #-2` / `ADDA #2` are unconditional), so an ODD index overshoots zero and oscillates ±1 forever (never settling by the X-index=0 rule). Real egg velX is copied from an enemy's FLYX index (always EVEN, −8..+8), so this never fires in practice; pinned as a faithful ROM quirk (`decayVelX(1) === -1`), not a bug. Affects `src/core/egg.ts` (`decayVelX`). *Found by TEA during test design.*
- **Improvement** (non-blocking): the egg's PFEET is modeled as a 0-vs-nonzero flag (0 = air-catch eligible, nonzero = landed). The ROM stores the actual land-collision MASK into PFEET (`EGGBON STA PFEET,U`, :3196); only 0-vs-nonzero matters for the catch bonus, so `bounceEgg` sets a nonzero sentinel. A later fidelity story that needs the exact mask can re-derive it. Affects `src/core/egg.ts` (`bounceEgg`/`airCatchBonus`). *Found by TEA during test design.*
- **Question** (non-blocking): `remountBudgetDebit` is pinned to equal jt2-2's `promote()` nsmart delta, but the FULL remount (MOUNRI) also promotes PCHASE 0→1 and selects the DSMART brain (:3676, 3687-3694) — the same `promote()` shape. When jt2-7 wires the hatch into the scheduler, the remounted buzzard should go through the existing `enemy.promote()` seam (or an equivalent) so pchase/brain move together with the nsmart debit — closing the jt2-2 recorded MOUNRI seam (JT22-015). Affects `src/core/egg.ts` + the jt2-7 scheduler wiring. *Found by TEA during test design.*

## Impact Summary

**Upstream Effects:** 6 findings (4 Gap, 1 Conflict resolved-to-jt2-8, 0 Question, 1 Improvement)
**Blocking:** None

- **Gap (jt2-7 seam):** BMI EGGBCK guard enforcement — the ROM gates the quarter-invert bounce on pre-bounce velY >= 0 (JOUSTRV4.SRC:3210); jt2-7's fall loop must only call `bounceEgg` with velY >= 0 (or land the guard then). Documented as JSDoc PRECONDITION on `bounceVelY`/`bounceEgg` (commit 570969c).
- **Gap (jt2-5 seam):** wave-start ledge-egg hatch selection (VRAND randomness) is the wave machine's — EGLEDG/EGGLNT geometry is claimed here (JT24) but placement/hatch scheduling waits for jt2-5.
- **Gap (jt2-7 seam):** the egg is not yet a scheduler process — arena-integrated fall (STEGG/EGGLPA), land detection, and the `kind: 'egg'` tagged-union wiring are jt2-7's scope; egg fields must stay in the egg variant (the shared EntityState does not grow — ruled).
- **Conflict (resolved → jt2-8):** AC-3/epic law #7 "nearer edge" prose is ROM-false; the FARTHER-edge law ships pinned (JT24-030..033) and the prose correction is folded into jt2-8's scope alongside the OSTBO fix.

- **Gap:** the egg's FLYX X index decays by a flat ±2 (`ADDA #-2` / `ADDA #2` are unconditional), so an ODD index overshoots zero and oscillates ±1 forever (never settling by the X-index=0 rule). Real egg velX is copied from an enemy's FLYX index (always EVEN, −8..+8), so this never fires in practice; pinned as a faithful ROM quirk (`decayVelX(1) === -1`), not a bug. Affects `src/core/egg.ts`.
- **Improvement:** the egg's PFEET is modeled as a 0-vs-nonzero flag (0 = air-catch eligible, nonzero = landed). The ROM stores the actual land-collision MASK into PFEET (`EGGBON STA PFEET,U`, :3196); only 0-vs-nonzero matters for the catch bonus, so `bounceEgg` sets a nonzero sentinel. A later fidelity story that needs the exact mask can re-derive it. Affects `src/core/egg.ts`.

### Downstream Effects

- **`src/core`** — 2 findings

### Deviation Justifications

1 deviation

- **The hatched buzzard enters from the FARTHER (opposite) edge, not the "nearer" edge.**
  - Rationale: JOUSTRV4.SRC:3270-3279 — `LDD PPOSX,U / SUBD #(ERIGHT-ELEFT)/2 / BHI EGGMRT` ("MAN ON RIGHT SIDE") → `EGGMRT LDD #ELEFT+1`; the fall-through (man on left) `LDD #ERIGHT-1`. Byte-gated in `egg-source.test.ts`; JT24-030/031/032. Mirror of jt2-3's "fraction included" OSTBO correction — the project's prime directive is ROM fidelity, and the double-entry citation system exists to catch wrong prose (jt1-10). Raised as a blocking Conflict for AC/dossier adjudication.
  - Severity: significant (contradicts AC-3's literal text).
  - Forward impact: correct AC-3 in `sprint/epic-jt2.yaml` + epic law #7; a successor docs chore (like jt2-8 for the OSTBO prose). If a human deliberately wants "nearer edge", the `remountEntryEdge` tests flip.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **The hatched buzzard enters from the FARTHER (opposite) edge, not the "nearer" edge.**
  - Spec source: `context-story-jt2-4.md` AC-3 / epic law #7 / `sprint/epic-jt2.yaml`.
  - Spec text: "Hatch produces a remount flight from the **nearer** screen edge at max FLYX speed".
  - Implementation: `remountEntryEdge` pins the ROM-faithful OPPOSITE edge — an egg in the RIGHT half (`eggX > 151`) → the buzzard starts at `ELEFT+1 = −9` (LEFT edge) flying `+8`; an egg in the LEFT half → `ERIGHT-1 = 291` (RIGHT edge) flying `−8`. The bird always enters from the edge OPPOSITE the rider and sweeps toward it — the FARTHER edge. `remountEntryEdge` is boundary-exact at the 151-px half-width (`BHI`).
  - Rationale: JOUSTRV4.SRC:3270-3279 — `LDD PPOSX,U / SUBD #(ERIGHT-ELEFT)/2 / BHI EGGMRT` ("MAN ON RIGHT SIDE") → `EGGMRT LDD #ELEFT+1`; the fall-through (man on left) `LDD #ERIGHT-1`. Byte-gated in `egg-source.test.ts`; JT24-030/031/032. Mirror of jt2-3's "fraction included" OSTBO correction — the project's prime directive is ROM fidelity, and the double-entry citation system exists to catch wrong prose (jt1-10). Raised as a blocking Conflict for AC/dossier adjudication.
  - Severity: significant (contradicts AC-3's literal text).
  - Forward impact: correct AC-3 in `sprint/epic-jt2.yaml` + epic law #7; a successor docs chore (like jt2-8 for the OSTBO prose). If a human deliberately wants "nearer edge", the `remountEntryEdge` tests flip.

## Sm Assessment

Setup verified: session file with bare workflow field at setup phase, story context validated, branch feat/jt2-4-eggs off develop at 44e2939 (jt2-3's merge), story in_progress. Peloton-subagent mode continues; merges pre-authorized. Next owner is TEA for red: pin the egg lifecycle laws — spawn with victim velocity, quarter-VY bounce with X-index decay, exact settle thresholds, the narrower 4..288 egg wrap, EGLEDG/EGGLNT ledge slots, the capped value ladder + PFEET air catch as score events, hatch remount from the nearer edge at max speed, PEGG 4-egg permadeath, and the MOUNRI budget-debit seam recorded from jt2-2. Determinism: seeded joust-kill to egg to hatch replays bit-for-bit.

## Tea Assessment

**Tests Required:** Yes
**Status:** RED (40 new behavioural tests fail for the right reason — clean self-describing throws; ready for Dev/GREEN)
**Branch:** `feat/jt2-4-eggs` (off develop at 44e2939) · **Commit:** `1197397` (`119739742ab58f49d1f156f3321208ac62d66e0a`)

**Test files (absolute):**
- `/Users/slabgorb/Projects/a-2/joust/tests/helpers/egg-contract.ts` — the CONTRACT (loadEnemy/loadJoust pattern): the `EggState`/`EggVictim`/`RemountEntry` types and the `EggModule` interface (constants + `spawnEgg`, `bounceVelY`/`decayVelX`/`eggSettles`/`bounceEgg`, `wrapEggX`, `bumpEggHits`/`eggValue`/`airCatchBonus`/`eggScoreEvents`, `willHatch`/`remountEntryEdge`/`remountBudgetDebit`). `loadEgg()` dynamic-imports `src/core/egg.js` and throws "egg core not built yet" until it exists.
- `/Users/slabgorb/Projects/a-2/joust/tests/egg.test.ts` — 40 behavioural tests (all RED via the clean throw).
- `/Users/slabgorb/Projects/a-2/joust/tests/egg-source.test.ts` — 45 provenance tests, all GREEN: every law byte-gated from the vendored 1982 source (skips on CI) + the JT24 claim-coverage sweep + the EGLEDG 69-slot byte-derivation + the FARTHER-edge discriminator.
- `/Users/slabgorb/Projects/a-2/joust/docs/rom-study/claims/egg.json` — 36 new `JT24-001..036` transcription claims (byte-verified against the vendored tree by the citations suite; all green). The MOUNRI `INC NSMART` line (:3669) is already covered by the jt2-2 seam claim `JT22-015`.

**Laws pinned (all cited; every verbatim byte-verified against `reference/williams-source/joust/JOUSTRV4.SRC`):**
- **AC-1 SPAWN (DEATH3, :2991-3001):** the egg carries the victim's PVELY and PVELX verbatim ("SAME VELOCITIES"), resets PBUMPX/PBUMPY, sits X+4 / Y−8px off the enemy, starts PFEET=0 (air-catch live) / hitCount 0 / not settled, and `eggsLeft = victim.eggsLeft − 1` (the DEC PEGG).
- **AC-1 BOUNCE (EGGBON, :3204-3218):** the FLYX X index decays a flat ±2 toward zero; a downward velY keeps a QUARTER of itself INVERTED — `−(velY >> 2)` (arithmetic/flooring). Pinned with the odd-index overshoot quirk (`decayVelX(1) === -1`).
- **AC-1 SETTLE (:3219-3222) — BOUNDARY-EXACT:** settle iff the bounced `velY >= -$20` (the inclusive `CMPD #-$0020 / BLT` edge — pinned at `-0x20` settle vs `-0x21` too-fast) AND the X index is EXACTLY 0 (pinned at 0 settle vs nonzero keep-bouncing). Modeled as the SIGNED lower bound, not `abs(velY) <= $20`.
- **AC-1 NARROW WRAP (EGGWR, :3141-3146):** `wrapEggX` in [4, 288] (a 284-unit correction), boundary-exact (288 stays / 289→5; 4 stays / 3→287), and PROVEN DIFFERENT from `arena.wrapX`'s [−10, 292] band at X=290 (entity 290 vs egg 6) and X=2 (entity 2 vs egg 286) — with a non-vacuous agreement control at X=150.
- **AC-1 LEDGE TABLE (:2871, 2910-2915):** EGLEDG byte-DERIVED to `[8,19,26,38,46,69]` (69 total slots), 8px apart.
- **AC-2 VALUE LADDER + AIR CATCH:** `EGG_VALUE_LADDER = [250,500,750,1000]` (EGGVAL DVALUE-decoded, the `$57→750` SCRTEN trap), the hit counter PEGS at 4 (`CMPB #4 / BHS`, boundary 3→4 / 4→4), repeated catches escalate then CAP at 1000 (5th/6th stay 1000, never read past the 4-entry table), and the mid-air catch pays +500 iff PFEET===0 (boundary 0→500 vs nonzero→0). Emitted as SCORE EVENTS (`eggScoreEvents`), not accumulation (jt4 seam).
- **AC-3 HATCH + PERMADEATH:** `willHatch` = eggsLeft > 0 (boundary 1→hatch vs 0→permadeath); the full 4-egg chain yields `[hatch,hatch,hatch,permadeath]` (the 4th egg is permadeath); `remountEntryEdge` is the ROM-corrected FARTHER edge (right-half→LEFT edge −9 flying +8; left-half→RIGHT edge 291 flying −8), boundary-exact at the 151-px half-width (`BHI`: 151→right edge, 152→left edge), always at max FLYX speed 8; `remountBudgetDebit` INCs NSMART and is cross-checked to equal jt2-2's `promote()` budget delta (the MOUNRI seam, JT22-015).
- **AC-4 DETERMINISM + the tagged-union ruling:** the spawn→bounce×3→hatch→remount pipeline replays byte-identical across two runs (RNG-free); `spawnEgg`/`bounceEgg`/`remountBudgetDebit` never mutate their arguments; and `EggState` is a DISTINCT variant — it carries the egg fields (`eggsLeft`/`hitCount`/`pfeet`/`settled`) and does NOT carry the shared flight fields (`velXIndex`/`velXFrac`/`timeUp`/`airborne`), pinning the epic ruling that the shared struct does not grow.

**Real vitest output:**
- New behavioural file alone: `tests/egg.test.ts` — **40 failed (40)**. Every failure audited (`--reporter=json`) to be the clean `loadEgg` throw "egg core not built yet …" — 0 dirty failures, 0 leaked TypeError/SyntaxError/import traces / "is not a function".
- `tests/egg-source.test.ts` — **45 passed (45)** (byte-gates ran; vendored tree present) + the JT24 claim-coverage sweep + the EGLEDG byte-derivation.
- Citations audit — **56 passed (56)**: all 36 JT24 verbatims re-open byte-for-byte against the vendored tree. (The "3 citation error(s)" / "no claims found …jt1-9-empty" stderr lines are the pre-existing passing negative-control's own output — not this story's.)
- Full suite: `Test Files 1 failed | 21 passed (22)` · **`Tests 40 failed | 693 passed (733)`**. The pre-existing **648 stay green** (648 + 45 new provenance = 693). `npx tsc --noEmit` exits 0.

**What Dev (GREEN) must implement — `joust/src/core/egg.ts` satisfying `tests/helpers/egg-contract.ts`** (a pure `src/core` module — the jt1-7 purity scanner will sweep it; no clock, no `Math.random`):
1. Constants: `EGGS_PER_ENEMY=4`, `EGG_SPAWN_X_OFFSET=4`, `EGG_SPAWN_Y_OFFSET=8`, `EGG_VELX_DECAY=2`, `EGG_SETTLE_VY_MAX=0x20`, `EGG_WRAP_LEFT=4`, `EGG_WRAP_RIGHT=288`, `EGG_WRAP_SPAN=284`, `EGG_SLOT_SPACING=8`, `EGG_LEDGE_CUMULATIVE=[8,19,26,38,46,69]`, `EGG_LEDGE_SLOTS=69`, `EGG_VALUE_LADDER=[250,500,750,1000]`, `EGG_VALUE_CAP=1000`, `EGG_HIT_MAX=4`, `AIR_CATCH_BONUS=500`, `REMOUNT_MAX_VELX=8`, `REMOUNT_HALF_X=151` (=`(ERIGHT-ELEFT)/2`), `REMOUNT_ENTRY_LEFT_X=-9` (=`ELEFT+1`), `REMOUNT_ENTRY_RIGHT_X=291` (=`ERIGHT-1`). Prefer importing `ELEFT`/`ERIGHT` from `./arena.js` so the entry edges + half-width stay coupled (arena derives its own `WRAP_SPAN` this way).
2. `spawnEgg(victim)` (carry velX/velY, reset bumps, X+4 / Y−(8<<8), eggsLeft−1, pfeet 0 / hitCount 0 / settled false); `bounceVelY(v) = -(v >> 2)`; `decayVelX(v)` (flat ±2 toward 0); `eggSettles(velY, velX) = velY >= -EGG_SETTLE_VY_MAX && velX === 0`; `bounceEgg` (decay X, quarter-invert a downward velY, set pfeet nonzero, `settled` via `eggSettles`).
3. `wrapEggX(x)` (`if (x>288) x-=284; if (x<4) x+=284`).
4. `bumpEggHits(h) = h >= 4 ? 4 : h+1`; `eggValue(h) = EGG_VALUE_LADDER[h-1]`; `airCatchBonus(pfeet) = pfeet === 0 ? 500 : 0`; `eggScoreEvents(egg) = [eggValue(bumpEggHits(egg.hitCount)), ...(egg.pfeet === 0 ? [500] : [])]`.
5. `willHatch(egg) = egg.eggsLeft > 0`; `remountEntryEdge(eggX)` (eggX > 151 → `{posX:-9, velX:+8, facing:1}`, else `{posX:291, velX:-8, facing:-1}`); `remountBudgetDebit(b) = {...b, nsmart: b.nsmart+1}`.
6. Keep the whole suite green (648 pre-existing + the 45 provenance + the 40 flipping GREEN) and `tsc --noEmit` clean; do NOT weaken the provenance suite or the 36 committed JT24 claims. Do NOT re-point `remountEntryEdge` to the "nearer" edge — the FARTHER edge is the deliberate, byte-gated ROM correction (see the Design Deviation).

**Design Deviations:** 1 logged under `## Design Deviations > ### TEA (test design)` — the hatched buzzard enters from the FARTHER (opposite) edge, not AC-3's "nearer" (byte-gated ROM truth; raised as a blocking Conflict).

**Delivery Findings:** 6 logged under `## Delivery Findings > ### TEA (test design)` — the FARTHER-edge Conflict (blocking for AC/dossier, non-blocking for GREEN); the deferred arena-integrated fall + scheduler wiring (jt2-7); the wave-start ledge-egg VRAND hatch randomness (jt2-5); the odd-index decay overshoot (faithful quirk); the PFEET 0/nonzero-flag abstraction; and the remount-through-`promote()` seam for jt2-7. Only the Conflict is blocking, and only for the AC/dossier wording — the tests give Dev a clear ROM-faithful target.

**Handoff:** To Dev (Julia) for GREEN.

## Tea Assessment (round 2 — hardening)

**Trigger:** Reviewer REJECTED on one blocking [TEST] gap — the settle law's `abs()` mutant survived the round-1 suite because every `eggSettles` call fed `velY <= 0`, exactly where the SIGNED bound and `abs()` agree. (A second [RULE] docs item — the AC-3/epic-law-#7 "nearer edge" prose — goes to Dev separately, sequenced after this.)

**Branch:** `feat/jt2-4-eggs` · Dev green base `21c8b7d` · **new commit `f105a20`** (`f105a20705067638fa58a785cd22cd9287344a41`, pushed). **Tests-only** — `tests/egg.test.ts` (+2 tests); `src/core/egg.ts` untouched (only transient mutation with a cp-backup restore; byte-identical to `21c8b7d` after).

**Real vitest counts:** full suite **`Test Files 22 passed (22)` · `Tests 736 passed (736)`** (734 round-1 green + 2 new). `npx tsc --noEmit` exits 0. Control run of both new tests against the REAL impl: green (no code bug — the shipped `eggSettles` is already the signed `velY >= -EGG_SETTLE_VY_MAX`, and `eggValue` already clamps with `Math.min(hitCount, EGG_VALUE_LADDER.length) - 1`; the gaps were coverage, not defects).

**Mutant-kill evidence** (per test: `cp` backup `src/core/egg.ts` → mutate FROM the pristine backup → run the `-t` filter → RED → restore from backup → control green; never `git checkout`; sha re-verified equal after each restore):

| # | New test (blocking unless noted) | Targeted mutant applied to egg.ts | Result |
|---|---|---|---|
| 1 | **[BLOCKING]** the settle bound is SIGNED (`velY >= -$20`), not abs — `eggSettles(0x21, 0) === true` | `return velY >= -EGG_SETTLE_VY_MAX …` → `return Math.abs(velY) <= EGG_SETTLE_VY_MAX …` | `Tests 1 failed` → restore → `1 passed` |
| 2 | [recommended] `eggValue` caps by its OWN clamp — `eggValue(5) === 1000`, `eggValue(6) === 1000` | `const idx = Math.min(hitCount, EGG_VALUE_LADDER.length) - 1` → `const idx = hitCount - 1` | `Tests 1 failed` (LADDER[4] undefined) → restore → `1 passed` |

Post-restore: `git status --porcelain src/core/egg.ts` empty (egg.ts byte-identical to `21c8b7d`); full suite 736/736; tsc 0.

**Why the signed-`+$21` pin is ROM-faithful, not a guess:** `eggSettles(0x21, 0)` feeds a velY whose magnitude (33) exceeds `$20` but whose SIGNED value is `>= -$20`. The ROM's `CMPD #-$0020 / BLT EGGBCK` is a signed lower bound — a velY of +33 is NOT `< -$20`, so the ROM proceeds to the `LDA PVELX / BNE` check and settles (velX 0). So the assertion pins exactly the ROM comparison the round-1 suite left reversible; `abs(velY) <= $20` is the wrong reading it now catches. (The round-1 `-0x20`/`-0x21`/nonzero-velX boundary pins stay — this closes the sign-of-the-bound axis they missed.)

**Verdict:** the one blocking Reviewer gap + the cheap recommendation both closed and mutation-proven; the code carried no defect (controls green against the real impl). Suite 736/736 green, tsc clean, pushed. **Handoff:** back to Reviewer. Non-blocking carry-forward for Dev/SM: the AC-3 / epic-law-#7 "nearer edge" [RULE] docs correction (the FARTHER-edge Design Deviation) — a successor docs chore like jt2-8.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `joust/src/core/egg.ts` (new) — the pure egg-lifecycle core satisfying `tests/helpers/egg-contract.ts`. Imports only sibling core (`ELEFT`/`ERIGHT` from `./arena.js`, `IntelBudget` type from `./enemy.js`); no clock, no entropy, no shell — passes the jt1-7 purity sweep.

**What was implemented (all cited, per TEA's briefing):**
- Constants (18): the spawn offsets, decay, settle bound, narrow-wrap trio, ledge table `[8,19,26,38,46,69]`, value ladder `[250,500,750,1000]`, hit peg 4, air bonus 500, and the remount edges DERIVED from arena's `ELEFT`/`ERIGHT` (`REMOUNT_HALF_X=(ERIGHT-ELEFT)/2=151`, `REMOUNT_ENTRY_LEFT_X=ELEFT+1=-9`, `REMOUNT_ENTRY_RIGHT_X=ERIGHT-1=291`).
- `spawnEgg` (carry velX/velY, reset bumps, X+4 / Y−(8<<8), eggsLeft−1, pfeet 0 / hitCount 0 / not settled; victim untouched).
- `bounceVelY(v) = 0 - (v >> 2)` (arithmetic floor; the `0 -` form, not unary `-`, so a zero velY yields +0 — the sim compares with `Object.is` where −0 ≠ +0); `decayVelX` flat ±2 toward 0 (odd-index overshoot preserved); `eggSettles(velY,velX) = velY >= -0x20 && velX === 0` (SIGNED lower bound); `bounceEgg` composing them + nonzero pfeet sentinel + `settled`.
- `wrapEggX` narrow [4,288]; `bumpEggHits` pegs at 4; `eggValue` ladder capped at 1000 (clamps the index so 4+→1000 per the contract JSDoc); `airCatchBonus` 500 iff pfeet 0; `eggScoreEvents`.
- `willHatch = eggsLeft > 0`; `remountEntryEdge` the FARTHER (opposite) edge per the byte-gated ROM correction (NOT re-pointed to "nearer"); `remountBudgetDebit = {...b, nsmart: b.nsmart+1}` (matches jt2-2 `promote()`'s delta).

**Design Deviations (Dev):** None. Implemented exactly what the tests + contract pin, including TEA's FARTHER-edge ROM correction (left intact — did not "fix" it back to the AC prose).

**Delivery Findings (Dev):** None new. TEA's 6 upstream findings stand; the only blocking one (FARTHER-edge Conflict) is a docs adjudication owed against AC-3 / epic law #7, non-blocking for GREEN.

**Note on the count:** the suite total is 734 (not 733). Adding `src/core/egg.ts` to `src/core/` grew the jt1-7 purity `it.each` sweep by one passing test — expected and healthy (egg.ts passes the boundary guard).

**Tests:** 734/734 passing (GREEN) — `Test Files 22 passed (22)`, `Tests 734 passed (734)`; the 40 egg behavioural tests flipped RED→GREEN and the 45 egg provenance tests stayed green. `npx tsc --noEmit` exits 0. Diff is src-only (one new file; no test/contract/claim/provenance edits).
**Branch:** `feat/jt2-4-eggs` (pushed)

**Handoff:** To Reviewer (Thought Police) for review.

## Subagent Results

**All received: Yes**

| Specialist | Result | Key findings |
|------------|--------|--------------|
| reviewer-preflight | CLEAN | 5 files +1594/−0; suite 734/734; tsc clean; zero leftovers; clean TDD split (green 21c8b7d = src-only, red 1197397 = tests+claims only); branch synced; origin/develop not moved since base 44e2939. |
| reviewer-test-analyzer | 4 FINDINGS (10 mutations, cp-restore, control 85/85 green) | [HIGH] eggSettles signed-bound unprotected (abs swap passes 734); [HIGH] eggValue cap masked by bumpEggHits caller; [MED] BMI EGGBCK precondition un-cited/un-guarded; [LOW] airCatchBonus strict `===0`. |
| reviewer-security | CLEAN | Zero findings (pure numeric core, no I/O, no entropy, no shell surface). |
| reviewer-rule-checker | 5/5 RULES PASS + ITEM 0 | FARTHER-edge remount independently CONFIRMED (JOUSTRV4.SRC:3270-3279; ELEFT −10 / ERIGHT 292 → −9/291); 35/36 JT24 claims byte-exact (JT24-035 differs by one trimmed trailing tab, content identical); independently found the SAME BMI EGGBCK completeness hole — "a real trap for whoever wires jt2-7's fall loop." |

## Reviewer Assessment

**Verdict:** APPROVED (round 2). Round-1 verdict was REJECTED on the signed-settle HIGH; both required items are now resolved (f105a20 tests + 570969c docs) — see `## Reviewer Assessment (round 2)` at the end of this file. The round-1 findings below are preserved as the audit trail.

**Specialist tags:** [PREFLIGHT] clean · [SEC] clean · [RULE] pass · [TEST] pass

**Data flow traced:** victim.velX/velY → `spawnEgg` (carried verbatim, bumps reset, X+4 / Y−(8<<8), eggsLeft−1) → `bounceEgg` (`decayVelX` ±2 toward 0, `bounceVelY = 0−(velY>>2)`, pfeet nonzero) → `eggSettles` → `willHatch` → `remountEntryEdge` → `remountBudgetDebit` (nsmart+1). End-to-end pure pipeline: no clock, no `Math.random`, no shell import; passes the jt1-7 purity sweep. Independently re-ran the suite: **734/734 green, tsc 0**.

**Pattern observed:** deliberate sign-safety pin at `egg.ts:159` — `bounceVelY` uses `0 - (velY >> 2)` (not unary `-`) so a zero velY yields **+0**, because the sim compares with `Object.is` where −0 ≠ +0. Verified-good and load-bearing. `spawnEgg` Y-offset `posY − (8 << 8)` correctly subtracts 8 whole pixels in the 8.8 high byte (docstring "Y−8px") — verified-good.

**Error handling / purity:** all five mutating-shaped functions (`spawnEgg`, `bounceEgg`, `remountBudgetDebit`, …) return fresh objects via spread; arguments untouched (pinned by the determinism/no-mutation tests). No throw paths, no swallowed errors — correct for a pure law module.

### Findings

| Severity | Tag | Issue | Location | Fix Required |
|----------|-----|-------|----------|--------------|
| [HIGH] | [TEST] | The headline SIGNED-settle law is mutation-survivable — swapping `velY >= -$20` for `abs(velY) <= $20` passes all 734 tests. Every `eggSettles` call in the suite feeds velY ≤ 0 (`-0x20`/`-0x21`/`0`/`-0x10`), where signed and abs agree; the distinguishing positive-velY case is never exercised. Independently confirmed by grep. This is the story's headline law, an in-contract exported fn the code comment explicitly flags "do NOT fix to abs()" — yet nothing protects it. Same class as jt2-3's enemy-wins gap I ruled blocking. | `egg.ts:180` / `egg.test.ts:180-217` | Add a positive-velY assertion that separates signed from abs, e.g. `expect(eggSettles(0x21, 0)).toBe(true)` (a fast UPWARD post-bounce velY still settles; abs() returns false). |
| [MED] | [RULE] | BMI EGGBCK precondition (JOUSTRV4.SRC:3210 — INSIDE the claimed 3196-3222 range) is un-cited, un-claimed, un-documented. The ROM gates the quarter-invert on pre-bounce velY ≥ 0; the port's `bounceVelY`/`bounceEgg` accept negative velY and would sign-flip it positive and can wrongly report settled — a case the ROM never reaches. Not red today (all callers pass velY ≥ 0), but a completeness hole in a cited range that TWO specialists independently flagged as "a real trap for whoever wires jt2-7's fall loop." | `egg.ts:156-202` | Document the `velY >= 0` precondition (naming BMI EGGBCK :3210) on `bounceVelY`/`bounceEgg`, AND record a forward Delivery Finding tracking the guard's enforcement to jt2-7's fall loop. Cheap; closes the trap while the file is already reopening for the HIGH. |
| [MED] | [TEST] | `eggValue`'s own cap is masked — mutating `Math.min(hitCount, len)` to `hitCount` (so `eggValue(5)` → undefined) passes 734/734 because every caller routes through `bumpEggHits` (pegged at 4). The reachable CONTRACT behavior ("repeated catches cap at 1000") IS covered by the escalation loop (egg.test.ts:276-285); only `eggValue`'s in-isolation clamp is unprotected. Defense-in-depth, not a reachable contract violation. | `egg.ts:232-235` | RECOMMENDED (non-blocking): `expect(eggValue(5)).toBe(1000)` / `eggValue(6)` — cheap hardening while the file is open. Not a gate. |
| [LOW] | [TEST] | `airCatchBonus` strict `pfeet === 0` vs `<= 0` untested for negative pfeet. Byte-domain (pfeet is a land mask, never negative). Docstring note suffices. | `egg.ts:238` | None required. |

### Key rulings (per the three posed)

- **(a) Signed-settle mutation gap — BLOCKING.** Headline law of the story, in-contract exported fn, deliberately documented as signed-not-abs with a "do not fix" warning, zero mutation protection at the distinguishing point. The story's contract is "laws transcribed AND PROVEN"; this law is transcribed but not proven. One-line fix. Same class as jt2-3's enemy-wins gap. **REQUIRED.**
- **(b) eggValue cap mask — NON-BLOCKING (defense-in-depth).** The reachable contract behavior is already covered end-to-end via the `bumpEggHits`-fed escalation loop; only `eggValue`'s redundant internal clamp is unprotected, and no caller ever feeds it > 4. MED, recommended cheap hardening, NOT a gate.
- **(c) BMI EGGBCK precondition — REQUIRE the cheap disposition NOW (not defer).** It is a completeness hole inside a CITED range (3196-3222) that the double-entry system exists to catch, independently found by two specialists, and consumed by jt2-7. Cost of the cheap disposition (JSDoc precondition note + a forward Delivery Finding) is near-zero and the file is already reopening for (a); deferring it as tracked debt is worse value than closing it in the same cycle. MED severity, but folded into the required list because the marginal cost ≈ 0 and it closes a real jt2-7 trap. Do NOT require modeling the guard itself — enforcing WHICH velY reaches the bounce is genuinely jt2-7's fall-loop scope.

### Required to clear review (tight + testable)

1. **[TEST]** Add the positive-velY signed-settle assertion — e.g. `expect(eggSettles(0x21, 0)).toBe(true)` (kills the abs() mutant). *(blocking — the HIGH)*
2. **[RULE]** Document the BMI EGGBCK `velY >= 0` precondition on `bounceVelY`/`bounceEgg` (cite :3210) + add a forward Delivery Finding to jt2-7. *(cheap docs+track, folded per ruling (c))*

Recommended in the same cycle (not gates): `eggValue(5)/(6) === 1000` direct-call hardening.

### Deviation audit

- **TEA deviation — hatched buzzard enters from the FARTHER (opposite) edge:** **ACCEPTED.** ROM-faithful (JOUSTRV4.SRC:3270-3279), byte-gated (JT24-030/031/032), independently re-confirmed by rule-checker ITEM 0 with quoted source (ELEFT/ERIGHT EQU + BHI branch semantics). The code is correct; AC-3 / epic law #7 / the context prose ("nearer") are the wrong-prose artifact and are what must change — a docs successor, not a code defect. The prime directive is ROM fidelity.
- **Dev deviations:** None logged; implementation matches the contract exactly, including leaving the FARTHER-edge correction intact. Confirmed clean.

### AC-3 "nearer edge" prose correction — tracking recommendation

**Fold into jt2-8** (recommended). jt2-8 already exists as the epic's reviewer-tracked "wrong-prose ROM correction" docs chore (p2, trivial/chore, backlog) and already edits `sprint/epic-jt2.yaml`. The farther-edge fix is the same class (a jt2-3/jt1-10-style wrong-prose correction), the same file (epic-jt2.yaml description line 56 + AC-3 line 66) plus `context-story-jt2-4.md:16,29`, and the corrected law is already pinned green by tests (`egg.test.ts` `remountEntryEdge` + JT24-030/031/032) — so it is a pure re-wording pass. Broaden jt2-8's title/scope to "correct the OSTBO **and remount farther-edge** wrong-prose." If SM prefers clean 1:1 tracking, file a sibling `jt2-x` docs chore instead — either is acceptable; I lean fold for DRY (one docs pass over the same file). This exactly mirrors how jt2-8 itself was born from the jt2-3 reviewer.

### Reviewer (code review) — Delivery Findings

- **Gap** (blocking, this review): the signed-settle headline law is mutation-survivable — no positive-velY test distinguishes it from `abs()`. Affects `joust/tests/egg.test.ts` (add the distinguishing assertion). *Found by Reviewer during code review.*
- **Gap** (non-blocking, forward to jt2-7): the BMI EGGBCK `velY >= 0` precondition (JOUSTRV4.SRC:3210, inside the cited 3196-3222 range) is unmodeled and undocumented; `bounceVelY`/`bounceEgg` will sign-flip an upward velY the ROM never bounces. jt2-7's fall loop must not feed an upward velY into the quarter-invert (or must model the guard). Affects `joust/src/core/egg.ts` + jt2-7 wiring. *Found by Reviewer during code review (independently corroborated by test-analyzer + rule-checker).*
- **Improvement** (non-blocking): `eggValue`'s internal cap is redundant defense-in-depth given every caller routes through the pegged `bumpEggHits`; a direct-call test would pin it. Affects `joust/tests/egg.test.ts`. *Found by Reviewer during code review.*
- **Question** (non-blocking, docs): AC-3 / epic law #7 / `context-story-jt2-4.md` "nearer edge" prose contradicts the byte-gated FARTHER edge; owed a docs correction — recommend folding into jt2-8. *Found by Reviewer during code review (corroborates TEA's blocking Conflict).*

**Handoff:** Back to Dev/TEA (peloton: no formal handoff protocol) — the two required items are a test-side assertion (TEA) + a JSDoc precondition note (Dev). Re-review on green.

## Dev Assessment (round 2)

**Required item addressed:** [RULE]/docs — the BMI EGGBCK precondition. Added a JSDoc PRECONDITION note to BOTH `bounceVelY` and `bounceEgg` in `joust/src/core/egg.ts`, citing `JOUSTRV4.SRC:3210` by name (`BMI EGGBCK`, inside the already-cited 3196-3222 range): callers must pass `velY >= 0` (a downward/level fall); a still-ascending egg (negative velY) is one the ROM's guard skips entirely, whereas the pure port would sign-flip it positive and can wrongly report `settled`. Both notes state that enforcing the guard belongs to jt2-7's fall-loop wiring.

**Comment-only change:** confirmed. `git diff --stat` → `src/core/egg.ts | 17 +++++++++++++++++` (1 file, 17 insertions, all JSDoc `*` lines — no logic, no signatures, no test edits). TEA's round-2 tests (f105a20) pulled first; branch was already up to date.

**Delivery Finding appended:** one non-blocking Gap under `## Delivery Findings > ### Dev (implementation)` — jt2-7's fall loop must honor the `BMI EGGBCK` guard (only call `bounceEgg` with `velY >= 0`, or land the guard then), citing :3210 and this round's JSDoc.

**Tests:** 736/736 passing — `Test Files 22 passed (22)`, `Tests 736 passed (736)`. `npx tsc --noEmit` exits 0. Diff is comment-only, `src/core/egg.ts` only.
**Branch:** `feat/jt2-4-eggs` (pushed)

**Handoff:** To Reviewer (Thought Police) for re-review.

## Reviewer Assessment (round 2)

**Verdict:** APPROVED

**Specialist tags:** [PREFLIGHT] clean · [SEC] clean · [RULE] pass · [TEST] pass

Both round-1 required items are resolved and independently verified (read-only + bash; no tree mutation, per the peloton read-only reviewer contract). Nothing new surfaced.

### Verification (independent, not taken on report)

- **Commit topology:** `21c8b7d..HEAD` = exactly two commits — `f105a20` (TEA) then `570969c` (Dev). Clean split.
- **Required item 1 — [TEST] signed-settle mutant-killer (f105a20, tests-only, `tests/egg.test.ts` +17):**
  - Read the added assertion `expect(eggSettles(0x21, 0)).toBe(true)`. Reasoned the discriminator by hand: signed law `0x21 >= -0x20` → **true**; the `abs(velY) <= $20` mutant → `abs(33) <= 32` → **false**. The test asserts `true`, so it KILLS the abs mutant — closing the exact gap where every velY ≤ 0 case has signed ≡ abs. This is the story's headline law, now proven.
  - Recommended cap hardening also landed: `eggValue(5)===1000` / `eggValue(6)===1000` (kills the `Math.min`-removal mutant → `EGG_VALUE_LADDER[4]/[5]` = `undefined`).
- **Required item 2 — [RULE] BMI EGGBCK precondition (570969c, comment-only, `src/core/egg.ts` +17):**
  - Independently proved comment-only: `git show 570969c` filtered for `+` lines that are NOT `//`/`*`/`/*` returned **empty** — zero non-comment additions. No logic, no signatures, no test edits.
  - PRECONDITION JSDoc present on **BOTH** functions — `bounceVelY` (egg.ts:156-162) and `bounceEgg` (egg.ts:199-205) — each naming `JOUSTRV4.SRC:3210` (`BMI EGGBCK`, inside the already-cited 3196-3222 range), stating callers must pass `velY >= 0`, explaining the sign-flip/false-settle hazard, and explicitly assigning guard enforcement to jt2-7's fall-loop wiring. Exactly the cheap disposition ruling (c) required.
  - Forward Delivery Finding recorded under `### Dev (implementation)` (session line 40) tracking the guard to jt2-7 — the double-entry trap is now visible to its consumer.
- **Suite + types (re-run here, not reported):** `Test Files 22 passed (22)`, `Tests 736 passed (736)` (734 → 736: +2 new, no regressions); `npx tsc --noEmit` exit 0.
- **Non-blocking round-1 items:** (b) eggValue cap-mask is now directly pinned (above); (LOW) airCatchBonus negative-pfeet remains a docstring note (never required).

### Deviation audit (round 2)
No new deviations. The round-1 FARTHER-edge deviation stays ACCEPTED (ROM-faithful, byte-gated). The AC-3 "nearer edge" prose correction is FOLDED into jt2-8 per the round-1 recommendation — confirmed: `sprint/epic-jt2.yaml` jt2-8 description now covers BOTH the OSTBO and the REMOUNT-EDGE wrong-prose (cites JOUSTRV4.SRC:3270-3279, entry X −9/+291, pinned by egg.test.ts JT24-030..033). Tracked, not lost.

### Round-2 findings
None. No Critical/High/Medium remain open against jt2-4's scope. The one forward item (BMI EGGBCK guard enforcement) is correctly out of scope for this pure-laws story and tracked to jt2-7.

**Data flow (re-confirmed):** victim velocities → `spawnEgg` → `bounceEgg`/`bounceVelY` (now precondition-documented) → `eggSettles` (signed law now mutation-guarded) → `willHatch` → `remountEntryEdge` (FARTHER edge) → `remountBudgetDebit`. Pure, deterministic, no clock/entropy.

**Handoff:** To SM for finish-story (peloton: informal). Story is GREEN + hardened; both reviewer gates cleared.