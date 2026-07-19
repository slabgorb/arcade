---
story_id: "cp2-3"
jira_key: "cp2-3"
epic: "cp2"
workflow: "tdd"
---
# Story cp2-3: The train arrives — CENTPC init, MOTION march + descent, OBSTAC turns, poisoned dives; gun blocked by mushrooms (MOVE/OBSTAC)

## Story Details
- **ID:** cp2-3
- **Jira Key:** cp2-3
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T07:52:42Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T06:45:50Z | 2026-07-19T06:47:00Z | 1m 10s |
| red | 2026-07-19T06:47:00Z | 2026-07-19T07:14:36Z | 27m 36s |
| green | 2026-07-19T07:14:36Z | 2026-07-19T07:37:37Z | 23m 1s |
| review | 2026-07-19T07:37:37Z | 2026-07-19T07:52:42Z | 15m 5s |
| finish | 2026-07-19T07:52:42Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking, routed to cp2-7): the ROM's OBSTAC column reversal is `((0xF7 - H') & 0xF8) >> 3` — base **0xF7**, NOT 0xF8 — and the row is round-to-nearest `(V+4)>>3` (CT-28/29, PS-15/16/17). The shot fires straight up its own column (dir=0, PS-19), so its collision column is `(0xF7 - shotH) >> 3`. cp2-7 reports the shot hitbox lands one column RIGHT of the drawn mushroom: the skew is between this collision column and `layout.ts cellScreenX(col) = LOGICAL_W-(col+1)*TILE_W` (the render's column→screen-x, ROT270). The gun render (`gunScreenX`) is self-consistent with OBSTAC (both anchor on 0xF7), so the mismatch is render-mushroom-column vs shot-collision-column — the candidate off-by-ones are the 0xF7-vs-0xF8 anchor and the `>>3` floor (render) vs `(v+4)>>3` round (collision). cp2-3 now transcribes OBSTAC as the oracle; cp2-7 should diff `cellScreenX` against `obstacleCellFor(h,v,0)` and move the RENDER side (or the draw column), not OBSTAC. Affects `src/shell/layout.ts` / `src/shell/render.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking, for Dev + a later story): NEWHD (CENTI4.MAC:1643) — the new-head respawn that fires when a head reaches the bottom row (NEWD trigger pinned as CT-23) — is NOT built or tested here. cp2-3 pins CENTPC's wave-1 placement + MOTION's per-segment step + the poison dive + the gun block; the continuous "new heads enter from the 0xFC edge, DV=2" loop (NEWHD:1664-1686) that keeps difficulty up is unexercised. The epic anchors NEWHD to cp2 but no story owns it explicitly; route it with cp2-4/cp2-5 (combat + death) or a train-completeness follow-up. *Found by TEA during test design.*
- **Question** (non-blocking, for Dev): MOTION's "SPEED UP LAST HEAD" branch (CENTI4.MAC:1314-1327) and the leg-animation cadence (1294-1301, `FRAME&1`) read state the segment-array model does not carry — the live-segment count (DEAD) and a frame counter. The RED tests are written to be robust to both (they assert direction-of-change and magnitude-free march, never a hard speed, and never touch the pic low bits leg-anim cycles), so Dev may derive liveness from the array and layer leg-anim on an internal/passed frame without breaking a test — but note it, because a lone-head speed-up to ±2 is real ROM behaviour. Likewise MOTION halts entirely during DELAY (CT-26); DELAY is sim-level state, so `stepCentipede` takes only `(segs, field)` and the sim owns the DELAY gate. *Found by TEA during test design.*
- **Improvement** (non-blocking): CENTPC's wave-1 path (CENTIN=12 → the 90$ branch) is RNGEN-free — the RNGEN reads at :538-544 are the *extra-centipede* placement for CENTIN<12 (later waves), skipped when the count is the full NCENT. So `createCentipede()` is a pure, seed-free function and the whole train is deterministic without any rng draw (AC-2 determinism). The initial heading sign (FRAME&2, :482-484) is a wave/frame input parameterized to a fixed default per the epic's "parameterize wave inputs" ruling — pinned as behaviour (tests read `seg.dh`), not a hard sign. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking, for cp2-4/cp2-5 or a train-completeness follow-up): confirmed NEWHD (CENTI4.MAC:1664-1686) is still unbuilt — a head that dives/marches to the bottom row currently just sits there (clamped at CENT_BOTTOM_V=8, poison cleared per CT-24) rather than spawning a new head from the top edge. No test exercises this; matches TEA's routing. Affects `src/core/centipede.ts` (a future `stepCentipede` extension) + `src/core/sim.ts` (owning the loop that would call it). *Found by Dev during implementation.*
- **Improvement** (non-blocking): `src/core/sim.ts`'s `SimState`/`stepSim` do NOT carry or step a centipede — only `movePlayer`'s new `field` argument was wired in (per the session's Dev contract, point 4). No test in `tests/sim.test.ts` or elsewhere references `state.centipede`, so wiring the train into the sim loop (spawn via `createCentipede()`, step via `stepCentipede()` each frame, gated by a DELAY-equivalent) is left for a future story (likely the epic's playable-demo story, cp2-5) rather than speculative, untested state here. Affects `src/core/sim.ts`. *Found by Dev during implementation.*
- **Question** (non-blocking, for Reviewer/future MOTION work): the turn/dive's exact multi-frame timing is a documented simplification (see `src/core/centipede.ts`'s "DESIGN DEVIATION" module comment) — h freezes during a turn/dive rather than continuing to march in the old direction until the ROM's V&7==4 phase gate. This satisfies every AC-2/AC-3 test (never enters the obstacle's cell, always drops >=1 row, poisoned head reaches the bottom zone) but is NOT a cycle-accurate reproduction of CENTI4.MAC:1373-1470. Worth a citation/audit follow-up if a future story needs frame-exact MOTION (e.g. a screenshot-diff fidelity story). *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (non-blocking, file a follow-up): **frame-exact MOTION turn timing is a ratified divergence, not implemented here.** The ROM (CENTI4.MAC:1435-1470, CT-20/21) marches h every frame in the OLD direction while descending a full 8px cell, flipping MOBJDH only on the V&7==4 phase; `descend()` instead freezes h and reverses on the round-to-nearest row-bucket flip. Net outcome is identical (never enters the obstacle cell — in fact more conservative; always drops a row; always reverses) and the divergence is honestly documented (no phantom fidelity). For a fidelity project this is REAL debt: the ±(dh) coast (about ±4px, net-zero, at speed 2) is a subtle turn-shape difference cp2-5's wave-1 demo shows. **SM: file a `frame-exact MOTION (coast-march per CT-20/21)` follow-up story** — TEA + Dev already routed it to "a screenshot-diff fidelity story"; it needs an actual sprint entry. Affects `src/core/centipede.ts` `descend()`/`stepHead()`. *Found by Reviewer during code review.*
- **Gap** (non-blocking): **two edge-turn boundary constants lack dedicated claims entries (AC-1 letter).** `CENT_EDGE_LEFT = 0xf0` (CENTI4.MAC:1343 "CMP I,0F0") and `CENT_EDGE_RIGHT = 0x10` (:1351 "CMP I,10") carry radix-cited comments and are byte-accurate (I verified 1342-1352 against source) but are attributed to CT-17, whose verbatim is a different line (:1363 "BCC 15$") — so their specific values are not pinned by a `claims/*.json` entry. Spirit of AC-1 (ROM-traceable) is met; the letter (a JSON entry) is short for these two. Cheap to close with a CT-32/33 addendum. Affects `docs/rom-study/claims/09-centipede-train.json`. *Found by Reviewer during code review.*
- **Gap** (non-blocking, already routed to cp2-4/cp2-5): **post-bottom head behavior is undefined.** A head that dives/marches to `CENT_BOTTOM_V=8` clears poison (CT-24) then just marches along the bottom; the ROM's bounce-back-up (167$ COMP MOBJDV) + NEWHD spawn are out of scope. A later edge/mushroom turn at the bottom would drive V below 8 (toward negative) via `descend()`'s unfloored drop — harmless (no test reaches it, minV assertions still hold) but ill-defined until NEWHD/bottom-bounce lands. Confirms TEA+Dev's NEWHD routing. Affects `src/core/centipede.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **movePlayer gains an OPTIONAL 3rd `field` argument for the gun block (not a required arg, not a new function)**
  - Spec source: context-story-cp2-3.md, AC-4 ("the gun can no longer glide into a mushroom cell ... cp1-5's movement/TBLMT tests stay green")
  - Spec text: the ROM's MOVE unconditionally does `JSR OBSTAC / BNE 5$` (CENTI4.MAC:1500-1503/1535-1536) on every move
  - Implementation: `movePlayer(player, counts, field?)` — the 2-arg form stays bounds-clamp-only (cp1-5), the 3-arg form adds the OBSTAC block; tests/gun-block.test.ts drives the 3-arg form, cp1-5's tests/player.test.ts (2-arg throughout) is untouched
  - Rationale: an optional field keeps every cp1-5 movement/TBLMT test green with zero edits (AC-4's explicit constraint) while the sim/demo always passes the field, so live play is byte-faithful; a required arg would force editing another story's RED-committed tests
  - Severity: minor
  - Forward impact: the 2-arg form is a test-only convenience — every live caller (stepSim) must pass the field or the gun silently reverts to gliding; note for the Reviewer
- **OBSTAC is transcribed into playfield.ts (`obstacleCellFor`/`obstacleCode`), and cp1-5's `obstacleCell(h,v)` becomes its dir=0 special case**
  - Spec source: context-story-cp2-3.md, story Problem ("this story transcribes OBSTAC once and both consumers (MOTION and MOVE) use it")
  - Spec text: "OBSTAC transcribed ONCE with two consumers"
  - Implementation: the canonical mapping (0xF7 reversal + 8*dir + round-row) lives in playfield.ts; player.ts's `obstacleCell` delegates to `obstacleCellFor(h,v,0)`; MOTION and the gun both call `obstacleCode`
  - Rationale: playfield.ts owns the grid + addressing, so both consumers (player.ts gun/shot AND centipede.ts) import from below with no import cycle; the shot (a third, pre-existing dir=0 consumer) keeps working via the same routine
  - Severity: minor
  - Forward impact: Dev refactors `obstacleCell` to delegate; its render/layout/shot consumers stay green (dir=0 is byte-identical to the old standalone mapping — pinned by tests/obstac.test.ts)
- **The centipede is a plain `Segment[]` (h,v,dh,dv,pic), not the ROM's 16 parallel MOBJ* arrays**
  - Spec source: context-epic-cp2.md, SLOT MODEL (glossary: "segments in slots 0-11 ... flea 12, spider 13, shot 14, gun 15")
  - Spec text: the ROM stores MOBJP/MOBJH/MOBJV/MOBJDH/MOBJDV as 16-entry parallel byte arrays (CENDE4.MAC:129-161)
  - Implementation: one `Segment` struct per centipede segment; the gun (slot 15) and shot (slot 14) stay their own cp1-5 player.ts structs
  - Rationale: the parallel arrays are a 6502 zero-page memory layout, not a semantic requirement; per-segment structs are TS-idiomatic and directly testable
  - Severity: minor
  - Forward impact: a future unified 16-slot motion-object table (flea/spider/scorpion in cp3) may consolidate these or keep them separate — either is compatible
- **MOTION is pinned as observable direction-of-change over frame windows, not exact per-frame micro-stepping**
  - Spec source: context-story-cp2-3.md, AC-2/AC-3 ("mushroom and edge encounters drop a row and reverse"; "the head plunges to the bottom zone")
  - Spec text: MOTION's intricate 15$/18$/25$ turn logic (cell-boundary-gated reversal at V&7==4, per-frame descent while V&7!=0)
  - Implementation: tests assert net outcomes — "reversed dh + dropped >=1 row without entering the cell", "poison bit set then min-V reaches the bottom zone", "body followed the leader down" — over generous frame windows, plus magnitude-free march; not exact intermediate frames
  - Rationale: pins exactly the ROM-faithful behaviour each AC names while leaving Dev freedom on the exact micro-stepping (avoids over-coupling the RED to one implementation of the turn logic); the byte-level algorithm is fully transcribed in claims CT-11..CT-26 for the Reviewer to check GREEN against
  - Severity: minor
  - Forward impact: none — a faithful MOTION satisfies both the behavioural tests and the citation claims

### Dev (implementation)
- **The turn/dive freezes H during the multi-frame descent instead of continuing to march in the old direction until the ROM's V&7==4 phase gate**
  - Spec source: TEA's Design Deviation above ("MOTION is pinned as observable direction-of-change over frame windows, not exact per-frame micro-stepping")
  - Spec text: CT-14/20/21 — CENTI4.MAC:1373-1470 continues marching h every frame (even mid-turn, in the pre-reversal direction) while V descends, only flipping MOBJDH once V&7==4
  - Implementation: a `turning` (internal, non-ROM) flag on `Segment`: once a turn/dive begins, h is frozen and v decreases by `dv` every frame until the row bucket `(v+4)>>3` changes, at which point (for a turn) `dh` reverses and marching resumes; a poison dive instead continues every frame (h marches, v descends) with no row-gating, per CT-19's "bypasses the edge/OBSTAC checks"
  - Rationale: verified by hand-tracing CENTI4.MAC:1373-1470 that the exact ROM timing (continue marching old-direction for several frames while descending, per-cell-phase-gated reversal) can, for small `dv`, cause the OBSERVED cell-occupancy to briefly re-enter cells the RED test's `occupied` set explicitly forbids (`tests/centipede.test.ts`'s "never entering the cell" assertion) unless the row genuinely changes before further horizontal travel; freezing h during the descent guarantees the row changes before marching resumes, satisfying every AC-2/AC-3 assertion without reproducing the exact 6502 branch count
  - Severity: minor
  - Forward impact: a future frame-exact MOTION story (if one is ever filed) would need to replace this state machine with the literal V&7==4 gate; flagged in Delivery Findings for the Reviewer
- **`stepSim`/`SimState` do not carry or step a centipede — only `movePlayer`'s field pass-through was wired into sim.ts**
  - Spec source: the story task prompt's phrasing ("wire the centipede into the sim step/state per the tests' expectations") vs. the session's own Dev contract (point 4, which only specifies `movePlayer(state.player, input, state.playfield)`)
  - Spec text: no test in `tests/sim.test.ts` (or any other file) references `state.centipede`, `stepCentipede`, or `createCentipede` from sim.ts
  - Implementation: sim.ts changed ONLY to pass `state.playfield` into `movePlayer`; the centipede train exists as a standalone, independently-tested core module (`src/core/centipede.ts`) not yet assembled into `SimState`
  - Rationale: the minimalist-discipline rule ("does a test require it?") — adding untested `SimState` fields/stepping logic would be speculative scope creep ahead of whichever story (likely cp2-5, the epic's playable-demo) actually specs the sim-level wiring (spawn timing, DELAY gate, wave transitions)
  - Severity: minor
  - Forward impact: noted in Delivery Findings for the next story that assembles the demo

## Sm Assessment

**Setup complete, ready for RED.** cp2-3 (5pt feature, tdd) — the centipede train core:
CENTPC :456, MOTION :1277, OBSTAC :1689 transcribed from rev-4 CENTI4.MAC, plus the cp1-5
carry-forward (gun MOVE blocked by mushrooms via the same OBSTAC).

- **Session/context:** created from the authoritative epic YAML; prior archives flagged
  (cp1-4 grid, cp1-5 movePlayer/MOVE, cp1-6 poison-codes finding).
- **Branch:** `feat/cp2-3-centipede-train` off origin/develop at beb7f0d (includes cp2-1+cp2-2).
- **Race check:** clean at cp2-2 finish; origin sibling activity was tempest-only today.
- **Jira:** skipped — none on this project.
- **Scope fences routed to TEA/Dev:** poison dive is transcribed + debug-seed-pinned only
  (live in cp3); OBSTAC transcribed ONCE with two consumers; radix-cited claims for every
  constant; seeded rng only. cp2-7's hitbox off-by-one is adjacent but NOT in scope — any
  OBSTAC column-mapping insight goes to Delivery Findings for cp2-7.
- **Mode:** peloton subagent mode — tea/reviewer→opus, dev→sonnet; merges user-authorized.

## TEA Assessment

**Tests Required:** Yes — the epic's core story: the wave-1 centipede train (CENTPC init + MOTION stepping), the shared OBSTAC routine, the poisoned-head dive, and the cp1-5 gun-vs-mushroom carry-forward. All new core behaviour behind the live citation gate.

**RED commit:** `74acfd0` on `feat/cp2-3-centipede-train` (off beb7f0d = cp2-2's merge). Working tree clean; NO implementation written.

### Test Files (3 new + 1 claims file)
- `tests/centipede.test.ts` — 14 tests. The train (`src/core/centipede.ts`, GREEN builds it). CENTPC init (12 segments, head 0x03 @ (0x80,0xF8), bodies 8px-spaced, one head, all alive); MOTION horizontal march (H+=dh, V flat); mushroom/edge turn (reverse + drop a row, never entering the cell — OBSTAC looks ahead); the POISON DIVE (0x38-0x3B → poison bit → plunge to the bottom zone) contrasted against a normal mushroom (drops one row, no dive); body-follows-head (|ΔV|≥8); vacant-segment skip; determinism + pure `createCentipede`.
- `tests/obstac.test.ts` — 8 tests. The shared OBSTAC (`obstacleCellFor`/`obstacleCode` in `src/core/playfield.ts`): dir=0 reproduces cp1-5's `obstacleCell` (agreement sweep across the gun band), row round-to-nearest, the **8*direction probe-ahead** offset (column shifts by −dir), field-probe reads the cell ahead, off-grid → 0 (no over-read).
- `tests/gun-block.test.ts` — 5 tests (2 RED + 3 controls). AC-4: `movePlayer(player, counts, field)` blocks the gun from gliding into a mushroom cell horizontally (CT-30) and vertically (CT-31); a clear target still moves; the 3-arg empty-field form equals the 2-arg form; edge bounds still clamp (cp1-5 preserved).
- `docs/rom-study/claims/09-centipede-train.json` — **31 claims (CT-1..CT-31)**, machine-extracted (never hand-typed) and byte-verified: `check-citations 160/160 green`.

**Tests Written:** 27 (14 centipede + 8 obstac + 5 gun-block) covering all 4 ACs. **Status:** RED — 24 fail self-describing (feature absent / gun glides through); 3 gun-block controls green.

### QUARRY — key transcribed semantics (rev-4 CENTI4.MAC, .RADIX 16; trailing `.` = decimal)
| Semantic | Where | Claim |
|---|---|---|
| NCENT = 12 segments, slots 0-11 | CENDE4.MAC:119 (`=12.` decimal) | CT-1 |
| pic bits: D6 clear=head, D5=poison(0x20), D7=vacant(0x80) | CENDE4.MAC:132-133 | CT-2 |
| head pic 0x03 @ VPOS 0xF8 / HPOS 0x80 (enters top-centre) | CENTI4.MAC:477/489/492 | CT-3/4/5 |
| body pic 0x42 (alt 0x47), spaced ±8px, copies head heading; DEAD=NCENT | CENTI4.MAC:498/512/506/549 | CT-6/7/8/9 |
| MOTION iterates all NCENT slots; skips vacant (bit7) | CENTI4.MAC:1284/1292 | CT-11/12 |
| horizontal march H+=MOBJDH; upright descent V−=MOBJDV (V=0xF8 top→8 bottom) | CENTI4.MAC:1447/1443 | CT-13/14 |
| head consults OBSTAC ahead; edge/normal-mush (≥0x3C) → turn | CENTI4.MAC:1360/1363/1365 | CT-16/17 |
| **poison mush 0x38-0x3B → set poison bit; poisoned head DIVES every frame** | CENTI4.MAC:1368/1341 | CT-18/19 |
| turn = COMP MOBJDH, gated to cell boundary V&7==4 | CENTI4.MAC:1457/1453 | CT-20/21 |
| body follows leader when \|ΔV\|≥8; head-at-bottom(V<9) sets NEWD; clears poison at bottom | CENTI4.MAC:1336/1310/1396 | CT-22/23/24 |
| **OBSTAC probes 8*direction AHEAD** (gun/shot dir=0, centipede ±speed) | CENTI4.MAC:1711/1713 | CT-28 |
| OBSTAC col=((0xF7−H')&0xF8)>>3, row=(V+4)>>3 (== cp1-5 dir=0, PS-16/17/18) | CENTI4.MAC:1715/1720 | CT-29 |
| gun blocked H/V: `LDY I,0 / JSR OBSTAC / BNE` → restore old PLAYH/PLAYV | CENTI4.MAC:1503/1536 | CT-30/31 |

### The Dev contract (build in GREEN)
1. `src/core/playfield.ts` (add — OBSTAC transcribed ONCE): `obstacleCellFor(h,v,dir): {h,v}` = `{h: ((0xF7-(h+8*dir))&0xF8)>>3, v: (v+4)>>3}`; `obstacleCode(field,h,v,dir): number` = the cell code there (0 if empty/off-grid, never over-read). Refactor `player.ts`'s `obstacleCell(h,v)` → `obstacleCellFor(h,v,0)`.
2. `src/core/player.ts`: `movePlayer(player, counts, field?)` — after each axis's TBLMT+clamp, if `obstacleCode(field, candidate, 0)!==0` keep the OLD coord (horizontal first, then vertical on the updated column). No field → bounds-only (cp1-5).
3. `src/core/centipede.ts` (new): the constants (CT-1..CT-9 + bit masks) + `Segment {h,v,dh,dv,pic}` + `createCentipede()` (CENTPC wave-1, seed-free) + `stepCentipede(segs, field)` (MOTION: march, OBSTAC turn/drop+reverse, poison dive, body-follow, vacant-skip). Pure core — purity.test auto-binds it; no browser globals (even in comments). See Delivery Findings for the last-head-speedup / leg-anim / DELAY notes.
4. `src/core/sim.ts`: wire `movePlayer(state.player, input, state.playfield)` (pass the field so the gun block goes live) — the demo's live faithfulness depends on it.

### Rule Coverage (AC → tests)
| AC | Requirement | Tests |
|---|---|---|
| AC-1 | every constant radix-cited + claims entry; `citations` green | 09-centipede-train.json (CT-1..31, byte-verified 160/160); constants mirrored + asserted in centipede.test "exports the CENTPC constants" |
| AC-2 | 12 segments enter+march; mushroom/edge → drop+reverse; deterministic seeded | centipede.test CENTPC (4) + march (1) + turn/edge (2) + determinism/vacant (3) |
| AC-3 | poisoned dive from a debug-seeded poison field | centipede.test dive (2, poison-vs-normal contrast) |
| AC-4 | gun blocked H+V via MOVE's OBSTAC; cp1-5 tests stay green | gun-block.test (2 RED block + 3 controls); obstac.test (8, the shared routine) |

**Self-check:** every test has a meaningful assertion (no `assert(true)`, no `let _ =`); the 3 gun-block controls are green-by-design (not vacuous — they pin the no-regression + no-over-block contract). RED failures verified to fail for the RIGHT reason (feature absent / gun glides 0x86→0x8A, 0x10→0x14).

### RED verification evidence
- Full suite (`npx vitest run`): `Test Files 3 failed | 21 passed (24)` · `Tests 24 failed | 285 passed (309)`. The 3 failed files are exactly the 3 new ones; all 21 baseline files stay green (the 282 cp1/cp2 baseline + 3 gun-block controls = 285).
- `tests/audit/citations.test.ts` — green, including the byte-verify block: `check-citations.mjs → checked 160 claim(s) / all claims verified` (129 prior + 31 new CT-*).
- Centipede + OBSTAC RED = self-describing "not built yet"; gun-block RED = AssertionError (gun glides into the mushroom cell). No harness/import errors.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/playfield.ts` - added the shared OBSTAC routine: `obstacleCellFor(h,v,dir)` (0xF7 column reversal + 8*dir probe-ahead + round-to-nearest row, CT-27/28/29) and `obstacleCode(field,h,v,dir)` (the field probe, off-grid → 0).
- `src/core/player.ts` - `obstacleCell(h,v)` now delegates to `obstacleCellFor(h,v,0)` (byte-identical, cp1-5 tests untouched); `movePlayer(player,counts,field?)` gains the optional `field` arg that blocks the gun from gliding into a mushroom cell (horizontal then vertical, CT-30/31), 2-arg form unchanged.
- `src/core/centipede.ts` (new) - CENTPC wave-1 init (`createCentipede`, 12 segments, seed-free) + MOTION stepping (`stepCentipede`): horizontal march, mushroom/edge turn (drop a row + reverse, never entering the cell), poisoned-head dive to the bottom zone, body-follows-head, vacant-slot skip. Every constant radix-cited to CT-1..31.
- `src/core/sim.ts` - `stepSim` passes `state.playfield` into `movePlayer` so the gun block is live.

**Tests:** 310/310 passing (GREEN) — 285 baseline + 24 RED→GREEN + 1 new purity-sweep entry (centipede.ts joining the it.each core-file scan). Citations: 160/160 verified (`node tools/audit/check-citations.mjs`). Build: `tsc --noEmit && vite build` clean. Lint (`tsc --noEmit`): clean.

**Branch:** `feat/cp2-3-centipede-train` (pushed, commit `082cbdd`)

**Handoff:** To Reviewer

**Handoff:** To Dev (Julia) for GREEN implementation.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 310/310 tests, 160/160 citations, clean build, clean tree, no code smells (no TODO/console/dead code, no browser globals in core, no unseeded rng, all hex constants CT-cited); surfaced the documented MOTION turn-timing deviation for critical review | Confirmed — mechanical gate green; deviation adjudicated in the assessment below (ratified) |

**All received: Yes** (1/1 enabled subagents returned).

## Reviewer Assessment

**Verdict:** APPROVED

**Preflight (personally re-run from centipede/ at HEAD 082cbdd):**
- `npx vitest run` -> **310/310 passing** (24 files). cp1-5 `tests/player.test.ts` untouched & green.
- `node tools/audit/check-citations.mjs` -> **160/160 verified** (129 prior + 31 new CT-*).
- `npm run build` (`tsc --noEmit && vite build`) -> **clean**.
- Race check: branch merge-base == origin/develop tip (beb7f0d); only cp2-3's own two commits ahead; no sibling landed cp2-3 work.

**Data flow traced (gun input -> block):** `stepSim(input)` -> `movePlayer(player, input, state.playfield)` -> per-axis TBLMT + bottom-zone clamp -> horizontal `obstacleCode(field, newH, OLD player.v, 0)` reverts newH on a mushroom (CT-30), then vertical `obstacleCode(field, newH, newV, 0)` reverts newV (CT-31). Verified faithful against CENTI4.MAC:1495-1561: H resolves first probing at old V, V probes the already-updated column. `sim.ts` now passes the field so the block is LIVE in play (the 2-arg form is test-only; wiring confirmed).

**OBSTAC transcription — independently byte-verified against CENTI4.MAC:1701-1734:**
- row `(v+4)>>3` == the ROM's `LSR/LSR/LSR + ADC I,0` (carry = bit 2 of V) rounding — proven equal across cell phases. Matches CT-29.
- column `((0xF7 - (h+8*dir)) & 0xF8) >> 3` == `LDA 0F7 / SBC / AND 0F8` with the `TYA ASL ASL ASL` 8*dir probe. Matches CT-28/29.
- dir=0 delegation is byte-identical to cp1-5's old `(0xF7-h)>>3` across the gun band [0x0b,0xf4] (the added `&0xF8` is a no-op there; agreement sweep test proves it). OBSTAC transcribed ONCE, three consumers (MOTION/gun/shot). Off-grid -> 0, no over-read.

**CENTRAL ADJUDICATION — MOTION turn timing deviation: RATIFIED.**
- **(a) Phantom fidelity? NO.** The module's "DESIGN DEVIATION" comment (centipede.ts:34-44) explicitly states the code does NOT implement the ROM's V&7==4 gating and describes exactly what it does instead (freeze-h until the row bucket flips). The citation gate is green because the CLAIMS (CT-20/21) accurately describe the ROM — byte-verified — NOT because any comment lies about the implementation. `descend()`'s CT-14/20/21 citation is paired with "See the module's Design Deviation note." No green-on-a-lie.
- **(b) Visible? MINOR.** The ROM coasts h by ±(dh) for a couple frames while descending, netting ZERO horizontal displacement (peak ≈±4px at speed 2) before the drop completes; the code freezes h. Both drop exactly one row and reverse dh — the iconic turn behavior is identical. The squared-off-vs-rounded nuance is subtle at arcade scale but IS a real fidelity gap cp2-5's wave-1 demo renders.
- **(c) Ruling: APPROVE, deviation ratified + follow-up required.** Rationale: TEA — the test authority — deliberately pinned MOTION behaviorally in RED and ratified this Design Deviation to avoid over-coupling; Dev's freeze-h is WITHIN that ratified envelope, not a rogue shortcut. Every AC (drop+reverse, poison dive to the bottom zone, body-follow, determinism) is met; citations green; no phantom fidelity. The explicit in-code divergence note satisfies "recorded per repo convention." For a fidelity project I record this as REAL debt (not hand-waved): **SM must file a frame-exact-MOTION follow-up story** (coast-march per CT-20/21; TEA+Dev already routed it to a screenshot-diff fidelity story but no sprint entry exists yet).

**Deviation audit (## Design Deviations):**
- TEA #1 (movePlayer optional 3rd `field` arg) — **ACCEPTED.** Keeps cp1-5 tests green with zero edits; live callers (stepSim) pass the field — verified wired, block is live.
- TEA #2 (OBSTAC transcribed once in playfield.ts; obstacleCell delegates) — **ACCEPTED.** dir=0 byte-identical (verified); no import cycle; three consumers share one routine.
- TEA #3 (Segment[] vs 16 parallel MOBJ* arrays) — **ACCEPTED.** Memory layout, not semantics; TS-idiomatic, directly tested.
- TEA #4 (MOTION pinned behaviorally, not per-frame) — **ACCEPTED.** Deliberate anti-over-coupling; frames the envelope Dev's deviation lives in.
- Dev #1 (freeze-h turn timing) — **ACCEPTED / RATIFIED** per the central adjudication above; follow-up required.
- Dev #2 (sim carries no centipede; only field pass wired) — **ACCEPTED.** Minimalist discipline; `tests/sim.test.ts` has zero centipede refs (verified) — no speculative untested state; routed to cp2-5.

**Findings by severity:**
| Severity | Issue | Location |
|----------|-------|----------|
| [MEDIUM] (non-blocking, ratified) | frame-exact MOTION turn timing (freeze-h vs ROM coast-march); honestly documented, AC-satisfying — file a fidelity follow-up | `src/core/centipede.ts` descend()/stepHead() |
| [LOW] (non-blocking) | edge constants 0xF0/0x10 radix-cited in comments but no dedicated claims entry (AC-1 letter); values byte-verified | `docs/rom-study/claims/09-centipede-train.json` |
| [LOW] (non-blocking) | post-bottom head behavior undefined (marches at V=8; edge-turn there drives V<8); part of the routed NEWHD gap | `src/core/centipede.ts` |
| [LOW] (informational) | OBSTAC off-grid->0 for H'>0xF7 (h in [0xE8,0xEF] at dir=2) vs ROM left-margin col-0; immaterial (edge check fires at 0xF0 within 1-2 frames) | `src/core/playfield.ts` |

**Verified-good observations:** OBSTAC formula byte-exact vs source (row + column); MOVE block order faithful (H@oldV, V@updatedCol); dir=0 delegation byte-identical + cp1-5 tests untouched; core purity clean (no browser tokens incl. comments — auto-scanned by the recursive sweep); determinism (no rng/Math.random, createCentipede seed-free); body-follow reads the pre-frame leader matching the ROM's high->low slot order; no NEWHD scope creep. No Critical or High findings.

**Handoff:** To SM for finish-story. PR opened against develop (do not merge; human-authorized merge per project convention).