---
story_id: "ml13-3"
jira_key: "ml13-3"
epic: "ml13"
workflow: "trivial"
---
# Story ml13-3: Live /millipede/ playtest: confirm a deployed DDT visibly kills train segments with no full-screen strobe (ml12-3 AC3)

## Story Details
- **ID:** ml13-3
- **Jira Key:** ml13-3
- **Workflow:** trivial
- **Repos:** arcade
- **Branch:** feat/ml13-3-millipede-ddt-kill-live-playtest
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-08-18T11:09:19Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T10:46:19Z | 2026-08-18T10:48:26Z | 2m 7s |
| implement | 2026-08-18T10:48:26Z | 2026-08-18T11:02:54Z | 14m 28s |
| review | 2026-08-18T11:02:54Z | 2026-08-18T11:09:19Z | 6m 25s |
| finish | 2026-08-18T11:09:19Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **Improvement / non-blocking — `window.__sim` field-injection is not a faithful proxy for a DDT cloud kill.** During this playtest I tried to trigger the `sim.ts:303` `inDdtCloud` segment-kill dispatch synthetically by writing CLOUD stamps (`0x2e`) straight into the live `state.field` (even flooding the entire 960-cell field). It killed **zero** segments across multiple frames, even with a segment confirmed sitting on a clouded cell at its own `obstacOffset`. The real kill path evidently depends on more than a static cloud byte in a cell — most plausibly the `ddtExplosionStep` cloud lifecycle (`FRAME & 7` gating, MILLI.MAC:1611-1614) and the segment's *post-march* cell alignment that only a real shot-triggered explosion produces. This is a limitation of the injection proxy, NOT a game defect: the owner's live playtest (below) confirms the mechanic works. Worth knowing for any future automated millipede DDT-kill harness — drive a real DDT to explode rather than stamping clouds.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- No deviations from spec. This is a live-playtest verification chore; no gameplay or code was changed. Observation method deviated from a fully-automated capture (see Delivery Findings): millipede movement is trackball/pointer-lock only, so the authoritative live-kill observation was performed by the owner in real play rather than by browser automation.

## SM Assessment

**Setup complete — routing to Dev (implement phase, trivial workflow).**

This is a **title-only story** (description and acceptance_criteria were both `null` in `sprint/epic-ml13.yaml`), so the title is the spec and the ACs were derived from the measured premise, not invented. Verified before setup:

- **Premise (from `sprint/epic-ml13.yaml` epic description, follow-up #3):** ml12-3's AC3 live playtest "was never performed (the kill is unit-proven via the real-explosion test and strobe-safe by construction, but not observed live)." Siblings ml13-1 (mushroom on kill) and ml13-2 (head/body split scoring) are both DONE.
- **Exact criterion being closed** — ml12-3 AC3, verbatim from `sprint/context/context-story-ml12-3.md:29`: "Verified LIVE at the /millipede/ visual playtest: deploying DDT visibly kills train segments in its blast, with no full-screen strobe/flash introduced (ml7-4 owner-epilepsy accessibility gate)."

**This story adds NO new gameplay or code.** The DDT segment-kill mechanic shipped in ml12-3 (core/ddt.ts + core/sim.ts + core/millipede.ts). ml13-3 is a live-observation chore: watch a deployed DDT kill train segments at `/millipede/`, confirm no full-screen strobe, and record the evidence in this session.

**Operational notes for Dev:**
- It is a VISUAL/live playtest. Millipede input uses pointer-lock; a HUMAN smoke may be required (centipede/millipede bootstrap precedent). The implementer chooses the observation method (browser automation vs. asking the owner).
- **Port-trust caveat:** 5270 can be answered by a sibling checkout. Sibling **a-3** currently has a live mc12-5 session. Before trusting any screenshot, probe whose working tree owns 5270 (`lsof` cwd) or serve on an alternate port.

**Sibling probes at setup:** clean — no `feat/ml13-3` branch existed before mine; only ml13-1/ml13-2 completed branches and a-3's mc12-5 session. Claim branch `feat/ml13-3-millipede-ddt-kill-live-playtest` pushed, story stamped `in_progress`.

## Dev Assessment

**Outcome: ml12-3 AC3 CONFIRMED live. No code changed (verification-only chore).**

Both halves of ml12-3 AC3 are satisfied with evidence:

**AC1 — a deployed DDT visibly kills train segments in its blast (live):** ✅ **Confirmed by the owner's live playtest** at `/millipede/` on 2026-08-18. The owner drove the segment train into an exploding DDT and observed the whole train die as expected. For an owner-playtest epic this owner observation is the authoritative evidence, and it is the exact scenario ml12-3 AC3 called for.

**AC2 — no full-screen strobe/flash introduced (ml7-4 owner-epilepsy gate):** ✅ **Verified in code.** `plugins/millipede/src/shell/render.ts` and `plugins/millipede/src/shell/playfield-palette.ts` contain no full-screen flash: the background is a constant black (`BACKGROUND_COLOUR = 0xFF` → black), the only full-width `fillRect` is the static bottom green player-area band (`drawPlayerAreaBand`, render.ts:49), and nothing in render or palette branches on `ddtExploding`/`anyDdtExploding`. A DDT explosion draws only localised cloud/glyph stamps. There is therefore no full-screen strobe effect that a DDT kill could introduce — strobe-safe by construction, now checked, not assumed.

**AC3 — observation recorded:** ✅ this assessment, plus the Delivery Finding on the injection-proxy limitation.

**Method note (honesty):** I served this checkout's tree on port 5290 (5270 was held by another process, cwd `/`, not this checkout) and confirmed `/millipede/` served the real game (differed from the `/banana/` SPA-fallback control). Millipede booted and ran live (score/wave HUD, four deployed DDT bombs, the segment train, mushrooms, gun — screenshot captured during the session, not committed). My attempt to trigger the kill synthetically via `window.__sim` field-injection did **not** reproduce it (see Delivery Findings) — that proxy is unfaithful to the real explosion path, so its null result is inconclusive and is overridden by the owner's real-play confirmation.

**No commits:** verification-only; no gameplay/code/test changes. The claim commit (context + epic stamp) already landed on `feat/ml13-3-millipede-ddt-kill-live-playtest`.

## Reviewer Assessment

**Verdict: APPROVED.** ml12-3 AC3 is legitimately closed; ready for finish.

This is a verification-only trivial chore. The branch diff vs `develop` is **doc-only** — `sprint/context/context-story-ml13-3.md` and a one-line status stamp in `sprint/epic-ml13.yaml`; **no `.ts`/`.mjs`/`.js` touched** (confirmed by preflight and `git diff --name-only`). So there is no code diff for the adversarial battery to hunt. My review therefore targeted the two things that actually matter for this story: (a) the tree is not regressed, and (b) the AC claims are TRUE, not rubber-stamped.

**AC1 — DDT visibly kills train segments in live play:** ✅ Owner-confirmed live in this session (owner drove the train into an exploding DDT; the train died). For an owner-playtest epic that is the authoritative evidence. Independently corroborated by ml12-3's real-explosion unit test (the mechanic is proven twice: unit + live).

**AC2 — no full-screen strobe/flash introduced (ml7-4 gate):** ✅ **I independently verified this in the source, not on Dev's word.** Every per-frame full-canvas `fillRect` in `plugins/millipede/src/main.ts` (lines 198/237/244/336) is either a `#000` black clear (play/entry/letterbox) or the static showcase background (`SHOWCASE_BACKGROUND`); the only other full-width fill is the static bottom green player-area band. Nothing in `main.ts` render, `shell/render.ts`, or `shell/playfield-palette.ts` branches the background or palette on `ddtExploding`/`anyDdtExploding`, and the DDT segment-kill path (`sim.ts:303`) only removes segments, plants a mushroom (`musher`), and emits a `segment-killed` event — no render-flash flag. There is no full-screen strobe effect for a DDT kill to introduce.

**Non-blocking notes (routed, not fixing here):**
1. *Citation completeness (informational):* the Dev Assessment cited `render.ts`/`playfield-palette.ts` for the strobe proof, but the per-frame full-canvas fills actually live in `main.ts`. The conclusion is correct and now verified more completely; no change needed.
2. *Injection-proxy limitation (Delivery Finding, non-blocking):* Dev's synthetic `window.__sim` field-injection did not reproduce the kill. I concur this is a proxy-fidelity issue, not a game defect — the real explosion path is unit-proven and owner-confirmed. It is correctly logged as guidance for a future automated millipede DDT-kill harness (drive a real DDT to explode; don't stamp static cloud bytes). No follow-up story required.

### Specialist Dispositions (all 8 categories)

The branch diff is **doc-only** (markdown + one YAML status line) — no `.ts`/`.mjs`/`.js`, no tests, no types. The four enabled specialists (preflight, comment-analyzer, test-analyzer, rule-checker) were dispatched and reported; the five code-hunting specialists are disabled via `workflow.reviewer_subagents` on this project AND have no code surface to act on. Disposition per category:

- **[EDGE]** edge-hunter — No boundary/path findings. Disabled via settings; also N/A — zero code paths in a doc-only diff.
- **[SILENT]** silent-failure-hunter — No swallowed-error findings. Disabled via settings; also N/A — no code.
- **[TEST]** test-analyzer — N/A, no test surface. No `.ts`/test files changed; the millipede suite is green and unchanged (preflight 1488/1488); ml12-3's real-explosion kill test already covers the mechanic this story visually confirms. Nothing to flag.
- **[DOC]** comment-analyzer — Clean, 0 findings. Context-file claims (AC3 wording, ml7-4 gate, ml12-3 framing, ml13-1/ml13-2 completion) all verify against source; status stamp is mechanical.
- **[TYPE]** type-design — No type findings. Disabled via settings; also N/A — no TypeScript types/APIs in the diff.
- **[SEC]** security — No security concerns. Disabled via settings; also N/A — doc/bookkeeping only; no auth/input/secret surface.
- **[SIMPLE]** simplifier — No complexity findings. Disabled via settings; also N/A — no code to simplify.
- **[RULE]** rule-checker — N/A, no code surface. Markdown + one YAML line; no types/functions/fields to check against lang-review rules. Repo-wide `tsc --noEmit` clean (preflight, 0 errors).

### Rule Compliance

Language: TypeScript (`gates/lang-review/typescript`). The change set contains **no TypeScript** — only `sprint/context/context-story-ml13-3.md` (markdown) and a one-line `status`/`started` stamp in `sprint/epic-ml13.yaml`. Every numbered lang-review rule is therefore **vacuously satisfied — 0 applicable instances**, because there is no code, type, function, or field in the diff to which any rule applies:

1. Validated constructors / no unchecked casts — 0 instances (no constructors or casts in diff).
2. No `any` / no non-null `!` abuse — 0 instances (no TS).
3. Exhaustive switches / discriminated unions — 0 instances (no TS).
4. Error handling (no swallowed errors) — 0 instances (no code).
5. Core/shell purity + sim-clock-free boundary — 0 instances (no `src/core` change); pre-existing millipede purity guard remains green.
6. Naming / public-API docs — 0 instances (no exported symbols changed).

The pre-existing millipede core-boundary/purity guards and the full suite remain green and unchanged (preflight: millipede 1488/1488, orchestrator 505/505, lint 0 errors). No rule violations; none possible in this diff.

## Subagent Results

| # | Subagent | Received | Decision | Notes |
|---|----------|----------|----------|-------|
| 1 | reviewer-preflight | Yes | N/A (clean) | lint 0 errors; millipede 1488/1488 pass (95 files); orchestrator 505/505; 0 code files touched — tree GREEN, identical to develop |
| 2 | reviewer-edge-hunter | Skipped (disabled) | N/A | Disabled via settings; no code paths in a doc-only diff |
| 3 | reviewer-silent-failure-hunter | Skipped (disabled) | N/A | Disabled via settings; no code |
| 4 | reviewer-test-analyzer | Yes | N/A (clean) | No test surface — no `.ts`/test files changed; suite green & unchanged |
| 5 | reviewer-comment-analyzer | Yes | N/A (clean) | Context-file claims all verify against source; status stamp mechanical |
| 6 | reviewer-type-design | Skipped (disabled) | N/A | Disabled via settings; no TS types/APIs in diff |
| 7 | reviewer-security | Skipped (disabled) | N/A | Disabled via settings; no auth/input/secret surface |
| 8 | reviewer-simplifier | Skipped (disabled) | N/A | Disabled via settings; no code to simplify |
| 9 | reviewer-rule-checker | Yes | N/A (clean) | No code surface; lang-review rules vacuously satisfied; tsc clean |

**All received: Yes** — 4 enabled specialists (preflight, test-analyzer, comment-analyzer, rule-checker) dispatched and reported; the 5 code-hunting specialists are disabled via `workflow.reviewer_subagents` and N/A on a doc-only diff.

**Rounds:** 1. No Critical or High. APPROVED.

## Impact Summary

**Blocking findings: 0.** Verification-only trivial chore; ml12-3 AC3 closed with evidence.

**Acceptance criteria — all satisfied:**
1. ✅ Live kill observed — owner-confirmed at `/millipede/` (2026-08-18): the train was driven into an exploding DDT and the whole train died.
2. ✅ No full-screen strobe (ml7-4 gate) — verified in source; no render/palette path branches on `ddtExploding`, every full-canvas fill is a static clear/background.
3. ✅ Evidence recorded — this session (Dev + Reviewer assessments).

**Corroboration:** mechanic proven twice — ml12-3's real-explosion unit test + owner live playtest.

**Non-blocking guidance (1, routed, no follow-up story):** the `window.__sim` field-injection proxy did not reproduce the kill (see Delivery Findings) — a proxy-fidelity limitation, not a defect. Guidance for any future automated millipede DDT-kill harness: drive a real DDT to explode rather than stamping static cloud bytes.

**Ship facts:** doc-only diff (no code/test/config); feat PR #535 merged to develop (2026-08-18T11:10:48Z); tree green (millipede 1488/1488, orchestrator 505/505, lint 0).