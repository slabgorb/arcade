---
story_id: "ml3-1"
jira_key: "ml3-1"
epic: "ml3"
workflow: "tdd"
---
# Story ml3-1: Millipede head/body init + motion + turn as a pure reducer

## Story Details
- **ID:** ml3-1
- **Jira Key:** ml3-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 5
- **Branch:** feat/ml3-1-millipede-head-body-motion
- **PR:** https://github.com/slabgorb/arcade/pull/309

## Story Description

Millipede head/body init + motion + turn as a pure reducer: CENTPC initialize picture/hpos/vpos/direction (MILLI.MAC:498), NEWHD new head (MLSUB.MAC:775), MOTION update (MILLI.MAC:1444). Cited against ROM values.

**Design Reference:** docs/superpowers/specs/2026-08-11-millipede-cabinet-roadmap-and-ml1-design.md (section 4, ml3)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-13T10:49:48Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-12T19:56:25Z | 2026-08-12T19:57:53Z | 1m 28s |
| red | 2026-08-12T19:57:53Z | 2026-08-13T07:24:40Z | 11h 26m |
| green | 2026-08-13T07:24:40Z | 2026-08-13T10:14:38Z | 2h 49m |
| review | 2026-08-13T10:14:38Z | 2026-08-13T10:31:15Z | 16m 37s |
| green | 2026-08-13T10:31:15Z | 2026-08-13T10:39:38Z | 8m 23s |
| review | 2026-08-13T10:39:38Z | 2026-08-13T10:49:48Z | 10m 10s |
| finish | 2026-08-13T10:49:48Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA][Improvement][non-blocking] The millipede model differs from centipede: MOBJC (colour) is the discriminator, not a MOBJP bit.** In centipede, head/body/poison/vacant are BITS of the picture byte. In millipede, `MOBJP` is purely the leg-animation frame (0-7; `MOBJP<8` marks a segment, MT-3) and the head/body/vacant/poison identity is the COLOUR byte `MOBJC`: 0=vacant (MT-2), 0x39=head (MT-5), 0x3D=body (MT-6), 0x1B=poisoned (MT-7). The `Segment` interface therefore carries BOTH `pic` and `color`. Dev must not port centipede's bit model. (The renderer-migration trap: pin observable output, not routing.)
- **[TEA][Gap][non-blocking] ml3-1 is scoped to FREE-SPACE motion only** because MOTION's `OBSTA0/OBSTAC` (mushroom field → ml3-3), `PLAY` (player collision → ml3-2), `OVRLAP` (the split → ml3-2) and `DDTEXP` (DDT clouds → ml4) all reference subsystems that do not exist yet. `stepMillipede(segs, frame)` pins: leg animation, last-head speed-up, coast-march, descent+reversal at cell-phase 4, screen-edge turn (0xF0/0x10), body-follow. It reads NO field. ml3-3 EXTENDS the step to consult the mushroom field (add the OBSTAC probe there), which is a clean extension, not a fail-open seam. Poison-head dive is deferred with the mushroom field (poison only arrives from a mushroom).
- **[TEA][Gap][non-blocking] createMillipede takes an explicit `headingSign`, not `frame`, for the initial heading.** Centipede's CENTPC reads FRAME&2 (deterministic); millipede's reads `RND0&2` (entropy, MT-13). To keep the wave-1 boot train pure/seed-free, the contract passes `headingSign` explicitly; the loose-head fill (centin<NCENT) still needs a seeded `rng` (two RND0 draws per loose head). Runtime wiring (RND0 → headingSign) is a later sim concern.
- **[TEA][Improvement][non-blocking] Millipede-specific delta from centipede worth guarding:** the "fast CENTIS" score threshold is SCORE2>=2 (after 20000, MT-16) vs centipede's SCORE2>=4 (after 40000). Also CENTPC decrements `SCROLC` (scroll playfield down one row, MILLI.MAC:503) — the scroll seam owned by ml3-5; out of scope here but noted so ml3-5 wires it to createMillipede's cadence, not a retrofit.
- **[TEA][Question][non-blocking] NEWHD's COUNT3 floor undershoots by design.** `CMP I,60 / BCC skip / SBC I,8` decrements while `count3 >= 0x60`, so a count3 of exactly 0x60 drops to 0x58 (one step below the named floor) and then holds. The RED tests use 0xC0→0xB8 and 0x5C→0x5C to pin the step and the gate without asserting the quirky exact-0x60 case; Dev should reproduce the ROM's actual `>= floor ⇒ subtract` logic, not clamp to 0x60.

### Dev (implementation)
- **[Dev][Gap][non-blocking] RED over-asserted the body-picture range (2..7) vs the cited ROM claim (MT-11/12).** CENTPC's leg-anim seed cycles `2,1,0,7,6,5,4,3,2,1,0` (MILLI.MAC:580/602-604), so a faithful port emits `0` and `1` and the `pic >= 2` floor was unsatisfiable. Corrected in GREEN by implementing the faithful cycle and re-pinning the test to the exact sequence + the real `0 <= pic < 8` invariant (MT-3). Affects `plugins/millipede/tests/millipede.test.ts` (the "11 bodies" test — already fixed). *Found by Dev during implementation.*
- **[Dev][Improvement][non-blocking] MOTION's NEWD arming (MT-26, `STY NEWD` at bottom row) and the poison-head dive (MT-7) are present as structure but unexercised in free space.** The step handles a poisoned head (colour 0x1B ⇒ dive) defensively, but poison only arrives from the mushroom field (ml3-3) and NEWD/bottom-row behaviour needs the player zone; neither is pinned by an ml3-1 test. ml3-2/ml3-3 should add coverage when those subsystems land. Affects `plugins/millipede/src/core/millipede.ts` (`stepSegment`). *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap (blocking): the last-head speed-up transcribes ROM constants with NO cited claim.** The magnitude `2`/`-2` and the `liveCount===1` trigger (MILLI.MAC:1485-1496) are the only transcribed ROM logic in the module not covered by an MT-* claim; the comment's bare `:1483-1495` has no filename. Violates the epic rule "every ROM constant carries a citations.test.ts-gated claim." Affects `plugins/millipede/src/core/millipede.ts:219-224` and `docs/rom-study/claims/09-millipede-train.json` (add a claim + proper citation; optionally name a `LAST_HEAD_SPEED` const). *Found by Reviewer during code review.*
- **Gap (blocking): `createMillipede` does not guard `centin <= 0`.** MEASURED: `centin:0` returns 13 segments, `centin:-1` returns 14 — breaking the `NCENT` invariant every consumer assumes. Unreachable via the ROM cadence (centin ∈ 1..12) but an unguarded public boundary. Affects `plugins/millipede/src/core/millipede.ts:113` (clamp/guard `centin` to ≥1, mirroring the rng-missing guard). *Found by Reviewer during code review.*
- **Conflict (non-blocking): test JSDoc "draws two RND0 bytes each" is false.** The loose-head fill is a rejection loop that can draw more than two bytes. Affects `plugins/millipede/tests/millipede.test.ts:103` (soften to "seeded RND0 bytes", matching the module's own correct JSDoc). *Found by Reviewer during code review.*
- **Conflict (non-blocking): stale loose-head citation + direction-bit divergence.** The comment cites `:527-548` (centipede's range; millipede's loose fill is MILLI.MAC:609-635), and the direction uses `RND0 bit 1` where the ROM uses `BIT RND0` = bit 7 (:626). Affects `plugins/millipede/src/core/millipede.ts:141-146`. *Found by Reviewer during code review.*
- **Improvement (non-blocking): add `readonly` to the purity boundary + narrow the test catch.** `stepMillipede(segs: Segment[])`/`Segment` fields could be `readonly` to statically enforce the no-mutation contract; `catch (e)` at test.ts:185 should be `catch (e: unknown)` narrowed with `instanceof`. Affects `plugins/millipede/src/core/millipede.ts:77,252` and `tests/millipede.test.ts:185`. *Found by Reviewer during code review.*

### Reviewer (code review — Round 2, after rework; all NON-BLOCKING)
- **[Reviewer][Improvement][non-blocking] The `centin` clamp does not cover non-integer/NaN, contradicting its own "always exactly NCENT / any caller" wording.** MEASURED post-rework: `centin:3.7` → 13 segments, `centin:NaN` → 1. Unreachable via the ROM's integer cadence (centin ∈ 1..12), so non-blocking — but either make the clamp total (`Number.isFinite(raw) ? clamp(Math.trunc(raw)) : NCENT`) or narrow the comment/test name to "integer centin". Affects `plugins/millipede/src/core/millipede.ts:127` + `tests/millipede.test.ts` (the clamp test name). *Found by Reviewer during Round-2 review.*
- **[Reviewer][Gap][non-blocking] No test pins the loose-head `dh` sign/magnitude.** A `2→3` magnitude mutant on the (now ROM-correct) bit-7 direction survives all tests green. Add an assertion that `Math.abs(looseHead.dh) === 2` and the sign tracks RND0 bit 7. Affects `plugins/millipede/tests/millipede.test.ts:333-343`. *Found by Reviewer during Round-2 review.*
- **[Reviewer][Conflict][non-blocking] Comment citation range `:621-624` quotes only 3 instructions (`:621-623`).** Line :624 (`82$: STA MOBJDH`) is the branch target, not part of the quote. Narrow to `:621-623` or quote the 4th line. Not a claims-JSON entry, so `check-citations.mjs` does not catch it. Affects `plugins/millipede/src/core/millipede.ts:154`. *Found by Reviewer during Round-2 review.*
- **[Reviewer][Improvement][non-blocking] The loose-head `dh` magnitude `2` (MILLI.MAC:617-618 `LDA I,2 / ORA CKFE`) has no dedicated MT-* claim.** Unlike every other transcribed ROM constant here it is defended only by a prose comment. Consider an MT claim when the loose-head fill gets sim-wired (ml3-x). Affects `plugins/millipede/src/core/millipede.ts:157` + claims JSON. *Found by Reviewer during Round-2 review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Corrected the body-picture range assertion to the ROM's actual leg-anim cycle**
  - Spec source: `plugins/millipede/tests/millipede.test.ts` (RED), the body test "pictures in 2..7 (MT-6/10/11/12)"
  - Spec text: `expect(b.pic, '...in 2..7...').toBeGreaterThanOrEqual(2)`
  - Implementation: CENTPC's ROM cycle (MILLI.MAC:580 `LDY I,2`, :602-604 `DEY / BPL 50$ / LDY I,7`) seeds the first body at 2 then DECREMENTS per body, reloading to 7 on underflow — for 11 bodies the exact sequence is `2,1,0,7,6,5,4,3,2,1,0`. It genuinely emits `0` and `1`, so the `>= 2` floor is unsatisfiable by a faithful port. Implemented the faithful cycle and re-pinned the test to the exact ROM sequence (`toEqual([2,1,0,7,6,5,4,3,2,1,0])`) plus the real MT-3 invariant (`0 <= pic < 8`).
  - Rationale: ROM is canonical (fidelity rule). The "2..7" prose was a misread of the cited MT-11/12 claim; the corrected assertion is STRONGER (pins the whole sequence), not weaker.
  - Severity: minor
  - Forward impact: none — this is CENTPC's boot seed only; the leg-anim step (MT-17/18) already wraps mod 8, so 0/1 are valid frames downstream.
- **Loose-head fill (centin < NCENT) placement adapted from the centipede sibling**
  - Spec source: context — TEA Delivery Finding #3 ("two RND0 draws per loose head"); the RED test asserting each loose head enters within `[0x10, 0xF8)`
  - Spec text: loose head "entering within (0x10, 0xF8)", "SEEDED and replayable"
  - Implementation: one seeded byte picks the entry direction (RND0 bit 1 idiom, `NEWHD_SIDE_A/B_DH`), then column-aligned HPOS bytes are drawn in a rejection loop until the value clears both screen edges. Deterministic under a fixed seed; throws without an rng. Modelled on `centipede.ts`' loose-head fill, swapping the pic-bit for the colour model.
  - Rationale: millipede's loose-head placement carries no dedicated MT constant; the RED test pins the observable invariants (colour/pic/dv/HPOS-range/determinism), which this satisfies. A reject-loop (vs centipede's unbounded `& 0xF8`) is what enforces the `[0x10, 0xF8)` bound the test requires.
  - Severity: minor
  - Forward impact: minor — ml3-x sim wiring that feeds `RND0 → headingSign`/loose-head entropy should treat this fill as the placement contract.

### Dev (rework — addressing Reviewer REJECT)
- **Clamped `centin` to [1, NCENT] rather than throwing**
  - Spec source: Reviewer finding "createMillipede does not guard centin<=0" (MEASURED 13/14 segments)
  - Implementation: `centin = Math.min(NCENT, Math.max(1, opts.centin ?? NCENT))` — also guards `centin > NCENT` (which the reviewer didn't flag but MEASURED to break the invariant too).
  - Rationale: createMillipede's contract is "always exactly NCENT slots"; a total clamp keeps that invariant for any caller. Chose clamp over throw so the function stays total (the ROM domain is 1..NCENT, so out-of-range is a caller bug, but silently mis-counting is the worse failure). Pinned by a new regression test.
  - Severity: minor
  - Forward impact: none — the ROM cadence never passes an out-of-range centin.
- **Corrected the loose-head entry DIRECTION to RND0 bit 7 (was bit 1)**
  - Spec source: Reviewer undocumented-divergence finding + MILLI.MAC:621-624 `BIT RND0 / BPL 82$ / JSR COMP`
  - Implementation: `looseDh = (nextInt(rng,0x100) & 0x80) === 0 ? 2 : -2` — bit 7 CLEAR ⇒ +2, SET ⇒ -2, matching the ROM's `BIT RND0` (bit 7 test), replacing the earlier NEWHD bit-1 idiom. Also fixed the stale `:527-548` comment citation → the real loose-fill span MILLI.MAC:609-635.
  - Rationale: faithfulness. Direction is untested/unasserted, so no test changes; same-seed determinism holds (byte-draw structure unchanged).
  - Severity: minor
  - Forward impact: none.
- **Also (non-deviation cleanups):** named `LAST_HEAD_SPEED = 2` with claims MT-33 (one-live trigger) + MT-34 (magnitude) added to the claims JSON (closes the uncited-ROM-constant blocker); `Segment` fields + `stepMillipede` param made `readonly`; test JSDoc "two RND0 bytes" softened; test loader `catch (e: unknown)` narrowed.

### Reviewer (audit)
- **Dev deviation "body-picture range correction"** → ✓ ACCEPTED by Reviewer: independently traced the ROM loop (MILLI.MAC:580 `LDY I,2`, :602-604 `DEY / BPL 50$ / LDY I,7`) — it genuinely yields `2,1,0,7,6,5,4,3,2,1,0`, so the old `>= 2` floor was unsatisfiable. The re-pinned `toEqual([...])` is faithful AND stronger. Correcting a factually-wrong RED assertion to match the canonical ROM is the right call.
- **Dev deviation "loose-head fill placement"** → ✓ ACCEPTED (with two follow-up findings): the HPOS rejection loop is ROM-EXACT (MILLI.MAC:628-630 rejects `==0xF8` and `<0x10`; the code's `looseH >= ENTER_V || looseH < RIGHT_EDGE` matches byte-for-byte). The *approach* is accepted; two details are flagged as findings below — the comment's stale `:527-548` citation and the direction-bit divergence — neither invalidates the deviation.
- **UNDOCUMENTED divergence (Reviewer-found):** the loose-head DIRECTION is keyed on `RND0 bit 1` (`nextInt & 0x02`, the NEWHD idiom) but the ROM's loose fill uses `BIT RND0` = **bit 7** (MILLI.MAC:626 `BIT RND0 / BPL 82$`). Uncited, untested seam; Severity: L (random entry direction, no pinned behaviour). Logged as a Delivery Finding for alignment when the sim wires RND0.

### Reviewer (audit — Round 2, on the Dev rework deviations)
- **Dev rework deviation "clamped centin to [1, NCENT] rather than throwing"** → ✓ ACCEPTED by Reviewer: the clamp closes the reachable defect (integer out-of-range; mutation-tested — reverting the clamp reddens the new regression test). Clamp-over-throw is a sound choice for a total contract. Note: the clamp does NOT cover non-integer/NaN centin (MEASURED `3.7`→13, `NaN`→1) and the code comment/test name over-claim "always exactly NCENT for any caller" — logged as a non-blocking Round-2 Delivery Finding (unreachable via the ROM's integer cadence).
- **Dev rework deviation "corrected loose-head direction to RND0 bit 7"** → ✓ ACCEPTED by Reviewer: independently verified `(nextInt & 0x80) === 0 ? 2 : -2` against MILLI.MAC:621-623 (`BIT RND0 / BPL 82$ / JSR COMP`) — the bit and +2/-2 polarity are correct, and the `:609-635` span is accurate. Two follow-up nits (a `:621-624` comment range that quotes only 3 lines, and no test pinning the loose-head `dh`) logged as non-blocking below.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/millipede/src/core/millipede.ts` (new) — the pure `src/core` reducer: the 29 cited MT-* constants, the `Segment` shape (`{h,v,dh,dv,pic,color}` — colour is the discriminator), `createMillipede` (CENTPC boot train + seeded loose-head fill), `stepWaveCadence` (per-wave length/speed walk), `stepMillipede` (MOTION, FREE SPACE only), `newMillipedeHead` (NEWHD factory).
- `plugins/millipede/tests/millipede.test.ts` — corrected the "11 bodies" test's picture-range assertion from the unsatisfiable `2..7` floor to the ROM's actual leg-anim cycle `2,1,0,7,6,5,4,3,2,1,0` (MT-11/12) + the real `0 <= pic < 8` invariant (see Design Deviations / Delivery Findings).

**Tests:** 259/259 millipede project passing (GREEN); full cabinet suite 15047 passed / 1 todo / 0 failed (the auto-armed `src/core/` purity sweep + every sibling stayed green). `npm run lint` (tsc --noEmit) clean.

**Notes:**
- Model faithful to MILLI.MAC/MLSUB.MAC: colour discriminator (not centipede's pic-bit), unconditional coast-march (MT-24), descent + cell-phase-4 reversal (MT-23/25), body-follow at a full-cell gap (MT-20), last-head speed-up gated on `V&7==0` (MT-19), leg-anim on even frames mod 8 (MT-17/18), screen-edge turn direction-aware (MT-21/22). Cocktail flips dropped (upright); mushroom/DDT/player/split hooks deferred (ml3-2/3, ml4).
- Self-review: wired as a pure core module the sim will consume (ml3-x); follows the centipede sibling's patterns; all in-scope ACs (the 26 RED tests) met; no shell imports (purity green); no clock reads.

**Branch:** feat/ml3-1-millipede-head-body-motion (to be pushed)

**Handoff:** To Reviewer (REVIEW phase).

### Rework (round 2 — addressing Reviewer REJECT)

All 7 Reviewer findings addressed (2 blocking + 5 non-blocking):
- **[HIGH][RULE] uncited speed-up** → added claims **MT-33** (one-live trigger, MILLI.MAC:1486) + **MT-34** (magnitude, MILLI.MAC:1487) to `docs/rom-study/claims/09-millipede-train.json`, byte-verified by `citations.test.ts`; named `LAST_HEAD_SPEED = 2` in the module and replaced the bare `:1483-1495` citation.
- **[MED][RULE] centin guard** → clamp `centin` to `[1, NCENT]` (also guards `> NCENT`); pinned by a new regression test asserting NCENT-length for centin ∈ {-1,0,1,NCENT,NCENT+3}.
- **[DOC] false "two RND0 bytes"** → softened the test JSDoc.
- **[DOC] stale `:527-548`** → corrected to MILLI.MAC:609-635; **[FIDELITY] direction bit** → now RND0 bit 7 (`BIT RND0`), matching the ROM.
- **[TYPE] readonly** → `Segment` fields + `stepMillipede(segs: readonly Segment[])`.
- **[TEST]/[SILENT] catch** → `catch (e: unknown)` narrowed with `instanceof Error`.

**Tests (rework):** 260/260 millipede (was 259 + 1 new clamp test); full cabinet 15048 passed / 1 todo / 0 failed; citation gate green (MT-33/34 verify); tsc clean.

**Handoff:** Back to Reviewer (re-review).

## Tea Assessment

**RED delivered.** `plugins/millipede/tests/millipede.test.ts` — 26 failing tests, all failing with the self-describing "millipede train core not built yet" message (the feature is absent, not the test broken). tsc (`npm run lint`) is GREEN; the rest of the millipede project (232 tests, incl. the citation gate + the armed-dormant purity sweep) stays GREEN.

### What GREEN (Dev) must build
`plugins/millipede/src/core/millipede.ts` — a PURE module (the purity sweep auto-arms the moment it lands) exporting:
- The `Segment` shape `{ h, v, dh, dv, pic, color }` — **`color` (MOBJC) is the head/body/vacant discriminator**, `pic` (MOBJP) is the leg-anim frame 0-7. See Delivery Findings #1.
- The 29 cited constants (MT-1..MT-32) exactly as the test hand-mirrors them.
- `createMillipede(opts?)` — CENTPC boot train (1 head + 11 bodies) + loose-head fill for a short train.
- `stepWaveCadence(centin, centis, score2)` — the per-wave length/speed walk.
- `stepMillipede(segs, frame)` — MOTION, FREE SPACE only (see Delivery Findings #2).
- `newMillipedeHead(sideBitSet, count3)` — NEWHD factory.

Model the geometry on the sibling `plugins/centipede/src/core/centipede.ts` (createCentipede/stepCentipede/descend), swapping the pic-bit discriminator for the colour model and dropping the mushroom/collision hooks. Constants byte-verified this session against `reference/original-source/millipede/` in `docs/rom-study/claims/09-millipede-train.json`.

### Rule Coverage
- **`.pennyfarthing/gates/lang-review/typescript.md` #18 (untested helper / vacuity):** every one of the 26 tests carries a meaningful assertion (self-checked — no `assert(true)`, no `let _ =`, 96 `expect`s over 26 `it`s). Constants are hand-mirrored in the suite, NOT echoed from the module, so a wrong transcription in GREEN reddens.
- **Core/shell purity (project rule, `tests/purity.test.ts`):** the module is required to be pure; the dormant `src/core/` sweep auto-activates on landing. No extra purity test needed here — reusing the shared guard is the rule.
- **Citation gate (epic rule — "every constant carries a citations.test.ts-gated claim"):** all 32 MT-* claims byte-verify against the vendored 1982 source (`checkClaims` ran clean this session). `loadClaims()` reads the new file automatically, so `citations.test.ts`' byte gate covers them.
- **Determinism / seed discipline:** `createMillipede` boot train is asserted pure (two calls equal); the loose-head fill is asserted SEEDED (same seed → equal) and to THROW without an rng; `stepMillipede` is asserted deterministic. Guards the "feature must be observed / no ambient entropy in core" rule.
- **Model-fidelity (renderer-migration lesson):** the colour discriminator is pinned as observable OUTPUT (`seg.color`), and head/body/poison/vacant colours are asserted mutually distinct — a colour-blind or bit-model port cannot ship green.

### Handoff
Phase → **green**, owner **Dev (Julia)**. Run `/pf-dev`.

## Sm Assessment

Setup complete for ml3-1, the first story of epic ml3 (Millipede — the train + the playfield, phase 4a). Dependencies ml1 and ml2 are complete and archived; the millipede plugin exists at `plugins/millipede/`.

**Scope:** three pure `src/core` reducers for the millipede itself:
- **CENTPC** — initialize picture/hpos/vpos/direction (`millipede/MILLI.MAC:498`)
- **NEWHD** — new head (`millipede/MLSUB.MAC:775`)
- **MOTION** — update (`millipede/MILLI.MAC:1444`)

**Guardrails for TEA/Dev:**
- Every ROM constant carries a `citations.test.ts`-gated claim cited to `millipede/<FILE>.MAC:<line>`; keep purity green (`src/core/` stays deterministic, no shell imports).
- Mirror the centipede cp2 "the train" shape where it fits, but this epic's coordinate system must be **scroll-aware from day one** (ml3-5 scroll seam) — pin output coordinates in a core unit test (routing != geometry).
- Reuse `@shared` (loop/rng); no clock reads in core.

**Handoff:** TEA (RED) → Dev (GREEN) → Reviewer (REVIEW).
## Round 1 — Subagent Results (superseded by Round 2 below)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (all gates green) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Yes (hand-covered) | disabled | 3 (hand) | confirmed 1, dismissed 2 |
| 3 | reviewer-silent-failure-hunter | Yes (hand-covered) | disabled | 1 (hand) | confirmed 1, dismissed 0 |
| 4 | reviewer-test-analyzer | Yes (hand-covered) | disabled | 1 (hand) | confirmed 1, dismissed 0 |
| 5 | reviewer-comment-analyzer | Yes (hand-covered) | disabled | 3 (hand) | confirmed 3, dismissed 0 |
| 6 | reviewer-type-design | Yes (hand-covered) | disabled | 1 (hand) | confirmed 1, dismissed 0 |
| 7 | reviewer-security | Yes | findings | 1 (Low, unreachable) | confirmed 0, dismissed 1 |
| 8 | reviewer-simplifier | Yes (hand-covered) | disabled | 0 | N/A |
| 9 | reviewer-rule-checker | Yes | findings | 5 | confirmed 5, dismissed 0 |

**All received:** Yes (3 enabled subagents returned — preflight/security/rule_checker; the other 6 are disabled via `workflow.reviewer_subagents` and were hand-covered by the reviewer, per the memory that only preflight/security/rule_checker are ON)
**Total findings:** 2 confirmed blocking, 5 confirmed non-blocking, 3 dismissed (with rationale), 0 deferred

Dismissals (with rationale):
- [SEC] loose-head rejection loop "could hang with a hostile Rng" — dismissed as blocking: `rng` is only ever constructed internally via `createRng(seed)`; the mulberry32 generator accepts 29/32 masked values so it terminates. Recorded as a Low defense-in-depth note.
- [EDGE] body-follow uses `Math.abs(leader.v - s.v)` not the ROM's 8-bit ABS — dismissed: matches the sibling `centipede.ts:324` precedent and the wraparound case is unreachable in top-of-screen free-space motion.
- [EDGE] loose-head loop unbounded-iteration — dismissed as blocking (same as SEC): terminates against the real generator; folded into the Low note.

## Round 1 — Reviewer Assessment (superseded, REJECTED → reworked → APPROVED in Round 2 below)

**Verdict:** REJECTED

The port is faithful, well-tested (259/259 millipede, 15047 full suite, tsc + purity + citation gates all green) and free of Critical defects. Two confirmed findings must be closed before merge — one is a non-dismissable violation of the epic's core citation rule, the other a MEASURED invariant break at a public boundary. Both fixes are cheap and require no new behavioural tests, so this routes back to Dev as green rework.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [RULE] | Last-head speed-up transcribes ROM constants (`2`/`-2` magnitude + `liveCount===1` trigger, MILLI.MAC:1485-1496) with NO MT-* claim; bare `:1483-1495` citation lacks a filename. Violates the epic rule "every ROM constant carries a citations.test.ts-gated claim cited to `millipede/<FILE>.MAC:<line>`" — non-dismissable, and this is the epic's first story setting the citation precedent. | `plugins/millipede/src/core/millipede.ts:219-224` + `docs/rom-study/claims/09-millipede-train.json` | Add claim(s) (e.g. MT-33/34) for the speed-up magnitude and the one-live trigger, cite MILLI.MAC:1487/1492 and :1485; optionally name a `LAST_HEAD_SPEED = 2` constant so `citations.test.ts` gates it. |
| [MEDIUM] [RULE] | `createMillipede` does not guard `centin <= 0`. MEASURED: `centin:0` → 13 segments, `centin:-1` → 14 — breaks the `NCENT` length invariant every consumer/test assumes. `??` does not catch non-nullish `0`. Unreachable via the ROM cadence (centin ∈ 1..12) but an unguarded public boundary. | `plugins/millipede/src/core/millipede.ts:113` | Clamp/guard `centin` to ≥1 (or throw), mirroring the existing rng-missing guard at :137. |

Non-blocking findings (fix opportunistically in the same rework pass):
- [DOC] test JSDoc "the loose-head fill draws two RND0 bytes each" is false — the rejection loop draws more; soften to match the module's own correct JSDoc. `tests/millipede.test.ts:103`.
- [DOC] loose-head comment cites `:527-548` (centipede's range); millipede's loose fill is MILLI.MAC:609-635. `src/core/millipede.ts:141`.
- [DOC] loose-head direction keys on `RND0 bit 1` (NEWHD idiom) where the ROM's loose fill uses `BIT RND0` = bit 7 (MILLI.MAC:626) — uncited/untested seam; align or cite. `src/core/millipede.ts:144`.
- [TYPE] add `readonly` to `Segment` fields and `stepMillipede(segs: readonly Segment[])` to statically enforce the no-mutation purity contract the tests already assume. `src/core/millipede.ts:77,252`.
- [TEST] / [SILENT] narrow `catch (e)` → `catch (e: unknown)` with `instanceof Error` in the test loader — a non-Error throw currently yields `undefined` for `.message`. `tests/millipede.test.ts:185`.

Dispatch-tag coverage (all lenses accounted for; 6 of 9 subagents disabled → hand-covered):
- [RULE] rule-checker (enabled): 5 findings — the two blockers above + the three non-blocking (DOC-count, TYPE-readonly, TEST-catch). All confirmed.
- [SEC] security (enabled): module is security-inert (pure compute, seeded rng, no I/O/auth/secrets); one Low defense-in-depth note dismissed as blocking (rng always internal).
- [EDGE] (hand-covered): centin≤0 boundary MEASURED (confirmed blocker); loose-head loop termination verified (29/32 accept); body-follow 8-bit-ABS wraparound unreachable in scope (dismissed).
- [SILENT] (hand-covered): the test's `catch (e)` swallows a non-Error to `undefined` (confirmed, non-blocking); the loose-head loop cannot silently hang against the real generator (verified).
- [TEST] (hand-covered): the constants test hand-mirrors ROM values (not echoed from the module — a wrong transcription reddens); the body-pic test pins the exact ROM sequence (non-vacuous). Coverage is honest; only the catch-narrowing nit stands.
- [DOC] (hand-covered): three comment/citation issues confirmed (stale `:527-548`, false "two bytes", direction-bit divergence) — all non-blocking.
- [TYPE] (hand-covered + rule-checker): missing `readonly` on the purity boundary — confirmed, non-blocking.
- [SIMPLE] (hand-covered): no over-engineering — `move()` cleanly unifies descend/plain-march, `stepSegment` mirrors the sibling centipede shape; nothing to simplify.

**Data flow traced:** `createMillipede(headingSign,centin,centis,rng)` → 12 `Segment{h,v,dh,dv,pic,color}` → `stepMillipede(segs,frame)` per-frame → each seg routes through the single `move()` exit (v/h/dh mutation centralized — no leaked edge). Observable output (colour discriminator + coordinates) is pinned in unit tests, not just routing. Safe path; the only reachable defect is the citation gap (traceability), not a runtime miscompute.

**Handoff:** Back to Dev for fixes (green rework).
## Subagent Results

_(Round 2 — re-review of the rework commit d1deacef. Same enabled set as Round 1: only preflight/security/rule_checker are ON; the other 6 are hand-covered.)_

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (260/260 millipede, 47 citation claims, 15048 full/0 fail, tsc clean, no smells) | confirmed 0, dismissed 0 |
| 2 | reviewer-edge-hunter | Yes (hand-covered) | disabled | 1 (hand) | confirmed 1 (NaN/float centin, non-blocking) |
| 3 | reviewer-silent-failure-hunter | Yes (hand-covered) | disabled | 0 | N/A |
| 4 | reviewer-test-analyzer | Yes (hand-covered) | disabled | 1 (hand) | confirmed 1 (loose-head dh untested, non-blocking) |
| 5 | reviewer-comment-analyzer | Yes (hand-covered) | disabled | 1 (hand) | confirmed 1 (:621-624 range, non-blocking) |
| 6 | reviewer-type-design | Yes (hand-covered) | disabled | 0 (readonly now present) | N/A |
| 7 | reviewer-security | Yes | clean | 0 (module security-inert; corroborated NaN-centin as informational) | confirmed 0 |
| 8 | reviewer-simplifier | Yes (hand-covered) | disabled | 0 | N/A |
| 9 | reviewer-rule-checker | Yes | findings | 5 prior CLOSED + 3 new (all non-blocking) | confirmed 3 non-blocking, 0 blocking |

**All received:** Yes (3 enabled subagents returned — preflight/security/rule_checker; the other 6 disabled via `workflow.reviewer_subagents`, hand-covered)
**Total findings:** 0 blocking, 4 confirmed non-blocking (loose-head dh untested, NaN/float centin over-claim, :621-624 comment range, loose-head magnitude uncited), 0 dismissed. All 5 Round-1 findings verified CLOSED (mutation-tested by rule-checker).

## Reviewer Assessment

**Verdict:** APPROVED

Round 1 REJECTED on two findings; this Round 2 re-review verifies the rework (commit d1deacef) closes BOTH — independently and by live mutation test — and introduces no Critical/High regression. Every remaining item is Low/Medium and non-blocking; grinding a third round on an unreachable NaN edge and an entropy-only seam would be the "escalating guard never converges" anti-pattern, so they are recorded as follow-ups rather than blockers.

**Round-1 blockers — both CLOSED (verified):**
- [RULE] Uncited last-head speed-up → claims **MT-33** (one-live trigger, MILLI.MAC:1486) + **MT-34** (magnitude, :1487) added and BYTE-VERIFIED (citation gate 47 claims green; `check-citations.mjs` "all claims verified"); `LAST_HEAD_SPEED = 2` used sign-preservingly; bare `:1483-1495` removed. The epic's citation discipline now covers the speed-up.
- [RULE] Unguarded `centin` → clamped to `[1, NCENT]` (`Math.min(NCENT, Math.max(1, …))`), also guarding `> NCENT`. Mutation-tested: reverting the clamp reddens the new regression test (`centin=-1` → 14 ≠ 12). Integer domain fully covered.

**Round-2 findings — all NON-BLOCKING (recorded as Delivery Findings):**
- [EDGE] / [TEST] The clamp does not cover non-integer/NaN centin (MEASURED `3.7`→13, `NaN`→1), and the comment/test name over-claim "always … any caller." Unreachable via the ROM's integer cadence. Recommend a total clamp (`Number.isFinite` + `Math.trunc`) or narrowed wording.
- [TEST] No test pins the loose-head `dh`; a `2→3` magnitude mutant survives green. Recommend a sign+magnitude assertion mirroring the speed-up test.
- [DOC] Comment range `:621-624` quotes only 3 instructions (`:621-623`).
- [RULE] The loose-head `dh` magnitude `2` (MILLI.MAC:617-618) has no dedicated MT-* claim — defended only by prose; consider a claim when the fill is sim-wired.
- [SEC] Module remains security-inert (pure compute, seeded internal rng, no I/O/auth/secrets). No finding.
- [SILENT] The test loader's `catch (e)` was narrowed to `catch (e: unknown)` with `instanceof` — the prior swallow-to-`undefined` is fixed. No open item.
- [SIMPLE] No over-engineering; the rework is minimal and mirrors the sibling centipede shape. Nothing to simplify.
- [TYPE] `readonly` now on `Segment` fields + `stepMillipede` param — the purity boundary is statically enforced; tsc clean, no mutation introduced.

**Data flow traced:** `createMillipede(headingSign, centin[clamped 1..NCENT], centis, rng)` → NCENT `Segment{h,v,dh,dv,pic,color}` → `stepMillipede(readonly segs, frame)` → each live seg routes through the single `move()` exit (v/h/dh centralized — no leaked edge). Observable output (colour discriminator + coordinates) is pinned in unit tests, not just routing. No reachable defect remains; the residual items are unreachable (NaN/float centin) or non-critical entropy-seam coverage.

**Handoff:** To SM for finish-story.