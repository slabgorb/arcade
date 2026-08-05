---
story_id: "jt9-15"
jira_key: ""
epic: "jt9"
workflow: "tdd"
---
# Story jt9-15: Measure PTEBRD and route the ptero-vs-buzzard pair: SNETHD sounds, then the ptero/bird collision resolves

## Story Details
- **ID:** jt9-15
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** main
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-05T12:35:41Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-05T12:06:08Z | 2026-08-05T12:07:29Z | 1m 21s |
| red | 2026-08-05T12:07:29Z | 2026-08-05T12:24:52Z | 17m 23s |
| green | 2026-08-05T12:24:52Z | 2026-08-05T12:29:02Z | 4m 10s |
| review | 2026-08-05T12:29:02Z | 2026-08-05T12:35:41Z | 6m 39s |
| finish | 2026-08-05T12:35:41Z | - | - |

## Sm Assessment

3-point TDD story in the joust epic (jt9). Filed by jt5-16, which admitted the pterodactyl to `collisionPass`'s eligible set but routed ONLY the ptero/ptero pair; the mixed ptero/buzzard pair was deliberately left unbuilt, and `tests/demo-jt5-16.test.ts` pins that a ptero/buzzard overlap resolves NOTHING until this story lands.

**TEA must, in order:**
1. **Read PTEBRD from the ROM first** — it is UNMEASURED. In JOUSTRV4.SRC the no-kill branch (:4961) sounds SNETHD FIRST (:5019 OSTHT2 `LDX #SNETHD` / :5020 `JSR VSND`), then tests PID for `#$80+PTEID` (:5022-5027). A pair with exactly ONE pterodactyl routes to PTEBRD ('COLIDE PTERODACTYL & BIRD') via OSTPX (:5034) when the ptero is party U, or via OSTH13's `EXG X,U` (:5037-5038) so the ptero is ALWAYS in U on entry. Settle who bumps, who dies, and what cue (beyond the already-sounded SNETHD) BEFORE porting. Claim the read in `docs/rom-study/claims` (JT516-001/002 already claim OSTH12's dispatch at :5031/:5033).
2. **Guard the port** — replace the mixed-pair skip in `collisionPass` (`plugins/joust/src/core/demo.ts`, comment 'a ptero pairs only with a ptero') with the measured routing, ptero-in-U orientation preserved.
3. **Flip the scope-fence test in place** — `tests/demo-jt5-16.test.ts` currently asserts a ptero/buzzard overlap resolves nothing; updating it here IS the point (exactly as jt5-16 flipped jt5-10's). Don't add a parallel test — flip the existing fence.

**Latent note inherited from jt5-16:** `spawnWavePteros` stacks a wave's ptero complement at one coordinate, so once mixed pairs resolve, wave entries with pteros near buzzards may cue — MEASURE, don't guess.

**Verification cautions (memory):** the joust audio-seam sweeps all read the same EVENT_KINDS tuple — assert the MOMENT a cue fires, not just its presence. If a new `tests/*.test.ts` file is added, the `audio-seam-scope` README file-count on the `--project joust` line reddens — bump it at RED time. SNETHD is an existing cue; adding an emitter one at a time and asserting the moment is the safe path.

Merge gate clear (no open PRs). Session + context created; routing to TEA for RED.

## Tea Assessment

RED delivered. Measured PTEBRD (JOUSTRV4.SRC:5203-5248) and pinned the ptero-vs-buzzard routing as failing tests.

**PTEBRD, measured.** Entry: REG.U is ALWAYS the pterodactyl (OSTH13's `EXG X,U`, :5037), REG.X the bird. It is a ONE-SIDED repulsion — every write targets `,X` (PBUMPY/PVELX/PBUMPX/PFACE), the pterodactyl (U) is only read; nobody dies, no score; SNETHD already sounded upstream (:5019). Who's-on-top = sign of `(PCOLY1+PCOLY2)_bird − (…)_ptero`, `BPL` (≥0, tie included) → ptero on top. The bird is driven AWAY by a **HARD ±5** (`LDA #-5`/`STA PBUMPY,X` up when bird on top :5213-5214; `LDA #5` down when ptero on top :5218-5219) — NOT the ordinary ±2 of OSTXUP/OSTXDN (:5163/:5175); OSTXUP/OSTXDN are called first but their ±2 is overwritten by the ±5. Claimed as JT915-001..004 (byte-verbatim, green).

**Port scope pinned to what's OBSERVABLE.** `toJoustEntity` hardwires `velX:0` and `withBounced` writes back only `velY`/`posY`, so PTEBRD's horizontal (`PBUMPX = −2·ptero.velX`) and `PFACE` arms are INERT in the current entity model — measured but not asserted (no field to pin them to; asserting would be vacuous — cf. [[node-env-cannot-guard-dom-branches]]). The VERTICAL hard bump + one-sidedness ARE observable and are the mutant-killers.

**Fixture geometry proved, not guessed** (cf. [[gate-into-a-pass-window-is-band-intersection]]). Directly computed `narrowPhase(BWNG3R, PT1RC)` at same X: overlap band dy ∈ [−8,+9], so the 4px offset (Y64/Y68) hits in both orientations. Both subjects probed INERT over 6 frames (velXIndex 0, velY 0), so the ±5 deltas and the ptero-still assertion are EXACT, not "≥". Confirmed the current fence RED state (mixed pair skipped → zero cues) before flipping.

**RED state (4 failing, all intended):**
- `demo-jt9-15.test.ts` (new): ptero-on-top → bird +5 & ptero unmoved (RED); bird-on-top → bird −5 & ptero unmoved (RED); `demo.ts` must name jt9-15 (RED). Claim-coverage + byte-verbatim + buzzard-pair CONTROL green.
- `demo-jt5-16.test.ts`: scope fence flipped IN PLACE (RED) — as jt5-16 flipped jt5-10's. Its other 7 tests stay green.
- Full `--project joust`: 4 failed / 2774 passed / 128 files. `npm run lint` clean.

**Collateral bumps handled at RED time** (cf. [[joust-test-file-count-census]]): `audio-seam-scope`'s two DERIVED guards would redden on a new test file + new claims, so README bumped 127→128 files and 961→965 claim(s) at BOTH sites — both guards green.

**For Dev (GREEN):** in `collisionPass` replace the mixed-pair skip (`(pa.kind === 'ptero') !== (pb.kind === 'ptero')` continue, demo.ts:1372) with PTEBRD routing. A ptero/buzzard hit must NOT fall through to the ordinary symmetric enemy bounce (that's the exact `±2` mutant the fence names) — orient ptero→U/bird→X regardless of loop order, emit `enemy-thud`, apply a hard `bumpY = ±5` to the BIRD only (direction by posY: ptero higher → +5 down, bird higher → −5 up; tie → ptero on top), fold via `consumeBumpY`, leave the ptero untouched, `continue` the inner loop (PTEBRD returns via `JMP HITEM2`, carry clear, like OSTH11). Annotate the site with `jt9-15` and rewrite the foot-note's "ONE ARM STAYS UNBUILT" block to closed.

### Rule Coverage
Language TS (pure-core sim). Applicable rules exercised:
- **Purity / core-boundary** — all new logic is core (`demo.ts`, `joust.ts`); tests import only `src/core`. No shell/DOM reference added. `purity.test.ts` stays green.
- **Meaningful assertions (no vacuous)** — every RED assertion compares an exact numeric delta (+5/−5/0) or an enumerated cue list; the ptero-still `=== 0` and the CONTROL guard non-vacuity. No `let _ =`, no always-true `is*`.
- **Mutation direction is restrictive** (cf. [[mutation-direction-must-be-restrictive]]) — the ±5 magnitude + ptero-unmoved jointly kill the "route through the ordinary ±2 symmetric bump" mutant (moves both by 2, ptero by 2 ≠ 0, bird by 2 ≠ 5) and the "do-nothing/still-skipped" mutant (no thud).
- **Assert the MOMENT (audio-seam)** (cf. [[audio-seam-suites-cannot-see-emitters]]) — the overlap precondition proves the pair overlaps on the cue frame; cues attributed by fixture (hush), not by the id-less stream.
- **Derived-count guards** — README file/claim counts re-derived and matched.

## Dev Assessment

GREEN. Followed TEA's spec exactly; all 4 RED tests pass, no regressions.

**Change (minimal, two files):**
- `joust.ts` — `BUMP_Y_HARD = 5` and pure `pteroBirdBump(bird, pteroOnTop)`. It reuses `bounceBottom`/`bounceTop` for the velY halve-reverse (PTEBRD calls OSTXUP/OSTXDN first) then OVERWRITES `bumpY` with the hard ±5 — mirroring `LDA #∓5 / STA PBUMPY,X` (:5213-5214/:5218-5219) overwriting OSTXUP/OSTXDN's ±2. Placed beside the other bounce laws with a ROM citation, per fleet consistency.
- `demo.ts` — the mixed-pair skip becomes: (1) skip player-vs-ptero (still `resolvePteroAttack`'s), (2) after the broad+narrow gate, a PTEBRD branch for the ptero-vs-enemy pair — orient ptero→U regardless of loop order, `pteroOnTop = pteroE.posY>>8 <= birdE.posY>>8` (tie → ptero on top, BPL includes zero), `bounced.set(bird, consumeBumpY(pteroBirdBump(...)))`, push `enemy-thud`, `continue` (OSTH11 carry-clear return). The pterodactyl is never added to `bounced`, so `withBounced` leaves it untouched — the one-sidedness is structural, not asserted-around. The foot-note's "ONE ARM STAYS UNBUILT" block rewritten to "THE LAST ARM, BUILT (jt9-15)".

**Fidelity note beyond the tests:** kept OSTXUP/OSTXDN's velY halve-reverse (via `bounceTop`/`bounceBottom`) even though TEA's fixtures use velY 0 (so it's a no-op there). It's the measured behavior and costs nothing extra; a plain ±5 would have dropped it. PTEBRD's horizontal/facing arms remain inert in this entity model (velX 0, `withBounced` carries only posY/velY), exactly as TEA scoped — not implemented, since there is no field to carry them and nothing observes them yet.

**Verify:** `npx vitest run --project joust` → 2778 passed / 128 files; `npm run lint` clean.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **Improvement (non-blocking)** — inherited from jt5-16's latent note, now ACTIVE. `spawnWavePteros` stacks a wave's whole ptero complement at ONE coordinate. With the mixed pair now resolving, a wave entry that lands pteros on top of buzzards will fire PTEBRD (enemy-thud + a hard bump) on entry — ROM-lawful physics but un-ROM-like cue timing, the same class as the ptero/ptero cue-spam jt5-16 flagged. Not triggered by this story's tests (the wave-open anchor discipline prevents `spawnWavePteros` from advancing), so nothing reddens. Flagging so Dev keeps the annotation truthful and Reviewer watches for a wave-entry thud burst; if it proves objectionable it wants its own follow-up (spread the stack coordinate) rather than a change here.

<!-- Reviewer findings below -->
### Reviewer (code review)
- **Improvement** (non-blocking): CONFIRMED TEA's wave-stack cue-spam observation and, because jt5-16 already forwarded it once ("owned by jt5-17's description" → renumbered jt9-15), **filed it as a concrete story rather than forwarding a third time — jt9-44** (`Suppress the wave-entry cue-spam from spawnWavePteros stacking pteros at one coordinate`, 3pts, p3, backlog). Affects `plugins/joust/src/core/demo.ts` (`spawnWavePteros`); may be closed WONTFIX after a human smoke test at a multi-ptero wave. Not blocking jt9-15 — this story's scope is fully delivered. *Found by Reviewer during code review.*
- **Test coverage** (resolved in-place): the PTEBRD who-is-on-top tie boundary (`<=`) was unpinned — a mutation battery showed `<=`→`<` surviving. Added a level-pair test (commit 4c7ccbc); mutant now dies. No open item.

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No design deviations at setup

### Reviewer (audit)
- No spec deviations to stamp: Dev implemented TEA's GREEN spec exactly (mixed-pair skip → PTEBRD branch, ptero→U orientation, hard ±5 one-sided bump, `continue`). No undocumented divergence found in the diff. One judgment call — keeping OSTXUP/OSTXDN's velY halve-reverse via `bounceTop`/`bounceBottom` even though the fixtures use velY 0 — is MORE faithful, not a deviation. ✓ ACCEPTED.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (2779 pass, lint clean) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via settings — assessed by reviewer (mutation battery) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via settings — assessed by reviewer |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Disabled via settings — assessed by reviewer (mutation battery) |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Disabled via settings — assessed by reviewer |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via settings — assessed by reviewer |
| 7 | reviewer-security | Yes | Skipped | disabled | Disabled via settings — assessed by reviewer |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via settings — assessed by reviewer |
| 9 | reviewer-rule-checker | Yes | Skipped | disabled | Disabled via settings — assessed by reviewer |

**All received:** Yes (1 ran — preflight; 8 disabled via `workflow.reviewer_subagents`, assessed directly via a mutation battery per this repo's standing practice)
**Total findings:** 1 confirmed (a coverage gap I closed in-place), 0 dismissed, 1 deferred (non-blocking, filed jt9-44)

## Reviewer Assessment

**Verdict:** APPROVED

8 of 9 reviewer subagents are disabled here, so — per this repo's standing practice — the real signal came from a **mutation battery** on the live implementation, one axis at a time, restoring between each:

| Mutant | Expectation | Result |
|--------|-------------|--------|
| `BUMP_Y_HARD` 5 → 2 (magnitude = ordinary bump) | die | ✓ 3 failed |
| `pteroBirdBump` sign flip (direction) | die | ✓ 3 failed |
| also bump the ptero (break one-sidedness) | die | ✓ 3 failed |
| drop the `enemy-thud` cue | die | ✓ 3 failed |
| `pteroOnTop` `<=` → `<` (tie boundary) | die | ✗ **SURVIVED** → fixed |

The surviving tie-boundary mutant was the one real finding. The implementation was already correct and ROM-faithful (JT915-002: PTEBRD's `BPL` takes the tie), but no test pinned it. **[TEST]** I closed it in place with a level-pair case (both at Y64 → ptero-on-top → bird +5, ptero unmoved) rather than paying a REJECT cycle for a measure-zero boundary where the code was right; re-running the mutant now kills it (commit 4c7ccbc).

**Tagged findings (disabled subagents assessed directly):**
- **[EDGE]** The three orientations (ptero-higher, bird-higher, level) are now all covered; the narrow-phase overlap band (dy ∈ [−8,+9], computed, not guessed) contains every fixture. Loop-order independence verified: `pteroIsA` orients ptero→U regardless of which of pa/pb is the ptero.
- **[SILENT]** No swallowed errors — the branch has no try/catch, no fallback; a non-hit `continue`s and a hit resolves. `bounced.set` for the bird only; the ptero's absence from the map is the (structural) one-sidedness, not a silent drop.
- **[TEST]** Non-vacuous: every assertion is an exact numeric delta or an enumerated cue list; RED→GREEN transition demonstrated (4 failed at RED). CONTROL (buzzard pair) guards non-vacuity of the harness.
- **[DOC]** Comments updated truthfully: the foot-note's "ONE ARM STAYS UNBUILT" → "THE LAST ARM, BUILT (jt9-15)"; the skip comment rewritten to the PTEBRD branch. No stale prose left (verified the whole GAP-CLOSED block).
- **[TYPE]** `pteroBirdBump(bird, pteroOnTop: boolean)` is well-typed and pure; `BUMP_Y_HARD` is a named ROM-cited constant beside `BUMP_Y_TOP/BOTTOM`. No stringly-typed API, no unsafe cast.
- **[SEC]** N/A — pure deterministic sim, no I/O, no auth, no tenant data, no user input. Nothing to isolate.
- **[SIMPLE]** Minimal: the branch reuses `bounceTop`/`bounceBottom` (the OSTXUP/OSTXDN velY law) and `consumeBumpY`; the only new surface is one 5-line helper and one constant. No over-engineering. The horizontal/facing arms of PTEBRD were correctly NOT built (inert in this entity model — asserting them would be vacuous).
- **[RULE]** See Rule Compliance below.

**[VERIFIED] purity** — the new code lives in `src/core/joust.ts` and `src/core/demo.ts`, both pure; `pteroBirdBump` mutates nothing (spreads a fresh object); no `window.`/`document.`/shell import added. `purity.test.ts` green. Complies with CLAUDE.md's core/shell boundary.
**[VERIFIED] carry/loop law** — the PTEBRD branch `continue`s the inner loop, matching OSTH11's carry-clear `JMP HITEM2` return (jt9-16's law); a `break` or fall-through would double-resolve — the "drop continue" reasoning is corroborated by the ptero-still + magnitude assertions that would fail under fall-through. Evidence: demo.ts branch ends in `continue`, resolveContacts is never reached for a mixed pair.
**[VERIFIED] player-ptero untouched** — `mixedPtero && (…kind==='player')` still `continue`s BEFORE the PTEBRD branch, so `resolvePteroAttack` remains the only resolver for player↔ptero; demo-jt5-16 Group 2 (both lance bands) stays green — evidence: demo.ts:1375.

### Rule Compliance
- **Core/shell purity (CLAUDE.md):** every changed source line is in `src/core`; no shell/DOM reference. ✓ (`purity.test.ts` green)
- **ROM-cited constants (fleet convention):** `BUMP_Y_HARD = 5` carries `LDA #-5/#5, :5213/5218`; `pteroBirdBump` cites :5203-5248/:5212/:5217. ✓
- **Claims byte-verbatim + derived counts (audio-seam-scope):** JT915-001..004 verbatims byte-match the ROM; README file-count (128) and claim-count (965 ×2) re-derived and matched. ✓
- **Extract-only-on-second-use (CLAUDE.md):** `pteroBirdBump` is a NEW law (PTEBRD's hard bump), not premature sharing; it composes the existing `bounce*` laws. ✓
- **No manual sprint-YAML edits:** jt9-44 filed via `pf sprint story add`; `pf validate sprint` 9/9. ✓

### Devil's Advocate
Suppose this code is broken. The most likely break is the tie boundary — and it WAS the weak point: the mutation battery proved `<=`/`<` interchangeable until I added the level-pair test, so a future refactor could have silently flipped a level pair's bird from +5 to −5. Closed. Next: does the pterodactyl REALLY stay still, or does some later pass move it? The ptero is `kind:'ptero'`, gravity-exempt, velXIndex 0 — probed inert over 6 frames — and it is never added to `bounced`, so `withBounced` cannot touch it; the assertion `pteroAfter − pteroBefore === 0` is exact, not incidental. Could a mixed pair ALSO fall into the ordinary enemy-bounce branch and double-resolve? No — the `mixedPtero` branch `continue`s before `resolveContacts`, and the "also-bump-ptero" and magnitude mutants both died, which is exactly what a double-resolution would have surfaced. What about the horizontal arm the port skipped — is dropping it a correctness hole? In the current entity model `toJoustEntity` hardwires `velX:0` and `withBounced` carries only posY/velY, so `PBUMPX = −2·ptero.velX` is identically 0 and `PFACE` is preserved regardless — building them would be dead code asserting nothing (the node-env-vacuity trap). What would a confused player experience? A pterodactyl brushing a buzzard now thuds and knocks the buzzard away hard — correct and ROM-faithful. The one genuinely un-ROM-like artifact is the wave-entry cue BURST when `spawnWavePteros` stacks pteros at one coordinate (now active for mixed pairs); it is not triggered by any test (both suites anchor the wave open) and the physics is lawful — deferred to jt9-44 rather than hacked around here. Stressed inputs (huge/negative posY): `posY>>8` is integer arithmetic, no overflow path in a 16-bit-ish sim; `consumeBumpY` shifts whole pixels. Nothing found that blocks.

**Data flow traced:** overlapping ptero+buzzard processes → `collisionPass` eligible set → broad+narrow phase gate → `mixedPtero` branch → `pteroBirdBump(birdE, pteroOnTop)` → `consumeBumpY` → `bounced.set(bird)` + `enemy-thud` cue → `withBounced` writes the bird's posY, ptero untouched. Safe: one-sidedness is structural (ptero never entered into `bounced`).
**Pattern observed:** composing existing bounce laws + overwriting the constant — mirrors the ROM's "OSTXUP/OSTXDN then STA #±5" — at joust.ts pteroBirdBump.
**Error handling:** no failure path; non-participants `continue`, masks null-checked before narrowPhase (demo.ts:1382).
**Handoff:** To SM for finish-story.