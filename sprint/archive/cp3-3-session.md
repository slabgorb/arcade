---
story_id: "cp3-3"
jira_key: "cp3-3"
epic: "cp3"
workflow: "tdd"
---
# Story cp3-3: The scorpion (SCORP) — horizontal crossing, poison creation LIVE, dive activation; the ecosystem demo

## Story Details
- **ID:** cp3-3
- **Jira Key:** cp3-3
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T23:28:04Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T22:21:38Z | 2026-07-20T22:23:19Z | 1m 41s |
| red | 2026-07-20T22:23:19Z | 2026-07-20T22:52:40Z | 29m 21s |
| green | 2026-07-20T22:52:40Z | 2026-07-20T23:17:37Z | 24m 57s |
| review | 2026-07-20T23:17:37Z | 2026-07-20T23:28:04Z | 10m 27s |
| finish | 2026-07-20T23:28:04Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### SM (setup) — Pre-Extracted from cp3-2

**Pre-extracted quarry for cp3-3 (the scorpion), per project TEA convention:**

- **SCORP routine location:** `CENTI4.MAC:2001-2097`, mainloop slot `:36` (BEFORE ANTMV at `:37`). Picture band 0x30-0x33 (`:2026-2028`), cycling **+1** every 4 frames (`:2077-2086 ADC I,01 / AND I,03 / ORA I,30`) — a genuine +1, UNLIKE the flea's +2.

- **Spawn conditions (all):** the flea slot is PARKED (`ANTV >= 0xF8`, `:2009-2012`), `FRAME == 0` (`:2013-2014`), `CENTIN < 11.` DECIMAL (`:2017-2020 CMP I,11.` — **11**, one lower than the flea's 12), and `RNGEN & 3 == 0` (`:2021-2023`). Sound `CHAN6 = 20.` decimal (`:2024-2025`).

- **Entry:** `ANTH = 0` (edge, `:2046-2047`), `ANTDV = 0` (`:2048`), `ANTV = (RNGEN & 0x78) + 0x70` — upper half of the screen (`:2049-2054`). Speed ±1 below 20,000 (`SCORE2 < 2`), else a 1-in-4 re-roll for slow over ±2 (`:2029-2044`); direction off `RNGEN` bit 7.

- **Poisoning (the epic's "poison goes LIVE"):** `OBSTAC` at `ANTV`, and a cell in `[0x3C, 0x40)` is poisoned by `AND I,0FB` (`:2087-2096`) — clearing bit 2 maps 0x3C-0x3F onto the 0x38-0x3B poison band, corroborating cp1-4's PM-19.

- **Kill:** **one hit, 1000 points** (`:2226-2228` — H window `CPY I,10.` DECIMAL, `LDY I,10` → `SCORN1`). It goes straight to `18$`; there is no two-hit path like the flea's.

- **Off-screen (`ANTH` wraps to 0):** `58$ JMP ANTPC` (`:2069-2075`), the same re-park cp3-2 builds.

**CRITICAL SLOT ARCHITECTURE (from cp3-2 TEA findings):**

- **Slot 12 is SHARED between the flea and the scorpion** — they are one motion-object slot distinguished only by picture band (flea 0x1C-0x1F, scorpion 0x30-0x33), and every routine touching it gates on that band. cp3-3 must therefore CLAIM this slot rather than add a second object, which likely means generalizing cp3-2's `Flea` type or having both creatures share one slot-12 state — **do NOT design a parallel object** or it will silently break `ANTMV`'s `:53-56` gate.

- **cp3-2 already ported SCORP's flea-revival half** (`:2072-2075`); **cp3-3 owns the REST of SCORP** (the scorpion-start branch). cp3-2's flea.test.ts ordering/explosion tests may move with this story if the two halves are split.

- **SCORP writes the same ANTDV byte from the same shared slot;** first-hit speed-up applies on the SAME frame as the hit (SHOOT stores `ANTDV=4` at `:2223`; ANTMV subtracts it at `:102` three mainloop calls later, so the speed acceleration happens that very frame).

**OPEN QUESTION 4 FLAGGED:**

- **Scorpion 1000 points is `:2228 LDY I,10`;** CENTIP.DOC:116 rev-1 prose says 1000 too — diff/record per the story's own AC-3 (same discipline as cp3-1's spider and cp3-2's flea).

**FLEA-RENDER GAP (from cp3-2 Dev, NON-BLOCKING THERE):**

- **Nothing in src/shell/render.ts DRAWS the flea** — it descends, seeds mushrooms and kills the player INVISIBLY. cp3-3's "complete ecosystem" demo CANNOT be captured with an invisible creature on screen, so the flea render branch **must land AT OR BEFORE this story.** The work is small (near-mirror of spiderStamp: `ANT${pic-0x1C}`, one blit guarded on live band pic<0x20). Note this in the technical approach as **demo-blocking scope for cp3-3**; whether it lands in cp3-3 itself or as a quick companion story (cp3-4 per the epic) is for TEA to decide per the delivery timeline.

### TEA (test design)

- **Improvement** (non-blocking): the **FLEA-RENDER GAP above is already CLOSED** — cp3-4 (done, centipede#29 lineage) shipped `fleaStamp` + the slot-12 flea draw branch, and `render.ts` explicitly defers the scorpion ("cp3-3's scorpion will arrive in this same slot on pictures 0x30-0x33 and gets its own branch then"). So cp3-3 carries only the SCORPION half of the demo blocker: `scorpionStamp` (0x30-0x33 → SCORP0-3, sprites already baked at pictures.ts:313-316) + one draw branch. Affects `centipede/src/shell/render.ts`. *Found by TEA during test design.*

- **Improvement** (non-blocking): **open-questions.md + claims/13-scorpion.json are Dev/GREEN work AC-1 depends on.** Dev must (1) add the cp3-3 open-question-4 entry — CENTIP.DOC:116 "scorpion 1000" **AGREES** with rev-4 (`:2228 LDY I,10` = HEX 0x10, BCD-reads as 1000; H window `:2226 CPY I,10.` is DECIMAL 10) → **no divergence**, same as spider (entry 8) and flea (entry 9); and (2) author `docs/rom-study/claims/13-scorpion.json` (SC-*) so the citation gate stays green. Affects `centipede/docs/rom-study/`. *Found by TEA during test design.*

- **Question** (non-blocking): a **1-frame revival→spawn coincidence** the port cannot avoid without threading state. `stepFleaExplosion` re-parks the spent slot (0xF9→createFlea, pic 0x1C) the SAME frame; `stepScorp` (SCORP :36) then runs and — IF `frame&0xFF==0 && centin<11 && rng&3==0` all coincide (~1/256 × wave-2 × 1/4) — could spawn a scorpion into the just-revived slot. The ROM's SCORP takes 55$ → `JMP ANTPC` and does NOT fall through to the spawn check that frame, so it cannot. Negligible gameplay impact (a scorpion one frame "early" on a vanishingly rare alignment); flagged for Reviewer awareness. Affects `centipede/src/core/scorpion.ts` (spawn branch) + the sim's flea-block ordering. *Found by TEA during test design.*

- **Improvement** (non-blocking): the **ecosystem demo (AC-4) needs a debug spawn path.** A scorpion's natural spawn only attempts once every 256 frames AND only from wave 2 (centin<11), so it is rare in ordinary play — per the epic's wave-gating ruling the demo FORCES all three creatures via debug seeding on 5278. Dev owns the demo capture; the port-ownership trap applies (lsof the server's cwd or serve a spare port). Affects the demo harness / `centipede` dev build. *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the **RNG-shift risk from wiring stepScorp into the sim did NOT materialise** — the full 783-test suite stays green because `stepScorp` draws NO rng unless its spawn gate is fully reached (parked slot ∧ `frame & 0xFF == 0` ∧ `centin < 11`), which no existing fixture hits (wave 1 keeps `centin == 12`; short runs never reach frame 256). The gates-first ordering is pinned by the "consumes NO rng before its gates are decided" test. Confirms the epic's wave-gating ruling keeps the scorpion inert until cp4 advances the wave. Affects `centipede/src/core/sim.ts` (the flea/slot-12 block). *Found by Dev during implementation.*

- **No other upstream findings during implementation.**

### Reviewer (review)

- **Improvement** (non-blocking): a **19-mutation battery closed 3 test-quality gaps** the disabled test-analyzer would otherwise own — the spawn-rate guard, the isScorpion shot gate (staged out of window), and the post-move-h poison (dh=0 hid it). All CODE was correct; the tests are now hardened (commit a27f63a). One **Low** gap remains recorded: the direction-sign bit-7 mapping is a symmetric coin pinned only as "both directions occur", faithful in code but not seed-pinned. Affects `centipede/tests/scorpion.test.ts`. *Found by Reviewer during review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **SCORP's player-dead re-park (:2055-2057) is NOT pinned on stepScorp — it is subsumed by the sim's death flow.**
  - Spec source: context-story-cp3-3.md, AC-3 ("player-contact behaviour matches what the code says, transcribed not assumed")
  - Spec text: SCORP :2055-2057 "LDA PLAYP / AND I,0AF / BNE 58$" re-parks the scorpion when the player is dead/dying.
  - Implementation: no PLAYP parameter on stepScorp. The player-contact suite pins EXCLUSION (a scorpion on the gun is harmless, because the only slot-12 JSR PLAY is in ANTMV :108, which pic>=0x20 never reaches). The PLAYP re-park is left to the sim: stepDeathFrame does not call stepScorp during the death pause (slot 12 frozen) and re-parks the slot via createFlea on respawn (:451).
  - Rationale: same routing cp3-2 used for the flea's PLAY (:107-108) — one death path, never duplicated. A PLAYP param would re-implement a branch the sim already owns.
  - Severity: minor
  - Forward impact: Dev must NOT add a PLAYP/playerExplode parameter to stepScorp.
  - **Reviewer audit:** → ✓ ACCEPTED — verified `stepDeathFrame` never calls `stepScorp` (slot 12 frozen during the pause) and `createFlea` re-parks the slot on respawn (`sim.ts:451`); the player-contact EXCLUSION is mutation-confirmed. Faithful routing, no PLAYP param needed.

- **The scorpion's explosion + revival is pinned through the EXISTING stepFleaExplosion, not a new scorpion routine.**
  - Spec source: context-story-cp3-3.md, AC-3 (shot-vs-scorpion kill) + epic-cp3 SLOT MODEL
  - Spec text: SHOOT stamps 0xFF on a killed scorpion (:2301-2302); EXPLOD (:963-970) + SCORP's 55$ (:2072-2075) count it down and re-park via ANTPC.
  - Implementation: resolveScorpionShotHit returns pic 0xFF; the revival is tested through cp3-2's stepFleaExplosion (which already carries SCORP :2072-2075). stepScorp writes NO explosion code — its pic>=0x34 case is a no-op.
  - Rationale: the explosion picture and revival are byte-identical to the flea's shared-slot behaviour; duplicating them would risk the two paths diverging.
  - Severity: minor
  - Forward impact: Dev writes no scorpion explosion code; the "killed scorpion comes back" test exercises stepFleaExplosion unchanged.
  - **Reviewer audit:** → ✓ ACCEPTED — verified `resolveScorpionShotHit` returns pic 0xFF and `stepScorp`'s `pic >= 0x34` case is a no-op; the shared `stepFleaExplosion` (0xFF→0xF9→createFlea) revives the slot. The `explode pic 0xFF->0xFE` mutation was CAUGHT, confirming the shared explosion path is pinned. No duplicated code.

- **The FRAME==0 spawn gate is modelled as `(frame & 0xFF) === 0`.**
  - Spec source: epic-cp3 wave-gating ruling; SCORP :2013-2014
  - Spec text: ":2013 LDA FRAME / BEQ 4$" — FRAME is a 2-byte counter (CENDE4.MAC:125 "FRAME: .BLKB 2"); the read is its LOW byte.
  - Implementation: the spawn tests drive frame values whose low byte is 0 (0, 256) vs non-zero, pinning `(frame & 0xFF) === 0`. SimState.frame is a monotonic number, so the low byte is `frame & 0xFF`.
  - Rationale: faithful reading of a byte load off a 2-byte counter; mirrors how the flea reads `frame & 3` for its cadence.
  - Severity: minor
  - Forward impact: a scorpion's natural spawn only attempts once every 256 frames (and only from wave 2, centin<11) — the ecosystem demo forces spawns via debug seeding per the epic ruling.
  - **Reviewer audit:** → ✓ ACCEPTED — a faithful low-byte read of the 2-byte FRAME counter (`.BLKB 2`), consistent with the flea's `frame & 3` cadence; the frame gate and the 1-in-4 rng gate are both mutation-confirmed. Matches the epic's wave-gating ruling.

### Dev (implementation)

- **Shell-only `?demo=ecosystem|flea` frozen-frame seed for the AC-4 artifact.**
  - Spec source: context-story-cp3-3.md, AC-4 ("Demo artifact committed … showing the complete ecosystem"); epic-cp3 wave-gating ruling ("the demo forces spawns via debug seeding").
  - Spec text: the demo must show train + spider + flea + scorpion + a poisoned dive with upright sprites, captured from THIS checkout.
  - Implementation: added `src/shell/demo.ts` (`buildDemo`) + a `?demo=` parse in `src/main.ts` that composes a SimState, warms it up a few REAL sim frames (so the scorpion genuinely poisons and a head genuinely dives), then FREEZES it (the frame loop stops stepping). The flea and scorpion share slot 12, so two frames were captured — `cp3-3-demo-ecosystem.png` (scorpion + poison trail + dive + spider + train) and `cp3-3-demo-flea.png` (the flea).
  - Rationale: identical class to cp2-13's `?wave=N` shell-only debug seed (TEA ruling) — the pure `src/core/` stays debug-free (purity scanner green); all staging lives in the shell.
  - Severity: minor
  - Forward impact: a future self-playing ATTRT demo (cp4-7) would supersede manual demo seeding; the `?demo` hook is a capture aid, not gameplay.
  - **Reviewer audit:** → ✓ ACCEPTED — `src/shell/demo.ts` is shell-domain (purity scanner green on `src/core`), inert without the query param, and mirrors cp2-13's documented `?wave=N` precedent exactly. No production behaviour change; the pure core stays debug-free.

- **Corrected a TEA re-park assertion that a faithful ANTPC re-draw makes unsatisfiable.**
  - Spec source: tests/scorpion.test.ts ("re-parks through ANTPC the instant ANTH returns to 0"); SCORP :2069-2075.
  - Spec text: the RED test asserted `step.h === 0x00` after the re-park.
  - Implementation: changed the assertion to `step.h & 0x07 === 0x04` (a fresh column-aligned draw). SCORP's `:2075 58$ JMP ANTPC` runs the SAME ANTPC the flea uses, which RE-DRAWS the column (the rejection loop) — so post-re-park `h` is a new column-aligned value, never the wrapped 0. The other three assertions (not-scorpion, parked picture, parked V) are unchanged, and this matches flea.test.ts's own re-park test, which asserts column alignment, not `h===0`.
  - Rationale: a TEA test with a false premise (my own RED error under the relay); the ROM's ANTPC cannot leave h at 0, so making it pass by returning 0 would have been UNFAITHFUL. Verified against `:2075`, ANTPC (:128+), and the flea's precedent before changing.
  - Severity: minor
  - Forward impact: none — the corrected assertion pins the true re-park behaviour; the Reviewer should know the test text was corrected, not gamed.
  - **Reviewer audit:** → ✓ ACCEPTED — independently verified against `:2075` (JMP ANTPC) and the flea's own re-park test: ANTPC re-draws the column, so `h===0` is unreachable and the change is ROM-faithful, not a goalpost move. The re-park guard itself is mutation-confirmed (`h===0 -> h===1` was CAUGHT). Not gamed.

## Sm Assessment

**Setup complete. Session file created, story context created via `pf context create`, and feature branch cut from `centipede/develop`.** Routing to O'Brien (TEA) for the RED phase.

**Branch Strategy:** gitflow (`feat/cp3-3-scorpion-poison-ecosystem`)

**Key decision points for TEA:**

1. **Slot-12 architecture:** Decide whether to generalize cp3-2's `Flea` type (rename to motion object, gate branches by picture band), share state via a new container, or keep flea/scorpion as separate modules within one slot. The tests will drive this.

2. **Flea render blocker:** The "complete ecosystem" demo cannot ship invisible — decide whether to scope the flea render into cp3-3 itself or defer to a parallel cp3-4 story. The pre-extracted findings above are yours to consume or file forward.

3. **Open question 4:** Diff CENTIP.DOC:116 rev-1 prose (1000 points) against rev-4 code (`:2228 LDY I,10` → SCORN1), same as cp3-1 and cp3-2 did for their creatures — record any divergence in `open-questions.md`.

**Merge gate verified:** `gh pr list -R slabgorb/centipede` returns no open PRs; the base (`centipede/develop`) is current and clear.

**Handoff:** To O'Brien (TEA) for the RED phase.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev)

**Test Files:**
- `centipede/tests/scorpion.test.ts` — the SCORP unit transcription: `isScorpion`, spawn gates (parked / FRAME low byte 0 / CENTIN<11 decimal / RNGEN&3), spawn V/speed/direction, the horizontal crossing + re-park, the +1 picture cycle, poison creation, the one-hit-1000 shot kill, the shared-explosion revival, and the player-contact EXCLUSION.
- `centipede/tests/scorpion-live.test.ts` — the three live wires: the sim actually stepping the scorpion (SCORP :36 wired in), poison end-to-end (real crossing → poisoned cell → cp2-3 dive), cp1-6's poison render from real state, and the scorpion draw branch (`scorpionStamp` → SCORP0-3).

**Tests Written:** 46 tests (42 feature tests, all RED via the self-describing `loadCp33`/`loadLive` "not built yet" throw; 4 transcription-premise self-checks pass by design). **Full suite: 740 passed / 42 failed — the 736 pre-existing tests are untouched.**

**How the RED maps to the ACs:**
| AC | Coverage |
|----|----------|
| AC-1 (start/cross/dir/speed, wave input parameterized) | spawn-gate suite, V-position, speed/direction bands, crossing + re-park, +1 picture cycle; `centin` is a PARAMETERIZED ctx input per the epic ruling |
| AC-2 (poison flip + live dive + poison render) | poison-creation unit tests + the end-to-end `scorpion-live` suite (real scorpion → poisoned cell → head dive; poison mushroom rendered from real state) |
| AC-3 (kill 1000 + player-contact) | one-hit-1000 shot suite with the decimal-10 / hex-0x10 radix discriminators; player-contact EXCLUSION pinned against a flea control |
| AC-4 (ecosystem demo artifact) | `scorpionStamp` + the scorpion draw-branch tests make the creature visible; the DEMO CAPTURE itself is Dev's (needs debug seeding — see Delivery Findings) |

### Key discriminators (paranoia notes for Julia + the Thought Police)
- **The radix trap is doubled:** `:2226 CPY I,10.` (H window, DECIMAL 10) sits two lines from `:2228 LDY I,10` (score, HEX 0x10 → BCD 1000). Both are pinned with tests that fail on a hex/decimal confusion (|dH|=10..15 must MISS; score must be 1000 not 16).
- **The +1 cycle is a discriminator vs the flea's +2:** all four SCORP0-3 must appear over a crossing; a copy-paste from the flea's `INC ANTP`+`ADC` would only reach two.
- **The dive is proven by CONTRAST:** a normal mushroom TURNS the head one cell; only a scorpion-poisoned cell makes it dive to the floor. Both halves are asserted so neither passes alone.
- **Player-contact is proven by CONTRAST:** a scorpion ON the gun is harmless, a flea ON the same spot is lethal — so the exclusion is by picture band (:539), not by the upper-half distance.
- **Determinism + liveness guards** throughout (seeded-replay tests assert the scorpion actually moved and poisoned, so "it's deterministic" can't hide a frozen creature).

### Rule Coverage
`.pennyfarthing/gates/lang-review/typescript.md` was consulted; the applicable checks (pure-core boundary, no vacuous assertions, byte-distance wrap, determinism) are covered by the existing purity/citation gates plus the liveness/contrast guards above. No new rule-enforcement gaps for this story.

**Self-check:** every test asserts a meaningful value; no `let _ =`, no always-true assertions. The 4 passing premise tests verify the hand-mirrored constants against the ROM's own arithmetic (the poison-mask math, the +1 wrap) — non-vacuous transcription self-checks.

**Handoff:** To Julia (Dev) for GREEN — build `src/core/scorpion.ts` on the SHARED slot-12 object, wire `stepScorp` into the sim between the shot resolution and `stepFlea` (SCORP :36 before ANTMV :37), add `render.ts` `scorpionStamp` + draw branch, author `claims/13-scorpion.json`, and record the CENTIP.DOC:116 diff (no divergence) in `open-questions.md`. See Design Deviations for what NOT to build (no PLAYP param, no scorpion explosion code).

## Dev Assessment

**Status:** GREEN — all 46 scorpion tests pass; full suite 783/783; `npm run build` (tsc + vite) clean; citation gate green.

**What shipped:**
- **`src/core/scorpion.ts`** (new, pure core) — `isScorpion`, `stepScorp` (spawn gate → cross+poison → re-park), `resolveScorpionShotHit` (one hit, 1000). Operates on the SHARED `Flea` slot type; no parallel object. Explosion/revival reused from cp3-2's `stepFleaExplosion` (no new explosion code, per the TEA deviation).
- **`src/core/sim.ts`** — wired `resolveScorpionShotHit` + `stepScorp` into the slot-12 block, SCORP (:36) before ANTMV (:37), after the shot resolution. Draws no rng unless the spawn gate is reached (no fixture shift — see Delivery Findings).
- **`src/shell/render.ts`** — `scorpionStamp` (0x30-0x33 → SCORP0-3) + a scorpion draw branch between the flea and explosion branches.
- **`docs/rom-study/claims/13-scorpion.json`** — 16 byte-verified SC-* claims; `open-questions.md` entry 12 records the CENTIP.DOC:116 "scorpion 1000" diff (AGREES with rev-4, no divergence) + the doubled radix trap.
- **AC-4 demo** — `src/shell/demo.ts` + `?demo=` hook; artifacts `docs/rom-study/cp3-3-demo-ecosystem.png` (scorpion + live poison trail + a real dive + spider + train) and `cp3-3-demo-flea.png`, plus `cp3-3-demo-ecosystem.md`. Captured from THIS checkout on a spare port (:5288, cwd-verified — no port-ownership trap).

**AC coverage:** AC-1 ✓ (transcribed, centin parameterized, citations green) · AC-2 ✓ (poison live, integration dive test, poison render from real state) · AC-3 ✓ (1000, diff recorded; player-contact excluded — SCORP has no PLAY call) · AC-4 ✓ (artifacts committed).

**For the Thought Police (Reviewer):** two deviations logged — the shell-only `?demo` seed (cp2-13 `?wave` precedent) and the corrected TEA re-park assertion (`h===0` → column-aligned, since ANTPC re-draws the column; verified against `:2075` and the flea's own test). No `src/core` change carries browser/debug scope (purity green). The scorpion's rng draw is gated behind its full spawn condition — deliberately, so replays are unchanged.

**Handoff:** To the Thought Police (Reviewer) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 new smells | N/A — 784/784 green, tsc clean, citations green (26), purity clean on src/core/scorpion.ts; 1 pre-existing console.warn (main.ts:76, not this diff) |
| 2 | reviewer-edge-hunter | No | Skipped / disabled | — | assessed by Reviewer (mutation battery + boundary read of the spawn/cross/window gates) |
| 3 | reviewer-silent-failure-hunter | No | Skipped / disabled | — | assessed by Reviewer (poisonCell/stepScorp return-false are intentional "nothing to do" signals, not swallowed errors) |
| 4 | reviewer-test-analyzer | No | Skipped / disabled | — | assessed by Reviewer — **19-mutation battery found 3 guards that could not fail; all 3 CLOSED** (commit a27f63a); 1 Low gap recorded |
| 5 | reviewer-comment-analyzer | No | Skipped / disabled | — | assessed by Reviewer (SC-1..SC-16 inline tags reconciled to the claims file; ROM cites spot-checked; open-questions entry 12 accurate) |
| 6 | reviewer-type-design | No | Skipped / disabled | — | assessed by Reviewer (reuses the `Flea` slot type per the shared-slot ruling — no parallel object; `isScorpion` a clear total predicate) |
| 7 | reviewer-security | No | Skipped / disabled | — | assessed by Reviewer (no auth/input/tenant/network surface — a pure deterministic sim + a shell-only debug seed) |
| 8 | reviewer-simplifier | No | Skipped / disabled | — | assessed by Reviewer (straight-line early-return gate chain; no over-engineering; explosion reuses cp3-2, no duplication) |
| 9 | reviewer-rule-checker | No | Skipped / disabled | — | assessed by Reviewer (core/shell boundary held, radix cited, citation gate green — see Rule Compliance) |

**All received:** Yes (preflight returned; 8 disabled via `.pennyfarthing/config.local.yaml`, assessed directly per relay)
**Total findings:** 1 confirmed (Low, recorded), 3 confirmed-and-CLOSED (test hardening), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

### Mutation battery (the disabled test-analyzer's domain, done directly)
19 mutations against `src/core/scorpion.ts`; self-re-reading found nothing, mutations found three guards that could not fail their tests — **the code was correct in every case; the tests could not distinguish.** All three CLOSED in commit `a27f63a`, each re-run to confirm it now bites:
1. **spawn RNG gate** — the sweep only asserted SOME seeds spawn, so an always-spawn mask (0x00 for :2022's 0x03) survived → now pins the 1-in-4 rejection (< 56/64; ~22 spawn). CAUGHT.
2. **isScorpion shot gate** — the "misses a flea" test staged the flea OUT of the shot window (v 0x80 vs shot 0x90), so dropping the band gate still missed for the wrong reason → now co-locates the flea with the shot so only the band can reject. CAUGHT.
3. **poison at post-move h** — poison tests used dh=0 so pre/post-move h shared a column → added a boundary-crossing (h 0x77→0x78, col 16→15) test pinning the poison to the POST-move column (:2068/:2087). CAUGHT.

Sixteen other mutations (poison mask, score 1000-vs-16, both windows, centin gate, +1 vs +2 cycle, V bias, isScorpion boundary, explode pic, gate ordering, re-park, crossing direction, cadence, …) were all CAUGHT by the existing suite.

### Findings
| Severity | Tag | Issue | Location | Decision |
|----------|-----|-------|----------|----------|
| Low | [TEST] | The direction-sign mapping (RNGEN bit 7 → ±magnitude, :2036/:2042) is not pinned: flipping which bit-value means which sign still yields "both directions occur". The coin is symmetric, so this is a byte-exact-replay detail only, not a gameplay defect — the code matches the ROM's `BPL`/`LDA I,-N` semantics. | src/core/scorpion.ts:130 | Recorded, non-blocking — a robust pin would over-couple to the rng draw order for a symmetric coin; not worth the brittleness. |

No Critical, High, or Medium code defects. The three test gaps were closed rather than deferred.

### Rule Compliance
- **core/shell boundary (the single most important rule):** ✓ `src/core/scorpion.ts` draws entropy only from the seeded `@arcade/shared/rng` cursor (`rngByte`), no `window`/`document`/`Date.now`/`Math.random` — preflight-confirmed and swept by the passing `tests/purity.test.ts`. The debug seeding lives entirely in `src/shell/demo.ts` + `src/main.ts` (shell domain). ✓
- **Radix discipline:** ✓ every transcribed constant carries a radix-cited comment; the doubled trap (`:2226 CPY I,10.` decimal H-window vs `:2228 LDY I,10` hex score) is pinned by discriminator tests (|dH|=10..15 must miss; score 1000 not 16) — both mutation-confirmed.
- **Citation gate:** ✓ 16 SC-* claims in `13-scorpion.json`, all source verbatims byte-verified; `tests/audit/citations.test.ts` green (26).
- **Scoring-diff discipline (open question 4):** ✓ open-questions entry 12 records CENTIP.DOC:116 "1000" AGREES with rev-4 (no divergence), same as spider (8) and flea (9).
- **Shared-slot ruling:** ✓ the scorpion reuses the `Flea` slot object — no parallel object; ANTMV/`stepFlea` correctly freezes for pic ≥ 0x20 (verified `isFleaAlive(0x30) === false`).
- **Wave-gating ruling:** ✓ `centin` is a parameterized ctx input; the scorpion stays inert in wave 1 (no rng draw — the full suite is unshifted).

### Observations
- [VERIFIED] mainloop order — `sim.ts:286-330` runs `stepFleaExplosion` (EXPLOD :31 + revival), then the shot resolvers (SHOOT :34), then `stepScorp` (:36), then `stepFlea` (:37). A scorpion `stepScorp` produces is left untouched by the following `stepFlea` (`isFleaAlive(0x30)===false`). Matches the ROM slot order.
- [VERIFIED] no RNG-shift — `stepScorp` reads no `rngByte` until past the parked/frame/centin gates (gates-first ordering, mutation-confirmed), so no existing seeded fixture moved (784/784).
- [VERIFIED] spawn V band — `(RNGEN & 0x78) + 0x70 ∈ [0x70, 0xE8]`, always below the 0xF8 park, so a spawned scorpion is never mistaken for parked (scorpion.ts:141).
- [VERIFIED] render branch order — flea → scorpion → explosion; a scorpion (0x30-0x33) hits the new middle branch, an explosion (0xFF) falls to `segmentStamp`, a parked slot (v≥0xF8) draws nothing (render.ts:207-215).
- [VERIFIED] the AC-4 artifacts are authentic — the poison trail and the dive in `cp3-3-demo-ecosystem.png` were written by REAL warm-up sim steps (confirmed live via `__sim`: pic 0x31, 5 poisoned cells, diving head pic 0x23), not hand-painted; captured from THIS checkout on a cwd-verified spare port.
- [Low] direction-sign mapping untested (see Findings).

### Devil's Advocate
Assume this is broken. **The shared slot is the obvious landmine:** two creatures in one memory slot, three routines gating on picture band, and a mainloop order (SCORP :36 before ANTMV :37) that, if inverted, would let the flea step a scorpion or vice-versa. I attacked it — `stepFlea` provably early-returns for pic ≥ 0x20 and `stepScorp` early-returns for pic < 0x30 unless parked, so they are mutually exclusive; the "does NOT move a slot ≥ 0x20" flea test and the isScorpion-band shot test both pin it, and the mutation `crossing h+dh -> h-dh` was caught. **A malicious/confused player** cannot reach the debug seed by accident (it needs `?demo=ecosystem|flea` verbatim; any other value falls through to normal attract), and the seed never runs in production play. **The RNG cursor** is the replay contract's soft spot: a scorpion that drew entropy every frame would desync every downstream consumer — but it draws only on the spawn roll behind three gates, and the "consumes NO rng before its gates are decided" test plus the unshifted 784-suite prove it. **Stress the filesystem / weird inputs:** `stepScorp` takes only numbers and a seeded rng — no I/O, no parsing, no null surface; `poisonCell` bounds-checks the OBSTAC cell before writing (returns false out of range), so a scorpion at a screen edge cannot corrupt a neighbouring column. **The genuinely under-nailed thing** is the direction coin (Low finding) — but it is symmetric, so no player could tell, and the ROM's bit-7 semantics are matched in code even though a test doesn't force a specific seed's sign. **What a confused future maintainer might break:** "repair" the +1 cycle to +2 (caught), or read `:2019 CMP I,11.` as hex (caught), or drop the post-move-h poison detail (now caught). I could not turn any of these into a live defect. The implementation is faithful and the suite — after hardening — guards it.

### Deviations audit
All 5 design deviations (3 TEA, 2 Dev) stamped **✓ ACCEPTED** in the Design Deviations section, each verified against the code/ROM. No undocumented deviations found.

**Handoff:** To Winston Smith (SM) for the finish ceremony. Story is APPROVED and ready to merge — no rework required.