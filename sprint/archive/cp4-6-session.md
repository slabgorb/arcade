---
story_id: "cp4-6"
jira_key: "cp4-6"
epic: "cp4"
workflow: "tdd"
---
# Story cp4-6: High-score persistence and initials entry

## Story Details
- **ID:** cp4-6
- **Jira Key:** cp4-6
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-22T14:49:38Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-21T23:03:04Z | 2026-07-21T23:06:04Z | 3m |
| red | 2026-07-21T23:06:04Z | 2026-07-21T23:21:19Z | 15m 15s |
| green | 2026-07-21T23:21:19Z | 2026-07-21T23:34:03Z | 12m 44s |
| review | 2026-07-21T23:34:03Z | 2026-07-21T23:44:03Z | 10m |
| red | 2026-07-21T23:44:03Z | 2026-07-22T14:33:29Z | 14h 49m |
| green | 2026-07-22T14:33:29Z | 2026-07-22T14:43:03Z | 9m 34s |
| review | 2026-07-22T14:43:03Z | 2026-07-22T14:49:38Z | 6m 35s |
| finish | 2026-07-22T14:49:38Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): The ROM's high-score board is EIGHT deep, the shared library's is TEN — the clone will accept two placings the cabinet would refuse. `CENDE4.MAC:120 "NSCORE =8 ;NUMBER OF HIGH SCORE ENTRIES"`, consumed at `CENTI4.MAC:2578 "CPY I,3*NSCORE"` (3 bytes per entry). `@arcade/shared/highscore` hardcodes `MAX_HIGH_SCORES = 10` and documents it as "the classic 10-deep arcade ladder. The single source of truth (AC-4): no game redeclares it." Affects `arcade-shared/src/highscore.ts` (a per-game depth would be a library change, and tempest/star-wars/asteroids all currently share the 10). Filed, not fixed: cp4-6 pins the shared behaviour as-is. Only the TOP score is ever drawn in centipede's HUD, so the divergence is invisible in play and matters only to the persisted table's tail. *Found by TEA during test design.*
- **Gap** (non-blocking): GETINT's ~50-second entry TIMEOUT is unmodelled — the clone's initials screen waits forever. `CENTI4.MAC:1101-1102 "LDA I,0F4 ;ABOUT 50 SECONDS / STA FRAME+1 ;RESET TIMEOUT"` (RADIX 16: 0xF4 = 244 frames, reloaded on every accepted letter) with the expiry at `:1105-1106 "LDA FRAME+1 / BEQ 52$"` and the ROM's own comment at `:1106 ";TIME OUT - BACK TO ATTRACT"`. Affects `centipede/src/core/sim.ts` (a countdown on the entry, expiring to attract). Routed to **cp4-7**, not cp4-6: the timeout's destination is attract, which cp4-7 owns, and cp4-6's ACs never mention it. *Found by TEA during test design.*
- **Gap** (non-blocking): `InputCounts.start` is LEVEL-triggered and the core keeps no previous-press state, so nothing distinguishes a held key from a fresh press. `src/shell/input.ts:144` reports `any(START_KEYS)` for as long as Enter is down; `src/core/sim.ts:579` acts on `input.start === true` every frame. cp4-5 got away with it (restart was the only action), but cp4-6 puts TWO actions on the same button — confirm, then restart — so a single ~60Hz human press would fire both. The ROM debounces the same button explicitly: `:1067-1071 "ROL SDBNCE / LDA SDBNCE / AND I,1F / CMP I,18 / BNE 60$ ;2 FRAMES OFF 3 FRAMES ON"`. Affects `centipede/src/core/sim.ts` (needs edge-triggering). Pinned RED by the "held START" describe block; Dev must add it. *Found by TEA during test design.*
- **Conflict** (non-blocking): The story CONTEXT file still carries the SUPERSEDED boundary prose. `sprint/context/context-story-cp4-6.md:16` says "Design a keyboard initials-entry UI (src/shell) ... keep it a shell concern, sim untouched where possible" — it was generated from the epic YAML by `pf context create` BEFORE the user's 2026-07-21 ruling, and its "Technical Approach" section is an unfilled stub. The corrected boundary lives only in this session file. Anyone who reads the context file alone builds the wrong thing. Affects `sprint/context/context-story-cp4-6.md` (needs the ruling folded in, or a pointer to the session's Design Deviations). *Found by TEA during test design.*
- **Improvement** (non-blocking): `centipede/src/main.ts:52-57` carries a cp2-12 comment asserting the opposite of what this story ships — "the HUD's high-score field is a persisted SHELL-domain value (Tea contract) ... and NOT a SimState field (the pure core stays deterministic/persistence-free)", plus "writing a new high score back to storage is future scope — no name-entry flow exists yet." Both halves become false at GREEN. Affects `centipede/src/main.ts` (Dev must rewrite the comment, not just the code) — a stale comment defending a reversed contract is the false-pointer defect class the reviewer gotchas call out. *Found by TEA during test design.*

### Dev (implementation)

- **Conflict** (non-blocking): The pinned dev port 5278 is served by ANOTHER checkout — `lsof` on the port owner's cwd resolved to `/Users/slabgorb/Projects/a-3/centipede`, not this tree. Any screenshot taken against `localhost:5278` during this story would have verified a-3's code. Smoke-tested on a spare port (5288) whose owner cwd was proved to be `/Users/slabgorb/Projects/a-1/centipede` instead. Affects nothing in the repo — recorded so the AC-4 human check is run against the right tree and the next agent does not trust 5278. *Found by Dev during implementation.*
- **Improvement** (non-blocking): The ROM DISPLAYS the whole eight-row high-score table after entry (`SCORES`, `CENTI4.MAC:1118`, claim HS-10's neighbour), which the clone never draws — the HUD shows only the top score. Affects `centipede/src/shell/render.ts` (a new screen); a natural fit for cp4-7's attract cycle. Filed, not built: no cp4-6 AC mentions it. *Found by Dev during implementation.*
- **Question** (non-blocking): TEA's `main.ts` wiring tests are `?raw` SOURCE-TEXT scans (the reviewer-blessed tp1-39 idiom), so they prove the tokens are present, not that the wiring RUNS. The save trigger and the keydown route are therefore not behaviourally covered by the suite. I closed the gap manually against a real browser (see the Dev Assessment's smoke-test evidence), but nothing in CI would catch a future edit that keeps the tokens and breaks the behaviour. Affects `centipede/tests/highscore-entry.test.ts` (a headless-DOM or extracted-wiring test would be needed). *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (blocking): Every test in the suite manufactures its game-over from `createSim`, which seeds `startPrev: false`, so the suite never travels the path a human always travels — `createAttract` → START → release → play → die. That single missing traversal is what let the HIGH defect through with 870 green. Affects `centipede/tests/highscore-entry.test.ts` (needs a test that starts a game the way the shell does, not by constructing a started state). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Source-text `?raw` assertions that scan a WHOLE file for a token cannot pin which line the token is on — proven here by mutating `render(…, sim.highScoreTable[0]?.score ?? 0)` to `render(…, 0)` with all 50 tests still green, because `sim.highScoreTable` still appeared on the save-trigger lines. Any wiring assertion should anchor to the call site (`/render\([^)]*highScoreTable/`) rather than the file. Affects the tp1-39 `?raw` idiom wherever it is reused across the fleet — worth carrying into tempest/joust wiring suites too. *Found by Reviewer during code review.*
- **Question** (non-blocking): Deferring a ROM behaviour is safe only when the behaviour is additive; the GETINT timeout was the entry state's ONLY exit, so deferring it converted "not yet faithful" into "no way out". Worth a habit at deferral time: ask whether the deferred routine is the sole escape from a state the clone can now reach. Affects `centipede/docs/rom-study/open-questions.md` entry 14 (which documents the deferral without noting the softlock). *Found by Reviewer during code review.*

### Reviewer (code review, round 2)

- **Improvement** (non-blocking): Attract reached BY TIMEOUT is not the same screen as attract at boot — `stepEntryTimeout` flips `phase` to `'attract'` without rebuilding the world, so it keeps the dead playfield and `lives: 0` where `createAttract` would build a fresh one. Harmless while attract is a holding screen, but cp4-7 makes attract a self-playing demo and will need to rebuild the world on entry or it will ship looking broken. Affects `centipede/src/core/sim.ts` (`stepEntryTimeout`) and cp4-7's attract work. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): A timed-out entry commits `name: ''`, and those rows are read by the LOBBY, not just this game. The ROM would have written "A" plus two blanks (`:2613-2616`, claim HS-19). Worth deciding cabinet-wide rather than per-game, since tempest/asteroids/star-wars/battlezone all publish into the same shared board contract. Affects `centipede/src/core/sim.ts` and potentially `arcade-shared` (a house rule for anonymous rows). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): This story is a clean case study for a habit worth spreading — the citation gate re-opens the QUOTED LINE, so it validates transcription but not comprehension. Round 1 shipped a claim whose verbatim was perfect and whose interpretation ("0xF4 = 244 frames") was twelve times wrong, and the gate passed it. The fix that stuck was adding a claim for the MECHANISM the reading depends on (HS-17, the frame-counter carry), so a future reader can check the reasoning and not just the quotation. Recommend that pattern for any derived constant across the fleet. Affects the rom-fidelity-audit practice generally. *Found by Reviewer during code review.*

### TEA (test design, rework round 1)

- **Gap** (blocking): The committed dossier enshrines the 0xF4 misreading and must be corrected before merge. `docs/rom-study/claims/15-high-score-entry.json` claim **HS-8** states the entry "times out after about 50 seconds (0xF4 = 244 frames, RADIX 16)", and `docs/rom-study/open-questions.md` entry 14 repeats "(HS-8; RADIX 16, so 0xF4 = 244 frames)". Both are wrong: `0xF4` is a SEED for the high byte of the 16-bit frame counter, not a frame count. `CENIR4.MAC:269-271` increments `FRAME` once per frame and `FRAME+1` only on its overflow, so the wait is `(0x100 - 0xF4) * 256 = 3072` frames (~51 s), not 244 frames (~4 s). The claim's `verbatim` is correct and the citation gate passes either way — the gate re-opens the SOURCE LINE, it cannot check the prose I wrote around it. Affects `centipede/docs/rom-study/claims/15-high-score-entry.json` (HS-8 claim text) and `centipede/docs/rom-study/open-questions.md` (entry 14). *Found by TEA during test design.*
- **Improvement** (non-blocking): A second ROM constant corroborates the tick model and is worth a claim of its own — `CENTI4.MAC:2624-2625 "LDA I,0F0 ;1 MINUTE AT 60HZ / STA FRAME+1 ;PREPARE TO TIMEOUT GETTING INITIALS"`, which gives `(0x100 - 0xF0) * 256 = 4096` frames ≈ 68 s, matching its own comment under the same derivation that makes 0xF4 ≈ 51 s. Two independent constants agreeing with two independent ROM comments is what raises this from a guess to a derivation. Affects `centipede/docs/rom-study/claims/15-high-score-entry.json` (add HS-16 for :2624, and HS-17 for the `CENIR4.MAC:269-271` counter mechanism the whole derivation rests on). *Found by TEA during test design.*
- **Improvement** (non-blocking): `UPDATE :2620-2623 "LDA X,SCORE2 / STA Y,HSCORE+2 / … ;MOVE HIGH SCORES IN"` shows the ROM writes the score onto the board BEFORE collecting any initial, and `:2614-2618` seeds the first slot to 'A' and CLEARS slots two and three. That settles two things the clone had guessed at: a timeout costs the name and never the place, and the ROM's default display is "A" plus two blanks, not three A's. Affects `centipede/docs/rom-study/open-questions.md` entry 14 (the LOW finding about blank slots should be re-stated against this). *Found by TEA during test design.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

**DEVIATION 1: Core/Shell Boundary Overridden by User Ruling (2026-07-21)**
- **What changed:** The high-score initials logic has been moved to src/core instead of staying shell-only as the epic description originally stated.
- **What the spec said:** "Design a keyboard initials-entry UI (src/shell) that feeds the shared highscore contract; keep it a shell concern, sim untouched where possible."
- **Why:** User ruling prioritizes fleet consistency. All four games that already ship high-score persistence (tempest, asteroids, star-wars, battlezone) place the initials buffer and `enterInitial` event in core. The shared verb `stepNameEntry` is cabinet-wide; only the on-screen picker is centipede-specific (shell). This keeps all ACs satisfied (save path remains deterministic, no core purity violation) while ensuring uniform high-score mechanics fleet-wide.
- **Reference:** asteroids/src/core/sim.ts:245-256 (`enterInitial`), asteroids/src/core/lives.ts:89 (`qualifies` computed on game-over entry), asteroids/src/core/sim.ts:226 (`insertHighScore`), asteroids/src/main.ts:120-121 (save trigger).
- → ✓ **ACCEPTED by Reviewer:** verified the boundary actually holds, not just that it was claimed. `src/core/sim.ts` imports only `qualifiesForHighScore`, `insertHighScore` and a type from `/highscore` — never `makeHighScoreStorage` — and I confirmed the shared module has no import-time side effects (its only top-level statements are `MAX_HIGH_SCORES`, a max-age constant, and an object literal whose methods reach `getDocument()` lazily). `tests/purity.test.ts` sweeps `src/core` and stays green across all 870.

**DEVIATION 2: Shared Verb Adoption — Trackball→Keyboard UX Port (2026-07-21)**
- **What changed:** The ROM's trackball-driven initials picker (GETINT :1001, UPDATE :2534) has been replaced with the keyboard-driven `stepNameEntry` verb from @arcade/shared/name-entry.
- **What the spec said:** "GETINT (:1001 'GET PLAYERS INITIALS FOR HIGH SCORE') and UPDATE (:2534 'UPDATE HIGH SCORE TABLE') are a TRACKBALL-driven initials picker in silicon — for a keyboard clone this is a UX PORT, not a transcription, and is THE ONE LEGIT DIVERGENCE from the ROM in this epic (log it as a deviation with rationale)."
- **Why:** The buffer arithmetic is the cabinet-wide shared verb already adopted by tempest, asteroids, star-wars, and battlezone (all declare `const MAX_INITIALS = 3` locally — it is NOT a shared export; centipede declares its own the same way and passes it as `stepNameEntry`'s `maxLength` argument). The divergence is accurately logged: the ROM GETINT/UPDATE mechanism (trackball position→char cycle, debounce confirmation) is superseded by keyboard input mapped through `stepNameEntry`. The purity guard remains green (pure string→string transform, seeded-rng free). This is one legit divergence, properly attributed to UX porting, not transcription.
- **References:** ROM GETINT :1001, UPDATE :2534; shared verb: `@arcade/shared#v0.15.0:/name-entry` exports `stepNameEntry(buffer: string, key: string, maxLength: number): string`.
- → ✓ **ACCEPTED by Reviewer:** the divergence is real, sanctioned by the epic, and honestly scoped — the port keeps the ROM's three-slot rule (`:1074`), which I proved is load-bearing: mutating `MAX_INITIALS` to 4 killed 9 tests.

## Story Acceptance Criteria

1. **Persistence on game-over:** On game-over a qualifying final score is persisted through @arcade/shared/highscore's write path and survives reload (the loaded high score reflects a just-ended game); pinned by a test against the shared storage contract.

2. **Keyboard initials-entry UI:** A keyboard initials-entry UI collects the player's initials and writes them into the highscore row; the trackball→keyboard divergence is logged as a deviation with rationale (GETINT :1001 is a UX port, not a transcription).

3. **Deterministic save path:** The save path is deterministic and does not reach into core purity (no Date.now/Math.random in the sim path); high-score display continues to render from the shared source, never render.ts-local state.

4. **Human smoke test:** Full suite green from baseline; build + lint clean; a human smoke test on THIS checkout confirms a beaten high score persists across a reload.

## Known Defect Fixed by This Story

**Issue:** centipede/src/main.ts:59 snapshots the high score ONCE at module scope — `const highScore = highScoreStorage.load()[0]?.score ?? 0` — and passes that scalar into `render(logicalCtx, atlas, sim, highScore)` at main.ts:149. Even a correct save will not update the on-screen high score until a page reload.

**Impact:** AC-4's human smoke test ("a beaten high score persists across a reload") would pass while the in-session display stays stale.

**Fix:** The high score the HUD draws must become live state, not a boot-time scalar. render.ts:140 takes `highScore = 0` as a param and draws it at render.ts:244. This story makes the high score come from @arcade/shared/highscore live, reading the latest after each save, ensuring AC-3 (display sources from the shared source and never from render.ts-local state) holds.

## @arcade/shared Compatibility

**Verified by SM pre-setup (no library work needed):**

1. centipede pins `@arcade/shared@github:slabgorb/arcade-shared#v0.15.0`. Both subpath exports cp4-6 needs already ship at that tag:
   - `/highscore`: exports `qualifiesForHighScore`, `insertHighScore`, `makeHighScoreStorage`, `makeHighScoreRowGuard`, `MAX_HIGH_SCORES = 10`, and the `HighScoreEntry<DomainKey>` type.
   - `/name-entry`: exports `stepNameEntry(buffer: string, key: string, maxLength: number): string` — the cabinet-wide initials verb.

2. centipede already constructs `makeHighScoreStorage('centipede', makeHighScoreRowGuard('wave'))` at main.ts:58 — so the persisted row carries a `wave` field and any inserted entry must supply it.

3. All four games that already ship this use `/name-entry` with a local `const MAX_INITIALS = 3`. cp4-6 MUST use it rather than hand-rolling buffer arithmetic.

## Sm Assessment

**Setup complete. Routing to O'Brien (TEA) for RED.**

**What I verified before cutting the story** (claims, not assumptions — each was run):

- **Merge gate:** `gh pr list -R slabgorb/centipede --state open` → `[]`. No blocking PRs.
- **Sibling-checkout race:** fetched `origin` and scanned the last 20 commits on `origin/develop`; no cp4-6 work has landed or been branched anywhere. `git branch -a --list '*cp4-6*'` → empty. This checkout owns the story.
- **Dependency:** cp4-5 (the game-over state machine cp4-6 saves on) is `status: done`, merged as centipede#29. Game-over is a real, reachable state — the sequencing precondition holds.
- **Shared-library compatibility:** the whole reason this story got a pre-setup check. Result: **no arcade-shared work is in scope.** Both `/highscore` and `/name-entry` ship at the pinned `v0.15.0` and are installed. No bump, no re-pin, no library PR.

**Two corrections to the story as written — both ratified by the user 2026-07-21, both recorded under Design Deviations:**

1. The epic's "keep it a shell concern, sim untouched" is **superseded**. Four shipped games put the table, the `qualifies` flag, the initials buffer and `insertHighScore` in **core** (all pure functions — purity guard stays green) and leave only `makeHighScoreStorage` and the save trigger in shell. cp4-6 follows the fleet. Mirror `asteroids` — the reference lines are cited in Deviation 1.
2. The "one legit divergence" is logged as **shared-verb adoption**, not a bespoke UX port: the buffer arithmetic is already the cabinet-wide verb; only the on-screen presentation is centipede's own.

**One defect I found that the ACs do not name** — TEA should write a test for it, or it will ship stale: `main.ts:59` reads the high score once at module scope and passes a **scalar** to `render()`. A correct save still leaves the HUD showing the old number until reload, and AC-4's smoke test ("survives reload") would go green straight over it. The drawn high score must become live state. Details under "Known Defect Fixed by This Story."

**Risks I am handing to TEA rather than resolving:**
- The inserted row must carry a `wave` field — the storage is bound to `makeHighScoreRowGuard('wave')` (main.ts:58), so a row without it fails the guard on reload.
- AC-4 needs a **human** smoke test on a server proven to be THIS checkout. The port-ownership trap is live: `lsof` port 5278's cwd or serve a spare port before trusting anything on screen.

No implementation planning done here — the boundary ruling is a routing decision, not a design. Test strategy, the shape of `enterInitial`, and where the live high score is threaded are O'Brien's and Julia's to determine.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **The ROM's letter-SCROLL input model is not pinned; the typed-buffer model is**
  - Spec source: context-story-cp4-6.md, AC-2 (and the epic's "THE ONE LEGIT DIVERGENCE")
  - Spec text: "A keyboard initials-entry UI collects the player's initials and writes them into the highscore row; the trackball→keyboard divergence is logged as a deviation with rationale (GETINT :1001 is a UX port, not a transcription)."
  - Implementation: The suite pins the KEYBOARD semantics only — a letter key appends, Backspace deletes, the buffer caps at three. It deliberately pins nothing about the ROM's actual input mechanism: scrolling one letter with the horizontal trackball every 8th frame (`:1130-1138`) and committing it with FIRE through the 5-frame SDBNCE debounce (`:1060-1071`).
  - Rationale: The story's own ruling is that this is a UX PORT, not a transcription, so transcribing the scroll semantics would pin a mechanism the clone must not have. What IS transcribed and pinned is everything the port must still honour: three slots (`:1074 CMP I,03`), and the qualify/insert decisions from UPDATE (`:2574`).
  - Severity: minor
  - Forward impact: none — cp4-7's attract screen reuses the entry state, not the input model.
  - → ✓ **ACCEPTED by Reviewer:** correct call — pinning the trackball scroll would pin a mechanism the clone must not have. The port's substantive obligations (three slots, UPDATE's verdict) are pinned and mutation-proven.

- **The entry TIMEOUT is not tested at all**
  - Spec source: context-story-cp4-6.md, AC-2
  - Spec text: "A keyboard initials-entry UI collects the player's initials and writes them into the highscore row"
  - Implementation: No test drives the ROM's ~50-second entry timeout (`:1101 "LDA I,0F4 ;ABOUT 50 SECONDS"` → `:1106 ";TIME OUT - BACK TO ATTRACT"`). The clone's entry screen therefore waits indefinitely, and this suite pins that it holds rather than that it expires.
  - Rationale: The timeout's destination is ATTRACT, which cp4-7 owns and which does not exist as a reachable auto-transition yet; testing it here would pin a transition into a state cp4-6 cannot legitimately produce. Filed as a Delivery Finding routed to cp4-7 instead of silently dropped.
  - Severity: minor
  - Forward impact: cp4-7 must add the countdown and its own test; until then a finished player must press START to leave the entry screen.
  - → ✗ **FLAGGED by Reviewer:** the deferral is defensible; the stated forward impact is **factually wrong**, and being wrong hides a softlock. "A finished player must press START to leave the entry screen" is not what the code does — `src/core/sim.ts:664` swallows the press whenever `initials.length !== MAX_INITIALS`, so START leaves the screen only after exactly three letters are typed. I drove 50 press/release cycles on a qualifying game-over with an empty buffer: still `gameover`, buffer still `""`. The ROM's only escape from that state is precisely the timeout this deviation defers (`:1106 ";TIME OUT - BACK TO ATTRACT"`), so deferring it removes the sole exit rather than leaving a manual one. Raised as finding #2 (MEDIUM); the deviation text must be corrected even if the timeout stays in cp4-7.

- **The board depth is pinned at the SHARED ten, not the ROM's eight**
  - Spec source: context-story-cp4-6.md, AC-1
  - Spec text: "On game-over a qualifying final score is persisted through @arcade/shared/highscore's write path"
  - Implementation: "keeps the board ordered and capped at the shared depth" asserts `MAX_HIGH_SCORES` (10) rather than the ROM's `NSCORE = 8` (CENDE4.MAC:120).
  - Rationale: AC-1 names the shared write path as the contract, and `insertHighScore` truncates to the library's constant — which the library documents as a single source of truth no game may redeclare. Pinning 8 here would fail against the shared module cp4-6 is required to use. The fidelity gap is filed as a Delivery Finding against arcade-shared rather than papered over.
  - Severity: minor
  - Forward impact: if arcade-shared ever takes a per-game depth, this assertion and the finding move together.
  - → ✓ **ACCEPTED by Reviewer:** pinning the ROM's 8 against a library that truncates at 10 would have been a test that could never pass. Filing it against arcade-shared rather than letting one game redeclare a documented single-source-of-truth constant is the right escalation.

- **Only one of GETINT's two screen messages is pinned**
  - Spec source: CENTI4.MAC:1036, :1038 (primary source, via AC-2's UI requirement)
  - Spec text: `:1036 "JSR MESS ;DISPLAY \"GREAT SCORE\""` and `:1038 "JSR MESS ;DISPLAY \"ENTER YOUR INITIALS\""`
  - Implementation: The render suite asserts the drawn glyphs match `/ENTER/` (the :1038 prompt). It does not require "GREAT SCORE".
  - Rationale: One prompt is enough to prove the entry screen is actually drawn and legible, which is what AC-2 asks for; pinning both exact strings would over-constrain a screen the story explicitly leaves to a UX port, and the ROM's own layout (a cocktail-aware two-player panel) is not being reproduced.
  - Severity: minor
  - Forward impact: none — Dev may draw both messages; the suite permits it.
  - → ✓ **ACCEPTED by Reviewer:** and Dev did draw both, both transcribed from primary source. Verified the guard is not decorative — deleting either `drawTextRow` call kills a test.

### Dev (implementation)

- **The entry screen CLEARS its text cells before drawing the glyphs**
  - Spec source: context-story-cp4-6.md, AC-2 (no test required this)
  - Spec text: "A keyboard initials-entry UI collects the player's initials and writes them into the highscore row"
  - Implementation: `drawTextRow` fills each message row with the CLRCH background pen before blitting its glyphs, instead of blitting straight over the playfield.
  - Rationale: Not polish — it is what the hardware does. The ROM's screen is a TILE map, so MESS writing a character into a cell REPLACES the mushroom that was there; a message row cannot show mushrooms behind its text. Blitting over the field let mushrooms bleed through the transparent pixels of each glyph, which was both unfaithful and genuinely hard to read (observed on the 5288 smoke test, before/after in `docs/rom-study/cp4-6-demo-initials-entry.png`).
  - Severity: minor
  - Forward impact: none — cp4-7's attract overlays can reuse `drawTextRow`.
  - → ✓ **ACCEPTED by Reviewer:** the tile-map rationale is correct and is a fidelity fix, not polish; the ROM's MESS writes character tiles INTO screen cells, so a message row cannot show a mushroom behind it. Caught by looking at the running game, which no assertion in the suite would have surfaced.

- **Both GETINT messages are drawn, though TEA only pinned one**
  - Spec source: session Design Deviations, TEA (test design), "Only one of GETINT's two screen messages is pinned"
  - Spec text: "The render suite asserts the drawn glyphs match /ENTER/ (the :1038 prompt). It does not require \"GREAT SCORE\"."
  - Implementation: The screen draws both "GREAT SCORE" (`:1036`) and "ENTER YOUR INITIALS" (`:1038`).
  - Rationale: TEA's deviation explicitly permits it ("Dev may draw both messages; the suite permits it"), both strings are transcribed from primary source rather than invented, and the pair is what the cabinet actually shows. Cost is two constants.
  - Severity: minor
  - Forward impact: none.
  - → ✓ **ACCEPTED by Reviewer:** explicitly permitted by TEA's own deviation; two transcribed constants, no invented text.

- **A claims file and an open-questions entry were authored, which no test demanded**
  - Spec source: epic-cp4.yaml, "GROUND TRUTH" and "CROSS-CUTTING RULINGS"
  - Spec text: "every transcribed constant carries a radix-cited comment + claims entry"; "file an open-questions.md entry"
  - Implementation: Added `docs/rom-study/claims/15-high-score-entry.json` (HS-1..HS-15) and open-questions entry 14.
  - Rationale: The epic mandates both for transcribed constants, and this story transcribes several (three initials, the two screen messages, the debounce, NSCORE, the timeout). Extracted byte-exact from the vendored tree rather than retyped. Verified the gate actually re-opens them: corrupting HS-5's verbatim to `CMP I,04` failed the suite with "HS-5: source CENTI4.MAC:1074 does not match verbatim", then restored.
  - Severity: minor
  - Forward impact: cp4-7 can cite HS-8 (the timeout) and HS-10 (COPYHS/SCORES) directly.
  - → ✓ **ACCEPTED by Reviewer:** mandated by the epic, and I re-verified the gate independently rather than trusting the claim — corrupting HS-5 to `CMP I,04` failed with `HS-5: source CENTI4.MAC:1074 does not match verbatim`. The claims are genuinely byte-opened.

### TEA (test design, rework round 1)

- **The GETINT timeout is pulled from cp4-7 into cp4-6**
  - Spec source: session Design Deviations, TEA round 1 ("The entry TIMEOUT is not tested at all"); Reviewer finding #2
  - Spec text: "Routed to cp4-7, not cp4-6: the timeout's destination is attract, which cp4-7 owns, and cp4-6's ACs never mention it."
  - Implementation: SUPERSEDED by user ruling 2026-07-22. cp4-6 now models the countdown (`ENTRY_TIMEOUT_OPEN_FRAMES`, `ENTRY_TIMEOUT_LETTER_FRAMES`) and expires the entry to `attract`.
  - Rationale: the deferral was wrong on its own terms. The timeout is the entry state's ONLY exit in the ROM, so deferring it did not leave a less-faithful-but-working screen — it left a state a qualifying player could not leave (Reviewer drove 50 press/release cycles and stayed stuck). cp4-6's entry screen created the trap, so cp4-6 closes it; the `attract` phase it expires into already exists from cp4-5.
  - Severity: major
  - Forward impact: cp4-7 inherits a game-over that already returns to attract on its own, and need only make attract self-play.
  - → ✓ **ACCEPTED by Reviewer:** the right call, and the derivation behind it is sound — I re-opened every line it rests on rather than taking the arithmetic on trust. `CENIR4.MAC:269-271` increments `FRAME` and carries into `FRAME+1` only on overflow, and critically that `INC` sits inside the VBLANK branch (`BVS 5$`), so it is once per FRAME and not once per IRQ despite `CENDE4.MAC:31` documenting 4 IRQs per frame — a 4× error that would have been easy to make and was not made. Both seeds check out: `:2625` `0xF0` → 4096 frames ≈ 68 s against its own ";1 MINUTE AT 60HZ", and `:1101` `0xF4` → 3072 ≈ 51 s against ";ABOUT 50 SECONDS".

- **On expiry the row is COMMITTED with the partial buffer rather than discarded**
  - Spec source: CENTI4.MAC:2620-2623 (primary source)
  - Spec text: `"LDA X,SCORE2 / STA Y,HSCORE+2 / LDA X,SCORE1 / STA Y,HSCORE+1 / LDA X,SCORE0 / STA Y,HSCORE"` — UPDATE's ";MOVE HIGH SCORES IN", executed BEFORE the timeout is armed at :2624
  - Implementation: a timed-out entry inserts `{ name: <whatever was typed>, score, wave }` and goes to attract, instead of dropping the run.
  - Rationale: in the ROM the score is on the board before GETINT ever runs, so the timeout can only cost the NAME. Discarding the run on timeout would invent a punishment the cabinet does not have. This deliberately differs from the START path, which still refuses a short buffer (`:1074`) — the two triggers are not the same event.
  - Severity: minor
  - Forward impact: cp4-7's attract may show rows with one- or two-letter names; that is faithful.
  - → ✓ **ACCEPTED by Reviewer:** verified against the source rather than the reasoning — `:2619 "LDA X,SCORE2 ;MOVE HIGH SCORES IN"` does precede the `:2625` timeout arming, so the cabinet really does secure the place before collecting the name. Mutating the expiry to discard the run killed a test, so the behaviour is pinned and not incidental.

### Dev (implementation, rework round 1)

- **The 0xF0 seed is at :2625 and the score write at :2619-2624 — my earlier citations were off by one**
  - Spec source: session Delivery Findings, TEA rework round 1 (which cited ":2624-2625" and ":2620-2623")
  - Spec text: "CENTI4.MAC:2624-2625 'LDA I,0F0 ;1 MINUTE AT 60HZ'"; "UPDATE :2620-2623 ';MOVE HIGH SCORES IN'"
  - Implementation: corrected everywhere to `:2625-2626` (the seed and its store) and `:2619-2624` (the six-line score write), in `src/core/sim.ts`, the test header, the claims file and open-questions entry 14.
  - Rationale: re-opened every line against the vendored tree before writing it down rather than copying the prose forward — `:2624` is `STA Y,HSCORE`, the last line of the score write, and `:2625` is the `LDA I,0F0`. A citation that is off by one is the exact failure the citation gate exists to prevent, and prose citations sit outside the gate's reach.
  - Severity: minor
  - Forward impact: none — cp4-7 can now cite these directly.
  - → ✓ **ACCEPTED by Reviewer:** independently re-opened. `:2624` is `STA Y,HSCORE` and `:2625` is `LDA I,0F0`, so the correction is right. Self-reported citation drift, found and fixed by the author before review — exactly the discipline the epic's citation rule exists to produce.

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a — a 3-point behavioural story with four ACs; no chore bypass applies.

**Test Files:**
- `centipede/tests/highscore-entry.test.ts` — 50 tests over eight describe blocks: the board as core state, the qualify verdict at game-over (UPDATE `:2574`), the initials verb (GETINT `:1074`), the confirm/insert, the held-START guard, determinism + the core/shell seam, the shared storage round-trip, and the entry screen's render.

**Tests Written:** 50 tests covering 4 ACs
**Status:** RED — `46 failed | 824 passed (870)`, `Test Files 1 failed | 45 passed`

Full-suite numbers, run from this checkout (`npm test` in `centipede/`), not asserted from memory:
- Baseline before this file: **824 passing**. After: **824 passing, 46 new failures, 0 regressions** — mine is the only red FILE; all 45 pre-existing files stay green.
- `npx tsc --noEmit` exits **0**. This matters: `tsconfig.json` includes `tests`, so a RED file that did not typecheck would break `npm run lint` and `npm run build` (AC-4) before Dev wrote a line. The not-yet-existent surface is carried by a local `SimWithBoard` type and a module probe — the cp4-5 `createAttract` idiom — so the file reddens on the FEATURE with a self-describing message, never a bare `TypeError`.
- 4 tests pass in RED by design; each is a guard that must STAY green (core must not import the storage module; no entry screen during play or on a non-qualifying run; a non-qualifying run inserts nothing).

**The contract Dev must build** (mirrors asteroids, per the SM's boundary ruling):
- `SimState.highScoreTable: HighScoreTable<'wave'>`, seeded `[]` by `createSim`, deep-copied by `cloneState`, and **threaded through both restart paths** — `stepSim`'s attract/gameover branch calls `createSim(state.rng.seed)`, which builds a brand-new state, so without explicit threading every restart silently wipes the session's board.
- `SimState.entry: { qualifies, initials, confirmed } | null` — non-null only in `gameover`, with `qualifies` settled ONCE at the transition via `qualifiesForHighScore`.
- `enterInitial(state, key)` — pure, wrapping `stepNameEntry(buffer, key, 3)`; returns the SAME object when inert.
- Confirm on a START edge with three letters → `insertHighScore` with `{ name, score, wave }` and **no `date`** (the core must not read a wall clock).
- Shell: seed the board from `highScoreStorage.load()`, save on reference-identity change, route letter keydowns to `enterInitial`, and feed `render` a LIVE high score.

**The defect I pinned that the ACs do not name.** `InputCounts.start` is level-triggered (`src/shell/input.ts:144` reports the key as long as it is DOWN) and the core tracks no previous press. cp4-5 survived that because restart was the only action on the button; cp4-6 puts **two** actions on it. Without edge-triggering, one ~60Hz human press confirms the initials on frame N and restarts the game on frame N+1 — the player never sees the entry commit. The ROM guards the identical button with an explicit debounce (`:1067-1071 "ROL SDBNCE / … / CMP I,18 / BNE 60$ ;2 FRAMES OFF 3 FRAMES ON"`). Three tests in the "held START" block pin it. This is the finding most likely to have shipped silently.

**Also pinned:** the SM's stale-HUD defect (`main.ts:59`'s boot-time scalar) is covered by five source-wiring assertions, including an explicit negative — the frozen `const highScore = highScoreStorage.load()[0]?.score ?? 0` form must be GONE, not merely supplemented.

### Rule Coverage

Checklist: `.pennyfarthing/gates/lang-review/typescript.md`. Six of thirteen groups apply to this diff (3 enums, 6 JSX, 7 async, 9 build config, 12 bundle, 13 meta-check have no surface here).

| Rule | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes (`!` on nullable) | `there is NO entry while playing or in attract` + every `entry!` deref is preceded by a `.not.toBeNull()` assert in its own block | failing (guard passes) |
| #2 generics / readonly mutation | `cloneState deep-copies the board — a clone can never write through to the original` | failing |
| #4 null/undefined handling | `a ZERO score does NOT qualify`, `the HUD number a reload shows is the score just earned` (`?? 0` on an absent board) | failing |
| #8 test quality (vacuous assertions) | self-check below; `a NON-qualifying run never inserts` hardened with an `Array.isArray` precondition | 1 fixed |
| #10 runtime validation of parsed input | `the row survives the shared ROW GUARD` — `JSON.parse` result is typed `unknown` and validated through `makeHighScoreRowGuard('wave')`, never cast | failing |
| #11 error handling | `renders only glyphs the ROM tile atlas actually has` — `layoutText` THROWS on an unknown character (`src/shell/layout.ts:128`), so a lowercase letter or a cursor glyph would take the whole frame down rather than degrade | failing |

**Rules checked:** 6 of 6 applicable lang-review groups have test coverage
**Self-check:** 1 vacuous test found and fixed — `a NON-qualifying run never inserts` compared `highScoreTable` to itself, so it passed as `undefined === undefined` in exactly the RED state it exists to fail in. It now seeds a real board and asserts `Array.isArray` before comparing. Two `as unknown as` double-casts remain (the recording `ctx`/`atlas`); they are the established `render.test.ts` fake-injection idiom, not a type-system escape in production code.

**Handoff:** To Julia (Dev) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `centipede/src/core/sim.ts` — `MAX_INITIALS`, the `InitialsEntry` type, three new `SimState` fields (`highScoreTable`, `entry`, `startPrev`), the qualify verdict at the game-over transition, START edge-triggering plus the confirm/restart split in `stepSim`, the pure `enterInitial`, and deep-copy in `cloneState`.
- `centipede/src/shell/render.ts` — the entry screen: GETINT's two messages (`:1036`, `:1038`) and the three initial slots, via a `drawTextRow` that clears its cells first.
- `centipede/src/main.ts` — board seeded from storage at boot, saved on reference identity, letter keydowns routed to `enterInitial`, and a LIVE high score fed to `render` in place of the boot-time scalar.
- `centipede/docs/rom-study/claims/15-high-score-entry.json` — HS-1..HS-15, byte-verified.
- `centipede/docs/rom-study/open-questions.md` — entry 14 (the three deliberate divergences).
- `centipede/docs/rom-study/cp4-6-demo-initials-entry.png` — the rendered entry screen.

**Tests:** 870/870 passing (GREEN) — `Test Files 46 passed (46)`. The story's own file is 50/50. `npx tsc --noEmit` exits 0 and `npm run build` succeeds, so AC-4's "build + lint clean" holds.

**Branch:** `feat/cp4-6-high-score-persistence-initials` (pushed)

**Zero collateral, and I checked rather than assumed.** The Dev gotchas warn that a story's own file cannot see the ripple GREEN introduces; the full 46-file suite was run after every step, and no pre-existing test changed behaviour. Nothing in `tests/` was edited — TEA's file is exactly as written in RED.

### Smoke-test evidence (AC-4, mechanical half)

The gotchas also warn that shell wiring is a silent no-op unless traced to the front end, and `main.ts` is covered only by `?raw` source scans. So I drove the real app in a browser rather than trusting the token scan:

- **Port-ownership trap was LIVE.** `lsof` proved 5278 is served by `a-3`'s checkout. Served this tree on 5288 and proved the owner's cwd is `/Users/slabgorb/Projects/a-1/centipede` before trusting a pixel.
- **Boot injection works:** `window.__sim()` on the live page reports `highScoreTable: []`, `entry: null`, `startPrev: false` in attract.
- **The fixed defect, demonstrated:** seeded `localStorage` with `{name:'KEA', score:424242, wave:7}`, reloaded, and the HUD drew **424242** — the board reaches core state and the drawn value derives from it live. Before this story that number came from a module-scope constant.
- **Full flow through the real modules:** drove a genuine one-life game to a latched game-over (score 42,000) → entry opened `{qualifies:true, initials:'', confirmed:false}` → lowercase `k,e,a` through `enterInitial` produced `"KEA"` → a START edge inserted `{name:'KEA', score:42000, wave:1}` and left `phase:'gameover'` with `confirmed:true`. The held-press guard behaved as designed: the confirming press did **not** also restart.
- **The screen is legible**, and fixing it was a fidelity fix, not polish — see the Dev deviation on `drawTextRow`.

### Citation gate proven, not just green

Corrupted HS-5's verbatim to `CMP I,04` and re-ran: the suite failed with `HS-5: source CENTI4.MAC:1074 does not match verbatim`. Restored, 26/26 green. The claims are genuinely re-opened against the vendored tree, not schema-checked and skipped.

### On the two defects TEA pinned

Both are fixed at the mechanism, not the symptom. `startPrev` edge-triggers START in the core (the ROM's SDBNCE equivalent), so the confirm press and the restart press are necessarily distinct. And the HUD's high score is now derived per frame from `sim.highScoreTable[0]`, with TEA's negative assertion ensuring the frozen `const highScore = highScoreStorage.load()...` form cannot come back.

**Left for the human (AC-4):** an end-to-end playthrough on a server proved to be this checkout — play, lose three lives, type initials, reload, confirm the score persists. Every mechanical part of that path is verified above, but the actual "play it" step is a human's.

**Handoff:** To the Thought Police (Reviewer).

## Subagent Results

*(Round 2 — the authoritative table. Round 1's run is summarised at the foot of this section.)*

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 34 raw smells (1 `as unknown as`, 30 `!.`, 3 uncited constants) | confirmed 0, dismissed 34, deferred 0 |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | N/A — domain assessed directly (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | N/A — domain assessed directly (see [SILENT]) |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | N/A — domain assessed directly via a 12-mutation battery (see [TEST]) |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | N/A — domain assessed directly (see [DOC]) |
| 6 | reviewer-type-design | Yes | Skipped | disabled | N/A — domain assessed directly (see [TYPE]) |
| 7 | reviewer-security | Yes | Skipped | disabled | N/A — domain assessed directly (see [SEC]) |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | N/A — domain assessed directly (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | Skipped | disabled | N/A — domain assessed directly (see [RULE] / Rule Compliance) |

**All received:** Yes (1 enabled specialist returned; 8 disabled via `workflow.reviewer_subagents`, each domain assessed by me directly)
**Total findings:** 0 confirmed, 34 dismissed (with rationale), 0 deferred

All 34 preflight smells are the same classes dismissed in round 1, re-confirmed unchanged: every `!.` and the single `as unknown as` live in the test file (assertions preceded by a null-proving `expect`, and the established `render.test.ts` fake-injection idiom), and the three `ENTRY_*_V` row constants are clone layout that never claimed to be transcribed. The `!.` count rose 16 → 30 purely because the rework added tests against the optional `entry` field.

I did not take preflight's numbers on faith: I ran `npm test`, `npm run lint` and the citation suite myself and got the same results (885/885, 46/46 files, tsc 0, citations 26/26). Its ahead/behind is correct this round — `0	4` = 0 behind, 4 ahead — after round 1's inverted report.

**Round 1** (rejected): preflight returned findings, all 8 specialists disabled, and the review produced 1 High + 3 Medium + 2 Low. All six are re-verified closed below.

## Rule Compliance

Checklist: `.pennyfarthing/gates/lang-review/typescript.md`. The repo has no `.claude/rules/*.md` and no `SOUL.md`; `CLAUDE.md`'s binding convention is the core/shell boundary. Enumerated exhaustively over every new type, field and function in the diff.

| Rule | Instances checked | Verdict |
|------|-------------------|---------|
| #1 type-safety escapes | `src/`: zero `any`, zero `as unknown as`, zero `!.`, zero `@ts-ignore`. Tests: 16 `!.` + 1 double-cast, each preceded by a null-proving assert or the established fake-injection idiom | compliant |
| #2 generics / readonly | `InitialsEntry` — all 3 fields `readonly`; `SimState.highScoreTable`/`entry`/`startPrev` — all `readonly`. `HighScoreTable<'wave'>` is a mutable array type behind a `readonly` field, so the array itself could be mutated in place — but `insertHighScore` always returns a NEW array and `cloneState` copies row-by-row, which I mutation-proved (aliasing the board killed a test) | compliant |
| #3 enums | `GamePhase` is a string union, not an enum; `InitialsEntry` is an interface. No enum introduced | N/A |
| #4 null/undefined | `sim.highScoreTable[0]?.score ?? 0` (`main.ts:176`) — `??` not `||`, correct for a legitimate 0 score. `entry === null` explicit null checks at `sim.ts:663` and `render.ts`. `state.entry === null ? null : {...}` in `cloneState` | compliant |
| #5 module/declaration | `import { ... type HighScoreTable }` uses inline `type` for the type-only import; `MAX_INITIALS` imported as a value into `render.ts` and used at runtime (`padEnd`) | compliant |
| #6 React/JSX | no JSX in repo | N/A |
| #7 async/promise | nothing async added | N/A |
| #8 test quality | 50 new tests; I ran a 15-mutation battery rather than reading them — 12 killed, 3 survived. See [TEST] finding #3 | **1 violation** |
| #9 build config | `tsconfig.json` untouched; `strict: true` retained; `tsc --noEmit` exits 0 | compliant |
| #10 runtime validation of parsed input | `JSON.parse` appears once (test), typed `unknown` and validated through `makeHighScoreRowGuard('wave')` — not cast. Production never parses: `highScoreStorage.load()` validates through the same guard inside the shared module | compliant |
| #11 error handling | `layoutText` throws on an unknown glyph; the entry screen can only feed it A–Z (`stepNameEntry` charset) plus spaces (`padEnd`), and a test asserts `render` does not throw. No empty catch anywhere in the diff | compliant |
| #12 perf/bundle | bundle 37.69 → 37.77 kB (+80 bytes). `drawTextRow` runs at most 3× per frame and only during a qualifying game-over | compliant |
| #13 fix-introduced regressions (meta) | **This is where the story fails.** The fix for TEA's held-START defect introduced a new defect in the same mechanism — see finding #1 | **1 violation** |

## Devil's Advocate

Let me argue this code is broken, because it is.

The story's marquee safety feature is `startPrev`, added so one keypress cannot both confirm initials and restart. It is a state variable that is written in exactly one phase and read in exactly that same phase — but it *persists across* the other phase, where nothing maintains it. That is the classic stale-flag shape, and it fails exactly as the shape predicts. A real player boots into attract and presses Enter. The restart branch stores `startPrev: held` — `true`, because the key is genuinely down. The new game begins. The player releases Enter one frame later, and *nothing notices*, because `stepPlayingFrame` and `stepDeathFrame` never touch `startPrev` (`stepDeathFrame` does not even receive `input`). The flag is now a lie for the entire remaining game. Minutes later the player dies out, types KEA, presses Enter — and `pressed = held && !startPrev` evaluates `true && !true` = `false`. The press is swallowed. The board is empty. AC-1 says a qualifying score "is persisted through the shared write path" on game-over; on the natural single press, it is not. I did not reason my way to that conclusion and stop — I wrote the real sequence as a test and watched the board come back `[]`, then watched a release-and-press-again commit `{"name":"KEA","score":50000,"wave":1}`.

Now the confused user. Suppose they qualify — which on a fresh cabinet is *any* positive score, since an empty board accepts everything — and they simply don't want to type initials. There is no cancel, no skip, and no timeout, because the timeout was consciously deferred to cp4-7. I mashed START fifty times with releases in between: still `gameover`, buffer still empty. The ROM is not stuck there; its 50-second countdown (`:1101`) drops it back to attract. Deferring that countdown did not defer a nicety, it removed the state's only exit. And the deviation that deferred it tells the next reader "a finished player must press START to leave the entry screen," which is precisely what does not work.

And the malicious or merely careless user: `localStorage` is attacker-writable, and `load()` runs it through the shared row guard, so a hand-edited `score: "banana"` is filtered rather than rendered — that path is genuinely sound. But `sixDigits` will happily render a 12-digit stored score as its last six digits, and nothing clamps a stored score to anything sane. That is cosmetic, not a breach.

What a stressed reviewer would miss: the suite is 870 green and the build is clean, and all three defects above sit *underneath* that green. Two of them are invisible to the tests because every test manufactures its game-over from `createSim` — which sets `startPrev: false` — and never once travels the attract → start → play → die path a human always travels. Green here means "the paths TEA imagined work," not "the game works."

## Reviewer Assessment

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | `startPrev` is written only in the attract/game-over branch and never maintained during `playing`, so it stays `true` for an entire game after the Enter press that started it. The first START press at every subsequent game-over is swallowed — the initials are not committed, and a non-qualifying game-over does not restart. Reproduced on the real path (attract → Enter → release → play → die): one press ⇒ board `[]`; release + second press ⇒ row commits. | `src/core/sim.ts:654` (`pressed`), written `:688`, never updated in `stepPlayingFrame` (`:293`) or `stepDeathFrame` (`:582`) | Maintain `startPrev` on EVERY frame in every phase — e.g. compute `held` once at the top of `stepSim` and carry it into all three branch returns — so it tracks the actual previous input level rather than freezing at the value the restart stored. Add a test that starts from `createAttract`, presses START to begin, releases, plays to game-over, and asserts ONE press commits. |
| [MEDIUM] | A qualifying player who has not typed exactly three letters cannot leave the game-over screen at all: START is consumed and discarded. No cancel, no skip, and the ROM's only escape (the ~50s timeout, `:1101-1106 ";TIME OUT - BACK TO ATTRACT"`) was deferred to cp4-7. 50 press/release cycles left the sim in `gameover` with an empty buffer. | `src/core/sim.ts:664` | Either honour the deferred timeout now, or allow START to abandon an incomplete entry (committing nothing), or accept a short/empty buffer. Any of the three restores an exit. At minimum, correct the TEA deviation's "must press START to leave the entry screen," which is false. |
| [MEDIUM] | **[TEST]** The regression guard for this story's own headline defect cannot fail. `derives the drawn high score from the live sim board` matches `/sim\s*\.\s*highScoreTable\|highScoreTable\s*\[\s*0\s*\]/` against whole-file source text — and `sim.highScoreTable` also appears on `main.ts:158/160` (the save trigger). I replaced the render call with a literal `render(logicalCtx, atlas, sim, 0)` and all 50 tests still passed. The stale-HUD defect could be reintroduced verbatim with a green suite. | `tests/highscore-entry.test.ts` (the `main.ts` wiring block) | Anchor the assertion to the render CALL, not the file — e.g. match `/render\([^)]*highScoreTable/` — or extract the derivation into an exported pure helper and test it behaviourally. |
| [MEDIUM] | **[DOC]** After the initials are confirmed, the entry screen stays up: the render guard tests `entry.qualifies` but not `entry.confirmed`, so "GREAT SCORE / ENTER YOUR INITIALS / KEA" keeps drawing after commit. The ROM does the opposite — `:1109-1112` explicitly removes both messages (`;REMOVE "GREAT SCORE"`, `;REMOVE "ENTER INITIALS"`) and `:1114-1116` clears the initials — then shows the table. Untested and unlogged. | `src/shell/render.ts` (entry guard) | Add `&& !entry.confirmed` to the draw guard (or draw a post-commit state), and pin it with a test. Log the remaining divergence from `:1117-1118` if the table screen stays out of scope. |
| [LOW] | **[SIMPLE]** `enterInitial`'s `state.phase !== 'gameover'` guard is unreachable-redundant today: `entry` is `null` in every non-game-over state, so the next line already returns. Mutating the phase guard to `if (false)` kills no test — the test named `is inert while PLAYING and in ATTRACT` passes either way and proves the null check, not the guard it names. | `src/core/sim.ts:660` | Keep the guard (it becomes load-bearing the moment cp4-7 keeps an `entry` around in attract), but the test should construct a non-gameover state WITH a non-null `entry` so it actually pins what it claims. |
| [LOW] | The clone opens each initial slot blank where the ROM opens it on the letter A (`:1103-1104 "LDA I,1 / STA X,INITL ;SET INITIAL TO A"`) — a fact Dev transcribed as claim HS-7 and then did not implement. Defensible under the type-directly port (there is no letter to scroll from), but it is an undocumented divergence from a claim the story itself filed. | `src/shell/render.ts` (`padEnd(MAX_INITIALS, ' ')`) | Either seed the display with A's or note in open-questions entry 14 that HS-7 is deliberately not modelled by the keyboard port. |

### Verified good (with evidence, not vibes)

- `[VERIFIED]` **The core/shell boundary genuinely holds** — `src/core/sim.ts` imports only `qualifiesForHighScore`, `insertHighScore` and a type; `makeHighScoreStorage` appears solely in `main.ts:69`. I also checked the shared module for import-time side effects, since importing it into core would otherwise smuggle browser access in: its only top-level statements are `MAX_HIGH_SCORES`, a max-age constant, and an object literal whose methods call `getDocument()` lazily. `tests/purity.test.ts` sweeps `src/core` and is green. Complies with CLAUDE.md's core/shell rule.
- `[VERIFIED]` **The board survives a restart, and that is load-bearing, not incidental** — `sim.ts:687` threads `highScoreTable` through the reseed. Replacing it with `[]` killed 3 tests, so the guard has teeth.
- `[VERIFIED]` **`cloneState` deep-copies the board** — `sim.ts:738` maps rows into fresh objects. Aliasing the array instead killed a test.
- `[VERIFIED]` **[SEC]** No injection or secret surface. The only untrusted input is `localStorage`, and both directions are validated: `load()` filters every row through `makeHighScoreRowGuard('wave')` inside the shared module, and the test suite proves a persisted row passes that same guard. Initials are constrained to `A-Z` by `stepNameEntry`'s `/^[a-zA-Z]$/` charset before they can ever reach storage or the glyph lookup — there is no path from a keystroke to an unknown stamp. No `eval`, no `innerHTML`, no network, no auth/tenant surface in this repo.
- `[VERIFIED]` **[SILENT]** No swallowed errors introduced — zero `catch` blocks in the diff. The one genuine throw path (`layoutText` on an unknown glyph) is guarded by the charset above and asserted not to throw.
- `[VERIFIED]` **[EDGE]** Boundary behaviour checked directly: score 0 is refused (`qualifiesForHighScore` returns false for `score <= 0`), a score exactly equal to a full board's floor is refused while floor+1 is accepted, a 4th keystroke is dropped rather than wrapped, Backspace on empty is inert, and the board truncates at `MAX_HIGH_SCORES`. Mutating `MAX_INITIALS` to 4 killed 9 tests.
- `[VERIFIED]` **[TYPE]** `InitialsEntry` models the three states as data rather than stringly-typing them; `entry: InitialsEntry | null` makes "no entry screen" unrepresentable-as-a-blank-string. All new fields are `readonly`.
- `[VERIFIED]` **[RULE]** Citation discipline is real, not decorative — I corrupted HS-5's verbatim to `CMP I,04` and the gate failed with `HS-5: source CENTI4.MAC:1074 does not match verbatim`, then restored it. 15 claims byte-open against the vendored tree.
- `[VERIFIED]` **[DOC]** The stale cp2-12 comment that TEA flagged (`main.ts:52-57`, "NOT a SimState field") was genuinely rewritten, not left to rot beside reversed code.

**Data flow traced:** a keystroke → `window.keydown` (`main.ts:88`) → `enterInitial` → `stepNameEntry` (charset-filtered to A–Z) → `SimState.entry.initials` → on a START edge → `insertHighScore` → `SimState.highScoreTable` → reference-identity check (`main.ts:160`) → `highScoreStorage.save` → `localStorage` → next boot `load()` → row guard → `SimState.highScoreTable` → `render`'s high-score digits. Safe end to end **except** that the START edge in the middle of that chain is the defect in finding #1, so on the real path the chain breaks at the first press.

**Pattern observed:** the good one — `main.ts:158-160`'s reference-identity save (`if (sim.highScoreTable !== board)`) is the asteroids idiom and is exactly right: `insertHighScore` returns a new array, so identity is a sound and cheap change signal with no deep compare. The bad one — a flag maintained in one branch and trusted in another (finding #1).

**Error handling:** verified at `src/shell/layout.ts:128` (`layoutText` throws on an unknown character) and neutralised upstream by the `stepNameEntry` charset plus space-padding; `render.ts` is asserted not to throw for a typed buffer.

**Handoff:** Back to Dev for fixes (findings are testable logic defects — routing through TEA for the missing red tests).
## TEA Assessment (rework round 1)

**Tests Required:** Yes
**Reason:** n/a — Reviewer returned 1 High + 3 Medium + 2 Low, all testable.

**Test Files:**
- `centipede/tests/highscore-entry.test.ts` — 15 tests added, 2 rewritten. Now 65 tests total.

**Tests Written:** 15 new covering all 6 Reviewer findings
**Status:** RED — `13 failed | 872 passed (885)`, `Test Files 1 failed | 45 passed (46)`, `tsc --noEmit` exits 0.

(Two of the 15 pass already by design: the re-anchored `render(` wiring assertion, which passes because the production code is correct and would now FAIL if the call were gutted; and the strengthened phase-guard test, which is a guard that must stay green.)

### What each Reviewer finding got

| # | Finding | Test(s) added |
|---|---------|---------------|
| 1 HIGH | START swallowed after a real start | A whole `describe` that boots via `createAttract`, presses START, **releases**, plays, and dies — the route no existing test travelled. Five tests: the flag tracks the real input level; one press commits; one press restarts a non-qualifying run; the original held-press guard still holds; and it survives a **second** full game, because a latching flag shows up on the second game-over. |
| 2 MEDIUM | Entry screen had no exit | Eight tests for the ported timeout — seeded value, per-frame countdown, per-letter reload, inert keys buying nothing, commit-and-return-to-attract on expiry, the softlock itself (types nothing, still escapes), the clock stopping after confirm, and the board surviving the timeout route. |
| 3 MEDIUM [TEST] | Wiring guard could not fail | Re-anchored to `/render\s*\([^)]*highScoreTable/` — the call, not the file. The old whole-file regex matched the save-trigger lines, which is why gutting the render call left it green. |
| 4 MEDIUM [DOC] | Prompt persisted after commit | `stops prompting once the initials are CONFIRMED`, citing `:1109-1112`'s explicit REMOVE of both messages. |
| 5 LOW [SIMPLE] | Phase guard untestable | The guard now gets a state only IT can reject — a non-game-over state carrying a live `entry`, which is exactly what cp4-7 will produce if attract ever holds the last run's entry. |
| 6 LOW | Blank slots vs the ROM's 'A' | Not tested — but the ROM turned out to say something different from what the finding assumed, and that is now filed (see below). |

### The timeout constant is DERIVED, and the first reading was wrong

This is the part worth reading twice. My round-1 header comment called `:1101 "LDA I,0F4 ;ABOUT 50 SECONDS"` a count of **244 frames**. That is wrong, and at ~60Hz it would have produced a **4-second** entry timeout — the player could not finish typing before being thrown to attract. The ROM's own comment is the tell: 244 frames is nowhere near 50 seconds.

`FRAME` is a 16-bit **up**-counter incremented once per frame, and `FRAME+1` is its HIGH byte — `CENIR4.MAC:269-271 "INC FRAME ;UPDATE FRAME COUNTER / BNE 8$ ;IF NO OVERFLOW / INC FRAME+1"`. So `FRAME+1` ticks once per 256 frames, and seeding it then waiting for zero (`:1105-1106`) costs `(0x100 - seed) * 256` frames:

| ROM site | Seed | Ticks | Frames | At 15750/263 Hz | The ROM's own comment |
|---|---|---|---|---|---|
| `UPDATE :2624` (entry opens) | `0xF0` | 16 | 4096 | 68.4 s | `;1 MINUTE AT 60HZ` ✓ |
| `GETINT :1101` (per letter) | `0xF4` | 12 | 3072 | 51.3 s | `;ABOUT 50 SECONDS` ✓ |

Two different constants, two independently-written ROM comments, one tick model — that agreement is what makes this a derivation rather than a guess, and it is why I did not simply pin whatever number made a test pass.

### Also recovered from the ROM while doing it

`UPDATE :2620-2623 ";MOVE HIGH SCORES IN"` writes the score onto the board **before** any initial is collected, and only then arms the timeout. So a timeout costs the NAME, never the PLACE — which is why the expiry test asserts the row commits with the partial buffer instead of discarding the run. And `:2614-2618` seeds the first slot to 'A' then **clears** slots two and three, so the cabinet's default display is "A" plus two blanks, not three A's — which reframes the Reviewer's LOW #6 rather than confirming it. Both filed as Delivery Findings.

### One blocking correction for Dev

The committed dossier enshrines my original error: claim **HS-8** and open-questions entry 14 both say "0xF4 = 244 frames". The citation gate cannot catch this — it re-opens the SOURCE LINE and the verbatim is correct; the mistake is in the prose I wrote around it. That is a useful limit to know about the gate: **it proves you quoted the ROM accurately, not that you understood it.** Dev must fix both, and should add HS-16 (`:2624`) and HS-17 (`CENIR4.MAC:269-271`) so the derivation itself is cited rather than living only in a test comment.

**Handoff:** To Julia (Dev) for GREEN.
## Dev Assessment (rework round 1)

**Implementation Complete:** Yes

**Files Changed:**
- `centipede/src/core/sim.ts` — `startPrev` recorded at ONE exit in `stepSim` for every phase (new `stepPhase` split); `ENTRY_TIMEOUT_OPEN_FRAMES` / `ENTRY_TIMEOUT_LETTER_FRAMES` derived from the frame-counter model; `InitialsEntry.timeout`; `stepEntryTimeout` (countdown, and commit-then-attract on expiry); `enterInitial` reloads the clock on an accepted letter.
- `centipede/src/shell/render.ts` — the entry screen is withdrawn once `confirmed`.
- `centipede/docs/rom-study/claims/15-high-score-entry.json` — HS-8 corrected; HS-16..HS-19 added.
- `centipede/docs/rom-study/open-questions.md` — entry 14 rewritten.
- `centipede/tests/highscore-entry.test.ts` — citation corrections only (comments).

**Tests:** 885/885 passing (GREEN) — `Test Files 46 passed (46)`. Story file 65/65. `npm run lint` and `npm run build` both clean.
**Branch:** `feat/cp4-6-high-score-persistence-initials` (pushed, `c8a0620`)

### Every Reviewer finding, and how it was closed

| # | Finding | Fix |
|---|---------|-----|
| 1 HIGH | START swallowed after a real start | `startPrev` is now written once, at the top of `stepSim`, covering all three branches. Keeping the invariant at a single exit is what makes it true for the branches that never think about it — which is exactly how it broke. |
| 2 MEDIUM | No exit from the entry screen | The ROM's countdown, ported. Expiry commits the row and drops to attract. |
| 3 MEDIUM [TEST] | Wiring guard could not fail | TEA re-anchored it to the `render(` call; verified it now tracks the right line. |
| 4 MEDIUM [DOC] | Prompt persisted after commit | `&& !entry.confirmed` on the draw guard, citing `:1109-1116`. |
| 5 LOW [SIMPLE] | Phase guard untestable | TEA gave it a state only the phase guard can reject; guard kept. |
| 6 LOW | Blank slots vs the ROM's 'A' | The ROM turned out to seed only the FIRST slot to 'A' and clear the other two (`:2613-2616`) — so the cabinet shows "A" plus two blanks, not three A's. Recorded as claim HS-19 and logged as a divergence in open-questions rather than implemented: with no letter-scrolling there is no "current letter" for a placeholder to represent. |

### Live-app verification (not just the suite)

The defect only ever appeared on the real path, so I re-drove the real path in a browser against a server **proved by content** to be this tree — `curl`ing `/src/core/sim.ts` and finding `ENTRY_TIMEOUT_OPEN_FRAMES`, which exists nowhere else:

| Check | Before | After |
|---|---|---|
| `startPrev` during play | `true` (poisoned by the starting press) | `false` |
| ONE press at game-over | board `[]` | `[{name:'KEA', score:50000, wave:1}]` |
| …did that press also restart? | n/a | no — still `gameover` |
| Type nothing, let the clock expire | stuck forever | `attract`, row committed, score kept |
| Timeout values | n/a | `4096` on open, `3072` after a letter |

**The port-ownership trap fired twice, and content-checking is what caught it.** `lsof -ti | head -1` reported the wrong owner because **two** servers were sharing 5288 — a stale one rooted at the orchestrator plus mine — which is the `[::1]` vs `127.0.0.1` coexistence `CLAUDE.md` warns about, reproduced live. PID inspection was ambiguous; asking the server what it *serves* was not. Recommend that as the default check: `curl` for a token that exists only in your working tree.

### On the dossier correction

My round-1 claim HS-8 said "0xF4 = 244 frames". The citation gate passed it, and would always have passed it: it re-opens the cited SOURCE LINE and my verbatim was correct. The error lived in the prose wrapped around an accurate quote. Corrected, and the derivation is now itself cited (HS-17 pins the counter mechanism) so the next reader can check the reasoning, not just the quotation.

**Handoff:** To the Thought Police (Reviewer).
---

## Rule Compliance (round 2)

Same checklist, re-run against the reworked diff. Only the rows whose verdict moved are restated; the rest are unchanged from round 1 and were re-checked.

| Rule | Instances checked | Verdict |
|------|-------------------|---------|
| #8 test quality | Was the round-1 violation. Re-run a 12-mutation battery over the NEW code: wrapper drops the level, START never registers, countdown never advances, countdown never expires, both timeout constants replaced by the raw ROM seeds, expiry discards the run, expiry stays in game-over, letter does not reload the clock, clock keeps running after confirm, prompt stays up after confirm, short buffer may confirm. **12 of 12 killed.** The round-1 toothless wiring guard is also fixed: it now anchors to `/render\s*\([^)]*highScoreTable/`. | **now compliant** |
| #13 fix-introduced regressions (meta) | Was the round-1 violation, and the reason I attacked the new code first. Three adversarial probes beyond the suite: a player leaning on Enter *through their own death* (does not blow through the entry — still `gameover`), the countdown while the key is held (4096 → 4086 over ten frames, so holding does not freeze it), and attract-reached-by-timeout (START still deals a fresh game, `lives` back to 3, board intact). | **now compliant** |
| #1, #2, #4, #5, #9, #10, #11, #12 | Re-checked unchanged: no `any`, no `as unknown as` in `src/`, no non-null assertions in `src/`, all new fields `readonly`, `??` not `||`, `JSON.parse` still validated through the row guard, no empty catch, bundle 37.77 → 38.12 kB (+350 bytes for the timeout and the withdrawn prompt). | compliant |
| #3, #6, #7 | No enums, no JSX, nothing async. | N/A |

## Devil's Advocate (round 2)

The obvious attack is that this rework is itself a fix-introduced regression, because that is precisely what round 1 was. So I went at the new code before anything else, and the honest answer is that the shape of the fix is what makes it hard to break again: `startPrev` is now written at a single exit that every branch funnels through, rather than in the one branch that happened to think about it. A future contributor adding a fourth phase gets the invariant whether or not they know it exists. That is a structural fix, not a patch, and I mutated the wrapper away to confirm the suite notices (it does — two tests).

Next attack: the timeout is new machinery running every frame on a state the player is staring at, and machinery that mutates state during an "idle" screen is where double-fires live. Could it insert twice? No — expiry sets `phase: 'attract'` and `entry: null` in the same object, so the guard at the top of `stepEntryTimeout` can never see a second expired entry, and mutating that guard to keep running after confirm killed a test. Could it fight the START handler? They are mutually exclusive by construction: the countdown only runs on the `!pressed` path. Could holding the key starve the clock? I measured it: 4096 → 4086 across ten held frames, because a held key is `pressed` for exactly one frame and `!pressed` thereafter.

Where I remain unsatisfied is cosmetic, and I want it on the record rather than smoothed over. Attract reached *by timeout* is not the same screen as attract at boot: it keeps the dead playfield and `lives: 0`, because the expiry flips the phase without rebuilding the world. A player who walks away mid-entry returns to a corpse field with no lives showing. It is not wrong — cp4-5's game-over screen looked the same, and cp4-7 owns what attract actually displays — but it is a seam, and if cp4-7 does not rebuild the world on entering attract it will ship looking broken.

The second unsatisfying thing: a timed-out entry commits `name: ''`. The lobby reads these rows. A blank name on a shared high-score board is odd, and the ROM would have shown "A" plus two blanks (`:2613-2616`, claim HS-19) rather than nothing at all. It is logged, it is faithful in the part that matters (the score is kept), and it is out of this story's ACs — but "the cabinet would have written A" is a real, cited difference, not a matter of taste.

What would a malicious user do? Hand-edit `localStorage`. Still handled: the shared row guard filters on load, and I re-confirmed the core never touches storage. What would a confused user do? Press Enter once and expect it to work — which is now, finally, what happens.

## Reviewer Assessment

**Verdict:** APPROVED

**Round-1 findings, each re-verified closed against the code (not against the author's summary):**

| # | Finding | Evidence it is closed |
|---|---------|-----------------------|
| 1 HIGH | START swallowed after a real start | `startPrev` is recorded at one exit in `stepSim` covering all branches. Reproduced the original sequence on the live page: `startPrev` is now `false` during play (was `true`), and ONE press commits `{name:'KEA', score:50000, wave:1}` while leaving `phase: 'gameover'`. Mutating the wrapper away kills 2 tests. |
| 2 MEDIUM | No exit from the entry screen | The ROM countdown is ported and derived, not transcribed. A qualifying player who types nothing now reaches `attract` with the row committed and the score intact. Mutating the expiry away kills tests in three different ways. |
| 3 MEDIUM [TEST] | Wiring guard could not fail | Re-anchored to the `render(` call. The literal-`0` mutation that survived round 1 would now fail. |
| 4 MEDIUM [DOC] | Prompt persisted after commit | `&& !entry.confirmed` on the draw guard, citing `:1109-1116`; removing it kills a test. |
| 5 LOW [SIMPLE] | Phase guard untestable | The guard now gets a non-game-over state carrying a live `entry` — the one input only it can reject. |
| 6 LOW | Blank slots vs the ROM's 'A' | Answered by the source rather than assumed: `:2613-2616` seeds only the FIRST slot to 'A' and clears the other two, so the cabinet shows "A" plus two blanks — not the three A's my finding implied. Recorded as claim HS-19 and logged as a divergence. My finding was half wrong and the author corrected it with a citation; that is the right outcome. |

**Observations (severity-tagged, none blocking):**

- `[LOW]` Attract reached **by timeout** keeps the dead playfield and `lives: 0` — `stepEntryTimeout` flips `phase` without rebuilding the world, so it differs from `createAttract`'s fresh one. Cosmetic today because attract is a holding screen; a real seam for cp4-7, which should rebuild on entry. Probe P3 confirms the important half — START from that state still deals a proper fresh game (`lives` 3, score 0, board intact).
- `[LOW]` A timed-out entry commits `name: ''`. The row is valid and passes the shared guard, and the score — the part the ROM guarantees — is kept. But the cabinet would have written "A" plus two blanks (`:2613-2616`, HS-19). Logged in open-questions entry 14.
- `[LOW]` `ENTRY_TITLE_V/PROMPT_V/SLOTS_V` (20/18/15) remain uncited clone layout, honestly commented as such. The ROM does set an explicit screen position for this text (`:1039-1044 "LDA I,89 / … / STA TEMP4 ;SET POSITION"`) that a later fidelity pass could transcribe. Unchanged from round 1; still not worth blocking.
- `[VERIFIED]` **[EDGE]** The three states I could not reach from the suite all behave: a held key through death, a held key during the countdown, and attract-by-timeout. Evidence: probes P1/P2/P3 above.
- `[VERIFIED]` **[TEST]** 12 of 12 mutations killed on the new code, including both "read the ROM seed as a frame count" mutations — the precise misreading that produced round 1's dossier error is now caught by a test rather than by a reviewer.
- `[VERIFIED]` **[RULE]** The derivation is independently re-opened, line by line, including the trap that `INC FRAME` sits inside the VBLANK branch and so runs once per frame, not once per IRQ (`CENDE4.MAC:31` documents 4 IRQs/frame). Claims 26/26 green; HS-8 corrected; HS-16..HS-19 added so the reasoning is citable, not just the quotation.
- `[VERIFIED]` **[DOC]** The author found and fixed his own citation drift (`:2624` → `:2625`, `:2620-2623` → `:2619-2624`) before review, and corrected the wrong claim text he had shipped in round 1. The gate could never have caught it — it re-opens the quoted line, and the quote was always right.
- `[VERIFIED]` **[SEC]** Unchanged and re-checked: the only untrusted input is `localStorage`, filtered by the shared row guard on load; initials are charset-constrained to A–Z before they can reach storage or a glyph lookup; core still never names a browser global.
- `[VERIFIED]` **[SILENT]** No swallowed errors; zero catch blocks in the diff. The timeout's expiry path returns an explicit new state rather than falling through.
- `[VERIFIED]` **[TYPE]** `InitialsEntry.timeout` is `readonly number` on a `readonly` field; the entry remains `InitialsEntry | null` so "no entry screen" stays unrepresentable as a sentinel.
- `[VERIFIED]` **[SIMPLE]** The `stepPhase` extraction is not gratuitous — it is what allows the `startPrev` invariant to live at one exit. No dead code, no unused exports.

**Data flow traced:** unchanged from round 1 and now unbroken end to end — keystroke → `window.keydown` → `enterInitial` (charset-filtered, reloads the clock) → `SimState.entry.initials` → START **edge** or timeout expiry → `insertHighScore` → `SimState.highScoreTable` → reference-identity check in `main.ts` → `highScoreStorage.save` → `localStorage` → next boot `load()` → row guard → `render`. The break in the middle (finding #1) is gone; the timeout path joins the same chain, so a timed-out row is saved by the same identity check.

**Pattern observed:** the good one worth carrying to other games — a state invariant maintained at a single exit (`stepSim`'s wrapper) instead of per-branch. Round 1 is the case study for why: the flag was correct in the branch its author was thinking about and stale everywhere else.

**Error handling:** re-verified `layoutText`'s throw path (`src/shell/layout.ts:128`) stays unreachable — the buffer is A–Z only and padding is spaces, and a test asserts `render` does not throw.

**Handoff:** To Winston Smith (SM) for finish-story.