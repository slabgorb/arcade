---
story_id: "df1-1"
jira_key: "df1-1"
epic: "df1"
workflow: "tdd"
---
# Story df1-1: Citation gate + src/core purity test FIRST (TDD)

## Story Details
- **ID:** df1-1
- **Jira Key:** df1-1 (local story ID; no Jira in this project)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-14T00:37:42Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T23:28:28Z | 2026-08-13T23:30:52Z | 2m 24s |
| red | 2026-08-13T23:30:52Z | 2026-08-14T00:20:24Z | 49m 32s |
| green | 2026-08-14T00:20:24Z | 2026-08-14T00:28:38Z | 8m 14s |
| review | 2026-08-14T00:28:38Z | 2026-08-14T00:37:42Z | 9m 4s |
| finish | 2026-08-14T00:37:42Z | - | - |

## Sm Assessment

Setup complete for df1-1. Session file created, story context written with technical approach and eight ACs, branch `feat/df1-1-citation-gate-purity` cut from develop, story moved to in-progress in sprint YAML. Corrected two template-carryover story ids in the ACs (millipede's ml1-2/3/4 and ml3 → defender's df1-2/df1-3 and df1-5). No Jira in this project — jira_key is the story id. Ready for TEA (red phase): the story is "gate before constants" — citation checker + citations.test.ts + purity scan committed before any game constant, with the ml1-1 hardening (unconditional containment + isFile gate) carried in the port.

## Tea Assessment

RED delivered in commit 6a06a14c (plus bookkeeping 054cec26) on feat/df1-1-citation-gate-purity. Four TEA-authored files:

1. **tests/defender-bootstrap.test.mjs** (orchestrator, node:test) — the wiring contract for the eleventh game, modeled on tests/millipede-bootstrap.test.mjs and extended with the df1-1 gate deliverables: justfile games, vitest GAMES, generated registry meta (id/title DEFENDER/year 1980 = MAME attribution/order 11/version), order-collision guard, showcase:false (ml1-5 black-canvas rule; df7 earns the flip), four-file shape, and existence of the three Dev-ported gate modules (check-citations.mjs + .d.mts, dossier-sweep.ts, purity-scanner.ts). 12 RED drivers + 1 passing anti-regression guard.
2. **plugins/defender/tests/audit/citations.test.ts** — the citation-gate suite ported from millipede's: schema teeth, graceful degradation (schema-only without the tree), byte teeth + drift (fixtures verified by hand: PHR6.SRC:11 MAPC EQU $D000; DEFA7.SRC:2-vs-3 off-by-one; INFO.SRC:1 space-indent whitespace matrix), file resolution (DEFA7.SRC:9, INFO.SRC:11, NOSUCH.SRC), the full ml1-1 hardening battery (ESC-1 escape, BARE-1 bare-.., INS-1 accept-side) PLUS a new DIR-1 fixture pinning the isFile gate distinctly (directory INSIDE the tree — containment alone passes it), and the coverage-sweep fixture teeth incl. a NEW defender/-prefix normalization contract (the epic's citation vocabulary vs bare claim filenames). Green-on-empty dossier gate armed for df1-2/df1-3.
3. **plugins/defender/tests/purity.test.ts** — the purity suite ported intact: the four story-named bans (fetch/canvas/Date/Math.random) + browser globals + hardening bans (globalThis/dynamic import/eval/new Function/Date-alias), each with the comment/string/lookalike non-flag matrix; located-form anchor; real-tree sweep armed-but-dormant until df2 lands src/core.
4. **plugins/defender/tests/scaffold.test.ts** — the plugin-internal scaffold contract (four files + src/main.ts, tsconfig extends/strict-inheritance, #game canvas + /src/main.ts module mount, private semver package, plugin.ts meta with showcase:false).

**RED verification (measured, both runners):** orchestrator — 12 bootstrap drivers red + 13 feature-shaped collateral across exactly six roster-derived suites (topology exact-set; registry.test.mjs ×4; release.test.mjs ×2; canonical-serve ×3; shared-tests-typechecked ×1 carrying the only tsc errors, the 3 missing-module TS2307s; src/host/registry.test.ts ×2 under vitest |host|). *(Composition corrected in review round 1 — R1 [DOC]: two tests originally misattributed to registry.test.mjs live in release.test.mjs.)* Nothing unrelated is red: vitest fleet otherwise 15775 passing, 1030/1031 files green. Every collateral failure names work GREEN must do; the enumeration is pinned in the bootstrap header.

**Rule Coverage:** lang-review #18 (vacuous coverage) — sweep fixture teeth + scanner fixture self-tests prove both mechanisms bite with no real dossier/core present; #26 (tautology) — the ml1-1 R5 lesson applied, located-form anchor instead of Array.isArray; harness-error trap — every not-yet-built module loads through a self-describing throw; mutation-direction — drift/escape/directory fixtures all assert the RESTRICTIVE outcome (reported, never silently read or thrown). Self-check done: no vacuous assertions, no let _ =, no always-true asserts.

**For Dev (GREEN):** copy plugins/joust/'s four files + millipede's black-canvas src/main.ts shape; register defender (justfile games, vitest GAMES, npm run gen:registry); update the roster guards the bootstrap header enumerates (topology GAMES, registry.test.mjs counts/banner/curated array, release.test.mjs 11→12 apps, src/host/registry.test.ts MANIFESTS, lobby/tests/main.test.ts tile literal); port the three gate modules from plugins/millipede/ keeping the hardening (unconditional containment + isFile gate — DIR-1 is new and will fail a port that only guards bare-..); dossier-sweep grammar is .SRC with optional defender/ prefix normalised away. DoD: just ci fully green.

## Dev Assessment

GREEN delivered in commit 678a531b. Seventeen files: five scaffold files (four-file plugin + black-canvas src/main.ts in the ml1-5 shape; meta order 11, year 1980 MAME attribution, showcase:false), three registrations (justfile games, vitest GAMES, regenerated registry — 11 games, 10 listed), six roster-guard updates (topology GAMES/exact-set/dev-tool map; registry.test.mjs count/banner/curated; release.test.mjs 12 apps; host registry.test.ts MANIFESTS + arrays; lobby main.test.ts tile literals + launch paths), and the three gate-module ports from millipede (checker + .d.mts with unconditional containment + isFile gate preserved and byte-citation machinery kept whole for df6's defend.snd; dossier-sweep with empty DOSSIER_FILES, .SRC-only grammar, basename() prefix normalization; purity-scanner verbatim, ban set exact).

Minimal-change notes: no behavior invented — the checker/sweep/scanner are line-for-line ports with defender paths and prose; the only genuinely new logic TEA demanded (defender/ prefix normalization) was already satisfied by the ported basename() call plus the .SRC extension class. Byte-citation machinery kept rather than surgically removed: a verbatim port is fewer new bugs than an edited one, and df6 consumes it.

**Verification (all green):** vitest --project defender 50/50; test:orchestrator 494/494 (defender-bootstrap 13/13, topology/registry/canonical-serve/shared-tests-typechecked all recovered); full vitest fleet 1034 files, 15829 tests; npm run lint clean (the 3 TS2307s cleared); node scripts/build-app.mjs defender builds (dist/defender/, 1.23 kB main).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled (workflow.reviewer_subagents.edge_hunter=false) | none | covered by Reviewer mutation battery M1-M3 |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | none | covered by Reviewer analysis (checker error paths, readDossier fallback) |
| 4 | reviewer-test-analyzer | Yes | clean | none | N/A |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (R1, fixed in a1c9da1a), dismissed 0, deferred 0 |
| 6 | reviewer-type-design | Skipped | disabled | none | covered by Reviewer analysis (shim-vs-.d.mts contract check) |
| 7 | reviewer-security | Skipped | disabled | none | covered by mutation battery M1/M2 (containment + isFile) |
| 8 | reviewer-simplifier | Skipped | disabled | none | covered by Reviewer analysis (byte-machinery keep judged justified) |
| 9 | reviewer-rule-checker | Yes | findings | 4 | confirmed 1 routed (R3 → df1-6), dismissed 3 with rationale, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled covered by Reviewer directly)
**Total findings:** 2 confirmed (R1 fixed, R3 filed as df1-6), 3 dismissed (with rationale), 0 deferred

## Reviewer Assessment

**Verdict: APPROVED** (round 1; R1 fixed in-round, commit a1c9da1a; R3 routed as story df1-6)

**Findings and dispositions:**
- **[DOC][MEDIUM] R1 (comment-analyzer, confirmed):** tests/defender-bootstrap.test.mjs's RED-collateral enumeration misattributed packagePathFor/appDirFor + the vitest-project gate to tests/registry.test.mjs (they live in tests/release.test.mjs) and said five suites where six reddened. A false prose claim is this fleet's unguarded surface — FIXED in a1c9da1a (header + session Tea Assessment corrected against the measured RED run).
- **[RULE][LOW-MEDIUM] R3 (rule-checker, confirmed, routed):** JSON.parse of claims/*.json without a controlled error in dossier-sweep.ts loadClaims + the checker CLI — uncaught SyntaxError with raw stack on a malformed claims file. Inherited verbatim from millipede (and centipede); reachable only once df1-2 lands claims. Filed as **df1-6** (1pt chore, fleet-wide fix).
- **[RULE][LOW] R2 dismissed:** `claims: Claim[]` could be `readonly Claim[]` in the .d.mts — inherited from millipede's identical contract; changing the fleet's shared type contract in one game's port would diverge the ports, which is the greater defect. Fleet-wide sweep territory, not df1-1.
- **[RULE][LOW] R4 dismissed:** `as unknown as` casts exist only in test fixtures deliberately constructing malformed claims and in the scanner's read of TS's internal parseDiagnostics — the legitimate pattern the lang-review rule's comment-exception anticipates, identical upstream.
- **[RULE][INFO] R5 dismissed:** `c?.id || '(missing id)'` — an empty-string id is separately flagged as invalid by the schema check on the next line (check-citations.mjs:178), so the `||` fallback is display-text behavior, not a masked bug.

**Mutation battery (covers disabled edge-hunter/security/silent-failure domains; each mutant verified via git diff before running, tree restored and re-verified green after):**
- M1 removed the isFile gate → killed exclusively by the new DIR-1 fixture (directory-inside-tree) — TEA's addition is the unique witness for the isFile half of the ml1-1 hardening.
- M2 disabled containment (withinTree=true) → killed by ESC-1; BARE-1 stayed green because the isFile gate backstops the bare-`..` shape — the two guards each have a dedicated witness.
- M3 loosened verbatim compare (trimEnd→trim) → killed by the WS leading-whitespace matrix.
- M4 silently dropped malformed linespecs → killed by the vacuity-guard test.
- M5 removed the fetch ban from the scanner → killed by the story-named fetch fixture.

**Verified observations (evidence-cited):**
- [VERIFIED] The story's named hardening survives the port: unconditional containment at check-citations.mjs:157-161 (one `resolveContainedFile` gate on every branch) and the isFile gate at :162 (`statSync(p).isFile()`); mutation-proven above. Complies with the story title's explicit requirement.
- [VERIFIED] Traversal refusal on the byte path too: check-citations.mjs:242-249 refuses pathful/traversal byte citations loudly while keeping the bare-filename licence-wall skip — matches millipede's ml1-1 S1 remediation line-for-line.
- [TEST][VERIFIED] Byte-teeth fixtures re-verified independently by test-analyzer against reference/original-source/defender (PHR6.SRC:11, DEFA7.SRC:2 vs :3, INFO.SRC:1 space-indent, DEFA7.SRC:9, INFO.SRC:11) — all true; the millipede .DOC/.LNK tests were correctly dropped (no such extensions in defender's twelve .SRC files) with no other coverage delta vs the originals.
- [VERIFIED] Green-on-empty is deliberate and armed: DOSSIER_FILES=[] (dossier-sweep.ts:47) with fixture teeth proving extract/uncovered/covered/malformed all bite (mutation M4 confirms), and the enrollment test deliberately avoids the length===0 trap so df1-2 enrolls without editing this suite.
- [VERIFIED] The scaffold cannot double-register: registry order-11 uniqueness asserted (defender-bootstrap), curated arrays updated in all six roster guards, gen-registry output committed and matched by the fresh-generation test (orchestrator 494/494).
- [VERIFIED] showcase:false complies with the ml1-5 black-canvas rule — plugin.ts:21 + the doesNotMatch(/showcase:\s*true/) guard, anchored by a not-null entry assertion first (no vacuous pass on a missing entry).
- [DOC][VERIFIED] All df*/ml* story references in the ported prose are consistent (comment-analyzer swept every header against sprint/epic-df1.yaml and the millipede provenance).

### Rule Compliance

Rule-checker enumerated all 30 TypeScript + 13 JavaScript lang-review rules against every changed .ts/.mjs file (43 rule-checks): 4 hits, all present identically in the millipede originals (dispositions above), zero defender-introduced violations. CLAUDE.md's "Adding a game" contract: all four files + three registrations present and test-pinned; the shared-code rule (extract only on proven duplication) — respected: the checker/sweep/scanner stay per-game copies by fleet convention (each game scans its own core; a shared extraction is a future story only if the fleet decides it). Purity/core-boundary rule: no src/core exists yet; the gate that will enforce it is this story's deliverable and is mutation-proven. Session-file conventions: Branch/PR fields present; assessments below Workflow Tracking.

### Devil's Advocate

Suppose this story is subtly broken. The nastiest failure would be the gate passing vacuously forever: DOSSIER_FILES is empty, src/core is absent, and CI lacks the vendored tree — so on CI every byte test skips, the dossier gate sweeps nothing, and the purity sweep iterates an empty list. Could a future story land uncited constants with this gate asleep? No: the moment df1-2 enrolls brief.md the sweep bites (fixture-proven mechanism, not hope), the moment df2 creates src/core/*.ts the it.each arms, and the byte teeth run on every dev checkout that carries reference/ — plus the claim-pinned-golden lesson says dormant skipIf teeth are a known fleet risk, which is precisely why the fixture teeth run unconditionally on CI. Second attack: the vendoredRoot path is wrong and vendoredAvailable is silently false, skipping byte teeth on the very machine that should run them — checked: the suite ran the byte blocks live in this checkout (test-analyzer confirmed via verbose reporter). Third: the sweep regex could be gamed — an unbackticked citation is invisible; stated openly in the module header, and the df1-2 dossier suites are the named owner of that check. Fourth: a malformed claims JSON aborts the suite with a raw SyntaxError — real, now filed (df1-6). Fifth: the CLI reports success over zero claims ("checked 0 claim(s)") where joust's checker refuses an empty set; here the vitest suite, not the CLI, is the gate, and green-on-empty is this story's designed state — but the joust-style refusal is worth considering when df1-2 lands claims; noted for df1-2's TEA rather than filed (the CLI is not in any CI path today). Nothing here rises to blocking.

**Deviation audit:** `## Design Deviations` correctly reads "No design deviations" — the df1-5 scaffold absorption was an owner scope decision recorded (and RESOLVED) in Delivery Findings before implementation, not an agent's silent spec deviation. ✓ audited.

**Quality gates at verdict:** defender 50/50; orchestrator 494/494; full fleet 1034 files / 15829 tests; lint clean; build-app defender green; tree clean at a1c9da1a.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **Conflict (blocking, TEA/red):** df1-1 standalone cannot land committable RED tests. The millipede template places the checker at `plugins/<id>/tools/audit/check-citations.mjs` and the tests at `plugins/<id>/tests/{audit/citations.test.ts, purity.test.ts}` — but `tests/monorepo-topology.test.mjs` pins `plugins/` to exactly the ten GAMES (`plugins/ holds exactly the ten games this file loops over`) and requires every plugin dir be a real app (`package.json`, `tsconfig.json`, `index.html`, `src/main.ts`). Creating `plugins/defender/` in any form before df1-5 reddens `npm run test:orchestrator`; the topology pin bump (ten→eleven), vitest GAMES entry and the four-file scaffold are df1-5's explicitly-owned work. Precedent: millipede ran scaffold-first — ml1-5 (PR #261) merged before ml1-1 (PR #268) — and the epic rule ("gate before the first game constant") is still satisfied by that order, since the scaffold contains no game constants; the first cited claim lands in df1-2 and the first src/core constant in df2. Recommendation: execute df1-5 first, then df1-1.
  **RESOLVED (owner decision, TEA/red):** the user chose the alternative — df1-1 ABSORBS the scaffold (four files, registrations, topology pin bump); df1-5 shrinks to the visual boot check at http://127.0.0.1:5270/defender/ against a nonsense control. TEA proceeded on that basis.
- **Improvement (non-blocking, TEA/red, for SM/PM):** df1-5's sprint YAML entry should be re-scoped to match the absorption — its remaining scope is ONLY the visual black-canvas boot check (screenshot, not a 200; the mechanical serve check is already automated by tests/canonical-serve.test.mjs). Update the story title/points at finish or next grooming.
- **Gap (non-blocking, TEA/red, for df1-5/docs):** CLAUDE.md's game roster line calls joust "the first Williams title" — false once defender (Williams, 1980) lands. The roster line needs defender added and that phrase corrected when the eleventh game registers.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No design deviations

## Session Notes

### Technical Approach

This story ports millipede's citation-gate machinery to Defender, implementing two critical test gates that run BEFORE any game constant is transcribed:

1. **Citation Gate (citations.test.ts + check-citations.mjs)**
   - Ported from `plugins/millipede/tools/audit/check-citations.mjs` (single-sided checker with ml1-1 hardening: unconditional containment + isFile gate)
   - Validates every prose citation in docs/rom-study/ against the vendored defender source tree
   - Schema validation runs everywhere; byte verification runs when reference/ is present
   - Catches drift: off-by-one line numbers, altered quotes, escaped traversals
   - CI graceful degradation: schema-only when reference/original-source/defender is absent

2. **Purity Scanner (purity.test.ts + purity-scanner.ts)**
   - Ported from millipede's pattern (which ported from centipede's TypeScript-compiler-API scanner)
   - Guards src/core/ against browser globals: Date.now/new Date, Math.random, fetch, canvas, window.*, document.*, localStorage, etc.
   - Also bans eval, dynamic import, new Function, globalThis, and Date aliasing
   - Fixture self-tests ensure the scanner has teeth; dormant sweep for real core files

### Acceptance Criteria

1. **AC-1: Checker schema validation** — a well-formed claim with no tree passes; malformed claims (missing id/claim/source) fail
2. **AC-2: Dossier coverage** — uncovered prose citations in docs/rom-study/ are detected (green-on-empty today; gains teeth as df1-2/df1-3 land the dossier)
3. **AC-3: Graceful CI degradation** — schema-only path passes on CI (no reference/original-source/defender)
4. **AC-4: File resolution** — accepts non-.MAC primary sources (.DOC, .LNK) from the vendored tree
5. **AC-5: Byte teeth** — when vendoredRoot is present, every text citation re-opens line-for-byte and detects drift
6. **AC-6: Traversal containment** — citations that escape the vendored tree are refused (carry-forward from cp1-2/cp1-3)
7. **Purity AC-1: Fixture teeth** — scanner self-tests detect each named ban (Date/Math.random/fetch/canvas)
8. **Purity AC-2: Real-tree sweep** — src/core/ files are scanned; dormant today (core lands in df2/df3)
9. **Scaffold AC-1 (absorbed from df1-5, owner decision):** four-file scaffold + src/main.ts black canvas; defender registered in justfile games, vitest GAMES, regenerated src/host/registry.ts (order 11, year 1980, listed:true, showcase:false); every roster guard updated (topology, registry counts, release app count, host MANIFESTS, lobby tile count)
10. **Scaffold AC-2:** just ci fully green at GREEN — orchestrator (incl. canonical-serve /defender/ vs nonsense control), vitest fleet incl. the new defender project, npm run lint

## Branch & PR
**Branch:** feat/df1-1-citation-gate-purity
**PR:** https://github.com/slabgorb/arcade/pull/352

## Related Context
- Story ml1-1 (millipede) established this pattern — the citation gate + purity scanner template
- Defender reference tree: historicalsource/defender @ 3fae9d3; vendored at reference/original-source/defender
- The scanner is a TypeScript-compiler-API implementation (not hand-rolled regex) — ported from centipede
- "Gate before constants" TDD shape: tests committed BEFORE the src/core/ constants they guard