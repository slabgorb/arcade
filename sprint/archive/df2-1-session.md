---
story_id: "df2-1"
jira_key: "df2-1"
epic: "df2"
workflow: "tdd"
---
# Story df2-1: Render seam skeleton (RED first): plugins/defender/src/core/framebuffer.ts pure 292x240 index surface (Uint8Array of 4-bit palette indices) + clear(index); plugins/defender/src/shell/render.ts index->RGBA (temporary identity palette until df2-2) + @shared/view fitIntegerScale blit; main.ts paints a cleared framebuffer (steps no clock). Establishes the core/shell boundary and keeps purity.test.ts green. Visible 292x240 pinned to williams.cpp:1601 (schema-only, prose).

## Story Details
- **ID:** df2-1
- **Jira Key:** df2-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df2-1-render-seam-skeleton
- **PR:** https://github.com/slabgorb/arcade/pull/392

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-14T21:21:18Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-14T20:38:24Z | 2026-08-14T20:42:31Z | 4m 7s |
| red | 2026-08-14T20:42:31Z | 2026-08-14T20:49:36Z | 7m 5s |
| green | 2026-08-14T20:49:36Z | 2026-08-14T20:53:44Z | 4m 8s |
| review | 2026-08-14T20:53:44Z | 2026-08-14T21:06:38Z | 12m 54s |
| red | 2026-08-14T21:06:38Z | 2026-08-14T21:10:21Z | 3m 43s |
| green | 2026-08-14T21:10:21Z | 2026-08-14T21:11:45Z | 1m 24s |
| review | 2026-08-14T21:11:45Z | 2026-08-14T21:21:18Z | 9m 33s |
| finish | 2026-08-14T21:21:18Z | - | - |

## Sm Assessment

**Setup complete. Routing to TEA (Han Solo) for the RED phase.**

- **Session, context, branch:** all created. Branch `feat/df2-1-render-seam-skeleton`
  cut from `develop` (gitflow). Story context at `sprint/context/context-story-df2-1.md`
  authored with a concrete Technical Approach and six ACs distilled from the df2 design
  spec (§2/§5/§6) — TEA has a real target to write failing tests against.
- **Scope for TEA:** RED-first the render seam only — pure `core/framebuffer.ts`
  (292×240 index surface + `clear`), shell `render.ts` (logical dims + placeholder
  index→RGBA + `@shared/view fitIntegerScale` blit), `main.ts` painting one cleared
  still. No transcription, no clock, no game state (those are df2-2..6 / df3+). The
  hard gate is `plugins/defender/tests/purity.test.ts` staying green.
- **Guardrails:** epic context `sprint/context/context-epic-df2.md` carries the full
  set (core/shell boundary, colours-never-invented, placeholder-is-temporary,
  292×240 is a prose-only MAME/GPL board fact). This story introduces no ROM data,
  so no `claims/*.json` authoring — the citation gate has nothing to bite on yet.

**KNOWN TRACKING ISSUE (blocking finish, not RED):** `df2` was removed from
`sprint/current-sprint.yaml` `epics:` (owner decision — Defender phase-2 deferred out
of active sprint 2634). The loader therefore skips `epic-df2.yaml`, so
`pf sprint story show df2-1` returns "not found" and `pf sprint story update df2-1
--status in_progress` no-ops. The work proceeds fine on the branch/session (the
workflow reads the session file, not the sprint YAML), but the story stays
`status: backlog` in YAML and the **finish ceremony will fail until df2 is
re-indexed**. Re-add `- df2` to `current-sprint.yaml` `epics:` before finish, or
finish df2-1 out-of-sprint by hand. Flagged to owner; not reverting the intentional
removal.

## Tea Assessment

**RED state established and committed. Routing to Dev (Yoda) for GREEN.**

Two failing test files define the render-seam contract (11 tests RED, self-describing
"not built yet" messages, zero regressions, src/core purity sweep still dormant):

- `plugins/defender/tests/framebuffer.test.ts` (5 tests) — the PURE core surface.
  Contract: `createFramebuffer(width, height): Framebuffer` (`{width, height, data:
  Uint8Array}`, one 4-bit index per cell) + `clear(fb, index): void` (full in-place
  fill). Dims are **arguments**, not module constants — the 292×240 board numbers
  live in the shell.
- `plugins/defender/tests/render.test.ts` (6 tests) — the SHELL seam. Contract:
  `LOGICAL_WIDTH = 292` / `LOGICAL_HEIGHT = 240`, `indexToRgba(index): Rgba`
  (temporary placeholder palette — the one point df2-2 replaces), `render(ctx, fb):
  void` blitting via `@shared/view fitIntegerScale`.

**What Dev must build (GREEN):** `plugins/defender/src/core/framebuffer.ts` and
`plugins/defender/src/shell/render.ts` to the signatures above, plus wire
`plugins/defender/src/main.ts` to paint a cleared framebuffer through the seam
(step no clock). Landing `framebuffer.ts` auto-arms the dormant `it.each(coreFiles)`
purity sweep — keep the core free of colour/canvas/clock/entropy or that sweep
reddens.

### Rule Coverage (lang-review/typescript.md)

| Check | How this suite enforces it |
|-------|----------------------------|
| **#21 degenerate-but-not-nullish geometric input** (origin sw8-27) | `render()` driven with a 0×0-canvas recording mock; asserts no throw and **no NaN/Infinity reaches any ctx call** — forces delegation to the clamped `fitIntegerScale` (`Math.max(1, …)`) instead of dividing by a canvas dimension. The story's headline robustness guard. |
| **#18 fixture whose value IS the expectation** | `createFramebuffer` tested with two DISTINCT arbitrary shapes (4×3, 7×5), deliberately NOT the 292×240 board numbers, so a factory that ignored its arguments and hardcoded the board size could not pass. |
| **#26 assertion whose terms are all test-local** | Avoided: `LOGICAL_WIDTH/HEIGHT` are imported from `src` and pinned to the literal board fact (292/240), not derived from other test constants. |
| **#15 source-text token vs claim** | Avoided: every assertion is behavioural (imports and calls the module), no source-grep guards. |
| Vacuous-assertion self-check (#8/#26) | `clear` tested with two different indices + a pre-dirtied-overwrite case (a hardcoded fill can't pass); `indexToRgba` pinned as total/opaque/**varies by index** (0≠15) so a constant-colour stub fails. No `let _ =`, no `assert(true)`. |

**Deliberate testability contract (mild RED requirement):** `render()` must operate
on the provided 2D context (no self-constructed `OffscreenCanvas`) so the seam is
node-testable. Noted in `render.test.ts`; if Dev has strong reason to build an
offscreen surface, log it as a Design Deviation and the blit falls to df2-6's visual
proof + `tests/canonical-serve.test.mjs` instead.

**Not unit-tested here (honest scope, not a gap):** the actual on-screen pixel
result and `main.ts`'s rAF wiring — covered by df2-6's VISUAL screenshot check and
the existing `tests/canonical-serve.test.mjs` DIFFER check (orchestrator suite). AC2
(core purity) is enforced by the existing armed sweep in `purity.test.ts`, not a new
test. AC5's "no clock" for the sim is enforced by that purity guard on core (`main`
is shell, so rAF is permitted).

## Tea Assessment (rework round 1)

**RED-rework established and committed. Routing back to Dev (Yoda) for GREEN.** The
reviewer's testable findings are now locked by failing/hardened tests in
`plugins/defender/tests/render.test.ts` (1 RED by design, 186 green, 0 regressions):

- **F-A (RED — the fix target):** a new comment-stripped denylist scan asserts
  `render.ts` carries no hex-colour literal on the render path. It FAILS now on
  `render.ts:61` `'#000000'` (message names the literal). Dev greens it by resolving
  the ground fill through the palette — `indexToRgba(0)` emitted as `rgb(...)`
  (joust `colours[0]` precedent, `plugins/joust/src/main.ts:614`) — and by correcting
  the `render.ts:11` comment's scope so it is true.
- **F-C (hardened — stays green):** the 0×0-canvas guard now asserts the scale-1
  CONTRACT (the created `ImageData` is still ≥ `LOGICAL_WIDTH`×`LOGICAL_HEIGHT`) and
  the mock `createImageData` throws on a 0 dimension like the real API. A clamp-removed
  `scale=0` reimplementation now reddens both ways; the old no-NaN-only check did not.
- **F-D:** the header/test comments corrected to describe what the guards prove.

**What Dev must do (GREEN):** change the `render.ts` ground fill from the `#000000`
literal to a palette-resolved colour (background index 0), and fix the `render.ts:11`
comment. That single change greens the denylist scan; the 0×0 and all other tests stay
green. No core change; no new behaviour — the pixel stays black, but reached by index.

The two non-blocking reviewer Improvements (per-frame `ImageData` realloc / no-DPR;
`fb`-size contract note) are NOT part of this rework — they are forward concerns for
df3 / a later polish, recorded in Delivery Findings.

## Dev Assessment

**GREEN. Implementation complete — 186/186 defender tests pass, `tsc` clean,
`defender` builds. Three files, minimal code to the TEA contract.**

- `plugins/defender/src/core/framebuffer.ts` (NEW, pure core) — `Framebuffer`
  interface + `createFramebuffer(width, height)` (a `Uint8Array` of `width*height`
  4-bit indices) + `clear(fb, index)` (`data.fill`, in place). Dims are arguments;
  no board constant in core. The game's first `src/core` module — the armed purity
  sweep now scans it and passes.
- `plugins/defender/src/shell/render.ts` (NEW, shell) — `LOGICAL_WIDTH = 292` /
  `LOGICAL_HEIGHT = 240` (williams.cpp:1601, prose), `indexToRgba` (a 16-step
  grey-ramp placeholder — the single point df2-2 swaps for the CRAM palette), and
  `render()` that expands the index surface into an already-scaled `ImageData` and
  `putImageData`s it once, geometry delegated to `@shared/view fitIntegerScale`.
- `plugins/defender/src/main.ts` (edited) — builds the core framebuffer, `clear`s it
  to index 0, blits through the seam each rAF; steps no clock, holds no sim state.

### AC accountability

| AC | Status | Evidence |
|----|--------|----------|
| AC1 pure core surface | DONE | `framebuffer.test.ts` (5) — sizing (two distinct shapes), blank-init, `clear` two-value + overwrite + in-place. |
| AC2 core stays pure | DONE | Existing `purity.test.ts` sweep now armed on `framebuffer.ts` and green (no clock/canvas/entropy/shell import). |
| AC3 shell owns colour + dims | DONE | `render.test.ts` — `LOGICAL_WIDTH/HEIGHT` pinned 292/240; `indexToRgba` total/opaque/varies-by-index. |
| AC4 integer-scaled blit via shared code | DONE | `render()` calls `@shared/view fitIntegerScale`; render tests assert a draw call issued + no NaN. |
| AC5 static still, no clock | DONE | `main.ts` paints a cleared framebuffer, steps no clock; `defender` builds; `/defender/` served page is covered by `tests/canonical-serve.test.mjs` DIFFER + df2-6's visual proof. |
| AC6 df2-2 swap is one function | DONE | The placeholder is isolated in `indexToRgba` with a `// TEMPORARY … df2-2` marker; the blit path reads it by index. |

### Design deviations
Recorded under Design Deviations below: **none** — the TEA contract was implemented
as specified, including the "operate on the provided ctx, no OffscreenCanvas"
testability requirement (render uses `ctx.createImageData` + `ctx.putImageData`).

**For the Reviewer (Obi-Wan):** the render blit is O(W·H·scale²) building a scaled
`ImageData` per call — fine for df2-1's static still (painted on resize, not a live
60 Hz loop), but when df3 makes this a per-frame path the scaled-copy expansion is
the thing to revisit (a cached atlas / `drawImage` scale, joust's approach). Noting
it as a forward concern, not a df2-1 defect.

## Subagent Results (round 1 — REJECTED)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 186/186 green, lint clean, no smells, purity sweep armed+green |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — boundary conditions covered by reviewer + rule-checker |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no error/fallback paths in diff (checked by reviewer) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — test quality covered by rule-checker (#15/#18/#26) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 2 (F-A High, F-B Low), dismissed 0, deferred 0 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — types checked by rule-checker (#1/#2) + reviewer |
| 7 | reviewer-security | Yes | clean | none | N/A — bounds-safe, no attacker-reachable path; corroborated reviewer trace |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — complexity noted by reviewer (per-frame realloc) |
| 9 | reviewer-rule-checker | Yes | findings | 1 substantive (+1 paired) | confirmed 2 (F-C Medium mutation-proven, F-D Low), dismissed 0 |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 4 confirmed (1 High, 1 Medium, 2 Low), 0 dismissed, 0 deferred

## Reviewer Assessment (round 1 — REJECTED, superseded by round 2 below)

**Verdict:** REJECTED

The production code is functionally sound — bounds-safe, pure core, correct geometry
delegation, builds, 186/186 green (preflight, security, and rule-checker all confirm
`framebuffer.ts`/`render.ts`/`main.ts` clean against their domains). **This is not a
"broken code" rejection.** It is an AC-compliance + test-teeth rework: the story fails
its own written AC3 and the epic's non-dismissable standing rule with a false comment
(F-A), and the story's *headline* robustness guard is mutation-proven toothless (F-C).
Both fixes are small and precedented.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [DOC][RULE] | The module comment asserts "Every colour drawn is reached BY INDEX … **never** a scattered hex literal (colours are never invented)" but the ground fill is exactly a scattered hex literal `ctx.fillStyle = '#000000'`. This violates **AC3** ("no colour literals scattered elsewhere in the file") and the epic's standing **"colours are never invented"** rule — and the comment falsely claims compliance. Joust's codebase already litigated this and fills the ground via the palette (`plugins/joust/src/main.ts:614` `colours[0]`, with `:647` "not an invented literal … so the denylist scan stays clean"). | `render.ts:11` (false comment) + `render.ts:61` (`#000000`) | Fill the ground through the background palette index — `indexToRgba(0)` (introduce a named `BACKGROUND_INDEX = 0` if clearer), mirroring joust's `colours[0]`. Visually identical (index 0 is black in the placeholder), but reached by index so AC3 + the comment become true. |
| [MEDIUM] [TEST][RULE] | The 0×0-canvas guard cannot detect removal of the `fitIntegerScale` `Math.max(1,…)` clamp it advertises. **Mutation-proven** by rule-checker: replacing the delegation with the same formula minus the clamp left all 6 render tests green, because `0/292` is a finite `0` (not `NaN`) and the mock's `createImageData(0,0)` doesn't throw the way the real API does. So the "no NaN reaches ctx" assertion cannot distinguish clamped code from a `scale=0` reimplementation that draws nothing. Production `render.ts` is correct; the *guard* is toothless. | `render.test.ts:163-171` | Assert the real contract: on a 0×0 canvas the produced image is still scale-1 (`width ≥ LOGICAL_WIDTH`, `height ≥ LOGICAL_HEIGHT`) — capture `createImageData`'s args in `makeCtx`, or make the mock's `createImageData` throw on a 0 dimension like the browser. Then removing the clamp reddens. |
| [LOW] [DOC] | Paired with F-C: the comment claims the test "require[s]: no throw, and no NaN … [proving] render() must delegate its geometry to fitIntegerScale (whose scale is clamped)". Overstates what the finiteness check proves. | `render.test.ts:24-29` | Reword to match the strengthened assertion once F-C lands. |
| [LOW] [DOC] | The df2 planning docs backtick-cite `williams.cpp:1601` while stating, a few lines above each, that MAME is "**never** backtick-cited." The TS source comments correctly do NOT backtick MAME — only the docs contradict their own rule. | `context-epic-df2.md:85`, `context-story-df2-1.md:40-41`, `2026-08-14-…-design.md:30,125` | Drop the backticks around the MAME pointers (or soften the "never backtick" prose). No code/test impact. |

### Adjudication of the specialist split on `#000000`
reviewer-comment-analyzer flagged it; reviewer-rule-checker judged it a "deliberate
exemption." I side with the finding: **no written AC or rule exempts a literal
background.** AC3 says "no colour literals scattered elsewhere in the file" (full
stop), `render.ts:11` says "never," and the epic rule is "every colour is a
transcribed palette entry reached by index." Per the reviewer rule, a finding matching
a stated project rule may not be dismissed absent a *different* rule that explicitly
contradicts it — there is none. The rule-checker's leniency is not backed by contract
text, and joust's own code shows the team chose the palette-index fill.

### Tag coverage (all eight dispatch domains)
- **[DOC]** — comment-analyzer: F-A (false "never" comment), F-B (doc backticks). Confirmed.
- **[RULE]** — rule-checker: F-C (mutation-proven weak guard), and corroborates F-A (AC3/colours-by-index). Confirmed.
- **[SEC]** — security: clean; bounds-safe, no attacker-reachable path, core pure. Verified.
- **[TEST]** — test-analyzer disabled; I + rule-checker covered it: F-C is the test defect; the rest of the suite is mutation-safe (two-distinct-shapes, two-value clear, varies-by-index).
- **[EDGE]** — edge-hunter disabled; I enumerated boundaries myself: 0×0 canvas (safe in prod, F-C on the guard), huge canvas (finite, unclamped alloc noted), fb smaller than logical (silent black-fill, latent — below).
- **[SILENT]** — silent-failure-hunter disabled; the one silent path is `render()` reading past a too-small `fb` → `undefined` → index 0 (typed-array OOB read, no throw). Latent; `main.ts` always passes a full-size fb. Non-blocking note.
- **[TYPE]** — type-design disabled; rule-checker #1/#2: `Framebuffer` fields `readonly`, casts follow runtime `typeof` checks, no `as any`/`Function`/`Record<string,any>`. Clean.
- **[SIMPLE]** — simplifier disabled; I noted: `render()` rebuilds the O(W·H·scale²) scaled `ImageData` every rAF frame for a static frame (Dev flagged as a df3 forward concern). Non-blocking for a skeleton.

### Own observations (≥5, adversarial read)
- [VERIFIED] Write-side offsets exactly in-bounds when fb is logical-sized: last write = `(width*height-1)*4+3` = `out.length-1` — `render.ts:64-79`. Corroborated by security.
- [VERIFIED] Colours-by-index on the *pixel* path: every pixel goes through `indexToRgba(fb.data[…])` — `render.ts:68`. (The *ground* fill does not — that is F-A.)
- [VERIFIED] Core purity: `framebuffer.ts` names no clock/canvas/entropy/shell import; armed sweep green — `framebuffer.ts:1-32` + purity.test.ts run.
- [VERIFIED] Board numbers live in the shell, core takes dims as args — `render.ts:21,23` vs `framebuffer.ts:25`. Rule-checker #31 concurs.
- [DOWNGRADED] I earlier "verified the #21 degenerate-canvas guard is real." Rule-checker's mutation probe refutes that for the *guard* (F-C). Corrected: the production delegation is correct, the guard does not prove it. Honoring the challenge-your-VERIFIEDs rule with the specialist's evidence.
- [LOW] `main.ts` sizes the canvas to raw `clientWidth` without DPR (`@shared/view resizeToDisplay`/`MAX_DPR`), so the integer-scale blit is still browser-upscaled on HiDPI. Non-blocking; polish for df2-6/df7.
- [LOW-latent] `render()` assumes `fb` is exactly 292×240; a smaller fb silently black-fills OOB reads rather than asserting. Latent (main always full-size). Consider a one-line contract note when F-A is fixed.

### Devil's Advocate
Argue the code is broken. First, the render loop trusts that `fb` matches
`LOGICAL_WIDTH×LOGICAL_HEIGHT`; nothing enforces it. A future df2-3 author who blits a
sub-region framebuffer (say a 224-wide HUD strip) into `render()` gets a silently
sheared, black-filled image — no throw, no test failure, because the OOB typed-array
read returns `undefined` and `indexToRgba(undefined)` coerces to index 0. The seam
that df3+ builds on has an unstated invariant. Second, the "static still" is repainted
in full every animation frame: a 5.7M-iteration `ImageData` expansion at scale 9,
sixty times a second, for pixels that never change — on a low-end machine mounting
`/defender/` this is a measurable idle burn, and nothing caps the allocation to the
display. Third, and most concretely, the story's marquee claim — "degenerate canvas is
safe" — is *not actually tested*: the mock accepts `createImageData(0,0)` that the real
browser rejects, so a maintainer who "optimizes away" the clamp gets a green suite and
a game that throws on first paint before layout settles (the 0×0 mount is the real
startup state, not a hypothetical). Fourth, the module header proclaims a fidelity
discipline ("colours are never invented") that the very next executable line breaks —
so a reader greps the comment, trusts it, and copies the `#000000` shortcut into df2-3,
and now the "denylist scan" the epic promised has two literals to miss. Each of these
is cheap to close now and expensive to retrofit once three stories sit on top. That is
why this is a rework, not a nit.

**Handoff:** Back to TEA (Han Solo) for red rework — F-C strengthens the guard (test
change, TEA's domain) and can add a joust-style colour-literal scan that locks F-A;
then Dev (Yoda) greens it with the `indexToRgba(0)` ground fill and the comment fixes.

## Dev Assessment (rework round 1)

**GREEN. Reviewer findings addressed — 187/187 defender tests pass, `tsc` clean,
`defender` builds. One-line code change, as scoped.**

Reviewer finding disposition:

| Finding | Disposition |
|---------|-------------|
| **F-A [HIGH]** `#000000` ground fill violates AC3 + "colours never invented"; false comment | **FIXED.** `render.ts` now resolves the ground through `indexToRgba(BACKGROUND_INDEX=0)` emitted as `rgb(...)` (joust `colours[0]` precedent). No hex literal remains (`grep` clean); the module comment (`render.ts:11`) is now true. TEA's denylist scan greens. Pixel is unchanged (black). |
| **F-C [MEDIUM]** 0×0 guard mutation-toothless | **FIXED by TEA in rework RED** (strengthened to assert scale-1 dims + mock `createImageData` throws on 0); stays green against this correct code. No Dev action needed beyond keeping the delegation to `fitIntegerScale` (unchanged). |
| **F-D [LOW]** overstated test comment | **FIXED by TEA** (header corrected in the rework RED commit). |
| **F-B [LOW]** docs backtick-cite MAME | **NOT in this rework** (planning-doc prose, no code/test impact) — carried in Delivery Findings for a doc sweep. |
| Improvement: per-frame realloc / no-DPR | **Deferred** to df3 / polish (forward concern) — in Delivery Findings. |
| Improvement: assert `fb` size contract | **Deferred** — in Delivery Findings. |

**Change:** `plugins/defender/src/shell/render.ts` only — added `BACKGROUND_INDEX = 0`
and changed the ground fill from the `#000000` literal to a palette-resolved `rgb(...)`.
No core change, no behaviour change (the frame is still black), no new dependency.

## Subagent Results

Round 2 (re-review of the rework, round-trip 1). Same four enabled specialists re-run,
scoped to the rework diff `9a6a22c7..HEAD`.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 187/187 green, lint pass, hex literals 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — 0×0 edge re-mutated by Reviewer + rule-checker |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no new error paths in the 1-line fix |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — test hardening verified by rule-checker (#15/#18/#21) |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 new (low) + F-B deferred | F-A confirmed CLOSED; 1 new low citation nit confirmed; F-B deferred |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — rule-checker #1/#2 clean on the rework |
| 7 | reviewer-security | Yes | clean | none | N/A — no injection in `rgb()`, test read benign, no bounds change |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 new (low) | F-A + F-C mutation-proven CLOSED; 2 new low doc nits confirmed |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** F-A CLOSED, F-C CLOSED (both mutation-proven); 2 new LOW non-blocking (docstring/citation) + F-B (docs, deferred). 0 blocking.

## Reviewer Assessment

**Verdict:** APPROVED

Round-1's two blocking findings are **CLOSED and independently mutation-proven** — by
me directly (per the df-epic re-mutation precedent) and again by rule-checker in an
isolated `git worktree`:

- **F-A (colour literal) — CLOSED.** `render.ts` ground fill is now
  `indexToRgba(BACKGROUND_INDEX)` → `rgb(...)`; `grep` finds no hex literal, the
  denylist scan greens, and reintroducing `#000000` reddens it (rule-checker probe).
  The `render.ts:11` "colours are never invented" comment is now true.
- **F-C (toothless 0×0 guard) — CLOSED.** My own probe: removing `fitIntegerScale`'s
  `Math.max(1,…)` clamp now **reds** the 0×0 test ("still renders at scale 1"), where
  it stayed green in round 1. Rule-checker reproduced the same red in a worktree. The
  guard now enforces the clamp contract (scale-1 `ImageData` dims + mock
  `createImageData` throws on 0), not mere finiteness.
- **F-D** comment overstatement corrected. **Security** re-review clean (the `rgb()`
  template is masked-integer only; the test's `readFileSync` is a fixed self-path).
- **No fix-introduced regression** (lang-review #13): `rgb(${bg.r} ${bg.g} ${bg.b})`
  is valid CSS Color-4; lint + 187/187 green.

### Residual findings — all LOW / non-blocking (deferred, not bounced)
Bouncing a 3-pt skeleton to a second rework round for these would be disproportionate;
recorded as delivery findings for a df2-2 touch-up (df2-2 reworks this exact file).

| Severity | Issue | Location | Note |
|----------|-------|----------|------|
| [LOW] [DOC][RULE] | `render()` docstring still says "on a black ground" — the fix retired hardcoded-black everywhere else; not false today (index 0 is black) but goes stale when df2-2 gives index 0 a colour (lang-review #24). | `render.ts:50` | Fix to "on the palette's background colour" — natural to fold into df2-2. |
| [LOW] [DOC] | Test comment cites `joust/src/main.ts:614,647`; `:647` is the comment line, the second `colours[0]` fill is `:649` (lang-review #17). | `render.test.ts:23` | Off by 2; joust file untouched. Correct to `:614,649`. |
| [LOW] [DOC] | df2 planning docs backtick-cite `williams.cpp` against their own "never backtick" rule (F-B, round 1). | `context-epic-df2.md`, `context-story-df2-1.md`, `…design.md` | Docs-only; a doc sweep. |
| [INFO] | Denylist regex `/#[0-9a-fA-F]{3,8}\b/` could false-positive on a JS private field like `#face` IF render.ts is ever made a class (none today). | `render.test.ts:227` | Note for a future author; no instance exists. |

### Tag coverage (all eight dispatch domains)
- **[DOC]** — comment-analyzer + rule-checker: F-A comment now true (closed); 2 new low doc nits. Confirmed.
- **[RULE]** — rule-checker: F-A + F-C mutation-proven closed; #24 docstring + #17 citation (low). Confirmed.
- **[SEC]** — security: clean; no injection/bounds regression. Verified.
- **[TEST]** — disabled; covered by rule-checker (#15/#18/#21) + my probe: the hardened guards have teeth (mutation-proven).
- **[EDGE]** — disabled; the 0×0 edge is the story's edge and is now genuinely enforced (re-mutated red).
- **[SILENT]** — disabled; no new silent path (the fix is one `fillStyle` line; still no throw swallowed).
- **[TYPE]** — disabled; rule-checker #1/#2: `imageDims(): [number,number]|null` precise, no `as any`. Clean.
- **[SIMPLE]** — disabled; the fix reduces invented state (one literal → one shared index). No new complexity.

### Verification I ran myself
- [VERIFIED] F-C closed by my own in-tree mutation probe: unclamped render → 0×0 test
  RED (1 failed); `render.ts` restored via `git checkout`, tree clean. Evidence in the
  turn's probe output.
- [VERIFIED] F-A closed: `grep -nE "#[0-9a-fA-F]{3,8}" render.ts` → none; ground via
  `indexToRgba(BACKGROUND_INDEX)`; 187/187 green.
- [VERIFIED] Both closures independently reproduced by rule-checker in a worktree
  (clamp-removed → red; reinstated-hex → red) — the two-witness re-mutation the df1-3
  precedent asks for.

**Data flow traced:** canvas size → `fitIntegerScale` (clamped) → `ImageData` dims →
`putImageData`; degenerate 0×0 stays scale-1 (proven). Palette index → `indexToRgba`
→ every colour incl. the ground. Safe.
**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (code review)
- **Gap** (blocking): the ground fill invents a colour literal instead of resolving the background through the palette, violating AC3 + the epic "colours are never invented" rule while the module comment claims compliance. Affects `plugins/defender/src/shell/render.ts` (`render.ts:61` → fill via `indexToRgba(0)`; correct `render.ts:11` comment scope). *Found by Reviewer during code review.*
- **Gap** (blocking): the 0×0-canvas guard is mutation-proven not to enforce the clamp it advertises. Affects `plugins/defender/tests/render.test.ts` (assert scale-1 dimensions on a 0×0 canvas, not just finiteness). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `render()` rebuilds the full scaled `ImageData` every rAF frame for a static frame, and sizes the canvas without DPR — revisit when df3 makes this a live per-frame path (cached atlas / `drawImage` scale, `resizeToDisplay`/`MAX_DPR`). Affects `plugins/defender/src/shell/render.ts`, `plugins/defender/src/main.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): consider asserting `render()`'s `fb` matches `LOGICAL_WIDTH×LOGICAL_HEIGHT` (a smaller fb silently black-fills OOB reads). Affects `plugins/defender/src/shell/render.ts`. *Found by Reviewer during code review.*
- **Gap** (non-blocking): df2 planning docs backtick-cite MAME against their own "never backtick-cite MAME" rule. Affects `sprint/context/context-epic-df2.md`, `sprint/context/context-story-df2-1.md`, `docs/superpowers/specs/2026-08-14-defender-df2-framebuffer-transcription-design.md`. *Found by Reviewer during code review.*

### Reviewer (re-review round 2)
- **Gap** (non-blocking): `render()`'s docstring still says "on a black ground" — the ground-colour retirement (rework F-A) was applied at the fill site but not this docstring two lines above; not false today (index 0 is black) but goes stale when df2-2 colours index 0 (lang-review #24). Affects `plugins/defender/src/shell/render.ts:50` (→ "on the palette's background colour"). Natural to fold into df2-2. *Found by Reviewer during re-review.*
- **Gap** (non-blocking): test comment cites `plugins/joust/src/main.ts:614,647`; `:647` is the comment above the second `colours[0]` fill, which is at `:649` (lang-review #17). Affects `plugins/defender/tests/render.test.ts:23` (→ `:614,649`). *Found by Reviewer during re-review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Reviewer (audit)
Dev logged "no deviations." One UNDOCUMENTED deviation found:
- **Ground fill uses an invented colour literal:** Spec said (AC3 / epic rule) every
  colour is reached by index through `indexToRgba`, "no colour literals scattered
  elsewhere in the file." Code does `ctx.fillStyle = '#000000'` (`render.ts:61`) and
  the module comment (`render.ts:11`) claims the opposite discipline is followed.
  → ✗ FLAGGED by Reviewer: severity HIGH, see F-A. Fix via `indexToRgba(0)` (joust
  `colours[0]` precedent, `plugins/joust/src/main.ts:614`).
  → ✓ RESOLVED (rework r1, commit 174b9420): ground fill now
  `indexToRgba(BACKGROUND_INDEX)`; no hex literal remains, comment is now true,
  denylist scan greens and reddens on reintroduction (mutation-proven, round 2).