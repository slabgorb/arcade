---
story_id: "cp2-9"
jira_key: "cp2-9"
epic: "cp2"
workflow: "tdd"
---
# Story cp2-9: Frame-exact MOTION turn — implement the ROM's coast-march during descent (V&7==4 gate, CT-20/21) replacing the freeze-h simplification

## Story Details
- **ID:** cp2-9
- **Jira Key:** cp2-9
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-19T14:26:33Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T13:39:14Z | 2026-07-19T13:40:17Z | 1m 3s |
| red | 2026-07-19T13:40:17Z | 2026-07-19T14:03:27Z | 23m 10s |
| green | 2026-07-19T14:03:27Z | 2026-07-19T14:09:19Z | 5m 52s |
| review | 2026-07-19T14:09:19Z | 2026-07-19T14:26:33Z | 17m 14s |
| finish | 2026-07-19T14:26:33Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings at setup.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking, corrects a cp2-3 latent infidelity): the source mandates the poison DIVE also coasts. A poisoned head routes to the SAME vertical-step handler (CENTI4.MAC 10$ `AND I,20 / BNE 15$` → 15$) and reaches the SAME 20$ H-march + V&7==4 reversal gate (CT-21), so it zigzags `dh` every half-cell of descent (net-zero per cell), it does not slide straight. cp2-3's `dive()` marches `h` monotonically and never reverses — a latent H-infidelity not caught by cp2-3's minV-only dive test. cp2-9 corrects it via the unified V&7-derived descent (CT-19+CT-21); pinned RED in `tests/motion-coast.test.ts` ("the dive zigzags"). A unified `descend` for both turn and dive gets this for free. Affects `src/core/centipede.ts` `dive()`. *Found by TEA during test design.*
- **Question** (non-blocking, for Dev to VERIFY in GREEN): **no existing pin baked freeze-h timing** — verified by analysis AND empirically (all 396 baseline stay green with the RED added). Two are the closest and Dev must re-confirm green AFTER the coast lands: (1) `sim-assembly.test.ts` "±1 probe" asserts a `dh=2` head enters col 13 but NOT the mushroom col 12 — the coast peak (+4px) stays in col 13 (traced: detect at h=0x88, peak h=0x8C=col13; the mushroom col 12 starts at h=0x90), safe; (2) `centipede.test.ts` edge test allows `h <= 0xF0+8` — the coast peak (~0xF4) is inside that tolerance. Both survive the coast. Affects `tests/sim-assembly.test.ts`, `tests/centipede.test.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking, test-hardening observation): cp2-3's `centipede.test.ts` "never entering the cell" turn test checks cells BEHIND the head (`cellOf(head.h-8/-16)` = cols 15/16, opposite the marching direction) rather than the mushroom cells ahead (cols 13/12), so it passes vacuously under both freeze-h and coast. cp2-9's frame-exact + "never enters the obstacle cell" assertions now pin the real ahead-of-head behaviour. Not a defect (the coast genuinely never enters the cell); recording the weak assertion. Affects `tests/centipede.test.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Question resolved** (TEA's GREEN-phase verification ask): re-ran `tests/sim-assembly.test.ts` and `tests/centipede.test.ts` in isolation after the coast landed — both green, both unmodified (`git diff --stat` shows only `src/core/centipede.ts` touched). TEA's traced-safe analysis (±1 probe stays in col 13; edge tolerance covers the +4px peak) holds empirically. No re-baseline needed. Affects `tests/sim-assembly.test.ts`, `tests/centipede.test.ts`. *Found by Dev during GREEN verification.*
- No other upstream findings during implementation.

### Reviewer (code review)
- **Improvement** (non-blocking): `tests/shoot-train.test.ts:71-78` declares a *test-local* mirror `interface Segment` that still carries a `turning?: boolean` field. It is independent of the real `src/core/centipede.ts` `Segment` (not imported), a harmless structural superset, so it compiles + passes — but it now references the retired `turning` concept. Affects `tests/shoot-train.test.ts` (drop the stale `turning?` from the local mirror on the next touch of that file). Out of cp2-9's centipede.ts-only scope; recorded for hygiene. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the poison-dive zigzag pin (`tests/motion-coast.test.ts` "the diving head reverses MOBJDH…") asserts only `signChanges > 0`, not the exact per-cell reversal count / net-zero. It is transitively pinned frame-exactly because the dive runs the *same* `descend()` the turn's frame-exact test locks — but a dedicated frame table for the dive would harden it. Affects `tests/motion-coast.test.ts`. *Found by Reviewer during code review.*
- **Gap** (non-blocking): no test asserts H stays within `[0x00,0xFF]` (no `wrapH` under/overflow) during the long edge-coast runs. Reviewer proved by hand + independent ROM trace that the shipped wave-1 config keeps H in `[0x0A,0xF4]` (turn triggers at the first even H past each edge, coast peak ±4px), so a wrap is unreachable — but the 8000-frame containment pin checks V bounds only. Affects `tests/sim-assembly.test.ts` / `tests/motion-coast.test.ts` (add an H-bounds assertion to the containment loop). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No design deviations logged during setup.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **The poison DIVE is pinned to coast (zigzag) too, extending cp2-3's monotonic-h dive.** Spec source: story RED bullet "poison-dive unaffected where source says so" + QUARRY "how it composes with ... the poison dive". Spec text: cp2-3's `dive()` marches `h` monotonically. Investigation: CENTI4.MAC 10$ (`AND I,20 / BNE 15$`) routes a poisoned head to the SAME 15$/18$/20$ path as a turn, reaching the V&7==4 reversal (CT-21) — so the ROM's dive zigzags `dh` every half-cell (net-zero per cell). Implementation in the RED: "unaffected" is pinned as a CONTROL (the dive still bypasses OBSTAC + reaches the bottom zone, unchanged); the H-coast/zigzag is pinned RED as the faithful behaviour. Rationale: a unified V&7-derived descent (turn + dive share the coast) is both simpler and more faithful than special-casing the dive to slide straight — pinning the zigzag guides Dev to the simpler code. Severity: minor. Forward impact: Dev's unified `descend` handles both; the zigzag lives in its own `it`, so if the Reviewer descopes the dive-H it isolates cleanly + this record covers it.
- **The frame-exact trajectory is pinned at wave-1 speed dh==dv==2 (peak coast = +4px).** Spec source: story "Pin the exact frame-by-frame trajectory". The peak excursion is `4*dh/dv`px (the reversal at V&7==4 is exactly 4px of V-drop from the boundary); for the shipped wave-1 config dh==dv so it is a flat +4px. The pin uses the shipped config; a general dh≠dv is out of scope (CENTIS variation is cp4, per cp2-5). Severity: minor. Forward impact: none for wave-1.

## Sm Assessment

**Setup complete, ready for RED.** cp2-9 (2pt refactor, tdd) — retire the ratified freeze-h
deviation: implement MOTION's coast-march (V&7==4 gate, CT-20/21), compose with cp2-5's
bounceDv containment + ±1 probe, remove the in-code deviation block, add the 0xF0/0x10
edge-constant claims. cp2-8 session remains open in parallel (awaiting the user's re-test) —
all handoff commands for this story pass explicit args (`pf handoff ... cp2-9 tdd <phase>`).

- **Branch:** `chore/cp2-9-motion-coast-march` off origin/develop (cp2-8 tip).
- **Jira:** skipped — none on this project.
- **Mode:** peloton subagent mode — tea/reviewer→opus, dev→sonnet; merges user-authorized.

## Tea Assessment

**Tests Required:** Yes — retire cp2-3's ratified freeze-h turn simplification and pin the ROM's frame-exact coast-march (CENTI4.MAC:1277-1475), all behind the live citation gate.

**RED commit:** `b7dc2ed` on `chore/cp2-9-motion-coast-march` (off cp2-8 tip `ae2382b`). Working tree clean; NO implementation written.

### Quarry — the coast-march turn (rev-4 CENTI4.MAC, upright mode CKF8=CKC0=0, .RADIX 16)
The horizontal march at `20$` (`ADC MOBJH / STA MOBJH`, CT-77) runs UNCONDITIONALLY every stepped frame — including mid-descent. The descent is stateless: a segment off the 8px boundary (`V&7 != 0`) skips the OBSTAC/edge logic and re-enters the vertical step directly (`71$: AND I,07 / BNE 15$`, CT-76), so a turn descends a FULL 8px cell before it can march flat again. The heading reverses only at `V&7==4` (CT-21), AFTER that frame's H march. For a head meeting a mushroom marching right at V=0xF8, dh=dv=2:

| frame | before | descend (15$) | march (20$, OLD dh) | V&7==4? | after |
|---|---|---|---|---|---|
| 1 | 0x80,0xF8,+2 | V→0xF6 | H→0x82 | 0xF6&7=6 no | 0x82,0xF6,+2 |
| 2 | 0x82,0xF6,+2 | V→0xF4 | H→0x84 | 0xF4&7=4 **YES** | 0x84,0xF4,**−2** |
| 3 | 0x84,0xF4,−2 | V→0xF2 | H→0x82 | 0xF2&7=2 no | 0x82,0xF2,−2 |
| 4 | 0x82,0xF2,−2 | V→0xF0 | H→0x80 | 0xF0&7=0 no | 0x80,0xF0,−2 (net-zero, 1 cell) |
| 5 | 0x80,0xF0,−2 | (V&7==0, OBSTAC clear left) plain march | | | 0x7E,0xF0,−2 |

Coast peak = **+4px** (half a cell, `4*dh/dv`, speed-invariant); NET-ZERO horizontal; never enters the obstacle cell (OBSTAC probes 8px ahead, CT-28). The poison dive reaches the SAME 20$/V&7==4 gate (10$ `AND I,20 / BNE 15$`), so it **zigzags** dh every half-cell (net-zero per cell) rather than sliding straight — a latent cp2-3 dive() H-infidelity this story corrects. Composition with cp2-5's bottom bounce: bounceDv is V-only, so the coast changes H, not the CT-72/73 containment.

### New claims (machine-extracted, byte-verified — 206/206)
- **CT-74** — CENT_EDGE_LEFT `0xF0` (CENTI4.MAC:1343 `CMP I,0F0`); folds in the cp2-3-review LOW.
- **CT-75** — CENT_EDGE_RIGHT `0x10` (CENTI4.MAC:1351 `11$: CMP I,10`); dedicated cite (line 1308's `CMP I,10` is an unrelated pic≥0x10 test).
- **CT-76** — the mid-cell descent gate (CENTI4.MAC:1313 `BNE 15$ ;DON'T SPEED UP IF TURNING`): descent-state derives from `V&7 != 0`, no `turning` flag.
- **CT-77** — the unconditional coast march (CENTI4.MAC:1448 `STA MOBJH ;CHANGE HPOS`): H steps every frame, reversal gated to V&7==4.

### Test file (1 new)
- `tests/motion-coast.test.ts` — **11 tests (9 RED + 2 controls)**: frame-exact trajectory (h,v,dh per frame); net-zero (coasts forward, returns to start after a full-cell drop); +4px peak + never-enters-cell; V&7==4 reversal gate (not the row-bucket flip); coast composes with the bottom bounce (CT-72/73); the poison dive zigzags (CT-19/21); the freeze-h DESIGN DEVIATION block / "FREEZES h" / `turning?:` field removed (source-text scan). Controls (green under both impls): the full train stays contained over a 1200-frame coast run; the dive still bypasses OBSTAC + reaches the bottom zone ("unaffected where source says so").

**Tests Written:** 11 (9 RED + 2 controls). **Status:** RED — 9 fail self-describing (freeze-h froze h; reversed at the row-bucket flip V&7==2 not 4; dive slides straight — 0 reversals; deviation block still present); 2 controls green.

### The Dev contract (build in GREEN — src/core/centipede.ts only)
1. **Unify the descent** into one V&7-derived step used by BOTH the turn and the dive. Each descent frame: `dv = bounceDv(v, dv)` (CT-72/73 preserved); `newV = v - dv`; **march H every frame** `h = wrapH(h + dh)` (CT-77, coast); **reverse** `dh = ((newV & 7) === 4) ? -dh : dh` (CT-21 gate) — H march uses the OLD dh, reversal computed from the post-descent V.
2. **Retire the `turning` flag** — a head is "descending" iff `isPoisoned` OR `(v & 7) !== 0` OR (at a cell boundary) an obstacle/edge is ahead; else it marches flat (CT-76). `stepHead`: `if (isPoisoned) descend; else if ((v & 7) !== 0) descend; else if (atEdge || obstacleCode(...)!==0) { poison-set-on-poison-band, then descend } else march`.
3. **Delete the in-code DESIGN DEVIATION block** (centipede.ts:34-44), the `turning?: boolean` field + its two `turning: false` inits, and the "FREEZES h" language (pinned by the source scan).
4. Cite CT-74/75 on the edge constants, CT-76 on the gate, CT-77 on the coast march.
5. **Preserve** CT-24 (clear POISON_BIT on the bottom bounce) inside the unified descent; keep the dive reaching the bottom zone (control).
6. **Re-run the full suite green** — my analysis says every one of the 396 baseline pins survives the coast (the two closest, `sim-assembly` ±1-probe and the `centipede` edge test, are traced safe in Delivery Findings); re-confirm and, if any pin does break, re-baseline it EXPLICITLY with a documented reason (none expected).

### RED verification
- `npx vitest run` → **Test Files 1 failed | 31 passed (32)** · **Tests 9 failed | 398 passed (407)** — the 1 failed file is exactly `motion-coast.test.ts`; all 396 baseline + my 2 controls green.
- `node tools/audit/check-citations.mjs` → **206/206 verified** (202 + CT-74/75/76/77).
- `npx tsc --noEmit` → clean.

**Handoff:** To Dev (Julia) for GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/centipede.ts` — unified `descend()` for both the turn and the poison dive (V&7-derived: unconditional CT-77 coast march with the OLD dh, CT-21 reversal gate at `newV&7===4`, CT-72/73 bounce preserved, CT-24 poison-clear-on-bounce folded in); `stepHead`/`stepBody` now derive mid-descent from `(v & 7) !== 0` (CT-76) instead of the retired `turning?: boolean` field (removed from `Segment`, both `createCentipede` inits, and the `dive()` function, which is now just `descend()`); deleted the in-code "DESIGN DEVIATION: THE TURN'S MULTI-FRAME TIMING" block and replaced it with a "THE COAST-MARCH TURN (CT-76/77)" doc block; `CENT_EDGE_LEFT`/`CENT_EDGE_RIGHT` comments re-cited to CT-74/CT-75.

**Tests:** 407/407 passing (GREEN) — 398 baseline + 9 from `tests/motion-coast.test.ts`. Citations 206/206 verified. `tsc --noEmit` clean. `npm run build` clean. Re-ran `tests/sim-assembly.test.ts` + `tests/centipede.test.ts` in isolation post-change (both green, both files untouched — `git diff --stat` shows only `src/core/centipede.ts` changed) to re-confirm TEA's two flagged near-miss tests.
**Branch:** `chore/cp2-9-motion-coast-march` (pushed, commit `c3609e1`)

**Handoff:** To Reviewer (review phase)

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 407/407 tests, 206/206 citations, tsc+vite build clean; diff scope = 3 files (GREEN=centipede.ts only); no console/TODO/`any`/dead-code smells; `turning` field fully retired (only comment prose mentions it, lines 36/42/179) | N/A — all green, corroborates my manual analysis |

**All received: Yes** (1/1 enabled subagents returned).

## Reviewer Assessment

**Verdict:** APPROVED

Frame-exact refactor of MOTION's turn/dive. I independently re-derived the ROM
trajectory two ways — (a) reading `CENTI4.MAC:1277-1475` by hand, (b) a scripted
re-implementation of the `15$→18$/19$→20$→gate` flow written WITHOUT reference to
`centipede.ts` — and BOTH produce the exact table the implementation is pinned to.

**Trajectory audit (V=0xF8, dh=dv=2, mushroom ahead), all THREE sources agree:**

| frame | after (h, v, dh) | gate |
|-------|------------------|------|
| 1 | 0x82, 0xF6, +2 | 0xF6&7=6 no |
| 2 | 0x84, 0xF4, **−2** | 0xF4&7=4 **reverse** (CT-21) |
| 3 | 0x82, 0xF2, −2 | 0xF2&7=2 no |
| 4 | 0x80, 0xF0, −2 | 0xF0&7=0 no — net-zero, one cell down |
| 5 | 0x7E, 0xF0, −2 | boundary, OBSTAC clear left → plain march |

h peaks at 0x84 (+4px half-cell coast), returns to 0x80 (net-zero), never enters
the mushroom cell. My independent ROM script → `F1 82,F6,+2 | F2 84,F4,-2 | F3
82,F2,-2 | F4 80,F0,-2 | F5 7E,F0,-2`, matching `descend()` and TEA's table exactly.

**Data flow traced:** a head's `v` → `descend()` `newV=v-dv` → reversal gate reads
`newV&7` (post-descent V, matching the ROM's read-after-store at `19$`), while the
`20$` H-march uses the OLD `dh` (`h=wrapH(seg.h+seg.dh)`) — the read/write ordering
is byte-faithful to the ROM.

**Adversarial checks (all cleared):**
- **`turning`-flag retirement is fully equivalent.** The ROM has no such flag — it
  gates mid-descent purely on `71$: AND I,07 / BNE 15$` (V&7≠0). The impl mirrors
  this: `if ((seg.v & 7) !== 0) return descend(seg)` sits BEFORE every plain-march
  path, so plain marches are reachable ONLY at V&7==0 (where the reversal gate is
  false anyway) — there is no state where the impl skips a reversal the ROM makes.
  Self-consistent for any seeded/cloned V. `cloneState` (sim.ts:220) spreads all
  fields, so a mid-descent clone (e.g. V=0xF4) resumes descending identically —
  the refactor removes a piece of hidden bookkeeping the clone had to preserve.
- **Unified poison dive genuinely zigzags** (same `descend()` → CT-21 reversal each
  half-cell), correcting cp2-3's monotonic-h dive; **CT-24 poison-clear composes**
  (`bounced ? pic & ~POISON_BIT : pic` fires exactly on the CT-72/73 bottom bounce).
- **Edge coast cannot exceed field bounds / wrap.** Turn triggers at the first even
  H past each edge (0xF0 left / 0x0E right); coast peak/​trough = ±4px → H stays in
  [0x0A, 0xF4] for the shipped config; `wrapH` never under/overflows. 8000-frame +
  1200-frame containment pins green.
- **CT-74/75 re-cites** land on `:1343`/`:1351` (distinct from the unrelated `:1308`
  pic test, per CT-75's note); citations 206/206.

**Scope verified:** GREEN (`c3609e1`) touched ONLY `src/core/centipede.ts` (31+/51−);
RED (`b7dc2ed`) added `tests/motion-coast.test.ts` + the four claims. No test file
edited in GREEN (`git show --stat`), no stale `turning` reference left in `src/`.

**Deviation audit:** both TEA deviations ACCEPTED — (1) the poison dive coasts/zigzags
(faithful: routes through the same `10$→15$→20$` path; unifying it is simpler AND more
faithful than special-casing a straight slide); (2) frame-exact pin at wave-1 dh==dv
(peak +4px), general dh≠dv correctly deferred to cp4. No undocumented deviations found.

**Results personally observed:** `npm test` → **407/407** (32 files); `node
tools/audit/check-citations.mjs` → **206/206 verified**; `npm run build` → clean
(tsc + vite). Race check: only my two cp2-9 commits reference the story in origin log.

**Observations:** 3 non-blocking Delivery Findings (stale test-local `turning?` mirror
in shoot-train.test.ts; looser signChanges>0 dive pin; no explicit H-bounds assertion
in the containment loop). None block: correctness is byte-faithful and fully pinned.

**Handoff:** To SM for finish-story.