---
story_id: "mc1-3"
jira_key: "mc1-3"
epic: "mc1"
workflow: "tdd"
---
# Story mc1-3: Trackball/mouse crosshair cursor with clamp

## Story Details
- **ID:** mc1-3
- **Jira Key:** mc1-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-06T03:28:57Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T03:04:03Z | 2026-08-06T03:06:35Z | 2m 32s |
| red | 2026-08-06T03:06:35Z | 2026-08-06T03:17:26Z | 10m 51s |
| green | 2026-08-06T03:17:26Z | 2026-08-06T03:23:22Z | 5m 56s |
| review | 2026-08-06T03:23:22Z | 2026-08-06T03:28:57Z | 5m 35s |
| finish | 2026-08-06T03:28:57Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): AC2's "the crosshair moves on screen at /missile-command/" has a visible-wiring tail the node suite cannot reach — a cursor field on `GameState`, the crosshair glyph drawn in `render.ts` at the cursor position, and a `pointermove` listener in `main.ts` calling `applyPointerMotion`. The env is `node` (no jsdom), so this file pins only the deterministic seam under the listener (`applyPointerMotion` mapping + V-flip + clamp-via-core). Affects `src/core/game.ts`, `src/shell/render.ts`, `src/main.ts` (Dev wires the seam into a visible, moving crosshair; the reviewer/owner confirms it by the /missile-command/ screenshot, per the field.test.ts "pixels are the reviewer's job" precedent). *Found by TEA during test design.*
- **Improvement** (non-blocking): the citation gate + `claims/*.json` are DEFERRED to a later epic (skeleton-first), so cursor.ts's cabinet fidelity is enforced here only by a raw source-text scan (must name W3MAIN/W3COMN + IHMIN/IHMAX/IVMIN/IVMAX) plus the source-ground-truth anchor. When the gate lands, cursor.ts's four bounds and the clamp routine should get real `claims` entries. Affects a future mc-epic citation story. *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the crosshair is wired with a plain `pointermove` listener reading `event.movementX/Y` (no Pointer Lock). That is faithful enough for the skeleton screenshot and the clamp still holds, but a real trackball feel wants `requestPointerLock()` so motion continues when the OS pointer hits a screen edge. Affects `src/main.ts` (a later feel/tuning story). *Found by Dev during implementation.*
- **Improvement** (non-blocking): `moveCursor` maps the delta 1:1 (no sensitivity multiply). The cabinet's `ADCURS` shifts the trackball increment (`ASL` ×6/×7) to scale hardware counts — a mouse's `movementX/Y` are already pixel-scaled, so 1:1 is the natural default, but a sensitivity constant is a plausible later tuning knob. Affects `src/shell/input.ts`. *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): `clamp()` in `cursor.ts` passes `NaN` through unchanged (`NaN < lo` and `NaN > hi` are both false), so a NaN delta would poison the cursor. No realistic path produces it (`PointerEvent.movementX/Y` are always finite), so this is defense-in-depth, not a live defect — but if a future caller feeds cursor.ts a less-trusted value, add a finite-guard at the module entry. Affects `src/core/cursor.ts` (rule-checker #21, security both concur; LOW). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the two source-citation guards in `cursor.test.ts` (`toMatch(/W3MAIN/)` etc.) scan the whole file; safe today because `cursor.ts` is 62 lines with a single citation block, but if the file grows a decoy token could false-pass — tighten to a bounded slice per lang-review #25 when that happens. Affects `plugins/missile-command/tests/cursor.test.ts` (LOW). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No deviations recorded.

### Reviewer (audit)

- No deviations were logged by TEA/Dev, and I found none undocumented. The game.ts/render.ts/main.ts changes are not a spec deviation — AC2 ("the crosshair moves on screen … cannot leave the play area") requires the visible/moving wiring, and TEA's Delivery Finding named those exact three files as Dev's to complete. Every change traces to an AC. Nothing to FLAG.

## SM Assessment

**Story:** mc1-3 (2pt, p3, tdd/phased) — trackball/mouse crosshair cursor with clamp, missile-command plugin. Adds `core/cursor.ts` (pure reducer) and `shell/input.ts` (delta source).

**Premise verified against the current tree (this is a fidelity story, so its cabinet cites were the falsifiable premise):**
- The missile-command plugin exists (`src/core/{field,game}.ts`, `src/shell/render.ts`). `cursor.ts`/`input.ts` do not exist yet — a clean two-new-files feature, no stale-state claim to rot.
- Cabinet source `reference/source/W3MAIN.MAC` really contains the cited routines: `PROCESS CURSOR MOTION`, `ADD TBALL TO CURSOR POSITION`, `UPDATE CURSOR POSITION` (confirmed with Python; a naive `grep` in the source dir misbehaved due to the adjacent `.bin` — not evidence of absence).
- **Citation convention resolved:** W3MAIN.MAC is double-spaced, so the design's logical cites map to physical lines ×2 — cite `:424`→physical 847, `:546`→1091, `:587`→1173. Opening raw physical 424/546/587 lands in the wrong routine. This is recorded in the context Background so TEA/Dev don't hit the trap.

**Backlog shape:** ACs are unambiguous — no either/or requiring a user ruling. Copied verbatim into context (diffed against epic YAML: match).

**Contention:** none. `git branch -r` showed only the completed `feat/mc1-2-*` and `fix/jt9-35-*` (a-2) before I claimed; no sibling owns mc1-3.

**Setup:** session + context created by sm-setup. I added the omitted `Repos: arcade` field and stamped `status: in_progress` (sm-setup left it at backlog — the recurring trap). Claim committed + pushed to `main`; empty claim branch `feat/mc1-3-trackball-crosshair-cursor` pushed for sibling visibility.

**Routing:** phased tdd → hand off to TEA (red phase). TEA writes the failing unit tests for the pure `cursor.ts` reducer (integrate delta, clamp to field bounds) against the cited cabinet behaviour; desktop-only, no touch ACs.

## TEA Assessment

**Tests Required:** Yes
**Reason:** N/A — a new-behaviour feature (two new modules), not a chore.

**Test Files:**
- `plugins/missile-command/tests/cursor.test.ts` — AC1: `core/cursor.ts` as a pure reducer `moveCursor(cursor, {dh,dv})` that integrates the per-frame delta and clamps to the cabinet play area **H∈[8,247], V∈[45,206]** (`IHMIN/IHMAX/IVMIN/IVMAX`; clamp routine `UPDCUR/DOCURS`, W3MAIN:587). Covers: exported bounds, interior integration, frame accumulation, both-corner clamp, per-axis-independent clamp, boundary-inclusive, out-of-bounds-in → pulled-back, a positions×deltas fuzz sweep asserting the invariant, referential transparency, non-mutation, and a raw source-citation scan. Plus a **source-ground-truth** anchor decoding `W3COMN.MAC` (IHMIN=8, IHMAX=247., IVMIN=45., TOPSCR=222.→IVMAX=206) — green from day one.
- `plugins/missile-command/tests/input.test.ts` — AC2: `shell/input.ts` `applyPointerMotion(cursor, movementX, movementY)` maps a screen-space pointer delta to the cabinet delta and drives the crosshair through the core reducer. Covers: the four directions, the **V-flip** (screen-up = cabinet-V-up, since render.ts flips V), equivalence to `moveCursor(cursor, {dh:movementX, dv:-movementY})`, an unbounded-sweep clamp invariant, corner pinning, and a wiring scan (imports `moveCursor` from `core/cursor` — does not re-implement the clamp).

**Tests Written:** 26 tests (18 in cursor.test.ts, 8 in input.test.ts) covering 2 of 2 ACs.
**Status:** RED — verified. `npx vitest run --project missile-command`: `24 failed | 42 passed`. Of the new tests, **24 fail** for the absent modules (self-describing "…not built yet" errors, not module-resolution/compile stack traces) and **2 pass** — the source-ground-truth block that reads `W3COMN.MAC` directly (confirmed by name in a solo run; the haiku runner mis-attributed which 2 passed — the real passers are `IHMIN/IHMAX/IVMIN`= and `IVMAX=TOPSCR-16`, NOT the citation-scan tests, which correctly redden on the absent `cursor.ts`). Pre-existing suite (field/render-field/purity/scaffold) stays green. `npm run lint` (tsc --noEmit) is green — the `/* @vite-ignore */` variable-specifier RED-import idiom keeps the release gate clean while the modules are absent.

### Rule Coverage

| Rule (lang-review/typescript.md) | Test(s) | Status |
|------|---------|--------|
| Missing `readonly` on params not to be mutated | `does not mutate the cursor it is given` + `readonly` on `Cursor`/`Delta` in the contract | failing (RED) |
| Determinism / no ambient entropy or clock in core | `returns the same result for the same inputs` + purity.test.ts src/core sweep (auto-covers cursor.ts) | failing (RED) / green sweep |
| `.js` extension on ESM relative imports | RED specifiers use `../src/**/*.js`; wiring scan accepts `core/cursor.js` | failing (RED) |
| Clamp / bounds correctness (no off-by-one at edges) | `boundary is kept (inclusive)`, `pushing outward stays pinned`, fuzz-sweep invariant | failing (RED) |

**Rules checked:** 4 of the applicable typescript.md rules have direct test coverage; the remaining checklist items (React hooks, enums, `as any`, async return types) are N/A to two small pure/adapter modules. cursor.ts's core purity is enforced automatically by the existing `purity.test.ts` src/core sweep — no separate purity test authored (would duplicate the sweep).
**Self-check:** 0 vacuous tests found. Every test asserts a concrete value, a strict inequality, or a fuzz-invariant range; no `let _ =`, no `assert(true)`, no always-None.

**Handoff:** To Dev (Yoda) for GREEN — build `src/core/cursor.ts` (pure reducer + four cited bounds) then `src/shell/input.ts` (the V-flipping adapter consuming `moveCursor`). See the two non-blocking Delivery Findings above: the visible/moving crosshair wiring (game state + render + main.ts pointermove) is Dev's to complete and the reviewer/owner's to confirm by screenshot — the node suite pins only the mapping+clamp seam.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/cursor.ts` (NEW) — the pure reducer. `moveCursor(cursor, {dh,dv})` integrates the delta and clamps to `[HMIN=8, HMAX=247] × [VMIN=45, VMAX=206]` via an inclusive `clamp` (the cabinet's `CMP/IFCC/IFCS` pair). Exports the four cited bounds (`IHMIN/IHMAX/IVMIN/IVMAX`, `W3COMN`) and `INITIAL_CURSOR` (play-area centre). Returns a fresh object; no clock/entropy/shell import.
- `src/shell/input.ts` (NEW) — `applyPointerMotion(cursor, movementX, movementY)` = `moveCursor(cursor, {dh: movementX, dv: -movementY})`. The single adaptation it owns is the **V-flip** (screen-down → cabinet-V-down), matching render.ts's V flip.
- `src/core/game.ts` — `GameState` gains `cursor: Cursor` (initialised to `INITIAL_CURSOR`); `stepGame` preserves it (`{...state, frame+1}`). Import of core/cursor stays inside the core boundary (purity-clean).
- `src/shell/render.ts` — `drawFrame` now paints a white crosshair at `state.cursor`, reusing the existing V-flipping `project`. (`_state` → `state`.)
- `src/main.ts` — a `pointermove` listener feeds `event.movementX/Y` through `applyPointerMotion` into `game.cursor`, so the crosshair moves and stops at the field edge.

**Tests:** 67/67 passing (GREEN) — verified by direct run and the `testing-runner` subagent (`Test Files 6 passed (6) / Tests 67 passed (67)`, 0 failed). `npm run lint` (tsc --noEmit) PASS. The count rose 66→67 because the `purity.test.ts` src/core sweep now auto-covers the new `cursor.ts` and it is clean — the boundary guard biting as designed.

**Branch:** none
**Branch note:** trunk-based — work landed on `main` (commit `63d93cd`, pushed to `origin/main`; claim branch `feat/mc1-3-trackball-crosshair-cursor` also pushed for sibling visibility). No PR.

**AC status:** AC1 (pure clamped reducer, deterministic, no shell import) — met and node-tested. AC2 (input feeds motion as delta; crosshair moves on screen and cannot leave the play area) — the mapping+clamp seam is node-tested; the visible/moving crosshair is now fully wired (game → render → main.ts), leaving only the on-screen confirmation to the Reviewer/owner screenshot at `/missile-command/`.

**Self-review:** wired end-to-end (pointer → core → render); follows the plugin's cabinet-coordinate + V-flip patterns; both ACs met; clamp is the error-boundary the story asks for (no other error handling in scope).

**Handoff:** To Reviewer (Obi-Wan) for code review + the `/missile-command/` crosshair screenshot.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (67/67 green, lint green, 0 smells, tree clean) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings (self-assessed below) |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A (every ROM citation re-verified against source) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A (no-network/no-storage domain; 2 low infos deferred) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 30 rules | N/A (2 low infos deferred to Delivery Findings) |

**All received:** Yes (4 enabled returned clean, 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 0 confirmed blocking, 0 dismissed, 2 deferred (both LOW, recorded as Reviewer Delivery Findings)

### Devil's Advocate

Assume this is broken. Where would it fail? **The clamp math:** `clamp(x,lo,hi) = x<lo?lo:x>hi?hi:x` — if `x` is `NaN`, both comparisons are false and NaN leaks through, poisoning `cursor` and every frame after. Is that reachable? The only caller chain is `pointermove → applyPointerMotion → moveCursor`, and `PointerEvent.movementX/Y` are spec-guaranteed finite numbers; there is no `parseFloat`, no URL/JSON, no user string anywhere in the path. So it is unreachable today — recorded as a LOW defense-in-depth follow-up, not a block. **The V-flip:** invert it and the crosshair would go DOWN when the mouse goes up. `input.test.ts` pins all four directions and, decisively, asserts `applyPointerMotion(c,mx,my) === moveCursor(c,{dh:mx,dv:-my})` against the *real* imported reducer — a swapped sign or axis fails it. Confirmed correct: `dv=-movementY` matches `render.ts`'s `y = height - v/H*height`. **The invisible crosshair:** no node test asserts the crosshair is actually painted (the render-field recording-ctx counts only bottom-band marks; the crosshair sits mid-screen). A "forgot to draw it" bug would pass all 67 tests. I mitigated this by reading the paint path directly: `drawFrame` calls `project(state.cursor,…)` then strokes a cross, structurally identical to the tested field draw, drawn LAST so it's on top — and it is wired end-to-end (`main.ts` pointermove → `game.cursor` → `drawFrame`). The residual visual confirmation (does it move and stop at the edge on screen?) is the owner/reviewer screenshot at `/missile-command/`, the same "pixels are the reviewer's job" boundary mc1-2 set. **State races:** `pointermove` and the rAF loop both reassign the module-level `game`; JS is single-threaded so each reassignment is atomic, and `stepGame` spreads `{...state}` so a frame never drops the cursor. **Off-by-one at the edge:** the clamp is inclusive and `cursor.test.ts` pins landing exactly on HMAX/VMIN plus a positions×deltas fuzz sweep asserting the invariant on every result. Nothing here breaks under adversarial inputs the domain can actually produce.

### Rule Compliance

Rubric = `.pennyfarthing/gates/lang-review/typescript.md` + CLAUDE.md project rules. Verified (by rule-checker's 30-rule pass AND my own greps):
- **Core/shell boundary** (the project's #1 rule): `cursor.ts` imports nothing; `game.ts` imports only `./cursor.js` (core→core). No shell import in core. Purity sweep auto-covers `cursor.ts` and passes. ✓
- **ESM `.js` extensions:** all 7 relative imports carry `.js`. ✓
- **Cabinet-constant citations:** all four bounds cite `IHMIN/IHMAX/IVMIN/IVMAX` + `W3COMN` lines; I re-decoded the source (IHMIN=8:113, IHMAX=247.:115, IVMIN=45.:117, TOPSCR=222.:107→IVMAX=206) — exact match. ✓
- **Desktop-only:** only `pointermove` + `movementX/Y`; no touch/viewport/matchMedia. ✓
- **Type/readonly:** `Cursor`/`Delta`/`GameState` fields all `readonly`; no `as any`/`as unknown`/`@ts-ignore`/non-null. ✓
- **Test quality:** no vacuous assertions, no `.only/.skip`; the equivalence test cross-checks against the real module. ✓
- **No premature `src/shared` extraction.** ✓

## Reviewer Assessment

**Verdict:** APPROVED
**Data flow traced:** `PointerEvent.movementX/Y` (main.ts pointermove) → `applyPointerMotion` (V-flip `dv=-movementY`) → `moveCursor` clamp to `[8,247]×[45,206]` → `game.cursor` → `render.ts project()` → canvas. Safe because the only mutation of `cursor` is through the unconditional clamp; the crosshair provably cannot leave the play area.
**Pattern observed:** pure core reducer + thin shell adapter, cabinet coordinates with V-flip localized to the shell — matches the plugin's existing `field.ts`/`render.ts` convention at `plugins/missile-command/src/shell/render.ts:32`.
**Error handling:** the clamp IS the boundary the story asks for; inclusive and fuzz-verified (`cursor.test.ts:179`). One LOW NaN-passthrough follow-up deferred (unreachable in-domain).
**Subagents:** 4 enabled, all clean (preflight, comment-analyzer, security, rule-checker); 5 disabled via settings. 0 blocking findings; 2 LOW infos deferred.
**Dispatch tags:** `[EDGE]` none (disabled; boundary self-covered by fuzz sweep + edge tests) · `[SILENT]` none (disabled; no swallowed errors — the one `catch` in tests rethrows with context) · `[TEST]` none (disabled; self-assessed — 26 meaningful assertions, equivalence cross-check, 0 vacuous) · `[DOC]` none (comment-analyzer clean — all citations verified) · `[TYPE]` none (disabled; all `readonly`, no escapes) · `[SEC]` none (security clean — no-network/no-storage domain) · `[SIMPLE]` none (disabled; two files are ~60/26 lines, no over-engineering) · `[RULE]` none (rule-checker 0/30 violations).
**Visual confirmation outstanding:** the moving/clamping crosshair on screen at `/missile-command/` is the owner/reviewer screenshot check (mc1-2 precedent) — the code path is verified by reading + wiring; not a block.
**Handoff:** To SM for finish-story.

## Impact Summary

**mc1-3: Trackball/Mouse Crosshair Cursor** ships a pure clamped cursor reducer (`core/cursor.ts`) and a V-flipping input adapter (`shell/input.ts`) that integrate pointer motion and bind it to the missile-command play area (H∈[8,247], V∈[45,206], cited to `IHMIN/IHMAX/IVMIN/IVMAX` in `W3COMN.MAC`). The implementation adds a `cursor` field to `GameState`, renders a white crosshair glyph at the cursor position, and hooks a `pointermove` listener in `main.ts` to feed mouse/trackball delta through the clamp. All 67 `missile-command` tests pass; `npm run lint` is clean. Review completed in a **single approved round** with no rejections; four enabled reviewer subagents (preflight, comment-analyzer, security, rule-checker) all returned clean (rule-checker 0/30 violations), and independent SM/Reviewer verification confirmed every ROM citation against the vendored source. Two **LOW non-blocking** follow-ups were deferred (not blockers): a defense-in-depth NaN-guard note for `cursor.ts` (unreachable in-domain — `PointerEvent.movementX/Y` are always finite) and a source-citation-scan-scope tightening for `cursor.test.ts` (advisory only if the 62-line file grows). Trunk-based: work landed on `main`, no PR. Visual confirmation of the moving/clamped crosshair at `/missile-command/` awaits the owner/reviewer screenshot, per the mc1-2 precedent.