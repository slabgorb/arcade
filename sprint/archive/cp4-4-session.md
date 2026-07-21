---
story_id: "cp4-4"
jira_key: "cp4-4"
epic: "cp4"
workflow: "tdd"
---
# Story cp4-4: Bonus lives — score-threshold crossing, BONUSV increment, the 6-life cap

## Story Details
- **ID:** cp4-4
- **Jira Key:** cp4-4
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-21T19:38:25Z
**Branch Strategy:** gitflow (feat/cp4-4-bonus-lives)

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-21T19:01:50Z | 2026-07-21T19:04:18Z | 2m 28s |
| red | 2026-07-21T19:04:18Z | 2026-07-21T19:21:30Z | 17m 12s |
| green | 2026-07-21T19:21:30Z | 2026-07-21T19:31:14Z | 9m 44s |
| review | 2026-07-21T19:31:14Z | 2026-07-21T19:38:25Z | 7m 11s |
| finish | 2026-07-21T19:38:25Z | - | - |

## SM Assessment

**Story:** cp4-4 — Bonus lives (3pt, p2, `centipede`, workflow `tdd`). The score's missing
CONSUMER: threshold crossing → next-threshold advance → life award, capped at six.

**Setup verification:**
- Session file created; context at `sprint/context/context-story-cp4-4.md` (`pf validate
  context-story cp4-4` exits 0). No pre-existing context file, so no clobber risk.
- Branch `feat/cp4-4-bonus-lives` cut from a freshly fetched `origin/develop` @ `e4f9016`
  (centipede is **gitflow** — PRs target `develop`, never `main`).
- Race check clean: `git log --all --grep=cp4-4` empty, no open PRs on `slabgorb/centipede`,
  local develop in sync with origin. No sibling checkout is working this story.
- Jira not enabled for this project (local `sprint/` YAML only) — claim step correctly skipped.

**Routing rationale:** `tdd` is a phased workflow → RED first. O'Brien (TEA) owns the failing
tests. This is a transcription story against a live citation gate, so the ROM quarry belongs in
the tests before any implementation exists.

**Scope fences carried into RED (from the epic + story description):**
- In scope: :1968-1974 compare, :1975-1981 decimal-mode increment add, :1989-1991 six-life cap,
  :1993 award. Increment hardcoded to `BONUSV[0]` = 10,000 and parameterized (epic DIP ruling).
- Out of scope, note don't stub: CHAN4 bonus-life sound → cp5; OPTSW2 timed-play branch
  (:1982-1988) → transcribe the default (award proceeds) and note the branch.
- **Do not conflate:** :1958-1966 (COUNT3 -= 2 new-head frequency bump at 60,000) is a
  DIFFERENT routine. File it rather than fold it into the award.
- Watch the SED/CLD boundary: scores are packed BCD (`src/core/score.ts`); threshold arithmetic
  runs in decimal mode. Every transcribed constant needs a radix-cited comment + claims entry
  (CENTI4.MAC inherits `.RADIX 16`), citing the **vendored** tree only.
- `docs/.../open-questions.md` records the un-modelled DIP options.

**Handoff:** → O'Brien (TEA), phase `red`.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): AC-2's "lives never exceed 6" is off by one in clone units. The ROM's `:1990 CMP I,6` tests **LIVES**, which counts SPARE lives — `:851 "STX LIVES ;NUMBER OF LIVES-1 (WE ARE PLAYING WITH ONE)"` (claim LOOP-4), and `DLIVES` draws exactly `LIVES` icons (`:922-923`, `:931`). The clone's `SimState.lives` counts the gun in play as well (boots at 3, game-over at 0 — three plays, the same three the ROM's `LIVES=2` gives), so `SimState.lives === ROM LIVES + 1` and the faithful ceiling is **7**, not 6. Affects `sprint/epic-cp4.yaml` (cp4-4 AC-2 wording) — the suite pins `ROM_LIVES_MAX = 6` (the ROM literal) and derives `LIVES_CEILING = 7`. *Found by TEA during test design.*
- **Correction** (non-blocking): the story description calls `:1958-1966` "a 60,000-point spawn-rate bump" — it is not. `:1959 "BCC 15$ ;IF NOT ON 10K BOUNDARY"` tests the carry out of SCORE1 (hundreds+thousands), so `COUNT3 -= 2 ";INCREASE FREQUENCY OF NEW HEADS"` fires on **every 10,000 points**, and `:1963-1966 SCORE2 += 1` is that carry being propagated by hand. The 60,000 figure belongs to a different dial — ANTPC's `CMP I,6` flea descent (already noted in `src/core/score.ts`). Affects `sprint/epic-cp4.yaml` (the cp4-4 description). *Found by TEA during test design.*
- **Gap** (non-blocking): `:1958-1962`'s COUNT3 ramp is NOT modelled and is deliberately out of this suite (the story says "otherwise file it"). The clone's `count3` only ramps inside `stepNewhd` (CT-87); nothing ties new-head frequency to the score. Affects `src/core/sim.ts` / `src/core/centipede.ts` — a cp5 candidate, and a real difficulty dial the clone is missing. *Found by TEA during test design.*
- **Gap** (non-blocking): SCORNG's attract guard (`:1948-1949 "LDY MODE / BMI 30$ ;IF IN ATTRACT"`) means the ROM awards no score — and therefore no bonus life — in attract. Unreachable today (`stepSim` holds without stepping in `attract`), so it is untestable and untested here; but cp4-7's self-playing ATTRT demo WILL step the sim, and must gate scoring on `phase`. Affects `src/core/sim.ts` when cp4-7 lands. *Found by TEA during test design.*
- **Gap** (non-blocking): the HUD draws one gun icon too many. `src/shell/render.ts:234` uses `Math.min(state.lives, 6)`, but `DLIVES` draws `LIVES` icons — the SPARES — so a fresh game shows 3 icons where the machine shows 2. The cap saturates at the same 6 icons the ROM tops out at, so this story's ceiling is unaffected either way (and stays correct if the HUD is later fixed to `lives - 1`). Affects `src/shell/render.ts` (cp2-12 / claim CL-15) — a future fidelity story, not cp4-4. *Found by TEA during test design.*
- **Improvement** (non-blocking): `:1992 "10$: BCS 10$ ;OOPS-RESET"` is a deliberate infinite loop — the ROM hangs itself into a watchdog reset if `LIVES` is ever found ABOVE 6. Unreachable and not modelled (the clone simply refuses the award), but it is the hardware's own statement that 6 is an invariant, not a clamp. Affects `docs/rom-study/claims/` — worth a claim + an open-questions note when Dev writes them. *Found by TEA during test design.*

### Dev (implementation)
- **Correction** (non-blocking): TEA's death/RESTOR test drove the sim with an exit condition (`lives < STARTING_LIVES`) that the feature under test invalidates — in the treatment run the sweep buys a life back BEFORE the death spends one, so `lives` returns to 3 and the loop sailed past the frame under test into a SECOND death (reported `lives === 2`). The implementation was correct throughout; a trace confirmed the award at frame 55 (`score 9,995→10,000`, `lives 3→4`, `level → 20,000`) and the death at frame 84 (`lives 4→3`). Fixed IN PLACE by keying the loop on `delay` (into the pause, then out the far side) — **no assertion was altered**. Affects `tests/bonus-lives.test.ts` (the `drive` helper only). Recording because "the harness cannot observe the state it is testing for" is the exact failure a Dev is tempted to resolve by editing the assertion instead. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the full-suite total moved 819 → 820, one more than the 784 baseline + 35 new. The extra case is `tests/purity.test.ts > src/core/bonus.ts stays inside the boundary` — the sweep's `it.each` over `readdirSync(src/core)` picking up the new module automatically. Verified by name, not inferred from arithmetic; no test was silently added. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): claim `BL-18` cites `CENTI4.MAC:923` (`STA TEMP1 ;MAX NUMBER OF LIVES`) for the statement that DLIVES draws at most SIX icons — but the literal `6` is one line up, at `:922 "DLIVES:\tLDA I,6"`. Both lines are real and the quote byte-verifies, so the citation gate will never redden on it; a reader following BL-18 to the source finds the comment but not the number the claim is about. Affects `docs/rom-study/claims/14-bonus-lives.json` (re-anchor BL-18 to `:922`). Exactly the class of the cp4-5 reviewer note about INIT `:1162` vs `:1163`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `tests/bonus-lives.test.ts`'s "does NOT award at 9,999" carries the message "the compare reads SCORE2:SCORE1 only, never SCORE0", but no test can discriminate that: mutation M2 (replace the hundreds window with a raw `score >= level` compare) leaves the suite at 820/820 green, because `floor(a/100) >= floor(b/100)` and `a >= b` are the same predicate for every level the ROM can represent (all are multiples of 100). The assertion is true and not vacuous — it just does not test the property it names. Affects `tests/bonus-lives.test.ts` (reword the message, or accept). Recorded chiefly so a future reader does not "fix" `bcdWindow` to match the message: the hundreds window is the faithful transcription even though it is unobservable. *Found by Reviewer during code review (mutation-proven).*
- **Improvement** (non-blocking): the explicit `lives: bonus.lives` / `bonusLevel: bonus.bonusLevel` pairs on three of `sim.ts`'s returns (PLAYEX death-arming, wave-clear, game-over) cannot be pinned by any end-state assertion — mutations M18/M19/M20 all survive a full green suite. They are NOT gaps: the pause-closing frames can never be scoring frames (`stepRestor`'s `RESTOR_END` return is hardcoded `scored: 0`), and on the PLAYEX path `stepDeathFrame` re-tests the still-crossed threshold on the next frame, so dropping the pair delays the award by one frame instead of losing it (driven and observed, not reasoned). Keeping them is right — the award should land on the frame it was earned — but a future refactor could delete them and ship green. Affects `src/core/sim.ts` / `tests/bonus-lives.test.ts` if anyone wants a frame-exact pin. *Found by Reviewer during code review (mutation-proven).*

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `centipede/tests/bonus-lives.test.ts` — NEW, 35 tests. The whole mechanism, transcribed from rev-4 `CENTI4.MAC` (vendored tree): the crossing test (`:1969-1973`), the decimal-mode advance (`:1975-1981`), the ceiling (`:1989-1991`), the award (`:1993`), the increment table (`:239-248`), and INIT's seeding of the first threshold from that same entry (`:854-859`).

**Tests Written:** 35 tests covering 4 ACs
**Status:** RED — 35 failed / 0 passed in the new file; **784 passed across the other 44 files** (grand total 819 in 45 files, full-suite run, no scoping). No collateral failures. `npx tsc --noEmit` exits 0 at RED (the module specifier is computed, so TS2307 never fires on the not-yet-existing `src/core/bonus.ts`).

**The contract Dev implements** (`src/core/bonus.ts`, pure, swept automatically by `tests/purity.test.ts`):
- `BONUSV` — `[10_000, 12_000, 15_000, 20_000]`, readonly. `:248 ".WORD 100,120,150,200 ;*100 PER BONUS LIFE"` are HEX words under `.RADIX 16` whose BCD digit-pairs read 0100/0120/0150/0200, ×100. Read as decimal literals the options do not come out right (120. → 0x78 → BCD 78 → 7,800) — that is the radix note the transcription comment must carry.
- `BONUS_INCREMENT = BONUSV[0]` (the hardcoded DIP default), `ROM_LIVES_MAX = 6`, `LIVES_CEILING = ROM_LIVES_MAX + 1`, `SCORE_WRAP = 1_000_000`.
- `awardBonus({ score, lives, bonusLevel, increment? }) → { lives, bonusLevel }` — pure, mutates nothing, defaults the increment with `??` (0 is a valid `bonusLevel`).
- `SimState.bonusLevel` (points), seeded to `BONUS_INCREMENT` in `createSim`, carried by `cloneState`, and consulted on the score funnel in BOTH `stepPlayingFrame` and `stepDeathFrame` (RESTOR's repairs are SCORNG events too — one test drives a real death to prove it).
- Order matters: the ROM advances the threshold BEFORE it tests LIVES, so a refused award still moves the level (pinned).

**Ground truth re-opened by hand this session** (vendored `reference/atari-source/centipede/revision.v4/CENTI4.MAC` — never `~/Projects/centipede-source`, which is off by one): `:239-248`, `:849-859`, `:922-931`, `:1943-1998`. Dev converts these into `docs/rom-study/claims/14-*.json` (claims are Dev-authored data per the cp1-2 ruling) and adds the open-questions entry AC-3 requires — the suite asserts that file names `BONUSV`, `OPTNS` and `OPTSW2` and attributes the entry to cp4-4.

### Rule Coverage

| Rule (lang-review/typescript.md) | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes | `#1 uses no type-safety escapes` (source scan for `as any` / `@ts-ignore`) | failing |
| #2 missing `readonly` on exported table | `#2 declares BONUSV readonly` | failing |
| #4 `\|\|` where `??` is meant | `#4 defaults with ?? not \|\|` + the behavioural pair `a threshold of 0 is a REAL level` | failing |
| #8 test quality (no vacuous assertions) | self-check below; `exports no sound surface` carries a paired positive existence assertion so the empty-set check cannot pass vacuously | failing |

**Rules checked:** 4 of 4 applicable checks have coverage (#3 enums, #5 module/`.js` specifiers, #6 React, #7/#11 async & error handling, #9 build config, #10 input validation, #12 bundle — none apply to a pure numeric core module).
**Self-check:** 0 vacuous tests. Every test asserts a value, not a shape. Three tests carry explicit fixture-sanity guards so they cannot pass by accident: the two `stepSim` kill tests assert the score actually moved by `SCORE_BODY`, the death/RESTOR test asserts the sweep genuinely scored (`control.score > 0`) before comparing lives, and the 40-crossing sweep asserts lives both *never exceed* AND *actually reach* the ceiling (a frozen counter would satisfy the first alone). The death/RESTOR test was run in isolation to confirm it reddens on the bonus assertion (`expected 2 to be 3`) with every fixture guard passing — not on a broken fixture.

**Handoff:** To Julia (Dev) for the GREEN phase.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **The ceiling is pinned at 7, not the AC's 6.**
  - Spec source: cp4-4 AC-2 — "a test crosses many thresholds and asserts lives never exceed 6".
  - Implementation: the suite pins `ROM_LIVES_MAX = 6` (the `:1990 CMP I,6` literal, against SPARE lives) and asserts `SimState.lives` tops out at `LIVES_CEILING = 7`.
  - Rationale: the ROM's LIVES excludes the gun in play (`:851`, claim LOOP-4); the clone's `lives` includes it. Pinning 6 in clone units would cost the player a life the hardware grants. The story's own text is a lower spec authority than the source it cites. See Delivery Findings.
  - Severity: minor (one life; the mechanism is unchanged)
  - Forward impact: cp4-7's bonus panel and any HUD-fidelity story read the same units.
- **The single-pass semantics are pinned even though play cannot reach them.**
  - Spec source: cp4-4 AC-1 — "the next threshold advances by the increment".
  - Implementation: a one-event overshoot (score 25,000 against a 10,000 level) must award exactly ONE life and advance exactly ONE increment; the catch-up happens on the NEXT event.
  - Rationale: `:1997-1998` falls straight through to RTS — there is no loop. The largest single award in play is far under 10,000, so only the sim's API can reach this, but a transcription must not invent a catch-up loop (the "the port reaches states the ROM cannot" discipline).
  - Severity: minor
  - Forward impact: none.
- **The four-BCD-digit wrap is pinned for BOTH the score and the threshold.**
  - Spec source: cp4-4 AC-2 — "the BCD/decimal-mode arithmetic is pinned against packed-BCD scores".
  - Implementation: `SCORE_WRAP = 1_000_000`; a threshold of 990,000 advances to 0, a score of 1,000,000 stops crossing, and a threshold of 0 is a valid (post-wrap) level.
  - Rationale: `BONUSM:BONUSL` and `SCORE2:SCORE1` are four BCD digits each; `:1980`'s decimal carry out of BONUSM is discarded. `src/core/score.ts` already documents the same wrap for SCORE2 as "Transcribed, not corrected", and million-point games are reachable.
  - Severity: minor
  - Forward impact: a naive `score >= level` implementation passes every other test in the suite and fails only these — deliberately.

### Dev (implementation)
- **The bonus test runs once per FRAME, not once per scoring EVENT.**
  - Spec source: `sprint/context/context-story-cp4-4.md`, the Problem statement — "On each scoring event the ROM tests the running score".
  - Spec text: SCORNG (`:1943-1998`) is called per award, and the bonus test is its tail, so the hardware runs it once per kill.
  - Implementation: `stepPlayingFrame` and `stepDeathFrame` each call `awardBonus` once, on the frame's final score, after every `score +=` site.
  - Rationale: a frame can hold several scoring events (a segment and the spider can die to the same shot's frame), but the largest total a frame can score is far below the 10,000-point increment, so no frame can cross two thresholds — one test on the frame's total sees exactly the crossing the per-event tests would, and the alternative is threading a bonus check through eight separate `score +=` call sites in `sim.ts`.
  - Severity: minor
  - Forward impact: if a future story ever awards ≥ one increment in a single event, the funnel must move back to per-event (it would then under-award by one life per extra threshold).
- **The bonus-life sound is absent rather than stubbed.**
  - Spec source: cp4-4 AC-4 — "the bonus-life sound is explicitly deferred to cp5 (noted, not stubbed with dead code)".
  - Spec text: `:1994-1995 "LDA I,17. / STA CHAN4 ;BONUS LIFE SOUND"`.
  - Implementation: cited in `src/core/bonus.ts`'s header comment and in claim BL-16; no hook, no field, no no-op function.
  - Rationale: the AC asks for exactly this. Recorded because "the seam is missing" is otherwise indistinguishable from an oversight at review.
  - Severity: none (as specified)
  - Forward impact: cp5 hangs the cue off the `:1993` award branch in `awardBonus`'s caller.
## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `centipede/src/core/bonus.ts` — NEW. `BONUSV` (readonly, the four DIP increments in points), `BONUS_INCREMENT` (= `BONUSV[0]`, hardcoded default), `ROM_LIVES_MAX` (6, the `:1990` literal), `LIVES_CEILING` (7, clone units), `SCORE_WRAP` (1,000,000), and `awardBonus({ score, lives, bonusLevel, increment? })` — pure, non-mutating, `??`-defaulted. Radix-cited throughout; the CHAN4 deferral is a comment, not a stub.
- `centipede/src/core/sim.ts` — `SimState.bonusLevel`, seeded to `BONUS_INCREMENT` in `createSim` (INIT `:854-859`), carried by `cloneState`, and tested on the score funnel in BOTH `stepPlayingFrame` (all three returns) and `stepDeathFrame` (the RESTOR-sweep early return, the death/game-over returns, the wave-clear return). The death path now spends its life from the POST-bonus count, so a sweep that buys a life back does so before the death takes one.
- `centipede/docs/rom-study/claims/14-bonus-lives.json` — NEW, `BL-1..BL-21`. Generated directly from the vendored rev-4 tree rather than hand-typed, so every `verbatim` is byte-exact by construction; the citation gate re-opens all 21 and passes.
- `centipede/docs/rom-study/open-questions.md` — entry 13: the un-modelled DIPs (OPTNS D4-D5 increment, OPTSW2 timed play), the hex-word/BCD radix trap, the six-SPARE ceiling and its clone-unit conversion, the "refused ≠ skipped" ordering, the `:1959-1962` non-conflation, and the deferred sound.
- `centipede/tests/bonus-lives.test.ts` — the `drive` helper's loop-exit condition only (see Delivery Findings). **No assertion changed.**

**Tests:** 820/820 passing across 45 files (full suite, unfiltered). `tests/bonus-lives.test.ts` 35/35; citations green with the 21 new claims byte-verified; `tests/purity.test.ts` 22/22, including the new `src/core/bonus.ts stays inside the boundary` case the sweep picked up automatically.
**Build:** `npm run build` (`tsc --noEmit && vite build`) exits 0. **Lint:** `npm run lint` clean.
**Branch:** `feat/cp4-4-bonus-lives` — pushed, commit `9d38b19` (on top of TEA's RED `6e6b52c`). Working tree clean.

**AC status:**
- AC-1 ✓ crossing awards a life and the threshold advances by the increment, both transcribed from `:1968-1981` with radix-cited comments + `BL-*` claims; citations green.
- AC-2 ✓ capped at the ROM's six SPARE lives — `LIVES_CEILING = ROM_LIVES_MAX + 1 = 7` in clone units (see the TEA deviation and finding #1); a 40-crossing sweep pins that lives both reach and never pass it; the BCD width is pinned by the threshold wrap at 990,000 and the score wrap at 1,000,000.
- AC-3 ✓ increment hardcoded to `BONUSV[0]` and parameterised; open-questions entry 13 records the increment DIP and the OPTSW2 timed-play branch as not modelled.
- AC-4 ✓ full suite green from baseline (784 → 820, every added test accounted for by name); build + lint clean; the sound is deferred in a comment and a claim with no dead code.

**Self-review:**
- *Wired end to end.* Not a pure module nobody calls: `stepSim` consults it on every scoring frame, and the shell already renders `state.lives`, so an awarded life shows up as another gun icon with no shell change. Proven by an integration test through `stepSim` (a body kill that crosses) plus its negative control (the same kill that does not).
- *Follows project patterns.* Radix-cited comments, claims-as-data, a pure `src/core` module with the seeded-rng/no-clock discipline (purity sweep green), `stepX`-style spread rebuilds, string-union-free plain numbers.
- *Restraint.* One exported helper was written and then deleted before commit: a `bonusBytes` BONUSM/BONUSL splitter for cp4-7's "BONUS LIFE EVERY XXXX" panel. No test demanded it and cp4-7 owns that panel, so it was dead code — the panel can take it when it needs it.
- *The one thing worth a reviewer's eye:* the per-frame vs per-event funnel (Design Deviations), and whether `LIVES_CEILING = 7` is accepted over the AC's literal 6.

**Handoff:** To The Thought Police (Reviewer) for the review phase.
## Reviewer Assessment

**Verdict: APPROVED.** No Critical, High, or Medium findings. Three LOW/INFO items, all recorded as non-blocking Delivery Findings.

**How this was reviewed.** Eight of the nine reviewer specialists are disabled in settings (`workflow.reviewer_subagents` — only `preflight` is true), so their domains were assessed directly. More importantly, this story was written and reviewed in the SAME session, so re-reading my own code proves nothing about it. The instrument was a **21-mutation battery** applied to the real committed source, each mutant run against the full suite and then reverted (`scratchpad/mutate.py`; working tree verified clean afterwards).

**Result: 16/21 killed, 5 survivors — every survivor proven EQUIVALENT, not a gap.**

| # | Mutation | Verdict |
|---|----------|---------|
| M1 | drop the `% SCORE_WRAP` wrap | killed |
| M3 | `<` → `<=` (never award AT the level) | killed |
| M4 | ceiling off by one (8 plays) | killed |
| M5 | ceiling = `ROM_LIVES_MAX` (the AC's literal 6) | killed |
| M6 | a refused award stops advancing the level | killed |
| M7 | the threshold no longer wraps | killed |
| M8 | drop the DIP default | killed (tsc) |
| M9 | the award never happens | killed |
| M10 | export `BONUSV` mutable | killed |
| M11/M12 | wrong ROM ceiling / wrong default entry | killed |
| M13/M14 | play frame / death frame never runs the test | killed |
| M16 | INIT seeds the wrong first threshold | killed (tsc) |
| M17 | the play frame tests the PRE-event score | killed |
| M21 | the wave-clear-arming return drops the result | killed |
| M2 | raw compare instead of the hundreds window | **survived — equivalent** |
| M15 | the death spends from the PRE-bonus count | **survived — equivalent** |
| M18/M19/M20 | wave-clear / game-over / PLAYEX returns drop the pair | **survived — equivalent** |

**Why each survivor is equivalent (proven, not assumed):**
- **M2.** `floor(a/100) >= floor(b/100)` and `a >= b` are the same predicate whenever `b` is a multiple of 100 — and every representable level is (the increments are multiples of 1,000, and BONUSL counts hundreds). The 100-point granularity is therefore unobservable on any ROM-representable state. See finding #2.
- **M15 / M18 / M19.** All three touch frames where the death/wave pause is CLOSING. `stepRestor` cannot score on that frame: its `RESTOR_END` return is hardcoded `scored: 0` (`src/core/playfield.ts:183`, CT-61), and `delay` only decrements once the sweep has disarmed (`sim.ts` CT-64). A non-scoring frame makes `awardBonus` a no-op, so `bonus.lives === state.lives` there by construction.
- **M20.** My first reading of this one was WRONG, and the experiment is why I know. I predicted a last-life player would lose a game they should still be in. Driving the real scenario — score 9,990, `lives: 1`, a body in the shot's path AND a head on the gun in the same frame — showed the clean code goes `lives 1 → 2 (bonus) → 1 (death), phase 'playing'`, and the MUTANT lands on `lives 1 → … → 1, phase 'playing'` as well: `stepDeathFrame` re-tests the still-crossed threshold on the very next frame and awards it there, before the death spends a life. The mutant delays the award by one frame; it never loses it. Not a gap. See finding #3.

**Acceptance criteria — verified independently, not taken from the Dev assessment:**
- **AC-1 ✓** Crossing awards and the level advances; 21 claims (`BL-1..BL-21`) byte-verify against the vendored rev-4 tree with the citation gate green. Spot-checked the claim TEXT as well as the verbatim (the gate only re-opens the quote, it cannot judge the prose) — `:854-857` genuinely seeds INIT's first threshold from the same `BONUSV` entry `BONUS1` returns as the increment, which is what makes "the first bonus lands at the increment" true.
- **AC-2 ✓** The ceiling is `LIVES_CEILING = ROM_LIVES_MAX + 1 = 7`. **I am ruling explicitly in favour of TEA's correction over the AC's literal "6."** `:851 "STX LIVES ;NUMBER OF LIVES-1 (WE ARE PLAYING WITH ONE)"` (BL-17) and `DLIVES`'s `LDX LIVES` icon loop both establish that the ROM's LIVES excludes the gun in play, while `SimState.lives` includes it. M5 proves the suite would catch a regression to the AC's 6. The epic YAML's AC-2 wording is what needs editing, not the code.
- **AC-3 ✓** `BONUSV` exported readonly, default hardcoded to `[0]`, `increment` parameterised (M8/M12 both killed); open-questions entry 13 names the OPTNS D4-D5 increment and the OPTSW2 timed-play branch as not modelled.
- **AC-4 ✓** 820/820 across 45 files, `npm run build` and `npm run lint` exit 0, tree clean, branch in sync with origin at `9d38b19`. The 819→820 delta is accounted for BY NAME (`purity.test.ts > src/core/bonus.ts stays inside the boundary`), not by arithmetic. The CHAN4 sound is a comment and a claim, with no stub — confirmed by reading the module, not just the test that asserts it.

**Domains assessed directly (the disabled specialists):** edge cases (an out-of-range `lives` is refused rather than hung — a sane divergence from `:1992`'s deliberate watchdog loop; `increment: 0` is unreachable from `BONUSV`); silent failure (no catch, no fallback, no swallowed state — the one default is an explicit parameter default); type design (`readonly` input fields, `as const` table, fresh return object, no stringly-typed API); simplification (no dead code — the `bonusBytes` helper Dev wrote for cp4-7 was deleted before commit, correctly); comments (the funnel comment's claim that no frame can score a full increment holds — one shot is consumed by one kill, so the per-frame ceiling is ~1,000); security (no I/O, no input, no persistence); rule compliance (typescript.md #1 no escapes, #2 readonly on the exported table, #4 `??`-style default over `||`, #8 meaningful assertions — all pass, and #2/#4 are pinned by tests rather than trusted).

**Note for SM:** this story is AI-authored and AI-reviewed. The merge needs explicit human authorization at finish — do not self-merge.

**Handoff:** To Winston Smith (SM) for the finish phase.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 820/820 tests, build 0, lint 0, tree clean, branch in sync at `9d38b19`; 0 real smells (its 2 `as any` hits are the test file's own regexes asserting absence, its 2 "commented-out code" hits are prose) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (out-of-range `lives` refused rather than hung; `increment: 0` unreachable from `BONUSV`; the wrap boundaries pinned by M1/M7) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (no catch, no fallback, no swallowed state; the single default is an explicit parameter default, killed by M8) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — replaced by the 21-mutation battery, which is strictly stronger: it found the one over-claiming assertion (finding #2) that reading the tests did not |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed directly; found the BL-18 citation anchor (finding #1) and verified the funnel comment's "no frame can score a full increment" claim holds |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (`readonly` input fields, `as const` table pinned by M10, fresh return object, no stringly-typed API) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — not applicable: a pure numeric core module with no I/O, no input, no persistence |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed directly (no dead code; the `bonusBytes` helper was deleted before commit; the three unpinnable field pairs are redundant-but-correct, finding #3) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — lang-review typescript.md walked directly: #1, #2, #4, #8 pass, and #2/#4 are pinned by tests rather than trusted |

**All received: Yes** — 1 of 1 enabled subagents (`reviewer-preflight`) returned before this assessment was written; the other 8 are disabled in `workflow.reviewer_subagents` and their domains were covered directly plus by the mutation battery.