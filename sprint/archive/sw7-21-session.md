---
story_id: "sw7-21"
jira_key: "sw7-21"
epic: "sw7"
workflow: "tdd"
---
# Story sw7-21: R-LOCK — REMOVE the green lock-on circle; the cabinet never drew a predictive aim-assist

## Story Details
- **ID:** sw7-21
- **Jira Key:** sw7-21
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 2
- **Priority:** p3
- **Type:** chore
- **Status:** backlog

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-17T16:33:58Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-17T15:37:17Z | - | - |

## Acceptance Criteria

### Background — The Finding

The green **LOCK-ON CIRCLE** that rings a TIE under the reticle (`isLocked` / `lockedEnemy` / `LOCK_RADIUS_NDC=0.12`, from story 8-14; drawn by `render.ts` `drawLockOn`) is a NON-ROM predictive aim-assist with false provenance claims.

**Evidence:**
1. No `lock` or `lock-on` anywhere in the 1983 ROM source — grep hits are only inside BLOCK (test files DIVTST/MATEST/SND).
2. The object once cited as a targeting reticle / lock-box — **Object_12** (three concentric squares) — is actually `.WP PORT` (THERMAL EXHAUST PORT) per WSOBJ.MAC; that guess was SUPERSEDED in sw5-4.
3. The ROM gives ONLY the site crosshair (WSSITE.MAC) plus a POST-hit flash (LZ.HIT, the still-unported G-008) — feedback AFTER a hit, never a predictive "you have this shot" promise.
4. The `gameRules.ts` docstring for `LOCK_RADIUS_NDC` falsely claims the cabinet lights a target inside an aim box — no ROM basis.

**Irony to preserve:** the QUANTITY the ring computes from (the nearest object under the site) IS authentic — it is `CLSLZ` = `min(CL.GDS, CL.ADS)`, the exact hitscan targeting sw7-17 ported. The cabinet simply never draws a ring around it.

### THE RULING (made 2026-07-17)

**DECISION: REMOVE the predictive lock-on circle for authenticity.**

This is a TDD story because the old 8-14 lock-on tests must be removed or rewritten. (The alternative — keep-as-labelled house rule — would be trivial: just fix the docstring.)

### AC-1 — Remove the non-ROM lock-on ring

- Delete `isLocked` and `lockedEnemy` from the game state (state.ts, GameState type)
- Remove the `LOCK_RADIUS_NDC` constant and its false docstring
- Delete the `drawLockOn` function from render.ts
- Remove the render call to `drawLockOn` in the player display phase
- Remove all tests from 8-14 that asserted lock-on behaviour (e.g., "locked circle appears when a TIE enters the ring")

**Observable:** the player no longer sees a green circle around the nearest TIE.

### AC-2 — Preserve the authentic underlying hitscan targeting

- The hitscan `CLSLZ` / `min(CL.GDS, CL.ADS)` computation from sw7-17 stays untouched
- It is still used by the game engine to identify the nearest object under the site
- It is just no longer drawn as a ring
- Verify that the nearest-object tracking (used for audio cues, enemy targeting etc.) still works correctly

**Observable:** the game still knows which TIE is closest under the reticle; it just doesn't draw a ring.

### AC-3 — Fix the code and audit trail

1. Remove the false ROM-provenance claim from docstrings and comments
2. Mint a finding ID (e.g., `L-001-lock-on-ring-removal`) to record this as a DIVERGENCE in the audit ledger
3. Mark the new finding with `remediated_by: "sw7-21"` in `docs/audit/findings/`
4. Fix the stale comment in `gameRules.ts` that cites Object_12 as a lock-box — it is the THERMAL EXHAUST PORT
5. Keep `npm test -- citations` GREEN throughout; the citations suite is the gate

**Observable:** the audit suite passes; the removal is recorded as a remediated divergence.

## Delivery Findings

No upstream findings at setup.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): session AC-1 mislocates the removal target — it says "Delete `isLocked` and `lockedEnemy` from the game state (state.ts, GameState type)" and "Remove initialization of these fields", but there is NO such field. `isLocked`/`lockedEnemy`/`LOCK_RADIUS_NDC` are pure DERIVED functions/const exported from `src/core/gameRules.ts` (the code comment at gameRules.ts:173 says outright "no lock state is stored on GameState"). Affects `.session/sw7-21-session.md` AC-1 and Dev's removal map: Dev removes the three exports from `gameRules.ts` (not `state.ts`), plus `drawLockOn` + its call + the `lockedEnemy, LOCK_RADIUS_NDC` names from the `render.ts:45` import (keep `crosshairNdc` and `FOV_Y` — both still used by other render code). *Found by TEA during test design.*
- **Improvement** (non-blocking): `tests/core/hitscan-laser.test.ts` comments (≈lines 87-88 and 335) cite `lockedEnemy`/`isLocked` (gameRules.ts:110-137) as a trap the hitscan port must avoid. After removal those become dangling references to deleted symbols. Affects `tests/core/hitscan-laser.test.ts` (Dev should trim/update those two comments when deleting the code, or reviewer-comment-analyzer will flag them). *Found by TEA during test design.* — **Addressed by Dev** (both comments updated to note "removed in sw7-21").

### Reviewer (code review)
- **Conflict** (non-blocking — pre-existing, NOT introduced by this branch): `docs/sw2-6-disassembly-fidelity-audit.md:256` lists `isLocked` under the heading "What's faithful — do NOT re-open" (`- Aim/lock geometry (\`aimDirection\`/\`isLocked\`, the inverse-projection lock)`). sw7-21 just ruled `isLocked` non-ROM and removed it, so that bullet now contradicts the ledger. Last touched by unrelated commit `10ec0d0`. Affects `docs/sw2-6-disassembly-fidelity-audit.md` (strike `isLocked` from that bullet, or add a pointer to sw7-21/H-026). *Found by Reviewer during code review (corroborated by reviewer-preflight).*
- **Improvement** (non-blocking): `tests/shell/render.player-laser.test.ts:86` comment `arc() {}, // story 8-14: render() strokes the green lock-on ring via ctx.arc` is now stale — render() no longer strokes the ring; the `arc()` stub survives only for the explosion FX (`#ffdd66`). Affects `tests/shell/render.player-laser.test.ts` (re-attribute the stub comment to the explosion arc). *Found by Reviewer during code review.*
- **Conflict** (RESOLVED in review, commit `8701809`): the minted H-026 claim overstated "WSSITE draws only the SITE CURSOR … VWSITE is exactly VWCURS … and nothing else", but `VWSITE` also `JSR VWPLAN` (the X-wing cockpit parts, documented in H-003) — an internal contradiction in the ledger on a fidelity story. Reviewer corrected the claim/reasoning to "VWCURS + VWPLAN, neither a lock circle"; source/`ours` byte-citations untouched, citations gate stayed green (18/18). *Found and fixed by Reviewer during code review.*

## Design Deviations

None recorded at setup.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC-1 tests assert removal of gameRules EXPORTS, not GameState fields**
  - Spec source: `.session/sw7-21-session.md`, AC-1 / Technical Approach §1
  - Spec text: "Delete `isLocked: boolean` from the `GameState` type / Delete `lockedEnemy: Enemy | null` from the `GameState` type / Remove initialization of these fields"
  - Implementation: `lock-on-removed.test.ts` asserts `'LOCK_RADIUS_NDC'/'isLocked'/'lockedEnemy' in gameRules` is `false` — they are pure functions on `gameRules.ts`, not state fields (there is nothing on `GameState` to delete). Namespace import so the file still compiles once they are gone.
  - Rationale: the spec's premise is factually wrong (see Delivery Finding); asserting the true location is the only way the AC can be met and verified.
  - Severity: minor
  - Forward impact: Dev removes from `src/core/gameRules.ts`; the `state.ts` edits AC-1 lists do not exist.
- **AC-3 mints H-026 in the existing pair-hud.json, not the story's guessed `L-001` in a new file**
  - Spec source: `.session/sw7-21-session.md`, AC-3 / Technical Approach §4
  - Spec text: "mint ID if needed, e.g., `L-001`... File location: `docs/audit/findings/divergence-lock-on.json`... Entry structure: { id: L-001, class: DIVERGENCE, finding, reasoning, remediated_by, citation, evidence }"
  - Implementation: `sw7-21-remediation.test.ts` requires **H-026** in `docs/audit/findings/pair-hud.json` (the WSSITE reticle family), with the REAL citations schema (`class`, `source:{file,line,verbatim}`, `ours`, `remediated_by`) that `check-citations.mjs` enforces — the story's `finding`/`citation`/`evidence` fields are not that schema and would fail the gate.
  - Rationale: `check-citations.mjs` validates `class ∈ {DIVERGENCE,…}`, a `source` in `LINKED_MODULES`, and `ours`; H-### is pair-hud's id series (max was H-025); WSSITE.MAC is the reticle module. A remediated DIVERGENCE is not re-opened against the tree, so the deleted line stays a valid frozen `ours`.
  - Severity: moderate (changes exactly what Dev mints)
  - Forward impact: Dev appends H-026 to `pair-hud.json` and anchors `source` to a byte-exact WSSITE.MAC line; keep `citations` green.
- **AC-2 leans on the existing sw7-17 suite for sim-level behaviour; adds only a unit `beamHit` guard**
  - Spec source: `.session/sw7-21-session.md`, AC-2
  - Spec text: "Verify that the nearest-object tracking (used for audio cues, enemy targeting etc.) still works correctly"
  - Implementation: no new sim-level "fire and kill the nearest TIE" test — that is already pinned by `tests/core/hitscan-laser.test.ts` (which does not import the removed symbols and stays green). Added one focused `beamHit` unit guard in `lock-on-removed.test.ts` so the CLSLZ ray's survival is asserted in this story too.
  - Rationale: the SM note itself says AC-2 is "already covered by hitscan targeting tests in 17"; duplicating it would be vacuous coverage.
  - Severity: minor
  - Forward impact: none — the guard is that `hitscan-laser.test.ts` must remain green through the removal.

### Dev (implementation)
- **AC-3 step 4 (fix the Object_12 "lock-box" comment in gameRules.ts) was a no-op — already correct**
  - Spec source: `.session/sw7-21-session.md`, AC-3 step 4 / Technical Approach §3
  - Spec text: "Fix the stale comment in `gameRules.ts` that cites Object_12 as a lock-box — it is the THERMAL EXHAUST PORT"
  - Implementation: no such comment exists in `gameRules.ts` (grep-verified). The only `Object_12` reference in `src/` is `models.ts:568-585`, which already identifies it as `.WP PORT` "THERMAL EXHAUST PORT" and is explicitly marked corrected by sw5-4/sw5-6. Nothing to fix; left untouched.
  - Rationale: the mislabel the story warned about was already remediated by prior stories; editing the correct comment would be churn.
  - Severity: trivial
  - Forward impact: none.
- **Removing the lock-on functions also required dropping 4 now-unused imports (in scope for the deletion)**
  - Spec source: tests — `tests/core/lock-on-removed.test.ts` (AC-1 machinery)
  - Spec text: "gameRules no longer exports LOCK_RADIUS_NDC / isLocked / lockedEnemy"
  - Implementation: `isLocked`/`lockedEnemy` were the sole users of `perspective`, `transform` (math3d) and `GameState`, `Enemy` (state); left in place they fail `tsc` under `noUnusedLocals`, so all four were removed from `gameRules.ts` imports.
  - Rationale: dead imports break the build; this is the natural blast radius of the deletion, not new scope.
  - Severity: trivial
  - Forward impact: none.

## Technical Approach

The ruling is **REMOVE the predictive lock-on ring**. This is not optional — it is the decision made by the Jedi. The following is the unambiguous technical execution:

### 1. Remove the UI Ring

- **File:** `src/shell/render.ts`
  - Delete the `drawLockOn()` function (currently at `~line 700` — TBD by Dev to verify exact location)
  - Delete the call to `drawLockOn(...)` in the player display render phase
  - Remove the logic that passes `lockedEnemy` to the render function

- **File:** `src/core/state.ts`
  - Delete `isLocked: boolean` from the `GameState` type
  - Delete `lockedEnemy: Enemy | null` from the `GameState` type
  - Remove initialization of these fields in game-start logic
  - Remove any update logic that set `isLocked` based on proximity

- **Tests affected:** 8-14 lock-on tests will RED and must be removed or converted
  - Remove tests like `"lock circle appears when TIE enters range"`
  - Remove tests that assert the ring's radius or colour
  - DO NOT convert them to "nearest object tracking" tests — that is already covered by hitscan targeting tests in 17

### 2. Preserve the Underlying Hitscan Targeting

- The `CLSLZ` computation (minimum distance object, from sw7-17's laser system) stays in place
  - This is used by the game to know which TIE is closest
  - It may be used for audio cues, enemy prioritization, etc.
  - Verify tests still pass for "nearest object under site" without the ring
  - Verify the hitscan system itself is not broken by removing the ring render

### 3. Fix the False Claims

- **File:** `src/core/gameRules.ts`
  - The current `LOCK_RADIUS_NDC` docstring claims: **"the half-size of the aim box the cabinet lights a target inside"**
  - WRONG: The cabinet has no aim box. The site is a crosshair (WSSITE.MAC). Delete this constant and its docstring.
  - Fix the comment citing Object_12 as a "lock-on box" — it is the THERMAL EXHAUST PORT (WSOBJ.MAC, SUPERSEDED sw5-4)

- **File:** `src/core/state.ts` comments
  - Remove any comments asserting lock-on ring as "authentic" or "from the ROM"
  - Clarify: the site (crosshair) is authentic; the ring is not

### 4. Audit Trail — Record as Divergence

- Create a finding entry for this removal (mint ID if needed, e.g., `L-001-lock-on-ring-removal`)
- File location: `docs/audit/findings/divergence-lock-on.json` (or add to an existing divergences file)
- Entry structure:
  ```json
  {
    "id": "L-001",
    "class": "DIVERGENCE",
    "finding": "Non-ROM predictive lock-on circle (8-14) removed for authenticity",
    "reasoning": "ROM source (WSSITE.MAC) gives only site crosshair; no lock/lock-on in 1983 source; Object_12 is exhaust port, not lock-box",
    "remediated_by": "sw7-21",
    "citation": {
      "file": "src/shell/render.ts",
      "line": "~TBD~",
      "text": "// deleted drawLockOn call"
    },
    "evidence": "grep on 1983 source: no lock/lock-on except in test file DIVTSTs; WSOBJ.MAC Object_12 = PORT; WSSITE.MAC = site only"
  }
  ```
- Run `npm test -- citations` to verify the suite stays GREEN

### 5. Test Suite Status

- **Tests that RED:**
  - `tests/core/state.lock-on.test.ts` (if it exists) → remove it or refactor to test hitscan targeting instead
  - `tests/shell/render.lock-on.test.ts` (if it exists) → remove it
  - Any test asserting `isLocked === true` → remove
  - Any test asserting the ring is drawn → remove

- **Tests that stay GREEN:**
  - All hitscan targeting tests (sw7-17) should remain green
  - All nearest-object-tracking tests should remain green
  - The citations suite should remain GREEN after the audit trail is updated

**Success criteria:** After removing the ring, the test suite should report fewer tests (the lock-on ones are gone), but the remaining suite should be 100% green. The citations suite must pass.

## Blockers & Dependencies

- **Unblocked:** This story depends on no other work. It is a pure deletion of a non-ROM feature.
- **Blocks nothing:** Other stories (e.g., sw7-18 surface gunnery) do not depend on the lock-on ring.

## SM Assessment

**Setup validated. This story is a FIDELITY REMOVAL: the RULING has been made — REMOVE the lock-on ring. The ruling is not conditional or open; it is final and unambiguous.**

**Why this is a TDD story, not trivial:**
- The old story 8-14 lock-on tests ASSERT the ring behaviour
- Removing the feature means those tests must be REMOVED (no fallback value to test against)
- If the tests were trivial (just a docstring fix), they would stay green
- Since the feature is deleted, the tests are RED and must be purged
- That's why the workflow is `tdd`, not `trivial`

**Routing:** phased `tdd` → RED phase → **O'Brien (TEA)**.

**Context for TEA:**

The ruling removed the open question ("keep or remove?") and decided REMOVE. This is now authoritative. TEA's job is to write tests that ASSERT the ring is gone:

1. **Test that the ring does NOT render.** Write a test that fails if `drawLockOn` is still called or if the ring appears on screen.
2. **Test that hitscan targeting STILL works.** The nearest-object computation must survive the ring's deletion — verify via existing sw7-17 tests.
3. **Test the audit trail.** Verify the finding is created and marked `remediated_by: "sw7-21"`.

The TEA Assessment will clarify the exact test files and gates required. Handoff is clean.

## TEA Assessment

**Tests Required:** Yes
**Reason:** removal story — the ring must be provably gone and the authentic hitscan path provably intact.

**Test Files:**
- `tests/shell/render.lock-on-removed.test.ts` — AC-1 observable: with a TIE dead under the reticle, `render()` strokes NO green (`#9dff00`) lock-on ring. (RED evidence: it currently strokes one at `{x:400,y:300,r:36}` — screen centre, `LOCK_RADIUS_NDC·h/2` — which also proves the fixture genuinely locks.)
- `tests/core/lock-on-removed.test.ts` — AC-1 machinery: `gameRules` no longer exports `LOCK_RADIUS_NDC`/`isLocked`/`lockedEnemy` (namespace import → still compiles after deletion). AC-2 preserve: `beamHit` (the ROM CLSLZ ray) survives and still ranks nearest-under-site.
- `tests/audit/sw7-21-remediation.test.ts` — AC-3: `H-026` minted in `pair-hud.json` as a `DIVERGENCE` citing WSSITE, `remediated_by: sw7-21`; the H-001/2/3 reticle neighbours stay unswept.
- **Deleted** `tests/core/targeting.test.ts` — the whole Story 8-14 suite imports the removed symbols; nothing in it survives the removal (it only tested the ring machinery).

**Tests Written:** 10 new (7 RED drivers + 3 preserve/guard PASS) covering 3 ACs; 1 suite (13 tests) deleted.
**Status:** RED (7 failing, ready for Dev) — verified by testing-runner (`sw7-21-tea-red`): 7 failed / 1499 passed, all 7 in the three new files; `hitscan-laser` and `citations` green; `targeting.test.ts` gone; all compile.

### Removal map for Dev (Yoda)

1. `src/core/gameRules.ts` — delete `LOCK_RADIUS_NDC` (152), `isLocked` (162), `lockedEnemy` (177) and the `// --- Lock-on (story 8-14) ---` comment block (135-144). KEEP `beamHit` and everything CLSLZ. Fix the stale comment (≈gameRules.ts:97 region / the Object_12 mention) that treats the lock as authentic.
2. `src/shell/render.ts` — delete `drawLockOn` (496-516), its call (480) and the ring comment (478-479); drop `lockedEnemy, LOCK_RADIUS_NDC` from the import at line 45 (KEEP `crosshairNdc`, `FOV_Y` — used elsewhere).
3. `docs/audit/findings/pair-hud.json` — append `H-026`: `class: "DIVERGENCE"`, `source` = a byte-exact WSSITE.MAC line (the site is a crosshair, not a lock box), `ours` = the frozen historical lock-on line (any of the deleted lines; remediated findings are not re-opened), `recommendation: "fix"` + `size`, `remediated_by: "sw7-21"`. Then keep `npm test -- citations` green.
4. `isLocked`/`lockedEnemy`/`LOCK_RADIUS_NDC` have NO other callers (grep-verified: only gameRules defs + render's drawLockOn + the deleted targeting.test.ts) — removal is self-contained.

### Rule Coverage (lang-review: typescript.md)

| Rule | Coverage | Status |
|------|----------|--------|
| #1 type-safety escapes | `as unknown as CanvasRenderingContext2D` in the render mock is the established sibling-test idiom (render.player-laser/tie-orient), commented as a deliberate stub; guarded non-null `!` only after `.not.toBeNull()`/`.toBeTruthy()` | pass |
| #4 null/undefined | no `\|\|`-on-falsy; `remediated_by ?? undefined` used deliberately in the neighbour guard | pass |
| #5 module/imports | test files use the repo's no-`.js` vitest import convention (matches every sibling test) | pass |
| #8 test quality | every test asserts a concrete value (export absence, `arcs.length`, `beamHit` distances, `H-026` class/stamp); no `as any`, no `let _ =`, no `assert(true)` | pass |
| #2/#3/#6/#7/#10-#12 | N/A — removal RED phase touches no generics/enums/JSX/async/input-validation/perf surface | n/a |

**Self-check:** 0 vacuous tests. The render fixture is proven non-vacuous by the RED failure (the ring WAS drawn); the beamHit/neighbour guards assert real values, not existence.

**Handoff:** To Dev (Yoda) for the GREEN phase — execute the removal map; the 7 RED tests turn green and the 3 guards + full suite stay green.

## Dev Assessment

**Status:** GREEN — 1506/1506 tests pass; `tsc --noEmit` + `vite build` clean; citations gate green.
**Branch:** `chore/sw7-21-remove-lock-on-ring` — pushed (RED `7f7cef9`, GREEN `2152bee`).

**Implementation (TEA's removal map, executed):**
- `src/core/gameRules.ts` — deleted `LOCK_RADIUS_NDC`, `isLocked`, `lockedEnemy` and the `// --- Lock-on (story 8-14)` comment block (the false "aim box the cabinet lights a target inside" claim died with the const); dropped the now-unused `perspective`, `transform`, `GameState`, `Enemy` imports. `beamHit` / CLSLZ untouched.
- `src/shell/render.ts` — deleted `drawLockOn`, its call, and the ring comment; dropped `lockedEnemy, LOCK_RADIUS_NDC` from the gameRules import (kept `crosshairNdc`, `FOV_Y`, both still used).
- `docs/audit/findings/pair-hud.json` — minted **H-026** (DIVERGENCE; `source` WSSITE.MAC:37 `VWSITE::` "VIEW ALL SITE STUFF"; `ours` = frozen `LOCK_RADIUS_NDC` line; `recommendation` fix/s; `remediated_by: sw7-21`).
- Reanchored **15** line-drifted `ours` citations across pair-hud/explosions/models/tie-ai via `tools/audit/reanchor-citations.mjs --write` — **line numbers only, verbatim unchanged** (git-diff verified: every hunk is a `"line":` edit). This was forced by the code deletion shifting rows; it is not an evidence change.
- `tests/core/hitscan-laser.test.ts` — updated the two comments that pointed at the deleted `lockedEnemy`/`isLocked` (Delivery Finding #2), preserving the trap they document.

**AC status:**
- **AC-1** (remove ring): ✅ — 3 export-absence tests + the render "no green ring" test green.
- **AC-2** (preserve CLSLZ): ✅ — `beamHit` intact; `hitscan-laser.test.ts` green; 3 beamHit guards green.
- **AC-3** (audit trail): ✅ — H-026 minted + `remediated_by`; citations gate green; step 4 (Object_12 comment) was a no-op (already correct — see deviation).

**For the Reviewer (Obi-Wan):** the pair-*.json diffs are H-026 (new) plus pure line-number re-anchors — no verbatim/evidence changed. The removal is proven by behaviour: `render.lock-on-removed.test.ts` drives the real `render()` over a locked TIE and asserts no green ring arc.

**Handoff:** To Reviewer for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 (doc follow-up) | confirmed 1 (F2, non-blocking); build + 1506/1506 tests + citations 12/12 + reanchor dry-run (0 moved/0 lost) all green; 0 orphaned imports; targeting.test.ts confirmed deleted |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations | 17 rules PASS (13 TypeScript + 4 star-wars); H-026 schema + byte-exact WSSITE.MAC:37 verified; reanchor line-only; TDD non-vacuous; core/shell boundary intact |

**All received:** Yes (2 ran, 7 disabled via `workflow.reviewer_subagents`)
**Total findings:** 3 (1 from subagents, 2 from my own read) — 1 FIXED in review (F1), 2 non-blocking follow-ups (F2, F3). 0 Critical, 0 High.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** the removed `lockedEnemy(state)` → (only caller) `render.ts drawLockOn` → `ctx.arc`. Verified by grep that `lockedEnemy`/`isLocked`/`LOCK_RADIUS_NDC` had NO other caller, so deleting the ring is self-contained. The authentic path `sim.ts` → `beamHit` (CLSLZ) is a separate function, untouched (safe because the ring's NDC-circle test and the hitscan ray are distinct code — proven by `hitscan-laser.test.ts` staying green).
**Pattern observed:** clean contiguous-block deletion (the whole "// --- Lock-on (story 8-14)" section in `gameRules.ts:135-189`, `drawLockOn` in `render.ts`), with now-unused imports (`perspective`, `transform`, `GameState`, `Enemy`) correctly dropped — `tsc --noEmit` clean confirms no orphans.
**Error handling:** none introduced (a removal); the removed `if (!target) return` guard left with its function. No swallowed errors.

### Dispatch-tag coverage (7 thematic subagents disabled → covered by Reviewer + rule-checker)
- **[EDGE]** — No new branches introduced. The render test pins the locked/centred case; the `beamHit` guards cover nearest-of-two, behind-gun (null), and off-axis (null). No unhandled path. Clean.
- **[SILENT]** — Removal adds no error handling and swallows nothing. Clean.
- **[TEST]** — Verified non-vacuous myself and via rule-checker: the render fixture genuinely satisfies the old lock (RED evidence showed the ring at `{400,300,r36}`); the `in gameRules` checks were genuinely RED before removal; `beamHit` guards assert real distances. `targeting.test.ts` correctly deleted, not left to rot. Clean.
- **[DOC]** — Where the findings landed: **F1** H-026 claim inaccuracy (**FIXED**, `8701809`); **F2** pre-existing `sw2-6` doc bullet (non-blocking follow-up); **F3** stale `render.player-laser.test.ts:86` arc comment (non-blocking follow-up). Dev correctly updated the `hitscan-laser.test.ts` comments.
- **[TYPE]** — rule-checker: no `as any`/`@ts-ignore`; the namespace-import-to-assert-absence pattern and guarded `!` are correct and conventional. Clean.
- **[SEC]** — No security surface: client-only vector game, no input parsing/network/secrets; the audit tests read committed fixtures, not user input. Removal shrinks surface. Clean.
- **[SIMPLE]** — The change IS simplification (net −117 lines of production/test); rule-checker + preflight confirm no dead code or orphaned helpers/imports left behind. Clean.
- **[RULE]** — rule-checker: 17/17 PASS, zero violations. Core/shell purity intact; audit-citation discipline satisfied (H-026 valid + byte-matched); reanchor line-number-only across 4 files; TDD integrity confirmed.

### Devil's Advocate
Assume this removal broke something. First suspect: did deleting `lockedEnemy` orphan a consumer the story didn't know about — AC-2 explicitly worried "audio cues, enemy targeting" might depend on the nearest-object query? I chased every reference: `lockedEnemy`/`isLocked` are called ONLY by `drawLockOn`; nothing in `sim.ts`, audio, or targeting touches them. The nearest-under-site quantity the game actually uses at runtime is CLSLZ via `beamHit`, a wholly separate function that this diff never opens — and `hitscan-laser.test.ts` (which exercises it) stays green, so the "irony to preserve" is genuinely preserved, not just claimed. Second suspect: did the reticle itself vanish? No — `drawCrosshair` is a different function, untouched; the render suite and full 1506-test run confirm the crosshair still strokes. Third, and the real risk on THIS story: a silently corrupted audit ledger. My deletions shifted 15 cited line numbers, and a careless reanchor could have rewritten evidence. I diffed all four finding files: every non-`H-026` change is exclusively a `"line":` value, no `verbatim`/`claim`/`source` altered, independently confirmed by the rule-checker and by `citations.test.ts` (12/12) re-opening every quote against the tree. Fourth: could H-026's frozen `ours` rot? It is a `remediated_by` DIVERGENCE, which `check-citations.mjs` deliberately stops re-opening — the deleted line stays valid history by design, and the ROM-side `source` (WSSITE.MAC:37) is byte-exact and permanent. The one thing the adversarial pass DID catch was a prose claim that "WSSITE draws only the site cursor" — false, because VWSITE also draws VWPLAN (H-003's cockpit parts) — which would have shipped an internal contradiction into the very ledger this story exists to keep honest. Fixed in review. A confused user simply sees no green ring; firing still kills the nearest TIE, which is the authentic behaviour. I could not manufacture a correctness failure.

**Findings summary:** 0 Critical, 0 High, 1 Medium (F1 — FIXED in review), 2 non-blocking follow-ups (F2 pre-existing doc, F3 stale test comment). Per the blocking rule (Critical/High only), and with the one substantive Medium corrected in-place, this APPROVES.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

## Sm Assessment at Finish

**Not yet complete.**