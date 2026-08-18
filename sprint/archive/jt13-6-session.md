---
story_id: jt13-6
jira_key: jt13-6
epic: jt13
workflow: tdd
---
# Story jt13-6: Wave announcements (egg / survival / etc.) never render — wire waveBeats to the shell

## Story Details
- **ID:** jt13-6
- **Jira Key:** jt13-6
- **Workflow:** tdd
- **Priority:** p2
- **Points:** 5
- **Type:** bug
- **Stack Parent:** none
- **Branch Strategy:** gitflow (feat/jt13-6-wire-wavebeats-to-shell)
- **Branch:** feat/jt13-6-wire-wavebeats-to-shell
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-18T19:45:00Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T18:53:11Z | 2026-08-18T18:56:10Z | 2m 59s |
| red | 2026-08-18T18:56:10Z | 2026-08-18T19:10:00Z | 13m 50s |
| green | 2026-08-18T19:10:00Z | 2026-08-18T19:27:07Z | 17m 7s |
| review | 2026-08-18T19:27:07Z | 2026-08-18T19:38:11Z | 11m 4s |
| green | 2026-08-18T19:38:11Z | 2026-08-18T19:40:46Z | 2m 35s |
| review | 2026-08-18T19:40:46Z | 2026-08-18T19:45:00Z | 4m 14s |
| finish | 2026-08-18T19:45:00Z | - | - |

## Background

Egg and survival rounds (and all wave types) do not announce themselves on screen. The core has the seam:

- `wave.ts:waveBeats()` returns ROM WAVMSG labels per resolved type (INTRO1/2, COOP1/2, SURV1, GLAD1/2/3, EGG1, PTER1)
- They are converted to `{kind:'beat',message}` events in **only one place** — `sim.ts:1654-1655`, the wave-1 demo seed (the comment at sim.ts:1666 confirms: "the wave-1 complement is assembled here rather than arriving through the wave-advance path")
- The **real wave-advance path emits no beats** — that is the bug
- The `beat` SimEvent variant is declared at `plugins/joust/src/core/sim.ts:504`: `| { kind: 'beat'; message: string }`
- **Nothing in plugins/joust/src/shell/ or main.ts consumes `beat` events** — no label->display-text map and nothing paints them

## Acceptance Criteria

Three pieces of work:

1. **Emit beats on real wave advances** (not just the wave-1 seed)
   - The wave-advance path needs to emit `beat` SimEvents with ROM WAVMSG labels

2. **Add the label → on-screen-text map**
   - SURV1 → its ROM phrase
   - EGG1 → its ROM phrase
   - INTRO1/2, COOP1/2, GLAD1/2/3, PTER1 → their ROM phrases
   - Source from the ROM WAVMSG strings

3. **Render on-screen with ROM timing**
   - ~1s beats per wave (SHELL owns durations per wave.ts:352-353, #180/6 and #90/6, JOUSTRV4.SRC:2045,2601)
   - Consume `beat` events in the shell render/audio dispatch
   - Display text on-screen with correct timing

## Contention Note

**Sibling checkout a-1 is in `green` phase on jt13-8 (dead-twin retirement)**, which also edits `plugins/joust/src/core/sim.ts` and `transporter.ts`. The targets are a **different region** than jt13-6's beat-emission path:
- jt13-8 targets: `hatchEgg`, `waveEnemyComplement`, `stepPlaying`, `toTitle`, `playerTurn`, `groundStep`, `wrapEggX`, `bridgeDestroyedOnWave`
- jt13-6 targets: beat emission in wave advance

**Same file, different region** — expect a rebase if jt13-8 merges first (p3). Record this so whoever finishes second trial-merges `origin/develop` before merging.

## Delivery Findings

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## Sm Assessment

**Verdict: GO.** Setup complete, story is a clean p2/5pt TDD story with a well-defined
core→shell seam. All pre-handoff checks pass: session + context files exist, branch
`feat/jt13-6-wire-wavebeats-to-shell` cut from `develop` and pushed, story stamped
`in_progress`, merge gate clean (no blocking PRs).

**Blockers anticipated and cleared at setup:**

1. *Sibling ownership* — probed `git branch -r` (no jt13-6 branch) and sibling
   `.session/` dirs (only a-1 on jt13-8, a different story). jt13-6 was unowned; I
   claimed it and pushed the branch so it is no longer invisible.

2. *Stale description coordinate* — the epic pins beat-event creation at `sim.ts:1519`.
   Verified against the tree: it is now `sim.ts:1654-1655` (line drift). The substance
   holds — that site is the wave-1 demo seed (confirmed by the `sim.ts:1666` comment),
   and the real wave-advance path emits no beats. Background above renders the corrected
   coordinates; the epic YAML still carries the old number, so this session is the record
   of which is current.

3. *Verified the other two claims* — `waveBeats()` is live at `wave.ts:366`; the `'beat'`
   variant is declared at `sim.ts:504`; grep confirms nothing in `shell/` or `main.ts`
   consumes `'beat'`. The bug premise is real, not stale.

**Contention (non-blocking):** a-1 is in green on jt13-8 (dead-twin retirement), which
edits `sim.ts`/`transporter.ts` in a different region (see Contention Note). jt13-8 is
p3 and unpushed. Same-file/different-region — whoever finishes second trial-merges
`origin/develop` before merging.

**For TEA (RED):** three testable ACs. Suggested RED shape — (a) a core test that a real
wave advance (wave N→N+1, not the wave-1 seed) yields `beat` SimEvents carrying the
resolved type's WAVMSG labels; (b) a label→text map test (SURV1/EGG1/... → their ROM
phrases); (c) a shell test that a `beat` event paints on-screen with ROM ~1s timing.
The pointer read `setup` on arrival.
## TEA Assessment (RED — Han Solo)

**RED state: 8 failing tests, all feature-absent, all for the right reason.** Full joust
suite `8 failed | 3847 passed`; `npm run lint` clean. Commit `0a13b1f0`. One file:
`plugins/joust/tests/wave-announce-jt13-6.test.ts`, three describe groups (one per AC).
The fixtures are proven correct — every `expect(after.wave).toBe(...)` advance-guard
PASSES; only the beat emission / map / renderer is missing.

### What Dev (Yoda) must build — three seams

1. **AC-1 — emit beats on the real wave advance** (`src/core/sim.ts`, the `clearable`
   block in `stepSim`). Today only `createWaveSim` turns `waveBeats()` into `beat`
   SimEvents; the advance emits none. On advance, resolve the type with
   **`dispatchWaveType(waveRowAt(newWave).status, playersAlive)`** — NOT `rawWaveType` —
   and append `waveBeats(type).map(b => ({kind:'beat', message:b.message}))` to the
   events assembled at `stepSim`'s single return. `playersAlive` comes from the player
   processes present. The survival test (solo → coop-status wave → `SURV1`) fails if you
   use the raw type; that is deliberate (the WCOOP→WAVSUR degrade law, wave-contract).

2. **AC-2 — the label→text map** (`src/core/wave.ts`, new export `waveMessageText(label)`).
   Core-owned per the `GAME_OVER_TEXT` precedent (core holds the ROM string, the shell
   reuses). **Ground truth is transcribed in the test's `ROM_WAVMSG_TEXT` table**, cited
   to `MESSEQU.SRC:104-153` / `PHRASE.SRC` via the WAVMSG beat labels at
   `JOUSTRV4.SRC:2416-2433`. Do not invent phrasing. Note INTRO1 = `PREPARE TO JOUST`
   (PHRASE.SRC, no ellipsis — the MESSEQU comment's `...` is not in the rendered phrase).

3. **AC-3 — the shell renderer** (`src/shell/waveAnnounce.ts`, new module). Export
   `WAVE_BEAT_HOLD_FRAMES` (~1s; ROM `#180/6` at `JOUSTRV4.SRC:2045`, "WAIT A SECOND" —
   derive the frame count as gameOverScreen's "~88 ticks" was derived; the test only pins
   a ≥30 floor) and a pure `announcementAt(beats, framesSinceWave)` returning the
   currently-showing beat + its `text` (**sourced from `waveMessageText` — reuse, do not
   re-transcribe**; a test asserts `announcementAt(...).text === waveMessageText(label)`).
   Then wire it into `main.ts`/`paintSim` (the render loop already reads `game.events` for
   audio at `playEventSounds`; the beat renderer is the on-screen counterpart). The main.ts
   wiring itself is not unit-pinned — keep the pure selector testable and thin the loop.

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

| Check | How covered |
|-------|-------------|
| **#27** gate/emit in a mode that never creates the thing | Egg and survival waves pinned EXPLICITLY (`firstWaveResolving` finds the real table rows; survival is the coop→degrade mode a solo game is in) — the exact jt11-4 failure shape. |
| **#29** ordering assertion standing in for a magnitude | AC-3 timing is magnitude: hold ≥ 30 frames (ROM floor), and beat 2 does not replace beat 1 until a *whole* hold elapses — a too-fast 1-frame flip fails. |
| **#15 / #18 / #26** vacuous / self-referential guards | No source-text greps; every assertion pins a concrete ROM value or an observed sim result. Completeness sweep asserts `labels.size > 0` before iterating. Egg/survival tests pin the advance-happened guard separately from the beat assertion. |
| **#19** population filtered by a neighbouring field | The label completeness sweep walks ALL resolved types' `waveBeats`, not a hand-picked subset, so a beat with no text mapping reddens. |
| **#8** test quality (no `as any`) | Typed `Extract<>` narrowing; no `as any`. |

### Notes for the pipeline
- **`comment_analyzer` is disabled** in this project's reviewer subagents (per SM sidecar).
  The label→text map and the ROM citations are the domain a comment specialist would guard;
  Reviewer should read the `ROM_WAVMSG_TEXT` table against `MESSEQU.SRC`/`PHRASE.SRC` by hand.
- **Contention:** a-1 is in green on jt13-8, editing `sim.ts` in a different region. Dev's
  AC-1 edit is in the `clearable` block; trial-merge `origin/develop` before finish if jt13-8
  lands first.
- The RED-phase pointer read `red` on arrival to TEA.
## Dev Assessment (GREEN — Yoda)

**GREEN complete. All 9 jt13-6 tests pass; full joust suite 3855 green; orchestrator
503 green; lint clean. Visually confirmed the announcement renders in-game.** Commit
`4d20004d`, pushed.

### What was built (four files)

1. **`src/core/wave.ts`** — `waveMessageText(label)` + the frozen `WAVMSG_TEXT` map.
   Ground-truth ROM strings (MESSEQU.SRC:104-153 / PHRASE.SRC), core-owned per the
   GAME_OVER_TEXT precedent. Throws on an unknown label so a beat can never announce blank.

2. **`src/core/sim.ts`** — the real wave-advance (`clearable` block in `stepSim`) now
   emits the wave's WAVMSG beats. Resolves the type through `dispatchWaveType` with
   **players derived from the live `processes`** (not the hardcoded `{p1:true,p2:true}`
   the seed and pendingWaveEnemies use), so a solo game's co-op wave correctly degrades
   to SURVIVAL. Collected in a `waveAdvanceEvents` array declared at the top of `stepSim`
   and merged into the returned event log at the single return site.

3. **`src/shell/waveAnnounce.ts`** (new) — `WAVE_BEAT_HOLD_FRAMES = 60` (~1s at the 60 Hz
   shell timebase, the same frame-count convention as `GAMEOVER_HOLD_FRAMES = 88`; ROM
   `#180/6` "WAIT A SECOND", JOUSTRV4.SRC:2045) and the pure selector
   `announcementAt(beats, framesSinceWave)`, which returns the current beat + its ROM text
   (via `waveMessageText` — reuse, not re-transcription) or null once the run elapses.

4. **`src/main.ts`** — consumes fresh `beat` SimEvents each pumped frame (the on-screen
   counterpart to `playEventSounds`), diffing `cabinet.game.sim.events` against the prior
   frame exactly as `game.ts` drains fresh score events. Resets the clock on a fresh beat
   run, increments it otherwise, and paints `announcementAt` centred in FONT57 during the
   `playing` render. Colour index (5) and Y (72) are shell placeholders in the same
   `GAMEOVER_*`-style convention (a human smoke test tunes them).

### Verification

- Automated: 9/9 jt13-6 tests, full joust 3855, orchestrator 503, `tsc --noEmit` clean.
- **Visual (Playwright headless, my tree on :5291):** started a game, the wave-1 intro
  painted "PREPARE TO JOUST" centred in yellow over the playfield. A probe confirmed the
  beats `['INTRO1','INTRO2']` are captured and the clock advances; the announcement was
  invisible in earlier shots only because ~6 s of tool latency outran the 2 s on-screen
  hold — not a defect. Cranking the hold made it render; reverted to 60, tree clean.

### Notes for the Reviewer (Obi-Wan)

- **Design decision — main.ts wiring included.** The AC-3 unit test pins only the pure
  selector; a selector nothing calls would leave the story's actual symptom ("nothing
  paints them") unfixed, so I wired the consumer + render. That wiring is not unit-pinned
  (canvas render); it was verified visually instead. Worth a look: the fresh-beat diff
  (`prevSimEvents`) and the reset-on-enterPlaying.
- **FONT57 'T' glyph** renders thin ("PREPARE IO JOUSI") — a pre-existing FONT57 trait
  shared with the game-over/select overlays, not this story's code (the correct string is
  passed to `layoutText`). Out of scope; flag if you disagree.
- **ROM-fidelity of the text map** is the domain a comment specialist would guard, and
  `comment_analyzer` is disabled here — please read `WAVMSG_TEXT` against MESSEQU.SRC/
  PHRASE.SRC directly. INTRO1 = 'PREPARE TO JOUST' (PHRASE table; MESSEQU's '...' is comment).
- **Contention:** jt13-8 (a-1) edits sim.ts in a different region; trial-merge origin/develop
  before finish if it lands first.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (3855 joust green, orchestrator green, lint pass, 0 smells, tree clean) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 1: GLAD3 string 'FOR DISMOUNTING FIRST OSTRICH' should be '...FIRST PLAYER' (wave.ts + test oracle) | CONFIRMED — blocking |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none (unmapped-label case statically unreachable; announcementAt guards <0; no DOM sinks) | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1: catch(e as Error) unknown-cast in test loader (#11), reproduces existing repo idiom | Noted — non-blocking (downgraded) |

**All received:** Yes (4 enabled returned; 5 disabled via settings)
**Working-tree audit:** CLEAN (`pf reviewer audit-tree` exit 0; git status clean)

## Reviewer Assessment

**Verdict:** REJECTED — 1 blocking ROM-fidelity defect. Everything else is clean:
preflight green, security clean, rule-checker's 30-check sweep found only a pre-existing
idiom, and the core design (beat emission at the single wave-advance branch, the ~1s
magnitude, the survival/egg degrade modes, index guards, core purity) is sound and
independently verified.

### CONFIRMED — BLOCKING

**[DOC] F1 — GLAD3 renders the wrong ROM word: 'OSTRICH' should be 'PLAYER'.**
`plugins/joust/src/core/wave.ts` `WAVMSG_TEXT.GLAD3 = 'FOR DISMOUNTING FIRST OSTRICH'`
(cited to MSW10). This is transcribed from `MESSEQU.SRC:160`'s EQU *comment*, but the
module's own header rule (and the INTRO1 precedent it sets) says PHRASE.SRC — the phrase
table the game actually renders — outranks MESSEQU when they disagree. They disagree here.
I verified the raw bytes myself: `PHRASE.SRC:280-281`
`MS10 FCB CF,CO,CR,CSPC,CD,CI,CS,CM,CO,CU,CN,CT,CI,CN,CG,CSPC / CF,CI,CR,CS,CT,CSPC,CP,CL,CA,CY,CE,CR+END`
spells **"FOR DISMOUNTING FIRST PLAYER"** (...C,P,L,A,Y,E,R), and `PHRASE.SRC:1`
`FDB MS10 $F5 'FOR DISMOUNTING FIRST PLAYER'`. The gladiator wave's third beat would show
the wrong word on screen — a fidelity defect, in a project whose rule is ROM-wins.
Failure scenario: a gladiator wave (GLAD3 beat) displays "...FIRST OSTRICH" where the 1982
machine shows "...FIRST PLAYER".
The **same wrong string is duplicated** into the test's own ground-truth oracle
(`tests/wave-announce-jt13-6.test.ts` `ROM_WAVMSG_TEXT.GLAD3`), so the AC-2 sweep is
self-consistently wrong and passes while the value is wrong — the fidelity guard is broken,
not just the string. **Both must change to 'FOR DISMOUNTING FIRST PLAYER'.**
(I independently byte-decoded ALL 10 mapped strings against PHRASE.SRC; the other 9 —
INTRO1/2, COOP1/2, SURV1, GLAD1/2, EGG1, PTER1 — match exactly. GLAD3 is the only defect.)

### NOTED — NON-BLOCKING (downgraded, not dismissed)

**[RULE] N1 — `catch (e) { throw new Error(\`... ${(e as Error).message}\`) }` in the test
loader** (`tests/wave-announce-jt13-6.test.ts` loadWaveAnnouncer). Matches lang-review #11
(unnarrowed unknown error). Downgraded to non-blocking: it reproduces verbatim the
established repo idiom for these dynamic-import loaders (`tests/helpers/sim-contract.ts:479/
506/533`, `tests/helpers/wave-contract.ts:328/361`); `import()` here rejects only with a
module-resolution `Error`, so `.message` is defined in practice; and narrowing it here would
diverge from the convention the whole loader family uses. Not required for this story; if the
project wants it, fix the whole family in one pass, not one new instance.

### Reviewer observations (no change required)

- **playersAlive is derived from process presence, not the session lives ledger.** Correct
  for every common case (solo → survival; 2-player both-present → coop) and matches the ROM
  degrade law. In a rare 2-player transient (P2 dead-with-lives at the exact wave-clear frame),
  it could announce SURVIVAL for one wave. This is inherent to the sim layer (stepSim sees
  processes, not lives — game.ts owns lives), it is strictly more correct than the prior
  hardcoded `{p1:true,p2:true}`, and coop/survival share the same enemy complement (row-driven),
  so there is no spawn/announce mismatch. Acceptable; a future story could thread lives in.
- **Announcements render only in `playing` mode, not attract.** Matches the story scope
  ("egg/survival rounds" in play); the attract demo not announcing is acceptable.

### Clean specialists
- **[SEC]** reviewer-security — clean. Traced every external-input-adjacent path:
  `waveMessageText` is only reachable with the 10 fixed WAVMSG labels (the unmapped-label
  throw is statically unreachable), `announcementAt` guards `framesSinceWave < 0` before the
  index math, and all new text goes to Canvas via `layoutText`/`paintText` — no DOM/`eval`
  sinks, no network, no storage, no auth. Minimal surface confirmed, no findings.

### Required for approval
Fix F1 in both `wave.ts` and the test oracle → 'FOR DISMOUNTING FIRST PLAYER', re-run the
joust suite + lint, then re-review.
## Dev Rework (Cycle 1 → round 2 — Yoda)

**Addressed Reviewer F1 (GLAD3 string).** Confirmed the finding independently (PHRASE.SRC
byte table, MS10 $F5, decodes to 'FOR DISMOUNTING FIRST PLAYER') and applied it in both
places the wrong string lived:
- `plugins/joust/src/core/wave.ts` — `WAVMSG_TEXT.GLAD3` → 'FOR DISMOUNTING FIRST PLAYER'
- `plugins/joust/tests/wave-announce-jt13-6.test.ts` — `ROM_WAVMSG_TEXT.GLAD3` (the AC-2
  oracle) → same, so the sweep now pins the correct ROM text.

Commit `7d1b6022`, pushed. Full joust suite **3855 green**, lint clean.

**N1 (catch(e) unknown-cast) — not changed, by Reviewer's own downgrade.** It reproduces the
established repo loader idiom (`tests/helpers/{sim,wave}-contract.ts`); narrowing this one
instance would diverge from the convention. Left as-is per the non-blocking ruling.

No other code changed; the design the review validated is untouched.

## Review Correlation

| # | Source | Finding | Classification | Checklist Check | Action |
|---|--------|---------|---------------|-----------------|--------|
| 1 | reviewer (comment_analyzer) | GLAD3 transcribed 'OSTRICH' from MESSEQU's stale EQU comment; PHRASE.SRC byte table says 'PLAYER' | NOT_APPLICABLE | — | ROM-fidelity transcription is project-specific, not a TypeScript language pattern; no TS-checklist update. Fixed in code. |
| 2 | reviewer (comment_analyzer) | The test's ROM_WAVMSG_TEXT oracle duplicated the same wrong string, so the AC-2 sweep passed while wrong | EXISTING_CHECK | #18 / #26 (apparatus fails by passing; the oracle value IS the expectation, both from one transcription) | Dev missed existing check — a fidelity oracle must be independently sourced (decode the authoritative PHRASE.SRC bytes), not hand-copied beside the value under test. Fixed the oracle. |
| 3 | reviewer (rule_checker) | catch(e as Error) unknown-cast in the test loader | EXISTING_CHECK | #11 (unnarrowed unknown error) | Reproduces the established repo loader idiom (tests/helpers/{sim,wave}-contract.ts); Reviewer downgraded to non-blocking. No change this story. |

### Signal Summary
- **External findings: 0**
- **CI findings: 0**
- **Internal findings: 3** (all caught in-process by the reviewer specialists)
- **New checks added: 0** (finding 1 is project-specific fidelity, not a language pattern; findings 2 & 3 map to existing checks #18/#26 and #11)
## Subagent Results

**Cycle: 1**

Method: **targeted re-verification** of the one recorded finding (F1) with direct probes,
not a fresh generalist sweep — the rework diff is two string literals, so re-verifying the
characterized finding against the authoritative ROM source is the stronger, proportionate
evidence.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (re-verified) | clean | none — full joust suite 3855 green, lint clean, tree has only the sprint status stamp (below) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes (re-verified) | resolved | F1 FIXED — GLAD3 now 'FOR DISMOUNTING FIRST PLAYER' in wave.ts:387 and the test oracle:61, matching PHRASE.SRC:280-281 byte table (verified again) | CONFIRMED FIXED |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes (re-verified) | clean | none — the fix is a string-literal change, adds no surface | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes (re-verified) | clean | N1 (catch-e #11) unchanged — non-blocking per cycle-0 ruling; no new rule instances in the 2-line diff | N/A |

**All received:** Yes (4 enabled re-verified; 5 disabled via settings)

**Working-tree audit:** `pf reviewer audit-tree` exited non-zero, flagging `sprint/epic-jt13.yaml`.
Investigated: the ONLY dirty file is that epic YAML, changed `status: in_progress → in_review`
— the pf handoff machinery's own workflow stamp on the story's re-entry to review. **Not a
subagent mutation** (no mutation-testing subagent ran this cycle; targeted re-verification was
used) and **not source** (`git status --porcelain -- 'plugins/**/src/**' 'plugins/**/tests/**'`
is empty). Restoring it (`git checkout -- .`) would revert legitimate tracking, so it is left
in place. The audit's HALT premise (a subagent left SOURCE changes) does not hold; the source
tree is clean. Proceeding.

## Reviewer Assessment

**Cycle: 1**

**Verdict:** APPROVED — the one blocking defect (F1, GLAD3 ROM string) is fixed and
re-verified; nothing else regressed.

**[DOC] F1 resolution — CONFIRMED FIXED.** Both sites now read 'FOR DISMOUNTING FIRST PLAYER':
`plugins/joust/src/core/wave.ts:387` (the map) and `plugins/joust/tests/wave-announce-jt13-6.test.ts:61`
(the AC-2 oracle). I re-decoded `PHRASE.SRC:280-281` (`MS10 … CF,CI,CR,CS,CT,CSPC,CP,CL,CA,CY,CE,CR+END`
= "FIRST PLAYER") and the code matches. The AC-2 completeness sweep now pins the correct string,
so the fidelity guard is restored (was masked by the duplicated wrong oracle in cycle 0).

**Scope check.** The rework diff (`4d20004d..HEAD`) is exactly the two GLAD3 string literals
plus their citation comments — no scope creep, no other code touched. Full joust suite 3855
green, lint clean.

**[RULE] N1 (catch-e unknown-cast)** — left as-is per the cycle-0 downgrade (reproduces the
established repo loader idiom; non-blocking).

**[SEC] reviewer-security** — re-verified clean on the fixed tree: the change is a string
literal, adding no input path or sink; the cycle-0 trace (unmapped-label unreachable,
`announcementAt` guards `< 0`, canvas-only rendering) still holds.

**Observations from cycle 0** (playersAlive process-source edge; attract mode not announcing)
stand as recorded — both non-blocking, no change required.

All cycle-0 clean specialists (preflight, security) remain clean on the fixed tree. Approving.