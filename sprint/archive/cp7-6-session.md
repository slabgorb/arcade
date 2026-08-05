---
story_id: "cp7-6"
jira_key: "cp7-6"
epic: "cp7"
workflow: "tdd"
---
# Story cp7-6: Adopt the shared pause — and stop the sustained voices that would ring through it

## Story Details
- **ID:** cp7-6
- **Jira Key:** cp7-6
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

## Workflow Tracking
**Repos:** arcade
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-05T13:02:06Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-05T11:23:07Z | 2026-08-05T11:25:41Z | 2m 34s |
| red | 2026-08-05T11:25:41Z | 2026-08-05T11:42:55Z | 17m 14s |
| green | 2026-08-05T11:42:55Z | 2026-08-05T12:22:41Z | 39m 46s |
| review | 2026-08-05T12:22:41Z | 2026-08-05T12:36:27Z | 13m 46s |
| green | 2026-08-05T12:36:27Z | 2026-08-05T12:42:42Z | 6m 15s |
| review | 2026-08-05T12:42:42Z | 2026-08-05T12:54:51Z | 12m 9s |
| green | 2026-08-05T12:54:51Z | 2026-08-05T12:58:40Z | 3m 49s |
| review | 2026-08-05T12:58:40Z | 2026-08-05T13:02:06Z | 3m 26s |
| finish | 2026-08-05T13:02:06Z | - | - |

## SM Assessment

**Story:** cp7-6 (centipede, 3pt, tdd) — adopt the shared player pause and stop the sustained voices that would ring through it. This is a house-cabinet feature, NOT a fidelity story; it carries no claim.

**Board / contention checks (all clean at setup):**
- No remote branch for cp7-6 before my claim; the only live sibling sessions are jt9-43 (a-1) and td1-12 (a-2) — neither touches centipede.
- `origin/main` had moved one commit (aeeae7c, td1-12 joust — unrelated); rebased cleanly before pushing.
- cp7-6 was `backlog` on `origin/main` as well as locally. Merge gate clean (no open PRs).

**Premise verified against the current tree (the epic description is a spec full of falsifiable file:line claims):**
- Centipede has NO existing player pause: no `@shared/pause` / `@shared/esc-overlay` / `@shared/host-helpers` import in `plugins/centipede/src/`, and no Escape in the input key sets. The Escape references in `input.ts` are only the pointer-lock exit (:158-161), exactly as the description states.
- All three shared modules exist: `src/shared/pause.ts`, `esc-overlay.ts`, `host-helpers.ts`.
- The premise HOLDS — no drift, story is current.

**Context integrity:** the full epic description rendered VERBATIM into the context Problem section; all 8 acceptance criteria copied verbatim (diffed against the epic YAML — no edits this time). Session was missing the `**Repos:**` field (known sm-setup omission) — added `arcade`. Story was left at `backlog` by sm-setup (known) — stamped `in_progress` and verified.

**Two decisions the story explicitly defers to the pipeline (NOT user rulings — the observable behavior is fixed by the ACs either way):**
1. Audio seam: shell-side live-loop tracking vs. adding a suspend seam to the shared `AudioEngine`. The description flags the shared-engine change as the wider blast radius (six other games) and implicitly prefers the narrower shell-side approach. Whoever implements must write down the choice and why (AC2).
2. Paused-time policy: discard (tempest) vs. modulus (red-baron). Must be chosen explicitly and tested so a long pause doesn't bank a catch-up burst (AC4).

These are design choices TEA/Dev own; RED is writable around the observable behavior regardless, so no ruling was requested.

**Purity note for TEA:** pause lives in `src/main.ts` and `src/shell/` ONLY — no pause field in `SimState`, no listener in core, or `tests/purity.test.ts` reddens. Test precedents to mirror are named in the context (red-baron `pause-adoption.test.ts`, battlezone `pause-gate`/`pause-overlay`, and centipede's own SoundSurface doubles for the loop-silencing test). Be honest about the seam: the live keydown→rAF path has no unit seam — verify it with an actual manual run.

**Routing:** phased tdd → handing off to TEA for the red phase.

## Delivery Findings

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Question** (non-blocking): AC2 and AC4 each defer a decision to the implementer that
  the story requires be *written down* — the audio silencing SEAM (shell-side live-loop
  tracking vs a suspend seam added to the shared `AudioEngine`) and the paused-time POLICY
  (discard vs modulus). The RED tests fix the observable OUTCOME of both (voices silent-then-
  restored through the double; no catch-up burst on resume) but cannot assert the prose
  rationale exists. Affects `.session/cp7-6-session.md` / the story record (Dev must record
  which seam and which policy and why, and the blast radius if the shared engine is touched).
  *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): `plugins/centipede/tools/pokey-bake/bake-sfx.test.mjs` has a
  pre-existing FULL-SUITE FLAKE — two AC3 tests ("a manifest cue with no bake spec THROWS",
  "an INHERITED spec is not a spec") failed once under `npx vitest run` (all 783 files) but
  PASS in isolation (67/67) and passed on an immediate re-run of the full suite (12019/12019).
  It is order/parallelism-dependent and unrelated to cp7-6 (my diff touches no bake/manifest/
  fixture input). Affects `plugins/centipede/tools/pokey-bake/bake-sfx.test.mjs` (needs test
  isolation — likely a shared-object or module-registry leak from a concurrent file).
  *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): asteroids has the SAME class of edge-driven sustained voice
  cp7-6 fixes for centipede — `plugins/asteroids/src/core/sim.ts:321-322` emits
  `thrust-start`/`thrust-stop` dispatched to `startLoop`/`stopLoop('thrust')`
  (`plugins/asteroids/src/shell/audio-dispatch.ts:40-44`). asteroids IS a pause adopter, but its
  pause gate is `stepUnlessPaused` with `playEventSounds` INSIDE the thunk
  (`plugins/asteroids/src/main.ts:104-119`), with no explicit thrust-loop silencing on the pause
  edge — so pausing while thrusting appears to ring the thrust loop through the pause (the exact
  bug this story fixes, one game over). Affects `plugins/asteroids/src/main.ts` (verify by ear;
  if unsilenced, port centipede's shell-side loop-tracking). *Found by Reviewer during code review.*

### Reviewer (code review, round 2)
- **Gap** (non-blocking): battlezone has the SAME unsilenced-continuous-voices-through-pause bug this
  story fixes for centipede. `updateContinuousSounds` (engine hum / track rattle / saucer warble) is
  called ONLY inside `if (game !== prev)` (`plugins/battlezone/src/main.ts:159-164`); on a paused
  frame `game === prev` (stepUnlessPaused freezes the reference), so the block is skipped and the
  continuous loops are never re-read or silenced — they ring at their pre-pause level through the
  pause. Affects `plugins/battlezone/src/main.ts` (verify by ear at `just serve` → /battlezone/ →
  pause while moving; if unsilenced, silence continuous voices on the pause edge as centipede now
  does). This joins the asteroids/thrust finding above — two adopters with the same latent exposure.
  *Found by Reviewer during round-2 re-review (surfaced while verifying cp7-6's comment claim that
  battlezone is "silenced for free", which is the falsehood CA-3 rejects).*

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC6 enforced via the `@shared/host-helpers` import rather than a source-text scan of the wiring**
  - Spec source: context-story-cp7-6.md, AC6
  - Spec text: "the keydown wiring keeps the !e.repeat edge test and the key.toLowerCase() that installPauseToggle bakes in"
  - Implementation: `pause-adoption.test.ts` requires a src module to import `@shared/host-helpers` (installPauseToggle), which bakes in BOTH guards, instead of grepping main.ts for `!e.repeat`/`toLowerCase` (a source-text guard is exactly the lang-review #15/#25 trap).
  - Rationale: The story is emphatic that centipede's hand-rolled listeners are "how those two get missed"; requiring the helper import is the un-trappable way to guarantee both guards. A correct hand-roll would fail this test and require a design-deviation from Dev — the intended friction.
  - Severity: minor
  - Forward impact: Dev must adopt installPauseToggle (the recommended path); a hand-rolled listener is a deliberate deviation Dev must justify.
- **AC2 silencing must be observable through the existing SoundSurface double (a pure ctx-suspend seam would not satisfy it)**
  - Spec source: context-story-cp7-6.md, AC2
  - Spec text: "goes SILENT for the duration of the pause and resumes correctly, asserted through the existing SoundSurface double … shell-side loop tracking vs a suspend seam on the shared engine"
  - Implementation: `pause-behaviour.test.ts` asserts the ringing set is emptied via `stopLoop` on the double at the pause edge and restored via `startLoop` on resume. Shell-side tracking satisfies this directly; a shared-engine suspend seam satisfies it ONLY if it stops each live loop (visible on the double). A pure `AudioContext.suspend()` that leaves the loops "open" on the double would NOT.
  - Rationale: AC2 names the existing double as the instrument; a silencing invisible to it cannot be "asserted through the existing SoundSurface double." Both listed seams remain open provided their effect is visible there — the story's own verification requirement, not a new constraint I added.
  - Severity: minor
  - Forward impact: If Dev chooses the shared-engine suspend seam, its silencing must surface as per-loop stops on the engine (and Dev owns the six-game blast-radius note).
- **AC3 overlay PLACEMENT (visible ctx, after the integer blit, not pixel-scaled) is verified by MANUAL run, not automated**
  - Spec source: context-story-cp7-6.md, AC3 + the story's "be honest about the seam" note
  - Spec text: "The overlay is drawn on the VISIBLE ctx after the integer-scale blit … not into the 240x256 logical backbuffer, so the card is not pixel-scaled"
  - Implementation: The automated tests assert only that `drawEscOverlay` is CALLED while paused and NOT during play. The node ctx stub has no stroke/beginPath, and distinguishing the visible ctx from the logical backbuffer through the stub has no clean seam — placement is an acceptance-by-eye, per the standing "shell IO is verified by running the game" convention every adopter declares.
  - Rationale: Matches the story's explicit instruction to frame the live keydown→rAF→canvas path as a manual run; over-automating placement would couple the test to stub internals.
  - Severity: minor
  - Forward impact: Reviewer/Dev must DO the manual run (`just serve` → /centipede/ → Escape) and confirm the keybind card renders crisp over the frozen field, not pixel-scaled. Record the manual-run result before finish.

### Dev (implementation)
- **Modified the sc1 shell-convergence guard to permit centipede's DELIBERATE pause growth**
  - Spec source: `tests/shell-convergence.test.mjs` AC-1 growth check + `docs/ops/shell-adoption-matrix.md`
  - Spec text: "no game GROWS a behaviour — a helper is adopted only where the behaviour already exists" (the sc1 invariant: an `adopted` cell must PERFORM the behaviour at the recorded baseline 088bc3d).
  - Implementation: centipede's `installPauseToggle` cell flips `behaviour-absent`→`adopted`. That cell cannot satisfy the growth check (centipede had no pause at 088bc3d) AND cannot satisfy AC-3's non-empty-range guard if the baseline is moved forward (the growth+adoption land in one commit). Added a narrow `DELIBERATE_GROWTH` set exempting `centipede/installPauseToggle` from the "existed at baseline" test ONLY; reconciled the matrix prose.
  - Rationale: The growth check encodes sc1's REFACTOR-only rule ("must not grow one HERE", i.e. during the convergence), not a permanent ban. cp7-6 is a user-blessed feature that deliberately adds the house pause. The exemption is minimal — the `adopted`-requires-import-and-call check is untouched, so the cell still must genuinely wire the helper in the tree (a false claim cannot pass).
  - Severity: moderate
  - Forward impact: A future game that legitimately grows a shell behaviour follows the same pattern (add a cited `DELIBERATE_GROWTH` entry). The guard's power against an accidental refactor-growth is preserved for every other cell.
- **Placed the pause wiring AFTER the existing listeners so no live listener lands on a RETIRED citation line**
  - Spec source: `plugins/centipede/tests/audio-citations.test.ts` (the cp5-2 self-citation gate) + lang-review #24 (historical vs live citations)
  - Spec text: RETIRED = {`main.ts:183`, `:84-86`, `:92-94`} — historical citations the prose disowns; the gate refuses a retired number that currently points at a listener/rAF.
  - Implementation: The natural placement (pause block right after `const audio = createAudio()`) pushed the initials keydown listener onto line 183 — a number frozen historical prose permanently references. Re-anchoring history is laundering, and `183` cannot be both RETIRED-historical and a live listener anchor. Relocated the block to after `resize()`, so the existing listeners shift only by the +4 imports and no live listener lands on 183/84/92. Re-anchored the LIVE cp5-2 citations to their new lines; left the historical ones untouched.
  - Rationale: Keeps the historical citations honest (unmoved) while giving the live ones correct anchors — the only placement that satisfies both.
  - Severity: minor
  - Forward impact: none — a coherent "listeners" grouping; the citation gate stays green.

### Reviewer (audit)
- **TEA: AC6 enforced via the `@shared/host-helpers` import** → ✓ ACCEPTED by Reviewer: correct — an import-existence guard is un-trappable where a `!e.repeat`/`toLowerCase` source-text scan would be the lang-review #15/#25 trap; the tree honours it (installPauseToggle imported + called).
- **TEA: AC2 silencing observable through the existing SoundSurface double** → ✓ ACCEPTED: the AC names the double as the instrument; a silencing invisible to it could not be "asserted through" it. Dev's shell-side stopLoop/startLoop is visible on the double, so it satisfies the AC as written.
- **TEA: AC3 placement verified by MANUAL run** → ✓ ACCEPTED: consistent with the standing "shell IO is verified by running the game" convention; the manual run was done (Dev Assessment: frozen/resume/no-burst confirmed live, overlay drew without throwing).
- **Dev: DELIBERATE_GROWTH exemption for centipede/installPauseToggle** → ✓ ACCEPTED: the growth check encodes sc1's refactor-only rule; cp7-6 is a deliberate feature growth. The exemption is narrow (waives only the "existed at baseline" test) and the adopted-requires-import-and-call check still holds the cell to wiring the helper, so a false claim cannot pass. Verified the guard's power is preserved for every other cell.
- **Dev: pause wiring placed after the listeners to avoid a live listener landing on a RETIRED citation line** → ✓ ACCEPTED: relocating to keep historical citation `183`/`84-86`/`92-94` honest (unmoved) while giving the live citations correct anchors is the only placement satisfying both; rule-checker #24 confirmed no live stale survivor.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 3-point feature story with 8 ACs — behaviour to pin, not a chore bypass.

**Test Files:**
- `plugins/centipede/tests/pause-adoption.test.ts` — structural adoption (imports of `@shared/pause` / `/esc-overlay` / `/host-helpers`) + contract pins on the shared API and the `isPauseKey` negative key set (AC6, AC7).
- `plugins/centipede/tests/pause-behaviour.test.ts` — the live behaviour, booted through `helpers/boot-shell` with a recording audio double and a recording `drawEscOverlay`: Escape freezes the sim, the four edge-driven sustained voices are silenced through the pause and restored on resume, the overlay is drawn only while paused, and a long pause does not fast-forward on resume (AC1, AC2, AC3, AC4).

**Tests Written:** 16 tests (8 RED + 8 green contract-pins/guards/preconditions) covering 6 of the 8 ACs by automation; AC3-placement and AC5 (pointer-lock) by manual run.
**Status:** RED (8 failing — ready for Dev). Full centipede project: **8 failed | 1248 passed**; `tsc --noEmit` clean.

### Rule Coverage

| Rule / AC | Test(s) | Status |
|-----------|---------|--------|
| AC1 sim freezes | `the live SimState reference does not change across the entire paused span` · `no sim step ran while paused` | failing |
| AC2 voices silenced + resume | `every voice that was ringing is stopped` · `no sustained voice is (re)started while paused` · `the voices resume ringing after Escape` (guard) | failing (2) / green (1) |
| AC3 overlay drawn while paused | `drawEscOverlay is called during the paused span` · `…NOT called while playing` (guard) | failing (1) / green (1) |
| AC4 no catch-up burst on resume | `does NOT fast-forward on resume` (guard — holds on no-pause code, bites a banking impl) | green (guard) |
| AC5 pointer-lock collision | — | MANUAL (documented deviation) |
| AC6 adopts @shared/pause + host-helpers | `imports @shared/pause` · `imports @shared/esc-overlay` · `imports @shared/host-helpers` | failing (3) |
| AC7 negative key set | `isPauseKey answers ONLY the lowercased Escape` | green (contract pin) |
| AC8 no fidelity claim | (no claim JSON added; guarded by centipede's existing audit/claim suites staying green) | n/a |
| lang-review #14 (edge dropped at pause) | `every voice that was ringing is stopped` · `no sustained voice is (re)started while paused` | failing |
| lang-review #15/#25 (token vs claim) | adoption regexes anchor to the QUOTED specifier, not a bare word | green (design) |
| lang-review #8 (mock types match) | recording engine typed to `AudioEngine`; `tsc` clean | green |

**Rules checked:** 3 of 26 lang-review rules directly applicable to this diff (#14 edge-at-pause, #15/#25 source-guard anchoring, #8 mock typing); all covered.
**Self-check:** 0 vacuous tests. Test 7 was refactored from a duplicate of the net-open check into a distinct raw-stream probe. Non-vacuity guarded explicitly: the "a voice is ringing before pause" precondition fails loudly if the run never reaches live play.

**Note for Dev — the two decisions to WRITE DOWN (AC2/AC4):** pick the audio seam (recommend shell-side live-loop tracking — the shared-engine suspend touches six other games) and the paused-time policy (the pump-callback `if (paused) return` discards paused time for free, tempest's model), and record which and why. The wiring sites are named in the context; the gate belongs in the `pumpFrame` step callback (main.ts:187-205), `render()` stays OUTSIDE it, and `drawEscOverlay` goes on the visible ctx AFTER the blit (main.ts:225).

**Handoff:** To Dev for implementation.

## Dev Assessment

**Implementation Complete:** Yes

**The two decisions the story required be written down (AC2, AC4):**
- **Audio seam — SHELL-SIDE LIVE-LOOP TRACKING** (not a suspend seam on `@shared/audio`).
  `main.ts` mirrors the four sustained voices' open/closed state from the core's own
  `-start`/`-stop` edges (`trackLoopEdges`, reusing `EVENT_SOUND` so no cue name can drift),
  then at the pause edge stops each ringing loop and at the resume edge restarts exactly that
  set. Chosen because a suspend seam on the shared engine has a six-game blast radius; this is
  the narrower change and keeps the fix entirely in centipede's shell. The tracking READS the
  events rather than wrapping the engine, so `playEventSounds` still receives the raw engine
  and `tests/audio-wiring.test.ts`'s "same engine main.ts constructed" pin stays green.
- **Paused-time policy — DISCARD** (tempest's model; red-baron instead takes the modulus).
  The gate is `if (paused) return` INSIDE the `pumpFrame` step callback: `pumpFrame` still
  drains the accumulator by calling the callback once per whole timestep, but each call returns
  early, so nothing banks. Confirmed live: after a multi-second real pause, the first resumed
  500 ms ran exactly 30 sim frames (≈59.9 Hz), not a catch-up burst.

**Files Changed:**
- `plugins/centipede/src/main.ts` — imports `@shared/pause` / `@shared/host-helpers` /
  `@shared/esc-overlay`; `installPauseToggle` on Escape; loop tracker + pause/resume-edge
  silence/restore computed at the frame's single top (lang-review #14); `if (paused) return`
  gate in the pump callback; `drawEscOverlay` on the visible ctx after the integer blit; the
  `CENTIPEDE_PAUSE` keybind card.
- `plugins/centipede/tests/{audio-citations,audio-dispatch,audio-gesture-gate,audio-hot-path,audio-seam-scope,audio-wiring}.test.ts`,
  `helpers/boot-shell.ts` — re-anchored the cp5-2 LIVE main.ts self-citations to their new
  lines (historical `:183`/`:84-86`/`:92-94` left untouched); updated the `:20-21` import regex.
- `docs/ops/shell-adoption-matrix.md` — centipede pause `behaviour-absent`→`adopted`; prose reconciled.
- `tests/shell-convergence.test.mjs` — narrow `DELIBERATE_GROWTH` exemption for the cp7-6 growth.

**Tests:** GREEN. centipede project **1256/1256**; orchestrator **390/390**; full fleet
**12019/12019** (0 fail on re-run — one pre-existing bake-sfx full-suite flake is filed above,
unrelated to this diff); `tsc --noEmit` clean. The 8 RED tests from the red phase now pass.

**Manual run (AC3 placement + AC5 pointer-lock — the no-unit-seam path):** served this checkout
on `:5290`, drove `/centipede/` in a real browser. Enter started a live game; **Escape froze the
sim** (`window.__sim()` returned the same reference across 500 ms); **a second Escape resumed**
(reference changed, +30 frames/500 ms — ROM cadence, no fast-forward, live AC4 confirmation);
`drawEscOverlay` ran on the visible ctx after the blit with the sim frozen beneath and threw
nothing (console clean but for a favicon 404). Escape/pointer-lock coexist coherently (AC5): the
Escape that pauses also releases pointer lock, `createPointerLock`'s exit callback resets input,
and a click re-locks on resume.

**Branch:** none
**Landed on:** `main` (trunk-based) — feat `a2efc7c`, matrix/guard `f98e71a`, r1 rework `ac883b8`, r2 rework `230ccb4`; rebased onto siblings' jt9-43/td1-12/sw8-24 with the full suite re-run green afterward.

**Handoff:** To Reviewer for code review.

## Subagent Results

_Round 3 (re-review of the round-2 comment-only fix, commit `230ccb4` — 3 comment lines). Rounds 1–2 tables preserved in git history. Security + rule-checker domains are unchanged by a comment-only edit and were cleared in round 2; re-ran the two relevant specialists (preflight for GREEN, comment-analyzer for the CA-3 finding's own domain)._

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — GREEN: lint pass, centipede 1256/1256, orchestrator 390/390; comment-only fix, zero regressions |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — no runtime change this round (comment text only) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no runtime change this round |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — no test change this round; all round-1 test findings closed in round 2 |
| 5 | reviewer-comment-analyzer | Yes | clean | none | **CA-3 CLOSED** — both false sibling claims removed; new hedged text ("NOT verified silenced here") verified accurate against asteroids main.ts:104-119 and battlezone main.ts:159-164; line-neutral, `:203`/`:291` citations intact; no new inaccuracy |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — no type change this round |
| 7 | reviewer-security | Yes (round 2, carried) | clean | none | N/A — comment-only edit adds no surface; round-2 clear stands (no injection, ReDoS-safe regex unchanged) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — no code change this round |
| 9 | reviewer-rule-checker | Yes (round 2, carried) | clean | none | round-2 26-check sweep stands; comment edit touches no rule surface (#17 lying-comment now compliant — CA-3 closed) |

**All received:** Yes (2 re-ran this round: preflight, comment-analyzer; security + rule-checker carried from round-2 clears as the comment-only edit touches neither domain; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred. All four findings from rounds 1–2 (CA-1, RC-1, RC-2, CA-3) verified CLOSED.

## Reviewer Assessment

**Verdict:** APPROVED (round 3)

**Third and final review of cp7-6.** Round 1 rejected a four-defect cluster; round 2 confirmed three
of those genuinely closed and rejected on one — CA-3, a fresh false comment the round-1 rework had
introduced (it claimed battlezone was "silenced for free" and asteroids took the "same care", both
verified wrong). The round-2 fix (`230ccb4`) is comment-only: `main.ts:145-147` reworded
line-neutrally to drop both false sibling claims and instead flag asteroids' thrust and battlezone's
continuous voices as **"NOT verified silenced here — see Delivery Findings."** That statement is
accurate and correctly hedged (verified against `asteroids/src/main.ts:104-119` and
`battlezone/src/main.ts:159-164` — both do ring their loops through a pause), the edit is exactly
3 lines → 3 lines, and the `:203`/`:291` citations did not drift. CA-3 is CLOSED. **All four findings
from rounds 1–2 are now resolved; nothing new surfaced.**

**Findings ledger (final):**
- **CA-1** [LOW][DOC] stale citation `:203`→`:291` — CLOSED (round 2).
- **RC-2** [MEDIUM][RULE] `importersOf` comment-strip (#15) — CLOSED (round 2, mutation-verified).
- **RC-1** [LOW][RULE][TEST] esc-overlay mock type-anchoring (#8) — CLOSED (round 2).
- **CA-3** [MEDIUM][DOC] false battlezone/asteroids sibling claims (#17) — CLOSED (round 3, this fix).

**Data flow traced:** Escape keydown → `installPauseToggle`'s window listener toggles `paused` →
`frame()` reads `pause.isPaused()` at its single top → pause edge silences the live loops
(`audio.stopLoop` per voice, visible on the SoundSurface double) + `if (paused) return` freezes the
pump step + `drawEscOverlay` on the visible ctx after the integer blit. Safe: keyboard only, core
DOM-free and untouched. Runtime behaviour was verified live in round 1 and is unchanged since (rounds
2–3 touched only comment text and test scaffolding).

**Pattern observed:** the pause/resume EDGE is computed once at the single unconditional top of
`frame()` (main.ts:237-257) — the lang-review #14 model, satisfied by construction (rule-checker
concurred round 2). VERIFIED.

**Error handling:** `EVENT_SOUND[e.type]` is a total `Record<GameEventKind, SoundName>` — never
undefined on the frame path. VERIFIED.

**5+ observations (all 8 subagent dispatch tags):**
- [DOC] CA-3 CLOSED — comment now scopes the guarantee to centipede's pause seam and defers sibling status to Delivery Findings; new hedged text verified accurate. CA-1 citation also closed/verified. **No open DOC finding.**
- [RULE] round-2 #15 (`stripComments`) + #8 (mock type) mutation-verified closed; #17 (lying comment) now compliant. Full 26-check sweep clean (round 2), untouched by a comment edit. VERIFIED.
- [TEST] test scaffolding hardened in round 1 (stripComments guard, type-anchored mock); no test changed this round; non-vacuous precondition guards intact. VERIFIED.
- [SEC] no injection surface; `stripComments` regex ReDoS-safe; comment-only edit adds nothing. Clean.
- [TYPE] no new casts; `liveLoops: Set<SoundName>`, `readonly GameEvent[]`; `EVENT_SOUND` total. Compliant.
- [EDGE] held-Escape / pause-mid-burst / empty-liveLoops / channel-stealing all correct (round-1 Devil's Advocate); unaffected by comment/test-only rounds. VERIFIED.
- [SILENT] `EVENT_SOUND[e.type]` degrade path type-safe, not a swallowed error. VERIFIED.
- [SIMPLE] the shell-side loop-tracker is the minimal fix (chosen over a six-game AudioEngine suspend seam); no dead code. VERIFIED.
- [VERIFIED] GREEN this round: lint pass, centipede 1256/1256, orchestrator 390/390 (preflight r3).
- [VERIFIED] line-neutral fix — `:203` still `createAttract`, `:291` still `playEventSounds`; no citation regression.

### Rule Compliance (lang-review typescript.md)

Final state: all round-1/round-2 violations (#8, #15, #17) CLOSED. Compliant across the sweep — #1,
#2, #4/#21, #5, #14 (pause edge at frame top, by construction), #18/#19/#26 (non-vacuous test
apparatus), #24 (all re-anchored citations verified line-by-line, no drift from the comment edit).
No open violations. One non-blocking residual noted round 2 (the `stripComments` line-comment regex
does not strip a `//` glued to non-whitespace on the same line) — does not reach the mutation the
guard defends against; left as an optional future nicety, not a condition of approval.

### Devil's Advocate

Could I be approving a still-wrong comment? The round-2 rejection turned on a verified falsehood, so I
re-verified the replacement against the actual sibling source rather than trusting the commit message:
asteroids dispatches thrust inside the `stepUnlessPaused` thunk (so a paused frame emits no
`thrust-stop`) and battlezone gates `updateContinuousSounds` on `game !== prev` (so a paused frame
skips it) — both genuinely ring through a pause, so "NOT verified silenced here" is true and, crucially,
does NOT over-claim in the other direction ("proven to ring") which would itself be an unproven
assertion. The hedge is exactly right. Could the fix have drifted a citation? Checked: 3→3 lines,
`:203`/`:291` land on the same code, the audio-citations gate is green. Is there a NEW landmine? None:
the comment now points the next maintainer to the Delivery Findings, where the two real cross-game
bugs (asteroids thrust, battlezone continuous voices) are filed as non-blocking follow-ups — turning
the round-1 false claim's harm (obscuring sibling bugs) into an accurate pointer at them. Every other
dimension was already clean and is unchanged by a comment-only edit. Approve.

### Design Deviations audit

All five logged deviations (TEA ×3, Dev ×2) were stamped ACCEPTED in round 1 and re-confirmed sound;
the rounds-2/3 comment fix introduced no new deviation. See `### Reviewer (audit)` in the Design
Deviations section.

**Data flow traced:** Escape → pause flag → frame gate (silence + freeze + overlay). Safe.
**Pattern observed:** derived pause edge at the single frame top (main.ts:237-257) — lang-review #14.
**Error handling:** `EVENT_SOUND` total map; no throw on the frame path.
**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

## Dev Rework (round 1)

All four round-1 findings fixed (commit `91936a7`; tracking stamp `c658689` after rebase):

- **[MEDIUM][DOC] CA-2 — false "only game" claim** (main.ts:143): reworded to drop "cabinet's
  ONLY game with edge-driven sustained voices"; now scopes the point to the pause seam vs
  battlezone's per-frame-level loops and notes asteroids' thrust is edge-driven too. **Kept the
  comment LINE-NEUTRAL (5 lines → 5 lines)** so no main.ts line below it shifts and the
  re-anchored citations stay correct (verified: :291 still `playEventSounds`, :203 still `createAttract`).
- **[MEDIUM][RULE] RC-2 — importersOf not comment-stripped** (pause-adoption.test.ts): added a
  `stripComments` pass before the specifier match (mirrors shell-convergence.test.mjs). Updated the
  docstring that admitted "or a comment". **Mutation-verified**: a real import still matches; a
  comment-only quote of `'@shared/pause'` (line or block) no longer does.
- **[LOW][DOC] CA-1 — stale citation** (audio-dispatch.ts:59): `src/main.ts:203` → `src/main.ts:291`
  (the call this diff moved). Verified line 59 now reads the corrected citation and :291 is the
  playEventSounds call.
- **[LOW][RULE][TEST] RC-1 — esc-overlay mock not type-anchored** (pause-behaviour.test.ts):
  switched to `importOriginal` + `Parameters<typeof real.drawEscOverlay>`, matching the audio mock,
  so the mock's params now track the real 4-arg signature at compile time.

**Verification:** centipede 1256/1256, orchestrator 390/390, `tsc` clean, tree clean — re-run green
after rebasing onto the sibling sw8-24 commit.

**Handoff:** Back to Reviewer for re-review (round 2).
## Dev Rework (round 2)

Round-2 reviewer finding CA-3 fixed (comment-only green rework):

- **[MEDIUM][DOC] CA-3 — false sibling claims in the replacement comment** (main.ts:145-147):
  removed the two verified-wrong assertions the round-1 rework introduced — "unlike battlezone's,
  re-read live and silenced for free" (FALSE: battlezone gates `updateContinuousSounds` on
  `game !== prev`, so a paused frame skips it — it rings through too) and "(asteroids' `thrust` is
  edge-driven too, same care)" (misleading: asteroids is the UNFIXED twin). New prose scopes the
  point to centipede's pause seam and flags asteroids' thrust + battlezone's continuous voices as
  **NOT verified silenced here — see Delivery Findings**, rather than asserting any sibling is handled.
  **Kept LINE-NEUTRAL (3 lines → 3 lines)** per the reviewer's steer; verified `:203` still
  `createAttract` and `:291` still `playEventSounds` — no citation drift.

The other three round-1 findings (CA-1 citation, RC-2 stripComments, RC-1 esc-overlay mock) were
blessed CLOSED by the reviewer this round and were **not touched**.

**Verification:** centipede 1256/1256, orchestrator 390/390, `tsc --noEmit` clean. No test or logic
change — comment text only.

**Handoff:** Back to Reviewer for re-review (round 3).