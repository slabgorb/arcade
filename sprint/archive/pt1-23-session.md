---
story_id: "pt1-23"
jira_key: "pt1-23"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-23: defender: five of seven enemy types are never drawn

## Story Details
- **ID:** pt1-23
- **Jira Key:** pt1-23
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-23-defender-draw-five-enemy-banks
- **PR:** #663 (MERGED into develop, merge commit 307f684a) — no squash, per repo convention

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-20T22:08:32Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T21:33:38Z | 2026-08-20T21:35:51Z | 2m 13s |
| red | 2026-08-20T21:35:51Z | 2026-08-20T21:44:00Z | 8m 9s |
| green | 2026-08-20T21:44:00Z | 2026-08-20T21:47:59Z | 3m 59s |
| review | 2026-08-20T21:47:59Z | 2026-08-20T21:59:40Z | 11m 41s |
| green | 2026-08-20T21:59:40Z | 2026-08-20T22:06:56Z | 7m 16s |
| review | 2026-08-20T22:06:56Z | 2026-08-20T22:08:32Z | 1m 36s |
| finish | 2026-08-20T22:08:32Z | - | - |

## SM Assessment (setup)

Baldur the Bright, setup phase.

- **Board clear on arrival.** No branch matched `pt1-23`; no sibling `.session/` file for it (a-2 is on pt1-26). No open PRs (merge gate clear). Claim pushed immediately: `in_progress` stamp + `context-story-pt1-23.md` committed and `feat/pt1-23-defender-draw-five-enemy-banks` pushed to `origin`, so the story is now visibly owned.
- **Dependency satisfied.** pt1-23 depends on pt1-22 (live palette) for the TIE/pod/bomb/mutant colours; pt1-22 is `done` and merged. The blit loop can now be built and verified against real colours, not black-on-black.
- **ACs derived, not copied.** Epic YAML has `acceptance_criteria: null`; sm-setup derived them into the context from the description. TEA: treat the derived ACs as the primary spec but read the description's cited lines yourself.
- **Freshness.** The description is dated today (2026-08-20) from the render audit, so its line citations (`sim.ts:212-217`, `:722-727`, `:626`; `composeFrame` blits only landers/humanoids) are current — no staleness correction applied.
- **Domain reminder (load-bearing).** Defender's raster draw is in `plugins/defender/src/core/scene.ts` — HUD/scanner/bezel/sprites compose into indices in `composeFrame` (pure core, NOT shell). Any "is bank X drawn?" premise-check must grep `core/scene.ts`; grepping `shell/` will mis-verify (this bit df7-5). Collision projection `projectWorldX` (`sim.ts:626`) is the same projection the render must use — positions are already correct, so the RED test should assert the banks blit at their projected positions, and mutant/bomber/pod/bomb visibility depends on pt1-22's now-live palette (indices A-F).

## TEA Assessment (red)

Tyr One-Handed, RED phase. Test file: `plugins/defender/tests/pt1-23-enemy-banks-drawn.test.ts` (committed `1fc066ce`).

**The defect, confirmed in source.** `composeFrame` (scene.ts:459-472) loops over `state.landers` and `state.humanoids` only. The other six live banks — `mutants`, `baiters`, `bombers`, `pods`, `swarmers`, `bombs` — are populated on the public `SimState` by `withBanks` (sim.ts:426-449) straight from the runtime banks the scheduler advances, and `enemyObjects` (sim.ts:745-762) already adds every one to the **collision** list via `toScreenCol` (= `projectWorldX`, sim.ts:626). So positions exist and are correct; the draw is simply absent.

**Derived ACs (epic YAML had `acceptance_criteria: null`):**
1. Each of the six banks (mutants/baiters/bombers/pods/swarmers/bombs) is blitted into the main view when it has a live, on-window member.
2. Each is drawn at the column `projectWorldX` gives — the same projection collision uses — not `projectOnscreenX` or a naive absolute column.
3. The blit honours the visible-window cull: an off-window member is not drawn, and scrolling the camera to it reveals it.
4. A dead member (`alive: false`) is not drawn (bombs excepted — a Bomb has `lifetime`, not `alive`, and is drawn while present).

**RED evidence (testing-runner, RUN_ID pt1-23-tea-red):** defender project 1131 tests, **1114 pass / 17 fail**, all 17 failures inside the new file, no pre-existing reds anywhere else. Within the file: 17 fail / 7 pass. The 7 that pass now are the fixture-projection sanity (1) and the six off-window-cull assertions (correctly "not drawn" while nothing is drawn) — both become load-bearing once GREEN lands.

**Method note (why the tests are not vacuous):** palette-agnostic diff-against-control (pt1-18/df5-9 idiom). Each assertion's terms come from `composeFrame` output + `projectWorldX` (both code under test), never test-local literals (lang-review #18/#26). Count is asserted before iteration (#15). The frame carries **indices**, so the tests are independent of pt1-22's colours — but pt1-22 is merged, so at runtime the A-F indices now decode to real colours.

**For Dev (GREEN):** add one blit loop per bank in `composeFrame`, modelled exactly on the lander loop (project through `projectWorldX`, `continue` on `null`, `continue` on `!alive`). Bombs have no `alive` — draw every bomb in the bank. Each bank blits its ROM sprite: mutant `SCZP1`, baiter `UFOP1`, bomber `TIEP1`, pod `PRBP1`, swarmer `SWPIC1`, bomb `BMBP1` (the `*_PICTURE` consts already exist, sim.ts:76-82 — but they live in sim.ts; scene.ts will need the object labels, e.g. via `require_(OBJECTS, ...)` like the ship/lander). Keep the core-boundary rule: this is all in `core/scene.ts`, no shell.

### Rule Coverage (lang-review/typescript.md)
- **#15 (token vs claim), #25 (whole-file scope):** N/A by construction — no source-text greps; every guard asserts on the composed **framebuffer**, the actual mechanism. Count asserted first; universally-quantified loops (`Math.min/Math.max` over `cols`) run only after `length > 0`.
- **#18 (apparatus fails by passing), #26 (terms all test-local):** guarded — fixtures set `wx`; assertions read `composeFrame`/`projectWorldX` output. The dead-member test includes a live-member control in the same case so it cannot pass vacuously post-GREEN.
- **#29 (ordering vs magnitude):** the projection assertion carries the **column magnitude** (`ON_COL` = 121, pinned from `projectWorldX(WX,0)`), not just "is drawn", so a wrong-projection GREEN reddens.
- Test-quality (#8): no `as any`, no vacuous `is*` assertions; each `it` has a meaningful, mutation-relevant expectation.

## Dev Assessment (green)

Loki Silvertongue, GREEN phase. Implementation commit `06918f74` (`plugins/defender/src/core/scene.ts`).

**What I did.** Added the missing blit loops to `composeFrame`, directly after the humanoid loop:
- Six sprite-label consts (`MUTANT_OBJECT`='SCZP1', `BAITER_OBJECT`='UFOP1', `BOMBER_OBJECT`='TIEP1', `POD_OBJECT`='PRBP1', `SWARMER_OBJECT`='SWPIC1', `BOMB_OBJECT`='BMBP1') — the same ROM labels the sim already blits for spawn/death/collision (sim.ts:76-82).
- A local `blitBank(recs, label)` helper for the five `alive`-bearing banks (mutants/baiters/bombers/pods/swarmers), modelled exactly on the lander loop: `require_` the sprite, skip `!alive`, project via `projectWorldX(r.x, camera)`, skip `null` (the visible-window cull), `blitObject` at the projected column and the record's row. This mirrors `enemyObjects`' own `add` helper (sim.ts:748) so render and collision walk the banks identically.
- An explicit loop for `state.bombs` — a `Bomb` has `lifetime`, not `alive` (ties.ts:52-56), so every bomb in the bank is drawn while present, same projection + cull.

All banks read the PUBLIC `state.*` view fields `withBanks` fills (sim.ts:426-449), so what the live scheduler produces each tick is exactly what these loops draw.

**Minimalism.** No new abstraction beyond the one helper that removes five identical copies; the bomb loop is written out because its record shape differs. No changes outside `composeFrame`. Purity untouched — I used only imports already present (`projectWorldX`, `blitObject`, `require_`, `OBJECTS`), no shell/clock/entropy — and the purity/core-boundary suite is green.

**Scope held to the story.** Only the main-view blit. The scanner-strip and enemy-shots gaps TEA logged as non-blocking findings are left for follow-ups — drawing them here would be scope creep the tests don't ask for.

**GREEN evidence.** pt1-23 file: 24/24 pass. Full defender vitest project: **1131/1131 pass** (88 files). Repo-wide `npm run lint` (`tsc --noEmit`): clean. testing-runner confirmation below.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (1131/1131 green, lint clean, no debug code) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 6 | confirmed 4 (3 High, 1 Med), deferred 2 (Low, forward-looking) |
| 5 | reviewer-comment-analyzer | Yes | findings | 9 | confirmed 9 (all Low, grouped into L1–L5) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A (30 rules, 47 instances, 0 violations; purity boundary clean) |

**All received:** Yes (4 enabled specialists returned; 5 disabled)
**Total findings:** 8 confirmed (3 High, 1 Medium, 4 Low-grouped), 2 deferred, 0 dismissed
**Working-tree audit:** `pf reviewer audit-tree` — initially false-DIRTY on the pf-written `sprint/epic-pt1.yaml` status stamp (tracking-only, `in_progress`→`in_review`); restored with `git checkout --`, re-ran CLEAN. No source/test files were dirty; my own mutation probes on scene.ts reverted clean (verified `git diff --stat` empty each time); the test-analyzer and rule-checker used isolated worktrees.

## Reviewer Assessment

**Verdict:** REJECTED

Heimdall, review phase (round 1). The implementation is behaviourally correct — the projection matches the collision path, the `alive` guard and null-cull mirror the lander loop, bombs draw by presence, and the full defender suite plus repo-wide `tsc` are green. rule-checker cleared all 30 checks and the core/shell purity boundary. **But the tests are weaker than a story about drawing the *correct* sprite at the *correct* place demands, and I proved it by mutation.** Three High-severity coverage gaps block the merge; a batch of citation errors in the new comments must also be fixed.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH][TEST] | Wrong-sprite-per-bank mutation survives. `diffCols`-against-`cleared()` proves only that *some* pixels appeared, never that they came from *that bank's own* sprite. **I confirmed by mutation:** swapping `MUTANT_OBJECT`/`BAITER_OBJECT` in scene.ts:502-503 (mutants drawn as UFOP1, baiters as SCZP1) → 24/24 still green. A copy-paste like `blitBank(state.pods, BOMBER_OBJECT)` would draw pods as TIEs and ship green. | pt1-23-enemy-banks-drawn.test.ts:225 (the "blitted at their projected column" it.each) | In the "is drawn" case, assert the palette **indices** painted in the bank's diff region are that bank's own sprite nibbles — i.e. the set of non-zero indices equals the distinct non-zero nibbles of `OBJECTS[label].bytes` — so the correct sprite, not merely *a* sprite, is required. |
| [HIGH][TEST] | Projection tolerance `MAX_SPRITE_PX` is one global bound sized to the widest sprite (UFOP1, 12px) and applied to every bank, so it under-protects the four narrower banks. **Mutation (analyzer, empirical):** a +5-column offset in `blitBank` is caught only for mutants/baiters; bombers/pods/swarmers/bombs ship 5px off `projectWorldX` and stay green — defeating the very projection-agreement claim the comment makes. | pt1-23-enemy-banks-drawn.test.ts:115 (`MAX_SPRITE_PX = 2*6`), assertion at :172 | Bound each bank by *its own* sprite width: `2 * OBJECTS[label].width`. Then a per-bank projection offset reddens for every bank. |
| [HIGH][TEST] | Only-first-of-N survives. Every fixture places exactly one member per bank, so "all live members draw" is unproven. **I confirmed by mutation:** `for (const r of recs.slice(0, 1))` (draw only the first member) → 24/24 still green. The real sim fields several members per bank simultaneously (BAITER_MAX, SWARMER_MAX, BOMB_MAX). | pt1-23-enemy-banks-drawn.test.ts:107 (BANKS fixtures) | Add a case with ≥2 members per bank at distinct world-x, asserting ≥2 disjoint drawn-column clusters (or a distinct-column count ≥ members). |
| [MEDIUM][TEST] | The six "off-window culled" assertions are not independently discriminating — they pass even with the feature entirely absent (a zero-length diff can't distinguish "culled" from "never drawn"). They are load-bearing only in combination with the paired on-window/reveal cases (a clamp-instead-of-cull mutation reddens 5/6). The individual failure message ("must NOT be blitted") claims more than the assertion alone proves. | pt1-23-enemy-banks-drawn.test.ts:244 | The H1 index-assertion on the on-window case, plus keeping the reveal case, makes the pairing explicit; at minimum soften the standalone claim or fold the off-window check into the same test as the on-window positive. |
| [LOW][DOC] | L1: `BOMBER_OBJECT = 'TIEP1' // ...DEFB6.SRC:997` cites the TIEST **spawn routine** line, not the sprite. Its three siblings (SCZP1:1896, PRBP1:1909, BMBP1:1935) correctly cite the bitmap declaration; TIEP1's bitmap is DEFB6.SRC:**1923** (objects-data.ts:43). | scene.ts:119 | Cite `DEFB6.SRC:1923` for sibling consistency (the const names the sprite). |
| [LOW][DOC] | L2/L4: "projectWorldX = toScreenCol, sim.ts:626" is wrong — line 626 is a pt1-22 colour-cycle line; `toScreenCol` is defined at sim.ts:**660**. Appears in scene.ts and twice in the test. | scene.ts:487; test:13, test:169 | Cite `sim.ts:660`. |
| [LOW][DOC] | L3: test header says the six banks "are live in SimState (sim.ts:212-217)" — 212-217 is ship/camera/stars/lasers/landers/humanoids; the six banks are at sim.ts:**218-223**. | test:6 | Cite `sim.ts:218-223`. |
| [LOW][DOC] | L5: the test's lander-loop citations (`scene.ts:459-472`, `:462-463`, `:461`, quoting `if (!lander.alive) continue`) were correct when the test was written, but this same diff's 10-line const block shifted them +10 — they now land on terrain/ship/ADR code. | test:12, :164, :183, :206 | **Cite the symbol, not the line** (the lander loop / the `alive` guard) — line numbers self-shift, which is exactly what happened here (lang-review #17; cf. the joust/star-wars line-citation guards). |

**Deferred (not blocking):**
- test-analyzer #5 (no exact visible-window boundary case for a bank member): forward-looking; the boundary is exercised in world.ts's own tests and the code passes `r.x` straight through. Nice-to-have; may be added with the H3 multi-member work.
- test-analyzer #6 (bomb lifetime==0 boundary): not reachable today — `lifetime` is never decremented in ties.ts; the fixture's `dead: null` correctly reflects that. For the future story that adds bomb expiry.

**Noted, no action:** `diffCols` is now duplicated a 4th time (df5-9, pt1-18, this file). rule-checker flagged it as the #18 "extract on the second consumer" smell but ruled it compliant with the letter of the rule; the three copies are byte-identical with identical semantics, matching the existing convention. Extracting a shared test helper would touch unrelated test files — out of scope for this bug-fix.

**Additional observations:**
- `[RULE][VERIFIED]` reviewer-rule-checker cleared all 30 lang-review checks (47 instances, 0 violations) and the defender core/shell purity boundary — evidence: `blitBank` adds no shell/clock/entropy import (scene.ts:490-500), `?? []`/`col === null` handling compliant (#4), test imports carry `.js` (#5). I cross-verified the #17 comment-citation class myself and it is the one place the code is NOT clean (L1–L5), so rule-checker's "0 violations" is corrected on #17 by the comment-analyzer's findings, which I confirmed against source.
- `[TEST][HIGH]` sprite-identity, per-bank tolerance, and member-count all under-asserted (H1–H3, mutation-confirmed).
- `[DOC][LOW]` five citation groups wrong against the current tree (L1–L5, confirmed against source).

**Data flow traced:** a bank member's `state.<bank>[i].x` (world-X, filled by `withBanks` from the scheduler's runtime bank) → `projectWorldX(x, camera)` in `blitBank`/bomb loop → screen column → `blitObject` at that column, same window as the collision path (`toScreenCol`). Off-window → `null` → culled. Correct.

**Pattern observed:** `blitBank` (scene.ts:490-500) faithfully mirrors both the lander loop (scene.ts:470-475) and `enemyObjects`' `add` helper (sim.ts:748) — render and collision now walk the banks identically. Good pattern.

**Error handling:** `require_(OBJECTS, label, 'object')` fails loud on a missing transcribed sprite (all six labels verified present); called once per bank, not per member. Correct.

### Rule Compliance (lang-review/typescript.md)
Exhaustive check delegated to reviewer-rule-checker (30 rules, 47 instances, **0 violations**) and cross-checked by me on the highest-risk rules:
- **#1 type-safety:** `blitBank` param `readonly {readonly x,y,alive}[]`; test's `KILLABLE` type-predicate has the matching runtime `b.dead !== null`. Compliant.
- **#4 null handling:** `col === null` explicit narrowing after every `projectWorldX`; `?? []` on the possibly-absent bank arrays (matches the landers/humanoids convention). Compliant.
- **#5 modules:** all test imports carry `.js`; type-only imports marked. Compliant.
- **#15/#25 source-text guards:** none — the test is behavioural (framebuffer diff), count-asserted before position. Compliant.
- **#17 comments assert an unrun mechanism:** **VIOLATION class** — L1–L5 above are exactly this (citations reasoned/copied, not re-run against the current tree). Confirmed, must fix.
- **#18/#26 vacuous apparatus:** the fixtures are not "value-IS-expectation" and `diffCols` is a genuine pixel-diff, BUT H1/H2/H3 show the *assertions* don't constrain sprite-identity, per-bank position, or member-count — the apparatus is sound, the assertions are too weak. Confirmed.
- **Purity boundary (defender core):** new code adds no imports, no clock/entropy/DOM/shell; purity sweep clean. Compliant.

### Devil's Advocate
Assume this code ships broken. The most damning path is that the entire feature could be drawing the WRONG sprites and the suite would cheer. I proved the sprite-swap mutation is invisible: if Loki had fat-fingered the `blitBank` call list — `blitBank(state.pods ?? [], BOMBER_OBJECT)` next to `blitBank(state.bombers ?? [], POD_OBJECT)` — every pod on the planet would render as a TIE bomber and every bomber as a pod, and all 24 tests would stay green. For a story whose entire reason to exist is "the player must be able to SEE and IDENTIFY each attacker," a test that cannot tell a pod from a bomber is barely testing the story at all. Worse, the projection bound is loose enough (finding H2) that four of the six banks could be drawn five pixels off their true collision column — so a player's shot would connect with an enemy that visually sits elsewhere, the exact "attacks you invisibly / from nowhere" complaint the audit raised, reintroduced in a subtler form and shipped green. And because every fixture holds exactly one member (H3), a regression that drew only the first mutant of a swarm — leaving the rest of the wave invisible — would pass too; on a busy wave-4 screen that is most of the threat. A confused future maintainer reading the comments would be sent to sim.ts:626 (a colour-cycle line) looking for `toScreenCol`, to sim.ts:212-217 looking for banks that live at 218-223, and to scene.ts:461 (an ADR comment) expecting `if (!lander.alive) continue` — every one of those a small tax on the next person, and the kind of rot this project has spent whole review rounds cleaning up. None of these are hypothetical: three were reproduced by mutation, nine by reading the cited source. The behaviour is right today; the *net that keeps it right* has holes. REJECT and tighten.

**Handoff:** Back to Dev (Loki Silvertongue) for fixes — H1, H2, H3 (blocking) + M1 + the L1–L5 citation batch.

## Subagent Results

**Cycle: 1**

Re-review method: **targeted re-verification** of every round-1 finding with direct probes (not a fresh generalist sweep) — I re-ran each surviving mutation the specialists reported and re-checked each citation against source. This is the accepted stronger evidence for a characterized finding set.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes — re-verified | clean | none | N/A (defender 1137/1137 green, `tsc --noEmit` clean, no debug code, tree clean) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes — re-verified | findings | 3 (H1/H2/H3) resolved | confirmed fixed: I re-ran all 3 mutations — sprite-swap → 2 red, +5px offset → 5 red, slice(0,1) → 5 red (all were green in round 1) |
| 5 | reviewer-comment-analyzer | Yes — re-verified | findings | L1–L5 resolved | confirmed fixed: TIEP1→1923, toScreenCol→660 (scene.ts+test), banks→218-223, lander-loop refs now cite symbols; grep shows no stale :626/:212-217/scene.ts:4xx remain |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes — re-verified | clean | none | N/A (round 1: 30 rules/47 instances/0 violations; rework added no type escapes — `spriteOf` fail-loud, no `as any`, `??`/`===null` intact; purity boundary untouched) |

**All received:** Yes (4 enabled specialists re-verified; 5 disabled)
**Total findings:** all round-1 findings resolved (3 High fixed + mutation-confirmed, 1 Medium addressed, 5 Low citations fixed); 0 new findings
**Working-tree audit:** `pf reviewer audit-tree` — again false-DIRTY on the pf-written `sprint/epic-pt1.yaml` stamp only (tracking-only, `in_progress`→`in_review`); restored, re-ran CLEAN. No source/test files dirty; my mutation probes reverted clean (verified).

## Reviewer Assessment

**Verdict:** APPROVED

Heimdall, review phase (round 2 — round-trip 1). Every round-1 blocker is fixed and I proved it by re-running the exact mutations that survived before:

- `[TEST]` **H1 (sprite-identity)** — the "is drawn" case now asserts the painted palette indices are a subset of the bank's OWN sprite nibbles (`bankIndices` vs `spriteIndices(label)`). Re-ran the mutants↔baiters sprite-swap: **now 2 red** (was 0). A pod-drawn-as-TIE can no longer ship green.
- `[TEST]` **H2 (per-bank projection bound)** — `MAX_SPRITE_PX` replaced by `spriteFootprintPx(label) = 2 * OBJECTS[label].width`. Re-ran a +5px offset in `blitBank`: **now 5 red** (was 0). The four narrow banks are protected.
- `[TEST]` **H3 (every member)** — new two-member `it.each` asserts both the `ON_COL` and `ON_COL2` members draw. Re-ran `recs.slice(0,1)`: **now 5 red** (was 0).
- `[TEST]` **M1** — the on-window case carries the H1 identity assertion, and `stars` are cleared for a deterministic base; the off-window/cull pairing is now explicit.
- `[DOC]` **L1–L5** — all citations corrected against the current tree; lander-loop references now cite the SYMBOL, not self-shifting line numbers (which is what broke them the first time). Grep confirms no stale `:626`, `:212-217`, or `scene.ts:4xx` remain.
- `[RULE]` rule-checker was clean in round 1 (30 rules, 0 violations); the rework introduced no new type escapes and left the core/shell purity boundary untouched — re-verified by reading the diff.

**Data flow traced (unchanged, still correct):** `state.<bank>[i].x` (world-X from `withBanks`) → `projectWorldX(x, camera)` → screen column → `blitObject`, same window as collision (`toScreenCol`, sim.ts:660); off-window → `null` → culled.

**Pattern observed:** the test now pins sprite IDENTITY, PER-BANK position, and member COUNT — three axes a sprite-drawing story must hold — each mutation-verified. `blitBank` still mirrors the lander loop and `enemyObjects`' `add`.

**Error handling:** `require_`/`spriteOf` both fail loud on a missing sprite; `col === null` culls off-window. Correct.

**Deviation audit:** no undocumented deviations (see `### Reviewer (audit)`); the code matched spec from round 1 — the rework was test rigor + citations only.

**Handoff:** To SM (Baldur the Bright) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Improvement, non-blocking] (TEA) The scanner shows only landers, not the six banks either.** `drawScanner` (scene.ts:249-250) builds its blip list from `state.landers` alone, so mutants/baiters/bombers/pods/swarmers do not appear on the radar strip any more than they do in the main view. pt1-23's scope is the **main-view blit loop** (the story is explicit: "the defect is purely a missing blit loop"), so this is deliberately out of scope here — flagging it for a follow-up (the radar is the whole reason off-window attackers stay trackable, pt1-18). Reviewer: do not require scanner coverage for pt1-23 GREEN.
- **[Gap, non-blocking] (TEA) Enemy shots (`state.shots`) are also undrawn in the main view.** composeFrame draws player `lasers` but never `state.shots` (the enemy shot bank / `hazardObjects`). The story enumerates six banks and does not list enemy shots, so I scoped them OUT and the RED test clears `shots`. Likely the same class of bug; noting for a follow-up, not this story.

## Dev Assessment (rework — round-trip 1)

Loki Silvertongue, addressing Heimdall's round-1 rejection. Rework commit `5f14aebd`. No implementation logic changed — the round-1 verdict confirmed the code behaves correctly; the fixes are test rigor + comment citations.

**Test strengthening (mutation-verified now-red — I re-ran each of the reviewer's surviving mutations after the fix):**
- **H1 sprite-identity:** added `bankIndices`/`diffIndices` + `spriteIndices(label)`; the "is drawn" case now asserts every painted palette index is in THAT bank's own sprite nibbles. The mutants↔baiters sprite-swap now reddens (2 fail; was 0).
- **H2 per-bank tolerance:** replaced the single global `MAX_SPRITE_PX` with `spriteFootprintPx(label) = 2 * OBJECTS[label].width`. A +5px projection offset in `blitBank` now reddens for the narrow banks (5 fail; was 0).
- **H3 multi-member:** refactored `BankCase.live` → `atX(wxs[])`; added a two-member-per-bank `it.each` asserting both the col-`ON_COL` and col-`ON_COL2` members are drawn. `recs.slice(0,1)` now reddens (5 fail; was 0).
- **M1:** the on-window case now carries the H1 identity assertion, so the on-window/cull pairing is explicit; also cleared `stars` in `cleared()` for a deterministic base behind the index check. Left the off-window `it.each` in place (load-bearing in combination).

**Citation fixes (all confirmed against the current tree):**
- scene.ts:119 TIEP1 `:997` → `:1923` (the sprite bitmap; noted `:997` is the TIEST spawn routine).
- scene.ts + test toScreenCol `:626` → `:660`.
- test header six-banks `sim.ts:212-217` → `:218-223`.
- test lander-loop refs (`scene.ts:459-472`, `:462-463`, `:461`) → cite the **symbol** (the lander loop / its `if (!lander.alive) continue` / `if (col === null) continue`), not line numbers that self-shift.

**Verification:** defender project **1137/1137** green (+6 multi-member tests); repo-wide `tsc --noEmit` clean; working tree carries only the two intended files. Deferred round-1 items (boundary-value case, bomb-lifetime) left as the reviewer agreed.

## Review Correlation

**Round-trip 1 (post-review):** Heimdall's round-1 findings, all addressed in `5f14aebd`. Every finding maps to an EXISTING lang-review check (dev missed it in the first draft) — none is a NEW_CHECK, so no checklist entry is added.

| # | Source | Finding | Classification | Checklist Check | Action |
|---|--------|---------|----------------|-----------------|--------|
| 1 | reviewer (test-analyzer) H1 | diff-against-control didn't verify the bank's OWN sprite | EXISTING_CHECK | #18 (apparatus fails by passing) / #26 | Fixed: index-subset assertion; swap mutation now red |
| 2 | reviewer (test-analyzer) H2 | global column bound under-protects narrow banks | EXISTING_CHECK | #29 (ordering vs magnitude) | Fixed: per-bank footprint bound; +5px mutation now red |
| 3 | reviewer (test-analyzer) H3 | only-first-of-N survived | EXISTING_CHECK | #18 (apparatus fails by passing) | Fixed: multi-member case; slice(0,1) mutation now red |
| 4 | reviewer (test-analyzer) M1 | off-window cull not independently discriminating | EXISTING_CHECK | #18 | Addressed: paired with H1 identity on the on-window case |
| 5 | reviewer (comment-analyzer) L1–L5 | wrong/shifted comment citations | EXISTING_CHECK | #17 (comments assert an unrun mechanism) | Fixed all: correct lines, or cite symbols not line numbers |

### Signal Summary (round-trip 1)
- **External findings: 0** · **CI findings: 0** · **Internal reviewer findings: 5 groups** (3 High, 1 Medium, 1 Low-batch), all EXISTING_CHECK, all fixed
- **New checks added: 0** (every finding was already covered by an existing lang-review check the first draft missed)

---

### Original correlation (first GREEN pass, pre-review)

First GREEN pass (pre-review). No review findings exist yet from any source: no internal Reviewer Assessment (the Reviewer runs next), no CI failures (no PR/run yet), no external reviewer comments (no PR yet). The only session entries are TEA's two forward-scope Delivery Findings, which are observations about adjacent behaviour deliberately left out of pt1-23, not defects in this diff.

| # | Source | Finding | Classification | Checklist Check | Action |
|---|--------|---------|----------------|-----------------|--------|
| 1 | TEA (delivery) | Scanner shows only landers, not the six banks | NOT_APPLICABLE | — | Out-of-scope forward note; follow-up story, not a language-pattern defect |
| 2 | TEA (delivery) | Enemy shots (`state.shots`) also undrawn in main view | NOT_APPLICABLE | — | Out-of-scope forward note; follow-up story, not a language-pattern defect |

### Signal Summary
- **External findings: 0** (no PR/external reviewer yet)
- **CI findings: 0** (no run yet)
- **Internal findings: 0 review findings** (2 TEA delivery notes, both NOT_APPLICABLE — scope observations, not defects)
- **New checks added: 0** (no NEW_CHECK findings)

lang-review/typescript self-audit on the changed `.ts` (scene.ts, pt1-23 test): clean — no `as any`/`as unknown`/`@ts-ignore`, `??` (not `||`) on the nullable bank arrays, every `projectWorldX` result null-checked, `blitBank`'s param is `readonly`, and the test's `KILLABLE` type-predicate carries a runtime `b.dead !== null` check.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- No design deviations. The implementation follows the derived ACs and TEA's GREEN guidance exactly: one `projectWorldX`-projected blit loop per bank in `core/scene.ts`, modelled on the lander loop (null-cull + `alive` guard), with bombs drawn by `lifetime`. No scope changes, no simplifications of the spec.
  - → ✓ ACCEPTED by Reviewer: agrees — the diff adds exactly the four derived ACs' behaviour and nothing else; scope held to the main-view blit (scanner/enemy-shots correctly left as TEA's non-blocking follow-ups).

### Reviewer (audit)
- No undocumented spec deviations found. The implementation matches the story's intended behaviour; the round-1 rejection is on **test rigor** (H1–H3: sprite-identity, per-bank projection tolerance, member-count all under-asserted) and **comment-citation accuracy** (L1–L5), not on any divergence from spec. The code does what the story asked; the tests just don't yet prove it does *only* that.