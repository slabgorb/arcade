---
story_id: "tp1-7"
jira_key: "tp1-7"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-7: THE SKILL CONTOUR, part 1 — transcribe the ROM's eight per-wave difficulty tables and stop hand-tuning curves

## Story Details
- **ID:** tp1-7
- **Jira Key:** tp1-7
- **Workflow:** tdd
- **Stack Parent:** none
- **Type:** bug
- **Points:** 5
- **Priority:** p1

## Story Description

Cluster C4, cheap half. Subsumes W-011, W-012, W-014, W-019, W-020, W-033, W-035, W-037, DA-002. Eight table transcriptions from the ROM's CONTOUR/WTABLE machinery: enemy count, invader speed, spiker speed, bolt cap, bolt speed, tanker cargo, intro waves, pre-seeded spikes. Cheap TOGETHER — they are the same mechanism read eight times. Depends on tp1-1 (every one of these is a rate or a count) and tp1-6 (populations are capped by the slot machinery).

## Acceptance Criteria

1. The ROM's CONTOUR/WTABLE per-wave tables are transcribed verbatim and cited — enemy count, invader speed, spiker speed, enemy-bolt cap, bolt speed, tanker cargo, intro waves, pre-seeded spikes.
2. Every hand-tuned difficulty curve in rules.ts that these tables replace is DELETED, not left as a fallback.
3. Values are read through the tables at the wave index — no interpolation, no formula fitted to the table.
4. Depends on tp1-1 (rates) and tp1-6 (populations).
5. npm test -- citations stays green.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T14:26:13Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T12:07:32+00:00 | 2026-07-15T12:10:06Z | 2m 34s |
| red | 2026-07-15T12:10:06Z | 2026-07-15T12:55:29Z | 45m 23s |
| green | 2026-07-15T12:55:29Z | 2026-07-15T13:29:36Z | 34m 7s |
| review | 2026-07-15T13:29:36Z | 2026-07-15T13:53:14Z | 23m 38s |
| red | 2026-07-15T13:53:14Z | 2026-07-15T14:11:52Z | 18m 38s |
| green | 2026-07-15T14:11:52Z | 2026-07-15T14:16:32Z | 4m 40s |
| review | 2026-07-15T14:16:32Z | 2026-07-15T14:26:13Z | 9m 41s |
| finish | 2026-07-15T14:26:13Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): Extract the CONTOUR fold ONCE as `contourWave(level)` and route all eight new bounded tables through it — do not inline the `level >= 99 ? 99 : level` fold 8×. Affects `tempest/src/core/rules.ts` (a shared helper carrying the ALWELG.MAC:415-423 citation; the tp1-26 epic note already mandates this and names wfuschForLevel/WPULTIM/WPULPOT as its other clients). *Found by TEA during test design.*

- **Question** (non-blocking): The deep-wave fold is OBSERVABLE for TNYMMX and TINVIN — the ROM's random band 65..96 spans TWO TA records (TNYMMX) / a TR alternation (TINVIN), so tp1-25's fold-to-99 OVERSHOOTS (TNYMMX(99)=61 exceeds the band's max 58). Affects `tempest/src/core/rules.ts` (pick a deterministic representative wave in 65..96, not 99; cite the choice). RED pins only sanity there — the exact value is Dev's call. *Found by TEA during test design.*

- **Gap** (non-blocking): The pre-seed must run at BOTH wave-init sites, not just advanceLevel. Affects `tempest/src/core/sim.ts` (advanceLevel's `spikes.fill(0)` at ~:774/:814 AND the advanced-start path startGameAtLevel — sim.framing's re-seated test drives the latter at wave 4 and will stay red until it also seeds). *Found by TEA during test design.*

- **Improvement** (non-blocking): The doc that the old L5+/L11/L17 gates cite as ROM authority is refuted by W-035. Affects `tempest/docs/ux/2026-06-27-enemy-roster-rom-extract.md` §H (its "tankers L5+ · spikers L5+" is wrong; the ROM is tanker 3 / spiker 4 — W-035's own [CORRECTION] flags the doc, not just rules.ts). Correct or annotate it so no future story re-derives the wrong schedule. *Found by TEA during test design.*

- **Gap** (non-blocking): AC-5 needs BOTH remediation AND reanchoring. Affects `tempest/docs/audit/findings/*.json` — mark the nine subsumed findings `remediated_by: "tp1-7"` (frozen `ours` history), AND run `node tools/audit/reanchor-citations.mjs --write` for any OTHER citation whose line shifts because tp1-7 edits rules.ts/sim.ts (LOST reports = a fixed line that also needs remediation). Commit the re-anchored JSON. *Found by TEA during test design.*

- **Improvement** (non-blocking, PM-visible): This story changes difficulty FEEL, authentically. Affects gameplay balance — enemies get SLOWER at wave 17 (TINVIN dips -96→-81), the enemy count DROPS at waves 7/12 (TNYMMX), the wave-1 bolt cap halves (4→2), and from wave 4 every lane opens pre-spiked. All are ROM-faithful (the epic's "follow the ROM" ruling), but the Reviewer/PM should see the balance shift, not just the code. *Found by TEA during test design.*

- **Conflict** (blocking, for tp1-8): The assembled ROM is self-contradictory on waves 35-39 — WSPIMI:625 (dotted `35.`) gives spiker MIN 1, while WSPIMX:633 (un-dotted `35` = 0x35 = 53 → dead range) gives spiker MAX 0. A 1981 assembler typo (the dropped dot). Affects `tempest/src/core/rules.ts` (tp1-8 ports WSPIMI and the NYMCHA population solver, which reads the full min/max pair per wave and MUST decode what the ROM does when min > max on these five waves — clamp to min? to max? — from the consuming code, not by assuming). tp1-7's match-bytes ruling deliberately SURFACES this rather than hiding it behind the decimal misread's accidental max=1. *Found by TEA during test design (red rework).*

- **Gap** (non-blocking, for tp1-8): tp1-8 should add a source-rules pin for every WSPIMI/WSPIMX record whose start or end ≥ 0x0A, radix-decoded, so the next un-dotted-hex typo fails loudly (this one was latent and only an independent re-decode caught it). Affects `tempest/tests/core/tp1-7.source-rules.test.ts` (the WSPIMX-record-6 radix block added here is the template). *Found by TEA during test design (red rework).*

- **Question** (non-blocking): the source-rules ROM-pin suite is `describe.skipIf(!sourceAvailable)`, so its 22 byte-pins (now including the :633/:625 radix contrast) run only where the copyrighted ROM is present and skip in CI — the very net that should have caught this byte is off in CI. The red-rework port assertion in `tp1-7.contour-tables.test.ts` is CI-safe by design (reads `rules.ts`), but the ROM-vs-port comparison is only complete locally. Affects `tempest/tests/core/tp1-7.source-rules.test.ts`; a documented local test profile requiring `TEMPEST_SOURCE_DIR` would close it (Reviewer's own non-blocking observation). *Found by TEA during test design (red rework).*

### Dev (implementation)

- **Gap** (non-blocking): Changing a per-wave COUNT consumed at state init shifts the seeded RNG for every fixture. Affects any future story that alters a value drawn during `initialState`/`spawnForLevel` (tp1-7's `enemyCount(1)` 6→10 drew 4 extra nymph-lane values, silently flipping the seeded fuseball jitter coin in `tp1-3`/`tp1-6`). Fix the FIXTURE (pin the incidental DOF or seed-search), never the assertion; and run `tsc --noEmit` before handoff (vitest does not typecheck — an unused `const` passes vitest, fails the build). *Found by Dev during implementation.*

- No upstream findings during implementation (rework). The WSPIMX record-6 fix (`start:35`→`53`) is data-only and latent — the record is consumed solely by `firstNonZeroWave(WSPIMX)`=4, which is unchanged — so the full suite stayed 1377/1377 with zero RNG ripple, and the inline comment shifted no cited lines (citations 22/22). TEA's blocking min>max Delivery Finding to tp1-8 stands. *Found by Dev during implementation.*

### Reviewer (code review)

- **Conflict** (blocking): WSPIMX record 6 is transcribed decimal but the ROM byte is HEX. `src/core/rules.ts:688` reads `ALWELG.MAC:633` `.BYTE T1,35,39.,1` as `{start:35,end:39}`; `35` has no trailing dot, so under the hex-default radix it is `0x35 = 53` — the assembled ROM record is the dead range `[53,39]` (arcade spiker-max **0** on waves 35-39), while the port returns **1**. Affects `tempest/src/core/rules.ts` (WSPIMX record 6: change `start:35`→`start:53` / drop the record to yield 0, OR keep 35 as an explicitly documented deliberate deviation citing the ROM typo + the WSPIMI :625 min=1 contradiction). Latent for tp1-7; live & self-contradictory (min>max) for tp1-8. *Found by Reviewer during code review (independent ROM re-decode).*
- **Improvement** (non-blocking): `tests/core/tp1-7.source-rules.test.ts` gates every `describe` on a hardcoded absolute path (`/Users/slabgorb/Projects/tempest-source-text`, env-overridable via `TEMPEST_SOURCE_DIR`); the ROM is copyrighted/gitignored so the "18/18 transcription backbone" silently `skipIf`s in CI and on any other checkout. Acceptable (values are redundantly pinned in the CI-safe behavioral suites; tp1-25 convention) but the absolute path is fragile — a second dev or a renamed `~/Projects` loses the backstop with a green board. Consider requiring `TEMPEST_SOURCE_DIR` in a documented local test profile. Affects `tempest/tests/core/tp1-7.source-rules.test.ts`. *Found by Reviewer during code review.*
- **Gap** (non-blocking, for tp1-8): had WSPIMX line 633 pinned in source-rules, this radix defect would have failed loudly. tp1-8 (which consumes the full WSPIMX curve) should add a source pin for every record whose start/end ≥ 0x0A, decoding the radix. Affects `tempest/tests/core/tp1-7.source-rules.test.ts`. *Found by Reviewer during code review.*
- Rework re-review: no new upstream findings. The one blocking finding above is RESOLVED (`rules.ts:688` `start:53`, mutation-proven + independently re-decoded). TEA's blocking min>max Delivery Finding to tp1-8 stands and is correctly the vehicle for the ROM contradiction; the two non-blocking findings above (source-rules CI-skip; tp1-8 radix source-pins) also stand. *Found by Reviewer during code review (rework).*

## Impact Summary

**Note:** The automated R1-format extractor only matched 1 of 13 findings below (several
use qualified urgency tags like `(blocking, for tp1-8)` or contain nested parentheses that
don't fit the strict R1 regex). This section is manually reconciled against the full
`## Delivery Findings` above so the blocking-for-tp1-8 item isn't lost.

**Upstream Effects:** 13 findings (3 Gap, 1 Conflict, 2 Question, 2 Improvement, +5 narrative
notes from Dev/Reviewer) across TEA, Dev, and Reviewer.
**Blocking:** 1 — for tp1-8, NOT blocking tp1-7's finish (see below).

### Blocking for tp1-8 (not blocking tp1-7 finish)

- **Conflict:** The assembled ROM is self-contradictory on waves 35-39 — `WSPIMI:625`
  (dotted `35.`) gives spiker MIN 1, while `WSPIMX:633` (un-dotted `35` = hex `0x35` = 53 →
  dead range) gives spiker MAX 0. tp1-7 transcribed the byte verbatim (match-bytes ruling,
  `rules.ts:688`, resolved in rework — Reviewer APPROVED) rather than papering over the
  contradiction. **tp1-8's NYMCHA population solver must decide what happens when min > max**
  on these five waves (clamp to min? to max? something else?) from the consuming code, not
  by assumption. Affects `tempest/src/core/rules.ts`. *Found by TEA (test design), confirmed
  independently by Reviewer (code review).*

### Non-blocking, forward to tp1-8

- Add a source-rules ROM pin for every WSPIMI/WSPIMX record whose start or end is ≥ 0x0A,
  radix-decoded, so a future un-dotted-hex typo fails loudly — this one was latent and only
  caught by an independent re-decode. Template: the WSPIMX-record-6 radix block in
  `tempest/tests/core/tp1-7.source-rules.test.ts`. *Found by TEA and independently by
  Reviewer.*
- `tp1-7.source-rules.test.ts` is `describe.skipIf(!sourceAvailable)` — it runs only where
  the copyrighted ROM source is present locally and skips in CI, so the net that should
  catch radix typos is off in CI (the CI-safe `tp1-7.contour-tables.test.ts` behavioral
  suite is what actually bites). Consider a documented local test profile requiring
  `TEMPEST_SOURCE_DIR`. *Found by TEA and Reviewer.*

### Non-blocking, general

- Extract the CONTOUR fold once as a shared `contourWave(level)`/`contourValue()` helper
  rather than inlining it 8× — **already implemented** by Dev and verified by Reviewer
  ("tp1-26 mandate met, not inlined 8×"). No forward action.
- Any future story that changes a per-wave COUNT consumed during `initialState`/
  `spawnForLevel` will shift seeded RNG for existing fixtures (this story's `enemyCount(1)`
  6→10 silently flipped a fuseball jitter coin in two `tp1-3`/`tp1-6` fixtures — fixed by
  hardening the fixtures, not the assertions). Standing landmine for future authors, not a
  defect in this story. *Found by Dev during implementation.*
- `tempest/docs/ux/2026-06-27-enemy-roster-rom-extract.md` §H is refuted by W-035 ("tankers
  L5+ / spikers L5+" is wrong; ROM is tanker wave 3 / spiker wave 4) and should be corrected
  or annotated so a future story doesn't re-derive the wrong schedule. *Found by TEA.*

### PM-visible (non-blocking, authentic ROM-faithful balance shift)

- This story changes difficulty FEEL: enemies get SLOWER at wave 17 (TINVIN dips -96→-81),
  enemy count DROPS at waves 7/12 (TNYMMX), the wave-1 bolt cap halves (4→2), and from wave 4
  every lane opens pre-spiked. All ROM-faithful per the epic's "follow the ROM" ruling —
  flagged for PM/Reviewer visibility, not as a defect. *Found by TEA.*

### Resolved during this story (no forward action)

- Reviewer's one blocking finding (WSPIMX record 6 radix misread, `rules.ts:688`) was
  RESOLVED in the rework round-trip: transcribed as the assembled `0x35 = 53`, mutation-
  proven, re-confirmed by an independent ROM auditor. Final verdict: APPROVED.

### Downstream Effects

- **`tempest/src/core/rules.ts`** — 1 blocking finding (tp1-8's NYMCHA min>max clamp) + 2
  non-blocking findings (source-rules radix pins, CI-skip) route forward to tp1-8.
- **`tempest/docs/ux/2026-06-27-enemy-roster-rom-extract.md`** — 1 non-blocking doc
  correction outstanding.

### Deviation Justifications

11 deviations

- **Intro-waves scope: introduction correction only, not the population solver**
  - Rationale: the min/max population SOLVER (NYMCHA) is explicitly story tp1-8 ("the audit's second-largest rewrite"); tp1-7 is the "cheap half" — transcribe + read + delete. rollSpawnKind stays a weighted roll (sim.ts:177 already says the solver is tp1-8) with the SPAWN_CYCLE_HARD_SCALE axis (story 3-4) retained; only its introduction gates become table-derived.
  - Severity: minor
  - Forward impact: tp1-8 consumes the mins + per-wave gaps + reserves cargo slots + biases spikers. `sim.difficulty` "full roster by 18" relies on monotonic introduction — if tp1-8 makes availability per-wave, re-seat it.
- **Deep-wave fold pinned as SANITY, not an exact value, for TNYMMX and TINVIN**
  - Rationale: CONTOUR folds wave>=99 to a RANDOM wave in 65..96 (415-423). For TWFUSC/WPULTIM that band lay inside ONE record (unobservable) so tp1-25 could fold-to-99 deterministically — but TNYMMX's band SPANS the 65-80 and 81-99 TA records and TINVIN's is a TR alternation, so the fold is OBSERVABLE and the ROM value there is genuinely random. Pinning one value would over-specify where the ROM does not. The hard requirement (no walk-off to a degenerate 0) is pinned.
  - Severity: minor
  - Forward impact: Dev decides the deterministic fold strategy (fold-to-99 overshoots TNYMMX; a representative wave in 65..96 is more faithful). Routed as a Delivery Finding with the citation. The shared `contourWave` fold helper (tp1-26 epic note) should be extracted here, not inlined 8×.
- **Re-seated sim.difficulty.test.ts: story 3-4's monotonic ramp + L33 cap are refuted by the ROM**
  - Rationale: story 3-4 invented an always-rising ramp; the ROM has a genuine wave-17 slowdown. TEA owns test maintenance; leaving the old assertions would trap Dev between the new AC and a refuted sibling.
  - Severity: moderate (changes the difficulty FEEL — a real wave-17 slowdown; PM-visible)
  - Forward impact: none for tp1-7; noted as a Delivery Finding for Reviewer/PM visibility.
- **Re-seated the enemy INTRODUCTION siblings (sim.spawn + sim.difficulty): tanker wave 3, spiker wave 4**
  - Rationale: the old tests cite a ROM-extract doc W-035 refutes; they go red the moment Dev fixes the gate.
  - Severity: minor
  - Forward impact: the refuted doc (docs/ux/2026-06-27-enemy-roster-rom-extract.md) should be corrected too — routed as a Delivery Finding (W-035's own [CORRECTION] flags it).
- **Re-seated the tanker-cargo siblings: cargo intro moves L11/L17 -> wave 33/41**
  - Rationale: the old gates (fuseball cargo L11, pulsar L17) manufacture cargo 22/24 waves early; they go red on the fix.
  - Severity: minor
  - Forward impact: none.
- **Re-seated the flat-bolt-cap sibling (sim.enemy-fire): wave-1 cap is 2, not 4**
  - Rationale: the flat MAX_ENEMY_BULLETS=4 doubles wave-1 bolt pressure; the test hardcoded 4 at a wave where the ROM cap is 2.
  - Severity: minor
  - Forward impact: none.
- **Re-seated the spike-zero siblings (sim.framing L4, sim.advance-level L8): wave-start seeds spikes**
  - Rationale: from wave 4 a fresh board is seeded, not clean; the old assertions go red on the fix. sim.framing (advanced start to wave 4) additionally pins that INIENE seeds on the ADVANCED-START path, not only advanceLevel.
  - Severity: minor
  - Forward impact: Dev must seed spikes at BOTH wave-init sites (advanceLevel AND startGameAtLevel) — the sim.framing re-seat enforces it.
- **RED REWORK: WSPIMX record 6 ruled MATCH-BYTES (0x35=53 → waves 35-39 max 0), not honor-intent (35 → max 1)**
  - Rationale: a verbatim-transcription epic means the port must contain the byte the ROM contains. The "1 spiker" outcome — if that is what the cabinet did — must emerge from tp1-8's NYMCHA decode of the min>max clamp, never from us silently editing the transcription (that is the hand-tuning AC-2 deletes). Match-bytes surfaces the ROM's genuine self-contradiction on 35-39 (WSPIMI min 1 > WSPIMX max 0) instead of papering over it. The Reviewer offered both as acceptable; AC-1 + epic authority ("follow the ROM") resolve it to match-bytes, listed first, and consistent with every other gap in this same table.
  - Severity: moderate (a deliberate fidelity decision affecting tp1-8's population solver; latent for tp1-7)
  - Forward impact: tp1-8's NYMCHA reads the full WSPIMX min/max pair per wave and MUST resolve min 1 > max 0 on waves 35-39 (routed as a blocking-for-tp1-8 Delivery Finding). Recommended fix for Dev: transcribe verbatim as `{ t: 'T1', start: 53, end: 39, v: 1 }` (the literal assembled byte) — the tests also accept dropping the record; both yield max 0. Do NOT re-introduce `start: 35`.
- **Deep-wave fold resolved as fold-to-99 (deterministic), not the ROM's random band**
  - Rationale: the ROM randomizes wave-99+ via RANDO2 (unreproducible in a pure deterministic port), and the tests require only sanity there (no TE-0 walk-off), which fold-to-99 satisfies (61 ≤ the guard's 61). Fold-to-99 keeps ONE shared helper consistent with wfuschForLevel/WPULTIM/WPULPOT (tp1-26) rather than a per-table representative wave. The overshoot is confined to waves ≥99, which normal play never reaches.
  - Severity: minor
  - Forward impact: if a future story needs faithful deep-wave (99+) difficulty, revisit contourWave to a representative-wave fold. Not needed for the playable range.
- **Closed FR-010 and FR-013 (outside the 9 subsumed) and re-anchored W-036**
  - Rationale: a story may legitimately close findings outside its named set when its diff removes their cited line; marking a CONFIRMED finding remediated would write a phantom fix (the tempest-citation-gate lesson).
  - Severity: minor
  - Forward impact: none — all 129 citations resolve; 22/22 citation tests green.
- **Hardened tp1-3 and tp1-6 fuseball fixtures against the TNYMMX seeded-RNG shift**
  - Rationale: the failures were RNG-fragility from a correct count change, not logic bugs — the fuse authentically rolls off-lane on a passing coin. Reverting the count (AC-1) would be wrong; the fixtures had to become RNG-robust.
  - Severity: minor
  - Forward impact: any future change to a count consumed in `initialState` shifts seeded fixtures again — these two are now robust.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Intro-waves scope: introduction correction only, not the population solver**
  - Spec source: context-story-tp1-7.md, AC-1 ("intro waves") + AC-3 ("read through the tables")
  - Spec text: "The ROM's CONTOUR/WTABLE per-wave tables are transcribed verbatim and cited — … intro waves …"
  - Implementation: tests pin the INTRODUCTION wave of each type (tanker 3, spiker 4, fuseball 11, pulsar 17) from the max tables and delete rollSpawnKind's `level>=5` gates. They do NOT pin per-wave availability GAPS (WSPIMX blanks spikers on waves 17-19/33-34/40-42) nor per-type COUNT enforcement.
  - Rationale: the min/max population SOLVER (NYMCHA) is explicitly story tp1-8 ("the audit's second-largest rewrite"); tp1-7 is the "cheap half" — transcribe + read + delete. rollSpawnKind stays a weighted roll (sim.ts:177 already says the solver is tp1-8) with the SPAWN_CYCLE_HARD_SCALE axis (story 3-4) retained; only its introduction gates become table-derived.
  - Severity: minor
  - Forward impact: tp1-8 consumes the mins + per-wave gaps + reserves cargo slots + biases spikers. `sim.difficulty` "full roster by 18" relies on monotonic introduction — if tp1-8 makes availability per-wave, re-seat it.

- **Deep-wave fold pinned as SANITY, not an exact value, for TNYMMX and TINVIN**
  - Spec source: context-story-tp1-7.md, AC-3; TEA sidecar "test the wave AFTER the last row"
  - Spec text: "Values are read through the tables at the wave index — no interpolation"
  - Implementation: for waves 1-64 (playable range) every value is pinned EXACTLY; for wave >= 99 the tests assert only that the value is SANE (enemyCount>0 & <=61, cap>=2, speed>0, spike height finite in [0,0.4]) — never the TE-0 walk-off.
  - Rationale: CONTOUR folds wave>=99 to a RANDOM wave in 65..96 (415-423). For TWFUSC/WPULTIM that band lay inside ONE record (unobservable) so tp1-25 could fold-to-99 deterministically — but TNYMMX's band SPANS the 65-80 and 81-99 TA records and TINVIN's is a TR alternation, so the fold is OBSERVABLE and the ROM value there is genuinely random. Pinning one value would over-specify where the ROM does not. The hard requirement (no walk-off to a degenerate 0) is pinned.
  - Severity: minor
  - Forward impact: Dev decides the deterministic fold strategy (fold-to-99 overshoots TNYMMX; a representative wave in 65..96 is more faithful). Routed as a Delivery Finding with the citation. The shared `contourWave` fold helper (tp1-26 epic note) should be extracted here, not inlined 8×.

- **Re-seated sim.difficulty.test.ts: story 3-4's monotonic ramp + L33 cap are refuted by the ROM**
  - Spec source: docs/audit finding W-012 (TINVIN) + W-011 (TNYMMX); spec-authority (ROM > story 3-4)
  - Spec text: TINVIN "restarts at -81 (enemies get SLOWER at wave 17)"; keeps climbing to -120 (49-64)
  - Implementation: deleted the `p20 > p16` per-wave monotonic speed/count claim (refuted by the wave-17 dip) and the `flipperSpeed(50) <= flipperSpeed(33)` cap (refuted by the climb past 33). Re-seated to the ROM truth: long-run rise (33>1), the wave-17 DIP, and speed rising past 33. The anti-reset intent now lives in the retained hard-enemy escalation (unchanged).
  - Rationale: story 3-4 invented an always-rising ramp; the ROM has a genuine wave-17 slowdown. TEA owns test maintenance; leaving the old assertions would trap Dev between the new AC and a refuted sibling.
  - Severity: moderate (changes the difficulty FEEL — a real wave-17 slowdown; PM-visible)
  - Forward impact: none for tp1-7; noted as a Delivery Finding for Reviewer/PM visibility.

- **Re-seated the enemy INTRODUCTION siblings (sim.spawn + sim.difficulty): tanker wave 3, spiker wave 4**
  - Spec source: finding W-035; the doc it refutes (docs/ux/2026-06-27-enemy-roster-rom-extract.md §H)
  - Spec text: WTANMX = 0,0,1,0,1 (tanker first on wave 3); WSPIMX = 0,0,0,2,3,4 (spiker first on wave 4)
  - Implementation: "flippers only through level 4" → "through wave 2"; "tankers/spikers at level 5" → "tanker wave 3, spiker wave 4"; the sim-driven "level 4 flippers only" → "wave 4 spawns tankers+spikers". Fuseball(11)/pulsar(17) tests kept (correct).
  - Rationale: the old tests cite a ROM-extract doc W-035 refutes; they go red the moment Dev fixes the gate.
  - Severity: minor
  - Forward impact: the refuted doc (docs/ux/2026-06-27-enemy-roster-rom-extract.md) should be corrected too — routed as a Delivery Finding (W-035's own [CORRECTION] flags it).

- **Re-seated the tanker-cargo siblings: cargo intro moves L11/L17 -> wave 33/41**
  - Spec source: finding W-033 (WWTAC2/WWTAC3)
  - Spec text: slot 2 = ZCARFL(1-32)/ZCARFU(33-40)/ZCARPU(41-99); slot 3 = ZCARFL(1-48)/ZCARFU(49-99)
  - Implementation: rewrote sim.spawn's "rollTankerCargo respects the roster" describe from the L11/L17 roster-aligned gates to the WTACAR table (flipper-only until 33, fuseball at 33, pulsar at 41).
  - Rationale: the old gates (fuseball cargo L11, pulsar L17) manufacture cargo 22/24 waves early; they go red on the fix.
  - Severity: minor
  - Forward impact: none.

- **Re-seated the flat-bolt-cap sibling (sim.enemy-fire): wave-1 cap is 2, not 4**
  - Spec source: findings W-019 / DA-002 (TCHAMX, WCHAMX+1)
  - Spec text: TCHAMX = 1,1,1,2,3,… so WCHAMX+1 = 2 at wave 1
  - Implementation: the "saturates to 4" test was on a WAVE-1 board (fireBoard's arg is the SEED, not the level). Re-seated to saturate to the per-wave cap = enemyBoltCapForLevel(1) = 2.
  - Rationale: the flat MAX_ENEMY_BULLETS=4 doubles wave-1 bolt pressure; the test hardcoded 4 at a wave where the ROM cap is 2.
  - Severity: minor
  - Forward impact: none.

- **Re-seated the spike-zero siblings (sim.framing L4, sim.advance-level L8): wave-start seeds spikes**
  - Spec source: finding W-037 (TELIHI / NWTELI via INIENE)
  - Spec text: "from wave 4 EVERY lane begins with a spike"; INIENE stamps NWTELI at every wave init
  - Implementation: two `spikes.every(h => h === 0)` assertions ran at waves 4 and 8 (nonzero TELIHI); re-seated to assert every lane equals the wave's initialSpikeHeightForLevel (uniform fresh seed, no stale carryover). The warp-replay/warp-death spike-zero assertions are at wave 1 (clean) and survive unchanged.
  - Rationale: from wave 4 a fresh board is seeded, not clean; the old assertions go red on the fix. sim.framing (advanced start to wave 4) additionally pins that INIENE seeds on the ADVANCED-START path, not only advanceLevel.
  - Severity: minor
  - Forward impact: Dev must seed spikes at BOTH wave-init sites (advanceLevel AND startGameAtLevel) — the sim.framing re-seat enforces it.

- **RED REWORK: WSPIMX record 6 ruled MATCH-BYTES (0x35=53 → waves 35-39 max 0), not honor-intent (35 → max 1)**
  - Spec source: story AC-1 ("transcribed VERBATIM"); Reviewer REJECT (WSPIMX record 6, `rules.ts:688` / ROM `ALWELG.MAC:633`)
  - Spec text: "The ROM's CONTOUR/WTABLE per-wave tables are transcribed verbatim and cited"
  - Implementation: pinned `ALWELG.MAC:633` `.BYTE T1,35,39.,1` radix-decoded — the un-dotted `35` is HEX `0x35 = 53` (ALWELG is inherited `.RADIX 16`; bare `0FF`/`1F` immediates prove it), so the assembled record is the dead range `[53,39]` and waves 35-39 get spiker-max **0** (the gap value, like 17-19/33-34/40-42). Tests require the port to match the assembled 0, NOT the decimal-misread 1. Rejected the honor-intent alternative (keep `35` decimal to match WSPIMI's min=1).
  - Rationale: a verbatim-transcription epic means the port must contain the byte the ROM contains. The "1 spiker" outcome — if that is what the cabinet did — must emerge from tp1-8's NYMCHA decode of the min>max clamp, never from us silently editing the transcription (that is the hand-tuning AC-2 deletes). Match-bytes surfaces the ROM's genuine self-contradiction on 35-39 (WSPIMI min 1 > WSPIMX max 0) instead of papering over it. The Reviewer offered both as acceptable; AC-1 + epic authority ("follow the ROM") resolve it to match-bytes, listed first, and consistent with every other gap in this same table.
  - Severity: moderate (a deliberate fidelity decision affecting tp1-8's population solver; latent for tp1-7)
  - Forward impact: tp1-8's NYMCHA reads the full WSPIMX min/max pair per wave and MUST resolve min 1 > max 0 on waves 35-39 (routed as a blocking-for-tp1-8 Delivery Finding). Recommended fix for Dev: transcribe verbatim as `{ t: 'T1', start: 53, end: 39, v: 1 }` (the literal assembled byte) — the tests also accept dropping the record; both yield max 0. Do NOT re-introduce `start: 35`.

### Dev (implementation)

- **Deep-wave fold resolved as fold-to-99 (deterministic), not the ROM's random band**
  - Spec source: TEA Delivery Finding (deep-wave fold, non-blocking); AC-3
  - Spec text: "pick a deterministic representative wave in 65..96, not 99; cite the choice"
  - Implementation: `contourWave(level) = level >= 99 ? 99 : level` for ALL eight tables, matching the shipped tp1-25 convention. TNYMMX(99)=61 (the last-row/hardest value) rather than a value inside the ROM's random 65..96 band.
  - Rationale: the ROM randomizes wave-99+ via RANDO2 (unreproducible in a pure deterministic port), and the tests require only sanity there (no TE-0 walk-off), which fold-to-99 satisfies (61 ≤ the guard's 61). Fold-to-99 keeps ONE shared helper consistent with wfuschForLevel/WPULTIM/WPULPOT (tp1-26) rather than a per-table representative wave. The overshoot is confined to waves ≥99, which normal play never reaches.
  - Severity: minor
  - Forward impact: if a future story needs faithful deep-wave (99+) difficulty, revisit contourWave to a representative-wave fold. Not needed for the playable range.

- **Closed FR-010 and FR-013 (outside the 9 subsumed) and re-anchored W-036**
  - Spec source: AC-5; reanchor-citations LOST report; CLAUDE.md citation-gate rules
  - Spec text: "remediated_by is ONLY for defects you actually removed"
  - Implementation: FR-010 (0.72 offset) and FR-013 (0.22 spiker ramp) are the framerate-pair TWINS of W-020/W-014 and cite the exact lines this story deleted — marked remediated_by tp1-7. W-036 (CONFIRMED, "pulsars enter at 17") had its `ours` quote edited by the rollSpawnKind rewrite; it is RE-ANCHORED to the new line (`level >= PULSAR_INTRO_WAVE`), NOT remediated (no defect — it still matches). reanchor-citations --write fixed 45 shifted lines; `0 lost` after.
  - Rationale: a story may legitimately close findings outside its named set when its diff removes their cited line; marking a CONFIRMED finding remediated would write a phantom fix (the tempest-citation-gate lesson).
  - Severity: minor
  - Forward impact: none — all 129 citations resolve; 22/22 citation tests green.

- **Hardened tp1-3 and tp1-6 fuseball fixtures against the TNYMMX seeded-RNG shift**
  - Spec source: the tests TEA wrote / the shipped sibling suites; AC-1 (TNYMMX)
  - Spec text: `enemyCount(1)` = TNYMMX(1) = 10 (was 6)
  - Implementation: `initialState` draws `enemyCount(1)` nymph lanes, so the level-1 budget going 6→10 draws 4 extra RNG values, shifting the seeded fuseball jitter coin in two fixtures built on `playingState`/`isolated`. Fixed the FIXTURES, not the assertions: tp1-6 `boardWithFuseAt` pins `jitterTimer: 999` (the grab test must keep the fuse on-lane, not test the jitter); tp1-3's settle test uses a new `settleOnce` seed-search (mirror of `rollOnce`) instead of magic seed 1, and its comment's wrong "step toward player is 0" rationale (it is LEFRIT, a coin, at level 1) is corrected.
  - Rationale: the failures were RNG-fragility from a correct count change, not logic bugs — the fuse authentically rolls off-lane on a passing coin. Reverting the count (AC-1) would be wrong; the fixtures had to become RNG-robust.
  - Severity: minor
  - Forward impact: any future change to a count consumed in `initialState` shifts seeded fixtures again — these two are now robust.

### Reviewer (audit)

Every logged deviation was independently checked (ROM re-decode + mutation tests + findings diff):

- **TEA #1 (intro-waves scope: introduction only, not the solver)** → ✓ ACCEPTED: matches AC-1's "intro waves" scope; `firstNonZeroWave` is correct (3/4/11/17, independently decoded). Population solver is tp1-8.
- **TEA #2 (deep-wave fold as SANITY for TNYMMX/TINVIN)** → ✓ ACCEPTED: the walk-off GUARD tests are mutation-proven (removing `contourWave`'s fold → deep-wave tests RED).
- **TEA #3 (re-seat sim.difficulty: story 3-4 ramp/L33 cap refuted)** → ✓ ACCEPTED: the re-seat STRENGTHENS coverage — pins the ROM wave-17 dip and past-33 climb; not a coverage deletion (diff read).
- **TEA #4 (re-seat intro siblings: tanker 3 / spiker 4)** → ✓ ACCEPTED: 2000-sample distributions; agrees with W-035 and the independent decode.
- **TEA #5 (re-seat tanker-cargo siblings L11/L17 → 33/41)** → ✓ ACCEPTED: WWTAC2/3 decoded byte-exact; sampling tests bind.
- **TEA #6 (re-seat flat-bolt-cap: wave-1 = 2)** → ✓ ACCEPTED: TCHAMX+1 decoded (wave1=2); fire-gate consumer mutation-proven.
- **TEA #7 (re-seat spike-zero siblings: wave-start seeds spikes)** → ✓ ACCEPTED: TELIHI consumer mutation-proven through the real clear→warp→arrive path.
- **Dev #1 (fold-to-99, not the ROM random 65..96 band)** → ✓ ACCEPTED: the ROM randomizes 99+ (RANDO2), unreproducible in a pure port; fold-to-99 keeps ONE shared helper and satisfies the sanity guards. Documented, minor.
- **Dev #2 (closed FR-010/FR-013, re-anchored W-036)** → ✓ ACCEPTED: findings diff audited — FR-010/FR-013 are the framerate twins of W-020/W-014 and correctly `remediated_by`; W-036's `verbatim` re-anchor (`level >= 17` → `level >= PULSAR_INTRO_WAVE`) is semantics-preserving (PULSAR_INTRO_WAVE === 17, verified) and correctly NOT remediated. No prose laundering.
- **Dev #3 (hardened tp1-3/tp1-6 fuseball fixtures)** → ✓ ACCEPTED: RNG-fragility from a correct count change; fixed the fixtures, not the assertions — the right call.

- **UNDOCUMENTED (WSPIMX record 6, waves 35-39):** Spec (AC-1) says transcribe the intro-max tables VERBATIM. `rules.ts:688` transcribes ROM `ALWELG.MAC:633` `.BYTE T1,35,39.,1` as `{start:35,end:39}` — but `35` has NO trailing dot, so under the hex-default radix it is `0x35 = 53`: the assembled record is the dead range `[53,39]` and the arcade gives spiker-max **0** on waves 35-39, not 1. Not logged by TEA/Dev (an unnoticed radix misread, not a reasoned intent-over-bytes choice). Severity: **H (blocking)** — see Reviewer Assessment. Latent for tp1-7 (only `firstNonZeroWave`=4 is consumed) but a live, self-contradictory (WSPIMI min=1 > max=0) divergence for tp1-8. → **RESOLVED by the rework** (see Reviewer audit, rework round-trip, below).

### Reviewer (audit) — rework round-trip (WSPIMX record 6)

- **TEA (rework): "WSPIMX record 6 ruled MATCH-BYTES (0x35=53 → waves 35-39 max 0), not honor-intent"** → ✓ **ACCEPTED**. Independently re-decoded (opus auditor + my own `od -c`): `:633` `35` is un-dotted → hex `0x35 = 53`; `:625` WSPIMI `35.` is dotted → decimal 35, min 1; ambient radix HEX proven by bare `0FA`/`0FC`/`0FF`/`1F`. Match-bytes is the correct reading of AC-1 "verbatim" — the port must carry the assembled byte, not the programmer's intent; the emergent behaviour on min>max belongs to tp1-8's NYMCHA decode, not a silent edit here. The ruling is sound and the blocking min>max contradiction is correctly routed to tp1-8.
- **Dev (rework): "no deviations — implemented the ruling verbatim (start 53)"** → ✓ **ACCEPTED**. The fix IS the ruling: `rules.ts:688` `start:35`→`53`. Mutation-proven the new port test bites (revert `53`→`35` → `tp1-7.contour-tables` 2 RED, ROM-side source-rules pins stay green by design), and the only consumer is unmoved (`firstNonZeroWave(WSPIMX)`=4, set by record 1). Full suite byte-identical: 1377/1377, zero RNG ripple, citations 22/22, tsc clean. The `start>end` dead range is the faithful transcription, correctly annotated inline.
- **My prior UNDOCUMENTED finding is now RESOLVED** — transcription matches the assembled ROM, the radix decode is pinned in a CI-safe test (bites) plus a ROM-side anchor, and the typo is documented in code + routed to the consuming story.

## SM Assessment

**Setup complete — routing to TEA (O'Brien) for the red phase.**

Story tp1-7 is the cheap half of Cluster C4: eight per-wave table transcriptions
from the ROM's CONTOUR/WTABLE machinery (enemy count, invader speed, spiker speed,
enemy-bolt cap, bolt speed, tanker cargo, intro waves, pre-seeded spikes). These are
the *same mechanism read eight times*, which is why they are bundled.

**Verified before handoff:**
- Both declared dependencies are landed on `origin/develop`: tp1-1 (rates) `done`,
  tp1-6 (NYMPHS + 7-invader cap, `783f70e`) `done`. TEA is not building on air.
- No sibling-checkout race: no commits or PRs mention tp1-7 in orchestrator or tempest.
- Feature branch `feat/tp1-7-skill-contour-difficulty-tables` created from tempest `develop`.

**Guidance for TEA (red phase):**
- This is a ROM-fidelity story. The `rom-fidelity-audit` skill and the tempest
  reference/ ROM quarry are the sources of truth for the eight tables — transcribe
  **verbatim and cite** (AC-1). No formula fitting (AC-3).
- AC-2 is a *deletion* requirement: every hand-tuned difficulty curve in `rules.ts`
  that a table replaces must be DELETED, not left as a fallback. Tests should assert
  the table is the sole source, not just that a table exists.
- AC-5: `npm test -- citations` must stay green. A comment-only edit to a cited file
  shifts pinned line numbers and breaks the citation gate — re-anchor after any edit.

**No upstream blockers.** Clean handoff.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev). Verified: `npx vitest run` → **41 failed | 1327 passed**; every failure is a tp1-7 RED test (30) or an intended sibling re-seat (11), each failing for the right reason (value/behaviour mismatch, not a typo), with zero collateral damage to the other 1327 tests.

**The eight tables, each transcribed verbatim + read at the wave index (AC-1/AC-3):**

| # | Table | ROM (ALWELG.MAC) | Finding | Replaces (deleted, AC-2) |
|---|-------|------------------|---------|--------------------------|
| 1 | enemy count | TNYMMX :697 (TZ, non-monotonic) | W-011 | `enemyCount: 6+(level-1)*2` |
| 2 | invader speed | TINVIN :591 (dips @17, climbs past 33) | W-012 | `flipperSpeedForLevel` linear interp |
| 3 | spiker speed | TSPIIN :602 (TB: == flipper waves 1-20) | W-014 | `spikerSpeed: 0.22*ramp` |
| 4 | bolt cap | TCHAMX :586 (WCHAMX+1, non-monotonic) | W-019/DA-002 | `MAX_ENEMY_BULLETS=4` flat |
| 5 | bolt speed | TCHARIN :600 (TB -64 → +2.0/frame) | W-020 | `ENEMY_BOLT_SPEED_OFFSET=0.72` |
| 6 | tanker cargo | WWTAC2/3 :614 (flipper<33, pulsar 41+) | W-033 | `rollTankerCargo` L11/L17 gates |
| 7 | intro waves | WTANMX/WSPIMX :651/:628 (tanker 3, spiker 4) | W-035 | `rollSpawnKind` L5 gates |
| 8 | pre-seeded spikes | TELIHI :696 (TZANDF mod-16) | W-037 | `sim.ts` `spikes.fill(0)` |

**Test Files (7 — 4 new, 3 re-seated siblings, +2 spike-siblings, +1 nymph comment):**
- `tests/core/tp1-7.source-rules.test.ts` — quarry fingerprint (3569 lines, no form-feeds) + all 8 tables' ROM bytes verbatim at their cited lines + the type-code semantics (T1/TZ/TA/TB/TR/TZANDF) + the CONTOUR fold. **18/18 PASS** — the transcription backbone is byte-accurate against the primary source, so Dev's data is verifiable.
- `tests/core/tp1-7.contour-tables.test.ts` — behavioural lookups via EXISTING exports (enemy count, invader speed, spiker speed, bolt speed, cargo, intro) + AC-2 deletion greps + lang-review. Assertion-RED (right-reason: e.g. `expected 6 to be 10`).
- `tests/core/tp1-7.new-lookups.test.ts` — the two NEW pure functions `enemyBoltCapForLevel` / `initialSpikeHeightForLevel`. Import-RED (TypeError — functions absent), by design kept apart so the file above stays assertion-RED.
- `tests/core/tp1-7.sim-integration.test.ts` — CONSUMERS read the tables: a wave-4 board opens pre-spiked on every lane (real clear→warp→arrive path); the per-wave bolt cap gates fire through stepGame (wave 1 → 2, wave 5 → 4).
- `tests/audit/tp1-7.citations.test.ts` — AC-5: the nine subsumed findings must be `remediated_by: "tp1-7"`.
- RE-SEATED: `sim.difficulty` (monotonic ramp + L33 cap refuted), `sim.spawn` (intro + cargo), `sim.enemy-fire` (wave-1 cap 2), `sim.framing` + `sim.advance-level` (wave-start seeds spikes), `sim.enemy-authentic` untouched (survives — endpoints+ratios). See Design Deviations for the 6-field rationale on each.

### Rule Coverage

| Rule (lang-review/typescript.md) | Test(s) | Status |
|------|---------|--------|
| `as any` / non-null (#1) | contour-tables "no `as any` smuggled into the new table lookups" | failing (RED) |
| `x \|\| default` where x can be `0` (falsy-but-valid → BUG) | new-lookups "a clean-wave 0 is a real NUMBER…"; the walk-off GUARDs (0/TE-EOT is a real answer, never `\|\|`-defaulted) | failing (RED) |
| Exhaustive switch `default: assertNever` (#4) | transcription-as-data guard (contour-tables) + new record switches must mirror the existing `TWFUSC` `default: assertNever` pattern | noted (structural) |
| `Map.get()` undefined (#8) | roll-distribution helpers use `?? 0` throughout | passing |
| Test quality — no vacuous assertions | Phase-C self-check (below) | done |

**Rules checked:** 4 of the applicable TS lang-review checks have dedicated coverage; the walk-off "0 is a real value" class is the load-bearing one for this story (a `|| fallback` on any table lookup silently restores the hand-tuned bug — the exact tp1-25 regression).

**Self-check (Phase C):** 0 vacuous assertions. Every passing tp1-7 test is a deliberate keep-behavior/walk-off/precondition GUARD (fuseball=2×flipper ratio, deep-wave sanity, waves 1-2 flippers-only, fuseball/pulsar intro unchanged, findings-exist) — each asserts a real invariant that must survive the port; none is `assert(true)`/`let _ =`/always-None. Every RED failure was inspected for right-reason (value mismatch against the unfixed code), not import/typo noise.

**Handoff:** To Dev (Julia) for the GREEN implementation. Key traps, in order of how they bite:
1. Route EVERY bounded table through ONE shared `contourWave` fold — a naive walk returns the TE-0 above wave 99 (frozen count/cap/speed). Delivery Finding #1/#2.
2. TB tables (TSPIIN, TCHARIN) add the byte to WINVIL, which the ROM computes by walking WTABLE BACKWARDS — spiker/bolt derive from the SAME invader speed, so wire invader speed first.
3. Seed spikes at BOTH wave-init sites (advanceLevel AND startGameAtLevel) — Delivery Finding #3.
4. AC-5: `remediated_by: "tp1-7"` on the nine findings + `reanchor-citations.mjs --write` for shifted lines — Delivery Finding #5. A comment-only edit to a cited file also shifts pins.
5. Keep `rollSpawnKind`'s weighted table + SPAWN_CYCLE_HARD_SCALE — only its introduction GATES become table-derived; the population solver is tp1-8.

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 1368/1368 passing (GREEN) · `tsc --noEmit` clean · `npm test -- citations` 22/22 (AC-5)
**Branch:** feat/tp1-7-skill-contour-difficulty-tables (committed c22a9aa, pushed to origin)

**Files Changed:**
- `src/core/rules.ts` — the CONTOUR/WTABLE machinery: `contourWave()` fold + a typed-record `contourValue()` walker (T1/TZ/TA/TR), the eight tables (TNYMMX, TINVIN, TSPIIN, TCHAMX, TCHARIN, WWTAC2/3, WTANMX/WSPIMX/WFUSMX/WPULMX, TELIHI) and their read functions (`enemyCountForLevel`, `flipperSpeedForLevel` re-derived from TINVIN, `spikerSpeedForLevel`, `enemyBoltCapForLevel`, `initialSpikeHeightForLevel`, table-driven `rollSpawnKind`/`rollTankerCargo`). Deleted: `6+2*(level-1)`, `0.22*ramp`, the linear flipper interp + `FLIPPER_ALONG_PER_FRAME_L33`, flat `MAX_ENEMY_BULLETS`, `0.72` offset, the `level>=5/11/17` gates. `wfuschForLevel` routed through the shared fold.
- `src/core/sim.ts` — the fire gate reads `enemyBoltCapForLevel(s.level)`; all three wave-init sites (`startGameAtLevel`, `loadNextWave`, `replayWave`) seed `s.spikes` with `initialSpikeHeightForLevel`.
- `docs/audit/findings/*.json` — 9 subsumed + FR-010/FR-013 marked `remediated_by: tp1-7`; W-036 re-anchored; 45 shifted citations re-anchored (`0 lost`).
- Tests: 5 new tp1-7 suites + sibling re-seats (sim.difficulty, sim.spawn, sim.enemy-fire, sim.framing, sim.advance-level, tp1-6.nymph-queue, tp1-6.fuseball-turnback, tp1-3.cheap-wins) — all per the RED design + the two GREEN-discovered fuseball RNG-fragility repairs.

**Deviations:** 3 logged (fold-to-99 strategy; FR-010/FR-013/W-036 citation handling; fuseball fixture hardening) — see Design Deviations › Dev.

**No upstream findings during implementation** beyond those TEA already filed; the RNG-shift on seeded fixtures is captured as a Delivery Finding class and in the Dev sidecar.

**Handoff:** To Reviewer (The Thought Police) for code review.

## Subagent Results

Only `preflight` is enabled (`workflow.reviewer_subagents`); every adversarial subagent is toggled off. Per the self-authored/ROM-story protocol I spawned an INDEPENDENT general-purpose ROM auditor (opus) to re-decode all eight tables coordinate-by-coordinate, and I personally covered each disabled specialist's domain (mutation tests, findings-diff laundering audit, AC-2 deletion greps, radix verification).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 — 1368/1368 green, `tsc` clean, 22/22 citations, no smells (the 3 `as any` hits are the guard TEST asserting absence) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer: contourValue record coverage contiguous 1-99, TZ index in-bounds, deep-wave fold + falsy-0 mutation-proven |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled — covered by Reviewer: contourValue returns an EXPLICIT `TE`-0 (a real "none"), no swallowed errors, fold prevents silent 0 at deep waves |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled — covered by Reviewer: 4 load-bearing guards MUTATION-PROVEN to bind; no tautologies; source-rules `skipIf` portability noted |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled — covered by Reviewer: comment accuracy checked; W-036 `verbatim` re-anchor semantics-preserving; WSPIMX record 6 flagged UNDOCUMENTED |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled — covered by Reviewer: `ContourRecord` discriminated union + `default: assertNever` exhaustiveness; no `as any` (guard-tested) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled — N/A: pure deterministic sim core, no auth/injection/tenant/network/IO; RNG seeded |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled — covered by Reviewer: single shared `contourWave`/`contourValue` fold (tp1-26 mandate met, not inlined 8×); TCHARIN-as-constant justified |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled — covered by Reviewer: AC-1 verbatim (found WSPIMX defect), AC-2 deletion grep, radix rule, citation completeness |
| + | INDEPENDENT ROM auditor (general-purpose, opus) | Yes | findings | 1 — WSPIMX record 6 radix divergence (ROM `0x35=53` vs port `35`) | CONFIRMED by Reviewer via `od -c` + radix equates + WSPIMI :625 contrast; 7/8 tables + all load-bearing derivations independently byte-verified CLEAN |

**All received:** Yes (preflight returned clean; all adversarial subagents disabled via settings and their domains covered by Reviewer + the independent ROM auditor)
**Total findings:** 1 confirmed blocking (WSPIMX radix), 2 non-blocking (source-rules CI skip; tp1-8 source-pin gap), 0 dismissed

## Reviewer Assessment

**Verdict:** REJECTED

An exemplary story — seven of eight tables are independently byte-perfect, AC-2 deletions are real, every load-bearing guard is mutation-proven, and the findings diff is honest — with ONE decode-proven defect: a radix misread in the WSPIMX transcription that violates AC-1 (verbatim). It is latent for tp1-7 but becomes a live, self-contradictory divergence for tp1-8, and the fix is one line. On a ROM-fidelity epic whose #1 acceptance criterion is "transcribe verbatim," an independent decode finding a non-verbatim byte is not something I may rubber-stamp.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | `[RULE]`/`[EDGE]` AC-1 verbatim violation: WSPIMX record 6 transcribed decimal `{start:35,end:39}` where the ROM byte is HEX `0x35 = 53`. ROM `ALWELG.MAC:633` `.BYTE T1,35,39.,1` — `35` has no trailing dot (confirmed `od -c`), so the assembled record is the dead range `[53,39]` → the arcade gives spiker-max **0** on waves 35-39; the port returns **1**. A genuine ROM typo (WSPIMI `:625` dots it, `35.`, and its min=1 makes the assembled max=0 self-contradictory). Undocumented. | `src/core/rules.ts:688` (ROM `ALWELG.MAC:633`) | EITHER match the assembled ROM — `start:53` / drop record 6 → waves 35-39 = 0, as every other gap in this same table is handled — OR keep `start:35` as an EXPLICITLY DOCUMENTED deliberate deviation citing the `:633` missing-dot typo and the WSPIMI `:625` min=1 contradiction. Add a source-rules pin for `:633` (decode the radix) so it can't regress. This is a deliberate fidelity decision (match-bytes vs. honor-intent) affecting tp1-8's solver. |

**Observations (12; ≥5 required):**
- `[RULE]` **[HIGH]** WSPIMX record 6 radix divergence at `rules.ts:688` — the blocking finding above.
- `[RULE]` **[VERIFIED]** AC-2 deletion is real — evidence: `grep` of `src/` shows `6+(level-1)*2`, `0.22*ramp`, `FLIPPER_ALONG_PER_FRAME_L33`, `MAX_ENEMY_BULLETS`, literal `=0.72`, and the `level>=5/11/17` cargo/roster gates survive ONLY in explanatory comments, never as live code; `const ramp` is gone from `levelParams`.
- `[TEST]` **[VERIFIED]** All 4 load-bearing guards mutation-proven to bind — evidence: reverting `contourWave`'s fold → deep-wave walk-off tests RED (`enemyBoltCapForLevel(100)` returns 1); TNYMMX[1] 10→6 → count test RED; TCHAMX[1] 1→3 → fire-gate saturate RED (4≠2); TELIHI[3] 0xe0→0 → wave-4 pre-spike RED. No tautological guards (contrast tp1-10).
- `[TEST]` **[LOW]** `tp1-7.source-rules.test.ts` gates every `describe` on a hardcoded absolute path (`/Users/slabgorb/Projects/tempest-source-text`), so the "18/18 transcription backbone" silently `skipIf`s in CI and any other checkout — evidence: `tests/core/tp1-7.source-rules.test.ts:37-38`. Acceptable (ROM is copyrighted; behavioral suites re-pin the values in CI) but fragile.
- `[EDGE]` **[VERIFIED]** `contourValue` record coverage is contiguous across waves 1-99 for every value table (TNYMMX/TINVIN/TSPIIN/TCHAMX/WWTAC2/3) — no gap that yields a TE-0 walk-off in the playable range; TZ index `vs[wave-start]` never exceeds its array; the intro-MAX tables' intentional gaps are consumed only by `firstNonZeroWave`.
- `[SILENT]` **[VERIFIED]** No swallowed errors — `contourValue` returns an explicit `0` for `TE` (a real "none"/"clean"), and the `contourWave` fold keeps deep waves on the last record, so 0 is never a silent walk-off. The falsy-`0` trap is guarded (`initialSpikeHeightForLevel` never `||`-defaults; new-lookups pins `typeof === 'number'` and `=== 0`).
- `[DOC]` **[VERIFIED]** Findings diff is honest — evidence: every changed line in `docs/audit/findings/` is a `"line":N` re-anchor or a `+"remediated_by":"tp1-7"` (11 findings); the single `verbatim` edit (W-036, `level>=17`→`level>=PULSAR_INTRO_WAVE`) is semantics-preserving (PULSAR_INTRO_WAVE === 17 via `firstNonZeroWave(WPULMX)`) and correctly NOT remediated. No `claim`/`reasoning`/`source`/`title`/`verdict` narrative altered. Citation completeness clean — no finding is left citing a deleted symbol as a live (non-remediated) quote.
- `[TYPE]` **[VERIFIED]** `ContourRecord` is a discriminated union (`t: 'T1'|'TZ'|'TA'|'TR'`) with `default: assertNever` in `contourValue` — a lost arm breaks the BUILD; no `as any`/non-null smuggled (guard-tested, `tsc` clean).
- `[SEC]` **[VERIFIED]** No security surface — `rules.ts`/`sim.ts` are the pure deterministic core (no auth, injection, tenant data, network, filesystem, DOM); randomness is the seeded `Rng`. Not applicable, confirmed by scope.
- `[SIMPLE]` **[VERIFIED]** The tp1-26 "extract the fold ONCE" mandate is met — `contourWave`/`contourValue` are shared by all eight tables and `wfuschForLevel`, not inlined 8×; TCHARIN correctly modeled as ONE constant (the +2.0 offset is wave-independent) rather than a needless table. Good pattern, no over-engineering.
- **[VERIFIED]** 7 of 8 tables byte-perfect — independent ROM re-decode confirmed TNYMMX, TINVIN, TSPIIN (TB byte 0 for w1-20), TCHAMX (`;ADD 1` → +1 cap), TCHARIN (single TB −64 → +2.0/frame), WWTAC2/3, WTANMX/WFUSMX/WPULMX, TELIHI (16 live + 4 dead) all match, and every intro-wave constant (3/4/11/17) is correct.
- **[VERIFIED]** Race check — not superseded; no tp1-7 on `origin/develop` (tempest) or `origin/main` (orchestrator) ahead of HEAD.

**Data flow traced:** `s.level` → `enemyBoltCapForLevel(s.level)` (rules.ts:633) → `contourValue(TCHAMX,level)+1` → fire gate `s.enemyBullets.length >= boltCap` (sim.ts:363) — safe, per-wave, mutation-proven consumed. `initialSpikeHeightForLevel(level)` → all three wave-init sites (`startGameAtLevel`, `loadNextWave`, `replayWave`) fill `s.spikes` — safe, consumed through the real warp path.

### Devil's Advocate

Argue this code is broken. The sharpest edge is the one the pipeline nearly shipped green: WSPIMX record 6. tp1-7 gets away with the radix misread only because it consumes `firstNonZeroWave(WSPIMX)` and nothing else — but tp1-8's population solver (NYMCHA) reads the FULL min/max pair per wave. On waves 35-39 the assembled ROM presents min=1 (WSPIMI, dotted) and max=0 (WSPIMX, the dead range). A solver that clamps `count` into `[min,max]` with `min>max` will either loop forever, produce `NaN`, spawn a negative budget, or silently pick one bound — a real degenerate state a confused player never sees but a stressed solver will hit exactly on those five waves. The port's `start:35` accidentally papers over the contradiction (min=1,max=1) — which might be the RIGHT answer, but it was reached by an unnoticed radix slip, not a decision, so nobody will know to revisit it. That is how a latent data typo becomes a permanent, un-audited gameplay divergence.

Second: the deep-wave fold-to-99 OVERSHOOTS by design — TNYMMX(99)=61 exceeds the ROM's random-band max of ~58 (TEA's own Question). It is confined to waves ≥99 which normal play never reaches, and the guards only require sanity, so it is documented-and-harmless — but a future "faithful deep-wave difficulty" story will inherit a knowingly-too-hard count. Third: the `enemyBoltCapForLevel` AC-2 guard only asserts the function EXISTS — a Dev could delete the fire-gate wiring and that specific test stays green; only the sim-integration saturate test catches it (it does, mutation-proven, so non-blocking, but the guard is weaker than it reads). Fourth: the whole seeded-RNG-fragility class — Dev hardened two fixtures, but the Delivery Finding is explicit that ANY future count change consumed in `initialState` re-breaks seeded siblings; this is a standing landmine, not a fixed bug. Fifth: the source-rules CI skip means the NEXT radix typo in another table passes CI in total silence — the very safety net that should have caught this WSPIMX byte is off in CI. None of these except the WSPIMX finding is blocking, but together they say: the fidelity guarantee rests on the behavioral suites and on independent re-decode, not on the ROM-reading tests, and a wrong "verbatim" byte can and did slip through.

**Handoff:** Back to TEA (O'Brien) for the red rework — pin `ALWELG.MAC:633`'s raw byte (radix-decoded) as a failing source-rules test, resolve the match-bytes-vs-honor-intent decision, then Dev implements the one-line fix.

## TEA Assessment — Red Rework (WSPIMX record 6)

**Phase:** finish (rework, round-trip 1) · **Tests Required:** Yes · **Status:** RED (2 failing, ready for Dev)

**The Reviewer's one blocking finding, resolved.** I independently re-verified the decode against the CITABLE quarry (`tempest-source-text/ALWELG.MAC`, 3569 lines) with `od -c`:
- `:633` `.BYTE T1,35,39.,1` — the start `35` has **no** trailing dot (a comma follows), so under ALWELG's inherited **HEX** radix (bare `0FF`/`1F` immediates prove radix 16) it is `0x35 = 53`. Assembled record `[53,39]` is a **dead descending range** → waves 35-39 fall to the gap value spiker-max **0**, like every other WSPIMX gap (17-19, 33-34, 40-42).
- `:625` WSPIMI `.BYTE T1,35.,39.,1` — the SAME band is **dotted** (`35.` = decimal 35, min **1**). The typo is literally one dropped dot.
- The assembled ROM is therefore **self-contradictory** on 35-39 (min 1 > max 0). The port's decimal misread (`{start:35}` → max 1) accidentally papered over it.

**RULING: match the assembled bytes** (0x35=53 → waves 35-39 max 0), NOT honor-intent. AC-1 + epic authority ("transcribe verbatim / follow the ROM") resolve it; the emergent "1 spiker" answer, if authentic, must come from tp1-8's NYMCHA decode of the min>max clamp, never from silently editing the transcription. Logged as a 6-field deviation; the min>max contradiction is routed to tp1-8 as a **blocking Delivery Finding**.

**Test Files (2 edited, additive — no production or existing-test edits):**

| File | New tests | Runs in CI? | State |
|------|-----------|-------------|-------|
| `tests/core/tp1-7.contour-tables.test.ts` | WSPIMX record 6 block: parse `rules.ts`, rebuild `spikerMax(wave)`, assert waves 35-39 = 0 and the `{start:35,end:39}` record is gone; keep-behavior guards; radix-decode refutation | **Yes** (reads `rules.ts`, not the ROM) | **2 RED** + 4 green |
| `tests/core/tp1-7.source-rules.test.ts` | WSPIMX-record-6 radix block: pin `:633`/`:625` verbatim, decode via a dot-honoring one-token assembler, prove the min>max contradiction at the source | skipIf(!ROM) — runs locally | 4 green (ROM is correct — the durable anchor) |

**Verified RED:** `npx vitest run tp1-7.contour-tables tp1-7.source-rules` → **2 failed | 51 passed**. Both failures are the port-vs-decoded-ROM divergence (`expected 1 to be 0`; `expected true to be false`), each RED for the right reason (value mismatch against unfixed code, not import/typo), each flips GREEN on the one-line fix. `tsc --noEmit` clean.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| AC-1 verbatim transcription (radix decode) | source-rules `:633`/`:625` pins + assembler | green (ROM anchor) |
| Latent-record enforcement bites in CI | contour-tables `spikerMax(35-39) === 0` | **RED** |
| No regression to decimal (write the refutation in) | contour-tables + source-rules `not.toBe(35)` / `0x35 !== 35` | green |
| Keep-behavior (fix is surgical) | contour-tables intro-wave 4 + early maxes | green |

**Self-check (Phase C):** 0 vacuous assertions. The 2 RED are behavioral value pins; the greens are ROM-truth anchors, keep-behavior guards, and an arithmetic refutation — each asserts a real invariant.

**Handoff:** To Dev (Julia) for the GREEN one-line fix. Transcribe WSPIMX record 6 verbatim as `{ t: 'T1', start: 53, end: 39, v: 1 }` (the literal assembled `0x35`) — the tests also accept dropping the record; both yield max 0. Do NOT re-introduce `start: 35`. It's a data-only change to `rules.ts:688`; a single-value edit shifts no cited lines, but run `npm test -- citations` to confirm AC-5 stays green before handoff.

## Dev Assessment — Green Rework (WSPIMX record 6)

**Implementation Complete:** Yes — implemented O'Brien's match-bytes ruling verbatim.

**Files Changed:**
- `src/core/rules.ts:688` — WSPIMX record 6 `start: 35` → `start: 53` (the assembled `0x35`), with an inline comment citing ALWELG.MAC:633 (un-dotted, hex), WSPIMI:625 (dotted, decimal), the resulting dead `[53,39]` range → waves 35-39 spiker-max 0, and the min>max typo. The comment warns off a future "helpful" fix back to 35 (the record's `start > end` reads as a bug but is the faithful transcription of a ROM typo). Inline (no new lines) to keep cited line numbers stable.

**Tests:** **1377/1377 passing (GREEN)** · targeted files 53/53 · `tsc --noEmit` clean · `npm test -- citations` **22/22** (AC-5).

**Why the full suite is unmoved:** the fix is data-only and the record is LATENT — WSPIMX record 6 is read solely by `firstNonZeroWave(WSPIMX)` = 4 (the spiker intro wave), which record 1 already fixes at wave 4. No per-wave WSPIMX consumer, no RNG draw depends on it. So unlike the count-change class in the Dev sidecar (`enemyCount(1)` 6→10 shifting seeded fixtures), this touches nothing downstream — zero ripple, confirmed by the green full run.

**Deviations:** None. Implemented TEA's ruling exactly (start 53); the tests also accepted dropping the record, but the literal assembled byte is the more faithful transcription per AC-1.

**Branch:** feat/tp1-7-skill-contour-difficulty-tables (committed `38ace34`, pushed to origin).

**Handoff:** To The Thought Police (Reviewer) — the single blocking finding is resolved; the min>max ROM contradiction is now surfaced in the data + comment and routed to tp1-8 as a blocking Delivery Finding, not papered over.

## Subagent Results

Re-review of the rework (round-trip 1). The prior REJECT had exactly one blocking finding (WSPIMX record 6 radix); the rework diff is a single-line data fix (`38ace34`) plus two test files (`f3424a7`). Adversarial subagents remain toggled OFF (`workflow.reviewer_subagents`); per the self-authored/ROM-story protocol I spawned an INDEPENDENT ROM auditor (opus) to re-decode `:633`/`:625` from raw bytes and personally mutation-tested the new guard.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 — 1377/1377 green, `tsc` exit 0, citations 22/22, tree clean, no smells; confirmed `start:53>end:39` is the intentional dead-range transcription | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled — covered by Reviewer: waves 35-42 fall through `contourValue` to `return 0` (TE); the dead `[53,39]` record covers no wave; `firstNonZeroWave(WSPIMX)`=4 unaffected; ≤42 needs no fold |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled — covered by Reviewer: `contourValue` returns an EXPLICIT 0 (TE), no swallowed error; the port test's `sanity` guard blocks a silent empty-parse |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled — covered by Reviewer: the new port test is MUTATION-PROVEN to bite (revert `53`→`35` → 2 RED); GUARD pins all 7 records' values; no vacuous assertions |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled — covered by Reviewer: the inline comment at `rules.ts:688` is `od -c`-accurate on every claim (0x35=53, dead range, WSPIMI:625 min 1, min>max typo) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled — covered by Reviewer: record stays a valid `ContourRecord` `T1` arm; no `as any`; `start`/`end` are numbers; the `assertNever` discriminated union is intact |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled — N/A: pure deterministic sim core, no auth/injection/tenant/network/IO; the change is one integer literal |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled — covered by Reviewer: a one-line data fix, no new abstraction/export, minimal; the tests reuse the file's existing `rules`/`stripComments` harness |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled — covered by Reviewer: AC-1 verbatim satisfied (independently re-decoded); AC-2 deletions and the other 7 tables untouched by the diff |
| + | INDEPENDENT ROM auditor (general-purpose, opus) | Yes | clean | 0 — verdict CORRECT: `start:53` is the verbatim transcription of the un-dotted hex byte; `start:35` would be wrong; spiker-max 0 on 35-39; min 1 > max 0 is a 1981 ROM typo | Confirmed |

**All received:** Yes (preflight + independent auditor returned; the 8 adversarial specialists are disabled via settings and their domains covered by Reviewer + the independent decode + my own mutation test)
**Total findings:** 0 new (the one prior blocking finding is resolved), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The prior REJECT's single blocking finding — WSPIMX record 6's radix misread (AC-1 verbatim violation) — is resolved correctly, minimally, and provably. `rules.ts:688` now transcribes the un-dotted ROM byte as its assembled hex value (`0x35 = 53`), producing the ROM-faithful dead `[53,39]` range → spiker-max 0 on waves 35-39, and the genuine min>max ROM typo is documented in code and routed to tp1-8. An independent opus re-decode of the raw bytes returned CORRECT; my own `od -c` and a mutation test agree. Nothing else in the story changed (the other 7 tables remain byte-perfect from the prior review).

**Observations (8; ≥5 required):**
- `[RULE]` **[VERIFIED]** AC-1 verbatim satisfied — evidence: independent opus auditor + my `od -c` of `ALWELG.MAC:633` confirm `35` is un-dotted (comma follows) → hex `0x35 = 53` under the proven hex ambient radix (bare `0FA`/`0FC`/`0FF`/`1F` immediates); `rules.ts:688` = `{ start: 53, end: 39, v: 1 }` matches the assembled byte. `start:35` would silently "fix" the typo — refuted.
- `[TEST]` **[VERIFIED]** the new guard BITES — evidence: I reverted `rules.ts:688` `53`→`35` and ran the two files → `tp1-7.contour-tables` 2 tests RED (`spikerMax(35-39)` returns 1; the `{35,39}` record present); restored → 53 passed, tree clean. The ROM-side `source-rules` pins correctly stay green (they anchor ROM truth, not the port) — the CI-safe port test is the biting guard.
- `[EDGE]` **[VERIFIED]** the dead range is handled — evidence: `contourValue` (rules.ts:556-568) `if (wave < r.start || wave > r.end) continue`; `[53,39]` matches no wave, waves 35-42 reach `return 0 // TE`. The auditor traced the same fall-through in the ROM's CONTOUR (`BEQ TEXIT`, TE=0). `≤42` needs no `contourWave` fold.
- `[DOC]` **[VERIFIED]** the inline comment is accurate — evidence: every claim at `rules.ts:688` (`0x35=53`, dead `[53,39]`, `WSPIMI:625` dotted `35.`=dec 35/min 1, min>max typo, "NOT decimal 35") checks against the `od -c` bytes. It also earns its place: it warns the next dev off "fixing" the `start>end` back to 35.
- `[TYPE]` **[VERIFIED]** type integrity intact — evidence: the record is still a valid `ContourRecord` `{t:'T1', start, end, v}` arm; no `as any`/non-null smuggled into source; `contourValue`'s `default: assertNever` discriminated-union exhaustiveness is untouched; `tsc --noEmit` exit 0.
- `[SIMPLE]` **[VERIFIED]** minimal — evidence: a single integer-literal change plus one inline comment; no new export/abstraction (the record stays latent, consumed only by `firstNonZeroWave`); the tests reuse the file's existing `rules`/`stripComments` harness rather than adding new infrastructure.
- `[SILENT]` **[VERIFIED]** no silent failure — evidence: `contourValue` returns an EXPLICIT `0` (a real "none"), not a swallowed error; the port test's `sanity` case (`expect(block).not.toBeNull()`, `records.length > 5`) blocks a parser that silently matches nothing.
- `[SEC]` **[VERIFIED]** no security surface — `rules.ts` is the pure deterministic core (no auth/injection/tenant/network/DOM/filesystem); the change is one integer. Not applicable, confirmed by scope.

**Rule Compliance (lang-review/typescript + AC):**
- **AC-1 (transcribe verbatim):** ✓ `start:53` = the assembled `0x35`, independently re-decoded.
- **AC-2 (delete hand-tuned curves):** ✓ unchanged by this diff; verified real in the prior review.
- **AC-3 (read through tables at the wave index):** ✓ record read via `contourValue`, no formula.
- **AC-5 (citations green):** ✓ 22/22; the inline comment shifted no cited line (single-line edit).
- **`as any`/non-null (lang #1):** ✓ none in source; the test parser's `!` is idiomatic test code, not the audited lookups.
- **falsy-`0` trap (`x || default`):** ✓ `contourValue` never `||`-defaults; the TE-0 is an explicit, intended value.

**Data flow traced:** `s.level` → `firstNonZeroWave(WSPIMX)` = `SPIKER_INTRO_WAVE` = 4 (rules.ts:709) → the spiker introduction gate `['spiker', level >= SPIKER_INTRO_WAVE ? 3*hard : 0]` (rules.ts:837). WSPIMX record 6 (waves 35-39) does NOT participate — `firstNonZeroWave` is fixed at 4 by record 1's wave-4 value 2. Hence the fix is behaviourally inert for tp1-7 (confirmed: full suite 1377/1377 byte-identical, zero RNG ripple) and the value matters only to tp1-8's per-wave WSPIMX consumer.

### Devil's Advocate

Argue this is broken. The most suspicious thing is that the "fix" makes the code look *more* wrong: a record whose `start` (53) exceeds its `end` (39) is exactly the shape a linter or a future maintainer flags as a bug, and a reflexive "cleanup" to `start:35` silently reintroduces the exact divergence we just closed — with a green suite locally, because the biting test only runs where it reads `rules.ts` and the ROM-side pins skip in CI. But that is precisely why the inline comment and the CI-safe port test exist: the comment names the ROM line and the typo, and `tp1-7.contour-tables` (which reads `rules.ts`, not the copyrighted ROM) goes RED in CI on any regression to 35 — mutation-proven. Second: is `start:53` truly "verbatim," or did we substitute our own judgment? No — the independent auditor re-derived the hex radix and the un-dotted byte from raw bytes without our conclusion and returned CORRECT; the byte the cabinet assembled is 0x35=53, and that is what the port now carries. The programmer's *intended* 35 lives only in the missing dot, and honoring intent over the assembled byte is the hand-tuning this epic deletes. Third: does this break tp1-8? It cannot silently — the min>max contradiction (WSPIMI min 1 vs WSPIMX max 0 on 35-39) is now a BLOCKING Delivery Finding, so tp1-8 must decode NYMCHA's clamp rather than inherit an accidental max=1. Fourth: could the fix have shifted seeded RNG like the count-change class? No — the record is latent (only `firstNonZeroWave`, unchanged at 4, reads WSPIMX), and the full 1377-test suite is byte-identical. Fifth: is the new test vacuous or tautological? No — reverting the one line turns it RED, and the GUARD pins all seven records' values so a mis-parse would fail. Every attack lands on a guard that holds. The one residual is the standing CI-skip of the ROM-side pins (already a non-blocking finding routed forward) — the port comparison, which is the biting half, runs everywhere.

**Handoff:** To Winston Smith (SM) for finish-story. Do NOT merge here. Note for finish: this is an AI-authored + AI-reviewed PR — the self-approval guardrail applies, so the human must authorise the merge before `pf sprint story finish`.