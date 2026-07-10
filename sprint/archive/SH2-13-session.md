---
story_id: "SH2-13"
jira_key: ""
epic: "SH2"
workflow: "tdd"
---
# Story SH2-13: Consistent keyboard high-score entry across the cabinet — type initials + Backspace (tempest mousewheel and star-wars/battlezone auto-tag retired; asteroids typing is the reference)

## Story Details
- **ID:** SH2-13
- **Jira Key:** (no Jira; local sprint tracking only)
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade-shared,tempest,asteroids,star-wars,battlezone
- **Branch:** feat/SH2-13-keyboard-highscore-entry

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-10T16:32:59Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-10T14:53:04.333385Z | 2026-07-10T14:56:11Z | 3m 6s |
| red | 2026-07-10T14:56:11Z | 2026-07-10T15:26:07Z | 29m 56s |
| green | 2026-07-10T15:26:07Z | 2026-07-10T16:15:29Z | 49m 22s |
| review | 2026-07-10T16:15:29Z | 2026-07-10T16:32:59Z | 17m 30s |
| finish | 2026-07-10T16:32:59Z | - | - |

## Sm Assessment

**Setup complete; routing to TEA (O'Brien) for the RED phase.**

- **Scope:** 13-point tdd story converging all four scoring games (tempest, asteroids, star-wars, battlezone) on asteroids-style typed initials entry (A-Z uppercased, Backspace deletes, existing confirm edge commits), with the shared VERB extracted to a PURE `@arcade/shared` module. red-baron explicitly out of scope. The story description flags it as a split candidate; the user chose to start it whole via `/pf-work SH2-13`.
- **Branches:** `feat/SH2-13-keyboard-highscore-entry` created in all five affected subrepos, based on `origin/develop` (gitflow; PRs target `develop`). Orchestrator stays on `main` (trunk-based, no branch).
- **Context:** `sprint/context/context-story-SH2-13.md` and `context-epic-SH2.md` created fresh (no pre-existing Architect context was clobbered).
- **Tracking:** Story marked `in_progress` (2026-07-10); epic YAML round-trip verified clean (status + started only). No Jira in this project — claim step skipped by design.
- **Key constraints for downstream agents:**
  - Shared entry helper must be DOM-free; the purity guard scans built `dist/` as source text, comments included (don't even name forbidden globals in comments). arcade-shared needs a pretest build, and its test files get zero compile-time typechecking (pin contracts at runtime or via source-text checks).
  - No storage changes: entries flow through the existing `@arcade/shared/highscore` seam (`HighScoreEntryBase.name`, `insertHighScore`, `makeHighScoreStorage`); 3-char initials convention holds.
  - Commit must be edge-triggered — each game needs a test that holding confirm across the entry-screen transition does not auto-advance (the tempest 6-2 / battlezone held-fire regression class).
  - TEA should read `sprint/archive/SH2-5-session.md`, `sprint/archive/SH2-6-session.md`, and bz1-10's Delivery Findings before writing tests.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 13-pt tdd story across five repos: a new shared pure module (the entry VERB), a mechanism swap in tempest, a missing feature in asteroids (Backspace), and two brand-new entry screens (star-wars, battlezone) replacing silent auto-tags. Every AC is behavioural and every game has a regression class on record (tempest 6-2 held-fire, battlezone bz1-10 'AAA').

**Test Files:**
- `arcade-shared/tests/name-entry.test.ts` — the shared VERB: `stepNameEntry(buffer, key, maxLength)` types A-Z UPPERCASED below maxLength (a per-cabinet PARAMETER, exercised at 3, 4, and 0), Backspace deletes and never past empty, ~26 hostile keys are inert (digits, named keys, non-ASCII letters, multi-char junk), a mixed key-script holds the `/^[A-Z]{0,max}$/` invariant with an exact trace, and the reducer is deterministic with no-op value identity. **(~39 tests)**
- `arcade-shared/tests/name-entry-source-rules.test.ts` — the font-source-rules pattern (arcade-shared tests are UNTYPED — contracts pinned via node:fs source scans): no type escapes, no clock/randomness, and `exports["./name-entry"]` → dist ESM + types. **(3 tests)**
- `arcade-shared/tests/purity.test.ts` — EDITED: `name-entry` joins `PURE_SUBPATHS`, so the dist-scanning purity guard now demands a built, DOM-free `dist/name-entry.js`.
- `asteroids/tests/name-entry-backspace.test.ts` — the reference flow's missing half: Backspace deletes / never past empty / full-buffer correction, the corrected name (not the typo) commits, mode/phase guards match letters, held-start-across-the-transition cannot confirm + release-then-press commits once (AC-4 — green invariants today, guarding the mechanism swap), the shared-import sweep of src/core, and the main.ts 'Backspace' wiring scan. **(11 tests; 5 RED, 6 green invariants)**
- `tempest/tests/core/sim.highscore.test.ts` — REWORKED (the 4-3/6-2 suite): `enterInitial(state, key)` typing (uppercase, cap 3, junk inert, mode-guarded), Backspace, spin INERT during entry + `cycleLetter` retired (comment-inclusive scan), fire edge commits only the COMPLETED buffer ({name, score, level}, no date, descending insert), start stays inert during entry, gameover→qualify routing preserved verbatim, 6-2 held-fire repointed (held into highscore; held across the 3rd letter; multi-frame tap commits once), determinism/RNG/non-mutation, shared-import sweep + shell wiring scan. **(29 tests)**
- `star-wars/tests/core/name-entry.test.ts` — the new core surface: `beginNameEntry` (gameover-only arm), `enterInitial` typed flow + Backspace, the armed entry GATES the gameover exit (incomplete + start neither exits nor commits — the score is not lost), start RISING edge with 3 typed emits `name-entered` {name} exactly once → attract (core-side startPrev register: a press held across the transition can never commit, AC-4), un-armed gameover keeps today's start→attract, determinism, the 'ACE' scan (comment-inclusive), main.ts wiring scan (beginNameEntry/Backspace/name-entered), shared-import sweep, and the shell latch key-repeat scan. **(19 tests)**
- `star-wars/tests/shell/render.name-entry.test.ts` — AC-1 for the game that never had a screen: the armed entry's typed buffer ('QZJ') must reach the mocked layoutText seam, with a detector-honesty negative. **(2 tests)**
- `battlezone/tests/core/entry.test.ts` — Mode gains 'entry': qualifying card expiry routes there (empty buffer, NOTHING inserted on arrival), scoreless runs keep today's straight-to-attract, `enterInitial` typing/Backspace/guards, start commits the completed buffer verbatim, a latched start on arrival with an empty buffer neither commits nor skips (the bz1-10 'AAA' regression class, AC-4), timeout commits the buffer VERBATIM ('' when untyped — never an auto-tag) within the bz1-10 30 s no-input bound, dt=0 never creeps the timeout, determinism, `entryLines` joins core screens, shared-import sweep + shell wiring scan. **(21 tests)**
- `{asteroids,tempest,star-wars,battlezone}/tests/**/name-entry-resolution.test.ts` — the SH2-5/SH2-6 dep-pin probes (isolated files, `@vite-ignore` variable specifiers): `@arcade/shared/name-entry` must resolve and behave. Forces the four re-pins. **(4 × 1 test)**

**Tests Written:** ~125 new/reworked tests across 10 files (+1 edited guard) covering all 5 ACs (AC-5's build+manual half is the GREEN gate).
**Status:** RED — verified by testing-runner (RUN_ID `SH2-13-tea-red`): **81 failures, ALL confined to the new/reworked files; 0 regressions across all five repos** (arcade-shared 168 pre-existing green, pretest tsc build green). Failure shapes are the intended ones: assertion failures via loose module views (missing `enterInitial`/`beginNameEntry`/`entryLines`), one module-load RED in arcade-shared (the house pattern for a missing source module), and one isolated resolution failure per game. Committed and pushed on `feat/SH2-13-keyboard-highscore-entry` in all five repos.

### Rule Coverage

| Rule (TS lang-review) | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes | `name-entry-source-rules` scans the new shared source; game suites use the house loose-view narrowing (no `as any` anywhere) | failing / enforced |
| #2 generics/readonly | reducer surface is primitives-only; battlezone's readonly-GameState convention for the new `entry` field is tsc's + Reviewer's check (game repos are typed; arcade-shared tests are NOT — hence source scans) | routed to Reviewer |
| #3 enums | battlezone `Mode` stays a string union — pinned by literal comparisons with 'entry' | failing |
| #4 null/undefined | `entry \| null` inert-guard tests in all four games; empty-buffer Backspace boundary everywhere | failing |
| #5 module/declarations | `exports["./name-entry"]` map pin; per-game `@arcade/shared/name-entry` import sweeps; probes isolate unresolvable subpaths | failing |
| #8 test quality | self-check: 0 vacuous tests — every green invariant (asteroids AC-4 pair, guard-mode tests) is paired with failing siblings that drive the same mechanism; the star-wars render pin carries a detector-honesty negative; mocks mirror the real `./font` surface | done |
| #10 input validation | the reducer IS the input boundary: hostile key-script fuzz (junk, non-ASCII, multi-char) with an exact trace; storage seam deliberately untouched (AC-4 — existing guards keep holding) | failing |
| Project: core purity | purity guard extended to `name-entry` (dist scan); per-game entry functions pinned deterministic, RNG-free, non-mutating, date-free | failing |
| n/a | #6 React (no .tsx), #7 async (probes awaited), #9 build-config (untouched), #11 error handling (no throwing paths in scope), #12 perf (no hot-path surface) | — |

**Rules checked:** 8 of 13 applicable checks have coverage; the rest have no surface in this diff.
**Self-check:** 0 vacuous tests found.

**Handoff:** To Julia (Dev) for GREEN. Read the Pinned GREEN surface in each test-file header plus the blocking Gap finding (the shared module + four re-pins). Sequence that avoids thrash: (1) `arcade-shared/src/name-entry.ts` + exports map + build → shared suite green, push the feat branch (already on origin); (2) re-pin all four games (provisional feat ref or the next tag per the SH-epic mechanics) → probes green; (3) asteroids (smallest: reducer delegation + Backspace + main.ts regex widens); (4) tempest (mechanism swap + entry slims to `{initials}` + render surgery for the dead cycling letter); (5) battlezone (Mode 'entry' + entryLines + timeout + shell letter forwarding); (6) star-wars (beginNameEntry/enterInitial/startPrev + name-entered event arm in main.ts's exhaustive switch + entry screen in render + `!e.repeat` on the latch). AC-5 manual runs at each game's pinned port close the loop.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `arcade-shared/src/name-entry.ts` (new) + `package.json` — the shared VERB: `stepNameEntry(buffer, key, maxLength)` (letters append UPPERCASED below max, Backspace deletes never past empty, everything else inert, no-op returns the same value); exported as the `./name-entry` subpath; joins the purity guard's pure fence. Pushed on the feat branch so games can resolve it.
- `asteroids,tempest,star-wars,battlezone/package.json`+locks — re-pinned to `@arcade/shared@github:...#feat/SH2-13-keyboard-highscore-entry` (provisional feat pin; tag+`SHARED_VERSION` bump at release — see finding).
- `asteroids/src/core/sim.ts` + `src/main.ts` — `enterInitial` delegates to the shared reducer (gains Backspace); `MAX_INITIALS` named; main.ts forwards Backspace.
- `tempest/src/core/{state,sim}.ts`, `src/shell/{render,loop}.ts`, `src/main.ts` — entry slims to `{ initials }`; `cycleLetter`/spin-arm deleted; `enterInitial` exported; fire edge commits the completed buffer; render draws typed slots + cursor + the new key-hint prompt; `Loop.dispatch` seam threads keydown events; main.ts wires letters+Backspace.
- `star-wars/src/core/{state,events,sim}.ts`, `src/shell/{input,render}.ts`, `src/main.ts` — `entry`+`startPrev` state; `name-entered` GameEvent; armed-entry-gated gameover branch with a rising-edge confirm; `beginNameEntry`/`enterInitial` exports; `!e.repeat` on the start latch; entry screen in drawGameOver; main.ts arms on the qualifying edge, forwards keys, and inserts+saves on the commit event ('ACE' gone).
- `battlezone/src/core/{state,sim,screens}.ts`, `src/main.ts` — Mode gains 'entry'; `entry` state field; `ENTRY_SECONDS = 15` timeout commits the buffer VERBATIM; `commitEntry`/`enterInitial`; `DEFAULT_INITIALS` deleted; `entryLines` in core screens; main.ts entry-mode key forwarding + screen picker.
- Pre-existing test caller-updates (logged as a deviation): battlezone `highscore-shared-contract.test.ts` (rides the entry screen; pins the auto-tag's death), battlezone `audio-dispatch.test.ts` (30 s ride bound), star-wars `events.test.ts` (14th variant per its own exhaustiveness contract).

**Tests:** 3771/3771 passing across all five repos (testing-runner RUN_ID `SH2-13-dev-green-2`; zero regressions). `tsc --noEmit` + `vite build` green in all four games; arcade-shared pretest build green.

**Manual run (AC-5):** all four games driven end-to-end headlessly (Playwright) against `just serve`:
- **asteroids** — played to a qualifying 630, GAME OVER / PLEASE ENTER YOUR INITIALS, typed K-A-X, Backspace, V (screen read KAV), held-Enter confirmed → `[{"name":"KAV","score":630,"wave":1}]` in `asteroids-high-scores`.
- **tempest** — qualifying 1050; gameover → Enter → NEW HIGH SCORE screen with typed slots + cursor + 'TYPE A-Z - BACKSPACE FIXES - FIRE TO CONFIRM'; same typo/fix flow; FIRE committed → `[{"name":"KAV","score":1050,"level":1}]`. No trace of the letter cycle.
- **star-wars** — qualifying 650; the brand-new entry screen (ENTER YOUR INITIALS, cursor, START CONFIRMS) over the frozen scene; typo/fix; start edge committed via the name-entered event → `[{"name":"KAV","score":650,"wave":1}]`.
- **battlezone** — TWO live cycles: an untended qualifying 2000 timed out on the entry screen and committed the empty buffer verbatim (board shows a nameless 2000 — the auto-cycle bound holds, nothing auto-tagged); a second run typed KAV (with Backspace fix) and the timeout committed it verbatim → `[{"name":"","score":2000},{"name":"KAV","score":1000}]`, both rendered on the attract board in descending order.
- Consoles clean in all four (only pre-existing favicon 404s). Lobby tile: verified at the CONTRACT level (see finding — cross-origin localStorage makes a live dev check impossible; unchanged seam).

**Branch:** `feat/SH2-13-keyboard-highscore-entry` in all five repos — clean trees, pushed, each 2 commits ahead of origin/develop.

**Handoff:** To the next phase (verify/review per workflow) — the diff spans five repos; The Thought Police should read the deviations (three sanctioned test caller-updates) and the provisional-pin finding before the release-time tag work.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
- **Note:** Prior related archives (SH2-5-session.md and SH2-6-session.md) and bz1-10's Delivery Findings contain relevant context for the entry mechanism design. Reviewer should read those before approval.
- **Note:** The entry mechanism helper must stay DOM-free (pure @arcade/shared module) and pass the purity guard scan of built dist/.

### TEA (test design)
- **Gap** (blocking): no game can resolve `@arcade/shared/name-entry` until Dev (1) creates `src/name-entry.ts` + the exports-map entry in arcade-shared and (2) RE-PINS all four games — tempest sits on `#v0.6.0`, asteroids/star-wars/battlezone on `#v0.7.0`, none of which carry the subpath. The arcade-shared feat branch is already pushed (games can take a provisional feat-ref pin, then tag+bump at release per the SH-epic mechanics; force stale locks with `npm install "@arcade/shared@github:slabgorb/arcade-shared#<ref>"`). The four isolated resolution probes fail until this lands. Affects `arcade-shared/package.json`+`src/`, and all four games' `package.json`+`package-lock.json`. *Found by TEA during test design.*
- **Improvement** (non-blocking): `SHARED_VERSION` in `arcade-shared/src/index.ts` STILL reads `'0.6.0'` at tag v0.7.0 (the SH2-6 finding, unfixed). When Dev cuts the tag that ships name-entry, bump it in lockstep — and note the ripple: battlezone's `tests/arcade-shared-pipe.test.ts` pins the runtime value (`0.6.0`) and will break on the re-pin; sibling pipe tests in the other games may pin it too. Dev updates those assertions as part of the re-pin (the SH2-6 precedent). Affects `arcade-shared/src/index.ts` + each game's pipe test. *Found by TEA during test design.*
- **Improvement** (non-blocking): battlezone's new `entryLines` copy lands inside the bz1-10 NFKC coin-op source audit's sweep of `core/screens.ts` — keep the prompt free of coin-op vocabulary ('ENTER YOUR INITIALS' is safe; anything COIN/CREDIT-flavoured fails the audit). Affects `battlezone/src/core/screens.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): tempest's shell renders the retiring `currentLetter` cycle on the entry screen — Dev's render surgery replaces it with the typed-buffer display (cursor/underscore styling is a per-cabinet NUMBER, eyeball-verified at :5273 per house convention; no unit pin exists or should). Affects `tempest/src/shell/render.ts` (or its screen module). *Found by TEA during test design.*
- **Improvement** (non-blocking): battlezone's shell must forward letter keydowns to `enterInitial` ONLY in entry mode — its tread keys ARE letters (E/D/I/K, F fires). The core is mode-guarded so nothing breaks if it forwards always, but the shell should gate on mode to avoid pointless per-keydown work; the manual run is the verification (shell convention). Affects `battlezone/src/main.ts` / `src/shell/input.ts`. *Found by TEA during test design.*
- **Note:** red-baron is OUT OF SCOPE (Wave-0 skeleton, epic-rb5 owns its entry); the lobby needs NO change (it reads only `score` through the unchanged highscore seam). *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): the four games now pin `@arcade/shared@github:slabgorb/arcade-shared#feat/SH2-13-keyboard-highscore-entry` — the PROVISIONAL feat-ref pin (the SH-epic mechanics). At release the shared repo needs a tag (v0.8.0), `SHARED_VERSION` bumped in lockstep (it still reads '0.6.0' — the SH2-6 finding, still unfixed), the four pins moved to the tag, and each game's `arcade-shared-pipe`-style version assertion updated to the new runtime value. Affects `arcade-shared/src/index.ts` + `package.json`, all four games' `package.json`+lock + pipe tests. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the AC-5 lobby-tile clause is only verifiable at the CONTRACT level in this environment: dev servers (and production subdomains) are separate origins, so the lobby's localStorage read cannot see another port's writes — a pre-existing property of the seam, untouched by this story (every persisted row passes the shared `isHighScoreRow` the lobby uses; pinned in each game's suites). A live lobby-tile eyeball needs a same-origin serving arrangement. Affects nothing in this story; epic-level note. *Found by Dev during implementation.*
- **Question** (non-blocking): asteroids' `start`/`fire` are LEVEL reads sampled per frame — a synthetic ~5 ms keystroke can fall between samples (discovered driving the manual run; humans can't type that fast). Harmless for players; worth knowing for future automated playtests. Affects nothing. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): Dev Assessment reports "3771/3771 passing"; preflight measured 3171 (215+758+812+606+780) across the five repos. The gate signal (all green, zero regressions) is identical — this is a reporting-arithmetic discrepancy only, but assessment numbers should be reproducible. Affects `.session/SH2-13-session.md` (Dev Assessment test count). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the 3-char convention is written twice per repo — core `MAX_INITIALS = 3` vs the literal `3` in the cursor logic (`battlezone/src/core/screens.ts:44` `initials.length < 3`, `star-wars/src/shell/render.ts` `buf.length < 3`). If a cabinet ever re-tunes its max, the cursor goes stale silently. A follow-up could thread the max into entryLines/drawGameOver or re-derive it from the buffer. Affects `battlezone/src/core/screens.ts`, `star-wars/src/shell/render.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `battlezone/src/core/screens.ts:9` header still says the screens carry "the game title, the board, and a plain press-start prompt — and nothing else" — entryLines now lives there too. The coin-op-descope intent survives (nothing money-shaped was added), but the "nothing else" clause is stale. Affects `battlezone/src/core/screens.ts` (one comment line). *Found by Reviewer during code review.*
- **Note:** the provisional `#feat/SH2-13-keyboard-highscore-entry` branch-ref pin (mutable, all four games) is confirmed as the established SH-epic mechanics; the release-time obligations (tag v0.8.0, `SHARED_VERSION` bump from '0.6.0', move four pins to the tag, update pipe-test assertions) are already captured in Dev's Gap finding above and MUST be executed at release. *Confirmed by Reviewer during code review.*

### SM (finish)
- **Conflict** (non-blocking, resolved): arcade-shared origin/develop moved mid-story — SH2-12 (extract `/pause` + `/esc-overlay`, tag v0.8.0, PR #9) and a v0.9.0 release landed while SH2-13 was in review, making PR #10 CONFLICTING. Resolved by Dev as a UNION merge of origin/develop INTO the feat branch (no rebase — the four games' lockfiles pin `82064f3`, which remains first-parent ancestor of merge tip `f810545`; branch kept alive on origin after squash-merge). 237/237 arcade-shared tests green post-merge. NOTE: earlier findings' "tag v0.8.0" is now stale — the next arcade-shared tag is v0.10.0 (or wherever the fleet is at release time). Affects the release-time re-pin plan only. *Found by SM during finish.*
- **Gap** (non-blocking): the arcade-shared release script does NOT sync `SHARED_VERSION` in `src/index.ts` with `package.json` version — develop carries package.json `0.9.0` vs `SHARED_VERSION '0.8.0'` (the v0.9.0 release commit `69a0da2` touched only package.json+lock). The SH2-6-class lockstep bump keeps recurring because the script omits it. Affects `arcade-shared` release tooling (the `just release` / `scripts/release.mjs` path) — fix the script, not the symptom. *Found by Dev during SH2-13 conflict resolution; logged by SM.*
- **Note:** all five PRs merged 2026-07-10 (~16:48Z) with user authorization (self-approval guardrail honored): arcade-shared #10, tempest #86, asteroids #35, star-wars #51, battlezone #26. Game feat branches deleted on merge; arcade-shared's kept alive for the provisional pins. Local checkouts synced to develop. *SM during finish.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **The shared helper's exact surface pinned by TEA: `@arcade/shared/name-entry` exporting `stepNameEntry(buffer, key, maxLength)` over DOM `KeyboardEvent.key` strings**
  - Spec source: context-story-SH2-13.md, AC-3
  - Spec text: "The shared mechanism lives in one place (extracted to @arcade/shared, kept pure so the purity guard passes)"
  - Implementation: RED tests pin a single pure reducer (key-string in, buffer out; 'Backspace' is a key, maxLength a parameter) plus the subpath/exports/purity registration — not just "a helper somewhere".
  - Rationale: failing tests need a concrete API; a key-string reducer is the smallest surface that keeps the VERB in one place while every NUMBER (max length, confirm key, styling, timeout) stays per-cabinet.
  - Severity: minor
  - Forward impact: Dev implements exactly this surface; renaming it means editing five repos' tests.
- **Per-game GREEN surface pinned: `enterInitial(state, key)` everywhere; star-wars adds `beginNameEntry`; battlezone adds Mode 'entry' + `entryLines`; tempest's entry slims to `{ initials }`**
  - Spec source: session ACs, AC-1/AC-3
  - Spec text: "the same keys type a character, Backspace deletes, and each game's existing confirm ... commits" — function names/state shapes unspecified
  - Implementation: asteroids' event-function pattern (typing rides keydown events, never the per-frame Input) is pinned cabinet-wide; each game's machine takes the shape native to it (asteroids' nested phase, tempest's mode+entry, battlezone's Mode extension, star-wars' armed-entry gate).
  - Rationale: the reference game already proves the pattern; per-game shapes follow each repo's existing state-machine idiom rather than flattening them.
  - Severity: minor
  - Forward impact: bz1-10's `waitForAttract` helper anticipated "any entry sub-state", so battlezone's existing framing suite survives unedited.
- **star-wars: the high-score table STAYS in the shell; the core announces the commit via a `name-entered` GameEvent**
  - Spec source: context-story-SH2-13.md AC-4 (storage seam unchanged) + star-wars' architecture
  - Spec text: "Entered names persist UNCHANGED through the existing @arcade/shared/highscore seam"
  - Implementation: tests pin an event-channel commit (core owns WHEN, shell owns HOW — the repo's own speech-cue ruling) instead of moving the table into core GameState for asteroids parity.
  - Rationale: least-change against the existing main.ts load/insert/save seam; moving the table into core is a refactor no AC demands. The shell's insert-on-event wiring is pinned by scan + manual run (house shell convention).
  - Severity: minor
  - Forward impact: main.ts's exhaustive GameEvent switch gains a `name-entered` arm (the `never` guard makes forgetting it a compile error).
- **battlezone: the entry timeout COMMITS the buffer verbatim — an untyped timeout records name `''`, never a constant**
  - Spec source: session AC-1 ("no longer auto-tag a constant") + bz1-10's TEA bound (no-input auto-cycle ≤ 30 s)
  - Spec text: neither source says what name a zero-input timeout records
  - Implementation: tests pin name === the typed buffer on EVERY commit path ('' included); the timeout magnitude itself is Dev's per-cabinet number inside the 30 s outer bound.
  - Rationale: "exactly what the player typed" is the only reading under which nothing is auto-tagged; the storage seam already accepts names of 0–3 chars and the lobby reads only `score`.
  - Severity: minor
  - Forward impact: none — the bz1-10 fold-in test (string name, finite score) holds.
- **asteroids' AC-4 held-confirm tests are GREEN INVARIANTS in RED**
  - Spec source: session AC-4
  - Spec text: "each game has a test that holding confirm across the entry-screen transition does not auto-advance"
  - Implementation: asteroids' `startPrev` shift register already satisfies the two new tests; they ride as guards on the mechanism swap rather than RED drivers (the SH2-6 "green invariant" convention), paired in-file with five failing Backspace/scan siblings.
  - Rationale: the AC demands the tests EXIST; inventing a failure where the reference behaviour is already correct would mean breaking the reference.
  - Severity: minor
  - Forward impact: Dev's reducer delegation must not regress the register — the guards bite if it does.
- **tempest: the letter-cycling contracts were DELETED, not repointed; star-wars gains a shell-latch `!e.repeat` scan beyond the AC's wording**
  - Spec source: session AC-1 (cycle retired); AC-4 (held confirm)
  - Spec text: "tempest's mousewheel/arrow letter-cycle entry is removed"; no explicit key-repeat clause
  - Implementation: the cycling/`charIndex`/`currentLetter` describes encode the reversed mechanism and died with it (replacement contracts live in the same reworked file, including a `cycleLetter` retirement scan). star-wars' start latch re-arms on OS key-repeat (no `!e.repeat` guard, unlike battlezone) — with a typed entry screen behind the same key that becomes the 6-2 class, so a source scan pins the guard.
  - Rationale: not-repointable tests follow the SH2-6 retirement precedent; the repeat scan is the only house-permitted shell pin (shells are verified by running).
  - Severity: minor
  - Forward impact: Dev adds `!e.repeat` to star-wars' latch; core-side startPrev covers the rest.
- **Visual/coordinate fidelity not unit-tested — deferred to Dev's manual run + Reviewer (house convention)**
  - Spec source: session AC-5
  - Spec text: "a manual run of each of the four games confirms you can type initials, Backspace corrects, the confirm commits, and the score ... appears on that game's board and in the lobby tile"
  - Implementation: tests pin MECHANISM + strings (battlezone entryLines content, star-wars' buffer-reaches-layoutText with a detector-honesty negative); no placement, styling, cursor, or prompt-copy pins.
  - Rationale: mirrors SH2-2/4/5/6 — the shell is verified by running; pixel pins over-couple and cannot run headless.
  - Severity: minor
  - Forward impact: Dev MUST manual-run all four games (typing, Backspace, confirm, board + lobby tile) — the SH2-5 [HIGH] class lives exactly in this deferred zone.

### Dev (implementation)
- **battlezone ENTRY_SECONDS pinned at 15 s**
  - Spec source: session AC-4 + bz1-10 TEA bound (session file, TEA deviations)
  - Spec text: "back to attract within 30 simulated seconds of NO input, entry sub-state included" — the timeout magnitude is Dev's per-cabinet number
  - Implementation: `ENTRY_SECONDS = 15` (3 s card + 15 s entry = 18 s, well inside the 30 s outer bound; generous for three initials).
  - Rationale: feel constant; long enough to type, short enough that the cabinet visibly cycles itself.
  - Severity: minor
  - Forward impact: none — playtest-tunable inside the 30 s bound.
- **tempest Loop gains a `dispatch(apply)` seam**
  - Spec source: TEA test (sim.highscore.test.ts shell wiring scan) + tempest loop architecture
  - Spec text: "the shell forwards keydown letters AND Backspace to enterInitial"
  - Implementation: tempest's loop encapsulates its state (unlike asteroids'/battlezone's module-level `let` or star-wars' shared-loop closure var), so keydown events had no path in; `Loop.dispatch(apply)` applies a pure core event function to the held state.
  - Rationale: the smallest seam that keeps state encapsulated; mirrors what main.ts already does with getState for persistence.
  - Severity: minor
  - Forward impact: any future keydown-edge core event (pause-menu actions, etc.) reuses the seam.
- **Three pre-existing test files updated outside TEA's RED set (the sanctioned caller-update class, SH2-6 pipe-test precedent)**
  - Spec source: the tests' own contracts
  - Spec text: battlezone `highscore-shared-contract.test.ts` pinned the auto-cycle folding "under the default initials"; star-wars `events.test.ts` pins exhaustiveness ("fails to compile if a further variant is ever added without updating callers"); battlezone `audio-dispatch.test.ts` rode gameover→attract in 4 s.
  - Implementation: capture-contract repointed to ride the entry screen (timeout commits '' verbatim — asserting the auto-tag's death); events suite gained the `name-entered` fixture/arm/count (13→14) its `never` guard demanded; audio ride bound extended to the bz1-10 30 s outer bound.
  - Rationale: each encoded the exact behaviour this story reverses, or is a designed compile-time tripwire whose whole purpose is to be updated with the union.
  - Severity: minor
  - Forward impact: none — all three keep their original contracts (lobby-readable rows, exhaustive event handling, no title-screen warble), observed through the new lifecycle.
- **star-wars entry screen suppresses the high-score board while armed**
  - Spec source: session AC-1 ("present a high-score name-entry screen")
  - Spec text: no layout specification (per-cabinet styling is a NUMBER)
  - Implementation: while the entry is armed, drawGameOver shows GAME OVER / SCORE / ENTER YOUR INITIALS / buffer+cursor / key hints, and defers PRESS START + the board to the post-commit screen.
  - Rationale: the board redraws one frame later with the new entry in place; showing it mid-entry would draw a stale ladder and crowd the question.
  - Severity: minor
  - Forward impact: none — eyeball-verified in the manual run.

### Reviewer (audit)
- **TEA: shared surface pinned as `stepNameEntry(buffer, key, maxLength)` over KeyboardEvent.key** → ✓ ACCEPTED by Reviewer: the smallest surface that centralizes the VERB; implementation at `arcade-shared/src/name-entry.ts:22-26` matches the pin exactly, purity guard extended.
- **TEA: per-game GREEN surface (`enterInitial` everywhere; star-wars `beginNameEntry`; battlezone Mode 'entry' + `entryLines`; tempest entry slims to `{ initials }`)** → ✓ ACCEPTED by Reviewer: each game's shape follows its own state-machine idiom; verified in all four sims.
- **TEA: star-wars table stays in the shell; core announces commit via `name-entered` GameEvent** → ✓ ACCEPTED by Reviewer: least-change against the existing load/insert/save seam; the exhaustive-switch `never` guard makes the new arm compulsory (verified at `star-wars/src/main.ts:181-190`).
- **TEA: battlezone timeout commits the buffer VERBATIM ('' when untyped)** → ✓ ACCEPTED by Reviewer: the only reading under which nothing is auto-tagged; `attractLines` renders a nameless row gracefully (`"  2000"`), confirmed in code and Dev's manual run.
- **TEA: asteroids AC-4 held-confirm tests are green invariants in RED** → ✓ ACCEPTED by Reviewer: agrees with author reasoning — inventing a failure would mean breaking the reference implementation.
- **TEA: tempest letter-cycling contracts DELETED not repointed; star-wars gains `!e.repeat` scan** → ✓ ACCEPTED by Reviewer: retirement precedent applies; the repeat guard verified present at `star-wars/src/shell/input.ts:35` and matches battlezone's latch discipline (verified against `battlezone/src/shell/input.ts`).
- **TEA: visual/coordinate fidelity deferred to Dev manual run + Reviewer** → ✓ ACCEPTED by Reviewer: house convention; Dev's four-game Playwright run covered the deferred zone (typing, Backspace fix, commit, board render) in all four games.
- **Dev: battlezone ENTRY_SECONDS = 15** → ✓ ACCEPTED by Reviewer: 3 s card + 15 s entry = 18 s, inside the bz1-10 30 s no-input outer bound with margin; playtest-tunable.
- **Dev: tempest Loop gains a `dispatch(apply)` seam** → ✓ ACCEPTED by Reviewer: smallest seam that keeps loop state encapsulated (`tempest/src/shell/loop.ts:113-115`); enterInitial never changes mode, so the seam cannot bypass the onModeChange persistence hook — commits still happen inside the frame step.
- **Dev: three pre-existing test files updated (sanctioned caller-update class)** → ✓ ACCEPTED by Reviewer: read all three diffs — each keeps its original contract (lobby-readable rows via `captureRun` now riding the entry screen; events exhaustiveness 13→14 exactly as its `never` guard demands; audio warble ride extended to the bz1-10 30 s outer bound).
- **Dev: star-wars entry screen suppresses the board while armed** → ✓ ACCEPTED by Reviewer: the board would draw a stale ladder mid-entry; post-commit screen shows it with the new row in place (`star-wars/src/shell/render.ts:848-858`).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 5 advisory anomalies | confirmed 0 as blockers; all 5 assessed by Reviewer (see assessment): 2 resolved as non-issues with code evidence, 3 folded into findings/notes |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly (boundary trace of reducer, timeouts, latches, startPrev staleness) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly (no swallowed errors; reducer is total; no catch blocks added) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly (AC-2/AC-4 test pairs verified in all four games; exact-trace + no-op-identity assertions; detector-honesty negative present) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly (1 stale comment found: screens.ts header, LOW) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly (readonly conventions per-repo verified; string-union Mode extension; no escapes) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly (input constrained to /^[A-Z]{0,3}$/ by construction; storage seam unchanged; no injection/XSS surface) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly (net-negative complexity in tempest; one LOW duplication: literal 3 vs MAX_INITIALS) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — Rule Compliance section below enumerates the TS lang-review checklist rule-by-rule |

**All received:** Yes (1 spawned + 8 disabled via settings; preflight returned clean with advisory notes)
**Total findings:** 3 confirmed (all LOW, non-blocking), 2 dismissed (with code-evidence rationale), 0 deferred

### Rule Compliance

Rules source: `.pennyfarthing/gates/lang-review/typescript.md` (no `.claude/rules/` dir, no SOUL.md in this repo). Enumeration over every new/changed type, function, and field in the five-repo diff:

- **#1 type-safety escapes** — COMPLIANT. Preflight grep of all added lines: zero `as any` / `as unknown as` / `@ts-ignore` / `@ts-expect-error` / non-null-assertions in src. Test files use the house loose-view narrowing with runtime existence assertions (`enterInitial!` after `expect(...).toBeDefined()`-class guards); `arcade-shared/tests/name-entry-source-rules.test.ts` pins the escapes ban as a source scan.
- **#2 generics/interfaces/readonly** — COMPLIANT. `battlezone/src/core/state.ts:71` `readonly entry: { readonly initials: string } | null` follows battlezone's readonly-GameState convention; star-wars `entry: { initials: string } | null` matches its repo's mutable-field idiom; `entryLines(): readonly string[]` matches its siblings; `stepNameEntry` is primitives-only (no generics needed). No `Record<string, any>`, no `Function` types.
- **#3 enums** — COMPLIANT. battlezone `Mode` stays a string union, extended with `'entry'` (`state.ts:39`); handled explicitly in `stepGame` (attract/gameover/entry branches + battle fallthrough) and in `renderFrame`'s screen picker. No new switch lacking exhaustiveness; star-wars' event switch HAS the `never` guard and gained the compulsory arm.
- **#4 null/undefined** — COMPLIANT. Every entry access is null-guarded: `state.entry !== null` (star-wars sim, battlezone sim), `!s.entry` (tempest), `over === null` (asteroids); `entry?.initials ?? ''` (battlezone commitEntry + render) uses `??` correctly — `''` is a VALID buffer value and `??` (not `||`) preserves it; tempest render checks `typed !== undefined` before drawing.
- **#5 module/declarations** — COMPLIANT. `exports["./name-entry"]` maps types+import to dist (pinned by test); extensionless relative imports match each repo's bundler-resolution house style; `NameEnteredEvent` exported alongside its sibling event interfaces in the same module as the union.
- **#6 React/JSX** — N/A (no .tsx in the diff).
- **#7 async/Promise** — N/A (no async code added; resolution probes await their dynamic imports).
- **#8 test quality** — COMPLIANT. No `as any` in assertions; the star-wars render pin carries a detector-honesty negative; shared-suite pins exact traces and no-op value identity, not just bounds; mocks mirror the real `./font` surface (TEA self-check: 0 vacuous).
- **#9 build/config** — COMPLIANT. No tsconfig/vite config touched; strictness unchanged; `tsc --noEmit` green in all four games.
- **#10 input validation** — COMPLIANT. The reducer IS the input boundary: every persisted name is constrained to `/^[A-Z]{0,3}$/` by construction (hostile-key fuzz test with exact trace); the storage seam and its row guards are deliberately untouched (AC-4); no `JSON.parse as T` added.
- **#11 error handling** — COMPLIANT (vacuously). No throwing paths, no catch blocks, no error types in scope; the reducer is a total function over all string inputs.
- **#12 performance/bundle** — COMPLIANT. Subpath imports (no barrel); keydown handlers do O(1) work; battlezone gates its listener on `mode === 'entry'` to spare per-keydown work (the TEA Improvement, implemented).
- **#13 fix-regressions** — N/A (no fix cycle in this review).
- **Project rule: core purity (ADR-0003)** — COMPLIANT. `name-entry` joins `PURE_SUBPATHS` in the dist-scanning guard; per-game shared-import sweeps pin that core imports only pure subpaths; no clock/randomness in any new core code (asteroids' commit still builds the entry WITHOUT a date, `sim.ts:219-221`).

### Devil's Advocate

Assume this five-repo change is broken; where would the body be buried? First: the trapped player. star-wars' armed entry GATES the game-over exit — a player who refuses to enter initials can never leave except by typing three letters. There is no skip and no timeout. Tempest is the same (fire is inert until the buffer is full, start is inert during entry). If a player walks away mid-entry on star-wars, the cabinet parks forever — but that is exactly what the PRE-EXISTING gameover screen already did (it waited for start indefinitely), so no attract-cycle regression was introduced; battlezone, the game with an auto-cycle contract, is the one that got the timeout. Verified non-issue, but the UX asymmetry is real and deliberate (deviation accepted). Second: the malicious typist. Hold Backspace — OS key-repeat fires repeatedly; the reducer floors at empty. Hold 'A' — the buffer fills to max and further repeats are inert no-ops that return the same state reference. Mash Escape during battlezone entry — pause freezes the timeout, but Escape IS input, so the bz1-10 no-INPUT bound is not violated; resume continues the countdown. Type 'E'/'D'/'I'/'K' as initials in battlezone — the tread down-set does populate, but the entry branch of stepGame reads only `input.start`, so treads cannot fire; on the post-commit new run, any stale down-set keys mirror physically-held keys and clear on keyup. Third: the stale register. star-wars' `startPrev` is only updated on gameover frames — after a commit it stays `true` through attract and the whole next run. Could it eat the first confirm of the NEXT entry? No: the next entry needs three keydowns to complete, and every intervening gameover frame refreshes `startPrev` from the (unlatched, false) input first. Fourth: the lost score. star-wars now persists only on the commit event, not on the gameover edge — close the tab mid-entry and the score dies. True — and identical to the asteroids reference behavior; battlezone's timeout covers the untended cabinet. Fifth: the empty name. A battlezone timeout commits `{ name: '', score }` — `isHighScoreRow` accepts it, `attractLines` renders it as a leading-space row, the lobby reads only `score`. Confirmed working in Dev's live run. Nothing here rises above LOW.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** DOM `keydown` ('a') → per-game main.ts listener (`/^[a-zA-Z]$/ || 'Backspace'`) → pure core event function `enterInitial(state, key)` → shared reducer `stepNameEntry` (appends 'A' iff below max; output constrained to `/^[A-Z]{0,3}$/` by construction) → `entry.initials` → renderer draws buffer+cursor → confirm edge (tempest fire-rising+complete `sim.ts:62`; asteroids start+complete; star-wars start-rising via startPrev + complete; battlezone start-latch+complete or 15 s timeout) → `insertHighScore` (pure, descending) → shell persists through the UNCHANGED `@arcade/shared/highscore` storage seam → board + lobby (reads only `score`). Safe because the charset/length invariant is enforced at the single shared boundary and no storage schema, key, or guard changed.

**Pattern observed:** the "core owns WHEN, shell owns HOW" event-function pattern applied uniformly — typed letters are edge events that bypass the per-frame Input sample in all four games (e.g. `asteroids/src/main.ts:66-68`, `tempest/src/main.ts:83-91` via the new `Loop.dispatch` seam, `battlezone/src/main.ts:121-129` mode-gated, `star-wars/src/main.ts:103-110`), with reference-compare no-ops (`if (initials === over.initials) return state`) preserving state identity in all four sims. Good pattern, consistently executed.

**Error handling:** no throwing paths added; the reducer is a total function (any string key, any buffer, any maxLength — traced boundaries: empty+Backspace → same `''`, maxLength 0 → permanently inert letters, buffer already over max → letters inert / Backspace works). Null-guards on every `entry` access (`star-wars/src/core/sim.ts:333`, `battlezone/src/core/sim.ts:283`, `tempest/src/core/sim.ts:57`, `asteroids/src/core/sim.ts:249-251`).

**Observations (tagged by domain; specialists disabled via settings, domains covered directly):**

1. [VERIFIED] AC-1: all four games present typed entry; retirement sweeps clean — tempest src has ZERO `cycleLetter`/`charIndex`/`currentLetter` hits; star-wars' quoted-'ACE' scan passes scoped to main.ts where the auto-tag lived (`tests/core/name-entry.test.ts:227-229`); battlezone `DEFAULT_INITIALS` deleted from src (only historical comments remain). Complies with AC-1 text and the comment-inclusive scan convention.
2. [EDGE] [VERIFIED] AC-4 commit is edge-triggered in all four games with the held-across-transition case tested in each: tempest `sim.ts:62` requires fire-rising AND complete buffer, register updated unconditionally every frame (`sim.ts:772`); star-wars requires start-rising via `startPrev` with the stale-register-across-runs case self-healing on the first gameover frame; battlezone's arrival-latch with short buffer is consumed inert; asteroids' `startPrev` shift register guarded by green invariants.
3. [SILENT] [VERIFIED] no swallowed errors introduced — zero new catch blocks, zero silent fallbacks; the one `?? ''` (battlezone `commitEntry`) is a typed-null default on a field that is structurally non-null in 'entry' mode, and the VERBATIM-commit semantics it serves are the story's explicit AC ("never auto-tag").
4. [TEST] [VERIFIED] AC-2's required test pair (Backspace deletes + cannot delete past empty) exists in all four games (asteroids:56, tempest:162, star-wars:138, battlezone:168) plus the shared suite; the shared suite pins exact traces and no-op value identity, not just invariant bounds.
5. [DOC] [LOW] `battlezone/src/core/screens.ts:9` header claims the screens module carries "…and nothing else" — stale now that `entryLines` lives there. One comment line; non-blocking.
6. [TYPE] [VERIFIED] per-repo type conventions held: battlezone's new state field is deep-readonly per its convention; tempest's `HighScoreEntryState` slimmed with the dead fields actually deleted (tsc green proves no stragglers); the `name-entered` event arm is compiler-compulsory via the existing `never` guard.
7. [SEC] [VERIFIED] input boundary is the shared reducer: persisted names are `/^[A-Z]{0,3}$/` by construction (hostile-key fuzz with exact trace); no innerHTML/eval surface (canvas stroke text); localStorage seam and row guards unchanged (AC-4). Tenant isolation N/A — no backend, no tenant data, single-origin localStorage per game.
8. [SIMPLE] [VERIFIED-with-nit] tempest's diff is net-NEGATIVE complexity (cycle machine deleted, entry state slimmed); the one duplication found: literal `3` in cursor logic (`battlezone/src/core/screens.ts:44`, `star-wars/src/shell/render.ts:851`) shadows core `MAX_INITIALS`. [LOW], logged as a Delivery Finding.
9. [RULE] Rule Compliance section above: 13/13 TS lang-review checks enumerated, 10 compliant, 3 N/A, 0 violations; core-purity project rule verified via the extended dist-scanning guard.
10. [LOW] Dev Assessment's "3771/3771" vs preflight's measured 3171 — reporting arithmetic only; the green signal is identical. Logged as a Delivery Finding.

**Preflight anomaly dispositions:** (1) branch-ref pin → confirmed SH-epic mechanics, release obligations already captured in Dev's Gap finding; (2) star-wars "battlezone latch discipline" claim → verified TRUE against `battlezone/src/shell/input.ts` (`!e.repeat` one-shot latch, same semantics); (3) tread down-set during entry → verified non-issue with code evidence (entry branch reads only `input.start`); (4) blank-name rendering → verified graceful in `attractLines` + Dev's live run; (5) attention asymmetry → honored (star-wars/battlezone got the deepest trace).

**Challenged VERIFIEDs:** each VERIFIED above cites line-level evidence and was cross-checked against preflight's five anomalies (the only subagent findings) and the TS lang-review rules — no contradictions stand; the two soft contradictions found (stale header comment, duplicated literal) were DOWNGRADED to findings rather than dismissed.

**Handoff:** To Winston Smith (SM) for finish-story. NOTE for finish: PRs target each game repo's `develop` (gitflow); the release-time tag work (v0.8.0 + SHARED_VERSION bump + four pin moves + pipe-test assertions) rides Dev's logged Gap finding, not this story's merge.