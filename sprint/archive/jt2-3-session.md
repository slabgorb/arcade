---
story_id: "jt2-3"
jira_key: "jt2-3"
epic: "jt2"
workflow: "tdd"
---
# Story jt2-3: The joust — box broad-phase + span narrow-phase, OSTBO sub-pixel resolution, bounce-apart, facing + bump registers

## Story Details
- **ID:** jt2-3
- **Jira Key:** jt2-3
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T13:45:24Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T12:38:14Z | 2026-07-20T12:39:43Z | 1m 29s |
| red | 2026-07-20T12:39:43Z | 2026-07-20T13:10:51Z | 31m 8s |
| green | 2026-07-20T13:10:51Z | 2026-07-20T13:19:30Z | 8m 39s |
| review | 2026-07-20T13:19:30Z | 2026-07-20T13:32:30Z | 13m |
| green | 2026-07-20T13:32:30Z | 2026-07-20T13:45:23Z | 12m 53s |
| review | 2026-07-20T13:45:23Z | 2026-07-20T13:45:24Z | 1s |
| finish | 2026-07-20T13:45:24Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (code review)
- **Gap** (blocking): the story's namesake law `resolveJoust` is unproven in the **enemy-wins direction**. Every kill scenario in `tests/joust.test.ts` has the PLAYER winning; a mutant that keeps the tie/enemy-vs-enemy guards but makes the player-party the winner regardless of `plantHeight` passes all 77 tests. Player-victim path (`victim.enemyType` undefined → `score:0`, `victimType:undefined`) is also unasserted. Affects `tests/joust.test.ts` (needs an enemy-strictly-higher-kills-player case + the player-victim score/outcome contract). *Found by Reviewer during code review.*
- **Gap** (blocking): `narrowPhase` top-alignment sign (`joust.ts:176`) and `groundStep`'s airborne guard (`joust.ts:331-332`) are un-mutation-tested — reversing the alignment sign, or deleting the guard, both pass 77/77. Affects `tests/joust.test.ts` (a different-`top` overlap discriminator; a `groundState===null` no-op case). *Found by Reviewer during code review.*
- **Conflict** (blocking, docs-accuracy — re-raising TEA + Dev): `sprint/epic-jt2.yaml:49` (AC-1) and `docs/rom-study/subsystems.md:137-139` still carry the ROM-wrong "fraction included / fraction-level, not integer Y" prose. The shipped code is ROM-correct (whole-pixel + PLANTZ), independently confirmed by the rule-checker's item-0 re-derivation. A successor docs-correction chore is owed so the stale AC does not re-mislead the next story. *Found by Reviewer during code review.*

### TEA (test design)
- **Conflict** (blocking): AC-1 / the epic law #2 / the dossier (`subsystems.md:137-139`) assert the joust compares `(PLANTZ + PPOSY)` "16-bit, **fraction included**" and that "a 1-fraction-unit height difference decides the winner … integer-Y comparison must fail the suite." The vendored ROM does the **opposite**: `OSTBO` compares **whole pixels + PLANTZ, fraction EXCLUDED**. Triangulated: `PPOSY RMB 3` = [super-high, PIXEL, fraction] (`RAMDEF.SRC:174`); `OSTBO` reads `ADDD PPOSY,X` / `SUBD PPOSY,U` at **offset +0** (the whole-pixel word) at `JOUSTRV4.SRC:5008-5009`, **not** `PPOSY+1` where the flight core reads the 8.8 value ("ADD IN FRACTIONAL DISTANCE", `JOUSTRV4.SRC:6494`); and `PLANTZ=2` is "SKIDDING OSTRICH HAS A LANTZ **2 PIXELS LOWER**" (`JOUSTRV4.SRC:6071`) — 2 whole pixels only if the compared low byte is the pixel. A jt1-10-class wrong-prose citation (JT8-048 quotes OSTBO's first line byte-exactly but its dossier prose was never re-derived). TEA pinned the ROM truth (whole-pixel + PLANTZ; same-pixel/different-fraction = TIE; PLANTZ=2 decides). Recommend correcting `docs/rom-study/subsystems.md:137-139` and jt2-3 AC-1 in `sprint/epic-jt2.yaml`. *Found by TEA during test design.*
- **Gap** (non-blocking): FACING is carried on the wrapper, not on flight.ts's generated `EntityState`. `flight.ts` is DO-NOT-HAND-EDIT and its `stepGround` documents `onMinus` as unreachable. The jt2-3 contract carries `facing` on `JoustEntity` and exposes a facing-aware `groundTransition`/`groundStep` (dir===facing→onPlus, dir===−facing→onMinus, dir===0→onZero) — mirroring how jt2-2's `EnemyState` carries `facing` beside `EntityState`. Dev may regenerate `flight.ts` (edit `tools/transcribe-flight.mjs`) to add facing + a facing-aware stepGround, OR keep facing on the wrapper; both satisfy the tests. Affects `src/core/joust.ts` (new), `src/core/flight.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): the canonical vendored source for THIS checkout is the **orchestrator** tree (`../reference/williams-source/joust`) that `tests/helpers/joust-source.ts` already resolves to; the prompt's "joust-repo copy is canonical" (`joust/reference/...`) **does not exist here** (`joust/reference` absent). All source tests use the existing helper. Revisit the helper's resolution if a joust-repo mirror is later vendored. Affects `tests/helpers/joust-source.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): kill scores are EVENT values only (500/750/1500); BCD accumulation + display + extra men stay jt4. The value is NOT a raw ×100 of `DVALUE`: `SCRTEN` reads the byte as tens(hi)/hundreds(lo) BACKWARDS (hunter `$57` → 750, not 5700) while `SCRHUN` reads thousands(hi)/hundreds(lo) (shadow `$15` → 1500). A jt4 accumulator must decode `DVALUE` through the block's `DVALUR` routine, not the byte alone. Pterodactyl (`P7DEC $10` via SCRHUN → 1000) is cited-adjacent but deferred to jt3. Affects the future jt4 scoring core. *Found by TEA during test design.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **The joust resolves on WHOLE PIXELS + PLANTZ, not the fraction.**
  - Spec source: `context-story-jt2-3.md` AC-1 / epic law #2 / `subsystems.md:137-139`.
  - Spec text: "the 16-bit sub-pixel (PLANTZ + PPOSY) comparison: a 1-fraction-unit height difference decides the winner … proven at the fraction level, not integer Y (the dossier's false-tie trap — integer-Y comparison must fail the suite)."
  - Implementation: tests pin the ROM-faithful OPPOSITE — `plantHeight = plantZ + (posY >> 8)` with the fraction (`posY & 0xff`) EXCLUDED; two entities on the SAME whole pixel but DIFFERENT fractions are a TIE (both bounce, the *corrected* false-tie trap); `PLANTZ=2` (two whole pixels) DOES decide. An implementation that "includes the fraction" is what the suite now catches.
  - Rationale: `OSTBO` reads `PPOSY` at offset +0 (the whole-pixel word, `JOUSTRV4.SRC:5008-5009`), not `PPOSY+1` (the 8.8 word the flight core integrates, `:6494`); `PLANTZ=2` is "2 PIXELS LOWER" (`:6071`). The project's prime directive is ROM fidelity, and the double-entry citation system exists precisely to catch wrong prose (jt1-10). Raised as a blocking Conflict for human adjudication of the AC + dossier.
  - Severity: significant (contradicts AC-1's literal text).
  - Forward impact: correct `subsystems.md:137-139` and AC-1; if a human deliberately wants fraction-included behaviour, the AC-1 fraction tests flip.

### Reviewer (audit)
- **ACCEPTED — TEA's "the joust resolves on WHOLE PIXELS + PLANTZ, not the fraction."** The ROM's OSTBO reads `PPOSY` at offset +0 (the whole-pixel word), not `PPOSY+1` (the 8.8 value the flight core integrates); `PLANTZ=2` is "2 PIXELS LOWER". Independently re-derived by the reviewer-rule-checker (item 0, quoted source lines `RAMDEF.SRC:174`, `JOUSTRV4.SRC:5008-5009`/`:6494`/`:6071`) — CONFIRMED, not one agent's word. Project prime directive is ROM fidelity; the AC-1 prose is a jt1-10-class wrong-prose stapled to a real byte-quote. Deviation stamped. The AC-1 YAML + `subsystems.md` prose correction is carried forward as a required successor chore (see Delivery Findings › Reviewer + Reviewer Assessment).

## Impact Summary

**Status:** All deliverables met; no upstream effects that block shipping. Two successor stories are required for docs accuracy and fidelity completeness, not for jt2-3 readiness.

**Findings disposition (post-round-2):**
- **Blocking at round 1 (resolved in round 2):** Enemy-wins joust law, narrowPhase alignment sign, groundStep airborne guard, player-victim contract — all 4 closed and mutation-proven by targeted hardening tests in commit `45c5196`; control run confirms no code defect (9 hardening tests green against real impl).
- **Non-blocking deviations:** AC-1 whole-pixel OSTBO resolution (ROM-true, rule-checker item-0 independently confirmed); FACING field on wrapper vs flight.ts (contract satisfied, flight.ts regeneration deferred).
- **Non-blocking gaps:** bounceHorizontal away-branch (`velX ≤ 0`) is out-of-contract and currently only tested for moving-toward (`velX > 0`); rom-fidelity gap that only ships a wrong value if ever called with `velX ≤ 0`. Recommend promoting to jt2-7-visible follow-up (see findings below).

**Test evidence:** Full suite 648/648 green (639 dev + 9 hardening); tsc clean; 7 guards killed with teeth (mutation-proven, never `git checkout` used).

**Successor tasks (not blocking jt2-3):**
1. **jt2-8** — AC-1 docs correction: `sprint/epic-jt2.yaml:49` and `docs/rom-study/subsystems.md:137-139` from "fraction included" to "whole-pixel + PLANTZ" (evidence preserved in `tests/joust-source.test.ts` + JT23 claims + session Deviation/rule-checker).
2. **jt2-7 collision-wiring handoff:** Confirm `bounceHorizontal` `velX>0` contract honored in wiring, or implement away-branch for full ROM fidelity (non-blocking carry-forward, visible in session findings).
3. **Recommendation for jt2-7:** After wiring collision, if `bounceHorizontal` is called with `velX ≤ 0`, the away-branch (`selfVelX` unchanged, `otherBumpX = (−velX+2)>>1`) differs from the impl's formula — decide fidelity path.

**Delivery Findings summary:**
- **TEA (round 2):** bounceHorizontal away-branch gap (non-blocking, out-of-contract).
- **Reviewer (round 2):** All round-1 blockers closed; R3 refusal accepted (investigated + correctly declined); AC-1 docs fix tracked as jt2-8.
- **Pre-existing round-1 findings (resolved):** 3 HIGH + 4 MED/LOW, all closed by hardening tests — enemy-wins, player-victim, narrowPhase sign, groundStep guard, broadPhase boundary, groundTransition RangeError, both-skidding tie.

**Ready to finish:** Yes. No blockers. Code passes all mutation-proven tests; rule-checker item-0 confirms deviation; docs correction deferred to jt2-8.


## Sm Assessment

Setup complete and verified: session file with bare workflow field at setup phase, story context validated, branch feat/jt2-3-the-joust-collision off develop at b509ebb (jt2-2's merge), story in_progress. Peloton-subagent mode continues; merges pre-authorized. Next owner is TEA for red: pin the OSTBO 16-bit fraction-included joust resolution (strict-lower wins, exact tie both bounce), the FACING field + reachable skid chain with PLANTZ=2, the bounce-apart laws, PBUMPX/PBUMPY one-shot shoves with cited drain laws, enemies-never-kill-each-other, kill score events 500/750/1500, and the COLLISION_TABLES count floors owed since jt1-3 (prove red once by truncation).

## Tea Assessment

**Tests Required:** Yes
**Status:** RED (30 new behavioural tests fail for the right reason — clean self-describing throws; ready for Dev/GREEN)
**Branch:** `feat/jt2-3-the-joust-collision` (off develop at b509ebb)

**Test files (absolute):**
- `/Users/slabgorb/Projects/a-2/joust/tests/helpers/joust-collision-contract.ts` — the CONTRACT (loadEnemy/loadFlight pattern): the `JoustEntity`/`CollisionBox`/`MaskRef`/`JoustOutcome`/`BumpDrain` types and the `JoustModule` interface (`broadPhase`, `unbias`/`narrowPhase`, `plantHeight`/`resolveJoust`, `bounceTop`/`bounceBottom`/`bounceHorizontal`, `drainBumpX`/`consumeBumpY`, `killScore`, `groundTransition`/`groundStep`). `loadJoust()` dynamic-imports `src/core/joust.js` and throws "joust core not built yet" until it exists.
- `/Users/slabgorb/Projects/a-2/joust/tests/joust.test.ts` — 30 behavioural tests (all RED via the clean throw).
- `/Users/slabgorb/Projects/a-2/joust/tests/joust-source.test.ts` — 47 provenance tests, all GREEN: every law byte-gated from the vendored 1982 source (skips on CI) + the JT23 claim-coverage sweep + the WHOLE-PIXEL discriminator + the COLLISION_TABLES count floors.
- `/Users/slabgorb/Projects/a-2/joust/docs/rom-study/claims/joust.json` — 50 new `JT23-001..050` transcription claims (byte-verified against the vendored tree by the citations suite; all green).

**Laws pinned (all cited; verbatims byte-verified):**
- **AC-1 THE JOUST (whole-pixel + PLANTZ, fraction EXCLUDED — CORRECTED from the dossier):** `plantHeight = plantZ + (posY>>8)`; strictly-smaller wins & kills, exact tie bounces; **same whole-pixel/different-fraction = TIE** (the corrected false-tie trap); a skidder (`plantZ=2`) on the same pixel LOSES. Evidence: `OSTBO` reads `PPOSY,X`/`PPOSY,U` at offset +0 (`JOUSTRV4.SRC:5008-5009`) not `PPOSY+1` (`:6494`), and `PLANTZ=2` = "2 PIXELS LOWER" (`:6071`). See the blocking **Conflict** in Delivery Findings + the Design Deviation.
- **AC-2 FACING + skid reachability + bump drain:** facing-aware `groundTransition` reaches `onMinus` on a reversal (`PLYER` facing +1, dir −1 → `PLYHR` SKIDR) → `plantZ=SKID_PLANT_Z=2` → a losing joust; `PBUMPX` drains ≤3 px/frame (`WRAPX`, `JOUSTRV4.SRC:7270-7288`); `PBUMPY` consumed whole in one frame (`:6495-6496`).
- **AC-3 bounce-apart + enemies-never-kill + scores:** top `bumpY −2` / bottom `+2`, wrong-way velY inverted & halved (`OSTXUP/OSTXDN`, `:5163-5185`); horizontal reverse-minus-2 with half to the other as `PBUMPX` (`OSTXLF`, `:5114-5122`); enemy-vs-enemy always bounces (`:4953-4961`); kill events carry `killScore` 500/750/1500 decoded through the `DVALUR` routine — the `$57`→750 SCRTEN trap, not a raw ×100 (`:5562-5573`, `:7346-7361`, `:128`).
- **AC-4 COLLISION_TABLES floors + broad/narrow phase + determinism:** box `broadPhase` (`HITEM`, `:4909-4923`); span `narrowPhase` over COFF-biased masks with `$8000`/`$8100` sentinels (`BPCOL` `:7043`; `COFF` JOUSTI.SRC:7; JOUSTI.SRC:73/837), proven against a REAL `CSTN1R` mask; determinism replay + purity (no argument mutation).

**Real vitest output:**
- New behavioural file alone: `tests/joust.test.ts` — 30 failed (30). Every failure audited to be the clean `loadJoust` throw "joust core not built yet …" — 0 TypeError / SyntaxError / AssertionError / "is not a function" leaks.
- `tests/joust-source.test.ts` — 47 passed (47) (byte-gates ran; vendored tree present).
- Full suite: `Test Files 1 failed | 19 passed (20)` · `Tests 30 failed | 608 passed (638)`. The pre-existing **561 stay green** (561 + 47 new provenance = 608). Citations gate green with the 50 new JT23 claims. `npx tsc --noEmit` exits 0.
- Representative failing tests: `AC-1 … same WHOLE pixel, DIFFERENT fraction ⇒ TIE (the corrected false-tie trap)`; `AC-2 … a facing-vs-input reversal ENTERS the skid chain and sets plantZ = 2`; `AC-3 … a resolved kill carries the victim enemy's score, not a raw ×100 of the byte`; `AC-4 … the walk stops at the $8100 end-of-table sentinel`.

**COUNT-FLOOR RED-ONCE EVIDENCE (mutation-proven, then restored from a cp backup):**
1. **Table deletion** — dropped `PT3LC` (35→34 tables): `the table COUNT is floored` → RED (`expected 34 to be greater than or equal to 35`) and `the TOTAL span-row count is floored` → RED (`expected 528 … >= 541`).
2. **Span truncation (no table drop)** — chopped `CSTN1R` spans 21→3, count still 35: `the TOTAL span-row count is floored` → RED (`expected 523 … >= 541`) and `every table carries a floor of span rows` → RED (`[ 'CSTN1R:3' ]`), while the COUNT floor stayed GREEN — proving the total/per-table floors catch truncation the count floor cannot.
`src/core/pictures.ts` restored and verified clean vs HEAD after both mutations.

**What Dev (GREEN) must implement — `joust/src/core/joust.ts` satisfying `tests/helpers/joust-collision-contract.ts`** (a pure `src/core` module — the jt1-7 purity scanner sweeps it):
1. Constants `COFF=0x200`, `NO_COLLISION_ROW=0x8000`, `END_OF_TABLE=0x8100`, `SKID_PLANT_Z=2`, `BUMP_X_MAX_PER_FRAME=3`, `BUMP_Y_TOP=-2`, `BUMP_Y_BOTTOM=2`.
2. `broadPhase(a,b)` AABB overlap; `unbias(w)=w-COFF`; `narrowPhase(a,b,masks)` walking two COLLISION_TABLES masks aligned by `top`, `$8000` row = no collision, stop at `$8100`, overlap of unbiased [l,r] intervals.
3. `plantHeight(e)=e.plantZ+(e.posY>>8)` (fraction EXCLUDED); `resolveJoust(a,b)` — enemies-never-kill ⇒ bounce; else strict-smaller wins/kills (carrying the victim's `killScore`), equal ⇒ bounce.
4. `bounceTop` (bumpY −2; velY>0 ⇒ `(-velY)>>1`); `bounceBottom` (bumpY +2; velY<0 ⇒ `(-velY)>>1`); `bounceHorizontal(velX)` for velX>0 ⇒ `{ selfVelX: -velX+2, otherBumpX: velX>>1 }`.
5. `drainBumpX(b)` (≤±3/frame, keep remainder); `consumeBumpY(e)` (pixel += bumpY, fraction kept, bumpY→0).
6. `killScore`: bounder 500, hunter 750, shadowLord 1500.
7. `groundTransition(id,facing,dir)` (dir===facing→onPlus, −facing→onMinus, 0→onZero) reading flight.ts `GROUND_STATES`; `groundStep(entity,input)` applies it and sets `plantZ=2` when the new state's `call==='SKIDR'`. Carry `facing` on the entity (or regenerate flight.ts to add it — Dev's call; see Delivery Finding).
Keep the whole suite green (561 pre-existing + the 47 provenance + the 30 flipping GREEN) and `tsc --noEmit` clean; do NOT weaken the provenance suite or the 50 committed JT23 claims.

**Design Deviations:** 1 logged under `## Design Deviations > ### TEA (test design)` — the joust resolves on WHOLE PIXELS + PLANTZ, not the fraction (contradicts AC-1's literal text; ROM-faithful; raised as a blocking Conflict).

**Delivery Findings:** 4 logged under `## Delivery Findings > ### TEA (test design)` — the whole-pixel Conflict (blocking); FACING-on-wrapper-vs-EntityState gap; the vendored-source-copy question; the kill-score-decode improvement. Only the Conflict is blocking (for the AC/dossier wording, not for GREEN — the tests give Dev a clear ROM-faithful target).

**Handoff:** To Dev (Julia) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Status:** GREEN (all 30 behavioural tests flipped; full suite 639/639; `tsc --noEmit` exit 0)
**Branch:** `feat/jt2-3-the-joust-collision` (pushed)
**Commit:** `32b486a9a860b4a0d577d1f6b7180b746c4149ef`

**Files Changed:**
- `joust/src/core/joust.ts` (new) — the joust collision + resolution core satisfying `tests/helpers/joust-collision-contract.ts`. Only src touched; no test/contract/claims/provenance/generated files edited. `git -C joust diff --stat` was empty (the file is the sole new untracked add).

**What was built (all per the TESTS, i.e. TEA's ROM-faithful pins):**
- Constants `COFF=0x200`, `NO_COLLISION_ROW=0x8000`, `END_OF_TABLE=0x8100`, `SKID_PLANT_Z=2`, `BUMP_X_MAX_PER_FRAME=3`, `BUMP_Y_TOP=-2`, `BUMP_Y_BOTTOM=2`.
- `broadPhase` strict AABB (both axes); `unbias(w)=w-COFF`; `narrowPhase` walks two masks aligned by `top`, resolving each table up to the first `$8100` (rows after it unreachable), `$8000` rows contribute nothing, collide on any shared scanline where the COFF-unbiased inclusive `[l,r]` intervals overlap. Verified against the real `CSTN1R` mask (self-overlap true; +200 offset false).
- `plantHeight = plantZ + (posY>>8)` — **fraction EXCLUDED** (TEA's whole-pixel dossier correction); `resolveJoust` — enemy-vs-enemy always bounces, else strictly-smaller height wins/kills carrying the victim's `killScore`, exact tie (incl. same-pixel/different-fraction) bounces.
- `bounceTop` (bumpY −2; downward velY → `-velY>>1`), `bounceBottom` (bumpY +2; upward velY → `-velY>>1`), `bounceHorizontal(velX)` → `{ selfVelX: -velX+2, otherBumpX: velX>>1 }`.
- `drainBumpX` (≤±3/frame, keep remainder), `consumeBumpY` (pixel += bumpY, fraction kept, register cleared).
- `killScore` bounder 500 / hunter 750 / shadowLord 1500 (event values only — the `$57`→750 SCRTEN decode, not a raw ×100).
- `groundTransition` (dir===facing→onPlus, dir===−facing→onMinus, dir===0→onZero) reading flight.ts `GROUND_STATES`; `groundStep` applies it and sets `plantZ=2` when the new state's `call==='SKIDR'` (PLYER + reversal → PLYHR → plantZ 2 → losing joust). Purity preserved (spread-only, no argument mutation); determinism replay holds.

**Key Decisions:**
- **Facing kept on the `JoustEntity` wrapper; flight.ts NOT regenerated.** TEA's Gap finding allowed either; the wrapper path is the minimal one — the contract carries `facing` on `JoustEntity`, and joust.ts's own facing-aware `groundTransition`/`groundStep` close the jt1-6 skid-reachability gap without touching the generated flight core. No generator inputs changed.
- **Implemented the WHOLE-PIXEL OSTBO resolution** the tests pin (fraction excluded), not AC-1's literal "fraction included" prose — following TEA's blocking Conflict / Design Deviation.
- Header comment reworded to avoid the literal `joust-source` token so the `pictures-gate` independence rail (production must not reference the test-side reader) stays green.

**Tests:** 639/639 passing (GREEN); `tests/joust.test.ts` 30/30; `tsc --noEmit` exit 0. (The suite total rose 638→639 because `purity.test.ts`'s per-core-file sweep gains one case for the new `joust.ts` — it passes the guard; not a regression, not a skip. The stderr line "no claims found in …jt1-9-empty" is a passing negative-control's own output.)

### Delivery Findings — Dev (implementation)
- **Conflict** (non-blocking for GREEN; blocking for docs accuracy): confirmed during implementation that `sprint/epic-jt2.yaml` AC-1 and `docs/rom-study/subsystems.md:137-139` still carry the "fraction included" wrong-prose. joust.ts follows the tests (whole-pixel + PLANTZ). The AC + dossier correction TEA raised remains owed — re-raising so it is not lost. *Found by Dev during implementation.*
- **No other upstream findings.** The contract was implementable exactly as written; no test looked wrong.

**Handoff:** To Reviewer (Thought Police). Reviewer notes: (1) whole-pixel resolution is the deliberate, ROM-cited inversion of AC-1's prose — see TEA's Conflict/Deviation, do not "fix" it back to fraction-included; (2) facing lives on the wrapper by design (flight.ts untouched, no generator run); (3) diff is a single new src file.

## Subagent Results

**All received: Yes**

| Specialist | Verdict | Findings | Reviewer disposition |
|-----------|---------|----------|----------------------|
| reviewer-preflight | clean | 5 files +1807/−0; suite 639/639; tsc 0; zero leftovers; conventional commits; branch synced; origin/develop NOT moved past base; TDD shape intact (red=tests-only, green=src-only) | ACCEPTED — independently re-confirmed: working tree clean, `origin/develop == b509ebb` (base), single new src file in green |
| reviewer-test-analyzer | 7 findings | 3×HIGH (enemy-wins gap + player-victim score unasserted; narrowPhase top-sign unpinned; groundStep guard uncovered), 3×MED, 1×LOW; no vacuous tests | CONFIRMED all 3 HIGH (mutation-proven by analyzer; enemy-wins traced independently against every kill scenario). 2 HIGH + the enemy-wins HIGH → BLOCKING. MED/LOW → non-blocking recommendations |
| reviewer-security | clean, 0 findings | read-only lookups, frozen tables, sentinel-terminated loops, pure module | ACCEPTED — pure `src/core` module, no shell/entropy surface; concur |
| reviewer-rule-checker | clean, 5/5 + item-0 | independently re-derived the whole-pixel OSTBO claim from vendored source w/ quoted lines; 15/50 JT23 claims spot-checked byte-exact, 0 mismatches | ACCEPTED — item-0 re-derivation is the load-bearing confirmation of TEA's AC-1 inversion; the deviation is ROM-true, not one agent's word |

## Reviewer Assessment

**Verdict:** APPROVED at round 2 — see `## Reviewer Assessment (round 2)` at the END of this file. This round-1 section is the REJECTED history that drove TEA's hardening commit `45c5196`; all 4 blocking gaps are now closed + mutation-proven. **Superseded — do not read the round-1 REJECTED below as the current verdict.**

**Data flow traced:** a joust contact → `broadPhase` (AABB) → `narrowPhase` (COFF-unbiased span overlap, aligned by `top`) → `resolveJoust` (enemy-vs-enemy ⇒ bounce; else `plantHeight = plantZ + posY>>8`, strict-smaller wins/kills carrying the victim's `killScore`, tie ⇒ bounce) → `bounceTop/bounceBottom/bounceHorizontal` + `drainBumpX`/`consumeBumpY` registers. **Every function I traced is CODE-CORRECT** — the who-wins height comparison, the whole-pixel plantHeight, the narrowPhase alignment index `a.top+i−b.top`, the guards, the `$8000`/`$8100` sentinel walk, and the purity (spread-only, no argument mutation). No Critical/High **code** defect ships.

**Why REJECTED anyway — the test suite does not PROTECT the namesake law.** Three mutation-proven [HIGH] gaps leave `resolveJoust` — literally "the joust" — and two supporting seams unguarded: a *wrong* implementation sails through green. For a namesake mechanic that becomes live the instant jt2-7 wires collision into the loop, an unproven who-wins law is a deliverable gap, not a nit. This is a strict-TDD shop where the deliverable is a *proven* core; "the code happens to be right" is not the bar, "a regression can't ship green" is. Cost to close ≈ 4 tests; risk of leaving it = a who-wins inversion caught by playtest at best (cf. the "routing ≠ geometry" trap — jt2-7 wiring tests will pass while direction is wrong).

### Findings by severity

| Sev | Tag | Issue | Location | Ruling |
|-----|-----|-------|----------|--------|
| [HIGH] | [TEST] | `resolveJoust` who-wins is unpinned in the **enemy-wins direction** — every kill test has the player winning; "player always wins regardless of `plantHeight`" passes 77/77. Player-victim path (`enemyType` undefined → `score:0`) unasserted. | `joust.ts:204-220` / `joust.test.ts` | **BLOCKING.** Required TEA test: enemy strictly higher kills the player (winner=enemy, loser=player) + assert the player-victim outcome/score contract explicitly. Code is correct; the guard is missing. |
| [HIGH] | [TEST] | `narrowPhase` top-alignment sign unpinned — reversing `j = a.top+i−b.top` to `b.top+i−a.top` passes 77/77 (all tests use equal or far-apart tops). | `joust.ts:176` / `joust.test.ts` | **BLOCKING.** Required TEA test: two masks at DIFFERENT tops that overlap only under the correct alignment (a sign discriminator). |
| [HIGH] | [TEST] | `groundStep` airborne guard (`groundState===null` early-return) has zero coverage — deleting it passes 77/77. "A guard must be mutation-tested." | `joust.ts:331-332` / `joust.test.ts` | **BLOCKING.** Required TEA test: `groundStep` on a `groundState:null` entity returns it unchanged. |
| [MED] | [TEST] | `broadPhase` exact-touch boundary untested — all four strict `<`; `<=` mutation passes. | `joust.ts:125` | Non-blocking; recommend in the same round. |
| [MED] | [TEST] | `groundTransition` RangeError (unknown state) path unexercised. | `joust.ts:318` | Non-blocking; recommend. |
| [MED] | [TEST] | `bounceHorizontal` negative-velX branch unpinned (asymmetric `-velX+2` only tested with velX=6). | `joust.ts:257` | Non-blocking; recommend. |
| [LOW] | [TEST] | both-skidding tie untested. | `joust.ts:204` | Non-blocking. |
| — | [RULE] | AC-1 whole-pixel/PLANTZ inversion of the epic prose. | `joust.ts:193` | **DEVIATION ACCEPTED** — ROM-true, independently re-derived by rule-checker item-0. Stamped under Design Deviations › Reviewer (audit). |
| — | [DOC] | `sprint/epic-jt2.yaml:49` (AC-1) + `docs/rom-study/subsystems.md:137-139` carry the ROM-wrong "fraction included" prose. | epic YAML / dossier | **REQUIRED SUCCESSOR CHORE** (blocking for docs accuracy, non-blocking for jt2-3 code) — two agents have now re-raised it; it must be tracked, not lost. |

[SEC] clean (reviewer-security, 0 findings — concur). [RULE] 5/5 + item-0 confirmed (reviewer-rule-checker). No vacuous/tautological tests found.

### The KEY RULING — the enemy-wins gap
Unlike a dead-path dispatch, `resolveJoust` **is** this story's namesake law and both who-wins directions are reachable the moment jt2-7 wires collision into the loop — in real Joust an enemy above you kills you; that is the game. The gap is mutation-PROVEN (a wrong impl passes green), the fix is ~4 cheap tests, and the failure mode of shipping it is a who-wins inversion found only by playtest. Cost≪risk ⇒ **hardening round required now**, not deferred to a successor.

### AC-1 ruling
AC-1's **substance is MET — and met more faithfully than its literal text.** The story delivers the correct OSTBO height resolution; TEA/Dev implemented ROM truth (whole-pixel + PLANTZ, fraction excluded), independently confirmed by the rule-checker. The literal AC-1 prose ("fraction included / at the fraction level, not integer Y") is wrong-prose and is corrected in substance by the shipped behavior. Deviation ACCEPTED. The AC-1 YAML text + `subsystems.md:137-139` correction is a **required successor docs chore** (tracked above), not a blocker on this story's code.

### Required for re-GREEN (back to TEA — targeted hardening round)
1. **Enemy-wins joust** — an enemy with strictly-smaller `plantHeight` kills the player (winner=enemy, loser=player); kills the "player always wins" mutant.
2. **Player-victim contract** — assert the outcome shape when the player is the loser (currently `score:0`, `victimType:undefined`) so the semantics are locked, not incidental.
3. **narrowPhase alignment discriminator** — two masks at different `top`s that overlap only under `a.top+i−b.top`; kills the reversed-sign mutant.
4. **groundStep airborne no-op** — `groundState:null` returns the entity unchanged; kills the guard-deletion mutant.
- *Recommended (non-blocking, same round):* broadPhase `<=` exact-touch, groundTransition RangeError, bounceHorizontal negative-velX.

### Required successor task (orchestrator, tracked)
Correct AC-1 in `sprint/epic-jt2.yaml:49` and `docs/rom-study/subsystems.md:137-139` from "fraction included" to the ROM-true whole-pixel + PLANTZ resolution (evidence preserved in `tests/joust-source.test.ts`, the JT23 claims, and this session's Deviation/rule-checker item-0).

**Pattern observed:** all three HIGH findings share one shape — the code is correct but a wrong version passes green. This is the exact class the project's mutation-proven-guard discipline exists to catch ("A guard must be mutation-tested"). The green suite proves the code Dev wrote, not the law the story owns.

**Error handling:** `groundTransition` throws a clean `RangeError` on unknown state (`joust.ts:318`); `groundStep` guards null/absent `groundState` (`joust.ts:332`) — both correct, both untested (findings above). `resolveJoust` player-victim yields `score:0` — correct but unasserted.

**Handoff:** Back to TEA (O'Brien) for the targeted hardening round above (testable gaps, no code defect). After re-GREEN, the orchestrator docs-correction chore is owed before the AC can be closed clean.
## Tea Assessment (round 2 — hardening)

**Trigger:** Reviewer REJECTED on test-coverage grounds — the code is correct on every traced law, but the round-1 suite could not prove the namesake law (a "player always wins regardless of plantHeight" mutant survived all 77 collision tests, because every round-1 kill happened to have the player higher).

**Branch:** `feat/jt2-3-the-joust-collision` · Dev green base `32b486a` · **new commit `45c5196`** (pushed).
**Files:** `tests/joust.test.ts` only (+9 tests in a `ROUND 2 —` block). `src/` untouched (only transient mutation with cp-backup restore; `git diff src/core/joust.ts` clean after).

**Real vitest counts:** full suite `Test Files 20 passed (20)` · **`Tests 648 passed (648)`** (639 Dev-green + 9 new). `npx tsc --noEmit` exits 0. Control run of the 9 new tests against the REAL impl: 9 passed (none red against real code — no code bug found in the pinned laws).

**Mutant-kill evidence** (per test: cp backup → mutate `src/core/joust.ts` from the pristine backup → run target filter → RED → restore → control green; never `git checkout`):

| # | New test (blocking unless noted) | Targeted mutant applied to joust.ts | Result |
|---|---|---|---|
| 1 | enemy strictly higher KILLS the player (winner=enemy) + symmetric | `resolveJoust`: winner/loser = "`party==='player'` always wins regardless of plantHeight" | RED (2 failed) → restore → green |
| 2 | player-victim contract: score 0, victimType undefined | `score: … : 0` → `: 999` (player-victim default) | RED (1 failed; the enemy-victim contrast test stayed GREEN, so the mutant is precisely localised) → restore → green |
| 3 | narrowPhase aligns by `j = a.top + i − b.top` (reversed sign misses) | `const j = a.top + i - b.top` → `b.top + i - a.top` | RED (1 failed) → restore → green |
| 4 | groundStep no-op while airborne (groundState null) | delete the `groundState === null …` guard line | RED (1 failed — throws RangeError on `GROUND_STATES[null]`) → restore → green |
| R1 | broadPhase strict-touch boundary (touching edges don't overlap) | `b.x < a.x + a.w` → `b.x <= a.x + a.w` | RED (1 failed) → restore → green |
| R2 | groundTransition RangeError on unknown id | delete the `if (!state) throw new RangeError(...)` | RED (1 failed — TypeError, not RangeError) → restore → green |
| R4 | both-skidding same-pixel tie bounces [LOW] | `if (ha === hb)` → `if (false)` | RED (1 failed) → restore → green |

Post-restore control: `Tests 9 passed | 30 skipped (39)`; `git status --porcelain src/core/joust.ts` empty (joust.ts byte-identical to `32b486a`).

**R3 (bounceHorizontal negative-velX) — DELIBERATELY NOT PINNED (verified, not skipped):** the coordinator's suggested `bounceHorizontal(-6) === { selfVelX: 8, otherBumpX: -3 }` is the IMPLEMENTATION'S formula (`-velX+2`, `velX>>1`), **not** a transcribed law. Verified against the vendored source: `OSTXLF`'s self-modify sits behind `BLE 1$` (`JOUSTRV4.SRC:5114-5122`), so for a **negative (moving-away)** velocity the ROM leaves self **UNCHANGED** and yields `otherBumpX = (−velX+2)>>1`. For `-6` the ROM gives `{ selfVelX: -6, otherBumpX: 4 }` — disagreeing with both the impl's `{8,-3}` and the suggested pin. Pinning `{8,-3}` would lock an untranscribed value (a tautology against the impl); pinning the ROM `{-6,4}` would red against the real impl, but that is an **out-of-contract input** — `bounceHorizontal` is documented (round-1 contract + impl doc) as the reverse for the entity MOVING TOWARD the other (velX>0), and the round-1 `velX=6` test already pins the `+2` slow-down and the `>>1` halving with teeth. Recorded as a Delivery Finding below rather than a false code-bug test.

**Delivery Findings (round 2):**
- **Gap** (non-blocking): `bounceHorizontal(velX)` faithfully models only the `velX > 0` (moving-toward) branch of `OSTXLF`. The ROM's `BLE` branch (moving-away, `velX ≤ 0`) leaves self unchanged and computes `otherBumpX = (−velX+2)>>1`; the single-formula helper instead reverses self (`−velX+2`) and computes `velX>>1`, so its output for a negative velocity is non-ROM. A full two-sided bounce (the `OSTXLF`/`OSTURT` pair applied to BOTH entities by collision side, with facing flips) is unmodeled. Options for a fidelity follow-up: (a) restrict the contract to `velX > 0`, (b) implement the away-branch, or (c) accept the abstraction. Affects `src/core/joust.ts` (`bounceHorizontal`). *Found by TEA during round-2 hardening.*

**Verdict:** all 4 blocking Reviewer gaps + 3 of 3 cheap recommendations closed and mutation-proven; R3 verified and declined with evidence. Suite 648/648 green, tsc clean, pushed. **Handoff:** back to Reviewer.

## Reviewer Assessment (round 2)

**Verdict:** APPROVED

**Scope re-reviewed:** TEA hardening commit `45c5196` (tests-only). Independently verified: `git diff 32b486a..45c5196` touches **0 src files** (+126 in `tests/joust.test.ts` only); HEAD `45c5196`; working tree clean; `origin/develop` still at base `b509ebb` (not moved). Ran `npx vitest run tests/joust.test.ts` myself → **39 passed (39)** (30 round-1 + 9 round-2). No provenance/contract/claims/generated file touched — the JT23 claims and the vendored-source suite are untouched; nothing weakened.

**All 4 round-1 blockers closed — each mutation-killer traced independently, has teeth (not vacuous):**

| # | Round-1 gap | Round-2 pin | Mutant it kills | Reviewer disposition |
|---|-------------|-------------|-----------------|----------------------|
| 1 | [TEST] enemy-wins direction unpinned | enemy@80 vs player@120, both orderings, asserts `winner=enemy` | "`party==='player'` always wins regardless of `plantHeight`" → RED | **CLOSED.** Traced: the namesake who-wins law is now pinned in BOTH directions. |
| 2 | [TEST] player-victim contract unasserted | player victim ⇒ `score:0`, `victimType:undefined`; enemy-victim 750/hunter contrast | `score …:0`→`:999` reddens ONLY the victim test (precisely localised) | **CLOSED.** The `score:0` for a player death is now the pinned contract, not incidental; contrast proves it isn't a blanket zero. |
| 3 | [TEST] narrowPhase top-sign reversible | A row@2 / B row@0, `top` 100 vs 102 collide only under `a.top+i−b.top`; mismatched-tops control asserts `false` | reversed `b.top+i−a.top` (`j=4`, out of range) → miss → RED | **CLOSED.** Non-vacuous (has a `false` control) — the alignment sign is genuinely pinned. |
| 4 | [TEST] groundStep airborne guard uncovered | `groundState:null` snapshot-equality no-op | delete the guard → `GROUND_STATES[null]` throws RangeError → RED | **CLOSED.** "A guard must be mutation-tested" — now it is. |

**MED/LOW recommendations — all 3 closed with teeth:** broadPhase strict-touch (`<=` mutant RED, with a 1px-overlap `true` control so `<` isn't broken the other way); groundTransition RangeError (guard-delete throws TypeError ≠ RangeError → `toThrow(RangeError)` RED); both-skidding same-pixel tie bounces (tie-rule→`false` mutant RED).

**Ruling on the bounceHorizontal (R3) deliberate refusal — DISPOSITION ACCEPTED (non-blocking).**
TEA did the right investigative work rather than paper over my [MED]: re-derived `OSTXLF` (`JOUSTRV4.SRC:5114-5122`) and found the impl's uniform `-velX+2` / `velX>>1` formula is **non-ROM for the moving-away branch** (the self-modify sits behind `BLE`, so for `velX ≤ 0` the ROM leaves self UNCHANGED and yields `otherBumpX=(−velX+2)>>1`). The refusal to pin is correct on both horns:
- Pinning the impl's `{8,-3}` would lock an **untranscribed** value — a tautology against the implementation, exactly the "assert a token not the claim / lock scenery" anti-pattern this project's double-entry system exists to prevent.
- Pinning the ROM's `{-6,4}` would red on an **out-of-contract** input — `bounceHorizontal` is documented (round-1 contract + impl doc) as the reverse for the entity moving TOWARD the other (`velX>0`), and the round-1 `velX=6` test already pins the `+2` slow-down and `>>1` halving with teeth.
This is materially DIFFERENT from the enemy-wins gap: that was in-contract, reachable, the namesake law, with a wrong-impl-passes-green mutation. The away-branch is an out-of-contract input where the honest move is to NOT lock a guess. No escalation to blocking.

**One non-blocking recommendation (traceability, not a gate):** the away-branch is a genuine ROM-fidelity gap that SHIPS a non-faithful value if ever called with `velX ≤ 0`. It is currently only a session Delivery Finding, which pf tooling can drop. Recommend promoting it to a tracked fidelity follow-up story (as the AC-1 docs fix was → jt2-8), **visible to jt2-7** so the collision-wiring either honours the `velX>0` contract or triggers the away-branch implementation. Does not block jt2-3.

**Round-1 successor docs chore — satisfied:** the AC-1 (`epic-jt2.yaml:49`) + `subsystems.md:137-139` "fraction included" wrong-prose correction I required is now tracked as **story jt2-8** (1pt chore, epic jt2). Owed before AC-1 can be closed clean, but out of jt2-3's scope.

**Deviation audit:** unchanged from round 1 — TEA's whole-pixel/PLANTZ deviation remains ACCEPTED (ROM-true, rule-checker item-0 confirmed). No new deviations in the hardening commit.

**Remaining required (blocking) items:** NONE. All 4 blockers + 3 recommendations closed and mutation-proven; the code carried no defect (control run of the 9 new tests against the real impl is green — the gaps were coverage, not bugs). The green suite now proves the law the story owns, not merely the code Dev wrote.

**Handoff:** To SM (Winston) for finish-story. Non-blocking carry-forwards for the SM: (1) jt2-8 owes the AC-1/subsystems.md prose correction; (2) recommend tracking the bounceHorizontal away-branch fidelity gap as a jt2-7-visible follow-up.