---
story_id: "cp2-10"
jira_key: "cp2-10"
epic: "cp2"
workflow: "tdd"
---
# Story cp2-10: The head factory — NEWHD spawns fresh heads into the player zone while the train bounces at the bottom

## Story Details
- **ID:** cp2-10
- **Jira Key:** cp2-10
- **Workflow:** tdd
- **Stack Parent:** cp2-5 (dependency)
- **Repos:** centipede

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T15:29:39Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T14:28:43Z | 2026-07-19T14:29:13Z | 30s |
| red | 2026-07-19T14:29:13Z | 2026-07-19T14:52:44Z | 23m 31s |
| green | 2026-07-19T14:52:44Z | 2026-07-19T15:10:29Z | 17m 45s |
| review | 2026-07-19T15:10:29Z | 2026-07-19T15:29:39Z | 19m 10s |
| finish | 2026-07-19T15:29:39Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (blocking-for-correctness, for Dev): **the wave-clear (DEAD==0) decision must be evaluated BEFORE the factory spawn, or the spawn gated on the not-clearing state.** The ROM guarantees a clearing wave can't be reopened because SHOOT arms DELAY at DEAD==0 (CT-62) and NEWHD runs AFTER SHOOT with a DELAY gate (CT-71) — so the frame the last segment dies, NEWHD sees DELAY and does not spawn. In `stepPlayingFrame` the wave-clear check currently runs at the very end; if `stepNewhd` is placed before it (unconditioned) a fresh head backfills the just-vacated slot and `segs.every(vacant)` never becomes true → the wave becomes permanently unclearable. Pinned by the AC-3 tests + the "armed, due factory does NOT reopen a clearing wave" CONTROL. Affects `src/core/sim.ts` (order stepNewhd relative to the wave-clear/`checkPlayerContact` early-returns). *Found by TEA during test design.*
- **Improvement** (non-blocking): **`cloneState` must deep-copy the new `newd`/`count1`/`count3` fields, and `count3` must PERSIST its ramp** (only INIT seeds it, CT-88/91 — CENTPC/wave-relay does NOT reset it; a respawn only reloads COUNT1 from COUNT3). `cloneState` enumerates fields explicitly (no spread), so a forgotten field silently aliases/drops and the seeded replay diverges. Pinned by the cloneState-mid-schedule test. Affects `src/core/sim.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking, routed to cp3 / poison): **only a PLAIN head (pic < 0x10) arms NEWD (CT-89)** — a body (0x4x) or a POISONED head (0x2x) reaching the bottom does NOT arm the factory. Dormant in wave-1 (no poison code is ever wired, per cp2-5's Reviewer note), but a cp3 poison story that lets a poisoned head DIVE to the bottom must not arm the factory off that dive. Affects `src/core/centipede.ts` / `src/core/sim.ts` (the newd-arm predicate). *Found by TEA during test design.*
- **Gap** (non-blocking, routed to cp4 / score progression): **the score-driven COUNT3 tightening is out of the demo's deterministic scope** — SCORNG also decrements COUNT3 by 2 on every 10,000-point boundary (CENTI4.MAC:1960-1962, "INCREASE FREQUENCY OF NEW HEADS", CT-91-adjacent, BCD). This is orthogonal to the wave-1 NEWHD cadence pinned here (the per-spawn −8 ramp, CT-87) and to determinism; a score/wave-progression story owns it alongside CENTIS (cp4). Affects `src/core/sim.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (blocking-for-correctness, resolved by Dev): **CT-91's "respawn reloads COUNT1 from COUNT3" citation is the 2-player/cocktail player-SWAP path (CHKEND :697-698, only reached via the `71$`/2-player branch), not the generic single-player respawn.** Read CENTI4.MAC:600-745 directly: a 1-player game takes `70$: JMP 80$` straight to `80$: DEC LIVES / 85$: BUGOFF/ANTPC / 90$: JSR CENTPC` — CENTPC itself only clears NEWD (CT-90), never touches COUNT1/COUNT3. So for this (single-player) sim, a death-respawn and a wave-clear both persist `count1`/`count3` UNCHANGED and only clear `newd`; TEA's Delivery Finding #2 generalized a 2-player-only citation to "respawn" broadly. No test exercises this path either way, so it's a documentation correction, not a behavior change requiring new coverage. Affects `src/core/sim.ts` (`stepDeathFrame`'s two `createCentipede()` branches). *Found by Dev during implementation.*
- **Gap** (blocking-for-correctness, resolved by Dev): **the first AC-3 test (`newhd-factory.test.ts`, "a live factory head keeps the wave open") started from an all-12-vacant `segs` array, identical in shape to the sibling CONTROL ("an armed, due factory does NOT reopen a clearing wave").** Given the mandated (and CONTROL-verified, mathematically necessary — see Design Deviations) wave-clear-BEFORE-spawn ordering, `segs.every(vacant)` is already true before `stepCentipede` even runs, so the wave-clear poll wins on frame 0 every time — the factory never gets a chance to run, and the test times out waiting for a spawn that structurally cannot happen within budget. This is the exact "all-dead-at-t=0 by accident" pitfall the file's own `scenario()` helper was built to avoid (its comment: "one high live decoy so the array is never all-dead by accident") and that the very next AC-3 test avoids by using `scenario()`. Fixed the test's setup to match that established idiom (one live decoy + 11 vacant slots) rather than change the sim's wave-clear semantics, which is pinned by a baseline regression test (`death-restor.test.ts` "the wave-1 LOOP closes") that directly mutates `segs` to all-dead and expects the very next frame to close it — an edge-triggered-on-kill wave-clear would break that pin. Affects `tests/newhd-factory.test.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (non-blocking, for SM/Dev): **claim CT-91's prose was never corrected in the dossier.** Dev's Delivery Finding above correctly re-derived that the `LDA X,COUNT3-1 / STA COUNT1` at CENTI4.MAC:697-698 (`738$`) is reachable ONLY via the 2-player/cocktail player-swap (`70$`→`BNE 71$`→`73$`→`738$`); a 1-player game takes `70$`→`JMP 80$` and never reloads COUNT1 — I re-traced 595-745 independently and confirm. But the claim JSON still reads *"On respawn CHKEND reloads COUNT1 from the persisted COUNT3"*, over-generalizing a 2-player-only path to "respawn." The byte-verified quote and the load-bearing invariant (COUNT3 persists across lives/waves, reset only by INIT) are accurate — only the trigger framing is wrong. Affects `docs/rom-study/claims/09-centipede-train.json` (rewrite CT-91 prose to scope the COUNT1 reload to the player-swap path; the gate stays green — it verifies the quote, not the prose). *Found by Reviewer during code review.*
- **Improvement** (non-blocking, for TEA/Dev): **a tautological assertion leaves AC-3's "rides the SAME bounce containment" unverified for factory heads.** `tests/newhd-factory.test.ts:352-357` filters `zoneHeads` by `seg.v <= CENT_BOUNCE_TOP_V` then re-asserts `h.v <= CENT_BOUNCE_TOP_V` on those same items — it cannot fail (mutation-proved: raising `CENT_BOUNCE_TOP_V` to 0x90 leaves all tests green). The outer `v<=0xf8` / `v>=CENT_BOTTOM_V` bounds do fire (real field-escape check) and the bounce mechanism is pinned by cp2-5, so no correctness hole — but the 0x30 sub-band claim is unpinned. Affects `tests/newhd-factory.test.ts` (assert against an independently-derived max-v, not the filter predicate). *Found by Reviewer during code review.*
- **Gap** (non-blocking, for TEA): **three byte-cited mechanisms have zero behavioral coverage** — CT-87 ramp/floor (every scenario seeds `count3 < 0x60`, so the `-8`/floor branch never runs; terminal 0x58 untested), CT-89 arm-exclusion (no negative test that a poisoned head 0x2x / body 0x4x at the bottom leaves `newd` false), CT-90 death-respawn disarm (`sim.ts:264` untested; only the wave-clear branch `:280` is). All correct-by-construction + byte-verified, but a future regression would slip past. Affects `tests/newhd-factory.test.ts`. *Found by Reviewer during code review.*
- **Gap** (blocking-for-finish, for SM): **AC-4 (demo evidence from this checkout) is unmet** — the branch commits only the claims JSON, `centipede.ts`, `sim.ts`, and the test; no screenshot/sequence showing bottom-camping drawing fresh heads. Like cp1's pointer-lock, reaching the NEWHD-camp state likely needs a HUMAN smoke test (automated play dies before bottom-camping). Affects story finish (capture evidence or user-waive AC-4 before archiving). *Found by Reviewer during code review.*

### TEA (review rework)
- **No new blocking findings.** All five hardening tests (F2 containment pin, F3 CT-87 ramp, F4 CT-89 arm-exclusion, F5 CT-90/91 death-respawn disarm) PASS against the shipped implementation — it is byte-faithful; nothing in `src/` needed changing (the sole src touch is the F9 comment on `centipede.ts:362`, comment-only). Mutation-verified non-vacuous: F2 FAILS under a `CENT_BOUNCE_TOP_V` 0x30→0x90 mutation (the old tautological assertion stayed green under exactly that), and both F4 negative arms FAIL under a `NEWD_ARM_PIC_MAX` 0x10→0x50 mutation; reverted immediately. *Found by TEA during review rework.*
- **Gap** (non-blocking, routed to cp3 / poison): **a poisoned head that DIVES to the bottom clears its poison bit there (CT-24) and, now a PLAIN head, can legitimately arm NEWD on a SUBSEQUENT bottom pass.** CT-89 excludes it only WHILE poisoned (pic ≥ 0x10), so the F4 poisoned-head test pins just the still-poisoned bottom frame. This is ROM-faithful (the arm check at :1305-1310 runs each frame BEFORE the poison-clear at :1395), but a cp3 poison story wiring real poison dives must expect a de-poisoned dived head to arm the factory — the exclusion is not permanent. Affects `src/core/sim.ts` (the newd-arm predicate) / `src/core/centipede.ts` (`descend`'s CT-24 poison-clear). *Found by TEA during review rework.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **SimState is extended with the factory state (newd / count1 / count3) — TEA-proposed shape.**
  - Spec source: context-story-cp2-10.md AC-1/AC-2 + the cp2-5 "NEWHD deferral" Delivery Finding (the trigger CT-23 pinned, spawn CT-71 deferred as sim-level RNGEN+DELAY state).
  - Spec text: "fresh heads enter per NEWHD's transcribed cadence/coords/side-selection … RNGEN consumption is transcribed and seeded-deterministic … cloneState mid-schedule reproduces identically."
  - Implementation: the RED suite reads `newd: boolean` (the NEWD arm, CT-23/89/90), `count1: number` (the per-frame down-counter, CT-78/88) and `count3: number` (the ramping interval, CT-87/88) off SimState via a `SimExt` cast, and pins `createSim` seeding `newd=false`, `count1=count3=0xC0`, plus `cloneState` deep-copying all three. Dev may refine names but the tests encode this shape (mirrors cp2-5's SimState-shape deviation).
  - Rationale: the spawn cadence + seeded schedule cannot be pinned without callable/observable durable state; a single `stepNewhd` hook consuming `state.rng` is the minimal surface.
  - Severity: minor.
  - Forward impact: `cloneState` must list the three new fields (a pinned test); `count3` persists across waves (only INIT reseeds it, CT-91).
- **The fresh-head picture is pinned to 0x00, NOT CENTPC's 0x03.**
  - Spec source: context AC-1 "coords/side-selection"; CT-80 (:1664 LDA I,0 / :1665 STA MOBJP ;MAKE HEAD PICTURE).
  - Spec text: "fresh heads enter per NEWHD's transcribed … coords."
  - Implementation: the coord test asserts `pic === 0x00` (a plain head, low-nibble 0), distinct from the initial train head's 0x03 (CT-3). Both are heads (bit 6 clear); the low nibble is the sprite frame.
  - Rationale: NEWHD writes a literal 0x00 — pinning the ROM value keeps the render stamp faithful (segmentStamp → HEAD0) and prevents a Dev reusing CENT_HEAD_PIC out of convenience.
  - Severity: minor.
  - Forward impact: none; one-line constant in the Dev's spawn.
- **The cadence tests set count1/count3 DIRECTLY to small values rather than driving the real 0xC0 (192-frame, ~3 s) interval.**
  - Spec source: context AC-1 "transcribed cadence"; CT-78/87/88.
  - Spec text: "fresh heads enter per NEWHD's transcribed cadence."
  - Implementation: the boot value 0xC0 is pinned separately (CT-88 `createSim` test); the spawn-mechanism tests construct states with `count1`/`count3` small so a spawn lands within a few frames. The pinned behaviour is the MECHANISM (down-count → spawn-at-0 → reset COUNT1 to the ramped COUNT3), not a 192-frame wall-clock wait.
  - Rationale: driving 192+ frames per spawn (× multiple spawns × 64 seeds) is slow and tests nothing the mechanism + boot-constant pins don't; the ROM interval is a constant, verified once.
  - Severity: minor.
  - Forward impact: none; the −8 ramp/0x60 floor (CT-87) are cited as claims, exercised behaviourally via the count3 reset, not a dedicated frame-table.
- **AC-2's "different seeds may differ" is pinned as a 64-seed set-equality, not per-seed side values; the RNGEN→side bit mapping is left to Dev.**
  - Spec source: context AC-2 "same seed → same spawn schedule; different seeds may differ"; CT-84 (RNGEN AND 0x02).
  - Spec text: "RNGEN consumption is transcribed and seeded-deterministic."
  - Implementation: the ROM reads a free-running POKEY RNGEN and tests bit 1; the sim's seeded mulberry32 Rng is a different generator, so the test does NOT force a specific rng bit — it asserts (a) same seed → identical side schedule, (b) the observed side-set across 64 fixed seeds is exactly {0xFC, 0x04} (catches a hardcoded side deterministically), (c) idle frames draw no entropy while a spawn advances `rng.seed`.
  - Rationale: pinning a specific rng bit would couple the test to the generator internals; the faithful invariant is "a single seeded draw picks one of two symmetric edges," which the set-equality + determinism pins capture.
  - Severity: minor.
  - Forward impact: Dev is free to map the draw (e.g. `nextInt(rng, 2)` or a bit test) as long as both edges are reachable and replay is deterministic.
- **AC-3 "the wave still ends" is pinned in TWO forms: a genuine RED (spawn-then-kill) and a CONTROL (green now).**
  - Spec source: context AC-3 "the wave still ends only when ALL live segments (train + factory heads) are cleared."
  - Spec text: "the cp2-5 containment and wave-loop pins stay green."
  - Implementation: the RED form spawns a factory head, proves it keeps the wave open + rides the CT-72/73 bounce + is killable, then clears it; the CONTROL form (all-dead + armed-due factory still re-enters) is green in RED and MUST stay green through GREEN — it is the regression guard for the spawn-vs-wave-clear ordering (see Delivery Finding #1). The cp2-5 containment (`sim-assembly.test.ts`) and wave-loop (`death-restor.test.ts`) pins are relied upon unchanged.
  - Rationale: "the wave still clears" is partly a non-regression property that cannot RED before the factory exists; splitting it isolates the genuinely-new behaviour from the guard.
  - Severity: minor.
  - Forward impact: the CONTROL will turn RED if a Dev wires `stepNewhd` ahead of the wave-clear check.

### Dev (implementation)
- **`tests/newhd-factory.test.ts`'s first AC-3 test rebuilt to start from a live-decoy + 11-vacant array instead of all-12-vacant, and to detect the spawn via `factoryHeadAt40` instead of a bare `isLiveHead` scan.**
  - Spec source: TEA's Delivery Finding #1 (blocking-for-correctness) — wave-clear MUST be evaluated before the factory spawn, verified against the CONTROL "an armed, due factory does NOT reopen a clearing wave" in the same describe block.
  - Spec text: the test's own comment said "Start with the field all-dead EXCEPT the factory will populate it" — an all-12-vacant, `delay: 0` starting `segs`.
  - Implementation: proved this precondition is mathematically unsatisfiable together with Finding #1's mandate. Wave-clear (`segs.every(vacant)`, evaluated every playing frame with `delay===0`) is a POLL, not edge-triggered off a kill (confirmed against the pinned `death-restor.test.ts` "wave-1 LOOP closes" test, which directly mutates `segs` to all-dead and expects the very next `stepSim` call to close it — an edge-trigger-on-kill design would break that baseline). Given the poll runs on the incoming state before `stepNewhd` can act, an all-12-vacant start trips the poll on frame 0, before the factory ever gets a turn — identical, by construction, to the sibling CONTROL's own setup. Ran the CONTROL's own scenario forward under a hypothetical "spawn-before-wave-clear" ordering to confirm the alternative also fails (the factory backfills every vacant slot within ~24 frames and, since nothing ever kills those heads in that scenario, the wave never re-closes — exactly the hang Finding #1 warns about). Fixed the test's setup to the same "one live decoy, N vacant" idiom the file's own `scenario()` helper and the very next AC-3 test already use, and swapped the spawn-detection assertion to `factoryHeadAt40` (unique to a factory spawn, per the file's own doc comment) so the fix doesn't make the assertion vacuous against the decoy.
  - Rationale: the sim's poll-based wave-clear is existing, pinned (cp2-5) behaviour that Delivery Finding #1 explicitly requires stepNewhd to respect, not redesign; the test's precondition, not the implementation, was the defect.
  - Severity: minor (test-construction fix only; no assertion intent changed, no production behaviour changed by this edit).
  - Forward impact: none — the fixed test still pins the same AC-3 behaviour (a spawned factory head keeps the wave open; killing everything re-enters it and disarms NEWD).

## Sm Assessment

**Setup complete, ready for RED.** cp2-10 (3pt feature, tdd, user-requested) — the NEWHD
head factory: fresh heads into the player zone off the NEWD trigger, making bottom-camping
lethal. Dependency cp2-5 shipped (bounce + NEWD/CT-71 pins); cp2-9's unified descent is the
motion substrate. This story properly lifts the determinism deferral: first rng entropy in
the motion loop, seeded end-to-end.

- **Branch:** `feat/cp2-10-newhd-head-factory` off origin/develop (cp2-9 tip).
- **Jira:** skipped — none on this project.
- **Mode:** peloton subagent mode — tea/reviewer→opus, dev→sonnet; merges user-authorized.

## Tea Assessment

**Tests Required:** Yes — the NEWHD head factory: the first RNGEN entropy in the motion loop, the NEWD trigger chain, the COUNT1/COUNT3 cadence, the fresh-head coords/side-selection, and the wave-end interaction, all seeded-deterministic behind the live citation gate.

**RED commit:** `776f272` on `feat/cp2-10-newhd-head-factory` (off cp2-9 tip `459f380`). Working tree clean; NO implementation written (TEA writes tests only).

### Quarry (rev-4 CENTI4.MAC, .RADIX 16; authoritative tree = the checker's `reference/atari-source/centipede/revision.v4/`)

**The trigger chain (NEWD, CT-23/89/90):** a MOTION segment reaching the bottom row (`CMP I,9 / BCS 71$`, V<9) that is a PLAIN head (`CMP I,10 / BCS 70$` — pic < 0x10, excludes bodies 0x4x and poisoned heads 0x2x) sets `STY NEWD` (Y=1) — the factory arm (:1305-1310). CENTPC clears NEWD at every wave re-lay (:552-553), so the factory re-arms per wave. NEWD stays set for the rest of the wave once tripped.

**The cadence (COUNT1/COUNT3, CT-78/87/88/91):** NEWHD runs once per frame (mainloop CT-70). Gate: `LDA NEWD / BEQ` (armed) then `LDA DELAY / BNE` (not during the death/wave pause, CT-71). Then `LDA COUNT1 / BEQ 10$` — if COUNT1>0, `DEC COUNT1 / RTS` (no spawn); at COUNT1==0 attempt a spawn. On a successful spawn: if `COUNT3 >= 0x60` then `COUNT3 -= 8` (write-back; floored below 0x60, "SMALLEST VALUE WE ALLOW"), and `COUNT1 = COUNT3` (the ramped interval) — each fresh head arrives sooner. INIT seeds `COUNT1=COUNT3=0xC0` (192 frames ~3 s); respawn reloads COUNT1 from the PERSISTED COUNT3 (only INIT reseeds COUNT3, so the ramp carries across lives/waves).

**The slot search + cap (CT-79):** scan slots `NCENT-1..0` (11 down to 0) for the FIRST dead slot (`BMI 20$`, MOBJP bit 7 set); fill it. No dead slot → `RTS` with no spawn — a hard cap of NCENT (12) live segments. The spawn only ever backfills a vacated slot; it never grows the population.

**The spawn (CT-80/81/82/83/84/85/86):** pic `MOBJP=0x00` (a plain head, NOT CENTPC's 0x03); `MOBJV=0x40` (down in the player zone, EOR CKF8 no-op upright); `MOBJDV=+2` ("NEW BUG GOES FAST"). Side from ONE RNGEN read masked to bit 1 (`LDA RNGEN / AND I,02 / BNE 30$`): **bit set → (H=0xFC, dh=+2)**; **bit clear → (H=0x04, dh=-2)** — symmetric mirror edges. `INC DEAD` — the fresh head raises the live-segment count, so the wave (DEAD==0, CT-62/63) cannot close until every factory head is also killed. The fresh head then rides the SAME unified descent + CT-72/73 bounce as the train (it is just another live head in `segs`); it is contained and killable via the existing `resolveShotHit`/`checkPlayerContact`.

**Wave-end interaction (CT-62/71):** the wave clears the instant the LAST live segment dies. The ROM guarantees the factory can't reopen it because SHOOT arms DELAY at DEAD==0 BEFORE NEWHD's DELAY gate — so no spawn on the clearing frame. This is the ordering constraint captured in Delivery Finding #1.

### New claims (machine-extracted from the vendored tree, byte-verified — 220/220)
CT-78 (COUNT1 down-counter), CT-79 (dead-slot backfill + NCENT cap), CT-80 (head pic 0x00), CT-81 (spawn V=0x40), CT-82 (spawn dv=+2), CT-83 (default H=0xFC), CT-84 (RNGEN AND 0x02 side select), CT-85 (mirror H=0x04/dh=-2), CT-86 (INC DEAD), CT-87 (COUNT3 −8 ramp, 0x60 floor), CT-88 (COUNT init 0xC0), CT-89 (only a plain head arms NEWD), CT-90 (CENTPC clears NEWD), CT-91 (respawn reloads COUNT1 from persisted COUNT3).

### Test file (1 new)
- `tests/newhd-factory.test.ts` — **13 tests (10 RED + 3 controls)**:
  - AC-1: createSim boots the factory disarmed (newd=false, COUNT1/COUNT3=0xC0, CT-88/90); NEWD arms when a plain head reaches the bottom (CT-23/89); a fresh head backfills a dead slot at pic 0x00 / V=0x40 / dv=+2 on a mirror side (CT-79/80/81/82/83/84/85); the HIGHEST-index dead slot is filled first (CT-79); **[control]** no spawn while all 12 slots are live (CT-79 cap).
  - AC-2: same seed → identical side schedule (≥2 spawns, non-vacuous); cloneState mid-schedule reproduces the remaining schedule (rng + counters deep-copied); both mirror edges appear across 64 fixed seeds (anti-hardcode, deterministic); idle frames draw no entropy while a spawn advances `rng.seed` (no ambient randomness).
  - AC-3: a live factory head keeps the wave open, then clearing every live segment re-enters the wave + disarms NEWD (CT-62/86/90); a spawned factory head rides the CT-72/73 containment bounce and stays killable; **[control]** an armed, due factory does NOT reopen a clearing wave (CT-71 DELAY gate); **[control]** the factory is gated off during the death pause.

**Tests Written:** 13 (10 RED + 3 controls) covering AC-1/AC-2/AC-3. AC-4 (demo evidence from this checkout) is Dev's — noted only.

**Status:** RED — `Test Files 1 failed | 32 passed (33)` · `Tests 10 failed | 410 passed (420)`. The 1 failed file is exactly `newhd-factory.test.ts`; all 32 baseline files (407 tests) stay green. The 3 controls pass now and MUST stay green (regression guards). `npx tsc --noEmit` clean. `node tools/audit/check-citations.mjs` → **220/220 verified** (206 + CT-78..CT-91).

### The Dev contract (build in GREEN)
1. `src/core/centipede.ts`: constants `NEWHD_HEAD_PIC=0x00` (CT-80), `NEWHD_SPAWN_V=0x40` (CT-81), `NEWHD_SPAWN_DV=2` (CT-82), `NEWHD_SIDE_A_H=0xFC`/`NEWHD_SIDE_A_DH=2` (CT-83/84), `NEWHD_SIDE_B_H=0x04`/`NEWHD_SIDE_B_DH=-2` (CT-85), `NEWHD_COUNT_INIT=0xC0` (CT-88), `NEWHD_COUNT3_STEP=8`/`NEWHD_COUNT3_FLOOR=0x60` (CT-87). The tests use ROM literals directly, so the export names are Dev's choice — but the spawned segment's values are pinned exactly.
2. `src/core/sim.ts`: extend `SimState` with `newd: boolean`, `count1: number`, `count3: number`. `createSim` seeds `newd=false`, `count1=count3=NEWHD_COUNT_INIT`. Add a pure `stepNewhd(state): SimState` consuming `state.rng` (draw ONCE per spawn — e.g. `nextInt(rng, 2)` — to pick the side; both edges must be reachable). Wire it into `stepPlayingFrame`: after `stepCentipede`, ARM `newd` if a live plain head is at `v <= CENT_BOTTOM_V`; then **evaluate the wave-clear (DEAD==0) FIRST** and only run `stepNewhd` on a fully-normal frame (not a death frame, not a clearing frame) — the DELAY/wave-clear must gate the spawn (Delivery Finding #1) or the wave becomes unclearable. `stepNewhd`: while `newd && delay==0`, if `count1>0` decrement it; at `count1==0` scan slots 11..0 for the first vacant (`pic & 0x80`), fill it (pic 0x00, v 0x40, dv 2, side from the rng draw), ramp COUNT3 (−8 while ≥0x60), reset `count1=count3`; no vacant slot → leave `count1=0` (retry next frame), no rng draw. Clear `newd=false` on wave re-lay (createCentipede). `cloneState` must deep-copy `newd`/`count1`/`count3`.
3. Cite CT-78..CT-91 on the new constants/mechanism (already added to `docs/rom-study/claims/09-centipede-train.json`).
4. Keep the core pure — the seeded `state.rng` is the ONLY entropy (purity guard auto-binds; no Math.random, comments included). NEWHD spawning is shell-free.

**Purity:** `stepNewhd`/the factory state stay in `src/core/`; the sole entropy is `state.rng` (mulberry32, `@arcade/shared/rng`), pinned deterministic + clone-replayable by the AC-2 tests.

**Handoff:** To Dev (Julia) for GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/centipede.ts` — NEWHD constants: `NEWD_ARM_PIC_MAX` (CT-89), `NEWHD_HEAD_PIC` (CT-80), `NEWHD_SPAWN_V` (CT-81), `NEWHD_SPAWN_DV` (CT-82), `NEWHD_SIDE_A_H`/`NEWHD_SIDE_A_DH` (CT-83/84), `NEWHD_SIDE_B_H`/`NEWHD_SIDE_B_DH` (CT-85), `NEWHD_COUNT_INIT` (CT-88), `NEWHD_COUNT3_STEP`/`NEWHD_COUNT3_FLOOR` (CT-87).
- `src/core/sim.ts` — `SimState` extended with `newd`/`count1`/`count3`; `createSim` seeds them disarmed/0xC0; new pure `stepNewhd` (count-down → slot scan 11..0 → spawn with a single `nextInt(rng, 2)` side draw → COUNT3 ramp/floor → COUNT1 reload); `stepPlayingFrame` arms `newd` off a live plain head (`pic < 0x10`) at the bottom row, then runs the death-contact check, THEN the wave-clear check, and only THEN `stepNewhd` — the wave-clear/death branches never see a post-spawn array; both `createCentipede()` re-lay sites (death-respawn, wave-clear) in `stepDeathFrame` now clear `newd`; `cloneState` deep-copies all three new fields.
- `tests/newhd-factory.test.ts` — one test-construction fix (see Delivery Findings / Design Deviations below): the first AC-3 test's all-12-vacant starting `segs` was mathematically incompatible with the wave-clear-before-spawn ordering the sibling CONTROL pins; rebuilt to the file's own established "one live decoy + N vacant" idiom and swapped its spawn-detection assertion to `factoryHeadAt40`. No assertion intent changed.

**Wave-clear ordering (Delivery Finding #1):** `stepPlayingFrame` computes `segs`/`newd` once after `stepCentipede`/`stepExplosions`, then evaluates `checkPlayerContact` and the `segs.every(vacant)` wave-clear test — both early-return before `stepNewhd` is ever called. `stepNewhd` only runs on the leftover "fully normal" path. Verified against the CONTROL ("an armed, due factory does NOT reopen a clearing wave") and the pinned cp2-5 wave-loop test, both of which directly mutate `segs` to all-dead and rely on the very next frame closing the wave without any factory interference.

**Tests:** 420/420 passing (GREEN). `npx tsc --noEmit` clean. `node tools/audit/check-citations.mjs` → 220/220 verified (citations check the claims JSON against the vendored ROM tree, not game source, so no re-anchoring was needed).

**Branch:** `feat/cp2-10-newhd-head-factory` (pushed: no — per instructions, commit only, no push/PR).

**Handoff:** To Reviewer (Thought Police) for the review phase.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | Gates re-run independently: tests 420/420, tsc clean, citations 220/220, purity 17/17, tree clean | CONFIRMED — matches my own re-run; no reported-number trust needed |
| 2 | reviewer-edge-hunter | Yes | findings | 3 LOW: no `segs.length===NCENT` assertion (unreachable); 0x60→0x58 floor untested; no negative arm test. Confirmed byte-exact fidelity, single rng draw/spawn, both re-lay branches clear newd, correct 3-path ordering | CONFIRMED — floor+arm-negative folded into F3/F4; length-assertion → LOW (accepted as implicit) |
| 3 | reviewer-test-analyzer | Yes | findings | Mutation-tested. 1 tautological assertion (:352-357, HIGH conf); missing coverage for ramp/arm-exclusion/death-respawn-disarm; controls verified surgical; AC-2 determinism non-vacuous; factoryHeadAt40 sound (decoy can't reach 0x40) | CONFIRMED — tautology reproduced independently (F2); coverage gaps → F3/F4/F5; controls & determinism dismissed as sound |
| 4 | reviewer-comment-analyzer | Yes | findings | CT-91 prose over-generalizes 2-player-only reload as "respawn" (HIGH conf, same ROM trace I ran); CT-87 "floors at 0x60" cosmetic; CT-78..CT-90 + all code comments accurate | CONFIRMED — CT-91 → F1 (blocking-for-finish docs fix); CT-87 wording → LOW |

**All received: Yes** — all four specialists returned and are consistent with my independent ROM verification against `reference/atari-source/centipede/revision.v4/CENTI4.MAC`.

## Reviewer Assessment

**Verdict:** APPROVED

The NEWHD head factory is a byte-exact-faithful, seeded-deterministic port of CENTI4.MAC:1643-1687. No Critical or High code defects. All findings are MEDIUM/LOW (citation prose, test-coverage/quality, and the AC-4 demo artifact) — none is a correctness bug in the shipped simulation. Approving the implementation with the follow-ups below tracked for finish.

**Gates re-run independently (not trusting reported numbers):**
- `npm test` → **420 passed (420)** across 33 files.
- `npx tsc --noEmit` → clean.
- `node tools/audit/check-citations.mjs` → **220/220 verified** ("all claims verified").
- purity suite (`tests/purity.test.ts`) → **17/17 passed**; grep of the new `src/core` diff (comments included) → no `Math.random`/`window.`/`document.`/`canvas`/`Date.now`/`performance.now`.
- working tree clean; branch `feat/cp2-10-newhd-head-factory` @ `3312dde` off `origin/develop` tip `459f380`. Not raced — no cp2-10 on `origin/develop`.

**Data flow traced:** `seed` → `createSim` (rng seeded; `newd=false`, `count1=count3=0xC0`, CT-88/90) → `stepPlayingFrame` arms `newd` off a live plain head (`pic<0x10`) at `v<=CENT_BOTTOM_V` (CT-23/89, ROM :1305-1310 `CMP I,9`/`CMP I,10`) → on the fully-normal path only, `stepNewhd` draws `state.rng` **exactly once** per successful spawn (`nextInt(rng,2)`), never on idle/no-slot/disarmed frames → fresh head written into the first dead slot scanning 11..0 at `pic 0x00 / v 0x40 / dv +2` with mirror side `(0xFC,+2)`/`(0x04,-2)` (CT-79..85) → rendered by the existing cp1/cp2-5 shell (a factory head is just another `segs` entry). The seeded mulberry32 rng is the sole entropy, threaded through state and clone-replayable (AC-2 clone test green).

**Wiring:** `stepNewhd` is correctly gated — it runs ONLY after both the `checkPlayerContact` and the `segs.every(vacant)` wave-clear early-returns (sim.ts:176-205), so neither the death branch nor the clearing branch ever sees a post-spawn array (Delivery Finding #1). Verified against the ROM: SHOOT (mainloop :34) arms `DELAY` on DEAD==0 at CENTI4.MAC:2319 BEFORE NEWHD (:35) hits its `LDA DELAY / BNE` gate (:1649-1650) — wave-clear-before-spawn is the faithful ordering. `stepSim` also never invokes `stepNewhd` while `delay>0` (routes to `stepDeathFrame`), so COUNT1 is frozen during the pause exactly as the ROM's DELAY gate freezes it.

**Pattern observed:** `cloneState` follows the codebase's explicit-field-enumeration idiom (no spread) and Dev correctly added all three new fields (sim.ts:312-314); both `stepDeathFrame` re-lay branches clear `newd` and preserve `count1`/`count3` (sim.ts:264-266 death-respawn enumerates all 16 fields; :280 wave-clear spreads `...state`+`newd:false`) — matching the ROM (1-player respawn `70$`→`80$`→CENTPC and wave-clear `40$`→`90$`→CENTPC both leave COUNT1/COUNT3 untouched, only clear NEWD).

**Error handling / edges:** pure core, no I/O. No-vacant-slot → no-op, no rng draw, `count1` left at 0 to retry (CT-79 cap, ROM `RTS`); disarmed/`count1>0` → early no-op. `segs` is fixed-length via `createCentipede`; game-over short-circuits in `stepSim`. No null/NaN surface.

### Special-scrutiny resolutions

**1. Dev's modification of the TEA-authored RED test — LEGITIMATE (accepted).**
- (a) `git diff 776f272 3312dde -- tests/newhd-factory.test.ts` is exactly 42 lines touching ONLY the "a live factory head keeps the wave open" test: setup all-12-vacant → `[live decoy v=0x20 pic 0x03] + 11 vacant`; detection `findIndex(isLiveHead)` → `factoryHeadAt40`. Matches Dev's description precisely.
- (b) The original setup is genuinely unsatisfiable under ROM-correct ordering: with all 12 slots dead at t=0, `segs.every(vacant)` trips on frame 0 → `delay=WAVE_DELAY=0x40=64` (> the 20-frame budget), `stepNewhd` never runs, `findIndex(isLiveHead)` stays −1 → the assertion fails/times out. Not a Dev weakening a test to dodge a defect — a real test-construction bug.
- (c) The modified test is non-vacuous: `factoryHeadAt40` requires a live head at exactly `v=0x40`, which only a factory spawn produces (decoy sits at 0x20 below the 0x30 bounce band and provably can never ascend to 0x40; train enters at 0xF8) — so it fails if the factory never spawns OR spawns at wrong coords. (Minor: the "wave stays open" assertion is also satisfied by the decoy, so it doesn't isolate the factory head's contribution — but spawn-detection + the full-clear re-entry + `newd`-disarm assertions carry the AC.)
- (d) ROM confirms wave-clear-before-spawn (see Wiring above). The two CONTROLs are byte-identical between RED and GREEN (line shifts 359→365 / 379→385 are purely from the comment growth in the one edited test above them); mutation testing by the test-analyzer confirms all three controls fail under precisely their guarded regression and nothing else.

**2. CT-91 citation prose — CONFIRMED misdescribed (MEDIUM, non-blocking).**
Independently re-traced CENTI4.MAC:595-745: the `LDA X,COUNT3-1 / STA COUNT1` at :697-698 (`738$`) is reached ONLY via the 2-player/cocktail player-swap (`70$`:658 → `BNE 71$` → `73$` → `738$`); a 1-player game takes `70$`→`JMP 80$`:661 and never reloads COUNT1 (CENTPC only clears NEWD). The claim's byte-verified quote and its load-bearing invariant (COUNT3 persists across lives/waves, reset only by INIT) are ACCURATE — only the "On respawn" framing over-generalizes a 2-player-only path. The gate is green legitimately (it verifies quotes, not prose). The shipped code is correct (Dev did NOT implement a generic reload; sim.ts:265 comment is right). Dev documented the correction in the session but never carried it into the dossier, so `docs/rom-study/claims/09-centipede-train.json` CT-91 (claim + corroboration note) still misstates the trigger. Not blocking (no shipped code is wrong; quote+invariant accurate), but the claim should be rewritten before finish — a docs-only edit that keeps the gate green.

### Findings

| Severity | Issue | Location | Recommended action |
|----------|-------|----------|--------------------|
| [MEDIUM] | CT-91 claim + corroboration prose over-generalizes a 2-player-only COUNT1 reload as generic "on respawn" (quote & persist-invariant accurate) | `docs/rom-study/claims/09-centipede-train.json` CT-91 | Rewrite prose to scope the reload to the player-swap path; gate stays green |
| [MEDIUM] | Tautological assertion — re-tests its own filter predicate (`v<=CENT_BOUNCE_TOP_V`), so AC-3 "rides the bounce containment" is unpinned for factory heads (mutation-proved) | `tests/newhd-factory.test.ts:352-357` | Assert vs an independently-derived max-v, not the filter |
| [MEDIUM] | CT-87 ramp/floor (`0x60`→`0x58`) has zero behavioral coverage — every scenario seeds `count3<0x60` | `tests/newhd-factory.test.ts` / `sim.ts:141` | Add a ramp test from `count3>=0x60` asserting `-8`/step + terminal 0x58 |
| [MEDIUM] | CT-89 arm-exclusion has no negative test (poisoned head 0x2x / body 0x4x at bottom must NOT arm) | `tests/newhd-factory.test.ts` / `sim.ts:174` | Add a negative arm test |
| [MEDIUM] | CT-90 death-respawn disarm branch untested (only the wave-clear branch is) | `tests/newhd-factory.test.ts` / `sim.ts:264` | Add a death-respawn-with-lives test asserting `newd=false` |
| [MEDIUM] | AC-4 (demo evidence from this checkout) unmet — no screenshot/sequence committed | branch / finish | Capture a bottom-camping demo (likely a HUMAN smoke test) or user-waive AC-4 |
| [LOW] | No end-to-end arm→spawn integration test (all scenarios inject `newd:true` directly) | `tests/newhd-factory.test.ts:92` | Add one full `stepSim` walk from `createSim` |
| [LOW] | Stale RED-phase `SimExt`/`ext`/`withFactory` scaffolding + header comments (SimState now declares all fields natively) | `tests/newhd-factory.test.ts:55-78` | Trim in a follow-up |
| [LOW] | CT-87 prose "floors at 0x60" slightly overstates precision (settles as low as 0x58); code byte-faithful | `docs/rom-study/claims/...` CT-87 / `centipede.ts:16` | Optional wording tweak |
| [LOW] | Slot scan has no `segs.length===NCENT` assertion (unreachable; implicit invariant) | `sim.ts:126` | Accept as intentionally implicit |

**Deviation audit:** all six logged deviations (TEA ×5: SimState shape, pic 0x00, direct count injection, 64-seed set-equality, AC-3 two-form; Dev ×1: AC-3 test rebuild) reviewed and **ACCEPTED** — each verified faithful/sound against the ROM and the pinned cp2-5 baselines. No undocumented deviations found.

**Observations (5+):** (1) fidelity byte-exact across NEWHD/arm/INIT/CENTPC — verified against CENTI4.MAC directly; (2) determinism sound — single rng draw per spawn, clone-replayable, no ambient entropy; (3) wave-clear-before-spawn ordering faithful and correctly gated on all 3 return paths; (4) the RED-test modification is a legitimate construction fix, not a weakening; (5) CT-91 prose is the one real fidelity-dossier defect (docs-only); (6) a cluster of byte-cited mechanisms (ramp/arm-exclusion/death-respawn-disarm) are correct-by-construction but behaviorally untested, and one AC-3 assertion is tautological — test-hardening opportunities, not current bugs.

**Handoff:** To SM for finish-story. Before archiving, address MEDIUM items — especially rewrite CT-91 prose (F1) and fix the tautological assertion (F2), and resolve AC-4 (F6: capture demo evidence or obtain a user waiver). The ramp/arm/death-respawn coverage gaps (F3-F5) are recommended hardening. Do NOT merge/finish without user authorization (AI-authored + AI-reviewed PR — self-approval gate applies).

## Rework Assessment

**Phase:** finish-phase review rework (O'Brien / TEA). Verdict stands APPROVED — this is docs/test hardening only, no re-review, no phase/handoff change.

**Per-finding disposition:**
- **F1 (MEDIUM, required) — DONE.** Rewrote CT-91 claim + corroboration prose in `docs/rom-study/claims/09-centipede-train.json`: the `LDA X,COUNT3-1 / STA COUNT1` reload (:697-698, `738$`) is now scoped to the 2-player/cocktail player-SWAP path (`70$`→`BNE 71$`→`73$`→`738$`); the 1-player path (`70$`→`JMP 80$`, CENTPC clears only NEWD) reloads nothing, so single-player COUNT1/COUNT3 PERSIST and only INIT reseeds them. `source.verbatim` untouched (gate verifies the quote, not the prose).
- **F2 (MEDIUM, required) — DONE.** Replaced the tautological `zoneHeads` block (old `tests/newhd-factory.test.ts:352-357`) with a real, mutation-proof pin: spawns ONE factory head, tracks its slot under `stepCentipede` directly (the cp2-5 `sim-assembly.test.ts` idiom — no player, so no gun collision), and once it descends into the band asserts it stays within LOCAL literals `[0x08, 0x30]` (cited to CT-72/73, NOT the imported constants) with sawFloor/sawCeiling non-vacuity guards. Mutation-verified: FAILS under `CENT_BOUNCE_TOP_V` 0x30→0x90.
- **F3 (MEDIUM, recommended) — DONE.** New CT-87 ramp test: seeds count3=0x68, drives successive spawns, asserts COUNT3 steps −8 while ≥0x60 down to the terminal 0x58 then holds (`[0x60, 0x58, 0x58]`), with COUNT1 reloaded from the post-decrement COUNT3 each spawn.
- **F4 (MEDIUM, recommended) — DONE.** New CT-89 arm-exclusion block (3 tests): a plain head (pic<0x10) arms (positive control, proves the harness can arm); a lone body (0x42) at the bottom never arms; a still-poisoned head (0x22) at the bottom does not arm. Mutation-verified: both negatives FAIL under `NEWD_ARM_PIC_MAX` 0x10→0x50. (Uncovered the poison-clear-then-arm nuance — logged as a cp3 Delivery Finding.)
- **F5 (MEDIUM, recommended) — DONE.** New CT-90/91 death-respawn test: drives a REAL death (head on the gun) → respawn and asserts `newd===false` on the `stepDeathFrame` respawn branch (`sim.ts:264`, previously untested) while COUNT1/COUNT3 persist their ramped values (CT-91 single-player persistence).
- **F8 (LOW, optional) — SKIPPED.** `SimExt` / `ext` / `withFactory` (`tests/newhd-factory.test.ts:55-78`) are NOT dead — every existing test AND all four new tests use them, and the rework rules forbid touching the other existing tests. Removing the scaffold would force rewriting them. The header-comment is mildly stale but load-bearing scaffolding stays.
- **F9 (LOW) — DONE.** Corrected CT-87 prose (`09-centipede-train.json`) from "floors at 0x60" to: the guard is `>=0x60`, 0x60 itself still steps, so COUNT3 SETTLES at 0x58. Matching comment tweak on `src/core/centipede.ts:362` (`NEWHD_COUNT3_FLOOR`) — comment-only, byte-faithful, the sole permitted src touch.

**Gates (from `/Users/slabgorb/Projects/a-1/centipede`):**
- `npm test` (`npx vitest run`) → **425 passed (425)** across 33 files (420 baseline + 5 new: F3×1, F4×3, F5×1).
- `npx tsc --noEmit` → clean (exit 0).
- `node tools/audit/check-citations.mjs` → **220/220 verified** ("all claims verified").
- `npx vitest run tests/purity.test.ts` → **17/17 passed**.

**Scope:** 3 files — `docs/rom-study/claims/09-centipede-train.json` (CT-91 + CT-87 prose), `src/core/centipede.ts` (1 comment line), `tests/newhd-factory.test.ts` (F2 replacement + F3/F4/F5). The 3 control tests and every other existing assertion are untouched. No push, no PR, no merge, no completion marker.

**New findings:** the poison-clear-then-arm interaction (CT-24 × CT-89), logged under Delivery Findings → TEA (review rework), routed non-blocking to cp3/poison. No blocking findings — the implementation is byte-faithful; every hardening test passes against it.
## Finish Notes (SM)

- **AC-4 (demo evidence): WAIVED by the user** (2026-07-19) in lieu of a human smoke test — recorded in the PR body. Reviewer finding F6 resolved by waiver.
- Branch `feat/cp2-10-newhd-head-factory` pushed to origin; **PR centipede#16** open against `develop` at `855c9e5` (RED `776f272` + GREEN `3312dde` + rework `855c9e5`).
- Post-review rework applied (F1-F5, F9 done; F8 skipped — scaffold still in use): gates at 425/425 tests, tsc clean, citations 220/220, purity 17/17.
- **Merge + `pf sprint story finish` pending explicit user authorization** (AI-authored + AI-reviewed → self-approval gate).
