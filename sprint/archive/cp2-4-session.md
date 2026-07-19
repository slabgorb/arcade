---
story_id: "cp2-4"
jira_key: "cp2-4"
epic: "cp2"
workflow: "tdd"
---
# Story cp2-4: Shooting the train — OVRLAP hit, EXPLOD animation, mushroom drop, NEWHD split, segment scoring

## Story Details
- **ID:** cp2-4
- **Jira Key:** cp2-4
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T09:28:51Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T08:44:16Z | 2026-07-19T08:45:13Z | 57s |
| red | 2026-07-19T08:45:13Z | 2026-07-19T09:09:32Z | 24m 19s |
| green | 2026-07-19T09:09:32Z | 2026-07-19T09:15:06Z | 5m 34s |
| review | 2026-07-19T09:15:06Z | 2026-07-19T09:28:51Z | 13m 45s |
| finish | 2026-07-19T09:28:51Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking, quarry correction): the story's ROM line hints are misattributed. **OVRLAP (CENTI4.MAC:1746) is NOT the shot-vs-segment collision** — it is the inter-segment overlap check (ENTRY (X)=head, EXIT carry=overlap), called only from CENTPC:411 and MOTION:1371. The shot-vs-segment collision is the **SHOOT loop (:2171-2303)**. Likewise **NEWHD (:1647) is the top-edge fresh-head spawn** (NEWD-gated, enters at 0xFC/DV=2), NOT the split — the split is `AND I,0BF / STA X,MOBJP+1 ;NEW HEAD` at **:2282-2283** (inside SHOOT). Tests + claims (CT-32/39/45) cite the correct routines; recorded in open-questions.md #7. The ACs are unchanged — this only corrects *which* ROM addresses back them. *Found by TEA during test design.*
- **Gap** (non-blocking, route to cp2-5 or a fidelity follow-up): **cp2-3's MOTION obstacle probe uses the wrong direction magnitude.** `stepHead` passes `dir = seg.dh` (= ±CENT_SPEED = ±2) to `obstacleCode`, probing `8*2 = 16px` (TWO cells) ahead. The ROM's **CALLS (:447, "NOTE-TIS USES MOBJDH OF 1 OR FF")** normalizes the probe direction to the *sign* (±1), so OBSTAC always looks exactly ONE 8px cell ahead regardless of CENTIS speed (CT-48). cp2-3's centipede therefore turns one cell EARLIER than the ROM. The mushroom drop THIS story pins uses the correct ±1 (CT-45/obstacleCellFor(h,v,sign(dh))). Fix: change cp2-3's `stepHead` probe from `seg.dh` to `Math.sign(seg.dh)`. Affects `src/core/centipede.ts` stepHead. *Found by TEA during test design.*
- **Gap** (non-blocking, cp2-5 wiring): **a mushroom in the shot's cell takes priority over a segment there.** SHOOT reaches the segment loop (11$) only when the shot's cell has no mushroom (`BEQ 11$`, :2150). `resolveShotHit` handles segments only; cp2-5 must wire `stepShot` (cp1-5 mushroom/off-top) FIRST and call `resolveShotHit` only when the shot survived that frame still live. Pinned in the Dev contract, not unit-tested here (needs the full pipeline). *Found by TEA during test design.*
- **Gap** (non-blocking, narrows cp2-3's routing): **NEWHD (the top-edge head spawn, :1647) is still unbuilt.** This story builds the shot-kill SPLIT (slot X+1 promotion) but not the NEWD-gated loop that adds fresh heads entering from the 0xFC edge (cp2-3 pinned the NEWD trigger as CT-23). cp2-3 routed "NEWHD" here; the ACs are specifically the split, so the edge-spawn loop remains for cp2-5 (the wave-1 demo) or a train-completeness follow-up. Affects `src/core/centipede.ts` + `src/core/sim.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking, render/cp2-1): **explosion picture→stamp mapping is a shell concern.** The core pins the EXPLOD pic-byte sequence 0xFF→0xF9 (CT-43/44); "stamps from cp1-3 only — no new pixels" is satisfied at the pic-byte level (the exploding pics reuse existing motion-object stamps). Rendering the explosion frames (pic→sprite) is render's job — flag for whoever wires exploding-segment draw. *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings during implementation. TEA's contract (constants, `resolveShotHit`, `stepExplosions`, MUSHER guards) matched the 22 RED tests exactly; no gaps or conflicts surfaced while implementing. The three routing items TEA already filed (cp2-3 `stepHead` probe fix, cp2-5 mushroom-priority wiring, NEWHD edge-spawn) were left untouched per the Dev contract's explicit scope note — confirmed by `git diff --stat` showing only `src/core/centipede.ts` changed.

### Reviewer (code review)
- **Gap** (non-blocking, route to cp2-5): **`resolveShotHit` omits the SHOOT loop's "OFF TOP OF SCREEN" segment guard (CENTI4.MAC:2179-2182, `LDA X,MOBJV / EOR CKF8 / CMP I,0F8 / BCS 132$`).** The impl gates a target on `isVacant(pic)` + the two windows only; the ROM additionally skips any segment at `MOBJV >= 0xF8`. A live segment at the entry row V=0xF8 (a head marching across the top) with the shot within `|dV| < 5` — reachable in cp2-5 gameplay when the climbing shot lands at v∈{0xF4..0xF9} (post-`stepShot` advance from v<0xF3) — is killed by the impl but skipped by the ROM. Not reachable in cp2-4's unit scope (no wiring) and entangled with cp2-5's `stepShot`→`resolveShotHit` ordering, which sets the shot's V range. cp2-5 must either transcribe the `MOBJV >= 0xF8` skip into `resolveShotHit` or prove the wired shot V never enters a top-row segment's window. Affects `src/core/centipede.ts` `resolveShotHit`. Uncited (no CT claim). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): **`dropMushroom`'s out-of-bounds guard (`src/core/centipede.ts:234`) is uncited and undocumented at the write path.** `obstacleCellFor` legitimately overshoots to `cell.h`=30/31 for a kill at the extreme march edges (h=0xF0 marching right → 31; h=0x0E marching left → 30); the guard then silently no-ops the drop. This is the CORRECT faithful reduction (matches playfield.ts's documented "overshoot-is-a-no-op" policy — on hardware col 30/31 writes into MOBJ RAM, which this grid-only model has nothing to corrupt), but unlike the adjacent occupied/reserved guards it carries no `CT-*` tag and the docstring doesn't mention it. Add a one-line doc/citation note and (optionally) a CT-cited edge-kill test. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, test hardening — route to a follow-up or cp2-5): **the collision-window boundaries and two mushroom side-effects are unpinned.** No test asserts `|dV|`=4 hit / =5 miss or `|dH|`=5 hit / =6 miss, so an off-by-one (`>=`→`>`) in the windows would pass all 22 tests (the code IS correct — verified by executing the branch; AC-1 pins the constants by value, but the behavioral boundary of the central collision constants is untested). Also: the upper-screen-drop test never asserts `field.mush` stays 0 (an always-bump bug would pass); reserved rows 0 and 1 are untested (row 1 is reachable — a segment resting at `CENT_BOTTOM_V`=8 maps to `cell.v`=1); the head-kill test doesn't verify slot-1 promotion; and the AC-4 crossings are geometrically aligned to hit at exactly dH=dV=0, so they don't validate window SIZE under motion. All paths verified correct — these are coverage gaps, not defects. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, latent contract gap): **`Math.sign(seg.dh)` returns 0 for `dh===0`**, probing the segment's own cell; ROM CALLS (CT-48) treats `MOBJDH=0` as +1 (`BMI` branches only on negative). Not reachable today (`createCentipede`/`descend`/`dive` only produce dh=±2), but `resolveShotHit`/`dropMushroom` are exported public fns with no branding to prevent a dh=0 segment. Suggest `seg.dh < 0 ? -1 : 1`. Affects `src/core/centipede.ts:233`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **`resolveShotHit` consumes the shot without re-gluing it to the gun:** Spec said "a collision fn consuming the shot from sim/player state." Tests pin `resolveShotHit(shot, segs, field) -> {segs, shot, scored, hitIndex}` where a hit sets `shot.live=false` (consumed) but leaves its position; the ROM's `RSHOT` re-glue to `PLAYH/PLAYV+4` (:2303) needs player state and is cp2-5's `stepShot`/`shotAtRest` job. Reason: keeps the collision fn free of player coupling while still honoring the one-shot economy (CT-42). The field is mutated in place for the mushroom drop (cp1-5's convention).
- **The segment array is positionally the MOBJ slot table; the tail guard is `hitIndex === segs.length-1`:** Spec/ROM is `CPX I,NCENT-1` (:2278, NCENT=12 fixed). Tests pin the "last slot" promotion guard as `segs.length-1`, not a hardcoded 11. Reason: `createCentipede()` returns exactly 12 and vacant slots stay in-array (cp2-3 model), so array index == slot index; for the real train `length-1 == NCENT-1 == 11` (CT-40). Bespoke short arrays in the overlap/dead-trailing tests exercise the mechanism without depending on the literal 11.
- **`stepExplosions` is a separate function from `stepCentipede`:** Spec/ROM runs EXPLOD (:963) and MOTION (:1277) as separate mainloop calls; MOTION skips exploding segments (bit 7). Tests pin `stepExplosions(segs)` on its own. Reason: mirrors the ROM's two-routine structure — cp2-5 calls both per frame. `stepCentipede` (cp2-3) already skips bit-7 segments, so an exploding segment animates via `stepExplosions` while `stepCentipede` leaves it be.
- **Collision windows tested point-vs-window at the shot's given position:** Spec/ROM checks the segment collision against the POST-advance SHOTV (:2185, after the +7 at :2142) with SHOTH constant. Tests pass the shot's `(h,v)` directly and pin `|dV|<5` / `|dH|<6` (CT-33/34). Reason: cp2-5's `stepShot` advances the shot before `resolveShotHit`; the unit tests exercise the window arithmetic directly, and the AC-4 crossing test drives it under real +7/frame motion.

### Dev (implementation)
- No deviations from spec. `resolveShotHit`/`stepExplosions`/the six constants/`dropMushroom` were implemented exactly to TEA's contract (high->low scan, `Math.sign(dh)` drop direction, `segs.length-1` tail guard, MUSHER's occupied/reserved-row/lower-court guards, `pic & ~BODY_BIT` promotion). All 22 RED tests turned green with no re-seating and no test edits.

## Sm Assessment

**Setup complete, ready for RED.** cp2-4 (4pt feature, tdd) — shot-vs-segment combat:
OVRLAP :1741, EXPLOD :961, mushroom-drop placement, NEWHD :1643 split, head/body scoring
from rev-4 code (CENTIP.DOC rev-1 prose diffed first per open question 4; code wins).

- **Session/context:** created from the authoritative epic YAML; NEWHD explicitly belongs
  here (routed out of cp2-3); slot-14 one-shot economy unchanged; moving-shot tests must
  approach from both directions (asteroids lesson).
- **Branch:** `feat/cp2-4-shooting-the-train` off origin/develop at ea415b5 (cp2-7).
- **Tree state:** centipede.ts core + shared OBSTAC landed in cp2-3; sim wiring of the
  train is cp2-5's; hitbox alignment fixed in cp2-7.
- **Jira:** skipped — none on this project.
- **Mode:** peloton subagent mode — tea/reviewer→opus, dev→sonnet; merges user-authorized.

## Tea Assessment

**Tests Required:** Yes — shot-vs-train combat, all new core behaviour behind the live citation gate.

**RED commit:** `66a9b59` on `feat/cp2-4-shooting-the-train` (off ea415b5 = cp2-7). Working tree clean; NO implementation written.

### Test Files (1 new + claims extension)
- `tests/shoot-train.test.ts` — **23 tests** (22 RED feature + 1 green provenance). Shot-vs-segment combat (`src/core/centipede.ts`, GREEN builds it): the SHOOT collision windows, head/body scoring, the NEWHD split, the OBSTAC-cell mushroom drop, the one-shot economy, moving-shot crossings from both directions, and the EXPLOD animation. Dynamic-import loader throws self-describing "combat not built yet" so RED reddens for the FEATURE, not a stack trace.
- `docs/rom-study/claims/09-centipede-train.json` — **+17 claims (CT-32..CT-48)**, machine-extracted (never hand-typed) + byte-verified: `check-citations 177/177 green` (160 prior + 17 new).
- `docs/rom-study/open-questions.md` — open question 4 ruling recorded (item #7).

**Tests Written:** 23 covering all 4 ACs. **Status:** RED — 22 fail self-describing (feature absent); 1 provenance green (drop code == MUSHROOM_FULL 0x3F).

### QUARRY — key transcribed semantics (rev-4 CENTI4.MAC, .RADIX 16; trailing `.` = decimal)
| Semantic | Where | Claim |
|---|---|---|
| shot-vs-segment collision is the **SHOOT loop**, scans slots 13→0, first (highest) hit wins | :2171/:2292-2294 | CT-32 |
| V window `\|MOBJV−SHOTV\| < 5`; H window `\|MOBJH−SHOTH\| < 6` | :2202 / :2266 | CT-33/34 |
| **body = 10, head = 100** (BCD via SED; head sets MSB via INC TEMP1) | :2270 / :2274-2275 / :1951 | CT-35/36/37 |
| **open Q4 ruling:** CENTIP.DOC rev-1 body=10/head=100 **AGREES** with rev-4 — no divergence | CENTIP.DOC:113/114 | CT-38 |
| **NEWHD split:** slot X+1 → new head (`AND I,0BF` clears bit 6), guarded (last slot / next-dead) | :2282-2283 / :2278-2281 | CT-39/40 |
| kill → explosion pic **0xFF**; shot re-armed (RSHOT) after the kill | :2301-2302 / :2303 | CT-41/42 |
| **EXPLOD:** decrement pic each frame, finished at **0xF9** (6 frames 0xFF→0xFA) | :969 / :967-968 | CT-43/44 |
| **mushroom drop:** CALLS(dir=**±1**)+OBSTAC → cell one 8px step ahead; MUSHER writes 0x3F, guarded | :2287 / :444 / :1640 | CT-45/46/48 |
| drop bumps the lower-screen court for row < 0x0C (mirror of cp1-5 MUSHDC) | :1637 / :1634-1635 | CT-47 |

### The Dev contract (build in GREEN, `src/core/centipede.ts`)
1. Constants: `SEG_HIT_H_WINDOW=6`, `SEG_HIT_V_WINDOW=5`, `SCORE_BODY=10`, `SCORE_HEAD=100`, `EXPLOSION_PIC=0xFF`, `EXPLOSION_DONE=0xF9` (all CT-cited).
2. `stepExplosions(segs): Segment[]` — EXPLOD (:963): any exploding segment (pic ≥ 0xFA) decrements pic by 1, resting at 0xF9; live segments + positions untouched.
3. `resolveShotHit(shot, segs, field): {segs, shot, scored, hitIndex}` — SHOOT collision (:2171-2303). Only a LIVE shot hits; scan slots high→low; first live (bit-7-clear) segment within `|dH|<6` AND `|dV|<5` is killed: score (head 100 / body 10), promote the trailing slot (`hitIndex+1`, when `< segs.length` and alive) to a head via `pic & ~0x40`, drop a mushroom at `obstacleCellFor(seg.h, seg.v, sign(seg.dh))` (MUSHER-guarded: skip if occupied or row ∈ {0, 1, 0x1F}; bump `field.mush` if row < 0x0C; write 0x3F), set the killed slot to 0xFF, and consume the shot (`live=false`). Miss/resting shot → `{segs, shot, scored:0, hitIndex:-1}`, field untouched. Field mutated in place (cp1-5 convention).
4. **cp2-5 wiring (not built here):** per frame call `stepExplosions` + `stepCentipede`; run `stepShot` (mushroom/off-top) FIRST, then `resolveShotHit` only if the shot survived still live (mushroom priority, :2150). Also fix cp2-3's `stepHead` probe `seg.dh`→`Math.sign(seg.dh)` (CT-48 — see Delivery Findings).

### Rule Coverage (AC → tests)
| AC | Requirement | Tests |
|---|---|---|
| AC-1 | every constant radix-cited + claims entry; `citations` green | 09-centipede-train.json CT-32..48 (177/177 byte-verified); "the transcribed combat constants" (2) |
| AC-2 | mid-train kill → two trains; head/body scoring; deterministic; CENTIP.DOC divergence recorded | split (3) + scoring (2) + determinism/high-slot-first (2); open-questions #7 |
| AC-3 | mushroom in the killed cell (exact ROM placement); one-shot economy holds | drop/bump/occupied/reserved-row (4) + economy (4) |
| AC-4 | moving-shot collision, BOTH directions | AC-4 crossing left+right (2) + anti-tunnel invariant (1) |

### RED verification evidence
- `npx vitest run`: **Test Files 1 failed | 25 passed (26)** · **Tests 22 failed | 323 passed (345)**. The 1 failed file is exactly the new one; all 25 baselines (cp1/cp2 + citations) stay green.
- `node tools/audit/check-citations.mjs` → **checked 177 claim(s) / all claims verified**.
- `npm run build` (`tsc --noEmit && vite build`) → **clean** (RED is tsc-clean — no cp2-7 build-break repeat).
- The 22 failures are ALL the self-describing "combat not built yet" throw — no harness/import/wrong-reason failures; the 1 green provenance test reads only committed data.

**Handoff:** To Dev (Julia) for GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `centipede/src/core/centipede.ts` — added the cp2-4 combat surface: constants `SEG_HIT_V_WINDOW`/`SEG_HIT_H_WINDOW`/`SCORE_BODY`/`SCORE_HEAD`/`EXPLOSION_PIC`/`EXPLOSION_DONE` (CT-33/34/35/36/41/44); `ShotHit` interface; `dropMushroom(seg, field)` (MUSHER, CT-45/46/47/48, private helper); `resolveShotHit(shot, segs, field) -> ShotHit` (SHOOT collision, CT-32/39/40/42); `stepExplosions(segs) -> Segment[]` (EXPLOD, CT-43/44). No other file touched — `stepHead`'s cp2-3 probe bug (TEA's Gap finding) and the cp2-5 sim wiring were explicitly left for their own stories.

**Tests:** 345/345 passing (GREEN) — all 22 previously-RED tests in `tests/shoot-train.test.ts` now pass, 323 prior baseline tests unaffected.
**Citations:** `node tools/audit/check-citations.mjs` → 177/177 claims verified (no claims file touched — TEA's CT-32..48 dossier used as-is).
**Build:** `npm run build` (`tsc --noEmit && vite build`) → clean.
**Branch:** `feat/cp2-4-shooting-the-train` (pushed)

**Handoff:** To next phase (review)

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight (self-run: `npm test` / `check-citations.mjs` / `npm run build`) | Yes | clean | 345/345 tests, 177/177 citations, build clean | Confirmed — gates green, no code smells |
| 2 | reviewer-edge-hunter | Yes | findings | 1 (Math.sign(0) drop-dir vs CALLS; latent, unreachable today) | Confirmed as LOW non-blocking; boundary/empty/last-slot paths verified correct |
| 3 | reviewer-silent-failure-hunter | Yes | findings | 1 (OOB drop guard uncited/undocumented at write path) | Confirmed as LOW non-blocking (correct faithful reduction, needs doc/citation) |
| 4 | reviewer-test-analyzer | Yes | findings | 10 (window boundaries, mush==0, reserved rows 0/1, head-split, off-center motion crossings, CombatModule cast) | Confirmed the material subset as LOW test-hardening; code verified correct |
| 5 | reviewer-simplifier | Yes | findings | 3 (dead `trailing!==undefined`, unreachable `Math.max`, dropMushroom bounds/offset dup) | Confirmed as LOW/optional cleanup; harmless |

**All received: Yes** — 5/5 specialists returned; all findings confirmed/dismissed above.

## Reviewer Assessment

**Verdict:** APPROVED

**Gates personally re-run** (not taken on faith): `npm test` → **345/345** (26 files); `node tools/audit/check-citations.mjs` → **177/177 verified**; `npm run build` (`tsc --noEmit && vite build`) → **clean**. Race check: `feat/cp2-4-shooting-the-train` sits cleanly off `origin/develop`@ea415b5 with exactly the RED (66a9b59) + GREEN (b7965f8) commits; no sibling landed cp2-4 work.

**Quarry-correction audit — TEA's re-attribution VERIFIED CORRECT against the vendored rev-4 CENTI4.MAC (I read the source myself, not the claims):**
- **Shot-vs-segment collision = SHOOT loop (:2171-2303), NOT OVRLAP (:1746).** Confirmed: the SHOOT loop reads SHOTV/SHOTH, scans slots 13→0, applies `CPY I,5/BCS` (|dV|<5) and `CPY I,6/BCS` (|dH|<6), scores body(:2270)/head(:2274-5), splits (:2282-3), drops a mushroom (:2287), stamps 0xFF (:2302), re-arms (:2303). OVRLAP (:1746) is the inter-segment overlap check (ENTRY X=head, EXIT carry=overlap), called ONLY from CENTPC:411 and MOTION:1371 — nothing to do with the shot. The original epic/story attribution was wrong; TEA's correction is right.
- **Split (:2282-3) ≠ NEWHD (:1647).** Confirmed: NEWHD is "PUT IN NEW HEAD AFTER DEAD=1" — it finds a dead slot and spawns a fresh head entering at MOBJH=0xFC/0x04, MOBJV=0x40 (the top edge). The split promotes the trailing slot in place. Distinct routines; NEWHD correctly absent from this story.
- **`AND I,0BF` clears bit 6 only** (0xBF = ~0x40): confirmed at :2282; impl's `s.pic & ~BODY_BIT` (BODY_BIT=0x40) matches. Body 0x42→0x02 / 0x47→0x07 becomes a valid head picture; poison bit preserved.
- Collision windows (strict `<`), BCD reads (body 10 / head 100), MUSHER guards (occupied, rows {0,1,0x1F}, court bump <0x0C), CALLS sign-normalized drop direction, and EXPLOD 0xFF→dec→rest-at-0xF9 all byte-match the source. All 17 new CT line-pins (CT-32..48) verified against the file.

**Data flow traced:** `Shot{h,v,live}` → `resolveShotHit` → high→low scan, first live segment within both windows wins (verified first-match-and-break) → kill (0xFF) + score (head/body) + guarded split (`hitIndex+1<length && live`) + `dropMushroom` (mutates `field` in place, guarded) → `ShotHit{segs,shot(live=false),scored,hitIndex}`. Field is provably untouched on the miss and resting-shot (`!shot.live`) paths. Immutable `.map` (new objects for killed/promoted slots, refs shared for the rest) — idiomatic to cp2-3; determinism test uses deep-equal, so ref sharing is safe.

**Pattern observed:** high→low first-match-wins scan mirroring the ROM's `LDX I,13.` descending loop; `stepExplosions` kept a separate routine (ROM EXPLOD:963 ≠ MOTION:1277) — an exploding 0xFF segment is `isVacant`-skipped by `stepCentipede` and animated only by `stepExplosions`, matching CT-12/41-44. `src/core/centipede.ts:255-289`.

**Error handling:** no throws; empty/single-element `segs`, hit-on-last-slot, dead/exploding trailing slot, and out-of-grid drop cells all handled without out-of-range reads (edge-hunter executed these branches). Pure core — no I/O, no async, no injection/secret surface; all `Uint8Array` writes bounds-guarded.

**Scope confirmed:** `git diff --stat` = 4 files (`centipede.ts`, the claims JSON, open-questions.md, the new test). `sim.ts` untouched (wiring is cp2-5), no render changes, NEWHD edge-spawn correctly absent, cp2-3's known `stepHead` probe bug left untouched (routed, per TEA's Delivery Finding — no `stepHead` diff), one-shot economy (cp1-5) not regressed.

**Findings (all NON-BLOCKING — zero Critical/High; code verified correct for every in-scope/tested case):**

| Severity | Issue | Location | Disposition |
|----------|-------|----------|-------------|
| [MEDIUM] | SHOOT "off top of screen" segment guard (MOBJV>=0xF8) not transcribed — top-row (V=0xF8) segment killable that the ROM skips; reachable only after cp2-5 wiring | `src/core/centipede.ts` `resolveShotHit` (ROM :2179-2182) | Route to cp2-5 (Delivery Finding) |
| [LOW] | OOB drop guard is the correct faithful reduction but uncited/undocumented at the write path | `centipede.ts:234` | Doc/citation note + optional edge-kill test |
| [LOW] | Test hardening: window boundaries (`|dV|`=4/5, `|dH|`=5/6), upper-screen `field.mush==0`, reserved rows 0/1, head-kill split, off-center motion crossings all unpinned | `tests/shoot-train.test.ts` | Follow-up hardening (code is correct) |
| [LOW] | `Math.sign(seg.dh)`→0 for dh=0 diverges from CALLS (+1); not reachable today | `centipede.ts:233` | Latent contract nit |
| [LOW] | Dead defensive code (`trailing!==undefined`, `Math.max` clamp) + bounds/offset duplicated from `obstacleCode` | `centipede.ts:269/289/234` | Optional simplification |

**Deviation audit** (session `## Design Deviations`): all four TEA deviations **ACCEPTED** — (1) shot consumed without RSHOT re-glue (re-glue is cp2-5's `stepShot`, CT-42); (2) tail guard `segs.length-1` == ROM `CPX I,NCENT-1` for the real 12-slot train (:2278); (3) `stepExplosions` separate from `stepCentipede` mirrors ROM EXPLOD:963 vs MOTION:1277; (4) windows unit-tested point-vs-window, driven under real motion by AC-4. Dev logged "no deviations" — confirmed by the diff (built exactly to the contract). No undocumented deviations found.

**Why APPROVED despite the MEDIUM:** the off-top-guard divergence is narrow (single top row V=0xF8), non-crashing, out of cp2-4's tested/wired scope, and genuinely determined by cp2-5's shot-V range — it is the correct kind of upstream finding to route forward, not a blocker. All in-scope behavior byte-matches the ROM; every gate I ran myself is green.

**Handoff:** To SM for finish-story. PR opened against `develop` (not merged — human-authorized merge per project rule).