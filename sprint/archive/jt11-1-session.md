---
story_id: "jt11-1"
jira_key: "jt11-1"
epic: "jt11"
workflow: "tdd"
---
# Story jt11-1: Start experience: thread playerCount from createGame (game.ts:318, currently dropped) into createWaveDemo (demo.ts:1229-1236, hardcodes PLAYER1_ID+PLAYER2_ID) so a 1P game spawns ONE knight

## Story Details
- **ID:** jt11-1
- **Jira Key:** jt11-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/jt11-1-start-experience-player-count
- **PR:** https://github.com/slabgorb/arcade/pull/269
- **Branch Strategy:** gitflow

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-12T10:50:16Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-12T10:11:00Z | 2026-08-12T10:15:59Z | 4m 59s |
| red | 2026-08-12T10:15:59Z | 2026-08-12T10:24:27Z | 8m 28s |
| green | 2026-08-12T10:24:27Z | 2026-08-12T10:33:37Z | 9m 10s |
| review | 2026-08-12T10:33:37Z | 2026-08-12T10:45:18Z | 11m 41s |
| green | 2026-08-12T10:45:18Z | 2026-08-12T10:49:35Z | 4m 17s |
| review | 2026-08-12T10:49:35Z | 2026-08-12T10:50:16Z | 41s |
| finish | 2026-08-12T10:50:16Z | - | - |

## Sm Assessment

**Setup complete.** Story jt11-1 claimed, branch `feat/jt11-1-start-experience-player-count` cut from develop and pushed (empty claim push — sibling probe lit). Context enriched with the Architect's 2026-08-12 root-cause citations (context-story-jt11-1.md) — the seam is `game.ts:318` dropping `count` before `createWaveDemo` (demo.ts:1229-1236 hardcodes both mounts), plus the attract-page start prompt gap (main.ts:500-503, selectScreen.ts:20-22). Sibling checkouts a-2 (ml1-1) and a-3 (sw11-3) own unrelated stories; no jt11 branch or session exists elsewhere. Epic jt11 filed this session (7 stories) and indexed in current-sprint.yaml — the index line was initially lost when the branch cut from refreshed develop and was restored before commit 61888068.

**Scope notes for TEA (red):** two ACs — (1) core: `createGame(seed, 1)` yields a sim with exactly ONE player mount and a working 5-life respawn cycle; `createGame(seed, 2)` unchanged; boot/attract self-play keeps two mounts (count enters only via select → startPlaying, cabinet.ts:99-101). (2) shell: attract page renders a visible PRESS 1 OR 2 TO START prompt via the existing layoutText/paintText idiom. Lives-per-ledger (NSHIP=5) is already correct — do not retune it.

## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `plugins/joust/tests/start-experience.test.ts` — the jt11-1 suite: AC-1 (player count reaches the sim) + AC-2 (attract start prompt)

**Tests Written:** 11 tests covering 2 ACs — 6 RED on the missing seams, 5 green regression pins (documented below)
**Status:** RED (6 failing — ready for Dev). Full joust project: 6 failed / 3392 passed; `npm run lint` clean.

**RED failures (the contract Dev implements):**
1. `createWaveDemo(SEED, 1)` → player ids `[1]` by identity (no orphan P2 mount)
2. `createGame(SEED, 1)` threads the count — one ledger, NSHIP=5, sim holds only P1
3. no P2 mount across 240 stepped frames of a 1P game (pins the ledger-driven respawn side)
4. `attractScreen` exports `START_PROMPT` matching /PRESS 1 OR 2/
5. `layoutStartPrompt(colour)` lays EVERY non-space char (catches a digits-less font silently skipping '1'/'2') with colour threaded
6. main.ts imports `layoutStartPrompt` from `./shell/attractScreen.js` and calls it from live (comment-stripped) code

**Green-in-RED regression pins (intentional):** 2P keeps `[1,2]`; bare default keeps two knights (boot/attract compat); enemy complement (3 bounders) count-independent; `createGame(SEED,1).sim` toEqual `createWaveDemo(SEED,1)` (no-parallel-sim pin — green while both sides ignore the count, bites on divergence); 2P game ledger count survives stepping.

**Contract edits:** `tests/helpers/demo-contract.ts` — `createWaveDemo(seed, playerCount?)`. README census 171→172 (the derived test-file guard in audio-seam-scope).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| identity over count (regenerated-instance trap) | player ids asserted `toEqual([1])`/`toEqual([1,2])`, not `.length` | failing/pinned |
| wiring greps must not match comments | `mainCode()` strips line comments before the wiring assertion | failing |
| silent-degrade surfaces (font glyph skip) | ops.length === non-space char count | failing |
| collection trap | all module loads inside `it()` | n/a (structure) |
| jt9-30 comment-line-refs | zero `<file>.ts:<line>` comment refs in the new file (guard green) | green |
| test-file census | README 172 matches the derived count (guard green) | green |

**Self-check:** no vacuous assertions; every test names the mutant it kills.

**Deliberately NOT pinned by a node test** (Reviewer + human smoke): which attract page paints the prompt, its screen position/colour cadence, and numpad-vs-toprow key discoverability (an input-mapping concern, out of this story's shell scope).

**Handoff:** To Dev for implementation.

## Dev Assessment

**Implementation Complete:** Yes
**Commits:** f12a24cb (RED, TEA), 6628840a (GREEN)

**AC coverage:**
- **AC-1 (player count reaches the sim): DONE.** `createWaveDemo(seed, playerCount = 2)` builds the two spawn-constant mounts and `.slice(0, playerCount)` — P1-first order preserved, default 2 keeps the boot/attract co-op demo and the existing `game.test.ts` toEqual pin. `createGame` passes its `playerCount` through. Enemy complement untouched. Downstream (NSHIP lives, death clamp, ledger-driven respawn) needed no change, exactly as the context predicted.
- **AC-2 (attract start prompt): DONE.** `attractScreen.ts` exports `START_PROMPT = 'PRESS 1 OR 2 TO START'` (a presentation string — documented as NOT a ROM transcription) and `layoutStartPrompt(colour)` in FONT57 (carries digits and the LSPC space glyph, MESSAGE.SRC:444). `renderAttract` paints it centred at `ATTRACT_PROMPT_Y = 228` on EVERY attract page — demo page included — in the banner colour-cycle.

**Test edit (evidence-backed):** one TEA assertion expected `ops.length === non-space length (16)`; measured behavior is one op per character (21) because FONT57 has a real space glyph and `layoutText` only skips characters with NO glyph. Corrected expected value to `prompt.length`; the missing-digit mutant still fails it (a skipped '1' yields 20). Logged under Design Deviations.

**In-browser verification** (this tree served on :5290; port 5270 was held by a foreign-cwd process): attract demo page shows the prompt; hold-press 1, then 1 → one-knight game, HUD `P1 … MEN 5` only; hold-press 2, then 2 → both ledgers and both mounts, unchanged. Playwright zero-hold `press` can land between rAF frames and miss the held-keys read — a ~120ms hold registers reliably (human presses are longer; not a game defect).

**Suite:** joust 3398/3398, orchestrator 478/478, `npm run lint` clean.

### Rework round 1 (commits 9f64544a, 01d2799e)

All 7 Reviewer findings addressed: (1) redundant casts committed away; (2-4) `createWaveDemo`/`createGame`/demo-contract JSDoc now document `playerCount`; (5) main.ts prompt-Y comment states the measured truth (island y 211-243; prompt legible by paint order — first application of this fix was wiped by the mutant-probe's `git checkout` restore and re-applied in 01d2799e); (6) new wiring test pins renderAttract's no-early-return fall-through — the round-1 surviving mutant re-run and KILLED; (7) the 240-frame test comment now claims only quiescent stepping. Suite 3399/3399, lint clean.

## Subagent Results

| Subagent | Received | Status | Findings | Decision |
|----------|----------|--------|----------|----------|
| reviewer-preflight | Yes | clean | none (3398/3398 joust, 478/478 orchestrator, lint clean, no smells) | N/A |
| reviewer-edge-hunter | Skipped / disabled (workflow.reviewer_subagents.edge_hunter=false) | — | — | covered by Reviewer mutation battery |
| reviewer-silent-failure-hunter | Skipped / disabled | — | — | covered by Reviewer mutation battery |
| reviewer-test-analyzer | Yes | findings | 3 (respawn overclaim HIGH; wiring gameable HIGH; playerCount boundary MED) | 2 CONFIRMED → rework; 1 DISMISSED w/ rationale |
| reviewer-comment-analyzer | Yes | findings | 3 (island y-range comment HIGH; demo.ts docstring HIGH; demo-contract docstring HIGH) | all 3 CONFIRMED → rework |
| reviewer-type-design | Skipped / disabled | — | — | rule-checker #1/#2 covered type surface |
| reviewer-security | Skipped / disabled | — | — | no input/storage surface in diff |
| reviewer-rule-checker | Yes | findings | 7 (4× redundant `as unknown as` cast; 3× stale JSDoc rule #17) | casts already fixed in tree (uncommitted); 3 JSDoc CONFIRMED → rework |

All received: Yes

**Reviewer mutation battery** (compensating for disabled specialists; sequential, tree restored and verified after each):

| # | Mutant (producer, restrictive direction) | Result |
|---|------------------------------------------|--------|
| 1 | demo.ts `.slice(0, playerCount)` → `.slice(0, 2)` (the original bug) | KILLED (3 tests) |
| 2 | demo.ts → `.slice(0, 1)` (always one) | KILLED (4 tests incl. game.test.ts pin) |
| 3 | game.ts drops the count (pre-fix regression) | KILLED (3 tests) |
| 4 | attractScreen START_PROMPT → 'PRESS START' | KILLED (1 test) |
| 5 | main.ts prompt paint removed | KILLED (1 test) |
| 6 (test-analyzer's) | main.ts early-return on demo page before prompt | **SURVIVED** — wiring test passes; the story's central page has no behavioral pin |

## Rule Compliance

- **#1 type-safety escapes:** 4 violations (redundant `as unknown as DemoState`, start-experience.test.ts) — already removed in working tree, `tsc --noEmit` clean; MUST be committed. `layout!(colour)` non-null OK (preceded by runtime typeof assertion).
- **#17 comments asserting unverified mechanisms:** 3 violations CONFIRMED — `createWaveDemo` JSDoc (demo.ts) still unconditional "P1/P2"; `createGame` JSDoc (game.ts) still says `createWaveDemo(seed)`; demo-contract.ts contract doc still "the 2P contract". Plus the main.ts `ATTRACT_PROMPT_Y` comment: **"clear of the island (y 211-223)" is factually wrong** — the decoded COMCL5 island is 33 rows (y 211-243, measured by comment-analyzer; visually confirmed by the green-phase screenshot). The prompt is legible because it paints AFTER the sim, not because it clears the island.
- **#5/#30 ESM .js extensions, #4 ??-vs-||, #7 async, #15/#25 source-text guard hygiene, #19 filter-field, #20 measured README census (172 verified by run), #21 degenerate numeric input (production domain typed 1|2), #27 core purity, #28 shell boundary, #29 ROM citations (MESSEQU.SRC:48-49, MESSAGE.SRC:37, MESSAGE.SRC:444 all verified):** compliant.

**Challenged:** rule-checker marked the main.ts y-range comment compliant by *deriving* 211+13-1=223 from render.ts's CLIF5 sub-record claim. Comment-analyzer *measured* the actual `expandComcl5(COMCL5.bytes)` decode: height 33, all rows populated → 211-243. Empirical measurement + the screenshot override the derivation; the 13-row figure describes a sub-record, not the painted island. Finding stands.

### Devil's Advocate

Suppose this ships as-is. A player on a numpad-only keyboard reads "PRESS 1 OR 2 TO START", presses numpad 1, and nothing happens — the prompt now actively *asserts* a falsehood for that hardware, which is worse than silence; the finding is filed but the prompt text was chosen without it. A future Dev, trusting the main.ts comment that y 228 is "clear of the island," moves the prompt paint BEFORE `paintSim` while refactoring renderAttract — the island's real 211-243 rows now overpaint the prompt entirely, the wiring test stays green (import + one call site still present), the file-census and comment guards stay green, and the cabinet regresses to exactly the stuck-in-demo state this story exists to fix — silently. That is not hypothetical: the test-analyzer already built that mutant (early return on the demo page) and the suite approved it. The 240-frame test is similarly trusted beyond its strength: its comment says it pins respawn, so a later story that breaks 1P respawn-reconciliation will point at this green test as proof of safety while the branch it names was never executed (zero deaths in 240 idle frames, measured). The stale `createWaveDemo` docs are the same trap at the API boundary: demo-contract.ts still tells every future test author "P1 and P2 both live" — the next person extending the demo contract will code against the 2P shape and be surprised by a 1P sim. And `createGame(SEED, 0)`: `every()` on an empty ledger array is vacuously true, so `gover` trips instantly — unreachable from today's shell, but one refactor of selectPlayerCount away from a boot loop. Each is small; together they are how a green board rots.

## Reviewer Assessment

**Verdict: APPROVED — round 2**

All seven round-1 findings verified fixed in commits 9f64544a + 01d2799e (diff inspected against 6628840a):

1. Redundant `as unknown as DemoState` casts removed and committed; `tsc --noEmit` clean. [RULE]
2. `createWaveDemo` JSDoc documents `playerCount` (default 2, 1P spawns P1 alone). [RULE] [DOC]
3. `createGame` JSDoc now reads `createWaveDemo(seed, playerCount)` — matches the call. [RULE]
4. demo-contract.ts doc: "the first `playerCount` mounts (default 2) … passing 1 spawns P1 alone". [RULE] [DOC]
5. main.ts prompt-Y comment states the measured truth (island y 211-243; legibility is paint-order) and warns against reordering the paint. [DOC]
6. New wiring test pins renderAttract's no-early-return fall-through; the round-1 surviving mutant (pre-fix early-return shape) was re-run by Dev and KILLED, restore verified. [TEST]
7. The 240-frame test comment now claims exactly what it proves (quiescent stepping; respawn branch not exercised — measured). [TEST]

Suite 3399/3399, orchestrator 478/478, lint clean. Mutation record: 6/6 mutants killed across both rounds (5 Reviewer + 1 test-analyzer survivor now dead). Dismissals and routed findings from round 1 stand as recorded below.

**Approved for merge.**

### Round 1 verdict (REJECTED — superseded by the approval above)

**Rework round 1 (tight, all mechanical; core fix itself was sound)**

The player-count seam and prompt implementation are correct (5/5 Reviewer mutants killed, browser-verified 1P/2P flows, purity and citations clean). Rework is required on documentation truth and one test's strength — rule #17 findings cannot be dismissed.

**Required fixes (Dev):**
1. Commit the uncommitted cast cleanup in start-experience.test.ts (rule #1; already verified tsc-clean). [RULE]
2. demo.ts `createWaveDemo` JSDoc: document `playerCount` (default 2, slice behavior). [RULE] [DOC]
3. game.ts `createGame` JSDoc: `createWaveDemo(seed)` → reflect the counted call. [RULE]
4. demo-contract.ts `createWaveDemo` doc: "P1 and P2 both live — the 2P contract" → note playerCount, 1P spawns P1 alone. [RULE] [DOC]
5. main.ts `ATTRACT_PROMPT_Y` comment: replace the false "clear of the island (y 211-223)" with the truth — island spans y 211-243 (measured); the prompt overlays it and is legible because it paints after the sim. [DOC]
6. Strengthen the wiring test so the test-analyzer's surviving mutant dies: pin renderAttract's structure (the function body must contain no `return` before the prompt paint — e.g. extract the renderAttract body and assert it contains no return statement, restoring the killed early-return shape reddens). [TEST]
7. Correct the 240-frame test's comment: it proves idle stepping never fabricates a P2 id; it does NOT exercise the respawn branch (zero deaths measured in 240 idle frames). Claim what it proves. [TEST]

**Dismissed with rationale:** playerCount boundary values (0/negative/3) — the only production caller is typed `1 | 2 | null` (select.ts) and rule #21 judged no new blast radius; noted in Devil's Advocate, not blocking. [TEST] (severity downgraded)

**Non-blocking, routed:** numpad/click start (TEA's Delivery Finding) — to be filed as a jt11 backlog story at finish; SM owns the filing.

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement (non-blocking):** numpad 1/2 do not start a game (bindings are `Digit1`/`Digit2` key codes). The prompt AC makes the top-row keys discoverable, but accepting `Numpad1`/`Numpad2` (and/or a click/tap start for the lobby-browser context) would remove the trap entirely. If descoped from Dev's green, file it as a jt11 backlog story rather than letting it die here.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- No deviations from spec. (One presentation choice made explicit: `START_PROMPT` is 'PRESS 1 OR 2 TO START' — a browser-cabinet presentation string, NOT a ROM transcription; the 1982 cabinet had physical start buttons, so no MESSAGE.SRC string exists for this. The suite pins the key-naming substring /PRESS 1 OR 2/, leaving exact phrasing to Dev.)

### Dev (implementation)
- **What changed:** TEA's `layoutStartPrompt` test expected one glyph op per NON-SPACE character (16 for the 21-char prompt).
- **Spec source:** `plugins/joust/tests/start-experience.test.ts` (RED commit f12a24cb), assertion "one glyph op per non-space character".
- **Spec text:** "expect(laid.ops.length, 'one glyph op per non-space character').toBe(prompt.replace(/ /g, '').length)"
- **Implementation:** assertion corrected to `toBe(prompt.length)` (21) with the reason in the test comment.
- **Why:** measured, not assumed — `layoutText` (fontRender.ts) emits an op for every character that HAS a glyph and FONT57 carries the ROM's LSPC space glyph (MESSAGE.SRC:444), so spaces produce ops. The test's intent (a digits-less font silently skipping '1'/'2' must redden) is preserved and strengthened: any missing glyph now lowers the count below 21.
- **Forward impact:** none on sibling stories; the corrected assertion is the durable contract for any future FONT57 prompt test.