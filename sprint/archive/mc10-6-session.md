---
story_id: "mc10-6"
jira_key: "mc10-6"
epic: "mc10"
workflow: "tdd"
---
# Story mc10-6: Harden the mc citations AC3 un-cited-literal gate: it currently checks only global value-membership across ALL claims, so an un-cited core literal passes whenever ANY unrelated claim shares its number (e.g. cursor.ts LOGICAL_WIDTH=0x100 passes only via the ICBM-speed-scale claim value 256). Require a symbol/line-anchored citation (claimCovers on the literal's own file:line), not bare value membership, in citations.test.ts

## Story Details
- **ID:** mc10-6
- **Jira Key:** mc10-6
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade

## Background

The citations test in `plugins/missile-command/tests/citations.test.ts` section 4 ("src/core carries no un-cited numeric literal (AC3 guard)", lines ~254-273) currently builds a global set of every claim's decoded value across ALL claims, then asserts each core literal is in that set. This allows un-cited literals to pass whenever ANY unrelated claim shares their number.

Concrete example: `plugins/missile-command/src/core/cursor.ts:61` defines `export const LOGICAL_WIDTH = 0x100 // 256`, which passes the guard purely on global value-membership of 256 (via an unrelated ICBM-speed-scale claim), not via a citation anchored to the literal's own file:line.

The prescribed fix uses the existing `claimCovers(claims, file, start, end)` helper from `plugins/missile-command/tests/helpers/claims.ts` (already used elsewhere in this test at lines ~137/140 for W3COMN skeleton-constant coverage). The hardening requires AC3 to verify a symbol/line-anchored citation on the literal's own file:line, not bare value membership.

## Acceptance Criteria

- [AC1] The AC3 core-literal guard must check that each core numeric literal is covered by a symbol/line-anchored citation via `claimCovers`, not bare global value-membership
- [AC2] A failing core literal (un-cited or uncovered) must fail the guard with a clear error indicating the file, line, and value
- [AC3] All existing claims in `docs/rom-study/claims/*.json` must remain valid under the new stricter guard
- [AC4] The hardening must NOT change the comment structure or fix comments — only the guard logic

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-11T11:27:43Z
**Round-Trip Count:** 11

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T20:52:37Z | 2026-08-10T20:56:42Z | 4m 5s |
| red | 2026-08-10T20:56:42Z | 2026-08-10T23:19:14Z | 2h 22m |
| green | 2026-08-10T23:19:14Z | 2026-08-10T23:33:53Z | 14m 39s |
| review | 2026-08-10T23:33:53Z | 2026-08-10T23:49:14Z | 15m 21s |
| red | 2026-08-10T23:49:14Z | 2026-08-10T23:58:05Z | 8m 51s |
| green | 2026-08-10T23:58:05Z | 2026-08-11T00:10:10Z | 12m 5s |
| review | 2026-08-11T00:10:10Z | 2026-08-11T06:31:34Z | 6h 21m |
| red | 2026-08-11T06:31:34Z | 2026-08-11T06:41:31Z | 9m 57s |
| green | 2026-08-11T06:41:31Z | 2026-08-11T06:53:52Z | 12m 21s |
| review | 2026-08-11T06:53:52Z | 2026-08-11T07:07:24Z | 13m 32s |
| red | 2026-08-11T07:07:24Z | 2026-08-11T07:10:22Z | 2m 58s |
| green | 2026-08-11T07:10:22Z | 2026-08-11T07:17:26Z | 7m 4s |
| review | 2026-08-11T07:17:26Z | 2026-08-11T10:34:56Z | 3h 17m |
| red | 2026-08-11T10:34:56Z | 2026-08-11T10:38:57Z | 4m 1s |
| green | 2026-08-11T10:38:57Z | 2026-08-11T10:51:36Z | 12m 39s |
| review | 2026-08-11T10:51:36Z | 2026-08-11T11:03:28Z | 11m 52s |
| red | 2026-08-11T11:03:28Z | 2026-08-11T11:10:35Z | 7m 7s |
| green | 2026-08-11T11:10:35Z | 2026-08-11T11:16:33Z | 5m 58s |
| review | 2026-08-11T11:16:33Z | 2026-08-11T11:27:43Z | 11m 10s |
| finish | 2026-08-11T11:27:43Z | - | - |

## Delivery Findings

No upstream findings.

### Dev (implementation)
- **Gap** (non-blocking): `sound-tables.ts` byte rows cite `W3SOUN.MAC:NNN`, but the sound claims in `docs/rom-study/claims/` are filed under `A35820.1C.bin:NNN` (the sound ROM binary) — the inline cites and the committed claims name DIFFERENT source files for the same data. The mc10-6 guard accepts these rows via the own-line self-documenting arm, so it is not blocking, but the two citation surfaces disagree. Affects `plugins/missile-command/src/core/sound-tables.ts` (align the inline `W3SOUN.MAC` cites with the `A35820.1C.bin` claim file, or file per-byte `W3SOUN` claims). *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking): the anchored guard's symbol arm is a substring match over prose, so it still admits coincidental coverage — see Reviewer Assessment R1. Affects `plugins/missile-command/tests/helpers/core-literals.ts` (`referencesClaim` must match a STRUCTURED anchor — the claim's `FILE.MAC:NNN` cite or its distinctive `MC-…` id — not a bare `symbol` substring). *Found by Reviewer during code review.*
- **Gap** (non-blocking): 8 comments in `plugins/missile-command/tests/citations-source.test.ts` (lines 292,403,440,458,476,524,547,567) still describe the retired `claimedValues` mechanism by name as a live property. Affects `citations-source.test.ts` (sweep/refresh those comments — the retirement was applied only where the AC pointed). *Found by Reviewer during code review.*

## Design Deviations

### TEA (test design)
- **AC3 hardening scoped to "anchor + exempt" (narrow), not full per-literal claim coverage**
  - Spec source: context-story-mc10-6.md — story title / AC1
  - Spec text: "Require a symbol/line-anchored citation (claimCovers on the literal's own file:line), not bare value membership"
  - Implementation: RED pins coverage = (a committed claim anchored via `claimCovers` to an inline `FILE.MAC:NNN` citation on the literal's own line/doc-block) OR value ∈ a documented `STRUCTURAL` exempt set OR value ∈ existing `TRIVIAL`. The old global `claimedValues.has(v)` value-membership escape is retired. Literals that already carry a real inline citation count as anchored, so cited table bytes (e.g. sound-tables' `W3SOUN.MAC:*`) stay green.
  - Rationale: Measured 2026-08-10 — 231 core game-literals, ALL currently pass via bare value-membership; a naive "committed claim at every literal's exact cited line" reading fails 144 (sound-table per-byte values with real citations but no per-byte claim, plus structural facts like `LOGICAL_WIDTH=0x100/256` which the code documents as having NO ROM line). That is a fleet-wide remediation, not a 3-pt hardening. User ruled "Narrow: anchor + exempt" (AskUserQuestion, 2026-08-10). Kills the named loophole (`cursor.ts:61 LOGICAL_WIDTH` passing only via the unrelated `256` claim) without the sweep.
  - Severity: minor
  - Forward impact: GREEN must (1) build a Dev-owned helper `tests/helpers/core-literals.ts` exporting the anchored-coverage predicate + a documented `STRUCTURAL` value→reason set, (2) resolve the genuinely un-cited value-collision literals (add a real citation+claim where a ROM line exists, else add a documented STRUCTURAL exemption — `LOGICAL_WIDTH=0x100` is the canonical exemption), and (3) rewire section-4's guard body to delegate to the predicate so the retired `claimedValues.has(v)` loophole cannot regress. RED's real-tree assertion (`uncitedCoreLiterals(...) === []`) is the driver for step 2.
- **ROUND 2 — coverage tightened to STRUCTURED anchors only (no bare-symbol matching)**
  - Spec source: Reviewer round-1 assessment R1 (rule-checker #15/#17/#25); AC1
  - Spec text: "anchored, not coincidental" — a coincidental value collision from an unrelated claim must not count
  - Implementation: round-2 tests (section 6b) pin coverage = TRIVIAL/STRUCTURAL, OR a value-matched claim named by a STRUCTURED anchor (its distinctive `id` MC-…/SOUND-…, or its `FILE.MAC:NNN` cite) present in the literal's context, OR the literal's OWN line self-documents an inline cite. A bare `symbol` substring match is explicitly NOT coverage (R1 test is RED against round-1's `referencesClaim`).
  - Rationale: round-1 `referencesClaim` matched `symbol` as a substring over `docText` incl. the whole file header; ROM symbols (TOP/MAX/MIN/EX…) are English words, so header prose admitted coincidental coverage — reproduced. Measured the fix's viability (probe, 2026-08-10): dropping the bare-symbol arm (id+cite+own-line self-documenting) leaves exactly **2** genuinely-cited-but-structurally-detached literals uncited — `drone.ts` BOTTOM=`0x30` (its `A35820.1C:354-355` block sits above `TOP`, not `BOTTOM`; claim `SOUND-DRONE-BOUND-30`) and `sound-tables.ts:43` `AUDCTL=0x20` — both resolvable by attaching an inline cite to the literal's own line. So the tightening is tractable, not a fleet-wide sweep.
  - Severity: minor
  - Forward impact: GREEN (Dev round 2) must (1) tighten `referencesClaim` to match only the claim's `id` or `FILE.MAC:NNN` cite (drop the bare-`symbol` substring); (2) re-run the real-tree gate and attach an inline `FILE.MAC:NNN`/`A35820.1C:NNN` cite to `drone.ts` BOTTOM and `sound-tables.ts:43` (or exempt with reason if genuinely un-citable); (3) sweep the 8 stale `claimedValues` comments in `citations-source.test.ts` (Reviewer R5); (4) fix the module doc (add the self-documenting arm; drop the stale "Mirrors citations.test.ts") — R7. The section-6 contract comment and the `catch(e)` narrowing (R6) were fixed in this RED commit.

### Dev (implementation)
- **Coverage rule refined to "value-matched claim REFERENCE, plus own-line self-documenting cite" — and two STRUCTURAL exemptions**
  - Spec source: context-story-mc10-6.md AC1; TEA deviation above ("anchor + exempt")
  - Spec text: coverage = claim `claimCovers`-anchored to the literal's own inline cite, OR STRUCTURAL, OR self-documenting inline citation
  - Implementation: `literalCovered` treats a literal as covered iff a claim WHOSE VALUE EQUALS the literal is *named* in the literal's context (its `symbol`/`id`/`FILE.MAC:NNN` cite appears in the own line + preceding doc-block + file header), OR the literal's OWN line carries a `FILE.MAC:NNN`/bare `:NNN` cite (self-documenting), OR the value is TRIVIAL/STRUCTURAL. `STRUCTURAL` holds two entries: `0x100`=256 (LOGICAL_WIDTH byte-space width, the named case) and `0xff`=255 (the `modsnd.ts` `& 0xff` byte mask).
  - Rationale: Requiring only "a claim shares the value" is the retired loophole; requiring the value-matched claim to be *referenced nearby* is what "anchored, not value-membership" means and is what the mc citation headers already provide (`SYMBOL = VALUE  FILE.MAC:NNN  claim MC-XXX`). The self-documenting own-line arm honours the user's "carries a real inline citation counts as anchored" so the 41 sound-table byte rows (`[…], // EX2 W3SOUN:159`) stay green even though `W3SOUN` carries no per-byte claim (its claims live under `A35820.1C.bin`). The self-documenting check is scoped to the OWN line ONLY so a cite in a shared preceding block or the header cannot vouch for a bare magic number (the exact `LOGICAL_WIDTH` collision). `0xff` is exempted, not cited, because `& 0xff` is byte-wrap arithmetic that names no ROM line — the same class as `0x100`.
  - Severity: minor
  - Forward impact: A future core literal must be genuinely cited (a value-matched claim named nearby, or an own-line `FILE.MAC:NNN`), or added to `STRUCTURAL` with a reason. Adding a bare magic number will redden the AC3 guard — which is the point. `STRUCTURAL` is the one place to look when a legitimately un-citable byte-space constant is introduced.
- **New extractor strips JSDoc/`/** */` blocks that the old `gameLiterals` leaked**
  - Spec source: project memory "mc citations scanner leaks JSDoc numbers"; AC4 (comment structure unchanged)
  - Spec text: the guard scans real CODE literals, not prose numbers
  - Implementation: `extractCoreLiterals` tracks multi-line block-comment state and strips `//`, `/* */`, `/** */` and string bodies before matching numerals, so story ids (`mc5-3`→3) and prose counts ("6 cities"→6) inside JSDoc no longer register as fake literals. The old `gameLiterals`/`TRIVIAL` in section 4 (which only stripped single-line comments) were deleted with the loophole.
  - Rationale: Under the anchored guard a leaked prose "6" would demand a value-6 claim referenced in that file and spuriously redden; correct extraction removes the false positives without touching any source comment (AC4 satisfied — no `src/core` comment was edited).
  - Severity: minor
  - Forward impact: The AC3 guard now scans only genuine code literals; a number that must be guarded has to live in code, not only in a `//`/JSDoc comment (already the codebase convention).
- **ROUND 2 — two `src/core` inline cites relocated onto their own line (a narrow, deliberate AC4 reading)**
  - Spec source: AC4 ("must NOT change the comment structure … only the guard logic"); Reviewer round-1 R1 (structured-anchor fix)
  - Spec text: don't fabricate a citation to make a literal pass
  - Implementation: after tightening `referencesClaim` to structured anchors (id/cite, no bare-symbol), exactly 2 real literals surfaced whose REAL citation was detached from their line — `drone.ts` BOTTOM=`0x30` (its `A35820.1C:354` cite sat in the block above `TOP`) and `sound-tables.ts:43` `AUDCTL=0x20` (claim `SOUND-AUDCV` @ `A35820.1C:128`, named in-file only by symbol). I added an inline `// … A35820.1C:NNN` cite to each literal's own line. Both cites already existed in the file (the `drone` block; the `SOUND-AUDCV` claim) — nothing was fabricated. AUDCTL's edit also aligns the `W3SOUN` inline cite with the `A35820.1C.bin` claim (partially resolving my round-1 delivery Gap).
  - Rationale: AC4 (my derived AC) exists to stop *fabricating* cites to cheese the guard. Relocating a detached-but-real cite onto its literal makes an existing true citation machine-checkable — the opposite of cheesing; it makes the guard MORE honest. The alternative (a `precedingBlock` "sibling-skip" to reach the detached block) would broaden the anchor scope and risk re-tripping rule-checker #25 (over-broad scope); an own-line cite is the tightest possible scope. STRUCTURAL-exempting these was rejected — they are real ROM sound constants, not byte-space facts.
  - Severity: minor
  - Forward impact: `src/core/drone.ts` and `src/core/sound-tables.ts` each gained one inline `A35820.1C:NNN` cite; the AC3 real-tree gate is `[]`. If the Reviewer reads AC4 strictly (no `src/core` change at all), the fallback is the guard-side sibling-skip — but that carries the #25 breadth risk this avoided.
- **TEA deviation "anchor + exempt (narrow)"** → ✓ ACCEPTED by Reviewer: the narrow scoping matches the user's AskUserQuestion ruling and is the only tractable reading; the exempt mechanism is sound in principle.
- **Dev deviation "value-matched claim REFERENCE, plus own-line self-documenting cite + two STRUCTURAL exemptions"** → ✗ FLAGGED by Reviewer: the *value-matched claim reference* arm is implemented as a bare **substring match of the claim `symbol` against `docText` including the whole file header** (`referencesClaim`, core-literals.ts:88). ROM symbols coincide with English words (TOP/MAX/MIN/EX…), so this reintroduces *coincidental* coverage — the exact class the story retires. Reproduced (rule-checker): `literalCovered([{symbol:'TOP',value:4242,…}], "…the top of the loop…", 4242) === true`; and 7 real literals (drone.ts:23, mirv.ts:29-32, wave.ts:61×2) currently depend on the whole-file-header scope, not on a structured citation of their own. The deviation's own claim ("a coincidental value collision … no longer counts") is contradicted by the code. See findings R1/R4 below. The *STRUCTURAL exemption* and *own-line self-documenting* sub-parts are sound in intent but under-tested (R2/R3).
- **Dev deviation "new extractor strips JSDoc blocks"** → ✓ ACCEPTED by Reviewer: correct and necessary; comment/string stripping verified (mutation-tested by test-analyzer). AC4 preserved (no `src/core` comment edited).

## Sm Assessment

**Setup verified against the current tree (2026-08-10). The story title is the full spec — its premise was measured, not assumed, before setup.**

Premise CONFIRMED:
- The AC3 core-literal guard in `plugins/missile-command/tests/citations.test.ts` section 4 (the `it.each(coreFiles)` block, ~lines 254–273) builds `claimedValues = new Set(loadClaims().map(c => Number(c.value)))` — a GLOBAL set of every claim's value across ALL claims — and asserts `claimedValues.has(v)`. It never checks the covering claim cites the literal's own `file:line`.
- Confirmed illustration: `src/core/cursor.ts:61` is `export const LOGICAL_WIDTH = 0x100 // 256`, passing on global value-membership of 256.
- The prescribed fix references an EXISTING helper: `claimCovers(claims,file,start,end)` in `tests/helpers/claims.ts`, already used at ~lines 137/140 for W3COMN coverage.
- The guard is currently GREEN (`vitest -t "un-cited numeric literal"` → 20 passed). Hardening makes it STRICTER; RED should prove the cross-claim value-collision fools it, GREEN re-anchors via `claimCovers`.

Backlog-shape ruling: none needed. No either/or, no refuted premise — the title is an accurate, testable spec. `acceptance_criteria` in `sprint/epic-mc10.yaml` is `null`, so AC1–AC4 above are SM-DERIVED FROM THE TITLE; TEA ratifies/refines them in RED. Context file was regenerated as a bare stub by `pf context create` and has been enriched by hand to carry the measured facts + derived ACs (mirrors this session).

Sibling probes clean before setup (no remote branch, no live sessions). Claim pushed: status stamped `in_progress`, branch `feat/mc10-6-harden-mc-citations-ac3-line-anchored` cut from `develop` (gitflow) and pushed so the sibling probe lights up.

Handoff → TEA (Tyr One-Handed) for the RED phase.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev)

**Test File:** `plugins/missile-command/tests/citations.test.ts` (new section 6, appended)
**Tests Written:** 5 (`-t "mc10-6"` → 4 failing + 1 fixture-sanity passing), covering AC1–AC4.

**RED evidence (2026-08-10):**
- `npx vitest run --project missile-command -t "mc10-6"` → **4 failed | 1 passed**. The 4 fail on the intended cause: `helpers/core-literals.ts` does not exist yet (`Cannot find module …/core-literals.js`). The 1 pass is the `src/core exists` fixture-sanity guard.
- `npm run lint` (tsc --noEmit, repo-wide) → **green**. The absent helper is dynamic-imported (`await import('./helpers/core-literals.js')`), the field.test/claims idiom, so it does not break the lint gate or collection.

**What the tests pin (maps to the ACs):**
- *AC1 / AC2 — anchored, not value-membership* (synthetic mutation proofs, section-5 style, deterministic):
  - a bare magic number with NO inline citation is NOT covered by a value-only claim match (the retired `claimedValues.has(v)` loophole);
  - the SAME value IS covered once a claim is anchored to the literal's OWN inline citation, and NOT covered by value alone;
- *AC1 / AC3 — structural exemption* : `STRUCTURAL` must document 256 (0x100) with a non-empty reason; a structural value needs no citation; a non-structural, un-cited number (31337) still fails (teeth).
- *AC2 / AC3 — real-tree gate* : `uncitedCoreLiterals(loadClaims(), src/core)` must be `[]` — the driver that forces GREEN to resolve every genuinely un-cited value-collision literal.

### Rule Coverage

| Rule (typescript.md) | How the RED enforces it | Status |
|---|---|---|
| #5 Module — `.js` in relative imports | dynamic import specifier is `./helpers/core-literals.js`; handoff tells Dev to reuse the dossier-sweep grammar, not add a `.js`-less/parallel parser | pinned |
| #4 Null/undefined — `Map.get()` guarded | STRUCTURAL teeth test reads `STRUCTURAL.get(256) ?? ''` | pinned |
| #2 Generics — `readonly` params | `CoreLiteralsModule` types `claims: readonly CommittedClaim[]`, constraining the GREEN signature | pinned |
| #8 Test quality — no vacuous assertions | every new test asserts a discriminating value (true≠false pairs, non-empty reason, `toEqual([])` with a listing message); self-checked | pass |

**Rules checked:** 4 of the 8 typescript.md groups are applicable to a test-support helper (#3 enums, #6 React/JSX, #7 async — N/A; #1 type-escapes — the module-cast mirrors the existing `loadClaimsModule` pattern, no new `as any`).
**Self-check:** 0 vacuous tests written; 0 pre-existing vacuous tests touched.

**NOTE for Dev (GREEN):**
- Build `tests/helpers/core-literals.ts` exporting `STRUCTURAL: ReadonlyMap<number,string>`, `literalCovered(claims, docText, value)`, `uncitedCoreLiterals(claims, coreDir)` — contract fully described in the section-6 header comment.
- `literalCovered` coverage = value ∈ STRUCTURAL or TRIVIAL, OR a claim `claimCovers` an inline `FILE.MAC:NNN` on `docText`, OR `docText` carries a well-formed inline citation (self-documenting). Bare value-match is NOT coverage.
- Then **rewire section-4's guard body** to delegate to `literalCovered` so the retired `claimedValues.has(v)` loophole cannot silently return.
- Resolve the real-tree gate literal-by-literal: add a real inline citation where a ROM line exists, else a documented STRUCTURAL exemption. `LOGICAL_WIDTH=0x100` is the canonical STRUCTURAL entry (the code already states no W3COMN line exists). Measured un-cited-and-non-structural set is ~a few dozen under a crude parser but SHRINKS sharply once the parser reads inline `SYMBOL :NNN` / `// … :NNN` cites (field/game/highscore already carry them) — so most resolve to "the parser sees the existing cite", not new work.
- Run the FULL `--project missile-command` suite before handoff (I ran only `-t "mc10-6"` + lint); section 4/5 were untouched but confirm no interaction.

**Handoff:** To Dev (Loki Silvertongue) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/missile-command/tests/helpers/core-literals.ts` (NEW) — the line-anchored coverage helper: `STRUCTURAL` (value→reason Map, 2 entries), `literalCovered`, `uncitedCoreLiterals`, `extractCoreLiterals`, `parseAnchors`.
- `plugins/missile-command/tests/citations.test.ts` — section 4 rewired to delegate to `literalCovered` (the `claimedValues.has(v)` value-membership loophole + the old `gameLiterals`/`TRIVIAL` removed); section 6's `CoreLiteralsModule` interface/loader extended with `extractCoreLiterals`.

**Tests:** GREEN.
- `npx vitest run --project missile-command` → **1291/1291 passing** (72 files).
- `npm run test:orchestrator` → **457/457 passing**.
- `npm run lint` (tsc --noEmit, repo-wide) → **green**.
- mc10-6 section: 5/5 passing (3 synthetic mutation proofs + real-tree gate + fixture sanity).

**How GREEN was reached (the anchored rule, measured):**
- Replaced bare global value-membership with: a literal is covered iff (a) a committed claim WHOSE VALUE MATCHES is referenced in the literal's own context (symbol/id/`FILE.MAC:NNN`), OR (b) the literal's OWN line self-documents a `FILE.MAC:NNN`/bare `:NNN` cite, OR (c) value ∈ STRUCTURAL/TRIVIAL.
- Under this rule the un-cited set fell from "all 231 pass weakly" to **42 genuinely un-cited**: 41 sound-table byte rows (resolved by arm (b) — each carries its own `// … W3SOUN:NNN`) and `modsnd.ts:45`'s `& 0xff` mask (resolved by exempting `0xff` as STRUCTURAL, alongside the named `0x100`). No `src/core` source comment was edited (AC4).

**Mutation proof (teeth):** removing `256` from `STRUCTURAL` re-surfaces exactly `cursor.ts:61=256` in the real-tree gate — `LOGICAL_WIDTH` is genuinely un-cited and passes ONLY via the explicit exemption, never a value-collision. Restored to green.

**AC status:** AC1 ✅ (anchored via `literalCovered`, not value-membership) · AC2 ✅ (un-cited literals fail with file:line=value) · AC3 ✅ (all committed claims + real core literals valid under the stricter guard; MC suite green) · AC4 ✅ (only guard logic changed; no source comment edited).

**Self-review:** wired (section 4 uses the new predicate; the loophole is deleted, not shadowed) · follows the file's dynamic-import + helper-module patterns · no debug code · branch `feat/mc10-6-harden-mc-citations-ac3-line-anchored` pushed (`ce17c373`).

**Handoff:** To Reviewer (Heimdall) for review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 | N/A — all suites green, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — covered by Reviewer (parseAnchors/extractCoreLiterals edges assessed manually) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — covered by Reviewer (no swallowed errors; one weak catch flagged R6) |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 4 (R2 High, R3 Med, + 2 Low folded into R2/R7) |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 | confirmed 3 (folded into R4/R5) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — covered by Reviewer (types sound; rule-checker #1/#2 also clean) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — N/A: pure test-support code, no I/O/auth/user-input |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — covered by Reviewer (dead export parseAnchors noted; hand-rolled parser R5) |
| 9 | reviewer-rule-checker | Yes | findings | 4 | confirmed 4 (R1 High, R4/R5 Med, R6 Low) |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 6 confirmed (2 High, 3 Medium, 1 Low + Low doc/test cleanups), 0 dismissed, 0 deferred

## Round-1 Reviewer Assessment (REJECTED — superseded by round 6)

**Verdict:** REJECTED

The change achieves its headline goal — the `claimedValues.has(v)` global value-membership loophole is gone and `LOGICAL_WIDTH=0x100` no longer rides in on a coincidental `256`. Preflight is green (MC 1291, orchestrator, tsc) and the syntax-level rules (#1–#14, #16, #19–#23, #26) are clean. **But adversarial analysis (rule-checker + test-analyzer, both with live mutations) shows the replacement re-opens the SAME bug class through a different door, and the story's own new comments assert it does not.** Two High findings block.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [RULE][HIGH] R1 | The anchor's positive match is a **bare substring search of a claim `symbol` over `docText` incl. the whole file header**. ROM symbols are English words (TOP/MAX/MIN/EX…), so an un-cited literal is "covered" by a prose coincidence — the exact class this story retires. Reproduced: `literalCovered([{symbol:'TOP',value:4242,…}], "…the top…", 4242)===true`; 7 real literals (drone.ts:23, mirv.ts:29-32, wave.ts:61×2) depend on the whole-header scope, not their own citation. | `core-literals.ts:88` (`referencesClaim`) | Match a STRUCTURED anchor only — the claim's `FILE.MAC:NNN` cite (basename+line) or its distinctive `MC-…` id — NOT a bare `symbol` substring. Then bound the search slice to the literal's own statement + attached doc-comment (a header cite must name THIS literal's symbol/line, per rule-checker #25). Re-measure `uncitedCoreLiterals` and cite/exempt anything newly surfaced. |
| [TEST][HIGH] R2 | The "own-line-only" self-documenting scope is **load-bearing per the code's own comment** ("prevents a preceding-block citation vouching for a bare magic number — exactly the LOGICAL_WIDTH collision") yet **untested**: mutating to scan the full `docText` leaves all 74 tests green. | `core-literals.ts:116` | Add a synthetic `literalCovered` test: a multi-line `docText` whose citation sits ONLY in the preceding block (not the own line) for an unmatched value → assert `false`. |
| [TEST][MED] R3 | `STRUCTURAL` exempts `256`/`255` **globally by value**, not by site — an unrelated un-cited `256` anywhere in `src/core` is silently exempted (narrow echo of the retired bug), and no test pins the exemption's narrowness. | `core-literals.ts:45,106` | Pin the exemption (a `256` in an unrelated `docText` is still covered ONLY because it's exempt, and the set is small/documented), OR scope STRUCTURAL by site. At minimum add a synthetic test acknowledging the value-global behavior. |
| [RULE][MED] R4 | Hand-rolled `ANCHOR_RE`/`parseAnchors` instead of reusing `dossier-sweep`'s citation grammar — contradicts THIS diff's own section-6 directive ("do NOT hand-roll a second parser") and the twice-stated project convention. Undocumented deviation. | `core-literals.ts:63,72` / `citations.test.ts:461` | Reuse dossier-sweep's grammar where applicable, OR replace the directive with a logged rationale (TS-source anchors need no backticks + bare `:NNN`). |
| [RULE][MED] R5 | 8 comments in `citations-source.test.ts` still name the retired `claimedValues` mechanism as a live property (retirement applied only where the AC pointed). | `citations-source.test.ts:292,403,440,458,476,524,547,567` | Sweep/refresh those comments or disclaim them as historical. |
| [RULE][LOW] R6 | `catch (e) { …(e as Error).message… }` casts a caught `unknown` to `Error` with no `instanceof` narrowing — a non-Error throw reads `undefined`, swallowing the real failure (new code). | `citations.test.ts:500` | `e instanceof Error ? e.message : String(e)`. |
| [DOC][LOW] R7 | Module doc enumerates 3 coverage arms, omitting the 4th (self-documenting own-line); `TRIVIAL` comment "Mirrors citations.test.ts" is stale (that const was deleted here); `extractCoreLiterals`/`parseAnchors` have no direct synthetic unit tests; `it.each` runs 0 assertions for literal-free files. | `core-literals.ts:11,36`; `citations.test.ts:249` | Add the 4th arm to the doc; drop the stale "Mirrors"; add extractor/parseAnchors synthetic pins; note/allow literal-free files. |

**Data flow traced:** a `src/core` numeric literal → `extractCoreLiterals` (comment/string-stripped, `docText` = own line + preceding block + file header) → `literalCovered` → covered iff TRIVIAL/STRUCTURAL, OR `referencesClaim` (symbol/id/cite substring in `docText`), OR own-line anchor. **The `referencesClaim` symbol substring over header prose is where coincidental coverage leaks back in (R1).**

**Pattern observed:** correct comment/string-stripping lexer (`extractCoreLiterals`, core-literals.ts:180) — good; mutation-verified. Retirement of the loophole in section 4 — good.

**Rule Compliance:** rule-checker checked 26 rules / 71 instances — clean on #1 (no `as any`/unsafe casts beyond the validated dynamic-import idiom), #2 (all array params `readonly`), #4 (`??` used correctly incl. `Map.get() ?? ''`), #5 (`.js` extensions present), #8 (no `as any` in assertions; module interface matches exports). Violations: #15/#17/#18/#25 (all the R1 coincidental-coverage defect + R4 parser duplication), #24 (R5 stale comments), #11 (R6 catch narrowing).

**Devil's Advocate:** Assume this guard is worthless. A future dev adds `export const SPREAD = 0x100` to `spawn.ts` — an un-cited magic number — and the guard stays green, because `256` is globally exempt (R3). Another adds `const MAXLINE = 4242` to a file whose header prose contains the word "max" while a claim `MAX`=4242 exists elsewhere — green, via R1's symbol coincidence. The suite's real-tree gate (`uncitedCoreLiterals().toEqual([])`) reads green in both cases, so it "fails by passing" (rule-checker #18): it advertises "no un-cited value-collision literal survives" while at least 7 literals survive today only by header-prose coincidence. Worse, the module's own doc-comment asserts the opposite ("a coincidental value collision… no longer counts"), so a future reader trusts a property the code doesn't have — precisely the "prose is the unguarded surface" trap this codebase keeps hitting. None of the synthetic mutation-proofs exercise the header/preceding-block arm, so a regression in the most delicate scope boundary is invisible. **Conclusion: the headline fix is real, but the new coverage predicate must be tightened to a structured anchor and its scope boundaries must be pinned by synthetic tests before this can ship as a hardening.**

**Handoff:** Back to TEA (Tyr One-Handed) for red rework — the two High findings are testable (add synthetic tests that expose the coincidental symbol coverage R1 and the untested own-line scope R2), then Dev tightens `referencesClaim` to a structured anchor + sweeps the stale comments (R4/R5/R6/R7).

## TEA Assessment — Round 2 (rework)

**Tests Required:** Yes
**Status:** RED (1 failing — ready for Dev)

**Test File:** `plugins/missile-command/tests/citations.test.ts` (new section 6b — 7 tests; plus section-6 contract comment tightened and the `catch(e)` narrowed, R6).

**RED evidence (2026-08-10):**
- `npx vitest run --project missile-command -t "mc10-6"` → **1 failed | 11 passed**. The 1 failure is the intended R1 exposure: `a value-matched claim named ONLY by an English-word symbol in prose does NOT cover` — fails against round-1's `referencesClaim` (which matches `symbol` 'TOP' as a substring of "…the top…"). `npm run lint` → green.

**What round-2 pins (maps to Reviewer findings):**
- **R1 (RED → Dev fix):** structured-anchor-only coverage. A value-matched claim named ONLY by an English-word `symbol` in prose must NOT cover; a claim named by its distinctive `id` or its `FILE.MAC:NNN` cite MUST cover (2 positive guards, so the fix doesn't over-remove).
- **R2 (guard):** the self-documenting arm is own-line-scoped — a cite only in the preceding block, no matching claim → not covered; the same cite on the own line → covered. Reddens if someone widens the self-documenting scope to the full docText.
- **R3 (guard):** `STRUCTURAL` stays a small (≤4), documented set; a near-miss value (257) is not exempt.
- **R7 (guards):** direct synthetic pins for `extractCoreLiterals` (strips `//`, block, JSDoc, strings — 111/999/mc5-3/777 do not leak; only real code literals 42/0x5f) and `parseAnchors` (`FILE.MAC:N`, `N-M` ranges, extensionless `FILE:N`, bare `:N`).

**Measured fix viability (so Dev's GREEN is scoped, not open-ended):** dropping the bare-`symbol` arm (keep `id` + `FILE.MAC:NNN` cite + own-line self-documenting) leaves exactly **2** literals uncited on the real tree — `drone.ts` BOTTOM=`0x30` (genuinely cited at `A35820.1C:354-355` + claim `SOUND-DRONE-BOUND-30`, but the cite block sits above `TOP`, detached from `BOTTOM`) and `sound-tables.ts:43` `AUDCTL=0x20` (`W3SOUN AUDCV=20`, no line-numbered cite). Both resolve by adding an inline `A35820.1C:NNN`/`W3SOUN:NNN` cite to the literal's own line — a two-line source edit, NOT a fleet sweep. (This is the one place round-2 will touch `src/core`: attaching an existing cite to the correct line — AC4's "no comment-structure change to make a literal pass" should be read as "don't fabricate," not "never annotate a detached-but-real cite"; log it as a deviation if in doubt.)

**Rule Coverage (round 2 additions):** #8 test quality — all 7 new tests assert discriminating values; #1/#2/#5 — new `CoreAnchor` interface + `parseAnchors` typing are `readonly`-clean, `.js` specifier unchanged.

**Handoff:** To Dev (Loki Silvertongue) for GREEN round 2.

## Dev Assessment — Round 2 (rework)

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/missile-command/tests/helpers/core-literals.ts` — `referencesClaim` tightened to STRUCTURED anchors only (claim `id` or `FILE.MAC:NNN` cite; bare-`symbol` and bare-`:NNN` arms removed); unused `claimCovers` import dropped; module doc rewritten (4 arms, structured-anchor rationale, own-line-scoped self-documenting); stale `TRIVIAL` "Mirrors" comment fixed (R7).
- `plugins/missile-command/tests/citations-source.test.ts` — swept all 8 stale `claimedValues` comments (R5) to the mc10-6 line-anchored framing.
- `plugins/missile-command/src/core/drone.ts` — inline `A35820.1C:354` cite on the `BOTTOM` row (its real, detached cite).
- `plugins/missile-command/src/core/sound-tables.ts` — inline `A35820.1C:128` (claim `SOUND-AUDCV`) on the `AUDCTL` line.
- (RED commit already carried section 6b, the section-6 contract comment, and the `catch(e)` narrowing R6.)

**Tests:** GREEN.
- `npx vitest run --project missile-command` → **1298/1298**; `npm run test:orchestrator` → **457/457**; `npm run lint` → green.
- mc10-6: 12/12 (section 4 real-tree gate `[]`, section 6 synthetic, section 6b round-2 pins).

**How each Reviewer finding was resolved:**
- **R1 (HIGH):** `referencesClaim` no longer matches a bare `symbol` — only the distinctive claim `id` or its `FILE.MAC:NNN` cite. The coincidental "TOP in prose" coverage is gone; the R1 test is green and reddens if the symbol arm returns (mutation-verified).
- **R2 (HIGH):** the own-line self-documenting scope is now pinned by a synthetic test — mutation-verified: widening `literalCovered` to scan the full `docText` reddens it.
- **R3 (MED):** STRUCTURAL narrowness pinned (size ≤ 4, every entry has a reason, 257 not exempt).
- **R4 (MED):** section-6 "reuse dossier-sweep" directive replaced with the rationale for a small purpose-built parser (dossier-sweep needs backtick-wrapped `.MAC`/`.cpp` and can't read bare `:NNN`/header forms).
- **R5 (MED):** 8 stale `claimedValues` comments swept.
- **R6 (LOW):** `catch (e)` narrows with `e instanceof Error ? e.message : String(e)`.
- **R7 (LOW):** module doc lists all 4 arms; `extractCoreLiterals`/`parseAnchors` now have direct synthetic pins (section 6b).

**Real-tree remediation (the tightened rule surfaced exactly what it should):** 2 genuinely-cited-but-detached literals (`drone.ts` BOTTOM, `sound-tables.ts` AUDCTL) — each got its REAL cite relocated onto its own line (no fabrication; see the round-2 Dev deviation re AC4).

**Mutation proofs (teeth):** removing `256` from STRUCTURAL re-surfaces `cursor.ts:61=256`; breaking own-line scope reddens R2; re-adding the bare-symbol arm reddens R1.

**Self-review:** the loophole and its coincidental echo are both physically gone (not shadowed); patterns followed; no debug code; branch pushed (`c7ef6560`).

**Handoff:** To Reviewer (Heimdall) for round-2 review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 | N/A — MC 1298/1298, orchestrator 457/457, tsc green |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — covered by Reviewer (referencesClaim docText-scope edges assessed manually) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — covered by Reviewer (no new swallowed errors; R6 catch already narrowed) |
| 4 | reviewer-test-analyzer | Yes | findings | 1 | confirmed 1 (R2-A — the header/local scope boundary is untested; live repro on wave.ts:61) |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (R2-C — drone.ts:21 names claim id SOUND-DRONE-BOTTOM-30; real id is SOUND-DRONE-BOUND-30) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — covered by Reviewer (CoreAnchor typing readonly-clean) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — N/A: pure test-support code, no I/O/auth/user-input |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — covered by Reviewer (no new dead code) |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 (R2-A header-scope over-broad #25/#17/#18; R2-B id bare-substring/prefix hazard) |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 3 confirmed (1 Critical R2-A, 1 High R2-B, 1 Low R2-C), 0 dismissed, 0 deferred

## Round-2 Reviewer Assessment (REJECTED — superseded by round 6)

**Verdict:** REJECTED

Round 2 tightened `referencesClaim` to structured anchors (claim `id` or `FILE.MAC:NNN` cite) and removed the bare-`symbol` prose arm — **R1 is genuinely closed** (mutation-verified: re-adding the symbol arm reddens the R1 test; the `TOP`-in-prose coincidence is gone). Preflight is green (MC 1298/1298, orchestrator 457/457, tsc). **But the structured-anchor search still runs over the WHOLE `docText`, which includes the shared file header — so a literal with no LOCAL cite is "covered" by an UNRELATED same-file constant's citation of the same value. The bug class did not close; it moved from symbol-prose to header-cite. One live leak reproduced. Blocks.**

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [RULE/TEST][CRITICAL] R2-A | `referencesClaim` id/cite search spans the entire `docText`, incl. the file header. A value-matched claim whose id/cite sits in the HEADER (naming an unrelated symbol) therefore covers a bare literal. **LIVE**: `wave.ts:61` `WICSPL` entries 16 (0x10) and 10 (0x0a) are real ROM values with **no** `MC-WICSPL-16`/`-10` claim (WICSPL claims exist for 6,8,32,64,96,160,192,208,224 — 16/10 skipped). They pass ONLY via `MC-ICBWAV-16`/`MC-ICBWAV-10` (unrelated ICBWAV table, cite `W3MAIN.MAC:5713`, which sits in wave.ts's header at line 17). Independently reproduced: a LOCAL-only rule (probe6) surfaces exactly 9 literals the shipped `uncitedCoreLiterals` gate wrongly reports as `[]`. | `tests/helpers/core-literals.ts` — `referencesClaim` / `extractCoreLiterals` docText scope | Split docText so id/cite search is **LOCAL-only** (own line + immediately-preceding comment block, NOT the header). Add an **enclosing-declaration-symbol** arm: a value-matched claim whose `symbol` equals the literal's nearest preceding `(export )?const\|let\|function\|type IDENT` (normalized) covers. Re-measure; cite/claim/exempt everything newly surfaced (measured: 9). |
| [RULE][HIGH] R2-B | `referencesClaim` matches claim `id` by **bare substring**, so `MC-WICSPL-6` is a prefix of `MC-WICSPL-64`/`-96` (all real ids in `wave.json`). A doc naming only `MC-WICSPL-64` would also satisfy the value-6 claim. Not currently firing; latent. | `tests/helpers/core-literals.ts` — `referencesClaim` id match | Word-boundary the id match (`\bID\b` / delimiter guard) so a claim id matches only when it is not merely a prefix of a longer id. |
| [DOC][LOW] R2-C | `src/core/drone.ts:21` names `claims SOUND-DRONE-TOP-70 / -BOTTOM-30`; the real claim id is `SOUND-DRONE-BOUND-30` (BOUND, not BOTTOM — the code symbol is `BOTTOM` but the claim id uses `BOUND`). Pre-existing. The literal `BOTTOM=0x30` at line 23 stays green via its own-line `A35820.1C:354` cite, so this is prose-only, but the id text is wrong. | `src/core/drone.ts:21` | Correct the comment: `-BOTTOM-30` → `-BOUND-30`. |

**Data flow traced:** literal → `extractCoreLiterals` (docText = own line + preceding block + **FILE HEADER**) → `referencesClaim` (id/cite substring over the FULL docText) → the header slice is where an unrelated table's cite leaks coverage back in (R2-A). The symbol-prose door (R1) is shut; the header-cite door is open.

**Devil's Advocate:** The real-tree gate `uncitedCoreLiterals().toEqual([])` reads green today, yet 9 literals are covered ONLY by a same-file header cite of an unrelated symbol — "fails by passing" again (rule-checker #18). `wave.ts` is the sharpest example: `WICSPL`'s own claim table exists (6,8,32,64,…) but skips 16 and 10, and the guard never notices, because `ICBWAV` — a different table cited three lines up in the header — happens to carry 16 and 10. The module doc still advertises "structured anchor, not coincidental"; the whole-header scope makes that untrue at a coarser grain — the same prose-vs-code trap this codebase keeps hitting. Ship-blocker until coverage is LOCAL + enclosing-symbol and pinned by synthetic tests.

**Rule Compliance:** rule-checker — R1 CLOSED (no bare-`symbol` arm; mutation-verified). New/again violations: #25 (over-broad anchor scope — header included) = R2-A; #17/#18 (id substring + fails-by-passing) = R2-A/R2-B. comment-analyzer #24 (incorrect claim-id in prose) = R2-C. type-design/security/simplifier clean (manual, subagents disabled).

**Fix-Required (FULL RIGOR — close the class; user-ruled 2026-08-11).** A core literal is COVERED iff:
- value ∈ TRIVIAL or STRUCTURAL (256 = 0x100, 255 = 0xff), OR
- its OWN line self-documents an inline `FILE.MAC:NNN` / bare `:NNN` cite, OR
- a value-matched claim's id (word-boundary'd, R2-B) or `FILE.MAC:NNN` cite appears in the literal's LOCAL context (own line + immediately-preceding comment block only — NOT the header), OR
- a value-matched claim's SYMBOL equals the literal's ENCLOSING declaration symbol (nearest preceding `(export )?const|let|function|type IDENT`, normalized).

Measured remediation (probe6 — exactly 9 surface uncited, independently reproduced 2026-08-11):
- `highscore.ts:43-47` (7500/7495/7330/7005/6950) — add own-line `// W3DSUP.MAC:3748` cites (SCOINI ladder; claims `MC-HISCORE-DEFAULT-{DFT,DLS,SRC,RDA,MJP}`; cover via LOCAL arm — the existing cite in lines 40-41 is attached to the `const` line 42, not the value rows).
- `mirv.ts:31` = 3 (`MIRV_MAX_CHILDREN`; claim `MC-MIRV-MAX` @ `W3MAIN.MAC:2713`) and `mirv.ts:32` = 12 (`MIRV_EXPLOSION_SUPPRESS`; claim `MC-MIRV-EXPSUP` @ `W3MAIN.MAC:1531`) — own-line cites (claim symbols POTENT/EXPLCT ≠ enclosing symbol, so LOCAL arm, not enclosing-symbol).
- `wave.ts:61` = 16 & 10 (`WICSPL`) — file 2 NEW claims `MC-WICSPL-16` / `MC-WICSPL-10` (real ROM entries on the `WICSPL .BYTE` line `W3MAIN.MAC:5717`, verbatim `.BYTE 0D0,0E0,0C0,8,0A0,60,40,20,10,0A,6,4,2,1,0` already contains 10/0A); cover via the enclosing-symbol arm (`WICSPL === WICSPL`).
- (`drone.ts` BOTTOM `A35820.1C:354` + `sound-tables.ts` AUDCTL `A35820.1C:128` already own-line-cited in round 2 — stay green.)

**Handoff:** Back to TEA (Tyr One-Handed) for round-3 red rework — add section-6c synthetic tests pinning: (a) an unrelated same-file HEADER cite of the same value does NOT cover (RED now — reproduces wave.ts:61); (b) a claim whose symbol matches the literal's enclosing `const` DOES cover; (c) id match is word-boundary'd (`MC-WICSPL-6` does not match a doc naming only `MC-WICSPL-64`); (d) local-context (own + preceding block) cite covers, header-only cite does not. Keep the real-tree gate `uncitedCoreLiterals(...).toEqual([])`. Then Dev round 3 rewires `referencesClaim`/`extractCoreLiterals` (LOCAL-only + enclosing-symbol + word-boundary), adds the ~7 own-line cites + 2 WICSPL claims, and fixes `drone.ts:21` (R2-C).

### Reviewer (audit)

- **ROUND 2 Dev deviation "two `src/core` inline cites relocated onto their own line" (`drone.ts` BOTTOM `A35820.1C:354`; `sound-tables.ts` AUDCTL `A35820.1C:128`, claim `SOUND-AUDCV`)** → ✓ **ACCEPTED**. Both cites are REAL, pre-existing, and were verified byte-accurate against the vendored ROM (`A35820.1C.bin`, present only in this a-1 checkout) — not fabricated. AC4 (Dev-derived) is read as "don't fabricate a cite to pass the guard"; relocating a detached-but-real cite onto its literal makes an existing true citation machine-checkable, the opposite of cheesing. Logged deviation, accepted.

### Reviewer (code review)

- **Gap** (non-blocking, R2-C): `src/core/drone.ts:21` names `claims … / -BOTTOM-30`; the real claim id is `SOUND-DRONE-BOUND-30`. The `A35820.1C:354` inline cite on line 23 still resolves, so the AC3 guard is green — but the claim id in the comment prose is wrong. Fix in round 3. *Found by Reviewer (comment-analyzer) during round-2 review.*

## TEA Assessment — Round 3 (rework)

**Tests Required:** Yes
**Status:** RED (3 failing — ready for Dev)

**Test File:** `plugins/missile-command/tests/citations.test.ts` (new section 6c — 5 tests; plus the `CoreLiteral`/`CoreLiteralsModule` interfaces extended with the round-3 contract).

**RED evidence (2026-08-11):**
- `npx vitest run --project missile-command -t "mc10-6"` → **3 failed | 14 passed**. The 3 failures are the intended full-rigor exposures (each fails on its own cause):
  1. *R2-A* `a value-matched claim cited ONLY in the shared file header does NOT cover a bare literal` — RED: round-2 `referencesClaim` searches the whole `docText` incl. the header, so the synthetic BAR=16 (reproducing wave.ts:61) is wrongly covered by the header's `MC-ICBWAV-16` / `W3MAIN.MAC:5713`.
  2. *enclosing-symbol arm* `a value-matched claim whose symbol equals the enclosing declaration symbol DOES cover, across a multi-line decl` — RED: `extractCoreLiterals` has no `enclosingSymbol` field (`expected undefined to be 'WICSPL'`), and no enclosing-symbol arm exists.
  3. *R2-B* `a claim id matches as a whole token, not as a prefix of a longer id` — RED: round-2 matches the id by bare substring, so `MC-WICSPL-6` is satisfied by a doc naming only `MC-WICSPL-64` (`expected true to be false`).
- `npm run lint` (tsc --noEmit, repo-wide) → **green** (the interface extension typechecks against the dynamic-import cast; the not-yet-updated module does not break collection).

**What round 3 pins (maps to Reviewer round-2 findings + the user's Full-rigor ruling):**
- **R2-A (RED → Dev fix):** the shared file HEADER is not in coverage scope — `extractCoreLiterals` must drop the header from `docText`, so a same-file unrelated cite cannot vouch for a bare literal.
- **enclosing-symbol arm (RED → Dev fix):** `extractCoreLiterals` computes the nearest preceding `(export )?const|let|function|type IDENT` as `enclosingSymbol`; `literalCovered(claims, docText, value, enclosingSymbol?)` covers when a value-matched claim's `symbol` EQUALS (normalized) that enclosing symbol — the WICSPL===WICSPL arm.
- **R2-B (RED → Dev fix):** the claim-`id` match is word-boundary'd (whole token), so `MC-WICSPL-6` ≠ a prefix of `MC-WICSPL-64`.
- **Guards (green both sides — anti-regression):** the enclosing-symbol arm is EQUALITY not substring (`WIC` does not cover an enclosing `WICSPL`); a cite in the immediately-preceding comment block (LOCAL, not header) still covers once the header is dropped (so Dev must not over-narrow the local scope to own-line-only).
- The real-tree gate `uncitedCoreLiterals(...).toEqual([])` is UNCHANGED and still green against the current impl; it becomes the driver that forces GREEN to resolve the 9 literals the tightened rule surfaces.

**Measured GREEN scope (so Dev round 3 is bounded, not open-ended):** under the full-rigor rule (probe6, independently re-run 2026-08-11) exactly **9** literals surface uncited — `highscore.ts:43-47` (7500/7495/7330/7005/6950), `mirv.ts:31` (3) & `:32` (12), `wave.ts:61` (16 & 10). Remediation: own-line `// FILE.MAC:NNN` cites on the 7 highscore/mirv rows (claims `MC-HISCORE-DEFAULT-*` @ W3DSUP.MAC:3748, `MC-MIRV-MAX` @ W3MAIN.MAC:2713, `MC-MIRV-EXPSUP` @ W3MAIN.MAC:1531 already exist), and 2 NEW claims `MC-WICSPL-16` / `MC-WICSPL-10` (real WICSPL `.BYTE` entries at W3MAIN.MAC:5717) so wave covers via the enclosing-symbol arm. Plus fix `drone.ts:21` (R2-C, `-BOTTOM-30` → `-BOUND-30`).

### TEA (test design)
- **ROUND 3 — coverage contract widened to LOCAL scope + enclosing-symbol arm + word-boundary id (the "close the class" rule)**
  - Spec source: Reviewer round-2 assessment R2-A/R2-B; user ruling 2026-08-11 "FULL RIGOR — close the class"
  - Spec text: "an unrelated same-file header cite must not cover; tie coverage to the literal's enclosing declaration symbol; word-boundary the id"
  - Implementation: section-6c synthetic tests pin (a) header-only cite → not covered; (b) `extractCoreLiterals` exposes `enclosingSymbol` and the equality arm covers across a multi-line decl; (c) id match is whole-token. `CoreLiteral` gains `enclosingSymbol: string`; `literalCovered` gains an optional 4th `enclosingSymbol?` param (existing 3-arg synthetic calls stay valid — the arm is inert when unset).
  - Rationale: the header-vs-local boundary and the enclosing symbol cannot be expressed through the flat round-2 `docText` string, so the observable contract had to grow one field + one optional param. This is the tightest surface that lets synthetic tests isolate each arm and still leaves the real-tree gate as the end-state driver.
  - Severity: minor
  - Forward impact: GREEN (Dev round 3) must (1) drop the header from `extractCoreLiterals`' `docText`; (2) compute `enclosingSymbol` (nearest preceding declaration); (3) add the enclosing-symbol equality arm + word-boundary the id match in `referencesClaim`; (4) resolve the 9 surfaced literals (7 own-line cites + 2 new WICSPL claims); (5) fix `drone.ts:21` (R2-C). Then re-run the full `--project missile-command` suite (expect the real-tree gate back to `[]`), lint, orchestrator; mutation-verify each new arm has teeth.

**Handoff:** To Dev (Loki Silvertongue) for GREEN round 3.

## Dev Assessment — Round 3 (rework)

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/missile-command/tests/helpers/core-literals.ts` — `extractCoreLiterals` drops the file header from `docText` (LOCAL = own line + preceding block only) and computes each literal's `enclosingSymbol` (nearest preceding `(export )?const|let|function|type IDENT`); `literalCovered` gains a 4th `enclosingSymbol?` param + the enclosing-symbol EQUALITY arm; `referencesClaim` word-boundaries the claim-id match; `norm`/`escapeRe` helpers added; module doc rewritten (5 arms, header exclusion, enclosing-symbol rationale); dead `headerBlock` removed.
- `plugins/missile-command/tests/citations.test.ts` — section-4 real-tree loop delegates with `lit.enclosingSymbol` (RED commit already carried section 6c + the interface extension).
- `plugins/missile-command/docs/rom-study/claims/wave.json` — 2 NEW claims `MC-WICSPL-16` / `MC-WICSPL-10` (real WICSPL `.BYTE` entries at `W3MAIN.MAC:5717`).
- `plugins/missile-command/src/core/highscore.ts` — inline `W3DSUP.MAC:3748` cite on each of the 5 SCOINI default rows.
- `plugins/missile-command/src/core/mirv.ts` — inline `W3MAIN.MAC:2713` / `W3MAIN.MAC:1531` cites on `MIRV_MAX_CHILDREN` / `MIRV_EXPLOSION_SUPPRESS`.
- `plugins/missile-command/src/core/drone.ts` — comment claim-id `-BOTTOM-30` → `-BOUND-30` (R2-C).

**Tests:** GREEN.
- `npx vitest run --project missile-command` → **1303/1303** (72 files); `npm run test:orchestrator` → **457/457**; `npm run lint` → green.
- mc10-6: 17/17 (section 4 real-tree gate `[]`, section 6/6b synthetic, section 6c round-3 pins).

**How each Reviewer round-2 finding was resolved:**
- **R2-A (CRITICAL):** the file header is no longer in `docText` — an unrelated same-file constant's header cite can no longer vouch. Mutation-verified: re-including the preceding lines (header superset) reddens the R2-A synthetic test (`expected true to be false`).
- **R2-B (HIGH):** the claim-id match is word-boundary'd, so `MC-WICSPL-6` is not satisfied by `MC-WICSPL-64`. Mutation-verified: reverting to `includes()` reddens the whole-token test.
- **R2-C (LOW):** `drone.ts` comment corrected to the real id `SOUND-DRONE-BOUND-30`.
- **enclosing-symbol arm (new):** a value-matched claim whose `symbol` normalized-EQUALS the literal's enclosing declaration symbol covers. Mutation-verified: disabling the arm reddens both the synthetic test AND the real-tree gate — the arm has real-tree teeth via `MIRV_LO`/`MIRV_HI` (their TS names normalize to the ROM symbols `MIRVLO`/`MIRVHI`), not only wave.

**Real-tree remediation (the tightened rule surfaced exactly 9, matching the measured target):** highscore.ts:43-47 (7500/7495/7330/7005/6950) → own-line SCOINI cites; mirv.ts:31/32 (3/12) → own-line cites; wave.ts:61 16/10 → the 2 new WICSPL claims (covered via the enclosing-symbol arm, and also via the local `W3MAIN.MAC:5717` cite that already sits in the WICSPL/WICSPH period doc-block).

**AC status:** AC1 ✅ (coverage is line-anchored: LOCAL id/cite, own-line self-doc, or enclosing-symbol — never bare value/header/symbol coincidence) · AC2 ✅ (uncovered literals fail with file:line=value) · AC3 ✅ (all committed claims + the 2 new WICSPL claims valid; real-tree gate `[]`) · AC4 ⚠ read narrowly — see deviation (adding real own-line cites + fixing a wrong claim-id, not fabricating).

### Dev (implementation)
- **Observation** (non-blocking, for Reviewer): `wave.ts:61` value `4` (WICSPL[11]=0x04) has no `MC-WICSPL-4` claim, yet is covered via the LOCAL-context arm by `MC-WICSPH-4` (value 4, the sibling WICSPH table) whose cite `W3MAIN.MAC:5719` sits in the shared WICSPL/WICSPH period doc-block immediately preceding line 61. This is WITHIN the user's ruled rule (LOCAL = own line + preceding block; the block is the literal's own topical documentation, materially unlike the R2-A file header), so the gate is correctly `[]`. But it is a narrower, within-block cross-symbol value coincidence: a WICSPL entry backed by a WICSPH claim of the same number. If the Reviewer/user wants it closed, the local-cite arm could additionally require the cited claim's `symbol` to match the enclosing symbol (or be own-line) — a potential round-4 tightening that must be re-measured first (it may surface other legitimately preceding-block-cited literals). Flagged, not silently shipped. *Found by Dev during round-3 implementation.*

## Design Deviations

### Dev (implementation) — Round 3
- **Own-line cites added to 7 src/core rows + drone.ts comment-id fix (narrow AC4 reading, continued)**
  - Spec source: AC4 ("must NOT change the comment structure … only the guard logic"); user ruling 2026-08-11 "FULL RIGOR — close the class"; Reviewer round-2 R2-A/R2-B/R2-C
  - Spec text: don't FABRICATE a citation to make a literal pass; a real detached/absent cite may be attached, logged as a deviation
  - Implementation: after the header was removed from coverage scope, 9 real literals surfaced. `highscore.ts:43-47` gained an inline `W3DSUP.MAC:3748` (the SCOINI ladder line the 5 default-score claims already cite) and `mirv.ts:31/32` an inline `W3MAIN.MAC:2713`/`:1531` (the lines `MC-MIRV-MAX`/`MC-MIRV-EXPSUP` already cite). `wave.ts` was NOT edited — its 16/10 are covered by 2 NEW committed claims (`MC-WICSPL-16`/`-10`, real `.BYTE` entries) via the enclosing-symbol arm. `drone.ts:21` had a genuinely WRONG claim-id in prose (`-BOTTOM-30`; the real id is `-BOUND-30`) corrected per Reviewer R2-C.
  - Rationale: identical to the round-2 reading Reviewer ACCEPTED — AC4 exists to stop *fabricating* cites to cheese the guard; attaching a claim's OWN existing cite to its literal makes a true citation machine-checkable (the opposite of cheesing). Every added cite names the exact ROM line its committed claim already cites; nothing was invented. The 2 WICSPL claims are real ROM values read from the committed `WICSPL .BYTE` verbatim (`…,10,0A,…`).
  - Severity: minor
  - Forward impact: `highscore.ts` and `mirv.ts` each carry the SCOINI/MIRV source line inline; `wave.json` documents the full non-trivial WICSPL entry set bar 4 (see the value-4 observation above); a future un-cited core literal reddens the AC3 gate unless it is genuinely cited, enclosing-symbol-backed, or STRUCTURAL.

**Handoff:** To Reviewer (Heimdall) for round-3 review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 | N/A — MC 1303/1303, orchestrator 457/457, tsc green, gate `[]`, no TODO/console.log |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — covered by Reviewer (precedingBlock/DECL_RE edge paths reproduced by hand) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — covered by Reviewer (no new swallowed errors) |
| 4 | reviewer-test-analyzer | Yes | findings | 5 | confirmed — R3-A HIGH (precedingBlock header leak, reproduced), R3-D/F/G test-coverage gaps; the enclosing-equality & id-token drivers verified to have teeth |
| 5 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — covered by Reviewer (CoreLiteral/CoreLiteralsModule types + 4th param sound) |
| 6 | reviewer-security | No | Skipped | disabled | Disabled via settings — N/A: pure test-support code, no I/O |
| 7 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — covered by Reviewer (no new dead code; headerBlock removed) |
| 8 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed — R3-C HIGH (literalCovered doc stale "file header"), R3-E MED (referencesClaim doc scope); ALL inline cites + 2 new WICSPL claims verified against committed JSON |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed — VIOLATION 1 = R3-A (#25/#17/#18), VIOLATION 2 = R3-B (NEW: DECL_RE stale-symbol, #25/#17/#18); R2-B & R2-C verified genuinely closed |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 3 blocking (R3-A HIGH, R3-B HIGH, R3-C HIGH), 4 non-blocking (R3-D MED, R3-E MED, R3-F MED-LOW, R3-G LOW), 0 dismissed. R2-A partially closed, R2-B/R2-C fully closed.

## Round-3 Reviewer Assessment (REJECTED — superseded by round 6)

**Verdict:** REJECTED

Round 3 made real progress — R2-B (id bare-substring, now word-boundary'd) and R2-C (drone.ts claim-id) are genuinely and completely closed (rule-checker traced the regex + verified the id against committed JSON; I mutation-verified all three new arms have teeth; the enclosing-symbol arm audited CLEAN on the real tree — all 6 enclosing-only covers are legitimate, TS-name===ROM-symbol). Preflight is green (MC 1303, orchestrator 457, tsc), the real-tree gate is `[]`, and every inline cite + the 2 new WICSPL claims resolve against committed claims. **But the headline "close the class" claim is not true: the header-vouch was closed for ONE shape (header separated by a code line — the exact shape round 3's own test constructs) and left OPEN for another (header separated by a single blank line, literal with no attached comment). Worse, the new enclosing-symbol arm introduced a SECOND leak of the same class (stale enclosing symbol). Two independent subagents plus my own reproduction confirm both. Neither fires on the committed tree today, but both are exactly the "silently misfires on the next edit" defect this citation gate exists to prevent — and the docstrings assert unconditional closure that is false.**

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [RULE/TEST][HIGH] R3-A | `precedingBlock`'s stop condition `t === '' && block.length > 1` only breaks on a blank line AFTER it has collected ≥1 comment line. When a literal's declaration has NO comment directly above it and is separated from the header (or an unrelated preceding comment block) by a single blank line, the first blank is absorbed (block.length 0→1, not >1) and the walk-back continues INTO the header — so `docText` again contains the header cite and R2-A reopens. Reproduced: `['// SOT … W3MAIN.MAC:5713 … MC-ICBWAV-16','','export const BAR = 16']` → `docText` contains the header → `literalCovered([MC-ICBWAV-16], docText, 16, 'BAR') === true` (WRONG). NOT live today (real files have a JSDoc/import after the header that incidentally blocks the walk — e.g. `mirv.ts:29`, `spawn.ts:32` are saved only by an import), but latent + unguarded. Round 3's own R2-A test masks it by inserting a `const GAP = 99` CODE line as the separator. | `core-literals.ts` `precedingBlock` (~184-199) + `extractCoreLiterals` docText assembly | Bound `precedingBlock` to the literal's TRULY immediately-preceding contiguous comment block: stop at the FIRST blank line unconditionally (a literal with no attached comment → empty preceding block). Re-measure the real-tree gate. |
| [RULE/TEST][HIGH] R3-B | NEW leak introduced by round 3's enclosing-symbol arm: `DECL_RE`-tracked `enclosingSymbol` is set on a declaration line and NEVER reset, so a literal on a non-declaration line inherits the PREVIOUS declaration's symbol. A value-matched claim whose symbol equals that stale symbol then wrongly covers. Reproduced: after `export const WICSPL = [ … ]`, a bare `doSomething(4242)` line gets `enclosingSymbol='WICSPL'`, so a claim `{symbol:'WICSPL', value:4242}` covers 4242 (WRONG). NOT live today (no core file has a module-scope non-declaration literal — grep confirmed empty), but latent + unguarded. | `core-literals.ts` `DECL_RE` tracking in `extractCoreLiterals` (~206-215) | Reset/bound `enclosingSymbol` to the declaration's actual scope — e.g. clear it at a blank line / when leaving the declaration's bracket-brace span — so a literal outside any declaration has `enclosingSymbol=''`. |
| [DOC][HIGH] R3-C | `literalCovered`'s JSDoc still says `docText` is "its own line + doc-block + **file header**" — but round 3 REMOVED the header from `docText`. A comment on the core predicate asserting it reads the header (the exact thing the fix eliminated) is the "prose is the unguarded surface" trap that got rounds 1 & 2 rejected, reintroduced in the doc describing the fixed function. | `core-literals.ts:135-138` | Correct to "own line + immediately-preceding comment block — the file header is deliberately excluded." |
| [TEST][MED] R3-D | `norm()`'s separator-stripping (`.replace(/[^a-z0-9]/g,'')`) is load-bearing for the codebase's underscore-heavy TS names (`MIRV_LO`⇐`MIRVLO`, etc.) but no test exercises it — every enclosing-symbol test compares identically-spelled symbols. A mutant dropping the strip survives the whole suite while silently breaking the arm for real MIRV/spawn constants. | `core-literals.ts:72-74` / section 6c | Add a `literalCovered` test where `enclosingSymbol='MIRV_LO'` is covered by a claim `symbol='MIRVLO'` (strip + case-fold). |
| [DOC][MED] R3-E | `referencesClaim`'s JSDoc says id/cite "are the only two positive anchors" and it "deliberately does NOT match the claim's symbol" — read in isolation this now misleads, since `literalCovered` added a symbol-equality (enclosing) arm. | `core-literals.ts:103-114` | Scope the claim to `referencesClaim` and cross-reference the separate enclosing-symbol arm. |
| [TEST][MED-LOW] R3-F | The id word-boundary is tested only on the negative-lookahead side (id as a prefix). The negative-lookbehind `(?<![a-z0-9])` (id as a suffix, e.g. haystack `xmc-wicspl-6`) is unexercised; a mutant deleting the lookbehind survives. | `core-literals.ts:118-125` / section 6c | Add a suffix-collision test. |
| [TEST][LOW] R3-G | `enclosingSymbol === ''` (a literal preceding any declaration) is only implicitly covered by 3-arg calls; not explicitly pinned. | section 6c | Add a synthetic pin. |

**Data flow traced:** literal → `extractCoreLiterals` (`docText = ownLine + precedingBlock`; `enclosingSymbol` from `DECL_RE`) → `literalCovered`. **Two leaks survive: (1) `precedingBlock` walks into the header on the blank-line/no-attached-comment shape (R3-A); (2) `enclosingSymbol` carries a stale symbol onto a non-declaration literal (R3-B).** The explicit `headerBlock` join was removed (good), but the header text is still reachable by the `precedingBlock` back-walk — retirement applied at the named call site, not at the value level (#24).

**Devil's Advocate:** The real-tree gate reads `[]` and every current file is safe — but only by accident. `mirv.ts:29` (`export const MIRV_LO = 128`, blank line above, header not far up) is one `import`-line's placement away from R3-A firing; move that import or add a new bare `export const` under the header of any core file and an unrelated header cite silently vouches for it, gate still green. Add a top-level `spawnAt(202)`-style call after a table declaration and R3-B covers the `202` with the table's symbol. The docstrings say both are impossible ("the file header is NOT searched"; "Equality only"). This is the precise recurrence the story keeps hitting: the guard advertises a closed class, the tests exercise only the easy shape, and the prose overstates the guarantee. The functional core is close — R2-B/C closed, arms have teeth, cites verified — but "FULL RIGOR — close the class" is not met while two same-class leaks survive unguarded and the doc reintroduces the third in prose.

**Rule Compliance:** rule-checker checked 26/26. R2-B (#17/#18) and R2-C fully closed. Violations: #25/#17/#18/#24 = R3-A (precedingBlock scope) + R3-B (enclosing-symbol scope); #17 = R3-C (stale doc); #15/#18 test-battery gaps = R3-A/R3-D/R3-F. type/security/simplifier clean (manual + rule-checker #1–#14,#16,#19–#23,#26 clean).

**Fix-Required (round 4).** TEA adds RED tests that pin the survivors, then Dev fixes both scopes + the docs:
1. `precedingBlock` stops at the first blank line unconditionally; RED test = `header / blank / bare `export const`` (no attached comment) is NOT covered by the header cite.
2. `enclosingSymbol` is reset when the literal falls outside the declaration's scope; RED test = a literal on a non-declaration statement after a table declaration inherits `''`, not the table's symbol.
3. Fix `literalCovered` doc (drop "file header"); scope the `referencesClaim` doc (R3-E).
4. Add the coverage pins: `norm()` strip (R3-D), word-boundary lookbehind (R3-F), `enclosingSymbol===''` (R3-G).
Keep the real-tree gate `uncitedCoreLiterals(...).toEqual([])` and re-measure after the precedingBlock/enclosing fixes (they may surface real literals — cite/exempt as before).

### Reviewer (audit)

- **ROUND 3 Dev deviation "own-line cites on 7 src/core rows + 2 new WICSPL claims + drone.ts id fix"** → ✓ **ACCEPTED**. Verified: the 5 `highscore.ts` `W3DSUP.MAC:3748` cites, the 2 `mirv.ts` `W3MAIN.MAC:2713`/`:1531` cites, and the `drone.ts` `-BOUND-30` id all match committed claims exactly (comment-analyzer + my spot-check + rule-checker); the 2 new `MC-WICSPL-16`/`-10` claims decode correctly from the committed `.BYTE` verbatim under `.RADIX 16`. Continuation of the round-2 narrow AC4 reading (attach a real detached/absent cite, don't fabricate) — sound.

### Reviewer (code review)
- **Gap** (blocking, R3-A): `precedingBlock` leaks the file header into `docText` on the `header / blank line / bare declaration (no own comment)` shape — R2-A reopens via a second path. `tests/helpers/core-literals.ts` (`precedingBlock`). *Found by Reviewer (test-analyzer + rule-checker) during round-3 review; reproduced.*
- **Gap** (blocking, R3-B): `DECL_RE`-tracked `enclosingSymbol` is never reset, so a non-declaration-line literal inherits the previous declaration's symbol (new stale-symbol leak from the enclosing-symbol arm). `tests/helpers/core-literals.ts` (`extractCoreLiterals`). *Found by Reviewer (rule-checker) during round-3 review; reproduced.*
- **Gap** (blocking, R3-C): `literalCovered` doc-comment still names the "file header" as part of `docText` — reintroduces the R2-A class in prose. `tests/helpers/core-literals.ts:137`. *Found by Reviewer (comment-analyzer) during round-3 review.*
- **Gap** (non-blocking, R3-D/E/F/G): test-coverage gaps (`norm()` strip, id word-boundary lookbehind, `enclosingSymbol===''`) + `referencesClaim` doc scoping. *Found by Reviewer during round-3 review.*

**Handoff:** Back to TEA (Tyr One-Handed) for round-4 red rework — pin R3-A (header/blank/bare-decl not covered) and R3-B (non-decl-line literal enclosingSymbol='') with synthetic tests, plus the R3-D/F/G coverage pins; keep the real-tree gate `[]`. Then Dev tightens `precedingBlock` + the `enclosingSymbol` scope and fixes the R3-C/R3-E docs.

## TEA Assessment — Round 4 (rework)

**Tests Required:** Yes
**Status:** RED (2 failing — ready for Dev)

**Test File:** `plugins/missile-command/tests/citations.test.ts` (new section 6d — 5 tests).

**RED evidence (2026-08-11):**
- `npx vitest run --project missile-command -t "mc10-6"` → **2 failed | 20 passed**. The 2 failures are the two surviving scope leaks (each on its own cause):
  1. *R3-A* `a header cite separated from a bare declaration by only a blank line does NOT cover` — RED (`expected true to be false`): `precedingBlock` walks past the single blank into the header, so the synthetic BAR=16 is covered by the header's `MC-ICBWAV-16`/`W3MAIN.MAC:5713`.
  2. *R3-B* `a literal on a non-declaration statement does not inherit the previous declaration symbol` — RED (`expected 'WICSPL' to be ''`): `enclosingSymbol` is never reset, so the `doSomething(4242)` literal after a `WICSPL` array inherits `WICSPL`.
- `npm run lint` → green.

**What round 4 pins (maps to Reviewer round-3 findings):**
- **R3-A (RED → Dev fix):** `precedingBlock` must bound to the literal's TRULY immediately-preceding contiguous comment block — stop at the first blank line unconditionally, so a bare declaration with no attached comment (separated from the header by one blank) gets an EMPTY preceding block, not the header.
- **R3-B (RED → Dev fix):** `extractCoreLiterals` must reset `enclosingSymbol` when a literal falls outside the declaration's scope, so a non-declaration-statement literal carries `''`.
- **R3-D / R3-F / R3-G (guards, green both sides — anti-regression):** the enclosing-symbol arm normalizes separators/case (`MIRV_LO`≡`MIRVLO`, so a mutant dropping the `norm` strip reddens); the id word-boundary rejects a SUFFIX collision (`xmc-wicspl-6`, so a mutant deleting the lookbehind reddens); a literal before any declaration has `enclosingSymbol=''`.
- The real-tree gate `uncitedCoreLiterals(...).toEqual([])` is UNCHANGED and still green; after Dev tightens `precedingBlock`/`enclosingSymbol` it must stay `[]` (re-measure — the tighter local scope may surface real literals that today ride on an incidental import placement).

**NOTE for Dev (GREEN round 4):** the two src/core doc fixes (R3-C `literalCovered` JSDoc "file header"; R3-E `referencesClaim` "only two anchors" scoping) are prose corrections with no test driver — make them alongside the mechanism fixes (they are Reviewer delivery findings, not RED-testable). After the `precedingBlock`/`enclosingSymbol` fixes, mutation-verify the two new arms have teeth and re-run the FULL `--project missile-command` suite + orchestrator + lint.

**Rule Coverage (round 4):** #8 test quality — all 5 new tests assert discriminating values; #1/#2/#5 — no new type escapes, `.js` specifier unchanged.

**Handoff:** To Dev (Loki Silvertongue) for GREEN round 4.

## Dev Assessment — Round 4 (rework)

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/missile-command/tests/helpers/core-literals.ts` — (1) `precedingBlock` now stops at the FIRST blank line unconditionally (a bare declaration with no attached comment gets an empty preceding block, not the header) — R3-A; (2) `extractCoreLiterals` bounds `enclosingSymbol` to the declaration's OWN line + its initializer via bracket/brace/paren depth tracking, and clears it on a top-level non-declaration statement, with `DECL_RE` now run on comment-stripped `code` — R3-B; (3) fixed the stale `literalCovered` doc ("file header" → excluded) and scoped the `referencesClaim` "only two anchors" doc to that function + cross-ref the enclosing arm — R3-C/R3-E; (4) tightened the module-doc enclosing-symbol bullet.

**Tests:** GREEN.
- `npx vitest run --project missile-command` → **1308/1308**; `npm run test:orchestrator` → **457/457**; `npm run lint` → green.
- mc10-6: 22/22 (section 4 real-tree gate `[]`, sections 6/6b/6c synthetic, section 6d round-4 pins).

**How each Reviewer round-3 finding was resolved:**
- **R3-A (HIGH):** `precedingBlock` back-scan can no longer walk past a blank line into the header. Mutation-verified: restoring the old `t === '' && block.length > 1` rule reddens the R3-A test (`expected true to be false`).
- **R3-B (HIGH):** `enclosingSymbol` is bounded to the declaration's scope (own line + initializer depth) and cleared at top-level non-declaration statements. Mutation-verified: making `enclosingSymbol` always equal `declSymbol` reddens the R3-B test (`expected 'WICSPL' to be ''`).
- **R3-C (HIGH):** `literalCovered` JSDoc no longer names the "file header" — it now states LOCAL = own line + preceding comment block, header excluded.
- **R3-D/E/F/G:** the R3-D/F/G coverage guards (section 6d) pin `norm()` separator-stripping, the id word-boundary lookbehind, and the empty-enclosing case; R3-E `referencesClaim` doc scoped.

**Real-tree impact (measured):** the tighter `precedingBlock` and `enclosingSymbol` scopes surfaced **no** new uncited literals — the AC3 real-tree gate stays `[]`. wave.ts:61 WICSPL 16/10 stay covered (their `W3MAIN.MAC:5717` cite is in the directly-attached comment block, no blank between; and via the enclosing-symbol arm). The `DECL_RE`-on-`code` change is also comment-state-aware now (a code-shaped line inside a block comment is not mistaken for a declaration — the round-3 test-analyzer #4 concern).

**AC status:** AC1 ✅ · AC2 ✅ · AC3 ✅ (gate `[]`; the 2 new WICSPL claims valid) · AC4 ⚠ narrow reading unchanged from round 3 (no new src/core comment edits this round; only test-helper + its docs).

### Dev (implementation) — Round 4
- **`precedingBlock` scope tightened + `enclosingSymbol` bounded by bracket depth (mechanism fixes for R3-A/R3-B)**
  - Spec source: Reviewer round-3 R3-A/R3-B; user ruling "FULL RIGOR — close the class"
  - Implementation: as above. The enclosing symbol is now derived by tracking bracket/brace/paren depth so it attaches only to the declaration's own line and initializer; a `const NAME = […]` table's entries inherit `NAME` (depth > 0 inside `[…]`), a scalar `const NAME = 128` inherits `NAME` (own line), and any top-level statement that is not a declaration inherits `''`.
  - Rationale: this is the tightest scope that keeps the six legitimate real-tree enclosing covers green (MIRV_LO/HI, NICBMS/MXICON/LAUHGT, WICSPH — all top-level declarations) while closing both the header-walk leak and the stale-symbol leak; measured to leave the real-tree gate `[]`.
  - Severity: minor
  - Forward impact: a literal is covered by the enclosing arm ONLY when it is syntactically part of the matching declaration; a stray magic number on a bare statement reddens the gate (which is the point).

**Handoff:** To Reviewer (Heimdall) for round-4 review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 | N/A — MC 1308/1308, orchestrator 457/457, tsc green, gate `[]`, no smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled — covered by Reviewer (leak shapes reproduced by hand) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled — covered by Reviewer |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed — R4-A HIGH (code-line-with-inline-comment header walk), R4-B HIGH (multi-line template desync, NEW), R4-C MED (function-body enclosing); R3-D/F/G guards verified genuine |
| 5 | reviewer-type-design | No | Skipped | disabled | Disabled — covered by Reviewer (`declMatch![1]` guarded; types sound) |
| 6 | reviewer-security | No | Skipped | disabled | Disabled — N/A pure test-support |
| 7 | reviewer-simplifier | No | Skipped | disabled | Disabled — covered by Reviewer |
| 8 | reviewer-comment-analyzer | Yes | findings | 1 | R4-D low — DECL_RE doc attributes "top-level" bounding to the regex not the loop; all other round-4 docs accurate |
| 9 | reviewer-rule-checker | Yes | findings | 5 | confirmed — R4-A + R4-B + R4-C + the `*/`-misclassification and per-line-startDepth shapes; #18/#25/#17 recurring |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 2 blocking HIGH (R4-A, R4-B), 1 MED (R4-C), 1 LOW doc (R4-D). R2-A/B/C and R3-C/E remain closed for their specific mechanisms; R3-A/R3-B closed only for their tested shapes.

## Round-4 Reviewer Assessment (REJECTED — superseded by round 6)

**Verdict:** REJECTED

Round 4 correctly closed the two shapes its own new tests construct (R3-A blank-line separator; R3-B adjacent-statement inheritance), the docs R3-C/R3-E are fixed, and the real-tree gate is `[]`. **But two independent subagents plus my own reproduction show the header-vouch and stale-enclosing-symbol CLASSES are still not closed — and round 4 introduced a fresh, unbounded leak via its own depth counter.** All verified on synthetic input (the section-5/6 policy); none fire on the committed tree today.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [RULE/TEST][HIGH] R4-A | `precedingBlock`'s comment test `t.startsWith('/*') || t.endsWith('*/')` misclassifies a CODE line carrying an inline block comment (`foo(1) /* noop */`, or `/* note */ foo(1)`) as a comment-only line, so the back-scan walks THROUGH it into the header — R3-A's header-vouch class via a different separator line. Reproduced (me + test-analyzer + rule-checker): `['// … MC-ICBWAV-16','foo(1) /* noop */','export const BAR = 16']` → `literalCovered([icbwav], docText, 16, 'BAR') === true`. Control (plain `foo(1)`) stays clean. Not live today. | `core-literals.ts` `precedingBlock` (~193-207) | Decide comment-only by the line's STRIPPED code being empty (the extractor already computes `code`), not by text-shape `startsWith('/*')`/`endsWith('*/')`. |
| [RULE/TEST][HIGH] R4-B | NEW — the round-4 bracket-`depth` counter has no cross-line STRING state (only `/* */` carries `inBlock`). A multi-line template literal (backtick spanning lines) is reprocessed as code on its continuation lines, so a `[` inside it inflates `depth`, which is clamped only on NEGATIVE, never recovers, and leaks the pre-string `declSymbol` onto EVERY later declaration in the file. Reproduced (rule-checker + test-analyzer): a `` ` `` opened on one line with `[oops` on the next makes a later `const TARGET = 4242` read `enclosingSymbol='TPL'` → an unrelated `{symbol:'TPL',value:4242}` covers it. Strictly worse than R3-B (unbounded forward), and introduced by this round's own fix mechanism. Not live today. | `core-literals.ts` `extractCoreLiterals` depth/string handling | Carry string state across lines (like `inBlock`) so a multi-line template is not miscounted, or count depth only from a properly-lexed code stream. |
| [RULE][MED] R4-C | `depth` counts `{}` identically to `[]`/`()`, so a `const` inside a function body (`startDepth>0`, `isDecl=false`) inherits the enclosing FUNCTION's name; a literal anywhere in the body is enclosing-covered if a claim's symbol equals the function name. test-analyzer found real coincidences (`regenerateCities`↔claim "REGENERATE CITIES", `MAINLINE`) — safe ONLY because those claims are string-`"anchor"`-valued today; one future numeric claim named after a routine trips it. | `core-literals.ts` enclosing-symbol arm | Bound the enclosing symbol to an initializer (`[]`/`()`), not a `{}` block body; or only attribute top-level declaration lines + their bracket initializers. |
| [DOC][LOW] R4-D | `DECL_RE`'s comment attributes the "top-level / own-line+initializer" bounding to the regex, when the loop's `startDepth===0` gate + depth tracking enforce it (comment-analyzer). Minor. | `core-literals.ts` `DECL_RE` doc | Reword to credit the loop. |

**Devil's Advocate + pattern:** This is the FOURTH consecutive REJECT for the same underlying defect (rounds 1–4). `extractCoreLiterals`/`precedingBlock` is a hand-rolled, line-based mini-lexer that approximates two genuinely SYNTACTIC questions — "what is this literal's enclosing declaration?" and "what comment block is attached to it, excluding the shared header?" Each round closes the shapes its own RED tests construct and leaks on sibling shapes of the identical mechanism (rule #18: "gets the easy shape right and the nested one wrong"), and round 4 additionally CREATED a new unbounded leak (R4-B) with the very counter it added. The docs keep asserting unconditional invariants ("the file header is deliberately EXCLUDED") that hold only for the tested shapes. None of these fire on the committed tree, and the real-tree gate is `[]` — but the gate cannot catch them, because a leak makes an un-cited literal read as COVERED (green), which is precisely the failure mode. The line-based heuristic likely cannot be made a PROOF against adversarial shapes by further patching.

**Rule Compliance:** rule-checker 26/26. R2-A/B/C, R3-C/E closed. Recurring: #25 (scope layout-incidental), #17 (docs overclaim), #18 (mini-lexer edge shapes) = R4-A/R4-B/R4-C.

**Handoff:** Path forward is a scope decision (raised with the user after four rounds).

**USER RULING 2026-08-11 (AskUserQuestion): AST REWRITE — "close it for real."** The round-4 verdict stands as REJECT, and the rework is scoped to re-implementing the extractor on the **TypeScript compiler API** instead of the line-based lexer:
- `extractCoreLiterals` walks the parsed AST (`ts.createSourceFile`, `sourceFile.forEachChild` / a node visitor). For each `NumericLiteral` node: its VALUE is the node text (decoded), its ENCLOSING declaration symbol is the nearest ancestor `VariableStatement`/`VariableDeclaration`/`FunctionDeclaration`/`TypeAliasDeclaration` name (via parent-chain walk — bounded EXACTLY by syntax, so R4-C nesting and R3-B carry are structurally impossible), and its LOCAL comment context is `ts.getLeadingCommentRanges(fullText, node.getFullStart())` on the literal's own statement (so the shared file header and R4-A `*/`-misclassification and R4-B string-desync are all structurally excluded — the header is never a leading comment of a later statement).
- `typescript` is already a devDependency (the repo type-checks with `tsc`), so no new dependency. The helper is test-support (`tests/helpers/`), so importing `typescript` there is fine.
- The coverage predicate (`literalCovered`: TRIVIAL/STRUCTURAL, own-line self-doc, LOCAL id/cite word-boundary, enclosing-symbol equality) is UNCHANGED — only how `docText`/`enclosingSymbol` are DERIVED changes (line-heuristic → AST). The real-tree gate stays `[]`; the 2 WICSPL claims + the round-3 own-line cites remain valid.
- All existing synthetic pins (sections 6/6b/6c/6d, including R4-A/R4-B/R4-C shapes TEA will add in round 5) must pass against the AST implementation — they become the acceptance battery proving the class is closed.

Round 5: TEA adds RED pins for the R4-A (code-line-with-inline-comment), R4-B (multi-line template literal), R4-C (function-body nesting) shapes; Dev re-implements `extractCoreLiterals` on the TS AST to pass the whole battery; re-run full MC suite + orchestrator + lint; mutation-verify; keep the gate `[]`. Estimated ~1–2 rounds.

## TEA Assessment — Round 5 (rework)

**Tests Required:** Yes
**Status:** RED (4 failing — ready for Dev)

**Test File:** `plugins/missile-command/tests/citations.test.ts` (new section 6e — 4 tests pinning the three round-4 leak shapes).

**RED evidence (2026-08-11):**
- `npx vitest run --project missile-command -t "mc10-6"` → **4 failed | 22 passed**. Each failure is a round-4 leak shape (fails on its own cause):
  1. *R4-A* `a code line carrying an inline block comment does not let the header vouch` — RED (`expected true to be false`): the line-based `precedingBlock` treats `foo(1) /* noop */` as a comment and walks into the header.
  2. *R4-B* `a multi-line template literal does not desync the enclosing symbol …` — RED (`expected 'TPL' to be 'TARGET'`): the bracket-depth counter miscounts a `[` inside the template.
  3. *R4-C-a* `a bare literal in a function body does not inherit the enclosing function symbol` — RED (`expected 'computeFoo' to be ''`).
  4. *R4-C-b* `a const declared inside a function body is attributed to that const, not the function` — RED (`expected 'wrap' to be 'inner'`).
- `npm run lint` → green.

**What round 5 pins (the AST contract):** these four shapes are STRUCTURALLY impossible under an AST-derived extractor —
- a literal's `docText` = its own statement text + `ts.getLeadingCommentRanges` leading comments (the file header is never a leading comment of a later statement; a trailing inline comment on a prior statement is that statement's trailing comment, not this one's leading comment — R4-A gone);
- brackets inside a template literal are inside a single `TemplateExpression`/`StringLiteral` node, never counted as nesting (R4-B gone);
- a literal's `enclosingSymbol` = the name of the nearest ancestor `VariableDeclaration` whose initializer contains it, else `''` — a bare function-body literal has no enclosing constant (R4-C-a `''`), a nested `const inner` literal is attributed to `inner` not the function (R4-C-b) — the function name is never inherited.

**Regression battery (must ALSO stay green against the AST impl):** sections 6 (semantic), 6b (extractor strips `//`/block/JSDoc/strings; `parseAnchors`), 6c (structured anchor / header-not-cover / enclosing arm / word-boundary), 6d (blank-line/non-decl pins), and the real-tree gate `uncitedCoreLiterals(...).toEqual([])`. These 22 pins are the acceptance proof that the AST rewrite preserves the coverage semantics while closing the class.

**NOTE for Dev (GREEN round 5):** re-implement `extractCoreLiterals` (and drop `precedingBlock`/`DECL_RE`/the depth counter) using `ts.createSourceFile` + a `NumericLiteral` visitor; `typescript` is already a devDependency and this is test-support code, so importing it in `tests/helpers/` is fine. Keep `literalCovered`/`referencesClaim`/`STRUCTURAL`/`parseAnchors` and the module contract (`docText: string`, `enclosingSymbol: string`) unchanged. Re-measure the real-tree gate (`[]`), mutation-verify the AST derivation has teeth, run full MC suite + orchestrator + lint.

**Rule Coverage (round 5):** #8 — all 4 new tests assert discriminating values; #5 — `.js` specifier unchanged; the module's public signature is unchanged so no interface churn.

**Handoff:** To Dev (Loki Silvertongue) for GREEN round 5 (the AST rewrite).

## Dev Assessment — Round 5 (rework)

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/missile-command/tests/helpers/core-literals.ts` — `extractCoreLiterals` re-implemented on the TypeScript compiler API (`ts.createSourceFile` + a `NumericLiteral` visitor); `precedingBlock`, `DECL_RE`, and the bracket-depth counter DELETED; added `isFunctionBoundary`, `enclosingSymbolOf`, `enclosingStatement`; module doc updated to describe AST derivation. `import * as ts from 'typescript'`.
- `plugins/missile-command/tests/citations.test.ts` — added a section-6e guard test pinning the function-form boundary (arrow / function-expression / method bodies → `''`).

**Tests:** GREEN.
- `npx vitest run --project missile-command` → **1313/1313**; `npm run test:orchestrator` → **457/457**; `npm run lint` (tsc; the `typescript` import + AST types typecheck) → green.
- mc10-6: 27/27 (sections 4, 6, 6b, 6c, 6d, 6e + the real-tree gate `[]`).

**How the round-4 findings are resolved — STRUCTURALLY, not by patching:**
- **R4-A / R2-A (header vouch):** a literal's `docText` = its own source line + the LEADING comments of its enclosing statement (`ts.getLeadingCommentRanges`), filtered to the block IMMEDIATELY attached (a blank line — `>=2` newlines between a comment and the statement — detaches it, so the file header is excluded even when the declaration is the file's FIRST statement). The header is never a leading comment of a later statement; a prior statement's trailing inline comment (`foo(1) /* noop */`) is that statement's trailing comment, not this one's leading comment. Both leak shapes are impossible.
- **R3-B / R4-B / R4-C (enclosing symbol):** derived from the AST parent-chain (`enclosingSymbolOf`) — the nearest ancestor `VariableDeclaration` name, stopping at any function boundary. A stray statement can't inherit a prior declaration's symbol (no line-carry); a multi-line template literal is a single node so nothing desyncs; a bare function-body literal has NO enclosing constant and a function name is never returned (a `FunctionDeclaration` is not a `VariableDeclaration`), and the boundary additionally clears arrow / function-expression / method bodies assigned to a const.
- **JSDoc/prose-number leak:** numbers in comments/strings are not `NumericLiteral` nodes — no line-by-line stripping needed.
- R2-B (word-boundary id), R2-C (drone id), R3-C/R3-E (docs), the STRUCTURAL/TRIVIAL exemptions, the own-line self-doc arm, and the enclosing-symbol equality arm are all UNCHANGED (`literalCovered`/`referencesClaim`/`STRUCTURAL`/`parseAnchors` untouched) — only the DERIVATION of `docText`/`enclosingSymbol` changed.

**Mutation proofs (teeth):**
- `enclosingSymbolOf` → return `'MUTANT'` on the var arm: 5 mc10-6 tests red (R4-B, R4-C-b, the function-form guard, the enclosing-arm synthetic tests, and the real-tree gate).
- detached-comment filter → `>=2` changed to `>=999` (never detach): the R3-A/header test reddens (the header vouches again).
- `isFunctionBoundary` → disabled: the function-form guard reddens (`expected 'step' to be ''`).

**Real-tree impact (measured):** the AST derivation surfaced NO new uncited literals — the gate stays `[]`. The 6 enclosing-covered real literals (MIRV_LO/HI, NICBMS/MXICON/LAUHGT, WICSPH) are all top-level scalar/array consts whose AST enclosing symbol equals their ROM claim symbol; wave.ts:61 WICSPL 16/10 stay covered (the WICSPL statement's attached leading block carries `W3MAIN.MAC:5717`, and the enclosing-symbol arm). The round-3 own-line highscore/mirv cites remain valid (own-line self-doc arm).

**AC status:** AC1 ✅ · AC2 ✅ · AC3 ✅ (gate `[]`) · AC4 — no src/core edits this round (the change is entirely in the test helper).

### Dev (implementation) — Round 5
- **Extractor re-implemented on the TS AST (user-ruled 2026-08-11)**
  - Spec source: Reviewer round-4 (R4-A/R4-B/R4-C, the recurring line-lexer leak class); user ruling "AST rewrite — close it for real"
  - Implementation: as above. The two syntactic questions (enclosing declaration, attached comment block) are answered from the parse tree, not a line heuristic.
  - Rationale: a line-based lexer cannot be made a proof against adversarial source shapes (four rounds demonstrated it); the AST answers both questions exactly, so the header/nesting/template/trailing-comment shapes are structurally unreachable, not merely untested-and-patched.
  - Severity: minor (test-support code; `typescript` already a devDependency)
  - Forward impact: future core source in ANY valid TS shape is handled correctly with no new edge cases to chase; the guard's docstrings now describe an invariant the syntax actually enforces.

**Handoff:** To Reviewer (Heimdall) for round-5 review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 | N/A — MC 1313/1313, orchestrator 457/457, tsc green, build green (no typescript bundled), gate `[]` |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled — covered by Reviewer (AST edge shapes reproduced) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled — covered by Reviewer |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed — R5-A HIGH (zero-blank header), R5-B MED (bigint invisible), R5-C MED (negative sign-stripped), R5-D LOW (type-alias); 6e teeth verified; R4-A/B/C confirmed closed |
| 5 | reviewer-type-design | No | Skipped | disabled | Disabled — covered by Reviewer (types sound; `!` guarded) |
| 6 | reviewer-security | No | Skipped | disabled | Disabled — N/A |
| 7 | reviewer-simplifier | No | Skipped | disabled | Disabled — covered by Reviewer (DECL_RE/precedingBlock/depth fully removed, no dead siblings) |
| 8 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed — R5-E HIGH-doc (stale bracket-depth bullet contradicts AST), MED-doc ("immediately-preceding" wording) |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed — R5-A (#17 "structurally impossible" overclaim + zero-blank leak); byte-identical real-tree literal set old-vs-AST; 25/26 clean |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 1 blocking HIGH (R5-A), 2 MED (R5-B, R5-C), 1 LOW (R5-D), 1 HIGH-doc + 1 MED-doc (R5-E). R2-B/C, R3-*, R4-A/B/C confirmed closed. Real-tree literal set byte-identical to the old extractor.

## Round-5 Reviewer Assessment (REJECTED — superseded by round 6)

**Verdict:** REJECTED

The AST rewrite is a real, substantive win — it STRUCTURALLY closes R4-A (inline-comment bridge), R4-B (template desync), R4-C (function/arrow/method-body attribution) and the one-blank-line R3-A, the extraction is otherwise sound (rule-checker: the real-tree literal set is byte-identical to the old extractor; bigint correctly excluded from `NumericLiteral`; hex/octal/binary/exponent/separator all decode), preflight/build/lint/orchestrator are green, and the gate is `[]`. Accepted in principle. **But "close the class" (the user's ruling) is not fully met: the header exclusion is a blank-line HEURISTIC, not structural — a header with ZERO blank lines above the first declaration still vouches (R2-A reopened for that spacing), and the docstrings assert this is "STRUCTURALLY impossible," which is false. Two literal FORMS (bigint, negative) are also value-collision surfaces the guard is now blind to or wrong about.** All verified by reproduction; none fire on today's tree.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [RULE/TEST][HIGH] R5-A | The detached-comment filter fires only on `>=2` newlines, so a header with NO blank line directly above the FIRST declaration attaches as its leading comment and vouches — R2-A reopened for the zero-blank shape. Reproduced: `['// SOURCE OF TRUTH … MC-HDR-999 W3X.MAC:5713','export const BARE = 999']` → `literalCovered([MC-HDR-999], docText, 999, 'BARE') === true` (one-blank control → false). Not live (all 19 core files blank-separate their header — a convention, not enforced). AND the `extractCoreLiterals` docstring + the section-6e header comment claim this is "STRUCTURALLY impossible" — an overclaim (rule #17), the recurring prose-vs-code trap. | `core-literals.ts` `extractCoreLiterals` (leading-comment attach) | Make the header exclusion STRUCTURAL: treat the SourceFile's own leading-comment run (position 0, the file preamble before the first statement) as the header and exclude it from the first statement's local context — regardless of blank lines. Then the docstring's "structurally impossible" is true. Add a RED pin for the zero-blank shape. |
| [RULE/TEST][MED] R5-B | BigInt literals (`100n`) are `BigIntLiteral`, not `NumericLiteral`, so the visitor skips them entirely — an un-cited BigInt game constant sails through the gate invisibly (a regression vs the old regex, which surfaced the digits). Dormant (no core bigint today). Reproduced: `extractCoreLiterals('export const BIG = 100n')` → `[]`. | `core-literals.ts` visitor | Also visit `ts.isBigIntLiteral` (value = the numeric part), or explicitly document + test that bigint is out of scope. |
| [RULE/TEST][MED] R5-C | A negative literal is `PrefixUnaryExpression(-, NumericLiteral)`; the visitor sees only the inner literal, so `-5000` is extracted as `5000` and coverage is decided against the WRONG value — a bare value-collision for negative constants. Pre-existing (old regex had it too), dormant (only `-1`, TRIVIAL, today). Reproduced: `extractCoreLiterals('export const NEG = -5000')` → `[{value:5000}]`. | `core-literals.ts` visitor | Detect a unary-minus parent and use the signed value; add a test. |
| [RULE][LOW] R5-D | `enclosingSymbolOf` recognizes only `VariableDeclaration`, so `type X = 256` loses its enclosing symbol (was `'X'` under the old `DECL_RE` which matched `type`). Safe direction (only a spurious uncited), dormant. | `core-literals.ts` `enclosingSymbolOf` | Add `ts.isTypeAliasDeclaration` (or document the narrowing). |
| [DOC][HIGH] R5-E | The module-doc enclosing-symbol bullet (lines ~27-33) still carries the retired round-4 line language — `const\|let\|function\|type IDENT`, "own line or initializer (bracket depth)", "top-level non-declaration statement" — which CONTRADICTS the AST code (`function` is a boundary → `''`; `type` unattributed; no bracket depth). Plus the `docText` "immediately-preceding comment block" wording (lines ~22/145/180) describes the old `precedingBlock`, not the AST's enclosing-statement leading comments. | `core-literals.ts` module doc + `CoreLiteral`/`literalCovered` docs | Rewrite the bullet to the AST rule (nearest `const`/`let` `VariableDeclaration` ancestor, any function boundary → none); reword "immediately-preceding" to "the enclosing declaration statement's attached leading comment block." |

**Devil's Advocate:** The AST genuinely killed the round-4 leak shapes — I could not reopen R4-A/B/C. But the header exclusion is still a spacing heuristic wearing a "structural" label: reinstate the exact R2-A shape with zero blank lines and the guard goes green (covered) when it must be red — the rule-#15/#25 mutation standard fails. The fix is small and makes the invariant real (the file preamble is identifiable by position, not by a blank line). Bigint and negative are the guard being blind/wrong about two literal forms — on-topic for "close the class," cheap to close. Once R5-A/B/C/D and the docs are fixed, the class is genuinely, structurally closed.

**Rule Compliance:** rule-checker 26 rules / 34 instances, 1 violation (#17 = R5-A doc overclaim). #1 (`!` guarded by `toBeDefined`), #4 (`?? []`, `?? ''`), #5 (`import * as ts`, bare specifier — repo convention, 18+ files), #12 (typescript test-only, not bundled — build confirmed), #19 (real-tree literal set byte-identical old-vs-AST), #21 (numeric decode correct) all clean. R5-E under comment-analyzer (#17/#24 doc staleness).

**Fix-Required (round 6) — finish closing the class:** (1) structural header exclusion (position-0 preamble), (2) bigint + (3) negative literal handling, (4) type-alias attribution, (5) the R5-E doc corrections. TEA pins the zero-blank-header, bigint, and negative shapes as RED; Dev implements; keep the real-tree gate `[]` and the byte-identical real-tree literal set (modulo bigint/negative which don't occur today).

**Handoff:** Back to TEA (Tyr One-Handed) for round-6 red rework.
## TEA Assessment — Round 6 (rework)

**Tests Required:** Yes
**Status:** RED (3 failing — ready for Dev)

**Test File:** `plugins/missile-command/tests/citations.test.ts` (new section 6f — 4 tests: 3 RED + 1 positive control).

**RED evidence (2026-08-11):**
- `npx vitest run --project missile-command plugins/missile-command/tests/citations.test.ts` → **3 failed | 97 passed**. The 3 failures are the three shapes the Reviewer ruled the class is still open on, each red for the intended cause:
  - *R5-A* `a file-header cite with NO blank line above the first declaration does NOT vouch` → `expected true to be false` (round-5's blank-line heuristic attaches the position-0 preamble to the first declaration, so the header's `MC-HDR-999` cite vouches).
  - *R5-B* `a BigInt game constant is surfaced (its numeric value), not skipped` → `expected undefined to be defined` (`100n` is a `BigIntLiteral`, not `NumericLiteral`; the visitor skips it — confirmed at the AST level).
  - *R5-C* `a negative literal is extracted as its SIGNED value…` → `expected undefined to be defined` (the visitor sees only the inner `NumericLiteral`, so `-5000` surfaces as `5000` — confirmed at the AST level).
- `npm run lint` (tsc --noEmit, repo-wide) → **green**.

**What round-6 pins (maps to the Reviewer's round-5 findings):**
- **R5-A (RED → Dev fix):** the header exclusion must be STRUCTURAL (position-0 preamble), not a blank-line heuristic — a zero-blank header must not vouch. **Positive control (stays GREEN):** a local leading comment on a NON-first declaration still vouches at zero blank lines — guards against an over-broad "drop all zero-blank leading comments" fix; the fix must exclude only the SourceFile's own preamble, not every zero-blank attachment.
- **R5-B (RED → Dev fix):** a BigInt constant (`100n`) must be surfaced with its numeric value so the gate can see it; an un-cited bigint must be FLAGGED (`literalCovered(...) === false`), not sail through invisibly.
- **R5-C (RED → Dev fix):** a negative literal (`-5000`) must be extracted as its SIGNED value; coverage is then decided against `-5000` (a `-5000` claim covers, a `5000` claim does not — today exactly inverted).

**Scope note (R5-D / R5-E left to Dev):** R5-D (type-alias attribution) is LOW/dormant/safe-direction and the Reviewer offered Dev a choice (`ts.isTypeAliasDeclaration` OR document the narrowing) — not hard-pinned here, so Dev keeps that latitude. R5-E is doc-only (module-doc/`CoreLiteral`/`literalCovered` staleness) — a Dev edit, no test surface. Both remain on the round-6 fix list for Dev.

**Real-tree gate unaffected (measured):** the only negative in `src/core` is `game.ts:547 mirvAt = -1` (TRIVIAL, skipped either way), and there is no core bigint — so the AST/signed/bigint changes do not move `uncitedCoreLiterals(...)`; it must stay `[]`.

**Rule Coverage (round-6 additions):** #8 test quality — all 4 new tests assert discriminating values (true/false pairs, defined/undefined pairs, signed-vs-unsigned coverage inversion); the positive control prevents an over-broad fix from passing vacuously. #1 (`!` guarded by `toBeDefined` before use), #4 (no unguarded `.get`), #5 (`.js` specifier unchanged) clean.
**Self-check:** 0 vacuous tests; the positive control is a required non-regression guard, not a filler.

**Handoff:** To Dev (Loki Silvertongue) for GREEN round 6.
## Dev Assessment — Round 6 (rework)

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/missile-command/tests/helpers/core-literals.ts` — the five round-6 fixes; no test file or `src/core` edits (the RED section 6f came from TEA; the real-tree gate needed no new cites).

**Tests:** GREEN.
- `npx vitest run --project missile-command` → **1317/1317** (72 files).
- `npm run test:orchestrator` → **457/457**.
- `npm run lint` (tsc --noEmit, repo-wide) → **green**.
- mc10-6 section: 100/100 in citations.test.ts (section 6f's 3 RED shapes + positive control now green; real-tree gate `[]`).

**How each Reviewer round-5 finding was resolved:**
- **R5-A (HIGH) — structural header exclusion.** `extractCoreLiterals` now precomputes `preamblePositions`: the top-anchored leading-comment run of `sf.statements[0]` (from file position 0, terminating at the first blank-line gap). The back-scan `break`s on any range in that set, so the file preamble is excluded BY POSITION regardless of blank lines. The zero-blank-header shape no longer vouches; a local comment on a LATER declaration still attaches (the positive control stays green). The docstring's "structurally impossible" is now true.
- **R5-B (MED) — bigint surfaced.** The visitor accepts `ts.isBigIntLiteral` alongside `ts.isNumericLiteral`, decoding the numeric part (`n` stripped). An un-cited bigint is now flagged.
- **R5-C (MED) — signed negative.** A `PrefixUnaryExpression(-, …)` parent negates the magnitude, so `-5000` extracts as `-5000` and coverage is decided against the signed value.
- **R5-D (LOW) — type-alias attribution.** `enclosingSymbolOf` now returns the name of a `ts.isTypeAliasDeclaration` ancestor (`type X = 256` → `X`), matching the old `DECL_RE`'s `type` reach.
- **R5-E (HIGH-doc + MED-doc) — doc corrections.** The module-doc enclosing-symbol bullet, the `docText` "immediately-preceding comment block" wording (module doc + `CoreLiteral` + `literalCovered`), and the `extractCoreLiterals` docstring were rewritten to the AST rule: nearest `const`/`let`/`type` ancestor, any function boundary → none, no bracket depth, no "top-level non-declaration statement" language; the header exclusion described as position-based; bigint/sign handling noted.

**Real-tree fidelity (the byte-identical set holds):** the only `src/core` negative is `game.ts:547 mirvAt = -1` (TRIVIAL, skipped before and after the sign change), and there is no core bigint — so the signed/bigint changes move no real-tree value. The gate is `[]`; the extracted value set is unchanged.

**Mutation proof (teeth):** the round-6 RED commit (`cd34cc34`) IS the mutant for all three fixes — each of the 3 shapes was red against the pre-fix extractor (zero-blank header vouched; `100n`→`[]`; `-5000`→`5000`) and is green now. The preamble `break` is load-bearing: removing it reopens R5-A.

**AC status:** unchanged from round 5 — AC1–AC4 ✅. This round hardens the DERIVATION (structural preamble, bigint, sign, type-alias) and corrects the docs; the coverage predicate and the guard logic are untouched, and no `src/core` comment was edited (AC4 preserved).

**Self-review:** wired (the preamble set feeds the back-scan; bigint/sign feed the value) · no debug code · follows the file's AST idiom · branch `feat/mc10-6-harden-mc-citations-ac3-line-anchored` pushed (`a14dbbf2`).

**Handoff:** To Reviewer (Heimdall) for round-6 review.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 | N/A — MC 1317/1317, orchestrator 457/457, tsc green, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | confirmed — all 4 new tests have teeth (5 mutants caught, tree restored); MED own-line same-line-header leak (routed, non-blocking); LOW unpinned sibling shapes |
| 5 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-security | No | Skipped | disabled | Disabled via settings — N/A (parses trusted first-party source) |
| 7 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed — LOW: function-boundary doc enumeration omits `constructor` (routed, non-blocking) |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed — R5-A/B/C all fixed correctly; two LOW #21 dormant edges (doubly-nested unary minus; bigint > MAX_SAFE_INTEGER precision), routed non-blocking |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 0 blocking. 5 confirmed non-blocking (1 MED + 4 LOW), all dormant against the real `src/core` tree (grep-confirmed: no bigint, only `-1` TRIVIAL, no same-line header). Real-tree literal set byte-identical to round 5 (independently re-measured: 210 literals, 0 diffs).

## Reviewer Assessment

**Verdict:** APPROVED

Round 6 fixes all three defects round 5 blocked on, verified by the independent subagents' mutations (not just the author's table): **R5-A** the header exclusion is now genuinely structural — a position-`Set` (`preamblePositions`) computed once from the file's own top-of-file comment run, so a zero-blank header no longer vouches, and the positive control proves a real local comment still does; **R5-B** BigInt literals (`100n`) are now surfaced with correct hex/octal/binary/underscore decode; **R5-C** negative literals are signed via the immediate unary-minus parent, without misfiring on a binary `a - 5000`. Preflight green (MC 1317/1317, orchestrator 457/457, `tsc` clean), the AC3 real-tree gate is `[]`, and the extracted real-tree literal set is byte-identical to round 5 (210 literals, 0 diffs — re-measured independently). `[RULE]`/`[TEST]`/`[DOC]` findings below are all confirmed but **non-blocking and dormant** (no such shape exists in `src/core`); `[EDGE]`/`[SILENT]`/`[TYPE]`/`[SEC]`/`[SIMPLE]` subagents were disabled via settings and are covered manually where relevant. Per the multi-round disposition precedent (rb4-6 r3), rejecting a seventh round over adjacent latent edges the spec never named is goalpost-moving — the right cost is a routed finding, and the user has ruled to ship.

| Severity | Tag | Issue | Location | Disposition |
|----------|-----|-------|----------|-------------|
| MED | [TEST]/[RULE] | Own-line path leak: `docText` is seeded with the literal's raw source line, which is NOT filtered against the file preamble. A header comment sharing the SAME physical line as the first declaration (a `/* */` block, or a multi-line block whose `*/` lands on the decl line) puts the header's cite on the own line, so it vouches — the same R2-A/R5-A class via a path round 6 didn't touch. The "excluded BY POSITION / cannot vouch" docs overclaim this. Reproduced. | `core-literals.ts` own-line seed (~ownLine at visitor) | **Non-blocking, routed.** Dormant: every real `src/core` header uses own-line `//` comments blank-separated from the first decl; the AC3 gate is unaffected. Recorded as a Delivery Finding. |
| LOW | [RULE] | Doubly-nested unary minus (`- -5000`, valid TS) reads the immediate parent only → mis-signed as `-5000`. | `core-literals.ts` sign check | **Non-blocking, routed.** Dormant (no `- -` in core). |
| LOW | [RULE] | A BigInt literal above `Number.MAX_SAFE_INTEGER` loses precision in `Number(...)`; `Number.isFinite` doesn't catch it. | `core-literals.ts` bigint decode | **Non-blocking, routed.** Dormant (no bigint in core; MC constants are byte/word scale). |
| LOW | [TEST] | Negative-bigint / unary-plus / negative-hex / `/* */`-preamble shapes are correct but unpinned by an explicit test. | `citations.test.ts` section 6f | **Non-blocking, routed.** All currently correct. |
| LOW | [DOC] | The round-6 module-doc function-boundary enumeration ("function/method/arrow/accessor") omits `constructor`, which `isFunctionBoundary` also includes. | `core-literals.ts` module doc | **Non-blocking, routed.** Prose completeness. |

### Devil's Advocate

Assume this guard is worthless. The strongest attack is the own-line leak the test-analyzer found: write the file header on the same physical line as the first declaration and its ROM cite vouches for an unrelated bare magic number — the exact loophole class the story exists to close, still open through the own-line door, while the new docs proclaim the header "cannot vouch." That is the recurring prose-vs-code trap: a future reader trusts a "structural, by position" guarantee that holds only for the attached-comment path, not the own-line path. A confused (or auto-formatting) developer who ever collapses a header onto the first declaration's line reopens it silently, and the real-tree gate would read green. The doubly-nested-minus and bigint-precision edges are narrower still, but they are the guard being quietly wrong about a value rather than blind to it. However — every one of these is dormant by measurement, not assertion: grep confirms `src/core` has no bigint, no same-line header, and only `-1` (TRIVIAL) as a negative; the extracted real-tree set is byte-identical to the accepted round 5. The three defects round 5 actually blocked on are fixed and independently mutation-proven. After six rounds on a magic-number citation guard, the marginal safety of chasing a contrived same-line-header shape no real file exhibits is not worth another cycle. The honest disposition is APPROVE with the own-line gap and the doc overclaim recorded as routed, non-blocking findings — not a seventh rejection over an edge the spec never named.

### Rule Compliance

rule-checker: 26 rules / 41 instances, **0 blocking violations**. #1 (non-null assertions all guarded by `toBeDefined`), #4 (`?? []`/`?? ''`, `node.parent` provably defined for any visited literal), #5 (`.js` specifiers, `import type`), #8/#15/#18/#25/#26 (the 4 new tests read the extractor's own `docText` for one specific literal, not whole-file regex; positive/negative pairs, no fails-by-passing), #17 (the "structurally impossible" claim is now TRUE for the attached-comment path — verified by construction and probe) all clean. Two #21 dormant-degenerate-input edges (doubly-nested minus, bigint precision) confirmed LOW and routed. comment-analyzer #24: no retired blank-line-heuristic wording survives as if current.

### Reviewer (code review) — Round 6

Routed non-blocking findings (APPROVED with these as Delivery Findings; all dormant against the real `src/core` tree, so AC3 is unaffected — recorded, not fixed, per the "ship it" ruling after six rounds):

- **Gap (non-blocking, MED):** the own-line coverage path is not filtered against the file preamble, so a header comment written on the SAME physical source line as the first declaration still vouches (same R2-A/R5-A class); the round-6 "excluded BY POSITION / cannot vouch" docs overclaim it. Owner: whoever next touches `plugins/missile-command/tests/helpers/core-literals.ts` — filter the own-line seed against `preamblePositions` (or scope the own-line self-documenting arm to the code portion) and soften the doc to name the attached-comment path only. *Found by reviewer-test-analyzer; reproduced.*
- **Gap (non-blocking, LOW):** doubly-nested unary minus (`- -5000`) mis-signs; a BigInt above `Number.MAX_SAFE_INTEGER` loses precision (`Number.isFinite` won't catch it). Both dormant (no such shape in core). *Found by reviewer-rule-checker.*
- **Gap (non-blocking, LOW):** the module-doc function-boundary enumeration omits `constructor`. *Found by reviewer-comment-analyzer.*
**Branch:** feat/mc10-6-harden-mc-citations-ac3-line-anchored
**PR:** https://github.com/slabgorb/arcade/pull/230
