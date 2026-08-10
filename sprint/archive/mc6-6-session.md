---
story_id: mc6-6
jira_key: mc6-6
epic: mc6
workflow: tdd
---
# Story mc6-6: Game-over -> attract timeout

## Story Details
- **ID:** mc6-6
- **Jira Key:** mc6-6
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** feat/mc6-6-game-over-attract-timeout
- **PR:** 201
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-10T13:35:13Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T12:54:13Z | 2026-08-10T12:56:57Z | 2m 44s |
| red | 2026-08-10T12:56:57Z | 2026-08-10T13:06:22Z | 9m 25s |
| green | 2026-08-10T13:06:22Z | 2026-08-10T13:17:40Z | 11m 18s |
| review | 2026-08-10T13:17:40Z | 2026-08-10T13:35:13Z | 17m 33s |
| finish | 2026-08-10T13:35:13Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA, non-blocking, Question resolved]** The story title says "pin the timeout
  constant," but the ROM's return-to-attract is NOT a single bare `PAUST` literal
  (SM already flagged this). ENDGM1 (W3MAIN.MAC:4617) flips ATRACT to attract mode
  immediately; ENDGM2 (:4683) then runs the "final bang" grow+shrink animation before
  handing to the attract/DISPLAY-5-HI screen (`SETUPC=CDLADR`). I resolved the design
  question in favour of a FIXED-FRAME constant derived from that ENDGM2 cadence
  (`2*ENDMAX/ENDUPD = 218`), NOT the sprite-animation model — see the Design Deviation
  below. The archived title still reads "the timeout constant"; a later reader should
  read it as "the ENDGM2 final-bang hold," not a literal PAUST byte.
- **[TEA, non-blocking, Improvement]** The radix decode of `ENDMAX=6D` is a trap: hex is
  FORCED, not chosen. "THE END" displays at `CMP I,62` (W3MAIN.MAC:4713), which must be
  `< ENDMAX` for that branch to ever fire — `0x62=98 < 0x6D=109` works, decimal `6`
  makes "THE END" unreachable. Dev's citation/claim must state the hex reading and this
  self-consistency proof, or the un-cited-literal / citations-source gate will (rightly)
  be unconvinced by a bare `109`.

### Reviewer (code review)
- **Improvement** (non-blocking): the AC3 "purity" test (over-attract-timeout.test.ts, the
  busy-spin determinism case) is low-value for a 2-arg pure ternary — core purity is already
  enforced structurally by `purity.test.ts`'s core-boundary source scan. Affects
  `plugins/missile-command/tests/over-attract-timeout.test.ts` (could be trimmed; harmless as-is).
  *Found by Reviewer during code review.*
- **Question** (non-blocking): mc6-5 (attract presentation / "THE END" screen) will RENDER the
  ENDGM2 explosion whose duration this story models as the fixed 218-frame hold. mc6-5 should keep
  its rendered "THE END" cadence consistent with `OVER_TIMEOUT_FRAMES` (or consciously diverge).
  Affects the future mc6-5 render work (no change here). *Found by Reviewer during code review.*
- No blocking upstream findings — the two review defects (citation `:4713`→`:4715`, over-frame
  vs boot-frame guard) were fixed in-place this round (commit `883f072a`).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[TEA] Open design question resolved: FIXED-FRAME model, not sprite-animation.**
  - *What the context said:* choose at RED between (1) faithfully tying the return to
    ENDGM2's growing "THE END" explosion sprite, or (2) pinning one representative
    fixed-frame constant derived from that cadence.
  - *What I chose:* option (2). The animation/sprite model would drag render state
    ("THE END" radius, DSPEXP) into the pure core — a render concern that belongs to
    mc6-5's attract-presentation story, not a 2-pt core reducer. The pure core stays a
    frame threshold.
  - *Why it's still faithful:* the hold length IS the ENDGM2 final-bang span — the
    explosion grows `ENDUPD..ENDMAX` and shrinks `ENDMAX..0` at `ENDUPD` dots/frame
    before `SETUPC=CDLADR`, so `2*ENDMAX/ENDUPD = 2*109/1 = 218` frames (~3.6s @60fps).
    The constant carries the ENDGM1/ENDGM2 citations. The exact ±1-2 frame boundary at
    over-entry is deliberately NOT pinned by the integration tests (only the pure
    reducer pins the exact `>=` boundary), because a fixed-frame representative value
    does not claim frame-exact ROM fidelity — mc9-level pixel/anim fidelity may revisit.

### Dev (implementation)
- **On timeout, return a fresh cold-start attract board (`createGame`), not the frozen over state relabelled `'attract'`.**
  - Spec source: context-story-mc6-6.md, AC5 ("attract → over → (timeout) → attract"); TEA contract ("Dev owns the state shape").
  - Spec text: the tests assert only that phase becomes `'attract'` and the returned state is a live demo again (frame advances, phase holds attract next tick); the state's *contents* on the flip are unspecified.
  - What I did: the `'over'` branch returns `createGame(state.rng.seed)` when `advanceOverTimeout` fires — a fresh, fully-defended attract board with the seed stream continued.
  - Why: the ROM's ENDGM1 flips ATRACT then ENDGM2 hands to `SETUPC=CDLADR`, i.e. the attract demo resumes on a fresh board — not the dead-city game-over field frozen with phase relabelled. A relabel would leave the attract demo with zero live cities (nothing for the AUTCUR demo to play), passing the phase assertions but not actually a demo. Continuing `state.rng.seed` keeps the reboot deterministic (mirrors `startGame`).
  - Forward impact: the game-over score/board is DROPPED at the loop close. Faithful for the *demo* board; the persistent HIGH-SCORE ladder (ROM HSTD) is mc7's concern (mc7-2 is the name-entry buffer), not carried here. No test depends on the over state surviving the flip.

### Reviewer (audit)
- **[TEA] Fixed-frame model (not sprite-animation)** → ✓ ACCEPTED by Reviewer: sound, and
  independently strengthened — the comment-analyzer's instruction-level trace of ENDGM2
  (grow/cap-snap/shrink + the final silent done-frame) confirms the hold is *exactly* 218
  frames, so `2*ENDMAX/ENDUPD` is not merely representative but numerically exact. Keeping the
  sprite/render model out of the pure core is correct (mc6-5's territory).
- **[Dev] Timeout returns a fresh cold-start attract board (`createGame`), not the frozen over
  state relabelled** → ✓ ACCEPTED by Reviewer: faithful to the ROM path (ENDGM1 flips ATRACT,
  ENDGM2 → `SETUPC=CDLADR` → the attract demo resumes on a fresh board). A relabel would leave
  the AUTCUR demo with zero live cities. Continuing `state.rng.seed` matches `startGame`. The
  dropped game-over score is correctly deferred to mc7 (HSTD) — no consumer here depends on it.

## SM Assessment

**Story shape:** TITLE-ONLY — both `description` and `acceptance_criteria` were `null`
in `sprint/epic-mc6.yaml`. The title is the spec, so I measured its premise against the
current tree and the ROM before setup (title-only stories rot silently, and `sm-setup`
copies the title forward as fact). Context and five derived ACs are in
`sprint/context/context-story-mc6-6.md`.

**Premise: REAL, not a ghost.** The MAINLINE loop is genuinely open today:
- `plugins/missile-command/src/core/state.ts:27` makes `over` TERMINAL
  (`if (phase === 'over') return 'over'`).
- `plugins/missile-command/src/core/game.ts:27` — "Once phase is over the loop only
  advances the frame counter." Nothing returns to attract. mc6-6 closes it.

**ROM ground truth (cited, verified with `grep -a` — the .MAC files carry form-feed
bytes):** game-over -> attract is the two-phase ENDGM routine:
- dispatch table `.WORD ENDGM1-1` (W3MAIN.MAC:589), `.WORD ENDGM2-1` (:601)
- `ENDGM1:` (:4617) sets `STY ATRACT` (Y=0 -> attract mode; ATRACT polarity :135)
- `ENDGM2:` (:4683) runs the "THE END" death-explosion cadence (`ENDMAX=6`, `ENDUPD=1`,
  "THE END" at radius 62) — that animation IS the hold
- `PAUST` "PAUSE TIMER (IN FRAMES)" (:187) is the ROM's general self-timed hold counter

**Design question handed to TEA (flagged in context, deliberately NOT resolved by SM):**
the title says "pin the timeout constant," but the ROM return is NOT one bare `PAUST`
literal — ATRACT flips immediately in ENDGM1 and the ENDGM2 explosion cadence occupies
the hold. TEA/Architect decide at RED: faithful animation-duration model vs. one
representative fixed-frame constant derived from ENDGM2. Either way the constant carries
a ROM citation and is pinned + WRONG-value-mutation-guarded at RED. Citation-gated repo
(`tests/audit/citations.test.ts`): ROM line numbers in `//` comments, never JSDoc.

**Purity:** core stays clock-free. The `frame` counter already exists (`game.ts:75`,
"the sim's only clock") and advances while over — so the timeout is a pure threshold on
frames-in-over, no Date/wall-clock. Model as mc6-1..4 did.

**Contention:** sibling checkout a-3 is running mc7-2 (name-entry initials buffer). In
the real machine name entry sits between game-over and attract, but mc7-2's files are the
name-entry buffer, not the state.ts/game.ts phase machine mc6-6 touches — low direct
overlap. Sibling probes clean for mc6-6 (no remote branch, no sibling session). Claim
pushed: commit `6add771c`, branch `feat/mc6-6-game-over-attract-timeout` (feature branch,
gitflow — develop is pf-protected).

**Routing:** phased tdd -> TEA (Tyr One-Handed) for RED.

## TEA Assessment

**RED delivered.** `plugins/missile-command/tests/over-attract-timeout.test.ts`
(commit `9ceb86a2`). 10 failed / 2 passed on the new file; full MC project
**10 failed / 1158 passed, 65 of 66 files green**; `npm run lint` (tsc --noEmit,
repo-wide) **green** via the dynamic-import loader idiom.

**The contract Dev implements (GREEN):**
- `src/core/state.ts` — export `OVER_TIMEOUT_FRAMES = 218` (`= 2*ENDMAX/ENDUPD`,
  ENDMAX=`0x6D`=109, ENDUPD=1; W3MAIN.MAC:4675/:4677). Cite in `//` comments (the
  un-cited-literal scanner strips `//` not `/** */`); if it lands as a bare literal,
  file its claim JSON under `docs/rom-study/claims/` (the citations double-entry gate),
  stating the hex decode + the `62 < ENDMAX` self-consistency proof.
- `src/core/state.ts` — export `advanceOverTimeout(phase, framesInOver): Phase` —
  returns `'attract'` iff `phase==='over' && framesInOver >= OVER_TIMEOUT_FRAMES`,
  else the phase unchanged. Pure: no clock, no entropy. `advancePhase` STAYS as-is
  (over is still terminal for the play->over direction; this is a separate,
  frame-driven edge).
- `src/core/game.ts` — the `'over'` branch (currently `game.ts:256`, ticks the frame
  forever) must track frames-spent-in-`'over'` and call `advanceOverTimeout` so the
  assembled loop closes over -> attract. Dev owns the state shape (e.g. an
  `overFrames` counter or an over-entry frame) — the integration tests observe only
  the phase, so they don't constrain the field name.

**Test map to ACs:**
- AC1 (loop closes): `advanceOverTimeout('over', OVER_TIMEOUT_FRAMES) === 'attract'` (+ beyond-threshold).
- AC2 (cited constant + mutation guard): value pinned to `2*ENDMAX/ENDUPD` derived from
  the equates in-test (not transcribed from Dev's code) — a wrong constant reddens it.
- AC3 (pure/clock-free): referential transparency across interposed wall-time.
- AC4 (hold is real): `over` holds at frame 0 and at threshold-1; scoped to `over`
  only — the 5 other phases pass through unchanged past the threshold.
- AC5 (wired): `stepGame` drives all-cities-dead -> `over` -> (hold) -> `attract`;
  includes two regression guards that must stay GREEN (entering over; the 10-frame hold).

**Rule Coverage** (`.pennyfarthing/gates/lang-review/` + project rules / SOUL):
- **Core purity / clock-freedom** (the single most important arcade rule): AC3 pins
  referential transparency; the existing `purity.test.ts` core-boundary scanner (scans
  `src/core/` source text) covers `window.`/`document.`/clock imports — Dev must keep ROM
  line numbers in `//` comments (the scanner reads comment text). Not re-implemented here
  (it's a standing guard); flagged so Dev doesn't trip it.
- **Un-cited numeric literal**: `OVER_TIMEOUT_FRAMES`/`ENDMAX` need a `//` citation or a
  claim JSON — enforced by the existing `citations.test.ts` + `citations-source.test.ts`
  double-entry; AC2 additionally pins the VALUE so a mis-decode (decimal 6) is caught by
  behavior, not just by the byte-verifier.
- **No vacuous assertions** (TEA self-check): every test asserts a concrete phase/number;
  the 2 green tests are non-vacuous regression guards (assert `phase === 'over'`), not
  `assert(true)`. No `let _ =`, no always-`None` checks.
- **Determinism / seeded, no ambient entropy**: AC3 + the seed-threaded `allDeadPlay`
  helper keep the integration path deterministic.

**Handoff to Dev (Loki Silvertongue):** make the 10 red tests green with the contract
above; keep the 2 regression guards + all 1158 siblings green; re-run `npm run lint`.

## Dev Assessment

**GREEN delivered** (commit `9089a4a9`). All of Tyr's contract implemented as specified.

**Verification (evidence, not assertion):**
- `over-attract-timeout.test.ts`: **12/12 green** (was 10 failed / 2 passed at RED).
- Full missile-command project: **1169/1169 green, 66/66 files** — the mc3/mc4
  playthroughs and both citation gates (`citations.test.ts` un-cited-literal guard +
  `citations-source.test.ts` radix decode) all green; AC4 (siblings green) satisfied.
- Whole-repo `npx vitest run`: **14217 passed / 1 todo, 937 files**.
- `npm run lint` (tsc --noEmit, repo-wide): **green**.
- Citation byte-checker CLI on the new claim: **exit 0**.

**What I built:**
- `src/core/state.ts` — `ENDMAX=0x6d` (109), `ENDUPD=1`, `OVER_TIMEOUT_FRAMES =
  (2*ENDMAX)/ENDUPD` (218), and pure `advanceOverTimeout(phase, framesInOver)`. ROM
  derivation in `//` comments; the `218` value-literal kept out of the JSDoc (the
  scanner strips `//` not `/** */` — caught by the guard on the first run and moved).
- `src/core/game.ts` — new `GameState.overFrames` (seeded 0 in `createPlayGame`, so
  `createGame`/`startGame`/all spread-returns inherit it, held 0 outside `'over'`); the
  `'over'` branch increments it and, at the timeout, returns `createGame(state.rng.seed)`
  (see the Design Deviation — fresh attract board, seed continued).
- `docs/rom-study/claims/state.json` — `MC-STATE-ENDMAX` (value 109, verbatim
  `ENDMAX\t=6D...`), auto-verified by the source-decode loop (`decodeRadix16('6D')=109`)
  and the byte-checker.

**Empirical risk-clearing worth noting for the Reviewer:** before implementing I measured
that seeds {1,3,7,11,42} never reach `'over'` within 400 frames of `stepGame` (full
defense, no player fire), so the mc3/mc4 playthroughs (seed 11, 400 frames) never
accumulate over-frames and the loop-close never fires there — AC4 was safe by
construction, then confirmed green.

**For the Reviewer (Heimdall):** the one judgment call is the fresh-board-vs-relabel
choice on the timeout (logged as a Dev deviation, with the fidelity rationale and the
mc7 HSTD forward-note). Everything else is a direct read of the ROM ENDGM1/ENDGM2 path.

**Handoff to Reviewer:** GREEN on `feat/mc6-6-game-over-attract-timeout` (pushed).

## Subagent Results

| # | Subagent | Received | Status | Findings | Decisions |
|---|----------|----------|--------|----------|-----------|
| 1 | reviewer-preflight | Yes | clean | none | mechanical pass: MC 1169/1169, citations 214/0, pure-core clean, tree clean |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (edge covered manually + rule-checker #14/#22 + mutation battery) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings (no error paths in a pure reducer; N/A) |
| 4 | reviewer-test-analyzer | Yes | findings | 5 | 1 confirmed+fixed, 2 dismissed w/ rationale, 2 informational |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 | 2 confirmed+fixed (dup citation), 1 dismissed (218 trace-verified) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (no new types beyond a readonly number field; N/A) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings (no user input / auth / secrets in a pure sim; N/A) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings (manually reviewed: reducer is a one-line ternary; no over-engineering) |
| 9 | reviewer-rule-checker | Yes | findings | 1 | 1 confirmed+fixed (citation :4713); 27 other rules PASS |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 4 confirmed (2 fixed this round: citation ×3, over-frame guard), 4 dismissed (with rationale), 3 informational

### Finding dispositions
- **[DOC][RULE] citation `CMP I,62 (:4713)` → `:4715`** (comment-analyzer + rule-checker, high conf):
  CONFIRMED, FIXED in all three occurrences (state.ts:133, state.json:61 claim-meaning,
  over-attract-timeout.test.ts:19). `:4713` is `PHA`; the instruction is at physical `:4715`
  (.MAC blank-line doubling). Verbatim/value/logic were correct; byte-checker still exit 0.
- **[TEST] over-frame vs boot-frame indistinguishable** (test-analyzer F1, downgraded HIGH→MEDIUM
  — code is verified CORRECT, this is a coverage gap for a non-present bug): CONFIRMED, FIXED.
  Added a hardening test entering `'over'` at frame `OTF*10` and asserting the hold still runs the
  full `OVER_TIMEOUT_FRAMES`. Mutation-proven: `overFrames`→`frame` reddens exactly this test
  (previously survived all 1169). This is the *normal* case (real games enter over at high frame),
  so the guard has real value.
- **[TEST] second-cycle overFrames reset leak** (test-analyzer F2): DISMISSED — equivalent mutant
  (checklist #23). Every restart routes through `createPlayGame` (game.ts:142) which unconditionally
  zeroes `overFrames`, and nothing outside the `'over'` branch reads the field, so the leak is
  unobservable; no test can kill it and none should be contrived to.
- **[TEST] AC2 `.toBe((2*ENDMAX)/ENDUPD)` "duplicate transcription"** (test-analyzer F4):
  DISMISSED-as-mitigated — the `ENDMAX=109` reading is *independently* source-verified by
  `citations-source.test.ts`'s decode loop (`decodeRadix16('6D')===109` against the real ROM), and
  the `2×` span is a documented design choice, not a transcription. Non-vacuous (rule-checker #26
  confirmed the LHS is the imported production value).
- **[DOC] 218 stated with exact confidence, test re-derives formula** (comment-analyzer): DISMISSED
  — the comment-analyzer's OWN instruction-level ENDGM2 trace confirmed 218 is exact; the number is
  correct. Informational.
- **[TEST] AC3 purity test is low-value / AC5 baseline tests not mc6-6-specific** (test-analyzer
  F3/F5): informational, no action (filed as a non-blocking Delivery Finding).

### Rule Compliance (TypeScript lang-review, 26 checks + arcade ADDITIONAL_RULES)
Enumerated every changed symbol against every applicable rule (rule-checker exhaustive pass, 47
instances; I re-verified the load-bearing ones):
- **#14 edges-in-one-branch** — COMPLIANT. `overFrames` is written only in `stepGame`'s `'over'`
  branch (game.ts:266-270); the sole other exit from `'over'` is `startGame` (game.ts:188, called by
  `shell/input.ts:132`), which routes through `createPlayGame` (zeroes overFrames). Both exits
  (timeout→attract, restart→play) go through the single `createPlayGame` zero-source. No leak/double-count.
- **#22 comparison boundary** — COMPLIANT. `framesInOver >= OVER_TIMEOUT_FRAMES` is net-new (no
  ACCEPT-predicate inverted); `framesInOver` is an integer counter, never NaN; both sides pinned
  (AC1 `===`, AC4 `−1`) and mutation-confirmed (`>=`→`>` reddens AC1/AC3).
- **#18/#26 test apparatus / all-local terms** — COMPLIANT. AC2's LHS `OVER_TIMEOUT_FRAMES` is the
  imported production value; ENDMAX/ENDUPD are NOT exported, so the RHS is a genuine second source.
- **#27 CORE PURITY** — COMPLIANT. `grep` of state.ts + game.ts hunk (incl. comments) for
  `Date.|performance.|Math.random|window.|document.` = zero hits; `purity.test.ts` green.
- **#28 un-cited literal** — COMPLIANT. `0x6d`=109 cited in `//` + claim `MC-STATE-ENDMAX`; `218`
  lives in a `//` comment (not JSDoc); `ENDUPD=1` and `2` are trivial-exempt.
- **#29 citation placement/byte-match** — was the ONE violation (:4713), now FIXED; all ROM
  citations sit in `//` comments; claim verbatim byte-matches W3MAIN.MAC:4675.
- #1-13, #15-17, #19-21, #23-25 — no applicable instances or COMPLIANT (see rule-checker detail).

### Devil's Advocate
Assume the loop closure is broken. First attack: the timeout fires from a `createGame(state.rng.seed)`
that throws away the entire game — could a consumer downstream choke on the sudden board reset? The
audio shell keys `end-game` on `prev!=='over' && curr==='over'` (audio-dispatch.ts:112); on the flip
frame `prev==='over', curr==='attract'`, so it does NOT re-fire — good, but what about a consumer that
assumed `'over'` is permanent? I grepped: sibling guards assert `'over'` terminal only against
`nextPhase`/`resumePlay` (pure fns unchanged), not against `stepGame`, so none is falsified. Second
attack: a race between shell input and `stepGame` on the flip frame. If the shell applies
`fireOrStart` (over→startGame→play) BEFORE stepGame, stepGame sees `'play'` and never times out; if
AFTER, stepGame flips over→attract and the input then sees `'attract'`→setup. Both orders are
internally consistent — no double-fire, no lost restart. Third attack: off-by-one — is the hold 217,
218, or 219? The comment-analyzer simulated ENDGM2 instruction-by-instruction (cap-snap + silent
done-frame) and got exactly 218; and the fixed-frame model explicitly does not claim frame-exact
fidelity anyway, so a ±1 would still be acceptable. Fourth: integer overflow / stuck counter —
`overFrames` caps at the flip (218) and resets; it cannot grow unbounded. Fifth: determinism — a
replay must reproduce; `createGame(state.rng.seed)` threads the live seed, so same-seed runs still
replay (and the playthrough determinism test is green). Sixth, the nastiest: does a LONG real game
break the hold? This was the actual gap — with the boot-frame counter a 3000-frame game would skip
the hold entirely. The code uses `overFrames` (correct), and the new hardening test now pins it,
mutation-proven. Seventh: pause during over — `togglePause` only flips play↔pause, leaves `'over'`
untouched, and stepGame's over branch precedes the pause branch, so a paused-then-over sequence can't
strand the counter. I could not construct a reachable break; the residual risks are all documented
deviations (dropped score → mc7 HSTD) or informational.

## Reviewer Assessment

**Verdict:** APPROVED

Round-1 review found two real defects (a false ROM citation duplicated across three files incl. the
pinned claim JSON; and a coverage gap where the `overFrames`-vs-`frame` wiring choice was invisible to
all 1169 tests). Both are MEDIUM by the project severity rubric (the code was verified functionally
correct — no Critical/High), and both were fixed in-place this round (commit `883f072a`) with the guard
mutation-proven, rather than bounced for a disproportionate reject cycle on already-correct code.

**[VERIFIED] loop closure correct** — `stepGame` over branch (game.ts:266-270) increments
`state.overFrames` and calls `advanceOverTimeout`; at 218 over-frames returns `createGame(seed)`.
Complies with core-purity (#27) and edge-in-one-branch (#14) rules.
**[VERIFIED] pure/clock-free** — evidence: grep of state.ts/game.ts hunk = 0 clock/entropy/browser
tokens; `purity.test.ts` green (29/29). Complies with the arcade core-boundary rule.
**[VERIFIED] constant cited + claimed** — ENDMAX 0x6d/109 in `//` + `MC-STATE-ENDMAX`, byte-checker
exit 0; complies with un-cited-literal (#28) + citation (#29) rules.
**[DOC][RULE] citation :4713→:4715** — CONFIRMED and FIXED (×3).
**[TEST] over-frame guard** — CONFIRMED gap, FIXED (hardening test, mutation-proven).
**Data flow traced:** all-cities-dead `'play'` → `stepGame` → `'over'` (overFrames counts) → 218
frames → `createGame(seed)` → `'attract'` demo. Restart path: `'over'` → `fireOrStart` → `startGame`
→ `createPlayGame` (overFrames 0) → `'play'`. Both safe.
**Verification:** MC 1170/1170 green, lint green, citations exit 0, tree clean.
**Handoff:** To SM for finish-story.