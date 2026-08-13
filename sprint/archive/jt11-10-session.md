---
story_id: "jt11-10"
jira_key: "jt11-10"
epic: "jt11"
workflow: "tdd"
---
# Story jt11-10: Chore: sweep the retired dev-bar naming and harden the frame-loop source pins

## Story Details
- **ID:** jt11-10
- **Jira Key:** jt11-10
- **Workflow:** tdd
- **Type:** chore
- **Points:** 3
- **Repos:** arcade
- **Branch:** feat/jt11-10-devbar-naming-sweep-and-frameloop-source-pins
- **PR:** 325
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-13T15:56:28Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T15:01:53Z | 2026-08-13T15:07:01Z | 5m 8s |
| red | 2026-08-13T15:07:01Z | 2026-08-13T15:26:38Z | 19m 37s |
| green | 2026-08-13T15:26:38Z | 2026-08-13T15:42:31Z | 15m 53s |
| review | 2026-08-13T15:42:31Z | 2026-08-13T15:56:28Z | 13m 57s |
| finish | 2026-08-13T15:56:28Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA][Gap, non-blocking] The AC6 ROM tree is ABSENT in this checkout** (`../../reference/williams-source/joust` not present). Any byte-verifying guard for ROM cites in src comments would SKIP here, so it cannot be RED-proven — one reason AC6 is a GREEN one-shot cite fix, not a new guard. If Dev has the tree (`JOUST_SOURCE_DIR`), byte-confirm `JOUSTRV4.SRC:2621` carries `SECCR PTERST` before editing; else trust the AC's byte-read.
- **[TEA][Improvement, non-blocking] AC3 found 5 stale src refs, not the AC's "~3 remaining."** The widened guard reddens on all 5: `enemy.ts` (sim.ts:425), `events.ts` (sim.ts:837), `sim.ts` (transporter.ts:226 ×2), `sim.ts` (frame.ts:322). All 5 are in scope — convert each to a SYMBOL ref (jt9-30 rule). The detached `:654` in enemy.ts is legal (not glued to `enemy.ts`), leave it.
- **[Dev][Improvement, non-blocking] `drawList(demo: SimState)` (sim.ts:2893) has the SAME `demo`-param smell AC4 fixed on `stepSim`.** I scoped the rename to `stepSim` only, per AC4's explicit target — `drawList` was out of scope and touching it would be creep. If the fleet wants the whole file consistent, `drawList`'s param + its ~5 `demo.arena`/`demo.crumbles`/`demo.sim` reads (2906–2960) are a clean one-line follow-up.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[TEA] RED-guarded 5 of the 8 items; 3 are GREEN one-shots, by proportionality.** This is an
  8-item chore of LOW/cosmetic findings. Durable guards were written where a guard is cheap,
  reliable, and RED-verifiable tree-free: **AC1, AC2, AC3, AC5, (b)**. Three items are handled as
  GREEN one-shots with per-item verification rather than bespoke guards, because a guard would be
  disproportionate, fragile, or un-RED-verifiable here:
  - **(a) prose sweep** — a comment-scan for the retired name (`dev-overlay`/`dev bar`) is fragile:
    the kept assertion legitimately contains `drawOverlay` (story says keep assertions), and a
    zero-tolerance scan would also fight legitimate historical phrasing. Verify by diff: the three
    files' PROSE/headers say HUD/`drawHud`; the assertion regexes/logic are byte-identical.
  - **AC4 stepSim param rename** — the AC itself frames it "mechanical, file-local, tsc confirms."
    A bespoke param-name scan has no natural home (a new joust `.test.ts` would redden
    audio-seam-scope's file count — see [[joust-readme-testfile-count-guard]]). Verify: `grep -n
    'stepSim(demo' sim.ts` returns nothing + `npm run lint` green.
  - **AC6 ROM cite fix** — tree absent (see Delivery Finding), so a byte-guard can't be RED-proven;
    the "consider extending citations.test.ts" is explicitly optional and fuzzy (parsing a claimed
    symbol from free-text comments). Fix the one cite; the extension is deferred.
- **[TEA] The (b) pin-refactor guard had a self-match hazard, caught at RED-verify.** The scan for the
  fragile `.slice(loopStart)` idiom initially matched its OWN comments/messages (6 hits, not 2), so
  it could never have gone green after Dev fixed the two real pins. Fixed: the matcher is built via
  `new RegExp('\\.slice\\(...')` and the prose never spells the literal — now exactly 1 hit per pin
  file. Lesson recorded in [[source-scan-guard-self-match]].

### Reviewer (audit)

- **[TEA] RED-guarded 5/8, 3 GREEN one-shots by proportionality** → ✓ ACCEPTED. The split is sound: AC1/AC2/AC3/AC5/(b) got durable guards (all confirmed RED→GREEN); (a)/AC4/AC6 as verified one-shots is correct — a bespoke guard for each would be disproportionate or (AC6) fuzzy, and all three were independently verified this round (comment_analyzer byte-checked AC6 against the ROM; (a) matchers byte-identical; AC4 confirmed 1:1 by security agent).
- **[TEA] (b) pin-refactor guard self-match hazard, fixed** → ✓ ACCEPTED. Verified: `render-jt4-5.test.ts` spells the searched idiom nowhere as a literal (matcher built via `new RegExp`), so the guard reached GREEN after the two real pins were refactored — exactly one real pin per file, now zero.
- **[Dev] AC4 scoped to `stepSim`, `drawList(demo)` left** → ✓ ACCEPTED. Correct scope discipline — AC4 named only `stepSim`; sweeping `drawList` (or the file-wide conceptual "demo") would be creep. Filed as a non-blocking follow-up.
- **[Dev] `game-contract.ts:506` "DEMO BAR" intentionally kept** → ✓ ACCEPTED with a caveat (see [DOC] finding below): keeping "DEMO BAR" is defensible, but juxtaposed with the swept "this is the HUD" at :525 it slightly blurs the jt4-5-placeholder vs jt11-2-authentic-HUD timeline. LOW, non-blocking.

## Sm Assessment

**Story shape — READ FIRST.** jt11-10 is an intentional UNION chore (3pt). Its title labels only
work-items (a) and (b); its six acceptance_criteria carry six ADDITIONAL routed jt11-4 round-3 LOW
findings that are equally in scope. Verified via the routing commit `2bc709fd` — its message says
*"jt11-10 … takes the five LOWs"* and bumped points 1→3. The title under-labels the whole; it was
NOT rewritten (annotate, don't disguise). Full scope = 8 items: (a) dev-bar/drawOverlay prose sweep
in 3 joust test files (prose only, keep assertions); (b) frame-loop source-pin hardening in 2 test
files via the TypeScript AST per the mc10-6 ruling; plus ACs R3-F4/F5/F6/F7/F8 and one Delivery
Finding.

**Premise verification (pre-setup).** I measured all 8 premises against the current tree — ALL LIVE,
none fixed by the intervening jt11-9/11/13. Two AC line-numbers have drifted and are recorded in the
context's `⚠ MEASURED CORRECTIONS` block: `stepSim(demo:)` is at `sim.ts:2241` (AC says :2168), and
the wrong `SECCR PTERST → JOUSTRV4.SRC:2618` cite is at `sim.ts:734` (AC says :700), with `:2618`
appearing at several sim.ts sites — only the ones citing the SECCR PTERST *instruction* are wrong
(real instruction is JOUSTRV4.SRC:2621; :2618 is the PCNAP nap line). Relocate by SYMBOL, not line.

**Coordination notes.** `.pennyfarthing/gates/lang-review/typescript.md` (AC R3-F5) is tracked in
arcade → single-repo PR, but the LIVE pf gate loads from `pennyfarthing-dist/`, so this copy may be
a vendored duplicate that doesn't drive the live check — still in scope as a doc-consistency fix.
Sibling probes clean at setup (no remote jt11-10 branch, no sibling session); claim committed +
pushed on `feat/jt11-10-devbar-naming-sweep-and-frameloop-source-pins`, story stamped `in_progress`.

**For TEA (RED):** several items already have guard tests (`jt9-55-joust-yaml-refs.test.mjs`,
`comment-line-refs.test.ts`, `tests/audit/citations.test.ts`) whose strengthening/extension is the
natural RED seam; others are one-shot edits (the repo-root PNG delete, the typescript.md range
bumps). The context flags guardable-vs-one-shot per item. Note the joust README test-file count
guard if any NEW test file is added ([[joust-readme-testfile-count-guard]]).

**Handoff → TEA (Han Solo) for RED.**

## Tea Assessment

RED phase complete. **6 new failing tests across 5 items; full-suite blast radius is exactly those 6
— nothing else regressed** (joust vitest 3612/3615, orchestrator 478/481; the 3 fails per suite are
all mine). Each fails for the intended reason, verified by running it.

### RED guards written (make these GREEN)

| Item | File (extended, no new joust `.test.ts`) | RED reason to flip |
|------|------------------------------------------|--------------------|
| **AC1** (R3-F4) | `tests/jt9-55-joust-yaml-refs.test.mjs` | control `attract.ts` stem-collides with `attract-scheduler.ts`/`attractScreen.ts` → change the `CONTROL` const (line ~236) to a noun joust cannot acquire: `volcano.ts` / `mirv.ts` / `scorpion.ts` / `trench-channel.ts` |
| **AC2** (R3-F5) | `tests/typescript-gate-range-consistency.test.mjs` (new orchestrator) | `.pennyfarthing/gates/lang-review/typescript.md` :590 and :655 read `#14-#29`; bump BOTH to `#14-#30` to agree with :104 |
| **AC3** (R3-F6) | `plugins/joust/tests/comment-line-refs.test.ts` | 5 src-comment `<our>.ts:<line>` refs remain — convert each to a SYMBOL ref (jt9-30 rule): `enemy.ts` (sim.ts:425), `events.ts` (sim.ts:837), `sim.ts` (transporter.ts:226 ×2), `sim.ts` (frame.ts:322). Leave the detached `:654`. Do NOT touch ROM `.SRC`/`.MAC` cites. |
| **AC5** (R3-F7) | `tests/monorepo-topology.test.mjs` | delete `joust-after-start.png` from the repo root (`git rm joust-after-start.png`) |
| **(b)** frame pins | `plugins/joust/tests/render-jt4-5.test.ts` | create `plugins/joust/tests/helpers/frame-loop.ts` exporting `frameLoopBody(src: string): string` that returns the `frame` fn body bounded at its matching closing brace **via the TypeScript AST** (mc10-6; precedent: `helpers/purity-scanner.ts` uses `typescript`), then **refactor BOTH pins** (`render-jt4-5.test.ts:~90-92` and `hud-jt11-2.test.ts:~382-384`) to call it in place of the frame-to-EOF slice. Keep each pin's existing `.toMatch(...)` assertions. |

### GREEN one-shots (no RED guard — see Design Deviations for why; verify each)

- **(a) prose sweep** — in `render-jt4-5.test.ts`, `helpers/game-contract.ts`, `demo-td1-12.test.ts`,
  truth-fix PROSE/headers only: the consumer is now `drawHud` (jt11-2), not the `dev-overlay`/dev bar.
  **Keep every assertion (regex + logic) byte-identical** — verify with `git diff` that only comments/
  strings changed, not `expect(...)` matchers.
- **AC4** — rename `stepSim(demo: SimState, …)` at `sim.ts:2241` and its ~24 `demo.` reads to `state`
  (file-local). Verify: `grep -n 'stepSim(demo' plugins/joust/src/core/sim.ts` empty + `npm run lint` green.
- **AC6** — fix the ROM cite at `sim.ts:734` (`PendingPtero` doc): `SECCR PTERST` is `JOUSTRV4.SRC:2621`,
  not `:2618` (`:2618` is `PTERWV PCNAP 65`). Only fix cites naming the SECCR PTERST *instruction* —
  `:2618` legitimately cites the PCNAP nap elsewhere (:408, :1043, :1062, :2594). If you have the ROM
  tree, byte-confirm :2621 first.

### Traps
- No new joust `.test.ts` file — I extended existing ones so audio-seam-scope's file count stays green
  ([[joust-readme-testfile-count-guard]]). The GREEN helper `frame-loop.ts` is a `.ts`, not a `.test.ts`.
- The (b) refactor edits the SAME test files the pins live in — run the full joust project after, not
  just the changed test, to catch any anchor drift.

**Handoff → Dev (Yoda) for GREEN.**

## Dev Assessment

GREEN complete. **lint(tsc) exit 0, joust 3615/3615, orchestrator 481/481** — the 6 RED tests
(3 per suite) now pass, nothing else moved. All 8 items landed:

- **AC1** — jt9-55 control `attract.ts` → `volcano.ts` (verified joust has no `volcano*`/`mirv*`/`scorpion*`/`trench*` file; the new stem-collision guard I inherited from TEA passes).
- **AC2** — `typescript.md` `#14-#29` → `#14-#30` at :590 and :655 (real tracked blob in arcade, mode 100644 — NOT a symlink; verified topology before editing).
- **AC3** — 5 src-comment refs → symbols: `enemyState`/`remountEnemyProcess` (the two `pchase:0`+`brain:'linet'` spawn sites), `stepMaterialise` ×2, `stepFrame` + inlined predicate; `events.ts`'s deleted-line history detached to `sim.ts (:837)`. The line refs were all genuinely stale (pointed at unrelated code), confirming the finding.
- **AC4** — `stepSim(demo)` → `stepSim(state)`, scoped to that ONE function via line-ranged rename. **`drawList(demo)` (:2893) deliberately NOT touched** — out of AC4's stated scope; logged as a follow-up in Delivery Findings. Conceptual "demo" prose (the module models a demo loop) left alone; only the `demo.` identifier reads changed.
- **AC5** — `git rm joust-after-start.png`.
- **AC6** — only `sim.ts:734` (the `SECCR PTERST` *instruction* cite) → `:2621`. The `:2618` PCNAP-nap cites (:408, :1043) and the `:2618-2624` block ranges (:1062, :2594) are correct and untouched. (ROM tree absent here — trusted the AC's byte-read; a Reviewer with `JOUST_SOURCE_DIR` can confirm.)
- **(a)** — `dev-overlay`/`dev bar`/`DEV-OVERLAY` prose → `HUD` in the 3 test files. **Assertion matchers byte-identical** (verified by diff: only message strings and describe/it names changed; `.toMatch(/…/)` / `.toBe(…)` untouched; `overlayReadout`/`OverlayReadout` code identifiers untouched). `game-contract.ts:506` "DEMO BAR" kept — it names the jt4-5 demo deliverable (two knights playing), not the overlay consumer.
- **(b)** — `helpers/frame-loop.ts` exports `frameLoopBody(src)` (TS AST, `purity-scanner.ts` precedent), bounding the `frame` fn to its closing brace. Both pins refactored off the frame-to-EOF slice; hud-jt11-2 keeps its comment-strip by stripping the *bounded* body.

**For the Reviewer:** the correlation tags for the gate — this touched a `[DOC]` (typescript.md range), no `[SEC]` surface, and the `[RULE]` seam is the jt9-30 symbol-ref rule (AC3) + mc10-6 AST rule (b), both now guarded.

**Handoff → Reviewer (Obi-Wan) for review.**

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | ran inline: lint(tsc) exit 0, joust 3615/3615, orchestrator 481/481 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 (LOW) | confirmed 1, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes (2 enabled returned, 7 skipped-disabled)
**Total findings:** 1 confirmed (LOW, non-blocking), 0 dismissed, 0 deferred

### Rule Compliance

Rules applicable to this diff (from CLAUDE.md + the two in-play project laws jt9-30 and mc10-6):

- **Core/shell purity boundary** (`src/core/` must not import shell; guarded by joust `purity`/`core-boundary` tests). Enumerated every changed core file — `sim.ts`, `enemy.ts`, `events.ts`: all three changes are COMMENT text + a file-local parameter rename; **no import added, no shell surface referenced**. Purity suite green (3615/3615). ✅ compliant.
- **jt9-30 — comment line-refs name the SYMBOL, never a `<file>.ts:<line>`.** Enumerated all 5 converted refs: `enemy.ts` (`enemyState`/`remountEnemyProcess`), `events.ts` (detached historical `sim.ts (:837)` — no live symbol exists, the guard's exempt form), `sim.ts` ×3 (`stepMaterialise` ×2, `stepFrame` + inline predicate). comment_analyzer byte-checked each symbol against source. The widened guard now pins joust `src/` at zero. ✅ compliant.
- **mc10-6 — source bounds via the TypeScript AST, not regex/line-grep.** `frame-loop.ts` uses `ts.createSourceFile` + node spans (`getStart`/`getEnd`), the `purity-scanner.ts` precedent; empirically bounds `main.ts`'s `frame` fn at its closing brace (verified: body ends `requestAnimationFrame(frame)\n}`, 199 trailing chars excluded). ✅ compliant.
- **ROM-citation accuracy** (`JOUSTRV4.SRC:<line>` must name the real line). AC6: comment_analyzer read the vendored ROM — :2618 = `PTERWV PCNAP 65`, :2621 = `SECCR PTERST,PTEID`; the one SECCR-PTERST-instruction cite moved to :2621, the PCNAP/range cites correctly untouched. ✅ compliant.
- **No new joust `.test.ts`** (would redden audio-seam-scope's derived file count). All guards extended existing files; the new `frame-loop.ts` is a `.ts` helper, not a `.test.ts`. audio-seam-scope green. ✅ compliant.
- **Keep assertions in (a)** (story rule): diff-verified only message strings / describe names changed; `.toMatch(/…/)` / `.toBe(…)` matchers and `overlayReadout`/`drawOverlay` code identifiers byte-identical. ✅ compliant.

### Observations

- **[VERIFIED] AC3 symbols are real and hold the cited code** — `enemyState` sim.ts:652 and `remountEnemyProcess` sim.ts:1282 both pair `pchase:0`+`brain:'linet'` (sim.ts:668, :1303); `stepMaterialise` transporter.ts:245, `stepFrame` frame.ts:443 exist and match the prose. The stale refs genuinely pointed at unrelated code (sim.ts:425 = a JSDoc, transporter.ts:226 = `isControlInput`), confirming the finding.
- **[VERIFIED][RULE] AC4 rename is 1:1 and file-local** — zero `demo.` left in stepSim (2241–2723); `drawList(demo)` (:2893) and its 5 reads untouched; no `state.` leak outside stepSim (the outside hits are the word "state." in prose / the `arena-state.js` import). `npm run lint` exit 0. Corroborated by reviewer-security's independent 1:1 diff.
- **[VERIFIED] AC5 topology guard is non-vacuous** — asserts the repo tracks images somewhere (glue-check) AND none at depth-0; RED on `joust-after-start.png`, GREEN after `git rm`. PNG deletion staged.
- **[VERIFIED] AC2 is globally consistent** — all three `#14-#N` mentions in typescript.md now read `#30` (:104, :590, :655); no other `#NN-#NN` range exists to drift.
- **[VERIFIED][SEC] no security surface** — reviewer-security clean: `frame-loop.ts` parses only trusted repo source (no eval/emit), dynamic-import specifier is built from static literals, `execFileSync` uses array args. This is a browser game with no backend/auth/secrets.
- **[VERIFIED] (b) guard is non-vacuous and self-match-safe** — appends a sentinel after `frame` and asserts exclusion; would redden if `frameLoopBody` reverted to slice-to-EOF. The `UNBOUNDED_SLICE` matcher is `new RegExp`-built so the file never spells it literally — GREEN reachable.
- **[DOC][LOW] game-contract.ts:506/:525 — (a) sweep slightly blurs the placeholder→authentic-HUD timeline** (reviewer-comment-analyzer, medium confidence, verified against the text). ":525 `…display is jt5 — this is the HUD`" (was "dev bar"): "dev bar" there meant "non-authentic placeholder," a DIFFERENT sense from the retired consumer-name the story targeted; renaming it to HUD, beside the kept "DEMO BAR" at :506, can read as if jt4-5 delivered the authentic HUD (which jt11-2 did, later). **Defensible in present tense** (the readout is now rendered by the HUD) and the specialist itself graded it not-rework. Non-blocking; a future prose polish could soften ":525" to "…a readout that today feeds the HUD," but it does not block this chore.

### Devil's Advocate

Argue this is broken. The most dangerous change is `frame-loop.ts` — a new AST helper the whole (b) pin now depends on. If `frameLoopBody` silently returned the wrong span, both hardened pins would keep passing on today's `main.ts` (where `frame` is last) and only rot later, defeating the entire point. I attacked exactly this: I ran it against real `main.ts` and confirmed the returned span ends at the frame closing brace with 199 trailing chars excluded — and the guard's sentinel test proves a slice-to-EOF regression reddens. What if `main.ts` one day writes `frame` as a `function` declaration, or wraps it, or exports it? The helper handles `const/let frame = arrow|function-expr` AND `function frame()`, and throws loudly (no silent "") otherwise — a missing `frame` fails the pin, not passes it. Next threat: the AC4 rename touching behaviour. A rename that changed a default, a branch, or leaked `state.` into `drawList` would corrupt the sim silently — pure functions have no runtime guardrail but tests. I enumerated every `demo`/`state` token in the function and its neighbour; the security agent independently diffed every use-site 1:1; tsc and 3615 joust tests pass. Next: did (a) mutate an assertion under cover of a "prose" edit? A changed matcher would weaken a pin invisibly. The diff shows only message strings and describe names moved; every `.toMatch`/`.toBe` is byte-identical, and no `overlayReadout` identifier was reworded. Next: AC6 — a wrong ROM line is worse than a missing one because it manufactures false corroboration. I did not take the AC's word: the ROM was byte-read (:2618=PCNAP, :2621=SECCR PTERST), and the split that left the PCNAP/range cites alone is correct, not lazy. Finally, the confused reader: the one place someone could be misled is game-contract.ts:525's "this is the HUD" beside "DEMO BAR" — logged as a LOW. Nothing here corrupts data, swallows an error, or crosses the purity boundary; the residual is one arguably-loose comment in a test helper.

## Reviewer Assessment

**Verdict:** APPROVED
**Data flow traced:** `main.ts` source text → `frameLoopBody` (AST) → the bounded `frame` body → the per-frame-call pins in render-jt4-5 / hud-jt11-2. Safe: the bound is the AST closing brace, so a paint call outside the loop can no longer satisfy the pin (empirically verified — 199 trailing chars excluded).
**Pattern observed:** durable-guard-where-cheap, verified-one-shot-where-not — 5 of 8 items pinned by tests (AC1/AC2/AC3/AC5/(b)), 3 verified one-shots ((a)/AC4/AC6). Correct proportionality for an 8-item LOW-findings chore.
**Error handling:** `frameLoopBody` throws a self-describing error on a missing `frame` decl (helpers/frame-loop.ts) — no silent empty-body fallback.
**Findings:** 1 × LOW `[DOC]` (game-contract.ts:506/:525 timeline blur — non-blocking, defensible). 0 Critical/High. `[SEC]` clean (reviewer-security). `[RULE]` compliant (purity, jt9-30, mc10-6, ROM-cite, audio-seam count — all enumerated above).
**Correlation:** the two in-play checks were the jt9-30 symbol-ref rule and the mc10-6 AST rule; both are now themselves guarded by extended tests (comment-line-refs widened to src/, the frame-loop AST helper). The `[DOC]` finding maps to no existing lang-review check and is too story-specific to promote to one.
**Handoff:** To SM for finish-story