---
story_id: "mc6-1"
jira_key: "mc6-1"
epic: "mc6"
workflow: "tdd"
---
# Story mc6-1: Phase machine (state.ts)

## Story Details
- **ID:** mc6-1
- **Jira Key:** mc6-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 5
- **Priority:** p2
- **Branch:** feat/mc6-1-phase-machine-mainline
- **PR:** https://github.com/slabgorb/arcade/pull/160

## Story Spec

Extend Phase from `play|between|over` to add `attract|setup|pause` and a pure MAINLINE dispatch (attract → setup → play → [pause] → over → attract). Pure transition fn, seeded, no clock. REV-01 W3MAIN.MAC:475 MAINLINE / :539 PLAY / :561 SETUP / :615 PAUSE

## Acceptance Criteria

1. **Phase union extended:** `export type Phase` includes all six states: 'attract', 'setup', 'play', 'pause', 'between', 'over' — existing 'play', 'between', 'over' behavior unchanged
2. **Pure MAINLINE dispatch function:** New `mainline(phase: Phase, rng: RNG): Phase` implements the state machine cycle: attract → setup → play → [pause] → over → attract; function is pure (no external side effects), seeded (takes RNG), and has no internal clock dependency
3. **Transition closure:** 'over' → 'attract' closes the loop, restarting attract mode without external reset
4. **ROM citations:** All ROM source references (W3MAIN.MAC:475, :539, :561, :615) are preserved as line comments (`//`) per the mc citations rule (not JSDoc `/** */`), following the scanner rule documented in memory
5. **Regression safety:** Existing pure functions (nextPhase, nextWavePhase, resumePlay, allCitiesDead) remain callable and unchanged; game.ts:324 import of nextPhase continues to work without breaking changes

## Technical Approach

The pure core state machine extends plugins/missile-command/src/core/state.ts (line 13, current Phase type) with a new mainline dispatch function:

1. Extend Phase type union to include 'attract' | 'setup' | 'pause'
2. Implement pure `mainline(phase: Phase, rng: RNG): Phase` function that:
   - Routes attract → setup (unconditional)
   - Routes setup → play (unconditional)
   - Routes play → pause (conditionally, if pause-triggered by shell; otherwise play → over on game end)
   - Routes pause → play (unconditional resume)
   - Routes over → attract (loop close)
3. Cite each ROM section (475 MAINLINE, 539 PLAY, 561 SETUP, 615 PAUSE) as line comments above the corresponding code
4. Ensure no clock dependency: all transitions are pure function outputs, not time-based
5. Regression test: verify nextPhase, nextWavePhase, resumePlay still export and behave identically

## Target File
- **Location:** plugins/missile-command/src/core/state.ts
- **Current Phase type (line 13):** `export type Phase = 'play' | 'between' | 'over'`
- **Existing consumers:** game.ts:324 (nextPhase call), game.ts:56 (imports)
- **ROM source file:** plugins/missile-command/reference/source/W3MAIN.MAC (CRLF; in a-1 reference tree)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-09T17:42:06Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-09T16:35:28Z | - | - |
| red | - | 2026-08-09T17:00:56Z | unknown |
| green | 2026-08-09T17:00:56Z | 2026-08-09T17:12:26Z | 11m 30s |
| review | 2026-08-09T17:12:26Z | 2026-08-09T17:26:16Z | 13m 50s |
| red | 2026-08-09T17:26:16Z | 2026-08-09T17:31:44Z | 5m 28s |
| green | 2026-08-09T17:31:44Z | 2026-08-09T17:34:28Z | 2m 44s |
| review | 2026-08-09T17:34:28Z | 2026-08-09T17:42:06Z | 7m 38s |
| finish | 2026-08-09T17:42:06Z | - | - |

## Delivery Findings

No upstream findings

### Dev (implementation)
- **Gap** (non-blocking): `MC-STATE-INIT` claim (cabinet boots to SETUP/attract) not yet filed.
  Affects `plugins/missile-command/docs/rom-study/claims/` (mc6-2 should add it citing
  W3MAIN.MAC:491 `LDA I,S.SETU` + :135 ATRACT when `createGame` boot-to-attract is wired).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): the session's top-of-file "Acceptance Criteria" are the
  STALE six-way `mainline(phase, rng): Phase` shape; the sprint YAML title/ACs were never
  updated after the O-6a ruling. Affects `sprint/epic-mc6.yaml` (mc6-1 title/ACs could be
  reworded to the transitional-opener contract so future readers don't re-hit the conflict).
  *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking): the SETUP-family STATE code is unpinned — `stateCode(attract|between|over)===S_SETU`
  has no assertion (mutant survives). Affects `plugins/missile-command/tests/state-mainline.test.ts`
  (add `expect(stateCode(phase)).toBe(S_SETU)` in AC3; replace the circular AC2 `classify()` oracle).
  *Found by Reviewer during code review.*
- **Gap** (blocking): wrong ROM citation `W3MAIN.MAC:573/:570` for ENDGM1/ENDGM2 (real entries `:589/:601`).
  Affects `plugins/missile-command/tests/state-mainline.test.ts:27`. *Found by Reviewer during code review.*
- **Conflict** (non-blocking): `context-story-mc6-1.md` AC2/AC3 describe a seeded transition fn + loop
  closure this story does not deliver. Affects `sprint/context/context-story-mc6-1.md` (reword to the
  classifier contract; defer transitions to mc6-2..6). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): dispatch citation `:507-527` overshoots to `:525`; and `MC-STATE-INIT`
  remains to be filed in mc6-2 (per Dev finding). Affects `state.ts`/tests/`state.json` prose and
  `docs/rom-study/claims/`. *Found by Reviewer during code review.*

### Reviewer (code review — round 2, re-review)
- **Conflict** (non-blocking): context-doc Scope calls `mainline` "seeded" — it takes no RNG.
  Affects `sprint/context/context-story-mc6-1.md:50` (drop "seeded"). *Found by Reviewer during re-review.*
- **Conflict** (non-blocking): context-doc AC4 lists `:539/:561/:615` as preserved citations, but only
  `:475` is cited (the rest are mc6-2..6 handler headers). Affects `sprint/context/context-story-mc6-1.md:64-65`
  (reduce AC4 to the shipped citation set, or mark those three forward-looking). *Found by Reviewer during re-review.*
- **Improvement** (non-blocking): SM should reconcile the stale six-way `mainline(phase,rng)` shape still in
  the sprint YAML title/ACs (`sprint/epic-mc6.yaml`) with the delivered classifier at finish. *Found by Reviewer during re-review.*

## Design Deviations

None at setup time

### Dev (implementation)
- **Implemented the O-6a-ruled dispatch contract, not the stale top-of-session ACs**
  - Spec source: `.session/mc6-1-session.md` top "Acceptance Criteria" (AC2) — regenerated by `complete-phase` from the un-updated sprint YAML
  - Spec text: "New `mainline(phase: Phase, rng: RNG): Phase` implements the state machine cycle: attract → setup → play → [pause] → over → attract"
  - Implementation: `mainline(phase: Phase): Handler` — the ROM MAINLINE *dispatch* (phase → 'play'|'pause'|'setup' by STATE sign); NO `rng` arg, NO phase→phase edge transitions
  - Rationale: The `## Tea Assessment` (below) records the user's O-6a ruling at RED (the *transitional design opener*); the TEA tests encode it and are the mechanical gate. The stale top ACs predate the ruling. Per spec-authority, the tests + assessment in the session govern. `rng` is unused (a pure sign dispatch needs no entropy); the edge transitions are owned by mc6-2/6-3/6-6.
  - Severity: minor (contract shape, ruled by the user; tests green)
  - Forward impact: mc6-2/3/6 add the edge transitions; they consume `mainline`/`stateCode`/the STATE codes, not a phase→phase `mainline(rng)`.
- **`attract` flag lives in `state.ts` (INITIAL_ATTRACT), not on `GameState`**
  - Spec source: `docs/superpowers/specs/2026-08-09-...-mc6-attract-state-machine-design.md`, §Architecture
  - Spec text: "add `attract: boolean` on `GameState`"
  - Implementation: `export const INITIAL_ATTRACT = true` in `state.ts` (pure); `GameState` untouched, `game.ts` untouched
  - Rationale: The opener is `state.ts`-only (keeps `game.ts` + 10+ combat/wave test files green with zero risk). The ROM ATRACT flag lands on `GameState` when the boot is wired in `createGame` — mc6-2/6-4.
  - Severity: minor
  - Forward impact: mc6-2/6-4 add `attract` to `GameState` and seed it from `INITIAL_ATTRACT`.
- **`MC-STATE-INIT` claim not filed (only MC-STATE-PLAY/PAUS/SETU)**
  - Spec source: `## Tea Assessment` → "Claims Dev must file", + design §mc6-1 Claims
  - Spec text: "MC-STATE-INIT (boots to SETUP/attract) ... file it as a prose/anchor claim"
  - Implementation: filed the three EQU-backed STATE claims; deferred MC-STATE-INIT
  - Rationale: No test requires it, and `INITIAL_PHASE`/`INITIAL_ATTRACT` introduce no numeric literal for the citation scanner to flag, so nothing forces it. The boot is not yet *behaviorally* exercised (createGame boot-to-attract is mc6-2). Filing it now would cite a ROM *instruction* line (LDA I,S.SETU), which the byte-checker handles differently from EQU lines. Deferred to mc6-2 where the boot is wired and tested. Recorded as a Delivery Finding.
  - Severity: minor
  - Forward impact: mc6-2 files MC-STATE-INIT alongside the createGame boot wiring.

## Tea Assessment

**Phase:** finish → green (RED complete, handing to Dev/Loki)
**Test file:** `plugins/missile-command/tests/state-mainline.test.ts` (new, additive)
**RED signal:** 21 failed / 8 passed in the new file; **0 regressions** across the other
55 MC test files (959 green); `npm run lint` (tsc) clean. The 8 green are by design —
AC6 (mc3/mc4 trio intact) and AC8's pure radix-decode of the ROM lines.

### O-6a resolution (the design's open question, ruled at RED by the user)
The story **title** and the session ACs describe a *six-way additive* union with a plain
`mainline()` fn. The **Architect design** (`docs/superpowers/specs/2026-08-09-missile-command-mc6-attract-state-machine-design.md`)
contradicts that: the ROM has **three states + an `attract` flag**, not six, and explicitly
*rejects* the flat six-way enum. O-6a defers the phase-set shape to "mc6-1 RED."
**User ruling (this session): the _transitional design opener_.** Adopt the ROM's
three-way STATE sign model + the ATRACT boot + numeric STATE claims, but KEEP the existing
`play/between/over` + `nextPhase/nextWavePhase/resumePlay` trio so mc3/mc4 stay green. The
`between`/`over` → SETUP-task re-home and the `game.ts` `stepGame` dispatch are **deferred
to mc6-2..6** (they own those edges).

### The contract Dev (GREEN) must implement — `src/core/state.ts` ONLY (pure, no clock, no shell)
Grow `Phase` to the transitional six-way union and add:
- `export const S_PLAY = 0x00` (0), `S_PAUS = 0x80` (128), `S_SETU = 0x40` (64) — the ROM
  STATE codes. **Cite each with a `//` line comment, NOT JSDoc `/** */`** (the mc un-cited
  literal gate is line-based — see memory `mc-citations-scanner-jsdoc-leak`).
- `stateCode(phase): number` — phase → its STATE byte.
- `mainline(phase): 'play' | 'pause' | 'setup'` — the MAINLINE dispatch, classified by the
  **high bit** (the 6502 N flag / `IFMI`), NOT a naive `< 0` (JS `0x80` is +128):
  `code === 0 → 'play'` (IFEQ), `code & 0x80 → 'pause'` (IFMI), `else → 'setup'`.
  `attract`, `between`, `over` all dispatch to `'setup'` (SETUP-family, positive STATE).
- `INITIAL_PHASE: Phase = 'attract'`, `INITIAL_ATTRACT = true` — cabinet cold-starts on the
  demo (ROM `LDA I,S.SETU` at W3MAIN.MAC:491, ATRACT flag at :135; note ROM polarity is
  `0=attract / -1=game` — our boolean is `true=attract`).

### Claims Dev must file (fidelity contract — new `docs/rom-study/claims/state.json`)
The test's AC7 fails until these exist and AC8 cross-checks them against source:
| id | symbol | value | source (W3COMN.MAC, physical line) | verbatim |
|----|--------|-------|-----------|----------|
| MC-STATE-PLAY | `S.PLAY` | 0 | :61 | `S.PLAY\t=0\t\t\t;PLAY STATE (STATE)` |
| MC-STATE-PAUS | `S.PAUS` | 128 (0x80) | :59 | `S.PAUS\t=80\t\t\t;PAUSE STATE (STATE)` |
| MC-STATE-SETU | `S.SETU` | 64 (0x40) | :57 | `S.SETU\t=40\t\t\t;SETUP STATS (STATE)` |

`MC-STATE-INIT` (boots to SETUP/attract) is behavioral — file it as a prose/anchor claim
citing W3MAIN.MAC:491 (`LDA I,S.SETU`) + :135 (ATRACT). W3COMN.MAC sets `.RADIX 16` at :1,
so the bare `=80` is **hex 0x80** — the hex reading is *forced* by the sign dispatch (only
0x80's high bit makes PAUSE the `IFMI` arm). Values re-derived from source, not transcribed.

### Rule coverage (lang-review / project rules)
- **Fidelity / citations** (`citations.test.ts` + `citations-source.test.ts`): AC7 pins the
  three STATE claims by physical line; AC8 independently radix-decodes W3COMN.MAC:57/59/61
  (double-entry — a claim agreeing with a core typo cannot pass). Byte-gated (skips on CI).
- **Purity** (`purity.test.ts`): the new surface is pure `src/core` — no clock, no entropy,
  no shell import. Dispatch is a total pure fn; nothing here needs RNG or time.
- **Test quality:** no vacuous assertions — every test pins a value/handler/sign or a claim's
  presence+shape. AC6 re-pins the trio's actual outputs (not just "is defined").
- **Regression:** AC6 guards that the additive union growth left `nextPhase`/`nextWavePhase`/
  `resumePlay`/`allCitiesDead` behaviorally identical (kept green, per the opener choice).

### Explicitly OUT of scope for mc6-1 (do NOT implement — later mc6 stories own them)
- Edge transitions: attract/over→setup start (mc6-2), play↔pause toggle (mc6-3), game-over→
  attract timeout (mc6-6). `mainline` here is the **dispatch boundary**, not the edge table.
- `game.ts` `stepGame` dispatch integration, `attract:boolean` on `GameState`, `createGame`
  boot-to-attract wiring — mc6-2/6-4. Keeping `game.ts` untouched is what holds the 10+
  combat/wave test files green.
- The self-playing attract driver (`attract.ts`, mc6-4) and any render/screens (mc6-5/mc9).

### SM setup note (already handled this session)
`sm-setup` emitted a **stub** `context-story-mc6-1.md` ("_No description / no acceptance
criteria_") while reporting it validated — the recurring cp5-2/sw8-10 failure. SM rewrote it
with the measured spec before this RED. Context is now accurate.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/missile-command/src/core/state.ts` — extended `Phase` to the transitional six-way
  union; added the MAINLINE dispatch (`S_PLAY`/`S_PAUS`/`S_SETU`, `stateCode`, `mainline`,
  `INITIAL_PHASE`, `INITIAL_ATTRACT`). Pure core; ROM citations in `//` comments (not JSDoc).
  The mc3/mc4 trio (`allCitiesDead`/`nextPhase`/`nextWavePhase`/`resumePlay`) is untouched.
- `plugins/missile-command/docs/rom-study/claims/state.json` — new: `MC-STATE-PLAY` (0, :61),
  `MC-STATE-PAUS` (128/0x80, :59), `MC-STATE-SETU` (64/0x40, :57), byte-exact verbatims.

**Tests:** 983/983 passing (GREEN) across 56/56 MC files; `npm run lint` (tsc) clean.
- state-mainline.test.ts 29/29; citations.test.ts 68/68 (incl. the src/core un-cited-literal
  scan of state.ts); spawn-claims.test.ts 9/9 (byte-verify checker over the committed set incl.
  state.json); citations-source 80/80; state/wave-transition/game regression green.

**One GREEN hiccup, fixed:** first pass reddened `citations.test.ts` — the scanner reads
multi-line `/** */` JSDoc as code and flagged `507`/`491`/`6502`/etc. from ROM line numbers in
the `mainline`/`INITIAL_PHASE` doc comments (the `mc-citations-scanner-jsdoc-leak` trap). Fixed
by moving those to `//` line comments (which the scanner strips). Only the two claimed constants
`128`/`64` now survive stripping on code lines.

**Branch:** feat/mc6-1-phase-machine-mainline (pushed)

**Handoff:** To review (Heimdall / Reviewer).

## Subagent Results

| # | Subagent | Status | Received | Findings | Notes |
|---|----------|--------|----------|----------|-------|
| 1 | reviewer-preflight | Complete | Yes | 0 | 983/983 green, tsc clean, tree clean, no debug smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — Reviewer self-covered (mutation battery below) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — Reviewer self-covered (pure total fns, no swallowed errors) |
| 4 | reviewer-test-analyzer | Complete | Yes | 6 | AC3 S_SETU gap (high, CONFIRMED by mutation); classify circular; AC1 toBeDefined; AC8 CI-skip; loop-closure AC unverified; no negative input |
| 5 | reviewer-comment-analyzer | Complete | Yes | 4 | ENDGM citation :573/:570 wrong (CONFIRMED); dispatch range :507-527 overshoot (CONFIRMED :525); context-doc ACs stale; "decimal 80" wording |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — Reviewer self-covered (closed unions, total fns) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — N/A: pure game logic, no I/O/secrets/input surface |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — Reviewer self-covered (impl minimal; only the circular TEST is over-built) |
| 9 | reviewer-rule-checker | Complete | Yes | 5 | R1 double-cast (fleet idiom); R8 LegacyModule mock types; R11 (e as Error); R18 classify circular (CONFIRMED) |

**All received:** Yes

## Rule Compliance (typescript.md — 26 checks, via rule_checker + Reviewer verification)

- **Checks 1–17, 19–26: COMPLIANT** (rule_checker enumerated 34 instances; I spot-verified the load-bearing ones):
  - **#3 exhaustiveness:** `stateCode` switch has explicit `case 'play'`/`'pause'` + `default` for the 4 SETUP-family members; every path returns. Intentional (documented mc6-2..6 re-home). VERIFIED: a future 7th Phase would fall silently into SETUP — acceptable now, noted.
  - **Purity (project rule):** state.ts has no `Date.now`/`performance`/`Math.random`/DOM/shell import. `purity.test.ts` green. VERIFIED by reading the file.
  - **Citation discipline (project rule):** the two non-trivial literals `0x80`(128)/`0x40`(64) are backed by `MC-STATE-*` claims; `0x00`→0 trivial-exempt; ROM line numbers all in `//` comments (none in `/** */`). `node tools/audit/check-citations.mjs` → 202 claims verified, exit 0 (rule_checker ran it; I confirm the mechanism).
  - **Claim shape/uniqueness:** all 3 claims have `{id,symbol,value,meaning,source}`; ids unique.
- **Check #18 (test apparatus fails by PASSING): VIOLATION** — `classify()` (test:~146) re-implements `mainline`'s exact dispatch; the AC2 cross-check compares the real fn against a copy of itself. Confirmed by rule_checker AND test_analyzer. See findings.
- **Check #8 (mock types match real impl): minor VIOLATION** — `LegacyModule` (test:~90) types `nextPhase`/`resumePlay` against the OLD 3-way Phase + `string` returns; masked by `as unknown as`. Harmless (correct values asserted) but imprecise.
- **Check #1 (double-cast) / #11 ((e as Error)): fleet idiom** — the `as unknown as` dynamic-import cast and `(e as Error).message` are the established fleet pattern for RED-phase dynamic imports (state/field/icbm.test.ts). Not blocking; noted.

## Devil's Advocate

Assume this is broken. **It is under-tested in a way I proved.** The suite claims to pin "attract/between/over share `S_SETU`," but it never asserts `stateCode(attract) === S_SETU` — only that it is positive with the high bit clear. I ran the mutant `case 'attract': return 1` (leaving `'setup'` correct) and **all 29 tests passed** — a wrong implementation ships green. The AC2 "dispatch equals sign classification" test cannot save this: its `classify()` oracle is a verbatim copy of `mainline`'s own `code===0 ? 'play' : (code & 0x80) ? 'pause' : 'setup'` body, so a shared dispatch bug reproduces identically on both sides and the assertion stays green — a textbook rule #18 "fails by passing." The suite's real teeth come only from the AC2 literal tests and AC4 constant pins; strip those and the file would be a self-consistency mirror. **The comments lie in small ways that matter here.** In a repo whose entire identity is ROM fidelity, the test header cites `W3MAIN.MAC:573/:570` for the ENDGM SETUP entries — but those lines are the generic SETUP jump-table push/pop; the real entries are `:589/:601` (I verified against source). The dispatch range `:507-527` includes `JSR ALWAYS` (`:527`), which the ROM itself labels "NON-STATE DEPENDENT PROCESSING" — outside the dispatch (closes at `:525`). **The paper contract misdescribes the delivery.** `context-story-mc6-1.md` still promises "a pure, seeded, clock-free transition fn implementing attract→…→attract" with "`'over'→'attract'` loop closure"; what shipped is a stateless `phase→handler` classifier with no RNG and no transitions. A future reader trusting that doc builds the wrong mental model. **What a stressed future edit does:** add a 7th Phase and `stateCode` silently returns `S_SETU` with no compile error (no `assertNever`), and `mainline` silently classifies it SETUP. None of this is a *runtime* bug today — the shipped behavior is correct and byte-verified — but the guard rails that are supposed to keep it correct have confirmed holes, and this is the foundation every later mc6 story inherits.

## Design Deviations

### Reviewer (audit)
- Dev deviation **"Implemented the O-6a-ruled dispatch contract, not the stale top ACs"** → ✓ ACCEPTED by Reviewer: the O-6a ruling is recorded, the tests encode it, and per spec-authority the session assessment governs. `rng` correctly omitted (a pure sign dispatch needs none). Sound.
- Dev deviation **"attract flag in state.ts (INITIAL_ATTRACT), not on GameState"** → ✓ ACCEPTED by Reviewer: keeping the opener state.ts-only is what holds game.ts + 10+ test files green; GameState wiring is legitimately mc6-2/6-4. Sound.
- Dev deviation **"MC-STATE-INIT claim not filed"** → ✓ ACCEPTED by Reviewer: no test requires it, INITIAL_PHASE/INITIAL_ATTRACT add no citable literal, and the boot is not yet behaviorally exercised. Deferral to mc6-2 is filed as a Delivery Finding. Sound.
- **UNDOCUMENTED (Reviewer-found):** the `context-story-mc6-1.md` ACs were never updated to the O-6a contract, so they describe behavior (seeded transition fn + loop closure) this story does not deliver. Spec said (context AC2/AC3) a transition fn; code does a classifier. Severity: Medium (doc). Filed below.

## Reviewer Assessment

**Verdict:** REJECTED

The implementation (`state.ts` + `state.json`) is correct, pure, and byte-verified — I am not disputing the shipped behavior. The rejection is for confirmed **test-apparatus** and **citation** defects on the foundation story, all cheap to fix. Dispatch tags: `[EDGE]` self-covered via mutation (B/C killed, D survived — the one gap); `[SILENT]` none (pure total fns; test catch rethrows with context); `[TEST]` violations below; `[DOC]` wrong ROM citation + stale context ACs; `[TYPE]` closed unions/total fns OK, LegacyModule mock loose (minor); `[SEC]` N/A (no I/O/input); `[SIMPLE]` impl minimal, circular test over-built; `[RULE]` #18 violation confirmed.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | Test apparatus fails-by-passing (rule #18): `stateCode(attract\|between\|over)===S_SETU` is unpinned (mutant `case 'attract': return 1` survives all 29 tests), and the AC2 `classify()` oracle re-implements `mainline` so a shared bug passes. | `plugins/missile-command/tests/state-mainline.test.ts:158-168` (AC3) and `:143-151` (AC2 classify) | In AC3 add `expect(stateCode(phase)).toBe(S_SETU)` for each of attract/between/over. Replace the AC2 `classify()` cross-check with an independent literal `{phase→handler}` expectation table (or drop it — AC2's 3 literal tests + AC3 + AC4 already cover the ground). |
| [MEDIUM] | Wrong ROM citation: cites `W3MAIN.MAC:573/:570` for the ENDGM1/ENDGM2 SETUP entries, but those lines are the generic SETUP push/pop; the real `.WORD ENDGM1-1`/`ENDGM2-1` are at `:589/:601` (labels `:4617/:4683`). Verified against source. | `plugins/missile-command/tests/state-mainline.test.ts:27` (header comment) | Change to `W3MAIN.MAC:589/:601`. |
| [MEDIUM] | Stale story context: AC2/AC3 (and Technical Approach) describe a "seeded transition fn" with "`'over'→'attract'` loop closure" — not what shipped (a stateless `phase→handler` classifier, no RNG, no transitions). | `sprint/context/context-story-mc6-1.md` (AC2/AC3, Technical Approach) | Reword to the delivered contract; explicitly defer transitions + loop closure to mc6-2..6 (SM may fix this in the re-cycle — it is a doc). |
| [LOW] | Dispatch range overshoots: `W3MAIN.MAC:507-527` includes `:527 JSR ALWAYS` ("NON-STATE DEPENDENT PROCESSING"); the IFEQ/IFMI/THEN/THEN dispatch closes at `:525`. Verified. | `state.ts:53,86`; `tests/state-mainline.test.ts:13,124`; `docs/rom-study/claims/state.json:6,17,28` (prose) | Narrow the six citations to `:507-525`. |
| [LOW] | Wording: "decimal 80 would be positive and alias SETUP" invites a numeric-equality misreading (dec 80 = 0x50 ≠ S.SETU 0x40; "alias" = same dispatch branch). | `state.json:17`, `state.ts:67`, test header | Reword to "…would still be positive and dispatch down the SETUP branch." |

**Not blocking / accepted:** double-cast `as unknown as` and `(e as Error).message` (fleet dynamic-import idiom); AC1 `toBeDefined` (contained by the next assertion); AC8 `skipIf(!sourceAvailable)` (established jt1-3 byte-gate; check-citations is the local guard); no negative-input test (TS covers the closed union).

**Handoff:** Back to TEA (Tyr) for red rework — the fixes are test-domain (+ a context-doc reword).

## TEA Rework (round 2 — response to Heimdall's reject)

Addressed all blocking findings; **impl (state.ts/state.json) unchanged** (it was already correct).
Files touched: `plugins/missile-command/tests/state-mainline.test.ts`, `sprint/context/context-story-mc6-1.md`.

- **[HIGH] AC3 exact-value pin (CLOSED):** AC3 now asserts `expect(stateCode(phase)).toBe(S_SETU)`
  for attract/between/over (was only `> 0 && !hi-bit`). **Verified by mutation:** the previously
  surviving mutant `stateCode('attract') -> 1` is now **KILLED** (1 test fails).
- **[HIGH] AC2 circular oracle (CLOSED):** replaced the `classify()` cross-check (which copied
  `mainline`'s own formula — rule #18) with an **independent literal dispatch table** covering all
  six phases with stated-outright expected handlers.
- **[MED] ENDGM citation (CLOSED):** `:573/:570` → `:589/:601` (the real `.WORD ENDGM1-1`/`ENDGM2-1`
  jump-table entries; verified against source).
- **[MED] context-doc drift (CLOSED):** `context-story-mc6-1.md` Problem/Technical Approach/AC2/AC3
  reworded to the delivered classifier contract; edge transitions + loop closure explicitly deferred
  to mc6-2..6.
- **[LOW] dispatch range (CLOSED in test):** `:507-527` → `:507-525` in the test file.

**Verified:** MC suite 988/988 green, `state-mainline.test.ts` 34/34, tsc clean, tree clean; mutant
re-run confirms the AC3 hardening has teeth.

**Remaining for Dev (green re-pass — [LOW], non-blocking):** the same `:507-527` → `:507-525`
citation appears in `state.ts:53,86` and `state.json:6,17,28` (source — TEA cannot edit); and the
"decimal 80 would ... alias SETUP" wording (`state.ts:67`, `state.json:17`) could be reworded to
"...would still dispatch down the SETUP branch." Both are non-blocking prose nits.

## Dev Re-pass (round 2 — post-rework green)

Applied the two remaining [LOW] source-comment nits Heimdall flagged (no behavior change):
- Dispatch citation `:507-527` → `:507-525` in `state.ts:53,86` and `state.json` meaning prose (×3).
- Reworded "decimal 80 would ... alias SETUP" → "would still be positive and dispatch down the
  SETUP branch" in `state.ts:67` and `state.json:17`.
No new design deviations (mechanical comment/prose edits). **Verified:** 988/988 MC green, tsc clean;
`//` comment ranges still stripped by the citation scanner; `check-citations` byte-verify unaffected
(verbatim fields untouched). **Branch pushed** (feat/mc6-1-phase-machine-mainline @ 8db75f0c).
All Heimdall findings (2×HIGH, 2×MED, 2×LOW) are now resolved. Handoff: back to review.

## Subagent Results (round 2 — re-review of the rework)

| # | Subagent | Status | Received | Findings | Notes |
|---|----------|--------|----------|----------|-------|
| 1 | reviewer-preflight | Complete | Yes | 0 | 988/988 green, tsc clean, no smells, tree clean |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled — Reviewer self-covered (mutation re-run) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled — N/A (pure total fns) |
| 4 | reviewer-test-analyzer | Complete | Yes | 0 | CLEAN — mutation-verified BOTH HIGH fixes (AC3 mutant fails 4 tests; DISPATCH table fails on mainline arm-swap → independent) |
| 5 | reviewer-comment-analyzer | Complete | Yes | 1 (new, LOW) | 4 prior findings RESOLVED byte-for-byte; NEW residual: context-doc AC4 lists :539/:561/:615 as cited but only :475 is |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled — closed unions/total fns OK |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled — N/A (no I/O/input) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled — impl minimal; circular test now removed |
| 9 | reviewer-rule-checker | Complete | Yes | 0 | ALL PASS — rule #18 mutation-verified RESOLVED; check-citations 202 claims exit 0; no new violations; state.ts/state.json byte-identical to round 1 |

**All received:** Yes

## Rule Compliance (round 2)

- **Rule #18 (test fails-by-passing): RESOLVED** — `classify()` oracle removed; AC2 now a literal
  DISPATCH table asserting `mainline` output directly (mutation-verified independent by both
  test_analyzer and rule_checker). AC3 pins `stateCode(...)===S_SETU`; the earlier surviving mutant
  is now killed. S_SETU is independently pinned 3 other ways (AC4 literal, AC7 claim, AC8 source
  re-derivation) so AC3's `S_SETU` reference is not self-referential.
- **Purity / citation discipline / claim shape+uniqueness / exhaustiveness:** all PASS (unchanged
  from round 1; `state.ts`/`state.json` byte-identical). `check-citations.mjs` → 202 verified, exit 0.
- **No new rule violations** introduced by the rework (rule_checker diffed the commits directly).

## Devil's Advocate (round 2)

Assume the rework only *looks* fixed. Could the DISPATCH literal table be secretly circular like the
`classify()` it replaced? No — I had two independent subagents mutate the real `mainline` (swap the
pause/setup arms) and the table reddened 3–4 of its own cases plus the AC5 boot case, proving it
asserts against the function's actual output, not a re-derivation of its formula. Could the tightened
AC3 be a self-referential pin (`stateCode(phase) === S_SETU`, both from the module under test)? It
would be, except `S_SETU`'s value 0x40 is nailed down three *other* ways in the same file — an AC4
bare-literal assertion, an AC7 committed-claim value, and an AC8 byte-level re-derivation from
`W3COMN.MAC:57` — so a lockstep mutant that changed both `stateCode` and the `S_SETU` export still
dies at AC4/AC7/AC8. Where the rework is genuinely *weakest* is the paperwork, not the code: the
context doc still carries two stale phrases my own rework introduced-by-omission — the Scope bullet
calls `mainline` "seeded" (it takes no RNG), and AC4 still lists `:539/:561/:615` as "preserved"
citations when only `:475` is actually cited (the other three are PLAY/SETUP/PAUSE handler headers
that belong to mc6-2..6, which this story deliberately does not touch). Neither is a code defect, a
test hole, or a wrong ROM fact — the *shipped* citations are all byte-verified correct — but they are
exactly the kind of "doc says X, code does Y" drift this repo dislikes, and on the foundation story
they will mislead the next reader if left. They are cheap and belong to the context doc (SM's
artifact), so I file them as non-blocking for the finish sweep rather than spend a third TDD cycle on
two words. Everything with teeth — the dispatch, the constants, the claims, the regression trio — is
correct and mutation-guarded.

## Design Deviations

### Reviewer (audit — round 2)
- Round-1 deviation stamps stand: all three Dev deviations remain ✓ ACCEPTED (the impl is byte-identical to round 1). No new deviations introduced by the rework.

## Reviewer Assessment (round 2)

**Verdict:** APPROVED

The rework resolves every round-1 finding, independently mutation-verified. The implementation
(`state.ts` + `state.json`) is byte-identical to round 1 — correct, pure, byte-verified (202 claims,
exit 0); the test apparatus now has teeth (rule #18 closed, AC3 mutant killed, DISPATCH table proven
non-circular); all ROM citations are byte-accurate against source. Dispatch tags: `[EDGE]` mutation
re-run confirms all six phases pinned; `[SILENT]` none (pure total fns); `[TEST]` both HIGH fixes
verified, no new test issues; `[DOC]` prior citation errors fixed byte-for-byte, two residual
context-doc phrases remain (non-blocking, filed for SM); `[TYPE]` closed unions/total fns OK;
`[SEC]` N/A; `[SIMPLE]` circular test removed, impl minimal; `[RULE]` #18 resolved, no new violations.

**Non-blocking residuals (filed for SM finish sweep — doc only):**
| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| [LOW] | Scope bullet still calls `mainline` "seeded" — it takes no RNG (pure sign dispatch). | `sprint/context/context-story-mc6-1.md:50` | Drop "seeded". |
| [LOW] | AC4 lists `:539/:561/:615` as preserved citations, but only `:475` is cited (the other three are mc6-2..6 handler headers). | `sprint/context/context-story-mc6-1.md:64-65` | Reduce AC4 to the citations actually shipped (`:475` + W3COMN.MAC:57/59/61 + :131/:135/:491/:493/:507-525/:3601/:3663/:589/:601), or note :539/:561/:615 as forward-looking. |

Both are context-doc wording; the sprint YAML title/ACs also still carry the stale six-way
`mainline(phase,rng)` shape (Dev's earlier Improvement finding). SM should reconcile all three
(context doc + epic YAML) at finish.

**Handoff:** To SM (Baldur) for finish-story.