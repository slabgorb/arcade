---
story_id: "cp1-2"
jira_key: "cp1-2"
epic: "cp1"
workflow: "tdd"
---
# Story cp1-2: Citation checker + claims JSON — the dossier becomes machine-verified before any constant is transcribed

## Story Details
- **ID:** cp1-2
- **Jira Key:** cp1-2
- **Workflow:** tdd
- **Stack Parent:** none (standard story)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-18T20:28:21Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T19:47:44Z | 2026-07-18T19:49:59Z | 2m 15s |
| red | 2026-07-18T19:49:59Z | 2026-07-18T20:08:42Z | 18m 43s |
| green | 2026-07-18T20:08:42Z | 2026-07-18T20:19:19Z | 10m 37s |
| review | 2026-07-18T20:19:19Z | 2026-07-18T20:28:21Z | 9m 2s |
| finish | 2026-07-18T20:28:21Z | - | - |

## Delivery Findings

### TEA (test design)
- **Gap** (non-blocking): the two study-session drifts named in AC-2 are *not individually identified* anywhere in the repo. `open-questions.md:31` records only "two agent-run drifts corrected before commit" and `rom-source-study/SKILL.md` says both were LINE-NUMBER off-by-ones (verbatim text right, line off by one); the corrections landed *before* the single dossier commit (`ef0122d`), so git history cannot recover which two citations they were. Affects `docs/rom-study/open-questions.md` (a future doc pass could name them). *Mitigated in this test design:* the AC-2 coverage suite byte-verifies **every** primary citation, which is strictly stronger than pinning just the two — whichever they were, they cannot silently re-drift.
- **Improvement** (non-blocking): `open-questions.md:30-36` (question 5, "The citation checker is not built yet") is resolved by this story. After GREEN, that question should be struck from the dossier. Affects `docs/rom-study/open-questions.md`. *Found by TEA during test design.*
- **Question** (non-blocking, routes to cp1-3): the checker's file resolution searches `[root, revision.v4/]` only — sufficient for every cited file in brief.md + glossary.md (verified). The vendored tree also carries `revision.v2/` (picture/sync ROMs — cp1-3's quarry) and `revision.v3/`. If cp1-3 cites a `revision.v2/` source line, that story must extend the checker's search path. Affects `centipede/tools/audit/check-citations.mjs` (GREEN). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): `docs/rom-study/open-questions.md:30-35` (question 5, "the citation checker is not built yet") is now resolved by this story but was left unstruck — not part of this story's explicit GREEN scope (no test references it), and editing it risked scope creep beyond the checker + claims conversion. Affects `docs/rom-study/open-questions.md`. *Found by Dev during implementation; carried forward from TEA's identical Improvement finding.*
- **Question** (non-blocking, routes to cp1-3 per TEA): confirmed at GREEN time — `revision.v2/` and `revision.v3/` remain outside `check-citations.mjs`'s `REVISION_SUBDIRS` search path (`['', 'revision.v4']`). If cp1-3 (picture ROMs) cites a `revision.v2/` source line, it must extend that array. Affects `centipede/tools/audit/check-citations.mjs`. *Found by Dev during implementation, confirming TEA's finding still holds post-GREEN.*

### Reviewer (code review)
- **Improvement** (non-blocking, routes to cp1-3): `resolveInTree` (`check-citations.mjs:83-93`) resolves a `file` containing `/` (or absolute) by direct `join`+`existsSync` with no in-tree containment check — a claim citing `../../../etc/passwd` would resolve outside the vendored tree (and could echo a line into the mismatch error output). Harmless under the current threat model (input is repo-committed JSON authored by TEA/Dev, itself byte-verified; not external input), and the slash-branch is a deliberate feature — it is exactly how cp1-3 will cite a `revision.v2/…` file explicitly once it extends the search path. Recommend a one-line containment assertion (resolved path startsWith the vendored root) when cp1-3 broadens the claim source. Affects `centipede/tools/audit/check-citations.mjs`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, doc pass): `docs/rom-study/open-questions.md:30-36` (question 5, "the citation checker is not built yet") is resolved by this story but left unstruck — correctly deferred out of GREEN scope by both TEA and Dev (no test references it). A future doc pass should strike it. Affects `docs/rom-study/open-questions.md`. *Confirmed by Reviewer; carried from TEA + Dev findings.*


## Impact Summary

**Blocking findings:** None. Single-round review; Reviewer verdict APPROVED.

**Non-blocking findings:** 5 total (all routed or deferred; no story exit-criteria impact)
- **Deferred/routed:** 2 findings → cp1-3 (revision.v2/v3 search-path extension, path-traversal assertion)
- **Deferred/doc pass:** 2 findings → future doc chore (strike `open-questions.md` q5, cosmetic clean)
- **Mitigated:** 1 finding (two study-session drifts unidentifiable → mitigation: byte-verify all citations)

**Acceptance criteria:** All 4 ACs verified by Reviewer
1. **AC-1 (drift detection):** Permanent byte-teeth in fixtures (BY-2 altered verbatim, BY-3 off-by-one line, WS-3 dropped leading space); recorded red evidence (RX-1 line 2→3) captured and reverted.
2. **AC-2 (dossier coverage):** 51 claims cover all 55 primary-source citations; every claim re-opens byte-for-byte against the vendored tree (independent re-verification clean).
3. **AC-3 (schema-only degradation):** `vendoredRoot: null` (CI absence) skips byte-checks only; schema-errors still bite (DG-2 verified); 12 pass/11 skip/exit 0.
4. **AC-4 (file resolution):** Root rev-1 files (`CENDEF.MAC`) and `revision.v4/` files (`CENTI4.MAC`/`CENIR4.MAC`) both resolve; `.DOC`/`.MAP` citations accepted.

**Files changed:** 9 (check-citations.mjs, .d.mts, claims/*.json ×5, citations.test.ts, purity.test.ts)

**Test summary:** 61/61 green (citations 23/23, purity 13/13, full suite passing)

**Deviation count:** 6 deviations documented and accepted (function rename, dropped never-shipped gate, scoped Date aliasing ban, MAME corroboration schema-only, dead-code fixture removal, section-scoped claim IDs)

**Ready for finish:** Yes. All phases complete; PR merged (0bed329 on origin/develop); no blocking findings; no sibling-checkout race; merge safety verified.

## Design Deviations

### TEA (test design)
- **Function renamed `checkFindings` → `checkClaims`:** Port source uses `checkFindings`; the single-sided schema is "claims", so the exported name is `checkClaims(claims, { vendoredRoot }) → string[]`. Reason: single-sided vocabulary (rom-source-study skill), no findings/ours/theirs.
- **Dropped tempest's `LINKED_MODULES` never-shipped rejection:** tempest rejects citations to modules absent from the link string. Centipede citations legitimately reference `.DOC`/`.MAP` files (Ed Logg's design doc, the ROM part ledger, the link map) as *primary design intent* (`brief.md` §4). Reason: existence-in-the-vendored-tree is the gate here, not link-string membership; a "never-shipped" gate would reject valid doc citations.
- **Date-aliasing ban is declarator-scoped, not bare `=\s*Date\b`:** SM scope said `=\s*Date\b`; tests use `\b(?:const|let|var)\s+[\w$]+\s*=\s*Date\b`. Reason: a bare `=\s*Date\b` false-positives on `type X = Date`, `<T = Date>` generic defaults, and would need to exclude `: Date` — the declarator scope is the faithful realization of the SM's "assignment form only" and is proven by dedicated type-context negative fixtures.
- **MAME corroboration is schema-checked but never byte-opened; AC-2 coverage is scoped to primary-source citations:** `centiped.cpp` lives outside the vendored tree and is absent from CI, so it cannot be re-opened (a citation that cannot be re-opened is not evidence). Reason: byte-verification stays inside the vendored tree; MAME rides along as optional `corroboration`, and the suite asserts it is *wired* (≥1 claim corroborates the three-way timebase) without demanding exhaustive MAME coverage.

### Dev (implementation)
- **Removed the RED-phase `baseClaim` fixture in `tests/audit/citations.test.ts`:** it was declared (`const baseClaim = {...}`, line 87) but never referenced by any test — `noUnusedLocals` failed both `npm run build` and `npm run lint` (TS6133). Verified via grep that no test used it (directly or via spread) before deleting; all 23 citation tests still pass unchanged. Reason: dead RED-authoring artifact, not a behavior change — required for the build/lint-clean exit criteria.
- **Claim IDs use section-scoped prefixes (RS-/RX-/TB-/DB-/GL-), not a flat sequence:** groups claims by dossier section (revision-and-shipped, radix, timebase, docs-and-board, glossary) across 5 files rather than tempest's one-finding-per-file convention. Reason: 51 single-sided claims are lighter-weight than tempest's audit findings (no `reasoning`/`verdict` prose per entry), so grouping by dossier section keeps the claims/ directory navigable without 51 near-empty files.
- **Range-citation anchor lines chosen for relevance, not always the range's first line:** e.g. `CENIRQ.MAC:268-280`'s anchor is line 273 (`LDA GTIME ;INCREMENT GAME TIMER`) rather than line 268, because the claim text is specifically about the GTIME-wrap arithmetic the brief describes, and the checker only needs the anchor inside `[start,end]` — never at a fixed offset. Confirmed in the type contract's guidance ("a claim pinning a single anchor line within the range").

## Story Acceptance Criteria

1. npm test -- citations re-opens every claim byte-for-byte against the vendored tree; a deliberately drifted line number or altered verbatim fails the suite (prove red once).
2. Every citation in docs/rom-study/brief.md and glossary.md exists as a claims/*.json entry; the two dossier drifts corrected during the study session stay correct.
3. Checker runs schema-only without the vendored tree; CI (which lacks it) is green.
4. Both revision.v4/ and root rev-1 file citations resolve (the dossier cites both).

## Scope Notes

**Primary:** Port tempest/tools/audit + tests/audit/citations.test.ts with the "ours" side dropped (single-sided schema per the rom-source-study skill: id, claim, source{file,line,verbatim}, corroboration?). Convert docs/rom-study/ brief+glossary citations into docs/rom-study/claims/*.json.

**Secondary:** Carry-forward purity-scanner hardening from cp1-1 Reviewer findings. Add cheap bans to centipede/tests/purity.test.ts:
- `\bglobalThis\b` (global-object aliasing)
- `dynamic import\s*\(`  (dynamic imports)
- `eval\s*\(` / `new Function` (code generation)
- Consider: `const d = Date` (Date aliasing — assignment ban `=\s*Date\b`)

These are evasion patterns to keep src/core pure.

## Session Branch
**Branch Strategy:** gitflow (feat/cp1-2-citation-checker-claims off origin/develop)

## Sm Assessment

**Setup verified:** session file created, feature branch `feat/cp1-2-citation-checker-claims` checked out in centipede off origin/develop, story/epic context files in place (epic context verified byte-identical to its committed cp1-1 state — no clobber), epic YAML flipped to in_progress. Merge gate clear (no open centipede PRs); no sibling-checkout race (origin/develop logs show no cp1-2 activity).

**Story shape:** 3pt, `workflow: tdd` explicit in the epic YAML. Repo is centipede only — no orchestrator-side edits expected this story (the vendored tree lives at the ORCHESTRATOR path `reference/atari-source/centipede`, but the checker only READS it; nothing in the orchestrator repo changes).

**Hazards routed to TEA (O'Brien):**
- Port quarry: `tempest/tools/audit` + `tempest/tests/audit/citations.test.ts`, with the `ours` side DROPPED — single-sided schema (id, claim, source{file,line,verbatim}, corroboration?). Do not carry tempest's two-sided ours/theirs machinery.
- The checker must degrade gracefully: byte-for-byte against the vendored tree when present (dev machines), schema-only when absent (CI has no reference/ tree). AC-3 hinges on this split.
- AC-4: the dossier cites BOTH `revision.v4/` files and root rev-1 files; both must resolve. The vendored tree also carries `revision.v2/` picture ROM binaries (cp1-3's quarry, not this story's).
- Reference files may be CRLF (red-baron lesson): greps can silently return nothing; the checker's byte-for-byte comparison must decide and document how it treats line endings, and TEA should verify actual line-endings in the vendored tree before trusting failed greps.
- Tempest citation-gate trap (recorded lesson): ANY edit to a cited file shifts pinned lines — the claims must pin against the VENDORED tree (read-only, pinned dbbe6de), which never shifts. Dossier files themselves are the claim SOURCE (converted to claims/*.json), not cited targets.
- AC-2 names "the two dossier drifts corrected during the study session" — TEA must identify these from docs/rom-study/ (open-questions.md / study session record) and pin them so they stay correct.
- Secondary scope (cp1-1 Reviewer carry-forward): purity-scanner hardening — ban `\bglobalThis\b`, dynamic `import(`, `eval(`/`new Function` in src/core; weigh the `=\s*Date\b` aliasing ban (false-positive risk on type annotations was already noted — assignment form only). Fixture self-tests for any new ban (sidecar lesson: purity scanners need fixture self-tests — strings, comments, lookalikes).
- AC-1 demands a proven red: a deliberately drifted line number or altered verbatim must fail the suite once, recorded in story notes.

**Peloton mode:** subagent peloton (user-directed) — SM drives phases via inline subagents; phase agents write their sections into this session file.

**Routing:** phased tdd → next phase `red`, owner `tea`.

## TEA Assessment

**Tests Required:** Yes
**Reason:** cp1-2 builds real new behaviour (a citation checker) with four ACs — RED first. Secondary purity-scanner hardening is test-only (a scanner-logic edit), so those assertions are legitimately green-on-authoring (cp1-1 precedent); the RED deliverable is the citation suite.

**Claims-authoring ruling (decided + documented):** **Claims are DATA; the checker is CODE** — the tempest precedent (`docs/audit/findings/*.json` is data, `check-citations.mjs` is code). Therefore **Dev (GREEN) authors both** the checker (`tools/audit/check-citations.mjs`) **and** the dossier conversion (`docs/rom-study/claims/*.json`). **TEA authored only** this suite, the checker's **type contract** (`tools/audit/check-citations.d.mts` — interface, no logic, the analog of tempest's existing `.d.mts`), and **inline seed fixtures** built from citations I verified by hand this session. TEA did NOT write the real `claims/*.json`: if it had, AC-2's coverage suite would be green at RED time (no TDD). Leaving claims to Dev makes the coverage suite genuinely RED on an empty `claims/` and drives the conversion.

**Test Files:**
- `centipede/tests/audit/citations.test.ts` (new, 23 tests) — the citation gate. Mirrors `tempest/tests/audit/citations.test.ts`, `ours` side dropped. Pins:
  - **Schema teeth** (6, run everywhere): well-formed single-sided claim accepted; missing/empty `id`, duplicate `id`, empty `claim`, malformed `source` (missing file / non-positive line / missing verbatim) rejected; optional `corroboration` accepted well-formed, rejected malformed, never byte-opened.
  - **Graceful degradation AC-3** (2, run everywhere): with `vendoredRoot: null`, a *wrong* verbatim passes (byte-check skipped → CI green) but a schema error still bites.
  - **Byte teeth + drift AC-1** (5, `skipIf(!vendored)`): matching verbatim accepted; **altered verbatim FAILS**; **off-by-one line FAILS** (the exact study-session drift shape); past-EOF line fails; leading whitespace + internal tabs preserved, only trailing whitespace tolerated (the space-indented `COIN65.MAC:11` fixture — dropped leading space FAILS).
  - **File resolution AC-4** (4, `skipIf(!vendored)`): bare root rev-1 filename (`CENDEF.MAC`) resolves; bare rev-4 filename (`CENTI4.MAC`/`CENIR4.MAC`, which live only under `revision.v4/`) resolves; a file in neither errors; **`.DOC`/`.MAP` citations accepted** (no ported never-shipped gate).
  - **AC-2 dossier coverage** (4, run everywhere): dossier files exist; extractor finds >20 primary citations (teeth); **every primary `FILE:LINE(-LINE)` in brief.md + glossary.md is covered by a claim** (reports the uncovered list); MAME corroboration is wired (≥1 claim corroborates `centiped.cpp`).
  - **Real-claims byte side AC-1/2/4** (2, `skipIf(!vendored)`): `claims/` non-empty; every committed claim re-opens byte-for-byte — this is what keeps the two study drifts (and every line number) correct forever.
- `centipede/tools/audit/check-citations.d.mts` (new) — the `checkClaims`/`Claim`/`CheckOpts` type contract Dev implements.
- `centipede/tests/purity.test.ts` (extended, +5 self-tests, +5 BANNED rules) — cp1-1 Reviewer hardening: `globalThis`, dynamic `import(`, `eval(`, `new Function(`, declarator-scoped Date aliasing. Each new ban carries the full sidecar matrix (live flags / comment / string / lookalike does NOT), incl. the type-context negatives (`: Date`, `type X = Date`, `<T = Date>`) and the `import.meta` / static-import negatives.

**Tests Written:** 28 (23 citations + 5 purity self-tests) covering 4 ACs + the secondary scope.
**Status:** RED (citations) — ready for Dev.

**RED verification evidence** (via `testing-runner` subagent, this dev machine, vendored tree present so the `skipIf` blocks RAN):
- `npm test -- citations` → exit 1; **21 failed | 2 passed (23)**. 19 fail with the self-describing `citation checker not built yet — GREEN (Julia) creates centipede/tools/audit/check-citations.mjs …`; coverage fails `these dossier citations have no claims/*.json entry` (50+ listed); `MAME corroboration` and `non-empty claims/` fail on the empty dir. **No collection/import/syntax errors** — every test ran and failed an assertion (genuine RED, not a harness error). The 2 passers are the dossier-sanity guards.
- `npm test -- purity` → exit 0; **13 passed (13)** — the 5 new hardening self-tests pass, core sweep stays clean.
- `npm test` (full) → exit 1; **21 failed | 40 passed (61)** — failures are citations-only; scaffold + purity unchanged. No regressions.
- On CI (no orchestrator `reference/` tree) the `skipIf(!vendored)` blocks skip and the whole suite is green after GREEN — AC-3.

**Rule Coverage (lang-review/typescript.md):**

| Rule | Status | Note |
|---|---|---|
| 1 Type-safety escapes | Justified | `as unknown as Claim` / `as unknown as Claim['source']` / `42 as unknown` in fixtures construct **deliberately type-invalid inputs** to exercise the validator's rejection paths — not to silence a real type error (rule #8's forbidden case). This is the only way to test a runtime schema guard. No `as any`, no `@ts-ignore`, no non-null assertions. |
| 2 Generic/interface | Pass | `CheckClaims` is a specific signature `(claims: Claim[], opts:{…}) => string[]`, not the `Function` type. `corroboration?: unknown` (not `any`). `let cb: Function` appears only as a **scanned string fixture** in purity, not real code. |
| 3 Enum anti-patterns | N/A | No enums. |
| 4 Null/undefined | Pass | `process.env.CENTIPEDE_SOURCE_DIR ?? default` and `c.corroboration ?? ''` use `??` (values that can be `""`); `existsSync` guards before every read. |
| 5 Module/declarations | Pass | `import type { Claim }` for the type-only import (never used at runtime — correct under isolatedModules); explicit `.mjs`/`.d.mts` companion (tempest convention); bundler resolution (vitest), so `node:*` imports need no `.js`. |
| 6 React/JSX | N/A | No JSX. |
| 7 Async/Promise | Pass | `loadChecker(): Promise<CheckClaims>`; every call `await`ed; dynamic `import()` is deliberate lazy-load of the not-yet-built module (the RED mechanism), typed via the `.d.mts`. |
| 8 Test quality | Pass | Fixtures use real verified citations read from the tree (`vendoredLine`) so "matching" cases can't rot; drift cases mutate the real line. No vacuous assertions — every RED failure names the missing artifact. Casts justified under rule 1. |
| 9 Build/config | Pass | No config touched; `strict` stays on. |
| 10 Input validation | Pass (this IS the story) | The checker is a runtime schema+byte validator; the suite pins that it rejects malformed claims and never trusts a `source` it hasn't re-opened. |
| 11 Error handling | Pass | `loadChecker` catches `unknown`, narrows via `(e as Error).message`, and re-throws WITH context (names the file GREEN must create). |
| 12 Performance/bundle | N/A | Test/tooling code, not a hot path. |

**Notes for Dev (Julia) — GREEN spec:**
Build `centipede/tools/audit/check-citations.mjs` exporting `checkClaims(claims, { vendoredRoot }): string[]` to satisfy `check-citations.d.mts`, then convert the dossier into `docs/rom-study/claims/*.json`. Port `tempest/tools/audit/check-citations.mjs` and **delete** the `ours`/`class`/`recommendation`/`remediated_by`/`LINKED_MODULES` machinery.
1. **Schema** per claim: non-empty unique `id`; non-empty `claim`; `source` = `{file: non-empty string, line: positive int, verbatim: string}`; optional `corroboration` (object or non-empty string; if object, any `line` is a positive int and any `file`/`verbatim`/`note` are strings) — **never byte-open corroboration**.
2. **Byte verify** only when `vendoredRoot` is non-null: resolve `source.file` **root-first, then `revision.v4/`** (a `file` already containing a `/` is an exact tree-relative path); read the line; compare `.trimEnd()` both sides (tolerate trailing WS, preserve leading spaces + internal tabs). Emit one error per bad claim naming `id file:line` + cited-vs-actual. Unresolvable file / past-EOF line → error, never a crash.
3. **`vendoredRoot: null`** (CI): skip all byte checks, run schema only → green.
4. **Claims conversion:** one machine-checkable claim per primary `FILE:LINE(-LINE)` citation in `brief.md` + `glossary.md`. Range citations (`CENIRQ.MAC:264-265`) → a claim pinning a single anchor line **within** the range (its verbatim). Files: rev-1 cited bare = `CENDEF.MAC`, `CENIRQ.MAC`, `CENTI.MAC`, `CENPIC.MAC`, `SYNC.MAC`, `COIN65.MAC`, `CENTI.DOC`, `CENTIP.DOC`, `CENTI.MAP`; rev-4 cited bare = `CENTI4.MAC`, `CENIR4.MAC`, `CENTS4.MAC`, `CENDE4.MAC` (resolve under `revision.v4/`). Put ≥1 MAME `corroboration` on the timebase claim (`centiped.cpp:22-25`/`:25` — three-way corroboration, §3).

**Traps (restated):**
- **Vendored tree is at the ORCHESTRATOR** `../reference/atari-source/centipede`, NOT inside the subrepo — a standalone clone / CI won't have it; that absence IS the AC-3 schema-only path. Don't reach into it from a *core* module (purity) — only tooling/tests read it.
- **Line endings are LF** across the whole vendored tree (verified: `file` says ASCII, zero CR bytes; `.gitattributes` `text=auto` normalizes). The red-baron CRLF trap does **not** bite here — but the byte compare should split on `\n` and `.trimEnd()`, which is CRLF-safe anyway.
- **`revision.v4/` vs root is the AC-4 crux:** `CENTI4.MAC` exists **only** under `revision.v4/`; `CENDEF.MAC` **only** at root; `COIN65.MAC` is in both, byte-identical (md5 match) so precedence is harmless. `revision.v2/`/`v3/` are NOT searched (out of scope; cp1-3).
- **Cite the VENDORED tree, never the dossier files** — the dossier `.md` is the claim SOURCE (converted to claims), not a cited target; the tree is read-only (pin `dbbe6de`) and never line-shifts.
- **Do NOT re-add the never-shipped/`LINKED_MODULES` gate** — centipede cites `.DOC`/`.MAP` as primary design intent.
- **AC-1 "prove red once":** the permanent drift fixtures (BY-2 altered verbatim, BY-3 off-by-one line, WS-3 dropped leading space) already discharge this automatically. For the recorded-once evidence, during verify mutate ONE real claim's line by ±1, show the `every committed claim` test red, revert, and paste the red into the notes.

**RED commit:** `1dab3d2` on `feat/cp1-2-citation-checker-claims` (`test(cp1-2): failing citation-checker suite + purity hardening (RED)`); working tree clean.

**Handoff:** To Dev (Julia) for GREEN.
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `centipede/tools/audit/check-citations.mjs` (new) — the single-sided checker: `checkClaims(claims, { vendoredRoot }) → string[]`. Ports `tempest/tools/audit/check-citations.mjs` with `ours`/`class`/`recommendation`/`remediated_by`/`LINKED_MODULES` dropped. Schema: non-empty unique `id`, non-empty `claim`, `source{file,line>0,verbatim}`; optional `corroboration` (string or object with typed fields) schema-checked, never byte-opened. Byte verify only when `vendoredRoot` is non-null: resolves `source.file` root-first then `revision.v4/` (a `file` with a `/` or absolute path is treated as exact); reads the line; compares `.trimEnd()` both sides. CLI entry (`import.meta.url === file://argv[1]`) loads every `docs/rom-study/claims/*.json`, runs the checker, prints errors, exits non-zero on any.
- `centipede/docs/rom-study/claims/00-revision-and-shipped.json` (new, 12 claims) — dossier §0–1 (revision ledger, link modules, ROM part table).
- `centipede/docs/rom-study/claims/01-radix.json` (new, 8 claims) — dossier §2 (`.RADIX 16` propagation, decimal-period literals).
- `centipede/docs/rom-study/claims/02-timebase.json` (new, 10 claims) — dossier §3 (IRQ spec, SYNC/FRAME/GTIME, mainloop spin-wait, watchdog trap); carries the one MAME `corroboration` (`centiped.cpp:25`) on the IRQ-4-per-frame claim `TB-1`.
- `centipede/docs/rom-study/claims/03-docs-and-board.json` (new, 2 claims) — dossier §4–5 (CENTIP.DOC provenance, playfield RAM geometry).
- `centipede/docs/rom-study/claims/04-glossary.json` (new, 19 claims) — every glossary.md row's evidence citation.
- `centipede/tests/audit/citations.test.ts` (modified, -7 lines) — removed the RED-phase `baseClaim` fixture: declared but never referenced by any test, tripped `noUnusedLocals` and failed `tsc --noEmit` (both `build` and `lint`). No test behavior changed — verified no test referenced it before removing.

**Claims total: 51**, converted from every primary-source citation (`FILE:LINE(-LINE)` where FILE ends `.MAC`/`.DOC`/`.MAP`) the AC-2 extractor finds in `brief.md` + `glossary.md` (55 raw matches / 51 unique `file:start-end` tuples after de-duplication — several lines are cited from both files, e.g. `CENDEF.MAC:119`, `CENDEF.MAC:61`, which a single claim covers for both). Range citations (e.g. `CENIRQ.MAC:264-265`) pin a single anchor line within the range, chosen for relevance (e.g. `CENIRQ.MAC:268-280`'s anchor is line 273, the `LDA GTIME` increment, not the range's first line). Every `verbatim` was generated by reading the real vendored-tree line via script (not hand-transcribed), so no claim can carry a transcription-drift bug of its own.

**Tests:** 61/61 passing (GREEN) — via `testing-runner` subagent, three separate runs (agent IDs `a6bb2e1f1e74aab14` initial, `abf5c5d66b7dcf533` red-evidence capture, `a65790e5a11fc77ce` final verify):
- `npm test -- citations` → 23/23 passed
- `npm test -- purity` → 13/13 passed (cp1-1 core sweep + cp1-2 hardening self-tests untouched)
- `npm test` (full) → 61/61 passed
- `npm run build` → exit 0 (tsc --noEmit && vite build)
- `npm run lint` → exit 0 (tsc --noEmit)

**AC walkthrough:**
1. **npm test -- citations re-opens every claim byte-for-byte; a drift fails once (proven).** All 5 byte-teeth tests pass permanently (BY-2 altered verbatim, BY-3 off-by-one line, WS-3 dropped leading space each redden their own fixture). Recorded-red evidence (this session, reverted after capture): mutated real claim `RX-1`'s `source.line` from 2→3 (an off-by-one drift, the exact study-session shape) in `01-radix.json`, ran `npm test -- citations` via testing-runner:
   ```
   ❯ tests/audit/citations.test.ts (23 tests | 2 failed)
     × every primary-source citation in brief.md + glossary.md has a covering claim
       AssertionError: these dossier citations have no claims/*.json entry:
         CENDEF.MAC:2: expected [ 'CENDEF.MAC:2' ] to deeply equal []
     × every committed claim passes the checker against the vendored tree
       AssertionError: expected [ Array(1) ] to deeply equal []
       + [ "RX-1: source CENDEF.MAC:3 does not match verbatim
       +   cited:  \"\t.RADIX 16\"
       +   actual: \"\t.ASECT\"" ]
   Test Files  1 failed (1)
        Tests  2 failed | 21 passed (23)
   ```
   Both the coverage check (line 2 now uncovered) and the byte check (line 3 is `.ASECT`, not `.RADIX 16`) reddened correctly. Reverted `01-radix.json` to line 2; re-verified 61/61 GREEN.
2. **Every brief.md/glossary.md citation has a claims/*.json entry; the two study-session drifts stay correct.** AC-2 coverage test passes: all 51 unique dossier citations covered. The two drifts named in `open-questions.md:31` could not be individually identified (TEA's Delivery Finding — git history has no record of which two lines were corrected pre-commit); per TEA's mitigation, the AC-2 coverage suite byte-verifies *every* citation, strictly stronger than pinning just the two — whichever they were, `every committed claim passes the checker` now guards them (and all 49 others) forever.
3. **Schema-only without the vendored tree; CI is green.** `vendoredRoot: null` skips every byte-check branch (verified by the DG-1/DG-2 tests, unconditional). The `describe.skipIf(!vendoredAvailable)` blocks (byte teeth, file resolution, real-claims byte side) will skip entirely in CI, which clones only the centipede subrepo and lacks `../reference/atari-source/centipede`. Confirmed by code inspection matching the tempest precedent's proven pattern — CI does not have the orchestrator tree by construction.
4. **Both revision.v4/ and root rev-1 citations resolve.** `resolveInTree` tries root first (`join(vendoredRoot, '', file)`) then `revision.v4/`. R1-1 (`CENDEF.MAC`, root-only) and R4-1/R4-2 (`CENTI4.MAC`/`CENIR4.MAC`, revision.v4/-only) all pass; `COIN65.MAC` (present both places, byte-identical) resolves via root without ambiguity. `revision.v2/`/`revision.v3/` are not in `REVISION_SUBDIRS` — out of scope, confirmed by NF-1 (a file in neither errors, not crashes).

**Branch:** `feat/cp1-2-citation-checker-claims`
**Commits:** RED `1dab3d2` → GREEN `cf79e67` (`feat(cp1-2): citation checker + claims JSON (GREEN)`), pushed to `origin/feat/cp1-2-citation-checker-claims`.

**Handoff:** To Reviewer.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|---|---|---|---|---|
| 1 | `reviewer-preflight` | Yes | ✅ Ran | 9 files +1298/-0, clean tree; 51 claims (12/8/10/2/19); `console.log` only in the CLI-entry guard, none in `checkClaims`; no empty catches / TODO; `ours`/`LINKED_MODULES`/`remediated_by` in **comments only** (clean single-sided port); test imports the real module (line 70). Flagged `resolveInTree` slash/absolute path has no traversal guard. | Accepted — traversal filed as LOW Delivery Finding (trusted input); rest confirms clean port. |
| 2 | `testing-runner` | Yes | ✅ Ran | `citations` 23/23; `purity` 13/13; full **61/61**; `build`+`lint` exit 0. **AC-3** (`CENTIPEDE_SOURCE_DIR=/nonexistent`): **12 pass \| 11 skip, exit 0** — schema-only green with tree absent. | Accepted — independently confirms all gates + AC-3 degradation. |
| 3 | `reviewer-edge-hunter` | Skipped | ⏭️ Disabled | Disabled via settings (peloton config). Compensated by Reviewer's own independent claim re-open + coverage-completeness scripts. | Self-assessed. |
| 4 | `reviewer-silent-failure-hunter` | Skipped | ⏭️ Disabled | Disabled via settings. Reviewer verified: no empty catches; `lineAt`→`undefined` (not throw) on missing/past-EOF; `loadChecker` re-throws with context. | Self-assessed. |
| 5 | `reviewer-test-analyzer` | Skipped | ⏭️ Disabled | Disabled via settings. Reviewer verified fixtures read real vendored lines (non-rotting); coverage sweep non-vacuous (>20 teeth, 55 extracted). | Self-assessed. |
| 6 | `reviewer-comment-analyzer` | Skipped | ⏭️ Disabled | Disabled via settings. Comments reviewed inline (port rationale accurate). | Self-assessed. |
| 7 | `reviewer-type-design` | Skipped | ⏭️ Disabled | Disabled via settings. `.d.mts` contract reviewed inline. | Self-assessed. |
| 8 | `reviewer-security` | Skipped | ⏭️ Disabled | Disabled via settings. Path-traversal surface reviewed inline (LOW, trusted input). | Self-assessed. |
| 9 | `reviewer-simplifier` | Skipped | ⏭️ Disabled | Disabled via settings. One cosmetic redundancy noted (`.flat()` after `flatMap`). | Self-assessed. |

**All received:** Yes (2 enabled returned — `reviewer-preflight` + `testing-runner`; 7 other reviewer specialists disabled via peloton settings and self-assessed by Reviewer).

## Reviewer Assessment

**Verdict:** ✅ **APPROVED**

No Critical or High findings. Two LOW/non-blocking observations. All 4 ACs hold with independently-reproduced evidence; the 51 claims are the epic's ground-truth gate and I re-verified them against the vendored tree with tooling that does **not** share the checker's code.

**Data-flow trace (a claim → verdict):**
`docs/rom-study/claims/*.json` entry → CLI/`loadClaims()` `readdirSync`+`JSON.parse`+`flatMap` → `checkClaims(claims, { vendoredRoot })` → per claim: schema guard (`isCitation` / `isValidCorroboration`) → **if `vendoredRoot` non-null**: `resolveInTree` (root-first, then `revision.v4/`; a slash/absolute `file` is an exact path) → `lineAt` (cached `readFileSync('utf8').split('\n')`) → `actual.trimEnd() === verbatim.trimEnd()` → one error string per mismatch → CLI prints + `exit 1`, or test asserts `[]`.
**Safe because** the input is repo-committed trusted JSON; every branch that cannot re-open a line — `vendoredRoot: null` (CI), unresolved file, past-EOF — degrades to an error string or a `skipIf` skip, **never a crash**; `trimEnd` tolerates only trailing whitespace (the sole faithful-to-source variance), proven by WS-1/WS-2/WS-3 (a dropped **leading** space fails).

**Observations (≥5):**
1. **[VERIFIED] The 51 claims re-open byte-for-byte — confirmed by an INDEPENDENT reader.** A standalone script (not the checker's code) re-opened all 51 against the vendored tree: **0 mismatches (trimEnd), 0 duplicate ids, 0 CR bytes** in every cited file. `od -c` spot-checks confirmed whitespace fidelity: `COIN65.MAC:11` is space-indented (RX-5), `CENDEF.MAC:2` is tab-indented (RX-1), `CENDEF.MAC:277`/`:119` tabs preserved. `CENTI.DOC` (which `file` misreports as "RPF") is 100% printable ASCII — the checker reads it correctly. Ground-truth gate is sound for cp1-4/cp1-5 to cite.
2. **[VERIFIED] AC-3 degradation is real, not a rubber stamp.** With `CENTIPEDE_SOURCE_DIR` pointed at a nonexistent dir: **12 pass, 11 skip, exit 0.** Schema-only does **not** pass everything — DG-2 shows a schema error (`empty id`) still bites; only byte-checks skip. AC-2 coverage runs even in CI (it reads only the in-repo dossier + claims), so the gate is *stronger* than "skip when no tree".
3. **[VERIFIED] Coverage extractor is complete and non-vacuous.** It extracts **55 citations (51 unique, >20 teeth)** and requires every one covered (proven RED on empty `claims/`, per TEA). A broader net (any code extension, in/out of backticks) surfaced nothing genuinely unpinned — the lone `CENTI4.MAC:905,1001` "miss" is a comma-list that the per-part split covers via GL-18 + GL-19. MAME's 11 `centiped.cpp` refs are correctly excluded from byte-coverage (external, never re-opened) while TB-1 wires the required corroboration.
4. **[VERIFIED] Dev's `baseClaim` deviation audited at commit level — zero behavior change.** The **only** RED→GREEN edit to `citations.test.ts` is deletion of a 7-line fixture; `grep` confirms `baseClaim` occurred **once** in RED (the declaration, never spread). No assertion/`describe`/expectation touched, and the `.d.mts` contract + `purity.test.ts` are **untouched** RED→GREEN — the RED test contract was preserved. Clean TDD.
5. **[VERIFIED] AC-1 drift detection + AC-4 resolution.** BY-2 (altered verbatim), BY-3 (off-by-one line), WS-3 (dropped leading space) redden permanently; Dev's one-time recorded red (RX-1 line 2→3) is captured. `CENDEF.MAC` (root-only) and `CENTI4.MAC`/`CENIR4.MAC` (`revision.v4/`-only) both resolve against the actual tree layout I inspected; NF-1 **errors, not crashes** on a file in neither; `.DOC`/`.MAP` accepted (no never-shipped gate).
6. **[LOW] `resolveInTree` has no path-traversal containment (`check-citations.mjs:83-93`).** A slash/absolute `file` resolves outside the tree. Non-blocking: input is trusted repo-committed JSON, and the slash-branch is the intended mechanism for cp1-3's explicit `revision.v2/…` citations. Suggest a `resolved.startsWith(root)` assertion when cp1-3 broadens the source. (Delivery Finding filed.)
7. **[LOW] Cosmetics.** Redundant `.flat()` after `flatMap` in the test's `loadClaims()` (`citations.test.ts:433`); an empty-object `corroboration: {}` passes `isValidCorroboration`. Both harmless.

**Rule Compliance (lang-review/typescript.md — every rule vs the GREEN diff):**

| Rule | Status | Evidence |
|---|---|---|
| 1 Type-safety escapes | Pass | Checker `.mjs` is plain JS, no casts. Tests use `as unknown as Claim` only to construct deliberately type-invalid inputs for the validator (justified, rule-1 exception). No `any`, no `@ts-ignore`, no `!`. |
| 2 Generic/interface | Pass | `Claim`/`CheckOpts` are specific interfaces; `corroboration?: unknown` (not `any`); `checkClaims` a concrete signature. |
| 3 Enum anti-patterns | N/A | No enums. |
| 4 Null/undefined | Pass | `??` for env default + `corroboration ?? ''`; optional chaining `c?.id`; `existsSync` guards before every read. |
| 5 Module/declarations | Pass | `.d.mts` companion for the plain `.mjs` (tempest convention); `import type { Claim }`; `node:*` imports. |
| 6 React/JSX | N/A | None. |
| 7 Async/Promise | Pass | `loadChecker` async + awaited; dynamic `import()` is the deliberate RED lazy-load, typed via `.d.mts`. |
| 8 Test quality | Pass | Fixtures read real vendored lines (`vendoredLine`) so "match" cases can't rot; drift cases mutate the real line; no vacuous assertions — every RED failure names the missing artifact. |
| 9 Build/config | Pass | No config touched; `strict` on; `build` + `lint` exit 0. |
| 10 Input validation | Pass (this IS the story) | Runtime schema+byte validator; never trusts a `source` it hasn't re-opened. |
| 11 Error handling | Pass | No empty catches; `lineAt` returns `undefined` (not throw) on missing/past-EOF and `checkClaims` maps that to an error string; `loadChecker` narrows `unknown` and re-throws with context. |
| 12 Performance/bundle | N/A | Tooling; `lineCache` avoids re-reads. |

**Devil's Advocate (assume it's subtly broken):**
- *Path traversal in `source.file`?* Real surface (LOW) but out of threat model — trusted committed input; filed as a finding.
- *Claim files not actually enumerated?* No — CLI + test both `readdirSync`/filter `.json`/`flatMap`; I loaded exactly 51.
- *Coverage test vacuous?* No — 55 real citations extracted, `>20` teeth, every one checked; went RED on empty `claims/`.
- *Schema-only path silently passing everything?* No — DG-2 proves a schema error still bites with the tree absent; only byte-checks skip.
- *Line-ending normalization hiding real drift?* No — tree is LF-only (0 CR bytes verified); `trimEnd` strips only trailing WS (CRLF-safe by side effect); WS-3 proves leading-WS/content drift still fails.
- *`trimEnd` masking content drift?* No — only trailing whitespace is tolerated; leading spaces + internal tabs are compared (WS tests).

**Deviation Audit:**
- TEA-1 `checkFindings → checkClaims` — ✓ **ACCEPTED** — single-sided vocab (rom-source-study skill); matches the `.d.mts` contract and all tests.
- TEA-2 dropped `LINKED_MODULES`/never-shipped gate — ✓ **ACCEPTED** — proven correct by DOC-1/DOC-2 (`.MAP`/`.DOC` accepted as primary intent, brief §4); re-adding it would reject valid claims.
- TEA-3 Date-alias declarator-scoped — ✓ **ACCEPTED** — a bare `=\s*Date\b` would false-positive on `: Date`/`type X = Date`/`<T = Date>`; declarator scope is proven by dedicated negative fixtures (all pass). Faithful to SM's "assignment form only".
- TEA-4 MAME schema-only, AC-2 scoped to primary — ✓ **ACCEPTED** — `centiped.cpp` is outside the vendored tree/CI; a citation that can't be re-opened isn't byte-evidence. Rides as optional corroboration; suite asserts ≥1 wired (TB-1).
- Dev-1 removed RED `baseClaim` fixture — ✓ **ACCEPTED** — commit-level audit: pure dead-code removal (1 occurrence, declaration only), zero behavior change, required for `noUnusedLocals`. RED contract preserved.
- Dev-2 section-scoped claim IDs (RS-/RX-/TB-/DB-/GL-) — ✓ **ACCEPTED** — organizational; globally-unique confirmed (0 dupes across 5 files).
- Dev-3 range-anchor chosen for relevance — ✓ **ACCEPTED** — checker only needs the anchor within `[start,end]`; coverage test confirms; anchor verbatim byte-verified regardless; documented in the `.d.mts`.

**Delivery-Findings Audit:** TEA's "two drifts not individually identifiable" — mitigation (byte-verify **all** citations) is strictly stronger and satisfies AC-2; accepted. `open-questions.md:31/q5` unstruck and `revision.v2/v3` search-path extension — both non-blocking, correctly deferred/routed to cp1-3 (see Reviewer findings above).

**Merge Safety:** ✅ Clean fast-forward. `git merge-base HEAD origin/develop` == `origin/develop` tip (`75a1df8`) → develop is a direct ancestor of HEAD (2 ahead, **0 behind**). **No trial-merge needed** — develop has not moved since fork. No sibling `cp1-2` branch (only `develop`/`main`/this feat branch on origin); the only `cp1-2` commits anywhere are `1dab3d2`+`cf79e67` on this branch; no open centipede PRs. No sibling-checkout race.

**Handoff:** → SM (Winston) for `finish-story`. Reviewer creates no PR/merge (human-approval gate). SM: PR targets `develop` (gitflow); suggest striking `open-questions.md` q5 during finish or filing it as a cp1-x doc chore.