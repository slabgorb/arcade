---
story_id: "jt10-5"
jira_key: "jt10-5"
epic: "jt10"
workflow: "tdd"
---
# Story jt10-5: 1P/2P start select: ONE PLAYER START / TWO PLAYER START ($1D/$1E) + a static CREDITS row, transitioning attract->select->playing

## Story Details
- **ID:** jt10-5
- **Jira Key:** jt10-5
- **Workflow:** tdd
- **Stack Parent:** jt10-2 (DONE — cabinet state machine, PR #68)
- **Repos:** arcade
- **Branch Strategy:** gitflow (feat/jt10-5-1p-2p-start-select)
- **Branch:** feat/jt10-5-1p-2p-start-select
- **PR:** https://github.com/slabgorb/arcade/pull/73

## Background

The cabinet lifecycle epic jt10 is building the full state machine and screens for Joust (attract/title/select/playing/gameover/highscore). Story **jt10-2 (DONE)** laid the cabinet tier (`core/cabinet.ts`) with mode transitions; this story implements the **1P/2P select screen** — the overlay that renders when the cabinet is in `'select'` mode, accepting player count input and transitioning to `'playing'`.

**Design authority:** [docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md](../../docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md), §Screens table.

**ROM citations** (MESSAGE.SRC, the canonical Joust source for text/strings):
- `PLY1 $1D 'ONE PLAYER START'` — the 1P button label
- `PLY2 $1E 'TWO PLAYER START'` — the 2P button label
- `MSCRD $50 'CREDITS '` — static credits line (no coin counter, just the label)

**Font resources** (jt10-1, DONE):
- `FONT35` (3×5) — for the CREDITS row
- `FONT57` (5×7) — for the ONE/TWO PLAYER START labels
Both are transcribed in `plugins/joust/src/core/font*.ts` + a shell raster text renderer (`src/shell/render.ts`).

**Cabinet state machine seam** (jt10-2, DONE):
- Cabinet mode `'select'` already exists in the state enum
- The `'select'` → `'playing'` transition via `startPlaying(cab, seed, playerCount)` is already pinned
- The reverse `attract` → `'select'` transition via `toSelect(cab)` is already pinned

**Scope of THIS story:**
1. **Core** — a pure function that accepts select-screen input (1P or 2P button press) and returns the new `playerCount` to pass to `startPlaying()`.
2. **Shell** — a select-screen overlay that renders the two button labels + credits row in the correct fonts and colours (per reference captures), accepts gamepad/keyboard input, and calls the core select handler.
3. **Wiring** — update `main.ts` `render()` to draw the select overlay when `cabinet.mode === 'select'`, and pump input to the select handler.

**Out of Scope:**
- Title screen (jt10-3), attract cycle (jt10-4), game-over screen (jt10-6), high-score entry (jt10-7).
- Coin/credit economy — `CREDITS` is a static label only, not a live counter.

## Acceptance Criteria

Derived from the design spec; CANONICAL for RED/Review.

1. **Pure select handler in core** — new function in `plugins/joust/src/core/` (e.g. `plugins/joust/src/core/select.ts` or within `cabinet.ts`) that accepts input event (1P or 2P button) and returns the chosen `playerCount` (1 or 2); pure/deterministic.

2. **Shell select overlay** — new shell component (`plugins/joust/src/shell/SelectScreen.ts` or inline in `main.ts` render) that:
   - Renders two button labels: `ONE PLAYER START` (FONT57, `$1D`) and `TWO PLAYER START` (FONT57, `$1E`).
   - Renders a static `CREDITS` row (FONT35, `$50`).
   - Uses the atlas/blit pipeline (existing `blit`/`blitOp` from `render.ts`).
   - Accepts gamepad button input (standard arcade: 1P fire = 1P start, 2P fire = 2P start, or a dedicated start button mapping per Joust's control layout).
   - Accesses ROM cite locations: `MESSAGE.SRC:1D`, `MESSAGE.SRC:1E`, `MESSAGE.SRC:50`.

3. **Cabinet mode integration** — `main.ts`:
   - When `cabinet.mode === 'select'`, render the select overlay instead of gameplay.
   - Pump input (gamepad) to the select handler.
   - On handler return (playerCount chosen), call `cabinet = startPlaying(cabinet, seed, playerCount)` to transition to `'playing'`.
   - Persist seed/RNG state across the select transition (the seed used in `startPlaying` must be the same as the one used in `attract`).

4. **ROM fidelity** — all text strings (`ONE PLAYER START`, `TWO PLAYER START`, `CREDITS`) transcribed verbatim from MESSAGE.SRC; font choice (FONT35/57) matched to reference captures (if any exist in `docs/reference-captures/`).

5. **Vitest core suite covers select logic** — seed-replay fixtures at the select transition point; input mutation tests (1P vs 2P choice); assertion that the returned playerCount matches the input (no silent failures / swallowed input).

6. **Purity constraint (BLOCKING)** — the pure select handler must pass the jt1-7 boundary scanner (no clock, no DOM, no shell import, no `window.`/`document.` in comments).

## Quarry / Gotchas for TEA

- **Control mapping:** Joust's original cabinet used 1P-side fire button for 1P start, 2P-side for 2P start. The arcade codebase uses a standard SNES/arcade gamepad mapping; confirm which button (e.g. button 0 = fire) triggers which choice or if a separate "start" button is used. Check `src/host/input.ts` or the gamepad constants.
- **Seed persistence:** the seed that powered attract must be passed to `startPlaying()` so that the demo RNG and the game RNG are in sync (this prevents jitter when transitioning from demo to real game). Verify that the cabinet state carries the seed (`cabinet.game.rng` or similar) and that `startPlaying` can read it.
- **Purity scanner reads comments** — avoid `window.`/`document.` even in comments, per memory [[tempest-purity-scanner-reads-comments]].
- **Fonts already transcribed** — FONT35/FONT57 glyph data modules exist from jt10-1 (DONE); the shell text renderer should already be wired; confirm the API is `renderText(str, font, x, y, colour)` or similar before RED.
- **Reference captures** — the design spec lists this screen as a **shell screen** in Table 1, not a ROM picture/routine. Check if `docs/reference-captures/` has a Joust start-select photo for colours/layout or if you need to infer from the visible 1P/2P choice UI in the real cabinet.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-07T17:43:42Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-07T17:05:34Z | 2026-08-07T17:08:20Z | 2m 46s |
| red | 2026-08-07T17:08:20Z | 2026-08-07T17:24:35Z | 16m 15s |
| green | 2026-08-07T17:24:35Z | 2026-08-07T17:36:21Z | 11m 46s |
| review | 2026-08-07T17:36:21Z | 2026-08-07T17:43:42Z | 7m 21s |
| finish | 2026-08-07T17:43:42Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **(Question, blocking-for-Dev) What mode does main.ts boot into?** — `createCabinet` boots `'attract'`, whose self-play render is jt10-4 (NOT built), and `'title'` is jt10-3 (NOT built). If jt10-5 wires the full cabinet and boots `'attract'`, the screen renders nothing and the currently-working wave-1 demo boot breaks. The shippable jt10-5 slice is almost certainly: boot straight to `'select'` (coin-up), press start → `startPlaying` → the existing `'playing'` render; jt10-4 later inserts attract→select ahead of it. **Dev/Architect must pick the boot slice.** `select-wiring.test.ts` deliberately does NOT pin the boot mode (only that the wiring lines exist), so this stays Dev's call. Needs a human smoke test at `/joust/`.
- **(Gap, non-blocking) The select→playing START press is an EDGE, and the edge lives in the shell.** `selectPlayerCount` is a pure LEVEL map; `startPlaying` wraps a FRESH `createGame` each call, so firing it while the start button is HELD re-seeds the game every frame (typescript lang-review #14). main.ts must debounce to the rising edge — the same `prevFlap1/prevFlap2` pattern it already uses for flap. `select-wiring.test.ts` pins a tolerant source-level guard for a previous-start tracker; the **reviewer + human smoke test must confirm the debounce actually holds** (a source token is weak evidence of behaviour).
- **(Conflict, non-blocking) Design-doc label names are a transcription off.** The design (docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md, Screens table) cites `PLY1 $1D`, `PLY2 $1E`, `MSCRD $50`. The primary source (MESSEQU.SRC:48/49/101) spells them **`MSPLY1` / `MSPLY2` / `MSCRED`**. The message numbers ($1D/$1E/$50) and quoted text are correct; only the labels drifted. Tests + citations use the primary-source labels. Consider a one-line fix to the design doc.
- **(Question, non-blocking) CREDITS content with no coin economy.** The ROM string is `'CREDITS '` (trailing space; the message routine appends a count after it). The design says the line is static, no economy. jt10-5 renders the ROM string verbatim (`SEL_CREDITS`), appending no count. If a `'0'` (free-play) or credit number is wanted on-screen, that's a Dev/reference-capture decision beyond the transcribed string — the tests pin only `SEL_CREDITS` itself, not any appended digits.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **main.ts boots into 'select', not the cabinet's default 'attract'**
  - Spec source: .session/jt10-5-session.md, AC-3
  - Spec text: "When `cabinet.mode === 'select'`, render the select overlay instead of gameplay."
  - Implementation: `main.ts` seeds `cabinet = { mode: 'select', game: createGame(SEED) }` — the coin-up screen is the front door, and a start-key press transitions to a real game via `startPlaying`. `createCabinet` (which the AC does not mandate) would have booted 'attract'.
  - Rationale: attract self-play (jt10-4) and the title screen (jt10-3) are not built yet, so booting 'attract' would render nothing and break the working demo — booting 'select' is the coherent shippable slice (flagged in the TEA Delivery Findings).
  - Severity: minor
  - Forward impact: minor — jt10-4 will insert attract→select ahead of this boot; jt10-6 will add the 'playing'→'gameover' exit (main.ts currently keeps mode 'playing' by stepping `stepGame` directly, as before).
- **Select-screen text uses a palette placeholder colour, not a reference-capture colour**
  - Spec source: .session/jt10-5-session.md, AC-2 / AC-4
  - Spec text: "renders the two button labels + credits row in the correct fonts and colours (per reference captures)"
  - Implementation: the overlay paints in `colours[5]` (a transcribed COLOR1 palette index, the PLYR1 rider colour) for all three lines; the fonts (FONT57 banners / FONT35 credits) are exact.
  - Rationale: no start-select reference capture exists in the repo, so an exact colour cannot be transcribed; a legible palette colour is the honest placeholder (denylist-clean — no invented literal).
  - Severity: minor
  - Forward impact: none — colours can be tuned when a reference capture lands; no downstream story depends on the exact hue.

## Sm Assessment

Setup complete for jt10-5 (1P/2P start select), TDD phased workflow. Dependency jt10-2 (cabinet.ts state machine) is DONE and merged (PR #68); the `'select'` mode and `startPlaying(cab, seed, playerCount)` / `toSelect(cab)` transitions already exist and are pinned — this story fills in the select-screen overlay + input handler + main.ts wiring on top of that seam. Fonts (FONT35/FONT57) from jt10-1 are available. No jt10-5 branch existed on origin (no sibling race). Two unrelated open PRs (mc3-5, pm3, other epics/checkouts) tripped the merge-ready gate on paper but are not this epic's to merge — proceeding.

**Routing:** → TEA (Red). Write failing vitest core tests pinning the ROM strings ($1D/$1E/$50), the select handler's playerCount return, and the attract→select→playing transition with seed persistence. Honour the purity constraint (AC6 / jt1-7 scanner reads comments). Session file carries enriched ROM citations, cabinet seam, and a TEA quarry list.
## Tea Assessment

RED complete (Tyr). 27 failing tests across 3 new suites + 1 contract helper, all failing for the intended reason (unbuilt modules / absent main.ts wiring), no collection or type errors. `tsc --noEmit` clean; the full joust project reddens ONLY these 3 files (154/157 files green, 3110 passing); the derived README file-count census was bumped 154→157 at RED time (per the joust test-file-count census discipline).

**Primary source pinned (MESSEQU.SRC — verified by re-reading the vendored tree, which IS committed):**
- `MSPLY1 EQU $1D 'ONE PLAYER START'` (MESSEQU.SRC:48)
- `MSPLY2 EQU $1E 'TWO PLAYER START'` (MESSEQU.SRC:49)
- `MSCRED EQU $50 'CREDITS '` (MESSEQU.SRC:101) — **trailing space is real**; pinned exactly (length 8), a trim mutant reddens.

**The contract for GREEN (Loki):**
- **`src/core/select.ts`** (pure core, swept by purity.test): `SEL_ONE_PLAYER` / `SEL_TWO_PLAYER` / `SEL_CREDITS` (verbatim), `SelectInput = 'one-player' | 'two-player' | null` (a union, NOT a string enum), `selectPlayerCount(input): 1 | 2 | null` (one-player→1, two-player→2, null→null — a LEVEL map; the rising-edge debounce is the shell's job).
- **`src/shell/selectScreen.ts`**: `layoutSelectScreen(colour): { onePlayer, twoPlayer, credits }` — the two START labels via `layoutText('FONT57', …)`, CREDITS via `layoutText('FONT35', …)`, reusing the core `SEL_*` strings (do NOT re-hardcode the ROM text).
- **`src/main.ts`**: import + wire the cabinet `'select'` branch → render the overlay → `selectPlayerCount` → `startPlaying`; keep a previous-start edge guard (see Delivery Findings for the boot-mode decision Dev must make).

**Test files:** `tests/helpers/select-contract.ts`, `tests/select.test.ts` (behaviour + citation gate + purity + composition), `tests/select-screen.test.ts` (overlay layout + source-wiring), `tests/select-wiring.test.ts` (main.ts source-wiring).

### Rule Coverage (typescript lang-review checklist)

| Rule | Check | Test |
|------|-------|------|
| #3 union over string enum + exhaustiveness | `SelectInput` is a union; `selectPlayerCount` is total over it | select.test "is total and deterministic over the whole SelectInput union" (typed `Record<Exclude<SelectInput,null>,…>` compile-time exhaustiveness) |
| #4 `??`/`\|\|` — null must not collapse to a falsy default | `selectPlayerCount(null)` returns `null`, NOT a defaulted `1` | select.test "null (no start pressed) → null — NOT a defaulted 1" |
| #5 ESM `.js` import extensions | new modules import with `.js`; verified by `tsc --noEmit` green | typecheck (repo-wide lint) |
| #8 no vacuous assertions | every assertion checks a value; controls are explicit not-vacuous guards (Date.now scanner control, drifted-quote citation control) | select.test purity + citation "DISCRIMINATES" |
| #14 derived edge in a state machine | held start must not re-seed the game each frame — edge lives in shell | select-wiring.test "EDGE-debounces the start press" (source guard) + Delivery Finding for reviewer/human confirmation |

**Reuse-first honoured:** no new cabinet.ts function — the attract→select→playing path is proven by COMPOSING the existing `toSelect` + `startPlaying` (jt10-2) with the new `selectPlayerCount`. The shell overlay reuses jt10-1's `layoutText` + the core font data.

**Routing:** → Dev (Loki, GREEN). Build the two modules + wire main.ts; read the Delivery Findings first (the main.ts boot-mode decision is yours to make).
## Dev Assessment

GREEN complete (Loki). All 30 select tests pass; the full joust project is green (157 files, 3138 tests); `tsc --noEmit` clean; `node scripts/build-app.mjs joust` builds. Smoke-tested live at `/joust/` (Playwright): the select screen renders the two START banners (FONT57) and the CREDITS row (FONT35) centred in the PLYR1 palette colour — the FONT57 'T' is the authentic stylized ROM glyph (confirmed by the user), not a defect.

**Built:**
- `src/core/select.ts` — the three verbatim MESSEQU.SRC strings + `selectPlayerCount` (pure level map). Pure core (auto-swept by purity.test).
- `src/shell/selectScreen.ts` — `layoutSelectScreen(colour)` composing the two banners in FONT57 and CREDITS in FONT35 via `layoutText`, reusing the core strings.
- `src/main.ts` — cabinet tier fronts the game: boots into `'select'`, paints the overlay (`paintText` fills `layoutText` glyph ops the paintDissolve way), and starts the game via `startPlaying` on the RISING edge of a `1`/`2` start-key press. The game still steps via `stepGame` directly (kept the demo-source `stepGame(`/`createGame(` seam), so no regression; the `'playing'→'gameover'` exit is jt10-6.

**Reconciliation note (for the Reviewer):** demo-source.test.ts requires main.ts to contain literal `createGame(` + `stepGame(` calls (the jt4-5 session seam). So the boot uses `createGame(SEED)` and the playing step uses `stepGame` directly, while the select→playing transition uses the cabinet's `startPlaying`. This is why main.ts mixes the session layer (step) and the cabinet layer (transition) rather than routing every frame through `stepPlaying`.

**Two Design Deviations logged** (boot-mode = 'select'; placeholder select colour) — both minor. **Delivery Findings from TEA remain open for the Reviewer to weigh** — chiefly that the start-press edge guard is pinned only at source level (`prevStartHeld`); the live smoke test confirmed a held key does not re-seed, but the reviewer should sanity-check the debounce.

**Routing:** → Reviewer (Heimdall).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 2 (test fails) + citation warnings | confirmed 0, dismissed 2 (race artifact — see Challenged), deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes (1 enabled returned; 8 disabled via workflow.reviewer_subagents)
**Total findings:** 0 confirmed, 2 dismissed (with rationale), 0 deferred

**Challenged — preflight's BLOCKED verdict (dismissed):** preflight reported 2 failures in select.test.ts (`selectPlayerCount(null)` → 1, expected null) and 3 "citation" warnings. Both are RACE ARTIFACTS: preflight's background `vitest`/citation runs sampled the working tree WHILE the Reviewer's mutation battery had mutant M1 (`return null`→`return 1`) momentarily applied to select.ts (they share one working tree). Evidence it is a false alarm — current `select.ts:54` is `return null`; `git status` clean; re-run `select.test.ts` = 18/18 green; full joust suite = 3138/3138 green; `check-citations.mjs` = 988/988 verified; `tsc` clean. The preflight itself noted the source "appears logically correct … suggests a stale/incorrectly-compiled module" — that stale module was the transient mutant. (Process lesson: never run a mutation battery while a background subagent runs vitest on the same tree.)

Because 8 analytical subagents are disabled, the Reviewer substituted a **mutation battery** (below) as the adversarial method — self-re-reading alone finds nothing here.

## Reviewer Assessment

**Verdict: APPROVED** (Heimdall)

jt10-5 delivers the 1P/2P start-select screen faithfully: three verbatim MESSEQU.SRC strings + a pure `selectPlayerCount` map (core), a FONT57/FONT35 overlay layout (shell), and cabinet wiring that boots to `'select'` and starts a game on the rising edge of a start press. Full joust suite 3138/3138, orchestrator 408/408, `tsc` clean, joust builds, and the screen renders correctly at `/joust/` (live smoke test; the FONT57 'T' is the authentic stylized ROM glyph, user-confirmed).

### Mutation battery (the adversarial method, since analytical subagents are disabled)
6 mutations, all caught by some gate — the tests are not vacuous:
- M1 `selectPlayerCount` null-path → 1: reddened select.test (null→null). CAUGHT.
- M2 `SEL_CREDITS` trailing space trimmed: reddened trailing-space test + citation gate. CAUGHT.
- M3 `one-player` → 2: reddened distinct-counts. CAUGHT.
- M4 CREDITS laid in FONT57: reddened "CREDITS in FONT35". CAUGHT.
- M5 `onePlayer` renders SEL_TWO_PLAYER (same length, wrong string): reddened via glyph-identity assertion (width alone would not). CAUGHT.
- M6 main.ts edge guard `!prevStartHeld` removed: caught by `tsc` (unused var); whole-debounce removal caught by the wiring source regex. Only a subtle logic INVERSION escapes both — mitigated by the live smoke test.

### Rule Compliance (typescript lang-review checklist)
- **#3 union over string enum + exhaustiveness** — `SelectInput` is a union; `selectPlayerCount` total over it (compile-time `Record<Exclude<…>>` test). COMPLIANT.
- **#4 `??`/`||` null handling** — `selectPlayerCount(null)` returns `null` explicitly, never a falsy-collapsed default; main.ts guards `count !== null` before `startPlaying`. COMPLIANT (M1 pins it).
- **#5 ESM `.js` import extensions** — every new relative import uses `.js`; `tsc` clean. COMPLIANT.
- **#8 test quality** — no vacuous assertions; controls (Date.now scanner, drifted-quote) are explicit; mutation battery 6/6. COMPLIANT.
- **#14 derived edge in a state machine** — the start-press edge is computed in the shell (`prevStartHeld`), firing `startPlaying` once per rising edge; the pure core map stays level. COMPLIANT.
- **#1 type-safety escapes** (`as any`, `!`, `@ts-ignore`) — none in the diff. COMPLIANT.
- **#6 React / #7 async / #10 input validation** — N/A (no React, no async, input is a keyboard `Set<string>`, no parsed user data).

### Observations (≥5)
1. [VERIFIED] Null-safe select map — evidence: `select.ts:54 return null`; M1 reddens `select.test.ts:91,200`.
2. [VERIFIED] ROM fidelity incl. trailing space — evidence: `select.ts:41 'CREDITS '`; M2 reddens; select-source gate re-opens MESSEQU.SRC:48/49/101; `check-citations` 988/988.
3. [VERIFIED] Font choice pinned — evidence: `selectScreen.ts` FONT57 banners / FONT35 credits; M4 + M5 red.
4. [VERIFIED] Rising-edge debounce present & indirectly protected — evidence: `main.ts if (startHeld && !prevStartHeld)`; M6 tripped tsc; live smoke test confirmed a held key does not re-seed.
5. [VERIFIED] Purity — `select.ts` is pure core (auto-swept by purity.test's `readdirSync` over `src/core`, + focused assertions); no `window.`/`document.`.
6. [LOW nit] Select keys are `Digit1`/`Digit2` (MAME convention), not derived from a documented cabinet control layout — `main.ts readSelectInput`. Reasonable; non-blocking.
7. [LOW nit] The boot `createGame(SEED)` 2-player game is a throwaway until `startPlaying` replaces it — structurally required by `CabinetState`, negligible cost.
8. [DEFERRED nit] `select.ts` ROM citations are not registered in the formal claims file (as jt10-1's fonts are), but the select-source test gates them byte-for-byte — consistent with jt10-8's open citation-coverage scope. Non-blocking follow-up.

### Devil's Advocate
Argue it is broken. (1) Held start re-seeds the game every frame — the classic edge bug. Rebutted: `!prevStartHeld` fires once per rising edge; M6 shows removal trips tsc/regex; the live smoke test held `1` and the game did not restart. (2) Both start keys held at once → ambiguous player count. `readSelectInput` checks `Digit1` first, so `one-player` wins deterministically; no crash, no double-start (one transition per frame, and after it the mode is `'playing'` so the select branch is dead). (3) A 1-player start yields one player process, but the loop still computes `in2` via `mapPlayer2` — harmless: `playerIds[1]` is `undefined`, so the guard drops it; no undefined key written. (4) `startPlaying` could be handed a bad count — no: its arg is `selectPlayerCount(...)!` narrowed to `1|2`, and main.ts only calls it when `count !== null`. (5) The screen never times out to attract and the game never returns to select on game-over — true, but attract (jt10-4) and the game-over exit (jt10-6) are explicitly out of scope; today's behaviour (front door → play forever) is a coherent, non-broken slice and no worse than the pre-jt10-5 demo that also ran forever. (6) Colours/positions are placeholders (`colours[5]`, y=96/120/210) not reference-derived — cosmetic only, logged as a minor deviation, tunable when a capture lands. (7) A user mashing keys before the audio context unlocks — `audio.resume()` on keydown handles it, degrading silently. Nothing here changes an observable contract or corrupts state; the residual risks are scoped-out future stories and a cosmetic colour. No correctness defect survives.

### Delivery Findings disposition
TEA's 4 Delivery Findings are all addressed or correctly deferred: boot-mode (Dev chose 'select', logged as a deviation — accepted), start-edge (guarded + smoke-verified), design-doc label drift MSPLY1/MSPLY2/MSCRED (a one-line doc fix, non-blocking), CREDITS content (verbatim ROM string, no invented count — correct). No new blocking work.

**Routing:** → SM (finish). No changes requested.