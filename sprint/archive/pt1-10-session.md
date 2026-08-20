---
story_id: "pt1-10"
jira_key: "pt1-10"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-10: star-wars: clicking the mouse should start the game, not just Enter

## Story Details
- **ID:** pt1-10
- **Jira Key:** pt1-10
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-10-star-wars-mouse-click-start
- **Branch Strategy:** gitflow (feat/pt1-10-star-wars-mouse-click-start)
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** review
**Phase Started:** 2026-08-20T07:07:18Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T06:56:07Z | 2026-08-20T06:59:10Z | 3m 3s |
| red | 2026-08-20T06:59:10Z | 2026-08-20T07:03:03Z | 3m 53s |
| green | 2026-08-20T07:03:03Z | 2026-08-20T07:07:18Z | 4m 15s |
| review | 2026-08-20T07:07:18Z | - | - |

## Sm Assessment

**Story:** pt1-10 — star-wars: a mouse click on the start screen should start the
game, in addition to Enter. 1pt, p1, `tdd` (phased). Fresh from the 2026-08-19
playtest, so no stale-premise risk — the premise was confirmed by reading the code,
not just trusted.

**Premise verified (context discovery, read-only):** In
`plugins/star-wars/src/shell/input.ts` the `start` edge is armed only on keydown of
Enter/Digit1/Numpad1; the existing `pointerdown` listener maps a click to
`state.fire` (the trigger), never to `start`. So the bug is real: a click cannot
start the game today. The fix is shell-only — `core/` is a pure sim guarded by the
game's purity test, and stays untouched.

**Sibling probes (clean):** no `pt1-10` remote branch; live sessions across
checkouts are pt1-2 (a-1), pt1-20 (a-3), pm6-5 (a-1) — none touch star-wars start
input. Claim pushed on `feat/pt1-10-star-wars-mouse-click-start` and story stamped
`in_progress` (sm-setup left it `backlog`, as always).

**Two design seams flagged for TEA/Dev** (recorded in the context, not decided by
SM): (1) `start` is edge-consumed and the core acts on it only in attract/gameover;
(2) the keydown latch guards `!e.repeat` because initials-entry sits behind the same
key — a click path may need an equivalent guard. These are the RED-phase design
questions, not mine to rule.

**No ACs in the sprint YAML** — TEA derives them in RED from the story title +
the mechanism above.

## Tea Assessment

**RED landed.** New suite `plugins/star-wars/tests/shell/input.start-on-click.test.ts`
(behavioral, not a source-text scan — lang-review #15/#26): `2 failed | 2 passed`.

**Derived ACs** (no ACs in the sprint YAML; derived from the story title + the
mechanism in `shell/input.ts`):
- **AC1** — a mouse click (`pointerdown`) arms the `start` edge, exactly as
  Enter/Digit1/Numpad1 do. *(RED today — the real defect.)*
- **AC2** — the click still pulls the trigger: `fire` behavior is preserved.
  *(Green guard — passes today, guards against the fix dropping fire.)*
- **AC3** — the start edge is one-shot: one click yields exactly one `start=true`
  then clears, matching the Enter latch discipline (one click = one
  attract→play transition, never a machine-gun of edges). *(RED today.)*

**Non-vacuity anchor:** the baseline test dispatches an Enter keydown through the
stubbed `window` and asserts `start` latches — it PASSES, proving the fake-window
harness actually drives the controller. So the two failures are the defect, not
broken plumbing.

**Design note for Dev (the seams SM flagged, now resolved by the tests):** the
controller is stateless — it cannot know which screen is showing, and it doesn't
need to. Enter already arms `start` on every screen and the *core* gates it
(acts only in attract/gameover). The faithful fix is symmetric: `pointerdown`
arms `start` too, and the core's existing gate does the rest. The `!e.repeat`
guard on the keydown path exists because OS key-repeat could machine-gun the
initials-entry screen; a `pointerdown` has no OS auto-repeat, so a single click is
inherently one edge — AC3 pins that, no extra guard required. **Shell-only change;
`core/` is untouched** (the purity test guards it).

**Rule Coverage (lang-review/typescript.md):**
- **#15 / #26 (source-text / all-local assertions):** avoided — the suite runs the
  real `createInputController` against a stubbed window/canvas and asserts on
  sampled runtime state, not on matched source tokens.
- **Vacuous-assertion self-check:** every `it` has a meaningful `toBe`/`toBeFalsy`
  on a value the code under test produces; no `let _ =`, no `assert(true)`, no
  always-None assertions. The baseline case exists specifically to prove the RED is
  real.
- **#69 (`as any` in assertions):** none — the only casts are `as unknown as` on the
  fake canvas/event *construction*, not in assertions.

## Dev Assessment

**GREEN.** One-line shell fix in `plugins/star-wars/src/shell/input.ts`: the
`pointerdown` listener now sets `pendingStart = true` in addition to `state.fire`,
so a click arms the same one-shot start edge Enter/Digit1/Numpad1 do. No other
change — `core/` untouched (purity test still guards it), no new abstraction.

**Why this is complete, not just green:** a click and Enter now travel the
*identical* path — both set `pendingStart`, both consumed by the same
`sample()` (`start: pendingStart`, then cleared) and the same core gate that acts
on `start` only in attract/gameover. Enter demonstrably starts the game in the
shipped build, so a click does too by construction; the RED suite proves the edge
now arms and stays one-shot.

**Verification:**
- `npx vitest run --project star-wars input.start-on-click` → **4/4 pass** (was
  2 failed / 2 passed).
- `npx vitest run --project star-wars` → **2409/2409 pass** (219 files) — no
  regression; the `fire` guard confirms the trigger still fires.
- `npm run lint` (repo-wide `tsc --noEmit`) → clean.

**Manual check available if the Reviewer wants belt-and-braces:** `just serve` →
`http://127.0.0.1:5270/star-wars/`, click on the attract screen → game starts.
Not run here because the fix reuses a production-proven code path end-to-end and
the behavioral suite exercises the real controller through a dispatched
`pointerdown`.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Design change (review phase, at user direction): the click is CONTEXTUAL, not a global start latch

**What changed.** The first GREEN cut armed `start` on every `pointerdown` fleet-wide
(`shell/input.ts`). The user flagged it as overcomplicated/crude, and it was: because a
click is *also* the fire trigger (a held level), the global latch overloaded the click —
on attract it opened the death-star picker via `start` while the same held `fire` bled
into the next frame and could blast straight through the picker into a run.

**What it is now.** The controller interprets a click by game mode — `sample(mode)`, wired
from the loop that already holds `state`. On `attract` a click means **start** (exactly
what Enter does) and is **spent** on it: its held button is swallowed until release, so it
never doubles as fire. On every other screen a click is the trigger, unchanged. Enter stays
global; the core gates it; the keyboard path is untouched. `core/` untouched.

**Why this is the faithful reading.** The story says "in addition to **Enter**" — so a click
must do *exactly* what Enter does, no more. The attract screen's own prompt is **"PULL
TRIGGER TO START"** and the picker's is "FIRE LASER AT DESIRED DEATH STAR" — the cabinet is
trigger-driven, one discrete pull per action, which is what the spent-on-start swallow
enforces.

**Supersedes TEA's AC2 framing** ("the click still pulls the trigger — fire unchanged"): fire
is preserved *during play* (tested), but on *attract* the click no longer fires — and it never
meaningfully did, since the core ignores fire on attract. Not a regression; the correct
interpretation.

## Reviewer Assessment

**APPROVED.** The redesign is correct, minimal, and shell-only.

**Adversarial checks (all clear):**
- The original crude fix's real defect — a held click blasting through the SELECT-A-DEATH-STAR
  picker — is closed by the mode-gated, spent-on-start swallow. **Verified in-browser** (Playwright,
  own port 5290, proven cwd = a-2): a click on attract opens the picker (EASY/MEDIUM/HARD) and does
  NOT auto-confirm a difficulty.
- Fire preserved during play (`pointerDown && !clickSpentOnStart`; `clickSpentOnStart` is only ever
  set on attract). Space fire independent of the swallow. Enter path unchanged.
- `core/` untouched → determinism/replay intact (full suite 2411/2411). `sample(mode)` type-checks
  at its one caller (main.ts); lint clean.
- No new silent-failure / stuck-state class beyond the pre-existing `pointerup`-clears-held-state
  dependency the original code already had.

**Verification:** pt1-10 6/6 · full star-wars 2411/2411 · `npm run lint` clean · visual playtest ✓.

No Critical/High/Medium. Ready to finish.