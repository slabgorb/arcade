---
story_id: "ml3-2"
jira_key: "ml3-2"
epic: "ml3"
workflow: "tdd"
---
# Story ml3-2: Millipede split-on-mushroom + EXPLOD segment/player explosion + player death/collision

## Story Details
- **ID:** ml3-2
- **Jira Key:** ml3-2
- **Repos:** arcade
- **Branch:** feat/ml3-2-millipede-split-explod-player-death
- **PR:** #314 (code, feat/ml3-2 → develop) — awaiting boss merge
- **Workflow:** tdd
- **Stack Parent:** ml3-1 (motion reducer — NEWHD + MOTION)

## Story Description
This story extends the ml3-1 millipede motion reducer (`plugins/millipede/src/core/millipede.ts`) with split-on-mushroom logic, segment/player explosion handling (EXPLOD), and player collision detection (PLAY). All three subsystems are pure `src/core` reducers with no render/audio/input side effects.

## Acceptance Criteria

### AC-1: Split-on-mushroom logic
When a millipede segment collides with a mushroom at coordinates within the ROM's collision radius, the millipede splits at that point. The head portion continues motion, and the body creates a new millipede train. Behavior matches CENTPC head/body init (MILLI.MAC:498) as ported in ml3-1.

### AC-2: EXPLOD segment/player explosion (MILLI.MAC:763)
The EXPLOD reducer models the explosion animation sequence for millipede segments and player projectiles. The reducer advances the explosion phase counter and clears objects when explosion completes. All ROM constants (explosion phase thresholds, timing values) carry `citations.test.ts`-gated assertions against MILLI.MAC:763.

### AC-3: PLAY collision detection (MILLI.MAC:1744)
The PLAY reducer detects when the player sprite collides with an active millipede segment, spider, or other hazard. The reducer updates player state (collision flag) and triggers death logic. All ROM constants (collision radius, object type thresholds) carry `citations.test.ts`-gated assertions against MILLI.MAC:1744.

### AC-4: Freeze-friendly death/explosion effects (ACCESSIBILITY)
All death and explosion effects modeled in the core reducer are freeze-friendly: NO full-screen flash, NO strobe patterns. If the reducer animates an effect that would produce a strobe on visual render, the reducer must provide a flag or state that the shell can use to render a fade, pulse, or static freeze instead. This guards ml7's accessibility gate (photosensitive epilepsy accommodation per project policy).

### AC-5: ROM citations and test coverage
Every ROM constant ported from MILLI.MAC carries a pinned `citations.test.ts` assertion in the test suite. The millipede purity test confirms that the reducer code contains no render/audio/input side effects. All constants pass the citation gate before the story closes.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-13T13:06:07Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T12:17:14Z | 2026-08-13T12:20:27Z | 3m 13s |
| red | 2026-08-13T12:20:27Z | 2026-08-13T12:36:54Z | 16m 27s |
| green | 2026-08-13T12:36:54Z | 2026-08-13T12:40:53Z | 3m 59s |
| review | 2026-08-13T12:40:53Z | 2026-08-13T13:06:07Z | 25m 14s |
| finish | 2026-08-13T13:06:07Z | - | - |

## Delivery Findings

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA-1 — the split citation `MILLI.MAC:498` (AC-1) is WRONG; grounded to OVRLAP + the promotion block
The sm-setup-derived AC-1 attributed split-on-mushroom to `CENTPC init (MILLI.MAC:498)`. That is the head/body **init** routine ml3-1 already ported. Grounded against the vendored source, the split is two pieces, both cited in `docs/rom-study/claims/11-millipede-split-death.json`:
- **`OVRLAP` (MLSUB.MAC:896)** — same-line, in-front overlap detection (skip vacant/dead-or-score≥0xC0/self; 0xF4 wrap window).
- **the body→head promotion (MILLI.MAC:1561–1592)** — at the bottom-row turn, the tail of a body run is re-coloured to a head (0x39, "TURN ON COLOR FOR EYES"), HDIR reversed (COMP), DV=0 for one line, V snapped to a cell. That is the mechanic that splits one train into two.
The ml3-1 reducer's own header comment already flagged this ("OVRLAP (the split — ml3-2)"), so the correction is corroborated by the sibling code, not just by me. AC-2/AC-3 line hints were also off by the usual label-vs-comment gap: **EXPLOD is MILLI.MAC:765** (title said 763), **PLAY is MILLI.MAC:1750** (title said 1744). RED tests + claims use the grounded lines.

### TEA-2 — AC-4 freeze-friendly is a DESIGN CHANGE from the ROM, encoded in the interface (accessibility > fidelity)
The ROM's player explosion phase 1 (PEXPLD 0x50–0x60) writes the **full-screen background** `BKGND` every frame (MILLI.MAC:809–813) — a photosensitive strobe. Per the standing project rule (owner has photosensitive epilepsy; accessibility overrides rom-always-wins), the clone must NOT reproduce it. My interface decision, which the RED suite pins: `stepPlayerDeath(pexpld)` returns `{ pexpld, phase, flashing }` where `flashing` is a **steady** boolean across the whole flashing phase and the reducer emits **no per-frame-varying colour field**. The shell renders `flashing` as a static/dim freeze, never a cycle. The "NO STROBE" test asserts consecutive flashing frames differ ONLY in `pexpld`. Dev must honour this — do NOT add a `bkgnd`/background field that cycles; the phase countdown and the three phase bands (flashing/sparkle/dying/done at the 0x50/0x20 floors) are faithful, only the *rendering signal* is de-strobed.

### TEA-3 — scope fences (kept OUT of ml3-2, pinned in comments so GREEN doesn't over-build)
- **Spider entity** = ml4. PLAY's spider hit box (wider H<10, V-weighted sum) IS PLAY's own code, so it is pinned, but no spider is simulated here.
- **The shot that STARTS a segment exploding** = ml5 (scoring/shots). EXPLOD's segment *advance* + score-park is pinned; its *trigger* is not.
- **DDT-cloud explosion** (the `FRAME&7` branch of EXPLOD) = ml4. (I dropped an early MS-19 claim that mis-attributed that gate to segment pictures — segment pictures DEC every frame.)
- **Mushroom-field probe (OBSTAC)** = ml3-3. `splitOnTurn` takes the "head is turning" as a precondition; wiring the turn to a real mushroom hit is ml3-3's MOTION extension.

## SM Assessment

**Setup verified on disk (not just claimed by sm-setup):** session file present, `sprint/context/context-story-ml3-2.md` present, branch `feat/ml3-2-millipede-split-explod-player-death` checked out and **pushed to origin** (claim visible to sibling checkouts). Sibling probes at setup were clean — no ml3-2 branch anywhere, the only live sibling session (a-1) is on ml4-3. Story stamped `in_progress` in `sprint/epic-ml3.yaml` (surgical diff, ml3-2 only). The phase pointer read `setup` on arrival. Model advisory noted (SM expects sonnet; running on opus intentionally).

**Scope:** pure `src/core` reducer story EXTENDING ml3-1's `plugins/millipede/src/core/millipede.ts` (head/body init + NEWHD + MOTION, landed today via PR #309, `status: done`). Three subsystems: split-on-mushroom, EXPLOD explosion (segment + player), PLAY player death/collision. Dependency ml3-1 satisfied. Quarry: `reference/original-source/millipede/MILLI.MAC` (present, citations groundable).

**⚠ Watch-item for TEA (RED) — ground the split-on-mushroom citation before pinning.** The derived **AC-1 attributes split-on-mushroom to `CENTPC init (MILLI.MAC:498)`**, but :498 is the head/body **init** routine ml3-1 already ported — split-on-mushroom is a motion/collision-time behavior (a segment hitting a mushroom spawns a new head), almost certainly a *different* line than :498. Per project rule I did NOT correct the 6502 from a window myself. **Open the real MILLI.MAC and cite the actual split routine** (check the MOTION path around MILLI.MAC:1444 and NEWHD at MLSUB.MAC:775 for where a new head is created on mushroom collision). EXPLOD `MILLI.MAC:763` and PLAY `MILLI.MAC:1744` come verbatim from the epic title — verify those too; every constant is `citations.test.ts`-gated.

**⚠ Hard AC — accessibility overrides ROM fidelity.** AC-4 (freeze-friendly death/explosion, NO strobe, NO full-screen flash) is a binding project-owner requirement (photosensitive epilepsy), the one standing exception to rom-always-wins. If the ROM explosion would strobe on render, the core reducer must expose state the shell can render as a fade/pulse/static-freeze instead. Do not descope this to ml7 — ml7 is the wiring gate; the *freeze-friendly design* must be baked into this reducer now.

**Purity:** the millipede core-boundary/purity test scans `src/core` source text — keep the new reducers free of render/audio/input. Handing off to TEA (Leeloo) for RED.

## TEA Assessment

**RED verified directly (testing-runner confabulates names — I ran it myself).** `npx vitest run --project millipede`: **29 fail / 428 pass** (20 files, 1 failed = the new one). All 29 failures in `tests/millipede-split-death.test.ts` throw the single self-describing "ml3-2 split/death core not built yet — missing exports: …" — the FEATURE's absence, never a module-resolution or collect crash. `npm run lint` (repo-wide `tsc --noEmit`) is **green (exit 0)**. The 23-claim `docs/rom-study/claims/11-millipede-split-death.json` parses and the audit/citation gates stayed green (dossier coverage only gets greener — I added no dossier prose). Committed `9e834fcb`, pushed to the feature branch.

**What GREEN (Korben/Dev) implements — EXTEND `plugins/millipede/src/core/millipede.ts` (pure, no shell):**
| Export | ROM | Contract |
|---|---|---|
| `checkOverlap(segs, headIndex)` | OVRLAP MLSUB.MAC:896 | true iff a live segment is just AHEAD (head's march dir) on the SAME line; skip vacant(0)/dead-or-score(≥0xC0)/self; 0xF4 wrap window |
| `splitOnTurn(segs, headIndex)` | MILLI.MAC:1561–1592 | promote the TAIL of the head's contiguous body run to a head (color 0x39, dh reversed, dv 0, V snapped to cell); NEW array, no mutation; no body ⇒ unchanged |
| `checkPlayerCollision(obj, player, isSpider?)` | PLAY MILLI.MAC:1750 | non-spider hit = \|dH\|<6 ∧ \|dV\|<6 ∧ (\|dH\|+\|dV\|)<0x0A; spider = \|dH\|<10 ∧ (\|dH\|+2·\|dV\|)<0x0A |
| `stepPlayerDeath(pexpld)` | EXPLOD MILLI.MAC:803–838 | `{pexpld:pexpld-1, phase, flashing}`; phase off PRE-dec value: last tick→'done', ≥0x50→'flashing', ≥0x20→'sparkle', else 'dying'; ≤0→'idle'. **FREEZE-FRIENDLY: `flashing` steady, no per-frame colour field (AC-4).** |
| `stepSegmentExplosion(seg, points?)` | EXPLOD MILLI.MAC:765–799 | pic in (0xFA,0xFF] DECs toward 0xFA; at the floor → park score (color 0xFF, pic=points, per MS-13/14) if points else vacant |
| MS-* constants | claims/11 | export the 18 constants exactly (the constants test hand-mirrors them) |

**Rule coverage (lang-review/typescript.md):** #8 test-quality — every test has a meaningful assertion, none vacuous. #14 state-machine edges — the death phase floors (0x50/0x20) and the 'done' last-tick edge are each pinned, not just "some ordering". #21 degenerate-but-not-nullish — dH=dV=0 exact overlap is a hit; pexpld=0 idle; pexpld=1 done; lone-slot / vacant-ahead OVRLAP. #26 non-local terms — constants are hand-mirrored from the ROM (not imported), so the expectations don't echo the module. #29 magnitude-not-ordering — collision edges pinned at the exact 6/6/0x0A thresholds; death floors at exact 0x50/0x20. Purity (project core rule) — the armed `tests/purity.test.ts` sweep guards the new reducers; RED suite adds explicit no-mutation checks on each reducer.

**Deviations recorded above:** TEA-1 (the AC-1 `:498` cite corrected to OVRLAP + the promotion block; EXPLOD/PLAY line offsets fixed), TEA-2 (freeze-friendly is a deliberate render-signal change from the ROM strobe), TEA-3 (scope fences: spider entity→ml4, shot-trigger→ml5, DDT→ml4, OBSTAC→ml3-3). Handing off to Dev (Korben Dallas) for GREEN.

## Dev Assessment

**GREEN verified directly:** `npx vitest run --project millipede` → **457/457 pass** (was 428 pass + 29 red; the 29 ml3-2 tests are now green and nothing else moved). `npm run lint` (repo-wide `tsc --noEmit`) → **exit 0**. Purity sweep (`tests/purity.test.ts`) is inside that 457 and stays green — the five new functions are pure `src/core` (no render/audio/input, no Date/Math.random). Committed `77376b57`, pushed to the feature branch.

**What I implemented** — all in `plugins/millipede/src/core/millipede.ts`, EXTENDING ml3-1 (no existing code touched), each function 1:1 with TEA's contract and cited to claims/11 (MS-*):
- `checkOverlap` — the OVRLAP walk; the in-front normalisation is `(diff ^ (dh & 0xff))` against the 0xF4 window, exactly the 6502 `EOR X,MOBJDH / CMP I,0F4` idiom (verified it reproduces both the right-march and left-march ahead/behind cases).
- `splitOnTurn` — scans to the body-run tail (`while segs[y+1] is body`), promotes it (0x39 / dh negated / dv 0 / V snapped `(v+4)&0xF8`). Returns a fresh array via `map(spread)`; no in-place mutation (readonly `Segment` enforces it at compile time anyway).
- `checkPlayerCollision` — `|dH|<max ∧ |dV|<6 ∧ (|dH| + (spider?2:1)·|dV|) < 0x0A`, `max` 6 non-spider / 10 spider.
- `stepPlayerDeath` — phase off the pre-decrement value; the final tick (`next===0`) is `done` regardless of band. **Freeze-friendly: the return carries only `{pexpld, phase, flashing}` — no colour field — so the "NO STROBE" guard holds by construction, not by luck.**
- `stepSegmentExplosion` — `pic>0xFA` DECs; at the 0xFA floor it parks a score (`0xFF`, `pic=points`) or clears the slot.

**Minimalist notes (what I deliberately did NOT add):** no score-display *timer* advance (the 0x28–0x34 PTS countdown) — no test drives it and it belongs with scoring (ml5); no wiring of `splitOnTurn`/`checkPlayerCollision` into `stepMillipede`'s MOTION loop — that integration needs the mushroom-turn (ml3-3) and shot/score plumbing (ml5), and TEA fenced it out (TEA-3). These reducers are the pure, tested building blocks; the caller wiring lands with its dependencies. Handing off to the Thought Police (Reviewer).

## Reviewer Assessment

**Verdict: APPROVED** — round 2, after a round-1 REJECT and an in-session rework (commit `abafff90`). Three confirmed defects were found in round 1, each verified against the vendored ROM (not taken on the subagent's word), fixed, and re-verified green.

Subagent toggles on this project: only `preflight`, `security`, `rule_checker` are enabled (`pf settings get workflow.reviewer_subagents`). The other six specialists are disabled — I hand-covered those six dimensions myself and account for them in the table below, per the established practice for this repo.

### Round-1 findings and their resolution
- **[RULE] HIGH → FIXED. PLAY hit box used `Math.abs`; the ROM uses a one's-complement abs.** `MILLI.MAC:1757-1762/1772-1777` subtracts then folds a negative with a bare `EOR I,0FF` ("-10 BECOMES +9"), NOT the two's-complement `COMP` (`MLIRQ.MAC:630`). `CKFF`=0 upright, so it fires on every upright check — the box is asymmetric by one pixel, and the H/V axes subtract in opposite order. **Verified in the ROM myself.** The prior test `it('the abs is symmetric …')` asserted the *opposite* of the ROM (lang-review #17: a test pinning a false claim, which would block the fix). Rework: `checkPlayerCollision` now uses `romDist` (one's-complement), and the collision suite pins the asymmetry explicitly (H +6 hits/−6 misses; V mirror). Cited MS-27 (`MILLI.MAC:1762`). `millipede.ts:396-418`.
- **[RULE]/[SIMPLE] MEDIUM → FIXED. Seven forward-only constants were dead exports** (`SPLIT_BOTTOM_V`, `SPIDER_SPDP_LO/HI`, `SCORE_PIC_LO/HI`, `SCORE_DELAY`, `PLAY_DELAY`) and several inline `// MS-N` comments named a claim that cites a different line (audit-invisible). Rework: dropped the dead exports (their mechanisms are ml3-3/ml4/ml5 and they remain documented in `claims/11`), fixed the inline IDs, and added dedicated claims MS-25 (0xFA floor), MS-26 (spider H box 10), MS-28 (PLAY delay).
- **[DOC] MEDIUM → FIXED. `stepSegmentExplosion` docstring claimed a "held for 0xA0" score-hold it never implements** (lang-review #17). Rework: docstring now states it models the explosion advance + score *park* only; the hold/clear is ml5.
- **[RULE] LOW → FIXED. `stepPlayerDeath` fell through to a stuck `'dying'` on a NaN countdown** (#21). Rework: guard is `!(pexpld > 0)` so NaN resolves to the terminal `'idle'`.

Round-2 re-verification (run myself): `npx vitest run --project millipede` **457/457**; the ml3-2 suite **29/29**; `npm run lint` (repo-wide `tsc --noEmit`) **exit 0**; `npm run test:orchestrator` green; the armed purity sweep green against the new pure functions.

### Findings by specialist dimension (all 8 tags represented)
- **[PRE]** preflight (ran, `reviewer-preflight`): millipede 457/457, lint 0, orchestrator 478/0, purity 20/20, no debug/skip/only smells. Clean.
- **[SEC]** security (ran, `reviewer-security`): No security concerns. Nil surface — pure numeric reducers, no external input/strings/network/eval; the one dynamic `import()` is a hardcoded constant specifier; no new regex/path-resolution.
- **[RULE]** rule-checker (ran, `reviewer-rule-checker`): the three findings above; all confirmed against the ROM and fixed. Constant *values* were all verified numerically correct.
- **[EDGE]** edge-hunter (disabled — hand-covered): checked OVRLAP same-position/left-vs-right march (faithful to the EOR-with-`dh` idiom), `splitOnTurn` at last-slot / no-body / run-bounded-by-a-head, collision at the exact 6/6/0x0A edges and the pixel-asymmetric edges, death at pexpld 1→0 ('done') and ≤0/NaN ('idle'), segment explosion at the 0xFA floor. A residual non-blocking note: the h-wrap is not modelled in `romDist`, but the play domain (`0x10..0xF0`, screen edges) never approaches the `0x00/0xFF` wrap, so it is unobservable in scope.
- **[SILENT]** silent-failure-hunter (disabled — hand-covered): no swallowed errors or silent fallbacks; the reducers are total pure functions with explicit returns; the test loader's `catch` re-throws a self-describing error.
- **[TEST]** test-analyzer (disabled — hand-covered): 29 tests, no vacuous assertions; constants are hand-mirrored (not echoed) per #26; the "NO STROBE" guard spreads the whole return so a future cycling field is caught (#18 non-vacuous); the asymmetry test cross-checks its mirrored `romDist` AND the hit/miss outcomes, so it is not self-referential.
- **[DOC]** comment-analyzer (disabled — hand-covered): the `stepSegmentExplosion` overclaim was the one stale doc; fixed. Remaining docstrings/citations verified accurate against the ROM.
- **[TYPE]** type-design (disabled — hand-covered): `DeathPhase` is a string-literal union (not stringly-typed); `Segment` params are `readonly`; return shapes are consistent inline literals; no `as any`/`@ts-ignore` (the two test-loader casts are runtime-validated before use).
- **[SIMPLE]** simplifier (disabled — hand-covered): the dead-constant removal (finding 2/3) simplified the surface to only-what-is-consumed; the five reducers are minimal, no over-engineering.

### Rule Compliance
Every applicable project rule, checked per-instance:
1. **Core/shell purity (CLAUDE.md — the single most important rule).** All five new functions (`checkOverlap`, `splitOnTurn`, `checkPlayerCollision`, `stepPlayerDeath`, `stepSegmentExplosion`) + `romDist` are in `src/core/millipede.ts`: no render/audio/input/time/network/`Math.random`. Verified by the armed `tests/purity.test.ts` sweep (green) and by direct read (only `Math.abs`/`min`/`max` and bit ops). PASS on all six.
2. **ROM fidelity — every constant cited and byte-correct (CLAUDE.md).** All consumed constants carry a `claims/11` MS-* entry; rule-checker verified the numeric values against `MILLI.MAC`/`MLSUB.MAC`; the round-1 fix corrected the one *semantic* fidelity miss (one's-complement abs). PASS after rework.
3. **Accessibility overrides ROM fidelity — no strobe (CLAUDE.md, the one rom-always-wins exception).** `stepPlayerDeath` returns only `{pexpld, phase, flashing}` — no per-frame full-screen colour; the "NO STROBE" test proves consecutive flashing frames differ only in the countdown. PASS.
4. **Pure reducers do not mutate inputs.** `checkOverlap`/`splitOnTurn`/`stepSegmentExplosion` each have a no-mutation test; `splitOnTurn` rebuilds via `map(spread)`; `readonly Segment[]` enforces it at compile time. PASS on all three.
5. **lang-review #17 (comments asserting an unrun mechanism) & #21 (degenerate numeric input).** #17: the `stepSegmentExplosion` docstring overclaim fixed. #21: NaN guard added to `stepPlayerDeath`; the remaining out-of-range-index cases (`checkOverlap`/`splitOnTurn`) are accepted LOW — trusted internal callers, no external input, ROM equivalents do not validate, and adding untested guards would itself be a smell. PASS/accepted.

**Correlation (review-correlation):** all findings mapped to EXISTING lang-review checks (#17, #21) plus the standing ROM-fidelity rule — no checklist gap, so no new check is added.

## Subagent Results

| # | Subagent | Received | Decision |
|---|----------|----------|----------|
| 1 | reviewer-preflight | Yes | N/A — clean (tests/lint/orchestrator/purity green) |
| 2 | reviewer-edge-hunter | Disabled — hand-covered | confirmed 0, dismissed 0, deferred 0 (1 non-blocking note: h-wrap unobservable in scope) |
| 3 | reviewer-silent-failure-hunter | Disabled — hand-covered | N/A — clean |
| 4 | reviewer-test-analyzer | Disabled — hand-covered | confirmed 1 (symmetric-abs test), fixed |
| 5 | reviewer-comment-analyzer | Disabled — hand-covered | confirmed 1 (docstring overclaim), fixed |
| 6 | reviewer-type-design | Disabled — hand-covered | N/A — clean |
| 7 | reviewer-security | Yes | N/A — clean (nil surface) |
| 8 | reviewer-simplifier | Disabled — hand-covered | confirmed 1 (dead constants), fixed |
| 9 | reviewer-rule-checker | Yes | confirmed 3 (abs/citations/dead-constants), all fixed |

All received: Yes (3 subagents ran; 6 disabled on this project and hand-covered by the Reviewer — accounting).