---
story_id: "ml11-1"
jira_key: "ml11-1"
epic: "ml11"
workflow: "tdd"
---
# Story ml11-1: CENTIN/LCOLOR-gated per-length field recolour

## Story Details
- **ID:** ml11-1
- **Jira Key:** ml11-1
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** feat/ml11-1-centin-lcolor-per-length-field-recolour
- **PR:** #484 (MERGED into develop, mergeCommit f9d5979)
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T22:03:08Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T21:28:11.849400+00:00 | 2026-08-16T21:32:39Z | 4m 27s |
| red | 2026-08-16T21:32:39Z | 2026-08-16T21:45:01Z | 12m 22s |
| green | 2026-08-16T21:45:01Z | 2026-08-16T21:48:21Z | 3m 20s |
| review | 2026-08-16T21:48:21Z | 2026-08-16T22:03:08Z | 14m 47s |
| finish | 2026-08-16T22:03:08Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): the reuse-first premise is even stronger than the story states — `fieldPens(code, centin?)` ALREADY threads a CENTIN and already composes the per-length base with the per-code overrides (playfield-palette.ts:106). The whole AC3 "compose" deliverable is therefore pre-built; the only missing work is threading the LIVE latched index at the two `main.ts` call sites (240-241) and modelling the gate. Affects `plugins/millipede/src/main.ts` (thread `state.fieldColourIndex`) and `plugins/millipede/src/core/` (add the gate). *Found by TEA during test design.*
- **Question** (non-blocking): integrated, `fieldColourIndex` will equal `centin` on every frame (sim arms + latches in the same step), so reading the latched index vs reading `centin` is observationally identical TODAY. The gate earns its keep only once splits (ml3-2) can change length WITHOUT arming LCOLOR. Dev should still model it (the story's explicit ask, and the reducer keeps AC2 non-vacuous), but a Reviewer may ask "why not just read centin?" — the answer is faithfulness + future splits. Affects `plugins/millipede/src/core/field-recolour.ts`. *Found by TEA during test design.*


### Dev (implementation)
- No upstream findings during implementation. The reuse-first premise held exactly: `fieldPens(code, centin)` already composed, so GREEN was a new pure gate (`src/core/field-recolour.ts`), two GameState fields, a three-line arm+latch in `stepPlay`, and the two `main.ts` call-site args. No other module needed touching.

### Reviewer (code review)
- No NEW upstream findings beyond this story. All five review findings (F1-F5) were in-scope and fixed in review round 1 (commit 9d5704b1). The pre-existing sibling-comment staleness (F5, playfield-palette.ts/.test.ts) was retired by this story and corrected here rather than deferred.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design) — 2026-08-16
- **What:** Chose a same-frame arm-and-latch model for the LCOLOR gate (sim recomputes CENTIN, arms `lcolor` on a length change, then applies `recolourField` in the SAME `stepGame`). **Spec:** the ROM sets LCOLOR in game logic and consumes it in the NEXT display interrupt (CLRCH, MLIRQ.MAC:248) — a one-frame defer. **Why:** the visible result is identical because `waveColours` is a pure step-function of CENTIN, and same-frame keeps the reducer trivially testable. AC2's "gate clear → unchanged / gate set → steps" distinction is pinned by the pure `recolourField` unit tests, which stay non-vacuous regardless of same- vs next-frame latching. Dev may keep or defer the latch a frame; the tests do not force same-frame.
- **What:** The AC3 "compose without regression" tests (5 of 15) PASS on arrival — they are green-on-arrival REGRESSION GUARDS, not RED. **Spec:** RED phase writes failing tests. **Why:** `fieldPens(code, centin?)` already composes the per-length base with the ml9-2/ml9-3 per-code overrides, so the compose behaviour already holds at any CENTIN. These guards fail ONLY if Dev implements AC3 the tempting-wrong way — a straight swap to global `playfieldPens(centin)`, which the story explicitly warns "would REGRESS ml9-2". Keeping them green through GREEN proves the overrides survived. (jt8-6 precedent: filed behaviour becomes a green guard.)
- **What:** No new numeric ROM constant is introduced, so no new `citations.test.ts` claim is required. **Spec:** AC1 says "citations.test.ts covering any new constant." **Why:** the colour row = CENTIN-1 mapping is ALREADY encoded in `waveColours` (index 0 = CENTIN=1, playfield-colour.ts:52-63, each row cited); the gate reuses `centin` + `waveColours` and the LCOLOR flag is a boolean, not a magic number. If Dev adds any new hex/decimal ROM constant, it must carry a claim — but the reference design needs none. The new `src/core/field-recolour.ts` is auto-covered by the purity sweep (tests/purity.test.ts) and must stay import-clean of shell/clock/DOM.


### Dev (implementation) — 2026-08-16
- **What:** Wired the LCOLOR gate ONLY in `stepPlay`. **Spec/TEA design:** "thread through stepPlay/stepDeath." **Why:** `stepPlay` is the sole return path that recomputes `centin`; every other path (`stepAttract`, `stepDeath` respawn, `stepGameOver`, wave/idle) either spreads `...state` (carrying `fieldColourIndex`/`lcolor` unchanged) or rebuilds via `createGame` (which seeds them). `stepDeath` re-lays at the PRESERVED `state.centin` and does not change length, so the latched colour already matches — no arm needed. Adding a redundant gate call there would be dead code (minimalist-discipline). All 1424 millipede tests green confirms the carry-through is correct.
- **What:** Kept the same-frame arm-and-latch TEA proposed (not a next-frame defer). **Why:** simplest correct model; the visible result is identical (waveColours is a pure step-function of CENTIN) and the reducer unit tests pin the gate mechanism independently.

### Reviewer (audit) — 2026-08-16
All five logged deviations audited against the code:
- TEA same-frame arm+latch model — **ACCEPTED**. Verified visually-equivalent (waveColours is a pure step-function of CENTIN); rule-checker #14 confirmed single-exit edge computation in stepPlay. The lcolor docstring that overstated cross-frame persistence was corrected (F2).
- TEA AC3 green-on-arrival regression guards — **ACCEPTED**. Confirmed non-vacuous: they redden on a playfieldPens swap (now also explicitly banned in the wiring guard, F4).
- TEA "no new numeric constant → no new citation claim" — **ACCEPTED**. rule-checker #32 independently confirmed: field-recolour.ts has zero numeric literals; game-state.ts seeds from NCENT + literal false.
- Dev "gate wired only in stepPlay" — **ACCEPTED**. rule-checker #14 confirmed centin changes only in stepPlay; all other paths carry the fields via ...state / createGame. Verified no death/attract/game-over drift.
- Dev "kept same-frame (not next-frame defer)" — **ACCEPTED**. Same basis as the TEA entry.

## Sm Assessment

**Setup complete — routing to TEA for the RED phase.** The phase pointer reads setup on arrival.

### Sibling probes (clean)
- `git fetch --prune && git branch -r | grep -i ml11` → no ml11 remote branches before this claim.
- `ls a-*/.session/*-session.md` → only sibling session is a-3 on df4-1 (defender, unrelated epic).
- Merge gate clean (`gh pr list` empty). No contention on ml11 or the millipede palette surface.

### Premise verification (measured against the current tree, 2026-08-16)
The epic description carries a dated GROUND TRUTH block. I verified its falsifiable code-side claims before setup so the context copies forward fact, not stale prose:
- CONFIRMED: `playfieldPens(centin)` exists at `plugins/millipede/src/shell/playfield-palette.ts:43` and is genuinely UNUSED by the live render (only self-references in its own file).
- CONFIRMED: the live field draws per-CHAR-CODE via `fieldPens(p.stamp)` in `plugins/millipede/src/main.ts` (~238-241).
- CONFIRMED: `state.centin` exists in `plugins/millipede/src/core/game-state.ts:51`, init `NCENT` at :143.
- CORRECTED: the description cited the reuse tests at `plugins/millipede/src/shell/playfield-palette.test.ts:43` — that path is WRONG (`:43` is the source line). The real coverage is `plugins/millipede/tests/playfield-palette.test.ts` (`playfieldPens(12)` :53, `playfieldPens(1)` :62; `ingame-colour.test.ts` also references it). sm-setup rendered the corrected path into the context; ACs copied verbatim.

The reuse-first premise therefore holds: this is a wiring + compose story, not a from-scratch palette build.

### Bookkeeping fix — orphaned epic shard adopted
The "chore:sprint planning" commit created `sprint/epic-ml11.yaml` + context but never (a) added `ml11` to `current-sprint.yaml`'s epic index nor (b) committed the shard. Consequence: every mutating `pf` command skipped ml11 ("not in epics list") — `story update` failed. Fixed with `pf sprint epic reindex ml11` (dry-run first), which added `ml11` to the index. Story then stamped `in_progress` and the claim (shard + index + context) committed on the feat branch and pushed.

### No user ruling required at setup
The story's "(b) DECIDE + IMPLEMENT how the per-length base composes with per-code `fieldPens` overrides" is a technical design decision inside a TDD workflow (Architect/TEA/Dev own it), not a backlog-shape either/or. The description already fences the answer ("a straight swap back to global `playfieldPens` would REGRESS ml9-2"). The noted possible mid-story split is a downstream signal, not a setup gate.

### Handoff to TEA
RED phase: model a CENTIN colour-index + LCOLOR gate in core (game-state.ts already carries `state.centin`) and a failing test that pins (a) the gate latches recolour at the LCOLOR wave event (not per-frame) and (b) the per-length base composes with per-code `fieldPens` so ml9-2 mushroom-cap/DDT colours survive. Every new `src/core` constant needs a `citations.test.ts`-gated claim. Accessibility: discrete per-length step, no strobe — flag for the visual playtest.
## TEA Assessment

**Tests Required:** Yes
**Reason:** 5-point behavioural story (a new core gate + render wiring); not a chore-bypass category.

**Test Files:**
- `plugins/millipede/tests/field-recolour.test.ts` — 15 tests across the four ACs.

**Tests Written:** 15 tests covering 4 ACs.
**Status:** RED (10 failing — feature absent; 5 green-on-arrival AC3 regression guards). Verified: only these 10 fail across the whole millipede project (1413 others pass); repo-wide `tsc --noEmit` clean.

### What each AC pins (and the contract GREEN must ship)
- **AC2 (gate mechanism)** — `recolourField(fieldColourIndex, centin, lcolor): { fieldColourIndex, lcolor }` in a new `src/core/field-recolour.ts`: gate clear → HOLD the index (a length change is ignored); gate set → LATCH index to CENTIN and CLEAR the flag (MLIRQ.MAC:248-255). The latched index selects ROM row CENTIN-1. → RED (module absent).
- **AC4 (no strobe)** — 240 idle frames with the gate clear hold the index invariant: a discrete step, not a per-frame flicker. → RED (module absent). Steady-by-construction; the real strobe check is the mandatory /millipede/ visual playtest against ingame-mame-reference.png.
- **AC1 (thread the live index)** — `GameState.fieldColourIndex` (init NCENT) + `GameState.lcolor` (init false) seeded by `createGame`; a REAL segment kill (3 segments → kill 1 → live length 2) latches the field a step down (end-to-end, proving the gate is not a dead flag); and `main.ts` calls `fieldPens(p.stamp, state.fieldColourIndex)` at BOTH draw sites, with the bare `fieldPens(p.stamp)` gone. → RED (fields absent; wiring bare). The segment-kill test's preconditions (`segment-killed`, `centin===2`) already PASS, so only the latch assertion is red — the harness is sound.
- **AC3 (compose without regression)** — the base band shifts with length ($E2→$67, literal ROM bytes) while a poison cap stays blue $F8, a normal cap stays distinct, and a DDT cell keeps the ml9-3 red $1F letters, across CENTIN 12 AND 8. → GREEN on arrival (guard): `fieldPens` already composes; these redden only if Dev swaps to global `playfieldPens` and drops the per-code overrides.

### Rule Coverage (TypeScript lang-review)

| Rule | Test(s) | Status |
|------|---------|--------|
| Guard must be mutation-tested (delete the mechanism → red) | `NO field cell is still drawn through the frozen CENTIN=12 default` (bans the bare call); `a REAL length change … latches … the gate is not dead` | red |
| A fixture whose value IS the expectation (pin the source byte) | base-shift test pins literal ROM bytes `0xE2`/`0x67` independently of `waveColours` routing | green-guard |
| A test helper that reimplements a platform algorithm is untested code | none written — reuse the ml9-2 `fakeCtx` blit recorder + `drawGridStamps`, no algorithm reimplemented | n/a |
| New core module stays inside the core/shell boundary | `tests/purity.test.ts` auto-sweeps `src/core/field-recolour.ts` once Dev lands it | armed |
| New numeric ROM constant carries a citation | none added by the reference design (row=CENTIN-1 already in cited `waveColours`); if Dev adds a constant it must claim it | n/a |

**Rules checked:** the applicable TS lang-review discipline rules (mutation-tested guards, non-circular fixtures, no reimplemented helpers, purity, citations) all have coverage or a documented n/a.
**Self-check:** 0 vacuous tests — every test has a meaningful assertion; the negative wiring test and the end-to-end kill both require the mechanism to be live.

**Handoff:** To Dev (Loki) for GREEN. Ship (1) `src/core/field-recolour.ts` `recolourField`, (2) `GameState.fieldColourIndex`/`lcolor` seeded in `createGame` and threaded through `stepPlay`/`stepDeath` (arm `lcolor` when the connected length changes), (3) `main.ts` `fieldPens(p.stamp, state.fieldColourIndex)` at both call sites. Do NOT swap to global `playfieldPens` — the AC3 guards will redden. Then the /millipede/ visual playtest for AC4.
## Dev Assessment

**Status:** GREEN — all 10 RED tests now pass; the 5 AC3 green-on-arrival guards stayed green (the per-code overrides survived the base shift — no `playfieldPens` swap). Full millipede project **1424/1424** (was 1423 + 1 new purity-sweep entry auto-covering `src/core/field-recolour.ts`). Repo-wide `tsc --noEmit` clean.

**Implemented (minimal, per the TEA contract):**
- `plugins/millipede/src/core/field-recolour.ts` — the pure `recolourField(fieldColourIndex, centin, lcolor)` LCOLOR gate (MLIRQ.MAC:248-255). Auto-covered by the purity sweep.
- `plugins/millipede/src/core/game-state.ts` — `GameState.fieldColourIndex` (init NCENT) + `GameState.lcolor` (init false); `createGame` seeds both.
- `plugins/millipede/src/core/sim.ts` — `stepPlay` arms `lcolor` when the connected length changes and latches via `recolourField`; the return now carries `fieldColourIndex`/`lcolor`. Only `stepPlay` recomputes `centin`, so no other path needed wiring.
- `plugins/millipede/src/main.ts` — both field-draw call sites now pass `fieldPens(p.stamp, state.fieldColourIndex)`; the bare frozen-at-12 call is gone.

**No new numeric ROM constant** was added, so `citations.test.ts` needs no new claim (row = CENTIN-1 already lives in the cited `waveColours` table).

**Visual playtest (AC4) — PENDING eyes.** The byte-level proof is complete, but AC4's steady-no-strobe confirmation at `/millipede/` against `ingame-mame-reference.png` needs a human/Reviewer smoke. Note the recolour manifests only mid-game as the millipede shortens (the boot screen is unchanged at CENTIN=12), so there is no boot-visual regression risk; the step must be watched during play. This is the standing "only eyes prove the picture" discipline, not a gap in the implementation.

**Handoff:** To TEA for the verify phase (simplify + quality-pass), then Reviewer.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1425/1425 green, tsc clean, 0 smells |
| 2 | reviewer-edge-hunter | Skipped / disabled | Skipped / disabled | none | Reviewer covered manually: fieldColourIndex ∈ [1,12] always; waveColours RangeError unreachable; segment-kill→0 reloads NCENT edge handled |
| 3 | reviewer-silent-failure-hunter | Skipped / disabled | Skipped / disabled | none | N/A — pure reducer, no error handling / catches / fallbacks in the diff |
| 4 | reviewer-test-analyzer | Yes | findings | 5 | confirmed 2 (F3 DDT-glyph parasitic regex, F4 weak negative), fixed; 3 low (AC4 integration, boundary) — AC4 integration test ADDED, boundary deferred (caller-guarded) |
| 5 | reviewer-comment-analyzer | Yes | findings | 6 | confirmed 2 root issues (F1 citation :255→:255-256, F2 lcolor docstring), fixed; verified all citations against vendored source |
| 6 | reviewer-type-design | Skipped / disabled | Skipped / disabled | none | Reviewer covered manually: recolourField returns a clean typed record; GameState fields number/boolean; no stringly-typed API, no unsafe cast (rule-checker #1 concurred) |
| 7 | reviewer-security | Skipped / disabled | Skipped / disabled | none | N/A — no external/user input, no auth, no secrets; GameState is internal sim state (rule-checker #10 concurred) |
| 8 | reviewer-simplifier | Skipped / disabled | Skipped / disabled | none | Reviewer covered manually: 3-line reducer, single consumer, minimal wiring; the one redundant test double-cast was simplified |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 (F5 stale sibling comments ×2, rules #17/#24), fixed; 33 rules / 61 instances checked, all else clean |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled, disabled domains assessed by the Reviewer)
**Total findings:** 5 confirmed (F1-F5, all fixed in round 1), 0 dismissed, 1 deferred (recolourField invalid-range boundary — caller-guarded, function has no validation by design)

## Reviewer Assessment

**Verdict:** APPROVED

**Round:** 1 (findings raised and fixed in-review; re-verified before verdict).

Dispatch coverage — `[EDGE]` manual (index range / kill-to-zero edge, clean) · `[SILENT]` N/A (no error paths) · `[TEST]` test-analyzer: 2 confirmed, FIXED + mutation-proven · `[DOC]` comment-analyzer: 2 confirmed, FIXED (citations verified vs source) · `[TYPE]` manual + rule-checker #1: clean · `[SEC]` N/A (no I/O/input) · `[SIMPLE]` manual: minimal, one redundant cast removed · `[RULE]` rule-checker: 33 rules, 2 confirmed (stale comments), FIXED.

### Summary
A faithful, minimal implementation of the MLIRQ.MAC LCOLOR gate. The pure reducer, GameState fields, single-site sim wiring, and the two main.ts draw-site args are all correct; the ROM citations are accurate (verified against `reference/original-source/millipede/`); purity and the citation-claim posture are clean. Five findings surfaced, all minor (no Critical/High), all fixed in round 1 (commit 9d5704b1) and re-verified: **1425/1425 millipede green, tsc clean.** The one materially important finding — the DDT-glyph wiring guard was parasitic on its sibling line and could not catch a regression of its own call site — was hardened (line-anchored + a hardcoded-index/playfieldPens ban) and **mutation-proven**: `fieldPens(p.stamp, 12)` now reddens the guard where it previously passed.

### Rule Compliance
Ran the TypeScript lang-review checklist (33 numbered rules, via rule-checker + my own read) plus CLAUDE.md's core/shell + citation rules against every changed function/field:
- **Core/shell purity (#31):** `field-recolour.ts` is pure (no browser/clock/entropy/shell import); auto-swept by `tests/purity.test.ts`. COMPLIANT.
- **New ROM constant needs a claim (#32):** no new numeric literal added (reuses `NCENT` + `waveColours`); no citation claim required. COMPLIANT.
- **Source-text guards match the CLAIM not a token (#15/#25):** the non-glyph regex is fully anchored; the DDT-glyph regex was leaking (F3) and is now line-anchored with negative bans. COMPLIANT after fix.
- **Test apparatus fails-by-passing (#18):** end-to-end kill derives its expected value from a real `stepGame`, not the fixture; fakeCtx is the mutation-exercised ml9-2 pattern. COMPLIANT.
- **Single-exit edge computation (#14):** LCOLOR edge computed once before stepPlay's sole return. COMPLIANT.
- **Type-safety escapes (#1), null handling (#4), async (#7), error handling (#11):** all COMPLIANT (rule-checker enumerated 61 instances).
- **Stale mechanism comments (#17/#24):** two sibling survivors (F5) corrected. COMPLIANT after fix.

### Devil's Advocate
I argued this code is broken and chased each thread to ground. **"The gate is dead — lcolor is never true, so the field never recolours."** Refuted by the end-to-end segment-kill test and the new 240-frame integration test: a real length change arms `armed` locally and `recolourField` latches the index the same frame; `fieldColourIndex` provably tracks the live length. The flag being same-frame-transient is a documented modeling choice, not a failure — the recolour still happens. **"A crash: waveColours throws outside 1..12, and some path feeds it a bad index."** Refuted: `newCentin = liveSegs===0 ? NCENT : liveSegs` bounds it to [1,12]; the integration test asserts the range every frame across 240 frames; no non-play path mutates the index off-range. **"The DDT/mushroom colours regress — the base swap drops ml9-2/ml9-3."** This was the real risk the story warned of; the 5 AC3 guards plus the new `playfieldPens` ban prove the per-code overrides survive at CENTIN 8 and 12. **"A confused maintainer re-freezes the base by hardcoding 12 or swapping to playfieldPens and the tests stay green."** This was TRUE for the DDT-glyph site (F3) and is now false — mutation-proven. **"A stressed render path: attract/death/game-over draw the field with a stale index."** Checked: those phases carry `fieldColourIndex` via `...state`, consistent with the preserved `centin`; the boot/attract screen is unchanged at 12 (no regression). **"The citations lie."** Checked every one against the vendored source; the only issue was ranges stopping at :255 before the DEY at :256 — corrected. Remaining honest gap: AC4's *steady, no-strobe* is proven at byte level and by construction, but the final visual confirmation at `/millipede/` needs human eyes (the recolour only shows mid-game as the millipede shortens) — routed below, not blocking.

### Handoff
To SM (Baldur) for the finish ceremony. **One non-blocking item to route:** AC4 visual playtest at `/millipede/` (watch the field step colour as the millipede shortens, against `ingame-mame-reference.png`) — human smoke, not automatable from the boot screen.
## Impact Summary

**ml11-1 — CENTIN/LCOLOR-gated per-length field recolour — SHIPPED (PR #484, merged to develop).**

**Blocking:** 0. Reviewer verdict APPROVED (round 1). No Critical/High findings at any point. The five round-1 findings (F1-F5) were all minor and all fixed in-review (commit 9d5704b1), re-verified: millipede 1425/1425 green, tsc clean, F3 mutation-proven.

**What changed:** a pure LCOLOR-gate reducer (`src/core/field-recolour.ts`), two GameState fields (`fieldColourIndex`/`lcolor`) seeded by `createGame` and armed+latched in `stepPlay`, and the two `main.ts` field-draw call sites now thread the latched index. The ml9-2/ml9-3 per-code caps/DDT colours are preserved (compose already lived in `fieldPens`).

**Follow-ups routed (non-blocking):**
- **AC4 visual playtest** at `/millipede/` — human smoke, watch the field step colour as the millipede shortens vs `ingame-mame-reference.png`. Not automatable from the boot screen (the recolour only shows mid-game). Owner: next visual-QA pass on millipede.
- **lcolor cross-frame semantics** — currently same-frame arm+consume (the field is a ROM-shape mirror, always false integrated). Becomes genuinely cross-frame when ml3-2 splits land. Documented in Design Deviations; no action until splits.
- **recolourField invalid-range boundary** — the reducer has no input validation (caller-guarded to 1..12). Deferred; add validation only if a second, unguarded caller appears.
