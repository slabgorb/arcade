---
story_id: "pt1-4"
jira_key: "pt1-4"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-4: star-wars: fix the screen size to a fixed resolution to avoid display problems

## Story Details
- **ID:** pt1-4
- **Jira Key:** pt1-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-4-star-wars-fixed-screen-resolution
- **PR:** (none yet — recorded when the PR is created)

## Story Context

**Epic:** pt1 (Playtest bug sweep 2026-08-19)

**Type:** bug  
**Points:** 2  
**Priority:** p1

**Description:** Playtest 2026-08-19: make the star-wars canvas a fixed size rather than tracking the window, to avoid display problems (projection/scaling artifacts). Pair with pt1-3 — a fixed logical resolution may be prerequisite to pinning the projection.

**Acceptance Criteria (from Epic Context):**
- Make the star-wars canvas a FIXED logical size rather than tracking the window (projection/scaling artifacts)
- A fixed logical resolution may help with display scaling/projection consistency
- This is a SHELL concern (render/view), not core sim — the fix should live in shell, not core/sim.ts
- Prerequisite is pt1-3 (surface-run projection fix), which is already done — the projection math is settled

**Technical Approach:**
- star-wars is a plugin located in `plugins/star-wars/`
- Core/shell boundary is enforced by a purity test (do not modify core/sim.ts for this fix)
- Screen/canvas sizing is a SHELL concern; look in shell/render or view modules
- Avoid editing core/sim.ts to prevent citation drift in existing tests and documentation

**Citation Guard Warning:**
- star-wars comment-citation guard reddens the whole tree on a bare `<file>:<line>` — path-qualify every citation
- Run `checkTree` before commit to validate all citations
- If you must edit core/sim.ts, also grep sibling test/doc bare `:N` refs and run `tests/audit/sw8-27-remediation`

**Reference:** See `plugins/star-wars/CLAUDE.md` for game-specific guidance.

## SM Assessment (setup)

- User invoked `/pf-work pt4-1`, a non-existent id — no `pt4` epic exists anywhere (backlog, planning, future all clean). Confirmed with the user this meant **pt1-4** (transposed digits); ruled out the other 5 open pt1 stories.
- **Board on arrival:** clean. Local `develop` was 8 behind origin — fast-forwarded before setup. No sibling remote branch for pt1-4, no session files in any `a-*` checkout, no open PRs. Claim branch pushed empty-then-stamped so the sibling probe lights up.
- **Premise verified current, not stale:** the paired prerequisite **pt1-3** (surface-run projection fix) is `done` — the projection math is settled, so pt1-4 pins the fixed logical resolution on top of it. Do NOT re-open projection work. No pt1-4 refs in `tests/` or `plugins/star-wars/`.
- **Scope guardrail for TEA/Dev:** this is a SHELL sizing fix (render/view), not core sim. The purity test enforces the boundary; editing `core/sim.ts` would also cascade `sim.ts:NNN` citations across tests/docs. Path-qualify every citation and run `checkTree` before commit.

## TEA Assessment (red)

**Refined ACs (the story YAML had none — derived here during RED):**
1. star-wars pins a **fixed 4:3 cabinet aspect** and letterboxes the canvas, instead of
   filling the window. `TARGET_ASPECT === 4/3` (authentic 4:3 vector monitor + fleet
   consistency with battlezone).
2. On any non-4:3 window the canvas is the **largest centered 4:3 box** that fits; the
   leftover is symmetric bars (page background shows through) — the "overlay on the sides."
3. No stretch/distortion: the backing store stays 4:3, HiDPI-capped at 2×, integer pixels,
   `dpr || 1` fallback, NaN-safe on degenerate dims.
4. `main.ts` is actually **wired** to the letterbox fit (not an orphaned module) — the
   window-filling `resizeToDisplay` seam is gone from `main.ts`.

**Design decision (ruled from precedent, not invented):** mirror battlezone's `bz2-1`,
not asteroids' margin-mask. Both give the fleet look, but battlezone's canvas-element
letterbox is the right fit for a 3D cockpit game and directly makes the W/H handed to
`render()` the 4:3 box — which is what unifies the HUD and the scene into one frame.
sw10-1's square lens is untouched: it draws the central square "window" within the 4:3,
and the HUD flanks it as the side overlay.

**RED evidence:** `plugins/star-wars/tests/shell/viewport.test.ts` fails at import
(`src/shell/viewport.ts` absent) — the bz2-1 seam-absent RED convention. Citation gate
(53) and comment-citation guard (41) green; no bare `file:line` in the new file.

**Rule Coverage (TS lang-review):** #4 falsy-dpr `|| 1` fallback → covered
("falls back to dpr 1 when devicePixelRatio is 0 or falsy"); integer backing store +
NaN-guard on 0-dim windows → covered; #18 apparatus-fails-by-its-own-hand avoided by
binding to the REAL module (not reconstructing `letterbox` in the test); the source-level
main.ts tripwire prevents a well-tested-but-unused module shipping while resize() still
fills the window.

**GREEN contract for Dev (Korben Dallas) — three files, mirror battlezone:**
1. **Create** `plugins/star-wars/src/shell/viewport.ts` — a thin adapter over
   `@shared/view`, near-verbatim from `plugins/battlezone/src/shell/viewport.ts`.
   Export `TARGET_ASPECT = 4/3`, `MAX_DPR` (= shared `MAX_DPR`), `interface Letterbox
   { cssWidth, cssHeight, bufferWidth, bufferHeight }`, `type CanvasLike`,
   `computeLetterbox(windowW, windowH, rawDpr, aspect = TARGET_ASPECT)` and
   `applyLetterbox(canvas, windowW, windowH, rawDpr, aspect?)`.
2. **Wire** `plugins/star-wars/src/main.ts`: in `resize()`, replace
   `resizeToDisplay(canvas, window.innerWidth, window.innerHeight, window.devicePixelRatio)`
   with `applyLetterbox(canvas, window.innerWidth, window.innerHeight, window.devicePixelRatio)`;
   set `W = box.cssWidth`, `H = box.cssHeight`, and `dpr = box.cssWidth > 0 ? box.bufferWidth / box.cssWidth : 1`
   (applyLetterbox returns no dpr field; derive it, guard the 0-width degenerate case).
   Remove the now-unused `resizeToDisplay` import. Leave `render()`, `ctx.scale(dpr,dpr)`,
   and sw10-1's `ndcToScreen`/`sceneProjection` untouched — they consume W/H/dpr unchanged.
3. **Center** `plugins/star-wars/index.html`: add
   `body { display: flex; align-items: center; justify-content: center; }` (mirror
   `plugins/battlezone/index.html`) so the letterboxed canvas centers and the black page
   shows through as the side bars. Keep `cursor: crosshair`.

**Watch-outs:** citation guard reddens on any bare `<file>:<line>` in a star-wars comment —
path-qualify or run `npx vitest run --project star-wars comment-citations` before commit.
Do NOT touch `core/sim.ts` (purity + `sim.ts:NNN` citation cascade); this fix is entirely
shell + index.html.

## Dev Assessment

**Implementation Complete:** Yes — followed the TEA GREEN contract exactly (battlezone mirror).
**Files Changed:**
- `plugins/star-wars/src/shell/viewport.ts` (new) — thin adapter over `@shared/view`
  (`TARGET_ASPECT = 4/3`, `MAX_DPR`, `Letterbox`, `CanvasLike`, `computeLetterbox`,
  `applyLetterbox`), near-verbatim from `plugins/battlezone/src/shell/viewport.ts`.
- `plugins/star-wars/src/main.ts` — `resize()` now calls `applyLetterbox(...)` instead of
  the window-filling `resizeToDisplay(...)`; `W/H` come from the fitted box and
  `dpr = box.cssWidth > 0 ? box.bufferWidth / box.cssWidth : 1` (guarded 0-width). The
  `resizeToDisplay` import is gone. `render()`, `ctx.scale(dpr,dpr)` and sw10-1's
  `ndcToScreen`/`sceneProjection` are untouched.
- `plugins/star-wars/index.html` — `body { display:flex; align-items:center; justify-content:center; }`
  so the letterboxed canvas centers and the page shows as side bars (mirror battlezone).

**Tests:** star-wars project **2464/2464 passing** (GREEN); `viewport.test.ts` 21/21;
comment-citations guard 41/41; `npm run lint` (repo-wide tsc) clean. No `core/sim.ts` touched.

**Suggested visual confirm (verify/review):** `just serve` → `/star-wars/` on a wide window
should show the 4:3 canvas centered with black side bars and the HUD bounded to that box.

**Branch:** feat/pt1-4-star-wars-fixed-screen-resolution (pushed)
**Handoff:** to next phase.

## Subagent Results

**Cycle: 1**
**All received:** Yes

| # | Subagent | Ran | Result | Findings | Triage |
|---|----------|-----|--------|----------|--------|
| 1 | reviewer-preflight | Yes | clean | none | full star-wars suite green, tsc clean, comment-citations 41/41; 2 console.log are pre-existing DEV-guarded |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | no core touched; dpr/NaN guards correct; DOM writes are numeric px only; client-only |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 | 34 rules checked; both findings confirmed (see Reviewer Assessment) |

**Working-tree audit:** `pf reviewer audit-tree` → CLEAN (exit 0), no left-behind mutations.

## Reviewer Assessment

**Verdict:** REJECTED

**Round 1** — two confirmed findings, both with clean root-cause fixes.

The change is architecturally sound — a faithful battlezone/bz2-1 mirror, core untouched, purity + citation guards green, and I independently confirmed the change is **gameplay-neutral**: `Input.aspect` is now vestigial in the core (`inPlayerView` uses `hBound = vBound`, `aimDirection` ignores its aspect param — both aspect-independent since sw10-1), so pinning the canvas element to 4:3 changes no aim/hit/visibility behaviour. That is why the 2464-test suite stayed green; it is not a coverage gap.

**[SEC]** reviewer-security returned **clean**: no `core/` touched, dpr/NaN guards correct, DOM writes are numeric `px` strings only, client-only (no auth/tenant/secrets surface). No security findings.

**[RULE]** reviewer-rule-checker checked 34 rules and raised the two findings below (both confirmed on independent read); all other rules pass, purity + comment-citation guards green.

Two confirmed findings, both low-severity but both with clean root-cause fixes — fix both in this round:

**F1 [RULE] (rule #34, correctness/consistency) — `plugins/star-wars/src/main.ts:47`.** `dpr = box.cssWidth > 0 ? box.bufferWidth / box.cssWidth : 1` reconstructs the device-pixel ratio by dividing two already-floor-rounded outputs, drifting ~0.012% from the value `applyLetterbox` actually resolved (e.g. 1.999768 vs 2 on a 1920×1079 window) whenever `cssWidth` is fractional — the common case. The prior star-wars code and asteroids both read the resolved `vp.dpr` directly with no reconstruction. **Fix:** have star-wars' `applyLetterbox` return the resolved `dpr` (it already has it from the internal `resizeToDisplay` result — add `dpr: vp.dpr` to the returned `Letterbox`), and in `main.ts` set `dpr = box.dpr` directly. Drop the ternary reconstruction. This restores fleet consistency and removes the 0-width special case (a real `dpr` is always ≥ 1). Extending star-wars' `Letterbox` beyond battlezone's is correct here — star-wars consumes `dpr` for `ctx.scale`, battlezone does not.

**F2 [RULE] (rule #15, test honesty) — `plugins/star-wars/tests/shell/viewport.test.ts:270`.** The "main.ts is actually wired (not orphaned)" tripwire asserts `mainSrc.toContain('applyLetterbox')`, which matches the bare identifier anywhere (import/comment/call) and cannot distinguish wired from orphaned — the exact regression it claims to guard. **Fix:** anchor to the call site, e.g. `expect(mainSrc).toMatch(/applyLetterbox\(canvas/)`. (Keep the negative `not.toContain('resizeToDisplay')` guard as-is — a whole-file negative is fine.)

**Not required (noted for the record):** rule-checker's rule #33 observation — star-wars' `shell/viewport.ts` is now byte-identical in logic to battlezone's, which is exactly the CLAUDE.md trigger for a future `src/shared` extraction. That is a separate story, not this one's scope (and after F1 the two will no longer be identical — star-wars returns `dpr`).

## Workflow Tracking
**Workflow:** tdd  
**Phase:** finish  
**Phase Started:** 2026-08-20T16:30:02Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T15:39:33Z | 2026-08-20T15:41:57Z | 2m 24s |
| red | 2026-08-20T15:41:57Z | 2026-08-20T16:03:55Z | 21m 58s |
| green | 2026-08-20T16:03:55Z | 2026-08-20T16:08:51Z | 4m 56s |
| review | 2026-08-20T16:08:51Z | 2026-08-20T16:20:34Z | 11m 43s |
| green | 2026-08-20T16:20:34Z | 2026-08-20T16:25:21Z | 4m 47s |
| review | 2026-08-20T16:25:21Z | 2026-08-20T16:30:02Z | 4m 41s |
| finish | 2026-08-20T16:30:02Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Conflict (non-blocking, resolved by user ruling):** The story's stated cause —
  "projection/scaling artifacts" from tracking the window — is **already fixed** by work
  that shipped after pt1-4 was filed. `sw10-1` made the lens aspect-independent
  end-to-end (fixed square FOV; `ndcToScreen` draws the scene in a centered `min(w,h)`
  square that never stretches; heavily tested in `render.aim-aspect-invariant.test.ts`),
  and `pt1-3` fixed the surface-run projection scale. So pt1-4 is NOT about projection.
  The **real residual defect** is FRAMING: `main.ts` sizes the viewport with the
  window-filling `resizeToDisplay(innerWidth, innerHeight)`, so the HUD (`w - margin`,
  `w/2`) spreads to the full window edges (unbounded on ultrawide) while the scene sits
  in the central square — HUD and scene divorced, no fleet-consistent side overlay.
- **User ruling (2026-08-20):** "I want the games to have a consistent look, with a
  window and an overlay on the sides. Battlezone/asteroids does this already." → pt1-4
  proceeds with the **battlezone mirror**: pin a fixed 4:3 cabinet aspect and letterbox
  the canvas, page background = side overlay. Not a close, not a novel fixed-pixel buffer.
- **Improvement (non-blocking, for the archived record):** the story title/description
  still assert the refuted "projection/scaling" cause. A later reader should read the
  fix as FRAMING (fixed 4:3 letterbox), not projection.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- No deviations from spec. Implemented the TEA GREEN contract verbatim (battlezone-mirror
  `shell/viewport.ts` + `main.ts` wiring + `index.html` centering). The `dpr` derivation
  `box.bufferWidth / box.cssWidth` was specified by the contract (applyLetterbox returns
  the backing store, not a dpr field), so it is not a deviation.
  - **Reviewer (round 1): ACCEPTED** — the entry is accurate; Dev followed the contract.
    Note: the contract's own instruction to reconstruct `dpr` (rather than expose it from
    `applyLetterbox`) is the root of finding F1 — the fix belongs in the viewport module +
    the contract, not a Dev deviation.
- **Rework (review round 1 → green):** F1 — `Letterbox` now carries `dpr` (from the fit's
  resolved `min(MAX_DPR, rawDpr||1)`); `main.ts` reads `box.dpr` directly, no reconstruction,
  and the 0-width guard is gone (a real dpr is always ≥ 1). F2 — the wiring tripwire anchors
  to `/applyLetterbox\(\s*canvas/`. Added 3 tests (exact-dpr contract + cap/falsy + apply
  self-consistency). This intentionally extends star-wars' `Letterbox` beyond battlezone's —
  star-wars consumes `dpr` for `ctx.scale`, battlezone does not — logged as the deliberate,
  reviewer-directed divergence from the pure mirror.
## Subagent Results

**Cycle: 1**

**Method:** targeted re-verification of the two round-0 findings with direct probes (stronger than a fresh generalist sweep for a small, well-characterized rework), plus a full re-run of the mechanical gates myself.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (re-verified by lead) | clean | none | full star-wars suite 2467/2467, tsc clean, comment-citations 41/41 — re-run directly |
| 2 | reviewer-edge-hunter | No — disabled | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No — disabled | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | No — disabled | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | No — disabled | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | No — disabled | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes (re-verified by lead) | clean | none | rework is an additive interface field + a direct read + test edits; no new DOM writes, no core touched — re-assessed first-hand |
| 8 | reviewer-simplifier | No — disabled | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes (re-verified by lead) | findings-resolved | 0 open (2 from cycle 0 fixed) | F1 + F2 both re-probed and CLOSED (see assessment) |

**All received:** Yes (3 enabled specialists re-verified by targeted probe, 6 disabled)

**Working-tree audit:** `pf reviewer audit-tree` → initially DIRTY on `sprint/epic-pt1.yaml` (the pf-written `in_progress → in_review` phase stamp — tracking only, not a source mutation; the known false-DIRTY). Committed the accurate stamp; re-audit → CLEAN (exit 0).

## Reviewer Assessment

**Verdict:** APPROVED

**Round 2** (re-review after rework; supersedes the round-1 REJECTED verdict).

Both round-1 findings are fixed at the root, verified by targeted probe:

- **F1 [RULE] (rule #34) — CLOSED.** `Letterbox` now carries `dpr` (`viewport.ts` returns the fit's resolved `Math.min(MAX_DPR, rawDpr||1)` from both `computeLetterbox` and `applyLetterbox` via `vp.dpr`), and `main.ts:50` reads `dpr = box.dpr` directly — the `bufferWidth/cssWidth` reconstruction and its 0-width guard are gone. Fleet-consistent with asteroids/the prior code. Three new tests pin the exact-dpr contract (exact value, the cap, the falsy→1 fallback, and apply self-consistency), and one explicitly proves the old reconstruction drifted while `box.dpr` does not.
- **F2 [RULE] (rule #15) — CLOSED.** The "wired, not orphaned" tripwire now asserts `mainSrc.toMatch(/applyLetterbox\(\s*canvas/)` — anchored to the call site, so it can no longer pass on a bare import/comment.

**[SEC]** re-assessed first-hand: the rework adds a read-only interface field and a direct read; no new DOM writes, no `core/` touched, no security surface. Clean.
**[RULE]** all other checklist rules remain green; purity + comment-citation guards pass.

Verification: full star-wars suite **2467/2467**, `tsc --noEmit` clean, comment-citations 41/41, working-tree audit CLEAN. The change remains gameplay-neutral (core ignores `Input.aspect` since sw10-1). No Critical/High/Medium findings remain. Ship it.