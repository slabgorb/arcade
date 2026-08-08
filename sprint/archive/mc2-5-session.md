---
story_id: "mc2-5"
jira_key: "mc2-5"
epic: "mc2"
workflow: "tdd"
---
# Story mc2-5: O-1: decode the A35820.1C binary object

## Story Details
- **ID:** mc2-5
- **Jira Key:** mc2-5
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T21:09:00Z
**Repos:** arcade
**Branch:** feat/mc2-5-decode-a35820-1c-binary

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T20:36:52+00:00 | 2026-08-06T20:40:36Z | 3m 44s |
| red | 2026-08-06T20:40:36Z | 2026-08-06T20:51:02Z | 10m 26s |
| green | 2026-08-06T20:51:02Z | 2026-08-06T20:55:39Z | 4m 37s |
| review | 2026-08-06T20:55:39Z | 2026-08-06T21:09:00Z | 13m 21s |
| finish | 2026-08-06T21:09:00Z | - | - |

## Acceptance Criteria
- A35820.1C.bin is identified (what data/ROM it is and its role in the CPU link) with the decode method recorded; reference/PROVENANCE.md and docs/rom-study/brief.md are updated and O-1 is marked resolved.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Gap (non-blocking) — the AC names `reference/PROVENANCE.md` as an update target, but it is gitignored, so that half of the AC produces no committed/CI-visible artifact.** `plugins/missile-command/.gitignore:9` ignores the whole `reference/` tree ("Reference material quarried locally … NEVER committed or pushed (copyright wall). The durable, cited extraction lives in docs/rom-study/."). Dev should still update PROVENANCE.md locally (the ground-truth ledger), but the committed record of the decode must land in `docs/rom-study/brief.md` (tracked). The RED test is built around this: the always-on brief.md block carries the CI RED; the PROVENANCE.md + vendored-source blocks are `skipIf(!referenceAvailable)` and only run locally (the jt1-3 degradation pattern the sibling `*-docs` tests use). No scope change needed — just don't expect the PROVENANCE edit to show in the PR diff.
- **Improvement (non-blocking) — O-1's answer was fully recoverable from the vendored tree; the decode is already measured and baked into the RED.** `A35820.1C.bin` is NOT a raw ROM image — it is ASCII assembler SOURCE (CRLF-lined, null-padded to 0x2400) mis-vendored as `.bin` because its CR/LF + padding were never LF-normalized like its `.MAC` siblings. It self-identifies as **W3SOUN** (`\t.TITLE W3SOUN-(WAS T2SOUN)` at offset 0x01) — the WW3/Missile-Command POKEY sound-system control module, REV-01 **ROM2** (part **035822-01**, load **$6000**, MISSIL.DOC.txt:21). Two independent proofs pin it: (a) its own `.TITLE W3SOUN` + POKEY content (AUDCTL/AUDF1), and (b) its include fingerprint — it `.INCLUDE COND65` and does NOT include W3COMN, matching MISSIL.DOC's per-object include ledger for `.1C` exactly (COND65 list = .1A,.1C,.1D,.1E; W3COMN list = .1A,.1D,.1E). With `.1C`=W3SOUN all five link objects resolve (.1A=W3DSUP, .1B=W3COIN, .1C=W3SOUN, .1D=W3MAIN, .1E=W3INT) → inventory provably complete. Dev's GREEN is recording this + the decode method, not re-discovering it.

### Reviewer (code review)
- **Improvement (non-blocking): harden the source-text guard scoping in `decode-1c-docs.test.ts`.** The rule-checker (lang-review #17/#25) flagged four test-robustness nits — all confirmed, none affecting correctness or the delivered decode (which is verified-true four independent ways). Affects `plugins/missile-command/tests/decode-1c-docs.test.ts` — a future follow-up (not this 2pt story) could: (a) bound the `records the answer` region window by a code marker (the next `- **O-` bullet) instead of the raw `idx + 4` line count at line 129, which the rule warns "goes stale on the next edit and fails silently open"; (b) scope the `names W3SOUN somewhere in the committed brief` (134-139) and `records the decode METHOD` (141-148) anchors to the O-1 region rather than whole-file — currently redundant-but-not-a-gap, since the line-scoped test at 123-132 carries the discriminating signal; (c) either add `.bin` byte-offset / CRLF / `0x2400`-padding assertions to the `skipIf` re-derivation block, or soften the header comment's precise-offset claims (lines 19-26) which no test re-asserts. Low priority: the vendored `.bin` is frozen read-only ground truth, so drift risk is near-zero and the suite is green.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- No deviations from spec. GREEN recorded TEA's already-measured decode verbatim in the two AC-named docs; no code surface added, no test edited, no vendored source touched. The one non-obvious point (not a deviation — it is the RED test's own design and the TEA Delivery Finding) is that `reference/PROVENANCE.md` is gitignored, so its update is local-only and the committed record of the decode lives in `docs/rom-study/brief.md`.

### TEA (test design)
- No design deviations. The RED test follows the established missile-command `*-docs.test.ts` convention (timebase-docs, starting-cities-docs) verbatim in shape — always-on tracked-doc contracts + `skipIf(!available)` source cross-checks — with the doc target adjusted from the sibling stories' `docs/rom-study/*.md`-only footing to `brief.md` (committed) + `PROVENANCE.md` (gitignored) as the two AC-named targets.

### Reviewer (audit)
- **Dev "No deviations from spec"** → ✓ ACCEPTED by Reviewer: verified — the diff is exactly the two AC-named docs (brief.md tracked, PROVENANCE.md gitignored) plus the RED test; no code surface, no vendored source edited. Agrees with author reasoning.
- **TEA "No design deviations" (convention-follow note)** → ✓ ACCEPTED by Reviewer: verified the `skipIf(!referenceAvailable)` + always-on-brief.md shape matches the sibling `timebase-docs`/`starting-cities-docs` idiom exactly (confirmed by comment-analyzer and rule-checker independently); the brief.md-vs-PROVENANCE.md target split is a faithful adaptation, not a deviation.
- **UNDOCUMENTED (noted, NOT flagged as a defect):** `docs/design/mc2-dossier.md:108-114` still frames the mc2-5 task as "`A35820.1C.bin` … not yet identified." This is stale relative to the now-resolved O-1, but it is a PLANNING/ticket record, not a living system-state doc, and the same repo convention left the mc2-3 (O-2) and mc2-4 (O-4) dossier entries in their original task-framing after those stories closed. brief.md is the documented living record. Pre-existing convention, out of this diff's scope — Severity: L, not a blocker. (Corroborated independently by comment-analyzer and rule-checker #24.)

## Tea Assessment

**Story:** mc2-5 — O-1: decode A35820.1C.bin and mark the module inventory provably complete (missile-command ROM fidelity, 2pt, tdd RED).

**RED delivered.** New file `plugins/missile-command/tests/decode-1c-docs.test.ts` (committed `2afaed8`, pushed). Verified with `npx vitest run --project missile-command`: **351 tests, 341 pass, 10 fail — all 10 in the new file, no collateral** (14 sibling test files stay green).

**The 10 failing contracts are the AC deliverables Dev must produce:**
- brief.md (tracked → CI + local RED): positively marks O-1 resolved (a negated "not resolved"/"undecoded" does not count); no O-1 line still frames it open/undecoded; records the answer (names W3SOUN + its sound role in the O-1 region); names W3SOUN somewhere committed (brief is the ONLY committed home — see Delivery Finding); records the decode METHOD (assembler source / .TITLE self-id, not a raw ROM image); retires the stale "before claiming the module inventory complete" imperative.
- PROVENANCE.md (gitignored → local teeth via skipIf): the .1C row drops "not yet decoded/open Q"; identifies it as W3SOUN + sound role; records the ledger identity (ROM2 / 035822-01); no REV-01 link object (.1A–.1E) left undecoded (inventory provably complete).

**The 6 passing tests are correct-on-arrival guards, not vacuous:** 1 precondition (brief still references O-1) + 5 source re-derivations that independently prove the baked-in decode from the vendored `.bin` and MISSIL.DOC ledger (the starting-cities "independently re-derives STCITY[0]==6" idiom). They would RED if the file or ledger said something other than W3SOUN, so they make the decode un-fakeable rather than testing nothing.

**Guidance for Dev (Yoda):**
- The decode is already MEASURED (see Delivery Finding #2). GREEN is *recording* it, not re-deriving it: update brief.md's O-1 bullet (line ~113) and the §1 "What shipped" link list (line ~25, the `(A35820.1C)` slot), plus the PROVENANCE.md `.1C` row (line 28).
- brief.md's committed record must name **W3SOUN**, its **sound/POKEY** role, the ledger identity (**ROM2 / 035822-01**), and the **decode method** (it's ASCII assembler source, identified by its `.TITLE` + COND65/W3COMN include fingerprint — not a raw ROM image). Follow the O-2/O-4 `*(RESOLVED — see …)*` markup style already in `## Open questions`.
- Do NOT edit the vendored `reference/source/` files — they are read-only ground truth (and gitignored). PROVENANCE.md may be edited locally.

### Rule Coverage
This is a docs/decode chore — the TS lang-review checks about validated constructors / newtypes / deserialization do not apply (no source-code surface added). The applicable checks are the **test-quality** rules (#15 non-vacuous floor, #24 assert the exact value / grep the OLD framing not just add the new, #26 a guard that cannot fail for the defect it names), and all are covered:
- #24 negation teeth: `STILL_OPEN` excludes "O-1 not resolved"/"undecoded" so a negated flip cannot satisfy the resolved marker; the retirement test greps the OLD open imperative rather than only checking the new answer.
- #15/#26 floor: the source re-derivation block re-derives W3SOUN/.1C from the `.bin` + ledger, so the doc contracts cannot pass on a hand-waved identity — the decode is a source-checked fact.
- No vacuous assertions (`let _ =`, `assert(true)`, always-None): every test asserts a specific string/identity or a specific empty-list of violations.
No design deviations.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/missile-command/docs/rom-study/brief.md` (TRACKED, committed `89d4ac0`) — §1 link list now names `W3SOUN` in the `.1C` slot; §1 note records `.1C` = W3SOUN (POKEY sound ROM2 @ `$6000`), O-1 resolved; `## Open questions` O-1 bullet flipped to the `*(RESOLVED — …)*` style carrying the identity, the ledger facts (ROM2 / 035822-01 / `$6000`), the decode method (ASCII assembler source, `.TITLE` + COND65/W3COMN include fingerprint), and the inventory-complete statement.
- `plugins/missile-command/reference/PROVENANCE.md` (GITIGNORED — local only, NOT in the PR diff) — the `.1C` table row updated from "not yet decoded (open Q)" to `W3SOUN` / "POKEY sound-system control ROM (ROM2 @ `$6000`)" / `035822-01`, plus a "Decode note (O-1, resolved)" paragraph recording the method. Confirmed gitignored via `git check-ignore`; this is by design (copyright wall — see Delivery Finding #1), so its absence from the diff is expected, not a miss.

**Tests:** 16/16 passing in `tests/decode-1c-docs.test.ts`; **351/351** passing across the full missile-command project (`npx vitest run --project missile-command`). Repo-wide type check clean (`npm run lint` → `tsc --noEmit`, no errors).

**CI note:** the CI-visible RED→GREEN rides the always-on brief.md block (tracked); the `skipIf(!referenceAvailable)` PROVENANCE + vendored-source blocks pass locally and skip on CI (the gitignored reference tree is absent there). So CI sees a green brief.md contract, which is the committed proof O-1 is resolved.

**Branch:** feat/mc2-5-decode-a35820-1c-binary (pushed, `89d4ac0`)

**Handoff:** To review (Obi-Wan / Reviewer).

## Sm Assessment

**Story:** mc2-5 — "O-1: decode the A35820.1C binary object" (missile-command ROM fidelity, 2pt, p3, tdd, type chore but workflow explicitly `tdd` → phased, so TDD wins over the chore→trivial fallback).

**Sibling-ownership probes (both clean before setup):**
- `git fetch --prune && git branch -r | grep -Ei mc2-5` → no remote branch existed; no sibling checkout owns it.
- `ls /Users/slabgorb/Projects/a-*/.session/*-session.md` → only a-2 on the unrelated sw8-25.
- Story was `status: backlog` on both local and origin/develop at setup time.

**Premise measured before setup (the description is a claim with a timestamp):** LIVE and accurate.
- The binary exists: `plugins/missile-command/reference/source/A35820.1C.bin`, 9216 bytes.
- "Not yet decoded" is current: `plugins/missile-command/reference/PROVENANCE.md:28` still marks the `.1C` row as "Binary object — not yet decoded (open Q)".
- Decisive clue captured in the context: the four sibling objects `.1A/.1B/.1D/.1E` each map to a named `W3*.MAC` module + Atari part number; only `.1C` is a bare `.bin` with neither. That gap is the story.
- Both AC-named docs exist (`reference/PROVENANCE.md`, `docs/rom-study/brief.md`).

**Setup corrections applied (my gotchas file predicted all three):**
- sm-setup omitted `Repos`/`Branch` from the session — I added `**Repos:** arcade` and `**Branch:** feat/mc2-5-decode-a35820-1c-binary`.
- sm-setup left the story at `backlog` — I stamped `in_progress` and verified.
- AC was copied VERBATIM (diffed against `sprint/epic-mc2.yaml` — exact match, not edited).
- Context was a stub — enriched it with the measured ground truth + the sibling-table clue (starting points, not the decode itself).

**Claim pushed:** branch `feat/mc2-5-decode-a35820-1c-binary` (commits `88c56ef` stamp+context, `f0d2a1d` context enrichment) is on origin, so the sibling branch-probe lights up.

**Handoff → TEA (RED):** decode the 9 KiB object, identify what it is and its role in the REV-01 CPU link (`MISSIL.DOC.txt`), record the decode method, and drive a failing test that pins the module inventory as provably complete before Dev updates PROVENANCE.md + brief.md and marks O-1 resolved.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — lint clean, mc 351/351, orchestrator 408/408, no smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings (test-quality self-assessed by Reviewer — see [TEST]) |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — every factual claim independently verified true |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A — no injection surface, no copyright-wall breach |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 4 (test-guard scoping / comment precision) | confirmed 4 (severity downgraded to L/M), dismissed 0, deferred 4 to non-blocking follow-up |

**All received:** Yes (4 enabled returned; 5 disabled via settings)
**Total findings:** 4 confirmed (all Low/Medium, non-blocking), 0 dismissed, 4 deferred to a non-blocking follow-up

## Reviewer Assessment

**Verdict:** APPROVED

This is a 2-point ROM-fidelity decode/docs story. The delivered decode is **correct and independently verified four ways** (my own re-derivation, preflight, comment-analyzer, and the test's own source re-derivation block), all specialists are clean except a cluster of test-robustness nits from the rule-checker, and there are **no Critical or High findings**. Per Reviewer proportionality, a test-guard-scoping / comment-precision cluster on a 2pt story is a non-blocking follow-up, not a block.

**Data flow traced:** the "user input" here is the vendored binary `reference/source/A35820.1C.bin` → read by the test via fixed `readFileSync` paths and by the reader against MISSIL.DOC.txt → asserted into the committed claim in `brief.md`. Safe: no dynamic/user-controlled path, no shell-out, no eval ([SEC] confirmed).

**Observations (tagged by source):**
- `[VERIFIED]` The decode is correct AND its identification is UNIQUE. `A35820.1C.bin` self-identifies as `W3SOUN` (`.TITLE`, offset 1) with POKEY content; MISSIL.DOC.txt:21 places it as ROM2 / 035822-01 / $6000. Crucially, the COND65-yes / W3COMN-no include fingerprint is **unique to `.1C`** among the five link objects — evidence: MISSIL.DOC COND65 list = `.1A,.1C,.1D,.1E`, W3COMN list = `.1A,.1D,.1E`; only `.1C` is in the first and not the second. So the identity is not merely plausible, it is forced.
- `[VERIFIED]` The "module inventory provably complete" claim is correctly SCOPED. It refers to the five linked source modules (`.1A`–`.1E`), all now decoded — not the six 2716 EPROMs. The 6th chip (035825-01 / ROM5 @ $7800) is a burn-slice of the same linked image (5000–7FFF = 6×2KB), not a separate module. The test asserts over `LINK_OBJECTS` (`.1A`–`.1E`) only, so it does not overclaim. Evidence: MISSIL.DOC.txt:55-57.
- `[VERIFIED]` No stale "undecoded/open" framing of O-1 survives in any tracked doc. Evidence: grep of `docs/rom-study/` — every remaining O-1 mention is the new resolved framing in brief.md (lines 25, 32-33, 114-123).
- `[DOC]` comment-analyzer clean: every factual claim in brief.md and the test comment verified true against ground truth (byte offset 1, 403 trailing null bytes to 0x2400, CRLF, WW3 codename, part/ROM/load). One out-of-scope pre-existing note (`docs/design/mc2-dossier.md:108-114` still task-framed) — matches repo convention for closed O-2/O-4; audited above, not a defect.
- `[SEC]` security clean: fixed-path `readFileSync` only, no injection/traversal/eval; the hardcoded strings are short identifying tokens (register names, part numbers, `.TITLE W3SOUN`), not substantial verbatim source excerpts — no copyright-wall breach. The gitignored `reference/` tree is never committed (`git status` confirms).
- `[RULE]` 4 confirmed, all Low/Medium, all non-blocking (deferred to a follow-up Delivery Finding): (#17) header comment cites offsets/CRLF/padding no test re-asserts — LOW, facts verified true and source is frozen; (#25 ×2) the `names W3SOUN somewhere` and `records the decode METHOD` guards scan whole-file — redundant, but the line-scoped test at 123-132 carries the discriminating signal, so no coverage gap; (#25) the `idx + 4` region window is bounded by a raw line count — MEDIUM, currently correct (window 114-117 sits before the O-2 bullet at 122) but fragile to future edits. Per the PROJECT-RULES rule I do not dismiss these; I downgrade with rationale and defer, since none affects correctness and the suite is green.
- `[TEST]` (test_analyzer disabled — self-assessed) The tests are non-vacuous: the 5 source re-derivation guards read the real `.bin`/ledger and would redden if either differed (they are correct-on-arrival ground-truth guards, the sibling `starting-cities` idiom); the brief.md contracts assert specific strings with a genuine negation-teeth `STILL_OPEN` regex (a negated "not resolved"/"undecoded" cannot satisfy the resolved marker). No `expect(true)`, no assert-on-always-null, no `let _ =`. Corroborated by rule-checker #8/#26.
- `[EDGE]` / `[SILENT]` / `[TYPE]` / `[SIMPLE]` — subagents disabled via `workflow.reviewer_subagents`. Self-assessed as N/A for this change: no branching/state logic (EDGE), no error-swallowing (the one `readDoc` throws a labeled error, SILENT), no new type surface beyond a literal `DECODE` object + `as const` array (TYPE), and the test mirrors the established sibling `*-docs.test.ts` shape with no over-engineering (SIMPLE).

### Rule Compliance
The rule-checker performed the exhaustive per-rule enumeration (28 checks: 13 base + 13 extended + 2 project conventions) over the only `.ts` file in the diff. Result: **clean on every base check #1–#13** (type-safety escapes, generics, enums, null/undefined `??`-vs-`||`, module/`.js`-extension, async, test-quality/mocks/dist-imports, error handling), **compliant on the project `skipIf` + non-vacuous-assertion conventions**, with 4 violations only under #17 (comment precision) and #25 (source-text-guard scoping) — all confirmed above at Low/Medium and deferred. brief.md and PROVENANCE.md are markdown/ledger, outside the TS checklist. No type/security/tenant rules apply (client-side arcade clone, no backend, no tenancy).

### Devil's Advocate
Argue this is broken. **(1) "The decode names the wrong game."** The header says `WAS T2SOUN` — maybe `.1C` is a stray sound file from another Atari title, not Missile Command. Rebuttal: the *current* title is `W3SOUN`, and `W3`/`WWIII` is the source tree's own codename for Missile Command (MISSIL.DOC.txt:1 "MISSILE COMMAND (WW3)", W3DSUP.MAC:1 `.TITLE W3DSUP-WWIII`); `WAS T2SOUN` records that the module was *adapted from* an earlier project, which is exactly why it still carries a shared POKEY driver. **(2) "The fingerprint isn't unique."** Rebutted by direct enumeration: only `.1C` is COND65-yes AND W3COMN-no; the other four fail one half. **(3) "Inventory-complete is a lie — there are six ROMs."** Rebutted: the claim is scoped to the five *source modules* in the link string, and 035825/ROM5 is a burn-slice of the same assembled image, not a module; the test only walks `.1A`–`.1E`. **(4) "The AC isn't satisfied because PROVENANCE.md isn't committed."** Rebutted: `reference/` is gitignored by explicit copyright-wall design; PROVENANCE.md *is* updated locally (the skipIf block passes locally, 16/16) and the committed record lives in brief.md — the AC's two targets are both updated, one locally and one tracked, and this is documented in three places. **(5) "The whole-file test anchors are vacuous."** Rebutted: they are redundant, not vacuous — each still fails if W3SOUN/method is absent entirely, and the discriminating line-scoped test exists alongside them; still, I confirmed them as #25 nits and filed the hardening. **(6) "A confused future editor breaks the `idx+4` window silently."** Granted as the one finding with teeth — but it is currently correct and non-blocking; filed for follow-up. Nothing here rises to a correctness or security defect. Verdict stands: APPROVED.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.