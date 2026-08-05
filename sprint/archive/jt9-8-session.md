---
story_id: "jt9-8"
jira_key: "jt9-8"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-8: PTIMUP clears at BOTH wing transitions — a release restores flap lift and our flight.ts never does

## Story Details
- **ID:** jt9-8
- **Jira Key:** jt9-8
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)
- **Branch:** none
- **PR:** none

## Acceptance Criteria

1. **PTIMUP resets on the RELEASE edge**: The ROM clears PTIMUP at JOUSTRV4.SRC:6185 (the GOFLIP path, the RELEASE edge) and at :6219 (the GOFLAP/FLAST2 path, the PRESS edge). The flight core (plugins/joust/src/core/flight.ts) now models both: `timeUp` resets when the flap button transitions from pressed to released (the existing jt5-3 release detector), and when it transitions from released to pressed (the press edge already modelled).

2. **Rapid tapping climbs better than holding**: A seeded test demonstrates the ROM behaviour: hold the flap button continuously for 300 frames vs. tap it at 60Hz for the same duration. The tapping pattern reaches a higher altitude and has a higher peak velocity by frame 300, because repeated presses restore the lift budget whereas holding depletes it. This test must run on the idle-input harness or use scripted inputs that can reproduce it deterministically.

3. **The re-baseline is swept deliberately with impact stated**: Changing when `timeUp` resets moves the jt2 seeded-replay determinism fingerprints (frame anchors and entity digests). Every moved pin is re-found by sweeping for its own precondition, never by nudging a number toward the new output, with the specific pins that moved and their new anchors called out and justified. Any pins that had to change seed are reported and justified.

4. **No cross-commit coupling**: This story is committed separately from jt5-8, which is also a fingerprint-mover. Two fingerprint-moving changes in one commit make the re-baseline unreviewable, so both stories land in separate commits even if they are reviewed together.

5. **Core surface is correct**: The modifications to `tickTimeUp` (plugins/joust/src/core/flight.ts, currently :309-311) and the reset location are verified to align with the ROM's PTIMUP behaviour. The release-edge detector from jt5-3 is in place and used correctly.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-05T10:24:16Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-05T05:26:04Z | 2026-08-05T09:28:51Z | 4h 2m |
| red | 2026-08-05T09:28:51Z | 2026-08-05T09:46:47Z | 17m 56s |
| green | 2026-08-05T09:46:47Z | 2026-08-05T10:15:28Z | 28m 41s |
| review | 2026-08-05T10:15:28Z | 2026-08-05T10:24:16Z | 8m 48s |
| finish | 2026-08-05T10:24:16Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Conflict, non-blocking] The derived AC1 is WRONG: the press edge is NOT "already modelled".** AC1 (derived by sm-setup) states timeUp "resets when it transitions from released to pressed (the press edge already modelled)." Verified against the ROM and our port: `flap()` (flight.ts:257-272) READS `timeUp` for the impulse but never clears it, and `tickTimeUp` (flight.ts:309-312) only ever increments. **Neither edge resets timeUp today.** The ROM clears PTIMUP at BOTH transitions — GOFLIP (release, `CLR PTIMUP,U  RE-INIT BUTTON PRESSES`, JOUSTRV4.SRC:6185) and GOFLAP (press, `CLR PTIMUP,U`, :6219). Both need to be added. My RED tests are written to this true contract; treat the AC1 wording as superseded by the tests. (This is the sm-setup ROM-fabrication trap — caught before it reached Dev.)

- **[Gap, non-blocking — Dev seam] The reset lives in the CALLERS, not flight.ts.** `flight.ts` is GENERATED ("DO NOT HAND-EDIT", transcribe-flight.mjs) — do not add the reset there. Two call sites do `s = { ...s, timeUp: tickTimeUp(s.timeUp) }`: `stepPlayerEntity` (frame.ts:254) and `stepEntity` (enemy.ts:1065, a deliberate DUPLICATE of the player step — its own comment notes "buzzards flap" and why it isn't imported). The story description explicitly names BOTH sites. The edges are already computable where the reset must go: the release edge is `!input.flapHeld && prevFlapHeld` (the jt5-3 `wingEdge` memory, already carried on the process — frame.ts:329, enemy.ts:1256-1258), the press edge is `input.flap` / the rising `flapHeld`. **Ordering the tests pin:** apply the reset AFTER `tickTimeUp` (AIROVR/AIRTIM `INC PTIMUP` :6476 runs BEFORE the edge `CLR`, so an edge frame ends at 0, not 1), and on the press edge the impulse must still read the PRE-clear budget (ADDFLP :6212 precedes CLR :6219 — `flap()` runs before the reset). `stepPlayerEntity` does not currently receive `prevFlapHeld`; thread it in or apply the reset in `runBehaviour`. **Buzzards are in scope** — apply symmetrically to `stepEntity`; the enemy RED path is not separately pinned (its input is brain-driven, not injectable via `stepFrame` inputs), so Reviewer should confirm buzzard-path parity, which the jt2 replay digests will also exercise in play.

- **[Question, non-blocking — AC3/AC4 determinism] jt2 digests are GREEN now and WILL move on GREEN.** My new tests do not touch the sim, so all determinism fingerprints (demo-jt2-9*, anchors, digests) pass today (2752 passing, only my 4 behaviour tests RED). When the reset lands, every jt2 seeded-replay fingerprint that involves a flapping player OR buzzard moves — that is AC3 working, not a regression. Re-find each moved pin by its own precondition, never nudge a number (AC3). And do NOT co-commit with jt5-8, the other fingerprint-mover (AC4) — two movers in one commit make the re-baseline unreviewable.

### Reviewer (code review)

- **Improvement** (non-blocking): buzzards read `timeUp` in `flap()`'s impulse but never reset it — a pre-existing artifact of reusing the player flight core, whereas the ROM's buzzard/`OST*` movement uses PTIMUP nowhere (ADDFLP/AIROVR are player-only). jt9-8 correctly leaves this untouched. Affects `plugins/joust/src/core/enemy.ts` (a future story should decide the faithful buzzard flap-impulse model — likely NOT PTIMUP-based). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the take-off wing-edge reset (`edge==='down'` with `wasAirborne===false`) is covered only transitively (same reset line as the unit-tested in-air press, plus seeded replays); a dedicated take-off `timeUp===0` unit test would harden it. Affects `plugins/joust/tests/ptimup-reset.test.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[Dev] The PTIMUP reset is PLAYER-ONLY — enemy.ts was NOT changed (deviates from TEA's "apply symmetrically to stepEntity" finding).**
  - **What changed:** the `timeUp = 0` wing-edge reset was added ONLY to `frame.ts` `runBehaviour` (the player path). `enemy.ts` `stepEnemyDetailed` was left resetting nothing (a one-line no-op edit adding an explanatory comment).
  - **What the spec said:** TEA's Delivery Finding #2 said "Buzzards are in scope — apply symmetrically to `stepEntity`" (though TEA flagged it as a Reviewer-confirm Question, not a settled fact, and did not write an enemy RED test).
  - **Why:** measured against `reference/williams-source/joust/JOUSTRV4.SRC`. EVERY PTIMUP reference in the ROM (1486, 5816, 5843, 5919, 6154, 6185, 6219, 6246, plus ADDFLP 6429 / AIRTIM 6476) lives in PLAYER routines (PLYR* / the human flight loop FLAPLP-FLIPLP) or the shared ADDFLP/AIRTIM subroutines. `ADDFLP` (the PTIMUP impulse) has exactly ONE caller: `GOFLAP` :6212 (player). `AIROVR` (the PTIMUP increment) is called only from the player flight loop (:6167/:6194) and from `PTEFLY` :1492 — the PTERODACTYL, which uses PTIMUP as an ANIMATION timer (cleared once at :1486), not the flap budget. Regular buzzards (the `OST*` movement) call neither. So the PTIMUP re-init-on-wing-edge is exclusively a PLAYER mechanic; applying it to buzzards changes their trajectories the ROM never does. (The pre-existing buzzard `tickTimeUp` in enemy.ts is a modeling artifact of reusing the player flight core — out of scope here.)
  - **Forward impact:** confirmed by the blast radius — reverting the enemy change dropped 3 failures with no loss to the 4 player-path RED tests, and eliminated buzzard-trajectory divergence in the seeded replays. Reviewer should confirm this reading; if a later ROM finding shows buzzards DO re-init a lift budget, that is a separate story (and would need its own enemy RED test, which this story does not have).

- **README test-file count 121 → 123 (plugins/joust/README.md:48).** Adding two test files tripped the derived-count guard (`audio-seam-scope.test.ts` "the suite FILE count matches what vitest actually discovers"). Bumped the stated count so the RED set is exactly my 4 intended failures. Not a behaviour change; pure test-suite bookkeeping caused by the new files.

## Sm Assessment

**Story:** jt9-8 (3pt, joust, tdd) — model PTIMUP reset on the RELEASE edge so rapid tapping climbs better than holding, as it does on the real machine.

**Premise verified against the live tree (not assumed):**
- `plugins/joust/src/core/flight.ts:413` — comment reads "PTIMUP resets here and ONLY here: it never resets in flight" → confirms the "only decays, never resets in flight" claim.
- `tickTimeUp` (flight.ts:309-311) monotonically increments toward 255; lift impulse `((timeUp*96)>>8)-96` burns down as it climbs — that is the budget the story is about.
- jt5-3's two-edge release machinery IS present (flight.ts:433+, the GOFLIP release edge). The release edge this story depends on already exists — the stated blocker is genuinely gone.

**Contention check:** clean. Only sibling jt9 branch is `feat/jt9-1`; a-1 is on jt9-43, a-3 on cp7-4; no open PRs. Note a-1 is active in the SAME jt9 epic, so the empty beacon branch `feat/jt9-8-...` was pushed to make this claim visible.

**ACs:** epic YAML had `acceptance_criteria: null`; the five ACs were DERIVED from the (accurate) description. Two load-bearing constraints from the description are captured as ACs and must not be dropped: AC3 — resetting `timeUp` moves EVERY jt2 seeded-replay determinism fingerprint, so re-baselining is deliberate (re-find each moved pin by its own precondition, never nudge a number); AC4 — do NOT co-commit with jt5-8, the other fingerprint-mover, or the re-baseline is unreviewable.

**For TEA (Leeloo):** the RED test that proves the mechanic is the tap-vs-hold altitude comparison (AC2) — hold 300 frames vs tap at the edge cadence, tapping must reach higher. Expect jt2 determinism digests to move; that is the story working, not a regression — sweep and re-anchor deliberately per AC3.

**Board:** status stamped `in_progress`, claim committed (`c3154be`) and pushed to `main`, beacon branch pushed. Handing to TEA for RED.

## Tea Assessment

**RED delivered.** Two files, committed `90e4542` (rebased onto `eca9c79` on `main`):
- `plugins/joust/tests/ptimup-reset.test.ts` — 4 FAILING behaviour tests (the contract).
- `plugins/joust/tests/ptimup-reset-source.test.ts` — 6 PASSING ROM-provenance tests (the anchors).

**The RED set is exactly these 4** (whole-suite run: 5 failed / 2752 passed BEFORE the README fix; 4 failed / 2753 passed AFTER). Each fails with a precise numeric gap, so none is vacuous:

| AC | Test | Now (RED) | After (GREEN) |
|----|------|-----------|----------------|
| AC1 | release edge (GOFLIP :6185) resets timeUp | `201` | `0` |
| AC1 | press edge (GOFLAP :6219) clears AFTER impulse (:6212) | `201` | `0` |
| AC2 | re-flap after a release is full strength | impulse `-21` | `-96` |
| AC2 | from a spent budget, tapping reaches the ceiling, a hold never does | top pixel `41` | `≤32` |

**The contract, verified against JOUSTRV4.SRC (not the AC):** PTIMUP is cleared at BOTH wing transitions — release GOFLIP :6185 and press GOFLAP :6219. The press clear is AFTER the impulse (ADDFLP :6212 < CLR :6219), and both are AFTER the per-frame `AIRTIM INC PTIMUP,U` (:6476, reached via `JSR AIROVR` at :6167/:6194 before the button `TSTB`), so an edge frame ends at exactly 0. All six of these anchors are pinned green in the source companion.

**Why the raw `stepFrame` seam:** seeding `prevFlapHeld` (a first-class ProcessSpec field `runBehaviour` writes every wake) makes a single step BE an edge without a played-in press moving the measured velocity; a lone player means no entity can collide, and the staging Y (pixel 50) sits in the open-air band (scanlines 33–68) so neither the climb (ceiling 32) nor the hold's sink reaches the ground (~69). The "tapping reaches the ceiling" test is a threshold-free binary discriminator: unfixed tapping stalls at pixel 41 and cannot reach the ceiling; only a restored budget gets there.

**Rule Coverage** (`.pennyfarthing/gates/lang-review/typescript.md`; no `.claude/rules/` or joust `SOUL.md`/`CLAUDE.md` present):
- **Check 15 (source-text asserts the CLAIM, not a token):** the source tests match the mnemonic AND its meaning — `CLR PTIMUP,U` plus the `RE-INIT BUTTON PRESSES` comment, and the two orderings are asserted as `toBeLessThan` on the line numbers, not just token presence.
- **Check 26 (no all-local-terms assertions):** every expected value comes from the code under test — timeUp from the stepped entity, the impulse arithmetic from `flap()`'s own formula and `CEILING` imported from `arena.ts`. Each behaviour test carries a control (the no-edge tick, the hold baseline) so the discriminator is real.
- **Meaningful-assertion self-check:** no `let _ =`, no `assert(true)`, no `is*` on always-constant values; each failing assertion shows a concrete expected≠received gap.

**Core boundary:** tests import only from `src/core` (frame.ts, flight.ts, arena.ts) — no shell surface.

**Handing to Dev (Korben):** make the 4 RED green by clearing `timeUp` on both edges in the CALLERS (frame.ts `stepPlayerEntity`/`runBehaviour` AND enemy.ts `stepEntity`) — NOT in generated flight.ts — honouring the two orderings above. Then re-baseline the moved jt2 determinism digests deliberately (AC3), and keep this OFF the same commit as jt5-8 (AC4). See the three Delivery Findings.

## Dev Assessment

**GREEN. Commit `fcbe971` (pushed to `main` as `2f0778d` after a rebase onto a disjoint centipede sibling; joust re-verified 2757/2757 post-rebase).**

**Implementation — PLAYER-ONLY, faithful to the ROM.** In `frame.ts` `runBehaviour`, a player's `timeUp` is cleared to 0 whenever `wingEdge != null` (press GOFLAP / release GOFLIP / take-off STFLY), applied AFTER `tickTimeUp` (so an edge frame ends at 0 — AIRTIM increments before the CLR) and only while `stepped.airborne` (landing's STLDIR keeps `timeUp = 1`). `flap()`'s impulse still reads the pre-clear budget (ADDFLP :6212 before CLR :6219). The edge was already computed there for the wing cue, so the change reuses it.

**Scope correction vs TEA's finding — enemy.ts NOT changed (see Design Deviation).** I traced the ROM: every PTIMUP site is in the player flight loop; `ADDFLP`/`AIROVR` have no enemy caller (buzzards' OST* movement uses neither; PTEFLY uses PTIMUP as an anim timer only). So the reset is player-exclusive. Confirmed empirically four ways during re-baseline: enemy digest rows stayed bit-identical everywhere, and the synthetic buzzard-alternation fixture (audio-flap) passed untouched.

**AC3 re-baseline — 22 jt2 fingerprints across 5 files, MEASURED not nudged, nothing weakened.** Done via 5 worktree-isolated agents (each verified its file green; I re-verified all 5 by running them in this tree). Method per fixture: frozen digests read from the corrected sim's actual output; behavioral (seed,frame) fixtures re-swept for each test's OWN precondition and the earliest satisfying frame taken. Strong correctness signals: every fingerprint's `rng` cursor stayed **bit-identical** (the reset adds no entropy draw), and the invariance-guard comments were preserved/updated rather than deleted. Reference model `scheduler.test.ts` `stepAirborne` and the `flight-contract.ts` `FlightModule` contract were updated to mirror the reset / expose `wingEdge` (tsc clean).

**Four items that merit the Reviewer's eye (all handled honestly, none weakened):**
1. **audio-flap ~1183** — this fixture's six-tree "no PLAYER row ever moves here is a bug" invariant is DELIBERATELY RETIRED by jt9-8 (the seam it pins IS the player flap seam). Re-baselined + comment rewritten to say so + title corrected (was "the players never move", now truthful). This is the one retirement a frozen-value update can't self-authorise — ratify it.
2. **audio-thud person-thud** — required a SEED change (0x1b4a → 0x1001 @1401), not just a frame shift: 0x1b4a yields no qualifying player-thud in 6000 frames. The agent swept 8192 seeds and verified the precondition with actual buzzard-vs-knight positions. Bigger move than the others; worth a look.
3. **audio-transporter-split** — both seeds' knight-re-entry frames moved far (0xbeef 516→1803, 0xface 1894→1403); consistent with jt9-8 perturbing the scripted knight from frame 0, and every knight-id/SNPCR variant assertion was kept and re-found.
4. **dumb-wingbeat 0xface** — `enemy-wing-down` swung 273→103 (other seeds ~doubled) as a second-order effect of the changed knight arc reaching different buzzards; still clears its floor, AC6's relational invariant holds on all three seeds (not flipped).

**Verification:** joust 2757/2757 · `tsc --noEmit` clean · orchestrator 390/390 · shared 554/554. **AC4 honoured** — jt9-8 is its own commit, not co-landed with jt5-8. Handing to Reviewer (Zorg).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered MANUALLY (see note) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered MANUALLY (see note) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (0 of 29 rules) | N/A |

**All received:** Yes (3 enabled returned clean; 6 disabled via workflow.reviewer_subagents)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred

**Disabled-specialist coverage note (jt8-6 precedent — the one domain with defects had no specialist).** `test_analyzer` and `comment_analyzer` are OFF, and TEST QUALITY (22 re-baselined seeded-replay fixtures) plus COMMENT/CITATION ACCURACY are precisely the primary risk surface of this story. I covered both manually and cite the evidence:
- [TEST] Assertion accounting across the whole diff: 11 `expect(` removed, 36 added; every one of the 11 removed has a strength-preserved replacement (`toEqual([2])`/`([1])` knight-id assertions unchanged at transporter :569/:570/:592/:593; `toContain('enemy-death')` preconditions kept at audio-events :208/:241; `toHaveLength(1)` kept at :620; dumb-wingbeat rows re-indexed but still exact `.toBe`, and the `enemy#257` "did NOT move to held-wings" `.not.toBe` mutation fence survives at :674). No comparator loosened; no `.skip`/`.todo` added.
- [TEST] AC6 relational invariant NOT weakened: the `down` floors (0xbeef 105 / 0x2468 141 / 0xface 69) are unchanged at dumb-wingbeat :694-697; only the frozen knight counts moved (0xface 153→154, 152→154, onto the uniform 154/154 the other seeds already emit).
- [TEST] The re-baselines are self-verifying: preflight's FULL green suite (2757/2757) is proof every re-baselined value matches the real sim — a confabulated value would redden. Combined with the 4 contract tests pinning intended behaviour and the bit-identical `rng` cursors reported by the re-baseline (no entropy drift), the fixtures reflect correct physics, not blessed breakage.
- [DOC] The two jt9-8 source comments (frame.ts :340-347, enemy.ts :22-27) are backed by the new `ptimup-reset-source.test.ts` provenance suite IN THE SAME DIFF (not reasoned-and-unverified); the audio-flap invariance retirement and audio-thud re-sweep are documented in-place with concrete swept frame numbers rather than left stale.

### Rule Compliance (TypeScript lang-review, 26 checks + 3 project rules)

Cross-referenced with reviewer-rule-checker (independent, clean). Exhaustive result: **all applicable checks compliant, no violations.** The load-bearing ones for this change:
- **Check 14 (derived edge computed in one branch of a state machine):** the `edge`/`timeUp:0` reset sits at the single exit of the sole player-stepping branch (`frame.ts` runBehaviour `p.kind==='player'`); grep confirms no second `timeUp` writer outside `frame.ts` + `flight.ts`'s own `land()`/`walkOff()`. This diff is the *fix* for the pattern, not an instance of it.
- **Checks 15 & 25 (source-text asserts the CLAIM, single-line scope):** every `ptimup-reset-source.test.ts` assertion pulls one line by number (`sourceLines(ROM)[N-1]`) and matches the mnemonic AND its meaning (`CLR PTIMUP,U` + `RE-INIT BUTTON PRESSES`); orderings use literal line-number `toBeLessThan`.
- **Checks 18 & 26 (fixture-is-the-expectation / all-local-terms):** `ptimup-reset.test.ts` compares production output (`pressed.velY`, stepped `timeUp`) against the formula/CEILING imported from `arena.ts` — LHS is production-derived, so a real mutant reddens it.
- **Check 24 (retirement applied only where the AC named it):** the "no PLAYER row moves" invariant is retired in-place in audio-flap with the title corrected; other `timeUp` fixtures are flight.ts-level units, correctly out of scope.
- **Purity (A1) / generated-file (A2):** new code is a pure spread, no clock/entropy/DOM; `flight.ts` is untouched — the reset lives in the caller, as required.
- **Type safety (checks 1-2):** zero `as any`/`@ts-ignore`/non-null-`!` added; `flight-contract.ts` `wingEdge` signature is exact (`'down'|'up'|null`). `tsc --noEmit` clean repo-wide.

### Devil's Advocate

*Arguing this is broken.* The most damning charge: **the re-baseline "blessed" 22 fixtures — it could have laundered a real physics regression into a green suite.** A seeded-replay digest test passes the moment its expected string equals the sim's output; if jt9-8 subtly corrupted player flight, re-baselining every fingerprint to the corrupted output produces a fully green suite that certifies the bug. This is the single biggest risk of any determinism-mover, and it deserves the hardest look. *Rebuttal:* the re-baseline is anchored by three independent things it cannot fake. (1) Four contract tests (`ptimup-reset.test.ts`) pin the INTENDED behaviour by construction, not by observation — a release must clear the budget (`timeUp===0`), a re-flap after a release must lift a full `-96`, tapping must reach the ceiling a spent hold cannot; a corrupted implementation fails these. (2) Every re-baselined fingerprint kept a BIT-IDENTICAL `rng` cursor (1928172029, 2006456271, 3436766652, 1376450013, 736998484), which is impossible if the change perturbed the entropy stream — it proves the delta is pure trajectory, exactly what a `timeUp` reset should be. (3) Enemy digest rows stayed byte-identical across files, proving buzzards were untouched, so the "corruption" would have to be confined to player rows AND consistent with the contract tests — a contradiction. *Second charge: the player-only scope is under-implementation* — TEA said apply to buzzards. Rebuttal: independently re-verified in the ROM that `ADDFLP` (the PTIMUP impulse) has exactly one caller, `GOFLAP` :6212 (player), and `AIROVR` (the PTIMUP increment) is reached only from the player flight loop and the pterodactyl's anim-timer path; buzzards' `OST*` movement touches PTIMUP nowhere. Applying the reset to buzzards would be the actual bug. *Third: a seed was swapped (0x1b4a→0x1001)* — a classic way to hide a lost precondition. Rebuttal: the swap is documented as a sweep (0x1b4a yields zero qualifying person-thuds in 6000 frames; 0x1001 is the earliest clean hit in [0x1000,0x3000)), the buzzard-vs-knight precondition is preserved and re-verified with actual positions, and neither assertion was relaxed. *Fourth: the takeoff reset is not directly unit-tested* — true, but it executes the identical reset line as the in-air press case (`edge!==null && stepped.airborne`), which IS unit-tested, and takeoff is exercised by the seeded replays. Net: every avenue of "it's secretly broken" is closed by a check the change cannot satisfy accidentally.

- [VERIFIED] The reset fires exactly on the ROM's `CLR PTIMUP` moments — evidence: `frame.ts:349` `edge !== null && stepped.airborne ? {...stepped, timeUp:0} : stepped`; `wingEdge` returns non-null only on take-off/in-air-press/in-air-release (the GOFLIP/GOFLAP/STFLY clears), and the `stepped.airborne` gate preserves `land()`'s `timeUp=1` (STLDIR) on a landing frame. Complies with core-purity (pure spread) and generated-file rules (not in flight.ts).
- [VERIFIED] Player-only scope is correct, not under-implementation — evidence: `JOUSTRV4.SRC` grep shows `JSR ADDFLP` only at :6212 and `JSR AIROVR` only at :1492/:6167/:6194; enemy `OST*` path uses neither. enemy.ts change is comment-only.
- [VERIFIED] Impulse ordering preserved — evidence: `flap()` runs inside `stepPlayerEntity` before the caller's reset, so the press impulse reads the pre-clear budget (ADDFLP :6212 precedes CLR :6219); pinned by `ptimup-reset.test.ts` press-edge test asserting `velY === SPENT_IMPULSE + WINGS_DOWN_GRAV`.
- [MEDIUM→LOW] AC2's derived spec suggested a "300-frame hold-vs-tap, higher peak velocity" test; the implemented AC2 coverage is a 40-frame ceiling-reach discriminator plus a re-flap `-96` impulse assertion. These prove the SAME mechanic (releasing restores lift; tapping out-climbs a hold) more crisply and deterministically. Non-blocking — the derived AC's method was a suggestion, and the mechanic is fully pinned.
- [LOW] Takeoff-edge reset has no dedicated unit test (covered transitively by the in-air-press test sharing the reset line, and by the seeded replays). Nice-to-have, not required.
- [LOW / out-of-scope] Pre-existing: our port's buzzards read `timeUp` in `flap()` and never reset it, a modeling artifact of reusing the player flight core (the ROM buzzards don't use PTIMUP at all). jt9-8 correctly leaves this untouched; worth a future story to decide the faithful buzzard flap-impulse model.

### Reviewer (audit)

- **[Dev] The PTIMUP reset is PLAYER-ONLY — enemy.ts NOT changed** → ✓ ACCEPTED by Reviewer: independently re-verified against JOUSTRV4.SRC (ADDFLP one caller at :6212; AIROVR only player-loop + PTEFLY; buzzard OST* uses neither). Applying the reset to buzzards would have been the bug, not the fix. TEA's "apply symmetrically" was an explicitly-flagged Question, and the ROM answers it player-only.
- **README test-file count 121 → 123** → ✓ ACCEPTED by Reviewer: internally consistent with the diff (ptimup-reset.test.ts 4 `it` + ptimup-reset-source.test.ts 6 `it` = +10 tests, +2 files); matches lang-review check 20.

## Reviewer Assessment

**Verdict:** APPROVED

Adversarial review of jt9-8 (player PTIMUP wing-edge re-init + 22-fixture jt2 re-baseline). Three enabled specialists returned clean — [PREFLIGHT] green (joust 2757/2757, orchestrator 390/390, tsc clean, zero smells), [SEC] clean (pure offline sim, no trust boundary), [RULE] clean (0 of 29 checks violated). The two specialists whose domains carry this story's real risk — test-quality and comments — are disabled, so I covered both manually with line-level evidence (see the Subagent Results note): the re-baselines preserve every precondition and exact assertion, weaken no comparator, and are self-verified by the green suite plus bit-identical `rng` cursors; the source/comment citations are backed by the provenance suite in the same diff.

**Data flow traced:** flap `input` (shell edge) → `runBehaviour` computes `wingEdge(wasAirborne, prevFlapHeld, input)` → on a non-null edge while still airborne, the player entity's `timeUp` is set to 0 AFTER `stepPlayerEntity`'s `tickTimeUp` → the cleared budget makes the next `flap()` impulse full strength. Safe because it is a pure state transform (no entropy/clock/DOM), the reset never reaches the enemy path (ROM-verified player-only), and landing's `timeUp=1` is preserved by the `stepped.airborne` gate.
**Pattern observed:** derived-edge reset computed at a single, correctly-scoped state-machine exit and the edge reused for the wing cue — `frame.ts:348-349` (this is the textbook FIX for lang-review check 14).
**Error handling:** N/A for a pure numeric transform; the one test-helper `throw` (`ptimup-reset.test.ts` `entityOf`) is a fail-fast on a missing process, not a swallowed error.
**Deviations:** both logged deviations stamped ACCEPTED (see Reviewer audit). No undocumented deviations found.
**Handoff:** To SM for finish-story.

## Impact Summary

**jt9-8 delivered (trunk-based, commit `2f0778d` on `main`; single review round, APPROVED).** The ROM re-inits the flap-lift budget PTIMUP on player wing transitions (`CLR PTIMUP,U` — GOFLIP release :6185, GOFLAP press :6219, STFLY take-off via FLAST2), so releasing the button restores lift and rapid tapping out-climbs a hold. Our port only incremented `timeUp` and never cleared it in flight. Fix: `frame.ts` `runBehaviour` clears `timeUp` to 0 on a wing edge (`wingEdge != null`), after `tickTimeUp` and only while still airborne (landing's STLDIR keeps `timeUp=1`); the press impulse still reads the pre-clear budget (ADDFLP :6212 before CLR :6219).

**Scope:** PLAYER-ONLY. `enemy.ts` deliberately unchanged — every ROM PTIMUP site is in the player flight loop; buzzards' `OST*` movement calls neither ADDFLP nor AIROVR (independently ROM-verified). TEA's "apply symmetrically to buzzards" was an explicitly-flagged Question; the ROM answers it player-only. Two Reviewer non-blocking Improvements filed for future stories (buzzard flap-impulse model; a dedicated take-off unit test).

**AC3 re-baseline:** 22 jt2 seeded-replay fingerprints across audio-events, audio-thud, audio-transporter-split, dumb-wingbeat, audio-flap — each re-found by its own precondition and MEASURED (one seed change, 0x1b4a→0x1001, documented via a 6000-frame sweep). Every `rng` cursor stayed bit-identical (no entropy drift) and enemy rows byte-identical (buzzards untouched); no assertion weakened; the audio-flap "no player row moves" invariant was deliberately retired in-place (this IS the player flap seam).

**Verification:** joust 2757/2757 · `tsc --noEmit` clean · orchestrator 390/390 · shared 554/554. New: 4 behaviour contract tests + 6 ROM-provenance tests. AC1-AC5 all met; AC4 honoured (own commit, not co-landed with jt5-8).