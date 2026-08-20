---
story_id: "pt1-20"
jira_key: "pt1-20"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-20: defender: in-game controls are undiscoverable — add on-screen control hints (reverse/thrust/fire/smart-bomb)

## Story Details
- **ID:** pt1-20
- **Jira Key:** pt1-20
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-20-defender-control-hints
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-20T07:27:08Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T00:37:31Z | 2026-08-20T00:39:11Z | 1m 40s |
| red | 2026-08-20T00:39:11Z | 2026-08-20T07:04:54Z | 6h 25m |
| green | 2026-08-20T07:04:54Z | 2026-08-20T07:10:06Z | 5m 12s |
| review | 2026-08-20T07:10:06Z | 2026-08-20T07:21:00Z | 10m 54s |
| green | 2026-08-20T07:21:00Z | 2026-08-20T07:25:02Z | 4m 2s |
| review | 2026-08-20T07:25:02Z | 2026-08-20T07:27:08Z | 2m 6s |
| finish | 2026-08-20T07:27:08Z | - | - |

## Sm Assessment

**Story:** Add on-screen control hints for defender so players can discover the reverse/thrust/fire/smart-bomb scheme. Bindings already exist and work in `plugins/defender/src/shell/input.ts` (A/Left=reverse-facing, D/Right=thrust, W/S/Up/Down=vertical, Space/Enter=fire, RightShift=smart-bomb). The gap is *discoverability*, not input.

**Scope:** Draw a control-hint line on the attract screen and/or a brief in-play get-ready hint. All drawing MUST go through pure `core/scene.ts` (`composeFrame`) per the defender draw-in-core rule — HUD/scanner/bezel/text compose into indices in core, never in shell. Do not touch the input layer; it works.

**Constraints for TEA/Dev:**
- Draw-in-core rule: new hint text is rendered by pure core in `plugins/defender/src/core/scene.ts`, asserted by that game's core-boundary/purity test. Premise-check "is X drawn?" by grepping `core/scene.ts`, not shell.
- No coin-op urgency mechanics (no countdown timer on the hint).
- Complements pt1-7 (lobby tile key labels) — this is the in-game counterpart.

**Acceptance direction:** Failing test should assert the hint text (the actual key labels) appears in the composed frame from core, on the attract screen and/or a transient in-play get-ready state. Live-playtest verification that the input path drives the ship is a manual verify-phase step, not a unit test.

**Routing:** phased tdd → next agent is TEA (RED). No architecture phase needed — this is a small, well-scoped draw addition with a clear precedent (existing scene composition).

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (9 load-bearing tests failing — ready for Dev)

**Test Files:**
- `plugins/defender/tests/pt1-20-control-hint.test.ts` — core render + SSOT contract (black-box over `composeFrame`).
- `plugins/defender/tests/pt1-20-main-wiring.test.ts` — shell wiring (`main.ts` `?raw` source scan).

**Tests Written:** 12 tests (9 red / 3 green-on-arrival safety nets).

### The contract Dev must satisfy (GREEN)

1. **`composeFrame` grows an optional 5th arg** — `composeFrame(state, w, h, hof?, options?)` where `options?: { controlHint?: boolean }`. When `controlHint` is true, draw the hint line **over the play field**; when false/absent, byte-identical to today (every 3/4-arg caller unchanged). Draw the hint **after** the `gameOver` early-return so it never touches the end screen.
2. **Export `CONTROL_HINT: string` from `core/scene.ts`** — the single source of truth for the hint text, drawn via `writeText` (draw-in-core rule; core cannot import `shell/input.ts`). It must:
   - use only renderable charset glyphs (A–Z, digits, space, `,:!?.` — **no arrows/slash**, they degrade to `?`);
   - name the FIRE key (`SPACE` or `ENTER`), the SMART-BOMB key (`SHIFT`), and the `THRUST` + `REVERSE`/`TURN` actions.
3. **`main.ts` gates the hint on the attract phase** — pass `controlHint: session.phase === 'attract'` into its `composeFrame` call, so the self-playing demo teaches controls but live play is un-cluttered.

### Notes / latitude for Dev
- **Wording, position, colour are Dev's** — tests pin behaviour (hint reaches frame, opt-in, no strobe, names the keys/actions), not layout. Use a palette INDEX (`TEXT_COLOUR`/9), never an invented RGB.
- **SSOT consistency is a Dev responsibility the tests can't fully enforce:** `CONTROL_HINT` lives in core but must match the real bindings in `shell/input.ts` (A=reverse, D=thrust, W/S=vertical, Space/Enter=fire, RightShift=smart-bomb). Keep them in step.
- **Story also mentions an optional in-play get-ready hint** — the `controlHint` flag makes that trivial later (gate on `setup`/first frames), but the ACs I pinned require only the attract-screen hint. Don't over-build.
- The `?raw` import + `stripComments` main-wiring idiom is the reviewer-blessed pattern (df7-2/df7-3); `main.ts` is a repo-owned boot module, so scanning it is fine.

### Rule Coverage

| Rule / constraint | Test(s) | Status |
|-------------------|---------|--------|
| Draw-in-core (defender rule): hint drawn by pure `core/scene.ts`, not shell | whole suite composes via `composeFrame`; `purity.test.ts` armed sweep covers `scene.ts` | failing (composeFrame ignores flag) |
| Accessibility / ADR-0005: no full-frame strobe | `the hint overlay does not full-frame strobe` + non-vacuity companion | green-on-arrival (companion passing) |
| Charset fidelity: no unsupported glyph (`?`) at runtime | `renders WITHOUT the invalid-char glyph` | failing |
| SSOT / instructive content (not a placeholder) | `names the FIRE key` / `names the SMART-BOMB key` / `names the THRUST and REVERSE actions` | failing |
| Opt-in / back-compat: default & `false` unchanged | `the hint is OPT-IN` + `does NOT leak onto the GAME OVER screen` | mixed (opt-in half failing) |
| Integration wiring (no built-but-unwired): shell turns it on | `pt1-20-main-wiring.test.ts` (both) | failing |
| Test quality: meaningful assertions, no vacuous | Phase-C self-check below | pass |

**Rules checked:** the applicable defender/project rules above (draw-in-core, ADR-0005, charset, wiring) all carry at least one test.
**Self-check:** 0 vacuous tests. Every assertion checks a value or a digest inequality; the two green-on-arrival safety nets each carry a non-vacuity companion (df7-4/df7-5 precedent).

**Handoff:** To Dev for implementation (GREEN).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/defender/src/core/scene.ts` — export `CONTROL_HINT` (SSOT) + `drawControlHint`; `composeFrame` grows an optional 5th arg `options?: { controlHint?: boolean }`; the hint is painted last (after the `gameOver` early-return) when `controlHint` is true.
- `plugins/defender/src/main.ts` — pass `{ controlHint: session.phase === 'attract' }` into the `composeFrame` call, so the attract demo shows the hint and live play does not.

**Hint text:** `A REVERSE D THRUST SPACE FIRE SHIFT BOMB` — WHITE (palette index 9), left-aligned at (8,168), above the planet surface. Measured rendered width **250px** (ends at x=258 on the 292px board → 34px margin), so it is NOT clipped (verified via a charset-width measurement, since `writeText` clips silently and no test guards width).

**Tests:** defender project **1070/1070 passing** (GREEN); the 12 pt1-20 tests pass. `npm run lint` (tsc, repo-wide) clean. Purity/core-boundary suite green — the hint is drawn in pure `core/scene.ts`, not shell.

**Minimalism note:** implemented only the attract-screen hint the pinned ACs require; the `controlHint` flag leaves the optional in-play get-ready hint a trivial follow-up (gate on `setup`) without over-building now.

**Handoff:** To verify/review.

## Dev Assessment — Rework Round 1

**All 6 reviewer findings fixed** (commit c6572299):
- **[High ×3] smart-bomb binding docs corrected** — `scene.ts:290`, `pt1-20-control-hint.test.ts:5` header, and `:147` failure-message now say `ShiftLeft/B = smart-bomb (RightShift = hyperspace)`, matching `shell/input.ts:24,27`. The user-facing `CONTROL_HINT` string was already correct and is unchanged.
- **[Low] readonly** added to `composeFrame`'s `options?: { readonly controlHint?: boolean }` (`scene.ts:409`).
- **[Low] main-wiring assertion anchored** — `pt1-20-main-wiring.test.ts:36` now matches `/composeFrame\s*\([\s\S]*?controlHint/` (inside the call), not a bare whole-file token.
- **[Low] width comment** corrected to 250px with the non-uniform-glyph note (`scene.ts:299`).

**Tests:** 1070/1070 defender GREEN, `tsc` clean. No runtime behaviour changed.
**Handoff:** Back to Reviewer (round 2).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Improvement** (non-blocking): the story asks for a live playtest confirming the input path drives the ship and the hint reads on-screen; behaviour + numeric width-fit are verified, but the on-screen legibility/position is an eyeball concern for the verify/review phase (Playwright MCP against the dev server — claude-in-chrome is not connected; prove which checkout answers port 5270 first).
  Affects the attract render at `plugins/defender/src/core/scene.ts` (HINT_X/HINT_Y layout — tunable, not test-pinned).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): `CONTROL_HINT` (core) must stay consistent with the real bindings in `plugins/defender/src/shell/input.ts`; core cannot import shell, so no test enforces the cross-file consistency — a future rebinding in input.ts should update the hint string too.
  Affects `plugins/defender/src/core/scene.ts` and `plugins/defender/src/shell/input.ts`.
  *Found by Dev during implementation.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No design deviations logged by TEA/Dev.

### Reviewer (audit)
- **Undocumented deviation — the supporting docs contradict the actual key bindings.** The story description, SM assessment, TEA assessment and the Dev's comments all assert "RightShift = smart-bomb". The code (`plugins/defender/src/shell/input.ts:24,27`) binds `smartBomb: ['KeyB','ShiftLeft']` and `hyperspace: ['KeyH','ShiftRight']` — i.e. **ShiftLeft/B = smart-bomb, RightShift = hyperspace**. The premise was inherited from the story text and never re-checked against the bindings (ROM/code is canonical). The user-facing `CONTROL_HINT` string ("SHIFT BOMB") is coincidentally acceptable (ShiftLeft is a bomb key), but the comments/test-messages that name RightShift are wrong. Severity: **High** (factual-correctness defect in a discoverability deliverable; self-contradicts the adjacent "keep in step with input.ts" jsdoc). → ✓ RESOLVED in rework round 1 (commit c6572299): all three sites now read `ShiftLeft/B = smart-bomb (RightShift = hyperspace)`, matching `input.ts:24,27`; re-verified by targeted grep in review round 2.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1070 tests GREEN, tsc clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 (px arithmetic) | confirmed 1 (Low) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 6 (binding-doc ×3, readonly, bare-token ×1 across rules 15/25) | confirmed 6 |

**Specialist source tags** (5 disabled this run via `workflow.reviewer_subagents`): `[EDGE]` disabled · `[SILENT]` disabled · `[TEST]` confirmed (main-wiring bare-token) · `[DOC]` confirmed (comment-analyzer) · `[TYPE]` disabled · `[SEC]` clean (security) · `[SIMPLE]` disabled · `[RULE]` confirmed (rule-checker).

**All received:** Yes (4 enabled ran; 5 disabled pre-filled)
**Working-tree audit:** CLEAN (after restoring the pf-written `sprint/epic-pt1.yaml` status stamp — the known false-DIRTY; exit 0, tracking-only diff verified).
**Total findings:** 6 confirmed (1 High cluster ×3, 3 Low), 0 dismissed, 0 deferred.

### Rule Compliance

Rules from CLAUDE.md, the defender draw-in-core rule, ADR-0005, and `.pennyfarthing/gates/lang-review/typescript.md`:

| Rule | Instances checked | Verdict |
|------|-------------------|---------|
| Draw-in-core (pure core, no shell import, palette indices only) | `drawControlHint`, `CONTROL_HINT`, `composeFrame` hint branch (scene.ts) | ✅ compliant — no shell import; `TEXT_COLOUR=9` is an existing index; swept by `purity.test.ts` |
| ADR-0005 / accessibility (no full-frame strobe) | `drawControlHint` (one 8px text line) | ✅ compliant — sparse overlay, pinned by `assertNoFullFrameStrobe` + non-vacuity companion |
| No coin-op urgency mechanics | whole diff | ✅ compliant — no timer/countdown added |
| Back-compat (optional 5th arg; existing callers unchanged) | ~59 pre-existing `composeFrame` call sites | ✅ compliant — `options?` optional, all callers byte-identical |
| lang-review #2 (readonly on non-mutated object params) | `options?: { controlHint?: boolean }` (scene.ts:409) | ❌ violation — missing `readonly`, inconsistent with sibling `hof?` |
| lang-review #15 / #25 (source-text guard must anchor to the claim, not a bare token / whole-file scope) | main-wiring test ×2 assertions | ❌ violation on :36 (`/controlHint/` bare); :45 compliant (proximity-anchored) |
| lang-review #17 (comments asserting a mechanism nobody re-ran) | binding comments ×3 | ❌ violation — "RightShift=smart-bomb" contradicts input.ts |
| Type-safety escapes (#1), null-handling (#4), modules/.js ext (#5), test quality (#8/#18/#26) | full diff | ✅ compliant |

### Observations
- [HIGH][RULE][DOC] Comment asserts the wrong smart-bomb key at `plugins/defender/src/core/scene.ts:290` — "RightShift= smart-bomb"; verified against `shell/input.ts:24` (`smartBomb: ['KeyB','ShiftLeft']`) and `:27` (`hyperspace: ['KeyH','ShiftRight']`). RightShift is hyperspace.
- [HIGH][RULE][DOC] Same false claim repeated in the test header at `plugins/defender/tests/pt1-20-control-hint.test.ts:5`.
- [HIGH][RULE][DOC] Test failure-message baked with the false claim at `plugins/defender/tests/pt1-20-control-hint.test.ts:146` ("input.ts binds RightShift") — actively misdirects a future debugger.
- [LOW][RULE] `options?: { controlHint?: boolean }` at `scene.ts:409` omits `readonly`, inconsistent with the sibling `hof?` param's `readonly` scalar fields on the same signature.
- [LOW][RULE][TEST] `expect(code).toMatch(/controlHint/)` at `pt1-20-main-wiring.test.ts:36` is a bare-token match over the whole stripped file (lang-review #15/#25); the :45 proximity assertion partly mitigates but the first should anchor to the `composeFrame(` call.
- [LOW][DOC] `scene.ts:299-300` states "~252px (letters advance 7px, spaces 3px)"; the charset is non-uniform (`I`=5px, `M`=9px advance), true width is 250px. Hedged with "~" and the "clears the 292 board" conclusion holds — cosmetic.
- [VERIFIED] Draw-in-core: `drawControlHint` (scene.ts:305) imports nothing from shell and uses `TEXT_COLOUR` (index 9), not an RGB literal — evidence: scene.ts has no `shell/` import; `tests/purity.test.ts` sweeps `src/core/**`. Complies with the draw-in-core rule.
- [VERIFIED] End-screen isolation: the hint is drawn at scene.ts:486, AFTER the `if (state.gameOver) {...return fb}` early-return (scene.ts:413-419) — evidence: pinned by the "does NOT leak onto GAME OVER" test. Complies.
- [VERIFIED] Opt-in / back-compat: `options?` is optional; `if (options?.controlHint)` gates the draw — evidence: preflight ran all ~59 legacy callers green.
- [OBSERVATION][LOW] The hint reads "SHIFT BOMB", but ShiftRight triggers hyperspace (an unexplained teleport). "SHIFT" is imprecise (left-shift is the bomb). Within the story's simplification scope (hyperspace was out of scope), so noted, not blocking — a future polish could read "LSHIFT BOMB".

### Devil's Advocate

Argue this code is broken. The most damning line: this is a *discoverability* story — its entire reason to exist is to tell a confused player which key does what — and the change ships documentation that names the wrong key for one of the four controls it set out to explain. The comment block in `scene.ts` (the SSOT owner) says "RightShift = smart-bomb" directly above a jsdoc that instructs future maintainers to "KEEP IT IN STEP with input.ts." A maintainer who obeys that instruction — say, expanding the hint to spell out the bomb key — will read the comment, trust it, and write "RSHIFT BOMB", encoding hyperspace as the bomb key. The comment is a landmine planted in the exact place someone will step. Worse, the falsehood is triply reinforced: the test header and a `toMatch` failure message both repeat it, so a dev debugging a future red run is told the assertion is about RightShift when the real binding is ShiftLeft — they'll go chase the wrong key. A confused *player* is somewhat protected only by luck: "SHIFT BOMB" happens to work if they reach for the left shift, but a player who presses the right shift gets teleported across the level with no explanation, which for a first-timer is *more* confusing than the original problem this story fixes. On robustness: the `/controlHint/` bare-token test would stay green if a refactor renamed the composeFrame arg but left a `controlHint` identifier loose anywhere in main.ts — the guard has a hole. On width: the "~252px" figure is wrong by 2px because the author generalized a per-glyph advance the charset doesn't honor; harmless here, but it signals the arithmetic was reasoned, not measured (the Dev's own note says 250px — the comment and the note disagree). None of these crash the game, and the tests are genuinely good — but "the tests pass" is exactly the trap: the tests assert the *string* is right (it is) and never assert the *comments* are right (they aren't). The defect lives precisely in the space the test suite cannot see. That is a rework, not a rubber-stamp.

## Reviewer Assessment

**Verdict:** REJECTED — 1 High-severity factual-doc cluster (3 sites) + 3 Low rule-compliance nits; all cheap, one rework round.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| High | Comment names the wrong smart-bomb key ("RightShift"); actual binding is `ShiftLeft`/`KeyB`, RightShift is hyperspace | `plugins/defender/src/core/scene.ts:290` | Correct the parenthetical to `Space/Enter=fire, ShiftLeft/B=smart-bomb (RightShift=hyperspace)` — match `shell/input.ts:24,27` |
| High | Same false "RightShift = smart-bomb" claim in test header | `plugins/defender/tests/pt1-20-control-hint.test.ts:5` | Correct to ShiftLeft/B; keep it in step with input.ts |
| High | Test failure-message asserts "input.ts binds RightShift" for smart-bomb | `plugins/defender/tests/pt1-20-control-hint.test.ts:146` | Change the message to name ShiftLeft/B (the real smart-bomb binding) |
| Low | `options?` object omits `readonly` on `controlHint`, inconsistent with sibling `hof?` | `plugins/defender/src/core/scene.ts:409` | `options?: { readonly controlHint?: boolean }` |
| Low | Bare-token `/controlHint/` source assertion over whole file (lang-review #15/#25) | `plugins/defender/tests/pt1-20-main-wiring.test.ts:36` | Anchor to the call, e.g. `/composeFrame\([\s\S]*controlHint/` or `/controlHint\s*:/` |
| Low | "~252px / letters advance 7px" is 250px; charset non-uniform (I=5px, M=9px) | `plugins/defender/src/core/scene.ts:299-300` | Drop the exact figure or correct to 250px |

**Note:** no runtime/behavioural defect — the game plays correctly, `CONTROL_HINT` is user-facing-correct, all 1070 tests pass, purity/back-compat/no-strobe all hold. The rejection is for the factual control-documentation errors (the story's own deliverable) plus rule-backed quality nits, all fixable in one small pass. Do NOT change the `CONTROL_HINT` string or the hint's runtime behaviour.

**Handoff:** To Dev for rework (fix the 6 findings above), then back to Reviewer.

## Subagent Results

**Cycle: 1**

Re-review method: **targeted re-verification** of each round-1 finding against the reworked source (stronger than a fresh generalist sweep for characterized findings). The dev-exit gate re-ran the full suite (1070/1070 defender GREEN) and lang-review/typescript (clean) this cycle, re-covering the preflight/security/rule domains; each specific finding was re-checked by grep against the current tree.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (via dev-exit gate) | clean | none (1070 GREEN, tsc clean) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes (targeted re-verify) | clean | round-1 px finding fixed (250px note) | resolved |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes (via dev-exit gate) | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes (targeted re-verify) | clean | round-1 binding-doc ×3 + readonly + bare-token all fixed | resolved |

**Specialist source tags:** `[EDGE]` disabled · `[SILENT]` disabled · `[TEST]` resolved (main-wiring anchored) · `[DOC]` resolved (binding comments + px) · `[TYPE]` disabled · `[SEC]` clean · `[SIMPLE]` disabled · `[RULE]` resolved (readonly + binding + anchor).
**All received:** Yes (targeted re-verification of all round-1 findings; full suite + lang-review re-run by the dev-exit gate).
**Working-tree audit:** CLEAN (after restoring the known false-DIRTY `sprint/epic-pt1.yaml` status stamp; tracking-only `in_progress → in_review` diff verified).

### Round-2 re-verification (evidence)
- [VERIFIED] `[DOC][RULE]` binding comment fixed — `scene.ts:290-291` now `ShiftLeft/B= smart-bomb — RightShift is hyperspace`; ground truth `input.ts:24` `smartBomb: ['KeyB','ShiftLeft']`, `:27` `hyperspace: ['KeyH','ShiftRight']`. No `RightShift=smart-bomb` remains.
- [VERIFIED] `[DOC]` test header fixed — `pt1-20-control-hint.test.ts:5-6` now `ShiftLeft/B = smart-bomb (RightShift is hyperspace)`.
- [VERIFIED] `[DOC]` test message fixed — `:147` now `input.ts binds ShiftLeft/B`.
- [VERIFIED] `[RULE]` readonly added — `scene.ts:410` `options?: { readonly controlHint?: boolean }`.
- [VERIFIED] `[TEST][RULE]` anchored assertion — `pt1-20-main-wiring.test.ts:39` `.toMatch(/composeFrame\s*\([\s\S]*?controlHint/)`; the :45 proximity-anchored attract assertion retained.
- [VERIFIED] `[DOC]` width comment — `scene.ts:300` now `measured 250px wide — non-uniform (I=5px, M=9px)`.
- [VERIFIED] `CONTROL_HINT` string unchanged (`scene.ts:298`, correct as shipped) — the fix was docs-only, no runtime change; the 1070-test GREEN confirms behaviour is identical.

## Reviewer Assessment

**Verdict:** APPROVED (re-review round 2; supersedes the round-1 REJECTED verdict — all 6 findings verified fixed)

**Data flow traced:** `session.phase` → `main.ts` computes `controlHint: session.phase === 'attract'` → `composeFrame(options)` → `drawControlHint` writes `CONTROL_HINT` glyph indices into the framebuffer → shell blits. Safe: the flag is a boolean from the game state machine (not player/network input), the hint text is a fixed constant (no injection), and `writeText` clips to bounds.
**Pattern observed:** opt-in overlay drawn after the `gameOver` early-return (`plugins/defender/src/core/scene.ts:486`) — matches the df7-4 optional-arg / draw-in-core precedent; palette INDEX 9, no invented RGB.
**Rule compliance:** draw-in-core ✅, ADR-0005 no-strobe ✅, no coin-op timer ✅, back-compat (optional 5th arg) ✅, lang-review #2/#15/#17/#25 ✅ (all round-1 violations fixed).
**Specialist findings incorporated:** `[RULE]` rule-checker — round-1 binding-doc (#17), readonly (#2), bare-token (#15/#25) all fixed and re-verified. `[DOC]` comment-analyzer — round-1 px-arithmetic comment corrected to 250px. `[SEC]` security — clean (fixed hint constant, no injection/DoS/leak surface; re-confirmed unchanged this cycle). `[TEST]` — main-wiring assertion anchored to the composeFrame call. No `[EDGE]`/`[SILENT]`/`[TYPE]`/`[SIMPLE]` this run (disabled via settings).
**Error handling:** `options?.controlHint` optional-chained; `writeText` clips out-of-frame writes (`charset.ts:63-115`); non-renderable chars are impossible for this constant (glyph-validity test).
**Residual (non-blocking):** Dev's two Delivery Findings stand — (1) live on-screen legibility is an eyeball item for a manual playtest; (2) core `CONTROL_HINT` ↔ shell `input.ts` consistency is unenforced by tests (core can't import shell). Neither blocks; the round-1 binding error is exactly the class of drift finding (2) warned about, now corrected.
**Handoff:** To SM for finish-story.