---
story_id: "mc6-2"
jira_key: "mc6-2"
epic: "mc6"
workflow: "tdd"
---
# Story mc6-2: SETUP -> PLAY start-of-game: a start/coin action advances attract|over -> setup -> play, reseeding createGame (6 live cities, 3 bases full ammo, wave 1 schedule). REV-01 W3MAIN.MAC:561 SETUP

## Story Details
- **ID:** mc6-2
- **Jira Key:** mc6-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 3
- **Repos:** arcade
- **Branch:** feat/mc6-2-setup-play-start-of-game
- **PR:** https://github.com/slabgorb/arcade/pull/165
- **Epic:** mc6 (Missile Command — attract + state machine + pause (REV-01): the full MAINLINE attract/setup/play/pause loop)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-09T19:19:12Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-09T18:26:25Z | 2026-08-09T18:30:25Z | 4m |
| red | 2026-08-09T18:30:25Z | 2026-08-09T18:45:57Z | 15m 32s |
| green | 2026-08-09T18:45:57Z | 2026-08-09T18:52:24Z | 6m 27s |
| review | 2026-08-09T18:52:24Z | 2026-08-09T19:05:58Z | 13m 34s |
| green | 2026-08-09T19:05:58Z | 2026-08-09T19:10:10Z | 4m 12s |
| review | 2026-08-09T19:10:10Z | 2026-08-09T19:19:12Z | 9m 2s |
| finish | 2026-08-09T19:19:12Z | - | - |

## Delivery Findings

### Reviewer (code review)
- **Gap** (blocking): `MC-STATE-INIT` claim `meaning` overreaches its citation — attributes boot-to-attract to `:135` (the ATRACT flag declaration) when the actual attract-mode write is `W3MAIN.MAC:3761` (`STA ATRACT`) inside PREGM1, reached via cold-boot `SETUPC=CPRGM1` (`:487-489`). Affects `docs/rom-study/claims/state.json` (narrow the meaning / re-cite the PREGM1 chain). *Found by Reviewer during code review.*
- **Gap** (blocking): "the NEWGAM reseed" over-attributes the ammo refill + ICBM budget to NEWGAM; those are NEWWV1's work (`:4021 LDA I,MAXMIS`; NEWGAM `:3835-3891` requests `CNEWAV`→NEWWV1). Affects `src/core/game.ts` (startGame JSDoc) and `src/shell/input.ts` (fireOrStart JSDoc). *Found by Reviewer during code review.*
- **Improvement** (blocking): rule-30 JSDoc-number leak — startGame JSDoc's bare "6 … 3 …" pass the un-cited-literal gate only by NCITY/NMISBA coincidence. Affects `src/core/game.ts` (move digits to the `//` block or reword). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): test-strength gaps (test-analyzer) — seed-threading unpinned (all fixtures seed=1; but spec-optional per RED ruling), and `expectFreshPlayGame`'s abms/explosions/sputniks + multiplier/citiesLost assertions aren't exercised by a dirty fixture (impl delegates wholesale to createGame, so no live defect). Affects `plugins/missile-command/tests/start-of-game.test.ts` — optional TEA hardening if the epic wants it; owner: future mc6 test pass. *Found by Reviewer during code review.*
- **Round 2 (re-review):** No new upstream findings — all four round-1 blocking findings resolved in rework commit `04972aa8` and independently re-verified against the ROM; all gates green. *Found by Reviewer during code review.*

### Dev (implementation)
- **Gap** (non-blocking): TEA's anchor-claim table specified `symbol: S.SETU` and an open-ended `value` string, but two pre-existing gates constrain both fields. `state-mainline.test.ts:296` (mc6-1 AC7) demands every `S.SETU`-symboled claim cite `W3COMN.MAC`, and `citations-source.test.ts:280` demands every non-EQU claim value be a kind tag. Affects `docs/rom-study/claims/state.json` (filed `MC-STATE-INIT` with a distinct symbol + `value: "cite"`; see Design Deviations). *Found by Dev during implementation.*

## Design Deviations

### Dev (implementation)
- **MC-STATE-INIT claim symbol is `S.SETU (cold-start boot)`, not TEA's suggested `S.SETU`**
  - Spec source: TEA Assessment §"The contract GREEN (Loki) implements" anchor table, row `MC-STATE-INIT | S.SETU (boot)`
  - Spec text: "| `MC-STATE-INIT` | `S.SETU` (boot) | `W3MAIN.MAC:491` | `\tLDA I,S.SETU` |"
  - Implementation: filed with `"symbol": "S.SETU (cold-start boot)"` (verbatim + line unchanged, byte-verified)
  - Rationale: mc6-1's AC7 (`state-mainline.test.ts:296`) iterates EVERY loaded claim whose `symbol === 'S.SETU'` and asserts `source.file === 'W3COMN.MAC'`. A new claim citing `W3MAIN.MAC:491` under the bare `S.SETU` symbol reddens that pre-existing test. A distinct symbol (strict-equality filter) avoids the collision; mc6-2 AC6 only requires a non-empty string symbol.
  - Severity: minor
  - Forward impact: none — the verbatim/line/meaning are unchanged; only the display symbol differs.
- **Both anchor claims carry `value: "cite"` (a kind tag), not a free-form value string**
  - Spec source: TEA Assessment §"The contract GREEN (Loki) implements" point 3
  - Spec text: "`value` may be a string/anchor (the mc claim shape allows `number | string`)"
  - Implementation: `MC-STATE-INIT` and `MC-SETUP-NEWGAM` both use `"value": "cite"`
  - Rationale: `citations-source.test.ts:280` requires every NON-EQU claim (verbatim has no `=` RHS) outside the `DERIVED` set to carry a value that is exactly a kind tag `'anchor' | 'cite' | 'external'` — a free-form string reddens it. Both new verbatims (`LDA I,S.SETU`, `.WORD NEWGAM-1`) are non-EQU instruction/data sites (not `.SBTTL` section headers), so `'cite'` is the correct tag (matching e.g. `MC-HISCORE-INITIALS`).
  - Severity: minor
  - Forward impact: none — kind-tag values are excluded from the un-cited-literal guard's `claimedValues` set by design.

### Reviewer (audit)
- **MC-STATE-INIT symbol `S.SETU (cold-start boot)` vs TEA's `S.SETU`** → ✓ ACCEPTED by Reviewer: verified — `state-mainline.test.ts:296` iterates every `symbol === 'S.SETU'` claim asserting `source.file === 'W3COMN.MAC'`; a distinct symbol is the correct (and only clean) way to avoid reddening that pre-existing mc6-1 gate. Byte-verbatim + line unchanged.
- **Both anchor claims `value: "cite"`** → ✓ ACCEPTED by Reviewer: verified — `citations-source.test.ts:280` requires every non-EQU claim value to be a kind tag; both new verbatims (`LDA I,S.SETU`, `.WORD NEWGAM-1`) are instruction/data sites, not `.SBTTL` anchors, so `'cite'` is the correct tag (matches `MC-HISCORE-INITIALS`).
- **UNDOCUMENTED (Reviewer-found), routed to green rework → NOW RESOLVED:** the `meaning`/JSDoc prose overreached the ROM in three places (MC-STATE-INIT "attract" citing `:135` not the PREGM1 chain; "the NEWGAM reseed" attributing ammo+budget to NEWGAM not NEWWV1, in game.ts + input.ts). Fixed in rework commit `04972aa8` and re-verified against source (R2 comment-analyzer + rule-checker clean). See Reviewer Assessment.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | R1 green; **R2 re-run on rework: still green** (1031 MC + 455 orchestrator + tsc + 212 citations + un-cited-literal 20/20) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (phase-coverage + degenerate-seed + name-entry-collision analysis + mutation battery M1/M2) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (no-op is intentional, not a swallowed error) |
| 4 | reviewer-test-analyzer | Yes | findings | 6 | 6 non-blocking (impl delegates wholesale to createGame; seed-threading spec-OPTIONAL per RED ruling). Test file UNTOUCHED in rework → **carried forward unchanged** |
| 5 | reviewer-comment-analyzer | Yes | findings | 3→0 | R1: 3 CONFIRMED (ROM-verified) → rework. **R2 re-run on rework: all 3 RESOLVED, status clean, no new overreach** (re-derived CPRGM1→PREGM1 and CNEWAV→NEWWV1 chains) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (clean signatures, Phase union type-safe, readonly GameState) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (no injection/auth/secret surface; local keydown string) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (fireOrStart's phase re-check is necessary for routing, not redundant) |
| 9 | reviewer-rule-checker | Yes | findings | 1→0 | R1: 1 CONFIRMED (rule 30) → rework. **R2 re-run on rework: rule 30 RESOLVED** (`gameLiterals()` scan of startGame JSDoc returns `[]`), no new violation, confirmed comment/doc-only change |

**All received:** Yes (4 enabled returned R1; preflight + comment-analyzer + rule-checker re-run R2 on the rework diff; test-analyzer carried forward — test file untouched)
**Total findings:** R1 → 4 confirmed (routed to rework) + 6 non-blocking; **R2 → all 4 confirmed RESOLVED & re-verified, 0 open**

## Reviewer Assessment

**Verdict:** APPROVED (round 2 — after green rework resolved the round-1 findings)

Round 1 REJECTED on four ROM-fidelity **prose-precision** defects (a permanent dossier claim `meaning` + two src doc-comments + a latent citation-scanner leak) — code correctness itself was solid and mutation-proven throughout. Dev's green rework (commit `04972aa8`, prose-only) fixed all four; I re-verified every fix independently against the vendored ROM and re-ran preflight + comment-analyzer + rule-checker on the rework diff — **all clean, 0 open findings**.

**Round-1 findings — all RESOLVED & re-verified (ROM-cited):**

| Severity | Issue (round 1) | Location | Resolution (round 2, re-verified) |
|----------|-------|----------|--------------|
| [MEDIUM] `[DOC]` | `MC-STATE-INIT` meaning grafted "comes up in attract" onto `:135` (flag *declaration*), which doesn't establish the boot value. | `docs/rom-study/claims/state.json` | ✓ FIXED: meaning now proves SETUP via `:491/:493` and cites the real attract chain `SETUPC=CPRGM1` (`:487-489`) → PREGM1 (`:3761 STA ATRACT`); `:135` framed as flag semantics. Re-verified: `CPRGM1=0x14` (W3COMN:89) indexes SETUP1 entry `PREGM1-1` (`:603`); `:3761` is inside PREGM1's body. Verbatim/line unchanged → check-citations 212/212. |
| [MEDIUM] `[DOC]` | "the NEWGAM reseed …full ammo…ICBM budget" mis-attributed ammo+budget to NEWGAM (those are NEWWV1's). | `src/core/game.ts` (startGame comment/JSDoc) | ✓ FIXED: re-attributed to the NEWGAM→NEWWV1 SETUP chain (NEWGAM `:3835` sets lives/wave 1 → requests `CNEWAV`→NEWWV1 `:3903`; NEWWV1 refills magazines `:4021` + seeds the ICBM schedule). Re-verified against source. |
| [MEDIUM] `[DOC]` | Same NEWGAM over-attribution in input.ts. | `src/shell/input.ts` (fireOrStart JSDoc) | ✓ FIXED: "the NEWGAM->NEWWV1 SETUP reseed" — consistent with game.ts, no drift. |
| [LOW] `[RULE]` | Rule 30 — startGame JSDoc's bare "6 … 3 …" leaked past `gameLiterals()` (passes only by NCITY/NMISBA coincidence). | `src/core/game.ts` (startGame JSDoc) | ✓ FIXED: reworded to named-constant/qualitative prose ("every city and base live, magazines full …"); `gameLiterals()` scan of the JSDoc now returns `[]`. |

**Data flow traced:** `KeyboardEvent.key` → `main.ts` `fireOrStart(event.key, game)` → (fire key ∧ attract|over) `startGame` → `createGame(state.rng.seed)`; else `fireFromKey`. Safe: a fire key in play launches an ABM (never wipes the board), a non-fire key is a no-op. Mutation battery M4/M5 confirm both routing arms have teeth.

**Pattern observed:** pure `src/core` transition delegating wholesale to `createGame` (`game.ts:155`) — the correct, minimal model; no field can be missed on reseed.

**Error handling:** no error paths added; the no-op return for non-start phases is intentional (AC3), not a swallowed failure `[SILENT]`.

**Rule Compliance (`### Rule Compliance`):**
- `[TYPE]` startGame/fireOrStart signatures are `(…): GameState` over a fully-`readonly` GameState; Phase is a string-literal union (no stringly-typed API); no `as any`/double-cast. Compliant.
- `[SEC]` no injection/auth/secret/tenant surface — `key` is a local desktop keydown string, same contract as the pre-existing `fireFromKey`. Compliant.
- `[SIMPLE]` fireOrStart's `(attract|over)` re-check is NOT redundant with startGame's guard — it routes a fire key in *play* to `fireFromKey` (which startGame would no-op). Necessary. Compliant.
- `[EDGE]` all 6 Phase values covered (start: attract/over; no-op: play/pause/between/setup); degenerate/advanced/zero seed safe (`createRng` does `seed >>> 0`); no name-entry phase exists to collide with "press fire to start". Compliant.
- `[RULE]` `.js` import extensions present; purity green (startGame pure); the round-1 JSDoc-number leak is now RESOLVED (rule 30). All instances compliant.

**Verifieds challenged against subagents:** my "purity/correctness VERIFIED" is not contradicted by any subagent — comment-analyzer and rule-checker (both R1 and R2) confirm startGame is pure and logically correct; their round-1 findings were strictly about prose fidelity and are all resolved in the rework. `[TEST]` test-analyzer's 6 findings are genuine test-STRENGTH notes (seed-threading unpinned; abms/explosions/sputniks/multiplier/citiesLost not dirtied) but describe no code defect — the impl delegates wholesale to createGame, and TEA's RED ruling explicitly permits a plain `createGame()` (seed-threading not required). Filed non-blocking (owner: future mc6 test pass); not a rework trigger.

### Devil's Advocate
Could this ship broken? The reseed reads `state.rng.seed` — at runtime an `'over'` state reached by real play carries an *advanced* uint32 seed, so `createGame(that)` yields a fresh-but-different enemy sequence each restart. Is that a bug? No — it's deterministic, valid (6 cities/3 bases/wave 1 regardless of seed), and arguably more faithful than a fixed replay; TEA sanctioned either. Could a stressed player double-tap fire at the game-over instant and get a half-reset? No — `startGame` returns a whole fresh object atomically; there is no intermediate state. Could "press fire to start" swallow a legitimate ABM launch? Only in attract/over, where there are no bases to fire from — in play, the fire key still routes to `fireFromKey` (mutation M4 proves removing that routing reddens the fire-in-play test). What about a future phase added to the union? test-analyzer's finding #5 is right that a new phase escapes both the start-list and no-op-list silently — but that's a test-maintenance note, not a live defect (no such phase exists). What if `state.rng` were somehow absent? It's a non-optional `readonly Rng` field; tsc guarantees presence. The one real, if minor, hazard is the JSDoc-number leak (rule 30): a landmine for a *future* editor who adds an unclaimed number to a core JSDoc and gets a misleading "un-cited literal" pointing at prose — worth removing now. Net: no correctness break; the rework is fidelity-hygiene on prose this story owns.

**Handoff:** To SM (Baldur the Bright) for finish-story. All round-1 findings resolved and re-verified; all gates green (1031 MC + 455 orchestrator + tsc + 212 citations + un-cited-literal). Non-blocking test-strength notes filed for a future mc6 test pass.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/missile-command/src/core/game.ts` — added pure `startGame(state)`: reseeds a fresh `'play'` game via `createGame(state.rng.seed)` when `phase` is `'attract'|'over'`, else returns `state` unchanged (the SETUP NEWGAM edge, W3MAIN.MAC:583/:3835). No new numeric literal, no clock/entropy.
- `plugins/missile-command/src/shell/input.ts` — added `fireOrStart(key, state)`: routes a fire key to `startGame` when not running (`attract|over`), else delegates to `fireFromKey`; imports `startGame` from `../core/game.js`.
- `plugins/missile-command/src/main.ts` — keydown handler now calls `fireOrStart(event.key, game)` instead of `fireFromKey` ("press fire to start").
- `plugins/missile-command/docs/rom-study/claims/state.json` — filed the two anchor claims `MC-STATE-INIT` (W3MAIN.MAC:491, boot cold-start) and `MC-SETUP-NEWGAM` (W3MAIN.MAC:583, the SETUP1→NEWGAM new-game task). Both verbatims byte-verified against the vendored REV-01 source; `value: "cite"` and distinct symbols per the two gate constraints (see Deviations).

**Tests:** 1031/1031 passing (GREEN) across all 58 missile-command test files — story suite `start-of-game.test.ts` 22/22, 0 regressions. `npm run lint` (tsc --noEmit, repo-wide) clean. `check-citations.mjs` 212 claims verified. `node scripts/build-app.mjs missile-command` builds clean (confirms the `main.ts`/`input.ts` shell wiring TypeScript-compiles, since vitest doesn't cover `main.ts`).

**Branch:** feat/mc6-2-setup-play-start-of-game (pushed)

**Handoff:** To verify/review phase.

### Rework round 1 (green, post-review) — prose/fidelity only, no logic or test change

Addressed all four blocking Reviewer (Heimdall) findings, each ROM-verified:
- **`docs/rom-study/claims/state.json` — `MC-STATE-INIT` meaning** narrowed: `:491/:493` now framed as proving only STATE=S.SETU (boot into SETUP); the attract half re-cited to the real chain `SETUPC=CPRGM1` (`:487-489`) → PREGM1 `:3761 STA ATRACT`, with `:135` correctly framed as the flag's semantics only. Verbatim + `source.line` (491, `\tLDA I,S.SETU`) unchanged — `check-citations` still 212/212.
- **`src/core/game.ts` — startGame `//` block + JSDoc** re-attributed the reseed to the NEWGAM→NEWWV1 SETUP chain (NEWGAM sets lives/wave 1 → requests NEWWV1; NEWWV1 refills magazines `:4021` + seeds the wave-1 ICBM schedule), and reworded the JSDoc field list to drop the bare `6`/`3`/`0` literals (rule-30 leak) — the numbers now live only in the comment-stripped `//` block / as named constants.
- **`src/shell/input.ts` — fireOrStart JSDoc** softened "the SETUP NEWGAM reseed" → "the NEWGAM->NEWWV1 SETUP reseed".

Re-verified: full MC suite 1031/1031, `npm run lint` clean, `check-citations` 212/212, un-cited-literal gate green (startGame JSDoc no longer leaks a bare game-constant). Non-blocking test-strength findings left as filed (spec-optional per RED ruling; impl delegates wholesale to createGame).

## Tea Assessment

Handing to Dev (Loki Silvertongue) for GREEN.

**Test file:** `plugins/missile-command/tests/start-of-game.test.ts` (new, additive, 22 tests).

**RED signal:** 22 failed in the new file / **1009 passed across the other 57 MC test files — 0 regressions**; `npm run lint` (tsc --noEmit) clean. Every failure is the FEATURE's absence: `startGame`/`fireOrStart` are reached through self-describing dynamic-import loaders (the state/field/icbm idiom), and the two anchor claims are unfiled.

### Ruling adopted at RED (user, this session)
Following the mc6-1 O-6a precedent (this epic rules phase-model shape at RED), the user chose the **minimal reseed edge** over the full SETUP task machine, and "press fire to start" (no coin logic):
- Pure `startGame(state)` reseed; `'setup'` is the transient logical step, **no SETUPC/SETUP1 dispatch machine** here (deferred).
- `createGame` **keeps booting to `'play'`** — boot-to-attract is mc6-4 — so the 17 combat/wave suites that call `createGame()` stay green untouched.
- Trigger is the Z/X/C **fire keys** via a shell `fireOrStart`, mirroring the existing `fireFromKey` seam.

### The contract GREEN (Loki) implements — PURE, minimal
1. **`src/core/game.ts` — `export function startGame(state: GameState): GameState`.**
   When `state.phase === 'attract' || state.phase === 'over'`, return a fresh, fully-defended game in phase `'play'` (reuse `createGame`'s field — 6 live cities, 3 bases at `MAXMIS`, no enemies, score 0, wave `INITIAL_WAVE`, budget `NICBMS`, frame 0). For **every other phase, return `state` unchanged** (a start mid-game must not wipe the board). Suggested body: `(state.phase === 'attract' || state.phase === 'over') ? createGame(state.rng.seed) : state`. **Purity:** no `Date.now`/`Math.random`/clock. Threading `state.rng.seed` (or a plain `createGame()`) both satisfy the tests — pick a pure one; do NOT introduce entropy. `purity.test.ts` must stay green.
2. **`src/shell/input.ts` — `export function fireOrStart(key: string, state: GameState): GameState`.**
   `return fireKeyToBase(key) !== null && (state.phase === 'attract' || state.phase === 'over') ? startGame(state) : fireFromKey(key, state)`. Then wire **`src/main.ts:50`** to call `fireOrStart(event.key, game)` instead of `fireFromKey(...)`. (Import `startGame` into input.ts from `../core/game.js`.)
3. **Two anchor claims** in `docs/rom-study/claims/` (extend `state.json` or add a file — `check-citations.mjs` byte-verifies each `source.verbatim` against the vendored REV-01 source, so copy the bytes EXACTLY, tabs included):

| id | symbol | source (physical line) | verbatim (exact bytes — `\t` = TAB) |
|----|--------|------------------------|-------------------------------------|
| `MC-STATE-INIT` | `S.SETU` (boot) | `W3MAIN.MAC:491` | `\tLDA I,S.SETU` |
| `MC-SETUP-NEWGAM` | `NEWGAM` | `W3MAIN.MAC:583` | `SETUP1:\t.WORD NEWGAM-1\t\t;NEW GAME` |

   `MC-STATE-INIT` meaning: cabinet cold-starts by writing `S.SETU` to `STATE` with `ATRACT` on (`:491 LDA I,S.SETU` / `:493 STA STATE` / `:135` ATRACT `;ATTRACT (0)/GAME (-1) FLAG`) — boots to SETUP/attract. (Deferred to mc6-2 by mc6-1.) `MC-SETUP-NEWGAM` meaning: the first SETUP task `NEWGAM` (`:3835`), reached via `SETUP1: .WORD NEWGAM-1` (`:583`), seeds a new game on wave 1 — the reseed `startGame` performs. `value` may be a string/anchor (the mc claim shape allows `number | string`); ROM lines cited in `//` comments only, never JSDoc (the citation-scanner leak). `startGame` reuses `createGame` and introduces **no new numeric literal**, so the un-cited-literal gate should not newly redden.

### Rule coverage (lang-review / project rules)
- **Purity** (`purity.test.ts` + AC4): `startGame` is a pure `src/core` transition — behavioral determinism + no-mutate pinned; the scanner covers the source text.
- **Exhaustiveness:** AC1/AC2 (attract, over → reseed) + AC3 (play/pause/between/setup → no-op) cover **all six phases** — a stray phase must not silently reseed.
- **Citations / fidelity** (`citations.test.ts` + `citations-source.test.ts`): AC6 pins both anchor claims' presence + shape; source byte-verify is enforced by the existing gate once filed.
- **Test quality (rule #18):** AC5's routing equality (`fireOrStart === startGame`) is NOT self-referential — different modules — and is backed by independent literal `expectFreshPlayGame` pins; no vacuous assertions (self-checked).
- **Regression:** 0 regressions — `createGame`/`stepGame`/mc3/mc4 untouched by design.

### Reachability (say this to Dev + Reviewer)
`createGame` boots to `'play'`, so `'attract'` never occurs at runtime until mc6-4 wires the boot — AC2's attract path is **pinned but future-facing**. The **`'over'` → fire → `'play'`** path is reachable NOW and is the hand-verifiable deliverable: play until game over, press Z, get a fresh game. Not a dead core (over is reached by real play; stepGame already freezes `'over'`).

### Out of scope for mc6-2 (do NOT build — later mc6 stories own them)
- The full `SETUPC` index + `SETUP1` task-list dispatch machine (structural; deferred).
- `createGame` booting to `'attract'` and `attract` on `GameState` (mc6-4).
- Broadening attract's trigger to "any input" (mc6-4); attract/THE-END/setup render (mc6-5); PAUSE toggle (mc6-3).

## Sm Assessment

**Story type:** title-only (description=null, acceptance_criteria=null in the epic YAML). Per the title-only rule, the TITLE is the spec — I measured every falsifiable claim in it against the current tree and the mc6-1 handoff BEFORE setup. All three claims are ACCURATE (no rot):

1. **`W3MAIN.MAC:561 SETUP` — byte-exact.** `:560` is `.SBTTL SETUP STATE`; `:561` is the `SETUP:` label.
2. **`createGame` reseed (6 cities / 3 bases full ammo / wave 1) — confirmed.** `createGame(seed=1)` at `game.ts:120` returns `createCities()` (6), `createBases()` (3, full ammo), `wave: INITIAL_WAVE`, score 0, full NICBMS budget. It currently hardcodes `phase: 'play'`.
3. **The edge is genuinely unimplemented — confirmed.** `stepGame` (`game.ts:149`) imports only `nextPhase/nextWavePhase/resumePlay` (state.ts:56); it does NOT consume `mainline`/`stateCode`/`INITIAL_PHASE`. No attract/setup handling exists in the reducer.

**Wires on mc6-1** (done, PR #160), which shipped the pure MAINLINE dispatch boundary only and explicitly deferred the edge transitions + `stepGame` dispatch integration + `createGame` boot wiring to mc6-2.

**Carried-forward scope filed into this story:** the `MC-STATE-INIT` claim (cabinet boots to SETUP/attract) — cite `W3MAIN.MAC:491 LDA I,S.SETU` + `:135 ATRACT` — was explicitly deferred by mc6-1 to mc6-2. Belongs in `docs/rom-study/claims/state.json`. ROM ATRACT polarity is `0=attract / -1=game`; our boolean is `true=attract`.

**Two open design questions routed to TEA for a RED-phase ruling (not resolved by SM — this epic rules phase-model shape at RED, per the mc6-1 O-6a precedent):**
1. Does the transition introduce an explicit intermediate `setup` phase-step (attract/over → setup → play as two edges), or a single start-action reducer reseeding straight to play? The ROM SETUP state (:561) is a real distinct state; whether it materializes on `GameState` is open.
2. Does mc6-2 wire `createGame` to boot to `attract` (INITIAL_PHASE) now, or is boot-to-attract left to mc6-4 (attract driver)?

Both are surfaced prominently in `sprint/context/context-story-mc6-2.md` (§Open Questions). TEA should put them to the user with the ROM evidence in hand before writing the RED tests.

**Setup housekeeping (recurring sm-setup gotchas, both handled):** sm-setup omitted `**Repos:**` from Story Details and left the story at `status: backlog` — I added Repos + Branch fields and stamped `in_progress` myself. Claim pushed: context + epic stamp committed on `feat/mc6-2-setup-play-start-of-game` and the branch pushed for sibling visibility. Sibling probes at setup were clean (no `mc6` remote branches; only live sibling session is a-3's unrelated `sw10-3`).

**Handoff:** To TEA (Tyr One-Handed) for the RED phase.