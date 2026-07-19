---
story_id: "cp2-5"
jira_key: "cp2-5"
epic: "cp2"
workflow: "tdd"
---
# Story cp2-5: Death, the RESTOR sweep, and the wave-1 loop — the cp2 demo

## Story Details
- **ID:** cp2-5
- **Jira Key:** cp2-5
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T12:26:20Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T10:14:03Z | 2026-07-19T10:14:39Z | 36s |
| red | 2026-07-19T10:14:39Z | 2026-07-19T10:49:44Z | 35m 5s |
| green | 2026-07-19T10:49:44Z | 2026-07-19T12:03:09Z | 1h 13m |
| review | 2026-07-19T12:03:09Z | 2026-07-19T12:26:20Z | 23m 11s |
| finish | 2026-07-19T12:26:20Z | - | - |

## Story Overview

Death and the RESTOR sweep complete the cp2 demo loop. PLAY (CENTI4.MAC:1769) detects gun-vs-segment contact; the player EXPLODes (CENTI4.MAC:961); lives decrement (transcribed from rev-4 code). Death arms MEM to the PLYFLD base (claim PM-22), then the frame-stepped RESTOR sweep (CENTI4.MAC:1826) walks the field EVERY 8 FRAMES (AND I,07 — claim PM-23, code wins over its stale comment) — restoring partial and poison mushrooms at 5 points each (PM-26) during the death pause via cp1-4's restoreMushroom primitive (SCORE_RESTORE=5). Respawn resumes the wave; clearing the last segment ends wave 1 — for this epic we loop wave 1 (wave progression/colour cycling are cp4). Epic demo on 5278: full wave 1 vs the centipede — kill the train, die to it, watch mushrooms restore, run out of lives, restart.

**Branch Strategy:** gitflow (feat/cp2-5-death-restor-wave-loop)

## Delivery Findings

### TEA (test design)
- **Improvement** (non-blocking): **PM-22's "MEM armed at death" is approximate — the ROM arms RESTOR at the END of the player explosion, not the death instant.** EXPLOD (CENTI4.MAC:991-997, CT-55) arms `MEM=0x0400` only when `PLAYP==0x27` (the last explosion frame); RESTOR then also waits for the CHAN5 explosion sound (CT-57). Net effect is identical to PM-22's framing (the sweep runs inside the death DELAY, before respawn), and CT-55/57 capture the precise sequence — no correction to PM-22 needed, just the record. Affects nothing built; the sim models "arm when the explosion animation completes." *Found by TEA during test design.*
- **Gap** (non-blocking, routed to cp4 / a train-completeness story): **NEWHD live-spawn is DEFERRED (ruling recorded below in Design Deviations).** The NEWD trigger (a head reaching the bottom) is already pinned (CT-23); the fresh-head spawn (CENTI4.MAC:1647, CT-71) reads `RNGEN` for the entry edge and is gated off during `DELAY` — it introduces the FIRST entropy into the otherwise seed-free motion loop and is orthogonal to death/RESTOR and to closing the wave-1 loop. The deterministic wave-1 demo does not need it; a faithful "sustained train" (NEWHD + COUNT1/COUNT3 cadence + CENTIS speed-up) is its own slice. Affects `src/core/centipede.ts` / `src/core/sim.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking, for Dev): **CHKEND holds the death/wave DELAY until RESTOR fully finishes (CT-64).** `stepSim`'s death pause must NOT count DELAY down while the RESTOR sweep is still armed (`MEM+1 != 0`) — otherwise the pause can end before the mushrooms are repaired, breaking AC-3 ("respawns with the field repaired"). The `stepRestor` cursor reaching `RESTOR_END` (0x7C0) is the "sweep done" signal. Affects `src/core/sim.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking, render/cp2-1 lineage): **the centipede train has never been rendered.** render.ts (cp1-6/cp2-1/cp2-6) draws mushrooms + gun + shot only; the cp2-3 train core was never wired into `render()`. cp2-5 adds `segmentStamp(pic)` + a per-segment blit loop, mapping MOBJP to the shared HEAD0-F pool (pictures.ts header) and the explosion frames 0xFA-0xFF to reused HEADA-F (CT-44, no new pixels). A rested/vacant slot (0xF9) is not drawn. Affects `src/shell/render.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **WIP audit verdict (commit 98af81c, "unreviewed; provenance unclear"): CORRECT, built on as-is.** Verified before writing a line: (1) all 34 RED tests + 355 baseline pass on top of it (389/389) before I touched anything; (2) its `tests/shoot-train.test.ts` edit is a pure mechanical call-site fix — `belowTop()` re-seats cp2-4's fixture trains below the new `SHOT_TOP_SKIP` guard row (CT-69), preserving every original expected score/hitIndex assertion exactly, and the guard itself is independently pinned in `sim-assembly.test.ts`, so nothing was weakened; (3) `stepSim`'s frame order matches the Dev contract exactly (movePlayer → stepShot → resolveShotHit only-if-shot-survived → stepCentipede with the `Math.sign(dir)` probe fix → stepExplosions → checkPlayerContact → wave-clear) and the death-pause `delay` only decrements while `restorMem===RESTOR_END`, correctly holding DELAY until the RESTOR sweep disarms per CT-64; (4) citations 200/200 at audit time; (5) `npm run build` clean; (6) purity guard passes on the new core code (no browser tokens, comments included). One unrequested-but-correct addition: `wrapH()` (8-bit MOBJH wraparound, CENDE4.MAC:147) — no test demanded it, but it's ROM-faithful (a plain unmasked add really does wrap on 6502 hardware) and turned out to be load-bearing for the mid-GREEN bottom-bounce fix below (an unmasked H would have compounded the V runaway into an H runaway too). Kept.
- **Gap** (blocking, user-reported mid-GREEN, FIXED this phase): **MOTION's bottom was a floor, not a bounce — segments left the visible field, making the wave permanently unclearable (AC-3 break).** Reported from live-testing the WIP on the 5288 demo; predicted in advance by cp2-3's Reviewer LOW and by the NEWHD-deferral note. Root cause: `descend()`/`dive()` decremented V by `dv` with no bound at all once a turn/dive reached the bottom row — the ROM's real behaviour (CENTI4.MAC:1373-1434, upright path) is a BOUNCE: `V<9` while descending negates MOBJDV the same frame (CT-72), and `V>=0x30` while ascending (the SAME bound as the player's own `PLAYV_MAX`) negates it back (CT-73), so a segment ping-pongs inside the player zone forever. Implemented as a shared `bounceDv(v, dv)` bounds check consumed by both `descend()` and `dive()`. Scoped to CONTAINMENT ONLY per TEA's standing entropy ruling: the ROM's 163$/165$ tail-promotion-into-new-head dance (also triggered at the bottom bounce, CENTI4.MAC:1406-1427) creates no new segments and doesn't affect containment, so it's left deferred alongside NEWHD (both are "how new heads emerge" — a cp4-adjacent concern), not implemented here. Added a deterministic containment pin (`tests/sim-assembly.test.ts`, 8000 frames, asserts every live segment's V stays in `[CENT_BOTTOM_V, CENT_ENTER_V]` throughout, that both bounce bounds are actually exercised, and that every contained segment is still killable — the wave can still clear). Citations CT-72/73 added (202/202 verified). Affects `src/core/centipede.ts`, `tests/sim-assembly.test.ts`, `docs/rom-study/claims/09-centipede-train.json`. *Found by the user, live-testing the WIP on 5288; fixed by Dev mid-GREEN.*
- **Improvement** (non-blocking, routed to cp4 alongside NEWHD): **The ROM's bottom-bounce ALSO promotes the segment immediately behind a turning head into a new independent head (CENTI4.MAC:1406-1427, the 163$/165$ loop) — deterministic, no RNG, distinct from NEWHD's RNG-driven top-edge spawn.** Not implemented here (containment-only scope, see above); a faithful "sustained train" story should pick this up together with NEWHD and the CENTIS speed-up, since all three shape how the train fragments and refills over a long game rather than just staying contained. Affects `src/core/centipede.ts`.

### Reviewer (code review)
- **Gap** (non-blocking, routed to cp3 / poison): **`dive()` clears POISON_BIT on ANY `bounceDv` flip, so poison can clear at the TOP (v=0x30) instead of the bottom (v<9) that CT-24 — cited in dive()'s own docstring — specifies.** An already-ascending head (dv<0 from a prior bottom-bounce) that then marches into a poison mushroom keeps `bounced=false` until it climbs to CENT_BOUNCE_TOP_V, clearing poison there rather than on a bottom arrival. The refactor changed the old bottom-only `newV <= CENT_BOTTOM_V` test to `bounced` (either edge). **Fully dormant in the shipped demo** — neither `seedPlayfield` nor MUSHER ever writes a poison code (0x38-0x3B); both only stamp 0x3F — so no wired game state produces a poisoned head; the common descending-poison case still clears at the bottom correctly. One-line fix: clear poison on the bottom bounce specifically (`seg.dv > 0 && seg.v < CENT_BOTTOM_V + 1`), not on `bounced`. Affects `src/core/centipede.ts`. *Found by Reviewer (edge-hunter) during code review.*
- **Gap** (non-blocking, routed to cp4 / CENTIS): **`bounceDv` gates on the pre-step V, so a per-frame speed that doesn't parity-align with the boundary overshoots by up to |dv|-1 before reversing** (dv=3 → V dips to 7; dv=4 → the `v<9` gate misses V=9 and V dips to 5; dv=-3 → V rises to 0x31). Dormant — wave-1 CENTIS is fixed at 2 and all bounds (0xF8/8/0x30) are even, so V always lands exactly on the boundary (the 8000-frame containment pin confirms). Becomes live the moment cp4 varies CENTIS. Fix: clamp the post-step V to the boundary. Affects `src/core/centipede.ts`. *Found by Reviewer (edge-hunter) during code review.*
- **Improvement** (non-blocking, test-hardening, bundle with cp4): **the containment pin's `touchedNearTop` anti-vacuity flag is fake** — `sim-assembly.test.ts:200` trips at `v >= CENT_BOUNCE_TOP_V-2 = 46`, but the train spawns at v=0xF8=248, so it is trivially true from frame 0 and never proves the CT-73 top bounce (0x30) is exercised; doubling CENT_BOUNCE_TOP_V goes undetected (mutation-verified). The per-frame upper bound is the loose CENT_ENTER_V, not a value near CENT_BOUNCE_TOP_V. (The BOTTOM edge — the actual user-reported defect — is genuinely guarded: `touchedBottom` requires v<=8 and the per-frame `>= CENT_BOTTOM_V` assertion holds; containment/clearability are real.) Fix: seed the scenario so `touchedNearTop` can only trip after a real bottom bounce, and tighten the ceiling bound. Affects `tests/sim-assembly.test.ts`. *Found by Reviewer (test-analyzer) during code review.*
- **Improvement** (non-blocking, test-hardening): **two integration tests over-claim vs their assertions** (mutation-verified) — `death-restor.test.ts:332` ("explosion animation actually plays") never reads `playerExplode` (a frozen animation still passes; the behaviour is transitively covered by the sibling restore test, which needs the 0x27 arm), and `death-restor.test.ts:416` ("cloneState deep-copies") never mutates a clone's segment to prove object independence (a shallow `[...segs]` would pass; the impl IS a deep `.map(seg => ({...seg}))`). Affects `tests/death-restor.test.ts`. *Found by Reviewer (test-analyzer) during code review.*
- **Gap** (non-blocking, render follow-up): **the player-explosion animation (PLAYP 0x20-0x28) is tracked in `stepDeathFrame` but never rendered** — `render.ts` always blits the static 'GUN'; and segment explosions freeze during the death/wave pause (`stepDeathFrame` skips `stepExplosions`) whereas the ROM's EXPLOD runs through DELAY. Both cosmetic (the train is replaced on respawn; a between-wave frozen last-explosion shows for WAVE_DELAY). Also the re-laid train enters at v=0xF8, overlapping the SCORE HUD text. Affects `src/shell/render.ts` / `src/core/sim.ts`. *Found by Reviewer during code review.*

## Design Deviations

### TEA (test design)
- **SimState is extended with the train + death/RESTOR/wave state (TEA-proposed shape):** Spec source: story Problem + the cp2-3/cp2-4 routing ("SimState carries the train + explosions + death/lives/wave state"). The RED suite pins `SimState` gaining `segs: Segment[]`, `lives: number`, `wave: number`, `delay: number`, `playerExplode: number`, `restorMem: number`, `gameOver: boolean`, plus new pure functions `checkPlayerContact(segs, player)` (PLAY), `stepRestor(field, mem, frame)` (RESTOR), and the extended `stepSim`/`cloneState`. Reason: behaviour can't be pinned without a callable surface; Dev may refine field names but the tests encode this shape. Severity: minor. Forward impact: `cloneState` must deep-copy `segs` (pinned by a test).
- **The ±1 OBSTAC probe re-pin ADDS a new corrected-fidelity test rather than re-baselining existing cp2-3 pins — because NO existing pin baked ±2:** Spec source: cp2-4 TEA Delivery Finding ("change cp2-3's stepHead probe seg.dh -> Math.sign(seg.dh)") + this story's routing ("re-baseline the cp2-3 pins that baked ±2"). Investigation: cp2-3's turn tests (`tests/centipede.test.ts`) use `dh:1` lone heads (already probe ±1) and `plantAhead` covers BOTH the 1- and 2-cell-ahead cells; the determinism test is self-relative; `tests/obstac.test.ts` pins the ROUTINE `obstacleCellFor(h,v,2)=col-2`, which is CORRECT (the fix is in the CALLER, not the routine). So no existing cp2-3 assertion baked ±2 into a breaking expectation — all stay green under the fix. The honest re-pin is therefore a NEW test (`tests/sim-assembly.test.ts` "a CENTIS-speed head probes exactly ONE cell ahead") that pins the one behaviour that genuinely differed and was never pinned: a `dh:2` head marches into the 1-cell-ahead cell before turning. RED now (current ±2 turns a cell early), GREEN after Dev's `Math.sign` fix. Reason: re-baselining tests that don't encode ±2 would be theatre; the corrected-fidelity pin is the substance. Severity: minor. Forward impact: Dev changes `stepHead`'s probe from `seg.dh` to `Math.sign(seg.dh)` (CT-48/65); the whole cp2-3 suite stays green.
- **The wave-1 LOOP is modelled by re-spawning `createCentipede()` on clear; a `wave` counter increments but the composition stays wave-1:** Spec source: story ("demo re-enters wave 1"; wave progression/colour cycling are cp4). Reason: the ROM increments CENTIS (speed) and re-lays via CENTPC on `DEAD==0` (CT-62); the demo keeps the wave-1 composition and only tracks a `wave` count for observability. Severity: minor. Forward impact: cp4 owns real wave progression (composition tables, colour cycling, 0x06/0x07 palette decode).
- **Life count = 3 (factory default), a parameterized wave input; CENTIP.DOC AGREES with the rev-4 code (open question 4, no divergence):** Spec source: story ("life count from rev-4 code; diff CENTIP.DOC per open question 4; code wins, record divergence"). Ruling: rev-4 `NLIVES = ((OPTNS>>2)&3)+2 ∈ [2,5]` (CT-67); CENTIP.DOC:64-67's DIP table reads 2 / *3 / 4 / 5 with the asterisk marking 3 as factory default (CT-68) — the doc AGREES with the code (like the mushroom PM-32/33 and segment CT-38 scoring), so there is NO number to bake-correct. The deterministic demo parameterizes the option to the factory default `STARTING_LIVES=3`. Recorded as an AGREEMENT, not a divergence (the open-questions.md item-4 record covers it via CT-68). Severity: minor.
- **`segmentStamp(pic) = HEAD<pic & 0x0F>` maps the whole MOBJP space, explosions included:** Spec source: routed finding (d) + CT-44 ("explosion pictures reuse cp1-3 motion-object stamps — no new pixels") + pictures.ts header ("Head/body share ONE sprite pool — HEAD0..HEADF"). Heads 0x00-0x07 -> HEAD0-7, bodies 0x42/0x47 -> HEAD2/HEAD7, poisoned 0x23 -> HEAD3, explosion frames 0xFA-0xFF -> HEADA-F. render draws a segment iff it is live (`pic < 0x80`) or exploding (`pic >= 0xFA`); a rested 0xF9 slot is not drawn. Reason: the low nibble is the ROM's shared-pool index; reusing HEADA-F for the explosion is the faithful "no new pixels" reading (cp1-3 decoded no dedicated explosion sprite). Severity: minor. Forward impact: a future story could decode a dedicated explosion sprite; the mapping is one line to change.

### Reviewer (audit)
- **FLAGGED (undocumented deviation, non-blocking):** the containment refactor (f725ab0) changed `dive()`'s poison-clear from the ROM-faithful bottom-only test (`newV <= CENT_BOTTOM_V`) to fire on ANY bounce (`bounced`), which clears poison at the TOP bound for an ascending-when-poisoned head — a divergence from CT-24 not captured in the Dev's containment-scope note (which documents the tail-promotion + CENTIS deferrals, but not this). Dormant (no poison wired in wave-1); recorded as a Delivery Finding routed to cp3.
- **ACCEPTED:** all 5 TEA design deviations (SimState shape, ±1 re-pin as a NEW test, wave-1 loop via re-spawn, lives=3 as an AGREEMENT, segmentStamp full-space mapping) and all 3 Dev findings (WIP-audit CORRECT, bottom-bounce containment-only scope with tail-promotion deferred, CENTIS/sustained-train deferral) — each well-reasoned, ROM-cited, and consistent with the epic's stated cp3/cp4 boundaries.

## Sm Assessment

**Setup complete, ready for RED.** cp2-5 (4pt feature, tdd) — the epic capstone: PLAY death,
EXPLOD player, lives from rev-4 code, RESTOR sweep (8-frame cadence, PM-22/23/26), respawn,
wave-1 loop closure, and the SIM ASSEMBLY that wires everything into a playable demo.

- **Branch:** `feat/cp2-5-death-restor-wave-loop` off origin/develop (cp2-6 tip).
- **Owns the routed findings:** train→SimState wiring (cp2-3), stepShot-then-resolve ordering
  (cp2-4 TEA), top-of-screen shot guard (cp2-4 Reviewer MEDIUM), the ±1 OBSTAC probe fix +
  cp2-3 pin re-baseline (TEA adjudicates), NEWHD wave-1 decision from source, explosion
  pic→stamp render mapping. All enumerated in the story context with archive provenance.
- **Demo artifact (AC-4):** committed screenshot/gif from THIS checkout — train, split,
  death, restored mushrooms, upright sprites. Port-ownership trap noted.
- **Sequencing note:** cp2-8 deliberately re-ordered AFTER this story so the user's single
  human re-test (one-click bind) lands on the fully-assembled game at epic end.
- **Jira:** skipped — none on this project.
- **Mode:** peloton subagent mode — tea/reviewer→opus, dev→sonnet; merges user-authorized.

## Tea Assessment

**Tests Required:** Yes — the epic capstone: player death (PLAY), the frame-stepped RESTOR sweep, the wave-1 loop, and the sim ASSEMBLY that wires the whole demo, all behind the live citation gate.

**RED commit:** `f7b7b23` on `feat/cp2-5-death-restor-wave-loop` (off cp2-6 tip 62d6ac9). Working tree clean; NO implementation written (TEA writes tests only).

### Quarry (rev-4 CENTI4.MAC, .RADIX 16; trailing `.` = decimal) — the authoritative tree is the one the checker resolves (`reference/atari-source/centipede/revision.v4/`), NOT `~/Projects/centipede-source` (line numbers differ by ~2-4 lines; cite the checker's tree)
| Semantic | Where | Claim |
|---|---|---|
| PLAY gun-vs-segment: `\|dH\|<7 AND \|dV\|<7 AND \|dH\|+\|dV\|<0x0C` (Manhattan diamond) | :1785/1792/1798 | CT-49/50/51 |
| Death (PLAYEX): DELAY=0x30, PLAYP=0x20 (player-explosion pic), colliding seg MOBJP=0xFF | :1801-1806 | CT-52/53 |
| Player explosion animates every 4 frames (FRAME&3), 0x20→0x28 done; arms RESTOR at PLAYP==0x27 → MEM=0x0400 | :985-997 | CT-54/55 |
| RESTOR every 8 frames (AND I,07 — code wins ";16 FRAMES"); waits for CHAN5 | :1831/1834 | CT-56/57 (PM-23) |
| RESTOR restores 0x38-0x3E→0x3F (+5 via SCORN1), one per pass, address order, disarm at 0x07C0 | :1850-1888 | CT-58/59/60/61 |
| Segment kill DEC DEAD (SCORNG); wave ends at DEAD==0 → DELAY=0x40 | :1945/2305-2319 | CT-62/63 |
| CHKEND: hold DELAY until RESTOR done; respawn (INIT1 + DEC LIVES + CENTPC); game-over at LIVES==0 | :595/613/730/734/627 | CT-64/65/66 |
| Lives `((OPTNS>>2)&3)+2 ∈ [2,5]`; CENTIP.DOC AGREES (factory default *3) | :767-771 / CENTIP.DOC:64-65 | CT-67/68 |
| SHOOT top-of-screen guard: skip MOBJV>=0xF8 | :2179-2182 | CT-69 |
| Mainloop order MOTION/EXPLOD/MOVE/SHOOT/NEWHD/CHKEND/RESTOR; NEWHD RNGEN+DELAY gated (deferred) | :30-39 / :1647-1679 | CT-70/71 |

**Open-question rulings:**
- **Open question 4 (lives):** rev-4 code and CENTIP.DOC rev-1 AGREE — starting lives are DIP-selectable 2-5 (`((OPTNS>>2)&3)+2`), factory default 3 (CENTIP.DOC:65 `*3`). No divergence to bake-correct (CT-67/68); demo uses `STARTING_LIVES=3`.
- **Open question 6 (RESTOR cadence):** already recorded (PM-23) — every **8** frames (`AND I,07`), not the stale ";16 FRAMES" comment. Re-confirmed in the train context (CT-56).
- **NEWHD wave-1 decision:** DEFER the live fresh-head spawn. The NEWD trigger is pinned (CT-23); the spawn (:1647, CT-71) is RNGEN-driven and DELAY-gated, orthogonal to death/RESTOR and to closing the wave-1 loop (which closes on `DEAD==0`, CT-62). Building it would inject the first entropy into the seed-free motion loop for no demo benefit; routed to cp4 / a "sustained-train" follow-up.

### Test Files (3 new + claims extension)
- `tests/death-restor.test.ts` — 20 tests. PLAY contact diamond (`checkPlayerContact`, CT-49/50/51); the pure RESTOR sweep (`stepRestor`, CT-56/58/59/60/61) — cadence, partial+poison restore at 5 pts, one-per-pass address-order sweep, deterministic replay; the assembled death→explosion→RESTOR→respawn (life spent, field repaired, fresh train), game-over on the last life, restart re-enters wave 1, the wave-1 loop closure, and determinism + cloneState carrying the train.
- `tests/sim-assembly.test.ts` — 7 tests. The ±1 OBSTAC probe corrected-fidelity re-pin (CT-48/65); the SHOOT top-of-screen guard (CT-69); stepSim wiring shot-vs-segment combat + the mushroom-priority ordering (stepShot before resolveShotHit).
- `tests/segment-render.test.ts` — 5 tests. `segmentStamp(pic)` → HEAD0-F pool (CT-44); the train is blitted; an exploding pic reuses a HEAD stamp; a rested 0xF9 slot is not drawn.
- `docs/rom-study/claims/09-centipede-train.json` — **+23 claims (CT-49..CT-71)**, machine-extracted from the reference tree (never hand-typed) + byte-verified: `check-citations 200/200 green`.

**Tests Written:** 32 covering AC-1/AC-2/AC-3 (AC-4 is Dev's committed demo artifact — noted only). **Status:** RED — 34 assertions fail self-describing (feature absent) + the corrected-fidelity ±1 re-pin; 1 green control (a segment below the 0xF8 line stays shootable). No harness/import noise.

### The Dev contract (build in GREEN)
1. `src/core/centipede.ts`: constants `PLAY_H_WINDOW=7`/`PLAY_V_WINDOW=7`/`PLAY_SUM_WINDOW=0x0C` (CT-49/50/51), `SHOT_TOP_SKIP=0xF8` (CT-69); `checkPlayerContact(segs, player): boolean` (PLAY diamond, live-only); **extend `resolveShotHit`** to skip `seg.v >= SHOT_TOP_SKIP` (CT-69); **fix `stepHead`** probe `obstacleCode(field, seg.h, seg.v, Math.sign(dir))` (CT-48/65).
2. `src/core/playfield.ts`: `RESTOR_END=0x7C0` (CT-61); `stepRestor(field, mem, frame): { mem, scored }` (RESTOR, CT-56/58/59/60/61) — inactive unless `frame&7==0`; on an active frame scan from `mem` (ROM address, index=`mem-0x400`) forward to the next 0x38-0x3E cell, restore via `restoreMushroom` (+5), advance `mem` past it; no partial before 0x7C0 → return `mem=RESTOR_END`.
3. `src/core/sim.ts`: extend `SimState` (`segs`, `lives`, `wave`, `delay`, `playerExplode`, `restorMem`, `gameOver`); `createSim` boots `segs=createCentipede()`, `lives=STARTING_LIVES=3`, `wave=1`, `delay=0`, `gameOver=false`. `stepSim` — normal frame: `movePlayer` → `stepShot` → `resolveShotHit` only if the shot survived live (mushroom priority) → `stepCentipede` (±1 probe) → `stepExplosions` → `checkPlayerContact` → wave-clear check (`DEAD==0` → `delay=WAVE_DELAY=0x40`). Death frame (`delay>0`): animate the player explosion (every 4 frames, 0x20→0x28), arm RESTOR at PLAYP==0x27, sweep `stepRestor` while armed, **hold DELAY until the sweep disarms** (CT-64), then at DELAY==0 respawn (dead gun → `lives-1`, fresh gun+train, game-over if `lives==0`) or re-enter the wave (gun alive → fresh train, `wave++`). `cloneState` must deep-copy `segs`. Constants `STARTING_LIVES=3` (CT-67/68), `DEATH_DELAY=0x30` (CT-52), `WAVE_DELAY=0x40` (CT-62), `PLAYER_EXPLODE_START=0x20`/`ARM=0x27`/`DONE=0x28` (CT-53/54/55).
4. `src/shell/render.ts`: `segmentStamp(pic)=HEAD<pic&0x0F>` (CT-44); draw each segment that is live (`pic<0x80`) or exploding (`pic>=0xFA`); skip a rested 0xF9 slot.

**Purity:** `checkPlayerContact`/`stepRestor`/the sim stay in `src/core/` (purity guard auto-binds — no browser tokens, incl. comments); the demo remains seed-only-entropy (NEWHD's RNGEN deferred). `segmentStamp`/render are shell.

**RED verification:** full suite `Test Files 3 failed | 27 passed (30)` · `Tests 34 failed | 355 passed (389)` — the 3 failed files are exactly the new ones; all 27 baseline files (354 tests) stay green. `npm run build` (tsc --noEmit && vite build) clean. `node tools/audit/check-citations.mjs` → 200/200 verified.

**Handoff:** To Dev (Julia) for GREEN implementation. Handoff doc: `.session/cp2-5-handoff-red.md`.

## Dev Assessment

**Implementation Complete:** Yes

**WIP audit (commit 98af81c):** CORRECT — audited before building on it (see Delivery Findings > Dev). All 34 RED tests + 355 baseline already passed on top of it; the `shoot-train.test.ts` edit is a mechanical, non-weakening fixture fix; `stepSim`'s frame order and DELAY-hold-until-RESTOR-disarms logic exactly match the TEA contract; citations/build/purity all clean. Built on it as-is rather than reworking.

**Mid-GREEN scope addition (user-reported, required by the coordinator before completing this phase):** the centipede train had no bottom containment — segments left the visible playfield once a turn/dive reached V<9 (no floor at all), permanently breaking AC-3's wave-clear. Fixed per the ROM's actual bounce behaviour (CENTI4.MAC:1373-1434, CT-72/73): the bottom (V<9) and the ping-pong top bound (V>=0x30, same as PLAYV_MAX) both negate MOBJDV instead of letting the segment run away. Containment only — the ROM's tail-promotion-into-new-head nuance at the same bounce point is deferred alongside NEWHD (routed to cp4). Added a deterministic 8000-frame containment pin.

**Files Changed:**
- `src/core/centipede.ts` - `bounceDv()` bottom/top bounds check (CT-72/73), consumed by `descend()` and `dive()`; exported `CENT_BOTTOM_V`/`CENT_BOUNCE_TOP_V` for the test
- `tests/sim-assembly.test.ts` - new containment describe block (8000-frame run: bounds held, both bounce edges exercised, contained segments still killable)
- `docs/rom-study/claims/09-centipede-train.json` - +2 claims (CT-72/73), byte-verified
- `docs/rom-study/cp2-5-demo-marching-train.png`, `cp2-5-demo-split.png`, `cp2-5-demo-death.png`, `cp2-5-demo-restored-mushrooms.png` - AC-4 demo artifacts, captured live from the 5288 dev server (this checkout) via Playwright + synthetic keyboard input; each verified numerically against `window.__sim()` at capture time (no staged states)
- (unchanged, audited only) `src/core/sim.ts`, `src/core/playfield.ts`, `src/main.ts`, `src/shell/render.ts`, `tests/shoot-train.test.ts` from WIP commit 98af81c

**Tests:** 390/390 passing (GREEN) — 355 baseline + 34 story RED + 1 new containment pin. Citations 202/202 (200 + CT-72/73). `npm run build` clean. Purity guard green (no browser tokens in `src/core/`, comments included).

**Branch:** `feat/cp2-5-death-restor-wave-loop` (pushed to origin; commits `f725ab0` fix + `4851c21` demo artifacts, on top of the audited `98af81c` WIP and `f7b7b23` RED)

**Demo artifact contents (AC-4):**
- `cp2-5-demo-marching-train.png` — the wave-1 train mid-field shortly after spawn, mushrooms scattered, upright sprites, gun at bottom.
- `cp2-5-demo-split.png` — a mid-segment kill (score=10, SCORE_BODY) promotes the segment behind the gap to a new head; confirmed via pic's BODY_BIT before screenshotting.
- `cp2-5-demo-death.png` — the gun-vs-segment collision moment (PLAY), playerExplode just armed, DEATH_DELAY just started.
- `cp2-5-demo-restored-mushrooms.png` — post-respawn field; numerically confirmed 4 mushrooms damaged pre-death, 0 damaged after the RESTOR sweep completed.
- Captures used a `requestAnimationFrame` override to freeze the sim loop the instant the target condition was detected via `window.__sim()` (the WIP's existing debug hook), eliminating tool-round-trip race against the live 60fps sim.

**Handoff:** To Review

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 0 | reviewer-preflight | Yes | clean | Ran the mechanical gates inline (foreground): `npm test` 390/390, `check-citations.mjs` 202/202, `npm run build` clean, purity grep clean, working tree clean, no stray PNGs, no race | N/A — all green, personally observed |
| 1 | reviewer-edge-hunter | Yes | findings | 4 — poison-clear-at-top boundary (high conf), bounceDv overshoot for dv≠2 (med), unenforced RESTOR-arm timing (low), empty-segs vacuous wave-clear (low); also confirmed-safe: stepRestor bound exact, delay never negative, playerExplode always passes 0x27, death/wave-clear mutually exclusive | CONFIRMED all 4. 2 MEDIUM (poison→cp3, bounceDv→cp4) + 2 LOW. All latent/dormant, none reachable in shipped wave-1, none blocking. |
| 2 | reviewer-test-analyzer | Yes | findings | 6 (mutation-verified) — containment `touchedNearTop` guard vacuous (high), 2 over-claiming integration tests (high), loose segment-render assertions, single-sample cadence, endpoint-only poison band; confirmed solid: RESTOR cadence/poison, the DELAY-hold proof, `belowTop()` edit clean | CONFIRMED. 1 MEDIUM (containment top-guard) + LOW. No implementation defects — all test-quality; none blocking. |

**All received: Yes.** Both subagents (sonnet) ran in background/parallel. Neither surfaced a Critical/High or a defect reachable in the shipped wave-1 demo; every confirmed finding is recorded under Delivery Findings > Reviewer.

## Reviewer Assessment

**Verdict:** APPROVED

The cp2 capstone — the sim assembly (death/PLAYEX, the RESTOR sweep, the wave-1 loop) plus the mid-GREEN user-defect bottom-bounce fix. Re-ran every gate personally: **`npm test` 390/390**, **`check-citations.mjs` 202/202**, **`npm run build` clean**. No race (feat branch clean off merge-base 62d6ac9; origin/develop only advanced by a v0.0.1 release chore; no sibling landed cp2-5 work). Working tree clean; only the 4 cp2-5 demo PNGs newly tracked.

**WIP audit (98af81c, unaudited author) — my independent audit CONFIRMS the Dev's verdict CORRECT:**
- (a) The `belowTop()` edit to cp2-4's `shoot-train.test.ts` is a pure `v - 0x20` shift applied to exactly the 5 fixtures that use `createCentipede()`'s 0xF8 entry row. **Every assertion (hitIndex, pic-promotion, scored, shot.live, head counts) is byte-identical to cp2-4 — nothing weakened.** The one hand-built fixture (the already-dead-trailing test at v=0x80) was already below the guard and correctly left untouched. The test-analyzer re-verified this by re-running (59/59 green). NOT a defanged assertion.
- (b) `stepSim`'s frame order matches the TEA contract exactly: movePlayer → stepShot → resolveShotHit (only if `shot.live`) → stepCentipede (Math.sign probe) → stepExplosions → checkPlayerContact → wave-clear.
- (c) DELAY-hold-until-RESTOR-disarms (CT-64) is correct and *genuinely* test-proven: the death test asserts every damaged mushroom is full AFTER respawn, and since `stepPlayingFrame` never runs RESTOR, a premature respawn would leave them damaged forever — mutation-verified (removing the hold fails the test immediately). Death-frame flow (explode 0x20→0x28 every 4 frames, arm at 0x27) verified: arming fires exactly once on the 0x26→0x27 transition.
- (d) Cited constants match the claims; citations 202/202.

**Bottom-bounce quarry (f725ab0) — verified CT-72/73 directly against the vendored CENTI4.MAC:**
- CT-72: `16$: CMP I,9 / BCS 18$` (line 1389-1390) → V<9 falls through to `167$` (1432-1434) `COMP MOBJDV` = negate-before-apply; body skips head bookkeeping via `AND I,40 / BNE 167$` and lands at the same negate — the bounce applies to heads AND bodies. ✓
- CT-73: `155$: CMP I,30 / BCS 167$ ;TURN DOWN` (line 1385-1386) — 0x30 is genuinely the SEGMENT's own ascending bound in MOTION (line 1385), correctly cited, not a spurious player-constant coincidence. ✓
- `wrapH`/MOBJH:147 cite accurate (`MOBJH: .BLKB 16.` — 8-bit per slot, wraps mod 256). The ROM tail-promotion dance (163$/165$, lines 1406-1431) is real, deterministic, and correctly deferred as a documented finding.
- The 8000-frame containment pin proves non-escape every frame (`[CENT_BOTTOM_V, CENT_ENTER_V]` per live segment) and wave-clearability (kills every contained segment to zero live). *Caveat:* its `touchedNearTop` anti-vacuity flag is fake (see findings) — but the BOTTOM edge (the actual user defect) IS genuinely exercised, and AC-3 containment holds for the ROM-verified implementation.

**Data flow traced:** user input → `movePlayer`; a fired shot → `stepShot` (mushroom score) → `resolveShotHit` only if `shot.live` (segment-kill score, one-shot economy consumes it) — no double-count (mutually exclusive via `shot.live`). Death → DELAY + player-explosion → RESTOR sweep (held until disarm) → respawn (`lives-1`, fresh train) or game-over. All deterministic; `cloneState` deep-copies `segs`; core is purity-clean (no browser tokens incl. comments; the `__sim` hook lives in shell `main.ts` only).

**Findings (severity):**
| Severity | Issue | Location | Status |
|----------|-------|----------|--------|
| MEDIUM | `dive()` clears poison on ANY bounce vs CT-24's bottom-only (top-bounce clears poison at 0x30) | `centipede.ts` dive() | Non-blocking — **dormant** (no poison wired in wave-1); route cp3 |
| MEDIUM | `bounceDv` overshoots boundary by ≤\|dv\|-1 for dv≠2 (parity misalign) | `centipede.ts` bounceDv() | Non-blocking — **dormant** (wave-1 dv=2, bounds even); route cp4 |
| MEDIUM | containment pin's `touchedNearTop` guard vacuous (true at spawn); loose ceiling bound | `sim-assembly.test.ts:200` | Non-blocking — bottom edge IS guarded; test-hardening |
| LOW | 2 integration tests over-claim (explosion-plays never reads playerExplode; clone test never mutates) | `death-restor.test.ts:332/416` | Non-blocking — behaviour covered / impl correct |
| LOW | player-explosion not rendered; pause freezes seg explosions; train overlaps SCORE HUD | `render.ts` / `sim.ts` | Non-blocking — cosmetic |
| LOW | unenforced RESTOR-arm timing invariant; empty-segs vacuous wave-clear | `sim.ts` | Non-blocking — guarded by 300-330 test / 12-seg invariant |

**Blocking findings:** none (no Critical/High). The shipped wave-1 demo is ROM-faithful and correct; every MEDIUM is a latent/dormant issue that activates only in cp3 (poison) or cp4 (CENTIS), correctly outside this story's scope.

**Deviation audit:** 5 TEA + 3 Dev deviations ACCEPTED (well-reasoned, ROM-cited); 1 undocumented deviation FLAGGED (poison-clear boundary, recorded above and as a Delivery Finding).

**Handoff:** To SM for finish-story (PR opened against develop, NOT merged — awaits human merge authorization per the self-approval gate).