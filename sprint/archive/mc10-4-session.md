---
story_id: "mc10-4"
jira_key: "mc10-4"
epic: "mc10"
workflow: "tdd"
---
# Story mc10-4: Wire the per-wave palette: pass game.wave as drawFrame's 5th arg in main.ts (currently defaults to INITIAL_WAVE, freezing wave-1 colours forever) + a regression test that a later-wave sky differs from wave 1. paletteForWave already built (mc9-2)

## Story Details
- **ID:** mc10-4
- **Jira Key:** mc10-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/mc10-4-wire-per-wave-palette
- **PR:** https://github.com/slabgorb/arcade/pull/209

## Technical Context

### Current State
- **drawFrame signature:** `plugins/missile-command/src/shell/render.ts` exports `drawFrame(ctx, state, width, height, wave = INITIAL_WAVE)`
- **Current call site:** `plugins/missile-command/src/main.ts` line 94 calls `drawFrame(context, game, canvas.width, canvas.height)` — missing the 5th wave argument
- **Palette function:** `paletteForWave(wave)` is imported from `shell/palette.ts` and is fully per-wave (mc9-2)
- **Issue:** The 5th parameter defaults to `INITIAL_WAVE`, so every render uses wave-1 palette colors forever, even when the game state progresses to later waves

### Acceptance Criteria
1. main.ts passes `game.wave` as drawFrame's 5th argument so the per-wave palette follows the live game state
2. A regression test asserts that a later-wave sky/palette color (e.g., wave 2 or higher) differs from wave 1 (control comparison, not just non-null check)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-10T17:40:53Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T17:25:46Z | 2026-08-10T17:28:26Z | 2m 40s |
| red | 2026-08-10T17:28:26Z | 2026-08-10T17:33:22Z | 4m 56s |
| green | 2026-08-10T17:33:22Z | 2026-08-10T17:35:30Z | 2m 8s |
| review | 2026-08-10T17:35:30Z | 2026-08-10T17:40:53Z | 5m 23s |
| finish | 2026-08-10T17:40:53Z | - | - |

## Delivery Findings

No upstream findings at setup time.
- No upstream findings during implementation. *Found by Dev during implementation.*

## Design Deviations

No design deviations at setup time.

## Sm Assessment

Title-only story — the title IS the spec, and its premise was measured before RED, not assumed. Confirmed at setup:
- `drawFrame(ctx, state, width, height, wave = INITIAL_WAVE)` in `plugins/missile-command/src/shell/render.ts`.
- `main.ts:94` calls `drawFrame(context, game, canvas.width, canvas.height)` — the 5th arg is omitted, so it defaults to `INITIAL_WAVE` and freezes wave-1 palette forever.
- `paletteForWave(wave)` (mc9-2) is genuinely per-wave — the fix has something to bite.

**Guidance to TEA (RED):**
- The regression test must be a **control comparison**: assert a later-wave sky/palette DIFFERS from wave 1, not a bare non-null/defined check. A frozen palette still returns a valid colour, so a non-null assertion passes on the bug and proves nothing.
- Boundary: `paletteForWave` is pure/core-adjacent; `main.ts` is shell. Wire the live `game.wave` through without dragging shell state into core. Keep the MC purity/boundary guard green.

Merge gate clean (no open PRs). Claim branch `feat/mc10-4-wire-per-wave-palette` pushed. Ready for TEA → RED.

## TEA Assessment

**RED landed** — `plugins/missile-command/tests/mc10-4-per-wave-palette-wiring.test.ts` (commit 47ddf054). Verified: **2 failed | 2 passed**, `tsc --noEmit` clean.

**Premise re-confirmed before writing tests (title-only story):**
- `GameState.wave` (core/game.ts:120) is the live 1-based wave, advanced at each wave-end (game.ts:405). So `game.wave` is genuinely the live value — the fix is not a no-op.
- `render-palette.test.ts:147` already covers drawFrame's per-wave sky at the drawFrame level. The *new* gap this story closes is the **main.ts call site**, which no existing test guarded.

**Two contracts, two test shapes:**
- **AC1 — the wiring (the genuine RED, both assertions fail today):** main.ts is a DOM entry (touches `document` at module top) and cannot be imported under vitest, so the call is pinned by SOURCE TEXT — the fleet `?raw` idiom (place-cursor.test.ts, mc8-4-event-wiring.test.ts). Comments are stripped first (mc9-2 review round-1 lesson: a header comment can satisfy a whole-file grep). Positive: `drawFrame(...canvas.height, game.wave)` — anchored so game.wave must be the arg AFTER canvas.height, rejecting the wrong-slot mutation. Negative/control: the bare `drawFrame(...canvas.height)` 4-arg form must be GONE. Both redden on today's main.ts, both green after the fix.
- **AC2 — the consequence (control comparison, green-on-arrival):** reproduces the bug behaviourally — paint a wave-17 game the FROZEN 4-arg way (→ wave-1 sky) vs the WIRED 5-arg way (`game.wave` → wave-17 sky) and assert they DIFFER, plus pin each sky to its exact palette slot. Not a non-null check: a frozen palette still returns a valid colour, so the difference against the wave-1 control is the whole assertion. Green on arrival because mc9-2 built the machinery; it guards the consequence the wiring unlocks.

**Rule Coverage:**
- *Core/shell purity boundary* (the repo's cardinal rule): the fix lives entirely in `main.ts` (shell) passing an existing core field outward — no new core→shell import. The AC2 test drives `drawFrame` (shell) with pure-core state only; the existing `purity.test.ts` continues to guard `src/core/`. No new purity risk introduced.
- *Meaningful assertions / no vacuous tests*: every test asserts an exact value or an inequality against a control; no `is*` truthiness stand-ins, no `let _ =`.
- *Comment-satisfied source grep* (prior fleet defect): guarded by stripping comments before matching and anchoring the positional regex.

**Handoff to Dev (GREEN):** one-line change — `main.ts:94` → `drawFrame(context, game, canvas.width, canvas.height, game.wave)`. Then all 4 tests green, `render-palette` stays green, purity stays green.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/missile-command/src/main.ts` — the frame loop now passes the live `game.wave` as `drawFrame`'s 5th argument (+ a 3-line comment explaining why, matching main.ts's dense-comment idiom). This is the minimal fix TEA's RED demanded; no other code touched.

**Tests:** GREEN.
- mc10-4 file: 4/4 passing (AC1 wiring + AC2 control both green).
- Sibling guards held: `render-palette.test.ts` and `purity.test.ts` green.
- Full missile-command project: **1224/1224** passing (69 files).
- `tsc --noEmit` clean.

**Branch:** feat/mc10-4-wire-per-wave-palette (commit 206fe0b6; RED at 47ddf054) — push below.

**Purity note:** fix lives entirely in the shell (`main.ts`) forwarding an existing pure-core field (`GameState.wave`) into an already-wave-aware shell renderer. No new core→shell coupling; `purity.test.ts` unaffected.

**Handoff:** To Reviewer (review phase).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Yes (disabled) | skipped/disabled | none | assessed by Reviewer (see Edge below) |
| 3 | reviewer-silent-failure-hunter | Yes (disabled) | skipped/disabled | none | assessed by Reviewer (N/A — no error paths) |
| 4 | reviewer-test-analyzer | Yes | clean | none | N/A |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A |
| 6 | reviewer-type-design | Yes (disabled) | skipped/disabled | none | assessed by Reviewer (see Type below) |
| 7 | reviewer-security | Yes (disabled) | skipped/disabled | none | assessed by Reviewer (N/A — render arg, no auth/secrets/input) |
| 8 | reviewer-simplifier | Yes (disabled) | skipped/disabled | none | assessed by Reviewer (minimal 1-arg change) |
| 9 | reviewer-rule-checker | Yes | clean (27 rules, 0 violations) | none | N/A |

**All received:** Yes (4 enabled returned clean, 5 disabled pre-filled + self-assessed)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict: APPROVE.** No Critical/High/Medium/Low issues. A minimal, correct wiring fix with a genuinely-catching regression test; all four enabled specialists returned clean, and I independently covered the five disabled domains.

### Rule Compliance

- **Core/shell purity boundary (repo cardinal rule):** COMPLIANT. The only code change is `main.ts:97` (shell) reading the existing pure-core field `GameState.wave` and passing it to the shell renderer `drawFrame` — the allowed shell-consumes-core direction. No core file touched; no new import in either direction. `purity.test.ts` sweeps only `src/core/` (main.ts and the new test are structurally out of scope) and stays green. `[RULE]` confirmed by rule-checker across 27 rules, 0 violations.
- **`.js` extension on relative imports (TS checklist #5):** COMPLIANT-by-convention. Test imports `../src/shell/palette` without `.js`, matching sibling `render-ground.test.ts`/`render-palette.test.ts`/`palette.test.ts`; tsconfig uses `moduleResolution: bundler`, under which the node16 extension rule does not bind.
- **`as unknown as CanvasRenderingContext2D` (TS checklist #1 type escape):** COMPLIANT-by-idiom. Byte-identical to the established fleet mock-canvas construction in `render-battle.test.ts:88` and siblings; a `Record<string, unknown>` recording mock cannot satisfy the DOM interface otherwise in node.
- **Test quality — no vacuous assertions (TS checklist #8/#18):** COMPLIANT. AC2 compares two *different* computed skies (`paletteForWave(1)` vs `paletteForWave(17)`, both imported from the real module) against two *different* drawFrame calls; a broken wiring cannot satisfy both the frozen-equals-wave1 and wired-equals-wave17-and-differs assertions at once.

### Observations (≥5)

- `[VERIFIED]` The fix is correct and minimal — evidence: `main.ts:97` now reads `game.wave` (a live `readonly number`, `game.ts:120`, initialized `game.ts:160`, advanced `game.ts:405`) as drawFrame's 5th arg; drawFrame's signature already accepts `wave` (`render.ts:78`). Complies with the purity rule (shell reads core).
- `[VERIFIED]` The regression genuinely bites — evidence: RED run showed AC1's two assertions failed on the pre-fix 4-arg call; both test-analyzer and rule-checker independently re-reverted the line and reproduced the RED. Not a decorative test.
- `[TEST]` (confirmed clean) test-analyzer ran the wrong-slot mutation (`game.wave` moved ahead of `canvas.height`) and both AC1 anchors still failed — the regex pins the *positional tail* `canvas.height, game.wave)`, not a bare token. No mutation residue left (`git diff main.ts` empty).
- `[DOC]` (confirmed clean) comment-analyzer verified every comment claim against code, including the `game.ts:405` line citation and the wave-17→CWHITE / wave-1→CBLACK palette facts; comment-stripping neutralizes the header's own `game.wave` prose before the regex runs (avoids the mc9-2 round-1 grep trap).
- `[VERIFIED] Edge` — `game.wave` is never `undefined`/`0`/`NaN`: it is a non-optional `readonly number`, set by every `GameState` constructor and only ever incremented; spread (`{...state}`) preserves it. So the fix cannot silently re-freeze via an undefined arg. (edge-hunter disabled; assessed here.)
- `[VERIFIED] Type` — `game.wave: number` → drawFrame `wave: number`; no cast on the production line, tsc `--noEmit` clean. (type-design disabled; assessed here.)
- `[VERIFIED] Silent-failure / Security` — the change adds no error path, no try/catch, no I/O, no auth/secret/input surface; it forwards one numeric field to a pure renderer. N/A by inspection. (both disabled; assessed here.)

### Devil's Advocate

Let me try to break this. First attack: *the fix is a no-op.* If `game.wave` were undefined at runtime, `drawFrame`'s `wave = INITIAL_WAVE` default would kick back in and the palette would still be frozen — a fix that ships green while doing nothing. I chased this: `GameState.wave` is a non-optional `readonly number` (`game.ts:120`), set to `INITIAL_WAVE` in `createGame`/`createPlayGame` (`game.ts:160`) and to `state.wave`/`nextWave` in every other producer (`game.ts:405/608/627`); TypeScript forbids a `GameState` literal that omits it, and object spread preserves it. So `undefined` is unreachable — the no-op attack fails. Second attack: *the test passes even if the wiring is wrong.* AC2 could be a trap if its "expected" values were derived the same way as the observed ones. But it imports `paletteForWave`/`rgbCss`/`SLOT` from the real `src/shell/palette` and compares the *frozen* paint (no 5th arg) against the *wired* paint (`game.wave`) — two distinct calls whose skies must both equal their respective palette slots AND differ from each other. A flattened palette or a dropped arg breaks at least one of those exact-value pins; it cannot pass vacuously. Third attack: *the source-text guard is satisfiable by prose.* The mc10-4 header comment literally contains both the old 4-arg call string and `game.wave` — a whole-file grep would be fooled. But the test strips block+line comments before matching, and anchors on the positional tail rather than a token; the wrong-slot and 4-arg mutations both redden (verified twice). Fourth attack: *collateral damage elsewhere.* Are there other frozen `drawFrame` call sites? rule-checker grepped `src/` and `tests/`: the only other 4-arg calls are the render-*.test.ts tests that *intentionally* exercise the default-wave path, plus the signature default itself — none is a stale copy of the shell wiring. Fifth attack: *a wave beyond the palette table throws.* `paletteForWave` is modular (`index = floor((wave-1)/2) % 10`), so arbitrarily high waves wrap safely; no out-of-range crash as play advances. Every attack is answered by a cited line. I cannot manufacture a failure.

### Deviation Audit

`## Design Deviations` logs none (setup + Dev both recorded "no deviations"). Nothing to accept or reject.

**Judgment: APPROVE** — merge-ready. Recommend reviewer→finish.