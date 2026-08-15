---
story_id: "df3-5"
jira_key: "df3-5"
epic: "df3"
workflow: "tdd"
---
# Story df3-5: Laser fire

## Story Details
- **ID:** df3-5
- **Jira Key:** df3-5
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** feat/df3-5-laser-fire
- **PR:** https://github.com/slabgorb/arcade/pull/431
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-15T22:47:17Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-15T19:29:38Z | 2026-08-15T22:19:07Z | 2h 49m |
| red | 2026-08-15T22:19:07Z | 2026-08-15T22:29:24Z | 10m 17s |
| green | 2026-08-15T22:29:24Z | 2026-08-15T22:32:19Z | 2m 55s |
| review | 2026-08-15T22:32:19Z | 2026-08-15T22:47:17Z | 14m 58s |
| finish | 2026-08-15T22:47:17Z | - | - |

## Sm Assessment

**Story:** df3-5 — Laser fire (defender), 3pt, tdd, p2. The title is the full spec.

**Pre-setup probes (all clean):**
- Sibling branch probe: no `df3-5` branch remotely before setup. Session probe: a-2 owns df3-2, a-3 owns ml9-2 — neither touches df3-5.
- Merge gate: no open PRs.
- `depends_on: None`. Its real dependency, df3-1's `plugins/defender/src/core/scheduler.ts`, is merged and present — each laser is a scheduler super-process built on it.
- `plugins/defender/src/core/laser.ts` does not yet exist — fresh file.

**Setup decisions:**
- Branch `feat/df3-5-laser-fire` cut from `develop` (gitflow), pushed with the claim commit so the sibling branch-probe lights up.
- Epic ACs were `null`; sm-setup did NOT derive any — left for TEA to define in RED from the title spec. Correct call for a title-is-spec story; no AC-editing gotcha applies.
- Enriched the story context with three coordination pointers the title omits: the scheduler dependency, the `src/core/` purity boundary, and a prominent restatement of the df4 scope fence (collision-vs-enemies is OUT).
- Patched `**Repos:**` and `**Branch:**` into this session (sm-setup omitted both).

**Scope fence for TEA:** df3-5 fires and travels ONLY — LFIRE, the 4-concurrent cap (LFLG<4, DEFA7.SRC:2763-2766), facing-based spawn side (LASR/LASL, :2790/:2839), the LFLG/LCOLRX record (PHR6.SRC:301-303), travel, off-screen death. Collision against enemies is df4 — do not test it.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation) — df3-5 GREEN
- **No deviations.** Built `src/core/laser.ts` exactly to the TEA contract. `STEP = 0x100` (the ROM's `LEAX $100` head advance, :2804) — TEA's deviation D2 explicitly left the exact magnitude to Dev; the suite pins only direction + constancy, both satisfied. `count` reads `lasers.length` directly (LFLG = live count, INC on fire / DEC on death — cannot desync). Each laser is a `sched.makeProcess` continuation that checks the death edge first (ROM tests PD at the loop top), else advances and `sleep(1)`.
- **GREEN verified (testing-runner):** laser suite 11/11; purity sweep 25/25 (the armed src/core scan now covers laser.ts — clean); whole defender project 361/361; `npm run lint` (tsc) clean. No regressions.

### TEA (test design) — df3-5 RED
- **Gap (non-blocking):** no ship/player module exists in `src/core/` yet — df3-3 (the ship) is unbuilt and df3-2 (world-wrap/`slide()`) is a concurrent sibling in a-2. So `laser.ts` takes `shipX` + `facing` as INPUTS to `fire()` rather than importing a ship. This keeps df3-5 independent (matches `depends_on: none`); the ship story wires its NPLAD→Facing snapshot into `fire()` later.
- **Improvement (non-blocking):** the ROM's `LASR1`/`LASR3` beam draw loops, the `FISS` "fissle" sparkle table, and `LCOLRX` colour are all RENDER — a future defender render story should port them. df3-5 core models only the leading-edge travel + off-screen death (see deviation D2).

### Reviewer (code review) — df3-5
- **Gap** (non-blocking, RESOLVED this round): `fire()` did not validate `shipX`; a non-finite value made `offScreen()` forever false → an immortal laser leaking an LFLG slot. Affects `plugins/defender/src/core/laser.ts` (guard added). *Found by reviewer-rule-checker (#21), fixed + tested in c4cd1a5a.*
- **Improvement** (non-blocking): the real per-tick head speed (ROM $400/tick) is a render/tuning concern the df3-5 core does not reproduce (STEP=0x100 placeholder). A later render story should set the true laser speed. Affects `plugins/defender/src/core/laser.ts`. *Found by Reviewer during code review.*

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design) — df3-5 RED
- **D1 — coordinate model is ROM screen-pointer space, not the world cylinder.** Spec: the title cites raw ROM addresses ($704, $9800, $0500). Decision: the laser's `x` is the ROM's leading-edge screen pointer PD; the death edges $9800/$0500 and spawn offsets $704/$4 are pinned as ROM literals. The laser is a screen beam — it does NOT `wrap16` (distinct from `world.ts`). Why: faithful to `LDX PD,U / CMPX #$9800` (:2802) and avoids inventing a new coordinate system.
- **D2 — the exact per-tick pixel step is NOT pinned; direction + constancy are.** Spec: `LEAX $100,X` (:2804) advances the head, but the head's net per-tick travel is entangled with the 4-segment beam blit (LASR1 draws 4× $100 then the $99 cap). Decision: the suite pins that the per-tick delta is (a) the right sign per facing and (b) CONSTANT across ticks (uniform velocity, faithful to `NAP 1`), but not an exact magnitude — that magnitude is a render property, not a fire/travel invariant the story asks for. Why: pinning a possibly-wrong transcription of a render artifact would be a false-precision guard (avoids the derived-vs-transcribed trap).
- **D3 — `fire()` is synchronous; travel is a scheduler process.** ROM: LFIRE and the laser are ONE process (LFIRE falls through into LASR/LASL). Decision: `fire()` models LFIRE's synchronous effect — cap check + INC LFLG + positioning PD at spawn — and returns the laser handle; the laser's TRAVEL then runs as a `sched.makeProcess` continuation (one step/`NAP 1` per tick). The laser is positioned at spawn immediately (ROM `STX PD` before the loop) but does not MOVE until the first `stepTick` (MKPROC PTIME=1). Why: reuses df3-1's scheduler rather than reinventing a stepping loop; keeps `fire()` observable synchronously for the cap tests.
- **D4 — `fire()` takes `Facing`, not the raw NPLAD byte.** ROM keys spawn side off `NPLAD`'s sign (`BPL LASR`, :2771). Decision: `fire(shipX, facing: Facing)` — the ship story (df3-3) owns the NPLAD→Facing map, exactly as `world.ts` already does. Why: decouples df3-5 from the unbuilt ship.

### Reviewer Deviation Audit — df3-5
- **D1 — ACCEPTED.** ROM screen-pointer coordinate model with literal edges/offsets is the faithful choice; verified $9800/$0500/$704/$4 against DEFA7.SRC.
- **D2 — ACCEPTED (strengthened).** Not pinning the exact step magnitude is CORRECT — the ROM head advances $400/tick (4× `LEAX $100`), so pinning 0x100 would assert a number the ROM does not use. Reviewer round confirmed this and had the comment/rationale tightened (the citation also corrected :2804→:2805).
- **D3 — ACCEPTED.** Synchronous `fire()` + travel-as-scheduler-process matches LFIRE/LASR and reuses df3-1's kernel; verified against scheduler.ts semantics (PTIME=1).
- **D4 — ACCEPTED.** `Facing` input (not raw NPLAD) correctly decouples df3-5 from the unbuilt ship; mirrors `world.ts`.
- **Dev "No deviations" — ACCEPTED.** Implementation matched the TEA contract; STEP=0x100 within D2's leeway.

## TEA Assessment — df3-5 (RED complete)

**Story:** Laser fire (defender), 3pt, tdd. Title is the spec; epic ACs were null, so TEA derived the contract from the ROM.

**RED state:** `plugins/defender/tests/laser.test.ts` — 11 tests, ALL failing with the self-describing "src/core/laser.ts not built yet …" error (the `loadLaser()` pattern from scheduler.test.ts). Verified by testing-runner: file fully collected, `scheduler.js` imports clean, zero syntax/collection errors. RED for the right reason (feature absent). Committed as `3bb359be`.

**Derived ACs (the contract Dev must satisfy):**
1. `MAX_LASERS === 4` and the 5th concurrent `fire()` returns `null` with `count` unchanged at 4 (LFIRE cap, DEFA7.SRC:2763-2773).
2. `fire()` under the cap spawns a live laser and increments `count` (LFLG, INC :2766).
3. Facing selects spawn side + offset: right → `shipX + 0x704` (:2792), left → `shipX + 0x4` (:2841) — distinct offsets.
4. A fresh laser does not move until the first `stepTick` (MKPROC PTIME=1), then travels.
5. Travel is uniform: right laser's `x` increases by a constant step/tick, left decreases by a constant step/tick (NAP 1, :2830/:2878) — both branches pinned.
6. Off-screen death frees a slot: right dies at `x ≥ 0x9800`, left at `x ≤ 0x0500`, each decrementing `count` and marking the laser `!alive` (LASD DEC LFLG, :2885) — both branches pinned.
7. A freed slot is reusable — after four lasers fly off-screen, `fire()` succeeds again (cap is a live count, not a lifetime budget).

**Rule Coverage (lang-review/typescript.md):**
- **#14 (edges in one branch of a state machine):** right AND left death edges + travel directions are each pinned independently — the classic "implemented right, forgot/mirrored left wrong" bug is caught.
- **#26 (assertion terms all local = vacuous):** the pinned magnitudes ($704, $4, $9800, $0500, cap 4) are ROM literals declared in the test, NOT imported from `laser.ts`'s own exports — asserting against the module's own constant would be circular.
- **#29 (ordering standing in for magnitude):** travel uses direction+constancy AND the death tests pin the real ROM edge magnitudes ($9800/$0500), so "it moves" never substitutes for "it dies at the right place".
- **#21 (degenerate/boundary numeric input):** the cap test hits `count === 4` exactly (the BHS boundary) and asserts the 5th is a no-op.
- **#18 (test apparatus fails by passing):** the `loadLaser()` self-describing throw guarantees every RED failure proves feature-absence, not a broken harness.
- **#8/#23 (test quality / no vacuous):** Phase-C self-check caught and fixed a doubled assertion in the PTIME=1 test; it now contrasts before/after one tick.

**Scope fence held:** NO enemy-collision test (LCOL/COLIDE) — that is df4. See deviation D2 for render deferral.

**Handoff → Dev (Loki Silvertongue):** build `src/core/laser.ts` per the contract in the suite header. It is pure core (purity sweep will scan it), must reuse `createScheduler` from df3-1, and each laser must be a scheduler process. Make the 11 tests green without touching the ROM fidelity of the pinned magnitudes.

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (361→364 green, lint clean, 0 smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer's own mutation battery |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — Reviewer assessed: no swallowed errors; `remove()` no-op is intentional |
| 4 | reviewer-test-analyzer | Yes | findings | 5 | confirmed 4, deferred 1 (F6/#29 → resolved via D2 comment, not a pin) |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (citation :2804→:2805) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — Reviewer assessed: sound readonly views, no stringly-typed API |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — internal game core, no external input surface |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — Reviewer assessed: no dead code |
| 9 | reviewer-rule-checker | Yes | findings | 4 | confirmed 3 (#21 high, #26, #29-as-comment), noted 1 (#11 catch-cast, consistent w/ scheduler.test.ts) |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 8 confirmed & FIXED, 0 dismissed, 1 deferred-then-resolved-as-comment, 1 noted-consistent-with-precedent

## Devil's Advocate

Assume this laser core is broken. Where does it fail?

**A malicious/confused caller** hands `fire()` a hostile `shipX`. Round 1 this was the real hole (rule-checker #21): `NaN`/`Infinity` produced an immortal laser that permanently ate one of four LFLG slots — a slow denial-of-fire that no test caught and no error announced. That is now guarded (`Number.isFinite`) and pinned by a test that fires `NaN`/`Infinity`, asserts rejection, and proves the bank still works after. What about a *negative* `shipX`? A left laser from a small `shipX` spawns at a negative x that already satisfies `x <= LEFT_EDGE` — it dies on its first dispatch (count returns to 0), which is faithful (an off-screen spawn is off-screen); no leak. What about `shipX` so large a right laser spawns already past `$9800`? Same: dies on first dispatch, slot freed. No wedge in either direction.

**A stressed scheduler.** Could a laser desync from the count? `count` is `lasers.length` — there is no second counter to drift. Could a laser be double-freed? The travel continuation returns without sleeping on the death tick, so the scheduler SUCIDEs it and it never runs again; `remove()` is idempotent (indexOf guard). Could firing during a dispatch double-step a laser? No — `makeProcess` sets PTIME=1 and `stepTick` dispatches a snapshot, so a laser fired mid-tick first travels next tick (verified against scheduler.ts and by the PTIME=1 test).

**A future regression.** The mutation battery (8 mutants) guards against "someone changes a constant." The two mutants that survived round 1 — a per-facing cap (silently allowing 8 lasers) and a left edge moved too far — are now each killed by a dedicated test (mixed-facing saturation; prev-tick death bracket). The one thing deliberately NOT pinned is the exact travel *speed* — documented (D2) because the ROM's real $400/tick head advance is render-entangled, and pinning the 0x100 placeholder would assert a number the ROM does not use.

**What a stressed filesystem / config does:** nothing — a pure in-memory core, no I/O, no config, no external fields; the purity sweep proves it touches no clock/DOM/entropy. I could not construct a broken-input path that survives the hardened suite.

## Reviewer Assessment

**Verdict:** APPROVED
**Data flow traced:** `fire(shipX, facing)` → a `LaserRecord` on the bank list + a `sched.makeProcess` travel continuation → position advances one STEP/tick until `offScreen()` → `remove()` + SUCIDE (safe because `shipX` is finite-guarded at the boundary and `count` is the list length, so no counter can drift or leak).
**Pattern observed:** each laser is a cooperative scheduler process (NAP-1-per-tick), faithful to LASR/LASL, at `plugins/defender/src/core/laser.ts:107-118`; reuses df3-1's kernel rather than reinventing stepping.
**Error handling:** boundary guard `if (!Number.isFinite(shipX)) return null` at `laser.ts:92`; death path frees the slot deterministically (`laser.ts:110-113`).
**Confirmed findings (by source, all FIXED in `c4cd1a5a`):**
- `[RULE]` (#21, High) unguarded `shipX` → immortal laser / LFLG-slot leak — `laser.ts:92` finite guard added + NaN/Infinity test.
- `[TEST]` (High) LFLG cap only exercised single-facing — a per-facing pool (8 concurrent) would have survived; added a 2R/2L mixed-saturation test.
- `[TEST]` (Medium) off-screen-death asserted only "died past the edge"; a too-small edge survived (mutation M5) — added the prev-tick bracket to both death tests.
- `[TEST]` (Medium) freed-slot only tested on full drain — added a mid-flight test with distinct spawns (pins removal-by-identity).
- `[DOC]` (High-conf) STEP comment cited `:2804` (= `LASR1 STB ,X`); the `LEAX $100,X` is `:2805` — corrected, and clarified the ROM head advances $400/tick so STEP=0x100 is a placeholder (D2).
- `[TEST]`/`[RULE]` (#26) tautological literal-vs-literal assertion — replaced with a cross-branch check reading real code output.
- `[RULE]` (#29) STEP magnitude unpinned — resolved by strengthening the D2 rationale/comment (pinning 0x100 would assert a value the ROM does not use), not by a false pin.
- `[RULE]` (#11, low, NOTED) `catch (e)` uses `(e as Error)` cast — kept for consistency with the sibling `scheduler.test.ts` idiom.

**Round summary:** 8 confirmed findings (2 High), ALL fixed and mutation-verified — the 3 previously-surviving/new mutants (per-facing cap, left edge, missing NaN guard) each now redden a test. No outstanding Critical/High. Suite 11→14, defender 364/364, purity 25/25, lint clean.
**Handoff:** To SM for finish-story.