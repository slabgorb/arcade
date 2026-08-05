---
story_id: "bz5-1"
jira_key: "bz5-1"
epic: "bz5"
workflow: "tdd"
---
# Story bz5-1: The windshield crack is a HIT reaction, not a permanent decal — gate it on player-hit state

## Story Details
- **ID:** bz5-1
- **Jira Key:** bz5-1
- **Workflow:** tdd
- **Repos:** battlezone
- **Branch:** fix/bz5-1-hit-driven-windshield
- **PR:** none
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-05T19:15:10Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-05T18:32:51.434730+00:00 | 2026-08-05T18:38:48Z | 5m 56s |
| red | 2026-08-05T18:38:48Z | 2026-08-05T18:53:38Z | 14m 50s |
| green | 2026-08-05T18:53:38Z | 2026-08-05T19:02:39Z | 9m 1s |
| review | 2026-08-05T19:02:39Z | 2026-08-05T19:15:10Z | 12m 31s |
| finish | 2026-08-05T19:15:10Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

- **TEA (RED): the story's real ROM mechanism is the `CRACK` register — and the full ROM behaviour is a DEATH SEQUENCE, bigger than this visibility story.** The bounce.test.ts header already quotes it: `LDA I,2 / STA CRACK` sits right beside the `BOUNCE=0xFF` death write (BZONE.MAC:2335-2336). `CRACK: .BLKB 1 ;CRACKED WINDSHIELD COUNTER` (:256). The render gates the whole windshield on it (`LDA CRACK / BEQ 31$ / JMP WNSHLD`, :506-507). bz4-1 ported BOUNCE but deliberately skipped CRACK — that IS the "we're missing something." In the ROM, CRACK is set to 2 on death, INCREMENTS by 2 per game frame drawing progressively more crack sections (:697-698), and at the 16*2 boundary RESETS to 0 and REPOSITIONS/respawns the tank (:660-713) — during which the tank is FROZEN ("ALLOW ENDING SEQUENCE TO FINISH", :450). **The clone respawns INSTANTLY with no death sequence**, so a fully faithful port (tank freeze + progressive sections + reposition-on-reset) is more than this 2-pt story. bz5-1 is scoped to VISIBILITY only ("keep CRACK_PATHS as-is; only VISIBILITY changes"), so the RED pins the crack COUNTER's clean→cracked→clears window and leaves the tank-freeze / progressive-sections / exact-window-length to AC3's MAME cross-check and a possible bz5 follow-up. Flagged for the Reviewer and PM.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

- **Dev (GREEN): VISIBILITY-only port of the ROM death sequence (per story scope), full sequence deferred.** The ROM's `CRACK` sequence is more than a visibility gate: the tank is FROZEN while the crack spreads ("ALLOW ENDING SEQUENCE TO FINISH", BZONE.MAC:450), progressively MORE `CRACKS` sections are drawn as the counter climbs (:697-698), and the tank is REPOSITIONED on reset (:660-713). The story scopes to visibility only ("keep CRACK_PATHS as-is; only VISIBILITY changes"), so I shipped the counter + the overlay gate but NOT the tank-freeze, progressive sections, or reposition — the clone still respawns instantly and draws the full `CRACK_PATHS` for the whole window. **Why:** faithful to the story's scope and 2-pt size; the fuller sequence is a candidate bz5 follow-up. Documented in `docs/battlezone-1980-source-findings.md` §11 with the ROM citations and the MAME cross-check ruling.

## Sm Assessment

**Story:** bz5-1 (2pt, p1, tdd, battlezone) — the lead item of the freshly-filed bz5
epic. The cracked-glass windshield overlay draws unconditionally every frame
(`plugins/battlezone/src/main.ts:276`, `drawCrackedGlass(ctx, w, h)`), so the viewport
"starts cracked." On the cabinet it is a HIT reaction: the periscope shatters on player
death and clears on respawn. The trigger already exists in core — bz4-1 shipped
`BOUNCE=0xFF` on the player-death / windshield-crack path (BZONE.MAC:2337-2338). The
missing piece is the WIRING: a pure, observable "windshield cracked" flag off the
existing death/hit event in core, READ by the shell to gate `drawCrackedGlass`. The
crack geometry (`CRACK_PATHS`, render.ts:334-343) does not change — only its visibility.

**Setup verified on disk (not trusting the subagent):**
- Session fields present: Workflow tdd / Repos battlezone / Branch / PR none, phase
  pointer reads `setup`, single pointer occurrence.
- The three acceptance criteria are copied VERBATIM from `sprint/epic-bz5.yaml`
  (context lines 27-29 match the epic word-for-word); `context_touched: false`.
- Sibling probes before setup: no `bz5` branch on origin; siblings a-1/a-3 are on
  jt9-15 / sw8-30, not this story. Collision risk is nil — bz5 was authored this
  session.
- Claim landed: `main` @ 18e4dfb6 carries the in_progress stamp + context; empty
  branch `fix/bz5-1-hit-driven-windshield` pushed for the sibling probe.
- Reverted incidental ruamel churn in `sprint/epic-jt9.yaml` (a-1's story) rather than
  sweeping it into this commit.

**Guidance for Leeloo (TEA, RED):** The core-purity boundary is the whole point of this
story — the visibility flag MUST be computed in `src/core/` (events.ts / state.ts /
sim.ts) and only read in `src/shell/render.ts` + `main.ts`. AC1 wants a CORE-STATE test
(clean on fresh run and during un-hit play), not a screenshot. AC2 wants appear-on-hit
(the `BOUNCE=0xFF` death event) and clear-on-respawn, with the flag pure. AC3 asks the
appear/clear timing be cross-checked against MAME's player-death handling
(`/Users/slabgorb/Projects/mame/src/mame/atari/bzone.cpp`) with the ruling written to the
findings doc (`plugins/battlezone/docs/battlezone-1980-source-findings.md`). Watch the
core-purity sweep (`tests/core/core-purity-sweep.test.ts`) — it stays green.

**Routing:** phased tdd; next owner is TEA for the RED phase.

## Tea Assessment

**RED state: 11 failing tests across 2 new files; 1038 pre-existing pass untouched** (I
added only test files, changed no source). Verified by `npx vitest run --project
battlezone`: `11 failed | 1038 passed`, `2 failed | 72 passed` files.

**The contract I pinned.** The story's real ROM mechanism is the `CRACK` register
(BZONE.MAC:256), not a new invented flag — see the Delivery Finding. The observable seam
for Dev to implement is:

> `GameState.crack: number` — the ROM CRACK counter. `0` = clean windshield, non-zero =
> the shattered-glass overlay is drawn. Set to `2` on a player-death step (`LDA I,2 / STA
> CRACK`, :2335-2336); advanced on the 15.625 Hz **game frame** in `advanceRadar`
> (alongside `bounce >> 1`), NOT the ~60 Hz render sub-step; a bounded window that
> returns to 0. Computed in core; the shell reads `game.crack` only.

**Dev's GREEN checklist (what makes each test go green):**
1. Add `crack: number` to `GameState`; `initGame` sets `crack: 0`.
2. In `sim.ts` `stepBattle`, on the `playerHit` branch (BOTH the respawn and the
   game-over returns — every life lost, like `bounce: deathBounce`), set `crack: 2`.
3. In `advanceRadar`'s game-frame `while` loop, advance `crack` **only when non-zero**
   and reset it to 0 at the ROM's cap — the "stays 0 after clearing" assertion pins that
   it must not re-increment from 0. Mirror the `bounce` line right above it.
4. In `main.ts` `renderFrame`, replace the bare `drawCrackedGlass(ctx, w, h)` (:276) with
   `if (game.crack !== 0) drawCrackedGlass(ctx, w, h)`.
5. AC3 is a DOC deliverable: cross-check the appear/clear timing against MAME's
   player-death handling (`.../mame/src/mame/atari/bzone.cpp`) and record the ruling in
   `plugins/battlezone/docs/battlezone-1980-source-findings.md`. The exact window length
   (the ROM's 16*2 boundary) is where MAME rules; my window assertion is deliberately
   tolerant (`>=8` and `<=20` game frames) so a MAME-ruled exact count lands green.

**The discriminators (why a lazy impl fails):** a `bounce`-derived crack (e.g. gate on
`bounce !== 0`) fails TWO tests — the obstacle-RAM test (a real wall ram sets
`bounce=0x3F` but must NOT crack the glass), and the bounded-window test (`bounce` decays
0xFF→0x3F in ~2 frames, far short of the ≥8-frame visible window). The cadence test
forbids advancing on the sub-step (the C-001 trap). All staging assertions
(death→lives 2 & origin respawn; ram→`motionBlockedLatch` & `bounce=0x3F`) pass on
arrival, so the RED is the missing `crack`, not broken fixtures.

**Files:** `tests/core/windshield-crack.test.ts` (9 tests — clean/appears/discriminator/
cadence/clears/determinism), `tests/shell/windshield-crack-gate.test.ts` (2 tests — shell
reads `game.crack`, and `drawCrackedGlass` is guarded by an `if` testing crack).

### Rule Coverage (lang-review/typescript.md)
- **#8 (meaningful assertions):** self-checked; tightened the one vacuous-on-arrival test
  (determinism `undefined===undefined`) to also anchor `crack === 2`, so all 11 are
  genuinely RED.
- **#15/#16 (source-text assertions match the CLAIM, not a token):** the shell test does
  NOT match on a bare `crack` token — the existing `// bz1-12: the cracked-glass
  windshield overlay` comment contains "crack" yet the regex requires a structural
  `if (…crack…) … drawCrackedGlass(` guard, so it is genuinely RED now and only greens on
  a real guard. The `game.crack` read is pinned separately (runtime read, not comment).
- **Core purity (project rule):** the flag is required to live in `src/core/` and be read
  in the shell; `tests/core/core-purity-sweep.test.ts` stays green and the shell test
  pins the `game.crack` READ. No new DOM/time/random in core.
- **Determinism:** explicit identical-in/identical-out test on the crack value.

**Handoff:** Korben Dallas (Dev) for GREEN — implement the 5-step checklist above; the
suite goes green when `crack` exists, is set on death, advances on the game frame, clears,
and the shell gates the overlay on it.
## Dev Assessment

**GREEN: 1049/1049 battlezone tests pass, `tsc --noEmit` clean.** Implemented Leeloo's
5-step checklist exactly — the simplest faithful port of the ROM `CRACK` register.

**What changed (4 source edits + citation upkeep):**
1. `src/core/state.ts` — added `readonly crack: number` to `GameState`; `initGame` sets
   `crack: 0`. (The ROM CRACK counter, :256.)
2. `src/core/sim.ts` — module consts `CRACK_ON_DEATH = 2` / `CRACK_RESET = 16 * 2`; set
   `crack: CRACK_ON_DEATH` on BOTH death returns in `stepBattle` (respawn + game-over —
   every life lost, beside `bounce: deathBounce`); in `advanceRadar`'s game-frame loop,
   `crack = crack !== 0 && crack + 2 < CRACK_RESET ? crack + 2 : 0` (advance +2/frame,
   reset at 32, guarded so a clean windshield never spontaneously cracks).
3. `src/main.ts` — the bare `drawCrackedGlass(ctx, w, h)` became
   `if (game.crack !== 0) drawCrackedGlass(ctx, w, h)`.
4. `docs/battlezone-1980-source-findings.md` §11 — the AC3 deliverable: the CRACK
   lifecycle, the MAME cross-check ruling (MAME runs the same ROM; its clock times the
   ~1 s window; exact NMI-rate reconcile → bz5-3), and the deferred death-sequence
   deviation. ToC + provenance updated.

**Citation upkeep (NOT a behaviour change):** the inserts shifted line numbers that
committed audit findings cite. `tools/audit/reanchor-citations.mjs --write` re-anchored 10
citations — `0 lost` (every edit was a pure INSERT above cited lines, so no verbatim text
changed; the JSON diffs are `"line":` only). The `tests/audit/citations.test.ts` gate is
green.

**Scope note for the Reviewer (Zorg):** this is VISIBILITY only, per the story's explicit
scope ("keep CRACK_PATHS as-is; only VISIBILITY changes"). The ROM's fuller death sequence
(tank freeze, progressive crack sections, reposition-on-reset) is documented as a bz5
follow-up in findings §11 and the Design Deviation above — not a gap in this story. The
exact crack-window frame count is deliberately loose in the test (`>=8`, `<=20` game
frames) because AC3 defers the precise timing to the bz5-3 MAME timebase reconcile.

**Handoff:** Jean-Baptiste Emanuel Zorg (Reviewer) for the review phase.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 | confirmed 1 (HIGH, remediated) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — edges Reviewer-assessed |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no error paths in diff |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — TEST covered by Reviewer + rule-checker #8/#18/#26 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — DOC caught by rule-checker #17 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — TYPE covered by rule-checker #1/#2 |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — SIMPLE Reviewer-assessed (minimal impl) |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (LOW, remediated) |

**All received:** Yes (3 enabled returned; 6 disabled via settings)
**Total findings:** 2 confirmed (both remediated by Reviewer, re-verified green), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

I hate bugs — and I found two. Both are now dead. The code as it stands has no outstanding
Critical or High. Two confirmed findings, both remediated by me and re-verified, no subtlety
lost:

**Findings (both CONFIRMED, both REMEDIATED):**

| Severity | Issue | Location | Resolution |
|----------|-------|----------|------------|
| HIGH | [PREFLIGHT] epic + context routed to repos `battlezone`, unregistered post-collapse (only `arcade` is) — broke the orchestrator suite (`tests/sprint-repo-routing.test.mjs`) / `just ci` | sprint/epic-bz5.yaml:21/44/77/109/141, context docs | Fixed battlezone→arcade (5 fields + 2 context lines); orchestrator now exit 0. Verified myself before acting (ran the suite, compared to td1/sw8/jt9 which all use `arcade`). Commit 95a0f6e7. |
| LOW | [RULE] [DOC] the quote `LDA CRACK / BEQ 31$ / JMP WNSHLD` cited `:506-507` but spans `:506-508` (JMP WNSHLD is :508) | state.ts:151, main.ts:275, both test headers, findings §11 | Verified against the vendored BZONE.MAC (`sed -n '505,510p'`: 506/507/508), fixed all 5 blast-radius sites in place. Commit 95a0f6e7. |

**Observations (dispatch tags, plain text for the gate):**

1. [SEC] Security specialist returned CLEAN and I concur — `crack` is a bounded pure integer, no external input, no string reaches `drawCrackedGlass`, no injection/XSS/secret surface. Evidence: main.ts renderFrame passes only `ctx, w, h`.
2. [RULE] Rule-checker (30 rules / 47 instances) found only the citation off-by-one; everything else compliant. Confirmed and remediated.
3. [TEST] (no specialist — disabled; Reviewer + rule-checker #8 assessed) The two test files have NO vacuous assertions. The determinism test is anchored to the real value 2 (not `undefined===undefined`). The shell-gate regex is mutation-tested: reverting main.ts to the bare unconditional call reddens both assertions, and the pre-existing `// cracked-glass` comment does NOT satisfy the `if(...crack...)...drawCrackedGlass(` guard (crack must be inside the `if` parens). Evidence: windshield-crack.test.ts:198-205, windshield-crack-gate.test.ts:31-45.
4. [VERIFIED] Two-branch death coverage — `crack: CRACK_ON_DEATH` is set at BOTH `playerHit` returns (game-over sim.ts:246 and respawn sim.ts:289), the exact two sites that set the sibling `bounce: deathBounce`. There is exactly one `playerHit` block; no third death path exists. No branch leaks a cracked→uncracked hole.
5. [VERIFIED] Core purity + determinism — `crack` lives in `src/core/` (state.ts/sim.ts), computed there, and main.ts:275 only READS `game.crack`. No DOM/time/random introduced; `tests/core/core-purity-sweep.test.ts` stays green (1049/1049). Advanced on the 15.625 Hz game frame in advanceRadar beside `bounce >> 1`, not the ~60 Hz sub-step — the cadence test pins this.
6. [VERIFIED] Bounded, no unbounded growth — `crack !== 0 && crack + 2 < CRACK_RESET ? crack + 2 : 0` (sim.ts:361) short-circuits at 0 (clean never self-cracks) and resets at 32; the sequence is 2,4,…,30,0. No overflow, no NaN, no negative. Evidence: the BOUNDED-window test measures firstZero=15, in [8,20].
7. [EDGE] (no specialist — Reviewer-assessed) `crack` is frozen at 2 during `gameover`/`entry` modes (advanceRadar isn't called there), so the overlay draws behind those screens until attract resets it to 0. This is within the documented VISIBILITY-only deviation; the ROM actually holds "GAME OVER" until the crack clears — a mild, disclosed divergence, not a defect. LOW, non-blocking.
8. [SILENT] (no specialist) No swallowed errors / silent fallbacks — the change has no try/catch, no error paths; a hostile re-hit mid-window correctly resets crack to 2 (not a silent drop).
9. [SIMPLE] (no specialist) Minimal implementation — two consts, two field writes mirroring `bounce`, one advanceRadar line, one shell guard. No over-engineering, no dead code.
10. [TYPE] (no specialist — rule-checker #1/#2) `readonly crack: number` on an already-readonly interface; no stringly-typed API, no cast, no non-null assertion.

**Data flow traced:** player death (`enemyStep.playerHit`, sim.ts:219) → `crack: 2` on the returned GameState → advanceRadar decays it per game frame → main.ts:275 reads `game.crack` → gates the canvas overlay. Safe: pure integer, bounded, read-only in the shell.

### Rule Compliance (lang-review/typescript.md + CLAUDE.md)
- **#1 type-safety escapes:** none — plain `number`, no `as any`/`!`/`@ts-ignore`. Compliant across all 5 crack sites.
- **#8 test quality:** no vacuous assertions; determinism anchored to a real value; discriminator (ram vs death) genuine. Compliant.
- **#14 derived-edge-in-one-branch:** the death transition is set at BOTH death returns, not one. Compliant.
- **#15/#25 source-text guards:** the shell regex matches the CLAIM (`if(...crack...)...drawCrackedGlass(`), mutation-tested, and `game.crack`/`drawCrackedGlass(` each appear once in main.ts so the whole-file scope can't false-anchor. Compliant.
- **#17/#24 citations nobody re-ran:** ONE violation — the `:506-507`/`:506-508` span. Remediated. All other ROM/MAME citations (`:2335-2336`, `:697-698`, `:656/:660-661`, `bzone.cpp:611/613`, `bzone.h:20-21`) verified byte-exact.
- **CLAUDE.md core/shell purity + determinism:** compliant (see observations 5/6).

### Devil's Advocate

Let me argue this is broken. First: the "clears on respawn" claim is a lie — the clone respawns the tank INSTANTLY on the death step, then plays the crack overlay for ~1 second while the player is already driving a fresh tank. A confused player sees a shattered windshield over a perfectly-alive tank they're steering. Is that not a bug? Second: on the final life, `crack=2` is frozen through the entire 3-second game-over screen AND the initials-entry screen, so "GAME OVER" and the name prompt render behind a cracked windshield that never advances or clears until attract — the ROM explicitly waits for CRACK==0 before showing GAME OVER, so we've inverted the sequence. Third: what if `dt` is Infinity? `advanceRadar`'s `while (clock >= RADAR_FRAME_SECONDS)` would spin forever — and now my crack line rides that loop. Fourth: the window is 15 game frames, but the ROM's 16*2 boundary might be 16 frames — an off-by-one in a fidelity clone. Fifth: a second enemy hit mid-window resets crack to 2, so a player repeatedly hit could see the windshield "stuck" cracked far longer than one death sequence.

Rebuttals, with evidence: (1)/(2) are the SAME thing — the VISIBILITY-only scope the story explicitly mandates ("keep CRACK_PATHS as-is; only VISIBILITY changes"), documented in Design Deviations and findings §11 as a bz5 follow-up (tank-freeze + reposition + progressive sections). They are disclosed deviations, not silent bugs; the atmospheric result (you died → windshield cracked → game over) is acceptable and honestly recorded. (3) is PRE-EXISTING: `advanceRadar` never guarded `dt`, and `bounce`/`frameCount` already ride the same loop; the shell feeds fixed 1/60 dt, and my line adds no new hazard — out of this story's scope. (4) is deliberately deferred to AC3/bz5-3 (the MAME timebase reconcile), and the test bound [8,20] tolerates it — no false precision shipped. (5) is CORRECT behavior — repeated deaths SHOULD re-crack; the counter resetting to 2 on each hit is exactly the ROM's `LDA I,2 / STA CRACK` firing per death. None of these survive as blockers. The code has subtlety.

**Handoff:** To Ruby Rhod (SM) for finish-story.

<!-- deviation-audit-marker -->
### Reviewer (audit)
- **Dev (GREEN): VISIBILITY-only port of the ROM death sequence** → ✓ ACCEPTED by Reviewer: sound and within the story's explicit scope ("only VISIBILITY changes"). The full sequence (tank freeze, progressive sections, reposition-on-reset) is honestly documented in findings §11 as a bz5 follow-up. The gameover/entry frozen-crack consequence (observation 7) is a mild, disclosed divergence, not a defect.

<!-- reviewer-findings-marker -->
### Reviewer (code review)
- **Gap** (non-blocking): the ROM's full windshield death SEQUENCE (tank freeze during "ALLOW ENDING SEQUENCE TO FINISH" BZONE.MAC:450, progressive CRACKS sections, reposition-on-reset :660-713, and holding GAME OVER until CRACK==0 :582) is not ported — bz5-1 is VISIBILITY-only. Affects `plugins/battlezone/src/core/sim.ts` + `src/main.ts` (a future story ports the freeze/sequence). *Found by Reviewer during code review; already flagged by TEA/Dev and documented in findings §11.*