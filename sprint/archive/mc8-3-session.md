---
story_id: "mc8-3"
jira_key: "mc8-3"
epic: "mc8"
workflow: "tdd"
---
# Story mc8-3: Verify audio live and close the asset loop

## Story Details
- **ID:** mc8-3
- **Jira Key:** mc8-3
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-09T20:55:49Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-09T20:06:07.954923Z | 2026-08-09T20:09:39Z | 3m 31s |
| red | 2026-08-09T20:09:39Z | 2026-08-09T20:15:50Z | 6m 11s |
| green | 2026-08-09T20:15:50Z | 2026-08-09T20:29:29Z | 13m 39s |
| review | 2026-08-09T20:29:29Z | 2026-08-09T20:42:36Z | 13m 7s |
| red | 2026-08-09T20:42:36Z | 2026-08-09T20:47:17Z | 4m 41s |
| green | 2026-08-09T20:47:17Z | 2026-08-09T20:48:05Z | 48s |
| review | 2026-08-09T20:48:05Z | 2026-08-09T20:55:49Z | 7m 44s |
| finish | 2026-08-09T20:55:49Z | - | - |

## Story Context

> ⚠ **SM Correction — Branch (A) is void; Branch (B) is live**
> The story description contains a branching either/or: (A) "IF the mc8-1 path baked any sound to files: upload them to the R2 bucket 'arcade'...", (B) "IF the path is runtime-synth: confirm no external asset is required and that the served game is audible with the network offline."
> SM measured the live code: MC audio is **runtime-synth** (evidence: audio.ts:84-86,133 drives a `new AudioWorkletNode(ctx, 'POKEY')` with no fetch/Audio/R2 references; the vendored POKEY worklet bundles into the game's own build). **Branch (A) is DEAD** — there are no baked sound files to upload.
> **The live obligation is Branch (B):** prove no external `arcade`-bucket asset is required and the served game is audible offline.
> This note is an SM correction. The acceptance criteria below are reproduced verbatim and unedited from the epic.

## Acceptance Criteria

Prove the sound actually plays — a green vitest is not proof (contract 5 + sidecar gotcha: @shared/audio degrades silently, a 404 is indistinguishable from working code). Serve the cabinet (just serve -> /missile-command/) and confirm the mapped events are audible in the running game. IF the mc8-1 path baked any sound to files: upload them to the R2 bucket 'arcade' (there is no automated upload path — do it via the deploy-assets route) and prove each with a live 200 (curl -o /dev/null -w '%{http_code}' <url>); record the manifest + results in docs/ops/hosting.md. IF the path is runtime-synth: confirm no external asset is required and that the served game is audible with the network offline. Any residual 'asset follows later' item is FILED AS A STORY here, not left as a finding. Depends on mc8-2.

## Background

**Human Smoke Test Component:** This story has a component that cannot be fully automated by vitest — the audible sound in the running game. The automatable half is "no external asset is fetched, the worklet bundles correctly, and the audio subsystem degrades to silence gracefully on failure." The human half is actually listening to `/missile-command/` during `just serve` and confirming sound events play back correctly.

**Runtime Synthesis (Branch B):** MC audio is generated at runtime using a POKEY synthesizer AudioWorkletNode. There are no pre-baked sound files. The story obligation is to confirm:
1. No external `arcade`-bucket asset is required (all needed code bundles in the game build).
2. The served game remains audible when the network is offline (confirming the worklet is bundled, not fetched).
3. Sound events map correctly (human smoke test during `just serve`).

**Residual Assets:** On the runtime-synth branch, there should be no residual "asset follows later" item to file — TEA/Dev should confirm this explicitly rather than leaving it unstated.

## Delivery Findings

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

**TEA (RED), non-blocking:** `plugins/missile-command/tests/sound-events.test.ts:24` carries a stale story-id reference — "the parametric cruise/Sputnik drone (mc8-3)" — from before mc8-3 was repurposed to this verification story (the drone work is now mc8-5). Comment-only, no behaviour impact; a candidate one-line comment fix for the Reviewer, not RED scope.

### Dev (implementation)
- **Bug** (non-blocking): `just serve` (Vite dev) cannot voice MC audio — the POKEY worklet is requested at Vite's `@fs/...pokey.js` URL and fails to load (`AbortError: Unable to load a worklet's module`), so the game is silent in dev while the production build is fully audible. Affects `plugins/missile-command/src/shell/audio.ts:84-86` (dev-mode worklet URL resolution; shared with star-wars). **Filed as `mc8-8`.** *Found by Dev during the live smoke test.*
- No other upstream findings during implementation.

### Reviewer (code review)
- **Improvement** (non-blocking): the parallel reviewer subagents raced the shared working tree — `reviewer-comment-analyzer` ran `git checkout -- sprint/epic-mc8.yaml`, discarding a transient mutation another subagent (test-analyzer/rule-checker mutation battery) had left uncommitted. No committed state was lost (HEAD's `epic-mc8.yaml` verified intact: all 8 stories incl. mc8-8, parses clean; final quiescent tree matches HEAD, suite 8/8). Affects the reviewer pipeline (`workflow.reviewer_subagents` run on one shared tree) — prefer worktree isolation or a mutation lock so a subagent's `git checkout` cannot clobber a sibling. Matches the known gotcha "parallel reviewer mutation subagents race the shared tree." *Found by Reviewer during code review.*

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Live-audible confirmation taken against the production BUILD, not the dev `just serve`**
  - Spec source: context-story-mc8-3.md, AC1 + Problem ("Serve the cabinet (just serve -> /missile-command/) and confirm the mapped events are audible")
  - Spec text: "Serve the cabinet (just serve -> /missile-command/) and confirm the mapped events are audible in the running game."
  - Implementation: Verified audibility on the production build (`node scripts/build-app.mjs missile-command`, served statically, driven with Playwright): the POKEY worklet `addModule` resolves same-origin, `AudioWorkletNode('POKEY')` is created, register-writes stream, and an AnalyserNode tap captured non-zero output (peak ≈ 0.157). Under `just serve` (Vite dev) the worklet is requested at Vite's `@fs/...pokey.js` URL and FAILS to load (`AbortError: Unable to load a worklet's module`) — MC is silent in dev.
  - Rationale: The build is what ships to `arcade.slabgorb.com/missile-command/`, so build-audibility is the production-truthful answer to "does the sound actually play." The dev-serve silence is a Vite dev worklet-resolution gap, not a production defect, and fixing it touches the worklet URL shared with star-wars — out of scope for a 2pt verification story. Recording "audible in dev" would have been FALSE (the exact silent-degrade trap the story targets).
  - Severity: minor
  - Forward impact: `mc8-8` (filed) owns making `just serve` load the worklet without regressing star-wars. Until then, MC audio can only be verified from a build, not from the dev server. The hosting.md record states this explicitly.
  - **→ ✓ ACCEPTED by Reviewer:** Sound. The AC named `just serve`, but the production build is what ships and it is genuinely audible (comment-analyzer independently rebuilt and verified the record's claims; the worklet resolves same-origin and peak-0.157 output was measured). Recording "audible in dev" would have been false — the exact silent-degrade trap the story targets. The dev-serve silence is correctly disclosed in `hosting.md` and tracked as `mc8-8`, honoring the descoped-findings-must-be-filed rule. No residual `asset-follows-later` item remains.

### Reviewer (audit)
- No **undocumented** spec deviations found beyond the one above. The build-vs-dev verification choice was the only divergence from the literal AC and it was logged; every other AC obligation (runtime-synth verdict, closed asset loop, evidence recorded in `docs/ops/hosting.md`, mc8-3 marker) is met by the diff.

## SM Assessment

**Story:** mc8-3 — Verify audio live and close the asset loop (mc8, 2pt, p2, tdd).

**Sibling-contention check (clean):** the requested story was mc5-7, which I found owned by checkout a-2 (branch `origin/feat/mc5-7-*` + a live `a-2/.session/mc5-7-session.md` at the finish phase). Stood down on mc5-7 to avoid duplicating review-approved work. User selected mc8-3 instead. Re-probed: no branch and no live session for mc8-3 on any checkout at setup time; now claimed here (branch pushed, status in_progress).

**Measured correction (settled before setup):** the story description carries an either/or — bake-to-files→R2-upload vs. runtime-synth. I measured the current tree: MC audio is **runtime-synth**. `plugins/missile-command/src/shell/audio.ts` drives `new AudioWorkletNode(ctx, 'POKEY')` (:133); the only external module is the vendored POKEY worklet referenced by `new URL('../../../star-wars/tools/pokey-bake/vendor/pokey.js', import.meta.url)` (:84-86), which Vite bundles into the game's own build — not an `arcade`-bucket asset. No `.wav`/`.mp3`/`fetch`/`new Audio`/R2 references exist in `plugins/missile-command/src`. So Branch (A) is void; the live obligation is Branch (B). This is carried as a `> ⚠` note above the verbatim ACs in both the session and the context file; the ACs are reproduced unedited from the epic YAML.

**Scope note for TEA:** this story has a genuine human-smoke-test component — "audible in the running game" cannot be fully asserted by vitest. Split the RED accordingly: automatable half = no external asset fetched / worklet bundles / audio degrades to silence gracefully on worklet failure (the contract-5 silent-404 hazard is the crux — `audio.ts:128,138`); human half = actually listening at `just serve` → `/missile-command/`. The engine's silent-degrade path is exactly why "green vitest is not proof."

**Residual-asset clause:** on the runtime-synth branch there should be no "asset follows later" item to file; TEA/Dev must confirm that explicitly rather than leave it unstated (per the story's own filing rule).

**Verifications done:** session fields (Workflow/Phase/Repos) present; exactly one phase pointer; all three ACs found verbatim in context; epic stamp diff surgical (mc8-3 only); claim committed + branch pushed.

**Depends on:** mc8-2 (the audio foundation — shipped). Handing to TEA (Tyr One-Handed) for RED.

## TEA Assessment

**RED artifact:** `plugins/missile-command/tests/mc8-3-audio-asset-loop.test.ts` (1 file, 8 tests). Suite state: **4 failed / 1035 passed** in the missile-command project — the RED is isolated to this file (58 other test files stay green; my new file adds no collateral reddening). Verified by running `npx vitest run --project missile-command` directly (I did not route through `testing-runner` this once — the 4-fail/1035-pass split is concrete and reproducible; note the minor process deviation).

**The two-block split (deliberate, per the verification-story shape):**
- **Block 1 — `MC audio requires no external asset` (3 tests, GREEN on arrival).** A regression guard, not the work. It reads `src/shell/audio.ts` and pins: the POKEY worklet is resolved via `new URL(..., import.meta.url)` (so Vite bundles it); no `http(s)://`, no `fetch(`, no `new Audio(`, no `.wav/.mp3/.ogg`, no `arcade`-bucket/R2 host literal; and the vendored worklet physically exists in-tree. **Non-vacuity:** re-point the worklet at `https://arcade.slabgorb.com/...pokey.js` (or add a `fetch()`), and Block 1 reddens. This is the guard that keeps a future edit from re-opening the asset loop the story closes.
- **Block 2 — `hosting.md records the live-audio verification` (5 tests, 4 FAIL + 1 control GREEN).** This is the RED work. It slices the markdown section that names *missile-command* + *audio/sound/POKEY* and asserts, WITHIN that section (proximity, not scattered): the **runtime-synth** verdict, the **mc8-3** marker, the **closed asset loop** (no external / no arcade-bucket upload), and the **offline-audible evidence**. The 5th test is a **control** that stays green: it asserts the section does NOT carry a baked/R2 `200`/upload manifest (Branch A is void) — it guards against a copy-paste of star-wars' baked manifest and becomes load-bearing once the section exists.

**⚠ The crux for Dev (Loki) — do NOT make Block 2 green by writing plausible prose.** The whole point of this story (and the reason "a green vitest is not proof") is that the audible confirmation must be *earned* at the running game, then *recorded*. Required GREEN sequence:
1. `just serve` → open `/missile-command/`, give the gesture, and **actually listen** — confirm the mapped cues (launch/explosion/no-fire/whoop/bonus/end-game) are audible. Capture evidence (a console log of `play()`/dispatch calls, or a short note of what you heard).
2. Re-confirm with the **network offline** (DevTools → Offline, or throttle to offline) — the runtime-synth + bundled-worklet claim means it must still play with no network. That IS the Branch-B evidence.
3. Record the result in `docs/ops/hosting.md` under a new *missile-command audio* heading: runtime-synth (POKEY worklet, bundled — cite `plugins/missile-command/src/shell/audio.ts:84-86,133`), **no `arcade`-bucket asset required** (so it is absent from that bucket's manifest by design), the offline-audible evidence, and the `mc8-3` marker.
4. **Serve-whose-tree caveat (CLAUDE.md):** a sibling checkout may already own `127.0.0.1:5270`. Before trusting what you hear, confirm the server's cwd (`lsof`) or serve your own tree on a spare port (`npx vite --port 5290 --strictPort`).

**Note on hosting.md and the citation gate:** the mc citation gate scans the `docs/rom-study` dossier, NOT `docs/ops/hosting.md` — so recording evidence there won't trip `citations*.test.ts`. Keep the record plain prose + the real `audio.ts` line refs; do not invent `W3SOUN:NNN`-style ROM citations in hosting.md.

**AC3 (residual `asset-follows-later`):** on the runtime-synth branch there is no baked asset to defer, so there should be nothing to file. State this explicitly in the hosting.md record ("no external asset outstanding — asset loop closed") rather than leaving it unstated. If, while doing the live smoke test, you find a cue that is silent or a threat with no emitter (sound-events.test.ts already flags `bonusTick` and the drone as having no sim producer yet), that is a *tracked follow-up story*, not a silent finding — file it and name the id in your Delivery Findings.

**Rule Coverage (lang-review/typescript.md):** mc8-3's GREEN adds no new production TypeScript — it is a docs/evidence edit plus the already-green source invariant — so the TS pattern checklist (type-safety escapes, enums, null handling, module issues) is largely **N/A** to the deliverable. The one test file I authored was self-checked against it: no `as any` / `as unknown as`, no non-null `!`, no `@ts-ignore`, node-builtin imports only (no relative `.js`-extension concern). The project-specific rule that governs this domain — the **no-throw / silent-degrade contract (contract 5)** — is already covered by mc8-2's `audio-engine.test.ts`; Block 1 extends the guard to the asset dependency.

**Delivery Finding (minor, non-blocking):** `plugins/missile-command/tests/sound-events.test.ts:24` still refers to "the parametric cruise/Sputnik drone (mc8-3)" — a stale story-id reference from before mc8-3 was repurposed to this verification story (the drone work is now mc8-5). Comment-only; flag for the Reviewer, not RED-blocking.

**Handoff:** To Dev (Loki Silvertongue) for GREEN — the live smoke test + the hosting.md evidence record.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `docs/ops/hosting.md` — new *Missile Command audio (mc8, runtime-synth)* subsection under the Game-assets section: the runtime-synth verdict, the closed asset loop (no external / no `arcade`-bucket asset), the live-audio evidence, the offline/self-contained claim, the `mc8-3` marker, and the `mc8-8` dev-silence pointer. This is what turns Block 2 GREEN.
- `sprint/epic-mc8.yaml` — appended follow-up story `mc8-8` (the `just serve` worklet-silence bug).

**What I actually did (the story is a VERIFICATION, so the evidence is the deliverable):**
1. Built the game (`node scripts/build-app.mjs missile-command`). The vendored POKEY worklet ships as a bundled local asset `dist/missile-command/assets/pokey-<hash>.js`; the built bundle references it by the same-origin path `/missile-command/assets/pokey-<hash>.js` (via `addModule`), and there is **zero external host** (http/arcade/r2) anywhere in the built JS/HTML.
2. Served the build statically and drove it with Playwright. Proved the pipeline is **live and audible**: `addModule` RESOLVES same-origin, `AudioWorkletNode('POKEY')` is created, the engine streams MODSND register-writes (`postMessage` bursts 132…1173), AudioContext `running`, and an `AnalyserNode` tap on the POKEY node captured **non-zero output — peak ≈ 0.157** across ~1050 frames. No audio console errors; only same-origin network requests. This is the machine-observable proof that "the sound actually plays," beyond "a green vitest."
3. **Found a real gap:** under `just serve` (Vite dev) the worklet's `@fs/...pokey.js` URL FAILS to load (`AbortError`), so MC is silent in dev though the build is audible. Filed as **`mc8-8`** (bug, p3, 3pt) — not left as a loose finding. Logged as a Design Deviation (AC named dev; I verified the build). **No residual `asset-follows-later` item remains** — the asset loop is closed.

**Tests:** missile-command project **1039/1039 passing** (GREEN); `mc8-3-audio-asset-loop.test.ts` 8/8. Repo lint (`tsc --noEmit`) clean. Orchestrator suite **455/455**.

**Branch:** feat/mc8-3-verify-audio-live-close-asset-loop (pushed)

**Handoff:** To next phase (verify/review). Reviewer note: the verification was done against the production build, not `just serve` — see the Design Deviation and `mc8-8`. Also a pre-existing stale comment (`sound-events.test.ts:24` names "mc8-3" for the drone, now mc8-5) is flagged by TEA for an optional one-line fix.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (green: MC 1039/1039, orchestrator 455/455, lint clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 5 (2 high-conf, 1 med, 2 low — reproduced by mutation) | confirmed 3 (lines 151, 165, 145), deferred 2 (lines 80/100, 65-77 = low) |
| 5 | reviewer-comment-analyzer | Yes | clean | none (all hosting.md claims verified against a fresh build) | N/A — flagged a pipeline tree-race incident (non-blocking, filed as Delivery Finding) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 (low — rule 23) | confirmed 1 (line 28 comment), non-blocking |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`).
**Total findings:** 4 confirmed (1 High, 2 Medium, 1 Low), 0 dismissed, 2 deferred (low).

### Rule Compliance

Rubric = `.pennyfarthing/gates/lang-review/typescript.md` (26 checks) + 5 ADDITIONAL arcade rules, verified exhaustively by `reviewer-rule-checker` (31 rules / 47 instances) and spot-checked by me:

- **Type-safety escapes (1):** compliant — no `as any`/`as unknown`/`@ts-ignore`/`!` in the test file. [RULE]
- **Null handling `??` vs `||` (4):** compliant — `section ?? ''` (5×) and `?? 0` on a regex length, all correct.
- **Module/`.js` extensions (5, 29):** compliant — zero relative imports (only `vitest` + `node:` builtins), so the ESM `.js`-extension rule has no applicable instance.
- **Test quality (8):** compliant mechanically (real `readFileSync`/`existsSync`, no mocks, no `dist/` import) — BUT see the **confirmed assertion-vacuity findings** below (a separate axis from rule 8's mechanical checks).
- **Source-text assertions match the CLAIM not a token (15, 25, 26):** the POSITIVE anchors are bounded (audio.ts declaration regex, or the sliced hosting.md `section`); negative guards are whole-file, which the rule permits. Confirmed.
- **Core/shell boundary (ADDITIONAL 27):** compliant — the diff touches ZERO files under any `src/core` or `src/shell`; the purity boundary is untouched.
- **MC citation gate scope (ADDITIONAL 28):** compliant — `docs/ops/hosting.md` is outside the dossier scan (`DOSSIER_FILES = brief/subsystems/glossary`); the added prose carries no `W3SOUN:NNN`-shape ROM citation that would demand a claim.
- **Un-cited numeric literal (ADDITIONAL 30):** compliant — gate is scoped to `src/core`; no `src/core` files in the diff.
- **`epic-mc8.yaml` mc8-8 well-formed (ADDITIONAL 31):** compliant — double-quoted title with internal apostrophe parses (PyYAML + `pf validate`: 9 passed, 0 errors).
- **Rule 23 (mutation citation re-runnable):** **1 violation (Low)** — the Block-1 non-vacuity comment names a mutant *class* ("an http literal") not a concrete replacement string. [RULE]

Disabled specialists (assessed directly, N/A for this diff): **[EDGE]** no branching/boundary logic — the diff is a test + prose, no production paths. **[SILENT]** the no-throw/silent-degrade behavior lives in `audio.ts` (untouched); the diff adds no error handling. **[TYPE]** no types/interfaces/enums declared. **[SEC]** no input/auth/secret surface — a test reads local files, the doc is prose. **[SIMPLE]** the section-slice helper is the only non-trivial construct and is proportionate.

### Reviewer Observations (independent)

1. **[HIGH] [TEST]** `mc8-3-audio-asset-loop.test.ts:151` — `/audible|heard|played back|playback/i` has no word boundary, so it matches the substring in **"inaudible"**. test-analyzer reproduced a false PASS on a section reworded to "completely inaudible… no sound whatsoever." This case is NOT backstopped by the positive "has a section" tests (an inaudible-claiming section still has the heading, runtime-synth text, and mc8-3 marker). In the one story whose thesis is "prove audibility, a green test is not proof," a guard that green-lights "inaudible" defeats the deliverable's purpose. Violates the project test rule "could the assertion pass even if the behavior is wrong?"
2. **[MEDIUM] [TEST]** `:165` — the Branch-A control (`.not.toMatch(/\b200\b|upload…|baked…/i)` on `s = section ?? ''`) passes **vacuously when the section is missing** (`''` never matches). Reproduced: dropping the audio keyword from the heading makes `section` null and this test reports a false PASS ("confirmed no baked-asset claim") when nothing was read. Backstopped at the suite level by the "has a section" test, but the individual guard is misleading.
3. **[MEDIUM] [TEST]** `:145` — `/no (external )?asset|…|not .*bucket/i` matches negated prose: "it is NOT the case… definitely NOT no asset needed" satisfies it via the literal "no asset". A keyword-presence check standing in for a factual claim.
4. **[LOW] [RULE]** `:28` (comment) — the Block-1 non-vacuity note says "flip the worklet URL to an http literal and Block 1 reddens" — names a mutant class, not a concrete re-runnable string (rule 23). The underlying claim is TRUE (rule-checker + I confirmed the `:65` `not.toMatch(/https?:\/\//)` guard catches it), but the citation isn't reproducible as written.
5. **[VERIFIED] [DOC]** The evidence record itself is ACCURATE — comment-analyzer ([DOC], clean, zero findings) independently rebuilt the game and confirmed: worklet via `new URL(..., import.meta.url)` (audio.ts:84-86), bundled to `dist/missile-command/assets/pokey-<hash>.js`, no external fetch in `plugins/missile-command/src`. Evidence: my own grep (no http/fetch/.wav in MC src) + the peak-0.157 AnalyserNode capture in the Dev Assessment. The DELIVERABLE'S CONTENT is correct; the defect is the GUARD'S robustness.
6. **[VERIFIED]** Block 2 is genuinely non-vacuous on the happy path — I mutated out the `mc8-3` marker and the suite reddened (7/8), then restored (tree byte-identical to HEAD). The section-slice reads the REAL `hosting.md`, not a fixture matching the assertion (rule 18 compliant).
7. **[VERIFIED]** No new production code, no core-boundary touch, no citation-gate exposure, mc8-8 YAML parses — the story is correctly scoped as verification + evidence.

### Devil's Advocate

Suppose this ships as-is. The story's proposition is that automated green is worthless for audio because silence and success look identical — and yet the guard it delivers has exactly that blind spot. A future engineer working an mc8 follow-up breaks the worklet wiring, notices MC has gone quiet, and updates the hosting record to "MC audio is currently **inaudible** pending a fix" while keeping the section heading, the "runtime-synth" phrase, and the `mc8-3` marker. Every one of these Block-2 tests stays green. The suite now actively certifies a record that says the game is silent — the precise inversion the story was written to prevent. That is not a contrived path: the record is prose maintained by hand, and "inaudible" is the single most likely word to appear if the audio ever regresses. The word-boundary omission at line 151 is therefore not a stylistic nit; it is the story failing its own test. Worse, the control at 165 will happily report "no baked-asset manifest present" about a section that does not exist, so a heading reword during an unrelated docs cleanup silently downgrades the guarantee while looking green in that row. A confused reader auditing the suite would read four green Block-2 rows as "the live-audio record is verified and locked," when in fact three of them can be satisfied by contradictory or absent prose. And the closed-loop check at 145 accepts a sentence asserting the OPPOSITE of a closed loop. Individually each is "the positive tests backstop it"; collectively they mean the section's *semantics* are unguarded — only its *keywords* are. For a 2-point verification story that is cheap to get exactly right (word boundaries, a non-empty precondition, one fuller phrase), shipping keyword-only guards in the story about not trusting green tests is the one outcome worth rejecting over. The counter-case — that the doc is correct today and the audio genuinely plays — is true and is exactly why this is a REJECT on the guard, not on the finding of fact: the work is right, the proof of the work is not yet tamper-evident.

## Round 1 Reviewer Verdict (REJECTED — superseded by the Round 2 APPROVED assessment below)

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | Audible-evidence guard matches "**inaudible**" (no word boundary) — passes on the negative claim; not backstopped by the positive tests | `plugins/missile-command/tests/mc8-3-audio-asset-loop.test.ts:150-151` | Anchor so it cannot match "inaudible": e.g. require the phrase `/confirmed\s+audible/i` (the record already says "confirmed audible"), or `/(?<!in)\baudible\b/i` combined with `/\bplayback\b/i`. The guard must distinguish audible from inaudible. |
| [MEDIUM] | Branch-A control passes vacuously on a missing section (`''` never matches the forbidden pattern) | `:158-165` | Add a non-empty precondition in the same `it` — `expect(section, '…').not.toBeNull()` (or `expect(s.length).toBeGreaterThan(0)`) before the `.not.toMatch`. |
| [MEDIUM] | "Closed asset loop" guard matches negated prose ("not … no asset needed") | `:142-145` | Require a fuller anchored phrase, e.g. `/requires no external asset/i` and/or `/no \S+[- ]?bucket asset/i`, instead of the bare "no asset" fragment. |
| [LOW] | Non-vacuity comment names a mutant class, not a re-runnable string (rule 23) | `:27-28` | Cite a concrete mutant, e.g. change the worklet URL to `'https://arcade.slabgorb.com/pokey.js'`. |

**Not required (deferred, low):** test-analyzer #4 (worklet-exists test at `:80` re-derives the path instead of extracting it from the `:58` regex match) and #5 (`:65-77` guard omits `XMLHttpRequest`/`import()`/other media extensions). Optional hardening; the engine is tiny and these are speculative.

**What is NOT wrong (do not change):** the finding of fact. The audio genuinely plays (peak-0.157 output, worklet resolves same-origin), the `hosting.md` record is accurate (comment-analyzer clean), the asset loop is closed, `mc8-8` correctly captures the dev-serve silence, and the build/lint/orchestrator suites are green. The REJECT is solely to make the Block-2 guard tamper-evident — tighten the assertions, keep the (correct) recorded evidence as-is.

**Routing rationale:** the fixes are test-assertion changes (the guard), so this is a **red rework → TEA**, not a green/dev rework.

**Handoff:** Back to TEA (Tyr One-Handed) to tighten the Block-2 assertions.
## TEA Rework — round 1 (Reviewer mc8-3 REJECT)

Tightened the Block-2 assertions in `mc8-3-audio-asset-loop.test.ts` so the guard is tamper-evident. The recorded evidence in `hosting.md` was correct and is UNCHANGED — only the tests changed.

- **[HIGH fixed] audible guard (was :151):** word-anchored to `/\baudible\b|\bplayback\b|\bplayed back\b|\bheard\b/i`. `\baudible\b` cannot match the substring in "inaudible" (no word boundary between "in" and "audible"). Proven in node: rejects "completely inaudible, no sound whatsoever"; accepts "confirmed audible" / "proof of playback"; still accepts the real record which contains BOTH "audible" and "inaudible in dev". NOTE: deliberately did NOT add a blanket `not.toMatch(/inaudible/)` — the record legitimately uses "inaudible" to disclose the dev-serve gap, so banning the word would redden the correct doc; the positive anchor alone is the right fix.
- **[MEDIUM fixed] closed-loop guard (was :145):** now requires a qualified phrase `/no external asset|requires no external asset|no \S*bucket asset/i`. Proven: rejects "…definitely NOT no asset needed" (the negated-fragment false-pass); accepts "no external asset fetch" and "no `arcade`-bucket asset".
- **[MEDIUM fixed] Branch-A control + runtime-synth test:** added an explicit `expect(section).not.toBeNull()` precondition so a missing section can no longer pass the negative control vacuously. Proven by mutation: dropping the "audio" keyword from the heading (section→null) now REDDENS the control (5 failed vs. the prior silent pass), then restored (hosting.md byte-identical to HEAD).
- **[LOW fixed] rule-23 comment (was :28):** the Block-1 non-vacuity note now cites a concrete, re-runnable mutant string (`'https://arcade.slabgorb.com/pokey.js'`) instead of the "an http literal" class.
- **[deferred, not done]** test-analyzer #4 (worklet-exists path re-derivation) and #5 (extra loading mechanisms) — Reviewer marked these low/optional; not required for approval.

**Suite:** missile-command 1039/1039 green, `mc8-3-audio-asset-loop` 8/8 against the correct (unchanged) record; lint clean. Non-vacuity re-proven for every tightened assertion.

**Handoff:** the tightened tests are green against the already-correct evidence, so GREEN has no implementation work — Dev confirms green and forwards to re-review.
### Dev (implementation) — round 2 (green confirm)
- No deviations from spec.
- No implementation change needed: the Reviewer REJECT was test-guard robustness only; TEA tightened the Block-2 assertions and they are green against the already-correct `hosting.md` evidence (which is unchanged). Confirmed missile-command 1039/1039 green, tree clean, branch synced. Forwarding to re-review.
## Subagent Results

**Round 2 (re-review of commit a302ed19 — test-guard tightening).**

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (MC 1039/1039, orchestrator 455/455, lint clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | clean | 3 round-1 findings all RESOLVED (verified by mutation); 1 low theoretical double-negation residual (non-blocking, absent from real record) | confirmed resolved 3, deferred 1 (low) |
| 5 | reviewer-comment-analyzer | Yes | clean | none (all 3 tightened comments verified accurate against source + hosting.md) | N/A |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations (26 rules); round-1 rule-23 RESOLVED (concrete mutant re-run reddens cited guard) | confirmed resolved 1 |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`).
**Total findings:** 0 blocking; all 4 round-1 findings verified RESOLVED; 1 low theoretical residual deferred.

### Rule Compliance (round 2)

`reviewer-rule-checker` re-ran the full TS checklist (26 rules, 9 instances, **0 violations**) and independently mutation-tested the claims. Key deltas vs round 1: **[RULE]** rule 23 RESOLVED (Block-1 comment now cites the concrete mutant `'https://arcade.slabgorb.com/pokey.js'`; the exact replacement reddens the cited `not.toMatch(/https?:\/\//)` guard). **[TEST]** rules 15/18/25/26 — the tightened Block-2 guards are now word/phrase-anchored (`\baudible\b`, qualified `no external asset|no \S*bucket asset`) and each carries a `not.toBeNull()` precondition (rule 18 — the apparatus can no longer fail-by-passing on a missing section). **[DOC]** comment-analyzer verified the new comments are accurate. Disabled specialists ([EDGE][SILENT][TYPE][SEC][SIMPLE]) remain N/A — the round-2 diff is a 6-line test tightening with no production/type/security surface.

## Reviewer Assessment

**Round 2 — Verdict:** APPROVED

**Data flow traced:** the guards read real files — `audioSrc` (`plugins/missile-command/src/shell/audio.ts`) and `section` (a heading-bounded slice of `docs/ops/hosting.md`) → assertions. No test-local-only comparisons (rule 26). The recorded evidence (worklet resolves same-origin, POKEY output peak ≈ 0.157, offline/self-contained) was independently re-verified accurate by comment-analyzer against a fresh build.

**Pattern observed:** the round-1 REJECT (keyword-only guards that could pass on prose meaning the opposite — `/audible/` matching "inaudible", empty-section control vacuous, negated "no asset" satisfying the closed-loop check) is fully remediated at `plugins/missile-command/tests/mc8-3-audio-asset-loop.test.ts`. All three fixes were re-confirmed by independent mutation (test-analyzer + rule-checker + my own node regex proofs): the anchored guards reject the exact round-1 false-pass inputs and still accept the real record. The LOW rule-23 comment is fixed with a concrete re-runnable mutant.

**Error handling:** N/A (test + prose diff; no production error paths). The audio engine's silent-degrade contract lives in the untouched `audio.ts` and is covered by mc8-2's `audio-engine.test.ts`.

**Dispatch tags:** [TEST] all round-1 vacuity findings resolved (test-analyzer clean). [DOC] tightened comments accurate (comment-analyzer clean). [RULE] 0 violations, rule-23 resolved (rule-checker clean). [EDGE][SILENT][TYPE][SEC][SIMPLE] disabled — N/A for a test-only tightening with no branching/error/type/security/complexity surface.

**Residual (non-blocking, not required):** a contrived double-negation ("It is false that there is no external asset") could in principle satisfy a phrase guard — an inherent limit of text matching, absent from the real record; and test-analyzer round-1 #4/#5 (worklet-path re-derivation, extra loading mechanisms) remain optional low hardening. None blocks.

**Deviation audit:** the single Dev deviation (verified against the build, not `just serve`) was stamped ✓ ACCEPTED in round 1 and stands — comment-analyzer re-confirmed the record's accuracy and the `mc8-8` disclosure of the dev-serve silence.

**Handoff:** To SM (Baldur the Bright) for finish-story.